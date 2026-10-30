"""Tabel FITUR per kabupaten untuk model banjir empiris: hujan -> limpasan -> (kapasitas lokal) + air kiriman -> kedalaman/lama -> KK.
Hanya PENGGERAK (fitur); label dibangun di tempat lain. TIDAK mengubah status.py, ambang, atau public/.
Daftar variabel + sumber + resolusi + tahun + konstan/variabel: scripts/banjir/RISET-FITUR-BANJIR.md.

Pakai:  python3 scripts/banjir/fitur_banjir.py ambil [bagian,...] [--semua] [--maks N]
          bagian: daftar power tutupan hand tanah glofas   (bawaan: semuanya; semua bisa dilanjut, cache di data/raw/banjir/fitur/)
          --semua  : seluruh kabupaten (bawaan: kab berlabel banjir di logbook + kandidat.json bila ada)
          --maks N : paling banyak N kab per bagian (bagian jaringan lambat)
        python3 scripts/banjir/fitur_banjir.py susun     -> fitur/statis.json + fitur/harian/<kab_kode>.json
        python3 scripts/banjir/fitur_banjir.py uji       swauji luring
Raster dibaca lewat CLI GDAL (gdalwarp/gdalbuildvrt/gdal_rasterize) + numpy; selebihnya stdlib. Python 3.9 aman.
"""
import bisect, datetime as dt, glob, gzip, json, math, os, re, subprocess, sys, tempfile, threading, time, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

AYAH = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AYAH)
from umum import AKAR, MENTAH, KuotaHabis, ambil as ambil_json, baca, simpan  # noqa: E402
from wilayah import _di_dalam  # noqa: E402

DIR = os.path.join(MENTAH, "fitur")
D0 = dt.date(2005, 1, 1)
JIWA_PER_KK = 3.5          # asumsi sama dengan PRAREG-DAMPAK.md (BPS ~3,9 nasional; DIBI memakai rasio sendiri)
K_API = 0.9                # peluruhan Antecedent Precipitation Index harian (asumsi, tidak dikalibrasi)
RAMAH = {"User-Agent": "poskobanjir-fitur/1.0"}
JENIS_BANJIR = {"banjir", "banjir_bandang", "banjir_longsor"}
AWAL_GLOFAS = D0

# ---- Curve Number TR-55 (USDA 1986, Tabel 2-2), kondisi AMC II. Kolom = kelompok tanah hidrologi A,B,C,D. ASUMSI: belum dikalibrasi Indonesia.
# Kelas ESA WorldCover v200 -> padanan TR-55 (pilihan penulis, lihat RISET-FITUR-BANJIR.md)
CN_TABEL = {
    10: ("pohon/hutan (woods, fair)", (36, 60, 73, 79)),
    20: ("semak (brush, fair)", (35, 56, 70, 77)),
    30: ("rumput/padang (pasture, fair)", (49, 69, 79, 84)),
    40: ("budidaya/sawah (row crops, straight row, good ~ padi)", (67, 78, 85, 89)),
    50: ("terbangun (residential 1/8 acre, 65% kedap)", (77, 85, 90, 92)),
    60: ("lahan terbuka (newly graded)", (77, 86, 91, 94)),
    80: ("air (kedap)", (98, 98, 98, 98)),
    90: ("lahan basah (ASUMSI: jenuh)", (85, 85, 85, 85)),
    95: ("mangrove (ASUMSI: jenuh)", (85, 85, 85, 85)),
    100: ("lumut/lichen (~ terbuka)", (77, 86, 91, 94)),
    70: ("salju/es (kedap)", (98, 98, 98, 98)),
}
NAMA_LC = {10: "pohon", 20: "semak", 30: "rumput", 40: "budidaya", 50: "terbangun", 60: "terbuka", 70: "salju", 80: "air", 90: "lahan_basah", 95: "mangrove", 100: "lumut"}
KEL_HSG = "ABCD"


# ======================================================================== fungsi murni (diuji di `uji`)
def scs_s(cn):
    """retensi potensial S (mm) = 25400/CN - 254"""
    return 25400.0 / cn - 254.0


def scs_q(p, cn):
    """limpasan SCS-CN (mm): Q=(P-0,2S)^2/(P+0,8S) bila P>0,2S"""
    s = scs_s(cn)
    return 0.0 if p <= 0.2 * s else (p - 0.2 * s) ** 2 / (p + 0.8 * s)


def cn_amc(cn2, kelas):
    """Chow dkk. 1988: AMC I (kering) / II / III (basah)"""
    if kelas == 1:
        return cn2 / (2.281 - 0.01281 * cn2)
    if kelas == 3:
        return cn2 / (0.427 + 0.00573 * cn2)
    return cn2


def amc_dari_a5(a5):
    """TR-55 musim tanam: hujan 5 hari sebelumnya <36 mm -> I, 36-53 -> II, >53 -> III (ASUMSI: dipakai sepanjang tahun)"""
    return 1 if a5 < 36 else (2 if a5 <= 53 else 3)


def api_seri(p, k=K_API):
    """API_t = k*API_{t-1} + P_t; None dianggap 0"""
    out, a = [], 0.0
    for x in p:
        a = k * a + (x or 0.0)
        out.append(a)
    return out


def akum(p, w):
    """jumlah w hari berakhir di hari i (termasuk i); None dianggap 0; None bila belum w hari"""
    c, out = [0.0], []
    for x in p:
        c.append(c[-1] + (x or 0.0))
    for i in range(len(p)):
        out.append(round(c[i + 1] - c[i + 1 - w], 2) if i + 1 >= w else None)
    return out


class Persentil:
    """persentil (0-100, peringkat tengah) sebuah nilai terhadap sampel referensi"""

    def __init__(self, ref):
        self.s = sorted(x for x in ref if x is not None)

    def __call__(self, x):
        if x is None or not self.s:
            return None
        return round(100.0 * (bisect.bisect_left(self.s, x) + bisect.bisect_right(self.s, x)) / (2 * len(self.s)), 1)


def gumbel_kala_ulang(maks_tahunan, T):
    """Gumbel (momen): R_T = mu - beta*ln(-ln(1-1/T)); beta = s*sqrt6/pi, mu = rata - 0,5772*beta"""
    n = len(maks_tahunan)
    m = sum(maks_tahunan) / n
    s = math.sqrt(sum((x - m) ** 2 for x in maks_tahunan) / (n - 1))
    beta = s * math.sqrt(6) / math.pi
    mu = m - 0.5772157 * beta
    return mu - beta * math.log(-math.log(1 - 1.0 / T))


def mononobe(r24, tc_jam):
    """intensitas (mm/jam) I = (R24/24) * (24/tc)^(2/3)"""
    return r24 / 24.0 * (24.0 / tc_jam) ** (2.0 / 3.0)


def tekstur_hsg(clay, sand):
    """kelas tekstur USDA (segitiga disederhanakan) -> kelompok tanah hidrologi A/B/C/D. clay,sand dalam %."""
    silt = 100.0 - clay - sand
    if clay >= 40:
        return "D"
    if clay >= 27.5:
        return "D" if sand < 45 else "D"      # clay loam, silty clay (loam), sandy clay: lambat
    if clay >= 20 and sand > 45:
        return "C"                              # sandy clay loam
    if clay >= 27:
        return "D"
    if sand >= 85 - clay or (sand >= 70 and clay < 15):
        return "A"                              # sand, loamy sand, sandy loam (kasar)
    if silt >= 50 or clay >= 7:
        return "B"                              # loam, silt loam, silt
    return "B"


def hsg_dominan(porsi):
    """{kelompok: porsi} -> kelompok"""
    return max(porsi, key=porsi.get)


def cn_kab(lc, hsg):
    """CN_II kab = rata-rata berbobot porsi kelas tutupan (lc {kode: porsi}) pada kelompok tanah hsg"""
    j = KEL_HSG.index(hsg)
    tot = sum(v for k, v in lc.items() if k in CN_TABEL)
    return sum(v * CN_TABEL[k][1][j] for k, v in lc.items() if k in CN_TABEL) / tot if tot else None


def gabung_kab(bagian):
    """bagian [(nilai, bobot)] -> rata-rata berbobot (agregasi kecamatan -> kabupaten)"""
    w = sum(b for _, b in bagian if _ is not None)
    return sum(n * b for n, b in bagian if n is not None) / w if w else None


def luas_cincin_km2(r):
    """luas (km2) cincin lon/lat, bidang datar dengan faktor cos(lat) di lintang rata-rata"""
    c = math.cos(math.radians(sum(p[1] for p in r) / len(r)))
    a = 0.0
    for (x1, y1), (x2, y2) in zip(r, r[1:] + r[:1]):
        a += x1 * y2 - x2 * y1
    return abs(a) / 2 * 111.32 * 110.57 * c


# ======================================================================== daftar kab
def daftar(semua=False):
    """-> {kab_kode: {...}} urut prioritas (jumlah kejadian banjir logbook menurun). Cache fitur/kab.json."""
    jalur = os.path.join(DIR, "kab_semua.json" if semua else "kab.json")
    if os.path.exists(jalur):
        return json.load(open(jalur))
    import uji_logbook_longsor as U
    from bahaya import kecamatan
    units, kab_nama, _ = U.muat_unit()
    kec = kecamatan()
    pend = json.load(open(os.path.join(AKAR, "public/data/penduduk.json")))["kec"]
    log = json.load(open(os.path.join(AKAR, "public/data/logbook_kejadian.json")))["kejadian"]
    n_lb = {}
    for e in log:
        if e.get("jenis") in JENIS_BANJIR and e.get("kab_kode"):
            n_lb[e["kab_kode"]] = n_lb.get(e["kab_kode"], 0) + 1
    kand = set()
    kj = os.path.join(AKAR, "data/raw_logbook/banjir/model_kab/kandidat.json")
    if os.path.exists(kj):
        d = json.load(open(kj))
        d = d.get("kab", d.get("kandidat", list(d))) if isinstance(d, dict) else d
        kand = {x if isinstance(x, str) else x.get("kab") for x in d}
    else:
        print("kandidat.json (39 kab) tidak ada di data/raw_logbook/banjir/model_kab: hanya kab berlabel logbook", file=sys.stderr)
    per = {}
    for key, u in units.items():
        k = u["kab"]
        if key not in kec:
            continue
        p, gk, gc = key.split("|")
        e = per.setdefault(k, {"kab_kode": k, "nama": kab_nama.get(k), "prov": p, "nama_geo": gk, "kec": []})
        e["kec"].append((kec[key]["lat"], kec[key]["lon"], pend.get(key, 0) or 0))
    out = {}
    for k, e in per.items():
        if not semua and k not in n_lb and k not in kand:
            continue
        pop = sum(c[2] for c in e["kec"])
        bobot = [(c[2] or 1) for c in e["kec"]]
        e["lat"] = round(sum(c[0] * b for c, b in zip(e["kec"], bobot)) / sum(bobot), 4)
        e["lon"] = round(sum(c[1] * b for c, b in zip(e["kec"], bobot)) / sum(bobot), 4)
        pk = max(e["kec"], key=lambda c: c[2])
        e.update(penduduk=pop, n_kec=len(e["kec"]), kec_puncak=[pk[0], pk[1]], n_logbook_banjir=n_lb.get(k, 0), kandidat=k in kand)
        del e["kec"]
        out[k] = e
    out = dict(sorted(out.items(), key=lambda kv: (-kv[1]["n_logbook_banjir"], kv[0])))
    simpan(jalur, out)
    return out


def poligon_kab(k):
    """-> (cincin luar [[lon,lat]...], properti) dari public/geo/kabupaten; None bila nama tak cocok"""
    f = os.path.join(AKAR, "public/geo/kabupaten", f"{k['prov']}.json")
    cinc = []
    for ft in json.load(open(f))["features"]:
        if ft["properties"].get("kab") == k["nama_geo"]:
            g = ft["geometry"]
            cinc += [p[0] for p in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]])]
    return cinc


# ======================================================================== POWER (hujan harian, kelembapan akar)
def power(k):
    f = os.path.join(DIR, "power", f"{k['kab_kode']}.json.gz")
    if os.path.exists(f):
        return json.load(gzip.open(f, "rt"))
    akhir = (dt.date.today() - dt.timedelta(days=1)).strftime("%Y%m%d")
    u = ("https://power.larc.nasa.gov/api/temporal/daily/point?parameters=PRECTOTCORR,GWETROOT&community=AG"
         f"&longitude={k['lon']:.3f}&latitude={k['lat']:.3f}&start={D0:%Y%m%d}&end={akhir}&format=JSON")
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=RAMAH), timeout=240) as r:
                d = json.load(r)["properties"]["parameter"]
            break
        except Exception as e:
            if i == 3:
                raise
            time.sleep(15 * (i + 1))
    os.makedirs(os.path.dirname(f), exist_ok=True)
    with gzip.open(f + ".tmp", "wt") as g:
        json.dump(d, g, separators=(",", ":"))
    os.replace(f + ".tmp", f)
    return d


def deret_power(d, nama):
    """{YYYYMMDD: v} -> (hari0, [v|None]) sampai hari valid terakhir; -999 -> None"""
    s = d.get(nama, {})
    tgl = sorted(t for t, v in s.items() if v is not None and v > -900)
    if not tgl:
        return D0, []
    akhir = dt.datetime.strptime(tgl[-1], "%Y%m%d").date()
    n = (akhir - D0).days + 1
    out = []
    for i in range(n):
        v = s.get((D0 + dt.timedelta(i)).strftime("%Y%m%d"))
        out.append(None if v is None or v < -900 else v)
    return D0, out


def ambil_power(daf, maks):
    sisa = [k for k in daf.values() if not os.path.exists(os.path.join(DIR, "power", f"{k['kab_kode']}.json.gz"))][:maks]
    print(f"power: {len(sisa)} kab diunduh", file=sys.stderr)
    def satu(k):
        try:
            power(k)
            return k["kab_kode"], None
        except Exception as e:
            return k["kab_kode"], str(e)[:120]
    with ThreadPoolExecutor(4) as ex:
        for kode, gal in ex.map(satu, sisa):
            print(f"  {kode} {'ok' if not gal else 'GAGAL ' + gal}", file=sys.stderr)


# ======================================================================== raster statis (HAND, DEM, WorldCover) lewat GDAL
HAND_URL = "https://glo-30-hand.s3.amazonaws.com/v1/2021/Copernicus_DSM_COG_10_{ns}{la:02d}_00_{ew}{lo:03d}_00_HAND.tif"
DEM_URL = "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_{ns}{la:02d}_00_{ew}{lo:03d}_00_DEM/Copernicus_DSM_COG_10_{ns}{la:02d}_00_{ew}{lo:03d}_00_DEM.tif"
WC_URL = "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{ns}{la:02d}{ew}{lo:03d}_Map.tif"
ENV_GDAL = dict(os.environ, GDAL_HTTP_TIMEOUT="120", GDAL_HTTP_MAX_RETRY="4", GDAL_HTTP_RETRY_DELAY="3", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
                GDAL_DISABLE_READDIR_ON_OPEN="TRUE", VSI_CACHE="TRUE")


def ubin(url, la, lo):
    return url.format(ns="N" if la >= 0 else "S", la=abs(la), ew="E" if lo >= 0 else "W", lo=abs(lo))


KUNCI = threading.Lock()


def ada(url):
    with KUNCI:
        return _ada(url)


def _ada(url):
    f = os.path.join(DIR, "ubin_ada.json")
    c = baca(f, {})
    if url not in c:
        try:
            urllib.request.urlopen(urllib.request.Request(url, method="HEAD", headers=RAMAH), timeout=30)
            c[url] = True
        except urllib.error.HTTPError as e:
            if e.code not in (403, 404):
                raise
            c[url] = False
        simpan(f, c)
    return c[url]


def daftar_ubin(url, kotak, langkah):
    x0, y0, x1, y1 = kotak
    out = []
    for la in range(int(math.floor(y0 / langkah)) * langkah, int(math.floor(y1 / langkah)) * langkah + 1, langkah):
        for lo in range(int(math.floor(x0 / langkah)) * langkah, int(math.floor(x1 / langkah)) * langkah + 1, langkah):
            u = ubin(url, la, lo)
            if ada(u):
                out.append("/vsicurl/" + u)
    return out


def gdal(*arg):
    r = subprocess.run(arg, capture_output=True, text=True, env=ENV_GDAL)
    if r.returncode:
        raise RuntimeError(f"{arg[0]} rc={r.returncode}: {(r.stderr + r.stdout).strip()[-300:]}")


def baca_raster(ubins, kotak, W, H, tipe, resampel, tmp, nama):
    """warp ubin -> grid W x H seragam di `kotak`, kembalikan array float32 (NaN bila nodata)"""
    import numpy as np
    if not ubins:
        return np.full((H, W), np.nan, dtype="float32")
    vrt = os.path.join(tmp, nama + ".vrt")
    gdal("gdalbuildvrt", "-q", vrt, *ubins)
    out = os.path.join(tmp, nama + ".bin")
    gdal("gdalwarp", "-q", "-te", *map(str, kotak), "-ts", str(W), str(H), "-r", resampel, "-ot", tipe, "-of", "ENVI", "-dstnodata", "-9999", vrt, out)
    a = np.fromfile(out, dtype={"Float32": "float32", "Byte": "uint8"}[tipe]).reshape(H, W).astype("float32")
    a[a == -9999] = np.nan
    return a


def raster_kab(k):
    """statistik medan + tutupan di dalam poligon kab. -> dict (porsi 0-1 dari piksel darat)"""
    import numpy as np
    cinc = poligon_kab(k)
    if not cinc:
        raise RuntimeError("poligon kab tidak ditemukan")
    xs = [p[0] for r in cinc for p in r]
    ys = [p[1] for r in cinc for p in r]
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    px = max((x1 - x0) / 900.0, (y1 - y0) / 900.0, 0.0009)
    W, H = max(2, int(math.ceil((x1 - x0) / px))), max(2, int(math.ceil((y1 - y0) / px)))
    kotak = (x0, y0, x0 + W * px, y0 + H * px)
    tmp = tempfile.mkdtemp(prefix="fitur_")
    gj = os.path.join(tmp, "kab.geojson")
    json.dump({"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {}, "geometry": {"type": "MultiPolygon", "coordinates": [[r] for r in cinc]}}]}, open(gj, "w"))
    mask_f = os.path.join(tmp, "mask.bin")
    gdal("gdal_rasterize", "-q", "-burn", "1", "-ot", "Byte", "-of", "GTiff", "-te", *map(str, kotak), "-ts", str(W), str(H), gj, mask_f + ".tif")
    gdal("gdal_translate", "--quiet", "-of", "ENVI", mask_f + ".tif", mask_f)
    mask = np.fromfile(mask_f, dtype="uint8").reshape(H, W) > 0
    hand = baca_raster(daftar_ubin(HAND_URL, (x0, y0, x1, y1), 1), kotak, W, H, "Float32", "near", tmp, "hand")
    dem = baca_raster(daftar_ubin(DEM_URL, (x0, y0, x1, y1), 1), kotak, W, H, "Float32", "average", tmp, "dem")
    lc = baca_raster(daftar_ubin(WC_URL, (x0, y0, x1, y1), 3), kotak, W, H, "Byte", "near", tmp, "lc")
    for f in glob.glob(os.path.join(tmp, "*")):
        os.remove(f)
    os.rmdir(tmp)
    return statistik(mask, hand, dem, lc, px, (y0 + y1) / 2)


def statistik(mask, hand, dem, lc, px, lat):
    """array -> dict fitur statis. Murni numpy (diuji di `uji`)."""
    import numpy as np
    dx = px * 111320.0 * math.cos(math.radians(lat))
    dy = px * 110574.0
    km2_px = dx * dy / 1e6
    air = (lc == 80)
    darat = mask & ~np.isnan(hand) & ~air
    r = {"px_m": round((dx + dy) / 2, 0), "n_px_darat": int(darat.sum()), "luas_darat_km2": round(float(darat.sum() * km2_px), 1)}
    if not darat.any():
        return r
    h = hand[darat]
    for t in (1, 2, 5, 10):
        r[f"hand_lt{t}"] = round(float((h < t).mean()), 4)
    r["hand_p50"] = round(float(np.percentile(h, 50)), 1)
    e = dem[darat]
    e = e[~np.isnan(e)]
    if e.size:
        r["elev_p05"], r["elev_p50"], r["elev_p95"] = [round(float(np.percentile(e, q)), 1) for q in (5, 50, 95)]
        r["relief_m"] = round(r["elev_p95"] - r["elev_p05"], 1)
        r["elev_lt10"] = round(float((e < 10).mean()), 4)
        r["elev_lt25"] = round(float((e < 25).mean()), 4)
    gy, gx = np.gradient(np.where(np.isnan(dem), 0, dem), dy, dx)
    lereng = np.degrees(np.arctan(np.hypot(gx, gy)))[darat & ~np.isnan(dem)]
    if lereng.size:
        r["lereng_med_deg"], r["lereng_p90_deg"] = [round(float(np.percentile(lereng, q)), 2) for q in (50, 90)]
    ok = darat & (lc > 0)
    if ok.any():
        v, c = np.unique(lc[ok].astype(int), return_counts=True)
        r["lc"] = {NAMA_LC.get(int(a), str(int(a))): round(float(b / c.sum()), 4) for a, b in zip(v, c)}
        r["lc_kode"] = {str(int(a)): round(float(b / c.sum()), 4) for a, b in zip(v, c)}
        bt = ok & (lc == 50)
        r["terbangun_km2"] = round(float(bt.sum() * km2_px), 2)
        if bt.any():
            for t in (2, 5):
                r[f"terbangun_hand_lt{t}"] = round(float((bt & (hand < t)).sum() / bt.sum()), 4)
        # air permanen (sungai/danau/tambak) berbagi piksel dengan mask: bagian dari luas poligon
        r["air_porsi_poligon"] = round(float((mask & air).sum() / max(1, mask.sum())), 4)
    return r


def ambil_raster(daf, maks):
    f = os.path.join(DIR, "raster.json")
    c = baca(f, {})
    sisa = [k for k in daf.values() if k["kab_kode"] not in c][:maks]
    print(f"tutupan+hand: {len(sisa)} kab", file=sys.stderr)
    def satu(k):
        t = time.time()
        try:
            return k, raster_kab(k), time.time() - t
        except Exception as e:
            return k, str(e), 0
    with ThreadPoolExecutor(4) as ex:   # waktu habis di unduhan GDAL (subprocess), jadi thread cukup
        for k, r, dtk in ex.map(satu, sisa):
            if isinstance(r, str):
                print(f"  {k['kab_kode']} {k['nama']} GAGAL {r}", file=sys.stderr)
                continue
            c[k["kab_kode"]] = r
            print(f"  {k['kab_kode']} {k['nama']} ok {dtk:.0f} dtk", file=sys.stderr)
            simpan(f, c)


# ======================================================================== SoilGrids (kelompok tanah hidrologi)
def ambil_tanah(daf, maks):
    f = os.path.join(DIR, "tanah.json")
    c = baca(f, {})
    sisa = [k for k in daf.values() if k["kab_kode"] not in c][:maks]
    print(f"tanah: {len(sisa)} kab (SoilGrids REST, jeda 14 dtk)", file=sys.stderr)
    for k in sisa:
        la, lo = k["kec_puncak"]
        u = ("https://rest.isric.org/soilgrids/v2.0/properties/query?" + urllib.parse.urlencode(
            [("lon", lo), ("lat", la), ("property", "clay"), ("property", "sand"), ("depth", "0-5cm"), ("depth", "5-15cm"), ("value", "mean")]))
        try:
            d = ambil_json(u, coba=4, batas_waktu=90)
            v = {}
            for ly in d["properties"]["layers"]:
                m = [x["values"]["mean"] for x in ly["depths"] if x["values"].get("mean") is not None]
                v[ly["name"]] = sum(m) / len(m) / ly["unit_measure"]["d_factor"] if m else None
            if v.get("clay") is None or v.get("sand") is None:
                c[k["kab_kode"]] = {"lat": la, "lon": lo, "hsg": None}   # titik di laut/badan air/kota tanpa data
            else:
                c[k["kab_kode"]] = {"lat": la, "lon": lo, "clay": round(v["clay"], 1), "sand": round(v["sand"], 1), "hsg": tekstur_hsg(v["clay"], v["sand"])}
            print(f"  {k['kab_kode']} {k['nama']} {c[k['kab_kode']]}", file=sys.stderr)
            simpan(f, c)
        except Exception as e:
            print(f"  {k['kab_kode']} GAGAL {str(e)[:100]}", file=sys.stderr)
        time.sleep(14)


# ======================================================================== GloFAS (Open-Meteo flood API)
FLOOD = "https://flood-api.open-meteo.com/v1/flood"


def titik_probe(k, cinc):
    xs = [p[0] for r in cinc for p in r]
    ys = [p[1] for r in cinc for p in r]
    x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
    st = max(0.05, (x1 - x0) / 5, (y1 - y0) / 5)
    out, y = [], y0 + st / 2
    while y < y1:
        x = x0 + st / 2
        while x < x1:
            if any(_di_dalam(x, y, r) for r in cinc):
                out.append((round(y, 3), round(x, 3)))
            x += st
        y += st
    return (out or [(k["lat"], k["lon"])])[:36]


def pilih_titik_sungai(k, titik):
    """probe 14 hari (bobot ~ jumlah titik) -> titik GloFAS (sel 0,05) dengan debit rata-rata terbesar di dalam kab"""
    cinc = poligon_kab(k)
    pts = titik_probe(k, cinc)
    q = {"latitude": ",".join(str(p[0]) for p in pts), "longitude": ",".join(str(p[1]) for p in pts), "daily": "river_discharge",
         "start_date": "2021-02-01", "end_date": "2021-02-14"}
    d = ambil_json(FLOOD + "?" + urllib.parse.urlencode(q), coba=3)
    d = d if isinstance(d, list) else [d]
    best = None
    for x in d:
        v = [a for a in x["daily"]["river_discharge"] if a is not None]
        if v and (best is None or sum(v) / len(v) > best["rata14"]):
            best = {"lat": x["latitude"], "lon": x["longitude"], "rata14": round(sum(v) / len(v), 2)}
    return {**best, "n_probe": len(pts)} if best else {"lat": None, "lon": None, "n_probe": len(pts)}


def ambil_glofas(daf, maks):
    ft = os.path.join(DIR, "glofas_titik.json")
    tit = baca(ft, {})
    os.makedirs(os.path.join(DIR, "glofas"), exist_ok=True)
    n = 0
    for k in daf.values():
        kode = k["kab_kode"]
        fs = os.path.join(DIR, "glofas", f"{kode}.json.gz")
        if os.path.exists(fs):
            continue
        if n >= maks:
            break
        try:
            if kode not in tit:
                tit[kode] = pilih_titik_sungai(k, None)
                simpan(ft, tit)
                time.sleep(1.5)
            t = tit[kode]
            if t["lat"] is None:
                with gzip.open(fs, "wt") as g:
                    json.dump({}, g)
                continue
            akhir = (dt.date.today() - dt.timedelta(days=2)).isoformat()
            q = {"latitude": t["lat"], "longitude": t["lon"], "daily": "river_discharge", "start_date": AWAL_GLOFAS.isoformat(), "end_date": akhir}
            d = ambil_json(FLOOD + "?" + urllib.parse.urlencode(q), coba=3, batas_waktu=300)
            seri = dict(zip(d["daily"]["time"], d["daily"]["river_discharge"]))
            with gzip.open(fs + ".tmp", "wt") as g:
                json.dump(seri, g, separators=(",", ":"))
            os.replace(fs + ".tmp", fs)
            n += 1
            print(f"  glofas {kode} {k['nama']} titik {t['lat']},{t['lon']} ok", file=sys.stderr)
            time.sleep(2)
        except KuotaHabis as e:
            if "Hourly" in str(e) or "Minutely" in str(e):
                print("  kuota jam/menit habis, tunggu 20 menit", file=sys.stderr)
                time.sleep(1200)
                return ambil_glofas(daf, maks - n)
            print(f"BERHENTI: kuota Open-Meteo habis ({str(e)[:100]}); ulangi `ambil glofas` nanti, cache dipakai ulang", file=sys.stderr)
            return
        except Exception as e:
            print(f"  glofas {kode} GAGAL {str(e)[:120]}", file=sys.stderr)


# ======================================================================== susun
def kapasitas(maks_tahun, cn2, kota):
    """R2,R5 (Gumbel), Q2,Q5 (SCS-CN pada CN_II), intensitas Mononobe tc=1 jam; kala ulang rencana 5 (kota) atau 2 (selainnya)"""
    r2, r5 = gumbel_kala_ulang(maks_tahun, 2), gumbel_kala_ulang(maks_tahun, 5)
    out = {"r2_mm": round(r2, 1), "r5_mm": round(r5, 1), "n_tahun_maks": len(maks_tahun),
           "i2_tc1_mmjam": round(mononobe(r2, 1), 1), "i5_tc1_mmjam": round(mononobe(r5, 1), 1), "kala_ulang_rencana": 5 if kota else 2}
    if cn2:
        out["q2_mm"], out["q5_mm"] = round(scs_q(r2, cn2), 1), round(scs_q(r5, cn2), 1)
        out["kapasitas_mm"] = out["q5_mm"] if kota else out["q2_mm"]
    return out


def maks_per_tahun(p):
    m = {}
    for i, x in enumerate(p):
        if x is not None:
            y = (D0 + dt.timedelta(i)).year
            m[y] = max(m.get(y, 0), x)
    n = len(p)
    akhir = (D0 + dt.timedelta(n - 1)).year
    return [v for y, v in sorted(m.items()) if y < akhir or (D0 + dt.timedelta(n - 1)).month >= 10]  # tahun berjalan dibuang bila sebelum Oktober


def susun():
    daf = daftar(semua=os.path.exists(os.path.join(DIR, "kab_semua.json")) and not os.path.exists(os.path.join(DIR, "kab.json")))
    ras, tan, tit = baca(os.path.join(DIR, "raster.json"), {}), baca(os.path.join(DIR, "tanah.json"), {}), baca(os.path.join(DIR, "glofas_titik.json"), {})
    das = {}
    for f in glob.glob(os.path.join(AKAR, "public/banjir/data/bukti/*.json")):
        b = json.load(open(f))
        if b.get("kunci") and isinstance(b.get("das"), dict):
            pp, nm = b["kunci"].split("|", 1)
            das[(pp, nm)] = b["das"].get("luas_km2")
    statis, ringkas = {}, {}
    # kelompok tanah hilang (SoilGrids gagal) -> modus provinsi, lalu modus nasional; ditandai `cn_imputasi`
    from collections import Counter
    hs = {kd: (v or {}).get("hsg") for kd, v in tan.items() if (v or {}).get("hsg")}
    modus_nas = Counter(hs.values()).most_common(1)[0][0] if hs else None
    modus_prov = {}
    for pv in {kd[:2] for kd in hs}:
        modus_prov[pv] = Counter(h for kd, h in hs.items() if kd[:2] == pv).most_common(1)[0][0]
    os.makedirs(os.path.join(DIR, "harian"), exist_ok=True)
    for kode, k in daf.items():
        fp = os.path.join(DIR, "power", f"{kode}.json.gz")
        if not os.path.exists(fp):
            continue
        pw = json.load(gzip.open(fp, "rt"))
        _, p = deret_power(pw, "PRECTOTCORR")
        _, gw = deret_power(pw, "GWETROOT")
        r = ras.get(kode, {})
        cinc = poligon_kab(k)
        luas = round(sum(luas_cincin_km2(c) for c in cinc), 1) if cinc else None
        hsg = (tan.get(kode) or {}).get("hsg")
        imput = None
        if not hsg and r.get("lc_kode"):
            hsg, imput = modus_prov.get(kode[:2]) or modus_nas, ("provinsi" if modus_prov.get(kode[:2]) else "nasional")
        cn2 = cn_kab(r["lc_kode"] and {int(a): b for a, b in r["lc_kode"].items()}, hsg) if r.get("lc_kode") and hsg else None
        kota = (k["nama"] or "").lower().startswith("kota")
        s = {"kab_kode": kode, "nama": k["nama"], "prov": k["prov"], "lat": k["lat"], "lon": k["lon"], "luas_poligon_km2": luas,
             "penduduk": k["penduduk"], "kk_proksi": round(k["penduduk"] / JIWA_PER_KK), "kepadatan_jiwa_km2": round(k["penduduk"] / luas, 1) if luas else None,
             "n_logbook_banjir": k["n_logbook_banjir"], "tanah": tan.get(kode), "cn_ii": round(cn2, 1) if cn2 else None, "cn_imputasi": imput, **{a: b for a, b in r.items() if a != "lc_kode"}}
        if r.get("lc_kode"):
            s["lc_kode"] = r["lc_kode"]
        lowland = r.get("terbangun_hand_lt2")
        if lowland is not None:
            s["penduduk_hand2_proksi"] = round(k["penduduk"] * lowland)
            s["kk_hand2_proksi"] = round(k["penduduk"] * lowland / JIWA_PER_KK)
        mt = maks_per_tahun(p)
        if len(mt) >= 8:
            s.update(kapasitas(mt, cn2, kota))
        # debit
        t = tit.get(kode) or {}
        fs = os.path.join(DIR, "glofas", f"{kode}.json.gz")
        gl = json.load(gzip.open(fs, "rt")) if os.path.exists(fs) else None
        s["glofas_titik"] = {a: t.get(a) for a in ("lat", "lon", "n_probe")} if t else None
        s["das_hydrobasins_km2"] = next((v for (pp, kb), v in das.items() if kb == k["nama_geo"] and pp in (None, k["prov"])), None)
        # ---- harian
        n = len(p)
        hari = [(D0 + dt.timedelta(i)).isoformat() for i in range(n)]
        a3, a7, a30, a5 = akum(p, 3), akum(p, 7), akum(p, 30), akum(p, 5)
        api = api_seri(p)
        pc3, pc7 = Persentil(a3), Persentil(a7)
        q = [gl.get(h) if gl else None for h in hari]
        pq = Persentil(q) if gl else None
        qm = (sum(x for x in q if x is not None) / max(1, sum(1 for x in q if x is not None))) if gl else None
        ro3, lebih = [], []
        for i in range(n):
            if a3[i] is None or not cn2:
                ro3.append(None); lebih.append(None)
                continue
            cnn = cn_amc(cn2, amc_dari_a5((a5[i] or 0) - (p[i] or 0)))      # kelembapan awal = hujan 5 hari TERMASUK hari ini dikurangi hari ini
            rr = scs_q(a3[i], cnn)
            ro3.append(round(rr, 2))
            lebih.append(round(max(0.0, rr - s["kapasitas_mm"]), 2) if "kapasitas_mm" in s else None)
        kol = {"p": [None if x is None else round(x, 2) for x in p], "a3": a3, "a7": a7, "a30": a30, "api": [round(x, 1) for x in api],
               "p_pct_a3": [pc3(x) for x in a3], "p_pct_a7": [pc7(x) for x in a7], "gwet_akar": [None if x is None else round(x, 3) for x in gw] + [None] * (n - len(gw)),
               "ro3_mm": ro3, "lebih_kap_mm": lebih}
        if gl:
            kol["q_m3s"] = [None if x is None else round(x, 2) for x in q]
            kol["q_pct"] = [pq(x) for x in q]
            kol["q_rasio_rata"] = [None if (x is None or not qm) else round(x / qm, 3) for x in q]
            s["q_rata_m3s"] = round(qm, 2) if qm else None
            s["q_p95_m3s"] = round(sorted(x for x in q if x is not None)[int(0.95 * sum(1 for x in q if x is not None))], 1) if qm else None
            s["q_rata_per_luas_mm_hari"] = round(qm * 86.4 / luas, 3) if qm and luas else None
        simpan(os.path.join(DIR, "harian", f"{kode}.json"), {"kab_kode": kode, "hari0": D0.isoformat(), "n": n, "kolom": kol})
        statis[kode] = s
        ringkas[kode] = {"n_hari": n, "glofas": bool(gl), "cn": bool(cn2), "raster": bool(r), "tanah": bool(hsg)}
    simpan(os.path.join(DIR, "statis.json"), {"dibuat": dt.datetime.now().isoformat(timespec="minutes"), "n_kab": len(statis),
                                              "asumsi": {"jiwa_per_kk": JIWA_PER_KK, "k_api": K_API, "cn_tabel": {str(a): v for a, v in CN_TABEL.items()}}, "kab": statis})
    cak = {a: sum(1 for v in ringkas.values() if v[a]) for a in ("glofas", "cn", "raster", "tanah")}
    print(f"statis.json: {len(statis)} kab; cakupan {cak}", file=sys.stderr)


# ======================================================================== swauji
def uji():
    import numpy as np
    # SCS-CN
    assert abs(scs_s(80) - 63.5) < 1e-9, scs_s(80)
    assert scs_q(10, 80) == 0.0                                     # P <= 0,2S = 12,7
    assert abs(scs_q(100, 80) - (100 - 12.7) ** 2 / (100 + 50.8)) < 1e-9
    assert abs(scs_q(100, 80) - 50.5) < 0.1, scs_q(100, 80)         # nilai buku: ~50,5 mm
    assert scs_q(50, 98) > scs_q(50, 60) > 0 and scs_q(0, 98) == 0
    assert cn_amc(80, 1) < 80 < cn_amc(80, 3) and abs(cn_amc(80, 1) - 63.7) < 0.2 and abs(cn_amc(80, 3) - 90.4) < 0.2
    assert [amc_dari_a5(x) for x in (10, 36, 53, 60)] == [1, 2, 2, 3]
    # API
    a = api_seri([10, 0, 0, None, 5])
    assert [round(x, 3) for x in a] == [10.0, 9.0, 8.1, 7.29, 11.561], a
    # akum
    assert akum([1, 2, 3, None, 5], 3) == [None, None, 6.0, 5.0, 8.0]
    # persentil
    pr = Persentil([1, 2, 3, 4, 5])
    assert pr(3) == 50.0 and pr(0) == 0.0 and pr(9) == 100.0 and pr(None) is None
    # Gumbel: sampel dari kuantil tepat Gumbel(mu=100, beta=20) -> R_T kembali
    n = 400
    amb = [100 - 20 * math.log(-math.log((i + 0.5) / n)) for i in range(n)]
    assert abs(gumbel_kala_ulang(amb, 2) - (100 - 20 * math.log(-math.log(0.5)))) < 2.5
    assert gumbel_kala_ulang(amb, 5) > gumbel_kala_ulang(amb, 2)
    assert abs(mononobe(100, 1) - 100 / 24 * 24 ** (2 / 3)) < 1e-9 and abs(mononobe(100, 24) - 100 / 24) < 1e-9
    # tanah
    assert tekstur_hsg(5, 90) == "A" and tekstur_hsg(10, 40) == "B" and tekstur_hsg(55, 15) == "D" and tekstur_hsg(25, 55) == "C"
    # CN kab: 50% hutan + 50% terbangun, tanah B
    assert abs(cn_kab({10: 0.5, 50: 0.5}, "B") - (60 + 85) / 2) < 1e-9
    assert cn_kab({}, "B") is None
    # agregasi
    assert abs(gabung_kab([(10, 1), (20, 3), (None, 5)]) - 17.5) < 1e-9 and gabung_kab([(None, 1)]) is None
    # luas: 1 x 1 derajat di ekuator ~ 111,32 x 110,57
    assert abs(luas_cincin_km2([[0, 0], [1, 0], [1, 1], [0, 1]]) - 111.32 * 110.57 * math.cos(math.radians(0.5))) < 1
    # statistik raster sintetis: 10x10, kab = seluruhnya, HAND 0..9 per kolom, separuh kiri terbangun, satu baris air
    W = H = 10
    hand = np.tile(np.arange(10, dtype="float32"), (10, 1))
    dem = hand * 2 + 5
    lc = np.full((H, W), 10, dtype="float32"); lc[:, :5] = 50; lc[0, :] = 80
    st = statistik(np.ones((H, W), bool), hand, dem, lc, 0.001, 0.0)
    assert st["n_px_darat"] == 90, st
    assert abs(st["hand_lt1"] - 0.1) < 1e-9 and abs(st["hand_lt5"] - 0.5) < 1e-9
    assert abs(st["lc"]["terbangun"] - 0.5) < 1e-9 and abs(st["terbangun_hand_lt2"] - 0.4) < 1e-9, st
    assert abs(st["air_porsi_poligon"] - 0.1) < 1e-9
    # kapasitas
    kp = kapasitas(amb[::4], 80, True)
    assert kp["kapasitas_mm"] == kp["q5_mm"] >= kp["q2_mm"] and kp["kala_ulang_rencana"] == 5
    # deret_power: -999 jadi None, dipotong di hari valid terakhir
    h0, s = deret_power({"X": {"20050101": 1.0, "20050102": -999, "20050103": 2.0, "20050104": -999}}, "X")
    assert s == [1.0, None, 2.0], s
    print("ok fitur_banjir")


def utama(a):
    if len(a) < 2 or a[1] not in ("ambil", "susun", "uji"):
        print(__doc__)
        return
    if a[1] == "uji":
        return uji()
    os.makedirs(DIR, exist_ok=True)
    if a[1] == "susun":
        return susun()
    semua = "--semua" in a
    maks = int(a[a.index("--maks") + 1]) if "--maks" in a else 10 ** 6
    pos = [x for i, x in enumerate(a[2:], 2) if not x.startswith("--") and a[i - 1] != "--maks"]
    bag = pos[0].split(",") if pos else ["daftar", "power", "tutupan", "tanah", "glofas"]
    daf = daftar(semua)
    print(f"{len(daf)} kab", file=sys.stderr)
    for b in bag:
        {"daftar": lambda: None, "power": lambda: ambil_power(daf, maks), "tutupan": lambda: ambil_raster(daf, maks), "hand": lambda: ambil_raster(daf, maks),
         "tanah": lambda: ambil_tanah(daf, maks), "glofas": lambda: ambil_glofas(daf, maks)}[b]()


if __name__ == "__main__":
    utama(sys.argv)
