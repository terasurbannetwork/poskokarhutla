"""Kab/kota tertutup asap CAMS (PKH-38) -> public/udara/data/asap_kab.json

Masukan : public/data/asap.json (CAMS via Open-Meteo, sel 1 derajat, 4 hari, kolom pm25_rata = rata 24 jam),
          public/geo/kabupaten/<prov>.json (batas kab), data/asean/negara.geojson (BRN, MYS, SGP, TLS, PNG), scripts/udara/kota.json (kode).
Aturan  : persen wilayah kab = porsi titik contoh (jarak 0,05 derajat di dalam poligon) yang selnya pm25_rata > AMBANG.
          Sel tanpa nilai tidak masuk penyebut; bila titik bernilai < 50% dari semua titik kab, persen = null (kosong, bukan 0).
          Tertutup = persen >= 50. Kelas: 50-70, 70-90, >90 (RISET.md PKH-38).
AMBANG  : 55,4 ug/m3 = batas atas Sedang P.14/2020 (alat.BATAS[0]), sama dengan dampak_udara.py. Itu batas KESEHATAN, bukan definisi baku
          "tertutup asap": memakainya untuk liputan wilayah adalah pilihan kami -> HIPOTESIS, belum diuji terhadap citra satelit.
Jenis   : tgl < tanggal jalan asap.json = analisis; sisanya prakiraan (hari ini ikut prakiraan karena jam akan datang masih prakiraan).
Negara  : persen dihitung hanya pada bagian negara yang masuk grid CAMS (lat -11..6, lon 94..141); `cakupan` = porsi titik negara di dalam grid.
Tren    : berkas keluaran lama dibaca dan digabung per tanggal (hari analisis tak ditimpa prakiraan; prakiraan diganti jalan terbaru), 120 hari.
Cache   : bobot sel per kab statis -> scripts/udara/kab_sel.json (dibangun otomatis bila tak ada; hapus untuk bangun ulang).
Pakai   : python3 scripts/udara/asap_kab.py [uji]
"""
import glob
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat

AMBANG = alat.BATAS[0]
LANGKAH = 0.05
SIMPAN_HARI = 120
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kab_sel.json")
KAWASAN = {"Sumatera": "11 12 13 14 15 16 17 18 19 21", "Jawa": "31 32 33 34 35 36", "Bali dan Nusa Tenggara": "51 52 53",
           "Kalimantan": "61 62 63 64 65", "Sulawesi": "71 72 73 74 75 76", "Maluku": "81 82", "Papua": "91 92 93 94 95 96"}
PROV_KAWASAN = {p: k for k, v in KAWASAN.items() for p in v.split()}
NEGARA = ("BRN", "MYS", "SGP", "TLS", "PNG")


def sel(lat, lon):
    return f"{math.floor(lat) + .5},{math.floor(lon) + .5}"


def dalam_cincin(x, y, c):
    r = False
    j = len(c) - 1
    for i in range(len(c)):
        if (c[i][1] > y) != (c[j][1] > y) and x < (c[j][0] - c[i][0]) * (y - c[i][1]) / (c[j][1] - c[i][1]) + c[i][0]:
            r = not r
        j = i
    return r


def poligon(geom):
    return geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]


def bobot(geom):
    """geometri -> {sel: jumlah titik contoh}. Titik contoh di dalam poligon (cincin luar, bukan lubang)."""
    polis = poligon(geom)
    xs = [p[0] for pl in polis for p in pl[0]]
    ys = [p[1] for pl in polis for p in pl[0]]
    out = {}
    y = math.ceil(min(ys) / LANGKAH) * LANGKAH
    while y <= max(ys):
        x = math.ceil(min(xs) / LANGKAH) * LANGKAH
        while x <= max(xs):
            if any(dalam_cincin(x, y, pl[0]) and not any(dalam_cincin(x, y, h) for h in pl[1:]) for pl in polis):
                k = sel(y, x)
                out[k] = out.get(k, 0) + 1
            x += LANGKAH
        y += LANGKAH
    return out


def bangun_cache():
    k = alat.muat(os.path.join(os.path.dirname(CACHE), "kota.json"))
    idx = {(r[2], r[6]): r for r in k["baris"]}
    kab, tanpa = {}, []
    for f in sorted(glob.glob(os.path.join(alat.AKAR, "public/geo/kabupaten/*.json"))):
        p = os.path.basename(f)[:-5]
        for ft in alat.muat(f)["features"]:
            r = idx.get((p, ft["properties"]["kab"]))
            if not r:
                tanpa.append((p, ft["properties"]["kab"]))
                continue
            b = bobot(ft["geometry"]) or {sel(r[3], r[4]): 1}   # kab sangat kecil: pakai titik pusatnya
            kab[r[0]] = b
    neg = {f["properties"]["iso3"]: bobot(f["geometry"]) for f in alat.muat(os.path.join(alat.AKAR, "data/asean/negara.geojson"))["features"]
           if f["properties"]["iso3"] in NEGARA}
    d = {"langkah_derajat": LANGKAH, "kab": kab, "negara": neg, "tanpa_kode": tanpa}
    alat.simpan(CACHE, d)
    return d


def persen(b, nilai):
    """b {sel: n titik}, nilai {sel: pm | None} -> (persen di atas ambang | None, porsi titik bernilai)."""
    tot = sum(b.values())
    ada = sum(n for s, n in b.items() if nilai.get(s) is not None)
    if not tot or ada * 2 < tot:
        return None, round(ada / tot, 2) if tot else 0
    return round(100 * sum(n for s, n in b.items() if nilai.get(s) is not None and nilai[s] > AMBANG) / ada), round(ada / tot, 2)


def kelas(p):
    return None if p is None or p < 50 else 0 if p < 70 else 1 if p <= 90 else 2


def hitung(asap, cache):
    k = asap["kolom"]
    i = k.index("pm25_rata")
    hari = asap["hari"]
    nilai = [{sel(r[0], r[1]): r[i][t] for r in asap["grid"]} for t in range(len(hari))]
    kab, kaw, neg = {}, {}, {}
    for kode, b in cache["kab"].items():
        kab[kode] = [persen(b, n)[0] for n in nilai]
    for t in range(len(hari)):
        for kode, p in ((c, v[t]) for c, v in kab.items()):
            w = kaw.setdefault(PROV_KAWASAN.get(kode[:2], "Lainnya"), {"n_kab": 0, "tgl": [[0, 0, 0, 0] for _ in hari]})
            if t == 0:
                w["n_kab"] += 1
            if p is not None:
                w["tgl"][t][3] += 1                      # kab bernilai (penyebut yang sah)
                c = kelas(p)
                if c is not None:
                    w["tgl"][t][c] += 1
    for iso, b in cache["negara"].items():
        neg[iso] = {"cakupan": persen(b, nilai[0])[1], "persen": [persen(b, n)[0] for n in nilai]}
    return {"hari": hari, "kab": kab, "kawasan": kaw, "negara": neg}


def gabung(lama, hari, jenis, kaw, neg):
    """Gabung tren per tanggal: tgl analisis lama tak ditimpa prakiraan; selain itu jalan terbaru menang."""
    tren = {t["tgl"]: t for t in (lama or [])}
    for i, tgl in enumerate(hari):
        if tren.get(tgl, {}).get("jenis") == "analisis" and jenis[i] == "prakiraan":
            continue
        tren[tgl] = {"tgl": tgl, "jenis": jenis[i],
                     "kawasan": {n: w["tgl"][i] for n, w in kaw.items()},   # [50-70, 70-90, >90, kab bernilai]
                     "negara": {c: v["persen"][i] for c, v in neg.items()}}
    return [tren[t] for t in sorted(tren)][-SIMPAN_HARI:]


def main():
    asap = alat.data("asap.json", None)
    cache = alat.muat(CACHE, {}) or bangun_cache()
    h = hitung(asap, cache)
    run = asap["dibuat"][:10]
    jenis = ["analisis" if t < run else "prakiraan" for t in h["hari"]]
    lama = alat.muat(os.path.join(alat.OUT, "asap_kab.json"), {}).get("tren")
    d = {"v": 1, "dibuat": asap["dibuat"], "sumber": "CAMS (Copernicus) via Open-Meteo, sel 1 derajat; hitungan Centurisk97",
         "ambang_ug": AMBANG, "ambang_status": "HIPOTESIS: batas Sedang P.14/2020 dipakai sebagai batas tertutup; belum diuji terhadap citra",
         "kelas": ["50-70", "70-90", ">90"], "kolom_tren": ["50-70", "70-90", ">90", "kab_bernilai"],
         "hari": [{"tgl": t, "jenis": j} for t, j in zip(h["hari"], jenis)], "kab": h["kab"],
         "kawasan": {n: w["n_kab"] for n, w in h["kawasan"].items()},
         "negara": h["negara"], "tren": gabung(lama, h["hari"], jenis, h["kawasan"], h["negara"])}
    alat.log(f"asap_kab.json: {alat.simpan('asap_kab.json', d) // 1024} KB, {len(d['kab'])} kab, {len(d['tren'])} hari tren")


def uji():
    sq = {"type": "Polygon", "coordinates": [[[0.0, 0.0], [2.0, 0.0], [2.0, 1.0], [0.0, 1.0], [0.0, 0.0]]]}   # 2 sel lebar: sel 0,5 dan 1,5
    b = bobot(sq)
    assert set(b) <= {"0.5,0.5", "0.5,1.5"} and abs(b["0.5,0.5"] - b["0.5,1.5"]) <= 1, b
    assert persen(b, {"0.5,0.5": 60.0, "0.5,1.5": 10.0})[0] in (49, 50, 51)
    assert persen(b, {"0.5,0.5": 60.0, "0.5,1.5": 70.0})[0] == 100
    c = {"a": 6, "b": 4}
    assert persen(c, {"a": 60.0})[0] == 100 and persen(c, {"b": 60.0})[0] is None and persen(c, {})[0] is None   # penyebut hanya sel bernilai; <50% titik bernilai = None
    assert persen({"0.5,0.5": 10}, {"0.5,0.5": 55.4})[0] == 0 and persen({"0.5,0.5": 10}, {"0.5,0.5": 55.5})[0] == 100   # batas tegas >
    assert [kelas(x) for x in (None, 49, 50, 69, 70, 90, 91)] == [None, None, 0, 0, 1, 1, 2]
    # sel dekat lubang: lubang tidak dihitung
    lubang = {"type": "Polygon", "coordinates": sq["coordinates"] + [[[0.5, 0.2], [1.5, 0.2], [1.5, 0.8], [0.5, 0.8], [0.5, 0.2]]]}
    assert sum(bobot(lubang).values()) < sum(b.values())
    kaw = {"Sumatera": {"n_kab": 2, "tgl": [[1, 0, 0, 2], [0, 1, 0, 2]]}}
    neg = {"MYS": {"persen": [10, None]}}
    t = gabung([{"tgl": "d1", "jenis": "analisis", "kawasan": "LAMA", "negara": {}}], ["d1", "d2"], ["prakiraan", "prakiraan"], kaw, neg)
    assert t[0]["kawasan"] == "LAMA" and t[1]["kawasan"]["Sumatera"] == [0, 1, 0, 2] and t[1]["negara"]["MYS"] is None
    print("asap_kab uji: lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
