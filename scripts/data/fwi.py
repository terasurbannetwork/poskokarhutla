"""Canadian Fire Weather Index (Van Wagner 1987), kerangka yang dipakai SPARTAN BMKG.

Input harian jam 12 waktu setempat: suhu (C), RH (%), angin 10 m (km/jam), hujan 24 jam (mm).
Faktor panjang hari memakai nilai khatulistiwa (cffdrs: lintang -10..10), cocok untuk Indonesia.
"""
import math

LE_KHATULISTIWA = 9.0
LF_KHATULISTIWA = 1.39
AWAL = (85.0, 6.0, 15.0)  # FFMC, DMC, DC awal standar


def ffmc(f0, t, h, w, hujan):
    mo = 147.2 * (101 - f0) / (59.5 + f0)
    if hujan > 0.5:
        rf = hujan - 0.5
        tambah = 42.5 * rf * math.exp(-100 / (251 - mo)) * (1 - math.exp(-6.93 / rf))
        if mo > 150:
            tambah += 0.0015 * (mo - 150) ** 2 * math.sqrt(rf)
        mo = min(mo + tambah, 250)
    ed = 0.942 * h ** 0.679 + 11 * math.exp((h - 100) / 10) + 0.18 * (21.1 - t) * (1 - math.exp(-0.115 * h))
    if mo > ed:
        ko = 0.424 * (1 - (h / 100) ** 1.7) + 0.0694 * math.sqrt(w) * (1 - (h / 100) ** 8)
        m = ed + (mo - ed) * 10 ** (-ko * 0.581 * math.exp(0.0365 * t))
    else:
        ew = 0.618 * h ** 0.753 + 10 * math.exp((h - 100) / 10) + 0.18 * (21.1 - t) * (1 - math.exp(-0.115 * h))
        if mo < ew:
            k1 = 0.424 * (1 - ((100 - h) / 100) ** 1.7) + 0.0694 * math.sqrt(w) * (1 - ((100 - h) / 100) ** 8)
            m = ew - (ew - mo) * 10 ** (-k1 * 0.581 * math.exp(0.0365 * t))
        else:
            m = mo
    return min(max(59.5 * (250 - m) / (147.2 + m), 0), 101)


KOEF_FFMC_JAM = 250 * 59.5 / 101  # 147,27723: pengali cffdrs hffmc (harian di atas memakai 147,2 Van Wagner 1987)


def ffmc_jam(f0, t, h, w, hujan, jam=1.0):
    """FFMC per jam (Van Wagner 1977; Van Wagner & Pickett 1985 pers. 1-8), ditulis ulang dari rumus dan dicek ke
    fixture cffdrs hffmc. Beda dari ffmc() harian: hujan penuh (tanpa -0,5 mm), laju 0,0579 bukan 0,581 (per jam),
    suku 0,0015 memakai kadar air SEBELUM hujan. jam = lama langkah (jam); cuaca = rerata/jumlah jam itu."""
    h = min(max(h, 0.0), 100.0)
    w = max(w, 0.0)
    mo = KOEF_FFMC_JAM * (101 - f0) / (59.5 + f0)
    if hujan > 0:
        tambah = 42.5 * hujan * math.exp(-100 / (251 - mo)) * (1 - math.exp(-6.93 / hujan))
        if mo > 150:
            tambah += 0.0015 * (mo - 150) ** 2 * math.sqrt(hujan)
        mo = min(mo + tambah, 250)
    ed = 0.942 * h ** 0.679 + 11 * math.exp((h - 100) / 10) + 0.18 * (21.1 - t) * (1 - math.exp(-0.115 * h))
    ew = 0.618 * h ** 0.753 + 10 * math.exp((h - 100) / 10) + 0.18 * (21.1 - t) * (1 - math.exp(-0.115 * h))
    sk = 0.0579 * math.exp(0.0365 * t) * jam
    if mo > ed:
        ko = 0.424 * (1 - (h / 100) ** 1.7) + 0.0694 * math.sqrt(w) * (1 - (h / 100) ** 8)
        m = ed + (mo - ed) * 10 ** (-ko * sk)
    elif mo < ew:
        k1 = 0.424 * (1 - ((100 - h) / 100) ** 1.7) + 0.0694 * math.sqrt(w) * (1 - ((100 - h) / 100) ** 8)
        m = ew - (ew - mo) * 10 ** (-k1 * sk)
    else:
        m = mo
    return max(59.5 * (250 - m) / (KOEF_FFMC_JAM + m), 0.0)


def deret_ffmc_jam(jam_jam, awal=85.0):
    """jam_jam = [(t, h, w, hujan_jam_itu), ...] per jam berurutan. Jam kosong (ada None) membawa nilai sebelumnya.
    Hasil sepanjang input. Panaskan >= 48 jam sebelum jam yang dipakai (ingatan FFMC ~ hari)."""
    f, hasil = awal, []
    for t, h, w, r in jam_jam:
        if None not in (t, h, w, r):
            f = ffmc_jam(f, t, h, w, r)
        hasil.append(f)
    return hasil


def dmc(d0, t, h, hujan, le=LE_KHATULISTIWA):
    t = max(t, -1.1)
    rk = 1.894 * (t + 1.1) * (100 - h) * le * 1e-4
    pr = d0
    if hujan > 1.5:
        rw = 0.92 * hujan - 1.27
        wmi = 20 + 280 / math.exp(0.023 * d0)
        if d0 <= 33:
            b = 100 / (0.5 + 0.3 * d0)
        elif d0 <= 65:
            b = 14 - 1.3 * math.log(d0)
        else:
            b = 6.2 * math.log(d0) - 17.2
        wmr = wmi + 1000 * rw / (48.77 + b * rw)
        pr = 43.43 * (5.6348 - math.log(wmr - 20))
    return max(max(pr, 0) + rk, 0)


def dc(c0, t, hujan, lf=LF_KHATULISTIWA):
    t = max(t, -2.8)
    pe = max((0.36 * (t + 2.8) + lf) / 2, 0)
    dr = c0
    if hujan > 2.8:
        rw = 0.83 * hujan - 1.27
        smi = 800 * math.exp(-c0 / 400)
        dr = max(c0 - 400 * math.log(1 + 3.937 * rw / smi), 0)
    return dr + pe


def isi(f, w):
    fm = 147.2 * (101 - f) / (59.5 + f)
    sf = 19.115 * math.exp(-0.1386 * fm) * (1 + fm ** 5.31 / 4.93e7)
    return sf * math.exp(0.05039 * w)


def bui(d, c):
    if d == 0 and c == 0:
        return 0.0
    if d <= 0.4 * c:
        b = 0.8 * c * d / (d + 0.4 * c)
    else:
        b = d - (1 - 0.8 * c / (d + 0.4 * c)) * (0.92 + (0.0114 * d) ** 1.7)
    return max(b, 0)


def fwi(i, b):
    if b <= 80:
        bb = 0.1 * i * (0.626 * b ** 0.809 + 2)
    else:
        bb = 0.1 * i * (1000 / (25 + 108.64 * math.exp(-0.023 * b)))
    return bb if bb <= 1 else math.exp(2.72 * (0.434 * math.log(bb)) ** 0.647)


def deret(hari, awal=AWAL):
    """hari = [(t, h, w, hujan), ...] berurutan tanpa lompatan tanggal. Hari dengan data kosong (None)
    tidak menghapus urutan: kode FFMC/DMC/DC dibawa dari kemarin dan hari itu ditandai 'celah'."""
    f, d, c = awal
    hasil = []
    for t, h, w, r in hari:
        if None in (t, h, w, r):
            i, b = isi(f, 0), bui(d, c)
            hasil.append({"ffmc": f, "dmc": d, "dc": c, "isi": i, "bui": b, "fwi": fwi(i, b), "celah": 1})
            continue
        h = min(max(h, 0), 100)
        f, d, c = ffmc(f, t, h, w, r), dmc(d, t, h, r), dc(c, t, r)
        i, b = isi(f, w), bui(d, c)
        hasil.append({"ffmc": f, "dmc": d, "dc": c, "isi": i, "bui": b, "fwi": fwi(i, b)})
    return hasil


def kelas(nilai):
    """Kelas bahaya BMKG: 0 Rendah (0-1), 1 Sedang (2-6), 2 Tinggi (7-13), 3 Sangat Tinggi (>13)."""
    return 0 if nilai < 2 else 1 if nilai < 7 else 2 if nilai < 14 else 3

# Data uji resmi cffdrs (R, CRAN; data/test_fwi.csv -> tests/testthat/data/fwi_01.csv): 48 hari berurutan di 40 LU,
# April-Mei 1985, mulai 85/6/15, faktor panjang hari Kanada (ell01/fl01). (bulan, T, RH, W, hujan, FFMC, DMC, DC, ISI, FWI)
# https://github.com/cran/cffdrs/blob/master/tests/testthat/data/fwi_01.csv
CFFDRS_FWI01 = [
    (4,17,42,25,0,87.65,8.545,19.01,10.78,10.04), (4,20,21,25,2.4,86.2,10.4,23.57,8.771,9.22),
    (4,8.5,40,17,0,86.91,11.8,26.05,6.478,7.517), (4,6.5,25,6,0,88.76,13.18,28.18,4.851,6.095),
    (4,13,34,24,0,89.04,15.44,31.47,12.51,14.73), (4,6,40,22,0.4,88.59,16.47,33.5,10.6,13.36),
    (4,5.5,52,6,0,87.28,17.24,35.45,3.923,5.796), (4,8.5,46,16,0,87.28,18.49,37.93,6.494,9.502),
    (4,9.5,54,20,0,86.73,19.68,40.6,7.347,10.88), (4,7,93,14,9,29.83,10.14,29.52,0.006623,0.004191),
    (4,6.5,71,17,1,49.4,10.68,31.65,0.3577,0.234), (4,6,59,17,0,67.22,11.38,33.68,1.346,0.9129),
    (4,13,52,4,0,77.73,13.03,36.98,1.126,0.8162), (4,15.5,40,11,0,85.41,15.44,40.72,3.88,5.474),
    (4,23,25,9,0,91.46,19.82,45.81,8.306,12.08), (4,19,46,16,0,89.87,22.45,50.19,9.423,14.2),
    (4,18,41,20,0,89.87,25.19,54.38,11.53,17.5), (4,14.5,51,16,0,88.36,27.04,57.95,7.581,13.17),
    (5,14.5,69,11,0,85.64,28.31,62.96,4.006,7.946), (5,15.5,42,8,0,87.32,30.85,68.15,4.367,9.006),
    (5,21,37,8,0,89.33,34.51,74.34,5.822,12.17), (5,23,32,16,0,90.93,38.83,80.88,10.96,20.88),
    (5,23,32,14,0,91.15,43.14,87.43,10.23,20.94), (5,27,33,12,0,91.61,48.1,94.69,9.862,21.56),
    (5,28,17,27,0,95.11,54.46,102.13,34.27,52.31), (5,23.5,54,20,0,89.65,57.43,108.77,11.16,25.72),
    (5,16,50,22,12.2,62.2,29.92,91.8,1.405,3.011), (5,11,58,20,0,76.44,31.26,96.19,2.29,5.341),
    (5,16,54,16,0,83.33,33.33,101.47,3.77,8.786), (5,21.5,37,9,0,88.6,37.08,107.74,5.515,12.63),
    (5,14,61,22,0.2,86.62,38.63,112.67,7.997,17.2), (5,15,30,27,0,89.58,41.6,117.77,15.71,28.66),
    (5,20,23,11,0,92.07,45.87,123.78,10.01,21.72), (5,14,95,3,16.4,21.32,20.09,96.89,0.0002476,0.0002689),
    (5,20,53,4,2.8,51,18.24,102.9,0.2256,0.2378), (5,19.5,30,16,0,82.21,22.03,108.81,3.273,6.758),
    (5,25.5,51,20,6,75.32,16.37,106.33,2.135,3.802), (5,10,38,24,0,84.27,18.19,110.54,6.386,11.21),
    (5,19,27,16,0,90.25,22.05,116.36,9.946,17.1), (5,26,46,11,4.2,77.54,18.67,117.65,1.578,2.917),
    (5,30,38,22,0,90.17,23.75,125.46,13.29,21.91), (5,25.5,67,19,12.6,65.28,13.14,108.44,1.389,1.862),
    (5,12,53,28,11.8,55.39,7.74,91.58,1.183,0.8184), (5,21,38,8,0,80.79,11.35,97.76,1.852,2.532),
    (5,13,70,20,3.8,61.7,8.406,97.8,1.238,0.8966), (5,9,78,24,1.4,64.43,8.991,101.82,1.726,1.941),
    (5,11,54,16,0,77.57,10.46,106.21,2.036,2.766), (5,15.5,39,9,0,85.37,13.12,111.4,3.486,5.719)
]
LE_KANADA = (6.5, 7.5, 9, 12.8, 13.9, 13.9, 12.4, 10.9, 9.4, 8, 7, 6)
LF_KANADA = (-1.6, -1.6, -1.6, 0.9, 3.8, 5.8, 6.4, 5, 2.4, 0.4, -1.6, -1.6)


# Fixture resmi cffdrs hffmc (cran/cffdrs tests/testthat/data/HourlyFineFuelMoistureCode.csv): satu langkah, sampel tiap baris
# ke-72 dari baris dalam rentang fisik (RH 0-100, angin >= 0, FFMC 0-101; hujan <= 0 dianggap kering seperti R).
# (T, RH, angin, hujan, FFMC_lama, langkah_jam, FFMC_baru) - berkas membulatkan 4 angka penting.
HFFMC_CFFDRS = [
    (8.5,4.58,0,-10,0,9,26.63), (26.2,26.45,291.6,-10,0,9,91.11), (43,48.32,218.7,55.61,0,9,91.41),
    (59.8,70.19,145.8,121.22,0,9,90.33), (-13.5,99.35,72.9,186.83,0,9,0.8108), (-18,99.35,0,252.44,0,9,0.09201),
    (-21.6,99.35,291.6,252.44,0,9,1.118), (58.6,92.06,218.7,-10,72.9,9,83.02), (40.9,4.58,218.7,55.61,72.9,9,99.62),
    (57.7,26.45,145.8,121.22,72.9,9,98.38), (-15.6,55.61,72.9,186.83,72.9,9,25.91), (1.2,77.48,0,252.44,72.9,9,12.14),
    (18.9,99.35,291.6,252.44,72.9,9,10.76), (43.4,19.16,291.6,-10,0,18,97.35), (-29.9,48.32,218.7,55.61,0,18,35.84),
    (-13.1,70.19,145.8,121.22,0,18,46.24), (3.7,92.06,72.9,186.83,0,18,30.66), (-0.8,92.06,0,252.44,0,18,4.312),
    (-4.4,92.06,291.6,252.44,0,18,39.83), (-14.3,92.06,218.7,-10,72.9,18,72.9), (36.9,99.35,145.8,55.61,72.9,18,21.66),
    (-15.2,26.45,145.8,121.22,72.9,18,59.18), (1.6,48.32,72.9,186.83,72.9,18,68.66), (18.4,70.19,0,252.44,72.9,18,36.78),
    (36.1,92.06,291.6,252.44,72.9,18,79.1),
]


if __name__ == "__main__":
    # Uji baku Van Wagner & Pickett (1985): 45 LU, April, T17 RH42 W25 hujan 0, mulai 85/6/15
    f = ffmc(85, 17, 42, 25, 0)
    d = dmc(6, 17, 42, 0, le=12.8)
    c = dc(15, 17, 0, lf=0.9)
    i, b = isi(f, 25), bui(d, c)
    hasil = (round(f, 1), round(d, 1), round(c, 1), round(i, 1), round(b, 1), round(fwi(i, b), 1))
    assert hasil == (87.7, 8.5, 19.0, 10.9, 8.5, 10.1), hasil
    assert [kelas(x) for x in (0.5, 4, 10, 20)] == [0, 1, 2, 3]
    # hari kosong: kode dibawa, tidak bergeser
    dua = deret([(30, 50, 10, 0), (None, None, None, None), (30, 50, 10, 0)])
    assert dua[1]["celah"] and dua[1]["dc"] == dua[0]["dc"] and dua[2]["dc"] > dua[1]["dc"]
    # lanjut dari keadaan kemarin = sama dengan menghitung sambung
    satu = deret([(30, 50, 10, 0)] * 3)
    lanjut = deret([(30, 50, 10, 0)], awal=(satu[1]["ffmc"], satu[1]["dmc"], satu[1]["dc"]))
    assert abs(lanjut[0]["dc"] - satu[2]["dc"]) < 1e-9
    # rantai 48 hari vs cffdrs: DMC/DC harus sama sampai pembulatan berkas (0,005). FFMC/ISI/FWI boleh selisih kecil karena
    # fwi.py memakai koefisien Van Wagner 1987 (147,2) sedangkan cffdrs kini 147,27723 (= 250*59,5/101): selisih terukur
    # FFMC <= 0,12, ISI <= 0,25, FWI <= 0,24 (Okt 2026). Batas uji sedikit di atas itu; lebih dari itu = rumus rusak.
    f, d, c = AWAL
    for m, t, h, w, r, F0, D0, C0, I0, W0 in CFFDRS_FWI01:
        f, d, c = ffmc(f, t, h, w, r), dmc(d, t, h, r, le=LE_KANADA[m - 1]), dc(c, t, r, lf=LF_KANADA[m - 1])
        i = isi(f, w)
        x = fwi(i, bui(d, c))
        assert abs(d - D0) < 0.006 and abs(c - C0) < 0.006, ("DMC/DC menyimpang dari cffdrs", m, t, h, w, r, d, D0, c, C0)
        assert abs(f - F0) < 0.15 and abs(i - I0) < 0.3 and abs(x - W0) < 0.3, ("FFMC/ISI/FWI menyimpang", f, F0, i, I0, x, W0)
    # FFMC per jam vs fixture cffdrs: seluruh 2.595 baris dalam rentang fisik lolos < 0,005 (dibulatkan berkas); sampel ini 25 baris.
    for T, H, W, R_, F0, J, F1 in HFFMC_CFFDRS:
        v = ffmc_jam(F0, T, H, W, max(R_, 0), J)
        assert abs(v - F1) < 0.006, ("hffmc menyimpang dari cffdrs", T, H, W, R_, F0, J, v, F1)
    # sifat fisik: hujan menurunkan; kering-hangat menaikkan; mendarat di pita ekuilibrium [Ew, Ed] dan diam di sana (dari bawah di tepi basah, dari atas di tepi kering)
    assert ffmc_jam(90, 28, 60, 5, 5) < ffmc_jam(90, 28, 60, 5, 0)
    a, b = deret_ffmc_jam([(32, 40, 10, 0)] * 2000, 20)[-1], deret_ffmc_jam([(32, 40, 10, 0)] * 2000, 99)[-1]
    assert a < b and a > 85 and abs(ffmc_jam(a, 32, 40, 10, 0) - a) < 1e-6 and abs(ffmc_jam(b, 32, 40, 10, 0) - b) < 1e-6, (a, b)
    assert deret_ffmc_jam([(30, 50, 10, 0), (None, 1, 1, 1)], 80)[1] == deret_ffmc_jam([(30, 50, 10, 0)], 80)[0]
    print("ok", hasil)
