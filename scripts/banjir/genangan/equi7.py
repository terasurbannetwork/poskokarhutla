"""Proyeksi Azimuthal Equidistant Equi7 Oceania (GFM): lon/lat WGS84 -> x,y meter, stdlib.
Parameter dari proj:wkt2 STAC GFM: pusat (131,5; -19,5), false easting 6988408,5356, false northing 7654884,53733.
Jarak dan azimut geodesik lewat invers Vincenty (ellipsoid), sama dengan pendekatan PROJ untuk aeqd miring."""
import math

A, F = 6378137.0, 1 / 298.257223563
B = A * (1 - F)
LON0, LAT0 = 131.5, -19.5
FE, FN = 6988408.5356, 7654884.53733


def vincenty(lon1, lat1, lon2, lat2):
    """-> (jarak m, azimut awal rad) dari titik 1 ke 2."""
    U1 = math.atan((1 - F) * math.tan(math.radians(lat1)))
    U2 = math.atan((1 - F) * math.tan(math.radians(lat2)))
    L = math.radians(lon2 - lon1)
    lam = L
    s1, c1, s2, c2 = math.sin(U1), math.cos(U1), math.sin(U2), math.cos(U2)
    for _ in range(100):
        sl, cl = math.sin(lam), math.cos(lam)
        ss = math.hypot(c2 * sl, c1 * s2 - s1 * c2 * cl)
        cs = s1 * s2 + c1 * c2 * cl
        sig = math.atan2(ss, cs)
        sa = c1 * c2 * sl / ss
        c2a = 1 - sa * sa
        c2sm = cs - 2 * s1 * s2 / c2a if c2a else 0.0
        C = F / 16 * c2a * (4 + F * (4 - 3 * c2a))
        lam2 = L + (1 - C) * F * sa * (sig + C * ss * (c2sm + C * cs * (-1 + 2 * c2sm * c2sm)))
        if abs(lam2 - lam) < 1e-12:
            lam = lam2
            break
        lam = lam2
    u2 = c2a * (A * A - B * B) / (B * B)
    k1 = (math.sqrt(1 + u2) - 1) / (math.sqrt(1 + u2) + 1)
    Aa = (1 + k1 * k1 / 4) / (1 - k1)
    Bb = k1 * (1 - 3 * k1 * k1 / 8)
    dsig = Bb * ss * (c2sm + Bb / 4 * (cs * (-1 + 2 * c2sm * c2sm) - Bb / 6 * c2sm * (-3 + 4 * ss * ss) * (-3 + 4 * c2sm * c2sm)))
    s = B * Aa * (sig - dsig)
    az = math.atan2(c2 * math.sin(lam), c1 * s2 - s1 * c2 * math.cos(lam))
    return s, az


def maju(lon, lat):
    s, az = vincenty(LON0, LAT0, lon, lat)
    return FE + s * math.sin(az), FN + s * math.cos(az)


if __name__ == "__main__":
    x, y = maju(LON0, LAT0 + 1e-9)
    assert abs(x - FE) < 1 and abs(y - FN) < 1, (x, y)
    x, y = maju(106.8272, -6.1754)  # Monas harus di dalam ubin E042N087 (4.2e6..4.5e6, 8.7e6..9.0e6)
    assert 4_200_000 <= x < 4_500_000 and 8_700_000 <= y < 9_000_000, (x, y)
    print("ok", round(x), round(y))
