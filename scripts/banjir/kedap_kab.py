"""Porsi lahan terbangun (ESA WorldCover v200 2021, kelas 50, CC BY 4.0) per kab sampel -> data/raw/banjir/model_kab_campur/kedap.json
(E_kedap, PRAREG-CAMPUR §3.2d). Ubin 3x3 derajat diunduh ke data/raw/banjir/fitur/worldcover/ (gitignored), dibaca per strip lewat gdal_translate (ENVI)
lalu dirata-ratakan per blok 20x20 piksel (~220 m): fraksi kelas 50. Porsi kab = rerata fraksi sel yang pusatnya di dalam poligon kab (public/geo/kabupaten).
Pakai:  python3 scripts/banjir/kedap_kab.py unduh | hitung | uji
Kuota/ukuran: 19 ubin ~0,41 GB (HEAD 4 Nov 2026) untuk 40 kab sampel.
"""
import hashlib, json, math, os, subprocess, sys, tempfile

import numpy as np

AYAH = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(AYAH, "../.."))
DIR = os.path.join(AKAR, "data/raw/banjir/fitur/worldcover")
KELUAR = os.path.join(AKAR, "data/raw/banjir/model_kab_campur/kedap.json")
GEO = os.path.join(AKAR, "public/geo/kabupaten")
SAMPEL = os.path.join(AKAR, "data/banjir/kab2_ops/sampel.json")
URL = "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{n}_Map.tif"
BLOK, STRIP, KELAS = 20, 2000, 50


def nama(la, lo):
    return f"{'N' if la >= 0 else 'S'}{abs(la):02d}{'E' if lo >= 0 else 'W'}{abs(lo):03d}"


def poligon_kab(kunci):
    pv, nm = kunci.split("|", 1)
    for ft in json.load(open(os.path.join(GEO, pv + ".json")))["features"]:
        if ft["properties"]["kab"] == nm:
            g = ft["geometry"]
            return [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
    raise KeyError(kunci)


def kotak(polys):
    xs = [c[0] for p in polys for r in p for c in r]
    ys = [c[1] for p in polys for r in p for c in r]
    return min(xs), min(ys), max(xs), max(ys)


def ubin_perlu(kabs):
    t = set()
    for k in kabs:
        x0, y0, x1, y1 = kotak(poligon_kab(k))
        for la in range(math.floor(y0 / 3) * 3, math.floor(y1 / 3) * 3 + 1, 3):
            for lo in range(math.floor(x0 / 3) * 3, math.floor(x1 / 3) * 3 + 1, 3):
                t.add((la, lo))
    return sorted(t)


def dalam(polys, X, Y):
    """Even-odd (cincin luar dan lubang) untuk titik X,Y (array numpy)."""
    masuk = np.zeros(X.shape, bool)
    for p in polys:
        for r in p:
            a = np.array(r)
            x1, y1, x2, y2 = a[:-1, 0], a[:-1, 1], a[1:, 0], a[1:, 1]
            for i in range(len(x1)):
                if y1[i] == y2[i]:
                    continue
                m = ((y1[i] > Y) != (y2[i] > Y)) & (X < (x2[i] - x1[i]) * (Y - y1[i]) / (y2[i] - y1[i]) + x1[i])
                masuk ^= m
    return masuk


def porsi_poligon(frak, x0, y0, langkah, polys):
    """frak[r, c] = fraksi sel (baris 0 = utara, pojok kiri-atas = (x0, y0)); langkah derajat. -> (porsi, n_sel dalam) atau (None, 0)."""
    h, w = frak.shape
    bx0, by0, bx1, by1 = kotak(polys)
    c0, c1 = max(0, int((bx0 - x0) // langkah)), min(w, int((bx1 - x0) // langkah) + 1)
    r0, r1 = max(0, int((y0 - by1) // langkah)), min(h, int((y0 - by0) // langkah) + 1)
    if c1 <= c0 or r1 <= r0:
        return None, 0
    cx = x0 + (np.arange(c0, c1) + 0.5) * langkah
    cy = y0 - (np.arange(r0, r1) + 0.5) * langkah
    X, Y = np.meshgrid(cx, cy)
    m = dalam(polys, X, Y)
    n = int(m.sum())
    return (float(frak[r0:r1, c0:c1][m].sum()), n)


def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 22), b""):
            h.update(b)
    return h.hexdigest()


def unduh():
    kabs = json.load(open(SAMPEL))["kab"]
    os.makedirs(DIR, exist_ok=True)
    for la, lo in ubin_perlu(kabs):
        p = os.path.join(DIR, nama(la, lo) + ".tif")
        r = subprocess.run(["curl", "-sS", "-f", "-L", "-C", "-", "--retry", "6", "--retry-all-errors", "--speed-time", "30", "--speed-limit", "30000", "-o", p, URL.format(n=nama(la, lo))], capture_output=True, text=True)
        if r.returncode == 22:                       # 404: ubin laut, tidak ada
            if os.path.exists(p) and os.path.getsize(p) == 0:
                os.remove(p)
            print("  tidak ada (laut):", nama(la, lo))
        elif r.returncode == 33 or r.returncode == 0:   # 33 = sudah utuh (range tak terpenuhi)
            print("  ok", nama(la, lo), os.path.getsize(p))
        else:
            sys.exit(f"curl {nama(la, lo)} rc={r.returncode}: {r.stderr[-200:]}")
    json.dump({"ubin": [nama(la, lo) for la, lo in ubin_perlu(kabs) if os.path.exists(os.path.join(DIR, nama(la, lo) + ".tif"))]}, open(os.path.join(DIR, "lengkap.json"), "w"))


def grid_ubin(p):
    """-> (frak [h/B, w/B], x0, y0 (kiri-atas), langkah derajat)."""
    info = json.loads(subprocess.run(["gdalinfo", "-json", p], capture_output=True, text=True, check=True).stdout)
    W, H = info["size"]
    gt = info["geoTransform"]
    out = np.zeros((H // BLOK, W // BLOK), np.float32)
    with tempfile.TemporaryDirectory() as t:
        for y in range(0, H, STRIP):
            h = min(STRIP, H - y)
            h -= h % BLOK
            if h <= 0:
                continue
            f = os.path.join(t, "s.bin")
            subprocess.run(["gdal_translate", "-q", "-of", "ENVI", "-srcwin", "0", str(y), str(W), str(h), p, f], check=True, capture_output=True)
            a = np.fromfile(f, np.uint8).reshape(h, W)
            out[y // BLOK:(y + h) // BLOK] = (a == KELAS).reshape(h // BLOK, BLOK, W // BLOK, BLOK).mean((1, 3))
    return out, gt[0], gt[3], abs(gt[1]) * BLOK


def hitung():
    kabs = json.load(open(SAMPEL))["kab"]
    if not os.path.exists(os.path.join(DIR, "lengkap.json")):
        sys.exit("unduh belum tuntas (lengkap.json tidak ada): jalankan `unduh` sampai selesai; ubin separuh unduh tidak boleh dihitung")
    grid, man = {}, {}
    for la, lo in ubin_perlu(kabs):
        p = os.path.join(DIR, nama(la, lo) + ".tif")
        if os.path.exists(p):
            grid[(la, lo)] = grid_ubin(p)
            man[nama(la, lo)] = sha(p)
    hasil = {}
    for k in kabs:
        polys, jum, n = poligon_kab(k), 0.0, 0
        for fr, x0, y0, st in grid.values():
            s, c = porsi_poligon(fr, x0, y0, st, polys)
            if c:
                jum, n = jum + s, n + c
        hasil[k] = {"porsi": round(jum / n, 5) if n else None, "n_sel": n}
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    json.dump({"metode": f"WorldCover v200 2021 kelas {KELAS}, fraksi per blok {BLOK}x{BLOK} piksel (~220 m), rerata sel berpusat di dalam poligon public/geo/kabupaten",
               "sha256_ubin": man, "kab": hasil}, open(KELUAR, "w"), separators=(",", ":"))
    for k, v in sorted(hasil.items(), key=lambda kv: -(kv[1]["porsi"] or 0))[:6]:
        print(k, v)


def uji():
    fr = np.zeros((10, 10), np.float32)
    fr[:, :5] = 1.0                                           # separuh barat terbangun penuh
    kotak_ = [[[[0.0, 10.0], [10.0, 10.0], [10.0, 0.0], [0.0, 0.0], [0.0, 10.0]]]]       # 10x10 derajat, langkah 1
    p, n = porsi_poligon(fr, 0.0, 10.0, 1.0, kotak_)
    assert n == 100 and abs(p / n - 0.5) < 1e-9
    p2, n2 = porsi_poligon(fr, 0.0, 10.0, 1.0, [[[[0, 10], [5, 10], [5, 0], [0, 0], [0, 10]]]])
    assert n2 == 50 and abs(p2 / n2 - 1.0) < 1e-9             # poligon di sisi terbangun
    lubang = [[[[0, 10], [10, 10], [10, 0], [0, 0], [0, 10]], [[0, 10], [5, 10], [5, 0], [0, 0], [0, 10]]]]
    p3, n3 = porsi_poligon(fr, 0.0, 10.0, 1.0, lubang)
    assert n3 == 50 and p3 == 0.0                             # lubang membuang sisi barat
    assert porsi_poligon(fr, 0.0, 10.0, 1.0, [[[[20, 30], [21, 30], [21, 29], [20, 29], [20, 30]]]]) == (None, 0)
    assert nama(-7, 105) == "S07E105" and nama(0, 96) == "N00E096"
    print("ok kedap_kab")


if __name__ == "__main__":
    {"unduh": unduh, "hitung": hitung, "uji": uji}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: sys.exit(__doc__))()
