"""Kalibrasi peluang "membesar" per wilayah: Platt bertingkat (docs/riset/HIERARKI-WILAYAH.md, pendaftaran 8eb3cf7e).

Masukan: peluang luar-lipatan 2015-2023 model lolos produksi (data/raw/sebaran/lolos_peluang.pkl, konfigurasi B), baris
lolos_baris.pkl (tahun, provinsi, label), titik awal dari peristiwa.jsonl -> kabupaten lewat scripts/data/wilayah.py.
2024-2026 TIDAK dipakai (dicadangkan untuk uji skor prioritas v2).

Bentuk:  logit p' = a + d_prov + e_kab + b * logit(p)
  - a, b global (Newton, 2 parameter) pada tahun latih;
  - d_prov = n_P * dmentah_P / (n_P + k_prov), dmentah_P = MLE intersep geser provinsi dengan a, b tetap (induk = 0);
  - e_kab  = n_K * ementah_K / (n_K + k_kab), ementah_K = MLE geser kabupaten di atas a + d_prov (induk = provinsi);
  - n_u = jumlah api di unit; k per tingkat dipilih berurutan (provinsi dulu, lalu kabupaten) dengan tinggalkan-satu-tahun
    DI DALAM tahun latih (logloss), tidak pernah dengan tahun yang dinilai.
Uji: tinggalkan-satu-tahun 2015-2023 (latih 8 tahun, nilai tahun ke-9). ECE & Brier skill = prospektif.kalibrasi
(10 kantong kuantil; skill vs laju dasar himpunan itu). "Sebelum" = peluang produksi apa adanya.
Syarat lolos (beku): ECE per provinsi turun di mayoritas provinsi DAN Brier skill tidak turun di provinsi mana pun dengan
>= 300 api. Koefisien produksi (latih semua 2015-2023) hanya ditulis bila LOLOS.

Pakai:  python3 scripts/sebaran/kalibrasi_wilayah.py [jalan] | uji
"""
import json, math, os, pickle, sys, time

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
from umum import MENTAH, PUBLIK  # noqa: E402  (menaruh scripts/data di sys.path)

TAHUN = tuple(range(2015, 2024))
CACHE = os.path.join(MENTAH, "kalibrasi_wilayah_cache.pkl")
KELUAR = os.path.join(PUBLIK, "kalibrasi_wilayah.json")
KISI_K = (0, 30, 100, 300, 1000, 3000, 10000, 30000, 100000, math.inf)
N_PROV_MIN = 300
EPS = 1e-6


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, file=sys.stderr, flush=True)


def sig(x):
    return 1 / (1 + math.exp(-x)) if x > -700 else 0.0


def logit(p):
    p = min(1 - EPS, max(EPS, p))
    return math.log(p / (1 - p))


# ---------------- data ----------------
def muat():
    if os.path.exists(CACHE):
        return pickle.load(open(CACHE, "rb"))
    from wilayah import Wilayah
    d = pickle.load(open(os.path.join(MENTAH, "lolos_baris.pkl"), "rb"))
    P = pickle.load(open(os.path.join(MENTAH, "lolos_peluang.pkl"), "rb"))
    E = {r[0]: [r[1], r[2], None, r[4], logit(P[r[0]])] for r in d["baris"] if r[1] in TAHUN}  # th, prov, kab, y, z
    del d
    W = Wilayah()
    for l in open(os.path.join(MENTAH, "peristiwa.jsonl")):
        e = E.get(l[7:15])
        if e is None:
            continue
        j = json.loads(l)
        w = W.cari(j["lon0"], j["lat0"])
        e[2] = f"{e[1]}|{w[1]}" if w and w[0] == e[1] else None  # di luar poligon / beda provinsi -> hanya tingkat provinsi
    R = [tuple(v) for v in E.values()]
    pickle.dump(R, open(CACHE, "wb"), protocol=pickle.HIGHEST_PROTOCOL)
    return R


# ---------------- pemasangan ----------------
def platt_global(rows):
    """MLE (a, b) untuk y ~ sig(a + b z), Newton 2 parameter."""
    a, b = 0.0, 1.0
    for _ in range(25):
        ga = gb = haa = hab = hbb = 0.0
        for r in rows:
            z = r[4]
            p = sig(a + b * z)
            g, h = r[3] - p, p * (1 - p)
            ga += g
            gb += g * z
            haa += h
            hab += h * z
            hbb += h * z * z
        det = haa * hbb - hab * hab
        da, db = (hbb * ga - hab * gb) / det, (haa * gb - hab * ga) / det
        a, b = a + da, b + db
        if abs(da) + abs(db) < 1e-9:
            break
    return a, b


def geser_mentah(rows, kunci, dasar):
    """Per unit: MLE geser intersep d dengan logit dasar(r) tetap -> {unit: (d, n)}. Dibatasi [-6, 6] (unit tanpa lolos)."""
    G = {}
    for r in rows:
        u = kunci(r)
        if u is not None:
            G.setdefault(u, []).append((dasar(r), r[3]))
    out = {}
    for u, xs in G.items():
        d, s = 0.0, sum(y for _, y in xs)
        for _ in range(30):
            ps = [sig(x + d) for x, _ in xs]
            g, h = s - sum(ps), sum(p * (1 - p) for p in ps)
            step = g / h if h > 1e-12 else 0.0
            d = max(-6.0, min(6.0, d + step))
            if abs(step) < 1e-9 or d in (-6.0, 6.0):
                break
        out[u] = (d, len(xs))
    return out


def susut(mentah, k):
    """B_u = n_u * Bmentah_u / (n_u + k) (geser terhadap induk; induk = 0)."""
    return {u: (0.0 if k == math.inf else n * d / (n + k)) for u, (d, n) in mentah.items()}


def periksa_tahun(rows, tahun):
    th = {r[0] for r in rows}
    assert th <= set(tahun), f"baris tahun {sorted(th - set(tahun))} bocor ke pemasangan (boleh hanya {sorted(tahun)})"
    assert all(t <= 2023 for t in th), "2024-2026 dicadangkan untuk uji skor prioritas v2"


class Model:
    def __init__(self, rows, tahun, k_prov=None, k_kab=None):
        periksa_tahun(rows, tahun)
        self.a, self.b = platt_global(rows)
        self.mp = geser_mentah(rows, lambda r: r[1], lambda r: self.a + self.b * r[4])
        self.rows = rows
        self._mk = {}
        self.set_k(k_prov, k_kab)

    def set_k(self, k_prov, k_kab):
        self.kp, self.kk = k_prov, k_kab
        self.dp = susut(self.mp, k_prov) if k_prov is not None else {}
        if k_kab is not None:
            if k_prov not in self._mk:  # geser mentah kabupaten bergantung pada geser provinsi, tidak pada k_kab
                self._mk[k_prov] = geser_mentah(self.rows, lambda r: r[2], lambda r: self.a + self.dp.get(r[1], 0.0) + self.b * r[4])
            self.mk = self._mk[k_prov]
            self.ek = susut(self.mk, k_kab)
        else:
            self.ek = {}
        return self

    def logit_p(self, r):
        return self.a + self.dp.get(r[1], 0.0) + self.ek.get(r[2], 0.0) + self.b * r[4]


def logloss(rows, f):
    s = 0.0
    for r in rows:
        p = min(1 - 1e-12, max(1e-12, sig(f(r))))
        s -= math.log(p) if r[3] else math.log(1 - p)
    return s


def pilih_k(rows, tahun):
    """k_prov lalu k_kab dengan tinggalkan-satu-tahun di dalam `tahun` (logloss jumlah)."""
    lip = []
    for y in tahun:
        tr = [r for r in rows if r[0] != y and r[0] in tahun]
        va = [r for r in rows if r[0] == y]
        if va:
            lip.append((Model(tr, [t for t in tahun if t != y]), va))
    ll = {k: sum(logloss(va, m.set_k(k, None).logit_p) for m, va in lip) for k in KISI_K}
    kp = min(KISI_K, key=lambda k: (ll[k], -k if k != math.inf else -1e18))
    llk = {k: sum(logloss(va, m.set_k(kp, k).logit_p) for m, va in lip) for k in KISI_K}
    kk = min(KISI_K, key=lambda k: (llk[k], -k if k != math.inf else -1e18))
    return kp, kk, {"logloss_k_prov": {str(k): round(v, 2) for k, v in ll.items()}, "logloss_k_kab": {str(k): round(v, 2) for k, v in llk.items()}}


# ---------------- uji balik ----------------
def nilai(p, y):
    import prospektif as PR
    k = PR.kalibrasi(p, y)
    return None if k is None else {"n": k["n"], "lolos": sum(y), "ece": k["ece"], "brier": k["brier"], "brier_skill": k["brier_skill"]}


def jalan():
    t0 = time.time()
    R = muat()
    periksa_tahun(R, TAHUN)
    log(f"{len(R)} api 2015-2023; kabupaten terpetakan {sum(1 for r in R if r[2])}")
    pred = []  # (r, p_sebelum, p_global, p_bertingkat)
    lipatan = {}
    for y in TAHUN:
        tr_th = [t for t in TAHUN if t != y]
        tr = [r for r in R if r[0] != y]
        va = [r for r in R if r[0] == y]
        kp, kk, jejak = pilih_k(tr, tr_th)
        m = Model(tr, tr_th, kp, kk)
        ag, bg = m.a, m.b  # "global" = Platt ulang a, b saja (tanpa geser wilayah)
        for r in va:
            pred.append((r, sig(r[4]), sig(ag + bg * r[4]), sig(m.logit_p(r))))
        lipatan[y] = {"k_prov": kp, "k_kab": kk, "a": round(m.a, 4), "b": round(m.b, 4), **jejak}
        log(f"tahun {y}: k_prov {kp}, k_kab {kk}; {round(time.time() - t0)} dtk")
    out = {"dibuat": time.strftime("%Y-%m-%d"), "pendaftaran": "docs/riset/HIERARKI-WILAYAH.md 'Kalibrasi peluang membesar per wilayah' (commit 8eb3cf7e)",
           "metode": __doc__.split("\n\n")[2].strip(), "n": len(R), "lolos": sum(r[3] for r in R),
           "kabupaten_terpetakan": sum(1 for r in R if r[2]), "lipatan": {str(y): v for y, v in lipatan.items()},
           "kisi_k": [str(k) for k in KISI_K]}
    sel = lambda f: [x for x in pred if f(x[0])]
    ringkas = lambda xs: {"sebelum": nilai([x[1] for x in xs], [x[0][3] for x in xs]), "global": nilai([x[2] for x in xs], [x[0][3] for x in xs]),
                          "bertingkat": nilai([x[3] for x in xs], [x[0][3] for x in xs])}
    out["semua"] = ringkas(pred)
    out["per_tahun"] = {str(y): ringkas(sel(lambda r: r[0] == y)) for y in TAHUN}
    out["per_provinsi"] = {p: ringkas(sel(lambda r: r[1] == p)) for p in sorted({r[1] for r in R})}
    pv = {p: v for p, v in out["per_provinsi"].items() if v["sebelum"] and v["bertingkat"]}
    ece_turun = [p for p, v in pv.items() if v["bertingkat"]["ece"] < v["sebelum"]["ece"]]
    skill_turun = [p for p, v in pv.items() if v["sebelum"]["n"] >= N_PROV_MIN and v["bertingkat"]["brier_skill"] < v["sebelum"]["brier_skill"]]
    syarat = {"ece_turun_mayoritas": len(ece_turun) > len(pv) / 2, "skill_tidak_turun": not skill_turun}
    out["vonis"] = {"lolos": all(syarat.values()), "teks": "LOLOS" if all(syarat.values()) else "GAGAL", "syarat": syarat,
                    "ece_turun": ece_turun, "n_provinsi": len(pv), "skill_turun_n300": skill_turun,
                    "catatan": "perbandingan memakai angka 4 desimal dari prospektif.kalibrasi; 'tidak turun' = bertingkat >= sebelum"}
    if out["vonis"]["lolos"]:
        kp, kk, jejak = pilih_k(R, TAHUN)
        m = Model(R, TAHUN, kp, kk)
        out["produksi"] = {"a": m.a, "b": m.b, "k_prov": kp, "k_kab": kk, "geser_prov": m.dp, "geser_kab": m.ek, **jejak,
                           "catatan": "logit p' = a + geser_prov[prov] + geser_kab['prov|kab'] + b * logit(p model lolos); unit tak ada = 0"}
    out["detik"] = round(time.time() - t0)
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, indent=1, default=lambda x: str(x))
    log("vonis", json.dumps(out["vonis"], ensure_ascii=False), out["detik"], "dtk")


def uji():
    import random
    rnd = random.Random(3)
    # data sintetis: model dasar terkalibrasi global, tetapi provinsi "B" sebenarnya geser +1,2 logit dan kab "B|x" +0,8 lagi
    R = []
    for th in (2015, 2016, 2017, 2018):
        for _ in range(6000):
            prov = rnd.choice("AB")
            kab = f"{prov}|{rnd.choice('xy')}"
            z = rnd.gauss(-3, 1.2)
            benar = z + (1.2 if prov == "B" else 0) + (0.8 if kab == "B|x" else 0)
            R.append((th, prov, kab, 1 if rnd.random() < sig(benar) else 0, z))
    tr, va = [r for r in R if r[0] != 2018], [r for r in R if r[0] == 2018]
    kp, kk, _ = pilih_k(tr, (2015, 2016, 2017))
    m = Model(tr, (2015, 2016, 2017), kp, kk)
    assert kp != math.inf and kk != math.inf, (kp, kk)  # pergeseran nyata -> tingkat wilayah dipilih
    assert abs(m.dp["B"] - m.dp["A"] - 1.2) < .5 and m.ek["B|x"] > m.ek["B|y"], (m.dp, m.ek)
    g = Model(tr, (2015, 2016, 2017))
    vb = [r for r in va if r[1] == "B"]
    assert nilai([sig(m.logit_p(r)) for r in vb], [r[3] for r in vb])["ece"] < nilai([sig(g.a + g.b * r[4]) for r in vb], [r[3] for r in vb])["ece"]
    # tanpa pergeseran wilayah, k tak hingga / besar tidak boleh kalah jauh dan geser susut ke ~0
    assert susut({"u": (2.0, 100)}, 100)["u"] == 1.0 and susut({"u": (2.0, 100)}, math.inf)["u"] == 0.0 and susut({"u": (2.0, 100)}, 0)["u"] == 2.0
    # kebocoran DITOLAK: baris tahun yang dinilai, atau 2024+, tidak boleh masuk pemasangan
    for bocor, th in ((R, (2015, 2016, 2017)), ([(2024, "A", "A|x", 0, -3.0)], (2024,))):
        try:
            Model(bocor, th)
        except AssertionError:
            pass
        else:
            raise SystemExit("kebocoran tidak ditolak")
    a, b = platt_global([(2015, "A", None, 1 if rnd.random() < sig(.5 + 2 * z) else 0, z) for z in (rnd.gauss(0, 1) for _ in range(20000))])
    assert abs(a - .5) < .1 and abs(b - 2) < .15, (a, b)
    print("ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a in ([], ["jalan"]):
        jalan()
    else:
        sys.exit(__doc__)
