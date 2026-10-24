"""Paparan Karhutla Provinsi Jambi 241026 (per 24 Okt, cut-off 24 Okt 2026 24.00 WIB, hari penuh): templat = deck pemilik "Paparan Karhutla Jawa
Timur - Malang - Arjuno 231026.pptx" (ref/j.pptx), isi ditulis ulang native di XML; slide 1-3 mengikuti paparan Lampung 241026, slide 4 = slide
banjir peralihan musim templat Jatim. Angka dari angka.json (angka.py), peta dari peta.py + render.mjs, ikon pil dari ikon.mjs (ik/).
Semua titik, luas, dan belum padam = data kita (website/satelit), bukan angka lapangan. Fakta lapangan: WA Laporan Penanganan Karhutla
24 Okt (data operasi 23 Okt), WA BMKG 24 Okt 19.00, Laporan Harian Dit. Koordalops 24 Okt. Pakai: python3 buat.py ref/j.pptx keluar.pptx"""
import json, math, re, sys, zipfile
from pp import Slide, inst, geom, teks, isi, f0, pct, warna_batang, GEO, tx, bentuk, gambar

REF, OUT = sys.argv[1], sys.argv[2]
A = json.load(open('angka.json'))
P, MJ, KW, HARI, BJ = A['prov'], A['kab']['Muaro Jambi'], A['kaw'], A['HARI'], A['banjir']
KK = A['kaw_kec']; KUM, SADU, BERBAK = KK['Muaro Jambi|Kumpeh'], KK['Tanjung Jabung Timur|Sadu'], KK['Tanjung Jabung Timur|Berbak']
zi = zipfile.ZipFile(REF); F = {n: zi.read(n) for n in zi.namelist()}
S = {i: Slide(F[f'ppt/slides/slide{i}.xml'].decode()) for i in (1, 2, 3, 4)}
RELS = {i: F[f'ppt/slides/_rels/slide{i}.xml.rels'].decode() for i in (1, 2, 3, 4)}
CUT = '24 Okt 2026, 24.00 WIB'
KAKI = '*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS).'
PM = '337,8'   # PM2.5 Muaro Jambi, BMKG 24 Okt 19.00 WIB (berbahaya)


def rel(i, target):
    """rId gambar di ppt/media; ikon lpg-ik-* disalin dari ik/ saat pertama dipakai."""
    m = re.search(rf'Id="(\w+)" Type="[^"]*/image" Target="../media/{re.escape(target)}"', RELS[i])
    if m: return m.group(1)
    if target.startswith('lpg-ik-') and f'ppt/media/{target}' not in F: F[f'ppt/media/{target}'] = open('ik/' + target, 'rb').read()
    assert f'ppt/media/{target}' in F, target
    rid = f'rIdL{len(re.findall("rIdL", RELS[i])) + 1}'
    RELS[i] = RELS[i].replace('</Relationships>', f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/{target}"/></Relationships>')
    return rid


ik = lambda i, n, w: rel(i, f'lpg-ik-{n}-{w}.png')
GAYA = {'merah': ('F8DDE0', 'C8102E', 'merah'), 'navy': ('E6EAF0', '051C2C', 'navy'), 'oranye': ('FBE7D6', 'D9600B', 'oranye'), 'abu': ('E6EAF0', '051C2C', 'navy'),
        'biru': ('DCEBF8', '2F86D1', 'biru')}
STATUS = {'belum padam': ('merah', 'api'), 'berjalan': ('oranye', 'putar'), 'pantau': ('navy', 'mata'), 'kumulatif': ('navy', 'lapis'), 'selesai': ('navy', 'centang')}


def pil(i, x, y, t, gaya, ikon, h=137160, sz=600, kar=None, w=None):
    """Pil berikon: kotak membulat penuh, pad kiri 5 pt, ikon 60% tinggi, jeda 3 pt, teks tebal, pad kanan 6 pt. -> (xml, lebar)."""
    f, c, wi = GAYA[gaya]; s_ik = round(h * 0.6); kar = kar or round(sz * 76)
    w = w or 63500 + s_ik + 38100 + kar * len(t) + 76200
    o = bentuk(x, y, w, h, f, 'roundRect', {'adj': 50000}) + gambar(x + 63500, y + (h - s_ik) / 2, s_ik, s_ik, ik(i, ikon, wi))
    o += tx(x + 63500 + s_ik + 38100, y, w - 63500 - s_ik - 38100 - 38100, h, [(t, sz, True, c)])
    return o, w


def deret(i, x, y, chips, xmaks, h=137160, gap=45720, lipat=False):
    o, x0 = '', x
    for t, gy, ikon in chips:
        p, w = pil(i, x, y, t, gy, ikon, h)
        if lipat and x + w > xmaks and x > x0:
            x, y = x0, y + h + 36576; p, w = pil(i, x, y, t, gy, ikon, h)
        o += p; x += w + gap
        assert x - gap <= xmaks, (chips, x, xmaks)
    return o


def status_pil(i, xkanan, y, t):
    gy, ikon = STATUS[t]; w = pil(i, 0, 0, t, gy, ikon)[1]
    return pil(i, xkanan - w, y, t, gy, ikon)[0]


def baris(i, x0, y0, xkanan, judul, chips, status, bulat, ikon_putih):
    """Baris panel status: bulatan berikon, judul, pil status rata kanan, deret pil berikon di bawah judul."""
    o = bentuk(x0 - 265176, y0 + 18288, 201168, 201168, bulat, 'ellipse') + gambar(x0 - 224028, y0 + 59436, 118872, 118872, ik(i, ikon_putih, 'putih'))
    o += tx(x0, y0, xkanan - x0 - 900000, 146304, [(judul, 760, True, '1A1A1A')])
    o += status_pil(i, xkanan, y0 + 4572, status)
    return o + deret(i, x0, y0 + 160020, chips, xkanan)


def ganti_ikon(s, i, x, y, nama):
    s.ubah(Slide.di(x, y), lambda b: re.sub(r'r:embed="\w+"', f'r:embed="{rel(i, nama)}"', b), 1)


def grafik(i, x0, x1, base, maxh, vals, hari, lab_y, pct_y, bw_frac=0.62, sz_v=760, sz_d=650, sz_p=600, pct_on=True, lab_akhir=True):
    """Grafik batang harian (bab "Grafik batang harian"): batang pertama DCE1E7, hari lama tint, tiga terakhir pekat, naik D9600B, turun 2F86D1.
    Hari terakhir di sini hari penuh (cut-off 24.00), jadi digambar pekat seperti hari lain, tanpa garis putus. Nilai di atas, tanggal di bawah."""
    n = len(vals); slot = (x1 - x0) / n; bw = slot * bw_frac; m = max(vals) or 1; o = ''
    o += f'<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="{8000 + i * 100 + n}" name="L"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="{int(x0)}" y="{int(base)}"/><a:ext cx="{int(x1 - x0)}" cy="0"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="9525"><a:solidFill><a:srgbClr val="BFC5CC"/></a:solidFill></a:ln></p:spPr></p:cxnSp>'
    for k, v in enumerate(vals):
        cx = x0 + slot * (k + .5); h = max(18288, v / m * maxh); top = base - h
        o += bentuk(cx - bw / 2, top, bw, h, warna_batang(k, v, vals[k - 1] if k else v), 'round2SameRect', {'adj1': 22000, 'adj2': 0})
        o += tx(cx - slot / 2, top - 30000 - sz_v * 160, slot, sz_v * 150, [(f0(v), sz_v, True, '051C2C')], al='ctr', an='b')
        d = hari[k][8:].lstrip('0')
        o += tx(cx - slot / 2, lab_y, slot, sz_d * 140, [(f'{d} Okt' if k == n - 1 and lab_akhir else d, sz_d, False, '6B7280')], al='ctr', an='t')
        if k and pct_on:
            t, cc = pct(vals[k - 1], v); o += tx(cx - slot / 2, pct_y, slot, sz_p * 140, [(t, sz_p, True, cc)], al='ctr', an='t')
    return o


# ================================================================== umum
for i in (1, 2, 3):
    S[i].T('23 Okt 2026, 06.25 WIB', CUT)
    S[i].T('*Data GIS satelit NASA (FIRMS: VIIRS dan MODIS), tanpa titik sumber panas industri. Angka 23 Okt sementara: data s.d. 06.25 WIB, baru lintasan satelit malam.', KAKI)
S[4].T('*Data GIS satelit NASA (FIRMS: VIIRS dan MODIS), tanpa titik sumber panas industri.', KAKI)

# ================================================================== SLIDE 1: provinsi
s1 = S[1]
s1.T('Sebaran Titik Panas dan Kebakaran di Jawa Timur per 23 Oktober', ['Sebaran Titik Panas dan Kebakaran di ', 'Jambi', ' per 24 Oktober'])
s1.T('261', f0(P['hot'][-1]), at=(1170432, 1673352)); s1.T('titik panas s.d. 06.25', 'titik panas 24 Okt')
s1.T('482 ha', f'{f0(P["luas"][-1])} ha'); s1.T('luas terbakar s.d. 06.25', 'luas terbakar 24 Okt')
s1.T('223 ha', f'{f0(P["belum"][-1])} ha'); s1.T('belum padam s.d. 06.25', 'belum padam 24 Okt')
s1.T('4.345', f0(sum(P['hot']))); s1.T('titik panas 16–23 Okt', 'titik panas 17–24 Okt')
s1.T('Semeru', PM); s1.warna(10376154, 1673352, '8A4B2A', 'C8102E'); s1.T('gunung api Level III', 'PM2.5 Muaro Jambi, berbahaya')
s1.warna(9973818, 1746504, 'F1E2D6', 'F8DDE0'); ganti_ikon(s1, 1, 10046970, 1819656, 'lpg-ik-sinyal-merah.png')
# peta + label 3 cluster Prioritas
RELS[1] = RELS[1].replace('../media/jt-jatim5.png', '../media/jmb-peta-jambi.png'); F['ppt/media/jmb-peta-jambi.png'] = open('peta-jambi.png', 'rb').read()
s1.hapus(lambda b: (g := geom(b)) and 3100000 <= g[0] < 3400000 and 3150000 <= g[1] < 3600000)
o = ''
PENDEK = {'Tanjung Jabung Timur': 'Tanjabtim', 'Tanjung Jabung Barat': 'Tanjabbar'}
XL = 3420000   # label di pojok kanan bawah peta (laut/Sumsel, kosong)
for k, (y, c) in enumerate(zip((4170000, 4316304, 4462608), A['prio'])):
    t1, t2 = f"{c['kec']}, {PENDEK.get(c['kab'], c['kab'])}", '  Prioritas'; w = 36000 * len(t1 + t2) + 230000
    assert XL + w < 4846320, (t1, w)
    o += bentuk(XL, y, w, 128016, 'FFFFFF', 'roundRect', {'adj': 50000}, ln='C8102E', lw=6350)
    o += bentuk(XL + 27432, y + 18288, 91440, 91440, 'C8102E', 'ellipse') + tx(XL + 27432, y + 18288, 91440, 91440, [(str(k + 1), 500, True, 'FFFFFF')], al='ctr')
    o += tx(XL + 155808, y, w - 180000, 128016, [(t1, 560, True, '1A1A1A'), (t2, 560, True, 'C8102E')])
s1.tambah(o)
L = A['level']
s1.T('208 KOMPLEKS', f"{A['n_komp']} CLUSTER AKTIF"); s1.G(640080, 4974336, cx=1400000)
for (xc, xt), nx in zip(((1645920, 1801368), (2510528, 2665976), (3219136, 3374584), (4083744, 4239192)), (2070000, 2750000, 3350000, 4050000)):
    s1.G(xc, 5001768, nx=nx); s1.G(xt, 4974336, nx=nx + 155448, cx=520000)
s1.T('Prioritas 3', f"Prioritas {L.get('3', 0)}"); s1.T('Siaga 41', f"Siaga {L.get('2', 0)}")
s1.T('Patroli 140', f"Patroli {L.get('1', 0)}"); s1.T('Rutin 24', f"Rutin {L.get('0', 0)}")
# kepala tabel digambar ulang
s1.hapus(lambda b: (gg := geom(b)) and gg[0] >= 6000000 and gg[1] in (2349500, 2395220))
KOL, xk, o = [('TITIK*', '051C2C', 'api'), ('LUAS (HA)*', '3F5F80', 'luas'), ('BELUM PADAM*', 'C8102E', 'awas'), ('CLUSTER AKTIF', 'B5480A', 'pin')], 6060000, ''
UJUNG = []
for nama, warna_, ikn in KOL:
    w = 36576 + 82296 + 27432 + 40000 * len(nama) + 36576
    o += bentuk(xk, 2349500, w, 210312, warna_, 'roundRect', {'adj': 30000}) + gambar(xk + 36576, 2349500 + 64008, 82296, 82296, ik(1, ikn, 'putih'))
    o += tx(xk + 36576 + 82296 + 27432, 2349500, w - 146304, 210312, [(nama, 520, True, 'FFFFFF')])
    UJUNG.append(xk + w); xk += w + 18288
assert xk - 18288 <= 8532080, xk
s1.tambah(o)
YR = [2624328, 2843784, 3063240, 3282696, 3502152, 3721608, 3941064, 4160520, 4379976, 4599432]
for y, k in zip(YR, A['rank'][:10]):
    d = A['kab'][k]
    for x, v in ((5248656, k), (6032080, f0(d['hot'][-1])), (6652080, f0(d['luas'][-1])), (7292080, f0(d['belum'][-1])), (8092080, f0(d['komp']))):
        lama = [teks(b) for b in s1.cari(Slide.di(x, y, True))][0]; s1.T(lama, v, at=(x, y))
    s1.ubah(Slide.di(8092080, y, True), lambda b: b.replace('val="C8102E"', 'val="1A1A1A"'))
    s1.ubah(Slide.di(5248656, y, True), lambda b: b.replace('wrap="square"', 'wrap="none"'))
fokus = YR[A['rank'].index('Muaro Jambi')]
sorot = s1.cari(lambda b: 'val="FDF1E8"' in b)[0]; s1.hapus(lambda b: 'val="FDF1E8"' in b)
garis = [b for b in s1.blok() if (g := geom(b)) and abs(g[1] - fokus) < 30000 and g[0] < 5300000][0]
s1.s = s1.s.replace(garis, re.sub(r'y="\d+"', f'y="{fokus}"', sorot, count=1) + garis, 1)
s1.T('Jawa Timur', 'Jambi', at=(5074920, 4837176))
for x, v in ((6032080, P['hot'][-1]), (6652080, P['luas'][-1]), (7292080, P['belum'][-1]), (8092080, A['n_komp'])):
    lama = [teks(b) for b in s1.cari(Slide.di(x, 4837176, True))][0]; s1.T(lama, f0(v), at=(x, 4837176))
s1.tambah(tx(4983480, 5130000, 3548600, 100000, [('*24 Okt 2026, hari penuh s.d. 24.00 WIB', 650, False, '6B7280')]))
for yy in YR + [4837176]:
    for x, ujung in zip((6032080, 6652080, 7292080, 8092080), UJUNG):
        bb = s1.cari(Slide.di(x, yy, True))[0]; s1.G(x, yy, nx=ujung - 54864 - geom(bb)[2])
# panel kejadian dan status
s1.hapus(lambda b: (g := geom(b)) and 8820000 <= g[0] and 2850000 <= g[1] < 5200000 and not b.startswith('<p:cxnSp>'))
BARIS = [('Kumpeh, Muaro Jambi', [(f"{f0(KUM['luas'][-1])} ha terbakar 24 Okt", 'merah', 'luas'), (f"belum padam {f0(KUM['belum'][-1])} ha", 'merah', 'awas')], 'belum padam', 'D9600B', 'api'),
         ('Sadu, Tanjung Jabung Timur', [(f"{f0(SADU['hot'][-1])} titik 24 Okt", 'oranye', 'api'), (f"belum padam {f0(SADU['belum'][-1])} ha", 'merah', 'awas')], 'belum padam', 'D9600B', 'api'),
         ('Berbak, Tanjung Jabung Timur', [(f"{f0(BERBAK['hot'][-1])} titik 24 Okt", 'oranye', 'api'), ('cluster Prioritas', 'merah', 'pin')], 'pantau', '5B7A99', 'mata'),
         ('Satgas darat, 23 Okt', [('17 dari 30 FS padam', 'navy', 'centang'), ('+160 personel', 'navy', 'orang')], 'berjalan', '051C2C', 'orang'),
         ('Water bombing, 23 Okt', [('tidak terbang', 'merah', 'pesawat'), ('2 heli siaga, 1 perawatan', 'navy', 'pesawat')], 'pantau', '5B7A99', 'tetes'),
         ('Siaga Darurat Prov. Jambi', [('27 Apr s.d. 30 Nov 2026', 'navy', 'kalender')], 'berjalan', '051C2C', 'perisai'),
         ('Karhutla 2026', [(f"{f0(P['kum'])} ha terbakar", 'oranye', 'luas'), ('1 Jan–24 Okt', 'navy', 'kalender')], 'kumulatif', '051C2C', 'lapis')]
s1.T('4', str(sum(1 for b in BARIS if b[2] == 'belum padam')), at=(8615477, 1673352))
o = ''
for k, (j, ch, st, bl, ikb) in enumerate(BARIS):
    o += baris(1, 9089136, 2862072 + k * 335280, 11505895, j, ch, st, bl, ikb)
s1.tambah(o)
# pita bawah
s1.hapus(lambda b: (g := geom(b)) and g[1] >= 5321808 and g[1] < 6200000 and not (g[0] == 548640 and g[1] == 5349240))
o = bentuk(658368, 5394960, 1340000, 182880, '051C2C', 'roundRect', {'adj': 50000}) + gambar(731520, 5431536, 109728, 109728, rel(1, 'jt-ik-api-putih.png'))
o += tx(896112, 5394960, 1080000, 182880, [('TREN TITIK PANAS', 660, True, 'FFFFFF')], spc=100)
t, c = pct(P['hot'][-2], P['hot'][-1])
o += tx(7000000, 5394960, 4533327, 182880, [(t, 760, True, c), ('  24 Okt dibanding 23 Okt', 700, False, '6B7280')], al='r')
o += grafik(1, 658368, 11533327, 5940000, 300000, P['hot'], HARI, 5955000, 6047000, bw_frac=0.58)
s1.tambah(o)

# ================================================================== SLIDE 2: Kab. Muaro Jambi
s2 = S[2]
s2.T('Sebaran Titik Panas dan Kebakaran di Kab. Malang per 23 Oktober', ['Sebaran Titik Panas dan Kebakaran di ', 'Kab. Muaro Jambi', ' per 24 Oktober'])
s2.ubah(lambda b: 'Kab. Muaro Jambi' in teks(b) and geom(b)[1] == 274320, lambda b: b.replace('sz="2000"', 'sz="1800"'), 1)
s2.T('20', f0(MJ['hot'][-1]), at=(1170432, 1673352)); s2.T('titik panas s.d. 06.25', 'titik panas 24 Okt')
s2.T('37 ha', f"{f0(MJ['luas'][-1])} ha"); s2.T('luas terbakar s.d. 06.25', 'luas terbakar 24 Okt')
s2.T('7 ha', f"{f0(MJ['belum'][-1])} ha"); s2.T('belum padam s.d. 06.25', 'belum padam 24 Okt')
s2.T('389', f0(sum(MJ['hot'])), at=(6452463, 1673352)); s2.T('titik panas 16–23 Okt', 'titik panas 17–24 Okt')
s2.T('2', f"{f0(KUM['belum'][-1])} ha", at=(8615477, 1655064)); s2.T('kebakaran belum padam di Malang Raya', 'belum padam Kumpeh, 24 Okt')
s2.T('9.527', PM); s2.warna(10376154, 1673352, '5B7A99', 'C8102E'); s2.T('jiwa kekeringan', 'PM2.5 Muaro Jambi, berbahaya')
s2.warna(9973818, 1746504, 'E3EAF1', 'F8DDE0'); ganti_ikon(s2, 2, 10046970, 1819656, 'lpg-ik-sinyal-merah.png')
s2.T('Tren harian 16–23 Oktober', 'Tren Harian')
s2.hapus(lambda b: (g := geom(b)) and g[0] < 6000000 and 2800000 <= g[1] < 6150000)
o = ''
for k, (judul, v) in enumerate((('Titik panas', MJ['hot']), ('Luas terbakar (ha)', MJ['luas']), ('Belum padam (ha)', MJ['belum']))):
    y0 = 2843784 + k * 1100000
    o += tx(685800, y0, 4220640, 228600, [(judul, 900, True, '1A1A1A')])
    o += grafik(2, 685800, 5815584, y0 + 780000, 360000, v, HARI, y0 + 798000, y0 + 890000, bw_frac=0.62)
s2.tambah(o)
# titik per kecamatan
s2.T('Titik panas per kecamatan, 16–23 Okt', 'Titik Panas per Kecamatan'); s2.T('389', f0(sum(MJ['hot'])), at=(10543055, 2386584))
YK = [2852928, 3081528, 3310128, 3538728, 3767328, 3995928]
kec = A['mj_kec'][:6]; mx = kec[0][1]; GB = set(A['gambut_kec'])
s2.hapus(lambda b: (g := geom(b)) and g[0] == 7507224 and 2850000 < g[1] < 4100000)
o = ''
for y, (k, n) in zip(YK, kec):
    gb = f'Muaro Jambi|{k}' in GB
    lama = [teks(b) for b in s2.cari(Slide.di(6446520, y, True))][0]; s2.T(lama, k, at=(6446520, y))
    if gb: o += pil(2, 7507224, y + 22860, 'gambut', 'oranye', 'gambut', h=182880, sz=660, w=660000)[0]
    wb = max(36576, round(n / mx * 2400000))
    s2.ubah(Slide.di(8641080, y + 54864), lambda b: re.sub(r'val="\w+"', f'val="{"D9600B" if gb else "A9B4C2"}"', b, count=1), 1); s2.G(8641080, y + 54864, cx=wb)
    xv = [geom(b)[0] for b in s2.blok() if (g := geom(b)) and g[1] == y and g[2] == 500000 and isi(b)][0]
    lama = [teks(b) for b in s2.cari(Slide.di(xv, y, True))][0]; s2.T(lama, f0(n), at=(xv, y)); s2.G(xv, y, nx=8641080 + wb + 54864)
s2.tambah(o)
s2.ubah(lambda b: (gg := geom(b)) and gg[0] >= 6200000 and 2852928 < gg[1] < 4251960,
        lambda b: re.sub(r'<a:off x="(\d+)" y="(\d+)"/>', lambda m: f'<a:off x="{m.group(1)}" y="{round(2852928 + (int(m.group(2)) - 2852928) * 0.895)}"/>', b, count=1))
# bar komposisi: Kumpeh vs kecamatan lain
s2.hapus(lambda b: (g := geom(b)) and g[1] == 4251960)
nk = sum(KUM['hot']); nmj = sum(MJ['hot']); p_k = round(nk / nmj * 100)
X0, X1, YB, HB = 6208776, 11515039, 4226000, 200000
w_t = min(round((X1 - X0) * nk / nmj), (X1 - X0) - 1600000)
o = tx(X0, 4112000, 2000000, 100000, [('SEBARAN TITIK 17–24 OKT', 660, True, '6B7280')], spc=100, an='b')
o += bentuk(X0, YB, X1 - X0, HB, 'DCE1E7', 'roundRect', {'adj': 50000})
o += bentuk(X0, YB, HB, HB, 'D9600B', 'ellipse') + bentuk(X0 + HB / 2, YB, w_t - HB / 2, HB, 'D9600B')
o += gambar(X0 + 91440, YB + (HB - 118872) / 2, 118872, 118872, ik(2, 'gambut', 'putih'))
o += tx(X0 + 246888, YB, w_t - 300000, HB, [(f'{f0(nk)} titik ({p_k}%)', 700, True, 'FFFFFF'), ('  di Kumpeh', 700, False, 'FFFFFF')])
o += gambar(X0 + w_t + 91440, YB + (HB - 118872) / 2, 118872, 118872, ik(2, 'pin', 'navy'))
o += tx(X0 + w_t + 246888, YB, X1 - X0 - w_t - 300000, HB, [(f'{f0(nmj - nk)} titik ({100 - p_k}%)', 700, True, '2E3440'), ('  kecamatan lain', 700, False, '2E3440')])
s2.tambah(o)
# situasi lapangan
s2.hapus(lambda b: (g := geom(b)) and 6200000 <= g[0] and 5100000 <= g[1] < 6150000 and not b.startswith('<p:cxnSp>'))
o = ''
for y, (j, ch, st, bl, ikb) in zip((5129784, 5468112, 5806440), [
        ('Kumpeh, cluster Prioritas di gambut', [(f"belum padam {f0(KUM['belum'][-1])} ha, 24 Okt", 'merah', 'awas'), ('gambut', 'navy', 'gambut'), (f"{f0(sum(KUM['hot']))} titik 17–24 Okt", 'navy', 'api')], 'belum padam', 'D9600B', 'api'),
        ('Udara Muaro Jambi dan Kota Jambi', [(f'PM2.5 {PM}, berbahaya', 'merah', 'sinyal'), ('jarak pandang 700 m pagi', 'navy', 'mata'), ('sekolah sebagian daring', 'navy', 'rumah')], 'pantau', '5B7A99', 'tetes'),
        ('Hujan 21 Okt di Gedong Karya, Kumpeh', [('sedang hingga tinggi', 'navy', 'tetes'), (f"23 Okt naik lagi, {f0(KUM['hot'][-2])} titik", 'merah', 'api')], 'pantau', '5B7A99', 'tetes')]):
    o += baris(2, 6483096, y, 11505895, j, ch, st, bl, ikb)
s2.tambah(o)

# ================================================================== SLIDE 3: gambut Kumpeh-Sadu
s3 = S[3]
s3.T('Sebaran Titik Panas dan Kebakaran di Arjuno–Welirang per 23 Oktober', ['Sebaran Titik Panas dan Kebakaran di ', 'Gambut Kumpeh–Sadu', ' per 24 Oktober'])
s3.ubah(lambda b: 'Gambut Kumpeh' in teks(b) and geom(b)[1] == 274320, lambda b: b.replace('sz="2000"', 'sz="1800"'), 1)
s3.T('1.090 ha', f"{f0(KW['luas'][-1])} ha"); s3.T('terbakar 16–23 Okt', 'terbakar 24 Okt')
s3.T('945', f0(sum(KW['hot']))); s3.T('titik panas 16–23 Okt', 'titik panas 17–24 Okt')
s3.T('291', f"{f0(KW['belum'][-1])} ha"); s3.T('titik puncak, 19 Okt', 'belum padam 24 Okt'); s3.warna(4691786, 1673352, '051C2C', 'C8102E'); s3.warna(4289450, 1746504, 'E6EAF0', 'F8DDE0'); ganti_ikon(s3, 3, 4362602, 1819656, 'jt-ik-belum-merah.png')
s3.T('16 ha', f0(KW['hot'][-1]), at=(6452463, 1673352)); s3.T('belum padam s.d. 06.25', 'titik panas 24 Okt')
s3.ubah(lambda b: b.startswith('<p:pic>') and 'r:embed="rIdM1"' in b and geom(b)[0] < 1000000, lambda b: b.replace('r:embed="rIdM1"', f'r:embed="{rel(3, "jt-ik-pohon-putih.png")}"'))
s3.T('Bumiaji, Kota Batu', 'Kumpeh dan Sadu')
s3.T('11 titik 23 Okt dini hari; sisi Malang masih ada titik api (BPBD)',
     f"{f0(KUM['hot'][-1])} dan {f0(SADU['hot'][-1])} titik 24 Okt; belum padam {f0(KUM['belum'][-1] + SADU['belum'][-1])} ha; {A['kaw_prio']} cluster Prioritas di gambut")
s3.T('Sebaran titik panas, 16–23 Okt', 'Sebaran Titik Panas')
RELS[3] = RELS[3].replace('../media/jt-arjuno4.png', '../media/jmb-peta-kawasan.png'); F['ppt/media/jmb-peta-kawasan.png'] = open('peta-kawasan.png', 'rb').read()
s3.T('16–18 Okt', '17–19 Okt'); s3.T('19–21 Okt', '20–22 Okt'); s3.T('22–23 Okt, terbaru', '23–24 Okt, terbaru')
s3.hapus(lambda b: (g := geom(b)) and 4600000 <= g[0] < 8600000 and 2800000 <= g[1] < 5500000)
o = ''
for (k, sub, x0, y0) in (('Kumpeh', 'Kab. Muaro Jambi', 4654296, 2834640), ('Sadu', 'Kab. Tanjung Jabung Timur', 6583680, 2834640),
                         ('Berbak', 'Kab. Tanjung Jabung Timur', 4654296, 4160520), ('Kumpeh Ulu', 'Kab. Muaro Jambi', 6583680, 4160520)):
    v = [x for kk, d in KK.items() if kk.split('|')[1] == k for x in [d['hot']]][0]
    o += tx(x0, y0, 1800000, 228600, [(k, 900, True, '1A1A1A')]) + tx(x0, y0 + 201168, 1800000, 146304, [(sub, 650, False, '6B7280')])
    o += grafik(3, x0, x0 + 1850000, y0 + 1078992, 560000, v, HARI, y0 + 1106424, 0, bw_frac=0.62, sz_v=700, sz_d=600, pct_on=False, lab_akhir=False)
s3.tambah(o)
s3.hapus(lambda b: (g := geom(b)) and g[1] == 5715000)
xa, ya, o = 4654296, 5700000, ''
for t_, gy in [('Kumpeh, Sadu 18', 'abu'), ('Kumpeh 21', 'oranye'), ('Sadu 21', 'oranye'), ('Kumpeh 23–24', 'merah'), ('Sadu 23–24', 'merah')]:
    w = pil(3, 0, 0, t_, gy, 'api', h=164592, sz=560)[1]
    if xa + w > 8595360: xa, ya = 4654296, ya + 201168
    o += pil(3, xa, ya, t_, gy, 'api', h=164592, sz=560)[0]; xa += w + 64008
assert ya < 6000000, ya
s3.tambah(o)
s3.hapus(lambda b: (g := geom(b)) and g[0] >= 8860000 and 2870000 <= g[1] < 6150000)
pk = max(range(len(HARI)), key=lambda i: P['hot'][i])
EV = [('27 Apr', [('Siaga Darurat Prov. Jambi', 'navy', 'perisai')], '051C2C', 'kalender'),
      ('18 Okt', [(f"{f0(KW['hot'][1])} titik", 'oranye', 'api'), ('Kumpeh dan Sadu', 'navy', 'pin')], 'D9600B', 'api'),
      (f"{HARI[pk][8:].lstrip('0')} Okt", [(f"puncak Jambi {f0(P['hot'][pk])} titik", 'oranye', 'api'), ('hujan di Kumpeh', 'navy', 'tetes')], '051C2C', 'tetes'),
      ('24 Okt', [(f"{f0(KW['hot'][-1])} titik", 'merah', 'api'), (f"belum padam {f0(KW['belum'][-1])} ha", 'merah', 'awas')], 'C8102E', 'awas')]
Y0, PIT = 2898648, 440000; cxl = 8869680 + 100584
o = bentuk(cxl - 6350, Y0 + 18288 + 100584, 12700, PIT * (len(EV) - 1), 'E5E7EB')
for k, (j, ch, bl, ikb) in enumerate(EV):
    y = Y0 + k * PIT
    if k == len(EV) - 1: o += bentuk(8869680 - 36576, y + 18288 - 36576, 274320, 274320, None, 'ellipse', ln='C8102E', lw=12700)
    o += bentuk(8869680, y + 18288, 201168, 201168, bl, 'ellipse', ln='FFFFFF', lw=12700) + gambar(8910828, y + 59436, 118872, 118872, ik(3, ikb, 'putih'))
    o += tx(9134856, y, 2371039, 146304, [(j, 760, True, '1A1A1A')])
    o += deret(3, 9134856, y + 160020, ch, 11550000, lipat=True)
UNSUR = [('5.984 personel satgas', 'orang'), ('penebalan 160 personel', 'satu'), ('3 heli water bombing', 'pesawat'), ('1 pesawat patroli', 'pesawat'),
         ('Mini Striker, Waterax', 'tetes'), ('Shibaura, Tohatsu', 'tetes'), ('pompa apung, jinjing', 'tetes'), ('drone pemantau', 'mata'), ('alat berat', 'lapis'), ('mobil tangki', 'tetes')]
yu = Y0 + PIT * len(EV) - 60000
o += tx(8869680, yu, 2636215, 182880, [(f'KEKUATAN DAN SARANA SATGAS JAMBI', 750, True, '051C2C')], spc=100)
CW = (11505895 - 8869680 - 91440) // 2; RH = 190000; RG = 54864
for k, (t, ikn) in enumerate(UNSUR):
    x = 8869680 + (k % 2) * (CW + 91440); y = yu + 246888 + (k // 2) * (RH + RG)
    o += bentuk(x, y, CW, RH, 'E6EAF0', 'roundRect', {'adj': 50000}) + gambar(x + 73152, y + (RH - 128016) / 2, 128016, 128016, ik(3, ikn, 'navy'))
    o += tx(x + 256032, y, CW - 300000, RH, [(t, 600, True, '051C2C')])
assert y + RH < 6150000, y
s3.tambah(o)

# ================================================================== SLIDE 4: banjir dan longsor peralihan musim
s4 = S[4]
s4.T('Waspada saat peralihan musim: 9 kawasan di Jawa Timur berisiko banjir bandang, longsor, dan lahar',
     ['Waspada peralihan musim: ', f"{BJ['kec_waspada']} dari {BJ['n_kec']}", ' kecamatan di Jambi berstatus Waspada banjir atau longsor 25–27 Okt'])
s4.T('PERINGATAN BMKG', 'PRAKIRAAN CUACA')
s4.T('Kering', 'Sedang'); s4.T('hingga pertengahan Nov', 'hujan Jambi, 23–25 Okt (BMKG)')
s4.T('Hujan lokal', 'Lebat'); s4.T('petir, angin kencang', 'Kerinci, Sungai Penuh, Merangin')
h3 = max(v['h3'] for v in BJ['kab'].values())
s4.T('Longsor', f"{f0(h3)} mm"); s4.T('material dan genangan', 'hujan 3 hari terbesar (ECMWF)')
s4.T('Lahar', 'Awan >70%'); s4.warna(6452463, 1673352, '8A4B2A', '051C2C'); s4.T('Semeru saat hujan', 'peluang awan hujan sepekan (BMKG)')
s4.warna(6050127, 1746504, 'F1E2D6', 'E6EAF0'); ganti_ikon(s4, 4, 6123279, 1819656, 'jt-ik-air-navy.png')
D = BJ['dibi']
s4.T('Banjir bandang dari lereng terbakar', 'Banjir Jambi naik mulai November')
s4.hapus(lambda b: (g := geom(b)) and g[1] == 1938528 and g[0] >= 8615477)
s4.tambah(deret(4, 8615477, 1938528, [(f"{f0(D['banjir'])} banjir {D['th0']}–{D['th1']}", 'merah', 'tetes'), (f"Januari rerata {str(BJ['bulan'][0]).replace('.', ',')} kejadian", 'merah', 'kalender')], 11450000, h=155448))
# tabel kabupaten berstatus Waspada
s4.T('Wilayah hilir berisiko', 'Kabupaten/kota berstatus Waspada, 25–27 Okt')
s4.hapus(lambda b: (g := geom(b)) and 2840000 < g[1] < 5200000 and g[0] < 7900000)
rows = sorted(BJ['kab'].items(), key=lambda x: (-len({n for n, _ in x[1]['banjir'] + x[1]['longsor']}), -x[1]['h3']))
lama = [teks(b) for b in s4.cari(Slide.di(6763840, 2386584, True))][0]; s4.T(lama, str(len(rows)), at=(6763840, 2386584))
XN, XW, XC, XD, XA = 886968, 2560320, 3291840, 5800000, 6400800
o = ''.join(tx(x, 2852928, 1900000, 164592, [(t, 600, True, '6B7280')], spc=100) for x, t in
            ((676656, 'KAB/KOTA'), (XW, 'KEC.'), (XC, 'KECAMATAN, HUJAN 3 HARI TERBESAR'), (XD, 'DIBI*'), (XA, 'ANCAMAN')))
o += f'<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="9400" name="L"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="676656" y="3035808"/><a:ext cx="7059168" cy="0"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="9525"><a:solidFill><a:srgbClr val="1A1A1A"/></a:solidFill></a:ln></p:spPr></p:cxnSp>'
y, RH = 3063240, 171000
for no, (k, v) in enumerate(rows, 1):
    nw = len({n for n, _ in v['banjir'] + v['longsor']}); top = [n for n, _ in sorted(v['banjir'] + v['longsor'], key=lambda x: -x[1])]
    top = list(dict.fromkeys(top))[:3]
    o += bentuk(676656, y + (RH - 128016) / 2, 128016, 128016, '051C2C', 'ellipse') + tx(676656, y + (RH - 128016) / 2, 128016, 128016, [(str(no), 480, True, 'FFFFFF')], al='ctr')
    o += tx(XN, y, 1650000, RH, [(k, 700, True, '1A1A1A')]) + tx(XW, y, 700000, RH, [(f"{nw} dari {v['n_kec']}", 680, True, '051C2C')])
    o += tx(XC, y, 2450000, RH, [(', '.join(top), 680, False, '051C2C'), (f"  {f0(v['h3'])} mm", 680, True, '2F86D1')])
    o += tx(XD, y, 500000, RH, [(f0(v['dibi_banjir'] + v['dibi_longsor']), 680, True, '051C2C')])
    ch = ([('banjir', 'biru', 'tetes')] if v['banjir'] else []) + ([('longsor', 'oranye', 'awas')] if v['longsor'] else [])
    o += deret(4, XA, y + (RH - 128016) / 2, ch, 7800000, h=128016)
    y += RH
    if no < len(rows): o += f'<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="{9500 + no}" name="L"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="676656" y="{y}"/><a:ext cx="7059168" cy="0"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="6350"><a:solidFill><a:srgbClr val="EEF0F3"/></a:solidFill></a:ln></p:spPr></p:cxnSp>'
assert y < 4960000, y
xl = 676656
o += tx(xl, 4983480, 700000, 164592, [('ANCAMAN:', 600, True, '6B7280')], spc=60); xl += 600000
for t_, gy, ikn, ket in (('banjir', 'biru', 'tetes', 'luapan sungai dan genangan'), ('longsor', 'oranye', 'awas', 'lereng jenuh air runtuh')):
    p, w = pil(4, xl, 4983480, t_, gy, ikn, h=137160); o += p; xl += w + 73152
    wk = 40000 * len(ket); o += tx(xl, 4983480, wk, 164592, [(ket, 600, False, '2E3440')]); xl += wk + 120000
o += tx(xl, 4983480, 7863840 - xl, 164592, [(f"*DIBI = kejadian banjir dan longsor {D['th0']}–{D['th1']}", 600, False, '6B7280')])
s4.tambah(o)
# panel kanan: riwayat kejadian Jambi (DIBI BNPB)
s4.T('Kesiapan BPBD Jatim', 'Riwayat kejadian Jambi (DIBI)')
ganti_ikon(s4, 4, 8183880, 2468880, 'jt-ik-kalender-putih.png')
KB = BJ['kab']; tk = sorted(KB, key=lambda k: -KB[k]['dibi_banjir'])
SAR = [(f0(D['banjir']), f"banjir {D['th0']}–{D['th1']}", 'jt-ik-air-navy.png'), (f0(D['v'][D['th1']]), f"banjir tahun {D['th1']}", 'jt-ik-kalender-navy.png'),
       (f0(KB[tk[0]]['dibi_banjir']), f'banjir {tk[0]}', 'lpg-ik-pin-navy.png'), (f0(KB[tk[1]]['dibi_banjir']), f'banjir {tk[1]}', 'lpg-ik-pin-navy.png'),
       (f0(sum(KB[k]['dibi_longsor'] for k in KB)), f"longsor {D['th0']}–{D['th1']}", 'lpg-ik-awas-navy.png'), (str(BJ['bulan'][-1]).replace('.', ','), 'rerata banjir Desember', 'jt-ik-kalender-navy.png')]
for (xv, yv), (v, l, ikn) in zip(((8622792, 2990088), (10360152, 2990088), (8622792, 3685032), (10360152, 3685032), (8622792, 4379976), (10360152, 4379976)), SAR):
    for yy, isi_ in ((yv, v), (yv + 274320, l)):
        lama = [teks(b) for b in s4.cari(Slide.di(xv, yy, True))][0]; s4.T(lama, isi_, at=(xv, yy))
    ganti_ikon(s4, 4, xv - 329184, yv + 146304, ikn)
kj = BJ['kab']['Kota Jambi']
for (j0, i0), (j, i) in zip((('Bersihkan alur sungai', 'Material dan kayu terbakar di alur hilir Arjuno, Argopuro, Ijen, Tengger'),
                             ('Pengamat dan sirene', 'Pengamat hujan di hulu; sirene banjir bandang Bumiaji, Prigen, Panti'),
                             ('Jalur evakuasi desa hilir', 'Peta evakuasi dan titik kumpul desa di bawah kawasan terbakar'),
                             ('Siaga lahar Semeru', 'Patuhi larangan 13 km Besuk Kobokan saat hujan di puncak')),
                            (('Siaga hulu Kerinci–Merangin', 'Pengamat hujan dan sirene di hulu; longsor dan banjir bandang Kerinci, Sungai Penuh, Merangin'),
                             ('Pantau muka air Batanghari', f"Kota Jambi {len(kj['banjir'])} dari {kj['n_kec']} kecamatan Waspada banjir; Muaro Jambi dan Batanghari di hilir"),
                             ('Gambut tetap dibasahi', 'Hujan sedang belum tentu memadamkan api bawah di Kumpeh dan Sadu; pembasahan jalan terus'),
                             ('Perahu dan jalur evakuasi', 'Peta evakuasi dan titik kumpul desa bantaran Batanghari, Tebo, Bungo, Merangin'))):
    s4.T(j0, j); s4.T(i0, i)


# ================================================================== kartu DATA SATELIT: kartu total jendela dibuang, sisa kartu dibagi rata
def kartu_ulang(s, buang):
    XS = [658368, 2419045, 4179722, 5940399]
    anak = lambda x0: (lambda b: (gg := geom(b)) and 1600000 < gg[1] < 2200000 and gg[0] in (x0, x0 + 109728, x0 + 182880, x0 + 512064))
    s.hapus(anak(buang))
    sisa = [x for x in XS if x != buang]; w = (7170725 - 2 * 109728 - 2 * 91440) // 3
    for k, x0 in enumerate(sisa):
        nx = 658368 + k * (w + 91440)
        def fn(b, x0=x0, nx=nx):
            gg = GEO.search(b); x, cx = int(gg.group(1)), int(gg.group(4))
            d = x - x0; ncx = w if d == 0 else (w - 548640 if d == 512064 else cx)
            return b[:gg.start()] + f'<a:off x="{nx + d}" y="{gg.group(2)}"/>{gg.group(3)}<a:ext cx="{ncx}" cy="{gg.group(5)}"/>' + b[gg.end():]
        s.ubah(anak(x0), fn)


kartu_ulang(S[1], 5940399); kartu_ulang(S[2], 5940399); kartu_ulang(S[3], 2419045)


# ================================================================== kepala rapat ke atas, isi meregang mengisi ruang yang dibebaskan
def kepala(s, sz, ada_pil=True):
    jb = [b for b in s.blok() if (g := geom(b)) and g[0] == 548640 and g[1] == 274320][0]
    g = geom(jb); L = len(teks(jb)); baris_ = max(1, math.ceil(L * 0.49 * sz / 100 / (g[2] / 12700)))
    tinggi = round(baris_ * sz / 100 * 1.18 * 12700); top = 365760
    s.ubah(lambda b: b == jb, lambda b: re.sub(r'<a:off x="548640" y="274320"/>(\s*)<a:ext cx="(\d+)" cy="\d+"/>', rf'<a:off x="548640" y="{top}"/>\1<a:ext cx="\2" cy="{tinggi}"/>', b, count=1).replace('anchor="b"', 'anchor="t"'), 1)
    garis_y = max(top + tinggi, 365760 + 438912) + 101600
    if ada_pil:
        py = top + tinggi // 2 - 105156
        s.ubah(lambda b: (gg := geom(b)) and gg[1] == 877824, lambda b: re.sub(r'y="877824"', f'y="{py}"', b, count=1))
        s.ubah(lambda b: (gg := geom(b)) and gg[1] == 914400 and gg[0] > 8000000, lambda b: re.sub(r'y="914400"', f'y="{py + 36576}"', b, count=1))
    lama0, bawah = 1207008, 6446520
    k = (bawah - garis_y) / (bawah - lama0)

    def peta(y): return garis_y + (y - lama0) * k

    def fn(b):
        gg = GEO.search(b); x, y, cx, cy = int(gg.group(1)), int(gg.group(2)), int(gg.group(4)), int(gg.group(5))
        if y == lama0 and cy == 0: return b[:gg.start()] + f'<a:off x="{x}" y="{garis_y}"/>{gg.group(3)}<a:ext cx="{cx}" cy="0"/>' + b[gg.end():]
        if not (lama0 < y < bawah): return b
        kecil = b.startswith('<p:pic>') or 'prst="ellipse"' in b or cy < 260000
        if kecil: ny, ncy = round(peta(y + cy / 2) - cy / 2), cy
        else: ny, ncy = round(peta(y)), round(cy * k)
        return b[:gg.start()] + f'<a:off x="{x}" y="{ny}"/>{gg.group(3)}<a:ext cx="{cx}" cy="{ncy}"/>' + b[gg.end():]
    s.ubah(lambda b: GEO.search(b) is not None, fn)
    return baris_, garis_y


for i, sz in ((1, 2000), (2, 1800), (3, 1800), (4, 2000)):
    print('slide', i, 'judul/garis', kepala(S[i], sz, i != 4))

# ------------------------------------------------------------------ tulis + cek
for i in (1, 2, 3, 4):
    tt = re.sub(r'<[^>]+>', '', S[i].s)
    assert '·' not in tt and '—' not in tt, f'titik tengah / em dash di slide {i}'
    for x in ('32,50', '72,50', '105,00', '±', 'Jawa Timur', 'Jatim', 'Malang', 'Arjuno', 'Semeru'):
        assert x not in tt, f'{x!r} tersisa di slide {i}'
    F[f'ppt/slides/slide{i}.xml'] = S[i].s.encode(); F[f'ppt/slides/_rels/slide{i}.xml.rels'] = RELS[i].encode()
for n in ('ppt/media/jt-jatim5.png', 'ppt/media/jt-arjuno4.png'): F.pop(n, None)
zo = zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED)
for n in ['[Content_Types].xml'] + [n for n in F if n != '[Content_Types].xml']: zo.writestr(n, F[n])
zo.close(); print('ok', OUT)
