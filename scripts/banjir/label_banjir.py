"""Tabel LABEL banjir 20 tahun (intensitas + dampak) dari empat sumber -> data/raw/banjir/label20/label.json

Sumber (satu baris per (kab_kode, kejadian), tanggal mulai/selesai):
  dibi      DIBI BNPB lewat superset() milik kejadian.py, banjir + bandang + banjir-longsor, per kab-hari DENGAN dampak.
  logbook   public/data/logbook_kejadian.json (2026): tinggi air cm, durasi, kk, rumah, kec.
  gs        Google Groundsource (Zenodo 10.5281/zenodo.18647053, CC BY 4.0): kejadian banjir dari berita, 2000-kini,
            diekstrak Gemini, ~82% presisi. Sumber berita UTAMA. Parquet ~667 MB TIDAK di-commit.
  berita    GDELT DOC 2.0 + Google News RSS, hanya suplemen 2026 dan angka kedalaman/KK/rumah di teks.
Kecocokan: kab sama dan jarak tanggal <= 2 hari = satu kejadian (rantai, maks 30 hari per gugus).

Pakai (python3, stdlib):
  python3 scripts/banjir/label_banjir.py ambil        # DIBI + GDELT + Google News (cache, bisa dilanjut)
  <python-dgn-pyarrow> scripts/banjir/label_banjir.py gs   # parquet Groundsource -> gs_idn.json (butuh pyarrow)
  python3 scripts/banjir/label_banjir.py susun        # -> label.json + ringkasan di RISET-LABEL-BANJIR.md
  python3 scripts/banjir/label_banjir.py uji          # swauji offline
"""
import datetime as dt, glob, hashlib, importlib.util, json, os, re, sys, time, urllib.parse, urllib.request
from collections import Counter, defaultdict

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DIR = os.path.join(AKAR, "data/raw/banjir/label20")
CACHE = os.path.join(DIR, "cache")
JENDELA = 2          # hari: selisih tanggal <= ini = kejadian sama
MAKS_GUGUS = 30      # hari: gugus berantai tidak boleh lebih panjang dari ini
MULAI_TAHUN = 2000
DIBI_JENIS = {"Banjir", "Banjir Bandang", "Banjir dan Tanah Longsor", "Banjir Genangan"}
DAMPAK = {"meninggal": "meninggal", "hilang": "hilang", "terdampak": "menderita", "mengungsi": "mengungsi",
          "rr_berat": "rumah_rusak_berat", "rr_sedang": "rumah_rusak_sedang", "rr_ringan": "rumah_rusak_ringan", "terendam": "rumah_terendam"}


def muat(rel, nama):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    sys.modules[nama] = m
    s.loader.exec_module(m)
    return m


def tulis(jalur, isi):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    json.dump(isi, open(jalur + ".tmp", "w"), ensure_ascii=False, separators=(",", ":"))
    os.replace(jalur + ".tmp", jalur)


def baca(jalur, bawaan=None):
    return json.load(open(jalur)) if os.path.exists(jalur) else bawaan


# ---------------------------------------------------------------- kode kab, tanggal, angka
def kode_kab(v):
    """3402 / '3402' / '34.02' / '34|02' / 3402.0 -> '34.02'; selain itu None."""
    s = re.sub(r"\D", "", str(v).split(".")[0] if re.fullmatch(r"\d+\.0", str(v)) else str(v))
    return f"{s[:2]}.{s[2:]}" if len(s) == 4 else None


def tgl(s):
    return dt.date.fromisoformat(str(s)[:10])


def angka_id(s):
    """'1,5' -> 1.5; '1.500' -> 1500 (titik ribuan); '2.5' -> 2.5."""
    s = s.strip()
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", s):
        return float(s.replace(".", ""))
    return float(s.replace(",", "."))


KUNCI_DALAM = r"(?:setinggi|ketinggian(?:\s+air)?|tinggi\s+(?:air|genangan|muka\s+air)|kedalaman|sedalam|mencapai|hingga)"
NUM = r"\d+(?:[.,]\d+)*"
UNIT = r"(cm|centimeter|sentimeter|meter|mtr|m)\b"
RE_DALAM = re.compile(rf"(?:{KUNCI_DALAM}[^\d]{{0,25}})?({NUM})(?:\s*(?:-|–|sampai|hingga|s\.?d\.?)\s*({NUM}))?\s*{UNIT}", re.I)
RE_KK = re.compile(rf"({NUM})\s*(?:kepala keluarga|kk)\b", re.I)
RE_RUMAH = re.compile(rf"({NUM})\s*(?:unit\s+)?(?:rumah|rmh)\b", re.I)
RE_JIWA = re.compile(rf"({NUM})\s*jiwa\b", re.I)


def kedalaman_cm(teks):
    """Teks -> (lo, hi) cm atau None. 'cm' diterima tanpa kata kunci; meter/m wajib didahului kata kunci kedalaman
    (jarak '100 meter dari sungai' bukan kedalaman). Rentang '50-100 cm' -> (50,100); '1,5 meter' -> (150,150)."""
    hasil = []
    for m in RE_DALAM.finditer(teks):
        kunci = m.group(0)[: m.start(1) - m.start(0)].strip()
        satuan = m.group(3).lower()
        meter = satuan in ("meter", "mtr", "m")
        if meter and not kunci:
            continue
        try:
            lo = angka_id(m.group(1))
            hi = angka_id(m.group(2)) if m.group(2) else lo
        except ValueError:
            continue
        if m.group(2) and hi < lo and meter is False and hi < 10 <= lo:  # '50-100' tak pernah terbalik; abaikan sisanya
            continue
        f = 100 if meter else 1
        lo, hi = round(lo * f), round(hi * f)
        if 1 <= lo <= hi <= 1000:
            hasil.append((lo, hi))
    return (min(a for a, _ in hasil), max(b for _, b in hasil)) if hasil else None


def angka_maks(rx, teks):
    v = []
    for m in rx.finditer(teks):
        try:
            v.append(int(angka_id(m.group(1))))
        except ValueError:
            pass
    return max(v) if v else None


# ---------------------------------------------------------------- pencocokan kejadian
def gugus(rek):
    """rek: [{kab,d0,d1,src,...}] -> [[rek,...]] per kab. Rekaman bergabung bila d0 <= akhir gugus + JENDELA dan
    gugus tidak melebihi MAKS_GUGUS hari sejak awalnya."""
    per = defaultdict(list)
    for r in rek:
        per[r["kab"]].append(r)
    out = []
    for kab, rs in per.items():
        rs.sort(key=lambda r: (r["d0"], r["d1"]))
        cur, a0, a1 = None, None, None
        for r in rs:
            if cur is not None and (r["d0"] - a1).days <= JENDELA and (r["d0"] - a0).days <= MAKS_GUGUS:
                cur.append(r)
                a1 = max(a1, r["d1"])
            else:
                if cur:
                    out.append(cur)
                cur, a0, a1 = [r], r["d0"], r["d1"]
        out.append(cur)
    return out


# ---------------------------------------------------------------- ambil
def ambil_dibi():
    K = muat("scripts/banjir/kejadian.py", "banjir_kejadian")
    out, cache = [], os.path.join(DIR, "dibi.json")
    kol = ["dt", "tahun", "provinsi", "kabupaten", "id_kab_bps", "jenis_bencana"]
    met = [("jumlah_kejadian", "SUM(jumlah_kejadian)")] + [(c, f"SUM({c})") for c in DAMPAK.values()]
    nama = [r["jenis_bencana"] for r in K.superset(["jenis_bencana"], [("n", "COUNT(*)")], [], 1000)]
    pilih = [n for n in nama if str(n).strip() in DIBI_JENIS]
    for y in range(MULAI_TAHUN, dt.date.today().year + 1):
        b = K.superset(kol, met, [{"col": "tahun", "op": "IN", "val": [y]}, {"col": "jenis_bencana", "op": "IN", "val": pilih}], 50000)
        if len(b) >= 50000:
            raise RuntimeError(f"DIBI {y}: batas 50.000 baris tercapai")
        out += b
        print("dibi", y, len(b))
        time.sleep(1)
    tulis(cache, out)


def ambil_url(url, nama, jeda=1.5, coba=4):
    """GET dengan cache berkas; sopan (jeda); galat 429/5xx diulang."""
    f = os.path.join(CACHE, nama)
    if os.path.exists(f):
        return open(f, "rb").read()
    for i in range(coba):
        try:
            time.sleep(jeda)
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "poskobanjir-label/1.0"}), timeout=60) as r:
                b = r.read()
            os.makedirs(CACHE, exist_ok=True)
            open(f, "wb").write(b)
            return b
        except Exception as e:
            print("  ulang", i, str(e)[:80], file=sys.stderr)
            if i < coba - 1:
                time.sleep(20 * (i + 1))
    return b""


def ambil_berita():
    """Suplemen 2026: GDELT jendela 3 hari + Google News RSS per kabupaten prioritas."""
    B = muat("scripts/umum/berita.py", "umum_berita")
    awal, akhir = dt.date(2026, 1, 1), dt.date.today()
    d, gagal = awal, 0
    while d <= akhir:
        e = min(d + dt.timedelta(days=3), akhir + dt.timedelta(days=1))
        q = urllib.parse.urlencode({"query": "banjir sourcecountry:indonesia", "mode": "artlist", "maxrecords": 250, "format": "json",
                                    "startdatetime": d.strftime("%Y%m%d") + "000000", "enddatetime": e.strftime("%Y%m%d") + "000000"})
        if not ambil_url("https://api.gdeltproject.org/api/v2/doc/doc?" + q, f"gdelt_{d}.json", jeda=6, coba=2):
            gagal += 1
            if gagal >= 2:  # ponytail: GDELT memblokir IP (429) -> lewati; suplemen saja, Groundsource sumber utama
                print("GDELT diblokir 429, dilewati")
                break
        d = e
    for kab in kab_prioritas():
        q = f'banjir "{kab}" after:2026-01-01 before:{akhir + dt.timedelta(days=1)}'
        ambil_url(B.rss(q), "rss_" + hashlib.sha1(kab.encode()).hexdigest()[:10] + ".xml", jeda=1.5)
    print("berita: selesai, cache", len(glob.glob(os.path.join(CACHE, "*"))))


def kab_prioritas(n_dibi=60):
    nama = {}
    for x in baca(os.path.join(AKAR, "public/data/logbook_kejadian.json"), {"kejadian": []})["kejadian"]:
        if x["jenis"].startswith("banjir") and x.get("kab"):
            nama[x["kab"]] = nama.get(x["kab"], 0) + 1000
    for r in baca(os.path.join(DIR, "dibi.json"), []):
        n = re.sub(r"^\s*(Kab\.?|Kabupaten)\s+", "", str(r.get("kabupaten") or "").strip(), flags=re.I)
        nama[n] = nama.get(n, 0) + (r.get("jumlah_kejadian") or 0)
    top = sorted(nama, key=lambda k: -nama[k])
    lb = [k for k in top if nama[k] >= 1000]
    sisa = [k for k in top if nama[k] < 1000][:n_dibi]
    return [re.sub(r"^\s*(Kab\.?|Kabupaten)\s+", "", k, flags=re.I) for k in lb + sisa]


# ---------------------------------------------------------------- baca per sumber -> rekaman
def rek_dibi():
    out = []
    for r in baca(os.path.join(DIR, "dibi.json"), []):
        k = kode_kab(r.get("id_kab_bps"))
        if not k or not r.get("dt"):
            continue
        d = dt.datetime.fromtimestamp(r["dt"] / 1000, dt.timezone(dt.timedelta(hours=7))).date()
        f = {a: int(round(float(r[c]))) for a, c in DAMPAK.items() if r.get(c)}
        out.append({"kab": k, "nama": str(r.get("kabupaten") or "").strip(), "prov": str(r.get("provinsi") or "").strip(),
                    "d0": d, "d1": d, "src": "dibi", "f": f, "jenis": str(r["jenis_bencana"]).strip()})
    return out


def rek_logbook():
    out = []
    for x in baca(os.path.join(AKAR, "public/data/logbook_kejadian.json"), {"kejadian": []})["kejadian"]:
        if not x["jenis"].startswith("banjir") or not x.get("kab_kode"):
            continue
        d0 = x.get("mulai") or (x.get("terlihat") or [None])[0]
        if not d0:
            continue
        d1 = x.get("surut") or (x.get("terlihat") or [d0, d0])[-1]
        f = {k: x[k] for k in ("kk", "rumah", "jiwa", "durasi_hari", "meninggal", "mengungsi", "hilang") if x.get(k)}
        if x.get("tma_cm"):
            f["tma_cm"] = list(x["tma_cm"])
        out.append({"kab": x["kab_kode"], "nama": x["kab"], "prov": x["prov"], "d0": tgl(d0), "d1": max(tgl(d0), tgl(d1)), "src": "logbook",
                    "f": f, "jenis": x["jenis"]})
    return out


def rek_gs():
    return [{"kab": r[0], "nama": "", "prov": "", "d0": tgl(r[1]), "d1": max(tgl(r[1]), tgl(r[2])), "src": "gs", "f": {}, "jenis": "gs"}
            for r in baca(os.path.join(DIR, "gs_kab.json"), [])]


JUDUL_BANJIR = re.compile(r"banjir|bandang|genang|terendam|rendam", re.I)


def rek_berita():
    """Artikel GDELT + RSS -> rekaman bila judul menyebut banjir dan Geo menemukan tepat satu kabupaten."""
    B = muat("scripts/umum/berita.py", "umum_berita")
    W = muat("scripts/banjir/wilayah.py", "banjir_wilayah")
    kab_kode = peta_kode_kab()
    G = B.Geo(W.PROVINSI)
    arts = []
    for f in glob.glob(os.path.join(CACHE, "gdelt_*.json")):
        try:
            for a in json.loads(open(f, "rb").read() or b"{}").get("articles", []):
                s = a.get("seendate", "")
                arts.append((f"{s[:4]}-{s[4:6]}-{s[6:8]}", a.get("title", ""), "", a.get("domain", ""), "gdelt"))
        except ValueError:
            pass
    for f in glob.glob(os.path.join(CACHE, "rss_*.xml")):
        try:
            for a in B.urai(open(f, "rb").read()):
                arts.append((a["tgl"][:10], a["judul"], a["ringkas"], a["sumber"], "rss"))
        except Exception:
            pass
    out, seen = [], set()
    for d, judul, ring, sumber, via in arts:
        if not JUDUL_BANJIR.search(judul) or (judul, d) in seen:
            continue
        seen.add((judul, d))
        kabs = G.cari(judul + " " + ring)["kab"]
        kodes = {kab_kode.get(k) for k in kabs} - {None}
        if len(kodes) != 1:
            continue
        teks = judul + ". " + ring
        f = {}
        dlm = kedalaman_cm(teks)
        if dlm:
            f["tma_cm"] = list(dlm)
        for kunci, rx in (("kk", RE_KK), ("rumah", RE_RUMAH), ("jiwa", RE_JIWA)):
            v = angka_maks(rx, teks)
            if v:
                f[kunci] = v
        out.append({"kab": kodes.pop(), "nama": "", "prov": "", "d0": tgl(d), "d1": tgl(d), "src": "berita", "f": f, "jenis": via})
    return out


def peta_kode_kab():
    """'PP|Nama kab di peta' (kunci Geo/geo kabupaten) -> 'PP.KK', dari nama di DIBI + logbook."""
    K = muat("scripts/banjir/kejadian.py", "banjir_kejadian")
    c = defaultdict(Counter)
    for r in rek_dibi() + rek_logbook():
        if r["nama"]:
            c[(r["kab"][:2], K.kunci_nama(r["nama"]))][r["kab"]] += 1
    W = muat("scripts/banjir/wilayah.py", "banjir_wilayah")
    out = {}
    for p in W.PROVINSI:
        fn = os.path.join(AKAR, "public/geo/kabupaten", f"{p}.json")
        if os.path.exists(fn):
            for f in json.load(open(fn))["features"]:
                n = f["properties"]["kab"]
                k = c.get((p, K.kunci_nama(n)))
                if k:
                    out[f"{p}|{n}"] = k.most_common(1)[0][0]
    return out


# ---------------------------------------------------------------- Groundsource -> kab
def titik_dalam(x, y, ring):
    ke = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi, xj, yj = ring[i][0], ring[i][1], ring[j][0], ring[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            ke = not ke
        j = i
    return ke


def pasang_gs():
    """gs_idn.json [[lon,lat,mulai,selesai],...] -> gs_kab.json [[kab_kode,mulai,selesai],...] (titik-dalam-poligon; di luar = titik terdekat <= 0,1 derajat)."""
    kk = peta_kode_kab()
    W = muat("scripts/banjir/wilayah.py", "banjir_wilayah")
    polis = []
    for p in W.PROVINSI:
        fn = os.path.join(AKAR, "public/geo/kabupaten", f"{p}.json")
        if not os.path.exists(fn):
            continue
        for f in json.load(open(fn))["features"]:
            kode = kk.get(f"{p}|{f['properties']['kab']}")
            g = f["geometry"]
            for poli in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]):
                xs, ys = [q[0] for q in poli[0]], [q[1] for q in poli[0]]
                polis.append((min(xs), min(ys), max(xs), max(ys), poli[0], kode, f"{p}|{f['properties']['kab']}"))
    cache, out, luar, tanpa_kode = {}, [], 0, Counter()
    for lon, lat, d0, d1 in baca(os.path.join(DIR, "gs_idn.json"), []):
        kunci = (round(lon, 3), round(lat, 3))
        if kunci not in cache:
            hit = next((p for p in polis if p[0] <= lon <= p[2] and p[1] <= lat <= p[3] and titik_dalam(lon, lat, p[4])), None)
            if hit is None:
                best = min(polis, key=lambda p: min((q[0] - lon) ** 2 + (q[1] - lat) ** 2 for q in p[4][::max(1, len(p[4]) // 40)]))
                if min((q[0] - lon) ** 2 + (q[1] - lat) ** 2 for q in best[4]) <= 0.01:
                    hit = best
            cache[kunci] = hit
        h = cache[kunci]
        if h is None:
            luar += 1
        elif h[5] is None:
            tanpa_kode[h[6]] += 1
        else:
            out.append([h[5], d0, d1])
    tulis(os.path.join(DIR, "gs_kab.json"), out)
    print(f"gs_kab: {len(out)} dipetakan, {luar} di luar kab (laut/negara lain), {sum(tanpa_kode.values())} kab tanpa kode ({len(tanpa_kode)} kab)")


def wkb_titik(b):
    """WKB little-endian (Polygon/MultiPolygon) -> (lon, lat) rata-rata simpul cincin luar terbesar; None bila bukan."""
    import struct
    cinc = []

    def poli(o):
        nr = struct.unpack_from("<I", b, o + 5)[0]
        o += 9
        for i in range(nr):
            n = struct.unpack_from("<I", b, o)[0]
            if i == 0:
                cinc.append(struct.unpack_from(f"<{2 * n}d", b, o + 4))
            o += 4 + 16 * n
        return o
    t = struct.unpack_from("<I", b, 1)[0]
    if b[0] != 1:
        return None
    if t == 3:
        poli(0)
    elif t == 6:
        o = 9
        for _ in range(struct.unpack_from("<I", b, 5)[0]):
            o = poli(o)
    else:
        return None
    c = max(cinc, key=len)
    n = len(c) // 2
    return sum(c[0::2]) / n, sum(c[1::2]) / n


def ekstrak_gs():
    """Butuh pyarrow. Parquet Groundsource (WKB) -> gs_idn.json [[lon,lat,mulai,selesai]] untuk kotak Indonesia (+1 derajat)."""
    import struct
    import pyarrow.parquet as pq
    f = pq.ParquetFile(os.path.join(DIR, "groundsource_2026.parquet"))
    out, total = [], 0
    for g in range(f.metadata.num_row_groups):
        t = f.read_row_group(g, columns=["geometry", "start_date", "end_date"])
        geo, d0, d1 = t["geometry"].to_pylist(), t["start_date"].to_pylist(), t["end_date"].to_pylist()
        total += len(geo)
        for b, a, e in zip(geo, d0, d1):
            if not b or b[0] != 1:
                continue
            o = 22 if struct.unpack_from("<I", b, 1)[0] == 6 else 17  # simpul pertama: cepat saring kotak
            lon, lat = struct.unpack_from("<2d", b, o)
            if 93 <= lon <= 142 and -12.5 <= lat <= 8:
                c = wkb_titik(b)
                if c and 94.5 <= c[0] <= 141.5 and -11.5 <= c[1] <= 6.5:
                    out.append([round(c[0], 4), round(c[1], 4), a, e])
        print("row group", g, "baris", total, "indonesia(kotak)", len(out), flush=True)
    tulis(os.path.join(DIR, "gs_idn.json"), out)


# ---------------------------------------------------------------- susun
def susun_gugus(rek):
    """-> baris kejadian per (kab_kode, gugus)."""
    out = []
    for g in gugus(rek):
        src = sorted({r["src"] for r in g})
        e = {"kab_kode": g[0]["kab"], "kab": next((r["nama"] for r in g if r["nama"]), ""), "prov": next((r["prov"] for r in g if r["prov"]), ""),
             "mulai": min(r["d0"] for r in g).isoformat(), "selesai": max(r["d1"] for r in g).isoformat(), "sumber": src,
             "n": dict(Counter(r["src"] for r in g))}
        e["rentang_hari"] = (tgl(e["selesai"]) - tgl(e["mulai"])).days + 1
        dibi = [r for r in g if r["src"] == "dibi"]
        if dibi:
            e["dibi"] = {k: sum(r["f"].get(k, 0) for r in dibi) for k in DAMPAK if any(r["f"].get(k) for r in dibi)}
        lb = [r["f"] for r in g if r["src"] == "logbook"]
        if lb:
            e["logbook"] = {k: max(f[k] for f in lb if k in f) for k in ("kk", "rumah", "jiwa", "durasi_hari") if any(k in f for f in lb)}
            tm = [f["tma_cm"] for f in lb if "tma_cm" in f]
            if tm:
                e["logbook"]["tma_cm"] = [min(t[0] for t in tm), max(t[-1] for t in tm)]
        be = [r["f"] for r in g if r["src"] == "berita"]
        if be:
            e["berita"] = {k: max(f[k] for f in be if k in f) for k in ("kk", "rumah", "jiwa") if any(k in f for f in be)}
            tm = [f["tma_cm"] for f in be if "tma_cm" in f]
            if tm:
                e["berita"]["tma_cm"] = [min(t[0] for t in tm), max(t[-1] for t in tm)]
        # ringkasan seragam
        tma = (e.get("logbook") or {}).get("tma_cm") or (e.get("berita") or {}).get("tma_cm")
        e["kedalaman_cm"] = tma
        e["durasi_hari"] = (e.get("logbook") or {}).get("durasi_hari")
        e["kk"] = (e.get("logbook") or {}).get("kk") or (e.get("berita") or {}).get("kk")
        e["rumah"] = (e.get("logbook") or {}).get("rumah") or (e.get("dibi") or {}).get("terendam") or (e.get("berita") or {}).get("rumah")
        e["konflik"] = konflik(e)
        out.append(e)
    return sorted(out, key=lambda e: (e["mulai"], e["kab_kode"]))


def konflik(e):
    k = []
    a, b = (e.get("logbook") or {}).get("tma_cm"), (e.get("berita") or {}).get("tma_cm")
    if a and b and (max(a) > 3 * max(b) or max(b) > 3 * max(a)):
        k.append("tma logbook vs berita >3x")
    r1, r2 = (e.get("logbook") or {}).get("rumah"), (e.get("dibi") or {}).get("terendam")
    if r1 and r2 and (r1 > 5 * r2 or r2 > 5 * r1):
        k.append("rumah logbook vs DIBI terendam >5x")
    if e["rentang_hari"] > 14 and len(e["sumber"]) > 1:
        k.append("rentang >14 hari (gugus berantai?)")
    return k


def laporan(ev, rek):
    th = lambda s: s[:4]
    per = {s: Counter() for s in ("dibi", "logbook", "gs", "berita")}
    for r in rek:
        per[r["src"]][r["d0"].year] += 1
    ev_th = {s: Counter(int(e["mulai"][:4]) for e in ev if s in e["sumber"]) for s in per}
    ada = lambda f: sum(1 for e in ev if f(e))
    irisan = lambda es: {a: {"n": len(b), **{c: sum(1 for e in b if c in e["sumber"]) for c in per}}
                         for a in per for b in [[e for e in es if a in e["sumber"]]]}
    mat = irisan(ev)
    mat_th = irisan([e for e in ev if "2016" <= e["mulai"] < "2026"])  # periode gs, dibi sama-sama lengkap
    mat_gs = irisan([e for e in ev if "2025-10-01" <= e["mulai"] <= "2026-01-29"])  # gs berhenti 29 Jan 2026; logbook mulai 2025
    return {"rekaman_per_tahun": {s: dict(sorted(c.items())) for s, c in per.items()},
            "kejadian_per_tahun_sumber": {s: dict(sorted(c.items())) for s, c in ev_th.items()},
            "irisan": mat, "irisan_2016_2025": mat_th, "irisan_okt2025_jan2026": mat_gs, "kejadian_total": len(ev),
            "punya": {"kedalaman": ada(lambda e: e["kedalaman_cm"]), "durasi_hari_logbook": ada(lambda e: e["durasi_hari"]),
                      "rentang_>1hari": ada(lambda e: e["rentang_hari"] > 1), "kk": ada(lambda e: e["kk"]), "rumah": ada(lambda e: e["rumah"]),
                      "meninggal_dibi": ada(lambda e: (e.get("dibi") or {}).get("meninggal")),
                      "terdampak_dibi": ada(lambda e: (e.get("dibi") or {}).get("terdampak"))},
            "konflik": ada(lambda e: e["konflik"]),
            "tahun_paling_awal": {s: min(c) if c else None for s, c in per.items()}}


def tabel_md(L):
    ys = sorted({y for c in L["rekaman_per_tahun"].values() for y in c})
    s = ["| tahun | " + " | ".join(L["rekaman_per_tahun"]) + " |", "| --- |" + " --- |" * len(L["rekaman_per_tahun"])]
    for y in ys:
        s.append(f"| {y} | " + " | ".join(str(L["rekaman_per_tahun"][k].get(y, 0)) for k in L["rekaman_per_tahun"]) + " |")
    return "\n".join(s)


def susun():
    rek = rek_dibi() + rek_logbook() + rek_gs() + rek_berita()
    ev = susun_gugus(rek)
    L = laporan(ev, rek)
    tulis(os.path.join(DIR, "label.json"), {
        "dibuat": dt.datetime.now().isoformat(timespec="minutes"),
        "sumber": "DIBI BNPB; logbook Pusdalops BNPB; Google Groundsource (Zenodo 10.5281/zenodo.18647053, CC BY 4.0); GDELT DOC 2.0 + Google News RSS",
        "jendela_hari": JENDELA, "laporan": L, "kejadian": ev})
    md = os.path.join(AKAR, "scripts/banjir/RISET-LABEL-BANJIR.md")
    isi = open(md).read() if os.path.exists(md) else "# Label banjir 20 tahun\n\n"
    isi = isi.split("<!-- ringkasan:mulai -->")[0].rstrip() + "\n\n<!-- ringkasan:mulai -->\n## Ringkasan (dibangkitkan `label_banjir.py susun`)\n\n" \
        f"Kejadian: {L['kejadian_total']}; konflik antar-sumber: {L['konflik']}.\n\nRekaman mentah per tahun per sumber (kejadian = gugus tanggal, bukan jumlah ini):\n\n" \
        f"{tabel_md(L)}\n\nIrisan (baris: sumber; kolom: berapa kejadiannya juga dikonfirmasi sumber lain):\n\n```\n{json.dumps(L['irisan'], indent=1)}\n```\n\nIrisan 2016-2025:\n\n```\n{json.dumps(L['irisan_2016_2025'], indent=1)}\n```\n\nIrisan 1 Okt 2025 - 29 Jan 2026 (jendela logbook x gs):\n\n```\n{json.dumps(L['irisan_okt2025_jan2026'], indent=1)}\n```\n\n" \
        f"Kejadian berbekal: {json.dumps(L['punya'])}\n<!-- ringkasan:akhir -->\n"
    open(md, "w").write(isi)
    print(json.dumps({k: v for k, v in L.items() if k not in ("rekaman_per_tahun", "kejadian_per_tahun_sumber")}, indent=1))


# ---------------------------------------------------------------- uji
def uji():
    assert kode_kab(3402) == "34.02" and kode_kab("3402") == "34.02" and kode_kab("34.02") == "34.02" and kode_kab(3402.0) == "34.02"
    assert kode_kab("34") is None and kode_kab(None) is None
    assert kedalaman_cm("banjir setinggi 1,5 meter di Kudus") == (150, 150)
    assert kedalaman_cm("ketinggian air 50-100 cm") == (50, 100)
    assert kedalaman_cm("air setinggi 40 cm merendam") == (40, 40)
    assert kedalaman_cm("sekitar 100 meter dari sungai") is None
    assert kedalaman_cm("rumah berjarak 100 meter dari sungai") is None
    assert kedalaman_cm("tinggi air hingga 2 m") == (200, 200)
    assert kedalaman_cm("tidak ada angka") is None
    assert angka_id("1.500") == 1500 and angka_id("2.5") == 2.5 and angka_id("1,5") == 1.5
    assert angka_maks(RE_KK, "532 KK dan 1.920 jiwa terdampak") == 532 and angka_maks(RE_JIWA, "532 KK dan 1.920 jiwa") == 1920
    assert angka_maks(RE_RUMAH, "210 rumah terendam") == 210
    R = lambda k, a, b=None, s="dibi": {"kab": k, "nama": "", "prov": "", "d0": tgl(a), "d1": tgl(b or a), "src": s, "f": {}, "jenis": ""}
    g = gugus([R("34.02", "2020-01-01"), R("34.02", "2020-01-03", s="gs"), R("34.02", "2020-01-06"), R("34.02", "2020-01-04", s="berita"),
               R("33.18", "2020-01-02")])
    assert sorted(len(x) for x in g) == [1, 4], [len(x) for x in g]  # rantai 1,3,4,6 Jan satu kejadian; kab lain terpisah
    g = gugus([R("34.02", "2020-01-01"), R("34.02", "2020-01-04")])
    assert len(g) == 2  # selisih 3 hari = kejadian berbeda
    g = gugus([R("34.02", "2020-01-01"), R("34.02", "2020-01-03")])
    assert len(g) == 1  # selisih 2 hari = sama
    g = gugus([R("34.02", (dt.date(2020, 1, 1) + dt.timedelta(days=2 * i)).isoformat()) for i in range(40)])
    assert len(g) >= 2 and all((max(r["d1"] for r in x) - min(r["d0"] for r in x)).days <= MAKS_GUGUS + 2 for x in g)  # rantai dipotong
    ev = susun_gugus([R("34.02", "2020-01-01"), R("34.02", "2020-01-02", s="gs")])
    assert ev[0]["sumber"] == ["dibi", "gs"] and ev[0]["mulai"] == "2020-01-01" and ev[0]["rentang_hari"] == 2
    print("uji label_banjir: ok")


if __name__ == "__main__":
    m = sys.argv[1] if len(sys.argv) > 1 else ""
    {"ambil": lambda: (os.makedirs(DIR, exist_ok=True), ambil_dibi() if not os.path.exists(os.path.join(DIR, "dibi.json")) else None, ambil_berita()),
     "gs": lambda: (ekstrak_gs() if not os.path.exists(os.path.join(DIR, "gs_idn.json")) else None, pasang_gs()),
     "susun": susun, "uji": uji}.get(m, lambda: sys.exit(__doc__))()
