"""Model bahaya banjir per kecamatan yang bisa dijelaskan -> public/banjir/data/model_bahaya.json

Pertanyaan: apakah faktor fisik dan paparan per kecamatan, digabung dengan bobot yang DIPELAJARI dari kejadian, lebih
tepat menunjuk kecamatan yang akan banjir daripada (a) peta InaRISK dan (b) kepadatan penduduk saja?

PRA-REGISTRASI (31 Okt 2026, ditulis dan di-commit SEBELUM label kecamatan ada di mesin ini):
  Unit       : kecamatan (kunci "prov|kab|kec"), hanya yang punya faktor lengkap.
  Label uji  : Y = 1 bila kecamatan punya >= 1 kejadian banjir 2022-2025 di label_kec.json (Groundsource), selain itu 0.
  Data latih : label 2016-2021 HANYA dipakai sebagai fitur pembanding persistensi (B_riw), tidak untuk menyetel M.
               Bobot M dipelajari dari Y_latih = >= 1 kejadian 2016-2021, lalu dinilai pada Y 2022-2025.
  Pemisahan  : validasi silang berkelompok per PROVINSI (5 lipatan, provinsi diacak dengan benih tetap). Kecamatan satu
               provinsi tidak pernah ada di latih dan uji sekaligus.
  Model M    : regresi logistik L2 (lambda 1,0) atas fitur yang distandarkan:
               InaRISK % zona sedang+tinggi, InaRISK % tinggi, log elevasi p50, relief, porsi titik rendah,
               log kepadatan, pesisir, log jarak sungai GloFAS, riwayat DIBI kabupaten per 100 ribu penduduk.
               Fitur yang null di > 20% kecamatan dibuang SEBELUM melihat label; null sisanya diisi median lipatan latih.
  Pembanding : B_ina = InaRISK % zona sedang+tinggi; B_pend = log kepadatan; B_riw = Y_latih (persistensi).
  Ukuran     : AUC (peluang kecamatan banjir diberi skor lebih tinggi dari kecamatan tak banjir), dari skor di luar lipatan.
               Selang 95% bootstrap 1.000 ulangan atas PROVINSI (blok), berpasangan untuk selisih.
  Vonis      : L1 bila batas bawah CI95 [AUC(M) - AUC(B_ina)]  > 0
               L2 bila batas bawah CI95 [AUC(M) - AUC(B_pend)] > 0
               Model boleh tampil sebagai "terkalibrasi" di layar hanya bila L1 DAN L2 lolos; selain itu label
               "Hipotesis, belum lolos uji" dan penjelasan faktor tetap tampil sebagai deskripsi, bukan ramalan.
  Dilaporkan tanpa vonis: AUC B_riw, presisi/recall/F1 pada 25% skor teratas, kinerja per pulau.
Penjelasan per kecamatan: kontribusi faktor j = b_j x z_ij (z = nilai terstandar). Tiga kontribusi terbesar ditulis,
beserta tandanya. Ini menjelaskan MODEL, bukan sebab fisik di lapangan.

Pakai:  python3 scripts/banjir/model_bahaya.py   |   python3 scripts/banjir/model_bahaya.py uji
"""
import json, math, os, random, sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA = os.path.join(AKAR, "public/banjir/data")
LABEL = os.path.join(AKAR, "data/raw/banjir/label_kec/label_kec.json")
TAHUN_LATIH = (2016, 2021)
TAHUN_UJI = (2022, 2025)
LIPAT = 5
LAMBDA = 1.0
ULANG = 1000
BENIH = 20261031
MAKS_NULL = 0.20


# ======================================================================== statistik murni (diuji di `uji`)
def auc(skor, y):
    """AUC Mann-Whitney dengan peringkat rata-rata untuk seri."""
    urut = sorted(range(len(skor)), key=lambda i: skor[i])
    r = [0.0] * len(skor)
    i = 0
    while i < len(urut):
        j = i
        while j + 1 < len(urut) and skor[urut[j + 1]] == skor[urut[i]]:
            j += 1
        for k in range(i, j + 1):
            r[urut[k]] = (i + j) / 2 + 1
        i = j + 1
    n1 = sum(y)
    n0 = len(y) - n1
    if not n1 or not n0:
        return float("nan")
    return (sum(rr for rr, yy in zip(r, y) if yy) - n1 * (n1 + 1) / 2) / (n1 * n0)


def standar(kolom):
    """-> (rata, simpangan) dengan simpangan minimal 1e-9."""
    n = len(kolom)
    m = sum(kolom) / n
    s = math.sqrt(sum((x - m) ** 2 for x in kolom) / n)
    return m, max(s, 1e-9)


def logistik(X, y, lam=LAMBDA, iterasi=50):
    """Regresi logistik L2 (intersep tidak dihukum), Newton-Raphson. X: daftar baris (sudah terstandar)."""
    p = len(X[0])
    b = [0.0] * (p + 1)
    for _ in range(iterasi):
        g = [0.0] * (p + 1)
        H = [[0.0] * (p + 1) for _ in range(p + 1)]
        for xi, yi in zip(X, y):
            z = b[0] + sum(bj * xj for bj, xj in zip(b[1:], xi))
            mu = 1 / (1 + math.exp(-max(-30, min(30, z))))
            w = mu * (1 - mu)
            v = [1.0] + list(xi)
            for a in range(p + 1):
                g[a] += (yi - mu) * v[a]
                for c in range(a, p + 1):
                    H[a][c] += w * v[a] * v[c]
        for a in range(1, p + 1):
            g[a] -= lam * b[a]
            H[a][a] += lam
        for a in range(p + 1):
            for c in range(a):
                H[a][c] = H[c][a]
        d = selesaikan(H, g)
        b = [bi + di for bi, di in zip(b, d)]
        if max(abs(x) for x in d) < 1e-8:
            break
    return b


def selesaikan(A, v):
    """Eliminasi Gauss dengan pivot sebagian: A x = v."""
    n = len(v)
    M = [row[:] + [v[i]] for i, row in enumerate(A)]
    for k in range(n):
        piv = max(range(k, n), key=lambda i: abs(M[i][k]))
        M[k], M[piv] = M[piv], M[k]
        if abs(M[k][k]) < 1e-12:
            continue
        for i in range(k + 1, n):
            f = M[i][k] / M[k][k]
            for j in range(k, n + 1):
                M[i][j] -= f * M[k][j]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        s = M[i][n] - sum(M[i][j] * x[j] for j in range(i + 1, n))
        x[i] = s / M[i][i] if abs(M[i][i]) > 1e-12 else 0.0
    return x


def skor_logit(b, x):
    return b[0] + sum(bj * xj for bj, xj in zip(b[1:], x))


def lipatan(provinsi, k=LIPAT, benih=BENIH):
    """provinsi unik -> {prov: nomor lipatan}, diacak dengan benih tetap."""
    pv = sorted(set(provinsi))
    random.Random(benih).shuffle(pv)
    return {p: i % k for i, p in enumerate(pv)}


def bootstrap_blok(fungsi, blok, ulang=ULANG, benih=BENIH):
    """fungsi(indeks) -> angka; resampel BLOK (provinsi) dengan pengembalian. -> [titik, bawah, atas]."""
    grup = {}
    for i, g in enumerate(blok):
        grup.setdefault(g, []).append(i)
    kunci = sorted(grup)
    rng = random.Random(benih)
    titik = fungsi(list(range(len(blok))))
    vs = []
    for _ in range(ulang):
        idx = [i for _ in kunci for i in grup[kunci[rng.randrange(len(kunci))]]]
        v = fungsi(idx)
        if v == v:  # buang nan (sampel tanpa kelas positif atau negatif)
            vs.append(v)
    vs.sort()
    return [round(titik, 3), round(vs[int(.025 * len(vs))], 3), round(vs[int(.975 * len(vs)) - 1], 3)]


def prf_atas(skor, y, porsi=.25):
    n = len(skor)
    batas = sorted(skor, reverse=True)[max(0, int(porsi * n) - 1)]
    pos = [s >= batas for s in skor]
    tp = sum(1 for a, b in zip(pos, y) if a and b)
    p = tp / max(1, sum(pos))
    r = tp / max(1, sum(y))
    return {"presisi": round(p, 3), "recall": round(r, 3), "f1": round(2 * p * r / (p + r), 3) if p + r else 0.0,
            "laju_dasar": round(sum(y) / n, 3)}


def kontribusi(b, x, nama, n=3):
    """-> [(nama, b_j * z_j)] n terbesar menurut nilai mutlak."""
    k = [(nm, bj * xj) for nm, bj, xj in zip(nama, b[1:], x)]
    return sorted(k, key=lambda t: -abs(t[1]))[:n]


# ======================================================================== data (diisi sesudah faktor_kec.json dan label ada)
def main():
    raise SystemExit("Menunggu faktor_kec.json dan label_kec.json; pemuat ditulis sesudah skema faktor tetap.")


def uji():
    assert auc([1, 2, 3, 4], [0, 0, 1, 1]) == 1.0
    assert auc([4, 3, 2, 1], [0, 0, 1, 1]) == 0.0
    assert auc([1, 1, 1, 1], [0, 1, 0, 1]) == 0.5
    assert auc([1, 2], [1, 1]) != auc([1, 2], [1, 1])  # nan bila satu kelas
    m, s = standar([2, 4, 4, 4, 5, 5, 7, 9])
    assert m == 5 and abs(s - 2) < 1e-12
    x = selesaikan([[2, 1], [1, 3]], [3, 5])
    assert abs(x[0] - .8) < 1e-9 and abs(x[1] - 1.4) < 1e-9
    # data terpisah sempurna-ish: koefisien positif, AUC tinggi
    rng = random.Random(1)
    X = [[rng.gauss(0, 1)] for _ in range(400)]
    y = [1 if xi[0] + rng.gauss(0, .5) > 0 else 0 for xi in X]
    b = logistik(X, y)
    assert b[1] > 1 and auc([skor_logit(b, xi) for xi in X], y) > .9
    # fitur derau: koefisien dekat nol
    Xn = [[rng.gauss(0, 1)] for _ in range(400)]
    assert abs(logistik(Xn, y)[1]) < .3
    lp = lipatan(["11", "12", "13", "14", "15", "16"], k=3)
    assert sorted(lp.values()) == [0, 0, 1, 1, 2, 2]
    t, lo, hi = bootstrap_blok(lambda idx: auc([i for i in idx], [1 if i >= 10 else 0 for i in idx]),
                               [i // 4 for i in range(20)], ulang=200)
    assert t == 1.0 and lo == 1.0
    assert prf_atas([4, 3, 2, 1], [1, 0, 0, 0])["presisi"] == 1.0
    assert [n for n, _ in kontribusi([0, .1, -2, 1], [1, 1, 1], ["a", "b", "c"], 2)] == ["b", "c"]
    print("ok model_bahaya")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
