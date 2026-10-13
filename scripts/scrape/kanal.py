"""Kepadatan kanal & parit (OSM waterway=canal|ditch|drain) per sel 0,02 derajat, provinsi prioritas + bergambut -> public/data/kanal.json

Pakai:  python3 scripts/scrape/kanal.py
Mentah: data/raw/osm/<kode>-sungai-*.json (scripts/scrape/tarik_osm.py sungai, dipakai bersama osm.py).
Sumber: OpenStreetMap (ODbL, (c) kontributor OpenStreetMap). Kanal gambut BRG/PRIMS tidak tersedia terbuka.
Garis kanal mentah terlalu besar untuk peta (Kalteng saja 78 rb ruas), jadi yang terbit panjang kanal per sel
(± 2,2 km); tiap potongan garis dihitung di sel titik tengahnya.
"""
import json, math, os, sys

AKAR = os.path.join(os.path.dirname(__file__), "../..")
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
from wilayah import PRIORITAS
# provinsi bergambut di luar 9 prioritas (Sumatra, Kalimantan, Papua); provinsi tanpa gambut tidak ditarik karena
# "drain" di sana kebanyakan selokan kota, bukan kanal gambut
GAMBUT_LAIN = ["11", "12", "13", "17", "18", "19", "21", "65", "91", "92", "94", "95", "96"]
sys.path.insert(0, os.path.dirname(__file__))
from tarik_osm import berkas, ubin

MENTAH = os.path.join(AKAR, "data/raw/osm")
KELUAR = os.path.join(AKAR, "public/data/kanal.json")
SEL = 0.02
JENIS = {"canal", "ditch", "drain"}


def km(a, b):
    return math.hypot((b[0] - a[0]) * 110.57, (b[1] - a[1]) * 111.32 * math.cos(math.radians((a[0] + b[0]) / 2)))


def tambah(grid, geom):
    for a, b in zip(geom, geom[1:]):
        k = (math.floor((a[0] + b[0]) / 2 / SEL), math.floor((a[1] + b[1]) / 2 / SEL))
        grid[k] = grid.get(k, 0.0) + km(a, b)


def bangun():
    grid, seen, prov = {}, set(), []
    for kode in PRIORITAS + GAMBUT_LAIN:
        fs = [berkas(kode, "sungai", y, x) for y, x, _ in ubin(kode)]
        if not all(map(os.path.exists, fs)):  # provinsi setengah jadi tidak boleh tampil "0 km kanal"
            print("lewati", kode, f"({sum(map(os.path.exists, fs))}/{len(fs)} ubin)", file=sys.stderr)
            continue
        prov.append(kode)
        for f in fs:
            for el in json.load(open(f))["elements"]:
                if el.get("tags", {}).get("waterway") in JENIS and el.get("geometry") and el["id"] not in seen:
                    seen.add(el["id"])
                    tambah(grid, [(g["lat"], g["lon"]) for g in el["geometry"]])
    out = {"sumber": "OpenStreetMap waterway=canal|ditch|drain (ODbL)", "sel": SEL, "provinsi": prov, "kolom": ["lat", "lon", "km"],
           "grid": sorted([round((y + .5) * SEL, 3), round((x + .5) * SEL, 3), round(v, 1)] for (y, x), v in grid.items() if v >= 0.1)}
    json.dump(out, open(KELUAR, "w"), separators=(",", ":"))
    print(f"kanal.json {len(seen)} ruas, {len(out['grid'])} sel, {sum(grid.values()):.0f} km, provinsi {prov}, {os.path.getsize(KELUAR) / 1e3:.0f} KB")


if __name__ == "__main__":
    g = {}
    tambah(g, [(0.001, 0.001), (0.001, 0.001 + 1 / 111.32)])  # 1 km ke timur dalam satu sel
    assert list(g) == [(0, 0)] and abs(g[(0, 0)] - 1) < 1e-6, g
    bangun()
