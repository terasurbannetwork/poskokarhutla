"""Peluang hujan lebat dari ansambel ECMWF IFS 0,25 derajat (51 anggota) -> public/banjir/data/hujan_ansambel.json

Per titik per hari (hari ini .. +7, zona Asia/Jakarta), peluang = pecahan anggota:
  p50   P(hujan harian >= 50 mm, lebat)        p100  P(hujan harian >= 100 mm, sangat lebat)
  p3    P(jumlah 3 hari mulai hari itu >= 100 mm)  -- jendela yang sama dengan H3 di status.py

Kuota Open-Meteo: 1 variabel x 51 anggota / 10 = 5,1 per lokasi (10 hari < 14). Kisi 0,25 derajat (2.931 sel)
= ~15.000 panggilan, 0,5 derajat (957) = ~4.900: keduanya terlalu mahal. Jadi satu titik per kotak 1 derajat
(sel darat 0,25 derajat hujan.json yang terdekat ke pusat kotak): 349 titik = ~1.780 panggilan/hari.
Nilai titik berlaku untuk kotaknya; status.py memakai titik terdekat (<= 1 derajat) untuk tiap kecamatan.
Model cadangan: gfs025 (31 anggota, 3,1 per lokasi).

Pakai:  python3 scripts/banjir/ansambel_hujan.py      |  python3 scripts/banjir/ansambel_hujan.py uji
Jalankan setelah hujan.py (kisi darat dibaca dari hujan.json).
"""
import datetime as dt, math, os, sys, time, urllib.parse

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, WIB, KuotaHabis, ambil, baca, per_lokasi, simpan

URL = "https://ensemble-api.open-meteo.com/v1/ensemble"
MODEL = ["ecmwf_ifs025", "gfs025"]
HARI = 8          # hari ini .. +7; p3 hari terakhir butuh +9
PER_PANGGIL = 25


def peluang(anggota, ambang):
    v = [x for x in anggota if x is not None]
    return round(sum(x >= ambang for x in v) / len(v), 2) if v else None


def olah(daily):
    """daily Open-Meteo ansambel -> (hari, p50, p100, p3) untuk HARI hari pertama."""
    seri = [v for k, v in daily.items() if k.startswith("precipitation_sum")]
    p50, p100, p3 = [], [], []
    for d in range(HARI):
        harian = [s[d] for s in seri]
        tiga = [None if any(x is None for x in s[d:d + 3]) or len(s[d:d + 3]) < 3 else sum(s[d:d + 3]) for s in seri]
        p50.append(peluang(harian, 50))
        p100.append(peluang(harian, 100))
        p3.append(peluang(tiga, 100))
    return daily["time"][:HARI], p50, p100, p3, len(seri)


def main():
    t0 = time.time()
    hujan = baca(os.path.join(KELUAR, "hujan.json"))
    if not hujan:
        sys.exit("hujan.json belum ada")
    kotak = {}
    for g in hujan["grid"]:
        kotak.setdefault((math.floor(g["lat"]), math.floor(g["lon"])), []).append(g)
    titik = [min(gs, key=lambda g: (g["lat"] - k[0] - .5) ** 2 + (g["lon"] - k[1] - .5) ** 2) for k, gs in sorted(kotak.items())]
    print(f"{len(titik)} titik (1 per kotak 1 derajat)", file=sys.stderr)
    for m in MODEL:
        keluar, hari, total, n = [], None, 0.0, 0
        try:
            for a in range(0, len(titik), PER_PANGGIL):
                b = titik[a:a + PER_PANGGIL]
                q = {"latitude": ",".join(str(g["lat"]) for g in b), "longitude": ",".join(str(g["lon"]) for g in b),
                     "models": m, "daily": "precipitation_sum", "forecast_days": HARI + 2, "timezone": "Asia/Jakarta"}
                for g, d in zip(b, per_lokasi(ambil(URL + "?" + urllib.parse.urlencode(q), batas_waktu=240))):
                    hari, p50, p100, p3, n = olah(d["daily"])
                    keluar.append({"lat": g["lat"], "lon": g["lon"], "prov": g["prov"], "p50": p50, "p100": p100, "p3": p3})
                w = len(b) * max(1.0, n / 10)
                total += w
                print(f"  {m} {len(keluar)}/{len(titik)} ({n} anggota, kuota ~{total:.0f})", file=sys.stderr)
                time.sleep(w / 9)  # batas 600 panggilan/menit
        except KuotaHabis:
            raise
        except Exception as e:
            print(f"  {m} gagal: {e}", file=sys.stderr)
            continue
        simpan(os.path.join(KELUAR, "hujan_ansambel.json"), {
            "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "model": m, "anggota": n, "hari": hari,
            "sel": 1, "sampel": "sel darat 0,25 derajat terdekat ke pusat kotak 1 derajat", "grid": keluar})
        print(f"hujan_ansambel.json: {len(keluar)} titik; P(3 hari >= 100 mm) >= 0,5 hari ini: "
              f"{sum(1 for g in keluar if (g['p3'][0] or 0) >= .5)}, maks semua hari: "
              f"{sum(1 for g in keluar if max(x or 0 for x in g['p3']) >= .5)}; kuota ~{total:.0f}; "
              f"{os.path.getsize(os.path.join(KELUAR, 'hujan_ansambel.json')) / 1024:.0f} KB; {time.time() - t0:.0f} dtk", file=sys.stderr)
        return
    sys.exit("ansambel hujan gagal untuk semua model")


def uji():
    daily = {"time": [f"d{i}" for i in range(10)], "precipitation_sum": [60] * 10,
             "precipitation_sum_member01": [0, 0, 120, 0, 0, 0, 0, 0, 40, 40], "precipitation_sum_member02": [None] + [10] * 9}
    hari, p50, p100, p3, n = olah(daily)
    assert n == 3 and hari[0] == "d0" and len(p50) == HARI, hari
    assert p50[0] == 0.5 and p50[2] == 0.67 and p100[2] == 0.33, (p50, p100)
    assert p3[0] == 1.0 and p3[1] == 0.67 and p3[3] == 0.33 and p3[7] == 0.33, p3  # anggota 2 kosong hari 0 -> tak dihitung
    assert peluang([None], 50) is None
    print("ok ansambel_hujan")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
