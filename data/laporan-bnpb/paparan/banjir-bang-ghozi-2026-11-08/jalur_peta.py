# peta alur Sumatera tingkat kab/kota
LON0, LON1, LAT0, LAT1 = 94.2, 106.6, -6.3, 6.5
SS = 2; PW = 1600; PH = int(PW * (LAT1 - LAT0) / (LON1 - LON0))
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
            if len(pts) > 2: d.polygon(pts, fill=WA.get(sasaran.get(k), '#E6EAF0') if kp in ('11', '12', '13') else '#E6EAF0', outline='#FFFFFF', width=1)
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
SIB, MDN, LHK, BDA, TPK, MLB = (1.74, 99.0), (3.58, 98.67), (5.18, 97.14), (5.5, 95.35), (3.27, 97.2), (4.14, 96.13)
TRUNK = [GD, (0.3, 99.9), SIB, MDN, LHK, BDA, TPK, MLB]
garis([GD, (0.3, 99.9), SIB, MDN, LHK, BDA], DARAT, None, 5 * SS); garis([SIB, TPK, MLB], DARAT, None, 5 * SS)
for r in SUM:
    if r['darat'] != '': garis([min(TRUNK, key=lambda c: km(c, pusat[r['k']])), pusat[r['k']]], DARAT, None, 2 * SS)
PLA = (22 * SS, 14 * SS); PUD = (5 * SS, 11 * SS); kel_s = {r['pel'] for r in SUM} | {r['bdr'] for r in SUM}
semua_pel = {x[0]: x for v in ('U', 'SML') for x in PEL[v]}; semua_bdr = {x[0]: x for v in ('U', 'SML') for x in BDR[v]}
for n, x in semua_pel.items():
    if n in kel_s: garis([TB] + x[2] + [x[1]], LAUT, PLA, 4 * SS)
for n, x in semua_bdr.items():
    if n in kel_s: garis(lengkung(BIM, x[1], -.14), UDARA, PUD, 4 * SS, geo=False)
def titik(c, w):
    x, y = pt(c); r = 9 * SS; d.ellipse([x - r, y - r, x + r, y + r], fill=w, outline='#FFFFFF', width=3 * SS)
for n, x in semua_pel.items():
    if n in kel_s: titik(x[1], LAUT)
for n, x in semua_bdr.items():
    if n in kel_s: titik(x[1], UDARA)
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
    d.line([a, tuple(p)], fill=NAVY, width=2 * SS); d.ellipse([p[0] - R_, p[1] - R_, p[0] + R_, p[1] + R_], fill=NAVY, outline='#FFFFFF', width=2 * SS); d.text((p[0], p[1]), str(i), font=f, fill='#FFFFFF', anchor='mm')
def label(x, y, t, isi='#FFFFFF', teks=NAVY, uk=34):
    f = F(uk); w = d.textlength(t, font=f) + 40 * SS; h = (uk + 22) * SS; tepi = 24 * SS
    m = Image.new('L', (int(w) + 2 * tepi, int(h) + 2 * tepi), 0); ImageDraw.Draw(m).rounded_rectangle([tepi, tepi, tepi + w, tepi + h], radius=h / 2, fill=90); m = m.filter(ImageFilter.GaussianBlur(7 * SS))
    im.paste(Image.new('RGB', m.size, '#24384F'), (int(x - w / 2) - tepi, int(y - h / 2) - tepi + 4 * SS), m)
    d.rounded_rectangle([x - w / 2, y - h / 2, x + w / 2, y + h / 2], radius=h / 2, fill=isi, outline='#C9D1DB' if isi == '#FFFFFF' else isi, width=2 * SS); d.text((x, y), t, font=f, fill=teks, anchor='mm')
x, y = pt(GD); r = 15 * SS; d.ellipse([x - r, y - r, x + r, y + r], fill='#C8102E', outline='#FFFFFF', width=4 * SS)
garis([(-3.5, 98.2), GD], NAVY, None, 2 * SS); label(X(97.6), Y(-3.7), 'Gudang UPT Padang', NAVY, '#FFFFFF', 36)
im = im.resize((PW, PH), Image.LANCZOS); png = PJ + 'petanya/jalur-081126.png'; im.save(png, optimize=True)
mas = PJ + 'petanya/jalur-081126-masukan.json'; shutil.copy('jalur.json', mas); sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
json.dump({'unsur_peta': {'sumber_batas': 'Batas kab/kota BIG', 'sistem_referensi': 'WGS 84', 'proyeksi': 'ekuirektangular', 'catatan': 'Batas wilayah bukan rujukan resmi'}, 'masukan': {'jalur-081126-masukan.json': sha(mas)}}, open(PJ + 'petanya/jalur-081126.json', 'w', encoding='utf-8'), ensure_ascii=False)
print(im.size, len(SUM))
