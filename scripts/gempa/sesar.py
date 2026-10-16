"""Sesar aktif Indonesia -> public/gempa/data/sesar.geojson. Python 3.12 stdlib saja.

Sumber yang dipakai: GEM Global Active Faults Database (Styron & Pagani 2020), CC BY-SA 4.0, bagian Indonesia dari
katalog Earth Observatory of Singapore (EOS_SE_Asia). Katalog Bird 2003 di dalamnya dibuang: sama dengan batas_lempeng.geojson.

Pemilik menyetujui Sesar PuSGeN 2017 (Peta Sumber dan Bahaya Gempa Indonesia 2017). Berkas PuSGeN 2017 sendiri tidak
ada di sumber terbuka berlisensi yang bisa diambil skrip (yang ditemukan hanya salinan 2024 tanpa lisensi); karena itu
GEM dipakai sebagai pengganti dan atribusinya jujur menyebut GEM/EOS, bukan PuSGeN. Ganti SUMBER bila salinan PuSGeN
berlisensi muncul. CC BY-SA: turunan ini (sesar.geojson) ikut CC BY-SA 4.0.

  python3 scripts/gempa/sesar.py        unduh dan tulis
  python3 scripts/gempa/sesar.py uji    self-check
"""
import datetime as dt
import json
import os
import sys

from umum import AKAR, BBOX, KELUAR, ambil, simpan

SUMBER = "https://raw.githubusercontent.com/GEMScienceTools/gem-global-active-faults/master/geojson/gem_active_faults_harmonized.geojson"
ATRIBUSI = ("Sesar aktif: GEM Global Active Faults Database (Styron, R. & Pagani, M. 2020, Earthquake Spectra 36(S1), "
            "doi:10.1177/8755293020944182), katalog Earth Observatory of Singapore untuk Asia Tenggara; lisensi CC BY-SA 4.0.")
PLAFON = 150_000
JENIS = {"Subduction_Thrust": "subduksi", "Dextral": "geser kanan", "Sinistral": "geser kiri", "Dextral_Transform": "geser kanan",
         "Sinistral_Transform": "geser kiri", "Reverse": "naik", "Normal": "turun", "Spreading_Ridge": "pemekaran"}


def sesar(fc):
    keluar = []
    for f in fc["features"]:
        p, g = f["properties"], f["geometry"]
        if p.get("catalog_name") != "EOS_SE_Asia" or g["type"] != "LineString":
            continue
        t = []
        for c in g["coordinates"]:  # tiga desimal ~100 m
            c = [round(c[0], 3), round(c[1], 3)]
            if not t or c != t[-1]:
                t.append(c)
        if len(t) < 2 or not all(BBOX[2] <= x <= BBOX[3] and BBOX[0] <= y <= BBOX[1] for x, y in t):
            continue  # ponytail: seluruh garis harus di kotak Indonesia; sesar lintas batas dibuang, bukan dipotong
        keluar.append({"type": "Feature", "geometry": {"type": "LineString", "coordinates": t},
                       "properties": {"nama": p.get("name") or None, "jenis": JENIS.get(p.get("slip_type"), "lain")}})
    return {"type": "FeatureCollection", "atribusi": ATRIBUSI, "sumber": SUMBER,
            "dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "features": keluar}


def main():
    fc = sesar(ambil(SUMBER, batas_waktu=300))
    assert fc["features"], "tidak ada sesar Indonesia di sumber"
    simpan(os.path.join(KELUAR, "sesar.geojson"), fc)
    print(len(fc["features"]), "sesar")


def uji():
    fc = sesar({"features": [
        {"geometry": {"type": "LineString", "coordinates": [[100.12345, 0], [100.12349, 0], [101, 1]]}, "properties": {"catalog_name": "EOS_SE_Asia", "slip_type": "Dextral", "name": "Contoh"}},
        {"geometry": {"type": "LineString", "coordinates": [[100, 0], [101, 1]]}, "properties": {"catalog_name": "Bird 2003", "slip_type": "Dextral"}},
        {"geometry": {"type": "LineString", "coordinates": [[-100, 0], [101, 1]]}, "properties": {"catalog_name": "EOS_SE_Asia", "slip_type": "Reverse"}}]})
    assert len(fc["features"]) == 1, fc  # Bird dibuang (duplikat lempeng), lintas batas dibuang
    f = fc["features"][0]
    assert f["geometry"]["coordinates"] == [[100.123, 0], [101, 1]] and f["properties"]["jenis"] == "geser kanan", f
    j = os.path.join(KELUAR, "sesar.geojson")
    if os.path.exists(j):
        assert os.path.getsize(j) <= PLAFON, os.path.getsize(j)
        d = json.load(open(j))
        assert d["type"] == "FeatureCollection" and d["features"] and "CC BY-SA" in d["atribusi"]
        for f in d["features"]:
            assert f["geometry"]["type"] == "LineString" and len(f["geometry"]["coordinates"]) >= 2
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
