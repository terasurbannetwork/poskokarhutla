"""Citra sebelum-sesudah untuk bukti DAS hulu: Sentinel-2 (tutupan hulu) dan Sentinel-1 (genangan banjir besar).

Pakai:  python3 scripts/banjir/citra_banjir.py                 # semua daerah di public/banjir/data/bukti/index.json
        python3 scripts/banjir/citra_banjir.py "32|Bogor" "11|Aceh Selatan"   # daerah tertentu (boleh beberapa proses paralel)
        python3 scripts/banjir/citra_banjir.py uji             # uji fungsi murni (luring)
Jalankan sesudah bukti_das.py, manual dan jarang (banjir.yml: workflow_dispatch input `bukti`). Hasil: PNG di public/banjir/data/bukti/citra/ dan blok "citra" di <slug>.json.

- Sentinel-2 L2A (Earth Search / Element84, COG terbuka, pola scripts/data/citra.py): kotak 12 km di sel 5 km tempat hutan hilang terbanyak
  sejak 2021 di dalam DAS (titik_hilang). "Sebelum" = adegan paling bersih (awan terendah, kotak tertutup penuh) Jun 2019 - Okt 2020;
  "sesudah" = yang paling bersih 14 bulan terakhir. Warna asli (TCI).
- Sentinel-1 RTC (Microsoft Planetary Computer, token SAS anonim dari API-nya, COG float32): untuk kejadian banjir DIBI terbesar
  (terdampak + pengungsi) sejak 2017 di kabupaten itu. "Sesudah" = pengamatan pertama 0-12 hari setelah tanggal kejadian,
  "sebelum" = pengamatan terakhir 8-45 hari sebelumnya pada orbit relatif yang sama bila ada. VV dalam dB, gelap = air / permukaan licin.
  Persen "gelap baru" = piksel yang < -17 dB sesudah tapi >= -17 dB sebelum; ini indikasi radar, BUKAN luas banjir resmi (sawah berair,
  bayangan lereng, angin ikut terhitung).
Sumber tak tersedia atau tak ada adegan yang memenuhi syarat: bagian itu dilewati, skrip tetap keluar 0 dan berkas lama dipertahankan.
Tiap PNG <= 120 KB.
"""
import array, datetime as dt, json, math, os, struct, sys, time, urllib.request, zlib
from itertools import accumulate

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../data"))
from umum import simpan  # noqa: E402
import bukti_das as B  # noqa: E402
import citra as C  # noqa: E402
import konsesi_citra as K  # noqa: E402
import ringkas_citra as R  # noqa: E402

PX_S2, KM_S2 = 320, 12
PX_S1, KM_S1 = 320, 16
AMBANG_DB = -17.0
PC_STAC = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
PC_SAS = "https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel1euwestrtc/sentinel1-grd-rtc"
MAKS_PNG = 115_000
DIR = os.path.join(B.KELUAR, "citra")


def stac(url, q):
    return json.loads(C.ambil(url, data=json.dumps(q).encode()))["features"]


# ---------------------------------------------------------------- Sentinel-2
def awan_kotak(item, lat, lon, km):
    """(% awan di kotak, % tanpa data) dari SCL 60 x 60; None bila gagal"""
    c = C.COG(item["assets"]["scl"]["href"])
    x0, y0, r0, kiri, atas = K.jendela(item, "scl", lat, lon, km)
    v = c.contoh(0, x0, y0, r0, kiri, atas, km * 1000, 60)[0]
    kosong = sum(1 for x in v if x == 0)
    sah = len(v) - kosong
    return (100 * sum(1 for x in v if x in (3, 8, 9, 10)) / sah if sah else 100), 100 * kosong / len(v)


def terbaik_s2(lat, lon, dari, sampai):
    bb = C.kotak(lat, lon, KM_S2)
    cand = stac(C.STAC, {"collections": ["sentinel-2-l2a"], "bbox": [lon - .001, lat - .001, lon + .001, lat + .001], "limit": 60,
                         "datetime": f"{dari}T00:00:00Z/{sampai}T23:59:59Z", "query": {"eo:cloud_cover": {"lt": 40}},
                         "sortby": [{"field": "properties.eo:cloud_cover", "direction": "asc"}]})
    for it in cand[:8]:
        if not C.menutup(it["geometry"], bb):
            continue
        try:
            aw, ko = awan_kotak(it, lat, lon, KM_S2)
        except Exception as e:
            print("   skor gagal", it["id"], e, file=sys.stderr)
            continue
        if ko < 5 and aw < 12:
            return it, round(aw)
    return None, None


def rgb_tci(item, lat, lon, km, px):
    c = C.COG(item["assets"]["visual"]["href"])
    x0, y0, r0, kiri, atas = K.jendela(item, "visual", lat, lon, km)
    tc = c.contoh(C.level_untuk(c, r0, km * 1000 / px), x0, y0, r0, kiri, atas, km * 1000, px)
    return [array.array("B", (min(255, int(v * 1.15)) for v in b)) for b in tc]


def gambar_tci(item, lat, lon, berkas, km=KM_S2, px=PX_S2, kecil=False):
    tc = rgb_tci(item, lat, lon, km, px)
    if kecil:   # mode kejadian: turunkan resolusi sampai muat MAKS_KEJADIAN
        return tulis_png(tc, px, berkas)
    open(berkas, "wb").write(C.png(tc, px, MAKS_PNG))


def s2(d):
    ll = d.get("titik_hilang")
    if not ll:
        return None
    lat, lon = ll
    hari = dt.date.today()
    keluar = {"lat": lat, "lon": lon, "km": KM_S2}
    for nama, (a, b) in (("sebelum", ("2019-06-01", "2020-10-31")), ("sesudah", ((hari - dt.timedelta(days=425)).isoformat(), hari.isoformat()))):
        it, aw = terbaik_s2(lat, lon, a, b)
        if not it:
            print(f"   S2 {nama}: tak ada adegan bersih {a}..{b}", file=sys.stderr)
            return None
        tgl = it["properties"]["datetime"][:10]
        f = f"{d['slug']}_s2_{nama}_{tgl.replace('-', '')}.png"
        gambar_tci(it, lat, lon, os.path.join(DIR, f))
        keluar[nama] = {"tgl": tgl, "awan": aw, "berkas": "citra/" + f, "adegan": it["id"]}
    keluar["bbox"] = C.kotak(lat, lon, KM_S2)
    return keluar


# ---------------------------------------------------------------- Sentinel-1
def token_sas():
    return json.loads(C.ambil(PC_SAS))["token"]


def buka_float_pred3(raw, w, h):
    """ubin float32 deflate + prediktor 3 (titik-mengambang): urungkan selisih byte per baris lalu susun ulang bidang byte -> array('f')"""
    a = bytearray(zlib.decompress(raw))
    assert sys.byteorder == "little"
    rl = w * 4
    keluar = bytearray(len(a))
    for y in range(h):
        baris = bytes(accumulate(a[y * rl:(y + 1) * rl], lambda p, q: (p + q) & 255))
        o = keluar[y * rl:(y + 1) * rl]
        o[3::4], o[2::4], o[1::4], o[0::4] = baris[0:w], baris[w:2 * w], baris[2 * w:3 * w], baris[3 * w:4 * w]
        keluar[y * rl:(y + 1) * rl] = o
    f = array.array("f")
    f.frombytes(bytes(keluar))
    return f


def contoh_s1(item, token, lat, lon, km, n):
    """n x n nilai VV (linear, None = tanpa data) di kotak km x km"""
    a = item["assets"]["vv"]
    url = a["href"] + "?" + token
    c = C.COG(url)
    epsg = item["properties"]["proj:epsg"]
    tr = item["properties"]["proj:transform"]
    E, N = C.ke_utm(lat, lon, epsg % 100)
    kiri, atas = E - km * 500, N + km * 500
    lv = C.level_untuk(c, tr[0], km * 1000 / n)
    t = c.ifd[lv]
    W, H, T = t[256], t[257], t[322]
    r = tr[0] * c.ifd[0][256] / W
    langkah = km * 1000 / n
    kol = [int((kiri + (j + .5) * langkah - tr[2]) / r) for j in range(n)]
    bar = [int((tr[5] - (atas - (i + .5) * langkah)) / r) for i in range(n)]
    tx = math.ceil(W / T)
    off, cnt = t[324], t[325]
    perlu = {(y // T, x // T) for y in bar for x in kol if 0 <= y < H and 0 <= x < W}
    from concurrent.futures import ThreadPoolExecutor

    def satu(yx):
        k = yx[0] * tx + yx[1]
        return yx, (buka_float_pred3(C.ambil(url, (off[k], off[k] + cnt[k])), T, T) if cnt[k] else None)
    with ThreadPoolExecutor(8) as ex:
        ubin = dict(ex.map(satu, perlu))
    out = []
    for y in bar:
        for x in kol:
            u = ubin.get((y // T, x // T)) if 0 <= y < H and 0 <= x < W else None
            v = u[(y % T) * T + x % T] if u else None
            out.append(v if v is not None and v > 0 and v == v else None)
    return out


def ke_db(v):
    return None if v is None else 10 * math.log10(v)


def abu(db):
    """dB -> 0..255 (-25..0 dB)"""
    return array.array("B", (0 if v is None else max(1, min(255, int((v + 25) / 25 * 255))) for v in db))


def gelap_baru(sebelum, sesudah):
    """% piksel sah yang < AMBANG_DB sesudah tetapi >= AMBANG_DB sebelum, dan % sah"""
    sah = [(a, b) for a, b in zip(sebelum, sesudah) if a is not None and b is not None]
    if not sah:
        return None, 0
    return 100 * sum(1 for a, b in sah if b < AMBANG_DB <= a) / len(sah), 100 * len(sah) / len(sebelum)


def kejadian_terbesar(kab_kunci, minimal="2017-01-01"):
    p, nama = kab_kunci.split("|")
    ev = [e for e in B.baca_json("public/banjir/data/kejadian.json")["kejadian_dibi"]
          if e["prov"] == p and e["kab"] == nama and e["jenis"].startswith("banjir") and minimal <= e["tanggal"]
          and e["tanggal"] <= (dt.date.today() - dt.timedelta(days=7)).isoformat()]
    return max(ev, key=lambda e: (e["terdampak"] or 0) + 3 * (e["mengungsi"] or 0), default=None)


def s1(d):
    ev = kejadian_terbesar(d["kunci"])
    if not ev or (ev["terdampak"] or 0) + (ev["mengungsi"] or 0) == 0:
        print("   S1: tak ada kejadian berdampak", file=sys.stderr)
        return None
    lat, lon = d["keluaran"]["lat"], d["keluaran"]["lon"]
    t0 = dt.date.fromisoformat(ev["tanggal"])
    bb = [lon - .002, lat - .002, lon + .002, lat + .002]
    sesudah = stac(PC_STAC, {"collections": ["sentinel-1-rtc"], "bbox": bb, "limit": 20, "datetime": f"{t0}T00:00:00Z/{t0 + dt.timedelta(days=12)}T23:59:59Z",
                             "sortby": [{"field": "properties.datetime", "direction": "asc"}]})
    sebelum = stac(PC_STAC, {"collections": ["sentinel-1-rtc"], "bbox": bb, "limit": 30, "datetime": f"{t0 - dt.timedelta(days=45)}T00:00:00Z/{t0 - dt.timedelta(days=8)}T23:59:59Z",
                             "sortby": [{"field": "properties.datetime", "direction": "desc"}]})
    sesudah = [i for i in sesudah if i["properties"]["datetime"][:10] >= ev["tanggal"]]   # tidak pernah lebih awal dari kejadian
    sebelum = [i for i in sebelum if i["properties"]["datetime"][:10] < ev["tanggal"]]
    if not sesudah or not sebelum:
        print(f"   S1: adegan {len(sebelum)} sebelum / {len(sesudah)} sesudah {ev['tanggal']}", file=sys.stderr)
        return None
    orb = lambda i: i["properties"].get("sat:relative_orbit")
    pasangan = next(((a, b) for b in sesudah for a in sebelum if orb(a) == orb(b)), None)
    if not pasangan:
        print("   S1: tak ada pasangan orbit sama", file=sys.stderr)
        return None
    a, b = pasangan
    tok = token_sas()
    va, vb = [contoh_s1(i, tok, lat, lon, KM_S1, PX_S1) for i in (a, b)]
    da, db = [ke_db(v) for v in va], [ke_db(v) for v in vb]
    pg, sah = gelap_baru(da, db)
    if pg is None or sah < 50:
        print(f"   S1: piksel sah {sah:.0f}% < 50%", file=sys.stderr)
        return None
    keluar = {"lat": lat, "lon": lon, "km": KM_S1, "bbox": C.kotak(lat, lon, KM_S1), "ambang_db": AMBANG_DB,
              "kejadian": {"tanggal": ev["tanggal"], "terdampak": ev["terdampak"], "mengungsi": ev["mengungsi"], "meninggal": ev.get("meninggal", 0)},
              "gelap_baru_persen": round(pg, 1), "sah_persen": round(sah)}
    for nama, it, dbv in (("sebelum", a, da), ("sesudah", b, db)):
        tgl = it["properties"]["datetime"][:10]
        f = f"{d['slug']}_s1_{nama}_{tgl.replace('-', '')}.png"
        g = abu(dbv)
        open(os.path.join(DIR, f), "wb").write(R.png_abu(g, PX_S1, MAKS_PNG))
        keluar[nama] = {"tgl": tgl, "berkas": "citra/" + f, "adegan": it["id"], "orbit": orb(it)}
    return keluar


# ---------------------------------------------------------------- jalan
def s1_sah(c):
    return c["sesudah"]["tgl"] >= c["kejadian"]["tanggal"] and c["sebelum"]["tgl"] < c["kejadian"]["tanggal"]


def kerjakan(d):
    """S2 yang sudah ada dipakai ulang (CITRA_ULANG=1 memaksa ulang); S1 dihitung ulang bila belum ada atau melanggar urutan tanggal"""
    os.makedirs(DIR, exist_ok=True)
    citra = dict(d.get("citra") or {})
    ulang = os.environ.get("CITRA_ULANG") == "1"
    for kunci, fn in (("s2", s2), ("s1", s1)):
        if not ulang and citra.get(kunci) and (kunci == "s2" or s1_sah(citra[kunci])):
            continue
        for n in ("sebelum", "sesudah"):   # berkas lama yang diganti dibuang supaya tidak yatim
            f = os.path.join(B.KELUAR, ((citra.get(kunci) or {}).get(n) or {}).get("berkas", "x"))
            if citra.get(kunci) and os.path.isfile(f):
                os.remove(f)
        citra.pop(kunci, None)
        try:
            r = fn(d)
        except Exception as e:
            print(f"   {kunci} gagal: {e}", file=sys.stderr)
            r = None
        if r:
            citra[kunci] = r
    citra["gambar"] = [c[n]["berkas"] for c in (citra.get("s2"), citra.get("s1")) if c for n in ("sebelum", "sesudah")]
    citra["dibuat"] = dt.date.today().isoformat()
    return citra


# ---------------------------------------------------------------- mode kejadian (GS-05)
AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
DIR_KJ = os.path.join(AKAR, "data/raw/banjir/gfm_nasional/kejadian")
MAKS_KEJADIAN = 120_000
KM_MAKS, PX_KJ, AWAN_TUTUP = 40, 360, 60
WIB = dt.timezone(dt.timedelta(hours=7))
ATRIBUSI = ["Contains modified Copernicus Sentinel data (Sentinel-1, Sentinel-2)", "Microsoft Planetary Computer (Sentinel-1 RTC)",
            "Element84 Earth Search (Sentinel-2 L2A)"]


def kotak_citra(titik, km_maks=KM_MAKS, min_km=4):
    """titik = [[lon, lat, ha], ...] -> (lat, lon, sisi_km): bbox titik, atau area terpadat bila bbox > km_maks"""
    if not titik:
        return None
    lat0 = sum(t[1] for t in titik) / len(titik)
    kx, ky = 111.32 * math.cos(math.radians(lat0)), 110.574
    xs, ys = [t[0] for t in titik], [t[1] for t in titik]
    sx, sy = (max(xs) - min(xs)) * kx, (max(ys) - min(ys)) * ky
    if max(sx, sy) <= km_maks:
        return ((min(ys) + max(ys)) / 2, (min(xs) + max(xs)) / 2, round(min(km_maks, max(min_km, max(sx, sy) * 1.1)), 1))
    sel = {}   # sel 2 km -> titik; jendela km_maks berpusat di tiap sel terisi, ambil yang paling banyak titik
    for t in titik:
        sel.setdefault((int(t[0] * kx / 2), int(t[1] * ky / 2)), []).append(t)
    h = km_maks / 2 / 2
    def isi(c):
        return [t for (i, j), v in sel.items() if abs(i - c[0]) <= h and abs(j - c[1]) <= h for t in v]
    # ponytail: O(sel^2); cukup untuk kab (ribuan titik), ganti ke kisi kumulatif bila lambat
    best = max(sel, key=lambda c: len(isi(c)))
    p = isi(best)
    return (sum(t[1] for t in p) / len(p), sum(t[0] for t in p) / len(p), float(km_maks))


def jendela_optik(mulai):
    """(pra_dari, pra_sampai, pasca_dari, pasca_sampai) ISO UTC. Batas 'sebelum mulai' = 00.00 WIB tanggal mulai (D13)"""
    t0 = dt.datetime.fromisoformat(mulai).replace(tzinfo=WIB)
    z = lambda x: x.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return (z(t0 - dt.timedelta(days=45)), z(t0 - dt.timedelta(seconds=1)), z(t0), z(t0 + dt.timedelta(days=16) - dt.timedelta(seconds=1)))


def waktu_utc(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def status_awan(aw):
    return "tertutup awan" if aw > AWAN_TUTUP else "ok"


def resampel(ch, n, m):
    return array.array("B", (ch[(i * n // m) * n + j * n // m] for i in range(m) for j in range(m)))


def png_muat(rgb, n, maks=MAKS_KEJADIAN):
    """-> (bytes, n_akhir); resolusi diturunkan 20% per putaran sampai PNG <= maks"""
    while True:
        b = C.png(rgb, n, maks)
        if len(b) <= maks or n < 64:
            return b, n
        m = int(n * 0.8)
        rgb, n = [resampel(c, n, m) for c in rgb], m


def tulis_png(rgb, n, berkas):
    b, n = png_muat(rgb, n)
    open(berkas, "wb").write(b)
    return {"ukuran": len(b), "px": n}


def optik_kej(lat, lon, km, dari, sampai):
    """adegan S2 paling bersih di [dari, sampai] (UTC). Kotak 40 km melintas ubin, jadi ubin sehari digabung.
    -> (daftar item, awan%, status)  atau ([], None, 'tidak ada adegan')"""
    cand = stac(C.STAC, {"collections": ["sentinel-2-l2a"], "bbox": [lon - .15, lat - .15, lon + .15, lat + .15], "limit": 100,
                         "datetime": f"{dari}/{sampai}", "sortby": [{"field": "properties.eo:cloud_cover", "direction": "asc"}]})
    lo, hi = waktu_utc(dari), waktu_utc(sampai)
    hari = {}
    for it in cand:
        if lo <= waktu_utc(it["properties"]["datetime"]) <= hi:
            hari.setdefault(it["properties"]["datetime"][:10], []).append(it)
    nilai = []
    for tgl in list(hari)[:4]:   # urutan = ubin berawan terendah dulu
        sah_total, aw_sum, ada = 0, 0, []
        for it in hari[tgl]:
            try:
                aw, ko = awan_kotak(it, lat, lon, km)
            except Exception as e:
                print("   skor gagal", it["id"], e, file=sys.stderr)
                continue
            sah = 100 - ko
            if sah > 1:
                sah_total, aw_sum = sah_total + sah, aw_sum + aw * sah
                ada.append(it)
        # ponytail: tumpang tindih ubin menggembungkan sah_total; dibatasi 100
        if ada and min(100, sah_total) >= 70:
            nilai.append((aw_sum / sah_total, ada))
    if not nilai:
        return [], None, "tidak ada adegan"
    aw, its = min(nilai, key=lambda x: x[0])
    return its, round(aw), status_awan(aw)


def gabung(ls):
    """gabung rgb per ubin: piksel 0 diisi ubin berikutnya"""
    h = ls[0]
    for l in ls[1:]:
        h = [array.array("B", (x if x else y for x, y in zip(a, b))) for a, b in zip(h, l)]
    return h


def asli_kej(items, lat, lon, km, px, berkas):
    return tulis_png(gabung([rgb_tci(i, lat, lon, km, px) for i in items]), px, berkas)


def swir_rgb(item, lat, lon, km, px):
    A = item["assets"]

    def kanal(k):
        c = C.COG(A[k]["href"])
        x0, y0, r0, kiri, atas = K.jendela(item, k, lat, lon, km)
        sk, of = C.skala_offset(item, k)
        v = c.contoh(C.level_untuk(c, r0, km * 1000 / px), x0, y0, r0, kiri, atas, km * 1000, px)[0]
        return array.array("B", (0 if d == 0 else max(0, min(255, int((d * sk + of) * 2.5 * 255))) for d in v))
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(3) as ex:
        return list(ex.map(kanal, ("swir22", "nir08", "red")))   # B12, B8A, B4


def swir_kej(items, lat, lon, km, px, berkas):
    return tulis_png(gabung([swir_rgb(i, lat, lon, km, px) for i in items]), px, berkas)


def radar_kej(lat, lon, km, waktu, tok):
    """adegan S1 RTC yang diambil dalam 10 menit dari `waktu` GFM: item atau None (tidak pernah diganti adegan lain)"""
    t = waktu_utc(waktu)
    f = lambda x: x.strftime("%Y-%m-%dT%H:%M:%SZ")
    bb = C.kotak(lat, lon, km)
    cand = stac(PC_STAC, {"collections": ["sentinel-1-rtc"], "bbox": [lon - .002, lat - .002, lon + .002, lat + .002], "limit": 20,
                          "datetime": f"{f(t - dt.timedelta(hours=1))}/{f(t + dt.timedelta(hours=1))}"})
    cand = [i for i in cand if abs((waktu_utc(i["properties"]["datetime"]) - t).total_seconds()) <= 600 and C.menutup(i["geometry"], bb)]
    return min(cand, key=lambda i: abs((waktu_utc(i["properties"]["datetime"]) - t).total_seconds()), default=None)


def citra_kab(k, mulai, dir_png, tok=None):
    """satu kab -> {kab4, kab, citra: None | {...}, alasan}. Kab tak sah tidak disentuh jaringannya."""
    r = {"kab4": k["kab4"], "kab": k["kab"], "sah": bool(k.get("sah"))}
    if not k.get("sah"):
        return {**r, "citra": None, "alasan": "tak sah di GS-01: " + str((k.get("tampil") or {}).get("alasan") or k.get("status"))}
    kc = kotak_citra((k.get("mentah") or {}).get("titik_baru") or [])
    if not kc:
        return {**r, "citra": None, "alasan": "tanpa titik baru"}
    lat, lon, km = kc
    c = {"lat": round(lat, 5), "lon": round(lon, 5), "km": km, "bbox": C.kotak(lat, lon, km)}
    tok = tok or token_sas()
    px = PX_KJ
    for nama, waktu in (("pra", k.get("pra")), ("pasca", k.get("lintasan"))):
        e = {"status": "tidak ada adegan radar cocok"}
        try:
            it = radar_kej(lat, lon, km, waktu, tok) if waktu else None
            if it:
                db = [ke_db(v) for v in contoh_s1(it, tok, lat, lon, km, px)]
                g = abu(db)
                f = f"{k['kab4']}_radar_{nama}.png"
                e = {"status": "ok", "tanggal": it["properties"]["datetime"], "id": it["id"], "orbit": it["properties"].get("sat:relative_orbit"),
                     "berkas": f, **tulis_png([g, g, g], px, os.path.join(dir_png, f))}
        except Exception as ex:
            e = {"status": "gagal: " + str(ex)[:120]}
        c["radar_" + nama] = e
    pra_d, pra_s, pas_d, pas_s = jendela_optik(mulai)
    for nama, (a, b) in (("pra", (pra_d, pra_s)), ("pasca", (pas_d, pas_s))):
        try:
            it, aw, st = optik_kej(lat, lon, km, a, b)
        except Exception as ex:
            it, aw, st = [], None, "gagal: " + str(ex)[:120]
        for jenis in ("asli", "swir"):
            e = {"status": st}
            if it:
                e.update({"tanggal": it[0]["properties"]["datetime"], "id": [i["id"] for i in it], "awan_pct": aw})
                if st == "ok":
                    f = f"{k['kab4']}_{jenis}_{nama}.png"
                    try:
                        if jenis == "asli":
                            e.update({"berkas": f, **asli_kej(it, lat, lon, km, px, os.path.join(dir_png, f))})
                        else:
                            e.update({"berkas": f, **swir_kej(it, lat, lon, km, px, os.path.join(dir_png, f))})
                    except Exception as ex:
                        e["status"] = "gagal: " + str(ex)[:120]
            c[f"{jenis}_{nama}"] = e
    return {**r, "citra": c, "alasan": None}


def kejadian(kj):
    t0 = time.time()
    d = json.load(open(os.path.join(DIR_KJ, kj + ".json")))
    dir_png = os.path.join(DIR_KJ, kj + "_citra")
    os.makedirs(dir_png, exist_ok=True)
    tok = None
    kab = []
    for k in d["kab"]:
        print("==", k["kab4"], k["kab"], file=sys.stderr)
        if k.get("sah") and tok is None:
            tok = token_sas()
        kab.append(citra_kab(k, d["mulai"], dir_png, tok))
    m = {"kj": kj, "mulai": d["mulai"], "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "atribusi": ATRIBUSI, "kab": kab}
    simpan(os.path.join(DIR_KJ, kj + "_citra.json"), m)
    print(f"kejadian {kj}: {time.time() - t0:.0f} dtk", file=sys.stderr)
    return m


def uji():
    w = 3
    # prediktor 3: bangun ubin 3 x 3 float32 lalu enkode manual (susun bidang byte + selisih) dan harapkan nilai kembali
    nilai = [0.1, 0.05, 0.2, 0.0123, 0.5, 0.9, 1.5, 0.0008, 0.3]
    mentah = b"".join(struct.pack("<f", v) for v in nilai)
    baris = []
    for y in range(w):
        bs = mentah[y * 12:(y + 1) * 12]
        bidang = bytes(bs[i * 4 + k] for k in (3, 2, 1, 0) for i in range(w))
        baris.append(bytes([bidang[0]] + [(bidang[i] - bidang[i - 1]) & 255 for i in range(1, len(bidang))]))
    keluar = buka_float_pred3(zlib.compress(b"".join(baris)), w, w)
    assert all(abs(a - b) < 1e-7 for a, b in zip(keluar, nilai)), f"prediktor 3 salah: {list(keluar)} != {nilai}"
    p, s = gelap_baru([-10, -10, -20, None], [-25, -10, -25, -25])
    assert (round(p, 1), round(s)) == (33.3, 75), f"gelap_baru {p} {s}"
    assert gelap_baru([None], [-20]) == (None, 0), "tanpa piksel sah harus None"
    ok = {"kejadian": {"tanggal": "2025-02-27"}, "sebelum": {"tgl": "2025-02-10"}, "sesudah": {"tgl": "2025-02-27"}}
    assert s1_sah(ok) and not s1_sah({**ok, "sesudah": {"tgl": "2025-02-26"}}), "sesudah harus >= tanggal kejadian"
    g = abu([-30, -25, 0, None])
    assert list(g) == [1, 1, 255, 0], f"abu {list(g)}"
    # ---- mode kejadian, tanpa jaringan
    pd_, ps, qd, qs = jendela_optik("2025-11-26")
    assert ps == "2025-11-25T16:59:59Z" and qd == "2025-11-25T17:00:00Z", f"batas WIB {ps} {qd}"
    assert pd_ == "2025-10-11T17:00:00Z" and qs == "2025-12-11T16:59:59Z", f"jendela {pd_} {qs}"
    assert status_awan(60) == "ok" and status_awan(60.1) == "tertutup awan", "awan > 60 persen"
    import random
    random.seed(1)
    n = 400
    derau = [array.array("B", (random.randrange(256) for _ in range(n * n))) for _ in range(3)]
    b, n2 = png_muat(derau, n)
    assert len(b) <= MAKS_KEJADIAN and n2 < n, f"png harus turun resolusi: {len(b)} {n2}"
    tak = citra_kab({"kab4": "1201", "kab": "X", "sah": False, "status": "ok", "tampil": {"alasan": "sinyal lemah"}}, "2025-11-26", "/tidak/dipakai")
    assert tak["citra"] is None and "sinyal lemah" in tak["alasan"], f"tak sah {tak}"
    kecil = [[98.0 + i * .001, 4.0 + i * .001, 1] for i in range(10)]
    lat, lon, km = kotak_citra(kecil)
    assert 4 <= km < 6 and abs(lat - 4.0045) < 1e-6, f"kotak kecil {lat} {lon} {km}"
    lebar = [[98.0 + i * .0005, 4.0, 1] for i in range(200)] + [[99.0 + i * .0001, 5.0, 1] for i in range(50)] + [[98.05, 4.0, 1]]
    lat, lon, km = kotak_citra(lebar)
    assert km == 40 and abs(lon - 98.05) < .2 and abs(lat - 4.0) < .05, f"kotak 40 km {lat} {lon} {km}"
    print("uji citra_banjir: lolos", file=sys.stderr)


def main(a):
    if a[:1] == ["uji"]:
        return uji()
    if a[:1] == ["kejadian"]:
        return kejadian(a[a.index("--kj") + 1])
    idx = json.load(open(os.path.join(B.KELUAR, "index.json")))
    for e in idx["daerah"]:
        if a and e["kunci"] not in a:
            continue
        p = os.path.join(B.KELUAR, e["slug"] + ".json")
        d = json.load(open(p))
        print("==", e["kunci"], file=sys.stderr)
        d["citra"] = kerjakan(d)
        B.validasi(d)
        simpan(p, d)
        # baca ulang indeks tiap kali: beberapa proses boleh jalan paralel dengan daftar daerah berbeda
        baru = json.load(open(os.path.join(B.KELUAR, "index.json")))
        for x in baru["daerah"]:
            if x["kunci"] == e["kunci"]:
                x["citra"] = bool(d["citra"].get("s1") or d["citra"].get("s2"))
        simpan(os.path.join(B.KELUAR, "index.json"), baru)
    B.uji()


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        uji()
        sys.exit(0)
    try:
        main(sys.argv[1:])
    except Exception as e:  # tidak pernah menggagalkan pemanggil (pola citra.py)
        print("citra_banjir: dilewati:", e, file=sys.stderr)
