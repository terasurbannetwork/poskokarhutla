"""LAB: model LUAS TERBAKAR terintegrasi + tabel kecocokan antartahun -> public/data/lab/luas.json, luas_ringkas.md, luas_fitur.json

Tujuan (laporan ke Presiden): luas terbakar Indonesia per provinsi-tahun yang bisa DIPERTANGGUNGJAWABKAN, dengan selang, diuji leave-one-year-out
(LOYO) dan leave-one-province-out (LOPO), diadu dengan M0 (produksi: titik S-NPP x 4,3 ha), dan ditabelkan lintas tahun 2001-2026 terhadap tiga
acuan yang saling berselisih (SiPongi, GWIS, Gaveau 2019). Ini LAB: tidak dipakai produksi, tidak mengubah satu pun berkas produksi.

Fungsi produksi dipakai ulang apa adanya: harian.dbscan / firespot / pix / tgl, aturan.gunung_api, titik_palsu.sel / sel_industri,
wilayah.Wilayah / PROVINSI / PRIORITAS, insiden.faktor_luas (M1). Pembaca citra Gaveau memakai ujibanding_firespot.unduh_zenodo / muat_citra.
Hanya jalur raster/netCDF opsional yang memakai numpy/rasterio/netCDF4 (import terlindungi, hanya job lab); selebihnya stdlib.

PAKAI
  python3 scripts/data/lab_luas.py uji       self-check sintetis TANPA jaringan (angka dihitung tangan pada kasus kecil)
  python3 scripts/data/lab_luas.py jalan     unduh + agregasi + latih + tulis (butuh jaringan; FIRMS_MAP_KEY hanya untuk cadangan area API / 2026)
  python3 scripts/data/lab_luas.py ringkas   tulis ulang luas_ringkas.md dari luas.json
Batas waktu: env LAB_MENIT (bawaan 30). Kemajuan disimpan di public/data/lab/luas_fitur.json (agregat per sensor-tahun, ikut di-commit)
sehingga putaran berikutnya melanjutkan; yang belum selesai ditulis di `belum_dikerjakan`.

URL berkunci FIRMS TIDAK pernah dicetak: semua pesan galat lewat redaksi().
"""
import bisect, csv, datetime as dt, glob, gzip, hashlib, io, json, math, os, random, re, statistics, sys, time, urllib.error, urllib.request, zipfile

sys.path.insert(0, os.path.dirname(__file__))
import aturan as A
import harian as H
import insiden as INS
import titik_palsu as TP
from wilayah import AKAR, PRIORITAS, PROVINSI, Wilayah

UTC = dt.timezone.utc
PUB = os.path.join(AKAR, "public/data")
OUT = os.path.join(PUB, "lab")
RAW = os.path.join(AKAR, "data/raw/lab")
UA = {"User-Agent": "poskokarhutla-lab/1.0 (+github.com/pangantara/poskokarhutla)"}
BBOX = (94.0, -11.5, 141.5, 6.5)  # lon0, lat0, lon1, lat1
FAKTOR_TITIK = 4.3          # ha per titik S-NPP (laporan.json luas_banding)
MIN_TRAIN_HA, MIN_EVAL_HA = 100.0, 1000.0
NUSANTARA_2026 = 1_916_588  # ha, Nusantara Atlas Jan-Sep 2026 nasional; rujukan berita AFP, BUKAN data yang kita ukur
OMISI_LIT = (0.52, 0.57, 0.62)   # GWIS kurang hitung 52-62% di Indonesia (rentang literatur; tengah 57%)
GRUP = {"65": "64", "93": "91", "94": "91", "95": "91", "96": "92"}   # GWIS tak memisahkan; pemetaan sama dengan laporan.json `gabung`
KELAS_PX = (1, 2, 4, 10, 30, 100)         # batas bawah kelas ukuran cluster (piksel unik)
KELAS_TUTUP = ("g", "h", "l")             # gambut, hutan (kawasan hutan non-gambut), lain
KLS_KEYS = ["k%d%s" % (k, c) for k in range(len(KELAS_PX)) for c in KELAS_TUTUP]
KLS_MID = (1.0, 2.5, 6.0, 17.0, 55.0, 150.0)
TAHUN_SEL = {2019}                        # sel 0,25 derajat hanya untuk Gaveau 2019
SENSOR_ARSIP = {                          # sensor -> (nama produk FIRMS, tahun pertama, produk alternatif)
    "M": ("modis", 2001, ("modis",)),
    "N": ("viirs-snpp", 2012, ("viirs-snpp",)),
    "N20": ("viirs-noaa20", 2018, ("viirs-noaa20", "viirs-jpss1")),
    "N21": ("viirs-noaa21", 2023, ("viirs-noaa21", "viirs-jpss2")),
}
API_SUMBER = {"M": ("MODIS_SP", "MODIS_NRT"), "N": ("VIIRS_SNPP_SP", "VIIRS_SNPP_NRT"),
              "N20": ("VIIRS_NOAA20_SP", "VIIRS_NOAA20_NRT"), "N21": ("VIIRS_NOAA21_SP", "VIIRS_NOAA21_NRT")}
SERI = {"N": (2012, 2026), "M": (2003, 2026)}   # tahun pelatihan/validasi per seri (MODIS Aqua baru Juli 2002, jadi 2001-2002 Terra saja)
TAHUN_TABEL = list(range(2001, 2027))
FIRMS_DASAR = "https://firms.modaps.eosdis.nasa.gov"

KRITERIA = {
    "ditulis_sebelum_menghitung": True,
    "unit_evaluasi": "provinsi(-gabungan GWIS) x tahun dengan acuan >= %d ha; leave-one-year-out (LOYO), model dilatih tanpa tahun uji" % MIN_EVAL_HA,
    "K1_mape": {"ambang": 0.30, "arti": "MAPE (rata-rata |pred-acuan|/acuan) <= 30% terhadap acuan GABUNGAN, LOYO"},
    "K2_gaveau_2019": {"rasio_median": [0.7, 1.4], "korelasi_log_min": 0.7,
                       "arti": "tahun 2019 diramal tanpa melihat 2019 (LOYO; koreksi omisi GWIS pun tanpa Gaveau): median(pred/Gaveau) 0,7-1,4 dan korelasi log >= 0,7"},
    "K3_cakupan": {"rentang": [0.70, 0.90], "nominal": 0.80, "arti": "cakupan selang P10-P90 (konformal silang per tahun) 70-90%"},
    "dipilih": "model terbaik yang lolos K1, K2, K3 sekaligus (MAPE terendah); acuan latih yang boleh dipilih: sipongi, gwis, gabungan. Bila tak ada yang lolos: dikatakan, tidak ada model terpilih",
    "tidak_dipilih": "acuan latih 'gaveau' (satu tahun) hanya dilaporkan",
    "pembanding_wajib": "M0",
    "lonjakan_antartahun": "faktor >= 2x dibanding tahun sebelumnya",
    "pita_tally": "P50 model di dalam [min, maks] acuan yang tersedia (SiPongi, GWIS, Gaveau 2019, GFED5, Nusantara 2026 nasional)",
    "rasio_historis_tally": "luas/hotspot dan luas/firespot di dalam P5-P95 tahun-tahun lain pada unit yang sama (min 5 tahun)",
}

JUJUR = [
    "Acuan saling berselisih: GWIS (MCD64A1, 500 m) kurang hitung luas Indonesia 52-62% (kebakaran kecil, tertutup asap/awan, gambut); Gaveau dkk. 2021 (Sentinel-2 20 m) 2019 jauh di atas SiPongi dan GWIS.",
    "SiPongi (KLHK) TIDAK independen dari titik panas: indikasinya diturunkan dari titik panas + verifikasi; melatih model titik-panas terhadap SiPongi bersifat melingkar. M0/M1 pun dikalibrasi ke SiPongi.",
    "GWIS adalah batas bawah, bukan kebenaran. Acuan gabungan = Gaveau (2019) atau GWIS x koreksi omisi yang ditaksir dari rasio Gaveau/GWIS 2019; koreksi satu-tahun itu diandaikan berlaku di tahun lain (tak teruji).",
    "Gaveau hanya tersedia untuk 2019, sehingga satu-satunya uji luar-sampel terhadap citra ber-resolusi tinggi adalah satu tahun El Nino ekstrem; tahun basah tak punya acuan citra.",
    "Pergantian sensor: MODIS Terra 2000/Aqua Juli 2002 (jadi 2001-2002 setengah), S-NPP VIIRS 375 m sejak 2012, NOAA-20 sejak 2018, NOAA-21 sejak 2023; hitungan titik antar sensor tidak setara. Model dilatih per seri (N = S-NPP, M = MODIS) agar definisi konstan.",
    "Selang P10-P90 berasal dari residu konformal silang antar-tahun; residu satu tahun berkorelasi, jadi cakupan bisa kurang dari nominal. Selang nasional = jumlah kuantil provinsi (asumsi komonoton, konservatif).",
    "Papua/Papua Barat dilatih sebagai gabungan (91+93+94+95, 92+96) karena GWIS tak memisahkan; Kaltara dihitung di Kaltim. Batas provinsi pada titik memakai sel 0,01 derajat (galat sekitar 1 km di perbatasan).",
    "Nusantara Atlas 1.916.588 ha (Jan-Sep 2026, nasional) adalah angka berita (AFP), bukan data yang kita ukur ulang.",
    "Perkiraan 2026 memakai model yang dilatih pada tahun penuh, padahal data 2026 baru s.d. Oktober (musim belum usai) dan versi Jan-Sep (periode Nusantara Atlas) lebih pendek lagi, jadi bias rendah.",
    "Agregasi Gaveau per cluster (kecocokan petak terbakar dengan cluster DBSCAN) TIDAK dikerjakan di sini; sudah dicakup scripts/data/ujibanding_firespot.py. Di sini hanya per provinsi dan per sel 0,25 derajat.",
    "Sel 0,25 derajat Gaveau tanpa titik panas tidak terjangkau model; luasnya dilaporkan terpisah (ha_gaveau_tanpa_titik).",
]

FITUR_DAFTAR = {
    "titik": ["n0", "n1", "n2", "n", "n_nh (n1+n2)"],
    "piksel": ["px (piksel unik 375 m / 1 km)", "px_tol (piksel unik bertoleransi, sel 2x)"],
    "cluster": ["ncl", "nfs (firespot R0 = harian.firespot 'ya')", "cl_med", "cl_p90", "cl_p100 (porsi cluster >= 100 piksel)", "pxcl100 (porsi piksel di cluster >= 100)",
                "dur_med", "dur_p90 (hari)", "hari (hari unik terdeteksi)", "k<kelas><g|h|l> (jumlah cluster 6 kelas ukuran x gambut/hutan/lain)"],
    "radiasi": ["frp", "frp_px", "malam (porsi deteksi malam)"],
    "lahan": ["gb (porsi titik di gambut)", "ks (konsesi)", "ht (kawasan hutan)", "kanal_dens (km/km2, 9 provinsi)", "wc_* (ESA WorldCover 2021)", "hilang012 (Hansen: porsi hilang hutan 0-2 tahun)"],
    "iklim": ["oni_jas", "oni_aso", "dmi_jas", "hujan_mm (CHIRPS Jul-Okt)", "hujan_z (anomali z antartahun)"],
}


# ================================================================ umum
def redaksi(s):
    """Sensor kunci FIRMS dari teks apa pun (URL /csv/<kunci>/, MAP_KEY=, nilai env FIRMS_MAP_KEY)."""
    s = re.sub(r"(/csv/)[^/\s?'\"]+", r"\1***", str(s))
    s = re.sub(r"(MAP_KEY=)[^&\s'\"]+", r"\1***", s)
    k = os.environ.get("FIRMS_MAP_KEY")
    return s.replace(k, "***") if k else s


def log(*a):
    print(*[redaksi(x) for x in a], file=sys.stderr, flush=True)


class Anggaran:
    def __init__(self, menit):
        self.t0, self.total = time.time(), menit * 60.0

    def terpakai(self):
        return time.time() - self.t0

    def sisa(self):
        return self.total - self.terpakai()

    def lewat(self, porsi):
        return self.terpakai() > porsi * self.total


def kuantil(xs, q):
    xs = sorted(xs)
    if not xs:
        return None
    p = q * (len(xs) - 1)
    a = int(math.floor(p))
    b = min(a + 1, len(xs) - 1)
    return xs[a] + (xs[b] - xs[a]) * (p - a)


def median(xs):
    return kuantil(xs, 0.5)


def pearson(a, b):
    n = len(a)
    if n < 3:
        return None
    ma, mb = sum(a) / n, sum(b) / n
    sa = math.sqrt(sum((x - ma) ** 2 for x in a))
    sb = math.sqrt(sum((x - mb) ** 2 for x in b))
    return None if sa == 0 or sb == 0 else sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (sa * sb)


def bulat(x, n=4):
    if isinstance(x, float):
        if x != x or x in (float("inf"), float("-inf")):
            return None
        return round(x, n)
    return x


def grup(kode):
    return GRUP.get(kode, kode)


def prioritas_grup():
    out = []
    for k in PRIORITAS:
        g = grup(k)
        if g not in out:
            out.append(g)
    return out


def nama_grup(g):
    return {"91": "Papua (gabungan 91/93/94/95)", "92": "Papua Barat (gabungan 92/96)", "64": "Kalimantan Timur (+Kaltara)"}.get(g) or PROVINSI.get(g, g)


# ================================================================ unduh
BATAS_BYTE = 2 * 2 ** 30  # satu unduhan > 2 GiB = dihentikan (disk runner terbatas)


def ambil_ke(url, jalur, batas_dtk=120, jenis=None, batas_byte=BATAS_BYTE):
    """Unduh url -> jalur lewat berkas sementara; galat dibersihkan dari kunci. jenis: 'csv' | 'zip' | None (validasi isi).
    Hanya https (urllib juga menerima file:// dan ftp://), dan dibatasi batas_byte."""
    if not isinstance(url, str) or not url.startswith("https://"):
        raise RuntimeError("url ditolak: bukan https")
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    tmp = jalur + ".bagian"
    t0 = time.time()
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r, open(tmp, "wb") as f:
            while True:
                b = r.read(1 << 20)
                if not b:
                    break
                f.write(b)
                if f.tell() > batas_byte:
                    raise ValueError("lewat %d byte" % batas_byte)
                if time.time() - t0 > batas_dtk:
                    raise TimeoutError("lewat %d dtk" % batas_dtk)
        if jenis == "zip" and not zipfile.is_zipfile(tmp):
            raise ValueError("bukan zip")
        if jenis == "csv":
            with open(tmp, "rb") as f:
                if not f.read(64).lstrip().lower().startswith(b"latitude"):
                    raise ValueError("bukan csv FIRMS")
        if os.path.getsize(tmp) == 0:
            raise ValueError("kosong")
        os.replace(tmp, jalur)
    except Exception as e:  # noqa: BLE001
        if os.path.exists(tmp):
            os.remove(tmp)
        raise RuntimeError(redaksi("%s: %s" % (type(e).__name__, e))) from None
    return jalur


def ambil_teks(url, coba=3, jeda=5.0, batas=90):
    gal = None
    for i in range(coba):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=batas) as r:
                return r.read(64 * 2 ** 20).decode("utf-8", "replace")  # teks API/CSV kecil: batas 64 MiB
        except Exception as e:  # noqa: BLE001
            gal = RuntimeError(redaksi("%s: %s" % (type(e).__name__, e)))
            time.sleep(jeda * (i + 1))
    raise gal from None


def kunci_firms():
    return os.environ.get("FIRMS_MAP_KEY") or None


# ================================================================ baca FIRMS
def _konf(sensor, s):
    s = (s or "").strip().lower()
    if sensor == "M":
        try:
            v = float(s)
        except ValueError:
            return None
        return 0 if v < 30 else 1 if v < 80 else 2
    return {"l": 0, "n": 1, "h": 2}.get(s[:1])


def titik_dari_baris(baris, sensor, mulai=None, akhir=None):
    """Iterator baris dict CSV FIRMS -> titik {lat, lon, t(UTC), c 0|1|2, px km, dn, frp, s, ty}. Buang tipe != 0, di luar kotak Indonesia."""
    hari = {}
    for r in baris:
        d = r.get("acq_date")
        if not d or (mulai and d < mulai) or (akhir and d > akhir):
            continue
        try:
            la, lo = float(r["latitude"]), float(r["longitude"])
        except (KeyError, ValueError):
            continue
        if not (BBOX[0] <= lo <= BBOX[2] and BBOX[1] <= la <= BBOX[3]):
            continue
        ty = (r.get("type") or "").strip()
        if ty not in ("", "0"):
            continue
        c = _konf(sensor, r.get("confidence"))
        if c is None:
            continue
        b = hari.get(d)
        if b is None:
            b = hari[d] = dt.datetime(int(d[:4]), int(d[5:7]), int(d[8:10]), tzinfo=UTC)
        j = (r.get("acq_time") or "0").strip().zfill(4)
        try:
            px = max(float(r.get("scan") or 0.4), float(r.get("track") or 0.4))
        except ValueError:
            px = 0.4
        try:
            frp = float(r.get("frp") or 0)
        except ValueError:
            frp = 0.0
        yield {"lat": la, "lon": lo, "t": b + dt.timedelta(hours=int(j[:2]), minutes=int(j[2:])), "c": c, "px": px,
               "dn": (r.get("daynight") or "D").strip().upper()[:1], "frp": frp, "s": sensor}


def baca_firms(jalur, sensor, mulai=None, akhir=None):
    """CSV atau ZIP (semua .csv di dalamnya) -> list titik."""
    out = []
    if zipfile.is_zipfile(jalur):
        with zipfile.ZipFile(jalur) as z:
            for m in z.namelist():
                if m.lower().endswith(".csv"):
                    with z.open(m) as f:
                        out.extend(titik_dari_baris(csv.DictReader(io.TextIOWrapper(f, encoding="utf-8", errors="replace")), sensor, mulai, akhir))
    else:
        with open(jalur, encoding="utf-8", errors="replace", newline="") as f:
            out.extend(titik_dari_baris(csv.DictReader(f), sensor, mulai, akhir))
    return out


def kandidat_url(sensor, th):
    prod, _, alt = SENSOR_ARSIP[sensor]
    u = []
    for p in alt:
        u.append((FIRMS_DASAR + "/data/country/%s/%d/%s_%d_Indonesia.csv" % (p, th, p, th), "csv"))
        u.append((FIRMS_DASAR + "/data/country/zips/%s_%d_Indonesia.zip" % (p, th), "zip"))
    if sensor == "M":
        u.append((FIRMS_DASAR + "/data/country/zips/modis_%d_all_countries.zip" % th, "zip"))
    return u


def api_tahun(sensor, th, kunci, jalur, tenggat, sampai=None):
    """Cadangan: FIRMS area API per 5 hari -> satu CSV. SP dulu, NRT bila lewat batas SP (data_availability)."""
    sp, nrt = API_SUMBER[sensor]
    sp_akhir = None
    try:
        for b in csv.DictReader(io.StringIO(ambil_teks("%s/api/data_availability/csv/%s/all" % (FIRMS_DASAR, kunci)))):
            if b["data_id"] == sp:
                sp_akhir = dt.date.fromisoformat(b["max_date"])
    except Exception as e:  # noqa: BLE001
        log("data_availability gagal:", e)
    d, akhir = dt.date(th, 1, 1), dt.date(th, 12, 31)
    if sampai:
        akhir = min(akhir, dt.date.fromisoformat(sampai))
    akhir = min(akhir, dt.datetime.now(UTC).date())
    kepala, baris = None, []
    while d <= akhir:
        n = min(5, (akhir - d).days + 1)
        sumber = sp
        if sp_akhir is not None and d > sp_akhir:
            sumber = nrt
        elif sp_akhir is not None:
            n = min(n, (sp_akhir - d).days + 1)
        if tenggat():
            raise TimeoutError("anggaran habis di tengah API %s %d" % (sensor, th))
        url = "%s/api/area/csv/%s/%s/%s/%d/%s" % (FIRMS_DASAR, kunci, sumber, ",".join(str(x) for x in BBOX), n, d.isoformat())
        teks = ambil_teks(url, coba=4, jeda=20)
        if teks.startswith("Invalid") or "Exceeding" in teks:
            raise RuntimeError("FIRMS API menolak: " + redaksi(teks[:80]))
        rows = list(csv.reader(io.StringIO(teks)))
        if rows:
            kepala = kepala or rows[0]
            baris.extend(rows[1:])
        time.sleep(0.5)
        d += dt.timedelta(days=n)
    if not kepala:
        raise RuntimeError("API tanpa data")
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur + ".bagian", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(kepala)
        w.writerows(baris)
    os.replace(jalur + ".bagian", jalur)
    return jalur


def titik_sensor_tahun(sensor, th, kunci, tenggat, status, sampai=None):
    """-> list titik atau None (alasan di status[kunci_tugas])."""
    kt = "%s|%d" % (sensor, th)
    os.makedirs(os.path.join(RAW, "firms"), exist_ok=True)
    cache = sorted(glob.glob(os.path.join(RAW, "firms", "%s_%d.*" % (sensor, th))))
    cache = [c for c in cache if not c.endswith(".bagian")]
    if not cache:
        gagal = []
        for url, jenis in kandidat_url(sensor, th):
            if tenggat():
                status[kt] = "anggaran habis"
                return None
            jalur = os.path.join(RAW, "firms", "%s_%d.%s" % (sensor, th, jenis))
            try:
                ambil_ke(url, jalur, batas_dtk=240, jenis=jenis)
                status[kt] = "arsip " + url.replace(FIRMS_DASAR, "")
                cache = [jalur]
                break
            except Exception as e:  # noqa: BLE001
                gagal.append("%s -> %s" % (url.replace(FIRMS_DASAR, ""), str(e)[:60]))
        if not cache:
            if kunci:
                try:
                    jalur = os.path.join(RAW, "firms", "%s_%d.csv" % (sensor, th))
                    api_tahun(sensor, th, kunci, jalur, tenggat, sampai)
                    status[kt] = "area API (arsip gagal: %s)" % "; ".join(gagal)[:200]
                    cache = [jalur]
                except Exception as e:  # noqa: BLE001
                    status[kt] = "GAGAL: arsip %s; API %s" % ("; ".join(gagal)[:200], redaksi(e)[:120])
                    return None
            else:
                status[kt] = "GAGAL: arsip %s; tanpa FIRMS_MAP_KEY" % "; ".join(gagal)[:240]
                return None
    else:
        status[kt] = status.get(kt) or "cache " + os.path.basename(cache[0])
    try:
        return baca_firms(cache[0], sensor, "%d-01-01" % th, sampai or "%d-12-31" % th)
    except Exception as e:  # noqa: BLE001
        status[kt] = "GAGAL baca: " + redaksi(e)[:160]
        return None


# ================================================================ peta (provinsi, gambut, konsesi, hutan)
class WilayahHalus(Wilayah):
    SEL = 0.1


class Lapisan:
    """Titik-dalam-poligon dengan bin 0,05 derajat (cincin luar saja)."""
    S = 0.05

    def __init__(self, cincin_iter=()):
        self.bin = {}
        for r in cincin_iter:
            xs, ys = [c[0] for c in r], [c[1] for c in r]
            kt = (min(xs), min(ys), max(xs), max(ys))
            for gx in range(math.floor(kt[0] / self.S), math.floor(kt[2] / self.S) + 1):
                for gy in range(math.floor(kt[1] / self.S), math.floor(kt[3] / self.S) + 1):
                    self.bin.setdefault((gx, gy), []).append((kt, r))

    def di_dalam(self, lon, lat):
        for kt, r in self.bin.get((math.floor(lon / self.S), math.floor(lat / self.S)), ()):
            if kt[0] <= lon <= kt[2] and kt[1] <= lat <= kt[3] and _pip(lon, lat, r):
                return True
        return False


def _pip(x, y, r):
    c, j = False, len(r) - 1
    for i in range(len(r)):
        xi, yi = r[i][0], r[i][1]
        xj, yj = r[j][0], r[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def cincin_fitur(geom):
    if not geom:
        return []
    bag = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]] if geom["type"] == "Polygon" else []
    return [b[0] for b in bag if b and len(b[0]) >= 3]


def luas_cincin_km2(r):
    """Shoelace (derajat) -> km2 dengan skala bujur di lintang tengah."""
    lat0 = sum(c[1] for c in r) / len(r)
    a = 0.0
    for i in range(len(r) - 1):
        a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
    return abs(a) / 2 * 111.32 * 110.57 * math.cos(math.radians(lat0))


class Peta:
    """atribut(lat, lon) -> (grup provinsi, di_gambut, di_konsesi, di_hutan) atau None (laut, luar negeri, sel sumber panas tetap, gunung api).
    Hasil di-cache per sel 0,01 derajat (sel yang sama dengan titik_palsu.sel)."""

    def __init__(self, cari_prov, gambut=None, konsesi=None, hutan=None, industri=(), gunung=lambda la, lo: False):
        self.cari_prov, self.gambut, self.konsesi, self.hutan = cari_prov, gambut, konsesi, hutan
        self.industri, self.gunung = industri, gunung
        self.cache, self.stat = {}, {"sel": 0, "buang_industri": 0, "buang_gunung": 0, "buang_luar": 0}

    @classmethod
    def dari_repo(cls):
        w = WilayahHalus()
        lap = {}
        for nama in ("gambut", "konsesi", "kawasan"):
            p = os.path.join(PUB, "lahan", nama + ".geojson")
            lap[nama] = Lapisan(r for f in json.load(open(p))["features"] for r in cincin_fitur(f["geometry"])) if os.path.exists(p) else None
        ind, _ = TP.sel_industri()

        def cari(lat, lon):
            h = w.cari(lon, lat)
            return h[0] if h else None
        return cls(cari, lap["gambut"], lap["konsesi"], lap["kawasan"], ind, lambda la, lo: bool(A.gunung_api(la, lo)))

    def atribut(self, lat, lon):
        k = TP.sel(lat, lon)
        if k in self.cache:
            return self.cache[k]
        self.stat["sel"] += 1
        la, lo = k[0] / 100.0, k[1] / 100.0
        if k in self.industri:
            self.stat["buang_industri"] += 1
            v = None
        elif self.gunung(lat, lon):
            self.stat["buang_gunung"] += 1
            v = None
        else:
            kode = self.cari_prov(la, lo) or self.cari_prov(lat, lon)
            if kode is None:
                self.stat["buang_luar"] += 1
                v = None
            else:
                v = (grup(kode), bool(self.gambut and self.gambut.di_dalam(lo, la)), bool(self.konsesi and self.konsesi.di_dalam(lo, la)),
                     bool(self.hutan and self.hutan.di_dalam(lo, la)))
        self.cache[k] = v
        return v

    def prov(self, lat, lon):
        k = TP.sel(lat, lon)
        a = self.cache.get(k)
        if a is not None:
            return a[0]
        kode = self.cari_prov(lat, lon)
        return grup(kode) if kode else None


def sel_025(lat, lon):
    return (math.floor(lat / 0.25), math.floor(lon / 0.25))


def kunci_sel(c):
    return "%d|%d" % c


# ================================================================ agregasi titik -> fitur unit
def pix_u(p, u):
    return (round(p["lat"] / u), round(p["lon"] * math.cos(math.radians(p["lat"])) / u))


def anotasi(titik, peta, sensor):
    """Tambahkan g, gb, ks, ht, kunci piksel (_k, _kt), hari WIB (_d); buang titik di luar peta. -> list baru."""
    u = 0.003375 if sensor != "M" else 0.009
    out = []
    for p in titik:
        a = peta.atribut(p["lat"], p["lon"])
        if a is None:
            continue
        p["g"], p["gb"], p["ks"], p["ht"] = a
        p["_k"] = H.pix(p) if sensor != "M" else pix_u(p, u)
        p["_kt"] = pix_u(p, 2 * u)
        p["_d"] = H.tgl(p["t"]).toordinal()
        out.append(p)
    return out


def klaster_cepat(pts, eps=H.EPS_KM, jam=48):
    """Komponen terhubung dengan predikat tetangga SAMA PERSIS harian.dbscan (jarak haversine <= min(eps, max(0,6; 1,5 x px terbesar)) dan selisih waktu
    <= jam). harian.dbscan dengan minPts=1 tidak punya noise, jadi hasilnya = komponen terhubung graf tetangga; union-find melompati pasangan yang sudah
    satu komponen sehingga blok api padat (gambut) tidak kuadratik. Kesetaraan partisi diuji terhadap harian.dbscan di uji(). -> label list."""
    n = len(pts)
    ind = list(range(n))

    def cari(a):
        while ind[a] != a:
            ind[a] = ind[ind[a]]
            a = ind[a]
        return a
    sel = eps / (111.195 * math.cos(math.radians(12)))
    detik = jam * 3600.0
    grid = {}
    batas = dt.timedelta(hours=jam)
    for i in sorted(range(n), key=lambda k: pts[k]["t"]):   # urut waktu: hanya titik lebih awal yang perlu dicek; sel ruang x blok waktu 'jam'
        p = pts[i]
        gx, gy, w = math.floor(p["lon"] / sel), math.floor(p["lat"] / sel), math.floor(p["t"].timestamp() / detik)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dw in (0, -1):
                    for j in grid.get((gx + dx, gy + dy, w + dw), ()):
                        ri, rj = cari(i), cari(j)
                        if ri == rj:
                            continue
                        q = pts[j]
                        e = min(eps, max(0.6, 1.5 * max(p.get("px", .4), q.get("px", .4))))
                        if abs(p["t"] - q["t"]) <= batas and H.haversine(p, q) <= e:
                            ind[ri] = rj
        grid.setdefault((gx, gy, w), []).append(i)
    ids = {}
    return [ids.setdefault(cari(i), len(ids)) for i in range(n)]


def bentuk_cluster(pts, label):
    """Kelompokkan titik per label DBSCAN -> list cluster {npx, dur, ya, cov, lat, lon}."""
    per = {}
    for p, l in zip(pts, label):
        per.setdefault(l, []).append(p)
    out = []
    for ps in per.values():
        n = len(ps)
        gb = sum(1 for p in ps if p["gb"]) / n
        ht = sum(1 for p in ps if p["ht"]) / n
        d = [p["_d"] for p in ps]
        out.append({"npx": len({p["_k"] for p in ps}), "dur": max(d) - min(d) + 1, "ya": H.firespot(ps)[1] == "ya",
                    "cov": "g" if gb >= 0.5 else "h" if ht >= 0.5 else "l",
                    "lat": sum(p["lat"] for p in ps) / n, "lon": sum(p["lon"] for p in ps) / n})
    return out


def klaster_grup(pts, tenggat=None):
    """DBSCAN produksi (harian.dbscan, eps 1,5 km adaptif, 48 jam) per grup provinsi. Per-grup supaya anggaran bisa diperiksa di sela."""
    per = {}
    for p in pts:
        per.setdefault(p["g"], []).append(p)
    cls = []
    for g, ps in sorted(per.items(), key=lambda x: len(x[1])):
        if tenggat and tenggat():
            raise TimeoutError("anggaran habis di tengah DBSCAN")
        ps.sort(key=lambda p: p["t"])
        label = klaster_cepat(ps) if len(ps) > 400 else H.dbscan(ps, jam=48)[0]   # kecil: produksi apa adanya; besar: setara, hampir linear
        for c in bentuk_cluster(ps, label):
            c["g"] = g
            cls.append(c)
    return cls


def fitur_unit(pts, cls):
    n = len(pts)
    f = {"n": n}
    for c in (0, 1, 2):
        f["n%d" % c] = sum(1 for p in pts if p["c"] == c)
    f["n_nh"] = f["n1"] + f["n2"]
    px = len({p["_k"] for p in pts})
    f["px"], f["px_tol"] = px, len({p["_kt"] for p in pts})
    f["frp"] = sum(p["frp"] for p in pts)
    f["frp_px"] = f["frp"] / px if px else 0.0
    f["malam"] = sum(1 for p in pts if p["dn"] == "N") / n if n else 0.0
    f["hari"] = len({p["_d"] for p in pts})
    for k in ("gb", "ks", "ht"):
        f[k] = sum(1 for p in pts if p[k]) / n if n else 0.0
    f["ncl"], f["nfs"] = len(cls), sum(1 for c in cls if c["ya"])
    tk = [c["npx"] for c in cls]
    f["cl_med"] = median(tk) if tk else 0.0
    f["cl_p90"] = kuantil(tk, 0.9) if tk else 0.0
    f["cl_p100"] = sum(1 for x in tk if x >= 100) / len(tk) if tk else 0.0
    f["pxcl100"] = sum(x for x in tk if x >= 100) / sum(tk) if tk else 0.0
    du = [c["dur"] for c in cls]
    f["dur_med"] = median(du) if du else 0.0
    f["dur_p90"] = kuantil(du, 0.9) if du else 0.0
    for k in KLS_KEYS:
        f[k] = 0
    for c in cls:
        k = max(i for i, b in enumerate(KELAS_PX) if c["npx"] >= b)
        f["k%d%s" % (k, c["cov"])] += 1
    return {k: bulat(v, 4) if isinstance(v, float) else v for k, v in f.items()}


def hitung_cacah(pts):
    f = {"n": len(pts)}
    for c in (0, 1, 2):
        f["n%d" % c] = sum(1 for p in pts if p["c"] == c)
    f["n_nh"] = f["n1"] + f["n2"]
    return f


def agregat(titik, peta, sensor, tahun, klaster=True, sel=False, tenggat=None):
    """titik mentah -> {'prov': {g: fitur}, 'sel': {sel: fitur+pusat}} untuk satu sensor-tahun. Tanpa klaster (N20/N21): hanya cacah."""
    pts = anotasi(titik, peta, sensor)
    per = {}
    for p in pts:
        per.setdefault(p["g"], []).append(p)
    if not klaster:
        return {"prov": {g: hitung_cacah(ps) for g, ps in per.items()}, "n_total": len(pts)}
    cls = klaster_grup(pts, tenggat)
    clg = {}
    for c in cls:
        clg.setdefault(c["g"], []).append(c)
    out = {"prov": {g: fitur_unit(ps, clg.get(g, [])) for g, ps in per.items()}, "n_total": len(pts)}
    if sel:
        ps_s, cl_s = {}, {}
        for p in pts:
            ps_s.setdefault(sel_025(p["lat"], p["lon"]), []).append(p)
        for c in cls:
            cl_s.setdefault(sel_025(c["lat"], c["lon"]), []).append(c)
        out["sel"] = {}
        for k, ps in ps_s.items():
            f = fitur_unit(ps, cl_s.get(k, []))
            f["g"] = max(set(p["g"] for p in ps), key=lambda g: sum(1 for p in ps if p["g"] == g))
            f["lat"], f["lon"] = (k[0] + 0.5) * 0.25, (k[1] + 0.5) * 0.25
            out["sel"][kunci_sel(k)] = f
    return out


# ================================================================ acuan
def muat_json(p):
    return json.load(open(p)) if os.path.exists(p) else None


def acuan_repo():
    """SiPongi {g: {tahun: ha}} dan GWIS {g: {tahun: ha}} dari repo, dengan pemetaan grup."""
    sip, gw = {}, {}
    r = muat_json(os.path.join(PUB, "luas_resmi.json"))
    if r:
        for kode, ha in r["ha"].items():
            for y, v in zip(r["tahun"], ha):
                if v is not None:
                    d = sip.setdefault(grup(kode), {})
                    d[int(y)] = d.get(int(y), 0.0) + float(v)
    s = muat_json(os.path.join(PUB, "luas_satelit.json"))
    if s:
        for kunci, ha in s["ha"].items():
            g = kunci.split("+")[0]
            for y, v in zip(s["tahun"], ha):
                if v is not None:
                    d = gw.setdefault(g, {})
                    d[int(y)] = d.get(int(y), 0.0) + float(v)
    return sip, gw


def agregasi_gaveau(petak, peta):
    """petak: iterable (lat, lon, ha) -> {'prov': {g: ha}, 'sel': {sel: ha}, 'total': ha, 'n': n}."""
    prov, sel, tot, n = {}, {}, 0.0, 0
    for la, lo, ha in petak:
        tot += ha
        n += 1
        g = peta.prov(la, lo)
        if g is None:
            continue
        prov[g] = prov.get(g, 0.0) + ha
        k = kunci_sel(sel_025(la, lo))
        sel[k] = sel.get(k, 0.0) + ha
    return {"prov": prov, "sel": sel, "total": tot, "n": n}


def dengan_batas(fn, detik):
    """Jalankan fn() di thread daemon; kembalikan (selesai, hasil). Pembaca citra tak bisa diinterupsi dari dalam, jadi batasnya dari luar."""
    import threading
    kotak = {}

    def kerja():
        try:
            kotak["h"] = fn()
        except BaseException as e:  # noqa: BLE001  (termasuk SystemExit dari pembaca)
            kotak["e"] = e
    t = threading.Thread(target=kerja, daemon=True)
    t.start()
    t.join(detik)
    if t.is_alive():
        return False, None
    if "e" in kotak:
        raise kotak["e"]
    return True, kotak.get("h")


def gaveau_dari_zenodo(peta, tenggat, catatan):
    """Memakai pembaca ujibanding_firespot (rasterio / pyshp / GeoJSON). SystemExit dari pembaca ditangkap."""
    try:
        import ujibanding_firespot as UF
    except Exception as e:  # noqa: BLE001
        catatan["gaveau"] = "pembaca tak termuat: " + redaksi(e)[:120]
        return None
    d = os.path.join(RAW, "gaveau")
    try:
        UF.unduh_zenodo(d)
        c = UF.muat_citra(d, tenggat=tenggat)   # tenggat() melempar TimeoutError bila anggaran habis
        return agregasi_gaveau(zip(c.pusat[:, 0].tolist(), c.pusat[:, 1].tolist(), c.ha.tolist()), peta)
    except (SystemExit, Exception) as e:  # noqa: BLE001
        catatan["gaveau"] = "GAGAL: " + redaksi(e)[:200]
        return None


# ---- koreksi omisi GWIS -> acuan gabungan
def bangun_koreksi(gwis, gaveau, kecuali_grup=None, tanpa_gaveau=False, n0=20000.0):
    """-> {'r': {g: faktor}, 'nas': r_nasional, 'sd': sd ln r antarprovinsi, 'asal': ...}.
    Faktor = Gaveau/GWIS 2019 per provinsi, dishrink ke nasional menurut luas GWIS (n/(n+n0)). Tanpa Gaveau (atau provinsi dikecualikan) jatuh ke
    prior literatur 1/(1-0,57). `kecuali_grup` tidak ikut menghitung rasio nasional (cegah bocor pada LOPO)."""
    lit = 1 / (1 - OMISI_LIT[1])
    lit_lo, lit_hi = 1 / (1 - OMISI_LIT[0]), 1 / (1 - OMISI_LIT[2])
    if tanpa_gaveau or not gaveau:
        return {"r": {}, "nas": lit, "sd": math.log(lit_hi / lit_lo) / (2 * 1.2816), "asal": "prior literatur omisi GWIS 52-62%", "lit": True}
    sg = sw = 0.0
    pasang = {}
    for g, ha in gaveau.items():
        w = (gwis.get(g) or {}).get(2019)
        if g == kecuali_grup or not w or w <= 0 or ha <= 0:
            continue
        pasang[g] = (ha, w)
        sg += ha
        sw += w
    if not pasang or sw <= 0:
        return bangun_koreksi(gwis, gaveau, kecuali_grup, True)
    nas = sg / sw
    r, lr = {}, []
    for g, (ha, w) in pasang.items():
        mentah = ha / w
        lr.append(math.log(mentah))
        wt = w / (w + n0)
        r[g] = min(10.0, max(0.5, math.exp(wt * math.log(mentah) + (1 - wt) * math.log(nas))))
    sd = statistics.pstdev(lr) if len(lr) >= 3 else 0.5
    return {"r": r, "nas": nas, "sd": max(sd, 0.1), "asal": "Gaveau 2019 / GWIS 2019", "lit": False}


def target_gabungan(g, y, gwis, gaveau, kor):
    """(p10, p50, p90) ha atau None. Gaveau bila ada (2019), selain itu GWIS x koreksi dengan selang."""
    if y == 2019 and gaveau and gaveau.get(g) and not kor.get("lit"):
        v = gaveau[g]
        return (v, v, v)
    w = (gwis.get(g) or {}).get(y)
    if w is None:
        return None
    r = kor["r"].get(g, kor["nas"])
    z = 1.2816 * kor["sd"]
    return (w * r * math.exp(-z), w * r, w * r * math.exp(z))


def tabel_target(acuan, ref, kor):
    """{(g,y): ha p50} untuk acuan 'sipongi'|'gwis'|'gaveau'|'gabungan'."""
    out = {}
    if acuan == "sipongi":
        for g, d in ref["sipongi"].items():
            for y, v in d.items():
                out[(g, y)] = v
    elif acuan == "gwis":
        for g, d in ref["gwis"].items():
            for y, v in d.items():
                out[(g, y)] = v
    elif acuan == "gaveau":
        for g, v in (ref.get("gaveau") or {}).items():
            out[(g, 2019)] = v
    elif acuan == "gabungan":
        ys = {y for d in ref["gwis"].values() for y in d}
        for g in ref["gwis"]:
            for y in ys:
                t = target_gabungan(g, y, ref["gwis"], ref.get("gaveau"), kor)
                if t:
                    out[(g, y)] = t[1]
        if ref.get("gaveau") and not kor.get("lit"):
            for g, v in ref["gaveau"].items():
                out[(g, 2019)] = v
    return out


# ================================================================ numerik: ridge, NNLS, GBDT
def selesaikan(A_, b):
    n = len(b)
    M = [row[:] + [b[i]] for i, row in enumerate(A_)]
    for i in range(n):
        p = max(range(i, n), key=lambda r: abs(M[r][i]))
        if abs(M[p][i]) < 1e-12:
            M[p][i] = 1e-12
        M[i], M[p] = M[p], M[i]
        for r in range(i + 1, n):
            f = M[r][i] / M[i][i]
            for c in range(i, n + 1):
                M[r][c] -= f * M[i][c]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (M[i][n] - sum(M[i][c] * x[c] for c in range(i + 1, n))) / M[i][i]
    return x


def ridge_latih(X, y, lam):
    """Intersep tak dihukum; fitur dibakukan. -> model {mu, sd, b0, b}."""
    n, m = len(X), len(X[0])
    mu = [sum(r[j] for r in X) / n for j in range(m)]
    sd = [math.sqrt(sum((r[j] - mu[j]) ** 2 for r in X) / n) or 1.0 for j in range(m)]
    Z = [[(r[j] - mu[j]) / sd[j] for j in range(m)] for r in X]
    ym = sum(y) / n
    G = [[sum(Z[i][a] * Z[i][b] for i in range(n)) + (lam if a == b else 0.0) for b in range(m)] for a in range(m)]
    v = [sum(Z[i][a] * (y[i] - ym) for i in range(n)) for a in range(m)]
    b = selesaikan(G, v)
    return {"mu": mu, "sd": sd, "b0": ym, "b": b}


def ridge_ramal(mdl, x):
    return mdl["b0"] + sum(bj * (xj - m) / s for bj, xj, m, s in zip(mdl["b"], x, mdl["mu"], mdl["sd"]))


def nnls_prior(X, y, beta0, lam, sweeps=300):
    """min sum w_i (x_i.b - y_i)^2 + lam sum s_k (b_k - b0_k)^2, b >= 0, w = 1/y^2 (galat relatif). Coordinate descent."""
    n, m = len(X), len(X[0])
    w = [1.0 / (v * v) for v in y]
    sxx = [sum(w[i] * X[i][k] ** 2 for i in range(n)) for k in range(m)]
    b = list(beta0)
    res = [y[i] - sum(X[i][k] * b[k] for k in range(m)) for i in range(n)]
    for _ in range(sweeps):
        geser = 0.0
        for k in range(m):
            if sxx[k] <= 0:
                continue
            s = lam * sxx[k]
            num = sum(w[i] * X[i][k] * (res[i] + X[i][k] * b[k]) for i in range(n)) + s * beta0[k]
            nb = max(0.0, num / (sxx[k] + s))
            d = nb - b[k]
            if d:
                for i in range(n):
                    res[i] -= X[i][k] * d
                b[k] = nb
                geser = max(geser, abs(d))
        if geser < 1e-9:
            break
    return b


def gbdt_latih(X, y, pohon=40, dalam=3, lr=0.15, sub=0.8, min_daun=4, bin_maks=16, benih=7):
    """Regresi gradient boosting (galat kuadrat) pohon dangkal berbasis histogram. Pohon: (j, ambang, kiri, kanan) atau float (daun)."""
    rng = random.Random(benih)
    n, m = len(X), len(X[0])
    tepi = []
    for j in range(m):
        v = sorted(set(r[j] for r in X))
        if len(v) <= 1:
            tepi.append([])
        elif len(v) <= bin_maks:
            tepi.append([(a + b) / 2 for a, b in zip(v, v[1:])])
        else:
            qs = sorted({kuantil(v, i / bin_maks) for i in range(1, bin_maks)})
            tepi.append([(a + b) / 2 for a, b in zip(qs, qs[1:])] if len(qs) > 1 else [])
    B = [[bisect.bisect_left(tepi[j], X[i][j]) for j in range(m)] for i in range(n)]
    base = sum(y) / n
    F = [base] * n
    pohons = []

    def bangun(idx, g, d):
        S = sum(g[i] for i in idx)
        if d == dalam or len(idx) < 2 * min_daun:
            return S / len(idx) * lr
        terbaik, ke = 1e-12, None
        for j in range(m):
            k = len(tepi[j])
            if k == 0:
                continue
            hs, hn = [0.0] * (k + 1), [0] * (k + 1)
            for i in idx:
                b = B[i][j]
                hs[b] += g[i]
                hn[b] += 1
            sl, nl = 0.0, 0
            for b in range(k):
                sl += hs[b]
                nl += hn[b]
                nr = len(idx) - nl
                if nl < min_daun or nr < min_daun:
                    continue
                gain = sl * sl / nl + (S - sl) ** 2 / nr - S * S / len(idx)
                if gain > terbaik:
                    terbaik, ke = gain, (j, b)
        if ke is None:
            return S / len(idx) * lr
        j, b = ke
        kiri = [i for i in idx if B[i][j] <= b]
        kanan = [i for i in idx if B[i][j] > b]
        return (j, tepi[j][b], bangun(kiri, g, d + 1), bangun(kanan, g, d + 1))

    for _ in range(pohon):
        g = [y[i] - F[i] for i in range(n)]
        idx = [i for i in range(n) if rng.random() < sub] or list(range(n))
        t = bangun(idx, g, 0)
        pohons.append(t)
        for i in range(n):
            F[i] += _nilai_bin(t, X[i])
    return {"base": base, "pohon": pohons}


def _nilai_bin(t, x):
    while isinstance(t, tuple):
        t = t[2] if x[t[0]] <= t[1] else t[3]
    return t


def gbdt_ramal(mdl, x):
    return mdl["base"] + sum(_nilai_bin(t, x) for t in mdl["pohon"])


# ================================================================ model M0..M4
FITUR_M2 = ["lpx_tol", "lcl_med", "gb", "ht", "oni_jas", "hujan_z"]
FITUR_GB = ["ln0", "ln1", "ln2", "lpx", "lpx_tol", "lncl", "lnfs", "lcl_med", "lcl_p90", "cl_p100", "pxcl100", "lfrp", "frp_px", "malam", "dur_med", "dur_p90",
            "hari", "gb", "ks", "ht", "kanal_dens", "hilang012", "wc_pohon", "wc_semak", "wc_rumput", "wc_lahan", "wc_basah",
            "oni_jas", "oni_aso", "dmi_jas", "hujan_z", "hujan_mm"]


def vektor(f, nama):
    """Nama turunan -> nilai dari dict fitur gabungan (hilang -> 0)."""
    def g(k):
        v = f.get(k)
        return 0.0 if v is None else float(v)
    if nama.startswith("l") and nama[1:] in f:
        return math.log1p(g(nama[1:]))
    if nama.startswith("ln") and nama[2:].isdigit():
        return math.log1p(g("n" + nama[2:]))
    if nama.startswith("lnc"):
        return math.log1p(g("ncl"))
    if nama == "lnfs":
        return math.log1p(g("nfs"))
    if nama == "lncl":
        return math.log1p(g("ncl"))
    if nama in ("lpx", "lpx_tol", "lfrp", "lcl_med", "lcl_p90"):
        return math.log1p(g(nama[1:]))
    return g(nama)


def x_m2(f):
    return [vektor(f, k) for k in FITUR_M2]


def x_gb(f):
    return [vektor(f, k) for k in FITUR_GB]


def x_m4(f):
    return [float(f.get(k) or 0) for k in KLS_KEYS]


class Latihan:
    """Satu baris latih: f (fitur gabungan), ha (target), y (tahun), g (grup)."""
    __slots__ = ("f", "ha", "y", "g")

    def __init__(self, f, ha, y, g):
        self.f, self.ha, self.y, self.g = f, ha, y, g


def _loyo_dalam(tr, fit_pred, lams):
    """Pilih lam dengan leave-one-year-out di dalam data latih (jumlah galat kuadrat log)."""
    tahun = sorted({t.y for t in tr})
    if len(tahun) < 3:
        return lams[len(lams) // 2]
    skor = {}
    for lam in lams:
        s = 0.0
        for y in tahun:
            a = [t for t in tr if t.y != y]
            b = [t for t in tr if t.y == y]
            if len(a) < 5 or not b:
                continue
            pr = fit_pred(a, lam)
            s += sum((math.log(max(t.ha, 1.0)) - pr(t.f)) ** 2 for t in b)
        skor[lam] = s
    return min(lams, key=lambda l: skor.get(l, float("inf")))


def spec_model(nama, ctx):
    """-> fungsi fit(list[Latihan]) -> ramal(f) = ln(ha). ctx: {'faktor_setara', 'seri'}."""
    if nama == "M0":
        fs = ctx.get("faktor_setara", 1.0) if ctx.get("seri") == "M" else 1.0
        return lambda tr: (lambda f: math.log(max(1.0, FAKTOR_TITIK * fs * (f.get("n1", 0) + f.get("n2", 0)))))

    if nama == "M1":
        def fit(tr):
            sej, resmi = {}, {"tahun": [], "ha": {}}
            ys = sorted({t.y for t in tr})
            resmi["tahun"] = [str(y) for y in ys]
            for t in tr:   # (grup, y) ganda dijumlahkan: pada sel 0,25 derajat y = blok ruang dan satu blok memuat banyak sel
                n_ = t.f.get("n1", 0) + t.f.get("n2", 0)
                sej.setdefault(t.g, {}).setdefault(str(t.y), [0])[0] += n_
                a_ = resmi["ha"].setdefault(t.g, [None] * len(ys))
                a_[ys.index(t.y)] = (a_[ys.index(t.y)] or 0.0) + t.ha
            lama = INS.TAHUN_MIN
            INS.TAHUN_MIN = min(ys) if ys else lama   # hanya di proses ini: pakai semua tahun latih, bukan >= 2020 khusus SiPongi
            try:
                fk = INS.faktor_luas(sej, {"tahun": resmi["tahun"], "ha": {g: [v if v is not None else 0.0 for v in a] for g, a in resmi["ha"].items()}})
            finally:
                INS.TAHUN_MIN = lama
            if not fk:
                return lambda f: math.log(max(1.0, FAKTOR_TITIK * (f.get("n1", 0) + f.get("n2", 0))))
            nas = fk["nasional"]["faktor"]
            return lambda f, g=None: math.log(max(1.0, (fk["prov"].get(f.get("_g"), {}).get("faktor") or nas) * (f.get("n1", 0) + f.get("n2", 0))))
        return fit

    if nama == "M2":
        def fp(tr, lam):
            m = ridge_latih([x_m2(t.f) for t in tr], [math.log(max(t.ha, 1.0)) for t in tr], lam)
            return lambda f: ridge_ramal(m, x_m2(f))

        def fit(tr):
            lam = _loyo_dalam(tr, fp, (0.1, 1.0, 10.0, 100.0, 1000.0))
            return fp(tr, lam)
        return fit

    if nama == "M3":
        def fit(tr):
            m = gbdt_latih([x_gb(t.f) for t in tr], [math.log(max(t.ha, 1.0)) for t in tr])
            return lambda f: gbdt_ramal(m, x_gb(f))
        return fit

    if nama == "M4":
        b0 = [FAKTOR_TITIK * KLS_MID[int(k[1])] for k in KLS_KEYS]

        def fp(tr, lam):
            b = nnls_prior([x_m4(t.f) for t in tr], [max(t.ha, 1.0) for t in tr], b0, lam)
            return lambda f: math.log(max(1.0, sum(x * bb for x, bb in zip(x_m4(f), b))))

        def fit(tr):
            lam = _loyo_dalam(tr, fp, (0.01, 0.1, 1.0, 10.0))
            return fp(tr, lam)
        return fit
    raise KeyError(nama)


MODEL = ["M0", "M1", "M2", "M3", "M4"]
KET_MODEL = {
    "M0": "produksi: titik keyakinan sedang/tinggi x 4,3 ha (seri M: x faktor setara S-NPP)",
    "M1": "faktor ha/titik per provinsi (insiden.faktor_luas, median rasio acuan/titik antartahun latih)",
    "M2": "log-linier ridge: ln(piksel unik toleran) + ln(ukuran cluster median) + porsi gambut + porsi hutan + ONI JAS + anomali hujan; lambda lewat LOYO dalam",
    "M3": "GBDT regresi kecil (40 pohon, kedalaman 3) atas semua fitur",
    "M4": "ala Giglio 2006/Randerson 2012: luas = jumlah cluster per kelas ukuran x tutupan x faktor (NNLS galat relatif, ridge ke prior 4,3 ha x piksel tengah)",
}


# ================================================================ validasi
def lipat_loyo(baris, ref, acuan, seri_tahun, gabungan_ref=None):
    """Daftar lipatan LOYO: {'nama', 'tahun_uji', 'latih': [Latihan], 'uji': [baris]}. Target latih dibangun TANPA info tahun uji
    (2019: koreksi omisi tanpa Gaveau)."""
    out = []
    for y in sorted({b["y"] for b in baris}):
        kor = bangun_koreksi(ref["gwis"], ref.get("gaveau"), tanpa_gaveau=(y == 2019))
        tt = tabel_target(acuan, {**ref, "gaveau": None if y == 2019 else ref.get("gaveau")}, kor)
        out.append(_lipat("y%d" % y, baris, tt, lambda b, y=y: b["y"] == y))
        out[-1]["tahun_uji"] = y
    return out


def lipat_lopo(baris, ref, acuan):
    out = []
    for g in sorted({b["g"] for b in baris}):
        kor = bangun_koreksi(ref["gwis"], ref.get("gaveau"), kecuali_grup=g)
        tt = tabel_target(acuan, ref, kor)
        out.append(_lipat("g%s" % g, baris, tt, lambda b, g=g: b["g"] == g))
        out[-1]["grup_uji"] = g
    return out


def _lipat(nama, baris, tt, uji_fn):
    tr, uji = [], []
    for b in baris:
        if uji_fn(b):
            uji.append(b)
        else:
            ha = tt.get((b["g"], b["y"]))
            if ha is not None and ha >= MIN_TRAIN_HA and b["f"].get("n_nh", 0) > 0:
                tr.append(Latihan(dict(b["f"], _g=b["g"]), ha, b["y"], b["g"]))
    return {"nama": nama, "latih": tr, "uji": uji}


def jalankan_lipatan(nama_model, lipatan, ctx, tenggat=None):
    """-> {(g,y): ln pred} untuk semua baris uji dengan titik > 0."""
    fit = spec_model(nama_model, ctx)
    pred = {}
    for l in lipatan:
        if tenggat and tenggat():
            return pred, False
        if not l["latih"] and nama_model != "M0":
            continue
        ramal = fit(l["latih"]) if l["latih"] or nama_model == "M0" else None
        for b in l["uji"]:
            if b["f"].get("n_nh", 0) > 0:
                pred[(b["g"], b["y"])] = ramal(dict(b["f"], _g=b["g"]))
    return pred, True


def metrik(pred, truth, min_ha=MIN_EVAL_HA):
    """pred: {k: ln ha}; truth: {k: ha}. Selang konformal silang antar-tahun: residu e = ln(T/P) tahun LAIN (kuantil 10 dan 90)."""
    ks = [k for k in pred if k in truth and truth[k] >= min_ha]
    if len(ks) < 3:
        return {"n": len(ks)}
    e = {k: math.log(truth[k]) - pred[k] for k in ks}
    ape = [abs(math.exp(pred[k]) - truth[k]) / truth[k] for k in ks]
    ok = 0
    ket = 0
    for k in ks:
        pool = [e[j] for j in ks if j[1] != k[1]] or [e[j] for j in ks if j != k]
        if len(pool) < 3:
            continue
        ket += 1
        if kuantil(pool, 0.1) <= e[k] <= kuantil(pool, 0.9):
            ok += 1
    lp = [pred[k] for k in ks]
    lt = [math.log(truth[k]) for k in ks]
    return {"n": len(ks), "rasio_median": bulat(math.exp(-median([e[k] for k in ks])), 3), "mape": bulat(sum(ape) / len(ape), 3),
            "mdape": bulat(median(ape), 3), "bias_log": bulat(-sum(e.values()) / len(e), 3), "korelasi_log": bulat(pearson(lp, lt), 3),
            "cakupan_p10_p90": bulat(ok / ket, 3) if ket else None}


def cek_gaveau_2019(pred, gaveau):
    ks = [(g, 2019) for g in gaveau if (g, 2019) in pred and gaveau[g] >= MIN_EVAL_HA]
    if len(ks) < 3:
        return {"n": len(ks)}
    r = [pred[k] - math.log(gaveau[k[0]]) for k in ks]
    return {"n": len(ks), "rasio_median": bulat(math.exp(median(r)), 3), "korelasi_log": bulat(pearson([pred[k] for k in ks], [math.log(gaveau[k[0]]) for k in ks]), 3),
            "mape": bulat(sum(abs(math.exp(pred[k]) - gaveau[k[0]]) / gaveau[k[0]] for k in ks) / len(ks), 3)}


def lolos(m_loyo, g19):
    K = KRITERIA
    k1 = m_loyo.get("mape") is not None and m_loyo["mape"] <= K["K1_mape"]["ambang"]
    lo, hi = K["K2_gaveau_2019"]["rasio_median"]
    k2 = g19.get("rasio_median") is not None and g19.get("korelasi_log") is not None and lo <= g19["rasio_median"] <= hi and g19["korelasi_log"] >= K["K2_gaveau_2019"]["korelasi_log_min"]
    a, b = K["K3_cakupan"]["rentang"]
    k3 = m_loyo.get("cakupan_p10_p90") is not None and a <= m_loyo["cakupan_p10_p90"] <= b
    return {"K1": bool(k1), "K2": bool(k2), "K3": bool(k3), "semua": bool(k1 and k2 and k3),
            "K2_dinilai": bool(g19.get("n")), "catatan": None if g19.get("n") else "Gaveau 2019 tak tersedia: K2 tak dapat dinilai, dihitung TIDAK lolos"}


def evaluasi_seri(seri, baris, ref, ctx, tenggat=None, acuan_list=("sipongi", "gwis", "gabungan", "gaveau")):
    """Semua model x acuan latih: LOYO (+ LOPO). Dinilai terhadap acuan gabungan (utama) dan acuan latih sendiri."""
    kor_penuh = bangun_koreksi(ref["gwis"], ref.get("gaveau"))
    truth_gab = tabel_target("gabungan", ref, kor_penuh)
    hasil, preds = [], {}
    for acuan in acuan_list:
        if acuan == "gaveau" and not ref.get("gaveau"):
            continue
        truth_sendiri = tabel_target(acuan, ref, kor_penuh)
        if acuan == "gaveau":
            fold = {"lopo": [l for l in lipat_lopo([b for b in baris if b["y"] == 2019], ref, "gaveau")],
                    "transfer": [_lipat("transfer", baris, tabel_target("gaveau", ref, kor_penuh), lambda b: b["y"] != 2019)]}
        else:
            fold = {"loyo": lipat_loyo(baris, ref, acuan, None), "lopo": lipat_lopo(baris, ref, acuan)}
        for nm in MODEL:
            ent = {"seri": seri, "model": nm, "acuan_latih": acuan, "ket": KET_MODEL[nm]}
            for jenis, lip in fold.items():
                if tenggat and tenggat():
                    ent[jenis] = {"dilewati": "anggaran habis"}
                    continue
                pr, selesai = jalankan_lipatan(nm, lip, ctx, tenggat)
                preds[(seri, nm, acuan, jenis)] = pr
                if not selesai:
                    ent[jenis] = {"dilewati": "anggaran habis di tengah"}
                    continue
                ent[jenis] = {"vs_gabungan": metrik(pr, truth_gab), "vs_sendiri": metrik(pr, truth_sendiri)}
                if ref.get("gaveau"):
                    ent[jenis]["gaveau_2019"] = cek_gaveau_2019(pr, ref["gaveau"])
            if acuan != "gaveau" and isinstance(ent.get("loyo"), dict) and "vs_gabungan" in ent["loyo"]:
                ent["lolos"] = lolos(ent["loyo"]["vs_gabungan"], ent["loyo"].get("gaveau_2019", {}))
                ent["boleh_dipilih"] = True
            else:
                ent["boleh_dipilih"] = False
            hasil.append(ent)
    return hasil, preds, truth_gab


def pilih_model(hasil):
    """-> (terpilih | None, terbaik_tak_lolos | None). Urut MAPE terendah."""
    cand = [e for e in hasil if e.get("boleh_dipilih") and "lolos" in e]
    lolos_ = sorted((e for e in cand if e["lolos"]["semua"]), key=lambda e: e["loyo"]["vs_gabungan"]["mape"])
    ada = [e for e in cand if e["loyo"]["vs_gabungan"].get("mape") is not None]
    terbaik = min(ada, key=lambda e: e["loyo"]["vs_gabungan"]["mape"]) if ada else None
    return (lolos_[0] if lolos_ else None), terbaik


def evaluasi_sel(seri, sel_fitur, gav_sel, kov_g, ctx, tenggat=None, ukuran_blok=2.0):
    """Sel 0,25 derajat 2019 vs Gaveau (leave-one-spatial-block-out, blok 2x2 derajat). Sel Gaveau tanpa titik panas TIDAK terjangkau model
    (dilaporkan sebagai `ha_gaveau_tanpa_titik`). -> {'n_sel', 'ha_gaveau_total', 'ha_gaveau_tanpa_titik', 'model': [...]}"""
    rows = []
    for k, f in sel_fitur.items():
        if f.get("n_nh", 0) <= 0:
            continue
        ff = dict(f)
        ff.update(kov_g.get(f["g"], {}))
        blok = (math.floor(f["lat"] / ukuran_blok), math.floor(f["lon"] / ukuran_blok))
        rows.append({"id": k, "g": f["g"], "blok": blok, "f": ff, "ha": gav_sel.get(k, 0.0)})
    ids_blok = {b: i for i, b in enumerate(sorted({r["blok"] for r in rows}))}
    for r in rows:
        r["bi"] = ids_blok[r["blok"]]
    truth = {(r["id"], r["bi"]): r["ha"] for r in rows}
    tanpa = sum(v for k, v in gav_sel.items() if k not in sel_fitur or sel_fitur[k].get("n_nh", 0) <= 0)
    out = {"n_sel": len(rows), "n_blok": len(ids_blok), "ha_gaveau_total": sum(gav_sel.values()), "ha_gaveau_tanpa_titik": tanpa, "model": []}
    for nm in MODEL:
        if tenggat and tenggat():
            out["model"].append({"model": nm, "seri": seri, "dilewati": "anggaran habis"})
            continue
        fit = spec_model(nm, ctx)
        pred = {}
        for bi in ids_blok.values():
            tr = [Latihan(dict(r["f"], _g=r["g"]), r["ha"], r["bi"], r["g"]) for r in rows if r["bi"] != bi and r["ha"] >= MIN_TRAIN_HA]
            if not tr and nm != "M0":
                continue
            ramal = fit(tr)
            for r in rows:
                if r["bi"] == bi:
                    pred[(r["id"], r["bi"])] = ramal(dict(r["f"], _g=r["g"]))
        tot_pred = sum(math.exp(v) for v in pred.values())
        out["model"].append({"model": nm, "seri": seri, "metrik": metrik(pred, truth), "ha_prediksi_total": round(tot_pred),
                             "rasio_total_vs_gaveau_sel_bertitik": bulat(tot_pred / sum(r["ha"] for r in rows), 3) if rows and sum(r["ha"] for r in rows) else None})
    return out


# ================================================================ prediksi akhir + selang + tabel
def kumpul_residu(pred, truth, min_ha=MIN_EVAL_HA):
    return {k: math.log(truth[k]) - pred[k] for k in pred if k in truth and truth[k] >= min_ha}


def selang_unit(ln_pred, tahun, residu):
    """ln_pred + kuantil 10/90 residu tahun LAIN (konformal silang per tahun) -> (p10, p50, p90) ha."""
    pool = [e for k, e in residu.items() if k[1] != tahun]
    if len(pool) < 3:
        pool = list(residu.values())
    if not pool:
        return None
    return tuple(math.exp(ln_pred + kuantil(pool, q)) for q in (0.1, 0.5, 0.9))


def prediksi_unit(entri, baris, ref, ctx, preds, truth_gab, tenggat=None):
    """Prediksi p10/p50/p90 per unit untuk model `entri`: LOYO untuk unit berlabel, model akhir untuk lainnya. -> {(g,y): dict}"""
    seri, nm, acuan = entri["seri"], entri["model"], entri["acuan_latih"]
    pr_loyo = preds.get((seri, nm, acuan, "loyo"), {})
    residu = kumpul_residu(pr_loyo, truth_gab)
    kor = bangun_koreksi(ref["gwis"], ref.get("gaveau"))
    tt = tabel_target(acuan, ref, kor)
    tr = [Latihan(dict(b["f"], _g=b["g"]), tt[(b["g"], b["y"])], b["y"], b["g"]) for b in baris
          if (b["g"], b["y"]) in tt and tt[(b["g"], b["y"])] >= MIN_TRAIN_HA and b["f"].get("n_nh", 0) > 0]
    ramal = spec_model(nm, ctx)(tr) if tr or nm == "M0" else None
    out = {}
    for b in baris:
        if b["f"].get("n_nh", 0) <= 0:
            continue
        k = (b["g"], b["y"])
        if k in pr_loyo:
            lp, asal = pr_loyo[k], "LOYO"
        elif ramal:
            lp, asal = ramal(dict(b["f"], _g=b["g"])), "model_akhir"
        else:
            continue
        s = selang_unit(lp, b["y"], residu)
        if s:
            out[k] = {"p10": s[0], "p50": s[1], "p90": s[2], "asal": asal}
    return out


def ensoy(oni_jas, y):
    return oni_jas.get(y)


def bendera_tabel(baris_tahun, refs_fn, oni_jas, sensor_ganti=(2012, 2018, 2023), dmi=None):
    """baris_tahun: {y: {'luas': {p10,p50,p90}|None, 'hotspot_seri': n|None, 'nfs': n|None}} -> {y: bendera}. refs_fn(y) -> list[float] acuan."""
    ys = sorted(baris_tahun)
    out = {}

    def rasio_hist(y, kunci):
        v = []
        for j in ys:
            r = baris_tahun[j]
            if j != y and r.get("luas") and r.get(kunci):
                v.append(r["luas"]["p50"] / r[kunci])
        return v
    for i, y in enumerate(ys):
        r = baris_tahun[y]
        fl = {"dalam_pita": None, "selang_tumpang": None, "rasio_hotspot_hist": None, "rasio_firespot_hist": None, "lonjakan": None}
        sebab = []
        if r.get("luas"):
            refs = [v for v in refs_fn(y) if v]
            if refs:
                lo, hi = min(refs), max(refs)
                fl["dalam_pita"] = bool(lo <= r["luas"]["p50"] <= hi)
                fl["selang_tumpang"] = bool(r["luas"]["p10"] <= hi and r["luas"]["p90"] >= lo)
                if r["luas"]["p50"] > hi:
                    sebab.append("model di atas semua acuan (acuan kurang hitung?)")
                elif r["luas"]["p50"] < lo:
                    sebab.append("model di bawah semua acuan")
            for kunci, nama in (("hotspot_seri", "rasio_hotspot_hist"), ("nfs", "rasio_firespot_hist")):
                h = rasio_hist(y, kunci)
                if r.get(kunci) and len(h) >= 5:
                    x = r["luas"]["p50"] / r[kunci]
                    fl[nama] = bool(kuantil(h, 0.05) <= x <= kuantil(h, 0.95))
            if i > 0 and baris_tahun[ys[i - 1]].get("luas") and ys[i - 1] == y - 1:
                faktor = r["luas"]["p50"] / baris_tahun[ys[i - 1]]["luas"]["p50"]
                if faktor >= 2 or faktor <= 0.5:
                    a, b = oni_jas.get(y), oni_jas.get(y - 1)
                    jelas = bool(a is not None and b is not None and ((faktor >= 2 and a - b >= 0.5 and a >= 0.5) or (faktor <= 0.5 and b - a >= 0.5 and b >= 0.5)))
                    da, db = (dmi or {}).get(y), (dmi or {}).get(y - 1)   # IOD positif (DMI JAS >= 0,4 dan naik >= 0,3) juga pendorong kekeringan (2019)
                    iod = bool(da is not None and db is not None and ((faktor >= 2 and da >= 0.4 and da - db >= 0.3) or (faktor <= 0.5 and db >= 0.4 and db - da >= 0.3)))
                    fl["lonjakan"] = {"faktor": bulat(faktor, 2), "dijelaskan_enso": jelas, "dijelaskan_iod": iod,
                                      "oni_jas": [bulat(b, 2) if b is not None else None, bulat(a, 2) if a is not None else None],
                                      "dmi_jas": [bulat(db, 2) if db is not None else None, bulat(da, 2) if da is not None else None]}
                    if iod and not jelas:
                        sebab.append("lonjakan %.1fx dijelaskan IOD positif (DMI JAS %.1f), bukan ENSO" % (faktor, da))
                    if not jelas and not iod:
                        sebab.append("lonjakan %.1fx tak dijelaskan ENSO maupun IOD" % faktor)
        a = oni_jas.get(y)
        if a is not None and a >= 0.5:
            sebab.append("El Nino (ONI JAS %.1f)" % a)
        if y in sensor_ganti:
            sebab.append({2012: "S-NPP VIIRS mulai (Jan 2012)", 2018: "NOAA-20 mulai (Apr 2018)", 2023: "NOAA-21 mulai"}[y])
        if y in (2001, 2002):
            sebab.append("MODIS Terra saja (Aqua mulai Jul 2002)")
        gagal = [k for k in ("dalam_pita", "rasio_hotspot_hist", "rasio_firespot_hist") if fl[k] is False] + (["lonjakan"] if fl["lonjakan"] and not (fl["lonjakan"]["dijelaskan_enso"] or fl["lonjakan"]["dijelaskan_iod"]) else [])
        out[y] = {"tally": fl, "cocok": (not gagal) if any(fl[k] is not None for k in ("dalam_pita", "rasio_hotspot_hist", "rasio_firespot_hist")) else None,
                  "gagal": gagal, "sebab_dugaan": sebab}
    return out


# ================================================================ kovariat
def oni_per_tahun():
    d = muat_json(os.path.join(PUB, "iklim.json")) or {}
    jas, aso = {}, {}
    for r in d.get("oni", []):
        if r["musim"] == "JAS":
            jas[int(r["tahun"])] = float(r["nilai"])
        elif r["musim"] == "ASO":
            aso[int(r["tahun"])] = float(r["nilai"])
    return jas, aso


def dmi_jas(catatan, tenggat):
    """DMI Jul-Sep dari NOAA PSL (dmi.had.long.data); cadangan: dmi mingguan iklim.json (2024-2026 saja)."""
    out = {}
    try:
        teks = ambil_teks("https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/dmi.had.long.data", coba=2)
        for b in teks.splitlines():
            p = b.split()
            if len(p) == 13 and p[0].isdigit():
                v = [float(x) for x in p[1:]]
                if all(x > -90 for x in v[6:9]):
                    out[int(p[0])] = sum(v[6:9]) / 3
        catatan["dmi"] = "NOAA PSL dmi.had.long.data, %d tahun" % len(out)
    except Exception as e:  # noqa: BLE001
        catatan["dmi"] = "PSL gagal (%s); cadangan iklim.json mingguan hanya 2024-2026" % redaksi(e)[:80]
        d = muat_json(os.path.join(PUB, "iklim.json")) or {}
        per = {}
        for r in d.get("dmi", []):
            y, m = int(r["tgl"][:4]), int(r["tgl"][5:7])
            if 7 <= m <= 9:
                per.setdefault(y, []).append(r["nilai"])
        out = {y: sum(v) / len(v) for y, v in per.items() if len(v) >= 6}
    return out


def chirps_tahun(peta, th, catatan, tenggat):
    """Hujan Jul-Okt (mm, jumlah 4 bulan) per grup provinsi dari CHIRPS 0,05 derajat stride 5 (0,25 derajat) via ERDDAP coastwatch."""
    jalur = os.path.join(RAW, "chirps", "%d.csv" % th)
    if not os.path.exists(jalur):
        url = ("https://coastwatch.pfeg.noaa.gov/erddap/griddap/chirps20GlobalMonthlyP05.csv?precip[(%d-07-01T00:00:00Z):1:(%d-10-01T00:00:00Z)]"
               "[(-11.0):5:(6.0)][(95.0):5:(141.0)]" % (th, th))
        ambil_ke(url, jalur, batas_dtk=180)
    per = {}
    with open(jalur) as f:
        r = csv.reader(f)
        next(r, None), next(r, None)
        akum = {}
        for b in r:
            try:
                v = float(b[3])
            except (ValueError, IndexError):
                continue
            if v < 0 or v != v:
                continue
            akum[(b[1], b[2])] = akum.get((b[1], b[2]), 0.0) + v
        for (la, lo), v in akum.items():
            g = peta.prov(float(la), float(lo))
            if g:
                per.setdefault(g, []).append(v)
    return {g: sum(v) / len(v) for g, v in per.items() if v}


def rasterio_ada():
    try:
        import numpy  # noqa: F401
        import rasterio  # noqa: F401
        return True
    except ImportError:
        return False


def hansen_hilang(peta, tenggat, catatan):
    """Porsi sampel 0,01 derajat dengan lossyear == k per grup (ubin 10 derajat Hansen GFC-2024-v1.12, dibaca terdesimasi; disampel)."""
    if not rasterio_ada():
        catatan["hansen"] = "dilewati: rasterio/numpy tidak ada"
        return None
    import numpy as np
    import rasterio
    from rasterio.enums import Resampling
    hit, tot = {}, {}
    ok = 0
    for lat in ("10N", "00N", "10S"):
        for lon in ("090E", "100E", "110E", "120E", "130E", "140E"):
            if tenggat():
                catatan["hansen"] = "dihentikan anggaran setelah %d ubin" % ok
                break
            url = "/vsicurl/https://storage.googleapis.com/earthenginepartners-hansen/GFC-2024-v1.12/Hansen_GFC-2024-v1.12_lossyear_%s_%s.tif" % (lat, lon)
            try:
                with rasterio.open(url) as src:
                    a = src.read(1, out_shape=(1000, 1000), resampling=Resampling.nearest)
                    t = src.transform * rasterio.Affine.scale(src.width / 1000, src.height / 1000)
            except Exception as e:  # noqa: BLE001
                catatan.setdefault("hansen_ubin_gagal", []).append("%s_%s: %s" % (lat, lon, redaksi(e)[:60]))
                continue
            ok += 1
            for iy in range(0, 1000, 2):
                for ix in range(0, 1000, 2):
                    x, y = t * (ix + 0.5, iy + 0.5)
                    g = peta.prov(y, x)
                    if not g:
                        continue
                    tot[g] = tot.get(g, 0) + 1
                    v = int(a[iy, ix])
                    if v:
                        hit.setdefault(g, {})[2000 + v] = hit.setdefault(g, {}).get(2000 + v, 0) + 1
    if not tot:
        catatan.setdefault("hansen", "tak ada ubin terbaca")
        return None
    catatan.setdefault("hansen", "disampel 0,02 derajat; %d ubin" % ok)
    return {g: {y: c / tot[g] for y, c in d.items()} for g, d in hit.items()}


def worldcover_porsi(peta, tenggat, catatan):
    """Porsi kelas tutupan ESA WorldCover 2021 per grup (COG 3 derajat dibaca terdesimasi; disampel)."""
    if not rasterio_ada():
        catatan["worldcover"] = "dilewati: rasterio/numpy tidak ada"
        return None
    import rasterio
    from rasterio.enums import Resampling
    kelas = {10: "wc_pohon", 20: "wc_semak", 30: "wc_rumput", 40: "wc_lahan", 90: "wc_basah", 95: "wc_basah"}
    cnt, tot = {}, {}
    ok = 0
    for la in range(-12, 6, 3):
        for lo in range(93, 141, 3):
            if tenggat():
                catatan["worldcover"] = "dihentikan anggaran setelah %d ubin" % ok
                return _wc_bagi(cnt, tot) if tot else None
            nm = "%s%02d%s%03d" % ("N" if la >= 0 else "S", abs(la), "E", lo)
            url = "/vsicurl/https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_%s_Map.tif" % nm
            try:
                with rasterio.open(url) as src:
                    a = src.read(1, out_shape=(150, 150), resampling=Resampling.nearest)
                    t = src.transform * rasterio.Affine.scale(src.width / 150, src.height / 150)
            except Exception as e:  # noqa: BLE001
                catatan.setdefault("worldcover_ubin_gagal", []).append("%s: %s" % (nm, redaksi(e)[:60]))
                continue
            ok += 1
            for iy in range(150):
                for ix in range(150):
                    x, y = t * (ix + 0.5, iy + 0.5)
                    g = peta.prov(y, x)
                    if not g:
                        continue
                    tot[g] = tot.get(g, 0) + 1
                    k = kelas.get(int(a[iy, ix]))
                    if k:
                        cnt.setdefault(g, {})[k] = cnt.setdefault(g, {}).get(k, 0) + 1
    catatan["worldcover"] = "disampel 0,02 derajat; %d ubin" % ok
    return _wc_bagi(cnt, tot) if tot else None


def _wc_bagi(cnt, tot):
    return {g: {k: c / tot[g] for k, c in d.items()} for g, d in cnt.items()}


def gfed5_prov(peta, catatan, tenggat):
    """GFED5 BA (Zenodo 7668424) per grup, bila netCDF4 terpasang; selain itu dicatat dan dilewati."""
    try:
        import netCDF4  # noqa: F401
    except ImportError:
        catatan["gfed5"] = "dilewati: netCDF4 tidak terpasang (butuh pustaka tambahan untuk netCDF-4/HDF5)"
        return None
    import netCDF4
    try:
        meta = json.loads(ambil_teks("https://zenodo.org/api/records/7668424"))
    except Exception as e:  # noqa: BLE001
        catatan["gfed5"] = "API Zenodo gagal: " + redaksi(e)[:100]
        return None
    out = {}
    for f in meta.get("files", []):
        nm = f.get("key") or f.get("filename") or ""
        m = re.search(r"(20\d\d|19\d\d)", nm)
        if not nm.endswith(".nc") or not m or (f.get("size") or 0) > 800 * 2 ** 20:
            continue
        if tenggat():
            catatan["gfed5"] = "dihentikan anggaran"
            break
        jalur = os.path.join(RAW, "gfed5", os.path.basename(nm))
        try:
            url = (f.get("links") or {}).get("self") or (f.get("links") or {}).get("download") or ""
            if not url.startswith("https://zenodo.org/"):  # URL dari respons luar: hanya host Zenodo
                catatan.setdefault("gfed5_url_ditolak", []).append(nm)
                continue
            if not os.path.exists(jalur):
                ambil_ke(url, jalur, batas_dtk=300, batas_byte=800 * 2 ** 20)
            ds = netCDF4.Dataset(jalur)
            v = next((ds.variables[k] for k in ds.variables if k.lower() in ("total", "ba_total", "burned_area")), None)
            lat = ds.variables.get("lat") or ds.variables.get("latitude")
            lon = ds.variables.get("lon") or ds.variables.get("longitude")
            if v is None or lat is None or lon is None:
                catatan.setdefault("gfed5_berkas_tak_dikenal", []).append(nm)
                continue
            satuan = (getattr(v, "units", "") or "").lower()
            data = v[:]
            y = int(m.group(1))
            for i, la in enumerate(lat[:]):
                if not (-12 <= la <= 7):
                    continue
                for j, lo in enumerate(lon[:]):
                    if not (94 <= lo <= 142):
                        continue
                    g = peta.prov(float(la), float(lo))
                    if not g:
                        continue
                    x = data[..., i, j]
                    x = float(x.sum()) if hasattr(x, "sum") else float(x)
                    area_ha = 0.25 * 110.57 * 0.25 * 111.32 * math.cos(math.radians(float(la))) * 100
                    ha = x * 100 if "km" in satuan else x / 1e4 if "m2" in satuan or "m^2" in satuan else x * area_ha if "fraction" in satuan or satuan in ("", "1") else x
                    out.setdefault(g, {})[y] = out.get(g, {}).get(y, 0.0) + ha
            ds.close()
        except Exception as e:  # noqa: BLE001
            catatan.setdefault("gfed5_berkas_gagal", []).append("%s: %s" % (os.path.basename(nm), redaksi(e)[:60]))
    if out:
        catatan.setdefault("gfed5", "GFED5 terbaca (%d provinsi); satuan ditebak dari atribut units, penugasan sel ke provinsi pakai titik tengah" % len(out))
    else:
        catatan.setdefault("gfed5", "tak ada berkas yang dapat dibaca")
    return out or None


def statis_lahan(peta, catatan):
    """Porsi luas gambut/konsesi/kawasan per grup dan kanal km/km2 dari poligon (penugasan lewat titik tengah). -> {g: {...}}"""
    luas, lap = {}, {}
    for nama in ("gambut", "konsesi", "kawasan"):
        p = os.path.join(PUB, "lahan", nama + ".geojson")
        if not os.path.exists(p):
            continue
        for f in json.load(open(p))["features"]:
            for r in cincin_fitur(f["geometry"]):
                lat = sum(c[1] for c in r) / len(r)
                lon = sum(c[0] for c in r) / len(r)
                g = peta.prov(lat, lon)
                if g:
                    lap.setdefault(g, {}).setdefault(nama, 0.0)
                    lap[g][nama] += luas_cincin_km2(r)
    kn = muat_json(os.path.join(PUB, "kanal.json"))
    kanal = {}
    if kn:
        for la, lo, km in kn["grid"]:
            g = peta.prov(la, lo)
            if g:
                kanal[g] = kanal.get(g, 0.0) + km
    for g in set(lap) | set(kanal):
        luas[g] = {"km2_gambut": lap.get(g, {}).get("gambut", 0.0), "km2_konsesi": lap.get(g, {}).get("konsesi", 0.0),
                   "km2_kawasan": lap.get(g, {}).get("kawasan", 0.0), "kanal_km": kanal.get(g)}
    catatan["kanal"] = "kanal.json hanya 9 provinsi; sisanya kanal_dens kosong (diimputasi 0)"
    return luas


def luas_provinsi_km2(peta, tenggat=None):
    """Luas darat per grup dari kisi 0,1 derajat (titik tengah)."""
    out = {}
    la = BBOX[1] + 0.05
    while la < BBOX[3]:
        lo = BBOX[0] + 0.05
        while lo < BBOX[2]:
            g = peta.prov(la, lo)
            if g:
                out[g] = out.get(g, 0.0) + 11.057 * 11.132 * math.cos(math.radians(la))
            lo += 0.1
        la += 0.1
        if tenggat and tenggat():
            break
    return out


# ================================================================ rakit baris model
def rakit_baris(seri, fitur_cache, statis, kov, tahun_min, tahun_maks):
    """fitur_cache: {'N|2019': {'prov': {g: fitur}}} -> list baris {g,y,f}. kov: {'oni_jas','oni_aso','dmi','hujan':{g:{y:mm}},'hilang':{g:{y:frac}},'wc':{g:{}},'luas_km2':{g:km2}}."""
    baris = []
    for y in range(tahun_min, tahun_maks + 1):
        e = fitur_cache.get("%s|%d" % (seri, y))
        if not e:
            continue
        for g, f in e["prov"].items():
            if "ncl" not in f:
                continue
            ff = dict(f)
            ff.update(kovariat_baris(g, y, statis, kov))
            baris.append({"g": g, "y": y, "f": ff})
    # anomali hujan z per grup
    for g in {b["g"] for b in baris}:
        v = [(b, (kov.get("hujan") or {}).get(g, {}).get(b["y"])) for b in baris if b["g"] == g]
        v = [(b, x) for b, x in v if x is not None]
        if len(v) >= 5:
            mu = sum(x for _, x in v) / len(v)
            sd = math.sqrt(sum((x - mu) ** 2 for _, x in v) / len(v)) or 1.0
            for b, x in v:
                b["f"]["hujan_z"] = (x - mu) / sd
    return baris


def kovariat_baris(g, y, statis, kov):
    f = {}
    for k, ky in (("oni_jas", "oni_jas"), ("oni_aso", "oni_aso"), ("dmi_jas", "dmi")):
        v = (kov.get(ky) or {}).get(y)
        if v is not None:
            f[k] = v
    h = ((kov.get("hujan") or {}).get(g) or {}).get(y)
    if h is not None:
        f["hujan_mm"] = h
    hl = (kov.get("hilang") or {}).get(g)
    if hl:
        f["hilang012"] = sum(hl.get(yy, 0.0) for yy in (y - 2, y - 1, y))
    for k, v in ((kov.get("wc") or {}).get(g) or {}).items():
        f[k] = v
    s = (statis or {}).get(g)
    a = (kov.get("luas_km2") or {}).get(g)
    if s and a and s.get("kanal_km") is not None:
        f["kanal_dens"] = s["kanal_km"] / a
    return f


def faktor_setara(fitur_cache):
    """Median nasional N_nh / M_nh pada tahun tumpang tindih (M0 seri M: MODIS x faktor setara S-NPP)."""
    r = []
    for y in range(2013, 2026):
        n, m = fitur_cache.get("N|%d" % y), fitur_cache.get("M|%d" % y)
        if not n or not m:
            continue
        a = sum(f.get("n_nh", 0) for f in n["prov"].values())
        b = sum(f.get("n_nh", 0) for f in m["prov"].values())
        if a and b:
            r.append(a / b)
    return median(r) if r else 1.0


# ================================================================ tabel kecocokan
def bangun_tabel(fitur_cache, pred_seri, ref, kov, repo_hot, oni_jas, seri_pilih, nama_model):
    """pred_seri: {seri: {(g,y): {p10,p50,p90,asal}}}. Tabel nasional + 9 prioritas, 2001-2026."""
    def sumber_luas(g, y):
        for s in (seri_pilih, "M" if seri_pilih == "N" else "N"):
            p = (pred_seri.get(s) or {}).get((g, y))
            if p:
                return p, s
        return None, None

    def hot(sensor, y, g=None):
        e = fitur_cache.get("%s|%d" % (sensor, y))
        if e:
            if g is None:
                return sum(f.get("n", 0) for f in e["prov"].values()), "unduhan"
            f = e["prov"].get(g)
            return (f.get("n", 0) if f else 0), "unduhan"
        return None, None

    def ber(g, y):
        f = {}
        for sn in ("M", "N", "N20", "N21"):
            v, a = hot(sn, y, g)
            f[sn] = v
        return f

    def baris_unit(grups, tahun_list, nasional):
        per = {}
        for y in tahun_list:
            luas = None
            asal_seri = None
            ps = [sumber_luas(g, y) for g in grups]
            ps = [(p, s) for p, s in ps if p]
            if ps:
                luas = {k: sum(p[k] for p, _ in ps) for k in ("p10", "p50", "p90")}
                luas["asal"] = "/".join(sorted({p["asal"] for p, _ in ps}))
                asal_seri = sorted({s for _, s in ps})
            sn = asal_seri[0] if asal_seri else seri_pilih
            hs = fitur_cache.get("%s|%d" % (sn, y))
            nh = sum((hs["prov"].get(g) or {}).get("n_nh", 0) for g in grups) if hs else None
            nfs = sum((hs["prov"].get(g) or {}).get("nfs", 0) for g in grups) if hs else None
            ncl = sum((hs["prov"].get(g) or {}).get("ncl", 0) for g in grups) if hs else None
            hot_ = {sn_: (sum(((fitur_cache.get("%s|%d" % (sn_, y)) or {"prov": {}})["prov"].get(g) or {}).get("n", 0) for g in grups)
                          if fitur_cache.get("%s|%d" % (sn_, y)) else None) for sn_ in ("M", "N", "N20", "N21")}
            ac = {"sipongi": _jum(ref["sipongi"], grups, y), "gwis": _jum(ref["gwis"], grups, y),
                  "gaveau": _jum_g(ref.get("gaveau"), grups) if y == 2019 else None,
                  "gfed5": _jum(ref.get("gfed5") or {}, grups, y), "nusantara": NUSANTARA_2026 if (nasional and y == 2026) else None}
            per[y] = {"luas": luas, "hotspot_seri": nh, "nfs": nfs, "ncl": ncl, "hot": hot_, "ac": ac, "seri_luas": asal_seri}
        return per

    def refs(per):
        return lambda y: [v for k, v in per[y]["ac"].items() if v]

    def render(per, tahun_list):
        bd = bendera_tabel({y: per[y] for y in tahun_list}, refs(per), oni_jas, dmi=(kov or {}).get("dmi"))
        rows = []
        for y in tahun_list:
            r, ac, l = per[y], per[y]["ac"], per[y]["luas"]
            def rs(a, b):
                return bulat(a / b, 3) if a and b else None
            rows.append({"tahun": y, "hotspot": r["hot"], "hotspot_seri_nh": r["hotspot_seri"], "firespot_R0": r["nfs"], "cluster": r["ncl"],
                         "luas_model": {k: round(l[k]) for k in ("p10", "p50", "p90")} | {"asal": l["asal"], "seri": r["seri_luas"]} if l else None,
                         "acuan": {k: (round(v) if v else None) for k, v in ac.items()},
                         "rasio": {"model_sipongi": rs(l and l["p50"], ac["sipongi"]), "model_gwis": rs(l and l["p50"], ac["gwis"]),
                                   "model_gaveau": rs(l and l["p50"], ac["gaveau"]), "model_nusantara": rs(l and l["p50"], ac["nusantara"]),
                                   "sipongi_gwis": rs(ac["sipongi"], ac["gwis"])},
                         "ha_per_hotspot": rs(l and l["p50"], r["hotspot_seri"]), "ha_per_firespot": rs(l and l["p50"], r["nfs"]),
                         **bd[y]})
        return rows

    semua_g = sorted({g for d in pred_seri.values() for (g, _) in d} | set(fitur_cache_grup(fitur_cache)))
    tabel = {"nasional": render(baris_unit(semua_g, TAHUN_TABEL, True), TAHUN_TABEL), "prov": {}}
    for g in prioritas_grup():
        tabel["prov"][g] = {"nama": nama_grup(g), "baris": render(baris_unit([g], TAHUN_TABEL, False), TAHUN_TABEL)}
    return tabel


def fitur_cache_grup(fc):
    return {g for e in fc.values() for g in e.get("prov", {})}


def _jum(d, grups, y):
    v = [d[g][y] for g in grups if g in d and y in d[g]]
    return sum(v) if v else None


def _jum_g(d, grups):
    v = [d[g] for g in grups if d and g in d]
    return sum(v) if v else None


# ================================================================ ringkas (markdown)
def f_ha(v):
    return "-" if v is None else "{:,.0f}".format(v).replace(",", ".")


def tanda(b):
    return "-" if b is None else "ya" if b else "TIDAK"


def tulis_md(J):
    L = ["# Luas terbakar: model terintegrasi dan tabel kecocokan antartahun (LAB)", "",
         "Status: **%s** · dibuat %s · bukan produksi." % (J.get("status"), J.get("dibuat")), ""]
    tp = J.get("terpilih")
    if tp:
        L.append("Model terpilih: **%s / seri %s / dilatih terhadap %s** (lolos K1-K3)." % (tp["model"], tp["seri"], tp["acuan_latih"]))
    else:
        tb = J.get("terbaik_tak_lolos")
        L.append("**Tidak ada model yang lolos kriteria K1-K3.**" + (" Terbaik (TIDAK lolos): %s / seri %s / %s, MAPE LOYO %s." % (
            tb["model"], tb["seri"], tb["acuan_latih"], tb["loyo"]["vs_gabungan"].get("mape")) if tb else " Belum ada hasil validasi."))
    L += ["", "Kriteria (dipra-tulis): MAPE <= 30% vs acuan gabungan (LOYO); 2019 vs Gaveau rasio median 0,7-1,4 dan korelasi log >= 0,7; cakupan P10-P90 70-90%.", ""]
    L += ["## Validasi (LOYO, terhadap acuan gabungan)", "", "| Seri | Model | Latih | n | MAPE | rasio med | cakupan | Gaveau19 rasio/korelasi | K1 K2 K3 |", "|---|---|---|---|---|---|---|---|---|"]
    for e in J.get("model", []):
        if not e.get("boleh_dipilih") or "vs_gabungan" not in (e.get("loyo") or {}):
            continue
        m, g, lo = e["loyo"]["vs_gabungan"], e["loyo"].get("gaveau_2019", {}), e.get("lolos", {})
        L.append("| %s | %s | %s | %s | %s | %s | %s | %s/%s | %s %s %s |" % (e["seri"], e["model"], e["acuan_latih"], m.get("n"), m.get("mape"), m.get("rasio_median"),
                                                                        m.get("cakupan_p10_p90"), g.get("rasio_median"), g.get("korelasi_log"),
                                                                        tanda(lo.get("K1")), tanda(lo.get("K2")), tanda(lo.get("K3"))))
    L += ["", "## Tabel kecocokan nasional (ha)", "",
          "| Tahun | Hot M | Hot N | Hot N20 | Hot N21 | Firespot | Cluster | Model P10 | P50 | P90 | SiPongi | GWIS | Gaveau | Nusantara | M/Sip | M/GWIS | pita | rasio hot | rasio fs | cocok |",
          "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for r in (J.get("tabel") or {}).get("nasional", []):
        l, a, t = r.get("luas_model") or {}, r["acuan"], r["tally"]
        h = r["hotspot"]
        L.append("| %d | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s |" % (
            r["tahun"], f_ha(h.get("M")), f_ha(h.get("N")), f_ha(h.get("N20")), f_ha(h.get("N21")), f_ha(r.get("firespot_R0")), f_ha(r.get("cluster")),
            f_ha(l.get("p10")), f_ha(l.get("p50")), f_ha(l.get("p90")), f_ha(a.get("sipongi")), f_ha(a.get("gwis")), f_ha(a.get("gaveau")), f_ha(a.get("nusantara")),
            r["rasio"].get("model_sipongi") or "-", r["rasio"].get("model_gwis") or "-", tanda(t["dalam_pita"]), tanda(t["rasio_hotspot_hist"]),
            tanda(t["rasio_firespot_hist"]), tanda(r.get("cocok"))))
    ket = [r for r in (J.get("tabel") or {}).get("nasional", []) if r.get("cocok") is False]
    if ket:
        L += ["", "## Tahun yang tidak cocok (nasional) dan dugaan sebab", ""]
        for r in ket:
            L.append("- %d: gagal %s. %s" % (r["tahun"], ", ".join(r["gagal"]), "; ".join(r["sebab_dugaan"]) or "tanpa dugaan"))
    L += ["", "## Provinsi prioritas (P50 model / SiPongi / GWIS, ha), tahun kunci", "", "| Provinsi | 2015 | 2019 | 2023 | 2024 | 2025 |", "|---|---|---|---|---|---|"]
    for g, d in ((J.get("tabel") or {}).get("prov") or {}).items():
        by = {r["tahun"]: r for r in d["baris"]}

        def sel(y):
            r = by.get(y)
            if not r:
                return "-"
            return "%s / %s / %s" % (f_ha((r.get("luas_model") or {}).get("p50")), f_ha(r["acuan"].get("sipongi")), f_ha(r["acuan"].get("gwis")))
        L.append("| %s | %s |" % (d["nama"], " | ".join(sel(y) for y in (2015, 2019, 2023, 2024, 2025))))
    if J.get("belum_dikerjakan"):
        L += ["", "## Belum dikerjakan", ""] + ["- " + x[:140] for x in J["belum_dikerjakan"]]
    L += ["", "## Kejujuran data", ""] + ["- " + x for x in J.get("jujur", [])]
    return "\n".join(L) + "\n"


# ================================================================ mode jalan
def simpan_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"), default=lambda o: bulat(float(o), 4) if isinstance(o, float) else str(o))
    os.replace(tmp, path)


def tugas_titik():
    """Urutan prioritas (sensor, tahun, klaster, sampai). 2019 (Gaveau), El Nino besar, lalu tahun bersejarah, sisanya."""
    kini = dt.datetime.now(UTC)
    urut = [2019, 2015, 2023, 2018, 2020, 2021, 2022, 2024, 2025, 2016, 2017, 2014, 2013, 2012]
    urut += [y for y in range(2003, 2012)][::-1] + [2002, 2001]
    out = []
    for y in urut:
        for s in ("N", "M"):
            if y >= SENSOR_ARSIP[s][1] and y <= kini.year and not (s == "M" and y == kini.year):
                out.append((s, y, True, None))
    for y in range(2013, kini.year + 1):
        for s in ("N20", "N21"):
            if y >= SENSOR_ARSIP[s][1]:
                out.append((s, y, False, None))
    out.append(("N", kini.year, True, None))
    out.append(("M", kini.year, True, None))
    out.append(("N", kini.year, True, "%d-09-30" % kini.year))
    seen, res = set(), []
    for t in out:
        if (t[0], t[1], t[3]) not in seen:
            seen.add((t[0], t[1], t[3]))
            res.append(t)
    return res


def sha_kriteria():
    return hashlib.sha256(json.dumps(KRITERIA, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:12]


def kunci_cache(sensor, y, sampai):
    return "%s|%d" % (sensor, y) + ("|%s" % sampai[5:].replace("-", "") if sampai else "")


def jalan():
    ang = Anggaran(float(os.environ.get("LAB_MENIT", "30")))
    mulai = dt.datetime.now(UTC).isoformat(timespec="seconds")
    os.makedirs(OUT, exist_ok=True)
    p_luas, p_fit = os.path.join(OUT, "luas.json"), os.path.join(OUT, "luas_fitur.json")
    # 1. kriteria DIKUNCI sebelum menghitung apa pun
    simpan_json(p_luas, {"versi": 1, "status": "berjalan", "dibuat": mulai, "kriteria": dict(KRITERIA, dikunci_pada=mulai, sha=sha_kriteria()), "jujur": JUJUR})
    kunci = kunci_firms()
    cache = (muat_json(p_fit) or {}).get("unit", {})
    catatan, status, belum = {}, {}, []
    log("memuat peta ...")
    peta = Peta.dari_repo()
    habis_data = lambda: ang.lewat(0.55)   # noqa: E731
    # 2. acuan
    sip, gw = acuan_repo()
    ref = {"sipongi": sip, "gwis": gw, "gaveau": None, "gfed5": None}
    def _tenggat_gav():
        if ang.lewat(0.25):
            raise TimeoutError("anggaran Gaveau habis")
    try:
        selesai, gav = dengan_batas(lambda: gaveau_dari_zenodo(peta, _tenggat_gav, catatan), 0.25 * ang.total)
        if not selesai:
            catatan["gaveau"] = "GAGAL: lewat batas waktu %d dtk (pembaca citra tidak dapat diinterupsi)" % (0.25 * ang.total)
    except BaseException as e:  # noqa: BLE001
        gav = None
        catatan["gaveau"] = "GAGAL: " + redaksi(e)[:160]
    if gav:
        ref["gaveau"] = gav["prov"]
        ref["gaveau_sel"] = gav["sel"]
        catatan["gaveau"] = "Zenodo 4551243: %d petak, total %.0f ha" % (gav["n"], gav["total"])
    ref["gfed5"] = gfed5_prov(peta, catatan, lambda: ang.lewat(0.3))
    # 3. titik FIRMS
    for s, y, kl, sampai in tugas_titik():
        kc = kunci_cache(s, y, sampai)
        if kc in cache:
            continue
        if ang.sisa() < 0.45 * ang.total or habis_data():
            belum.append("titik %s" % kc)
            continue
        titik = titik_sensor_tahun(s, y, kunci, habis_data, status, sampai)
        if titik is None:
            belum.append("titik %s (%s)" % (kc, status.get("%s|%d" % (s, y), "?")[:60]))
            continue
        try:
            e = agregat(titik, peta, s, y, klaster=kl, sel=(kl and y in TAHUN_SEL), tenggat=habis_data)
        except TimeoutError:
            belum.append("agregasi %s (anggaran habis)" % kc)
            continue
        e["dibuat"] = dt.datetime.now(UTC).isoformat(timespec="seconds")
        cache[kc] = e
        simpan_json(p_fit, {"versi": 1, "unit": cache})
        log("selesai", kc, e["n_total"], "titik; sisa %.0f dtk" % ang.sisa())
    # 4. kovariat
    kov = {"luas_km2": luas_provinsi_km2(peta, lambda: ang.lewat(0.6))}
    kov["oni_jas"], kov["oni_aso"] = oni_per_tahun()
    kov["dmi"] = dmi_jas(catatan, None)
    statis = statis_lahan(peta, catatan)
    hujan = {}
    for y in range(2001, dt.datetime.now(UTC).year + 1):
        if ang.lewat(0.65):
            catatan["chirps"] = "dihentikan anggaran di %d" % y
            break
        try:
            for g, v in chirps_tahun(peta, y, catatan, None).items():
                hujan.setdefault(g, {})[y] = v
        except Exception as e:  # noqa: BLE001
            catatan.setdefault("chirps_tahun_gagal", []).append("%d: %s" % (y, redaksi(e)[:60]))
    kov["hujan"] = hujan
    catatan.setdefault("chirps", "ERDDAP coastwatch chirps20GlobalMonthlyP05, stride 5 (0,25 derajat), jumlah Jul-Okt" if hujan else "tak terbaca")
    kov["hilang"] = hansen_hilang(peta, lambda: ang.lewat(0.7), catatan)
    kov["wc"] = worldcover_porsi(peta, lambda: ang.lewat(0.75), catatan)
    catatan["dem"] = "dilewati (prioritas rendah)"
    # 5. model
    J = susun_hasil(cache, ref, kov, statis, ang, catatan, status, belum, mulai, gav)
    J["data"]["peta"] = peta.stat
    assert J["kriteria"]["sha"] == sha_kriteria()
    simpan_json(p_luas, J)
    with open(os.path.join(OUT, "luas_ringkas.md"), "w") as f:
        f.write(tulis_md(J))
    log("selesai; %s" % J["status"])


def susun_hasil(cache, ref, kov, statis, ang, catatan, status, belum, mulai, gav):
    hasil_all, preds_all, truth_all, baris_seri = [], {}, {}, {}
    ctx_seri = {}
    for seri, (y0, y1) in SERI.items():
        baris = rakit_baris(seri, cache, statis, kov, y0, min(y1, 2025))
        baris_seri[seri] = baris
        if len({b["y"] for b in baris}) < 3:
            belum.append("model seri %s: tahun berfitur < 3" % seri)
            continue
        ctx = {"seri": seri, "faktor_setara": faktor_setara(cache)}
        ctx_seri[seri] = ctx
        h, p, truth = evaluasi_seri(seri, baris, ref, ctx, tenggat=lambda: ang.lewat(0.92))
        hasil_all += h
        preds_all.update(p)
        truth_all = truth
    terpilih, terbaik = pilih_model(hasil_all)
    pakai = terpilih or terbaik
    pred_seri = {}
    if pakai:
        for seri, ctx in ctx_seri.items():
            bagus = [e for e in hasil_all if e["seri"] == seri and e.get("boleh_dipilih") and e["model"] == pakai["model"] and e["acuan_latih"] == pakai["acuan_latih"]]
            if bagus:
                pred_seri[seri] = prediksi_unit(bagus[0], baris_seri[seri], ref, ctx, preds_all, truth_all)
        # 2026 dan tahun tak berlabel: baris dari cache lain
        for seri, ctx in ctx_seri.items():
            extra = rakit_baris(seri, cache, statis, kov, 2026, 2026)
            if extra and pred_seri.get(seri) is not None:
                e = [e for e in hasil_all if e["seri"] == seri and e["model"] == pakai["model"] and e["acuan_latih"] == pakai["acuan_latih"]][0]
                pred_seri[seri].update(prediksi_unit(e, baris_seri[seri] + extra, ref, ctx, preds_all, truth_all))
    tabel = bangun_tabel(cache, pred_seri, ref, kov, None, kov["oni_jas"], pakai["seri"] if pakai else "N", pakai["model"] if pakai else None) if cache else None
    # 2026 Jan-Sep (periode yang sama dengan Nusantara Atlas): model akhir diterapkan pada fitur s.d. 30 Sep
    if pakai and tabel:
        sj = pakai["seri"]
        e_js = cache.get("%s|2026|0930" % sj)
        if e_js and sj in ctx_seri:
            rows_js = rakit_baris(sj, {"%s|2026" % sj: e_js}, statis, kov, 2026, 2026)
            ent = [e for e in hasil_all if e["seri"] == sj and e["model"] == pakai["model"] and e["acuan_latih"] == pakai["acuan_latih"]][0]
            pj = prediksi_unit(ent, baris_seri[sj] + rows_js, ref, ctx_seri[sj], preds_all, truth_all)
            tot = {k: sum(v[k] for (g, y), v in pj.items() if y == 2026) for k in ("p10", "p50", "p90")}
            r26 = [r for r in tabel["nasional"] if r["tahun"] == 2026][0]
            r26["luas_model_jan_sep"] = {k: round(v) for k, v in tot.items()} | {"catatan": "model tahun penuh diterapkan pada fitur s.d. 30 Sep; bias rendah terhadap tahun penuh"}
            r26["rasio"]["model_jan_sep_nusantara"] = bulat(tot["p50"] / NUSANTARA_2026, 3) if tot["p50"] else None
    # sel 0,25 derajat vs Gaveau 2019
    sel_hasil = None
    if ref.get("gaveau_sel"):
        sel_hasil = []
        for seri, ctx in ctx_seri.items():
            e19 = cache.get("%s|2019" % seri)
            if e19 and e19.get("sel"):
                kg = {b["g"]: {k: v for k, v in b["f"].items() if k in ("oni_jas", "oni_aso", "dmi_jas", "hujan_mm", "hujan_z", "kanal_dens", "hilang012") or k.startswith("wc_")}
                      for b in baris_seri.get(seri, []) if b["y"] == 2019}
                sel_hasil.append(evaluasi_sel(seri, e19["sel"], ref["gaveau_sel"], kg, ctx, tenggat=lambda: ang.lewat(0.97)))
    J = {"versi": 1, "status": "selesai" if not belum else "sebagian", "dibuat": mulai, "selesai": dt.datetime.now(UTC).isoformat(timespec="seconds"),
         "kriteria": dict(KRITERIA, dikunci_pada=mulai, sha=sha_kriteria()), "jujur": JUJUR, "fitur": FITUR_DAFTAR, "model_ket": KET_MODEL,
         "model": hasil_all, "terpilih": _ringkas_pilih(terpilih), "terbaik_tak_lolos": _ringkas_pilih(terbaik) if not terpilih else None,
         "tabel": tabel, "sel_gaveau_2019": sel_hasil, "acuan_ringkas": {"gaveau_2019_total_ha": gav["total"] if gav else None, "nusantara_2026_jan_sep_ha": NUSANTARA_2026,
                                          "koreksi_omisi": bangun_koreksi(ref["gwis"], ref.get("gaveau")) if ref.get("gaveau") else "prior literatur 52-62%"},
         "data": {"unduhan": status, "catatan": catatan, "peta": None}, "belum_dikerjakan": belum,
         "waktu": {"detik": round(ang.terpakai()), "batas_detik": round(ang.total)}}
    return J


def _ringkas_pilih(e):
    return None if not e else {k: e[k] for k in ("seri", "model", "acuan_latih", "ket", "loyo", "lolos") if k in e}


# ================================================================ uji sintetis
def _anggota(a, b, tol=1e-6, pesan=""):
    assert abs(a - b) <= tol, "%s: %r != %r" % (pesan, a, b)


class PetaPalsu:
    """Peta sintetis: lintang >= 0 -> grup '62' (gambut bila lon < 100), lintang < 0 -> '16' (hutan)."""
    def __init__(self):
        self.stat = {}

    def atribut(self, lat, lon):
        if abs(lon) > 150:
            return None
        return ("62", lon < 100, False, False) if lat >= 0 else ("16", False, False, True)

    def prov(self, lat, lon):
        a = self.atribut(lat, lon)
        return a[0] if a else None


def _titik(lat, lon, jam, hari=1, c=1, dn="D", frp=10.0, px=0.375, s="N", bulan=8):
    return {"lat": lat, "lon": lon, "t": dt.datetime(2019, bulan, hari, jam, 0, tzinfo=UTC), "c": c, "px": px, "dn": dn, "frp": frp, "s": s}


def uji():
    t0 = time.time()
    # --- redaksi kunci
    s = redaksi("https://firms.modaps.eosdis.nasa.gov/api/area/csv/ABCD1234KEY/VIIRS_SNPP_SP/94,-11.5,141.5,6.5/5/2019-08-01 MAP_KEY=XYZ")
    assert "ABCD1234KEY" not in s and "XYZ" not in s and "/csv/***/" in s, s
    os.environ["FIRMS_MAP_KEY"] = "RAHASIA999"
    assert "RAHASIA999" not in redaksi("gagal https://x/y?k=RAHASIA999"), "kunci env bocor"
    del os.environ["FIRMS_MAP_KEY"]
    try:
        ambil_ke("https://127.0.0.1:9/csv/KUNCIRAHASIA/x", os.path.join(RAW, "uji_tidak_ada.csv"), batas_dtk=2)
        assert False
    except RuntimeError as e:
        assert "KUNCIRAHASIA" not in str(e), "kunci bocor dari galat unduh"

    # --- baca CSV FIRMS (VIIRS dan MODIS); angka tangan
    v = ("latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight,type\n"
         "1.0,110.0,330,0.4,0.5,2019-08-01,0030,N,VIIRS,h,2.0NRT,290,12.5,N,0\n"      # tinggi, malam, px 0.5
         "1.0,110.001,330,0.4,0.4,2019-08-01,1330,N,VIIRS,n,2.0NRT,290,5.0,D,\n"      # nominal, type kosong
         "1.0,110.002,330,0.4,0.4,2019-08-01,1330,N,VIIRS,l,2.0NRT,290,5.0,D,0\n"     # rendah
         "1.1,110.0,330,0.4,0.4,2019-08-01,1330,N,VIIRS,n,2.0NRT,290,5.0,D,2\n"       # tipe 2 dibuang
         "20.0,110.0,330,0.4,0.4,2019-08-01,1330,N,VIIRS,n,2.0NRT,290,5.0,D,0\n")     # di luar kotak
    pv = list(titik_dari_baris(csv.DictReader(io.StringIO(v)), "N"))
    assert len(pv) == 3 and [p["c"] for p in pv] == [2, 1, 0], [p["c"] for p in pv]
    assert pv[0]["t"] == dt.datetime(2019, 8, 1, 0, 30, tzinfo=UTC) and pv[0]["px"] == 0.5 and pv[0]["dn"] == "N"
    m = ("latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight,type\n"
         "1.0,110.0,320,1.2,1.1,2003-09-01,0415,T,MODIS,29,6.1,300,20,D,0\n1.0,110.0,320,1.0,1.0,2003-09-01,0415,A,MODIS,30,6.1,300,20,D,0\n"
         "1.0,110.0,320,1.0,1.0,2003-09-01,0415,A,MODIS,80,6.1,300,20,D,0\n")
    pm = list(titik_dari_baris(csv.DictReader(io.StringIO(m)), "M"))
    assert [p["c"] for p in pm] == [0, 1, 2] and pm[0]["px"] == 1.2, [p["c"] for p in pm]
    # zip dengan dua csv + filter tanggal
    zb = io.BytesIO()
    with zipfile.ZipFile(zb, "w") as z:
        z.writestr("a.csv", v)
        z.writestr("b.csv", v.replace("2019-08-01", "2019-09-01"))
    os.makedirs(os.path.join(RAW, "uji"), exist_ok=True)
    zp = os.path.join(RAW, "uji", "t.zip")
    open(zp, "wb").write(zb.getvalue())
    assert len(baca_firms(zp, "N")) == 6 and len(baca_firms(zp, "N", "2019-09-01", "2019-09-30")) == 3
    os.remove(zp)

    # --- agregasi + DBSCAN produksi, angka tangan
    # Grup '62' (lat>=0): A,B berjarak 0,0045 deg (~0,5 km) hari 1; C 0,3 deg jauh; D di lokasi A hari 6 (di luar 48 jam) -> 3 cluster
    # Grup '16' (lat<0): E,F bertumpuk di piksel sama (satu piksel unik), keyakinan tinggi
    pts = [_titik(1.0, 110.0, 3, c=2, dn="N", frp=10), _titik(1.0045, 110.0, 4, c=1, frp=20), _titik(1.3, 110.0, 5, c=1, frp=30),
           _titik(1.0, 110.0, 3, hari=6, c=1, frp=40),
           _titik(-2.0, 104.0, 5, c=2, frp=5), _titik(-2.0, 104.0, 6, c=2, frp=5, dn="N"), _titik(-2.0, 200.0, 6)]
    ag = agregat(pts, PetaPalsu(), "N", 2019, klaster=True)
    f62, f16 = ag["prov"]["62"], ag["prov"]["16"]
    assert ag["n_total"] == 6 and "62" in ag["prov"] and len(ag["prov"]) == 2, ag["n_total"]
    assert (f62["n"], f62["n1"], f62["n2"], f62["n_nh"]) == (4, 3, 1, 4)
    assert f62["px"] == 4 - 1, f62["px"]   # A dan D satu piksel; B ~0,5 km jauh (piksel 375 m berbeda) -> A/D, B, C = 3
    assert f62["ncl"] == 3 and f62["cl_med"] == 1.0, (f62["ncl"], f62["cl_med"])
    assert f62["gb"] == 0.0 and f62["ht"] == 0.0 and f16["ht"] == 1.0   # lon 110 >= 100: bukan gambut; grup 16 seluruhnya kawasan hutan
    assert (f16["n"], f16["px"], f16["ncl"], f16["nfs"]) == (2, 1, 1, 1), f16     # satu cluster, ada keyakinan tinggi -> firespot 'ya'
    _anggota(f62["frp"], 100.0, 1e-9)
    _anggota(f62["malam"], 0.25, 1e-9)
    _anggota(f16["frp_px"], 10.0, 1e-9)
    assert f62["nfs"] == 1, f62["nfs"]     # hanya cluster A (ada c=2); lainnya 1 piksel nominal -> 'mungkin'
    assert f62["k0l"] == 2 and f62["k1l"] == 1, f62   # cluster {A,B}: 2 piksel (kelas 2-3); C dan D 1 piksel (kelas 1); semua tutupan 'lain'
    assert f16["k0h"] == 1 and f16["dur_med"] == 1.0
    # sel 0,25: A,B,D (lat 1.0/1.0045) di sel (4, 440); C (1.3) di sel (5, 440)
    ag2 = agregat(pts, PetaPalsu(), "N", 2019, klaster=True, sel=True)
    assert ag2["sel"]["4|440"]["n"] == 3 and ag2["sel"]["5|440"]["n"] == 1, {k: v["n"] for k, v in ag2["sel"].items()}
    ag3 = agregat(pts, PetaPalsu(), "N20", 2019, klaster=False)
    assert ag3["prov"]["62"] == {"n": 4, "n0": 0, "n1": 3, "n2": 1, "n_nh": 4}, ag3

    # --- klaster_cepat == harian.dbscan (partisi identik) pada data acak berpusat-api, campur px dan jarak waktu
    rr = random.Random(5)
    ps = []
    for _ in range(900):
        cx = rr.choice([(1.0, 110.0), (1.02, 110.01), (3.0, 105.0)])
        ps.append({"lat": cx[0] + rr.gauss(0, 0.03), "lon": cx[1] + rr.gauss(0, 0.03), "px": rr.choice([0.375, 0.375, 0.6, 1.0]),
                   "t": dt.datetime(2019, 9, 1, tzinfo=UTC) + dt.timedelta(hours=rr.uniform(0, 24 * 12))})
    ps.sort(key=lambda p: p["t"])
    l1, l2 = H.dbscan(ps, jam=48)[0], klaster_cepat(ps)

    def partisi(l):
        d = {}
        for i, x in enumerate(l):
            d.setdefault(x, []).append(i)
        return sorted(tuple(v) for v in d.values())
    assert partisi(l1) == partisi(l2) and len(set(l1)) > 5, (len(set(l1)), len(set(l2)))

    # --- kuantil / metrik / konformal, hitung tangan
    _anggota(kuantil([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 0.1), 2.0, 1e-12)
    _anggota(kuantil([0, 10], 0.25), 2.5, 1e-12)
    _anggota(median([3, 1, 2, 4]), 2.5, 1e-12)
    # 4 unit, 2 tahun; truth 1000,2000,4000,8000; pred = truth x {1, 2, 0.5, 1}
    truth = {("a", 1): 1000.0, ("b", 1): 2000.0, ("a", 2): 4000.0, ("b", 2): 8000.0}
    pred = {("a", 1): math.log(1000), ("b", 1): math.log(4000), ("a", 2): math.log(2000), ("b", 2): math.log(8000)}
    mt = metrik(pred, truth)
    assert mt["n"] == 4
    _anggota(mt["mape"], (0 + 1.0 + 0.5 + 0) / 4, 1e-9, "mape")
    _anggota(mt["mdape"], 0.25, 1e-9)
    # log-resid e = ln(T/P): 0, -ln2, +ln2, 0 -> bias_log = -mean(e) = 0; rasio median pred/truth = exp(-median(e)) = 1
    _anggota(mt["bias_log"], 0.0, 1e-9)
    _anggota(mt["rasio_median"], 1.0, 1e-9)
    assert mt["cakupan_p10_p90"] is None      # pool residu tahun lain hanya 2 (< 3): cakupan tidak dinilai
    # cakupan, hitung tangan: 5 tahun, satu unit per tahun, e = 0; 0,1; 0,2; 0,3; 0,4 (truth = 1000 exp(e), pred = ln 1000)
    tr5 = {("u", i + 1): 1000.0 * math.exp(0.1 * i) for i in range(5)}
    pr5 = {k: math.log(1000.0) for k in tr5}
    m5 = metrik(pr5, tr5)
    # tahun 1 (e=0): pool [.1,.2,.3,.4] q10=.13 -> luar; tahun 2 (.1): pool [0,.2,.3,.4] q10=.06 q90=.37 -> dalam; tahun 3 (.2): dalam;
    # tahun 4 (.3): pool [0,.1,.2,.4] q90=.34 -> dalam; tahun 5 (.4): pool [0,.1,.2,.3] q90=.27 -> luar  => 3/5
    _anggota(m5["cakupan_p10_p90"], 0.6, 1e-9, "cakupan")
    s = selang_unit(math.log(1000), 1, {("a", 2): math.log(2), ("b", 2): 0.0, ("c", 3): -math.log(2)})
    # pool tahun != 1: {ln2, 0, -ln2}; q10 = -0,8 ln2 ; q90 = +0,8 ln2
    _anggota(s[0], 1000 * 2 ** -0.8, 1e-6)
    _anggota(s[2], 1000 * 2 ** 0.8, 1e-6)
    _anggota(s[1], 1000.0, 1e-9)

    # --- ridge (rekonstruksi eksak) dan NNLS (hitung tangan)
    X = [[0.0], [1.0], [2.0], [3.0]]
    y = [1.0, 3.0, 5.0, 7.0]
    mr = ridge_latih(X, y, 1e-9)
    _anggota(ridge_ramal(mr, [10.0]), 21.0, 1e-4, "ridge ekstrapolasi y=1+2x")
    mr2 = ridge_latih(X, y, 1e6)     # hukuman sangat besar -> rata-rata
    _anggota(ridge_ramal(mr2, [10.0]), 4.0, 1e-2, "ridge lam besar -> mean")
    Xn = [[1.0, 0.0], [0.0, 1.0], [1.0, 1.0]]
    b = nnls_prior(Xn, [3.0, 5.0, 8.0], [1.0, 1.0], 1e-9)
    _anggota(b[0], 3.0, 1e-4)
    _anggota(b[1], 5.0, 1e-4)
    b2 = nnls_prior([[1.0], [1.0]], [10.0, 10.0], [4.0], 1e9)   # prior sangat kuat -> tetap 4
    _anggota(b2[0], 4.0, 1e-3)
    b3 = nnls_prior([[1.0], [1.0]], [-5.0, -5.0], [0.0], 0.0)  # tak negatif
    assert b3[0] >= 0.0
    # GBDT: fungsi tangga
    rng = random.Random(1)
    Xg = [[rng.random(), rng.random()] for _ in range(80)]
    yg = [0.0 if x[0] < 0.5 else 10.0 for x in Xg]
    mg = gbdt_latih(Xg, yg, pohon=60, dalam=2, lr=0.3, sub=1.0)
    assert abs(gbdt_ramal(mg, [0.1, 0.5]) - 0.0) < 0.5 and abs(gbdt_ramal(mg, [0.9, 0.5]) - 10.0) < 0.5

    # --- koreksi omisi: tanpa kebocoran
    gwis = {"A": {2019: 10000.0, 2018: 5000.0}, "B": {2019: 40000.0, 2018: 1000.0}, "C": {2019: 0.0}}
    gav_ = {"A": 30000.0, "B": 80000.0}
    k1 = bangun_koreksi(gwis, gav_)
    _anggota(k1["nas"], (30000 + 80000) / (10000 + 40000), 1e-9, "rasio nasional")
    # A: mentah 3, wt = 1e4/(1e4+2e4)=1/3 -> exp(1/3 ln3 + 2/3 ln2.2)
    _anggota(k1["r"]["A"], math.exp(math.log(3) / 3 + 2 / 3 * math.log(2.2)), 1e-9, "shrink A")
    k2 = bangun_koreksi(gwis, gav_, tanpa_gaveau=True)
    _anggota(k2["nas"], 1 / (1 - 0.57), 1e-9)
    assert k2["lit"] and not k2["r"]
    k3 = bangun_koreksi(gwis, gav_, kecuali_grup="B")      # B tak ikut: nasional = rasio A
    _anggota(k3["nas"], 3.0, 1e-9)
    assert "B" not in k3["r"]
    # target 2019 pakai Gaveau; tahun lain GWIS x r
    t19 = target_gabungan("A", 2019, gwis, gav_, k1)
    assert t19 == (30000.0, 30000.0, 30000.0)
    t18 = target_gabungan("A", 2018, gwis, gav_, k1)
    _anggota(t18[1], 5000 * k1["r"]["A"], 1e-6)
    assert t18[0] < t18[1] < t18[2]
    # lipatan LOYO 2019: target latih tidak boleh tergantung pada Gaveau; ubah Gaveau -> target latih identik
    baris = [{"g": g, "y": y, "f": {"n1": 10, "n2": 5, "n_nh": 15}} for g in ("A", "B") for y in (2018, 2019)]
    refa = {"sipongi": {}, "gwis": gwis, "gaveau": gav_}
    refb = {"sipongi": {}, "gwis": gwis, "gaveau": {"A": 99999.0, "B": 3333.0}}
    la = [l for l in lipat_loyo(baris, refa, "gabungan", None) if l["tahun_uji"] == 2019][0]
    lb = [l for l in lipat_loyo(baris, refb, "gabungan", None) if l["tahun_uji"] == 2019][0]
    assert [(t.g, t.y, round(t.ha, 6)) for t in la["latih"]] == [(t.g, t.y, round(t.ha, 6)) for t in lb["latih"]] and la["latih"], "bocor Gaveau di lipatan 2019"
    _anggota(la["latih"][0].ha, 5000 * (1 / (1 - 0.57)), 1e-6, "latih 2018 pakai prior literatur")
    # lipatan 2018: Gaveau boleh dipakai (info 2019 bukan milik tahun uji), dan 2019 ikut latih sebagai Gaveau
    l18 = [l for l in lipat_loyo(baris, refa, "gabungan", None) if l["tahun_uji"] == 2018][0]
    assert any(t.y == 2019 and t.ha == 30000.0 for t in l18["latih"])
    # LOPO: provinsi uji tidak ikut menentukan r nasional
    lp = [l for l in lipat_lopo(baris, refa, "gabungan") if l["grup_uji"] == "B"][0]
    tA = [t for t in lp["latih"] if t.g == "A" and t.y == 2018][0]
    _anggota(tA.ha, 5000 * bangun_koreksi(gwis, gav_, kecuali_grup="B")["r"]["A"], 1e-6)
    _anggota(tA.ha, 15000.0, 1e-6)       # tanpa B: rasio nasional = rasio A = 3
    assert all(t.g != "B" for t in lp["latih"])

    # --- M0, M1 (insiden.faktor_luas), M4, M2 lewat spec_model
    f0 = spec_model("M0", {"seri": "N"})([])
    _anggota(math.exp(f0({"n1": 10, "n2": 10})), 20 * 4.3, 1e-6)
    f0m = spec_model("M0", {"seri": "M", "faktor_setara": 4.0})([])
    _anggota(math.exp(f0m({"n1": 10, "n2": 0})), 10 * 4.3 * 4.0, 1e-6)
    # M1: 6 tahun, rasio ha/(n*14,0625) = 0,3 konstan -> faktor = 0,3 x 14,0625 = 4,21875 ha/titik; uji di provinsi sendiri dan provinsi tak dikenal (nasional)
    tr = [Latihan({"n1": 100 * (i + 1), "n2": 0, "_g": "62"}, 100 * (i + 1) * 4.21875, 2018 + i, "62") for i in range(6)]
    r1 = spec_model("M1", {})(tr)
    _anggota(math.exp(r1({"n1": 50, "n2": 50, "_g": "62"})), 100 * 4.21875, 1e-3, "M1 provinsi")
    _anggota(math.exp(r1({"n1": 10, "n2": 0, "_g": "XX"})), 10 * 4.21875, 1e-3, "M1 nasional")
    assert INS.TAHUN_MIN == 2020, "TAHUN_MIN produksi harus dipulihkan"
    # M4: dua kelas, luas = 10 ha x k0l + 100 ha x k5h (tepat)
    tr4 = []
    rng = random.Random(3)
    for i in range(12):
        a, b_ = rng.randint(1, 30), rng.randint(0, 5)
        f = {k: 0 for k in KLS_KEYS}
        f["k0l"], f["k5h"] = a, b_
        tr4.append(Latihan(f, 10.0 * a + 100.0 * b_ if (a or b_) else 1.0, 2000 + i % 4, "62"))
    r4 = spec_model("M4", {})(tr4)
    f = {k: 0 for k in KLS_KEYS}
    f["k0l"], f["k5h"] = 7, 2
    assert abs(math.exp(r4(f)) - 270.0) / 270.0 < 0.08, math.exp(r4(f))
    # M2: log-linier eksak ln ha = 2 + 1,0 ln1p(px_tol) -> prediksi di luar sampel
    tr2 = [Latihan({"px_tol": p, "cl_med": 3.0, "gb": 0.2, "ht": 0.1, "oni_jas": 0.5, "hujan_z": 0.0}, math.exp(2 + math.log1p(p)) * 1.0, 2000 + i % 5, "62")
           for i, p in enumerate([5, 10, 20, 40, 80, 160, 320, 640, 5, 10, 20, 40])]
    r2 = spec_model("M2", {})(tr2)
    assert abs(r2({"px_tol": 100, "cl_med": 3.0, "gb": 0.2, "ht": 0.1, "oni_jas": 0.5, "hujan_z": 0.0}) - (2 + math.log1p(100))) < 0.15

    # --- Gaveau agregasi (petak -> provinsi/sel)
    gv = agregasi_gaveau([(1.0, 110.0, 100.0), (1.1, 110.1, 50.0), (-2.0, 104.0, 25.0), (1.0, 200.0, 7.0)], PetaPalsu())
    assert gv["n"] == 4 and gv["total"] == 182.0 and gv["prov"] == {"62": 150.0, "16": 25.0}, gv
    assert gv["sel"]["4|440"] == 150.0

    # --- evaluasi sel 0,25: hukum ha = 20 x px_tol dikenali M2 lintas blok; sel Gaveau tanpa titik tercatat
    rs_ = random.Random(21)
    selx, gsel = {}, {}
    for i in range(60):
        la, lo = rs_.uniform(-8, 4), rs_.uniform(100, 118)
        k = kunci_sel(sel_025(la, lo))
        px_ = rs_.uniform(5, 400)
        selx[k] = {"n": 3 * px_, "n0": 0, "n1": px_, "n2": px_, "n_nh": 2 * px_, "px": px_, "px_tol": 0.8 * px_, "ncl": px_ / 5, "nfs": 1, "cl_med": 2.0, "cl_p90": 9.0,
                   "cl_p100": 0.0, "pxcl100": 0.0, "frp": 5 * px_, "frp_px": 5.0, "malam": 0.2, "dur_med": 1.0, "dur_p90": 3.0, "hari": 20, "gb": 0.3, "ks": 0.0,
                   "ht": 0.2, "g": "62" if la > 0 else "16", "lat": (math.floor(la / .25) + .5) * .25, "lon": (math.floor(lo / .25) + .5) * .25}
        for kk in KLS_KEYS:
            selx[k][kk] = 0
        selx[k]["k0l"] = int(px_ / 5)
        gsel[k] = 20.0 * 0.8 * px_ * math.exp(rs_.gauss(0, 0.05))
    gsel["999|999"] = 5000.0                       # sel terbakar tanpa titik panas
    es = evaluasi_sel("N", selx, gsel, {}, {"seri": "N"})
    assert es["n_sel"] == len(selx) and es["ha_gaveau_tanpa_titik"] == 5000.0 and len(es["model"]) == 5
    ms_ = {m["model"]: m for m in es["model"]}
    assert ms_["M2"]["metrik"]["mape"] < ms_["M0"]["metrik"]["mape"] and ms_["M2"]["metrik"]["korelasi_log"] > 0.9, ms_["M2"]

    # --- tally: bendera, hand-calc
    oni = {2014: 0.0, 2015: 2.0, 2016: 0.0, 2017: 0.0, 2018: 0.0, 2019: 0.4, 2020: 0.0}
    per = {}
    for y, p50 in zip(range(2014, 2021), (100, 400, 100, 100, 100, 150, 100)):
        per[y] = {"luas": {"p10": p50 * .5, "p50": p50, "p90": p50 * 2}, "hotspot_seri": 10, "nfs": 5}
    bd = bendera_tabel(per, lambda y: [90, 120] if y != 2015 else [300, 350], oni)
    assert bd[2014]["tally"]["dalam_pita"] is True      # 100 dalam [90,120]
    assert bd[2015]["tally"]["dalam_pita"] is False and bd[2015]["tally"]["selang_tumpang"] is True   # 400 > 350; P10 200 <= 350, P90 800 >= 300
    assert bd[2015]["tally"]["lonjakan"]["faktor"] == 4.0 and bd[2015]["tally"]["lonjakan"]["dijelaskan_enso"] is True   # ONI 0 -> 2
    assert bd[2016]["tally"]["lonjakan"]["faktor"] == 0.25 and bd[2016]["tally"]["lonjakan"]["dijelaskan_enso"] is True   # turun setelah ONI 2 -> 0
    assert bd[2019]["tally"]["lonjakan"] is None        # 100 -> 150 (1,5x) bukan lonjakan
    assert bd[2020]["tally"]["lonjakan"] is None
    # rasio luas/hotspot: 10 di 5 tahun lain... 2015 = 40 vs lain {10,10,10,10,15,10}: P95 > 40? tidak -> False
    assert bd[2015]["tally"]["rasio_hotspot_hist"] is False and bd[2014]["tally"]["rasio_hotspot_hist"] is True
    assert bd[2018]["sebab_dugaan"] and any("NOAA-20" in s for s in bd[2018]["sebab_dugaan"])
    assert any("El Nino" in s for s in bd[2015]["sebab_dugaan"]) and bd[2015]["cocok"] is False and "dalam_pita" in bd[2015]["gagal"]
    per2 = {2014: dict(per[2014]), 2015: dict(per[2015])}
    per2[2015]["luas"] = {"p10": 100, "p50": 400, "p90": 800}
    b2_ = bendera_tabel(per2, lambda y: [], {2014: 0.0, 2015: 0.1})
    assert b2_[2015]["tally"]["lonjakan"]["dijelaskan_enso"] is False and any("tak dijelaskan ENSO" in s for s in b2_[2015]["sebab_dugaan"])
    assert "lonjakan" in b2_[2015]["gagal"]
    b3_ = bendera_tabel(per2, lambda y: [], {2014: 0.0, 2015: 0.1}, dmi={2014: 0.0, 2015: 0.9})   # seperti 2019: ONI lemah, IOD positif kuat
    assert b3_[2015]["tally"]["lonjakan"]["dijelaskan_iod"] is True and b3_[2015]["tally"]["lonjakan"]["dijelaskan_enso"] is False
    assert "lonjakan" not in b3_[2015]["gagal"] and any("IOD positif" in s for s in b3_[2015]["sebab_dugaan"])

    # --- pilih_model & lolos
    mm = {"mape": 0.25, "cakupan_p10_p90": 0.8, "n": 50}
    assert lolos(mm, {"rasio_median": 1.0, "korelasi_log": 0.8, "n": 20})["semua"]
    assert lolos(mm, {})["K2_dinilai"] is False and not lolos(mm, {})["K2"]
    assert not lolos(dict(mm, mape=0.31), {"rasio_median": 1.0, "korelasi_log": 0.8, "n": 20})["K1"]
    assert not lolos(mm, {"rasio_median": 1.5, "korelasi_log": 0.8})["K2"] and not lolos(mm, {"rasio_median": 1.0, "korelasi_log": 0.6})["K2"]
    assert not lolos(dict(mm, cakupan_p10_p90=0.65), {"rasio_median": 1.0, "korelasi_log": 0.8})["K3"]
    ents = [{"boleh_dipilih": True, "lolos": {"semua": False}, "loyo": {"vs_gabungan": {"mape": 0.4}}, "model": "x"},
            {"boleh_dipilih": True, "lolos": {"semua": True}, "loyo": {"vs_gabungan": {"mape": 0.28}}, "model": "y"},
            {"boleh_dipilih": True, "lolos": {"semua": True}, "loyo": {"vs_gabungan": {"mape": 0.20}}, "model": "z"},
            {"boleh_dipilih": False, "lolos": {"semua": True}, "loyo": {"vs_gabungan": {"mape": 0.01}}, "model": "g"}]
    tp, tb = pilih_model(ents)
    assert tp["model"] == "z" and tb["model"] == "z"
    tp, tb = pilih_model(ents[:1])
    assert tp is None and tb["model"] == "x"

    # --- pipeline sintetis ujung ke ujung: dunia dengan hukum ha = 3,0 x px_tol^1,0 x eksp(0,3 oni) + bising kecil
    rng = random.Random(11)
    grups = ["62", "16", "61", "15", "14", "64", "13", "12"]
    cache_s, gw_s, sip_s = {}, {g: {} for g in grups}, {g: {} for g in grups}
    for y in range(2012, 2026):
        e = {"prov": {}, "n_total": 0}
        for g in grups:
            px = int(math.exp(rng.uniform(4, 9)))
            f = {"n": px * 2, "n0": 0, "n1": px, "n2": px, "n_nh": px * 2, "px": px, "px_tol": int(px * 0.8), "ncl": px // 5, "nfs": px // 10, "cl_med": 3.0, "cl_p90": 20.0,
                 "cl_p100": 0.02, "pxcl100": 0.3, "frp": px * 10.0, "frp_px": 10.0, "malam": 0.2, "dur_med": 2.0, "dur_p90": 6.0, "hari": 60, "gb": rng.random(), "ks": 0.1, "ht": 0.3}
            for k in KLS_KEYS:
                f[k] = 0
            f["k0l"], f["k2h"] = px // 5, px // 20
            e["prov"][g] = f
            ha = 3.0 * f["px_tol"] * math.exp(rng.gauss(0, 0.1))
            gw_s[g][y] = ha / 2.3 * math.exp(rng.gauss(0, 0.05))
            sip_s[g][y] = ha * 0.7 if y >= 2018 else None
        cache_s["N|%d" % y] = e
    sip_s = {g: {y: v for y, v in d.items() if v} for g, d in sip_s.items()}
    gav_s = {g: gw_s[g][2019] * 2.3 for g in grups}
    ref_s = {"sipongi": sip_s, "gwis": gw_s, "gaveau": gav_s, "gfed5": None}
    kov_s = {"oni_jas": {y: 0.0 for y in range(2001, 2027)}, "oni_aso": {}, "dmi": {}, "hujan": {}, "luas_km2": {}}
    baris_s = rakit_baris("N", cache_s, {}, kov_s, 2012, 2025)
    assert len(baris_s) == 14 * 8
    hs, ps, tg = evaluasi_seri("N", baris_s, ref_s, {"seri": "N", "faktor_setara": 1.0})
    assert len(hs) == 5 * 4 and all("loyo" in e or e["acuan_latih"] == "gaveau" for e in hs)
    by = {(e["model"], e["acuan_latih"]): e for e in hs}
    m0 = by[("M0", "gabungan")]["loyo"]["vs_gabungan"]
    m2 = by[("M2", "gabungan")]["loyo"]["vs_gabungan"]
    assert m2["mape"] < m0["mape"], (m2, m0)      # hukum log-linier dikenali M2; M0 (4,3 ha x titik) jauh meleset
    assert m2["mape"] < 0.2 and m2["korelasi_log"] > 0.95, m2
    g19 = by[("M2", "gabungan")]["loyo"]["gaveau_2019"]
    assert 0.7 <= g19["rasio_median"] <= 1.4, g19
    assert by[("M0", "gabungan")]["boleh_dipilih"] and not by[("M2", "gaveau")]["boleh_dipilih"]
    terp, terb = pilih_model(hs)
    assert terb is not None
    pu = prediksi_unit(by[("M2", "gabungan")], baris_s, ref_s, {"seri": "N", "faktor_setara": 1.0}, ps, tg)
    assert pu and all(v["p10"] <= v["p50"] <= v["p90"] for v in pu.values())
    tabel = bangun_tabel(cache_s, {"N": pu}, ref_s, kov_s, None, kov_s["oni_jas"], "N", "M2")
    r19 = [r for r in tabel["nasional"] if r["tahun"] == 2019][0]
    assert r19["acuan"]["gaveau"] == round(sum(gav_s.values())) and r19["luas_model"] and r19["hotspot"]["N"] > 0 and r19["firespot_R0"] > 0
    assert [r["tahun"] for r in tabel["nasional"]] == TAHUN_TABEL and r19["acuan"]["sipongi"] is not None
    assert tabel["nasional"][0]["luas_model"] is None            # 2001: tak ada fitur
    md = tulis_md({"status": "uji", "dibuat": "x", "model": hs, "terpilih": None, "terbaik_tak_lolos": terb, "tabel": tabel, "jujur": JUJUR, "belum_dikerjakan": ["x"]})
    assert "| 2019 |" in md and "Belum dikerjakan" in md
    assert sha_kriteria() == sha_kriteria() and len(sha_kriteria()) == 12
    # kriteria tidak berubah dan memuat tanda dipra-tulis
    assert KRITERIA["K1_mape"]["ambang"] == 0.30 and KRITERIA["K3_cakupan"]["rentang"] == [0.70, 0.90] and KRITERIA["K2_gaveau_2019"]["rasio_median"] == [0.7, 1.4]
    # tugas titik: 2019 pertama, semua sensor sah
    tt = tugas_titik()
    assert tt[0][:2] == ("N", 2019) and ("N20", 2019, False, None) in tt and not any(t[0] == "N21" and t[1] < 2023 for t in tt)
    print("lab_luas uji ok (%.1f dtk)" % (time.time() - t0))


# ================================================================ main
if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "uji"
    if mode == "uji":
        uji()
    elif mode == "jalan":
        jalan()
    elif mode == "ringkas":
        J = json.load(open(os.path.join(OUT, "luas.json")))
        open(os.path.join(OUT, "luas_ringkas.md"), "w").write(tulis_md(J))
        print("ok")
    else:
        sys.exit(__doc__)
