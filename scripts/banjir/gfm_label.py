"""Panen label banjir satelit Copernicus GFM seluruh Indonesia -> baris kab-hari (4 Nov 2026, izin pemilik: unduh flood_extent + exclusion_mask).

Pakai:  python3 scripts/banjir/gfm_label.py katalog [--dari 2015-01]     (metadata STAC saja; memakai genangan_nasional.katalog)
        python3 scripts/banjir/gfm_label.py panen [--maks N] [--kerja 4] [--dari YYYY-MM] [--sampai YYYY-MM]
        python3 scripts/banjir/gfm_label.py status
        python3 scripts/banjir/gfm_label.py uji                           (sintetis, tanpa jaringan)

panen per item (urut per ubin, lanjut dari manifest): unduh flood_extent + exclusion_mask ke data/raw/banjir/gfm/cache/ (air tetap
reference_water_mask diunduh SEKALI per ubin dan disimpan) -> agregat per kab (poligon public/geo/kabupaten/*.json) -> tambah baris ke
kab_hari.csv.gz -> catat sha256 + hasil di manifest.jsonl -> HAPUS tif mentah item (GFM bisa diunduh ulang). Berhenti rapi
(kode 2) saat galat jaringan beruntun; jalankan ulang untuk melanjutkan. Item yang tak menyentuh kab mana pun dilewati TANPA unduh.

kab_hari.csv.gz: kab ('pp|Nama', kunci sama label_bersatu_v2), tanggal (hari WIB dari waktu akuisisi), px_genang, px_amati, km2_genang,
porsi (= px_genang/px_amati), item_id, + px_mask (ter-exclusion di dalam kab pada ubin itu). Satu baris per kab per item: satu kab-hari bisa
punya beberapa baris (ubin/lintasan berbeda); pemakai menjumlah px per (kab, tanggal) lalu menghitung ulang porsi.
  genang = flood==1 & exclusion!=1 & bukan air tetap;  amati = flood in {0,1} & exclusion!=1 (255 = di luar sapuan/no-data).

ATURAN LABEL (untuk model nanti; PRAREG tidak diubah di sini):
  - GFM hanya penguat POSITIF: kab-hari positif bila porsi >= PORSI_MIN dan px_amati >= AMATI_MIN_KM2 (ambang tetap, awal).
  - GFM BUKAN negatif: radar tidak menjangkau semua kab-hari, dan kota padat ter-mask ~75% (px_mask besar), jadi "tak tergenang"
    tidak berarti "tak banjir". Hari tanpa baris = TAK TERAMATI, bukan 0.
Atribusi wajib: Copernicus EMS GFM, EODC (lihat genangan_nasional.ATRIBUSI).
"""
import argparse, concurrent.futures as cf, csv, datetime as dt, glob, gzip, hashlib, io, json, os, sys, tempfile, threading, time, urllib.error, urllib.request

AYAH = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AYAH)
from umum import MENTAH, WIB  # noqa: E402
from wilayah import AKAR  # noqa: E402

DIR = os.path.join(MENTAH, "gfm")
CACHE = os.path.join(DIR, "cache")
REF = os.path.join(DIR, "ref")
CSV_OUT = os.path.join(DIR, "kab_hari.csv.gz")
MANIFEST = os.path.join(DIR, "manifest.jsonl")
HULU = "https://data.eodc.eu/collections/"
UA = "poskobanjir/1.0 (label banjir GFM, Pantau Bencana)"
KOLOM = ["kab", "tanggal", "px_genang", "px_amati", "km2_genang", "porsi", "item_id", "px_mask"]
KM2_PX = 0.02 * 0.02          # piksel 20 m
PORSI_MIN, AMATI_MIN_KM2 = 0.005, 20.0   # ambang tetap awal untuk positif()
JEDA = 0.25                   # detik setelah tiap permintaan per pekerja
BERUNTUN_MAKS = 6             # galat jaringan beruntun sebelum berhenti
STRIP = 2000


def positif(porsi, px_amati):
    return porsi >= PORSI_MIN and px_amati * KM2_PX >= AMATI_MIN_KM2


def hari_wib(t):
    d = dt.datetime.strptime(t, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=dt.timezone.utc)
    return d.astimezone(WIB).strftime("%Y-%m-%d")


# ---------------------------------------------------------------- poligon kab
def muat_kab():
    """-> [(kunci 'pp|Nama', geometri GeoJSON, (w, s, e, n))]"""
    out = []
    for p in sorted(glob.glob(os.path.join(AKAR, "public/geo/kabupaten/*.json"))):
        pp = os.path.basename(p)[:-5]
        for f in json.load(open(p))["features"]:
            g = f["geometry"]
            xs, ys = [], []
            def jalan(c):
                if isinstance(c[0], (int, float)):
                    xs.append(c[0]); ys.append(c[1])
                else:
                    for x in c:
                        jalan(x)
            jalan(g["coordinates"])
            out.append((f"{pp}|{f['properties']['kab']}", g, (min(xs), min(ys), max(xs), max(ys))))
    return out


def beririsan(bb, kb):
    return not (kb[2] < bb[0] or kb[0] > bb[2] or kb[3] < bb[1] or kb[1] > bb[3])


def label_raster(ds, kabs):
    """Raster uint16 (MEM) sebesar ds: 0 = tak ada kab, i+1 = kabs[i]. Poligon ditransformasi dari WGS84 ke CRS ubin."""
    from osgeo import gdal, ogr, osr
    gdal.UseExceptions()
    src = osr.SpatialReference(); src.ImportFromEPSG(4326); src.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    dst = osr.SpatialReference(); dst.ImportFromWkt(ds.GetProjection()); dst.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    tr = osr.CoordinateTransformation(src, dst)
    mem = ogr.GetDriverByName("MEM").CreateDataSource("k")
    lay = mem.CreateLayer("k", dst, ogr.wkbUnknown)
    lay.CreateField(ogr.FieldDefn("i", ogr.OFTInteger))
    for i, (_, g, _) in enumerate(kabs):
        geo = ogr.CreateGeometryFromJson(json.dumps(g))
        geo.Transform(tr)
        f = ogr.Feature(lay.GetLayerDefn()); f.SetField("i", i + 1); f.SetGeometry(geo); lay.CreateFeature(f)
    r = gdal.GetDriverByName("MEM").Create("", ds.RasterXSize, ds.RasterYSize, 1, gdal.GDT_UInt16)
    r.SetGeoTransform(ds.GetGeoTransform()); r.SetProjection(ds.GetProjection())
    gdal.RasterizeLayer(r, [1], lay, options=["ATTRIBUTE=i", "ALL_TOUCHED=FALSE"])
    return r


def agregat_berkas(flood_p, excl_p, ref_p, label_ds, n_kab):
    """-> (genang[n], amati[n], mask[n]) piksel per kab. excl_p/ref_p boleh None."""
    import numpy as np
    from osgeo import gdal
    gdal.UseExceptions()
    f = gdal.Open(flood_p)
    e = gdal.Open(excl_p) if excl_p else None
    r = gdal.Open(ref_p) if ref_p else None
    if (f.RasterXSize, f.RasterYSize) != (label_ds.RasterXSize, label_ds.RasterYSize):
        raise RuntimeError("ukuran raster beda dari label ubin")
    W, H = f.RasterXSize, f.RasterYSize
    gen, ama, mas = (np.zeros(n_kab + 1, dtype=np.int64) for _ in range(3))
    for y in range(0, H, STRIP):
        n = min(STRIP, H - y)
        lab = label_ds.GetRasterBand(1).ReadAsArray(0, y, W, n)
        if not lab.any():
            continue
        fl = f.GetRasterBand(1).ReadAsArray(0, y, W, n)
        ex = (e.GetRasterBand(1).ReadAsArray(0, y, W, n) == 1) if e else np.zeros(fl.shape, bool)
        rf = (r.GetRasterBand(1).ReadAsArray(0, y, W, n) == 1) if r else np.zeros(fl.shape, bool)
        mas += np.bincount(lab[ex & (fl != 255)], minlength=n_kab + 1)
        ok = (fl != 255) & ~ex
        ama += np.bincount(lab[ok], minlength=n_kab + 1)
        gen += np.bincount(lab[ok & (fl == 1) & ~rf], minlength=n_kab + 1)
    return gen[1:], ama[1:], mas[1:]


# ---------------------------------------------------------------- jaringan
class Berhenti(RuntimeError):
    pass


def unduh(href, tujuan, coba=3):
    """Unduh ke tujuan (atomik). 404 -> FileNotFoundError; galat lain setelah coba kali -> Berhenti."""
    if os.path.exists(tujuan):
        return
    os.makedirs(os.path.dirname(tujuan), exist_ok=True)
    for i in range(coba):
        try:
            req = urllib.request.Request(href, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=120) as r:
                b = r.read()
            tmp = tujuan + ".part"
            with open(tmp, "wb") as g:
                g.write(b)
            os.replace(tmp, tujuan)
            time.sleep(JEDA)
            return
        except urllib.error.HTTPError as e:
            if e.code in (404, 403):
                raise FileNotFoundError(f"HTTP {e.code} {href}")
            if i == coba - 1:
                raise Berhenti(f"HTTP {e.code} {href}")
            time.sleep(15 * (i + 1) * (4 if e.code == 429 else 1))
        except Exception as e:
            if i == coba - 1:
                raise Berhenti(f"{type(e).__name__}: {e} {href}")
            time.sleep(10 * (i + 1))


def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as g:
        for b in iter(lambda: g.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


# ---------------------------------------------------------------- manifest + csv
KUNCI_TULIS = threading.Lock()


def selesai():
    out = set()
    if os.path.exists(MANIFEST):
        for g in open(MANIFEST):
            try:
                out.add(json.loads(g)["id"])
            except ValueError:
                pass   # baris terpotong di ujung
    return out


def tulis_hasil(rows, man, csv_out=CSV_OUT, manifest=MANIFEST):
    """Baris dulu, manifest sesudahnya; tiap tulis = satu anggota gzip utuh (multi-member sah dibaca gzip)."""
    with KUNCI_TULIS:
        if rows:
            buf = io.StringIO()
            w = csv.writer(buf)
            if not os.path.exists(csv_out):
                w.writerow(KOLOM)
            w.writerows(rows)
            with open(csv_out, "ab") as g:
                g.write(gzip.compress(buf.getvalue().encode()))
        with open(manifest, "a") as g:
            g.write(json.dumps(man, separators=(",", ":")) + "\n")


def proses_item(it, kabs, label_ds, hapus=True, ref_p=None, flood_p=None, excl_p=None, csv_out=CSV_OUT, manifest=MANIFEST):
    """Agregat satu item (berkas sudah ada) -> tulis baris + manifest -> hapus tif. kabs = kab yang dirasterkan di label_ds (urutan sama)."""
    gen, ama, mas = agregat_berkas(flood_p, excl_p, ref_p, label_ds, len(kabs))
    tgl = hari_wib(it["t"])
    rows = []
    for j, k in enumerate(kabs):
        if ama[j] or mas[j]:
            rows.append([k[0], tgl, int(gen[j]), int(ama[j]), round(int(gen[j]) * KM2_PX, 3),
                         round(int(gen[j]) / ama[j], 5) if ama[j] else 0, it["id"], int(mas[j])])
    man = {"id": it["id"], "t": it["t"], "rows": len(rows), "sha_flood": sha(flood_p), "sha_excl": sha(excl_p) if excl_p else None}
    tulis_hasil(rows, man, csv_out, manifest)
    if hapus:
        for p in (flood_p, excl_p):
            if p and os.path.exists(p):
                os.remove(p)
    return len(rows)


# ---------------------------------------------------------------- panen
def lewati(it, alasan):
    tulis_hasil([], {"id": it["id"], "t": it["t"], "rows": 0, "lewat": alasan})


def panen(maks=None, kerja=4, dari=None, sampai=None, ubin=None):
    import genangan_nasional as GN
    from itertools import groupby
    from osgeo import gdal
    gdal.UseExceptions()
    os.makedirs(CACHE, exist_ok=True)
    item = GN.muat_item()
    ada = selesai()
    kabs = muat_kab()
    todo = [k for k in item.values() if k["id"] not in ada and (not dari or k["t"][:7] >= dari) and (not sampai or k["t"][:7] <= sampai) and (not ubin or k["ub"].endswith(ubin))]
    todo.sort(key=lambda k: (k["ub"], k["t"]))
    if maks:
        todo = todo[:maks]
    print(f"{len(item)} item katalog, {len(ada)} selesai, {len(todo)} antre", flush=True)
    mulai, hit, stop, gagal = time.time(), {"ok": 0, "lewat": 0}, threading.Event(), []

    def satu(it, sub, label, ref):
        if stop.is_set():
            return
        fp, ep = (os.path.join(CACHE, it["id"] + s) for s in (".flood.tif", ".excl.tif"))
        try:
            unduh(HULU + it["f"], fp)
            if it.get("m"):
                unduh(HULU + it["m"], ep)
        except FileNotFoundError:
            for p in (fp, ep):
                if os.path.exists(p):
                    os.remove(p)
            lewati(it, "404"); hit["lewat"] += 1
            return
        except Berhenti as e:
            gagal.append(str(e)); stop.set()
            return
        proses_item(it, sub, label, ref_p=ref, flood_p=fp, excl_p=ep if it.get("m") else None)
        hit["ok"] += 1

    for ub, grup in groupby(todo, key=lambda k: k["ub"]):
        grup = list(grup)
        if stop.is_set():
            break
        sub = [k for k in kabs if any(beririsan(g["bb"], k[2]) for g in grup)]
        if not sub:   # ubin di luar Indonesia: catat tanpa unduh
            for it in grup:
                lewati(it, "luar_kab")
            hit["lewat"] += len(grup)
            continue
        try:
            ref = None
            if grup[0].get("r"):
                ref = os.path.join(REF, ub + ".tif")
                unduh(HULU + grup[0]["r"], ref)
            fp0 = os.path.join(CACHE, grup[0]["id"] + ".flood.tif")
            unduh(HULU + grup[0]["f"], fp0)
            ds = gdal.Open(fp0)
            label = label_raster(ds, sub)
            ds = None
        except (Berhenti, FileNotFoundError) as e:
            gagal.append(str(e)); break
        with cf.ThreadPoolExecutor(kerja) as ex:
            list(ex.map(lambda it: satu(it, sub, label, ref), grup))
        label = None
        print(f"  {ub}: {len(grup)} item, total ok {hit['ok']} lewat {hit['lewat']}, {time.time() - mulai:.0f} dtk", flush=True)
    print(f"selesai {hit['ok']} item, lewat {hit['lewat']}, {time.time() - mulai:.0f} dtk", flush=True)
    if gagal:
        print("BERHENTI (jaringan):", gagal[0], flush=True)
        return 2
    return 0


def status():
    ada = selesai()
    n_csv = 0
    if os.path.exists(CSV_OUT):
        with gzip.open(CSV_OUT, "rt") as g:
            n_csv = sum(1 for _ in g) - 1
    mb = sum(os.path.getsize(p) for p in glob.glob(CACHE + "/*") + glob.glob(REF + "/*")) / 1e6
    print(f"manifest {len(ada)} item, {n_csv} baris kab-hari, cache {mb:.0f} MB")


# ---------------------------------------------------------------- uji
def uji():
    import numpy as np
    from osgeo import gdal, osr
    gdal.UseExceptions()
    tmp = tempfile.mkdtemp(prefix="gfmuji")
    # ubin sintetis UTM 48S (EPSG:32748) 100x100 piksel 20 m, di sekitar (106.0 E, 6.2 S) ~ x 500000 y 9314000
    x0, y0 = 700000.0, 9310000.0

    def tulis(nama, arr):
        d = gdal.GetDriverByName("GTiff").Create(os.path.join(tmp, nama), 100, 100, 1, gdal.GDT_Byte)
        d.SetGeoTransform((x0, 20, 0, y0, 0, -20))
        s = osr.SpatialReference(); s.ImportFromEPSG(32748); d.SetProjection(s.ExportToWkt())
        d.GetRasterBand(1).WriteArray(arr); d = None
        return os.path.join(tmp, nama)

    fl = np.full((100, 100), 255, np.uint8)
    fl[:, :50] = 0          # kiri teramati kering
    fl[10:20, 10:20] = 1    # 100 px tergenang
    fl[30:40, 10:20] = 1    # 100 px tergenang yang akan ter-mask
    ex = np.zeros((100, 100), np.uint8); ex[30:40, 10:20] = 1
    rf = np.zeros((100, 100), np.uint8); rf[10:12, 10:20] = 1   # 20 px air tetap
    fp, ep, rp = tulis("f.tif", fl), tulis("e.tif", ex), tulis("r.tif", rf)
    # kab sintetis menutup seluruh ubin: konversi sudut UTM -> lon/lat
    s84 = osr.SpatialReference(); s84.ImportFromEPSG(4326); s84.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    sutm = osr.SpatialReference(); sutm.ImportFromEPSG(32748); sutm.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    t = osr.CoordinateTransformation(sutm, s84)
    def ll(x, y):
        a = t.TransformPoint(x, y); return [a[0], a[1]]
    # kab A = separuh kiri (x < 700000+1000), kab B = separuh kanan; luar ubin tak ada
    xm = x0 + 1000
    A = {"type": "Polygon", "coordinates": [[ll(x0 - 100, y0 + 100), ll(xm, y0 + 100), ll(xm, y0 - 2100), ll(x0 - 100, y0 - 2100), ll(x0 - 100, y0 + 100)]]}
    B = {"type": "Polygon", "coordinates": [[ll(xm, y0 + 100), ll(x0 + 2100, y0 + 100), ll(x0 + 2100, y0 - 2100), ll(xm, y0 - 2100), ll(xm, y0 + 100)]]}
    kabs = [("11|A", A, None), ("11|B", B, None)]
    ds = gdal.Open(fp)
    lab = label_raster(ds, kabs)
    csvp, manp = os.path.join(tmp, "k.csv.gz"), os.path.join(tmp, "m.jsonl")
    it = {"id": "uji1", "t": "2026-03-29T22:17:46Z"}   # 22:17 UTC = 05:17 WIB hari BERIKUT
    n = proses_item(it, kabs, lab, ref_p=rp, flood_p=fp, excl_p=ep, csv_out=csvp, manifest=manp)
    rows = list(csv.DictReader(io.TextIOWrapper(gzip.open(csvp))))
    assert n == 1 and len(rows) == 1, rows
    r = rows[0]
    assert r["kab"] == "11|A" and r["tanggal"] == "2026-03-30", r
    # genang = 100 (blok 1) - 20 air tetap = 80; blok ter-mask tak dihitung genang maupun amati; mask = 100
    assert int(r["px_genang"]) == 80, r
    assert int(r["px_amati"]) == 4900, r   # 50 kolom x 100 baris dikurangi 100 px ter-mask
    assert int(r["px_mask"]) == 100 and r["item_id"] == "uji1", r
    assert abs(float(r["km2_genang"]) - 80 * KM2_PX) < 1e-6 and abs(float(r["porsi"]) - 80 / int(r["px_amati"])) < 1e-4, r
    assert not os.path.exists(fp) and not os.path.exists(ep), "tif mentah harus terhapus"
    man = [json.loads(g) for g in open(manp)]
    assert man[0]["id"] == "uji1" and len(man[0]["sha_flood"]) == 64
    # idempoten: ulang selesai() mengenali item, tak ada tulis ganda
    sel = {json.loads(g)["id"] for g in open(manp)}
    assert "uji1" in sel and len(man) == 1
    assert hari_wib("2026-03-29T10:00:00Z") == "2026-03-29" and hari_wib("2026-03-29T17:00:00Z") == "2026-03-30"
    assert positif(0.01, 100000) and not positif(0.01, 1000) and not positif(0.001, 100000)
    print("uji gfm_label: ok")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("cmd", choices=["katalog", "panen", "status", "uji"])
    p.add_argument("--dari"); p.add_argument("--sampai"); p.add_argument("--maks", type=int); p.add_argument("--kerja", type=int, default=4); p.add_argument("--ubin")
    a = p.parse_args()
    if a.cmd == "uji":
        uji()
    elif a.cmd == "status":
        status()
    elif a.cmd == "katalog":
        import genangan_nasional as GN
        GN.katalog(a.dari or "2015-01", a.sampai)
    else:
        sys.exit(panen(a.maks, a.kerja, a.dari, a.sampai, a.ubin))
