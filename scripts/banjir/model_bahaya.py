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
Amandemen 31 Okt 2026, sesudah label_kec.json jadi tetapi SEBELUM hubungan label dengan fitur mana pun dilihat:
  Label utama memakai n_th (kejadian unik kecamatan-tanggal, poligon dihitung di kecamatan titik beratnya). Sebagian
  besar poligon melintasi beberapa kecamatan (median bentang ~15 km), jadi label ini sebagian bermakna "kawasan".
  Uji kepekaan TANPA vonis: label n_th_tunggal (hanya poligon kecil di satu kecamatan, 879 kecamatan).
  Groundsource berasal dari berita dan condong ke kota; karena itu pembanding kepadatan (L2) adalah syarat utama.
Amandemen 31 Okt 2026 (temuan pemeriksa, sebelum model pernah dijalankan): fitur riwayat DIBI kabupaten memakai
  kejadian 2008-2021 saja (kolom kej_100rb_latih), supaya kejadian periode uji 2022-2025 tidak bocor ke fitur.
  Label dibangun ulang sesudah bug pembaca WKB Polygon dibetulkan; angka lama label tidak dipakai.
Amandemen 31 Okt 2026, sesudah label diperbaiki dan SEBELUM hubungan label-fitur dilihat (yang dilihat hanya sebaran
  label sendiri): 87% kecamatan punya >= 1 kejadian 2022-2025, sehingga label biner tak membedakan. Label diganti:
  Y_uji   = 1 bila jumlah kejadian n_th 2022-2025 >= persentil 75 seluruh 7.270 kecamatan (kecamatan tanpa entri = 0);
  Y_latih = 1 bila jumlah kejadian n_th 2016-2021 >= persentil 75-nya; B_riw = jumlah kejadian 2016-2021 (peringkat).
  Kepekaan tanpa vonis: sama dengan n_th_tunggal.
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


# ======================================================================== data
# (nama, kolom faktor_kec.json, ubahan). Urutan = urutan pra-registrasi.
FITUR = [
    ("InaRISK zona sedang+tinggi", ("zona_sedang", "zona_tinggi"), lambda a, b: a + b),
    ("InaRISK zona tinggi", ("zona_tinggi",), lambda a: a),
    ("Elevasi tengah (log)", ("elev_p50",), lambda a: math.log1p(max(0.0, a))),
    ("Beda tinggi", ("relief",), lambda a: a),
    ("Dataran rendah lokal", ("rendah",), lambda a: a),
    ("Kepadatan (log)", ("padat",), lambda a: math.log1p(a)),
    ("Pesisir", ("pesisir",), lambda a: a),
    ("Jarak titik sungai (log)", ("jarak_sungai",), lambda a: math.log1p(a)),
    ("Riwayat DIBI kabupaten 2008-2021", ("kej_100rb_latih",), lambda a: a),
]
PULAU = {"1": "Sumatra", "2": "Sumatra", "3": "Jawa", "5": "Bali dan Nusa Tenggara", "6": "Kalimantan", "7": "Sulawesi",
         "8": "Maluku", "9": "Papua"}


def baca_fitur(faktor):
    """faktor_kec.json -> (kunci, matriks nilai dengan None, nama fitur)."""
    kol = {k: i for i, k in enumerate(faktor["kolom"])}
    kunci, M = [], []
    for b in faktor["baris"]:
        kunci.append(b[0])
        baris = []
        for _, cs, f in FITUR:
            vs = [b[kol[c]] if c in kol else None for c in cs]
            baris.append(None if any(v is None for v in vs) else float(f(*vs)))
        M.append(baris)
    return kunci, M, [n for n, _, _ in FITUR]


def saring_null(M, nama, maks=MAKS_NULL):
    """Buang fitur yang null di > maks baris (TANPA melihat label). -> (M, nama, dibuang)."""
    n = len(M)
    simpan_j = [j for j in range(len(nama)) if sum(1 for r in M if r[j] is None) / n <= maks]
    buang = [nama[j] for j in range(len(nama)) if j not in simpan_j]
    return [[r[j] for j in simpan_j] for r in M], [nama[j] for j in simpan_j], buang


def label_dari(kunci, lab, a, b, kolom="n_th"):
    """Jumlah kejadian per kecamatan tahun a..b (kecamatan tanpa entri = 0)."""
    return [sum(c for t, c in (lab.get(k) or {}).get(kolom, {}).items() if a <= int(t) <= b) for k in kunci]


def kuartil_atas(nilai):
    batas = sorted(nilai)[int(.75 * len(nilai))]
    return [1 if v >= batas else 0 for v in nilai], batas


def isi_standar(M, latih, uji):
    """Isi null dengan median baris latih, standarkan dengan rata/simpangan baris latih. -> (Xlatih, Xuji, med, rata, sd)."""
    p = len(M[0])
    med, rata, sd = [], [], []
    for j in range(p):
        v = sorted(M[i][j] for i in latih if M[i][j] is not None)
        med.append(v[len(v) // 2] if v else 0.0)
    isi = lambda i: [M[i][j] if M[i][j] is not None else med[j] for j in range(p)]
    XL = [isi(i) for i in latih]
    for j in range(p):
        m, s = standar([x[j] for x in XL])
        rata.append(m); sd.append(s)
    z = lambda x: [(x[j] - rata[j]) / sd[j] for j in range(p)]
    return [z(x) for x in XL], [z(isi(i)) for i in uji], med, rata, sd


def jalankan(kunci, M, nama, lab, kolom="n_th"):
    """Alur pra-registrasi penuh. -> dict hasil (tanpa keluaran per kecamatan)."""
    M, nama, buang = saring_null(M, nama)
    y_latih, batas_l = kuartil_atas(label_dari(kunci, lab, *TAHUN_LATIH, kolom))
    hit_uji = label_dari(kunci, lab, *TAHUN_UJI, kolom)
    y_uji, batas_u = kuartil_atas(hit_uji)
    riw = label_dari(kunci, lab, *TAHUN_LATIH, kolom)
    prov = [k.split("|")[0] for k in kunci]
    lp = lipatan(prov)
    skor = [0.0] * len(kunci)
    for f in range(LIPAT):
        latih = [i for i, p in enumerate(prov) if lp[p] != f]
        uji = [i for i, p in enumerate(prov) if lp[p] == f]
        XL, XU, *_ = isi_standar(M, latih, uji)
        b = logistik(XL, [y_latih[i] for i in latih])
        for i, x in zip(uji, XU):
            skor[i] = skor_logit(b, x)
    j_ina = nama.index("InaRISK zona sedang+tinggi") if "InaRISK zona sedang+tinggi" in nama else None
    j_pad = nama.index("Kepadatan (log)") if "Kepadatan (log)" in nama else None
    ina = [r[j_ina] if j_ina is not None and r[j_ina] is not None else 0.0 for r in M]
    pad = [r[j_pad] if j_pad is not None and r[j_pad] is not None else 0.0 for r in M]
    pil = lambda d, idx: [d[i] for i in idx]
    A = lambda s: (lambda idx: auc(pil(s, idx), pil(y_uji, idx)))
    selisih = lambda s1, s2: (lambda idx: auc(pil(s1, idx), pil(y_uji, idx)) - auc(pil(s2, idx), pil(y_uji, idx)))
    h = {"n_kec": len(kunci), "fitur": nama, "fitur_dibuang_null": buang, "batas_kuartil": {"latih": batas_l, "uji": batas_u},
         "laju_dasar_uji": round(sum(y_uji) / len(y_uji), 3),
         "auc": {"model": bootstrap_blok(A(skor), prov), "inarisk": bootstrap_blok(A(ina), prov),
                 "kepadatan": bootstrap_blok(A(pad), prov), "riwayat_2016_2021": bootstrap_blok(A(riw), prov)},
         "selisih_model_inarisk": bootstrap_blok(selisih(skor, ina), prov),
         "selisih_model_kepadatan": bootstrap_blok(selisih(skor, pad), prov),
         "prf_25_teratas": {"model": prf_atas(skor, y_uji), "inarisk": prf_atas(ina, y_uji), "kepadatan": prf_atas(pad, y_uji)},
         "per_pulau": {}}
    for kd, pulau in sorted(set(PULAU.items()), key=lambda t: t[1]):
        idx = [i for i, p in enumerate(prov) if p[0] == kd]
        if idx and pulau not in h["per_pulau"]:
            idx = [i for i, p in enumerate(prov) if PULAU.get(p[0]) == pulau]
            h["per_pulau"][pulau] = {"n": len(idx), "auc_model": round(auc(pil(skor, idx), pil(y_uji, idx)), 3),
                                     "auc_inarisk": round(auc(pil(ina, idx), pil(y_uji, idx)), 3),
                                     "auc_kepadatan": round(auc(pil(pad, idx), pil(y_uji, idx)), 3)}
    l1, l2 = h["selisih_model_inarisk"][1] > 0, h["selisih_model_kepadatan"][1] > 0
    h["vonis"] = {"L1 lebih baik dari InaRISK": l1, "L2 lebih baik dari kepadatan": l2, "terkalibrasi": l1 and l2}
    return h, M, nama, y_latih


def main():
    faktor = json.load(open(os.path.join(DATA, "faktor_kec.json")))
    lab = json.load(open(os.environ.get("MODEL_LABEL", LABEL)))["kec"]
    kunci, M, nama = baca_fitur(faktor)
    h, M2, nama2, y_latih = jalankan(kunci, M, nama, lab)
    peka, *_ = jalankan(kunci, M, nama, lab, kolom="n_th_tunggal")
    h["kepekaan_label_tunggal"] = {k: peka[k] for k in ("auc", "selisih_model_inarisk", "selisih_model_kepadatan", "vonis")}
    # model tampilan: dilatih pada semua kecamatan dengan Y_latih (model yang sama dengan yang diuji)
    semua = list(range(len(kunci)))
    X, _, med, rata, sd = isi_standar(M2, semua, [])
    b = logistik(X, [y_latih[i] for i in semua])
    skor = [skor_logit(b, x) for x in X]
    urut = sorted(range(len(skor)), key=lambda i: skor[i])
    pct = [0] * len(skor)
    for r, i in enumerate(urut):
        pct[i] = round(100 * r / len(skor))
    h.update({
        "dibuat": __import__("time").strftime("%Y-%m-%d"),
        "label": "Terkalibrasi" if h["vonis"]["terkalibrasi"] else "Hipotesis, belum lolos uji",
        "pertanyaan": "Apakah faktor per kecamatan dengan bobot dari kejadian lebih tepat menunjuk kecamatan paling sering banjir daripada InaRISK dan kepadatan penduduk?",
        "label_uji": "kuartil atas jumlah kejadian banjir Groundsource 2022-2025 per kecamatan",
        "ci": "selang 95% bootstrap 1.000 ulangan atas provinsi; format [titik, bawah, atas]",
        "bobot": {n: round(v, 3) for n, v in zip(nama2, b[1:])},
        "standar": {"median_isi": med, "rata": rata, "sd": sd},
        "kolom_kec": ["persentil skor (0-100)", "3 kontribusi terbesar [indeks fitur, nilai]"],
        "kec": {k: [pct[i], [[nama2.index(n), round(v, 2)] for n, v in kontribusi(b, X[i], nama2)]] for i, k in enumerate(kunci)},
        "batas": ["Label dari berita (Groundsource): condong ke kota dan daerah ber-media.",
                  "Kontribusi menjelaskan MODEL, bukan sebab fisik di lapangan.",
                  "Elevasi 90 m dari kisi <= 25 titik; HAND tidak tersedia."],
    })
    with open(os.path.join(DATA, "model_bahaya.json"), "w") as f:
        json.dump(h, f, ensure_ascii=False, separators=(",", ":"))
    print(json.dumps({k: h[k] for k in ("n_kec", "fitur_dibuang_null", "laju_dasar_uji", "auc", "selisih_model_inarisk",
                                        "selisih_model_kepadatan", "vonis", "per_pulau", "kepekaan_label_tunggal")},
                     ensure_ascii=False, indent=1))


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
    M, nama, buang = saring_null([[1, None], [2, None], [3, 4], [4, None], [5, 6]], ["a", "b"])
    assert nama == ["a"] and buang == ["b"] and M[0] == [1]
    assert kuartil_atas([1, 2, 3, 4, 5, 6, 7, 8]) == ([0, 0, 0, 0, 0, 0, 1, 1], 7)
    assert label_dari(["x", "y"], {"x": {"n_th": {"2015": 9, "2016": 2, "2021": 1, "2022": 5}}}, 2016, 2021) == [3, 0]
    XL, XU, med, rata, sd = isi_standar([[1.0], [None], [3.0], [10.0]], [0, 1, 2], [3])
    assert med == [3.0] and XU[0][0] > 2  # null diisi median latih, uji distandarkan dengan statistik latih
    fk = {"kolom": ["kunci", "zona_sedang", "zona_tinggi", "elev_p50", "relief", "rendah", "padat", "pesisir", "jarak_sungai", "kej_100rb_latih"],
          "baris": [["11|A|a", 10, 5, None, 3, 50, 100, 0, 2, 1.5]]}
    k, Mf, nm = baca_fitur(fk)
    assert k == ["11|A|a"] and Mf[0][0] == 15 and Mf[0][2] is None and abs(Mf[0][5] - math.log1p(100)) < 1e-12
    print("ok model_bahaya")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
