"""Bersama modul longsor (bukan umum.py: nama itu milik scripts/banjir): jalur, daftar kecamatan (urutan tetap), titik-dalam-poligon, sel hujan.
Python 3.12 stdlib saja. ambil/simpan dipakai ulang dari scripts/banjir/umum.py (coba-ulang, JSON ringkas)."""
import datetime as dt, json, math, os, sys

AWAL = os.path.dirname(os.path.abspath(__file__))
import importlib.util
_s = importlib.util.spec_from_file_location("banjir_umum", os.path.join(AWAL, "../banjir/umum.py"))
_b = importlib.util.module_from_spec(_s)
sys.path.insert(0, os.path.join(AWAL, "../banjir"))  # umum.py banjir mengimpor wilayah.py di sebelahnya
_s.loader.exec_module(_b)
sys.path.pop(0)
AKAR, WIB, ambil, simpan, baca, KuotaHabis = _b.AKAR, _b.WIB, _b.ambil, _b.simpan, _b.baca, _b.KuotaHabis

KELUAR = os.path.join(AKAR, "public/longsor/data")
MENTAH = os.path.join(AKAR, "data/raw/longsor")   # tidak di-commit (besar / bisa diunduh ulang)
SEL = 0.5                                          # derajat; sel hujan riwayat (ERA5 aslinya 0,25)
UA = {"User-Agent": "poskokarhutla-longsor/1.0 (+github.com/pangantara/poskokarhutla)"}


def sel_hujan(lat, lon):
    """Pusat sel SEL derajat yang memuat titik -> (lat, lon) bulat 2 desimal."""
    return (round((math.floor(lat / SEL) + .5) * SEL, 2), round((math.floor(lon / SEL) + .5) * SEL, 2))


def kunci_sel(lat, lon):
    return f"{lat:.2f},{lon:.2f}"


def di_dalam(x, y, r):
    c, j = False, len(r) - 1
    for i in range(len(r)):
        xi, yi, xj, yj = r[i][0], r[i][1], r[j][0], r[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def cincin(geom):
    bag = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    return [p[0] for p in bag]


def pusat(r):
    """Pusat massa cincin (rumus luas bertanda); jatuh ke rata-rata simpul bila luas ~ 0."""
    a = cx = cy = 0.0
    for i in range(len(r) - 1):
        k = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
        a += k
        cx += (r[i][0] + r[i + 1][0]) * k
        cy += (r[i][1] + r[i + 1][1]) * k
    if abs(a) < 1e-12:
        return sum(p[0] for p in r) / len(r), sum(p[1] for p in r) / len(r)
    return cx / (3 * a), cy / (3 * a)


def km(a1, o1, a2, o2):
    p = math.pi / 180
    h = math.sin((a2 - a1) * p / 2) ** 2 + math.cos(a1 * p) * math.cos(a2 * p) * math.sin((o2 - o1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def daftar_kec():
    """-> [{id, prov, kab, kec, lon, lat, cincin:[...]}] terurut (prov, kab, kec). Titik pusat dipaksa di dalam poligon
    (pusat massa bisa jatuh di luar untuk poligon cekung/kepulauan: dipakai simpul-tengah cincin terluas bila perlu)."""
    keluar, lihat = [], {}
    for kode in sorted(f[:-5] for f in os.listdir(os.path.join(AKAR, "public/geo/kecamatan")) if f.endswith(".json")):
        for f in json.load(open(os.path.join(AKAR, "public/geo/kecamatan", f"{kode}.json")))["features"]:
            rs = cincin(f["geometry"])
            besar = max(rs, key=lambda r: abs(sum(r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1] for i in range(len(r) - 1))))
            lon, lat = pusat(besar)
            if not di_dalam(lon, lat, besar):  # ponytail: cincin cekung -> simpul terdekat pusat, dinaikkan sedikit ke dalam tidak dijamin
                lon, lat = min(besar, key=lambda p: (p[0] - lon) ** 2 + (p[1] - lat) ** 2)
            kab, kec = f["properties"]["kab"], f["properties"]["kec"]
            ident = f"{kode}|{kab}|{kec}"
            lihat[ident] = lihat.get(ident, 0) + 1
            if lihat[ident] > 1:
                ident += f"#{lihat[ident]}"
            keluar.append({"id": ident, "prov": kode, "kab": kab, "kec": kec, "lon": round(lon, 4), "lat": round(lat, 4), "cincin": rs})
    keluar.sort(key=lambda k: k["id"])
    return keluar


class Cari:
    """Titik -> indeks kecamatan lewat indeks sel 0,25 derajat atas kotak pembatas."""
    G = 0.25

    def __init__(self, kecs):
        self.kecs, self.ind = kecs, {}
        for n, k in enumerate(kecs):
            for r in k["cincin"]:
                xs, ys = [c[0] for c in r], [c[1] for c in r]
                kb = (min(xs), min(ys), max(xs), max(ys))
                for gx in range(math.floor(kb[0] / self.G), math.floor(kb[2] / self.G) + 1):
                    for gy in range(math.floor(kb[1] / self.G), math.floor(kb[3] / self.G) + 1):
                        self.ind.setdefault((gx, gy), []).append((kb, r, n))

    def cari(self, lon, lat):
        for kb, r, n in self.ind.get((math.floor(lon / self.G), math.floor(lat / self.G)), ()):
            if kb[0] <= lon <= kb[2] and kb[1] <= lat <= kb[3] and di_dalam(lon, lat, r):
                return n
        return None


def titik_sampel(kec, maks=40):
    """Titik di dalam kecamatan: pusat + kisi seragam di kotak pembatas yang jatuh dalam poligon (<= maks).
    Kisi memakai langkah yang menghasilkan ~maks titik kotak, jadi kecamatan kecil tetap dapat >= pusat saja."""
    xs = [c[0] for r in kec["cincin"] for c in r]
    ys = [c[1] for r in kec["cincin"] for c in r]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    n = max(1, int(math.sqrt(maks * 2)))
    out = [(kec["lon"], kec["lat"])]
    for i in range(n):
        for j in range(n):
            x, y = x0 + (i + .5) * (x1 - x0) / n, y0 + (j + .5) * (y1 - y0) / n
            if any(di_dalam(x, y, r) for r in kec["cincin"]):
                out.append((x, y))
    if len(out) > maks:   # ponytail: buang merata bukan acak; cukup untuk rata-rata/persentil
        langkah = len(out) / maks
        out = [out[int(k * langkah)] for k in range(maks)]
    return out


def normal(s):
    """Kunci nama untuk mencocokkan kabupaten DIBI <-> poligon: huruf kecil, tanpa 'kab./kota/kabupaten', tanpa spasi/tanda."""
    s = (s or "").lower().replace("kabupaten", "").replace("kab.", "").replace("administrasi", "")
    return "".join(c for c in s if c.isalnum())


def uji():
    sq = [[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]
    assert di_dalam(1, 1, sq) and not di_dalam(3, 1, sq)
    assert pusat(sq) == (1.0, 1.0)
    assert abs(km(0, 0, 0, 1) - 111.19) < .1
    assert sel_hujan(-6.9, 107.6) == (-6.75, 107.75), sel_hujan(-6.9, 107.6)
    k = {"lon": 1, "lat": 1, "cincin": [sq]}
    t = titik_sampel(k, 10)
    assert t[0] == (1, 1) and 1 < len(t) <= 10 and all(0 < x < 2 and 0 < y < 2 for x, y in t)
    assert normal("Kab. Bandung Barat") == normal("BANDUNG BARAT") == "bandungbarat"
    print("umum longsor: uji lolos")


if __name__ == "__main__":
    uji()
