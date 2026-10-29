"""Efek OMC terhadap hujan sesuai data/laporan-bnpb/omc/riset/PRAREG-EFEK-OMC.md (jangan ubah aturan tanpa catat penyimpangan).

Pakai (butuh numpy; analisis lokal, bukan pipeline):
  python3 scripts/omc/efek.py uji        self-check luring
  python3 scripts/omc/efek.py tarik      CHIRPS prelim (data/raw/omc_efek/chirps/*.tif.gz sudah diunduh) + IFS Open-Meteo -> panel CSV
  python3 scripts/omc/efek.py analisis   regresi, permutasi, plasebo, MDE -> riset/hasil_efek.json
Masukan: omc_rekap.csv, public/geo/kabupaten/*.json. Keluaran: data/laporan-bnpb/omc/riset/ (ringkasan), data/raw/omc_efek (mentah, ignored).
"""
import warnings; warnings.filterwarnings("ignore", message=".*encountered in matmul")  # peringatan palsu BLAS macOS (hasil dicocokkan dengan lstsq di uji)
import time, csv, datetime as dt, glob, gzip, json, math, os, re, struct, sys, urllib.request
import numpy as np

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
RISET = os.path.join(AKAR, "data/laporan-bnpb/omc/riset")
MENTAH = os.path.join(AKAR, "data/raw/omc_efek")
REKAP = os.path.join(AKAR, "data/laporan-bnpb/omc/omc_rekap.csv")
PROV = {"11": "Aceh", "12": "Sumatera Utara", "13": "Sumatera Barat", "14": "Riau", "15": "Jambi", "16": "Sumatera Selatan",
        "17": "Bengkulu", "18": "Lampung", "19": "Kepulauan Bangka Belitung", "21": "Kepulauan Riau",
        "61": "Kalimantan Barat", "62": "Kalimantan Tengah", "63": "Kalimantan Selatan", "65": "Kalimantan Utara"}  # 64 Kaltim keluar (PRAREG 3)
TAHUN_OKT = "2026-10-%02d"
TUTUP = "2026-10-25"          # dibuang (PRAREG 3)
OPS0 = 16                     # hari operasi pertama
SEED = 20261028
BANDARA = {"WAOO": (114.763, -3.442), "WIBB": (101.445, 0.461), "WIDD": (104.12, 1.12), "WIEE": (100.28, -0.787), "WILL": (105.18, -5.242),
           "WIMM": (98.67, 3.558), "WIOO": (109.40, -0.151), "WIPP": (104.70, -2.898), "WITT": (95.42, 5.52)}  # (lon, lat) bandara, arsip METAR tak membawa koordinat


ALIAS = {"oki": "ogankomeringilir", "oku": "ogankomeringulu", "okutimur": "ogankomeringulutimur", "okuselatan": "ogankomeringuluselatan"}


def norm(s):
    s = re.sub(r"\([^)]*\)", "", s).lower().strip()   # buang keterangan dalam kurung: "(NaCl)", "(Kalsel)"
    s = re.sub(r"^(kota|kab\.?|kabupaten)\s+", "", s)
    s = re.sub(r"[^a-z0-9]", "", s)
    return ALIAS.get(s, s)


# ------------------------------------------------------------------ geometri
def baca_kab():
    """[{kode, prov, nama, n, ring: [poligon (daftar cincin)]}]"""
    out = []
    for kode in PROV:
        p = os.path.join(AKAR, f"public/geo/kabupaten/{kode}.json")
        for f in json.load(open(p))["features"]:
            g = f["geometry"]
            polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
            out.append({"prov": PROV[kode], "nama": f["properties"]["kab"], "n": norm(f["properties"]["kab"]), "polys": polys})
    return out


def dalam(px, py, poly):
    """titik di poligon (cincin luar ganjil-genap, lubang ikut aturan genap-ganjil)."""
    c = False
    for ring in poly:
        n = len(ring)
        j = n - 1
        for i in range(n):
            xi, yi = ring[i][:2]
            xj, yj = ring[j][:2]
            if (yi > py) != (yj > py) and px < (xj - xi) * (py - yi) / (yj - yi) + xi:
                c = not c
            j = i
    return c


def titik_kab(k, x, y):
    return any(dalam(x, y, p) for p in k["polys"])


def pusat(k):
    pts = [(c[0], c[1]) for p in k["polys"] for c in p[0]]
    return (sum(a for a, _ in pts) / len(pts), sum(b for _, b in pts) / len(pts))


def tetangga(kabs, jarak=0.02):
    """pasangan bersebelahan: jarak titik-sudut terdekat < jarak derajat (bbox dulu)."""
    pts, bb = [], []
    for k in kabs:
        a = np.array([c[:2] for p in k["polys"] for c in p[0]])
        pts.append(a)
        bb.append((a[:, 0].min(), a[:, 1].min(), a[:, 0].max(), a[:, 1].max()))
    nb = [set() for _ in kabs]
    for i in range(len(kabs)):
        for j in range(i + 1, len(kabs)):
            a, b = bb[i], bb[j]
            if a[0] - jarak > b[2] or b[0] - jarak > a[2] or a[1] - jarak > b[3] or b[1] - jarak > a[3]:
                continue
            d = ((pts[i][:, None, :] - pts[j][None, :, :]) ** 2).sum(-1).min()
            if d < jarak ** 2:
                nb[i].add(j); nb[j].add(i)
    return nb


# ------------------------------------------------------------------ perlakuan
def baca_perlakuan(kabs):
    """-> (D: dict bahan -> {(i,hari)}, kontam: {(prov,hari)}, tak_cocok: [token])"""
    idx = {}
    for i, k in enumerate(kabs):
        idx.setdefault(k["n"], []).append(i)
    D = {"any": set(), "nacl": set(), "dry": set(), "campur": set()}
    kontam, tak = set(), []
    for r in csv.DictReader(open(REKAP, encoding="utf-8")):
        tg = r["tanggal"].strip()
        sortie = float(r["sortie"] or 0)
        prov = r["provinsi"]
        if ".." in tg:
            a, b = tg.split("..")
            if sortie > 0:
                for h in range(int(a[-2:]), int(b[-2:]) + 1):
                    kontam.add((prov, h))
            continue
        if not tg or sortie <= 0:
            continue
        h = int(tg[-2:])
        nacl, dry = float(r["nacl_kg"] or 0) > 0, float(r["dry_ice_kg"] or 0) > 0
        toks = [t.strip() for t in r["sasaran"].split(";") if t.strip()]
        if not toks:
            kontam.add((prov, h))
        for t in toks:
            hit = [i for i in idx.get(norm(t), []) if kabs[i]["prov"] == prov] or idx.get(norm(t), [])
            if not hit:
                tak.append((tg, prov, t)); kontam.add((prov, h)); continue
            for i in hit:
                D["any"].add((i, h))
                if nacl: D["nacl"].add((i, h))
                if dry: D["dry"].add((i, h))
                if nacl and dry: D["campur"].add((i, h))
    return D, kontam, tak


# ------------------------------------------------------------------ CHIRPS
NX, NY, LON0, LAT0, RES = 7200, 2000, -180.0, 50.0, 0.05


def baca_chirps(gz, j0, j1):
    """baris j0..j1-1 -> array float32 (j1-j0, NX); -9999 = hilang. Tiff tanpa kompresi, satu baris per strip, little-endian."""
    b = gzip.open(gz).read()
    o = struct.unpack("<I", b[4:8])[0]
    n = struct.unpack("<H", b[o:o + 2])[0]
    tag = {}
    for i in range(n):
        t, ty, c, v = struct.unpack("<HHII", b[o + 2 + i * 12:o + 14 + i * 12])
        tag[t] = (c, v)
    assert tag[256][1] == NX and tag[257][1] == NY and tag[259][1] == 1 and tag[339][1] == 3, "format CHIRPS berubah"
    off = np.frombuffer(b[tag[273][1]:tag[273][1] + 4 * NY], dtype="<u4")
    return np.stack([np.frombuffer(b[off[j]:off[j] + NX * 4], dtype="<f4") for j in range(j0, j1)])


def sel_kab(k):
    """(baris, kolom) sel yang pusatnya di dalam poligon; kosong -> sel terdekat ke pusat."""
    xs = [c[0] for p in k["polys"] for c in p[0]]; ys = [c[1] for p in k["polys"] for c in p[0]]
    c0, c1 = int((min(xs) - LON0) / RES), int((max(xs) - LON0) / RES) + 1
    r0, r1 = int((LAT0 - max(ys)) / RES), int((LAT0 - min(ys)) / RES) + 1
    out = []
    for r in range(r0, r1 + 1):
        y = LAT0 - (r + .5) * RES
        for c in range(c0, c1 + 1):
            if titik_kab(k, LON0 + (c + .5) * RES, y):
                out.append((r, c))
    if not out:
        px, py = pusat(k)
        out = [(int((LAT0 - py) / RES), int((px - LON0) / RES))]
    return out


def tarik():
    os.makedirs(RISET, exist_ok=True)
    kabs = baca_kab()
    files = sorted(glob.glob(f"{MENTAH}/chirps/chirps-v2.0.2026.10.*.tif.gz"))
    hari = [int(f.split(".")[-3]) for f in files]
    print("hari CHIRPS:", hari)
    sels = [sel_kab(k) for k in kabs]
    rr = [r for s in sels for r, _ in s]
    j0, j1 = min(rr), max(rr) + 1
    # hujan[kab][hari]
    hujan = {}
    for f, h in zip(files, hari):
        a = baca_chirps(f, j0, j1)
        for i, s in enumerate(sels):
            v = np.array([a[r - j0, c] for r, c in s], dtype="f8")
            v = v[v > -9000]
            hujan.setdefault(i, {})[h] = float(v.mean()) if len(v) else None
    # IFS Open-Meteo
    json.dump({"hari": hari, "chirps": {str(i): v for i, v in hujan.items()}}, open(f"{MENTAH}/chirps_kab.json", "w"))
    ifs = ambil_ifs(kabs)
    json.dump({"hari": hari, "kab": [{"prov": k["prov"], "nama": k["nama"]} for k in kabs], "chirps": {str(i): v for i, v in hujan.items()},
               "ifs": {str(i): v for i, v in ifs.items()}}, open(f"{MENTAH}/panel_mentah.json", "w"))
    print("kab:", len(kabs), "sel total:", sum(len(s) for s in sels))


def ambil_ifs(kabs):
    out = {}
    for a in range(0, len(kabs), 15):
        ch = kabs[a:a + 15]
        lat = ",".join(f"{pusat(k)[1]:.3f}" for k in ch); lon = ",".join(f"{pusat(k)[0]:.3f}" for k in ch)
        u = ("https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s&start_date=2026-10-01&end_date=2026-10-28"
             "&daily=precipitation_sum&models=ecmwf_ifs025&timezone=UTC" % (lat, lon))
        for coba in range(5):
            try:
                d = json.load(urllib.request.urlopen(u, timeout=60)); break
            except Exception as e:  # kuota/jaringan: ulang dengan jeda
                print("IFS ulang", a, coba, e); time.sleep(10 * (coba + 1))
        else:
            raise SystemExit("IFS gagal")
        d = d if isinstance(d, list) else [d]
        for k, x in enumerate(d):
            out[a + k] = {int(t[-2:]): v for t, v in zip(x["daily"]["time"], x["daily"]["precipitation_sum"])}
    return out


# ------------------------------------------------------------------ regresi
def resid(X, ki, ti, it=200):
    """buang efek tetap kab dan hari dari kolom X (n,k) lewat proyeksi bergantian (panel tak seimbang)."""
    X = X.copy()
    nk, nt = ki.max() + 1, ti.max() + 1
    ck, ct = np.bincount(ki, minlength=nk), np.bincount(ti, minlength=nt)
    for _ in range(it):
        old = X.copy()
        for g, c, m in ((ki, ck, nk), (ti, ct, nt)):
            for j in range(X.shape[1]):
                X[:, j] -= (np.bincount(g, X[:, j], minlength=m) / c)[g]
        if np.abs(X - old).max() < 1e-10:
            break
    return X


def ols(y, Xc, ki, ti, klaster=None):
    """y ~ Xc + FE kab + FE hari. -> b, se klaster hari (G/(G-1)), df, residu penuh dipakai ulang."""
    Z = resid(np.column_stack([y, Xc]), ki, ti)
    yt, Xt = Z[:, 0], Z[:, 1:]
    A = Xt.T @ Xt
    b = np.linalg.solve(A, Xt.T @ yt)
    e = yt - Xt @ b
    cl = ti if klaster is None else klaster
    G = len(np.unique(cl))
    meat = np.zeros_like(A)
    for g in np.unique(cl):
        s = Xt[cl == g].T @ e[cl == g]
        meat += np.outer(s, s)
    Ai = np.linalg.inv(A)
    V = G / (G - 1) * Ai @ meat @ Ai
    return b, np.sqrt(np.diag(V)), G - 1


def t_kuantil(df, p):
    """kuantil t dua sisi tingkat p lewat bagi-dua pada cdf t (stdlib, df kecil aman)."""
    def cdf(x):  # integrasi Simpson densitas t
        n = 2000
        f = lambda u: (1 + u * u / df) ** (-(df + 1) / 2)
        h = x / n
        s = f(0) + f(x) + sum((4 if i % 2 else 2) * f(i * h) for i in range(1, n))
        c = math.gamma((df + 1) / 2) / (math.sqrt(df * math.pi) * math.gamma(df / 2))
        return .5 + c * s * h / 3
    lo, hi = 0.0, 50.0
    for _ in range(60):
        m = (lo + hi) / 2
        lo, hi = (m, hi) if cdf(m) < 1 - (1 - p) / 2 else (lo, m)
    return (lo + hi) / 2


# ------------------------------------------------------------------ panel & analisis
def bangun():
    m = json.load(open(f"{MENTAH}/panel_mentah.json"))
    kabs = baca_kab()
    assert [k["nama"] for k in kabs] == [k["nama"] for k in m["kab"]], "urutan kab berubah, tarik ulang"
    D, kontam, tak = baca_perlakuan(kabs)
    nb = tetangga(kabs)
    hari = [h for h in m["hari"] if TAHUN_OKT % h != TUTUP]
    jam = {}
    N = len(kabs)
    treated_any = {h: {i for (i, hh) in D["any"] if hh == h} for h in hari}
    buf = {h: set().union(*[nb[i] for i in treated_any[h]]) if treated_any[h] else set() for h in hari}
    sel = []  # (i, h, y, f, D...)
    for i, k in enumerate(kabs):
        for h in hari:
            y = m["chirps"][str(i)].get(str(h)); f = m["ifs"][str(i)].get(str(h)) if str(h) in m["ifs"][str(i)] else m["ifs"][str(i)].get(h)
            if y is None or f is None:
                continue
            d = (i, h) in D["any"]
            if not d and ((k["prov"], h) in kontam or i in buf[h]):
                continue
            sel.append(dict(i=i, h=h, y=y, f=f, prov=k["prov"], d=int(d), nacl=int((i, h) in D["nacl"]), dry=int((i, h) in D["dry"]),
                            campur=int((i, h) in D["campur"])))
    return kabs, sel, D, kontam, tak, hari, nb


def fit(rows, y, cols, kov=True, nperm=5000, rng=None, perm_d=None):
    """cols: daftar nama kolom D (dari rows); perm hanya memutar label hari dari matriks D penuh (perm_d)."""
    ki = np.unique([r["i"] for r in rows], return_inverse=True)[1]
    ti = np.unique([r["h"] for r in rows], return_inverse=True)[1]
    Xd = np.array([[r[c] for c in cols] for r in rows], dtype="f8")
    Xc = np.column_stack([Xd, np.array([r["f"] for r in rows])]) if kov else Xd
    y = np.asarray(y, dtype="f8")
    b, se, df = ols(y, Xc, ki, ti)
    b, se = b[:len(cols)], se[:len(cols)]
    # permutasi: label hari D diacak antar hari (vektor D satu hari dipindah utuh ke hari lain, sel tetap)
    hid = [r["h"] for r in rows]
    dias = sorted(set(hid))
    pos = {(r["i"], r["h"]): n for n, r in enumerate(rows)}
    full = {(r["i"], r["h"]): [r[c] for c in cols] for r in rows}
    kab_ids = sorted(set(r["i"] for r in rows))
    perm = np.zeros((nperm, len(cols)))
    Zk = None
    for p in range(nperm):
        pi = dict(zip(dias, rng.permutation(dias)))
        Xp = np.array([full_get(perm_d, r["i"], pi[r["h"]], cols, full) for r in rows])
        Xpc = np.column_stack([Xp, Xc[:, len(cols):]]) if kov else Xp
        perm[p] = ols_b(y, Xpc, ki, ti)[:len(cols)]
    return b, se, df, perm, Xd


def full_get(perm_d, i, h2, cols, full):
    return perm_d.get((i, h2), [0.0] * len(cols))


def ols_b(y, Xc, ki, ti):
    Z = resid(np.column_stack([y, Xc]), ki, ti, it=60)
    Xt = Z[:, 1:]
    return np.linalg.lstsq(Xt, Z[:, 0], rcond=None)[0]


def lapor(nama, y, rows, cols, kov, kamus, rng, nperm, mode="level"):
    """-> dict hasil per kolom D; persen terhadap rata-rata kontrafaktual kelompok D=1."""
    cols = [c for c in cols if sum(r[c] > 0 for r in rows) >= 3]   # kolom dengan < 3 sel perlakuan tak dihitung
    perm_d = {(r["i"], r["h"]): [float(r[c]) for c in cols] for r in kamus}
    b, se, df, perm, Xd = fit(rows, y, cols, kov, nperm, rng, perm_d)
    out = {}
    y = np.asarray(y, dtype="f8")
    for j, c in enumerate(cols):
        tr = Xd[:, j] > 0
        n1, n0 = int(tr.sum()), int((~tr).sum())
        if n1 < 3:
            continue
        m1 = float(y[tr].mean())
        den = m1 - b[j]
        if mode == "log":
            pct = lambda x: 100 * (math.exp(x) - 1)
        else:
            if den <= 0.05 * abs(m1) or den <= 0:
                den = m1
            pct = lambda x: 100 * x / den
        z = {90: t_kuantil(df, .90), 95: t_kuantil(df, .95)}
        p_perm = float(((np.abs(perm[:, j]) >= abs(b[j]) - 1e-12).sum() + 1) / (len(perm) + 1))   # +1: p tak pernah 0
        sd = float(perm[:, j].std())
        mde = 2.8 * sd
        r = dict(b=float(b[j]), se=float(se[j]), df=df, persen=pct(b[j]), n_perlakuan=n1, n_kontrol=n0, rata_perlakuan=m1,
                 ci90=[pct(b[j] - z[90] * se[j]), pct(b[j] + z[90] * se[j])], ci95=[pct(b[j] - z[95] * se[j]), pct(b[j] + z[95] * se[j])],
                 p_permutasi=p_perm, sd_permutasi=sd, mde_persen=pct(mde) if mode != "log" else 100 * (math.exp(mde) - 1))
        r["terdeteksi95"] = not (r["ci95"][0] <= 0 <= r["ci95"][1])
        out[c] = r
    return out


def analisis(nperm=int(os.environ.get("NPERM", 5000))):
    kabs, sel, D, kontam, tak, hari, nb = bangun()
    rng = np.random.default_rng(SEED)
    y = [r["y"] for r in sel]
    out = {"hari": hari, "n_sel": len(sel), "n_kab": len({r["i"] for r in sel}), "tak_cocok": tak, "kontaminasi_provhari": len(kontam),
           "dt": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"), "nperm": nperm}
    print("sel", len(sel), "D=1", sum(r["d"] for r in sel), "tak cocok", len(tak))
    out["primer"] = lapor("primer", y, sel, ["d"], True, sel, rng, nperm)
    out["tanpa_kov"] = lapor("tanpa_kov", y, sel, ["d"], False, sel, rng, nperm)
    out["anomali"] = lapor("anomali", [r["y"] - r["f"] for r in sel], sel, ["d"], False, sel, rng, nperm)
    out["indikator"] = lapor("indikator", [float(r["y"] >= 1) for r in sel], sel, ["d"], True, sel, rng, nperm)
    out["log"] = lapor("log", [math.log1p(r["y"]) for r in sel], sel, ["d"], True, sel, rng, nperm, "log")
    rb = [dict(r, nacl_x=r["nacl"], dry_x=r["dry"]) for r in sel]
    out["bahan"] = lapor("bahan", y, rb, ["nacl", "dry"], True, rb, rng, nperm)
    # per provinsi (interaksi) + sisa
    P = ["Kalimantan Tengah", "Sumatera Selatan", "Kalimantan Selatan", "Kalimantan Barat"]
    rp = []
    for r in sel:
        q = dict(r)
        for p in P:
            q["d_" + p] = r["d"] if r["prov"] == p else 0
        q["d_lain"] = r["d"] if r["prov"] not in P else 0
        rp.append(q)
    cols = ["d_" + p for p in P] + ["d_lain"]
    out["provinsi"] = lapor("provinsi", y, rp, cols, True, rp, rng, nperm)
    pv = sorted(((c, v["p_permutasi"]) for c, v in out["provinsi"].items() if c != "d_lain"), key=lambda x: x[1])
    m = len(pv)
    prev = 0.0
    for r_, (c, p) in enumerate(pv):  # Holm
        prev = max(prev, min(1, (m - r_) * p)); out["provinsi"][c]["p_holm"] = prev
    # plasebo 1: pola perlakuan digeser 15 hari ke baseline
    bas = [r for r in sel if r["h"] < OPS0]
    pl = {}
    for r in D["any"]:
        pass
    shift = {(i, h - 15) for (i, h) in D["any"] if h - 15 >= 1 and TAHUN_OKT % (h) != TUTUP}
    for r in bas:
        r["pl"] = int((r["i"], r["h"]) in shift)
    out["plasebo_geser15"] = lapor("plasebo", [r["y"] for r in bas], bas, ["pl"], True, bas, rng, nperm)
    # plasebo 2: kab acak di Jambi+Riau pada hari operasi, n per hari = rata-rata sasaran per hari
    pool = [i for i, k in enumerate(kabs) if k["prov"] in ("Jambi", "Riau")]
    ops = [h for h in hari if h >= OPS0]
    nt = {h: len(treated_any_h(D, h)) for h in ops}
    base = [r for r in sel if r["i"] in pool]
    rej, bs = 0, []
    for _ in range(300):
        pick = {(i, h) for h in ops for i in rng.choice(pool, size=min(3, len(pool)), replace=False)}
        sub = [dict(r, pl=int((r["i"], r["h"]) in pick)) for r in base]
        ki = np.unique([r["i"] for r in sub], return_inverse=True)[1]; ti = np.unique([r["h"] for r in sub], return_inverse=True)[1]
        X = np.column_stack([[r["pl"] for r in sub], [r["f"] for r in sub]]).astype("f8")
        b, se, df = ols(np.array([r["y"] for r in sub]), X, ki, ti)
        bs.append(float(b[0])); rej += abs(b[0] / se[0]) > t_kuantil(df, .95)
    out["plasebo_ruang"] = dict(n=300, laju_tolak_5persen=rej / 300, sd_b=float(np.std(bs)), kab_pool=len(pool))
    out["eksplor"] = eksplor(kabs, D, kontam, nb, hari, rng)
    os.makedirs(RISET, exist_ok=True)
    json.dump(out, open(f"{RISET}/hasil_efek.json", "w"), indent=1, ensure_ascii=False)
    for k in ("primer", "tanpa_kov", "anomali", "indikator", "log", "bahan", "provinsi", "plasebo_geser15"):
        for c, v in out[k].items():
            print(f"{k:16s}{c:22s} {v['persen']:8.1f}%  90[{v['ci90'][0]:.0f},{v['ci90'][1]:.0f}] 95[{v['ci95'][0]:.0f},{v['ci95'][1]:.0f}] "
                  f"n1={v['n_perlakuan']} n0={v['n_kontrol']} m1={v['rata_perlakuan']:.1f} p_perm={v['p_permutasi']:.3f} MDE={v['mde_persen']:.0f}%")
    print("plasebo ruang", out["plasebo_ruang"])
    print(json.dumps(out["eksplor"], ensure_ascii=False)[:1500])


def treated_any_h(D, h):
    return {i for (i, hh) in D["any"] if hh == h}


def eksplor(kabs, D, kontam, nb, hari, rng):
    """PM2.5 BMKG (ln) dan jarak pandang METAR di titik dalam poligon kab. Pakai arsip repo apa adanya."""
    arsip = json.load(open(os.path.join(AKAR, "public/udara/data/omc_arsip.json")))
    res = {}
    treated_any = {h: {i for (i, hh) in D["any"] if hh == h} for h in hari}
    buf = {h: set().union(*[nb[i] for i in treated_any[h]]) if treated_any[h] else set() for h in hari}
    def kab_dari(lon, lat):
        for i, k in enumerate(kabs):
            if titik_kab(k, lon, lat):
                return i
    def harian(seri, jam_ok):
        t0 = dt.datetime.strptime(seri["t0"], "%Y-%m-%dT%H")
        d = {}
        for n, v in enumerate(seri[[k for k in seri if isinstance(seri[k], list)][0]]):
            t = t0 + dt.timedelta(hours=n)
            if v is not None and jam_ok(t.hour) and t.month == 10:
                d.setdefault(t.day, []).append(v)
        return {h: sum(v) / len(v) for h, v in d.items() if len(v) >= 4}
    for nama, kanal, jam_ok in (("pm25_ln", "pm25", lambda h: True), ("vis_siang", "metar", lambda h: 0 <= h <= 9)):
        rows = []
        for sid, s in arsip[kanal].items():
            lon, lat = (s.get("lon"), s.get("lat")) if "lat" in s else BANDARA.get(sid, (None, None))
            if lat is None:
                continue
            i = kab_dari(lon, lat)
            if i is None:
                continue
            for h, v in harian({"t0": s["t0"], "x": s.get("v") or s.get("vis")}, jam_ok).items():
                if h not in hari: continue
                d = int((i, h) in D["any"])
                if not d and ((kabs[i]["prov"], h) in kontam or i in buf[h]): continue
                rows.append(dict(i=sid, h=h, y=math.log(max(v, 1)) if nama == "pm25_ln" else v, d=d))
        if len({r["i"] for r in rows}) < 3 or sum(r["d"] for r in rows) < 3:
            res[nama] = {"catatan": "terlalu sedikit stasiun atau sel perlakuan", "n_stasiun": len({r["i"] for r in rows}), "n_perlakuan": sum(r["d"] for r in rows)}
            continue
        ki = np.unique([r["i"] for r in rows], return_inverse=True)[1]; ti = np.unique([r["h"] for r in rows], return_inverse=True)[1]
        y = np.array([r["y"] for r in rows]); X = np.array([[r["d"]] for r in rows], dtype="f8")
        b, se, df = ols(y, X, ki, ti)
        dias = sorted({r["h"] for r in rows}); perm = []
        D0 = {(r["i"], r["h"]): r["d"] for r in rows}
        for _ in range(2000):
            pi = dict(zip(dias, rng.permutation(dias)))
            Xp = np.array([[D0.get((r["i"], pi[r["h"]]), 0)] for r in rows], dtype="f8")
            perm.append(ols_b(y, Xp, ki, ti)[0])
        sd = float(np.std(perm)); m1 = float(y[X[:, 0] > 0].mean())
        z = t_kuantil(df, .95)
        conv = (lambda x: 100 * (math.exp(x) - 1)) if nama == "pm25_ln" else (lambda x: x)   # vis dalam meter, bukan persen
        res[nama] = dict(b=float(b[0]), persen=conv(b[0]), ci95=[conv(b[0] - z * se[0]), conv(b[0] + z * se[0])], n_stasiun=len({r["i"] for r in rows}),
                         n_perlakuan=int(X.sum()), n_obs=len(rows), p_permutasi=float(((np.abs(perm) >= abs(b[0])).sum() + 1) / (len(perm) + 1)), mde_persen=conv(2.8 * sd))
    return res


def cek_dummy():
    """koefisien primer: proyeksi bergantian (resid) vs regresi dummy penuh (PRAREG 5) + IFS dry ice vs kontrol."""
    kabs, sel, D, kontam, tak, hari, nb = bangun()
    ki = np.unique([r["i"] for r in sel], return_inverse=True)[1]; ti = np.unique([r["h"] for r in sel], return_inverse=True)[1]
    y = np.array([r["y"] for r in sel]); d = np.array([r["d"] for r in sel], "f8"); f = np.array([r["f"] for r in sel])
    b = ols(y, np.column_stack([d, f]), ki, ti)[0]
    X = np.column_stack([d, f, np.eye(ki.max() + 1)[ki], np.eye(ti.max() + 1)[ti][:, 1:]])
    bd = np.linalg.lstsq(X, y, rcond=None)[0]
    print("primer resid:", b[0], "dummy penuh:", bd[0], "selisih:", abs(b[0] - bd[0]), "| IFS:", b[1], bd[1])
    dr = np.array([r["dry"] for r in sel]) > 0; nc = np.array([r["nacl"] for r in sel]) > 0
    ctrl = d == 0
    for nama, m in (("dry ice", dr), ("NaCl", nc), ("kontrol", ctrl)):
        print(f"{nama}: n={m.sum()} IFS rata-rata {f[m].mean():.2f} mm, CHIRPS rata-rata {y[m].mean():.2f} mm")


# ------------------------------------------------------------------ jendela jam (deskriptif, PRAREG 8)
JENDELA = [("WAOO", "Banjarmasin/Banjarbaru", "2026-10-27", 3.2, 6.6), ("WIPP", "Palembang", "2026-10-20", 4.5, 6.1)]  # jam UTC mulai-selesai sortie


def hujan_jam(st, hari, a, b, plus=3):
    """-> (rapat hujan jam dalam [a, b+plus) pada hari itu, daftar pembanding hari lain 1-15 Okt) dari berkas IEM mentah."""
    jam = {}
    for r in csv.DictReader(open(f"{MENTAH}/iem_{st}.csv")):
        try:
            v = dt.datetime.strptime(r["valid"], "%Y-%m-%d %H:%M")
        except ValueError:
            continue
        hujan = bool(re.search(r"(?<![A-Z])(RA|SH|TS|DZ)", r["wxcodes"])) or (r["p01i"] not in ("M", "") and float(r["p01i"] or 0) > 0)
        k = (v.date().isoformat(), v.hour)
        jam[k] = jam.get(k, False) or hujan
    def isi(d):
        hs = range(int(a), int(math.ceil(b + plus)))
        n = [(d, h) for h in hs if (d, h) in jam]
        return (sum(jam[k] for k in n), len(n)) if n else None
    tgt = isi(hari)
    lain = [isi(TAHUN_OKT % d) for d in range(1, 16)]
    lain = [x for x in lain if x]
    return tgt, lain


def jendela():
    for st, nama, hari, a, b in JENDELA:
        tgt, lain = hujan_jam(st, hari, a, b)
        fr = [x[0] / x[1] for x in lain]
        print(f"{st} {nama} {hari} jam UTC {a}-{b}+3: jam hujan {tgt}; baseline 1-15 Okt: {sum(f > 0 for f in fr)}/{len(fr)} hari ada hujan, rata-rata {sum(fr) / len(fr):.2f}")


# ------------------------------------------------------------------ self-check
def uji():
    assert norm("Kota Palangkaraya") == norm("Palangka Raya") == "palangkaraya"
    rng = np.random.default_rng(1)
    nk, nt = 12, 10
    ki = np.repeat(np.arange(nk), nt); ti = np.tile(np.arange(nt), nk)
    keep = rng.random(nk * nt) > .15
    ki, ti = ki[keep], ti[keep]
    d = (rng.random(len(ki)) < .3).astype(float)
    y = rng.normal(size=nk)[ki] + rng.normal(size=nt)[ti] + 2.0 * d + rng.normal(scale=.1, size=len(ki))
    b, se, df = ols(y, d[:, None], ki, ti)
    # padanan: regresi dummy penuh
    X = np.column_stack([d, np.eye(nk)[ki][:, 1:], np.eye(nt)[ti], ])
    X = np.column_stack([X, np.ones(len(ki))])
    bb = np.linalg.lstsq(X, y, rcond=None)[0][0]
    assert abs(b[0] - bb) < 1e-6 and abs(b[0] - 2) < .3, (b, bb)
    assert abs(t_kuantil(9, .95) - 2.262) < .01 and abs(t_kuantil(23, .90) - 1.714) < .01
    # tiff: indeks baris/kolom -> lintang/bujur
    assert abs(LAT0 - (0 + .5) * RES - 49.975) < 1e-9 and abs(LON0 + (3600 + .5) * RES - 0.025) < 1e-9
    sq = {"polys": [[[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]]}
    assert titik_kab(sq, .5, .5) and not titik_kab(sq, 1.5, .5)
    print("uji efek ok")


if __name__ == "__main__":
    c = sys.argv[1] if len(sys.argv) > 1 else "uji"
    {"uji": uji, "tarik": tarik, "analisis": analisis, "jendela": jendela, "cekdummy": cek_dummy}[c]()
