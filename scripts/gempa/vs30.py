"""Vs30 per sel dari proksi kemiringan (Wald & Allen 2007, wilayah tektonik aktif) -> public/gempa/data/vs30.bin + vs30.json.

Kemiringan dihitung dari DEM AWS Terrain Tiles (terrarium) z8 (~610 m per piksel di khatulistiwa, setara grid 30 detik busur
yang dipakai Wald & Allen), selisih terpusat pada elevasi yang dipotong >= 0 (laut = 0, supaya garis pantai tidak tampak curam).
Per piksel -> Vs30 dengan interpolasi log-log pada tabel di bawah, lalu dirata-ratakan (rata-rata log) per sel 0,05 derajat,
sel yang sama dengan batimetri.bin. Sel tanpa piksel darat = 0.

Tabel kemiringan (m/m) -> Vs30 (m/s), tektonik aktif, DITRANSKRIPSI DARI INGATAN makalah (Tabel 1): validasi-model wajib mencocokkannya.
Proksi ini kasar: kemiringan tidak tahu aluvium tipis di lereng atau batuan lapuk di dataran; galat tipikal Vs30 +-30%.

Pakai:  python3 scripts/gempa/vs30.py | uji
"""
import concurrent.futures as cf, datetime as dt, math, os, sys, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from umum import AKAR, KELUAR, UA, simpan  # noqa: E402
from bukti import ubin_elev  # noqa: E402

Z = 8
DEM_DIR = os.path.join(AKAR, "data/raw/gempa/terrarium")
DEM_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
LON0, LAT0, D, NX, NY = 94.0, -12.0, 0.05, 960, 380  # tepi barat-selatan; sama dengan batimetri.bin
SAT = 4  # Uint8 = Vs30 / 4
TABEL = [(1e-4, 180.0), (2.2e-3, 240.0), (6.3e-3, 300.0), (0.018, 360.0), (0.05, 490.0), (0.10, 620.0), (0.138, 760.0)]


def vs30_dari_lereng(s):
    if s <= TABEL[0][0]:
        return TABEL[0][1]
    if s >= TABEL[-1][0]:
        return TABEL[-1][1]
    for (s0, v0), (s1, v1) in zip(TABEL, TABEL[1:]):
        if s <= s1:
            f = (math.log(s) - math.log(s0)) / (math.log(s1) - math.log(s0))
            return math.exp(math.log(v0) + f * (math.log(v1) - math.log(v0)))


def unduh(xy):
    x, y = xy
    j = os.path.join(DEM_DIR, str(Z), str(x), f"{y}.png")
    if not os.path.exists(j):
        req = urllib.request.Request(DEM_URL.format(z=Z, x=x, y=y), headers={"User-Agent": UA})
        for i in range(4):
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    isi = r.read()
                break
            except Exception:
                if i == 3:
                    raise
        os.makedirs(os.path.dirname(j), exist_ok=True)
        with open(j + ".tmp", "wb") as f:
            f.write(isi)
        os.replace(j + ".tmp", j)
    return j


def tile_xy(lat, lon):
    n = 2 ** Z
    return int((lon + 180) / 360 * n), int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)


def lat_dari_y(y):
    return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / (2 ** Z * 256)))))


def proses_ubin(xy, jumlah, isi_log):
    """Tambah log(Vs30) tiap piksel darat ke sel keluaran."""
    tx, ty = xy
    e = ubin_elev(open(unduh(xy), "rb").read())
    e = [[v if v > 0 else 0.0 for v in r] for r in e]
    for r in range(256):
        lat = lat_dari_y(ty * 256 + r + .5)
        j = int((lat - LAT0) / D)
        if not 0 <= j < NY:
            continue
        pix = 156543.03392 * math.cos(math.radians(lat)) / 2 ** Z  # m
        a, b, c = e[max(r - 1, 0)], e[r], e[min(r + 1, 255)]
        dy = (min(r + 1, 255) - max(r - 1, 0)) * pix
        for k in range(256):
            if b[k] <= 0:
                continue
            k0, k1 = max(k - 1, 0), min(k + 1, 255)
            gx, gy = (b[k1] - b[k0]) / ((k1 - k0) * pix), (c[k] - a[k]) / dy
            lon = (tx * 256 + k + .5) / (2 ** Z * 256) * 360 - 180
            i = int((lon - LON0) / D)
            if 0 <= i < NX:
                idx = j * NX + i
                jumlah[idx] += 1
                isi_log[idx] += math.log(vs30_dari_lereng(math.hypot(gx, gy)))


def main():
    x0, y1 = tile_xy(-12.0, 94.0)
    x1, y0 = tile_xy(7.0, 142.0)
    kunci = [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]
    print(f"{len(kunci)} ubin z{Z}", file=sys.stderr)
    with cf.ThreadPoolExecutor(8) as ex:
        list(ex.map(unduh, kunci))
    jumlah, isi_log = [0] * (NX * NY), [0.0] * (NX * NY)
    for n, xy in enumerate(kunci):
        proses_ubin(xy, jumlah, isi_log)
        if n % 50 == 0:
            print(f"  proses {n}/{len(kunci)}", file=sys.stderr)
    out = bytearray(NX * NY)
    for i, n in enumerate(jumlah):
        if n:
            out[i] = max(1, min(255, round(math.exp(isi_log[i] / n) / SAT)))
    with open(os.path.join(KELUAR, "vs30.bin"), "wb") as f:
        f.write(out)
    simpan(os.path.join(KELUAR, "vs30.json"), {
        "lon0": LON0 + D / 2, "lat0": LAT0 + D / 2, "d": D, "nx": NX, "ny": NY, "sat": SAT,
        "satuan": "m/s = nilai x sat; 0 = bukan darat", "urutan": "Uint8, baris selatan->utara, kolom barat->timur, titik = pusat sel",
        "sumber": "Proksi kemiringan Wald & Allen 2007 (BSSA 97:1379, tektonik aktif) dari AWS Terrain Tiles terrarium z8 (SRTM, GMTED, ETOPO1 dll.)",
        "catatan": "Proksi kasar, galat tipikal Vs30 sekitar 30%; bukan pengukuran. Tabel kemiringan->Vs30 ditranskripsi tanpa salinan digital, belum dicocokkan ke makalah.",
        "dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")})
    darat = sum(1 for n in jumlah if n)
    print(f"sel darat {darat}; Vs30 rata-rata {sum(out) * SAT / max(1, darat):.0f}", file=sys.stderr)


def uji():
    for s, v in TABEL:
        assert abs(vs30_dari_lereng(s) - v) < 1e-6, (s, v)
    assert vs30_dari_lereng(0) == 180 and vs30_dari_lereng(1) == 760
    xs = [vs30_dari_lereng(10 ** (-5 + i / 10)) for i in range(40)]
    assert all(b >= a for a, b in zip(xs, xs[1:])), "Vs30 harus naik bersama kemiringan"
    x, y = tile_xy(-6.2, 106.8)  # Jakarta
    assert (x, y) == (203, 132), (x, y)
    assert abs(lat_dari_y(132 * 256 + 128) + 6.2) < 0.5
    print("vs30 uji lolos")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
