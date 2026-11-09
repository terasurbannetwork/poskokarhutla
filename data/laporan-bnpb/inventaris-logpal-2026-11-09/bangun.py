"""Sisip slide 8-9 ke deck 9 Nov (tiru slide 3 dan 4) dan bangun file lampiran terpisah.

Jalankan: python bangun.py. Keluaran ke data/kajian-bnpb/keluaran/final. rute.py memperbarui rute.json (perlu internet).
"""
import copy, io, json, re, sys, os, tempfile
from collections import Counter
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.dml import MSO_LINE
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.opc.constants import RELATIONSHIP_TYPE as RT
from pptx.util import Pt, Emu
from PIL import Image, ImageDraw

SP = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(SP, '..', '..', '..'))
FINAL = os.path.join(AKAR, 'data', 'kajian-bnpb', 'keluaran', 'final')
ASAL = os.path.join(FINAL, 'Situasi Banjir dan Bencana Lain 091126 prakiraan 9 Nov bersih.pptx')
KELUAR = os.path.join(FINAL, 'Situasi Banjir dan Bencana Lain 091126 prakiraan 9 Nov bersih + inventaris.pptx')
LAMPIRAN = os.path.join(FINAL, 'Lampiran Inventaris LogPal di Luar Daerah Bencana 091126.pptx')
GEO = os.path.join(AKAR, 'public', 'geo')
NAVY, ORANYE, HITAM, ABU, BIRU_MUDA, GARIS = '051C2C', 'D9600B', '1A1A1A', '6B7280', 'DCEBF8', 'D8DEE6'

# ---------- data ----------
PK = {'S': (80, 90, 30, 60, 80, 30), 'B': (120, 120, 45, 80, 100, 60), 'K': (120, 120, 30, 60, 80, 45)}
QTY = {'TP': 4, 'TK': 5, 'LS': 24}
KOL = ['Rescue', 'Pickup', 'Truk', 'Tangki', 'Dapur', 'Trail', 'Perahu', 'Lampu', 'Tenda', 'MK', 'Selimut', 'Terpal', 'Makanan', 'FK']
PROV = ['Jatim', 'Jateng', 'Jabar', 'NTT', 'Lampung', 'Sulteng', 'Banten']
NM_PROV = {'Jatim': 'Jawa Timur', 'Jateng': 'Jawa Tengah', 'Jabar': 'Jawa Barat', 'NTT': 'Nusa Tenggara Timur', 'Lampung': 'Lampung', 'Sulteng': 'Sulawesi Tengah', 'Banten': 'Banten'}


def tambah(c, a):
    if a == 'TP' or a == 'TK': c['Tenda'] += QTY[a]
    elif a == 'LS': c['Lampu'] += QTY[a]
    else: c[a] += 1


R = {}
for l in open(f'{SP}/bantuan.txt', encoding='utf8'):
    if l[0] == '#' or not l.strip(): continue
    p, u, b, a25, a26, k = l.strip().split('|')
    k = PK[k] if k in PK else tuple(int(x) for x in k.split(','))
    c = Counter()
    for a in ([] if a25 == '-' else a25.split(';')) + ([] if a26 == '-' else a26.split(';')): tambah(c, a)
    c['Selimut'] += k[0]; c['MK'] += k[1] + k[2]; c['Terpal'] += k[3]; c['Makanan'] += k[4]; c['FK'] += k[5]
    if u == 'Prov. Lampung': c['Terpal'] += 80; c['Lampu'] += 72  # 2025: terpal 80, lentera 72
    R[u] = dict(p=p, u=u, b=int(b), c=c)
assert len(R) == 164

KEJ = [('Bencana lain', [('Kab. Ende', 'Gempa bumi'), ('Kab. Manggarai', 'Gempa bumi'), ('Kab. Manggarai Barat', 'Gempa bumi'),
                         ('Kab. Manggarai Timur', 'Gempa bumi'), ('Kab. Nagekeo', 'Gempa bumi'), ('Kab. Ngada', 'Gempa bumi'),
                         ('Kab. Sikka', 'Gempa bumi'), ('Kab. Sumba Timur', 'Gempa bumi'), ('Kab. Bogor', 'Cuaca ekstrem'),
                         ('Kab. Ciamis', 'Cuaca ekstrem'), ('Kab. Jember', 'Cuaca ekstrem'), ('Kab. Kendal', 'Kekeringan'),
                         ('Kab. Pekalongan', 'Kekeringan')]),
       ('Sekitar gunung api Siaga', [('Kab. Lampung Selatan', 'Gn. Anak Krakatau'), ('Kab. Boyolali', 'Gn. Merapi'), ('Kab. Klaten', 'Gn. Merapi'),
                                     ('Kab. Magelang', 'Gn. Merapi'), ('Kab. Lumajang', 'Gn. Semeru'), ('Kab. Malang', 'Gn. Semeru')])]
DALAM = {u for _, b in KEJ for u, _ in b}
assert len(DALAM) == 19 and DALAM <= set(R)
SIAGA = {'Kab. Garut', 'Kab. Tasikmalaya', 'Kab. Poso'}
RUTE = json.load(open(f'{SP}/rute.json', encoding='utf8'))


def jml(us):
    c = Counter()
    for u in us: c.update(R[u]['c'])
    return c


def f(n): return f'{n:,}'.replace(',', '.') if n else '–'


# ---------- alat gambar ----------
def E(x): return Emu(int(round(x * 12700)))


def warna(h): return RGBColor.from_string(h)


def tx(s, l, t, w, h, runs, sz=9, b=False, col=HITAM, al='l', wrap=True):
    x = s.shapes.add_textbox(E(l), E(t), E(w), E(h)); tf = x.text_frame
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.word_wrap = wrap; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]; p.alignment = {'l': PP_ALIGN.LEFT, 'c': PP_ALIGN.CENTER, 'r': PP_ALIGN.RIGHT}[al]
    if isinstance(runs, str): runs = [(runs, {})]
    for teks, o in runs:
        r = p.add_run(); r.text = teks; r.font.name = 'Roboto'; r.font.size = Pt(o.get('sz', sz)); r.font.bold = o.get('b', b)
        r.font.color.rgb = warna(o.get('col', col)); r._r.get_or_add_rPr().set('lang', 'id-ID')
    return x


def kotak(s, l, t, w, h, isi, bentuk=MSO_SHAPE.RECTANGLE, ln=None, r=None):
    x = s.shapes.add_shape(bentuk, E(l), E(t), E(w), E(h))
    x.fill.solid(); x.fill.fore_color.rgb = warna(isi)
    if ln: x.line.color.rgb = warna(ln); x.line.width = Pt(.75)
    else: x.line.fill.background()
    x.shadow.inherit = False
    if r is not None: x.adjustments[0] = r
    return x


def garis(s, x1, y1, x2, y2, col=GARIS, w=.5, putus=False):
    c = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, E(x1), E(y1), E(x2), E(y2))
    c.line.color.rgb = warna(col); c.line.width = Pt(w)
    if putus: c.line.dash_style = MSO_LINE.DASH
    return c


CHROME_ID = None


def salin_kerangka(prs, src, tab_lama=True):
    """Slide baru: kerangka (judul, logo, kaki, tab) disalin dari slide src."""
    s = prs.slides.add_slide(src.slide_layout)
    for ph in list(s.placeholders): ph._element.getparent().remove(ph._element)
    for x in src.shapes:
        tp = x.top / 12700
        if not (tp < 95.5 or tp >= 507): continue
        if not tab_lama and tp < 16.5 and not (x.shape_type == 9): continue
        if not tab_lama and x.name.startswith('Rectangle') and tp < 18: continue
        el = copy.deepcopy(x._element)
        for bl in el.iter('{http://schemas.openxmlformats.org/drawingml/2006/main}blip'):
            k = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed'
            bl.set(k, s.part.relate_to(src.part.related_part(bl.get(k)), RT.IMAGE))
        s.shapes._spTree.append(el)
    return s


def cari(s, awal):
    for x in s.shapes:
        if x.has_text_frame and x.text_frame.text.strip().startswith(awal): return x
    raise KeyError(awal)


def set_judul(s, bagian, sz):
    x = next(y for y in s.shapes if y.has_text_frame and 20 < y.top / 12700 < 30)
    p = x.text_frame.paragraphs[0]
    r0 = p.runs[0]._r
    for r in p.runs[1:]: r._r.getparent().remove(r._r)
    induk = r0.getparent(); pos = list(induk).index(r0)
    induk.remove(r0)
    for i, (t, hi) in enumerate(bagian):
        r = copy.deepcopy(r0); r.find('{http://schemas.openxmlformats.org/drawingml/2006/main}t').text = t
        rp = r.find('{http://schemas.openxmlformats.org/drawingml/2006/main}rPr'); rp.set('sz', str(int(sz * 100)))
        rp.find('{http://schemas.openxmlformats.org/drawingml/2006/main}solidFill')[0].set('val', ORANYE if hi else HITAM)
        induk.insert(pos + i, r)


def set_teks(x, t):
    p = x.text_frame.paragraphs[0]
    p.runs[0].text = t
    for r in p.runs[1:]: r._r.getparent().remove(r._r)


def set_kaki(s, sumber, hal):
    set_teks(cari(s, 'Sumber'), sumber)
    for x in s.shapes:
        if x.has_text_frame and x.left / 12700 > 870 and x.top / 12700 > 507: set_teks(x, str(hal))


# ---------- tabel gaya slide 3 ----------
LBR = [42, 40, 34, 50, 40, 36, 44, 50, 36, 66, 44, 40, 48, 46.6]
KEPALA = ['RESCUE', 'PICKUP', 'TRUK', 'TANGKI AIR', 'DAPUR', 'TRAIL', 'PERAHU', 'LAMPU', 'TENDA', 'MATRAS, KASUR', 'SELIMUT', 'TERPAL', 'MAKANAN', 'FAMILY KIT']
X0 = 300.2


def kepala(s, kiri):
    kotak(s, 43.2, 102.2, 873.4, 30.2, NAVY, MSO_SHAPE.ROUNDED_RECTANGLE, r=.08)
    for t, l, w in kiri: tx(s, l, 102.2, w, 30.2, t, 7.5, True, 'FFFFFF', 'c')
    tx(s, X0, 103.7, 336, 13, 'PERALATAN UTAMA', 7.5, True, 'FFFFFF', 'c')
    tx(s, X0 + 336, 103.7, 280.6, 13, 'LOGISTIK PENGUNGSIAN', 7.5, True, 'FFFFFF', 'c')
    garis(s, X0 + 4, 117.4, X0 + 332, 117.4, '9AA5B1', .5); garis(s, X0 + 340, 117.4, 913, 117.4, '9AA5B1', .5)
    x = X0
    for t, w in zip(KEPALA, LBR):
        tx(s, x, 118.1, w, 13.7, t, 7, True, 'FFFFFF', 'c', wrap=False); x += w


def angka(s, y, h, c, sz, b=False, col=HITAM):
    x = X0
    for k, w in zip(KOL, LBR):
        tx(s, x, y, w, h, f(c[k]), sz, b, col, 'c', wrap=False); x += w


def baris_total(s, y, h, label, c):
    kotak(s, 43.2, y, 873.4, h, NAVY, MSO_SHAPE.ROUNDED_RECTANGLE, r=.2)
    tx(s, 51.1, y, 246, h, label, 10.5, True, 'FFFFFF'); angka(s, y, h, c, 10, True, 'FFFFFF')


def nama(u): return u + ('*' if R[u]['b'] else '')


# ---------- peta ----------
def poligon(g):
    return [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']


PROVG = json.load(open(f'{GEO}/provinsi.json', encoding='utf8'))
KAB = {}
for k in ('18', '32', '33', '35', '53'):
    KAB[k] = {x['properties']['kab']: x['geometry'] for x in json.load(open(f'{GEO}/kabupaten/{k}.json', encoding='utf8'))['features']}
KODE = {'NTT': '53', 'Jabar': '32', 'Jateng': '33', 'Jatim': '35', 'Lampung': '18'}


def peta(nama_b, lonr, latr, wpt, hpt, kk):
    Z = 8  # supersampling
    W, H = int(wpt * 4 * Z / 2), int(hpt * 4 * Z / 2)
    im = Image.new('RGB', (W, H), 'white'); d = ImageDraw.Draw(im)
    def pt(c): return [((x - lonr[0]) / (lonr[1] - lonr[0]) * W, (latr[1] - y) / (latr[1] - latr[0]) * H) for x, y in c]
    for fe in PROVG['features']:
        for pl in poligon(fe['geometry']):
            d.polygon(pt(pl[0]), fill='#E3E7EC', outline='#FFFFFF')
    for k, n in kk:
        for pl in poligon(KAB[k][n]):
            d.polygon(pt(pl[0]), fill='#F4BE96', outline='#FFFFFF')
    fn = os.path.join(tempfile.gettempdir(), nama_b + '.png'); im.resize((W // 2, H // 2), Image.LANCZOS).save(fn, optimize=True)
    return fn


P1 = dict(l=43.2, t=101.0, w=418.0, h=190.0, lon0=104.6, lat0=-4.6, sk=40.19)
P2 = dict(l=43.2, t=295.0, w=418.0, h=168.0, lon0=118.0, lat0=-7.75, sk=63.33)


def xy(P, lat, lon): return P['l'] + (lon - P['lon0']) * P['sk'], P['t'] + (P['lat0'] - lat) * P['sk']


def lr(P): return (P['lon0'], P['lon0'] + P['w'] / P['sk']), (P['lat0'] - P['h'] / P['sk'], P['lat0'])


# ---------- deck utama ----------
prs = Presentation(ASAL)
s7 = prs.slides[6]; s4 = prs.slides[3]
ikon = {}
for x in s4.shapes:
    if x.shape_type == 13:
        k = (round(x.left / 12700), round(x.top / 12700))
        if k == (47, 160): ikon['pin'] = x.image.blob
        if k == (47, 287): ikon['air'] = x.image.blob
        if k == (51, 479): ikon['kpi_d'] = x.image.blob
        if k == (262, 479): ikon['kpi_l'] = x.image.blob
assert len(ikon) == 4, ikon.keys()

# Slide 8: inventaris
a = salin_kerangka(prs, s7)
set_judul(a, [('Daftar ', 0), ('Inventaris LogPal', 1), (' di 19 Kab/Kota Bencana Lain dan Gunung Api Siaga', 0)], 20)
set_kaki(a, 'Sumber: Bantuan BPBD 2025 dan 2026 dijumlahkan; Koordalops BNPB; PVMBG, 9 Nov 2026. Belum usul = belum mengusulkan di E-Prologpal', 8)
kepala(a, [('KEJADIAN DAN KAB/KOTA', 43.2, 257)])
IKON7 = {x.image.sha1[:8]: x.image.blob for x in s7.shapes if x.shape_type == 13}
GAYA = {'Gempa bumi': ('5B7A99', 'E3EAF1', 'd9c56e4c'), 'Cuaca ekstrem': ('1B5A93', 'DCEBF8', 'ee04c7f8'), 'Kekeringan': ('B08A3E', 'F4ECDC', '61b9ab2c'),
        'Gn. Anak Krakatau': ('8F3F07', 'FBE7D6', '9dc62c90'), 'Gn. Merapi': ('8F3F07', 'FBE7D6', '9dc62c90'), 'Gn. Semeru': ('8F3F07', 'FBE7D6', '9dc62c90')}
kelompok = {}
for _, isi in KEJ:
    for u, kj in isi: kelompok.setdefault(kj, []).append(u)
y = 132.5; RH = 13.4; BH = 15.5; TOTAL = Counter()
for kj, us in kelompok.items():
    ov, isi_, ik = GAYA[kj]; c = jml(us); TOTAL.update(c)
    kotak(a, 43.2, y, 873.4, BH, isi_)
    kotak(a, 48, y + 2, 11.5, 11.5, ov, MSO_SHAPE.OVAL)
    a.shapes.add_picture(io.BytesIO(IKON7[ik]), E(50.15), E(y + 4.15), E(7.2), E(7.2))
    ket = f'{len(us)} kab/kota' + (', Siaga' if kj.startswith('Gn.') else '')
    tx(a, 63, y, 234, BH, [(kj, {'sz': 9.5, 'b': True}), ('   ' + ket, {'sz': 7.5, 'b': False, 'col': '2E3440'})], wrap=False)
    angka(a, y, BH, c, 9.5, True); y += BH
    for n, u in enumerate(us):
        tx(a, 63, y, 160, RH, u.replace('Kab. ', ''), 9.2, False, wrap=False)
        if R[u]['b']:
            kotak(a, 240, y + 2, 52, RH - 4, 'FBE7D6', MSO_SHAPE.ROUNDED_RECTANGLE, r=.5)
            tx(a, 240, y + 2, 52, RH - 4, 'Belum usul', 7, True, 'C25E12', 'c', wrap=False)
        angka(a, y, RH, R[u]['c'], 9.2); y += RH
        if n < len(us) - 1: garis(a, 63, y, 916.6, y)
baris_total(a, y + .3, 500 - y - .3, 'Total', TOTAL)
print('slide8 y akhir', y)

# Slide 9: pengantaran
b = salin_kerangka(prs, s7)
maks = max(r['jam'] for r in RUTE); nd = sum(1 for r in RUTE if not r['port']); nl = len(RUTE) - nd
set_judul(b, [('19', 1), ('\u00a0kab/kota bencana lain dan sekitar gunung api Siaga dapat dilayani dari gudang BPBD provinsi dengan waktu pengantaran bantuan paling lama', 0), (f' {maks}', 1), ('\u00a0jam', 0)], 16)
set_kaki(b, 'Sumber: Perkiraan dari jarak dan kecepatan rata-rata tiap moda; belum dikonfirmasi operator angkutan', 9)
kk1 = [(KODE[r['prov']], r['nama']) for r in RUTE if r['prov'] != 'NTT']; kk2 = [(KODE[r['prov']], r['nama']) for r in RUTE if r['prov'] == 'NTT']
b.shapes.add_picture(peta('peta1', *lr(P1), P1['w'], P1['h'], kk1), E(P1['l']), E(P1['t']), E(P1['w']), E(P1['h']))
b.shapes.add_picture(peta('peta2', *lr(P2), P2['w'], P2['h'], kk2), E(P2['l']), E(P2['t']), E(P2['w']), E(P2['h']))
garis(b, 43.2, 293, 461.2, 293, GARIS, .5)
RT_ = {r['nama']: r for r in RUTE}
# jalur
for r in RUTE:
    P = P2 if r['prov'] == 'NTT' else P1
    t = xy(P, r['lat'], r['lon']); g = xy(P, r['glat'], r['glon'])
    if r['port']:
        pp = {'Ende': (-8.85, 121.67), 'Aimere': (-8.842, 120.854), 'Waingapu': (-9.65, 120.26)}[r['port']]
        q = xy(P, *pp); garis(b, g[0], g[1], q[0], q[1], '2F76B9', 1, True)
        if abs(q[0] - t[0]) + abs(q[1] - t[1]) > 2: garis(b, q[0], q[1], t[0], t[1], ORANYE, 1)
    else:
        garis(b, g[0], g[1], t[0], t[1], ORANYE, 1)
# pil label: nama -> (x, y)
PIL = {'Lampung Selatan': (46, 106), 'Bogor': (172, 106), 'Pekalongan': (245, 106), 'Kendal': (352, 106), 'Boyolali': (378, 125),
       'Ciamis': (110, 259), 'Magelang': (187, 259), 'Klaten': (272, 259), 'Malang': (350, 259), 'Lumajang': (296, 275.5), 'Jember': (388, 275.5),
       'Manggarai Barat': (50, 299), 'Manggarai Timur': (168, 299), 'Ngada': (283, 299), 'Sikka': (364, 299),
       'Manggarai': (94, 317), 'Nagekeo': (205, 317), 'Ende': (300, 317), 'Sumba Timur': (58, 395)}
for n, (px, py) in PIL.items():
    r = RT_[n]; P = P2 if r['prov'] == 'NTT' else P1
    laut = bool(r['port']); jam = f"  {r['jam']} jam"
    w = 20 + len(n) * 4.75 + len(jam) * 3.75
    t = xy(P, r['lat'], r['lon'])
    garis(b, px + w / 2, py + 7.9, t[0], t[1], '6B7280', .5)
    kotak(b, px, py, w, 15.84, BIRU_MUDA if laut else 'FBE7D6', MSO_SHAPE.ROUNDED_RECTANGLE, r=.5)
    kotak(b, px + 2.16, py + 2.16, 11.52, 11.52, '68A8E0' if laut else 'E8894A', MSO_SHAPE.OVAL)
    b.shapes.add_picture(io.BytesIO(ikon['air' if laut else 'pin']), E(px + 3.9), E(py + 3.9), E(8), E(8))
    tx(b, px + 17, py, w - 18, 15.84, [(n, {'sz': 8.5, 'b': True}), (jam, {'sz': 7.5, 'b': True, 'col': '1D5C94' if laut else 'C25E12'})], wrap=False)
    kotak(b, t[0] - 2.5, t[1] - 2.5, 5, 5, 'FFFFFF', MSO_SHAPE.OVAL, ln=HITAM)
# gudang
for lb, P, lat, lon, px, py in [('BPBD Lampung', P1, -5.40, 105.27, 46, 150), ('BPBD Jabar', P1, -6.93, 107.63, 132, 142), ('BPBD Jateng', P1, -7.00, 110.42, 252, 142), ('BPBD Jatim', P1, -7.33, 112.73, 390, 152), ('BPBD NTT', P2, -10.16, 123.60, 362, 400)]:
    t = xy(P, lat, lon); w = 12 + len(lb) * 4.5
    garis(b, px + w / 2, py + 6.5, t[0], t[1], NAVY, .75)
    kotak(b, px, py, w, 13, NAVY, MSO_SHAPE.ROUNDED_RECTANGLE, r=.3); tx(b, px, py, w, 13, lb, 7.5, True, 'FFFFFF', 'c', wrap=False)
    kotak(b, t[0] - 3.5, t[1] - 3.5, 7, 7, 'C8102E', MSO_SHAPE.OVAL, ln='FFFFFF')
# skala, utara, legenda
for P, xx, yy in [(P1, 50, 277), (P2, 50, 460 - 16)]:
    pass
for P, xx, yy in [(P1, 50, 281), (P2, 206, 452)]:
    kotak(b, xx, yy - 8, 6, 8, HITAM, MSO_SHAPE.ISOSCELES_TRIANGLE); tx(b, xx - 3, yy, 12, 8, 'U', 7, True, HITAM, 'c')
    L = 100 / 111 * P['sk']; garis(b, xx + 14, yy - 2, xx + 14 + L, yy - 2, HITAM, 1); tx(b, xx + 14, yy - 11, L, 8, '100 km', 7, True, HITAM, 'c', wrap=False)
garis(b, 50, 456, 72, 456, ORANYE, 1.25); tx(b, 76, 450, 44, 12, 'Jalur darat', 7.5, False, HITAM, wrap=False)
garis(b, 124, 456, 146, 456, '2F76B9', 1.25, True); tx(b, 150, 450, 44, 12, 'Jalur laut', 7.5, False, HITAM, wrap=False)
# kartu
for l, isi, ov, ik, n, ket in [(43.2, 'FBE7D6', 'E8894A', 'kpi_d', nd, 'Darat'), (254.2, BIRU_MUDA, '68A8E0', 'kpi_l', nl, 'Laut')]:
    kotak(b, l, 470, 205.9, 30, isi, MSO_SHAPE.ROUNDED_RECTANGLE, r=.15); kotak(b, l + 5, 476, 18, 18, ov, MSO_SHAPE.OVAL)
    b.shapes.add_picture(io.BytesIO(ikon[ik]), E(l + 7.9), E(479.2), E(11.5), E(11.5))
    tx(b, l + 28, 473, 176, 14, f'{n} kab/kota', 12, True, NAVY); tx(b, l + 28, 487, 176, 10, ket, 7, False)
# tabel kanan
kotak(b, 471.6, 101, 445, 16.6, NAVY, MSO_SHAPE.ROUNDED_RECTANGLE, r=.2)
TK = [('KAB/KOTA', 479.5, 112), ('ASAL GUDANG', 592, 104), ('MODA', 698, 36), ('WAKTU', 736, 42), ('TURUN DI', 780, 134)]
for t, l, w in TK: tx(b, l, 101, w, 16.6, t, 7.5, True, 'FFFFFF', 'c')
y = 117.6; B = 15.3; RH = 16.08
for pv in ['NTT', 'Jabar', 'Jateng', 'Jatim', 'Lampung']:
    kotak(b, 471.6, y, 445, B, BIRU_MUDA); tx(b, 479.5, y, 424, B, NM_PROV[pv], 9.2, True); y += B
    for r in [q for q in RUTE if q['prov'] == pv]:
        nm = 'Kab. ' + r['nama']
        tx(b, 479.5, y, 112, RH, r['nama'] + ('*' if R[nm]['b'] else ''), 9.2, True, wrap=False)
        for t, (_, l, w) in zip([r['gudang'], 'Laut' if r['port'] else 'Darat', f"{r['jam']} jam", f"Pelabuhan {r['port']}" if r['port'] else 'Langsung ke lokasi'], TK[1:]):
            tx(b, l, y, w, RH, t, 8.6, False, '2E3440', 'c', wrap=False)
        y += RH; garis(b, 471.6, y, 916.6, y)
print('slide9 y akhir', y, 'maks', maks, 'darat', nd, 'laut', nl)
set_kaki(b, 'Sumber: Perkiraan dari jarak dan kecepatan rata-rata tiap moda; belum dikonfirmasi operator angkutan. * Belum mengusulkan di E-Prologpal', 9)
prs.save(KELUAR)

# ---------- lampiran ----------
L = Presentation(ASAL)
s7 = L.slides[6]
HAL = []
SISA = {p: sorted([u for u in R if R[u]['p'] == p and u not in DALAM], key=lambda u: (not u.startswith('Prov'),)) for p in PROV}
assert sum(map(len, SISA.values())) == 145
TOT = jml([u for p in PROV for u in SISA[p]]); NB = sum(R[u]['b'] for p in PROV for u in SISA[p])
TABS = ['Rekap'] + [NM_PROV[p] if p != 'NTT' else 'NTT' for p in PROV]


def tab(s, aktif):
    W = 873.6 / 8
    for i, t in enumerate(TABS):
        o = aktif == i
        tx(s, 43.2 + i * W, 2, W, 14, [(f'{i + 1:02d}', {'col': ORANYE if o else ABU, 'b': True}), ('  ' + t, {'col': NAVY if o else ABU, 'b': o})], 8, al='c', wrap=False)
    kotak(s, 43.2 + aktif * W + 5, 15.75, W - 10, 2.25, ORANYE)


SB = 'Sumber: Bantuan BPBD 2025 dan 2026 dijumlahkan; rekap per 9 Nov 2026. * Belum mengusulkan di E-Prologpal'
hal = 1
r0 = salin_kerangka(L, s7, tab_lama=False); tab(r0, 0)
set_judul(r0, [('145 BPBD', 1), (' di luar daerah bencana lain dan gunung api Siaga; ', 0), (f'{NB} BPBD', 1), (' belum mengusulkan di E-Prologpal', 0)], 20)
set_kaki(r0, 'Sumber: Bantuan BPBD 2025 dan 2026 dijumlahkan; rekap per 9 Nov 2026', hal)
kepala(r0, [('PROVINSI', 43.2, 148), ('BPBD', 191, 50), ('BELUM USUL', 241, 58)])
y = 132.5; RH = (473.8 - y) / 7
for i, p in enumerate(PROV):
    us = SISA[p]; c = jml(us)
    tx(r0, 51.1, y, 140, RH, NM_PROV[p], 10.5, True); tx(r0, 191, y, 50, RH, str(len(us)), 10.5, False, HITAM, 'c'); tx(r0, 241, y, 58, RH, str(sum(R[u]['b'] for u in us)), 10.5, False, HITAM, 'c')
    angka(r0, y, RH, c, 10.5); y += RH
    if i < 6: garis(r0, 43.2, y, 916.6, y)
kotak(r0, 43.2, 473.8, 873.4, 25.9, NAVY, MSO_SHAPE.ROUNDED_RECTANGLE, r=.2)
tx(r0, 51.1, 473.8, 130, 25.9, 'Total', 10.5, True, 'FFFFFF'); tx(r0, 191, 473.8, 50, 25.9, '145', 10.5, True, 'FFFFFF', 'c'); tx(r0, 241, 473.8, 58, 25.9, str(NB), 10.5, True, 'FFFFFF', 'c')
angka(r0, 473.8, 25.9, TOT, 10, True, 'FFFFFF')
for ti, p in enumerate(PROV, 1):
    us = SISA[p]; n = len(us); nb = sum(R[u]['b'] for u in us)
    potong = [us[:n // 2 + n % 2], us[n // 2 + n % 2:]] if n > 26 else [us]
    for j, bag in enumerate(potong):
        hal += 1
        s = salin_kerangka(L, s7, tab_lama=False); tab(s, ti)
        ek = f' ({j + 1} dari {len(potong)})' if len(potong) > 1 else ''
        set_judul(s, [(f'{NM_PROV[p]}: ', 0), (f'{n} BPBD', 1), (' di luar daerah bencana lain dan gunung api Siaga; ', 0), (f'{nb}', 1), (f' belum mengusulkan{ek}', 0)], 18)
        set_kaki(s, SB, hal); kepala(s, [('BPBD', 43.2, 257)])
        terakhir = j == len(potong) - 1
        y = 132.5; RH = (500 - y - (21 if terakhir else 0)) / len(bag)
        sz = 10.5 if RH >= 22 else (9.5 if RH >= 15 else 8.8)
        for i, u in enumerate(bag):
            lab = nama(u) + (' (Siaga banjir)' if u in SIAGA else '')
            tx(s, 51.1, y, 246, RH, lab, sz, True, wrap=False); angka(s, y, RH, R[u]['c'], sz); y += RH
            if i < len(bag) - 1 or terakhir: garis(s, 43.2, y, 916.6, y)
        if terakhir: baris_total(s, y + .3, 500 - y - .3, f'Total {NM_PROV[p]}', jml(us))
# buang 7 slide asli
daf = L.slides._sldIdLst
for sid in list(daf)[:7]:
    L.part.drop_rel(sid.rId); daf.remove(sid)
L.save(LAMPIRAN)
print('lampiran slide', len(L.slides), 'NB', NB)
