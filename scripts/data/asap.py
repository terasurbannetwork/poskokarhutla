"""Prakiraan asap: PM2.5 dan CO dari CAMS (Copernicus) lewat Open-Meteo Air Quality API -> public/data/asap.json

Grid 1 derajat seluruh kotak Indonesia (darat dan laut, karena asap melintas laut), 4 hari, nilai harian:
PM2.5 maksimum per jam (ug/m3), CO rata-rata (ug/m3), lalu (ditambah, kolom lama tidak berubah) CO maksimum per jam
(ug/m3) dan AOD 550 nm maksimum per jam (tanpa satuan; > 1 = asap/kabut asap tebal), lalu PM2.5 rata-rata 24 jam kalender WIB
(ug/m3; dasar kelas ISPU dan fungsi risiko kesehatan di dampak.py), lalu PM10 maksimum per jam (ug/m3; lapisan PM10,
ambang ISPU 50/150/350/420). Tidak butuh kunci. Konsumen membaca kolom menurut indeks: kolom baru selalu di belakang.
Kuota Open-Meteo: 4 variabel x 4 hari = bobot 1 per lokasi (bobot naik baru di atas 10 variabel) -> 799 panggilan/hari.
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


def harian(h):
    """Satu sel: deret jam Open-Meteo -> [pm25_maks, co_rata, co_maks, aod_maks, pm25_rata, pm10_maks], tiap kolom satu nilai per hari."""
    pm, co, com, aod, pm24, p10 = [], [], [], [], [], []
    for t in sorted({t[:10] for t in h["time"]}):
        i = [k for k, w in enumerate(h["time"]) if w.startswith(t)]
        nilai = lambda v: [h[v][k] for k in i if h.get(v) and h[v][k] is not None]
        p, c, a, q = nilai("pm2_5"), nilai("carbon_monoxide"), nilai("aerosol_optical_depth"), nilai("pm10")
        pm.append(round(max(p)) if p else None)
        pm24.append(round(sum(p) / len(p)) if len(p) >= 18 else None)  # rata-rata 24 jam (ISPU, WHO, fungsi risiko); >= 75% jam
        co.append(round(sum(c) / len(c)) if c else None)
        com.append(round(max(c)) if c else None)
        aod.append(round(max(a), 2) if a else None)
        p10.append(round(max(q)) if q else None)
    return [pm, co, com, aod, pm24, p10]


def uji():
    jam = [f"2026-10-0{d}T{j:02d}:00" for d in (1, 2) for j in range(24)]
    h = {"time": jam, "pm2_5": [10] * 23 + [40] + [None] * 24, "carbon_monoxide": [200] * 48,
         "aerosol_optical_depth": [.5] * 48, "pm10": [30] * 23 + [None] + [None] * 23 + [377]}
    pm, co, com, aod, pm24, p10 = harian(h)
    assert pm == [40, None] and pm24 == [11, None] and co == [200, 200] and com == [200, 200] and aod == [.5, .5], (pm, pm24, co, aod)
    assert p10 == [30, 377], f"pm10_maks {p10}: mestinya maks per hari, None dilewati"
    del h["pm10"]  # API tidak mengirim pm10: kolom tetap ada, isinya None, kolom lama tak bergeser
    assert harian(h)[5] == [None, None] and harian(h)[0] == [40, None]
    print("asap: swa-uji lulus", file=sys.stderr)


def main():
    titik = [(la + .5, lo + .5) for la in range(-11, 6) for lo in range(94, 141)]
    hasil, hari = [], None
    for a in range(0, len(titik), 100):
        b = titik[a:a + 100]
        d = ambil(f"{URL}?latitude={','.join(str(x[0]) for x in b)}&longitude={','.join(str(x[1]) for x in b)}"
                  "&hourly=pm2_5,carbon_monoxide,aerosol_optical_depth,pm10&forecast_days=4&timezone=Asia%2FJakarta")
        for (la, lo), x in zip(b, d if isinstance(d, list) else [d]):
            h = x["hourly"]
            hari = hari or sorted({t[:10] for t in h["time"]})
            hasil.append([la, lo, *harian(h)])
        time.sleep(1)
    with open(os.path.join(AKAR, "public/data/asap.json"), "w") as f:
        json.dump({"sumber": "CAMS (Copernicus) via Open-Meteo", "dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
                   "sel": 1, "hari": hari, "kolom": ["lat", "lon", "pm25_maks", "co_rata", "co_maks", "aod_maks", "pm25_rata", "pm10_maks"], "grid": hasil}, f, separators=(",", ":"))
    print(f"{len(hasil)} sel, hari {hari}", file=sys.stderr)


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
