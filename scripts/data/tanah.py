"""Kelembapan tanah kisi FWI 0,5 derajat -> public/data/tanah.json (+ iklim di data/raw/tanah_klim.json)

sm0, sm1  kelembapan volumetrik (m3/m3) lapisan 0-7 cm dan 7-28 cm, rata-rata hari ini, ECMWF IFS 0,25 derajat
          (Open-Meteo forecast, models=ecmwf_ifs025; lapisannya sama dengan ERA5-Land karena model tanahnya sama, HTESSEL).
pct0/pct1 persentil (0-100) terhadap 2015-2025 untuk dasarian (10 harian) yang sama, dari ERA5-Land.
          IFS dan ERA5-Land berbeda bias (sampai +-0,06 m3/m3 di beberapa sel), jadi nilai IFS TIDAK dibandingkan langsung:
          nilai = ERA5-Land hari terakhir yang tersedia (jeda ~6 hari) + perubahan IFS sejak hari itu.
          null = iklim sel itu belum terunduh.

Hubungan dengan DC (gambut): ini model tanah MINERAL (HTESSEL, tekstur FAO). Gambut tidak dimodelkan sebagai gambut
(tak ada muka air tanah gambut, porositas organik tidak dipakai di sel berpeta tanah mineral). Lapisan 7-28 cm yang kering
dan persentil rendah sejalan dengan DC tinggi (keduanya akumulasi defisit hujan berminggu-minggu), tetapi bukan ukuran
kekeringan gambut atau kedalaman muka air gambut. Pakai sebagai bukti pendukung, bukan pengganti DC atau TMAT.

Kuota Open-Meteo (bobot = lokasi x max(1, var/10 x hari/14)):
  harian: IFS 2 var x 11 hari (1/lokasi) + ERA5-Land 2 var x 12 hari (1/lokasi) = ~1.220 untuk 611 sel
  iklim: 2 var x 4.018 hari = 57,4 per sel, sekali seumur hidup. TANAH_KLIM_LOKASI sel per jalan (bawaan 30 = ~1.720);
         provinsi prioritas dulu, 611 sel selesai ~21 hari. Berhenti rapi bila kuota habis.

Pakai:  python3 scripts/data/tanah.py      |  python3 scripts/data/tanah.py uji
"""
import datetime as dt, json, os, sys, time, urllib.parse

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(1, os.path.join(os.path.dirname(__file__), "..", "banjir"))
from umum import KuotaHabis, ambil, baca, per_lokasi, simpan
from wilayah import AKAR, PRIORITAS

KELUAR = os.path.join(AKAR, "public/data")
KLIM = os.path.join(AKAR, "data/raw/tanah_klim.json")
WIB = dt.timezone(dt.timedelta(hours=7))
VAR = ["soil_moisture_0_to_7cm_mean", "soil_moisture_7_to_28cm_mean"]
TZ = "Asia/Jakarta"
KLIM_AWAL, KLIM_AKHIR = "2015-01-01", "2025-12-31"
Q = list(range(0, 101, 10))  # desil yang disimpan per dasarian


def dasarian(tgl):
    """'2026-10-13' -> 0..35 (Jan I = 0, Okt II = 28)."""
    b, h = int(tgl[5:7]), int(tgl[8:10])
    return (b - 1) * 3 + min(2, (h - 1) // 10)


def persentil(xs, q):
    s = sorted(xs)
    k = (len(s) - 1) * q / 100
    i = int(k)
    return s[i] if i + 1 >= len(s) else s[i] + (s[i + 1] - s[i]) * (k - i)


def desil(nilai_harian):
    """{tgl: nilai} -> 36 daftar desil (None bila dasarian kosong)."""
    per = [[] for _ in range(36)]
    for t, v in nilai_harian.items():
        if v is not None:
            per[dasarian(t)].append(v)
    return [[round(persentil(v, q), 3) for q in Q] if v else None for v in per]


def ke_persentil(v, ds):
    """Nilai -> persentil 0-100 dengan interpolasi linier di antara desil."""
    if v is None or not ds:
        return None
    if v <= ds[0]:
        return 0
    if v >= ds[-1]:
        return 100
    for i in range(len(ds) - 1):
        if ds[i] <= v <= ds[i + 1]:
            f = 0.5 if ds[i + 1] == ds[i] else (v - ds[i]) / (ds[i + 1] - ds[i])
            return round(Q[i] + f * (Q[i + 1] - Q[i]))


def koord(gs):
    return {"latitude": ",".join(str(g["lat"]) for g in gs), "longitude": ",".join(str(g["lon"]) for g in gs)}


def perbarui_klim(grid, klim, kuota):
    perlu = [g for g in sorted(grid, key=lambda g: g["prov"] not in PRIORITAS) if f"{g['lat']},{g['lon']}" not in klim["sel"]][:kuota]
    for a in range(0, len(perlu), 3):
        b = perlu[a:a + 3]
        q = {**koord(b), "models": "era5_land", "daily": ",".join(VAR), "start_date": KLIM_AWAL, "end_date": KLIM_AKHIR, "timezone": TZ}
        try:
            data = per_lokasi(ambil("https://archive-api.open-meteo.com/v1/archive?" + urllib.parse.urlencode(q), batas_waktu=300))
        except (KuotaHabis, RuntimeError) as e:
            print(f"  iklim berhenti ({e}); lanjut jalan berikutnya", file=sys.stderr)
            break
        for g, d in zip(b, data):
            h = d["daily"]
            klim["sel"][f"{g['lat']},{g['lon']}"] = [desil(dict(zip(h["time"], h[v]))) for v in VAR]
        simpan(KLIM, klim)
        print(f"  iklim {a + len(b)}/{len(perlu)} (total {len(klim['sel'])}/{len(grid)} sel)", file=sys.stderr)
        time.sleep(20)  # 3 x 57,4 = 172 panggilan per permintaan; batas 600/menit


def main():
    t0 = time.time()
    grid = [{"lat": g["lat"], "lon": g["lon"], "prov": g["prov"]} for g in json.load(open(os.path.join(KELUAR, "fwi.json")))["grid"]]
    klim = baca(KLIM) or {"sumber": "ERA5-Land via Open-Meteo archive, rata-rata harian", "periode": [KLIM_AWAL, KLIM_AKHIR],
                          "desil": Q, "lapisan": VAR, "sel": {}}
    perbarui_klim(grid, klim, int(os.environ.get("TANAH_KLIM_LOKASI", "30")))

    hari_ini = dt.datetime.now(WIB).date()
    keluar, tgl_era = [], None
    for a in range(0, len(grid), 100):
        b = grid[a:a + 100]
        ifs = per_lokasi(ambil("https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode(
            {**koord(b), "models": "ecmwf_ifs025", "daily": ",".join(VAR), "past_days": 10, "forecast_days": 1, "timezone": TZ})))
        era = per_lokasi(ambil("https://archive-api.open-meteo.com/v1/archive?" + urllib.parse.urlencode(
            {**koord(b), "models": "era5_land", "daily": ",".join(VAR), "timezone": TZ,
             "start_date": (hari_ini - dt.timedelta(days=12)).isoformat(), "end_date": (hari_ini - dt.timedelta(days=1)).isoformat()})))
        for g, fi, fe in zip(b, ifs, era):
            ds = klim["sel"].get(f"{g['lat']},{g['lon']}")
            out = {**g}
            for j, v in enumerate(VAR):
                seri_i = dict(zip(fi["daily"]["time"], fi["daily"][v]))
                kini = seri_i.get(hari_ini.isoformat())
                ada = [(t, x) for t, x in zip(fe["daily"]["time"], fe["daily"][v]) if x is not None and seri_i.get(t) is not None]
                pct = None
                if ada and kini is not None and ds:
                    t, x = ada[-1]
                    tgl_era = max(tgl_era or t, t)
                    pct = ke_persentil(max(0.0, x + kini - seri_i[t]), ds[j][dasarian(hari_ini.isoformat())])
                out[f"sm{j}"] = None if kini is None else round(kini, 3)
                out[f"pct{j}"] = pct
            keluar.append(out)
        time.sleep(5)
    simpan(os.path.join(KELUAR, "tanah.json"), {
        "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "sel": 0.5, "hari_ini": hari_ini.isoformat(),
        "lapisan": ["0-7 cm", "7-28 cm"], "dasarian": dasarian(hari_ini.isoformat()), "era5land_terakhir": tgl_era,
        "sumber": "sm: ECMWF IFS 0,25 (Open-Meteo); pct: ERA5-Land 2015-2025 dasarian sama, dikoreksi perubahan IFS",
        "grid": keluar})
    n = sum(1 for g in keluar if g["pct1"] is not None)
    kering = sum(1 for g in keluar if g["pct1"] is not None and g["pct1"] <= 10)
    print(f"tanah.json: {len(keluar)} sel, {n} berpersentil, {kering} sel 7-28 cm <= p10; iklim {len(klim['sel'])}/{len(grid)}; "
          f"{os.path.getsize(os.path.join(KELUAR, 'tanah.json')) / 1024:.0f} KB; {time.time() - t0:.0f} dtk", file=sys.stderr)


def uji():
    assert dasarian("2026-01-01") == 0 and dasarian("2026-10-13") == 28 and dasarian("2026-12-31") == 35 and dasarian("2026-02-28") == 5
    ds = [0.1 + 0.01 * i for i in range(11)]
    assert ke_persentil(0.05, ds) == 0 and ke_persentil(0.3, ds) == 100 and ke_persentil(0.155, ds) == 55
    assert ke_persentil(0.2, [0.2] * 11) == 0 and ke_persentil(None, ds) is None
    d = desil({f"2015-10-{i:02d}": i / 100 for i in range(11, 21)})
    assert d[28] == [round(persentil([i / 100 for i in range(11, 21)], q), 3) for q in Q] and d[0] is None
    print("ok tanah")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
