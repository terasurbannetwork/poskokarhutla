"""Satukan berkas renlap asli ke deck: tiap halaman jadi slide gambar sebelum penutup, lalu PDF ulang.
Jalankan dengan venv mesin BNPB tepat sesudah deck.py (sekali saja, karena menambah slide): python gabung_lampiran.py"""
import subprocess, sys, tempfile
from pathlib import Path
from pptx import Presentation
from pptx.util import Pt
from pptx.dml.color import RGBColor
from PIL import Image

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(Path.home() / '.claude/skills/ppt-konsultan/bnpb/scripts'))
from deck import ke_pdf  # noqa: E402

DECK = HERE / 'Pantauan Udara Merauke 011126.pptx'
LAMP = [('Lampiran D. Berkas asli renlap rute udara Merauke, 30 Oktober 2026', HERE / 'sumber/Renlap Rute Udara Merauke 301026.pdf', 1),
        ('Lampiran E. Berkas asli renlap darat SIPPA Kalimantan Tengah (contoh), 1 November 2026', HERE / 'sumber/Renlap Darat SIPPA Kalteng 011126.pdf', 2)]
NAVY = RGBColor(0x0B, 0x1F, 0x3A)

prs = Presentation(DECK)
W, H = prs.slide_width, prs.slide_height
kosong = min(prs.slide_layouts, key=lambda l: len(l.placeholders))
tmp = Path(tempfile.mkdtemp())
for judul, pdf, per in LAMP:
    subprocess.run(['pdftoppm', '-r', '130', '-jpeg', '-jpegopt', 'quality=82', str(pdf), str(tmp / pdf.stem[:10])], check=True)
    hal = sorted(tmp.glob(pdf.stem[:10] + '-*.jpg'))
    for i in range(0, len(hal), per):
        s = prs.slides.add_slide(kosong)
        for ph in list(s.placeholders):
            ph._element.getparent().remove(ph._element)
        tb = s.shapes.add_textbox(Pt(36), Pt(14), W - Pt(72), Pt(26)).text_frame
        r = tb.paragraphs[0].add_run()
        nomor = f'{i + 1}' if per == 1 or i + 1 == len(hal) else f'{i + 1} dan {i + 2}'
        r.text = f'{judul}, halaman {nomor} dari {len(hal)}'
        r.font.name, r.font.size, r.font.bold, r.font.color.rgb = 'Roboto', Pt(14), True, NAVY
        grup = hal[i:i + per]
        top, tinggi = Pt(46), H - Pt(56)
        lebar_sel = (W - Pt(48) - Pt(12) * (len(grup) - 1)) / len(grup)
        for j, g in enumerate(grup):
            iw, ih = Image.open(g).size
            sk = min(lebar_sel / iw, tinggi / ih)
            w, h = int(iw * sk), int(ih * sk)
            x = int(Pt(24) + j * (lebar_sel + Pt(12)) + (lebar_sel - w) / 2)
            s.shapes.add_picture(str(g), x, int(top + (tinggi - h) / 2), w, h)
# penutup tetap halaman terakhir
ids = prs.slides._sldIdLst
penutup = [e for e in ids][len(ids) - 1 - sum(-(-len(sorted(tmp.glob(p.stem[:10] + '-*.jpg'))) // n) for _, p, n in LAMP)]
ids.remove(penutup); ids.append(penutup)
prs.save(DECK)
print('slide', len(prs.slides), 'pdf', ke_pdf(DECK))
