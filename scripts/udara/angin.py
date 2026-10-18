"""Angin 10 m, 925 hPa, 850 hPa + tinggi lapisan batas, per 3 jam 0..72 jam, kisi 1 derajat Indonesia -> public/udara/data/angin.json

Sumber: Open-Meteo Forecast API (model best_match), satuan m/s, arah meteorologis (asal angin).
Kuota : 7 variabel x 4 hari = bobot 1 per titik -> 846 titik/jalan, panggilan multi-koordinat 100 titik.
u/v dalam dm/s bilangan bulat; blh dalam m (null bila model tak mengirim).
"""
import datetime as dt
import math
import time
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat

URL = "https://api.open-meteo.com/v1/forecast"
LAT = list(range(-11, 7))
LON = list(range(95, 142))
LAPIS = ["10m", "925hPa", "850hPa"]
N_JAM = 25


def uv(kec, arah):
    """Kecepatan (m/s) + arah asal (derajat) -> (u, v) dm/s. Angin DARI utara (0) bertiup ke selatan: v negatif."""
    if kec is None or arah is None:
        return None, None
    if kec < 0 or kec > 150 or not 0 <= arah <= 360:
        raise ValueError(f"angin tidak sah: {kec} m/s dari {arah}")
    r = math.radians(arah)
    return round(-kec * math.sin(r) * 10), round(-kec * math.cos(r) * 10)


def susun(blok, jam0):
    """blok: respons Open-Meteo per titik, urut LAT lalu LON. -> dict angin.json."""
    if len(blok) != len(LAT) * len(LON):
        raise ValueError(f"titik {len(blok)}, harus {len(LAT) * len(LON)}")
    jam = [jam0 + dt.timedelta(hours=3 * k) for k in range(N_JAM)]
    kunci = [j.strftime("%Y-%m-%dT%H:00") for j in jam]
    u = [[[[None] * len(LON) for _ in LAT] for _ in jam] for _ in LAPIS]
    v = [[[[None] * len(LON) for _ in LAT] for _ in jam] for _ in LAPIS]
    blh = [[[None] * len(LON) for _ in LAT] for _ in jam]
    for n, x in enumerate(blok):
        j, i = divmod(n, len(LON))
        h = x["hourly"]
        idx = {t: k for k, t in enumerate(h["time"])}
        for t, kk in enumerate(kunci):
            k = idx.get(kk)
            if k is None:
                continue
            for l, nm in enumerate(LAPIS):
                u[l][t][j][i], v[l][t][j][i] = uv(h[f"wind_speed_{nm}"][k], h[f"wind_direction_{nm}"][k])
            b = h.get("boundary_layer_height", [None] * len(h["time"]))[k]
            blh[t][j][i] = None if b is None else int(round(b))
    kosong = sum(c is None for L in u for T in L for R in T for c in R)
    if kosong > len(LAPIS) * N_JAM * len(LAT) * len(LON) * .2:
        raise ValueError(f"{kosong} sel angin kosong (>20%); respons tidak lengkap")
    return {"v": 1, "dibuat": alat.iso(dt.datetime.now(dt.timezone.utc)), "sumber": "Open-Meteo Forecast (best_match)",
            "jam": [alat.iso(j) for j in jam], "lapis": LAPIS, "lat": LAT, "lon": LON, "u": u, "v": v, "blh": blh}


def ambil():
    titik = [(la, lo) for la in LAT for lo in LON]
    var = ",".join([f"wind_speed_{l},wind_direction_{l}" for l in LAPIS] + ["boundary_layer_height"])
    blok = []
    for a in range(0, len(titik), 100):
        b = titik[a:a + 100]
        d = alat.ambil(f"{URL}?latitude={','.join(str(x[0]) for x in b)}&longitude={','.join(str(x[1]) for x in b)}"
                       f"&hourly={var}&forecast_days=4&timezone=GMT&wind_speed_unit=ms")
        blok += d if isinstance(d, list) else [d]
        time.sleep(3)
    return blok


def main():
    t = alat.sekarang()
    jam0 = t.replace(hour=t.hour - t.hour % 3)
    d = susun(ambil(), jam0)
    nb = alat.simpan("angin.json", d)
    alat.log(f"angin.json: {nb // 1024} KB, {d['jam'][0]}..{d['jam'][-1]}")


def uji():
    assert uv(10, 0) == (0, -100) and uv(10, 90) == (-100, 0) and uv(None, 5) == (None, None)
    for salah in ((-1, 0), (5, 400), (999, 10)):
        try:
            uv(*salah)
            raise AssertionError(f"uv{salah} harus ditolak")
        except ValueError:
            pass
    jam0 = dt.datetime(2026, 10, 18, 3, tzinfo=dt.timezone.utc)
    waktu = [(jam0 + dt.timedelta(hours=k)).strftime("%Y-%m-%dT%H:00") for k in range(80)]
    def titik(sp):
        h = {"time": waktu, "boundary_layer_height": [812.4] * 80}
        for l in LAPIS:
            h[f"wind_speed_{l}"], h[f"wind_direction_{l}"] = [sp] * 80, [270] * 80
        return {"hourly": h}
    blok = [titik(5) for _ in range(len(LAT) * len(LON))]
    d = susun(blok, jam0)
    assert d["jam"][0] == "2026-10-18T03:00Z" and d["jam"][-1] == "2026-10-21T03:00Z" and len(d["jam"]) == 25
    assert d["u"][2][24][17][46] == 50 and d["v"][0][0][0][0] == 0 and d["blh"][3][5][5] == 812   # angin dari barat -> u positif
    for salah in (blok[:-1], [titik(None) for _ in blok]):
        try:
            susun(salah, jam0)
            raise AssertionError("respons kurang/kosong harus ditolak")
        except ValueError:
            pass
    print("angin uji: lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
