"""Statistik murni untuk R = H x V / C (Perka BNPB 2/2012): z-skor, regresi Poisson / binomial negatif (IRLS buatan tangan),
deviance, bootstrap gugus, Spearman. Stdlib saja; tak membaca berkas apa pun, jadi tiap fungsi bisa diuji lewat --cek.

Model hitung (log-link):  E[y_i] = mu_i = exp(offset_i + x_i . beta),   Var[y_i] = mu_i + alpha mu_i^2   (NB2; alpha = 0 -> Poisson)
  IRLS:  W_i = mu_i / (1 + alpha mu_i),  z_i = eta_i - offset_i + (y_i - mu_i) / mu_i,  beta = (X'WX + ridge)^-1 X'Wz
  alpha dicari dengan maksimum-kemungkinan satu dimensi (golden section di log alpha) bergantian dengan IRLS, 8 putaran.
  Pilih NB bila LR = 2 (ll_NB - ll_Poisson) > 2,71 (batas chi-kuadrat 1 derajat, satu sisi 5%, karena alpha >= 0 ada di tepi).

Pakai:  python3 scripts/bnpb/hvc_stat.py --cek
"""
import math, random, sys

LR_NB = 2.71   # chi2(1) satu sisi 5%: alpha = 0 di tepi parameter


def zskor(xs):
    """Daftar angka/None -> z (populasi). None tetap None; sd 0 -> semua 0."""
    v = [x for x in xs if x is not None]
    if len(v) < 2:
        return [0.0 if x is not None else None for x in xs]
    m = sum(v) / len(v)
    sd = math.sqrt(sum((x - m) ** 2 for x in v) / len(v))
    return [None if x is None else ((x - m) / sd if sd > 0 else 0.0) for x in xs]


def rerata_ada(baris, minimum=1):
    """Rata-rata komponen yang ada (bukan None); kurang dari `minimum` komponen -> None. Komponen hilang bukan 0."""
    v = [x for x in baris if x is not None]
    return sum(v) / len(v) if len(v) >= minimum else None


def cdf_normal(z):
    return 0.5 * (1 + math.erf(z / math.sqrt(2)))


def peringkat(xs):
    """Peringkat 1..n, seri = rata-rata peringkat (untuk Spearman)."""
    urut = sorted(range(len(xs)), key=lambda i: xs[i])
    r = [0.0] * len(xs)
    i = 0
    while i < len(urut):
        j = i
        while j + 1 < len(urut) and xs[urut[j + 1]] == xs[urut[i]]:
            j += 1
        for k in range(i, j + 1):
            r[urut[k]] = (i + j) / 2 + 1
        i = j + 1
    return r


def spearman(a, b):
    ra, rb = peringkat(a), peringkat(b)
    ma, mb = sum(ra) / len(ra), sum(rb) / len(rb)
    sa = math.sqrt(sum((x - ma) ** 2 for x in ra))
    sb = math.sqrt(sum((x - mb) ** 2 for x in rb))
    return None if sa == 0 or sb == 0 else sum((x - ma) * (y - mb) for x, y in zip(ra, rb)) / (sa * sb)


# ------------------------------------------------------------------ aljabar linear kecil (k <= ~15)
def selesaikan(A, b, ridge=1e-8):
    """A beta = b dengan eliminasi Gauss berpivot; ridge kecil di diagonal selain kolom pertama (intersep)."""
    n = len(A)
    M = [A[i][:] + [b[i]] for i in range(n)]
    for i in range(1, n):
        M[i][i] += ridge
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        if abs(M[p][c]) < 1e-300:
            raise ValueError("matriks singular: ada kolom fitur yang konstan atau kembar")
        M[c], M[p] = M[p], M[c]
        for r in range(c + 1, n):
            f = M[r][c] / M[c][c]
            for k in range(c, n + 1):
                M[r][k] -= f * M[c][k]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (M[i][n] - sum(M[i][k] * x[k] for k in range(i + 1, n))) / M[i][i]
    return x


def invers(A, ridge=1e-8):
    n = len(A)
    cols = [selesaikan(A, [1.0 if i == j else 0.0 for i in range(n)], ridge) for j in range(n)]
    return [[cols[j][i] for j in range(n)] for i in range(n)]


def xtwx(X, w):
    k = len(X[0])
    A = [[0.0] * k for _ in range(k)]
    for xi, wi in zip(X, w):
        for a in range(k):
            wa = wi * xi[a]
            if wa:
                for b in range(a, k):
                    A[a][b] += wa * xi[b]
    for a in range(k):
        for b in range(a):
            A[a][b] = A[b][a]
    return A


# ------------------------------------------------------------------ kemungkinan dan deviance
def ll_baris(y, mu, alpha):
    """Log-kemungkinan NB2 per baris; alpha <= 1e-10 jatuh ke Poisson."""
    if alpha <= 1e-10:
        return [yi * math.log(mi) - mi - math.lgamma(yi + 1) for yi, mi in zip(y, mu)]
    r = 1.0 / alpha
    return [math.lgamma(yi + r) - math.lgamma(r) - math.lgamma(yi + 1) + yi * math.log(alpha * mi / (1 + alpha * mi)) - r * math.log(1 + alpha * mi)
            for yi, mi in zip(y, mu)]


def ll_nb(y, mu, alpha):
    return sum(ll_baris(y, mu, alpha))


def deviance_baris(y, mu, alpha):
    """Deviance satuan tiap baris (>= 0). Poisson bila alpha <= 1e-10."""
    out = []
    for yi, mi in zip(y, mu):
        t = yi * math.log(yi / mi) if yi > 0 else 0.0
        if alpha <= 1e-10:
            d = 2 * (t - (yi - mi))
        else:
            d = 2 * (t - (yi + 1 / alpha) * math.log((1 + alpha * yi) / (1 + alpha * mi)))
        out.append(max(d, 0.0))
    return out


def _irls(X, y, off, alpha, beta=None, putaran=60):
    n, k = len(X), len(X[0])
    if beta is None:
        rata = max(sum(yi / math.exp(o) for yi, o in zip(y, off)) / n, 1e-3)
        beta = [math.log(rata)] + [0.0] * (k - 1)
    for _ in range(putaran):
        eta = [min(max(sum(b * x for b, x in zip(beta, xi)) + o, -30), 30) for xi, o in zip(X, off)]
        mu = [math.exp(e) for e in eta]
        w = [m / (1 + alpha * m) for m in mu]
        z = [(e - o) + (yi - m) / m for e, o, yi, m in zip(eta, off, y, mu)]
        A = xtwx(X, w)
        b = [sum(wi * xi[a] * zi for wi, xi, zi in zip(w, X, z)) for a in range(k)]
        baru = selesaikan(A, b)
        if max(abs(p - q) for p, q in zip(baru, beta)) < 1e-8:
            beta = baru
            break
        beta = baru
    eta = [min(max(sum(b * x for b, x in zip(beta, xi)) + o, -30), 30) for xi, o in zip(X, off)]
    mu = [math.exp(e) for e in eta]
    return beta, mu


def _alpha_ml(y, mu):
    lo, hi = math.log(1e-6), math.log(1e3)
    g = (math.sqrt(5) - 1) / 2
    f = lambda la: ll_nb(y, mu, math.exp(la))
    a, b = lo, hi
    c, d = b - g * (b - a), a + g * (b - a)
    fc, fd = f(c), f(d)
    for _ in range(60):
        if fc > fd:
            b, d, fd = d, c, fc
            c = b - g * (b - a)
            fc = f(c)
        else:
            a, c, fc = c, d, fd
            d = a + g * (b - a)
            fd = f(d)
    return math.exp((a + b) / 2)


def cocok(X, y, off, keluarga="auto"):
    """-> dict(beta, se, alpha, keluarga, ll, ll_poisson, lr, pearson_disp, n).
    keluarga: 'poisson' | 'nb' | 'auto' (NB bila LR > LR_NB). X baris pertama kolom 1 = intersep."""
    n, k = len(X), len(X[0])
    beta, mu = _irls(X, y, off, 0.0)
    pearson = sum((yi - m) ** 2 / m for yi, m in zip(y, mu)) / max(n - k, 1)
    ll_p = ll_nb(y, mu, 0.0)
    alpha, ll_n = 0.0, ll_p
    b_nb, m_nb = beta, mu
    if keluarga != "poisson":
        alpha = _alpha_ml(y, mu)
        for _ in range(8):
            b_nb, m_nb = _irls(X, y, off, alpha, b_nb)
            baru = _alpha_ml(y, m_nb)
            if abs(math.log(baru / alpha)) < 1e-4:
                alpha = baru
                break
            alpha = baru
        ll_n = ll_nb(y, m_nb, alpha)
    lr = 2 * (ll_n - ll_p)
    pakai_nb = keluarga == "nb" or (keluarga == "auto" and lr > LR_NB)
    if not pakai_nb:
        alpha, b_pakai, m_pakai, ll_pakai = 0.0, beta, mu, ll_p
    else:
        b_pakai, m_pakai, ll_pakai = b_nb, m_nb, ll_n
    w = [m / (1 + alpha * m) for m in m_pakai]
    cov = invers(xtwx(X, w))
    se = [math.sqrt(max(cov[i][i], 0.0)) for i in range(k)]
    return {"beta": b_pakai, "se": se, "alpha": alpha, "keluarga": "nb" if pakai_nb else "poisson", "ll": ll_pakai, "ll_poisson": ll_p,
            "lr": lr, "pearson_disp": pearson, "n": n}


def prediksi(X, off, beta):
    return [math.exp(min(max(sum(b * x for b, x in zip(beta, xi)) + o, -30), 30)) for xi, o in zip(X, off)]


def bootstrap_gugus(selisih, gugus, n_boot=1000, seed=20261029):
    """Selisih per baris + id gugus (kabupaten) -> (rata-rata, batas bawah 95%, batas atas 95%) lewat resampling GUGUS
    (baris sekabupaten saling berkorelasi, jadi resampling baris akan terlalu optimis)."""
    per = {}
    for s, g in zip(selisih, gugus):
        t = per.setdefault(g, [0.0, 0])
        t[0] += s
        t[1] += 1
    kunci = list(per)
    tot_n = sum(per[g][1] for g in kunci)
    rng = random.Random(seed)
    rata = []
    for _ in range(n_boot):
        s = c = 0
        for _ in kunci:
            t = per[kunci[rng.randrange(len(kunci))]]
            s += t[0]
            c += t[1]
        rata.append(s / c)
    rata.sort()
    return sum(per[g][0] for g in kunci) / tot_n, rata[int(0.025 * n_boot)], rata[int(0.975 * n_boot) - 1]


# ------------------------------------------------------------------ self-check
def _cek():
    # z-skor
    z = zskor([1, 2, 3, None])
    assert z[3] is None and abs(sum(z[:3])) < 1e-12 and abs(z[0] + 1.2247448714) < 1e-6, z
    assert zskor([5, 5, 5]) == [0.0, 0.0, 0.0] and zskor([7]) == [0.0] and zskor([None, None]) == [None, None]
    assert rerata_ada([1, None, 3]) == 2 and rerata_ada([None, None]) is None and rerata_ada([1, None], minimum=2) is None
    assert abs(cdf_normal(0) - 0.5) < 1e-12 and abs(cdf_normal(1.96) - 0.975) < 1e-3
    # peringkat dan Spearman, seri dirata-ratakan
    assert peringkat([10, 20, 20, 30]) == [1.0, 2.5, 2.5, 4.0]
    assert abs(spearman([1, 2, 3, 4], [10, 20, 30, 40]) - 1) < 1e-12 and abs(spearman([1, 2, 3, 4], [4, 3, 2, 1]) + 1) < 1e-12
    assert spearman([1, 1, 1], [1, 2, 3]) is None
    # aljabar: A x = b
    x = selesaikan([[2.0, 1.0], [1.0, 3.0]], [3.0, 5.0], ridge=0)
    assert abs(x[0] - 0.8) < 1e-12 and abs(x[1] - 1.4) < 1e-12, x
    I = invers([[2.0, 1.0], [1.0, 3.0]], ridge=0)
    assert abs(I[0][0] - 0.6) < 1e-12 and abs(I[0][1] + 0.2) < 1e-12
    try:
        selesaikan([[1.0, 1.0], [1.0, 1.0]], [1.0, 1.0], ridge=0)
        raise AssertionError("matriks singular harus ditolak")
    except ValueError:
        pass
    # deviance: nol saat prediksi pas; Poisson dan NB sama pada alpha -> 0; NB tak meledak
    assert deviance_baris([3.0], [3.0], 0.0) == [0.0] and all(abs(d) < 1e-9 for d in deviance_baris([0.0, 4.0], [1e-12, 4.0], 0.7))
    dp, dn = deviance_baris([2.0, 0.0, 5.0], [1.0, 1.0, 3.0], 0.0), deviance_baris([2.0, 0.0, 5.0], [1.0, 1.0, 3.0], 1e-6)
    assert all(abs(a - b) < 1e-3 for a, b in zip(dp, dn)), (dp, dn)
    # log-kemungkinan NB -> Poisson saat alpha kecil; nilai NB dihitung tangan: y=0, mu=1, alpha=1 -> ln(1/(1+1)) = -ln 2
    assert abs(ll_nb([2.0], [1.5], 1e-9) - ll_nb([2.0], [1.5], 0.0)) < 1e-4
    assert abs(ll_nb([0.0], [1.0], 1.0) + math.log(2)) < 1e-12
    assert abs(sum(ll_baris([0.0, 2.0], [1.0, 1.5], 0.4)) - ll_nb([0.0, 2.0], [1.0, 1.5], 0.4)) < 1e-12
    # NB menjumlah ke 1: sum_y P(y | mu=2, alpha=0,5) = 1
    assert abs(sum(math.exp(ll_nb([float(k)], [2.0], 0.5)) for k in range(400)) - 1) < 1e-6
    # IRLS Poisson memulihkan koefisien (data tanpa derau: y = mu bulat -> aproksimasi lewat data besar ber-seed)
    rng = random.Random(7)

    def pois(m):
        L, k, p = math.exp(-m), 0, 1.0
        while True:
            p *= rng.random()
            if p <= L:
                return k
            k += 1
    n = 4000
    X = [[1.0, rng.gauss(0, 1), rng.gauss(0, 1)] for _ in range(n)]
    off = [math.log(rng.choice([1, 2, 3])) for _ in range(n)]
    benar = [0.3, 0.5, -0.4]
    y = [float(pois(math.exp(sum(b * x for b, x in zip(benar, xi)) + o))) for xi, o in zip(X, off)]
    m = cocok(X, y, off)
    assert m["keluarga"] == "poisson", (m["keluarga"], m["lr"])
    assert all(abs(b - t) < 4 * s + 0.02 for b, t, s in zip(m["beta"], benar, m["se"])), (m["beta"], m["se"])
    # data NB (gamma-Poisson, alpha = 0,8): harus memilih NB dan alpha pulih
    def nbd(m, a):
        g = rng.gammavariate(1 / a, a * m)
        return pois(g)
    y2 = [float(nbd(math.exp(sum(b * x for b, x in zip(benar, xi)) + o), 0.8)) for xi, o in zip(X, off)]
    m2 = cocok(X, y2, off)
    assert m2["keluarga"] == "nb" and 0.6 < m2["alpha"] < 1.05, (m2["keluarga"], m2["alpha"], m2["lr"])
    assert all(abs(b - t) < 4 * s + 0.03 for b, t, s in zip(m2["beta"], benar, m2["se"])), (m2["beta"], m2["se"])
    assert m2["pearson_disp"] > 1.5      # Poisson memang melebar pada data ini
    # prediksi cocok dengan rumus
    p = prediksi([[1.0, 2.0]], [math.log(3)], [0.1, 0.2])
    assert abs(p[0] - 3 * math.exp(0.5)) < 1e-12
    # bootstrap gugus: selisih konstan 2 -> selang sempit di 2; selisih acak nol-rata -> selang melingkupi 0
    r, lo, hi = bootstrap_gugus([2.0] * 40, [i // 4 for i in range(40)], 200)
    assert r == 2.0 and lo == 2.0 and hi == 2.0
    r, lo, hi = bootstrap_gugus([(-1) ** i * (i % 5 + 1) for i in range(200)], [i // 4 for i in range(200)], 400)
    assert lo < 0 < hi, (lo, hi)
    print("hvc_stat: --cek hijau")


if __name__ == "__main__":
    _cek() if sys.argv[1:] == ["--cek"] else print(__doc__)
