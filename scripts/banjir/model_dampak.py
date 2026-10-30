#!/usr/bin/env python3
"""Model banjir bertingkat: hujan -> kejadian -> besaran (KK/rumah). Bentuk dan kriteria: PRAREG-DAMPAK.md (DIBEKUKAN).

  python3 scripts/banjir/model_dampak.py latih      # latih <=2021, setel m & ablasi di 2022-2023, bekukan sidik
  python3 scripts/banjir/model_dampak.py buka       # buka uji 2024-01-01..2026-09-30 SEKALI (penanda ditulis dulu)
  python3 scripts/banjir/model_dampak.py skenario   # hujan X mm -> peluang, KK/rumah p10/p50/p90, tinggi/lama empiris
  python3 scripts/banjir/model_dampak.py uji        # swauji luring

Masukan (tidak dilacak git): data/raw/banjir/label20/label.json, data/raw/banjir/fitur/{statis.json,harian/*.json}.
Keluaran: scripts/banjir/model_dampak.params.json + .sidik + .buka (dilacak), RISET-DAMPAK.md,
data/raw/banjir/dampak/{konstanta,skenario}.json. Butuh numpy. Tidak mengubah ambang status.py.
"""
import datetime as dt, hashlib, json, math, os, sys, tempfile
import numpy as np

AYAH = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AYAH)
from fitur_banjir import cn_amc, scs_q  # noqa: E402  (fungsi murni SCS-CN yang sama dengan pembuat fitur)

AKAR = os.path.dirname(os.path.dirname(AYAH))
RAW = os.path.join(AKAR, "data/raw/banjir")
FIT = os.path.join(RAW, "fitur")
OUT = os.path.join(RAW, "dampak")
PARAMS = os.path.join(AYAH, "model_dampak.params.json")
SIDIK = os.path.join(AYAH, "model_dampak.sidik")
PENANDA = os.path.join(AYAH, "model_dampak.buka")
PRAREG = os.path.join(AYAH, "PRAREG-DAMPAK.md")
RISET = os.path.join(AYAH, "RISET-DAMPAK.md")
D0 = dt.date(2005, 1, 1)
JIWA_PER_KK = 3.5


def hari(s):
    return (dt.date.fromisoformat(s) - D0).days


# ---- pembagian waktu (PRAREG §3). Peluang dilatih mulai 2016 karena berita (Groundsource) baru memadai sejak itu.
OCC_MULAI = hari("2016-01-01")
TRAIN_AKHIR = hari("2021-12-31")
VAL = (hari("2022-01-01"), hari("2023-12-31"))
TEST = (hari("2024-01-01"), hari("2026-09-30"))
TEST_OCC = (hari("2026-01-01"), hari("2026-09-30"))   # vonis peluang hanya 2026 (2024-2025 sudah dibuka di RISET-MODEL-KAB)
M_OCC = [3, 10, 30, 100, 300]
M_MAG = [1, 3, 10, 30, 100]
OCC_VAR = {"penuh": [0, 1, 2, 3], "tanpa_D": [0, 2, 3], "tanpa_musim": [0, 1]}      # kolom: logE, D, sin, cos
MAG_VAR = {"penuh": [0, 1, 2], "tanpa_D": [0, 2], "tanpa_paparan": [0, 1]}          # kolom: logE, D, log paparan
NAMA_OCC = ["log1p(E)", "D (debit pct)", "musim sin", "musim cos"]
NAMA_MAG = ["log1p(E)", "D (debit pct)", "log paparan"]
LV = np.arange(0.05, 0.951, 0.05)    # grid kuantil galat; indeks 1 = p10, 17 = p90
B_UJI, SEED = 1000, 11
KELAS_HUJAN = [75.0, 150.0]          # batas kelas a3 untuk sebaran tinggi/lama empiris
AMC = {"kering": 1, "normal": 2, "basah": 3}
HUJAN_SKEN = [50, 100, 120, 150, 200, 300]


def sig(z):
    return 1.0 / (1.0 + np.exp(-z))


# ======================================================================== data
def muat():
    st = json.load(open(os.path.join(FIT, "statis.json")))["kab"]
    kabs = sorted(k for k, v in st.items() if v.get("cn_ii") and v.get("kapasitas_mm") and v.get("kk_hand2_proksi")
                  and os.path.exists(os.path.join(FIT, "harian", k + ".json")))
    K, kidx = len(kabs), {k: i for i, k in enumerate(kabs)}
    kolom = {}
    N = 0
    for k in kabs:
        h = json.load(open(os.path.join(FIT, "harian", k + ".json")))
        kolom[k] = h["kolom"]
        N = max(N, h["n"])
    nan = lambda v: np.array([np.nan if x is None else x for x in v] + [np.nan] * (N - len(v)), dtype="float64")
    E = np.stack([nan(kolom[k]["lebih_kap_mm"]) for k in kabs])
    A3 = np.stack([nan(kolom[k]["a3"]) for k in kabs])
    Q = np.stack([nan(kolom[k].get("q_pct") or []) for k in kabs])
    Dq = np.where(np.isnan(Q), 0.0, (Q - 50.0) / 50.0)
    punya_q = ~np.isnan(Q).all(axis=1)
    tgl = [D0 + dt.timedelta(i) for i in range(N)]
    dd = {"kabs": kabs, "K": K, "N": N, "st": st, "E": E, "A3": A3, "D": Dq, "punya_q": punya_q,
          "bulan": np.array([t.month for t in tgl]), "tahun": np.array([t.year for t in tgl]),
          "doy": np.array([t.timetuple().tm_yday for t in tgl]),
          "prov": np.array([int(k[:2]) for k in kabs]),
          "lpap": np.array([math.log(st[k]["kk_hand2_proksi"] + 1) for k in kabs])}
    up = sorted(set(dd["prov"]))
    dd["pk"] = np.array([up.index(p) for p in dd["prov"]])
    dd["P"] = len(up)
    # ---- kejadian berlabel
    lab = json.load(open(os.path.join(RAW, "label20/label.json")))["kejadian"]
    valid = ~np.isnan(E) & ~np.isnan(A3)
    y = np.zeros((K, N), dtype=bool)
    excl = np.zeros((K, N), dtype=bool)
    ev = {a: [] for a in ("ki", "idx", "lE", "D", "lpap", "kk", "rumah", "ked", "dur", "a3")}
    for e in lab:
        k = kidx.get(e["kab_kode"])
        if k is None:
            continue
        i = hari(e["mulai"])
        if not (0 <= i < N) or not valid[k, i]:
            continue
        y[k, i] = True
        j = min(hari(e["selesai"]), i + 30)
        if j > i:
            excl[k, i + 1:j + 1] = True
        dib = e.get("dibi") or {}
        kk = e.get("kk")
        if kk is None and dib.get("terdampak"):
            kk = dib["terdampak"] / JIWA_PER_KK
        w = slice(max(0, i - 1), i + 2)
        ked = e.get("kedalaman_cm")
        ev["ki"].append(k); ev["idx"].append(i)
        ev["lE"].append(math.log1p(np.nanmax(E[k, w]))); ev["D"].append(float(Dq[k, w].max()))
        ev["lpap"].append(dd["lpap"][k]); ev["a3"].append(float(A3[k, i]))
        ev["kk"].append(kk if kk and kk > 0 else np.nan)
        ev["rumah"].append(e["rumah"] if e.get("rumah") and e["rumah"] > 0 else np.nan)
        ev["ked"].append(max(ked) if isinstance(ked, list) and ked else (ked if ked else np.nan))
        ev["dur"].append(e["durasi_hari"] if e.get("durasi_hari") else np.nan)
    dd["ev"] = {a: np.array(v, dtype="float64") for a, v in ev.items()}
    for a in ("ki", "idx"):
        dd["ev"][a] = dd["ev"][a].astype(int)
    dd["y"], dd["excl"], dd["valid"] = y, excl, valid
    return dd


def baris(dd, i0, i1, ok=None):
    """baris kab-hari valid pada jendela indeks hari [i0,i1]: ki, ii, X (logE, D, sin, cos), y, a3"""
    m = dd["valid"] & ~dd["excl"]
    m[:, :i0] = False
    m[:, i1 + 1:] = False
    if ok is not None:
        m &= np.asarray(ok)[:, None]
    ki, ii = np.nonzero(m)
    ang = 2 * math.pi * dd["doy"][ii] / 365.25
    X = np.column_stack([np.log1p(dd["E"][ki, ii]), dd["D"][ki, ii], np.sin(ang), np.cos(ang)])
    return ki, ii, X, dd["y"][ki, ii].astype(float), dd["A3"][ki, ii]


# ======================================================================== peluang (logit, intersep per kab ditarik ke provinsi lalu nasional)
def bobot(n, m):
    return n / (n + m)


def selesai_intersep(grp, eta, target, G):
    """cari a per grup sehingga jumlah sigmoid(a+eta) = target (bisection)"""
    lo, hi = np.full(G, -20.0), np.full(G, 6.0)
    for _ in range(30):
        mid = (lo + hi) / 2
        f = np.bincount(grp, sig(mid[grp] + eta), minlength=G) - target
        hi = np.where(f > 0, mid, hi)
        lo = np.where(f > 0, lo, mid)
    return (lo + hi) / 2


def irls(X, y, off, b, lam=1e-3):
    for _ in range(5):
        p = sig(off + X @ b)
        W = p * (1 - p) + 1e-9
        g = X.T @ (y - p) - lam * b
        H = (X * W[:, None]).T @ X + lam * np.eye(len(b))
        b = b + np.linalg.solve(H, g)
    return b


def latih_occ(ki, X, y, cols, m, pk, K, P):
    pi = pk[ki]
    nk, npv = np.bincount(ki, y, K), np.bincount(pi, y, P)
    Xs = X[:, cols]
    a, b = np.full(K, math.log(y.mean() / (1 - y.mean()))), np.zeros(len(cols))
    for _ in range(5):
        b = irls(Xs, y, a[ki], b)
        eta = Xs @ b
        a_nat = selesai_intersep(np.zeros(len(ki), int), eta, y.sum() + 0.5, 1)
        ap_hat = selesai_intersep(pi, eta, npv + 0.5, P)
        ap = bobot(npv, m) * ap_hat + (1 - bobot(npv, m)) * a_nat[0]
        ak_hat = selesai_intersep(ki, eta, nk + 0.5, K)
        a = bobot(nk, m) * ak_hat + (1 - bobot(nk, m)) * ap[pk]
    return {"kolom": cols, "b": b, "const": a, "xm": np.zeros(len(cols)), "n_k": nk}


def pred_occ(M, X, ki):
    return sig(M["const"][ki] + (X[:, M["kolom"]] - M["xm"]) @ M["b"])


def logloss(p, y):
    p = np.clip(p, 1e-9, 1 - 1e-9)
    return float(-(y * np.log(p) + (1 - y) * np.log(1 - p)).mean())


# ======================================================================== besaran (hurdle: log1p(KK) bila terjadi)
def latih_mag(ki, X, y, cols, m, pk, K, P):
    pi = pk[ki]
    nk, npv = np.bincount(ki, minlength=K), np.bincount(pi, minlength=P)
    Xs = X[:, cols]
    xm = Xs.mean(0)
    Xc = Xs - xm
    c, b = np.full(K, y.mean()), np.zeros(len(cols))
    for _ in range(15):
        b = np.linalg.solve(Xc.T @ Xc + 1e-6 * np.eye(len(cols)), Xc.T @ (y - c[ki]))
        r = y - Xc @ b
        cp_hat = np.bincount(pi, r, P) / np.maximum(npv, 1)
        cp = bobot(npv, m) * cp_hat + (1 - bobot(npv, m)) * r.mean()
        ck_hat = np.bincount(ki, r, K) / np.maximum(nk, 1)
        c = bobot(nk, m) * ck_hat + (1 - bobot(nk, m)) * cp[pk]
    return {"kolom": cols, "b": b, "const": c, "xm": xm, "n_k": nk}


def pred_mag(M, X, ki):
    return M["const"][ki] + (X[:, M["kolom"]] - M["xm"]) @ M["b"]


def b0_latih(ki, y, m, pk, K, P):
    """B0: median historis kab, ditarik ke median provinsi lalu nasional"""
    pi = pk[ki]
    nat = np.median(y)
    prov = np.array([np.median(y[pi == p]) if (pi == p).any() else nat for p in range(P)])
    npv = np.bincount(pi, minlength=P)
    prov = bobot(npv, m) * prov + (1 - bobot(npv, m)) * nat
    nk = np.bincount(ki, minlength=K)
    med = np.array([np.median(y[ki == k]) if nk[k] else 0.0 for k in range(K)])
    return bobot(nk, m) * med + (1 - bobot(nk, m)) * prov[pk]


def grid_galat(ki, r, pk, K):
    """kuantil galat per kab; kab dengan n<20 memakai provinsi (n>=20) lalu nasional"""
    nat = np.quantile(r, LV)
    pi = pk[ki]
    out = np.zeros((K, len(LV)))
    for k in range(K):
        a = r[ki == k]
        if len(a) >= 20:
            out[k] = np.quantile(a, LV)
            continue
        p = r[pi == pk[k]]
        out[k] = np.quantile(p, LV) if len(p) >= 20 else nat
    return out


def simulasi(pred, grid, s, n=2000, seed=SEED):
    """n tarikan log1p(y) = pred + s*galat; galat diambil dari kuantil empiris kab lewat invers-CDF"""
    u = np.random.default_rng(seed).uniform(LV[0], LV[-1], n)
    return pred + s * np.interp(u, LV, grid)


def hurdle(p, ey_bila_terjadi):
    """nilai harapan tak bersyarat = peluang kejadian x nilai harapan bila terjadi"""
    return p * ey_bila_terjadi


# ======================================================================== penilaian (dipakai latih-validasi DAN buka-uji)
def boot(sums, B, seed, f):
    """bootstrap blok: sums (blok x kolom); f(S)-> statistik. Kembalikan (titik, lo, hi)"""
    rng = np.random.default_rng(seed)
    cnt = rng.multinomial(len(sums), np.ones(len(sums)) / len(sums), size=B)
    s = f((cnt @ sums).T)
    return float(f(sums.sum(0)[:, None])[0]), float(np.percentile(s, 2.5)), float(np.percentile(s, 97.5))


def ev_sel(dd, i0, i1, tgt, ok=None):
    e = dd["ev"]
    m = (e["idx"] >= i0) & (e["idx"] <= i1) & ~np.isnan(e[tgt])
    if ok is not None:
        m &= np.asarray(ok)[e["ki"]]
    return m


def ev_X(dd, m):
    e = dd["ev"]
    return np.column_stack([e["lE"][m], e["D"][m], e["lpap"][m]]), e["ki"][m]


def nilai_mag(dd, P, tgt, i0, i1, B=B_UJI, M=None, ok=None):
    """skill MAE B1 vs B0 pada log1p(target) + cakupan selang 80%; blok = kab x tahun"""
    M = M or P["mag"][tgt]
    m = ev_sel(dd, i0, i1, tgt, ok if ok is not None else M.get("ok"))
    if m.sum() < 5:
        return {"n": int(m.sum())}
    X, ki = ev_X(dd, m)
    y = np.log1p(dd["ev"][tgt][m])
    p1 = pred_mag(M, X, ki)
    p0 = np.array(P["b0"][tgt])[ki] if M is P["mag"][tgt] else np.array(P["b0_sub"][tgt])[ki]
    lo, hi = p1 + P["s"][tgt] * np.array(P["q"][tgt])[ki, 1], p1 + P["s"][tgt] * np.array(P["q"][tgt])[ki, 17]
    cov = ((y >= lo) & (y <= hi)).astype(float)
    blok = ki * 100 + (dd["tahun"][dd["ev"]["idx"][m]] - 2000)
    ub, inv = np.unique(blok, return_inverse=True)
    S = np.zeros((len(ub), 4))
    np.add.at(S, inv, np.column_stack([np.abs(y - p1), np.abs(y - p0), np.ones(len(y)), cov]))
    sk = boot(S, B, SEED, lambda S: 1 - S[0] / S[1])
    cv = boot(S, B, SEED, lambda S: S[3] / S[2])
    lulus = bool(sk[1] > 0 and 0.70 <= cv[0] <= 0.90)
    return {"n": int(m.sum()), "n_blok": len(ub), "mae_B1": float(S[:, 0].sum() / len(y)), "mae_B0": float(S[:, 1].sum() / len(y)),
            "skill": sk, "cakupan80": cv, "lulus": lulus}


def ets_dari(a, b, c, d):
    n = a + b + c + d
    ar = (a + b) * (a + c) / np.maximum(n, 1)
    return (a - ar) / np.maximum(a + b + c - ar, 1e-12)


def nilai_occ(dd, P, i0, i1, B=B_UJI, M=None, ok=None):
    """ETS pada jumlah alarm sama dengan proksi status.py (a3 >= 40 mm) dan BSS vs klimatologi kab-bulan; blok = kab"""
    M = M or P["occ"]
    ki, ii, X, y, a3 = baris(dd, i0, i1, ok if ok is not None else M.get("ok"))
    p = pred_occ(M, X, ki)
    alarm_ref = a3 >= 40.0
    nal = int(alarm_ref.sum())
    thr = np.sort(p)[::-1][max(nal - 1, 0)]
    alarm_m = p >= thr
    clim = np.array(P["clim"])[ki, dd["bulan"][ii] - 1]
    K = dd["K"]
    S = np.zeros((K, 11))
    for j, al in enumerate((alarm_m, alarm_ref)):
        a, b, c, d = (al & (y == 1)), (al & (y == 0)), (~al & (y == 1)), (~al & (y == 0))
        for q, v in enumerate((a, b, c, d)):
            S[:, 4 * j + q] = np.bincount(ki, v.astype(float), K)
    S[:, 8], S[:, 9], S[:, 10] = np.bincount(ki, (p - y) ** 2, K), np.bincount(ki, (clim - y) ** 2, K), np.bincount(ki, minlength=K)
    S = S[S[:, 10] > 0]
    d_ets = boot(S, B, SEED, lambda S: ets_dari(*S[0:4]) - ets_dari(*S[4:8]))
    bss = boot(S, B, SEED, lambda S: 1 - S[8] / S[9])
    return {"n_baris": int(len(y)), "n_pos": int(y.sum()), "n_alarm": nal, "ETS_model": float(ets_dari(*S.sum(0)[0:4])),
            "ETS_ref": float(ets_dari(*S.sum(0)[4:8])), "dETS": d_ets, "BSS": bss, "lulus": bool(d_ets[1] > 0 and bss[1] > 0 and bss[0] > 0),
            "catatan": "BSS lulus bila titik > 0 (PRAREG: 'BSS > 0'); CI95 dilaporkan"}


# ======================================================================== latih
def ulang_kab(ki, rng, K):
    """indeks baris untuk resampling kab (dengan pengembalian)"""
    urut = np.argsort(ki, kind="stable")
    ks = ki[urut]
    mulai = np.searchsorted(ks, np.arange(K + 1))
    pilih = rng.integers(0, K, K)
    return np.concatenate([urut[mulai[k]:mulai[k + 1]] for k in pilih])


def ser(M):
    return {"kolom": [int(x) for x in M["kolom"]], "b": [round(float(x), 6) for x in M["b"]],
            "const": [round(float(x), 5) for x in M["const"]], "xm": [round(float(x), 5) for x in M["xm"]],
            "n_k": [int(x) for x in M["n_k"]], **({"ok": M["ok"]} if "ok" in M else {})}


def deser(M):
    r = {k: (np.array(v) if k in ("b", "const", "xm", "n_k") else v) for k, v in M.items()}
    r["kolom"] = list(M["kolom"])
    return r


def muat_params():
    P = json.load(open(PARAMS))
    P["occ"], P["occ_tanpaD_sub"] = deser(P["occ"]), deser(P["occ_tanpaD_sub"])
    P["occ_sub"] = deser(P["occ_sub"])
    for t in ("kk", "rumah"):
        for key in ("mag", "mag_sub", "mag_tanpaD_sub"):
            P[key][t] = deser(P[key][t])
    return P


def latih(dd):
    K, pk, Pn = dd["K"], dd["pk"], dd["P"]
    P = {"kabs": dd["kabs"], "dibuat": "dari kode (deterministik)", "mag": {}, "mag_sub": {}, "mag_tanpaD_sub": {}, "b0": {}, "b0_sub": {},
         "q": {}, "s": {}, "m_pilih": {}, "ablasi": {}, "ci": {}}
    # ---- peluang
    ki, ii, X, y, _ = baris(dd, OCC_MULAI, TRAIN_AKHIR)
    kv, iv, Xv, yv, _ = baris(dd, VAL[0], VAL[1])
    print(f"peluang: latih {len(y)} baris ({int(y.sum())} kejadian), validasi {len(yv)} ({int(yv.sum())})", flush=True)
    abl, terbaik = [], None
    for nm, cols in OCC_VAR.items():
        for m in M_OCC:
            M = latih_occ(ki, X, y, cols, m, pk, K, Pn)
            ll = logloss(pred_occ(M, Xv, kv), yv)
            abl.append({"varian": nm, "m": m, "logloss_val": round(ll, 6)})
            if terbaik is None or ll < terbaik[0]:
                terbaik = (ll, nm, m)
            print("  occ", nm, m, round(ll, 6), flush=True)
    _, nm, m = terbaik
    P["ablasi"]["occ"], P["m_pilih"]["occ"] = abl, {"varian": nm, "m": m}
    Mo = latih_occ(ki, X, y, OCC_VAR[nm], m, pk, K, Pn)
    P["occ"] = ser(Mo)
    # klimatologi kab-bulan (latih saja), 100 hari-semu menuju laju kab
    rk = np.bincount(ki, y, K) / np.maximum(np.bincount(ki, minlength=K), 1)
    clim = np.zeros((K, 12))
    bl = dd["bulan"][ii] - 1
    for mm in range(12):
        s = bl == mm
        clim[:, mm] = (np.bincount(ki[s], y[s], K) + 100 * rk) / (np.bincount(ki[s], minlength=K) + 100)
    P["clim"] = np.round(clim, 6).tolist()
    # CI koefisien (bootstrap kab)
    rng = np.random.default_rng(SEED)
    bs = []
    for _ in range(40):
        j = ulang_kab(ki, rng, K)
        bs.append(latih_occ(ki[j], X[j], y[j], OCC_VAR[nm], m, pk, K, Pn)["b"])
    P["ci"]["occ"] = np.percentile(bs, [2.5, 97.5], axis=0).round(5).tolist()
    # ---- besaran
    e = dd["ev"]
    Xe = np.column_stack([e["lE"], e["D"], e["lpap"]])
    tr = e["idx"] <= TRAIN_AKHIR
    for t in ("kk", "rumah"):
        ok = ~np.isnan(e[t])
        mt, mv = tr & ok, ev_sel(dd, VAL[0], VAL[1], t)
        yt, yv_ = np.log1p(e[t][mt]), np.log1p(e[t][mv])
        print(f"besaran {t}: latih {mt.sum()} kejadian, validasi {mv.sum()}", flush=True)
        ab, best = [], None
        for nm, cols in MAG_VAR.items():
            for m in M_MAG:
                M = latih_mag(e["ki"][mt], Xe[mt], yt, cols, m, pk, K, Pn)
                mae = float(np.abs(yv_ - pred_mag(M, Xe[mv], e["ki"][mv])).mean())
                ab.append({"varian": nm, "m": m, "mae_val": round(mae, 5)})
                if best is None or mae < best[0]:
                    best = (mae, nm, m)
        _, nm, m = best
        b0m, bb = None, None
        for m0 in M_MAG:
            b0 = b0_latih(e["ki"][mt], yt, m0, pk, K, Pn)
            mae = float(np.abs(yv_ - b0[e["ki"][mv]]).mean())
            if bb is None or mae < bb:
                b0m, bb = m0, mae
        P["ablasi"][t], P["m_pilih"][t] = ab, {"varian": nm, "m": m, "m_B0": b0m, "mae_val_B1": best[0], "mae_val_B0": bb}
        M = latih_mag(e["ki"][mt], Xe[mt], yt, MAG_VAR[nm], m, pk, K, Pn)
        P["mag"][t] = ser(M)
        P["b0"][t] = np.round(b0_latih(e["ki"][mt], yt, b0m, pk, K, Pn), 5).tolist()
        r = yt - pred_mag(M, Xe[mt], e["ki"][mt])
        gq = grid_galat(e["ki"][mt], r, pk, K)
        P["q"][t] = np.round(gq, 5).tolist()
        rv = yv_ - pred_mag(M, Xe[mv], e["ki"][mv])
        pv = pred_mag(M, Xe[mv], e["ki"][mv])
        sg = np.arange(0.5, 3.001, 0.05)
        cov = [float(((yv_ >= pv + s * gq[e["ki"][mv], 1]) & (yv_ <= pv + s * gq[e["ki"][mv], 17])).mean()) for s in sg]
        P["s"][t] = round(float(sg[int(np.argmin([abs(c - 0.8) for c in cov]))]), 2)
        bs, bst = [], np.random.default_rng(SEED)
        for _ in range(200):
            j = ulang_kab(e["ki"][mt], bst, K)
            bs.append(latih_mag(e["ki"][mt][j], Xe[mt][j], yt[j], MAG_VAR[nm], m, pk, K, Pn)["b"])
        P["ci"][t] = np.percentile(bs, [2.5, 97.5], axis=0).round(5).tolist()
    # ---- ablasi debit: subhimpunan kab dengan GloFAS (dilaporkan, bukan gerbang)
    sub = [bool(x) for x in dd["punya_q"]]
    ki2, ii2, X2, y2, _ = baris(dd, OCC_MULAI, TRAIN_AKHIR, sub)
    mo = P["m_pilih"]["occ"]["m"]
    Ms = latih_occ(ki2, X2, y2, OCC_VAR["penuh"], mo, pk, K, Pn)
    Mt = latih_occ(ki2, X2, y2, OCC_VAR["tanpa_D"], mo, pk, K, Pn)
    P["occ_sub"], P["occ_tanpaD_sub"] = ser({**Ms, "ok": sub}), ser({**Mt, "ok": sub})
    sk = np.asarray(sub)[e["ki"]]
    for t in ("kk", "rumah"):
        mt = tr & ~np.isnan(e[t]) & sk
        yt = np.log1p(e[t][mt])
        m = P["m_pilih"][t]["m"]
        P["mag_sub"][t] = ser({**latih_mag(e["ki"][mt], Xe[mt], yt, MAG_VAR["penuh"], m, pk, K, Pn), "ok": sub})
        P["mag_tanpaD_sub"][t] = ser({**latih_mag(e["ki"][mt], Xe[mt], yt, MAG_VAR["tanpa_D"], m, pk, K, Pn), "ok": sub})
        P["b0_sub"][t] = P["b0"][t]
        # selang & skala B1 subhimpunan memakai tabel kuantil/skala model penuh (ablasi saja)
    P["n_kab"], P["n_kab_q"] = K, int(sum(sub))
    json.dump(P, open(PARAMS, "w"), indent=1)
    return P


# ======================================================================== penanda, sidik, laporan
def hitung_sidik():
    h = hashlib.sha256()
    for f in (PRAREG, os.path.abspath(__file__), PARAMS):
        h.update(open(f, "rb").read())
    return h.hexdigest()


def periksa_buka(penanda=PENANDA, sidik=SIDIK, hitung=hitung_sidik):
    if os.path.exists(penanda):
        raise SystemExit(f"uji sudah dibuka ({penanda}); PRAREG mengizinkan SEKALI")
    if not os.path.exists(sidik) or open(sidik).read().split()[0] != hitung():
        raise SystemExit("sidik tidak cocok: kode/params/PRAREG berubah sesudah dibekukan")


def tabel(kepala, baris_):
    return "\n".join(["| " + " | ".join(kepala) + " |", "|" + " --- |" * len(kepala)] + ["| " + " | ".join(map(str, b)) + " |" for b in baris_])


def f3(t):
    return f"{t[0]:.3f} [{t[1]:.3f}; {t[2]:.3f}]"


def md_hasil(judul, H):
    out = [f"### {judul}", ""]
    o = H["occ"]
    out += ["Peluang kejadian (kab-hari): " + (f"n={o['n_baris']}, kejadian={o['n_pos']}, alarm={o['n_alarm']}, ETS model {o['ETS_model']:.3f}, ETS proksi status {o['ETS_ref']:.3f}, "
            f"dETS {f3(o['dETS'])}, BSS {f3(o['BSS'])}, LULUS={o['lulus']}"), ""]
    rows = []
    for t in ("kk", "rumah"):
        r = H[t]
        if r.get("n", 0) >= 5:
            rows.append([t, r["n"], r["n_blok"], f"{r['mae_B1']:.3f}", f"{r['mae_B0']:.3f}", f3(r["skill"]), f3(r["cakupan80"]), r["lulus"]])
    out += [tabel(["target", "n", "blok", "MAE B1", "MAE B0", "skill [CI95]", "cakupan 80% [CI95]", "LULUS"], rows), ""]
    return "\n".join(out)


def ablasi_D(dd, P, i0, i1, B):
    """kab dengan debit: dengan vs tanpa D (dilaporkan saja)"""
    sub = P["occ_sub"]["ok"]
    r = {"n_kab": int(sum(sub)), "occ_dengan_D": nilai_occ(dd, P, i0, i1, B, P["occ_sub"]), "occ_tanpa_D": nilai_occ(dd, P, i0, i1, B, P["occ_tanpaD_sub"])}
    for t in ("kk",):
        r["mag_dengan_D"] = nilai_mag(dd, P, t, i0, i1, B, P["mag_sub"][t])
        r["mag_tanpa_D"] = nilai_mag(dd, P, t, i0, i1, B, P["mag_tanpaD_sub"][t])
    return r


def semua(dd, P, occ_win, mag_win, B):
    return {"occ": nilai_occ(dd, P, *occ_win, B), "kk": nilai_mag(dd, P, "kk", *mag_win, B), "rumah": nilai_mag(dd, P, "rumah", *mag_win, B),
            "ablasi_D": ablasi_D(dd, P, *occ_win, B)}


def md_ablasi(A):
    r = [["peluang dengan D", f3(A["occ_dengan_D"]["dETS"]), f3(A["occ_dengan_D"]["BSS"])],
         ["peluang tanpa D", f3(A["occ_tanpa_D"]["dETS"]), f3(A["occ_tanpa_D"]["BSS"])]]
    out = [f"Ablasi debit pada {A['n_kab']} kab berdebit GloFAS (dilaporkan, bukan gerbang):", "", tabel(["model", "dETS", "BSS"], r), ""]
    for k in ("mag_dengan_D", "mag_tanpa_D"):
        x = A[k]
        if x.get("n", 0) >= 5:
            out.append(f"- KK {k}: n={x['n']}, skill {f3(x['skill'])}, cakupan80 {f3(x['cakupan80'])}")
    return "\n".join(out) + "\n"


def tulis_kepala(P, H_val, dd):
    imp = [k for k in dd["kabs"] if dd["st"][k].get("cn_imputasi")]
    mp = P["m_pilih"]
    L = ["# RISET-DAMPAK: hujan -> kejadian -> besaran (KK, rumah) per kabupaten", "",
         "Dokumen pasangan `PRAREG-DAMPAK.md` (dibekukan). Skrip `model_dampak.py`. Ditulis bertahap: `latih` (bagian 1-3), `buka` (bagian 4), `skenario` (bagian 5).", "",
         "## 1. Data dan penyimpangan yang dicatat", "",
         f"- Kab dimodelkan: {P['n_kab']} (punya CN, kapasitas, paparan lahan rendah). Kab berdebit GloFAS: {P['n_kab_q']}.",
         f"- Kelompok tanah SoilGrids hilang untuk kab: CN diisi dengan modus provinsi/nasional (`cn_imputasi`): {len(imp)} kab dimodelkan terdampak "
         f"({sum(1 for k in imp if dd['st'][k]['cn_imputasi']=='provinsi')} modus provinsi, {sum(1 for k in imp if dd['st'][k]['cn_imputasi']=='nasional')} modus nasional). Asumsi, bukan pengukuran.",
         "- Peluang dilatih 2016-2021 (berita Groundsource baru memadai sejak 2016); besaran memakai semua kejadian bertarget >0 sejak 2008.",
         "- Positif = hari mulai kejadian (semua sumber); hari lanjutan kejadian (maks 30 hari) dikeluarkan dari latih. Fitur E/D besaran = maks hari mulai +-1.",
         "- KK = logbook `kk`, selain itu DIBI menderita/3,5; target rumah terpisah (logbook rumah, selain itu DIBI terendam). Target <=0 dibuang.",
         "- Fitur hujan POWER (MERRA-2, ~50 km) dan CN/kapasitas TR-55 adalah asumsi (lihat RISET-FITUR-BANJIR.md).",
         "- **Penyimpangan §4**: pembanding `status.py` Waspada 2026 tidak dapat direproduksi: cache ERA5 `uji_logbook` yang ada hanya 20 sel (dari 220) dan tidak ada InaRISK/imax per kab. "
         "Penggantinya proksi **a3 POWER >= 40 mm** (ambang H3 Waspada status.py) dengan jumlah alarm model disamakan. Proksi bukan status.py sebenarnya.",
         "- Debit D = (persentil debit - 50)/50, 0 bila tidak ada GloFAS. Musim = sin/cos hari-dalam-tahun. Hujan hulu DAS tidak ada (diwakili D).",
         "- Tinggi/lama: hanya 2025-2026 (247/196 kejadian) < 150 kejadian pada masa latih, jadi PRAREG §1.6: sebaran empiris per kab bersyarat kelas hujan, bukan regresi.", "",
         "## 2. Penyetelan (validasi 2022-2023)", "",
         f"- Peluang: varian **{mp['occ']['varian']}**, m = {mp['occ']['m']} (logloss validasi terendah dari {len(P['ablasi']['occ'])} kombinasi).",
         f"- KK: varian **{mp['kk']['varian']}**, m = {mp['kk']['m']}; B0 m = {mp['kk']['m_B0']}; MAE validasi B1 {mp['kk']['mae_val_B1']:.3f} vs B0 {mp['kk']['mae_val_B0']:.3f}; skala selang s = {P['s']['kk']}.",
         f"- Rumah: varian **{mp['rumah']['varian']}**, m = {mp['rumah']['m']}; B0 m = {mp['rumah']['m_B0']}; MAE validasi B1 {mp['rumah']['mae_val_B1']:.3f} vs B0 {mp['rumah']['mae_val_B0']:.3f}; s = {P['s']['rumah']}.", ""]
    L += [md_hasil("Latihan-kering pada VALIDASI 2022-2023 (bukan vonis; uji fungsi yang sama dengan `buka`)", H_val), md_ablasi(H_val["ablasi_D"])]
    L += ["## 3. Konstanta dan koefisien", "", "Lihat tabel di bawah dan `data/raw/banjir/dampak/konstanta.json` (per kab: CN, kapasitas, a_k, c_k).", ""]
    kol = {"occ": NAMA_OCC, "kk": NAMA_MAG, "rumah": NAMA_MAG}
    bs = {"occ": P["occ"], "kk": P["mag"]["kk"], "rumah": P["mag"]["rumah"]}
    rows = []
    for t in ("occ", "kk", "rumah"):
        for j, c in enumerate(bs[t]["kolom"]):
            rows.append([{"occ": "peluang b", "kk": "KK d", "rumah": "rumah d"}[t], kol[t][c], f"{bs[t]['b'][j]:.4f}", f"[{P['ci'][t][0][j]:.4f}; {P['ci'][t][1][j]:.4f}]"])
    L += [tabel(["model", "variabel", "koefisien", "CI95 (bootstrap kab)"], rows), ""]
    L += ["Konstanta per kab: a_k (intersep logit peluang), c_k (intersep log1p KK), CN_II, kapasitas_mm; a_k dan c_k ditarik ke provinsi lalu nasional dengan bobot n/(n+m). "
          "Koefisien b/d bersama seluruh kab; hanya intersep yang berbeda per daerah.", ""]
    open(RISET, "w").write("\n".join(L) + "\n")


def konstanta(dd, P):
    kab = {}
    for i, k in enumerate(dd["kabs"]):
        s = dd["st"][k]
        kab[k] = {"nama": s["nama"], "prov": s["prov"], "cn_ii": s["cn_ii"], "cn_imputasi": s.get("cn_imputasi"), "kapasitas_mm": s["kapasitas_mm"],
                  "r2_mm": s.get("r2_mm"), "r5_mm": s.get("r5_mm"), "kk_lahan_rendah": s["kk_hand2_proksi"], "a_k": round(float(P["occ"]["const"][i]), 4),
                  "n_kejadian_latih": int(P["occ"]["n_k"][i]), "c_k_kk": round(float(P["mag"]["kk"]["const"][i]), 4), "n_kk_latih": int(P["mag"]["kk"]["n_k"][i]),
                  "c_k_rumah": round(float(P["mag"]["rumah"]["const"][i]), 4), "n_rumah_latih": int(P["mag"]["rumah"]["n_k"][i])}
    sh = {}
    for t, M, nm in (("peluang_b", P["occ"], NAMA_OCC), ("kk_d", P["mag"]["kk"], NAMA_MAG), ("rumah_d", P["mag"]["rumah"], NAMA_MAG)):
        c = P["ci"][{"peluang_b": "occ", "kk_d": "kk", "rumah_d": "rumah"}[t]]
        sh[t] = {nm[col]: {"koef": float(M["b"][j]), "ci95": [c[0][j], c[1][j]]} for j, col in enumerate(M["kolom"])}
    os.makedirs(OUT, exist_ok=True)
    json.dump({"koefisien_bersama": sh, "varian": P["m_pilih"], "kab": kab}, open(os.path.join(OUT, "konstanta.json"), "w"), indent=1, ensure_ascii=False)


# ======================================================================== skenario
def kelas_hujan(a3):
    return 0 if a3 < KELAS_HUJAN[0] else (1 if a3 < KELAS_HUJAN[1] else 2)


def sebaran_empiris(dd, kab_i, a3):
    """tinggi (cm) / lama (hari) empiris: kab+kelas hujan (n>=5), kab (n>=5), kelas nasional (n>=5), nasional"""
    e, hasil = dd["ev"], {}
    kl = np.array([kelas_hujan(x) for x in e["a3"]])
    for nm in ("ked", "dur"):
        ada = ~np.isnan(e[nm])
        for nivel, m in (("kab+kelas", ada & (e["ki"] == kab_i) & (kl == kelas_hujan(a3))), ("kab", ada & (e["ki"] == kab_i)),
                         ("nasional+kelas", ada & (kl == kelas_hujan(a3))), ("nasional", ada)):
            if m.sum() >= 5:
                v = e[nm][m]
                hasil[nm] = {"n": int(m.sum()), "nivel": nivel, "p10": float(np.percentile(v, 10)), "p50": float(np.percentile(v, 50)), "p90": float(np.percentile(v, 90))}
                break
    return hasil


def skenario(dd, P):
    out = {}
    cc = {t: P["mag"][t] for t in ("kk", "rumah")}
    for i, k in enumerate(dd["kabs"]):
        s = dd["st"][k]
        cn2, cap = s["cn_ii"], s["kapasitas_mm"]
        lp = dd["lpap"][i]
        out[k] = {"nama": s["nama"], "n_kejadian_peluang": int(P["occ"]["n_k"][i]), "n_kk": int(cc["kk"]["n_k"][i]), "n_rumah": int(cc["rumah"]["n_k"][i]), "hujan": {}}
        for X_ in HUJAN_SKEN:
            out[k]["hujan"][str(X_)] = {}
            emp = sebaran_empiris(dd, i, X_)
            for nm_amc, kls in AMC.items():
                q = scs_q(X_, cn_amc(cn2, kls))
                E = max(0.0, q - cap)
                xo = np.array([[math.log1p(E), 0.0, 0.0, 1.0]])
                p = float(pred_occ(P["occ"], xo, np.array([i]))[0])
                r = {"limpasan_mm": round(q, 1), "kelebihan_mm": round(E, 1), "peluang": round(p, 5)}
                for t in ("kk", "rumah"):
                    xm = np.array([[math.log1p(E), 0.0, lp]])
                    pr = float(pred_mag(cc[t], xm, np.array([i]))[0])
                    sm = simulasi(pr, np.array(P["q"][t])[i], P["s"][t])
                    qq = np.expm1(np.percentile(sm, [10, 50, 90]))
                    r[t] = [round(float(max(0.0, v)), 1) for v in qq]
                out[k]["hujan"][str(X_)][nm_amc] = r
            out[k]["hujan"][str(X_)]["empiris_tinggi_lama"] = emp
    os.makedirs(OUT, exist_ok=True)
    json.dump({"catatan": "peluang = peluang kejadian banjir TERLAPOR mulai pada hari itu (kab-hari), debit D=median, musim netral; KK/rumah p10/p50/p90 bila terjadi", "kab": out},
              open(os.path.join(OUT, "skenario.json"), "w"), indent=1, ensure_ascii=False)
    return out


def md_aceh(out, P):
    k = "11.02"
    a = out.get(k)
    if not a:
        return "Aceh Tenggara (11.02) tidak termasuk kab dimodelkan.\n"
    h = a["hujan"]["200"]
    L = ["## 5. Contoh: hujan 200 mm / 3 hari di Aceh Tenggara (11.02)", "",
         f"Basis: {a['n_kejadian_peluang']} kejadian terlapor (latih peluang 2016-2021), {a['n_kk']} kejadian ber-KK dan {a['n_rumah']} ber-rumah (latih <=2021).", ""]
    for nm in AMC:
        r = h[nm]
        L.append(f"- Kondisi {nm}: hujan 200 mm 3 hari di Aceh Tenggara: peluang banjir terlapor pada hari itu {100*r['peluang']:.1f}%; "
                 f"bila terjadi ~{r['kk'][1]:.0f} KK (rentang {r['kk'][0]:.0f}-{r['kk'][2]:.0f}) dan ~{r['rumah'][1]:.0f} rumah ({r['rumah'][0]:.0f}-{r['rumah'][2]:.0f}); "
                 f"limpasan {r['limpasan_mm']} mm, kelebihan atas kapasitas {r['kelebihan_mm']} mm.")
    e = h["empiris_tinggi_lama"]
    for nm, lab in (("ked", "tinggi air (cm)"), ("dur", "lama (hari)")):
        if nm in e:
            L.append(f"- {lab}: empiris p10/p50/p90 = {e[nm]['p10']:.0f}/{e[nm]['p50']:.0f}/{e[nm]['p90']:.0f}, berdasarkan {e[nm]['n']} kejadian (tingkat: {e[nm]['nivel']}).")
        else:
            L.append(f"- {lab}: tidak ada data.")
    L += ["", "Catatan: peluang per HARI-kab, bukan 'peluang banjir pada hujan itu'; angka KK memakai asumsi 3,5 jiwa/KK untuk DIBI. Bila vonis model di bagian 4 TIDAK LULUS, "
          "angka model di atas tidak tayang sebagai prediksi; hanya sebaran empiris historis yang boleh tayang, dengan label 'berdasarkan N kejadian'.", ""]
    return "\n".join(L)


# ======================================================================== mode
def buka(dd):
    periksa_buka()
    open(PENANDA, "w").write(f"dibuka {dt.datetime.now().isoformat(timespec='seconds')} sidik {open(SIDIK).read().split()[0]}\n")  # SEBELUM metrik pertama
    P = muat_params()
    H = semua(dd, P, TEST_OCC, TEST, B_UJI)
    H["occ_info_2024_2025"] = nilai_occ(dd, P, hari("2024-01-01"), hari("2025-12-31"), B_UJI)
    lines = ["", "## 4. Hasil uji 2024-01-01..2026-09-30 (dibuka sekali)", "",
             f"Penanda: `model_dampak.buka`. Besaran: kejadian bertarget >0 pada {TEST[0]}..{TEST[1]} (indeks hari); peluang: hanya 2026.", "",
             md_hasil("Vonis", H), md_ablasi(H["ablasi_D"]),
             "Peluang 2024-2025 (INFORMASI, bukan vonis; sudah dibuka di RISET-MODEL-KAB): " + json.dumps({k: v for k, v in H["occ_info_2024_2025"].items() if k != "catatan"}), ""]
    lulus_b = H["kk"].get("lulus") and H["occ"]["lulus"]
    lines += [f"**Vonis KK: {'LULUS' if H['kk'].get('lulus') else 'TIDAK LULUS'}; rumah: {'LULUS' if H['rumah'].get('lulus') else 'TIDAK LULUS'}; peluang 2026: {'LULUS' if H['occ']['lulus'] else 'TIDAK LULUS'}.**", "",
              "Aturan PRAREG §4: bila tidak lulus, model tidak tayang sebagai prediksi; yang tayang hanya sebaran empiris historis per kab berlabel 'berdasarkan N kejadian'.", ""]
    open(RISET, "a").write("\n".join(lines) + "\n")
    json.dump(H, open(os.path.join(OUT, "hasil_uji.json"), "w"), indent=1, default=float)
    print("\n".join(lines))


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "uji"
    if mode == "uji":
        return uji()
    dd = muat()
    os.makedirs(OUT, exist_ok=True)
    if mode == "latih":
        if os.path.exists(PENANDA):
            raise SystemExit("uji sudah dibuka; latih ulang dilarang")
        P = latih(dd)
        P2 = muat_params()
        H = semua(dd, P2, VAL, VAL, 200)      # latihan-kering fungsi yang sama dengan `buka`, di VALIDASI
        tulis_kepala(P, H, dd)
        konstanta(dd, P2)
        open(SIDIK, "w").write(hitung_sidik() + "  PRAREG-DAMPAK.md+model_dampak.py+model_dampak.params.json\n")
        print(md_hasil("validasi (latihan-kering)", H))
        print("sidik dibekukan:", open(SIDIK).read().strip())
    elif mode == "buka":
        buka(dd)
    elif mode == "skenario":
        P = muat_params()
        out = skenario(dd, P)
        t = open(RISET).read()
        t = t.split("\n## 5. Contoh")[0].rstrip() + "\n\n" + md_aceh(out, P)
        open(RISET, "w").write(t)
        print(md_aceh(out, P))
    else:
        raise SystemExit(__doc__)


def uji():
    # SCS-CN: CN 75 -> S=84.667; P=100 -> Q=(100-16.933)^2/(100+67.733)
    assert abs(scs_q(100, 75) - (100 - 16.9333) ** 2 / (100 + 67.7333)) < 1e-3 and scs_q(10, 75) == 0.0
    # AMC: kering < normal < basah, rumus Chow
    assert cn_amc(75, 1) < 75 < cn_amc(75, 3) and abs(cn_amc(75, 1) - 75 / (2.281 - 0.01281 * 75)) < 1e-9
    assert scs_q(100, cn_amc(75, 1)) < scs_q(100, 75) < scs_q(100, cn_amc(75, 3))
    # bobot pooling n/(n+m)
    assert bobot(10, 10) == 0.5 and bobot(0, 5) == 0.0 and abs(bobot(90, 10) - 0.9) < 1e-12
    # pooling nyata: kab tanpa kejadian jatuh ke provinsi; kab banyak kejadian mendekati laju sendiri
    rng = np.random.default_rng(1)
    K = 3
    ki = np.repeat(np.arange(K), 4000)
    X = np.zeros((len(ki), 4))
    y = np.concatenate([rng.random(4000) < 0.20, rng.random(4000) < 0.01, rng.random(4000) < 0.0]).astype(float)
    pk = np.array([0, 0, 0])
    M = latih_occ(ki, X, y, [0], 100, pk, K, 1)
    pa = sig(M["const"])
    assert pa[1] < pa[2] < pa[0] and 0.12 < pa[0] < 0.21, pa   # tanpa kejadian -> ke rata-rata provinsi, bukan ke 0
    # hurdle: nilai harapan = p x E[y|terjadi]
    assert hurdle(0.1, 50.0) == 5.0
    # simulasi kuantil: galat simetris -> median = pred, p10 < p50 < p90, s melebarkan
    g = np.quantile(rng.normal(0, 1, 5000), LV)
    sm = simulasi(2.0, g, 1.0)
    q10, q50, q90 = np.percentile(sm, [10, 50, 90])
    assert q10 < q50 < q90 and abs(q50 - 2.0) < 0.1
    sm2 = simulasi(2.0, g, 2.0)
    assert np.percentile(sm2, 90) - np.percentile(sm2, 10) > 1.8 * (q90 - q10)
    # regresi besaran menemukan kemiringan benar
    kk_ = np.repeat(np.arange(K), 300)
    x = rng.normal(0, 1, len(kk_))
    yy = 1.0 + 0.5 * x + np.repeat([0, 1, 2], 300) + rng.normal(0, 0.1, len(kk_))
    Mm = latih_mag(kk_, np.column_stack([x, x, x]), yy, [0], 1, pk, K, 1)
    assert abs(Mm["b"][0] - 0.5) < 0.05
    # bootstrap blok: statistik titik = statistik penuh
    S = np.array([[1.0, 2.0], [3.0, 4.0]])
    t, lo, hi = boot(S, 50, 1, lambda S: S[0] / S[1])
    assert abs(t - 4 / 6) < 1e-12 and lo <= hi
    # buka kedua kali ditolak; sidik tak cocok ditolak
    with tempfile.TemporaryDirectory() as d:
        pn, sd = os.path.join(d, "buka"), os.path.join(d, "sidik")
        open(sd, "w").write("abc  x\n")
        try:
            periksa_buka(pn, sd, lambda: "beda")
            raise AssertionError("sidik beda harus ditolak")
        except SystemExit:
            pass
        periksa_buka(pn, sd, lambda: "abc")
        open(pn, "w").write("sudah")
        try:
            periksa_buka(pn, sd, lambda: "abc")
            raise AssertionError("buka kedua harus ditolak")
        except SystemExit:
            pass
    # ETS: prakiraan sempurna = 1
    assert abs(ets_dari(np.array([5.0]), np.array([0.0]), np.array([0.0]), np.array([95.0]))[0] - 1) < 1e-12
    print("model_dampak uji: OK")


if __name__ == "__main__":
    main()
