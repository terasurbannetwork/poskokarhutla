"""Batas Indonesia ringkas untuk klip overlay: public/geo/provinsi.json -> public/data/geo/batas_indonesia.json.
Hanya cincin luar (lubang dibuang: enklave diisi provinsi lain), disederhanakan Douglas-Peucker, koordinat 3 desimal.
Dipakai klip ubin di public/inti/peta/nasa.js dan penyaring titik di layar. Jalankan: python3 scripts/geo/bangun_batas_indonesia.py"""
import json, os
R = os.path.join(os.path.dirname(__file__), "..", "..")
TOL, LUAS_MIN = 0.003, 0.0003  # derajat; ~330 m dan ~3,6 km2
SKALA = 1000  # koordinat bilangan bulat 1/1000 derajat, selisih antartitik (hemat ukuran)

def dp(p, e):
    if len(p) < 3: return p
    (x1, y1), (x2, y2) = p[0], p[-1]; dx, dy = x2 - x1, y2 - y1; n = dx * dx + dy * dy or 1e-18
    m, k = 0, 0
    for i in range(1, len(p) - 1):
        t = max(0, min(1, ((p[i][0] - x1) * dx + (p[i][1] - y1) * dy) / n))
        d = (p[i][0] - x1 - t * dx) ** 2 + (p[i][1] - y1 - t * dy) ** 2
        if d > m: m, k = d, i
    return dp(p[:k + 1], e)[:-1] + dp(p[k:], e) if m > e * e else [p[0], p[-1]]

def luas(r): return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2

def dalam(p, x, y):
    c = False
    for i in range(len(p)):
        (a, b), (u, v) = p[i], p[i - 1]
        if (b > y) != (v > y) and x < (u - a) * (y - b) / (v - b) + a: c = not c
    return c

def kode(r):
    """[[x,y],...] -> [x0,y0,dx1,dy1,...] dalam 1/SKALA derajat; dibaca nasa.js (NASA.batas)"""
    a = [[round(x * SKALA), round(y * SKALA)] for x, y in r]; v = list(a[0])
    for i in range(1, len(a)): v += [a[i][0] - a[i - 1][0], a[i][1] - a[i - 1][1]]
    return v

def bangun():
    g = json.load(open(os.path.join(R, "public/geo/provinsi.json")))
    out = []
    for f in g["features"]:
        ps = f["geometry"]["coordinates"] if f["geometry"]["type"] == "MultiPolygon" else [f["geometry"]["coordinates"]]
        for poli in ps:
            r = poli[0]
            if luas(r) < LUAS_MIN: continue
            s = dp(r[:-1] if r[0] == r[-1] else r, TOL)
            s = [[round(x, 3), round(y, 3)] for x, y in s]  # 3 desimal = SKALA 1000
            if len(s) >= 3: out.append(s)
    return out

if __name__ == "__main__":
    o = bangun(); d = os.path.join(R, "public/data/geo"); os.makedirs(d, exist_ok=True)
    t = json.dumps({"skala": SKALA, "cincin": [kode(r) for r in o]}, separators=(",", ":"))
    open(os.path.join(d, "batas_indonesia.json"), "w").write(t)
    di = lambda x, y: any(dalam(r, x, y) for r in o)
    assert di(106.85, -6.2) and di(110.4, -7.8) and di(140.7, -2.5), "kota Indonesia harus di dalam"
    assert not di(101.69, 3.14) and not di(103.82, 1.35) and not di(115.0, -25) and not di(77.2, 28.6), "KL, Singapura, Australia, Delhi di luar"
    assert len(t) < 200_000, len(t)
    print(len(o), "cincin", len(t), "byte")
