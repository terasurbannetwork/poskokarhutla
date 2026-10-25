"""SPI (Standardized Precipitation Index, McKee 1993) per sel kisi 0,5 derajat dari hujan bulanan NASA POWER (MERRA-2).

BMKG hanya menerbitkan peta SPI/HTH sebagai gambar JPG (diperiksa 16 Okt 2026: halaman /iklim/?p=hari-tanpa-hujan dan
/iklim/indeks-presipitasi-terstandarisasi 200 tanpa data terstruktur; /iklim/informasi-hari-tanpa-hujan 404), jadi SPI
dihitung sendiri dan diberi label "Deteksi Pantau Bencana".

Metode: jumlah hujan k bulan yang berakhir di bulan e, tiap tahun 1991-2020 -> sebaran gamma (MLE pendekatan Thom) ->
peluang kumulatif (fungsi gamma tak-lengkap ditulis sendiri; stdlib tak punya) dengan koreksi bulan nol hujan -> normal baku.
Jeda data: POWER bulanan terbit ~6 minggu sesudah bulan berakhir; SPI memakai bulan terakhir yang terisi di SEMUA sel.

Pakai:  python3 scripts/kekeringan/spi.py uji
"""
import calendar, datetime as dt, math, os, statistics, sys, time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "banjir"))
from umum import ambil, baca, simpan

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
MENTAH = os.path.join(AKAR, "data/raw/kekeringan_hujan.json")
URL = ("https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=PRECTOTCORR&community=AG"
       "&longitude={lon}&latitude={lat}&start=1991&end={akhir}&format=JSON")
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"}
DASAR = (1991, 2020)  # klimatologi baku WMO
MIN_RATA = 50.0       # mm per jendela; di bawah ini rata-rata baku terlalu kecil untuk SPI


def gamma_p(a, x):
    """P(a, x) = gamma tak-lengkap terregularisasi: deret untuk x < a+1, pecahan berlanjut (Lentz) untuk x besar."""
    if x <= 0:
        return 0.0
    g = math.lgamma(a)
    if x < a + 1:
        s = t = 1.0 / a
        n = a
        for _ in range(500):
            n += 1
            t *= x / n
            s += t
            if abs(t) < abs(s) * 1e-12:
                break
        return s * math.exp(-x + a * math.log(x) - g)
    tiny = 1e-300
    b = x + 1 - a
    c = 1 / tiny
    d = 1 / b
    h = d
    for i in range(1, 500):
        an = -i * (i - a)
        b += 2
        d = an * d + b
        d = tiny if abs(d) < tiny else d
        c = b + an / c
        c = tiny if abs(c) < tiny else c
        d = 1 / d
        dl = d * c
        h *= dl
        if abs(dl - 1) < 1e-12:
            break
    return 1 - math.exp(-x + a * math.log(x) - g) * h


def spi_nilai(x, baku):
    """SPI satu nilai x terhadap daftar `baku` (jumlah hujan tahun-tahun dasar, mm); None bila baku tak cukup."""
    pos = [v for v in baku if v > 0]
    if len(baku) < 20 or len(pos) < 10:
        return None
    q = 1 - len(pos) / len(baku)
    rata = sum(pos) / len(pos)
    if rata * len(pos) / len(baku) < MIN_RATA:   # iklim hampir tanpa hujan di jendela ini: SPI tak bermakna (pedoman WMO), dibuang
        return None
    A = math.log(rata) - sum(math.log(v) for v in pos) / len(pos)
    if A <= 0:
        return None
    alfa = (1 + math.sqrt(1 + 4 * A / 3)) / (4 * A)
    beta = rata / alfa
    h = q + (1 - q) * gamma_p(alfa, x / beta) if x > 0 else q
    h = min(max(h, 1e-6), 1 - 1e-6)
    return round(statistics.NormalDist().inv_cdf(h), 2)


def jumlah(seri, tahun, bulan_akhir, k):
    """Jumlah hujan (mm) k bulan yang berakhir di (tahun, bulan_akhir); None bila ada bulan kosong."""
    tot = 0.0
    y, m = tahun, bulan_akhir
    for _ in range(k):
        v = seri.get(f"{y}{m:02d}")
        if v is None:
            return None
        tot += v * calendar.monthrange(y, m)[1]
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return tot


def spi_seri(seri, y, m, k):
    """SPI-k untuk jendela yang berakhir di (y, m) dari seri {'YYYYMM': mm/hari}."""
    x = jumlah(seri, y, m, k)
    if x is None:
        return None
    baku = [b for b in (jumlah(seri, t, m, k) for t in range(DASAR[0], DASAR[1] + 1)) if b is not None]
    return spi_nilai(x, baku)


def spi_q(seri, y, m, k):
    """Porsi tahun dasar dengan hujan jendela nol (massa nol sebaran gamma). Di atas 0,5 fit gamma tak dapat dipercaya: SPI sel itu diberi tanda."""
    baku = [b for b in (jumlah(seri, t, m, k) for t in range(DASAR[0], DASAR[1] + 1)) if b is not None]
    return round(sum(1 for v in baku if v <= 0) / len(baku), 2) if baku else None


def bulan_terakhir(sel):
    """(tahun, bulan) terakhir yang terisi di sedikitnya 90% sel; sel yang tertinggal diabaikan."""
    cacah = {}
    for seri in sel.values():
        for k in seri:
            cacah[k] = cacah.get(k, 0) + 1
    ada = [k for k, n in cacah.items() if n >= .9 * max(1, len(sel))]
    k = max(ada) if ada else None
    return (int(k[:4]), int(k[4:])) if k else None


def unduh_satu(lat, lon, akhir):
    try:
        d = ambil(URL.format(lat=lat, lon=lon, akhir=akhir), coba=3, batas_waktu=60, kepala=UA)
        p = d["properties"]["parameter"]["PRECTOTCORR"]
        return {k: v for k, v in p.items() if not k.endswith("13") and v > -900}
    except Exception as e:
        print(f"  POWER {lat},{lon}: {e}", file=sys.stderr)
        return None


def hujan_bulanan(titik, hari_ini):
    """{'lat,lon': {'YYYYMM': mm/hari}} untuk titik [(lat, lon)]; cache sebulan sekali di data/raw (hujan lampau tak berubah)."""
    bln = hari_ini.strftime("%Y-%m")
    c = baca(MENTAH, {})
    if c.get("bulan") == bln and all(f"{a},{o}" in c.get("sel", {}) for a, o in titik):
        return c["sel"]
    kunci = [f"{a},{o}" for a, o in titik]
    with ThreadPoolExecutor(4) as ex:
        hasil = list(ex.map(lambda t: unduh_satu(t[0], t[1], hari_ini.year), titik))
    sel = {k: h for k, h in zip(kunci, hasil) if h}
    if len(sel) >= .9 * len(titik):
        simpan(MENTAH, {"bulan": bln, "sel": sel})
    return sel


def uji():
    for x in (0.3, 1.0, 2.5, 7.0):
        assert abs(gamma_p(1, x) - (1 - math.exp(-x))) < 1e-9, x               # a=1: eksponensial
        assert abs(gamma_p(.5, x) - math.erf(math.sqrt(x))) < 1e-9, x          # a=1/2: erf
    assert abs(gamma_p(5, 5) - 0.5595067149347875) < 1e-9                      # nilai tabel, jalur pecahan berlanjut tersentuh di x=12
    assert abs(gamma_p(5, 12) - (1 - math.exp(-12) * sum(12 ** k / math.factorial(k) for k in range(5)))) < 1e-9  # a bulat = Poisson
    # sampel gamma(alfa=4, beta=25) deterministik lewat kuantil: SPI nilai median ~0, kuantil 2,3% ~ -2, kuantil 97,7% ~ +2
    kuant = lambda p: 25 * 4 * (1 - 1 / (9 * 4) + statistics.NormalDist().inv_cdf(p) / (3 * 2)) ** 3   # Wilson-Hilferty
    baku = [kuant((i + .5) / 30) for i in range(30)]
    assert abs(spi_nilai(kuant(.5), baku)) < .15, spi_nilai(kuant(.5), baku)
    assert -2.4 < spi_nilai(kuant(.023), baku) < -1.6 and 1.6 < spi_nilai(kuant(.977), baku) < 2.4
    assert spi_nilai(1, [0.5] * 30) is None   # rata-rata baku < 50 mm
    assert spi_nilai(0, baku) < -2 and spi_nilai(5, [0] * 25 + [1] * 5) is None  # nol hujan sangat kering; baku terlalu sedikit positif
    seri = {f"{y}{m:02d}": 5.0 + (y % 7) * .3 for y in range(1991, 2027) for m in range(1, 13)}
    seri.update({f"2026{m:02d}": 0.1 for m in (6, 7, 8)})
    for m in (9, 10, 11, 12):
        del seri[f"2026{m:02d}"]
    assert spi_seri(seri, 2026, 8, 3) < -2 and spi_seri(seri, 2026, 12, 3) is None
    assert bulan_terakhir({"a": {"202608": 1, "202607": 1}, "b": {"202608": 1}}) == (2026, 8)
    print("ok spi")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else print(__doc__)
