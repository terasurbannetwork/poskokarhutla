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
    print("ok", hasil)
