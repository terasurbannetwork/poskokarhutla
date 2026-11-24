"""Riset eskalasi kejadian banjir berjalan (KI-30). Aturan di PRAREG-ESKALASI.md. Python stdlib saja.

  python3 -I scripts/banjir/eskalasi.py uji        swauji sintetis, tanpa berkas data
  python3 -I scripts/banjir/eskalasi.py hitung     hitung satuan berlabel (tanpa model, tanpa skor)
  python3 -I scripts/banjir/eskalasi.py sidik      bekukan kode + kriteria + masukan (sekali)
  python3 -I scripts/banjir/eskalasi.py buka       latih <= 2023, nilai 2024-2025 SEKALI (penanda eskalasi.buka)
"""
import csv
import datetime as dt
import gzip
import hashlib
import importlib.util
import json
import math
import os
import random
import sys

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(DIR, "../.."))
LOG = os.path.join(AKAR, "data/pusdalops/logbook_kejadian.csv")
ONE = dt.timedelta(1)
MIN_N = 200          # PRAREG: kurang dari ini -> ditutup, tanpa model
MIN_UJI = 100
LATIH, UJI = (2016, 2023), (2024, 2025)
RIDGE, BOOT, BIJI, PRIOR_PROV = 1.0, 2000, 7, 10.0
FITUR = ["lh1", "lh3", "la7", "sm", "lknown", "lnew0", "lnew12", "sinm", "cosm"]
KELUAR = os.path.join(AKAR, "public/banjir/data/eskalasi_uji.json")
SIDIK, BUKA = os.path.join(DIR, "eskalasi.sidik"), os.path.join(DIR, "eskalasi.buka")


def _impor(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(DIR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


# ------------------------------------------------------------------ label (logbook saja, tanpa status kita)
def baca_log(jalur=LOG):
    """-> {prov: [(kab, tgl, dicatat)]} banjir sah: tgl & dicatat valid 2016-2025, 0 <= lag <= 10 hari."""
    out = {}
    with open(jalur, newline="") as f:
        for r in csv.DictReader(f):
            if r["jenis"] != "banjir":
                continue
            try:
                t, p = dt.date.fromisoformat(r["tgl_kejadian"]), dt.date.fromisoformat(r["pertama_dicatat"])
            except ValueError:
                continue
            if not (2016 <= t.year <= 2025 and 0 <= (p - t).days <= 10):
                continue
            for k in r["kab_kode"].split("; "):
                if "|" in k:
                    out.setdefault(k.split("|")[0], []).append((k, t, p))
    return out


def satuan(log, sampel):
    """Satuan = (provinsi, hari d) di mana ADA kab bersampel baru dicatat di logbook pada d (dicatat == d, tgl dalam d-3..d, belum dicatat d-3..d-1).
    y = ada kab LAIN (belum tercatat d-3..d) dicatat pada d+1..d+2 dengan tgl >= d-2. Fitur logbook memakai catatan dicatat <= d saja.
    -> daftar dict {prov, d, kab, y, lknown, lnew0, lnew12}."""
    out = []
    for prov, baris in log.items():
        cat = {}
        for k, t, p in baris:
            cat.setdefault(p, []).append((k, t))
        for d in sorted(cat):
            hari = lambda a, b: [(k, t) for x in range(a, b + 1) for k, t in cat.get(d + x * ONE, [])]
            lalu = {k for k, _ in hari(-3, -1)}
            kini = [(k, t) for k, t in cat[d] if d - 3 * ONE <= t <= d]
            baru = {k for k, _ in kini if k not in lalu}
            kand = sorted(k for k in baru if k in sampel)
            if not kand:
                continue
            known = lalu | {k for k, _ in cat[d]}
            depan = {k for k, t in hari(1, 2) if t >= d - 2 * ONE} - known
            out.append({"prov": prov, "d": d, "kab": kand, "y": int(bool(depan)), "lknown": math.log1p(len(known)),
                        "lnew0": math.log1p(len(baru)), "lnew12": math.log1p(len({k for k, _ in hari(-2, -1)} - {k for k, _ in hari(-6, -3)}))})
    return out


# ------------------------------------------------------------------ hujan ERA5 (sel sampel yang sudah di cache)
def sampel_kab():
    """-> {kab: [jalur_gz sel]} untuk kab yang seluruh selnya ada di cache uji_balik, plus modul ub."""
    ub = _impor("uji_balik_esk", "uji_balik.py")
    sk = ub.sel_per_kab()
    return ub, {k: [ub.jalur(*s) for s in v] for k, v in sk.items() if all(os.path.exists(ub.jalur(*s)) for s in v)}


def isi_fitur(sat, ub, sel_kab):
    cache = {}

    def seri(j):
        if j not in cache:
            with gzip.open(j, "rt") as f:
                cache[j] = ub.deret(json.load(f))
        return cache[j]

    for u in sat:
        e = ub.hari_ke(u["d"])
        best = None
        for k in u["kab"]:
            for j in sel_kab[k]:
                c = seri(j)
                h3 = sum(c["p"][e - 2:e + 1])
                if best is None or h3 > best[0]:
                    best = (h3, c["p"][e], sum(c["p"][e - 7:e]), c["sm"][e])
        u["lh3"], u["lh1"], u["la7"] = (math.log1p(max(best[i], 0)) for i in (0, 1, 2))
        u["sm"] = best[3] if best[3] is not None else 0.0
        a = 2 * math.pi * (u["d"].month - 1) / 12
        u["sinm"], u["cosm"] = math.sin(a), math.cos(a)
    return sat


# ------------------------------------------------------------------ model dan pembanding (stdlib)
def selesai(A, b):
    n = len(b)
    M = [r[:] + [b[i]] for i, r in enumerate(A)]
    for i in range(n):
        p = max(range(i, n), key=lambda r: abs(M[r][i]))
        M[i], M[p] = M[p], M[i]
        for r in range(i + 1, n):
            f = M[r][i] / M[i][i]
            for c in range(i, n + 1):
                M[r][c] -= f * M[i][c]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (M[i][n] - sum(M[i][c] * x[c] for c in range(i + 1, n))) / M[i][i]
    return x


def sig(z):
    return 1 / (1 + math.exp(-max(-30, min(30, z))))


def latih_lr(X, y, ridge=RIDGE, iter_=30):
    """Regresi logistik ridge (intersep tak dihukum), IRLS. -> bobot [b0, b1..]."""
    d = len(X[0]) + 1
    w = [0.0] * d
    for _ in range(iter_):
        g, H = [0.0] * d, [[0.0] * d for _ in range(d)]
        for xi, yi in zip(X, y):
            v = [1.0] + xi
            p = sig(sum(a * b for a, b in zip(w, v)))
            for i in range(d):
                g[i] += (p - yi) * v[i]
                for j in range(d):
                    H[i][j] += p * (1 - p) * v[i] * v[j]
        for i in range(1, d):
            g[i] += ridge * w[i]
            H[i][i] += ridge
        H[0][0] += 1e-9
        dw = selesai(H, g)
        w = [a - b for a, b in zip(w, dw)]
        if max(abs(v) for v in dw) < 1e-8:
            break
    return w


def prob_lr(w, X):
    return [sig(w[0] + sum(a * b for a, b in zip(w[1:], x))) for x in X]


def baku(latih, semua):
    """Rata-rata dan simpangan dari LATIH saja."""
    mu = [sum(u[f] for u in latih) / len(latih) for f in FITUR]
    sd = [(sum((u[f] - m) ** 2 for u in latih) / len(latih)) ** .5 or 1.0 for f, m in zip(FITUR, mu)]
    return [[(u[f] - m) / s for f, m, s in zip(FITUR, mu, sd)] for u in semua]


def pembanding(latih):
    """-> {nama: fungsi(u) -> peluang}. Semua hanya dari latih."""
    n1 = sum(u["y"] for u in latih) / len(latih)
    bulan = {}
    for u in latih:
        bulan.setdefault(u["d"].month, []).append(u["y"])
    rb = lambda m: (sum(bulan[m]) + n1) / (len(bulan[m]) + 1) if m in bulan else n1
    pb = {}
    for u in latih:
        pb.setdefault((u["prov"], u["d"].month), []).append(u["y"])
    rpb = lambda u: (sum(pb.get((u["prov"], u["d"].month), [])) + PRIOR_PROV * rb(u["d"].month)) / (len(pb.get((u["prov"], u["d"].month), [])) + PRIOR_PROV)
    per = {True: [], False: []}
    for u in latih:
        per[u["lnew12"] > 0].append(u["y"])
    rp = {k: (sum(v) + n1) / (len(v) + 1) for k, v in per.items()}
    return {"klimatologi_bulan": lambda u: rb(u["d"].month), "klimatologi_prov_bulan": rpb, "persistensi": lambda u: rp[u["lnew12"] > 0]}


def brier(p, y):
    return [(a - b) ** 2 for a, b in zip(p, y)]


def auc(p, y):
    pos = [a for a, b in zip(p, y) if b]
    neg = [a for a, b in zip(p, y) if not b]
    if not pos or not neg:
        return None
    s = 0.0
    for a in pos:
        s += sum(1.0 if a > b else 0.5 if a == b else 0.0 for b in neg)
    return s / (len(pos) * len(neg))


def selang_blok(selisih, blok, b=BOOT, biji=BIJI):
    """Bootstrap persentil atas BLOK (provinsi x bulan): -> (rata, bawah95, atas95)."""
    g = {}
    for s, k in zip(selisih, blok):
        g.setdefault(k, []).append(s)
    ks, rnd, v = list(g), random.Random(biji), []
    for _ in range(b):
        t = [x for _ in ks for x in g[ks[rnd.randrange(len(ks))]]]
        v.append(sum(t) / len(t))
    v.sort()
    return sum(selisih) / len(selisih), v[int(.025 * b)], v[int(.975 * b)]


def nilai(sat):
    """Latih <= 2023, nilai 2024-2025. Aturan vonis (PRAREG): pembanding utama = Brier latih terkecil; LOLOS bila selisih Brier rata-rata
    (pembanding - model) > 0 dengan batas bawah 95% (blok prov x bulan) > 0 DAN AUC model > AUC pembanding utama."""
    tr = [u for u in sat if LATIH[0] <= u["d"].year <= LATIH[1]]
    te = [u for u in sat if UJI[0] <= u["d"].year <= UJI[1]]
    Xa = baku(tr, tr + te)
    w = latih_lr(Xa[:len(tr)], [u["y"] for u in tr])
    pm = prob_lr(w, Xa[len(tr):])
    yt = [u["y"] for u in te]
    pemb = pembanding(tr)
    brl = {k: sum(brier([f(u) for u in tr], [u["y"] for u in tr])) / len(tr) for k, f in pemb.items()}
    utama = min(brl, key=brl.get)
    pb = {k: [f(u) for u in te] for k, f in pemb.items()}
    blok = [(u["prov"], u["d"].strftime("%Y-%m")) for u in te]
    sel = [a - b for a, b in zip(brier(pb[utama], yt), brier(pm, yt))]
    ci = selang_blok(sel, blok)
    a_m, a_b = auc(pm, yt), auc(pb[utama], yt)
    lolos = ci[1] > 0 and a_m is not None and a_b is not None and a_m > a_b
    return {"n_latih": len(tr), "n_uji": len(te), "y1_latih": sum(u["y"] for u in tr), "y1_uji": sum(yt), "pembanding_utama": utama,
            "brier_latih_pembanding": {k: round(v, 4) for k, v in brl.items()}, "brier_model": round(sum(brier(pm, yt)) / len(te), 4),
            "brier_pembanding": {k: round(sum(brier(v, yt)) / len(te), 4) for k, v in pb.items()},
            "auc_model": a_m and round(a_m, 4), "auc_pembanding": {k: (auc(v, yt) and round(auc(v, yt), 4)) for k, v in pb.items()},
            "selisih_brier": round(ci[0], 5), "selang95": [round(ci[1], 5), round(ci[2], 5)], "n_blok": len({*blok}),
            "bobot": {f: round(x, 3) for f, x in zip(["b0"] + FITUR, w)}, "vonis": "lolos" if lolos else "tidak lolos"}


# ------------------------------------------------------------------ jalur
def hash_masukan(sel_kab):
    h = lambda p: hashlib.sha256(open(p, "rb").read()).hexdigest()[:16]
    return [f"logbook:{h(LOG)}"] + [f"era5:{os.path.basename(j)}:{h(j)}" for k in sorted(sel_kab) for j in sorted(sel_kab[k])]


def siapkan():
    ub, sk = sampel_kab()
    sat = isi_fitur(satuan(baca_log(), set(sk)), ub, sk)
    return sat, sk


def ringkas(sat):
    r = {}
    for nama, (a, b) in (("latih", LATIH), ("uji", UJI)):
        s = [u for u in sat if a <= u["d"].year <= b]
        r[nama] = (len(s), sum(u["y"] for u in s), len({u["prov"] for u in s}))
    return r


def hitung():
    log = baca_log()
    print("baris banjir sah (kab-baris):", sum(len(v) for v in log.values()))
    sat, sk = siapkan()
    print("kab bersampel ERA5 lengkap:", len(sk), "| satuan berlabel:", len(sat), "| y=1:", sum(u["y"] for u in sat))
    for k, (n, y1, p) in ringkas(sat).items():
        print(f"  {k}: n={n} y1={y1} provinsi={p}")
    print("MIN_N", MIN_N, "->", "LANJUT" if len(sat) >= MIN_N else "DITUTUP: data tidak cukup")


def sidik():
    S = _impor("sidik_esk", "../umum/sidik.py")
    sat, sk = siapkan()
    os.chdir(AKAR)
    kode = ["scripts/banjir/eskalasi.py", "scripts/banjir/uji_balik.py", "scripts/umum/gerbang.py"]
    print(S.tulis(os.path.relpath(SIDIK, AKAR), kode, "scripts/banjir/PRAREG-ESKALASI.md", hash_masukan(sk))["sidik"])


def buka():
    S = _impor("sidik_esk", "../umum/sidik.py")
    os.chdir(AKAR)
    ide = S.cek(os.path.relpath(SIDIK, AKAR))["sidik"]
    sat, sk = siapkan()
    if len(sat) < MIN_N or ringkas(sat)["uji"][0] < MIN_UJI:
        sys.exit("DITUTUP: data tidak cukup")
    hasil = nilai(sat)
    S.buka(os.path.relpath(BUKA, AKAR), None, ide, hasil["vonis"])
    G = _impor("gerbang_esk", "../umum/gerbang.py")
    hasil.update({"sidik": ide, "dibuat": dt.date.today().isoformat(), "label": "logbook Pusdalops, dicatat d+1..d+2 kab lain di provinsi sama"})
    json.dump(hasil, open(KELUAR, "w"), indent=1, ensure_ascii=False)
    pb = hasil["pembanding_utama"]
    e = G.entri_ringkas("Brier eskalasi kejadian banjir 48 jam", "rendah", pb, hasil["n_uji"], hasil["brier_model"], hasil["brier_pembanding"][pb],
                        hasil["selang95"], ["public/banjir/data/eskalasi_uji.json"],
                        vonis="lolos" if hasil["vonis"] == "lolos" else "tidak lolos", prospektif=True)
    e["catatan"] = "uji 2024-2025 dibuka sekali; vonis uji, bukan prospektif: tidak pernah boleh_tampil"
    e["boleh_tampil"] = False
    p = G.jalur("banjir")
    ada = json.load(open(p))["keluaran"] if os.path.exists(p) else {}
    G.tulis("banjir", {**ada, "eskalasi": e})
    print(json.dumps(hasil, indent=1, ensure_ascii=False))


def uji():
    rnd = random.Random(3)
    # LR menemukan sinyal kuat dan menolak fitur derau
    X = [[rnd.gauss(0, 1), rnd.gauss(0, 1)] for _ in range(1500)]
    y = [int(rnd.random() < sig(1.5 * a - 0.2)) for a, _ in X]
    w = latih_lr(X, y)
    assert w[1] > 1.0 and abs(w[2]) < 0.3, w
    assert auc([.1, .9], [0, 1]) == 1.0 and auc([.5, .5], [0, 1]) == .5
    # bootstrap blok: selisih nol -> selang melingkupi 0; selisih positif tetap -> batas bawah > 0
    blok = [(i % 7, "m") for i in range(70)]
    assert selang_blok([0.0] * 70, blok, 200)[1] == 0
    assert selang_blok([0.1] * 70, blok, 200)[1] > 0
    # label: kab B baru muncul d+1 di provinsi sama -> y=1; kab sama berlanjut -> y=0; catatan d+3 tak dihitung
    d = dt.date(2020, 1, 10)
    log = {"11": [("11|A", d, d), ("11|B", d, d + ONE), ("11|C", d, d + 3 * ONE)]}
    s = satuan(log, {"11|A"})
    assert len(s) == 1 and s[0]["y"] == 1, s
    s = satuan({"11": [("11|A", d, d), ("11|C", d, d + 3 * ONE)]}, {"11|A"})
    assert s[0]["y"] == 0
    s = satuan({"11": [("11|A", d, d), ("11|A", d + ONE, d + ONE)]}, {"11|A"})
    assert [u["d"] for u in s] == [d] and s[0]["y"] == 0, "kab yang sama tidak boleh dihitung eskalasi sendiri"
    # tak bocor: fitur satuan d tak berubah bila catatan d+1 diubah
    a = satuan({"11": [("11|A", d, d), ("11|B", d, d + ONE)]}, {"11|A"})[0]
    b = satuan({"11": [("11|A", d, d), ("11|B", d, d + ONE), ("11|Z", d, d + ONE)]}, {"11|A"})[0]
    assert all(a[k] == b[k] for k in ("lknown", "lnew0", "lnew12"))
    # pembanding hanya dari latih: ubah y uji tak mengubah peluangnya
    tr = [{"prov": "11", "d": dt.date(2020, m, 1), "y": m % 2, "lnew12": 0.0} for m in range(1, 13)]
    f1 = pembanding(tr)["klimatologi_bulan"]
    assert abs(f1({"d": dt.date(2025, 3, 1)}) - f1({"d": dt.date(2030, 3, 1)})) < 1e-12
    print("eskalasi.py uji: ok")


if __name__ == "__main__":
    {"uji": uji, "hitung": hitung, "sidik": sidik, "buka": buka}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: sys.exit(__doc__))()
