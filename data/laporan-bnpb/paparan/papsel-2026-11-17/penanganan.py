"""Slide Penanganan (tampil ke-5) untuk Paparan Karhutla Papua Selatan 171126, ditambahkan sesudah buat.py.

Bingkai (judul, cut-off, kartu atas, KRIS, kaki) disalin dari slide Hasil Pemadaman; isi digambar ulang.
Sumber penanganan (pemilik 17 Nov: "termasuk penanganannya kalau ada info, coba lihat di berita bnpb"):
- siaran pers BNPB 838, 839, 840 (31 Okt 2026) dan konferensi pers BNPB 2 Nov 2026 (dikutip Liputan6);
- daftar OMC BMKG (public/udara/data/omc_bmkg.json): Papua Selatan 22 Okt s.d. 9 Nov 2026;
- laporan Satgas enam provinsi prioritas 9-16 Nov (../../penanganan-karhutla/2026-11/*/wa-satgas.txt): Papua Selatan 2 unit
  patroli/Casa/OMC di laporan 9-12 Nov, hilang sejak laporan 13 Nov; tidak pernah ada helikopter water bombing Papua Selatan.
Laporan harian BNPB (Perkembangan Situasi dan Penanganan Bencana) 9-17 Nov tidak memuat karhutla Papua Selatan.
Foto: BNPB/Danung Arifin, diunduh ke foto/ (tidak di-commit).

    python penanganan.py keluar.pptx keluar.pptx
"""
import copy
import os
import sys

from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Pt

SRC, OUT = sys.argv[1], sys.argv[2]
DIR = os.path.dirname(os.path.abspath(__file__))
NAVY, ABU, TEKS, ORANYE, MERAH = '051C2C', '6B7280', '2E3440', 'D9600B', 'C8102E'

p = Presentation(SRC)
asal = p.slides[3]                                  # Hasil Pemadaman
assert asal.shapes.title is None or True
judul_asal = [s for s in asal.shapes if s.has_text_frame and s.text_frame.text.startswith('Hasil Pemadaman')]
assert judul_asal, 'slide ke-4 bukan Hasil Pemadaman'

baru = p.slides.add_slide(asal.slide_layout)
for sh in list(baru.shapes):
    sh._element.getparent().remove(sh._element)
peta_rid = {}
for rid, rel in asal.part.rels.items():
    if 'image' in rel.reltype:
        peta_rid[rid] = baru.part.relate_to(rel._target, rel.reltype)
pohon = baru.shapes._spTree
for el in asal.shapes._spTree.iterchildren():
    if el.tag in (qn('p:nvGrpSpPr'), qn('p:grpSpPr')):
        continue
    off = el.find('.//' + qn('a:off'))
    y = int(off.get('y')) if off is not None else 0
    if 2200000 < y < 6200000:                       # isi lama dibuang, bingkai dan kartu atas disimpan
        continue
    e = copy.deepcopy(el)
    for b in e.iter(qn('a:blip')):
        b.set(qn('r:embed'), peta_rid[b.get(qn('r:embed'))])
    pohon.append(e)

# urutan: sesudah Hasil Pemadaman, sebelum Banjir
lst = p.slides._sldIdLst
ids = list(lst)
lst.remove(ids[-1]); lst.insert(4, ids[-1])


def by_id(i):
    return next(s for s in baru.shapes if s.shape_id == i)


def set_teks(sh, runs):
    """runs: daftar (teks, warna|None, tebal|None); rPr run pertama jadi pola."""
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
        if warna:
            rp.find('.//' + qn('a:srgbClr')).set('val', warna)
        if tebal is not None:
            rp.set('b', '1' if tebal else '0')


# judul, subjudul, kaki, nomor halaman
for sh in baru.shapes:
    if not sh.has_text_frame: continue
    t = sh.text_frame.text
    if t.startswith('Hasil Pemadaman'):
        set_teks(sh, [('Penanganan Karhutla di ', None, None), ('Papua Selatan', ORANYE, None), (', 9–16 November', '1A1A1A', None)])
    elif t.startswith('Cluster aktif turun'):
        set_teks(sh, [('Armada udara Papua Selatan tercatat sampai 12 Nov:', MERAH, True),
                      (' 2 pesawat patroli dan modifikasi cuaca; 13–16 Nov tanpa armada udara, belum padam 275 ha pada 16 Nov', TEKS, False)])
    elif t.startswith('*Data berdasarkan'):
        set_teks(sh, [('Sumber: siaran pers BNPB 31 Okt, konferensi pers BNPB 2 Nov, daftar OMC BMKG, laporan Satgas Karhutla 9–16 Nov 2026. Belum padam dari data satelit.', None, None)])
    elif t.strip() == '4' and sh.left > 10000000:
        set_teks(sh, [('5', None, None)])
for sh in p.slides[5].shapes:                       # Banjir pindah ke halaman 6
    if sh.has_text_frame and sh.text_frame.text.strip() == '5' and sh.left > 10000000:
        set_teks(sh, [('6', None, None)])

# kartu atas
set_teks(by_id(304), [('OPERASI UDARA', None, None)])
set_teks(by_id(328), [('PERLU PERHATIAN', None, None)])
KARTU = {308: '2 unit', 309: 'pesawat patroli dan OMC 9–12 Nov', 313: '17 sorti', 314: 'OMC 22 Okt–2 Nov, 17 ton garam',
         318: '0 unit', 319: 'helikopter water bombing', 332: '4 hari', 333: 'tanpa armada udara',
         337: '275 ha', 338: 'belum padam 16 Nov'}
for i, t in KARTU.items():
    set_teks(by_id(i), [(t, None, None)])
# nilai kartu biru tua; kartu "0 unit" merah
for i in (308, 313): by_id(i).text_frame.paragraphs[0].runs[0]._r.find('.//' + qn('a:srgbClr')).set('val', NAVY)
for i in (318, 332, 337): by_id(i).text_frame.paragraphs[0].runs[0]._r.find('.//' + qn('a:srgbClr')).set('val', MERAH)


def ganti_ikon(pic_id, nama):
    lama = by_id(pic_id)
    x, y, w, h = lama.left, lama.top, lama.width, lama.height
    lama._element.getparent().remove(lama._element)
    baru.shapes.add_picture(os.path.join(DIR, 'ik', f'lpg-ik-{nama}.png'), x, y, w, h)


ganti_ikon(307, 'pesawat-navy'); ganti_ikon(312, 'tetes-navy'); ganti_ikon(317, 'segitiga-merah')
ganti_ikon(331, 'kalender-merah'); ganti_ikon(336, 'api-merah')


# ---------------------------------------------------------------- pembantu gambar
def kotak(x, y, w, h, isi=None, garis=None, bentuk=MSO_SHAPE.RECTANGLE, adj=None):
    s = baru.shapes.add_shape(bentuk, Emu(x), Emu(y), Emu(w), Emu(h))
    if adj is not None: s.adjustments[0] = adj
    if isi: s.fill.solid(); s.fill.fore_color.rgb = RGBColor.from_string(isi)
    else: s.fill.background()
    if garis: s.line.color.rgb = RGBColor.from_string(garis); s.line.width = Emu(9525)
    else: s.line.fill.background()
    s.shadow.inherit = False
    s.text_frame.text = ''
    return s


def teks(x, y, w, h, runs, sz=1000, algn=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, wrap=True, spasi=None):
    tb = baru.shapes.add_textbox(Emu(x), Emu(y), Emu(w), Emu(h))
    tf = tb.text_frame; tf.word_wrap = wrap; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    par = tf.paragraphs[0]; par.alignment = algn
    if spasi: par.line_spacing = spasi
    for t, warna, tebal, *uk in runs:
        r = par.add_run(); r.text = t
        f = r.font; f.name = 'Roboto'; f.size = Pt((uk[0] if uk else sz) / 100); f.bold = bool(tebal)
        f.color.rgb = RGBColor.from_string(warna or TEKS)
        rp = r._r.get_or_add_rPr()
        for tag in ('a:ea', 'a:cs'):
            e = etree.SubElement(rp, qn(tag)); e.set('typeface', 'Roboto')
    return tb


def kepala_panel(x, y, w, judul, angka, ikon, latar='E6EAF0', bulat=NAVY):
    kotak(x, y, w, 465139, latar, bentuk=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.16)
    kotak(x, y + 280671, w, 182880, latar)          # sudut bawah kepala rata
    kotak(x + 128016, y + 86265, 292608, 292608, bulat, bentuk=MSO_SHAPE.OVAL)
    baru.shapes.add_picture(os.path.join(DIR, 'ik', f'lpg-ik-{ikon}-putih.png'), Emu(x + 182880), Emu(y + 141129), Emu(182880), Emu(182880))
    teks(x + 502920, y + 74422, w - 1300000, 316294, [(judul, '1A1A1A', True, 1100)], anchor=MSO_ANCHOR.MIDDLE, wrap=False)
    if angka:
        teks(x + w - 1100000, y + 55817, 980000, 353505, [(angka, bulat, True, 1600)], algn=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE, wrap=False)


Y0, Y1 = 2260273, 6130000
# ---------------------------------------------------------------- panel kiri: linimasa penanganan
XL, WL = 548640, 6450000
kotak(XL, Y0, WL, Y1 - Y0, 'FFFFFF', 'BFC5CC', MSO_SHAPE.ROUNDED_RECTANGLE, 0.03)
kepala_panel(XL, Y0, WL, 'Penanganan yang tercatat', '6', 'perisai')
BARIS = [
    ('22 Okt–9 Nov', NAVY, 'Operasi modifikasi cuaca (OMC) BNPB dan BMKG', ' dari Posko Lanud J.A. Dimara, Merauke. Sampai 2 Nov: 17 sorti, 17 ton garam (NaCl) ditebar di Merauke dan Boven Digoel.'),
    ('30–31 Okt', NAVY, 'Kepala BNPB dan Kepala BMKG ke Merauke:', ' rapat koordinasi karhutla dan kekeringan di Kantor Bupati Merauke, lalu peninjauan udara dengan helikopter Caracal TNI AD.'),
    ('31 Okt', NAVY, 'Bantuan peralatan pemadaman Rp177 juta', ' dari BNPB ke Pemerintah Kabupaten Merauke, disalurkan lewat Kelompok Masyarakat Peduli Api.'),
    ('2 Nov', NAVY, 'Status Tanggap Darurat', ' telah ditetapkan Gubernur Papua Selatan dan Bupati Merauke (konferensi pers BNPB 2 Nov).'),
    ('9–12 Nov', ORANYE, '2 unit pesawat patroli dan OMC tergelar', ' di Papua Selatan (laporan Satgas Karhutla). Tidak ada helikopter water bombing di Papua Selatan.'),
    ('13–16 Nov', MERAH, 'Papua Selatan tidak lagi tercantum', ' dalam gelar armada udara. Pemadaman darat Papua Selatan tidak masuk laporan harian BNPB maupun laporan Satgas.'),
]
yb = Y0 + 465139 + 90000
tinggi = (Y1 - 60000 - yb) / len(BARIS)
for k, (tgl, warna, tebal, isi) in enumerate(BARIS):
    y = int(yb + k * tinggi)
    kotak(XL + 128016, y + 40000, 1050000, 210000, warna, bentuk=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.5)
    teks(XL + 128016, y + 40000, 1050000, 210000, [(tgl, 'FFFFFF', True, 800)], algn=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, wrap=False)
    teks(XL + 1290000, y + 22000, WL - 1290000 - 150000, int(tinggi) - 40000, [(tebal, '1A1A1A', True, 950), (isi, TEKS, False, 950)], spasi=1.05)
    if k < len(BARIS) - 1:
        g = baru.shapes.add_connector(1, Emu(XL + 128016), Emu(int(y + tinggi - 8000)), Emu(XL + WL - 128016), Emu(int(y + tinggi - 8000)))
        g.line.color.rgb = RGBColor.from_string('E6EAF0'); g.line.width = Emu(9525)

# ---------------------------------------------------------------- panel kanan: dokumentasi BNPB
XR = XL + WL + 137160
WR = 11643055 - XR
kotak(XR, Y0, WR, Y1 - Y0, 'FFFFFF', 'BFC5CC', MSO_SHAPE.ROUNDED_RECTANGLE, 0.03)
kepala_panel(XR, Y0, WR, 'Dokumentasi BNPB di Merauke', None, 'mata')
FOTO = [('tinjau-31okt.jpg', 0.45, 'Peninjauan udara Kepala BNPB dan Kepala BMKG dengan helikopter Caracal TNI AD, Merauke, 31 Okt 2026.'),
        ('omc-31okt.jpg', 0.15, 'Kepala BNPB dan Kepala BMKG meninjau posko OMC di Lanud J.A. Dimara, Merauke, 31 Okt 2026.')]
fw = WR - 2 * 128016
yf = Y0 + 465139 + 100000
cap = 330000
fh = int((Y1 - 80000 - yf - 2 * cap - 90000) / 2)
from PIL import Image  # noqa: E402
for k, (nama, bias, ket) in enumerate(FOTO):
    y = yf + k * (fh + cap + 90000)
    pic = baru.shapes.add_picture(os.path.join(DIR, 'foto', nama), Emu(XR + 128016), Emu(y), Emu(fw), Emu(fh))
    w, h = Image.open(os.path.join(DIR, 'foto', nama)).size
    potong = 1 - (w * fh / fw) / h                  # bagian tinggi yang dibuang supaya rasio sama, foto tidak gepeng
    assert 0 <= potong < 0.6, (nama, potong)
    pic.crop_top, pic.crop_bottom = potong * bias, potong * (1 - bias)
    teks(XR + 128016, y + fh + 50000, fw, cap - 60000, [(ket, TEKS, False, 800), (' Foto: BNPB/Danung Arifin', ABU, False, 750)], spasi=1.0)

tt = ''.join(s.text_frame.text for s in baru.shapes if s.has_text_frame)
assert '·' not in tt and '—' not in tt and 'Pantau Bencana' not in tt
p.save(OUT)
print('ok', OUT, 'slide', len(p.slides))
