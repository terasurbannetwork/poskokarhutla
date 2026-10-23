"""GBDT histogram + metrik dengan numpy, untuk data jutaan baris (gbdt.py stdlib terlalu lambat di sana).

Pohon disimpan dengan format yang SAMA dengan gbdt.py: [fitur, ambang, kiri, kanan] (x[fitur] <= ambang -> kiri) atau
[nilai]; skor = bias + sum(daun), jadi gbdt.nilai_pohon / evaluator JS bisa membacanya apa adanya.
Kerugian logistik berbobot, pertumbuhan per kedalaman, belahan dari histogram <= NB bin kuantil (tepi = titik tengah ke nilai
berikutnya, sama dengan gbdt.tepi_bin), anak besar = induk - anak kecil.

  python3 scripts/sebaran/gbdt_np.py uji
"""
import math

import numpy as np

NB = 64


def tepi_bin(X, nb=NB, sampel=200000, seed=1):
    rng = np.random.default_rng(seed)
    idx = rng.choice(len(X), sampel, replace=False) if len(X) > sampel else np.arange(len(X))
    tepi = []
    for j in range(X.shape[1]):
        v = np.sort(X[idx, j].astype(np.float64))
        e = set()
        for q in range(1, nb):
            a = v[int(len(v) * q / nb)]
            k = np.searchsorted(v, a, side="right")
            if k < len(v):
                e.add(float((a + v[k]) / 2))
        tepi.append(np.array(sorted(e)[:nb - 1]))
    return tepi


def binkan(X, tepi):
    """-> uint8 (fitur x baris), bin = jumlah tepi < x (x <= tepi[b] -> bin <= b)."""
    return np.stack([np.searchsorted(e, X[:, j], side="left").astype(np.uint8) for j, e in enumerate(tepi)])


def latih(X, y, w, pohon=300, dalam=6, lr=0.05, l2=1.0, min_h=20.0, sub=0.7, seed=1, log=None):
    X = np.asarray(X, np.float32)
    y = np.asarray(y, np.float64)
    w = np.asarray(w, np.float64)
    n, m = X.shape
    tepi = tepi_bin(X)
    B = binkan(X, tepi)
    nbj = [len(e) + 1 for e in tepi]
    p0 = float((w * y).sum() / w.sum())
    bias = math.log(p0 / (1 - p0))
    F = np.full(n, bias)
    rng = np.random.default_rng(seed)
    hutan = []
    for t in range(pohon):
        p = 1 / (1 + np.exp(-F))
        g, h = w * (p - y), w * p * (1 - p)
        idx = np.flatnonzero(rng.random(n) < sub)
        simpul = []

        def histo(ix):
            gi, hi = g[ix], h[ix]
            return [(np.bincount(B[j, ix], gi, nbj[j]), np.bincount(B[j, ix], hi, nbj[j])) for j in range(m)]

        def bangun(ix, d, H, G, Hs):
            no = len(simpul)
            simpul.append(None)
            best = None
            if d < dalam and Hs >= 2 * min_h:
                dasar = G * G / (Hs + l2)
                for j in range(m):
                    gl, hl = np.cumsum(H[j][0])[:-1], np.cumsum(H[j][1])[:-1]
                    gr, hr = G - gl, Hs - hl
                    ok = (hl >= min_h) & (hr >= min_h)
                    if not ok.any():
                        continue
                    gain = np.where(ok, gl * gl / (hl + l2) + gr * gr / (hr + l2) - dasar, -np.inf)
                    b = int(np.argmax(gain))
                    if best is None or gain[b] > best[0]:
                        best = (float(gain[b]), j, b, float(gl[b]), float(hl[b]))
            if best is None or best[0] <= 1e-9:
                simpul[no] = [round(-G / (Hs + l2) * lr, 6)]
                return no
            _, j, b, gl, hl = best
            kiri = B[j, ix] <= b
            ki, ka = ix[kiri], ix[~kiri]
            if d + 1 < dalam:
                kecil = ki if len(ki) <= len(ka) else ka
                Hk = histo(kecil)
                Hb = [(H[q][0] - Hk[q][0], H[q][1] - Hk[q][1]) for q in range(m)]
                Hl, Hr = (Hk, Hb) if kecil is ki else (Hb, Hk)
            else:
                Hl = Hr = None
            simpul[no] = [j, float(tepi[j][b]), None, None]
            simpul[no][2] = bangun(ki, d + 1, Hl, gl, hl)
            simpul[no][3] = bangun(ka, d + 1, Hr, G - gl, Hs - hl)
            return no

        H0 = histo(idx)
        bangun(idx, 0, H0, float(g[idx].sum()), float(h[idx].sum()))
        hutan.append(simpul)
        F += nilai(simpul, X)
        if log and (t + 1) % 50 == 0:
            log(f"    pohon {t + 1}/{pohon}")
    return {"bias": bias, "pohon": hutan}


def nilai(s, X):
    """Nilai satu pohon untuk semua baris (vektor)."""
    out = np.zeros(len(X))
    stack = [(0, np.arange(len(X)))]
    while stack:
        k, ix = stack.pop()
        if len(s[k]) == 1:
            out[ix] = s[k][0]
            continue
        f, a, l, r = s[k]
        kiri = X[ix, f] <= a
        stack += [(l, ix[kiri]), (r, ix[~kiri])]
    return out


def skor(mdl, X, potong=1000000):
    X = np.asarray(X, np.float32)
    out = np.empty(len(X))
    for a in range(0, len(X), potong):
        Xa = X[a:a + potong]
        out[a:a + potong] = mdl["bias"] + sum(nilai(s, Xa) for s in mdl["pohon"])
    return out


def prediksi(mdl, X):
    return 1 / (1 + np.exp(-skor(mdl, X)))


# ---------------------------------------------------------------- regresi logistik kecil (IRLS)
def logistik(X, y, w=None, l2=1e-6, iterasi=25):
    """-> b (b[0] intersep). X (n x k) numpy."""
    X = np.column_stack([np.ones(len(X)), np.asarray(X, np.float64)])
    y = np.asarray(y, np.float64)
    w = np.ones(len(y)) if w is None else np.asarray(w, np.float64)
    b = np.zeros(X.shape[1])
    for _ in range(iterasi):
        p = 1 / (1 + np.exp(-np.clip(X @ b, -35, 35)))
        g = X.T @ (w * (y - p)) - l2 * b
        Hm = (X * (w * p * (1 - p))[:, None]).T @ X + l2 * np.eye(len(b))
        d = np.linalg.solve(Hm, g)
        b += d
        if np.abs(d).max() < 1e-8:
            break
    return b


def pred_logistik(b, X):
    X = np.column_stack([np.ones(len(X)), np.asarray(X, np.float64)])
    return 1 / (1 + np.exp(-np.clip(X @ b, -35, 35)))


# ---------------------------------------------------------------- metrik
def auc(p, y):
    """AUC dengan seri dihitung setengah (= gbdt.auc tanpa bobot)."""
    p = np.asarray(p, np.float64)
    y = np.asarray(y).astype(bool)
    npos, nneg = int(y.sum()), int((~y).sum())
    if not npos or not nneg:
        return None
    o = np.argsort(p, kind="mergesort")
    ps = p[o]
    ys = y[o]
    # peringkat rata-rata untuk seri
    batas = np.flatnonzero(np.diff(ps)) + 1
    awal = np.concatenate([[0], batas])
    akhir = np.concatenate([batas, [len(ps)]])
    rank = np.empty(len(ps))
    rk = (awal + akhir + 1) / 2.0
    rank[:] = np.repeat(rk, akhir - awal)
    return float((rank[ys].sum() - npos * (npos + 1) / 2) / (npos * nneg))


def kemiringan(p, y):
    """Kemiringan kalibrasi: b di logit P(y) = a + b logit(p)."""
    p = np.clip(np.asarray(p, np.float64), 1e-7, 1 - 1e-7)
    return float(logistik(np.log(p / (1 - p))[:, None], y)[1])


if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["uji"]:
        import os, random
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import gbdt as G
        rng = np.random.default_rng(3)
        X = rng.uniform(-2, 2, (20000, 3)).astype(np.float32)
        z = 2 * X[:, 0] - X[:, 1] + 1.5 * (X[:, 2] > 0) * (X[:, 0] > 0)
        y = (rng.random(20000) < 1 / (1 + np.exp(-z))).astype(int)
        m = latih(X, y, np.ones(len(y)), pohon=60, dalam=4, lr=.1, min_h=5)
        p = prediksi(m, X)
        # format pohon = gbdt.py: evaluator stdlib memberi peluang yang sama
        for i in range(0, 20000, 997):
            assert abs(G.prediksi_gbdt(m, [float(v) for v in X[i]]) - p[i]) < 1e-9
        a = auc(p, y)
        assert a > .8 and abs(a - G.auc(list(p), list(y))) < 1e-12, a
        assert auc([1, 0], [1, 0]) == 1 and auc([0, 1], [1, 0]) == 0 and auc([.5, .5], [1, 0]) == .5
        assert abs(auc([.1, .4, .4, .8, .3], [0, 1, 0, 1, 0]) - G.auc([.1, .4, .4, .8, .3], [0, 1, 0, 1, 0])) < 1e-12
        # bobot: negatif disampel 10% dengan bobot 10 memberi peluang yang sama rata-ratanya (terkalibrasi)
        keep = (y == 1) | (rng.random(len(y)) < .1)
        m2 = latih(X[keep], y[keep], np.where(y[keep] == 1, 1.0, 10.0), pohon=60, dalam=4, lr=.1, min_h=5)
        assert abs(prediksi(m2, X).mean() - y.mean()) < .02, (prediksi(m2, X).mean(), y.mean())
        b = logistik(X[:, :2], y)
        assert b[1] > 0 and b[2] < 0
        # kemiringan: peluang benar -> ~1; peluang dibesar-besarkan (logit x2) -> ~0,5
        pt = 1 / (1 + np.exp(-z))
        yt = (rng.random(len(z)) < pt).astype(int)
        assert abs(kemiringan(pt, yt) - 1) < .1 and abs(kemiringan(1 / (1 + np.exp(-2 * z)), yt) - .5) < .07
        # interaksi XOR
        X2 = rng.uniform(-1, 1, (5000, 2)).astype(np.float32)
        y2 = ((X2[:, 0] > 0) != (X2[:, 1] > 0)).astype(int)
        assert auc(prediksi(latih(X2, y2, np.ones(5000), pohon=30, dalam=3, lr=.3, min_h=1), X2), y2) > .95
        print("ok")
