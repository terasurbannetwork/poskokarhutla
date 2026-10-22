"""Cuaca per jam untuk tab Simulasi, dihitung di Actions supaya peramban tidak memanggil Open-Meteo sendiri.

Satu berkas per sel 0,5 derajat (pusat sel = sel05 di scripts/sebaran/cuaca.py, sama dengan data latih model sebaran):
public/data/cuaca/<lat>_<lon>.json = {dibuat, lat, lon, m0 (ms UTC jam pertama), tc, rh, hujan, ws, wd, gust}, 40 hari lalu
+ 6 hari ke depan per jam. Dibaca SebaranModel.cuacaSel() (sebaran_model.js) untuk model data (butuh 40 hari: masa panas
FWI) dan Sim.cuacaJam() (index.html, 1 hari lalu + 72 jam). Sel yang tidak ada / prakiraannya < 72 jam -> peramban jatuh
ke Open-Meteo langsung.

Sel yang diambil: kompleks Siaga/Prioritas (level >= 2) di kluster.json, diurut level lalu skor. Kuota: bobot per sel
= max(1, 6/10) x 46/14 = 3,3; CUACA_SEL_MAKS (bawaan 400) -> <= 1.320 panggilan. Sel yang berkasnya < CUACA_SEGAR_JAM
(bawaan 20) jam tidak diambil ulang, jadi titik.yml (tiap 3 jam) hanya mengisi sel kompleks baru. Berkas sel yang tidak
dipakai kompleks mana pun dan lebih tua dari 3 hari dibuang.

Tambahan FFMC per jam (fwi.deret_ffmc_jam, Van Wagner 1977), dihitung dari seluruh 40 hari lalu (panas awal 85, jauh > 48 jam):
  ffmc = {m0 (ms UTC, 00.00 WIB hari ini), v: [FFMC 1 desimal per jam sampai ujung prakiraan]}
  ffmc_puncak = {tgl (WIB), v, wib ("HH:00")}  -> maksimum hari kalender WIB hari ini (jam lalu + prakiraan)
Jam kosong di tengah membawa nilai sebelumnya; jam kosong di ujung dipotong. Hari ini WIB tanpa data sama sekali: FFMC tidak ditulis.

Pakai:  python3 scripts/data/cuaca_jam.py  |  ... uji
"""
import datetime as dt, json, math, os, sys, time, urllib.parse

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(DIR, "..", "banjir"))
from umum import ambil, KuotaHabis  # noqa: E402
sys.path.insert(0, DIR)
from fwi import deret_ffmc_jam  # noqa: E402

DATA = os.path.join(DIR, "..", "..", "public", "data")
KELUAR = os.path.join(DATA, "cuaca")
URL = "https://api.open-meteo.com/v1/forecast"
VAR = ["temperature_2m", "relative_humidity_2m", "precipitation", "wind_speed_10m", "wind_direction_10m", "wind_gusts_10m"]
KOLOM = ["tc", "rh", "hujan", "ws", "wd", "gust"]
LALU, DEPAN = 40, 6
MAKS = int(os.environ.get("CUACA_SEL_MAKS", "400"))
SEGAR_JAM = float(os.environ.get("CUACA_SEGAR_JAM", "20"))


def sel05(lat, lon):
    return math.floor(lat / .5) * .5 + .25, math.floor(lon / .5) * .5 + .25


def nama(la, lo):
    return f"{la:.2f}_{lo:.2f}.json"


def kemas(h, la, lo, kini):
    """respons Open-Meteo (hourly, timezone GMT) -> isi berkas ringkas"""
    o = {"dibuat": kini.isoformat(timespec="minutes"), "lat": la, "lon": lo,
         "m0": int(dt.datetime.fromisoformat(h["time"][0]).replace(tzinfo=dt.timezone.utc).timestamp() * 1000)}
    for k, v in zip(KOLOM, VAR):
        o[k] = [None if x is None else round(x, 1) for x in h[v]]
    o.update(ffmc_jam(h, kini))
    return o


def ffmc_jam(h, kini):
    """FFMC per jam sejak 00.00 WIB hari ini + puncak hari ini; {} bila tak bisa dihitung"""
    n = len(h["time"])
    f = deret_ffmc_jam(list(zip(h["temperature_2m"], h["relative_humidity_2m"], h["wind_speed_10m"], h["precipitation"])))
    m0 = int(dt.datetime.fromisoformat(h["time"][0]).replace(tzinfo=dt.timezone.utc).timestamp() * 1000)
    wib0 = (kini + dt.timedelta(hours=7)).replace(hour=0, minute=0, second=0, microsecond=0)  # 00.00 WIB hari ini
    ms0 = int((wib0 - dt.timedelta(hours=7)).timestamp() * 1000)
    a = round((ms0 - m0) / 3600000)
    if a < 0 or a + 24 > n or all(x is None for x in h["temperature_2m"][a:a + 24]):
        return {}
    hari = f[a:a + 24]
    j = max(range(24), key=lambda i: hari[i])
    z = max(i for i, x in enumerate(h["temperature_2m"]) if x is not None)  # ujung kosong tidak dibawa datar seolah prakiraan
    return {"ffmc": {"m0": ms0, "v": [round(x, 1) for x in f[a:z + 1]]},
            "ffmc_puncak": {"tgl": wib0.date().isoformat(), "v": round(hari[j], 1), "wib": f"{j:02d}:00"}}


def sel_dipakai():
    fs = json.load(open(os.path.join(DATA, "kluster.json")))["features"]
    fs = sorted((f["properties"] for f in fs if f["properties"].get("level", 0) >= 2), key=lambda p: (-p["level"], -(p.get("skor") or 0)))
    urut = []
    for p in fs:
        s = sel05(p["lat"], p["lon"])
        if s not in urut:
            urut.append(s)
    return urut


def main():
    os.makedirs(KELUAR, exist_ok=True)
    kini = dt.datetime.now(dt.timezone.utc)
    semua = sel_dipakai()
    def umur(s):
        j = os.path.join(KELUAR, nama(*s))
        return (time.time() - os.path.getmtime(j)) / 3600 if os.path.exists(j) else 1e9
    perlu = [s for s in semua if umur(s) >= SEGAR_JAM][:MAKS]
    ok = 0
    for a in range(0, len(perlu), 20):
        g = perlu[a:a + 20]
        q = {"latitude": ",".join(str(x[0]) for x in g), "longitude": ",".join(str(x[1]) for x in g), "hourly": ",".join(VAR),
             "past_days": LALU, "forecast_days": DEPAN, "timezone": "GMT", "wind_speed_unit": "kmh"}
        try:
            d = ambil(URL + "?" + urllib.parse.urlencode(q), coba=3, batas_waktu=120)
        except KuotaHabis as e:
            print("kuota Open-Meteo habis, berhenti:", e, file=sys.stderr)
            break
        except Exception as e:
            print("gagal:", e, file=sys.stderr)
            continue
        for (la, lo), r in zip(g, d if isinstance(d, list) else [d]):
            with open(os.path.join(KELUAR, nama(la, lo)), "w") as f:
                json.dump(kemas(r["hourly"], la, lo, kini), f, separators=(",", ":"))
            ok += 1
        time.sleep(len(g) * 3.3 * .8)  # di bawah batas 5.000 bobot/jam
    dipakai = {nama(*s) for s in semua}
    buang = 0
    for f in os.listdir(KELUAR):
        j = os.path.join(KELUAR, f)
        if f not in dipakai and time.time() - os.path.getmtime(j) > 3 * 86400:
            os.remove(j); buang += 1
    print(f"cuaca_jam: {len(semua)} sel dipakai, {len(perlu)} perlu diambil, {ok} ditulis, {buang} dibuang")


def uji():
    assert sel05(-0.1, 101.6) == (-0.25, 101.75), sel05(-0.1, 101.6)
    assert sel05(2.49, 117.0) == (2.25, 117.25)
    assert nama(-0.25, 101.75) == "-0.25_101.75.json"
    h = {"time": ["2026-10-01T00:00", "2026-10-01T01:00"], **{v: [1.234, None] for v in VAR}}
    o = kemas(h, -0.25, 101.75, dt.datetime(2026, 10, 2, tzinfo=dt.timezone.utc))
    assert o["m0"] == 1790812800000, o["m0"]
    assert o["tc"] == [1.2, None] and set(KOLOM) <= set(o)
    assert "ffmc" not in o  # 2 jam tidak menutup hari ini WIB: tidak memalsukan
    # 3 hari uji: siang kering naik, hujan jam 13 WIB menurunkan; puncak hari ini ada di jam siang WIB
    kini = dt.datetime(2026, 10, 2, 5, tzinfo=dt.timezone.utc)  # 12.00 WIB tgl 2
    ts = [(dt.datetime(2026, 10, 1) + dt.timedelta(hours=i)).isoformat(timespec="minutes") for i in range(72)]
    jam = lambda i: (i + 7) % 24  # jam WIB
    g = {"time": ts, "temperature_2m": [24 + 9 * math.sin(math.pi * (jam(i) - 6) / 12) if 6 <= jam(i) <= 18 else 24 for i in range(72)],
         "relative_humidity_2m": [45 if 10 <= jam(i) <= 16 else 85 for i in range(72)], "wind_speed_10m": [8] * 72,
         "precipitation": [0.0] * 72}
    g["precipitation"][30] = 6.0   # UTC 06 = 13.00 WIB tgl 2
    k = ffmc_jam(g, kini)
    assert k["ffmc"]["m0"] == 1790874000000 and len(k["ffmc"]["v"]) == 72 - 17 and k["ffmc_puncak"]["tgl"] == "2026-10-02", k
    assert k["ffmc"]["v"][13] < k["ffmc"]["v"][12], k["ffmc"]["v"][10:16]  # jam 13 WIB: ada hujan 6 mm
    g["temperature_2m"][-5:] = [None] * 5
    assert len(ffmc_jam(g, kini)["ffmc"]["v"]) == 72 - 17 - 5  # ujung prakiraan kosong dipotong, tidak dibawa datar
    print("cuaca_jam uji: lolos")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
