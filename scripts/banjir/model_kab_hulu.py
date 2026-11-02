"""Hujan hulu DAS + CHIRPS pada model peluang banjir kabupaten-hari -> data/raw/banjir/model_kab_hulu/

Protokol DIBEKUKAN di PRAREG-HULU.md (data §2 sudah tetap); berkas ini hanya melaksanakannya. Mengimpor bukti_das.py (pembaca
HydroBASINS) dan citra.py (pembaca header TIFF + HTTP Range) TANPA mengubahnya.

Pakai:  python3 scripts/banjir/model_kab_hulu.py basin    basin lokal + hulu + sel hulu per kabupaten sampel -> basin.json, sampel.json
        python3 scripts/banjir/model_kab_hulu.py ambil [awal akhir]   CHIRPS v2.0 harian final p25, lanjut dari cache
        python3 scripts/banjir/model_kab_hulu.py uji      swauji tanpa jaringan
        python3 scripts/banjir/model_kab_hulu.py latih [--ulang]   M0/M2/M3 dilatih 2016-2023, divalidasi 2024-2025 (JANGAN dijalankan sebelum ditinjau dan CHIRPS lengkap)
        python3 scripts/banjir/model_kab_hulu.py sia | buka        Uji A / Uji A+B, SEKALI, dijalankan pemilik sesudah tanggalnya

Catatan pelaksanaan §2 yang menafsirkan teks:
- Luas basin untuk ambang 10% = luas geometrik poligon (jumlah irisan dengan semua sel yang disentuh bbox-nya, rasio <= 1);
  `SUB_AREA` HydroBASINS dipakai hanya untuk batas 20.000 km2 kumulatif.
- Penelusuran hanya mengikuti NEXT_DOWN; ENDO > 0 tidak mengeluarkan basin (keputusan orkestrator 1 Nov 2026).
- Sel CHIRPS p25: kolom = floor((bujur + 180) / 0,25), baris = floor((50 - lintang) / 0,25); pusat sel = x,125 / x,375 = sel sampel.
"""
import bisect, collections, contextlib, csv, datetime as dt, gzip, hashlib, json, math, os, random, re, statistics, struct, subprocess, sys, time, urllib.error, urllib.request
from array import array
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
import bukti_das as B  # noqa: E402  (lintas_zip, bbox_ring, lzw, lzw_enkode)
import citra as C      # noqa: E402  (ifds, UA)
import uji_balik as ub  # noqa: E402
import model_kab as MK  # noqa: E402  (fitur M0, GBDT, regresi logistik, alarm, kontingensi; tidak diubah)
import label_bersatu as LB  # noqa: E402
from status import GESER  # noqa: E402

G = MK.G

KELUAR = os.path.join(AKAR, "data/raw/banjir/model_kab_hulu")
KANDIDAT = os.path.join(AKAR, "data/raw/banjir/model_kab/kandidat.json")
SAMPEL_DEBIT = os.path.join(AKAR, "data/raw/banjir/model_kab_debit/sampel.json")   # kab -> sel (sk) yang sama dengan model_kab
SAMPEL, BASIN = (os.path.join(KELUAR, n) for n in ("sampel.json", "basin.json"))
CHIRPS_DIR = os.path.join(KELUAR, "chirps")
SEL = 0.25
AMBANG_IRISAN = 0.10
PLAFON_HULU_KM2 = 20_000
KOTAK_CINCIN = (90, -15, 155, 10)       # cincin basin disimpan hanya bila pusat bbox di sini (hulu Kalimantan/Papua melewati batas Indonesia)
KM_LAT, KM_LON = 110.574, 111.320
CHIRPS = "https://data.chc.ucsb.edu/products/CHIRPS/v2.0/global_daily/cogs/p25/{y}/chirps-v2.0.{y}.{m:02d}.{d:02d}.cog"
CHIRPS_LIST = "https://data.chc.ucsb.edu/products/CHIRPS/v2.0/global_daily/cogs/p25/{y}/"
AWAL = dt.date(2015, 12, 1)
NODATA = -9000.0
JEDA, PEKERJA = 0.4, 2   # detik per permintaan per pekerja; server CHC membalas 429 pada 4 pekerja tanpa jeda


def sha(b):
    return hashlib.sha256(b).hexdigest()


def sha_berkas(p):
    return sha(open(p, "rb").read())


def kunci(lat, lon):
    return f"{lat:.3f}_{lon:.3f}"


def indeks(lat, lon):
    return math.floor(lat / SEL + 1e-9), math.floor(lon / SEL + 1e-9)


def pusat(iy, ix):
    return (iy + .5) * SEL, (ix + .5) * SEL


def km2_sel(iy):
    return SEL * KM_LON * math.cos(math.radians(pusat(iy, 0)[0])) * SEL * KM_LAT


# ---------------------------------------------------------------- geometri murni
def klip_kotak(ring, x0, y0, x1, y1):
    """Sutherland-Hodgman cincin terhadap kotak [x0,x1] x [y0,y1]; orientasi terjaga."""
    for sisi in range(4):
        if not ring:
            break
        dalam = [lambda p: p[0] >= x0, lambda p: p[0] <= x1, lambda p: p[1] >= y0, lambda p: p[1] <= y1][sisi]
        def potong(a, b):
            if sisi < 2:
                x = x0 if sisi == 0 else x1
                t = (x - a[0]) / (b[0] - a[0])
            else:
                y = y0 if sisi == 2 else y1
                t = (y - a[1]) / (b[1] - a[1])
            return (a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]))
        keluar = []
        for i, b in enumerate(ring):
            a = ring[i - 1]
            if dalam(b):
                if not dalam(a):
                    keluar.append(potong(a, b))
                keluar.append(b)
            elif dalam(a):
                keluar.append(potong(a, b))
        ring = keluar
    return ring


def luas_deg2(ring):
    """luas bertanda (shoelace); cincin luar searah jarum jam di shapefile -> negatif, lubang positif"""
    return sum(ring[i - 1][0] * p[1] - p[0] * ring[i - 1][1] for i, p in enumerate(ring)) / 2


def irisan_sel(rings):
    """{(iy, ix): km2} irisan poligon (cincin + lubang) dengan tiap sel 0,25 derajat yang disentuh bbox-nya"""
    x0, y0, x1, y1 = B.bbox_ring(rings)
    out = {}
    for iy in range(math.floor(y0 / SEL), math.floor(y1 / SEL) + 1):
        for ix in range(math.floor(x0 / SEL), math.floor(x1 / SEL) + 1):
            s = sum(luas_deg2(klip_kotak(r, ix * SEL, iy * SEL, (ix + 1) * SEL, (iy + 1) * SEL)) for r in rings)
            a = abs(s) * KM_LAT * KM_LON * math.cos(math.radians(pusat(iy, ix)[0]))
            if a > 1e-6:
                out[(iy, ix)] = a
    return out


def pilih_hulu(attr, lokal, plafon=PLAFON_HULU_KM2):
    """attr {id: (next_down, sub_km2, endo)}; lokal: set id. -> [(id, jarak)]: tingkat jarak NEXT_DOWN, satu tingkat masuk SEMUA bila
    SUB_AREA kumulatif <= plafon, selain itu berhenti. Basin NEXT_DOWN = 0 tidak punya hilir jadi tak pernah hulu; ENDO tidak berpengaruh."""
    anak = collections.defaultdict(list)
    for i, (nd, _, endo) in attr.items():
        if nd:   # hanya NEXT_DOWN yang diikuti; ENDO > 0 ikut bila NEXT_DOWN-nya menuju basin lokal
            anak[nd].append(i)
    lokal = set(lokal)
    tingkat, lihat, hasil, kum, jarak = set(lokal), list(lokal), [], 0.0, 0
    while True:
        jarak += 1
        baru = sorted({c for i in lihat for c in anak[i] if c not in tingkat})
        if not baru:
            return hasil
        kum += sum(attr[i][1] for i in baru)
        if kum > plafon:
            return hasil
        hasil += [(i, jarak) for i in baru]
        tingkat |= set(baru)
        lihat = baru


# ---------------------------------------------------------------- basin
def muat_sampel():
    k, d = json.load(open(KANDIDAT)), json.load(open(SAMPEL_DEBIT))
    assert d["kab"] == k["kab"] and {tuple(x[:2]) for v in d["sk"].values() for x in v} == {tuple(s) for s in k["sel"]}, \
        "sampel debit tidak cocok dengan kandidat.json"
    return {"dibuat": dt.date.today().isoformat(), "sumber": "data/raw/banjir/model_kab/kandidat.json (kab, sel); kab->sel dari model_kab_debit/sampel.json",
            "sha256_kandidat": sha_berkas(KANDIDAT), "kab": k["kab"], "sel": k["sel"], "sk": d["sk"]}   # [lat, lon, bahaya banjir, bahaya longsor] seperti model_kab_debit/sampel.json


def basin():
    os.makedirs(KELUAR, exist_ok=True)
    sam = muat_sampel()
    json.dump(sam, open(SAMPEL, "w"), separators=(",", ":"))
    attr, cincin, t0 = {}, {}, time.time()
    for p, rings in B.lintas_zip():
        i = int(p["hybas_id"])
        attr[i] = (int(p["next_down"]), float(p["sub_area"]), int(p["endo"]))
        if rings:
            bb = B.bbox_ring(rings)
            cx, cy = (bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2
            if KOTAK_CINCIN[0] <= cx <= KOTAK_CINCIN[2] and KOTAK_CINCIN[1] <= cy <= KOTAK_CINCIN[3]:
                cincin[i] = rings
    print(f"HydroBASINS {len(attr)} basin, cincin disimpan {len(cincin)} ({time.time() - t0:.0f} dtk)", file=sys.stderr)
    # indeks sel -> basin yang bbox-nya menyentuh
    ind = collections.defaultdict(list)
    for i, rings in cincin.items():
        x0, y0, x1, y1 = B.bbox_ring(rings)
        for iy in range(math.floor(y0 / SEL), math.floor(y1 / SEL) + 1):
            for ix in range(math.floor(x0 / SEL), math.floor(x1 / SEL) + 1):
                ind[(iy, ix)].append(i)
    cache = {}

    def irisan(i):
        if i not in cache:
            cache[i] = irisan_sel(cincin[i])
        return cache[i]

    hasil = {}
    for kab in sam["kab"]:
        lokal, detail = set(), {}
        for lat, lon, *_ in sam["sk"][kab]:
            c = indeks(lat, lon)
            for i in ind[c]:
                ir = irisan(i).get(c, 0)
                tot = sum(irisan(i).values())
                if ir >= AMBANG_IRISAN * tot or ir >= AMBANG_IRISAN * km2_sel(c[0]):
                    lokal.add(i)
                    detail[i] = {"id": i, "luas_km2": round(tot, 1), "sub_area": attr[i][1], "endo": attr[i][2]}
        hulu = pilih_hulu(attr, lokal)
        assert all(i in cincin for i, _ in hulu), f"{kab}: basin hulu di luar KOTAK_CINCIN"
        sel_h = collections.Counter()
        for i, _ in hulu:
            for c, a in irisan(i).items():
                sel_h[c] += a
        hasil[kab] = {
            "lokal": [detail[i] for i in sorted(detail)],
            "hulu": [{"id": i, "jarak": j, "luas_km2": attr[i][1]} for i, j in hulu],
            "km2_hulu": round(sum(attr[i][1] for i, _ in hulu), 1),
            "sel_hulu": [[kunci(*pusat(*c)), round(a, 2)] for c, a in sorted(sel_h.items())],
            "hulu_ada": 1 if hulu else 0,
        }
        print(f"{kab}: lokal {len(detail)} hulu {len(hulu)} ({hasil[kab]['km2_hulu']:.0f} km2, {len(sel_h)} sel)", file=sys.stderr)
    tulis = {"dibuat": dt.date.today().isoformat(), "aturan": "PRAREG-HULU.md §2",
             "sha256_zip": {os.path.basename(z): sha_berkas(z) for z in B.ZIP}, "plafon_km2": PLAFON_HULU_KM2, "ambang_irisan": AMBANG_IRISAN,
             "kab": hasil}
    json.dump(tulis, open(BASIN, "w"), separators=(",", ":"))
    ringkas(tulis)


def ringkas(t):
    k = t["kab"]
    ada = [a for a, v in k.items() if v["hulu_ada"]]
    km = sorted(v["km2_hulu"] for v in k.values() if v["hulu_ada"])
    print(f"kab dengan hulu {len(ada)} dari {len(k)}" + (" (DAYA HULU RENDAH, < 20)" if len(ada) < 20 else ""))
    if km:
        q = lambda f: km[min(len(km) - 1, int(f * len(km)))]
        print(f"luas hulu km2: min {km[0]:.0f}, p25 {q(.25):.0f}, median {q(.5):.0f}, p75 {q(.75):.0f}, maks {km[-1]:.0f}")
    print("tanpa hulu:", ", ".join(a for a, v in k.items() if not v["hulu_ada"]) or "-")
    print("kab dengan basin lokal ENDO>0:", ", ".join(a for a, v in k.items() if any(b["endo"] for b in v["lokal"])) or "-")
    print("sel hulu unik:", len({s for v in k.values() for s, _ in v["sel_hulu"]}))


# ---------------------------------------------------------------- CHIRPS
def sel_dibutuhkan():
    sam, b = json.load(open(SAMPEL)), json.load(open(BASIN))
    s = {kunci(*x) for x in sam["sel"]}
    for v in b["kab"].values():
        s |= {k for k, _ in v["sel_hulu"]}
    return sorted(s)


def baris_kolom(k):
    lat, lon = map(float, k.split("_"))
    return math.floor((50 - lat) / SEL), math.floor((lon + 180) / SEL)


def baca_float(ifd, bo, raw):
    assert ifd[259] == 5 and ifd.get(317, 1) == 1 and ifd[258] == 32 and ifd.get(339) == 3, f"format COG tak terduga: {ifd}"
    a = array("f")
    a.frombytes(B.lzw(raw))
    if (bo == ">") != (sys.byteorder == "big"):
        a.byteswap()
    return a


def rentang(url, a, b, info, coba=8):
    """GET Range; jeda sopan tiap permintaan, 429/5xx dicoba ulang dengan mundur (Retry-After dihormati)."""
    for i in range(coba):
        time.sleep(JEDA)
        try:
            h = dict(C.UA, Range=f"bytes={a}-{b - 1}")
            with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=90) as r:
                m = re.search(r"/(\d+)$", r.headers.get("Content-Range", ""))
                if m:
                    info["ukuran"] = int(m.group(1))
                return r.read()
        except urllib.error.HTTPError as e:
            if i == coba - 1 or e.code not in (429, 500, 502, 503, 504):
                raise
            time.sleep(float(e.headers.get("Retry-After") or 0) or min(120, 5 * 2 ** i))
        except Exception:
            if i == coba - 1:
                raise
            time.sleep(3 * (i + 1))


def baca_hari(hari, sel):
    """-> ({sel: mm | None}, info). Hanya ubin yang memuat sel yang dibutuhkan."""
    url = CHIRPS.format(y=hari.year, m=hari.month, d=hari.day)
    info = {"url": url}
    ifd, bo = C.ifds(lambda a, b: rentang(url, a, b, info))
    t = ifd[0]
    W, H, T = t[256], t[257], t[322]
    assert (W, H, t[323]) == (1440, 400, T), f"kisi tak terduga {W}x{H}"
    tx = math.ceil(W / T)
    off, cnt = t[324], t[325]
    per_ubin = collections.defaultdict(list)
    for k in sel:
        r, c = baris_kolom(k)
        assert 0 <= r < H and 0 <= c < W, k
        per_ubin[(r // T) * tx + c // T].append((k, r % T, c % T))
    out, h = {}, hashlib.sha256()
    for u, daftar in sorted(per_ubin.items()):
        raw = rentang(url, off[u], off[u] + cnt[u], info)
        h.update(raw)
        a = baca_float(t, bo, raw)
        for k, r, c in daftar:
            v = a[r * T + c]
            out[k] = None if (v != v or v < NODATA) else round(v, 2)
    info["sha_ubin"] = h.hexdigest()
    return out, info


def daftar_hari():
    """{date: ukuran_KiB_teks} dari listing direktori tahunan; hari yang tidak ada di listing = hilang (tidak diisi)."""
    ada = {}
    for y in range(AWAL.year, dt.date.today().year + 1):
        try:
            html = rentang_html(CHIRPS_LIST.format(y=y))
        except Exception as e:
            print(f"listing {y} gagal: {e}", file=sys.stderr)
            continue
        for m in re.finditer(r'href="chirps-v2\.0\.(\d{4})\.(\d\d)\.(\d\d)\.cog"', html):
            d = dt.date(*map(int, m.groups()))
            if d >= AWAL:
                ada[d] = True
    return ada


def rentang_html(url, coba=4):
    for i in range(coba):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=C.UA), timeout=60) as r:
                return r.read().decode()
        except Exception:
            if i == coba - 1:
                raise
            time.sleep(3 * (i + 1))


def jalur_hari(d):
    return os.path.join(CHIRPS_DIR, str(d.year), f"{d.isoformat()}.json.gz")


def sudah(d, sel):
    p = jalur_hari(d)
    if not os.path.exists(p):
        return False
    try:
        with gzip.open(p, "rt") as f:
            return set(sel) <= set(json.load(f))
    except Exception:
        return False


def satu_hari(d, sel):
    v, info = baca_hari(d, sel)
    p = jalur_hari(d)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + ".tmp"
    with gzip.open(tmp, "wt") as f:
        json.dump(v, f, separators=(",", ":"), sort_keys=True)
    os.replace(tmp, p)
    return {"hari": d.isoformat(), "url": info["url"], "ukuran": info.get("ukuran"), "sha_ubin": info["sha_ubin"],
            "sha_cache": sha_berkas(p), "hilang": sorted(k for k, x in v.items() if x is None)}


def ambil(awal=None, akhir=None):
    sel = sel_dibutuhkan()
    ada = daftar_hari()
    hari = sorted(d for d in ada if (awal is None or d >= awal) and (akhir is None or d <= akhir))
    os.makedirs(CHIRPS_DIR, exist_ok=True)
    jsonl = os.path.join(CHIRPS_DIR, "manifest.jsonl")
    sisa = [d for d in hari if not sudah(d, sel)]
    print(f"{len(sel)} sel; {len(hari)} hari di listing ({hari[0]}..{hari[-1]}); sisa diunduh {len(sisa)}", flush=True)
    t0, n, gagal = time.time(), 0, []
    with ThreadPoolExecutor(PEKERJA) as ex, open(jsonl, "a") as mf:
        for i in range(0, len(sisa), 64):
            potong = sisa[i:i + 64]
            futs = [(d, ex.submit(satu_hari, d, sel)) for d in potong]
            for d, f in futs:
                try:
                    mf.write(json.dumps(f.result(), separators=(",", ":")) + "\n")
                    n += 1
                except Exception as e:
                    gagal.append(d.isoformat())
                    print(f"GAGAL {d}: {e}", flush=True)
            mf.flush()
            kira = (time.time() - t0) / max(n, 1) * (len(sisa) - n)
            print(f"{n}/{len(sisa)} hari, terakhir {potong[-1]}, sisa ~{kira / 60:.0f} mnt", flush=True)
    manifes()
    print(f"selesai: {n} diunduh, gagal {len(gagal)} {gagal[:10]}", flush=True)


def manifes():
    """manifest.json dari manifest.jsonl (entri terakhir per hari menang) + daftar hari tanpa cache lengkap"""
    sel = sel_dibutuhkan()
    m = {}
    jsonl = os.path.join(CHIRPS_DIR, "manifest.jsonl")
    if os.path.exists(jsonl):
        for s in open(jsonl):
            e = json.loads(s)
            m[e["hari"]] = e
    json.dump({"dibuat": dt.datetime.now().isoformat(timespec="seconds"), "produk": "CHIRPS v2.0 final p25 harian (HTTP Range, ubin penuh sel dibutuhkan)",
               "sel": sel, "sha256_sel": sha("\n".join(sel).encode()), "hari": [m[k] for k in sorted(m)]},
              open(os.path.join(KELUAR, "chirps_manifest.json"), "w"), separators=(",", ":"))
    return m


# ================================================================ MODEL (latih / sia / buka), PRAREG-HULU.md §3-§5 dan §7
def J(nama):
    return os.path.join(KELUAR, nama)


def tgl(s):
    return dt.date.fromisoformat(s)


def hari_ke(d):
    return (d - ub.AWAL).days


MK.LATIH, MK.VALIDASI, MK.UJI = range(2016, 2024), range(2024, 2026), range(2026, 2028)
AKHIR_LATIH = ub.AKHIR                       # 2026-01-03: validasi s/d 2025-12-31 + e+1 + cadangan
AKHIR_SIA, AKHIR_BUKA = dt.date(2026, 10, 2), dt.date(2027, 5, 2)    # hari terakhir dinilai = akhir - 2
JENDELA_A, JENDELA_B = (dt.date(2026, 1, 1), dt.date(2026, 9, 30)), (dt.date(2026, 11, 1), dt.date(2027, 4, 30))
SIA_DARI, BUKA_DARI = dt.date(2027, 2, 15), dt.date(2027, 9, 15)
HILANG_DITERIMA = {(2025, 5)}   # bulan yang tidak terbit di server (dicek 1 Nov 2026): hari hilang, dikeluarkan dari semua model, tidak menunda sia/buka
ULANG, BIJI = 5000, 11
Q_LO, Q_HI = 0.0083, 0.9917     # selang 98,33% tengah = Bonferroni m = 3 pada alfa satu-sisi 5% (PRAREG-HULU §5)
SKEMA = ("kab_musim", "pulau_minggu")
BIJI_MODEL = (1, 2, 3, 4, 5)
POHON_MAKS, HIPER = MK.POHON_MAKS, MK.HIPER
KELOMPOK_M0 = sorted(g for g in MK.KELOMPOK if g != "anteseden")
CH, HU = ["c1", "c3", "c_pers"], ["hu1", "hu3", "hulu_ada"]
FITUR = MK.FITUR + CH + HU
N0 = len(MK.FITUR)
AKTIF0 = MK.aktif_dari(KELOMPOK_M0)
AKTIF = {"M0": AKTIF0, "M2": AKTIF0 + [FITUR.index(f) for f in CH], "M3": AKTIF0 + [FITUR.index(f) for f in CH + HU]}
KONTRAS = (("M2", "M0"), ("M3", "M2"))
PROTOKOL = os.path.join(AKAR, "scripts/banjir/PRAREG-HULU.md")
SIDIK_JEJAK = os.path.join(AKAR, "scripts/banjir/model_kab_hulu.sidik")   # JSONL hanya-tambah, dilacak git, DI LUAR sidik
JEJAK_REPO = AKAR
DIBI_TGL = os.path.join(AKAR, "data/raw/banjir/dibi_tanggal.json")
DAYA_CATATAN = "hanya derau evaluasi pada alarm tetap dan target kejadian tetap; daya sebenarnya lebih rendah"
LOGBOOK_RENTANG = (dt.date(2016, 1, 1), dt.date(2023, 12, 31))

KRITERIA = {
    "pertanyaan": "H2: M2 = M0 + CHIRPS lokal (c1, c3, c_pers); H1: M3 = M2 + hulu DAS (hu1, hu3, hulu_ada); kontras M2-M0 dan M3-M2",
    "M0": "fitur model_kab.py tanpa kelompok anteseden; dilatih dengan label gabungan sehingga BUKAN M0 DEBIT",
    "label_latih": "DIBI ATAU logbook lb_mulai pada hari tercakup arsip (tanpa tanggal_curiga), 2016-2023; validasi, Uji A, Uji B hanya DIBI; frek_dibi dari DIBI saja",
    "pembagian": "latih 2016-2023, validasi 2024-2025, Uji A 2026-01-01..09-30 (hanya bisa menolak), Uji B 2026-11-01..2027-04-30",
    "alarm": "jumlah alarm sama dengan aturan status.py (>= Waspada, >= Siaga) pada periode yang dinilai; seri dipecah acak biji 11",
    "ci": "bootstrap 5000 ulangan biji 11, dua skema blok (kab x musim-tahun, pulau x minggu), blok identik M0/M2/M3, persentil 0,83 dan 99,17 (98,33% tengah); bawah = terkecil, atas = terbesar",
    "keluarga": "m = 3 (DEBIT M1-M0, HULU M2-M0, HULU M3-M2) Bonferroni alfa satu-sisi 5%",
    "pemilihan": "kelompok (GBDT/LR) menurut logloss validasi M0 sesudah Platt lintas tahun (pasang 2024 nilai 2025 dan sebaliknya, dirata-rata); hiperparameter disetel per model; 5 biji (1..5) dirata-rata; Platt final di seluruh validasi",
    "sia": "per kontras: dETS Waspada titik <= 0 -> 'tidak terbukti', kontras DIHENTIKAN; hanya bisa menolak",
    "lulus": "batas bawah dETS Waspada > 0, dETS Siaga > 0, dan selisih Brier skill > 0 (selang 98,33%)",
    "tidak_lulus": "dETS Waspada titik <= 0 atau batas atasnya < 0",
    "tidak_meyakinkan": "selain keduanya",
    "chirps": "c1 = hujan e; c3 = e-1..e+1; c_pers = persentil c3 terhadap c3 sel pada LATIH (bisect_left); kabupaten = maks atas sel valid",
    "hulu": "hu1 = hujan hulu hari CHIRPS UTC e-2; hu3 = jumlah e-4..e-2; rerata berbobot km2 irisan atas sel hulu valid; hulu_ada 0/1, tanpa hulu hu* = 0",
    "hilang": "hari/sel CHIRPS hilang tidak diisi; baris tanpa sel valid dikeluarkan dari SEMUA model; kab dengan semua sel nodata permanen dikeluarkan dari semua kontras",
    "tanggal": "sia paling cepat 2027-02-15, buka 2027-09-15, dan hanya bila cache CHIRPS lengkap (kecuali 2025-05) sampai akhir jendela",
}


def sidik_kriteria():
    return hashlib.sha256(json.dumps(KRITERIA, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]


def tambal():
    return {"LATIH": [MK.LATIH[0], MK.LATIH[-1]], "VALIDASI": [MK.VALIDASI[0], MK.VALIDASI[-1]], "UJI": [MK.UJI[0], MK.UJI[-1]],
            "AWAL": str(ub.AWAL), "AKHIR_LATIH": str(AKHIR_LATIH), "AKHIR_SIA": str(AKHIR_SIA), "AKHIR_BUKA": str(AKHIR_BUKA),
            "JENDELA_A": [str(x) for x in JENDELA_A], "JENDELA_B": [str(x) for x in JENDELA_B], "MULAI": MK.MULAI, "GESER": GESER,
            "HIPER": HIPER, "HIPER_TETAP": MK.HIPER_TETAP, "POHON_MAKS": POHON_MAKS, "BIJI": BIJI, "ULANG": ULANG, "Q": [Q_LO, Q_HI],
            "BIJI_MODEL": list(BIJI_MODEL), "FITUR": FITUR, "AKTIF": AKTIF, "PLAFON_HULU_KM2": PLAFON_HULU_KM2,
            "AMBANG_IRISAN": AMBANG_IRISAN, "HILANG_DITERIMA": sorted(HILANG_DITERIMA)}


@contextlib.contextmanager
def tambal_ub(akhir=None):
    a = ub.AKHIR
    ub.AKHIR = akhir or a
    try:
        yield
    finally:
        ub.AKHIR = a


# ------------------------------------------------------------------ sampel dan fitur CHIRPS/hulu
def muat_sampel_h():
    """-> (kabs, sel [tuple], sk {kab: {(la, lo): [bahaya banjir, bahaya longsor]}}) dari sampel.json (salinan terkunci)."""
    s = json.load(open(SAMPEL))
    return s["kab"], [tuple(x) for x in s["sel"]], {k: {(a, b): [c, d] for a, b, c, d in v} for k, v in s["sk"].items()}


def muat_chirps(keys, akhir):
    """-> ({sel: [mm | None] indeks hari sejak ub.AWAL s/d `akhir`}, [hari tanpa berkas cache]). Hilang tidak diisi."""
    n = (akhir - ub.AWAL).days + 1
    out, hilang, d = {k: [None] * n for k in keys}, [], max(AWAL, ub.AWAL)
    while d <= akhir:
        p = jalur_hari(d)
        if os.path.exists(p):
            with gzip.open(p, "rt") as f:
                v = json.load(f)
            i = hari_ke(d)
            for k in keys:
                assert k in v, f"{d}: sel {k} tak ada di cache CHIRPS: jalankan `ambil`"
                out[k][i] = v[k]
        else:
            hilang.append(d)
        d += dt.timedelta(1)
    return out, hilang


def sel_valid(ch):
    """sel yang punya sedikitnya satu nilai (bukan nodata permanen)"""
    return {k for k, s in ch.items() if any(x is not None for x in s)}


def c3_sel(s, e):
    """(c1, c3) sel pada hari e atau None bila ada hari hilang di e-1..e+1."""
    w = s[e + GESER:e + GESER + 3]
    return None if s[e] is None or any(x is None for x in w) else (s[e], sum(w))


def batas_chirps(ch, hari):
    """c3 terurut per sel pada hari-hari LATIH saja (distribusi c_pers)."""
    return {k: sorted(v[1] for v in (c3_sel(s, e) for e in hari) if v) for k, s in ch.items()}


def info_kab(sk, basin_kab, valid):
    """{kab: {lokal: [kunci sel valid], hulu: [(kunci, km2)] valid, hulu_ada}}; kab tanpa sel lokal valid dikeluarkan."""
    out = {}
    for kab, sels in sk.items():
        lokal = [kunci(*s) for s in sorted(sels) if kunci(*s) in valid]
        if lokal:
            b = basin_kab[kab]
            hulu = [(k, w) for k, w in b["sel_hulu"] if k in valid]
            out[kab] = {"lokal": lokal, "hulu": hulu, "hulu_ada": 1 if b["hulu_ada"] and hulu else 0}
    return out


def tambah_hulu(B, ch, batas, info):
    """Menambah 6 kolom (urut CH + HU) ke B["X"] dan MEMBUANG baris tanpa sel valid; baris yang sama dibuang untuk semua model.
    -> (B baru, statistik pengecualian)."""
    kolom = ("kab", "tahun", "bulan", "e", "X", "y", "level")
    ada, st = [], {"masuk": len(B["y"]), "tanpa_chirps": 0, "tanpa_hulu": 0, "kab_dibuang": 0}
    ekstra = []
    for i, (kab, e) in enumerate(zip(B["kab"], B["e"])):
        if kab not in info:
            st["kab_dibuang"] += 1
            continue
        f = [v for v in ((k, c3_sel(ch[k], e)) for k in info[kab]["lokal"]) if v[1] and batas[v[0]]]
        if not f:
            st["tanpa_chirps"] += 1
            continue
        c1 = max(v[1][0] for v in f)
        c3 = max(v[1][1] for v in f)
        cp = max(bisect.bisect_left(batas[k], v[1]) / len(batas[k]) for k, v in f)
        hu1 = hu3 = 0.0
        if info[kab]["hulu_ada"]:
            w1 = [(w, ch[k][e - 2]) for k, w in info[kab]["hulu"] if ch[k][e - 2] is not None]   # hari UTC e-2 selesai 07.00 WIB e-1
            w3 = [(w, sum(ch[k][e - 4:e - 1])) for k, w in info[kab]["hulu"] if all(x is not None for x in ch[k][e - 4:e - 1])]
            if not w1 or not w3:
                st["tanpa_hulu"] += 1
                continue
            hu1 = sum(w * v for w, v in w1) / sum(w for w, _ in w1)
            hu3 = sum(w * v for w, v in w3) / sum(w for w, _ in w3)
        ada.append(i)
        ekstra.append([c1, c3, cp, hu1, hu3, float(info[kab]["hulu_ada"])])
    out = {k: [B[k][i] for i in ada] for k in kolom}
    out["X"] = [B["X"][i] + x for i, x in zip(ada, ekstra)]
    st["keluar"] = len(ada)
    return out, st


def x_lr_h(x):
    return MK.x_lr(x[:N0]) + [math.log1p(x[N0]), math.log1p(x[N0 + 1]), x[N0 + 2], math.log1p(x[N0 + 3]), math.log1p(x[N0 + 4]), x[N0 + 5]]


# ------------------------------------------------------------------ label latih
def label_latih(ev, kabs, baris_lb, tercakup):
    """DIBI ATAU logbook lb_mulai: -> (ev baru {"banjir": {kab: set(hari)}}, pasangan logbook yang DITAMBAHKAN [(kab, tanggal)]).
    baris_lb = baris tabel label_bersatu (dict). Hanya hari di `tercakup`, kab di sampel, rentang 2016-2023. DIBI tidak diubah."""
    baru = {"banjir": {k: set(v) for k, v in ev["banjir"].items()}, "longsor": ev["longsor"]}
    tambah = []
    for r in baris_lb:
        if r["lb_mulai"] != "1" or r["tanggal"] not in tercakup or r["kab_kunci"] not in kabs:
            continue
        d = tgl(r["tanggal"])
        if not (LOGBOOK_RENTANG[0] <= d <= LOGBOOK_RENTANG[1]):
            continue
        e = hari_ke(d)
        if e not in baru["banjir"].setdefault(r["kab_kunci"], set()):
            baru["banjir"][r["kab_kunci"]].add(e)
            tambah.append((r["kab_kunci"], r["tanggal"]))
    return baru, sorted(tambah)


def baca_label_bersatu():
    with gzip.open(LB.OUT_CSV, "rt", newline="") as f:
        baris = list(csv.DictReader(f))
    return baris, set(json.load(open(LB.OUT_HARI)))


# ------------------------------------------------------------------ model
def ll_silang(z, VA):
    """logloss Platt lintas tahun: Platt dipasang di satu tahun validasi, dinilai di tahun lain, dirata-rata."""
    th = sorted(set(VA["tahun"]))
    idx = {t: [i for i, v in enumerate(VA["tahun"]) if v == t] for t in th}
    hasil = []
    for a, b in ((th[0], th[1]), (th[1], th[0])):
        pl = MK.platt([z[i] for i in idx[a]], [VA["y"][i] for i in idx[a]])
        hasil.append(G.logloss(MK.pakai_platt(pl, [z[i] for i in idx[b]]), [VA["y"][i] for i in idx[b]]))
    return sum(hasil) / len(hasil)


def tala_gbdt(TR, VA, aktif, grid=None, pohon_maks=None, log=None):
    """Kisi kedalaman x laju belajar x jumlah pohon menurut ll_silang (biji 1). -> (hiper, ll)."""
    grid, pohon_maks = grid or HIPER, pohon_maks or POHON_MAKS
    w, kisi = [1.0] * len(TR["y"]), []
    tahap = set(range(20 if pohon_maks >= 20 else 1, pohon_maks + 1, 10 if pohon_maks >= 20 else 1))
    for d, lr in grid:
        m = G.latih_gbdt(TR["X"], TR["y"], w, pohon=pohon_maks, dalam=d, lr=lr, fitur_aktif=aktif, **MK.HIPER_TETAP)
        for t, z in MK.skor_bertahap(m, VA["X"], tahap).items():
            kisi.append((ll_silang(z, VA), d, lr, t))
        if log:
            log(f"    dalam {d} lr {lr}: ll silang terbaik {min(k for k in kisi if k[1] == d and k[2] == lr)[0]:.5f}")
    ll, d, lr, n = min(kisi)
    return {"dalam": d, "lr": lr, "pohon": n, **MK.HIPER_TETAP}, ll


def latih_anggota(TR, VA, aktif, hiper):
    """5 biji (1..5), tiap biji dengan Platt sendiri di seluruh validasi; peluang dirata-rata (prediksi_h)."""
    w, ang = [1.0] * len(TR["y"]), []
    for b in BIJI_MODEL:
        m = G.latih_gbdt(TR["X"], TR["y"], w, pohon=hiper["pohon"], dalam=hiper["dalam"], lr=hiper["lr"], fitur_aktif=aktif,
                         **{**MK.HIPER_TETAP, "seed": b})
        ang.append({"bias": m["bias"], "pohon": m["pohon"], "platt": MK.platt(MK.skor_gbdt(m, VA["X"]), VA["y"])})
    return {"jenis": "gbdt", "aktif": aktif, "hiper": hiper, "anggota": ang}


def latih_lr_h(TR, VA, aktif):
    Xt = [[x_lr_h(x)[i] for i in aktif] for x in TR["X"]]
    lr = G.latih_lr(Xt, TR["y"], [1.0] * len(Xt))
    m = {"jenis": "lr", "aktif": aktif, "hiper": {}, "anggota": [{"lr": {k: lr[k] for k in ("mu", "sd", "b")}}]}
    z = skor_lr(m["anggota"][0], aktif, VA["X"])
    m["anggota"][0]["platt"] = MK.platt(z, VA["y"])
    return m, ll_silang(z, VA)


def skor_lr(a, aktif, X):
    return [MK.logit(G.prediksi_lr(a["lr"], [x_lr_h(x)[i] for i in aktif])) for x in X]


def prediksi_h(m, X):
    if m["jenis"] == "gbdt":
        ps = [MK.pakai_platt(a["platt"], MK.skor_gbdt(a, X)) for a in m["anggota"]]
        return [sum(c) / len(ps) for c in zip(*ps)]
    a = m["anggota"][0]
    return MK.pakai_platt(a["platt"], skor_lr(a, m["aktif"], X))


def cocok_semua(TR, VA, log=None, grid=None, pohon_maks=None):
    """Kelompok menurut ll_silang M0; M2 dan M3 memakai kelompok yang sama, hiperparameter disetel TERPISAH per model.
    -> (jenis, {M0, M2, M3: model}, {gbdt: ll M0, lr: ll M0}, {model: ll_silang terpilih})."""
    h0, l_g0 = tala_gbdt(TR, VA, AKTIF["M0"], grid, pohon_maks, log)
    m_lr0, l_l0 = latih_lr_h(TR, VA, AKTIF["M0"])
    ll = {"gbdt": l_g0, "lr": l_l0}
    jenis = "gbdt" if l_g0 <= l_l0 else "lr"
    mod, lls = {}, {}
    for nama in ("M0", "M2", "M3"):
        if jenis == "gbdt":
            h, l = (h0, l_g0) if nama == "M0" else tala_gbdt(TR, VA, AKTIF[nama], grid, pohon_maks, log)
            mod[nama], lls[nama] = latih_anggota(TR, VA, AKTIF[nama], h), l
        else:
            mod[nama], lls[nama] = (m_lr0, l_l0) if nama == "M0" else latih_lr_h(TR, VA, AKTIF[nama])
    return jenis, mod, ll, lls


def latih_ulang_hiper(TR, VA, jenis, mod):
    """Kontrol label DIBI saja: resep sama (kelompok dan hiperparameter terpilih), dilatih ulang dengan TR berlabel lain."""
    return {n: (latih_anggota(TR, VA, m["aktif"], m["hiper"]) if jenis == "gbdt" else latih_lr_h(TR, VA, m["aktif"])[0]) for n, m in mod.items()}


# ------------------------------------------------------------------ penilaian
def musim_tahun(bulan, tahun):
    """Okt-Mar = satu musim yang diberi tahun akhirnya; Apr-Sep = musim kering tahun itu."""
    return (tahun + 1, "hujan") if bulan >= 10 else (tahun, "hujan") if bulan <= 3 else (tahun, "kering")


def blok_h(B, skema):
    out = defaultdict(list)
    for i, (k, t, m, e) in enumerate(zip(B["kab"], B["tahun"], B["bulan"], B["e"])):
        out[(k, musim_tahun(m, t)) if skema == "kab_musim" else (ub.KELOMPOK[k[0]], e // 7)].append(i)
    return out


def ets_t(t):
    return ub.skor(*t)["ets"] or 0.0


def n_alarm(B):
    return {nama: sum(1 for l in B["level"] if l >= L) for nama, L in MK.LEVEL_ALARM.items()}


def boot_kontras(B, P, ref, kontras=KONTRAS, ulang=ULANG):
    """Bootstrap blok BERPASANGAN: satu resampel blok dipakai semua model (M0, M2, M3) di tiap skema.
    -> {'M2-M0': {'waspada': {nilai, ci, skema...}, 'siaga': ..., 'bss': ...}, ...}; ci = [terkecil bawah, terbesar atas] lintas skema."""
    y, ns = B["y"], n_alarm(B)
    alarm = {m: {lv: MK.alarm_sebanyak(P[m], n) for lv, n in ns.items()} for m in P}
    hasil = {f"{a}-{b}": {k: {} for k in ("waspada", "siaga", "bss")} for a, b in kontras}
    for sk_ in SKEMA:
        bl = blok_h(B, sk_)
        kunci_ = sorted(bl)
        cnt = {m: {lv: MK.cacah(B, alarm[m][lv], bl) for lv in ns} for m in P}
        se = {k: {**{m: sum((P[m][i] - y[i]) ** 2 for i in ix) for m in P}, "ref": sum((ref[i] - y[i]) ** 2 for i in ix)} for k, ix in bl.items()}

        def stat(ks):
            ets = {m: {lv: ets_t(MK.jumlah(cnt[m][lv], ks)) for lv in ns} for m in P}
            tot = {m: sum(se[k][m] for k in ks) for m in list(P) + ["ref"]}
            return {f"{a}-{b}": {**{lv: ets[a][lv] - ets[b][lv] for lv in ns}, "bss": (tot[b] - tot[a]) / tot["ref"]} for a, b in kontras}
        titik, r, xs = stat(kunci_), random.Random(BIJI), defaultdict(list)
        for _ in range(ulang):
            for kn, v in stat([r.choice(kunci_) for _ in kunci_]).items():
                for lv, x in v.items():
                    xs[(kn, lv)].append(x)
        for kn in hasil:
            for lv in ("waspada", "siaga", "bss"):
                v = sorted(xs[(kn, lv)])
                hasil[kn][lv][sk_] = {"nilai": round(titik[kn][lv], 5), "ci": [round(v[int(Q_LO * (ulang - 1))], 5), round(v[int(Q_HI * (ulang - 1))], 5)], "blok": len(bl)}
    for kn in hasil:
        for lv, d in hasil[kn].items():
            d["nilai"] = d[SKEMA[0]]["nilai"]
            d["ci"] = [min(d[s]["ci"][0] for s in SKEMA), max(d[s]["ci"][1] for s in SKEMA)]
            if lv != "bss":
                d["alarm"] = ns[lv]
    return hasil


def per_pulau(B, P, kontras=KONTRAS):
    """dETS Waspada titik per pulau (dilaporkan, bukan gerbang)."""
    n, out = n_alarm(B)["waspada"], {}
    al = {m: MK.alarm_sebanyak(P[m], n) for m in P}
    pulau = defaultdict(list)
    for i, k in enumerate(B["kab"]):
        pulau[ub.KELOMPOK[k[0]]].append(i)
    for a, b in kontras:
        out[f"{a}-{b}"] = {pl: {"n": len(ix), "kej": sum(B["y"][i] for i in ix),
                                "dets": round(ets_t(MK.kontingensi(al[a], B["y"], ix)) - ets_t(MK.kontingensi(al[b], B["y"], ix)), 4)} for pl, ix in sorted(pulau.items())}
    return out


def rangkum_h(B, P, ref, ulang=ULANG, penuh=True):
    """Semua angka yang dilaporkan untuk satu periode. P: {M0, M2, M3: peluang}, ref: klimatologi terkalibrasi."""
    y = B["y"]
    out = {"n": len(y), "kej": sum(y), "laju": round(sum(y) / max(1, len(y)), 4), "kab": len(set(B["kab"]))}
    out["probabilitas"] = {m: {"auc": G.auc(p, y), "brier": G.brier(p, y), "logloss": G.logloss(p, y)} for m, p in list(P.items()) + [("klimatologi", ref)]}
    out["kontras"] = boot_kontras(B, P, ref, ulang=ulang)
    if penuh:
        ns, bl = n_alarm(B), blok_h(B, SKEMA[0])
        sem = list(range(len(y)))
        for lv, L in MK.LEVEL_ALARM.items():
            tot = lambda al: ets_t(MK.kontingensi(al, y, sem))
            out["ets_" + lv] = {**{m: round(tot(MK.alarm_sebanyak(p, ns[lv])), 4) for m, p in P.items()}, "aturan": round(tot([l >= L for l in B["level"]]), 4)}
        out["per_pulau"] = per_pulau(B, P)
    return out


def vonis_kontras(r):
    """r = rangkum_h(...)['kontras'][nama] -> LULUS | TIDAK LULUS | TIDAK MEYAKINKAN."""
    w, s, b = r["waspada"], r["siaga"], r["bss"]
    rin = {"dETS_waspada_bawah_positif": w["ci"][0] > 0, "dETS_siaga_bawah_positif": s["ci"][0] > 0, "brier_skill_bawah_positif": b["ci"][0] > 0}
    if all(rin.values()):
        v = "LULUS"
    elif w["nilai"] <= 0 or w["ci"][1] < 0:
        v = "TIDAK LULUS"
    else:
        v = "TIDAK MEYAKINKAN"
    return {"vonis": v, "rincian": rin}


def vonis_sia_kontras(r):
    """Kesia-siaan Uji A: hanya bisa menolak."""
    return {"vonis": "tidak terbukti" if r["waspada"]["nilai"] <= 0 else "lanjut", "d_ets_waspada": r["waspada"]["nilai"]}


def mde_h(B, P, target=200, ulang=100, ulangan=20, biji=BIJI):
    """SE dETS tiap kontras dari bootstrap blok (kab x musim) sampai ~`target` kejadian; z = persentil Q_HI (selang 98,33% tengah).
    mde_50 = z SE (batas bawah tepat 0), mde_80 = (z + 0,8416) SE. Alarm tetap dari seluruh validasi."""
    bl = blok_h(B, SKEMA[0])
    kej = {k: sum(B["y"][i] for i in ix) for k, ix in bl.items()}
    if sum(kej.values()) == 0:
        return None
    z, r, keys = statistics.NormalDist().inv_cdf(Q_HI), random.Random(biji), sorted(bl)
    out = {"target_kejadian": target, "kejadian_validasi": sum(kej.values()), "z": round(z, 4), "catatan": DAYA_CATATAN}
    ns = n_alarm(B)
    for a, b in KONTRAS:
        for lv in ns:
            ba, bb = (MK.cacah(B, MK.alarm_sebanyak(P[m], ns[lv]), bl) for m in (a, b))
            ses = []
            for _ in range(ulangan):
                ks, c = [], 0
                while c < target:
                    k = r.choice(keys)
                    ks.append(k)
                    c += kej[k]
                xs = []
                for _ in range(ulang):
                    dr = [r.choice(ks) for _ in ks]
                    xs.append(ets_t(MK.jumlah(ba, dr)) - ets_t(MK.jumlah(bb, dr)))
                ses.append(statistics.stdev(xs))
            se = sum(ses) / len(ses)
            out.setdefault(f"{a}-{b}", {})[lv] = {"se": round(se, 5), "mde_50": round(z * se, 4), "mde_80": round((z + 0.8416) * se, 4)}
    return out


def cetak(pen):
    print(f"  n={pen['n']} kej={pen['kej']} laju={pen['laju']} kab={pen['kab']}")
    for m, v in pen["probabilitas"].items():
        print(f"    {m:12s} AUC {v['auc']:.4f}  Brier {v['brier']:.5f}  logloss {v['logloss']:.5f}")
    for kn, r in pen["kontras"].items():
        b = r["bss"]
        print(f"  HULU {kn}: dBSS {b['nilai']:+.5f} CI98,3 [{b['ci'][0]:+.5f}, {b['ci'][1]:+.5f}]")
        for lv in MK.LEVEL_ALARM:
            x = r[lv]
            print(f"    >= {lv} (alarm {x['alarm']}): dETS {x['nilai']:+.4f} CI98,3 [{x['ci'][0]:+.4f}, {x['ci'][1]:+.4f}]  "
                  + "  ".join(f"{s}: [{x[s]['ci'][0]:+.4f}, {x[s]['ci'][1]:+.4f}]" for s in SKEMA))


# ------------------------------------------------------------------ sidik
ISI_KAND = ("fitur", "jenis", "M0", "M2", "M3", "kontrol", "mde", "ll_silang", "klim", "frek", "frek_awal", "sel", "kab", "kab_dibuang", "platt_klim")


def hash_berkas(*jalur):
    return [hashlib.sha256(open(j, "rb").read()).hexdigest() for j in jalur]


def sha_berkas_j(j):
    return hash_berkas(j)[0]


def hari_diterima_hilang(d):
    return (d.year, d.month) in HILANG_DITERIMA


def hari_kurang(akhir):
    """hari AWAL..akhir tanpa cache CHIRPS dan di luar bulan yang diterima hilang"""
    out, d = [], AWAL
    while d <= akhir:
        if not os.path.exists(jalur_hari(d)) and not hari_diterima_hilang(d):
            out.append(d)
        d += dt.timedelta(1)
    return out


def manifest_chirps(akhir):
    """[[hari, sha256 berkas cache]] s/d `akhir` (urut) + hari tanpa berkas: tambahan sesudah `akhir` tidak mengubahnya."""
    ada, hilang, d = [], [], AWAL
    while d <= akhir:
        p = jalur_hari(d)
        if os.path.exists(p):
            ada.append([d.isoformat(), sha_berkas_j(p)])
        else:
            hilang.append(d.isoformat())
        d += dt.timedelta(1)
    return {"ada": ada, "hilang": hilang}


def sidik_penuh(kand):
    """sha256: kriteria + isi kandidat + konstanta tambalan + isi kode (berkas ini, model_kab, uji_balik, status, label_bersatu, umum, gbdt)
    + protokol + sampel + basin/sel hulu + label latih (mengunci tabel label_bersatu dan hari tercakup lewat sha256; logbook mentah tidak disidik, amandemen A1) + salinan DIBI <= 2025 + manifest ERA5 dan CHIRPS s/d AKHIR_LATIH."""
    h = hashlib.sha256(json.dumps({"kriteria": KRITERIA, "kand": {k: kand[k] for k in ISI_KAND}, "tambal": tambal()}, sort_keys=True).encode())
    kode = [os.path.abspath(__file__)] + [os.path.join(AKAR, "scripts/banjir", n) for n in ("model_kab.py", "uji_balik.py", "status.py", "label_bersatu.py", "umum.py", "model_kab_debit.py")]
    kode += [os.path.join(AKAR, "scripts/sebaran/gbdt.py"), PROTOKOL, SAMPEL, BASIN, J("label_latih.json"), J("dibi_le2025.json")]
    h.update(json.dumps(hash_berkas(*kode)).encode())
    h.update(json.dumps(MK.manifest_era5(kand["sel"])).encode())
    h.update(json.dumps(manifest_chirps(AKHIR_LATIH)).encode())
    return h.hexdigest()[:16]


def hash_baris(baris):
    return hashlib.sha256(json.dumps(sorted(map(list, baris)), sort_keys=True, ensure_ascii=False).encode()).hexdigest()


# ------------------------------------------------------------------ data
def data_latih():
    kabs, sel, sk = muat_sampel_h()
    basin_kab = json.load(open(BASIN))["kab"]
    baris = [r for r in json.load(open(DIBI_TGL)) if r[3] <= "2025-12-31"]
    json.dump(baris, open(J("dibi_le2025.json"), "w"), separators=(",", ":"))
    ev = ub.peristiwa(baris)
    cuaca = MK.muat_cuaca(sel)
    awal = MK.laju_awal(baris, kabs)
    penuh, eks = MK.frekuensi(ev, kabs, awal)
    ch, hilang = muat_chirps(sel_dibutuhkan(), AKHIR_LATIH)
    valid = sel_valid(ch)
    info = info_kab(sk, basin_kab, valid)
    batas = batas_chirps(ch, MK.hari_tahun(MK.LATIH))
    lb, tercakup = baca_label_bersatu()
    ev_l, tambah = label_latih(ev, set(kabs), lb, tercakup)
    json.dump({"dibuat": str(dt.date.today()), "tambahan_logbook": tambah, "n": len(tambah), "sha256": hash_baris([[k, t] for k, t in tambah]),
               "sha256_label_bersatu_csv": sha_berkas_j(LB.OUT_CSV), "sha256_hari_tercakup": sha_berkas_j(LB.OUT_HARI)}, open(J("label_latih.json"), "w"), separators=(",", ":"))
    return {"kabs": kabs, "sel": sel, "sk": sk, "baris": baris, "ev": ev, "ev_l": ev_l, "cuaca": cuaca, "pers": MK.persentil_batas(cuaca), "awal": awal,
            "penuh": penuh, "eks": eks, "ch": ch, "hilang_hari": hilang, "info": info, "batas": batas, "klim": MK.klimatologi(ev, kabs, penuh),
            "kab_dibuang": sorted(set(kabs) - set(info)), "valid": valid}


def bangun_h(D, tahun, ev):
    B = MK.bangun(D["cuaca"], D["sk"], [k for k in D["kabs"] if k in D["info"]], ev, tahun, D["pers"], D["penuh"], D["eks"])
    return tambah_hulu(B, D["ch"], D["batas"], D["info"])


def p_klim_dari(B, klim, platt_k):
    return MK.pakai_platt(platt_k, [MK.logit(klim[f"{k}|{m}"]) for k, m in zip(B["kab"], B["bulan"])])


def kuantil(v, qs=(0.1, 0.5, 0.9)):
    v = sorted(v)
    return [round(v[int(q * (len(v) - 1))], 4) for q in qs]


def latih(ulang=False):
    for n in ("sia.mulai", "buka.mulai", "sia.json", "buka.json"):
        if os.path.exists(J(n)):
            sys.exit(f"{n} ada: sia/buka sudah dimulai; latih ulang = eksperimen baru")
    if os.path.exists(J("kandidat.json")) and not ulang:
        sys.exit("kandidat.json sudah ada: latih ulang butuh flag --ulang (menambah baris latih baru di jejak)")
    if not (os.path.exists(BASIN) and os.path.exists(SAMPEL)):
        sys.exit("basin.json/sampel.json belum ada: jalankan `basin`")
    t0 = time.time()
    D = data_latih()
    TR, st_tr = bangun_h(D, MK.LATIH, D["ev_l"])
    TRd, _ = bangun_h(D, MK.LATIH, D["ev"])        # sama persis kecuali y: kontrol label DIBI saja
    VA, st_va = bangun_h(D, MK.VALIDASI, D["ev"])
    assert TR["e"] == TRd["e"] and TR["kab"] == TRd["kab"]
    print(f"{len(D['info'])} kab (dibuang {len(D['kab_dibuang'])}: {D['kab_dibuang']}); latih {len(TR['y'])} baris ({sum(TR['y'])} kej label gabungan, "
          f"{sum(TRd['y'])} DIBI), validasi {len(VA['y'])} ({sum(VA['y'])} kej); hari CHIRPS hilang {len(D['hilang_hari'])}; pengecualian latih {st_tr} validasi {st_va}")
    jenis, mod, ll, lls = cocok_semua(TR, VA, log=lambda s: print(s, flush=True))
    print(f"  kelompok {jenis} (ll silang M0: {ll}); terpilih {lls}")
    pk_mentah = [D["klim"][f"{k}|{m}"] for k, m in zip(VA["kab"], VA["bulan"])]
    pl_k = MK.platt([MK.logit(p) for p in pk_mentah], VA["y"])
    pk = MK.pakai_platt(pl_k, [MK.logit(p) for p in pk_mentah])
    P = {n: prediksi_h(m, VA["X"]) for n, m in mod.items()}
    pen = rangkum_h(VA, P, pk)
    modd = latih_ulang_hiper(TRd, VA, jenis, mod)
    kontrol = rangkum_h(VA, {n: prediksi_h(m, VA["X"]) for n, m in modd.items()}, pk, penuh=False)   # kontrol DIBI-saja
    daya = mde_h(VA, P)
    nod = {k: sum(1 for x in D["ch"][k] if x is None) for k in sorted(D["ch"])}
    kand = {"versi": "model-kab-hulu-1", "dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
            "status": "KANDIDAT: Uji A/B belum dibuka", "fitur": FITUR, "jenis": jenis, **mod, "ll_silang": lls, "klim": D["klim"], "frek": D["penuh"],
            "frek_awal": D["awal"], "kontrol": modd, "mde": daya, "sel": [list(s) for s in D["sel"]], "kab": D["kabs"], "kab_dibuang": D["kab_dibuang"], "platt_klim": pl_k,
            "sidik_kriteria": sidik_kriteria()}
    kand["sidik"] = sidik_penuh(kand)
    json.dump(kand, open(J("kandidat.json"), "w"), separators=(",", ":"))
    tambah_jejak({"jenis": "latih", "waktu": kand["dibuat"], "sidik": kand["sidik"], "sidik_kriteria": kand["sidik_kriteria"]})
    json.dump({"dibuat": kand["dibuat"], "jenis": jenis, "ll_silang_kelompok_m0": ll, "ll_silang_terpilih": lls, "validasi": pen, "kontrol_dibi_saja": kontrol, "mde": daya,
               "pengecualian": {"latih": st_tr, "validasi": st_va}, "kab_dibuang": D["kab_dibuang"], "kab_tanpa_baris": sorted(set(D["kabs"]) - set(TR["kab"]) | set(D["kabs"]) - set(VA["kab"])), "hari_chirps_hilang": [str(d) for d in D["hilang_hari"]],
               "sel_chirps_nodata_hari": nod, "sel_nodata_permanen": sorted(set(D["ch"]) - D["valid"]),
               "hari_kejadian": {"latih_gabungan": sum(TR["y"]), "latih_dibi": sum(TRd["y"]), "validasi": sum(VA["y"])},
               "hulu": {"kab_dengan_hulu": sum(1 for v in D["info"].values() if v["hulu_ada"]), "kab": len(D["info"])}},
              open(J("latih.json"), "w"), separators=(",", ":"))
    cetak(pen)
    print("kontrol DIBI saja:")
    cetak(kontrol)
    print(f"MDE: {daya}" if daya else "MDE tidak dihitung")
    print(f"sidik {kand['sidik']} sidik_kriteria {kand['sidik_kriteria']}; kandidat.json ditulis; Uji A/B BELUM DIBUKA ({time.time() - t0:.0f} dtk)")
    print("INGAT: commit scripts/banjir/model_kab_hulu.sidik dan model_kab_hulu.py sebelum sia")


# ------------------------------------------------------------------ sia dan buka
def bekukan_label(nama, jendela, baris=None):
    """Salinan baris DIBI jendela itu + sha256, sekali. Sudah ada -> diverifikasi, tidak ditimpa. -> baris beku."""
    j = J(f"label_{nama}.json")
    if os.path.exists(j):
        c = json.load(open(j))
        if hash_baris(c["baris"]) != c["sha256"]:
            sys.exit(f"label beku {nama} rusak (sha256 tidak cocok)")
        return c["baris"]
    a, b = (str(x) for x in jendela)
    isi = [r for r in (baris if baris is not None else json.load(open(DIBI_TGL))) if a <= r[3] <= b]
    json.dump({"dibekukan": str(dt.date.today()), "jendela": [a, b], "n": len(isi), "sha256": hash_baris(isi), "baris": isi}, open(j, "w"), separators=(",", ":"))
    return isi


def tambah_jejak(baris):
    """Jangkar luar: satu baris JSONL ke model_kab_hulu.sidik (dilacak git; JANGAN sunting tangan, commit sesudah tiap mode)."""
    with open(SIDIK_JEJAK, "a") as f:
        f.write(json.dumps(baris, sort_keys=True) + "\n")


def jejak_head():
    rel = os.path.relpath(os.path.realpath(SIDIK_JEJAK), os.path.realpath(JEJAK_REPO))
    r = subprocess.run(["git", "-C", JEJAK_REPO, "show", "HEAD:" + rel], capture_output=True)
    if r.returncode:
        sys.exit(f"{rel} tidak terlacak di HEAD (belum di-commit?): ditolak")
    if not os.path.exists(SIDIK_JEJAK) or open(SIDIK_JEJAK, "rb").read() != r.stdout:
        sys.exit(f"{rel} di working tree beda dari HEAD: commit (atau kembalikan) dulu, ditolak")
    return [json.loads(x) for x in r.stdout.decode().splitlines() if x.strip()]


def cek_kelengkapan(kand, akhir):
    """Sampel tidak berubah, manifest CHIRPS lengkap s/d `akhir` (kecuali bulan yang diterima hilang), ERA5 2026 tersedia."""
    kabs, sel, _ = muat_sampel_h()
    if kabs != kand["kab"] or [list(x) for x in sel] != kand["sel"]:
        sys.exit("sampel.json berubah sejak `latih`: ditolak")
    kurang = hari_kurang(akhir)
    if kurang:
        sys.exit(f"manifest CHIRPS belum lengkap s/d {akhir}: {len(kurang)} hari tanpa cache (pertama {kurang[0]}, terakhir {kurang[-1]}); "
                 "sia/buka ditunda sampai lengkap, tanpa pengganti")
    cuaca_sampai(sel, akhir)


def cuaca_sampai(sel, akhir):
    """ERA5 per sel s/d `akhir`: <= AKHIR_LATIH cache uji_balik; lebih: cache 2026 model_kab_debit (impor, tidak diubah). Menolak bila belum sampai."""
    if akhir <= AKHIR_LATIH:
        return MK.muat_cuaca(sel)
    import model_kab_debit as MKD
    return MKD.cuaca_sampai(sel, akhir)


def tulis_mulai(mode, sidik):
    """Atomik lintas proses: O_CREAT|O_EXCL."""
    try:
        fd = os.open(J(mode + ".mulai"), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        sys.exit(f"{mode}.mulai sudah ada: proses lain sudah memulai")
    with os.fdopen(fd, "w") as f:
        json.dump({"waktu": dt.datetime.now().isoformat(timespec="seconds"), "sidik": sidik}, f)


def gerbang(mode, hari_ini=None):
    """Menolak (sys.exit) bila mode tidak boleh jalan; penanda .mulai ditulis TERAKHIR sesudah semua pemeriksaan."""
    hari_ini = hari_ini or dt.date.today()
    if os.path.exists(J(mode + ".mulai")):
        sys.exit(f"{mode} sudah dimulai; proses yang mati di tengah tetap terhitung dibuka")
    if os.path.exists(J(mode + ".json")):
        sys.exit(f"{mode} sudah dijalankan; tidak bisa dijalankan lagi")
    if hari_ini < (SIA_DARI if mode == "sia" else BUKA_DARI):
        sys.exit(f"{mode} baru boleh dijalankan sejak {SIA_DARI if mode == 'sia' else BUKA_DARI}")
    if not os.path.exists(J("kandidat.json")):
        sys.exit("kandidat.json belum ada: jalankan `latih`")
    kand = json.load(open(J("kandidat.json")))
    if mode == "buka":
        if not os.path.exists(J("sia.json")):
            sys.exit("Uji A (`sia`) belum dijalankan")
        s = json.load(open(J("sia.json")))
        if not any(v["vonis"] == "lanjut" for v in s["vonis"].values()):
            sys.exit("Uji A menghentikan semua kontras ('tidak terbukti'): Uji B tidak dibuka")
        if s["sidik"] != kand["sidik"]:
            sys.exit("sidik pada sia.json beda dengan kandidat.json")
    if kand["sidik_kriteria"] != sidik_kriteria() or kand["sidik"] != sidik_penuh(kand):
        sys.exit("sidik kriteria/kandidat/kode/data berubah sejak `latih`: ditolak. Latih ulang dan kunci ulang sebelum membuka.")
    jejak = jejak_head()
    latih_ = [b for b in jejak if b.get("jenis") == "latih"]
    if not latih_ or latih_[-1].get("sidik") != kand["sidik"] or latih_[-1].get("sidik_kriteria") != kand["sidik_kriteria"]:
        sys.exit("baris `latih` terakhir di HEAD (model_kab_hulu.sidik) tidak sama dengan kandidat.json: ditolak")
    if any(b.get("jenis") == mode for b in jejak):
        sys.exit(f"jejak di HEAD sudah memuat baris `{mode}`: tidak bisa dijalankan lagi")
    if mode == "buka":
        ada = [b for b in jejak if b.get("jenis") == "sia" and b.get("sha256_sia") == sha_berkas_j(J("sia.json")) and b.get("sha256_label_A") == sha_berkas_j(J("label_A.json"))]
        if not ada:
            sys.exit("HEAD tidak memuat baris `sia` yang cocok dengan sia.json dan label_A.json sekarang (commit jejak sesudah sia): ditolak")
    cek_kelengkapan(kand, AKHIR_SIA if mode == "sia" else AKHIR_BUKA)
    tulis_mulai(mode, kand["sidik"])
    return kand


def hash_jendela(D, awal, akhir):
    """sha256 deret ERA5 dan CHIRPS per sel pada awal-31..akhir+2 (semua yang dipakai fitur hari-hari jendela)."""
    a, b = hari_ke(awal) - 31, hari_ke(akhir) + 3
    h = lambda x: hashlib.sha256(json.dumps(x).encode()).hexdigest()
    return {"era5": {kunci(*s): h([D["cuaca"][s][k][a:b] for k in ("p", "im", "sm")]) for s in sorted(D["cuaca"])},
            "chirps": {k: h(D["ch"][k][a:b]) for k in sorted(D["ch"])}}


def data_uji(kand, jendela, akhir, label):
    """Baris Uji (X sudah dengan 6 kolom CHIRPS/hulu) pada hari-hari dalam `jendela`; label dari baris beku `label`. -> (B, D)."""
    kabs, sel, sk = muat_sampel_h()
    assert kabs == kand["kab"] and [list(s) for s in sel] == kand["sel"], "sampel berubah"
    basin_kab = json.load(open(BASIN))["kab"]
    with tambal_ub(akhir=akhir):
        cuaca = cuaca_sampai(sel, akhir)
        ch, _ = muat_chirps(sel_dibutuhkan(), akhir)
        info = info_kab(sk, basin_kab, sel_valid(ch))
        assert sorted(set(kabs) - set(info)) == kand["kab_dibuang"], "kab yang dibuang berubah sejak latih"
        batas = batas_chirps(ch, MK.hari_tahun(MK.LATIH))
        B = MK.bangun(cuaca, sk, [k for k in kabs if k in info], ub.peristiwa(label), range(MK.UJI[0], akhir.year + 1), MK.persentil_batas(cuaca), kand["frek"], {})
        B, st = tambah_hulu(B, ch, batas, info)
    ada = [i for i, e in enumerate(B["e"]) if any(hari_ke(a) <= e <= hari_ke(b) for a, b in jendela)]
    D = {"cuaca": cuaca, "ch": ch, "pengecualian": st}
    return {k: [v[i] for i in ada] for k, v in B.items()}, D


def prediksi_uji(kand, B):
    """-> (P model gabungan, klimatologi terkalibrasi, P kontrol DIBI-saja)."""
    P = {n: prediksi_h(kand[n], B["X"]) for n in ("M0", "M2", "M3")}
    Pk = {n: prediksi_h(kand["kontrol"][n], B["X"]) for n in ("M0", "M2", "M3")}
    return P, p_klim_dari(B, kand["klim"], kand["platt_klim"]), Pk


def vonis_akhir(r, r_kontrol, mde80=None):
    """Vonis kontras (model gabungan) + kontrol DIBI-saja (§5): 'LULUS, PEKA LABEL' bila LULUS tetapi kontrol dETS Waspada titik <= 0 atau batas atas < 0
    (kontrol tidak pernah menyelamatkan TIDAK LULUS); '(daya rendah)' bila mde_80 > 0,02 dan vonis bukan TIDAK LULUS."""
    v = vonis_kontras(r)
    w = r_kontrol["waspada"]
    peka = v["vonis"] == "LULUS" and (w["nilai"] <= 0 or w["ci"][1] < 0)
    rendah = mde80 is not None and mde80 > 0.02 and v["vonis"] != "TIDAK LULUS"
    teks = v["vonis"] + (", PEKA LABEL" if peka else "") + (" (daya rendah)" if rendah else "")
    return {"vonis": teks, "vonis_gabungan": v["vonis"], "rincian": v["rincian"], "peka_label": peka, "daya_rendah": rendah, "mde_80": mde80,
            "kontrol_dets_waspada": {"nilai": w["nilai"], "ci": w["ci"]}}


def mde80_kontras(kand, kn):
    d = kand.get("mde")
    return d[kn]["waspada"]["mde_80"] if d and kn in d else None


def sia():
    kand = gerbang("sia")
    label = bekukan_label("A", JENDELA_A)
    B, D = data_uji(kand, [JENDELA_A], AKHIR_SIA, label)
    P, pk, Pk = prediksi_uji(kand, B)
    hasha = hash_jendela(D, *JENDELA_A)
    pen = rangkum_h(B, P, pk)
    kontrol = rangkum_h(B, Pk, pk, penuh=False)["kontras"]
    v = {kn: vonis_sia_kontras(r) for kn, r in pen["kontras"].items()}
    cetak(pen)
    print("SIA", v)
    json.dump({"tanggal": str(dt.date.today()), "sidik": kand["sidik"], "sha256_label": json.load(open(J("label_A.json")))["sha256"], "hash_jendela_A": hasha,
               "pengecualian": D["pengecualian"], "uji_A": pen, "kontrol_dibi_saja": kontrol, "vonis": v}, open(J("sia.json"), "w"), separators=(",", ":"))
    tambah_jejak({"jenis": "sia", "waktu": dt.datetime.now().isoformat(timespec="seconds"), "sha256_sia": sha_berkas_j(J("sia.json")), "sha256_label_A": sha_berkas_j(J("label_A.json"))})
    print("jejak model_kab_hulu.sidik ditambah baris `sia`: COMMIT berkas itu sebelum `buka`")


def buka():
    kand = gerbang("buka")
    sia_ = json.load(open(J("sia.json")))
    labA = bekukan_label("A", JENDELA_A)
    if hash_baris(labA) != sia_["sha256_label"]:
        sys.exit("label Uji A berubah sejak `sia`")
    labB = bekukan_label("B", JENDELA_B)
    B, D = data_uji(kand, [JENDELA_A, JENDELA_B], AKHIR_BUKA, labA + labB)
    if hash_jendela(D, *JENDELA_A) != sia_["hash_jendela_A"]:
        sys.exit("deret ERA5/CHIRPS jendela Uji A berubah sejak `sia`: ditolak")
    P, pk, Pk = prediksi_uji(kand, B)
    pen = rangkum_h(B, P, pk)
    kontrol = rangkum_h(B, Pk, pk, penuh=False)["kontras"]
    v = {kn: (vonis_akhir(pen["kontras"][kn], kontrol[kn], mde80_kontras(kand, kn)) if sia_["vonis"][kn]["vonis"] == "lanjut" else {"vonis": "tidak terbukti", "rincian": "dihentikan di Uji A"}) for kn in pen["kontras"]}
    cetak(pen)
    print("VONIS", {k: x["vonis"] for k, x in v.items()})
    json.dump({"tanggal": str(dt.date.today()), "sidik": kand["sidik"], "sha256_label": {"A": json.load(open(J("label_A.json")))["sha256"], "B": json.load(open(J("label_B.json")))["sha256"]},
               "pengecualian": D["pengecualian"], "uji_final": pen, "kontrol_dibi_saja": kontrol, "vonis": v}, open(J("buka.json"), "w"), separators=(",", ":"))
    tambah_jejak({"jenis": "buka", "waktu": dt.datetime.now().isoformat(timespec="seconds"), "sha256_buka": sha_berkas_j(J("buka.json")),
                  "sha256_label_A": sha_berkas_j(J("label_A.json")), "sha256_label_B": sha_berkas_j(J("label_B.json"))})


# ---------------------------------------------------------------- uji
def uji_basin():
    # 1. aturan basin pada pohon mainan. 1,2,3 -> 10 (lokal); 4 -> 1 (jarak 2); 9 ENDO>0 -> 10; 8 NEXT_DOWN=0; 5 -> 4 (jarak 3)
    A = lambda nd, km, e=0: (nd, km, e)
    attr = {10: A(99, 100), 1: A(10, 1000), 2: A(10, 2000), 3: A(10, 3000), 4: A(1, 4000), 5: A(4, 5000), 6: A(5, 9000),
            9: A(10, 1, 1), 8: A(0, 1), 99: A(0, 1)}   # 9: ENDO=1 tapi NEXT_DOWN=10 -> ikut jarak 1
    r = pilih_hulu(attr, {10})
    assert r == [(1, 1), (2, 1), (3, 1), (9, 1), (4, 2), (5, 3)], r   # 9 (ENDO=1) ikut; 8 (ND=0) tidak; 6 melewati 20.000
    # kumulatif 6001, 10001, 15001; tingkat 4 (+9000) = 24001 -> berhenti
    attr2 = {**attr, **{1: A(10, 6000), 2: A(10, 6000), 3: A(10, 6000)}}  # tingkat 1 = 18000 <= 20000; tingkat 2 (+4000) = 22000 -> berhenti
    assert pilih_hulu(attr2, {10}) == [(1, 1), (2, 1), (3, 1), (9, 1)]
    attr3 = {**attr, **{1: A(10, 21000), 2: A(10, 1)}}              # tingkat 1 sudah 21001 > 20000: hulu kosong, tanpa pemecahan seri
    assert pilih_hulu(attr3, {10}) == []
    attr4 = {1: A(2, 100), 2: A(3, 100), 3: A(0, 100)}                # lokal 3 = outlet: 2 jarak 1, 1 jarak 2
    assert pilih_hulu(attr4, {3}) == [(2, 1), (1, 2)]
    assert pilih_hulu({1: A(0, 5), 2: A(0, 5)}, {1}) == []            # tidak ada yang mengalir ke lokal
    # 2. klip: persegi 0,1 derajat di dalam sel penuh; cincin yang menyeberang sel
    sq = [(0.0, 0.0), (0.0, 0.5), (0.5, 0.5), (0.5, 0.0)]             # searah jarum jam
    ir = irisan_sel([sq])
    assert set(ir) == {(0, 0), (0, 1), (1, 0), (1, 1)} and abs(ir[(0, 0)] - ir[(0, 1)]) < 1e-9, ir
    esp = 0.25 * 0.25 * KM_LAT * KM_LON * math.cos(math.radians(0.125))
    assert abs(ir[(0, 0)] - esp) < 1e-6 * esp
    lubang = [(0.05, 0.05), (0.2, 0.05), (0.2, 0.2), (0.05, 0.2)]     # berlawanan arah = lubang
    assert irisan_sel([sq, lubang])[(0, 0)] < ir[(0, 0)] - 1
    tri = [(0.0, 0.0), (0.0, 0.25), (0.25, 0.0)]
    assert abs(irisan_sel([tri])[(0, 0)] - esp / 2) < 1e-6 * esp
    # 3. LZW + float32 putar balik, kolom/baris CHIRPS
    v = array("f", [0.0, 1.5, -9999.0, 123.25] * 50)
    a = array("f")
    a.frombytes(B.lzw(B.lzw_enkode(v.tobytes())))
    assert list(a) == list(v)
    assert baris_kolom(kunci(-6.125, 106.875)) == (224, 1147)   # Jakarta: (50+6,125)/0,25 = 224,5 -> 224; (180+106,875)/0,25 = 1147,5 -> 1147
    # 4. kisi p25 menyelaraskan tiap sel sampel: pusat piksel CHIRPS == sel sampel (x,125 / x,375)
    sam = json.load(open(SAMPEL_DEBIT)) if os.path.exists(SAMPEL_DEBIT) else None
    if sam:
        sel = json.load(open(KANDIDAT))["sel"]
        assert len(sel) == 104
        for lat, lon in sel:
            r, c = baris_kolom(kunci(lat, lon))
            assert abs((50 - (r + .5) * SEL) - lat) < 1e-9 and abs((-180 + (c + .5) * SEL) - lon) < 1e-9, (lat, lon)
            assert indeks(lat, lon) == (math.floor(lat / SEL), math.floor(lon / SEL))
            assert (indeks(lat, lon)[0] + .5) * SEL == lat
    print("uji basin/CHIRPS: OK")


# ---------------------------------------------------------------- swauji model (data mainan, tanpa jaringan)
def _tolak(f, frag):
    try:
        f()
    except SystemExit as e:
        assert frag in str(e), (frag, str(e))
        return
    raise AssertionError(f"harus ditolak: {frag}")


def _toy_B(n_per=60):
    Bs = {"kab": [], "tahun": [], "bulan": [], "e": [], "X": [], "y": [], "level": []}
    r = random.Random(3)
    for k in [f"{p}|k{i}" for p in (11, 32) for i in range(4)]:
        for t, m in ((2026, 1), (2026, 2), (2026, 11), (2027, 2), (2027, 3)):
            for d in range(n_per):
                Bs["kab"].append(k); Bs["tahun"].append(t); Bs["bulan"].append(m); Bs["e"].append((t - 2026) * 365 + m * 30 + d % 28)
                Bs["X"].append([]); Bs["y"].append(1 if r.random() < 0.06 else 0)
                Bs["level"].append(2 if r.random() < 0.08 else 1 if r.random() < 0.15 else 0)
    return Bs


def uji_model():
    import tempfile
    n = 60
    # 1. fitur CHIRPS dan hulu: jendela, persentil, sel nodata, bobot hulu
    z = lambda: [0.0] * n
    ch = {k: z() for k in ("l1", "l2", "h1", "h2")}
    ch["l1"][39:42] = [1.0, 2.0, 3.0]
    ch["l2"][39:42] = [0.5, 0.5, 0.5]
    ch["h1"], ch["h2"] = [10.0] * n, [20.0] * n
    batas = {"l1": [0, 1, 2, 3, 4], "l2": [0, 1, 2, 3, 4]}
    info = {"K": {"lokal": ["l1", "l2"], "hulu": [("h1", 1.0), ("h2", 3.0)], "hulu_ada": 1}, "N": {"lokal": ["l1"], "hulu": [], "hulu_ada": 0}}
    baris = lambda *kab: {"kab": list(kab), "tahun": [2020] * len(kab), "bulan": [1] * len(kab), "e": [40] * len(kab), "X": [[0.0] * N0 for _ in kab],
                          "y": [0] * len(kab), "level": [0] * len(kab)}
    B2, st = tambah_hulu(baris("K", "N", "X"), ch, batas, info)
    assert B2["kab"] == ["K", "N"] and st["kab_dibuang"] == 1 and st["keluar"] == 2 and len(B2["X"][0]) == len(FITUR)
    c1, c3, cp, hu1, hu3, ada = B2["X"][0][N0:]
    assert (c1, c3, cp, ada) == (2.0, 6.0, 1.0, 1.0) and abs(hu1 - 17.5) < 1e-12 and abs(hu3 - 52.5) < 1e-12, B2["X"][0][N0:]
    assert B2["X"][1][N0 + 3:] == [0.0, 0.0, 0.0]                     # tanpa hulu: hu* = 0, hulu_ada = 0
    cp_ = lambda c3_: max(bisect.bisect_left(batas["l1"], c3_) / 5, 0)
    assert cp_(0.0) == 0.0 and cp_(4.0) == 0.8 and cp_(6.0) == 1.0     # seri nol bisect_left
    ch["l1"][41] = None                                               # e+1 hilang di l1: l1 gugur, l2 yang dipakai
    B2, _ = tambah_hulu(baris("K"), ch, batas, info)
    assert B2["X"][0][N0:N0 + 2] == [0.5, 1.5]
    ch["l2"][40] = None                                               # semua sel lokal gugur: baris dibuang
    B2, st = tambah_hulu(baris("K"), ch, batas, info)
    assert B2["kab"] == [] and st["tanpa_chirps"] == 1
    ch["l1"][41], ch["l2"][40] = 3.0, 0.5
    ch["h1"][39] = 777.0                                              # hari e-1: TIDAK boleh mempengaruhi hu*
    B2, _ = tambah_hulu(baris("K"), ch, batas, info)
    assert abs(B2["X"][0][N0 + 3] - 17.5) < 1e-12 and abs(B2["X"][0][N0 + 4] - 52.5) < 1e-12
    ch["h1"][39] = 10.0
    ch["h1"][38] = 30.0                                               # hari e-2: hu1 dan hu3 berubah
    B2, _ = tambah_hulu(baris("K"), ch, batas, info)
    assert abs(B2["X"][0][N0 + 3] - 22.5) < 1e-12 and abs(B2["X"][0][N0 + 4] - 57.5) < 1e-12
    ch["h1"][35] = 999.0                                              # hari e-5: di luar jendela
    B2, _ = tambah_hulu(baris("K"), ch, batas, info)
    assert abs(B2["X"][0][N0 + 4] - 57.5) < 1e-12
    ch["h1"][35] = 10.0
    ch["h1"][38] = None                                               # h1 gugur di hu1 dan hu3: hanya h2 valid, bobot dinormalkan ulang
    B2, _ = tambah_hulu(baris("K"), ch, batas, info)
    assert abs(B2["X"][0][N0 + 3] - 20.0) < 1e-12 and abs(B2["X"][0][N0 + 4] - 60.0) < 1e-12
    ch["h2"][36] = None                                               # hu3 (e-4) tanpa sel valid: baris dibuang dari semua model
    B2, st = tambah_hulu(baris("K"), ch, batas, info)
    assert B2["kab"] == [] and st["tanpa_hulu"] == 1
    sk_ = {"K": {(0.125, 0.125): [0, 0]}}
    assert info_kab(sk_, {"K": {"sel_hulu": [["9.000_9.000", 5.0]], "hulu_ada": 1}}, {kunci(0.125, 0.125)})["K"]["hulu_ada"] == 0   # semua sel hulu nodata -> hulu_ada 0
    assert info_kab(sk_, {"K": {"sel_hulu": [["9.000_9.000", 5.0]], "hulu_ada": 1}}, {kunci(0.125, 0.125), "9.000_9.000"})["K"]["hulu_ada"] == 1
    assert sel_valid({"a": [None, None], "b": [None, 1.0]}) == {"b"}
    assert c3_sel([1, 2, 3, 4], 2) == (3, 9) and c3_sel([1, None, 3, 4], 2) is None and c3_sel([1, 2, None, 4], 2) is None
    assert FITUR[-6:] == CH + HU and len(AKTIF["M0"]) == 10 and len(AKTIF["M2"]) == 13 and len(AKTIF["M3"]) == 16 and "a7" not in [FITUR[i] for i in AKTIF["M0"]]
    # 2. label latih: DIBI ATAU logbook pada hari tercakup, rentang 2016-2023, DIBI tidak diubah
    d0 = hari_ke(dt.date(2016, 3, 1))
    ev = {"banjir": {"K": {d0}}, "longsor": {}}
    lb = [{"lb_mulai": "1", "tanggal": t, "kab_kunci": k} for t, k in (("2016-03-01", "K"), ("2016-03-05", "K"), ("2016-03-06", "K"), ("2024-01-01", "K"), ("2016-03-07", "Z"),
                                                                          ("2015-12-30", "K"), ("2016-03-08", "K"))]
    lb.append({"lb_mulai": "0", "tanggal": "2016-03-09", "kab_kunci": "K"})
    ev2, tambah = label_latih(ev, {"K"}, lb, {"2016-03-01", "2016-03-05", "2024-01-01", "2016-03-07", "2015-12-30", "2016-03-09"})
    assert tambah == [("K", "2016-03-05")], tambah                     # 03-01 sudah DIBI, 03-06 dan 03-08 tak tercakup, 2024 dan 2015 di luar rentang, Z bukan sampel, lb_mulai 0
    assert ev2["banjir"]["K"] == {d0, hari_ke(dt.date(2016, 3, 5))} and ev["banjir"]["K"] == {d0}
    # 3. model: kelompok, M2 > M0 bila sinyal di c3, lima biji, regresi logistik, JSON bolak-balik
    r = random.Random(7)
    Xs, ys, th = [], [], []
    for i in range(1500):
        x = [r.random() for _ in FITUR]
        Xs.append(x); ys.append(1 if r.random() < 0.03 + 0.4 * (x[FITUR.index("c3")] > 0.8) else 0); th.append(2024 + i % 2)
    TR_, VA_ = {"X": Xs[:1000], "y": ys[:1000]}, {"X": Xs[1000:], "y": ys[1000:], "tahun": th[1000:]}
    jenis, mod, ll, lls = cocok_semua(TR_, VA_, grid=[(2, 0.1)], pohon_maks=20)
    assert jenis in ("gbdt", "lr") and set(ll) == {"gbdt", "lr"} and lls["M2"] < lls["M0"], (ll, lls)   # sinyal hanya di c3
    p2 = prediksi_h(mod["M2"], VA_["X"])
    assert len(p2) == 500 and abs(sum(p2) / 500 - sum(VA_["y"]) / 500) < 0.03
    if jenis == "gbdt":
        assert len(mod["M2"]["anggota"]) == len(BIJI_MODEL) == 5
    assert json.loads(json.dumps(mod["M2"])) == mod["M2"]
    ml, lll = latih_lr_h(TR_, VA_, AKTIF["M3"])
    pl_ = prediksi_h(ml, VA_["X"])
    assert ml["jenis"] == "lr" and abs(sum(pl_) / 500 - sum(VA_["y"]) / 500) < 0.03 and json.loads(json.dumps(ml)) == ml
    kon = latih_ulang_hiper(TR_, VA_, jenis, mod)
    assert set(kon) == {"M0", "M2", "M3"}
    zz = [0.0] * 500                                                  # skor konstan: Platt lintas tahun tetap terdefinisi
    assert ll_silang([x for x in zz], VA_) > 0
    # 4. penilaian: blok identik, dua skema, selang 98,33%, vonis
    Bs = _toy_B()
    bl1, bl2 = blok_h(Bs, "kab_musim"), blok_h(Bs, "pulau_minggu")
    assert musim_tahun(1, 2026) != musim_tahun(1, 2027) and musim_tahun(10, 2026) == musim_tahun(1, 2027) == (2027, "hujan") and musim_tahun(5, 2026) == (2026, "kering")
    assert len(bl1) == 16 and all(k[0] in ("Sumatra", "Jawa") for k in bl2)
    sempurna = [0.9 if v else 0.03 for v in Bs["y"]]
    klimk = [sum(Bs["y"]) / len(Bs["y"])] * len(Bs["y"])
    pen = rangkum_h(Bs, {"M0": klimk, "M2": sempurna, "M3": sempurna}, klimk, ulang=200)
    a, b = pen["kontras"]["M2-M0"], pen["kontras"]["M3-M2"]
    assert a["waspada"]["ci"][0] > 0 and a["siaga"]["nilai"] > 0 and a["bss"]["ci"][0] > 0 and vonis_kontras(a)["vonis"] == "LULUS" and vonis_sia_kontras(a)["vonis"] == "lanjut"
    assert b["waspada"]["nilai"] == 0 and b["waspada"]["ci"] == [0.0, 0.0] and vonis_kontras(b)["vonis"] == "TIDAK LULUS" and vonis_sia_kontras(b)["vonis"] == "tidak terbukti"
    assert a["waspada"]["kab_musim"]["blok"] == 16 and a["waspada"]["pulau_minggu"]["blok"] == len(bl2) and a["waspada"]["alarm"] == n_alarm(Bs)["waspada"]
    assert a["waspada"]["ci"] == [min(a["waspada"][s]["ci"][0] for s in SKEMA), max(a["waspada"][s]["ci"][1] for s in SKEMA)]
    pen2 = rangkum_h(Bs, {"M0": sempurna, "M2": klimk, "M3": klimk}, klimk, ulang=100)["kontras"]["M2-M0"]
    assert vonis_kontras(pen2)["vonis"] == "TIDAK LULUS" and pen2["bss"]["nilai"] < 0
    assert "ets_waspada" in pen and set(pen["per_pulau"]["M2-M0"]) == {"Sumatra", "Jawa"} and pen["ets_waspada"]["aturan"] <= 1
    rua = lambda wi, ws, bi: {"waspada": {"nilai": wi[0], "ci": list(wi[1:])}, "siaga": {"nilai": ws[0], "ci": list(ws[1:])}, "bss": {"nilai": 0, "ci": bi}}
    assert vonis_kontras(rua((.02, .01, .03), (.03, .01, .05), [.001, .01]))["vonis"] == "LULUS"
    assert vonis_kontras(rua((.02, .01, .03), (.03, -.01, .05), [.001, .01]))["vonis"] == "TIDAK MEYAKINKAN"
    assert vonis_kontras(rua((.02, .01, .03), (.03, .01, .05), [-.001, .01]))["vonis"] == "TIDAK MEYAKINKAN"
    assert vonis_kontras(rua((.02, -.02, -.01), (.03, .01, .05), [.001, .01]))["vonis"] == "TIDAK LULUS"
    assert vonis_kontras(rua((-.001, -.02, .03), (.03, .01, .05), [.001, .01]))["vonis"] == "TIDAK LULUS"
    kontrol_ok = rangkum_h(Bs, {"M0": klimk, "M2": sempurna, "M3": sempurna}, klimk, ulang=100, penuh=False)["kontras"]["M2-M0"]
    kontrol_buruk = rangkum_h(Bs, {"M0": sempurna, "M2": klimk, "M3": klimk}, klimk, ulang=100, penuh=False)["kontras"]["M2-M0"]
    assert vonis_akhir(a, kontrol_ok, 0.01)["vonis"] == "LULUS"
    assert vonis_akhir(a, kontrol_buruk, 0.01)["vonis"] == "LULUS, PEKA LABEL" and vonis_akhir(a, kontrol_buruk, 0.01)["peka_label"]
    assert vonis_akhir(a, kontrol_ok, 0.05)["vonis"] == "LULUS (daya rendah)" and vonis_akhir(a, kontrol_buruk, 0.05)["vonis"] == "LULUS, PEKA LABEL (daya rendah)"
    assert vonis_akhir(pen2, kontrol_ok, 0.05)["vonis"] == "TIDAK LULUS"                       # TIDAK LULUS tanpa keterangan daya
    assert vonis_akhir(rua((.02, -.02, -.01), (.03, .01, .05), [.001, .01]), kontrol_ok, 0.05)["vonis"] == "TIDAK LULUS"
    assert vonis_akhir(rua((.02, .01, .03), (.03, -.01, .05), [.001, .01]), kontrol_buruk, 0.05)["vonis"] == "TIDAK MEYAKINKAN (daya rendah)"   # kontrol tidak mengubah selain LULUS
    assert vonis_akhir(a, kontrol_buruk, None)["vonis"] == "LULUS, PEKA LABEL"
    # indeks persentil: 0,83% dan 99,17% dari 5000 ulangan
    assert int(Q_LO * (ULANG - 1)) == 41 and int(Q_HI * (ULANG - 1)) == 4957 and abs(2 * (1 - 0.9917) - 0.0166) < 1e-9
    dm = mde_h(Bs, {"M0": klimk, "M2": sempurna, "M3": sempurna}, target=30, ulang=30, ulangan=4)
    assert dm["M2-M0"]["waspada"]["mde_80"] > dm["M2-M0"]["waspada"]["mde_50"] > 0 and abs(dm["z"] - 2.394) < 0.01
    # 5. kelengkapan manifest: hari hilang tanpa cache menunda; 2025-05 diterima hilang
    global KELUAR, CHIRPS_DIR, SAMPEL, BASIN, SIDIK_JEJAK, JEJAK_REPO, DIBI_TGL, SIA_DARI, BUKA_DARI, data_uji, prediksi_uji, hash_jendela, sidik_penuh, cek_kelengkapan
    simpan_ = (KELUAR, CHIRPS_DIR, SAMPEL, BASIN, SIDIK_JEJAK, JEJAK_REPO, DIBI_TGL, SIA_DARI, BUKA_DARI, data_uji, prediksi_uji, hash_jendela, sidik_penuh, cek_kelengkapan)
    with tempfile.TemporaryDirectory() as tmp:
        KELUAR, CHIRPS_DIR = tmp, os.path.join(tmp, "chirps")
        try:
            akhir, d = dt.date(2026, 1, 3), AWAL
            while d <= akhir:
                if not hari_diterima_hilang(d):
                    os.makedirs(os.path.dirname(jalur_hari(d)), exist_ok=True)
                    open(jalur_hari(d), "w").write(d.isoformat())
                d += dt.timedelta(1)
            assert hari_kurang(akhir) == [] and manifest_chirps(akhir)["hilang"][0] == "2025-05-01"
            os.remove(jalur_hari(dt.date(2020, 2, 29)))
            assert hari_kurang(akhir) == [dt.date(2020, 2, 29)]
            m1 = manifest_chirps(akhir)
            assert m1["hilang"].count("2020-02-29") == 1 and len(m1["ada"]) == (akhir - AWAL).days + 1 - len(m1["hilang"])
            assert manifest_chirps(dt.date(2019, 12, 31)) == manifest_chirps(dt.date(2019, 12, 31))
            open(jalur_hari(dt.date(2020, 2, 29)), "w").write("x")
            assert hari_kurang(akhir) == [] and manifest_chirps(akhir) != m1
            # 6. gerbang, sia dan buka pada data mainan (jejak git, label beku, sekali jalan)
            os.makedirs(os.path.join(tmp, "repo"))
            repo = os.path.join(tmp, "repo")
            git = lambda *a: subprocess.run(["git", "-C", repo, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", *a], capture_output=True, check=True)
            git("init", "-q")
            open(os.path.join(repo, "x.txt"), "w").write("x"); git("add", "x.txt"); git("commit", "-q", "-m", "awal")
            SIDIK_JEJAK, JEJAK_REPO = os.path.join(repo, "model_kab_hulu.sidik"), repo
            sidik_penuh, cek_kelengkapan = (lambda k: "x"), (lambda k, a: None)
            DIBI_TGL = os.path.join(tmp, "dibi.json")
            json.dump([[["banjir"], "11", "k0", "2026-02-01", 1], [["banjir"], "11", "k0", "2026-12-01", 1], [["banjir"], "11", "k0", "2025-01-01", 1]], open(DIBI_TGL, "w"))
            for mode in ("sia", "buka"):
                _tolak(lambda: gerbang(mode, dt.date(2027, 1, 1)), "baru boleh")
            _tolak(lambda: gerbang("sia", dt.date(2027, 2, 15)), "kandidat.json belum ada")
            kd = {"dibuat": "t", "sidik": "x", "sidik_kriteria": sidik_kriteria()}
            json.dump(kd, open(J("kandidat.json"), "w"))
            _tolak(lambda: gerbang("buka", dt.date(2027, 9, 15)), "sia")
            json.dump({"vonis": {"M2-M0": {"vonis": "tidak terbukti"}, "M3-M2": {"vonis": "tidak terbukti"}}, "sidik": "x"}, open(J("sia.json"), "w"))
            _tolak(lambda: gerbang("buka", dt.date(2027, 9, 15)), "menghentikan semua")
            os.remove(J("sia.json"))
            tolak = lambda frag, mode="sia", hari=dt.date(2027, 2, 15): _tolak(lambda: gerbang(mode, hari), frag)
            tolak("tidak terlacak")
            assert not os.path.exists(J("sia.mulai"))                  # ditolak tidak menghabiskan jatah
            tambah_jejak({"jenis": "latih", "sidik": "lain", "sidik_kriteria": kd["sidik_kriteria"]}); git("add", "model_kab_hulu.sidik"); git("commit", "-q", "-m", "l1")
            tolak("baris `latih` terakhir")
            tambah_jejak({"jenis": "latih", "sidik": "x", "sidik_kriteria": kd["sidik_kriteria"]})
            tolak("beda dari HEAD")
            git("add", "model_kab_hulu.sidik"); git("commit", "-q", "-m", "l2")
            sempurna2 = [0.9 if v else 0.03 for v in Bs["y"]]
            data_uji = lambda kand, jendela, akhir, label: (Bs, {"cuaca": {}, "ch": {}, "pengecualian": {}})
            prediksi_uji = lambda kand, B: ({"M0": klimk, "M2": sempurna2, "M3": sempurna2}, klimk, {"M0": klimk, "M2": sempurna2, "M3": sempurna2})
            hash_jendela = lambda D, a, b: {"x": 1}
            import io, contextlib as cl
            SIA_DARI, BUKA_DARI = dt.date(2020, 1, 1), dt.date(2020, 1, 1)
            with cl.redirect_stdout(io.StringIO()):
                sia()
            s = json.load(open(J("sia.json")))
            assert s["vonis"]["M2-M0"]["vonis"] == "lanjut" and s["vonis"]["M3-M2"]["vonis"] == "tidak terbukti" and os.path.exists(J("label_A.json"))
            assert json.load(open(J("label_A.json")))["n"] == 1 and "2026-12-01" not in open(J("label_A.json")).read()
            tolak("sudah dimulai")                                     # sia kedua kali
            tolak("beda dari HEAD", "buka", dt.date(2027, 9, 15))      # jejak sia belum di-commit
            git("add", "model_kab_hulu.sidik"); git("commit", "-q", "-m", "sia")
            with cl.redirect_stdout(io.StringIO()):
                buka()
            v = json.load(open(J("buka.json")))["vonis"]
            assert v["M2-M0"]["vonis"] == "LULUS" and v["M3-M2"]["vonis"] == "tidak terbukti" and os.path.exists(J("label_B.json"))
            assert json.load(open(J("label_B.json")))["n"] == 1
            tolak("sudah dimulai", "buka", dt.date(2027, 9, 15))
            _tolak(lambda: latih(), "sia/buka sudah dimulai")
        finally:
            (KELUAR, CHIRPS_DIR, SAMPEL, BASIN, SIDIK_JEJAK, JEJAK_REPO, DIBI_TGL, SIA_DARI, BUKA_DARI, data_uji, prediksi_uji, hash_jendela, sidik_penuh, cek_kelengkapan) = simpan_
    print("uji model: OK")


def uji():
    uji_basin()
    uji_model()


if __name__ == "__main__":
    m = sys.argv[1] if len(sys.argv) > 1 else ""
    if m == "uji":
        uji()
    elif m in ("latih", "sia", "buka"):
        {"latih": lambda: latih("--ulang" in sys.argv), "sia": sia, "buka": buka}[m]()
    elif m == "basin":
        basin()
    elif m == "ambil":
        tgl = lambda s: dt.date.fromisoformat(s)
        ambil(*(tgl(x) for x in sys.argv[2:4]))
    else:
        sys.exit(__doc__)
