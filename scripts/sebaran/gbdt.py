"""Model biner stdlib: regresi logistik (Newton, L2) dan gradient boosting pohon dangkal (histogram), plus metrik.

Pohon disimpan sebagai daftar simpul datar: [fitur, ambang, kiri, kanan] (x[fitur] <= ambang -> kiri) atau [nilai] (daun),
jadi bisa dievaluasi apa adanya di peramban (public/sebaran_model.js). Skor akhir = bias + sum(daun); p = 1/(1+e^-skor).
Tanpa numpy (tidak terpasang di mesin ini): kolom fitur dibin <= 32 kuantil sebagai bytearray per fitur.
"""
import math, random


def sigmoid(z):
    return 1 / (1 + math.exp(-z)) if z > -35 else 1e-15


# ---------------- regresi logistik ----------------
def latih_lr(X, y, w, l2=1.0, iterasi=12):
    """X: daftar baris (list float). -> {mu, sd, b} dengan p = sigmoid(b0 + sum b_j * (x_j - mu_j)/sd_j)."""
    n, m = len(X), len(X[0])
    sw = sum(w)
    mu = [sum(w[i] * X[i][j] for i in range(n)) / sw for j in range(m)]
    sd = [math.sqrt(sum(w[i] * (X[i][j] - mu[j]) ** 2 for i in range(n)) / sw) or 1.0 for j in range(m)]
    Z = [[1.0] + [(r[j] - mu[j]) / sd[j] for j in range(m)] for r in X]
    b = [0.0] * (m + 1)
    for _ in range(iterasi):
        H = [[0.0] * (m + 1) for _ in range(m + 1)]
        g = [0.0] * (m + 1)
        for z, yi, wi in zip(Z, y, w):
            s = sum(bj * zj for bj, zj in zip(b, z))
            p = sigmoid(s)
            r = wi * (yi - p)
            q = wi * p * (1 - p)
            for a in range(m + 1):
                za = z[a]
                g[a] += r * za
                qa = q * za
                Ha = H[a]
                for c in range(a, m + 1):
                    Ha[c] += qa * z[c]
        for a in range(m + 1):
            for c in range(a):
                H[a][c] = H[c][a]
            if a:
                H[a][a] += l2
                g[a] -= l2 * b[a]
        d = selesaikan(H, g)
        b = [bj + dj for bj, dj in zip(b, d)]
        if max(abs(x) for x in d) < 1e-6:
            break
    return {"mu": mu, "sd": sd, "b": b, "H": H}


def selesaikan(A, v):
    n = len(v)
    M = [row[:] + [v[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        if abs(M[c][c]) < 1e-12:
            continue
        for r in range(n):
            if r != c and M[r][c]:
                f = M[r][c] / M[c][c]
                M[r] = [a - f * b for a, b in zip(M[r], M[c])]
    return [M[i][n] / M[i][i] if abs(M[i][i]) > 1e-12 else 0.0 for i in range(n)]


def balik(A):
    n = len(A)
    return [selesaikan(A, [1.0 if i == j else 0.0 for i in range(n)]) for j in range(n)]


def prediksi_lr(mdl, x):
    return sigmoid(mdl["b"][0] + sum(b * (xi - m) / s for b, xi, m, s in zip(mdl["b"][1:], x, mdl["mu"], mdl["sd"])))


# ---------------- gradient boosting ----------------
def tepi_bin(X, nb=32, sampel=50000, seed=1):
    rnd = random.Random(seed)
    idx = range(len(X)) if len(X) <= sampel else rnd.sample(range(len(X)), sampel)
    import bisect
    tepi = []
    for j in range(len(X[0])):
        v = sorted(X[i][j] for i in idx)
        e = set()
        for q in range(1, nb):
            a = v[int(len(v) * q / nb)]
            k = bisect.bisect_right(v, a)
            if k < len(v):
                e.add((a + v[k]) / 2)  # titik tengah ke nilai berikutnya: tahan galat pembulatan float32/JS
        tepi.append(sorted(e)[:nb - 1])
    return tepi


def binkan(X, tepi):
    import bisect
    kol = []
    for j, e in enumerate(tepi):
        kol.append(bytearray(bisect.bisect_left(e, r[j]) for r in X))
    return kol


def latih_gbdt(X, y, w, pohon=120, dalam=4, lr=0.1, l2=1.0, min_h=5.0, sub=0.5, seed=1, fitur_aktif=None, log=None):
    n, m = len(X), len(X[0])
    aktif = list(range(m)) if fitur_aktif is None else list(fitur_aktif)
    tepi = tepi_bin(X)
    kol = binkan(X, tepi)
    sw = sum(w)
    p0 = sum(wi * yi for wi, yi in zip(w, y)) / sw
    bias = math.log(p0 / (1 - p0))
    F = [bias] * n
    rnd = random.Random(seed)
    hutan = []
    for t in range(pohon):
        g = [0.0] * n
        h = [0.0] * n
        for i in range(n):
            p = sigmoid(F[i])
            g[i] = w[i] * (p - y[i])
            h[i] = w[i] * p * (1 - p)
        idx = [i for i in range(n) if rnd.random() < sub]
        simpul = []

        def histo(ix):
            H = {}
            for j in aktif:
                c = kol[j]
                nb = len(tepi[j]) + 1
                hg, hh = [0.0] * nb, [0.0] * nb
                for i in ix:
                    b = c[i]
                    hg[b] += g[i]
                    hh[b] += h[i]
                H[j] = (hg, hh)
            return H

        def bangun(ix, d, H):
            G = sum(g[i] for i in ix)
            Hs = sum(h[i] for i in ix)
            no = len(simpul)
            simpul.append(None)
            best = None
            if d < dalam and Hs >= 2 * min_h:
                dasar = G * G / (Hs + l2)
                for j in aktif:
                    hg, hh = H[j]
                    gl = hl = 0.0
                    for b in range(len(hg) - 1):
                        gl += hg[b]
                        hl += hh[b]
                        gr, hr = G - gl, Hs - hl
                        if hl < min_h or hr < min_h:
                            continue
                        gain = gl * gl / (hl + l2) + gr * gr / (hr + l2) - dasar
                        if best is None or gain > best[0]:
                            best = (gain, j, b)
            if best is None or best[0] <= 1e-9:
                simpul[no] = [round(-G / (Hs + l2) * lr, 6)]
                return no
            _, j, b = best
            c = kol[j]
            ki = [i for i in ix if c[i] <= b]
            ka = [i for i in ix if c[i] > b]
            # histogram anak kecil dihitung, anak besar = induk - kecil
            kecil, besar = (ki, ka) if len(ki) <= len(ka) else (ka, ki)
            Hk = histo(kecil) if d + 1 < dalam else None
            Hb = {jj: ([a - bb for a, bb in zip(H[jj][0], Hk[jj][0])], [a - bb for a, bb in zip(H[jj][1], Hk[jj][1])]) for jj in aktif} if Hk else None
            Hl, Hr = (Hk, Hb) if kecil is ki else (Hb, Hk)
            simpul[no] = [j, tepi[j][b], None, None]
            simpul[no][2] = bangun(ki, d + 1, Hl)
            simpul[no][3] = bangun(ka, d + 1, Hr)
            return no

        bangun(idx, 0, histo(idx))
        hutan.append(simpul)
        for i in range(n):
            F[i] += nilai_pohon(simpul, X[i])
        if log and (t + 1) % 20 == 0:
            log(f"    pohon {t + 1}/{pohon}")
    return {"bias": bias, "pohon": hutan}


def nilai_pohon(s, x):
    k = 0
    while len(s[k]) > 1:
        f, a, l, r = s[k]
        k = l if x[f] <= a else r
    return s[k][0]


def prediksi_gbdt(mdl, x):
    return sigmoid(mdl["bias"] + sum(nilai_pohon(s, x) for s in mdl["pohon"]))


# ---------------- metrik ----------------
def auc(p, y, w=None):
    w = w or [1.0] * len(p)
    o = sorted(zip(p, y, w))
    pos = sum(wi for _, yi, wi in o if yi)
    neg = sum(wi for _, yi, wi in o if not yi)
    if not pos or not neg:
        return None
    s = cum_neg = 0.0
    i = 0
    while i < len(o):
        j = i
        tp = tn = 0.0
        while j < len(o) and o[j][0] == o[i][0]:
            if o[j][1]:
                tp += o[j][2]
            else:
                tn += o[j][2]
            j += 1
        s += tp * (cum_neg + tn / 2)
        cum_neg += tn
        i = j
    return s / (pos * neg)


def logloss(p, y, w=None):
    w = w or [1.0] * len(p)
    e = 1e-12
    return -sum(wi * (yi * math.log(max(pi, e)) + (1 - yi) * math.log(max(1 - pi, e))) for pi, yi, wi in zip(p, y, w)) / sum(w)


def brier(p, y, w=None):
    w = w or [1.0] * len(p)
    return sum(wi * (pi - yi) ** 2 for pi, yi, wi in zip(p, y, w)) / sum(w)


def reliabilitas(p, y, w=None, bins=10):
    w = w or [1.0] * len(p)
    b = [[0.0, 0.0, 0.0] for _ in range(bins)]
    for pi, yi, wi in zip(p, y, w):
        k = min(bins - 1, int(pi * bins))
        b[k][0] += wi * pi
        b[k][1] += wi * yi
        b[k][2] += wi
    return [[round(a / c, 4), round(o / c, 4), round(c)] if c else None for a, o, c in b]


if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["uji"]:
        rnd = random.Random(3)
        X = [[rnd.uniform(-2, 2), rnd.uniform(-2, 2), rnd.uniform(0, 1)] for _ in range(3000)]
        y = [1 if rnd.random() < sigmoid(2 * x[0] - 1 * x[1]) else 0 for x in X]
        w = [1.0] * len(X)
        lr_ = latih_lr(X, y, w)
        assert lr_["b"][1] > 0 and lr_["b"][2] < 0 and abs(lr_["b"][3]) < 0.3, lr_["b"]
        g = latih_gbdt(X, y, w, pohon=40, dalam=3)
        p = [prediksi_gbdt(g, x) for x in X]
        assert all(0 <= q <= 1 for q in p)
        assert auc(p, y) > 0.75 and auc([prediksi_lr(lr_, x) for x in X], y) > 0.75
        assert auc([1, 0], [1, 0]) == 1 and auc([0, 1], [1, 0]) == 0 and auc([.5, .5], [1, 0]) == .5
        # interaksi XOR: GBDT harus mengalahkan LR
        X2 = [[rnd.uniform(-1, 1), rnd.uniform(-1, 1)] for _ in range(3000)]
        y2 = [1 if (a > 0) != (b > 0) else 0 for a, b in X2]
        g2 = latih_gbdt(X2, y2, [1.0] * 3000, pohon=30, dalam=3)
        assert auc([prediksi_gbdt(g2, x) for x in X2], y2) > .9
        print("ok")
