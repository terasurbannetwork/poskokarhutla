"""Estimasi INDEPENDEN luas terbakar tahunan Indonesia: sampling acak berlapis + penandaan citra (Olofsson dkk. 2014) -> data/riset/luas_resmi/
(keputusan pemilik 25 Okt 2026; pembanding luas resmi BNPB/KLHK, data/laporan-bnpb/metode-2026-10-25/riwayat.json).

Kerangka: daratan Indonesia pada kisi 0,003375 derajat (~375 m; kisi sel yang sama dengan peta_karhutla) dari poligon public/geo/kecamatan (bagian luar, seperti Wilayah).
  A = sel yang punya >= 1 deteksi VIIRS keyakinan n/h tahun Y (sensor per tahun: TAHUN), tanpa sel sumber panas tetap (titik_palsu.sel_industri) dan type FIRMS 0/kosong;
  B = cincin <= 2 km di luar A (bekas bakar yang luput deteksi);
  C = sisa daratan di provinsi yang punya deteksi tahun Y. (Provinsi tanpa deteksi = tak diamati; luasnya dilaporkan, tidak disampel.)
  Tiap strata dibagi gambut (public/data/lahan/gambut.geojson) / mineral. Luas strata = jumlah sel x luas sel (cos lintang), PERSIS menurut kisi.
Penandaan: Sentinel-2 L2A (Earth Search STAC), jendela 3x3 piksel 20 m di titik, dNBR = NBR pra - NBR pasca (NBR = (B8A-B12)/(B8A+B12)), aturan luas_citra:
  terbakar bila dNBR >= 0,27 DAN NBR pasca < 0,2; tidak terbakar bila dNBR < 0,1 atau (dNBR >= 0,27 tetapi NBR pasca >= 0,2: panen/pertanian, bukan bekas bakar); dNBR 0,1-0,27 / tanpa pasangan bersih = 'ragu'.
Pra/pasca strata A,B: citra bersih terakhir sebelum deteksi pertama dalam 2 km / bersih pertama sesudah deteksi terakhir (sampai 180 hari); strata C: Mei-Jul / Okt-Des.
Landsat 8 (2015) BELUM dibuat: Earth Search menyimpan asetnya di bucket requester-pays (lihat citra.py); perlu sumber lain (mis. Planetary Computer) dan masker QA_PIXEL.

Pakai:  python3 scripts/data/sampling_luas.py kerangka [tahun]     # kisi + strata + titik sampel -> rancangan_<tahun>.csv, strata_<tahun>.json (offline, ~2-4 menit)
        python3 scripts/data/sampling_luas.py tandai [tahun] [shard n] [maks]   # jaringan; lanjut dari cache data/raw/sampling_luas/<tahun>/
        python3 scripts/data/sampling_luas.py ringkas [tahun]      # sampel_<tahun>.csv, ringkasan_<tahun>.json, RINGKASAN.md
        python3 scripts/data/sampling_luas.py uji                  # self-check tanpa jaringan
Butuh hanya stdlib. Ganti tahun = ganti argumen + entri TAHUN (berkas titik, sensor citra).
"""
import array, bisect, csv, datetime as dt, hashlib, json, math, os, random, re, sys, time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wilayah import AKAR, PROVINSI  # noqa: E402

FIRMS = os.path.join(AKAR, "data/raw/firms")
KELUAR = os.path.join(AKAR, "data/riset/luas_resmi")
CACHE = os.path.join(AKAR, "data/raw/sampling_luas")
SEL = 0.003375
LON0, LAT0, LON1, LAT1 = 94.9, 6.2, 141.1, -11.2
R_KM = 6371.0088
RADIUS_B = 2000 / 375.0            # sel
TAHUN = {2023: {"berkas": ["viirs.csv", "viirs_noaa20.csv"], "citra": "s2", "n20": "viirs_noaa20.csv"},
         2019: {"berkas": ["viirs.csv", "viirs_noaa20.csv"], "citra": "s2", "n20": "viirs_noaa20.csv"},
         2015: {"berkas": ["viirs.csv"], "citra": "landsat", "n20": None}}
RESMI = {2015: 2611411, 2019: 1649258, 2023: 1161193}
ALOKASI = {"A": 400, "B": 300, "C": 300}
MIN_SEL = 50
F20 = 4.12
DNBR, NBR_PASCA, DNBR_BAWAH = 0.27, 0.1, 0.1
NIR_MIN = 0.02                    # B8A pasca harus lebih rendah dari pra sekurangnya segini (reflektans)
MAKS_CELAH = 60                   # hari antara adegan pra dan pasca
MUSIM_BC = 7                      # strata B,C: adegan pasca harus bulan >= 7 (musim kemarau-pasca)
REF_MIN, REF_MAKS = -0.02, 1.5    # reflektans wajar sesudah skala + offset; di luar ini = tak sah
RING_MIN = 80                     # piksel cincin sah minimum untuk kontrol latar
THUMB_TIDAK_PER_MIL = 115         # ~100 titik 'tidak' dari ~870 ikut dibuatkan gambar
NP = 65                           # tambalan 65 x 65 piksel 20 m (1,3 km); piksel tengah = indeks 32
PUSAT = (31, 34)
SUM_MIN = 0.05                    # B8A + B12 minimum agar NBR bermakna (air/bayangan gelap memberi penyebut ~0 dan dNBR > 2)
BURUK_PIKSEL = {0, 1, 3, 6, 8, 9, 10}
BURUK_AWAN = {0, 3, 8, 9, 10}
RING_IDX = [y * 65 + x for y in range(65) for x in range(65) if 25 <= math.hypot(y - 32, x - 32) <= 45]      # cincin 500-900 m dari titik
STAC = "https://earth-search.aws.element84.com/v1/search"


def _pasang_ulang():
    """citra.ambil (STAC + COG) dicoba ulang 4x dengan jeda 3, 6, 9 dtk di atas 3x bawaannya: putus jaringan sesaat tidak menggagalkan titik."""
    import citra as C
    if getattr(C.ambil, "ulang", False):
        return
    asli = C.ambil
    def ambil(*a, **k):
        for i in range(4):
            try:
                return asli(*a, **k)
            except Exception:
                if i == 3:
                    raise
                time.sleep(3 * (i + 1))
    ambil.ulang = True
    C.ambil = ambil


_pasang_ulang()
IO = ThreadPoolExecutor(int(os.environ.get("SAMPLING_IO", 16)))      # hanya tugas daun (satu bacaan COG); tidak boleh menunggu tugas IO lain


# ------------------------------------------------------------------ kerangka (murni)
class Kisi:
    def __init__(self, sel=SEL, lon0=LON0, lat0=LAT0, lon1=LON1, lat1=LAT1):
        self.sel, self.lon0, self.lat0 = sel, lon0, lat0
        self.W, self.H = math.ceil((lon1 - lon0) / sel), math.ceil((lat0 - lat1) / sel)
        self.darat = bytearray(self.W * self.H)       # indeks provinsi 1..n; 0 = bukan daratan
        self.gambut = bytearray(self.W * self.H)      # 1 = gambut (hanya dihitung di daratan)
        rr = RADIUS_B
        self.disc = [dr * self.W + dc for dr in range(-math.ceil(rr), math.ceil(rr) + 1) for dc in range(-math.ceil(rr), math.ceil(rr) + 1) if dr * dr + dc * dc <= rr * rr]
        self.disc_rc = [(dr, dc) for dr in range(-math.ceil(rr), math.ceil(rr) + 1) for dc in range(-math.ceil(rr), math.ceil(rr) + 1) if dr * dr + dc * dc <= rr * rr]

    def sel_rc(self, lat, lon):
        r, c = int((self.lat0 - lat) // self.sel), int((lon - self.lon0) // self.sel)
        return (r, c) if 0 <= r < self.H and 0 <= c < self.W else None

    def pusat(self, r, c):
        return self.lat0 - (r + .5) * self.sel, self.lon0 + (c + .5) * self.sel

    def luas_ha(self, r):
        """luas sel di baris r (ha)."""
        lat = math.radians(self.lat0 - (r + .5) * self.sel)
        return math.radians(self.sel) ** 2 * R_KM ** 2 * math.cos(lat) * 100

    def isi(self, buf, cincin, nilai):
        """cat cincin (bujur, lintang) ke buf dengan aturan genap-ganjil; sel dalam bila PUSAT sel di dalam poligon."""
        s, rows = self.sel, {}
        for i in range(len(cincin)):
            x1, y1 = cincin[i - 1][0], cincin[i - 1][1]
            x2, y2 = cincin[i][0], cincin[i][1]
            if y1 == y2:
                continue
            ymax, ymin = (y1, y2) if y1 > y2 else (y2, y1)
            r0 = max(0, math.floor((self.lat0 - ymax) / s - .5) + 1)
            r1 = min(self.H - 1, math.floor((self.lat0 - ymin) / s - .5))
            k = (x2 - x1) / (y2 - y1)
            for r in range(r0, r1 + 1):
                x = x1 + (self.lat0 - (r + .5) * s - y1) * k
                rows.setdefault(r, []).append(math.ceil((x - self.lon0) / s - .5))
        for r, cs in rows.items():
            cs.sort()
            for a, b in zip(cs[::2], cs[1::2]):
                a, b = max(0, a), min(self.W, b)
                if b > a:
                    buf[r * self.W + a:r * self.W + b] = bytes([nilai]) * (b - a)

    def hitung(self, A, per_prov_min=1):
        """A: set indeks datar sel bertitik. -> dict hasil (tabel strata + daftar sel per strata), mengikuti definisi A/B/C."""
        W = self.W
        A = {i for i in A if self.darat[i]}
        B = set()
        n = len(self.darat)
        for i in A:
            for o in self.disc:
                j = i + o
                if 0 <= j < n and self.darat[j] and j not in A:
                    B.add(j)
        prov_ada = {self.darat[i] for i in A}
        cnt = {(h, g): 0 for h in "ABCD" for g in (0, 1)}
        ha = dict.fromkeys(cnt, 0.0)
        sel_c = ([], [])                       # indeks sel C per gambut
        pat = re.compile(rb"[^\x00]+")
        for r in range(self.H):
            L = self.darat[r * W:(r + 1) * W]
            if L.count(0) == W:
                continue
            w, base = self.luas_ha(r), r * W
            for m in pat.finditer(L):
                for c in range(m.start(), m.end()):
                    i = base + c
                    g = self.gambut[i]
                    h = "A" if i in A else "B" if i in B else "C" if L[c] in prov_ada else "D"
                    cnt[h, g] += 1
                    ha[h, g] += w
                    if h == "C":
                        sel_c[g].append(i)
        return {"A": A, "B": B, "C": sel_c, "cnt": cnt, "ha": ha, "prov_ada": prov_ada}

    def strata_dari_sel(self, i, A, B):
        """strata sebuah indeks sel menurut kisi (pembanding independen untuk uji)."""
        if not self.darat[i]:
            return None
        return "A" if i in A else "B" if i in B else "C"


def alokasi(ha, total=ALOKASI, minimum=MIN_SEL):
    """{strata: n} -> {(strata, gambut): n}: proporsional luas gambut/mineral, minimum per sel strata."""
    out = {}
    for h, n in total.items():
        tot = ha[h, 0] + ha[h, 1]
        if not tot:
            continue
        ng = max(minimum, round(n * ha[h, 1] / tot)) if ha[h, 1] else 0
        nm = max(minimum, n - ng) if ha[h, 0] else 0
        out[h, 1], out[h, 0] = ng, nm
    return out


def titik_acak(kisi, hasil, n_sel, seed):
    """-> list (strata, gambut, lat, lon, indeks sel); seragam di dalam sel, sel dipilih seragam di strata."""
    rng = random.Random(seed)
    out = []
    daftar = {("A", 0): [], ("A", 1): [], ("B", 0): [], ("B", 1): []}
    for h in "AB":
        for i in sorted(hasil[h]):
            daftar[h, kisi.gambut[i]].append(i)
    daftar["C", 0], daftar["C", 1] = hasil["C"][0], hasil["C"][1]
    for (h, g) in sorted(n_sel):
        pool = daftar[h, g]
        for i in rng.sample(range(len(pool)), min(n_sel[h, g], len(pool))):
            idx = pool[i]
            r, c = divmod(idx, kisi.W)
            out.append((h, g, kisi.lat0 - (r + rng.random()) * kisi.sel, kisi.lon0 + (c + rng.random()) * kisi.sel, idx))
    return out


# ------------------------------------------------------------------ estimator (murni)
def taksir(strata, adj=False):
    """strata: [(luas_ha, n, x)] dengan x = banyak titik terbakar dari n titik sah.
    -> (luas_terbakar_ha, se_ha). Stratified simple random sampling: L = sum A_h p_h, Var = sum A_h^2 p_h(1-p_h)/(n_h-1) (Olofsson dkk. 2014, pers. 5-6, tanpa pemetaan:
    p_h langsung dari acuan). adj=True: p dalam varians diganti (x+0,5)/(n+1) agar strata dengan p=0 tidak berselisih nol (konservatif)."""
    L = V = 0.0
    for A, n, x in strata:
        if n < 1:
            continue
        p = x / n
        L += A * p
        q = (x + .5) / (n + 1) if adj else p
        V += A * A * q * (1 - q) / max(1, n - 1)
    return L, math.sqrt(V)


# ------------------------------------------------------------------ data titik
def baca_titik(tahun, industri):
    """-> (daftar (lat, lon, ordinal_hari, sat), jumlah N20 tersaring, jumlah N20 mentah n/h)."""
    import titik_palsu as TP
    cfg, pts, n20_saring, n20_mentah = TAHUN[tahun], [], 0, 0
    for nama in cfg["berkas"]:
        sat = "N20" if nama == cfg["n20"] else "N"
        for r in csv.DictReader(open(os.path.join(FIRMS, nama))):
            d = r["acq_date"]
            if d[:4] != str(tahun) or r["confidence"] not in ("n", "h"):
                continue
            if sat == "N20":
                n20_mentah += 1
            if r.get("type", "0") not in ("0", "") or TP.sel(r["latitude"], r["longitude"]) in industri:
                continue
            if sat == "N20":
                n20_saring += 1
            pts.append((float(r["latitude"]), float(r["longitude"]), dt.date.fromisoformat(d).toordinal(), sat))
    return pts, n20_saring, n20_mentah


def muat_kisi():
    """Kisi berisi daratan (provinsi) dan gambut."""
    k = Kisi()
    kode = sorted(PROVINSI)
    for n, kd in enumerate(kode, 1):
        for f in json.load(open(os.path.join(AKAR, "public/geo/kecamatan", kd + ".json")))["features"]:
            g = f["geometry"]
            for poly in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]):
                k.isi(k.darat, poly[0], n)
    tmp = bytearray(len(k.gambut))
    for f in json.load(open(os.path.join(AKAR, "public/data/lahan/gambut.geojson")))["features"]:
        g = f["geometry"]
        for poly in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]):
            k.isi(tmp, poly[0], 1)
    k.gambut = bytearray(a & (1 if b else 0) for a, b in zip(tmp, k.darat))
    return k, kode


def kerangka(tahun):
    import titik_palsu as TP
    t0 = time.time()
    industri, _ = TP.sel_industri()
    pts, n20s, n20m = baca_titik(tahun, industri)
    print("titik n/h tersaring %d (N20 tersaring %d / mentah %d) %.0fs" % (len(pts), n20s, n20m, time.time() - t0), flush=True)
    kisi, kode = muat_kisi()
    print("kisi %dx%d, daratan %d sel %.0fs" % (kisi.W, kisi.H, sum(1 for _ in re.finditer(rb"[^\x00]+", bytes(kisi.darat))), time.time() - t0), flush=True)
    det, luar = {}, 0
    for lat, lon, o, sat in pts:
        rc = kisi.sel_rc(lat, lon)
        i = rc and rc[0] * kisi.W + rc[1]
        if rc is None or not kisi.darat[i]:
            luar += 1
            continue
        a = det.setdefault(i, [o, o])
        a[0], a[1] = min(a[0], o), max(a[1], o)
    h = kisi.hitung(set(det))
    print("strata dihitung %.0fs" % (time.time() - t0), flush=True)
    n_sel = alokasi(h["ha"])
    sampel = titik_acak(kisi, h, n_sel, seed=tahun * 1000 + 7)
    os.makedirs(KELUAR, exist_ok=True)
    nm = {"A": 0, "B": 0, "C": 0}
    with open(os.path.join(KELUAR, "rancangan_%d.csv" % tahun), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "strata", "gambut", "lat", "lon", "prov", "d_pertama", "d_terakhir", "n_deteksi_2km"])
        for hh, g, lat, lon, idx in sampel:
            nm[hh] += 1
            ds = [det[j] for j in (idx + dr * kisi.W + dc for dr, dc in kisi.disc_rc) if j in det]
            if ds:
                dp, dl = dt.date.fromordinal(min(a for a, _ in ds)).isoformat(), dt.date.fromordinal(max(b for _, b in ds)).isoformat()
            else:
                dp = dl = ""
            w.writerow(["%s%s%03d" % (hh, "G" if g else "M", nm[hh]), hh, g, round(lat, 6), round(lon, 6), kode[kisi.darat[idx] - 1], dp, dl, len(ds)])
    ringk = {"tahun": tahun, "sel_derajat": SEL, "radius_B_m": 2000, "titik_nh_tersaring": len(pts), "titik_di_luar_daratan": luar, "n20_tersaring": n20s, "n20_mentah": n20m,
             "metode_web_ha": round(n20s * F20) if TAHUN[tahun]["n20"] else None, "resmi_ha": RESMI.get(tahun), "sel_A_unik": len(h["A"]),
             "provinsi_tanpa_deteksi": [PROVINSI[kode[i - 1]] for i in range(1, len(kode) + 1) if i not in h["prov_ada"]],
             "strata": [{"strata": s, "gambut": g, "sel": h["cnt"][s, g], "luas_ha": round(h["ha"][s, g], 1), "n": n_sel.get((s, g), 0)} for s in "ABCD" for g in (0, 1)]}
    json.dump(ringk, open(os.path.join(KELUAR, "strata_%d.json" % tahun), "w"), ensure_ascii=False, indent=1)
    print(json.dumps(ringk, ensure_ascii=False, indent=1))


# ------------------------------------------------------------------ penandaan citra
def epsg_zona(item):
    p = item["properties"]
    return (p.get("proj:epsg") or int(str(p.get("proj:code", "0")).split(":")[-1])) % 100


def tambal(item, aset, lat, lon, tinggi_res=False):
    """-> (array per sampel [NP*NP], skala, offset): tambalan NP x NP piksel 20 m berpusat di titik. tinggi_res: aset 10 m dibaca dari overview 20 m."""
    import citra as C
    a = item["assets"][aset]
    c = C.COG(a["href"])
    E, N = C.ke_utm(lat, lon, epsg_zona(item))
    tr = a["proj:transform"]
    sisi = NP * 20
    lv = C.level_untuk(c, tr[0], 20) if tinggi_res else 0
    rb = (a.get("raster:bands") or [{}])[0]
    return c.contoh(lv, tr[2], tr[5], tr[0], E - sisi / 2, N + sisi / 2, sisi, NP), rb.get("scale", 1e-4), rb.get("offset", 0)


def scl_bersih(v):
    """v: SCL NP*NP. bersih bila 7x7 tengah tanpa awan/bayangan/kosong dan <= 15% awan di 21x21 tengah."""
    def blok(k):
        a = NP // 2 - k
        return [v[y * NP + x] for y in range(a, a + 2 * k + 1) for x in range(a, a + 2 * k + 1)]
    return not any(s in BURUK_AWAN for s in blok(3)) and sum(s in BURUK_AWAN for s in blok(10)) <= .15 * 441


def adegan_titik(lat, lon, dari, sampai):
    """semua adegan S2 L2A yang menutup tambalan, satu per tanggal: [(date, item)] urut tanggal. Rentang dipecah <= 120 hari per permintaan (rentang panjang memberi 502)."""
    import citra as C
    per, a, akhir = {}, dt.date.fromisoformat(str(dari)), dt.date.fromisoformat(str(sampai))
    while a <= akhir:
        z = min(akhir, a + dt.timedelta(119))
        q = {"collections": ["sentinel-2-l2a"], "bbox": C.kotak(lat, lon, 1.2), "limit": 200, "datetime": f"{a}T00:00:00Z/{z}T23:59:59Z", "query": {"eo:cloud_cover": {"lt": 90}}}
        for it in json.loads(C.ambil(C.STAC, data=json.dumps(q).encode()))["features"]:
            if not C.menutup(it["geometry"], C.kotak(lat, lon, 1.4)) or not all(it["assets"].get(k, {}).get("href", "").endswith(".tif") for k in ("scl", "nir08", "swir22", "visual")):
                continue        # sebagian adegan 2023 hanya berupa JP2 di bucket requester-pays (s3://sentinel-s2-l2a): dilewati
            d = it["properties"]["datetime"][:10]
            if d not in per or it["properties"].get("eo:cloud_cover", 100) < per[d]["properties"].get("eo:cloud_cover", 100):
                per[d] = it
        a = z + dt.timedelta(1)
    return [(dt.date.fromisoformat(d), per[d]) for d in sorted(per)]


class Titik:
    """Penanda satu titik: cache SCL/pita per adegan."""
    def __init__(self, lat, lon):
        self.lat, self.lon, self.scl, self.nb = lat, lon, {}, {}

    def bersih(self, it):
        k = it["id"]
        if k not in self.scl:
            self.scl[k] = tambal(it, "scl", self.lat, self.lon)[0][0]
        return self.scl[k]

    def pita(self, it):
        """(B8A, B12) reflektans per piksel; None = nodata (DN 0) atau di luar rentang wajar. Skala dan BOA_ADD_OFFSET (-0,1 sejak baseline 04.00) dari raster:bands aset."""
        k = it["id"]
        if k not in self.nb:
            with ThreadPoolExecutor(2) as ex:
                (b8, s8, o8), (b12, s12, o12) = ex.map(lambda a: tambal(it, a, self.lat, self.lon), ("nir08", "swir22"))
            f = lambda v, sk, of: [None if d == 0 or not (REF_MIN <= d * sk + of <= REF_MAKS) else max(0.0, d * sk + of) for d in v[0]]
            self.nb[k] = (f(b8, s8, o8), f(b12, s12, o12))
        return self.nb[k]

    def ukur(self, pra, pasca):
        """-> {dnbr (mentah), nbr_pasca, dnir, latar, n_bersih}. Pusat: 3x3 piksel tengah; piksel sah = SCL bagus di kedua adegan dan B8A + B12 >= SUM_MIN di keduanya; nilai = median.
        latar = median dNBR cincin 500-900 m (RING_IDX; kontrol perubahan musiman seluruh bentang), None bila < RING_MIN piksel sah. dnir = median (B8A pra - B8A pasca)."""
        with ThreadPoolExecutor(2) as ex:
            (a1, c1), (a2, c2) = ex.map(self.pita, (pra, pasca))
        s1, s2 = self.bersih(pra), self.bersih(pasca)
        def px(i):
            if s1[i] in BURUK_PIKSEL or s2[i] in BURUK_PIKSEL or None in (a1[i], c1[i], a2[i], c2[i]) or a1[i] + c1[i] < SUM_MIN or a2[i] + c2[i] < SUM_MIN:
                return None
            n1, n2 = (a1[i] - c1[i]) / (a1[i] + c1[i]), (a2[i] - c2[i]) / (a2[i] + c2[i])
            return n1 - n2, n2, a1[i] - a2[i]
        mid = lambda v: sorted(v)[len(v) // 2]       # median: tahan piksel pencilan
        pu = [q for q in (px(y * NP + x) for y in range(*PUSAT) for x in range(*PUSAT)) if q]
        rg = [q[0] for q in (px(i) for i in RING_IDX) if q]
        latar = mid(rg) if len(rg) >= RING_MIN else None
        if len(pu) < 5:
            return {"dnbr": None, "nbr_pasca": None, "dnir": None, "latar": latar, "n_bersih": len(pu)}
        return {"dnbr": mid([q[0] for q in pu]), "nbr_pasca": mid([q[1] for q in pu]), "dnir": mid([q[2] for q in pu]), "latar": latar, "n_bersih": len(pu)}


def label(dnbr, nbr_pasca, dnir, musim_ok=True, ambang=DNBR):
    """-> ('terbakar'|'tidak'|'ragu', sebab). dnbr = dNBR yang sudah dikoreksi latar. Terbakar: dnbr >= ambang DAN NBR pasca < NBR_PASCA DAN B8A turun >= NIR_MIN DAN musim pasca sah.
    dnbr >= ambang tetapi salah satu syarat lain gagal = tidak (sebab 'bukan_api': panen, savana kering, air). dnbr < DNBR_BAWAH = tidak; di antaranya = ragu (dnbr_sedang); tanpa ukuran = ragu (tanpa_pasangan)."""
    if dnbr is None:
        return "ragu", "tanpa_pasangan"
    if dnbr >= ambang:
        return ("terbakar", "") if nbr_pasca < NBR_PASCA and dnir >= NIR_MIN and musim_ok else ("tidak", "bukan_api")
    return ("tidak", "") if dnbr < DNBR_BAWAH else ("ragu", "dnbr_sedang")


def pasangan(bersih, t, celah=MAKS_CELAH):
    """bersih: [(tanggal, x)] urut. -> (pra, pasca) terdekat yang mengapit t (pra < t < pasca) dengan jeda <= celah hari; None bila tak ada."""
    pre, post = [b for b in bersih if b[0] < t], [b for b in bersih if b[0] > t]
    if not pre or not post or (post[0][0] - pre[-1][0]).days > celah:
        return None
    return pre[-1], post[0]


def jangkar(strata, tahun, d_pertama, d_terakhir):
    """tanggal-tanggal tempat kebakaran 'diandaikan' terjadi, berurutan prioritas. A,B: deteksi pertama, terakhir, tengah; C: tanpa deteksi, musim puncak Sep, Agu, Okt, Jul, Nov."""
    if strata == "C":
        return [dt.date(tahun, m, 15) for m in (9, 8, 10, 7, 11)]
    a, b = dt.date.fromisoformat(d_pertama), dt.date.fromisoformat(d_terakhir)
    out = [a, b] + ([a + (b - a) / 2] if (b - a).days > 30 else [])
    return list(dict.fromkeys(out))


def tandai_titik(row, tahun, simpan_thumb=True):
    """satu baris rancangan -> dict hasil. Galat jaringan dilempar (tidak disimpan, dicoba lagi)."""
    lat, lon, st = float(row["lat"]), float(row["lon"]), row["strata"]
    ja = jangkar(st, tahun, row["d_pertama"], row["d_terakhir"])
    ad = adegan_titik(lat, lon, min(ja) - dt.timedelta(MAKS_CELAH), max(ja) + dt.timedelta(MAKS_CELAH))
    T = Titik(lat, lon)
    dekat = lambda x: min(abs((x[0] - t).days) for t in ja)
    perlu = sorted([x for x in ad if dekat(x) <= MAKS_CELAH], key=dekat)[:40]
    list(IO.map(lambda x: T.bersih(x[1]), perlu))                         # SCL serentak: jaringan, bukan CPU
    bersih = sorted([x for x in perlu if scl_bersih(T.scl[x[1]["id"]])], key=lambda x: x[0])
    hasil = {"id": row["id"], "label": "ragu", "sebab": "tanpa_pasangan", "dnbr": None, "dnbr_mentah": None, "latar": None, "nbr_pasca": None, "dnir": None, "musim_ok": True, "n_bersih": 0,
             "tgl_pra": "", "tgl_pasca": "", "n_adegan": len(ad), "n_bersih_adegan": len(bersih), "percobaan": []}
    pilih, dicoba = None, set()
    rank = {"terbakar": 3, "ragu": 2, "tidak": 1}
    for t in ja:
        pr = pasangan(bersih, t)
        if not pr or (pr[0][0], pr[1][0]) in dicoba or len(dicoba) >= 4:
            continue
        dicoba.add((pr[0][0], pr[1][0]))
        (d1, i1), (d2, i2) = pr
        m = T.ukur(i1, i2)
        eff = m["dnbr"] if m["dnbr"] is None or st == "A" or m["latar"] is None else m["dnbr"] - max(0.0, m["latar"])
        musim = st == "A" or d2.month >= MUSIM_BC
        lb, sb = label(eff, m["nbr_pasca"], m["dnir"], musim)
        hasil["percobaan"].append({"pra": d1.isoformat(), "pasca": d2.isoformat(), "dnbr": eff and round(eff, 4), "label": lb})
        sk = (rank.get(lb, 0), eff if eff is not None else -9)
        if pilih is None or sk > pilih[0]:
            pilih = (sk, d1, i1, d2, i2, m, eff, musim, lb, sb)
        if lb == "terbakar":
            break
    if pilih:
        _, d1, i1, d2, i2, m, eff, musim, lb, sb = pilih
        r4 = lambda v: v if v is None else round(v, 4)
        hasil.update(label=lb, sebab=sb, dnbr=r4(eff), dnbr_mentah=r4(m["dnbr"]), latar=r4(m["latar"]), nbr_pasca=r4(m["nbr_pasca"]), dnir=r4(m["dnir"]), musim_ok=musim, n_bersih=m["n_bersih"], tgl_pra=d1.isoformat(), tgl_pasca=d2.isoformat())
        if simpan_thumb and (lb != "tidak" or int(hashlib.md5(row["id"].encode()).hexdigest(), 16) % 1000 < THUMB_TIDAK_PER_MIL):
            thumb(T, row["id"], "pra", i1)
            thumb(T, row["id"], "pasca", i2)
            hasil["thumb"] = True
    return hasil


def thumb(T, id_, nama, it):
    """PNG 64x64: warna asli (TCI) dan SWIR (B12, B8A, merah dari TCI). Tulis ke KELUAR/thumb/."""
    import citra as C
    from array import array
    os.makedirs(os.path.join(KELUAR, "thumb"), exist_ok=True)
    def potong(v):
        return array("B", (v[y * NP + x] for y in range(64) for x in range(64)))
    tci = tambal(it, "visual", T.lat, T.lon, True)[0]
    rgb = [potong(array("B", (min(255, int(d * 1.15)) for d in b))) for b in tci]
    a, c = T.pita(it)
    f = lambda v: array("B", (0 if d is None else max(0, min(255, int(d * 2.5 * 255))) for d in v))
    sw = [potong(f(c)), potong(f(a)), rgb[0]]
    base = os.path.join(KELUAR, "thumb", "%s_%s" % (id_, nama))
    open(base + "_rgb.png", "wb").write(C.png(rgb, 64))
    open(base + "_swir.png", "wb").write(C.png(sw, 64))


def baca_rancangan(tahun):
    return list(csv.DictReader(open(os.path.join(KELUAR, "rancangan_%d.csv" % tahun))))


def tandai(tahun, shard=0, n=1, maks=10 ** 9):
    if TAHUN[tahun]["citra"] != "s2":
        raise SystemExit("citra %s belum dibuat (lihat docstring)" % TAHUN[tahun]["citra"])
    d = os.path.join(CACHE, str(tahun))
    os.makedirs(d, exist_ok=True)
    rows = [r for i, r in enumerate(baca_rancangan(tahun)) if i % n == shard and not os.path.exists(os.path.join(d, r["id"] + ".json"))][:maks]
    t0, ok = time.time(), [0]
    def satu(r):
        try:
            h = tandai_titik(r, tahun)
        except Exception as e:                    # jaringan/waktu habis: bukan hasil, dicoba lagi pada jalan berikut
            print(r["id"], "gagal", e.__class__.__name__, str(e)[:80], file=sys.stderr, flush=True)
            return
        json.dump(h, open(os.path.join(d, r["id"] + ".json"), "w"))
        ok[0] += 1
        print("%s %s dnbr=%s n=%d (%d/%d, %ds)" % (r["id"], h["label"], h["dnbr"], h["n_bersih"], ok[0], len(rows), time.time() - t0), flush=True)
    with ThreadPoolExecutor(int(os.environ.get("SAMPLING_UTAS", 4))) as ex:
        list(ex.map(satu, rows))


# ------------------------------------------------------------------ ringkasan
def label_ambang(r, ambang, nbr_maks=NBR_PASCA, kontrol=True):
    dn = r["dnbr"] if kontrol else (r["dnbr_mentah"] if r["strata"] == "A" or r["latar"] is None else r["dnbr_mentah"])
    if dn is None:
        return "ragu"
    return "terbakar" if dn >= ambang and r["nbr_pasca"] < nbr_maks and r["dnir"] >= NIR_MIN and r["musim_ok"] else "tidak"


def skenario(baris, strata_tab, nama):
    """baris: [dict strata,gambut,label,sebab,dnbr,nbr_pasca]. Skenario -> fungsi (ikut?, terbakar?)."""
    S = {
        "utama": lambda r: (False, False) if (r["label"] == "ragu" and r["sebab"] == "tanpa_pasangan") else (True, r["label"] == "terbakar"),
        "ragu_tidak_terbakar": lambda r: (True, r["label"] == "terbakar"),
        "ragu_dikeluarkan": lambda r: (r["label"] != "ragu", r["label"] == "terbakar"),
        "ragu_sedang_terbakar": lambda r: ((False, False) if (r["label"] == "ragu" and r["sebab"] == "tanpa_pasangan") else (True, r["label"] in ("terbakar",) or (r["label"] == "ragu" and r["sebab"] != "tanpa_pasangan"))),
    }
    S["tanpa_kontrol_latar"] = lambda r: (r["dnbr_mentah"] is not None, label_ambang(r, DNBR, kontrol=False) == "terbakar")
    S["nbr_pasca_0,2"] = lambda r: (r["dnbr"] is not None, label_ambang(r, DNBR, nbr_maks=0.2) == "terbakar")
    S["hanya_dekat_titik_AB"] = lambda r: (False, False) if (r["label"] == "ragu" and r["sebab"] == "tanpa_pasangan") else (True, r["label"] == "terbakar" and r["strata"] in "AB")
    for t in (0.1, 0.27, 0.44):
        S["dnbr_%s" % str(t).replace(".", ",")] = (lambda t: lambda r: (r["dnbr"] is not None, label_ambang(r, t) == "terbakar"))(t)
    f = S[nama]
    st = {}
    for r in baris:
        ikut, bakar = f(r)
        k = (r["strata"], r["gambut"])
        a = st.setdefault(k, [0, 0])
        a[0] += ikut
        a[1] += bool(ikut and bakar)
    return [(strata_tab[k], a[0], a[1]) for k, a in sorted(st.items())], st


def ringkas(tahun):
    rc = baca_rancangan(tahun)
    tab = json.load(open(os.path.join(KELUAR, "strata_%d.json" % tahun)))
    luas = {(s["strata"], str(s["gambut"])): s["luas_ha"] for s in tab["strata"]}
    d = os.path.join(CACHE, str(tahun))
    baris, belum = [], 0
    for r in rc:
        jb = os.path.join(d, r["id"] + ".json")
        if not os.path.exists(jb):
            belum += 1
            continue
        h = json.load(open(jb))
        baris.append({**h, "strata": r["strata"], "gambut": r["gambut"], "lat": r["lat"], "lon": r["lon"]})
    with open(os.path.join(KELUAR, "sampel_%d.csv" % tahun), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "strata", "gambut", "lat", "lon", "label", "sebab", "dnbr", "nbr_pasca", "tgl_pra", "tgl_pasca", "n_bersih", "dnbr_mentah", "latar", "dnir", "musim_ok", "gambar"])
        for r in baris:
            w.writerow([r["id"], r["strata"], r["gambut"], r["lat"], r["lon"], r["label"], r["sebab"], r["dnbr"] if r["dnbr"] is not None else "", r["nbr_pasca"] if r["nbr_pasca"] is not None else "", r["tgl_pra"], r["tgl_pasca"], r["n_bersih"]] + [("" if r[k] is None else r[k]) for k in ("dnbr_mentah", "latar", "dnir", "musim_ok")] + [int(bool(r.get("thumb")))])
    tabel_luas = {k: v for k, v in luas.items()}
    hasil = {}
    for nm in ("utama", "ragu_tidak_terbakar", "ragu_dikeluarkan", "ragu_sedang_terbakar", "tanpa_kontrol_latar", "nbr_pasca_0,2", "hanya_dekat_titik_AB", "dnbr_0,1", "dnbr_0,27", "dnbr_0,44"):
        s, _ = skenario(baris, tabel_luas, nm)
        L, se = taksir(s)
        _, se2 = taksir(s, adj=True)
        hasil[nm] = {"luas_ha": round(L), "se_ha": round(se), "ci95_ha": [round(max(0, L - 1.96 * se)), round(L + 1.96 * se)], "se_konservatif_ha": round(se2),
                     "ci95_konservatif_ha": [round(max(0, L - 1.96 * se2)), round(L + 1.96 * se2)]}
    _, st = skenario(baris, tabel_luas, "utama")
    per = {}
    for r in baris:
        k = (r["strata"], r["gambut"])
        a = per.setdefault(k, {"terbakar": 0, "tidak": 0, "ragu_tanpa_pasangan": 0, "ragu_dnbr": 0})
        a["terbakar" if r["label"] == "terbakar" else "tidak" if r["label"] == "tidak" else "ragu_tanpa_pasangan" if r["sebab"] == "tanpa_pasangan" else "ragu_dnbr"] += 1
    strata_out = [{"strata": s["strata"], "gambut": s["gambut"], "luas_ha": s["luas_ha"], "n_rancangan": s["n"], "n_ditandai": sum(per.get((s["strata"], str(s["gambut"])), {}).values()),
                   **per.get((s["strata"], str(s["gambut"])), {})} for s in tab["strata"] if s["strata"] != "D"]
    bk = [r for r in baris if r["label"] == "terbakar"]
    diag = {"terbakar_total": len(bk), "terbakar_strata": {h: sum(r["strata"] == h for r in bk) for h in "ABC"}, "bukan_api": sum(r["sebab"] == "bukan_api" for r in baris),
            "tanpa_pasangan": sum(r["sebab"] == "tanpa_pasangan" for r in baris), "tanpa_latar_BC": sum(r["latar"] is None for r in baris if r["strata"] in "BC" and r["dnbr"] is not None),
            "abs_dnbr_gt_2": sum(r["dnbr_mentah"] is not None and abs(r["dnbr_mentah"]) > 2 for r in baris)}
    out = {"tahun": tahun, "dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "n_ditandai": len(baris), "n_belum": belum, "resmi_ha": RESMI.get(tahun), "metode_web_ha": tab["metode_web_ha"],
           "luas_tanpa_deteksi_ha": round(sum(s["luas_ha"] for s in tab["strata"] if s["strata"] == "D")), "provinsi_tanpa_deteksi": tab["provinsi_tanpa_deteksi"], "strata": strata_out, "diagnosa": diag, "estimasi": hasil}
    json.dump(out, open(os.path.join(KELUAR, "ringkasan_%d.json" % tahun), "w"), ensure_ascii=False, indent=1)
    tulis_md(out, tab)
    tulis_html(tahun, baris)
    print(json.dumps(out, ensure_ascii=False, indent=1))


def tulis_html(tahun, baris):
    """periksa_<tahun>.html: grid titik bergambar (terbakar, ragu, dan contoh 'tidak') + pilihan manusia + unduh CSV. Tanpa pustaka luar; pilihan disimpan di localStorage."""
    d = [{"id": r["id"], "s": r["strata"], "g": r["gambut"], "l": r["label"], "sb": r["sebab"], "n": r["dnbr"], "nb": r["nbr_pasca"], "a": r["tgl_pra"], "b": r["tgl_pasca"], "lat": r["lat"], "lon": r["lon"]}
         for r in baris if r.get("thumb") and r["dnbr"] is not None]
    d.sort(key=lambda r: ({"terbakar": 0, "ragu": 1, "tidak": 2}[r["l"]], r["s"], r["id"]))
    h = """<!doctype html><meta charset="utf-8"><title>Periksa titik %d</title>
<style>body{font:13px system-ui;margin:12px}.k{display:inline-block;margin:6px;padding:6px;border:1px solid #bbb;border-radius:4px;vertical-align:top}.k img{width:128px;height:128px;image-rendering:pixelated}
.t{font-size:11px;color:#444}.terbakar{background:#fde8e0}.ragu{background:#fff6d6}.tidak{background:#eef6ee}</style>
<h3>Periksa titik sampel %d <button id=u>Unduh CSV</button> <select id=f><option value="">semua</option><option>terbakar</option><option>ragu</option><option>tidak</option></select> <span id=c></span></h3>
<p>Tiap titik: pra RGB, pra SWIR (B12/B8A/merah), pasca RGB, pasca SWIR. Titik ada di tengah gambar (64 px x 20 m = 1,28 km). Pilih terbakar / tidak / ragu menurut penglihatan Anda.</p><div id=g></div>
<script>
const D=%s,K='periksa%d';let P=JSON.parse(localStorage.getItem(K)||'{}');
function r(){const f=document.getElementById('f').value;document.getElementById('g').innerHTML=D.filter(x=>!f||x.l==f).map(x=>`<div class="k ${x.l}"><b>${x.id}</b> ${x.s}${x.g=='1'?' gambut':''} <i>otomatis: ${x.l}${x.sb?' ('+x.sb+')':''}</i><br><span class=t>dNBR ${x.n} NBRpasca ${x.nb} | ${x.a} -> ${x.b} | ${x.lat},${x.lon}</span><br>
${['pra_rgb','pra_swir','pasca_rgb','pasca_swir'].map(n=>`<img loading=lazy src="thumb/${x.id}_${n}.png" title="${n}">`).join('')}<br>
${['terbakar','tidak','ragu'].map(v=>`<label><input type=radio name="${x.id}" value="${v}" ${P[x.id]==v?'checked':''} onchange="P['${x.id}']=this.value;localStorage.setItem(K,JSON.stringify(P));h()"> ${v}</label>`).join(' ')}</div>`).join('');h()}
function h(){document.getElementById('c').textContent=Object.keys(P).length+' / '+D.length+' diperiksa'}
document.getElementById('f').onchange=r;
document.getElementById('u').onclick=()=>{const t='id,strata,label_otomatis,label_manusia\\n'+D.map(x=>[x.id,x.s,x.l,P[x.id]||''].join(',')).join('\\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type:'text/csv'}));a.download='periksa_%d.csv';a.click()};
r();
</script>""" % (tahun, tahun, json.dumps(d), tahun, tahun)
    open(os.path.join(KELUAR, "periksa_%d.html" % tahun), "w").write(h)


def tulis_md(o, tab):
    t = o["tahun"]
    e = o["estimasi"]["utama"]
    L = ["# Luas terbakar %d: sampling berlapis + citra (estimasi independen)" % t, "",
         "Dihasilkan `scripts/data/sampling_luas.py` (jangan disunting tangan). **Perkiraan citra, bukan ukur lapangan.**", "",
         "## Metode", "",
         "- Kerangka: daratan Indonesia pada kisi 0,003375 derajat (~375 m), batas dari `public/geo/kecamatan` (bagian luar poligon, sederhana; garis pantai kasar).",
         "- A = sel dengan >= 1 deteksi VIIRS n/h tahun %d (S-NPP + NOAA-20), tanpa sel sumber panas tetap; B = cincin <= 2 km di luar A; C = sisa daratan di provinsi yang punya deteksi. Tiap strata dibagi gambut / mineral. Luas = jumlah sel x luas sel (cos lintang)." % t,
         "- Titik acak seragam dalam strata (seed tetap, `rancangan_%d.csv`). Label: Sentinel-2 L2A, jendela 3x3 piksel 20 m, dNBR = NBR pra - NBR pasca (median 3x3, piksel B8A+B12 >= 0,05). Terbakar bila dNBR >= 0,27 DAN NBR pasca < 0,1 DAN B8A pasca turun >= 0,02 dari pra (dan, di B/C, adegan pasca bulan >= Juli); dNBR >= 0,27 yang gagal syarat itu = tidak (perubahan non-api); dNBR < 0,1 = tidak; 0,1-0,27 dan tanpa pasangan = 'ragu'." % t,
         "- Pra/pasca: pasangan adegan bersih terdekat yang MENGAPIT tanggal jangkar dengan jeda <= 60 hari. A,B: jangkar = deteksi pertama, terakhir, dan tengah dalam 2 km; C: 15 Sep, Agu, Okt, Jul, Nov. Sampai 4 pasangan; terbakar bila ada pasangan yang memenuhi aturan. Bersih = SCL tanpa awan/bayangan di 7x7 piksel tengah dan <= 15% awan di 21x21.",
         "- Kontrol latar (B dan C): dNBR dikurangi median dNBR cincin 500-900 m di sekitar titik (perubahan musiman seluruh bentang, mis. padi/savana, tidak terbaca sebagai bakar). Tidak dipakai di A (cincin bisa ikut terbakar).",
         "- Estimator: stratified (Olofsson dkk. 2014): L = sum A_h p_h; Var = sum A_h^2 p_h(1-p_h)/(n_h-1); selang 95% = L +- 1,96 SE. Utama: 'ragu' karena tanpa citra bersih dikeluarkan, 'ragu' karena dNBR sedang dihitung tidak terbakar.", "",
         "## Strata", "", "| strata | gambut | luas (ha) | n rancangan | n ditandai | terbakar | tidak | ragu (tanpa citra) | ragu (dNBR) |", "|---|---|---|---|---|---|---|---|---|"]
    for s in o["strata"]:
        L.append("| %s | %s | %s | %d | %d | %d | %d | %d | %d |" % (s["strata"], "ya" if s["gambut"] else "tidak", format(round(s["luas_ha"]), ","), s["n_rancangan"], s["n_ditandai"], s.get("terbakar", 0), s.get("tidak", 0), s.get("ragu_tanpa_pasangan", 0), s.get("ragu_dnbr", 0)))
    L += ["", "Luas daratan di provinsi tanpa deteksi (tidak disampel, dianggap tidak terbakar): %s ha %s." % (format(o["luas_tanpa_deteksi_ha"], ","), o["provinsi_tanpa_deteksi"]), "",
          "## Hasil", "", "| skenario | luas (ha) | SE | selang 95% | selang 95% konservatif |", "|---|---|---|---|---|"]
    for k, v in o["estimasi"].items():
        L.append("| %s | %s | %s | %s - %s | %s - %s |" % (k, format(v["luas_ha"], ","), format(v["se_ha"], ","), format(v["ci95_ha"][0], ","), format(v["ci95_ha"][1], ","), format(v["ci95_konservatif_ha"][0], ","), format(v["ci95_konservatif_ha"][1], ",")))
    L += ["", "Pembanding: luas resmi BNPB/KLHK %s ha; metode web kita (titik NOAA-20 n/h tersaring x 4,12) %s ha." % (format(o["resmi_ha"] or 0, ","), format(o["metode_web_ha"] or 0, ",")),
          "Diagnosa (n=%d): 'terbakar' %d (A %d, B %d, C %d); lolos dNBR tetapi gagal syarat bukan-api (NBR pasca, B8A, musim) %d; tanpa pasangan bersih <= 60 hari %d; B,C tanpa kontrol latar %d; |dNBR| > 2 pada %d titik." % (
              o["n_ditandai"], o["diagnosa"]["terbakar_total"], o["diagnosa"]["terbakar_strata"]["A"], o["diagnosa"]["terbakar_strata"]["B"], o["diagnosa"]["terbakar_strata"]["C"], o["diagnosa"]["bukan_api"], o["diagnosa"]["tanpa_pasangan"], o["diagnosa"]["tanpa_latar_BC"], o["diagnosa"]["abs_dnbr_gt_2"]),
          "Skenario: `tanpa_kontrol_latar` dNBR mentah tanpa koreksi cincin 500-900 m; `nbr_pasca_0,2` batas NBR pasca dilonggarkan ke 0,2; `hanya_dekat_titik_AB` terbakar hanya dihitung di A dan B (butuh deteksi VIIRS <= 2 km), C dianggap 0; `ragu_tidak_terbakar` semua ragu = tidak; `ragu_dikeluarkan` semua ragu keluar dari penyebut; `ragu_sedang_terbakar` (batas atas) ragu karena dNBR sedang = terbakar; `dnbr_x` ambang dNBR x (syarat NBR pasca, B8A, musim tetap). `ragu_sedang_terbakar` praktis tak informatif: ragu tanpa citra dikeluarkan sehingga strata C yang luas dikalikan proporsi ragu.", "",
          "## Keterbatasan", "",
          "- Label otomatis satu aturan dNBR, belum dipastikan manusia (potongan 64x64 di `thumb/` untuk pemeriksaan). Tanpa matriks kesalahan acuan, selang hanya galat sampling, BUKAN galat label.",
          "- dNBR 0,27 mengukur bekas bakar permukaan; bara gambut bawah tanah dan api < 1 piksel 20 m bisa luput (bias rendah). Panen, banjir, gugur daun, dan bayangan awan yang lolos SCL bisa menaikkan dNBR (bias tinggi).",
          "- Aturan dNBR tetap tidak membedakan semua perubahan non-api (pembukaan lahan tanpa api, panen, banjir). Pada titik B dan C (jauh dari deteksi) positif palsu masih mungkin; periksa potongan `thumb/` lewat `periksa_%d.html` sebelum estimasi dipakai." % t,
          "- Strata C hanya memeriksa pasangan yang mengapit 15 Jul-15 Nov: kebakaran Jan-Jun atau akhir tahun tidak tertangkap (bias rendah). Pasangan <= 60 hari tak selalu ada di daerah berawan: titik itu 'ragu tanpa citra' dan dikeluarkan (asumsi acak). Strata C berprevalensi rendah: strata dengan 0 terbakar memberi SE 0 pada rumus baku (lihat selang konservatif).",
          "- Titik acak di dalam sel 375 m; titik tidak ditimbang cos lintang di dalam strata (galat < 1%). Garis pantai dan batas provinsi dari poligon kecamatan yang disederhanakan.",
          "- Deteksi VIIRS tahun %d memakai arsip standar (SP); sel industri dibuang memakai daftar titik_palsu (disusun dari arsip yang sama)." % t]
    open(os.path.join(KELUAR, "RINGKASAN.md"), "w").write("\n".join(L) + "\n")


# ------------------------------------------------------------------ uji
def uji():
    # estimator: nilai tepat
    L, se = taksir([(1000, 100, 50), (9000, 100, 10)])
    assert L == 500 + 900 and abs(se - math.sqrt(1000 ** 2 * .25 / 99 + 9000 ** 2 * .09 / 99)) < 1e-9, (L, se)
    assert taksir([(100, 50, 0)])[1] == 0 and taksir([(100, 50, 0)], adj=True)[1] > 0
    # cakupan selang 95% pada populasi sintetik (luas benar diketahui)
    rng = random.Random(1)
    pop = {"A": (2000, .6), "B": (8000, .15), "C": (90000, .01)}        # luas ha, proporsi benar
    benar = sum(a * p for a, p in pop.values())
    ket = 0
    for _ in range(400):
        s = []
        for a, p in pop.values():
            n = 100
            s.append((a, n, sum(rng.random() < p for _ in range(n))))
        Lx, sx = taksir(s, adj=True)
        ket += Lx - 1.96 * sx <= benar <= Lx + 1.96 * sx
    assert ket >= 0.92 * 400, ket
    # kisi mini: dua 'provinsi' persegi + gambut; hitung sel persis dan titik jatuh di strata benar
    k = Kisi(sel=0.01, lon0=100.0, lat0=1.0, lon1=100.4, lat1=0.6)       # 40 x 40 sel
    sq = lambda x0, y0, x1, y1: [(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)]
    k.isi(k.darat, sq(100.0, 0.6, 100.2, 1.0), 1)                         # 20 x 40 sel
    k.isi(k.darat, sq(100.2, 0.8, 100.4, 1.0), 2)                         # 20 x 20 sel
    assert sum(1 for v in k.darat if v) == 20 * 40 + 20 * 20 and k.darat.count(2) == 400
    tmp = bytearray(len(k.gambut))
    k.isi(tmp, sq(100.0, 0.6, 100.4, 0.7), 1)                             # gambut: 10 baris bawah
    k.gambut = bytearray(bytes(a & (1 if b else 0) for a, b in zip(tmp, k.darat)))
    assert sum(k.gambut) == 20 * 10                                       # hanya di provinsi 1
    A = {5 * k.W + 5, 5 * k.W + 6, 20 * k.W + 10, 6 * k.W + 25, 35 * k.W + 8}           # sel 6,25 di provinsi 2
    h = k.hitung(A)
    tot = {s: sum(h["cnt"][s, g] for g in (0, 1)) for s in "ABCD"}
    assert tot["A"] == 5 and tot["B"] == len(h["B"]) and sum(tot.values()) == 1200, tot
    assert tot["D"] == 0 and h["prov_ada"] == {1, 2}
    brute = {i for a in A for o in k.disc if 0 <= a + o < len(k.darat) and k.darat[a + o] and (a + o) not in A for i in [a + o]}
    assert brute == h["B"]
    assert abs(sum(h["ha"][s, g] for s in "ABCD" for g in (0, 1)) - 1200 * k.luas_ha(20)) < 1200 * k.luas_ha(20) * 0.01
    n_sel = {("A", 0): 3, ("A", 1): 1, ("B", 0): 30, ("B", 1): 10, ("C", 0): 50, ("C", 1): 20}
    pts = titik_acak(k, h, n_sel, 3)
    assert len(pts) == sum(n_sel.values()) and len({p[4] for p in pts}) == len(pts)
    for hh, g, lat, lon, idx in pts:
        r, c = k.sel_rc(lat, lon)
        assert r * k.W + c == idx and k.strata_dari_sel(idx, h["A"], h["B"]) == hh and k.gambut[idx] == g, (hh, g, lat, lon)
    # alokasi: minimum 50 per sel strata, proporsional di atasnya
    al = alokasi({("A", 0): 750., ("A", 1): 250., ("B", 0): 990., ("B", 1): 10., ("C", 0): 600., ("C", 1): 400.})
    assert al[("A", 1)] == 100 and al[("A", 0)] == 300 and al[("B", 1)] == 50 and al[("C", 1)] == 120, al
    # label: syarat tambahan NBR pasca < 0,1, B8A turun, musim; dNBR tinggi tanpa syarat itu = tidak (bukan api)
    assert label(0.30, 0.05, 0.1) == ("terbakar", "") and label(0.05, 0.3, 0.1) == ("tidak", "") and label(0.2, 0.0, 0.1) == ("ragu", "dnbr_sedang") and label(None, None, None)[1] == "tanpa_pasangan"
    assert label(0.3, 0.15, 0.1) == ("tidak", "bukan_api") and label(0.3, 0.05, 0.0) == ("tidak", "bukan_api") and label(0.3, 0.05, 0.1, musim_ok=False) == ("tidak", "bukan_api")
    # pasangan: mengapit t, jeda <= 60 hari, terdekat
    d = dt.date
    bs = [(d(2023, 7, 1), "a"), (d(2023, 7, 20), "b"), (d(2023, 9, 10), "c"), (d(2023, 12, 1), "e")]
    assert pasangan(bs, d(2023, 8, 1)) == ((d(2023, 7, 20), "b"), (d(2023, 9, 10), "c")) and pasangan(bs, d(2023, 10, 15)) is None and pasangan(bs, d(2023, 6, 1)) is None and pasangan(bs, d(2023, 7, 20)) is None
    assert jangkar("C", 2023, "", "")[0] == d(2023, 9, 15) and jangkar("A", 2023, "2023-08-01", "2023-08-01") == [d(2023, 8, 1)] and len(jangkar("B", 2023, "2023-02-01", "2023-10-01")) == 3
    assert 700 < len(RING_IDX) < 2400 and all(abs(i // NP - 32) <= 45 for i in RING_IDX)
    # SCL bersih: awan di 7x7 tengah menolak; awan jauh di luar 21x21 tidak
    v = [4] * (NP * NP)
    assert scl_bersih(v)
    v2 = list(v); v2[32 * NP + 34] = 9
    assert not scl_bersih(v2)
    v3 = list(v); v3[2 * NP + 2] = 9
    assert scl_bersih(v3)
    # skenario: ragu tanpa citra dikeluarkan pada 'utama'; semua ragu keluar pada 'ragu_dikeluarkan'; tanpa kontrol latar memakai dNBR mentah
    mk = lambda lb, sb, dn, nb, mentah=None, strata="A", latar=None: {"strata": strata, "gambut": "0", "label": lb, "sebab": sb, "dnbr": dn, "dnbr_mentah": mentah if mentah is not None else dn, "latar": latar, "nbr_pasca": nb, "dnir": .1, "musim_ok": True}
    br = [mk("terbakar", "", .4, .0), mk("tidak", "", .0, .5), mk("ragu", "tanpa_pasangan", None, None), mk("ragu", "dnbr_sedang", .2, .0)]
    tl = {("A", "0"): 100.}
    assert skenario(br, tl, "utama")[0] == [(100., 3, 1)] and skenario(br, tl, "ragu_tidak_terbakar")[0] == [(100., 4, 1)]
    assert skenario(br, tl, "ragu_dikeluarkan")[0] == [(100., 2, 1)] and skenario(br, tl, "ragu_sedang_terbakar")[0] == [(100., 3, 2)] and skenario(br, tl, "dnbr_0,1")[0] == [(100., 3, 2)]
    assert skenario(br, tl, "dnbr_0,44")[0] == [(100., 3, 0)] and skenario(br, tl, "nbr_pasca_0,2")[0] == [(100., 3, 1)]
    bb = [mk("tidak", "", .1, .0, mentah=.5, strata="B", latar=.4)]
    assert skenario(bb, {("B", "0"): 10.}, "tanpa_kontrol_latar")[0] == [(10., 1, 1)] and skenario(bb, {("B", "0"): 10.}, "utama")[0] == [(10., 1, 0)]
    print("sampling_luas uji: OK")


if __name__ == "__main__":
    a = sys.argv[1:]
    thn = lambda i: int(a[i]) if len(a) > i and a[i].isdigit() else 2023
    if a[:1] == ["uji"]:
        uji()
    elif a[:1] == ["kerangka"]:
        kerangka(thn(1))
    elif a[:1] == ["tandai"]:
        tandai(thn(1), *(int(x) for x in a[2:5]))
    elif a[:1] == ["ringkas"]:
        ringkas(thn(1))
    else:
        print(__doc__)
