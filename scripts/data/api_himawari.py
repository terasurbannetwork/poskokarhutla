"""Detektor titik api kontekstual Himawari-9 L1b (ST-04): B07 (3,9 um) dan B14 (11,2 um), awan dari B13/B14/B15. Python stdlib saja.

DASAR (algoritme kontekstual geostasioner/MODIS). Semua angka bertanda [TUNABLE] adalah pilihan kita, BUKAN angka makalah; yang bertanda
[ingatan] diambil dari ingatan penulis atas makalah dan BELUM dicek ulang ke teksnya:
  - Giglio, L., Descloitres, J., Justice, C.O., Kaufman, Y.J. 2003, "An enhanced contextual fire detection algorithm for MODIS", Remote Sens. Environ. 87:273-282
    (uji piksel calon T4 > 310 K siang / > 305 K malam dan dT = T4 - T11 > 10 K [ingatan]; latar dari jendela yang melebar sampai >= 25 persen piksel sah dan >= 8 piksel;
     uji kontekstual dT > rerata_dT + 3,5 sd, dT > rerata_dT + 6 K, T4 > rerata_T4 + 3 sd, sd dengan lantai 2 K; api tegas T4 > 360 K siang / > 320 K malam [ingatan];
     sudut kilau matahari < 12 derajat [ingatan]; piksel calon lain dan awan dikeluarkan dari latar).
  - Prins, E.M., Feltz, J.M., Menzel, W.P., Ward, D.E. 1998, "An overview of GOES-8 diurnal fire and smoke results", J. Geophys. Res. 103(D24):31821-31835 dan
    Schmidt, C.C. dkk. (WF_ABBA, CIMSS): ide yang sama untuk satelit geostasioner (latar kontekstual B3,9 dan B11, pengulangan waktu) [ingatan, tanpa angka diambil].
  - Hamada/Kurihara/JAXA, produk Himawari Wild Fire (WLF, P-Tree): algoritme kontekstual untuk AHI; angka internalnya tidak kami punya, tak ada yang diambil.
  - Sebaran awan sirus lewat beda split-window B13-B15 (Inoue 1985, J. Meteor. Soc. Japan 63:88-99): BTD besar pada awan tipis dingin; ambangnya [TUNABLE].
  - Aturan ST-04: ALGORITMA.md bagian 1 "Titik panas L1b" dan "Kemandirian label api"; kriteria dikunci di api_himawari.kriteria.json + .sidik.

MODE (python3 -I scripts/data/api_himawari.py <mode>):
  uji        self-check sintetis tanpa jaringan
  prasyarat  sidik cocok, jalur vonis tidak memanggil penanda()/saringan VIIRS 72 jam, minggu uji belum dibuka
  dev        ekstrak fitur satu pindaian di luar cuplikan (tanpa label)      --pindai YYYYMMDDHHMM
  ukur-api   unduh 00/06/12/18 UTC satu hari, tulis ukuran keluaran detektor ke himawari_pindai.ukur.json (kunci "api")
  kunci      tulis api_himawari.sidik (sekali)
  panen      unduh + ekstrak fitur cuplikan (butuh sidik)                    [--peran kalibrasi|uji]
  kalibrasi  pilih parameter pada MINGGU KALIBRASI saja
  coba       gladi bersih evaluasi penuh pada minggu kalibrasi (tidak menulis hasil)
  vonis      buka minggu uji SEKALI (api_himawari.buka, O_EXCL), tulis api_himawari.hasil.json
Antarmuka untuk pemindai (himawari_pindai.py tidak diubah di sini): `dokumen_api(seg, w, p=None)` menerima kamus `seg` {(pita, segmen): hasil AH.baca_segmen}
yang sama dengan keluaran himawari_pindai.unduh dan mengembalikan dokumen bentuk DESAIN-TEKNIS 5. `daftar_penanda(...)` membungkus himawari.penanda
(hanya dipanggil oleh pemindai/Worker, TIDAK PERNAH oleh jalur kalibrasi atau vonis).
"""
import ast, bz2, csv, datetime as dt, gzip, hashlib, importlib.util, json, math, os, statistics, sys, time, zlib
from array import array
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIR = os.path.dirname(os.path.abspath(__file__))
KRITERIA = os.path.join(DIR, "api_himawari.kriteria.json")
SIDIK = os.path.join(DIR, "api_himawari.sidik")
BUKA = os.path.join(DIR, "api_himawari.buka")
JEJAK = os.path.join(DIR, "api_himawari.jejak.jsonl")
KALIBRASI = os.path.join(DIR, "api_himawari.kalibrasi.json")
HASIL = os.path.join(DIR, "api_himawari.hasil.json")
CACHE = os.path.join(AKAR, "data/raw/satelit")
UTC = dt.timezone.utc


def _muat(nama, jalur):
    s = importlib.util.spec_from_file_location(nama, jalur)
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


PN = _muat("umum_himawari_pindai", os.path.join(AKAR, "scripts/umum/himawari_pindai.py"))
AH, P0 = PN.AH, PN.P0
SD = _muat("umum_sidik", os.path.join(AKAR, "scripts/umum/sidik.py"))
PB = _muat("umum_pembanding", os.path.join(AKAR, "scripts/umum/pembanding.py"))
GB = _muat("umum_gerbang", os.path.join(AKAR, "scripts/umum/gerbang.py"))

# ---- kisi dan konstanta (ALGORITMA 0 dan 1) -----------------------------------------------------------------------------------------------------------
SEGS = [5, 6, 7]
NCOL, NLIN, L0 = 5500, 550 * len(SEGS), 4 * 550 + 1      # garis global pertama segmen 5 = 2201
PITA = (7, 13, 14, 15)
SIANG_ZEN, MALAM_ZEN = 85.0, 95.0                         # ALGORITMA 0
CAND = {"siang": (310.0, 10.0), "malam": (300.0, 6.0)}    # (T07 min, dT min); siang juga untuk senja. Giglio 310/10 siang; malam 300/6 pilihan paket (Giglio 305/10 [ingatan]) [TUNABLE]
T_TEGAS = {"siang": 360.0, "malam": 320.0}                # api tegas tanpa uji latar, Giglio 2003 [ingatan]
JENDELA = (5, 10)                                         # setengah lebar: 11x11 lalu 21x21 (ALGORITMA 1)
LATAR_FRAKSI, LATAR_N_MIN = 0.25, 8                       # Giglio: >= 25 persen sah dan >= 8 piksel
SD_LANTAI = 2.0                                           # K, Giglio
K_DT_TAMBAH = 0.5                                         # sd dT = k + 0,5 (3 -> 3,5, Giglio)
AWAN_T14, AWAN_BTD, AWAN_BTD_T14 = 265.0, 2.5, 290.0      # ALGORITMA 1 (265 K); beda B13-B15 > 2,5 K pada T14 < 290 K [TUNABLE]
AWAN_SIANG_T14, AWAN_SIANG_DT = 285.0, 5.0                # ALGORITMA 1
KILAU_DERAJAT = 12.0                                      # ALGORITMA 1 (Giglio)
KUAT_SD, KUAT_T07 = 8.0, 330.0                            # ALGORITMA 1 kelas kuat
R_KAWAH_KM, R_PLTU_KM = 5.0, 1.0                          # ALGORITMA 1 (kawah 5 km); PLTU 1 km [TUNABLE]
R_TITIK_PALSU_KM, R_ALARM_PALSU_KM, R_SUAR_KM = 2.0, 1.5, 2.0
MENIT_SEGMEN = 5                                          # waktu obsevasi segmen 5-7 ~ awal pindai + 5 menit [TUNABLE, tidak dibaca dari header HSD]
BLOK = 64                                                 # blok piksel untuk kelas siang/malam

# parameter bawaan paket; kalibrasi memilih dari GRID (dikunci di kriteria)
GRID = {
    "siang": {"t7": (310.0, 315.0, 320.0), "k": (3.0, 4.0, 5.0), "bg": (6.0, 8.0, 10.0), "tepi": (0, 1)},
    "malam": {"t7": (300.0, 305.0, 310.0), "k": (3.0, 4.0, 5.0), "bg": (4.0, 6.0, 8.0)},
}
BAWAAN = {"siang": {"t7": 310.0, "k": 3.0, "bg": 6.0, "tepi": 0}, "malam": {"t7": 300.0, "k": 3.0, "bg": 6.0}}

# cuplikan riwayat (T7/T7b): hari Rabu dan Sabtu tiap minggu ISO 32-41 tahun 2026, pindaian 06.00 UTC (siang, lintas VIIRS ~13.30 WIB-lokal di 105-115 BT) dan 18.00 UTC (malam ~01.30)
MINGGU_ISO = tuple(range(32, 42))
HARI_ISO = (3, 6)
JAM_SAMPEL = (6, 18)
LABEL_CSV = ("viirs.csv", "viirs_noaa20.csv", "viirs_noaa21.csv")
SAT = {"N": 0, "N20": 1, "N21": 2}


def peran_minggu(m):
    return "kalibrasi" if m % 2 == 0 else "uji"


def sampel():
    """[(waktu_mulai_pindai UTC, peran, minggu_iso)] terurut."""
    out = []
    for m in MINGGU_ISO:
        for h in HARI_ISO:
            d = dt.date.fromisocalendar(2026, m, h)
            for j in JAM_SAMPEL:
                out.append((dt.datetime(d.year, d.month, d.day, j, 0, tzinfo=UTC), peran_minggu(m), m))
    return out


# ---- geometri matahari dan satelit (stdlib; rumus NOAA / vektor ECEF) -------------------------------------------------------------------------------
def matahari(lat, lon, w):
    """(zenit, azimut dari utara searah jarum jam) derajat. Rumus NOAA Solar Calculator."""
    doy = w.timetuple().tm_yday
    jam = w.hour + w.minute / 60 + w.second / 3600
    g = 2 * math.pi / 365 * (doy - 1 + (jam - 12) / 24)
    eq = 229.18 * (0.000075 + 0.001868 * math.cos(g) - 0.032077 * math.sin(g) - 0.014615 * math.cos(2 * g) - 0.040849 * math.sin(2 * g))
    de = (0.006918 - 0.399912 * math.cos(g) + 0.070257 * math.sin(g) - 0.006758 * math.cos(2 * g) + 0.000907 * math.sin(2 * g)
          - 0.002697 * math.cos(3 * g) + 0.00148 * math.sin(3 * g))
    ha = math.radians(((jam * 60 + eq + 4 * lon) % 1440) / 4 - 180)
    la = math.radians(lat)
    c = math.sin(la) * math.sin(de) + math.cos(la) * math.cos(de) * math.cos(ha)
    z = math.degrees(math.acos(max(-1.0, min(1.0, c))))
    az = math.degrees(math.atan2(-math.sin(ha) * math.cos(de), math.sin(de) * math.cos(la) - math.cos(de) * math.sin(la) * math.cos(ha))) % 360
    return z, az


def satelit(lat, lon, sub=P0["sub"], rs=P0["rs"]):
    """(zenit, azimut) satelit geostasioner dari titik di bumi bola (R 6371 km)."""
    la, lo, so = math.radians(lat), math.radians(lon), math.radians(sub)
    R = 6371.0
    px, py, pz = R * math.cos(la) * math.cos(lo), R * math.cos(la) * math.sin(lo), R * math.sin(la)
    dx, dy, dz = rs * math.cos(so) - px, rs * math.sin(so) - py, -pz
    n = math.sqrt(dx * dx + dy * dy + dz * dz)
    e = (-math.sin(lo), math.cos(lo), 0.0)
    nn = (-math.sin(la) * math.cos(lo), -math.sin(la) * math.sin(lo), math.cos(la))
    u = (math.cos(la) * math.cos(lo), math.cos(la) * math.sin(lo), math.sin(la))
    de, dn, du = (dx * e[0] + dy * e[1]), (dx * nn[0] + dy * nn[1] + dz * nn[2]), (dx * u[0] + dy * u[1] + dz * u[2])
    return math.degrees(math.acos(max(-1.0, min(1.0, du / n)))), math.degrees(math.atan2(de, dn)) % 360


def sudut_kilau(zs, azs, zv, azv):
    """Sudut antara arah pandang satelit dan pantulan cermin arah matahari (derajat). Giglio 2003: cos(tg) = cos zv cos zs - sin zv sin zs cos(azv - azs)."""
    a, b, c = math.radians(zs), math.radians(zv), math.radians(azv - azs)
    return math.degrees(math.acos(max(-1.0, min(1.0, math.cos(b) * math.cos(a) - math.sin(b) * math.sin(a) * math.cos(c)))))


def kelas_zen(z):
    return "siang" if z < SIANG_ZEN else "malam" if z > MALAM_ZEN else "senja"


def jarak_km(la1, lo1, la2, lo2):
    return 111.195 * math.hypot(la2 - la1, (lo2 - lo1) * math.cos(math.radians((la1 + la2) / 2)))


# ---- penyimpanan sementara (di luar git: data/raw/*) ------------------------------------------------------------------------------------------------
def _gz_tulis(p, obj):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with gzip.open(p + ".tmp", "wt", encoding="utf-8") as f:
        json.dump(obj, f, separators=(",", ":"))
    os.replace(p + ".tmp", p)


def _gz_baca(p):
    with gzip.open(p, "rt", encoding="utf-8") as f:
        return json.load(f)


def kunci_s3(w, pita, s):
    return PN.kunci(w, pita, s)


def unduh(w, simpan=True):
    """Unduh 4 pita x 3 segmen ke cache (lewati yang sudah ada). -> jumlah byte terkompresi."""
    d = os.path.join(CACHE, "hsd")
    os.makedirs(d, exist_ok=True)

    def satu(t):
        k = kunci_s3(w, *t)
        p = os.path.join(d, os.path.basename(k))
        if os.path.exists(p):
            return os.path.getsize(p)
        b = AH.ambil(AH.BUCKET + k)
        with open(p + ".tmp", "wb") as f:
            f.write(b)
        os.replace(p + ".tmp", p)
        return len(b)
    with ThreadPoolExecutor(12) as ex:
        return sum(ex.map(satu, [(b, s) for b in PITA for s in SEGS]))


def muat_seg(w):
    d = os.path.join(CACHE, "hsd")
    out = {}
    for b in PITA:
        for s in SEGS:
            with open(os.path.join(d, os.path.basename(kunci_s3(w, b, s))), "rb") as f:
                out[(b, s)] = AH.baca_segmen(bz2.decompress(f.read()), b)
    return out


# ---- topeng darat di ruang piksel -------------------------------------------------------------------------------------------------------------------
def sel_darat():
    """Himpunan sel 0,1 derajat (round(lat*10), round(lon*10)) yang memuat titik kisi kabupaten; di-cache."""
    p = os.path.join(CACHE, "darat_sel.json")
    if os.path.exists(p):
        return {tuple(x) for x in json.load(open(p))}
    s = {(round(la * 10), round(lo * 10)) for _, (_, pts) in AH.titik_kab().items() for la, lo in pts}
    os.makedirs(CACHE, exist_ok=True)
    json.dump(sorted(s), open(p, "w"))
    return s


def _dilasi(b, n, ncol):
    """Dilasi 3x3 sebanyak n kali pada bytearray 0/1 lewat bilangan bulat besar (tepi baris bocor 1 piksel, diabaikan)."""
    pj = len(b)
    m = int.from_bytes(b, "little")
    batas = (1 << (8 * pj)) - 1
    for _ in range(n):
        m |= (m << 8) | (m >> 8)
        m |= ((m << (8 * ncol)) | (m >> (8 * ncol)))
        m &= batas
    return bytearray(m.to_bytes(pj, "little"))


def topeng():
    """bytearray NCOL*NLIN: 2 darat, 1 pesisir (<= ~6 km dari darat), 0 laut."""
    p = os.path.join(CACHE, "darat.bin")
    if os.path.exists(p) and os.path.getsize(p) == NCOL * NLIN:
        return bytearray(open(p, "rb").read())
    inti = bytearray(NCOL * NLIN)
    for ky, kx in sel_darat():
        for i in range(-3, 4):
            for j in range(-3, 4):
                kl = AH.proyeksi(ky / 10 + i * 0.0143, kx / 10 + j * 0.0143, P0)
                if kl and 0 <= kl[1] - L0 < NLIN and 1 <= kl[0] <= NCOL:
                    inti[(kl[1] - L0) * NCOL + kl[0] - 1] = 1
    inti = _dilasi(inti, 1, NCOL)
    pes = _dilasi(inti, 3, NCOL)
    m = bytearray((int.from_bytes(inti, "little") + int.from_bytes(pes, "little")).to_bytes(NCOL * NLIN, "little"))
    os.makedirs(CACHE, exist_ok=True)
    open(p, "wb").write(m)
    return m


# ---- kisi dan fitur --------------------------------------------------------------------------------------------------------------------------------
class Kisi:
    """Kisi datar: larik suhu kecerahan (K, 0 = tak sah) + topeng darat + fungsi lokasi/kelas waktu. Dibangun dari segmen nyata atau sintetis."""
    def __init__(self, ncol, nlin, t7, t13, t14, t15, mask, lokasi, kelas_blok):
        self.ncol, self.nlin, self.T7, self.T13, self.T14, self.T15, self.mask = ncol, nlin, t7, t13, t14, t15, mask
        self.lokasi, self.kelas_blok = lokasi, kelas_blok


def _lut(kal, cache):
    if kal not in cache:
        l = [AH.tb(c, kal) or 0.0 for c in range(65536)]
        l[65534] = l[65535] = 0.0
        cache[kal] = l
    return cache[kal]


def kisi_dari_seg(seg, w, mask=None):
    cache = {}
    A = {}
    for b in PITA:
        a = array("f")
        for s in SEGS:
            _, kal, _, _, _, d = seg[(b, s)]
            a.extend(array("f", map(_lut(kal, cache).__getitem__, d)))
        A[b] = a
    mask = mask if mask is not None else topeng()
    nb = math.ceil(NCOL / BLOK)
    kb = []
    for by in range(0, NLIN, BLOK):
        for bx in range(0, NCOL, BLOK):
            ll = PN.invers(min(bx + BLOK // 2, NCOL) , L0 + min(by + BLOK // 2, NLIN - 1), P0)
            kb.append(1 if not ll else (0 if matahari(ll[0], ll[1], w)[0] > MALAM_ZEN else 1 if matahari(ll[0], ll[1], w)[0] < SIANG_ZEN else 2))

    def lokasi(i):
        return PN.invers(i % NCOL + 1, L0 + i // NCOL, P0)

    def kelas_blok(i):
        return ("malam", "siang", "senja")[kb[(i // NCOL // BLOK) * nb + (i % NCOL) // BLOK]]
    return Kisi(NCOL, NLIN, A[7], A[13], A[14], A[15], mask, lokasi, kelas_blok)


def berawan(g, i, kls):
    """0 cerah, 1 awan, 2 tak sah. Awan: B14 dingin, atau beda split-window B13-B15 besar pada B14 dingin (sirus), atau siang: B14 sejuk dan B07-B14 kecil (ALGORITMA 1)."""
    t14 = g.T14[i]
    if t14 < 150.0 or g.T7[i] < 150.0:
        return 2
    if t14 < AWAN_T14:
        return 1
    if g.T13[i] > 150.0 and g.T15[i] > 150.0 and g.T13[i] - g.T15[i] > AWAN_BTD and t14 < AWAN_BTD_T14:
        return 1
    if kls != "malam" and t14 < AWAN_SIANG_T14 and g.T7[i] - t14 < AWAN_SIANG_DT:
        return 1
    return 0


def _latar(g, y, x, h, kls, cand, pusat):
    """(n, rerata T07, sd T07, rerata dT, sd dT, area) piksel latar sah di jendela (2h+1)^2: darat/pesisir, cerah, bukan calon, bukan pusat."""
    n = s7 = q7 = sd = qd = area = 0
    nc = g.ncol
    for yy in range(max(0, y - h), min(g.nlin, y + h + 1)):
        b = yy * nc
        for i in range(b + max(0, x - h), b + min(nc, x + h + 1)):
            if i == pusat:
                continue
            area += 1
            if not g.mask[i] or cand[i] or berawan(g, i, kls):
                continue
            t7 = g.T7[i]
            d = t7 - g.T14[i]
            n += 1; s7 += t7; q7 += t7 * t7; sd += d; qd += d * d
    if n == 0:
        return 0, 0.0, 0.0, 0.0, 0.0, area
    m7, md = s7 / n, sd / n
    return n, m7, math.sqrt(max(0.0, q7 / n - m7 * m7)), md, math.sqrt(max(0.0, qd / n - md * md)), area


def hitung_fitur(g, w):
    """Calon (uji piksel mutlak ALGORITMA 1) + statistik latar. Tidak memutuskan api; putuskan() yang memutuskan agar parameter bisa dikalibrasi."""
    nc = g.ncol
    cand = bytearray(g.ncol * g.nlin)
    daftar = []
    T7, T14, mask = g.T7, g.T14, g.mask
    lo_t7 = min(v[0] for v in CAND.values())
    for i, v in enumerate(T7):
        if v > lo_t7 and mask[i]:
            kb = g.kelas_blok(i)
            t7min, dtmin = CAND["malam" if kb == "malam" else "siang"]
            t14 = T14[i]
            if v > t7min and t14 > 150.0 and v - t14 > dtmin and berawan(g, i, kb) == 0:
                cand[i] = 1
                daftar.append(i)
    out = []
    for i in daftar:
        y, x = divmod(i, nc)
        ll = g.lokasi(i)
        if not ll:
            continue
        zs, azs = matahari(ll[0], ll[1], w)
        kls = kelas_zen(zs)
        zv, azv = satelit(ll[0], ll[1])
        n = area = 0
        for h in JENDELA:
            n, m7, s7, md, sdd, area = _latar(g, y, x, h, kls, cand, i)
            if n >= LATAR_N_MIN and n >= LATAR_FRAKSI * area:
                break
        lk = 0 if (n >= LATAR_N_MIN and n >= LATAR_FRAKSI * area) else 1
        ta = sum(1 for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and 0 <= y + dy < g.nlin and 0 <= x + dx < nc
                 and berawan(g, i + dy * nc + dx, kls) == 1)
        out.append({"la": round(ll[0], 3), "lo": round(ll[1], 3), "t7": round(T7[i], 1), "t14": round(T14[i], 1), "m7": round(m7, 2), "s7": round(s7, 2),
                    "md": round(md, 2), "sd": round(sdd, 2), "n": n, "h": h, "lk": lk, "kls": kls, "ta": ta, "da": 1 if g.mask[i] == 2 else 0,
                    "kil": round(sudut_kilau(zs, azs, zv, azv), 1), "zs": round(zs, 1)})
    return out


def persen_awan(g, kls_default="siang"):
    """Persen piksel darat/pesisir berawan, cuplik tiap 8 piksel (ALGORITMA 5: 'awan_persen' wajib supaya 'tidak terdeteksi' tak dibaca bebas api)."""
    n = a = 0
    for y in range(0, g.nlin, 8):
        for x in range(0, g.ncol, 8):
            i = y * g.ncol + x
            if g.mask[i]:
                k = berawan(g, i, g.kelas_blok(i))
                if k != 2:
                    n += 1
                    a += k
    return round(100.0 * a / n, 1) if n else None


# ---- keputusan --------------------------------------------------------------------------------------------------------------------------------------
def _titik_statis(utama=True, viirs=False):
    """Daftar [(lat, lon, r_km)] sumber statis. utama: kawah GVP (aturan.GUNUNG_API) dan PLTU WRI (bukan VIIRS). viirs: tambahan yang LAHIR dari VIIRS (dilaporkan terpisah)."""
    s = []
    if utama:
        ap = _muat("data_aturan", os.path.join(AKAR, "scripts/data/aturan.py"))
        s += [(la, lo, R_KAWAH_KM) for _, la, lo in ap.GUNUNG_API]
        s += [(p["lat"], p["lon"], R_PLTU_KM) for p in json.load(open(os.path.join(AKAR, "public/udara/data/pltu.json")))]
    if viirs:
        tp = json.load(open(os.path.join(AKAR, "public/data/titik_palsu.json")))
        s += [(t["lat"], t["lon"], R_TITIK_PALSU_KM) for t in tp["sumber_statis"]]
        for baris in csv.reader(l for l in open(os.path.join(AKAR, "scripts/data/himawari_alarm_palsu.csv")) if not l.startswith("#")):
            if baris and baris[0] != "lat":
                s.append((float(baris[0]), float(baris[1]), R_ALARM_PALSU_KM))
        for baris in csv.reader(l for l in open(os.path.join(AKAR, "scripts/data/suar_gas_ggfr.csv")) if not l.startswith("#")):
            if baris and baris[0] != "lat":
                s.append((float(baris[0]), float(baris[1]), R_SUAR_KM))
    return s


def putuskan(f, par, statis=()):
    """Alarm api atau None untuk satu calon. par = {"siang": {...}, "malam": {...}} (BAWAAN atau hasil kalibrasi). statis = [(lat, lon, r_km)].
    Jalur: latar cukup -> kilau -> uji mutlak -> uji kontekstual -> sumber statis. TIDAK memakai VIIRS maupun penanda()."""
    kls = f["kls"]
    p = par["malam"] if kls == "malam" else par["siang"]
    if kls != "malam" and f["kil"] < KILAU_DERAJAT and not f["da"]:
        return None                                            # kilau matahari di air/pesisir
    if p.get("tepi") and kls != "malam" and f["ta"] >= 1:
        return None                                            # tepi awan (siang)
    kk = "malam" if kls == "malam" else "siang"
    tegas = f["t7"] > T_TEGAS[kk]
    dt_ = f["t7"] - f["t14"]
    if not tegas:
        if f["lk"]:
            return None                                        # latar_kurang: tidak dinilai
        if f["t7"] <= p["t7"] or dt_ <= CAND[kk][1]:
            return None
        s7, sd_ = max(f["s7"], SD_LANTAI), max(f["sd"], SD_LANTAI)
        if not (f["t7"] > f["m7"] + p["k"] * s7 and dt_ > f["md"] + (p["k"] + K_DT_TAMBAH) * sd_ and dt_ > f["md"] + p["bg"]):
            return None
    for la, lo, r in statis:
        if abs(la - f["la"]) < 0.3 and jarak_km(la, lo, f["la"], f["lo"]) <= r:
            return None
    s7 = max(f["s7"], SD_LANTAI)
    kuat = f["t7"] > KUAT_T07 or (not f["lk"] and f["t7"] - f["m7"] >= KUAT_SD * s7)
    return {"lat": f["la"], "lon": f["lo"], "kelas": "kuat" if kuat else "sedang", "kls": kls, "tb07": f["t7"], "dt": round(dt_, 1)}


def dokumen_api(seg, w, p=None, par=None, mask=None):
    """Antarmuka pemindai: dokumen DESAIN-TEKNIS 5. seg = {(pita, segmen): AH.baca_segmen(...)}; w = waktu mulai pindai (UTC)."""
    g = kisi_dari_seg(seg, w, mask)
    fitur = hitung_fitur(g, w)
    par = par or parameter_terkunci()
    st = _titik_statis(True, False)
    titik = [a for a in (putuskan(f, par, st) for f in fitur) if a]
    return {"acuan": f"{w:%Y-%m-%dT%H:%MZ}", "status_sumber": "hidup", "sejak": None, "versi_kriteria": 1, "vonis": "menunggu",
            "sumber": "Himawari-9 L1b (JMA) lewat NOAA ODD", "awan_persen": persen_awan(g),
            "titik": [{"lon": a["lon"], "lat": a["lat"], "kelas": a["kelas"], "frp_mw": None, "tb07": a["tb07"], "dt": a["dt"]} for a in titik]}


def impor_penanda():
    return _muat("data_himawari", os.path.join(AKAR, "scripts/data/himawari.py")).penanda


def daftar_penanda(*a, **k):
    """Pembungkus untuk pemindai/Worker. DILARANG dipanggil dari kalibrasi/vonis (T7b); dijaga oleh prasyarat()."""
    return impor_penanda()(*a, **k)


def parameter_terkunci():
    if os.path.exists(KALIBRASI):
        return json.load(open(KALIBRASI))["parameter"]
    return BAWAAN


def ekstrak_cuplikan(w, hapus=False):
    p = os.path.join(CACHE, "fitur", f"{w:%Y%m%d%H%M}.json.gz")
    if os.path.exists(p):
        return
    t0 = time.time()
    unduh(w)
    t1 = time.time()
    g = kisi_dari_seg(muat_seg(w), w)
    f = hitung_fitur(g, w)
    _gz_tulis(p, {"w": f"{w:%Y%m%d%H%M}", "fitur": f, "awan_persen": persen_awan(g)})
    print(f"{w:%Y%m%d%H%M}: {len(f)} calon, unduh {t1 - t0:.0f} s, hitung {time.time() - t1:.0f} s", flush=True)
    if hapus:
        for b in PITA:
            for s in SEGS:
                try:
                    os.remove(os.path.join(CACHE, "hsd", os.path.basename(kunci_s3(w, b, s))))
                except OSError:
                    pass


# ---- label VIIRS dan pembanding --------------------------------------------------------------------------------------------------------------------
def tmenit(tgl, hhmm):
    y, m, d = map(int, tgl.split("-"))
    h = str(hhmm).zfill(4)
    return (dt.date(y, m, d) - dt.date(2000, 1, 1)).days * 1440 + int(h[:2]) * 60 + int(h[2:])


def tmenit_dt(w):
    return (w.date() - dt.date(2000, 1, 1)).days * 1440 + w.hour * 60 + w.minute


def sel(lat, lon):
    return (round(lat * 10), round(lon * 10))


def _baca_viirs(nama, tanggal_set, tahun_klim=None):
    """Lalu-lintas CSV FIRMS. -> (rekaman [[tmenit, lat, lon, nh, frp, sat]], hitungan_klim {bulan: {sel: {tanggal}}})."""
    rek, klim = [], {8: {}, 9: {}, 10: {}}
    with open(os.path.join(AKAR, "data/raw/firms", nama), newline="") as f:
        r = csv.reader(f)
        h = next(r)
        ix = {k: h.index(k) for k in ("latitude", "longitude", "acq_date", "acq_time", "satellite", "confidence", "frp")}
        it = h.index("type") if "type" in h else None
        for row in r:
            tg = row[ix["acq_date"]]
            tipe = row[it] if it is not None and len(row) > it else "0"
            if tipe not in ("0", ""):
                continue
            nh = 1 if row[ix["confidence"]] in ("n", "h", "nominal", "high") else 0
            if tg in tanggal_set:
                rek.append([tmenit(tg, row[ix["acq_time"]]), round(float(row[ix["latitude"]]), 4), round(float(row[ix["longitude"]]), 4), nh,
                            float(row[ix["frp"]] or 0), SAT.get(row[ix["satellite"]], 3)])
            if tahun_klim and nh and tg[:4] in tahun_klim and int(tg[5:7]) in klim:
                klim[int(tg[5:7])].setdefault(sel(float(row[ix["latitude"]]), float(row[ix["longitude"]])), set()).add(tg)
    return rek, klim


def tanggal_peran(peran):
    s = set()
    for w, p, _ in sampel():
        if p == peran:
            for k in (0, 1):
                s.add((w.date() - dt.timedelta(days=k)).isoformat())
    return s


def bangun_label(peran):
    p = os.path.join(CACHE, f"api_label_{peran}.json.gz")
    if os.path.exists(p):
        return _gz_baca(p)
    tg = tanggal_peran(peran)
    rek = []
    for n in LABEL_CSV:
        r, _ = _baca_viirs(n, tg)
        rek += r
        print(f"label {peran} {n}: {len(r)}", flush=True)
    _gz_tulis(p, rek)
    return rek


def bangun_klim():
    p = os.path.join(CACHE, "api_klim.json.gz")
    if os.path.exists(p):
        return {int(b): {tuple(map(int, k.split(","))): n for k, n in d.items()} for b, d in _gz_baca(p).items()}
    _, k = _baca_viirs("viirs.csv", set(), tahun_klim={str(y) for y in range(2019, 2026)})   # S-NPP 2019-2025, bulan 8-10
    out = {str(b): {f"{a},{c}": len(v) for (a, c), v in d.items()} for b, d in k.items()}
    _gz_tulis(p, out)
    return {int(b): {tuple(map(int, k.split(","))): n for k, n in d.items()} for b, d in out.items()}


def muat_label(peran, buka_uji=False):
    if peran == "uji" and not buka_uji:
        raise RuntimeError("label minggu uji tidak boleh dibaca di luar vonis() yang sudah membuka api_himawari.buka (T8)")
    return bangun_label(peran)


def _indeks(rek):
    ix = {}
    for r in rek:
        ix.setdefault((int(r[1] * 2), int(r[2] * 2)), []).append(r)
    return ix


def _dekat(ix, la, lo, r_km):
    """True bila ada rekaman dalam r_km dari (la, lo); juga kembalikan daftar rekaman dalam jangkauan."""
    pad = int(r_km / 55) + 1
    k = (int(la * 2), int(lo * 2))
    hasil = []
    for a in range(k[0] - pad, k[0] + pad + 1):
        for b in range(k[1] - pad, k[1] + pad + 1):
            for r in ix.get((a, b), ()):
                if jarak_km(la, lo, r[1], r[2]) <= r_km:
                    hasil.append(r)
    return hasil


def klaster(rek, r_km):
    """Gugus tautan-tunggal pada jarak r_km. -> daftar gugus (daftar rekaman)."""
    n = len(rek)
    induk = list(range(n))

    def cari(a):
        while induk[a] != a:
            induk[a] = induk[induk[a]]
            a = induk[a]
        return a
    ix = {}
    for i, r in enumerate(rek):
        ix.setdefault((int(r[1] * 10), int(r[2] * 10)), []).append(i)
    for i, r in enumerate(rek):
        k = (int(r[1] * 10), int(r[2] * 10))
        for a in (-1, 0, 1):
            for b in (-1, 0, 1):
                for j in ix.get((k[0] + a, k[1] + b), ()):
                    if j > i and jarak_km(r[1], r[2], rek[j][1], rek[j][2]) <= r_km:
                        induk[cari(j)] = cari(i)
    g = {}
    for i in range(n):
        g.setdefault(cari(i), []).append(rek[i])
    return list(g.values())


def tiebreak(kunci):
    return zlib.crc32(kunci.encode())


def _ctx(sc, rek, klim, darat, kr):
    """Bagian per-pindaian yang tak bergantung parameter (diingat di sc['_c'])."""
    if "_c" in sc:
        return sc["_c"]
    w = sc["w"]
    ts = tmenit_dt(w) + kr["menit_segmen"]
    jw, rc, r3 = kr["jendela_menit"], kr["r_tercakup_km"], kr["r_cocok_km"]
    hari = [r for r in rek if ts - 1500 <= r[0] <= ts + jw]
    semua = [r for r in hari if abs(r[0] - ts) <= jw]
    nh = [r for r in semua if r[3]]
    ix_s, ix_n = _indeks(semua), _indeks(nh)
    pos = {sel(r[1], r[2]) for r in nh}
    ub = {c for c in darat if _dekat(ix_s, c[0] / 10, c[1] / 10, rc)} | pos
    pers = {}
    for r in hari:
        if ts - 1440 <= r[0] < ts - jw - 1 and r[3]:
            pers[sel(r[1], r[2])] = pers.get(sel(r[1], r[2]), 0) + 1
    gug = klaster(nh, r3)
    sc["_c"] = {"ts": ts, "ix_s": ix_s, "ix_n": ix_n, "pos": pos, "ub": ub, "pers": pers, "klim": klim.get(w.month, {}), "gug": gug}
    return sc["_c"]


def nilai_scan(sc, par, statis, rek, klim, darat, kr, dasar=True):
    """Evaluasi satu pindaian. sc = {"w": datetime, "fitur": [...]}; rek = rekaman VIIRS (hari itu dan sebelumnya).
    -> dict hitungan mentah (dijumlah pemanggil). Tidak memakai penanda() atau saringan VIIRS 72 jam. dasar=False melewati pembanding (kalibrasi)."""
    c = _ctx(sc, rek, klim, darat, kr)
    w, ts = sc["w"], c["ts"]
    rc, r3, r5 = kr["r_tercakup_km"], kr["r_cocok_km"], kr["r_cocok_sens_km"]
    alarm = [a for a in (putuskan(f, par, statis) for f in sc["fitur"]) if a]
    pik = []
    for a in alarm:
        ev = bool(_dekat(c["ix_s"], a["lat"], a["lon"], rc))
        pik.append({"kelas": a["kelas"], "kls": "malam" if a["kls"] == "malam" else "siang", "ev": ev,
                    "tp3": ev and bool(_dekat(c["ix_n"], a["lat"], a["lon"], r3)), "tp5": ev and bool(_dekat(c["ix_n"], a["lat"], a["lon"], r5)),
                    "la": a["lat"], "lo": a["lon"]})
    ix_a = _indeks([[0, p["la"], p["lo"]] for p in pik])
    gug = []
    for g in c["gug"]:
        la, lo = sum(r[1] for r in g) / len(g), sum(r[2] for r in g) / len(g)
        gug.append({"frp": round(sum(r[4] for r in g), 1), "tv": min(r[0] for r in g) - ts,
                    "hit3": bool(_dekat(ix_a, la, lo, r3 + 1.5)), "hit5": bool(_dekat(ix_a, la, lo, r5 + 1.5))})
    sel_alarm = {sel(p["la"], p["lo"]) for p in pik if p["ev"]}
    n_m = len(sel_alarm)
    out = {"n": n_m, "hit": len(sel_alarm & c["pos"]), "pos": len(c["pos"]), "pers": 0, "klim": 0}
    if dasar and n_m:
        U = c["ub"] | sel_alarm
        kunci = f"{w:%Y%m%d%H%M}"
        for nm in ("pers", "klim"):
            skor = c[nm]
            urut = sorted(U, key=lambda x: (-skor.get(x, 0), tiebreak(f"{kunci}|{x[0]}|{x[1]}")))
            out[nm] = sum(1 for x in urut[:n_m] if x in c["pos"])
    return {"pik": pik, "gug": gug, "sel": out}


def muat_scans(peran):
    out = []
    for w, p, m in sampel():
        if p != peran:
            continue
        f = os.path.join(CACHE, "fitur", f"{w:%Y%m%d%H%M}.json.gz")
        if not os.path.exists(f):
            continue
        d = _gz_baca(f)
        out.append({"w": w, "minggu": m, "jam": w.hour, "fitur": d["fitur"], "awan_persen": d["awan_persen"]})
    return out


def csi(sel_):
    d = sel_["n"] + sel_["pos"] - sel_["hit"]
    return sel_["hit"] / d if d else 0.0


def kalibrasi(kr):
    """Pilih parameter siang dan malam dengan CSI sel 0,1 derajat tertinggi PADA MINGGU KALIBRASI SAJA. Seri ke indeks grid terkecil."""
    scans = muat_scans("kalibrasi")
    if not scans:
        raise SystemExit("tak ada fitur minggu kalibrasi: jalankan `panen --peran kalibrasi`")
    rek = muat_label("kalibrasi")
    klim, darat = bangun_klim(), sel_darat()
    st = _titik_statis(True, False)
    hasil = {}
    for kind, jam in (("siang", 6), ("malam", 18)):
        sub = [s for s in scans if s["jam"] == jam]
        grid = GRID[kind]
        kombo = [dict(t7=a, k=b, bg=c, **({"tepi": d} if kind == "siang" else {}))
                 for a in grid["t7"] for b in grid["k"] for c in grid["bg"] for d in (grid.get("tepi", (None,)))]
        tabel = []
        for kb in kombo:
            par = {"siang": dict(BAWAAN["siang"]), "malam": dict(BAWAAN["malam"])}
            par[kind] = kb
            tot = {"n": 0, "hit": 0, "pos": 0}
            for s in sub:
                s2 = dict(s, fitur=[f for f in s["fitur"] if (f["kls"] == "malam") == (kind == "malam")])
                r = nilai_scan(s2, par, st, rek, klim, darat, kr, dasar=False)["sel"]
                for k in tot:
                    tot[k] += r[k]
            tabel.append({"par": kb, **tot, "csi": round(csi(tot), 5)})
        terbaik = max(range(len(tabel)), key=lambda i: (tabel[i]["csi"], -i))
        hasil[kind] = {"terpilih": tabel[terbaik]["par"], "tabel": tabel, "n_pindaian": len(sub)}
    return {"parameter": {k: hasil[k]["terpilih"] for k in hasil}, "sidik": SD.cek(SIDIK)["sidik"], "rincian": hasil,
            "dibuat": dt.datetime.now(UTC).strftime("%Y-%m-%dT%H:%MZ")}


def _agregasi(hasil_scan):
    ag = {"piksel": {}, "gugus": {"n": 0, "hit3": 0, "hit5": 0, "frp": {}, "tv": []}, "sel": {"n": 0, "hit": 0, "pos": 0, "pers": 0, "klim": 0}}
    for sc in hasil_scan:
        for p in sc["pik"]:
            if not p["ev"]:
                continue
            for k in ("semua", p["kls"], "kelas_" + p["kelas"]):
                c = ag["piksel"].setdefault(k, {"n": 0, "tp3": 0, "tp5": 0})
                c["n"] += 1; c["tp3"] += p["tp3"]; c["tp5"] += p["tp5"]
        for g in sc["gug"]:
            a = ag["gugus"]
            a["n"] += 1; a["hit3"] += g["hit3"]; a["hit5"] += g["hit5"]
            k = "<10 MW" if g["frp"] < 10 else "10-50 MW" if g["frp"] < 50 else ">=50 MW"
            c = a["frp"].setdefault(k, {"n": 0, "hit3": 0})
            c["n"] += 1; c["hit3"] += g["hit3"]
            if g["hit3"]:
                a["tv"].append(g["tv"])
        for k in ag["sel"]:
            ag["sel"][k] += sc["sel"][k]
    return ag


def _rasio(a, b):
    return round(a / b, 4) if b else None


def laporan(scans, rek, kr, par, klim, darat, varian):
    """Metrik utama + bootstrap per minggu untuk satu himpunan pindaian. varian: {nama: statis}."""
    out = {}
    for nama, st in varian.items():
        hs = [(s, nilai_scan(s, par, st, rek, klim, darat, kr)) for s in scans]
        ag = _agregasi([h for _, h in hs])
        pk = ag["piksel"]
        gg = ag["gugus"]
        tv = gg.pop("tv")
        o = {"presisi_piksel": {k: {"n_alarm": v["n"], "presisi_3km": _rasio(v["tp3"], v["n"]), "presisi_5km": _rasio(v["tp5"], v["n"])} for k, v in sorted(pk.items())},
             "recall_gugus": {"n_gugus": gg["n"], "recall_3km": _rasio(gg["hit3"], gg["n"]), "recall_5km": _rasio(gg["hit5"], gg["n"]),
                              "per_frp": {k: {"n": v["n"], "recall_3km": _rasio(v["hit3"], v["n"])} for k, v in sorted(gg["frp"].items())}},
             "menit_dahulu": {"n": len(tv), "median": round(statistics.median(tv), 1) if tv else None,
                              "catatan": "Himawari lebih dahulu = positif; hanya gugus yang cocok pada jendela +-30 menit, cuplikan 2 pindaian/hari: batas bawah kemampuan, bukan menit-dahulu sebenarnya"},
             "sel": ag["sel"]}
        baris = [{"minggu": s["minggu"], **h["sel"]} for s, h in hs]
        sl = ag["sel"]
        for nm, k in (("persistensi", "pers"), ("klimatologi", "klim")):
            fn = (lambda kk: (lambda b: _rasio_selisih(b, kk)))(k)
            try:
                bs = PB.bootstrap_blok(fn, baris, "minggu", B=kr["bootstrap"]["B"], seed=kr["bootstrap"]["seed"])
            except ValueError as e:
                bs = {"alasan": str(e), "est": None, "lo": None, "hi": None}
            o.setdefault("lawan_pembanding", {})[nm] = {"presisi_model": _rasio(sl["hit"], sl["n"]), "presisi_pembanding": _rasio(sl[k], sl["n"]),
                                                          "selisih": bs.get("est"), "selang95": [bs.get("lo"), bs.get("hi")], "n_minggu": bs.get("n_blok")}
        out[nama] = o
    return out


def _rasio_selisih(baris, k):
    n = sum(b["n"] for b in baris)
    return (sum(b["hit"] for b in baris) - sum(b[k] for b in baris)) / n if n else None


def putusan_akhir(utama, kr):
    n_pos = utama["sel"]["pos"]
    if n_pos < kr["min_label"]:
        return "tak_dapat_dinilai", f"sel positif {n_pos} < {kr['min_label']}"
    lp = utama["lawan_pembanding"]
    ok = all(v["selisih"] is not None and v["selisih"] > 0 and v["selang95"][0] is not None and v["selang95"][0] > 0 for v in lp.values())
    return ("lolos_retrospektif" if ok else "tidak_lolos"), "selisih > 0 dan batas bawah selang 95% > 0 untuk KEDUA pembanding" if ok else \
        "tidak memenuhi: " + "; ".join(f"{k} selisih {v['selisih']} selang {v['selang95']}" for k, v in lp.items())


def kriteria():
    return json.load(open(KRITERIA))


def jalankan_evaluasi(peran, buka_uji=False):
    kr = kriteria()
    par = parameter_terkunci()
    scans = muat_scans(peran)
    rek = muat_label(peran, buka_uji)
    klim, darat = bangun_klim(), sel_darat()
    varian = {"utama": _titik_statis(True, False), "tanpa_saringan": [], "memakai_viirs": _titik_statis(True, True)}
    rap = laporan(scans, rek, kr, par, klim, darat, varian)
    v, alasan = putusan_akhir(rap["utama"], kr)
    return {"peran": peran, "n_pindaian": len(scans), "parameter": par, "vonis": v, "alasan": alasan, "angka_utama": rap["utama"],
            "tanpa_saringan": rap["tanpa_saringan"], "memakai_viirs_BUKAN_ANGKA_UTAMA": rap["memakai_viirs"], "batas_klaim": kr["batas_klaim"]}


# ---- sidik, prasyarat, vonis -----------------------------------------------------------------------------------------------------------------------
BERKAS_KODE = ["scripts/data/api_himawari.py", "scripts/umum/himawari_pindai.py", "scripts/umum/sidik.py", "scripts/umum/pembanding.py", "scripts/umum/gerbang.py",
               "scripts/udara/awan_himawari.py", "scripts/data/aturan.py", "scripts/data/himawari.py", "scripts/data/himawari_alarm_palsu.csv",
               "scripts/data/suar_gas_ggfr.csv", "public/data/titik_palsu.json", "public/udara/data/pltu.json"]


def hash_masukan():
    h = hashlib.sha256(json.dumps([[f"{w:%Y%m%d%H%M}", p, m] for w, p, m in sampel()]).encode()).hexdigest()
    ukuran = [f"{n}:{os.path.getsize(os.path.join(AKAR, 'data/raw/firms', n))}" for n in LABEL_CSV]
    return [h] + ukuran


def kunci():
    os.chdir(AKAR)
    if os.path.exists(BUKA):
        sys.exit(f"{BUKA} sudah ada: sidik tak boleh ditulis ulang")
    d = SD.tulis(os.path.relpath(SIDIK, AKAR), BERKAS_KODE, os.path.relpath(KRITERIA, AKAR), hash_masukan())
    print("sidik", d["sidik"])


def graf_panggilan():
    pohon = ast.parse(open(os.path.abspath(__file__)).read())
    fungsi = {n.name: n for n in pohon.body if isinstance(n, ast.FunctionDef)}
    anak = {}
    for nama, n in fungsi.items():
        anak[nama] = {c.func.id for c in ast.walk(n) if isinstance(c, ast.Call) and isinstance(c.func, ast.Name)} | \
                     {c.func.attr for c in ast.walk(n) if isinstance(c, ast.Call) and isinstance(c.func, ast.Attribute)}
    return fungsi, anak


def terjangkau(akar, anak):
    lihat, tumpuk = set(), [akar]
    while tumpuk:
        x = tumpuk.pop()
        if x in lihat:
            continue
        lihat.add(x)
        tumpuk += [y for y in anak.get(x, ()) if y in anak]
    return lihat


def prasyarat(kunci_ok=True):
    """T7b dan T8. Kembalikan daftar masalah (kosong = lolos)."""
    masalah = []
    fungsi, anak = graf_panggilan()
    for jalur in ("kalibrasi", "jalankan_evaluasi", "vonis"):
        t = terjangkau(jalur, anak)
        for terlarang in ("penanda", "daftar_penanda", "impor_penanda"):
            if terlarang in t or any(terlarang in anak.get(x, ()) for x in t):
                masalah.append(f"jalur {jalur} menjangkau {terlarang}() (T7b)")
    if "impor_penanda" not in fungsi or ".penanda" not in ast.unparse(fungsi["impor_penanda"]) or "himawari.py" not in ast.unparse(fungsi["impor_penanda"]):
        masalah.append("penanda tidak diimpor dari himawari.py (T7)")
    kr = kriteria()
    for k in ("batas_klaim", "pembagian", "cuplikan", "label", "metrik", "lulus", "pembanding", "kemandirian_label", "grid"):
        if k not in kr:
            masalah.append(f"kriteria tanpa kunci {k}")
    if "mengukur kesepakatan dengan VIIRS" not in kr.get("batas_klaim", ""):
        masalah.append("teks batas klaim tak ada")
    if kunci_ok:
        if not os.path.exists(SIDIK):
            masalah.append("api_himawari.sidik belum ada")
        else:
            os.chdir(AKAR)
            try:
                SD.cek(os.path.relpath(SIDIK, AKAR))
            except SystemExit:
                masalah.append("sidik berubah (T8)")
    return masalah


def vonis():
    os.chdir(AKAR)
    m = prasyarat()
    if m:
        sys.exit("prasyarat gagal: " + "; ".join(m))
    if not os.path.exists(KALIBRASI) or json.load(open(KALIBRASI))["sidik"] != SD.cek(os.path.relpath(SIDIK, AKAR))["sidik"]:
        sys.exit("kalibrasi.json hilang atau dibuat di bawah sidik lain: jalankan kalibrasi dulu")
    sd = SD.cek(os.path.relpath(SIDIK, AKAR))["sidik"]
    SD.buka(BUKA, JEJAK, sd, "dibuka")
    hasil = jalankan_evaluasi("uji", buka_uji=True)
    hasil["sidik"] = sd
    json.dump(hasil, open(HASIL, "w"), indent=1, ensure_ascii=False)
    with open(JEJAK, "a") as f:
        f.write(json.dumps({"sidik": sd, "vonis": hasil["vonis"], "alasan": hasil["alasan"]}, ensure_ascii=False) + "\n")
    print(hasil["vonis"], hasil["alasan"])


# ---- ukuran keluaran nyata untuk gerbang anggaran ---------------------------------------------------------------------------------------------------
def ukur_api(tanggal):
    """Unduh 00/06/12/18 UTC, jalankan detektor sungguhan, perbarui kunci 'api' pada himawari_pindai.ukur.json (kunci lain tidak diubah)."""
    ur = json.load(open(PN.UKUR))
    mask = topeng()
    par = parameter_terkunci()
    for b in ur["pindaian"]:
        w = dt.datetime.strptime(b["pindai"], "%Y%m%d%H%M").replace(tzinfo=UTC)
        t0 = time.time()
        unduh(w)
        t1 = time.time()
        dok = dokumen_api(muat_seg(w), w, par=par, mask=mask)
        t2 = time.time()
        j = json.dumps(dok, ensure_ascii=False, separators=(",", ":")).encode()
        b["json_kb"]["api"], b["gz_kb"]["api"] = round(len(j) / 1e3, 1), round(len(gzip.compress(j)) / 1e3, 1)
        b["n_titik_api"] = len(dok["titik"])
        b["detik_hitung_api"] = round(t2 - t1, 1)
        b["detik_hitung"] = round(t2 - t1 + 1.0, 1)      # api nyata + taksiran 1 s untuk proksi awan/abu yang belum diganti
        print(b["pindai"], "titik", len(dok["titik"]), "json", b["json_kb"]["api"], "KB gz", b["gz_kb"]["api"], "KB; hitung", round(t2 - t1), "s", flush=True)
    ur["catatan"] = "detik_hitung = api nyata + 1 s taksiran proksi awan/abu; api = keluaran detektor kontekstual api_himawari.py (ST-04, parameter BAWAAN); awan dan abu masih proksi ukuran"
    json.dump(ur, open(PN.UKUR, "w"), indent=1)


# ---- self-check -------------------------------------------------------------------------------------------------------------------------------------
def _kisi_sintetis(ncol=60, nlin=60, dasar7=300.0, dasar14=293.0, siang=True, ubah=None, cloud=None):
    n = ncol * nlin
    T7, T14, T13, T15 = array("f", [dasar7] * n), array("f", [dasar14] * n), array("f", [dasar14 - 0.5] * n), array("f", [dasar14 - 1.0] * n)
    # relief kecil deterministik supaya sd latar > 0
    for i in range(n):
        T7[i] += ((i * 7) % 5 - 2) * 0.4
        T14[i] += ((i * 3) % 5 - 2) * 0.2
    for (y, x, a, b) in (ubah or []):
        T7[y * ncol + x], T14[y * ncol + x] = a, b
    for (y, x, a) in (cloud or []):
        T14[y * ncol + x] = a
    return Kisi(ncol, nlin, T7, T13, T14, T15, bytearray([2]) * n, lambda i: (-2.0 + (i // ncol) * 0.02, 113.0 + (i % ncol) * 0.02),
                lambda i: "siang" if siang else "malam")


def uji():
    import tempfile
    w = dt.datetime(2026, 8, 5, 6, 0, tzinfo=UTC)
    # geometri: kilau dan zenit
    z, _ = matahari(0.0, 0.0, dt.datetime(2026, 3, 20, 12, 0, tzinfo=UTC))
    assert z < 3.0, z                                              # dekat ekuinoks, siang tengah di bujur 0
    zn, _ = matahari(0.0, 105.0, dt.datetime(2026, 8, 5, 18, 0, tzinfo=UTC))
    assert zn > 95.0, zn                                           # 01.00 waktu surya: malam
    zv, _ = satelit(0.0, 140.7)
    assert zv < 0.5, zv
    zv2, _ = satelit(0.0, 100.0)
    assert 40 < zv2 < 60, zv2
    assert sudut_kilau(5.0, 90.0, 5.0, 270.0) < 0.5 and sudut_kilau(60.0, 90.0, 5.0, 270.0) > 12.0
    # 1. api di latar seragam terdeteksi
    par = BAWAAN
    g = _kisi_sintetis(ubah=[(30, 30, 335.0, 297.0)])
    f = hitung_fitur(g, w)
    a = [putuskan(x, par) for x in f]
    assert sum(1 for x in a if x) == 1 and a[0]["kelas"] == "kuat" and abs(a[0]["lat"] - (-2.0 + 30 * 0.02)) < 0.01, (f, a)
    assert 25 <= f[0]["n"] and f[0]["h"] == 5 and f[0]["lk"] == 0
    # 2. latar seragam panas (semua calon): TIDAK menyala; tak ada latar sah -> latar_kurang
    g = _kisi_sintetis(dasar7=320.0, dasar14=300.0)
    f = hitung_fitur(g, w)
    assert len(f) > 3000 and all(x["lk"] == 1 for x in f) and not any(putuskan(x, par) for x in f)
    # 2b. lahan panas berisik (T07 ~313+-): piksel hangat sedikit di atas rata-rata tidak menyala
    g = _kisi_sintetis(dasar7=309.0, dasar14=295.0, ubah=[(30, 30, 313.5, 299.0)])
    assert not any(putuskan(x, par) for x in hitung_fitur(g, w)), "lahan panas berisik menyalakan alarm"
    # 3. awan: B14 dingin tidak jadi api, dan tidak masuk latar
    g = _kisi_sintetis(ubah=[(30, 30, 335.0, 297.0)], cloud=[(30, 30, 255.0)])
    assert not any(putuskan(x, par) for x in hitung_fitur(g, w))
    assert berawan(_kisi_sintetis(cloud=[(5, 5, 250.0)]), 5 * 60 + 5, "siang") == 1
    g2 = _kisi_sintetis()
    g2.T13[100], g2.T15[100], g2.T14[100] = 262.0 + 20, 262.0 + 16, 280.0        # sirus: B13-B15 = 4 K, B14 dingin sejuk
    assert berawan(g2, 100, "malam") == 1
    # 4. latar kurang: calon dikelilingi awan -> latar_kurang, tak menyala
    nubes = [(y, x, 250.0) for y in range(20, 41) for x in range(20, 41) if (y, x) != (30, 30)]
    g = _kisi_sintetis(ubah=[(30, 30, 335.0, 297.0)], cloud=nubes)
    f = [x for x in hitung_fitur(g, w) if (x["la"], x["lo"]) == (round(-2.0 + 30 * 0.02, 3), round(113.0 + 30 * 0.02, 3))]
    assert f and f[0]["lk"] == 1 and f[0]["h"] == 10 and not putuskan(f[0], par)
    # 5. sumber statis dan kawah dibuang (kawah Agung -8.343, 115.508 dalam 5 km)
    fx = dict(f[0], lk=0, la=-8.35, lo=115.51, t7=335.0, t14=297.0, m7=300.0, s7=1.0, md=7.0, sd=1.0, ta=0, da=1, kil=90.0)
    assert putuskan(fx, par) and not putuskan(fx, par, _titik_statis(True, False))
    fy = dict(fx, la=-2.0, lo=113.0)
    assert putuskan(fy, par, _titik_statis(True, False)) and not putuskan(fy, par, [(-2.0, 113.005, 1.0)])
    # 6. kilau matahari di pesisir dibuang, di darat inti tidak
    fk = dict(fy, kil=5.0, da=0)
    assert putuskan(fk, par) is None and putuskan(dict(fk, da=1), par)
    # 7. malam memakai ambang malam (T07 304 K lolos malam, tidak siang)
    fn = dict(fy, kls="malam", t7=304.0, t14=294.0, m7=297.0, s7=0.5, md=1.0, sd=0.5)
    assert putuskan(fn, par) and not putuskan(dict(fn, kls="siang"), par)
    # 8. api tegas tanpa latar: tetap dihormati awan/statis tapi tidak butuh latar
    ft = dict(fy, lk=1, t7=365.0, t14=300.0)
    assert putuskan(ft, par)
    # 9. grid kalibrasi dan peran: kalibrasi (genap) dan uji (ganjil) saling lepas, 40 pindaian
    sm = sampel()
    assert len(sm) == 40 and len({x[0] for x in sm}) == 40
    assert {p for _, p, _ in sm} == {"kalibrasi", "uji"} and all((m % 2 == 0) == (p == "kalibrasi") for _, p, m in sm)
    assert dt.date(2026, 8, 5) in {w_.date() for w_, _, _ in sm} and max(w_.date() for w_, _, _ in sm) <= dt.date(2026, 10, 12)
    # 10. pembanding: persistensi/klimatologi memilih tepat n sel
    kr = {"menit_segmen": 5, "jendela_menit": 30, "r_tercakup_km": 300, "r_cocok_km": 3, "r_cocok_sens_km": 5}
    wsc = dt.datetime(2026, 8, 5, 6, 0, tzinfo=UTC)
    ts = tmenit_dt(wsc) + 5
    rek = [[ts + 2, -2.0, 113.0, 1, 12.0, 0], [ts - 600, -3.0, 114.0, 1, 5.0, 0], [ts + 3, -2.001, 113.001, 1, 8.0, 1]]
    fa = {"la": -2.0, "lo": 113.0, "t7": 340.0, "t14": 300.0, "m7": 300.0, "s7": 1.0, "md": 7.0, "sd": 1.0, "n": 50, "h": 5, "lk": 0, "kls": "siang", "ta": 0, "da": 1, "kil": 90.0, "zs": 20.0}
    r = nilai_scan({"w": wsc, "fitur": [fa]}, BAWAAN, [], rek, {8: {(-30, 1140): 3}}, {(-20, 1130), (-30, 1140), (-21, 1131)}, kr)
    assert r["pik"][0]["tp3"] and r["sel"]["n"] == 1 and r["sel"]["hit"] == 1 and r["sel"]["pers"] == 0 and r["sel"]["klim"] == 0, r
    assert len(r["gug"]) == 1 and r["gug"][0]["hit3"] and r["gug"][0]["frp"] == 20.0
    # 11. sidik dan buka: berkas berubah ditolak, buka kedua ditolak, label uji tertutup
    asal = os.getcwd()
    with tempfile.TemporaryDirectory() as t:
        try:
            os.chdir(t)
            open("k.py", "w").write("a=1\n"); open("kr.json", "w").write("{}\n")
            SD.tulis("x.sidik", ["k.py"], "kr.json", ["m"])
            SD.cek("x.sidik")
            open("k.py", "w").write("a=2\n")
            try:
                SD.cek("x.sidik")
                raise AssertionError("sidik berubah tapi cek lolos")
            except SystemExit as e:
                assert e.code == 3
            SD.buka("b.buka", None, "s", "x")
            try:
                SD.buka("b.buka", None, "s", "y")
                raise AssertionError("buka kedua lolos")
            except RuntimeError:
                pass
        finally:
            os.chdir(asal)
    try:
        muat_label("uji")
        raise AssertionError("label uji terbaca tanpa buka")
    except RuntimeError:
        pass
    # 12. graf panggilan: kalibrasi/vonis tidak menjangkau penanda
    _, anak = graf_panggilan()
    for j in ("kalibrasi", "jalankan_evaluasi", "vonis"):
        t = terjangkau(j, anak)
        assert not ({"penanda", "daftar_penanda", "impor_penanda"} & t), (j, t)
    assert not prasyarat(kunci_ok=False) or all("sidik" not in x for x in prasyarat(kunci_ok=False)), prasyarat(kunci_ok=False)
    print("uji api_himawari ok")


if __name__ == "__main__":
    a = sys.argv[1:]

    def opsi(k, d=None):
        return a[a.index(k) + 1] if k in a else d
    if a[:1] == ["uji"]:
        uji()
    elif a[:1] == ["prasyarat"]:
        m = prasyarat()
        print("lolos" if not m else "GAGAL: " + "; ".join(m))
        sys.exit(1 if m else 0)
    elif a[:1] == ["dev"]:
        w = dt.datetime.strptime(opsi("--pindai"), "%Y%m%d%H%M").replace(tzinfo=UTC)
        unduh(w)
        t0 = time.time()
        g = kisi_dari_seg(muat_seg(w), w)
        f = hitung_fitur(g, w)
        st = _titik_statis(True, False)
        al = [x for x in (putuskan(y, BAWAAN, st) for y in f) if x]
        print(f"calon {len(f)} latar_kurang {sum(x['lk'] for x in f)} alarm {len(al)} (kuat {sum(x['kelas'] == 'kuat' for x in al)}) awan {persen_awan(g)}% {time.time() - t0:.0f} s")
    elif a[:1] == ["ukur-api"]:
        ukur_api(opsi("--tanggal", "20261123"))
    elif a[:1] == ["kunci"]:
        kunci()
    elif a[:1] == ["panen"]:
        os.chdir(AKAR)
        m = prasyarat()
        if m:
            sys.exit("prasyarat gagal: " + "; ".join(m))
        for w, p, _ in sampel():
            if opsi("--peran") in (None, p):
                try:
                    ekstrak_cuplikan(w, hapus="--hapus" in a)
                except Exception as e:      # pindaian hilang di bucket: dilewati dan dicatat, tidak menghentikan cuplikan
                    print(f"{w:%Y%m%d%H%M}: DILEWATI {e.__class__.__name__} {e}", flush=True)
    elif a[:1] == ["kalibrasi"]:
        os.chdir(AKAR)
        m = prasyarat()
        if m:
            sys.exit("prasyarat gagal: " + "; ".join(m))
        if os.path.exists(BUKA):
            sys.exit("uji sudah dibuka: kalibrasi tak boleh diulang")
        k = kalibrasi(kriteria())
        json.dump(k, open(KALIBRASI, "w"), indent=1)
        print(json.dumps(k["parameter"]), {x: max(r["csi"] for r in k["rincian"][x]["tabel"]) for x in k["rincian"]})
    elif a[:1] == ["coba"]:
        os.chdir(AKAR)
        h = jalankan_evaluasi("kalibrasi")
        print(json.dumps(h, ensure_ascii=False, indent=1)[:6000])
    elif a[:1] == ["vonis"]:
        vonis()
    else:
        sys.exit(__doc__)
