"""LS-03 tarikan (paket longsor-satelit): tarik dan turunkan grid untuk pemetaan bekas longsor. TIDAK menghitung bekas, ambang, luas, atau vonis (LS-05).
Per kejadian (uji Tapanuli Tengah + kab bersentuhan; 3 kalibrasi dari bekas_kriteria.json): komposit median Sentinel-2 L2A sebelum (12 bulan) dan sesudah
(hari 3-90) per ubin MGRS, per blok 1.024 x 1.024 piksel 10 m; DEM Copernicus GLO-30 mentah; hilang tutupan Hansen (lossyear). Hanya grid turunan
yang disimpan, di data/raw/longsor/bekas/<kejadian>/ (gitignored). Kriteria TIDAK diubah; penjaga bekas.periksa_kunci() dipanggil di awal.
Batas keras: sisa disk < 5 GiB berhenti; transfer kumulatif > 30 GB berhenti; hanya HOST_OK (pengalihan ke host lain ditolak).
Penyaring yang BELUM terbangun (dilaporkan, bukan diam): topeng alur sungai OSM (tak ada sumber di repo) dan peringatan tebangan GFW (butuh kunci API).
Kuantisasi: NDVI dan MNDWI = round((nilai+1)*127) uint8, 0..254; 255 = tak ada data. Dekode: q/127-1.
Pakai (python venv ber-numpy):
  data/raw/longsor/bekas/venv/bin/python -I scripts/longsor/bekas_tarik.py uji | daftar | rencana KEJ | tarik KEJ | ringkas
"""
import datetime as dt, importlib.util, json, math, os, shutil, sys, threading, time, urllib.error, urllib.parse, urllib.request, zlib
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor

try:
    import numpy as np
except ImportError:  # `uji` tetap jalan sebagian tanpa numpy
    np = None

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
KELUAR = os.path.join(AKAR, "data/raw/longsor/bekas")
TRANSFER = os.path.join(KELUAR, "transfer.json")
UA = {"User-Agent": "poskokarhutla/1.0 (+github.com/pangantara/poskokarhutla)"}
STAC = "https://earth-search.aws.element84.com/v1/search"
HOST_OK = {"earth-search.aws.element84.com", "sentinel-cogs.s3.us-west-2.amazonaws.com", "copernicus-dem-30m.s3.amazonaws.com", "storage.googleapis.com"}
BATAS_BYTE = 30_000_000_000
BATAS_DISK = 5 * 2 ** 30
CAP_CACHE = 500_000_000
BLOK = 1024
KUANT = 127


class Berhenti(RuntimeError):
    """batas keras tercapai: tarikan berhenti dan dilaporkan"""


def _muat(nama, rel):
    if nama in sys.modules:
        return sys.modules[nama]
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    sys.modules.setdefault(nama, m)
    s.loader.exec_module(m)
    return m


# ---------------------------------------------------------------- jaringan: host tertutup, byte dihitung, batas keras
_kunci = threading.Lock()
_sesi = {"byte": 0, "dasar": None}
_host_ok = [HOST_OK]


def _total_persist():
    try:
        return json.load(open(TRANSFER)).get("total", 0)
    except OSError:
        return 0


def simpan_transfer(kej=None):
    with _kunci:
        os.makedirs(KELUAR, exist_ok=True)
        if _sesi["dasar"] is None:
            _sesi["dasar"] = _total_persist()
            _sesi["sudah"] = 0
        d = json.load(open(TRANSFER)) if os.path.exists(TRANSFER) else {"total": 0, "per_kejadian": {}}
        baru = _sesi["byte"] - _sesi.get("sudah", 0)
        d["total"] += baru
        if kej:
            d["per_kejadian"][kej] = d["per_kejadian"].get(kej, 0) + baru
        _sesi["sudah"] = _sesi["byte"]
        json.dump(d, open(TRANSFER, "w"), indent=1)
        return d["total"]


def cek_batas():
    if shutil.disk_usage(os.path.expanduser("~")).free < BATAS_DISK:
        raise Berhenti("sisa disk di bawah 5 GiB")
    if _total_persist() + _sesi["byte"] - _sesi.get("sudah", 0) > BATAS_BYTE:
        raise Berhenti("transfer kumulatif melewati 30 GB")


class _Tahan(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urllib.parse.urlparse(newurl).hostname not in _host_ok[0]:
            raise RuntimeError(f"pengalihan ke host tak diizinkan: {newurl}")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


_buka = urllib.request.build_opener(_Tahan).open


def ambil(url, rentang=None, data=None, coba=4):
    """GET/POST; rentang=(a,b) -> Range a..b-1. Host harus di HOST_OK. Byte badan dihitung."""
    if urllib.parse.urlparse(url).hostname not in _host_ok[0]:
        raise RuntimeError(f"host tak diizinkan: {url}")
    for i in range(coba):
        cek_batas()
        try:
            h = dict(UA)
            if rentang:
                h["Range"] = f"bytes={rentang[0]}-{rentang[1] - 1}"
            if data is not None:
                h["Content-Type"] = "application/json"
            with _buka(urllib.request.Request(url, data=data, headers=h), timeout=90) as r:
                b = r.read()
            with _kunci:
                _sesi["byte"] += len(b)
            return b
        except RuntimeError:
            raise
        except urllib.error.HTTPError as e:
            if e.code in (403, 404):
                raise
            if i == coba - 1:
                raise
            time.sleep(2 * (i + 1))
        except Exception:
            if i == coba - 1:
                raise
            time.sleep(2 * (i + 1))


# ---------------------------------------------------------------- COG (numpy)
_cache = OrderedDict()
_cache_byte = [0]


def buka_ubin(raw, pred, dtype, T):
    """bytes deflate -> array (T,T); prediktor 2 (horizontal) dibalik dengan cumsum bermodulo tipe."""
    a = np.frombuffer(zlib.decompress(raw), dtype=dtype).reshape(T, T)
    if pred == 2:
        a = np.cumsum(a, axis=1, dtype=a.dtype)
    return a


class COG:
    def __init__(self, url):
        c = _muat("citra_tarik", "scripts/data/citra.py")
        self.url = url
        ifd, bo = c.ifds(lambda a, b: ambil(url, (a, b)))
        t = ifd[0]
        assert bo == "<" and t[259] in (8, 32946) and t.get(277, 1) == 1, f"{url}: struktur COG tak terduga"
        self.W, self.H, self.T = t[256], t[257], t[322]
        bps = t[258][0] if isinstance(t[258], tuple) else t[258]
        self.dtype = {8: "<u1", 16: "<u2"}[bps]
        self.pred = t.get(317, 1)
        self.off = (t[324],) if isinstance(t[324], int) else t[324]
        self.cnt = (t[325],) if isinstance(t[325], int) else t[325]
        self.tx = -(-self.W // self.T)

    def ubin(self, k):
        kunci = (self.url, k)
        with _kunci:
            if kunci in _cache:
                _cache.move_to_end(kunci)
                return _cache[kunci]
        a = buka_ubin(ambil(self.url, (self.off[k], self.off[k] + self.cnt[k])), self.pred, self.dtype, self.T)
        with _kunci:
            _cache[kunci] = a
            _cache_byte[0] += a.nbytes
            while _cache_byte[0] > CAP_CACHE and len(_cache) > 1:
                _, v = _cache.popitem(last=False)
                _cache_byte[0] -= v.nbytes
        return a

    def jendela(self, r0, r1, c0, c1):
        """array (r1-r0, c1-c0) resolusi asli; di luar citra = 0."""
        out = np.zeros((r1 - r0, c1 - c0), dtype=self.dtype)
        T = self.T
        for tb in range(max(r0, 0) // T, (min(r1, self.H) - 1) // T + 1):
            for tk in range(max(c0, 0) // T, (min(c1, self.W) - 1) // T + 1):
                u = self.ubin(tb * self.tx + tk)
                ra, rb = max(r0, tb * T), min(r1, (tb + 1) * T, self.H)
                ca, cb = max(c0, tk * T), min(c1, (tk + 1) * T, self.W)
                out[ra - r0:rb - r0, ca - c0:cb - c0] = u[ra - tb * T:rb - tb * T, ca - tk * T:cb - tk * T]
        return out


# ---------------------------------------------------------------- inti murni (numpy)
def median_tumpuk(tumpuk, min_obs):
    """median per piksel dari daftar array float32 (NaN = tak bersih) -> (median, n bersih uint8); n < min_obs -> NaN."""
    a = np.stack(tumpuk)
    n = (~np.isnan(a)).sum(0)
    a.sort(0)
    k = a.shape[0]
    lo = np.take_along_axis(a, np.clip((n - 1) // 2, 0, k - 1)[None], 0)[0]
    hi = np.take_along_axis(a, np.clip(n // 2, 0, k - 1)[None], 0)[0]
    m = (lo + hi) / 2
    m[n < min_obs] = np.nan
    return m, n.astype(np.uint8)


def nisbah(a, b):
    """(a - b) / (a + b); NaN bila salah satu NaN atau penyebut <= 0."""
    s = a + b
    with np.errstate(invalid="ignore", divide="ignore"):
        r = (a - b) / s
    r[~(s > 0)] = np.nan
    return r


def kuantisasi(x):
    q = np.clip(np.rint(np.nan_to_num((x + 1) * KUANT, nan=255.0)), 0, 254).astype(np.uint8)
    q[np.isnan(x)] = 255
    return q


def refl(dn, skala, offset):
    """DN -> reflektans float32; DN 0 = tak ada data (NaN)."""
    r = dn.astype(np.float32) * skala + offset
    r[dn == 0] = np.nan
    return r


def atas2(a):
    """20 m -> 10 m (ulang piksel)."""
    return np.repeat(np.repeat(a, 2, axis=0), 2, axis=1)


def rentang_milik(pusat, tetangga_kiri, tetangga_kanan, tepi_kiri, tepi_kanan):
    """batas kepemilikan satu sumbu: titik tengah antara pusat ini dan pusat tetangga terdekat tiap sisi (tanpa tetangga -> tepi ubin)."""
    a = (pusat + tetangga_kiri) / 2 if tetangga_kiri is not None else tepi_kiri
    b = (pusat + tetangga_kanan) / 2 if tetangga_kanan is not None else tepi_kanan
    return a, b


def milik_ubin(ubin):
    """ubin: {id: {x0,y0,w,h}} dalam satu epsg -> {id: (xa,xb,yb,ya)} kotak milik (meter UTM; yb<ya) lewat titik tengah antara pusat tetangga lattice."""
    pu = {i: (u["x0"] + u["w"] * 5.0, u["y0"] - u["h"] * 5.0) for i, u in ubin.items()}
    hasil = {}
    for i, u in ubin.items():
        cx, cy = pu[i]
        kiri = [pu[j][0] for j in pu if j != i and abs(pu[j][1] - cy) < 50000 and pu[j][0] < cx]
        kanan = [pu[j][0] for j in pu if j != i and abs(pu[j][1] - cy) < 50000 and pu[j][0] > cx]
        bawah = [pu[j][1] for j in pu if j != i and abs(pu[j][0] - cx) < 50000 and pu[j][1] < cy]
        atas = [pu[j][1] for j in pu if j != i and abs(pu[j][0] - cx) < 50000 and pu[j][1] > cy]
        xa, xb = rentang_milik(cx, max(kiri) if kiri else None, min(kanan) if kanan else None, u["x0"], u["x0"] + u["w"] * 10)
        yb, ya = rentang_milik(cy, max(bawah) if bawah else None, min(atas) if atas else None, u["y0"] - u["h"] * 10, u["y0"])
        hasil[i] = (xa, xb, yb, ya)
    return hasil


def blok_dalam_poligon(x0, y0, br, bc, poli, n=9):
    """blok (br, bc) ubin berasal (x0,y0): apakah menyentuh poligon (daftar (bbox, cincin) UTM)? sampel n x n + titik sudut poligon di dalam blok."""
    xa, xb = x0 + bc * BLOK * 10, x0 + (bc + 1) * BLOK * 10
    ya, yb = y0 - br * BLOK * 10, y0 - (br + 1) * BLOK * 10
    for bb, cin in poli:
        if bb[2] < xa or bb[0] > xb or bb[3] < yb or bb[1] > ya:
            continue
        if any(xa <= x <= xb and yb <= y <= ya for x, y in cin):
            return True
        for i in range(n):
            for j in range(n):
                x, y = xa + (i + .5) * (xb - xa) / n, yb + (j + .5) * (ya - yb) / n
                if bb[0] <= x <= bb[2] and bb[1] <= y <= bb[3] and _di_dalam(x, y, cin):
                    return True
    return False


def _di_dalam(x, y, cin):
    ada = False
    for (x1, y1), (x2, y2) in zip(cin, cin[1:] + cin[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            ada = not ada
    return ada


# ---------------------------------------------------------------- wilayah dan kejadian
def _walk(c, f):
    if isinstance(c[0], (int, float)):
        f(c)
    else:
        for e in c:
            _walk(e, f)


def cincin_luar(g):
    return [p[0] for p in ([g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"])]


def _kab_fitur(prov, kab):
    d = json.load(open(os.path.join(AKAR, f"public/geo/kecamatan/{prov}.json")))
    return [f for f in d["features"] if f["properties"].get("kab") == kab]


def tetangga(prov, kab):
    """kab yang batasnya bersentuhan dengan (prov, kab): >= 2 simpul bersama (dibulatkan 4 desimal) dengan salah satu kecamatannya; semua provinsi."""
    def simpul(f):
        s = set()
        for r in cincin_luar(f["geometry"]):
            s.update((round(x, 4), round(y, 4)) for x, y in r)
        return s
    inti = set()
    for f in _kab_fitur(prov, kab):
        inti |= simpul(f)
    xs = [x for x, _ in inti]; ys = [y for _, y in inti]
    kotak = (min(xs) - .2, min(ys) - .2, max(xs) + .2, max(ys) + .2)
    hasil = set()
    dkec = os.path.join(AKAR, "public/geo/kecamatan")
    for nama in sorted(os.listdir(dkec)):
        if not nama.endswith(".json"):
            continue
        for f in json.load(open(os.path.join(dkec, nama)))["features"]:
            p = f["properties"]
            if (nama[:-5], p.get("kab")) == (prov, kab):
                continue
            pts = []
            _walk(f["geometry"]["coordinates"], pts.append)
            if not any(kotak[0] <= x <= kotak[2] and kotak[1] <= y <= kotak[3] for x, y in pts[::20] or pts):
                continue
            if len(simpul(f) & inti) >= 2:
                hasil.add((nama[:-5], p.get("kab")))
    return sorted(hasil)


def daftar_kejadian():
    K = bekas().periksa_kunci()
    kj = K["kejadian"]
    w = {k["kode"]: k for k in json.load(open(os.path.join(AKAR, "public/data/bnpb/wilayah.json")))["kab"]}
    u = kj["uji"][0]
    inti = w[u["kab_inti"]]
    out = {"uji_" + inti["kode"]: {"mulai": u["tanggal"], "kab": [(inti["prov"], inti["nama"])], "peran": "uji"},
           # tahap 2: kab bersentuhan (aturan mekanis kriteria); folder sama, blok yang sudah ada dilewati
           "uji_" + inti["kode"] + "_tetangga": {"mulai": u["tanggal"], "kab": [(inti["prov"], inti["nama"])], "tetangga_dari": (inti["prov"], inti["nama"]), "peran": "uji", "dir": "uji_" + inti["kode"]}}
    for t in kj["kalibrasi"]["terpilih"]:
        p, n = t["kab"].split("|")
        out[f"kal_{p}_{n.replace(' ', '-')}_{t['mulai']}"] = {"mulai": t["mulai"], "kab": [(p, n)], "peran": "kalibrasi"}
    return out


_bekas = []


def bekas():
    if not _bekas:
        _bekas.append(_muat("bekas_inti", "scripts/longsor/bekas.py"))
    return _bekas[0]


def stac(q):
    return json.loads(ambil(STAC, data=json.dumps(q).encode()))["features"]


def tgl(s):
    return dt.date.fromisoformat(s)


def jendela_tanggal(mulai):
    m = tgl(mulai)
    return (m - dt.timedelta(days=365), m - dt.timedelta(days=1)), (m + dt.timedelta(days=3), m + dt.timedelta(days=90))


def cari_adegan(bbox, epsg, seb, ses):
    """-> {ubin: {"sebelum": [item...], "sesudah": [item...]}} terpilih: sebelum = paling bersih per 1/12 jendela, sesudah = 8 terbersih."""
    def cari(a, b):
        hasil, hari = {}, a
        while hari <= b:  # potong per 31 hari agar di bawah batas halaman
            sampai = min(b, hari + dt.timedelta(days=30))
            for it in stac({"collections": ["sentinel-2-l2a"], "bbox": bbox, "limit": 500,
                            "datetime": f"{hari}T00:00:00Z/{sampai}T23:59:59Z"}):
                if it["properties"].get("proj:epsg") == epsg:
                    hasil[it["id"]] = it
            hari = sampai + dt.timedelta(days=1)
        # (ubin, tanggal) ganda akibat baseline berbeda: ambil versi terbesar
        per = {}
        for i, it in sorted(hasil.items()):
            p = i.split("_")
            per[(p[1], p[2])] = it
        return list(per.values())
    sb, ss = cari(*seb), cari(*ses)
    ubin = {}
    for kunci, daftar in (("sebelum", sb), ("sesudah", ss)):
        for it in daftar:
            ubin.setdefault(it["id"].split("_")[1], {"sebelum": [], "sesudah": []})[kunci].append(it)
    for t, d in ubin.items():
        c = lambda it: (it["properties"].get("eo:cloud_cover") if it["properties"].get("eo:cloud_cover") is not None else 100, it["id"])
        a0, a1 = seb
        n = (a1 - a0).days + 1
        pilih = []
        for k in range(12):
            sel = [it for it in d["sebelum"] if k * n / 12 <= (tgl(tanggal_id(it)) - a0).days < (k + 1) * n / 12]
            if sel:
                pilih.append(min(sel, key=c))
        d["sebelum"] = pilih
        d["sesudah"] = sorted(sorted(d["sesudah"], key=c)[:8], key=lambda it: it["id"].split("_")[2])
    return ubin


def tanggal_id(it):
    s = it["id"].split("_")[2]
    return f"{s[:4]}-{s[4:6]}-{s[6:]}"


# ---------------------------------------------------------------- tarikan per ubin
def aset_adegan(it, nama):
    a = it["assets"][nama]
    rb = (a.get("raster:bands") or [{}])[0]
    return a["href"], rb.get("scale", 1.0), rb.get("offset", 0.0)


def baca_adegan(it, r0, c0, sesudah, cogs, scl_buang):
    """-> dict band -> float32 (BLOK,BLOK) NaN di piksel tak bersih; piksel SCL 3,8,9,10 dibuang."""
    def cog(n):
        u = aset_adegan(it, n)[0]
        with _kunci:
            if u not in cogs:
                cogs[u] = None
        if cogs[u] is None:
            cogs[u] = COG(u)
        return cogs[u]
    scl = atas2(cog("scl").jendela(r0 // 2, r0 // 2 + BLOK // 2, c0 // 2, c0 // 2 + BLOK // 2))
    buang = np.isin(scl, scl_buang)
    out = {}
    for n in (("red", "nir", "green", "swir16") if sesudah else ("red", "nir")):
        _, sk, of = aset_adegan(it, n)
        c = cog(n)
        if n == "swir16":
            dn = atas2(c.jendela(r0 // 2, r0 // 2 + BLOK // 2, c0 // 2, c0 // 2 + BLOK // 2))
        else:
            dn = c.jendela(r0, r0 + BLOK, c0, c0 + BLOK)
        x = refl(dn, sk, of)
        x[buang] = np.nan
        out[n] = x
    return out


def tarik_ubin(ev, kej_dir, tid, info, poli, milik, epsg, ex):
    """semua blok satu ubin MGRS: baca, komposit, simpan npz terkompresi. Lanjut bila npz sudah ada."""
    K = bekas().periksa_kunci()
    min_obs = K["komposit"]["min_pengamatan_bersih"]
    scl_buang = K["komposit"]["masker_scl_dibuang"]
    x0, y0, W, H = info["x0"], info["y0"], info["w"], info["h"]
    xa, xb, yb, ya = milik
    c_lo, c_hi = max(0, math.ceil((xa - x0) / 10)), min(W, math.ceil((xb - x0) / 10))
    r_lo, r_hi = max(0, math.ceil((y0 - ya) / 10)), min(H, math.ceil((y0 - yb) / 10))
    stat = {"blok": 0, "lewat": 0, "piksel_milik": 0, "terliput_sb": 0, "terliput_ss": 0}
    cogs = {}
    for br in range(r_lo // BLOK, -(-r_hi // BLOK)):
        for bc in range(c_lo // BLOK, -(-c_hi // BLOK)):
            if not blok_dalam_poligon(x0, y0, br, bc, poli):
                continue
            berkas = os.path.join(kej_dir, "blok", f"{tid}_{br}_{bc}.npz")
            if os.path.exists(berkas):
                stat["lewat"] += 1
                continue
            cek_batas()
            r0, c0 = br * BLOK, bc * BLOK
            sb = list(ex.map(lambda it: baca_adegan(it, r0, c0, False, cogs, scl_buang), info["sebelum"]))
            ss = list(ex.map(lambda it: baca_adegan(it, r0, c0, True, cogs, scl_buang), info["sesudah"]))
            keluar = {}
            for nama, adegan, band in (("sb", sb, ("red", "nir")), ("ss", ss, ("red", "nir", "green", "swir16"))):
                if not adegan:
                    nd = np.full((BLOK, BLOK), 255, np.uint8)
                    keluar.update({f"ndvi_{nama}": nd, f"n_{nama}": np.zeros((BLOK, BLOK), np.uint8)})
                    if nama == "ss":
                        keluar["mndwi_ss"] = nd
                    continue
                med = {}
                for b in band:
                    med[b], n = median_tumpuk([a[b] for a in adegan], min_obs)
                    if b == "red":
                        nrd = n
                keluar[f"ndvi_{nama}"] = kuantisasi(nisbah(med["nir"], med["red"]))
                keluar[f"n_{nama}"] = nrd
                if nama == "ss":
                    keluar["mndwi_ss"] = kuantisasi(nisbah(med["green"], med["swir16"]))
            # kepemilikan: di luar kotak milik -> tak ada data (tidak ganda antar ubin)
            rr, cc = np.arange(r0, r0 + BLOK)[:, None], np.arange(c0, c0 + BLOK)[None, :]
            milik_m = (rr >= r_lo) & (rr < r_hi) & (cc >= c_lo) & (cc < c_hi) & (rr < H) & (cc < W)
            for k, v in keluar.items():
                v[~milik_m] = 255 if k.startswith(("ndvi", "mndwi")) else 0
            os.makedirs(os.path.dirname(berkas), exist_ok=True)
            np.savez_compressed(berkas, **keluar)
            stat["blok"] += 1
            stat["piksel_milik"] += int(milik_m.sum())
            stat["terliput_sb"] += int(((keluar["ndvi_sb"] != 255) & milik_m).sum())
            stat["terliput_ss"] += int(((keluar["ndvi_ss"] != 255) & milik_m).sum())
            if stat["blok"] % 5 == 0:
                simpan_transfer(ev)
                print(f"  {tid} blok {br},{bc} selesai ({stat['blok']} baru), transfer sesi {_sesi['byte'] / 1e9:.2f} GB", flush=True)
    return stat


def region(spec):
    """-> (nama kab terpakai [(prov,kab)], poligon lon/lat cincin-cincin, bbox)"""
    kabs = list(spec["kab"])
    if spec.get("tetangga_dari"):
        kabs += tetangga(*spec["tetangga_dari"])
    ring = []
    for p, k in kabs:
        for f in _kab_fitur(p, k):
            ring += cincin_luar(f["geometry"])
    xs = [x for r in ring for x, _ in r]; ys = [y for r in ring for _, y in r]
    return kabs, ring, [min(xs), min(ys), max(xs), max(ys)]


def ke_utm_poli(ring, epsg):
    c = _muat("citra_tarik", "scripts/data/citra.py")
    zona, selatan = epsg % 100, epsg // 100 == 327
    out = []
    for r in ring:
        u = [c.ke_utm(y, x, zona, selatan) for x, y in r]
        xs = [p[0] for p in u]; ys = [p[1] for p in u]
        out.append(((min(xs), min(ys), max(xs), max(ys)), u))
    return out


def tarik_dem(bbox, kej_dir):
    ada = []
    for la in range(math.floor(bbox[1]), math.floor(bbox[3]) + 1):
        for lo in range(math.floor(bbox[0]), math.floor(bbox[2]) + 1):
            n = f"Copernicus_DSM_COG_10_{'N' if la >= 0 else 'S'}{abs(la):02d}_00_{'E' if lo >= 0 else 'W'}{abs(lo):03d}_00_DEM"
            j = os.path.join(kej_dir, "dem", n + ".tif")
            if os.path.exists(j):
                ada.append((n, "ada")); continue
            try:
                b = ambil(f"https://copernicus-dem-30m.s3.amazonaws.com/{n}/{n}.tif")
            except urllib.error.HTTPError as e:
                ada.append((n, f"tidak ada ({e.code})")); continue
            os.makedirs(os.path.dirname(j), exist_ok=True)
            open(j, "wb").write(b)
            ada.append((n, f"{len(b) / 1e6:.1f} MB"))
    return ada


def tarik_hansen(bbox, kej_dir, tahun_maks):
    """lossyear (0 = tak hilang, 1..25 = 2001..2025) untuk kotak bbox, per ubin 10 derajat -> npz; tahun_maks tidak dipakai menyaring di sini."""
    B = _muat_banjir()
    B.rentang = lambda url, a, b, coba=4: ambil(url, (a, b))
    PX = B.PX
    hasil = []
    for atas in range(math.ceil(bbox[3] / 10) * 10, math.floor(bbox[1] / 10) * 10, -10):
        for kiri in range(math.floor(bbox[0] / 10) * 10, math.ceil(bbox[2] / 10) * 10, 10):
            j = os.path.join(kej_dir, "hansen", f"lossyear_{atas}_{kiri}.npz")
            if os.path.exists(j):
                hasil.append((j, "ada")); continue
            y0, y1 = int((atas - bbox[3]) / PX), int((atas - bbox[1]) / PX) + 1
            x0, x1 = int((bbox[0] - kiri) / PX), int((bbox[2] - kiri) / PX) + 1
            y0, x0 = max(y0, 0), max(x0, 0)
            ub = B.Ubin("lossyear", atas, kiri)
            baris = []
            for a in range(y0, y1 + 1, 200):
                d = ub.blok(a, min(a + 199, y1))
                baris += [np.frombuffer(d[y], np.uint8)[x0:x1 + 1] for y in sorted(d)]
            os.makedirs(os.path.dirname(j), exist_ok=True)
            np.savez_compressed(j, lossyear=np.stack(baris), lon0=kiri + x0 * PX, lat0=atas - y0 * PX, px=PX)
            hasil.append((j, f"{os.path.getsize(j) / 1e6:.1f} MB"))
    return hasil


def _muat_banjir():
    if "bukti_das" not in sys.modules:
        sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
        import bukti_das  # noqa: F401
    return sys.modules["bukti_das"]


def siapkan(kej, spec):
    kabs, ring, bbox = region(spec)
    lon_c, lat_c = (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
    zona = int((lon_c + 180) // 6) + 1
    epsg = (32700 if lat_c < 0 else 32600) + zona
    seb, ses = jendela_tanggal(spec["mulai"])
    ubin_it = cari_adegan([bbox[0] - .01, bbox[1] - .01, bbox[2] + .01, bbox[3] + .01], epsg, seb, ses)
    info = {}
    for t, d in ubin_it.items():
        it = (d["sebelum"] + d["sesudah"])[0]
        a = it["assets"]["red"]
        tr, sh = a["proj:transform"], a["proj:shape"]
        info[t] = {"x0": tr[2], "y0": tr[5], "w": sh[1], "h": sh[0], **d}
    return kabs, ring, bbox, epsg, seb, ses, info


def blok_perlu(info, poli):
    mil = milik_ubin(info)
    n = {}
    for t, u in info.items():
        xa, xb, yb, ya = mil[t]
        c_lo, c_hi = max(0, math.ceil((xa - u["x0"]) / 10)), min(u["w"], math.ceil((xb - u["x0"]) / 10))
        r_lo, r_hi = max(0, math.ceil((u["y0"] - ya) / 10)), min(u["h"], math.ceil((u["y0"] - yb) / 10))
        n[t] = sum(1 for br in range(r_lo // BLOK, -(-r_hi // BLOK)) for bc in range(c_lo // BLOK, -(-c_hi // BLOK))
                   if blok_dalam_poligon(u["x0"], u["y0"], br, bc, poli))
    return n, mil


def cmd_rencana(kej, spec):
    kabs, ring, bbox, epsg, seb, ses, info = siapkan(kej, spec)
    poli = ke_utm_poli(ring, epsg)
    n, _ = blok_perlu(info, poli)
    dem = [(f"{la}") for la in range(math.floor(bbox[1]), math.floor(bbox[3]) + 1)]
    taksir = 0
    for t, u in info.items():
        taksir += n[t] * (len(u["sebelum"]) * 2.1 + len(u["sesudah"]) * 3.5)
    print(json.dumps({"kejadian": kej, "kab": kabs, "bbox": [round(v, 3) for v in bbox], "epsg": epsg, "sebelum": [str(d) for d in seb], "sesudah": [str(d) for d in ses],
                      "ubin": {t: {"blok": n[t], "sebelum": [tanggal_id(i) for i in u["sebelum"]], "sesudah": [tanggal_id(i) for i in u["sesudah"]]} for t, u in info.items()},
                      "taksiran_transfer_MB": round(taksir)}, indent=1, ensure_ascii=False))
    return info


def cmd_tarik(kej, spec):
    bekas().periksa_kunci()
    cek_batas()
    kej_dir = os.path.join(KELUAR, spec.get("dir", kej))
    os.makedirs(kej_dir, exist_ok=True)
    kabs, ring, bbox, epsg, seb, ses, info = siapkan(kej, spec)
    poli = ke_utm_poli(ring, epsg)
    mil = milik_ubin(info)
    meta = {"kejadian": kej, "mulai": spec["mulai"], "peran": spec["peran"], "kab": kabs, "bbox": bbox, "epsg": epsg, "blok_piksel": BLOK, "kuantisasi": f"q=round((x+1)*{KUANT}); 255 = tak ada data",
            "jendela_sebelum": [str(d) for d in seb], "jendela_sesudah": [str(d) for d in ses], "numpy": np.__version__,
            "ubin": {t: {k: u[k] for k in ("x0", "y0", "w", "h")} | {"milik_xyxy": mil[t], "sebelum": [tanggal_id(i) for i in u["sebelum"]], "sesudah": [tanggal_id(i) for i in u["sesudah"]]} for t, u in info.items()},
            "belum_terbangun": ["topeng alur sungai OSM (tak ada sumber di repo)", "peringatan tebangan GFW terintegrasi bertanggal (butuh kunci API)"]}
    json.dump(meta, open(os.path.join(kej_dir, "meta.json"), "w"), indent=1, ensure_ascii=False)
    t0 = time.time()
    b0 = _sesi["byte"]
    print(f"[{kej}] DEM:", tarik_dem(bbox, kej_dir), flush=True)
    print(f"[{kej}] Hansen:", tarik_hansen(bbox, kej_dir, int(spec["mulai"][:4])), flush=True)
    stat = {}
    with ThreadPoolExecutor(int(os.environ.get("BEKAS_UTAS", 6))) as ex:
        for t, u in info.items():
            print(f"[{kej}] ubin {t}: {len(u['sebelum'])} sebelum, {len(u['sesudah'])} sesudah", flush=True)
            stat[t] = tarik_ubin(kej, kej_dir, t, u, poli, mil[t], epsg, ex)
    simpan_transfer(kej)
    ring_ = {"kejadian": kej, "detik": round(time.time() - t0), "transfer_byte_sesi_ini": _sesi["byte"] - b0, "ubin": stat,
             "ukuran_simpan_byte": sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(kej_dir) for f in fs)}
    json.dump(ring_, open(os.path.join(kej_dir, "ringkas.json"), "w"), indent=1)
    print(json.dumps(ring_, indent=1), flush=True)


# ---------------------------------------------------------------- swa-uji (jaringan lokal + numpy)
def uji():
    from http.server import BaseHTTPRequestHandler, HTTPServer
    isi = bytes(range(256)) * 40

    class H(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass

        def do_GET(self):
            if self.path == "/alih":
                self.send_response(302); self.send_header("Location", "http://localhost:%d/a" % self.server.server_port); self.end_headers(); return
            r = self.headers.get("Range")
            a, b = (int(x) for x in r[6:].split("-")) if r else (0, len(isi) - 1)
            self.send_response(206 if r else 200); self.send_header("Content-Length", str(b - a + 1)); self.end_headers(); self.wfile.write(isi[a:b + 1])
    s = HTTPServer(("127.0.0.1", 0), H)
    threading.Thread(target=s.serve_forever, daemon=True).start()
    p = s.server_port
    _host_ok[0] = {"127.0.0.1"}
    dasar = _sesi["byte"]
    try:
        assert ambil(f"http://127.0.0.1:{p}/a", (10, 20)) == isi[10:20] and _sesi["byte"] - dasar == 10   # Range dan byte terhitung
        try:
            ambil(f"http://127.0.0.1:{p}/alih"); raise SystemExit("pengalihan ke host lain harus ditolak")
        except RuntimeError as e:
            assert "tak diizinkan" in str(e)
        try:
            ambil(f"http://localhost:{p}/a"); raise SystemExit("host di luar daftar harus ditolak")
        except RuntimeError:
            pass
    finally:
        _host_ok[0] = HOST_OK
        s.shutdown()
    _sesi["byte"] = dasar
    # batas keras: transfer melewati 30 GB berhenti
    asli = _sesi["byte"]
    _sesi["byte"] = BATAS_BYTE + 1
    try:
        cek_batas(); raise SystemExit("batas transfer harus berhenti")
    except Berhenti:
        pass
    _sesi["byte"] = asli
    if np is None:
        print("ok (tanpa numpy: uji dekode dilewati)")
        return
    # dekode ubin deflate + prediktor 2 uint16
    T = 8
    asal = (np.arange(T * T, dtype=np.uint16).reshape(T, T) * 997) % 65521
    diff = asal.copy(); diff[:, 1:] = (asal[:, 1:] - asal[:, :-1]).astype(np.uint16)
    assert (buka_ubin(zlib.compress(diff.astype("<u2").tobytes()), 2, "<u2", T) == asal).all()
    # median tumpuk: bersih >= 2, awan NaN, n sebagai uint8, kurang dari min_obs -> NaN
    n = np.nan
    a = [np.array([[1., n, n]]), np.array([[3., 5., n]]), np.array([[2., n, n]])]
    m, c = median_tumpuk(a, 2)
    assert m[0, 0] == 2.0 and np.isnan(m[0, 1]) and np.isnan(m[0, 2]) and list(c[0]) == [3, 1, 0]
    # reflektans: DN 0 = tak ada data; offset baseline baru
    r = refl(np.array([[0, 2000]], dtype=np.uint16), 0.0001, -0.1)
    assert np.isnan(r[0, 0]) and abs(r[0, 1] - 0.1) < 1e-6
    # NDVI dan kuantisasi: nodata 255, bulat ke 1/127
    nd = nisbah(np.array([[0.8, 0.0, np.nan]], dtype=np.float32), np.array([[0.2, 0.0, 0.1]], dtype=np.float32))
    q = kuantisasi(nd)
    assert q[0, 0] == round(0.6 * 127 + 127) and q[0, 1] == 255 and q[0, 2] == 255
    # kepemilikan: dua ubin berdampingan 100 km -> batas di titik tengah; ubin tanpa tetangga -> tepi sendiri
    mil = milik_ubin({"A": {"x0": 300000.0, "y0": 200000.0, "w": 10980, "h": 10980}, "B": {"x0": 400020.0, "y0": 200000.0, "w": 10980, "h": 10980}})
    assert mil["A"][1] == mil["B"][0] and mil["A"][0] == 300000.0 and mil["B"][1] == 400020.0 + 109800
    # poligon menyentuh blok: persegi kecil di blok (0,0); blok jauh tidak
    pol = [((1000, 1000, 2000, 2000), [(1000, 1000), (2000, 1000), (2000, 2000), (1000, 2000)])]
    pol = [((1000, 9000, 2000, 9900), [(1000, 9000), (2000, 9000), (2000, 9900), (1000, 9900)])]
    assert blok_dalam_poligon(0, 10000, 0, 0, pol) and not blok_dalam_poligon(0, 10000, 3, 3, pol)
    # penjaga kunci dipanggil di awal tarikan
    asli_b = _bekas[:]
    class _Tolak(Exception):
        pass
    class Palsu:
        Tolak = _Tolak
        def periksa_kunci(self, *a, **k):
            raise _Tolak("uji")
    _bekas[:] = [Palsu()]
    try:
        cmd_tarik("x", {"mulai": "2025-11-25", "kab": [], "peran": "uji"}); raise SystemExit("tarik harus lewat penjaga kunci")
    except _Tolak:
        pass
    finally:
        _bekas[:] = asli_b
    print("ok")


def cmd_ringkas():
    d = json.load(open(TRANSFER)) if os.path.exists(TRANSFER) else {}
    print("transfer:", json.dumps(d))
    for k in sorted(os.listdir(KELUAR)) if os.path.isdir(KELUAR) else []:
        j = os.path.join(KELUAR, k, "ringkas.json")
        if os.path.exists(j):
            print(k, json.dumps(json.load(open(j)))[:600])


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    elif a[:1] == ["daftar"]:
        for k, v in daftar_kejadian().items():
            print(k, v)
    elif a[:1] == ["ringkas"]:
        cmd_ringkas()
    elif a[:1] in (["rencana"], ["tarik"]) and len(a) == 2:
        ev = daftar_kejadian()
        if a[1] not in ev:
            sys.exit("kejadian tak dikenal: " + ", ".join(ev))
        try:
            (cmd_rencana if a[0] == "rencana" else cmd_tarik)(a[1], ev[a[1]])
        except Berhenti as e:
            simpan_transfer(a[1])
            print("BERHENTI:", e)
            sys.exit(3)
    else:
        print(__doc__)
