"""Lapisan peta tahap 2 -> PMTiles raster (data/ubin/<nama>.pmtiles) + berkas samping (data/ubin/<nama>.json).

Alat pengembangan LOKAL (bukan CI): butuh gdal (gdalwarp, gdal_translate, gdaladdo, gdalbuildvrt), pmtiles; brew install gdal pmtiles.
Berkas hasil diunggah ke R2 dan dilayani worker lewat /ubin/<nama>.pmtiles (HTTP Range); tidak di-commit (.gitignore).

Sumber (semua CC BY 4.0, mentah di data/raw/lahan2/):
  sawit   Descals dkk. 2024 (ESSD 16:5111), Zenodo 13379129 v1.2, GlobalOilPalm_OP-extent.zip, 10 m, 2021; 1 industri, 2 rakyat
  kelapa  Descals dkk. 2023 (ESSD 15:3991), Zenodo 8128183 v1-2, GlobalCoconutLayer_2020_v1-2.zip, 20 m; 1 kelapa berkanopi rapat
  terbangun  JRC GHSL GHS-BUILT-S R2023A, epoch 2025, 100 m, ESRI:54009 (luas bangunan m2 per sel 100 m)
Jalan logging Kalimantan (CIFOR/Gaveau) TIDAK dibangun: lisensi berkasnya belum terverifikasi (lihat docs/sumber-lapisan.md).

Pakai:
  python3 scripts/geo/ubin_tahap2.py bangun sawit|kelapa|terbangun
  python3 scripts/geo/ubin_tahap2.py uji          # header PMTiles, bounds, zoom, tipe ubin, ubin contoh Kalimantan
"""
import glob, json, math, os, re, subprocess, sys, zipfile

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
RAW = os.path.join(AKAR, "data/raw/lahan2")
UBIN = os.path.join(AKAR, "data/ubin")
BBOX = (94.0, -11.5, 141.5, 6.5)  # w s e n
R = 6378137.0
ORIGIN = math.pi * R  # 20037508.34
TILE_PX = 256

# warna: (R,G,B)
LAPISAN = {
    "sawit": {
        "minzoom": 4, "maxzoom": 13, "sampel": (111.6, -2.7, 9),
        "legenda": [{"warna": "#b8860b", "label": "Sawit industri"}, {"warna": "#e3c94e", "label": "Sawit rakyat (smallholder)"}],
        "sumber": "Descals dkk. 2024, Global oil palm extent and planting year from 1990 to 2021 (Zenodo 10.5281/zenodo.13379129)",
        "lisensi": "CC BY 4.0", "versi": "v1.2 (tutupan 2021, 10 m)",
        "atribusi": "Descals, A. et al. (2024). Global mapping of oil palm planting year from 1990 to 2021. Earth Syst. Sci. Data 16, 5111. CC BY 4.0. Diolah: dipotong ke Indonesia dan diubah ke ubin raster.",
    },
    "kelapa": {
        "minzoom": 4, "maxzoom": 13, "sampel": (104.0, -0.5, 6),
        "legenda": [{"warna": "#8b4a2b", "label": "Kelapa berkanopi rapat (kelapa jarang tidak terpetakan)"}],
        "sumber": "Descals dkk. 2023, High-resolution global map of closed-canopy coconut palm (Zenodo 10.5281/zenodo.8128183)",
        "lisensi": "CC BY 4.0", "versi": "v1-2 (2020, 20 m)",
        "atribusi": "Descals, A. et al. (2023). High-resolution global map of closed-canopy coconut palm. Earth Syst. Sci. Data 15, 3991. CC BY 4.0. Diolah: dipotong ke Indonesia dan diubah ke ubin raster.",
    },
    "terbangun": {
        "minzoom": 4, "maxzoom": 12, "sampel": (114.6, -3.3, 8),
        "legenda": [{"warna": "#e8743b", "label": "Kawasan terbangun (makin pekat = makin padat bangunan)"}],
        "sumber": "JRC GHSL GHS-BUILT-S R2023A, epoch 2025, 100 m (doi:10.2905/9F06F36F-4B11-47EC-ABB0-4F8B7B1D72EA)",
        "lisensi": "CC BY 4.0", "versi": "GHS_BUILT_S_E2025_GLOBE_R2023A_54009_100 V1-0",
        "atribusi": "(c) European Union, 1995-2026. Sumber: JRC Global Human Settlement Layer, GHS-BUILT-S R2023A. CC BY 4.0. Diolah: dipotong ke Indonesia, diproyeksikan ulang, dan diubah ke ubin raster.",
    },
}


def jalan(*cmd):
    print("+", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def hex_rgb(h):
    return int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)


def pasang_palet(vrt_masuk, vrt_keluar, entri):
    """Sisipkan ColorTable (RGBA per nilai) ke VRT satu-pita lalu -expand rgba (lazy, tanpa materialisasi)."""
    xml = open(vrt_masuk, encoding="utf-8").read()
    tabel = "<ColorInterp>Palette</ColorInterp><ColorTable>" + "".join(
        '<Entry c1="%d" c2="%d" c3="%d" c4="%d"/>' % e for e in entri) + "</ColorTable>"
    xml = re.sub(r"(<VRTRasterBand[^>]*>)(\s*<ColorInterp>[^<]*</ColorInterp>)?", lambda m: m.group(1) + tabel, xml, count=1)
    tmp = vrt_keluar + ".pal.vrt"
    open(tmp, "w", encoding="utf-8").write(xml)
    jalan("gdal_translate", "-q", "-of", "VRT", "-expand", "rgba", tmp, vrt_keluar)


def blok_z8(tifs):
    """Blok ubin z8 (x, y) di dalam BBOX yang tumpang-tindih footprint (WGS84) salah satu tif."""
    n = 2 ** 8
    def tx(lon):
        return min(n - 1, max(0, int((lon + 180) / 360 * n)))
    def ty(lat):
        lat = max(-85.05, min(85.05, lat))
        return min(n - 1, max(0, int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)))
    bx0, bx1, by0, by1 = tx(BBOX[0]), tx(BBOX[2]), ty(BBOX[3]), ty(BBOX[1])
    ada = set()
    for t in tifs:
        info = json.loads(subprocess.run(["gdalinfo", "-json", t], capture_output=True, check=True).stdout)
        pts = info["wgs84Extent"]["coordinates"][0]
        lo, la = [p[0] for p in pts], [p[1] for p in pts]
        for x in range(max(bx0, tx(min(lo))), min(bx1, tx(max(lo))) + 1):
            for y in range(max(by0, ty(max(la))), min(by1, ty(min(la))) + 1):
                ada.add((x, y))
    return sorted(ada)


def blok_ekstent(blok, zb):
    """Ekstent 3857 (xmin, ymin, xmax, ymax) yang memuat semua blok."""
    res = 2 * ORIGIN / (2 ** zb)
    xs = [b[0] for b in blok]
    ys = [b[1] for b in blok]
    return -ORIGIN + min(xs) * res, ORIGIN - (max(ys) + 1) * res, -ORIGIN + (max(xs) + 1) * res, ORIGIN - min(ys) * res


def ke_pmtiles(nama, rgba_vrt, cfg, resample, sumber_tif):
    """RGBA VRT -> `gdal raster tile` (PNG, lewati ubin kosong, paralel) -> MBTiles (sqlite3) -> pmtiles convert."""
    import sqlite3
    os.makedirs(UBIN, exist_ok=True)
    dirt = os.path.join(RAW, nama + "_tiles")
    # ponytail: satu `gdal raster tile` atas seluruh bbox mengunjungi ratusan ribu ubin laut (jam-jaman); jadi z8..maks
    # dikerjakan per blok z8 yang tumpang-tindih footprint sumber (blok selaras ubin z8 -> piramida tak retak),
    # z4..7 dari raster 3857 kasar hasil gdalwarp rata-rata.
    zb = 8
    blok = blok_z8(sumber_tif)
    print(nama, len(blok), "blok z8", flush=True)
    k = 2 ** (cfg["maxzoom"] - zb)

    def satu(bl):
        x, y = bl
        subprocess.run(["gdal", "raster", "tile", "-q", "--skip-blank", "--min-zoom", str(zb), "--max-zoom", str(cfg["maxzoom"]),
                        "--min-x", str(x * k), "--max-x", str((x + 1) * k - 1), "--min-y", str(y * k), "--max-y", str((y + 1) * k - 1),
                        "-r", resample, "--overview-resampling", "average", "--num-threads", "1", "--resume", rgba_vrt, dirt],
                       check=True)
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(6) as ex:
        list(ex.map(satu, blok))
    n7 = 2 ** 7
    res7 = 2 * ORIGIN / (n7 * TILE_PX)
    w, s_, e, n_ = (lambda t: t)(blok_ekstent(blok, zb))
    kasar = os.path.join(RAW, nama + "_z7.tif")
    jalan("gdalwarp", "-q", "-overwrite", "-t_srs", "EPSG:3857", "-te", str(w), str(s_), str(e), str(n_), "-tr", str(res7), str(res7),
          "-r", "average", "-dstalpha", "-co", "COMPRESS=DEFLATE", "-multi", "-wo", "NUM_THREADS=ALL_CPUS", rgba_vrt, kasar)
    jalan("gdal", "raster", "tile", "-q", "--skip-blank", "--min-zoom", str(cfg["minzoom"]), "--max-zoom", "7",
          "-r", "average", "--overview-resampling", "average", "--num-threads", "ALL_CPUS", "--resume", kasar, dirt)
    mb = os.path.join(RAW, nama + ".mbtiles")
    if os.path.exists(mb):
        os.remove(mb)
    db = sqlite3.connect(mb)
    db.executescript("CREATE TABLE metadata(name TEXT, value TEXT); CREATE TABLE tiles(zoom_level INTEGER, tile_column INTEGER, "
                     "tile_row INTEGER, tile_data BLOB); CREATE UNIQUE INDEX tile_index ON tiles(zoom_level, tile_column, tile_row);")
    db.executemany("INSERT INTO metadata VALUES(?,?)", [
        ("name", nama), ("format", "png"), ("type", "overlay"), ("version", "1"), ("minzoom", str(cfg["minzoom"])),
        ("maxzoom", str(cfg["maxzoom"])), ("bounds", "%s,%s,%s,%s" % BBOX), ("attribution", cfg["atribusi"])])
    n = 0
    for f in glob.glob(os.path.join(dirt, "*", "*", "*.png")):
        z, x, y = (int(v) for v in f[len(dirt) + 1:-4].split(os.sep))
        db.execute("INSERT INTO tiles VALUES(?,?,?,?)", (z, x, (1 << z) - 1 - y, open(f, "rb").read()))
        n += 1
    db.commit()
    db.close()
    print(nama, n, "ubin")
    out = os.path.join(UBIN, nama + ".pmtiles")
    if os.path.exists(out):
        os.remove(out)
    jalan("pmtiles", "convert", mb, out)
    tulis_samping(nama, cfg)
    print(nama, os.path.getsize(out) / 1e6, "MB")


def tulis_samping(nama, cfg):
    s = {k: cfg[k] for k in ("sumber", "lisensi", "atribusi", "versi", "minzoom", "maxzoom", "legenda")}
    s.update(bbox=list(BBOX), jenis="raster")
    json.dump(s, open(os.path.join(UBIN, nama + ".json"), "w"), ensure_ascii=False, indent=2)


def buka_zip(zp, tujuan, pola="*.tif"):
    if not glob.glob(os.path.join(tujuan, pola)):
        os.makedirs(tujuan, exist_ok=True)
        zipfile.ZipFile(zp).extractall(tujuan)
    return sorted(glob.glob(os.path.join(tujuan, "**", pola), recursive=True))


def bangun_biner(nama, zip_rel, palet):
    """sawit/kelapa: kelas byte (0 = lain) -> palet RGBA -> MBTiles -> PMTiles."""
    cfg = LAPISAN[nama]
    tifs = buka_zip(os.path.join(RAW, zip_rel), os.path.join(RAW, nama, "tif"))
    lst = os.path.join(RAW, nama + "_daftar.txt")
    open(lst, "w").write("\n".join(tifs))
    src = os.path.join(RAW, nama + "_src.vrt")
    jalan("gdalbuildvrt", "-q", "-te", *[str(v) for v in BBOX], "-input_file_list", lst, src)
    rgba = os.path.join(RAW, nama + "_rgba.vrt")
    pasang_palet(src, rgba, palet)
    ke_pmtiles(nama, rgba, cfg, "average", tifs)


def bangun_terbangun():
    cfg = LAPISAN["terbangun"]
    tifs = []
    for z in sorted(glob.glob(os.path.join(RAW, "ghsl/*.zip"))):
        tifs += buka_zip(z, os.path.join(RAW, "ghsl", os.path.basename(z)[:-4]))
    lst = os.path.join(RAW, "terbangun_daftar.txt")
    open(lst, "w").write("\n".join(t for t in tifs if t.endswith(".tif")))
    src = os.path.join(RAW, "terbangun_src.vrt")
    jalan("gdalbuildvrt", "-q", "-te", *[str(v) for v in BBOX], "-input_file_list", lst, src)
    # m2 bangunan per sel 100 m (0..10000) -> byte 0..255 (lazy) -> palet beralfa menurut kepadatan
    b = os.path.join(RAW, "terbangun_byte.vrt")
    jalan("gdal_translate", "-q", "-of", "VRT", "-ot", "Byte", "-scale", "0", "10000", "0", "255", src, b)
    r, g, bl = hex_rgb("#e8743b")
    entri = [(r, g, bl, 0)]
    for v in range(1, 256):
        entri.append((r, g, bl, min(255, int(70 + 185 * math.sqrt(v / 255)))))
    rgba = os.path.join(RAW, "terbangun_rgba.vrt")
    pasang_palet(b, rgba, entri)
    ke_pmtiles("terbangun", rgba, cfg, "bilinear", [t for t in tifs if t.endswith(".tif")])


# ---- uji ----

def pm(*a):
    return subprocess.run(["pmtiles", *a], capture_output=True, check=True).stdout


def ubin_xyz(lon, lat, z):
    n = 2 ** z
    return z, int((lon + 180) / 360 * n), int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)


def uji():
    gagal = []
    for nama, cfg in LAPISAN.items():
        p = os.path.join(UBIN, nama + ".pmtiles")
        if not os.path.exists(p):
            print("LEWATI (belum dibangun):", nama)
            continue
        info = pm("show", p, "--header-json")
        h = json.loads(info)
        w, s, e, n = (h["min_lon_e7"] / 1e7, h["min_lat_e7"] / 1e7, h["max_lon_e7"] / 1e7, h["max_lat_e7"] / 1e7)
        if h["min_zoom"] != cfg["minzoom"] or h["max_zoom"] != cfg["maxzoom"]:
            gagal.append("%s: zoom %s-%s, harapan %s-%s" % (nama, h["min_zoom"], h["max_zoom"], cfg["minzoom"], cfg["maxzoom"]))
        # bounds dari header boleh sedikit lebih lebar dari BBOX (selaras ubin), tidak boleh jauh melenceng
        if not (abs(w - BBOX[0]) < 1 and abs(s - BBOX[1]) < 1 and abs(e - BBOX[2]) < 1 and abs(n - BBOX[3]) < 1):
            gagal.append("%s: bounds %s %s %s %s melenceng dari %s" % (nama, w, s, e, n, BBOX))
        if h.get("tile_type") not in ("png", 2):
            gagal.append("%s: tile_type %r, harapan png" % (nama, h.get("tile_type")))
        lon, lat, z = cfg["sampel"]
        z, x, y = ubin_xyz(lon, lat, z)
        try:
            data = pm("tile", p, str(z), str(x), str(y))
        except subprocess.CalledProcessError:
            data = b""
        if len(data) < 200 or data[:8] != b"\x89PNG\r\n\x1a\n":
            gagal.append("%s: ubin contoh Kalimantan %d/%d/%d kosong (%d byte)" % (nama, z, x, y, len(data)))
        sm = json.load(open(os.path.join(UBIN, nama + ".json")))
        for k in ("sumber", "lisensi", "atribusi", "versi", "bbox", "minzoom", "maxzoom", "jenis", "legenda"):
            if k not in sm:
                gagal.append("%s: berkas samping tanpa %s" % (nama, k))
        print("%s ok: zoom %s-%s bounds %.2f,%.2f,%.2f,%.2f %.1f MB ubin %d/%d/%d %d byte" % (
            nama, h["min_zoom"], h["max_zoom"], w, s, e, n, os.path.getsize(p) / 1e6, z, x, y, len(data)))
    assert not gagal, "\n".join(gagal)


if __name__ == "__main__":
    a = sys.argv[1:] or ["uji"]
    if a[0] == "uji":
        uji()
    elif a[0] == "bangun" and a[1] == "sawit":
        r1, g1, b1 = hex_rgb("#b8860b")
        r2, g2, b2 = hex_rgb("#e3c94e")
        bangun_biner("sawit", "sawit/extp.zip", [(0, 0, 0, 0), (r1, g1, b1, 235), (r2, g2, b2, 235)])
    elif a[0] == "bangun" and a[1] == "kelapa":
        r, g, b = hex_rgb("#8b4a2b")
        bangun_biner("kelapa", "kelapa/kelapa.zip", [(0, 0, 0, 0), (r, g, b, 235)])
    elif a[0] == "bangun" and a[1] == "terbangun":
        bangun_terbangun()
    else:
        sys.exit(__doc__)
