"""Pembangun statis sekali jalan: ubin PIPPIB -> public/data/lahan/pippib/nasional.json, untuk tampilan zoom jauh (< 5,5).
Stdlib saja. Poligon < 500 ha dibuang, garis disederhanakan 0,01 derajat (sekitar 1 piksel pada zoom 5,5).
Jalankan ulang setiap ubin PIPPIB dibangun ulang (bangun_lapisan_kemenhut.py). Pakai: python scripts/geo/ringkas_pippib.py"""
import glob, json, math, os

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "public", "data", "lahan", "pippib")
TOL, MIN_HA = 0.01, 500


def jarak(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = 0 if dx == dy == 0 else max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
    return math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)


def sederhana(c):
    """Douglas-Peucker iteratif; cincin tertutup aman karena jarak ke alas nol dihitung sebagai jarak titik."""
    jaga, tumpuk = {0, len(c) - 1}, [(0, len(c) - 1)]
    while tumpuk:
        i, j = tumpuk.pop()
        d, m = max(((jarak(c[k], c[i], c[j]), k) for k in range(i + 1, j)), default=(0, 0))
        if d > TOL:
            jaga.add(m)
            tumpuk += [(i, m), (m, j)]
    return [[round(x, 3), round(y, 3)] for x, y in (c[k] for k in sorted(jaga))]


def poligon(rs):
    keluar = [r for r in map(sederhana, rs) if len(r) >= 4]
    return keluar if len(rs[0]) >= 4 and len(sederhana(rs[0])) >= 4 else None


fitur, ha_semua, ha_kept = [], 0, 0
for f in glob.glob(os.path.join(D, "*_*.json")):
    if " 2" in os.path.basename(f):
        continue  # salinan nyasar sinkronisasi
    for x in json.load(open(f))["features"]:
        ha_semua += x["properties"]["ha"]
        if x["properties"]["ha"] < MIN_HA:
            continue
        g = x["geometry"]
        ps = [p for p in map(poligon, g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]) if p]
        if ps:
            ha_kept += x["properties"]["ha"]
            fitur.append({"type": "Feature", "properties": x["properties"], "geometry": {"type": "MultiPolygon", "coordinates": ps}})

p = os.path.join(D, "nasional.json")
json.dump({"type": "FeatureCollection", "features": fitur}, open(p, "w"), separators=(",", ":"))
print(len(fitur), "fitur", os.path.getsize(p) // 1024, "KB", f"{ha_kept / ha_semua:.1%} luas")
assert os.path.getsize(p) < 3_000_000 and ha_kept / ha_semua > 0.9, "berkas ringkas terlalu besar atau kehilangan terlalu banyak luas"
