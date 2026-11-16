"""Pohon keputusan ambang masuk (L2) mendatar: foto/pohon-l2.png (2400 x 900), huruf Roboto, palet navy dan oranye BNPB.
Isi dari naskah-ringkas BAB 4 dan mesin/gambar/r-pohon-l2.pohon.json kajian."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

AKAR = Path(__file__).resolve().parents[1]
FONT = Path(__file__).resolve().parents[2] / 'fonts'
W, H = 2400, 860
NAVY, ORANYE, ABU, TEKS, PUTIH, TINT = '#051C2C', '#D9600B', '#6B7280', '#1A1A1A', '#FFFFFF', '#F3F5F8'
im = Image.new('RGB', (W, H), PUTIH)
d = ImageDraw.Draw(im)


def f(ukuran, tebal=False):
    return ImageFont.truetype(str(FONT / ('Roboto-Bold.ttf' if tebal else 'Roboto-Regular.ttf')), ukuran)


def bungkus(teks, huruf, lebar):
    kata, baris, cur = teks.split(), [], ''
    for k in kata:
        c = (cur + ' ' + k).strip()
        if d.textlength(c, font=huruf) <= lebar:
            cur = c
        else:
            baris.append(cur)
            cur = k
    baris.append(cur)
    return baris


def kotak(x, y, w, h, teks, isi, garis, warna_teks, huruf, tebal=False):
    d.rounded_rectangle((x, y, x + w, y + h), radius=18, fill=isi, outline=garis, width=4)
    baris = bungkus(teks, huruf, w - 40)
    tot = len(baris) * (huruf.size * 1.28)
    yy = y + (h - tot) / 2
    for b in baris:
        d.text((x + w / 2, yy), b, font=huruf, fill=warna_teks, anchor='ma')
        yy += huruf.size * 1.28


def panah(x1, y1, x2, y2, warna, label=None, tebal=6):
    d.line((x1, y1, x2, y2), fill=warna, width=tebal)
    if x2 == x1:   # tegak
        s = 1 if y2 > y1 else -1
        d.polygon([(x2, y2), (x2 - 16, y2 - 26 * s), (x2 + 16, y2 - 26 * s)], fill=warna)
    else:
        s = 1 if x2 > x1 else -1
        d.polygon([(x2, y2), (x2 - 26 * s, y2 - 16), (x2 - 26 * s, y2 + 16)], fill=warna)
    if label:
        lx, ly = ((x1 + x2) / 2, (y1 + y2) / 2)
        hf = f(30, True)
        lw = d.textlength(label, font=hf)
        if x1 == x2:
            lx += 52
        else:
            ly -= 34
        d.text((lx, ly), label, font=hf, fill=warna, anchor='mm')


d.text((40, 24), 'Pohon keputusan ambang masuk: apakah kejadian masuk hitungan bencana', font=f(44, True), fill=NAVY)
BW, BH, GAP, X0, Y0 = 300, 250, 62, 40, 130
langkah = ['Penyebab salah satu jenis bencana', 'Korban meninggal atau hilang akibat langsung', 'Lima puluh orang unik terdampak langsung',
           'Lima unit rumah setara rusak berat atau satu fasilitas penting rusak', 'Karhutla dua hektare terverifikasi atau sepuluh hektare puso',
           'SK tanggap darurat yang cocok dengan kejadian']
xs = [X0 + i * (BW + GAP) for i in range(6)]
for i, (x, t) in enumerate(zip(xs, langkah)):
    kotak(x, Y0, BW, BH, t, TINT, NAVY, TEKS, f(34, True))
# panah Tidak ke kanan (kotak 2..6), Ya dari kotak 1 ke 2
panah(xs[0] + BW + 4, Y0 + BH / 2, xs[1] - 4, Y0 + BH / 2, NAVY, 'Ya')
for i in range(1, 5):
    panah(xs[i] + BW + 4, Y0 + BH / 2, xs[i + 1] - 4, Y0 + BH / 2, ORANYE, 'Tidak')
# Ya turun dari kotak 2..6 ke batang Bencana
YB = 560
for i in range(1, 6):
    panah(xs[i] + BW / 2, Y0 + BH + 4, xs[i] + BW / 2, YB - 6, NAVY, 'Ya')
kotak(xs[1], YB, xs[5] + BW - xs[1], 150, 'Masuk hitungan bencana: kejadian dicatat bersama kriteria yang meloloskannya', NAVY, NAVY, PUTIH, f(40, True))
# Tidak dari kotak 1 turun
panah(xs[0] + BW / 2, Y0 + BH + 4, xs[0] + BW / 2, YB - 6, ORANYE, 'Tidak')
kotak(xs[0], YB, BW, 150, 'Bukan kejadian bencana', PUTIH, ORANYE, TEKS, f(36, True))
# Tidak dari kotak 6 ke kanan: di bawah ambang
XU = xs[5] + BW + GAP
panah(xs[5] + BW + 4, Y0 + BH / 2, XU - 4, Y0 + BH / 2, ORANYE, 'Tidak')
kotak(XU, Y0, W - XU - 30, BH, 'Di bawah ambang: disimpan, tidak dihitung', PUTIH, ORANYE, TEKS, f(32, True))
d.text((40, 770), 'Kriteria diperiksa berurutan dari kiri ke kanan; kejadian masuk begitu satu kriteria terpenuhi. Batas angka masih bawaan sementara.', font=f(30), fill=ABU)
d.text((40, 825), 'Sumber: kerangka kajian penghitungan dan klasifikasi kejadian bencana, BNPB, 12 November 2026.', font=f(30), fill=ABU)
im.save(AKAR / 'foto' / 'pohon-l2.png')
print('pohon-l2.png', im.size)
