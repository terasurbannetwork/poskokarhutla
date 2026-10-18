"""Citra Sentinel-2 SWIR (20 m) untuk laporan konsesi terbakar: tiap perusahaan teratas, 4 hari dengan titik terbanyak.

Pakai:  python3 scripts/data/konsesi_citra.py            # -> public/data/konsesi2026/citra/*.png + citra.json
        KONSESI_PROV=16,15 KONSESI_TOP=20 python3 scripts/data/konsesi_citra.py

Untuk tiap tanggal dicari adegan Sentinel-2 L2A dari tanggal itu s.d. +8 hari; dipilih yang paling dekat ke hari titik
(api aktif masih tampak) dengan awan sedikit (skor = hari geser x 8 + % awan). Kanal SWIR B12/B8A/B04 seperti EO Browser: api merah-jingga,
bekas bakar cokelat-merah gelap, vegetasi hijau, asap tipis tembus. Mesin baca COG dari scripts/data/citra.py.
Konsesi > 40 km dipotong 40 km berpusat di titik hari itu. Lisensi: "Contains modified Copernicus Sentinel data 2026".
"""
import datetime as dt, json, math, os, sys
from concurrent.futures import ThreadPoolExecutor
from array import array

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import citra as C  # noqa: E402

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
DIR = os.path.join(AKAR, "public/data/konsesi2026")
KELUAR = os.path.join(DIR, "citra")
PROV = os.environ.get("KONSESI_PROV", "14,15,16,61,62,63,64,93,53").split(",")
TOP = int(os.environ.get("KONSESI_TOP", 20))
PX = 500
MAKS_KM = 40
SEBELUM = 5  # hari sebelum tanggal titik juga dicari (citra kosong = VIIRS kasar, lebih buruk)
SESUDAH = 8  # hari; adegan terdekat dengan hari titik diutamakan (api aktif), bukan yang paling bersih


def jendela(item, aset, lat, lon, km):
    epsg = item["properties"].get("proj:epsg") or int(str(item["properties"].get("proj:code", "0")).split(":")[-1])
    E, N = C.ke_utm(lat, lon, epsg % 100)
    tr = item["assets"][aset]["proj:transform"]
    return tr[2], tr[5], tr[0], E - km * 500, N + km * 500


def awan(item, lat, lon, km):
    c = C.COG(item["assets"]["scl"]["href"])
    x0, y0, r0, kiri, atas = jendela(item, "scl", lat, lon, km)
    v = c.contoh(0, x0, y0, r0, kiri, atas, km * 1000, 80)[0]
    kosong = sum(1 for x in v if x == 0)
    sah = len(v) - kosong
    return (round(100 * sum(1 for x in v if x in (3, 8, 9, 10)) / sah) if sah else 100), round(100 * kosong / len(v))


def swir(item, lat, lon, km, berkas):
    A = item["assets"]

    def kanal(k):
        c = C.COG(A[k]["href"])
        x0, y0, r0, kiri, atas = jendela(item, k, lat, lon, km)
        rb = (A[k].get("raster:bands") or [{}])[0]
        sk, of = rb.get("scale", 1e-4), rb.get("offset", 0)
        res = max(20, km * 1000 / PX)
        v = c.contoh(C.level_untuk(c, r0, res), x0, y0, r0, kiri, atas, km * 1000, PX)[0]
        return array("B", (0 if d == 0 else max(0, min(255, int((d * sk + of) * 2.5 * 255))) for d in v))
    with ThreadPoolExecutor(3) as ex:
        sw = list(ex.map(kanal, ("swir22", "nir08", "red")))
    open(berkas, "wb").write(C.png(sw, PX, 260_000))


def satu(r, d, n):
    pts = [p for p in r["pt"] if "2026-" + p[2][:5] == d] or r["pt"]
    xs = [c[0] for g in r["geom"] for poly in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]) for c in poly[0]]
    ys = [c[1] for g in r["geom"] for poly in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]) for c in poly[0]]
    lat0 = (min(ys) + max(ys)) / 2
    km = max((max(xs) - min(xs)) * 111.32 * math.cos(math.radians(lat0)), (max(ys) - min(ys)) * 110.574) * 1.1 + 2
    if km > MAKS_KM:  # konsesi besar: kotak 40 km di sekitar titik hari itu
        km = MAKS_KM
        lat = sum(p[0] for p in pts) / len(pts)
        lon = sum(p[1] for p in pts) / len(pts)
    else:
        lat, lon = lat0, (min(xs) + max(xs)) / 2
    km = max(km, 6)
    bb = C.kotak(lat, lon, km)
    d0 = dt.date.fromisoformat(d)
    q = {"collections": ["sentinel-2-l2a"], "bbox": C.kotak(lat, lon, 2), "limit": 20,
         "datetime": f"{(d0 - dt.timedelta(days=SEBELUM)).isoformat()}T00:00:00Z/{(d0 + dt.timedelta(days=SESUDAH)).isoformat()}T23:59:59Z",
         "sortby": [{"field": "properties.datetime", "direction": "asc"}]}
    kand = []
    for it in json.loads(C.ambil(C.STAC, data=json.dumps(q).encode()))["features"]:
        tgl = it["properties"]["datetime"][:10]
        if any(k[1] == tgl for k in kand):
            continue
        try:
            aw, ksg = awan(it, lat, lon, km)
        except Exception as e:
            print("  scl gagal", it["id"], e, file=sys.stderr)
            continue
        if ksg <= 30:   # tepi tile: bagian kosong sampai 30% masih lebih berguna daripada VIIRS 375 m
            kand.append((it, tgl, aw, ksg))
        if aw <= 15 and tgl == d:
            break
    if not kand:
        return None
    # api terlihat hanya di adegan yang dekat dengan hari titik: tiap hari geser = 8 poin awan
    it, tgl, aw, _ = min(kand, key=lambda k: abs((dt.date.fromisoformat(k[1]) - d0).days) * 8 + k[2] + k[3])
    f = f"{r['id']}_{d.replace('-', '')}.png"
    if not os.path.exists(os.path.join(KELUAR, f)):
        swir(it, lat, lon, km, os.path.join(KELUAR, f))
    sat = "Sentinel-" + it["properties"].get("platform", "sentinel-2?").split("-")[-1].upper()
    return {"f": f"konsesi2026/citra/{f}", "bbox": bb, "tgl": tgl, "awan": aw, "satelit": sat, "adegan": it["id"]}


def main():
    os.makedirs(KELUAR, exist_ok=True)
    jalur = os.path.join(DIR, "citra.json")
    hasil = json.load(open(jalur)) if os.path.exists(jalur) else {}
    kerja = []
    for k in PROV:
        f = os.path.join(DIR, f"{k}.json")
        if not os.path.exists(f):
            continue
        for r in json.load(open(f))["perusahaan"][:TOP]:
            top = sorted(sorted(r["harian"], key=lambda x: -x[1])[:4])
            for d, n in top:
                if not hasil.get(r["id"], {}).get(d):   # belum ada atau dulu gagal: coba lagi
                    kerja.append((r, d, n))
    print(f"{len(kerja)} potongan", file=sys.stderr)

    def jalan(x):
        r, d, n = x
        try:
            return r["id"], d, satu(r, d, n)
        except Exception as e:
            print("  gagal", r["nama"], d, e, file=sys.stderr)
            return r["id"], d, None
    with ThreadPoolExecutor(6) as ex:
        for i, (rid, d, h) in enumerate(ex.map(jalan, kerja)):
            hasil.setdefault(rid, {})[d] = h
            if i % 20 == 0:
                print(f"  {i + 1}/{len(kerja)}", file=sys.stderr)
                json.dump(hasil, open(jalur, "w"), separators=(",", ":"))
    json.dump(hasil, open(jalur, "w"), separators=(",", ":"))
    ada = sum(1 for v in hasil.values() for h in v.values() if h)
    print(f"citra.json: {ada} citra Sentinel-2 dari {sum(len(v) for v in hasil.values())} tanggal", file=sys.stderr)


if __name__ == "__main__":
    main()
