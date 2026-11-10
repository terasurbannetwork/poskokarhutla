"""NASA OPERA DSWx-S1 (air permukaan 30 m dari radar Sentinel-1, tembus awan) per kabupaten-hari -> public/banjir/data/opera_dswx.json

Dua tahap:
  katalog  CMR (tanpa login, diuji 10 Nov 2026): granul OPERA_L3_DSWX-S1_V1 di kotak Indonesia, per hari akuisisi (UTC) dan ubin MGRS.
           Granul terbit ~1 hari sesudah akuisisi. Jalan di workflow, stdlib, tanpa kunci. Menulis `katalog` di opera_dswx.json.
  proses   unduh B01_WTR (GeoTIFF COG ~2-4 MB/granul, di PO.DAAC; WAJIB EARTHDATA_TOKEN dari env, tidak ditulis ke berkas) dan hitung
           luas air per kabupaten. Butuh numpy+rasterio -> jalur lab/lokal (bukan stdlib); yang di-commit hanya agregat kab-hari.
           Tanpa token atau tanpa numpy/rasterio: berhenti dengan status MENUNGGU KUNCI, katalog tetap ditulis.
Kelas WTR (PSD DSWx-S1, JPL D-108761 Rev A): 0 bukan air, 1 air terbuka, 3 vegetasi tergenang, 250 mask HAND, 251 layover/bayangan radar,
255 isian; kelas 2 TIDAK ada (itu skema DSWx-HLS). Valid = {0, 1, 3}; air terbuka dan vegetasi tergenang disimpan terpisah. Tag GeoTIFF contoh pertama
disimpan di `tag_geotiff` saat proses jalan, untuk dicocokkan manual.
Air permanen: produk tidak punya kelas itu dan laut keluar karena hanya piksel di dalam poligon kecamatan yang dihitung. Indeks per kabupaten-hari =
`di_atas_min_ha` = air terbuka dikurangi (porsi air minimum dari pengamatan SEBELUM hari itu dalam 60 hari terakhir x valid), minimal 5 pengamatan sebelumnya.
Ini INDEKS "air di atas minimum 60 hari terakhir", BUKAN luas genangan. Nilainya DIBEKUKAN saat hari itu pertama ditulis (tidak dihitung ulang).
Ubin tumpang tindih: satu sel ~300 m dihitung sekali per hari (ubin pertama menang).
Keluaran = indeks radar, bukan model prediksi, belum diuji balik terhadap GFM/MCDWD (lihat `bandingkan`).

Pemakai: `bandingkan()` menyilangkan kab-hari DSWx (di_atas_min_ha > ambang) dengan mcdwd.json (f > 0, valid >= 0,5) dan hasilnya ditulis di
opera_dswx.json["silang_mcdwd"] -> dibaca penilaian label (sambung ke label_bersatu_v3 setelah v2 dibuka; v1 dan v2 BEKU, tidak disentuh).

Pakai:  python3 scripts/banjir/opera_dswx.py katalog [--hari 14]
        python3 scripts/banjir/opera_dswx.py proses [--hari 14]      EARTHDATA_TOKEN=... (lab)
        python3 scripts/banjir/opera_dswx.py uji
Berkas: opera_dswx.json (bergulir 60 hari, < 2 MB); mentah sementara di data/raw/banjir/opera_dswx/ (git-ignore).
Atribusi: NASA OPERA DSWx-S1 (JPL, PO.DAAC), data terbuka NASA Earthdata.
"""
import datetime as dt, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, MENTAH, WIB, baca, simpan

CMR = "https://cmr.earthdata.nasa.gov/search/granules.json"
KOTAK = "95,-11,141,6"
PRODUK = "OPERA_L3_DSWX-S1_V1"
UA = "poskobanjir/1.0 (+https://centurisk97.id)"
BERKAS, DIR = os.path.join(KELUAR, "opera_dswx.json"), os.path.join(MENTAH, "opera_dswx")
MCDWD = os.path.join(KELUAR, "mcdwd.json")
GULIR, MIN_PENGAMATAN, AMBANG_HA, HA_PIKSEL_MCDWD = 60, 5, 100.0, 380.0   # piksel MCDWD GIBS L5 ~1,95 km x 1,95 km
ATRIBUSI = "NASA OPERA DSWx-S1 V1 (JPL, PO.DAAC; Sentinel-1 ESA/Copernicus); diringkas per kabupaten oleh Centurisk97."
LISENSI = "NASA Earthdata Data Use Policy (terbuka, sebutkan sumber); Sentinel-1 bebas dengan atribusi Copernicus"
ID_RE = re.compile(r"OPERA_L3_DSWx-S1_(T\w+?)_(\d{8})T(\d{6})Z_")


def granul(hari, maks_halaman=10):
    """Granul CMR `hari` hari terakhir -> [(tgl_akuisisi ISO, ubin, url WTR)]."""
    a = (dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=hari)).strftime("%Y-%m-%dT00:00:00Z")
    out = []
    for h in range(1, maks_halaman + 1):
        q = urllib.parse.urlencode({"short_name": PRODUK, "bounding_box": KOTAK, "temporal": a + ",", "page_size": 2000, "page_num": h})
        with urllib.request.urlopen(urllib.request.Request(f"{CMR}?{q}", headers={"User-Agent": UA}), timeout=90) as r:
            e = json.loads(r.read())["feed"]["entry"]
        for x in e:
            m = ID_RE.search(x["producer_granule_id"])
            wtr = next((l["href"] for l in x["links"] if l["href"].endswith("_B01_WTR.tif")), None)
            if m and wtr:
                d = m.group(2)
                out.append((f"{d[:4]}-{d[4:6]}-{d[6:]}", m.group(1), wtr))
        if len(e) < 2000:
            break
    return out


def katalog_hari(gr):
    """[(tgl, ubin, url)] -> {tgl: {"n_granul": n, "ubin": [ubin unik terurut]}}."""
    k = defaultdict(lambda: {"n_granul": 0, "ubin": set()})
    for t, u, _ in gr:
        k[t]["n_granul"] += 1
        k[t]["ubin"].add(u)
    return {t: {"n_granul": v["n_granul"], "ubin": sorted(v["ubin"])} for t, v in sorted(k.items())}


def indeks_hari(per, t):
    """per {tgl: [valid, air, veg]} kab, hari t -> air terbuka di atas minimum porsi air 60 hari SEBELUM t (ha). None bila < MIN_PENGAMATAN hari dasar,
    atau jejak tidak sebanding: valid hari t dan tiap hari dasar harus >= 50% median valid kabupaten (ubin hari parsial/lain mengubah porsi)."""
    mv = sorted(v[0] for v in per.values())[len(per) // 2]
    awal = (dt.date.fromisoformat(t) - dt.timedelta(days=GULIR)).isoformat()
    p = [v[1] / v[0] for d, v in per.items() if awal <= d < t and v[0] >= 0.5 * mv and v[0] > 0]
    if len(p) < MIN_PENGAMATAN or per[t][0] < 0.5 * mv or per[t][0] <= 0:
        return None
    return round(max(0.0, per[t][1] - min(p) * per[t][0]), 1)


def bekukan(kab_hari, beku, sekarang=None):
    """Isi beku[kab][tgl] hanya untuk hari yang belum pernah dinilai DAN berumur >= 2 hari (ubin granul terbit ~1 hari sesudah akuisisi, hari baru
    belum lengkap). Hari yang dibekukan tidak dihitung ulang."""
    batas = ((sekarang or dt.datetime.now(dt.timezone.utc).date()) - dt.timedelta(days=2)).isoformat()
    for k, per in kab_hari.items():
        b = beku.setdefault(k, {})
        for t in sorted(per):
            if t not in b and t <= batas:
                v = indeks_hari(per, t)
                if v is not None:
                    b[t] = v
    return beku


def bandingkan(idx, mc):
    """idx {kab: {tgl: ha}}, mc isi mcdwd.json -> kab-hari di kedua sumber (MCDWD valid >= 0,5). Ambang SAMA dalam hektare: DSWx > AMBANG_HA,
    MCDWD f x HA_PIKSEL_MCDWD > AMBANG_HA."""
    i_h = {t: i for i, t in enumerate(mc["hari"])}
    r = {"n_kab_hari": 0, "sama_positif": 0, "sama_negatif": 0, "hanya_dswx": 0, "hanya_mcdwd": 0}
    for k, per in idx.items():
        m = mc["kab"].get(k)
        if not m:
            continue
        for t, ha in per.items():
            i = i_h.get(t)
            if ha is None or i is None or m["v"][i] < 0.5:
                continue
            p, q = ha > AMBANG_HA, m["f"][i] * HA_PIKSEL_MCDWD > AMBANG_HA
            r["n_kab_hari"] += 1
            r["sama_positif" if p and q else "sama_negatif" if not p and not q else "hanya_dswx" if p else "hanya_mcdwd"] += 1
    return {**r, "ambang_ha": AMBANG_HA, "ha_piksel_mcdwd": HA_PIKSEL_MCDWD,
            "catatan": "bukan akurasi: kedua sumber punya bias sendiri (MCDWD ~2 km dan ikut air menetap)"}


# ------------------------------------------------------------------ proses raster (lab: numpy + rasterio)
HOST_OK = {"archive.podaac.earthdata.nasa.gov", "urs.earthdata.nasa.gov"}


def kepala(url, token):
    """Kepala permintaan: Bearer HANYA bila skema https dan host cocok PERSIS dengan HOST_OK (bukan substring); selain itu tanpa token."""
    u = urllib.parse.urlparse(url)
    h = {"User-Agent": UA}
    if u.scheme == "https" and u.hostname in HOST_OK:
        h["Authorization"] = f"Bearer {token}"
    return h


def unduh(url, token, tujuan):
    """Unduh ke PO.DAAC; pengalihan diikuti MANUAL (urljoin) dan token ikut hanya lewat kepala(), tidak pernah ke S3/CloudFront."""
    class Tak(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None
    op = urllib.request.build_opener(Tak)
    for _ in range(5):
        try:
            with op.open(urllib.request.Request(url, headers=kepala(url, token)), timeout=180) as r:
                if "text/html" in r.headers.get("Content-Type", ""):
                    raise RuntimeError("jawaban HTML (halaman login), token ditolak")
                with open(tujuan, "wb") as f:
                    f.write(r.read())
            return
        except urllib.error.HTTPError as e:
            if e.code not in (301, 302, 303, 307, 308):
                raise
            url = urllib.parse.urljoin(url, e.headers["Location"])
    raise RuntimeError("terlalu banyak pengalihan")


def hitung_blok(a, blok=10):
    """Array WTR -> (valid, air terbuka, vegetasi tergenang) per blok blok x blok piksel (numpy). Valid = kelas 0, 1, 3."""
    H, W = (a.shape[0] // blok) * blok, (a.shape[1] // blok) * blok
    b = a[:H, :W].reshape(H // blok, blok, W // blok, blok)
    return ((b == 0) | (b == 1) | (b == 3)).sum((1, 3)), (b == 1).sum((1, 3)), (b == 3).sum((1, 3))


def hitung_granul(jalur, wil, terlihat, blok=10):
    """GeoTIFF WTR -> ({kab: [valid_ha, air_ha, veg_ha]}, tag). Blok 300 m dipetakan ke kabupaten lewat pusatnya. `terlihat` = set sel (~300 m) yang
    sudah dihitung HARI itu oleh ubin lain. Blok dengan valid < 50% (tepi ubin/layover) dilewati dan TIDAK ditandai, jadi ubin tetangga yang
    mencakupnya penuh yang menghitungnya; blok >= 50% valid dihitung sekali (yang pertama menang). Batas: dua ubin yang masing-masing <50% di sel sama kehilangan sel itu."""
    import numpy as np, rasterio
    from rasterio.warp import transform
    hasil = defaultdict(lambda: [0.0, 0.0, 0.0])
    with rasterio.open(jalur) as s:
        a, ha, tag = s.read(1), abs(s.res[0] * s.res[1]) / 1e4, dict(s.tags())
        valid, air, veg = hitung_blok(a, blok)
        ys, xs = np.nonzero(valid)
        px, py = rasterio.transform.xy(s.transform, ys * blok + blok // 2, xs * blok + blok // 2)
        lon, lat = transform(s.crs, "EPSG:4326", px, py)
    for y, x, lo, la in zip(ys, xs, lon, lat):
        if valid[y, x] < 0.5 * blok * blok:
            continue
        sel = (round(lo / 0.0027), round(la / 0.0027))
        if sel in terlihat:
            continue
        k = wil.cari(lo, la)
        if k:
            terlihat.add(sel)
            r = hasil[f"{k[0]}|{k[1]}"]
            r[0] += float(valid[y, x]) * ha
            r[1] += float(air[y, x]) * ha
            r[2] += float(veg[y, x]) * ha
    return {k: [round(x, 1) for x in v] for k, v in hasil.items()}, tag


def proses(gr):
    token = os.environ.get("EARTHDATA_TOKEN")
    try:
        import numpy, rasterio  # noqa
    except ImportError:
        return "MENUNGGU KUNCI: numpy/rasterio tidak ada (jalur lab)", {}, None
    if not token:
        return "MENUNGGU KUNCI: EARTHDATA_TOKEN tidak ada di env", {}, None
    from wilayah import Wilayah
    wil = Wilayah()
    os.makedirs(DIR, exist_ok=True)
    agg, terlihat, tag0 = defaultdict(dict), defaultdict(set), None
    for t, u, url in sorted(gr):
        f = os.path.join(DIR, os.path.basename(url))
        try:
            unduh(url, token, f)
            h, tag = hitung_granul(f, wil, terlihat[t])
            tag0 = tag0 or {k: str(v)[:200] for k, v in list(tag.items())[:20]}
            for k, v in h.items():
                r = agg[k].setdefault(t, [0.0, 0.0, 0.0])
                for i in range(3):
                    r[i] += v[i]
        finally:
            if os.path.exists(f):
                os.remove(f)
        time.sleep(0.5)
    return "ok", {k: {t: [round(x, 1) for x in v] for t, v in per.items()} for k, per in agg.items()}, tag0


def main(mode, hari):
    gr = granul(hari)
    lama = baca(BERKAS, {})
    kat = {**lama.get("katalog", {}), **katalog_hari(gr)}
    kat = dict(sorted(kat.items())[-GULIR:])
    status, baru, tag = ("katalog saja", {}, None) if mode == "katalog" else proses(gr)
    kab = lama.get("kab_hari", {})
    for k, per in baru.items():
        kab.setdefault(k, {}).update(per)
    batas = sorted(kat)[0]
    kab = {k: {t: v for t, v in per.items() if t >= batas} for k, per in kab.items()}
    kab = {k: p for k, p in kab.items() if p}
    if status != "ok" and lama.get("kab_hari"):
        status = lama.get("status", status)      # katalog / MENUNGGU KUNCI tidak menimpa status proses yang sudah berisi
    beku = bekukan(kab, lama.get("di_atas_min_ha", {}))
    beku = {k: {t: v for t, v in p.items() if t >= batas} for k, p in beku.items()}
    isi = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="seconds"), "sumber": f"{CMR}?short_name={PRODUK}", "atribusi": ATRIBUSI, "lisensi": LISENSI,
           "status": status, "satuan": "hektare per kabupaten-hari: [valid, air terbuka, vegetasi tergenang]; radar, tak terhalang awan",
           "keterangan": "INDEKS radar: air terbuka di atas minimum 60 hari sebelumnya per kabupaten, dibekukan saat hari ditulis; bukan luas genangan, bukan model prediksi",
           "tag_geotiff": tag or lama.get("tag_geotiff"), "katalog": kat, "kab_hari": kab, "di_atas_min_ha": {k: p for k, p in beku.items() if p}}
    if beku and os.path.exists(MCDWD):
        isi["silang_mcdwd"] = bandingkan(beku, json.load(open(MCDWD)))
    simpan(BERKAS, isi)
    print(json.dumps({"status": status, "granul_ditemukan": len(gr), "hari": len(kat), "ubin_unik": len({u for _, u, _ in gr}),
                      "kab_hari": sum(len(p) for p in kab.values())}, ensure_ascii=False), f"{os.path.getsize(BERKAS) / 1024:.0f} KB")


def uji():
    nm = "OPERA_L3_DSWx-S1_T46NGM_20261105T115042Z_20261106T025358Z_S1D_30_v1.0"
    m = ID_RE.search(nm)
    assert m.group(1) == "T46NGM" and m.group(2) == "20261105"
    k = katalog_hari([("2026-11-05", "T1", "u"), ("2026-11-05", "T2", "u"), ("2026-11-04", "T1", "u")])
    assert list(k) == ["2026-11-04", "2026-11-05"] and k["2026-11-05"] == {"n_granul": 2, "ubin": ["T1", "T2"]}
    # indeks: air menetap 5%, hari ke-9 banjir; hanya hari SEBELUMNYA yang membentuk dasar
    per = {f"2026-11-{d:02d}": [1000.0, 50.0 + (500 if d == 9 else 0), 0.0] for d in range(1, 10)}
    assert indeks_hari(per, "2026-11-09") == 500.0 and indeks_hari(per, "2026-11-06") == 0.0 and indeks_hari(per, "2026-11-03") is None
    d12 = dt.date(2026, 11, 12)
    beku = bekukan({"31|A": per, "31|B": {"2026-11-01": [10.0, 1.0, 0.0]}}, {}, d12)
    assert beku["31|A"]["2026-11-09"] == 500.0 and not beku["31|B"]
    per["2026-11-09"] = [1000.0, 0.0, 0.0]          # data berubah: nilai beku TIDAK dihitung ulang
    assert bekukan({"31|A": per}, beku, d12)["31|A"]["2026-11-09"] == 500.0
    # hari parsial lalu lengkap: umur < 2 hari tidak dibekukan; setelah lengkap dan cukup umur baru dibekukan dengan data lengkap
    par = {f"2026-11-{d:02d}": [1000.0, 50.0, 0.0] for d in range(1, 9)}
    par["2026-11-09"] = [300.0, 15.0, 0.0]              # baru separuh ubin masuk
    assert "2026-11-09" not in bekukan({"31|A": par}, {}, dt.date(2026, 11, 10))["31|A"]
    par["2026-11-09"] = [1000.0, 550.0, 0.0]
    assert bekukan({"31|A": par}, {}, dt.date(2026, 11, 11))["31|A"]["2026-11-09"] == 500.0
    # jejak tidak sebanding: hari t parsial (valid < 50% median) dan hari dasar parsial -> null
    par["2026-11-09"] = [300.0, 15.0, 0.0]
    assert indeks_hari(par, "2026-11-09") is None
    bas = {f"2026-11-{d:02d}": [1000.0, 50.0, 0.0] for d in range(1, 9)}
    bas["2026-11-02"] = [100.0, 0.0, 0.0]               # porsi 0 palsu dari ubin kecil: tidak boleh jadi minimum
    bas["2026-11-09"] = [1000.0, 550.0, 0.0]
    assert indeks_hari(bas, "2026-11-09") == 500.0
    mc = {"hari": ["2026-11-09", "2026-11-03", "2026-11-06", "2026-11-07"], "kab": {"31|A": {"f": [7, 0, 0, 1], "v": [0.9, 0.9, 0.9, 0.1]}}}
    r = bandingkan({"31|A": {"2026-11-09": 500.0, "2026-11-03": 0.0, "2026-11-06": 0.0, "2026-11-07": 900.0}}, mc)
    assert (r["n_kab_hari"], r["sama_positif"], r["sama_negatif"], r["hanya_dswx"], r["hanya_mcdwd"]) == (3, 1, 2, 0, 0), r
    assert bandingkan({"31|A": {"2026-11-09": 50.0}}, mc)["hanya_mcdwd"] == 1   # f=7 x 380 ha > ambang, DSWx 50 < ambang
    ada = lambda u: "Authorization" in kepala(u, "T")
    assert ada("https://urs.earthdata.nasa.gov/oauth") and ada("https://archive.podaac.earthdata.nasa.gov/x.tif")
    assert not ada("http://archive.podaac.earthdata.nasa.gov/x.tif") and not ada("http://urs.earthdata.nasa.gov/x")
    assert not ada("https://urs.earthdata.nasa.gov.evil.com/x") and not ada("https://evil.com/urs.earthdata.nasa.gov")
    assert not ada("https://podaac-bucket.s3.us-west-2.amazonaws.com/x") and "T" not in str(kepala("https://evil.com/x", "T"))
    try:
        import numpy as np, rasterio
        from rasterio.transform import from_origin
    except ImportError:
        print("ok (tanpa uji raster: numpy/rasterio tidak ada)")
        return
    import tempfile
    a = np.zeros((20, 20), "uint8")
    a[:10, :10] = 1                                   # blok air terbuka
    a[:10, 10:] = 250
    a[:5, 10:] = 3                                    # blok: 50 piksel vegetasi tergenang + 50 HAND
    a[10:, :10] = 251                                 # layover: tidak valid
    h = hitung_blok(a, 10)
    assert [int(x) for x in h[0].ravel()] == [100, 50, 0, 100] and int(h[1].sum()) == 100 and int(h[2].sum()) == 50, h
    with tempfile.TemporaryDirectory() as d:
        f = os.path.join(d, "w.tif")
        with rasterio.open(f, "w", driver="GTiff", height=20, width=20, count=1, dtype="uint8", crs="EPSG:32749", transform=from_origin(500000, 9300600, 30, 30)) as o:
            o.write(a, 1)
        class W:
            cari = staticmethod(lambda lo, la: ("31", "A"))
        ter = set()
        g, tag = hitung_granul(f, W, ter)
        ha = 30 * 30 / 1e4
        assert g == {"31|A": [round(250 * ha, 1), round(100 * ha, 1), round(50 * ha, 1)]}, g
        assert hitung_granul(f, W, ter)[0] == {}, "sel yang sama pada hari yang sama tidak boleh dihitung dua kali"
        b = a.copy()
        b[:3, 10:] = 3
        b[3:10, 10:] = 251                                 # blok kanan atas: hanya 30% valid (kelas 3)
        f2 = os.path.join(d, "p.tif")
        with rasterio.open(f2, "w", driver="GTiff", height=20, width=20, count=1, dtype="uint8", crs="EPSG:32749", transform=from_origin(500000, 9300600, 30, 30)) as o:
            o.write(b, 1)
        ter = set()
        g2 = hitung_granul(f2, W, ter)[0]
        assert g2 == {"31|A": [round(200 * ha, 1), round(100 * ha, 1), 0.0]}, g2     # blok 30% valid dilewati
        g3 = hitung_granul(f, W, ter)[0]                    # ubin lain mencakup blok itu penuh: dihitung di sini, bukan hilang
        assert g3 == {"31|A": [round(50 * ha, 1), 0.0, round(50 * ha, 1)]}, g3
    print("ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a[:1] in (["katalog"], ["proses"]):
        main(a[0], int(a[a.index("--hari") + 1]) if "--hari" in a else 14)
    else:
        sys.exit(__doc__)
