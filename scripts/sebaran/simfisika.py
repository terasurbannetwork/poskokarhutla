"""Port Python mesin Sim di public/index.html (tabelLaju + sebar + kalibrasi), dipakai sebagai pembanding.

Setia ke JS: laju FBP Kanada per [jam][bahan][16 arah] (elips Van Wagner), waktu tempuh minimum (Dijkstra), FIFO saat
laju < 0,6 m/jam, hujan >= 3 mm/jam memadamkan api di tanah mineral, larangan melompati sel tak terbakar lewat langkah
diagonal/kuda. Beda yang disengaja: kisi = kisi global 375 m (bukan 120 m), tanpa skenario/serangan/sekat, sel air tidak
dipetakan (data sungai OSM hanya ada untuk Kalsel).

Parameter hibrida (kalibrasi pada data latih): k_angin (pengali kecepatan angin), m_gambut (pengali laju di gambut),
m (pengali global). Sim asli = k_angin 1, m_gambut 1, m dari kalibrasi() atau 1.
"""
import heapq, math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fitur import fFF, fWI, hffmc  # noqa: E402
from umum import NX, ij  # noqa: E402


def CURING(cc):
    return .005 * (math.exp(.061 * cc) - 1) if cc < 58.8 else .176 + .02 * (cc - 58.8)


BAHAN = {
    "gambut": dict(a=190, b=.031, c=1.4, cf=CURING(80), rumput=True),
    "rumput": dict(a=190, b=.031, c=1.4, cf=CURING(90), rumput=True),
    "sabana": dict(a=250, b=.035, c=1.7, cf=CURING(95), rumput=True),
    "semak": dict(a=30, b=.0232, c=1.6, cf=1, bui=True),
    "hutan": dict(a=30, b=.0232, c=1.6, cf=.5, bui=True),
    "kebun": dict(a=190, b=.031, c=1.4, cf=CURING(60), rumput=True),
}
FUEL = list(BAHAN)
NF = len(FUEL) + 1
ARAH16 = [(1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1), (2, 1), (1, 2), (-1, 2), (-2, 1), (-2, -1), (-1, -2), (1, -2), (2, -1)]


def efek_bui(bui, q=.90, bui0=32):
    """Efek BUI FBP pers. 54 (FCFDG 1992; cffdrs buildup_effect): exp(50 ln q (1/BUI - 1/BUI0)); D-1: q 0,90, BUI0 32.
    Dulu tertulis 32 di tempat 50 (bingung dengan BUI0), efeknya terlalu lemah: BUI 100 -> 1,074 bukan 1,118."""
    return 1 if bui <= 0 else math.exp(50 * math.log(q) * (1 / bui - 1 / bui0))


def tabel_laju(W, bui, k_angin=1.0, m_gambut=1.0, jam=73):
    """W: {ws, wd, F} per jam. -> tab[h][f][q] m/menit."""
    fBUI = efek_bui(bui)
    tab = []
    for h in range(jam):
        ws = W["ws"][h] * k_angin
        Fh = W["F"][h]
        isi = .208 * fWI(ws) * fFF(Fh)
        bisi = .208 * math.exp(-.05039 * ws) * fFF(Fh)
        ke = math.radians(W["wd"][h] + 180)
        baris = [[0.0] * 16]
        for nm in FUEL:
            bb = BAHAN[nm]
            ros = lambda i: bb["a"] * (1 - math.exp(-bb["b"] * i)) ** bb["c"] * bb["cf"] * (fBUI if bb.get("bui") else 1) * (m_gambut if nm == "gambut" else 1)
            head = ros(isi)
            back = min(head, ros(bisi))
            lb = (1 if ws < 1 else 1.1 * ws ** .464) if bb.get("rumput") else 1 + 8.729 * (1 - math.exp(-.030 * ws)) ** 2.155
            a = (head + back) / 2
            b = a / lb
            x0 = back - a
            q16 = []
            for di, dj in ARAH16:
                rel = math.pi / 2 - math.atan2(dj, di) - ke
                co, si = math.cos(rel), math.sin(rel)
                if a <= 0:
                    q16.append(0.0)
                    continue
                A = co * co / (a * a) + si * si / (b * b)
                B = 2 * x0 * co / (a * a)
                C = x0 * x0 / (a * a) - 1
                q16.append((-B + math.sqrt(max(0, B * B - 4 * A * C))) / (2 * A))
            baris.append(q16)
        tab.append(baris)
    return tab


def _elips(head, back, lb, ke):
    a = (head + back) / 2
    if a <= 0:
        return [0.0] * 16
    b = a / max(lb, 1.0)
    x0 = back - a
    q16 = []
    for di, dj in ARAH16:
        rel = math.pi / 2 - math.atan2(dj, di) - ke
        co, si = math.cos(rel), math.sin(rel)
        A = co * co / (a * a) + si * si / (b * b)
        B = 2 * x0 * co / (a * a)
        C = x0 * x0 / (a * a) - 1
        q16.append((-B + math.sqrt(max(0, B * B - 4 * A * C))) / (2 * A))
    return q16


def lb_grass(ws):
    return 1 if ws < 1 else 1.1 * ws ** .464


def back_dari_lb(head, lb):
    """Laju belakang dari bentuk elips (eksentrisitas), bila model hanya memberi laju kepala."""
    lb = max(lb, 1.0)
    e = math.sqrt(lb * lb - 1) / lb
    return head * (1 - e) / (1 + e)


# ---------------- model pembanding dari negara lain (laju kepala m/menit) ----------------
# Rothermel (1972) + model bahan bakar Scott & Burgan (2005): beban 1 jam + herba (dianggap kering/curing), t/acre, kedalaman ft,
# SAV 1/ft, kadar air padam Mx. Pemetaan ke kelas Sim: asumsi tertulis.
SB = {
    "gambut": dict(w=0.25 + 1.9, sav=2000, dlm=2.0, mx=.15, waf=.4),   # GR4: rumput beban sedang, iklim kering (gambut terbuka berpakis)
    "rumput": dict(w=0.10 + 1.5, sav=1500, dlm=2.0, mx=.30, waf=.4),   # GR3: rumput kasar iklim lembap (alang-alang)
    "sabana": dict(w=0.10 + 1.0, sav=2000, dlm=1.0, mx=.15, waf=.4),   # GR2: rumput beban rendah, kering
    "semak": dict(w=3.6, sav=750, dlm=6.0, mx=.15, waf=.3),            # SH5: semak beban tinggi
    "hutan": dict(w=2.4, sav=2000, dlm=.3, mx=.25, waf=.15),           # TL6: serasah daun lebar beban sedang
    "kebun": dict(w=0.20 + 0.20, sav=2000, dlm=.6, mx=.20, waf=.2),    # TU1: rumput-semak-pohon beban rendah
}


def rothermel(nm, mf, ws):
    """Laju kepala Rothermel (m/menit). mf = kadar air bahan bakar mati (fraksi), ws = angin 10 m km/jam."""
    f = SB[nm]
    w0 = f["w"] * 0.0459137  # t/acre -> lb/ft2
    sav, dlm, mx = f["sav"], f["dlm"], f["mx"]
    if mf >= mx:
        return 0.0, 1.0
    rho_b = w0 / dlm
    beta = rho_b / 32.0
    bop = 3.348 * sav ** -.8189
    A = 133 * sav ** -.7913
    gmax = sav ** 1.5 / (495 + .0594 * sav ** 1.5)
    gam = gmax * (beta / bop) ** A * math.exp(A * (1 - beta / bop))
    rm = mf / mx
    eta_m = max(0.0, 1 - 2.59 * rm + 5.11 * rm ** 2 - 3.52 * rm ** 3)
    IR = gam * w0 * (1 - .0555) * 8000 * eta_m * .174 * .010 ** -.19
    xi = math.exp((.792 + .681 * sav ** .5) * (beta + .1)) / (192 + .2595 * sav)
    U = ws * 54.68 * f["waf"]  # ft/menit, angin tengah nyala
    C, B, E = 7.47 * math.exp(-.133 * sav ** .55), .02526 * sav ** .54, .715 * math.exp(-3.59e-4 * sav)
    phiw = C * U ** B * (beta / bop) ** -E if U > 0 else 0
    R = IR * xi * (1 + phiw) / (rho_b * math.exp(-138 / sav) * (250 + 1116 * mf))
    umph = ws * .621 * f["waf"]
    lb = .936 * math.exp(.2566 * umph) + .461 * math.exp(-.1548 * umph) - .397  # Anderson 1983
    return R * .3048, lb


# McArthur Mk5: GFDI (Noble dkk. 1980) untuk rumput, FFDI untuk hutan/semak; laju kepala = 0,13 GFDI km/jam (rumput),
# 0,0012 FFDI w km/jam (hutan). Faktor kekeringan (DF, Griffiths 1999) dari KBDI ~ DC/4 (proksi; KBDI tidak dihitung di sini).
MA = {"gambut": ("g", 6, 80), "rumput": ("g", 6, 90), "sabana": ("g", 4, 95), "kebun": ("g", 3, 60), "semak": ("f", 15, None), "hutan": ("f", 10, None)}


def faktor_kering(dc, hari_kering, hujan):
    I, N = dc / 4, hari_kering
    df = .191 * (I + 104) * (N + 1) ** 1.5 / (3.52 * (N + 1) ** 1.5 + hujan - 1) if (3.52 * (N + 1) ** 1.5 + hujan - 1) > 0 else 10
    return min(10.0, max(0.0, df))


def mcarthur(nm, T, RH, ws, df):
    jenis, beban, cur = MA[nm]
    if jenis == "g":
        g = math.exp(-1.523 + 1.027 * math.log(beban) - .009432 * (100 - cur) ** 1.536 + .02764 * T - .2205 * math.sqrt(max(RH, 0)) + .6422 * math.sqrt(ws))
        return .13 * g * 1000 / 60, lb_grass(ws)
    f = 2 * math.exp(-.45 + .987 * math.log(max(df, .1)) - .0345 * RH + .0338 * T + .0234 * ws)
    return .0012 * f * beban * 1000 / 60, 1 + 8.729 * (1 - math.exp(-.030 * ws)) ** 2.155


# CSIRO padang rumput (Cheney dkk. 1998, padang alami) untuk bahan rumput; Vesta (Cheney dkk. 2012, nilai bahaya bawaan
# FHS_s 3, FHS_ns 3, H_ns 20 cm) untuk semak/hutan. Kadar air rumput (Cheney 1998) dan serasah siang (Gould dkk. 2007).
def csiro_vesta(nm, T, RH, ws):
    if nm in ("gambut", "rumput", "sabana", "kebun"):
        M = 9.58 - .205 * T + .138 * RH
        pm = math.exp(-.108 * M) if M < 12 else max(.001, (.684 - .0342 * M) if ws <= 10 else (.547 - .0228 * M))
        cur = MA[nm][2]
        pc = 1.036 / (1 + 103.989 * math.exp(-.0996 * (cur - 20)))
        R = ((.054 + .269 * ws) if ws < 5 else (1.4 + .838 * (ws - 5) ** .844)) * pm * pc
        return R * 1000 / 60, lb_grass(ws)
    mc = max(4.0, 2.76 + .124 * RH - .0187 * T)
    pm = min(1.0, 18.35 * mc ** -1.495)
    R = (30 if ws <= 5 else 30 + 1.5308 * (ws - 5) ** .8576 * 3 ** .9301 * (3 * 20) ** .6366 * 1.03) * pm
    return R / 60, 1 + 8.729 * (1 - math.exp(-.030 * ws)) ** 2.155


def tabel_model(model, W, kode, jam=73, k_angin=1.0):
    """Tabel laju [jam][bahan][16 arah] untuk model pembanding: 'rothermel', 'mcarthur', 'csiro_vesta', 'elips_angin'.
    W: seri {ws, wd, F, rh, tc, hujan}; kode: {dc, hari_kering, hujan72}."""
    df = faktor_kering(kode["dc"], kode["hari_kering"], kode["hujan72"])
    tab = []
    for h in range(jam):
        ws, T, RH = W["ws"][h] * k_angin, W["tc"][h], W["rh"][h]
        mf = 147.2 * (101 - W["F"][h]) / (59.5 + W["F"][h]) / 100
        ke = math.radians(W["wd"][h] + 180)
        baris = [[0.0] * 16]
        for nm in FUEL:
            if model == "rothermel":
                head, lb = rothermel(nm, mf, ws)
            elif model == "mcarthur":
                head, lb = mcarthur(nm, T, RH, ws, df)
            elif model == "csiro_vesta":
                head, lb = csiro_vesta(nm, T, RH, ws)
            else:  # elips_angin: laju tetap 1 m/menit x (1 + angin/10), bentuk elips rumput; hanya angin yang berperan
                head, lb = 1 + ws / 10, lb_grass(ws)
            baris.append(_elips(head, back_dari_lb(head, lb), lb, ke))
        tab.append(baris)
    return tab


def sebar(benih, fuel, gb, tab, hujan, mult=1.0, tmax=72, d=375.0, lepas=None):
    """benih: sel global; fuel(k) -> 0..6; gb(k) -> 0/1. -> {sel: waktu tiba (jam)} untuk waktu <= tmax.
    lepas: batas sel (jarak Chebyshev dari benih terdekat) supaya kisi tidak tak hingga."""
    T = {k: 0.0 for k in benih}
    done = set()
    heap = [(0.0, k) for k in benih]
    heapq.heapify(heap)
    JR = [math.hypot(a, b) * d for a, b in ARAH16]
    while heap:
        t, k = heapq.heappop(heap)
        if k in done or t > T.get(k, math.inf):
            continue
        if t > tmax or len(done) > 40000:  # batas biaya: model tanpa kalibrasi bisa membakar puluhan ribu sel
            break
        done.add(k)
        i, j = ij(k)
        fs = fuel(k) or 1
        g = gb(k)
        for q, (di, dj) in enumerate(ARAH16):
            kk = (j + dj) * NX + i + di
            if kk in done:
                continue
            ft = fuel(kk)
            if not ft:
                continue
            if q < 8:
                if di and dj and not fuel(k + di) and not fuel(k + dj * NX):
                    continue
            elif abs(di) == 2:
                mi = i + di // 2
                if not fuel(j * NX + mi) or not fuel((j + dj) * NX + mi):
                    continue
            else:
                mj = j + dj // 2
                if not fuel(mj * NX + i) or not fuel(mj * NX + i + di):
                    continue
            tt, s, ok = t, JR[q], True
            while True:
                h = int(tt)
                if h >= 72:
                    ok = False
                    break
                if hujan[h] >= 3 and not g:
                    ok = False
                    break
                vs, vt = tab[h][fs][q], tab[h][ft][q]
                v = 120 * vs * vt / (vs + vt) * mult if vs > 0 and vt > 0 else 0
                if v < .6:
                    tt = h + 1
                    continue
                sisa = (h + 1 - tt) * v
                if sisa >= s:
                    tt += s / v
                    break
                s -= sisa
                tt = h + 1
            if ok and tt < T.get(kk, math.inf) and tt <= tmax:
                T[kk] = tt
                heapq.heappush(heap, (tt, kk))
    return {k: t for k, t in T.items() if k in done}


def kalibrasi(benih, fuel, gb, tab, hujan, target_ha, ha_sel=14.0625, iterasi=7):
    """Faktor m supaya pertambahan 24 jam = target (Sim.kalibrasi, bisection log, batas 0,02-2)."""
    awal = set(benih)
    tumbuh = lambda m: sum(1 for k, t in sebar(benih, fuel, gb, tab, hujan, m, tmax=24).items() if k not in awal) * ha_sel
    lo, hi = math.log(.02), math.log(2)
    for _ in range(iterasi):
        md = (lo + hi) / 2
        if tumbuh(math.exp(md)) > target_ha:
            hi = md
        else:
            lo = md
    return math.exp((lo + hi) / 2)


def cuaca_sim(S, i0, F0):
    """Seri 73 jam {ws, wd, F, hujan} mulai jam indeks i0 dari Seri (fitur.Seri); F dibawa per jam dari F0."""
    W = {"ws": [], "wd": [], "F": [], "hujan": [], "rh": [], "tc": []}
    Fh = F0
    for h in range(73):
        j = min(i0 + h, S.n - 1)
        Fh = hffmc(Fh, S.tc[j], S.rh[j], S.ws[j], S.hujan[j])
        W["ws"].append(S.ws[j])
        W["wd"].append(S.wd[j])
        W["F"].append(Fh)
        W["hujan"].append(S.hujan[j])
        W["rh"].append(S.rh[j])
        W["tc"].append(S.tc[j])
    return W


if __name__ == "__main__" and sys.argv[1:] == ["uji"]:
    # efek BUI D-1 dihitung tangan dari rumus cffdrs buildup_effect(): BUI 32 -> 1, 100 -> 1,1184, 10 -> 0,6962
    assert efek_bui(32) == 1 and abs(efek_bui(100) - 1.1184) < 1e-3 and abs(efek_bui(10) - 0.6962) < 1e-3, efek_bui(100)
    W = {"ws": [20] * 73, "wd": [270] * 73, "F": [90] * 73}  # angin dari barat -> api ke timur
    tab = tabel_laju(W, 60)
    rumput = FUEL.index("rumput") + 1
    assert tab[0][rumput][0] > tab[0][rumput][4] > 0  # laju ke timur (q0) > ke barat (q4)
    k0 = 1000 * NX + 5000
    T = sebar([k0], lambda k: rumput, lambda k: 0, tab, [0] * 73, tmax=6)
    timur = max((ij(k)[0] - 5000) for k in T)
    barat = max((5000 - ij(k)[0]) for k in T)
    assert timur > barat and all(0 <= t <= 6 for t in T.values())
    # hujan 5 mm/jam di tanah mineral: api tidak menjalar; di gambut tetap menjalar
    T2 = sebar([k0], lambda k: rumput, lambda k: 0, tab, [5] * 73, tmax=6)
    T3 = sebar([k0], lambda k: rumput, lambda k: 1, tab, [5] * 73, tmax=6)
    assert len(T2) == 1 and len(T3) > 1
    # pengali lebih besar -> luas lebih besar
    assert len(sebar([k0], lambda k: rumput, lambda k: 0, tab, [0] * 73, mult=.3, tmax=6)) < len(T)
    # model pembanding: laju positif saat kering & berangin, lebih cepat dengan angin lebih kencang, nol saat basah (Rothermel)
    assert rothermel("rumput", .06, 20)[0] > rothermel("rumput", .06, 5)[0] > 0 and rothermel("rumput", .40, 20)[0] == 0
    assert mcarthur("rumput", 33, 40, 20, 8)[0] > mcarthur("rumput", 33, 80, 20, 8)[0] > 0
    assert csiro_vesta("sabana", 33, 30, 25)[0] > csiro_vesta("sabana", 33, 30, 5)[0] > 0 and csiro_vesta("hutan", 33, 40, 20)[0] > 0
    assert 0 <= faktor_kering(400, 20, 0) <= 10 and faktor_kering(400, 20, 0) > faktor_kering(50, 0, 30)
    Wm = {**W, "rh": [40] * 73, "tc": [33] * 73}
    for mdl in ("rothermel", "mcarthur", "csiro_vesta", "elips_angin"):
        tb = tabel_model(mdl, Wm, {"dc": 400, "hari_kering": 10, "hujan72": 0})
        assert tb[0][rumput][0] >= tb[0][rumput][4] >= 0, mdl  # searah angin >= melawan angin
    m = kalibrasi([k0], lambda k: rumput, lambda k: 0, tab, [0] * 73, target_ha=200)
    assert .02 <= m <= 2
    print("ok")
