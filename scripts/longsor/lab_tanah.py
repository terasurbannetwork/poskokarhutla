"""SoilGrids (#18) -> public/longsor/data/tanah.json. LAB/lokal SEKALI (butuh numpy + rasterio; bukan pipeline harian).

Sumber: ISRIC SoilGrids 2.0 lewat WCS maps.isric.org (CC BY 4.0, Poggio dkk. 2021, doi:10.5194/soil-7-217-2021), peta 'sand' dan
'clay' kedalaman 5-15 cm, rata-rata ('mean', g/kg; /10 = %). Diunduh per jendela 4 x 4 derajat pada 0,02 derajat (~2,2 km)
dan disimpan di data/raw/longsor/tanah/ (tidak di-commit). Tiap kecamatan = rata-rata <= 25 titik sampel di dalam poligon
(nilai 0 = air/kota/tanpa data dibuang). Dari pasir/liat rata-rata: kelas tekstur USDA -> kelompok hidrologi A-D -> CN2 (rumus.py).
Keluaran hanya agregat per kecamatan: {"kec":[id], "k":[[pasir%, liat%, HSG, CN]]}  (null bila semua titik tanpa data).

Pakai:  .venv-longsor/bin/python scripts/longsor/lab_tanah.py
"""
import json, math, os, sys, time, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import KELUAR, MENTAH, UA, WIB, daftar_kec, simpan, titik_sampel
import rumus

BASE = "https://maps.isric.org/mapserv?map=/map/{p}.map"
W, PIKSEL = 4.0, 200          # derajat per jendela, piksel per sisi
KEDALAMAN = "5-15cm"


def jendela(lon, lat):
    return math.floor(lon / W) * W, math.floor(lat / W) * W


def ambil_jendela(p, x0, y0):
    jalur = os.path.join(MENTAH, "tanah", f"{p}_{KEDALAMAN}_{x0:.0f}_{y0:.0f}.tif")
    if os.path.exists(jalur):
        return jalur
    q = [("SERVICE", "WCS"), ("VERSION", "2.0.1"), ("REQUEST", "GetCoverage"), ("COVERAGEID", f"{p}_{KEDALAMAN}_mean"), ("FORMAT", "image/tiff"),
         ("SUBSET", f"long({x0},{x0 + W})"), ("SUBSET", f"lat({y0},{y0 + W})"),
         ("SUBSETTINGCRS", "http://www.opengis.net/def/crs/EPSG/0/4326"), ("OUTPUTCRS", "http://www.opengis.net/def/crs/EPSG/0/4326"),
         ("SCALESIZE", f"long({PIKSEL}),lat({PIKSEL})")]
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(BASE.format(p=p) + "&" + urllib.parse.urlencode(q, safe="(),:/"), headers=UA), timeout=180) as r:
                b = r.read()
            if b[:2] not in (b"II", b"MM"):
                raise RuntimeError(b[:200])
            os.makedirs(os.path.dirname(jalur), exist_ok=True)
            open(jalur, "wb").write(b)
            time.sleep(3)
            return jalur
        except Exception as e:
            print(f"  {p} {x0},{y0}: {str(e)[:100]}, ulang", file=sys.stderr)
            time.sleep(15 * (i + 1))
    raise RuntimeError(f"SoilGrids {p} {x0},{y0}: gagal")


def main():
    import numpy as np, rasterio
    kecs = daftar_kec()
    pts = [titik_sampel(k, 25) for k in kecs]
    perlu = sorted({jendela(x, y) for tt in pts for x, y in tt})
    print(f"tanah: {len(kecs)} kec, {len(perlu)} jendela x 2 peta", file=sys.stderr)
    nilai = {}
    for p in ("sand", "clay"):
        for x0, y0 in perlu:
            with rasterio.open(ambil_jendela(p, x0, y0)) as ds:
                nilai[(p, x0, y0)] = (ds.read(1), ds.transform)
    keluar = []
    for k, tt in zip(kecs, pts):
        s, c = [], []
        for x, y in tt:
            x0, y0 = jendela(x, y)
            a, tr = nilai[("sand", x0, y0)]
            b, _ = nilai[("clay", x0, y0)]
            col, row = int((x - tr.c) / tr.a), int((y - tr.f) / tr.e)
            if 0 <= row < a.shape[0] and 0 <= col < a.shape[1] and a[row, col] > 0 and b[row, col] > 0:
                s.append(a[row, col] / 10)
                c.append(b[row, col] / 10)
        if not s:
            keluar.append(None)
            continue
        ps, pc = sum(s) / len(s), sum(c) / len(c)
        h = rumus.hsg(ps, pc)
        keluar.append([round(ps, 1), round(pc, 1), h, rumus.cn(h)])
    n = sum(1 for x in keluar if x)
    simpan(os.path.join(KELUAR, "tanah.json"), {
        "dibuat": time.strftime("%Y-%m-%d"), "sumber": "ISRIC SoilGrids 2.0 (WCS maps.isric.org), sand+clay 5-15 cm mean",
        "lisensi": "CC BY 4.0", "atribusi": "Poggio dkk. 2021, SoilGrids 2.0, SOIL 7:217-240, doi:10.5194/soil-7-217-2021",
        "rumus": "tekstur USDA(pasir,liat) -> HSG A-D (NRCS NEH-630 ch.7) -> CN2 padang rumput kondisi sedang A49 B69 C79 D84; "
                 "S=25400/CN-254 mm; Q=(P-0.2S)^2/(P+0.8S). Tutupan lahan belum dipakai (CN bukan CN lahan nyata).",
        "resolusi_km": 2.2, "kolom": ["pasir_pct", "liat_pct", "hsg", "cn"], "kec": [k["id"] for k in kecs], "k": keluar})
    print(f"tanah.json: {n}/{len(kecs)} kec bernilai", file=sys.stderr)


if __name__ == "__main__":
    main()
