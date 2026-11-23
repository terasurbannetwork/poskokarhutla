"""Alternatif Laporan Khusus Gempa (permintaan pemilik 23 Nov 2026, "coba kalau ini dimasukan untuk mengisi ruang kosong"):
blok prediksi gempa susulan (kartu 24 jam, 3 hari, 7 hari + grafik peluang kumulatif) mengisi ruang kosong di bawah tabel kondisi
halaman 1. Halaman 2 dibuang.

Mesin ../gempa_khusus.py TIDAK disunting (sedang disunting sesi lain untuk varian satu halaman): tabel kondisi halaman 1 dibungkus
lewat gempa_khusus.tabel. Halaman 2 dibuang (pemilik 23 Nov 2026), jadi laporan satu halaman. Saat tabel kondisi (maks=44) dipanggil, barisnya dibuat setinggi isi, lalu blok susulan digambar di bawahnya
sampai batas atas kotak arti MMI. Angka peluang dari model yang sama dengan halaman 2 mesin baku (scripts/gempa/susulan.py, sejak gempa utama).
"""
import os, sys
from datetime import datetime, timedelta

import gempa_khusus as GK
from gempa_khusus import R, kepala_panel, kategori, persen, WARNA_KAT, TEKS_KAT, KATEGORI, TEKS, TEKS3, NAVY, PUTIH, GARIS, \
    BULAN, WIB, lebar
from pptx.enum.shapes import MSO_SHAPE

X, W = 471.3, 445.5


def _peluang(c):
    import susulan as SU
    M = SU.muat_model()
    assert M['terbit'] and M['terbit_target']['m5'], 'model susulan M5 tidak terbit: blok susulan tidak boleh tampil'
    g, P = c['gempa'], M['param']
    return lambda d: SU.peluang(g['m'], SU.T0, d - SU.T0, 5.0, P)['p']


GAYA = 'B'   # asli | A | B | C; pemilik 23 Nov 2026 memilih B (skala bertingkat)
JENDELA = (('24 jam pertama', 1), ('3 hari pertama', 3), ('7 hari pertama', 7))


def _tint(hexa, f):
    """Campur warna dengan putih; f=0 putih, f=1 warna asli."""
    r, g, b = (int(hexa[i:i + 2], 16) for i in (0, 2, 4))
    return ''.join(f'{round(255 - (255 - v) * f):02X}' for v in (r, g, b))


def kartu_asli(k, kum, top, bawah, wk):
    """Kartu putih bertepi, aksen kiri warna kategori, batang tipis 0-100%."""
    jeda = 4
    hk = (bawah - top - 2 * jeda) / 3
    for i, (lab, d) in enumerate(JENDELA):
        p = kum(d); nm = kategori(p); y = top + i * (hk + jeda)
        k.bulat(X, y, wk, hk, PUTIH, GARIS, radius=4)
        k.kotak(X, y + 0.4, 4, hk - 0.8, WARNA_KAT[nm])
        k.teks(X + 11, y + 2, wk - 18, 10, [R(lab, 7, TEKS3, True)], bungkus=False)
        k.teks(X + 11, y + 11, wk - 70, 14, [R(nm, 10.5, TEKS_KAT[nm], True)], bungkus=False)
        k.teks(X + wk - 62, y + 13, 54, 11, [R(f'Peluang {persen(p)}', 7, TEKS3)], rata='r', bungkus=False)
        k.bulat(X + 11, y + hk - 7, wk - 19, 3, 'E3E8EF', radius=1.5)
        k.bulat(X + 11, y + hk - 7, max(3, (wk - 19) * p), 3, WARNA_KAT[nm], radius=1.5)


def kartu_a(k, kum, top, bawah, wk):
    """A, daftar bergaris: tanpa kotak; bulatan warna kategori, jendela waktu dan kategori bertumpuk, persen rata kanan,
    garis rambut di antara baris."""
    hk = (bawah - top) / 3
    for i, (lab, d) in enumerate(JENDELA):
        p = kum(d); nm = kategori(p); y = top + i * hk
        k.bulat(X + 1, y + hk / 2 - 4, 8, 8, WARNA_KAT[nm], radius=4)
        k.teks(X + 15, y + hk / 2 - 13, wk - 60, 10, [R(lab, 7, TEKS3)], bungkus=False)
        k.teks(X + 15, y + hk / 2 - 3, wk - 60, 14, [R(nm, 10.5, TEKS_KAT[nm], True)], bungkus=False)
        k.teks(X + wk - 48, y + hk / 2 - 7, 48, 14, [R(persen(p), 9, TEKS, True)], rata='r', bungkus=False)
        if i < 2:
            k.garis_datar(X, X + wk, y + hk, GARIS, 0.5)


def kartu_b(k, kum, top, bawah, wk):
    """B, skala bertingkat: tiap jendela waktu satu skala 0-100% yang dibagi empat kategori (lebar sebanding ambang),
    penanda navy di posisi peluangnya; jarak ke Sedang terlihat langsung."""
    tepi = [0.0] + [b for b, _ in KATEGORI[:-1]] + [1.0]
    hk = (bawah - top - 9) / 3
    for i, (lab, d) in enumerate(JENDELA):
        p = kum(d); nm = kategori(p); y = top + i * hk
        k.teks(X, y + 1, wk - 70, 10, [R(lab, 7, TEKS3, True)], bungkus=False)
        k.teks(X + wk - 75, y + 1, 75, 10, [R(nm, 7.5, TEKS_KAT[nm], True), R(f'  {persen(p)}', 7, TEKS3)], rata='r',
               bungkus=False)
        yb = y + 15
        for j, (_, nmj) in enumerate(KATEGORI):
            x0, x1 = X + tepi[j] * wk, X + tepi[j + 1] * wk
            k.kotak(x0 + (0 if j == 0 else 0.6), yb, x1 - x0 - (0 if j == 0 else 0.6), 5,
                    WARNA_KAT[nmj] if nmj == nm else _tint(WARNA_KAT[nmj], 0.28))
        xm = X + p * wk
        k.bulat(xm - 1.25, yb - 2.5, 2.5, 10, NAVY, radius=1.2)
    yl = bawah - 6
    for b, _ in KATEGORI[:-1]:
        k.teks(X + b * wk - 12, yl - 2, 24, 8, [R(f'{b * 100:.0f}%', 6, TEKS3)], rata='c', bungkus=False)


def kartu_c(k, kum, top, bawah, wk):
    """C, kartu berlatar: kartu tanpa tepi berlatar warna kategori pucat, jendela waktu dan kategori di kiri,
    persen dalam pil putih di kanan."""
    jeda = 4
    hk = (bawah - top - 2 * jeda) / 3
    for i, (lab, d) in enumerate(JENDELA):
        p = kum(d); nm = kategori(p); y = top + i * (hk + jeda)
        k.bulat(X, y, wk, hk, _tint(WARNA_KAT[nm], 0.22), radius=5)
        k.teks(X + 10, y + hk / 2 - 13, wk - 60, 10, [R(lab, 7, TEKS3)], bungkus=False)
        k.teks(X + 10, y + hk / 2 - 3, wk - 60, 14, [R(nm, 10.5, TEKS_KAT[nm], True)], bungkus=False)
        t = persen(p); wp = lebar(t, 8) + 12
        k.bulat(X + wk - 8 - wp, y + hk / 2 - 7, wp, 14, PUTIH, radius=7)
        k.teks(X + wk - 8 - wp, y + hk / 2 - 7, wp, 14, [R(t, 8, TEKS_KAT[nm], True)], rata='c', bungkus=False)


KARTU = {'asli': kartu_asli, 'A': kartu_a, 'B': kartu_b, 'C': kartu_c}


def blok(k, c, y0, y1):
    """Blok susulan di kolom kanan halaman 1, dari y0 sampai y1: kepala seksi, kartu bertumpuk di kiri, grafik di kanan."""
    kum = _peluang(c)
    t0 = datetime(*c['waktu_utama'], tzinfo=WIB)
    kepala_panel(k, X, y0, W, 'Peluang gempa susulan M5 ke atas (model)', 'gempa',
                 kanan='Kategori diadaptasi dari skala peluang IPCC')
    top, bawah = y0 + 38, y1 - 22
    # ------------------------------------------------ kesimpulan (pemilik 23 Nov 2026: grafik terkumpul terlihat terus naik,
    # pembaca perlu tahu sampai kapan tetap kecil)
    H = 30
    p30, akhir30 = kum(H), t0 + timedelta(days=H)
    assert kategori(p30) in ('Sangat kecil', 'Kecil'), 'kalimat kesimpulan hanya untuk peluang 30 hari yang tetap kecil'
    BLN = ('Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November',
           'Desember')
    k.bulat(X, y1 - 18, W, 14, 'EEF2F7', radius=3)
    # ikon info: huruf i dalam lingkaran bergaris, abu redup, tanpa isi (pemilik 23 Nov 2026: "gausah solid")
    k.kotak(X + 7, y1 - 14.75, 7.5, 7.5, None, '8A93A3', 0.6, bentuk=MSO_SHAPE.OVAL)
    cx, cy = X + 10.75, y1 - 11   # huruf i digambar (titik + batang): teks di bawah 6 pt ditolak gerbang deck
    k.kotak(cx - 0.55, cy - 2.45, 1.1, 1.1, '8A93A3', bentuk=MSO_SHAPE.OVAL)
    k.kotak(cx - 0.45, cy - 0.75, 0.9, 3.1, '8A93A3')
    k.teks(X + 21, y1 - 18, W - 27, 14, [
        R('Peluang terus bertambah, tetapi semakin lambat. ', 7, TEKS3),
        R(f'Hingga {akhir30.day} {BLN[akhir30.month - 1]} {akhir30.year}, peluangnya tetap {kategori(p30).lower()}, '
          f'yaitu sekitar {persen(p30)}.', 7, TEKS, True)], bungkus=False)
    # ------------------------------------------------ kiri: tiga jendela waktu (gaya kartu dipilih lewat GAYA)
    wk = 150
    KARTU[GAYA](k, kum, top, bawah, wk)
    # ------------------------------------------------ kanan: grafik peluang kumulatif hari ke-1 sampai ke-7
    gx0, gx1 = X + wk + 12, X + W
    hari = []
    for d in range(1, 8):
        akhir = t0 + timedelta(days=d)
        hari.append((f'Hari ke-{d}', f'{akhir.day} {BULAN[akhir.month - 1]}', kum(d)))
    dasar = bawah - 19
    puncak = top + 13
    skala = max(p for *_, p in hari) * 1.12
    py = lambda p: dasar - p / skala * (dasar - puncak)
    for batas, _ in KATEGORI[:-1]:
        if batas < skala:
            yg = py(batas)
            for x in range(int(gx0), int(gx1 - 18), 6):
                k.garis(x, yg, x + 3, yg, 'B8C2D0', 0.75)
            k.teks(gx1 - 17, yg - 6, 17, 12, [R(f'{batas * 100:.0f}%', 6.5, TEKS3)], rata='r', bungkus=False)
    slot = (gx1 - 18 - gx0) / 7
    for n, (lab, tgl, p) in enumerate(hari):
        cx = gx0 + n * slot + slot / 2
        tp = min(py(p), dasar - 1.5)
        utama = n + 1 in (1, 3, 7)   # batang yang sama dengan kartu di kiri
        bt = k.kotak(cx - 12, tp, 24, dasar - tp, WARNA_KAT[kategori(p)], NAVY if utama else None, 1.0,
                     bentuk=MSO_SHAPE.ROUND_2_SAME_RECTANGLE)
        bt.adjustments[0] = min(0.5, 5 / min(24, max(dasar - tp, 1)))
        bt.adjustments[1] = 0
        tp_ = persen(p)
        wp = lebar(tp_, 7.5 if utama else 6.8) + 6
        k.bulat(cx - wp / 2, tp - 12, wp, 10, PUTIH, radius=3)
        k.teks(cx - 22, tp - 12, 44, 10, [R(tp_, 7.5 if utama else 6.8, TEKS if utama else TEKS3, utama)], rata='c', bungkus=False)
        k.teks(cx - 22, dasar + 2, 44, 9, [R(lab, 6.8, TEKS if utama else TEKS3, utama)], rata='c', bungkus=False)
        k.teks(cx - 22, dasar + 10, 44, 8, [R(tgl, 6, TEKS3)], rata='c', bungkus=False)
    k.garis_datar(gx0, gx1 - 18, dasar, TEKS3, 0.75)
    assert dasar - puncak >= 40, f'ruang grafik susulan terlalu pendek ({dasar - puncak:.0f} pt)'


def bangun(c):
    asli = GK.tabel

    def tabel(k, x, y, kol, baris, **kw):
        if kw.get('maks') != 44:   # bukan tabel kondisi halaman 1
            return asli(k, x, y, kol, baris, **kw)
        batas = kw.pop('bawah')
        n = len(baris)
        yb = asli(k, x, y, kol, baris, bawah=y + kw.get('kepala', 24) + 30 * n, **kw)   # baris setinggi isi (sekitar 30 pt)
        blok(k, c, yb + 10, batas)
        print('alternatif: tabel kondisi berakhir', round(yb), '; blok susulan', round(yb + 10), 'sampai', round(batas))
        return yb

    hal2 = GK.halaman_susulan
    GK.tabel = tabel
    GK.halaman_susulan = lambda *a, **kw: None   # pemilik 23 Nov 2026: "halaman 2 buang aja"
    try:
        return GK.bangun(c)
    finally:
        GK.tabel, GK.halaman_susulan = asli, hal2
