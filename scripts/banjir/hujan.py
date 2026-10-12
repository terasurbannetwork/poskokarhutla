"""Hujan harian kisi 0,25 derajat (darat saja) dari Open-Meteo forecast -> public/banjir/data/hujan.json

Per sel, zona Asia/Jakarta, 7 hari lalu + hari ini + 6 hari ke depan (past_days=7, forecast_days=7):
  h   hujan harian (mm)            3 hari lalu .. hari ini+6 (10 nilai, sama dengan "hari")
  p   peluang hujan maks (%)       idem
  jam lama hujan (jam)             idem
  g   hembusan angin maks (km/jam) idem
  h3  jumlah hujan 3 hari bergeser terbesar di jendela prakiraan (hari ini .. +6)
  a7  hujan anteseden: jumlah 7 hari teramati terakhir (H-7 .. H-1)

Pakai:  python3 scripts/data/hujan.py        |  python3 scripts/data/hujan.py uji
"""
import datetime as dt, os, sys, time

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, WIB, ambil, grid_darat, per_lokasi, simpan
from wilayah import Wilayah

SEL = 0.25
PER_PANGGIL = 100  # ~3 KB URL; Open-Meteo menghitung tiap lokasi sebagai satu panggilan (14 hari, 4 variabel)
JEDA = 11          # batas 600 panggilan/menit -> 100 lokasi tiap ~10 dtk
LALU = 7
VAR = "precipitation_sum,precipitation_probability_max,precipitation_hours,wind_gusts_10m_max"


def jumlah(xs):
    ada = [x for x in xs if x is not None]
    return round(sum(ada), 1) if ada else None


def geser_maks(xs, n=3):
    """Jumlah n hari bergeser terbesar. Nilai kosong dihitung 0; deret lebih pendek dari n -> jumlah seluruhnya."""
    xs = [x or 0 for x in xs]
    if len(xs) <= n:
        return round(sum(xs), 1)
    return round(max(sum(xs[i:i + n]) for i in range(len(xs) - n + 1)), 1)


def olah(d):
    """Satu lokasi Open-Meteo -> (hari, nilai sel). Indeks LALU = hari ini."""
    h = d["daily"]
    hujan = h["precipitation_sum"]
    potong = slice(LALU - 3, None)
    bulat = lambda xs, k=0: [None if x is None else (round(x, k) if k else round(x)) for x in xs[potong]]
    return h["time"][potong], {
        "h": bulat(hujan, 1), "p": bulat(h["precipitation_probability_max"]),
        "jam": bulat(h["precipitation_hours"]), "g": bulat(h["wind_gusts_10m_max"]),
        "h3": geser_maks(hujan[LALU:]), "a7": jumlah(hujan[:LALU]),
    }


def main():
    mulai = time.time()
    grid = grid_darat(Wilayah(), SEL)
    print(f"{len(grid)} sel darat", file=sys.stderr)
    hasil, hari = [], None
    for a in range(0, len(grid), PER_PANGGIL):
        bagian = grid[a:a + PER_PANGGIL]
        url = ("https://api.open-meteo.com/v1/forecast?latitude=" + ",".join(str(g[0]) for g in bagian)
               + "&longitude=" + ",".join(str(g[1]) for g in bagian)
               + f"&daily={VAR}&past_days={LALU}&forecast_days=7&timezone=Asia%2FJakarta")
        for g, d in zip(bagian, per_lokasi(ambil(url))):
            hari, nilai = olah(d)
            hasil.append({"lat": g[0], "lon": g[1], "prov": g[2], **nilai})
        print(f"  {len(hasil)}/{len(grid)}", file=sys.stderr)
        if a + PER_PANGGIL < len(grid):
            time.sleep(JEDA)
    hari_ini = hari[3] if hari else dt.datetime.now(WIB).date().isoformat()  # indeks 3 = hari ini menurut Open-Meteo
    simpan(os.path.join(KELUAR, "hujan.json"), {"sel": SEL, "hari": hari, "hari_ini": hari_ini, "grid": hasil})
    print(f"hujan.json: {len(hasil)} sel, {time.time() - mulai:.0f} dtk", file=sys.stderr)


def uji():
    assert geser_maks([1, 2, 3, 10, 0, 0, 5]) == 15
    assert geser_maks([None, 50, 60, None]) == 110
    assert geser_maks([4, 5]) == 9
    assert jumlah([None, 1.25, 2]) == 3.2 and jumlah([None]) is None
    d = {"daily": {"time": [f"d{i}" for i in range(14)], "precipitation_sum": [1] * 7 + [0, 0, 30, 40, 50, 0, 0],
                   "precipitation_probability_max": [10] * 14, "precipitation_hours": [1] * 14, "wind_gusts_10m_max": [20.4] * 14}}
    hari, v = olah(d)
    assert hari[0] == "d4" and hari[3] == "d7" and len(v["h"]) == 10, hari
    assert v["a7"] == 7 and v["h3"] == 120 and v["g"][0] == 20, v
    print("ok hujan")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
