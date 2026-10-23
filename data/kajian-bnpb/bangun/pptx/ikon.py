#!/usr/bin/env python3
"""Ikon garis dari registri tema.json (kunci 'ikon') ke PNG satu warna berlatar transparan.

    from ikon import png
    png(t, 'gempa', 'kertas', folder)  -> Path PNG 256 px (dibuat sekali, lalu dipakai ulang)

Glif 'deck:<nama>' dibaca dari path SVG di data/laporan-bnpb/harian-2026-10-23/ikon.mjs, 'lucide:<nama>'
dari paket lucide-react yang terpasang (LUCIDE_DIR). Glif 'khusus:<nama>' belum digambar (tugas komponen
ikon), jadi ditolak dengan pesan yang menyebut glifnya. Dirasterkan dengan PyMuPDF, tanpa peramban.
"""
import os
import re
import sys
from pathlib import Path

import pymupdf

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'kontrak'))
from tema import warna  # noqa: E402

AKAR = Path(__file__).resolve().parents[2]  # data/kajian-bnpb
DECK = AKAR.parent / 'laporan-bnpb/harian-2026-10-23/ikon.mjs'
LUCIDE = Path(os.environ.get('LUCIDE_DIR', '/Users/alfatehanseptianta/Developer/worth-it/node_modules/lucide-react/dist/esm/icons'))
PX = 256


def svg_glif(glif):
    """'deck:gempa' / 'lucide:siren' -> isi SVG (path, circle, rect, ...) dalam viewBox 24."""
    sumber, _, nama = glif.partition(':')
    if sumber == 'deck':
        m = re.search(rf"^\s*{re.escape(nama)}: '(.*)',\s*$", DECK.read_text(encoding='utf-8'), re.M)
        if not m:
            raise KeyError(f'glif {glif}: tidak ada di {DECK.name}')
        return m[1]
    if sumber == 'lucide':
        p = LUCIDE / f'{nama}.mjs'
        if not p.exists():
            raise KeyError(f'glif {glif}: {p} tidak ada (setel LUCIDE_DIR)')
        unsur = re.findall(r'\[\s*"(\w+)",\s*\{([^}]*)\}\s*\]', p.read_text(encoding='utf-8'))
        return ''.join('<%s %s/>' % (tag, ' '.join(f'{k}="{v}"' for k, v in re.findall(r'(\w+):\s*"([^"]*)"', a) if k != 'key'))
                       for tag, a in unsur)
    raise KeyError(f'glif {glif}: belum digambar (glif khusus adalah tugas komponen ikon)')


def png(t, konsep, token_warna, folder):
    """Konsep registri + token warna -> PNG di folder (cache per konsep dan hex)."""
    if konsep not in t['ikon'] or konsep.startswith('_'):
        raise KeyError(f'ikon "{konsep}" tidak ada di registri tema.json (D-25: satu konsep satu glif)')
    hx = warna(t, token_warna)
    p = Path(folder) / f'{konsep}-{hx[1:]}.png'
    if not p.exists():
        p.parent.mkdir(parents=True, exist_ok=True)
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{PX}" height="{PX}" viewBox="0 0 24 24" fill="none" '
               f'stroke="{hx}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{svg_glif(t["ikon"][konsep])}</svg>')
        pymupdf.open('svg', svg.encode())[0].get_pixmap(alpha=True).save(p)
    return p


if __name__ == '__main__':
    import json
    import tempfile
    t = json.loads((AKAR / 'tema.json').read_text(encoding='utf-8'))
    with tempfile.TemporaryDirectory() as d:
        dibuat = [k for k, g in t['ikon'].items() if not k.startswith('_') and not g.startswith('khusus:')]
        for k in dibuat:
            pix = pymupdf.Pixmap(str(png(t, k, 'navy', d)))
            assert pix.alpha and pix.width == PX, k
            assert pix.pixel(0, 0)[3] == 0, f'{k}: sudut tidak transparan'
            assert any(pix.samples[i] for i in range(3, len(pix.samples), 4)), f'{k}: glif kosong'
        for salah, harap in (('tidak-ada', 'registri'), ('tsunami', 'belum digambar')):
            try:
                png(t, salah, 'navy', d)
            except KeyError as e:
                assert harap in str(e), e
            else:
                raise AssertionError(f'{salah} lolos')
    print(f'ikon.py lolos: {len(dibuat)} glif deck/lucide dirender, glif khusus ditolak')
