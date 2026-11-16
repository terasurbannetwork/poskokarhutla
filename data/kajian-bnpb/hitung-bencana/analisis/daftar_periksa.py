"""Kumpulkan semua penanda [BELUM TERVERIFIKASI] di naskah/*.md ke riset/DAFTAR-PERIKSA.md (satu baris per penanda).
Pakai: python analisis/daftar_periksa.py  (dari folder hitung-bencana)"""
import re, glob, os, collections
AKAR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
baris, per = [], collections.Counter()
for f in sorted(glob.glob(os.path.join(AKAR, 'naskah', '*.md'))):
    nama = os.path.basename(f); judul = ''
    for i, l in enumerate(open(f, encoding='utf-8'), 1):
        if l.startswith('#'): judul = l.strip('# \n')
        if '[BELUM TERVERIFIKASI]' in l:
            teks = re.sub(r'\s+', ' ', l.strip()).replace('|', '/')
            baris.append(f'| {nama}:{i} | {judul[:50]} | {teks[:220]} |'); per[nama] += 1
with open(os.path.join(AKAR, 'riset', 'DAFTAR-PERIKSA.md'), 'w', encoding='utf-8') as o:
    o.write('# Daftar periksa: penanda [BELUM TERVERIFIKASI]\n\nDibuat ulang oleh `analisis/daftar_periksa.py`. '
            f'Jumlah penanda: {len(baris)} di {len(per)} berkas.\n\n| Letak | Bagian | Kalimat |\n| --- | --- | --- |\n')
    o.write('\n'.join(baris) + '\n')
print(len(baris), dict(per))
