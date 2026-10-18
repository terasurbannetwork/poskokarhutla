"""Bersama modul cuaca: jalur, ambang, tingkat, jarak, kisi terdekat. Tanpa jaringan."""
import datetime as dt, math, os, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../banjir"))
from umum import AKAR, KELUAR, WIB, ambil, baca, simpan  # noqa: E402,F401
from wilayah import PROVINSI  # noqa: E402,F401

# Masukan (hujan.json, hujan_ansambel.json, meta.json) boleh dialihkan untuk uji lokal: CUACA_MASUKAN=<folder>
MASUKAN = os.environ.get("CUACA_MASUKAN") or KELUAR

HUJAN = (50, 100, 150)     # mm/hari: lebat, sangat lebat, ekstrem (kelas BMKG)
ANGIN = (54, 72, 90)       # km/jam embusan = 15/20/25 m/s
HS = (2.5, 4, 6)           # m tinggi gelombang signifikan
# Ansambel (hipotesis awal, belum dikunci uji balik): p50 >= P_WASPADA -> Waspada; p100 >= P_SIAGA -> Siaga; p100 >= P_AWAS -> Awas
P_WASPADA, P_SIAGA, P_AWAS = 40, 40, 70
# HIPOTESIS (belum dikunci uji balik): hujan_ansambel.json hanya punya p50 (>= 50 mm/hari), p100 (>= 100 mm/hari), p3 (jumlah 3 hari >= 100 mm); TIDAK ada p150,
# jadi Awas dari ansambel memakai p100 >= P_AWAS, bukan peluang >= 150 mm. Titik ansambel dipakai bila <= JARAK_ANSAMBEL_KM dari kecamatan.
JARAK_ANSAMBEL_KM = 80
AMBANG_ANSAMBEL = {"status": "hipotesis", "satuan": "%", "p50_waspada": P_WASPADA, "p100_siaga": P_SIAGA, "p100_awas": P_AWAS, "jarak_maks_km": JARAK_ANSAMBEL_KM}


def tingkat(v, ambang):
    """0 bila di bawah ambang pertama, selain itu 1..3."""
    return sum(1 for a in ambang if (v or 0) >= a)


def tingkat_kec(mm, g, hs_m, p50, p100):
    """Tingkat 0..3 satu kecamatan satu hari: terbesar dari hujan, embusan, gelombang, dan peluang ansambel (None = tak ada data)."""
    t = [tingkat(mm, HUJAN), tingkat(g, ANGIN), tingkat(hs_m, HS)]
    if p50 is not None and p50 >= P_WASPADA:
        t.append(1)
    if p100 is not None:
        t.append(3 if p100 >= P_AWAS else 2 if p100 >= P_SIAGA else 0)
    return max(t)


def jarak_km(a1, o1, a2, o2):
    p = math.pi / 180
    h = math.sin((a2 - a1) * p / 2) ** 2 + math.cos(a1 * p) * math.cos(a2 * p) * math.sin((o2 - o1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


class Kisi:
    """Sel berpusat di kelipatan `sel` + sel/2. Terdekat: sel sendiri, lalu cincin sampai `cincin` sel."""
    def __init__(self, baris, sel=0.25, cincin=3):
        self.sel, self.cincin, self.p = sel, cincin, {}
        for r in baris:
            self.p[(math.floor(r[0] / sel), math.floor(r[1] / sel))] = r

    def dekat(self, lat, lon):
        a, o = math.floor(lat / self.sel), math.floor(lon / self.sel)
        for k in range(self.cincin + 1):
            c = [self.p[(a + i, o + j)] for i in range(-k, k + 1) for j in range(-k, k + 1)
                 if max(abs(i), abs(j)) == k and (a + i, o + j) in self.p]
            if c:
                return min(c, key=lambda r: (r[0] - lat) ** 2 + (r[1] - lon) ** 2)
        return None


def titik_terdekat(titik, lat, lon, maks_km):
    """titik = [(lat, lon, ...)] -> (indeks, jarak) terdekat dalam maks_km, atau None."""
    b = None
    for i, t in enumerate(titik):
        if abs(t[0] - lat) > maks_km / 100 or abs(t[1] - lon) > maks_km / 100:
            continue
        d = jarak_km(lat, lon, t[0], t[1])
        if d <= maks_km and (b is None or d < b[1]):
            b = (i, d)
    return b


def hari_wib(n=3, awal=None):
    a = awal or dt.datetime.now(WIB).date()
    return [(a + dt.timedelta(days=i)).isoformat() for i in range(n)]


def sekarang():
    return dt.datetime.now(WIB).isoformat(timespec="minutes")


def indeks_hari_wib(t0_utc, n):
    """Tanggal WIB (ISO) tiap jam ke-0..n-1 dari t0_utc (datetime UTC)."""
    return [(t0_utc + dt.timedelta(hours=h, minutes=0) + dt.timedelta(hours=7)).date().isoformat() for h in range(n)]
