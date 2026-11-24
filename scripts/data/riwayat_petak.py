"""Petak 375 m yang pernah terbakar 2012-2025 -> data/riwayat_petak.bin (dibaca insiden.py, tidak disajikan ke publik).

Sumber: arsip standar NASA FIRMS VIIRS S-NPP per tahun per negara (publik, tanpa kunci):
  https://firms.modaps.eosdis.nasa.gov/data/country/viirs-snpp/<tahun>/viirs-snpp_<tahun>_Indonesia.csv
Saringan sama dengan riwayat_sel.py: satu sensor sepanjang 2012-2025 (angka antartahun sebanding), keyakinan nominal/tinggi,
type = 0 (api vegetasi; gunung api, sumber panas tetap, lepas pantai dibuang). Petak = sel 0,0034 derajat (sama dengan
insiden.SEL_PIKSEL), kunci (ix, iy) = floor(lon/0,0034), floor(lat/0,0034); nilai = bitmask tahun (bit = tahun - 2012).
Piksel, bukan luas terbakar; geser geolokasi antartahun membuat "petak sama" ukuran ketat, jadi persen pernah terbakar = batas bawah.

Berkas: zlib( n:uint32 | selisih kunci terurut uint32 x n | mask uint16 x n ), little-endian. kunci = (ix + 1000) * 10000 + (iy + 4000).

Pakai:  python3 scripts/data/riwayat_petak.py bangun <folder berisi v2012.csv ... v2025.csv>
        python3 scripts/data/riwayat_petak.py uji
"""
import array, bisect, csv, itertools, math, os, struct, sys, tempfile, zlib

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR  # noqa: E402

DERAJAT, TH0, TH1 = 0.0034, 2012, 2025
BERKAS = os.path.join(AKAR, "data/riwayat_petak.bin")


def kunci(lat, lon):
    return (math.floor(lon / DERAJAT) + 1000) * 10000 + math.floor(lat / DERAJAT) + 4000


def bangun(folder):
    m = {}
    for y in range(TH0, TH1 + 1):
        with open(os.path.join(folder, "v%d.csv" % y)) as f:
            for r in csv.DictReader(f):
                if r.get("type") == "0" and r["confidence"] in ("n", "h"):
                    k = kunci(float(r["latitude"]), float(r["longitude"]))
                    m[k] = m.get(k, 0) | (1 << (y - TH0))
    return m


def simpan(m, path=BERKAS):
    ks = sorted(m)
    sel = array.array("I", [b - a for a, b in zip([0] + ks, ks)])
    teks = struct.pack("<I", len(ks)) + sel.tobytes() + array.array("H", [m[k] for k in ks]).tobytes()
    with tempfile.NamedTemporaryFile("wb", dir=os.path.dirname(path), delete=False, suffix=".tmp") as f:
        f.write(zlib.compress(teks, 9))
    os.replace(f.name, path)


class Petak:
    """Cari bitmask tahun terbakar sebuah titik; 0 = tak pernah (atau di luar bahan)."""
    def __init__(self, path=BERKAS):
        b = zlib.decompress(open(path, "rb").read())
        n = struct.unpack_from("<I", b)[0]
        self.k = array.array("I", itertools.accumulate(array.array("I", b[4:4 + 4 * n])))
        self.v = array.array("H", b[4 + 4 * n:4 + 6 * n])

    def cari(self, lat, lon):
        k = kunci(lat, lon)
        i = bisect.bisect_left(self.k, k)
        return self.v[i] if i < len(self.k) and self.k[i] == k else 0


def ringkas(petak, titik):
    """titik [(lat, lon)] -> {n_petak, pernah_pct, tahun: {tahun: persen petak terbakar tahun itu}} dari petak unik; None bila tak ada titik."""
    ps = {kunci(la, lo): (la, lo) for la, lo in titik}
    if not ps:
        return None
    ms = [petak.cari(la, lo) for la, lo in ps.values()]
    n = len(ms)
    return {"n_petak": n, "pernah_pct": round(100 * sum(1 for m in ms if m) / n, 1),
            "tahun": {str(TH0 + b): round(100 * c / n, 1) for b in range(TH1 - TH0 + 1) if (c := sum(1 for m in ms if m >> b & 1))}}


def uji():
    with tempfile.TemporaryDirectory() as d:
        for y in range(TH0, TH1 + 1):
            with open(os.path.join(d, "v%d.csv" % y), "w") as f:
                f.write("latitude,longitude,confidence,type\n")
                if y in (2015, 2019):
                    f.write("-3.0010,112.0010,n,0\n-3.0011,112.0011,h,0\n")      # petak A dua tahun (dua titik, satu petak)
                if y == 2019:
                    f.write("-3.1000,112.1000,l,0\n-3.2000,112.2000,n,2\n-3.3000,112.3000,n,0\n")   # keyakinan rendah / type 2 dibuang; petak C 2019
        m = bangun(d)
        simpan(m, os.path.join(d, "p.bin"))
        p = Petak(os.path.join(d, "p.bin"))
    assert len(m) == 2 and p.cari(-3.001, 112.001) == (1 << 3 | 1 << 7) and p.cari(-3.3, 112.3) == 1 << 7 and p.cari(-3.1, 112.1) == 0 and p.cari(-3.2, 112.2) == 0
    r = ringkas(p, [(-3.001, 112.001), (-3.3, 112.3), (-3.5, 112.5), (-3.6, 112.6)])   # 4 petak: A (2015+2019), C (2019), dua tak pernah
    assert r == {"n_petak": 4, "pernah_pct": 50.0, "tahun": {"2015": 25.0, "2019": 50.0}}, r
    assert ringkas(p, []) is None
    if os.path.exists(BERKAS):
        pn = Petak()
        assert len(pn.k) > 1_000_000 and pn.cari(-2.21, 113.92) >= 0
    print("riwayat_petak uji: OK")


if __name__ == "__main__":
    if sys.argv[1:2] == ["bangun"]:
        m = bangun(sys.argv[2])
        simpan(m)
        print("riwayat_petak: %d petak, %.1f MB" % (len(m), os.path.getsize(BERKAS) / 1e6))
    else:
        uji()
