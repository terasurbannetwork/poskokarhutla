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
import array, bisect, csv, datetime as dt, json, math, os, random, re, sys, time
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
DNBR, NBR_PASCA, DNBR_BAWAH = 0.27, 0.2, 0.1
NP = 65                           # tambalan 65 x 65 piksel 20 m (1,3 km); piksel tengah = indeks 32
PUSAT = (31, 34)
SUM_MIN = 0.05                    # B8A + B12 minimum agar NBR bermakna (air/bayangan gelap memberi penyebut ~0 dan dNBR > 2)
BURUK_PIKSEL = {0, 1, 3, 6, 8, 9, 10}
BURUK_AWAN = {0, 3, 8, 9, 10}
STAC = "https://earth-search.aws.element84.com/v1/search"
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
    """Penanda satu titik: cache SCL/NBR per adegan; pasangan pra/pasca dicoba berurutan."""
    def __init__(self, lat, lon):
        self.lat, self.lon, self.scl, self.nb = lat, lon, {}, {}

    def bersih(self, it):
        k = it["id"]
        if k not in self.scl:
            self.scl[k] = tambal(it, "scl", self.lat, self.lon)[0][0]
        return self.scl[k]

    def pita(self, it):
        k = it["id"]
        if k not in self.nb:
            with ThreadPoolExecutor(2) as ex:
                (b8, s8, o8), (b12, s12, o12) = ex.map(lambda a: tambal(it, a, self.lat, self.lon), ("nir08", "swir22"))
            self.nb[k] = ([None if d == 0 else d * s8 + o8 for d in b8[0]], [None if d == 0 else d * s12 + o12 for d in b12[0]])
        return self.nb[k]

    def calon(self, daftar, maks=2, lote=6, tinjau=18):
        """generator adegan bersih (SCL) dalam urutan `daftar`; SCL dibaca serentak per lote (jaringan memakan waktu, bukan CPU)."""
        n = 0
        for i in range(0, min(len(daftar), tinjau), lote):
            blok = daftar[i:i + lote]
            list(IO.map(lambda x: self.bersih(x[1]), blok))
            for d, it in blok:
                if scl_bersih(self.scl[it["id"]]):
                    n += 1
                    yield d, it
                    if n >= maks:
                        return

    def ukur(self, pra, pasca):
        """-> dict {dnbr, nbr_pasca, n_bersih} pada 3x3 piksel tengah (piksel sah: SCL bagus di kedua adegan, B8A + B12 >= SUM_MIN; nilai = median piksel sah)."""
        with ThreadPoolExecutor(2) as ex:
            (a1, c1), (a2, c2) = ex.map(self.pita, (pra, pasca))
        s1, s2 = self.bersih(pra), self.bersih(pasca)
        dn, nb = [], []
        for y in range(*PUSAT):
            for x in range(*PUSAT):
                i = y * NP + x
                if s1[i] in BURUK_PIKSEL or s2[i] in BURUK_PIKSEL or None in (a1[i], c1[i], a2[i], c2[i]) or a1[i] + c1[i] < SUM_MIN or a2[i] + c2[i] < SUM_MIN:
                    continue
                n1, n2 = (a1[i] - c1[i]) / (a1[i] + c1[i]), (a2[i] - c2[i]) / (a2[i] + c2[i])
                dn.append(n1 - n2)
                nb.append(n2)
        if len(dn) < 5:
            return {"dnbr": None, "nbr_pasca": None, "n_bersih": len(dn)}
        mid = lambda v: sorted(v)[len(v) // 2]       # median: tahan satu piksel pencilan
        return {"dnbr": mid(dn), "nbr_pasca": mid(nb), "n_bersih": len(dn)}


def label(dnbr, nbr_pasca, ambang=DNBR):
    """-> ('terbakar'|'tidak'|'ragu', sebab). Aturan pemilik; ragu bila tak ada ukuran atau dNBR di [0,1; ambang); dNBR >= ambang dengan NBR pasca >= 0,2 = tidak (sebab 'nbr_pasca_tinggi')."""
    if dnbr is None:
        return "ragu", "tanpa_pasangan"
    if dnbr >= ambang and nbr_pasca < NBR_PASCA:
        return "terbakar", ""
    if dnbr < DNBR_BAWAH:
        return "tidak", ""
    return ("ragu", "dnbr_sedang") if dnbr < ambang else ("tidak", "nbr_pasca_tinggi")


def urutan_pasangan(n_pra, n_pasca, maks=4):
    return sorted(((i, j) for i in range(n_pra) for j in range(n_pasca)), key=lambda p: (p[0] + p[1], p[0]))[:maks]


def jendela_cari(strata, tahun, d_pertama, d_terakhir):
    """-> (daftar_pra_fungsi, daftar_pasca_fungsi, dari, sampai): filter tanggal untuk adegan pra (terdekat dulu) dan pasca."""
    if strata == "C":
        y = dt.date
        pra = [(y(tahun, 5, 1), y(tahun, 7, 31)), (y(tahun, 1, 1), y(tahun, 4, 30))]
        pasca = [(y(tahun, 10, 1), y(tahun, 12, 31)), (y(tahun, 9, 1), y(tahun, 9, 30))]
        return pra, pasca, y(tahun, 1, 1), y(tahun, 12, 31)
    a, b = dt.date.fromisoformat(d_pertama), dt.date.fromisoformat(d_terakhir)
    return [(a - dt.timedelta(180), a - dt.timedelta(1))], [(b + dt.timedelta(1), b + dt.timedelta(180))], a - dt.timedelta(180), b + dt.timedelta(180)


def tandai_titik(row, tahun, simpan_thumb=True):
    """satu baris rancangan -> dict hasil. Galat jaringan dilempar (tidak disimpan, dicoba lagi)."""
    lat, lon = float(row["lat"]), float(row["lon"])
    pra_w, pasca_w, dari, sampai = jendela_cari(row["strata"], tahun, row["d_pertama"], row["d_terakhir"])
    ad = adegan_titik(lat, lon, dari, sampai)
    T = Titik(lat, lon)
    def urut(ws, turun):
        out = []
        for a, b in ws:
            out += sorted([x for x in ad if a <= x[0] <= b], key=lambda x: x[0], reverse=turun)
        return out
    pra_l, pasca_l = urut(pra_w, True), urut(pasca_w, False)
    pra, pasca = list(T.calon(pra_l)), list(T.calon(pasca_l))
    hasil = {"id": row["id"], "label": "ragu", "sebab": "tanpa_pasangan", "dnbr": None, "nbr_pasca": None, "n_bersih": 0, "tgl_pra": "", "tgl_pasca": "", "n_adegan": len(ad), "percobaan": []}
    pilih = None
    for i, j in urutan_pasangan(len(pra), len(pasca)):
        m = T.ukur(pra[i][1], pasca[j][1])
        lb, sb = label(m["dnbr"], m["nbr_pasca"])
        hasil["percobaan"].append({"pra": pra[i][0].isoformat(), "pasca": pasca[j][0].isoformat(), "dnbr": m["dnbr"] and round(m["dnbr"], 4), "label": lb})
        if pilih is None or (m["dnbr"] is not None and pilih[2]["dnbr"] is None):
            pilih = (pra[i], pasca[j], m)
        if lb != "ragu":
            pilih = (pra[i], pasca[j], m)
            break
    if pilih:
        (dp, ip), (dq, iq), m = pilih
        lb, sb = label(m["dnbr"], m["nbr_pasca"])
        hasil.update(label=lb, sebab=sb, dnbr=m["dnbr"] and round(m["dnbr"], 4), nbr_pasca=m["nbr_pasca"] and round(m["nbr_pasca"], 4), n_bersih=m["n_bersih"], tgl_pra=dp.isoformat(), tgl_pasca=dq.isoformat())
        if simpan_thumb:
            thumb(T, row["id"], "pra", ip)
            thumb(T, row["id"], "pasca", iq)
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
def label_ambang(r, ambang):
    if r["dnbr"] is None:
        return "ragu"
    return "terbakar" if r["dnbr"] >= ambang and r["nbr_pasca"] < NBR_PASCA else "tidak"


def skenario(baris, strata_tab, nama):
    """baris: [dict strata,gambut,label,sebab,dnbr,nbr_pasca]. Skenario -> fungsi (ikut?, terbakar?)."""
    S = {
        "utama": lambda r: (False, False) if (r["label"] == "ragu" and r["sebab"] == "tanpa_pasangan") else (True, r["label"] == "terbakar"),
        "ragu_tidak_terbakar": lambda r: (True, r["label"] == "terbakar"),
        "ragu_dikeluarkan": lambda r: (r["label"] != "ragu", r["label"] == "terbakar"),
        "ragu_sedang_terbakar": lambda r: ((False, False) if (r["label"] == "ragu" and r["sebab"] == "tanpa_pasangan") else (True, r["label"] in ("terbakar",) or (r["label"] == "ragu" and r["sebab"] != "tanpa_pasangan"))),
    }
    gap = lambda r: (dt.date.fromisoformat(r["tgl_pasca"]) - dt.date.fromisoformat(r["tgl_pra"])).days if r["tgl_pra"] and r["tgl_pasca"] else None
    S["celah_maks_60hari"] = lambda r: (False, False) if r["label"] == "ragu" or gap(r) is None or gap(r) > 60 else (True, r["label"] == "terbakar")
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
        w.writerow(["id", "strata", "gambut", "lat", "lon", "label", "sebab_ragu", "dnbr", "nbr_pasca", "tgl_pra", "tgl_pasca", "n_bersih"])
        for r in baris:
            w.writerow([r["id"], r["strata"], r["gambut"], r["lat"], r["lon"], r["label"], r["sebab"], r["dnbr"] if r["dnbr"] is not None else "", r["nbr_pasca"] if r["nbr_pasca"] is not None else "", r["tgl_pra"], r["tgl_pasca"], r["n_bersih"]])
    tabel_luas = {k: v for k, v in luas.items()}
    hasil = {}
    for nm in ("utama", "ragu_tidak_terbakar", "ragu_dikeluarkan", "ragu_sedang_terbakar", "celah_maks_60hari", "hanya_dekat_titik_AB", "dnbr_0,1", "dnbr_0,27", "dnbr_0,44"):
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
    cel = [(dt.date.fromisoformat(r["tgl_pasca"]) - dt.date.fromisoformat(r["tgl_pra"])).days for r in bk]
    diag = {"terbakar_total": len(bk), "terbakar_strata": {h: sum(r["strata"] == h for r in bk) for h in "ABC"}, "terbakar_celah_gt_90_hari": sum(c > 90 for c in cel), "median_celah_hari_terbakar": sorted(cel)[len(cel) // 2] if cel else None,
            "terbakar_dnbr_gt_1": sum(r["dnbr"] > 1 for r in bk), "dnbr_di_luar_0_2": sum(r["dnbr"] is not None and abs(r["dnbr"]) > 2 for r in baris)}
    out = {"tahun": tahun, "dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "n_ditandai": len(baris), "n_belum": belum, "resmi_ha": RESMI.get(tahun), "metode_web_ha": tab["metode_web_ha"],
           "luas_tanpa_deteksi_ha": round(sum(s["luas_ha"] for s in tab["strata"] if s["strata"] == "D")), "provinsi_tanpa_deteksi": tab["provinsi_tanpa_deteksi"], "strata": strata_out, "diagnosa": diag, "estimasi": hasil}
    json.dump(out, open(os.path.join(KELUAR, "ringkasan_%d.json" % tahun), "w"), ensure_ascii=False, indent=1)
    tulis_md(out, tab)
    print(json.dumps(out, ensure_ascii=False, indent=1))


def tulis_md(o, tab):
    t = o["tahun"]
    e = o["estimasi"]["utama"]
    L = ["# Luas terbakar %d: sampling berlapis + citra (estimasi independen)" % t, "",
         "Dihasilkan `scripts/data/sampling_luas.py` (jangan disunting tangan). **Perkiraan citra, bukan ukur lapangan.**", "",
         "## Metode", "",
         "- Kerangka: daratan Indonesia pada kisi 0,003375 derajat (~375 m), batas dari `public/geo/kecamatan` (bagian luar poligon, sederhana; garis pantai kasar).",
         "- A = sel dengan >= 1 deteksi VIIRS n/h tahun %d (S-NPP + NOAA-20), tanpa sel sumber panas tetap; B = cincin <= 2 km di luar A; C = sisa daratan di provinsi yang punya deteksi. Tiap strata dibagi gambut / mineral. Luas = jumlah sel x luas sel (cos lintang)." % t,
         "- Titik acak seragam dalam strata (seed tetap, `rancangan_%d.csv`). Label: Sentinel-2 L2A, jendela 3x3 piksel 20 m, dNBR = NBR pra - NBR pasca; terbakar bila dNBR >= 0,27 dan NBR pasca < 0,2; tidak terbakar bila dNBR < 0,1; selain itu 'ragu'." % t,
         "- Pra/pasca: A,B = bersih terakhir sebelum deteksi pertama / bersih pertama sesudah deteksi terakhir dalam 2 km (<= 180 hari); C = Mei-Jul / Okt-Des. Bersih = SCL tanpa awan/bayangan di 7x7 piksel tengah dan <= 15% awan di 21x21. Sampai 4 pasangan dicoba bila 'ragu'.",
         "- Estimator: stratified (Olofsson dkk. 2014): L = sum A_h p_h; Var = sum A_h^2 p_h(1-p_h)/(n_h-1); selang 95% = L +- 1,96 SE. Utama: 'ragu' karena tanpa citra bersih dikeluarkan, 'ragu' karena dNBR sedang dihitung tidak terbakar.", "",
         "## Strata", "", "| strata | gambut | luas (ha) | n rancangan | n ditandai | terbakar | tidak | ragu (tanpa citra) | ragu (dNBR) |", "|---|---|---|---|---|---|---|---|---|"]
    for s in o["strata"]:
        L.append("| %s | %s | %s | %d | %d | %d | %d | %d | %d |" % (s["strata"], "ya" if s["gambut"] else "tidak", format(round(s["luas_ha"]), ","), s["n_rancangan"], s["n_ditandai"], s.get("terbakar", 0), s.get("tidak", 0), s.get("ragu_tanpa_pasangan", 0), s.get("ragu_dnbr", 0)))
    L += ["", "Luas daratan di provinsi tanpa deteksi (tidak disampel, dianggap tidak terbakar): %s ha %s." % (format(o["luas_tanpa_deteksi_ha"], ","), o["provinsi_tanpa_deteksi"]), "",
          "## Hasil", "", "| skenario | luas (ha) | SE | selang 95% | selang 95% konservatif |", "|---|---|---|---|---|"]
    for k, v in o["estimasi"].items():
        L.append("| %s | %s | %s | %s - %s | %s - %s |" % (k, format(v["luas_ha"], ","), format(v["se_ha"], ","), format(v["ci95_ha"][0], ","), format(v["ci95_ha"][1], ","), format(v["ci95_konservatif_ha"][0], ","), format(v["ci95_konservatif_ha"][1], ",")))
    L += ["", "Pembanding: luas resmi BNPB/KLHK %s ha; metode web kita (titik NOAA-20 n/h tersaring x 4,12) %s ha." % (format(o["resmi_ha"] or 0, ","), format(o["metode_web_ha"] or 0, ",")),
          "Diagnosa titik 'terbakar' (n=%d: A %d, B %d, C %d): celah pra-pasca > 90 hari pada %d, median %s hari; dNBR > 1 pada %d; |dNBR| > 2 (tak mungkin per piksel; penyebut NBR mendekati nol) pada %d titik." % (
              o["diagnosa"]["terbakar_total"], o["diagnosa"]["terbakar_strata"]["A"], o["diagnosa"]["terbakar_strata"]["B"], o["diagnosa"]["terbakar_strata"]["C"], o["diagnosa"]["terbakar_celah_gt_90_hari"], o["diagnosa"]["median_celah_hari_terbakar"], o["diagnosa"]["terbakar_dnbr_gt_1"], o["diagnosa"]["dnbr_di_luar_0_2"]),
          "Skenario: `celah_maks_60hari` hanya pasangan pra-pasca <= 60 hari (ragu keluar); `hanya_dekat_titik_AB` terbakar hanya dihitung di A dan B (butuh deteksi VIIRS <= 2 km), C dianggap 0; `ragu_tidak_terbakar` semua ragu = tidak; `ragu_dikeluarkan` semua ragu keluar dari penyebut; `ragu_sedang_terbakar` (batas atas) ragu karena dNBR sedang = terbakar; `dnbr_x` ambang dNBR x (NBR pasca < 0,2 tetap).", "",
          "## Keterbatasan", "",
          "- Label otomatis satu aturan dNBR, belum dipastikan manusia (potongan 64x64 di `thumb/` untuk pemeriksaan). Tanpa matriks kesalahan acuan, selang hanya galat sampling, BUKAN galat label.",
          "- dNBR 0,27 mengukur bekas bakar permukaan; bara gambut bawah tanah dan api < 1 piksel 20 m bisa luput (bias rendah). Panen, banjir, gugur daun, dan bayangan awan yang lolos SCL bisa menaikkan dNBR (bias tinggi).",
          "- Aturan dNBR tidak membedakan api dari perubahan non-api: panen/olah padi, savana kering musim kemarau, pembukaan lahan tanpa api, dan celah pra-pasca panjang menaikkan dNBR. Pada titik B dan C (jauh dari deteksi) hampir semua 'terbakar' mungkin positif palsu; baca estimasi utama sebagai BATAS ATAS aturan, dan periksa potongan `thumb/` sebelum dipakai.",
          "- Strata C memakai pra Mei-Jul dan pasca Okt-Des: kebakaran Jan-Apr atau Nov-Des di luar deteksi tidak tertangkap. Strata C berprevalensi rendah: strata dengan 0 terbakar memberi SE 0 pada rumus baku (lihat selang konservatif).",
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
    # label & pasangan
    assert label(0.30, 0.1) == ("terbakar", "") and label(0.05, 0.3) == ("tidak", "") and label(0.2, 0.1) == ("ragu", "dnbr_sedang") and label(0.3, 0.25) == ("tidak", "nbr_pasca_tinggi") and label(None, None)[1] == "tanpa_pasangan"
    assert urutan_pasangan(3, 3)[:3] == [(0, 0), (0, 1), (1, 0)] and urutan_pasangan(0, 2) == []
    # SCL bersih: awan di 7x7 tengah menolak; awan jauh di luar 21x21 tidak
    v = [4] * (NP * NP)
    assert scl_bersih(v)
    v2 = list(v); v2[32 * NP + 34] = 9
    assert not scl_bersih(v2)
    v3 = list(v); v3[2 * NP + 2] = 9
    assert scl_bersih(v3)
    # skenario: ragu tanpa citra dikeluarkan pada 'utama'; semua ragu keluar pada 'ragu_dikeluarkan'
    br = [{"strata": "A", "gambut": "0", "label": "terbakar", "sebab": "", "dnbr": .4, "nbr_pasca": .1}, {"strata": "A", "gambut": "0", "label": "tidak", "sebab": "", "dnbr": .0, "nbr_pasca": .5},
          {"strata": "A", "gambut": "0", "label": "ragu", "sebab": "tanpa_pasangan", "dnbr": None, "nbr_pasca": None}, {"strata": "A", "gambut": "0", "label": "ragu", "sebab": "dnbr_sedang", "dnbr": .2, "nbr_pasca": .3}]
    tl = {("A", "0"): 100.}
    assert skenario(br, tl, "utama")[0] == [(100., 3, 1)] and skenario(br, tl, "ragu_tidak_terbakar")[0] == [(100., 4, 1)]
    assert skenario(br, tl, "ragu_dikeluarkan")[0] == [(100., 2, 1)] and skenario(br, tl, "ragu_sedang_terbakar")[0] == [(100., 3, 2)] and skenario(br, tl, "dnbr_0,1")[0] == [(100., 3, 1)]
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
