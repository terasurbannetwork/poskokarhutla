"""Insiden api: ID stabil lintas putaran + front, titik masuk, radius, luas jujur, tren (Fase 1, butir 1.1 sampai 1.4 RANCANGAN-API-PADAM.md).

ID kompleks (K0001...) dinomori ulang tiap putaran dan tidak boleh dipakai sebagai identitas api. Di sini tiap kompleks level >= 2 dicocokkan ke insiden
yang sudah ada lewat kedekatan geometri, meniru pelacakan kejadian NASA FEDS/fireatlas (Chen dkk. 2022; Indradjad dkk. 2024): api yang bersambung
dengan api kemarin = kejadian yang sama.

Aturan pencocokan (satu komponen terhubung = satu insiden):
  tepi (kompleks-insiden dan kompleks-kompleks) bila jarak terdekat antar titik/simpul <= JARAK_KM (0,6 = eps DBSCAN harian.py untuk piksel VIIRS), ATAU titik salah satunya
  jatuh di dalam garis luar yang lain (tumpang tindih). Satu komponen yang menyentuh beberapa insiden lama: yang TERTUA menang, sisanya jadi
  rekaman `gabung` (ke: id pemenang) selama SIMPAN_HARI supaya tugas/laporan lama bisa ditautkan. Komponen tanpa insiden lama dan berisi kompleks
  teramati (<= 24 jam) = insiden baru; kompleks tak teramati tidak melahirkan insiden, hanya melanjutkan yang ada.
  ID: <kode prov>-<yymmdd WIB deteksi pertama>-<urut 3 digit>, urut per (prov, tanggal).
Tak terdeteksi: aktif selama masih ada kompleks yang cocok ATAU deteksi terakhir <= PADAM_HARI lalu (kompleks gambut kering dipertahankan harian.py 168 jam
sebagai bara, jadi insiden ikut hidup selama kompleksnya ada). Rekaman disimpan SIMPAN_HARI hari; api yang menyala lagi dalam BUKA_HARI hari (BUKA_GAMBUT_HARI untuk gambut)
membuka insiden itu kembali (bukan insiden baru).

Front (butir 0.5/1.2): deteksi terbaru dari hotspot24.json (48 jam, ditetapkan ke kompleks lewat dalam-garis-luar atau <= 1 km dari titiknya),
terpanas (FRP) bila waktunya sama. Hanya keyakinan nominal/tinggi. `masuk` = titik jalan (OSM trunk..tertiary), sungai besar, atau kanal terdekat
dari front, GARIS LURUS (bukan rute), maksimum 25 km; rute nyata ada di akses.json/Fase 3.
Radius (1.3): ketidakpastian lokasi = ukuran piksel nominal sensor. Piksel VIIRS menggembung ke ~0,8 km di tepi sapuan dan FIRMS NRT hanya menyimpan
scan/track di CSV mentah (hotspot24.json tidak membawanya), jadi radius ini batas bawah.

Ukuran (1.4). Luas garis luar piksel (`luas`) menyesatkan: satu piksel 375 m = 14,06 ha padahal yang terbakar di dalamnya umumnya jauh lebih kecil (R11).
`luas_koreksi` = JUMLAH DETEKSI kumulatif insiden x ha per deteksi, sepadan satuannya dengan faktor. Faktor per provinsi = luas_resmi.json (KLHK SiPongi, ha) dibagi
jumlah deteksi VIIRS S-NPP keyakinan nominal/tinggi di sejarah.json per tahun; faktor = median, rentang = p10 sampai p90 antartahun (kisaran antartahun,
satu api bisa di luarnya). Deteksi insiden dihitung dengan filter SAMA PERSIS (sensor "N", keyakinan >= nominal) dari hotspot24.json, hanya yang lebih baru
dari `det_t` (waktu deteksi terakhir yang sudah dihitung), jadi tak dihitung dua kali; insiden baru/dari status lama mulai dari 48 jam yang tersedia dan
`dasar` menyebut "dihitung sejak ...". Penyaring tahun: >= 2020 (2018-19 SiPongi tak mencatat Papua dkk.), SiPongi >= 50 ha, rasio ha/(deteksi x 14,0625) >= 0,01;
provinsi dengan < 5 tahun, median rasio di luar [0,05; 1], atau p75/p25 > 3 jatuh ke median nasional. Pembanding luas_satelit.json (GWIS MCD64A1) hanya informasi.
S-NPP berhenti didistribusikan 1 Nov 2026: sensor acuan putaran = "N" bila ada deteksi N dalam 24 jam terakhir, selain itu "N20" dibagi RASIO_N20_N (= firms_sumber.RASIO_N20_N_LOKAL 0,89, median jendela 3x3 sel 0,05 derajat, IQR 0,72-1,07: satuan yang sama dengan deteksi per insiden; setara N); akumulasi tetap lewat det_t sehingga pergantian tak menggandakan.
ASUMSI tak teruji: rasio musiman SiPongi/deteksi berlaku untuk satu api; SiPongi sendiri indikasi dari titik panas, bukan citra. Perkiraan perencanaan, bukan luas
terverifikasi (Fase 3.5, dNBR).
`luas_aktif` = piksel VIIRS unik berumur <= 12 jam, dihitung per sensor lalu diambil terbanyak, x 14,0625 ha, TANPA faktor: batas bawah luas piksel menyala (tepi sapuan lebih besar), bukan luas terbakar. Hanya-MODIS = tidak diisi.
`tren` hanya N20+N21 (himpunan konstan; S-NPP berhenti tak menimbulkan \"menyusut\" palsu); "tumbuh/menyusut" hanya bila max(n24, kemarin) >= 4, selain itu "sedikit".
Status: aktif | tak_terdeteksi (bukan "padam": tak terdeteksi satelit tidak membuktikan api padam) | gabung. Gambut dibuka kembali sampai 10 hari, lainnya 3.

Berkas:
  public/data/insiden.json          (status bergulir lewat cache `data-` titik.yml; hilang/rusak = mulai ulang tanpa crash)
  public/data/tugas_kompleks.json   (disisipi kunci insiden, front, masuk, radius_m, luas_aktif, luas_koreksi, tren per entri, kunci lain utuh)
Membaca: tugas_kompleks.json, kluster.json, hotspot24.json, jalan.geojson, kanal.json, luas_resmi.json, luas_satelit.json, sejarah.json.

Pakai:  python3 scripts/data/insiden.py         # jalan sesudah harian.py/taktik.py
        python3 scripts/data/insiden.py --uji   # self-check
"""
import collections, datetime as dt, json, math, os, statistics, sys, tempfile

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR  # noqa: E402
from firms_sumber import RASIO_N20_N_LOKAL as RASIO_N20_N, RASIO_N20_N_LOKAL_IQR, rasio_teks  # noqa: E402  (rasio terukur per satuan jendela lokal; laporan.py memakai RASIO_N20_N harian)
from kendala import Indeks, JALAN_KELAS, km  # noqa: E402  (indeks ruang jalan/sungai/kanal yang sama dengan kendala.json)

DATA = os.environ.get("INSIDEN_DATA") or os.path.join(AKAR, "public/data")
WIB = dt.timezone(dt.timedelta(hours=7))
UTC = dt.timezone.utc

# ---- parameter (ikut ditulis ke insiden.json `parameter`) ----
JARAK_KM = 0.6       # celah antar simpul garis luar/titik <= ini = satu api. 0,6 km = eps DBSCAN harian.py untuk piksel VIIRS (min(1,5; max(0,6; 1,5 x px))); 1,5 menyatukan 22% kompleks yang sengaja dipisah harian.py
PADAM_HARI = 3       # tanpa deteksi dan tanpa kompleks cocok: padam. = AKTIF_JAM 72 jam harian.py (non-gambut)
SIMPAN_HARI = 14     # rekaman padam/gabung disimpan (RANCANGAN bagian 7)
BUKA_HARI = 3        # api menyala lagi dalam jendela ini membuka insiden tak_terdeteksi kembali
BUKA_GAMBUT_HARI = 10  # gambut: bara bisa tak terdeteksi berhari-hari di bawah awan/asap (harian.py mempertahankan kompleks gambut kering 7 hari)
RIWAYAT_MAKS = 40    # putaran per insiden (RANCANGAN bagian 7)
MAKS_BYTES = 4_500_000  # batas insiden.json; kelebihan: riwayat insiden level 2 dipangkas dulu
SEGAR_JAM = 12       # piksel "aktif" (butir 1.4)
TETAP_KM = 1.0       # titik panas dianggap milik kompleks bila <= segini dari titiknya (di luar garis luar)
CARI_MASUK_KM = 25.0  # = kendala.AMBANG cari_maks_km
GARIS_TITIK = 24     # simpul per cincin garis luar ringkas (maks 2 cincin)
RADIUS_M = {         # ukuran piksel nominal. VIIRS I-band 375 m (Schroeder dkk. 2014, RSE 143:85); MODIS 1 km (Giglio dkk. 2016, RSE 178:31);
    "N": 375, "N20": 375, "N21": 375, "M": 1000,   # Himawari-9 AHI 2 km (JAXA P-Tree WLF; sel 2 km di taktik.py/himawari.json), dipakai Fase 2.
    "H": 2000,
}
PIKSEL_HA = {"N": 14.0625, "N20": 14.0625, "N21": 14.0625, "M": 100.0}   # 0,375^2 x 100; 1,0^2 x 100
VIIRS = {"N", "N20", "N21"}
TREN_SENSOR = {"N20", "N21"}
SEL_PIKSEL = {"N": 0.0034, "N20": 0.0034, "N21": 0.0034, "M": 0.009}      # derajat ~ satu piksel, kunci piksel unik
MIN_PX = 30          # tahun dengan < 30 piksel VIIRS (421 ha) terlalu bising untuk rasio
N_MIN = 5            # tahun terpakai minimum agar provinsi memakai faktornya sendiri (asumsi platform)
ARAH_NISBAH, ARAH_MIN_TITIK = 0.25, 4   # tumbuh/menyusut bila selisih >= 25% kemarin DAN max(n24, kemarin) >= 4 titik VIIRS; selain itu "sedikit" (asumsi platform)
TAHUN_MIN, RESMI_MIN_HA, RASIO_MIN = 2020, 50, 0.01   # 2018-19: SiPongi tak mencatat Papua dkk. (artefak); SiPongi < 50 ha atau rasio < 0,01 = bising
# S-NPP ("N") berhenti didistribusikan 1 Nov 2026 (firms_sumber.SNPP_AKHIR). Sesudahnya acuan hitung deteksi = "N20" dikonversi ke setara N dengan membagi RASIO_N20_N.
# Rasio dan selangnya diukur dan dipilih scripts/data/rasio_n20_n.py pada jendela lokal 3x3 sel 0,05 derajat (insiden = sekumpulan kompleks berdekatan, bukan total nasional): median jendela
# Oktober 0,83 (4.458 jendela ber-N >= 50, 12 hari laporan tanpa celah sensor) digeser ke level jangka panjang (x1,07 = harian 0,97 / Oktober 0,91 dari Agu+Sep) = 0,89, IQR 0,72-1,07.
# Angka nasional harian (0,97) milik laporan.py. Keduanya terpusat di firms_sumber.py (RASIO_DASAR menyimpan masukannya).
# ASUMSI: deteksi per lintasan kedua satelit setara (orbit satu rangkaian JPSS, selisih ~50 menit). Satu insiden bisa meleset sebesar IQR itu.
RASIO_BATAS, KUARTIL_MAKS = (0.05, 1.0), 3.0          # provinsi di luar ini jatuh ke nasional
PARAMETER = {"jarak_km": JARAK_KM, "padam_hari": PADAM_HARI, "simpan_hari": SIMPAN_HARI, "buka_hari": BUKA_HARI, "riwayat_maks": RIWAYAT_MAKS,
             "segar_jam": SEGAR_JAM, "radius_m": RADIUS_M, "piksel_ha": PIKSEL_HA, "min_px": MIN_PX, "n_min": N_MIN,
             "arah": {"nisbah": ARAH_NISBAH, "min_titik": ARAH_MIN_TITIK}, "rasio_n20_n": RASIO_N20_N, "rasio_n20_n_iqr": list(RASIO_N20_N_LOKAL_IQR), "buka_gambut_hari": BUKA_GAMBUT_HARI, "tahun_min": TAHUN_MIN}


# ---- waktu ----
def baca_t(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(UTC)


def mnt(t):
    """Bulatkan ke menit terdekat: acq_time FIRMS berresolusi menit, sedangkan acuan + jam (jam dibulatkan 0,01 = 36 dtk) bergeser puluhan detik antar putaran."""
    return (t + dt.timedelta(seconds=30)).replace(second=0, microsecond=0)


def fmt(t):
    return t.astimezone(UTC).strftime("%Y-%m-%dT%H:%MZ")


# ---- geometri ----
def cincin(geom):
    """Cincin luar [(lon, lat)] tiap bagian Polygon/MultiPolygon; Point -> []."""
    if not geom or geom.get("type") not in ("Polygon", "MultiPolygon"):
        return []
    bagian = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    return [[(p[0], p[1]) for p in b[0]] for b in bagian if b and b[0]]


def tipis(r, n):
    if len(r) <= n:
        return list(r)
    return [r[i * len(r) // n] for i in range(n)]


def pip(x, y, r):
    c, j = False, len(r) - 1
    for i in range(len(r)):
        xi, yi, xj, yj = r[i][0], r[i][1], r[j][0], r[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def didalam(lat, lon, rings):
    return any(pip(lon, lat, r) for r in rings)


def kotak(rings, pts, m=0.0):
    la = [p[1] for r in rings for p in r] + [p[0] for p in pts]
    lo = [p[0] for r in rings for p in r] + [p[1] for p in pts]
    return min(la) - m, max(la) + m, min(lo) - m, max(lo) + m


class Kisi:
    """Indeks sel derajat: sel -> [(lat, lon, nilai)]."""
    def __init__(self, s=0.02):
        self.s, self.sel = s, collections.defaultdict(list)

    def c(self, lat, lon):
        return math.floor(lat / self.s), math.floor(lon / self.s)

    def tambah(self, lat, lon, v):
        self.sel[self.c(lat, lon)].append((lat, lon, v))

    def dekat(self, lat, lon, r_km):
        """Nilai yang titiknya <= r_km (r_km <= lebar sel ~2,2 km, jadi 3x3 sel cukup)."""
        gy, gx = self.c(lat, lon)
        for y in range(gy - 1, gy + 2):
            for x in range(gx - 1, gx + 2):
                for la, lo, v in self.sel.get((y, x), ()):
                    if km(lat, lon, la, lo) <= r_km:
                        yield v

    def kotak(self, a, b, c, d):
        """Semua (lat, lon, nilai) di sel yang menyentuh kotak lat a..b, lon c..d."""
        (y0, x0), (y1, x1) = self.c(a, c), self.c(b, d)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                yield from self.sel.get((y, x), ())


# ---- kompleks ----
def titik_k(c):
    """Titik pencocokan kompleks [(lat, lon)]: simpul garis luar (<= GARIS_TITIK per cincin), 12 titik api24 (sampel merata), pusat; dibulatkan 3 desimal."""
    pts = [(p[1], p[0]) for r in c["cincin"] for p in tipis(r, GARIS_TITIK)] + tipis(c["api"], 12) + [(c["lat"], c["lon"])]
    return [(round(la, 3), round(lo, 3)) for la, lo in pts]   # sama persis dengan yang disimpan di insiden: pencocokan tak goyah antar putaran


def dari_fitur(f):
    p = f["properties"]
    return {"id": p["id"], "lat": p["lat"], "lon": p["lon"], "level": p.get("level", 0), "teramati": bool(p.get("teramati")),
            "n24": p.get("n24", 0), "px24": p.get("px24", 0), "luas": p.get("luas") or 0, "prov": p.get("prov"), "kab": p.get("kab"),
            "kec": p.get("kec"), "awal": p["awal"], "akhir": p["akhir"], "cincin": cincin(f.get("geometry")),
            "api": [(a[1], a[0]) for a in (p.get("api24") or [])], "gambut": bool(p.get("gambut"))}


def tetapkan(ks, baris):
    """Titik panas -> kompleks. baris: [(lat, lon, jam, sensor, frp, yakin)]. Hasil {id kompleks: [baris]}.
    ponytail: bukan titik yang sudah dikelompokkan harian.py (kluster.json tak menyimpan keanggotaan titik); dalam-garis-luar atau <= TETAP_KM."""
    reg, info = collections.defaultdict(list), {}
    for c in ks:
        pts = titik_k(c)
        a, b, lo, hi = kotak(c["cincin"], pts, 0.012)
        info[c["id"]] = (pts, c["cincin"])
        for y in range(math.floor(a / 0.05), math.floor(b / 0.05) + 1):
            for x in range(math.floor(lo / 0.05), math.floor(hi / 0.05) + 1):
                reg[(y, x)].append(c["id"])
    hasil = collections.defaultdict(list)
    for h in baris:
        for kid in reg.get((math.floor(h[0] / 0.05), math.floor(h[1] / 0.05)), ()):
            pts, rings = info[kid]
            if (rings and didalam(h[0], h[1], rings)) or any(km(h[0], h[1], p[0], p[1]) <= TETAP_KM for p in pts):
                hasil[kid].append(h)
                break
    return hasil


# ---- faktor luas ----
def faktor_luas(sejarah, resmi, satelit=None):
    """{'prov': {kode: {...}}, 'nasional': {...}} atau None bila bahan tak ada. Satuan `faktor`/`p10`/`p90` = ha SiPongi per DETEKSI VIIRS S-NPP
    (keyakinan nominal/tinggi, sama dengan sejarah.json). `rasio` = faktor / 14,0625 (dipakai gerbang). Lihat docstring modul."""
    if not sejarah or not resmi or not resmi.get("ha"):
        return None
    rasio, tahun_ok = {}, {}
    sampai = resmi.get("sampai", {})
    for p, ha in resmi["ha"].items():
        for i, y in enumerate(resmi["tahun"]):
            m = (sejarah.get(p) or {}).get(y)
            if int(y) < TAHUN_MIN or not m or not ha[i] or ha[i] < RESMI_MIN_HA:
                continue
            n = sum(m[:int(sampai[y][5:7])]) if y in sampai else sum(m)
            if n >= MIN_PX and ha[i] / (n * PIKSEL_HA["N"]) >= RASIO_MIN:
                rasio.setdefault(p, []).append(ha[i] / (n * PIKSEL_HA["N"]))
                tahun_ok.setdefault(p, []).append(y)

    def ringkas(r):
        q4 = statistics.quantiles(r, n=4, method="inclusive") if len(r) >= 2 else [r[0]] * 3
        q10 = statistics.quantiles(r, n=10, method="inclusive") if len(r) >= 2 else [r[0]] * 9
        u = PIKSEL_HA["N"]
        return {"faktor": statistics.median(r) * u, "p10": q10[0] * u, "p90": q10[8] * u, "rasio": statistics.median(r), "q": q4[2] / q4[0] if q4[0] else 99, "n": len(r)}
    semua = [x for r in rasio.values() for x in r]
    if not semua:
        return None
    nas = ringkas(semua)
    nas["dasar"] = "SiPongi/VIIRS nasional n=%d prov-tahun, kisaran antartahun p10-p90; satu api bisa di luarnya" % nas["n"]
    out = {}
    for p in resmi["ha"]:
        r = rasio.get(p, [])
        e = ringkas(r) if len(r) >= N_MIN else None
        if e and RASIO_BATAS[0] <= e["rasio"] <= RASIO_BATAS[1] and e["q"] <= KUARTIL_MAKS:
            e["dasar"] = "SiPongi/VIIRS prov %s n=%d tahun, kisaran antartahun p10-p90; satu api bisa di luarnya" % (p, e["n"])
            e["tahun"] = tahun_ok[p]
        else:
            alasan = "hanya %d tahun" % len(r) if not e else "median %.2f di luar %s" % (e["rasio"], RASIO_BATAS) if not RASIO_BATAS[0] <= e["rasio"] <= RASIO_BATAS[1] else "sebaran kuartil %.1fx" % e["q"]
            e = dict(nas, dasar="SiPongi/VIIRS nasional n=%d prov-tahun, p10-p90 antartahun (prov %s: %s)" % (nas["n"], p, alasan))
        if satelit and satelit.get("ha", {}).get(p):  # pembanding informasi saja
            sr = []
            for i, y in enumerate(satelit["tahun"]):
                m = (sejarah.get(p) or {}).get(y)
                if m and sum(m) >= MIN_PX and y not in sampai:
                    sr.append(satelit["ha"][p][i] / (sum(m) * PIKSEL_HA["N"]))
            if sr:
                e["satelit_median"], e["satelit_n"] = statistics.median(sr), len(sr)
        out[p] = e
    return {"prov": out, "nasional": nas}


def pilih_faktor(fk, prov):
    return None if not fk else fk["prov"].get(prov) or fk["nasional"]


# ---- ukuran per kompleks ----
def arah(n, k):
    if max(n, k) < ARAH_MIN_TITIK:
        return "sedikit"
    if n - k >= ARAH_NISBAH * k:
        return "tumbuh"
    if k - n >= ARAH_NISBAH * k:
        return "menyusut"
    return "stabil"


def ukur_k(c, hts, acuan, masuk):
    """Kunci tugas_kompleks.json untuk satu kompleks (tanpa luas_koreksi: itu kumulatif per insiden, lihat terapkan). hts: titik panas kompleks ini."""
    out = {}
    if not hts:
        return out
    v = [h for h in hts if h[3] in TREN_SENSOR]    # tren: himpunan sensor konstan (N20+N21), supaya S-NPP berhenti tak membuat "menyusut" palsu; MODIS tak sepadan
    n24 = sum(1 for h in v if h[2] > -24)
    kem = sum(1 for h in v if -48 < h[2] <= -24)
    out["tren"] = {"n24": n24, "n24_kemarin": kem, "arah": arah(n24, kem)}
    yakin = [h for h in hts if h[5] >= 1]
    if yakin:
        h = max(yakin, key=lambda h: (round(h[2], 2), h[4]))   # terbaru, terpanas bila waktunya sama
        r = RADIUS_M.get(h[3], 1000)
        out["front"] = {"lat": h[0], "lon": h[1], "waktu": fmt(mnt(acuan + dt.timedelta(hours=h[2]))), "sensor": h[3], "radius_m": r, "radius_batas_bawah": True}
        out["radius_m"] = r
        out["masuk"] = masuk(h[0], h[1]) if masuk else None
    seg = [h for h in yakin if h[2] >= -SEGAR_JAM]
    px = {sn: {(round(h[0] / SEL_PIKSEL[sn]), round(h[1] / SEL_PIKSEL[sn])) for h in seg if h[3] == sn} for sn in VIIRS}
    n = max(len(x) for x in px.values())    # per sensor terpisah (sapuan berbeda, sel tak bisa digabung), ambil terbesar
    if n or not any(h[3] == "M" for h in seg):    # hanya MODIS yang segar: tidak diisi
        ha = round(n * PIKSEL_HA["N"], 1)
        out["luas_aktif"] = {"ha": ha, "min": ha, "maks": ha, "dasar": "batas bawah: piksel VIIRS unik <= 12 jam, sensor terbanyak, x 14,06 ha; piksel tepi sapuan lebih besar; luas piksel aktif, bukan luas terbakar"}
    return out


# ---- status insiden ----
def muat_status(path):
    """Status bergulir; berkas hilang/rusak/bentuk salah = {} (mulai ulang), tidak pernah crash."""
    try:
        d = json.load(open(path))
        if isinstance(d, dict) and isinstance(d.get("insiden"), dict):
            return {i: r for i, r in d["insiden"].items() if isinstance(r, dict) and r.get("status") in ("aktif", "tak_terdeteksi", "gabung")}
    except Exception as e:
        if os.path.exists(path):
            print("insiden: status rusak, mulai ulang (%s)" % e, file=sys.stderr)
    return {}


def pts_ins(r):
    return [(p[1], p[0]) for g in r.get("garis", []) for p in g] + [(p[1], p[0]) for p in r.get("api", [])] + [(round(r["pusat"][0], 3), round(r["pusat"][1], 3))]


def bentuk_ins(r):
    return (pts_ins(r), [[(p[0], p[1]) for p in g] for g in r.get("garis", [])], [(r["pusat"][0], r["pusat"][1])] + [(p[1], p[0]) for p in r.get("api", [])[:10]])


def bentuk_k(c):
    return (titik_k(c), c["cincin"], [(c["lat"], c["lon"])] + c["api"][:10])


def pasang(A, B):
    """Pasangan (a, b) dari dua kumpulan bentuk {id: (titik, cincin, uji)} yang bersentuhan: titik terdekat <= JARAK_KM atau saling di dalam cincin."""
    Gp, Gb = Kisi(), Kisi(0.05)
    for b, (pts, rings, _) in B.items():
        for la, lo in pts:
            Gp.tambah(la, lo, b)
        if rings:
            a0, a1, o0, o1 = kotak(rings, [], 0.0)
            for y in range(math.floor(a0 / 0.05), math.floor(a1 / 0.05) + 1):
                for x in range(math.floor(o0 / 0.05), math.floor(o1 / 0.05) + 1):
                    Gb.sel[(y, x)].append((0, 0, b))
    out = set()
    for a, (pts, rings, uji) in A.items():
        for la, lo in pts:
            for b in Gp.dekat(la, lo, JARAK_KM):
                out.add((a, b))
        if rings:    # titik B di dalam cincin A
            a0, a1, o0, o1 = kotak(rings, [], 0.0)
            for la, lo, b in Gp.kotak(a0, a1, o0, o1):
                if (a, b) not in out and didalam(la, lo, rings):
                    out.add((a, b))
        for la, lo in uji:    # titik A di dalam cincin B
            for _, _, b in Gb.sel.get(Gb.c(la, lo), ()):
                if (a, b) not in out and didalam(la, lo, B[b][1]):
                    out.add((a, b))
    return out


def buat_id(ins, prov, awal):
    pre = "%s-%s-" % (prov, awal.astimezone(WIB).strftime("%y%m%d"))
    n = max([int(i[len(pre):]) for i in ins if i.startswith(pre) and i[len(pre):].isdigit()] or [0]) + 1
    return "%s%03d" % (pre, n)


def terapkan(r, cs, uk, kini, fk=None):
    """Isi/lanjutkan satu insiden dari kompleks anggotanya (cs) dan ukurannya (uk: id -> kunci per kompleks)."""
    besar = max(cs, key=lambda c: (c["luas"], c["n24"], c["id"]))
    r.update(prov=besar["prov"], kab=besar["kab"], kec=besar["kec"], kompleks=sorted(c["id"] for c in cs), level=max(c["level"] for c in cs),
             n24=sum(c["n24"] for c in cs), px24=sum(c["px24"] for c in cs), luas=round(sum(c["luas"] for c in cs), 1),
             pusat=[round(besar["lat"], 4), round(besar["lon"], 4)], status="aktif", tak_terdeteksi=None, gambut=any(c.get("gambut") for c in cs))
    awal = min(baca_t(c["awal"]) for c in cs)
    r["awal"] = fmt(min(awal, baca_t(r["awal"]))) if r.get("awal") else fmt(awal)
    r["terakhir"] = fmt(max([baca_t(c["akhir"]) for c in cs] + ([baca_t(r["terakhir"])] if r.get("terakhir") else [])))
    r["garis"] = [[[round(x, 3), round(y, 3)] for x, y in tipis(g, GARIS_TITIK)]
                  for c in sorted(cs, key=lambda c: -c["luas"])[:2] for g in c["cincin"][:1]][:2]
    r["api"] = [[round(a[1], 3), round(a[0], 3)] for c in cs for a in tipis(c["api"], 12)][:12]
    u = [uk[c["id"]] for c in cs]
    f = pilih_faktor(fk, r["prov"])
    if f and r.get("deteksi") is not None:
        n = r["deteksi"]
        lengkap = r.get("det_sejak") and baca_t(r["awal"]) >= baca_t(r["det_sejak"])
        r["luas_koreksi"] = {"ha": round(n * f["faktor"], 1), "min": round(n * f["p10"], 1), "maks": round(n * f["p90"], 1), "faktor": round(f["faktor"], 2),
                             "dasar": "%g deteksi setara S-NPP (nominal/tinggi)%s x %.2f ha/deteksi, %s; %s" % (
                                 round(n, 1), "; acuan N20 (S-NPP tak terdeteksi), rasio N20/N " + rasio_teks(True) if r.get("det_n20") else "", f["faktor"], "sejak awal api" if lengkap else "dihitung sejak %sZ, deteksi sebelumnya tak tercatat" % (r.get("det_sejak") or "?")[5:16].replace("T", " "), f["dasar"])}
    ak = [x["luas_aktif"] for x in u if "luas_aktif" in x]
    if ak:
        ha = round(sum(x["ha"] for x in ak), 1)
        r["luas_aktif"] = {"ha": ha, "min": ha, "maks": ha, "dasar": ak[0]["dasar"]}
    tr = [x["tren"] for x in u if "tren" in x]
    if tr:
        n, k = sum(x["n24"] for x in tr), sum(x["n24_kemarin"] for x in tr)
        r["tren"] = {"n24": n, "n24_kemarin": k, "arah": arah(n, k)}
    fr = [x for x in u if "front" in x]
    if fr:
        t = max(fr, key=lambda x: (x["front"]["waktu"], x["front"]["lat"]))
        r["front"], r["masuk"] = t["front"], t.get("masuk")
    rw = r.setdefault("riwayat", [])
    baris = [fmt(kini)[5:-1], r["n24"], r["px24"], (r.get("luas_koreksi") or {}).get("ha"), (r.get("luas_aktif") or {}).get("ha")]
    if rw and rw[-1][0] == baris[0]:
        rw[-1] = baris
    else:
        rw.append(baris)
    del rw[:-RIWAYAT_MAKS]


def langkah(ins, ks, baris, acuan, kini, fk=None, masuk=None):
    """Satu putaran. ins diubah di tempat. Hasil {id kompleks: kunci untuk tugas_kompleks.json (termasuk 'insiden')}."""
    ks = sorted(ks, key=lambda c: c["id"])
    per = tetapkan(ks, baris)
    uk = {c["id"]: ukur_k(c, per.get(c["id"], []), acuan, masuk) for c in ks}
    kand = {i: r for i, r in ins.items() if r["status"] == "aktif" or (r["status"] == "tak_terdeteksi" and kini - baca_t(r["tak_terdeteksi"]) <= dt.timedelta(days=BUKA_GAMBUT_HARI if r.get("gambut") else BUKA_HARI))}
    induk = {}

    def cari(x):
        while induk.setdefault(x, x) != x:
            induk[x] = induk[induk[x]]
            x = induk[x]
        return x
    K = {c["id"]: bentuk_k(c) for c in ks}
    for kid, iid in pasang(K, {i: bentuk_ins(r) for i, r in kand.items()}):
        induk[cari(("k", kid))] = cari(("i", iid))
    for a, b in pasang(K, K):    # kompleks yang bersentuhan satu sama lain = satu api, juga pada putaran pertama (tanpa insiden lama)
        induk[cari(("k", a))] = cari(("k", b))
    kom = collections.defaultdict(lambda: ([], []))
    for c in ks:
        kom[cari(("k", c["id"]))][0].append(c)
    for i in sorted(kand):
        kom[cari(("i", i))][1].append(i)
    # sensor acuan putaran ini: S-NPP bila masih ada deteksinya dalam 24 jam terakhir, selain itu NOAA-20 (lihat RASIO_N20_N)
    ref = "N" if any(h[3] == "N" and h[5] >= 1 and h[2] > -24 for h in baris) else "N20"
    hasil, disentuh = {}, set()
    for cs, lama in sorted(kom.values(), key=lambda v: min(c["id"] for c in v[0]) if v[0] else "~"):
        if not cs:
            continue
        # deteksi S-NPP kumulatif tanpa hitung ganda: hanya yang lebih baru dari det_t (waktu deteksi terakhir yang sudah dihitung)
        ts = [baca_t(ins[i]["det_t"]) for i in lama if ins[i].get("det_t")]
        cut = max(ts) if ts else None
        tot = sum(ins[i].get("deteksi", 0) for i in lama)
        pernah20 = any(ins[i].get("det_n20") for i in lama)
        sejak = max([ins[i].get("det_sejak") or fmt(acuan - dt.timedelta(hours=48)) for i in lama] or [fmt(acuan - dt.timedelta(hours=48))])
        baru = [(mnt(acuan + dt.timedelta(hours=h[2])), 1.0 if ref == "N" else 1 / RASIO_N20_N) for c in cs for h in per.get(c["id"], []) if h[3] == ref and h[5] >= 1]
        baru = [b for b in baru if cut is None or b[0] > cut]
        if lama:
            menang = min(lama, key=lambda i: (ins[i]["awal"], i))
            for i in lama:
                if i != menang:
                    ins[menang].setdefault("gabung", []).append(i)
                    ins[i] = {"status": "gabung", "ke": menang, "tgl": fmt(kini), "prov": ins[i].get("prov")}
            del ins[menang].setdefault("gabung", [])[:-10]
            if ins[menang]["status"] == "tak_terdeteksi":
                ins[menang]["dibuka"] = ins[menang].get("dibuka", 0) + 1
        elif any(c["teramati"] for c in cs):
            besar = max(cs, key=lambda c: (c["luas"], c["n24"], c["id"]))
            menang = buat_id(ins, besar["prov"], min(baca_t(c["awal"]) for c in cs))
            ins[menang] = {"id": menang}
        else:
            continue
        r = ins[menang]
        r["id"], r["deteksi"], r["det_sejak"] = menang, round(tot + sum(b[1] for b in baru), 2), sejak
        r["det_t"] = fmt(max([b[0] for b in baru] + ([cut] if cut else []))) if baru or cut else None
        r["det_n20"] = pernah20 or ref == "N20"
        terapkan(r, cs, uk, kini, fk)
        disentuh.add(menang)
        for c in cs:
            hasil[c["id"]] = dict(uk[c["id"]], insiden=menang, insiden_awal=r["awal"], insiden_awal_ms=int(baca_t(r["awal"]).timestamp() * 1000))   # deteksi pertama insiden (stabil lintas putaran) -> tugas_api.terdeteksi_awal
            if r.get("luas_koreksi"):
                hasil[c["id"]]["luas_koreksi"] = r["luas_koreksi"]
    for i, r in list(ins.items()):    # peluruhan: padam, rapikan, buang yang kedaluwarsa
        if r["status"] == "aktif" and i not in disentuh and kini - baca_t(r["terakhir"]) > dt.timedelta(days=PADAM_HARI):
            r.update(status="tak_terdeteksi", tak_terdeteksi=fmt(kini), kompleks=[])
        if r["status"] == "tak_terdeteksi":
            r.pop("api", None)
            del r.get("riwayat", [])[:-6]
        tgl = r.get("tak_terdeteksi") if r["status"] == "tak_terdeteksi" else r.get("tgl") if r["status"] == "gabung" else None
        if tgl and kini - baca_t(tgl) > dt.timedelta(days=SIMPAN_HARI):
            del ins[i]
    return hasil


def serialisasi(isi):
    """JSON padat; bila > MAKS_BYTES pangkas riwayat insiden level < 3, lalu semua, lalu api sampel."""
    for sisa, hapus_api in ((RIWAYAT_MAKS, False), (12, False), (6, True)):
        for r in isi["insiden"].values():
            if r.get("riwayat") and (sisa == 6 or r.get("level", 0) < 3):
                del r["riwayat"][:-sisa]
            if hapus_api:
                r.pop("api", None)
        s = json.dumps(isi, ensure_ascii=False, separators=(",", ":"))
        if len(s.encode()) <= MAKS_BYTES:
            return s
    return s


def tulis(path, teks):
    with tempfile.NamedTemporaryFile("w", dir=os.path.dirname(path), delete=False, suffix=".tmp") as f:
        f.write(teks)
    os.replace(f.name, path)


# ---- jalan ----
class Rute(Indeks):
    def tambah(self, lat, lon, tag):
        super().tambah(lat, lon, (lat, lon, tag))


def indeks_masuk(jalan, kanal):
    ix = Rute()
    for la, lo, _ in (kanal or {}).get("grid", []):
        ix.tambah(la, lo, "kanal")
    for f in (jalan or {}).get("features", []):
        kl = f["properties"]["k"]
        for g in f["geometry"]["coordinates"]:
            pts = [(c[1], c[0]) for c in g]
            if kl == 6:
                ix.garis(pts, "sungai")
            elif kl in JALAN_KELAS:
                ix.garis(pts, "jalan " + JALAN_KELAS[kl])

    def masuk(lat, lon):
        d, t = ix.terdekat(lat, lon, CARI_MASUK_KM)
        return None if d is None else {"lat": round(t[0], 4), "lon": round(t[1], 4), "jarak_km": round(d, 2), "jenis": t[2]}
    return masuk


def baca(nama):
    try:
        return json.load(open(os.path.join(DATA, nama)))
    except Exception as e:
        print("insiden: %s tidak terbaca (%s)" % (nama, e), file=sys.stderr)
        return None


def main():
    tugas, kl, hs = baca("tugas_kompleks.json"), baca("kluster.json"), baca("hotspot24.json")
    if not tugas or not kl or not hs:
        print("insiden: bahan tak lengkap (tugas_kompleks/kluster/hotspot24), dilewati")
        return
    kini, acuan = baca_t(tugas["dibuat"]), baca_t(hs["acuan"])
    ks = [dari_fitur(f) for f in kl["features"] if f["properties"].get("level", 0) >= 2]
    k = {n: i for i, n in enumerate(hs["kolom"])}
    baris = [(r[k["lat"]], r[k["lon"]], r[k["jam"]], r[k["sensor"]], r[k["frp"]], r[k["keyakinan"]]) for r in hs["baris"]]
    fk = faktor_luas((baca("sejarah.json") or {}).get("prov"), baca("luas_resmi.json"), baca("luas_satelit.json"))
    if not fk:
        print("insiden: bahan faktor luas tak ada, luas_koreksi/luas_aktif tidak ditulis", file=sys.stderr)
    masuk = indeks_masuk(baca("jalan.geojson"), baca("kanal.json"))
    path = os.path.join(DATA, "insiden.json")
    ins = muat_status(path)
    hasil = langkah(ins, ks, baris, acuan, kini, fk, masuk)
    n = collections.Counter(r["status"] for r in ins.values())
    teks = serialisasi({"dibuat": fmt(kini), "versi": 1, "parameter": PARAMETER,
                        "format": {"garis": "[[lon,lat]...] maks 2 cincin ringkas", "riwayat": "[UTC MM-DDTHH:MM, n24, px24, luas_koreksi ha, luas_aktif ha]",
                                   "api": "[[lon,lat]] sampel titik 24 jam"},
                        "koreksi": fk and {"nasional": fk["nasional"], "prov": fk["prov"]}, "n": dict(n), "insiden": ins})
    tulis(path, teks)
    sudah = {c["id"] for c in tugas["kompleks"]}
    for c in tugas["kompleks"]:
        c.update(hasil.get(c["id"], {}))
    tulis(os.path.join(DATA, "tugas_kompleks.json"), json.dumps(tugas, ensure_ascii=False, separators=(",", ":")))
    print("insiden: %s, %d cluster level>=2, %d entri tugas disisipi, insiden.json %.0f KB" %
          (dict(n), len(ks), sum(1 for i in sudah if i in hasil), len(teks.encode()) / 1e3))


# ---- self-check ----
def _kotak(id, lat, lon, w=0.004, awal="2026-10-20T03:00:00Z", teramati=True, luas=40.0, prov="62"):
    r = [(lon - w, lat - w), (lon + w, lat - w), (lon + w, lat + w), (lon - w, lat + w), (lon - w, lat - w)]
    return {"id": id, "lat": lat, "lon": lon, "level": 2, "teramati": teramati, "n24": 5, "px24": 4, "luas": luas, "prov": prov, "kab": "Seruyan",
            "kec": "X", "awal": awal, "akhir": "2026-10-22T02:00:00Z", "cincin": [r], "api": [(lat, lon)]}


def uji():
    T = lambda s: baca_t(s)
    t0 = T("2026-10-22T06:00:00Z")
    jam = lambda j: t0 + dt.timedelta(hours=j)
    # 1. kompleks ganti id di lokasi yang sama = insiden yang sama
    ins = {}
    h = langkah(ins, [_kotak("K0001", -3.0, 112.0)], [], t0, t0)
    iid = h["K0001"]["insiden"]
    assert h["K0001"]["insiden_awal"] == ins[iid]["awal"] and h["K0001"]["insiden_awal_ms"] == int(baca_t(ins[iid]["awal"]).timestamp() * 1000), h["K0001"]
    assert iid == "62-261020-001" or iid.startswith("62-2610"), iid
    h = langkah(ins, [_kotak("K0005", -3.001, 112.002)], [], jam(3), jam(3))
    assert h["K0005"]["insiden"] == iid and len(ins) == 1 and len(ins[iid]["riwayat"]) == 2, (h, ins)
    # 2. api jauh = insiden baru, urut 002 untuk (prov, tanggal) yang sama
    h = langkah(ins, [_kotak("K0005", -3.001, 112.002), _kotak("K0006", -3.0, 113.0)], [], jam(6), jam(6))
    assert h["K0006"]["insiden"] != iid and h["K0006"]["insiden"].endswith("-002") and h["K0005"]["insiden"] == iid, h
    # 3. dua kompleks menyatu: yang tertua menang, yang lain jadi `gabung`
    ins = {}
    h = langkah(ins, [_kotak("K1", -3.0, 112.0, awal="2026-10-19T03:00:00Z"), _kotak("K2", -3.0, 112.05)], [], t0, t0)
    a, b = h["K1"]["insiden"], h["K2"]["insiden"]
    assert a != b and ins[a]["awal"] < ins[b]["awal"]
    besar = _kotak("K9", -3.0, 112.025, w=0.03, luas=900.0)
    besar["api"] = [(-3.0, 112.0), (-3.0, 112.05)]
    h = langkah(ins, [besar], [], jam(3), jam(3))
    assert h["K9"]["insiden"] == a and ins[b] == {"status": "gabung", "ke": a, "tgl": fmt(jam(3)), "prov": "62"} and ins[a]["gabung"] == [b], ins
    # 4. tak_terdeteksi setelah PADAM_HARI tanpa kompleks, disimpan SIMPAN_HARI, lalu hilang; buka kembali dalam BUKA_HARI (gambut BUKA_GAMBUT_HARI)
    ins = {}
    h = langkah(ins, [_kotak("K1", -3.0, 112.0)], [], t0, t0)
    iid = h["K1"]["insiden"]
    langkah(ins, [], [], t0, t0 + dt.timedelta(days=PADAM_HARI - 0.3))
    assert ins[iid]["status"] == "aktif"
    langkah(ins, [], [], t0, t0 + dt.timedelta(days=PADAM_HARI + 0.5))
    assert ins[iid]["status"] == "tak_terdeteksi" and ins[iid]["kompleks"] == [] and "padam" not in ins[iid], ins[iid]
    h = langkah(ins, [_kotak("K7", -3.0, 112.0, awal="2026-10-25T00:00:00Z")], [], t0, t0 + dt.timedelta(days=PADAM_HARI + 1))
    assert h["K7"]["insiden"] == iid and ins[iid]["status"] == "aktif" and ins[iid]["dibuka"] == 1, ins
    for gambut, umur, sama in ((False, BUKA_HARI + 1, False), (True, BUKA_HARI + 1, True), (True, BUKA_GAMBUT_HARI + 1, False)):
        ins2 = {}
        c = _kotak("K1", -3.0, 112.0)
        c["gambut"] = gambut
        iid = langkah(ins2, [c], [], t0, t0)["K1"]["insiden"]
        langkah(ins2, [], [], t0, t0 + dt.timedelta(days=PADAM_HARI + 0.5))
        h = langkah(ins2, [_kotak("K8", -3.0, 112.0)], [], t0, t0 + dt.timedelta(days=PADAM_HARI + 0.5 + umur))
        assert (h["K8"]["insiden"] == iid) == sama, (gambut, umur, ins2)
    ins2 = {}
    iid = langkah(ins2, [_kotak("K1", -3.0, 112.0)], [], t0, t0)["K1"]["insiden"]
    langkah(ins2, [], [], t0, t0 + dt.timedelta(days=PADAM_HARI + 0.5))
    langkah(ins2, [], [], t0, t0 + dt.timedelta(days=PADAM_HARI + SIMPAN_HARI + 10))
    assert iid not in ins2, ins2
    assert langkah({}, [_kotak("K1", -3.0, 112.0, teramati=False)], [], t0, t0) == {}   # tak teramati tidak melahirkan insiden
    # 5. berkas status hilang / rusak / bentuk salah = mulai ulang tanpa crash
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "insiden.json")
        assert muat_status(p) == {}
        for isi in ("{rusak", "[]", '{"insiden": []}', '{"insiden": {"x": 1, "y": {"status": "aneh"}, "z": {"status": "padam"}}}', ""):
            open(p, "w").write(isi)
            assert muat_status(p) == {}, isi
    # 6. front/radius (batas bawah), tren VIIRS saja, luas_aktif tanpa faktor, luas_koreksi dari deteksi kumulatif
    c = _kotak("K1", -3.0, 112.0)
    fk = {"prov": {}, "nasional": {"faktor": 2.8125, "p10": 1.0, "p90": 5.0, "rasio": 0.2, "n": 99, "dasar": "uji"}}
    hb = [(-3.0, 112.0, -1.0, "N", 10.0, 1), (-3.001, 112.001, -1.0, "N20", 30.0, 1), (-3.002, 112.0, -0.5, "M", 5.0, 0),   # M berkeyakinan rendah diabaikan
          (-3.0, 112.002, -13.0, "N", 8.0, 2), (-3.0, 112.003, -26.0, "N", 8.0, 2), (-3.0, 112.003, -30.0, "N", 8.0, 2), (-3.0, 112.003, -40.0, "N", 8.0, 2)]
    ins = {}
    m = lambda la, lo: {"lat": la, "lon": lo, "jarak_km": 0.5, "jenis": "jalan tertiary"}
    h = langkah(ins, [c], hb, t0, t0, fk, m)["K1"]
    assert h["front"]["sensor"] == "N20" and h["front"]["radius_m"] == 375 == h["radius_m"] and h["front"]["radius_batas_bawah"] is True, h
    assert h["front"]["waktu"] == "2026-10-22T05:00Z" and h["masuk"]["jenis"] == "jalan tertiary"
    assert h["luas_aktif"]["ha"] == 14.1 and "batas bawah" in h["luas_aktif"]["dasar"] and h["luas_aktif"]["min"] == h["luas_aktif"]["maks"] and "bukan luas terbakar" in h["luas_aktif"]["dasar"], h["luas_aktif"]   # per sensor terpisah (N 1 piksel, N20 1 piksel): maksimum, tanpa faktor
    assert h["tren"] == {"n24": 1, "n24_kemarin": 0, "arah": "sedikit"}, h["tren"]   # hanya N20+N21 (N dan M tak dihitung); max < 4
    lk = h["luas_koreksi"]
    assert (lk["ha"], lk["min"], lk["maks"], lk["faktor"]) == (14.1, 5.0, 25.0, 2.81), lk   # 5 deteksi S-NPP (N20 tak dihitung) x faktor
    assert "5 deteksi setara S-NPP" in lk["dasar"] and "acuan N20" not in lk["dasar"] and "dihitung sejak" in lk["dasar"] and "p10-p90" not in "" and "uji" in lk["dasar"], lk["dasar"]
    iid = h["insiden"]
    # putaran yang sama diulang / putaran berikut dengan titik yang sama + 1 baru: tidak dihitung dua kali
    langkah(ins, [c], hb, t0, t0, fk, m)
    assert ins[iid]["deteksi"] == 5, ins[iid]["deteksi"]
    hb2 = [(a, b, j - 3, *r) for a, b, j, *r in hb] + [(-3.0, 112.001, -1.0, "N", 8.0, 1), (-3.0, 112.001, -1.0, "M", 8.0, 2)]   # acuan +3 jam: jam lama bergeser
    langkah(ins, [c], hb2, t0 + dt.timedelta(hours=3), t0 + dt.timedelta(hours=3), fk, m)
    assert ins[iid]["deteksi"] == 6, ins[iid]["deteksi"]
    # regresi: det_t tidak boleh menghitung ulang deteksi yang sama (acuan bergeser 10 menit/putaran, jam pecahan dibulatkan 0,01 jam)
    asli = [t0 - dt.timedelta(minutes=m) for m in (203, 142, 61)]
    insr = {}
    for k in range(5):
        ac = t0 + dt.timedelta(minutes=10 * k)
        hr = [(-3.0, 112.0, round((t - ac).total_seconds() / 3600 + (0.004 if (k + i) % 2 else -0.004), 2), "N", 9.0, 1) for i, t in enumerate(asli)]
        langkah(insr, [c], hr, ac, ac, fk, m)
        assert list(insr.values())[0]["deteksi"] == 3, (k, list(insr.values())[0]["deteksi"])
    # tren: S-NPP hilang dari data tidak membuat "menyusut" palsu (hanya N20+N21 dihitung)
    n20 = [(-3.0, 112.0, -1.0 - i, "N20", 9.0, 1) for i in range(6)] + [(-3.0, 112.0, -26.0 - i, "N20", 9.0, 1) for i in range(6)]
    nn = [(-3.0, 112.0, -26.0 - i, "N", 9.0, 1) for i in range(20)]
    assert ukur_k(c, n20 + nn, t0, None)["tren"] == ukur_k(c, n20, t0, None)["tren"] == {"n24": 6, "n24_kemarin": 6, "arah": "stabil"}
    # luas_aktif per sensor: tidak digabung antar sensor
    assert ukur_k(c, [(-3.0, 112.0, -1.0, "N", 1.0, 1), (-3.0, 112.0, -1.0, "N20", 1.0, 1), (-3.0, 112.0, -1.0, "N21", 1.0, 1)], t0, None)["luas_aktif"]["ha"] == 14.1
    assert ukur_k(c, [(-3.0, 112.0, -1.0, "N", 1.0, 1), (-3.0, 112.01, -1.0, "N", 1.0, 1), (-3.0, 112.0, -1.0, "N20", 1.0, 1)], t0, None)["luas_aktif"]["ha"] == 28.1
    # S-NPP berhenti: jendela tanpa N memakai N20 / RASIO_N20_N; peralihan dari N ke N20 tidak menggandakan
    t1 = t0 + dt.timedelta(hours=30)
    b20 = [(-3.0, 112.0, -2.0, "N20", 9.0, 1)] * 2 + [(-3.0, 112.001, -29.0, "N20", 9.0, 1)]   # satu N20 lebih tua dari N terakhir (t0-1 jam), dua lebih baru
    langkah(ins, [c], [(a, b, j - 30, *r) for a, b, j, *r in hb2] + b20, t1, t1, fk, m)
    # hb2: 6 N sudah dihitung (kumulatif 6); N20 sebelum N terakhir (t0+2 jam = hb2 N terakhir) tak dihitung; 2 N20 baru -> +2/RASIO_N20_N (lokal)
    assert abs(ins[iid]["deteksi"] - (6 + 2 / RASIO_N20_N)) < 0.01 and ins[iid]["det_n20"] is True, ins[iid]
    assert "acuan N20 (S-NPP tak terdeteksi)" in ins[iid]["luas_koreksi"]["dasar"] and "rasio N20/N 0,89 (median jendela 3x3, IQR 0,72-1,07)" in ins[iid]["luas_koreksi"]["dasar"]
    langkah(ins, [c], [(a, b, j - 30, *r) for a, b, j, *r in hb2] + b20, t1, t1, fk, m)   # ulang: tetap
    assert abs(ins[iid]["deteksi"] - (6 + 2 / RASIO_N20_N)) < 0.01
    baru = langkah({}, [_kotak("K1", -3.0, 112.0)], [(-3.0, 112.0, -2.0, "N20", 9.0, 1)] * 4 + [(-3.0, 112.0, -2.0, "N", 9.0, 0)], t0, t0, fk, m)["K1"]   # N berkeyakinan rendah bukan acuan
    assert abs(float(baru["luas_koreksi"]["dasar"].split(" ")[0]) - round(4 / RASIO_N20_N, 1)) < 0.01 and "acuan N20" in baru["luas_koreksi"]["dasar"], baru["luas_koreksi"]["dasar"]
    # MODIS-only yang segar: luas_aktif tidak diisi; tak ada titik segar sama sekali: 0
    assert "luas_aktif" not in ukur_k(c, [(-3.0, 112.0, -1.0, "M", 5.0, 2)], t0, None)
    assert ukur_k(c, [(-3.0, 112.0, -20.0, "N", 5.0, 2)], t0, None)["luas_aktif"]["ha"] == 0
    # arah: ambang 4 titik; tumbuh/menyusut/stabil sesudahnya
    assert arah(3, 0) == "sedikit" and arah(4, 0) == "tumbuh" and arah(10, 4) == "tumbuh" and arah(4, 10) == "menyusut" and arah(10, 9) == "stabil"
    assert RADIUS_M["M"] == 1000 and RADIUS_M["H"] == 2000
    # deteksi insiden yang digabung dijumlah
    ins = {}
    langkah(ins, [_kotak("K1", -3.0, 112.0, awal="2026-10-19T03:00:00Z"), _kotak("K2", -3.0, 112.05)],
            [(-3.0, 112.0, -1.0, "N", 1.0, 1), (-3.0, 112.05, -1.0, "N", 1.0, 1), (-3.0, 112.05, -2.0, "N", 1.0, 1)], t0, t0, fk)
    besar = _kotak("K9", -3.0, 112.025, w=0.03, luas=900.0)
    besar["api"] = [(-3.0, 112.0), (-3.0, 112.05)]
    h = langkah(ins, [besar], [(-3.0, 112.0, -4.0, "N", 1.0, 1), (-3.0, 112.02, -1.0, "N", 1.0, 1)], t0 + dt.timedelta(hours=3), t0 + dt.timedelta(hours=3), fk)
    assert ins[h["K9"]["insiden"]]["deteksi"] == 3 + 1, ins[h["K9"]["insiden"]]["deteksi"]   # 3 lama + 1 baru (yang -1 jam sudah dihitung)
    # 7. titik panas di luar semua kompleks tidak ditetapkan
    assert tetapkan([c], [(-4.0, 113.0, -1.0, "N", 1.0, 1)]) == {}
    # 8. faktor luas: filter tahun/SiPongi/rasio, gerbang provinsi, nasional
    tahun = ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"]
    bln = lambda n: [n] * 12
    sj = {"62": {y: bln(100) for y in tahun}, "36": {y: bln(100) for y in tahun}, "11": {y: bln(100) for y in tahun}, "12": {y: bln(100) for y in tahun},
          "13": {y: bln(100) for y in tahun}}
    ha = lambda r, n=1200: n * 14.0625 * r
    rs = {"tahun": tahun, "sampai": {"2025": "2025-06"},
          "ha": {"62": [ha(0.9), ha(0.9), ha(0.25), ha(0.25), ha(0.25), ha(0.25), ha(0.25), ha(0.25, 600)],   # 2018-19 dibuang walau rasio 0,9
                 "36": [0.0] * 8, "11": [ha(0.02)] * 8,                                                       # median 0,02 < 0,05: nasional
                 "12": [ha(0.1), ha(0.1), ha(0.06), ha(0.06), ha(0.2), ha(0.5), ha(0.5), ha(0.5, 600)],         # p75/p25 > 3: nasional
                 "13": [40.0] * 8}}                                                                           # SiPongi < 50 ha dibuang
    f = faktor_luas(sj, rs, {"tahun": ["2020"], "ha": {"62": [ha(0.5)]}})
    e = f["prov"]["62"]
    assert e["n"] == 6 and e["tahun"][0] == "2020" and abs(e["rasio"] - 0.25) < 1e-9 and abs(e["faktor"] - 0.25 * 14.0625) < 1e-9 and e["p10"] == e["p90"], e   # satuan ha per deteksi
    assert "antartahun" in e["dasar"] and "di luarnya" in e["dasar"] and abs(e["satelit_median"] - 0.5) < 1e-9
    for p in ("36", "11", "12", "13"):
        assert f["prov"][p]["dasar"].startswith("SiPongi/VIIRS nasional") and f["prov"][p]["faktor"] == f["nasional"]["faktor"], (p, f["prov"][p])
    assert "di luar" in f["prov"]["11"]["dasar"] and "kuartil" in f["prov"]["12"]["dasar"]
    assert faktor_luas(None, rs) is None and faktor_luas(sj, {"ha": {}}) is None and pilih_faktor(None, "62") is None
    # gerbang data nyata: tidak ada faktor provinsi terpakai di luar [0,03; 1,0] (rasio ha per deteksi / 14,0625)
    nyata = [os.path.join(AKAR, "public/data", n) for n in ("sejarah.json", "luas_resmi.json")]
    if all(os.path.exists(x) for x in nyata):
        fr = faktor_luas(json.load(open(nyata[0]))["prov"], json.load(open(nyata[1])))
        assert fr and all(0.03 <= v["rasio"] <= 1.0 for v in fr["prov"].values()) and 0.03 <= fr["nasional"]["rasio"] <= 1.0, {p: v["rasio"] for p, v in fr["prov"].items()}
        assert all(v["p10"] <= v["faktor"] <= v["p90"] for v in fr["prov"].values())
    # 9. ukuran terkendali: 3000 insiden penuh riwayat 40 putaran
    besar = {}
    for n in range(3000):
        la, lo = -9 + (n % 60) * 0.1, 95 + (n // 60) * 0.1
        c = _kotak("K%d" % n, la, lo, w=0.01)
        r = {}
        terapkan(r, [c], {c["id"]: {"front": {"lat": la, "lon": lo, "waktu": "2026-10-22T02:00Z", "sensor": "N", "radius_m": 375}, "tren": {"n24": 3, "n24_kemarin": 2, "arah": "stabil"}}},
                  t0)
        for j in range(1, 60):
            terapkan(r, [c], {c["id"]: {}}, t0 + dt.timedelta(hours=3 * j))
        r["id"] = "62-261020-%03d" % (n % 1000) + str(n)
        besar[r["id"]] = r
    assert all(len(r["riwayat"]) == RIWAYAT_MAKS for r in besar.values())
    teks = serialisasi({"insiden": besar})
    assert len(teks.encode()) <= MAKS_BYTES, len(teks)
    # 10. suntik in-place: kunci lain utuh
    with tempfile.TemporaryDirectory() as d:
        global DATA
        lama, DATA = DATA, d
        try:
            ks = [_kotak("K1", -3.0, 112.0)]
            tug = {"dibuat": "2026-10-22T06:00:00Z", "kompleks": [{"id": "K1", "level": 2, "rekomendasi": {"x": 1}}, {"id": "K2", "level": 2}]}
            fitur = {"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [[list(p) for p in ks[0]["cincin"][0]]]},
                     "properties": {"id": "K1", "lat": -3.0, "lon": 112.0, "level": 2, "teramati": True, "n24": 5, "px24": 4, "luas": 40.0, "prov": "62", "kab": "S", "kec": "X",
                                    "awal": "2026-10-20T03:00:00Z", "akhir": "2026-10-22T02:00:00Z", "api24": [[112.0, -3.0]]}}
            json.dump(tug, open(os.path.join(d, "tugas_kompleks.json"), "w"))
            json.dump({"features": [fitur]}, open(os.path.join(d, "kluster.json"), "w"))
            json.dump({"acuan": "2026-10-22T06:00:00Z", "kolom": ["lat", "lon", "jam", "sensor", "frp", "keyakinan", "wilayah", "tgl_wib"],
                       "baris": [[-3.0, 112.0, -1.0, "N", 9.0, 1, 0, "10-22"]]}, open(os.path.join(d, "hotspot24.json"), "w"))
            main()
            main()   # idempoten: putaran sama tidak menggandakan riwayat
            t = json.load(open(os.path.join(d, "tugas_kompleks.json")))
            e = t["kompleks"][0]
            assert e["rekomendasi"] == {"x": 1} and e["insiden"] and e["front"]["sensor"] == "N" and e["tren"]["n24"] == 0 and "insiden" not in t["kompleks"][1], e
            s = json.load(open(os.path.join(d, "insiden.json")))
            assert s["n"] == {"aktif": 1} and len(s["insiden"][e["insiden"]]["riwayat"]) == 1 and s["koreksi"] is None
        finally:
            DATA = lama
    print("insiden uji: OK")


if __name__ == "__main__":
    if sys.argv[1:] == ["--uji"]:
        uji()
    else:
        main()
