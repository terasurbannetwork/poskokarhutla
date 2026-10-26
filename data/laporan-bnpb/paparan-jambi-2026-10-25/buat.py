"""Paparan Karhutla Provinsi Jambi 251026, DECK UJI peta 3D miring + slot foto (Buku Pegangan, Selera presentasi > Komponen, keputusan
pemilik 25 Okt 2026). Cut-off 25 Okt 2026 23.30 WIB, angka 25 Okt sementara. Templat = deck pemilik Jatim 231026 (ref/j.pptx) seperti paparan
Jambi 241026; hanya slide 1 (provinsi, peta 3D + slot foto) dan slide 4 (banjir dan longsor 26-28 Okt). Slide 2-3 paparan 24 Okt bercerita
Kumpeh/Muaro Jambi dan tidak berlaku 25 Okt (Muaro Jambi 0 titik, tanpa cluster Prioritas), jadi dibuang. Titik, luas, belum padam = data kita
(generator/satelit.py, faktor N20 4,12 / N21 4,16). Fakta lapangan masih dari WA 24 Okt dan ditulis bertanggal. Pakai: python3 buat.py ref/j.pptx keluar.pptx"""
import json, math, re, sys, zipfile
from pp import Slide, inst, geom, teks, isi, f0, pct, warna_batang, GEO, tx, bentuk, gambar
import subprocess
sys.path.insert(0, '../generator')
from peta3d import Peta3D
import foto as FOTO

REF, OUT = sys.argv[1], sys.argv[2]
A = json.load(open('angka.json'))
P, MJ, KW, HARI, BJ = A['prov'], A['kab']['Muaro Jambi'], A['kaw'], A['HARI'], A['banjir']
KK = A['kaw_kec']; KUM, SADU, BERBAK = KK['Muaro Jambi|Kumpeh'], KK['Tanjung Jabung Timur|Sadu'], KK['Tanjung Jabung Timur|Berbak']
zi = zipfile.ZipFile(REF); F = {n: zi.read(n) for n in zi.namelist()}
S = {i: Slide(F[f'ppt/slides/slide{i}.xml'].decode()) for i in (1, 2, 3, 4)}
RELS = {i: F[f'ppt/slides/_rels/slide{i}.xml.rels'].decode() for i in (1, 2, 3, 4)}
CUT = '25 Okt 2026, 23.30 WIB'; HR, HR1 = '25 Okt', '24 Okt'
KAKI = '*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS). Angka 25 Okt sementara, data s.d. 23.30 WIB.'
PM = '337,8'   # PM2.5 Muaro Jambi, BMKG 24 Okt 19.00 WIB (berbahaya); belum ada angka BMKG 25 Okt, label kartu menyebut tanggalnya
SAT = json.load(open('satelit.json'))
LEVEL = {3: ('Prioritas', 'C8102E'), 2: ('Siaga', 'E07A2E'), 1: ('Patroli', 'F2C9A0'), 0: ('Rutin', 'B4BDC8')}


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
STATUS = {'belum padam': ('merah', 'api'), 'prioritas': ('merah', 'awas'), 'berjalan': ('oranye', 'putar'), 'pantau': ('navy', 'mata'), 'kumulatif': ('navy', 'lapis'), 'selesai': ('navy', 'centang')}


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


def label_bahaya(s, i):
    """Pil BERBAHAYA di kanan angka PM2.5 kartu Perlu Perhatian (kategori ISPU BMKG 24 Okt 19.00)."""
    x, y, w, h = 10376154 + 640000, 1673352 + 68580, 470000, 137160
    assert x + w < 9864090 + 1669237, 'pil keluar kartu'
    s.tambah(bentuk(x, y, w, h, 'C8102E', 'roundRect', {'adj': 50000}) + tx(x, y, w, h, [('BERBAHAYA', 520, True, 'FFFFFF')], al='ctr', spc=40))


# ================================================================== umum
for i in (1,):
    S[i].T('23 Okt 2026, 06.25 WIB', CUT)
    S[i].T('*Data GIS satelit NASA (FIRMS: VIIRS dan MODIS), tanpa titik sumber panas industri. Angka 23 Okt sementara: data s.d. 06.25 WIB, baru lintasan satelit malam.', KAKI)
S[4].T('*Data GIS satelit NASA (FIRMS: VIIRS dan MODIS), tanpa titik sumber panas industri.', '*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS).')
S[4].T('4', '2', at=(11094415, 6510528))   # deck uji 2 halaman

# ================================================================== SLIDE 1: provinsi
s1 = S[1]
s1.T('Sebaran Titik Panas dan Kebakaran di Jawa Timur per 23 Oktober', ['Sebaran Titik Panas dan Kebakaran di ', 'Jambi', ' per 25 Oktober'])
s1.T('261', f0(P['hot'][-1]), at=(1170432, 1673352)); s1.T('titik panas s.d. 06.25', f'titik panas {HR}')
s1.T('482 ha', f'{f0(P["luas"][-1])} ha'); s1.T('luas terbakar s.d. 06.25', f'luas terbakar {HR}')
s1.T('223 ha', f'{f0(P["belum"][-1])} ha'); s1.T('belum padam s.d. 06.25', f'belum padam {HR}')
s1.T('4.345', f0(sum(P['hot']))); s1.T('titik panas 16–23 Okt', 'titik panas 18–25 Okt')
s1.T('Semeru', PM); s1.warna(10376154, 1673352, '8A4B2A', 'C8102E'); s1.T('gunung api Level III', 'PM2.5 M. Jambi 24 Okt')
s1.warna(9973818, 1746504, 'F1E2D6', 'F8DDE0'); ganti_ikon(s1, 1, 10046970, 1819656, 'lpg-ik-sinyal-merah.png'); label_bahaya(s1, 1)
# peta 3D miring (generator/peta3d.py) menggantikan PNG peta; penanda cluster dan nomor native
mp = [b for b in s1.blok() if b.startswith('<p:pic>') and 'r:embed="rIdM9"' in b]; assert len(mp) == 1
KOTAK = geom(mp[0]); s1.hapus(lambda b: b == mp[0])
s1.hapus(lambda b: (g := geom(b)) and 3100000 <= g[0] < 3400000 and 3150000 <= g[1] < 3600000)
KL = [f['properties'] for f in json.load(open('web/kluster_awal.json'))['features'] if f['properties']['prov'] == '15']
ada = {c['kab'] for c in KL}
KABF = json.load(open('/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/public/geo/kabupaten/15.json'))['features']
PT = Peta3D(KABF, KOTAK, lambda f: 'Kabupaten - ' + f['properties']['kab'],
            lambda f: ('D3DBE5', 'FFFFFF') if f['properties']['kab'] in ada else ('E6EAF0', 'A9B4C2'))
open('bayangan.svg', 'w').write(PT.bayangan_svg())
subprocess.run(['node', 'render.mjs', 'bayangan.svg', 'bayangan.png'], check=True)
F['ppt/media/jmb-bayangan.png'] = open('bayangan.png', 'rb').read()
bx, by, bw, bh = PT.kotak_bayangan
o = gambar(bx, by, bw, bh, rel(1, 'jmb-bayangan.png')) + PT.xml()
R_LV = {0: 27940, 1: 34925, 2: 50800, 3: 58420}   # jari-jari penanda 2,2 / 2,75 / 4 / 4,6 pt
for c in sorted(KL, key=lambda c: c['level']):
    x, y = PT.titik(c['lon'], c['lat']); r = R_LV[c['level']]
    o += bentuk(x - r, y - r, 2 * r, 2 * r, LEVEL[c['level']][1], 'ellipse', ln='FFFFFF', lw=6350)
GESER = ((-120000, 90000), (110000, -140000), (150000, 120000))   # tiga cluster teratas berdempet: digeser agar nomornya terbaca
for i, c in enumerate(A['prio'], 1):
    x0, y0 = PT.titik(c['lon'], c['lat']); x, y = x0 + GESER[i - 1][0], y0 + GESER[i - 1][1]; r = 69850
    lx, ly = min(x0, x), min(y0, y); fl = (' flipH="1"' if (x < x0) != (y < y0) else '')
    o += (f'<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="{8900 + i}" name="Penunjuk {i}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm{fl}><a:off x="{int(lx)}" y="{int(ly)}"/>'
          f'<a:ext cx="{int(abs(x - x0))}" cy="{int(abs(y - y0))}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="9525"><a:solidFill><a:srgbClr val="{LEVEL[c["level"]][1]}"/></a:solidFill></a:ln></p:spPr></p:cxnSp>')
    o += bentuk(x - r, y - r, 2 * r, 2 * r, LEVEL[c['level']][1], 'ellipse', ln='FFFFFF', lw=15875)
    o += tx(x - r, y - r, 2 * r, 2 * r, [(str(i), 600, True, 'FFFFFF')], al='ctr')
PENDEK = {'Tanjung Jabung Timur': 'Tanjabtim', 'Tanjung Jabung Barat': 'Tanjabbar'}
XL = 3420000   # label di pojok kanan bawah peta (laut/Sumsel, kosong)
for k, (y, c) in enumerate(zip((4170000, 4316304, 4462608), A['prio'])):
    nm, wn = LEVEL[c['level']]
    t1, t2 = f"{c['kec']}, {PENDEK.get(c['kab'], c['kab'])}", '  ' + nm; w = 36000 * len(t1 + t2) + 230000
    assert XL + w < 4846320, (t1, w)
    o += bentuk(XL, y, w, 128016, 'FFFFFF', 'roundRect', {'adj': 50000}, ln=wn, lw=6350)
    o += bentuk(XL + 27432, y + 18288, 91440, 91440, wn, 'ellipse') + tx(XL + 27432, y + 18288, 91440, 91440, [(str(k + 1), 500, True, 'FFFFFF')], al='ctr')
    o += tx(XL + 155808, y, w - 180000, 128016, [(t1, 560, True, '1A1A1A'), (t2, 560, True, wn)])
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
fokus = YR[0]   # kab urutan pertama hari ini
sorot = s1.cari(lambda b: 'val="FDF1E8"' in b)[0]; s1.hapus(lambda b: 'val="FDF1E8"' in b)
garis = [b for b in s1.blok() if (g := geom(b)) and abs(g[1] - fokus) < 30000 and g[0] < 5300000][0]
s1.s = s1.s.replace(garis, re.sub(r'y="\d+"', f'y="{fokus}"', sorot, count=1) + garis, 1)
s1.T('Jawa Timur', 'Jambi', at=(5074920, 4837176))
for x, v in ((6032080, P['hot'][-1]), (6652080, P['luas'][-1]), (7292080, P['belum'][-1]), (8092080, A['n_komp'])):
    lama = [teks(b) for b in s1.cari(Slide.di(x, 4837176, True))][0]; s1.T(lama, f0(v), at=(x, 4837176))
s1.tambah(tx(4983480, 5130000, 3548600, 100000, [('*25 Okt 2026, sementara s.d. 23.30 WIB', 650, False, '6B7280')]))
for yy in YR + [4837176]:
    for x, ujung in zip((6032080, 6652080, 7292080, 8092080), UJUNG):
        bb = s1.cari(Slide.di(x, yy, True))[0]; s1.G(x, yy, nx=ujung - 54864 - geom(bb)[2])
# panel kejadian dan status
s1.hapus(lambda b: (g := geom(b)) and 8820000 <= g[0] and 2850000 <= g[1] < 5200000 and not b.startswith('<p:cxnSp>'))
KECW = []
for c in A['prio']:
    if (c['kab'], c['kec']) not in KECW: KECW.append((c['kab'], c['kec']))
BARIS = []
for kab, kec in KECW:
    d = SAT['kec'].get(f'15|{kab}|{kec}', {'hot_bersih': [0], 'belum': [0]}); bp = round(d['belum'][-1])
    BARIS.append((f'{kec}, {kab}', [(f"{f0(d['hot_bersih'][-1])} titik {HR}", 'oranye', 'api'), (f"belum padam {f0(bp)} ha", 'merah', 'awas')],
                  'belum padam' if bp else 'pantau', 'D9600B' if bp else '5B7A99', 'api'))
BARIS += [('Siaga Darurat Prov. Jambi', [('27 Apr s.d. 30 Nov 2026', 'navy', 'kalender')], 'berjalan', '051C2C', 'perisai'),
          ('Karhutla 2026', [(f"{f0(P['kum'])} ha terbakar", 'oranye', 'luas'), (f'1 Jan–{HR}', 'navy', 'kalender')], 'kumulatif', '051C2C', 'lapis')]
s1.T('7', str(len(BARIS)), at=(10543055, 2386584))
s1.T('4', str(A['level'].get('3', 0)), at=(8615477, 1673352)); s1.T('kebakaran belum padam', 'cluster Prioritas')
o = ''
for k, (j, ch, st, bl, ikb) in enumerate(BARIS):
    o += baris(1, 9089136, 2862072 + k * 335280, 11505895, j, ch, st, bl, ikb)
# slot foto: sisa ruang panel di bawah baris terakhir (panel 8686800..11643055 x 2331720..5257800), hanya bila >= 50 pt
FY = 2862072 + (len(BARIS) - 1) * 335280 + 297180 + 91440; FB = 2331720 + 2926080 - 137160
if FB - FY >= 635000:
    FJ = '/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/data/kajian-bnpb/gambar/foto/mit-b10-pemadam.jpg'
    F['ppt/media/jmb-foto-pemadam.jpg'] = open(FJ, 'rb').read()
    o += FOTO.slot(8823960, FY, 11505895 - 8823960, FB - FY, rel(1, 'jmb-foto-pemadam.jpg'), FJ,
                   'Foto: DenY Krisbiyantoro, CC BY-SA 4.0', 'Pemadaman bara gambut, Sebangau, Kalteng, 2019')
s1.tambah(o)
# pita bawah
s1.hapus(lambda b: (g := geom(b)) and g[1] >= 5321808 and g[1] < 6200000 and not (g[0] == 548640 and g[1] == 5349240))
o = bentuk(658368, 5394960, 1340000, 182880, '051C2C', 'roundRect', {'adj': 50000}) + gambar(731520, 5431536, 109728, 109728, rel(1, 'jt-ik-api-putih.png'))
o += tx(896112, 5394960, 1080000, 182880, [('TREN TITIK PANAS', 660, True, 'FFFFFF')], spc=100)
t, c = pct(P['hot'][-2], P['hot'][-1])
o += tx(7000000, 5394960, 4533327, 182880, [(t, 760, True, c), (f'  {HR} dibanding {HR1}', 700, False, '6B7280')], al='r')
o += grafik(1, 658368, 11533327, 5940000, 300000, P['hot'], HARI, 5955000, 6047000, bw_frac=0.58)
s1.tambah(o)

# ================================================================== SLIDE 4: banjir dan longsor peralihan musim
s4 = S[4]
s4.T('Waspada saat peralihan musim: 9 kawasan di Jawa Timur berisiko banjir bandang, longsor, dan lahar',
     ['Waspada peralihan musim: ', f"{BJ['kec_waspada']} dari {BJ['n_kec']}", ' kecamatan di Jambi berstatus Waspada banjir atau longsor 26–28 Okt'])
s4.T('PERINGATAN BMKG', 'PRAKIRAAN HUJAN')
s4.T('Kering', 'Sedang'); s4.T('hingga pertengahan Nov', 'hujan Jambi, 23–25 Okt')
s4.T('Hujan lokal', 'Lebat'); s4.T('petir, angin kencang', 'hujan Kerinci, S. Penuh')
h3 = max(v['h3'] for v in BJ['kab'].values())
s4.T('Longsor', f"{f0(h3)} mm"); s4.T('material dan genangan', 'hujan 3 hari, 26–28 Okt')
s4.T('Lahar', '>70%'); s4.warna(6452463, 1673352, '8A4B2A', '051C2C'); s4.T('Semeru saat hujan', 'peluang hujan sepekan')
s4.warna(6050127, 1746504, 'F1E2D6', 'E6EAF0'); ganti_ikon(s4, 4, 6123279, 1819656, 'jt-ik-air-navy.png')
D = BJ['dibi']
s4.T('Banjir bandang dari lereng terbakar', 'Banjir Jambi mulai naik November')
s4.hapus(lambda b: (g := geom(b)) and g[1] == 1938528 and g[0] >= 8615477)
s4.tambah(deret(4, 8615477, 1938528, [(f"{f0(D['banjir'])} banjir sejak {D['th0']}", 'merah', 'tetes'), (f"puncak Januari, {str(BJ['bulan'][0]).replace('.', ',')}/tahun", 'merah', 'kalender')], 11450000, h=155448))
# tabel kabupaten berstatus Waspada
s4.T('Wilayah hilir berisiko', 'Kabupaten/kota berstatus Waspada, 26–28 Okt')
s4.hapus(lambda b: (g := geom(b)) and 2840000 < g[1] < 5200000 and g[0] < 7900000)
rows = sorted(BJ['kab'].items(), key=lambda x: (-len({n for n, _ in x[1]['banjir'] + x[1]['longsor']}), -x[1]['h3']))
lama = [teks(b) for b in s4.cari(Slide.di(6763840, 2386584, True))][0]; s4.T(lama, str(len(rows)), at=(6763840, 2386584))
XN, XC, XH, XD, XA = 886968, 2650000, 4900000, 5800000, 6400800
KOLOM = [(676656, 2600000, 'KAB/KOTA'), (XC, 4850000, 'KECAMATAN HUJAN TERBESAR'), (XH, 5750000, 'HUJAN 3 HARI'), (XD, 6350000, 'DIBI*'), (XA, 7735824, 'ANCAMAN')]
o = ''.join(tx(x0, 2852928, x1 - x0, 164592, [(t, 600, True, '6B7280')], al='ctr', spc=100) for x0, x1, t in KOLOM)   # judul kolom rata tengah
o += f'<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="9400" name="L"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr><a:xfrm><a:off x="676656" y="3035808"/><a:ext cx="7059168" cy="0"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="9525"><a:solidFill><a:srgbClr val="1A1A1A"/></a:solidFill></a:ln></p:spPr></p:cxnSp>'
y, RH = 3063240, 171000
for no, (k, v) in enumerate(rows, 1):
    nw = len({n for n, _ in v['banjir'] + v['longsor']}); top = [n for n, _ in sorted(v['banjir'] + v['longsor'], key=lambda x: -x[1])]
    top = list(dict.fromkeys(top))[:3]
    o += bentuk(676656, y + (RH - 128016) / 2, 128016, 128016, '051C2C', 'ellipse') + tx(676656, y + (RH - 128016) / 2, 128016, 128016, [(str(no), 480, True, 'FFFFFF')], al='ctr')
    o += tx(XN, y, 1700000, RH, [(k, 700, True, '1A1A1A')])
    o += tx(XC, y, 2200000, RH, [(', '.join(top), 680, False, '051C2C')]) + tx(XH, y, 850000, RH, [(f"{f0(v['h3'])} mm", 700, True, '2F86D1')], al='ctr')
    o += tx(XD, y, 550000, RH, [(f0(v['dibi_banjir'] + v['dibi_longsor']), 680, True, '051C2C')], al='ctr')
    ch = ([('banjir', 'biru', 'tetes')] if v['banjir'] else []) + ([('longsor', 'oranye', 'awas')] if v['longsor'] else [])
    lebar = sum(pil(4, 0, 0, t_, g_, i_, h=128016)[1] for t_, g_, i_ in ch) + 45720 * (len(ch) - 1)
    o += deret(4, XA + (7735824 - XA - lebar) / 2, y + (RH - 128016) / 2, ch, 7800000, h=128016)
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
s4.T('Kesiapan BPBD Jatim', 'Jumlah kejadian di Jambi (DIBI BNPB)')
ganti_ikon(s4, 4, 8183880, 2468880, 'jt-ik-kalender-putih.png')
KB = BJ['kab']; tk = sorted(KB, key=lambda k: -KB[k]['dibi_banjir'])
tl = sorted(KB, key=lambda k: -KB[k]['dibi_longsor'])
SAR = [(f0(D['banjir']), f"banjir {D['th0']}–{D['th1']}", 'jt-ik-air-navy.png'), (f0(D['longsor']), f"longsor {D['th0']}–{D['th1']}", 'lpg-ik-awas-navy.png'),
       (f0(D['v'][D['th1']]), f"banjir tahun {D['th1']}", 'jt-ik-kalender-navy.png'), (f0(D['v_longsor'][D['th1']]), f"longsor tahun {D['th1']}", 'jt-ik-kalender-navy.png'),
       (f0(KB[tk[0]]['dibi_banjir']), f'banjir di {tk[0]}', 'lpg-ik-pin-navy.png'), (f0(KB[tl[0]]['dibi_longsor']), f'longsor di {tl[0]}', 'lpg-ik-pin-navy.png')]
for (xv, yv), (v, l, ikn) in zip(((8622792, 2990088), (10360152, 2990088), (8622792, 3685032), (10360152, 3685032), (8622792, 4379976), (10360152, 4379976)), SAR):
    for yy, isi_ in ((yv, v), (yv + 274320, l)):
        lama = [teks(b) for b in s4.cari(Slide.di(xv, yy, True))][0]; s4.T(lama, isi_, at=(xv, yy))
    ganti_ikon(s4, 4, xv - 329184, yv + 146304, ikn)
kj = BJ['kab'].get('Kota Jambi')
for (j0, i0), (j, i) in zip((('Bersihkan alur sungai', 'Material dan kayu terbakar di alur hilir Arjuno, Argopuro, Ijen, Tengger'),
                             ('Pengamat dan sirene', 'Pengamat hujan di hulu; sirene banjir bandang Bumiaji, Prigen, Panti'),
                             ('Jalur evakuasi desa hilir', 'Peta evakuasi dan titik kumpul desa di bawah kawasan terbakar'),
                             ('Siaga lahar Semeru', 'Patuhi larangan 13 km Besuk Kobokan saat hujan di puncak')),
                            (('Siaga longsor dan banjir bandang', 'Kerinci, Sungai Penuh, dan Merangin di pegunungan: pasang pengamat hujan dan sirene peringatan di desa rawan'),
                             ('Pantau muka air Sungai Batanghari', 'Kota Jambi tidak berstatus Waspada 26–28 Okt; luapan dari hulu Batanghari tetap mengalir ke Muaro Jambi dan Kota Jambi') if not kj else ('Pantau muka air Sungai Batanghari', f"Seluruh {kj['n_kec']} kecamatan Kota Jambi Waspada banjir; luapan dari hulu juga mengalir ke Muaro Jambi dan Batanghari") if len(kj['banjir']) == kj['n_kec'] else ('Pantau muka air Sungai Batanghari', f"{len(kj['banjir'])} dari {kj['n_kec']} kecamatan Kota Jambi Waspada banjir; luapan dari hulu juga mengalir ke Muaro Jambi dan Batanghari"),
                             ('Gambut tetap dibasahi', 'DIBUANG'),
                             ('Siapkan perahu dan jalur evakuasi', 'Tetapkan titik kumpul dan jalur evakuasi untuk desa di tepi sungai: Batanghari, Tebo, Bungo, dan Merangin'))):
    s4.T(j0, j); s4.T(i0, i)
# kolom ketiga (Gambut tetap dibasahi) dibuang atas permintaan pemilik; tiga kolom sisa diregang selebar pita
P0, P4 = 694944, 2736927; P3 = P4 * 4 // 3
s4.hapus(lambda b: (g := geom(b)) and 5500000 < g[1] < 6200000 and (P0 + 2 * P4 - 100000 <= g[0] < P0 + 3 * P4 - 100000))
def regang(b):
    g = GEO.search(b); x, w = int(g.group(1)), int(g.group(4))
    k = (x - P0 + 100000) // P4; dx = x - (P0 + k * P4); k2 = k - 1 if k == 3 else k
    nw = w + (P3 - P4) if w == 2137027 else w
    return b[:g.start()] + f'<a:off x="{P0 + k2 * P3 + dx}" y="{g.group(2)}"/>{g.group(3)}<a:ext cx="{nw}" cy="{g.group(5)}"/>' + b[g.end():]
s4.ubah(lambda b: (g := geom(b)) and 5500000 < g[1] < 6200000 and g[0] >= P0 - 100000, regang)


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


kartu_ulang(S[1], 5940399)


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
        kecil = (b.startswith('<p:pic>') and 'name="Foto"' not in b) or 'prst="ellipse"' in b or cy < 260000
        if kecil: ny, ncy = round(peta(y + cy / 2) - cy / 2), cy
        else: ny, ncy = round(peta(y)), round(cy * k)
        return b[:gg.start()] + f'<a:off x="{x}" y="{ny}"/>{gg.group(3)}<a:ext cx="{cx}" cy="{ncy}"/>' + b[gg.end():]
    s.ubah(lambda b: GEO.search(b) is not None, fn)
    return baris_, garis_y


for i, sz in ((1, 2000), (4, 2000)):
    print('slide', i, 'judul/garis', kepala(S[i], sz, i != 4))
NS = A['nasional']; pc = lambda a, b_: round(a / b_ * 100)
SUB = {1: [(f"Peringkat ke-{NS['luas']} nasional", 1000, True, 'C8102E'), (f" untuk luas terbakar dan ke-{NS['belum']} untuk belum padam, {HR} (dari {NS['n_prov']} provinsi); ke-{NS['hot_bersih']} untuk titik panas", 1000, False, '2E3440')]}
for i, runs in SUB.items():
    S[i].tambah(tx(548640, 690000, 8200000, 190000, runs, an='t'))

# ------------------------------------------------------------------ tulis + cek
for i in (1, 4):
    for blk in S[i].blok():
        g = geom(blk)
        if g and 1800000 < g[1] < 2050000 and g[3] <= 160000 and 'b="1"' not in blk and len(teks(blk)) > 24:
            raise SystemExit(f'slide {i}: label kartu terlalu panjang, melipat dan menabrak bingkai: {teks(blk)!r}')
for i in (1, 4):
    tt = re.sub(r'<[^>]+>', '', S[i].s)
    assert '·' not in tt and '—' not in tt, f'titik tengah / em dash di slide {i}'
    for x in ('32,50', '72,50', '105,00', '±', 'DIBUANG', 'Jawa Timur', 'Jatim', 'Malang', 'Arjuno', 'Semeru'):
        assert x not in tt, f'{x!r} tersisa di slide {i}'
    F[f'ppt/slides/slide{i}.xml'] = S[i].s.encode(); F[f'ppt/slides/_rels/slide{i}.xml.rels'] = RELS[i].encode()
for n in ('ppt/media/jt-jatim5.png', 'ppt/media/jt-arjuno4.png'): F.pop(n, None)
# slide 2-3 dibuang dari presentasi beserta berkasnya
PR = F['ppt/_rels/presentation.xml.rels'].decode(); PX = F['ppt/presentation.xml'].decode(); CT = F['[Content_Types].xml'].decode()
for i in (2, 3):
    rid = re.search(rf'Id="(\w+)"[^>]*Target="slides/slide{i}.xml"', PR).group(1)
    PR = re.sub(rf'<Relationship [^>]*Target="slides/slide{i}.xml"/>', '', PR); PX = re.sub(rf'<p:sldId [^>]*r:id="{rid}"/>', '', PX)
    CT = CT.replace(f'<Override PartName="/ppt/slides/slide{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>', '')
    for n in (f'ppt/slides/slide{i}.xml', f'ppt/slides/_rels/slide{i}.xml.rels'): F.pop(n)
F['ppt/_rels/presentation.xml.rels'] = PR.encode(); F['ppt/presentation.xml'] = PX.encode(); F['[Content_Types].xml'] = CT.encode()
assert 'slide2.xml' not in PR + CT and 'slide3.xml' not in PR + CT
zo = zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED)
for n in ['[Content_Types].xml'] + [n for n in F if n != '[Content_Types].xml']: zo.writestr(n, F[n])
zo.close(); print('ok', OUT)
