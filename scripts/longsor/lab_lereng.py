"""Lereng DEM + jarak sesar per kecamatan -> data/raw/longsor/fitur_statis.json (antara; kerentanan.py menerbitkan agregatnya).
LAB/lokal SEKALI (numpy).

DEM: ubin Terrarium z10 (AWS Open Data elevation-tiles-prod; gabungan SRTM/Copernicus/lainnya, ~150 m/piksel di khatulistiwa),
sama sumbernya dengan scripts/scrape/air_dem.py (dekoder PNG-nya dipakai ulang). Lereng = atan(|grad z|) beda-tengah per piksel,
ukuran piksel mengikuti garis lintang. 150 m MENGHALUSKAN lereng curam dibanding SRTM 30/90 m yang dipakai LHASA; yang dipakai
adalah persentil 75 lereng pada <= 40 titik sampel per kecamatan (bukan rata-rata, supaya kecamatan berpuncak curam tidak
tenggelam oleh lembahnya), jadi nilainya perbandingan antar-kecamatan, bukan lereng lapangan.
Sesar: public/gempa/data/sesar.geojson (GEM Active Faults, CC BY-SA 4.0), jarak terpendek titik pusat kecamatan ke ruas (km, bidang
lokal ekuirektangular).

Keluaran: {"kec":[id], "lereng_p75":[deg], "lereng_rata":[deg], "elev_m":[m], "sesar_km":[km]}
Pakai:  .venv-longsor/bin/python scripts/longsor/lab_lereng.py   |   ... uji
"""
import importlib.util, json, math, os, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, MENTAH, UA, daftar_kec, titik_sampel
import rumus

Z = 10
URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"


def ubin(lon, lat, z=Z):
    n = 2 ** z
    x = (lon + 180) / 360 * n
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    return int(x), int(y), x - int(x), y - int(y)


def lereng_ubin(e, lat_pusat, z=Z):
    """e: larik elevasi (m) -> lereng (derajat) per piksel."""
    import numpy as np
    sisi = 156543.03392 * math.cos(math.radians(lat_pusat)) / 2 ** z
    gy, gx = np.gradient(e, sisi)
    return np.degrees(np.arctan(np.hypot(gx, gy)))


def jarak_sesar(lon, lat, seg):
    """seg: larik (N,4) lon1,lat1,lon2,lat2 -> km terdekat (bidang lokal di sekitar lat)."""
    import numpy as np
    kx = 111.32 * math.cos(math.radians(lat))
    ky = 110.57
    ax, ay, bx, by = (seg[:, 0] - lon) * kx, (seg[:, 1] - lat) * ky, (seg[:, 2] - lon) * kx, (seg[:, 3] - lat) * ky
    dx, dy = bx - ax, by - ay
    pj = np.maximum(dx * dx + dy * dy, 1e-12)
    t = np.clip(-(ax * dx + ay * dy) / pj, 0, 1)
    return float(np.min(np.hypot(ax + t * dx, ay + t * dy)))


def unduh_ubin(x, y):
    jalur = os.path.join(MENTAH, "dem", str(Z), str(x), f"{y}.png")
    if not os.path.exists(jalur):
        for i in range(4):
            try:
                with urllib.request.urlopen(urllib.request.Request(URL.format(z=Z, x=x, y=y), headers=UA), timeout=60) as r:
                    b = r.read()
                os.makedirs(os.path.dirname(jalur), exist_ok=True)
                open(jalur, "wb").write(b)
                break
            except Exception as e:
                if i == 3:
                    raise RuntimeError(f"DEM {x}/{y}: {e}")
                time.sleep(5 * (i + 1))
    return jalur


def dem_ubin(x, y, ctrl, baca_png):
    import numpy as np
    jalur = unduh_ubin(x, y)
    w, h, k, px = baca_png(open(jalur, "rb").read())
    a = np.frombuffer(bytes(px), dtype=np.uint8).reshape(h, w, k).astype(np.float64)
    e = a[:, :, 0] * 256 + a[:, :, 1] + a[:, :, 2] / 256 - 32768
    n = 2 ** Z
    lat_pusat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * (y + .5) / n))))
    return e, lereng_ubin(e, lat_pusat)


def main():
    import numpy as np
    s = importlib.util.spec_from_file_location("air_dem", os.path.join(AKAR, "scripts/scrape/air_dem.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    fc = json.load(open(os.path.join(AKAR, "public/gempa/data/sesar.geojson")))
    seg = [(a[0], a[1], b[0], b[1]) for f in fc["features"] for a, b in zip(f["geometry"]["coordinates"], f["geometry"]["coordinates"][1:])]
    seg = np.array(seg)
    kecs = daftar_kec()
    from concurrent.futures import ThreadPoolExecutor
    titik = [titik_sampel(k, 40) for k in kecs]
    perlu = sorted({ubin(lon, lat)[:2] for tt in titik for lon, lat in tt})
    print(f"lereng: {len(perlu)} ubin z{Z}", file=sys.stderr)
    with ThreadPoolExecutor(6) as ex:   # sopan: 6 paralel ke S3 publik, bukan ratusan
        list(ex.map(lambda t: unduh_ubin(*t), perlu))
    cache, hasil = {}, {"kec": [], "lereng_p75": [], "lereng_rata": [], "elev_m": [], "sesar_km": []}
    for i, (k, tt) in enumerate(zip(kecs, titik)):
        sl, el = [], []
        for lon, lat in tt:
            x, y, fx, fy = ubin(lon, lat)
            if (x, y) not in cache:
                cache[(x, y)] = dem_ubin(x, y, None, m.baca_png)
                if len(cache) > 400:   # ponytail: buang yang tertua; kecamatan terurut per provinsi jadi ubin tetangga masih hangat
                    cache.pop(next(iter(cache)))
            e, g = cache[(x, y)]
            r, c = min(255, int(fy * 256)), min(255, int(fx * 256))
            sl.append(float(g[r, c]))
            el.append(float(e[r, c]))
        hasil["kec"].append(k["id"])
        hasil["lereng_p75"].append(round(rumus.persentil(sl, 75), 2))
        hasil["lereng_rata"].append(round(sum(sl) / len(sl), 2))
        hasil["elev_m"].append(round(sum(el) / len(el)))
        hasil["sesar_km"].append(round(jarak_sesar(k["lon"], k["lat"], seg), 1))
        if i % 500 == 0:
            print(f"  lereng {i}/{len(kecs)}", file=sys.stderr)
    os.makedirs(MENTAH, exist_ok=True)
    json.dump(hasil, open(os.path.join(MENTAH, "fitur_statis.json"), "w"), separators=(",", ":"))


def uji():
    import numpy as np
    xx, yy = np.meshgrid(np.arange(256), np.arange(256))
    sisi = 156543.03392 / 2 ** Z                  # khatulistiwa
    e = xx * sisi * math.tan(math.radians(20))    # bidang miring 20 derajat ke timur
    assert np.allclose(lereng_ubin(e, 0), 20, atol=.01)
    assert np.allclose(lereng_ubin(np.full((4, 4), 100.0), -7), 0)
    x, y, fx, fy = ubin(0.0, 0.0)
    assert (x, y) == (512, 512) and abs(fx) < 1e-9 and abs(fy) < 1e-9
    seg = np.array([[0.0, -1.0, 0.0, 1.0]])       # sesar lurus di bujur 0
    assert abs(jarak_sesar(0.1, 0, seg) - 11.132) < .01 and jarak_sesar(0, 5, seg) > 400
    print("lab_lereng: uji lolos")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
