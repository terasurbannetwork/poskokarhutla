"""File geodatabase resmi Kemenhut -> berkas mentah yang dibaca pembangun tanpa dependensi.

Pemilik menerima dua GDB langsung dari Kementerian Kehutanan (20 Nov 2026) dan mengizinkan poligonnya
diterbitkan ulang di situs:
- KWSHUTAN_AR_250K_JUNI2026_REV1.gdb (kawasan hutan, pengukuhan s.d. Des 2025, 30.896 poligon, 38 provinsi)
  -> data/raw/lahan/kwshutan_062026.zip (shapefile; dibaca lahan.py kawasan() lewat baca_shp)
- PBPH_AR_50K_052026.gdb (PBPH aktif Mei 2026, 541 poligon)
  -> data/raw/konsesi/pbph_ar_50k_052026.geojson (dibaca konsesi.py bangun())

Butuh GDAL (pyogrio), jadi dijalankan lewat uv, sekali per rilis data baru:
    uv run --no-project --with pyogrio --with geopandas python -I scripts/scrape/kemenhut_gdb.py \
        <KWSHUTAN...gdb atau .zip> <PBPH...gdb atau .zip>
Zip unduhan Google Drive boleh langsung dipakai (GDB di dalamnya diekstrak ke folder sementara).
"""
import os, sys, tempfile, zipfile

import pyogrio

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
KWS_KELUAR = os.path.join(AKAR, "data/raw/lahan/kwshutan_062026.zip")
PBPH_KELUAR = os.path.join(AKAR, "data/raw/konsesi/pbph_ar_50k_052026.geojson")
KWS_KOLOM = ["NO_REG", "KODE_PROV", "FUNGSIKWS", "NOSKKWS", "TGLSKKWS", "NAMOBJ", "LUAS"]


def gdb(jalur, tmp):
    if jalur.endswith(".zip"):
        zipfile.ZipFile(jalur).extractall(tmp)
        jalur = next(os.path.join(tmp, n) for n in os.listdir(tmp) if n.endswith(".gdb"))
    return jalur


def main(kws, pbph):
    with tempfile.TemporaryDirectory() as tmp:
        kws, pbph = gdb(kws, os.path.join(tmp, "k")), gdb(pbph, os.path.join(tmp, "p"))
        d = pyogrio.read_dataframe(kws, columns=KWS_KOLOM)
        assert str(d.crs) == "EPSG:4326" and len(d) > 30000, (d.crs, len(d))
        d["TGLSKKWS"] = d["TGLSKKWS"].astype(str).str[:10]
        shp = os.path.join(tmp, "kwshutan_062026.shp")
        pyogrio.write_dataframe(d, shp, encoding="UTF-8")
        os.makedirs(os.path.dirname(KWS_KELUAR), exist_ok=True)
        with zipfile.ZipFile(KWS_KELUAR, "w", zipfile.ZIP_DEFLATED) as z:
            for ext in (".shp", ".shx", ".dbf", ".prj", ".cpg"):
                z.write(shp[:-4] + ext, "kwshutan_062026" + ext)
        print(f"{KWS_KELUAR}: {len(d)} poligon", file=sys.stderr)

        p = pyogrio.read_dataframe(pbph)
        assert str(p.crs) == "EPSG:4326" and len(p) > 400, (p.crs, len(p))
        for k in ("TGL_SK", "TGL_SK_TAP"):
            p[k] = p[k].astype(str).str[:10].replace("NaT", "")
        os.makedirs(os.path.dirname(PBPH_KELUAR), exist_ok=True)
        if os.path.exists(PBPH_KELUAR):
            os.remove(PBPH_KELUAR)
        pyogrio.write_dataframe(p.drop(columns=["Shape_Leng", "SHAPE_Length", "SHAPE_Area"], errors="ignore"),
                                PBPH_KELUAR, driver="GeoJSON", COORDINATE_PRECISION=6)
        print(f"{PBPH_KELUAR}: {len(p)} poligon", file=sys.stderr)


if __name__ == "__main__":
    main(*sys.argv[1:3])
