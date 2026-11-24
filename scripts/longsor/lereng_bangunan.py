"""Paket lereng-bangunan (data/kajian-bnpb/lereng-bangunan/): LT-03 batas dan desa, LT-06 GLO-30, LT-07 Overture.
Mentah di data/raw/lereng/ (gitignored). DuckDB ada di venv lokal data/raw/lereng/venv (bukan paket global).
TIDAK ada agregat bangunan-di-lereng per desa/kecamatan di berkas ini (itu LT-09, sesudah daftar desa longsor di-commit
LT-12; ALGORITMA 8): hanya jumlah bangunan TOTAL per kab/kota.

Pakai:  python3 scripts/longsor/lereng_bangunan.py batas       # LT-03 -> data/raw/lereng/batas.json
        python3 scripts/longsor/lereng_bangunan.py glo30       # LT-06 cakupan GLO-30 per kab (butuh ubin di data/raw/lereng/dem/)
        data/raw/lereng/venv/bin/python scripts/longsor/lereng_bangunan.py ekstrak   # LT-07 unduh Overture bbox -> parquet lokal
        data/raw/lereng/venv/bin/python scripts/longsor/lereng_bangunan.py hitung    # LT-07 jumlah total per kab + porsi sumber
        python3 scripts/longsor/lereng_bangunan.py uji"""
import collections, glob, json, math, os, sys, time

AWAL = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AWAL)
import dasar  # noqa: E402
import lereng_dem as LD  # noqa: E402

AKAR = dasar.AKAR
RAW = os.path.join(AKAR, "data/raw/lereng")
KAB = {"32|Bandung Barat": "32.17", "32|Bandung": "32.04", "32|Kota Bandung": "32.73", "32|Kota Cimahi": "32.77"}  # Bandung Raya
OVERTURE = "s3://overturemaps-us-west-2/release/2026-10-21.0/theme=buildings/type=building/*"  # sumber.json overture-buildings
PARQUET = os.path.join(RAW, "overture/bandung_raya.parquet")


def fitur(tingkat, kode="32"):  # tingkat desa: kode = kode kab ("32.04")
    return json.load(open(os.path.join(AKAR, "public/geo", tingkat, f"{kode}.json")))["features"]


def poligon_kab():
    """-> [{id:'32.04', nama, cincin}] untuk empat kab/kota Bandung Raya (dari public/geo/kabupaten/32.json)."""
    keluar = []
    for f in fitur("kabupaten"):
        p = f["properties"]
        k = f"32|{p['kab']}"
        if k in KAB:
            keluar.append({"id": KAB[k], "kab": p["kab"], "cincin": dasar.cincin(f["geometry"])})
    assert len(keluar) == 4, [x["kab"] for x in keluar]
    return keluar


def bbox_raya():
    xs, ys = [], []
    for k in poligon_kab():
        for r in k["cincin"]:
            xs += [c[0] for c in r]
            ys += [c[1] for c in r]
    return min(xs), min(ys), max(xs), max(ys)


def pusat_desa(f):
    besar = max(dasar.cincin(f["geometry"]), key=lambda r: abs(sum(r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1] for i in range(len(r) - 1))))
    x, y = dasar.pusat(besar)
    if not dasar.di_dalam(x, y, besar):
        x, y = min(besar, key=lambda p: (p[0] - x) ** 2 + (p[1] - y) ** 2)
    return x, y


def batas():
    """LT-03: desa per kecamatan BIG modul longsor (titik pusat desa dalam poligon kecamatan), status grid Open Buildings."""
    kecs = [k for k in dasar.daftar_kec() if f"{k['prov']}|{k['kab']}" in KAB and k["prov"] == "32"]
    cari = dasar.Cari(kecs)
    tally = collections.Counter()
    luar, per_kab, kd8 = 0, collections.Counter(), collections.defaultdict(set)
    for kode in sorted(set(KAB.values())):
        for f in fitur("desa", kode):
            kd = f["properties"]["kd"]
            per_kab[kode] += 1
            kd8[kode].add(kd[:8])
            n = cari.cari(*pusat_desa(f))
            if n is None:
                luar += 1
            else:
                tally[kecs[n]["id"]] += 1
    ada = set(json.load(open(os.path.join(AKAR, "data/terkunci/bangunan/kec.json")))["ringkasan"]["provinsi"])
    hasil = {"desa_per_kab": per_kab, "kec_kd8_per_kab": {k: len(v) for k, v in kd8.items()},
             "kec_big_per_kab": collections.Counter(k["kab"] for k in kecs), "desa_per_kec_big": dict(sorted(tally.items())),
             "desa_tanpa_kec_big": luar, "kec_big_tanpa_desa": [k["id"] for k in kecs if k["id"] not in tally],
             "grid_open_buildings_provinsi": sorted(ada), "grid_32_ada": "32" in ada,
             "asal_desa": "public/geo/desa/<kab>.json dari scripts/scrape/desa_cari.py (cahyadsn/wilayah_boundaries, MIT, Kepmendagri 300.2.2-2430/2025; batas disederhanakan, bukan SK batas desa); properti hanya kd, nama di public/data/desa_cari.json"}
    os.makedirs(RAW, exist_ok=True)
    json.dump(hasil, open(os.path.join(RAW, "batas.json"), "w"), indent=1, ensure_ascii=False)
    return hasil


def glo30(langkah=0.003):
    """LT-06: cakupan GLO-30 per kab = titik sampel (grid `langkah` derajat) di dalam kab yang punya tinggi bukan NaN."""
    ubin = {}
    for f in glob.glob(os.path.join(RAW, "dem/Copernicus_DSM_COG_10_*_DEM.tif")):
        t, x0, y0, dx, dy = LD.buka(f)
        ubin[(round(x0), round(y0))] = (t, x0, y0, dx, dy, {})

    def tinggi(lon, lat):
        u = ubin.get((math.floor(lon), math.ceil(lat)))
        if not u:
            return None
        t, x0, y0, dx, dy, cache = u
        c, r = int((lon - x0) / dx), int((y0 - lat) / dy)
        kk = (c // t.tl, r // t.tt)
        if kk not in cache:
            cache[kk] = t.ubin(*kk)
        v = cache[kk][(r % t.tt) * t.tl + c % t.tl]
        return None if v != v or v == t.nodata else v

    keluar = {}
    for k in poligon_kab():
        xs = [c[0] for r in k["cincin"] for c in r]
        ys = [c[1] for r in k["cincin"] for c in r]
        n = ada = 0
        x = min(xs)
        while x <= max(xs):
            y = min(ys)
            while y <= max(ys):
                if any(dasar.di_dalam(x, y, r) for r in k["cincin"]):
                    n += 1
                    ada += tinggi(x, y) is not None
                y += langkah
            x += langkah
        keluar[k["id"]] = {"kab": k["kab"], "titik": n, "bertinggi": ada, "cakupan": round(ada / n, 4) if n else None}
    return keluar


def ekstrak():
    import duckdb
    x0, y0, x1, y1 = bbox_raya()
    os.makedirs(os.path.dirname(PARQUET), exist_ok=True)
    c = duckdb.connect()
    c.execute("install httpfs; load httpfs; set s3_region='us-west-2'")
    t = time.time()
    c.execute(f"""copy (select id, bbox, geometry, sources, height, num_floors from read_parquet('{OVERTURE}', hive_partitioning=1)
        where bbox.xmin >= {x0} and bbox.xmax <= {x1} and bbox.ymin >= {y0} and bbox.ymax <= {y1})
        to '{PARQUET}' (format parquet, compression zstd)""")
    return {"detik": round(time.time() - t), "bytes": os.path.getsize(PARQUET)}


def hitung():
    """LT-07: jumlah bangunan TOTAL per kab (titik tengah bbox dalam poligon kab) dan porsi sumber pertama. Tanpa lereng."""
    import duckdb
    kabs = poligon_kab()
    cari = dasar.Cari([{"cincin": k["cincin"]} for k in kabs])
    c = duckdb.connect()
    baris = c.execute(f"select (bbox.xmin+bbox.xmax)/2, (bbox.ymin+bbox.ymax)/2, sources[1].dataset from read_parquet('{PARQUET}')").fetchall()
    jml, sumber = collections.Counter(), collections.defaultdict(collections.Counter)
    for x, y, s in baris:
        n = cari.cari(x, y)
        if n is not None:
            jml[kabs[n]["id"]] += 1
            sumber[kabs[n]["id"]][s] += 1
    return {"baris_bbox": len(baris), "per_kab": {k["id"]: {"kab": k["kab"], "bangunan": jml[k["id"]] if sumber[k["id"]] else None, "sumber_pertama": dict(sumber[k["id"]])} for k in kabs},
            "total_empat_kab": sum(jml.values())}


def uji():
    # kab Bandung Raya semuanya ada di batas BIG dan bbox masuk akal
    x0, y0, x1, y1 = bbox_raya()
    assert 107 < x0 < x1 < 108.2 and -7.4 < y0 < y1 < -6.6, (x0, y0, x1, y1)
    # tiap desa Bandung Raya punya kd yang diawali kode kab-nya
    for kode in KAB.values():
        assert all(f["properties"]["kd"].startswith(kode + ".") for f in json.load(open(os.path.join(AKAR, f"public/geo/desa/{kode}.json")))["features"])
    print("ok")


if __name__ == "__main__":
    m = sys.argv[1] if len(sys.argv) > 1 else ""
    if m in ("batas", "glo30", "ekstrak", "hitung"):
        print(json.dumps(globals()[m](), indent=1, ensure_ascii=False))
    elif m == "uji":
        uji()
    else:
        print(__doc__)
