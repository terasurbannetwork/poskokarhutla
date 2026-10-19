"""Uji tren jangka panjang (B06): Mann-Kendall + kemiringan Theil-Sen atas seri tahunan BNPB di dampak_gunungapi.json (`tahunan`).

Mann-Kendall (tanpa asumsi sebaran, tahan pencilan): S = jumlah tanda (y_j - y_i) untuk j > i; var(S) dengan koreksi data kembar
n(n-1)(2n+5)/18 - sum t(t-1)(2t+5)/18; Z = (S -/+ 1)/sqrt(var) (koreksi kontinuitas); p dua sisi dari normal baku (math.erfc).
Theil-Sen: median semua kemiringan (y_j - y_i)/(x_j - x_i) per tahun. Vonis: p < 0,05 dan S > 0 "naik", S < 0 "turun", selain itu "tidak bermakna".
Batas: seri 15 tahun (2010-2024) pendek; p memakai hampiran normal (cukup untuk n >= 10); autokorelasi tidak dikoreksi; kenaikan pelaporan
BNPB (mis. 58 kejadian pada 2018, hampir semuanya Anak Krakatau) ikut terbaca sebagai tren. Tren bukan prakiraan letusan.
Pakai:  from tren import uji_seri; dipanggil dampak.py.   python3 scripts/gunungapi/tren.py uji   self-check
"""
import math, statistics, sys

ALFA = 0.05
MIN_TAHUN = 8


def mann_kendall(y):
    """-> (S, Z, p) untuk deret y (urutan waktu). p=1 bila n < 3 atau variansi 0."""
    n = len(y)
    s = sum((y[j] > y[i]) - (y[j] < y[i]) for i in range(n) for j in range(i + 1, n))
    kembar = {}
    for v in y:
        kembar[v] = kembar.get(v, 0) + 1
    var = n * (n - 1) * (2 * n + 5) / 18 - sum(t * (t - 1) * (2 * t + 5) / 18 for t in kembar.values())
    if n < 3 or var <= 0:
        return s, 0.0, 1.0
    z = (s - 1) / math.sqrt(var) if s > 0 else (s + 1) / math.sqrt(var) if s < 0 else 0.0
    return s, z, math.erfc(abs(z) / math.sqrt(2))


def theil_sen(x, y):
    """Median kemiringan antar semua pasangan titik dengan x berbeda."""
    k = [(y[j] - y[i]) / (x[j] - x[i]) for i in range(len(x)) for j in range(i + 1, len(x)) if x[j] != x[i]]
    return statistics.median(k) if k else 0.0


def uji_seri(tahun, nilai):
    """tahun urut naik, nilai sejajar -> {n, dari, sampai, S, z, p, kemiringan, vonis} atau None bila < MIN_TAHUN titik."""
    if len(nilai) < MIN_TAHUN:
        return None
    s, z, p = mann_kendall(nilai)
    vonis = "naik" if p < ALFA and s > 0 else "turun" if p < ALFA and s < 0 else "tidak bermakna"
    return {"n": len(nilai), "dari": tahun[0], "sampai": tahun[-1], "S": s, "z": round(z, 3), "p": float(f"{p:.3g}"), "kemiringan": round(theil_sen(tahun, nilai), 2), "vonis": vonis}


def dari_tahunan(th):
    """th = {"2010": {"kejadian": n, ...}} -> {metrik: hasil}; tahun tanpa metrik itu dilewati (bukan dianggap 0)."""
    out = {}
    for m in ("kejadian", "terdampak", "mengungsi", "rumah_rusak"):
        t = sorted(k for k in th if th[k].get(m) is not None)
        r = uji_seri([int(k) for k in t], [th[k][m] for k in t]) if t else None
        if r:
            out[m] = r
    return out


def uji():
    s, z, p = mann_kendall(list(range(10)))
    assert s == 45 and abs(z - 44 / math.sqrt(125)) < 1e-12 and 7e-5 < p < 1e-4, (s, z, p)
    assert mann_kendall([3] * 10) == (0, 0.0, 1.0)
    s2, _, p2 = mann_kendall(list(range(10, 0, -1)))
    assert s2 == -45 and abs(p2 - p) < 1e-15
    assert abs(theil_sen(list(range(6)), [1, 3, 5, 7, 9, 100]) - 2) < 1e-12   # satu pencilan tidak menggeser median
    ac = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8]   # acak: tidak bermakna
    assert uji_seri(list(range(2000, 2012)), ac)["vonis"] == "tidak bermakna"
    r = uji_seri(list(range(2000, 2012)), [2 * i + (i % 3) for i in range(12)])
    assert r["vonis"] == "naik" and abs(r["kemiringan"] - 2) < .6 and r["p"] < .001, r
    assert uji_seri([1, 2, 3], [1, 2, 3]) is None
    # kembar: S dihitung dengan tanda, variansi dikoreksi
    s3, _, p3 = mann_kendall([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3])
    assert s3 == 48 and p3 < .001
    print("tren gunungapi: ok")


if __name__ == "__main__":
    uji()
