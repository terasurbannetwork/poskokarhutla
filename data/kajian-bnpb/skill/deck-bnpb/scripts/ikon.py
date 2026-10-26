#!/usr/bin/env python3
"""Ikon garis dari registri tema.json (kunci 'ikon') ke PNG satu warna berlatar transparan.

    from ikon import png
    png(t, 'gempa', 'kertas', folder)  -> Path PNG 256 px (dibuat sekali, lalu dipakai ulang)

Glif dibaca dari glif.json di folder ini: {"lucide:siren": "<path .../>", ...}, isi dalam <svg viewBox="0 0 24 24">
gaya garis Lucide (stroke currentColor, lebar 2). Salinan beku dari GLIF di bangun/visual/ikon.mjs repo poskokarhutla,
jadi skill tidak butuh Node. Konsep baru: tambah glif ke glif.json (path Lucide asli, lisensi ISC) dan kunci ke
tema.json 'ikon'; satu konsep satu glif (D-25). Kunci cache = konsep, hex, dan hash isi glif, jadi glif yang berubah
tidak pernah memakai PNG lama. Dirasterkan dengan PyMuPDF, tanpa peramban.
"""
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path

import pymupdf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from tema import muat, warna  # noqa: E402

SUMBER = Path(__file__).resolve().parent / 'glif.json'
PX = 256


@lru_cache(maxsize=1)
def semua_glif():
    """{'lucide:siren': '<path .../>', ...} dari glif.json."""
    return json.loads(SUMBER.read_text(encoding='utf-8'))


def svg_glif(glif):
    g = semua_glif().get(glif)
    if g is None:
        raise KeyError(f'glif {glif}: belum ada di {SUMBER.name}')
    return g


def png(t, konsep, token_warna, folder):
    """Konsep registri + token warna -> PNG di folder (cache per konsep, hex, dan isi glif)."""
    if konsep not in t['ikon'] or konsep.startswith('_'):
        raise KeyError(f'ikon "{konsep}" tidak ada di registri tema.json (D-25: satu konsep satu glif)')
    hx = warna(t, token_warna)
    isi = svg_glif(t['ikon'][konsep]).replace('currentColor', hx)
    p = Path(folder) / f'{konsep}-{hx[1:]}-{hashlib.sha1(isi.encode()).hexdigest()[:8]}.png'
    if not p.exists():
        p.parent.mkdir(parents=True, exist_ok=True)
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{PX}" height="{PX}" viewBox="0 0 24 24" fill="none" '
               f'stroke="{hx}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{isi}</svg>')
        pymupdf.open('svg', svg.encode())[0].get_pixmap(alpha=True).save(p)
    return p


if __name__ == '__main__':
    import tempfile
    t = muat()
    with tempfile.TemporaryDirectory() as d:
        dibuat = [k for k in t['ikon'] if not k.startswith('_')]
        for k in dibuat:
            pix = pymupdf.Pixmap(str(png(t, k, 'navy', d)))
            assert pix.alpha and pix.width == PX, k
            assert pix.pixel(0, 0)[3] == 0, f'{k}: sudut tidak transparan'
            assert any(pix.samples[i] for i in range(3, len(pix.samples), 4)), f'{k}: glif kosong'
        a, b = png(t, 'gempa', 'navy', d), png(t, 'gempa', 'kertas', d)
        assert a != b, 'cache tidak membedakan warna'
        try:
            png(t, 'tidak-ada', 'navy', d)
        except KeyError as e:
            assert 'registri' in str(e), e
        else:
            raise AssertionError('konsep di luar registri lolos')
    print(f'ikon.py lolos: {len(dibuat)} glif registri dirender dari {SUMBER.name}, konsep asing ditolak')
