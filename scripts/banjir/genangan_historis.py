"""Riwayat genangan Google Flood Forecasting (inundation_history, turunan GLAD 1999-2020) -> persen luas per kecamatan
dan lapisan peta. Data STATIS (sekali pasang, tidak masuk banjir.yml).

Sumber: https://storage.googleapis.com/flood-forecasting/inundation_history/data/ (publik, tanpa kunci, CC BY 4.0).
Tiap ubin = tiga fitur MultiPolygon: High_risk (piksel 128 m basah >= 5% waktu), Medium_risk (>= 1%), Low_risk (>= 0,5%).
Badan air tetap sudah dibuang dari poligon, jadi persen kecamatan = bagian luas kecamatan (termasuk airnya) yang
tergenang musiman/berkala, BUKAN bagian dari lahan kering saja.

Langkah:
  tarik    unduh 108 ubin yang memotong Indonesia -> data/raw/banjir/genangan_historis/*.geojson.gz (lewati yang ada)
  kec      -> public/banjir/data/genangan_historis_kec.json
  lapisan  -> public/banjir/data/genangan_historis/<kode provinsi>.json (poligon disederhanakan, hanya di daratan RI)
  uji      luring, data mainan

Metode `kec`: kisi sampling 0,002 derajat (~222 m di ekuator, ~2 piksel sumber). Poligon tiap kelas diisi ke raster
(titik tengah sel di dalam poligon = basah, aturan genap-ganjil sehingga lubang benar); kecamatan diisi dengan aturan
yang sama, lalu sel dihitung per kelas. Kelas bersarang: tiap sel dihitung pada kelas TERTINGGI yang meliputinya, jadi yang disimpan persen per kelas
eksklusif tinggi/sedang/rendah (bukan kumulatif).
Galat sampling ~ 0,5/sqrt(N) titik-persentase untuk N sel kecamatan (N = 1.000 sel ~ 49 km2: paling buruk +-1,6 poin);
kecamatan di bawah ~10 km2 (N < 200) kurang dapat diandalkan. Batas kecamatan = public/geo/kecamatan (sudah disederhanakan).

Pakai:  python3 scripts/banjir/genangan_historis.py tarik|kec|lapisan|uji
"""
import gzip, json, math, os, sys, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, MENTAH, simpan
from wilayah import AKAR, PROVINSI, Wilayah, _cincin

DAFTAR = "https://storage.googleapis.com/storage/v1/b/flood-forecasting/o"
UNDUH = "https://storage.googleapis.com/flood-forecasting/"
AWALAN = "inundation_history/data/"
BBOX = (-11.5, 94.5, 6.5, 141.5)   # min_lat, min_lon, max_lat, max_lon Indonesia
MENTAH_G = os.path.join(MENTAH, "genangan_historis")
RES = 0.002                        # derajat per sel sampling
KELAS = {"Low_risk": 1, "Medium_risk": 2, "High_risk": 3}
NAMA = ["rendah", "sedang", "tinggi"]  # indeks kelas - 1
SUMBER = "Google Flood Forecasting, riwayat genangan (GLAD 1999-2020), CC BY 4.0"


# ---------- tarik ----------
def daftar():
    out, token = [], None
    while True:
        q = {"prefix": AWALAN, "fields": "items(name,size),nextPageToken"}
        if token:
            q["pageToken"] = token
        with urllib.request.urlopen(f"{DAFTAR}?{urllib.parse.urlencode(q)}", timeout=60) as r:
            d = json.load(r)
        out += d.get("items", [])
        token = d.get("nextPageToken")
        if not token:
            return out


def bbox_nama(nama):
    """'.../inundation_history_{min_lat}_{min_lng}_{max_lat}_{max_lng}.geojson' -> (min_lat, min_lng, max_lat, max_lng)"""
    return tuple(map(float, os.path.basename(nama)[len("inundation_history_"):-len(".geojson")].split("_")))


def memotong(b):
    return b[2] > BBOX[0] and b[0] < BBOX[2] and b[3] > BBOX[1] and b[1] < BBOX[3]


def tarik():
    os.makedirs(MENTAH_G, exist_ok=True)
    pilih = [x["name"] for x in daftar() if memotong(bbox_nama(x["name"]))]
    print(f"{len(pilih)} ubin memotong Indonesia")

    def satu(nama):
        tujuan = os.path.join(MENTAH_G, os.path.basename(nama) + ".gz")
        if os.path.exists(tujuan):
            return 0
        for i in range(4):
            try:
                with urllib.request.urlopen(UNDUH + urllib.parse.quote(nama), timeout=180) as r:
                    isi = r.read()
                json.loads(isi)  # rusak -> ulang
                with gzip.open(tujuan + ".tmp", "wb", 6) as f:
                    f.write(isi)
                os.replace(tujuan + ".tmp", tujuan)
                return 1
            except Exception as e:
                if i == 3:
                    raise RuntimeError(f"{nama}: {e}")
        return 0
    with ThreadPoolExecutor(6) as ex:
        baru = sum(ex.map(satu, pilih))
    print(f"unduh baru {baru}, total {len(pilih)}")


def berkas_ubin():
    return sorted(os.path.join(MENTAH_G, f) for f in os.listdir(MENTAH_G) if f.endswith(".geojson.gz"))


def baca(jalur):
    with gzip.open(jalur, "rt") as f:
        return json.load(f)["features"]


# ---------- raster ----------
def isi_poligon(cincin_daftar, lon0, lat1, res, baris, kolom, lari):
    """Aturan genap-ganjil pada titik tengah sel. cincin_daftar: [[(lon,lat)...]...]. Memanggil lari(r, c_awal, c_akhir)
    (c_akhir eksklusif) untuk tiap bentang sel di dalam. Baris r=0 paling utara; titik tengah sel (r,c) = (lon0+(c+.5)res, lat1-(r+.5)res)."""
    silang = {}
    for ring in cincin_daftar:
        n = len(ring)
        for i in range(n):
            x1, y1 = ring[i]
            x2, y2 = ring[(i + 1) % n]
            if y1 == y2:
                continue
            if y1 > y2:
                x1, y1, x2, y2 = x2, y2, x1, y1
            # baris r dengan y_tengah = lat1-(r+.5)res dalam [y1, y2): r dalam (lat1-y2)/res-.5 < r <= (lat1-y1)/res-.5
            r0 = max(0, math.floor((lat1 - y2) / res - .5) + 1)
            r1 = min(baris - 1, math.floor((lat1 - y1) / res - .5))
            if r0 > r1:
                continue
            m = (x2 - x1) / (y2 - y1)
            for r in range(r0, r1 + 1):
                silang.setdefault(r, []).append(x1 + m * (lat1 - (r + .5) * res - y1))
    for r, xs in silang.items():
        xs.sort()
        for j in range(0, len(xs) - 1, 2):
            a = max(0, math.ceil((xs[j] - lon0) / res - .5))
            b = min(kolom, math.ceil((xs[j + 1] - lon0) / res - .5))
            if b > a:
                lari(r, a, b)


def cincin_fitur(g):
    if "coordinates" not in g:   # GeometryCollection kosong (ubin tanpa genangan)
        return []
    bagian = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    return [[tuple(p[:2]) for p in ring] for poly in bagian for ring in poly]


def raster_kosong(res=RES):
    kolom = round((BBOX[3] - BBOX[1]) / res)
    baris = round((BBOX[2] - BBOX[0]) / res)
    return [bytearray(kolom) for _ in range(baris)], baris, kolom


def isi_ubin(rs, baris, kolom, fitur_daftar, res=RES):
    """Tulis kelas ke raster rs (daftar bytearray per baris); urutan rendah -> tinggi supaya kelas tertinggi menimpa."""
    for f in sorted(fitur_daftar, key=lambda f: KELAS[f["properties"]["name"]]):
        k = KELAS[f["properties"]["name"]]
        def lari(r, a, b, k=k):
            rs[r][a:b] = bytes([k]) * (b - a)
        isi_poligon(cincin_fitur(f["geometry"]), BBOX[1], BBOX[2], res, baris, kolom, lari)


def hitung_kec(rs, baris, kolom, kec_cincin, res=RES):
    """kec_cincin: {kunci: [cincin...]} -> {kunci: [n_sel, n_rendah, n_sedang, n_tinggi]} (kelas eksklusif)."""
    hasil = {}
    for kunci, rings in kec_cincin.items():
        h = [0, 0, 0, 0]
        def lari(r, a, b):
            seg = rs[r][a:b]
            h[0] += b - a
            for k in (1, 2, 3):
                h[k] += seg.count(k)
        isi_poligon(rings, BBOX[1], BBOX[2], res, baris, kolom, lari)
        hasil[kunci] = h
    return hasil


def muat_kec():
    out = {}
    for kode in PROVINSI:
        for f in json.load(open(os.path.join(AKAR, "public/geo/kecamatan", f"{kode}.json")))["features"]:
            k = f"{kode}|{f['properties']['kab']}|{f['properties']['kec']}"
            out.setdefault(k, []).extend(cincin_fitur(f["geometry"]))
    return out


def kec():
    ub = berkas_ubin()
    assert len(ub) >= 100, f"hanya {len(ub)} ubin; jalankan tarik dulu"
    rs, baris, kolom = raster_kosong()
    for i, j in enumerate(ub):
        isi_ubin(rs, baris, kolom, baca(j))
        if i % 10 == 0:
            print(f"  raster {i + 1}/{len(ub)}", flush=True)
    h = hitung_kec(rs, baris, kolom, muat_kec())
    out, nol = {}, 0
    for k, (n, lo, me, hi) in h.items():
        if n == 0:   # kecamatan lebih kecil dari satu sel
            nol += 1
            continue
        out[k] = [round(100 * hi / n, 1), round(100 * me / n, 1), round(100 * lo / n, 1)]
    simpan(os.path.join(KELUAR, "genangan_historis_kec.json"), {
        "sumber": SUMBER, "periode": "1999-2020", "resolusi_derajat": RES, "n_kec": len(out),
        "kolom": ["tinggi", "sedang", "rendah"],
        "arti": "persen luas kecamatan per kelas eksklusif: tinggi = piksel basah >= 5% waktu, sedang = 1-5%, rendah = 0,5-1%; badan air tetap dibuang dari sumber",
        "galat": "sampling kisi 0,002 derajat (~222 m); +-0,5/sqrt(jumlah sel) poin, kecamatan < 10 km2 kurang andal",
        "kec": out})
    print(f"{len(out)} kecamatan ({nol} lebih kecil dari satu sel dilewati)")


# ---------- lapisan ----------
def dp(pts, eps):
    """Douglas-Peucker iteratif untuk garis terbuka."""
    if len(pts) < 3:
        return pts
    simpan_ = [False] * len(pts)
    simpan_[0] = simpan_[-1] = True
    tumpuk = [(0, len(pts) - 1)]
    while tumpuk:
        a, b = tumpuk.pop()
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1
        d2 = dx * dx + dy * dy
        jmax, imax = -1.0, -1
        for i in range(a + 1, b):
            x, y = pts[i]
            if d2 == 0:
                d = (x - x1) ** 2 + (y - y1) ** 2
            else:
                t = ((x - x1) * dx + (y - y1) * dy) / d2
                t = max(0, min(1, t))
                d = (x - x1 - t * dx) ** 2 + (y - y1 - t * dy) ** 2
            if d > jmax:
                jmax, imax = d, i
        if jmax > eps * eps:
            simpan_[imax] = True
            tumpuk += [(a, imax), (imax, b)]
    return [p for p, s in zip(pts, simpan_) if s]


def luas_cincin(r):
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(r, r[1:] + r[:1]))) / 2


def sederhana(geom, eps, luas_min):
    """MultiPolygon -> daftar poligon [[ring luar, lubang...]] disederhanakan; ring luar < luas_min (deg2) dan lubang
    < luas_min dibuang; koordinat dibulatkan 3 desimal (~110 m)."""
    out = []
    bagian = (geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]) if "coordinates" in geom else []
    for poly in bagian:
        cin = []
        for i, ring in enumerate(poly):
            ring = [tuple(p[:2]) for p in ring]
            if ring[0] == ring[-1]:
                ring = ring[:-1]
            if luas_cincin(ring) < luas_min:
                if i == 0:
                    break
                continue
            s = dp(ring, eps)
            if len(s) < 3 or luas_cincin(s) < luas_min / 2:
                if i == 0:
                    break
                continue
            cin.append([[round(x, 3), round(y, 3)] for x, y in s] + [[round(s[0][0], 3), round(s[0][1], 3)]])
        else:
            if cin:
                out.append(cin)
            continue
        # break di ring luar: poligon dibuang
    return out


def titik_dalam(ring):
    """Satu titik yang pasti (hampir selalu) di dalam ring luar: titik tengah garis horizontal terpendek-pertama pada lintang tengah."""
    ys = [p[1] for p in ring]
    y = (min(ys) + max(ys)) / 2
    xs = sorted(ring[i][0] + (y - ring[i][1]) * (ring[(i + 1) % len(ring)][0] - ring[i][0]) / (ring[(i + 1) % len(ring)][1] - ring[i][1])
                for i in range(len(ring)) if (ring[i][1] > y) != (ring[(i + 1) % len(ring)][1] > y))
    return ((xs[0] + xs[1]) / 2, y) if len(xs) >= 2 else ring[0]


def lapisan(eps=0.003, luas_min=4e-6):
    """Per provinsi (kode dari kecamatan yang memuat titik dalam poligon); poligon di luar daratan RI dibuang."""
    ub = berkas_ubin()
    assert len(ub) >= 100, f"hanya {len(ub)} ubin; jalankan tarik dulu"
    w = Wilayah()
    per = {}  # kode -> {kelas: [poligon]}
    buang = 0
    for i, j in enumerate(ub):
        for f in baca(j):
            k = KELAS[f["properties"]["name"]]
            for poly in sederhana(f["geometry"], eps, luas_min):
                lon, lat = titik_dalam([tuple(p) for p in poly[0][:-1]])
                c = w.cari(lon, lat) or w.cari(*poly[0][0])
                if not c:
                    buang += 1
                    continue
                per.setdefault(c[0], {1: [], 2: [], 3: []})[k].append(poly)
        if i % 10 == 0:
            print(f"  ubin {i + 1}/{len(ub)}", flush=True)
    sd = os.path.join(KELUAR, "genangan_historis")
    os.makedirs(sd, exist_ok=True)
    for lama in os.listdir(sd):
        os.remove(os.path.join(sd, lama))
    idx = {}
    for kode, d in sorted(per.items()):
        fit = [{"type": "Feature", "properties": {"k": NAMA[k - 1]},
                "geometry": {"type": "MultiPolygon", "coordinates": d[k]}} for k in (1, 2, 3) if d[k]]
        simpan(os.path.join(sd, f"{kode}.json"), {"type": "FeatureCollection", "sumber": SUMBER, "features": fit})
        xy = [p for k in (1, 2, 3) for poly in d[k] for p in poly[0]]
        idx[kode] = {"bytes": os.path.getsize(os.path.join(sd, f"{kode}.json")),
                     "kotak": [min(p[0] for p in xy), min(p[1] for p in xy), max(p[0] for p in xy), max(p[1] for p in xy)]}
    simpan(os.path.join(sd, "indeks.json"), {"sumber": SUMBER, "prov": idx})
    idx = {k: v["bytes"] for k, v in idx.items()}
    tot = sum(idx.values())
    print(f"{len(idx)} provinsi, total {tot / 1e6:.1f} MB, terbesar {max(idx.values()) / 1e6:.2f} MB, {buang} poligon di luar RI dibuang")


# ---------- uji ----------
def uji():
    res = 0.1
    # persegi 0,5 x 0,5 pada (10,-5): kisi 0,1 -> 25 sel titik tengah di dalam
    rs = [bytearray(30) for _ in range(30)]
    jml = [0]
    def lari(r, a, b):
        jml[0] += b - a
        rs[r][a:b] = b"\x01" * (b - a)
    pers = [(0.0, 0.0), (0.5, 0.0), (0.5, 0.5), (0.0, 0.5)]
    isi_poligon([pers], 0.0, 3.0, res, 30, 30, lari)
    assert jml[0] == 25, jml
    # lubang (genap-ganjil): persegi 0,5 dengan lubang 0,2 -> 25 - 4 = 21
    jml[0] = 0
    lubang = [(0.1, 0.1), (0.3, 0.1), (0.3, 0.3), (0.1, 0.3)]
    isi_poligon([pers, lubang], 0.0, 3.0, res, 30, 30, lari)
    assert jml[0] == 21, jml
    # kelas membedakan: tinggi menimpa rendah; kecamatan setengah luas persegi
    global BBOX
    asli = BBOX
    BBOX = (0.0, 0.0, 3.0, 3.0)
    try:
        rs, baris, kolom = raster_kosong(res)
        assert (baris, kolom) == (30, 30)
        kot = lambda x0, y0, x1, y1: [[(x0, y0), (x1, y0), (x1, y1), (x0, y1)]]
        mk = lambda nama, c: {"properties": {"name": nama}, "geometry": {"type": "Polygon", "coordinates": [[list(p) for p in c[0]]]}}
        isi_ubin(rs, baris, kolom, [mk("High_risk", kot(0, 0, 1, 1)), mk("Low_risk", kot(0, 0, 2, 1)), mk("Medium_risk", kot(0, 0, 1.5, 1))], res)
        h = hitung_kec(rs, baris, kolom, {"a": kot(0, 0, 2, 1), "b": kot(2, 0, 3, 1), "c": kot(0, 0, 1, 0.5)}, res)
        # a: 200 sel = tinggi 100, sedang 50 (1-1,5), rendah 50 (1,5-2)
        assert h["a"] == [200, 50, 50, 100], h["a"]
        assert h["b"] == [100, 0, 0, 0], h["b"]
        assert h["c"] == [50, 0, 0, 50], h["c"]
        # luas: jumlah sel * res^2 = luas poligon (200 * 0,01 = 2)
        assert abs(h["a"][0] * res * res - 2.0) < 1e-9
    finally:
        BBOX = asli
    # nama ubin & pemotongan bbox Indonesia
    b = bbox_nama("inundation_history/data/inundation_history_-0.000_94.8_1.886_97.4.geojson")
    assert b == (0.0, 94.8, 1.886, 97.4) and memotong(b)
    assert not memotong(bbox_nama("inundation_history_-0.000_-50.019_1.886_-47.449.geojson"))
    # penyederhanaan: garis lurus berlebih hilang, lekukan besar tetap; cincin kecil dibuang
    assert len(dp([(0, 0), (1, 0.0001), (2, 0)], 0.01)) == 2
    assert len(dp([(0, 0), (1, 1), (2, 0)], 0.01)) == 3
    g = {"type": "MultiPolygon", "coordinates": [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]], [[[5, 5], [5.0001, 5], [5.0001, 5.0001], [5, 5]]]]}
    s = sederhana(g, 0.001, 1e-6)
    assert len(s) == 1 and len(s[0][0]) == 5, s
    print("uji genangan_historis: hijau")


if __name__ == "__main__":
    {"tarik": tarik, "kec": kec, "lapisan": lapisan, "uji": uji}[sys.argv[1] if len(sys.argv) > 1 else "uji"]()
