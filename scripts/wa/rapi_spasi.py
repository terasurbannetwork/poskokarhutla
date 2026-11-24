"""Rapikan spasi ganda di teks deck sebelum PDF dibuat (pemilik 19 Nov 2026: temuan pemeriksa yang aman dibetulkan otomatis).

python rapi_spasi.py <deck.pptx> [kunci.json]
Mengganti dua spasi atau lebih di antara dua karakter bukan spasi menjadi satu spasi, di tiap run teks, sambungan antar-run,
dan sel tabel, termasuk shape di dalam grup. Shape angka sistem (nama di kunci.json) tidak disentuh. Angka tidak pernah berubah:
yang dihapus hanya spasi. Menulis ulang berkas hanya bila ada yang dibetulkan. Keluaran: JSON {"diperbaiki": n, "slide": [..]}.
"""
import json
import re
import sys

from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

GANDA = re.compile(r'(?<=\S) {2,}(?=\S)')


def rapikan_paragraf(par):
    n = 0
    runs = list(par.runs)
    for r in runs:
        baru = GANDA.sub(' ', r.text)
        if baru != r.text:
            n += 1
            r.text = baru
    # sambungan antar-run: "Banjir " + " Aceh" -> "Banjir " + "Aceh"
    for a, b in zip(runs, runs[1:]):
        if a.text.endswith(' ') and b.text.startswith(' ') and a.text.strip() and b.text.strip():
            b.text = b.text.lstrip(' ')
            n += 1
    return n


def rapikan_shape(sh, kunci):
    if sh.name in kunci:
        return 0
    n = 0
    if sh.shape_type == MSO_SHAPE_TYPE.GROUP:
        for s in sh.shapes:
            n += rapikan_shape(s, kunci)
        return n
    if getattr(sh, 'has_text_frame', False) and sh.has_text_frame:
        for p in sh.text_frame.paragraphs:
            n += rapikan_paragraf(p)
    if getattr(sh, 'has_table', False) and sh.has_table:
        for row in sh.table.rows:
            for c in row.cells:
                for p in c.text_frame.paragraphs:
                    n += rapikan_paragraf(p)
    return n


def main():
    pptx = sys.argv[1]
    kunci = set()
    if len(sys.argv) > 2:
        try:
            kunci = {k.get('shape') for k in json.load(open(sys.argv[2], encoding='utf-8')) if isinstance(k, dict)}
        except (OSError, ValueError):
            kunci = set()
    prs = Presentation(pptx)
    total, slide = 0, []
    for i, s in enumerate(prs.slides, 1):
        n = sum(rapikan_shape(sh, kunci) for sh in s.shapes)
        if n:
            total += n
            slide.append(i)
    if total:
        prs.save(pptx)
    print(json.dumps({'diperbaiki': total, 'slide': slide}))


if __name__ == '__main__':
    main()
