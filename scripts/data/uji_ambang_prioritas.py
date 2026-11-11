"""Uji balik aturan Prioritas provinsi (public/prioritas.js), dasar pilihan pemilik 11 Nov 2026: rata-rata 3 hari, masuk 60, keluar 30 selama 3 hari (VIIRS).
Uji ulang aturan masuk-keluar kajian ambang hotspot dengan variasi jendela rata-rata dan lama keluar.
Data: VIIRS S-NPP per provinsi per hari WIB (lokasi unik ~375 m, tipe vegetasi), data/raw/firms/viirs_YYYY.csv.
Kejadian besar (definisi kajian): rerata hotspot 14 hari berikutnya >= 50,3 VIIRS per hari.
Dinilai pada tiap Senin Juli-November, seperti kajian (Tabel 10)."""
import csv, datetime as dt, json, os, sys
AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, AKAR + "/scripts/data")
CACHE = os.environ.get("UJI_AMBANG_CACHE", "/tmp/harian_snpp.json")   # cache hitungan per provinsi, di luar repo
WIB = dt.timedelta(hours=7)


def bangun(tahun):
    import titik_palsu, titik_unik as TU
    from wilayah import Wilayah
    w, data, lihat = Wilayah(), {}, set()
    industri = titik_palsu.sel_industri()[0]
    for th in tahun:
        for r in csv.DictReader(open(f"{AKAR}/data/raw/firms/viirs_{th}.csv")):
            if r.get("type", "0") != "0" or r.get("satellite", "N") not in ("N", "1"):
                continue
            jam = r["acq_time"].zfill(4)
            d = (dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}") + WIB).date().isoformat()
            if industri and titik_palsu.palsu(r["latitude"], r["longitude"], industri):
                continue
            k = (d, TU.sel(float(r["latitude"]), float(r["longitude"])))
            if k in lihat:
                continue
            lihat.add(k)
            adm = w.cari(float(r["longitude"]), float(r["latitude"]))
            if adm:
                h = data.setdefault(d, {}); h[adm[0]] = h.get(adm[0], 0) + 1
        print(th, "selesai", file=sys.stderr)
    json.dump(data, open(CACHE, "w"))
    return data


def seri(data, th):
    a = dt.date(th, 5, 1); hari = [(a + dt.timedelta(days=i)).isoformat() for i in range(245)]   # Mei-Des: ruang pemanasan + 14 hari ke depan
    prov = sorted({p for t in hari for p in data.get(t, {})})
    return hari, {p: [data.get(t, {}).get(p, 0) for t in hari] for p in prov}


def nilai(data, tahun, W, masuk, keluar, E, enam=False):
    tp = fp = fn = churn = keluar_n = keluar_salah = 0; n_list = []
    for th in tahun:
        hari, v = seri(data, th)
        dalam = {p: False for p in v}; bawah = {p: 0 for p in v}
        for i, t in enumerate(hari):
            if i < 7 or i + 14 >= len(hari):
                continue
            hw = {p: sum(x[i - W + 1:i + 1]) / W for p, x in v.items()}
            besar = {p: sum(x[i + 1:i + 15]) / 14 >= 50.3 for p, x in v.items()}
            if enam:
                top = set(sorted(v, key=lambda p: -v[p][i])[:6]); top = {p for p in top if v[p][i] > 0}
                for p in v:
                    if dalam[p] != (p in top): churn += 1
                    dalam[p] = p in top
            else:
                for p in v:
                    lama = dalam[p]
                    if hw[p] >= masuk: dalam[p] = True; bawah[p] = 0
                    elif dalam[p]:
                        bawah[p] = bawah[p] + 1 if hw[p] < keluar else 0
                        if bawah[p] >= E:
                            dalam[p] = False; bawah[p] = 0; keluar_n += 1; keluar_salah += besar[p]
                    if lama != dalam[p]: churn += 1
            d = dt.date.fromisoformat(t)
            if d.weekday() == 0 and 7 <= d.month <= 11:
                for p in v:
                    tp += dalam[p] and besar[p]; fp += dalam[p] and not besar[p]; fn += (not dalam[p]) and besar[p]
                n_list.append(sum(dalam.values()))
    rec = tp / max(tp + fn, 1); pre = tp / max(tp + fp, 1); f1 = 2 * rec * pre / max(rec + pre, 1e-9)
    return dict(tertangkap=round(rec, 3), tepat=round(pre, 3), f1=round(f1, 3), rata_prov=round(sum(n_list) / max(len(n_list), 1), 1),
                ganti_per_musim=round(churn / len(tahun)), keluar_keliru=f"{keluar_salah}/{keluar_n}" if not enam else "-")


if __name__ == "__main__":
    data = json.load(open(CACHE)) if os.path.exists(CACHE) else bangun([2014, 2015, 2016, 2017, 2018, 2019, 2023, 2024, 2025])
    for nama, th in [("uji tertahan 2023-2025", [2023, 2024, 2025]), ("2014-2019", [2014, 2015, 2016, 2017, 2018, 2019])]:
        print(f"\n== {nama}")
        print("enam teratas harian", nilai(data, th, 1, 0, 0, 0, enam=True))
        for W in (7, 3, 1):
            for E in (7, 3):
                print(f"H{W} masuk 50 keluar <25 selama {E} hari", nilai(data, th, W, 50, 25, E))
        for m in (40, 60, 70, 80):
            print(f"H3 masuk {m} keluar <{m//2} selama 3 hari", nilai(data, th, 3, m, m / 2, 3))
