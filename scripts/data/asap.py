"""Prakiraan asap: PM2.5 dan CO dari CAMS (Copernicus) lewat Open-Meteo Air Quality API -> public/data/asap.json

Grid 1 derajat seluruh kotak Indonesia (darat dan laut, karena asap melintas laut), 4 hari, nilai harian:
PM2.5 maksimum per jam (ug/m3) dan CO rata-rata (ug/m3). Tidak butuh kunci.
"""
import datetime as dt, json, os, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR

URL = "https://air-quality-api.open-meteo.com/v1/air-quality"


def ambil(url):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "poskokarhutla/1.0"}), timeout=120) as r:
                return json.loads(r.read())
        except Exception as e:
            if i == 3:
                raise
            time.sleep(60 if "429" in str(e) else 10)


def main():
    titik = [(la + .5, lo + .5) for la in range(-11, 6) for lo in range(94, 141)]
    hasil, hari = [], None
    for a in range(0, len(titik), 100):
        b = titik[a:a + 100]
        d = ambil(f"{URL}?latitude={','.join(str(x[0]) for x in b)}&longitude={','.join(str(x[1]) for x in b)}"
                  "&hourly=pm2_5,carbon_monoxide&forecast_days=4&timezone=Asia%2FJakarta")
        for (la, lo), x in zip(b, d if isinstance(d, list) else [d]):
            h = x["hourly"]
            tgl = sorted({t[:10] for t in h["time"]})
            hari = hari or tgl
            pm, co = [], []
            for t in tgl:
                i = [k for k, w in enumerate(h["time"]) if w.startswith(t)]
                p = [h["pm2_5"][k] for k in i if h["pm2_5"][k] is not None]
                c = [h["carbon_monoxide"][k] for k in i if h["carbon_monoxide"][k] is not None]
                pm.append(round(max(p)) if p else None)
                co.append(round(sum(c) / len(c)) if c else None)
            hasil.append([la, lo, pm, co])
        time.sleep(1)
    with open(os.path.join(AKAR, "public/data/asap.json"), "w") as f:
        json.dump({"sumber": "CAMS (Copernicus) via Open-Meteo", "dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
                   "sel": 1, "hari": hari, "kolom": ["lat", "lon", "pm25_maks", "co_rata"], "grid": hasil}, f, separators=(",", ":"))
    print(f"{len(hasil)} sel, hari {hari}", file=sys.stderr)


if __name__ == "__main__":
    main()
