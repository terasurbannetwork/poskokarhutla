"""LT-04 (paket lereng-bangunan): pembaca DEM dan lereng PERSEN metode Horn 3x3, stdlib saja.
Lereng persen = 100 * tan(sudut) (40 persen = 21,8 derajat); BUKAN derajat seperti rumus.skor_lereng (KEPUTUSAN D1).
Ukuran piksel dalam meter mengikuti lintang tiap baris (ellipsoid WGS84). Piksel yang salah satu dari 8 tetangganya
nodata/NaN tidak diberi lereng (NaN). Tanpa resampling.
Pembaca TIFF dipakai ulang dari scripts/banjir/genangan/tiff_mini.py lewat importlib (tidak disalin).
Pakai:  python3 scripts/longsor/lereng_dem.py uji"""
import array, importlib.util, math, os, sys

AWAL = os.path.dirname(os.path.abspath(__file__))
NAN = float("nan")


def _tiff_mini():
    s = importlib.util.spec_from_file_location("tiff_mini_lereng", os.path.join(AWAL, "../banjir/genangan/tiff_mini.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def meter_per_derajat(lat):
    """(meter per derajat bujur, meter per derajat lintang) di lintang lat, rumus deret WGS84."""
    p = math.radians(lat)
    return (111412.84 * math.cos(p) - 93.5 * math.cos(3 * p) + 0.118 * math.cos(5 * p),
            111132.954 - 559.822 * math.cos(2 * p) + 1.175 * math.cos(4 * p))


def buka(jalur):
    """-> (Tiff, lon0, lat0, dlon, dlat): sudut kiri-atas piksel (0,0) dan langkah derajat (dlat positif ke selatan)."""
    t = _tiff_mini().Tiff(jalur)
    i, j, _, x, y, _ = t.titik_ikat
    return t, x - i * t.skala[0], y + j * t.skala[1], t.skala[0], t.skala[1]


def jendela(t, r0, r1, c0, c1):
    """Baris r0..r1-1, kolom c0..c1-1 sebagai daftar array('f'); nodata diganti NaN."""
    keluar = [array.array("f", [NAN]) * (c1 - c0) for _ in range(r1 - r0)]
    for tb in range(r0 // t.tt, (r1 - 1) // t.tt + 1):
        for tk in range(c0 // t.tl, (c1 - 1) // t.tl + 1):
            u = t.ubin(tk, tb)
            for r in range(max(r0, tb * t.tt), min(r1, (tb + 1) * t.tt)):
                a, b = max(c0, tk * t.tl), min(c1, (tk + 1) * t.tl)
                seg = u[(r - tb * t.tt) * t.tl + (a - tk * t.tl):(r - tb * t.tt) * t.tl + (b - tk * t.tl)]
                keluar[r - r0][a - c0:b - c0] = array.array("f", seg)
    if t.nodata is not None:
        for row in keluar:
            for k, v in enumerate(row):
                if v == t.nodata:
                    row[k] = NAN
    return keluar


def lereng_persen(z, lat_atas, dlon, dlat):
    """z: daftar baris (tiap baris array/daftar tinggi meter, NaN = tak ada); lat_atas = lintang baris 0 (pusat; sudut dari buka() meleset setengah piksel, dampak ke cos(lintang) diabaikan);
    dlon, dlat = langkah piksel derajat. -> daftar baris array('f') lereng persen; tepi dan sekitar NaN = NaN."""
    h, w = len(z), len(z[0])
    keluar = [array.array("f", [NAN]) * w for _ in range(h)]
    for r in range(1, h - 1):
        mx, my = meter_per_derajat(lat_atas - r * dlat)
        dx, dy = mx * dlon, my * dlat
        a, b, c = z[r - 1], z[r], z[r + 1]  # utara, tengah, selatan
        o = keluar[r]
        for k in range(1, w - 1):
            n = (a[k - 1], a[k], a[k + 1], b[k - 1], b[k + 1], c[k - 1], c[k], c[k + 1], b[k])
            if any(v != v for v in n):
                continue
            gx = ((a[k + 1] + 2 * b[k + 1] + c[k + 1]) - (a[k - 1] + 2 * b[k - 1] + c[k - 1])) / (8 * dx)
            gy = ((a[k - 1] + 2 * a[k] + a[k + 1]) - (c[k - 1] + 2 * c[k] + c[k + 1])) / (8 * dy)
            o[k] = 100 * math.sqrt(gx * gx + gy * gy)
    return keluar


def uji():
    # bidang miring tepat 40 persen ke timur, ke utara, dan diagonal (komponen 40/sqrt2 tiap sumbu), di tiga lintang;
    # float32 membulatkan tinggi, jadi toleransi 0,05 persen
    for lat in (0.0, -6.9, -7.5):
        for dlon, dlat in ((1 / 3600, 1 / 3600), (0.0002, 0.0002)):
            mx, my = meter_per_derajat(lat)
            for sx, sy in ((0.4, 0), (0, 0.4), (0.4 / math.sqrt(2), 0.4 / math.sqrt(2))):
                z = [array.array("f", [sx * mx * dlon * k + sy * my * dlat * (6 - r) for k in range(7)]) for r in range(7)]
                got = lereng_persen(z, lat + 3 * dlat, dlon, dlat)[3][3]
                assert abs(got - 40) < 0.05, (lat, dlon, sx, sy, got)
    # tetangga NaN -> NaN; tepi -> NaN
    z = [array.array("f", [1.0] * 5) for _ in range(5)]
    z[2][2] = NAN
    g = lereng_persen(z, 0.0, 1e-4, 1e-4)
    assert g[2][1] != g[2][1] and g[1][1] != g[1][1] and g[0][0] != g[0][0]
    z[2][2] = 1.0
    assert lereng_persen(z, 0.0, 1e-4, 1e-4)[2][2] == 0.0
    # koefisien deret WGS84 dicek ke nilai tetap
    assert abs(meter_per_derajat(0)[0] - 111319.5) < 1 and abs(meter_per_derajat(0)[1] - 110574.3) < 1
    # persen <-> derajat
    assert abs(math.degrees(math.atan(0.4)) - 21.8) < 0.01
    # pembaca TIFF termuat dari tiff_mini
    assert _tiff_mini().Tiff
    print("ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        print(__doc__)
