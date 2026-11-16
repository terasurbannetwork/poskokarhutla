"""Sisipkan catatan pembicara (`_bicara` di spek) ke PPTX hasil bangun: python catatan.py <spek.json> <deck.pptx>
Pemetaan: urutan slide spek = urutan slide PPTX; slide lampiran-tabel yang dipecah mesin menjadi beberapa halaman mendapat catatan sama di halaman pertama."""
import json
import sys
from pptx import Presentation

spek = json.load(open(sys.argv[1], encoding='utf-8'))
prs = Presentation(sys.argv[2])
hal = list(prs.slides)
# hitung halaman per slide spek
n_lamp = len(hal) - len(spek['slide'])   # tambahan halaman dari pemecahan lampiran-tabel
idx, jml = 0, 0
for sl in spek['slide']:
    teks = sl.get('_bicara')
    if teks:
        hal[idx].notes_slide.notes_text_frame.text = teks
        jml += 1
    idx += 1
    if sl.get('jenis') == 'lampiran-tabel':
        idx += n_lamp
prs.save(sys.argv[2])
print('catatan pembicara:', jml, 'slide dari', len(hal), 'halaman')
