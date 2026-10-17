"""Titik panas semua satelit (MODIS + VIIRS S-NPP + VIIRS NOAA-20) per bulan per provinsi sejak 1 Januari -> public/data/titik_tahun.json

Definisinya sama dengan baris harian laporan (laporan.py: titik = M, N, N20, semua keyakinan, hari kalender WIB).
laporan.py memakai 'harian' hanya untuk hari sebelum arsip hariannya; hari di arsip diambil dari baris harian, jadi
Grand total = (titik sebelum arsip) + jumlah baris harian. Arsip SP vs NRT beda ~0,1% (1-16 Okt 2026: 293.584 vs 293.263).

Pakai (CSV dari firms.py, satu per sensor):
  SENSOR=MODIS python3 scripts/data/firms.py 2025-12-31 <kemarin> > modis.csv   (begitu juga VIIRS_SNPP, VIIRS_NOAA20)
  python3 scripts/data/titik_tahun.py <tahun> <sd> modis.csv snpp.csv noaa20.csv
"""
import csv, datetime as dt, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR, Wilayah

WIB = dt.timedelta(hours=7)


def main(tahun, sd, *berkas):
    w, prov, hari = Wilayah(), {}, {}
    for b in berkas:
        for r in csv.DictReader(open(b)):
            jam = r["acq_time"].zfill(4)
            t = dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}") + WIB
            if str(t.year) != tahun or t.date().isoformat() > sd:
                continue
            adm = w.cari(float(r["longitude"]), float(r["latitude"]))
            if adm:
                prov.setdefault(adm[0], [0] * 12)[t.month - 1] += 1
                d = t.date().isoformat()
                hari[d] = hari.get(d, 0) + 1
    out = {"sumber": "NASA FIRMS MODIS C6.1, VIIRS S-NPP, VIIRS NOAA-20; arsip standar (SP) + NRT, semua keyakinan, hari WIB",
           "tahun": tahun, "sd": sd, "dibuat": dt.date.today().isoformat(), "prov": prov,
           # nasional per hari WIB 1 Jan s.d. sd: laporan.py memakai hari sebelum arsip hariannya, sisanya dari baris harian
           "harian": [hari.get((dt.date(int(tahun), 1, 1) + dt.timedelta(days=i)).isoformat(), 0)
                      for i in range((dt.date.fromisoformat(sd) - dt.date(int(tahun), 1, 1)).days + 1)]}
    with open(os.path.join(AKAR, "public/data/titik_tahun.json"), "w") as f:
        json.dump(out, f, separators=(",", ":"))
    print(sum(map(sum, prov.values())), "titik", file=sys.stderr)


if __name__ == "__main__":
    main(*sys.argv[1:])
