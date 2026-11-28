"""Elevasi tanah pesisir dari DeltaDTM v1.1 lokal -> luas di bawah ambang per kecamatan (PT-10, penurunan-tanah, ALGORITMA 4).

DeltaDTM (Pronk dkk. 2024, CC BY 4.0, DTM pesisir 30 m, MAE 0,43 m, tinggi terhadap geoid EGM2008) diambil hanya ubin yang
perlu: Asia.zip (17,3 GB) dibaca lewat HTTP Range (zipfile stdlib di atas berkas jarak jauh), anggota terpilih saja diekstrak
ke data/raw/banjir/deltadtm/ (gitignored, tidak masuk repo). Hentikan bila total > 3 GB. Tanpa GDAL (tiff_mini).

Keluaran: data/raw/banjir/deltadtm/elevasi_tanah.json (LOKAL; belum ke public/ sebelum pemilik dan validasi-model setuju).
Per kecamatan: n piksel valid, cakupan %, median dan p10 elevasi, luas km2 dan % di bawah 1/2/3 m. Piksel tanpa data =
"belum terukur", bukan nol; kecamatan tanpa piksel valid tidak diberi angka. Bila diberi --proyeksi <proyeksi_tanah.json>,
tambah `setelah_turun`: luas di bawah p90 pasut stasiun terdekat + D(T) (tanah turun D = elevasi efektif turun D), tiga rentang.
HIPOTESIS: datum DeltaDTM (geoid) tidak sama dengan MSL BMKG; selisih lokal tak dikoreksi dan galat 0,43 m ditulis di berkas.
Bukan probabilitas rob, tidak dijumlahkan dengan status rob (D1).

Pakai: python3 scripts/banjir/elevasi_tanah.py uji
       python3 scripts/banjir/elevasi_tanah.py ubin                 (daftar ubin dari kotak kota, tanpa unduh)
       python3 scripts/banjir/elevasi_tanah.py ambil                (unduh ubin yang belum ada, catat sha256)
       python3 scripts/banjir/elevasi_tanah.py hitung [--proyeksi berkas.json]
"""
import hashlib, io, json, math, os, sqlite3, struct, sys, tempfile, threading, time, urllib.parse, urllib.request, zipfile
from http.server import BaseHTTPRequestHandler, HTTPServer

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "genangan"))
from umum import KELUAR, MENTAH, simpan
from wilayah import AKAR, _cincin, _di_dalam
import tiff_mini

DIR = os.path.join(MENTAH, "deltadtm")
ZIP_URL = "https://data.4tu.nl/file/1da2e70f-6c4d-4b03-86bd-b53e789cc629/672eba4c-1334-44c6-8119-8879ded25912"
GPKG_URL = "https://data.4tu.nl/file/1da2e70f-6c4d-4b03-86bd-b53e789cc629/60a69899-2e67-4f9f-8761-3b57094acd12"
ATRIBUSI = "DeltaDTM v1.1, Pronk dkk. 2024, CC BY 4.0 (4TU.ResearchData, doi 10.4121/21997565)"
MAKS_BYTE = 3_000_000_000
AMBANG_M = (1.0, 2.0, 3.0)   # ILUSTRATIF, pilihan perancang (RISET-ROB.md:158), BUKAN ambang bahaya bersumber
MAE_M = 0.43
BLOK = 4 << 20
MAKS_GPKG = 10_000_000
HOST_OK = {"data.4tu.nl"}   # tidak ada pengalihan pada dua URL di atas (dicek 26 Nov 2026); host lain ditolak


class _Tahan(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        h = urllib.parse.urlparse(newurl)
        if h.hostname not in HOST_OK:
            raise RuntimeError(f"pengalihan ke host tak diizinkan: {newurl}")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


BUKA = urllib.request.build_opener(_Tahan).open


def sha256_berkas(j):
    h = hashlib.sha256()
    with open(j, "rb") as f:
        while b := f.read(1 << 20):
            h.update(b)
    return h.hexdigest()
# kota -> (berkas provinsi kecamatan, kabupaten yang dipakai); Q3: Jakarta, Semarang dan Demak, Pekalongan, Surabaya
KOTA = {
    "Jakarta": ("31", lambda k: k.startswith("Kota Administrasi Jakarta")),
    "Semarang": ("33", lambda k: k in ("Kota Semarang", "Demak")),
    "Pekalongan": ("33", lambda k: k in ("Kota Pekalongan", "Pekalongan")),
    "Surabaya": ("35", lambda k: k == "Kota Surabaya"),
}


def kecamatan_kota():
    """-> {kota: [(kec, kab, [cincin])]} dari public/geo/kecamatan."""
    h = {}
    for kota, (p, ok) in KOTA.items():
        d = json.load(open(os.path.join(AKAR, f"public/geo/kecamatan/{p}.json")))
        h[kota] = [(f["properties"]["kec"], f["properties"]["kab"], _cincin(f["geometry"]))
                   for f in d["features"] if ok(f["properties"].get("kab") or "")]
    return h


def nama_ubin(lon, lat):
    return f"DeltaDTM_v1_1_{'N' if lat >= 0 else 'S'}{abs(lat):02d}{'E' if lon >= 0 else 'W'}{abs(lon):03d}.tif"


def ubin_kota(kk):
    """kotak tiap kota -> himpunan (lon, lat) sudut barat-daya ubin 1 derajat yang beririsan."""
    s = {}
    for kota, daftar in kk.items():
        xs = [x for _, _, cs in daftar for c in cs for x, _ in c]
        ys = [y for _, _, cs in daftar for c in cs for _, y in c]
        for lo in range(math.floor(min(xs)), math.floor(max(xs)) + 1):
            for la in range(math.floor(min(ys)), math.floor(max(ys)) + 1):
                s.setdefault((lo, la), []).append(kota)
    return s


class RangeZip(io.RawIOBase):
    """Berkas jarak jauh baca-saja lewat HTTP Range, satu blok 4 MB di-cache; server yang mengabaikan Range = galat (jangan unduh utuh)."""
    def __init__(self, url, maks_jaringan=MAKS_BYTE):
        self.url, self.pos, self.blok, self.byte, self.maks = url, 0, (None, b""), 0, maks_jaringan
        r = self._get("bytes=0-0")
        self.ukuran = int(r[1].rsplit("/", 1)[1])

    def _get(self, rentang, coba=4):
        for i in range(coba):
            try:
                req = urllib.request.Request(self.url, headers={"User-Agent": "poskobanjir/1.0", "Range": rentang})
                with BUKA(req, timeout=120) as r:
                    if r.status != 206:
                        raise RuntimeError(f"Range diabaikan (HTTP {r.status})")
                    b = r.read(BLOK + 1)
                    self.byte += len(b)
                    if self.byte > self.maks:
                        raise RuntimeError(f"lalu lintas jaringan melewati plafon {self.maks} B")
                    return b, r.headers["Content-Range"]
            except RuntimeError:
                raise
            except Exception as e:
                if i == coba - 1:
                    raise RuntimeError(f"{self.url}: {e}")
                time.sleep(3 * (i + 1))

    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.pos

    def seek(self, p, w=0):
        self.pos = p if w == 0 else (self.pos + p if w == 1 else self.ukuran + p)
        return self.pos

    def read(self, n=-1):
        if n < 0:
            n = self.ukuran - self.pos
        n = min(n, self.ukuran - self.pos)
        out = bytearray()
        while n > 0:
            a = (self.pos // BLOK) * BLOK
            if self.blok[0] != a:
                self.blok = (a, self._get(f"bytes={a}-{min(a + BLOK, self.ukuran) - 1}")[0])
            potong = self.blok[1][self.pos - a:self.pos - a + n]
            if not potong:
                break
            out += potong
            self.pos += len(potong)
            n -= len(potong)
        return bytes(out)

    def readinto(self, b):
        d = self.read(len(b))
        b[:len(d)] = d
        return len(d)


def ambil():
    os.makedirs(DIR, exist_ok=True)
    jgpkg = os.path.join(DIR, "deltadtm_tiles.gpkg")
    if not os.path.exists(jgpkg):
        with BUKA(urllib.request.Request(GPKG_URL, headers={"User-Agent": "poskobanjir/1.0"}), timeout=120) as r:
            b = r.read(MAKS_GPKG + 1)
        if len(b) > MAKS_GPKG:
            sys.exit(f"BERHENTI: indeks ubin lebih dari {MAKS_GPKG} B")
        open(jgpkg, "wb").write(b)
    c = sqlite3.connect(jgpkg)
    kk = kecamatan_kota()
    butuh = {}
    for (lo, la), kota in sorted(ubin_kota(kk).items()):
        r = c.execute("select tile, zipfile from data where longitude=? and latitude=?", (lo, la)).fetchone()
        if r:
            butuh[r[0]] = (r[1], kota)
        else:
            print(f"  ubin {nama_ubin(lo, la)} tidak ada di indeks (laut/tanpa darat pesisir): dilewati")
    jman = os.path.join(DIR, "unduhan.json")
    man = json.load(open(jman)) if os.path.exists(jman) else {"atribusi": ATRIBUSI, "sumber": ZIP_URL, "ubin": {}}
    total = sum(v["byte"] for v in man["ubin"].values())
    rz = RangeZip(ZIP_URL)
    z = zipfile.ZipFile(rz)
    anggota = {os.path.basename(i.filename): i for i in z.infolist()}
    for nama, (zf, kota) in butuh.items():
        tujuan = os.path.join(DIR, nama)
        if os.path.exists(tujuan) and nama in man["ubin"]:
            if sha256_berkas(tujuan) != man["ubin"][nama]["sha256"]:
                sys.exit(f"BERHENTI: sha256 {nama} tidak cocok dengan unduhan.json; hapus berkas itu bila sengaja diunduh ulang")
            continue
        info = anggota[nama]
        if total + info.file_size > MAKS_BYTE:
            sys.exit(f"BERHENTI: {nama} ({info.file_size} B) melewati plafon {MAKS_BYTE} B; total terunduh {total} B")
        h = hashlib.sha256()
        with z.open(info) as src, open(tujuan + ".tmp", "wb") as dst:
            while b := src.read(1 << 20):
                h.update(b)
                dst.write(b)
        os.replace(tujuan + ".tmp", tujuan)
        total += info.file_size
        man["ubin"][nama] = {"byte": info.file_size, "sha256": h.hexdigest(), "kota": kota}
        print(f"  {nama}: {info.file_size} B sha256 {h.hexdigest()[:16]}... ({', '.join(kota)})")
        simpan(jman, man)
    man["total_byte"], man["byte_jaringan"] = total, rz.byte
    simpan(jman, man)
    print(f"total ubin {total} B; lalu lintas jaringan {rz.byte} B")


class Ubin:
    """Satu ubin DeltaDTM 1 derajat (float32, lintang menurun dari sisi utara)."""
    def __init__(self, jalur, lon, lat):
        t = tiff_mini.Tiff(jalur)
        self.t, self.lon, self.lat = t, lon, lat
        self.dx, self.dy = 1.0 / t.lebar, 1.0 / t.tinggi
        self.x0, self.y0 = t.titik_ikat[3], t.titik_ikat[4]  # pojok barat-laut piksel (titik ikat GeoTIFF)
        self.cache = {}

    def z(self, x, y):
        """elevasi (m) di (bujur, lintang) atau None bila di luar ubin atau tanpa data."""
        i, j = math.floor((x - self.x0) / self.dx), math.floor((self.y0 - y) / self.dy)
        t = self.t
        if not (0 <= i < t.lebar and 0 <= j < t.tinggi):
            return None
        k = (j // t.tt, i // t.tl)
        if k not in self.cache:
            if len(self.cache) > 40:
                self.cache.clear()
            self.cache[k] = t.ubin(k[1], k[0])
        v = self.cache[k][(j % t.tt) * t.tl + (i % t.tl)]
        return None if v != v or (t.nodata is not None and v == t.nodata) or v < -100 else v


def persen(xs, q):
    xs = sorted(xs)
    i = (len(xs) - 1) * q
    lo = int(i)
    return xs[lo] + (xs[min(lo + 1, len(xs) - 1)] - xs[lo]) * (i - lo)


def luas_piksel_km2(lat, dx, dy):
    return (dy * 111.195) * (dx * 111.195 * math.cos(math.radians(lat)))


def statistik(z, lat, dx, dy, n_dalam, ambang=AMBANG_M):
    """z = elevasi piksel valid dalam kecamatan; n_dalam = semua piksel di dalam poligon -> dict atau None bila tak ada piksel valid."""
    if not z:
        return None
    a = luas_piksel_km2(lat, dx, dy)
    d = dict(n=len(z), cakupan=round(100 * len(z) / n_dalam), median_m=round(persen(z, .5), 2), p10_m=round(persen(z, .1), 2),
             luas_km2=round(len(z) * a, 2), bawah={})
    for m in ambang:
        k = sum(1 for v in z if v < m)
        d["bawah"][f"{m:g}m"] = dict(km2=round(k * a, 2), pct=round(100 * k / len(z), 1))
    return d


def stasiun_terdekat(st, lon, lat):
    best = min(st, key=lambda s: (s["lat"] - lat) ** 2 + ((s["lon"] - lon) * math.cos(math.radians(lat))) ** 2)
    jarak = math.hypot(best["lat"] - lat, (best["lon"] - lon) * math.cos(math.radians(lat))) * 111.195
    return best, round(jarak)


def setelah_turun(z, a, p90_cm, t_cm):
    """t_cm = {rendah, pusat, tinggi} cm turun -> luas km2 dan % piksel dengan z < p90 pasut + D (elevasi efektif turun D)."""
    base = p90_cm / 100.0
    return {r: dict(km2=round(sum(1 for v in z if v < base + d / 100.0) * a, 2),
                    pct=round(100 * sum(1 for v in z if v < base + d / 100.0) / len(z), 1)) for r, d in t_cm.items()}


def hitung(proyeksi=None):
    kk = kecamatan_kota()
    man = json.load(open(os.path.join(DIR, "unduhan.json")))
    st = json.load(open(os.path.join(KELUAR, "pasut_30h.json")))["stasiun"]
    pr = {}
    if proyeksi:
        pj = json.load(open(proyeksi))
        if pj.get("tayang_ditahan") or pj.get("basi") or pj.get("gerbang", {}).get("lolos") is False:
            print("proyeksi ditahan/basi/gerbang gagal: setelah_turun dilewati")
        else:
            pr = {(h["kec"], h["kab"]): h for h in pj["kecamatan"]}
    ubin = {}
    for nama in man["ubin"]:
        if sha256_berkas(os.path.join(DIR, nama)) != man["ubin"][nama]["sha256"]:
            sys.exit(f"sha256 {nama} tidak cocok dengan unduhan.json")
        lat = (-1 if nama[14] == "S" else 1) * int(nama[15:17])
        lon = (-1 if nama[17] == "W" else 1) * int(nama[18:21])
        ubin[(lon, lat)] = Ubin(os.path.join(DIR, nama), lon, lat)
    sample = next(iter(ubin.values()))
    dx, dy = sample.dx, sample.dy
    hasil = {}
    for kota, daftar in kk.items():
        baris = []
        for kec, kab, cincin in daftar:
            z, n_dalam, lat_sum = [], 0, 0.0
            for r in cincin:
                xs, ys = [p[0] for p in r], [p[1] for p in r]
                j0, j1 = math.floor(min(ys) / dy), math.ceil(max(ys) / dy)
                for j in range(j0, j1 + 1):
                    y = (j + .5) * dy
                    for i in range(math.floor(min(xs) / dx), math.ceil(max(xs) / dx) + 1):
                        x = (i + .5) * dx
                        if not _di_dalam(x, y, r):
                            continue
                        n_dalam += 1
                        lat_sum += y
                        u = ubin.get((math.floor(x), math.floor(y)))
                        v = u.z(x, y) if u else None
                        if v is not None:
                            z.append(v)
            if not n_dalam:
                continue
            lat = lat_sum / n_dalam
            s = statistik(z, lat, dx, dy, n_dalam)
            b = dict(kec=kec, kab=kab, n_dalam=n_dalam, belum_terukur=s is None)
            if s:
                b.update(s)
                if (kec, kab) in pr:
                    cx = sum(p[0] for r in cincin for p in r) / sum(len(r) for r in cincin)
                    sta, jarak = stasiun_terdekat(st, cx, lat)
                    b["setelah_turun"] = dict(mae_m=MAE_M, label="hipotesis: elevasi DTM dibanding p90 pasut setelah tanah turun bila laju bertahan, bukan probabilitas rob; datum geoid bukan MSL",
                                              stasiun=sta["nama"], jarak_km=jarak, p90_cm=sta["p90"],
                                              t10=setelah_turun(z, luas_piksel_km2(lat, dx, dy), sta["p90"], pr[(kec, kab)]["t10_cm"]),
                                              t20=setelah_turun(z, luas_piksel_km2(lat, dx, dy), sta["p90"], pr[(kec, kab)]["t20_cm"]))
            baris.append(b)
        hasil[kota] = baris
        print(f"{kota}: {len(baris)} kecamatan, belum terukur {sum(1 for b in baris if b['belum_terukur'])}")
    keluar = dict(versi=1, atribusi=ATRIBUSI, mae_m=MAE_M, datum="tinggi terhadap geoid EGM2008 (DeltaDTM); BUKAN MSL BMKG, selisih lokal tak dikoreksi",
                  ambang_m=list(AMBANG_M), label="hipotesis: elevasi DTM pesisir 30 m bergalat 0,43 m, bukan probabilitas rob; ambang 1/2/3 m ilustratif pilihan perancang, bukan ambang bahaya bersumber; belum divalidasi",
                  catatan="luas di bawah ambang dari piksel valid saja; piksel tanpa data tidak dihitung nol", kota=hasil)
    simpan(os.path.join(DIR, "elevasi_tanah.json"), keluar)


def tiff_sintetis(jalur, nilai, x0, y0):
    """TIFF float32 2x2 tanpa kompresi, titik ikat (x0, y0) di pojok barat-laut piksel (PixelIsArea)."""
    ent = [(256, 3, 1, 2), (257, 3, 1, 2), (258, 3, 1, 32), (259, 3, 1, 1), (322, 3, 1, 2), (323, 3, 1, 2), (339, 3, 1, 3)]
    n = len(ent) + 3
    d0 = 8 + 2 + 12 * n + 4                      # awal area data
    ent += [(324, 4, 1, d0), (325, 4, 1, 16), (33922, 12, 6, d0 + 16)]
    b = b"II*\0" + struct.pack("<I", 8) + struct.pack("<H", n)
    for t, ty, c, v in sorted(ent):
        b += struct.pack("<HHII", t, ty, c, v)
    b += struct.pack("<I", 0) + struct.pack("<4f", *nilai) + struct.pack("<6d", 0, 0, 0, x0, y0, 0)
    open(jalur, "wb").write(b)


def uji_tiff():
    j = os.path.join(tempfile.mkdtemp(), "s.tif")
    # ubin 1 derajat di (10, 20): piksel 2x2 selebar 0,5; pojok barat-laut (10, 21); nilai baris demi baris; -9999 = tanpa data
    tiff_sintetis(j, [1.0, 2.0, 3.0, -9999.0], 10.0, 21.0)
    u = Ubin(j, 10, 20)
    u.t.nodata = -9999.0
    assert (u.z(10.25, 20.75), u.z(10.75, 20.75), u.z(10.25, 20.25)) == (1.0, 2.0, 3.0)
    assert u.z(10.75, 20.25) is None and u.z(9.99, 20.75) is None and u.z(10.25, 21.01) is None  # tanpa data, luar ubin
    # titik ikat = pojok: 10,0 persis di tepi barat masih piksel pertama; kalau dibaca sebagai pusat piksel, 9,9 akan masuk
    assert u.z(10.0, 20.75) == 1.0 and u.z(9.9, 20.75) is None


class _Palsu(BaseHTTPRequestHandler):
    abaikan_range = False
    isi = bytes(range(256)) * 40

    def do_GET(self):
        r = self.headers.get("Range")
        if r and not self.abaikan_range:
            a, z = map(int, r[6:].split("-"))
            b = self.isi[a:z + 1]
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {a}-{a + len(b) - 1}/{len(self.isi)}")
        else:
            b = self.isi
            self.send_response(200)
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def log_message(self, *a):
        pass


def uji_range():
    global HOST_OK
    srv = HTTPServer(("127.0.0.1", 0), _Palsu)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{srv.server_port}/x"
    try:
        r = RangeZip(url)   # 206 diterima
        assert r.ukuran == len(_Palsu.isi) and r.byte <= 2
        r.seek(300)
        assert r.read(10) == _Palsu.isi[300:310] and r.read(5) == _Palsu.isi[310:315]
        _Palsu.abaikan_range = True
        try:
            RangeZip(url)
            raise AssertionError("200 harus ditolak")
        except RuntimeError as e:
            assert "Range diabaikan" in str(e)
        _Palsu.abaikan_range = False
        try:   # plafon lalu lintas
            q = RangeZip(url, maks_jaringan=5)
            q.seek(0)
            q.read(100)
            raise AssertionError("plafon jaringan harus menolak")
        except RuntimeError as e:
            assert "plafon" in str(e)
    finally:
        srv.shutdown()
    # pengalihan ke host lain ditolak
    try:
        _Tahan().redirect_request(urllib.request.Request("https://data.4tu.nl/a"), None, 302, "", {}, "https://evil.example/x")
        raise AssertionError("host asing harus ditolak")
    except RuntimeError as e:
        assert "tak diizinkan" in str(e)
    # sha256 berkas
    j = os.path.join(tempfile.mkdtemp(), "a")
    open(j, "wb").write(b"abc")
    assert sha256_berkas(j) == hashlib.sha256(b"abc").hexdigest()
    # plafon byte ambil: ditegakkan di ambil() (MAKS_BYTE) dan RangeZip.maks; zipfile di atas berkas lokal tetap terbaca
    b = io.BytesIO()
    with zipfile.ZipFile(b, "w") as zf:
        zf.writestr("x/a.tif", b"1234")
    assert zipfile.ZipFile(io.BytesIO(b.getvalue())).read("x/a.tif") == b"1234"


def uji():
    # nama ubin
    assert nama_ubin(106, -7) == "DeltaDTM_v1_1_S07E106.tif" and nama_ubin(-65, 18) == "DeltaDTM_v1_1_N18W065.tif"
    # statistik: 4 piksel valid dari 5 di dalam poligon: 0,5 1,5 2,5 5; cakupan 80; kosong bukan nol
    s = statistik([0.5, 1.5, 2.5, 5.0], 0.0, 1 / 3600, 1 / 3600, 5)
    assert s["n"] == 4 and s["cakupan"] == 80 and s["bawah"]["1m"]["pct"] == 25.0 and s["bawah"]["3m"]["pct"] == 75.0, s
    assert s["bawah"]["1m"]["km2"] <= s["bawah"]["2m"]["km2"] <= s["bawah"]["3m"]["km2"]
    assert statistik([], 0.0, 1 / 3600, 1 / 3600, 5) is None
    # luas piksel 1 detik busur di ekuator ~ 0,000954 km2 (30,9 m x 30,9 m)
    assert abs(luas_piksel_km2(0, 1 / 3600, 1 / 3600) - 0.000954) < 1e-5
    # setelah turun: tanah turun 100 cm, p90 50 cm -> ambang efektif 150 cm; elevasi 1,0 dan 1,4 lolos, 1,6 tidak
    a = luas_piksel_km2(0, 1 / 3600, 1 / 3600)
    r = setelah_turun([1.0, 1.4, 1.6], a, 50, dict(rendah=0, pusat=100, tinggi=200))
    assert r["pusat"]["pct"] == 66.7 and r["rendah"]["pct"] == 0.0 and r["tinggi"]["pct"] == 100.0, r
    assert r["rendah"]["km2"] <= r["pusat"]["km2"] <= r["tinggi"]["km2"]
    # stasiun terdekat
    sta, j = stasiun_terdekat([dict(nama="A", lat=0, lon=0), dict(nama="B", lat=1, lon=1)], 0.9, 0.9)
    assert sta["nama"] == "B" and j < 20
    # ubin kota: Jakarta di satu ubin S07E106
    kk = kecamatan_kota()
    assert (106, -7) in ubin_kota({"Jakarta": kk["Jakarta"]}) and len(kk["Jakarta"]) >= 40
    uji_tiff()
    uji_range()
    print("elevasi_tanah uji: OK")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a == ["ubin"]:
        for (lo, la), k in sorted(ubin_kota(kecamatan_kota()).items()):
            print(nama_ubin(lo, la), k)
    elif a == ["ambil"]:
        ambil()
    elif a[:1] == ["hitung"]:
        hitung(a[a.index("--proyeksi") + 1] if "--proyeksi" in a else None)
    else:
        sys.exit(__doc__)
