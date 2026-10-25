#!/usr/bin/env python3
"""Susun tiga peta IRBI 2025 (banjir, tanah longsor, abrasi) jadi satu gambar bertumpuk untuk Gambar 6.x.

Tiap panel dirender dan lolos gerbang render.mjs sendiri-sendiri; berkas ini hanya menumpuk PNG-nya dan menulis manifest
gabungan (ukuran cetak, huruf terkecil, buku hex) yang dibaca bangun/docx/bangun.py.
"""
import json
from pathlib import Path
from PIL import Image

KE = Path(__file__).resolve().parents[2] / 'gambar' / 'air'
PANEL, NAMA, SELA_PX = ['bab06-irbi-banjir', 'bab06-irbi-longsor', 'bab06-irbi-abrasi'], 'bab06-peta-irbi-banjir-longsor-abrasi', 24

im = [Image.open(KE / f'{n}.png').convert('RGB') for n in PANEL]
man = [json.loads((KE / f'{n}.json').read_text()) for n in PANEL]
w = max(i.width for i in im)
out = Image.new('RGB', (w, sum(i.height for i in im) + SELA_PX * (len(im) - 1)), 'white')
y = 0
for i in im:
    out.paste(i, (0, y))
    y += i.height + SELA_PX
dpi = im[0].info.get('dpi', (300, 300))
out.save(KE / f'{NAMA}.png', dpi=dpi)
hexb = {}
for m in man:
    for h, ps in m['hex'].items():
        hexb[h] = sorted(set(hexb.get(h, [])) | set(ps))
teks_min = min(float(x) for n in PANEL for x in __import__('re').findall(r'font-size="([\d.]+)"', (KE / f'{n}.svg').read_text()))
lebar_cm = man[0]['ukuran_cm'][0]
(KE / f'{NAMA}.json').write_text(json.dumps({'nama': NAMA, 'jenis': 'peta', 'panel': PANEL, 'teks_min_pt': teks_min,
    'ukuran_cm': [lebar_cm, round(lebar_cm * out.height / out.width, 2)], 'hex': hexb}, ensure_ascii=False, indent=1))
print(NAMA, out.size)
