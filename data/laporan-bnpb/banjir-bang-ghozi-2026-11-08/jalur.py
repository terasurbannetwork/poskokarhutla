import os; HOME = os.path.expanduser('~').replace(chr(92), '/') + '/'   # folder rumah, bukan jalur mutlak satu mesin
"""Perkiraan penghantaran logpal dari Gudang UPT Padang ke kab/kota terdampak (slide 1) dan berprobabilitas banjir (slide 2), plus peta alur.
Asumsi: darat = jarak lurus per ruas x 1,35 / 35 km/jam, penyeberangan Bakauheni-Merak +4 jam; laut = 22 km/jam (12 knot) + 8 jam bongkar muat;
udara = 350 km/jam + 3 jam muat; ujung jalur dari pelabuhan/bandara ke pusat kab/kota lewat darat. Koordinat simpul dibulatkan, bukan data resmi."""
import json, math, glob, os, hashlib, shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter
SK = HOME + '.claude/skills/ppt-konsultan/bnpb/assets/'; PJ = SK + 'proyek-banjir0811/'; G = SK + 'proyek-bnpb/geo/kabupaten/'
RP = 'D:/Project/Work/BNPB/poskokarhutla/data/laporan-bnpb/banjir-bang-ghozi-2026-11-08/'
def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1])); h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))
def rute(p): return sum(km(p[i], p[i + 1]) for i in range(len(p) - 1))
GD = (-0.95, 100.42); TB = (-1.0, 100.37); BIM = (-0.79, 100.28)
W1, W2 = (1.7, 98.0), (6.0, 95.0)   # lepas Sibolga, ujung utara Sumatera
S1, S2, S3 = (-3.8, 100.6), (-6.3, 104.3), (-5.75, 106.2)   # selatan Mentawai, barat Selat Sunda, Teluk Jakarta
PEL = {'U': [('Sibolga', (1.74, 98.77), [W1]), ('Meulaboh', (4.13, 96.12), [W1]), ('Malahayati', (5.60, 95.53), [W1, W2]), ('Krueng Geukueh', (5.25, 97.03), [W1, W2]), ('Belawan', (3.79, 98.69), [W1, W2])],
       'SML': [('Sinabang', (2.48, 96.38), [W1])], 'MTW': [('Tuapeijat', (-2.03, 99.60), [])], 'NIAS': [('Gunungsitoli', (1.30, 97.61), [(0.6, 98.2)])],
       '32': [('Tanjung Priok', (-6.10, 106.88), [S1, S2, S3]), ('Cirebon', (-6.72, 108.57), [S1, S2, S3, (-5.8, 108.4)])],
       '35': [('Tanjung Perak', (-7.20, 112.73), [S1, S2, S3, (-5.8, 112.6)])],
       '61': [('Dwikora Pontianak', (-0.02, 109.33), [S1, S2, S3, (-4.4, 108.2), (-0.9, 108.9)])],
       '33': [('Tanjung Emas', (-6.95, 110.42), [S1, S2, S3, (-5.8, 110.4)])], '34': [('Tanjung Emas', (-6.95, 110.42), [S1, S2, S3, (-5.8, 110.4)])], '72': [('Pantoloan', (-0.72, 119.86), [S1, S2, S3, (-5.2, 116.8), (-2.0, 118.6)])],
       '71': [('Bitung', (1.44, 125.20), [S1, S2, S3, (-5.2, 116.8), (-2.0, 118.3), (1.2, 119.8), (1.9, 124.9)])]}
BDR = {'U': [('SIM Banda Aceh', (5.52, 95.42)), ('Kualanamu', (3.64, 98.88)), ('Cut Nyak Dhien', (4.05, 96.25)), ('Teuku Cut Ali', (3.17, 97.29)), ('Rembele', (4.72, 96.85)), ('Malikussaleh', (5.23, 96.95)), ('Aek Godang', (1.40, 99.43)), ('FL Tobing', (1.56, 98.89))],
       'SML': [('Lasikin', (2.41, 96.33))], 'MTW': [('Rokot', (-2.10, 99.70))], 'NIAS': [('Binaka', (1.17, 97.70))], '32': [('Kertajati', (-6.65, 108.17)), ('Wiriadinata', (-7.35, 108.24))], '35': [('Juanda', (-7.38, 112.79)), ('Abdulrachman Saleh', (-7.93, 112.71))],
       '61': [('Supadio', (-0.15, 109.40))], '33': [('Ahmad Yani', (-6.97, 110.37)), ('Adi Soemarmo', (-7.52, 110.76))], '34': [('Yogyakarta Intl', (-7.90, 110.06))], '72': [('Mutiara SIS Al-Jufrie', (-0.92, 119.91))], '71': [('Sam Ratulangi', (1.55, 124.93))]}
V_D, F_D, V_L, T_L, V_U, T_U, FERI = 35, 1.35, 22, 8, 350, 3, 4
BKH, MRK = (-5.87, 105.75), (-5.93, 106.0); LBK, LMP = (-3.30, 102.86), (-5.40, 105.26)
PULAU = {'13|Kepulauan Mentawai': 'MTW', '11|Simeulue': 'SML', '12|Nias': 'NIAS', '12|Nias Selatan': 'NIAS', '12|Nias Utara': 'NIAS', '12|Nias Barat': 'NIAS', '12|Kota Gunungsitoli': 'NIAS'}; NP = {'11': 'Aceh', '12': 'Sumatera Utara', '13': 'Sumatera Barat', '32': 'Jawa Barat', '35': 'Jawa Timur', '61': 'Kalimantan Barat', '71': 'Sulawesi Utara', '14': 'Riau', '33': 'Jawa Tengah', '34': 'DI Yogyakarta', '72': 'Sulawesi Tengah'}
dr = lambda j: j * F_D / V_D
rings = lambda g: [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
pusat = {}
for f_ in sorted(glob.glob(G + '*.json')):
    kp = os.path.basename(f_)[:2]
    for ft in json.load(open(f_, encoding='utf-8'))['features']:
        k = kp + '|' + ft['properties']['kab']; r = max((q[0] for q in rings(ft['geometry'])), key=len); pusat[k] = (sum(c[1] for c in r) / len(r), sum(c[0] for c in r) / len(r))
LAP = {r['prov'] + '|' + r['kab']: r for r in json.load(open('lap.json', encoding='utf-8'))}
K4 = json.load(open('kec4.json', encoding='utf-8'))['rows']
sasaran = {k: ('Surut' if r['surut'] else 'Terdampak') for k, r in LAP.items()}
for r in json.load(open('kec4s.json', encoding='utf-8'))['rows']: sasaran.setdefault(r['k'], 'Berpeluang')
KNO, BLW, SIB_P = (3.64, 98.88), (3.79, 98.69), (1.74, 98.77); UT = (5.9, 97.0)
PEL_K = {'U': [('Belawan', BLW, []), ('Krueng Geukueh', (5.25, 97.03), [UT]), ('Malahayati', (5.60, 95.53), [UT, W2]), ('Meulaboh', (4.13, 96.12), [UT, W2]), ('Sibolga', SIB_P, [UT, W2, W1])], 'SML': [('Sinabang', (2.48, 96.38), [])], 'NIAS': PEL['NIAS']}
VIA = {'NIAS': SIB_P, 'SML': (4.13, 96.12)}
BTS_DARAT = 16   # jam; kab/kota yang tercapai darat lebih lama dari ini dialihkan ke udara
rows = []; pakai_pel = {}; pakai_bdr = {}
for k, st in sorted(sasaran.items()):
    kp = k[:2]; p = pusat[k]; kel = PULAU[k] if k in PULAU else ('U' if kp in ('11', '12', '13', '14') else kp)
    kno = kp in ('11', '12'); A_D = KNO if kno else GD
    jalan = None
    if kp in ('11', '12', '13', '14') and k not in PULAU: jalan = rute([A_D, p])
    elif kp in ('32', '33', '34', '35'): jalan = rute([GD, LBK, LMP, BKH]) + rute([MRK, p])
    jam_d = None if jalan is None else dr(jalan) + (FERI if kp in ('32', '33', '34', '35') else 0)
    dekat = (kp in ('13', '14') and k not in PULAU) or (jalan is not None and jalan < 100)   # dekat gudang: cukup darat
    if dekat: lt = ud = None
    else:
        if kno and kel in VIA: t_l = lambda x, v_=VIA[kel]: dr(km(KNO, v_)) + km(v_, x[1]) / V_L + T_L + dr(km(x[1], p))   # darat ke pelabuhan penyeberangan, lalu kapal
        elif kno: t_l = lambda x: rute([BLW] + x[2] + [x[1]]) / V_L + T_L + dr(km(x[1], p))
        else: t_l = lambda x: rute([TB] + x[2] + [x[1]]) / V_L + T_L + dr(km(x[1], p))
        t_u = lambda x: km(KNO if kno else BIM, x[1]) / V_U + T_U + dr(km(x[1], p))
        lt = min((PEL_K if kno else PEL)[kel], key=t_l); ud = min([b for b in BDR[kel] if not (kno and b[0] == 'Kualanamu')], key=t_u); pakai_pel[lt[0]] = lt; pakai_bdr[ud[0]] = ud
    rows.append(dict(k=k, kp=kp, prov=NP[kp], kab=k.split('|')[1], st=st, km=round(jalan * F_D) if jalan is not None else '', darat=round(jam_d) if jam_d is not None else '',
                     pel=lt[0] if lt else '', laut=round(t_l(lt)) if lt else '', bdr=ud[0] if ud else '', udara=round(t_u(ud)) if ud else ''))
for r in rows:
    r['asal'] = 'Poslog Kualanamu' if r['kp'] in ('11', '12') else 'Gudang UPT Padang'
    if r['k'] in PULAU: r.update(moda='Laut', jam=r['laut'], turun='Pelabuhan ' + r['pel'])
    elif r['darat'] != '' and r['darat'] <= BTS_DARAT or r['udara'] == '': r.update(moda='Darat', jam=r['darat'], turun='Langsung ke lokasi')
    else: r.update(moda='Udara', jam=r['udara'], turun='Bandara ' + r['bdr'])
def rentang(xs):
    xs = [x for x in xs if x != '']
    if xs and min(xs) >= 100: return f'sekitar {int(round(max(xs), -1))} jam'
    return '' if not xs else (f'{min(xs)} jam' if min(xs) == max(xs) else f'{min(xs)}-{max(xs)} jam')
prov = []
for kp, n in NP.items():
    xs = [r for r in rows if r['kp'] == kp]
    prov.append(dict(prov=n, darat=rentang([r['darat'] for r in xs]), laut=rentang([r['laut'] for r in xs]), udara=rentang([r['udara'] for r in xs])))
POT = {r['k'] for r in json.load(open('kec4s.json', encoding='utf-8'))['rows']}
SUM = [r for r in rows if r['kp'] in ('11', '12', '13', '14') and r['k'] in POT]; jauh = [r for r in SUM if r['udara'] != '']; dd = [r['darat'] for r in SUM if r['darat'] != '']
J = dict(kab=rows, sum=SUM, prov=prov, n=len(prov), jam1=max(r['jam'] for r in SUM), nd=sum(r['moda'] == 'Darat' for r in SUM), nl=sum(r['moda'] == 'Laut' for r in SUM), nu=sum(r['moda'] == 'Udara' for r in SUM), u0=min(r['udara'] for r in jauh), u1=max(r['udara'] for r in jauh), d1=max(dd))
json.dump(J, open('jalur.json', 'w', encoding='utf-8'), ensure_ascii=False); shutil.copy('jalur.json', RP + 'jalur.json')
print(prov, J['u0'], J['u1'], J['d1'], len(rows), list(pakai_pel), list(pakai_bdr))
# peta alur Sumatera tingkat kab/kota
LON0, LON1, LAT0, LAT1 = 92.6, 105.6, -3.3, 6.1
SS = 2; PW = 2100; PH = int(PW * (LAT1 - LAT0) / (LON1 - LON0))
X = lambda o: (o - LON0) / (LON1 - LON0) * PW * SS; Y = lambda a: (LAT1 - a) / (LAT1 - LAT0) * PH * SS
NAVY = '#24384F'; DARAT, LAUT, UDARA = '#E8894A', '#68A8E0', '#C8102E'; WA = {'Terdampak': '#E9A0A0', 'Surut': '#BBD6EF', 'Berpeluang': '#F7D7BF'}
im = Image.new('RGB', (PW * SS, PH * SS), '#FFFFFF'); d = ImageDraw.Draw(im)
F = lambda s, b=True: ImageFont.truetype(SK + 'fonts/Roboto-' + ('Bold' if b else 'Medium') + '.ttf', s * SS)
for f_ in sorted(glob.glob(G + '*.json')):
    kp = os.path.basename(f_)[:2]
    for ft in json.load(open(f_, encoding='utf-8'))['features']:
        k = kp + '|' + ft['properties']['kab']
        for q in rings(ft['geometry']):
            pts = [(X(c[0]), Y(c[1])) for c in q[0]]
            if len(pts) > 2: d.polygon(pts, fill=WA.get(sasaran.get(k), '#E6EAF0') if kp in ('11', '12', '13', '14') else '#E6EAF0', outline='#FFFFFF', width=1)
pt = lambda c: (X(c[1]), Y(c[0])); LB = 3 * SS
def garis(ps, w, pola=None, lebar=LB, geo=True):
    ps = [pt(c) for c in ps] if geo else ps; sisa = 0
    for i in range(len(ps) - 1):
        (x0, y0), (x1, y1) = ps[i], ps[i + 1]; L = math.hypot(x1 - x0, y1 - y0)
        if not L: continue
        if not pola: d.line([ps[i], ps[i + 1]], fill=w, width=lebar); continue
        s_ = sisa
        while s_ < L:
            e_ = min(L, s_ + pola[0]); a, b = s_ / L, e_ / L
            d.line([(x0 + (x1 - x0) * a, y0 + (y1 - y0) * a), (x0 + (x1 - x0) * b, y0 + (y1 - y0) * b)], fill=w, width=lebar); s_ = e_ + pola[1]
        sisa = max(0, s_ - L)
def lengkung(a, b, naik):
    ax, ay, bx, by = *pt(a), *pt(b); mx, my = (ax + bx) / 2 - (by - ay) * naik, (ay + by) / 2 + (bx - ax) * naik
    return [((1 - t) ** 2 * ax + 2 * (1 - t) * t * mx + t ** 2 * bx, (1 - t) ** 2 * ay + 2 * (1 - t) * t * my + t ** 2 * by) for t in [i / 60 for i in range(61)]]
PLA = (22 * SS, 14 * SS); PUD = (5 * SS, 11 * SS); POS = {x[0]: x[1] for v in PEL.values() for x in v}
for r in SUM:
    o = KNO if r['kp'] in ('11', '12') else GD; p_ = pusat[r['k']]
    if r['moda'] == 'Darat': garis([o, p_], DARAT, None, 3 * SS)
    elif r['moda'] == 'Laut':
        v_ = VIA.get(PULAU.get(r['k'])) if r['kp'] in ('11', '12') else None
        if v_: garis([o, v_], DARAT, None, 3 * SS); garis([v_, POS[r['pel']], p_], LAUT, PLA, 4 * SS)
        else: garis([TB, POS[r['pel']], p_], LAUT, PLA, 4 * SS)
    else: garis(lengkung(o, p_, .12), UDARA, PUD, 4 * SS, geo=False)
# nomor kab/kota = nomor baris tabel; didorong supaya tidak bertumpuk
Pts = [list(pt(pusat[r['k']])) for r in SUM]; A0 = [tuple(p) for p in Pts]; R_ = 21 * SS
for _ in range(120):
    for i in range(len(Pts)):
        for j in range(i + 1, len(Pts)):
            dx, dy = Pts[j][0] - Pts[i][0], Pts[j][1] - Pts[i][1]; D = math.hypot(dx, dy) or 1
            if D < 2 * R_ + 3 * SS:
                g_ = (2 * R_ + 3 * SS - D) / 2; ux, uy = dx / D, dy / D
                Pts[i][0] -= ux * g_; Pts[i][1] -= uy * g_; Pts[j][0] += ux * g_; Pts[j][1] += uy * g_
f = F(23)
for i, (p, a) in enumerate(zip(Pts, A0), 1):
    d.line([a, tuple(p)], fill=NAVY, width=2 * SS); d.ellipse([p[0] - R_, p[1] - R_, p[0] + R_, p[1] + R_], fill=NAVY, outline='#FFFFFF', width=2 * SS); (os.environ.get('TANPA_NOMOR') or d.text((p[0], p[1]), str(i), font=f, fill='#FFFFFF', anchor='mm'))
def label(x, y, t, isi='#FFFFFF', teks=NAVY, uk=34):
    f = F(uk); w = d.textlength(t, font=f) + 40 * SS; h = (uk + 22) * SS; tepi = 24 * SS
    m = Image.new('L', (int(w) + 2 * tepi, int(h) + 2 * tepi), 0); ImageDraw.Draw(m).rounded_rectangle([tepi, tepi, tepi + w, tepi + h], radius=h / 2, fill=90); m = m.filter(ImageFilter.GaussianBlur(7 * SS))
    im.paste(Image.new('RGB', m.size, '#24384F'), (int(x - w / 2) - tepi, int(y - h / 2) - tepi + 4 * SS), m)
    d.rounded_rectangle([x - w / 2, y - h / 2, x + w / 2, y + h / 2], radius=h / 2, fill=isi, outline='#C9D1DB' if isi == '#FFFFFF' else isi, width=2 * SS); d.text((x, y), t, font=f, fill=teks, anchor='mm')
x, y = pt(GD); r = 15 * SS; d.ellipse([x - r, y - r, x + r, y + r], fill='#C8102E', outline='#FFFFFF', width=4 * SS)
garis([(-1.7, 98.6), GD], NAVY, None, 2 * SS); label(X(97.9), Y(-1.9), 'Gudang UPT Padang', NAVY, '#FFFFFF', 60 if os.environ.get('TANPA_NOMOR') else 36)
x, y = pt(KNO); d.ellipse([x - r, y - r, x + r, y + r], fill='#C8102E', outline='#FFFFFF', width=4 * SS); garis([(4.9, 100.0), KNO], NAVY, None, 2 * SS); label(X(100.2), Y(5.0), 'Poslog Kualanamu', NAVY, '#FFFFFF', 60 if os.environ.get('TANPA_NOMOR') else 36)
im = im.resize((PW, PH), Image.LANCZOS); png = RP + 'kerja-slide3/ik/peta-padat2.png' if os.environ.get('TANPA_NOMOR') else PJ + 'petanya/jalur-081126.png'; im.save(png, optimize=True)
mas = PJ + 'petanya/jalur-081126-masukan.json'; shutil.copy('jalur.json', mas); sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
json.dump({'unsur_peta': {'sumber_batas': 'Batas kab/kota BIG', 'sistem_referensi': 'WGS 84', 'proyeksi': 'ekuirektangular', 'catatan': 'Batas wilayah bukan rujukan resmi'}, 'masukan': {'jalur-081126-masukan.json': sha(mas)}}, open(PJ + 'petanya/jalur-081126.json', 'w', encoding='utf-8'), ensure_ascii=False)
print(im.size, len(SUM))
