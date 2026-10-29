"""Rumus murni modul longsor (stdlib). Tiap fungsi punya cek di uji().

Tanah -> Curve Number (SCS-CN):
  tekstur USDA dari pasir/liat (%) -> kelompok hidrologi tanah (HSG, aturan NRCS NEH-630 bab 7)
  -> CN2 (padang rumput/semak kondisi sedang, tutupan lahan belum dipakai) -> S = 25400/CN - 254 (mm), Ia = 0,2 S
  -> Q = (P - 0,2 S)^2 / (P + 0,8 S) untuk P > 0,2 S.
Kerentanan gaya LHASA (Stanley & Kirschbaum 2017), DIBANGUN ULANG dari bobot tetap, TIDAK dilatih pada label:
  S = 0,6 skor_lereng + 0,2 skor_tanah + 0,2 skor_sesar   (tutupan lahan: belum ada data per kec, bobotnya 0)
Pemicu: t = R7 / P95 sel (hujan 7 hari terakhir dibanding persentil 95 hujan 7 hari sel itu pada tahun latih).
Bahaya: tinggi bila t >= 1 dan S >= S_TINGGI; sedang bila (t >= 1 dan S >= S_SEDANG) atau (t >= 0,8 dan S >= S_TINGGI); selain itu rendah.
"""
import math

CN2 = {"A": 49, "B": 69, "C": 79, "D": 84}    # pasture/range, fair (NEH-630 tabel 9-1)
BOBOT = {"lereng": 0.6, "tanah": 0.2, "sesar": 0.2}
S_TINGGI, S_SEDANG, T_AMBANG, T_DEKAT = 0.50, 0.30, 1.0, 0.8
LERENG_NOL, LERENG_PENUH = 5.0, 30.0           # derajat: di bawah 5 tak rawan, di atas 30 penuh
SESAR_JAUH = 50.0                              # km: di luar jarak ini skor sesar 0


def tekstur(pasir, liat):
    """USDA: pasir, liat (%) -> nama kelas tekstur (silt = sisa)."""
    lanau = 100 - pasir - liat
    if lanau + 1.5 * liat < 15:
        return "sand"
    if lanau + 2 * liat < 30:
        return "loamy sand"
    if (7 <= liat < 20 and pasir > 52 and lanau + 2 * liat >= 30) or (liat < 7 and lanau < 50):
        return "sandy loam"
    if 7 <= liat < 27 and 28 <= lanau < 50 and pasir <= 52:
        return "loam"
    if (lanau >= 50 and 12 <= liat < 27) or (50 <= lanau < 80 and liat < 12):
        return "silt loam"
    if lanau >= 80 and liat < 12:
        return "silt"
    if 20 <= liat < 35 and lanau < 28 and pasir > 45:
        return "sandy clay loam"
    if 27 <= liat < 40 and 20 < pasir <= 45:
        return "clay loam"
    if 27 <= liat < 40 and pasir <= 20:
        return "silty clay loam"
    if liat >= 35 and pasir > 45:
        return "sandy clay"
    if liat >= 40 and lanau >= 40:
        return "silty clay"
    if liat >= 40:
        return "clay"
    return "loam"   # ponytail: sisa celah segitiga (batas kelas) dilipat ke loam, HSG B


HSG_TEKSTUR = {"sand": "A", "loamy sand": "A", "sandy loam": "A", "loam": "B", "silt loam": "B", "silt": "B",
               "sandy clay loam": "C", "clay loam": "D", "silty clay loam": "D", "sandy clay": "D", "silty clay": "D", "clay": "D"}


def hsg(pasir, liat):
    return HSG_TEKSTUR[tekstur(pasir, liat)]


def cn(kel):
    return CN2[kel]


def retensi_mm(cn_):
    """S (mm) dari CN."""
    return 25400 / cn_ - 254


def aliran_mm(p, cn_):
    """Q (mm) dari hujan p (mm); Ia = 0,2 S."""
    s = retensi_mm(cn_)
    return 0.0 if p <= 0.2 * s else (p - 0.2 * s) ** 2 / (p + 0.8 * s)


def _langkah(x, a, b):
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def skor_lereng(derajat):
    return _langkah(derajat, LERENG_NOL, LERENG_PENUH)


def skor_tanah(cn_):
    """Tanah lebih lempung (CN tinggi, infiltrasi rendah) lebih cepat jenuh: CN 49 -> 0, CN 84 -> 1."""
    return min(1.0, max(0.0, (cn_ - CN2["A"]) / (CN2["D"] - CN2["A"])))


def skor_sesar(km_):
    return max(0.0, 1 - km_ / SESAR_JAUH)


def kerentanan(lereng_deg, cn_, sesar_km):
    return BOBOT["lereng"] * skor_lereng(lereng_deg) + BOBOT["tanah"] * skor_tanah(cn_) + BOBOT["sesar"] * skor_sesar(sesar_km)


def persentil(xs, p):
    """Peringkat terdekat (tanpa interpolasi), p 0..100; xs boleh tak terurut."""
    s = sorted(xs)
    return s[min(len(s) - 1, max(0, math.ceil(p / 100 * len(s)) - 1))]


def jumlah7(harian):
    """Hujan bergulir 7 hari berakhir di hari i (indeks >= 6); hari yang -1 (kosong) membuat jendela None."""
    out, s, kosong = [], 0, 0
    for i, v in enumerate(harian):
        if v < 0:
            kosong += 1
        else:
            s += v
        if i >= 7:
            u = harian[i - 7]
            if u < 0:
                kosong -= 1
            else:
                s -= u
        out.append(None if i < 6 or kosong else s)
    return out


def bahaya(s, t):
    if t >= T_AMBANG and s >= S_TINGGI:
        return 2
    if (t >= T_AMBANG and s >= S_SEDANG) or (t >= T_DEKAT and s >= S_TINGGI):
        return 1
    return 0


def skor(s, t):
    """Skor kontinu untuk AUC: kerentanan x pemicu (t dipotong di 2 agar satu hujan ekstrem tak menenggelamkan peringkat)."""
    return s * min(t, 2.0)


def auc(pos, neg):
    """AUC = P(skor positif > skor negatif) + 0,5 P(sama); lewat peringkat (Mann-Whitney), O(n log n)."""
    if not pos or not neg:
        return None
    semua = sorted([(v, 1) for v in pos] + [(v, 0) for v in neg])
    n, i, rp = len(semua), 0, 0.0
    while i < n:
        j = i
        while j < n and semua[j][0] == semua[i][0]:
            j += 1
        rata = (i + j + 1) / 2          # peringkat 1-berbasis rata-rata untuk skor kembar
        rp += rata * sum(1 for k in range(i, j) if semua[k][1])
        i = j
    return (rp - len(pos) * (len(pos) + 1) / 2) / (len(pos) * len(neg))


def pod_far(tp, fp, fn):
    """POD = tp/(tp+fn); FAR = fp/(tp+fp); keduanya None bila penyebut 0."""
    return (tp / (tp + fn) if tp + fn else None), (fp / (tp + fp) if tp + fp else None)


def uji():
    assert tekstur(92, 3) == "sand" and hsg(92, 3) == "A"
    assert tekstur(40, 20) == "loam" and hsg(40, 20) == "B" and tekstur(20, 10) == "silt loam"
    assert tekstur(10, 60) == "clay" and hsg(10, 60) == "D"
    assert tekstur(60, 30) == "sandy clay loam" and hsg(60, 30) == "C"
    assert tekstur(10, 35) == "clay loam" or tekstur(10, 35) == "silty clay loam"
    assert all(hsg(p, c) in "ABCD" for p in range(0, 101, 5) for c in range(0, 101 - p, 5))   # seluruh segitiga terpetakan
    s = retensi_mm(75)
    assert abs(s - 84.67) < .01, s                          # CN 75 -> S 84,67 mm (NEH-630)
    assert aliran_mm(10, 75) == 0.0                         # P < Ia = 16,9 mm
    assert abs(aliran_mm(100, 75) - 41.14) < .01, aliran_mm(100, 75)   # 83,07^2 / 167,73
    assert aliran_mm(50, 84) > aliran_mm(50, 49)
    assert skor_lereng(2) == 0 and skor_lereng(40) == 1 and 0.4 < skor_lereng(17.5) < 0.6
    assert skor_tanah(49) == 0 and skor_tanah(84) == 1 and skor_sesar(0) == 1 and skor_sesar(80) == 0
    assert abs(kerentanan(30, 84, 0) - 1.0) < 1e-9 and kerentanan(0, 49, 100) == 0
    assert persentil(list(range(1, 101)), 95) == 95 and persentil([3, 1, 2], 95) == 3
    j = jumlah7([10] * 8)
    assert j[:6] == [None] * 6 and j[6] == 70 and j[7] == 70
    j = jumlah7([1] * 7 + [-1] + [1] * 8)
    assert j[7] is None and j[13] is None and j[14] == 7 and j[6] == 7   # jendela memuat hari kosong -> None, lepas di hari ke-14
    assert bahaya(.6, 1.0) == 2 and bahaya(.35, 1.2) == 1 and bahaya(.6, .85) == 1 and bahaya(.2, 3) == 0 and bahaya(.9, .5) == 0
    assert skor(.5, 5) == 1.0
    assert auc([3, 4], [1, 2]) == 1.0 and auc([1, 2], [3, 4]) == 0.0 and auc([1, 1], [1, 1]) == 0.5 and auc([], [1]) is None
    assert abs(auc([2, 4], [1, 3]) - 0.75) < 1e-12
    assert pod_far(8, 2, 2) == (0.8, 0.2) and pod_far(0, 0, 0) == (None, None)
    print("rumus longsor: uji lolos")


if __name__ == "__main__":
    uji()
