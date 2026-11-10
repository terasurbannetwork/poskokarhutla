"""Cuaca semua bandara BMKG -> public/banjir/data/cuaca_bandara_bmkg.json.

Sumber: https://www.bmkg.go.id/cuaca/bandara (daftar 137 bandara di __NUXT_DATA__) dan /cuaca/bandara/{ICAO} (METAR, TAF, deret jam-jaman).
Baris `data` dengan temp null = prakiraan; yang bertemp = pengamatan. Prakiraan disimpan 12 jam dari waktu baris pertama. Angin km/jam apa adanya,
arah teks BMKG apa adanya. visibility ">=10" -> 10 km + `vis_min` true. Tanpa status laik/ambang. Zona = time_zone baris (WIB/WITA/WIT).
Metadata (wmo_id, elevation, dst.) hanya ikut bila halaman bandara itu memuatnya (daftar memuatnya untuk WIII saja).
Bandara gagal: baris lamanya dibiarkan, kodenya masuk `gagal`. Jeda 2 detik per halaman.
Pakai: python3 scripts/cuaca/bandara_bmkg.py | ... uji
"""
import datetime as dt, json, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bmkg_kab10 import UA, nuxt_semua, unduh as _unduh  # noqa: F401
from dasar import KELUAR, WIB, baca, simpan

BASIS = "https://www.bmkg.go.id/cuaca/bandara"
JEDA = 2.0
JAM = 12
BERKAS = os.path.join(KELUAR, "cuaca_bandara_bmkg.json")
BPS = {"Aceh": "11", "Sumatera Utara": "12", "Sumatera Barat": "13", "Riau": "14", "Jambi": "15", "Sumatera Selatan": "16", "Bengkulu": "17",
       "Lampung": "18", "Bangka Belitung": "19", "Kepulauan Riau": "21", "DKI Jakarta": "31", "Jawa Barat": "32", "Jawa Tengah": "33",
       "DI Yogyakarta": "34", "Jawa Timur": "35", "Banten": "36", "Bali": "51", "Nusa Tenggara Barat": "52", "Nusa Tenggara Timur": "53",
       "Kalimantan Barat": "61", "Kalimantan Tengah": "62", "Kalimantan Selatan": "63", "Kalimantan Timur": "64", "Kalimantan Utara": "65",
       "Sulawesi Utara": "71", "Sulawesi Tengah": "72", "Sulawesi Selatan": "73", "Sulawesi Tenggara": "74", "Gorontalo": "75", "Sulawesi Barat": "76",
       "Maluku": "81", "Maluku Utara": "82", "Papua": "91", "Papua Barat": "92", "Papua Selatan": "93", "Papua Tengah": "94",
       "Papua Pegunungan": "95", "Papua Barat Daya": "96"}
META = ("wmo_id", "elevation", "station_class", "airport_authority", "airport_administrator", "area_coordinator")


def num(v):
    try:
        return None if v in (None, "") else float(v)
    except ValueError:
        return None


def vis(v):
    if v in (None, ""):
        return None, False
    s = str(v)
    return num(s.lstrip(">=")), s.startswith(">=")


def daftar(nilai):
    """-> (daftar bandara, objek halaman bila ada) dari nilai-nilai NUXT."""
    dft = next(v for v in nilai if isinstance(v, list) and v and isinstance(v[0], dict) and "province" in v[0])
    hal = next((v for v in nilai if isinstance(v, dict) and "icao_id" in v and "data" in v), None)
    return dft, hal


def olah(b, hal, sekarang):
    """b = baris daftar, hal = objek halaman detail -> baris keluaran."""
    baris = sorted({r["local_datetime"]: r for g in hal["data"] for r in g if r.get("local_datetime")}.values(), key=lambda r: r["local_datetime"])
    obs = [r for r in baris if r.get("temp") is not None]
    pra = [r for r in baris if r.get("temp") is None]
    t0 = dt.datetime.fromisoformat(baris[0]["local_datetime"])
    pra = [r for r in pra if dt.datetime.fromisoformat(r["local_datetime"]) <= t0 + dt.timedelta(hours=JAM)]
    assert baris and (hal.get("last_observation") or hal.get("last_forecast") or baris), "halaman kosong"

    def jam(r):
        v, mn = vis(r.get("visibility"))
        return {"waktu": r["local_datetime"], "cuaca": r.get("weather"), "angin_kmj": num(r.get("wind_speed")), "arah": r.get("wind_direction"),
                "vis_km": v, "vis_min": mn}
    o = obs[-1] if obs else None
    out = {"kode": b["icao_id"], "nama": b["station_name"], "lat": num(b["latitude"]), "lon": num(b["longitude"]),
           "prov": BPS.get(b["province"]), "provinsi": b["province"], "zona": (baris[0].get("time_zone")),
           "metar": hal.get("last_observation"), "taf": hal.get("last_forecast"),
           "pengamatan": None if not o else {**jam(o), "suhu": num(o["temp"]), "embun": num(o.get("dew_point")), "tekanan": num(o.get("pressure"))},
           "prakiraan": [jam(r) for r in pra], "diambil": sekarang}
    out.update({k: hal[k] for k in META if hal.get(k)})
    return out


def main():
    sekarang = dt.datetime.now(WIB).isoformat(timespec="minutes")
    t0 = time.time()
    lama = baca(BERKAS, {}) or {}
    bandara, gagal = dict(lama.get("bandara", {})), []
    dft, awal = daftar(nuxt_semua(_unduh(BASIS)))
    if len(dft) < 100:
        raise RuntimeError(f"daftar bandara aneh ({len(dft)}): berkas lama dibiarkan")
    ok = 0
    for b in dft:
        k = b["icao_id"]
        time.sleep(JEDA)
        try:
            _, hal = daftar(nuxt_semua(_unduh(f"{BASIS}/{k}")))
            if not hal or hal["icao_id"] != k:
                raise ValueError("objek halaman bandara tak ditemukan")
            if awal and awal["icao_id"] == k:  # metadata halaman daftar
                hal = {**awal, **hal}
            bandara[k] = olah(b, hal, sekarang)
            ok += 1
        except Exception as x:
            gagal.append(k)
            print(f"bandara_bmkg {k}: {type(x).__name__} {x}", file=sys.stderr)
    if not ok:
        raise RuntimeError("tak satu bandara pun berhasil: berkas lama dibiarkan")
    bandara = {k: v for k, v in bandara.items() if k in {b["icao_id"] for b in dft}}
    simpan(BERKAS, {"dibuat": sekarang, "sumber": "BMKG cuaca bandara (www.bmkg.go.id)", "n_ok": ok, "gagal": gagal, "n": len(bandara), "bandara": bandara})
    print(f"bandara_bmkg: {ok} ok, gagal {gagal}, {len(bandara)} bandara, {time.time() - t0:.0f} dtk", file=sys.stderr)


def uji():
    fx = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixture/bandara_bmkg.json")))
    b = next(x for x in fx["daftar"] if x["icao_id"] == "WAAA")
    o = olah(b, fx["detail_WAAA"], "t")
    assert o["prov"] == "73" and o["zona"] == "WITA" and o["metar"].startswith("METAR WAAA") and o["taf"].startswith("TAF WAAA")
    assert o["pengamatan"]["suhu"] == 31 and o["pengamatan"]["angin_kmj"] == 13.0 and o["pengamatan"]["vis_km"] == 9.0 and not o["pengamatan"]["vis_min"]
    p = o["prakiraan"]
    assert p and all(r["waktu"] > o["pengamatan"]["waktu"] for r in p) and len(p) <= JAM
    assert p[0]["vis_km"] == 10 and p[0]["vis_min"] is True and p[0]["angin_kmj"] == 22.2
    w = next(x for x in fx["daftar"] if x["icao_id"] == "WIII")
    m = olah(w, {**fx["meta_WIII"], **fx["detail_WIII"]}, "t")
    assert m["wmo_id"] == "96749" and m["prov"] == "36" and m["lat"] < 0
    assert all(v for v in BPS.values()) and len(set(BPS.values())) == 38
    print("uji bandara_bmkg ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
