#!/usr/bin/env python3
"""Ikon garis dari registri tema.json (kunci 'ikon') ke PNG satu warna berlatar transparan.

    from ikon import png
    png(t, 'gempa', 'kertas', folder)  -> Path PNG 256 px (dibuat sekali, lalu dipakai ulang)

Glif dibaca dari satu sumber di repo: GLIF di bangun/visual/ikon.mjs (path Lucide yang disalin ke sana, glif
'deck:' dari ikon.mjs deck harian, dan glif 'khusus:' yang digambar komponen ikon). Node membaca modul itu
sekali per proses (NODE atau node di PATH). Kunci cache = konsep, hex, dan hash isi glif, jadi glif yang
berubah di komponen ikon tidak pernah memakai PNG lama. Dirasterkan dengan PyMuPDF, tanpa peramban.
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

import pymupdf

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'kontrak'))
from tema import warna  # noqa: E402

AKAR = Path(__file__).resolve().parents[2]  # data/kajian-bnpb
SUMBER = AKAR / 'bangun/visual/ikon.mjs'
PX = 256


@lru_cache(maxsize=1)
def semua_glif():
    """{'lucide:siren': '<path .../>', ...} dari GLIF di bangun/visual/ikon.mjs."""
    node = os.environ.get('NODE') or shutil.which('node')
    if not node:
        raise KeyError('node tidak ditemukan (setel NODE); glif dibaca dari bangun/visual/ikon.mjs')
    r = subprocess.run([node, '--input-type=module', '-e',
                        f'import({json.dumps(SUMBER.as_uri())}).then(m => process.stdout.write(JSON.stringify(m.GLIF)))'],
                       capture_output=True, text=True, timeout=60)
    if r.returncode:
        raise KeyError(f'gagal membaca GLIF dari {SUMBER}: {r.stderr.strip()[-300:]}')
    return json.loads(r.stdout)


def svg_glif(glif):
    g = semua_glif().get(glif)
    if g is None:
        raise KeyError(f'glif {glif}: belum digambar di {SUMBER.relative_to(AKAR)}')
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
    t = json.loads((AKAR / 'tema.json').read_text(encoding='utf-8'))
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
    print(f'ikon.py lolos: {len(dibuat)} glif registri dirender dari {SUMBER.relative_to(AKAR)}, konsep asing ditolak')
