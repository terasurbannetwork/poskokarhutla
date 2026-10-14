"""Bersama untuk scripts/sebaran: muat VIIRS (vegetasi saja), kisi 375 m, wilayah, lahan, kanal, jalan.

Kisi: sel 0,003375 derajat (~375 m, ukuran piksel VIIRS I-band di nadir), titik nol 94 BT / 12 LS.
kunci sel = j * NX + i. Waktu = menit sejak 2015-01-01 00:00 UTC.
"""
import bisect, csv, datetime as dt, json, math, os, pickle, sys
from array import array

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(DIR, "..", "data"))
from wilayah import AKAR, PROVINSI, PRIORITAS, Poligon, Wilayah  # noqa: E402

AKAR = os.path.abspath(AKAR)
MENTAH = os.path.join(AKAR, "data/raw/sebaran")
PUBLIK = os.path.join(AKAR, "public/data")
os.makedirs(MENTAH, exist_ok=True)

D = 0.003375
X0, Y0 = 94.0, -12.0
NX = 14300
T0 = dt.datetime(2015, 1, 1, tzinfo=dt.timezone.utc)  # menit sebelum 2015 bernilai negatif (arsip 2012-2014)
HA_SEL = 375 * 375 / 1e4  # 14,06 ha
CELAH_2026 = ("2026-05-08", "2026-06-01")  # tidak ada berkas FIRMS di rentang ini


def sel(lon, lat):
    return int((lat - Y0) / D) * NX + int((lon - X0) / D)


def ij(k):
    return k % NX, k // NX


def pusat(k):
    i, j = k % NX, k // NX
    return X0 + (i + .5) * D, Y0 + (j + .5) * D


def menit(tgl, jam):
    jam = jam.zfill(4)
    t = dt.datetime(int(tgl[:4]), int(tgl[5:7]), int(tgl[8:10]), int(jam[:2]), int(jam[2:]), tzinfo=dt.timezone.utc)
    return int((t - T0).total_seconds() // 60)


def waktu(m):
    return T0 + dt.timedelta(minutes=m)


def hari_lokal(m, lon):
    """Hari kebakaran: jendela 06:00-06:00 waktu matahari setempat, jadi lintasan malam (~01:30) ikut hari sebelumnya.
    -> nomor hari sejak 2015-01-01."""
    return int((m + lon * 4 - 6 * 60) // 1440)


def tgl_hari(h):
    return (T0 + dt.timedelta(days=h)).date().isoformat()


def jarak_m(lon1, lat1, lon2, lat2):
    kx = 111320 * math.cos(math.radians((lat1 + lat2) / 2))
    return math.hypot((lon2 - lon1) * kx, (lat2 - lat1) * 110574)


def arah(lon1, lat1, lon2, lat2):
    """Arah kompas (derajat, 0 = utara, searah jarum jam) dari titik 1 ke titik 2."""
    kx = math.cos(math.radians((lat1 + lat2) / 2))
    return (math.degrees(math.atan2((lon2 - lon1) * kx, lat2 - lat1)) + 360) % 360


def selisih_sudut(a, b):
    return abs((a - b + 180) % 360 - 180)


def bukan_vegetasi(jalur):
    """Sel 0,01 derajat bertipe 1/2/3 di arsip standar (pola scripts/data/riwayat_grid.py); titik NRT di sel ini juga dibuang."""
    s = set()
    for r in csv.DictReader(open(jalur)):
        if r.get("type") in ("1", "2", "3"):
            s.add((round(float(r["latitude"]), 2), round(float(r["longitude"]), 2)))
    return s


VIIRS = os.path.join(AKAR, "data/raw/firms/viirs.csv")
VIIRS_AWAL = os.path.join(AKAR, "data/raw/firms/viirs_2012_2014.csv")  # S-NPP 19 Jan 2012 - 2014 (scripts/data/firms.py)


def muat_viirs(jalur=VIIRS, nama="viirs_veg"):
    """Deteksi VIIRS S-NPP keyakinan nominal/tinggi, api vegetasi, urut waktu. jalur: satu CSV atau daftar CSV.
    -> dict array: t (menit), lat, lon, frp, dn (1 = siang). Disimpan sebagai pickle (kunci = ukuran + mtime CSV)."""
    daf = [jalur] if isinstance(jalur, str) else list(jalur)
    kunci = tuple((os.stat(j).st_size, int(os.stat(j).st_mtime)) for j in daf)
    if len(daf) == 1:
        kunci = kunci[0]
    cache = os.path.join(MENTAH, f"{nama}.pkl")
    if os.path.exists(cache):
        with open(cache, "rb") as f:
            v = pickle.load(f)
        if v["kunci"] == kunci:
            return v
    baris = []
    for j in daf:
        nonveg = bukan_vegetasi(j)
        for r in csv.DictReader(open(j)):
            if r["confidence"] not in ("n", "h"):
                continue
            t = r.get("type")
            la, lo = float(r["latitude"]), float(r["longitude"])
            if t:
                if t != "0":
                    continue
            elif (round(la, 2), round(lo, 2)) in nonveg:
                continue
            baris.append((menit(r["acq_date"], r["acq_time"]), la, lo, float(r["frp"] or 0), r["daynight"] == "D"))
    baris.sort()
    v = {"kunci": kunci, "t": array("l", (b[0] for b in baris)), "lat": array("d", (b[1] for b in baris)),
         "lon": array("d", (b[2] for b in baris)), "frp": array("f", (b[3] for b in baris)), "dn": array("b", (b[4] for b in baris))}
    with open(cache, "wb") as f:
        pickle.dump(v, f, protocol=pickle.HIGHEST_PROTOCOL)
    return v


def muat_viirs_panjang():
    """S-NPP 2012-2026 (gabungan arsip awal + viirs.csv) bila arsip awal sudah diunduh; kalau belum, viirs.csv saja."""
    return muat_viirs([VIIRS_AWAL, VIIRS], "viirs_veg_panjang") if os.path.exists(VIIRS_AWAL) else muat_viirs()


class Prov:
    """Kode provinsi sebuah titik, di-cache per 0,02 derajat (galat hanya di garis batas)."""
    def __init__(self):
        self.w, self.c = Wilayah(), {}

    def __call__(self, lon, lat):
        k = (round(lon / .02), round(lat / .02))
        if k not in self.c:
            a = self.w.cari(k[0] * .02, k[1] * .02) or self.w.cari(lon, lat)
            self.c[k] = a[0] if a else None
        return self.c[k]

    def lengkap(self, lon, lat):
        return self.w.cari(lon, lat)


HUTAN = {"HK", "THR", "HL", "KSA", "KPA"}
PRODUKSI = {"HP", "HPT", "HPK"}
# urutan kelas bahan bakar = Sim.bahan() di public/index.html: gambut > hutan > semak > kebun > apl (rumput/sabana)
BAHAN = ["gambut", "rumput", "sabana", "semak", "hutan", "kebun"]


def nama_baku(n):
    """Nama perusahaan untuk dicocokkan (sama dengan normNama di sebaran_model.js): huruf kecil, tanpa PT/Tbk/CV/tanda baca,
    huruf kembar dirapatkan (Kallista = Kalista)."""
    import re
    n = re.sub(r"\b(pt|tbk|cv|persero)\b", " ", (n or "").lower())
    n = re.sub(r"[^a-z0-9]", "", n)
    return re.sub(r"(.)\1+", r"\1", n)


class PoligonSemua:
    """Semua poligon yang memuat titik (konsesi bisa tumpang tindih: sawit di atas HPH, dll.)."""
    def __init__(self, jalur):
        from wilayah import _cincin
        self.indeks = {}
        for f in json.load(open(jalur))["features"]:
            for r in _cincin(f["geometry"]):
                xs, ys = [c[0] for c in r], [c[1] for c in r]
                kotak = (min(xs), min(ys), max(xs), max(ys))
                for gx in range(math.floor(kotak[0] / .5), math.floor(kotak[2] / .5) + 1):
                    for gy in range(math.floor(kotak[1] / .5), math.floor(kotak[3] / .5) + 1):
                        self.indeks.setdefault((gx, gy), []).append((kotak, r, f["properties"]))

    def cari(self, lon, lat):
        from wilayah import _di_dalam
        return [p for kotak, r, p in self.indeks.get((math.floor(lon / .5), math.floor(lat / .5)), ())
                if kotak[0] <= lon <= kotak[2] and kotak[1] <= lat <= kotak[3] and _di_dalam(lon, lat, r)]


class Lahan:
    """Atribut lahan per sel 375 m dari public/data: lahan/{gambut,kawasan,konsesi}.geojson (sanksi_th per poligon, tanpa nama),
    kanal.json, jalan.geojson, penduduk.json. Di-cache per sel. Sama persis dengan Lahan() di public/sebaran_model.js."""
    def __init__(self):
        lh = os.path.join(PUBLIK, "lahan")
        self.gb, self.kw = Poligon(os.path.join(lh, "gambut.geojson")), Poligon(os.path.join(lh, "kawasan.geojson"))
        self.ks = PoligonSemua(os.path.join(lh, "konsesi.geojson"))
        k = json.load(open(os.path.join(PUBLIK, "kanal.json")))
        self.kanal_sel = k["sel"]
        self.kanal = {(math.floor(a / k["sel"]), math.floor(b / k["sel"])): km for a, b, km in k["grid"]}  # pusat sel -> floor
        self.jalan = {}  # (gx, gy) 0,05 derajat -> [(lon, lat)] titik jalan tiap <= 300 m
        for f in json.load(open(os.path.join(PUBLIK, "jalan.geojson")))["features"]:
            for ln in f["geometry"]["coordinates"]:
                for (x1, y1), (x2, y2) in zip(ln, ln[1:]):
                    n = max(1, int(jarak_m(x1, y1, x2, y2) / 300))
                    for q in range(n + 1):
                        x, y = x1 + (x2 - x1) * q / n, y1 + (y2 - y1) * q / n
                        self.jalan.setdefault((math.floor(x / .05), math.floor(y / .05)), []).append((x, y))
        self.pend = {}
        pj = os.path.join(PUBLIK, "penduduk.json")
        if os.path.exists(pj):
            P = json.load(open(pj))
            self.pend_sel = P["sel"]
            for la, lo, n, _ in P["grid"]:
                kk = (math.floor(la / P["sel"]), math.floor(lo / P["sel"]))
                self.pend[kk] = self.pend.get(kk, 0) + n
        self.c = {}

    def jarak_jalan(self, lon, lat, maks=10000):
        gx, gy, best = math.floor(lon / .05), math.floor(lat / .05), maks
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for x, y in self.jalan.get((gx + dx, gy + dy), ()):
                    d = jarak_m(lon, lat, x, y)
                    if d < best:
                        best = d
        if best >= 5000:  # cari lebih jauh hanya bila perlu
            for dx in range(-2, 3):
                for dy in range(-2, 3):
                    if abs(dx) == 2 or abs(dy) == 2:
                        for x, y in self.jalan.get((gx + dx, gy + dy), ()):
                            best = min(best, jarak_m(lon, lat, x, y))
        return best

    def kanal_km(self, lon, lat):
        return self.kanal.get((math.floor(lat / self.kanal_sel), math.floor(lon / self.kanal_sel)), 0.0)

    def penduduk_km2(self, lon, lat):
        if not self.pend:
            return 0.0
        s = self.pend_sel
        n = self.pend.get((math.floor(lat / s), math.floor(lon / s)), 0)
        luas = (s * 110.57) * (s * 111.32 * math.cos(math.radians((math.floor(lat / s) + .5) * s)))
        return n / luas

    def __call__(self, k, prov=None):
        """-> dict: gambut, hutan (HK/HL/konservasi), produksi (HP/HPT/HPK), apl (di luar kawasan hutan), kebun (sawit),
        hti, hph, tambang, konsesi (salah satu), sanksi_th (tahun sanksi karhutla pertama pemegang konsesi, 9999 = tidak ada),
        kanal_km, jalan_km, penduduk_km2, kelas (bahan bakar Sim), semak (= produksi atau HPH; bahan bakar Sim)"""
        if k in self.c:
            return self.c[k]
        lon, lat = pusat(k)
        g = 1 if self.gb.cari(lon, lat) else 0
        kw = self.kw.cari(lon, lat) or {}
        ks = self.ks.cari(lon, lat)
        jenis = {p.get("jenis") for p in ks}
        h = 1 if kw.get("fungsi") in HUTAN else 0
        pr = 1 if kw.get("fungsi") in PRODUKSI else 0
        # sanksi_th per poligon dihitung scripts/scrape/konsesi.py dari daftar sanksi (data/raw/konsesi, tidak diterbitkan)
        sanksi = min([p.get("sanksi_th", 9999) for p in ks] + [9999])
        kb = 1 if "sawit" in jenis else 0
        s = 1 if pr or "hph" in jenis else 0
        apl = "sabana" if prov in ("93", "53", "52", "81") else "rumput"
        kelas = "gambut" if g else "hutan" if h else "semak" if s else "kebun" if kb else apl
        r = {"gambut": g, "hutan": h, "produksi": pr, "apl": 0 if kw else 1, "kebun": kb, "hti": 1 if "hti" in jenis else 0,
             "hph": 1 if "hph" in jenis else 0, "tambang": 1 if "tambang" in jenis else 0, "konsesi": 1 if ks else 0, "sanksi_th": sanksi,
             "kanal_km": self.kanal_km(lon, lat), "jalan_km": self.jarak_jalan(lon, lat) / 1000, "penduduk_km2": self.penduduk_km2(lon, lat),
             "kelas": kelas, "semak": s}
        self.c[k] = r
        return r


def bootstrap(nilai, n=1000, seed=7):
    """Rata-rata dan selang 95% bootstrap (persentil) dari daftar nilai per peristiwa."""
    import random
    nilai = [x for x in nilai if x is not None]
    if not nilai:
        return None
    rnd = random.Random(seed)
    m = len(nilai)
    rata = []
    for _ in range(n):
        rata.append(sum(nilai[rnd.randrange(m)] for _ in range(m)) / m)
    rata.sort()
    return [round(sum(nilai) / m, 4), round(rata[int(.025 * n)], 4), round(rata[int(.975 * n)], 4), m]


if __name__ == "__main__" and sys.argv[1:] == ["uji"]:
    k = sel(113.92, -2.21)
    lo, la = pusat(k)
    assert abs(lo - 113.92) < D and abs(la + 2.21) < D and sel(lo, la) == k
    assert menit("2015-01-01", "0130") == 90 and waktu(90).hour == 1
    # lintasan malam 01:30 waktu setempat ikut hari sebelumnya; siang 13:30 hari itu
    m_siang = menit("2020-08-10", "0630")  # 13:30 WIB di 105 BT
    m_malam = menit("2020-08-10", "1830")  # 01:30 WIB tanggal 11
    assert hari_lokal(m_siang, 105) == hari_lokal(m_malam, 105)
    assert abs(arah(110, 0, 110, 1) - 0) < 1e-9 and abs(arah(110, 0, 111, 0) - 90) < 1e-9
    assert selisih_sudut(350, 10) == 20 and selisih_sudut(90, 270) == 180
    assert nama_baku("PT. Kallista Alam") == nama_baku("Kalista Alam") == "kalistalam"
    b = bootstrap([1, 1, 1, 1])
    assert b[0] == b[1] == b[2] == 1
    print("ok")
