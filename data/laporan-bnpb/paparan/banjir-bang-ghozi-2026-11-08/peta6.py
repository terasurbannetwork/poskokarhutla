import os; HOME = os.path.expanduser('~').replace(chr(92), '/') + '/'   # folder rumah, bukan jalur mutlak satu mesin
"""Peta slide 2: kecamatan Awas dan Siaga 4 hari ke depan, Sumatera bagian utara, label kab/kota dengan garis penunjuk, sisipan se-Indonesia.
Batas kecamatan tidak tersedia: tiap kab/kota dibagi per titik pusat kecamatan terdekat (Voronoi di dalam batas kab/kota BIG)."""
import json, glob, os, math, hashlib, shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
SK = HOME + '.claude/skills/ppt-konsultan/bnpb/assets/'; PJ = SK + 'proyek-banjir0811/'; G = SK + 'proyek-bnpb/geo/kabupaten/'
R = 'D:/Project/Work/BNPB/poskokarhutla/'
S4 = json.load(open('kec4s.json', encoding='utf-8')); P = json.load(open('data/banjir_data_prakiraan72.json', encoding='utf-8'))['kec']; PUS = json.load(open(R + 'public/banjir/data/pusat_kec.json', encoding='utf-8'))
LON0, LON1, LAT0, LAT1 = 92.4, 104.0, -3.0, 6.4
PW = 2000; PH = int(PW * (LAT1 - LAT0) / (LON1 - LON0)); SS = 2
X = lambda o: (o - LON0) / (LON1 - LON0) * PW * SS; Y = lambda a: (LAT1 - a) / (LAT1 - LAT0) * PH * SS
WR = {3: (143, 63, 7), 2: (232, 137, 74)}; ABU = (230, 234, 240); NAVY = '#24384F'
rings = lambda g: [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
F = lambda s, b=True: ImageFont.truetype(SK + 'fonts/Roboto-' + ('Bold' if b else 'Medium') + '.ttf', s * SS)
geo = {}
for f_ in sorted(glob.glob(G + '*.json')):
    kp = os.path.basename(f_)[:2]
    for ft in json.load(open(f_, encoding='utf-8'))['features']: geo[kp + '|' + ft['properties']['kab']] = ft['geometry']
im = Image.new('RGB', (PW * SS, PH * SS), '#FFFFFF'); d = ImageDraw.Draw(im)
for k, g in geo.items():
    for q in rings(g):
        pts = [(X(c[0]), Y(c[1])) for c in q[0]]
        if len(pts) > 2: d.polygon(pts, fill=ABU, outline='#FFFFFF', width=1)
arr = np.array(im); jangkar = {}
for r in S4['rows']:
    k = r['k']; lk = [(n, v) for n, v in PUS.items() if n.startswith(k + '|')]
    if not lk or k not in geo: continue
    m = Image.new('L', (PW * SS, PH * SS), 0); md = ImageDraw.Draw(m)
    for q in rings(geo[k]):
        pts = [(X(c[0]), Y(c[1])) for c in q[0]]
        if len(pts) > 2: md.polygon(pts, fill=255)
    a = np.array(m) > 0; ys, xs = np.nonzero(a)
    if not len(xs): continue
    cx = np.array([X(v[1]) for _, v in lk]); cy = np.array([Y(v[0]) for _, v in lk]); lv = np.array([max(P[n]['b']) if n in P else 0 for n, _ in lk])
    idx = np.argmin((xs[:, None] - cx) ** 2 + (ys[:, None] - cy) ** 2, axis=1); l = lv[idx]
    for L_, w in WR.items(): arr[ys[l == L_], xs[l == L_]] = w
    grid = np.full(a.shape, -1, dtype=int); grid[ys, xs] = idx
    tepi = (grid[1:, :-1] != grid[:-1, :-1]) | (grid[:-1, 1:] != grid[:-1, :-1]); tepi &= a[:-1, :-1]
    arr[:-1, :-1][tepi] = (255, 255, 255)
    ber = l >= 2
    if ber.any(): jangkar[k] = (float(xs[ber].mean()), float(ys[ber].mean()))
im = Image.fromarray(arr); d = ImageDraw.Draw(im)
def kotak_bayang(x0, y0, x1, y1, rad, isi='#FFFFFF', tepi_='#C9D1DB'):
    t = 24 * SS; w, h = int(x1 - x0), int(y1 - y0); m = Image.new('L', (w + 2 * t, h + 2 * t), 0); ImageDraw.Draw(m).rounded_rectangle([t, t, t + w, t + h], radius=rad, fill=90); m = m.filter(ImageFilter.GaussianBlur(7 * SS))
    im.paste(Image.new('RGB', m.size, NAVY), (int(x0) - t, int(y0) - t + 4 * SS), m); d.rounded_rectangle([x0, y0, x1, y1], radius=rad, fill=isi, outline=tepi_, width=2 * SS)
item = [(r['kab'], jangkar[r['k']]) for r in S4['rows'] if r['k'] in jangkar and LON0 < PUS[next(n for n in PUS if n.startswith(r['k'] + '|'))][1] < LON1 and r['pr'] in ('11', '12', '13')]
item.sort(key=lambda x: x[1][0]); n = len(item) // 2; kiri, kanan = item[:n + len(item) % 2], item[n + len(item) % 2:]
H = PH * SS; f = F(30); ph = 56 * SS
def kolom(xs_, tepi_x, y0, y1, sisi):
    xs_ = sorted(xs_, key=lambda x: x[1][1]); langkah = (y1 - y0) / max(len(xs_) - 1, 1)
    for i, (nm, (ax, ay)) in enumerate(xs_):
        y = y0 + i * langkah; w = d.textlength(nm, font=f) + 44 * SS
        x0, x1 = (tepi_x, tepi_x + w) if sisi == 'l' else (tepi_x - w, tepi_x)
        ujung = x1 if sisi == 'l' else x0
        d.line([(ujung, y), (ax, ay)], fill=NAVY, width=2 * SS); d.ellipse([ax - 7 * SS, ay - 7 * SS, ax + 7 * SS, ay + 7 * SS], fill=NAVY, outline='#FFFFFF', width=2 * SS)
        kotak_bayang(x0, y - ph / 2, x1, y + ph / 2, ph / 2); d.text(((x0 + x1) / 2, y), nm, font=f, fill=NAVY, anchor='mm')
kolom(kiri, 24 * SS, 60 * SS, H - 60 * SS, 'l'); kolom(kanan, PW * SS - 24 * SS, 60 * SS, H * .68, 'r')
# sisipan se-Indonesia
bx0, by0, bx1, by1 = (PW - 640) * SS, (PH - 400) * SS, (PW - 24) * SS, (PH - 24) * SS
kotak_bayang(bx0, by0, bx1, by1, 12 * SS)
d.text((bx0 + 20 * SS, by0 + 14 * SS), 'Se-Indonesia', font=F(26), fill=NAVY)
ix = lambda o: bx0 + 16 * SS + (o - 94.5) / 47 * (bx1 - bx0 - 32 * SS); iy = lambda a: by0 + 54 * SS + (6.5 - a) / 18 * (by1 - by0 - 130 * SS)
for k, g in geo.items():
    for q in rings(g):
        pts = [(ix(c[0]), iy(c[1])) for c in q[0][::4]]
        if len(pts) > 2: d.polygon(pts, fill='#DCE3EB')
d.rectangle([ix(95), iy(6.4), ix(104), iy(-3.0)], outline=NAVY, width=2 * SS)
luar = [r for r in S4['rows'] if r['pr'] not in ('11', '12', '13')]
for r in luar:
    v = next(v for n, v in PUS.items() if n.startswith(r['k'] + '|')); x, y = ix(v[1]), iy(v[0]); d.ellipse([x - 7 * SS, y - 7 * SS, x + 7 * SS, y + 7 * SS], fill='#E8894A', outline='#FFFFFF', width=2 * SS)
d.text(((bx0 + bx1) / 2, by1 - 26 * SS), ', '.join(r['kab'] for r in luar), font=F(25, False), fill=NAVY, anchor='mm')
km = 111.32; px = 100 / km / (LON1 - LON0) * PW * SS; x0, y0 = X(96.6), H - 44 * SS
d.line([(x0, y0), (x0 + px, y0)], fill=NAVY, width=4 * SS); d.text((x0 + px / 2, y0 - 26 * SS), '100 km', font=F(26, False), fill=NAVY, anchor='mm')
im = im.resize((PW, PH), Image.LANCZOS); png = PJ + 'petanya/probabilitas-081126.png'; im.save(png, optimize=True)
mas = PJ + 'petanya/kec4s-081126.json'; shutil.copy('kec4s.json', mas); sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
json.dump({'unsur_peta': {'sumber_batas': 'Batas kab/kota BIG', 'sistem_referensi': 'WGS 84', 'proyeksi': 'ekuirektangular', 'catatan': 'Batas kecamatan perkiraan dari titik pusat'}, 'masukan': {'kec4s-081126.json': sha(mas)}}, open(PJ + 'petanya/probabilitas-081126.json', 'w', encoding='utf-8'), ensure_ascii=False)
print(im.size, len(item), len(luar))
