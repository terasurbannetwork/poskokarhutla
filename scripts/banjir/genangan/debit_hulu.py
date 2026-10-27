"""Debit hulu (kiriman) dari GloFAS reanalisis lewat Open-Meteo Flood API, di titik masuk sungai ke KOTAK Jakarta.

Titik awal = koordinat perkiraan tiap sungai di tepi selatan/barat/timur kotak (dari pengetahuan geografi, BUKAN HydroRIVERS:
HydroRIVERS berupa shapefile ~0,5 GB per benua, tidak dimuat). Tiap titik disnap ke sel GloFAS 0,05 derajat terdekat di jendela
+-0,1 derajat yang debit rata-ratanya terbesar (sel sungai); koordinat awal dan hasil snap dicatat. Peringatan: sel 0,05
(~5 km) untuk sungai kecil (Krukut, Sunter, Cipinang) bisa menangkap sungai tetangga; periksa kolom `rata` dan `catatan`.
Keluaran: data/raw/banjir/genangan/hulu/<titik>.json (seri 1984-kini) dan public/banjir/data/genangan/hulu.json (statistik + seri jendela kejadian).
"""
import datetime as dt, os, sys, time, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bersama import KEJADIAN, MENTAH, RINGKAS, WIB, ambil_json, baca, jendela, simpan

URL = "https://flood-api.open-meteo.com/v1/flood"
# nama: (lat, lon) awal perkiraan titik masuk
TITIK = {
    "Ciliwung": (-6.36, 106.83), "Pesanggrahan": (-6.35, 106.77), "Angke": (-6.33, 106.69),
    "Krukut": (-6.32, 106.80), "Sunter": (-6.30, 106.90), "Cipinang": (-6.30, 106.89),
    "Cisadane": (-6.30, 106.63), "Bekasi": (-6.33, 107.00),
}


def seri(lat, lon, a, b):
    q = {"latitude": lat, "longitude": lon, "daily": "river_discharge", "start_date": a, "end_date": b}
    d = ambil_json(URL + "?" + urllib.parse.urlencode(q))
    return d["latitude"], d["longitude"], d["daily"]["time"], d["daily"]["river_discharge"]


def snap(lat, lon):
    """Pilih sel dengan debit rata-rata terbesar (2020-2021) di jendela 5x5 sel 0,05 derajat."""
    lats = [round(lat + k * 0.05, 3) for k in (-2, -1, 0, 1, 2)]
    lons = [round(lon + k * 0.05, 3) for k in (-2, -1, 0, 1, 2)]
    q = {"latitude": ",".join(str(x) for x in lats for _ in lons), "longitude": ",".join(str(x) for _ in lats for x in lons),
         "daily": "river_discharge", "start_date": "2020-01-01", "end_date": "2021-12-31"}
    d = ambil_json(URL + "?" + urllib.parse.urlencode(q, safe=","))
    d = d if isinstance(d, list) else [d]
    best = max(d, key=lambda x: sum(v or 0 for v in x["daily"]["river_discharge"]))
    return best["latitude"], best["longitude"]


def persentil(v, p):
    v = sorted(v)
    return v[min(len(v) - 1, int(p * len(v)))]


def statistik(t, q):
    ok = [(a, b) for a, b in zip(t, q) if b is not None]
    v = [b for _, b in ok]
    mx = max(ok, key=lambda x: x[1])
    return {"hari": len(v), "rata": round(sum(v) / len(v), 1), "p50": round(persentil(v, .5), 1), "p95": round(persentil(v, .95), 1),
            "p99": round(persentil(v, .99), 1), "maks": round(mx[1], 1), "tgl_maks": mx[0]}


def jalankan():
    akhir = (dt.date.today() - dt.timedelta(days=5)).isoformat()
    out = {}
    for nama, (la, lo) in TITIK.items():
        jalur = os.path.join(MENTAH, "hulu", nama + ".json")
        d = baca(jalur)
        if not d:
            sla, slo = snap(la, lo)
            time.sleep(1)
            _, _, t, q = seri(sla, slo, "1984-01-01", akhir)
            d = {"awal": [la, lo], "snap": [sla, slo], "waktu": t, "q": q}
            simpan(jalur, d)
            time.sleep(1)
        ev = {}
        for k, (a, b) in KEJADIAN.items():
            a2, b2 = jendela(a, b)
            ix = [i for i, x in enumerate(d["waktu"]) if a2 <= x <= b2]
            ev[k] = {"mulai": a2, "q": [d["q"][i] for i in ix]}
        out[nama] = {"awal": d["awal"], "snap": d["snap"], "satuan": "m3/s", **statistik(d["waktu"], d["q"]), "kejadian": ev}
        print(nama, out[nama]["snap"], "rata", out[nama]["rata"], "maks", out[nama]["maks"], out[nama]["tgl_maks"])
    simpan(os.path.join(RINGKAS, "hulu.json"), {
        "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"),
        "sumber": "GloFAS v4 reanalisis (Copernicus/ECMWF) lewat Open-Meteo Flood API, sel 0,05 derajat",
        "catatan": "Titik disnap otomatis ke sel debit terbesar; sungai kecil bisa salah sel. Bukan ukuran pos.", "titik": out})


def uji():
    assert persentil([1, 2, 3, 4], .5) == 3
    s = statistik(["a", "b", "c"], [1.0, None, 5.0])
    assert s["hari"] == 2 and s["maks"] == 5.0 and s["tgl_maks"] == "c", s
    assert len(TITIK) == 8
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalankan()
