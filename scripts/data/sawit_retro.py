"""Analisis mundur kebakaran 2015 (dan 2019, internal): lahan terbakar mana yang SEBELUMNYA BUKAN sawit lalu MENJADI sawit
("indikasi dibakar lalu jadi sawit"), dibedakan dari lahan yang SUDAH sawit saat terbakar ("sawit terbakar").
INI INDIKASI, BUKAN BUKTI SIAPA MEMBAKAR: tumpang-tindih ruang dan waktu tidak menunjukkan pelaku.

Keluaran: data/raw/sawit/hasil/sawit_retro.json (internal, dua tahun, ber-nama) dan, hanya tahun 2015 (2019: jendela 1 tahun,
"tidak terbit"), public/data/konsesi2026/sawit_riwayat.json + riwayat/<id>_riwayat2015_<sebelum|sesudah|plus2>_<tgl>.png untuk
halaman Laporan Konsesi (keputusan pemilik 17 Okt + 19 Okt 2026: halaman itu memang menampilkan nama perusahaan).

Sumber:
- Gaveau, D.L.A. dkk. 2022, "Industrial and Smallholder Oil Palm Plantation Expansion in Indonesia 2001-2019", PLOS ONE,
  doi 10.1371/journal.pone.0266178, data TheTreeMap/Auriga, Zenodo 10.5281/zenodo.6069212, CC BY 4.0.
  Poligon sawit industri + rakyat per pulau; field F2000..F2019 = kelas lahan tiap tahun (IOPP, Smallholder,
  Non Forest, Forest, ITP). Poligon hanya ada untuk lahan yang jadi sawit s.d. 2019.
- NASA FIRMS VIIRS S-NPP 375 m arsip tahunan (type 0, confidence n/h).
- Descals dkk. 2024 (lewat sawit_peta.py): pengecekan silang sampel "bakar lalu sawit" (YoP > 0) dan, 2019, di luar poligon Gaveau.
- Konsesi KLHK ~2014 via GFW (public/data/lahan/konsesi.geojson: sawit, hph, hti); grup dari konsesi2026/*.json lalu grup_perusahaan.json.
- Citra 2015: Landsat 8/7 Collection 2 Level-2 (Microsoft Planetary Computer, token anonim), Sentinel-2 L2A untuk 2017 (Earth Search).

Metode ringkas: tiap deteksi VIIRS = jejak scan x track km; 3x3 titik sampel di jejaknya dibulatkan ke kisi 0,001125
derajat (~125 m, ~1,56 ha) per tahun api supaya deteksi bertumpuk tidak ganda. Luas = "luas di bawah jejak titik VIIRS",
BUKAN luas bakar terpeta (melebihi untuk api kecil). Sampel diuji ke poligon Gaveau, konsesi, dan kecamatan lewat
pengisian garis-sapu (scanline) pada kisi itu; lubang poligon ditangani aturan genap-ganjil.

Pakai:  python3 scripts/data/sawit_retro.py                  # semua tahap, 2015 dan 2019
        python3 scripts/data/sawit_retro.py analisis [--tahun 2015] [--tanpa-descals]
        python3 scripts/data/sawit_retro.py citra            # hanya 2015, 15 teratas terbit
        python3 scripts/data/sawit_retro.py tulis             # gabung antara/ -> hasil/sawit_retro.json + sawit_riwayat.json
        python3 scripts/data/sawit_retro.py ttm | citra-ttm [--id a,b] | ringkas   # 2019 dan 2023 dari TTM2024 (internal); konfirm = ttm_konfirm 2015
        python3 scripts/data/sawit_retro.py unduh | uji
"""
from array import array
import csv, datetime as dt, json, math, mmap, os, struct, sys, time, urllib.request, zipfile
from bisect import bisect_left
from collections import Counter, defaultdict

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(AKAR, "data/raw/sawit")
ANTARA = os.path.join(DIR, "antara")
# bernama perusahaan: keputusan pemilik 14 Okt 2026, tidak terbit -> data/raw (di-ignore)
KELUAR = os.path.join(AKAR, "data/raw/sawit/hasil/sawit_retro.json")
CITRA_DIR = os.path.join(AKAR, "data/raw/sawit/hasil/citra")
CITRA_TTM = os.path.join(AKAR, "data/raw/sawit/hasil/citra_ttm")   # sumber PNG; hanya yang direferensikan disalin ke TERBIT_CITRA
TERBIT = os.path.join(AKAR, "public/data/konsesi2026/sawit_riwayat.json")
TERBIT_CITRA = os.path.join(AKAR, "public/data/konsesi2026/riwayat")   # folder sendiri: konsesi2026/citra dibersihkan skrip citra konsesi
TAHUN_TERBIT = 2015             # sumber Gaveau; 2019 (jendela 1 tahun) tidak terbit dari Gaveau
TAHUN_TERBIT_TTM = tuple(range(2016, 2024))  # terbit dari TTM2024 (CC BY-NC, pemilik putuskan 22 Okt 2026: situs nonkomersial, atribusi wajib tampil)
BS_MIN, PORSI_MIN, TOP_TERBIT = 50, .10, 15   # hipotesis, belum diuji balik: saring perusahaan terbit
LUAS_RESMI_2015 = 2_610_000     # ha, luas terbakar resmi KLHK 2015
MUDA = (2016, 2018)             # tahun-sawit yang lebih tak pasti (peta konsesi/Gaveau dekat akhir jendela)
PC_STAC = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
PC_TOKEN = "https://planetarycomputer.microsoft.com/api/sas/v1/token/landsat-c2-l2"
MAKS_PNG = 150_000
G = 0.001125                    # kisi sampel, derajat (~125 m)
K = 1_000_000                   # kunci sel = iy * K + ix
PULAU = ["Java", "Kalimantan", "Maluku", "Papua", "Sulawesi", "Sumatra"]
JENIS = [("Industrial_Oil_Palm", "industri"), ("Smallholder_Oil_Palm", "rakyat")]
SAWIT = {"IOPP", "Smallholder"}
ASAL = ("Forest", "Non Forest", "ITP")
TAHUN = (2015, 2019)
TAHUN_TTM = tuple(range(2016, 2024))   # sumber TTM2024 (tahun tanam dari peta, bukan jendela Gaveau)
ASAL_TTM = ("hutan primer saat api", "hutan primer sudah hilang sebelum api", "bukan hutan primer 2000")
BATAS = 2019                    # Gaveau berhenti di 2019
JENDELA = 4                     # tahun sesudah api yang dicek untuk "jadi sawit"
UNDUH = {
    "Industrial_Oil_Palm.zip": "https://zenodo.org/api/records/6069212/files/Industrial_Oil_Palm.zip/content",
    "Smallholder_Oil_Palm.zip": "https://zenodo.org/api/records/6069212/files/Smallholder_Oil_Palm.zip/content",
}
UA = {"User-Agent": "poskokarhutla/1.0 (+github.com/pangantara/poskokarhutla)"}
SUMBER = [
    "Gaveau, D.L.A., Locatelli, B., Salim, M.A., Husnayaen, Manurung, T., Descals, A., Angelsen, A., Meijaard, E., Sheil, D. (2022). Slowing deforestation in Indonesia follows declining oil palm expansion and lower oil prices. PLOS ONE 17(3): e0266178, doi 10.1371/journal.pone.0266178. Data: TheTreeMap/Auriga, Zenodo 10.5281/zenodo.6069212, CC BY 4.0.",
    "NASA FIRMS, VIIRS S-NPP 375 m (arsip standar tahunan, type 0, confidence n/h), https://firms.modaps.eosdis.nasa.gov/ (LANCE/EOSDIS).",
    "KLHK via Global Forest Watch: konsesi sawit, HPH, HTI (data ~2014-2019), https://data.globalforestwatch.org/.",
    "Contains modified Copernicus Sentinel data 2015-2021 (citra bukti, Sentinel-2 L2A via AWS Earth Search).",
]
SUMBER_TTM = "The TreeMap (2026). Global oil palm expansion 2001-2024 v1.1, Zenodo 10.5281/zenodo.20747717, CC BY-NC 4.0 (NonCommercial)."
SUMBER_DESCALS = "Descals, A. dkk. (2024). Global mapping of oil palm planting year from 1990 to 2021. Earth Syst. Sci. Data 16:5111, Zenodo 10.5281/zenodo.13379129, CC BY 4.0."


def log(*a):
    print(*a, file=sys.stderr, flush=True)


# ---------------------------------------------------------------- unduh
def unduh():
    os.makedirs(DIR, exist_ok=True)
    for nama, url in UNDUH.items():
        folder = os.path.join(DIR, nama[:-4])
        if os.path.isdir(folder):
            continue
        zp = os.path.join(DIR, nama)
        if not os.path.exists(zp):
            log("unduh", url)
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r, open(zp, "wb") as f:
                while (b := r.read(1 << 20)):
                    f.write(b)
        zipfile.ZipFile(zp).extractall(DIR)
    for y in sorted(set(TAHUN) | set(TAHUN_TTM)):
        p = os.path.join(DIR, f"viirs_{y}.csv")
        if not os.path.exists(p):
            url = f"https://firms.modaps.eosdis.nasa.gov/data/country/viirs-snpp/{y}/viirs-snpp_{y}_Indonesia.csv"
            log("unduh", url)
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r, open(p, "wb") as f:
                while (b := r.read(1 << 20)):
                    f.write(b)


# ---------------------------------------------------------------- geometri kisi
def kunci(lon, lat):
    return math.floor(lat / G) * K + math.floor(lon / G)


def pusat(k):
    iy, ix = divmod(k, K)
    return (ix + .5) * G, (iy + .5) * G


def luas_ha(iy):
    """luas satu sel kisi, hektar (lintang tengah sel)"""
    return G * 110.574 * G * 111.32 * math.cos(math.radians((iy + .5) * G)) * 100


def baris(kunci_):
    """{iy: [ix terurut]} dari himpunan kunci sel"""
    r = defaultdict(list)
    for k in kunci_:
        iy, ix = divmod(k, K)
        r[iy].append(ix)
    for v in r.values():
        v.sort()
    return r


def ada(rows, b):
    """adakah sel di dalam kotak b = (barat, selatan, timur, utara)? uji murah sebelum poligon diurai"""
    x0, x1 = math.floor(b[0] / G), math.floor(b[2] / G)
    for k in range(math.floor(b[1] / G), math.floor(b[3] / G) + 1):
        lst = rows.get(k)
        if lst:
            i = bisect_left(lst, x0)
            if i < len(lst) and lst[i] <= x1:
                return True
    return False


def isi(cincin, rows):
    """kunci sel (pusat sel di dalam poligon) dari rows. cincin = [[(lon,lat)...]...] satu poligon: cincin luar dan
    lubang sekaligus, aturan genap-ganjil. Garis-sapu pada lintang pusat tiap baris; sisi memakai aturan y1<=y<y2."""
    sil = {}
    for r in cincin:
        for i in range(len(r)):
            x1, y1 = r[i - 1]
            x2, y2 = r[i]
            if y1 == y2:
                continue
            if y1 > y2:
                x1, y1, x2, y2 = x2, y2, x1, y1
            dx = (x2 - x1) / (y2 - y1)
            for k in range(math.ceil(y1 / G - .5), math.ceil(y2 / G - .5)):
                if k in rows:
                    sil.setdefault(k, []).append(x1 + ((k + .5) * G - y1) * dx)
    hasil = []
    for k, xs in sil.items():
        xs.sort()
        lst = rows[k]
        for a, b in zip(xs[0::2], xs[1::2]):
            i0, i1 = bisect_left(lst, math.ceil(a / G - .5)), bisect_left(lst, math.ceil(b / G - .5))
            hasil.extend(k * K + ix for ix in lst[i0:i1])
    return hasil


# ---------------------------------------------------------------- titik VIIRS -> sampel
def sampel(tahun):
    """{kunci sel: bit} dari arsip VIIRS. bit rendah 12 = topeng bulan api; di atasnya jumlah deteksi berpusat di sel."""
    s = {}
    n = 0
    for r in csv.DictReader(open(os.path.join(DIR, f"viirs_{tahun}.csv"))):
        if r["type"] != "0" or r["confidence"] not in ("n", "h"):
            continue
        n += 1
        la, lo = float(r["latitude"]), float(r["longitude"])
        sc, tr = float(r["scan"]), float(r["track"])
        bln = 1 << (int(r["acq_date"][5:7]) - 1)
        kx = 111.32 * math.cos(math.radians(la))
        for j in (-1, 0, 1):
            for i in (-1, 0, 1):
                k = kunci(lo + i * sc / 3 / kx, la + j * tr / 3 / 110.574)
                s[k] = s.get(k, 0) | bln
                if i == 0 and j == 0:
                    s[k] += 1 << 12
    log(f"  {tahun}: {n} deteksi, {len(s)} sampel unik")
    return s


# ---------------------------------------------------------------- shapefile Gaveau (stream, saring bbox)
def klasifikasi(F, y, batas=BATAS):
    """F = {tahun: kelas}. -> ('st', None, None) sawit terbakar | ('bs', asal, tahun_sawit) bakar lalu sawit | ('lain', asal, None)"""
    sebelum = F[y - 1]
    if sebelum in SAWIT:
        return ("st", None, None)
    for t in range(y, min(y + JENDELA, batas) + 1):
        if F.get(t) in SAWIT:
            return ("bs", sebelum, t)
    return ("lain", sebelum, None)


def shp_dbf(shp, dbf):
    """alirkan (indeks, bbox, fungsi_cincin, fungsi_F) per poligon; berkas dipetakan mmap, tak dimuat ke memori"""
    fs, fd = open(shp, "rb"), open(dbf, "rb")
    ms, md = mmap.mmap(fs.fileno(), 0, access=mmap.ACCESS_READ), mmap.mmap(fd.fileno(), 0, access=mmap.ACCESS_READ)
    n, hlen, rlen = struct.unpack_from("<xxxxIHH20x", md, 0)
    kol, o, i = {}, 1, 32
    while md[i] != 0x0D:
        kol[bytes(md[i:i + 11]).split(b"\0")[0].decode()] = (o, md[i + 16])
        o += md[i + 16]
        i += 32

    def nilai(idx, nama):
        a, ln = kol[nama]
        return bytes(md[hlen + idx * rlen + a:hlen + idx * rlen + a + ln]).decode("latin-1").strip()

    def cincin(c):
        nb, npt = struct.unpack_from("<ii", ms, c + 36)
        bag = list(struct.unpack_from(f"<{nb}i", ms, c + 44)) + [npt]
        xy = struct.unpack_from(f"<{2 * npt}d", ms, c + 44 + 4 * nb)
        return [[(xy[2 * j], xy[2 * j + 1]) for j in range(bag[q], bag[q + 1])] for q in range(nb)]

    pos, idx = 100, 0
    while pos + 8 <= len(ms) and idx < n:
        _, pj = struct.unpack_from(">ii", ms, pos)
        c = pos + 8
        if struct.unpack_from("<i", ms, c)[0] in (5, 15, 25):
            yield idx, struct.unpack_from("<4d", ms, c + 4), c, cincin, nilai
        pos = c + pj * 2
        idx += 1
    ms.close(), md.close(), fs.close(), fd.close()


def gaveau(rows, tahun):
    """-> ({kunci: (kode, asal, tahun_sawit, pemilik, bukan_hutan_sejak_2000)}, jumlah_sampel_tumpang_poligon)"""
    hasil, tumpang, cache = {}, 0, {}
    for dasar, pem in JENIS:
        for pulau in PULAU:
            p = os.path.join(DIR, dasar, f"{dasar}_{pulau}")
            t0, n, kena = time.time(), 0, 0
            for idx, bb, c, cincin, nilai in shp_dbf(p + ".shp", p + ".dbf"):
                n += 1
                if not ada(rows, bb):
                    continue
                ks = isi(cincin(c), rows)
                if not ks:
                    continue
                F = {y: nilai(idx, f"F{y}") for y in range(2000, min(tahun + JENDELA, BATAS) + 1)}
                kode, asal, th = klasifikasi(F, tahun)
                nh = kode == "bs" and all(F[y] == "Non Forest" for y in range(2000, tahun))   # tak pernah hutan sejak 2000
                t = cache.setdefault((kode, asal, th, pem, nh), (kode, asal, th, pem, nh))
                for k in ks:
                    if k in hasil:
                        tumpang += 1
                    else:
                        hasil[k] = t
                        kena += 1
            log(f"  gaveau {pem} {pulau}: {n} poligon, {kena} sampel kena, {time.time() - t0:.0f} dtk")
    return hasil, tumpang


# ---------------------------------------------------------------- Descals (2019, di luar poligon Gaveau)
def descals(kunci_, lo=2019, hi=2021):
    """kunci sel (di luar poligon Gaveau) yang pikselnya tahun-persiapan-lahan Descals dalam [lo, hi]"""
    import sawit_peta as S
    ind = S.indeks()
    petak = defaultdict(list)
    for i, (x0, y0, W, H) in ind.items():
        for gx in range(math.floor(x0), math.floor(x0 + W * S.Ubin.PIX) + 1):
            for gy in range(math.floor(y0 - H * S.Ubin.PIX), math.floor(y0) + 1):
                petak[(gx, gy)].append(i)
    kerja = defaultdict(list)
    for k in kunci_:
        lon, lat = pusat(k)
        for i in petak.get((math.floor(lon), math.floor(lat)), ()):
            x0, y0, W, H = ind[i]
            x, y = int((lon - x0) / S.Ubin.PIX), int((y0 - lat) / S.Ubin.PIX)
            if 0 <= x < W and 0 <= y < H:
                kerja[i].append((y // 256, x // 256, y, x, k))
                break
    hasil, t0 = {}, time.time()
    for i, daftar in kerja.items():
        daftar.sort()
        ub = S.ubin(i)
        for _, _, y, x, k in daftar:
            v = ub.nilai(x, y)
            if v and lo <= v <= hi:
                hasil[k] = v
    log(f"  descals: {sum(len(v) for v in kerja.values())} sampel diuji di {len(kerja)} ubin, {len(hasil)} cocok, {time.time() - t0:.0f} dtk")
    return hasil


# ---------------------------------------------------------------- konsesi & wilayah
def bagian(g):
    return g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]


def baca_konsesi():
    """daftar konsesi urut sawit, hti, hph (tumpang tindih: yang pertama menang). tambang tidak dipakai."""
    grup = json.load(open(os.path.join(AKAR, "data/raw/konsesi/grup_perusahaan.json")))["perusahaan"] if os.path.exists(
        os.path.join(AKAR, "data/raw/konsesi/grup_perusahaan.json")) else {}
    fs = json.load(open(os.path.join(AKAR, "public/data/lahan/konsesi.geojson")))["features"]
    urut = {"sawit": 0, "hti": 1, "hph": 2}
    hasil = []
    for f in sorted((f for f in fs if f["properties"]["jenis"] in urut), key=lambda f: urut[f["properties"]["jenis"]]):
        p = f["properties"]
        g = p.get("grup") or (grup.get(p["nama"]) or {}).get("grup") or ""
        hasil.append({"id": p["id"], "nama": p["nama"], "grup": g, "jenis": p["jenis"], "prov": p.get("prov", ""),
                      "kab": p.get("kab", ""), "luas_ha": p.get("luas_peta_ha"), "bagian": bagian(f["geometry"])})
    return hasil


def baca_kecamatan():
    """[(prov, kab, bagian)] dari public/geo/kecamatan; dipakai hingga tingkat kabupaten"""
    sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
    from wilayah import PROVINSI
    hasil = []
    for kode in PROVINSI:
        p = os.path.join(AKAR, "public/geo/kecamatan", f"{kode}.json")
        if os.path.exists(p):
            for f in json.load(open(p))["features"]:
                hasil.append((kode, f["properties"]["kab"], bagian(f["geometry"])))
    return hasil


def kotak_bagian(b):
    xs = [c[0] for c in b[0]]
    ys = [c[1] for c in b[0]]
    return min(xs), min(ys), max(xs), max(ys)


def tetapkan(rows, daftar, label=None):
    """daftar = [bagian poligon...] per entri -> ({kunci sel: indeks entri}, jumlah tumpang, Counter pasangan label); pertama menang"""
    peta, tump, pasang = {}, 0, Counter()
    for n, bag in enumerate(daftar):
        for b in bag:
            if not ada(rows, kotak_bagian(b)):
                continue
            for k in isi(b, rows):
                if k in peta:
                    tump += 1
                    if label:
                        pasang[(label[peta[k]], label[n])] += 1
                else:
                    peta[k] = n
    return peta, tump, pasang


# ---------------------------------------------------------------- agregat
ES_AWAL = dt.date(2017, 1, 1)   # Earth Search sentinel-2-l2a / c1-l2a: adegan Indonesia tertua ~Jan 2017 (diperiksa Okt 2026)
BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
KELAS = ("bs", "bd", "st", "bk")   # bakar lalu sawit (Gaveau) | bakar lalu sawit 2019-2021 (Descals) | sawit terbakar | bukan sawit s.d. 2019


def kelas_sampel(k, gav, dsc):
    h = gav.get(k)
    if h is None:
        return ("bd", None, dsc[k], None, False) if k in dsc else ("bk", None, None, None, False)
    return (h[0] if h[0] != "lain" else "bk", h[1], h[2], h[3], h[4])


def agregat(tahun, s, gav, dsc, ko, pko, kec, pkec, dcf=()):
    """dcf = kunci sampel bs yang Descals YoP > 0"""
    tot = {"ha": Counter(), "n": Counter(), "asal": Counter(), "th": Counter(), "pem": Counter(), "luar_ha": Counter(),
           "lag": Counter(), "nh": 0., "muda": 0., "bs_n": 0, "dcf_n": 0}
    per, kab = {}, {}
    for k, v in s.items():
        iy, ix = divmod(k, K)
        a, n = luas_ha(iy), v >> 12
        kl, asal, th, pem, nh = kelas_sampel(k, gav, dsc)
        tot["ha"][kl] += a
        tot["n"][kl] += n
        if kl == "bs":
            tot["asal"][asal] += a
            tot["th"][th] += a
            tot["pem"][pem] += a
            tot["lag"][th - tahun] += a
            tot["bs_n"] += 1
            tot["dcf_n"] += k in dcf
            if nh:
                tot["nh"] += a
            if MUDA[0] <= th <= MUDA[1]:
                tot["muda"] += a
        if kl == "bd":
            tot["th"][th] += a
        c = pko.get(k)
        if c is None:
            tot["luar_ha"][kl] += a
        e = kec[pkec[k]] if k in pkec else None
        if e is not None:
            kb = kab.setdefault((e[0], e[1]), {"ha": Counter(), "n": Counter(), "luar_ha": Counter()})
            kb["ha"][kl] += a
            kb["n"][kl] += n
            if c is None:
                kb["luar_ha"][kl] += a
        if c is not None:
            p = per.setdefault(c, {"ha": Counter(), "n": Counter(), "asal": Counter(), "th": Counter(), "pem": Counter(),
                                   "kab": Counter(), "klaster": {}, "lag": Counter(), "nh": 0., "muda": 0., "bs_n": 0, "dcf_n": 0})
            p["ha"][kl] += a
            p["n"][kl] += n
            if kl in ("bs", "bd"):
                if kl == "bs":
                    p["asal"][asal] += a
                    p["pem"][pem] += a
                    p["lag"][th - tahun] += a
                    p["bs_n"] += 1
                    p["dcf_n"] += k in dcf
                    if nh:
                        p["nh"] += a
                    if MUDA[0] <= th <= MUDA[1]:
                        p["muda"] += a
                p["th"][th] += a
                if e is not None:
                    p["kab"][e[1]] += a
                lo, la = pusat(k)
                kk = (round(la / .02), round(lo / .02))
                q = p["klaster"].setdefault(kk, [0., 0., 0., Counter(), Counter()])
                q[4][th] += a
                q[0] += a
                q[1] += a * lo
                q[2] += a * la
                for b in range(12):
                    if v & (1 << b):
                        q[3][b] += 1
    return tot, per, kab


def ringkas_perusahaan(daftar, per, asal=ASAL, lag_maks=JENDELA):
    hasil = []
    for c, p in per.items():
        if p["ha"]["bs"] + p["ha"]["bd"] < 10 and p["ha"]["st"] < 50:
            continue
        e = daftar[c]
        jejak, titik = sum(p["ha"].values()), sum(p["n"].values())
        bs = p["ha"]["bs"]
        kl = sorted(p["klaster"].values(), key=lambda q: -q[0])[:5]
        hasil.append({
            "id": e["id"], "nama": e["nama"], "grup": e["grup"], "jenis": e["jenis"], "prov": e["prov"],
            "kab": [x for x, _ in p["kab"].most_common(3)] or ([e["kab"]] if e["kab"] else []),
            "luas_konsesi_ha": e["luas_ha"],
            "ha": {x: round(p["ha"][x], 1) for x in KELAS},
            "titik": {x: p["n"][x] for x in KELAS},
            "jejak_ha": round(jejak, 1), "bs_porsi": round(bs / jejak, 3) if jejak else 0,
            "titik_total": titik, "ha_per_titik": round(jejak / titik, 2) if titik else None,
            "lag_ha": {str(g): round(p["lag"][g], 1) for g in range(lag_maks + 1)},
            "bukan_hutan_sejak_2000_ha": round(p["nh"], 1),
            "muda_porsi": round(p["muda"] / bs, 3) if bs else 0,
            "descals_konfirm": round(p["dcf_n"] / p["bs_n"], 3) if p["bs_n"] else None,
            "asal": {x: round(p["asal"][x], 1) for x in asal if p["asal"][x]},
            "tahun_sawit": {str(t): round(p["th"][t], 1) for t in sorted(p["th"])},
            "pemilik_kebun": {x: round(h, 1) for x, h in p["pem"].items()},
            "contoh": [[round(q[2] / q[0], 4), round(q[1] / q[0], 4), round(q[0], 1), BULAN[q[3].most_common(1)[0][0]] if q[3] else None,
                        q[4].most_common(1)[0][0] if q[4] else None]
                       for q in kl],
        })
    hasil.sort(key=lambda r: -(r["ha"]["bs"] + r["ha"]["bd"]))
    return hasil


def analisis(tahun, descals_on=True):
    t0 = time.time()
    log(f"== analisis {tahun}")
    s = sampel(tahun)
    rows = baris(s)
    gav, tump_gav = gaveau(rows, tahun)
    dsc, dcf = {}, set()
    if descals_on:
        try:
            import sawit_peta as S
            S.uji()
            dcf = set(descals([k for k, h in gav.items() if h[0] == "bs" and k in s], 1, 9999))   # pengecekan silang, semua tahun
            log(f"  descals konfirmasi bs: {len(dcf)} sampel")
            if tahun == 2019:
                dsc = descals([k for k in s if k not in gav])
        except Exception as e:
            log("  descals dilewati:", repr(e))
    return susun(tahun, t0, s, gav, dsc, dcf, tump_gav)


def susun(tahun, t0, s, gav, dsc, dcf, tump_gav, asal=ASAL, lag_maks=JENDELA, jendela=None, berkas=None, extra=None, hapus=()):
    rows = baris(s)
    ko = baca_konsesi()
    pko, tump_ko, pasang = tetapkan(rows, [e["bagian"] for e in ko], [e["jenis"] for e in ko])
    kec = baca_kecamatan()
    pkec, _, _ = tetapkan(rows, [x[2] for x in kec])
    kec_ = [(x[0], x[1]) for x in kec]
    tot, per, kab = agregat(tahun, s, gav, dsc, ko, pko, kec_, pkec, dcf)
    pr = ringkas_perusahaan(ko, per, asal, lag_maks)
    kabl = []
    for (kode, nama), b in kab.items():
        if b["ha"]["bs"] + b["ha"]["bd"] + b["ha"]["st"] >= 10:
            kabl.append({"prov": kode, "kab": nama, "ha": {x: round(b["ha"][x], 1) for x in KELAS},
                         "titik": {x: b["n"][x] for x in KELAS}, "luar_konsesi_ha": {x: round(b["luar_ha"][x], 1) for x in ("bs", "bd", "st")}})
    kabl.sort(key=lambda r: -(r["ha"]["bs"] + r["ha"]["bd"]))
    prov = {}
    for (kode, _), b in kab.items():
        p = prov.setdefault(kode, {"ha": Counter(), "n": Counter()})
        p["ha"].update(b["ha"])
        p["n"].update(b["n"])
    provl = sorted(({"prov": k, "ha": {x: round(p["ha"][x], 1) for x in KELAS}, "titik": {x: p["n"][x] for x in KELAS}}
                    for k, p in prov.items()), key=lambda r: -(r["ha"]["bs"] + r["ha"]["bd"]))
    hasil = {
        "total": {"ha": {x: round(tot["ha"][x], 1) for x in KELAS}, "titik": {x: tot["n"][x] for x in KELAS},
                  "luar_konsesi_ha": {x: round(tot["luar_ha"][x], 1) for x in KELAS},
                  "asal_bs_ha": {x: round(tot["asal"][x], 1) for x in asal},
                  "tahun_sawit_ha": {str(t): round(h, 1) for t, h in sorted(tot["th"].items())},
                  "jejak_ha": round(sum(tot["ha"].values()), 1), "lag_ha": {str(g): round(tot["lag"][g], 1) for g in range(lag_maks + 1)},
                  "bukan_hutan_sejak_2000_ha": round(tot["nh"], 1), "muda_ha": round(tot["muda"], 1),
                  "descals_konfirm": round(tot["dcf_n"] / tot["bs_n"], 3) if tot["bs_n"] else None,
                  "pemilik_bs_ha": {x: round(h, 1) for x, h in tot["pem"].items()},
                  "sampel": len(s), "deteksi": sum(v >> 12 for v in s.values()),
                  "tumpang_poligon_gaveau": tump_gav, "tumpang_konsesi": tump_ko,
                  "tumpang_pasangan": {f"{a}+{b}": n for (a, b), n in pasang.items()},
                  "jendela_tahun": jendela or min(tahun + JENDELA, BATAS) - tahun + 1, "descals": bool(dsc),
                  "descals_konfirm_aktif": bool(dcf)},
        "perusahaan": pr, "kabupaten": kabl, "provinsi": provl,
        "detik": round(time.time() - t0),
    }
    hasil.update(extra or {})
    for r in [hasil["total"]] + hasil["perusahaan"]:
        for h_ in hapus:
            r.pop(h_, None)
    os.makedirs(ANTARA, exist_ok=True)
    json.dump(hasil, open(os.path.join(ANTARA, berkas or f"agregat_{tahun}.json"), "w"), separators=(",", ":"))
    log(f"  selesai {tahun}: {len(pr)} perusahaan, {len(kabl)} kab, total {hasil['total']['ha']}, {hasil['detik']} dtk")
    return hasil




# ---------------------------------------------------------------- TTM2024
def kelas_ttm(v, tahun):
    """kode TTM -> tuple seperti kelas_sampel: ('st'|'bs', asal, tahun_tanam, tipe, False). tahun_tanam 2015 = <=2015 (sudah sawit)."""
    import sawit_peta as S
    tipe, hutan, hilang, tanam = S.urai_kode(v)
    asal = ASAL_TTM[2] if not hutan else ASAL_TTM[0] if hilang >= tahun else ASAL_TTM[1]
    return ("st" if tanam < tahun else "bs", asal, tanam, tipe, False)


def kode_sampel(s):
    import sawit_peta as S
    t0 = time.time()
    kode = S.kode_ttm((k, *pusat(k)) for k in s)
    log(f"  ttm: {len(kode)} dari {len(s)} sampel bersawit 2024, {time.time() - t0:.0f} dtk")
    return kode


def analisis_ttm(tahun):
    """tahun api 2019/2023 dari TTM2024: st = tahun_tanam < tahun (YY=15 = <=2015 ikut), bs = tahun_tanam >= tahun, bk = bukan sawit 2024"""
    t0 = time.time()
    log(f"== analisis TTM {tahun}")
    s = sampel(tahun)
    kode = kode_sampel(s)
    gav = {k: kelas_ttm(v, tahun) for k, v in kode.items()}
    lag_maks = 2024 - tahun
    return susun(tahun, t0, s, gav, {}, (), 0, ASAL_TTM, lag_maks, lag_maks + 1, f"agregat_ttm_{tahun}.json",
                 {"sumber_peta": "TTM2024", "jendela_pendek": lag_maks < 2, "jendela_tahun_tanam": [tahun, 2024]},
                 hapus=("descals_konfirm", "bukan_hutan_sejak_2000_ha", "muda_porsi", "muda_ha"))


def konfirm_2015():
    """porsi sampel 'bakar lalu sawit' Gaveau 2015 per perusahaan yang di TTM bertahun_tanam 15..19 (`ttm_konfirm`; 15 = <=2015 ambigu)
    dan 16..19 saja (`ttm_konfirm_ketat`); tulis ke antara/agregat_2015.json tanpa menyentuh bagian lain (citra tetap)."""
    import sawit_peta as S
    s = sampel(2015)
    rows = baris(s)
    gav, _ = gaveau(rows, 2015)
    ko = baca_konsesi()
    pko, _, _ = tetapkan(rows, [e["bagian"] for e in ko], [e["jenis"] for e in ko])
    bs = [k for k, h in gav.items() if h[0] == "bs" and k in s]
    kode = kode_sampel({k: 1 for k in bs})
    per = defaultdict(lambda: [0, 0, 0, 0])
    for k in bs:
        c = pko.get(k)
        if c is None:
            continue
        t = S.urai_kode(kode[k])[3] if k in kode else 0
        q = per[ko[c]["id"]]
        q[0] += 1
        q[1] += 2015 <= t <= 2019
        q[2] += 2016 <= t <= 2019
        q[3] += t == 2015
    jalur = os.path.join(ANTARA, "agregat_2015.json")
    h = json.load(open(jalur))
    for p in h["perusahaan"]:
        q = per.get(p["id"])
        p["ttm_konfirm"] = round(q[1] / q[0], 3) if q and q[0] else None
        p["ttm_konfirm_ketat"] = round(q[2] / q[0], 3) if q and q[0] else None
        p["ttm_tanam15"] = round(q[3] / q[0], 3) if q and q[0] else None
    n = sum(q[0] for q in per.values())
    h["total"]["ttm_konfirm"] = round(sum(q[1] for q in per.values()) / n, 3) if n else None
    h["total"]["ttm_konfirm_ketat"] = round(sum(q[2] for q in per.values()) / n, 3) if n else None
    h["total"]["ttm_tanam15"] = round(sum(q[3] for q in per.values()) / n, 3) if n else None
    json.dump(h, open(jalur, "w"), separators=(",", ":"))
    log(f"  ttm_konfirm 2015: {h['total']['ttm_konfirm']} (ketat 16..19: {h['total']['ttm_konfirm_ketat']}, =15: {h['total']['ttm_tanam15']}) dari {n} sampel di konsesi")


# ---------------------------------------------------------------- citra bukti (Sentinel-2, SWIR)
AWAN_MAKS, TERANG = 15, .18     # tolak adegan dengan > 15% awan di kotak; piksel B2,B3,B4 semuanya > 0,18 dihitung awan
_awan = {}


def refl(it, landsat, k, lat, lon, km, n):
    """pantulan (float, None = tanpa data) kanal red/green/blue n*n piksel di kotak"""
    import citra as C, konsesi_citra as KC
    rb = (it["assets"][k].get("raster:bands") or [{}])[0]
    if landsat:
        v = baca_ls(it, k, lat, lon, km, n)[1]
        sk, of = rb.get("scale", 2.75e-5), rb.get("offset", -.2)
    else:
        c = C.COG(it["assets"][k]["href"])
        x0, y0, r0, kiri, atas = KC.jendela(it, k, lat, lon, km)
        v = c.contoh(C.level_untuk(c, r0, max(10, km * 1000 / n)), x0, y0, r0, kiri, atas, km * 1000, n)[0]
        sk, of = rb.get("scale", 1e-4), rb.get("offset", 0)
    return [d * sk + of if d else None for d in v]


def awan_nyata(it, landsat, lat, lon, km, n=60):
    """(% awan, % kosong) dari piksel kotak itu sendiri. Awan = bendera QA (Landsat QA_PIXEL bit 1 awan-dilasi, 3 awan, 4 bayangan;
    Sentinel-2 SCL 3/8/9/10) ATAU terang (B2,B3,B4 semuanya > 0,18: kabut/asap tebal yang tak diberi bendera). % awan dari piksel sah."""
    kunci = (it["id"], round(lat, 3), round(lon, 3), km)
    if kunci in _awan:
        return _awan[kunci]
    import citra as C, konsesi_citra as KC
    if landsat:
        H, W = it["properties"]["proj:shape"]
        x0, y0, r0, kiri, atas = jendela_ls(it, lat, lon, km)
        if not (x0 <= kiri and kiri + km * 1000 <= x0 + W * r0 and y0 - H * r0 <= atas - km * 1000 and atas <= y0):
            return 100, 100
        q = baca_ls(it, "qa_pixel", lat, lon, km, n)[1]
        bendera = [bool(v & 0b11010) for v in q]
        kosong = [bool(v & 1) for v in q]
    else:
        c = C.COG(it["assets"]["scl"]["href"])
        x0, y0, r0, kiri, atas = KC.jendela(it, "scl", lat, lon, km)
        q = c.contoh(0, x0, y0, r0, kiri, atas, km * 1000, n)[0]
        bendera = [v in (3, 8, 9, 10) for v in q]
        kosong = [v == 0 for v in q]
    ch = [refl(it, landsat, k, lat, lon, km, n) for k in ("red", "green", "blue")]
    sah = tang = 0
    for i in range(len(q)):
        if kosong[i] or any(c[i] is None for c in ch):
            kosong[i] = True
            continue
        sah += 1
        tang += bendera[i] or all(c[i] > TERANG for c in ch)
    _awan[kunci] = (round(100 * tang / sah) if sah else 100, round(100 * sum(kosong) / len(q)))
    return _awan[kunci]


def pilih(lat, lon, km, d1, d2, urut, mode, maks=30):
    """Sentinel-2 L2A di [d1, d2], urut 'asc'|'desc' menurut tanggal. mode 'pertama' = adegan layak pertama menurut urut,
    'bersih' = awan terendah. Layak = awan_nyata <= AWAN_MAKS dan kosong <= 30. -> (tgl, awan, item, koleksi) | None"""
    import citra as C
    for kol in ("sentinel-2-l2a", "sentinel-2-c1-l2a"):
        q = {"collections": [kol], "bbox": C.kotak(lat, lon, 2), "limit": 50, "query": {"eo:cloud_cover": {"lte": 85}},
             "datetime": f"{d1}T00:00:00Z/{d2}T23:59:59Z", "sortby": [{"field": "properties.datetime", "direction": urut}]}
        try:
            fs = json.loads(C.ambil(C.STAC, data=json.dumps(q).encode())).get("features", [])
        except Exception as e:
            log("   stac gagal", kol, repr(e)[:80])
            continue
        lihat, terbaik = set(), None
        for it in fs:
            tgl = it["properties"]["datetime"][:10]
            if tgl in lihat:
                continue
            lihat.add(tgl)
            if len(lihat) > maks:
                break
            try:
                aw, ksg = awan_nyata(it, False, lat, lon, km)
            except Exception:
                continue
            if ksg > 30 or aw > AWAN_MAKS:
                continue
            if mode == "pertama":
                return (tgl, aw, it, kol)
            if terbaik is None or (aw, tgl) < terbaik[:2]:
                terbaik = (aw, tgl, it, kol)
            if aw <= 2:
                break
        if terbaik:
            return (terbaik[1], terbaik[0], terbaik[2], terbaik[3])
    return None


# ---- Landsat 8/7 C2 L2 (Planetary Computer): satu-satunya citra 2015, Sentinel-2 belum ada di Indonesia
_tok = {}


def token_pc():
    """token SAS anonim (tanpa akun), dipakai ulang; URL aset = href + '?' + token. Catatan: koleksi 'landsat-c2-l2', bukan 'landsat-c2'."""
    if not _tok or time.time() - _tok["t"] > 1800:
        _tok.update(t=time.time(), v=json.loads(__import__("citra").ambil(PC_TOKEN))["token"])
    return "?" + _tok["v"]


def jendela_ls(it, lat, lon, km):
    """(x0, y0, res, kiri, atas) kotak km berpusat di titik, UTM adegan Landsat. Belahan selatan Landsat memakai zona UTM
    UTARA (EPSG 326xx) dengan northing negatif, tanpa false northing 10.000 km: kurangkan hasil ke_utm."""
    import citra as C
    P = it["properties"]
    epsg = P["proj:epsg"]
    E, N = C.ke_utm(lat, lon, epsg % 100)
    if lat < 0 and epsg < 32700:
        N -= 10_000_000
    tr = P["proj:transform"]
    return tr[2], tr[5], tr[0], E - km * 500, N + km * 500


def baca_ls(it, aset, lat, lon, km, n):
    import citra as C
    url = it["assets"][aset]["href"] + token_pc()
    c = C.COG(url, lambda a, b: C.ambil(url, (a, b), coba=7))   # Planetary Computer membatasi laju (429): ulang dengan jeda
    x0, y0, r0, kiri, atas = jendela_ls(it, lat, lon, km)
    return c, c.contoh(C.level_untuk(c, r0, max(r0, km * 1000 / n)), x0, y0, r0, kiri, atas, km * 1000, n)[0]


def adegan_ls(lat, lon, km, d1, d2, maks=10):
    """adegan Landsat bersih di kotak [(tgl, awan, kosong, item)]; hanya `maks` adegan dengan eo:cloud_cover terendah
    (<= 50) yang dicek lokal (QA + terang), supaya tidak menembus batas laju"""
    import citra as C
    q = {"collections": ["landsat-c2-l2"], "intersects": {"type": "Point", "coordinates": [lon, lat]}, "limit": 80,
         "datetime": f"{d1}T00:00:00Z/{d2}T23:59:59Z", "query": {"eo:cloud_cover": {"lte": 50}}}
    fs = [it for it in json.loads(C.ambil(PC_STAC, data=json.dumps(q).encode(), coba=6)).get("features", [])
          if it["properties"]["platform"] in ("landsat-8", "landsat-7")]
    fs.sort(key=lambda it: (it["properties"]["platform"] != "landsat-8", it["properties"]["eo:cloud_cover"]))
    hasil = []
    for it in fs[:maks]:
        try:
            aw, ks = awan_nyata(it, True, lat, lon, km)
        except Exception as e:
            log("   qa gagal", it["id"], repr(e)[:80])
            continue
        if aw <= AWAN_MAKS and ks <= 10:
            hasil.append((it["properties"]["datetime"][:10], aw, ks, it))
    return hasil


def pilih_ls(lat, lon, km, d1, d2, mode):
    """mode 'akhir' | 'awal' (adegan bersih terakhir/pertama di jendela, L8 dulu) | 'bersih' (awan lokal terendah).
    Bersih = awan_nyata <= AWAN_MAKS (QA + terang di kotak). -> {tgl, aw, it, sat} | None"""
    k = adegan_ls(lat, lon, km, d1, d2)
    for pf in ("landsat-8", "landsat-7"):
        c = [x for x in k if x[3]["properties"]["platform"] == pf]
        if c:
            x = min(c, key=lambda x: (x[1], x[0])) if mode == "bersih" else sorted(c, key=lambda x: x[0])[-1 if mode == "akhir" else 0]
            return {"tgl": x[0], "aw": x[1], "it": x[3], "sat": "Landsat " + pf.split("-")[-1]}
    return None


def pilih_s2(lat, lon, km, d1, d2):
    pil = pilih(lat, lon, km, d1, d2, "asc", "bersih")
    return {"tgl": pil[0], "aw": pil[1], "it": pil[2], "sat": "Sentinel-" + pil[2]["properties"].get("platform", "sentinel-2?").split("-")[-1].upper()} if pil else None


def foto_tahun(y, lat, lon, km, sesudah=None, ls=True):
    """foto terbaik tahun y: kemarau (Jun-Okt) dulu, lalu setahun penuh; Sentinel-2 (10 m) mulai 2017, sebelum itu Landsat.
    ls=False: Sentinel-2 saja (Landsat Planetary Computer lambat/429, tak perlu sesudah 2017). sesudah (date) = foto harus bertanggal SETELAH hari itu (foto kebun tidak boleh lebih awal dari api); jendela dipotong, kosong -> lewati"""
    for d1, d2 in ((f"{y}-06-01", f"{y}-10-31"), (f"{y}-01-01", f"{y}-12-31")):
        if sesudah:
            d1 = max(d1, (sesudah + dt.timedelta(days=1)).isoformat())
            if d1 > d2:
                continue
        pil = (pilih_s2(lat, lon, km, d1, d2) if y >= 2017 else None) or (pilih_ls(lat, lon, km, d1, d2, "bersih") if ls else None)
        if pil:
            return pil
    return None


# ---- foto warna asli (true color), peregangan SAMA untuk keempat foto: pantulan 0..GAIN, gamma
GAIN, GAMMA = .20, 1.5   # hipotesis tampilan, belum diuji balik


def ke_byte_tc(v, sk, of):
    return array("B", (0 if d == 0 else int(255 * min(1., max(0., (d * sk + of) / GAIN)) ** (1 / GAMMA)) for d in v))


def rgb_foto(pil, lat, lon, km, n):
    """3 array 0..255 (n*n): red, green, blue Landsat (SR_B4/B3/B2 untuk L8) atau Sentinel-2 (B04/B03/B02)"""
    import citra as C, konsesi_citra as KC
    it, ch = pil["it"], []
    for k in ("red", "green", "blue"):
        rb = (it["assets"][k].get("raster:bands") or [{}])[0]
        if pil["sat"].startswith("Landsat"):
            ch.append(ke_byte_tc(baca_ls(it, k, lat, lon, km, n)[1], rb.get("scale", 2.75e-5), rb.get("offset", -.2)))
        else:
            c = C.COG(it["assets"][k]["href"])
            x0, y0, r0, kiri, atas = KC.jendela(it, k, lat, lon, km)
            v = c.contoh(C.level_untuk(c, r0, max(10, km * 1000 / n)), x0, y0, r0, kiri, atas, km * 1000, n)[0]
            ch.append(ke_byte_tc(v, rb.get("scale", 1e-4), rb.get("offset", 0)))
    return ch


def simpan_set(foto, n=320):
    """foto = {berkas: 3 array n*n}. Satu px untuk semuanya: turun (n, 5/6, 2/3, 1/2) sampai semua PNG <= MAKS_PNG"""
    import citra as C
    for m in (n, n * 5 // 6, n * 2 // 3, n // 2):
        png = {}
        for f, a in foto.items():
            rgb = a if m == n else [array("B", (c[int(i * n / m) * n + int(j * n / m)] for i in range(m) for j in range(m))) for c in a]
            png[f] = C.png(rgb, m, MAKS_PNG)
        if all(len(b) <= MAKS_PNG for b in png.values()):
            break
    for f, b in png.items():
        open(f, "wb").write(b)
    return m


_api = {}
_kunci_api = __import__("threading").Lock()


def api_klaster(lat, lon, r=.03, tahun=2015):
    """tanggal WIB titik VIIRS tahun itu (type 0, n/h) dalam +-r derajat dari pusat klaster: {pertama, puncak, terakhir, titik}"""
    with _kunci_api:   # tiga utas citra: bangun sekali, jangan ganda
      if tahun not in _api:
        _api_ = {}
        for row in csv.DictReader(open(os.path.join(DIR, f"viirs_{tahun}.csv"))):
            if row["type"] != "0" or row["confidence"] not in ("n", "h"):
                continue
            t = dt.datetime.fromisoformat(row["acq_date"]) + dt.timedelta(hours=int(row["acq_time"]) // 100 + 7, minutes=int(row["acq_time"]) % 100)
            _api_.setdefault((round(float(row["latitude"]) / .05), round(float(row["longitude"]) / .05)), []).append(
                (float(row["latitude"]), float(row["longitude"]), t.date()))
        _api[tahun] = _api_
    _api_ = _api[tahun]
    tgl = Counter(d for la0 in range(round((lat - r) / .05), round((lat + r) / .05) + 1)
                  for lo0 in range(round((lon - r) / .05), round((lon + r) / .05) + 1)
                  for la, lo, d in _api_.get((la0, lo0), ()) if abs(la - lat) <= r and abs(lo - lon) <= r)
    if not tgl:
        return None
    return {"pertama": min(tgl).isoformat(), "puncak": tgl.most_common(1)[0][0].isoformat(), "terakhir": max(tgl).isoformat(), "titik": sum(tgl.values())}


TAHAP_TERBAKAR = ((1, 60), (61, 120), (121, 200), (201, 275))


def citra_satu(p):
    """4 foto warna asli 2015 satu perusahaan, bbox dan px sama: sebelum (terakhir bersih sebelum api pertama klaster),
    terbakar (bersih paling awal sesudah api terakhir), kebun1 dan kebun2 (tahun sawit muncul menurut Gaveau, dan tahun sesudahnya;
    bila berawan, tahun berikutnya). -> (citra, api) ; berkas ke public/data/konsesi2026/riwayat"""
    if not p["contoh"]:
        return None, None
    lat, lon, _, _, ty = p["contoh"][0]
    km = 6
    api = api_klaster(lat, lon)
    if not api:
        return None, None
    d0, d1 = dt.date.fromisoformat(api["pertama"]), dt.date.fromisoformat(api["terakhir"])
    pil = {"sebelum": pilih_ls(lat, lon, km, "2015-01-01", (d0 - dt.timedelta(days=1)).isoformat(), "akhir") if d0 > dt.date(2015, 1, 15) else None}
    pil["sebelum"] = pil["sebelum"] or pilih_ls(lat, lon, km, "2014-06-01", "2014-10-31", "akhir")
    pil["terbakar"] = None
    for a, b in TAHAP_TERBAKAR:   # jendela bertahap, maks 9 bulan sesudah api terakhir; kosong lebih baik daripada foto awan
        pil["terbakar"] = pilih_ls(lat, lon, km, (d1 + dt.timedelta(days=a)).isoformat(), (d1 + dt.timedelta(days=b)).isoformat(), "awal")
        if pil["terbakar"]:
            break
    y1 = max(ty or 2016, 2016)
    pil["kebun1"] = foto_tahun(y1, lat, lon, km)
    pil["kebun2"] = foto_tahun(y1 + 1, lat, lon, km) or foto_tahun(y1 + 2, lat, lon, km)
    if pil["kebun1"] and pil["terbakar"] and pil["kebun1"]["tgl"] == pil["terbakar"]["tgl"]:   # sawit 2015/2016: jangan ulang foto terbakar
        pil["kebun1"] = foto_tahun(y1 + 1, lat, lon, km)
        pil["kebun2"] = foto_tahun(y1 + 2, lat, lon, km)
    pil = {k: v for k, v in pil.items() if v}
    if not pil:
        return None, api
    nama = {k: f"{p['id']}_riwayat2015_{k}_{v['tgl'].replace('-', '')}.png" for k, v in pil.items()}
    os.makedirs(TERBIT_CITRA, exist_ok=True)
    jalur = {k: os.path.join(TERBIT_CITRA, f) for k, f in nama.items()}
    px = None
    if not all(os.path.exists(j) for j in jalur.values()):
        px = simpan_set({jalur[k]: rgb_foto(v, lat, lon, km, 320) for k, v in pil.items()})
    px = px or struct.unpack(">I", open(next(iter(jalur.values())), "rb").read(24)[16:20])[0]   # berkas sudah ada: lebar dari IHDR
    hasil = {"bbox": __import__("citra").kotak(lat, lon, km), "pusat": [lat, lon], "px": px}
    for k in ("sebelum", "terbakar", "kebun1", "kebun2"):
        v = pil.get(k)
        hasil[k] = {"f": f"konsesi2026/riwayat/{nama[k]}", "tgl": v["tgl"], "satelit": v["sat"], "awan": v["aw"],
                    **({"tahun_sawit": ty} if k.startswith("kebun") else {})} if v else None
    return hasil, api


def s2_dict(pil):
    return {"tgl": pil[0], "aw": pil[1], "it": pil[2], "sat": "Sentinel-" + pil[2]["properties"].get("platform", "sentinel-2?").split("-")[-1].upper()} if pil else None


def citra_ttm_satu(p, tahun):
    """4 foto warna asli Sentinel-2 untuk api `tahun` (TTM): sebelum, terbakar, kebun1, kebun2. Awan_nyata <= 15%, kosong bila tak ada.
    Berkas ke CITRA_TTM. -> (citra, api)"""
    if not p["contoh"]:
        return None, None
    lat, lon, _, _, ty = p["contoh"][0]
    km = 6
    api = api_klaster(lat, lon, tahun=tahun)
    if not api:
        return None, None
    d0, d1 = dt.date.fromisoformat(api["pertama"]), dt.date.fromisoformat(api["terakhir"])
    dd = lambda d, n: (d + dt.timedelta(days=n)).isoformat()
    pil = {"sebelum": None, "terbakar": None}
    for a, b in ((150, 1), (330, 151)):
        pil["sebelum"] = s2_dict(pilih(lat, lon, km, dd(d0, -a), dd(d0, -b), "desc", "pertama"))
        if pil["sebelum"]:
            break
    for a, b in TAHAP_TERBAKAR:
        pil["terbakar"] = s2_dict(pilih(lat, lon, km, dd(d1, a), dd(d1, b), "asc", "pertama"))
        if pil["terbakar"]:
            break
    # kebun1/kebun2: foto kebun hanya SESUDAH api terakhir dan sesudah foto terbakar; tak ada yang bersih -> None
    sesudah = max(d1, dt.date.fromisoformat(pil["terbakar"]["tgl"])) if pil["terbakar"] else d1
    y1 = 2024 if tahun >= 2023 else min(max(ty or tahun, tahun), 2025)
    pil["kebun1"] = pil["kebun2"] = None
    for y in range(y1, min(y1 + 3, 2027)):
        pil["kebun1"] = foto_tahun(y, lat, lon, km, sesudah, ls=False)
        if pil["kebun1"]:
            break
    if pil["kebun1"]:
        yk = int(pil["kebun1"]["tgl"][:4])
        k2 = [x for x in (foto_tahun(y, lat, lon, km, dt.date.fromisoformat(pil["kebun1"]["tgl"]), ls=False) for y in (yk + 1, yk + 2)) if x]
        pil["kebun2"] = k2[0] if tahun < 2023 else (min(k2, key=lambda x: (x["aw"], x["tgl"])) if k2 else None)
    pil = {k: v for k, v in pil.items() if v}
    if not pil:
        return None, api
    os.makedirs(CITRA_TTM, exist_ok=True)
    nama = {k: f"{p['id']}_ttm{tahun}_{k}_{v['tgl'].replace('-', '')}.png" for k, v in pil.items()}
    jalur = {k: os.path.join(CITRA_TTM, f) for k, f in nama.items()}
    px = None
    if not all(os.path.exists(j) for j in jalur.values()):
        px = simpan_set({jalur[k]: rgb_foto(v, lat, lon, km, 320) for k, v in pil.items()})
    px = px or struct.unpack(">I", open(next(iter(jalur.values())), "rb").read(24)[16:20])[0]
    hasil = {"bbox": __import__("citra").kotak(lat, lon, km), "pusat": [lat, lon], "px": px, "tahun_tanam_dominan": ty}
    for k in ("sebelum", "terbakar", "kebun1", "kebun2"):
        v = pil.get(k)
        hasil[k] = {"f": nama[k], "tgl": v["tgl"], "satelit": v["sat"], "awan": v["aw"]} if v else None
    return hasil, api


def citra_ttm(tahun, top=TOP_TERBIT, hanya=None):
    from concurrent.futures import ThreadPoolExecutor
    jalur = os.path.join(ANTARA, f"agregat_ttm_{tahun}.json")
    h = json.load(open(jalur))
    pilih_ = sorted((p for p in h["perusahaan"] if layak(p)), key=lambda p: -p["ha"]["bs"])[:top]
    pilih_ = [p for p in pilih_ if not hanya or p["id"] in hanya]
    sudah = [p for p in pilih_ if p.get("citra") or p.get("api")] if not hanya else []
    pilih_ = [p for p in pilih_ if p not in sudah]   # dapat dilanjut: yang sudah dicoba (citra atau api terisi) dilewati   # --id a,b: ulang hanya perusahaan itu
    api_klaster(0, 0, tahun=tahun)   # muat arsip api sekali sebelum utas

    def kerja(p):
        try:
            return citra_ttm_satu(p, tahun)
        except Exception as e:
            log("  citra gagal", p["nama"], repr(e)[:120])
            return None, None
    with ThreadPoolExecutor(10) as ex:
        for p, (c, api) in zip(pilih_, ex.map(kerja, pilih_)):
            p["citra"], p["api"] = c, api
            json.dump(h, open(jalur, "w"), separators=(",", ":"))   # simpan tiap perusahaan: bisa dilanjut
            log(f"  citra ttm{tahun} {p['nama']}: " + (", ".join(f"{k}={c[k]['tgl'] + '/' + str(c[k]['awan']) if c[k] else '-'}" for k in ('sebelum', 'terbakar', 'kebun1', 'kebun2')) if c else "tidak ada"))
    json.dump(h, open(jalur, "w"), separators=(",", ":"))


def layak(p):
    return p["ha"]["bs"] >= BS_MIN and p["bs_porsi"] >= PORSI_MIN


def citra(tahun=TAHUN_TERBIT, top=TOP_TERBIT):
    from concurrent.futures import ThreadPoolExecutor
    jalur = os.path.join(ANTARA, f"agregat_{tahun}.json")
    h = json.load(open(jalur))
    pilih_ = sorted((p for p in h["perusahaan"] if layak(p)), key=lambda p: -p["ha"]["bs"])[:top]

    def kerja(p):
        try:
            return citra_satu(p)
        except Exception as e:
            log("  citra gagal", p["nama"], repr(e)[:120])
            return None, None
    with ThreadPoolExecutor(3) as ex:
        for p, (c, api) in zip(pilih_, ex.map(kerja, pilih_)):
            p["citra"], p["api"] = c, api
            log(f"  citra {tahun} {p['nama']}: " + (", ".join(f"{k}={c[k]['tgl'] if c[k] else '-'}" for k in ('sebelum', 'terbakar', 'kebun1', 'kebun2')) + f" px={c['px']} api={api['pertama']}..{api['terakhir']}" if c else "tidak ada"))
    json.dump(h, open(jalur, "w"), separators=(",", ":"))


# ---------------------------------------------------------------- tulis
CATATAN = [
    "INDIKASI, bukan bukti siapa membakar: tumpang-tindih ruang-waktu antara titik panas, perubahan lahan, dan konsesi tidak menunjukkan pelaku; lahan dapat dibuka pihak lain atau dijual sebelum ditanami.",
    "Luas = luas di bawah jejak titik VIIRS (scan x track, sampel kisi ~125 m), BUKAN luas bakar terpeta; melebihi untuk api kecil dan sedikit menurun untuk api besar yang tak terdeteksi tiap lintasan.",
    "Gaveau dkk. 2022 hanya memuat poligon lahan yang menjadi sawit s.d. 2019: lahan yang ditanami sesudah 2019 tidak tampak. Untuk 2019 jendela hanya satu tahun (F2019), jadi 'bakar lalu sawit' 2019 dari Gaveau sangat kurang (2019 terbit dari TTM2024, bukan dari Gaveau); ditambah Descals dkk. 2024 (tahun persiapan lahan 2019-2021) di luar poligon Gaveau.",
    "Tahun tanam Descals = tahun persiapan lahan terakhir; penanaman ulang kebun tua ikut terhitung, sehingga kelas Descals dapat memuat peremajaan.",
    "Konsesi KLHK/GFW bertanggal ~2014-2019 dan tidak lengkap; izin berubah. 'Di luar konsesi terpetakan' bukan berarti tanpa izin. Konsesi yang tumpang-tindih: yang pertama menang (urutan sawit, hti, hph).",
    "Sampel dikelompokkan sebagai Forest/Non Forest/ITP menurut kelas lahan Gaveau pada tahun sebelum api; 'ITP' = hutan tanaman industri. Kelas 'bukan sawit' mencakup lahan yang tak pernah jadi sawit sampai 2019.",
    "Hanya deteksi VIIRS type 0 (api vegetasi) keyakinan nominal/tinggi; sumber api bukan vegetasi dan keyakinan rendah dibuang. Titik palsu statis tidak disaring tersendiri.",
    "Citra 2015: Foto warna asli (red/green/blue, peregangan sama): Landsat 8/7 Collection 2 Level-2 dari Microsoft Planetary Computer untuk sebelum 2017 (Sentinel-2 belum ada di Indonesia), Sentinel-2 L2A (10 m) mulai 2017; tahun foto kebun mengikuti tahun sawit muncul menurut Gaveau. Landsat courtesy of USGS.",
]
BATAS_TERBIT = [
    "Luas adalah luas jejak titik panas VIIRS, sekitar 2,5 kali luas terbakar resmi 2015 (2,61 juta ha): pakai untuk membandingkan perusahaan, bukan sebagai luas pasti.",
    "'Bukan hutan' berarti lahan itu tidak pernah berupa hutan sejak 2000 menurut peta Gaveau, bukan berarti hutan yang dibuka.",
    "Peta sawit lain (Descals dkk. 2024) hanya mengonfirmasi sebagian lahan yang dihitung di sini; dua peta itu berbeda, sehingga kolom 'descals_konfirm' adalah pengecekan, bukan penentu.",
    "Jeda 0 tahun (sawit tercatat pada tahun api itu juga) bisa berarti lahan sudah ditanam sebelum api; jeda 3 sampai 4 tahun lebih mendukung urutan dibakar lalu ditanam.",
    "Peta konsesi KLHK bertanggal sekitar 2014 dan sebagian tumpang tindih; batas dan pemegang izin bisa sudah berubah. Lahan di luar konsesi terpetakan tidak masuk daftar ini.",
    "Tahun sawit 2016 sampai 2018 lebih tak pasti (kolom 'muda_porsi'); hanya poligon sawit sampai 2019 yang terpetakan.",
    "Indikasi, bukan bukti pelaku: tumpang tindih lokasi dan waktu tidak menunjukkan siapa yang membakar atau menanam.",
]


def grup_peta():
    """{id poligon: grup} dari konsesi2026/*.json (sudah diperkaya WALHI/Greenpeace)"""
    import glob
    m = {}
    for fn in glob.glob(os.path.join(AKAR, "public/data/konsesi2026/[0-9]*.json")):
        for p in json.load(open(fn))["perusahaan"]:
            if p.get("grup"):
                m[p["id"]] = p["grup"]
    return m


def terbit(h, PROVINSI):
    """sawit_riwayat.json (kecil) dari agregat 2015: perusahaan layak, urut bs_ha; citra hanya 15 teratas"""
    t = h["total"]
    grup = grup_peta()
    gp = json.load(open(os.path.join(AKAR, "data/raw/konsesi/grup_perusahaan.json"))).get("perusahaan", {}) \
        if os.path.exists(os.path.join(AKAR, "data/raw/konsesi/grup_perusahaan.json")) else {}
    daftar = []
    for p in sorted((p for p in h["perusahaan"] if layak(p)), key=lambda p: -p["ha"]["bs"]):
        daftar.append({
            "id": p["id"], "nama": p["nama"], "grup": grup.get(p["id"]) or p["grup"] or (gp.get(p["nama"]) or {}).get("grup") or "",
            "jenis": p["jenis"], "prov": PROVINSI.get(p["prov"], p["prov"]), "kab": p["kab"],
            "jejak_ha": round(p["jejak_ha"]), "bs_ha": round(p["ha"]["bs"]), "bs_porsi": p["bs_porsi"], "st_ha": round(p["ha"]["st"]),
            "asal_ha": {x: round(p["asal"].get(x, 0)) for x in ASAL}, "bukan_hutan_sejak_2000_ha": round(p["bukan_hutan_sejak_2000_ha"]),
            "lag_ha": {g: round(v) for g, v in p["lag_ha"].items()}, "descals_konfirm": p["descals_konfirm"], "muda_porsi": p["muda_porsi"],
            "titik": p["titik_total"], "ha_per_titik": p["ha_per_titik"], "lokasi": p["contoh"][0][:2] if p["contoh"] else None,
            "api": p.get("api"), "tahun_sawit": p["contoh"][0][4] if p["contoh"] else None,
            "citra": {k: p["citra"].get(k) for k in ("sebelum", "terbakar", "kebun1", "kebun2")} | {"bbox": p["citra"]["bbox"], "px": p["citra"]["px"]} if p.get("citra") else None})
    jb = sum(t["ha"].values())
    return {
        "dibuat": dt.date.today().isoformat(), "tahun": TAHUN_TERBIT,
        "metode": "Titik panas satelit VIIRS 2015 dicocokkan dengan peta kebun sawit (Gaveau dkk. 2022) dan peta konsesi KLHK. "
                  "Lahan yang terbakar pada 2015, belum sawit tahun sebelumnya, lalu tercatat sawit dalam lima tahun disebut 'bakar lalu sawit'. "
                  "Ini indikasi dari tumpang tindih lokasi dan waktu, bukan bukti siapa yang membakar.",
        "sumber": SUMBER + [SUMBER_DESCALS, "Landsat 8/7 Collection 2 Level-2, courtesy of the U.S. Geological Survey, lewat Microsoft Planetary Computer."],
        "batas": BATAS_TERBIT,
        "total2015": {"jejak_ha": round(jb), "luas_resmi_ha": LUAS_RESMI_2015, "rasio_luas_resmi": round(jb / LUAS_RESMI_2015, 2),
                      "bs_ha": round(t["ha"]["bs"]), "bs_porsi": round(t["ha"]["bs"] / jb, 3), "st_ha": round(t["ha"]["st"]),
                      "bs_di_konsesi_ha": round(t["ha"]["bs"] - t["luar_konsesi_ha"]["bs"]),
                      "asal_ha": {x: round(t["asal_bs_ha"].get(x, 0)) for x in ASAL},
                      "bukan_hutan_sejak_2000_ha": round(t["bukan_hutan_sejak_2000_ha"]),
                      "lag_ha": {g: round(v) for g, v in t["lag_ha"].items()}, "descals_konfirm": t["descals_konfirm"],
                      "muda_porsi": round(t["muda_ha"] / t["ha"]["bs"], 3) if t["ha"]["bs"] else 0,
                      "titik": sum(t["titik"].values()), "perusahaan_terbit": len(daftar), "bs_ha_terbit": sum(d["bs_ha"] for d in daftar)},
        "perusahaan": daftar}


BATAS_TTM = [
    "Indikasi, bukan bukti pelaku: tumpang tindih lokasi dan waktu tidak menunjukkan siapa yang membakar atau menanam.",
    "Luas adalah luas jejak titik panas VIIRS, bukan luas terbakar terpeta: pakai untuk membandingkan perusahaan, bukan sebagai luas pasti.",
    "Hanya sawit yang masih ada pada 2024 terlihat: lahan yang dibuka lalu tidak menjadi sawit sampai 2024 tidak masuk hitungan.",
    "Peta The TreeMap memberi tahun tanam paling awal 2015; kode itu berarti 2015 atau sebelumnya, jadi lahan itu dihitung sudah sawit sebelum api.",
    "Jeda 0 tahun (sawit tercatat pada tahun api itu juga) bisa berarti lahan sudah ditanam sebelum api.",
    "Peta konsesi KLHK bertanggal sekitar 2014 dan sebagian tumpang tindih; batas dan pemegang izin bisa sudah berubah.",
]
BATAS_TTM_2023 = "Jendela hanya 0 sampai 1 tahun (api 2023, peta sampai 2024): angka bakar lalu sawit cenderung lebih rendah dari kenyataan."


def terbit_ttm(h, tahun, PROVINSI):
    """sawit_riwayat_<tahun>.json dari agregat TTM: kontrak sama dengan 2015 (perusahaan layak, urut bs_ha) + jendela, lisensi"""
    t, grup = h["total"], grup_peta()
    r = lambda d, ks: {x: round(d.get(x, 0)) for x in ks}
    lag = [str(i) for i in range(h["total"]["jendela_tahun"])]
    daftar = []
    for p in sorted((p for p in h["perusahaan"] if layak(p)), key=lambda p: -p["ha"]["bs"]):
        c = p.get("citra")
        daftar.append({
            "id": p["id"], "nama": p["nama"], "grup": grup.get(p["id"]) or p["grup"] or "", "jenis": p["jenis"],
            "prov": PROVINSI.get(p["prov"], p["prov"]), "kab": p["kab"], "jejak_ha": round(p["jejak_ha"]), "bs_ha": round(p["ha"]["bs"]),
            "bs_porsi": p["bs_porsi"], "st_ha": round(p["ha"]["st"]), "asal_ha": r(p["asal"], ASAL_TTM), "lag_ha": r(p["lag_ha"], lag),
            "pemilik_ha": r(p["pemilik_kebun"], ("industri", "rakyat")), "titik": p["titik_total"],
            "lokasi": p["contoh"][0][:2] if p["contoh"] else None, "api": p.get("api"),
            "tahun_sawit": int(max(p["tahun_sawit"], key=p["tahun_sawit"].get)) if p["tahun_sawit"] else None,
            "citra": {k: ({**c[k], "f": "konsesi2026/riwayat/" + c[k]["f"]} if c.get(k) else None) for k in ("sebelum", "terbakar", "kebun1", "kebun2")}
                     | {"bbox": c["bbox"], "px": c["px"]} if c else None})
    jb = t["jejak_ha"]
    return {
        "dibuat": dt.date.today().isoformat(), "tahun": tahun, "sumber_peta": "ttm", "jendela_tahun": [tahun, 2024], "jendela_pendek": bool(h["jendela_pendek"]),
        "metode": f"Titik panas satelit VIIRS {tahun} dicocokkan dengan peta tahun tanam sawit The TreeMap 2024 dan peta konsesi KLHK. "
                  f"Lahan yang terbakar pada {tahun}, belum sawit sebelum api, lalu tercatat sawit pada {tahun} sampai 2024 disebut 'bakar lalu sawit'. "
                  "Ini indikasi dari tumpang tindih lokasi dan waktu, bukan bukti siapa yang membakar.",
        "sumber": [SUMBER_TTM, "NASA FIRMS VIIRS S-NPP 375 m, deteksi api vegetasi dengan keyakinan nominal dan tinggi.",
                   "KLHK/Global Forest Watch: peta konsesi sawit, HTI, dan HPH.",
                   f"Contains modified Copernicus Sentinel data {tahun - 1} sampai 2025 (Sentinel-2 L2A, lewat Earth Search)."],
        "lisensi": "CC BY-NC 4.0 (The TreeMap): bukan untuk penggunaan komersial",
        "batas": BATAS_TTM + ([BATAS_TTM_2023] if h["jendela_pendek"] else []),
        "total": {"jejak_ha": round(jb), "bs_ha": round(t["ha"]["bs"]), "bs_porsi": round(t["ha"]["bs"] / jb, 3), "st_ha": round(t["ha"]["st"]),
                  "bs_di_konsesi_ha": round(t["ha"]["bs"] - t["luar_konsesi_ha"]["bs"]), "asal_ha": r(t["asal_bs_ha"], ASAL_TTM),
                  "lag_ha": r(t["lag_ha"], lag), "pemilik_ha": r(t["pemilik_bs_ha"], ("industri", "rakyat")), "titik": sum(t["titik"].values()),
                  "perusahaan_terbit": len(daftar), "bs_ha_terbit": sum(d["bs_ha"] for d in daftar)},
        "perusahaan": daftar}


def salin_png(daftar, tahun):
    """salin hanya PNG yang direferensikan ke TERBIT_CITRA; PNG <tahun>_ttm lama yang tak dipakai lagi dibuang dari folder publik"""
    import shutil
    os.makedirs(TERBIT_CITRA, exist_ok=True)
    pakai = set()
    for d in daftar:
        for k in ("sebelum", "terbakar", "kebun1", "kebun2"):
            v = (d["citra"] or {}).get(k)
            if v:
                n = os.path.basename(v["f"])
                shutil.copyfile(os.path.join(CITRA_TTM, n), os.path.join(TERBIT_CITRA, n))
                pakai.add(n)
    for n in os.listdir(TERBIT_CITRA):
        if f"_ttm{tahun}_" in n and n not in pakai:
            os.remove(os.path.join(TERBIT_CITRA, n))
    return pakai


def tulis():
    ada_ = {}
    for t in TAHUN:
        p = os.path.join(ANTARA, f"agregat_{t}.json")
        if os.path.exists(p):
            ada_[str(t)] = json.load(open(p))
    from wilayah import PROVINSI
    ttm = {}
    for t in TAHUN_TTM:
        p = os.path.join(ANTARA, f"agregat_ttm_{t}.json")
        if os.path.exists(p):
            ttm[str(t)] = json.load(open(p))
    for v in list(ada_.values()) + list(ttm.values()):
        for r in v["kabupaten"] + v["provinsi"]:
            r["nama_prov"] = PROVINSI.get(r["prov"], r["prov"])
        for r in v["perusahaan"]:
            r["nama_prov"] = PROVINSI.get(r["prov"], r["prov"])
    desc = any(v["total"].get("descals") or v["total"].get("descals_konfirm_aktif") for v in ada_.values())
    out = {"dibuat": dt.date.today().isoformat(),
           "metode": "VIIRS 375 m dikisi ~125 m per tahun api; tiap sampel dicocokkan ke poligon sawit Gaveau 2022 (kelas lahan tahun sebelum api dan lima tahun sesudahnya), konsesi KLHK, dan kecamatan. 'bakar lalu sawit' = bukan sawit tahun sebelum api lalu sawit dalam 5 tahun (s.d. 2019); 'sawit terbakar' = sudah sawit tahun sebelum api.",
           "kelas": {"bs": "bakar lalu sawit (Gaveau)", "bd": "bakar lalu sawit 2019-2021 (Descals, 2019 saja)", "st": "sawit terbakar (sudah sawit saat api)", "bk": "bukan sawit s.d. 2019"},
           "sumber": SUMBER + ([SUMBER_DESCALS] if desc else []),
           "catatan_batas": CATATAN,
           "tidak_terbit_dari_gaveau": {"2019": "jendela 1 tahun (hanya F2019): 'bakar lalu sawit' sangat kurang; 2019 dan 2023 terbit dari TTM2024"},
           "tahun": ada_}
    if ttm:
        out["ttm"] = {
            "sumber": SUMBER_TTM, "lisensi": "CC BY-NC 4.0; terbit 22 Okt 2026 (situs nonkomersial, atribusi wajib tampil)",
            "metode": "Tahun api 2019 dan 2023 dengan tahun tanam dari TTM2024 (kode ABFFYY, ~10 m) pada piksel titik sampel 125 m. 'st' = tahun_tanam < tahun api (YY=15 = <=2015 ikut); 'bs' = tahun_tanam >= tahun api (jendela 0..2024-tahun api); 'bk' = bukan sawit 2024. Asal bs: hutan primer saat api / sudah hilang sebelum api / bukan hutan primer 2000.",
            "kelas": {"bs": "bakar lalu sawit (TTM)", "st": "sawit terbakar", "bk": "bukan sawit 2024"},
            "catatan": ["Hanya sawit yang masih ada pada 2024 terlihat: kebun yang sudah dibuka tetapi bukan sawit 2024 tidak masuk.",
                        "Tahun tanam TTM 15 = 2015 atau sebelumnya (ambigu); 2023 hanya berjendela 0..1 tahun (jendela pendek): bakar lalu sawit 2023 sangat kurang.",
                        "Tahun hilang hutan hanya untuk hutan primer 2000; 'hutan primer saat api' memakai tahun_hilang >= tahun api (tahun yang sama ambigu)."],
            "tahun": ttm}
    with open(KELUAR, "w") as f:
        json.dump(out, f, separators=(",", ":"), ensure_ascii=False)
    log(f"{KELUAR}: {os.path.getsize(KELUAR) / 1e6:.2f} MB")
    if str(TAHUN_TERBIT) in ada_:
        with open(TERBIT, "w") as f:
            json.dump(terbit(ada_[str(TAHUN_TERBIT)], PROVINSI), f, separators=(",", ":"), ensure_ascii=False)
        log(f"{TERBIT}: {os.path.getsize(TERBIT) / 1e3:.0f} KB")
    for t in TAHUN_TERBIT_TTM:
        if str(t) in ttm:
            d = terbit_ttm(ttm[str(t)], t, PROVINSI)
            pk = salin_png(d["perusahaan"], t)
            jalur = TERBIT.replace("sawit_riwayat.json", f"sawit_riwayat_{t}.json")
            with open(jalur, "w") as f:
                json.dump(d, f, separators=(",", ":"), ensure_ascii=False)
            log(f"{jalur}: {os.path.getsize(jalur) / 1e3:.0f} KB, {len(d['perusahaan'])} perusahaan, bs {d['total']['bs_ha_terbit']} ha, {len(pk)} PNG")


# ---------------------------------------------------------------- ringkasan internal
def akurasi_xlsx():
    """ringkasan akurasi validasi TTM dari xlsx (zip XML, stdlib): [(kelas, UA, PA)] dan OA. Tak ada berkas -> []"""
    import xml.etree.ElementTree as ET
    N = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    jalur = os.path.join(DIR, "ttm2024/Validation_LandCoverChange_8classes.xlsx")
    if not os.path.exists(jalur):
        return []
    z = zipfile.ZipFile(jalur)
    ss = ["".join(t.text or "" for t in si.iter(N + "t")) for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall(N + "si")]
    hasil = []
    for row in ET.fromstring(z.read("xl/worksheets/sheet5.xml")).iter(N + "row"):
        v = [ss[int(c.find(N + "v").text)] if c.get("t") == "s" else c.find(N + "v").text for c in row if c.find(N + "v") is not None]
        if len(v) >= 4 and v[0].startswith("Class "):
            hasil.append((v[1], v[2], v[3]))
    return hasil


def ringkas():
    out = ["# Sawit terbakar dan bakar-lalu-sawit, api 2019 dan 2023 (TTM2024) - INTERNAL, belum terbit", "",
           "Sumber peta: " + SUMBER_TTM + " Titik panas: VIIRS S-NPP 375 m (type 0, n/h), kisi 125 m, konsesi KLHK/GFW (sama dengan 2015).",
           "INDIKASI, bukan bukti pelaku. Luas = luas jejak titik VIIRS, bukan luas bakar terpeta.", ""]
    for t in TAHUN_TTM:
        h = json.load(open(os.path.join(ANTARA, f"agregat_ttm_{t}.json")))
        T = h["total"]
        jb = T["jejak_ha"]
        out += [f"## Api {t}" + (" (jendela pendek 0..1 tahun)" if h.get("jendela_pendek") else f" (jendela 0..{2024 - t} tahun)"), "",
                f"- Jejak titik: {jb:,.0f} ha, {T['sampel']:,} sampel, {T['deteksi']:,} deteksi.",
                f"- Bakar lalu sawit (bs): **{T['ha']['bs']:,.0f} ha** ({T['ha']['bs'] / jb:.1%}); di dalam konsesi terpetakan {T['ha']['bs'] - T['luar_konsesi_ha']['bs']:,.0f} ha.",
                f"- Sawit terbakar (st): {T['ha']['st']:,.0f} ha ({T['ha']['st'] / jb:.1%}); bukan sawit 2024: {T['ha']['bk']:,.0f} ha.",
                "- Asal bs (ha): " + "; ".join(f"{k} {v:,.0f}" for k, v in T["asal_bs_ha"].items()),
                "- Jeda tanam bs (ha, tahun tanam - tahun api): " + "; ".join(f"{k} th: {v:,.0f}" for k, v in T["lag_ha"].items()),
                "- Tipe kebun bs (ha): " + "; ".join(f"{k} {v:,.0f}" for k, v in T["pemilik_bs_ha"].items()), "",
                "| # | Perusahaan | Grup | Jenis | Kabupaten | bs ha | porsi bs | Asal dominan | Jeda dominan (th) | Industri / rakyat (ha) |",
                "|--|--|--|--|--|--|--|--|--|--|"]
        daftar = sorted((p for p in h["perusahaan"] if layak(p)), key=lambda p: -p["ha"]["bs"])
        for i, p in enumerate(daftar[:15], 1):
            asal = max(p["asal"], key=p["asal"].get) if p["asal"] else "-"
            lag = max(p["lag_ha"], key=lambda g: p["lag_ha"][g])
            pm = p["pemilik_kebun"]
            out.append(f"| {i} | {p['nama']} | {p['grup'] or '-'} | {p['jenis']} | {', '.join(p['kab'][:2])} | {p['ha']['bs']:,.0f} | {p['bs_porsi']:.0%} | {asal} | {lag} | "
                       f"{pm.get('industri', 0):,.0f} / {pm.get('rakyat', 0):,.0f} |")
        out += ["", f"Perusahaan layak (bs >= {BS_MIN} ha dan porsi >= {PORSI_MIN:.0%}): {len(daftar)} dari {len(h['perusahaan'])}.", ""]
    g19 = os.path.join(ANTARA, "agregat_2019.json")
    if os.path.exists(g19):
        g = json.load(open(g19))["total"]
        t = json.load(open(os.path.join(ANTARA, "agregat_ttm_2019.json")))["total"]
        out += ["## Gaveau (jendela 1 tahun) vs TTM, api 2019", "",
                f"Gaveau bs+bd {g['ha']['bs'] + g['ha']['bd']:,.0f} ha, st {g['ha']['st']:,.0f} ha; TTM bs {t['ha']['bs']:,.0f} ha, st {t['ha']['st']:,.0f} ha. "
                "Gaveau hanya melihat sawit tahun 2019 (F2019) dan memakai tahun sebelum api untuk 'sudah sawit'; TTM melihat semua tanam 2019-2024.", ""]
    ak = akurasi_xlsx()
    out += ["## Akurasi validasi TTM2024 (xlsx penulis, Olofsson dkk. 2014; UA/PA % dan selang 95%)", "",
            "Akurasi global tahun-sawit 2024 dan perubahan tutupan; BUKAN akurasi tahun tanam per piksel. OA sawit 2024 98,9 (98,7-99,0).", "",
            "| Kelas | UA | PA |", "|--|--|--|"] + [f"| {a} | {b} | {c} |" for a, b, c in ak] + [""]
    out += ["## Batas metode", "",
            "- TTM2024 hanya memuat sawit yang ada pada 2024. Lahan terbakar yang jadi sawit lalu hilang/diganti, atau jadi tanaman lain, tidak tampak.",
            "- Tahun tanam 15 = 2015 atau sebelumnya: untuk api 2019/2023 itu 'sudah sawit' (st), tetapi sebagian mungkin tanam ulang.",
            "- Api 2023: jendela hanya tahun tanam 2023-2024; 'bakar lalu sawit' 2023 terlalu rendah dan lahan yang baru dibuka 2025-2026 belum ada di peta.",
            "- Satu piksel (~10 m) di titik sampel mewakili sel 125 m (~1,56 ha): galat sampling per sel; agregat tidak bias.",
            "- Tahun hilang hutan sama dengan tahun api dihitung 'saat api' (ambigu dalam tahun).",
            "- Lisensi CC BY-NC 4.0: keluaran ini internal sampai lisensi/atribusi dicek untuk publikasi.",
            "- Konsesi KLHK ~2014-2019 tidak lengkap; 'di luar konsesi terpetakan' bukan berarti tanpa izin.", ""]
    jalur = os.path.join(AKAR, "data/raw/sawit/hasil/ringkas_2019_2023.md")
    open(jalur, "w").write("\n".join(out))
    log(jalur)


# ---------------------------------------------------------------- uji
def uji_terbit_ttm():
    """kontrak citra TTM terbit: foto kebun bertanggal > api.terakhir (dan > foto terbakar); tiap f ada di disk (kalau agregat ada)"""
    # foto_tahun memotong jendela: sesudah 2019-10-13 tak boleh menghasilkan jendela sebelum itu
    pernah = []
    global pilih_s2, pilih_ls
    a, b = pilih_s2, pilih_ls
    pilih_s2 = lambda lat, lon, km, d1, d2: pernah.append(d1) or None
    pilih_ls = lambda lat, lon, km, d1, d2, m: None
    try:
        foto_tahun(2019, 0, 0, 6, dt.date(2019, 10, 13))
        assert pernah == ["2019-10-14", "2019-10-14"], pernah
        pernah.clear()
        foto_tahun(2019, 0, 0, 6, dt.date(2019, 12, 20))     # kemarau habis -> dilewati; setahun penuh dipotong
        assert pernah == ["2019-12-21"], pernah
    finally:
        pilih_s2, pilih_ls = a, b
    for t in TAHUN_TERBIT_TTM:
        j = TERBIT.replace("sawit_riwayat.json", f"sawit_riwayat_{t}.json")
        if not os.path.exists(j):
            continue
        for d in json.load(open(j))["perusahaan"]:
            for k in ("kebun1", "kebun2"):
                v = (d["citra"] or {}).get(k)
                if v:
                    assert v["tgl"] > d["api"]["terakhir"], (d["id"], k, v["tgl"], d["api"]["terakhir"])
                    if d["citra"].get("terbakar"):
                        assert v["tgl"] > d["citra"]["terbakar"]["tgl"], (d["id"], k)
            for v in (d["citra"] or {}).values():
                if isinstance(v, dict):
                    assert os.path.exists(os.path.join(AKAR, "public/data", v["f"])), v["f"]


def uji():
    # kisi + luas
    assert abs(luas_ha(0) - 1.557) < .01 and luas_ha(-5000) < luas_ha(0) * 1.0001
    k = kunci(113.9201, -2.2101)
    lo, la = pusat(k)
    assert abs(lo - 113.9201) < G and abs(la + 2.2101) < G
    # titik-dalam-poligon dengan lubang: persegi 0.02 deg dengan lubang 0.01 deg di tengahnya
    sel = [kunci(100 + i * G, 1 + j * G) for i in range(0, 20) for j in range(0, 20)]
    rows = baris(sel)
    luar = [(100.0, 1.0), (100.0, 1.0 + .02), (100.0 + .02, 1.0 + .02), (100.0 + .02, 1.0), (100.0, 1.0)]
    lubang = [(100.005, 1.005), (100.015, 1.005), (100.015, 1.015), (100.005, 1.015), (100.005, 1.005)]
    pol = isi([luar, lubang], rows)
    assert len(set(pol)) == len(pol)
    nol = isi([luar], rows)
    assert len(nol) > 250
    assert 0 < len(pol) < len(nol)
    pusat_lubang = kunci(100.01, 1.01)
    assert pusat_lubang in nol and pusat_lubang not in pol          # lubang membalik hasil
    assert kunci(100.0025, 1.0025) in pol                           # tepi luar, di luar lubang
    assert ada(rows, (100.01, 1.01, 100.011, 1.011)) and not ada(rows, (101.0, 1.0, 101.1, 1.1))
    # segitiga: sel pusat pasti di dalam / luar
    seg = [(100.0, 1.0), (100.02, 1.0), (100.0, 1.02), (100.0, 1.0)]
    d = isi([seg], rows)
    assert kunci(100.002, 1.002) in d and kunci(100.018, 1.018) not in d
    # klasifikasi dari deret F tahunan buatan
    def deret(awal, dari, ke, akhir="IOPP"):
        return {y: (akhir if dari <= y <= ke else awal) for y in range(2010, 2020)}
    assert klasifikasi(deret("Forest", 2000, 2019), 2015) == ("st", None, None)               # sudah sawit
    assert klasifikasi(deret("Forest", 2017, 2019), 2015) == ("bs", "Forest", 2017)           # hutan -> sawit Y+2
    assert klasifikasi(deret("Non Forest", 2015, 2019, "Smallholder"), 2015) == ("bs", "Non Forest", 2015)
    assert klasifikasi(deret("ITP", 2019, 2019), 2015) == ("bs", "ITP", 2019)
    assert klasifikasi(deret("Non Forest", 2030, 2031), 2015) == ("lain", "Non Forest", None)  # tetap non-forest
    assert klasifikasi(deret("Forest", 2019, 2019), 2019) == ("bs", "Forest", 2019)           # jendela pendek 2019
    assert klasifikasi(deret("Forest", 2030, 2031), 2019) == ("lain", "Forest", None)
    assert klasifikasi(deret("Forest", 2019, 2019), 2019, batas=2019)[2] == 2019
    assert klasifikasi(deret("Forest", 2020, 2025), 2015, batas=2019) == ("lain", "Forest", None)  # di luar jendela
    # TTM: tahun_tanam < api = sawit terbakar; >= api = bakar lalu sawit; asal dari hutan primer dan tahun hilang
    assert kelas_ttm(201515, 2019) == ("st", ASAL_TTM[2], 2015, "rakyat", False)             # YY=15 (<=2015) sudah sawit
    assert kelas_ttm(111718, 2019) == ("st", ASAL_TTM[1], 2018, "industri", False)           # hilang 2017 < api 2019, tanam 2018 < 2019
    assert kelas_ttm(111921, 2019) == ("bs", ASAL_TTM[0], 2021, "industri", False)           # hilang 2019 >= api: hutan primer saat api
    assert kelas_ttm(211523, 2023) == ("bs", ASAL_TTM[1], 2023, "rakyat", False)             # hilang <=2015, tanam 2023 (jeda 0)
    assert kelas_ttm(201924, 2023) == ("bs", ASAL_TTM[2], 2024, "rakyat", False)             # B=0: FF diabaikan
    assert kelas_ttm(201522, 2023)[0] == "st"
    # ambang awan: terang ATAU bendera; ambang terbit + peregangan warna asli
    assert layak({"ha": {"bs": 50}, "bs_porsi": .10}) and not layak({"ha": {"bs": 49}, "bs_porsi": .5}) and not layak({"ha": {"bs": 900}, "bs_porsi": .09})
    assert list(ke_byte_tc([0, 100, 20000], 2.75e-5, -.2)) == [0, 0, 255] and ke_byte_tc([10000], 2.75e-5, -.2)[0] > 0
    assert TAHUN_TERBIT == 2015 and TAHUN_TERBIT_TTM == tuple(range(2016, 2024)) == TAHUN_TTM   # 2016..2023 terbit dari TTM
    uji_terbit_ttm()
    # dedup sampel: dua deteksi sama persis -> satu sampel, dua hitungan pusat
    import tempfile
    global DIR
    lama, DIR = DIR, tempfile.mkdtemp()
    try:
        with open(os.path.join(DIR, "viirs_2001.csv"), "w") as f:
            f.write("latitude,longitude,scan,track,acq_date,confidence,type\n")
            for _ in range(2):
                f.write("-2.2,113.9,0.4,0.4,2001-09-10,n,0\n")
            f.write("-2.2,113.9,0.4,0.4,2001-09-11,l,0\n-2.2,113.9,0.4,0.4,2001-09-11,h,2\n")
        s = sampel(2001)
        assert len(s) <= 9 and sum(v >> 12 for v in s.values()) == 2, s
        assert all(v & 0xFFF == 1 << 8 for v in s.values())
    finally:
        DIR = lama
    print("uji ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    perintah = a[0] if a and not a[0].startswith("--") else "semua"
    th = [int(a[a.index("--tahun") + 1])] if "--tahun" in a else list(TAHUN)
    if perintah == "uji":
        uji()
    elif perintah == "unduh":
        unduh()
    elif perintah == "analisis":
        unduh()
        for t in th:
            analisis(t, "--tanpa-descals" not in a)
    elif perintah == "ttm":     # analisis TTM; --tahun T hanya T, tanpa itu semua TAHUN_TTM yang agregatnya belum ada
        for t in ([int(a[a.index("--tahun") + 1])] if "--tahun" in a else TAHUN_TTM):
            if "--tahun" in a or not os.path.exists(os.path.join(ANTARA, f"agregat_ttm_{t}.json")):
                analisis_ttm(t)
    elif perintah == "konfirm":
        konfirm_2015()
    elif perintah == "citra-ttm":
        hanya = a[a.index("--id") + 1].split(",") if "--id" in a else None
        for t in (th if "--tahun" in a else TAHUN_TTM):
            citra_ttm(t, hanya=hanya)
    elif perintah == "ringkas":
        ringkas()
    elif perintah == "citra":
        citra()
    elif perintah == "tulis":
        tulis()
    else:
        unduh()
        for t in th:
            analisis(t, "--tanpa-descals" not in a)
        citra()
        tulis()
