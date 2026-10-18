"""Kesatuan Hidrologis Gambut (KHG) -> public/data/lahan/khg.geojson (lapisan batas KHG di peta).

Sumber: BRGM PRIMS, GeoServer WFS lapisan prims:khg (518 KHG; kode, nama, luas, tahun sasaran restorasi BRGM).
Kebijakan data PRIMS: boleh dipakai di luar platform dengan tautan ke wali data, tidak untuk komersial, tidak dimodifikasi
isinya. Poligon hanya disederhanakan untuk tampilan (Douglas-Peucker), atribut tidak diubah.

Pakai:  python3 -I scripts/scrape/khg.py        # unduh (bila belum di data/raw/khg/) + bangun + uji
        python3 -I scripts/scrape/khg.py uji    # uji berkas hasil saja
"""
import glob, json, os, sys, urllib.request

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lahan import di_dalam, dp, luas  # noqa: E402

MENTAH = os.path.join(AKAR, "data/raw/khg")
KELUAR = os.path.join(AKAR, "public/data/lahan/khg.geojson")
WFS = ("https://prims.brgm.go.id/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature&typeNames=prims:khg"
       "&outputFormat=application/json&srsName=EPSG:4326&sortBy=gid&count=50&startIndex={s}")
TOL, MIN_LUAS = 0.002, 2e-5  # derajat (~220 m, sama dengan konsesi), derajat persegi (~25 ha)


def unduh():
    """Per 50 fitur: unduhan utuh 27 MB sering terpotong di tengah."""
    os.makedirs(MENTAH, exist_ok=True)
    s = 0
    while True:
        p = os.path.join(MENTAH, f"hal_{s}.json")
        if not os.path.exists(p):
            for coba in range(3):
                try:
                    d = json.loads(urllib.request.urlopen(WFS.format(s=s), timeout=240).read())
                    break
                except Exception as e:
                    print(f"ulang {s}: {e}", file=sys.stderr)
            else:
                raise SystemExit(f"gagal unduh halaman {s}")
            json.dump(d, open(p, "w"))
        n = len(json.load(open(p))["features"])
        if n < 50:
            return
        s += 50


def bangun():
    fitur = []
    for p in sorted(glob.glob(os.path.join(MENTAH, "hal_*.json")), key=lambda x: int(x.rsplit("_", 1)[1][:-5])):
        for f in json.load(open(p))["features"]:
            poli = []
            for pg in f["geometry"]["coordinates"]:
                rr = [[[round(x, 4), round(y, 4)] for x, y in dp(r, TOL)] for r in pg]
                if len(rr[0]) >= 4 and luas(rr[0]) >= MIN_LUAS:
                    poli.append([r for r in rr if len(r) >= 4])
            if not poli:
                continue
            q = f["properties"]
            fitur.append({"type": "Feature", "properties": {"kode": q["kode_khg"], "nama": q["nama_khg"], "ha": round(q["l"] or 0),
                                                           **({"sasaran": int(q["sasaran"])} if q.get("sasaran") else {})},
                          "geometry": {"type": "MultiPolygon", "coordinates": poli}})
    with open(KELUAR, "w") as f:
        json.dump({"type": "FeatureCollection", "sumber": "BRGM PRIMS (prims.brgm.go.id), lapisan KHG", "features": fitur},
                  f, separators=(",", ":"), ensure_ascii=False)
    print(f"khg.geojson: {len(fitur)} KHG, {os.path.getsize(KELUAR) / 1e6:.1f} MB", file=sys.stderr)


def uji():
    fs = json.load(open(KELUAR))["features"]
    assert len(fs) >= 500, f"KHG hanya {len(fs)}"
    assert len({f["properties"]["kode"] for f in fs}) == len(fs), "kode KHG ganda"
    kena = lambda lo, la: [f["properties"]["nama"] for f in fs if di_dalam(lo, la, f["geometry"])]
    assert any("Sebangau" in n for n in kena(113.75, -2.55)), "TN Sebangau mestinya di KHG Sungai Katingan - Sungai Sebangau"
    assert not kena(137.16, -4.08), "Puncak Jaya bukan KHG"
    assert os.path.getsize(KELUAR) < 6e6, "khg.geojson terlalu besar untuk peta"
    print("uji khg: lolos", file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1:] != ["uji"]:
        unduh()
        bangun()
    uji()
