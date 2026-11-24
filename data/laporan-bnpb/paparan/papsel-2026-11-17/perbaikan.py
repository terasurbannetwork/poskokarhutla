"""Revisi 5 (pemilik 17 Nov sore): peta slide 1 dibetulkan dan slide 3 jadi dua titik api utama.

- Slide 1: peta lama pucat, titiknya kecil, dan label cluster mengambang jauh di kanan ("ini benerin, jgn kyk gini"). Diganti peta baru
  seukuran kotak lama: kab berwarna menurut status, titik panas 11-16 Nov dibedakan warna, label tiga kecamatan ber-cluster Siaga menempel
  ke penanda lewat garis penunjuk, legenda di dalam gambar. Pil label lama dan legenda tingkat cluster dibuang.
- Slide 3: dari koridor Naukenjerai-Sota saja menjadi dua titik api utama (pemilik memilih opsi 2): Pulau Kimaam (Kontuar dan Kimaam)
  dan Naukenjerai-Sota (TN Wasur, perbatasan PNG), bersama 257 dari 275 ha belum padam provinsi 16 Nov.
Angka: web/peta_karhutla_wil.json (luas, belum, padam per kecamatan per hari), titik.json dan angka.json (hotspot.json, kecamatan 11-16 Nov).

    python perbaikan.py keluar6.pptx keluar6b.pptx
"""
import copy
import datetime as dt
import json
import math
import os
import sys

from lxml import etree
from PIL import Image, ImageDraw, ImageFont
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Pt

SRC, OUT = sys.argv[1], sys.argv[2]
DIR = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(DIR, '..', '..', '..', '..'))
FONT = os.path.expanduser('~/.claude/skills/ppt-konsultan/bnpb/assets/fonts')
NAVY, ABU, TEKS, ORANYE, MERAH = '051C2C', '6B7280', '2E3440', 'D9600B', 'C8102E'
A = json.load(open(os.path.join(DIR, 'angka.json'), encoding='utf-8'))
T = json.load(open(os.path.join(DIR, 'titik.json'), encoding='utf-8'))['hot']
W = json.load(open(os.path.join(DIR, 'web/peta_karhutla_wil.json'), encoding='utf-8'))
HARI = ['2026-11-%02d' % i for i in range(9, 17)]
H0 = dt.date.fromisoformat(W['hari0']); WI = [(dt.date.fromisoformat(d) - H0).days for d in HARI]


def wil(k):
    d = W['d'].get(k, []); m = {d[j]: d[j + 1:j + 5] for j in range(0, len(d), 5)}
    return {nm: [round(m.get(i, [0] * 4)[n] or 0) for i in WI] for n, nm in ((1, 'luas'), (2, 'belum'), (3, 'padam'))}


KEC = {k: wil('93|Merauke|' + k) for k in ('Kontuar', 'Kimaam', 'Naukenjerai', 'Sota')}
PEN = {k['kec']: k for k in A['kec_pen']}
HOT16 = {k: A['kec']['Merauke|' + k]['hot'][-1] for k in KEC}
HOT6 = {k: sum(A['kec']['Merauke|' + k]['hot']) for k in KEC}
BELUM_PROV = A['prov']['belum'][-1]
assert sum(KEC[k]['belum'][-1] for k in KEC) == 257 and round(BELUM_PROV) == 275
for k in KEC:
    assert KEC[k]['belum'][-1] == round(PEN[k]['belum']), k
SIAGA = [c for c in A['kl'] if c[2] == 2]
assert len(SIAGA) == A['level']['2'] == 5

# ================================================================== peta
KAB_GEO = json.load(open(os.path.join(REPO, 'public/geo/kabupaten/93.json'), encoding='utf-8'))['features']
KEC_GEO = [f for f in json.load(open(os.path.join(REPO, 'public/geo/kecamatan/93.json'), encoding='utf-8'))['features'] if f['properties']['kab'] == 'Merauke']
fb = lambda n: ImageFont.truetype(os.path.join(FONT, 'Roboto-Bold.ttf'), n)
fr = lambda n: ImageFont.truetype(os.path.join(FONT, 'Roboto-Regular.ttf'), n)


def cincin(g):
    return [p[0] for p in ([g['coordinates']] if g['type'] == 'Polygon' else g['coordinates'])]


def di_dalam(lon, lat, g):
    hit = False
    for c in cincin(g):
        for (x1, y1), (x2, y2) in zip(c, c[1:] + c[:1]):
            if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
                hit = not hit
    return hit


def kec_dari(lon, lat):
    return next((f['properties']['kec'] for f in KEC_GEO if di_dalam(lon, lat, f['geometry'])), None)


class Kanvas:
    def __init__(self, pw, ph, bbox, x_off=0, y_off=0, skala=None):
        self.x0, self.y0, self.x1, self.y1 = bbox
        cl = math.cos(math.radians((self.y0 + self.y1) / 2))
        self.k = skala or min((pw - x_off) / ((self.x1 - self.x0) * cl), (ph - y_off) / (self.y1 - self.y0))
        self.cl, self.xo, self.yo = cl, x_off, y_off
        self.im = Image.new('RGB', (pw, ph), 'white'); self.dr = ImageDraw.Draw(self.im)

    def p(self, lon, lat):
        return self.xo + (lon - self.x0) * self.k * self.cl, self.yo + (self.y1 - lat) * self.k

    def poligon(self, g, isi, garis='white', tebal=3):
        for c in cincin(g):
            pts = [self.p(x, y) for x, y in c]
            if len(pts) > 2:
                self.dr.polygon(pts, fill=isi, outline=garis)
                self.dr.line(pts + pts[:1], fill=garis, width=tebal)

    def titik(self, lon, lat, w, r):
        x, y = self.p(lon, lat)
        self.dr.ellipse([x - r, y - r, x + r, y + r], fill=w, outline='white', width=max(1, r // 3))

    def nomor(self, x, y, no, w, r=20, sz=26):
        self.dr.ellipse([x - r, y - r, x + r, y + r], fill=w, outline='white', width=3)
        self.dr.text((x, y + 1), str(no), font=fb(sz), fill='white', anchor='mm')

    def tulis(self, xy, t, f, w='#' + NAVY, anchor='la'):
        self.dr.text(xy, t, font=f, fill=w, anchor=anchor)

    def skala_utara(self, x, y, km):
        px = km / 111.32 * self.k
        self.dr.line([x, y, x + px, y], fill='#' + NAVY, width=4)
        self.tulis((x + px / 2, y - 8), f'{km} km', fb(20), anchor='mb')
        self.dr.polygon([(x + px + 40, y - 46), (x + px + 30, y - 14), (x + px + 50, y - 14)], fill='#' + NAVY)
        self.tulis((x + px + 40, y), 'U', fb(20), anchor='mb')


def warna_hari(w):
    return '#AEB8C4' if w <= '2026-11-14' else '#C8102E'


# ---- slide 1: gaya peta asli (kab abu, pusat cluster per tingkat, nomor cluster prio), tata letak dibetulkan (pemilik: "bukan recolor,
#      benerin layoutnya, banyak bgt whitespacenya"): peta mengisi tinggi kotak dan dipotong di utara (Asmat dan bagian utara Mappi dan
#      Boven Digoel tanpa titik dan cluster), pil label pindah ke dekat penanda.
BOX1 = (548640, 2421389, 4297680, 2485000)          # kotak gambar slide 1 (EMU)
PW1, PH1 = round(BOX1[2] / 12700 * 8), round(BOX1[3] / 12700 * 8)
BB1 = (137.45, -9.22, 141.12, -6.05)
kv = Kanvas(PW1, PH1, BB1, x_off=0, y_off=0)
kv.k = PH1 / (BB1[3] - BB1[1])
MAP_W1 = (BB1[2] - BB1[0]) * kv.cl * kv.k
kv.xo = PW1 - MAP_W1   # peta rata kanan, indeks Indonesia di kiri atas (pemilik: "tuker posisi indeks dan petanya")
# isi peta: titik panas 11-16 Nov per tanggal (pemilik 17 Nov: "bikin kayak gini lagi, jadi ada titik tanggal berapanya")
ST1 = {'Merauke': '#F4C3C9', 'Boven Digoel': '#FBE3D1', 'Mappi': '#FBE3D1', 'Asmat': '#E6EAF0'}
for f in KAB_GEO:
    kv.poligon(f['geometry'], ST1[f['properties']['kab']], tebal=6)
for t in sorted(T, key=lambda t: t['w']):
    kv.titik(t['lon'], t['lat'], warna_hari(t['w']), 12 if t['w'] >= '2026-11-15' else 10)
for t, lo, la in (('MAPPI', 139.25, -6.75), ('BOVEN DIGOEL', 140.35, -6.35), ('MERAUKE', 139.75, -7.35)):
    x, y = kv.p(lo, la)
    kv.dr.text((x, y), t, font=fb(40), fill='#5B6878', anchor='mm', stroke_width=6, stroke_fill='white')
NOMOR1 = {}
for i, c in enumerate(A['prio'], 1):
    x, y = kv.p(c['lon'], c['lat']); NOMOR1[i] = (x, y)
    kv.nomor(x, y, i, '#C8102E', 36, 42)
_px = 100 / 111.32 * kv.k   # skala 100 km dan utara di pojok kiri bawah (ruang kosong di bawah kartu label)
kv.dr.line([40, PH1 - 40, 40 + _px, PH1 - 40], fill='#051C2C', width=8)
kv.dr.text((40 + _px / 2, PH1 - 56), '100 km', font=fb(54), fill='#051C2C', anchor='mb')
kv.dr.polygon([(80 + _px, PH1 - 130), (62 + _px, PH1 - 70), (98 + _px, PH1 - 70)], fill='#051C2C')
kv.dr.text((80 + _px, PH1 - 30), 'U', font=fb(50), fill='#051C2C', anchor='mb')
kv.im.save(os.path.join(DIR, 'peta-s1-baru.png'))
assert MAP_W1 < PW1, MAP_W1


# ---- slide 3: dua peta mini
def peta_mini(nama, bbox, sorot, pw, ph, km, label):
    kv = Kanvas(pw, ph, bbox)
    for f in KEC_GEO:
        k = f['properties']['kec']
        kv.poligon(f['geometry'], '#F4C3C9' if k in sorot else '#EEF1F5', tebal=3)
    for t in sorted(T, key=lambda t: t['w']):
        if bbox[0] <= t['lon'] <= bbox[2] and bbox[1] <= t['lat'] <= bbox[3]:
            kv.titik(t['lon'], t['lat'], warna_hari(t['w']), 7 if t['w'] >= '2026-11-15' else 6)
    for c in SIAGA:
        if bbox[0] <= c[0] <= bbox[2] and bbox[1] <= c[1] <= bbox[3]:
            x, y = kv.p(c[0], c[1])
            kv.dr.regular_polygon((x, y, 20), 3, fill='#' + NAVY, outline='white')
    for t, lon, lat in label:
        kv.tulis(kv.p(lon, lat), t.upper(), fb(26), '#' + NAVY, 'mm')
    kv.skala_utara(pw - km / 111.32 * kv.k - 90, ph - 24, km)
    kv.im.save(os.path.join(DIR, nama))


MW, MH = 2290000, 2020000
PPX = lambda e: round(e / 12700 * 4)
peta_mini('peta-kimaam.png', (137.6, -8.95, 139.45, -7.45), ('Kontuar', 'Kimaam'), PPX(MW), PPX(MH), 25,
          [('Kontuar', 138.33, -8.42), ('Kimaam', 138.95, -8.3)])
peta_mini('peta-wasur.png', (140.35, -9.2, 141.06, -8.18), ('Naukenjerai', 'Sota'), PPX(MW), PPX(MH), 10,
          [('Naukenjerai', 140.83, -8.83), ('Sota', 140.82, -8.40)])

# ================================================================== pptx
p = Presentation(SRC)


def by_id(s, i):
    return next(x for x in s.shapes if x.shape_id == i)


def set_teks(sh, runs):
    par = sh.text_frame.paragraphs[0]
    r0 = par.runs[0]._r
    for r in par.runs[1:]:
        par._p.remove(r._r)
    pola, prev = copy.deepcopy(r0), r0
    for k, (t, warna, tebal) in enumerate(runs):
        r = r0 if k == 0 else copy.deepcopy(pola)
        if k: prev.addnext(r); prev = r
        r.find(qn('a:t')).text = t
        rp = r.find(qn('a:rPr'))
        if warna: rp.find('.//' + qn('a:srgbClr')).set('val', warna)
        if tebal is not None: rp.set('b', '1' if tebal else '0')




def salin(asal, tujuan, pos):
    """Salin slide (boleh dari presentasi lain) ke posisi pos di tujuan; relasi gambar ikut."""
    baru = tujuan.slides.add_slide(tujuan.slide_layouts[0])
    for sh in list(baru.shapes):
        sh._element.getparent().remove(sh._element)
    import io
    peta_rid = {}
    for rid, rel in asal.part.rels.items():   # gambar dimasukkan ulang lewat isi berkasnya: nama media tidak bentrok antarpresentasi
        if 'image' in rel.reltype:
            peta_rid[rid] = baru.part.get_or_add_image_part(io.BytesIO(rel._target.blob))[1]
    for el in asal.shapes._spTree.iterchildren():
        if el.tag in (qn('p:nvGrpSpPr'), qn('p:grpSpPr')):
            continue
        e = copy.deepcopy(el)
        for b in e.iter(qn('a:blip')):
            b.set(qn('r:embed'), peta_rid[b.get(qn('r:embed'))])
        baru.shapes._spTree.append(e)
    lst = tujuan.slides._sldIdLst; sid = list(lst)[-1]; lst.remove(sid); lst.insert(pos, sid)
    return baru

# ---- slide 1: ganti gambar peta; pil label lama (9001-9012) dipindah ke dekat penanda dengan garis penunjuk; legenda cluster tetap
s1 = p.slides[0]
lama = by_id(s1, 339)
x, y, w, h = lama.left, lama.top, lama.width, lama.height
assert (x, y, w, h) == BOX1, (x, y, w, h)
lama._element.getparent().remove(lama._element)
pic = s1.shapes.add_picture(os.path.join(DIR, 'peta-s1-baru.png'), x, y, w, h)
pohon = s1.shapes._spTree
pohon.remove(pic._element); pohon.insert(2, pic._element)   # gambar di bawah pil dan garis
ke_emu = lambda px, py: (x + px / PW1 * w, y + py / PH1 * h)
LEG = [(9013, 9013, None, 'TITIK PANAS 11–16 NOV', 1250000), (9014, 9015, 'C8102E', '15–16 Nov', 560000), (9016, 9017, 'AEB8C4', '11–14 Nov', 560000),
       (9018, 9019, 'F4C3C9', 'Kab. belum padam', 900000)]
by_id(s1, 9020)._element.getparent().remove(by_id(s1, 9020)._element); by_id(s1, 9021)._element.getparent().remove(by_id(s1, 9021)._element)
lx = 640080
for d, t_, isi, teks_, lw in LEG:
    if isi:
        bulat, tb = by_id(s1, d), by_id(s1, t_)
        bulat.fill.solid(); bulat.fill.fore_color.rgb = RGBColor.from_string(isi); bulat.left = int(lx)
        tb.left = int(lx + 155448); tb.width = lw
        set_teks(tb, [(teks_, '2E3440', False)])
        lx += 155448 + lw + 60000
    else:
        set_teks(by_id(s1, d), [(teks_, None, None)]); lx += lw + 120000
for j in range(9001, 9013):   # pil satu baris lama diganti kartu label dua baris (pemilik: "infonya detail, coba masukin")
    by_id(s1, j)._element.getparent().remove(by_id(s1, j)._element)
mx = lambda i: ke_emu(*NOMOR1[i])
OR, NV, AB = 'C8102E', '051C2C', '4B5563'


def s1_kotak(xx, yy, ww, hh, isi, garis=None, bentuk=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.25):
    b = s1.shapes.add_shape(bentuk, Emu(int(xx)), Emu(int(yy)), Emu(int(ww)), Emu(int(hh)))
    if adj is not None and bentuk == MSO_SHAPE.ROUNDED_RECTANGLE: b.adjustments[0] = adj
    b.fill.solid(); b.fill.fore_color.rgb = RGBColor.from_string(isi)
    if garis: b.line.color.rgb = RGBColor.from_string(garis); b.line.width = Emu(9525)
    else: b.line.fill.background()
    b.shadow.inherit = False
    return b


def s1_teks(xx, yy, ww, hh, runs, algn=PP_ALIGN.LEFT):
    tb = s1.shapes.add_textbox(Emu(int(xx)), Emu(int(yy)), Emu(int(ww)), Emu(int(hh)))
    tf = tb.text_frame; tf.word_wrap = False; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    par = tf.paragraphs[0]; par.alignment = algn
    for t, warna, tebal, sz in runs:
        r = par.add_run(); r.text = t
        f = r.font; f.name = 'Roboto'; f.size = Pt(sz); f.bold = tebal; f.color.rgb = RGBColor.from_string(warna)
    return tb


KW_, KH_ = 1450000, 300000
NAMA_KAW = {'Hutan Suaka Alam': 'Suaka Alam', 'Taman Nasional': 'TN Wasur'}
# 1 Kontuar dan 3 Kimaam: kolom kosong kiri (di bawah indeks Indonesia); 2 Naukenjerai: laut di selatan pesisir Merauke
TUJU = {3: (x + 45720, y + 1000000), 1: (x + 45720, y + 1000000 + KH_ + 70000),   # Kimaam di atas: garis tidak bersilang
        2: (mx(2)[0] - 70000 - KW_, mx(2)[1] - KH_ / 2)}
for i, c in enumerate(A['prio'], 1):
    kx, ky = TUJU[i]; m = mx(i)
    ujung = (kx + KW_, ky + KH_ / 2)
    ln = s1.shapes.add_connector(1, Emu(int(m[0])), Emu(int(m[1])), Emu(int(ujung[0])), Emu(int(ujung[1])))
    ln.line.color.rgb = RGBColor.from_string(OR); ln.line.width = Emu(9525)
    s1_kotak(kx, ky, KW_, KH_, 'FFFFFF', OR, adj=0.18)
    s1_kotak(kx + 45000, ky + (KH_ - 150000) / 2, 150000, 150000, OR, bentuk=MSO_SHAPE.OVAL, adj=None)
    s1_teks(kx + 45000, ky + (KH_ - 150000) / 2, 150000, 150000, [(str(i), 'FFFFFF', True, 7)], PP_ALIGN.CENTER)
    s1_teks(kx + 245000, ky + 25000, KW_ - 600000, 130000, [(c['kec'], NV, True, 8)])
    s1_teks(kx + KW_ - 420000, ky + 25000, 370000, 130000, [('Siaga', OR, True, 7)], PP_ALIGN.RIGHT)
    pen = PEN[c['kec']]
    s1_teks(kx + 245000, ky + 150000, KW_ - 270000, 120000,
            [(f"{NAMA_KAW.get(pen['tanggung'], pen['tanggung'])}, belum padam {round(pen['belum'])} ha", AB, False, 6)])
    assert kx >= x and kx + KW_ <= x + w and ky + KH_ <= y + h, (i, kx, ky)

# ---- slide 2: peta Kab. Merauke berbatas kecamatan di kiri Tren Harian (pemilik 17 Nov: "tambahin peta khusus kab. merauke di sebelah kiri
#      tren harian", "petanya pakai batas adm kecamatan"). Panel Tren Harian dipersempit ke kanan; isinya diskalakan mendatar.
s2 = p.slides[1]
TX0, TX1, TY0, TY1 = 548640, 5943600, 2260273, 6167437          # panel Tren Harian lama
MPW = 2550000; XT = TX0 + MPW + 137160; FX = (TX1 - XT) / (TX1 - TX0)
for sh in list(s2.shapes):
    if sh.left >= TX0 - 1 and sh.left + sh.width <= TX1 + 1 and TY0 <= sh.top < TY1:
        bulat = sh.shape_type == 13 or (sh.shape_type == 1 and 'ellipse' in etree.tostring(sh._element).decode()[:900])
        if bulat:
            c = sh.left + sh.width / 2; sh.left = int(XT + (c - TX0) * FX - sh.width / 2)
        else:
            sh.left = int(XT + (sh.left - TX0) * FX); sh.width = max(1, int(sh.width * FX))
            if sh.has_text_frame: sh.text_frame.word_wrap = False
# gambar peta
BB2 = (137.55, -9.20, 141.08, -6.45)
IW = MPW - 2 * 91440
cl2 = math.cos(math.radians((BB2[1] + BB2[3]) / 2))
IH = int(IW * (BB2[3] - BB2[1]) / ((BB2[2] - BB2[0]) * cl2))
kv2 = Kanvas(round(IW / 12700 * 8), round(IH / 12700 * 8), BB2)
BELUM16 = {k: round(v['belum']) for k, v in PEN.items() if round(v['belum']) > 0}
for f in KEC_GEO:
    k = f['properties']['kec']
    kv2.poligon(f['geometry'], '#F4C3C9' if k in BELUM16 else ('#FBE3D1' if A['kec'].get('Merauke|' + k, {}).get('hot') and sum(A['kec']['Merauke|' + k]['hot']) else '#EEF1F5'), tebal=4)
for t in sorted(T, key=lambda t: t['w']):
    if t['kab'] == 'Merauke':
        kv2.titik(t['lon'], t['lat'], warna_hari(t['w']), 9 if t['w'] >= '2026-11-15' else 7)
LBL2 = {'Kontuar': (138.15, -7.98), 'Kimaam': (138.72, -8.05), 'Naukenjerai': (140.72, -8.80), 'Sota': (140.82, -8.30), 'Merauke': (140.42, -8.42), 'Ngguti': (139.6, -7.45)}
for k, (lo, la) in LBL2.items():
    xx, yy = kv2.p(lo, la)
    kv2.dr.text((xx, yy), k.upper(), font=fb(44), fill='#051C2C', anchor='mm', stroke_width=7, stroke_fill='white')
_px2 = 100 / 111.32 * kv2.k
W2P, H2P = kv2.im.size
kv2.dr.line([W2P - 40 - _px2, H2P - 30, W2P - 40, H2P - 30], fill='#051C2C', width=6)
kv2.dr.text((W2P - 40 - _px2 / 2, H2P - 42), '100 km', font=fb(36), fill='#051C2C', anchor='mb')
kv2.im.save(os.path.join(DIR, 'peta-merauke-kec.png'))


def s2_kotak(xx, yy, ww, hh, isi, garis=None, bentuk=MSO_SHAPE.RECTANGLE, adj=None):
    b = s2.shapes.add_shape(bentuk, Emu(int(xx)), Emu(int(yy)), Emu(int(ww)), Emu(int(hh)))
    if adj is not None: b.adjustments[0] = adj
    b.fill.solid(); b.fill.fore_color.rgb = RGBColor.from_string(isi)
    if garis: b.line.color.rgb = RGBColor.from_string(garis); b.line.width = Emu(9525)
    else: b.line.fill.background()
    b.shadow.inherit = False
    return b


def s2_teks(xx, yy, ww, hh, runs, algn=PP_ALIGN.LEFT, spc=None):
    tb = s2.shapes.add_textbox(Emu(int(xx)), Emu(int(yy)), Emu(int(ww)), Emu(int(hh)))
    tf = tb.text_frame; tf.word_wrap = False; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    par = tf.paragraphs[0]; par.alignment = algn
    for t, warna, tebal, sz in runs:
        r = par.add_run(); r.text = t
        f = r.font; f.name = 'Roboto'; f.size = Pt(sz); f.bold = tebal; f.color.rgb = RGBColor.from_string(warna)
    return tb


for x_ in s2.shapes:   # ikon kepala Tren Harian ke posisi baku kepala panel (lingkaran x+128016, ikon x+182880), jarak ke judul sama dengan panel lain
    if XT <= x_.left + 200000 < TX1 and 2300000 <= x_.top <= 2420000 and x_.width <= 292608 and x_.height <= 292608:
        x_.left = int(XT + (128016 if x_.width == 292608 else 182880))
judul_tren = by_id(s2, 344); judul_tren.left = int(XT + 502920); judul_tren.width = int(TX1 - XT - 600000)   # judul tidak menimpa ikon
X2 = TX0
s2_kotak(X2, TY0, MPW, TY1 - TY0, 'FFFFFF', 'D3D9E1', MSO_SHAPE.ROUNDED_RECTANGLE, 0.03)
s2_kotak(X2, TY0, MPW, 465139, 'E6EAF0', bentuk=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.16)
s2_kotak(X2, TY0 + 280671, MPW, 182880, 'E6EAF0')
s2_kotak(X2 + 128016, TY0 + 86265, 292608, 292608, '051C2C', bentuk=MSO_SHAPE.OVAL)
s2.shapes.add_picture(os.path.join(DIR, 'ik', 'lpg-ik-pin-putih.png'), Emu(X2 + 182880), Emu(TY0 + 141129), Emu(182880), Emu(182880))
s2_teks(X2 + 502920, TY0 + 74422, MPW - 600000, 316294, [('Peta Kecamatan, 11–16 Nov', '1A1A1A', True, 11)])
my2 = TY0 + 465139 + 70000
s2.shapes.add_picture(os.path.join(DIR, 'peta-merauke-kec.png'), Emu(X2 + 91440), Emu(my2), Emu(IW), Emu(IH))
ly2 = my2 + IH + 50000
lx2 = X2 + 128016
for w_, t_ in (('C8102E', '15–16 Nov'), ('AEB8C4', '11–14 Nov'), ('F4C3C9', 'belum padam')):
    s2_kotak(lx2, ly2 + 25000, 100000, 100000, w_, bentuk=MSO_SHAPE.OVAL if w_ != 'F4C3C9' else MSO_SHAPE.RECTANGLE)
    lw_ = 470000 if len(t_) < 10 else 760000
    s2_teks(lx2 + 140000, ly2, lw_, 150000, [(t_, '4B5563', False, 7)]); lx2 += 140000 + lw_ + 40000
# belum padam per kecamatan, 16 Nov
by2 = ly2 + 250000
s2_teks(X2 + 128016, by2, MPW - 256032, 150000, [('BELUM PADAM PER KECAMATAN, 16 NOV (HA)', '051C2C', True, 7)])
rows2 = sorted(BELUM16.items(), key=lambda kv: -kv[1])
rh2 = (TY1 - 90000 - (by2 + 200000)) / len(rows2)
vmax2 = max(v for _, v in rows2)
for j, (k, v) in enumerate(rows2):
    ry = by2 + 200000 + j * rh2
    s2_teks(X2 + 128016, ry, 760000, rh2, [(k, '1A1A1A', True, 7.5)])
    bw2 = (MPW - 128016 * 2 - 760000 - 420000) * v / vmax2
    s2_kotak(X2 + 128016 + 760000, ry + rh2 * 0.25, max(bw2, 20000), rh2 * 0.5, 'C8102E' if j < 4 else 'F4C3C9', bentuk=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.3)
    s2_teks(X2 + 128016 + 760000 + bw2 + 50000, ry, 380000, rh2, [(f'{v} ha', '1A1A1A', True, 7.5)])
assert by2 + 200000 + len(rows2) * rh2 <= TY1, 'panel peta Merauke meluap'

# ---- slide 2: bar komposisi titik (Koridor, Pulau Kimaam, kecamatan lain) semua ruas bersudut bulat dengan celah sama
#      (pemilik 17 Nov: "itu ada yang rounded ada yg ngga")
for ruas, label, akhir in ((9288, 9289, False), (9290, 9291, False), (9292, 9293, True)):
    b_ = by_id(s2, ruas)
    geo = b_._element.spPr.find(qn('a:prstGeom'))
    geo.set('prst', 'roundRect')
    av = geo.find(qn('a:avLst'))
    for g in list(av): av.remove(g)
    gd = etree.SubElement(av, qn('a:gd')); gd.set('name', 'adj'); gd.set('fmla', 'val 50000')
    if not akhir:
        b_.width = b_.width - 45720; by_id(s2, label).width = by_id(s2, label).width - 45720

# ---- slide 2: panel "Kronologi dan cluster" Kab. Merauke di kanan panel Titik Panas per Kecamatan dan Situasi lapangan
#      (pemilik 17 Nov: "tambahin panel kronologi dan cluster di kanan kedua panel ini"); dua panel itu dipersempit
RX0, RX1, RY0, RY1 = 6080760, 11643055, 2260273, 6167437
KRW = 2560000; RWN = RX1 - RX0 - KRW - 137160; FR = RWN / (RX1 - RX0)
for sh in list(s2.shapes):
    if sh.left >= RX0 - 1 and sh.left + sh.width <= RX1 + 1 and RY0 <= sh.top < RY1:
        bulat = sh.shape_type == 13 or (sh.shape_type == 1 and 'ellipse' in etree.tostring(sh._element).decode()[:900])
        if bulat:
            c = sh.left + sh.width / 2; sh.left = int(RX0 + (c - RX0) * FR - sh.width / 2)
        else:
            sh.left = int(RX0 + (sh.left - RX0) * FR); sh.width = max(1, int(sh.width * FR))
            if sh.has_text_frame: sh.text_frame.word_wrap = False
for sh in s2.shapes:   # kepala panel: ikon dan judul di posisi baku; angka kanan di ujung panel
    if not (RX0 - 300000 <= sh.left < RX0 + RWN): continue
    if any(a_ <= sh.top <= b_ for a_, b_ in ((2300000, 2420000), (4630000, 4760000))) and sh.width <= 292608 and sh.height <= 292608:
        sh.left = int(RX0 + (128016 if sh.width == 292608 else 182880))
    if not sh.has_text_frame: continue
    t_ = sh.text_frame.text.strip()
    if t_ in ('Titik Panas per Kecamatan, 11–16 Nov', 'Situasi lapangan'):
        sh.left = RX0 + 502920; sh.width = RWN - 1300000
        if t_.startswith('Titik'): set_teks(sh, [('Titik per Kecamatan', None, None)])
    if (t_ == '1.585' and sh.top < 2500000) or (t_ == '3' and 4600000 < sh.top < 4760000):
        sh.left = RX0 + RWN - 1100000; sh.width = 980000
# legenda bar komposisi ditata ulang berurutan
LEGK = [(9294, 9295, 'Naukenjerai–Sota 339'), (9296, 9297, 'Pulau Kimaam 673'), (9298, 9299, 'lainnya 573')]
lxk = RX0 + 128016
for d_, t_, tx_ in LEGK:
    by_id(s2, d_).left = int(lxk); tb_ = by_id(s2, t_); tb_.left = int(lxk + 110000)
    set_teks(tb_, [(tx_, None, None)]); tb_.width = int(len(tx_) * 40000)
    lxk += 110000 + len(tx_) * 40000 + 90000
assert lxk < RX0 + RWN, lxk
# baris kecamatan (nomor, nama, pil Siaga, batang, angka) digambar ulang sesuai lebar baru
TY_A, TY_B = 2720000, 3960000
for sh in list(s2.shapes):
    if RX0 - 300000 <= sh.left < RX0 + RWN and TY_A <= sh.top < TY_B:
        sh._element.getparent().remove(sh._element)
FK6 = A['fk_kec'][:6]; RHK = (TY_B - TY_A) / 6; vmk = FK6[0][1]
for n, (k, v) in enumerate(FK6):
    yy = TY_A + n * RHK; cyk = yy + RHK / 2
    s2_kotak(RX0 + 128016, cyk - 80000, 160000, 160000, '051C2C', bentuk=MSO_SHAPE.OVAL)
    s2_teks(RX0 + 128016, cyk - 80000, 160000, 160000, [(str(n + 1), 'FFFFFF', True, 6.5)], PP_ALIGN.CENTER)
    s2_teks(RX0 + 340000, cyk - 80000, 820000, 160000, [(k, '1A1A1A', True, 8)])
    if A['lv_kec'].get('Merauke|' + k, 0) >= 2:
        s2_kotak(RX0 + 1120000, cyk - 70000, 520000, 140000, 'F8DDE0', bentuk=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.5)
        s2.shapes.add_picture(os.path.join(DIR, 'ik', 'lpg-ik-segitiga-merah.png'), Emu(RX0 + 1160000), Emu(int(cyk - 45000)), Emu(90000), Emu(90000))
        s2_teks(RX0 + 1270000, cyk - 70000, 360000, 140000, [('Siaga', 'C8102E', True, 6.5)])
    bx0k = RX0 + 1700000; bwk_ = (RWN - 1700000 - 450000) * v / vmk
    s2_kotak(bx0k, cyk - 55000, bwk_, 110000, 'D9600B' if n < 3 else 'A9B4C2', bentuk=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.3)
    s2_teks(bx0k + bwk_ + 50000, cyk - 80000, 380000, 160000, [(str(v), '1A1A1A', True, 7.5)])

# Situasi lapangan: pil lama yang berjejer tidak muat; satu baris per kecamatan
SY0 = 4595268 + 465139
for sh in list(s2.shapes):
    if RX0 <= sh.left < RX0 + RWN and SY0 < sh.top < RY1 - 20000:
        sh._element.getparent().remove(sh._element)
KAWS2 = {'Hutan Suaka Alam': 'Suaka Alam', 'Taman Nasional': 'TN Wasur'}
SRH = (RY1 - 60000 - SY0 - 40000) / 3
for n, k in enumerate(['Kontuar', 'Naukenjerai', 'Kimaam']):
    yy = SY0 + 40000 + n * SRH
    s2_kotak(RX0 + 128016, yy + SRH / 2 - 110000, 220000, 220000, 'D9600B', bentuk=MSO_SHAPE.OVAL)
    s2.shapes.add_picture(os.path.join(DIR, 'ik', 'lpg-ik-api-putih.png'), Emu(int(RX0 + 128016 + 50000)), Emu(int(yy + SRH / 2 - 60000)), Emu(120000), Emu(120000))
    tempat = {'Kontuar': 'Pulau Kimaam', 'Naukenjerai': 'perbatasan PNG', 'Kimaam': 'Pulau Kimaam'}[k]
    s2_teks(RX0 + 430000, yy + SRH / 2 - 170000, RWN - 1300000, 170000, [(f'{k}, {tempat}', '051C2C', True, 8.5)])
    s2_teks(RX0 + 430000, yy + SRH / 2 + 10000, RWN - 500000, 150000,
            [(f"belum padam {round(PEN[k]['belum'])} ha", 'C8102E', True, 7),
             (f", {KAWS2.get(PEN[k]['tanggung'], PEN[k]['tanggung'])}, {sum(A['kec']['Merauke|' + k]['hot'])} titik 11–16 Nov", '4B5563', False, 7)])
    if n < 2:
        g_ = s2.shapes.add_connector(1, Emu(RX0 + 128016), Emu(int(yy + SRH)), Emu(RX0 + RWN - 128016), Emu(int(yy + SRH)))
        g_.line.color.rgb = RGBColor.from_string('E5E7EB'); g_.line.width = Emu(9525)
# panel baru
KX = RX0 + RWN + 137160
s2_kotak(KX, RY0, KRW, RY1 - RY0, 'FFFFFF', 'D3D9E1', MSO_SHAPE.ROUNDED_RECTANGLE, 0.03)
s2_kotak(KX, RY0, KRW, 465139, 'E6EAF0', bentuk=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.16)
s2_kotak(KX, RY0 + 280671, KRW, 182880, 'E6EAF0')
s2_kotak(KX + 128016, RY0 + 86265, 292608, 292608, '051C2C', bentuk=MSO_SHAPE.OVAL)
s2.shapes.add_picture(os.path.join(DIR, 'ik', 'lpg-ik-kalender-putih.png'), Emu(KX + 182880), Emu(RY0 + 141129), Emu(182880), Emu(182880))
s2_teks(KX + 502920, RY0 + 74422, KRW - 600000, 316294, [('Kronologi dan cluster', '1A1A1A', True, 11)])
_Wk = json.load(open(os.path.join(DIR, 'web/peta_karhutla_wil.json'), encoding='utf-8')); _Hk = dt.date.fromisoformat(_Wk['hari0'])
_Wm = _Wk['d']['93|Merauke']; _pk = max((_Wm[j + 1], -_Wm[j]) for j in range(0, len(_Wm), 5))
PKH = _Hk + dt.timedelta(days=-_pk[1]); BLN_ = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
HM = A['kab']['Merauke']['hot']; imx = max(range(8), key=lambda j: HM[j]); imn = min(range(8), key=lambda j: HM[j])
f0_ = lambda v: f'{round(v):,}'.replace(',', '.')
EVK = [(f'{PKH.day} {BLN_[PKH.month - 1]}', 'D9600B', 'api', [(f'{f0_(_pk[0])} titik', 'D9600B', True), (', tertinggi 2026', '4B5563', False)]),
       (f"{int(A['HARI'][imx][8:])} Nov", 'D9600B', 'api', [(f'{f0_(HM[imx])} titik', 'D9600B', True), (', tertinggi pekan ini', '4B5563', False)]),
       ('13–15 Nov', '051C2C', 'tetes', [('Siaga hujan lebat BMKG', '051C2C', True), (f", {int(A['HARI'][imn][8:])} Nov: {HM[imn]} titik", '4B5563', False)]),
       ('16 Nov', 'C8102E', 'segitiga', [(f'{HM[-1]} titik', 'C8102E', True), (f", belum padam {round(A['kab']['Merauke']['belum'][-1])} ha", '4B5563', False)])]
ey0, EP = RY0 + 465139 + 110000, 400000
g_ = s2.shapes.add_connector(1, Emu(KX + 128016 + 100000), Emu(ey0 + 100000), Emu(KX + 128016 + 100000), Emu(int(ey0 + 100000 + EP * 3)))
g_.line.color.rgb = RGBColor.from_string('E5E7EB'); g_.line.width = Emu(12700)
for n, (tg_, w_, ik_, runs_) in enumerate(EVK):
    yy = ey0 + n * EP
    s2_kotak(KX + 128016, yy, 200000, 200000, w_, bentuk=MSO_SHAPE.OVAL)
    s2.shapes.add_picture(os.path.join(DIR, 'ik', f'lpg-ik-{ik_}-putih.png'), Emu(KX + 128016 + 45000), Emu(yy + 45000), Emu(110000), Emu(110000))
    s2_teks(KX + 400000, yy - 10000, KRW - 500000, 150000, [(tg_, '1A1A1A', True, 8)])
    s2_teks(KX + 400000, yy + 140000, KRW - 500000, 140000, [(t, w, b, 7) for t, w, b in runs_])
# blok cluster Kab. Merauke (pusat cluster tingkat >= 1 di angka.json kl, semuanya di Merauke; sisanya api kecil)
nk = {'2': sum(1 for c in A['kl'] if c[2] == 2), '1': sum(1 for c in A['kl'] if c[2] == 1)}; nk['0'] = A['kab']['Merauke']['komp'] - nk['2'] - nk['1']
TK = [('2', 'Api besar', 'E07A2E', 'perlu pemadaman'), ('1', 'Api sedang', 'F2C9A0', 'perlu dicek tim patroli'), ('0', 'Api kecil', 'B4BDC8', 'prioritas rendah')]
cy0 = ey0 + EP * 4 + 20000
s2_teks(KX + 128016, cy0, KRW - 256032, 160000, [('KELOMPOK API AKTIF (CLUSTER), 16 NOV', '051C2C', True, 7)])
s2_teks(KX + 128016, cy0, KRW - 256032, 160000, [(str(A['kab']['Merauke']['komp']), '051C2C', True, 11)], PP_ALIGN.RIGHT)
bxk, bwk = KX + 128016, KRW - 256032; MIN_ = 200000; sisa_ = bwk - 30000 * 2 - MIN_ * 3; tot_ = sum(nk.values())
for kode, nama, w_, _ in TK:
    ww = MIN_ + sisa_ * nk[kode] / tot_
    s2_kotak(bxk, cy0 + 220000, ww, 200000, w_, bentuk=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.5)
    s2_teks(bxk, cy0 + 220000, ww, 200000, [(str(nk[kode]), 'FFFFFF' if kode == '2' else '051C2C', True, 8)], PP_ALIGN.CENTER)
    bxk += ww + 30000
ryk = cy0 + 500000
for kode, nama, w_, arti in TK:
    s2_kotak(KX + 128016, ryk + 40000, 110000, 110000, w_, bentuk=MSO_SHAPE.OVAL)
    s2_teks(KX + 300000, ryk, KRW - 400000, 190000, [(f'{nama} {nk[kode]}: ', '051C2C', True, 7.5), (arti, '4B5563', False, 7)])
    ryk += 220000
assert ryk < RY1, ryk

# ---- slide 1: blok "Sebaran titik 9-16 Nov: Merauke 100%" diganti grafik belum padam harian provinsi (pemilik 17 Nov: "hapus aja, nonsense,
#      atau ganti dengan info/chart lain yg lebih informatif")
for j in range(9073, 9080):
    try: e = by_id(s1, j)._element; e.getparent().remove(e)
    except StopIteration: pass
BX, BW_ = 4983480, 3548600
# belum padam harian sudah ada di Tren Harian slide 2 (pemilik: "dobel, coba cari info lain"): diganti luas terbakar per bulan 2026,
# dari web/peta_karhutla_wil.json kunci kab/kota Papua Selatan (jumlahnya = kumulatif 1 Jan-16 Nov, beda pembulatan)
_W = json.load(open(os.path.join(DIR, 'web/peta_karhutla_wil.json'), encoding='utf-8')); _H0 = dt.date.fromisoformat(_W['hari0'])
BUL = [0.0] * 11
for kk, dd in _W['d'].items():
    if kk.startswith('93|') and kk.count('|') == 1:
        for j in range(0, len(dd), 5):
            hh = _H0 + dt.timedelta(days=dd[j])
            if hh <= dt.date(2026, 11, 16): BUL[hh.month - 1] += dd[j + 2] or 0
assert abs(sum(BUL) - A['prov']['kum']) < 200, (sum(BUL), A['prov']['kum'])
NB = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov']
rb = lambda v: f'{v / 1000:.1f}'.replace('.', ',')
ipk = max(range(11), key=lambda j: BUL[j])
s1_teks(BX, 4060000, BW_, 130000, [('LUAS TERBAKAR PER BULAN 2026 (RIBU HA)', '6B7280', True, 7)])
s1_teks(BX, 4060000, BW_, 130000, [(f'puncak {NB[ipk]}; Nov s.d. 16 Nov', 'D9600B', True, 7)], PP_ALIGN.RIGHT)
dasar_, tmax_ = 5000000, 560000
slot_ = BW_ / 11; bw_ = slot_ * 0.62
for j, v in enumerate(BUL):
    bh_ = max(int(tmax_ * v / max(BUL)), 15000)
    bx_ = BX + j * slot_ + (slot_ - bw_) / 2
    s1_kotak(bx_, dasar_ - bh_, bw_, bh_, 'D9600B' if j == ipk else ('C8102E' if j == 10 else 'F4C3A0'), bentuk=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.12)
    s1_teks(BX + j * slot_, dasar_ - bh_ - 140000, slot_, 130000, [(rb(v), '1A1A1A', True, 7)], PP_ALIGN.CENTER)
    s1_teks(BX + j * slot_, dasar_ + 30000, slot_, 110000, [(NB[j], '6B7280', False, 6.5)], PP_ALIGN.CENTER)
g_ = s1.shapes.add_connector(1, Emu(BX), Emu(dasar_), Emu(BX + BW_), Emu(dasar_)); g_.line.color.rgb = RGBColor.from_string('BFC5CC'); g_.line.width = Emu(9525)

# ---- slide 1: panel "Kejadian dan status" ditata ulang (pemilik 17 Nov: "tampilannya aneh, coba percantik lg")
for j in range(9080, 9143):
    try: e = by_id(s1, j)._element; e.getparent().remove(e)
    except StopIteration: pass
set_teks(by_id(s1, 467), [('Kecamatan Siaga', None, None)]); set_teks(by_id(s1, 468), [('3', None, None)])
PX0, PY0, PW_, PH_ = 8686800, 2260273, 2956255, 2976887
ry0, KUM_H = PY0 + 465139 + 60000, 560000
RH = (PY0 + PH_ - 90000 - KUM_H - 60000 - ry0) / 3
KAWS = {'Hutan Suaka Alam': 'Suaka Alam', 'Taman Nasional': 'TN Wasur'}
for n, k in enumerate(['Kontuar', 'Naukenjerai', 'Kimaam']):
    ry = ry0 + n * RH
    ikp = lambda nama, xx, yy, d: s1.shapes.add_picture(os.path.join(DIR, 'ik', f'lpg-ik-{nama}.png'), Emu(int(xx)), Emu(int(yy)), Emu(int(d)), Emu(int(d)))
    s1_kotak(PX0 + 110000, ry + RH / 2 - 125000, 250000, 250000, 'D9600B', bentuk=MSO_SHAPE.OVAL, adj=None)   # ikon api seperti panel asli
    ikp('api-putih', PX0 + 110000 + 60000, ry + RH / 2 - 65000, 130000)
    s1_teks(PX0 + 430000, ry + RH / 2 - 190000, 1150000, 200000, [(k, '051C2C', True, 10.5)])
    ikp('pohon-abu', PX0 + 430000, ry + RH / 2 + 30000, 110000)
    s1_teks(PX0 + 570000, ry + RH / 2 + 10000, 1050000, 150000, [(KAWS.get(PEN[k]['tanggung'], PEN[k]['tanggung']), '6B7280', False, 7.5)])
    for c, (val, lab, wv, ik_) in enumerate(((str(HOT16[k]), 'titik 16 Nov', 'D9600B', 'api-oranye'),
                                            (f"{round(PEN[k]['belum'])} ha", 'belum padam', 'C8102E', 'segitiga-merah'))):
        cx = PX0 + 1500000 + c * 620000
        ikp(ik_, cx, ry + RH / 2 - 150000, 130000)
        s1_teks(cx + 165000, ry + RH / 2 - 205000, 470000, 220000, [(val, wv, True, 12)])
        s1_teks(cx + 165000, ry + RH / 2 + 20000, 620000, 150000, [(lab, '6B7280', False, 6.5)])
    if n < 2:
        g_ = s1.shapes.add_connector(1, Emu(PX0 + 120000), Emu(int(ry + RH)), Emu(PX0 + PW_ - 120000), Emu(int(ry + RH)))
        g_.line.color.rgb = RGBColor.from_string('E5E7EB'); g_.line.width = Emu(9525)
ky = PY0 + PH_ - 90000 - KUM_H
s1_kotak(PX0 + 91440, ky, PW_ - 182880, KUM_H, 'F3F5F8', bentuk=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.12)
s1_kotak(PX0 + 170000, ky + KUM_H / 2 - 120000, 240000, 240000, '051C2C', bentuk=MSO_SHAPE.OVAL, adj=None)
s1.shapes.add_picture(os.path.join(DIR, 'ik', 'lpg-ik-lapis-putih.png'), Emu(PX0 + 220000), Emu(int(ky + KUM_H / 2 - 70000)), Emu(140000), Emu(140000))
s1_teks(PX0 + 480000, ky + KUM_H / 2 - 190000, 1300000, 200000, [('Karhutla 2026', '051C2C', True, 10.5)])
s1_teks(PX0 + 480000, ky + KUM_H / 2 + 10000, 1300000, 170000, [('kumulatif 1 Jan–16 Nov', '6B7280', False, 7.5)])
s1_teks(PX0 + PW_ - 1400000, ky + KUM_H / 2 - 200000, 1260000, 220000, [(f"{A['prov']['kum']:,}".replace(',', '.') + ' ha', '051C2C', True, 12)], PP_ALIGN.RIGHT)
s1_teks(PX0 + PW_ - 1400000, ky + KUM_H / 2 + 20000, 1260000, 150000, [('luas terbakar', '6B7280', False, 6.5)], PP_ALIGN.RIGHT)

# ---- slide Penanganan: kartu "0 unit helikopter water bombing" dihapus (pemilik 17 Nov: "ini hapus aja"); dua kartu sisa dilebarkan
sp_ = next(sl for sl in p.slides if any(x.has_text_frame and x.text_frame.text.startswith('Penanganan Karhutla') for x in sl.shapes))
for x_ in list(sp_.shapes):
    if 5353000 <= x_.left < 7610000 and 1553000 <= x_.top < 2075000:
        x_._element.getparent().remove(x_._element)
CW2 = (7609635 - 658368 - 91440) // 2
for x_ in sp_.shapes:
    if 658368 <= x_.left < 2914497 and 1553000 <= x_.top < 2075000 and x_.width > 2000000:
        x_.width = CW2
for x_ in sp_.shapes:
    if 3005937 <= x_.left < 5262066 and 1553000 <= x_.top < 2075000:
        if x_.width > 2000000: x_.left, x_.width = 658368 + CW2 + 91440, CW2
        else: x_.left = x_.left + (658368 + CW2 + 91440 - 3005937)
assert not any(x_.has_text_frame and x_.text_frame.text.strip() in ('helikopter water bombing', '0 unit') for x_ in sp_.shapes)

# ---- tab Kecamatan Siaga, dua slide (pemilik 17 Nov: "kecamatan siaga ada 2 slide: pulau kimaam: kec kontuar dan kimaam; naukenjerai-sota"):
#      slide 3 Pulau Kimaam = slide 3 buat.py dengan KAWASAN=pulau; slide 4 = koridor Naukenjerai-Sota bawaan deck.
salin(Presentation(os.path.join(DIR, 'keluar-pulau.pptx')).slides[2], p, 2)
for n, kata in ((2, 'Pulau Kimaam'), (3, 'Naukenjerai')):
    judul = next(x.text_frame.text for x in p.slides[n].shapes if x.has_text_frame and x.text_frame.text.startswith('Sebaran Titik Panas'))
    assert kata in judul, (n, judul)

# ---- slide Kecamatan Siaga: blok "Alur api, urutan waktu" dibuang (pemilik 17 Nov: "hapus aja karena udah ada panel kronologi, jadinya pusing");
#      grafik harian di panel tengah diregangkan ke bawah mengisi ruang yang dibebaskan
for no in (2, 3):
    sk = p.slides[no]
    PXL, PXR, GY0 = 4526280, 4526280 + 4069080, 2800000
    alur = [x for x in sk.shapes if x.has_text_frame and x.text_frame.text.startswith('ALUR API')]
    assert len(alur) == 1, (no, len(alur))
    cut = alur[0].top - 20000
    for x in list(sk.shapes):
        if PXL <= x.left < PXR and x.top >= cut and x.top < 6150000:
            x._element.getparent().remove(x._element)
    GY1 = 6060000
    fy = (GY1 - GY0) / (cut - GY0)
    for x in sk.shapes:
        if PXL <= x.left < PXR and GY0 <= x.top < cut:
            if x.shape_type in (13, 17) or (x.has_text_frame and x.text_frame.text.strip()):
                c = x.top + x.height / 2; x.top = int(GY0 + (c - GY0) * fy - x.height / 2)
            else:
                x.top = int(GY0 + (x.top - GY0) * fy); x.height = int(x.height * fy)

# ---- slide Kecamatan Siaga: blok cluster (pil "25 cluster aktif, Siaga 4, ...") diganti bar susun berpenjelasan
#      (pemilik 17 Nov: "ini pembaca ga ngerti maksudnya apa"). Arti tingkat dari scripts/data/aturan.py keparahan() dan status():
#      Siaga = api besar (front aktif 24 jam >= 10 piksel, kira-kira 140 ha) atau bertahan >= 4 hari, atau api sedang saat cuaca sangat kering.
os.environ['KAWASAN'] = 'pulau'
import importlib  # noqa: E402
import kawasan as _kw  # noqa: E402
KL_SLIDE = {2: (json.load(open(os.path.join(DIR, 'angka-pulau.json'), encoding='utf-8')), importlib.reload(_kw).CFG),
            3: (json.load(open(os.path.join(DIR, 'angka.json'), encoding='utf-8')), None)}
os.environ['KAWASAN'] = 'wasur'; KL_SLIDE[3] = (KL_SLIDE[3][0], importlib.reload(_kw).CFG)
# label langsung api besar/sedang/kecil (pemilik 17 Nov: "gausah ada kata2 siaga/patroli/rutin, langsung api besar, sedang, kecil")
TINGKAT = [('2', 'Api besar', 'E07A2E', 'perlu pemadaman'),
           ('1', 'Api sedang', 'F2C9A0', 'perlu dicek tim patroli'),
           ('0', 'Api kecil', 'B4BDC8', 'prioritas rendah')]
for no, (A_, KC_) in KL_SLIDE.items():
    sk = p.slides[no]
    jud = [x for x in sk.shapes if x.has_text_frame and x.text_frame.text.startswith('CLUSTER DI')]
    assert len(jud) == 1, no
    y0c = jud[0].top
    for x in list(sk.shapes):
        if x.left >= 8800000 and x.top >= y0c and x.top < 6150000:
            x._element.getparent().remove(x._element)
    n_ = {'2': A_['kaw_level'].get('2', 0), '1': A_['kaw_level'].get('1', 0)}; n_['0'] = A_['kaw_komp'] - n_['2'] - n_['1']
    X0c, Wc = 8869680, 2636215

    def tk(xx, yy, ww, hh, runs, algn=PP_ALIGN.LEFT, wrap=False):
        tb = sk.shapes.add_textbox(Emu(int(xx)), Emu(int(yy)), Emu(int(ww)), Emu(int(hh)))
        tf = tb.text_frame; tf.word_wrap = wrap; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        par = tf.paragraphs[0]; par.alignment = algn
        for t, w_, b_, sz in runs:
            r = par.add_run(); r.text = t; f = r.font; f.name = 'Roboto'; f.size = Pt(sz); f.bold = b_; f.color.rgb = RGBColor.from_string(w_)

    def bk(xx, yy, ww, hh, isi, bentuk=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.5):
        b = sk.shapes.add_shape(bentuk, Emu(int(xx)), Emu(int(yy)), Emu(int(ww)), Emu(int(hh)))
        if adj is not None and bentuk == MSO_SHAPE.ROUNDED_RECTANGLE: b.adjustments[0] = adj
        b.fill.solid(); b.fill.fore_color.rgb = RGBColor.from_string(isi); b.line.fill.background(); b.shadow.inherit = False

    tk(X0c, y0c, Wc, 160000, [('KELOMPOK API AKTIF (CLUSTER), 16 NOV', '051C2C', True, 7.5)])
    tk(X0c, y0c, Wc, 160000, [(str(A_['kaw_komp']), '051C2C', True, 11)], PP_ALIGN.RIGHT)
    by_ = y0c + 230000; xx = X0c; tot = sum(n_.values())
    MIN_ = 200000   # ruas kecil tetap muat angkanya; sisa lebar dibagi proporsional
    ada_ = [k_ for k_, *_ in TINGKAT if n_[k_]]
    sisa_ = Wc - 30000 * (len(ada_) - 1) - MIN_ * len(ada_)
    for kode, nama, w_, _ in TINGKAT:
        if not n_[kode]: continue
        ww = MIN_ + sisa_ * n_[kode] / tot
        bk(xx, by_, ww, 200000, w_, adj=0.5)
        tk(xx, by_, ww, 200000, [(str(n_[kode]), 'FFFFFF' if kode == '2' else '051C2C', True, 8)], PP_ALIGN.CENTER)
        xx += ww + 30000
    ry_ = by_ + 290000
    for kode, nama, w_, arti in TINGKAT:
        bk(X0c, ry_ + 40000, 110000, 110000, w_, MSO_SHAPE.OVAL, None)
        tk(X0c + 170000, ry_, Wc - 170000, 190000, [(f'{nama} {n_[kode]}: ', '051C2C', True, 7.5), (arti, '4B5563', False, 7)])
        ry_ += 220000
    kaw_ = ', '.join(t for t, _ in KC_['unsur'])
    tk(X0c, ry_ + 30000, Wc, 190000, [('Kawasan: ', '051C2C', True, 7.5), (kaw_, '4B5563', False, 7)])
    assert ry_ + 220000 < 6150000, ry_

tt = ''.join(x.text_frame.text for sl in p.slides for x in sl.shapes if x.has_text_frame)
assert '·' not in tt and '—' not in tt
p.save(OUT)
print('ok', OUT, {k: (KEC[k]['belum'][-1], HOT16[k], sum(KEC[k]['padam']), PEN[k]['komp']) for k in KEC})
