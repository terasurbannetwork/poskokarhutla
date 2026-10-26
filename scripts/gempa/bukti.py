"""Bukti paparan fasilitas publik terhadap sesar dan genangan pesisir -> public/gempa/data/bukti.json (skema: kontrak gempa).

Fasilitas: sekolah Dapodik/EMIS (public/data/sekolah.json) dan RS/puskesmas (public/data/fasilitas.json, t == "rs"), keduanya
hanya provinsi pantauan karhutla. Provinsi lain: OpenStreetMap lewat Overpass (ODbL), petak 2 derajat (dipecah bila gagal), cache
data/raw/gempa/osm: amenity school/college/university -> sekolah (hanya di luar provinsi Dapodik), hospital/clinic -> rs (hanya di
luar provinsi fasilitas.json), townhall/police/fire_station -> publik (semua provinsi). UA proyek, bukan UA peramban (406).
Koordinat yang jatuh di luar provinsi tercatatnya (poligon kecamatan, atau > 10 km dari pusat kecamatan provinsi itu) dibuang.
Plafon 1,5 MB: semua RS dan publik disimpan; sekolah diurut syarat terberat (bobot()) lalu dipotong. `ringkas` = sebelum pangkas.

Syarat (alasan):
  atas_sesar      <= 1 km dari jejak sesar aktif (public/gempa/data/sesar.geojson, GEM GAF-DB/EOS), tanpa jenis "subduksi"
  mmi_tinggi      MMI >= VII pada skenario karakteristik sesar TERDEKAT (<= 60 km): M = 5,08 + 1,16 log10(panjang jejak km)
                  (Wells & Coppersmith 1994, semua jenis, panjang rupture permukaan), dipotong 7,8; kedalaman 10 km, jenis dari
                  guncangan.tebak_jenis (kerak, BSSA14), Rjb = jarak ke jejak; MMI Worden 2012 lewat guncangan.py (tidak diubah).
  genangan        elevasi <= 10 m DAN <= 2 km dari garis pantai (piksel DEM elevasi <= 0)
  tanpa_evakuasi  genangan DAN piksel elevasi >= 20 m terdekat > 2 km
  genangan_bnpb   di dalam genangan tsunami skenario BNPB Mw 9,0 (InaRISK raster:Inun_9_0_Mw, WMS GetFeatureInfo); cakupan hanya Kota Ambon
Elevasi: AWS Terrain Tiles (Mapzen terrarium PNG, z10, ~150 m per piksel), didekode stdlib (zlib + filter PNG), cache di
data/raw/gempa/terrarium (tak dilacak git). Hanya untuk fasilitas <= 3 km dari batas poligon provinsi (calon pesisir).
Sumber DEM terrarium: SRTM, GMTED, ETOPO1, dll.; atribusi https://github.com/tilezen/joerd/blob/master/docs/attribution.md

Pakai:  python3 scripts/gempa/bukti.py | uji
"""
import concurrent.futures as cf, datetime as dt, json, math, os, struct, sys, time, urllib.parse, urllib.request, zlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from umum import AKAR, KELUAR, UA, simpan, terdekat  # noqa: E402
import guncangan as GC  # noqa: E402

KELUAR_B = os.path.join(KELUAR, "bukti.json")
DEM_DIR = os.path.join(AKAR, "data/raw/gempa/terrarium")
DEM_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"
Z = 10
PLAFON = 1_500_000
R_SESAR, R_ATAS, M_MAKS = 60.0, 1.0, 7.8
R_PANTAI, ELEV_RENDAH, ELEV_AMAN, R_AMAN = 2.0, 10.0, 20.0, 2.0
R_CALON = 3.0  # km dari batas poligon provinsi
R_CARI_TINGGI = 5.0
SEL = 0.6  # derajat; 3x3 sel menjamin >= 66 km
KOLOM = ["t", "nama", "prov", "kab", "lat", "lon", "sesar_km", "sesar", "mmi_skenario", "elev_m", "pantai_km", "tinggi_km", "alasan"]
SYARAT = ("atas_sesar", "mmi_tinggi", "genangan", "tanpa_evakuasi", "genangan_bnpb")
# Genangan tsunami skenario BNPB (GeoServer InaRISK raster:Inun_*_Mw, nilai = kedalaman genangan, -999 = di luar).
# Cakupan dicek 18 Okt 2026: KETUJUH skenario (Mw 7,8-9,0) hanya meliputi Kota Ambon (bbox di bawah); di luar itu tidak ada.
BNPB_WMS = "https://inarisk1.bnpb.go.id/geoserver/raster/wms"
BNPB_LAPIS, BNPB_MW = "raster:Inun_9_0_Mw", "9,0"
BNPB_BBOX = (-3.79475717009015, -3.5681816960335646, 128.038712006275, 128.30175601458808)  # lat min, lat maks, lon min, lon maks
BNPB_CACHE = os.path.join(AKAR, "data/raw/gempa/bnpb_inun_9_0.json")


# ---------- geometri ----------

def jarak_seg(lat, lon, a, b):
    return GC._jarak_segmen_km(lat, lon, a, b)


class IndeksGaris:
    """Hash sel `sel` derajat -> segmen [(a, b, id)]; terdekat() memeriksa 3x3 sel (radius terjamin >= sel * 110 km * cos lat)."""

    def __init__(self, garis, sel=SEL):
        self.s, self.sel = sel, {}
        for gid, koor in garis:
            for a, b in zip(koor, koor[1:]):
                for gx in range(math.floor(min(a[0], b[0]) / sel), math.floor(max(a[0], b[0]) / sel) + 1):
                    for gy in range(math.floor(min(a[1], b[1]) / sel), math.floor(max(a[1], b[1]) / sel) + 1):
                        self.sel.setdefault((gx, gy), []).append((a, b, gid))

    def terdekat(self, lat, lon):
        gx, gy, best = math.floor(lon / self.s), math.floor(lat / self.s), (None, None)
        for x in (gx - 1, gx, gx + 1):
            for y in (gy - 1, gy, gy + 1):
                for a, b, gid in self.sel.get((x, y), ()):
                    d = jarak_seg(lat, lon, a, b)
                    if best[0] is None or d < best[0]:
                        best = (d, gid)
        return best


def m_karakteristik(panjang_km):
    return min(M_MAKS, 5.08 + 1.16 * math.log10(panjang_km))


def mmi_skenario(m, rjb):
    """MMI rata-rata di Rjb (km) dari jejak, kedalaman 10 km: repi = Rjb + L/4 supaya guncangan.rjb_km mengembalikan Rjb."""
    w = GC.PARAM["wells_coppersmith94"]
    return GC.mmi_perkiraan(m, rjb + 10 ** (w["a"] + w["b"] * m) / 4, 10.0, GC.tebak_jenis(10.0, m))


def muat_sesar():
    fc = json.load(open(os.path.join(KELUAR, "sesar.geojson")))
    out = []
    for i, f in enumerate(fc["features"]):
        if f["properties"]["jenis"] == "subduksi":
            continue  # megathrust: bukan sesar kerak 10 km
        c = f["geometry"]["coordinates"]
        L = sum(GC.jarak_km(a[1], a[0], b[1], b[0]) for a, b in zip(c, c[1:]))
        out.append({"id": i, "nama": f["properties"]["nama"] or ("sesar " + f["properties"]["jenis"]), "koor": c, "L": L, "m": m_karakteristik(L)})
    return out


# ---------- DEM terrarium ----------

def dekode_png(isi):
    """PNG 8-bit RGB/RGBA tanpa interlace -> (lebar, tinggi, kanal, baris bytes). Tolak format lain."""
    if isi[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("bukan PNG")
    pos, idat, ihdr = 8, [], None
    while pos < len(isi):
        n, jenis = struct.unpack(">I4s", isi[pos:pos + 8])
        data = isi[pos + 8:pos + 8 + n]
        if jenis == b"IHDR":
            ihdr = struct.unpack(">IIBBBBB", data)
        elif jenis == b"IDAT":
            idat.append(data)
        elif jenis == b"IEND":
            break
        pos += 12 + n
    w, h, bit, warna, _, _, interlace = ihdr
    if bit != 8 or warna not in (2, 6) or interlace:
        raise ValueError(f"PNG tak didukung: bit {bit}, warna {warna}, interlace {interlace}")
    kanal = 3 if warna == 2 else 4
    raw, st = zlib.decompress(b"".join(idat)), w * kanal
    baris, prev = [], bytearray(st)
    for y in range(h):
        f, cur = raw[y * (st + 1)], bytearray(raw[y * (st + 1) + 1:(y + 1) * (st + 1)])
        for i in range(st):
            a = cur[i - kanal] if i >= kanal else 0
            b = prev[i]
            c = prev[i - kanal] if i >= kanal else 0
            if f == 1:
                cur[i] = (cur[i] + a) & 255
            elif f == 2:
                cur[i] = (cur[i] + b) & 255
            elif f == 3:
                cur[i] = (cur[i] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                cur[i] = (cur[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
            elif f != 0:
                raise ValueError(f"filter PNG {f} tak dikenal")
        baris.append(cur)
        prev = cur
    return w, h, kanal, baris


def ubin_elev(isi):
    """terrarium: elev = R*256 + G + B/256 - 32768 -> list 256 baris x 256 float."""
    w, h, k, baris = dekode_png(isi)
    return [[r[i * k] * 256 + r[i * k + 1] + r[i * k + 2] / 256 - 32768 for i in range(w)] for r in baris]


def piksel(lat, lon, z=Z):
    n = 2 ** z * 256
    x = (lon + 180) / 360 * n
    y = (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * n
    return x, y


def _unduh(xy):
    x, y = xy
    j = os.path.join(DEM_DIR, str(Z), str(x), f"{y}.png")
    if not os.path.exists(j):
        req = urllib.request.Request(DEM_URL.format(z=Z, x=x, y=y), headers={"User-Agent": UA})
        for i in range(4):
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    isi = r.read()
                break
            except Exception:
                if i == 3:
                    raise
        os.makedirs(os.path.dirname(j), exist_ok=True)
        with open(j + ".tmp", "wb") as f:
            f.write(isi)
        os.replace(j + ".tmp", j)
    return xy


class DEM:
    def __init__(self):
        self.ubin = {}

    def siapkan(self, kunci):
        kunci = sorted(set(kunci) - set(self.ubin))
        with cf.ThreadPoolExecutor(8) as ex:
            for i, _ in enumerate(ex.map(_unduh, kunci)):
                if i % 100 == 0:
                    print(f"  ubin DEM {i}/{len(kunci)}", file=sys.stderr)

    def elev(self, X, Y):
        tx, ty = int(X) // 256, int(Y) // 256
        u = self.ubin.get((tx, ty))
        if u is None:
            _unduh((tx, ty))
            u = self.ubin[(tx, ty)] = ubin_elev(open(os.path.join(DEM_DIR, str(Z), str(tx), f"{ty}.png"), "rb").read())
        return u[int(Y) % 256][int(X) % 256]

    def cari(self, lat, lon, syarat, radius_km):
        """Jarak km ke piksel terdekat yang memenuhi syarat(elev) dalam radius_km, selain itu None (cincin naik)."""
        X, Y = piksel(lat, lon)
        m_px = 156543.03392 * math.cos(math.radians(lat)) / 2 ** Z / 1000  # km per piksel
        r = int(radius_km / m_px) + 1
        for dx, dy in _offset(r):
            d = math.hypot(dx, dy) * m_px
            if d > radius_km:
                return None
            if syarat(self.elev(X + dx, Y + dy)):
                return d
        return None


_OFF = {}


def _offset(r):
    if r not in _OFF:
        _OFF[r] = sorted(((dx, dy) for dx in range(-r, r + 1) for dy in range(-r, r + 1)), key=lambda o: o[0] * o[0] + o[1] * o[1])
    return _OFF[r]


# ---------- fasilitas ----------

def muat_fasilitas():
    s = json.load(open(os.path.join(AKAR, "public/data/sekolah.json")))
    k = {c: i for i, c in enumerate(s["kolom"])}
    out = [{"t": "sekolah", "nama": r[k["nama"]], "prov": r[k["prov"]], "kab": r[k["kab"]], "lat": r[k["lat"]], "lon": r[k["lon"]]}
           for r in s["baris"] if isinstance(r[k["lat"]], (int, float)) and isinstance(r[k["lon"]], (int, float))]
    out += [{"t": "rs", "nama": f["nama"], "prov": f["prov"], "kab": None, "lat": f["lat"], "lon": f["lon"]}
            for f in json.load(open(os.path.join(AKAR, "public/data/fasilitas.json"))) if f["t"] == "rs"]
    return out


def sah_lokasi(f, w):
    """(sah, kab) : titik di poligon provinsinya, atau <= 10 km dari pusat kecamatan provinsi itu (pesisir terpotong poligon)."""
    adm = w.cari(f["lon"], f["lat"])
    if adm:
        return adm[0] == f["prov"], adm[1]
    t = terdekat(f["lat"], f["lon"], 10)
    return bool(t and t[0] == f["prov"]), None


def garis_provinsi():
    fc = json.load(open(os.path.join(AKAR, "public/geo/provinsi.json")))
    out = []
    for f in fc["features"]:
        g = f["geometry"]
        for poli in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]):
            for cincin in poli:
                out.append((None, cincin))
    return out


def nilai_fasilitas(f, sesar, idx_sesar, idx_batas, dem):
    """-> baris (dict) dengan alasan; alasan kosong = tidak lolos."""
    alasan = []
    d, gid = idx_sesar.terdekat(f["lat"], f["lon"])
    s_km = s_nama = mmi = None
    if d is not None and d <= R_SESAR:
        sf = sesar[gid]
        s_km, s_nama, mmi = round(d, 2), sf["nama"], round(mmi_skenario(sf["m"], d), 1)
        if d <= R_ATAS:
            alasan.append("atas_sesar")
        if mmi >= 7.0:
            alasan.append("mmi_tinggi")
    elev = pantai = tinggi = None
    db, _ = idx_batas.terdekat(f["lat"], f["lon"])
    if dem is not None and db is not None and db <= R_CALON:
        X, Y = piksel(f["lat"], f["lon"])
        elev = round(dem.elev(X, Y), 1)
        p = dem.cari(f["lat"], f["lon"], lambda e: e <= 0, R_PANTAI + 0.5)
        pantai = None if p is None else round(p, 2)
        if elev <= ELEV_RENDAH and pantai is not None and pantai <= R_PANTAI:
            alasan.append("genangan")
            t = dem.cari(f["lat"], f["lon"], lambda e: e >= ELEV_AMAN, R_CARI_TINGGI)
            tinggi = None if t is None else round(t, 2)
            if tinggi is None or tinggi > R_AMAN:
                alasan.append("tanpa_evakuasi")
    return {"t": f["t"], "nama": f["nama"], "prov": f["prov"], "kab": f["kab"], "lat": f["lat"], "lon": f["lon"], "sesar_km": s_km,
            "sesar": s_nama, "mmi_skenario": mmi, "elev_m": elev, "pantai_km": pantai, "tinggi_km": tinggi, "alasan": alasan}


_FR = "https://overpass.openstreetmap.fr/api/interpreter"  # 18 Okt 2026: overpass-api.de memutus koneksi sesudah ~15 petak besar,
# kumi/private.coffee 500, mail.ru 504; openstreetmap.fr yang stabil, jadi ia dicoba di tiap giliran genap
OVERPASS = [_FR, "https://overpass-api.de/api/interpreter", _FR, "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
            _FR, "https://overpass.private.coffee/api/interpreter", _FR, "https://overpass.kumi.systems/api/interpreter"]
UA_OSM = "poskokarhutla/1.0 (+github.com/pangantara/poskokarhutla)"  # UA peramban penuh ditolak overpass-api.de (406)
OSM_DIR = os.path.join(AKAR, "data/raw/gempa/osm")
OSM_JENIS = {"hospital": "rs", "clinic": "rs", "school": "sekolah", "college": "sekolah", "university": "sekolah",
             "townhall": "publik", "police": "publik", "fire_station": "publik"}
OSM_NAMA = {"rs": "Fasilitas kesehatan", "sekolah": "Sekolah", "publik": "Bangunan publik"}
PETAK = 2  # derajat
BOBOT_SYARAT = {"atas_sesar": 8, "tanpa_evakuasi": 4, "genangan_bnpb": 4, "mmi_tinggi": 2, "genangan": 1}


def dalam_bbox_bnpb(lat, lon):
    return BNPB_BBOX[0] <= lat <= BNPB_BBOX[1] and BNPB_BBOX[2] <= lon <= BNPB_BBOX[3]


def genangan_bnpb(lat, lon, cache):
    """Kedalaman genangan (m) skenario BNPB_LAPIS di titik lewat WMS GetFeatureInfo; None = di luar genangan atau di luar cakupan."""
    if not dalam_bbox_bnpb(lat, lon):
        return None
    k = f"{lat:.5f},{lon:.5f}"
    if k not in cache:
        d = 0.0005
        q = urllib.parse.urlencode({"service": "WMS", "version": "1.1.1", "request": "GetFeatureInfo", "layers": BNPB_LAPIS,
                                    "query_layers": BNPB_LAPIS, "srs": "EPSG:4326", "bbox": f"{lon - d},{lat - d},{lon + d},{lat + d}",
                                    "width": 3, "height": 3, "x": 1, "y": 1, "info_format": "application/json"})
        with urllib.request.urlopen(urllib.request.Request(BNPB_WMS + "?" + q, headers={"User-Agent": UA}), timeout=60) as r:
            fs = json.loads(r.read())["features"]
        cache[k] = fs[0]["properties"]["GRAY_INDEX"] if fs else -999
        time.sleep(0.3)
    v = cache[k]
    return v if v is not None and v > 0 else None


def _q_osm(s, w, n, e):
    return ('[out:csv(::type,::id,::lat,::lon,amenity,name;false;"\\t")][timeout:300];'
            f'nwr["amenity"~"^({"|".join(OSM_JENIS)})$"]({s},{w},{n},{e});out center;')


def _ambil_petak(arg):
    """Satu petak bbox -> teks TSV mentah (cache). Gagal di semua mirror -> pecah empat; ukuran < 0,5 derajat -> RuntimeError."""
    (s, w, uk), urut = arg
    j = os.path.join(OSM_DIR, f"{s}_{w}_{uk}.tsv")
    if os.path.exists(j):
        return open(j, encoding="utf-8").read()
    data = urllib.parse.urlencode({"data": _q_osm(s, w, s + uk, w + uk)}).encode()
    for i in range(8):
        url = OVERPASS[(urut + i) % len(OVERPASS)]
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA_OSM, "Accept": "*/*"})
            with urllib.request.urlopen(req, timeout=360) as r:
                teks = r.read().decode("utf-8")
            if teks.lstrip().startswith("<"):  # halaman galat/runtime error, bukan TSV
                raise RuntimeError(teks[:120])
            os.makedirs(OSM_DIR, exist_ok=True)
            with open(j + ".tmp", "w", encoding="utf-8") as f:
                f.write(teks)
            os.replace(j + ".tmp", j)
            time.sleep(2)
            return teks
        except Exception as e:
            print(f"  overpass {url.split('/')[2]} {s},{w},{uk}: {str(e)[:80]}", file=sys.stderr)
            time.sleep(min(10 * (i + 1), 60))
    if uk <= 0.5:
        raise RuntimeError(f"petak OSM {s},{w},{uk} gagal di semua mirror")
    h = uk / 2
    return "\n".join(_ambil_petak(((s + dy, w + dx, h), urut + 1)) for dy in (0, h) for dx in (0, h))


def urai_osm(teks):
    """TSV Overpass -> [{t, nama, lat, lon, amenity}]; dedupe titik/poligon yang sama (jenis, nama, ~200 m)."""
    out, lihat = [], set()
    for b in teks.splitlines():
        k = b.split("\t")
        if len(k) < 6 or k[4] not in OSM_JENIS:
            continue
        try:
            lat, lon = float(k[2]), float(k[3])
        except ValueError:
            continue
        t = OSM_JENIS[k[4]]
        nama = k[5].strip()
        kunci = (t, nama.lower(), round(lat / 0.002), round(lon / 0.002))
        if kunci in lihat:
            continue
        lihat.add(kunci)
        out.append({"t": t, "nama": nama or OSM_NAMA[t] + " (tanpa nama di OSM)", "lat": round(lat, 5), "lon": round(lon, 5), "amenity": k[4]})
    return out


def osm_nasional():
    """Petak PETAK derajat di kotak Indonesia yang memuat pusat kecamatan; 2 pekerja (batas 2 slot per IP overpass-api.de), mirror bergilir."""
    pusat = json.load(open(os.path.join(AKAR, "public/banjir/data/pusat_kec.json"))).values()
    petak = sorted({(math.floor(la / PETAK) * PETAK, math.floor(lo / PETAK) * PETAK, PETAK) for la, lo in pusat})
    teks = []
    with cf.ThreadPoolExecutor(2) as ex:
        for i, t in enumerate(ex.map(_ambil_petak, [(p, 2 * i) for i, p in enumerate(petak)])):
            teks.append(t)
            if i % 10 == 0:
                print(f"  petak OSM {i}/{len(petak)}", file=sys.stderr)
    return urai_osm("\n".join(teks))


def pilih_osm(osm, prov_dapodik, prov_rs, w):
    """OSM -> fasilitas berprovinsi. Sekolah hanya di luar provinsi Dapodik, RS hanya di luar provinsi fasilitas.json,
    publik di semua provinsi. Titik di luar poligon dan > 10 km dari pusat kecamatan dibuang."""
    out, buang = [], 0
    for f in osm:
        adm = w.cari(f["lon"], f["lat"])
        if adm:
            kp, kab = adm[0], adm[1]
        else:
            t = terdekat(f["lat"], f["lon"], 10)
            if not t:
                buang += 1
                continue
            kp, kab = t[0], None
        if (f["t"] == "sekolah" and kp in prov_dapodik) or (f["t"] == "rs" and kp in prov_rs):
            continue
        out.append({"t": f["t"], "nama": f["nama"], "prov": kp, "kab": kab, "lat": f["lat"], "lon": f["lon"], "osm": True})
    return out, buang


def bobot(r):
    """Urutan pangkas sekolah: syarat terberat dulu (atas_sesar > tanpa_evakuasi > mmi_tinggi > genangan), lalu MMI, lalu dekat pantai."""
    al = r[-1]
    return (-sum(BOBOT_SYARAT[a] for a in al), -(r[8] or 0), r[10] if r[10] is not None else 99)


def pangkas(hasil, plafon_baris):
    """Semua RS dan publik disimpan; sekolah diurut bobot() dan dipotong sampai total byte baris <= plafon_baris."""
    tetap = [r for r in hasil if r[0] != "sekolah"]
    n = sum(len(json.dumps(r, ensure_ascii=False, separators=(",", ":"))) + 1 for r in tetap)
    sek = []
    for r in sorted((r for r in hasil if r[0] == "sekolah"), key=bobot):
        nb = len(json.dumps(r, ensure_ascii=False, separators=(",", ":"))) + 1
        if n + nb > plafon_baris:
            break
        n += nb
        sek.append(r)
    return tetap + sek, len(hasil) - len(tetap) - len(sek)


def main():
    sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
    from wilayah import Wilayah, PROVINSI
    w = Wilayah()
    sesar = muat_sesar()
    idx_sesar = IndeksGaris([(i, s["koor"]) for i, s in enumerate(sesar)])
    idx_batas = IndeksGaris(garis_provinsi(), 0.04)  # 3x3 sel 0,04 derajat menjamin >= 4,4 km > R_CALON
    fas = muat_fasilitas()
    prov_dapodik = {f["prov"] for f in fas if f["t"] == "sekolah"}
    prov_rs = {f["prov"] for f in fas if f["t"] == "rs"}
    sah, buang = [], {"sekolah": 0, "rs": 0}
    for f in fas:
        ok, kab = sah_lokasi(f, w)
        if not ok:
            buang[f["t"]] += 1
            continue
        f["kab"] = f["kab"] or kab
        sah.append(f)
    catatan_osm = None
    try:
        osm, buang_osm = pilih_osm(osm_nasional(), prov_dapodik, prov_rs, w)
        sah += osm
        n_osm = {t: sum(1 for f in osm if f["t"] == t) for t in OSM_NAMA}
    except Exception as e:  # OSM gagal: tetap terbit dengan cakupan lama, dicatat jujur
        catatan_osm, n_osm, buang_osm = f"OSM Overpass gagal ({str(e)[:120]}); hanya provinsi data repo yang dinilai.", None, 0
        print(catatan_osm, file=sys.stderr)
    print(f"fasilitas dinilai {len(sah)}, OSM {n_osm}, dibuang {buang} osm {buang_osm}", file=sys.stderr)
    # saring murah: hanya calon pesisir (<= 3 km dari batas provinsi) yang butuh DEM
    calon = [f for f in sah if (lambda d: d is not None and d <= R_CALON)(idx_batas.terdekat(f["lat"], f["lon"])[0])]
    dem, catatan_dem = DEM(), None
    try:
        kunci = set()
        for f in calon:
            X, Y = piksel(f["lat"], f["lon"])
            for dx in (-40, 0, 40):  # radius cari 5 km ~ 33 piksel
                for dy in (-40, 0, 40):
                    kunci.add((int(X + dx) // 256, int(Y + dy) // 256))
        print(f"calon pesisir {len(calon)}, ubin DEM {len(kunci)}", file=sys.stderr)
        dem.siapkan(kunci)
    except Exception as e:  # sumber DEM tak bisa diakses: syarat genangan dibuang dengan jujur
        dem, catatan_dem = None, f"DEM terrarium tak bisa diakses ({e}); syarat genangan dan tanpa_evakuasi dibuang."
        print(catatan_dem, file=sys.stderr)
    bnpb, catatan_bnpb = (json.load(open(BNPB_CACHE)) if os.path.exists(BNPB_CACHE) else {}), None
    try:
        for f in sah:
            if dalam_bbox_bnpb(f["lat"], f["lon"]):
                genangan_bnpb(f["lat"], f["lon"], bnpb)
        simpan(BNPB_CACHE, bnpb)
        print(f"titik genangan BNPB diperiksa {len(bnpb)}", file=sys.stderr)
    except Exception as e:
        bnpb, catatan_bnpb = None, f"GeoServer InaRISK gagal ({str(e)[:100]}); genangan_bnpb tidak dinilai."
        print(catatan_bnpb, file=sys.stderr)
    hasil, ringkas = [], {"sekolah": {}, "rs": {}, "publik": {}}
    for f in sah:
        b = nilai_fasilitas(f, sesar, idx_sesar, idx_batas, dem)
        if bnpb is not None and genangan_bnpb(f["lat"], f["lon"], bnpb) is not None:
            b["alasan"].append("genangan_bnpb")
        r = ringkas[f["t"]].setdefault(f["prov"], {"dinilai": 0, **{s: 0 for s in SYARAT}})
        r["dinilai"] += 1
        for s in b["alasan"]:
            r[s] += 1
        if b["alasan"]:
            for k, d in (("sesar_km", 1), ("pantai_km", 1), ("tinggi_km", 1), ("elev_m", 0)):  # presisi cukup untuk kartu
                if b[k] is not None:
                    b[k] = round(b[k], d) if d else int(round(b[k]))
            hasil.append([b[k] for k in KOLOM])
    sebelum = {s: sum(1 for r in hasil if s in r[-1]) for s in SYARAT}
    n_lolos = len(hasil)
    hasil, n_pangkas = pangkas(hasil, PLAFON - 60_000)  # sisakan ruang untuk ringkas, sumber, catatan
    syarat_aktif = [x for x in SYARAT if (dem is not None or x not in ("genangan", "tanpa_evakuasi")) and (bnpb is not None or x != "genangan_bnpb")]
    dinilai = sorted({kp for t in ringkas.values() for kp in t})
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
           "sumber": ["Dapodik Kemendikbudristek dan EMIS Kemenag (sekolah, 9 provinsi)", "Data RS dan puskesmas Centurisk97 (9 provinsi)",
                      "OpenStreetMap, (c) kontributor OpenStreetMap, ODbL 1.0 (2026)", "GEM Global Active Faults Database, Styron & Pagani 2020, CC BY-SA 4.0",
                      "InaRISK BNPB, genangan tsunami skenario (2026)", "AWS Terrain Tiles, Mapzen/Tilezen (SRTM, GMTED2010, ETOPO1)",
                      "Wells & Coppersmith 1994", "Boore dkk. 2014; Worden dkk. 2012"],
           "catatan": (f"Dinilai {len(dinilai)} provinsi. Dapodik dan data RS repo dipakai di provinsinya; provinsi lain memakai OSM, yang "
                       "kelengkapannya beragam (sekolah dan klinik tanpa tag OSM tidak terhitung), jadi cacah bukan sensus dan provinsi yang "
                       "tidak muncul bukan berarti aman. Skenario MMI = sesar terdekat (<= 60 km) pecah utuh sepanjang jejak GEM, yang bisa melebihi segmen yang nyata pecah sekaligus, "
                       f"M dipotong {M_MAKS}, nilai rata-rata tanpa efek tapak; bukan prakiraan. Sesar subduksi tidak dipakai. "
                       f"Koordinat di luar provinsi tercatat dibuang: sekolah {buang['sekolah']}, RS {buang['rs']}, OSM di luar wilayah {buang_osm}. "
                       "Genangan memakai DEM ~150 m (piksel <= 0 m = laut), hanya fasilitas <= 3 km dari batas provinsi; sungai dan tambak "
                       "pesisir rendah bisa terbaca laut. Tanpa_evakuasi = tidak ada piksel >= 20 m dalam 2 km, tanpa memeriksa jalan atau gedung "
                       f"evakuasi vertikal. Plafon berkas 1,5 MB: {n_lolos} fasilitas lolos, semua RS dan bangunan publik disimpan, sekolah diurut "
                       "dari syarat terberat (atas_sesar 8, tanpa_evakuasi 4, mmi_tinggi 2, genangan 1; seri: MMI lebih tinggi, lalu lebih dekat pantai) "
                       f"dan {n_pangkas} sekolah dengan bobot terendah tidak dimuat. `ringkas` menghitung SEMUA yang dinilai, sebelum pemangkasan."
                       + f" genangan_bnpb = di dalam genangan tsunami skenario BNPB Mw {BNPB_MW} (InaRISK, {BNPB_LAPIS}); ketujuh skenario BNPB "
                       "(Mw 7,8 sampai 9,0) di GeoServer hanya meliputi Kota Ambon, jadi di luar Ambon genangan memakai proksi topografi (genangan, "
                       "tanpa_evakuasi) sebagai cadangan. /get-infra-risk BNPB hanya cacah per kabupaten per kelas, bukan titik, jadi tidak dipakai."
                       + (" " + catatan_bnpb if catatan_bnpb else "")
                       + (" " + catatan_osm if catatan_osm else "") + (" " + catatan_dem if catatan_dem else "")),
           "syarat": list(syarat_aktif), "fasilitas_kolom": KOLOM, "fasilitas": hasil, "ringkas": ringkas}
    simpan(KELUAR_B, out)
    n = os.path.getsize(KELUAR_B)
    sesudah = {s: sum(1 for r in hasil if s in r[-1]) for s in SYARAT}
    print(json.dumps({"lolos": n_lolos, "dimuat": len(hasil), "dipangkas": n_pangkas, "per_syarat_sebelum_pangkas": sebelum,
                      "per_syarat_dimuat": sesudah, "per_jenis": {t: sum(1 for r in hasil if r[0] == t) for t in OSM_NAMA},
                      "provinsi": len(dinilai), "byte": n}))
    if n > PLAFON:
        raise SystemExit(f"bukti.json {n} byte > plafon {PLAFON}")


def uji():
    # PNG buatan: 2x2 RGB, filter Sub dan Paeth, elevasi terrarium dikenal
    def png(w, h, piks, filt):
        raw = b""
        for y in range(h):
            row = bytes(c for p in piks[y] for c in p)
            if filt[y] == 1:
                row = bytes((row[i] - (row[i - 3] if i >= 3 else 0)) & 255 for i in range(len(row)))
            raw += bytes([filt[y]]) + row
        ch = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
        return b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + ch(b"IDAT", zlib.compress(raw)) + ch(b"IEND", b"")
    e = lambda v: (int(v + 32768) // 256, int(v + 32768) % 256, 0)
    u = ubin_elev(png(2, 2, [[e(0), e(15)], [e(-100), e(250)]], [1, 0]))
    assert u == [[0, 15], [-100, 250]], u
    for rusak in (b"bukan png", png(2, 2, [[e(0), e(1)], [e(2), e(3)]], [0, 0]).replace(b"IHDR" + struct.pack(">IIBBBBB", 2, 2, 8, 2, 0, 0, 0),
                                                                                   b"IHDR" + struct.pack(">IIBBBBB", 2, 2, 16, 2, 0, 0, 0))):
        try:
            ubin_elev(rusak)
            raise SystemExit("PNG rusak/tak didukung diterima")
        except (ValueError, struct.error, zlib.error):
            pass
    # piksel: (0, 0) di tengah dunia z10
    x, y = piksel(0, 0)
    assert abs(x - 2 ** 10 * 128) < 1e-6 and abs(y - 2 ** 10 * 128) < 1e-6
    # skenario: Wells-Coppersmith dan MMI
    assert abs(m_karakteristik(100) - 7.4) < 1e-9 and m_karakteristik(5000) == M_MAKS
    assert mmi_skenario(7.0, 0) > 8 > mmi_skenario(7.0, 10) > mmi_skenario(7.0, 30) and mmi_skenario(7.0, 60) < 6
    # nilai_fasilitas: sesar buatan + DEM tiruan (laut di barat lon 100,0, dataran 5 m, bukit 30 m di timur 100,02)
    ses = [{"id": 0, "nama": "Uji", "koor": [[100.0, -1.0], [100.0, 1.0]], "L": 222, "m": m_karakteristik(222)}]
    idx = IndeksGaris([(0, ses[0]["koor"])])

    class DEMTiruan(DEM):
        def elev(self, X, Y):
            lon = X / (2 ** Z * 256) * 360 - 180
            return -5 if lon < 100.0 else 5 if lon < 100.02 else 30
    f = lambda lon, t="sekolah": {"t": t, "nama": "x", "prov": "16", "kab": "k", "lat": 0.0, "lon": lon}
    a = nilai_fasilitas(f(100.005), ses, idx, idx, DEMTiruan())
    assert a["alasan"] == ["atas_sesar", "mmi_tinggi", "genangan"] and a["tinggi_km"] < 2, a
    b = nilai_fasilitas(f(100.15), ses, idx, IndeksGaris([]), DEMTiruan())
    assert b["alasan"] == ["mmi_tinggi"] and b["elev_m"] is None, b  # 17 km, MMI >= 7; bukan calon pesisir
    c = nilai_fasilitas(f(101.0), ses, idx, IndeksGaris([]), None)
    assert c["alasan"] == [] and c["sesar_km"] is None, c  # 111 km: di luar radius skenario
    e2 = nilai_fasilitas(f(100.4), ses, idx, IndeksGaris([]), None)
    assert e2["alasan"] == [] and e2["mmi_skenario"] < 7, e2

    class DEMDatar(DEMTiruan):
        def elev(self, X, Y):
            lon = X / (2 ** Z * 256) * 360 - 180
            return -5 if lon < 100.0 else 3
    d = nilai_fasilitas(f(100.005), ses, idx, idx, DEMDatar())
    assert "tanpa_evakuasi" in d["alasan"] and d["tinggi_km"] is None, d
    # OSM: urai + dedupe, pilih provinsi, pangkas mendahulukan syarat terberat
    tsv = "node\t1\t-0.9\t119.87\tschool\tSD 1\nway\t2\t-0.9001\t119.8701\tschool\tSD 1\nnode\t3\t-0.9\t119.9\tclinic\t\n" \
          "node\t4\tx\t1\tschool\tRusak\nnode\t5\t0\t0\tbank\tB\n"
    o = urai_osm(tsv)
    assert [(x["t"], x["nama"]) for x in o] == [("sekolah", "SD 1"), ("rs", "Fasilitas kesehatan (tanpa nama di OSM)")], o
    sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
    from wilayah import Wilayah
    pil, bg = pilih_osm(o + [{"t": "publik", "nama": "Polsek", "lat": 1.0, "lon": 101.45, "amenity": "police"},
                             {"t": "sekolah", "nama": "SD Riau", "lat": 1.0, "lon": 101.45, "amenity": "school"},
                             {"t": "publik", "nama": "Laut", "lat": -5.0, "lon": 125.0, "amenity": "police"}], {"14"}, {"72"}, Wilayah())
    assert [(x["nama"], x["prov"]) for x in pil] == [("SD 1", "72"), ("Polsek", "14")] and bg == 1, (pil, bg)
    rw = lambda t, al, mmi=None, pk=None: [t, "n", "72", "k", 0, 0, None, None, mmi, None, pk, None, al]
    rows = [rw("sekolah", ["genangan"], None, 0.1), rw("sekolah", ["atas_sesar", "mmi_tinggi"], 8.1), rw("rs", ["genangan"]),
            rw("sekolah", ["mmi_tinggi"], 7.2), rw("publik", ["genangan"]), rw("sekolah", ["genangan", "tanpa_evakuasi"], None, 1.0)]
    sat = len(json.dumps(rows[0], separators=(",", ":"))) + 1
    ps, npk = pangkas(rows, sat * 4 + 60)  # muat dua sekolah terberat, bukan tiga
    assert [r[0] for r in ps] == ["rs", "publik", "sekolah", "sekolah"] and npk == 2 and ps[2][-1][0] == "atas_sesar" and "tanpa_evakuasi" in ps[3][-1], ps
    assert dalam_bbox_bnpb(-3.7, 128.18) and not dalam_bbox_bnpb(-8.6, 116.1)
    assert genangan_bnpb(-8.6, 116.1, {}) is None  # di luar cakupan: tanpa jaringan, tanpa vonis
    assert genangan_bnpb(-3.7, 128.18, {"-3.70000,128.18000": 10.86}) == 10.86 and genangan_bnpb(-3.7, 128.18, {"-3.70000,128.18000": -999}) is None
    if os.path.exists(KELUAR_B):
        assert os.path.getsize(KELUAR_B) <= PLAFON, os.path.getsize(KELUAR_B)
        o = json.load(open(KELUAR_B))
        assert o["fasilitas_kolom"] == KOLOM and o["dibuat"] and o["catatan"] and o["sumber"]
        ia = KOLOM.index("alasan")
        for r in o["fasilitas"]:
            assert len(r) == len(KOLOM) and r[ia] and set(r[ia]) <= set(o["syarat"]) and r[0] in ("sekolah", "rs", "publik"), r
            assert "tanpa_evakuasi" not in r[ia] or "genangan" in r[ia], r
    print("bukti uji OK")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
