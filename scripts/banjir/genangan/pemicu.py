"""M0 model genangan DKI: kurva hujan pemicu genangan per kecamatan -> public/banjir/data/kecamatan_pemicu.json

Kriteria TERKUNCI di docs/banjir/KRITERIA-M0.md (sha256 di KRITERIA_SHA256; beda = hasil tidak sah, skrip menolak).
Satuan: kecamatan DKI (44) x hari musim hujan (Nov-Apr), 2017-2025. Label: laporan PetaBencana (petabencana_laporan.json)
>= n_lap pada hari WIB itu ATAU >= 1 laporan berkedalaman >= 10 cm. Negatif = semua hari musim hujan lain yang punya hujan.
Hujan jam: ERA5 0,25 derajat (Open-Meteo archive, zona Asia/Bangkok = WIB) per sel terdekat tiap kecamatan. BUKAN ERA5-Land:
precipitation ERA5-Land dari Open-Meteo kosong semua (null) untuk Jakarta per 27 Okt 2026, juga di cache J1 hujan_jam/*.json.
Fitur hari: d total harian, m1 maks 1 jam, m3 maks 3 jam beruntun (dalam hari), a7 jumlah d tujuh hari sebelumnya.

Model: logit P = a0 + delta_kec + sum b_j z_j, z = ln(1+fitur) distandarkan, b_j >= 0 (monotonik naik terhadap tiap hujan).
delta_kec menyusut ke kota (ridge lam): kecamatan sedikit hari positif ikut nilai kota. Parameter bebas: a0, 4 b, lam
(+ n_lap dan titik potong peluang). Kurva per kecamatan berbeda hanya lewat intersep (kemiringan dibagi se-kota): 7 musim
tidak cukup menopang kemiringan per kecamatan.
Alur (satu arah, tiap tahap tidak melihat yang sesudahnya):
  ambil   unduh ERA5 jam (cache data/raw/banjir/genangan/hujan_musim/)
  latih   n_lap, lam, titik potong dipilih di LATIH 2017-2022 (CV blok-tahun 3 lipatan, ETS); cek di validasi 2023 (tanpa
          memilih ulang); fit akhir 2017-2023; TULIS SIDIK sha256 (parameter + kode + kriteria); data 2024+ tidak dimuat
  buka    verifikasi sidik, buka uji 2024-2025 SEKALI (tolak kalau state sudah ber-`dibuka`), vonis menurut kriteria
  uji     self-check stdlib

Pakai:  python3 scripts/banjir/genangan/pemicu.py ambil | latih | buka | uji
"""
import datetime as dt, hashlib, json, math, os, random, sys, time, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bersama import AKAR, MENTAH, KecDKI, ambil_json, baca, simpan  # noqa: E402
from bahaya import sentroid  # noqa: E402
from status import level_banjir  # noqa: E402
from uji_balik import skor  # noqa: E402

KRITERIA = os.path.join(AKAR, "docs/banjir/KRITERIA-M0.md")
KRITERIA_SHA256 = "67b5b8fd59e0e88103a1a123e82cc4f3fd647bcf145f59d87d7a6c76ad417a0c"
KODE = os.path.abspath(__file__)
STATE = os.path.join(MENTAH, "pemicu_state.json")
KELUAR = os.path.join(AKAR, "public/banjir/data/kecamatan_pemicu.json")
HUJAN = os.path.join(MENTAH, "hujan_musim")
LAPORAN = os.path.join(MENTAH, "petabencana_laporan.json")
BAHAYA = os.path.join(AKAR, "public/banjir/data/bahaya.json")
VERSI = 1
LATIH, VAL, UJI = (2017, 2022), 2023, (2024, 2025)
MUSIM = {11, 12, 1, 2, 3, 4}
N_LAP, LAM = (1, 2, 3, 5), (1.0, 10.0, 100.0)
LIPATAN = ((2017, 2018), (2019, 2020), (2021, 2022))
GRID_D = (10, 20, 30, 40, 60, 80, 100, 130, 160, 200, 250, 300)
GRID_M1 = (5, 10, 15, 20, 30, 40, 60, 80, 120)
ULANG_CI, ULANG_PITA = 1000, 60
LABEL = "Hipotesis, belum lolos uji"
FITUR = ("d", "m1", "m3", "a7")


def kriteria_ok():
    h = hashlib.sha256(open(KRITERIA, "rb").read()).hexdigest()
    if h != KRITERIA_SHA256:
        sys.exit(f"KRITERIA-M0.md berubah ({h}); hasil tidak sah, tolak")
    return h


def sidik(isi):
    h = hashlib.sha256(json.dumps(isi, sort_keys=True).encode())
    for j in (KODE, KRITERIA):
        h.update(hashlib.sha256(open(j, "rb").read()).digest())
    return h.hexdigest()


# ------------------------------------------------------------------ hujan jam
def kecamatan():
    """-> [(kunci "kab|kec", lat, lon)] 44 kecamatan DKI, titik berat cincin terbesar."""
    out = []
    for f in json.load(open(os.path.join(AKAR, "public/geo/kecamatan/31.json")))["features"]:
        g = f["geometry"]
        ring = max((p[0] for p in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]])), key=len)
        la, lo = sentroid(ring)
        out.append((f"{f['properties']['kab']}|{f['properties']['kec']}", la, lo))
    return out


def sel_era5(lat, lon):
    return (round(lat * 4) / 4, round(lon * 4) / 4)


CHUNK = [(dt.date(2016, 12, 20), dt.date(2017, 12, 31))] + [(dt.date(y, 1, 1), dt.date(y, 12, 31)) for y in range(2018, 2025)] \
    + [(dt.date(2025, 1, 1), dt.date(2026, 1, 2))]


def ambil():
    sel = sorted({sel_era5(la, lo) for _, la, lo in kecamatan()})
    for a, b in CHUNK:
        jalur = os.path.join(HUJAN, f"era5_{a:%Y%m%d}_{b:%Y%m%d}.json")
        if os.path.exists(jalur):
            continue
        q = {"latitude": ",".join(str(s[0]) for s in sel), "longitude": ",".join(str(s[1]) for s in sel),
             "start_date": a.isoformat(), "end_date": b.isoformat(), "hourly": "precipitation", "models": "era5",
             "timezone": "Asia/Bangkok"}
        d = ambil_json("https://archive-api.open-meteo.com/v1/archive?" + urllib.parse.urlencode(q, safe=","))
        d = d if isinstance(d, list) else [d]
        assert len(d) == len(sel), (len(d), len(sel))
        simpan(jalur, {"sel": sel, "data": [{"waktu": x["hourly"]["time"], "mm": x["hourly"]["precipitation"]} for x in d]})
        print("  ambil", a, b, file=sys.stderr)
        time.sleep(5)


def harian(jam_per_sel):
    """{sel: {tanggal: (d, m1, m3)}} dari {sel: [(waktu, mm)]}; hari dengan jam kosong dibuang (bukan dianggap 0)."""
    out = {}
    for s, seri in jam_per_sel.items():
        hari = {}
        for w, mm in seri:
            hari.setdefault(w[:10], []).append(mm)
        o = {}
        for tgl, v in hari.items():
            if len(v) == 24 and None not in v:
                o[tgl] = (sum(v), max(v), max(sum(v[i:i + 3]) for i in range(22)))
        out[s] = o
    return out


def muat_hujan():
    jam = {}
    for a, b in CHUNK:
        j = baca(os.path.join(HUJAN, f"era5_{a:%Y%m%d}_{b:%Y%m%d}.json"))
        if not j:
            sys.exit("hujan jam belum lengkap: jalankan `pemicu.py ambil`")
        for s, x in zip(j["sel"], j["data"]):
            jam.setdefault(tuple(s), []).extend(zip(x["waktu"], x["mm"]))
    return harian(jam)


# ------------------------------------------------------------------ tabel kecamatan-hari
def label_laporan():
    """{(kab|kec, tanggal): (n_laporan, kedalaman_maks_cm atau 0)} hanya laporan di dalam DKI."""
    k, out = KecDKI(), {}
    for r in json.load(open(LAPORAN)):
        c = k.cari(r["lon"], r["lat"])
        if not c:
            continue
        kunci = (f"{c[0]}|{c[1]}", r["t"][:10])
        n, m = out.get(kunci, (0, 0))
        out[kunci] = (n + 1, max(m, r["kedalaman_cm"] or 0))
    return out


def tabel(kecs, hujan, lap, tahun_maks, tahun_min=LATIH[0]):
    """Baris kecamatan-hari musim hujan tahun_min..tahun_maks yang punya hujan d-7..d+1. Tahun > tahun_maks TIDAK dimuat."""
    baris = []
    for ki, (kunci, la, lo) in enumerate(kecs):
        h = hujan[sel_era5(la, lo)]
        for tahun in range(tahun_min, tahun_maks + 1):
            t = dt.date(tahun, 1, 1)
            while t.year == tahun:
                if t.month in MUSIM:
                    wkt = [(t + dt.timedelta(days=i)).isoformat() for i in range(-7, 2)]
                    v = [h.get(w) for w in wkt]
                    if all(v):
                        n, dm = lap.get((kunci, t.isoformat()), (0, 0))
                        baris.append({"k": ki, "t": t.isoformat(), "y": tahun, "bln": t.month, "n": n, "dm": dm,
                                      "d": v[7][0], "m1": v[7][1], "m3": v[7][2], "a7": sum(x[0] for x in v[:7]),
                                      "h3": sum(x[0] for x in v[6:9]), "imax": max(x[1] for x in v[6:9])})
                t += dt.timedelta(days=1)
    return baris


def positif(r, n_lap):
    return r["n"] >= n_lap or r["dm"] >= 10


def z_baris(r):
    return [math.log1p(r[f]) for f in FITUR]


# ------------------------------------------------------------------ model
def sig(x):
    if x >= 0:
        return 1 / (1 + math.exp(-x))
    e = math.exp(x)
    return e / (1 + e)


def selesaikan(A, v):
    n = len(v)
    M = [A[i][:] + [v[i]] for i in range(n)]
    for i in range(n):
        p = max(range(i, n), key=lambda r: abs(M[r][i]))
        M[i], M[p] = M[p], M[i]
        for r in range(n):
            if r != i:
                f = M[r][i] / M[i][i]
                M[r] = [a - f * b for a, b in zip(M[r], M[i])]
    return [M[i][n] / M[i][i] for i in range(n)]


def bakukan(baris):
    Z = [z_baris(r) for r in baris]
    mu = [sum(z[j] for z in Z) / len(Z) for j in range(4)]
    sd = [math.sqrt(sum((z[j] - mu[j]) ** 2 for z in Z) / len(Z)) or 1.0 for j in range(4)]
    return mu, sd


def latih_lr(Z, K, Y, nk, lam, init=None, iterasi=12):
    """Newton teredam untuk (a0, b1..b4) dengan b >= 0 (diproyeksi), lalu delta_kec satu langkah Newton beralas ridge lam.
    ponytail: proyeksi b>=0 sesudah tiap langkah, bukan solusi QP eksak; cukup karena fitur berkorelasi positif dan b jarang menyentuh 0."""
    th = init["th"][:] if init else [-3.0, 0.1, 0.1, 0.1, 0.1]
    dl = init["dl"][:] if init else [0.0] * nk
    n = len(Y)
    for _ in range(iterasi):
        g, H = [0.0] * 5, [[0.0] * 5 for _ in range(5)]
        for i in range(n):
            z, e = Z[i], th[0] + dl[K[i]]
            for j in range(4):
                e += th[j + 1] * z[j]
            p = sig(e)
            r, w = p - Y[i], p * (1 - p)
            x = (1.0, z[0], z[1], z[2], z[3])
            for a in range(5):
                g[a] += r * x[a]
                wa = w * x[a]
                Ha = H[a]
                for b in range(a, 5):
                    Ha[b] += wa * x[b]
        for a in range(5):
            for b in range(a):
                H[a][b] = H[b][a]
            if a:
                H[a][a] += 1e-3
                g[a] += 1e-3 * th[a]
            H[a][a] += 1e-6
        st = selesaikan(H, g)
        th = [th[0] - st[0]] + [max(0.0, th[j] - st[j]) for j in range(1, 5)]
        sr, sw = [0.0] * nk, [0.0] * nk
        for i in range(n):
            z, e = Z[i], th[0] + dl[K[i]]
            for j in range(4):
                e += th[j + 1] * z[j]
            p = sig(e)
            sr[K[i]] += p - Y[i]
            sw[K[i]] += p * (1 - p)
        dl = [dl[k] - (sr[k] + lam * dl[k]) / (sw[k] + lam) for k in range(nk)]
    return {"th": th, "dl": dl}


def fit(baris, n_lap, lam, nk, norm=None, init=None, iterasi=12):
    mu, sd = norm or bakukan(baris)
    Z = [[(a - m) / s for a, m, s in zip(z_baris(r), mu, sd)] for r in baris]
    m = latih_lr(Z, [r["k"] for r in baris], [1.0 if positif(r, n_lap) else 0.0 for r in baris], nk, lam, init, iterasi)
    return {**m, "mu": mu, "sd": sd, "lam": lam}


def peluang_z(m, k, z):
    e = m["th"][0] + m["dl"][k]
    for j in range(4):
        e += m["th"][j + 1] * (z[j] - m["mu"][j]) / m["sd"][j]
    return sig(e)


def prediksi(m, baris):
    return [peluang_z(m, r["k"], z_baris(r)) for r in baris]


# ------------------------------------------------------------------ skor
def kontingensi(baris, ya, n_lap):
    """-> {(kec, tahun): [a, b, c, d]} (a kena, b alarm palsu, c luput, d benar-tenang)."""
    out = {}
    for r, f in zip(baris, ya):
        t = out.setdefault((r["k"], r["y"]), [0, 0, 0, 0])
        p = positif(r, n_lap)
        t[0 if (f and p) else 1 if f else 2 if p else 3] += 1
    return out


def jumlah(blok, kunci=None):
    t = [0, 0, 0, 0]
    for k in (blok if kunci is None else kunci):
        t = [x + y for x, y in zip(t, blok[k])]
    return t


def ringkas(blok):
    s = skor(*jumlah(blok))
    return {**{m: None if s[m] is None else round(s[m], 3) for m in ("pod", "far", "csi", "ets")}, "n": dict(zip("abcd", jumlah(blok)))}


def sub(blok, tahun):
    return {k: v for k, v in blok.items() if k[1] in tahun}


def ets(blok, kunci=None):
    return skor(*jumlah(blok, kunci))["ets"]


def pilih_potong(baris, p, n_lap):
    """Titik potong peluang dengan ETS tertinggi pada baris (dipakai hanya pada prediksi luar-lipatan data latih)."""
    terbaik = (-9, 0.5)
    for c in [i / 100 for i in range(2, 91)]:
        e = ets(kontingensi(baris, [x >= c for x in p], n_lap)) or -9
        if e > terbaik[0]:
            terbaik = (e, c)
    return terbaik[1], terbaik[0]


def bootstrap_selisih(b1, b0, ulang=ULANG_CI, seed=3):
    """Bootstrap blok (kec x tahun) berpasangan: selisih ETS b1 - b0. -> (titik, [lo, hi] 95%)"""
    kunci, r, xs = sorted(b0), random.Random(seed), []
    for _ in range(ulang):
        p = [r.choice(kunci) for _ in kunci]
        a, b = ets(b1, p), ets(b0, p)
        if a is not None and b is not None:
            xs.append(a - b)
    xs.sort()
    return round(ets(b1) - ets(b0), 4), [round(xs[int(.025 * (len(xs) - 1))], 4), round(xs[int(.975 * (len(xs) - 1))], 4)]


# ------------------------------------------------------------------ pembanding
def pembanding_fit(baris, n_lap, kecs):
    """Parameter pembanding (a) klimatologi bulanan dan (b) ambang harian seragam, dipilih (ETS) pada baris fit."""
    frek = {}
    for r in baris:
        a = frek.setdefault((r["k"], r["bln"]), [0, 0])
        a[0] += positif(r, n_lap)
        a[1] += 1
    fr = {k: v[0] / v[1] for k, v in frek.items()}
    pa = [fr[(r["k"], r["bln"])] for r in baris]
    cut_a = max(sorted(set(round(x, 4) for x in pa)) or [0.5], key=lambda c: ets(kontingensi(baris, [x >= c for x in pa], n_lap)) or -9)
    cut_b = max(range(5, 201), key=lambda c: ets(kontingensi(baris, [r["d"] >= c for r in baris], n_lap)) or -9)
    return {"klim": {f"{k[0]}|{k[1]}": round(v, 5) for k, v in fr.items()}, "cut_klim": cut_a, "cut_harian_mm": cut_b}


def pembanding_ya(pb, baris, bahaya, kecs):
    """-> {nama: [bool]} untuk (a) klimatologi, (b) ambang harian, (c1/c2) status.py level >= Waspada / >= Siaga."""
    c = []
    for r in baris:
        b = bahaya["kec"].get("31|" + kecs[r["k"]][0], {}).get("banjir", 0.0)
        # RK (kelas debit sungai) tidak ada arsipnya per hari 2017-2025: 0 = jalur sungai mati; p3, cape tidak ada: 0
        c.append(level_banjir(r["h3"], b, 0, r["imax"]))
    return {"klimatologi_bulanan": [pb["klim"].get(f"{r['k']}|{r['bln']}", 0) >= pb["cut_klim"] for r in baris],
            "ambang_harian_kota": [r["d"] >= pb["cut_harian_mm"] for r in baris],
            "status_py_waspada": [x >= 1 for x in c], "status_py_siaga": [x >= 2 for x in c]}


# ------------------------------------------------------------------ kurva keluaran
def grid_m3(baris):
    """Regresi ln(1+m3) ~ 1 + ln(1+d) + ln(1+m1) (kuadrat terkecil, kemiringan dijepit >= 0) untuk mengisi m3 pada grid."""
    X = [(1.0, math.log1p(r["d"]), math.log1p(r["m1"])) for r in baris]
    y = [math.log1p(r["m3"]) for r in baris]
    A = [[sum(x[i] * x[j] for x in X) for j in range(3)] for i in range(3)]
    c = selesaikan(A, [sum(x[i] * v for x, v in zip(X, y)) for i in range(3)])
    return [c[0], max(0.0, c[1]), max(0.0, c[2])]


def kurva(m, k, c3, a7):
    """Peluang di grid (d x m1), None bila m1 > d. m3 = min(d, model c3); a7 tetap median."""
    out = []
    for d in GRID_D:
        for m1 in GRID_M1:
            if m1 > d:
                out.append(None)
                continue
            m3 = min(d, math.expm1(c3[0] + c3[1] * math.log1p(d) + c3[2] * math.log1p(m1)))
            m3 = max(m3, m1)
            out.append(peluang_z(m, k, [math.log1p(d), math.log1p(m1), math.log1p(m3), math.log1p(a7)]))
    return out


def pita(baris, model, nk, c3, a7, n_lap, lam, ulang=ULANG_PITA, seed=5):
    """Pita bootstrap blok (kec x tahun) pada baris fit: refit hangat -> persentil 5 dan 95 per sel grid per kecamatan."""
    r, blok = random.Random(seed), {}
    for i, b in enumerate(baris):
        blok.setdefault((b["k"], b["y"]), []).append(i)
    kunci, norm = sorted(blok), (model["mu"], model["sd"])
    sampel = [[[] for _ in range(len(GRID_D) * len(GRID_M1))] for _ in range(nk)]
    for _ in range(ulang):
        idx = [i for kk in (r.choice(kunci) for _ in kunci) for i in blok[kk]]
        mb = fit([baris[i] for i in idx], n_lap, lam, nk, norm, model, 4)
        for k in range(nk):
            for g, p in enumerate(kurva(mb, k, c3, a7)):
                if p is not None:
                    sampel[k][g].append(p)
    q = lambda v, f: round(sorted(v)[int(f * (len(v) - 1))], 3) if v else None
    return [[[q(s, .05) for s in sampel[k]], [q(s, .95) for s in sampel[k]]] for k in range(nk)]


def monotonik(p):
    """p = vektor GRID_D x GRID_M1 (None boleh). Tak turun searah d dan searah m1."""
    nm = len(GRID_M1)
    for i in range(len(GRID_D)):
        for j in range(nm):
            v = p[i * nm + j]
            if v is None:
                continue
            for a in ((p[i * nm + j - 1] if j else None), (p[(i - 1) * nm + j] if i else None)):
                if a is not None and a > v + 1e-9:
                    return False
    return True


# ------------------------------------------------------------------ latih
def latih():
    kriteria_ok()
    if (baca(STATE) or {}).get("dibuka"):
        sys.exit("uji sudah dibuka; latih ulang tidak diizinkan")
    kecs, hujan, lap = kecamatan(), muat_hujan(), label_laporan()
    nk = len(kecs)
    baris = tabel(kecs, hujan, lap, VAL)                      # tahun uji TIDAK dimuat di tahap ini
    assert max(r["y"] for r in baris) <= VAL
    bahaya = baca(BAHAYA)
    lat = [r for r in baris if r["y"] <= LATIH[1]]
    # 1. pilih n_lap, lam, potong: CV blok-tahun pada latih; ETS luar-lipatan pada label n_lap itu sendiri (ETS mengoreksi laju dasar)
    kandidat = []
    for n_lap in N_LAP:
        for lam in LAM:
            oof, idx = [], []
            for lip in LIPATAN:
                dalam = [r for r in lat if r["y"] not in lip]
                luar = [r for r in lat if r["y"] in lip]
                oof += prediksi(fit(dalam, n_lap, lam, nk), luar)
                idx += luar
            c, e = pilih_potong(idx, oof, n_lap)
            kandidat.append({"n_lap": n_lap, "lam": lam, "potong": c, "ets_cv": round(e, 4)})
            print(f"  n_lap {n_lap} lam {lam:g}: potong {c} ETS-CV {e:.4f}", file=sys.stderr)
    best = max(kandidat, key=lambda x: x["ets_cv"])
    n_lap, lam, potong = best["n_lap"], best["lam"], best["potong"]
    # 2. cek di validasi 2023 (fit hanya latih, tanpa memilih ulang)
    val = [r for r in baris if r["y"] == VAL]
    m_lat = fit(lat, n_lap, lam, nk)
    pb_lat = pembanding_fit(lat, n_lap, kecs)
    yv = {"m0": [p >= potong for p in prediksi(m_lat, val)], **pembanding_ya(pb_lat, val, bahaya, kecs)}
    validasi = {n: ringkas(kontingensi(val, y, n_lap)) for n, y in yv.items()}
    # 3. fit akhir latih+validasi 2017-2023 dengan hiperparameter terpilih
    m = fit(baris, n_lap, lam, nk)
    pb = pembanding_fit(baris, n_lap, kecs)
    param = {"versi": VERSI, "n_lap": n_lap, "lam": lam, "potong": potong, "fit": [LATIH[0], VAL], "th": [round(x, 6) for x in m["th"]],
             "dl": [round(x, 6) for x in m["dl"]], "mu": [round(x, 6) for x in m["mu"]], "sd": [round(x, 6) for x in m["sd"]],
             "pembanding": pb, "sumber_hujan": "ERA5 0,25 derajat jam (Open-Meteo archive); ERA5-Land precipitation kosong"}
    m = {"th": param["th"], "dl": param["dl"], "mu": param["mu"], "sd": param["sd"], "lam": lam}
    hs = sidik(param)
    c3, a7 = grid_m3(baris), sorted(r["a7"] for r in baris)[len(baris) // 2]
    ban = pita(baris, m, nk, c3, a7, n_lap, lam)
    lat_pos = {}
    for r in lat:
        if positif(r, n_lap):
            a = lat_pos.setdefault(r["k"], [0, r["d"], r["m1"]])
            a[0] += 1
            a[1], a[2] = min(a[1], r["d"]), min(a[2], r["m1"])
    sidik_t = {"sidik_parameter_kode": hs, "dicatat": dt.datetime.now().isoformat(timespec="seconds"), "kriteria_sha256": KRITERIA_SHA256}
    simpan(STATE, {"sidik": hs, "param": param, "kandidat": kandidat, "validasi": validasi, "c3": c3, "a7": a7, "dibuka": None})
    tulis(kecs, m, c3, a7, ban, lat_pos, param, kandidat, validasi, {"status": "belum dibuka", **sidik_t, "periode": f"{UJI[0]}-{UJI[1]}"})
    print("sidik", hs, file=sys.stderr)
    for n, v in validasi.items():
        print("  val 2023", n, v, file=sys.stderr)


def tulis(kecs, m, c3, a7, ban, lat_pos, param, kandidat, validasi, kinerja):
    kec = {}
    for k, (kunci, _, _) in enumerate(kecs):
        pos = lat_pos.get(k, [0, None, None])
        kec[kunci] = {"p": [None if x is None else round(x, 3) for x in kurva(m, k, c3, a7)], "lo": ban[k][0], "hi": ban[k][1],
                      "hujan_terkecil_pemicu": None if pos[1] is None else {"harian_mm": round(pos[1], 1), "maks_1j_mm": round(pos[2], 1)},
                      "hari_positif_latih": pos[0]}
    simpan(KELUAR, {
        "label": LABEL if kinerja.get("vonis") != "LULUS" else "Lulus uji M0",
        "dibuat": dt.date.today().isoformat(),
        "grid": {"harian_mm": list(GRID_D), "maks_1j_mm": list(GRID_M1), "urutan": "p[i_harian * 9 + j_maks1j]; null bila maks 1 jam > harian",
                 "m3_diisi": "regresi ln(1+m3) pada d dan m1, dibatasi d", "a7_mm": round(a7, 1), "pita": "persentil 5 dan 95 dari %d refit bootstrap blok kecamatan x tahun" % ULANG_PITA},
        "model": {"definisi": "logit P = a0 + delta_kec + sum b_j z_j; z = ln(1+fitur) distandarkan; b >= 0 (monoton); delta_kec menyusut ke kota (ridge)",
                  "fitur": list(FITUR), "n_lap": param["n_lap"], "lam": param["lam"], "potong_peluang": param["potong"],
                  "label": "laporan PetaBencana >= n_lap, atau >= 1 laporan berkedalaman >= 10 cm", "musim": "Nov-Apr",
                  "latih": f"{LATIH[0]}-{LATIH[1]}", "validasi": VAL, "fit_akhir": f"{LATIH[0]}-{VAL}", "sumber_hujan": param["sumber_hujan"],
                  "pemilihan_cv": kandidat, "validasi_2023": validasi},
        "kinerja_uji": kinerja,
        "keterbatasan": ["Laporan PetaBencana bias pelapor (2024 berisi laporan jauh lebih banyak); ketiadaan laporan bukan bukti kering.",
                         "Hujan jam ERA5 0,25 derajat (satu sel menaungi beberapa kecamatan), belum dikoreksi bias; pos hujan DSDA/BMKG belum diminta.",
                         "Kemiringan kurva dibagi se-kota; kecamatan berbeda lewat intersep terpenyusutan.",
                         "Kepulauan Seribu: sel ERA5 laut."],
        "kec": kec}, )


# ------------------------------------------------------------------ buka
def buka(state=STATE, keluar=None):
    kriteria_ok()
    S = baca(state)
    if not S or "sidik" not in S:
        sys.exit("sidik belum tertulis: jalankan `latih` dulu; uji tidak boleh dibuka")
    if S.get("dibuka"):
        sys.exit(f"uji sudah dibuka {S['dibuka']['tanggal']} (sidik {S['dibuka']['sidik']}); tidak bisa dibuka lagi")
    if sidik(S["param"]) != S["sidik"]:
        sys.exit("sidik beda: kode pemicu.py, kriteria, atau parameter berubah sejak latih; tolak")
    P = S["param"]
    kecs, hujan, lap, bahaya = kecamatan(), muat_hujan(), label_laporan(), baca(BAHAYA)
    nk, n_lap = len(kecs), P["n_lap"]
    uji = tabel(kecs, hujan, lap, UJI[1], UJI[0])
    m = {k: P[k] for k in ("th", "dl", "mu", "sd")}
    ya = {"m0": [p >= P["potong"] for p in prediksi(m, uji)], **pembanding_ya(P["pembanding"], uji, bahaya, kecs)}
    blok = {n: kontingensi(uji, y, n_lap) for n, y in ya.items()}
    ring = {n: {"2024-2025": ringkas(b), "2024": ringkas(sub(b, {2024})), "2025": ringkas(sub(b, {2025}))} for n, b in blok.items()}
    pemb = [n for n in blok if n != "m0"]
    terbaik = max(pemb, key=lambda n: ets(blok[n]) or -9)
    selisih = {n: bootstrap_selisih(blok["m0"], blok[n]) for n in pemb}
    t = ring["m0"]["2024-2025"]
    syarat = [("POD >= 0,60", t["pod"] is not None and t["pod"] >= 0.60), ("FAR <= 0,60", t["far"] is not None and t["far"] <= 0.60),
              ("batas bawah CI95 selisih ETS terhadap pembanding terbaik > 0", selisih[terbaik][1][0] > 0)]
    lulus = all(x for _, x in syarat)
    kin = {"vonis": "LULUS" if lulus else "GAGAL", "syarat": [{"syarat": s, "lolos": x} for s, x in syarat], "periode": f"{UJI[0]}-{UJI[1]}",
           "n_kecamatan_hari": len(uji), "metrik": ring, "pembanding_terbaik": terbaik,
           "selisih_ets_vs_pembanding": {n: {"titik": v[0], "ci95": v[1]} for n, v in selisih.items()},
           "bootstrap": f"blok kecamatan x tahun berpasangan, {ULANG_CI} ulangan", "kriteria_sha256": KRITERIA_SHA256,
           "sha256_parameter_kode": S["sidik"], "tanggal_buka_uji": dt.date.today().isoformat(),
           "catatan_pembanding": {"status_py": "RK (debit sungai harian 2017-2025) tidak tersedia: jalur sungai dimatikan (rk=0), "
                                  "CAPE dan P3 ansambel nol; h3 = hujan d-1..d+1 (prakiraan sempurna), imax dari ERA5 jam; bahaya InaRISK sekarang. "
                                  "Dua varian dinilai: level >= Waspada dan >= Siaga.",
                                  "pembanding_terbaik": "dipilih menurut ETS uji (paling sulit bagi M0)"}}
    S["dibuka"] = {"sidik": S["sidik"], "tanggal": dt.date.today().isoformat()}
    S["hasil_uji"] = kin
    simpan(state, S)
    ban = baca(keluar or KELUAR)
    ban["kinerja_uji"], ban["label"] = kin, (LABEL if not lulus else "Lulus uji M0")
    simpan(keluar or KELUAR, ban)
    print(json.dumps({n: ring[n] for n in ring}, indent=1))
    print("terbaik", terbaik, selisih)
    for s, x in syarat:
        print("  LOLOS" if x else "  GAGAL", s)
    print("VONIS", kin["vonis"])
    return kin


# ------------------------------------------------------------------ self-check
def uji():
    import tempfile
    kriteria_ok()
    assert skor(5, 5, 5, 85)["pod"] == 0.5
    # data mainan: hujan menentukan label; hujan dua sel, 3 kecamatan, 2017-2023 (+2024 sebagai jebakan)
    r = random.Random(1)
    kecs = [("A|a", -6.2, 106.8), ("A|b", -6.2, 106.8), ("B|c", -6.3, 106.9)]
    hujan = {}
    for s in {sel_era5(la, lo) for _, la, lo in kecs}:
        h, t = {}, dt.date(2016, 12, 1)
        while t < dt.date(2026, 2, 1):
            d = r.expovariate(1 / 8)
            h[t.isoformat()] = (d, d * .4, d * .6)
            t += dt.timedelta(days=1)
        hujan[s] = h
    lap = {}
    for (k, la, lo) in kecs:
        for t, v in hujan[sel_era5(la, lo)].items():
            if v[0] > 25 and r.random() < .8:
                lap[(k, t)] = (3, 15)
    tb = tabel(kecs, hujan, lap, VAL)
    assert tb and max(x["y"] for x in tb) == VAL, "tahun uji ikut termuat sebelum sidik"
    m = fit(tb, 3, 10.0, 3)
    assert min(m["th"][1:]) >= 0
    for k in range(3):
        assert monotonik(kurva(m, k, grid_m3(tb), 30)), "kurva mainan tidak monotonik"
    # gerbang: buka tanpa sidik harus gagal; sidik yang basi harus gagal
    tmp = os.path.join(tempfile.mkdtemp(), "state.json")
    for isi in (None, {"param": {}}, {"sidik": "salah", "param": {}}):
        if isi:
            simpan(tmp, isi)
        try:
            buka(tmp, tmp)
        except SystemExit:
            continue
        raise AssertionError("buka berjalan tanpa sidik sah")
    # berkas keluaran nyata (bila ada): monotonik, ukuran, sidik ada, tidak ada keluaran 'vonis' tanpa sidik
    if os.path.exists(KELUAR):
        d = baca(KELUAR)
        assert os.path.getsize(KELUAR) < 200_000, os.path.getsize(KELUAR)
        assert len(d["kec"]) == 44
        for k, v in d["kec"].items():
            assert monotonik(v["p"]) and monotonik(v["hi"]) and monotonik(v["lo"]), f"{k} tidak monotonik"
        kin = d["kinerja_uji"]
        assert kin["kriteria_sha256"] == KRITERIA_SHA256
        S = baca(STATE)
        assert S and kin.get("sidik_parameter_kode", kin.get("sha256_parameter_kode")) == S["sidik"], "sidik keluaran != state"
        if kin.get("vonis"):
            assert S.get("dibuka"), "vonis tertulis tapi uji tidak tercatat dibuka"
    print("ok")


if __name__ == "__main__":
    {"ambil": ambil, "latih": latih, "buka": buka, "uji": uji}.get(sys.argv[1] if len(sys.argv) > 1 else "uji", uji)()
