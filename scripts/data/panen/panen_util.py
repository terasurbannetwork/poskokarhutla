"""Alat bersama panen data (stdlib): HTTP jujur + retry, AUC, regresi logistik, Brier.
Self-check: python3 scripts/data/panen/panen_util.py"""
import json, math, os, time, urllib.request, urllib.error

UA = "PantauBencana-panen/1.0 (+https://github.com/terasurbannetwork/poskokarhutla; riset kebencanaan nirlaba)"


def http(url, tries=4, timeout=60, headers=None, data=None):
    """GET/POST jujur (UA proyek), retry 4x backoff 2,4,8,16 dtk. Tidak memalsukan Origin/Referer.
    401/403/404 tidak didesak (penolakan = berhenti)."""
    h = {"User-Agent": UA}
    h.update(headers or {})
    err = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=h, data=data)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            err = e
            if e.code in (401, 403, 404):
                raise
        except Exception as e:
            err = e
        time.sleep(2 ** (i + 1))
    raise err


def http_json(url, **kw):
    return json.loads(http(url, **kw))


def auc(y, s):
    """AUC peringkat (Mann-Whitney), ties = rata-rata peringkat."""
    pairs = sorted(zip(s, y))
    n = len(pairs); r = [0.0] * n; i = 0
    while i < n:
        j = i
        while j + 1 < n and pairs[j + 1][0] == pairs[i][0]:
            j += 1
        for k in range(i, j + 1):
            r[k] = (i + j) / 2 + 1
        i = j + 1
    npos = sum(1 for _, v in pairs if v == 1); nneg = n - npos
    if npos == 0 or nneg == 0:
        return None
    sr = sum(r[k] for k in range(n) if pairs[k][1] == 1)
    return (sr - npos * (npos + 1) / 2) / (npos * nneg)


def brier(y, p):
    return sum((a - b) ** 2 for a, b in zip(y, p)) / len(y)


def _sig(z):
    return 1 / (1 + math.exp(-max(-30, min(30, z))))


def solve(A, b):
    n = len(b); M = [A[i][:] + [b[i]] for i in range(n)]
    for i in range(n):
        p = max(range(i, n), key=lambda r: abs(M[r][i])); M[i], M[p] = M[p], M[i]
        piv = M[i][i] or 1e-12
        for j in range(i, n + 1):
            M[i][j] /= piv
        for r in range(n):
            if r != i:
                f = M[r][i]
                for j in range(i, n + 1):
                    M[r][j] -= f * M[i][j]
    return [M[i][n] for i in range(n)]


def logit_fit(X, y, l2=1.0, it=25):
    """Regresi logistik L2 via Newton (IRLS), fitur distandarkan."""
    n = len(X); m0 = len(X[0]); m = m0 + 1
    mu = [sum(r[j] for r in X) / n for j in range(m0)]
    sd = [(sum((r[j] - mu[j]) ** 2 for r in X) / n) ** .5 or 1.0 for j in range(m0)]
    Z = [[1.0] + [(r[j] - mu[j]) / sd[j] for j in range(m0)] for r in X]
    w = [0.0] * m
    for _ in range(it):
        g = [0.0] * m; H = [[0.0] * m for _ in range(m)]
        for z, t in zip(Z, y):
            p = _sig(sum(a * b for a, b in zip(w, z))); d = p * (1 - p)
            for a in range(m):
                g[a] += (p - t) * z[a]
                for b in range(m):
                    H[a][b] += d * z[a] * z[b]
        for a in range(1, m):
            g[a] += l2 * w[a]; H[a][a] += l2
        step = solve(H, g)
        w = [a - b for a, b in zip(w, step)]
        if max(abs(s) for s in step) < 1e-6:
            break
    return {"w": w, "mu": mu, "sd": sd}


def logit_pred(mod, X):
    w, mu, sd = mod["w"], mod["mu"], mod["sd"]
    return [_sig(w[0] + sum(w[j + 1] * (r[j] - mu[j]) / sd[j] for j in range(len(mu)))) for r in X]


def tulis(path, obj, maks_mb=2.0):
    s = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    assert len(s) < maks_mb * 1e6, f"{path} {len(s)/1e6:.2f} MB > {maks_mb} MB"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "w").write(s)
    return len(s)


if __name__ == "__main__":
    import random
    assert abs(auc([0, 0, 1, 1], [.1, .2, .3, .4]) - 1) < 1e-9
    assert abs(auc([0, 1, 0, 1], [.5, .5, .5, .5]) - .5) < 1e-9
    random.seed(1)
    X = [[random.gauss(0, 1)] for _ in range(600)]
    y = [1 if random.random() < _sig(2 * x[0]) else 0 for x in X]
    m = logit_fit(X, y); assert m["w"][1] > 1.0
    assert auc(y, logit_pred(m, X)) > .8
    print("panen_util OK")
