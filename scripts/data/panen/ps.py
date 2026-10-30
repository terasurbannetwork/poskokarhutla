"""#3 Perhutanan Sosial (PIAPS) -> public/data/ps.json  (FITUR untuk #1, tanpa model sendiri)

Akses: geoportal.planologi.kehutanan.go.id/server/rest/services/Peta_Interaktif_2026/PIAPS_AR_250K/MapServer/0
  (Ditjen Planologi Kehutanan, Kemenhut; ArcGIS REST terbuka, 8 fitur multipoligon nasional, UA jujur; dibuktikan 30 Okt 2026).
  Layanan INTERAKTIF_SIGAP minta token -> TIDAK disentuh.
Panen: `python3 ps.py panen` (resumable, satu fitur per panggilan, simplifikasi 0,002 derajat ~ 200 m) -> data/raw/ps/piaps.jsonl.
Olah:  `python3 ps.py`
  pangsa_titik(prov)  = titik 7 hari di dalam PS / titik 7 hari prov           (hotspot.json)
  pangsa_luas(prov)   = sel grid 0.1 derajat di PS / sel grid prov              (sampel grid, galat ~ +-1 pt persen)
  lift(prov)          = pangsa_titik / pangsa_luas   (>1: api lebih sering di PS daripada luasnya)
Keterbatasan: PS = areal cadangan/definitif skala 1:250.000 yang disederhanakan; "di PS" bukan berarti pemegang PS pelaku.
Tanpa label -> FITUR (tidak diklaim prediksi)."""
import json, os, sys, datetime as dt, urllib.parse as up
sys.path.insert(0, os.path.dirname(__file__))
from panen_util import http_json, tulis

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
D = os.path.join(RAIZ, "public", "data")
RAW = os.path.join(RAIZ, "data", "raw", "ps")
U = "https://geoportal.planologi.kehutanan.go.id/server/rest/services/Peta_Interaktif_2026/PIAPS_AR_250K/MapServer/0/"
SEL = 0.1


def panen():
    os.makedirs(RAW, exist_ok=True)
    p = os.path.join(RAW, "piaps.jsonl")
    ada = sum(1 for _ in open(p)) if os.path.exists(p) else 0
    n = http_json(U + "query?where=1%3D1&returnCountOnly=true&f=json")["count"]
    with open(p, "a") as f:
        while ada < n:
            q = up.urlencode({"where": "1=1", "outFields": "OBJECTID,KRITERIA,LUAS_HA", "outSR": 4326, "maxAllowableOffset": 0.002,
                              "orderByFields": "OBJECTID", "resultOffset": ada, "resultRecordCount": 1, "f": "json"})
            x = http_json(U + "query?" + q, timeout=300)["features"][0]
            f.write(json.dumps({"a": x["attributes"], "r": x["geometry"]["rings"]}, separators=(",", ":")) + "\n"); f.flush()
            ada += 1; print("ps", ada, "/", n, flush=True)


class Poligon:
    """Banyak cincin dengan indeks grid; di_dalam = paritas cincin yang memuat titik (even-odd, lubang ikut)."""
    def __init__(self, cincin_per_kunci, g=0.5):
        self.g = g; self.idx = {}
        for k, rings in cincin_per_kunci:
            for r in rings:
                xs = [p[0] for p in r]; ys = [p[1] for p in r]
                e = (k, r, min(xs), min(ys), max(xs), max(ys))
                for gx in range(int(e[2] // g), int(e[4] // g) + 1):
                    for gy in range(int(e[3] // g), int(e[5] // g) + 1):
                        self.idx.setdefault((gx, gy), []).append(e)

    def cari(self, x, y):
        """-> set kunci yang memuat (x,y)."""
        par = {}
        for k, r, x0, y0, x1, y1 in self.idx.get((int(x // self.g), int(y // self.g)), []):
            if x0 <= x <= x1 and y0 <= y <= y1 and _pip(x, y, r):
                par[k] = par.get(k, 0) ^ 1
        return {k for k, v in par.items() if v}


def _pip(x, y, ring):
    c = False
    for i in range(len(ring)):
        x1, y1 = ring[i - 1]; x2, y2 = ring[i]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def olah():
    fs = [json.loads(l) for l in open(os.path.join(RAW, "piaps.jsonl"))]
    kr = {f["a"]["OBJECTID"]: f["a"]["KRITERIA"] for f in fs}
    ps = Poligon([("ps", f["r"]) for f in fs])
    # provinsi dari public/geo/provinsi.json (GeoJSON batas BIG)
    pv = json.load(open(os.path.join(RAIZ, "public", "geo", "provinsi.json")))
    fe = pv["features"] if "features" in pv else pv
    kp = []
    for f in fe:
        kode = str(f.get("properties", {}).get("kode") or f.get("properties", {}).get("prov") or f.get("properties", {}).get("id"))
        g = f["geometry"]; polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        kp.append((kode, [r for poly in polys for r in poly]))
    prov = Poligon(kp)
    h = json.load(open(os.path.join(D, "hotspot.json"))); kw = h["wilayah"]
    tot, dlm = {}, {}
    for lat, lon, jam, sen, frp, kf, wi, tgl in h["baris"]:
        p = (kw[wi] if isinstance(kw, list) else str(wi)).split("|")[0]
        tot[p] = tot.get(p, 0) + 1
        if ps.cari(lon, lat):
            dlm[p] = dlm.get(p, 0) + 1
    sel, sel_ps = {}, {}
    import math
    y = -11.0
    while y < 6.5:
        x = 94.0
        while x < 141.5:
            ks = prov.cari(x, y)
            if ks:
                k = sorted(ks)[0]; w = math.cos(math.radians(y))
                sel[k] = sel.get(k, 0) + w
                if ps.cari(x, y):
                    sel_ps[k] = sel_ps.get(k, 0) + w
            x += SEL
        y += SEL
    pn = json.load(open(os.path.join(D, "meta.json")))["provinsi"]
    rows = {}
    for k in sorted(sel, key=lambda k: -sel[k]):
        pl = sel_ps.get(k, 0) / sel[k]; pt = dlm.get(k, 0) / tot[k] if tot.get(k) else None
        rows[k] = {"nama": pn.get(k), "luas_ha_prov": round(sel[k] * SEL * SEL * 111.32 * 110.57 * 100),
                   "pangsa_luas_ps": round(pl, 4), "titik_total": tot.get(k, 0), "titik_di_ps": dlm.get(k, 0),
                   "pangsa_titik_ps": None if pt is None else round(pt, 4),
                   "lift": round(pt / pl, 2) if pt is not None and pl > 0.005 and tot.get(k, 0) >= 30 else None}
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"), "acuan_titik": h["acuan"],
           "jenis": "fitur (tanpa label; bukan model prediksi)",
           "kriteria": {str(k): {"nama": v, "ha": round(next(f["a"]["LUAS_HA"] for f in fs if f["a"]["OBJECTID"] == k))} for k, v in kr.items()},
           "ringkas": {"titik_total": sum(tot.values()), "titik_di_ps": sum(dlm.values()),
                       "pangsa_titik_nasional": round(sum(dlm.values()) / max(1, sum(tot.values())), 4)},
           "rumus": "lift = pangsa_titik_ps / pangsa_luas_ps; luas dari sampel grid 0,1 derajat berbobot cos(lintang)",
           "per_provinsi": rows,
           "atribusi": "Kementerian Kehutanan, Ditjen Planologi Kehutanan (PIAPS Revisi X, geoportal.planologi.kehutanan.go.id); titik api NASA FIRMS",
           "lisensi": "Layanan geoportal Kemenhut terbuka tanpa kunci; skala 1:250.000 disederhanakan ~200 m"}
    print(tulis(os.path.join(D, "ps.json"), out), "bita", json.dumps(out["ringkas"]))


def uji():
    sq = [[(0, 0), (4, 0), (4, 4), (0, 4), (0, 0)], [(1, 1), (3, 1), (3, 3), (1, 3), (1, 1)]]
    p = Poligon([("a", sq)])
    assert p.cari(0.5, 0.5) == {"a"} and p.cari(2, 2) == set() and p.cari(9, 9) == set()
    print("ps uji OK")


if __name__ == "__main__":
    a = sys.argv[1:] or [""]
    uji() if a[0] == "uji" else panen() if a[0] == "panen" else olah()
