import os; HOME = os.path.expanduser('~').replace(chr(92), '/') + '/'   # folder rumah, bukan jalur mutlak satu mesin
"""Peta slide 2 gaya referensi pemilik: tiga status (Terdampak, Awas, Siaga) per kab/kota, pill berikon di dua sisi, sisipan se-Indonesia."""
import json, glob, os, math, hashlib, shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter
SK = HOME + '.claude/skills/ppt-konsultan/bnpb/assets/'; PJ = SK + 'proyek-banjir0811/'; G = SK + 'proyek-bnpb/geo/kabupaten/'
IK = 'D:/Project/Work/BNPB/poskokarhutla/data/laporan-bnpb/paparan/banjir-bang-ghozi-2026-11-08/kerja-slide3/ik/'
S4 = json.load(open('kec4s.json', encoding='utf-8'))['rows']; LAP = json.load(open('lap.json', encoding='utf-8'))
ST = {}
for r in S4: ST[r['k']] = 'Awas' if r['a'] else 'Siaga'
for r in LAP:
    if not r['surut']: ST[r['prov'] + '|' + r['kab']] = 'Terdampak'
GAYA = {'Terdampak': ('#DCEBF8', '#1B5A93', 'rumah-putih.png'), 'Awas': ('#F8DDE0', '#8F3F07', 'awas-putih.png'), 'Siaga': ('#FBE7D6', '#E8894A', 'banjir-putih.png')}
TKS = {'Terdampak': '#1B5A93', 'Awas': '#8F3F07', 'Siaga': '#B84E08'}
LON0, LON1, LAT0, LAT1 = 91.2, 105.2, -2.6, 6.3
SS = 2; PW = 2500; PH = int(PW * (LAT1 - LAT0) / (LON1 - LON0)); W_, H_ = PW * SS, PH * SS
X = lambda o: (o - LON0) / (LON1 - LON0) * W_; Y = lambda a: (LAT1 - a) / (LAT1 - LAT0) * H_
NAVY = '#24384F'; rings = lambda g: [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
F = lambda s, b=True: ImageFont.truetype(SK + 'fonts/Roboto-' + ('Bold' if b else 'Medium') + '.ttf', s * SS)
geo = {}
for f_ in sorted(glob.glob(G + '*.json')):
    kp = os.path.basename(f_)[:2]
    for ft in json.load(open(f_, encoding='utf-8'))['features']: geo[kp + '|' + ft['properties']['kab']] = ft['geometry']
im = Image.new('RGB', (W_, H_), '#FFFFFF'); d = ImageDraw.Draw(im); pus = {}
for k, g in geo.items():
    bs = max((q[0] for q in rings(g)), key=len); pus[k] = (sum(c[1] for c in bs) / len(bs), sum(c[0] for c in bs) / len(bs))
    for q in rings(g):
        pts = [(X(c[0]), Y(c[1])) for c in q[0]]
        if len(pts) > 2: d.polygon(pts, fill=GAYA[ST[k]][1] if k in ST else '#E6EAF0', outline='#FFFFFF', width=2)
def bayang(x0, y0, x1, y1, rad, isi, tepi):
    t = 24 * SS; w, h = int(x1 - x0), int(y1 - y0); m = Image.new('L', (w + 2 * t, h + 2 * t), 0); ImageDraw.Draw(m).rounded_rectangle([t, t, t + w, t + h], radius=rad, fill=90); m = m.filter(ImageFilter.GaussianBlur(7 * SS))
    im.paste(Image.new('RGB', m.size, NAVY), (int(x0) - t, int(y0) - t + 4 * SS), m); d.rounded_rectangle([x0, y0, x1, y1], radius=rad, fill=isi, outline=tepi, width=2 * SS)
dalam = [k for k in ST if k in pus and k[:2] in ('11', '12', '13', '14') and LON0 < pus[k][1] < LON1 and LAT0 < pus[k][0] < LAT1]
A = [dict(k=k, n=k.split('|')[1], st=ST[k], ax=X(pus[k][1]), ay=Y(pus[k][0])) for k in dalam]
sumbu = lambda a: a['ax'] - X(95.0 + (5.6 - pus[a['k']][0]) * .70 + 1.9)
A.sort(key=sumbu); nk = (len(A) + 1) // 2 + 1; kiri, kanan = A[:nk], A[nk:]
fn, fs = F(37), F(28); ph = 66 * SS; D_ = 48 * SS
for a in A: a['wn'] = d.textlength(a['n'], font=fn); a['ws'] = d.textlength(a['st'], font=fs); a['w'] = 10 * SS + D_ + 12 * SS + a['wn'] + 12 * SS + a['ws'] + 22 * SS
def susun(xs, sisi, y1):
    xs.sort(key=lambda a: a['ay']); y0 = 48 * SS; lk = (y1 - y0) / max(len(xs) - 1, 1)
    for i, a in enumerate(xs):
        a['y'] = y0 + i * lk
        if sisi == 'l': a['x1'] = X(95.2) - 20 * SS + max(0, (i - 2)) * 26 * SS; a['x0'] = a['x1'] - a['w']
        else: a['x0'] = X(101.0) + 20 * SS + max(0, i - 3) * 16 * SS; a['x1'] = a['x0'] + a['w']
susun(kiri, 'l', H_ - 52 * SS); susun(kanan, 'r', H_ * .9)
for a in A:
    ujung = a['x1'] if a in kiri else a['x0']
    d.line([(ujung, a['y']), (a['ax'], a['ay'])], fill=NAVY, width=2 * SS)
for a in A:
    d.ellipse([a['ax'] - 8 * SS, a['ay'] - 8 * SS, a['ax'] + 8 * SS, a['ay'] + 8 * SS], fill='#FFFFFF', outline=NAVY, width=3 * SS)
    isi, wr, ik = GAYA[a['st']]; y0 = a['y'] - ph / 2; bayang(a['x0'], y0, a['x1'], y0 + ph, ph / 2, isi, isi)
    cx = a['x0'] + 10 * SS; cy = a['y'] - D_ / 2; d.ellipse([cx, cy, cx + D_, cy + D_], fill=wr)
    g_ = Image.open(IK + ik).convert('RGBA').resize((int(D_ * .62), int(D_ * .62)), Image.LANCZOS); im.paste(g_, (int(cx + D_ * .19), int(cy + D_ * .19)), g_)
    tx = cx + D_ + 12 * SS; d.text((tx, a['y']), a['n'], font=fn, fill=NAVY, anchor='lm'); d.text((tx + a['wn'] + 12 * SS, a['y'] + 2 * SS), a['st'], font=fs, fill=TKS[a['st']], anchor='lm')
km = 111.32; px = 100 / km / (LON1 - LON0) * W_; x0, y0 = X(97.4), H_ - 44 * SS
d.line([(x0, y0), (x0 + px, y0)], fill=NAVY, width=4 * SS); d.text((x0 + px / 2, y0 - 28 * SS), '100 km', font=F(30, False), fill=NAVY, anchor='mm')
im = im.resize((PW, PH), Image.LANCZOS); png = PJ + 'petanya/probabilitas-081126.png'; im.save(png, optimize=True)
mas = PJ + 'petanya/kec4s-081126.json'; shutil.copy('kec4s.json', mas); sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
json.dump({'unsur_peta': {'sumber_batas': 'Batas kab/kota BIG', 'sistem_referensi': 'WGS 84', 'proyeksi': 'ekuirektangular', 'catatan': 'Batas wilayah bukan rujukan resmi'}, 'masukan': {'kec4s-081126.json': sha(mas)}}, open(PJ + 'petanya/probabilitas-081126.json', 'w', encoding='utf-8'), ensure_ascii=False)
print(im.size, len(A), len(kiri), len(kanan))
