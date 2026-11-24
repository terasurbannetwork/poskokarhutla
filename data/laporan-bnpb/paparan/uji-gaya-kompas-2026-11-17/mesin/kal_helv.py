from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor
from PIL import Image, ImageFont
import numpy as np, pp, os, json
P = 6350
FD = os.path.expandvars(r'%LOCALAPPDATA%\Microsoft\Windows\Fonts')
F = {'Anton': os.path.join(FD, 'Anton-Regular.ttf'), 'Arial': os.path.join(FD, 'Helvetica.ttf'), 'ArialB': os.path.join(FD, 'Helvetica-Bold.ttf')}
cases = [('Arial', 'Angka 2025 dan 2026 berbeda cakupan dan tanggal; tidak dijumlahkan.', 20), ('Arial', 'Dua kali berturut-turut: ketahanan sungai', 27),
         ('Arial', 'meninggal & hilang · banjir-longsor', 19), ('ArialB', 'BNPB / KOMPAS SIANG', 18), ('ArialB', 'BNPB', 36), ('ArialB', 'Lanud Soewondo', 15)]
prs = Presentation(); prs.slide_width = Emu(1920 * P); prs.slide_height = Emu(1080 * P)
s = prs.slides.add_slide(prs.slide_layouts[6]); y = 40; pos = []
for f, t, px in cases:
    b = s.shapes.add_textbox(Emu(100 * P), Emu(y * P), Emu(1700 * P), Emu(int(px * 1.5) * P)); tf = b.text_frame; tf.word_wrap = False
    for a in ('margin_left', 'margin_right', 'margin_top', 'margin_bottom'): setattr(tf, a, 0)
    r = tf.paragraphs[0].add_run(); r.text = t; r.font.size = Pt(px / 2); r.font.name = 'Helvetica'; r.font.bold = f == 'ArialB'; r.font.color.rgb = RGBColor(0, 0, 0)
    pos.append(y); y += int(px * 1.7) + 10
prs.save('kal/helv.pptx'); pp.render('kal/helv.pptx', 'kal/helv')
im = np.asarray(Image.open('kal/helv/s1.png').convert('L'))
hasil = {}
for (f, t, px), y in zip(cases, pos):
    reg = im[y:y + int(px * 1.5), 50:1900] < 128; ys, xs = np.nonzero(reg)
    fo = ImageFont.truetype(F[f], 1000); b = [v * px / 1000 for v in fo.getbbox(t, anchor='ls')]
    w = xs.max() + 1 - xs.min(); cb = (ys.min() - b[1]) / px; dx = (xs.min() + 50 - 100 - b[0]) / px; sm = (b[2] - b[0]) / w
    print(f, px, 'CB', round(cb, 3), 'DX', round(dx, 3), 'SM', round(sm, 4))
    hasil.setdefault(f, []).append((cb, dx, sm))
kal = {'SM': {'Anton': 1.0}, 'CB': {'Anton': 0.945}, 'DX': {'Anton': 0.03}}
for f, v in hasil.items():
    kal['CB'][f] = float(np.median([a[0] for a in v])); kal['DX'][f] = float(np.median([a[1] for a in v])); kal['SM'][f] = float(np.median([a[2] for a in v]))
json.dump(kal, open('kal.json', 'w'), indent=1); print(kal)
