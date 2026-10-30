"""Pembangun statis sekali jalan: PIPPIB 2026-I dan areal terbakar Kemenhut -> public/data/lahan/pippib/*.json
dan public/data/kemenhut/terbakar_<tahun>/<prov>.json (malas dimuat per ubin/provinsi saat lapisan dinyalakan).
Perlu shapely (venv). Pakai: python bangun_lapisan_kemenhut.py <pippib.geojson> <arealterbakar_2025.geojson> <arealterbakar_2026.geojson>
Catatan: berkas ini wilayah pipa-data, tapi pembangun statis sekali jalan; bukan bagian pipeline harian."""
import json, math, os, sys, collections
from shapely.geometry import shape, mapping
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "data")
TGL = "2026-10-29"
KLS = {"PIPPIB KAWASAN": 1, "PIPPIB PRIMER": 2, "PIPPIB GAMBUT": 3}

def ha(g):
    la = g.centroid.y
    return g.area * 111.32 * 110.57 * math.cos(math.radians(la)) * 100

def bulat(o, n=4):
    if isinstance(o, float): return round(o, n)
    if isinstance(o, list): return [bulat(x, n) for x in o]
    return o

def tulis(p, fc):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump(fc, open(p, "w"), separators=(",", ":"), ensure_ascii=False)
    return os.path.getsize(p)

def pippib(src):
    d = json.load(open(src)); rem = []; ubin = collections.defaultdict(list); n0 = len(d["features"])
    for f in d["features"]:
        g = shape(f["geometry"])
        if g.is_empty: continue
        g = g.simplify(0.0008, preserve_topology=False)
        if g.is_empty or g.geom_type not in ("Polygon", "MultiPolygon"): continue
        h = ha(g)
        if h < 2: continue  # sliver/bintik di bawah 2 ha tak terbaca pada skala 1:250.000
        r = f["properties"]["REMARK"]
        if r not in rem: rem.append(r)
        c = g.centroid; key = f"{int(c.x // 5) * 5}_{int(c.y // 5) * 5}"
        ubin[key].append({"type": "Feature", "properties": {"k": KLS[f["properties"]["PIPPIB"]], "ha": round(h), "r": rem.index(r)},
                          "geometry": {"type": g.geom_type, "coordinates": bulat(mapping(g)["coordinates"])}})
    meta = {"sumber": "Kemenhut/Ditjen Planologi, PIPPIB revisi 2026-I (Kepmenhut 2438/2026), geoportal.planologi.kehutanan.go.id Peta_Interaktif_2026/PIPPIB_AR_250K",
            "diambil": TGL, "kelas": {"1": "PIPPIB Kawasan", "2": "PIPPIB Primer", "3": "PIPPIB Gambut"}, "remark": rem,
            "catatan": "disederhanakan 0,0008 derajat, poligon < 2 ha dibuang; ubin 5x5 derajat berdasar titik tengah poligon", "ubin": {}}
    tot = 0
    for k, fs in sorted(ubin.items()):
        s = tulis(os.path.join(R, "lahan", "pippib", k + ".json"), {"type": "FeatureCollection", "features": fs}); tot += s
        meta["ubin"][k] = len(fs); print("pippib", k, len(fs), s // 1024, "KB")
    tulis(os.path.join(R, "lahan", "pippib", "indeks.json"), meta)
    print("pippib total", n0, "->", sum(len(v) for v in ubin.values()), tot // 1024, "KB")

def terbakar(tahun, src):
    d = json.load(open(src)); per = collections.defaultdict(list); bb = {}
    for f in d["features"]:
        g = shape(f["geometry"]).simplify(0.0003, preserve_topology=False)
        if g.is_empty or g.geom_type not in ("Polygon", "MultiPolygon"): continue
        p = f["properties"]
        if not str(p["prov"]).isdigit(): continue  # provinsi tak dikenal ("?"): beberapa poligon, dilewati
        x = g.bounds; o = bb.setdefault(p["prov"], list(x))
        o[:] = [min(o[0], x[0]), min(o[1], x[1]), max(o[2], x[2]), max(o[3], x[3])]
        per[p["prov"]].append({"type": "Feature", "properties": {"ha": p["luas_ha"], "t": p["tgl"], "kab": p["kab"], "a": p.get("akurasi")},
                               "geometry": {"type": g.geom_type, "coordinates": bulat(mapping(g)["coordinates"], 5)}})
    meta = {"sumber": "Kemenhut/Ditjen Planologi, Areal Kebakaran Hutan dan Lahan " + str(tahun) + " (Landsat-8/9 + Sentinel-2, 1:250.000), geoportal.planologi.kehutanan.go.id",
            "diambil": TGL, "tahun": tahun, "prov": {}}
    tot = 0
    for k, fs in sorted(per.items()):
        s = tulis(os.path.join(R, "kemenhut", f"terbakar_{tahun}", k + ".json"), {"type": "FeatureCollection", "features": fs}); tot += s
        meta["prov"][k] = {"n": len(fs), "bb": [round(v, 3) for v in bb[k]]}; print("terbakar", tahun, k, len(fs), s // 1024, "KB")
    tulis(os.path.join(R, "kemenhut", f"terbakar_{tahun}", "indeks.json"), meta); print("terbakar", tahun, "total", tot // 1024, "KB")

if __name__ == "__main__":
    pippib(sys.argv[1]); terbakar(2025, sys.argv[2]); terbakar(2026, sys.argv[3])
