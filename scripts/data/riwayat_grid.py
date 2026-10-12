"""Permukaan riwayat kebakaran 2002-2025 per sel 0,1 derajat (~11 km) dari arsip MODIS -> public/data/riwayat_grid.json

Hanya keyakinan >= 30 dan type = 0 (api vegetasi; FIRMS menandai gunung api = 1, sumber panas tetap/industri = 2,
lepas pantai = 3, jadi smelter dan kilang tidak ikut). Per sel:
  f = jumlah tahun dengan >= AMBANG titik (kekerapan, 0-24)
  r = rata-rata titik per tahun
Hanya sel yang pernah punya titik yang disimpan: [ix, iy, f, r]. Kisi: x0 = 94,5, y1 = 6,5 (tepi barat laut), sel 0,1.
2026 tidak dipakai (belum lengkap).
"""
import csv, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR

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


X0, X1, Y0, Y1, SEL = 94.5, 141.5, -11.5, 6.5, 0.1
AWAL, AKHIR, AMBANG = 2002, 2025, 3


def sel(lon, lat):
    return int((lon - X0) / SEL), int((Y1 - lat) / SEL)


def main(sumber=os.path.join(AKAR, "data/raw/firms/modis.csv")):
    hit = {}  # (ix, iy) -> {tahun: n}
    nonveg = bukan_vegetasi(sumber)
    for r in csv.DictReader(open(sumber)):
        c = r.get("confidence", "")
        if not c.isdigit() or int(c) < 30 or not vegetasi(r, nonveg):
            continue
        th = int(r["acq_date"][:4])
        if not AWAL <= th <= AKHIR:
            continue
        lon, lat = float(r["longitude"]), float(r["latitude"])
        if not (X0 <= lon < X1 and Y0 < lat <= Y1):
            continue
        d = hit.setdefault(sel(lon, lat), {})
        d[th] = d.get(th, 0) + 1
    n = AKHIR - AWAL + 1
    sel_ = [[ix, iy, sum(1 for v in d.values() if v >= AMBANG), round(sum(d.values()) / n, 1)] for (ix, iy), d in hit.items()]
    json.dump({"sumber": f"NASA FIRMS MODIS {AWAL}-{AKHIR}, keyakinan >= 30, type = 0", "x0": X0, "y1": Y1, "sel": SEL,
               "w": round((X1 - X0) / SEL), "h": round((Y1 - Y0) / SEL), "tahun": n, "ambang": AMBANG, "sel_data": sel_},
              open(os.path.join(AKAR, "public/data/riwayat_grid.json"), "w"), separators=(",", ":"))
    print(f"{len(sel_)} sel; {sum(1 for s in sel_ if s[2] >= n // 2)} sel terbakar >= separuh tahun", file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        assert sel(94.55, 6.45) == (0, 0) and sel(141.45, -11.45) == (469, 179)
        print("ok")
    else:
        main(*sys.argv[1:])
