"""Citra satelit terbaru per kompleks api prioritas: potongan ± 12 x 12 km Sentinel-2 L2A (warna asli + SWIR)
dan cadangan harian VIIRS NOAA-20 dari NASA GIBS bila Sentinel berawan atau sudah lama.

Pakai:  python3 scripts/data/citra.py        jalan harian, tidak pernah gagal (selalu keluar 0)
        python3 scripts/data/citra.py uji    swa-uji tanpa jaringan

Sumber (semua terbuka, tanpa login, boleh dipakai ulang dengan atribusi):
- Sentinel-2 L2A COG di AWS Open Data, dicari lewat Earth Search STAC (element84). Lisensi data Copernicus:
  bebas dipakai, wajib "Contains modified Copernicus Sentinel data <tahun>".
- NASA GIBS WMS (VIIRS NOAA-20 Corrected Reflectance). Data NASA EOSDIS tanpa batasan, atribusi dianjurkan.
- Landsat C2 L2 di Earth Search tidak dipakai: asetnya di bucket usgs-landsat yang requester-pays (perlu akun AWS).

Cara kerja: COG dibaca dengan HTTP Range (header TIFF + ubin yang menyentuh kotak saja), DEFLATE dibuka zlib,
prediktor horizontal dibalik sendiri, PNG ditulis dengan zlib. Tanpa pustaka luar.
ID kompleks (K0001 ...) diurut ulang tiap hari, jadi nama berkas dan cache memakai sel lokasi 0,02 derajat, bukan ID.
Keluaran: public/data/citra/*.png|jpg, public/data/citra.json, cache awan public/data/citra/cache.json.
"""
import datetime as dt, json, math, os, struct, sys, time, urllib.request, zlib
from array import array
from concurrent.futures import ThreadPoolExecutor
from itertools import accumulate

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
DATA = os.path.join(AKAR, "public/data")
DIR = os.path.join(DATA, "citra")
STAC = "https://earth-search.aws.element84.com/v1/search"
GIBS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
UA = {"User-Agent": "poskokarhutla/1.0 (+github.com/pangantara/poskokarhutla)"}

MAKS_KOMPLEKS = 40     # kompleks prioritas teratas per skor
MAKS_DETIK = int(os.environ.get("CITRA_DETIK", 360))  # batas kerja per jalan; sisanya diteruskan besok (cache)
HARI = 10              # jendela cari adegan
KM = 12                # sisi kotak potongan Sentinel
PX = 400               # sisi PNG keluaran (30 m/piksel dari baca 20 m)
MAKS_BYTE = 150_000    # per gambar
GIBS_KM, GIBS_PX = 60, 300   # VIIRS 375 m: kotak lebih lebar supaya ada yang terlihat
SEL = 0.02             # sel cache lokasi, ± 2,2 km
AWAN_BAIK = 30         # % awan dalam kotak yang dianggap cukup bersih


# ---------------------------------------------------------------- geometri
def ke_utm(lat, lon, zona):
    """WGS84 -> UTM (E, N) zona tertentu; N selatan +10.000 km bila lat < 0. Deret Krüger, galat < 1 mm."""
    a, f, k0 = 6378137.0, 1 / 298.257223563, 0.9996
    n = f / (2 - f)
    A = a / (1 + n) * (1 + n * n / 4 + n ** 4 / 64)
    al = [n / 2 - 2 * n * n / 3 + 5 * n ** 3 / 16, 13 * n * n / 48 - 3 * n ** 3 / 5, 61 * n ** 3 / 240]
    p, l = math.radians(lat), math.radians(lon - (zona * 6 - 183))
    e2 = 2 * math.sqrt(n) / (1 + n)
    t = math.sinh(math.atanh(math.sin(p)) - e2 * math.atanh(e2 * math.sin(p)))
    xi, eta = math.atan2(t, math.cos(l)), math.atanh(math.sin(l) / math.sqrt(1 + t * t))
    E = 500000 + k0 * A * (eta + sum(al[j] * math.cos(2 * (j + 1) * xi) * math.sinh(2 * (j + 1) * eta) for j in range(3)))
    N = k0 * A * (xi + sum(al[j] * math.sin(2 * (j + 1) * xi) * math.cosh(2 * (j + 1) * eta) for j in range(3)))
    return E, N + (10_000_000 if lat < 0 else 0)


def kotak(lat, lon, km):
    """[barat, selatan, timur, utara] berderajat, sisi km x km berpusat di titik."""
    dy, dx = km / 2 / 110.574, km / 2 / (111.320 * math.cos(math.radians(lat)))
    return [round(lon - dx, 5), round(lat - dy, 5), round(lon + dx, 5), round(lat + dy, 5)]


def di_dalam(x, y, cincin):
    """titik di poligon (ray casting)"""
    ada = False
    for (x1, y1), (x2, y2) in zip(cincin, cincin[1:] + cincin[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            ada = not ada
    return ada


def menutup(geom, bb):
    """adegan menutup kotak = keempat sudut kotak di dalam jejak data adegan (Polygon/MultiPolygon)"""
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    return all(any(di_dalam(x, y, p[0]) for p in polys) for x in (bb[0], bb[2]) for y in (bb[1], bb[3]))


# ---------------------------------------------------------------- COG
def ambil(url, rentang=None, data=None, coba=3):
    for i in range(coba):
        try:
            h = dict(UA)
            if rentang:
                h["Range"] = f"bytes={rentang[0]}-{rentang[1] - 1}"
            if data is not None:
                h["Content-Type"] = "application/json"
            with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=h), timeout=60) as r:
                return r.read()
        except Exception:
            if i == coba - 1:
                raise
            time.sleep(2 * (i + 1))


TIPE = {3: ("H", 2), 4: ("I", 4), 16: ("Q", 8)}


def ifds(baca):
    """semua IFD TIFF/BigTIFF: daftar dict tag -> nilai (tuple bila jumlah > 1). baca(awal, akhir) -> bytes."""
    kepala = baca(0, 65536)
    bo = "<" if kepala[:2] == b"II" else ">"
    big = struct.unpack(bo + "H", kepala[2:4])[0] == 43
    def ambil_(a, b):
        return kepala[a:b] if b <= len(kepala) else baca(a, b)
    off = struct.unpack(bo + ("Q" if big else "I"), kepala[8:16] if big else kepala[4:8])[0]
    hasil = []
    while off:
        nb, eb, ob = (8, 20, 8) if big else (2, 12, 4)
        n = struct.unpack(bo + ("Q" if big else "H"), ambil_(off, off + nb))[0]
        blok = ambil_(off + nb, off + nb + n * eb + ob)
        tag = {}
        for i in range(n):
            e = blok[i * eb:(i + 1) * eb]
            t, ty = struct.unpack(bo + "HH", e[:4])
            c = struct.unpack(bo + ("Q" if big else "I"), e[4:4 + ob])[0]
            if ty not in TIPE and ty != 1:
                continue
            kode, uk = TIPE.get(ty, ("B", 1))
            isi = e[4 + ob:]
            raw = isi[:c * uk] if c * uk <= ob else ambil_(*(lambda o: (o, o + c * uk))(struct.unpack(bo + ("Q" if big else "I"), isi)[0]))
            v = struct.unpack(bo + kode * c, raw)
            tag[t] = v[0] if c == 1 else v
        hasil.append(tag)
        off = struct.unpack(bo + ("Q" if big else "I"), blok[n * eb:n * eb + ob])[0]
    return hasil, bo


def buka_ubin(raw, tag, bo):
    """bytes ubin terkompresi -> array nilai (piksel x sampel), prediktor 2 dibalik"""
    if tag.get(259, 1) == 8 or tag.get(259) == 32946:
        raw = zlib.decompress(raw)
    elif tag.get(259, 1) != 1:
        raise ValueError(f"kompresi {tag.get(259)} belum didukung")
    bps = tag[258][0] if isinstance(tag[258], tuple) else tag[258]
    a = array({8: "B", 16: "H"}[bps], raw)
    if bo == ">" and bps == 16:
        a.byteswap()
    if tag.get(317, 1) == 2:
        spp, w, m = tag.get(277, 1), tag[322], (1 << bps) - 1
        rl = w * spp
        for i in range(0, len(a), rl):
            for s in range(spp):
                a[i + s:i + rl:spp] = array(a.typecode, [v & m for v in accumulate(a[i + s:i + rl:spp])])
    return a


class COG:
    def __init__(self, url, baca=None):
        self.baca = baca or (lambda a, b: ambil(url, (a, b)))
        self.ifd, self.bo = ifds(self.baca)

    def contoh(self, lv, x0, y0, res0, kiri, atas, sisi_m, n):
        """grid n x n contoh (nearest) dari level lv untuk kotak (kiri, atas, sisi meter). -> list per sampel."""
        t = self.ifd[lv]
        W, H, T, spp = t[256], t[257], t[322], t.get(277, 1)
        r = res0 * self.ifd[0][256] / W
        langkah = sisi_m / n
        kol = [int((kiri + (j + .5) * langkah - x0) / r) for j in range(n)]
        bar = [int((y0 - (atas - (i + .5) * langkah)) / r) for i in range(n)]
        tx = math.ceil(W / T)
        off, cnt = t[324], t[325]
        off, cnt = (off,) if isinstance(off, int) else off, (cnt,) if isinstance(cnt, int) else cnt
        perlu = {(y // T, x // T) for y in bar for x in kol if 0 <= y < H and 0 <= x < W}
        def satu(yx):
            k = yx[0] * tx + yx[1]
            return yx, (buka_ubin(self.baca(off[k], off[k] + cnt[k]), t, self.bo) if cnt[k] else None)
        with ThreadPoolExecutor(8) as ex:   # ubin diambil serentak: waktu didominasi jaringan, bukan CPU
            ubin = dict(ex.map(satu, perlu))
        bps = t[258][0] if isinstance(t[258], tuple) else t[258]
        keluar = [array("H" if bps == 16 else "B") for _ in range(spp)]
        for y in bar:
            for x in kol:
                u = ubin.get((y // T, x // T)) if 0 <= y < H and 0 <= x < W else None
                i = ((y % T) * T + x % T) * spp
                for s in range(spp):
                    keluar[s].append(u[i + s] if u else 0)
        return keluar


def level_untuk(c, res0, res):
    """level overview dengan resolusi paling kasar yang masih <= res"""
    lv = 0
    for i, t in enumerate(c.ifd):
        if res0 * c.ifd[0][256] / t[256] <= res * 1.01:
            lv = i
    return lv


# ---------------------------------------------------------------- PNG
def png(rgb, n, maks=MAKS_BYTE):
    """rgb = 3 array 0..255 sepanjang n*n -> bytes PNG <= maks (bit rendah dibuang bila perlu); filter Sub"""
    for topeng in (0xFF, 0xFE, 0xFC, 0xF8, 0xF0):
        baris = []
        for i in range(n):
            px = bytearray(n * 3)
            for s in range(3):
                px[s::3] = bytes(v & topeng for v in rgb[s][i * n:(i + 1) * n])
            sub = bytearray(px)
            sub[3:] = bytes((px[j] - px[j - 3]) & 255 for j in range(3, len(px)))
            baris.append(b"\x01" + bytes(sub))
        z = zlib.compress(b"".join(baris), 9)
        def blok(k, d):
            return struct.pack(">I", len(d)) + k + d + struct.pack(">I", zlib.crc32(k + d))
        b = b"\x89PNG\r\n\x1a\n" + blok(b"IHDR", struct.pack(">IIBBBBB", n, n, 8, 2, 0, 0, 0)) + blok(b"IDAT", z) + blok(b"IEND", b"")
        if len(b) <= maks:
            return b
    return b


# ---------------------------------------------------------------- Sentinel-2
def cari(bb, hari_ini):
    q = {"collections": ["sentinel-2-l2a"], "bbox": bb, "limit": 30,
         "datetime": f"{(hari_ini - dt.timedelta(days=HARI)).isoformat()}T00:00:00Z/{hari_ini.isoformat()}T23:59:59Z",
         "sortby": [{"field": "properties.datetime", "direction": "desc"}]}
    return json.loads(ambil(STAC, data=json.dumps(q).encode()))["features"]


def jendela(item, aset, lat, lon):
    """(x0, y0, res0, kiri, atas) kotak KM berpusat di titik, dalam UTM aset itu"""
    epsg = item["properties"].get("proj:epsg") or int(str(item["properties"].get("proj:code", "0")).split(":")[-1])
    E, N = ke_utm(lat, lon, epsg % 100)
    tr = item["assets"][aset]["proj:transform"]
    return tr[2], tr[5], tr[0], E - KM * 500, N + KM * 500


def awan(item, lat, lon):
    """(% awan+bayangan+sirus di kotak, % tanpa data) dari SCL, grid 100 x 100"""
    a = item["assets"]["scl"]
    c = COG(a["href"])
    x0, y0, r0, kiri, atas = jendela(item, "scl", lat, lon)
    v = c.contoh(0, x0, y0, r0, kiri, atas, KM * 1000, 100)[0]
    kosong = sum(1 for x in v if x == 0)
    sah = len(v) - kosong
    return (round(100 * sum(1 for x in v if x in (3, 8, 9, 10)) / sah) if sah else 100), round(100 * kosong / len(v))


def gambar_s2(item, lat, lon, berkas):
    """tulis <berkas>_tc.png (TCI) dan <berkas>_swir.png (B12/B8A/B04, x2,5 seperti EO Browser)"""
    A = item["assets"]
    c = COG(A["visual"]["href"])
    x0, y0, r0, kiri, atas = jendela(item, "visual", lat, lon)
    tc = c.contoh(level_untuk(c, r0, 20), x0, y0, r0, kiri, atas, KM * 1000, PX)
    tc = [array("B", (min(255, int(v * 1.15)) for v in b)) for b in tc]  # TCI agak gelap; naikkan sedikit
    open(berkas + "_tc.png", "wb").write(png(tc, PX))
    def kanal(k):
        c = COG(A[k]["href"])
        x0, y0, r0, kiri, atas = jendela(item, k, lat, lon)
        rb = (A[k].get("raster:bands") or [{}])[0]
        sk, of = rb.get("scale", 1e-4), rb.get("offset", 0)
        v = c.contoh(level_untuk(c, r0, 20), x0, y0, r0, kiri, atas, KM * 1000, PX)[0]
        return array("B", (0 if d == 0 else max(0, min(255, int((d * sk + of) * 2.5 * 255))) for d in v))
    with ThreadPoolExecutor(3) as ex:
        sw = list(ex.map(kanal, ("swir22", "nir08", "red")))
    open(berkas + "_swir.png", "wb").write(png(sw, PX))


# ---------------------------------------------------------------- GIBS (VIIRS 375 m, harian)
GIBS_LAPIS = {"tc": "VIIRS_NOAA20_CorrectedReflectance_TrueColor", "swir": "VIIRS_NOAA20_CorrectedReflectance_BandsM11-I2-I1"}


def gibs(lat, lon, hari_ini, nama):
    """JPEG VIIRS hari ini (atau kemarin bila belum masuk). -> (tgl, bbox) atau None"""
    bb = kotak(lat, lon, GIBS_KM)
    for d in (hari_ini, hari_ini - dt.timedelta(days=1)):
        isi = {}
        for k, L in GIBS_LAPIS.items():
            u = (f"{GIBS}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS={L}&CRS=EPSG:4326&BBOX={bb[1]},{bb[0]},{bb[3]},{bb[2]}"
                 f"&WIDTH={GIBS_PX}&HEIGHT={GIBS_PX}&FORMAT=image/jpeg&TIME={d.isoformat()}")
            isi[k] = ambil(u)
        if all(b[:2] == b"\xff\xd8" and len(b) > 1500 for b in isi.values()):  # < 1,5 KB = petak hitam, belum ada lintasan
            for k, b in isi.items():
                open(os.path.join(DIR, f"{nama}_{d:%Y%m%d}_viirs_{k}.jpg"), "wb").write(b)
            return d, bb
    return None


# ---------------------------------------------------------------- alur per kompleks
def sel(lat, lon):
    return round(round(lat / SEL) * SEL, 2), round(round(lon / SEL) * SEL, 2)


def proses(p, hari_ini, cache, batas):
    if time.time() > batas:
        return None
    lat, lon = sel(p["lat"], p["lon"])
    nama = f"{lat:.2f}_{lon:.2f}"
    bb = kotak(lat, lon, KM)
    hasil = []
    kand = []
    for it in cari(kotak(lat, lon, 2), hari_ini):
        if not menutup(it["geometry"], kotak(lat, lon, KM * 1.03)):
            continue
        tgl = it["properties"]["datetime"][:10]
        if any(k[1] == tgl for k in kand):   # tile lain dari lintasan yang sama
            continue
        kunci = f"{it['id']}|{nama}"
        if kunci not in cache:
            if time.time() > batas:
                break
            try:
                cache[kunci] = awan(it, lat, lon)
            except Exception as e:
                print("  scl gagal", it["id"], e, file=sys.stderr)
                continue
        aw, ksg = cache[kunci]
        if ksg <= 2:
            kand.append((it, tgl, aw))
    # pilih: terbaru, terbaru yang cukup bersih, lalu terbaru berikutnya (maks 3)
    pilih = kand[:1] + [k for k in kand if k[2] <= AWAN_BAIK][:1]
    for k in kand:
        if len({x[0]["id"] for x in pilih}) >= 3:
            break
        pilih.append(k)
    pilih = sorted({x[0]["id"]: x for x in pilih}.values(), key=lambda x: x[1], reverse=True)[:3]
    for it, tgl, aw in pilih:
        sat = "Sentinel-" + it["properties"].get("platform", "sentinel-" + it["id"][1:3]).split("-")[-1].upper()
        f = f"{nama}_{tgl.replace('-', '')}_{it['id'][:3]}"
        jalur = os.path.join(DIR, f)
        if not (os.path.exists(jalur + "_tc.png") and os.path.exists(jalur + "_swir.png")):
            if time.time() > batas:
                continue
            try:
                gambar_s2(it, lat, lon, jalur)
            except Exception as e:
                print("  citra gagal", it["id"], e, file=sys.stderr)
                continue
        hasil.append({"tgl": tgl, "jam": it["properties"]["datetime"][11:16], "satelit": sat, "awan_pct": aw,
                      "tc": f"citra/{f}_tc.png", "swir": f"citra/{f}_swir.png", "bbox": bb, "km": KM, "adegan": it["id"]})
    # VIIRS harian: bila tidak ada Sentinel bersih <= 2 hari terakhir
    baru = [h for h in hasil if h["awan_pct"] <= 50 and (hari_ini - dt.date.fromisoformat(h["tgl"])).days <= 2]
    if not baru and time.time() < batas:
        try:
            g = gibs(lat, lon, hari_ini, nama)
            if g:
                f = f"{nama}_{g[0]:%Y%m%d}_viirs"
                hasil.append({"tgl": g[0].isoformat(), "jam": "± 13:30 lokal", "satelit": "VIIRS NOAA-20", "awan_pct": None,
                              "tc": f"citra/{f}_tc.jpg", "swir": f"citra/{f}_swir.jpg", "bbox": g[1], "km": GIBS_KM})
        except Exception as e:
            print("  gibs gagal", nama, e, file=sys.stderr)
    return sorted(hasil, key=lambda h: (h["tgl"], h["satelit"] != "VIIRS NOAA-20"), reverse=True)


def main():
    t0 = time.time()
    batas = t0 + MAKS_DETIK
    os.makedirs(DIR, exist_ok=True)
    jcache = os.path.join(DIR, "cache.json")
    try:
        cache = json.load(open(jcache))
    except Exception:
        cache = {}
    hari_ini = dt.datetime.now(dt.timezone.utc).date()
    ks = [f["properties"] for f in json.load(open(os.path.join(DATA, "kluster.json")))["features"] if f["properties"].get("level") == 3]
    ks = sorted(ks, key=lambda p: -(p.get("skor") or 0))[:MAKS_KOMPLEKS]
    with ThreadPoolExecutor(8) as ex:
        hasil = list(ex.map(lambda p: (p["id"], (lambda: proses(p, hari_ini, cache, batas))()), ks))
    # hasil None (waktu habis) -> pakai entri kemarin untuk sel yang sama bila ada
    lama = {}
    try:
        for xs in json.load(open(os.path.join(DATA, "citra.json")))["kompleks"].values():
            if xs:
                lama["_".join(xs[0]["tc"].split("/")[1].split("_")[:2])] = xs
    except Exception:
        pass
    kompleks = {}
    for (kid, xs), p in zip(hasil, ks):
        if xs is None:
            xs = lama.get("%.2f_%.2f" % sel(p["lat"], p["lon"]))
        if xs:
            kompleks[kid] = xs
    th = hari_ini.year
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "hari": HARI, "kotak_km": KM,
           "kompleks": kompleks,
           "atribusi": {"Sentinel": f"Contains modified Copernicus Sentinel data {th} · Sentinel-2 L2A via Earth Search (Element 84) / AWS Open Data",
                        "VIIRS": "NASA EOSDIS GIBS / Worldview · VIIRS NOAA-20 Corrected Reflectance"},
           "lisensi": "Copernicus Sentinel data: bebas dipakai ulang dengan atribusi (Legal Notice Copernicus). NASA GIBS: tanpa batasan, atribusi dianjurkan."}
    json.dump(out, open(os.path.join(DATA, "citra.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    # buang cache > 15 hari dan gambar yang tidak dirujuk lagi
    tua = (hari_ini - dt.timedelta(days=15)).strftime("%Y%m%d")
    cache = {k: v for k, v in cache.items() if k.split("_")[2][:8] >= tua}
    json.dump(cache, open(jcache, "w"), separators=(",", ":"))
    dipakai = {os.path.basename(h[k]) for xs in kompleks.values() for h in xs for k in ("tc", "swir")}
    for f in os.listdir(DIR):
        if f.endswith((".png", ".jpg")) and f not in dipakai:
            os.remove(os.path.join(DIR, f))
    n = sum(1 for xs in kompleks.values() if xs)
    aw = sorted(h["awan_pct"] for xs in kompleks.values() for h in xs if h["awan_pct"] is not None)
    uk = sum(os.path.getsize(os.path.join(DIR, f)) for f in os.listdir(DIR))
    print(f"citra: {n}/{len(ks)} kompleks bergambar · {sum(len(x) for x in kompleks.values())} entri · "
          f"awan median {aw[len(aw) // 2] if aw else '–'}% · {uk / 1e6:.1f} MB · {time.time() - t0:.0f} dtk")


# ---------------------------------------------------------------- swa-uji
def uji():
    # UTM: meridian tengah lintang 0 -> E 500 km, N 10.000 km (selatan); 1 derajat ke selatan = busur meridian x k0
    E, N = ke_utm(-1e-9, 111, 49)
    assert abs(E - 500000) < .01 and abs(N - 10_000_000) < .01, (E, N)
    E, N = ke_utm(-1, 111, 49)
    assert abs(N - (10_000_000 - 110574.4 * .9996)) < 2, f"N {N:.1f}: busur meridian 1 derajat salah"
    a, _ = ke_utm(-3, 112.5, 49); b, _ = ke_utm(-3, 109.5, 49)
    assert abs((a - 500000) + (b - 500000)) < .01, "UTM tidak simetris terhadap meridian tengah"
    # kotak: sisinya KM km dan memuat pusat
    for lat in (-8, -1, 5):  # tidak melintasi khatulistiwa: N lompat 10.000 km di sana
        bb = kotak(lat, 110, 12)
        w = ke_utm(lat, bb[2], 49)[0] - ke_utm(lat, bb[0], 49)[0]
        h = ke_utm(bb[3], 110, 49)[1] - ke_utm(bb[1], 110, 49)[1]
        assert abs(w - 12000) < 250 and abs(h - 12000) < 50, f"kotak {lat}: {w:.0f} x {h:.0f} m, mestinya 12000"
        assert bb[0] < 110 < bb[2] and bb[1] < lat < bb[3]
    # adegan yang tidak menutup kotak ditolak
    g = {"type": "Polygon", "coordinates": [[[111, -4], [113, -4], [113, -2], [111, -2], [111, -4]]]}
    assert menutup(g, kotak(-3, 112, 12))
    assert not menutup(g, kotak(-2.02, 112, 12)), "kotak melewati tepi utara adegan mestinya ditolak"
    assert not menutup({"type": "MultiPolygon", "coordinates": [[[[0, 0], [1, 0], [1, 1], [0, 0]]]]}, kotak(-3, 112, 12))
    # TIFF ubin: 2 ubin 4x4 uint16 DEFLATE + prediktor 2, dibaca lewat fungsi baca() palsu
    T = 4
    nilai = [[(r * 8 + c) * 300 for c in range(8)] for r in range(T)]
    ubin = []
    for tx in range(2):
        raw = array("H")
        for r in range(T):
            row = [nilai[r][tx * T + c] for c in range(T)]
            raw.extend([row[0]] + [(row[c] - row[c - 1]) & 0xFFFF for c in range(1, T)])
        ubin.append(zlib.compress(raw.tobytes()))
    tags = [(256, 3, 8), (257, 3, 4), (258, 3, 16), (259, 3, 8), (277, 3, 1), (317, 3, 2), (322, 3, T), (323, 3, T)]
    n = len(tags) + 2
    ifd_off = 8
    data_off = ifd_off + 2 + 12 * n + 4
    offs = [data_off, data_off + len(ubin[0])]
    arr_off = offs[1] + len(ubin[1])
    tags += [(324, 4, None), (325, 4, None)]
    b = bytearray(b"II*\x00" + struct.pack("<I", ifd_off) + struct.pack("<H", n))
    for t, ty, v in tags:
        if t == 324:
            b += struct.pack("<HHII", t, ty, 2, arr_off)
        elif t == 325:
            b += struct.pack("<HHII", t, ty, 2, arr_off + 8)
        else:
            b += struct.pack("<HHIHH", t, ty, 1, v, 0)
    b += struct.pack("<I", 0) + ubin[0] + ubin[1] + struct.pack("<II", *offs) + struct.pack("<II", len(ubin[0]), len(ubin[1]))
    berkas = bytes(b)
    c = COG(None, baca=lambda a, z: berkas[a:z])
    assert c.ifd[0][256] == 8 and c.ifd[0][324] == tuple(offs), c.ifd
    # grid 8x4 piksel resolusi 10 m di (0, 40): contoh 8 kolom x 8 baris pada kotak 80 m dari atas -> baris 0..3 lalu di luar (0)
    v = c.contoh(0, 0, 40, 10, 0, 40, 80, 8)[0]
    assert list(v[:8]) == nilai[0], f"baris 0 {list(v[:8])} != {nilai[0]} (prediktor/ubin salah)"
    assert list(v[3 * 8:4 * 8]) == nilai[3], "baris 3 salah"
    assert list(v[4 * 8:]) == [0] * 32, "di luar raster mestinya 0"
    # PNG: tanda tangan, ukuran, CRC; dan dipaksa di bawah batas
    import random
    random.seed(1)
    rgb = [array("B", (random.randrange(256) for _ in range(64 * 64))) for _ in range(3)]
    p = png(rgb, 64, maks=10 ** 9)
    assert p[:8] == b"\x89PNG\r\n\x1a\n" and struct.unpack(">II", p[16:24]) == (64, 64)
    assert len(png(rgb, 64, maks=11_000)) < len(p), "PNG tidak mengecil saat melewati batas"
    print("citra.py uji: lolos")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        try:
            main()
        except Exception as e:  # jalan harian tidak boleh gagal; data kemarin tetap terpakai
            print("citra: gagal", repr(e), file=sys.stderr)
