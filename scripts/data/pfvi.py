"""Peat Fire Vulnerability Index (PFVI), port dari peatfr (R) ke Python stdlib.

Sumber: github.com/mellygsln/peatfr, R/Function Fire Predict.R (Mahdiyasa dkk., Ecological Informatics 92, 2025, 103532);
indeks asalnya Taufik dkk. 2022 (Agricultural and Forest Meteorology): KBDI (skala 0-300) + faktor muka air tanah gambut
(kurva retensi van Genuchten). Kelas peatfr: Rendah <= 75, Sedang <= 150, Tinggi <= 225, Ekstrem > 225.

  x[t+1] = clamp(x[t], 0, 300) + DF - RF - WTF
  DF  = (300 - x) (0,4982 e^(0,0905 T + 1,6096) - 4,268) dt 1e-3 / (1 + 10,88 e^(-0,001736 R0))   T = suhu harian (C), R0 = hujan tahunan (mm)
  RF  = hujan bersih: kemarin <= 5,1 mm (atau tidak ada) -> max(0, hujan - 5,1); kemarin > 5,1 mm -> seluruh hujan hari ini
  WTF = aH - bH (1 - theta(h)) 300,  theta = (1 + (h/alpha)^n)^-(1 - 1/n),  h = kedalaman muka air (cm, >= 0)

Dua bug upstream yang diperbaiki di sini:
  (a) `Rf_b <- c(Rf[-length(Rf)], NA)` menjadikan "hujan kemarin" = hujan HARI INI (vektor tidak digeser), dan hari
      terakhir NA. Yang benar `c(NA, Rf[-n])`: hari pertama tanpa kemarin, hari t memakai hujan t-1. Lihat hujan_kemarin().
  (b) Pencarian kisi `m <- 1/par3; for i in 1:m ...` memanggil optim m^4 kali (par3 = 0,01 -> 10^8) dan berjalan mundur
      bila par3 negatif (1:-5). Diganti Nelder-Mead multi-awal dengan batas (kalibrasi()), tulisan tangan seperti gbdt.py.
Satu perbaikan kecil tambahan: (h/alpha)^n untuk alpha <= 0 atau n <= 1 tidak terdefinisi (R menghasilkan NaN diam-diam);
di sini batas parameter menjaganya (n > 1, alpha > 0).

Yang TIDAK di-port: peramalan ARIMA/LSTM/GRU (prakiraan cuaca numerik ansambel lebih baik; lihat ansambel_pfvi()) dan
target kalibrasi DIobs dari kelembapan tanah (melingkar: indeks dicocokkan ke kelembapan tanah yang juga membentuknya).
DIobs tetap ada untuk keadaan awal.

Muka air tanah: tidak ada pengamatan (SiPALAGA/BRGM menolak 403), jadi muka_air_proxy() = ember hujan - ET0 yang batasnya
dikalibrasi pada dataset Zenodo 17907349 (muka air & kejadian api Kalimantan). Keluaran yang memakainya WAJIB diberi label
"muka air = perkiraan (proxy), bukan pengukuran". Angka uji balik: scripts/sebaran/RISET-PFVI.md.

Pakai:  python3 scripts/data/pfvi.py      (self-check)
"""
import math, random

KELAS = ["Rendah", "Sedang", "Tinggi", "Ekstrem"]
R0_BAKU = 3000.0
# (aH, bH, n, alpha): bawaan = hasil kalibrasi RISET-PFVI.md (n, alpha dari Zenodo; aH, bH dari api VIIRS 2015 & 2018)
PAR_BAKU = (2.2022, 0.04276, 3.0, 150.0)


def DF(x, temp, r0=R0_BAKU, dt=1.0):
    return (300 - x) * (0.4982 * math.exp(0.0905 * temp + 1.6096) - 4.268) * dt * 1e-3 / (1 + 10.88 * math.exp(-0.00173582677165354 * r0))


def RF(hujan, kemarin):
    if kemarin is None or kemarin <= 5.1:
        return 0.0 if hujan < 5.1 else hujan - 5.1
    return hujan


def WTF(aH, bH, n, h, alpha):
    m = 1 - 1 / n
    theta = (1 + (h / alpha) ** n) ** (-m)
    return aH - bH * ((1 - theta) * 300)


def DIobs(sm, fc=40.0, sat=70.0):
    """Indeks kekeringan dari kelembapan tanah (%, volumetrik). Dipakai upstream untuk keadaan awal (dan target kalibrasi)."""
    return 300 * (1 - (sm - fc) / (sat - fc))


def hujan_kemarin(hujan):
    """Perbaikan bug (a): [None, r0, r1, ..., r(n-2)]."""
    return [None] + list(hujan[:-1])


def deret(wt, hujan, temp, par=PAR_BAKU, x0=0.0, r0=R0_BAKU, dt=1.0, kemarin0=None):
    """wt: muka air (cm, negatif = di bawah permukaan), hujan (mm), temp (C) per hari. -> PFVI per hari (sudah dibatasi 0-300).
    x0 = keadaan sebelum hari pertama (upstream: DIobs(SM[1])); kemarin0 = hujan sehari sebelum hari pertama (lanjutan)."""
    aH, bH, n, alpha = par
    x, out, kem = x0, [], kemarin0
    for w, r, t in zip(wt, hujan, temp):
        x0_ = max(min(x, 300), 0)
        h = 0.0 if w > 0 else -w
        x = x0_ + DF(x0_, t, r0, dt) - RF(r, kem) - WTF(aH, bH, n, h, alpha)
        kem = r
        out.append(max(min(x, 300), 0))
    return out


def kelas(x):
    return 0 if x <= 75 else 1 if x <= 150 else 2 if x <= 225 else 3


# ---------------- muka air tanah: proxy ember ----------------
# Batas dari Zenodo 17907349 (58.245 sel ~1 km Kalimantan): muka air -188,7 .. +22,8 cm.
WT_ATAS, WT_BAWAH = 22.8, -188.7
WT_PAR_BAKU = (0.05, 0.505, 0.0)  # (Sy hasil jenis, faktor ET, kebocoran cm/hari); disetel di RISET-PFVI.md (Sy di batas bawah)


def muka_air_proxy(hujan, et0, par=WT_PAR_BAKU, wt0=0.0):
    """Ember gambut: dWT (cm) = (hujan - k ET0) / (10 Sy) - bocor, dibatasi [WT_BAWAH, WT_ATAS]. hujan, et0 dalam mm/hari.
    Air di atas permukaan (WT > 0) mengalir cepat: separuhnya hilang tiap hari. PROXY, bukan pengukuran."""
    sy, k, bocor = par
    wt, out = wt0, []
    for r, e in zip(hujan, et0):
        wt += (r - k * e) / (10 * sy) - bocor
        if wt > 0:
            wt *= 0.5
        wt = max(min(wt, WT_ATAS), WT_BAWAH)
        out.append(wt)
    return out


# ---------------- prakiraan ansambel ----------------
def ansambel_pfvi(x0, wt0, kemarin0, anggota, par=PAR_BAKU, wt_par=WT_PAR_BAKU, r0=R0_BAKU):
    """anggota: [[(hujan, et0, tmaks) per hari +1..+7] per anggota IFS]. Keadaan awal (x0, wt0, kemarin0) dari analisis hari ini.
    -> per hari: med, p10, p90 PFVI dan pt = P(PFVI > 150, Tinggi atau Ekstrem) = pecahan anggota."""
    seri = []
    for a in anggota:
        r, e, t = zip(*a)
        seri.append(deret(muka_air_proxy(r, e, wt_par, wt0), r, t, par, x0, r0, kemarin0=kemarin0))
    out = []
    for d in range(len(seri[0])):
        v = sorted(s[d] for s in seri)
        q = lambda p: v[min(len(v) - 1, int(round(p * (len(v) - 1))))]
        out.append({"med": round(q(.5), 1), "p10": round(q(.1), 1), "p90": round(q(.9), 1),
                    "pt": round(sum(x > 150 for x in v) / len(v), 2)})
    return out


# ---------------- kalibrasi: Nelder-Mead berbatas, multi-awal (perbaikan bug b) ----------------
def nelder_mead(f, x0, langkah, iterasi=400, tol=1e-9):
    n = len(x0)
    S = [list(x0)] + [[x0[j] + (langkah[j] if j == i else 0) for j in range(n)] for i in range(n)]
    F = [f(s) for s in S]
    for _ in range(iterasi):
        o = sorted(range(n + 1), key=F.__getitem__)
        S, F = [S[i] for i in o], [F[i] for i in o]
        if abs(F[-1] - F[0]) <= tol * (1 + abs(F[0])):
            break
        c = [sum(S[i][j] for i in range(n)) / n for j in range(n)]
        titik = lambda a: [c[j] + a * (S[-1][j] - c[j]) for j in range(n)]
        xr = titik(-1)
        fr = f(xr)
        if fr < F[0]:
            xe = titik(-2)
            fe = f(xe)
            S[-1], F[-1] = (xe, fe) if fe < fr else (xr, fr)
        elif fr < F[-2]:
            S[-1], F[-1] = xr, fr
        else:
            xc = titik(0.5 if fr >= F[-1] else -0.5)
            fc = f(xc)
            if fc < min(fr, F[-1]):
                S[-1], F[-1] = xc, fc
            else:  # kerutkan ke titik terbaik
                S = [S[0]] + [[S[0][j] + 0.5 * (s[j] - S[0][j]) for j in range(n)] for s in S[1:]]
                F = [F[0]] + [f(s) for s in S[1:]]
    i = min(range(n + 1), key=F.__getitem__)
    return S[i], F[i]


def kalibrasi(rugi, batas, awal=12, seed=1, iterasi=400):
    """Minimalkan rugi(par) dengan par di dalam batas [(lo, hi), ...]. Nelder-Mead di ruang tak berbatas lewat transformasi
    logistik, dari `awal` titik acak (Latin hypercube) + pusat kotak. Jumlah evaluasi ~ awal x iterasi, tidak meledak."""
    rnd = random.Random(seed)
    n = len(batas)
    ke = lambda z: [lo + (hi - lo) / (1 + math.exp(-max(min(zj, 30), -30))) for zj, (lo, hi) in zip(z, batas)]
    dari = lambda p: [math.log((pj - lo) / (hi - pj)) for pj, (lo, hi) in zip(p, batas)]
    lapis = [rnd.sample(range(awal), awal) for _ in range(n)]
    titik = [[(lo + hi) / 2 for lo, hi in batas]] + [
        [lo + (hi - lo) * (lapis[j][i] + rnd.random()) / awal for j, (lo, hi) in enumerate(batas)] for i in range(awal)]
    terbaik = None
    for p in titik:
        p = [min(max(pj, lo + 1e-6 * (hi - lo)), hi - 1e-6 * (hi - lo)) for pj, (lo, hi) in zip(p, batas)]
        z, v = nelder_mead(lambda z: rugi(ke(z)), dari(p), [1.0] * n, iterasi)
        if terbaik is None or v < terbaik[1]:
            terbaik = (ke(z), v)
    return terbaik


# ---------------- self-check ----------------
def _r_pfvi(WT, SM, Rf, Rf_b, Temp, aH, bH, n, alpha, R0=3000, dt=1):
    """Transkripsi harfiah PFVI() dari R (indeks 1, x[1] = DIobs(SM[1], 40, 70), keluaran x[-1] TANPA batas)."""
    Time = len(WT)
    h = [0 if WT[i] > 0 else -WT[i] for i in range(Time)]
    x = [0.0] * (Time + 1)
    x[0] = 300 * (1 - ((SM[0] - 40) / (70 - 40)))
    for i in range(Time):
        x0 = max(min(x[i], 300), 0)
        df = (300 - x0) * (0.4982 * math.exp(0.0905 * Temp[i] + 1.6096) - 4.268) * dt * 10 ** (-3) / (1 + 10.88 * math.exp(-0.00173582677165354 * R0))
        rb = Rf_b[i]
        rf = (0 if Rf[i] < 5.1 else Rf[i] - 5.1) if (rb is None or rb <= 5.1) else Rf[i]
        mm = 1 - 1 / n
        theta = (1 + (h[i] / alpha) ** n) ** (-mm)
        wtf = aH - bH * ((1 - theta) * 300)
        x[i + 1] = x0 + df - rf - wtf
    return x[1:]


if __name__ == "__main__":
    WT = [-10, -25, -40, -55, -62, -70, 5, -20, -48, -65, -80, -95]
    SM = [60, 55, 50, 47, 45, 43, 66, 58, 52, 48, 44, 41]
    Rf = [0, 0, 12.0, 0, 3, 0, 40, 8, 0, 0, 0, 6]
    Temp = [32, 33, 31, 34, 34, 35, 28, 30, 33, 34, 35, 34]
    par = (1.5, 0.08, 2.2, 45.0)
    x0 = DIobs(SM[0])
    py = deret(WT, Rf, Temp, par, x0=x0)
    # (1) sama dengan R yang Rf_b-nya sudah diperbaiki c(NA, Rf[-n]), setelah pmax(pmin(., 300), 0) seperti firepredict()
    r_benar = [max(min(v, 300), 0) for v in _r_pfvi(WT, SM, Rf, hujan_kemarin(Rf), Temp, *par)]
    assert all(abs(a - b) < 1e-12 for a, b in zip(py, r_benar)), (py, r_benar)
    # (2) bug (a) upstream: Rf_b = hujan hari ini -> hari setelah 12 mm (hari ke-4, hujan 0) sama, tapi hari ke-3 (12 mm,
    #     kemarin 0) upstream menghitung seluruh 12 mm (karena "kemarin" = 12 > 5,1), versi benar hanya 12 - 5,1 = 6,9
    r_bug = [max(min(v, 300), 0) for v in _r_pfvi(WT, SM, Rf, Rf[:-1] + [None], Temp, *par)]
    assert abs(r_benar[2] - r_bug[2] - 5.1) < 1e-9 and r_benar[:2] == r_bug[:2], (r_benar[:3], r_bug[:3])
    # (3) hari 1 dihitung tangan: x0 = 300(1 - 20/30) = 100; T 32; h 10 cm; tanpa hujan
    df1 = 200 * (0.4982 * math.exp(0.0905 * 32 + 1.6096) - 4.268) / 1000 / (1 + 10.88 * math.exp(-0.00173582677165354 * 3000))
    th = (1 + (10 / 45) ** 2.2) ** -(1 - 1 / 2.2)
    assert abs(x0 - 100) < 1e-12 and abs(py[0] - (100 + df1 - (1.5 - 0.08 * (1 - th) * 300))) < 1e-12
    assert abs(df1 - 7.70695) < 1e-4, df1  # ~7,7 poin/hari pada 32 C di indeks 100 (R0 3.000 mm)
    # (4) kelas peatfr
    assert [kelas(v) for v in (0, 75, 75.01, 150, 151, 225, 226, 300)] == [0, 0, 1, 1, 2, 2, 3, 3]
    # (5) Nelder-Mead berbatas memulihkan parameter yang dipakai membuat deret (deret 120 hari sintetis)
    rnd = random.Random(7)
    n_ = 120
    wt = [-30 - 60 * math.sin(i / 19) ** 2 for i in range(n_)]
    rf = [rnd.choice([0, 0, 0, 2, 8, 20]) for _ in range(n_)]
    tt = [31 + 3 * rnd.random() for _ in range(n_)]
    benar = (2.0, 0.05, 2.5, 60.0)
    target = deret(wt, rf, tt, benar, x0=50)
    rugi = lambda p: sum((a - b) ** 2 for a, b in zip(deret(wt, rf, tt, p, x0=50), target)) / n_
    p, v = kalibrasi(rugi, [(-5, 5), (0, 0.3), (1.1, 6), (5, 300)], awal=6, iterasi=500)
    assert v < 1e-2 and all(lo <= pj <= hi for pj, (lo, hi) in zip(p, [(-5, 5), (0, 0.3), (1.1, 6), (5, 300)])), (p, v)
    # (6) proxy muka air: kemarau menurunkan, hujan besar menaikkan, selalu di dalam batas Zenodo
    kering = muka_air_proxy([0] * 200, [5] * 200)
    assert kering[0] < 0 and kering[-1] == WT_BAWAH and all(b <= a for a, b in zip(kering, kering[1:]))
    basah = muka_air_proxy([60] * 5, [4] * 5, wt0=-100)
    assert basah[-1] > -100 and max(basah) <= WT_ATAS
    # (7) ansambel: anggota identik -> p10 = med = p90; pt di [0, 1]
    a = [[(0, 5, 34)] * 7] * 5
    r = ansambel_pfvi(200, -80, 0, a)
    assert len(r) == 7 and all(d["p10"] == d["med"] == d["p90"] and 0 <= d["pt"] <= 1 for d in r)
    print("ok pfvi", [round(v, 2) for v in py[:4]], "kalibrasi", [round(x, 3) for x in p], round(v, 5))
