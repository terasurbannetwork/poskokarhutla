"""Penilai J4 (PRAREG-J4.md): fungsi murni atas raster kedalaman maks (mesin.mjs --raster) dan laporan banjir tersaring (petabencana.py saring).
Beda dari skor_j3.py (POD radius 300 m, jenuh): ukuran yang menormalkan luas.
  AUC     laporan vs titik darat acak (kontrol), skor = kedalaman maks (m) dalam radius 300 m; seri = 0,5
  POD     bagian laporan dengan sel basah (>= 10 cm) dalam 300 m;  POFD = bagian kontrol dengan sel basah dalam 300 m
  HSS     Heidke dari tabel laporan/kontrol, kontrol dibobot n_laporan/n_kontrol (seimbang); Peirce = POD - POFD
  NULL    medan basah acak BERKLASTER (blok b x b sel, b = 5 dan 10) dengan jumlah sel basah darat SAMA; 100 benih; laporan dan kontrol tetap
          -> POD, HSS null (p50, p95) dan p = bagian benih dengan HSS >= model (nilai kecil = model lebih baik dari acak berklaster)
  p null = (k+1)/(n+1) (k = benih null dengan HSS >= model, n = 100): tak pernah 0, benih null yang naik ke 1.000 ikut menghitung.
  HEURISTIK  pembanding wajib: skor = -(elevasi DEM terendah, sel darat, dalam 300 m), KONTROL SAMA persis dengan model; dilaporkan bersama selisih AUC berpasangan (model - heuristik).
Klaim (tanpa kontrol negatif sejati): hasil disebut "keterampilan relatif terhadap bias lokasi pelapor", BUKAN akurasi. Kontrol = sel darat acak seragam, bukan "bukti kering":
laporan hanya positif, jadi AUC/HSS mengukur tempat laporan relatif terhadap daratan.
Kejadian beruntun (pilih_kejadian): hari berturut-turut >= ambang = satu kejadian (hari puncak = mm terbesar); jendela 96 jam (puncak-2 .. puncak+1) tak tumpang tindih.
Daya (daya): simulasi binormal berklaster-kejadian untuk keputusan syarat lulus mana yang hanya dilaporkan.
Pakai:  python3 scripts/banjir/genangan/skor_j4.py uji | daya
"""
import array, bisect, datetime as dt, json, math, os, random, statistics, sys

D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, D)
import skor_j3  # noqa: E402

AMBANG, RADIUS, BENIH, N_KONTROL, N_NULL, BLOK = skor_j3.AMBANG, skor_j3.RADIUS, 7, 4000, 100, (5, 10)
MIN_LAPORAN = 10   # kejadian dengan < 10 laporan tersaring = "tanpa label": dibuang dari AUC/HSS, DICATAT terbuka (bukan diam-diam)
AKAR = os.path.abspath(os.path.join(D, "..", "..", ".."))


def muat_label(mulai, jam=96, berkas=None, kec=None, tanpa_saring=False):
    """tanpa_saring=True (sensitivitas): cache mentah penuh, hanya tipe flood, tanpa aturan latihan/burst.
    Laporan banjir tersaring (petabencana_banjir.json) dalam jendela [mulai 00:00 WIB, +jam), di dalam poligon DKI, tanpa duplikat -> [{t, lon, lat, kedalaman_cm, kab, kec}]."""
    import bersama
    berkas = berkas or os.path.join(bersama.MENTAH, "petabencana_banjir.json"); kec = kec or bersama.KecDKI()
    a = dt.datetime.fromisoformat(mulai + "T00:00:00+07:00"); b = a + dt.timedelta(hours=jam); lihat, o = set(), []
    if tanpa_saring:   # petabencana_laporan.json lama tak punya tipe/teks: baca cache mentah penuh (petabencana.dari_cache), tipe flood saja
        import petabencana; semua = [r for r in petabencana.dari_cache() if r.get("tipe") == "flood"]
    else:
        semua = json.load(open(berkas))
    for r in semua:
        if not (a <= dt.datetime.fromisoformat(r["t"]) < b):
            continue
        k = (r["t"], r["lon"], r["lat"], r["kedalaman_cm"])
        if k in lihat:
            continue
        lihat.add(k); c = kec.cari(r["lon"], r["lat"])
        if c:
            o.append({"t": r["t"], "lon": r["lon"], "lat": r["lat"], "kedalaman_cm": r["kedalaman_cm"], "kab": c[0], "kec": c[1]})
    return o


def cakram(dx, radius=RADIUS):
    r = math.ceil(radius / dx)
    return [(i, j) for j in range(-r, r + 1) for i in range(-r, r + 1) if math.hypot(i, j) * dx <= radius]


def dilasi(R, nilai, cak):
    """nilai: {indeks sel: nilai > 0} (jarang) -> larik float N: maks nilai dalam cakram di sekitar tiap sel."""
    nx, ny = R["nx"], R["ny"]; out = array.array("f", bytes(4 * nx * ny))
    for k, v in nilai.items():
        i0, j0 = k % nx, k // nx
        for di, dj in cak:
            i, j = i0 + di, j0 + dj
            if 0 <= i < nx and 0 <= j < ny and out[j * nx + i] < v:
                out[j * nx + i] = v
    return out


def sel_titik(R, lon, lat):
    ci, cj = (lon - R["lon0"]) / R["dlon"], (R["lat0"] - lat) / R["dlat"]
    i, j = round(ci), round(cj)
    return j * R["nx"] + i if 0 <= i < R["nx"] and 0 <= j < R["ny"] else None


def kontrol_sel(R, n=N_KONTROL, benih=BENIH):
    """n sel darat acak (kec >= 0), seragam, benih tetap."""
    rng = random.Random(benih); N = R["nx"] * R["ny"]; out = []
    while len(out) < n:
        k = rng.randrange(N)
        if R["kec"][k] >= 0:
            out.append(k)
    return out


def auc(pos, neg):
    """P(skor laporan > skor kontrol) + 0,5 P(seri)."""
    s = sorted(neg); n = len(s)
    if not pos or not n:
        return None
    return sum((bisect.bisect_left(s, x) + bisect.bisect_right(s, x)) / 2 for x in pos) / (len(pos) * n)


def hss(a, b, c, d):
    """Heidke dari tabel (boleh pecahan berbobot); None bila penyebut 0."""
    pen = (a + c) * (c + d) + (a + b) * (b + d)
    return None if pen == 0 else 2 * (a * d - b * c) / pen


def tabel(basah_dekat, sel_lap, sel_kon):
    """-> (pod, pofd, hss) dari mask basah-dekat (indeks sel -> bool)."""
    a = sum(bool(basah_dekat[k]) for k in sel_lap); c = len(sel_lap) - a
    b = sum(bool(basah_dekat[k]) for k in sel_kon); d = len(sel_kon) - b; w = len(sel_lap) / len(sel_kon)
    return a / len(sel_lap), b / len(sel_kon), hss(a, b * w, c, d * w)


def null_klaster(R, n_sel, blok, rng):
    """Sel basah acak berklaster: blok blok x blok ditempel di sudut acak sampai >= n_sel sel darat basah (kelebihan <= blok^2 sel dibiarkan)."""
    nx, ny = R["nx"], R["ny"]; ya = set()
    while len(ya) < n_sel:
        i0, j0 = rng.randrange(nx), rng.randrange(ny)
        for j in range(j0, min(ny, j0 + blok)):
            for i in range(i0, min(nx, i0 + blok)):
                if R["kec"][j * nx + i] >= 0:
                    ya.add(j * nx + i)
    return dict.fromkeys(ya, 1.0)   # kelebihan <= blok^2 sel (<1% luas): luas "sama" sampai selisih itu


def pctl(v, p):
    v = sorted(v); return v[min(len(v) - 1, int(p * len(v)))] if v else None


def muat_z(R):
    """Elevasi DEMNAS (m) rata-rata blok pada kisi R (faktor = dlon/dx DEM; sama dengan mesin.mjs --agregasi mean, tanpa kotak) -> array float32 N; blok tanpa data = +inf. Cache f32 di medan/."""
    import gzip
    M = os.path.join(AKAR, "data/raw/banjir/genangan/medan"); meta = json.load(open(os.path.join(M, "demnas_kotak.json"))); f = round(R["dlon"] / meta["dx"])
    assert abs(R["lon0"] - (meta["x0"] + (f / 2) * meta["dx"])) < 1e-9 and R["nx"] == meta["kolom"] // f and R["ny"] == meta["baris"] // f, "kisi raster tak selaras dengan DEM"
    c = os.path.join(M, f"z_blok{f}.f32")
    if os.path.exists(c):
        z = array.array("f"); z.frombytes(open(c, "rb").read()); return z
    m = array.array("f"); m.frombytes(gzip.open(os.path.join(M, "demnas_kotak.f32.gz")).read()); K, nd = meta["kolom"], meta["nodata"]; nx = R["nx"]
    z = array.array("f", bytes(4 * nx * R["ny"]))
    for J in range(R["ny"]):
        for i in range(nx):
            s = n = 0
            for r in range(f):
                o = (J * f + r) * K + i * f
                for v in m[o:o + f]:
                    if v != nd:
                        s += v; n += 1
            z[J * nx + i] = s / n if n else math.inf
    open(c, "wb").write(z.tobytes()); return z


def elev_min(R, z, k, cak):
    """Elevasi terendah (m) sel DARAT dalam cakram di sekitar sel k; +inf bila tak ada."""
    nx, ny = R["nx"], R["ny"]; i0, j0 = k % nx, k // nx; m = math.inf
    for di, dj in cak:
        i, j = i0 + di, j0 + dj
        if 0 <= i < nx and 0 <= j < ny and R["kec"][j * nx + i] >= 0 and z[j * nx + i] < m:
            m = z[j * nx + i]
    return m


def u_auc(pos, neg_sorted):
    """Per laporan: P(skor > kontrol) + 0,5 P(seri) (rata-ratanya = AUC)."""
    n = len(neg_sorted); return [(bisect.bisect_left(neg_sorted, x) + bisect.bisect_right(neg_sorted, x)) / 2 / n for x in pos]


def pilih_kejadian(seri, ambang, jam=96):
    """seri: [(tanggal ISO, mm)] urut hari -> (kejadian, dibuang). Hari berturut-turut >= ambang = satu run; kejadian = hari puncak run (mm terbesar, seri -> paling awal).
    Jendela = [puncak-2 hari, +jam). Run yang jendelanya menyentuh jendela kejadian sebelumnya DIBUANG (kausal: yang lebih dulu menang) dan dicatat di `dibuang`."""
    D1 = dt.timedelta(days=1); run, runs = [], []
    for t, m in seri:
        d = dt.date.fromisoformat(t)
        if m is not None and m >= ambang:
            if run and d - run[-1][0] != D1:
                runs.append(run); run = []
            run.append((d, m))
        elif run:
            runs.append(run); run = []
    if run:
        runs.append(run)
    out, buang, akhir = [], [], None
    for r in runs:
        p = max(r, key=lambda x: (x[1], -x[0].toordinal()))[0]; a = p - 2 * D1
        if akhir is not None and a < akhir:
            buang.append(p.isoformat()); continue
        out.append(p.isoformat()); akhir = a + dt.timedelta(hours=jam)
    return out, buang


def boot_batas(u_per_kejadian, reps=1000, benih=BENIH, q=0.025):
    """Bootstrap dua tingkat (kejadian, lalu laporan dalam kejadian) -> (rata-rata, batas bawah 95%). u_per_kejadian: [[u per laporan]]."""
    rng = random.Random(benih); ev = [e for e in u_per_kejadian if e]; k = len(ev); out = []
    for _ in range(reps):
        t = 0.0
        for _ in range(k):
            e = ev[rng.randrange(k)]; n = len(e); t += sum(e[rng.randrange(n)] for _ in range(n)) / n
        out.append(t / k)
    out.sort(); return sum(sum(e) / len(e) for e in ev) / k, out[int(q * reps)]


def daya(n_kej=(6, 8, 10), m_lap=25, auc_sejati=0.60, sd_antar=0.03, sims=300, reps=300, benih=BENIH, n_kon=400):
    """Peluang batas bawah 95% > 0 untuk (a) AUC model vs 0,5 (AUC sejati rata-rata `auc_sejati`) dan (b) selisih AUC berpasangan model - pembanding, untuk selisih sejati dan korelasi
    skor model-pembanding r tertentu. Binormal: skor laporan ~ N(d,1), kontrol ~ N(0,1); d tiap kejadian dari AUC sejati + N(0, sd_antar) (heterogenitas antar kejadian); laporan dalam satu kejadian
    bebas (tak ada klaster hari: OPTIMIS). Hasil dilaporkan; bukan bagian vonis."""
    nd = statistics.NormalDist()
    d_dari = lambda a: nd.inv_cdf(min(.999, max(.001, a))) * math.sqrt(2)
    rng = random.Random(benih); hasil = {}
    def satu(n, selisih, r):
        U = []; V = []
        for _ in range(n):
            a = auc_sejati + rng.gauss(0, sd_antar); dA = d_dari(a); dB = d_dari(a - selisih) if selisih is not None else None
            kA = [rng.gauss(0, 1) for _ in range(n_kon)]
            zk = [rng.gauss(0, 1) for _ in range(n_kon)]
            sk = sorted(kA)
            pA = [rng.gauss(dA, 1) for _ in range(m_lap)]
            U.append(u_auc(pA, sk))
            if dB is not None:   # pembanding: skor korelasi r dengan model pada laporan DAN kontrol yang sama
                kB = sorted(r * x + math.sqrt(1 - r * r) * y for x, y in zip(kA, zk))
                pB = [r * (x - dA) + math.sqrt(1 - r * r) * rng.gauss(0, 1) + dB for x in pA]
                uB = u_auc(pB, kB); V.append([x - y for x, y in zip(U[-1], uB)])
        return U, V
    for n in n_kej:
        h = {}
        for nama, (sel, r) in {"auc_vs_0.5": (None, 0), "beda_0.013_r0.9": (0.013, .9), "beda_0.03_r0.5": (0.03, .5), "beda_0.05_r0.5": (0.05, .5), "beda_0.0_r0.5_(galat_tipe_I)": (0.0, .5)}.items():
            ya = 0
            for _ in range(sims):
                U, V = satu(n, sel, r)
                data = [[x - 0.5 for x in e] for e in U] if sel is None else V
                ya += boot_batas(data, reps, rng.randrange(10**9))[1] > 0
            h[nama] = ya / sims
        hasil[f"n_kejadian={n}"] = h
    return {"parameter": {"m_lap": m_lap, "auc_sejati": auc_sejati, "sd_antar_kejadian": sd_antar, "sims": sims, "reps_bootstrap": reps, "n_kontrol": n_kon, "batas": "2,5% persentil (dua sisi 95%)"}, "peluang": hasil}


def nilai(R, lap, n_null=N_NULL, benih=BENIH, n_kontrol=N_KONTROL):
    """Semua metrik J4 untuk satu raster dan satu daftar laporan (sudah dalam DKI). -> dict."""
    cak = cakram(R["dx_m"]); hm = R["hm"]
    sel_lap = [k for k in (sel_titik(R, r["lon"], r["lat"]) for r in lap) if k is not None]
    kon = kontrol_sel(R, n_kontrol, benih)
    if not sel_lap:
        return {"n_laporan": 0}
    dalam = {k: v for k, v in enumerate(hm) if v > 0 and R["kec"][k] >= 0}
    dil = dilasi(R, dalam, cak)
    wet = {k: v for k, v in dalam.items() if v >= AMBANG}; dilw = dilasi(R, wet, cak)
    land = sum(1 for c in R["kec"] if c >= 0)
    pod, pofd, h = tabel([x >= AMBANG for x in dilw], sel_lap, kon)
    o = {"n_laporan": len(sel_lap), "luas_basah": len(wet) / land, "auc": auc([dil[k] for k in sel_lap], [dil[k] for k in kon]),
         "pod": pod, "pofd": pofd, "peirce": pod - pofd, "hss": h, "null": {}}
    if R.get("z") is not None:   # pembanding wajib: elevasi terendah dalam 300 m, kontrol SAMA; selisih AUC berpasangan model - heuristik
        hs = [-elev_min(R, R["z"], k, cak) for k in sel_lap]; hk = [-elev_min(R, R["z"], k, cak) for k in kon]
        ah = auc(hs, hk); o["heuristik"] = {"auc": ah, "beda_auc_model_minus_heuristik": o["auc"] - ah}
    if "diangkat" in R:   # fraksi sel basah yang berada di sel cekungan yang diangkat; dasarnya = fraksi sel darat diangkat
        dg = R["diangkat"]; o["basah_di_diangkat"] = sum(dg[k] for k in wet) / len(wet) if wet else None; o["darat_diangkat"] = sum(dg[k] for k in range(len(dg)) if R["kec"][k] >= 0) / land
    for b in BLOK:
        rng = random.Random(benih); P, H = [], []
        for _ in range(n_null):
            nl = null_klaster(R, len(wet), b, rng); dn = dilasi(R, nl, cak); p, _f, hh = tabel([x > 0 for x in dn], sel_lap, kon)
            P.append(p); H.append(hh if hh is not None else -1)
        o["null"][f"b{b}"] = {"pod_p50": pctl(P, .5), "pod_p95": pctl(P, .95), "hss_p50": pctl(H, .5), "hss_p95": pctl(H, .95),
                              "p_hss": (1 + sum(x >= (h if h is not None else -1) for x in H)) / (1 + len(H))}
    return o


def baca_raster(jalur):
    R = skor_j3.baca_raster(jalur)
    if "diangkat" in R and isinstance(R["diangkat"], str):
        import base64; R["diangkat"] = bytes(base64.b64decode(R["diangkat"]))
    return R


def uji():
    nx = ny = 40; N = nx * ny; kec = array.array("h", [0] * N); hm = array.array("f", [0.0] * N)
    for j in range(10, 20):                              # sel basah 10x10 di (10..19, 10..19), kedalaman 0,5 m
        for i in range(10, 20):
            hm[j * nx + i] = 0.5
    R = {"nx": nx, "ny": ny, "dx_m": 100.0, "lon0": 0.0, "lat0": 0.0, "dlon": 1e-3, "dlat": 1e-3, "nama": ["A|a"], "kec": kec, "hm": hm}
    lap = [{"lon": (10 + i % 10) * 1e-3, "lat": -(10 + i // 10 % 10) * 1e-3} for i in range(100)]    # laporan semuanya di dalam kotak basah
    assert abs(auc([2, 3], [1, 2]) - 0.875) < 1e-9 and auc([1], [1]) == 0.5 and auc([], [1]) is None
    assert hss(10, 0, 0, 10) == 1 and abs(hss(5, 5, 5, 5)) < 1e-12 and hss(0, 0, 0, 0) is None
    cak = cakram(100.0); assert len(cak) == 29 and (0, 0) in cak
    dil = dilasi(R, {5 * nx + 5: 1.0}, cak); assert dil[5 * nx + 5] == 1.0 and dil[5 * nx + 8] == 1.0 and dil[5 * nx + 9] == 0.0 and dil[6 * nx + 6] == 1.0
    n = nilai(R, lap, n_null=20, n_kontrol=500)
    assert n["n_laporan"] == 100 and n["pod"] == 1.0 and n["auc"] > 0.9 and n["hss"] > 0.8 and abs(n["luas_basah"] - 100 / N) < 1e-9, n
    assert n["null"]["b5"]["hss_p95"] < n["hss"] and n["null"]["b10"]["p_hss"] < 0.2, n["null"]    # model tepat >> null acak berklaster
    assert n["null"]["b5"]["p_hss"] >= 1 / 21 - 1e-12 and n["null"]["b10"]["p_hss"] >= 1 / 21 - 1e-12, n["null"]    # p = (k+1)/(n+1): tak pernah 0
    zz = array.array("f", [5.0] * N)
    for j in range(10, 20):
        for i in range(10, 20):
            zz[j * nx + i] = 1.0
    R["z"] = zz; n2 = nilai(R, lap, n_null=5, n_kontrol=500)
    assert n2["heuristik"]["auc"] > 0.9 and abs(n2["heuristik"]["beda_auc_model_minus_heuristik"] - (n2["auc"] - n2["heuristik"]["auc"])) < 1e-12, n2["heuristik"]
    assert elev_min(R, zz, 12 * nx + 12, cak) == 1.0 and elev_min(R, zz, 30 * nx + 30, cak) == 5.0
    # kejadian beruntun: 3 hari berturut-turut = 1 kejadian (puncak); jarak puncak < 4 hari dibuang (kausal); None memutus run
    sr = [("2027-01-01", 10), ("2027-01-02", 45), ("2027-01-03", 60), ("2027-01-04", 41), ("2027-01-05", 5), ("2027-01-06", 50), ("2027-01-12", 40), ("2027-01-13", None), ("2027-01-14", 90), ("2027-01-15", 90), ("2027-01-16", 3), ("2027-01-18", 70)]
    assert pilih_kejadian(sr, 40) == (["2027-01-03", "2027-01-12", "2027-01-18"], ["2027-01-06", "2027-01-14"]), pilih_kejadian(sr, 40)
    ub = [[0.7] * 10, [0.7] * 10]; mu, lo = boot_batas(ub, 50); assert abs(mu - 0.7) < 1e-12 and abs(lo - 0.7) < 1e-12
    s = null_klaster(R, 120, 5, random.Random(1)); assert 120 <= len(s) < 120 + 25
    kon = kontrol_sel(R, 50); assert len(kon) == 50 and all(R["kec"][k] >= 0 for k in kon) and kon == kontrol_sel(R, 50)
    with __import__("tempfile").TemporaryDirectory() as t:
        p = os.path.join(t, "pb.json")
        json.dump([{"t": "2020-01-01T10:00:00+07:00", "lon": 106.82, "lat": -6.2, "kedalaman_cm": 30}, {"t": "2020-01-01T10:00:00+07:00", "lon": 106.82, "lat": -6.2, "kedalaman_cm": 30},
                   {"t": "2020-03-01T10:00:00+07:00", "lon": 106.82, "lat": -6.2, "kedalaman_cm": 30}, {"t": "2020-01-01T10:00:00+07:00", "lon": 105.0, "lat": -6.2, "kedalaman_cm": 30}], open(p, "w"))
        l = muat_label("2019-12-30", 96, berkas=p); assert len(l) == 1 and l[0]["kab"] and l[0]["kec"], l      # dedup, jendela, poligon DKI
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else print(json.dumps(daya(), indent=1)) if sys.argv[1:] == ["daya"] else sys.exit(__doc__)
