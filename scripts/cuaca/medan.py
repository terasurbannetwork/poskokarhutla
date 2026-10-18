"""Medan prakiraan angin + hujan per jam untuk simulasi -> public/banjir/data/cuaca_medan.json (<= 600 KB)

Open-Meteo Forecast, kisi 1,5 derajat atas Indonesia, 72 jam dari 00:00 UTC hari ini. Angin 10 m disimpan sebagai komponen u (ke timur)
dan v (ke utara) dalam dm/s, hujan dalam 0,1 mm/jam, embusan dalam km/jam; semua bilangan bulat. Sel yang gagal diunduh mengosongkan seluruh
berkas (medan separuh jadi menyesatkan simulasi): berkas lama dibiarkan.
Pakai: python3 scripts/cuaca/medan.py   |   python3 scripts/cuaca/medan.py uji
"""
import math, os, sys, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import KELUAR, ambil, sekarang, simpan

LAT0, LON0, D, NY, NX, N = -11.0, 95.0, 1.5, 13, 32, 72   # lat -11..7, lon 95..141,5
URL = "https://api.open-meteo.com/v1/forecast"
VAR = "wind_speed_10m,wind_direction_10m,precipitation,wind_gusts_10m"


def uv(kec_ms, arah):
    """Kecepatan (m/s) dan arah ASAL angin (derajat dari utara) -> (u, v) m/s; None bila salah satunya kosong."""
    if kec_ms is None or arah is None:
        return None, None
    a = math.radians(arah)
    return -kec_ms * math.sin(a), -kec_ms * math.cos(a)


def olah(lokasi):
    """lokasi = respons Open-Meteo satu titik -> (u, v, r, g) deret int panjang N; nilai kosong jadi 0."""
    h = lokasi["hourly"]
    u, v = zip(*(uv(s, a) for s, a in zip(h["wind_speed_10m"], h["wind_direction_10m"])))
    ib = lambda x, k: [int(round((y or 0) * k)) for y in x]
    return ib(u, 10), ib(v, 10), ib(h["precipitation"], 10), ib(h["wind_gusts_10m"], 3.6)


def main():
    pts = [(LAT0 + D * j, LON0 + D * i) for j in range(NY) for i in range(NX)]
    u, v, r, g = ([] for _ in range(4))
    t0 = None
    for a in range(0, len(pts), 60):
        b = pts[a:a + 60]
        res = ambil(URL + "?" + urllib.parse.urlencode({"latitude": ",".join(f"{p[0]:.2f}" for p in b), "longitude": ",".join(f"{p[1]:.2f}" for p in b),
                                                        "hourly": VAR, "wind_speed_unit": "ms", "forecast_days": 3, "timezone": "UTC"}))
        res = res if isinstance(res, list) else [res]
        for x in res:
            o = olah(x)
            if len(o[0]) != N:
                raise RuntimeError(f"Open-Meteo medan: {len(o[0])} jam, harus {N}")
            for dst, s in zip((u, v, r, g), o):
                dst.append(s)
            t0 = t0 or x["hourly"]["time"][0]
    # [jam][sel]: transposisi supaya penggunaan klien = satu irisan per jam
    T = lambda m: [[m[s][h] for s in range(len(pts))] for h in range(N)]
    simpan(os.path.join(KELUAR, "cuaca_medan.json"), {
        "dibuat": sekarang(), "t0": t0 + ":00Z", "n": N, "lat0": LAT0, "lon0": LON0, "d": D, "nx": NX, "ny": NY,
        "u": T(u), "v": T(v), "r": T(r), "g": T(g),
        "baris": "lat naik dari lat0, lon naik dari lon0; indeks = iy*nx+ix; u,v dm/s (u ke timur, v ke utara), r 0,1 mm/jam, g km/jam",
        "sumber": "Open-Meteo Forecast (model terbaik per lokasi), kisi 1,5 derajat"})
    print(f"cuaca medan: {len(pts)} sel x {N} jam, t0 {t0}Z", file=sys.stderr)


def uji():
    u, v = uv(10, 0)      # angin dari utara bertiup ke selatan
    assert abs(u) < 1e-9 and v == -10
    u, v = uv(10, 270)    # dari barat bertiup ke timur
    assert round(u) == 10 and abs(v) < 1e-9
    assert uv(None, 90) == (None, None)
    o = olah({"hourly": {"wind_speed_10m": [5, None], "wind_direction_10m": [90, 90], "precipitation": [0.26, None], "wind_gusts_10m": [10, 20]}})
    assert o == ([-50, 0], [0, 0], [3, 0], [36, 72]), o
    print("ok medan")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
