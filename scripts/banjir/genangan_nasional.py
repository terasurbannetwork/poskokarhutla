"""Katalog genangan Copernicus GFM seluruh Indonesia + luas tergenang per kecamatan per lintasan (padanan luas_citra.py karhutla).

Pakai:  python3 scripts/banjir/genangan_nasional.py katalog [--dari 2015-01] [--sampai 2026-10]
        python3 scripts/banjir/genangan_nasional.py luas [--aktif] [--riwayat] [--prov 63] [--dari TGL] [--sampai TGL]
                                                        [--maks N] [--pilih prov|kab|tanggal ...] [--anggaran N]
        python3 scripts/banjir/genangan_nasional.py terbit      (susun ulang keluaran dari cache, tanpa jaringan)
        python3 scripts/banjir/genangan_nasional.py uji         (self-check sintetis, tanpa jaringan)

1. katalog: semua item STAC GFM di kotak Indonesia, METADATA SAJA (tanpa raster), per bulan, lanjut dari cache.
   -> data/raw/banjir/gfm_nasional/item.jsonl, katalog_bulan.json, ringkas_ubin_bulan.json
2. luas: untuk pasangan (kabupaten, tanggal acuan) baca blok ensemble_flood_extent + exclusion_mask + reference_water_mask
   yang menyentuh poligon kecamatan lewat HTTP Range (tak ada raster utuh diunduh; ubin 15000x15000 tetap di server).
   Pasangan: (a) kejadian aktif (kejadian_aktif_awal.json), lintasan 0-12 hari sesudah `sejak`;
             (b) riwayat: kabupaten-hari banjir/bandang DIBI, lintasan 0-6 hari sesudah tanggal DIBI.
   Per kecamatan: tergenang_ha (flood==1, bukan air tetap, bukan ter-mask), diamati_ha (flood!=255), mask_ha, cakupan_pct.
3. Kontrol latar: lintasan PRA ubin yang sama, jam lintas serupa (orbit sama +- 90 mnt), 8-45 hari sebelumnya.
   tergenang_baru_ha = tergenang sesudah DAN diamati kering (0) sebelumnya. latar_ha = tergenang di pra dalam domain yang sama
   dengan tergenang; tergenang_baru_ha < 2x latar_ha -> sinyal_lemah.
4. Keluaran: public/banjir/data/genangan_nasional.json (< 400 KB), data/raw/banjir/gfm_nasional/label_kab_hari.csv.

Proyeksi: Equi7 Oceania (OC) dan Asia (AS, Aceh dan Sumatera utara jatuh di ubin AS); parameter dari proj:wkt2 STAC.
Ubin diakses tanpa GDAL: tiff_mini + RangeFile (header 256 KB + blok yang dibutuhkan). zstd lewat CLI `zstd`.
Atribusi wajib Copernicus GFM (lisensi CEMS): lihat ATRIBUSI.
"""
import argparse, builtins, csv, threading, datetime as dt, json, math, os, re, sys, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

AYAH = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AYAH)
sys.path.insert(1, os.path.join(AYAH, "genangan"))
from umum import KELUAR, MENTAH, WIB, baca, simpan  # noqa: E402
from wilayah import AKAR, PROVINSI, _cincin  # noqa: E402
import tiff_mini  # noqa: E402
from equi7 import vincenty  # noqa: E402
sys.path.insert(2, os.path.join(AYAH, "..", "umum"))
import bangunan as BG  # noqa: E402  (grid bangunan halus 110 m)

tiff_mini.open = lambda j, m="rb": builtins.open(j, m) if isinstance(j, str) else j  # Tiff menerima RangeFile

STAC = "https://stac.eodc.eu/api/v1/search"
UA = "poskobanjir/1.0 (riset genangan nasional, Pantau Bencana; +https://centurisk97.id)"
ATRIBUSI = "Copernicus Emergency Management Service, Global Flood Monitoring (GFM), EODC; ringkasan oleh Pantau Bencana. Syarat: https://global-flood.emergency.copernicus.eu/terms-of-service/"
KOTAK = [94.9, -11.2, 141.1, 6.2]
DIR = os.path.join(MENTAH, "gfm_nasional")
ITEM, BULAN, UBIN_BULAN = (os.path.join(DIR, n) for n in ("item.jsonl", "katalog_bulan.json", "ringkas_ubin_bulan.json"))
HASIL, DIBI_BERKAS, LABEL = (os.path.join(DIR, n) for n in ("hasil.jsonl", "dibi.json", "label_kab_hari.csv"))
KELUARAN = os.path.join(KELUAR, "genangan_nasional.json")
AWAL_ARSIP = "2015-01"
HULU = "https://data.eodc.eu/collections/"
GRID = {  # (lon pusat, lat pusat, false easting, false northing)
    "OC": (131.5, -19.5, 6988408.5356, 7654884.53733),
    "AS": (94.0, 47.0, 4340913.84808, 4812712.92347),
}
JEDA = 1.0                 # detik antar permintaan STAC
KEPALA = 262144           # byte header COG yang dibaca sekali
MAKS_TITIK = 600_000      # sampel per kabupaten; langkah melebar untuk kabupaten raksasa
LANGKAH_MIN = 0.0006      # derajat (~65 m, ~3 piksel 20 m)
MAKS_KANDIDAT = 4         # lintasan yang dibaca per pasangan
JENDELA = {"aktif": 12, "dibi": 6}
PRA = (8, 45)             # hari sebelum lintasan sesudah
JAM_PRA = 90              # menit selisih jam lintas = orbit sama
MAKS_DETIK = int(os.environ.get("GFM_DETIK", 1500))
MAKS_BYTE_KELUARAN = 380_000


# ---------------------------------------------------------------- jaringan
def stac_post(badan):
    for i in range(4):
        try:
            req = urllib.request.Request(STAC, data=json.dumps(badan).encode(),
                                         headers={"User-Agent": UA, "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if i == 3 or (400 <= e.code < 500 and e.code != 429):
                raise RuntimeError(f"STAC HTTP {e.code} {e.read()[:200]!r}")
            time.sleep(30 * (i + 1) if e.code == 429 else 10 * (i + 1))
        except Exception as e:
            if i == 3:
                raise RuntimeError(f"STAC: {e}")
            time.sleep(10 * (i + 1))


class RangeFile:
    """Berkas HTTP baca-saja: header di-cache, sisanya HTTP Range; `siapkan` mengunduh blok paralel ke cache."""
    def __init__(self, url):
        self.url, self.pos, self.cache, self.byte = url, 0, {}, 0
        self.kepala = self.rentang(0, KEPALA)

    def rentang(self, a, n, coba=3):
        for i in range(coba):
            try:
                req = urllib.request.Request(self.url, headers={"User-Agent": UA, "Range": f"bytes={a}-{a + n - 1}"})
                with urllib.request.urlopen(req, timeout=90) as r:
                    if r.status != 206:   # server mengabaikan Range: jangan unduh berkas utuh
                        raise RuntimeError(f"Range diabaikan (HTTP {r.status}) {self.url}")
                    b = r.read()
                self.byte += len(b)
                return b
            except RuntimeError:
                raise
            except Exception as e:
                if i == coba - 1:
                    raise RuntimeError(f"{self.url}: {e}")
                time.sleep(3 * (i + 1))

    def seek(self, p, w=0):
        self.pos = p

    def read(self, n):
        a = self.pos
        if a + n <= len(self.kepala):
            b = self.kepala[a:a + n]
        else:
            b = self.cache.pop((a, n), None) or self.rentang(a, n)
        self.pos += n
        return b

    def siapkan(self, rentangs, celah=4096, maks=2_000_000):
        """Unduh rentang paralel; rentang bertetangga digabung jadi satu permintaan (strip 1 baris reference_water_mask)."""
        butuh = sorted(r for r in set(rentangs) if r[1] and r[0] + r[1] > len(self.kepala) and r not in self.cache)
        gabung = []
        for o, n in butuh:
            if gabung and o - (gabung[-1][0] + gabung[-1][1]) <= celah and o + n - gabung[-1][0] <= maks:
                gabung[-1][1] = o + n - gabung[-1][0]
            else:
                gabung.append([o, n])
        with ThreadPoolExecutor(8) as ex:
            for (o, n), b in zip(gabung, ex.map(lambda g: self.rentang(*g), gabung)):
                for ro, rn in butuh:
                    if o <= ro and ro + rn <= o + n:
                        self.cache[(ro, rn)] = b[ro - o:ro - o + rn]


def lzw(data):
    """Dekompresi LZW TIFF (MSB dulu, early change, 9-12 bit): dipakai reference_water_mask GFM (tiff_mini belum bisa kompresi 5)."""
    tab = [bytes([i]) for i in range(256)] + [b"", b""]
    out, bits, buf, nb, prev = bytearray(), 9, 0, 0, None
    for byte in data:
        buf, nb = (buf << 8) | byte, nb + 8
        while nb >= bits:
            kode = (buf >> (nb - bits)) & ((1 << bits) - 1)
            nb -= bits
            buf &= (1 << nb) - 1
            if kode == 257:
                return bytes(out)
            if kode == 256:
                del tab[258:]
                bits, prev = 9, None
                continue
            if prev is None:
                ent = tab[kode]
            else:
                ent = tab[kode] if kode < len(tab) else prev + prev[:1]
                tab.append(prev + ent[:1])
            out += ent
            prev = ent
            n = len(tab)
            bits = 9 if n < 511 else 10 if n < 1023 else 11 if n < 2047 else 12
    return bytes(out)


class TiffLzw(tiff_mini.Tiff):
    def ubin(self, kol, baris):
        if self.komp != 5:
            return super().ubin(kol, baris)
        k = baris * self.per_baris + kol
        self.f.seek(self.offs[k])
        b = bytearray(lzw(self.f.read(self.cnts[k])))
        if self.kode != "B":
            raise ValueError("LZW hanya uint8")
        if self.pred == 2:
            for r in range(self.tt):
                for i in range(r * self.tl + 1, (r + 1) * self.tl):
                    b[i] = (b[i] + b[i - 1]) & 255
        return bytes(b)


class Raster:
    """Satu GeoTIFF GFM di server; nilai(col, row) membaca blok yang dibutuhkan saja (cache di memori)."""
    def __init__(self, url):
        self.rf = RangeFile(url)
        self.t = TiffLzw(self.rf)
        self.dec = {}

    def siapkan(self, blok):
        t, perlu = self.t, set()
        for a, b in blok:   # blok = indeks kisi 512; ubah ke blok/strip milik raster ini (bisa beda ukuran)
            for kb in range(b * 512 // t.tt, (b * 512 + 511) // t.tt + 1):
                for ka in range(a * 512 // t.tl, (a * 512 + 511) // t.tl + 1):
                    if (ka, kb) not in self.dec:
                        perlu.add((ka, kb))
        self.rf.siapkan([(t.offs[kb * t.per_baris + ka], t.cnts[kb * t.per_baris + ka]) for ka, kb in perlu if kb * t.per_baris + ka < len(t.offs)])

    def nilai(self, col, row):
        t = self.t
        k = (col // t.tl, row // t.tt)
        a = self.dec.get(k)
        if a is None:
            a = self.dec[k] = t.ubin(*k) if t.cnts[k[1] * t.per_baris + k[0]] else bytes([255]) * (t.tl * t.tt)  # blok kosong = tak teramati
        return a[(row % t.tt) * t.tl + col % t.tl]


# ---------------------------------------------------------------- 1. katalog
def bulan_berikut(ym):
    y, m = map(int, ym.split("-"))
    return f"{y + (m == 12)}-{m % 12 + 1:02d}"


def kecil(f, ubin_ref):
    p, a = f["properties"], f["assets"]
    if "ensemble_flood_extent" not in a:
        return None
    if a.get("reference_water_mask"):
        ubin_ref[p["Equi7Tile"]] = a["reference_water_mask"]["href"].replace(HULU, "")
    return {"id": f["id"], "t": p["datetime"], "ub": p["Equi7Tile"], "bb": [round(x, 3) for x in f["bbox"]],
            "fp": p.get("flooded_pixels"), "fl": p.get("floodable_pixels"), "an": p.get("anomaly_detected"),
            "rb": p.get("ratio_after_blob_removal"), "f": a["ensemble_flood_extent"]["href"].replace(HULU, ""),
            "m": (a.get("exclusion_mask") or {}).get("href", "").replace(HULU, ""), "r": None}


def muat_item():
    """item.jsonl -> {id: item}; baris terpotong di ujung (jalan mati) dibuang. Ubin->href air tetap di ubin_ref.json."""
    out = {}
    if os.path.exists(ITEM):
        for g in builtins.open(ITEM):
            try:
                d = json.loads(g)
            except ValueError:
                continue
            out[d["id"]] = d
    ref = baca(os.path.join(DIR, "ubin_ref.json"), {})
    for d in out.values():
        d["r"] = ref.get(d["ub"])
    return out


def katalog(dari=AWAL_ARSIP, sampai=None):
    os.makedirs(DIR, exist_ok=True)
    sekarang = dt.datetime.utcnow()
    sampai = sampai or sekarang.strftime("%Y-%m")
    selesai = baca(BULAN, {})
    ubin_ref = baca(os.path.join(DIR, "ubin_ref.json"), {})
    ada = set(muat_item())
    mulai, ym = time.time(), dari
    while ym <= sampai:
        if ym in selesai and ym < sekarang.strftime("%Y-%m"):
            ym = bulan_berikut(ym)
            continue
        akhir = bulan_berikut(ym)
        badan = {"collections": ["GFM"], "bbox": KOTAK, "limit": 500, "datetime": f"{ym}-01T00:00:00Z/{akhir}-01T00:00:00Z",
                 "fields": {"include": ["id", "bbox", "properties.datetime", "properties.Equi7Tile", "properties.flooded_pixels",
                                        "properties.floodable_pixels", "properties.anomaly_detected", "properties.ratio_after_blob_removal",
                                        "assets.ensemble_flood_extent", "assets.exclusion_mask", "assets.reference_water_mask"]}}
        baru, n = [], 0
        while badan:
            d = stac_post(badan)
            for f in d["features"]:
                k = kecil(f, ubin_ref)
                if k and k["id"] not in ada and k["t"][:7] == ym:   # selang [bulan, bulan+1) tapi penjaga bila batas dilanggar
                    baru.append(k)
                    ada.add(k["id"])
                n += 1
            nx = next((l for l in d.get("links", []) if l.get("rel") == "next"), None)
            badan = nx.get("body") if nx and nx.get("method") == "POST" and d["features"] else None
            time.sleep(JEDA)
        with builtins.open(ITEM, "a") as g:
            for k in baru:
                g.write(json.dumps(k, separators=(",", ":")) + "\n")
        ubin_ref = {**baca(os.path.join(DIR, "ubin_ref.json"), {}), **ubin_ref}   # gabung: beberapa jalan `katalog` boleh bersamaan (rentang beda)
        simpan(os.path.join(DIR, "ubin_ref.json"), ubin_ref)
        selesai = {**baca(BULAN, {}), ym: n}
        simpan(BULAN, selesai)
        print(f"  {ym}: {n} item ({len(baru)} baru)", flush=True)
        ym = bulan_berikut(ym)
    item = muat_item()
    ub = {}
    for k in item.values():
        a = ub.setdefault(k["ub"], {}).setdefault(k["t"][:7], [0, 0])
        a[0] += 1
        a[1] += k["fp"] or 0
    simpan(UBIN_BULAN, ub)
    per_tahun = per_tahun_item(item)
    print(f"{len(item)} item, {len(ub)} ubin, {time.time() - mulai:.0f} dtk; per tahun: {per_tahun}")
    return item


def per_tahun_item(item):
    c = {}
    for k in item.values():
        c[k["t"][:4]] = c.get(k["t"][:4], 0) + 1
    return dict(sorted(c.items()))


# ---------------------------------------------------------------- proyeksi, ubin
def maju(g, lon, lat):
    lon0, lat0, fe, fn = GRID[g]
    s, az = vincenty(lon0, lat0, lon, lat)
    return fe + s * math.sin(az), fn + s * math.cos(az)


def ubin_dari_nama(nama):
    """'OC020M_E060N084T3' -> (grid, x0, y_atas, x1): 300 km, 20 m."""
    m = re.match(r"([A-Z]{2})020M_E(\d{3})N(\d{3})T3$", nama)
    if not m:
        raise ValueError(nama)
    x0, y0 = int(m[2]) * 100000, int(m[3]) * 100000
    return m[1], x0, y0 + 300000


class Kisi:
    """Interpolasi bilinear proyeksi di kisi 0,1 derajat: galat < 1 m pada kotak kabupaten (diuji)."""
    D = 0.1

    def __init__(self, g, kotak):
        self.g, self.lon0, self.lat0 = g, math.floor(kotak[0] / self.D) * self.D, math.floor(kotak[1] / self.D) * self.D
        self.nx = int((kotak[2] - self.lon0) / self.D) + 2
        self.ny = int((kotak[3] - self.lat0) / self.D) + 2
        self.n = [[maju(g, self.lon0 + i * self.D, self.lat0 + j * self.D) for i in range(self.nx)] for j in range(self.ny)]

    def __call__(self, lon, lat):
        u, v = (lon - self.lon0) / self.D, (lat - self.lat0) / self.D
        i, j = int(u), int(v)
        u, v = u - i, v - j
        a, b, c, d = self.n[j][i], self.n[j][i + 1], self.n[j + 1][i], self.n[j + 1][i + 1]
        w = ((1 - u) * (1 - v), u * (1 - v), (1 - u) * v, u * v)
        return (w[0] * a[0] + w[1] * b[0] + w[2] * c[0] + w[3] * d[0], w[0] * a[1] + w[1] * b[1] + w[2] * c[1] + w[3] * d[1])


# ---------------------------------------------------------------- poligon -> titik sampel
def luas_derajat(cincins):
    return sum(abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(r, r[1:] + r[:1])) / 2) for r in cincins)


def titik_poligon(cincins, langkah, ki, hasil):
    """Isi titik tengah sel `langkah` derajat di dalam gabungan cincin (genap-ganjil) -> hasil (ki, lon, lat, ha). Isi baris demi baris."""
    ys = [p[1] for r in cincins for p in r]
    j0, j1 = math.floor(min(ys) / langkah), math.ceil(max(ys) / langkah)
    for j in range(j0, j1):
        lat = (j + .5) * langkah
        xs = []
        for r in cincins:
            for a, b in zip(r, r[1:] + r[:1]):
                if (a[1] > lat) != (b[1] > lat):
                    xs.append(a[0] + (lat - a[1]) * (b[0] - a[0]) / (b[1] - a[1]))
        xs.sort()
        ha = langkah * 111.32 * math.cos(math.radians(lat)) * langkah * 110.57 * 100
        for a, b in zip(xs[::2], xs[1::2]):
            for i in range(math.ceil(a / langkah - .5), math.ceil(b / langkah - .5)):
                hasil.append((ki, (i + .5) * langkah, lat, ha))


_PROV = {}


def kec_kab(prov, kab, hanya=None):
    """{ 'prov|kab|kec': [cincin] } untuk satu kabupaten (kecamatan terbelah digabung); `hanya` = himpunan nama kec."""
    if prov not in _PROV:
        _PROV[prov] = json.load(builtins.open(os.path.join(AKAR, "public/geo/kecamatan", f"{prov}.json")))["features"]
    out = {}
    for f in _PROV[prov]:
        if f["properties"]["kab"] == kab and (hanya is None or f["properties"]["kec"] in hanya):
            out.setdefault(f["properties"]["kec"], []).extend(_cincin(f["geometry"]))
    return out


class Titik:
    """Titik sampel satu kabupaten: daftar kecamatan + (ki, lon, lat, ha); proyeksi per grid dihitung malas."""
    def __init__(self, kec):
        self.nama = sorted(kec)
        total = luas_derajat([r for n in self.nama for r in kec[n]])
        self.langkah = max(LANGKAH_MIN, math.sqrt(total / MAKS_TITIK)) if total else LANGKAH_MIN
        self.p = []
        for i, n in enumerate(self.nama):
            titik_poligon(kec[n], self.langkah, i, self.p)
        lons, lats = [p[1] for p in self.p], [p[2] for p in self.p]
        self.kotak = [min(lons), min(lats), max(lons), max(lats)] if self.p else None
        self._xy = {}

    def xy(self, g):
        if g not in self._xy:
            k = Kisi(g, self.kotak)
            self._xy[g] = [k(p[1], p[2]) for p in self.p]
        return self._xy[g]

    def ubin(self):
        """{nama ubin: bagian titik} untuk grid yang ada di katalog; dihitung dari sampel jarang."""
        out = {}
        langkah = max(1, len(self.p) // 3000)
        for g in GRID:
            xy = self.xy(g)
            for i in range(0, len(self.p), langkah):
                x, y = xy[i]
                n = f"{g}020M_E{int(x // 300000) * 3:03d}N{int(y // 300000) * 3:03d}T3"
                out[n] = out.get(n, 0) + 1
        n_s = len(range(0, len(self.p), langkah))
        return {n: c / n_s for n, c in out.items()}


# ---------------------------------------------------------------- hitung luas
KUNCI = ("luas_ha", "diamati_ha", "mask_ha", "air_ha", "tergenang_ha", "latar_ha", "baru_ha")


class Lintas:
    """Satu lintasan = beberapa bingkai Sentinel-1 berurutan (selang menit) di ubin yang sama: per piksel dipakai bingkai
    pertama yang teramati (!= 255). fm = [(flood, mask atau None)]; baca(col,row) -> (flood, mask)."""
    def __init__(self, fm):
        self.fm = fm

    def semua(self):
        return [x for f, m in self.fm for x in (f, m) if x is not None]

    def baca(self, c, b):
        for f, m in self.fm:
            v = f.nilai(c, b)
            if v != 255:
                return v, (m.nilai(c, b) if m is not None else 0)
        return 255, 0


def hitung(pt, nama_ubin, lin, r, pra=None, bgn=None, hasil_b=None):
    """Akumulasi per kecamatan (urutan KUNCI) untuk titik `pt` di ubin `nama_ubin`. lin/pra = Lintas; r = air tetap (nilai/siapkan).
    flood: 0 kering, 1 tergenang, 255 tak teramati; mask 1 = ter-mask; r 1 = air tetap. Titik luar ubin hanya menambah luas.
    baru = tergenang sesudah, kering TERAMATI (0) di pra; latar = piksel yang teramati di lintasan sesudah (v != 255), bukan air tetap, dan tergenang di pra dengan pra tak ter-mask (domain sama dengan tergenang).
    bgn = {(i,j): (n, luas)} grid bangunan halus; hasil_b diisi {(ki,i,j): [n, ha_tergenang, ha_baru]} hanya sel berisi bangunan."""
    g, x0, ya = ubin_dari_nama(nama_ubin)
    sel, blok = [], set()
    for i, (x, y) in enumerate(pt.xy(g)):
        if x0 <= x < x0 + 300000 and ya - 300000 < y <= ya:
            c, b = int((x - x0) // 20), int((ya - y) // 20)
            sel.append((i, c, b))
            blok.add((c // 512, b // 512))
    semua = lin.semua() + [r] + (pra.semua() if pra is not None else [])
    with ThreadPoolExecutor(8) as ex:   # latensi server GFM 3-7 dtk per permintaan: paralel antarraster
        list(ex.map(lambda x: x.siapkan(blok), semua))
    acc = [[0.0] * len(KUNCI) for _ in pt.nama]
    for ki, _, _, ha in pt.p:
        acc[ki][0] += ha
    for i, c, b in sel:
        ki, ha = pt.p[i][0], pt.p[i][3]
        a, w = acc[ki], r.nilai(c, b)
        v, e = lin.baca(c, b)
        if v == 255:
            continue
        if pra is not None:
            pv, pe = pra.baca(c, b)
            if pv == 1 and pe != 1 and w != 1:   # latar: domain SAMA dengan tergenang (sesudah teramati, bukan air tetap)
                a[5] += ha
        a[1] += ha
        if e == 1:
            a[2] += ha
        if w == 1:
            a[3] += ha
        if v == 1 and e != 1 and w != 1:
            a[4] += ha
            baru = pra is not None and pv == 0
            if baru:
                a[6] += ha
            if bgn is not None:
                _, lo, la, _ = pt.p[i]
                c = (math.floor((la - BG.LAT0) * BG.HALUS), math.floor((lo - BG.LON0) * BG.HALUS))
                v_b = bgn.get(c)
                if v_b:
                    z = hasil_b.setdefault((ki,) + c, [v_b[0], 0.0, 0.0])
                    z[1] += ha
                    if baru:
                        z[2] += ha
    return acc


def ha_sel(i):
    """Luas sel halus baris i (ha)."""
    return BG.STEP / 10 * 111.32 * math.cos(math.radians(BG.LAT0 + (i + .5) / BG.HALUS)) * BG.STEP / 10 * 110.57 * 100


def hitung_bangunan(sel, nama):
    """sel = [[ki,i,j,n,ha_tergenang,ha_baru]] -> (total, per kec). Tiap hasil = {tergenang:[bawah,atas], baru:[bawah,atas]}.
    Bawah = n x min(1, ha_tergenang_dalam_sel / luas_sel); atas = n penuh bila ada titik tergenang di sel. Kabupaten: sel yang
    terbelah antar kecamatan digabung dulu (tak dihitung dua kali)."""
    def agregat(baris):
        out = {"tergenang": [0.0, 0.0], "baru": [0.0, 0.0]}
        for k, idx in (("tergenang", 4), ("baru", 5)):
            gab = {}
            for r in baris:
                g = gab.setdefault((r[1], r[2]), [r[3], 0.0])
                g[1] += r[idx]
            for (i, _), (n, ha) in gab.items():
                if ha > 0:
                    out[k][0] += n * min(1.0, ha / ha_sel(i))
                    out[k][1] += n
        return {k: [round(v[0]), round(v[1])] for k, v in out.items()}
    per = {}
    for r in sel:
        per.setdefault(r[0], []).append(r)
    return agregat(sel), {nama[k]: agregat(v) for k, v in per.items()}


def grid_bangunan(prov):
    """({(i,j):(n,luas)}, None) bila grid halus provinsi ada; (None, alasan) bila tidak."""
    try:
        return BG._indeks(prov)[0], None
    except FileNotFoundError:
        return None, f"grid bangunan halus provinsi {prov} belum dibuat (scripts/umum/bangunan.py --prov {prov})"


def rangkum(acc):
    return [sum(a[j] for a in acc) for j in range(len(KUNCI))]


def cakupan(tot):
    """% luas dengan bacaan sah: (diamati - mask) / luas."""
    return round(100 * (tot[1] - tot[2]) / tot[0], 1) if tot[0] else 0.0


def lemah(nilai, lat_pra):
    """sinyal_lemah: nilai (tergenang_baru_ha bila ada kontrol pra, kalau tidak tergenang_ha) <= 0, atau (ada kontrol dan)
    nilai < 2x latar. None bila tak ada kontrol dan ada genangan."""
    if nilai <= 0:
        return True
    return None if lat_pra is None else nilai < 2 * lat_pra


def menit(iso):
    return dt.datetime.fromisoformat(iso.replace("Z", "+00:00"))


def pilih_pra(lintasan_ub, post):
    """Lintasan PRA ubin yang sama: 8-45 hari sebelum, jam lintas +-90 mnt (orbit sama); terdekat ke post."""
    t = menit(post["t"])
    out = []
    for k in lintasan_ub:
        s = menit(k["t"])
        sel = (t - s).total_seconds() / 86400
        dm = abs((s.hour * 60 + s.minute) - (t.hour * 60 + t.minute))
        dm = min(dm, 1440 - dm)
        if PRA[0] <= sel <= PRA[1] and dm <= JAM_PRA:
            out.append((sel, k))
    return min(out, key=lambda x: x[0])[1] if out else None


class Katalog:
    """Item -> lintasan: bingkai satu ubin yang berselang <= 10 menit adalah SATU lintasan (3 bingkai berurutan = satu lewat)."""
    def __init__(self, item):
        self.ub = {}
        per = {}
        for k in item.values():
            if k["f"]:
                per.setdefault(k["ub"], []).append(k)
        for n, ks in per.items():
            ks.sort(key=lambda k: k["t"])
            ls = []
            for k in ks:
                if ls and (menit(k["t"]) - menit(ls[-1]["fr"][-1]["t"])).total_seconds() <= 600:
                    ls[-1]["fr"].append(k)
                else:
                    ls.append({"t": k["t"], "ub": n, "fr": [k]})
            for l in ls:
                l["id"] = l["fr"][0]["id"]
                l["r"] = next((k["r"] for k in l["fr"] if k.get("r")), None)
                l["fp"] = sum(k["fp"] or 0 for k in l["fr"])
                l["an"] = any(k["an"] for k in l["fr"])
            self.ub[n] = [l for l in ls if l["r"]]

    def kandidat(self, ubin_frak, awal, akhir):
        a, b = awal.isoformat(), (akhir + dt.timedelta(days=1)).isoformat()
        c = [(-fr, l["t"], n, l) for n, fr in ubin_frak.items() for l in self.ub.get(n, []) if a <= l["t"] < b]
        return [(n, l) for _, _, n, l in sorted(c, key=lambda z: z[:3])]


def hitung_pasangan(pt, kat, awal, jendela, buka=Raster, prov=None):
    """-> dict hasil kabupaten untuk satu pasangan, atau {'status': 'tanpa_lintasan'}. `buka` = pembuat Raster (disuntik saat uji)."""
    akhir = awal + dt.timedelta(days=jendela)
    cand = kat.kandidat(pt.ubin(), awal, akhir)[:MAKS_KANDIDAT]
    if not cand:
        return {"status": "tanpa_lintasan", "luas_ha": round(sum(p[3] for p in pt.p), 1)}
    ras = {}
    ambil = lambda href: ras[href]

    def muat(passes):
        hrefs = {h for l in passes for k in l["fr"] for h in (k["f"], k["m"]) if h} | {l["r"] for l in passes}
        hrefs = [h for h in hrefs if h not in ras]
        with ThreadPoolExecutor(12) as ex:
            ras.update(zip(hrefs, ex.map(lambda h: buka(HULU + h), hrefs)))
    muat([l for _, l in cand])
    lintas = lambda l: Lintas([(ambil(k["f"]), ambil(k["m"]) if k["m"] else None) for k in l["fr"]])
    baik = None
    for n, l in cand:
        tot = rangkum(hitung(pt, n, lintas(l), ambil(l["r"])))
        c = cakupan(tot)
        if baik is None or (c, tot[1]) > baik[:2]:
            baik = (c, tot[1], n, l)
    c, diamati, n, l = baik
    if diamati <= 0:   # tak satu bingkai pun menutup kabupaten dalam jendela: bukan "tak banjir", hanya tak teramati
        return {"status": "tanpa_cakupan", "n_kandidat": len(cand), "luas_ha": round(sum(p[3] for p in pt.p), 1)}
    pra = pilih_pra(kat.ub[n], l)
    if pra:
        muat([pra])
    bgn, alasan = grid_bangunan(prov) if prov else (None, "provinsi tak diketahui")
    sel = {}
    acc = hitung(pt, n, lintas(l), ambil(l["r"]), lintas(pra) if pra else None, bgn, sel)
    tot = rangkum(acc)
    lat = tot[5] if pra else None
    kec = {nm: [round(x, 1) for x in a[:5]] + [round(a[5], 1) if pra else None, round(a[6], 1) if pra else None]
           for nm, a in zip(pt.nama, acc) if a[1] > 0}
    return {"status": "ok", "post": l["id"], "tgl": l["t"], "n_bingkai": len(l["fr"]), "pra": pra["id"] if pra else None,
            "pra_tgl": pra["t"] if pra else None, "ubin": n, "n_kandidat": len(cand), "luas_ha": round(tot[0], 1),
            "diamati_ha": round(tot[1], 1), "mask_ha": round(tot[2], 1), "air_ha": round(tot[3], 1), "tergenang_ha": round(tot[4], 1),
            "latar_ha": round(lat, 1) if pra else None, "tergenang_baru_ha": round(tot[6], 1) if pra else None,
            "cakupan_pct": cakupan(tot), "sinyal_lemah": lemah(tot[6] if pra else tot[4], lat), "fp_item": l["fp"], "anomali": l["an"],
            "byte": sum(r.rf.byte for r in ras.values()), "kec": kec,
            "bangunan_sel": [[ki, i, j] + v for (ki, i, j), v in sorted(sel.items())] if bgn is not None else None,
            "bangunan_nama": pt.nama, "bangunan_alasan": alasan}


# ---------------------------------------------------------------- pasangan
def tgl(s):
    return dt.date.fromisoformat(s[:10])


def baris_dibi():
    d = baca(DIBI_BERKAS)
    if d is None:
        sys.path.insert(0, os.path.join(AYAH, "..", "data"))   # kejadian.py karhutla/banjir: DIBI Superset (tanpa kunci)
        sys.path.insert(0, AYAH)
        from kejadian import dibi, Pencocok
        d = [[j, p, n, t, v] for j, p, n, t, v in dibi(Pencocok())]
        simpan(DIBI_BERKAS, d)
    return d


def pasangan_dibi(a):
    """Kabupaten-hari banjir/bandang DIBI, terbesar menurut terdampak (lalu mengungsi). Filter --prov/--dari/--sampai, maks --maks."""
    per = {}
    for j, p, n, t, v in baris_dibi():
        if not ({"banjir", "bandang"} & set(j)) or t < "2015-10-01":
            continue
        if (a.prov and p not in a.prov) or (a.dari and t < a.dari) or (a.sampai and t > a.sampai):
            continue
        s = per.setdefault((p, n, t), [0, 0])
        s[0] += v.get("terdampak", 0)
        s[1] += v.get("mengungsi", 0)
    urut = sorted(per, key=lambda k: (-per[k][0], -per[k][1], k))
    if a.pilih:
        pil = {tuple(x.split("|")) for x in a.pilih}
        urut = [k for k in per if k in pil] + [k for k in pil if k not in per]
    return [{"sumber": "dibi", "prov": p, "kab": n, "acuan": t, "kunci": f"dibi|{p}|{n}|{t}", "kec": None,
             "terdampak": per.get((p, n, t), [0, 0])[0]} for p, n, t in urut[:a.maks]]


def pasangan_aktif():
    d = baca(os.path.join(KELUAR, "kejadian_aktif_awal.json"), {})
    out = []
    for ev in d.get("kejadian", []):
        per = {}
        for s in ev.get("kec", []):
            p, kab, kec = s.split("|")
            per.setdefault((p, kab), set()).add(kec)
        for (p, kab), ks in sorted(per.items()):
            out.append({"sumber": "aktif", "prov": p, "kab": kab, "acuan": ev["sejak"], "kode": ev["kode"],
                        "kunci": f"aktif|{ev['kode']}|{p}|{kab}|{ev['sejak']}", "kec": sorted(ks)})
    return out


def muat_hasil():
    out = {}
    if os.path.exists(HASIL):
        for g in builtins.open(HASIL):
            try:
                d = json.loads(g)
            except ValueError:
                continue
            out[d["kunci"]] = d
    return out


def tambah_hasil(rec):
    os.makedirs(DIR, exist_ok=True)
    with builtins.open(HASIL, "a") as g:
        g.write(json.dumps(rec, ensure_ascii=False, separators=(",", ":")) + "\n")


def luas(a):
    kat = Katalog(muat_item())
    if not kat.ub:
        sys.exit("katalog kosong: jalankan `katalog` dulu")
    sudah = muat_hasil()
    pas = (pasangan_aktif() if a.aktif else []) + (pasangan_dibi(a) if a.riwayat else [])
    todo = [ps for ps in pas if ps["kunci"] not in sudah or (ps["sumber"] == "aktif" and sudah[ps["kunci"]].get("status") == "tanpa_lintasan")]
    if len(todo) > a.anggaran:
        print(f"anggaran {a.anggaran} dari {len(todo)} pasangan; sisanya di jalan berikut (cache)", file=sys.stderr)
        todo = todo[:a.anggaran]
    mulai, kunci = time.time(), threading.Lock()

    def kerja(ps):
        if time.time() - mulai > MAKS_DETIK:
            return
        t0 = time.time()
        try:
            kec = kec_kab(ps["prov"], ps["kab"], set(ps["kec"]) if ps["kec"] else None)
            rec = {"status": "tanpa_poligon"} if not kec else hitung_pasangan(Titik(kec), kat, tgl(ps["acuan"]), JENDELA[ps["sumber"]], prov=ps["prov"])
        except Exception as e:   # satu pasangan gagal tidak mematikan sisanya; tidak di-cache, diulang jalan berikut
            print(f"  GAGAL {ps['kunci']}: {type(e).__name__} {e}", file=sys.stderr)
            return
        rec.update({k: v for k, v in ps.items() if k != "kec"})
        with kunci:
            tambah_hasil(rec)
            sudah[ps["kunci"]] = rec
            print(f"  {ps['kunci']}: {rec['status']} {rec.get('tgl', '')[:10]} baru={rec.get('tergenang_baru_ha')} "
                  f"tergenang={rec.get('tergenang_ha')} cakupan={rec.get('cakupan_pct')} lemah={rec.get('sinyal_lemah')} ({time.time() - t0:.0f} dtk)", flush=True)
    with ThreadPoolExecutor(a.paralel) as ex:
        list(ex.map(kerja, todo))
    terbit(sudah)


# ---------------------------------------------------------------- keluaran
def terbit(hasil=None):
    hasil = hasil if hasil is not None else muat_hasil()
    ok = [h for h in hasil.values() if h.get("status") == "ok"]
    def bgn_h(h):
        """-> (total atau None, per kec, alasan). Cache lama tanpa bangunan_sel = belum dihitung."""
        if h.get("bangunan_sel") is None:
            alasan = h.get("bangunan_alasan") or grid_bangunan(h["prov"])[1] or "belum dihitung (jalankan ulang pasangan ini)"
            return None, {}, alasan
        t, per = hitung_bangunan(h["bangunan_sel"], h["bangunan_nama"])
        return t, per, None

    # label CSV: satu baris per kabupaten-hari yang punya lintasan
    os.makedirs(DIR, exist_ok=True)
    with builtins.open(LABEL, "w", newline="") as g:
        w = csv.writer(g)
        w.writerow(["prov|kab", "tanggal_lintasan", "tergenang_baru_ha", "diamati_ha", "cakupan_pct", "acuan", "sumber", "tergenang_ha", "sinyal_lemah", "bangunan_baru_bawah", "bangunan_baru_atas"])
        for h in sorted(ok, key=lambda h: (h["prov"], h["kab"], h["tgl"])):
            bt = bgn_h(h)[0]
            w.writerow([f"{h['prov']}|{h['kab']}", h["tgl"][:10], "" if h["tergenang_baru_ha"] is None else h["tergenang_baru_ha"],
                        h["diamati_ha"], h["cakupan_pct"], h["acuan"], h["sumber"], h["tergenang_ha"],
                        "" if h["sinyal_lemah"] is None else int(h["sinyal_lemah"]),
                        *(bt["baru"] if bt else ["", ""])])

    def ringkas(h):
        bt, bper, balasan = bgn_h(h)
        kec = sorted(h["kec"].items(), key=lambda kv: -(kv[1][6] or kv[1][4]))[:12]
        return {"prov": h["prov"], "kab": h["kab"], "acuan": h["acuan"], "lintasan": h["tgl"][:16] + "Z", "pra": (h["pra_tgl"] or "")[:10] or None,
                "ubin": h["ubin"], "tergenang_ha": h["tergenang_ha"], "tergenang_baru_ha": h["tergenang_baru_ha"], "latar_ha": h["latar_ha"],
                "diamati_ha": h["diamati_ha"], "mask_ha": h["mask_ha"], "luas_ha": h["luas_ha"], "cakupan_pct": h["cakupan_pct"],
                "sinyal_lemah": h["sinyal_lemah"],
                "bangunan": bt if bt is None else {"tergenang_baru": bt["baru"], "tergenang": bt["tergenang"]}, "bangunan_alasan": balasan,
                "kec": {n: {**dict(zip(("luas", "diamati", "mask", "air", "tergenang", "latar", "baru"), v)),
                            **({"bangunan_baru": bper[n]["baru"]} if bt is not None and n in bper else {})} for n, v in kec}}
    aktif = {}
    for h in ok:
        if h["sumber"] == "aktif":
            aktif.setdefault(h["kode"], []).append(ringkas(h))
    riwayat = sorted((ringkas(h) for h in ok if h["sumber"] == "dibi"), key=lambda r: -(r["tergenang_baru_ha"] or r["tergenang_ha"] or 0))
    item = muat_item()
    out = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "sumber": ATRIBUSI,
           "_catatan": [
               "Luas = perkiraan radar (Sentinel-1, Copernicus GFM), BUKAN ukur lapangan; cenderung di bawah di permukiman dan hutan (mask). Sawah yang baru dialiri atau ditanami dan tanah basah bisa terhitung tergenang, jadi luas bisa di atas atau di bawah banjir sebenarnya.",
               "Radar buta di kota padat dan lahan terbuka tertentu (exclusion_mask): mask_ha dilaporkan terpisah dan tidak dihitung banjir; cakupan_pct = (diamati - mask) / luas.",
               "Air tetap (reference_water_mask: sungai, danau, tambak) dibuang dari tergenang_ha supaya tidak terhitung banjir.",
               "Lintasan 6-12 hari sekali: banjir singkat yang surut di antara dua lintasan terlewat. Dipilih lintasan dengan cakupan kabupaten terbesar dalam jendela (aktif 0-12 hari, riwayat 0-6 hari sesudah tanggal acuan).",
               "tergenang_baru_ha = tergenang sesudah dan teramati kering di lintasan pra (ubin sama, jam lintas serupa, 8-45 hari sebelumnya); piksel pra tak teramati tidak dihitung baru. null = tak ada lintasan pra.",
               "latar_ha = luas piksel yang teramati di lintasan sesudah (flood != 255), bukan air tetap, dan tergenang (flood == 1) di lintasan pra dengan pra tak ter-mask: domain yang sama dengan tergenang_ha. sinyal_lemah = tergenang_baru_ha <= 0, atau tergenang_baru_ha < 2 x latar_ha. Tanpa lintasan pra: tergenang_ha <= 0 -> true, selain itu null.",
               "bangunan = jumlah bangunan Google Open Buildings v3 (keyakinan >= 0,70) di sel 110 m yang tergenang, BUKAN rumah dan BUKAN bangunan terendam pasti. Atribusi wajib (CC BY 4.0): Google Open Buildings v3. INDIKATIF, bisa jauh di bawah kenyataan: bangunan di area ter-mask (permukiman padat) tidak terhitung dan radar kurang melihat air di antara bangunan. [bawah, atas] = rentang dengan anggapan sebaran merata di sel 110 m, BUKAN batas terjamin. null = grid bangunan provinsi belum ada.",
               "Sampel titik ~65 m atau lebih lebar pada kabupaten raksasa (tiap 600 rb sampel), bukan hitung piksel penuh; ketelitian ~ beberapa persen luas."],
           "boleh_tampil": {"luas": True, "bangunan": False,
                            "alasan_bangunan": "menunggu koreksi permukiman FwDET; Demak 2024 5-12x di bawah DIBI"},
           "katalog": {"item_total": len(item), "per_tahun": per_tahun_item(item)},
           "n_pasangan": {"ok": len(ok), "tanpa_lintasan": sum(1 for h in hasil.values() if h.get("status") == "tanpa_lintasan"),
                                  "tanpa_cakupan": sum(1 for h in hasil.values() if h.get("status") == "tanpa_cakupan")},
           "aktif": aktif, "riwayat": riwayat}
    while len(json.dumps(out, ensure_ascii=False, separators=(",", ":"))) > MAKS_BYTE_KELUARAN and out["riwayat"]:
        out["riwayat"].pop()
        out["riwayat_dipangkas"] = True
    simpan(KELUARAN, out)
    print(f"{KELUARAN}: {os.path.getsize(KELUARAN) / 1000:.0f} KB, {len(ok)} pasangan ok, label {LABEL}")


# ---------------------------------------------------------------- uji
class Palsu:
    """Raster sintetis: dict (col,row)->nilai, bawaan `d`."""
    def __init__(self, isi, d=0):
        self.isi, self.d, self.rf = isi, d, type("R", (), {"byte": 0})()

    def siapkan(self, blok):
        pass

    def nilai(self, c, b):
        return self.isi.get((c, b), self.d)


def uji():
    import tempfile
    # ubin & proyeksi: Monas dan Meulaboh jatuh di ubin yang benar; interpolasi bilinear < 1 m dari eksak
    g, x0, ya = ubin_dari_nama("OC020M_E042N087T3")
    assert (g, x0, ya) == ("OC", 4200000, 9000000)
    x, y = maju("OC", 106.8272, -6.1754)
    assert 4_200_000 <= x < 4_500_000 and 8_700_000 <= y < 9_000_000, (x, y)
    x, y = maju("AS", 101.5, 7.2)   # pusat bingkai AS020M_E051N003T3 (STAC: lon 100,3-102,9, lat 5,9-8,8)
    assert 5_100_000 <= x < 5_400_000 and 300_000 <= y < 600_000, (x, y)
    for gr, (lo, la) in (("OC", (110.4, -7.0)), ("AS", (96.2, 4.1))):
        k = Kisi(gr, [lo - .3, la - .3, lo + .3, la + .3])
        ex, ey = maju(gr, lo, la)
        ix, iy = k(lo, la)
        assert math.hypot(ex - ix, ey - iy) < 1, (gr, ex - ix, ey - iy)
    # scanline: persegi 0,1 x 0,1 derajat di ekuator = 0,01 deg2; luas ha ~ 123 km2 * 100
    r = [[0, 0], [0.1, 0], [0.1, 0.1], [0, 0.1]]
    h = []
    titik_poligon([r], 0.001, 0, h)
    assert len(h) == 10000, len(h)
    assert abs(sum(p[3] for p in h) - 0.1 * 111.32 * 0.1 * 110.57 * 100) / (0.1 * 111.32 * 0.1 * 110.57 * 100) < .001
    # lubang/dua cincin: genap-ganjil
    h2 = []
    titik_poligon([r, [[0.02, 0.02], [0.04, 0.02], [0.04, 0.04], [0.02, 0.04]]], 0.001, 0, h2)
    assert len(h2) == 10000 - 400, len(h2)
    # aritmetika hitung: 2 kecamatan, 3 titik di ubin, satu di luar ubin; kecamatan 0: tergenang, air tetap, mask, tak teramati
    lo0, la0 = BG.LON0 + .0005, BG.LAT0 + .0005   # titik di sel halus (0, 0)
    class T:
        nama = ["A", "B"]
        p = [(0, lo0, la0, 10.0), (0, lo0, la0, 10.0), (0, lo0, la0, 10.0), (0, lo0, la0, 10.0), (1, lo0, la0, 5.0), (1, lo0, la0, 5.0)]
        def xy(self, g):  # (col,row) = (i,0); titik 5 di luar ubin
            return [(4200000 + 20 * i + 1, 9000000 - 1) for i in range(5)] + [(1, 1)]
    f = Palsu({(0, 0): 1, (1, 0): 1, (2, 0): 1, (3, 0): 255, (4, 0): 1}, 0)
    m = Palsu({(1, 0): 1, (4, 0): 1}, 0)           # titik 1 ter-mask, titik 4 ter-mask
    rw = Palsu({(2, 0): 1}, 0)                       # titik 2 air tetap
    pr = Lintas([(Palsu({(0, 0): 1, (3, 0): 1}, 0), None)])     # titik 0 sudah tergenang sebelumnya; titik 3 juga tapi tak teramati sesudah
    a = hitung(T(), "OC020M_E042N087T3", Lintas([(f, m)]), rw, pr)
    # A: luas 40; diamati 30 (titik 3 = 255); mask 10; air 10; tergenang = hanya titik 0 = 10; latar 10 (titik 0 pra); baru 0
    assert a[0][:5] == [40.0, 30.0, 10.0, 10.0, 10.0] and a[0][5] == 10.0 and a[0][6] == 0.0, a[0]   # latar titik 3 (post 255) tak dihitung: domain sama dengan tergenang
    # B: luas 10 (titik 4 mask, dalam ubin; titik 5 luar ubin), diamati 5, mask 5, tergenang 0
    assert a[1][:5] == [10.0, 5.0, 5.0, 0.0, 0.0], a[1]
    sl = {}
    hitung(T(), "OC020M_E042N087T3", Lintas([(f, m)]), rw, pr, {(0, 0): (7, 100.0)}, sl)
    assert sl == {(0, 0, 0): [7, 10.0, 0.0]}, sl      # titik 0: tergenang, bukan baru (pra tergenang)
    sl = {}
    hitung(T(), "OC020M_E042N087T3", Lintas([(f, m)]), rw, Lintas([(Palsu({}, 0), None)]), {(0, 0): (7, 100.0), (9, 9): (3, 1.0)}, sl)
    assert sl == {(0, 0, 0): [7, 10.0, 10.0]}, sl     # tanpa sel berisi bangunan lain
    # bangunan: sel 110 m (luas A) terbelah dua kecamatan: 0,25 A dan 0,5 A; kab gabung = 0,75 A; atas = n penuh sekali
    A = ha_sel(5)
    tb, per = hitung_bangunan([[0, 5, 5, 100, .25 * A, 0.0], [1, 5, 5, 100, .5 * A, 0.0], [0, 6, 6, 10, 3 * A, 0.0]], ["X", "Y"])
    assert per["X"]["tergenang"] == [round(25 + 10 * min(1, 3 * A / ha_sel(6))), 110], per
    assert per["Y"]["tergenang"] == [50, 100] and per["Y"]["baru"] == [0, 0]
    assert tb["tergenang"] == [round(75 + 10), 110], tb      # sel (5,5) tak dihitung dua kali; pecahan dibatasi 1
    assert hitung_bangunan([], [])[0] == {"tergenang": [0, 0], "baru": [0, 0]}
    g, alasan = grid_bangunan("99")
    assert g is None and "99" in alasan   # tanpa grid: null + alasan, bukan 0
    a2 = hitung(T(), "OC020M_E042N087T3", Lintas([(f, m)]), rw, Lintas([(Palsu({}, 0), None)]))   # pra kering teramati: titik 0 baru
    assert a2[0][4] == 10.0 and a2[0][6] == 10.0 and a2[0][5] == 0.0
    a3 = hitung(T(), "OC020M_E042N087T3", Lintas([(f, m)]), rw, Lintas([(Palsu({}, 255), None)]))  # pra tak teramati: tak dihitung baru
    assert a3[0][6] == 0.0
    # dua bingkai satu lintasan: bingkai pertama kosong (255) di titik 0, bingkai kedua mengisi
    a4 = hitung(T(), "OC020M_E042N087T3", Lintas([(Palsu({}, 255), None), (f, m)]), rw)
    assert a4[0][:5] == a[0][:5], a4[0]
    assert cakupan([40, 30, 10, 0, 0, 0, 0]) == 50.0
    # sinyal_lemah
    assert lemah(0, 0) is True and lemah(0, 5) is True and lemah(9, 5) is True and lemah(10, 5) is False and lemah(10, None) is None
    # pilih_pra: ubin sama, 8-45 hari, jam serupa
    post = {"t": "2024-01-20T22:00:00Z"}
    ks = [{"t": "2024-01-08T22:05:00Z"}, {"t": "2024-01-14T22:05:00Z"}, {"t": "2024-01-08T10:00:00Z"}, {"t": "2023-10-01T22:00:00Z"}]
    assert pilih_pra(ks, post)["t"] == "2024-01-08T22:05:00Z"   # 14 Jan terlalu dekat (6 hari), 08 Jan beda jam diabaikan
    assert lzw(bytes.fromhex("80 0b 60 50 22 0c 0c 85 01".replace(" ", ""))) == b"-----A---B"  # contoh spesifikasi TIFF 6.0
    # lintasan: 3 bingkai berselang menit = satu lintasan; bingkai 12 jam kemudian lintasan lain
    def b(i, t):
        return {"id": i, "ub": "OC020M_E030N096T3", "t": t, "f": "f", "m": "m", "r": "r", "fp": 5, "an": False}
    kt = Katalog({i: b(i, t) for i, t in (("a", "2020-01-05T22:00:00Z"), ("b", "2020-01-05T22:00:25Z"), ("c", "2020-01-05T22:00:50Z"), ("d", "2020-01-06T10:00:00Z"))})
    assert [(len(l["fr"]), l["fp"]) for l in kt.ub["OC020M_E030N096T3"]] == [(3, 15), (1, 5)]
    # katalog lanjut dari cache: bulan selesai tidak diminta lagi, item terpotong dibuang
    global DIR, ITEM, BULAN, UBIN_BULAN, stac_post, JEDA
    simpan_ = (DIR, ITEM, BULAN, UBIN_BULAN, stac_post, JEDA)
    DIR = tempfile.mkdtemp()
    ITEM, BULAN, UBIN_BULAN = (os.path.join(DIR, n) for n in ("item.jsonl", "katalog_bulan.json", "ringkas_ubin_bulan.json"))
    panggilan = []
    def fitur(i, ym):
        return {"id": f"X_{ym}_{i}", "bbox": [100, 0, 101, 1], "properties": {"datetime": f"{ym}-05T10:00:00Z", "Equi7Tile": "OC020M_E030N096T3", "flooded_pixels": 7},
                "assets": {"ensemble_flood_extent": {"href": HULU + "f.tif"}, "exclusion_mask": {"href": HULU + "m.tif"}, "reference_water_mask": {"href": HULU + "r.tif"}}}
    def palsu_stac(badan):
        panggilan.append(badan["datetime"][:7])
        return {"features": [fitur(i, badan["datetime"][:7]) for i in range(3)], "links": []}
    stac_post, JEDA = palsu_stac, 0
    try:
        it = katalog("2020-01", "2020-03")
        assert len(it) == 9 and panggilan == ["2020-01", "2020-02", "2020-03"], (len(it), panggilan)
        builtins.open(ITEM, "a").write('{"id": "terpotong')
        it = katalog("2020-01", "2020-03")
        assert len(it) == 9 and len(panggilan) == 3, "bulan selesai tidak boleh diminta ulang"
        assert per_tahun_item(it) == {"2020": 9} and it["X_2020-01_0"]["r"] == "r.tif", it["X_2020-01_0"]["r"]
        # kandidat + pasangan sintetis dari ujung ke ujung (tanpa jaringan)
        kat = Katalog(it)
        assert len(kat.kandidat({"OC020M_E030N096T3": 1.0}, dt.date(2020, 1, 1), dt.date(2020, 1, 6))) == 1   # 3 bingkai satu jam = satu lintasan
        # cache hasil: tulis dua baris + satu baris terpotong, muat kembali
        global HASIL
        HASIL = os.path.join(DIR, "hasil.jsonl")
        tambah_hasil({"kunci": "k1", "status": "ok"})
        builtins.open(HASIL, "a").write('{"kunci": "k2", "stat')
        assert set(muat_hasil()) == {"k1"}
    finally:
        DIR, ITEM, BULAN, UBIN_BULAN, stac_post, JEDA = simpan_
    print("ok")


def utama():
    p = argparse.ArgumentParser()
    p.add_argument("mode", choices=["katalog", "luas", "terbit", "uji"])
    p.add_argument("--dari")
    p.add_argument("--sampai")
    p.add_argument("--aktif", action="store_true")
    p.add_argument("--riwayat", action="store_true")
    p.add_argument("--prov", nargs="*")
    p.add_argument("--maks", type=int, default=30)
    p.add_argument("--pilih", nargs="*")
    p.add_argument("--anggaran", type=int, default=40)
    p.add_argument("--paralel", type=int, default=2, help="pasangan yang dikerjakan bersamaan (server GFM lambat, 3-7 dtk per permintaan)")
    a = p.parse_args()
    if a.mode == "uji":
        uji()
    elif a.mode == "katalog":
        katalog(a.dari or AWAL_ARSIP, a.sampai)
    elif a.mode == "terbit":
        terbit()
    else:
        luas(a)


if __name__ == "__main__":
    utama()
