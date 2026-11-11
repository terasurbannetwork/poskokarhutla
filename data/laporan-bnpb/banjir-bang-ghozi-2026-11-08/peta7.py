import os; HOME = os.path.expanduser('~').replace(chr(92), '/') + '/'   # folder rumah, bukan jalur mutlak satu mesin
"""Peta slide 2: kecamatan Awas dan Siaga 4 hari ke depan, Sumatera bagian utara, label kab/kota dengan garis penunjuk, sisipan se-Indonesia.
Batas kecamatan tidak tersedia: tiap kab/kota dibagi per titik pusat kecamatan terdekat (Voronoi di dalam batas kab/kota BIG)."""
import json, glob, os, math, hashlib, shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
SK = HOME + '.claude/skills/ppt-konsultan/bnpb/assets/'; PJ = SK + 'proyek-banjir0811/'; G = SK + 'proyek-bnpb/geo/kabupaten/'
R = 'D:/Project/Work/BNPB/poskokarhutla/'
S4 = json.load(open('kec4s.json', encoding='utf-8')); P = json.load(open('data/banjir_data_prakiraan72.json', encoding='utf-8'))['kec']; PUS = json.load(open(R + 'public/banjir/data/pusat_kec.json', encoding='utf-8'))
LON0, LON1, LAT0, LAT1 = 90.6, 104.4, -2.5, 6.3
PW = 2500; PH = int(PW * (LAT1 - LAT0) / (LON1 - LON0)); SS = 2
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
arr = np.array(im); jangkar = {}; KEC = []
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
    for ii, (n_, _v) in enumerate(lk):
        if lv[ii] >= 2:
            s_ = idx == ii
            if s_.any(): KEC.append((n_.split('|')[2], int(lv[ii]), float(xs[s_].mean()), float(ys[s_].mean())))
    ber = l >= 2
    if ber.any(): jangkar[k] = (float(xs[ber].mean()), float(ys[ber].mean()))
im = Image.fromarray(arr); d = ImageDraw.Draw(im)
def kotak_bayang(x0, y0, x1, y1, rad, isi='#FFFFFF', tepi_='#C9D1DB'):
    t = 24 * SS; w, h = int(x1 - x0), int(y1 - y0); m = Image.new('L', (w + 2 * t, h + 2 * t), 0); ImageDraw.Draw(m).rounded_rectangle([t, t, t + w, t + h], radius=rad, fill=90); m = m.filter(ImageFilter.GaussianBlur(7 * SS))
    im.paste(Image.new('RGB', m.size, NAVY), (int(x0) - t, int(y0) - t + 4 * SS), m); d.rounded_rectangle([x0, y0, x1, y1], radius=rad, fill=isi, outline=tepi_, width=2 * SS)
IK = 'D:/Project/Work/BNPB/poskokarhutla/data/laporan-bnpb/banjir-bang-ghozi-2026-11-08/kerja-slide3/ik/'
GAYA = {3: ('#F8DDE0', (143, 63, 7), 'awas-putih.png'), 2: ('#FBE7D6', (232, 137, 74), 'banjir-putih.png')}
f = F(30); ph = 44 * SS; D_ = 36 * SS; W_, H_ = PW * SS, PH * SS
L = [dict(n=n, lv=v, ax=ax, ay=ay, x=ax, y=ay, w=d.textlength(n, font=f) + D_ + 30 * SS) for n, v, ax, ay in KEC]
print('label kec', len(L))
lat_y = lambda y: LAT1 - y / H_ * (LAT1 - LAT0)
pantai_b = lambda la: min(95.0 + (5.6 - la) * .70, 97.0 if 2.6 > la > .2 else 99)   # sisi barat
pantai_t = lambda la: 98.3 + (5.2 - la) * .62   # sisi timur
sumbu = lambda a: (a['ax'] - X(pantai_b(lat_y(a['ay'])) + 1.7))
L.sort(key=sumbu); nk = min(len(L), int(len(L) * .72)); kiri, kanan = L[:nk], L[nk:]
def susun(xs, kolom_n, sisi):
    xs.sort(key=lambda a: a['ay']); n = len(xs)
    for i_, a in enumerate(xs):
        a['k'] = i_ % kolom_n
    for k_ in range(kolom_n):
        ys_ = [a for a in xs if a['k'] == k_]; m_ = len(ys_); y0_ = ph / 2 + 8; y1_ = H_ - ph / 2 - 8; lo = max(y0_, min(a['ay'] for a in ys_) - ph * 2); hi = min(y1_, max(a['ay'] for a in ys_) + ph * 2)
        lk_ = (hi - lo) / max(m_ - 1, 1)
        if lk_ < ph + 3 * SS: lk_ = ph + 3 * SS; lo = max(y0_, (lo + hi) / 2 - lk_ * (m_ - 1) / 2)
        for q_, a in enumerate(ys_):
            a['y'] = lo + q_ * lk_; la = lat_y(a['y'])
            if sisi == 'l':
                ka = X(pantai_b(la)) - 16 * SS - k_ * 290 * SS; a['x'] = max(a['w'] / 2 + 6, ka - a['w'] / 2)
            else:
                a['x'] = min(W_ - a['w'] / 2 - 6, X(pantai_t(la)) + 16 * SS + a['w'] / 2)
susun(kiri, 2, 'l'); susun(kanan, 1, 'r')
print('kiri', len(kiri), 'kanan', len(kanan))
for a in L:
    ujung = a['x'] + a['w'] / 2 if a in kiri else a['x'] - a['w'] / 2
    d.line([(ujung, a['y']), (a['ax'], a['ay'])], fill=NAVY, width=1 * SS)
    d.ellipse([a['ax'] - 4 * SS, a['ay'] - 4 * SS, a['ax'] + 4 * SS, a['ay'] + 4 * SS], fill=NAVY)
for a in L:
    isi, wr, ik = GAYA[a['lv']]; x0, y0_, x1, y1 = a['x'] - a['w'] / 2, a['y'] - ph / 2, a['x'] + a['w'] / 2, a['y'] + ph / 2
    kotak_bayang(x0, y0_, x1, y1, ph / 2, isi, isi)
    cx0 = x0 + 7 * SS; cy0 = a['y'] - D_ / 2; d.ellipse([cx0, cy0, cx0 + D_, cy0 + D_], fill=wr)
    g_ = Image.open(IK + ik).convert('RGBA').resize((int(D_ * .64), int(D_ * .64)), Image.LANCZOS); im.paste(g_, (int(cx0 + D_ * .18), int(cy0 + D_ * .18)), g_)
    d.text((cx0 + D_ + 8 * SS, a['y']), a['n'], font=f, fill=NAVY, anchor='lm')
km = 111.32; px = 100 / km / (LON1 - LON0) * PW * SS; H = PH * SS; x0, y0 = X(95.0), H - 44 * SS
d.line([(x0, y0), (x0 + px, y0)], fill=NAVY, width=4 * SS); d.text((x0 + px / 2, y0 - 26 * SS), '100 km', font=F(26, False), fill=NAVY, anchor='mm')
im = im.resize((PW, PH), Image.LANCZOS); png = PJ + 'petanya/probabilitas-081126.png'; im.save(png, optimize=True)
mas = PJ + 'petanya/kec4s-081126.json'; shutil.copy('kec4s.json', mas); sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
json.dump({'unsur_peta': {'sumber_batas': 'Batas kab/kota BIG', 'sistem_referensi': 'WGS 84', 'proyeksi': 'ekuirektangular', 'catatan': 'Batas kecamatan perkiraan dari titik pusat'}, 'masukan': {'kec4s-081126.json': sha(mas)}}, open(PJ + 'petanya/probabilitas-081126.json', 'w', encoding='utf-8'), ensure_ascii=False)
print(im.size)
