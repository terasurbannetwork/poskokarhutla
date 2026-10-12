"""Kalender bahaya karhutla per provinsi, resolusi dasarian (10 hari; 36 per tahun) dari MODIS 2002-2025 -> public/data/musim.json

Untuk tiap provinsi dan dasarian:
  rata    = rata-rata titik panas MODIS (keyakinan >= 30) di dasarian itu
  p_besar = porsi tahun yang dasarian itu masuk 10% dasarian tersibuk provinsi tsb (ambang = persentil 90 semua dasarian
            2002-2025), dipisah tahun El Nino dan tahun biasa
Ringkasan musim: dasarian pertama & terakhir dengan p_besar >= 0,3 dan dasarian puncak (rata tertinggi).
Tahun El Nino (ONI, NOAA CPC): 2002, 2004, 2006, 2009, 2015, 2019, 2023. 2026 tidak dipakai (belum lengkap).
"""
import csv, datetime as dt, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR, PROVINSI, Wilayah

def bukan_vegetasi(sumber):
    """Sel 0,01 derajat yang di arsip standar FIRMS bertipe 1 (gunung api), 2 (sumber panas tetap: smelter, kilang)
    atau 3 (lepas pantai). Data NRT tidak punya kolom type, jadi titik NRT di sel ini juga dibuang."""
    sel = set()
    for r in csv.DictReader(open(sumber)):
        if r.get("type") in ("1", "2", "3"):
            sel.add((round(float(r["latitude"]), 2), round(float(r["longitude"]), 2)))
    return sel


def vegetasi(r, sel):
    t = r.get("type")
    if t:
        return t == "0"
    return (round(float(r["latitude"]), 2), round(float(r["longitude"]), 2)) not in sel


EL_NINO = {2002, 2004, 2006, 2009, 2015, 2019, 2023}
AWAL, AKHIR = 2002, 2025
WIB = dt.timedelta(hours=7)


def dasarian(t):
    return (t.month - 1) * 3 + min(2, (t.day - 1) // 10)


def persentil(xs, p):
    s = sorted(xs)
    return s[min(len(s) - 1, int(p * (len(s) - 1)))]


def ringkas(p, ambang=0.3):
    idx = [i for i, v in enumerate(p) if v >= ambang]
    return (idx[0], idx[-1]) if idx else (None, None)


def main(sumber=os.path.join(AKAR, "data/raw/firms/modis.csv")):
    w = Wilayah()
    hit = {}  # prov -> tahun -> [36]
    nonveg = bukan_vegetasi(sumber)
    for r in csv.DictReader(open(sumber)):
        c = r.get("confidence", "")
        if not c.isdigit() or int(c) < 30:
            continue
        if not vegetasi(r, nonveg):  # tanpa gunung api, panas industri, lepas pantai (lihat bukan_vegetasi)
            continue
        jam = r["acq_time"].zfill(4)
        t = dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}") + WIB
        if not AWAL <= t.year <= AKHIR:
            continue
        adm = w.cari(float(r["longitude"]), float(r["latitude"]))
        if not adm:
            continue
        hit.setdefault(adm[0], {}).setdefault(t.year, [0] * 36)[dasarian(t)] += 1
    tahun = list(range(AWAL, AKHIR + 1))
    out = {}
    for kode, per in hit.items():
        semua = [per.get(y, [0] * 36)[d] for y in tahun for d in range(36)]
        ambang = max(1, persentil(semua, 0.9))
        def p(ys):
            return [round(sum(1 for y in ys if per.get(y, [0] * 36)[d] >= ambang) / len(ys), 2) for d in range(36)]
        en, bi = [y for y in tahun if y in EL_NINO], [y for y in tahun if y not in EL_NINO]
        rata = [round(sum(per.get(y, [0] * 36)[d] for y in tahun) / len(tahun), 1) for d in range(36)]
        pe, pb = p(en), p(bi)
        out[kode] = {"nama": PROVINSI.get(kode, kode), "ambang": ambang, "rata": rata, "p_el_nino": pe, "p_biasa": pb, "p_semua": p(tahun),
                     "musim_el_nino": ringkas(pe), "musim_biasa": ringkas(pb), "puncak": rata.index(max(rata))}
    json.dump({"sumber": f"NASA FIRMS MODIS {AWAL}-{AKHIR}, keyakinan >= 30, type = 0", "tahun_el_nino": sorted(EL_NINO), "prov": out},
              open(os.path.join(AKAR, "public/data/musim.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    nm = lambda d: None if d is None else f"{['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d // 3]} {['awal','tengah','akhir'][d % 3]}"
    for k in ["62", "16", "61", "14", "15", "63", "64", "53", "93"]:
        o = out.get(k)
        if o:
            print(o["nama"], "| El Nino:", nm(o["musim_el_nino"][0]), "-", nm(o["musim_el_nino"][1]), "| biasa:", nm(o["musim_biasa"][0]), "-", nm(o["musim_biasa"][1]), "| puncak", nm(o["puncak"]), file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        assert dasarian(dt.datetime(2020, 1, 1)) == 0 and dasarian(dt.datetime(2020, 1, 31)) == 2 and dasarian(dt.datetime(2020, 9, 15)) == 25
        assert ringkas([0, .1, .3, .5, .2, .4, 0]) == (2, 5) and ringkas([0, .1]) == (None, None)
        print("ok")
    else:
        main(*sys.argv[1:])
