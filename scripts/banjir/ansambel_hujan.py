"""Peluang hujan lebat dari ansambel ECMWF IFS 0,25 derajat (51 anggota) -> public/banjir/data/hujan_ansambel.json

Per titik per hari (hari ini .. +7, zona Asia/Jakarta), peluang = pecahan anggota:
  p50   P(hujan harian >= 50 mm, lebat)        p100  P(hujan harian >= 100 mm, sangat lebat)
  p3    P(jumlah 3 hari mulai hari itu >= 100 mm)  -- jendela yang sama dengan H3 di status.py

Sebaran per anggota (untuk prakiraan72.json, peluang status per kecamatan), bilangan bulat mm, urutan anggota sama di semua daftar
(None = anggota tak lengkap; nilai kosong tidak dikarang):
  m2  [51]      jumlah hari ke-0 dan ke-1 (tambah hujan teramati kemarin = H3 hari ini)
  m3  [3][51]   jumlah 3 hari mulai hari ke-0, ke-1, ke-2 (= H3 untuk hari ke-1, ke-2, ke-3)
  q   [3][HARI] persentil 10/50/90 hujan harian (mm, bulat) seluruh anggota, untuk peluang_banjir.py (rentang p10..p90)
Penambahan ini hanya mengubah isi respons yang sudah diambil: panggilan TETAP. Berkas naik ~250 KB (349 titik x 204 bilangan).

Kuota Open-Meteo: 1 variabel x 51 anggota / 10 = 5,1 per lokasi (10 hari < 14). Kisi 0,25 derajat (2.931 sel)
= ~15.000 panggilan, 0,5 derajat (957) = ~4.900: keduanya terlalu mahal. Jadi satu titik per kotak 1 derajat
(sel darat 0,25 derajat hujan.json yang terdekat ke pusat kotak): 349 titik x 5,1 = ~1.780 panggilan/hari (18% dari 10.000/hari;
dihitung ulang 18 Okt 2026 untuk perluasan m2/m3: tidak berubah, 50 lokasi per panggilan x 7 panggilan).
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
    """daily Open-Meteo ansambel -> (hari, p50, p100, p3, jumlah anggota, m2, m3) untuk HARI hari pertama."""
    seri = [v for k, v in daily.items() if k.startswith("precipitation_sum")]
    jml = lambda s, a, n: None if len(s[a:a + n]) < n or any(x is None for x in s[a:a + n]) else round(sum(s[a:a + n]))
    m2, m3 = [jml(s, 0, 2) for s in seri], [[jml(s, a, 3) for s in seri] for a in range(3)]
    p50, p100, p3 = [], [], []
    for d in range(HARI):
        harian = [s[d] for s in seri]
        tiga = [None if any(x is None for x in s[d:d + 3]) or len(s[d:d + 3]) < 3 else sum(s[d:d + 3]) for s in seri]
        p50.append(peluang(harian, 50))
        p100.append(peluang(harian, 100))
        p3.append(peluang(tiga, 100))
    q = [[None if not (v := sorted(s[d] for s in seri if s[d] is not None)) else round(v[min(len(v) - 1, int(f * (len(v) - 1) + .5))])
          for d in range(HARI)] for f in (.1, .5, .9)]
    return daily["time"][:HARI], p50, p100, p3, len(seri), m2, m3, q


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
                    hari, p50, p100, p3, n, m2, m3, q = olah(d["daily"])
                    keluar.append({"lat": g["lat"], "lon": g["lon"], "prov": g["prov"], "p50": p50, "p100": p100, "p3": p3, "m2": m2, "m3": m3, "q": q})
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
    hari, p50, p100, p3, n, m2, m3, q = olah(daily)
    assert n == 3 and hari[0] == "d0" and len(p50) == HARI, hari
    assert p50[0] == 0.5 and p50[2] == 0.67 and p100[2] == 0.33, (p50, p100)
    assert p3[0] == 1.0 and p3[1] == 0.67 and p3[3] == 0.33 and p3[7] == 0.33, p3  # anggota 2 kosong hari 0 -> tak dihitung
    # anggota 1: 0,0,120,0,0,... anggota 2: None,10,10,...  anggota kontrol: 60 tiap hari
    # urutan anggota: kontrol (60/hari), member01, member02 (hari 0 kosong -> m2 dan m3[0] kosong, tidak dikarang)
    assert m2 == [120, 0, None] and m3[0] == [180, 120, None] and m3[1] == [180, 120, 30] and len(m3) == 3, (m2, m3)
    assert [x[2] for x in q] == [10, 60, 120] and q[0][0] == 0 and len(q) == 3, q  # hari 2: anggota 60, 120, 10; hari 0: 60, 0, kosong (dibuang)
    assert peluang([None], 50) is None
    print("ok ansambel_hujan")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
