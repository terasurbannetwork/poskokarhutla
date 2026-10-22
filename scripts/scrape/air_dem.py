"""Sumber air titik (embung/waduk/danau/kolam, sungai, kanal) per kompleks api + beda tinggi dari DEM terbuka (Fase 3.2 dan 3.3 RANCANGAN-API-PADAM.md).

Dipanggil akses.harian() sesudah rute dihitung: tiap entri akses.json mendapat kunci `air`:
  {"elev_m": elevasi kompleks (m), "dem": "...", "sumber": [{"jenis": "tampungan|sungai|kanal|anak_sungai", "lat", "lon", "km" (GARIS LURUS), "elev_m", "beda_tinggi_m"}]}
`beda_tinggi_m` = elevasi kompleks MINUS elevasi sumber: positif = api lebih tinggi dari air, selang/pompa harus menaikkan (sama dengan arti `bedaTinggiM` di
src/operasi_lapangan.js hitungEstafet; negatif diabaikan di sana). Jarak selang = `km` x 1,2 dikenakan hitungEstafet sendiri (FAKTOR_JARAK_SELANG), jadi `km` di sini TIDAK dikali.
Satu sumber terdekat per jenis dalam CARI_KM (maks 3), terurut menurut jarak. Terdekat menurut garis lurus, bukan jarak graf: selang tidak mengikuti jalan.

Sumber titik: data/air_titik.json.gz (dibangun `bangun` dari mentah OSM, statis.yml, disimpan di cache Actions seperti graf jalan); tak ada = jatuh ke public/data/osm/<kode>.json
(`air`, hanya provinsi yang ter-commit). Tidak ada keduanya = `air` tidak ditulis (bukan nol). Cakupan = provinsi yang mentahnya sudah ditarik (tarik_osm.py air, sungai).
Titik sungai/kanal = contoh tiap ~1 km sepanjang ruas (osm.sampel) lalu dijarangkan ke satu titik per sel 0,005 derajat per jenis. Parit/drain TIDAK dimuat (terlalu rapat, bukan sumber pompa).
`waterway=stream` (anak sungai kecil) belum ditarik: kelas "anak_sungai" siap dibaca bila mentahnya ada, lihat KELAS.

DEM: ubin Terrarium zoom 12 (AWS Open Data elevation-tiles-prod; gabungan SRTM/Copernicus/lainnya, ~38 m/piksel di khatulistiwa, sama dengan public/sim_topo.js). PNG didekode
dengan stdlib. Elevasi = (R x 256 + G + B/256) - 32768 pada piksel terdekat; galat vertikal puluhan meter di hutan lebat/gambut berkubah (DEM = permukaan kanopi/tanah campuran), jadi beda tinggi
kecil (< ~10 m) tidak bermakna. Ubin yang gagal diambil: elev_m/beda_tinggi_m = null (bukan nol). Anggaran: MAKS_UBIN ubin dan MAKS_DETIK per jalan.

Pakai:  python3 scripts/scrape/air_dem.py bangun   # mentah OSM -> data/air_titik.json.gz
        python3 scripts/scrape/air_dem.py uji      # self-check tanpa jaringan
"""
import glob, gzip, json, math, os, struct, sys, time, urllib.request, zlib
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
MENTAH = os.path.join(AKAR, "data/raw/osm")
TITIK = os.path.join(AKAR, "data/air_titik.json.gz")
OSM_PUB = os.path.join(AKAR, "public/data/osm")
DEM_DIR = os.path.join(AKAR, "data/raw/dem")
DEM_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
UA = {"User-Agent": "poskokarhutla/1.0 (+github.com/pangantara/poskokarhutla)"}
Z = 12
CARI_KM = 5.0
SEL_JARANG = 0.005
SEL_INDEKS = 0.05
MAKS_UBIN = int(os.environ.get("AIR_DEM_UBIN", 300))
MAKS_DETIK = int(os.environ.get("AIR_DEM_DETIK", 240))
# jenis OSM -> kelas keluaran; parit/drain sengaja tidak ada
KELAS = {"reservoir": "tampungan", "pond": "tampungan", "lake": "tampungan", "basin": "tampungan", "oxbow": "tampungan", "embung": "tampungan",
         "water": "tampungan", "lake;pond": "tampungan", "river": "sungai", "canal": "kanal", "stream": "anak_sungai"}
DEM_KET = "Terrarium z12 (gabungan SRTM/Copernicus, ~38 m); galat vertikal puluhan meter di tutupan lebat, beda tinggi < ~10 m tidak bermakna"


# ---- geometri ----
def km(a1, o1, a2, o2):
    return math.hypot((a2 - a1) * 110.574, (o2 - o1) * 111.32 * math.cos(math.radians((a1 + a2) / 2)))


def ubin(lat, lon, z=Z):
    """-> (x, y, px, py) ubin Web Mercator dan piksel (0..255) di dalamnya."""
    n = 2 ** z
    fx = (lon + 180) / 360 * n
    fy = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    x, y = int(fx), int(fy)
    return x, y, min(255, int((fx - x) * 256)), min(255, int((fy - y) * 256))


# ---- PNG (RGB/RGBA 8 bit, tak berselang-seling) ----
def baca_png(raw):
    """-> (lebar, tinggi, kanal, bytearray piksel baris demi baris). Gagal = ValueError."""
    if raw[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("bukan PNG")
    i, idat, ihdr = 8, [], None
    while i < len(raw):
        n, tipe = struct.unpack(">I4s", raw[i:i + 8])
        isi = raw[i + 8:i + 8 + n]
        if tipe == b"IHDR":
            ihdr = struct.unpack(">IIBBBBB", isi)
        elif tipe == b"IDAT":
            idat.append(isi)
        i += 12 + n
    if not ihdr:
        raise ValueError("IHDR hilang")
    w, h, bit, warna, _, _, selang = ihdr
    if bit != 8 or warna not in (2, 6) or selang:
        raise ValueError("hanya RGB/RGBA 8 bit tak berselang-seling")
    kanal = 3 if warna == 2 else 4
    data = zlib.decompress(b"".join(idat))
    st = w * kanal
    out = bytearray(h * st)
    for y in range(h):
        f = data[y * (st + 1)]
        baris = data[y * (st + 1) + 1:(y + 1) * (st + 1)]
        o = y * st
        for x in range(st):
            a = out[o + x - kanal] if x >= kanal else 0
            b = out[o + x - st] if y else 0
            c = out[o + x - st - kanal] if y and x >= kanal else 0
            if f == 0:
                v = baris[x]
            elif f == 1:
                v = baris[x] + a
            elif f == 2:
                v = baris[x] + b
            elif f == 3:
                v = baris[x] + (a + b) // 2
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                v = baris[x] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)
            else:
                raise ValueError("filter PNG tak dikenal")
            out[o + x] = v & 255
    return w, h, kanal, out


def terrarium(png, px, py):
    """elevasi (m) di piksel (px, py) dari PNG Terrarium."""
    w, h, k, d = baca_png(png)
    o = (py * w + px) * k
    return d[o] * 256 + d[o + 1] + d[o + 2] / 256 - 32768


class Dem:
    """Ambil ubin sekali (cache disk data/raw/dem + memori), dekode sekali, banyak titik per ubin."""

    def __init__(self, unduh=None, maks=MAKS_UBIN, detik=MAKS_DETIK):
        self.unduh, self.maks, self.t0, self.detik = unduh or self._unduh, maks, time.time(), detik
        self.petak = {}      # (x, y) -> (w, k, bytearray) atau None
        self.diunduh = 0

    @staticmethod
    def _unduh(x, y):
        p = os.path.join(DEM_DIR, f"{Z}_{x}_{y}.png")
        if os.path.exists(p):
            return open(p, "rb").read()
        r = urllib.request.urlopen(urllib.request.Request(DEM_URL.format(z=Z, x=x, y=y), headers=UA), timeout=30).read()
        os.makedirs(DEM_DIR, exist_ok=True)
        open(p, "wb").write(r)
        return r

    def siapkan(self, kunci):
        """kunci: iterable (x, y) -> unduh paralel (maks ubin dan waktu), dekode."""
        perlu = [k for k in dict.fromkeys(kunci) if k not in self.petak][: max(0, self.maks - len(self.petak))]

        def ambil(k):
            if time.time() - self.t0 > self.detik:
                return k, None
            for coba in range(2):
                try:
                    return k, baca_png(self.unduh(*k))
                except Exception:      # jaringan/PNG rusak: ubin ini null, lainnya jalan terus
                    time.sleep(1)
            return k, None
        with ThreadPoolExecutor(8) as ex:
            for k, v in ex.map(ambil, perlu):
                self.petak[k] = v
                self.diunduh += v is not None

    def elev(self, lat, lon):
        x, y, px, py = ubin(lat, lon)
        v = self.petak.get((x, y))
        if not v:
            return None
        w, _, k, d = v
        o = (py * w + px) * k
        return round(d[o] * 256 + d[o + 1] + d[o + 2] / 256 - 32768, 1)


# ---- titik sumber air ----
def kelas_osm(jenis):
    return KELAS.get(jenis)


def bangun():
    """mentah OSM (prov-air-<kode>.json dari tarik_osm.py air, <kode>-titik-*.json, <kode>-sungai-*.json, prov-jalan-<kode>.json untuk waterway=river) -> data/air_titik.json.gz {"p": [[lat, lon, kelas]...]}"""
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from osm import sampel
    sel, seen = {}, set()

    def tambah(lat, lon, kl):
        sel.setdefault((kl, math.floor(lat / SEL_JARANG), math.floor(lon / SEL_JARANG)), (round(lat, 4), round(lon, 4)))
    n_berkas = 0
    for pola in ("prov-air-*.json", "*-titik-*.json", "*-sungai-*.json", "prov-jalan-*.json"):   # prov-jalan memuat waterway=river seluruh Indonesia
        for f in sorted(glob.glob(os.path.join(MENTAH, pola))):
            try:
                els = json.load(open(f))["elements"]
            except (OSError, ValueError, KeyError):
                continue
            n_berkas += 1
            for el in els:
                if (el["type"], el["id"]) in seen:
                    continue
                seen.add((el["type"], el["id"]))
                t = el.get("tags", {})
                if el.get("geometry") and t.get("waterway") in ("river", "canal", "stream"):
                    for la, lo in sampel(el["geometry"]):
                        tambah(la, lo, KELAS[t["waterway"]])
                    continue
                c = el.get("center") or ({"lat": el["lat"], "lon": el["lon"]} if "lat" in el else None)
                if not c:
                    continue
                jenis = "embung" if "embung" in t.get("name", "").lower() else t.get("water") or t.get("landuse") or ("water" if t.get("natural") == "water" else t.get("waterway"))
                kl = kelas_osm(jenis)
                if kl:
                    tambah(c["lat"], c["lon"], kl)
    p = [[v[0], v[1], kl] for (kl, _, _), v in sorted(sel.items())]
    with gzip.open(TITIK, "wt") as f:
        json.dump({"p": p, "berkas": n_berkas, "sumber": "OpenStreetMap (ODbL), (c) kontributor OpenStreetMap"}, f, separators=(",", ":"))
    kc = {}
    for x in p:
        kc[x[2]] = kc.get(x[2], 0) + 1
    print(f"air_titik: {len(p)} titik dari {n_berkas} berkas mentah {kc}, {os.path.getsize(TITIK) / 1e6:.1f} MB")


def muat():
    """-> [(lat, lon, kelas)] atau []. air_titik.json.gz, bila tak ada public/data/osm/<kode>.json."""
    try:
        with gzip.open(TITIK, "rt") as f:
            return [tuple(x) for x in json.load(f)["p"]]
    except (OSError, ValueError, KeyError):
        pass
    out = []
    for f in sorted(glob.glob(os.path.join(OSM_PUB, "[0-9][0-9].json"))):
        try:
            for la, lo, jenis, *_ in json.load(open(f)).get("air", []):
                kl = kelas_osm(jenis)
                if kl:
                    out.append((la, lo, kl))
        except (OSError, ValueError):
            continue
    return out


def indeks(titik):
    ind = {}
    for t in titik:
        ind.setdefault((math.floor(t[0] / SEL_INDEKS), math.floor(t[1] / SEL_INDEKS)), []).append(t)
    return ind


def terdekat(ind, lat, lon, maks_km=CARI_KM):
    """-> {kelas: (jarak_km, lat, lon)} sumber terdekat per kelas dalam maks_km."""
    r = math.ceil(maks_km / (SEL_INDEKS * 110)) + 1
    gy, gx = math.floor(lat / SEL_INDEKS), math.floor(lon / SEL_INDEKS)
    best = {}
    for y in range(gy - r, gy + r + 1):
        for x in range(gx - r, gx + r + 1):
            for la, lo, kl in ind.get((y, x), ()):
                d = km(lat, lon, la, lo)
                if d <= maks_km and d < best.get(kl, (1e18,))[0]:
                    best[kl] = (d, la, lo)
    return best


def tambah(hasil, titik=None, dem=None):
    """hasil: {id: entri akses.json (punya lat, lon)} diubah di tempat. -> (n_dengan_sumber, n_dengan_beda_tinggi)."""
    titik = muat() if titik is None else titik
    if not titik:
        print("air_dem: tidak ada titik sumber air (air_titik.json.gz dan public/data/osm kosong), dilewati")
        return 0, 0
    ind = indeks(titik)
    cari = {i: terdekat(ind, e["lat"], e["lon"]) for i, e in hasil.items()}
    dem = dem or Dem()
    perlu = []
    for i, e in hasil.items():     # hanya kompleks yang punya sumber: anggaran ubin tidak habis untuk yang tak butuh
        if cari[i]:
            perlu.append(ubin(e["lat"], e["lon"])[:2])
            perlu += [ubin(la, lo)[:2] for _, la, lo in cari[i].values()]
    dem.siapkan(perlu)
    n_s = n_b = 0
    for i, e in hasil.items():
        c = cari[i]
        if not c:
            continue
        e0 = dem.elev(e["lat"], e["lon"])
        sumber = []
        for kl, (d, la, lo) in sorted(c.items(), key=lambda kv: kv[1][0]):
            e1 = dem.elev(la, lo)
            sumber.append({"jenis": kl, "lat": round(la, 4), "lon": round(lo, 4), "km": round(d, 2), "elev_m": e1,
                           "beda_tinggi_m": None if e0 is None or e1 is None else round(e0 - e1, 1)})
        e["air"] = {"elev_m": e0, "sumber": sumber}
        n_s += 1
        n_b += any(s["beda_tinggi_m"] is not None for s in sumber)
    print(f"air_dem: {n_s}/{len(hasil)} cluster punya sumber air <= {CARI_KM:g} km, {n_b} dengan beda tinggi, {dem.diunduh} ubin DEM")
    return n_s, n_b


def uji():
    import random
    # ubin: Palangka Raya (-2.21, 113.92) z12
    x, y, px, py = ubin(-2.21, 113.92)
    assert x == 3344 and 2070 <= y <= 2080 and 0 <= px < 256 and 0 <= py < 256, (x, y)
    assert ubin(0, 0)[:2] == (2048, 2048) and ubin(0, -180)[:2] == (0, 2048)
    # PNG sintetis dengan kelima filter, 8 x 8 RGB; elevasi = nilai dikodekan terrarium
    def enc(w, h, px_rgb):
        k, baris, prev = 3, [], bytes(w * 3)
        for yy in range(h):
            cur = bytes(c for p in px_rgb[yy * w:(yy + 1) * w] for c in p)
            f = yy % 5
            if f == 0:
                r = cur
            elif f == 1:
                r = bytes((cur[i] - (cur[i - k] if i >= k else 0)) & 255 for i in range(len(cur)))
            elif f == 2:
                r = bytes((cur[i] - prev[i]) & 255 for i in range(len(cur)))
            elif f == 3:
                r = bytes((cur[i] - (((cur[i - k] if i >= k else 0) + prev[i]) // 2)) & 255 for i in range(len(cur)))
            else:
                def pa(i):
                    a, b, c = (cur[i - k] if i >= k else 0), prev[i], (prev[i - k] if i >= k else 0)
                    p = a + b - c
                    d = (abs(p - a), abs(p - b), abs(p - c))
                    return a if d[0] <= d[1] and d[0] <= d[2] else b if d[1] <= d[2] else c
                r = bytes((cur[i] - pa(i)) & 255 for i in range(len(cur)))
            baris.append(bytes([f]) + r)
            prev = cur
        def chunk(t, d):
            return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
        return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(b"".join(baris))) + chunk(b"IEND", b"")
    random.seed(1)
    m = [random.choice((3.0, 12.5, 45.25, 130.0, 250.75)) for _ in range(64)]
    kode = lambda v: (int((v + 32768) // 256), int((v + 32768) % 256), int(((v + 32768) % 1) * 256))
    png = enc(8, 8, [kode(v) for v in m])
    w, h, k, d = baca_png(png)
    assert (w, h, k) == (8, 8, 3)
    for yy in range(8):
        for xx in range(8):
            assert abs(terrarium(png, xx, yy) - m[yy * 8 + xx]) < 0.01, (xx, yy)
    for jelek in (b"x", png[:20]):
        try:
            baca_png(jelek)
            raise AssertionError("PNG rusak lolos")
        except (ValueError, zlib.error, struct.error):
            pass
    # terdekat: tiga kelas, pilih yang terdekat tiap kelas, di luar 5 km dibuang
    lat, lon = -2.0, 113.0
    dx = lambda k_: k_ / (111.32 * math.cos(math.radians(lat)))
    tt = [(lat, lon + dx(1.0), "sungai"), (lat, lon + dx(2.0), "sungai"), (lat + 3 / 110.574, lon, "tampungan"), (lat, lon + dx(9.0), "kanal")]
    c = terdekat(indeks(tt), lat, lon)
    assert set(c) == {"sungai", "tampungan"} and abs(c["sungai"][0] - 1.0) < 0.01 and abs(c["tampungan"][0] - 3.0) < 0.01, c
    # tambah: Dem palsu (unduh buatan): api di 100 m, sungai 1 km di 40 m -> beda +60; ubin gagal -> null
    # ubin 256 x 256 seragam 100 m (titik sungai 1 km jatuh di ubin yang sama, ubin z12 ~ 38 km): beda 0; ubin berbeda-tinggi dicakup uji elev di bawah
    hasil = {"K1": {"lat": lat, "lon": lon}, "K2": {"lat": lat + 1.0, "lon": lon}}
    dem = Dem(unduh=lambda x, y: enc(256, 256, [kode(100.0)] * 65536))
    n_s, n_b = tambah(hasil, tt, dem)
    a = hasil["K1"]["air"]
    assert (n_s, n_b) == (1, 1) and "air" not in hasil["K2"] and a["elev_m"] == 100.0, hasil
    assert [s["jenis"] for s in a["sumber"]] == ["sungai", "tampungan"] and a["sumber"][0]["beda_tinggi_m"] == 0.0 and a["sumber"][0]["km"] == 1.0, a
    # dua ubin berbeda tinggi: api di ubin 100 m, sumber di ubin tetangga 40 m -> beda +60
    ta = ubin(lat, lon)[:2]
    far = (lat, lon + dx(30.0))     # ~30 km: ubin z12 lain
    assert ubin(*far)[:2] != ta
    dm = Dem(unduh=lambda x, y: enc(256, 256, [kode(100.0 if (x, y) == ta else 40.0)] * 65536))
    dm.siapkan([ta, ubin(*far)[:2]])
    assert dm.elev(lat, lon) == 100.0 and dm.elev(*far) == 40.0 and round(dm.elev(lat, lon) - dm.elev(*far), 1) == 60.0
    # ubin tak bisa diunduh -> null, bukan 0
    gagal = {"K1": {"lat": lat, "lon": lon}}
    def rusak(x, y):
        raise OSError("putus")
    tambah(gagal, tt, Dem(unduh=rusak))
    assert gagal["K1"]["air"]["elev_m"] is None and all(s["beda_tinggi_m"] is None for s in gagal["K1"]["air"]["sumber"]), gagal
    # tanpa titik: tidak menulis air
    k0 = {"K1": {"lat": lat, "lon": lon}}
    assert tambah(k0, [], dem) == (0, 0) and "air" not in k0["K1"]
    print("air_dem uji: OK")


if __name__ == "__main__":
    {"bangun": bangun}.get(sys.argv[1] if len(sys.argv) > 1 else "", uji)()
