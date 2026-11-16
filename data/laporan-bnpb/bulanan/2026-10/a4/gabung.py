"""Gabung _sampul.pdf + _isi.pdf jadi PDF final (sampul tanpa kepala dan kaki halaman)."""
import sys, pymupdf
from pathlib import Path
D = Path(__file__).resolve().parent
out = pymupdf.open()
for f in ('_sampul.pdf', '_isi.pdf'):
    out.insert_pdf(pymupdf.open(D / f))
out.set_metadata({'title': 'Laporan Bencana Oktober 2026', 'author': 'Badan Nasional Penanggulangan Bencana', 'subject': 'Laporan Kepala BNPB kepada Presiden Republik Indonesia'})
keluar = sys.argv[1] if len(sys.argv) > 1 else str(D / 'Laporan Bencana Oktober 2026 v3.pdf')
toc = {}
for i in range(1, out.page_count):
    t = out[i].get_text().replace('B A B ', 'BAB ').replace('L A M P I R A N', 'LAMPIRAN')
    for k in ('Ringkasan Eksekutif', 'BAB 1', 'BAB 2', 'BAB 3', 'BAB 4', 'BAB 5', 'BAB 6', 'BAB 7', 'LAMPIRAN'):
        if k not in toc and (k + chr(10)) in t and i > 1:
            toc[k] = i   # nomor tercetak = indeks halaman (sampul tanpa nomor)
import json
json.dump(toc, open(D / 'toc.json', 'w', encoding='utf-8'))
out.save(keluar, garbage=3, deflate=True)
print(keluar, out.page_count)
