"""Abrasi garis pantai tahunan: laju mundur/maju garis pantai per transek 1 km dari Landsat 4-9 sejak 1988.
Rujukan metode: DEA Coastlines (Bishop-Taylor dkk. 2021, Remote Sensing of Environment 267:112734).

Pakai:  python3 scripts/pesisir/abrasi.py            semua situs
        python3 scripts/pesisir/abrasi.py sayung     satu situs (situs lain diambil dari keluaran lama)
        python3 scripts/pesisir/abrasi.py uji        swa-uji tanpa jaringan
        python3 scripts/pesisir/abrasi.py ringkas    hitung ulang laju dari deret `jarak` keluaran lama, tanpa citra
        python3 scripts/pesisir/abrasi.py validasi   bandingkan keluaran dengan angka literatur (tabel Markdown)

Sumber (terbuka, tanpa akun):
- Landsat Collection 2 Level-2 (USGS) via Microsoft Planetary Computer STAC, token SAS anonim.
- Garis pantai OpenStreetMap (natural=coastline, ODbL) lewat Overpass, HANYA untuk meletakkan transek pertama kali;
  sesudah itu transek dibaca dari keluaran lama supaya ID dan letaknya tetap dari tahun ke tahun.

Cara kerja per situs:
1. Transek tegak lurus garis pantai OSM tiap 1 km, 3 km ke darat dan 4 km ke laut, sampel tiap 15 m.
2. Tiap adegan Landsat: QA_PIXEL membuang isian, awan, bayangan, sirus; MNDWI = (hijau - SWIR1) / (hijau + SWIR1)
   dari reflektans permukaan, diinterpolasi bilinear di tiap sampel.
3. Komposit tahunan = median MNDWI semua adegan bersih tahun itu (minimal 2 pengamatan per sampel).
4. Ambang air/darat = Otsu atas semua sampel situs-tahun, dijepit ke [-0,25; 0,5]. Ambang 0 ala DEA salah di pantura:
   tambak (MNDWI 0-0,5) terbaca laut; Otsu jatuh di sekitar 0,3-0,4, antara tambak dan laut lepas (~0,7).
5. Garis pantai = penyeberangan air->darat PERTAMA dari ujung laut (subpiksel, interpolasi linear), darat harus
   bersambung >= 60 m supaya bagan/gosong kecil tidak terhitung.
6. Laju = kemiringan regresi linear jarak terhadap tahun (pencilan > 3 MAD dibuang sekali), selang 95% dari t.
Keluaran: public/pesisir/data/abrasi.json. Cache per adegan: data/raw/pesisir/adegan (di-ignore git).
"""
import datetime as dt, hashlib, json, math, os, statistics, sys, time, urllib.parse, urllib.request
from array import array
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
import citra as C  # COG, ambil, ke_utm, buka_ubin  # noqa: E402

KELUAR = os.path.join(AKAR, "public/pesisir/data/abrasi.json")
CACHE = os.path.join(AKAR, "data/raw/pesisir/adegan")
PC_STAC = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
PC_TOKEN = "https://planetarycomputer.microsoft.com/api/sas/v1/token/landsat-c2-l2"
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.private.coffee/api/interpreter"]
UA = {"User-Agent": "poskokarhutla/1.0"}   # Overpass menolak UA peramban penuh (406)

JARAK_TRANSEK = 1000     # m antar transek
DARAT, LAUT = 3000, 4000  # m panjang transek ke darat / ke laut dari garis OSM (Sayung mundur > 2 km sejak 1988)
LANGKAH = 15             # m antar sampel (setengah piksel Landsat)
RUN_DARAT = 4            # sampel darat bersambung (60 m) supaya penyeberangan dihitung
TEPI_DARAT = 150         # m; garis yang lebih dekat dari ini ke ujung darat transek dianggap di luar jangkauan
TAHUN_AWAL = 1988
MAKS_CEK = 12            # adegan per tahun yang dibaca QA-nya (awan STAC terendah dulu)
BERSIH_MIN = .3          # porsi sampel bersih minimal supaya adegan dipakai
OBS_MIN = 2              # pengamatan minimal per sampel untuk median tahunan
AMBANG_JEPIT = (-.25, .5)
QA_BUANG = 0b11111       # bit 0 isian, 1 awan dilatasi, 2 sirus, 3 awan, 4 bayangan
SK, OF = 2.75e-5, -.2    # skala reflektans Landsat C2 L2
KOSONG = -32768

# ponytail: kotak situs ditulis tangan; meluas = tambah baris (transek diletakkan otomatis dari OSM)
SITUS = [
    {"id": "sayung", "nama": "Sayung", "kab": "Demak", "prov": "Jawa Tengah", "bbox": [110.44, -6.96, 110.56, -6.85]},
    {"id": "pekalongan", "nama": "Pesisir Pekalongan", "kab": "Kota/Kab. Pekalongan", "prov": "Jawa Tengah", "bbox": [109.56, -6.90, 109.74, -6.82]},
    {"id": "indramayu", "nama": "Karangsong dan delta Cimanuk", "kab": "Indramayu", "prov": "Jawa Barat", "bbox": [108.28, -6.36, 108.48, -6.20]},
    {"id": "subang", "nama": "Blanakan dan Legonkulon", "kab": "Subang", "prov": "Jawa Barat", "bbox": [107.62, -6.28, 107.88, -6.15]},
    {"id": "bekasi", "nama": "Muara Gembong", "kab": "Bekasi", "prov": "Jawa Barat", "bbox": [106.97, -6.03, 107.12, -5.90]},
]


# transek yang garisnya digeser bangunan, bukan alam (ID transek tetap, jadi daftar tangan ini aman); diperiksa dari deret jarak
GANGGUAN = {
    # id: (keterangan, tahun pertama yang dikeluarkan dari regresi)
    **{f"sayung-{i:02d}": ("Tanggul laut Tol Semarang-Demak: garis sejak 2024 adalah tanggul, tahun itu tidak ikut laju", 2024)
       for i in (3, 4, 5, 6)},
    **{f"subang-{i:02d}": ("Reklamasi Pelabuhan Patimban: daratan buatan sejak 2018, tahun itu tidak ikut laju", 2018) for i in (45, 47)},
}


def log(*a):
    print(*a, file=sys.stderr, flush=True)


# ---------------------------------------------------------------- geometri lokal (meter, ekuirektangular per situs)
class Bingkai:
    def __init__(self, lat0, lon0):
        self.lat0, self.lon0 = lat0, lon0
        self.kx, self.ky = 111320 * math.cos(math.radians(lat0)), 110574.0

    def xy(self, lat, lon):
        return (lon - self.lon0) * self.kx, (lat - self.lat0) * self.ky

    def ll(self, x, y):
        return self.lat0 + y / self.ky, self.lon0 + x / self.kx


def rangkai(ways):
    """potongan garis [(lon, lat), ..] -> rantai yang disambung di titik ujung bersama (arah dipertahankan)"""
    rantai = [list(w) for w in ways]
    ada = True
    while ada:
        ada = False
        for i, a in enumerate(rantai):
            j = next((j for j, b in enumerate(rantai) if j != i and a[-1] == b[0]), None)
            if j is not None:
                a.extend(rantai.pop(j)[1:])
                ada = True
                break
    return rantai


def stasiun(rantai_xy, jarak=JARAK_TRANSEK, setengah=500):
    """[(x, y, nx, ny)] tiap `jarak` m sepanjang rantai; normal menunjuk ke LAUT = kanan arah jalan
    (konvensi OSM coastline: darat di kiri). Garis singgung dari titik +- `setengah` m."""
    hasil = []
    for r in rantai_xy:
        kum = [0.]
        for (x1, y1), (x2, y2) in zip(r, r[1:]):
            kum.append(kum[-1] + math.hypot(x2 - x1, y2 - y1))
        L = kum[-1]

        def titik(s):
            s = min(max(s, 0), L)
            i = max(1, next((k for k, v in enumerate(kum) if v >= s), len(kum) - 1))
            f = (s - kum[i - 1]) / ((kum[i] - kum[i - 1]) or 1)
            return r[i - 1][0] + f * (r[i][0] - r[i - 1][0]), r[i - 1][1] + f * (r[i][1] - r[i - 1][1])
        s = jarak / 2
        while s <= L - jarak / 2:
            (ax, ay), (bx, by) = titik(s - setengah), titik(s + setengah)
            tx, ty = bx - ax, by - ay
            n = math.hypot(tx, ty)
            if n > 0:
                x, y = titik(s)
                hasil.append((x, y, ty / n, -tx / n))
            s += jarak
    return hasil


def overpass(q):
    galat = None
    for i in range(9):
        try:
            data = urllib.parse.urlencode({"data": q}).encode()
            with urllib.request.urlopen(urllib.request.Request(OVERPASS[i % len(OVERPASS)], data=data, headers=UA), timeout=120) as r:
                return json.loads(r.read())
        except Exception as e:
            galat = e
            time.sleep(5 * (i + 1))
    raise galat


def transek_baru(s):
    """transek dari garis pantai OSM di kotak situs, diurut barat->timur, ID <situs>-NN"""
    w, so, e, n = s["bbox"]
    d = overpass(f'[out:json][timeout:90];way["natural"="coastline"]({so},{w},{n},{e});out geom;')
    ways = [[(g["lon"], g["lat"]) for g in el["geometry"]] for el in d["elements"] if el.get("geometry")]
    B = Bingkai((so + n) / 2, (w + e) / 2)
    rantai = [[B.xy(la, lo) for lo, la in r] for r in rangkai(ways)]
    hasil = []
    for x, y, nx, ny in stasiun(rantai):
        lat, lon = B.ll(x, y)
        if w <= lon <= e and so <= lat <= n:
            hasil.append({"lat": round(lat, 5), "lon": round(lon, 5), "arah": round(math.degrees(math.atan2(nx, ny)) % 360, 1)})
    hasil.sort(key=lambda t: (t["lon"], t["lat"]))
    for i, t in enumerate(hasil, 1):
        t["id"] = f"{s['id']}-{i:02d}"
    return hasil


def desa(t):
    """nama desa/kelurahan 300 m ke darat dari garis dasar (Nominatim, sekali per transek; disimpan di keluaran)"""
    B, a = Bingkai(t["lat"], t["lon"]), math.radians(t["arah"])
    lat, lon = B.ll(-300 * math.sin(a), -300 * math.cos(a))
    u = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&lat={lat:.5f}&lon={lon:.5f}"
    try:
        time.sleep(1.1)   # kebijakan Nominatim: <= 1 permintaan/detik
        with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30) as r:
            ad = json.loads(r.read()).get("address", {})
        return ad.get("village") or ad.get("suburb") or ad.get("hamlet") or ad.get("town")
    except Exception as e:
        log(f"  desa {t['id']}: {e!r}"[:120])
        return None


def sampel(t):
    """titik (lat, lon) sepanjang transek dari ujung darat ke ujung laut"""
    B = Bingkai(t["lat"], t["lon"])
    a = math.radians(t["arah"])
    nx, ny = math.sin(a), math.cos(a)
    return [B.ll(o * nx, o * ny) for o in range(-DARAT, LAUT + 1, LANGKAH)]


# ---------------------------------------------------------------- Landsat
_tok = {}


def token():
    if not _tok or time.time() - _tok["t"] > 1800:
        _tok.update(t=time.time(), v=json.loads(C.ambil(PC_TOKEN, coba=6))["token"])
    return "?" + _tok["v"]


def adegan(bbox, y):
    w, s, e, n = bbox
    q = {"collections": ["landsat-c2-l2"], "limit": 200,
         "intersects": {"type": "Polygon", "coordinates": [[[w, s], [e, s], [e, n], [w, n], [w, s]]]},
         "datetime": f"{y}-01-01T00:00:00Z/{y}-12-31T23:59:59Z", "query": {"eo:cloud_cover": {"lte": 70}}}
    fs = json.loads(C.ambil(PC_STAC, data=json.dumps(q).encode(), coba=6)).get("features", [])
    fs = [f for f in fs if f["properties"]["platform"] in ("landsat-4", "landsat-5", "landsat-7", "landsat-8", "landsat-9")]
    return sorted(fs, key=lambda f: f["properties"]["eo:cloud_cover"])[:MAKS_CEK]


def ke_piksel(it, titik):
    """(baris, kolom) pecahan pusat piksel. Landsat belahan selatan memakai zona UTM utara (326xx) dengan northing negatif."""
    P = it["properties"]
    epsg = P["proj:epsg"]
    x0, y0, r = P["proj:transform"][2], P["proj:transform"][5], P["proj:transform"][0]
    hasil = []
    for lat, lon in titik:
        E, N = C.ke_utm(lat, lon, epsg % 100)
        if lat < 0 and epsg < 32700:
            N -= 10_000_000
        hasil.append(((y0 - N) / r - .5, (E - x0) / r - .5))
    return hasil


def baca_piksel(cog, piksel):
    """{(baris, kolom): DN} dari level 0 COG; di luar raster = 0"""
    t = cog.ifd[0]
    W, H, T = t[256], t[257], t[322]
    tx = math.ceil(W / T)
    off, cnt = t[324], t[325]
    off, cnt = (off,) if isinstance(off, int) else off, (cnt,) if isinstance(cnt, int) else cnt
    perlu = {(r // T, c // T) for r, c in piksel if 0 <= r < H and 0 <= c < W}

    def satu(k):
        i = k[0] * tx + k[1]
        return k, (C.buka_ubin(cog.baca(off[i], off[i] + cnt[i]), t, cog.bo) if cnt[i] else None)
    with ThreadPoolExecutor(4) as ex:
        ubin = dict(ex.map(satu, perlu))
    hasil = {}
    for r, c in piksel:
        u = ubin.get((r // T, c // T)) if 0 <= r < H and 0 <= c < W else None
        hasil[(r, c)] = u[(r % T) * T + c % T] if u else 0
    return hasil


def mndwi_piksel(qa, g, s):
    """MNDWI satu piksel atau None (QA buruk, isian, jenuh, atau penyebut terlalu kecil)"""
    if qa & QA_BUANG or not (0 < g < 65535 and 0 < s < 65535):
        return None
    G, S = g * SK + OF, s * SK + OF
    return (G - S) / (G + S) if G + S > .01 else None


def bilinear(pos, nilai):
    """nilai di (baris, kolom) pecahan dari dict piksel; None bila salah satu dari 4 tetangga None"""
    r, c = pos
    i, j = math.floor(r), math.floor(c)
    fy, fx = r - i, c - j
    v = [nilai.get((i, j)), nilai.get((i, j + 1)), nilai.get((i + 1, j)), nilai.get((i + 1, j + 1))]
    if any(x is None for x in v):
        return None
    return (v[0] * (1 - fx) + v[1] * fx) * (1 - fy) + (v[2] * (1 - fx) + v[3] * fx) * fy


def tetangga(pos):
    i, j = math.floor(pos[0]), math.floor(pos[1])
    return {(i, j), (i, j + 1), (i + 1, j), (i + 1, j + 1)}


def olah_adegan(it, titik, folder):
    """array 'h' MNDWI x 1000 per titik (KOSONG = tak ada) atau None bila adegan terlalu berawan; di-cache"""
    jalur = os.path.join(folder, it["id"] + ".bin")
    if os.path.exists(jalur):
        b = open(jalur, "rb").read()
        return array("h", b) if b else None
    pos = ke_piksel(it, titik)
    px = set().union(*(tetangga(p) for p in pos))

    def cog(aset):
        u = it["assets"][aset]["href"] + token()
        return C.COG(u, lambda a, b: C.ambil(u, (a, b), coba=7))   # Planetary Computer membatasi laju (429)
    qa = baca_piksel(cog("qa_pixel"), px)
    if sum(1 for v in qa.values() if v and not v & QA_BUANG) < BERSIH_MIN * len(px):
        open(jalur, "wb").close()
        return None
    g, s = baca_piksel(cog("green"), px), baca_piksel(cog("swir16"), px)
    m = {k: mndwi_piksel(qa[k], g[k], s[k]) for k in px}
    out = array("h", (KOSONG if (v := bilinear(p, m)) is None else round(v * 1000) for p in pos))
    out.tofile(open(jalur + ".tmp", "wb"))
    os.replace(jalur + ".tmp", jalur)
    return out


# ---------------------------------------------------------------- komposit, ambang, garis pantai, laju
def median_tahunan(lapis, n):
    """median per titik dari beberapa array adegan; None bila < OBS_MIN pengamatan"""
    hasil = []
    for i in range(n):
        v = [a[i] for a in lapis if a[i] != KOSONG]
        hasil.append(statistics.median(v) / 1000 if len(v) >= OBS_MIN else None)
    return hasil


def otsu(v, kotak=200, lo=-1., hi=1.):
    """ambang Otsu atas nilai di [lo, hi]"""
    h = [0] * kotak
    for x in v:
        h[min(kotak - 1, max(0, int((x - lo) / (hi - lo) * kotak)))] += 1
    tot = sum(h)
    jum = sum(i * c for i, c in enumerate(h))
    wb = sb = 0
    terbaik, ambang = -1, 0
    for i, c in enumerate(h):
        wb += c
        if wb == 0 or wb == tot:
            continue
        sb += i * c
        mb, mf = sb / wb, (jum - sb) / (tot - wb)
        var = wb * (tot - wb) * (mb - mf) ** 2
        if var > terbaik:
            terbaik, ambang = var, i + 1
    return lo + ambang * (hi - lo) / kotak


def garis(prof, ambang, langkah=LANGKAH, awal=-DARAT, run=RUN_DARAT):
    """jarak (m, + ke laut dari garis dasar) penyeberangan air->darat pertama dari ujung laut; None bila tak terbaca"""
    if prof[-1] is None or prof[-1] < ambang:
        return None   # ujung laut bukan air: transek menabrak daratan lain atau tak terpantau
    for i in range(len(prof) - 1, 0, -1):
        a, b = prof[i], prof[i - 1]
        if a is None or b is None:
            return None
        if a >= ambang > b and all(x is not None and x < ambang for x in prof[max(0, i - run):i]):
            d = awal + i * langkah - langkah * (a - ambang) / (a - b)
            return d if d > awal + TEPI_DARAT else None   # mepet ujung darat: garis aslinya bisa lebih jauh ke darat
    return None


T95 = [(1, 12.71), (2, 4.30), (3, 3.18), (4, 2.78), (5, 2.57), (6, 2.45), (7, 2.36), (8, 2.31), (9, 2.26), (10, 2.23),
       (12, 2.18), (15, 2.13), (20, 2.09), (25, 2.06), (30, 2.04), (60, 2.00), (10 ** 9, 1.96)]


def tkrit(df):
    """t 95% dua sisi; df di antara baris tabel memakai baris di bawahnya (lebih konservatif)"""
    return [t for d, t in T95 if d <= df][-1]


def regresi(xy):
    n = len(xy)
    if n < 3:
        return None
    mx, my = sum(x for x, _ in xy) / n, sum(y for _, y in xy) / n
    sxx = sum((x - mx) ** 2 for x, _ in xy)
    if sxx == 0:
        return None
    b = sum((x - mx) * (y - my) for x, y in xy) / sxx
    res = [y - (my + b * (x - mx)) for x, y in xy]
    sse, syy = sum(r * r for r in res), sum((y - my) ** 2 for _, y in xy)
    se = math.sqrt(sse / (n - 2) / sxx)
    return {"b": b, "se": se, "r2": 1 - sse / syy if syy else 0., "res": res}


def ar1(res):
    """autokorelasi lag-1 residu (urut tahun), dijepit [0; 0,9]"""
    v = sum(r * r for r in res)
    return min(.9, max(0., sum(a * b for a, b in zip(res, res[1:])) / v)) if v else 0.


def laju(xy):
    """regresi jarak~tahun -> dict ringkas atau None.
    Pencilan > 3 MAD dibuang sekali; bila pembuangan itu membalik tanda atau baru membuat laju nyata, keyakinan turun satu.
    Selang 95% dilebarkan untuk autokorelasi residu: se x sqrt((1+r)/(1-r)), derajat bebas dari n efektif."""
    f0 = f = regresi(xy)
    if not f:
        return None
    n0 = len(xy)
    mad = statistics.median(abs(r) for r in f["res"])
    if mad > 0:
        sisa = [p for p, r in zip(xy, f["res"]) if abs(r) <= 3 * 1.4826 * mad]
        if len(sisa) < len(xy) and (g := regresi(sisa)):
            xy, f = sisa, g

    def selang(f, n):
        r = ar1(f["res"])
        neff = max(3., n * (1 - r) / (1 + r))
        lebar = tkrit(int(neff) - 2) * f["se"] * math.sqrt((1 + r) / (1 - r))
        return f["b"] - lebar, f["b"] + lebar, r
    lo, hi, r = selang(f, len(xy))
    nyata = lo > 0 or hi < 0
    yak = 2 if nyata and len(xy) >= 15 and f["r2"] >= .5 else 1 if nyata and len(xy) >= 8 else 0
    if f is not f0:
        lo0, hi0, _ = selang(f0, n0)
        if (f["b"] > 0) != (f0["b"] > 0) or (nyata and not (lo0 > 0 or hi0 < 0)):
            yak = max(0, yak - 1)
    kelas = "tidak nyata" if yak == 0 else "abrasi" if hi < 0 else "akresi"
    return {"laju": round(f["b"], 1), "ci95": [round(lo, 1), round(hi, 1)], "r2": round(f["r2"], 2), "r2_penuh": round(f0["r2"], 2),
            "ar1": round(r, 2), "n": len(xy), "pencilan": n0 - len(xy), "keyakinan": ("rendah", "sedang", "tinggi")[yak], "kelas": kelas}


def lompatan(jarak, ambang=300):
    """tahun di dua tahun terakhir yang melompat > ambang m dari median 5 tahun sebelumnya (tanggul, reklamasi, awan)"""
    return [y for i, (y, d) in enumerate(jarak) if i >= len(jarak) - 2 and i >= 5
            and abs(d - statistics.median(x for _, x in jarak[i - 5:i])) > ambang]


def nilai_transek(t, tahun_akhir):
    """statistik transek dari deret `jarak` saja (tanpa citra): bisa dihitung ulang dari keluaran lama"""
    for k in ("laju", "ci95", "r2", "r2_penuh", "ar1", "n", "pencilan", "keyakinan", "kelas", "laju_10th", "perubahan_m",
              "periode", "garis_terakhir", "gangguan", "tinjau"):
        t.pop(k, None)
    jarak = t["jarak"]
    if t["id"] in GANGGUAN:   # tahun bangunan tidak ikut regresi; deretnya tetap utuh di `jarak`
        t["gangguan"], mulai = GANGGUAN[t["id"]]
        jarak = [p for p in jarak if p[0] < mulai]
    elif lompatan(jarak):
        t["tinjau"] = lompatan(jarak)
    semua = laju(jarak)
    if not semua:
        return t
    t.update(semua)
    akhir = [p for p in jarak if p[0] > tahun_akhir - 10]
    t["laju_10th"] = laju(akhir) if len(akhir) >= 5 else None
    awal3, akhir3 = jarak[:3], jarak[-3:]
    t["perubahan_m"] = round(sum(d for _, d in akhir3) / len(akhir3) - sum(d for _, d in awal3) / len(awal3))
    t["periode"] = [jarak[0][0], jarak[-1][0]]
    B, a = Bingkai(t["lat"], t["lon"]), math.radians(t["arah"])
    la, lo = B.ll(jarak[-1][1] * math.sin(a), jarak[-1][1] * math.cos(a))
    t["garis_terakhir"] = [round(la, 5), round(lo, 5)]
    return t


# ---------------------------------------------------------------- alur per situs
def olah_situs(s, transek, tahun_akhir):
    titik_t = [sampel(t) for t in transek]
    titik = [p for ts in titik_t for p in ts]
    kunci = hashlib.sha1(json.dumps([DARAT, LAUT, LANGKAH] + [(t["lat"], t["lon"], t["arah"]) for t in transek]).encode()).hexdigest()[:8]
    folder = os.path.join(CACHE, f"{s['id']}-{kunci}")
    os.makedirs(folder, exist_ok=True)
    per_tahun, ambang, adegan_n = {}, {}, {}
    for y in range(TAHUN_AWAL, tahun_akhir + 1):
        try:
            fs = adegan(s["bbox"], y)
        except Exception as e:
            log(f"  {s['id']} {y}: STAC gagal {e!r}")
            continue

        def satu(it):
            try:
                return olah_adegan(it, titik, folder)
            except Exception as e:
                log(f"  {it['id']}: {e!r}"[:160])
                return None
        with ThreadPoolExecutor(6) as ex:
            lapis = [a for a in ex.map(satu, fs) if a is not None]
        if len(lapis) < OBS_MIN:
            continue
        med = median_tahunan(lapis, len(titik))
        nilai = [v for v in med if v is not None]
        if len(nilai) < .3 * len(titik):
            continue
        th = max(AMBANG_JEPIT[0], min(AMBANG_JEPIT[1], otsu(nilai)))
        per_tahun[y], ambang[y], adegan_n[y] = med, round(th, 3), len(lapis)
        log(f"  {s['id']} {y}: {len(lapis)}/{len(fs)} adegan, ambang {th:+.2f}")
    hasil = []
    k = 0
    for t, ts in zip(transek, titik_t):
        n = len(ts)
        jarak = []
        for y, med in sorted(per_tahun.items()):
            d = garis(med[k:k + n], ambang[y])
            if d is not None:
                jarak.append([y, round(d)])
        k += n
        hasil.append(dict(t, situs=s["id"], jarak=jarak))
    return hasil, {"ambang": ambang, "adegan": adegan_n}


def ringkas_situs(s, ts, info):
    ada = [t for t in ts if t.get("laju") is not None]
    yakin = [t for t in ada if t["keyakinan"] != "rendah" and not t.get("gangguan")]
    ab = [t for t in yakin if t["kelas"] == "abrasi"]
    return dict(s, transek=len(ts), terbaca=len(ada), tahun=sorted(info["ambang"]), ambang=info["ambang"], adegan=info["adegan"],
                laju_median=round(statistics.median(t["laju"] for t in ada), 1) if ada else None,
                abrasi_nyata=len(ab), akresi_nyata=sum(1 for t in yakin if t["kelas"] == "akresi"),
                terparah=min(ab, key=lambda t: t["laju"])["id"] if ab else None,
                tinjau=[t["id"] for t in ts if t.get("tinjau")])


CATATAN = [
    "Belum dikoreksi pasang surut. Pantura bertunggang pasang sekitar 1 m dan pantainya landai berlumpur, jadi garis "
    "satu tahun bisa bergeser puluhan sampai ratusan meter menurut pasang saat satelit lewat. Median banyak adegan meredam, "
    "tidak menghapus. Laju tahun-ke-tahun lebih bisa dipegang daripada posisi satu tahun.",
    "Di Sayung dan pesisir Semarang-Demak, garis yang mundur adalah gabungan abrasi gelombang dan penurunan muka tanah. "
    "Citra tidak bisa memisahkan keduanya; keduanya sama-sama berarti darat jadi laut.",
    "Tambak yang tanggulnya jebol terbaca laut, tambak utuh di belakang tanggul terbaca darat. Pulau mangrove atau "
    "tanggul lepas pantai lebih dari 60 m terbaca garis pantai.",
    "Tanggul laut Tol Semarang-Demak yang sedang dibangun di depan Terboyo dan Sayung terbaca sebagai garis pantai baru: "
    "lompatan maju 2024-2025 di sana adalah tanggul, bukan pantai yang tumbuh. Laju 10 tahun terakhir di ruas itu tidak "
    "boleh dibaca sebagai pemulihan.",
    "Reklamasi Pelabuhan Patimban (Subang, dibangun sejak 2018) terbaca sebagai pantai maju; itu daratan buatan.",
    "Landsat 7 sesudah Mei 2003 bergaris kosong; tertutup oleh median beberapa adegan, tahun dengan pengamatan kurang dibuang.",
    "Keyakinan tinggi: minimal 15 tahun terbaca, selang 95% tidak memuat nol, R2 >= 0,5. Sedang: minimal 8 tahun dan "
    "selang 95% tidak memuat nol. Turun satu tingkat bila membuang tahun pencilan membalik arah atau baru membuat laju "
    "nyata. Keyakinan rendah ditulis tidak nyata.",
    "Garis tahun-tahun berurutan saling terkait (pasang, tambak, awan yang mirip), jadi selang 95% sudah dilebarkan untuk "
    "autokorelasi; tetap saja itu perkiraan statistik, bukan ukuran lapangan. Belum ada satu pun pengukuran lapangan.",
    "Ambang air/darat dipilih sesudah melihat data Sayung (ambang 0 membalik banyak hasil karena tambak). Sayung karena itu "
    "bukan uji bebas untuk ambang; empat situs lain yang menjadi pembanding.",
    "Transek bertanda tinjau melompat lebih dari 300 m di dua tahun terakhir (tanggul, reklamasi, atau tahun berawan) dan "
    "belum diperiksa tangan.",
]


def main(pilih=None):
    """pilih = id situs (hanya situs itu dibaca ulang dari citra) atau 'ringkas' (tanpa citra: statistik dihitung ulang
    dari deret `jarak` keluaran lama, misal sesudah aturan laju atau GANGGUAN berubah)"""
    t0 = time.time()
    try:
        lama = json.load(open(KELUAR))
    except Exception:
        lama = {"situs": [], "transek": []}
    tahun_akhir = dt.date.today().year - 1   # tahun berjalan belum lengkap: komposit musimnya timpang
    situs_out, transek_out = [], []
    for s in SITUS:
        ts_lama = [t for t in lama["transek"] if t["situs"] == s["id"]]
        if pilih and s["id"] != pilih:
            ts = [nilai_transek(t, tahun_akhir) for t in ts_lama]
            situs_out += [ringkas_situs(s, ts, x) for x in lama["situs"] if x["id"] == s["id"]]
            transek_out += ts
            continue
        try:
            dasar = [{k: t.get(k) for k in ("id", "lat", "lon", "arah", "desa")} for t in ts_lama] or transek_baru(s)
            for t in dasar:
                t["desa"] = t.get("desa") or desa(t)
            log(f"{s['id']}: {len(dasar)} transek")
            ts, info = olah_situs(s, dasar, tahun_akhir)
            ts = [nilai_transek(t, tahun_akhir) for t in ts]
            situs_out.append(ringkas_situs(s, ts, info))
            transek_out += ts
        except Exception as e:
            log(f"{s['id']}: gagal {e!r}, data lama dipakai")
            situs_out += [x for x in lama["situs"] if x["id"] == s["id"]]
            transek_out += ts_lama
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "versi": 1,
           "metode": {"indeks": "MNDWI (hijau, SWIR1)", "komposit": "median tahunan", "ambang": "Otsu, dijepit -0,25 sampai 0,5",
                      "jarak_transek_m": JARAK_TRANSEK, "darat_m": DARAT, "laut_m": LAUT, "langkah_m": LANGKAH,
                      "tahun": [TAHUN_AWAL, tahun_akhir], "laju": "regresi linear, pencilan > 3 MAD dibuang, selang 95% t dilebarkan untuk autokorelasi AR(1)",
                      "rujukan": "Bishop-Taylor dkk. 2021, DEA Coastlines, doi:10.1016/j.rse.2021.112734"},
           "catatan": CATATAN, "situs": situs_out, "transek": transek_out,
           "sumber": "Landsat Collection 2 Level-2 (USGS), via Microsoft Planetary Computer. Garis dasar transek: OpenStreetMap (ODbL). "
                     "Deteksi Pantau Bencana."}
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    with open(KELUAR + ".tmp", "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(KELUAR + ".tmp", KELUAR)
    for x in situs_out:
        print(f"{x['id']}: {x['terbaca']}/{x['transek']} transek terbaca, median {x['laju_median']} m/th, "
              f"{x['abrasi_nyata']} abrasi nyata, {x['akresi_nyata']} akresi nyata, {len(x['tahun'])} tahun")
    print(f"abrasi: {time.time() - t0:.0f} dtk")


# ---------------------------------------------------------------- validasi terhadap literatur (python3 abrasi.py validasi)
# (situs, saring: nama desa | (bujur barat, bujur timur) | None, tahun awal, tahun akhir, rujukan, angka rujukan). Angka rujukan = apa yang DITULIS sumbernya,
# metodenya beda-beda (DSAS EPR rata-rata transek mundur saja, luas ha, Sentinel-2), jadi yang dibandingkan arah dan ordenya.
RUJUKAN = [
    ("sayung", "Bedono", 2013, 2020, "Ramadhani dkk. 2021, J. Marine Research 10(2), doi:10.14710/jmr.v10i2.30468",
     "Landsat 8 DSAS: rata-rata transek mundur -19,9 m/th"),
    ("sayung", "Timbulsloko", 2013, 2020, "Ramadhani dkk. 2021", "rata-rata transek mundur -15,4 m/th"),
    ("sayung", "Surodadi", 2013, 2020, "Ramadhani dkk. 2021", "rata-rata transek mundur -7,3 m/th, ada akresi +6,1"),
    ("sayung", "Bedono", 1988, 1999, "Munawaroh & Setyaningsih 2021, Geo Image 10(2)", "Landsat NDWI: abrasi 331 ha 1990-1999, puncak"),
    ("sayung", "Bedono", 2011, 2019, "Munawaroh & Setyaningsih 2021", "abrasi melambat: 37 ha 2011-2015, 49 ha 2015-2019"),
    ("bekasi", None, 2011, 2021, "Meizwar & Tarya 2024, J. Tropical Marine Science 7(2), doi:10.33019/jour.trop.mar.sci.v7i2.5063",
     "Landsat DSAS: bersih +0,2 m/th; transek mundur -7,7, transek maju +12,2"),
    # Nominatim tidak memberi nama desa di Blanakan; rentang bujur kira-kira, bukan batas resmi
    ("subang", (107.60, 107.73), 1995, 2020, "Tarya & Aneky 2026, J. Ilmu Kelautan Kepulauan 9(1), doi:10.33387/jikk.v9i1.11451",
     "Landsat: Blanakan akresi, barat +40,2 m/th, timur +2,5 m/th"),
    # belahan barat/timur di bujur 107,665 juga kira-kira; menguji pola barat > timur, bukan angkanya
    ("subang", (107.60, 107.665), 1995, 2020, "Tarya & Aneky 2026", "Blanakan barat +40,2 m/th"),
    ("subang", (107.665, 107.73), 1995, 2020, "Tarya & Aneky 2026", "Blanakan timur +2,5 m/th"),
    ("subang", (107.75, 107.86), 1990, 2018, "Kalther & Itaya 2020 (dari ringkasan, sumber primer belum dibaca)",
     "Legonkulon: mundur terparah 2.361 m 1990-2018 (sekitar 84 m/th)"),
    ("indramayu", None, 1989, 2009, "Kusnanto dkk. 2022, JPSL 12(3), doi:10.29244/jpsl.12.3.543-554",
     "Landsat: abrasi 2.416 ha lawan akresi 668 ha (abrasi dominan)"),
    ("indramayu", None, 2009, 2019, "Kusnanto dkk. 2022", "abrasi 358 ha lawan akresi 698 ha (berbalik akresi dominan)"),
    ("pekalongan", None, 2016, 2022, "Endarsih dkk. 2025, J. Teknologi Lingkungan 26(1), doi:10.55981/jtl.2025.3960",
     "Sentinel-2 Kota Pekalongan: abrasi dominan 4,0 m/th"),
]


def validasi():
    J = json.load(open(KELUAR))
    print("| Situs | Desa | Periode | Rujukan | Angka rujukan | Pantau Bencana: transek terbaca, mundur/maju nyata, "
          "median laju, rerata transek mundur, rerata transek maju, mundur terparah (m/th) |")
    print("| --- | --- | --- | --- | --- | --- |")
    for situs, ds, y1, y2, ruj, angka in RUJUKAN:
        cocok = (lambda t: True) if ds is None else (lambda t: ds[0] <= t["lon"] <= ds[1]) if isinstance(ds, tuple) \
            else (lambda t: ds.lower() in (t.get("desa") or "").lower())
        ts = [t for t in J["transek"] if t["situs"] == situs and cocok(t)]
        L = [x for x in (laju([p for p in t["jarak"] if y1 <= p[0] <= y2]) for t in ts) if x]
        rr = lambda v: f"{sum(v) / len(v):+.1f}".replace(".", ",") if v else "-"
        b = [x["laju"] for x in L]
        wil = f"bujur {ds[0]}-{ds[1]}".replace(".", ",") if isinstance(ds, tuple) else ds or "semua"
        print(f"| {situs} | {wil} | {y1}-{y2} | {ruj} | {angka} | {len(L)}/{len(ts)}, "
              f"{sum(1 for x in L if x['kelas'] == 'abrasi')}/{sum(1 for x in L if x['kelas'] == 'akresi')}, "
              f"{rr([statistics.median(b)]) if b else '-'}, {rr([v for v in b if v < 0])}, {rr([v for v in b if v > 0])}, "
              f"{rr([min(b)]) if b else '-'} |")


# ---------------------------------------------------------------- swa-uji
def uji():
    import random
    random.seed(7)
    # rangkai: dua potongan bersambung jadi satu, arah tetap
    r = rangkai([[(2, 0), (3, 0)], [(0, 0), (1, 0), (2, 0)], [(9, 9), (9, 8)]])
    assert sorted(map(len, r)) == [2, 4] and [(0, 0), (1, 0), (2, 0), (3, 0)] in r, r
    # normal ke laut: garis berjalan barat->timur, darat di kiri (utara) -> laut di selatan
    st = stasiun([[(0, 0), (5000, 0)]])
    assert len(st) == 5 and all(abs(nx) < 1e-9 and abs(ny + 1) < 1e-9 for _, _, nx, ny in st), st
    assert [round(x) for x, *_ in st] == [500, 1500, 2500, 3500, 4500]
    # arah transek -> titik sampel: arah 180 (laut ke selatan), ujung laut 4 km di selatan garis dasar
    t = {"lat": -6.9, "lon": 110.5, "arah": 180.0}
    ts = sampel(t)
    assert len(ts) == (DARAT + LAUT) // LANGKAH + 1
    assert abs((ts[-1][0] - t["lat"]) * 110574 + (DARAT + LAUT) // LANGKAH * LANGKAH - DARAT) < 1 and abs((ts[0][0] - t["lat"]) * 110574 - DARAT) < 1
    # MNDWI: air (hijau > SWIR) positif, darat negatif, QA awan/isian dibuang
    dn = lambda refl: round((refl - OF) / SK)
    assert mndwi_piksel(0b1000000, dn(.08), dn(.01)) > .7 and mndwi_piksel(0b1000000, dn(.08), dn(.25)) < -.4
    assert mndwi_piksel(0b1000, dn(.08), dn(.01)) is None and mndwi_piksel(1, dn(.08), dn(.01)) is None
    assert mndwi_piksel(0, 0, dn(.1)) is None and mndwi_piksel(0, 65535, dn(.1)) is None
    # bilinear dan tetangga
    m = {(0, 0): 0., (0, 1): 1., (1, 0): 2., (1, 1): 3.}
    assert abs(bilinear((.5, .5), m) - 1.5) < 1e-12 and bilinear((.5, 1.5), m) is None
    assert tetangga((.5, .5)) == set(m)
    # piksel Landsat belahan selatan: zona utara, northing negatif (tanpa 10.000 km)
    it = {"properties": {"proj:epsg": 32649, "proj:transform": [30., 0., 400000., 0., -30., -700000.]}}
    E, N = C.ke_utm(-6.9, 110.5, 49)
    (r_, c_), = ke_piksel(it, [(-6.9, 110.5)])
    assert abs(c_ - ((E - 400000) / 30 - .5)) < 1e-9 and abs(r_ - ((-700000 - (N - 1e7)) / 30 - .5)) < 1e-9 and r_ > 0
    # baca_piksel dari COG palsu satu ubin 4x4
    T = 4
    raw = array("H", range(1, 17))
    tags = {256: 4, 257: 4, 258: 16, 259: 1, 322: T, 323: T, 324: (0,), 325: (32,)}
    cog = type("F", (), {})()
    cog.ifd, cog.bo, cog.baca = [tags], "<", lambda a, b: raw.tobytes()[a:b]
    v = baca_piksel(cog, {(0, 0), (3, 3), (1, 2), (5, 0), (-1, 0)})
    assert v == {(0, 0): 1, (3, 3): 16, (1, 2): 7, (5, 0): 0, (-1, 0): 0}, v
    # median tahunan: OBS_MIN
    a1, a2, a3 = array("h", [100, KOSONG, 300]), array("h", [300, 200, KOSONG]), array("h", [200, KOSONG, KOSONG])
    assert median_tahunan([a1, a2, a3], 3) == [.2, None, None]
    # Otsu memisahkan dua mode
    v = [random.gauss(-.4, .08) for _ in range(3000)] + [random.gauss(.5, .1) for _ in range(1500)]
    assert -.25 < otsu(v) < .25, otsu(v)
    # garis: profil darat (-0,4) lalu air (+0,4), naik linear di antaranya; penyeberangan ambang 0 tepat di 1000 m
    off = list(range(-DARAT, LAUT + 1, LANGKAH))
    prof = [max(-.4, min(.4, (o - 1000) / 100)) for o in off]
    assert abs(garis(prof, 0.) - 1000) < 1e-6, garis(prof, 0.)
    # bagan/gosong 30 m di laut tidak dihitung, pulau 150 m dihitung
    p2 = [(-.4 if 2500 <= o < 2530 else x) for o, x in zip(off, prof)]
    assert abs(garis(p2, 0.) - 1000) < 1e-6
    p3 = [(-.4 if 2500 <= o < 2650 else x) for o, x in zip(off, prof)]
    assert 2640 < garis(p3, 0.) <= 2650
    assert garis(prof[:-1] + [-.4], 0.) is None and garis(prof[:-5] + [None] * 5, 0.) is None
    assert garis([None if 1500 < o < 1600 else x for o, x in zip(off, prof)], 0.) is None
    assert garis([max(-.4, min(.4, (o + DARAT - 100) / 100)) for o in off], 0.) is None, "garis mepet ujung darat mestinya ditolak"
    # laju: -40 m/th + derau 15 m, satu tahun pencilan +600 m dibuang
    xy = [[y, 2000 - 40 * (y - 1990) + random.gauss(0, 15)] for y in range(1990, 2025)]
    xy[10][1] += 600
    L = laju(xy)
    assert abs(L["laju"] + 40) < 2 and L["pencilan"] == 1 and L["kelas"] == "abrasi" and L["keyakinan"] == "tinggi", L
    assert L["ci95"][0] < -40 < L["ci95"][1]
    # derau tanpa tren: tidak nyata, keyakinan rendah (peluang salah 5%, benih tetap)
    L0 = laju([[y, random.gauss(0, 30)] for y in range(1995, 2025)])
    assert L0["kelas"] == "tidak nyata" and L0["keyakinan"] == "rendah", L0
    # autokorelasi: derau AR(1) rho 0,7 tanpa tren jarang lolos nyata sesudah selang dilebarkan
    palsu = 0
    for k in range(200):
        e, xy = 0., []
        for y in range(1990, 2026):
            e = .7 * e + random.gauss(0, 30)
            xy.append([y, e])
        palsu += laju(xy)["kelas"] != "tidak nyata"
    assert palsu <= 30, f"{palsu}/200 positif palsu pada AR(1) 0,7"
    assert ar1([1, 1, 1, -1, -1, -1]) > .3 and ar1([1, -1, 1, -1]) == 0
    # pencilan yang membalik arah menurunkan keyakinan
    xy = [[y, 5 * (y - 2000) + random.gauss(0, 3)] for y in range(2000, 2030)]
    for i in (0, 1, 2):
        xy[i][1] += 900
    L = laju(xy)
    assert L["pencilan"] >= 3 and L["laju"] > 0 and L["keyakinan"] != "tinggi", L
    # lompatan 2 tahun terakhir
    j = [[y, -500 - 10 * (y - 2000)] for y in range(2000, 2024)] + [[2024, 0], [2025, 10]]
    assert lompatan(j) == [2024, 2025] and lompatan(j[:-2]) == []
    t = nilai_transek({"id": "sayung-05", "lat": -6.9, "lon": 110.5, "arah": 0., "jarak": j}, 2025)
    assert t["gangguan"] and t["periode"] == [2000, 2023] and "tinjau" not in t and t["laju"] == -10.0, t
    assert laju([]) is None and laju([[2000, 1], [2000, 2], [2000, 3]]) is None and tkrit(11) == 2.23 and tkrit(500) == 2.00
    print("abrasi.py uji: lolos")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    elif sys.argv[1:] == ["validasi"]:
        validasi()
    else:
        main(sys.argv[1] if len(sys.argv) > 1 else None)
