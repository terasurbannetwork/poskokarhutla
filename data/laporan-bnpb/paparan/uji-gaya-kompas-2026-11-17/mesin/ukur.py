# Ukur kotak batas (x0, y0, x1, y1) dan warna tiap elemen pada gambar 1920x1080.
# python ukur.py <halaman 1|3|5> <rujukan.png> [<buatan.png>]   -> tabel selisih
import sys
from PIL import Image
import numpy as np

def pred(nama):
    return {
        'putih': lambda r, g, b: (r > 175) & (g > 175) & (b > 175),
        'terang': lambda r, g, b: (r > 140) & (g > 140) & (b > 140) & (abs(r - b) < 40),
        'oranye': lambda r, g, b: (r > 190) & (g > 70) & (g < 160) & (b < 100),
        'gelap': lambda r, g, b: (r < 90) & (g < 90) & (b < 90),
        'abu': lambda r, g, b: (r > 110) & (r < 215) & (abs(r - b) < 30) & (abs(r - g) < 30),
        'bukanlatar': lambda r, g, b: (r + g + b) > 150,
        'hantu': lambda r, g, b: (r >= 31) & (r <= 50) & (abs(r - b) < 8),
        'hantu_o': lambda r, g, b: (r > 200) & (g > 80) & (g < 100) & (b < 40),
    }[nama]

E = {
 3: [
  ('label', (100, 50, 385, 86), 'putih'), ('garis_kepala', (385, 60, 445, 75), 'oranye'), ('nomor', (445, 48, 500, 90), 'oranye'),
  ('segmen', (500, 50, 830, 86), 'abu'), ('kris', (1310, 55, 1548, 126), 'bukanlatar'), ('lambang', (1585, 50, 1665, 130), 'bukanlatar'),
  ('bnpb', (1665, 60, 1830, 97), 'putih'), ('tagline', (1665, 98, 1830, 124), 'putih'),
  ('judul1', (95, 88, 1300, 200), 'putih'), ('judul2', (95, 200, 1300, 312), 'oranye'), ('sub', (100, 316, 900, 362), 'terang'),
  ('pil_foto', (125, 408, 420, 460), 'oranye'), ('kick_foto', (130, 788, 400, 812), 'oranye'), ('judul_foto', (130, 814, 600, 866), 'putih'),
  ('teks_foto', (130, 868, 700, 900), 'putih'), ('kredit', (480, 914, 722, 936), 'putih'),
  ('kick_k1', (780, 410, 1000, 437), 'oranye'), ('angka_k1', (780, 438, 912, 522), 'putih'), ('satuan_k1', (912, 478, 1000, 522), 'putih'),
  ('sub_k1', (780, 522, 1265, 550), 'terang'), ('angka2_k1', (780, 562, 925, 616), 'oranye'), ('teks2_k1', (925, 582, 1260, 616), 'terang'),
  ('hantu_k1', (1010, 392, 1275, 500), 'hantu'),
  ('kick_k2', (1315, 410, 1520, 437), 'gelap'), ('angka_k2', (1315, 438, 1528, 522), 'gelap'), ('satuan_k2', (1528, 478, 1580, 522), 'gelap'),
  ('sub_k2', (1315, 522, 1760, 550), 'gelap'), ('angka2_k2', (1315, 562, 1348, 616), 'gelap'), ('teks2_k2', (1348, 582, 1760, 616), 'gelap'),
  ('pola', (755, 658, 1160, 686), 'terang'),
  ('nama1', (848, 712, 1080, 760), 'oranye'), ('desk1', (1095, 720, 1700, 755), 'terang'), ('ikon1', (778, 702, 845, 772), 'bukanlatar'),
  ('nama2', (848, 796, 1080, 844), 'oranye'), ('desk2', (1095, 804, 1700, 840), 'terang'),
  ('nama3', (848, 880, 1080, 928), 'gelap'), ('desk3', (1095, 872, 1560, 936), 'gelap'), ('persen3', (1580, 868, 1700, 914), 'oranye'),
  ('bilah3', (1580, 914, 1800, 932), 'oranye'),
  ('garis_kaki', (100, 960, 1820, 975), 'oranye'), ('catatan', (100, 980, 900, 1008), 'putih'), ('sumber', (100, 1010, 1300, 1036), 'abu'),
  ('sumber1', (100, 1010, 262, 1036), 'abu'), ('pil_teks', (140, 420, 398, 448), 'gelap'), ('hantu_k2', (1545, 392, 1812, 500), 'hantu_o'),
  ('bilah_lbl', (1700, 895, 1795, 912), 'abu'),
 ],
 1: [
  ('garis_kepala', (100, 80, 175, 98), 'oranye'), ('label', (180, 76, 470, 102), 'putih'),
  ('kris', (1310, 55, 1548, 126), 'bukanlatar'), ('bnpb', (1665, 60, 1830, 97), 'putih'),
  ('judul1', (95, 195, 700, 395), 'putih'), ('judul2', (95, 400, 700, 595), 'putih'), ('judul3', (95, 600, 1100, 800), 'oranye'),
  ('sub', (100, 830, 760, 875), 'putih'), ('pil1', (100, 884, 226, 940), 'putih'), ('garis_kaki', (100, 960, 1820, 975), 'oranye'),
  ('tanggal', (100, 980, 385, 1030), 'oranye'), ('label_kaki', (385, 998, 800, 1026), 'abu'), ('kredit', (1600, 995, 1820, 1022), 'terang'),
  ('tepi_kanan', (1880, 300, 1920, 700), 'oranye'), ('pil2', (236, 896, 326, 928), 'putih'), ('pil3', (346, 896, 500, 928), 'putih'),
 ],
 5: [
  ('label', (100, 50, 385, 86), 'putih'), ('nomor', (445, 48, 500, 90), 'oranye'), ('segmen', (500, 50, 830, 86), 'abu'),
  ('judul1', (95, 88, 1300, 200), 'putih'), ('judul2', (95, 200, 1330, 312), 'oranye'), ('sub', (100, 316, 900, 362), 'terang'),
  ('kredit', (400, 398, 645, 420), 'putih'), ('kick_foto', (130, 640, 520, 664), 'oranye'), ('angka_foto', (130, 668, 410, 790), 'putih'),
  ('satuan_foto', (410, 735, 520, 790), 'oranye'), ('teks_foto', (130, 792, 520, 822), 'putih'),
  ('no1', (700, 415, 750, 480), 'oranye'), ('ikon1', (760, 410, 845, 495), 'oranye'), ('nama1', (845, 412, 1000, 456), 'putih'), ('desk1', (845, 456, 1500, 484), 'terang'),
  ('no2', (700, 565, 750, 635), 'oranye'), ('nama2', (845, 550, 1100, 594), 'putih'), ('desk2', (845, 594, 1800, 646), 'terang'),
  ('no3', (700, 715, 750, 785), 'oranye'), ('nama3', (845, 700, 1035, 744), 'putih'), ('desk3', (845, 744, 1200, 800), 'terang'),
  ('pil_foto_teks', (148, 842, 240, 862), 'putih'), ('tag_teks', (1044, 716, 1175, 732), 'putih'),
  ('tl_lbl1', (1195, 775, 1345, 793), 'putih'), ('tl_lbl2', (1420, 775, 1560, 793), 'putih'), ('tl_lbl3', (1660, 775, 1760, 793), 'putih'),
  ('tl_atas', (1340, 694, 1560, 724), 'oranye'), ('ikon3', (760, 712, 845, 795), 'bukanlatar'),
  ('no4', (700, 845, 750, 915), 'gelap'), ('nama4', (845, 840, 1100, 890), 'gelap'), ('desk4', (845, 888, 1300, 916), 'gelap'),
  ('garis_kaki', (100, 960, 1820, 975), 'oranye'), ('catatan', (100, 980, 1100, 1008), 'putih'), ('sumber', (100, 1010, 1600, 1036), 'abu'),
 ],
}

def ukur(path, hal):
    im = np.asarray(Image.open(path).convert('RGB').resize((1920, 1080))).astype(int)
    hasil = {}
    for nama, (x0, y0, x1, y1), p in E[hal]:
        c = im[y0:y1, x0:x1]; m = pred(p)(c[..., 0], c[..., 1], c[..., 2])
        ys, xs = np.nonzero(m)
        if len(xs) < 4: hasil[nama] = None; continue
        warna = np.median(c[m], axis=0).astype(int)
        hasil[nama] = (x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1, '%02X%02X%02X' % tuple(warna))
    return hasil

if __name__ == '__main__':
    hal = int(sys.argv[1]); a = ukur(sys.argv[2], hal)
    b = ukur(sys.argv[3], hal) if len(sys.argv) > 3 else None
    buruk = 0
    for k, v in a.items():
        if b is None: print(f'{k:14s} {v}'); continue
        w = b[k]
        if v is None or w is None: print(f'{k:14s} rujukan={v} buatan={w}'); continue
        d = [w[i] - v[i] for i in range(4)]
        tanda = '  ' if max(map(abs, d)) <= 2 else '<<'
        buruk += tanda == '<<'
        print(f'{tanda} {k:13s} ruj {v[:4]} {v[4]}  selisih x0{d[0]:+d} y0{d[1]:+d} x1{d[2]:+d} y1{d[3]:+d}  warna {w[4]}')
    if b: print('elemen meleset >2px:', buruk, 'dari', len(a))
