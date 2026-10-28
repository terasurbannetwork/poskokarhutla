"""Lapisan lahan untuk merutekan karhutla: gambut, konsesi, kawasan hutan.

Pakai:  python3 scripts/scrape/lahan.py            # unduh (kalau belum ada) + bangun
        python3 scripts/scrape/lahan.py --uji      # cek cepat hasil di public/data/lahan

Mentah  -> data/raw/lahan/   (zip shapefile + GeoJSON gambut/moratorium PRIMS; tidak di-commit)
Hasil   -> public/data/lahan/{gambut,konsesi,kawasan}.geojson

Sumber (semua publik tanpa login):
- Gambut: peta gambut 1:250.000 Kementan (BBSDLP) lewat PRIMS BRGM, WFS prims:gambut_250k
  (12,93 jt ha; Sumatra, Kalimantan minus Kaltim/Kaltara, Papua), per fitur sumber
  "BBSDLP 1:250.000 lewat PRIMS". Kaltim (64) tak ada di sana: kelas MOR_GAMBUT lapisan
  moratorium PIPPIB (WFS prims:moratorium, bbox Kaltim, disaring pippib_15 = MOR_GAMBUT),
  per fitur sumber "PIPPIB (moratorium), indikatif" dan keyakinan "indikatif" (keputusan
  pemilik 28 Okt 2026; sama dengan renlap Kaltim, sippa/pilot/tarik.py). Dulu GFW "Global
  peatland extent" (Gumbricht 2017, mangrove + rawa ikut gambut): Kaltim ~2,46 jt ha.
  Kaltara (65) belum dipantau (bukan PRIORITAS), jadi tak dimuat.
- Konsesi: tautan unduh resmi GFW (dicantumkan GFW di katalog ArcGIS-nya): sawit
  (v20191031, data KLHK ~2014) dan HPH/PBPH-HA. Data Indonesia berasal dari KLHK; GFW
  mengecualikan Indonesia dari CC BY 4.0. HTI belum ada (lihat konsesi()).
- Kawasan hutan: shapefile "Kawasan hutan Indonesia" dari akun GFW di ArcGIS Online
  (KLHK, versi 2017).
"""
import io, json, math, os, struct, sys, time, urllib.request, zipfile
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
MENTAH = os.path.join(AKAR, "data/raw/lahan")
KELUAR = os.path.join(AKAR, "public/data/lahan")
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))

# Kunci publik yang GFW sendiri tempel di tautan unduh katalognya (item ArcGIS Online
# 5581330f..., 5920a4a5..., 221fee51...), bukan kunci akun kita.
GFW = "https://data-api.globalforestwatch.org/dataset/{}/download/shp?x-api-key=2d60cd88-8348-4c0f-a6d5-bd9adb585a8c"
UNDUH = {
    # v2025 menolak unduh shp (501); data Indonesianya sama (KLHK, source_yr 2012)
    "gfw_oil_palm.zip": GFW.format("gfw_oil_palm/v20191031"),
    "gfw_logging_download.zip": GFW.format("gfw_logging_download/latest"),
    "idn_forest_area.zip": "https://www.arcgis.com/sharing/rest/content/items/1dd7ef31c3924d7cbcf918bd97a7f985/data",
    "gambut_250k.geojson": "https://prims.brgm.go.id/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature"
                           "&typeNames=prims:gambut_250k&outputFormat=application/json&srsName=EPSG:4326",
    # bbox lon,lat Kaltim (WFS 1.0.0, urutan seperti tarik.py); kelas MOR_GAMBUT disaring di mor_gambut()
    "moratorium_kaltim.json": "https://prims.brgm.go.id/geoserver/ows?service=WFS&version=1.0.0&request=GetFeature"
                              "&typeName=prims:moratorium&outputFormat=application/json&bbox=113.8,-2.6,119.1,2.5",
}
KALTIM = "64"  # tak ada di prims:gambut_250k
SUMBER_PRIMS = "BBSDLP 1:250.000 lewat PRIMS"
SUMBER_PIPPIB = "PIPPIB (moratorium), indikatif"
Z = 8
X0, X1, Y0, Y1 = 195, 228, 123, 136  # ubin z8 yang menutup 94..141.5 BT, 6.5 LU..11.5 LS


def ambil(url, tujuan, coba=4):
    if os.path.exists(tujuan) and os.path.getsize(tujuan) > 0:
        return
    for i in range(coba):
        try:
            with urllib.request.urlopen(url, timeout=1800) as r, open(tujuan + ".part", "wb") as f:
                while blok := r.read(1 << 20):
                    f.write(blok)
            os.replace(tujuan + ".part", tujuan)
            return
        except Exception:
            if i == coba - 1:
                raise
            time.sleep(10 * (i + 1))


def unduh(gambut_saja=False):
    os.makedirs(MENTAH, exist_ok=True)
    tugas = [(u, os.path.join(MENTAH, n)) for n, u in UNDUH.items() if not gambut_saja or n.endswith((".json", ".geojson"))]
    with ThreadPoolExecutor(8) as ex:
        list(ex.map(lambda t: ambil(*t), tugas))


# Kisi z8 (256 px/ubin) tetap dipakai sebagai kisi sel 2x2 piksel (~1,2 km) untuk poligon PRIMS 250k.
def lon(px):  # px global pada z8 (256 px/ubin)
    return px / (256 << Z) * 360 - 180


def lat(py):
    return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * py / (256 << Z)))))


def baris(la):  # lintang -> indeks baris sel kontinu (pusat sel = bilangan bulat)
    py = (1 - math.asinh(math.tan(math.radians(la))) / math.pi) / 2 * (256 << Z)
    return (py - Y0 * 256 - 1) / 2


def kolom(lo):
    return ((lo + 180) / 360 * (256 << Z) - X0 * 256 - 1) / 2


def isi_prims(grid):
    """Sel yang pusatnya di poligon PRIMS = 2 (scanline genap-ganjil per fitur, lubang ikut)."""
    tinggi, lebar = len(grid), len(grid[0])
    for f in json.load(open(os.path.join(MENTAH, "gambut_250k.geojson")))["features"]:
        g, potong = f["geometry"], {}  # baris -> kolom kontinu tempat tepi memotong pusat baris
        for poli in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]):
            for cincin in poli:
                for (x1, y1), (x2, y2) in zip(cincin, cincin[1:] + cincin[:1]):
                    r1, r2 = baris(y1), baris(y2)
                    for r in range(max(0, math.ceil(min(r1, r2))), min(tinggi - 1, math.floor(max(r1, r2))) + 1):
                        if (r1 > r) != (r2 > r):
                            potong.setdefault(r, []).append(kolom(x1 + (r - r1) / (r2 - r1) * (x2 - x1)))
        for r, xs in potong.items():
            xs.sort()
            for a, b in zip(xs[::2], xs[1::2]):
                for c in range(max(0, math.ceil(a)), min(lebar - 1, math.floor(b)) + 1):
                    grid[r][c] = 2


def mor_gambut(w, tol=0.002, min_luas=1e-5):
    """Poligon MOR_GAMBUT PIPPIB yang titik beratnya di Kaltim (poligon di batas ikut utuh ke
    provinsi titik beratnya; Kaltara/Kalteng tidak dimuat dari sini)."""
    fitur = []
    cw = lambda c: sum((c[i][0] - c[i - 1][0]) * (c[i][1] + c[i - 1][1]) for i in range(len(c))) > 0
    for f in json.load(open(os.path.join(MENTAH, "moratorium_kaltim.json")))["features"]:
        if (f.get("properties") or {}).get("pippib_15") != "MOR_GAMBUT":
            continue
        g = f["geometry"]
        polis = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        luar = polis[0][0] if len(polis) == 1 else max((p[0] for p in polis), key=lambda c: luas(c))
        hit = w.cari(sum(x for x, _ in luar) / len(luar), sum(y for _, y in luar) / len(luar))
        if not hit or hit[0] != KALTIM:
            continue
        # sederhana() mengikuti shapefile: cincin luar searah jarum jam, lubang berlawanan
        cincin = [[tuple(q) for q in (c if cw(c) == (i == 0) else c[::-1])] for poli in polis for i, c in enumerate(poli)]
        sg = sederhana(cincin, tol, min_luas)
        if sg:
            fitur.append({"type": "Feature", "properties": {"prov": KALTIM, "sumber": SUMBER_PIPPIB, "keyakinan": "indikatif"}, "geometry": sg})
    return fitur


def gambut():
    """Sel 2x2 piksel z8 (~1,2 km): gambut kalau pusatnya di poligon PRIMS 250k. Sel dalam satu baris
    digabung jadi persegi; persegi identik di baris bawahnya ikut digabung. Kaltim: mor_gambut()."""
    from wilayah import PRIORITAS, Wilayah
    w = Wilayah()
    lebar, tinggi = (X1 - X0 + 1) * 128, (Y1 - Y0 + 1) * 128
    grid = [bytearray(lebar) for _ in range(tinggi)]  # 2 = PRIMS
    isi_prims(grid)
    # Buang sel di luar 9 provinsi pantauan (juga Malaysia/PNG/laut) dan sel yang
    # 8 tetangganya kosong (bintik tunggal); ponytail: nasional penuh = ~12 MB; buka
    # PRIORITAS kalau perlu, tapi pecah per provinsi supaya tiap berkas tetap kecil.
    prov = {}
    for r in range(tinggi):
        la = lat((Y0 * 256) + 2 * r + 1)
        for c in range(lebar):
            if not grid[r][c]:
                continue
            tetangga = sum(grid[rr][cc] for rr in (r - 1, r, r + 1) for cc in (c - 1, c, c + 1)
                           if 0 <= rr < tinggi and 0 <= cc < lebar) - 1
            hit = w.cari(lon(X0 * 256 + 2 * c + 1), la) if tetangga else None
            if hit and hit[0] in PRIORITAS and hit[0] != KALTIM:
                prov[r, c] = hit[0]
    for r in range(tinggi):
        for c in range(lebar):
            if (r, c) not in prov:
                grid[r][c] = 0
    terbuka, fitur = {}, []  # (c0, c1, prov) -> [r0, r1]
    def tutup(k, v):
        c0, c1, p = k
        x0, x1 = round(lon(X0 * 256 + 2 * c0), 4), round(lon(X0 * 256 + 2 * c1), 4)
        y0, y1 = round(lat(Y0 * 256 + 2 * v[0]), 4), round(lat(Y0 * 256 + 2 * v[1]), 4)
        fitur.append({"type": "Feature", "properties": {"prov": p, "sumber": SUMBER_PRIMS},
                      "geometry": {"type": "Polygon", "coordinates": [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]}})
    for r in range(tinggi + 1):
        jalan = set()
        if r < tinggi:
            c = 0
            while c < lebar:
                if grid[r][c]:
                    p, c0 = prov[r, c], c
                    while c < lebar and grid[r][c] and prov[r, c] == p:
                        c += 1
                    jalan.add((c0, c, p))
                else:
                    c += 1
        for k in list(terbuka):
            if k in jalan:
                terbuka[k][1] = r + 1
            else:
                tutup(k, terbuka.pop(k))
        for k in jalan - terbuka.keys():
            terbuka[k] = [r, r + 1]
    return fitur + mor_gambut(w)


# ---------- shapefile dari zip (Polygon, EPSG:4326) ----------
def baca_shp(zp, cocok=""):
    z = zipfile.ZipFile(zp)
    berkas = {n.lower(): n for n in z.namelist() if not n.startswith("__MACOSX")}
    nama = [n for n in berkas if n.endswith(".shp") and cocok in n]
    assert len(nama) == 1, nama
    dasar = nama[0][:-4]
    baca = lambda ext: z.read(berkas[dasar + ext]).decode(errors="ignore").strip() if dasar + ext in berkas else ""
    prj = baca(".prj")
    assert "GEOGCS" in prj and "PROJCS" not in prj, f"proyeksi tak terduga: {prj[:80]}"
    cpg = baca(".cpg") or "latin-1"
    dbf, shp = z.open(berkas[dasar + ".dbf"]), z.open(berkas[dasar + ".shp"])
    n, hlen, rlen = struct.unpack("<xxxxIHH20x", dbf.read(32))
    kepala, kolom = dbf.read(hlen - 32), []
    for i in range(0, len(kepala) - 31, 32):
        if kepala[i] == 0x0D:
            break
        kolom.append((kepala[i:i + 11].split(b"\0")[0].decode(), kepala[i + 16]))
    shp.read(100)
    for _ in range(n):
        rec = dbf.read(rlen)
        props, i = {}, 1
        for nm, ln in kolom:
            props[nm.lower()] = rec[i:i + ln].decode(cpg, errors="replace").strip()
            i += ln
        _, panjang = struct.unpack(">II", shp.read(8))
        isi = shp.read(panjang * 2)
        tipe = struct.unpack("<i", isi[:4])[0]
        if tipe not in (5, 15, 25):
            yield props, []
            continue
        nb, npt = struct.unpack("<ii", isi[36:44])
        bagian = list(struct.unpack(f"<{nb}i", isi[44:44 + 4 * nb])) + [npt]
        xy = struct.unpack(f"<{2 * npt}d", isi[44 + 4 * nb:44 + 4 * nb + 16 * npt])
        yield props, [[(xy[2 * j], xy[2 * j + 1]) for j in range(bagian[k], bagian[k + 1])] for k in range(nb)]


def dp(titik, tol):
    """Douglas-Peucker iteratif."""
    if len(titik) < 5:
        return titik
    simpan = [False] * len(titik)
    simpan[0] = simpan[-1] = True
    tumpuk = [(0, len(titik) - 1)]
    t2 = tol * tol
    while tumpuk:
        a, b = tumpuk.pop()
        (ax, ay), (bx, by) = titik[a], titik[b]
        dx, dy = bx - ax, by - ay
        d2 = dx * dx + dy * dy
        jauh, idx = -1, -1
        for i in range(a + 1, b):
            px, py = titik[i]
            if d2:
                t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / d2))
                ex, ey = ax + t * dx - px, ay + t * dy - py
            else:
                ex, ey = px - ax, py - ay
            e = ex * ex + ey * ey
            if e > jauh:
                jauh, idx = e, i
        if jauh > t2:
            simpan[idx] = True
            tumpuk += [(a, idx), (idx, b)]
    return [p for p, s in zip(titik, simpan) if s]


def luas(c):
    return abs(sum(c[i][0] * c[i - 1][1] - c[i - 1][0] * c[i][1] for i in range(len(c)))) / 2


def sederhana(cincin, tol, min_luas):
    """Cincin -> MultiPolygon GeoJSON. Tiap cincin luar membawa lubang yang mengikutinya (urutan shapefile)."""
    poli = []
    for c in cincin:
        s = dp(c, tol)
        if len(s) < 4 or luas(s) < min_luas:
            continue
        s = [[round(x, 4), round(y, 4)] for x, y in s]
        cw = sum((s[i][0] - s[i - 1][0]) * (s[i][1] + s[i - 1][1]) for i in range(len(s))) > 0
        if cw or not poli:  # shapefile: cincin luar searah jarum jam
            poli.append([s[::-1] if cw else s])
        else:
            poli[-1].append(s[::-1])
    return {"type": "MultiPolygon", "coordinates": poli} if poli else None


def kumpul(sumber, tol, min_luas):
    for props, cincin in sumber:
        g = sederhana(cincin, tol, min_luas)
        if g:
            yield props, g


def konsesi(tol=0.002, min_luas=1e-5):
    fitur = []
    def tambah(jenis, nama, pemegang, g):
        fitur.append({"type": "Feature", "properties": {"jenis": jenis, "nama": nama, "pemegang": pemegang}, "geometry": g})
    for p, g in kumpul(((p, c) for p, c in baca_shp(os.path.join(MENTAH, "gfw_oil_palm.zip")) if p["country"] == "IDN"), tol, min_luas):
        tambah("sawit", p["name"], p["company"] or p["name"], g)
    # HTI/PBPH sengaja belum ada: GFW menandai data HTI Indonesia "View Only, Not Downloadable",
    # dan alias gfw_wood_fiber_downloadable kini malah menunjuk ke peta PIPPIB.
    for p, g in kumpul(((p, c) for p, c in baca_shp(os.path.join(MENTAH, "gfw_logging_download.zip")) if p.get("country", p.get("iso3")) == "IDN"), tol, min_luas):
        tambah("hph", p.get("name"), p.get("company") or p.get("name"), g)
    return fitur


# Kode `fungsikawa` KLHK -> fungsi. Tahura dipisah (pengelola Pemda/SKPD, bukan BKSDA/BTN).
FUNGSI = {"1001": "HL", "1003": "HP", "1004": "HPT", "1005": "HPK", "1007": "APL", "10026": "THR"}


def fungsi(kode):
    if kode in FUNGSI:
        return FUNGSI[kode]
    if kode == "1" or kode.startswith("100"):  # 1002, 10021-10025, 1002xx laut: KSA/KPA/Taman Buru
        return "HK"
    return "AIR" if kode.startswith("500") else "?"


def kawasan(tol=0.001, min_luas=2e-5):
    from wilayah import PRIORITAS, Wilayah
    w, fitur = Wilayah(), []
    # 9 provinsi pantauan saja (nasional = 9,4 MB). Data 2017 belum kenal Papua Selatan (93):
    # poligon berkode Papua lama (9x) diperiksa titik pertamanya.
    sumber = ((p, c) for p, c in baca_shp(os.path.join(MENTAH, "idn_forest_area.zip"))
              if fungsi(p["fungsikawa"]) not in ("APL", "AIR")  # di luar semua poligon = APL/perairan
              and (p["kodeprov"] in PRIORITAS or p["kodeprov"][:1] == "9" and c
                   and (w.cari(*c[0][0]) or ("",))[0] == "93"))
    for p, g in kumpul(sumber, tol, min_luas):
        f = fungsi(p["fungsikawa"])
        nama = p["namobj"].strip(" -")
        if f in ("HK", "THR"):  # "Taman Nasional Sebangau", "Taman Hutan Raya Ir. H. Juanda"
            nama = f"{p['desc_in']} {nama}".strip()
        fitur.append({"type": "Feature", "properties": {"fungsi": f, "nama": nama, "prov": "93" if p["kodeprov"][:1] == "9" else p["kodeprov"]}, "geometry": g})
    return fitur


def tulis(nama, fitur):
    os.makedirs(KELUAR, exist_ok=True)
    p = os.path.join(KELUAR, nama)
    with open(p, "w") as f:
        json.dump({"type": "FeatureCollection", "features": fitur}, f, separators=(",", ":"), ensure_ascii=False)
    print(f"{nama}: {len(fitur)} fitur, {os.path.getsize(p) / 1e6:.1f} MB", file=sys.stderr)


def di_dalam(lo, la, geom):
    """Ray casting per poligon; lubang membalik hasil."""
    polis = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    for poli in polis:
        dalam = False
        for r in poli:
            c, j = False, len(r) - 1
            for i in range(len(r)):
                if (r[i][1] > la) != (r[j][1] > la) and lo < (r[j][0] - r[i][0]) * (la - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]:
                    c = not c
                j = i
            dalam ^= c
        if dalam:
            return True
    return False


def uji(gambut_saja=False):
    def kena(nama, lo, la):
        return [f["properties"] for f in json.load(open(os.path.join(KELUAR, nama)))["features"] if di_dalam(lo, la, f["geometry"])]
    # Taman Nasional Sebangau (Kalteng): gambut dalam + kawasan konservasi
    assert kena("gambut.geojson", 113.75, -2.55), "Sebangau mestinya gambut"
    if not gambut_saja:
        assert any(p["fungsi"] == "HK" for p in kena("kawasan.geojson", 113.75, -2.55)), kena("kawasan.geojson", 113.75, -2.55)
        # Kota Palangka Raya: bukan gambut tebal, tapi pusat kota APL -> tidak ada kawasan hutan
        assert not kena("kawasan.geojson", 113.92, -2.21)
    # Merauke timur (sabana Wasur) dan Boven Digoel tengah: tanah mineral, dulu ikut gambut versi Gumbricht
    assert not kena("gambut.geojson", 140.6, -8.3) and not kena("gambut.geojson", 140.4, -6.3)
    # Kaltim: kelas MOR_GAMBUT PIPPIB bertanda indikatif; PRIMS 250k bertanda sumbernya; tak ada GFW
    fg = json.load(open(os.path.join(KELUAR, "gambut.geojson")))["features"]
    kt = [f["properties"] for f in fg if f["properties"]["prov"] == KALTIM]
    assert kt and all(p.get("sumber") == SUMBER_PIPPIB and p.get("keyakinan") == "indikatif" for p in kt), "Kaltim harus PIPPIB indikatif"
    assert all(f["properties"].get("sumber") == SUMBER_PRIMS for f in fg if f["properties"]["prov"] != KALTIM)
    # Puncak Jaya Wijaya (Papua Tengah) bukan gambut
    assert not kena("gambut.geojson", 137.16, -4.08)
    if gambut_saja:
        return print("ok (gambut)")
    jenis = {f["properties"]["jenis"] for f in json.load(open(os.path.join(KELUAR, "konsesi.geojson")))["features"]}
    assert {"sawit", "hph"} <= jenis, jenis  # konsesi.geojson kini dibangun scripts/scrape/konsesi.py (+ hti, tambang)
    print("ok")


if __name__ == "__main__":
    if "--uji" in sys.argv:
        uji()
    elif "--gambut" in sys.argv:  # hanya gambut.geojson (tanpa zip konsesi/kawasan)
        unduh(True)
        tulis("gambut.geojson", gambut())
        uji(True)
    else:
        unduh()
        tulis("gambut.geojson", gambut())
        # konsesi.geojson dibangun scripts/scrape/konsesi.py (nama, grup, izin, HTI, tambang); konsesi() di sini tinggal cadangan
        tulis("kawasan.geojson", kawasan())
        uji()
