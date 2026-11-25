"""Pelabuhan di zona rob dan gelombang (KI-67, bagian pesisir). Python stdlib saja, tanpa jaringan.

Tabel statis pasangan pelabuhan -> kab/kota -> titik model gelombang, dari berkas yang sudah ada:
  public/banjir/data/cuaca_sarana.json   (pelabuhan OSM, scripts/cuaca/sarana.py)
  public/banjir/data/rob.json            (titik rob dengan kab/kota; pelabuhan dipasang ke titik terdekat <= 25 km)
  public/banjir/data/cuaca_gelombang.json (titik gelombang; dipasang bila koordinatnya sama sampai 2 desimal)
Status harian (rob >= Waspada di kab itu, Hs >= 2,5 m = kelas Tinggi) dihitung di peramban dari rob.json dan
cuaca_gelombang.json yang segar (Pesisir.pelabuhanZona), jadi tidak basi di berkas ini.
Keluaran: public/pesisir/data/pelabuhan_kab.json.   python3 -I scripts/pesisir/pelabuhan.py [uji]
"""
import json
import math
import os
import sys
import time

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
B = os.path.join(AKAR, "public/banjir/data")
KELUAR = os.path.join(AKAR, "public/pesisir/data/pelabuhan_kab.json")
BATAS_KM = 25


def km(a, b, c, d):
    p = math.pi / 180
    h = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def pasang(pelabuhan, rob_titik, gel_titik):
    """pelabuhan = [[nama, lat, lon, kode_prov, jenis]]; keluaran baris [nama, lat, lon, jenis, prov, kab, km_ke_titik_rob, gel_lat|None, gel_lon|None]."""
    gel = {(round(t[0], 2), round(t[1], 2)): t for t in gel_titik}
    out = []
    for nama, lat, lon, _, jenis in pelabuhan:
        d, t = min(((km(lat, lon, t["lat"], t["lon"]), t) for t in rob_titik), key=lambda x: x[0])
        if d > BATAS_KM:
            continue
        g = gel.get((round(lat, 2), round(lon, 2)))
        out.append([nama, lat, lon, jenis, t["prov"], t["kab"], round(d, 1), g[0] if g else None, g[1] if g else None])
    return sorted(out, key=lambda r: (r[4], r[5], r[0]))


def main():
    s = json.load(open(os.path.join(B, "cuaca_sarana.json")))["pelabuhan"]
    rob = json.load(open(os.path.join(B, "rob.json")))["titik"]
    gel = json.load(open(os.path.join(B, "cuaca_gelombang.json")))["titik"]
    baris = pasang(s, rob, gel)
    out = {"dibuat": time.strftime("%Y-%m-%d"), "versi": 1, "batas_km": BATAS_KM,
           "kolom": ["nama", "lat", "lon", "jenis", "prov", "kab", "km_titik_rob", "gel_lat", "gel_lon"],
           "sumber": "Pelabuhan: OpenStreetMap (ODbL) lewat cuaca_sarana.json. Kab/kota: titik rob terdekat dalam 25 km. Titik gelombang: koordinat sama sampai 2 desimal.",
           "pelabuhan": baris}
    with open(KELUAR + ".tmp", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(KELUAR + ".tmp", KELUAR)
    print(f"pelabuhan_kab: {len(baris)} dari {len(s)} pelabuhan dipasang ke kab/kota, {sum(1 for r in baris if r[7] is not None)} punya titik gelombang")


def uji():
    rob = [{"lat": -6.9, "lon": 110.4, "prov": "Jawa Tengah", "kab": "Semarang"}, {"lat": -7.7, "lon": 113.0, "prov": "Jawa Timur", "kab": "Probolinggo"}]
    gel = [[-6.9, 110.4, "33", "Tanjung Emas"]]
    r = pasang([["P1", -6.9, 110.4, "33", "umum"], ["P2", -7.7, 113.1, "35", "perikanan"], ["Jauh", -2.0, 120.0, "73", "umum"]], rob, gel)
    assert [x[0] for x in r] == ["P2", "P1"] or [x[0] for x in r] == ["P1", "P2"]
    p1 = next(x for x in r if x[0] == "P1")
    assert p1[5] == "Semarang" and p1[7] == -6.9 and next(x for x in r if x[0] == "P2")[7] is None
    assert all(x[0] != "Jauh" for x in r), "pelabuhan > 25 km dari titik rob tak dipasang diam-diam"
    assert abs(km(0, 0, 0, 1) - 111.19) < 0.1
    print("pelabuhan uji: lolos")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
