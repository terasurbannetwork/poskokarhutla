"""Hujan harian kisi 0,25 derajat (darat saja) dari Open-Meteo forecast -> public/banjir/data/hujan.json

Per sel, zona Asia/Jakarta, 7 hari lalu + hari ini + 6 hari ke depan (past_days=7, forecast_days=7):
  h   hujan harian (mm)            3 hari lalu .. hari ini+6 (10 nilai, sama dengan "hari")
  p   peluang hujan maks (%)       idem
  jam lama hujan (jam)             idem
  g   hembusan angin maks (km/jam) idem
  h3  jumlah hujan 3 hari bergeser terbesar di jendela prakiraan (hari ini .. +6)
  a7  hujan anteseden: jumlah 7 hari teramati terakhir (H-7 .. H-1)
  imax  intensitas hujan per jam terbesar hari itu (mm/jam)          10 nilai, sama dengan "hari"
  cape  CAPE maksimum hari itu (J/kg)                                 idem
  sm    kelembapan tanah rata-rata harian 3-27 cm (m3/m3), rata-rata tebal lapisan 3-9 dan 9-27 cm   idem
  ws, wd  angin 10 m jam 12 waktu setempat (km/jam, arah asal derajat), sama dengan fwi.json   idem

Kuota: 10 variabel (4 harian + 6 per jam) x 14 hari = bobot tepat 1 per lokasi (rumus Open-Meteo: max(1, var/10 x
max(1, hari/14))). Variabel ke-11 menaikkan bobot jadi 1,1; karena itu lapisan 0-1 dan 1-3 cm tidak diambil
(sm = 3-27 cm, bukan 0-27 cm). ~2.930 lokasi = ~2.930 panggilan/hari.

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
JAM = "precipitation,cape,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm,wind_speed_10m,wind_direction_10m"
# jam 12 waktu setempat dalam jam WIB (zona Asia/Jakarta untuk semua sel): WITA 11.00 WIB, WIT 10.00 WIB
WITA = {"51", "52", "53", "63", "64", "65", "71", "72", "73", "74", "75", "76"}


def jam_siang(prov):
    return 10 if prov[0] in "89" else 11 if prov in WITA else 12


def jumlah(xs):
    ada = [x for x in xs if x is not None]
    return round(sum(ada), 1) if ada else None


def geser_maks(xs, n=3):
    """Jumlah n hari bergeser terbesar. Nilai kosong dihitung 0; deret lebih pendek dari n -> jumlah seluruhnya."""
    xs = [x or 0 for x in xs]
    if len(xs) <= n:
        return round(sum(xs), 1)
    return round(max(sum(xs[i:i + n]) for i in range(len(xs) - n + 1)), 1)


def per_jam(d, hari, siang):
    """Variabel per jam -> per hari (urut `hari`): imax, cape, sm 3-27 cm, ws/wd jam `siang` WIB."""
    j = d["hourly"]
    out = {k: [] for k in ("imax", "cape", "sm", "ws", "wd")}
    for t in hari:
        i = [k for k, w in enumerate(j["time"]) if w.startswith(t)]
        p = [j["precipitation"][k] for k in i if j["precipitation"][k] is not None]
        c = [j["cape"][k] for k in i if j["cape"][k] is not None]
        s = [(6 * j["soil_moisture_3_to_9cm"][k] + 18 * j["soil_moisture_9_to_27cm"][k]) / 24 for k in i
             if j["soil_moisture_3_to_9cm"][k] is not None and j["soil_moisture_9_to_27cm"][k] is not None]
        n = next((k for k in i if j["time"][k].endswith(f"T{siang:02d}:00")), None)
        out["imax"].append(round(max(p), 1) if p else None)
        out["cape"].append(round(max(c)) if c else None)
        out["sm"].append(round(sum(s) / len(s), 3) if s else None)
        ws = None if n is None else j["wind_speed_10m"][n]
        wd = None if n is None else j["wind_direction_10m"][n]
        out["ws"].append(None if ws is None else round(ws, 1))
        out["wd"].append(None if wd is None else round(wd))
    return out


def olah(d, siang=12):
    """Satu lokasi Open-Meteo -> (hari, nilai sel). Indeks LALU = hari ini."""
    h = d["daily"]
    hujan = h["precipitation_sum"]
    potong = slice(LALU - 3, None)
    bulat = lambda xs, k=0: [None if x is None else (round(x, k) if k else round(x)) for x in xs[potong]]
    return h["time"][potong], {
        "h": bulat(hujan, 1), "p": bulat(h["precipitation_probability_max"]),
        "jam": bulat(h["precipitation_hours"]), "g": bulat(h["wind_gusts_10m_max"]),
        "h3": geser_maks(hujan[LALU:]), "a7": jumlah(hujan[:LALU]),
        **(per_jam(d, h["time"][potong], siang) if "hourly" in d else {}),
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
               + f"&daily={VAR}&hourly={JAM}&past_days={LALU}&forecast_days=7&timezone=Asia%2FJakarta")
        for g, d in zip(bagian, per_lokasi(ambil(url))):
            hari, nilai = olah(d, jam_siang(g[2]))
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
    jam = [f"d{i}T{k:02d}:00" for i in range(14) for k in range(24)]
    d["hourly"] = {"time": jam, "precipitation": [k % 24 for k in range(336)], "cape": [100.4] * 336,
                   "soil_moisture_3_to_9cm": [0.2] * 336, "soil_moisture_9_to_27cm": [0.4] * 336,
                   "wind_speed_10m": [k % 24 + 0.04 for k in range(336)], "wind_direction_10m": [270] * 336}
    hari, v = olah(d, jam_siang("64"))
    assert v["imax"][0] == 23 and v["cape"][0] == 100 and v["sm"][0] == 0.35 and v["ws"][0] == 11 and v["wd"][0] == 270, v
    assert len(v["sm"]) == 10 and jam_siang("94") == 10 and jam_siang("62") == 12
    print("ok hujan")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
