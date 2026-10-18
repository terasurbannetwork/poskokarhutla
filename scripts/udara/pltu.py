"""PLTU batu bara Indonesia dari WRI Global Power Plant Database v1.3 -> public/udara/data/pltu.json (SEKALI tangan, bukan di CI).

Sumber: https://github.com/wri/global-power-plant-database (CC BY 4.0), country IDN, primary_fuel Coal.
`fk` = faktor kapasitas dari estimated_generation_gwh_2017 / (MW x 8,76) bila ada (dipakai atribusi.py), selain itu null.
Pakai : python3 scripts/udara/pltu.py [csv_lokal]   |   python3 scripts/udara/pltu.py uji
"""
import csv
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat

URL = "https://raw.githubusercontent.com/wri/global-power-plant-database/master/output_database/global_power_plant_database.csv"


def saring(baris):
    out = []
    for r in baris:
        if r.get("country") != "IDN" or r.get("primary_fuel") != "Coal":
            continue
        mw, la, lo = float(r["capacity_mw"]), float(r["latitude"]), float(r["longitude"])
        if not (mw > 0 and -12 <= la <= 7 and 94 <= lo <= 142):
            raise ValueError(f"baris PLTU tidak sah: {r.get('gppd_idnr')} mw={mw} {la},{lo}")
        gen = r.get("estimated_generation_gwh_2017") or r.get("generation_gwh_2017")
        fk = round(float(gen) / (mw * 8.76), 3) if gen else None
        th = r.get("commissioning_year")
        out.append({"id": r["gppd_idnr"], "nama": r["name"].strip(), "mw": round(mw), "lat": round(la, 3), "lon": round(lo, 3),
                    "tahun": int(float(th)) if th else None, "fk": fk if fk and 0 < fk <= 1 else None})
    return sorted(out, key=lambda x: -x["mw"])


def uji():
    kol = "country,name,gppd_idnr,capacity_mw,latitude,longitude,primary_fuel,commissioning_year,estimated_generation_gwh_2017\n"
    teks = kol + ("IDN,PLTU Suralaya,WRI1,3400,-5.892,106.03,Coal,1985,18502.72\n"
                  "IDN,PLTA X,WRI2,100,-5,106,Hydro,,\n"
                  "MYS,Jimah,WRI3,1400,2.6,101.7,Coal,2009,\n"
                  "IDN,Kecil,WRI4,50,-1,104,Coal,,\n")
    r = saring(csv.DictReader(io.StringIO(teks)))
    assert [x["id"] for x in r] == ["WRI1", "WRI4"] and r[0]["fk"] == .621 and r[0]["tahun"] == 1985 and r[1]["fk"] is None, r
    try:
        saring(csv.DictReader(io.StringIO(kol + "IDN,Salah,WRI9,500,40,10,Coal,,\n")))
        raise AssertionError("koordinat di luar Indonesia harus ditolak")
    except ValueError:
        pass
    print("pltu uji: lulus")


def main(lokal=None):
    teks = open(lokal, encoding="utf-8").read() if lokal else alat.ambil(URL, teks=True)
    r = saring(csv.DictReader(io.StringIO(teks)))
    if len(r) < 30:
        raise SystemExit(f"hanya {len(r)} PLTU; berkas WRI berubah?")
    alat.simpan("pltu.json", r)
    alat.log(f"pltu.json: {len(r)} PLTU, {sum(x['mw'] for x in r):,} MW")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main(*sys.argv[1:2])
