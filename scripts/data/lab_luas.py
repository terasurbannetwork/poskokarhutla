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

Kriteria & ambang keputusan: scripts/data/lab_kriteria/lab_luas.json (dibaca, di-hash sha256 kanonik). Tiap `jalan` menambah satu baris awal dan satu baris
penutup (append-only) ke public/data/lab/jalan.jsonl; luas.json mencatat kriteria_sha. Klaim akurasi hanya terhadap acuan independen (Gaveau 2019, GFED5);
pemilihan model memakai tahun seleksi, tahun uji akhir (daftar di berkas kriteria) dibuka sekali setelah pemenang dibekukan.

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

KRITERIA_JALUR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lab_kriteria", "lab_luas.json")


def muat_kriteria(jalur=None):
    """Semua kriteria & ambang keputusan tinggal di berkas terpisah (lab_kriteria/lab_luas.json), bukan di kode ini."""
    with open(jalur or KRITERIA_JALUR, encoding="utf-8") as f:
        return json.load(f)


def kanon(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


KRITERIA = muat_kriteria()
MIN_TRAIN_HA = float(KRITERIA["min_latih_ha"])
MIN_TITIK_EVAL = int(KRITERIA["min_titik_eval"])
TAHUN_UJI_AKHIR = tuple(KRITERIA["pemilihan"]["tahun_uji_akhir"])
ACUAN_NILAI = tuple(KRITERIA["acuan"]["nilai"])
ACUAN_INDEP = tuple(KRITERIA["acuan"]["independen_dari_target_latih"])
ACUAN_LATIH = tuple(KRITERIA["acuan"]["latih_boleh_dipilih"])
JALAN_JSONL = os.path.join(OUT, "jalan.jsonl")

_TUA = ", ".join(str(y) for y in TAHUN_UJI_AKHIR)
_OM = "%d-%d%%" % (round(OMISI_LIT[0] * 100), round(OMISI_LIT[2] * 100))
_MB = KRITERIA["bootstrap"]["min_blok_tahun"]
_MA = KRITERIA["tally"]["min_acuan_independen"]
_R2 = str(KRITERIA["keputusan"]["K2"]["galat_log_median_maks_rasio"]).replace(".", ",")
_MTS = KRITERIA["pemilihan"]["min_tahun_seleksi"]
_MUT = KRITERIA["metrik"]["min_unit_per_tahun"]
JUJUR = [
    "Acuan saling berselisih: GWIS (MCD64A1, 500 m) kurang hitung luas Indonesia {OM} (kebakaran kecil, tertutup asap/awan, gambut); Gaveau dkk. 2021 (Sentinel-2 20 m) 2019 jauh di atas SiPongi dan GWIS.",
    "SiPongi (KLHK) TIDAK independen dari titik panas: indikasinya diturunkan dari titik panas + verifikasi; melatih model titik-panas terhadap SiPongi bersifat melingkar. M0/M1 pun dikalibrasi ke SiPongi.",
    "GWIS adalah batas bawah, bukan kebenaran. Target latih 'gabungan' = GWIS x prior literatur omisi {OM}; Gaveau 2019 TIDAK ikut membentuk target latih, supaya Gaveau tetap penilai independen. 'Gabungan' tidak pernah dipakai menilai akurasi.",
    "Klaim akurasi hanya terhadap acuan independen dari target latih: Gaveau 2019 (satu tahun El Nino ekstrem) dan GFED5 2001-2020 bila terbaca (butuh netCDF4). Bila GFED5 tak terbaca, blok tahun independen < {MB} dan K1 tak dapat dinilai: tidak ada model terpilih. Itu hasil jujur, bukan galat.",
    "Pembanding K1 dan skor seleksi = M0_terskala (M0 x median(target latih / M0) dari tahun latih lipatan, per acuan latih), supaya model tidak menang hanya karena M0 produksi (4,3 ha/titik) salah skala; selisih terhadap M0 mentah tetap dilaporkan (vs_m0_mentah).",
    "K1 lolos hanya bila selisih (M0_terskala - model) positif terhadap GFED5 (bootstrap blok tahun, >= {MB} blok) DAN terhadap Gaveau 2019 (satu tahun, tanpa CI). K1 (bagian Gaveau) dan K2 berbagi data Gaveau 2019. GFED5 semi-independen: BA turunan titik api aktif MODIS, jadi bukan bukti sepenuhnya independen dari fitur titik. Blok tahun < 4 = tak dapat dinilai, tanpa label CI.",
    "Tally hanya punya SATU bukti (dalam_pita); selang_tumpang dibuang karena hanya mengulang. Pita acuan = heuristik ditulis sebelum hasil. Tally memakai P50 (koreksi median residu) sedangkan K1/K2 memakai prediksi mentah; bedanya dilaporkan (luas_model_mentah, rasio_p50_vs_mentah). `model_lolos` di tiap baris dan luas.json menandai apakah model yang dipakai tabel lolos K1-K3.",
    "Pada seri N, GFED5 hanya punya TEPAT 4 blok tahun di tahun uji akhir (2015, 2018, 2019, 2020), padahal min_blok_tahun = {MB}: K1 butuh keempatnya (satu tahun tanpa GFED5 = K1 tak dapat dinilai).",
    "Semua tahun api besar ada di tahun uji akhir; model dilatih di tahun tenang. 'Tidak lolos' bisa berarti tak mampu ekstrapolasi ke tahun besar, bukan titik panas tak informatif.",
    "Validasi silang antar-tahun ini adalah hindcast (melatih dengan tahun yang lebih baru untuk menguji tahun yang lebih lama), bukan prakiraan ke depan.",
    "Kandidat dengan < {MTS} tahun seleksi (berskor atau bertarget latih) tidak dapat menang (dilaporkan 'tahun seleksi kurang'); tahun dengan < {MUT} unit tidak dihitung sebagai blok galat/bootstrap.",
    "Pemilihan dari puluhan kandidat (model x acuan latih x seri) memakai tahun seleksi saja; tahun uji akhir ({TUA}) tak dipakai melatih/memilih. Pemenang dibekukan lebih dulu; bila gagal, tidak turun ke peringkat 2.",
    "Acuan saling berselisih sampai sekitar 3x, maka K2 = median |ln(pred/Gaveau)| <= ln({R2}), bukan kecocokan ketat; pita tally melebar menurut ketidakpastian tiap acuan independen.",
    "Cakupan selang (K3) dihitung terhadap target latih: diagnosa kalibrasi internal, bukan bukti akurasi. Selang adalah selang terhadap target latih (untuk 'gabungan' dilebarkan ketidakpastian omisi), bukan luas sebenarnya.",
    "Tally: pita dari acuan independen saja; tahun dengan < {MA} acuan independen = tak dapat dinilai (bukan cocok). Rasio luas/hotspot dan luas/firespot = konsistensi internal (model dibuat dari titik itu), bukan bukti. ENSO/IOD = penjelasan, bukan uji. Uji kekuatan menyuntik galat x0,5 dan x2 untuk melihat apakah tally mendeteksinya.",
    "Pergantian sensor: MODIS Terra 2000/Aqua Juli 2002 (jadi 2001-2002 setengah), S-NPP VIIRS 375 m sejak 2012, NOAA-20 sejak 2018, NOAA-21 sejak 2023; hitungan titik antar sensor tidak setara. Model dilatih per seri (N = S-NPP, M = MODIS) agar definisi konstan.",
    "Selang P10-P90 berasal dari residu konformal berkelompok (blok = tahun, koreksi n+1, per kelas ukuran bila n cukup); residu satu tahun berkorelasi, jadi cakupan per tahun dilaporkan, termasuk tahun El Nino. Selang nasional = jumlah kuantil provinsi (asumsi komonoton, konservatif).",
    "Papua/Papua Barat dilatih sebagai gabungan (91+93+94+95, 92+96) karena GWIS tak memisahkan; Kaltara dihitung di Kaltim. Batas provinsi pada titik memakai sel 0,01 derajat (galat sekitar 1 km di perbatasan).",
    "Nusantara Atlas 1.916.588 ha (Jan-Sep 2026, nasional) adalah angka berita (AFP), bukan data yang kita ukur ulang.",
    "Perkiraan 2026 memakai model yang dilatih pada tahun penuh, padahal data 2026 baru s.d. Oktober (musim belum usai) dan versi Jan-Sep (periode Nusantara Atlas) lebih pendek lagi, jadi bias rendah.",
    "Agregasi Gaveau per cluster (kecocokan petak terbakar dengan cluster DBSCAN) TIDAK dikerjakan di sini; sudah dicakup scripts/data/ujibanding_firespot.py. Di sini hanya per provinsi dan per sel 0,25 derajat.",
    "Sel 0,25 derajat Gaveau tanpa titik panas tidak terjangkau model; luasnya dilaporkan terpisah (ha_gaveau_tanpa_titik).",
]
JUJUR = [x.format(OM=_OM, TUA=_TUA, MB=_MB, MA=_MA, R2=_R2, MTS=_MTS, MUT=_MUT) for x in JUJUR]

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
    elif acuan == "gfed5":
        for g, d in (ref.get("gfed5") or {}).items():
            for y, v in d.items():
                out[(g, y)] = v
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
        def fs_lipatan():
            """S4: faktor setara MODIS->S-NPP dihitung HANYA dari tahun latih lipatan (ctx['tahun_latih'] + ctx['rasio_nm']); tanpa itu, nilai tunggal ctx['faktor_setara']."""
            if ctx.get("seri") != "M":
                return 1.0
            rn, tl = ctx.get("rasio_nm"), ctx.get("tahun_latih")
            if rn is not None and tl is not None:
                v = [rn[y] for y in tl if y in rn]
                return median(v) if v else 1.0
            return ctx.get("faktor_setara", 1.0)
        fs = fs_lipatan()
        return lambda tr: (lambda f: math.log(max(1.0, FAKTOR_TITIK * fs * (f.get("n1", 0) + f.get("n2", 0)))))

    if nama == "M0_terskala":
        base = spec_model("M0", ctx)([])

        def fit(tr):
            """B-1: M0 x median(target latih / M0) dari tahun latih lipatan (konstanta skala per acuan latih)."""
            r = [t.ha / math.exp(base(t.f)) for t in tr]
            lc = math.log(median(r)) if r else 0.0
            return lambda f: base(f) + lc
        return fit

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
    "M0_terskala": "pembanding K1/seleksi: M0 x median(target latih / M0) dari tahun latih lipatan, per acuan latih (bukan kandidat)",
    "M0": "produksi: titik keyakinan sedang/tinggi x 4,3 ha (seri M: x faktor setara S-NPP)",
    "M1": "faktor ha/titik per provinsi (insiden.faktor_luas, median rasio acuan/titik antartahun latih)",
    "M2": "log-linier ridge: ln(piksel unik toleran) + ln(ukuran cluster median) + porsi gambut + porsi hutan + ONI JAS + anomali hujan; lambda lewat LOYO dalam",
    "M3": "GBDT regresi kecil (40 pohon, kedalaman 3) atas semua fitur",
    "M4": "ala Giglio 2006/Randerson 2012: luas = jumlah cluster per kelas ukuran x tutupan x faktor (NNLS galat relatif, ridge ke prior 4,3 ha x piksel tengah)",
}


# ================================================================ validasi
# Prinsip (temuan validasi-model): (1) klaim akurasi HANYA terhadap acuan independen dari target latih (Gaveau 2019, GFED5); "gabungan" hanya target latih;
# (2) tiap model dilaporkan terhadap semua acuan dengan M0 yang sama; (3) pemilihan dari banyak kandidat memakai tahun SELEKSI saja (LOYO), pemenang dibekukan,
# baru tahun uji akhir dibuka (winner's curse); (4) unit disaring dari jumlah titik (fitur), tidak dari nilai kebenaran.
def hujan_z_lipatan(baris, tahun_latih):
    """H2: anomali hujan z per grup dengan mu/sigma dari TAHUN LATIH lipatan saja; tahun uji dan 2026 memakai mu/sigma itu. -> {(g, y): z}"""
    nmin = KRITERIA["hujan_z"]["min_tahun_latih"]
    per = {}
    for b in baris:
        h = b["f"].get("hujan_mm")
        if h is not None:
            per.setdefault(b["g"], []).append((b["y"], h))
    out = {}
    for g, v in per.items():
        lat = [h for y, h in v if y in tahun_latih]
        if len(lat) < nmin:
            continue
        mu = sum(lat) / len(lat)
        sd = math.sqrt(sum((x - mu) ** 2 for x in lat) / len(lat)) or 1.0
        for y, h in v:
            out[(g, y)] = (h - mu) / sd
    return out


def target_latih(acuan, ref):
    """Target LATIH per acuan. 'gabungan' = GWIS x prior literatur omisi (Gaveau 2019 TIDAK ikut: ia penilai independen dan satu-satunya citra beresolusi tinggi).
    Hanya 'gaveau' (dilaporkan saja, tak boleh dipilih) memakai Gaveau. -> {(g,y): ha}"""
    rl = {**ref, "gaveau": ref.get("gaveau") if acuan == "gaveau" else None}
    kor = bangun_koreksi(rl["gwis"], None, tanpa_gaveau=True)
    return tabel_target(acuan, rl, kor)


def lipat_loyo(baris, tt):
    """Lipatan LOYO atas `baris` (pemanggil sudah membuang tahun uji akhir). Target latih tt tak bergantung pada tahun uji."""
    out = []
    for y in sorted({b["y"] for b in baris}):
        out.append(_lipat("y%d" % y, baris, tt, lambda b, y=y: b["y"] == y))
        out[-1]["tahun_uji"] = y
    return out


def lipat_lopo(baris, tt):
    """Leave-one-province-out. hujan_z grup uji memakai semua tahun (kovariat grup itu sendiri; tak ada kebocoran target)."""
    out = []
    tahun_semua = {b["y"] for b in baris}
    for g in sorted({b["g"] for b in baris}):
        out.append(_lipat("g%s" % g, baris, tt, lambda b, g=g: b["g"] == g, z_tahun=tahun_semua))
        out[-1]["grup_uji"] = g
    return out


def lipat_uji_akhir(baris, tt, tahun_uji):
    """Satu lipatan: semua tahun uji akhir ditahan; latih = sisanya."""
    tu = set(tahun_uji)
    l = _lipat("uji_akhir", baris, tt, lambda b: b["y"] in tu)
    l["tahun_uji"] = sorted(tu)
    return [l]


def _lipat(nama, baris, tt, uji_fn, z_tahun=None):
    tahun_latih = {b["y"] for b in baris if not uji_fn(b)}
    z = hujan_z_lipatan(baris, tahun_latih if z_tahun is None else z_tahun)
    tr, uji = [], []
    for b in baris:
        zb = z.get((b["g"], b["y"]))
        fb = b["f"] if zb is None else dict(b["f"], hujan_z=zb)
        if uji_fn(b):
            uji.append(b if zb is None else dict(b, f=fb))
        else:
            ha = tt.get((b["g"], b["y"]))
            if ha is not None and ha >= MIN_TRAIN_HA and b["f"].get("n_nh", 0) > 0:
                tr.append(Latihan(dict(fb, _g=b["g"]), ha, b["y"], b["g"]))
    return {"nama": nama, "latih": tr, "uji": uji, "tahun_latih": tahun_latih}


def jalankan_lipatan(nama_model, lipatan, ctx, tenggat=None):
    """-> ({(g,y): ln pred}, selesai) untuk semua baris uji dengan titik > 0. M0 memakai faktor setara dari tahun latih lipatan (S4)."""
    pred = {}
    for l in lipatan:
        if tenggat and tenggat():
            return pred, False
        if not l["latih"] and nama_model != "M0":
            continue
        ramal = spec_model(nama_model, dict(ctx, tahun_latih=l.get("tahun_latih")))(l["latih"])
        for b in l["uji"]:
            if b["f"].get("n_nh", 0) > 0:
                pred[(b["g"], b["y"])] = ramal(dict(b["f"], _g=b["g"]))
    return pred, True


# ---- metrik: galat log simetris
def _d_log(pred, truth, titik, min_titik):
    """d[k] = ln(pred) - ln(acuan). Unit disaring dari JUMLAH TITIK (fitur), bukan dari kebenaran; acuan <= 0 tak punya log (dihitung di n_nol)."""
    d, nol = {}, 0
    for k, lp in pred.items():
        t = truth.get(k)
        if t is None or titik.get(k, 0) < min_titik:
            continue
        if t <= 0:
            nol += 1
            continue
        d[k] = lp - math.log(t)
    return d, nol


def galat_per_tahun(pred, truth, titik, min_titik, min_unit=None):
    """{tahun: median |ln(pred/acuan)|}; tahun dengan < min_unit_per_tahun unit TIDAK dihitung sebagai blok (derau)."""
    mu = KRITERIA["metrik"]["min_unit_per_tahun"] if min_unit is None else min_unit
    d, _ = _d_log(pred, truth, titik, min_titik)
    per = {}
    for k, v in d.items():
        per.setdefault(k[1], []).append(abs(v))
    return {y: median(v) for y, v in per.items() if len(v) >= mu}


def _ringkas_d(ks, d, pred, truth):
    ad = [abs(d[k]) for k in ks]
    w = [truth[k] for k in ks]
    per = {}
    for k in ks:
        per.setdefault(k[1], []).append(k)
    tot = {}
    for y, kk in per.items():
        sp, st = sum(math.exp(pred[k]) for k in kk), sum(truth[k] for k in kk)
        tot[y] = (abs(sp - st) / st, sp / st - 1.0)
    sp_all, st_all = sum(math.exp(pred[k]) for k in ks), sum(w)
    return {"n": len(ks), "n_tahun": len(per), "galat_log_median": bulat(median(ad), 4), "faktor_galat_median": bulat(math.exp(median(ad)), 3),
            "bias_log": bulat(sum(d[k] for k in ks) / len(ks), 4),
            "galat_log_berbobot_luas": bulat(sum(wi * a for wi, a in zip(w, ad)) / sum(w), 4),
            "galat_total_nasional": {"median_tahun": bulat(median([v[0] for v in tot.values()]), 4), "bias_total_median_tahun": bulat(median([v[1] for v in tot.values()]), 4),
                                     "gabung_semua_tahun": bulat(abs(sp_all - st_all) / st_all, 4)}}


def metrik_log(pred, truth, titik, min_titik=None, tahun_elnino=()):
    """H9: metrik utama = median |ln(pred/acuan)|, bias log, galat total nasional (per tahun), bobot per luas untuk agregat. pred: {k: ln ha}; truth: {k: ha}.
    Dilaporkan per tahun dan khusus tahun El Nino (H11)."""
    mt = MIN_TITIK_EVAL if min_titik is None else min_titik
    d, nol = _d_log(pred, truth, titik, mt)
    ks = list(d)
    if len(ks) < 3:
        return {"n": len(ks), "n_acuan_nol": nol}
    out = _ringkas_d(ks, d, pred, truth)
    out["n_acuan_nol"] = nol
    out["korelasi_log"] = bulat(pearson([pred[k] for k in ks], [math.log(truth[k]) for k in ks]), 3)
    out["per_tahun"] = {str(y): _ringkas_d([k for k in ks if k[1] == y], d, pred, truth) for y in sorted({k[1] for k in ks})}
    ke = [k for k in ks if k[1] in set(tahun_elnino)]
    out["el_nino"] = _ringkas_d(ke, d, pred, truth) if len(ke) >= 3 else {"n": len(ke)}
    return out


def selisih_tahun(pred, pred0, truth, titik, min_titik=None):
    """{tahun: galat_median(M0) - galat_median(model)} pada unit yang sama; positif = model lebih baik."""
    mt = MIN_TITIK_EVAL if min_titik is None else min_titik
    ks = set(pred) & set(pred0)
    e1 = galat_per_tahun({k: pred[k] for k in ks}, truth, titik, mt)
    e0 = galat_per_tahun({k: pred0[k] for k in ks}, truth, titik, mt)
    return {y: e0[y] - e1[y] for y in e1 if y in e0}


def bootstrap_selisih(d_tahun):
    """Bootstrap BLOK TAHUN atas rata-rata selisih. -> {'dapat_dinilai', 'n_tahun', 'selisih_rata', 'ci', 'lebih_baik'}; < min_blok_tahun = tak dapat dinilai."""
    B = KRITERIA["bootstrap"]
    ys = sorted(d_tahun)
    if len(ys) < B["min_blok_tahun"]:
        return {"dapat_dinilai": False, "status": "tak_dapat_dinilai", "n_tahun": len(ys), "alasan": "blok tahun < %d (tanpa CI)" % B["min_blok_tahun"]}
    rng = random.Random(B["benih"])
    rata = []
    for _ in range(B["ulang"]):
        s = [d_tahun[ys[rng.randrange(len(ys))]] for _ in ys]
        rata.append(sum(s) / len(s))
    a = (1 - B["tingkat_ci"]) / 2
    lo, hi = kuantil(rata, a), kuantil(rata, 1 - a)
    return {"dapat_dinilai": True, "n_tahun": len(ys), "selisih_rata": bulat(sum(d_tahun[y] for y in ys) / len(ys), 4), "ci": [bulat(lo, 4), bulat(hi, 4)],
            "tingkat_ci": B["tingkat_ci"], "lebih_baik": bool(lo > KRITERIA["keputusan"]["K1"]["batas_bawah_ci_lebih_dari"])}


# ---- konformal berkelompok (blok = tahun), koreksi (n+1), kuantil per kelas ukuran
def kelas_ukuran(ln_pred):
    ha = math.exp(ln_pred)
    return sum(1 for b in KRITERIA["cakupan"]["kelas_ukuran_ha"] if ha >= b)


def batas_konformal(pool, qlo=0.1, qhi=0.9):
    """Kuantil konformal split dengan koreksi (n+1): bawah = urutan floor((n+1)qlo), atas = urutan ceil((n+1)qhi). None bila di luar jangkauan (n terlalu kecil)."""
    n = len(pool)
    if n == 0:
        return None
    xs = sorted(pool)
    rlo = int(math.floor((n + 1) * qlo + 1e-9))
    rhi = int(math.ceil((n + 1) * qhi - 1e-9))
    if rlo < 1 or rhi > n:
        return None
    return xs[rlo - 1], xs[rhi - 1]


def _kolam(residu, tahun, ln_pred):
    """Residu tahun LAIN (blok = tahun); kuantil per kelas ukuran (menurut P50 prediksi, bukan kebenaran) bila n kelas cukup, selain itu semua kelas."""
    c = KRITERIA["cakupan"]
    lain = [(e, l) for k, (e, l) in residu.items() if k[1] != tahun]
    kls = kelas_ukuran(ln_pred)
    kl = [e for e, l in lain if kelas_ukuran(l) == kls]
    if len(kl) >= c["min_pool_kelas"]:
        return kl, "kelas"
    return [e for e, _ in lain], "semua"


def kumpul_residu(pred, truth, titik, min_titik=None):
    """{k: (e, ln_pred)} dengan e = ln(acuan) - ln(pred); unit disaring dari jumlah titik."""
    mt = MIN_TITIK_EVAL if min_titik is None else min_titik
    d, _ = _d_log(pred, truth, titik, mt)
    return {k: (-v, pred[k]) for k, v in d.items()}


def _cakupan(items, kal, tahun_elnino):
    """items, kal: {k: (e, ln_pred)}. Selang tiap unit dari residu `kal` tahun LAIN (blok = tahun), (n+1), per kelas ukuran."""
    c = KRITERIA["cakupan"]
    ok = n = 0
    per, el = {}, [0, 0]
    for k, (e, lp) in items.items():
        pool, _ = _kolam(kal, k[1], lp)
        if len(pool) < c["min_pool"]:
            continue
        b = batas_konformal(pool, *c["kuantil"])
        if b is None:
            continue
        hit = b[0] <= e <= b[1]
        n += 1
        ok += hit
        p = per.setdefault(k[1], [0, 0])
        p[0] += hit
        p[1] += 1
        if k[1] in set(tahun_elnino):
            el[0] += hit
            el[1] += 1
    return {"n": n, "total": bulat(ok / n, 3) if n else None, "per_tahun": {str(y): bulat(v[0] / v[1], 3) for y, v in sorted(per.items())},
            "el_nino": bulat(el[0] / el[1], 3) if el[1] else None, "n_el_nino": el[1], "terhadap": "target latih (kalibrasi internal), bukan luas sebenarnya"}


def cakupan_konformal(pred, truth, titik, min_titik=None, tahun_elnino=()):
    """Cakupan selang P10-P90 konformal berkelompok (leave-year-out) terhadap `truth` (= target LATIH): DIAGNOSA kalibrasi, bukan bukti akurasi.
    Dilaporkan total, per tahun, dan tahun El Nino."""
    res = kumpul_residu(pred, truth, titik, min_titik)
    return _cakupan(res, res, tahun_elnino)


def cakupan_uji_akhir(pred_ua, pred_loyo, truth, titik, min_titik=None, tahun_elnino=()):
    """Cakupan di tahun uji akhir: selang dikalibrasi dari residu LOYO (tahun seleksi), diuji pada tahun yang tak ikut kalibrasi (termasuk El Nino 2015/2019/2023)."""
    return _cakupan(kumpul_residu(pred_ua, truth, titik, min_titik), kumpul_residu(pred_loyo, truth, titik, min_titik), tahun_elnino)


def selang_unit(ln_pred, tahun, residu, omisi_sd=0.0, min_pool=None):
    """(p10, p50, p90) ha. residu {k: (e, ln_pred_k)}: konformal berkelompok tahun-lain, koreksi (n+1), kuantil per kelas ukuran bila n cukup.
    H12: selang dilebarkan 1,2816 x omisi_sd (ketidakpastian koreksi omisi GWIS) di kedua ujung; tanpa omisi_sd selang HANYA terhadap target latih."""
    mp = KRITERIA["cakupan"]["min_pool"] if min_pool is None else min_pool
    pool, _ = _kolam(residu, tahun, ln_pred)
    if len(pool) < mp:
        return None
    b = batas_konformal(pool, *KRITERIA["cakupan"]["kuantil"])
    if b is None:
        return None
    z = 1.2816 * omisi_sd
    return tuple(math.exp(ln_pred + x) for x in (b[0] - z, median(pool), b[1] + z))


def evaluasi_seri(seri, baris, ref, ctx, tenggat=None, acuan_list=ACUAN_LATIH + ("gaveau",)):
    """Semua model x acuan latih. Seleksi: LOYO (+LOPO) pada tahun SELEKSI saja. Tahun uji akhir ditahan dari latih & pilih; prediksinya dihitung untuk semua kandidat
    tetapi pemenang ditentukan lebih dulu oleh pilih_model dari skor_seleksi (tidak membaca hasil tahun uji akhir).
    -> (hasil, preds, info). info: target latih, acuan nilai, titik, El Nino, omisi_sd."""
    uji_akhir = sorted({b["y"] for b in baris} & set(TAHUN_UJI_AKHIR))
    baris_sel = [b for b in baris if b["y"] not in uji_akhir]
    tahun_sel = {b["y"] for b in baris_sel}
    titik = {(b["g"], b["y"]): b["f"].get("n_nh", 0) for b in baris}
    elnino = {y for y, v in (ctx.get("oni_jas") or {}).items() if v >= KRITERIA["elnino"]["oni_jas_min"]}
    kor_prior = bangun_koreksi(ref["gwis"], None, tanpa_gaveau=True)
    nilai = {a: tabel_target(a, ref, kor_prior) for a in ACUAN_NILAI}
    # mata uang seleksi bersama: gabungan = GWIS x prior literatur, tanpa Gaveau (skala acuan berbeda membuat skor per-acuan tak sebanding)
    mata_uang = tabel_target(KRITERIA["pemilihan"]["seleksi_mata_uang_acuan"], {**ref, "gaveau": None}, kor_prior)
    kor_info = bangun_koreksi(ref["gwis"], ref.get("gaveau"))
    info = {"latih": {}, "nilai": nilai, "titik": titik, "elnino": elnino, "uji_akhir": uji_akhir,
            "omisi_sd": max(kor_prior["sd"], kor_info["sd"])}
    hasil, preds = [], {}
    for acuan in acuan_list:
        if acuan == "gaveau" and not ref.get("gaveau"):
            continue
        tt = target_latih(acuan, ref)
        info["latih"][acuan] = tt
        if acuan == "gaveau":
            fold = {"lopo": lipat_lopo([b for b in baris if b["y"] == 2019], tt),
                    "transfer": [_lipat("transfer", baris, tt, lambda b: b["y"] != 2019)]}
        else:
            fold = {"loyo": lipat_loyo(baris_sel, tt), "lopo": lipat_lopo(baris_sel, tt)}
            if uji_akhir:
                fold["uji_akhir"] = lipat_uji_akhir(baris, tt, uji_akhir)
        daftar = []
        for m_ in MODEL:
            daftar.append(m_)
            if m_ == "M0":
                daftar.append("M0_terskala")
        for nm in daftar:
            ent = {"seri": seri, "model": nm, "acuan_latih": acuan, "ket": KET_MODEL[nm], "tahun_uji_akhir": uji_akhir}
            for jenis, lip in fold.items():
                if tenggat and tenggat():
                    ent[jenis] = {"dilewati": "anggaran habis"}
                    continue
                pr, selesai = jalankan_lipatan(nm, lip, ctx, tenggat)
                preds[(seri, nm, acuan, jenis)] = pr
                if not selesai:
                    ent[jenis] = {"dilewati": "anggaran habis di tengah"}
                    continue
                ev = {"vs": {a: metrik_log(pr, nilai[a], titik, MIN_TITIK_EVAL, elnino) for a in ACUAN_NILAI if nilai.get(a) and a != ("gaveau" if acuan == "gaveau" else None)}}
                if jenis == "loyo":
                    ev["cakupan"] = cakupan_konformal(pr, tt, titik, MIN_TITIK_EVAL, elnino)
                if nm not in ("M0", "M0_terskala") and jenis in ("loyo", "uji_akhir") and (seri, "M0_terskala", acuan, jenis) in preds:
                    p0 = preds[(seri, "M0_terskala", acuan, jenis)]      # pembanding K1 & seleksi = M0 TERSKALA
                    pm = preds[(seri, "M0", acuan, jenis)]
                    ev["vs_m0_terskala"] = {a: bootstrap_selisih(selisih_tahun(pr, p0, nilai[a], titik)) for a in ACUAN_NILAI if nilai.get(a)}
                    ev["vs_m0_mentah"] = {a: bootstrap_selisih(selisih_tahun(pr, pm, nilai[a], titik)) for a in ACUAN_NILAI if nilai.get(a)}
                    if jenis == "loyo":
                        sel_d = selisih_tahun(pr, p0, mata_uang, titik)
                        ev["skor_seleksi"] = _rata(sel_d)
                        ev["skor_seleksi_n_tahun"] = len(sel_d)
                        ev["tahun_seleksi_target"] = len({y for (g_, y), ha_ in tt.items() if y in tahun_sel and ha_ >= MIN_TRAIN_HA and titik.get((g_, y), 0) > 0})
                        ev["status_seleksi"] = "memenuhi" if min(ev["skor_seleksi_n_tahun"], ev["tahun_seleksi_target"]) >= KRITERIA["pemilihan"]["min_tahun_seleksi"] else "tahun seleksi kurang"
                        ev["skor_seleksi_mata_uang"] = KRITERIA["pemilihan"]["seleksi_mata_uang"]
                    if jenis == "uji_akhir":
                        ev["k1_gfed5"] = bootstrap_selisih(selisih_tahun(pr, p0, nilai.get("gfed5") or {}, titik))
                        dg = selisih_tahun(pr, p0, nilai.get("gaveau") or {}, titik)
                        mg = (sum(dg.values()) / len(dg)) if dg else None
                        ev["k1_gaveau"] = {"dapat_dinilai": bool(dg), "n_tahun": len(dg), "selisih_rata": bulat(mg, 4) if dg else None,
                                           "positif": bool(dg and mg > 0), "catatan": "satu tahun, tanpa CI; berbagi data Gaveau 2019 dengan K2"}
                if jenis == "uji_akhir":
                    ev["cakupan"] = cakupan_uji_akhir(pr, preds.get((seri, nm, acuan, "loyo"), {}), tt, titik, MIN_TITIK_EVAL, elnino)
                ev["acuan_independen"] = list(ACUAN_INDEP)
                ev["acuan_latih_dinilai_sendiri"] = acuan
                ent[jenis] = ev
            ent["boleh_dipilih"] = bool(acuan != "gaveau" and nm != "M0_terskala" and isinstance(ent.get("loyo"), dict) and "vs" in ent["loyo"])
            if ent["boleh_dipilih"] and isinstance(ent.get("uji_akhir"), dict) and "vs" in ent["uji_akhir"]:
                ent["lolos"] = putusan_entri(ent)
            hasil.append(ent)
    return hasil, preds, info


def _rata(d):
    return bulat(sum(d.values()) / len(d), 4) if d else None


def putusan_entri(ent):
    """K1 (lebih baik dari M0, bootstrap blok tahun, acuan independen, tahun uji akhir), K2 (galat log median vs Gaveau 2019), K3 (kalibrasi). Tak dapat dinilai = tidak lolos."""
    K = KRITERIA["keputusan"]
    ua = ent.get("uji_akhir") or {}
    bg, gv = ua.get("k1_gfed5") or {}, ua.get("k1_gaveau") or {}
    k1_n = bool(bg.get("dapat_dinilai") and gv.get("dapat_dinilai"))
    k1 = bool(k1_n and bg.get("lebih_baik") and gv.get("positif"))
    g = (ua.get("vs") or {}).get(K["K2"]["acuan"]) or {}
    k2_n = bool(g.get("n", 0) >= K["K2"]["min_unit"] and g.get("galat_log_median") is not None)
    k2 = bool(k2_n and g["galat_log_median"] <= math.log(K["K2"]["galat_log_median_maks_rasio"]))
    cv = (ent.get("loyo") or {}).get("cakupan") or {}
    cu = ua.get("cakupan") or {}
    a, bb = KRITERIA["cakupan"]["rentang"]
    k3_n = bool(cv.get("total") is not None and cu.get("el_nino") is not None and cu.get("n_el_nino", 0) >= KRITERIA["cakupan"]["min_unit_elnino"])
    k3 = bool(k3_n and a <= cv["total"] <= bb and cu["el_nino"] >= KRITERIA["cakupan"]["elnino_min"])
    return {"K1": k1, "K2": k2, "K3": k3, "semua": bool(k1 and k2 and k3), "dapat_dinilai": {"K1": k1_n, "K2": k2_n, "K3": k3_n},
            "K1_status": "tak_dapat_dinilai" if not k1_n else ("lolos" if k1 else "gagal"), "pembanding_k1": "M0_terskala",
            "label_data": "K1 (bagian Gaveau) dan K2 berbagi data Gaveau 2019 (satu tahun, satu sumber); GFED5 semi-independen",
            "catatan": None if (k1_n and k2_n and k3_n) else "ada kriteria yang tak dapat dinilai (acuan independen/El Nino kurang): dihitung TIDAK lolos"}


def _layak(e):
    """Kandidat yang BOLEH menang: dapat dipilih, bukan M0, ada skor seleksi, dan tahun seleksi (berskor DAN bertarget latih) >= min_tahun_seleksi."""
    lo = e.get("loyo") or {}
    return bool(e.get("boleh_dipilih") and e["model"] != "M0" and lo.get("skor_seleksi") is not None
                and min(lo.get("skor_seleksi_n_tahun", 0), lo.get("tahun_seleksi_target", 0)) >= KRITERIA["pemilihan"]["min_tahun_seleksi"])


def n_kandidat(hasil):
    """Jumlah kandidat yang boleh menang (tahun seleksi cukup)."""
    return sum(1 for e in hasil if _layak(e))


def n_tahun_seleksi_kurang(hasil):
    """Kandidat berskor tetapi tahun seleksi < min_tahun_seleksi: dilaporkan, tidak dapat menang."""
    return sum(1 for e in hasil if e.get("boleh_dipilih") and e["model"] != "M0" and (e.get("loyo") or {}).get("skor_seleksi") is not None and not _layak(e))


def pilih_model(hasil):
    """-> (terpilih | None, pemenang_seleksi | None). Pemenang = skor_seleksi tertinggi (> 0) di antara kandidat layak (tahun seleksi >= min); TIDAK membaca hasil tahun uji akhir.
    Bila pemenang gagal K1-K3, tidak ada model terpilih (tidak turun ke peringkat 2: itu memilih dengan tahun uji akhir)."""
    cand = [e for e in hasil if _layak(e) and e["loyo"]["skor_seleksi"] > 0]
    if not cand:
        return None, None
    win = max(cand, key=lambda e: e["loyo"]["skor_seleksi"])
    return (win if (win.get("lolos") or {}).get("semua") else None), win


def evaluasi_sel(seri, sel_fitur, gav_sel, kov_g, ctx, tenggat=None, ukuran_blok=2.0):
    """Sel 0,25 derajat 2019 vs Gaveau (leave-one-spatial-block-out, blok 2x2 derajat). CATATAN: latih & uji sama-sumber (Gaveau, blok lain), jadi ini validasi spasial,
    BUKAN acuan independen dari target latih; tidak dipakai untuk K1-K3. Sel tanpa titik panas tidak terjangkau (ha_gaveau_tanpa_titik)."""
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
    titik = {(r["id"], r["bi"]): r["f"].get("n_nh", 0) for r in rows}
    tanpa = sum(v for k, v in gav_sel.items() if k not in sel_fitur or sel_fitur[k].get("n_nh", 0) <= 0)
    out = {"n_sel": len(rows), "n_blok": len(ids_blok), "ha_gaveau_total": sum(gav_sel.values()), "ha_gaveau_tanpa_titik": tanpa, "model": [],
           "catatan": "validasi spasial dalam sumber yang sama (Gaveau); bukan acuan independen dari target latih; tidak dipakai untuk K1-K3"}
    ctx_sel = dict(ctx, tahun_latih=(set(ctx["rasio_nm"]) - {2019}) if ctx.get("rasio_nm") is not None else None)
    for nm in MODEL:
        if tenggat and tenggat():
            out["model"].append({"model": nm, "seri": seri, "dilewati": "anggaran habis"})
            continue
        fit = spec_model(nm, ctx_sel)
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
        out["model"].append({"model": nm, "seri": seri, "metrik": metrik_log(pred, truth, titik, MIN_TITIK_EVAL), "ha_prediksi_total": round(tot_pred),
                             "rasio_total_vs_gaveau_sel_bertitik": bulat(tot_pred / sum(r["ha"] for r in rows), 3) if rows and sum(r["ha"] for r in rows) else None})
    return out


# ================================================================ prediksi akhir + selang + tabel
def prediksi_unit(entri, baris, ref, ctx, preds, info, tenggat=None):
    """Prediksi p10/p50/p90 per unit untuk model `entri`: LOYO (tahun seleksi), uji akhir (tahun ditahan), model akhir (lainnya, termasuk 2026).
    hujan_z dihitung dari tahun latih model akhir (2026 memakai mu/sigma itu). Selang konformal berkelompok terhadap target latih `acuan_latih`;
    untuk acuan 'gabungan' dilebarkan ketidakpastian koreksi omisi (H12). -> {(g,y): dict}"""
    seri, nm, acuan = entri["seri"], entri["model"], entri["acuan_latih"]
    pr_loyo = preds.get((seri, nm, acuan, "loyo"), {})
    pr_ua = preds.get((seri, nm, acuan, "uji_akhir"), {})
    tt = info["latih"][acuan]
    residu = kumpul_residu(pr_loyo, tt, info["titik"])
    omisi = info["omisi_sd"] if acuan == "gabungan" else 0.0
    tahun_tr = {b["y"] for b in baris if (b["g"], b["y"]) in tt and tt[(b["g"], b["y"])] >= MIN_TRAIN_HA and b["f"].get("n_nh", 0) > 0}
    z = hujan_z_lipatan(baris, tahun_tr)

    def fz(b):
        zb = z.get((b["g"], b["y"]))
        return b["f"] if zb is None else dict(b["f"], hujan_z=zb)
    tr = [Latihan(dict(fz(b), _g=b["g"]), tt[(b["g"], b["y"])], b["y"], b["g"]) for b in baris
          if (b["g"], b["y"]) in tt and tt[(b["g"], b["y"])] >= MIN_TRAIN_HA and b["f"].get("n_nh", 0) > 0]
    ramal = spec_model(nm, dict(ctx, tahun_latih=tahun_tr))(tr) if tr or nm == "M0" else None
    out = {}
    for b in baris:
        if b["f"].get("n_nh", 0) <= 0:
            continue
        k = (b["g"], b["y"])
        if k in pr_loyo:
            lp, asal = pr_loyo[k], "LOYO"
        elif k in pr_ua:
            lp, asal = pr_ua[k], "uji_akhir"
        elif ramal:
            lp, asal = ramal(dict(fz(b), _g=b["g"])), "model_akhir"
        else:
            continue
        s = selang_unit(lp, b["y"], residu, omisi)
        if s:
            out[k] = {"p10": s[0], "p50": s[1], "p90": s[2], "mentah": math.exp(lp), "asal": asal}
    return out


def ha_per_piksel(pred, fitur_cache, seri):
    """S22: faktor efektif model terpilih = sum(P50) / sum(piksel unik 'px') atas unit (grup, tahun) berprediksi. -> {'nasional', 'prov': {g: ...}, 'tahun'}"""
    sp, sx, pg, tahun = 0.0, 0.0, {}, set()
    for (g, y), v in pred.items():
        e = fitur_cache.get("%s|%d" % (seri, y))
        px = ((e or {}).get("prov", {}).get(g) or {}).get("px")
        if not px:
            continue
        sp += v["p50"]
        sx += px
        a = pg.setdefault(g, [0.0, 0.0])
        a[0] += v["p50"]
        a[1] += px
        tahun.add(y)
    if not sx:
        return None
    return {"nasional": bulat(sp / sx, 4), "prov": {g: bulat(a[0] / a[1], 4) for g, a in sorted(pg.items()) if a[1]}, "tahun": sorted(tahun), "seri": seri,
            "definisi": "jumlah P50 model / jumlah piksel unik (px) atas unit provinsi-tahun berprediksi; piksel seri %s" % seri}


# ---- tally kecocokan antartahun
def pita_independen(ind):
    """Pita dari acuan INDEPENDEN saja, melebar menurut ketidakpastian tiap acuan: [nilai/f, nilai*f] -> (min bawah, maks atas)."""
    fk = KRITERIA["tally"]["lebar_pita_faktor"]
    v = [(k, x) for k, x in ind.items() if x]
    if not v:
        return None
    return min(x / fk.get(k, 2.0) for k, x in v), max(x * fk.get(k, 2.0) for k, x in v)


def bendera_tabel(baris_tahun, indep_fn, oni_jas, sensor_ganti=(2012, 2018, 2023), dmi=None):
    """baris_tahun: {y: {'luas': {p10,p50,p90}|None, 'hotspot_seri': n|None, 'nfs': n|None}}; indep_fn(y) -> {nama: nilai}. Hanya acuan yang punya lebar pita
    (Gaveau independen, GFED5 semi-independen) membentuk pita; Nusantara hanya rujukan (S-2).
    Tiga jenis bendera, dipisah: BUKTI (dalam_pita saja; satu bukti, tidak dua), KONSISTENSI INTERNAL (rasio luas/hotspot dan luas/firespot; model dibuat dari titik
    itu; bukan bukti), PENJELASAN (lonjakan ENSO/IOD; bukan uji). `cocok` True hanya bila tahun dapat dinilai (>= min acuan) dan dalam_pita dinilai dan lolos.
    Label acuan per tahun: gaveau+gfed5 / gfed5 semi-independen / gaveau / tak_dapat_dinilai. Pita = heuristik, ditulis sebelum hasil."""
    T = KRITERIA["tally"]
    L = KRITERIA["lonjakan"]
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
        fl = {"dalam_pita": None, "rasio_hotspot_hist": None, "rasio_firespot_hist": None, "lonjakan": None}
        sebab = []
        ind = {k: v for k, v in (indep_fn(y) or {}).items() if v and k in T["lebar_pita_faktor"]}
        pita = pita_independen(ind)
        label = "gaveau+gfed5" if ("gaveau" in ind and "gfed5" in ind) else ("gfed5 semi-independen" if "gfed5" in ind else ("gaveau" if "gaveau" in ind else "tak_dapat_dinilai"))
        status = "tanpa_model" if not r.get("luas") else ("dapat_dinilai" if len(ind) >= T["min_acuan_independen"] else "tak_dapat_dinilai")
        if r.get("luas"):
            if status == "dapat_dinilai":
                lo, hi = pita
                fl["dalam_pita"] = bool(lo <= r["luas"]["p50"] <= hi)
                if r["luas"]["p50"] > hi:
                    sebab.append("model di atas pita acuan (acuan kurang hitung?)")
                elif r["luas"]["p50"] < lo:
                    sebab.append("model di bawah pita acuan")
            for kunci, nama in (("hotspot_seri", "rasio_hotspot_hist"), ("nfs", "rasio_firespot_hist")):
                h = rasio_hist(y, kunci)
                if r.get(kunci) and len(h) >= T["rasio_hist_min_tahun"]:
                    x = r["luas"]["p50"] / r[kunci]
                    pa, pb = T["rasio_hist_persentil"]
                    fl[nama] = bool(kuantil(h, pa) <= x <= kuantil(h, pb))
            if i > 0 and baris_tahun[ys[i - 1]].get("luas") and ys[i - 1] == y - 1:
                faktor = r["luas"]["p50"] / baris_tahun[ys[i - 1]]["luas"]["p50"]
                if faktor >= L["faktor"] or faktor <= 1 / L["faktor"]:
                    a, b = oni_jas.get(y), oni_jas.get(y - 1)
                    E, I = L["enso"], L["iod"]
                    naik, turun = faktor >= L["faktor"], faktor <= 1 / L["faktor"]
                    jelas = bool(a is not None and b is not None and ((naik and a - b >= E["delta_oni_min"] and a >= E["oni_min"]) or (turun and b - a >= E["delta_oni_min"] and b >= E["oni_min"])))
                    da, db = (dmi or {}).get(y), (dmi or {}).get(y - 1)   # IOD positif juga pendorong kekeringan (2019)
                    iod = bool(da is not None and db is not None and ((naik and da >= I["dmi_min"] and da - db >= I["delta_dmi_min"]) or (turun and db >= I["dmi_min"] and db - da >= I["delta_dmi_min"])))
                    fl["lonjakan"] = {"faktor": bulat(faktor, 2), "dijelaskan_enso": jelas, "dijelaskan_iod": iod,
                                      "oni_jas": [bulat(b, 2) if b is not None else None, bulat(a, 2) if a is not None else None],
                                      "dmi_jas": [bulat(db, 2) if db is not None else None, bulat(da, 2) if da is not None else None]}
                    if iod and not jelas:
                        sebab.append("lonjakan %.1fx dijelaskan IOD positif (DMI JAS %.1f), bukan ENSO" % (faktor, da))
                    if not jelas and not iod:
                        sebab.append("lonjakan %.1fx tak dijelaskan ENSO maupun IOD" % faktor)
        a = oni_jas.get(y)
        if a is not None and a >= KRITERIA["elnino"]["oni_jas_min"]:
            sebab.append("El Nino (ONI JAS %.1f)" % a)
        if y in sensor_ganti:
            sebab.append({2012: "S-NPP VIIRS mulai (Jan 2012)", 2018: "NOAA-20 mulai (Apr 2018)", 2023: "NOAA-21 mulai"}[y])
        if y in (2001, 2002):
            sebab.append("MODIS Terra saja (Aqua mulai Jul 2002)")
        bukti = T["bendera_bukti"]
        dinilai = [k for k in bukti if fl[k] is not None]
        gagal = [k for k in bukti if fl[k] is False]
        cocok = None
        if status == "dapat_dinilai" and len(dinilai) >= T["cocok_min_bendera_dinilai"]:
            cocok = not gagal
        out[y] = {"tally": fl, "jenis_bendera": {"bukti": list(bukti), "konsistensi_internal_bukan_bukti": T["bendera_konsistensi_internal"], "penjelasan_bukan_uji": T["bendera_penjelasan"]},
                  "status": status, "label_acuan": label, "n_acuan_independen": len(ind), "n_bendera_dinilai": len(dinilai),
                  "pita_independen": [bulat(pita[0], 0), bulat(pita[1], 0)] if pita else None, "pita_label": T["pita_label"],
                  "cocok": cocok, "gagal": gagal, "sebab_dugaan": sebab}
    return out


def _daya(out):
    """H-1: tally berdaya hanya bila >= min_tahun_uji_kekuatan tahun dapat dinilai DAN deteksi galat x2 >= daya_deteksi_min_x2; selain itu label 'tally tak berdaya'."""
    T = KRITERIA["tally"]
    d2 = (out.get("deteksi") or {}).get("2.0")
    out["tally_tak_berdaya"] = bool(out["n_tahun_dinilai"] < T["min_tahun_uji_kekuatan"] or d2 is None or d2 < T["daya_deteksi_min_x2"])
    out["label_daya"] = "tally tak berdaya" if out["tally_tak_berdaya"] else "tally berdaya"


def uji_kekuatan_tally(per, per_m0, indep_fn, oni_jas, dmi=None):
    """UJI KEKUATAN: suntik galat x0,5 dan x2 pada angka model; laporkan tingkat deteksi (cocok False) pada tahun yang dapat dinilai, tingkat lolos model apa adanya,
    dan tingkat lolos M0. Bila tak ada tahun dapat dinilai: tak_dapat_dinilai (tally tak punya daya sama sekali)."""
    def skala(p, f):
        return {y: (dict(r, luas={k: r["luas"][k] * f for k in ("p10", "p50", "p90")}) if r.get("luas") else r) for y, r in p.items()}

    def cocok(p):
        return {y: b["cocok"] for y, b in bendera_tabel(p, indep_fn, oni_jas, dmi=dmi).items()}
    base = cocok(per)
    dn = [y for y, c in base.items() if c is not None]
    out = {"n_tahun_dinilai": len(dn), "tahun_dinilai": dn}
    if not dn:
        out.update({"tak_dapat_dinilai": True, "deteksi": {}, "tingkat_lolos_model": None, "tingkat_lolos_m0": None})
        _daya(out)
        return out
    out["tak_dapat_dinilai"] = False
    out["deteksi"] = {}
    for f in KRITERIA["tally"]["uji_kekuatan_faktor_galat"]:
        c = cocok(skala(per, f))
        out["deteksi"][str(f)] = bulat(sum(1 for y in dn if c.get(y) is False) / len(dn), 3)
    out["tingkat_lolos_model"] = bulat(sum(1 for y in dn if base[y] is True) / len(dn), 3)
    c0 = cocok(per_m0)
    out["tingkat_lolos_m0"] = bulat(sum(1 for y in dn if c0.get(y) is True) / len(dn), 3)
    _daya(out)
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
    # hujan_z TIDAK dihitung di sini (H2): mu/sigma harus dari tahun latih tiap lipatan -> hujan_z_lipatan() di _lipat / prediksi_unit
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


def rasio_setara_tahun(fitur_cache):
    """{tahun: N_nh nasional / M_nh nasional} pada tahun tumpang tindih. M0 seri M mengambil median HANYA atas tahun latih lipatan (S4)."""
    r = {}
    for y in range(2013, 2026):
        n, m = fitur_cache.get("N|%d" % y), fitur_cache.get("M|%d" % y)
        if not n or not m:
            continue
        a = sum(f.get("n_nh", 0) for f in n["prov"].values())
        b = sum(f.get("n_nh", 0) for f in m["prov"].values())
        if a and b:
            r[y] = a / b
    return r


def faktor_setara(fitur_cache):
    """Median semua tahun tumpang tindih (hanya untuk model akhir/tabel; di dalam lipatan pakai rasio_setara_tahun + tahun latih)."""
    r = list(rasio_setara_tahun(fitur_cache).values())
    return median(r) if r else 1.0


# ================================================================ tabel kecocokan
def bangun_tabel(fitur_cache, pred_seri, ref, kov, repo_hot, oni_jas, seri_pilih, nama_model, model_lolos=None):
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
                luas["mentah"] = sum(p.get("mentah", p["p50"]) for p, _ in ps)
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
            m0 = None
            if luas and nh:   # M0 pembanding tally: titik x 4,3 ha (seri M: x faktor setara), tanpa selang (titik); hanya pada tahun yang model utamanya punya luas
                p0 = max(1.0, FAKTOR_TITIK * (fs_m if sn == "M" else 1.0) * nh)
                m0 = {"p10": p0, "p50": p0, "p90": p0}
            per[y] = {"luas": luas, "hotspot_seri": nh, "nfs": nfs, "ncl": ncl, "hot": hot_, "ac": ac, "seri_luas": asal_seri, "m0": m0}
        return per

    def refs(per):
        """HANYA Gaveau (independen) dan GFED5 (semi-independen); SiPongi/GWIS dilaporkan di baris tetapi tidak membentuk pita; Nusantara hanya rujukan."""
        return lambda y: {k: v for k, v in per[y]["ac"].items() if v and k in ("gaveau", "gfed5")}

    fs_m = faktor_setara(fitur_cache)

    def render(per, tahun_list):
        bd = bendera_tabel({y: per[y] for y in tahun_list}, refs(per), oni_jas, dmi=(kov or {}).get("dmi"))
        rows = []
        for y in tahun_list:
            r, ac, l = per[y], per[y]["ac"], per[y]["luas"]
            def rs(a, b):
                return bulat(a / b, 3) if a and b else None
            rows.append({"tahun": y, "hotspot": r["hot"], "hotspot_seri_nh": r["hotspot_seri"], "firespot_R0": r["nfs"], "cluster": r["ncl"],
                         "luas_model": {k: round(l[k]) for k in ("p10", "p50", "p90")} | {"asal": l["asal"], "seri": r["seri_luas"]} if l else None,
                         "luas_model_mentah": round(l["mentah"]) if l else None, "rasio_p50_vs_mentah": rs(l and l["p50"], l and l["mentah"]),
                         "model_lolos": model_lolos,
                         "acuan": {k: (round(v) if v else None) for k, v in ac.items()},
                         "rasio": {"model_sipongi": rs(l and l["p50"], ac["sipongi"]), "model_gwis": rs(l and l["p50"], ac["gwis"]),
                                   "model_gaveau": rs(l and l["p50"], ac["gaveau"]), "model_nusantara": rs(l and l["p50"], ac["nusantara"]),
                                   "sipongi_gwis": rs(ac["sipongi"], ac["gwis"])},
                         "ha_per_hotspot": rs(l and l["p50"], r["hotspot_seri"]), "ha_per_firespot": rs(l and l["p50"], r["nfs"]),
                         **bd[y]})
        return rows

    semua_g = sorted({g for d in pred_seri.values() for (g, _) in d} | set(fitur_cache_grup(fitur_cache)))
    per_nas = baris_unit(semua_g, TAHUN_TABEL, True)
    tabel = {"nasional": render(per_nas, TAHUN_TABEL), "prov": {}}
    tabel["uji_kekuatan"] = uji_kekuatan_tally({y: per_nas[y] for y in TAHUN_TABEL}, {y: dict(per_nas[y], luas=per_nas[y]["m0"]) for y in TAHUN_TABEL},
                                              refs(per_nas), oni_jas, dmi=(kov or {}).get("dmi"))
    tabel["catatan_tally"] = ("SATU bukti: dalam_pita (P50 model di pita dari Gaveau [independen] dan/atau GFED5 [semi-independen: turunan titik api MODIS]); pita = %s; "
                              "label acuan per tahun; tahun tanpa acuan = tak dapat dinilai; Nusantara hanya rujukan; rasio luas/hotspot & luas/firespot = konsistensi internal, bukan bukti; "
                              "lonjakan ENSO/IOD = penjelasan, bukan uji. Tally memakai P50 (koreksi median residu); besaran mentah ada di luas_model_mentah (K1/K2 memakai mentah)."
                              % KRITERIA["tally"]["pita_label"])
    tabel["model_lolos"] = model_lolos
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
         "Status: **%s** · dibuat %s · kriteria_sha %s · bukan produksi." % (J.get("status"), J.get("dibuat"), (J.get("kriteria_sha") or "-")[:12]), ""]
    tp = J.get("terpilih")
    nk = J.get("n_kandidat")
    if tp:
        L.append("Model terpilih: **%s / seri %s / dilatih terhadap %s** (pemenang seleksi dari %s kandidat; lolos K1-K3 pada tahun uji akhir)." % (tp["model"], tp["seri"], tp["acuan_latih"], nk))
    else:
        tb = J.get("terbaik_tak_lolos")
        L.append("**Tidak ada model terpilih** (kandidat: %s)." % nk + (" Pemenang seleksi (TIDAK lolos K1-K3 di tahun uji akhir): %s / seri %s / %s." % (
            tb["model"], tb["seri"], tb["acuan_latih"]) if tb else " Belum ada hasil validasi."))
    L += ["", "Kriteria ada di scripts/data/lab_kriteria/lab_luas.json (dipra-tulis, sha di atas). Klaim akurasi HANYA terhadap acuan independen (Gaveau 2019, GFED5); "
          "SiPongi/GWIS dilaporkan tetapi bukan penilai (target latih / turunan titik). Metrik: median |ln(pred/acuan)|.", ""]
    L += ["## Seleksi (LOYO tahun seleksi, terhadap target latih sendiri) dan tahun uji akhir", "",
          "| Seri | Model | Latih | skor seleksi (M0_terskala - model, mata uang gabungan) | galat log med. uji akhir vs Gaveau | vs GFED5 | K1 K2 K3 |", "|---|---|---|---|---|---|---|"]
    for e in J.get("model", []):
        if not e.get("boleh_dipilih"):
            continue
        ua = (e.get("uji_akhir") or {}).get("vs") or {}
        lo = e.get("lolos") or {}
        L.append("| %s | %s | %s | %s | %s | %s | %s %s %s |" % (e["seri"], e["model"], e["acuan_latih"], (e.get("loyo") or {}).get("skor_seleksi"),
                                                                (ua.get("gaveau") or {}).get("galat_log_median"), (ua.get("gfed5") or {}).get("galat_log_median"),
                                                                tanda(lo.get("K1")), tanda(lo.get("K2")), tanda(lo.get("K3"))))
    uk = (J.get("tabel") or {}).get("uji_kekuatan")
    if uk:
        L += ["", "## Uji kekuatan tally", "", "Tahun dapat dinilai: %s; deteksi galat x0,5/x2: %s; lolos model: %s; lolos M0: %s%s; **%s**" % (
            uk.get("n_tahun_dinilai"), uk.get("deteksi"), uk.get("tingkat_lolos_model"), uk.get("tingkat_lolos_m0"), " (TAK DAPAT DINILAI)" if uk.get("tak_dapat_dinilai") else "", uk.get("label_daya"))]
    L += ["", "## Tabel kecocokan nasional (ha)", "",
          "| Tahun | Hot M | Hot N | Hot N20 | Hot N21 | Firespot | Cluster | Model P10 | P50 | P90 | SiPongi | GWIS | Gaveau | Nusantara | M/Sip | M/GWIS | status | label acuan | pita | cocok |",
          "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for r in (J.get("tabel") or {}).get("nasional", []):
        l, a, t = r.get("luas_model") or {}, r["acuan"], r["tally"]
        h = r["hotspot"]
        L.append("| %d | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s | %s |" % (
            r["tahun"], f_ha(h.get("M")), f_ha(h.get("N")), f_ha(h.get("N20")), f_ha(h.get("N21")), f_ha(r.get("firespot_R0")), f_ha(r.get("cluster")),
            f_ha(l.get("p10")), f_ha(l.get("p50")), f_ha(l.get("p90")), f_ha(a.get("sipongi")), f_ha(a.get("gwis")), f_ha(a.get("gaveau")), f_ha(a.get("nusantara")),
            r["rasio"].get("model_sipongi") or "-", r["rasio"].get("model_gwis") or "-", r.get("status"), r.get("label_acuan"), tanda(t["dalam_pita"]), tanda(r.get("cocok"))))
    L += ["", "Bendera: `pita` = SATU bukti (Gaveau independen; GFED5 semi-independen; pita heuristik, ditulis sebelum hasil); Nusantara hanya rujukan. model_lolos = %s." % (J.get("model_lolos"),) + " Rasio luas/hotspot dan luas/firespot = konsistensi internal, BUKAN bukti. Lonjakan ENSO/IOD = penjelasan, BUKAN uji. "
          "`-` = tak dapat dinilai (bukan lolos)."]
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


def sha_kriteria(k=None):
    """sha256 penuh dari bentuk kanonik (kunci terurut, tanpa spasi) berkas kriteria."""
    return hashlib.sha256(kanon(KRITERIA if k is None else k).encode("utf-8")).hexdigest()


def catat_jalan(baris, jalur=None):
    """B8: satu baris JSON ke jalan.jsonl, APPEND-ONLY (mode 'a'; baris lama tidak pernah dibaca-tulis ulang)."""
    jalur = jalur or JALAN_JSONL
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur, "a", encoding="utf-8") as f:
        f.write(json.dumps(baris, sort_keys=True, ensure_ascii=False, separators=(",", ":")) + "\n")


def baris_jalan(fase, mulai, status, vonis=None):
    b = {"skrip": "lab_luas.py", "waktu": dt.datetime.now(UTC).isoformat(timespec="seconds"), "id_jalan": mulai, "fase": fase, "kriteria_sha": sha_kriteria(),
         "git_commit": os.environ.get("GITHUB_SHA") or None, "status": status}
    if vonis is not None:
        b["vonis"] = vonis
    return b


def kunci_cache(sensor, y, sampai):
    return "%s|%d" % (sensor, y) + ("|%s" % sampai[5:].replace("-", "") if sampai else "")


def jalan():
    """Bungkus: baris awal ke jalan.jsonl SEBELUM menghitung apa pun, baris penutup (status + vonis) di akhir, juga bila gagal."""
    mulai = dt.datetime.now(UTC).isoformat(timespec="seconds")
    catat_jalan(baris_jalan("awal", mulai, "berjalan"))
    try:
        J = _jalan(mulai)
    except BaseException as e:  # noqa: BLE001
        catat_jalan(baris_jalan("akhir", mulai, "gagal", "galat: " + redaksi(type(e).__name__ + ": " + str(e))[:200]))
        raise
    catat_jalan(baris_jalan("akhir", mulai, J["status"], J.get("vonis")))


def _jalan(mulai):
    ang = Anggaran(float(os.environ.get("LAB_MENIT", "30")))
    os.makedirs(OUT, exist_ok=True)
    p_luas, p_fit = os.path.join(OUT, "luas.json"), os.path.join(OUT, "luas_fitur.json")
    # 1. kriteria DIKUNCI sebelum menghitung apa pun
    simpan_json(p_luas, {"versi": 2, "status": "berjalan", "dibuat": mulai, "kriteria": dict(KRITERIA, dikunci_pada=mulai), "kriteria_sha": sha_kriteria(), "jujur": JUJUR})
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
    assert J["kriteria_sha"] == sha_kriteria()
    simpan_json(p_luas, J)
    with open(os.path.join(OUT, "luas_ringkas.md"), "w") as f:
        f.write(tulis_md(J))
    log("selesai; %s" % J["status"])
    return J


def susun_hasil(cache, ref, kov, statis, ang, catatan, status, belum, mulai, gav):
    hasil_all, preds_all, info_seri, baris_seri = [], {}, {}, {}
    ctx_seri = {}
    for seri, (y0, y1) in SERI.items():
        baris = rakit_baris(seri, cache, statis, kov, y0, min(y1, 2025))
        baris_seri[seri] = baris
        if len({b["y"] for b in baris}) < 3:
            belum.append("model seri %s: tahun berfitur < 3" % seri)
            continue
        ctx = {"seri": seri, "faktor_setara": faktor_setara(cache), "rasio_nm": rasio_setara_tahun(cache), "oni_jas": kov["oni_jas"]}
        ctx_seri[seri] = ctx
        h, p, inf = evaluasi_seri(seri, baris, ref, ctx, tenggat=lambda: ang.lewat(0.92))
        hasil_all += h
        preds_all.update(p)
        info_seri[seri] = inf
    terpilih, pemenang = pilih_model(hasil_all)
    pakai = terpilih or pemenang
    pred_seri = {}
    if pakai:
        def _ent(seri):
            return [e for e in hasil_all if e["seri"] == seri and e.get("boleh_dipilih") and e["model"] == pakai["model"] and e["acuan_latih"] == pakai["acuan_latih"]]
        for seri, ctx in ctx_seri.items():
            bagus = _ent(seri)
            if bagus:
                pred_seri[seri] = prediksi_unit(bagus[0], baris_seri[seri], ref, ctx, preds_all, info_seri[seri])
        # 2026 dan tahun tak berlabel: baris dari cache lain (hujan_z memakai mu/sigma tahun latih)
        for seri, ctx in ctx_seri.items():
            extra = rakit_baris(seri, cache, statis, kov, 2026, 2026)
            if extra and pred_seri.get(seri) is not None and _ent(seri):
                pred_seri[seri].update(prediksi_unit(_ent(seri)[0], baris_seri[seri] + extra, ref, ctx, preds_all, info_seri[seri]))
    tabel = bangun_tabel(cache, pred_seri, ref, kov, None, kov["oni_jas"], pakai["seri"] if pakai else "N", pakai["model"] if pakai else None, model_lolos=bool(terpilih)) if cache else None
    # 2026 Jan-Sep (periode yang sama dengan Nusantara Atlas): model akhir diterapkan pada fitur s.d. 30 Sep
    if pakai and tabel:
        sj = pakai["seri"]
        e_js = cache.get("%s|2026|0930" % sj)
        if e_js and sj in ctx_seri:
            rows_js = rakit_baris(sj, {"%s|2026" % sj: e_js}, statis, kov, 2026, 2026)
            ent = [e for e in hasil_all if e["seri"] == sj and e["model"] == pakai["model"] and e["acuan_latih"] == pakai["acuan_latih"]][0]
            pj = prediksi_unit(ent, baris_seri[sj] + rows_js, ref, ctx_seri[sj], preds_all, info_seri[sj])
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
                kg = {b["g"]: {k: v for k, v in b["f"].items() if k in ("oni_jas", "oni_aso", "dmi_jas", "hujan_mm", "kanal_dens", "hilang012") or k.startswith("wc_")}
                      for b in baris_seri.get(seri, []) if b["y"] == 2019}
                sel_hasil.append(evaluasi_sel(seri, e19["sel"], ref["gaveau_sel"], kg, ctx, tenggat=lambda: ang.lewat(0.97)))
    hp = None
    if pakai and pred_seri.get(pakai["seri"]):
        hp = ha_per_piksel(pred_seri[pakai["seri"]], cache, pakai["seri"])
    vonis = ("terpilih %s/%s/%s (pemenang seleksi dari %d kandidat, lolos K1-K3 di tahun uji akhir)" % (terpilih["model"], terpilih["seri"], terpilih["acuan_latih"], n_kandidat(hasil_all))
             if terpilih else "tidak ada model terpilih (%d kandidat; %s)" % (n_kandidat(hasil_all), ("pemenang seleksi %s/%s/%s gagal atau tak dapat dinilai pada K1-K3" % (
                 pemenang["model"], pemenang["seri"], pemenang["acuan_latih"])) if pemenang else "tak ada kandidat dengan skor seleksi > 0"))
    J = {"versi": 2, "status": "selesai" if not belum else "sebagian", "dibuat": mulai, "selesai": dt.datetime.now(UTC).isoformat(timespec="seconds"),
         "kriteria": dict(KRITERIA, dikunci_pada=mulai), "kriteria_sha": sha_kriteria(), "jujur": JUJUR, "fitur": FITUR_DAFTAR, "model_ket": KET_MODEL,
         "n_kandidat": n_kandidat(hasil_all), "n_kandidat_tahun_seleksi_kurang": n_tahun_seleksi_kurang(hasil_all), "model_lolos": bool(terpilih), "tahun_uji_akhir": list(TAHUN_UJI_AKHIR), "vonis": vonis,
         "model": hasil_all, "terpilih": _ringkas_pilih(terpilih), "terbaik_tak_lolos": _ringkas_pilih(pemenang) if not terpilih else None,
         "selang_ket": "Selang P10-P90 = konformal berkelompok (blok tahun, koreksi n+1) terhadap TARGET LATIH model, bukan luas sebenarnya; untuk target 'gabungan' dilebarkan "
                       "ketidakpastian koreksi omisi (1,2816 x sd).",
         "tabel": tabel, "sel_gaveau_2019": sel_hasil, "acuan_ringkas": {"gaveau_2019_total_ha": gav["total"] if gav else None, "nusantara_2026_jan_sep_ha": NUSANTARA_2026,
                                          "koreksi_omisi_informasi": bangun_koreksi(ref["gwis"], ref.get("gaveau")) if ref.get("gaveau") else "prior literatur 52-62%",
                                          "catatan": "koreksi berbasis Gaveau hanya informasi; target latih tidak memakai Gaveau"},
         "data": {"unduhan": status, "catatan": catatan, "peta": None}, "belum_dikerjakan": belum,
         "waktu": {"detik": round(ang.terpakai()), "batas_detik": round(ang.total)}}
    if terpilih and hp:
        J["ha_per_piksel"] = hp["nasional"]          # dibaca lab_padam.faktor_luas (hanya model terpilih yang lolos)
        J["ha_per_piksel_detail"] = hp
    else:
        J["ha_per_piksel_tersedia"] = False
        J["ha_per_piksel_alasan"] = "tidak ada model terpilih yang lolos K1-K3; lab_padam memakai faktor produksi"
        if hp:
            J["ha_per_piksel_kandidat"] = dict(hp, catatan="pemenang seleksi yang TIDAK lolos; JANGAN dipakai")
    return J


def _ringkas_pilih(e):
    return None if not e else {k: e[k] for k in ("seri", "model", "acuan_latih", "ket", "loyo", "uji_akhir", "lolos") if k in e}


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

    # --- kuantil / metrik log / bootstrap / konformal, hitung tangan
    _anggota(kuantil([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 0.1), 2.0, 1e-12)
    _anggota(kuantil([0, 10], 0.25), 2.5, 1e-12)
    _anggota(median([3, 1, 2, 4]), 2.5, 1e-12)
    # 4 unit, 2 tahun; truth 1000,2000,4000,8000; pred = truth x {1, 2, 0.5, 1}; semua >= 20 titik
    truth = {("a", 1): 1000.0, ("b", 1): 2000.0, ("a", 2): 4000.0, ("b", 2): 8000.0}
    pred = {("a", 1): math.log(1000), ("b", 1): math.log(4000), ("a", 2): math.log(2000), ("b", 2): math.log(8000)}
    tk = {k: 30 for k in truth}
    mt = metrik_log(pred, truth, tk, 20, tahun_elnino={1})
    assert mt["n"] == 4 and mt["n_tahun"] == 2
    # d = ln(pred/truth) = 0, ln2, -ln2, 0 -> |d| median = (0 + ln2)/2
    _anggota(mt["galat_log_median"], round(math.log(2) / 2, 4), 1e-9, "galat log median")
    _anggota(mt["faktor_galat_median"], round(math.exp(math.log(2) / 2), 3), 1e-9)
    _anggota(mt["bias_log"], 0.0, 1e-9)
    # berbobot luas: (2000 ln2 + 4000 ln2) / 15000 = 0,4 ln2
    _anggota(mt["galat_log_berbobot_luas"], round(0.4 * math.log(2), 4), 1e-9, "bobot luas")
    # galat total per tahun: tahun 1 (5000 vs 3000) 2/3 bias +2/3; tahun 2 (10000 vs 12000) 1/6 bias -1/6; median = rata-rata dua nilai; semua tahun: 15000 vs 15000
    _anggota(mt["galat_total_nasional"]["median_tahun"], round((2 / 3 + 1 / 6) / 2, 4), 1e-9)
    _anggota(mt["galat_total_nasional"]["bias_total_median_tahun"], round((2 / 3 - 1 / 6) / 2, 4), 1e-9)
    _anggota(mt["galat_total_nasional"]["gabung_semua_tahun"], 0.0, 1e-9)
    assert mt["per_tahun"]["1"]["n"] == 2 and mt["el_nino"] == {"n": 2}      # tahun El Nino 1 hanya 2 unit (< 3): tidak diringkas
    # saring dari JUMLAH TITIK, bukan kebenaran: unit ("b",2) 5 titik keluar -> sisa a1,b1,a2: |d| = 0, ln2, ln2 -> median ln2
    tk2 = {**tk, ("b", 2): 5}
    m2_ = metrik_log(pred, truth, tk2, 20)
    assert m2_["n"] == 3
    _anggota(m2_["galat_log_median"], round(math.log(2), 4), 1e-9)
    # acuan kecil (10 ha < MIN lama 1000) TETAP ikut asal titik cukup; acuan 0 dicatat n_acuan_nol, bukan dibuang diam-diam
    truth3 = {**truth, ("c", 1): 10.0, ("d", 1): 0.0}
    pred3 = {**pred, ("c", 1): math.log(10), ("d", 1): math.log(50)}
    m3_ = metrik_log(pred3, truth3, {**tk, ("c", 1): 40, ("d", 1): 40}, 20)
    assert m3_["n"] == 5 and m3_["n_acuan_nol"] == 1, m3_
    # bootstrap blok tahun, hitung tangan (min_blok_tahun = 4)
    b1 = bootstrap_selisih({1: 0.2, 2: 0.2, 3: 0.2, 4: 0.2})        # semua resample rata-rata 0,2 -> CI [0,2, 0,2]
    assert b1["dapat_dinilai"] and b1["lebih_baik"] and b1["ci"] == [0.2, 0.2] and b1["n_tahun"] == 4
    b2 = bootstrap_selisih({1: 0.1, 2: -0.1, 3: 0.1, 4: -0.1})      # P(semua resample -0,1) = 1/16 > 5%: batas bawah -0,1 -> tak lebih baik
    assert b2["dapat_dinilai"] and not b2["lebih_baik"] and b2["ci"][0] == -0.1
    b3 = bootstrap_selisih({1: 0.1, 2: 0.3, 3: 0.1, 4: 0.3})        # P(rata-rata=0,1)=1/16 > 5%: persentil 5 = 0,1 > 0; persentil 95 = 0,3
    assert b3["lebih_baik"] and b3["ci"] == [0.1, 0.3] and abs(b3["selisih_rata"] - 0.2) < 1e-9
    b4 = bootstrap_selisih({1: 5.0})
    assert not b4["dapat_dinilai"] and "lebih_baik" not in b4 and "ci" not in b4          # < 4 blok tahun: tak dapat dinilai, tanpa CI
    assert bootstrap_selisih({1: 0.1, 2: 0.3, 3: 0.1, 4: 0.3}) == b3                  # benih tetap: deterministik
    # selisih per tahun: model galat 0 pada tahun 1 (a,b), M0 galat ln2 -> selisih tahun 1 = ln2
    # min_unit_per_tahun = 5: tahun 1 punya 5 unit (dihitung), tahun 2 hanya 4 unit (BUKAN blok)
    tr_ = {(c, 1): 1000.0 for c in "abcde"}
    tr_.update({(c, 2): 1000.0 for c in "abcd"})
    sd_ = selisih_tahun({k: math.log(1000) for k in tr_}, {k: math.log(2000) for k in tr_}, tr_, {k: 30 for k in tr_})
    assert set(sd_) == {1} and KRITERIA["metrik"]["min_unit_per_tahun"] == 5
    _anggota(sd_[1], math.log(2), 1e-9)
    # galat_per_tahun: tahun 1 (5 unit, |d| = 0,1,0,1,0 x ln2 -> median 0), tahun 2 (4 unit) dibuang; min_unit eksplisit 4 -> tahun 2 ikut
    pr_g = {(c, 1): math.log(1000) + (math.log(2) if c in "bd" else 0.0) for c in "abcde"}
    pr_g.update({(c, 2): math.log(1000) + math.log(3) for c in "abcd"})
    gp_ = galat_per_tahun(pr_g, tr_, {k: 30 for k in tr_}, 20)
    assert set(gp_) == {1} and abs(gp_[1]) < 1e-9
    gp4 = galat_per_tahun(pr_g, tr_, {k: 30 for k in tr_}, 20, min_unit=4)
    assert set(gp4) == {1, 2}
    _anggota(gp4[2], math.log(3), 1e-9)
    # blok tahun < min_unit tidak ikut bootstrap: 4 tahun, tahun 4 hanya 3 unit -> 3 blok (< 4) -> tak dapat dinilai
    tb_, pb_, p0b_, tkb_ = {}, {}, {}, {}
    for y in (1, 2, 3, 4):
        for c in range(5 if y < 4 else 3):
            k = ("u%d" % c, y)
            tb_[k], pb_[k], p0b_[k], tkb_[k] = 1000.0, math.log(1000), math.log(2000), 30
    db_ = selisih_tahun(pb_, p0b_, tb_, tkb_)
    assert sorted(db_) == [1, 2, 3] and not bootstrap_selisih(db_)["dapat_dinilai"]
    assert bootstrap_selisih(selisih_tahun(pb_, p0b_, tb_, tkb_, min_titik=20) | {4: db_[1]})["dapat_dinilai"]
    # konformal (n+1): n=19 -> urutan 2 dan 18; n=9 -> urutan 1 dan 9 (min, maks); n=8 -> tak terjangkau
    assert batas_konformal(list(range(1, 20))) == (2, 18)
    assert batas_konformal(list(range(1, 10))) == (1, 9)
    assert batas_konformal(list(range(1, 9))) is None and batas_konformal([]) is None
    assert kelas_ukuran(math.log(1000)) == 0 and kelas_ukuran(math.log(5000)) == 1 and kelas_ukuran(math.log(60000)) == 2
    # selang_unit: 19 residu 0,1..1,9 di tahun 2/3, ln_pred = ln 1000 -> (0,2; median 1,0; 1,8); lalu +- 1,2816 x 0,1 untuk omisi
    res_ = {("g%d" % i, 2 + i % 2): (0.1 * i, math.log(1000)) for i in range(1, 20)}
    s = selang_unit(math.log(1000), 1, res_, min_pool=19)
    _anggota(s[0], 1000 * math.exp(0.2), 1e-6)
    _anggota(s[1], 1000 * math.exp(1.0), 1e-6)
    _anggota(s[2], 1000 * math.exp(1.8), 1e-6)
    so = selang_unit(math.log(1000), 1, res_, omisi_sd=0.1, min_pool=19)
    _anggota(so[0], 1000 * math.exp(0.2 - 0.12816), 1e-6)
    _anggota(so[2], 1000 * math.exp(1.8 + 0.12816), 1e-6)
    assert selang_unit(math.log(1000), 1, res_, min_pool=25) is None       # pool terlalu kecil: tak ada selang
    # blok = tahun: tahun uji 3 mengeluarkan i ganjil (10 residu) -> sisa i genap 0,2..1,8 (9 nilai): urutan 1 dan 9 = (0,2; 1,8), median 1,0
    s2 = selang_unit(math.log(1000), 3, res_, min_pool=9)
    _anggota(s2[0], 1000 * math.exp(0.2), 1e-6)
    _anggota(s2[2], 1000 * math.exp(1.8), 1e-6)
    _anggota(s2[1], 1000 * math.exp(1.0), 1e-6)
    # per kelas ukuran: kelas 2 (lp ln 60000) punya 40 residu 0,01..0,40; kelas 0 berisi sampah 100: n=40 -> urutan floor(4,1)=4 dan ceil(36,9)=37
    res2 = {("k%d" % i, 2 + i % 2): (0.01 * i, math.log(60000)) for i in range(1, 41)}
    res2.update({("s%d" % i, 2 + i % 2): (100.0, math.log(1000)) for i in range(1, 31)})
    s3 = selang_unit(math.log(60000), 1, res2)
    _anggota(s3[0], 60000 * math.exp(0.04), 1e-6)
    _anggota(s3[2], 60000 * math.exp(0.37), 1e-6)
    s4 = selang_unit(math.log(1000), 1, res2)         # kelas 0 punya 30 sampah (>= min_pool_kelas): kuantil kelasnya sendiri, bukan kelas 2
    assert s4[1] > 1000 * math.exp(50), s4
    # cakupan: 5 tahun x 8 grup, e = 0 kecuali satu pencilan e = 5 di tahun 3 -> 39/40 tercakup; tahun 3: 7/8; El Nino (tahun 1) 8/8
    tr_c, pr_c, tk_c = {}, {}, {}
    for y in range(1, 6):
        for g in range(8):
            k = ("g%d" % g, y)
            tr_c[k] = 1000.0 * (math.exp(5.0) if (g, y) == (0, 3) else 1.0)
            pr_c[k] = math.log(1000.0)
            tk_c[k] = 30
    cv_ = cakupan_konformal(pr_c, tr_c, tk_c, 20, tahun_elnino={1})
    assert cv_["n"] == 40 and cv_["total"] == 0.975 and cv_["per_tahun"]["3"] == 0.875 and cv_["per_tahun"]["1"] == 1.0, cv_
    assert cv_["el_nino"] == 1.0 and cv_["n_el_nino"] == 8
    # uji akhir: kalibrasi dari residu tahun 1-5 (e = 0), uji tahun 9 (8 unit, e = 0) -> cakupan 1,0; satu unit e = 3 -> 7/8
    pu_ = {("g%d" % g, 9): math.log(1000.0) for g in range(8)}
    tu_ = {k: 1000.0 for k in pu_}
    tu_[("g0", 9)] = 1000.0 * math.exp(3.0)
    cu_ = cakupan_uji_akhir(pu_, pr_c, {**tr_c, **tu_}, {**tk_c, **{k: 30 for k in pu_}}, 20, tahun_elnino={9})
    # pool kalibrasi: 40 residu, satu pencilan e=5 -> n=40: urutan floor(4,1)=4 dan ceil(36,9)=37 -> kedua nol; e=0 tercakup, e=3 tidak
    assert cu_["total"] == 0.875 and cu_["el_nino"] == 0.875 and cu_["n_el_nino"] == 8, cu_

    # --- hujan_z dalam lipatan (H2): mu/sigma dari tahun latih saja
    bz = [{"g": "A", "y": 2001 + i, "f": {"hujan_mm": 100.0 * (i + 1), "n_nh": 10}} for i in range(8)]     # 100..800
    z1 = hujan_z_lipatan(bz, {2001, 2002, 2003, 2004, 2005})          # mu 300, sigma sqrt(100000/5)
    _anggota(z1[("A", 2003)], 0.0, 1e-12)
    _anggota(z1[("A", 2007)], 400.0 / math.sqrt(20000.0), 1e-9)       # 700 -> tahun uji memakai mu/sigma latih
    z2 = hujan_z_lipatan(bz, {y for y in range(2001, 2009) if y != 2007})
    mu_ = 2900.0 / 7
    _anggota(z2[("A", 2007)], (700.0 - mu_) / math.sqrt(1550000.0 / 7 - mu_ ** 2), 1e-9)
    assert z1[("A", 2007)] != z2[("A", 2007)]
    assert hujan_z_lipatan(bz, {2001, 2002, 2003, 2004}) == {}          # < 5 tahun latih: tidak ada z (bukan z dari semua tahun)
    lp_ = _lipat("uji", bz, {("A", y): 1000.0 for y in range(2001, 2009)}, lambda b: b["y"] == 2007)
    _anggota(lp_["uji"][0]["f"]["hujan_z"], (700.0 - mu_) / math.sqrt(1550000.0 / 7 - mu_ ** 2), 1e-9)
    assert lp_["tahun_latih"] == {y for y in range(2001, 2009) if y != 2007} and all(t.y != 2007 for t in lp_["latih"])
    assert "hujan_z" not in bz[0]["f"], "baris asli tidak boleh dimutasi"
    # rakit_baris tidak lagi menaruh hujan_z (itu urusan lipatan)
    cs_ = {"N|%d" % y: {"prov": {"A": {"ncl": 1, "n_nh": 10}}} for y in range(2010, 2018)}
    rb_ = rakit_baris("N", cs_, {}, {"hujan": {"A": {y: float(y) for y in range(2010, 2018)}}}, 2010, 2017)
    assert len(rb_) == 8 and all("hujan_z" not in b["f"] for b in rb_)

    # --- M0 seri M: faktor setara dari tahun latih lipatan saja (S4)
    csr = {}
    for y, (n_, m_) in {2013: (200, 100), 2014: (400, 100), 2015: (1000, 100)}.items():
        csr["N|%d" % y] = {"prov": {"A": {"n_nh": n_}}}
        csr["M|%d" % y] = {"prov": {"A": {"n_nh": m_}}}
    assert rasio_setara_tahun(csr) == {2013: 2.0, 2014: 4.0, 2015: 10.0} and faktor_setara(csr) == 4.0
    lip0 = {"latih": [], "uji": [{"g": "A", "y": 2015, "f": {"n1": 10, "n2": 0, "n_nh": 10}}], "tahun_latih": {2013, 2014}}
    ctxm = {"seri": "M", "rasio_nm": rasio_setara_tahun(csr), "faktor_setara": faktor_setara(csr)}
    p0_, _ = jalankan_lipatan("M0", [lip0], ctxm)
    _anggota(math.exp(p0_[("A", 2015)]), 4.3 * 3.0 * 10, 1e-6, "M0 fs=median(2,4)=3 tanpa 2015")
    p1_, _ = jalankan_lipatan("M0", [dict(lip0, tahun_latih={2015})], ctxm)
    _anggota(math.exp(p1_[("A", 2015)]), 4.3 * 10.0 * 10, 1e-6, "M0 fs=10 bila hanya 2015 tahun latih")
    p2_, _ = jalankan_lipatan("M0", [dict(lip0, tahun_latih=None)], ctxm)
    _anggota(math.exp(p2_[("A", 2015)]), 4.3 * 4.0 * 10, 1e-6, "tanpa tahun latih: nilai tunggal")
    p3_, _ = jalankan_lipatan("M0", [lip0], {"seri": "N", "rasio_nm": {2013: 2.0}})
    _anggota(math.exp(p3_[("A", 2015)]), 4.3 * 10, 1e-6, "seri N tak memakai faktor setara")

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
    # target gabungan (informasi): 2019 pakai Gaveau; tahun lain GWIS x r
    t19 = target_gabungan("A", 2019, gwis, gav_, k1)
    assert t19 == (30000.0, 30000.0, 30000.0)
    t18 = target_gabungan("A", 2018, gwis, gav_, k1)
    _anggota(t18[1], 5000 * k1["r"]["A"], 1e-6)
    assert t18[0] < t18[1] < t18[2]
    # B1: target LATIH tidak memakai Gaveau sama sekali (Gaveau = penilai independen); ubah Gaveau -> target latih identik
    baris = [{"g": g, "y": y, "f": {"n1": 10, "n2": 5, "n_nh": 15}} for g in ("A", "B") for y in (2018, 2019)]
    refa = {"sipongi": {}, "gwis": gwis, "gaveau": gav_, "gfed5": None}
    refb = {"sipongi": {}, "gwis": gwis, "gaveau": {"A": 99999.0, "B": 3333.0}, "gfed5": None}
    assert target_latih("gabungan", refa) == target_latih("gabungan", refb)
    _anggota(target_latih("gabungan", refa)[("A", 2018)], 5000 * (1 / (1 - 0.57)), 1e-6, "target latih gabungan = GWIS x prior literatur")
    assert ("A", 2019) in target_latih("gabungan", refa) and target_latih("gabungan", refa)[("A", 2019)] != 30000.0
    assert target_latih("gaveau", refa)[("A", 2019)] == 30000.0 and ("A", 2018) not in target_latih("gaveau", refa)    # hanya acuan-latih 'gaveau' yang memakainya
    assert target_latih("gwis", refa)[("B", 2018)] == 1000.0
    # gabungan tidak ada di daftar penilai; Gaveau & GFED5 independen
    assert "gabungan" not in ACUAN_NILAI and set(ACUAN_INDEP) == {"gaveau", "gfed5"} and set(ACUAN_NILAI) >= {"sipongi", "gwis", "gaveau"}
    # LOYO: lipatan 2018 melatih dengan 2019 (target GWIS x prior), tanpa Gaveau
    tta = target_latih("gabungan", refa)
    l18 = [l for l in lipat_loyo(baris, tta) if l["tahun_uji"] == 2018][0]
    assert any(t.y == 2019 and abs(t.ha - 10000 / 0.43) < 1e-6 for t in l18["latih"]) and all(t.y != 2018 for t in l18["latih"])
    # LOPO: provinsi uji tidak ikut latih
    lp = [l for l in lipat_lopo(baris, tta) if l["grup_uji"] == "B"][0]
    assert lp["latih"] and all(t.g != "B" for t in lp["latih"]) and {b["g"] for b in lp["uji"]} == {"B"}
    # tahun uji akhir: tidak ikut latih
    ua_ = lipat_uji_akhir(baris, tta, [2019])[0]
    assert all(t.y != 2019 for t in ua_["latih"]) and {b["y"] for b in ua_["uji"]} == {2019} and ua_["tahun_latih"] == {2018}
    # GFED5 sebagai acuan nilai
    assert tabel_target("gfed5", {"gfed5": {"A": {2015: 7.0}}}, None) == {("A", 2015): 7.0}

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
        px_ = rs_.uniform(25, 400)
        selx[k] = {"n": 3 * px_, "n0": 0, "n1": px_, "n2": px_, "n_nh": 2 * px_, "px": px_, "px_tol": 0.8 * px_, "ncl": px_ / 5, "nfs": 1, "cl_med": 2.0, "cl_p90": 9.0,
                   "cl_p100": 0.0, "pxcl100": 0.0, "frp": 5 * px_, "frp_px": 5.0, "malam": 0.2, "dur_med": 1.0, "dur_p90": 3.0, "hari": 20, "gb": 0.3, "ks": 0.0,
                   "ht": 0.2, "g": "62" if la > 0 else "16", "lat": (math.floor(la / .25) + .5) * .25, "lon": (math.floor(lo / .25) + .5) * .25}
        for kk in KLS_KEYS:
            selx[k][kk] = 0
        selx[k]["k0l"] = int(px_ / 5)
        gsel[k] = 20.0 * 0.8 * px_ * math.exp(rs_.gauss(0, 0.05))
    gsel["999|999"] = 5000.0                       # sel terbakar tanpa titik panas
    es = evaluasi_sel("N", selx, gsel, {}, {"seri": "N"})
    assert es["n_sel"] == len(selx) and es["ha_gaveau_tanpa_titik"] == 5000.0 and len(es["model"]) == 5 and "bukan acuan independen" in es["catatan"]
    ms_ = {m["model"]: m for m in es["model"]}
    assert ms_["M2"]["metrik"]["galat_log_median"] < ms_["M0"]["metrik"]["galat_log_median"] and ms_["M2"]["metrik"]["korelasi_log"] > 0.9, ms_["M2"]

    # --- tally: bendera, hand-calc. Pita dari Gaveau (x/1,5 .. x*1,5) dan GFED5 (x/2 .. x*2); pita = (min bawah, maks atas). SATU bukti: dalam_pita
    P = pita_independen
    assert P({"gaveau": 100.0}) == (100.0 / 1.5, 150.0) and P({}) is None and P({"gaveau": None}) is None
    pg_ = P({"gaveau": 100.0, "gfed5": 110.0})
    _anggota(pg_[0], 55.0, 1e-9)       # min(66,67; 55)
    _anggota(pg_[1], 220.0, 1e-9)      # max(150; 220)
    assert KRITERIA["tally"]["bendera_bukti"] == ["dalam_pita"] and "nusantara" not in KRITERIA["tally"]["lebar_pita_faktor"]
    oni = {2014: 0.0, 2015: 2.0, 2016: 0.0, 2017: 0.0, 2018: 0.0, 2019: 0.4, 2020: 0.0}
    per = {}
    for y, p50 in zip(range(2014, 2021), (100, 800, 100, 100, 100, 150, 100)):
        per[y] = {"luas": {"p10": p50 * .5, "p50": p50, "p90": p50 * 2}, "hotspot_seri": 10, "nfs": 5}

    def indep(y):
        if y == 2017:
            return {"gfed5": 100.0}                                   # hanya GFED5: dinilai, berlabel semi-independen
        if y == 2018:
            return {"nusantara": 100.0}                               # Nusantara hanya rujukan: tidak membentuk pita
        return {"gaveau": 100.0, "gfed5": 110.0} if y != 2015 else {"gaveau": 300.0, "gfed5": 350.0}
    bd = bendera_tabel(per, indep, oni)
    assert bd[2014]["tally"]["dalam_pita"] is True and bd[2014]["cocok"] is True and bd[2014]["status"] == "dapat_dinilai" and bd[2014]["label_acuan"] == "gaveau+gfed5"   # 100 dalam [55,220]
    assert "selang_tumpang" not in bd[2014]["tally"] and bd[2014]["pita_label"] == "heuristik, ditulis sebelum hasil"
    # 2015: pita [min(200,175), max(450,700)] = [175,700]; 800 di luar -> cocok False
    assert bd[2015]["pita_independen"] == [175.0, 700.0] and bd[2015]["tally"]["dalam_pita"] is False and bd[2015]["cocok"] is False and bd[2015]["gagal"] == ["dalam_pita"]
    assert bd[2015]["tally"]["lonjakan"]["faktor"] == 8.0 and bd[2015]["tally"]["lonjakan"]["dijelaskan_enso"] is True   # ONI 0 -> 2
    assert abs(bd[2016]["tally"]["lonjakan"]["faktor"] - 0.125) < 0.006 and bd[2016]["tally"]["lonjakan"]["dijelaskan_enso"] is True
    # GFED5 saja: pita [50, 200], model 100 -> dinilai dan cocok; label semi-independen
    assert bd[2017]["status"] == "dapat_dinilai" and bd[2017]["label_acuan"] == "gfed5 semi-independen" and bd[2017]["cocok"] is True and bd[2017]["pita_independen"] == [50.0, 200.0]
    # tanpa acuan (Nusantara tak dihitung): tak dapat dinilai, cocok None (bukan lolos)
    assert bd[2018]["status"] == "tak_dapat_dinilai" and bd[2018]["label_acuan"] == "tak_dapat_dinilai" and bd[2018]["cocok"] is None and bd[2018]["n_bendera_dinilai"] == 0 and bd[2018]["n_acuan_independen"] == 0
    assert bd[2019]["tally"]["lonjakan"] is None and bd[2020]["tally"]["lonjakan"] is None        # 1,5x bukan lonjakan; 150 -> 100 = 0,67
    assert any("NOAA-20" in s for s in bd[2018]["sebab_dugaan"]) and any("El Nino" in s for s in bd[2015]["sebab_dugaan"])
    assert bendera_tabel({2014: dict(per[2014])}, lambda y: {"gaveau": 100.0}, {})[2014]["label_acuan"] == "gaveau"
    jb = bd[2014]["jenis_bendera"]
    assert jb["bukti"] == ["dalam_pita"] and "rasio_hotspot_hist" in jb["konsistensi_internal_bukan_bukti"] and jb["penjelasan_bukan_uji"] == ["lonjakan"]
    # rasio luas/hotspot TIDAK menjadi bukti: bukti lolos, rasio historis gagal -> cocok tetap True
    per_r = {y: {"luas": {"p10": 50.0, "p50": 100.0, "p90": 200.0}, "hotspot_seri": 10, "nfs": 5} for y in range(2010, 2017)}
    per_r[2016]["hotspot_seri"] = 1                                  # rasio 100 vs 10 pada 6 tahun lain: di luar P5-P95
    br = bendera_tabel(per_r, lambda y: {"gaveau": 100.0, "gfed5": 100.0}, {})
    assert br[2016]["tally"]["rasio_hotspot_hist"] is False and br[2016]["tally"]["dalam_pita"] is True and br[2016]["cocok"] is True and br[2016]["gagal"] == []
    # lonjakan tak dijelaskan BUKAN kegagalan uji (penjelasan, bukan uji), tetapi dicatat
    per2 = {2014: dict(per[2014]), 2015: dict(per[2015])}
    per2[2015]["luas"] = {"p10": 100, "p50": 400, "p90": 800}
    b2_ = bendera_tabel(per2, lambda y: {}, {2014: 0.0, 2015: 0.1})
    assert b2_[2015]["tally"]["lonjakan"]["dijelaskan_enso"] is False and any("tak dijelaskan ENSO" in s for s in b2_[2015]["sebab_dugaan"]) and "lonjakan" not in b2_[2015]["gagal"]
    assert b2_[2015]["cocok"] is None
    b3_ = bendera_tabel(per2, lambda y: {}, {2014: 0.0, 2015: 0.1}, dmi={2014: 0.0, 2015: 0.9})   # seperti 2019: ONI lemah, IOD positif kuat
    assert b3_[2015]["tally"]["lonjakan"]["dijelaskan_iod"] is True and b3_[2015]["tally"]["lonjakan"]["dijelaskan_enso"] is False
    assert any("IOD positif" in s for s in b3_[2015]["sebab_dugaan"])
    assert bendera_tabel({2014: {"luas": None}}, lambda y: {"gaveau": 1.0, "gfed5": 1.0}, {})[2014]["status"] == "tanpa_model"

    # --- UJI KEKUATAN tally. Model 100 ha di 2010-2015; acuan gaveau 100 + gfed5 100 hanya 2012-2015 (pita [50, 200]); 2010-2011 tanpa acuan.
    pk = {y: {"luas": {"p10": 80.0, "p50": 100.0, "p90": 120.0}, "hotspot_seri": 10, "nfs": 5} for y in range(2010, 2016)}
    pk0 = {y: dict(r, luas={"p10": 100.0 if y < 2014 else 400.0, "p50": 100.0 if y < 2014 else 400.0, "p90": 100.0 if y < 2014 else 400.0}) for y, r in pk.items()}
    ik = lambda y: {"gaveau": 100.0, "gfed5": 100.0} if y >= 2012 else {}   # noqa: E731
    uk = uji_kekuatan_tally(pk, pk0, ik, {})
    assert uk["n_tahun_dinilai"] == 4 and uk["tahun_dinilai"] == [2012, 2013, 2014, 2015] and not uk["tak_dapat_dinilai"]
    # x0,5 -> 50 dan x2 -> 200 jatuh TEPAT di tepi pita [50,200] (inklusif): tidak terdeteksi
    assert uk["deteksi"] == {"0.5": 0.0, "2.0": 0.0}, uk
    assert uk["tingkat_lolos_model"] == 1.0 and uk["tingkat_lolos_m0"] == 0.5     # M0 100 lolos (2012-13), 400 gagal (2014-15)
    assert uk["tally_tak_berdaya"] is True and uk["label_daya"] == "tally tak berdaya"        # 4 tahun < 5 dan daya x2 = 0 < 0,5
    # pita sempit (hanya Gaveau: [66,7; 150]) dan 6 tahun dinilai: x0,5 (50) dan x2 (200) terdeteksi semua -> berdaya
    uk2 = uji_kekuatan_tally(pk, pk0, lambda y: {"gaveau": 100.0}, {})
    assert uk2["deteksi"] == {"0.5": 1.0, "2.0": 1.0} and uk2["n_tahun_dinilai"] == 6 and uk2["tally_tak_berdaya"] is False and uk2["label_daya"] == "tally berdaya"
    assert abs(uk2["tingkat_lolos_m0"] - 4 / 6) < 1e-3     # M0: 100 lolos 2010-13 (4 tahun), 400 gagal 2014-15
    # tak ada tahun dapat dinilai: dilaporkan tak_dapat_dinilai dan tak berdaya
    uk3 = uji_kekuatan_tally(pk, pk0, lambda y: {}, {})
    assert uk3["tak_dapat_dinilai"] and uk3["tingkat_lolos_model"] is None and uk3["n_tahun_dinilai"] == 0 and uk3["tally_tak_berdaya"] is True
    # daya cukup tetapi tahun < 5: tetap tak berdaya
    uk4 = uji_kekuatan_tally({y: pk[y] for y in range(2010, 2014)}, pk0, lambda y: {"gaveau": 100.0}, {})
    assert uk4["n_tahun_dinilai"] == 4 and uk4["deteksi"]["2.0"] == 1.0 and uk4["tally_tak_berdaya"] is True

    # --- M0_terskala: M0 x median(target latih / M0) dari tahun latih; hitung tangan
    trs = [Latihan({"n1": 10, "n2": 0}, 86.0, 2001, "A"), Latihan({"n1": 20, "n2": 0}, 258.0, 2002, "A"), Latihan({"n1": 10, "n2": 0}, 215.0, 2003, "A")]
    # M0: 4,3 x 10 = 43; 4,3 x 20 = 86; rasio 86/43 = 2, 258/86 = 3, 215/43 = 5 -> median 3
    rs0 = spec_model("M0_terskala", {"seri": "N"})(trs)
    _anggota(math.exp(rs0({"n1": 10, "n2": 0})), 129.0, 1e-6, "M0_terskala = 3 x 43")
    _anggota(math.exp(rs0({"n1": 100, "n2": 0})), 3 * 430.0, 1e-6)
    assert "M0_terskala" not in MODEL and "M0_terskala" in KET_MODEL

    # --- putusan K1-K3 dan pilih_model. K1 = positif vs GFED5 (bootstrap blok tahun, >= 4 blok) DAN positif vs Gaveau (satu tahun, tanpa CI)
    k1g_ok = {"dapat_dinilai": True, "lebih_baik": True, "n_tahun": 4}
    k1v_ok = {"dapat_dinilai": True, "positif": True, "n_tahun": 1}
    ua_ok = {"k1_gfed5": k1g_ok, "k1_gaveau": k1v_ok, "vs": {"gaveau": {"n": 10, "galat_log_median": 0.40}}, "cakupan": {"el_nino": 0.75, "n_el_nino": 12}}
    ent_ok = {"loyo": {"cakupan": {"total": 0.8}}, "uji_akhir": ua_ok}
    po = putusan_entri(ent_ok)
    assert po["semua"] is True and po["K1_status"] == "lolos" and po["pembanding_k1"] == "M0_terskala" and "berbagi data Gaveau 2019" in po["label_data"]
    ln15 = math.log(1.5)
    assert 0.405 < ln15 < 0.4055
    assert putusan_entri(dict(ent_ok, uji_akhir=dict(ua_ok, vs={"gaveau": {"n": 10, "galat_log_median": 0.4055}})))["K2"] is False     # > ln 1,5
    assert putusan_entri(dict(ent_ok, uji_akhir=dict(ua_ok, vs={"gaveau": {"n": 10, "galat_log_median": 0.405}})))["K2"] is True
    assert putusan_entri(dict(ent_ok, uji_akhir=dict(ua_ok, vs={"gaveau": {"n": 4, "galat_log_median": 0.1}})))["dapat_dinilai"]["K2"] is False   # unit Gaveau < 5
    pk1 = putusan_entri(dict(ent_ok, uji_akhir=dict(ua_ok, k1_gfed5={"dapat_dinilai": False, "status": "tak_dapat_dinilai"})))
    assert pk1["K1"] is False and pk1["semua"] is False and pk1["dapat_dinilai"]["K1"] is False and pk1["K1_status"] == "tak_dapat_dinilai" and pk1["catatan"]
    assert putusan_entri(dict(ent_ok, uji_akhir=dict(ua_ok, k1_gfed5=dict(k1g_ok, lebih_baik=False))))["K1_status"] == "gagal"
    assert putusan_entri(dict(ent_ok, uji_akhir=dict(ua_ok, k1_gaveau=dict(k1v_ok, positif=False))))["K1"] is False        # positif vs GFED5 saja TIDAK cukup
    assert putusan_entri(dict(ent_ok, uji_akhir=dict(ua_ok, k1_gaveau={"dapat_dinilai": False})))["K1_status"] == "tak_dapat_dinilai"
    assert putusan_entri(dict(ent_ok, loyo={"cakupan": {"total": 0.95}}))["K3"] is False and putusan_entri(dict(ent_ok, loyo={"cakupan": {"total": 0.65}}))["K3"] is False
    assert putusan_entri(dict(ent_ok, uji_akhir=dict(ua_ok, cakupan={"el_nino": 0.6, "n_el_nino": 12})))["K3"] is False              # El Nino di bawah 0,7
    assert putusan_entri(dict(ent_ok, uji_akhir=dict(ua_ok, cakupan={"el_nino": 0.9, "n_el_nino": 5})))["dapat_dinilai"]["K3"] is False   # < 10 unit
    assert putusan_entri(dict(ent_ok, uji_akhir=dict(ua_ok, cakupan={"el_nino": None})))["K3"] is False
    # bootstrap blok tahun < 4 -> tak dapat dinilai, tanpa label CI
    bb_ = bootstrap_selisih({2015: 1.0, 2019: 1.0, 2020: 1.0})
    assert bb_["dapat_dinilai"] is False and bb_["status"] == "tak_dapat_dinilai" and "ci" not in bb_ and "lebih_baik" not in bb_
    ents = [{"boleh_dipilih": True, "model": "x", "loyo": {"skor_seleksi": 0.1, "skor_seleksi_n_tahun": 8, "tahun_seleksi_target": 8}, "lolos": {"semua": True}},
            {"boleh_dipilih": True, "model": "y", "loyo": {"skor_seleksi": 0.3, "skor_seleksi_n_tahun": 8, "tahun_seleksi_target": 8}, "lolos": {"semua": True}},
            {"boleh_dipilih": True, "model": "z", "loyo": {"skor_seleksi": 0.5, "skor_seleksi_n_tahun": 8, "tahun_seleksi_target": 8}, "lolos": {"semua": False}, "uji_akhir": {"k1_bootstrap": {"lebih_baik": False}}},
            {"boleh_dipilih": True, "model": "M0", "loyo": {"skor_seleksi": 0.9, "skor_seleksi_n_tahun": 8, "tahun_seleksi_target": 8}, "lolos": {"semua": True}},
            {"boleh_dipilih": False, "model": "g", "loyo": {"skor_seleksi": 0.99, "skor_seleksi_n_tahun": 8, "tahun_seleksi_target": 8}, "lolos": {"semua": True}}]
    tp, tb = pilih_model(ents)
    assert tp is None and tb["model"] == "z", (tp, tb)         # pemenang seleksi z gagal: TIDAK turun ke y (itu memilih dengan tahun uji akhir)
    assert n_kandidat(ents) == 3
    ents2 = [dict(e, lolos={"semua": e["model"] == "z"}, uji_akhir={"k1_bootstrap": {"lebih_baik": True}}) for e in ents]   # ubah SEMUA hasil tahun uji akhir
    tp2, tb2 = pilih_model(ents2)
    assert tb2["model"] == "z" and tp2["model"] == "z"          # pemenang tak berubah: seleksi tak membaca tahun uji akhir
    assert pilih_model([dict(ents[0], loyo=dict(ents[0]["loyo"], skor_seleksi=-0.1))]) == (None, None) and pilih_model([]) == (None, None)

    # H-A: kandidat dengan < 5 tahun seleksi tidak dapat menang, walau skor tertinggi; dilaporkan
    ents3 = ents + [{"boleh_dipilih": True, "model": "kurang_skor", "loyo": {"skor_seleksi": 0.8, "skor_seleksi_n_tahun": 4, "tahun_seleksi_target": 8}, "lolos": {"semua": True}},
                    {"boleh_dipilih": True, "model": "kurang_target", "loyo": {"skor_seleksi": 0.7, "skor_seleksi_n_tahun": 8, "tahun_seleksi_target": 3}, "lolos": {"semua": True}}]
    assert pilih_model(ents3)[1]["model"] == "z" and n_kandidat(ents3) == 3 and n_tahun_seleksi_kurang(ents3) == 2
    assert n_kandidat([dict(ents[0], loyo=dict(ents[0]["loyo"], skor_seleksi_n_tahun=5, tahun_seleksi_target=5))]) == 1      # tepat 5 = cukup
    assert pilih_model([ents3[-2]]) == (None, None)
    assert KRITERIA["pemilihan"]["min_tahun_seleksi"] == 5 and "3 tahun" in KRITERIA["pemilihan"]["min_tahun_seleksi_alasan"]

    # --- B8: kriteria di berkas terpisah, sha kanonik, jalan.jsonl append-only
    assert os.path.exists(KRITERIA_JALUR)
    mentah = open(KRITERIA_JALUR, encoding="utf-8").read()

    def terurut(o):
        if isinstance(o, list):
            return all(terurut(x) for x in o)
        if isinstance(o, dict):
            ks = list(o)
            return ks == sorted(ks) and all(terurut(v) for v in o.values())
        return True
    assert terurut(json.loads(mentah, object_pairs_hook=lambda ps: dict(ps))), "kunci berkas kriteria harus terurut"
    assert sha_kriteria() == hashlib.sha256(json.dumps(json.loads(mentah), sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")).hexdigest() and len(sha_kriteria()) == 64
    assert sha_kriteria({"a": 1, "b": 2}) == sha_kriteria({"b": 2, "a": 1}) != sha_kriteria({"a": 1, "b": 3})
    assert KRITERIA["keputusan"]["K2"]["galat_log_median_maks_rasio"] == 1.5 and KRITERIA["cakupan"]["rentang"] == [0.7, 0.9] and list(TAHUN_UJI_AKHIR) == [2015, 2018, 2019, 2020, 2021, 2023] and KRITERIA["bootstrap"]["min_blok_tahun"] == 4 and KRITERIA["tally"]["min_acuan_independen"] == 1 and KRITERIA["keputusan"]["K1"]["pembanding"] == "M0_terskala" and KRITERIA["acuan"]["catatan_independensi"]["gfed5"].startswith("semi-independen")
    assert KRITERIA["bootstrap"]["ulang"] >= 1000 and "alasan" in KRITERIA["keputusan"]["K2"] and KRITERIA["acuan"]["pembanding_wajib"] == "M0"
    assert MIN_TITIK_EVAL == KRITERIA["min_titik_eval"] and "MIN_EVAL_HA" not in globals(), "unit tidak boleh disaring dengan kebenaran (truth >= MIN_EVAL_HA)"
    jl = os.path.join(RAW, "uji", "jalan_uji.jsonl")
    os.makedirs(os.path.dirname(jl), exist_ok=True)
    if os.path.exists(jl):
        os.remove(jl)
    os.environ.pop("GITHUB_SHA", None)
    catat_jalan(baris_jalan("awal", "t0", "berjalan"), jl)
    sat = open(jl).read()
    os.environ["GITHUB_SHA"] = "abc123def"
    try:
        catat_jalan(baris_jalan("akhir", "t0", "sebagian", "tidak ada model terpilih"), jl)
        catat_jalan(baris_jalan("awal", "t1", "berjalan"), jl)
    finally:
        del os.environ["GITHUB_SHA"]
    ls_ = [json.loads(x) for x in open(jl).read().splitlines()]
    assert open(jl).read().startswith(sat) and len(ls_) == 3, "append-only: baris lama tak boleh berubah"
    assert ls_[0]["git_commit"] is None and ls_[1]["git_commit"] == "abc123def" and ls_[1]["vonis"] == "tidak ada model terpilih"
    assert all(x["skrip"] == "lab_luas.py" and x["kriteria_sha"] == sha_kriteria() and x["waktu"] for x in ls_) and ls_[0]["fase"] == "awal" and ls_[1]["fase"] == "akhir" and "vonis" not in ls_[0]
    os.remove(jl)

    # --- pipeline sintetis ujung ke ujung: dunia dengan hukum ha = 3,0 x px_tol^1,0 + bising kecil
    rng = random.Random(11)
    grups = ["62", "16", "61", "15", "14", "64", "13", "12"]
    cache_s, gw_s, sip_s, ha_s = {}, {g: {} for g in grups}, {g: {} for g in grups}, {g: {} for g in grups}
    for y in range(2012, 2026):
        e = {"prov": {}, "n_total": 0}
        for g in grups:
            px = int(math.exp(rng.uniform(4, 9)))
            ptol = int(px * rng.uniform(0.3, 1.0))      # rasio piksel toleran/unik bervariasi: M0 (titik) meleset tak seragam, M2 (px_tol) tidak
            f = {"n": px * 2, "n0": 0, "n1": px, "n2": px, "n_nh": px * 2, "px": px, "px_tol": ptol, "ncl": px // 5, "nfs": px // 10, "cl_med": 3.0, "cl_p90": 20.0,
                 "cl_p100": 0.02, "pxcl100": 0.3, "frp": px * 10.0, "frp_px": 10.0, "malam": 0.2, "dur_med": 2.0, "dur_p90": 6.0, "hari": 60, "gb": rng.random(), "ks": 0.1, "ht": 0.3}
            for k in KLS_KEYS:
                f[k] = 0
            f["k0l"], f["k2h"] = px // 5, px // 20
            e["prov"][g] = f
            ha = 3.0 * f["px_tol"] * math.exp(rng.gauss(0, 0.1))
            ha_s[g][y] = ha
            gw_s[g][y] = ha / 2.3 * math.exp(rng.gauss(0, 0.05))
            sip_s[g][y] = ha * 0.7 if y >= 2018 else None
        cache_s["N|%d" % y] = e
    sip_s = {g: {y: v for y, v in d.items() if v} for g, d in sip_s.items()}
    gav_s = {g: ha_s[g][2019] for g in grups}
    gfe_s = {g: {y: ha_s[g][y] for y in (2015, 2018, 2019, 2020)} for g in grups}
    ref_s = {"sipongi": sip_s, "gwis": gw_s, "gaveau": gav_s, "gfed5": gfe_s}
    oni_s = {y: 0.0 for y in range(2001, 2027)}
    oni_s.update({2015: 2.0, 2019: 0.6, 2023: 1.2})
    kov_s = {"oni_jas": oni_s, "oni_aso": {}, "dmi": {}, "hujan": {}, "luas_km2": {}}
    ctx_s = {"seri": "N", "faktor_setara": 1.0, "oni_jas": oni_s}
    baris_s = rakit_baris("N", cache_s, {}, kov_s, 2012, 2025)
    assert len(baris_s) == 14 * 8
    hs, ps, inf = evaluasi_seri("N", baris_s, ref_s, ctx_s)
    assert len(hs) == 6 * 4 and inf["uji_akhir"] == [2015, 2018, 2019, 2020, 2021, 2023]       # 5 model + M0_terskala, x 4 acuan latih
    by = {(e["model"], e["acuan_latih"]): e for e in hs}
    # H3: LOYO tidak menyentuh tahun uji akhir; prediksi uji akhir hanya pada tahun itu
    for (nm, ac), e in by.items():
        if ac == "gaveau":
            continue
        assert not {k[1] for k in ps[("N", nm, ac, "loyo")]} & set(TAHUN_UJI_AKHIR), "LOYO memakai tahun uji akhir"
        assert {k[1] for k in ps[("N", nm, ac, "uji_akhir")]} == set(TAHUN_UJI_AKHIR)
    # B1(b): tiap model dilaporkan terhadap acuan yang ada sekaligus, M0 yang sama
    m2g = by[("M2", "gwis")]
    assert set(m2g["uji_akhir"]["vs"]) == {"sipongi", "gwis", "gaveau", "gfed5"} and set(m2g["loyo"]["vs"]) >= {"sipongi", "gwis"}
    assert m2g["uji_akhir"]["vs"]["gaveau"]["n"] == 8 and "vs_m0_mentah" in m2g["uji_akhir"] and "n_acuan_nol" in m2g["loyo"]["vs"]["gwis"]
    assert by[("M0", "gwis")]["uji_akhir"]["vs"]["gaveau"]["galat_log_median"] > 1.0         # M0 (4,3 x titik) jauh meleset di dunia ini
    # model berlatih pada GWIS (ha/2,3) dan dinilai terhadap Gaveau (= ha): galat log ~ ln 2,3 = 0,83, M0 ~ ln 3,6 = 1,28; 1 blok tahun Gaveau saja -> bootstrap tak dapat dinilai
    assert 0.6 < m2g["uji_akhir"]["vs"]["gaveau"]["galat_log_median"] < 1.0 and m2g["uji_akhir"]["vs_m0_terskala"]["gaveau"]["dapat_dinilai"] is False
    g_ = by[("M2", "gabungan")]
    assert g_["uji_akhir"]["vs"]["gaveau"]["galat_log_median"] < 0.3 and 0.7 < g_["loyo"]["vs"]["gwis"]["galat_log_median"] < 1.0     # gabungan = GWIS x 2,33: dekat Gaveau, jauh dari GWIS (tak dinilai akurat vs GWIS)
    # K1 (vs M0_terskala): GFED5 pada 2015/2018/2019/2020 = 4 blok tahun; Gaveau 2019 satu tahun tanpa CI
    k1g = g_["uji_akhir"]["k1_gfed5"]
    assert k1g["dapat_dinilai"] and k1g["n_tahun"] == 4 and k1g["lebih_baik"] and k1g["ci"][0] > 0, k1g
    assert g_["uji_akhir"]["k1_gaveau"]["dapat_dinilai"] and g_["uji_akhir"]["k1_gaveau"]["positif"] and g_["uji_akhir"]["k1_gaveau"]["n_tahun"] == 1
    assert g_["lolos"]["K1"] and g_["lolos"]["K2"] and g_["lolos"]["K1_status"] == "lolos"
    # M0_terskala dilaporkan sebagai pembanding (bukan kandidat), lebih baik dari M0 mentah di dunia ini
    ms = by[("M0_terskala", "gabungan")]
    assert not ms["boleh_dipilih"] and ms["uji_akhir"]["vs"]["gaveau"]["galat_log_median"] < by[("M0", "gabungan")]["uji_akhir"]["vs"]["gaveau"]["galat_log_median"]
    assert g_["loyo"]["cakupan"]["n"] > 0 and g_["uji_akhir"]["cakupan"]["n_el_nino"] == 24
    # mata uang seleksi SAMA untuk semua kandidat: skor = selisih vs target gabungan (prior), bukan target latih sendiri
    mu_ = tabel_target("gabungan", {**ref_s, "gaveau": None}, bangun_koreksi(gw_s, None, tanpa_gaveau=True))
    for (nm_, ac_), e_ in by.items():
        if e_["boleh_dipilih"] and nm_ != "M0":
            _anggota(e_["loyo"]["skor_seleksi"], _rata(selisih_tahun(ps[("N", nm_, ac_, "loyo")], ps[("N", "M0_terskala", ac_, "loyo")], mu_, inf["titik"])), 1e-9, "mata uang seleksi")
            assert e_["loyo"]["skor_seleksi_mata_uang"] == "gabungan_prior_literatur"
    assert KRITERIA["pemilihan"]["seleksi_mata_uang"] == "gabungan_prior_literatur" and KRITERIA["pemilihan"]["seleksi_mata_uang_alasan"]
    assert g_["loyo"]["skor_seleksi"] > 0.05 and by[("M2", "gabungan")]["loyo"]["skor_seleksi_n_tahun"] == 8
    assert not by[("M2", "gaveau")]["boleh_dipilih"] and "lolos" not in by[("M2", "gaveau")]
    terp, pem = pilih_model(hs)
    assert pem is not None and pem["boleh_dipilih"] and pem["loyo"]["skor_seleksi"] == max(e["loyo"]["skor_seleksi"] for e in hs if e["boleh_dipilih"] and e["model"] != "M0")
    # sipongi: target hanya 2022, 2024, 2025 di tahun seleksi (3 < 5) -> tak dapat menang; gwis & gabungan 8 tahun
    assert by[("M2", "sipongi")]["loyo"]["status_seleksi"] == "tahun seleksi kurang" and by[("M2", "sipongi")]["loyo"]["tahun_seleksi_target"] == 3
    assert by[("M2", "gwis")]["loyo"]["status_seleksi"] == "memenuhi" and by[("M2", "gwis")]["loyo"]["tahun_seleksi_target"] == 8
    assert n_kandidat(hs) == 8 and n_tahun_seleksi_kurang(hs) == 4 and pem["acuan_latih"] != "sipongi" and pem["model"] != "M0_terskala"
    # S-C: tak satu pun baris latih lipatan uji akhir berasal dari tahun uji akhir
    ua_f = lipat_uji_akhir(baris_s, inf["latih"]["gabungan"], inf["uji_akhir"])[0]
    assert ua_f["latih"] and all(t.y not in TAHUN_UJI_AKHIR for t in ua_f["latih"]) and ua_f["tahun_latih"].isdisjoint(TAHUN_UJI_AKHIR)
    # pemenang seleksi tak berubah bila SEMUA acuan di tahun uji akhir diganti sampah (seleksi tak membaca tahun uji akhir)
    ref_x = {"sipongi": sip_s, "gaveau": {g: 1e8 for g in grups}, "gfed5": {g: {y: 1e8 for y in (2015, 2018, 2019, 2020)} for g in grups},
             "gwis": {g: {y: (v * 50 if y in TAHUN_UJI_AKHIR else v) for y, v in d.items()} for g, d in gw_s.items()}}
    MODEL_ASLI = list(MODEL)
    MODEL[:] = ["M0", "M2"]
    try:
        hx, _, _ = evaluasi_seri("N", baris_s, ref_x, ctx_s)
        hy, _, _ = evaluasi_seri("N", baris_s, ref_s, ctx_s)
    finally:
        MODEL[:] = MODEL_ASLI
    sx = {(e["model"], e["acuan_latih"]): e["loyo"]["skor_seleksi"] for e in hx if e["boleh_dipilih"] and e["model"] != "M0"}
    sy = {(e["model"], e["acuan_latih"]): e["loyo"]["skor_seleksi"] for e in hy if e["boleh_dipilih"] and e["model"] != "M0"}
    assert sx == sy and sx, "skor seleksi bergantung pada acuan tahun uji akhir (bocor)"
    assert pilih_model(hx)[1]["acuan_latih"] == pilih_model(hy)[1]["acuan_latih"]
    pu = prediksi_unit(by[("M2", "gabungan")], baris_s, ref_s, ctx_s, ps, inf)
    assert pu and all(v["p10"] <= v["p50"] <= v["p90"] for v in pu.values())
    assert {v["asal"] for k, v in pu.items() if k[1] in (2015, 2019)} == {"uji_akhir"} and {v["asal"] for k, v in pu.items() if k[1] == 2017} == {"LOYO"}
    assert all(v["mentah"] > 0 for v in pu.values())
    # H12: selang 'gabungan' dilebarkan omisi; 'gwis' tidak -> rasio p90/p10 gabungan > rasio tanpa omisi
    pu0 = prediksi_unit(by[("M2", "gabungan")], baris_s, ref_s, ctx_s, ps, dict(inf, omisi_sd=0.0))
    kk = ("62", 2017)
    assert inf["omisi_sd"] >= 0.09 and kk in pu and kk in pu0
    _anggota(math.log(pu[kk]["p90"] / pu[kk]["p10"]) - math.log(pu0[kk]["p90"] / pu0[kk]["p10"]), 2 * 1.2816 * inf["omisi_sd"], 1e-6)
    _anggota(pu[kk]["p50"], pu0[kk]["p50"], 1e-9)
    tabel = bangun_tabel(cache_s, {"N": pu}, ref_s, kov_s, None, kov_s["oni_jas"], "N", "M2", model_lolos=True)
    r19 = [r for r in tabel["nasional"] if r["tahun"] == 2019][0]
    r15 = [r for r in tabel["nasional"] if r["tahun"] == 2015][0]
    assert r19["acuan"]["gaveau"] == round(sum(gav_s.values())) and r19["luas_model"] and r19["hotspot"]["N"] > 0 and r19["firespot_R0"] > 0
    assert [r["tahun"] for r in tabel["nasional"]] == TAHUN_TABEL and r19["acuan"]["sipongi"] is not None
    assert tabel["nasional"][0]["luas_model"] is None            # 2001: tak ada fitur
    assert r19["status"] == "dapat_dinilai" and r19["n_acuan_independen"] == 2 and r19["cocok"] is True and r19["label_acuan"] == "gaveau+gfed5", r19      # gaveau + gfed5 ada pada 2019
    assert r15["status"] == "dapat_dinilai" and r15["label_acuan"] == "gfed5 semi-independen" and r15["n_acuan_independen"] == 1 and r15["cocok"] is True       # 2015 hanya gfed5
    r17 = [r for r in tabel["nasional"] if r["tahun"] == 2017][0]
    assert r17["status"] == "tak_dapat_dinilai" and r17["cocok"] is None and r17["label_acuan"] == "tak_dapat_dinilai"
    assert r19["model_lolos"] is True and tabel["model_lolos"] is True and r19["luas_model_mentah"] > 0 and r19["rasio_p50_vs_mentah"] > 0
    assert all("model_lolos" in r for g_pv in tabel["prov"].values() for r in g_pv["baris"])
    assert tabel["nasional"][10]["status"] == "tanpa_model" and tabel["nasional"][10]["cocok"] is None
    ukk = tabel["uji_kekuatan"]
    assert ukk["tahun_dinilai"] == [2015, 2018, 2019, 2020] and set(ukk["deteksi"]) == {"0.5", "2.0"} and ukk["tingkat_lolos_m0"] == 0.0 and ukk["tingkat_lolos_model"] == 1.0, ukk   # M0 jauh di luar pita
    assert ukk["tally_tak_berdaya"] is True and ukk["label_daya"] == "tally tak berdaya"       # 4 tahun dinilai < 5
    assert "SATU bukti" in tabel["catatan_tally"] and "semi-independen" in tabel["catatan_tally"]
    # S22: faktor efektif (ha per piksel unik): ha = 2,4 x px (px_tol = 0,8 px, hukum 3,0 x px_tol)
    hp = ha_per_piksel(pu, cache_s, "N")
    assert 1.0 < hp["nasional"] < 3.5 and set(hp["prov"]) == set(grups) and all(1.0 < v < 3.5 for v in hp["prov"].values()) and hp["seri"] == "N" and "ha_per_piksel" not in hp
    assert ha_per_piksel({}, cache_s, "N") is None
    # susun_hasil ujung ke ujung (hanya M0 & M2): kunci ha_per_piksel hanya muncul bila ada model terpilih; JSON dapat ditulis; kriteria_sha tercatat
    MODEL[:] = ["M0", "M2"]
    try:
        Jt = susun_hasil(cache_s, ref_s, kov_s, {}, Anggaran(50), {}, {}, [], "2026-01-01T00:00:00+00:00", None)
    finally:
        MODEL[:] = MODEL_ASLI
    assert Jt["kriteria_sha"] == sha_kriteria() and Jt["n_kandidat"] == 2 and Jt["n_kandidat_tahun_seleksi_kurang"] == 1 and Jt["model_lolos"] == bool(Jt["terpilih"]) and Jt["tabel"]["model_lolos"] == Jt["model_lolos"] and Jt["vonis"] and "selang_ket" in Jt and "bukan luas sebenarnya" in Jt["selang_ket"]
    assert ("ha_per_piksel" in Jt) == bool(Jt["terpilih"]) and (Jt["terpilih"] is not None or Jt.get("ha_per_piksel_tersedia") is False)
    if Jt["terpilih"]:
        assert isinstance(Jt["ha_per_piksel"], float) and Jt["ha_per_piksel_detail"]["prov"]
    else:
        assert "ha_per_piksel" not in Jt and "ha_per_piksel_kandidat" in Jt
    tj = os.path.join(RAW, "uji", "luas_uji.json")
    simpan_json(tj, Jt)
    assert json.load(open(tj))["kriteria_sha"] == sha_kriteria()
    os.remove(tj)
    md = tulis_md(dict(Jt, tabel=tabel))
    assert "| 2019 |" in md and "Uji kekuatan" in md and "kriteria_sha" in md
    assert tulis_md({"status": "uji", "dibuat": "x", "model": hs, "terpilih": None, "terbaik_tak_lolos": pem, "tabel": tabel, "jujur": JUJUR, "belum_dikerjakan": ["x"], "n_kandidat": 12})
    assert "Belum dikerjakan" in tulis_md({"status": "uji", "dibuat": "x", "model": hs, "terpilih": None, "tabel": tabel, "jujur": JUJUR, "belum_dikerjakan": ["x"]})
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
