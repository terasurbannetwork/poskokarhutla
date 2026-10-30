#!/usr/bin/env python3
"""Geometri murni Kemitraan Kampus (stdlib): ray casting titik-di-poligon, jarak, centroid, Douglas-Peucker, siluet SVG.
Dipakai profil_daerah.py (KM-B02) dan skrip pipeline berikutnya. Tanpa I/O. Koordinat GeoJSON: (lon, lat).
Pakai: python3 -I scripts/kemitraan/geo.py --cek"""
import math, sys

R_BUMI_KM = 6371.0088  # jari-jari rerata bumi (IUGG)
SILUET_SKALA = 200     # kotak siluet 0..200 (bilangan bulat), sisi terpanjang pas kotak
SILUET_TOL = 1.0       # toleransi Douglas-Peucker TETAP (satuan kotak = 0,5% sisi terpanjang)
SILUET_MAKS_BYTE = 1000


# ---------------------------------------------------------------- titik di poligon
def dalam_cincin(x, y, r):
    """Ray casting: titik (x=lon, y=lat) di dalam cincin r [[lon,lat],...]."""
    di, n, j = False, len(r), len(r) - 1
    for i in range(n):
        xi, yi, xj, yj = r[i][0], r[i][1], r[j][0], r[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            di = not di
        j = i
    return di


def poligon(geom):
    """GeoJSON Polygon/MultiPolygon -> [(bbox, [cincin luar, lubang...])]"""
    ps = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    out = []
    for p in ps:
        xs = [c[0] for c in p[0]]; ys = [c[1] for c in p[0]]
        out.append(((min(xs), min(ys), max(xs), max(ys)), p))
    return out


def dalam_poligon(x, y, polis):
    for (x0, y0, x1, y1), p in polis:
        if x0 <= x <= x1 and y0 <= y <= y1 and dalam_cincin(x, y, p[0]) and not any(dalam_cincin(x, y, h) for h in p[1:]):
            return True
    return False


class Peta:
    """Indeks titik -> kunci poligon (grid 1 derajat). Peta([(kunci, polis)]).cari(lon, lat) -> kunci pertama (urutan masukan) atau None."""

    def __init__(self, daftar):
        self.g = {}
        for urut, (k, polis) in enumerate(daftar):
            for bb, p in polis:
                for gx in range(math.floor(bb[0]), math.floor(bb[2]) + 1):
                    for gy in range(math.floor(bb[1]), math.floor(bb[3]) + 1):
                        self.g.setdefault((gx, gy), []).append((urut, bb, k, p))

    def cari(self, x, y):
        best = None
        for urut, (x0, y0, x1, y1), k, p in self.g.get((math.floor(x), math.floor(y)), ()):
            if (best is None or urut < best[0]) and x0 <= x <= x1 and y0 <= y <= y1 \
                    and dalam_cincin(x, y, p[0]) and not any(dalam_cincin(x, y, h) for h in p[1:]):
                best = (urut, k)
        return best[1] if best else None


# ---------------------------------------------------------------- jarak, centroid
def haversine_km(lat1, lon1, lat2, lon2):
    a = math.radians
    h = math.sin(a(lat2 - lat1) / 2) ** 2 + math.cos(a(lat1)) * math.cos(a(lat2)) * math.sin(a(lon2 - lon1) / 2) ** 2
    return 2 * R_BUMI_KM * math.asin(min(1.0, math.sqrt(h)))


def _jarak_segmen_km(lat, lon, a, b):
    """Jarak titik ke ruas a-b ([lon,lat]) pada bidang lokal (ekuirektangular di sekitar titik); cukup untuk puluhan km."""
    kx = math.cos(math.radians(lat)) * math.pi / 180 * R_BUMI_KM
    ky = math.pi / 180 * R_BUMI_KM
    ax, ay, bx, by = (a[0] - lon) * kx, (a[1] - lat) * ky, (b[0] - lon) * kx, (b[1] - lat) * ky
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy
    t = 0.0 if L2 == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / L2))
    return math.hypot(ax + t * dx, ay + t * dy)


def jarak_titik_poligon_km(lat, lon, polis, batas_km=None):
    """0 bila di dalam; selain itu jarak ke tepi terdekat (km). batas_km: bagian yang bbox-nya lebih jauh dari batas dilewati
    (hasil None bila tak ada bagian dalam batas)."""
    if dalam_poligon(lon, lat, polis):
        return 0.0
    best = None
    for (x0, y0, x1, y1), p in polis:
        if batas_km is not None:
            dlat = batas_km / 111.0
            dlon = batas_km / (111.0 * max(0.1, math.cos(math.radians(lat))))
            if lon < x0 - dlon or lon > x1 + dlon or lat < y0 - dlat or lat > y1 + dlat:
                continue
        r = p[0]
        for i in range(len(r) - 1):
            d = _jarak_segmen_km(lat, lon, r[i], r[i + 1])
            if best is None or d < best:
                best = d
    return best


def centroid(polis):
    """Centroid berbobot luas dari cincin luar semua bagian (bidang lon/lat; cukup untuk titik label). -> (lat, lon) atau None."""
    sa = sx = sy = 0.0
    for _, p in polis:
        r = p[0]
        for i in range(len(r) - 1):
            c = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
            sa += c; sx += (r[i][0] + r[i + 1][0]) * c; sy += (r[i][1] + r[i + 1][1]) * c
    if sa == 0:
        return None
    return (sy / (3 * sa), sx / (3 * sa))


# ---------------------------------------------------------------- Douglas-Peucker + siluet
def _jarak_garis(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy)
    if L == 0:
        return math.hypot(p[0] - a[0], p[1] - a[1])
    return abs(dx * (a[1] - p[1]) - (a[0] - p[0]) * dy) / L


def dp(titik, tol):
    """Douglas-Peucker (iteratif) pada polilinea terbuka; ujung selalu dipertahankan."""
    if tol < 0:
        raise ValueError(f"toleransi {tol} negatif")
    n = len(titik)
    if n < 3:
        return list(titik)
    simpan = [False] * n
    simpan[0] = simpan[-1] = True
    tumpuk = [(0, n - 1)]
    while tumpuk:
        i, j = tumpuk.pop()
        dm, k = -1.0, -1
        for m in range(i + 1, j):
            d = _jarak_garis(titik[m], titik[i], titik[j])
            if d > dm:
                dm, k = d, m
        if dm > tol:
            simpan[k] = True
            tumpuk += [(i, k), (k, j)]
    return [t for t, s in zip(titik, simpan) if s]


def _luas(r):
    return abs(sum(r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1] for i in range(len(r) - 1))) / 2


def _sederhana_cincin(r, tol):
    """Cincin tertutup -> cincin tertutup disederhanakan (dibelah di titik terjauh dari titik awal supaya dasar D-P tak nol)."""
    pts = r[:-1] if r[0] == r[-1] else list(r)
    if len(pts) < 3:
        return None
    m = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2)
    a = dp(pts[:m + 1], tol)
    b = dp(pts[m:] + [pts[0]], tol)
    out = a[:-1] + b[:-1]
    # buang titik beruntun kembar (setelah pembulatan)
    bersih = [t for i, t in enumerate(out) if i == 0 or t != out[i - 1]]
    return bersih if len(bersih) >= 3 else None


def siluet(polis, maks_byte=SILUET_MAKS_BYTE, tol=SILUET_TOL, skala=SILUET_SKALA):
    """Path SVG `d` (kotak 0..skala, bilangan bulat, sumbu y ke bawah) dari cincin luar semua bagian poligon.
    Toleransi D-P tetap `tol`; bila melebihi maks_byte: bagian terkecil dibuang dulu, bagian terbesar tunggal yang masih
    kebesaran dilonggarkan toleransinya x1,5 berulang (deterministik). None bila tak ada bidang."""
    if not polis:
        return None
    lat0 = sum((bb[1] + bb[3]) / 2 for bb, _ in polis) / len(polis)
    kx = math.cos(math.radians(lat0))
    cin = [[(x * kx, y) for x, y in p[0]] for _, p in polis]
    xs = [t[0] for r in cin for t in r]; ys = [t[1] for r in cin for t in r]
    x0, y1 = min(xs), max(ys)
    sisi = max(max(xs) - x0, y1 - min(ys))
    if sisi <= 0:
        return None
    s = skala / sisi
    kotak = [[((x - x0) * s, (y1 - y) * s) for x, y in r] for r in cin]
    kotak.sort(key=lambda r: -_luas(r))

    def path(rs, t):
        d = []
        for r in rs:
            sd = _sederhana_cincin(r, t)
            if sd:
                bul = [(round(x), round(y)) for x, y in sd]
                bul = [q for i, q in enumerate(bul) if i == 0 or q != bul[i - 1]]
                if len(bul) >= 3:
                    d.append("M" + " ".join("%d %d" % q for q in bul) + "Z")
        return "".join(d)

    for n in range(len(kotak), 0, -1):
        d = path(kotak[:n], tol)
        if d and len(d.encode()) <= maks_byte:
            return d
    t = tol
    for _ in range(12):  # satu bagian terbesar masih kebesaran
        t *= 1.5
        d = path(kotak[:1], t)
        if d and len(d.encode()) <= maks_byte:
            return d
    return None


# ---------------------------------------------------------------- cek
def cek():
    kotak = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
    lubang = [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]
    ps = poligon({"type": "Polygon", "coordinates": [kotak, lubang]})
    assert dalam_poligon(2, 2, ps) and not dalam_poligon(5, 5, ps), "lubang harus mengecualikan titik"
    assert not dalam_poligon(11, 5, ps) and not dalam_poligon(-0.1, 5, ps), "titik di luar harus ditolak"
    mp = poligon({"type": "MultiPolygon", "coordinates": [[kotak], [[[20, 0], [30, 0], [30, 10], [20, 10], [20, 0]]]]})
    assert dalam_poligon(25, 5, mp) and not dalam_poligon(15, 5, mp), "MultiPolygon: bagian kedua / celah antar bagian"
    # Peta grid == brute force
    pt = Peta([("a", ps), ("b", mp)])
    for x, y in [(2, 2), (5, 5), (25, 5), (15, 5), (11, 11), (9.99, 9.99)]:
        brute = "a" if dalam_poligon(x, y, ps) else ("b" if dalam_poligon(x, y, mp) else None)
        assert pt.cari(x, y) == brute, f"Peta.cari({x},{y})={pt.cari(x, y)} != brute {brute}"
    # haversine: Jakarta (-6.2,106.8166) ke Bandung (-6.9175,107.6191) ~ 116 km; titik sama = 0; 1 derajat bujur di ekuator ~ 111,2 km
    d = haversine_km(0, 0, 90, 0)  # ekuator ke kutub = seperempat keliling = pi/2 * R
    assert abs(d - math.pi / 2 * R_BUMI_KM) < 1e-6, f"ekuator-kutub {d:.3f} km"
    assert 118 < haversine_km(-6.2, 106.8166, -6.9175, 107.6191) < 121, "Jakarta-Bandung ~119 km"
    assert haversine_km(1, 2, 1, 2) == 0
    assert abs(haversine_km(0, 100, 0, 101) - 111.195) < 0.05
    # jarak titik-poligon: di dalam 0; 1 derajat bujur di timur sisi kotak ekuator ~ 111,2 km - lebar
    ekuator = poligon({"type": "Polygon", "coordinates": [[[0, -1], [1, -1], [1, 1], [0, 1], [0, -1]]]})
    assert jarak_titik_poligon_km(0, 0.5, ekuator) == 0.0
    j = jarak_titik_poligon_km(0, 2, ekuator)
    assert abs(j - 111.195) < 0.2, f"jarak ke tepi timur {j:.2f} km != ~111,2"
    assert jarak_titik_poligon_km(0, 50, ekuator, batas_km=50) is None, "bagian jauh harus dilewati bila batas diberikan"
    # centroid
    c = centroid(ps)
    assert c is not None and abs(c[0] - 5) < 1e-9 and abs(c[1] - 5) < 1e-9, f"centroid kotak {c}"
    assert centroid([]) is None
    # Douglas-Peucker: titik segaris luruh; lonjakan > toleransi bertahan, <= toleransi luruh; toleransi negatif ditolak
    garis = [(0, 0), (1, 0), (2, 0), (3, 0), (4, 0)]
    assert dp(garis, 0.1) == [(0, 0), (4, 0)], dp(garis, 0.1)
    assert dp([(0, 0), (2, 3), (4, 0)], 2.0) == [(0, 0), (2, 3), (4, 0)], "lonjakan 3 > tol 2 harus bertahan"
    assert dp([(0, 0), (2, 1.5), (4, 0)], 2.0) == [(0, 0), (4, 0)], "lonjakan 1,5 <= tol 2 harus luruh"
    try:
        dp(garis, -1)
        raise AssertionError("toleransi negatif lolos")
    except ValueError:
        pass
    # siluet: lingkaran 6000 titik -> <= 1000 byte, dimulai M berakhir Z, deterministik, hanya bilangan bulat dalam kotak
    lingk = [[100 + 0.5 * math.cos(2 * math.pi * i / 6000), -3 + 0.5 * math.sin(2 * math.pi * i / 6000)] for i in range(6000)]
    lingk.append(lingk[0])
    pl = poligon({"type": "Polygon", "coordinates": [lingk]})
    sil = siluet(pl)
    assert sil and sil[0] == "M" and sil[-1] == "Z" and len(sil.encode()) <= SILUET_MAKS_BYTE, f"siluet lingkaran {len(sil or '')} byte"
    assert sil == siluet(pl), "siluet tidak deterministik"
    angka = [int(v) for v in sil.replace("M", " ").replace("Z", " ").split()]
    assert angka and min(angka) >= 0 and max(angka) <= SILUET_SKALA, f"koordinat di luar kotak: {min(angka)}..{max(angka)}"
    # pulau-pulau: bagian terkecil dibuang dulu bila kebesaran; bagian terbesar (kotak 1 derajat) selalu ada
    pulau = []
    for i in range(60):
        gx, gy, w = 3.0 * (i % 8), 3.0 * (i // 8), 2 - 0.02 * i
        pulau.append([[gx, gy], [gx + w, gy], [gx + w, gy + w], [gx, gy + w], [gx, gy]])
    pp = poligon({"type": "MultiPolygon", "coordinates": [[r] for r in pulau]})
    sp = siluet(pp)
    assert sp and len(sp.encode()) <= SILUET_MAKS_BYTE and sp.count("M") < 60, f"siluet 60 pulau: {sp.count('M') if sp else None} bagian, {len(sp or '')} byte"
    assert siluet(pp, maks_byte=3) is None, "batas mustahil harus null, bukan melanggar batas"
    assert siluet([]) is None
    print(f"OK geo.py: ray casting + lubang + Peta, haversine, jarak, centroid, D-P, siluet ({len(sil.encode())} byte lingkaran 6000 titik, {sp.count('M')} dari 60 pulau)")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        sys.exit(__doc__)
