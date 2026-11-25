"""Selang konformal (KI-14, digabung ke KI-60). Python stdlib saja, fungsi murni.

  split(skor_kal, alfa)            -> q: kuantil ke-ceil((n+1)(1-alfa))/n dari skor kalibrasi (None bila n terlalu kecil)
  selang_titik(y, q)               -> (y-q, y+q)           split conformal pada residu absolut
  cqr(kuantil_bawah, kuantil_atas, skor_kal, alfa) -> (lo-q, hi+q)  CQR: skor = max(lo-y, y-hi)
  cakupan(selang, amat)            -> bagian pengamatan di dalam selang (periode uji terpisah)
  dalam_rentang(x, lo, hi)         -> gerbang lebar: pita tidak boleh tampil di luar rentang masukan kalibrasi
                                      (pola rentang_maks_mu, public/gempa/data/model_susulan.json)

  tren_linear(nilai, minimum=60)   -> regresi garis lurus deret bulanan + selang 95% (F-27, PB-53); deskriptif, bukan prakiraan.
                                      Galat berautokorelasi: n efektif = n(1-r1)/(1+r1) (Santer dkk. 2000), ragam dan derajat bebas
                                      memakai n efektif. Deret < minimum bulan -> {"cukup": False, "alasan": "deret terlalu pendek"}.

alfa 0,2 = pita 80% (P10-P90). Kuantil konformal butuh n >= ceil((n+1)(1-alfa)); bila tidak, q = None (tanpa pita, bukan pita tak hingga).
Pakai:  python3 -I scripts/umum/selang.py uji
"""
import math
import random
import sys
from statistics import NormalDist


def split(skor, alfa=0.2):
    s = sorted(x for x in skor if x is not None and math.isfinite(x))
    n = len(s)
    k = math.ceil((n + 1) * (1 - alfa))
    return s[k - 1] if n and k <= n else None


def selang_titik(y, q):
    return None if y is None or q is None else (y - q, y + q)


def cqr(lo, hi, skor_kal, alfa=0.2):
    """lo, hi: kuantil prediksi untuk satu kasus baru; skor_kal: [max(lo_i - y_i, y_i - hi_i)] dari set kalibrasi."""
    q = split(skor_kal, alfa)
    return None if q is None else (lo - q, hi + q)


def cakupan(selang, amat):
    """selang: [(lo, hi)|None]; amat: [y]. Pasangan tanpa selang tidak dihitung (dilaporkan lewat n). -> (cakupan, n)."""
    p = [(s, y) for s, y in zip(selang, amat) if s is not None and y is not None]
    return (sum(s[0] <= y <= s[1] for s, y in p) / len(p), len(p)) if p else (None, 0)


def dalam_rentang(x, lo, hi):
    return x is not None and lo is not None and hi is not None and lo <= x <= hi


def kuantil_t(p, db):
    """Kuantil distribusi t Student (ekspansi Cornish-Fisher dari normal; galat < 1e-3 untuk db >= 5)."""
    z = NormalDist().inv_cdf(p)
    return (z + (z ** 3 + z) / (4 * db) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * db ** 2)
            + (3 * z ** 7 + 19 * z ** 5 + 17 * z ** 3 - 15 * z) / (384 * db ** 3))


def tren_linear(nilai, minimum=60, alfa=0.05, langkah_pita=12):
    """nilai: deret bulanan berurutan tanpa celah (None = bulan kosong, tidak dihitung). x = indeks bulan 0..n-1.
    -> {cukup, n, n_efektif, r1, potong, lereng_bulan, lereng_dekade, selang_dekade [lo, hi], arah, pita [[i, garis, lo, hi]]}.
    arah "naik"/"turun" hanya bila selang 95% lereng tidak memuat nol; selain itu "tidak jelas"."""
    p = [(i, v) for i, v in enumerate(nilai) if v is not None and math.isfinite(v)]
    n = len(p)
    if n < minimum:
        return {"cukup": False, "n": n, "minimum": minimum, "alasan": "deret terlalu pendek"}
    xm = sum(i for i, _ in p) / n
    ym = sum(v for _, v in p) / n
    sxx = sum((i - xm) ** 2 for i, _ in p)
    b = sum((i - xm) * (v - ym) for i, v in p) / sxx
    a = ym - b * xm
    res = [v - (a + b * i) for i, v in p]
    sse = sum(e * e for e in res)
    r1 = sum(res[k] * res[k - 1] for k in range(1, n)) / sse if sse > 0 else 0.0
    ne = n * (1 - r1) / (1 + r1) if r1 > 0 else float(n)
    if ne < 8:
        return {"cukup": False, "n": n, "minimum": minimum, "n_efektif": round(ne, 1), "alasan": "deret terlalu bergantung antarbulan"}
    s2 = sse / (ne - 2)
    t = kuantil_t(1 - alfa / 2, ne - 2)
    se = math.sqrt(s2 / sxx)
    lo, hi = (b - t * se) * 120, (b + t * se) * 120
    akhir = p[-1][0]
    titik = sorted({*range(p[0][0], akhir + 1, langkah_pita), akhir})
    lebar = lambda i: t * math.sqrt(s2 * (1 / n + (i - xm) ** 2 / sxx))
    pita = [[i, round(a + b * i, 3), round(a + b * i - lebar(i), 3), round(a + b * i + lebar(i), 3)] for i in titik]
    return {"cukup": True, "n": n, "n_efektif": round(ne, 1), "r1": round(r1, 3), "potong": round(a, 5), "lereng_bulan": round(b, 6),
            "lereng_dekade": round(b * 120, 4), "selang_dekade": [round(lo, 4), round(hi, 4)], "tingkat_selang": 1 - alfa,
            "arah": "naik" if lo > 0 else "turun" if hi < 0 else "tidak jelas", "pita": pita}


def uji():
    assert split([1, 2, 3, 4, 5, 6, 7, 8, 9], 0.2) == 8          # ceil(10*0.8)=8 -> skor ke-8
    assert split([1, 2, 3], 0.2) is None and split([], 0.2) is None   # ceil(4*0.8)=4 > 3: tanpa pita
    assert split([1, None, float("nan"), 2, 3, 4, 5, 6, 7, 8, 9], 0.2) == 8
    assert selang_titik(10, 2) == (8, 12) and selang_titik(10, None) is None
    assert cqr(5, 9, [0.5, 1, 1, 1, 2, 2, 3, 3, 4], 0.2) == (5 - 3, 9 + 3)
    assert cakupan([(0, 1), (0, 1), None], [0.5, 2, 0.5]) == (0.5, 2) and cakupan([None], [1]) == (None, 0)
    assert dalam_rentang(5, 0, 10) and not dalam_rentang(11, 0, 10) and not dalam_rentang(None, 0, 10)
    # cakupan simulasi 80% +- 3%: Gaussian, kalibrasi 1000, uji terpisah 20000, tiga biji
    for biji in (1, 2, 3):
        r = random.Random(biji)
        kal = [abs(r.gauss(0, 1)) for _ in range(1000)]
        q = split(kal, 0.2)
        y = [r.gauss(0, 1) for _ in range(20000)]
        c, n = cakupan([selang_titik(0.0, q)] * len(y), y)
        assert abs(c - 0.8) <= 0.03 and n == 20000, f"cakupan simulasi {c:.4f} di luar 80% +- 3% (biji {biji}, q={q:.3f})"
    # CQR dengan kuantil model yang terlalu sempit: koreksi harus menaikkan cakupan ke ~80%
    r = random.Random(9)
    sk = [max(-0.3 - y, y - 0.3) for y in (r.gauss(0, 1) for _ in range(1000))]
    q = split(sk, 0.2)
    c, _ = cakupan([(-0.3 - q, 0.3 + q)] * 20000, [r.gauss(0, 1) for _ in range(20000)])
    assert abs(c - 0.8) <= 0.03, f"cakupan CQR {c:.4f}"
    # penolakan: pita sempit tanpa koreksi bukan 80%
    c0, _ = cakupan([(-0.3, 0.3)] * 20000, [r.gauss(0, 1) for _ in range(20000)])
    assert c0 < 0.5, "kontrol negatif: pita tanpa koreksi harusnya jauh di bawah 80%"
    # tren_linear: kuantil t, batas 60 bulan, cakupan 95% pada derau putih dan AR(1)
    assert abs(kuantil_t(0.975, 10) - 2.228) < 2e-3 and abs(kuantil_t(0.975, 58) - 2.0017) < 1e-3
    assert tren_linear([1.0] * 59)["cukup"] is False and tren_linear([1.0] * 59)["alasan"] == "deret terlalu pendek"
    assert tren_linear([1.0] * 30 + [None] * 40)["cukup"] is False                     # bulan kosong tidak dihitung
    for phi, minimal in ((0.0, 0.92), (0.6, 0.92)):
        kena = 0
        for biji in range(300):
            r = random.Random(100 + biji)
            e, d = 0.0, []
            for i in range(240):
                e = phi * e + r.gauss(0, 1)
                d.append(0.01 * i + e)
            h = tren_linear(d)
            kena += h["selang_dekade"][0] <= 1.2 <= h["selang_dekade"][1]
        assert kena / 300 >= minimal, f"cakupan selang 95% (phi {phi}) = {kena / 300:.3f}"
    naik = tren_linear([0.5 * i for i in range(72)])
    assert naik["arah"] == "naik" and abs(naik["lereng_dekade"] - 60) < 1e-9 and naik["pita"][-1][0] == 71
    acak = [random.Random(b) for b in range(200)]
    datar = sum(tren_linear([r.gauss(0, 1) for _ in range(120)])["arah"] != "tidak jelas" for r in acak)
    assert datar <= 20, f"kontrol negatif: {datar}/200 deret acak terbaca bertren"
    print("ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        sys.exit("pakai: python3 -I scripts/umum/selang.py uji")
