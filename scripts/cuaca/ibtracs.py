#!/usr/bin/env python3
"""Klimatologi siklon tropis NOAA IBTrACS v04r01 untuk kotak 90..145 BT, -15..10 LU/LS sejak 1980 -> public/cuaca/data/ibtracs.json.
Latar sejarah pembanding status siklon resmi BMKG; status BMKG tidak diubah. Streaming CSV basin SI, SP, WP (stdlib), tanpa menyimpan berkas besar.
Pakai: python3 scripts/cuaca/ibtracs.py [uji]   Statis, bulanan (statis.yml).   Pemilik: cuaca-udara."""
import csv, datetime, io, json, math, os, sys, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import AKAR, PROVINSI  # noqa: E402

UA = "Centurisk97-BNPB/1.0 (mailto:terasurbannetwork@gmail.com)"
BASE = "https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/"
BASIN = ("SI", "SP", "WP")
KELUAR = os.path.join(AKAR, "public", "cuaca", "data", "ibtracs.json")
LON, LAT, TAHUN = (90.0, 145.0), (-15.0, 10.0), 1980
KT_KMH = 1.852
BADAI_KT = 34          # ambang badai tropis (WMO); di bawahnya depresi/gangguan, tidak dihitung siklon
RADIUS_KM = 300        # provinsi lebih jauh dari ini dari lintasan tidak dicantumkan
BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


def jarak_km(a1, o1, a2, o2):
    p = math.pi / 180
    h = math.sin((a2 - a1) * p / 2) ** 2 + math.cos(a1 * p) * math.cos(a2 * p) * math.sin((o2 - o1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def angin(r):
    """knot: USA_WIND (JTWC, 1 menit) bila ada, selain itu WMO_WIND; None bila keduanya kosong. Pembanding tak setara, label sumbernya ikut."""
    for k, s in (("USA_WIND", "JTWC"), ("WMO_WIND", "WMO")):
        try:
            v = int(float(r.get(k, "")))
            if v > 0:
                return v, s
        except ValueError:
            pass
    return None, None


def baca_baris(fh, kotak=True):
    """Hasilkan titik lintasan utama di dalam kotak sejak TAHUN: dict(sid, nama, waktu, lat, lon, kt, sumber)."""
    rd = csv.DictReader(fh)
    next(rd)   # baris satuan
    for r in rd:
        if r["TRACK_TYPE"] not in ("main", ""):
            continue
        try:
            lat, lon, th = float(r["LAT"]), float(r["LON"]), int(r["ISO_TIME"][:4])
        except ValueError:
            continue
        if th < TAHUN or not (LAT[0] <= lat <= LAT[1] and LON[0] <= lon <= LON[1]):
            continue
        kt, sb = angin(r)
        yield {"sid": r["SID"], "nama": r["NAME"].strip(), "waktu": r["ISO_TIME"], "lat": lat, "lon": lon, "kt": kt, "sumber": sb}


def simpul_provinsi():
    """{kode: [(lat,lon)]} simpul batas luar, disaring ke kisi 0,1 derajat supaya ringan."""
    out = {}
    for kode in PROVINSI:
        s = set()
        for f in json.load(open(os.path.join(AKAR, "public", "geo", "kecamatan", f"{kode}.json")))["features"]:
            g = f["geometry"]
            for poli in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]):
                for x, y in poli[0]:
                    s.add((round(y, 1), round(x, 1)))
        out[kode] = list(s)
    return out


def indeks(simpul):
    ix = {}
    for kode, vs in simpul.items():
        for la, lo in vs:
            ix.setdefault((math.floor(la), math.floor(lo)), []).append((kode, la, lo))
    return ix


def terdekat(ix, lat, lon):
    """{kode: jarak_km} provinsi dalam RADIUS_KM dari satu titik (sel 1 derajat, +-4 sel ~ 440 km)."""
    a, o, d = math.floor(lat), math.floor(lon), {}
    for i in range(-4, 5):
        for j in range(-4, 5):
            for kode, la, lo in ix.get((a + i, o + j), ()):
                k = jarak_km(lat, lon, la, lo)
                if k <= RADIUS_KM and k < d.get(kode, 1e9):
                    d[kode] = k
    return d


def olah(titik, ix):
    """titik: iterator dari baca_baris (boleh gabungan basin). Mengembalikan struktur keluaran tanpa metadata."""
    sk = {}
    for t in titik:
        c = sk.setdefault(t["sid"], {"id": t["sid"], "nama": t["nama"], "awal": t["waktu"], "akhir": t["waktu"], "kt": 0, "sumber": None, "prov": {}})
        c["awal"], c["akhir"] = min(c["awal"], t["waktu"]), max(c["akhir"], t["waktu"])
        if t["kt"] and t["kt"] > c["kt"]:
            c["kt"], c["sumber"] = t["kt"], t["sumber"]
        if t["waktu"][11:13] in ("00", "06", "12", "18"):   # 6-jaman cukup untuk jarak
            for kode, k in terdekat(ix, t["lat"], t["lon"]).items():
                if k < c["prov"].get(kode, 1e9):
                    c["prov"][kode] = k
    daftar = []
    for c in sk.values():
        if c["kt"] < BADAI_KT:
            continue
        daftar.append({"id": c["id"], "nama": c["nama"] if c["nama"] != "NOT_NAMED" else "", "awal": c["awal"][:10], "akhir": c["akhir"][:10],
                       "angin_kt": c["kt"], "angin_kmj": round(c["kt"] * KT_KMH), "sumber_angin": c["sumber"],
                       "prov": {k: round(v) for k, v in sorted(c["prov"].items(), key=lambda x: x[1])}})
    daftar.sort(key=lambda c: c["awal"])
    bln = [0] * 12
    for c in daftar:
        bln[int(c["awal"][5:7]) - 1] += 1
    per_prov = {}
    for c in daftar:
        for k, v in c["prov"].items():
            p = per_prov.setdefault(k, {"nama": PROVINSI[k], "n": 0, "terdekat_km": 1e9, "siklon_terdekat": ""})
            p["n"] += 1
            if v < p["terdekat_km"]:
                p["terdekat_km"], p["siklon_terdekat"] = v, f'{c["nama"] or c["id"]} ({c["awal"][:4]})'
    return {"n": len(daftar), "siklon": daftar, "per_bulan": dict(zip(BULAN, bln)),
            "per_provinsi": dict(sorted(per_prov.items(), key=lambda x: x[1]["terdekat_km"]))}


def bangun():
    ix = indeks(simpul_provinsi())
    semua = []
    for b in BASIN:
        req = urllib.request.Request(f"{BASE}ibtracs.{b}.list.v04r01.csv", headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=300) as r:
            semua += list(baca_baris(io.TextIOWrapper(r, encoding="utf-8", newline="")))
    o = olah(semua, ix)
    if o["n"] < 50:
        raise RuntimeError(f"hanya {o['n']} siklon, tarikan dicurigai rusak; berkas lama tidak ditimpa")
    return {"sumber": "NOAA NCEI IBTrACS v04r01 (basin SI, SP, WP)", "diambil": str(datetime.date.today()),
            "kotak": {"bt": list(LON), "lintang": list(LAT)}, "sejak": TAHUN, "ambang_kt": BADAI_KT, "radius_km": RADIUS_KM,
            "catatan": "Klimatologi latar sejarah. Bukan status siklon resmi: status resmi BMKG (TCWC Jakarta) tampil apa adanya di layar cuaca. "
                       "Angin puncak = maksimum di dalam kotak; JTWC (1 menit) dan WMO (10 menit) tidak setara, lihat sumber_angin. "
                       "prov = jarak terdekat (km) lintasan 6-jaman ke simpul batas provinsi, hanya yang <= radius_km; jarak ke batas kasar, bukan garis pantai.",
            "atribusi": "Knapp, K. R., et al., 2010: IBTrACS, Bull. Amer. Meteor. Soc., 91, 363-376, doi:10.1175/2009BAMS2755.1; "
                        "Gahtan, J., et al., 2024: IBTrACS Version 4r01, NOAA National Centers for Environmental Information, doi:10.25921/82ty-9e16",
            "lisensi": "Tanpa batasan pakai selain sitasi; NOAA/NCEI tidak menjamin akurasi dan pengguna menanggung hasil pemakaian (metadata NCEI gov.noaa.ncdc:C00834).",
            **o}


def uji():
    assert abs(jarak_km(0, 100, 0, 101) - 111.2) < 1
    ix = indeks({"11": [(5.0, 95.0)], "12": [(5.0, 100.0)]})
    assert terdekat(ix, 5.0, 96.0).keys() == {"11"} and not terdekat(ix, -10, 120)
    cols = "SID,SEASON,NUMBER,BASIN,SUBBASIN,NAME,ISO_TIME,NATURE,LAT,LON,WMO_WIND,TRACK_TYPE,USA_WIND".split(",")
    def b(*x): return ",".join(map(str, x))
    csvt = "\n".join([",".join(cols), " ,Year,,,,,,,degrees_north,degrees_east,kts,,kts",
                      b("A1", 1990, 1, "SI", "MM", "SEROJA", "1990-02-01 06:00:00", "TS", 5.0, 96.0, 40, "main", 55),
                      b("A1", 1990, 1, "SI", "MM", "SEROJA", "1990-02-01 12:00:00", "TS", 5.0, 97.0, " ", "main", " "),
                      b("A1", 1990, 1, "SI", "MM", "SEROJA", "1990-02-01 18:00:00", "TS", 5.0, 150.0, 90, "main", 90),     # luar kotak
                      b("A1", 1990, 1, "SI", "MM", "SEROJA", "1990-02-02 00:00:00", "TS", 5.0, 97.5, 90, "spur", 90),      # bukan lintasan utama
                      b("B2", 1979, 1, "SI", "MM", "LAMA", "1979-02-01 06:00:00", "TS", 5.0, 96.0, 60, "main", 60),        # sebelum 1980
                      b("C3", 2001, 1, "WP", "MM", "NOT_NAMED", "2001-07-01 06:00:00", "DS", 5.0, 96.0, 25, "main", 25)])  # depresi
    o = olah(baca_baris(io.StringIO(csvt)), ix)
    assert o["n"] == 1, o
    c = o["siklon"][0]
    assert c["nama"] == "SEROJA" and c["angin_kt"] == 55 and c["sumber_angin"] == "JTWC" and c["awal"] == "1990-02-01", c
    assert c["prov"] == {"11": 111}, c
    assert o["per_bulan"]["Feb"] == 1 and sum(o["per_bulan"].values()) == 1
    print("ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji(); sys.exit()
    out = bangun()
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    tmp = KELUAR + ".tmp"
    with open(tmp, "w") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, KELUAR)
    print(out["n"], "siklon", os.path.getsize(KELUAR), "byte")
