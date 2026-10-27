"""Medan Jakarta: DEMNAS 8 m (utama, diunduh pemilik) dan Copernicus GLO-30 (cadangan), dipotong ke KOTAK.

DEMNAS 1209-xx v1.0 (BIG): sumber TerraSAR-X 2011, DSM-hidro (permukaan, bukan tanah gundul): tinggi tahun 2011,
koreksi subsidensi ke tahun kejadian dilakukan di J2 (public/banjir/data/subsiden_literatur.json).
GLO-30 (Copernicus DEM, ESA, AWS open data copernicus-dem-30m): DSM, termasuk gedung dan kanopi; ubin 1 derajat COG deflate.
Keluaran (data/raw, tidak di-commit): medan/<nama>_kotak.f32.gz (float32 little-endian, baris utara ke selatan) dan
medan/<nama>_kotak.json (asal, langkah derajat, bentuk, nodata, catatan). Ringkasan kecil: public/banjir/data/genangan/medan.json.
"""
import array, datetime as dt, glob, gzip, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bersama import KOTAK, MENTAH, RINGKAS, WIB, ambil_berkas, simpan
from tiff_mini import Tiff

NODATA = -9999.0
DIR = os.path.join(MENTAH, "medan")
GLO = "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_S07_00_E%d_00_DEM/Copernicus_DSM_COG_10_S07_00_E%d_00_DEM.tif"


class Lembar:
    def __init__(self, jalur):
        self.t = Tiff(jalur)
        self.dx, self.dy = self.t.skala[0], self.t.skala[1]
        self.x0, self.y0 = self.t.titik_ikat[3], self.t.titik_ikat[4]   # sudut kiri-atas piksel (PixelIsArea)
        self.x1, self.y1 = self.x0 + self.dx * self.t.lebar, self.y0 - self.dy * self.t.tinggi
        self._br, self._baris = None, None

    def baris(self, r):
        t, br = self.t, r // self.t.tt
        if self._br != br:
            kol = [t.ubin(k, br) for k in range(t.per_baris)]
            self._br, self._baris = br, kol
        a, o = array.array("f"), (r % t.tt) * t.tl
        for u in self._baris:
            a.extend(u[o:o + t.tl])
        return a[:t.lebar]


def mosaik(lembar, kotak=KOTAK):
    """Mosaik lembar sekisi (langkah sama) terpotong ke kotak -> (array float32, meta)."""
    dx, dy = lembar[0].dx, lembar[0].dy
    ref = lembar[0]
    c0 = math.floor((kotak[0] - ref.x0) / dx)
    r0 = math.floor((ref.y0 - kotak[3]) / dy)
    nc = math.ceil((kotak[2] - kotak[0]) / dx)
    nr = math.ceil((kotak[3] - kotak[1]) / dy)
    xo, yo = ref.x0 + c0 * dx, ref.y0 - r0 * dy   # sudut kiri-atas keluaran, di kisi lembar acuan
    keluar = array.array("f", [NODATA]) * (nc * nr)
    for r in range(nr):
        lat = yo - (r + 0.5) * dy
        for L in lembar:
            if not (L.y1 <= lat < L.y0) or abs(L.dx - dx) > 1e-12:
                continue
            ca = round((xo - L.x0) / dx)                # kolom lembar di kolom keluaran 0
            a, b = max(0, -ca), min(nc, L.t.lebar - ca)
            if a < b:
                sr = int((L.y0 - lat) / dy)
                keluar[r * nc + a:r * nc + b] = L.baris(sr)[ca + a:ca + b]
    meta = {"x0": xo, "y0": yo, "dx": dx, "dy": dy, "kolom": nc, "baris": nr, "nodata": NODATA}
    return keluar, meta


def stat(a):
    v = [x for x in a if x != NODATA and x == x and x > -500]
    return {"n_valid": len(v), "n": len(a), "min": round(min(v), 2), "maks": round(max(v), 2),
            "rata": round(sum(v) / len(v), 2)} if v else {"n_valid": 0, "n": len(a)}


def tulis(nama, a, meta, catatan):
    j = os.path.join(DIR, nama + "_kotak.f32.gz")
    os.makedirs(DIR, exist_ok=True)
    with gzip.open(j + ".tmp", "wb", 6) as f:
        f.write(a.tobytes() if sys.byteorder == "little" else (lambda b: (b.byteswap(), b.tobytes())[1])(array.array("f", a)))
    os.replace(j + ".tmp", j)
    meta = {**meta, **stat(a), "kotak": list(KOTAK), "ukuran_gz_byte": os.path.getsize(j), "catatan": catatan}
    simpan(os.path.join(DIR, nama + "_kotak.json"), meta)
    return meta


def jalankan():
    ring = {}
    dem = sorted(glob.glob(os.path.join(MENTAH, "demnas", "DEMNAS_*.tif")))
    if dem:
        a, m = mosaik([Lembar(j) for j in dem])
        ring["demnas"] = tulis("demnas", a, m, "DEMNAS 8 m, TerraSAR-X 2011, DSM-hidro; koreksi subsidensi ke tahun kejadian di J2.") | {"lembar": len(dem)}
        print("demnas", ring["demnas"])
    else:
        print("DEMNAS tidak ada di data/raw/banjir/genangan/demnas/, dilewati.")
    tif = [os.path.join(DIR, "glo30", f"E{lon}.tif") for lon in (106, 107)]
    for lon, j in zip((106, 107), tif):
        ambil_berkas(GLO % (lon, lon), j)
    a, m = mosaik([Lembar(j) for j in tif])
    ring["glo30"] = tulis("glo30", a, m, "Copernicus GLO-30 = DSM (termasuk gedung dan kanopi), tahun acuan ~2011-2015. Cadangan.")
    print("glo30", ring["glo30"])
    simpan(os.path.join(RINGKAS, "medan.json"), {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"),
           "sumber": "DEMNAS (BIG, TerraSAR-X 2011) dan Copernicus GLO-30 (ESA). Keduanya DSM.", "berkas": ring})


def uji():
    a = array.array("f", [1.0, NODATA, 3.0])
    assert stat(a)["n_valid"] == 2 and stat(a)["rata"] == 2.0
    j = sorted(glob.glob(os.path.join(MENTAH, "demnas", "DEMNAS_*.tif")))
    if j:
        L = Lembar(j[0])
        assert L.t.lebar == 3333 and abs(L.dx * 3333 - 0.25) < 1e-4, (L.t.lebar, L.dx)
        r = L.baris(1000)
        assert len(r) == 3333
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalankan()
