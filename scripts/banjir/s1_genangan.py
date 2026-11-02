"""Catatan genangan banjir dari radar Sentinel-1 RTC (Planetary Computer, token SAS anonim) per kab/kota.
  kab --kode KODE --dari YYYY-MM-DD --sampai YYYY-MM-DD --keluar DIR   -> DIR/s1_<KODE>.json
  daftar_kab                                                           kode kab urut banjir DIBI terbanyak
  uji                                                                  self-check tanpa jaringan (array sintetis)
Air tak biasa = VV < AMBANG_DB DAN piksel itu jarang basah (frekuensi < FREQ_MAKS dari arsip latih kab
pada relative_orbit yang sama, minimal MIN_ORBIT adegan) DAN bukan air permanen (JRC GSW occurrence > 50 bila terambil).
Keluaran: {"kode","nama","km2_kab","meta":{...},"adegan":[{"tanggal","orbit","teramati","km2","fraksi"}]}
  teramati = fraksi kab yang tertutup data; km2 = luas air tak biasa; fraksi = km2 / luas kab.
Dua tahap: (1) baca tiap adegan sekali ke DIR/s1cache_<KODE>/ (npz; melanjutkan, adegan yang sudah di cache dilewati);
(2) frekuensi basah per orbit dari SEMUA cache, lalu tulis. Berkas keluaran lengkap (semua id STAC ada) = kab dilewati.
Keterbatasan: sawah/tambak yang digenangi berulang musiman hanya tersaring bila basah >= FREQ_MAKS adegan orbitnya;
sawah yang baru digenangi pada satu musim tanam tampak seperti banjir. Ambang tetap -18 dB (Otsu per adegan belum dipakai).
Kode keluar: 0 selesai, 1 ada kegagalan baca/pencarian.
"""
import argparse, datetime as dt, json, os, sys, time

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.update(GDAL_HTTP_TIMEOUT="60", GDAL_HTTP_MAX_RETRY="3", GDAL_HTTP_RETRY_DELAY="3", GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
                  CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif,.tiff")
import panen_lab as PL  # norm(), urut_kab, cmd_daftar (stdlib)

STAC = "https://planetarycomputer.microsoft.com/api/stac/v1"
AMBANG_DB, FREQ_MAKS, MIN_ORBIT, MIN_TUTUP = -18.0, 0.25, 6, 0.3
DEG = 0.0006                       # ~67 m; dibaca dari overview kasar COG lalu dirata-ratakan ke kisi lon/lat
GSW_MIN = 50                       # persen occurrence JRC GSW


def log(*a): print(*a, flush=True)


def ulang(f, n=3, jeda=5):
    for k in range(n):
        try:
            return f()
        except Exception as e:
            err = e; log("  coba", k + 1, repr(e)[:160]); time.sleep(jeda * (k + 1))
    raise err


# ---------------------------------------------------------------- wilayah
def geom_kab(kode, wil=None, geo_dir=None):
    """(nama, geometri) kab dari kode BPS. Cocok per (prov, nama ternormalisasi): 'Kota X' != 'X'; poligon tak berkode (Pahuwato kedua) diabaikan."""
    wil = wil or json.load(open(os.path.join(AKAR, "public/data/bnpb/wilayah.json")))["kab"]
    w = next((x for x in wil if x["kode"] == kode), None)
    if not w:
        raise SystemExit(f"kode {kode} tidak ada di wilayah.json")
    geo_dir = geo_dir or os.path.join(AKAR, "public/geo/kabupaten")
    fs = json.load(open(os.path.join(geo_dir, w["prov"] + ".json")))["features"]
    hit = [f for f in fs if PL.norm(f["properties"]["kab"]) == PL.norm(w["nama"])]
    if not hit:
        raise SystemExit(f"{kode} {w['nama']}: tak ada poligon")
    return w["nama"], hit[0]["geometry"]


def titik(g):
    def rec(c):
        if isinstance(c[0], (int, float)): yield c
        else:
            for x in c: yield from rec(x)
    return list(rec(g["coordinates"]))


# ---------------------------------------------------------------- inti hitung (murni, diuji)
def air_tak_biasa(adegan, mask, km2_pix):
    """adegan: [{tanggal, orbit, valid(bool HxW), water(bool HxW)}]. Kembalikan baris keluaran per adegan,
    frekuensi basah dihitung per orbit dari adegan orbit itu sendiri (orbit < MIN_ORBIT adegan dilewati).
    mask: bool HxW poligon kab; permanen opsional lewat adegan[0]-agnostik: kirim mask sudah dikurangi air permanen."""
    import numpy as np
    n_mask = int(mask.sum()); baris = []
    for orb in sorted({a["orbit"] for a in adegan}, key=str):
        grp = [a for a in adegan if a["orbit"] == orb]
        if len(grp) < MIN_ORBIT:
            continue
        cw = sum(a["water"].astype("int16") for a in grp); cv = sum(a["valid"].astype("int16") for a in grp)
        freq = np.where(cv > 0, cw / np.maximum(cv, 1), 1.0)
        for a in grp:
            tak = a["water"] & (freq < FREQ_MAKS) & (cv >= MIN_ORBIT) & mask
            n = int(tak.sum())
            baris.append(dict(tanggal=a["tanggal"], orbit=orb, teramati=round(float((a["valid"] & mask).sum() / n_mask), 3),
                              km2=round(n * km2_pix, 3), fraksi=round(n / n_mask, 5)))
    return sorted(baris, key=lambda b: (b["tanggal"], str(b["orbit"])))


# ---------------------------------------------------------------- pembacaan raster
def kisi(geom):
    import numpy as np
    from rasterio.features import rasterize
    from rasterio.transform import from_origin
    p = titik(geom); xs = [q[0] for q in p]; ys = [q[1] for q in p]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    W, H = int(round((x1 - x0) / DEG)) + 1, int(round((y1 - y0) / DEG)) + 1
    tr = from_origin(x0, y1, DEG, DEG)
    mask = rasterize([(geom, 1)], (H, W), transform=tr, fill=0, dtype="uint8").astype(bool)
    km2 = (DEG * 111.32) ** 2 * np.cos(np.radians((y0 + y1) / 2))
    return (x0, y0, x1, y1), (H, W), tr, mask, km2


def baca_vv(href, bbox, shape, tr):
    """VV linear -> kisi lon/lat (NaN = tak ada data). Overview COG dipilih GDAL lewat out_shape kasar."""
    import numpy as np, rasterio
    from rasterio.warp import reproject, Resampling, transform_bounds
    from rasterio.windows import from_bounds, Window
    with rasterio.open(href) as ds:
        b = transform_bounds("EPSG:4326", ds.crs, *bbox)
        win = from_bounds(*b, transform=ds.transform).round_offsets().round_lengths().intersection(Window(0, 0, ds.width, ds.height))
        if win.width < 2 or win.height < 2:
            return None
        f = max(1, int(round(DEG * 111320 / abs(ds.transform.a))))
        a = ds.read(1, window=win, out_shape=(max(1, int(win.height // f)), max(1, int(win.width // f))), masked=False).astype("float32")
        tw = ds.window_transform(win) * rasterio.Affine.scale(win.width / a.shape[1], win.height / a.shape[0])
        dst = np.full(shape, np.nan, "float32")
        reproject(a, dst, src_transform=tw, src_crs=ds.crs, dst_transform=tr, dst_crs="EPSG:4326",
                  src_nodata=0, dst_nodata=np.nan, resampling=Resampling.average)
    return dst


def permanen(katalog, bbox, shape, tr):
    """mask air permanen (JRC GSW occurrence > 50%) atau None bila tak terambil (lalu cukup syarat frekuensi)."""
    try:
        import numpy as np, planetary_computer as pc, rasterio
        from rasterio.warp import reproject, Resampling
        its = ulang(lambda: list(katalog.search(collections=["jrc-gsw"], bbox=list(bbox)).items()))
        occ = np.zeros(shape, "float32")
        for it in its:
            if "occurrence" not in it.assets:
                continue
            with rasterio.open(pc.sign(it.assets["occurrence"].href)) as ds:
                tmp = np.zeros(shape, "float32")
                reproject(rasterio.band(ds, 1), tmp, dst_transform=tr, dst_crs="EPSG:4326", resampling=Resampling.average)
                occ = np.maximum(occ, tmp)
        return occ > GSW_MIN if occ.max() > 0 else None
    except Exception as e:
        log("  GSW tak terambil:", repr(e)[:120]); return None


# ---------------------------------------------------------------- perintah
def cmd_kab(a):
    import numpy as np, planetary_computer as pc
    from pystac_client import Client
    kode = a.kode; nama, geom = geom_kab(kode)
    os.makedirs(a.keluar, exist_ok=True)
    fout = os.path.join(a.keluar, f"s1_{kode}.json"); cdir = os.path.join(a.keluar, f"s1cache_{kode}"); os.makedirs(cdir, exist_ok=True)
    bbox, shape, tr, mask, km2 = kisi(geom)
    kat = Client.open(STAC, modifier=pc.sign_inplace)
    its = ulang(lambda: list(kat.search(collections=["sentinel-1-rtc"], bbox=list(bbox), datetime=f"{a.dari}/{a.sampai}", max_items=None).items()), 4, 10)
    its = [i for i in its if "vv" in i.assets]
    log(kode, nama, "kisi", shape, "item", len(its))
    kunci = lambda i: (i.datetime.strftime("%Y-%m-%d"), i.properties.get("sat:relative_orbit"))
    grup = {}
    for i in its:
        grup.setdefault(kunci(i), []).append(i)
    if os.path.exists(fout):
        ada = {(b["tanggal"], b["orbit"]) for b in json.load(open(fout)).get("adegan", [])}
        if set(grup) <= ada:
            log("lengkap, dilewati"); return 0
    gagal = 0
    for (tgl, orb), grp in sorted(grup.items(), key=lambda kv: (kv[0][0], str(kv[0][1]))):
        cf = os.path.join(cdir, f"{tgl}_{orb}.npz")
        if os.path.exists(cf):
            continue
        acc = None
        for i in grp:
            try:
                v = ulang(lambda: baca_vv(i.assets["vv"].href, bbox, shape, tr))
            except Exception as e:
                gagal += 1; log("  gagal", i.id[:40], repr(e)[:120]); continue
            if v is not None:
                acc = v if acc is None else np.where(np.isnan(acc), v, acc)
        if acc is None:
            continue
        db = 10 * np.log10(np.where(acc > 0, acc, np.nan))
        valid = np.isfinite(db) & mask
        if valid.sum() < MIN_TUTUP * mask.sum():
            np.savez_compressed(cf, valid=np.zeros(1, bool), water=np.zeros(1, bool)); continue   # penanda: terlalu sedikit data
        np.savez_compressed(cf, valid=valid, water=valid & (db < AMBANG_DB)); log("  ", tgl, orb)
    perm = permanen(kat, bbox, shape, tr)
    m_air = mask & ~perm if perm is not None else mask
    ad = []
    for (tgl, orb) in grup:
        cf = os.path.join(cdir, f"{tgl}_{orb}.npz")
        if os.path.exists(cf):
            z = np.load(cf)
            if z["valid"].shape == shape:
                ad.append(dict(tanggal=tgl, orbit=orb, valid=z["valid"], water=z["water"] & m_air))
    baris = air_tak_biasa(ad, mask, km2)
    json.dump(dict(kode=kode, nama=nama, km2_kab=round(float(mask.sum() * km2), 1),
                   meta=dict(dari=a.dari, sampai=a.sampai, ambang_db=AMBANG_DB, freq_maks=FREQ_MAKS, min_orbit=MIN_ORBIT, res_deg=DEG,
                             gsw=perm is not None, adegan_stac=len(grup), adegan_terpakai=len(ad),
                             dibuat=dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")), adegan=baris),
              open(fout, "w"), separators=(",", ":"))
    log("selesai", kode, len(baris), "baris; gagal baca", gagal)
    return 1 if gagal and not baris else 0


def uji():
    import numpy as np
    # 1) wilayah: pasangan senama terpisah, poligon Pahuwato kedua tak mengacaukan
    n1, g1 = geom_kab("3202"); n2, g2 = geom_kab("3272")
    assert (n1, n2) == ("Sukabumi", "Kota Sukabumi") and titik(g1) != titik(g2)
    assert len(titik(geom_kab("7502")[1])) > 10   # Boalemo/Pohuwato sebaris; cukup bahwa tak melempar
    # 2) hitung: 8 adegan satu orbit; piksel (0,0) selalu basah (sawah/sungai), (1,1) basah hanya di adegan ke-3 (banjir), (2,2) di luar kab
    H = W = 4; mask = np.ones((H, W), bool); mask[2, 2] = False
    ad = []
    for k in range(8):
        w = np.zeros((H, W), bool); w[0, 0] = True
        if k == 3: w[1, 1] = True; w[2, 2] = True
        ad.append(dict(tanggal=f"2024-01-{k + 1:02d}", orbit=10, valid=np.ones((H, W), bool), water=w))
    ad.append(dict(tanggal="2024-02-01", orbit=99, valid=np.ones((H, W), bool), water=np.ones((H, W), bool)))   # orbit < MIN_ORBIT: dilewati
    b = air_tak_biasa(ad, mask, 2.0)
    assert len(b) == 8 and all(x["orbit"] == 10 for x in b)
    assert [x["km2"] for x in b] == [0, 0, 0, 2.0, 0, 0, 0, 0], b
    assert b[3]["fraksi"] == round(1 / 15, 5) and b[3]["teramati"] == 1.0
    # 3) daftar prioritas dipakai ulang
    assert PL.urut_kab([["A", 2020, "banjir", 5], ["B", 2020, "banjir", 9], ["C", 2020, "longsor", 99]], ["A", "B", "C"]) == ["B", "A", "C"]
    print("s1_genangan uji OK")
    return 0


if __name__ == "__main__":
    p = argparse.ArgumentParser(); s = p.add_subparsers(dest="c", required=True)
    k = s.add_parser("kab"); k.add_argument("--kode", required=True); k.add_argument("--dari", required=True)
    k.add_argument("--sampai", required=True); k.add_argument("--keluar", required=True)
    s.add_parser("daftar_kab"); s.add_parser("uji")
    a = p.parse_args()
    sys.exit({"kab": cmd_kab, "daftar_kab": PL.cmd_daftar, "uji": lambda _=None: uji()}[a.c](a))
