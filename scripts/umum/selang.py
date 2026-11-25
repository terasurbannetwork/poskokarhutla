"""Selang konformal (KI-14, digabung ke KI-60). Python stdlib saja, fungsi murni.

  split(skor_kal, alfa)            -> q: kuantil ke-ceil((n+1)(1-alfa))/n dari skor kalibrasi (None bila n terlalu kecil)
  selang_titik(y, q)               -> (y-q, y+q)           split conformal pada residu absolut
  cqr(kuantil_bawah, kuantil_atas, skor_kal, alfa) -> (lo-q, hi+q)  CQR: skor = max(lo-y, y-hi)
  cakupan(selang, amat)            -> bagian pengamatan di dalam selang (periode uji terpisah)
  dalam_rentang(x, lo, hi)         -> gerbang lebar: pita tidak boleh tampil di luar rentang masukan kalibrasi
                                      (pola rentang_maks_mu, public/gempa/data/model_susulan.json)

alfa 0,2 = pita 80% (P10-P90). Kuantil konformal butuh n >= ceil((n+1)(1-alfa)); bila tidak, q = None (tanpa pita, bukan pita tak hingga).
Pakai:  python3 -I scripts/umum/selang.py uji
"""
import math
import random
import sys


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
    print("ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        sys.exit("pakai: python3 -I scripts/umum/selang.py uji")
