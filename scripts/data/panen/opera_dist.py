"""NASA OPERA DIST-ALERT-HLS (gangguan vegetasi 30 m) -> public/data/opera_dist.json   (LAB untuk raster: numpy + rasterio)

PEMBANDING luas, BUKAN luas terbakar resmi dan BUKAN model prediksi. DIST-ALERT mendeteksi SEMUA gangguan vegetasi (tebang, panen, banjir, api),
jadi tiap sel gangguan diiris dengan titik panas sistem kita (ruang dan waktu) sebelum disebut "beririsan hotspot". Keluaran memisahkan
gangguan_total dan gangguan_irisan_hotspot per kabupaten per pekan, plus bagian di gambut (public/data/lahan/gambut.geojson).
Angka resmi karhutla di layar tetap hanya dari sistem sendiri; berkas ini memperkuat metode uji luas (ujiluas_kab.py membacanya).

Pakai:  python3 opera_dist.py katalog [dari sampai]    # CMR tanpa login: jumlah granul, ubin, tarikh terbaru, latensi (jaringan)
        python3 opera_dist.py jalan [dari sampai] [--uji2023]  # --uji2023: tulis ke public/data/opera_dist_2023.json (dibaca ujiluas_kab.py), tidak menyentuh berkas bawaan; # unduh + olah + tulis public/data/opera_dist.json (EARTHDATA_TOKEN + numpy + rasterio)
        python3 opera_dist.py uji                       # self-check logika irisan, tanpa jaringan
        (dari/sampai = YYYY-MM-DD UTC; bawaan 8 pekan terakhir yang sudah terbit, pekan penuh Senin-Minggu)
Kunci: EARTHDATA_TOKEN dari env (token Bearer akun Earthdata), TIDAK pernah ditulis ke berkas/log, dan tidak dikirim ke host lain saat redirect.
Tanpa token: berkas keluaran berisi status "menunggu_kunci" + statistik katalog nyata; berkas berstatus "ok" tidak pernah ditimpa stub.

Metode (semua konstanta dinyatakan di keluaran):
  piksel gangguan = VEG-DIST-STATUS 1..8 dan VEG-DIST-DATE (hari sejak 2020-12-31) jatuh di jendela. 1 piksel = 30x30 m = 0,09 ha.
  Kelas (PSD JPL D-108277): KONFIRMASI = 3,6,7,8; PERTAMA/PROVISIONAL = 1,2,4,5. Keluaran memisahkan ha_total (semua) dan ha_konfirmasi.
  Cache granul menyimpan SEMUA tanggal (tanpa saringan jendela); jendela disaring di gabung_granul.
  Dikumpulkan ke sel 0,003 derajat (~330 m) per hari gangguan; antar granul (pengamatan ulang ubin sama, tumpang tindih ubin) diambil MAKSIMUM, bukan jumlah.
  Irisan: sel gangguan "beririsan hotspot" bila ada titik panas VIIRS (n/h bila dari CSV FIRMS) dalam RADIUS_SEL sel (~1 km) dan
  dalam [tanggal_gangguan - 14 hari, tanggal_gangguan + 3 hari] (api mendahului bekas yang terdeteksi; awan tropis menunda deteksi).
  Bila data titik panas yang tersedia TIDAK menutup seluruh jendela itu (mis. CI hanya punya hotspot.json 7 hari), irisan = null (bukan 0) dan ditandai di keluaran.
  Kabupaten dan gambut = titik tengah sel (wilayah.py). Pekan = Senin tanggal gangguan (UTC).
Keterbatasan: tanggal gangguan = deteksi pertama (bisa tertunda awan), sel 330 m kasar di tepi kabupaten, irisan hotspot bukan bukti api
  (tebang di dekat api ikut terhitung), piksel tertutup awan tidak teramati sehingga angka cenderung rendah, bukan batas atas.
"""
import collections, datetime as dt, glob, json, math, os, sys, time, urllib.parse, urllib.request, urllib.error

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from panen_util import tulis, http_json, UA  # noqa: E402

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
KELUAR = os.path.join(RAIZ, "public", "data", "opera_dist.json")
KELUAR_2023 = os.path.join(RAIZ, "public", "data", "opera_dist_2023.json")
CACHE = os.path.join(RAIZ, "data", "raw", "opera_dist")
CMR = "https://cmr.earthdata.nasa.gov/search/granules.json"
SHORT = "OPERA_L3_DIST-ALERT-HLS_V1"
KOTAK = "95,-11,141,6"
EPOCH = dt.date(2020, 12, 31)
HA_PIKSEL = 30 * 30 / 10000
KONFIRMASI = (3, 6, 7, 8)   # PSD JPL D-108277; 1,2,4,5 = pertama/provisional
HOST_URS = "urs.earthdata.nasa.gov"
SEL = 0.003
RADIUS_SEL = 3
JENDELA = (-14, 3)          # hari: titik panas relatif terhadap tanggal gangguan
PEKAN_BAWAAN = 8
ATRIBUSI = ("NASA OPERA / JPL, Land Surface Disturbance Alert from HLS (OPERA_L3_DIST-ALERT-HLS_V1), "
            "doi:10.5067/SNWG/OPERA_L3_DIST-ALERT-HLS_V1.001; didistribusikan LP DAAC (NASA Earthdata)")
LISENSI = "NASA Earthdata open data: bebas dipakai dengan atribusi, tanpa jaminan (Earthdata Data Use Policy)"
LABEL = "indeks pembanding gangguan vegetasi; bukan luas terbakar resmi, bukan model prediksi"


# ---------------------------------------------------------------- logika murni (diuji)
def sel_dari(lon, lat):
    return (round(lat / SEL), round(lon / SEL))


def senin(d):
    return d - dt.timedelta(days=d.weekday())


def gabung_granul(kumpul, sel_hari, lo=None, hi=None):
    """sel_hari {(i,j,hari): (total_px, konfirmasi_px)} dari SATU granul; konfirmasi adalah subset total.
    Antar granul ambil MAKSIMUM per (sel, hari) untuk total dan untuk konfirmasi, tidak dijumlah dan tidak dipisah per kelas
    (piksel yang naik provisional -> confirmed antar granul tidak terhitung dua kali). Selalu konfirmasi <= total.
    lo/hi = hari (sejak EPOCH) jendela; granul dari cache memuat semua tanggal, disaring di sini."""
    for k, (t, c) in sel_hari.items():
        if (lo is not None and k[2] < lo) or (hi is not None and k[2] > hi):
            continue
        t0, c0 = kumpul.get(k, (0, 0))
        t, c = max(t, t0), max(c, c0)
        kumpul[k] = (t, min(c, t))
    return kumpul


def indeks_titik(titik):
    """titik [(lon, lat, date)] -> {sel: [ordinal hari]} yang sudah dilebarkan ke RADIUS_SEL sekitar tiap titik."""
    ix = collections.defaultdict(list)
    for lon, lat, d in titik:
        a, b = sel_dari(lon, lat)
        o = d.toordinal()
        for i in range(a - RADIUS_SEL, a + RADIUS_SEL + 1):
            for j in range(b - RADIUS_SEL, b + RADIUS_SEL + 1):
                ix[(i, j)].append(o)
    return ix


def beririsan(ix, sel, hari):
    o = (EPOCH + dt.timedelta(days=hari)).toordinal()
    return any(o + JENDELA[0] <= t <= o + JENDELA[1] for t in ix.get(sel, ()))


def tercakup(cov, hari):
    """Apakah titik panas tersedia utuh untuk jendela irisan hari gangguan ini? cov = (tgl_awal, tgl_akhir) atau None."""
    if not cov:
        return False
    o = (EPOCH + dt.timedelta(days=hari)).toordinal()
    return cov[0].toordinal() <= o + JENDELA[0] and o + JENDELA[1] <= cov[1].toordinal()


def agregat(kumpul, ix, cari_kab, cari_gambut, cov=None):
    """kumpul {(i,j,hari): (piksel_total, piksel_konfirmasi)}
    -> {(prov, kab, pekan): [total, konfirmasi, irisan, irisan_konfirmasi, gb_total, gb_irisan]} dalam ha.
    Kolom irisan (indeks 2, 3, 5) = None bila ada sel-hari dalam baris itu yang jendela titik panasnya tak tertutup `cov`."""
    out, buta = {}, set()
    for (i, j, hari), (n, nk) in kumpul.items():
        lon, lat = j * SEL, i * SEL
        w = cari_kab(lon, lat)
        if not w:
            continue
        pk = (w[0], w[1], senin(EPOCH + dt.timedelta(days=hari)).isoformat())
        r = out.setdefault(pk, [0.0] * 6)
        ha, gb = n * HA_PIKSEL, cari_gambut(lon, lat)
        ada = tercakup(cov, hari)
        api = ada and beririsan(ix, (i, j), hari)
        if not ada:
            buta.add(pk)
        r[0] += ha
        r[1] += nk * HA_PIKSEL
        r[2] += ha if api else 0
        r[3] += nk * HA_PIKSEL if api else 0
        r[4] += ha if gb else 0
        r[5] += ha if (api and gb) else 0
    for pk in buta:
        for c in (2, 3, 5):
            out[pk][c] = None
    return out


def entri_ke_url(e):
    """Entri CMR -> {lapisan: url https protected}; hanya STATUS dan DATE yang dipakai."""
    u = {}
    for l in e.get("links", ()):
        h = l.get("href", "")
        if h.startswith("https://") and "lp-prod-protected" in h:
            for lap in ("VEG-DIST-STATUS", "VEG-DIST-DATE"):
                if h.endswith("_" + lap + ".tif"):
                    u[lap] = h
    return u


# ---------------------------------------------------------------- katalog (tanpa login)
def periode_bawaan():
    """Pekan penuh terakhir yang sudah ~8 hari terbit (granul terbaru terbit ~3 hari setelah akuisisi)."""
    akhir = senin(dt.datetime.now(dt.timezone.utc).date() - dt.timedelta(days=8))
    return akhir - dt.timedelta(weeks=PEKAN_BAWAAN), akhir - dt.timedelta(days=1)


def katalog(a, b, halaman=2000, maks=20000):
    """-> (entri, jumlah_hits). CMR menerima page_size<=2000; halaman diulang sampai habis."""
    ent, hits = [], 0
    for p in range(1, maks // halaman + 1):
        q = urllib.parse.urlencode({"short_name": SHORT, "bounding_box": KOTAK, "page_size": halaman, "page_num": p,
                                    "temporal": f"{a.isoformat()}T00:00:00Z,{b.isoformat()}T23:59:59Z"})
        req = urllib.request.Request(f"{CMR}?{q}", headers={"User-Agent": UA})
        for i in range(4):
            try:
                with urllib.request.urlopen(req, timeout=120) as r:
                    hits = int(r.headers.get("CMR-Hits", 0))
                    es = json.load(r)["feed"]["entry"]
                break
            except Exception:
                if i == 3:
                    raise
                time.sleep(2 ** (i + 1))
        ent += es
        if len(ent) >= hits or not es:
            break
    return ent, hits


def ringkas_katalog(ent, hits):
    ub = {e["title"].split("_")[3] for e in ent}
    ak = sorted(e["time_start"] for e in ent)
    lat = []
    for e in ent:
        p = e["title"].split("_")  # ..._T53MLV_<akuisisi>_<terbit>_...
        try:
            f = lambda s: dt.datetime.strptime(s, "%Y%m%dT%H%M%SZ")
            lat.append((f(p[5]) - f(p[4])).total_seconds() / 86400)
        except Exception:
            pass
    lat.sort()
    return {"granul": hits, "diambil": len(ent), "ubin": len(ub), "akuisisi_awal": ak[0] if ak else None, "akuisisi_akhir": ak[-1] if ak else None,
            "latensi_median_hari": round(lat[len(lat) // 2], 1) if lat else None}


# ---------------------------------------------------------------- unduh (token) + raster (lab)
class _TanpaRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def unduh(url, token):
    """GET dengan Bearer; redirect diikuti manual. Token HANYA ke host asal (lpdaac) dan urs.earthdata.nasa.gov, cocok host PERSIS
    (bukan substring), tidak pernah ke S3/CloudFront. Jawaban HTML (halaman login) ditolak."""
    ok_host = {urllib.parse.urlparse(url).hostname, HOST_URS}
    op = urllib.request.build_opener(_TanpaRedirect)
    for _ in range(5):
        h = {"User-Agent": UA}
        if urllib.parse.urlparse(url).hostname in ok_host and urllib.parse.urlparse(url).scheme == "https":
            h["Authorization"] = "Bearer " + token
        try:
            with op.open(urllib.request.Request(url, headers=h), timeout=300) as r:
                if "text/html" in r.headers.get("Content-Type", ""):
                    raise RuntimeError("HTTP 401 jawaban HTML (halaman login), token ditolak")
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (301, 302, 303, 307, 308):
                url = urllib.parse.urljoin(url, e.headers["Location"])
                continue
            raise RuntimeError(f"HTTP {e.code} (token Earthdata ditolak/kedaluwarsa?)" if e.code in (401, 403) else f"HTTP {e.code}") from None
    raise RuntimeError("redirect berulang")


def olah_granul(b_status, b_date):
    """Dua GeoTIFF (bytes) -> {(i,j,hari): (piksel_total, piksel_konfirmasi)} SEMUA tanggal gangguan (tanpa saringan jendela; cache bebas jendela). Butuh numpy + rasterio."""
    import numpy as np
    import rasterio
    from rasterio.warp import transform
    from rasterio.io import MemoryFile
    with MemoryFile(b_status) as m1, MemoryFile(b_date) as m2:
        with m1.open() as s1, m2.open() as s2:
            st, da = s1.read(1), s2.read(1)
            ok = (st >= 1) & (st <= 8) & (da > 0)
            ry, rx = np.nonzero(ok)
            if not len(ry):
                return {}
            xs, ys = rasterio.transform.xy(s1.transform, ry, rx)
            lon, lat = transform(s1.crs, "EPSG:4326", list(xs), list(ys))
            ci, cj = np.round(np.array(lat) / SEL).astype(int), np.round(np.array(lon) / SEL).astype(int)
            kl = np.isin(st[ok], KONFIRMASI)
            xyz = np.stack([ci, cj, da[ok].astype(int)], 1)
            k, n = np.unique(xyz, axis=0, return_counts=True)
            out = {(int(x[0]), int(x[1]), int(x[2])): [int(c), 0] for x, c in zip(k, n)}
            if kl.any():
                k2, n2 = np.unique(xyz[kl], axis=0, return_counts=True)
                for x, c in zip(k2, n2):
                    out[(int(x[0]), int(x[1]), int(x[2]))][1] = int(c)
            return out


# ---------------------------------------------------------------- titik panas sistem
def muat_titik(a, b):
    """Titik VIIRS dari CSV FIRMS lokal (n/h) bila ada, kalau tidak dari public/data/hotspot.json (keyakinan >= nominal).
    -> (titik, deskripsi, cakupan) ; cakupan = (tgl_awal, tgl_akhir) data titik panas yang TERSEDIA (bukan sekadar yang kebetulan ada titiknya)."""
    lo, hi = a + dt.timedelta(days=JENDELA[0]), b + dt.timedelta(days=JENDELA[1])
    t, cov = [], []
    ber = [p for p in glob.glob(os.path.join(RAIZ, "data/raw/firms/viirs*.csv")) if os.path.getsize(p)]
    for p in ber:
        import csv
        d0 = d1 = None
        with open(p) as f:
            for r in csv.DictReader(f):
                d = r.get("acq_date", "")
                if not d:
                    continue
                d0, d1 = (d if d0 is None or d < d0 else d0), (d if d1 is None or d > d1 else d1)
                if lo.isoformat() <= d <= hi.isoformat() and r.get("confidence") in ("n", "h"):
                    t.append((float(r["longitude"]), float(r["latitude"]), dt.date.fromisoformat(d)))
        if d0:
            cov.append((dt.date.fromisoformat(d0), dt.date.fromisoformat(d1)))
    if t:
        return t, "VIIRS NOAA-20/21/S-NPP keyakinan n/h, CSV FIRMS data/raw/firms", (max(c[0] for c in cov), min(c[1] for c in cov))
    j = json.load(open(os.path.join(RAIZ, "public/data/hotspot.json")))
    ac = dt.date.fromisoformat(j["acuan"][:10])
    K = {k: i for i, k in enumerate(j["kolom"])}
    for r in j["baris"]:
        if r[K["sensor"]] in ("M",) or r[K["keyakinan"]] < 1:
            continue
        m, d = map(int, r[K["tgl_wib"]].split("-"))
        tg = dt.date(ac.year - (1 if m > ac.month else 0), m, d)
        if lo <= tg <= hi:
            t.append((r[K["lon"]], r[K["lat"]], tg))
    return t, "VIIRS N/N20/N21 keyakinan >= nominal, public/data/hotspot.json (hanya ~7 hari terakhir)", (ac - dt.timedelta(days=6), ac)


# ---------------------------------------------------------------- jalan
def tulis_keluaran(keluar, status, a, b, kat, ket, baris=None, titik_ket=None, ntitik=0, cov=None):
    out = {"status": status, "dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "label": LABEL,
           "sumber": SHORT, "atribusi": ATRIBUSI, "lisensi": LISENSI, "periode": [a.isoformat(), b.isoformat()], "katalog": kat,
           "metode": {"piksel_ha": HA_PIKSEL, "sel_derajat": SEL, "radius_sel": RADIUS_SEL, "radius_km_kira2": round(RADIUS_SEL * SEL * 111, 2),
                      "jendela_hari_titik_vs_gangguan": list(JENDELA), "titik_panas": titik_ket, "jumlah_titik": ntitik,
                      "titik_panas_tersedia": [c.isoformat() for c in cov] if cov else None,
                      "status_piksel": "VEG-DIST-STATUS 1..8; konfirmasi = 3,6,7,8, pertama/provisional = 1,2,4,5 (PSD JPL D-108277); tanggal VEG-DIST-DATE",
                      "antar_granul": "maksimum per sel-hari untuk total dan untuk konfirmasi (konfirmasi subset total, tidak dijumlah lintas kelas/granul)", "pekan": "Senin UTC",
                      "irisan_null": "null = data titik panas tidak menutup jendela irisan untuk sebagian/seluruh gangguan baris itu; BUKAN nol"},
           "kolom": ["prov", "kab", "pekan", "ha_total", "ha_konfirmasi", "ha_irisan_hotspot", "ha_irisan_hotspot_konfirmasi", "ha_gambut_total", "ha_gambut_irisan_hotspot"],
           "baris": baris or [], "keterangan": ket}
    if baris:
        def s(i):
            v = [r[i] for r in baris]
            return None if any(x is None for x in v) else round(sum(v), 1)
        out["jumlah"] = {k: s(3 + n) for n, k in enumerate(out["kolom"][3:])}
    n = tulis(keluar, out)
    print(f"{keluar}: {n/1e3:.0f} KB, status {status}")


def sudah_ok(keluar):
    try:
        return json.load(open(keluar)).get("status") == "ok"
    except Exception:
        return False


def jalan(a, b, keluar=KELUAR):
    ent, hits = katalog(a, b)
    kat = ringkas_katalog(ent, hits)
    print("katalog:", kat)
    token = os.environ.get("EARTHDATA_TOKEN", "").strip()
    if not token:
        print("MENUNGGU KUNCI: EARTHDATA_TOKEN tidak ada di env; hanya katalog yang dicatat.")
        if not sudah_ok(keluar):
            tulis_keluaran(keluar, "menunggu_kunci", a, b, kat, "Katalog CMR nyata; unduhan raster menunggu EARTHDATA_TOKEN. Belum ada angka luas.")
        return
    try:
        import numpy, rasterio  # noqa: F401
    except ImportError:
        print("GAGAL: numpy/rasterio tidak terpasang (jalur lab saja)."); sys.exit(1)
    from wilayah import Wilayah, Poligon
    os.makedirs(CACHE, exist_ok=True)
    lo, hi = (a - EPOCH).days, (b - EPOCH).days
    kumpul, gagal = {}, 0
    for n, e in enumerate(ent):
        u = entri_ke_url(e)
        if len(u) < 2:
            gagal += 1
            continue
        cb = os.path.join(CACHE, e["title"] + ".json")
        if os.path.exists(cb):
            sh = {tuple(map(int, k.split(","))): tuple(v) for k, v in json.load(open(cb)).items()}
        else:
            try:
                sh = olah_granul(unduh(u["VEG-DIST-STATUS"], token), unduh(u["VEG-DIST-DATE"], token))
            except Exception as ex:
                gagal += 1
                print("gagal", e["title"][-40:], str(ex)[:80], file=sys.stderr)
                if gagal > 20 and "ditolak" in str(ex):
                    break
                continue
            json.dump({",".join(map(str, k)): v for k, v in sh.items()}, open(cb, "w"))
        gabung_granul(kumpul, sh, lo, hi)
        if n % 50 == 0:
            print(f"{n}/{len(ent)} granul, {len(kumpul)} sel-hari", file=sys.stderr, flush=True)
    if gagal > len(ent) // 4:
        print(f"GAGAL: {gagal}/{len(ent)} granul tak terolah; berkas tidak ditulis."); sys.exit(1)
    titik, tket, cov = muat_titik(a, b)
    ix = indeks_titik(titik)
    wil, gb = Wilayah(), Poligon(os.path.join(RAIZ, "public/data/lahan/gambut.geojson"))
    ag = agregat(kumpul, ix, wil.cari, gb.cari, cov)
    baris = [[k[0], k[1], k[2]] + [None if x is None else round(x, 1) for x in v] for k, v in sorted(ag.items())]
    tulis_keluaran(keluar, "ok", a, b, kat, f"{gagal} granul tak terolah; angka rendah-bias karena awan.", baris, tket, len(titik), cov)


# ---------------------------------------------------------------- uji
def uji():
    # tanggal: hari 1 = 2021-01-01 (Jumat) -> pekan Senin 2020-12-28
    assert senin(EPOCH + dt.timedelta(days=1)).isoformat() == "2020-12-28"
    # antar granul: maksimum per (sel, hari), TIDAK dijumlah lintas granul maupun lintas kelas.
    # granul 1: 10 px provisional (konf 0); granul 2: piksel yang sama naik jadi confirmed (10 total, 10 konf); granul 3: 12 total, 5 konf
    k = gabung_granul({}, {(1, 1, 5): (10, 0)}); gabung_granul(k, {(1, 1, 5): (10, 10), (2, 2, 5): (3, 0)}); gabung_granul(k, {(1, 1, 5): (12, 5)})
    assert k == {(1, 1, 5): (12, 10), (2, 2, 5): (3, 0)}, k      # BUKAN 20/22 total
    assert all(c <= t for t, c in k.values())
    # cache bebas jendela: saringan tanggal dilakukan di gabung_granul
    k = gabung_granul({}, {(1, 1, 4): (1, 1), (1, 1, 5): (2, 1), (1, 1, 9): (3, 0), (1, 1, 10): (4, 4)}, 5, 9)
    assert sorted(x[2] for x in k) == [5, 9], k
    # kelas status: 7 dan 8 (confirmed finished) konfirmasi; 1,2,4,5 pertama/provisional
    assert set(KONFIRMASI) == {3, 6, 7, 8} and not {1, 2, 4, 5} & set(KONFIRMASI)
    # irisan: titik 2 sel dari sel gangguan, 10 hari sebelum -> ya; 15 hari sebelum -> tidak; 4 hari sesudah -> tidak; 3 sesudah -> ya; 5 sel jauh -> tidak
    hari = 100; tg = EPOCH + dt.timedelta(days=hari)
    lon, lat = 105.0, -2.0; i, j = sel_dari(lon, lat)
    mk = lambda dlt, dj=2: (lon + dj * SEL, lat, tg + dt.timedelta(days=dlt))
    for dlt, dj, mau in [(-10, 2, True), (-14, 2, True), (-15, 2, False), (3, 2, True), (4, 2, False), (-5, RADIUS_SEL + 2, False), (-5, RADIUS_SEL, True)]:
        assert beririsan(indeks_titik([mk(dlt, dj)]), (i, j), hari) is mau, (dlt, dj, mau)
    assert not beririsan(indeks_titik([]), (i, j), hari)
    # agregat: sel (i,j) 100 px konfirmasi irisan mineral; (i,j+40) 50 px provisional gambut tak irisan; (i+40,j) 20 px konfirmasi di kab yang sama, tak irisan
    kum = {(i, j, hari): (100, 100), (i, j + 40, hari): (50, 0), (i + 40, j, hari): (20, 20)}
    ix = indeks_titik([mk(-3)])
    kab = lambda lo, la: ("16", "OKI") if la > -2.1 else None
    gam = lambda lo, la: lo > 105.05
    pekan = senin(tg).isoformat()
    cov = (tg - dt.timedelta(days=30), tg + dt.timedelta(days=10))
    ag = agregat(kum, ix, kab, gam, cov)
    assert set(ag) == {("16", "OKI", pekan)}, ag
    v = ag[("16", "OKI", pekan)]
    assert v[1] <= v[0] and v[3] <= v[2], v   # konfirmasi subset total
    h = lambda n: round(n * HA_PIKSEL, 2)
    assert [round(x, 2) for x in v] == [h(170), h(120), h(100), h(100), h(50), 0.0], v
    # titik panas tidak menutup jendela [hari-14, hari+3] -> irisan None (bukan 0); total tetap ada
    assert tercakup(cov, hari) and not tercakup((tg - dt.timedelta(days=5), tg + dt.timedelta(days=5)), hari)
    assert not tercakup((tg - dt.timedelta(days=14), tg + dt.timedelta(days=2)), hari) and tercakup((tg - dt.timedelta(days=14), tg + dt.timedelta(days=3)), hari) and not tercakup(None, hari)
    for kosong in (None, (tg - dt.timedelta(days=5), tg + dt.timedelta(days=5))):
        v = agregat(kum, ix, kab, gam, kosong)[("16", "OKI", pekan)]
        assert v[2] is None and v[3] is None and v[5] is None and round(v[0], 2) == h(170) and round(v[4], 2) == h(50), v
    # entri CMR: hanya STATUS dan DATE https protected
    p = "https://data.lpdaac.earthdatacloud.nasa.gov/lp-prod-protected/X/X"
    e = {"links": [{"href": p + "_VEG-DIST-STATUS.tif"}, {"href": p + "_VEG-DIST-DATE.tif"}, {"href": p + "_VEG-IND.tif"}, {"href": "s3://lp-prod-protected/X/X_VEG-DIST-DATE.tif"}]}
    assert entri_ke_url(e) == {"VEG-DIST-STATUS": p + "_VEG-DIST-STATUS.tif", "VEG-DIST-DATE": p + "_VEG-DIST-DATE.tif"}
    # ringkas katalog: latensi dari dua stempel di nama granul
    r = ringkas_katalog([{"title": "OPERA_L3_DIST-ALERT-HLS_T53MLV_20261101T011943Z_20261103T022729Z_L8_30_v1", "time_start": "2026-11-01T01:19:43Z"}], 1)
    assert r["ubin"] == 1 and r["latensi_median_hari"] == 2.0, r
    print("opera_dist OK")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    elif a[:1] in (["katalog"], ["jalan"]):
        pos = [x for x in a[1:] if not x.startswith("--")]
        d0, d1 = (dt.date.fromisoformat(pos[0]), dt.date.fromisoformat(pos[1])) if len(pos) == 2 else periode_bawaan()
        if a[0] == "katalog":
            ent, hits = katalog(d0, d1)
            print(d0, d1, ringkas_katalog(ent, hits))
            print("contoh url:", entri_ke_url(ent[0]) if ent else None)
        else:
            jalan(d0, d1, KELUAR_2023 if "--uji2023" in a else KELUAR)
    else:
        print(__doc__)
