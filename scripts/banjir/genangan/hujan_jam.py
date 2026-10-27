"""Hujan per jam untuk jendela kejadian (+-3 hari) di kisi 0,1 derajat kotak Jakarta.

Sumber (Open-Meteo, tanpa kunci): archive-api ERA5-Land (`era5_land`) dan historical-forecast-api ECMWF IFS (`ecmwf_ifs`),
zona WIB. IMERG 30 menit (GPM_3IMERGHH.07) lewat OPeNDAP GES DISC hanya dengan `imerg` dan secret env EARTHDATA_TOKEN
(Bearer; tidak pernah dicetak); tanpa token dilewati dengan pesan. Berkas HDF5 penuh (~8 MB per 30 menit) tidak diunduh:
tanpa h5py tidak terbaca dan ukurannya ~80 GB untuk semua kejadian.
Keluaran: data/raw/banjir/genangan/hujan_jam/<kejadian>.json (per sel per model, per jam) dan
public/banjir/data/genangan/hujan_jam.json (ringkasan: maks 1 jam, maks 3 jam, total per sel per model).
ERA5-Land meremehkan puncak konvektif kota (RANCANGAN §3): koreksi bias ada di tahap J2.
"""
import datetime as dt, json, os, sys, time, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bersama import KEJADIAN, MENTAH, RINGKAS, WIB, ambil_json, baca, jendela, simpan

MODEL = {"era5_land": ("https://archive-api.open-meteo.com/v1/archive", "era5_land"),
         "ecmwf_ifs": ("https://historical-forecast-api.open-meteo.com/v1/forecast", "ecmwf_ifs")}
LON = [106.6, 106.7, 106.8, 106.9, 107.0]
LAT = [-6.4, -6.3, -6.2, -6.1]
SEL = [(la, lo) for la in LAT for lo in LON]


def tarik(url, model, a, b):
    q = {"latitude": ",".join(str(la) for la, _ in SEL), "longitude": ",".join(str(lo) for _, lo in SEL),
         "start_date": a, "end_date": b, "hourly": "precipitation", "models": model, "timezone": "Asia/Bangkok"}
    d = ambil_json(url + "?" + urllib.parse.urlencode(q, safe=","))
    d = d if isinstance(d, list) else [d]
    assert len(d) == len(SEL), len(d)
    return [{"lat": la, "lon": lo, "lat_model": x["latitude"], "lon_model": x["longitude"],
             "waktu": x["hourly"]["time"], "mm": x["hourly"]["precipitation"]} for (la, lo), x in zip(SEL, d)]


def maks_jendela(mm, n):
    v = [x or 0 for x in mm]
    return round(max((sum(v[i:i + n]) for i in range(max(1, len(v) - n + 1))), default=0), 1)


def ringkas(sel):
    mm = sel["mm"]
    kosong = sum(1 for x in mm if x is None)
    return {"lat": sel["lat"], "lon": sel["lon"], "maks_1j": maks_jendela(mm, 1), "maks_3j": maks_jendela(mm, 3),
            "maks_24j": maks_jendela(mm, 24), "total_mm": round(sum(x or 0 for x in mm), 1), "jam_kosong": kosong}


def jalankan():
    ring = {}
    for ev, (a, b) in KEJADIAN.items():
        a2, b2 = jendela(a, b)
        jalur = os.path.join(MENTAH, "hujan_jam", f"{ev}.json")
        data = baca(jalur, {})
        for nama, (url, model) in MODEL.items():
            if nama in data:
                continue
            try:
                data[nama] = tarik(url, model, a2, b2)
            except RuntimeError as e:
                print(f"  GAGAL {ev} {nama}: {e}", file=sys.stderr)
                continue
            simpan(jalur, {**data, "jendela": [a2, b2]})
            time.sleep(2)
        data["jendela"] = [a2, b2]
        ring[ev] = {"jendela": [a2, b2], **{n: [ringkas(s) for s in data[n]] for n in MODEL if n in data}}
        print(ev, {n: len(data[n][0]["mm"]) for n in MODEL if n in data})
    imerg_lewati()
    simpan(os.path.join(RINGKAS, "hujan_jam.json"), {
        "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"),
        "sumber": "Open-Meteo (ERA5-Land, ECMWF IFS historical forecast), kisi 0,1 derajat, zona WIB. IMERG belum (lihat docstring).",
        "kisi": {"lat": LAT, "lon": LON}, "kejadian": ring})


def imerg_lewati():
    if not os.environ.get("EARTHDATA_TOKEN"):
        print("IMERG dilewati: EARTHDATA_TOKEN tidak ada di lingkungan.")
    else:
        print("IMERG dilewati: token ada, tetapi pembaca OPeNDAP GES DISC belum terbukti (gpm1.gesdisc.eosdis.nasa.gov "
              "menolak sambungan saat uji 27 Okt 2026; data.gesdisc.earthdata.nasa.gov hanya HDF5 penuh). Lihat laporan J1.")


def uji():
    assert len(SEL) == 20
    assert maks_jendela([0, 5, 6, 0, 1], 1) == 6 and maks_jendela([0, 5, 6, 0, 1], 3) == 11 and maks_jendela([1], 3) == 1
    s = ringkas({"lat": 1, "lon": 2, "mm": [1.0, None, 2.5]})
    assert s["total_mm"] == 3.5 and s["jam_kosong"] == 1, s
    assert jendela("2020-01-01", "2020-01-10")[0] == "2019-12-29"
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalankan()
