"""Api tahun t -> banjir tahun t+1 per kab (lab, hipotesis). Pra-registrasi: PRAREG-API-BANJIR.md.
Python stdlib. `python3 api_banjir.py` (jalan sekali) | `python3 api_banjir.py uji` (swa-uji)
Keluaran: public/banjir/data/lab/api_banjir.json + api_banjir_ringkas.md"""
import json, math, os, random, sys
R = os.path.dirname(os.path.abspath(__file__)) + "/../.."
API = R + "/public/data/riwayat_wilayah/kab.json"
KEJ = R + "/public/banjir/data/kejadian.json"
OUT = R + "/public/banjir/data/lab/"
TH0 = 2003          # indeks pertama 'ym'
TT = list(range(2008, 2023))   # tahun api t; banjir t+1
AMBANG = 20.0; SEED = 20261125; B = 1000
ELNINO = {2009, 2015, 2019}
l1 = lambda v: math.log(1 + v)


def solve(A, b):
    n = len(b); M = [A[i][:] + [b[i]] for i in range(n)]
    for i in range(n):
        p = max(range(i, n), key=lambda r: abs(M[r][i])); M[i], M[p] = M[p], M[i]
        for r in range(n):
            if r != i:
                f = M[r][i] / M[i][i]
                M[r] = [a - f * c for a, c in zip(M[r], M[i])]
    return [M[i][n] / M[i][i] for i in range(n)]


def demean2(P):
    """P: [kab][tahun] -> dua arah (kab, tahun), panel seimbang."""
    n, T = len(P), len(P[0])
    km = [sum(r) / T for r in P]; tm = [sum(P[i][t] for i in range(n)) / n for t in range(T)]
    g = sum(km) / n
    return [[P[i][t] - km[i] - tm[t] + g for t in range(T)] for i in range(n)]


def ols(Z, Xs, idx, tsel=None):
    """Z[kab][t], Xs = list of X[kab][t]; kab terpilih idx (boleh berulang), kolom tsel. -> koefisien."""
    cols = tsel if tsel is not None else range(len(Z[0]))
    sub = lambda M: [[M[i][t] for t in cols] for i in idx]
    z = demean2(sub(Z)); xs = [demean2(sub(X)) for X in Xs]
    k = len(xs); flat = lambda M: [v for r in M for v in r]
    zf = flat(z); xf = [flat(x) for x in xs]
    A = [[sum(a * b for a, b in zip(xf[i], xf[j])) for j in range(k)] for i in range(k)]
    c = [sum(a * b for a, b in zip(xf[i], zf)) for i in range(k)]
    beta = solve(A, c)
    res = [zf[m] - sum(beta[i] * xf[i][m] for i in range(k)) for m in range(len(zf))]
    r2 = 1 - sum(e * e for e in res) / sum(v * v for v in zf)
    return beta, r2


def tersil(Z, X, idx):
    """selisih rata-rata anomali banjir: sepertiga atas minus bawah anomali api, per tahun, dirata-rata."""
    n, T = len(idx), len(Z[0])
    xa = [[X[i][t] - sum(X[i]) / T for t in range(T)] for i in idx]
    za = [[Z[i][t] - sum(Z[i]) / T for t in range(T)] for i in idx]
    s = []
    for t in range(T):
        o = sorted(range(n), key=lambda i: xa[i][t]); m = n // 3
        if m == 0: continue
        lo, hi = o[:m], o[-m:]
        s.append(sum(za[i][t] for i in hi) / m - sum(za[i][t] for i in lo) / m)
    return sum(s) / len(s)


def ci(f, n, rng):
    v = []
    for _ in range(B):
        try: v.append(f([rng.randrange(n) for _ in range(n)]))
        except ZeroDivisionError: pass
    v.sort(); return [v[int(0.025 * len(v))], v[int(0.975 * len(v)) - 1]]


def panel():
    a = json.load(open(API))["kab"]; k = json.load(open(KEJ))["kab"]
    kabs, X, Z, P, XL, XT = [], [], [], [], [], []
    for key, d in sorted(a.items()):
        if key not in k: continue
        fl = k[key].get("banjir", {}); ym = d["ym"]
        fire = lambda y: ym[y - TH0]
        if sum(fire(t) for t in TT) / len(TT) < AMBANG: continue
        if sum(fl.get(str(t + 1), 0) for t in TT) == 0: continue
        kabs.append(key)
        X.append([l1(fire(t)) for t in TT]); Z.append([l1(fl.get(str(t + 1), 0)) for t in TT])
        P.append([l1(fl.get(str(t), 0)) for t in TT]); XL.append([l1(fire(t + 2)) for t in TT])
    return kabs, X, Z, P, XL


def jalan():
    kabs, X, Z, P, XL = panel(); n = len(kabs); rng = random.Random(SEED); allk = list(range(n))
    per2 = lambda b: 2 ** b - 1
    out = {"n_kab": n, "tahun_api": [TT[0], TT[-1]], "n_pasang": n * len(TT), "proksi": "titik panas MODIS (bukan luas terbakar)"}
    def blok(Xs, j=0, tsel=None):
        b, r2 = ols(Z, Xs, allk, tsel)
        c = ci(lambda ix: ols(Z, Xs, ix, tsel)[0][j], n, rng)
        return {"beta": round(b[j], 4), "ci95": [round(c[0], 4), round(c[1], 4)], "per_penggandaan_persen": round(100 * per2(b[j]), 2), "ci95_per_penggandaan_persen": [round(100 * per2(c[0]), 2), round(100 * per2(c[1]), 2)], "r2_dalam": round(r2, 4)}
    out["M1_x_dan_p"] = blok([X, P])
    out["M1b_x_saja"] = blok([X])
    b0, r20 = ols(Z, [P], allk); out["M0_p_saja"] = {"beta_p": round(b0[0], 4), "r2_dalam": round(r20, 4)}
    out["tambahan_r2_x"] = round(out["M1_x_dan_p"]["r2_dalam"] - r20, 4)
    ts = tersil(Z, X, allk); c = ci(lambda ix: tersil(Z, X, ix), n, rng)
    out["pasangan_tahun"] = {"selisih_log": round(ts, 4), "ci95": [round(c[0], 4), round(c[1], 4)]}
    ix = {t: i for i, t in enumerate(TT)}
    el = [ix[t] for t in TT if t in ELNINO]; ot = [ix[t] for t in TT if t not in ELNINO]
    out["menurut_tahun_api"] = {"el_nino_2009_2015_2019": blok([X, P], 0, el), "lainnya": blok([X, P], 0, ot)}
    out["plasebo_api_t_plus_2"] = {"dengan_x_t": blok([XL, X, P], 0), "tanpa_x_t": blok([XL, P], 0)}
    m, pl, pt = out["M1_x_dan_p"]["ci95"], out["plasebo_api_t_plus_2"]["dengan_x_t"]["ci95"], out["pasangan_tahun"]["ci95"]
    if m[1] < 0: v = "berlawanan"
    elif m[0] <= 0: v = "tidak terbukti"
    elif pt[0] > 0 and pl[0] <= 0 <= pl[1]: v = "didukung"
    else: v = "tertahan (kemungkinan pembaur iklim)"
    out["vonis"] = v
    return out


def ringkas(o):
    m = o["M1_x_dan_p"]; pl = o["plasebo_api_t_plus_2"]["dengan_x_t"]; pt = o["pasangan_tahun"]
    f = lambda x: str(x).replace(".", ",")
    return f"""# Api tahun t dan banjir tahun t+1 (lab, hipotesis)

Vonis menurut aturan yang dikunci sebelum hasil: **{o['vonis']}**.

Yang diukur: {o['n_kab']} kabupaten/kota yang tiap tahun punya cukup titik panas (rata-rata 20 titik MODIS atau lebih, 2008-2022), {o['n_pasang']} pasangan kab-tahun. Paparan api diwakili jumlah titik panas, bukan luas terbakar, karena luas terbakar per kab tidak tersedia. Tiap kab dibandingkan dengan dirinya sendiri di tahun lain dan dengan kab lain di tahun yang sama.

- Satu penggandaan titik panas di suatu kab diikuti perubahan jumlah kejadian banjir tahun berikutnya sebesar {f(m['per_penggandaan_persen'])} persen (rentang 95 persen: {f(m['ci95_per_penggandaan_persen'][0])} sampai {f(m['ci95_per_penggandaan_persen'][1])}), sesudah memperhitungkan riwayat banjir kab itu.
- Selisih anomali banjir antara sepertiga kab paling banyak api dan sepertiga paling sedikit pada tahun yang sama: {f(pt['selisih_log'])} (rentang {f(pt['ci95'][0])} sampai {f(pt['ci95'][1])}), dalam log.
- Plasebo, api dua tahun sesudahnya terhadap banjir tahun t+1: koefisien {f(pl['beta'])} (rentang {f(pl['ci95'][0])} sampai {f(pl['ci95'][1])}). Bila plasebo ikut berbeda dari nol, polanya lebih mungkin dari iklim yang sama (misalnya tahun kering disusul tahun basah) daripada dari api.
- Tambahan penjelasan variasi banjir dalam kab oleh api: {f(o['tambahan_r2_x'])} dari R2 dalam-kab.

Batas: ini hubungan, bukan sebab. Titik panas bukan luas terbakar. Jumlah kejadian banjir berasal dari laporan DIBI yang naik dari tahun ke tahun; efek tahun menyerap tren itu. Label banjir Groundsource tidak dipakai. Hasil ini tidak membenarkan atau menyangkal klaim kenaikan aliran permukaan 25 persen, yang berbeda satuan.
"""


def uji():
    rng = random.Random(1)
    # panel sintetis: banjir_t+1 = 0,5 x_t + derau, 60 kab x 12 tahun
    n, T = 60, 12
    X = [[rng.gauss(0, 1) for _ in range(T)] for _ in range(n)]
    Z = [[0.5 * X[i][t] + rng.gauss(0, 0.3) for t in range(T)] for i in range(n)]
    b, _ = ols(Z, [X], list(range(n))); assert abs(b[0] - 0.5) < 0.05, b
    Z0 = [[rng.gauss(0, 1) for _ in range(T)] for i in range(n)]
    b, _ = ols(Z0, [X], list(range(n))); assert abs(b[0]) < 0.15, b
    assert tersil(Z, X, list(range(n))) > 0.3
    # efek kab dan tahun tetap terserap
    Zk = [[Z[i][t] + 5 * i + 3 * t for t in range(T)] for i in range(n)]
    b2, _ = ols(Zk, [X], list(range(n))); assert abs(b2[0] - b[0]) < 1.0 and abs(b2[0] - 0.5) < 0.05
    print("uji ok")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "uji": uji(); sys.exit()
    o = jalan(); os.makedirs(OUT, exist_ok=True)
    json.dump(o, open(OUT + "api_banjir.json", "w"), ensure_ascii=False, indent=1)
    open(OUT + "api_banjir_ringkas.md", "w").write(ringkas(o))
    print(json.dumps(o, ensure_ascii=False, indent=1))
