"""Gabung _sampul.pdf + _isi.pdf jadi PDF final; tulis toc.json (nomor halaman tiap bab) untuk putaran kedua kajian.py."""
import json, re, pymupdf
from pathlib import Path
D = Path(__file__).resolve().parent
M = json.load(open(D / 'meta.json', encoding='utf-8'))
out = pymupdf.open()
for f in ('_sampul.pdf', '_isi.pdf'):
    out.insert_pdf(pymupdf.open(D / f))
out.set_metadata({'title': M['judul'], 'author': 'Badan Nasional Penanggulangan Bencana', 'subject': M['sub']})
KUNCI = {'Ringkasan Eksekutif': 'Ringkasan Eksekutif', 'Lampiran': 'LAMPIRAN', **{f'Bab {i}': f'BAB {i}' for i in range(1, 8)}}
toc = {}
for i in range(2, out.page_count):
    t = re.sub(r'\s+', ' ', out[i].get_text()).replace('B A B ', 'BAB ').replace('L A M P I R A N', 'LAMPIRAN')
    for k, pola in KUNCI.items():
        if k not in toc and re.search(r'(^| )' + pola + r'( |$)', t):
            toc[k] = i   # sampul tanpa nomor, jadi nomor tercetak = indeks halaman
json.dump(toc, open(D / 'toc.json', 'w', encoding='utf-8'))
keluar = D / (M['berkas'] + '.pdf')
out.save(keluar, garbage=3, deflate=True)
print(keluar.name, out.page_count, 'halaman', toc)
