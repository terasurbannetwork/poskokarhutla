"""Ringkas arsip VIIRS S-NPP 2015-sekarang (data/raw/firms/viirs.csv) -> public/data/sejarah.json

Hanya keyakinan sedang/tinggi (n, h). Waktu dikonversi ke tanggal WIB.
Isi: per provinsi per tahun per bulan; per kecamatan jumlah per tahun (untuk kekerapan "langganan api").
"""
import csv, datetime as dt, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR, Wilayah

WIB = dt.timedelta(hours=7)


def main(sumber=os.path.join(AKAR, "data/raw/firms/viirs.csv")):
    w = Wilayah()
    prov, kec, n = {}, {}, 0
    for r in csv.DictReader(open(sumber)):
        if r.get("confidence") not in ("n", "h"):
            continue
        jam = r["acq_time"].zfill(4)
        t = dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}") + WIB
        adm = w.cari(float(r["longitude"]), float(r["latitude"]))
        if not adm:
            continue
        th, bl = str(t.year), t.month - 1
        p = prov.setdefault(adm[0], {}).setdefault(th, [0] * 12)
        p[bl] += 1
        k = kec.setdefault("|".join(adm), {})
        k[th] = k.get(th, 0) + 1
        n += 1
        if n % 500000 == 0:
            print(n, file=sys.stderr)
    tahun = sorted({th for p in prov.values() for th in p})
    out = {"sumber": "NASA FIRMS VIIRS S-NPP arsip standar (SP) + NRT, keyakinan sedang/tinggi", "tahun": tahun,
           "dibuat": dt.date.today().isoformat(), "prov": prov,
           # kecamatan: [jumlah per tahun sesuai urutan 'tahun']; hanya yang pernah >= 10 titik setahun
           "kec": {k: [v.get(th, 0) for th in tahun] for k, v in kec.items() if max(v.values()) >= 10}}
    with open(os.path.join(AKAR, "public/data/sejarah.json"), "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{n} titik, {len(out['kec'])} kecamatan", file=sys.stderr)


if __name__ == "__main__":
    main(*sys.argv[1:])
