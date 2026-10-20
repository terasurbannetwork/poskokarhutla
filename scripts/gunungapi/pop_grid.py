"""Ekspor piksel penduduk WorldPop (1 km, cache data/raw/gunungapi/pop_piksel.json dari paparan.py) per gunung ke
public/gunungapi/data/pop/<id>.json: {"sx": derajat per piksel, "piksel": [[lat, lon, jiwa]]}. Dipakai simulasi untuk paparan awan panas/lahar
per piksel (bobot luas), bukan per titik desa OSM. Jalankan: python3 scripts/gunungapi/pop_grid.py ; self-check: python3 scripts/gunungapi/pop_grid.py --uji"""
import json, os, sys
AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
SX = 1 / 120   # 30 detik busur, piksel WorldPop 1 km

def ekspor():
    c = json.load(open(os.path.join(AKAR, "data/raw/gunungapi/pop_piksel.json")))
    d = os.path.join(AKAR, "public/gunungapi/data/pop"); os.makedirs(d, exist_ok=True)
    for k, v in c.items():
        json.dump({"sx": SX, "sumber": "WorldPop Global2 R2025A 2026 constrained 1 km", "piksel": [[a, b, round(j)] for a, b, j in v if round(j) > 0]}, open(os.path.join(d, k + ".json"), "w"), separators=(",", ":"))
    return len(c)

if __name__ == "__main__":
    if "--uji" in sys.argv:
        pa = json.load(open(os.path.join(AKAR, "public/gunungapi/data/paparan.json")))
        for g in pa["gunung"]:
            f = json.load(open(os.path.join(AKAR, "public/gunungapi/data/pop", g["id"] + ".json")))
            assert f["piksel"] or not g["cincin"][-1]["penduduk"], g["id"]
        print("ok", len(pa["gunung"]))
    else:
        print("gunung:", ekspor())
