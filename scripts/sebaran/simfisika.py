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
        if t > tmax:
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
    W = {"ws": [], "wd": [], "F": [], "hujan": []}
    Fh = F0
    for h in range(73):
        j = min(i0 + h, S.n - 1)
        Fh = hffmc(Fh, S.tc[j], S.rh[j], S.ws[j], S.hujan[j])
        W["ws"].append(S.ws[j])
        W["wd"].append(S.wd[j])
        W["F"].append(Fh)
        W["hujan"].append(S.hujan[j])
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
    m = kalibrasi([k0], lambda k: rumput, lambda k: 0, tab, [0] * 73, target_ha=200)
    assert .02 <= m <= 2
    print("ok")
