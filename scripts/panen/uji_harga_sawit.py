"""Uji jujur: apakah anomali harga CPO menambah kemampuan meramal titik panas bulanan per provinsi
di atas klimatologi provinsi x bulan + ONI + DMI?  (Rencana panen #51.)  Analisis, BUKAN model produksi.

Data : public/data/sejarah.json (VIIRS prov x tahun x bulan), data/raw/sebaran/enso.json (ONI, DMI),
       public/data/harga_komoditas.json (Pink Sheet).   Butuh numpy (hanya untuk analisis ini).
Latih 2015-2019 (lag CPO dipilih di sini saja, validasi silang tinggal-satu-tahun), uji 2020-2025 dibuka sekali.
Metrik: devians Poisson per pengamatan; selisih berpasangan (baseline - CPO), CI bootstrap blok-bulan.
  python3 uji_harga_sawit.py        -> cetak hasil + tulis scripts/panen/hasil_uji_harga_sawit.json
  python3 uji_harga_sawit.py uji    -> self-check
"""
import json, sys, math
from pathlib import Path
import numpy as np
R = Path(__file__).resolve().parents[2]
SAWIT = {"11", "12", "14", "15", "16", "17", "61", "62", "64"}  # ditetapkan a priori (provinsi inti sawit)
LATIH, UJI = range(2015, 2020), range(2020, 2026)
RNG = np.random.default_rng(51)


def muat():
    h = json.load(open(R / "public/data/sejarah.json"))["prov"]
    e = json.load(open(R / "data/raw/sebaran/enso.json"))
    k = json.load(open(R / "public/data/harga_komoditas.json"))["seri"]["palm_oil"]
    return h, e["oni"], e["dmi"], k


def bln(t):  # indeks bulan berurutan dari 2010-01
    return t


def kunci(y, m): return f"{y}-{m:02d}"


def anomali_cpo(k):
    """log CPO dikurangi rerata 12 bulan sebelumnya (buang tren), lalu buang pola musiman (rerata bulan-kalender LATIH saja)."""
    ks = sorted(k); lp = {b: math.log(k[b]) for b in ks}
    ann = {}
    for i, b in enumerate(ks):
        if i >= 12: ann[b] = lp[b] - sum(lp[x] for x in ks[i - 12:i]) / 12
    mus = {m: np.mean([ann[f"{y}M{m:02d}"] for y in LATIH if f"{y}M{m:02d}" in ann]) for m in range(1, 13)}
    return {b: a - mus[int(b[-2:])] for b, a in ann.items()}


def geser(y, m, lag):
    t = y * 12 + m - 1 - lag
    return t // 12, t % 12 + 1


def tabel(h, oni, dmi, cpo, tahun_klim, lagO=3, lagD=3):
    """Baris: (prov, y, m, hitung, klim, sawit, kering, oni, dmi, cpo[1..12])."""
    kl = {}
    for p in h:
        for m in range(1, 13):
            v = [h[p][str(y)][m - 1] for y in tahun_klim if str(y) in h[p]]
            kl[p, m] = (sum(v) / len(v)) if v else 0.0
    return kl


def baris(h, oni, dmi, cpo, thn, kl, lagO, lagD):
    out = []
    for p in sorted(h):
        for y in thn:
            for m in range(1, 13):
                yo, mo = geser(y, m, lagO); yd, md = geser(y, m, lagD)
                o = oni.get(kunci(yo, mo)); d = dmi.get(kunci(yd, md))
                if o is None or d is None or str(y) not in h[p]: continue
                c = [cpo.get(f"{geser(y, m, k)[0]}M{geser(y, m, k)[1]:02d}") for k in range(1, 13)]
                if any(x is None for x in c): continue
                out.append((p, y, m, h[p][str(y)][m - 1], kl[p, m], p in SAWIT, 7 <= m <= 11, o, d, c))
    return out


def desain(B, k):
    """Kolom: ENSO (ONI,DMI) x kering x {sawit, lain}; CPO (lag k) x {sawit, lain} bila k."""
    X = []
    for p, y, m, n, kl, sw, kr, o, d, c in B:
        r = []
        for g in (sw, not sw):
            f = float(g and kr); r += [f * o, f * d]
        if k:
            a = c[k - 1]; r += [a * sw, a * (not sw)]
        X.append(r)
    X = np.array(X, float)
    off = np.log(np.array([b[4] for b in B]) + 0.5)
    return X, off, np.array([b[3] for b in B], float)


def fit(X, off, y, lam=1.0):
    b = np.zeros(X.shape[1])
    for _ in range(60):
        mu = np.exp(np.clip(off + X @ b, -20, 20))
        g = X.T @ (y - mu) - lam * b
        H = (X * mu[:, None]).T @ X + lam * np.eye(len(b))
        s = np.linalg.solve(H, g); b += s
        if np.abs(s).max() < 1e-8: break
    return b


def dev(y, mu):
    return 2 * (np.where(y > 0, y * np.log(np.maximum(y, 1e-12) / mu), 0) - (y - mu))


def klim_loyo(h, tahun, skip):
    return tabel(h, 0, 0, 0, [t for t in tahun if t != skip])


def cv_lag(h, oni, dmi, cpo, k):
    """Devians LOYO di tahun latih (klimatologi dihitung tanpa tahun yang ditahan)."""
    tot = 0.0
    for sk in LATIH:
        kl_tr = klim_loyo(h, LATIH, sk)
        Btr = [b for y in LATIH if y != sk for b in baris(h, oni, dmi, cpo, [y], kl_loo(h, y, sk), 3, 3)]
        Bte = baris(h, oni, dmi, cpo, [sk], kl_tr, 3, 3)
        Xa, oa, ya = desain(Btr, k); Xb, ob, yb = desain(Bte, k)
        b = fit(Xa, oa, ya)
        tot += dev(yb, np.exp(ob + Xb @ b)).sum()
    return tot


def kl_loo(h, y, sk):  # klimatologi tahun y untuk baris latih: tanpa tahun y dan tanpa tahun tahan (hindari bocor diri sendiri)
    return tabel(h, 0, 0, 0, [t for t in LATIH if t not in (y, sk)])


def boot(sel, B, n=4000, blok=6):
    """Bootstrap blok-bulan (semua provinsi satu bulan ikut bersama): rerata selisih devians per pengamatan."""
    per = {}
    for s, b in zip(sel, B): per.setdefault((b[1], b[2]), []).append(s)
    ks = sorted(per); S = np.array([sum(per[k]) for k in ks]); N = np.array([len(per[k]) for k in ks])
    T = len(ks); out = []
    for _ in range(n):
        idx = []
        while len(idx) < T:
            s0 = RNG.integers(0, T); idx += [(s0 + j) % T for j in range(blok)]
        idx = idx[:T]; out.append(S[idx].sum() / N[idx].sum())
    return np.percentile(out, [2.5, 97.5]), S.sum() / N.sum()


def jalan():
    h, oni, dmi, cpo_raw = muat()
    cpo = anomali_cpo(cpo_raw)
    cv = {k: cv_lag(h, oni, dmi, cpo, k) for k in range(0, 13)}
    k_best = min(range(1, 13), key=lambda k: cv[k])
    kl = tabel(h, 0, 0, 0, LATIH)
    Btr = [b for y in LATIH for b in baris(h, oni, dmi, cpo, [y], kl_loo(h, y, y), 3, 3)]  # klim tanpa diri sendiri
    Bte = baris(h, oni, dmi, cpo, UJI, kl, 3, 3)
    res = {"lag_cpo_dipilih": k_best, "cv_devians_latih": {str(k): round(v, 1) for k, v in cv.items()}}
    Xa0, oa, ya = desain(Btr, 0); Xb0, ob, yb = desain(Bte, 0)
    Xa1, _, _ = desain(Btr, k_best); Xb1, _, _ = desain(Bte, k_best)
    b0 = fit(Xa0, oa, ya); b1 = fit(Xa1, oa, ya)
    mu0 = np.exp(ob + Xb0 @ b0); mu1 = np.exp(ob + Xb1 @ b1); mu_k = np.exp(ob)
    d0, d1, dk = dev(yb, mu0), dev(yb, mu1), dev(yb, mu_k)
    sel = d0 - d1
    ci, rata = boot(sel, Bte)
    ci_enso, rata_enso = boot(dk - d0, Bte)
    mae = lambda mu: float(np.mean(np.abs(np.log1p(yb) - np.log1p(mu))))
    sw = np.array([b[5] for b in Bte])
    ci_sw, r_sw = boot(np.where(sw, sel, 0.0), Bte)
    res.update({
        "n_latih": len(Btr), "n_uji": len(Bte), "koef_baseline": [round(x, 3) for x in b0], "koef_cpo": [round(x, 3) for x in b1],
        "devians_uji_klimatologi": round(float(dk.mean()), 3), "devians_uji_baseline_enso": round(float(d0.mean()), 3),
        "devians_uji_cpo": round(float(d1.mean()), 3),
        "selisih_baseline_minus_cpo": round(float(rata), 4), "ci95_blok_bulan": [round(float(ci[0]), 4), round(float(ci[1]), 4)],
        "selisih_enso_vs_klim": round(float(rata_enso), 4), "ci95_enso_vs_klim": [round(float(x), 4) for x in ci_enso],
        "mae_log1p_uji": {"klim": round(mae(mu_k), 4), "baseline": round(mae(mu0), 4), "cpo": round(mae(mu1), 4)},
        "selisih_hanya_prov_sawit": round(float(r_sw), 4), "ci95_hanya_sawit": [round(float(x), 4) for x in ci_sw],
    })
    res["lolos"] = bool(ci[0] > 0)
    return res


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        a = anomali_cpo(muat()[3]); assert abs(np.mean([a[f"2016M{m:02d}"] for m in range(1, 13)])) < 0.5
        d = dev(np.array([0., 3.]), np.array([1., 3.])); assert abs(d[0] - 2) < 1e-9 and d[1] == 0
        X = np.random.default_rng(1).normal(size=(500, 2)); y = np.random.default_rng(2).poisson(np.exp(X @ [0.5, -0.3]))
        assert np.allclose(fit(X, np.zeros(500), y.astype(float), 0.0), [0.5, -0.3], atol=0.15)
        print("ok")
    else:
        r = jalan(); print(json.dumps(r, indent=1))
        (Path(__file__).parent / "hasil_uji_harga_sawit.json").write_text(json.dumps(r, indent=1))
