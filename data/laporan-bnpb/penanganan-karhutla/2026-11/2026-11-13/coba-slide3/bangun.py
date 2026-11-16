"""Coba-coba slide 3 (Operasi) Laporan Penanganan Karhutla 131126 dengan tata letak baru (pemilik 13 Nov 2026: "buat versi yang lebih bagus
untuk desain dan layoutnya", deck slide 3 saja). Bukan deck resmi; deck resmi tetap Revisi 2.

Bentuk: empat ubin angka (armada, water bombing, OMC, hujan) di atas satu matriks per provinsi (armada tergelar, patroli udara,
water bombing, hujan 12 Nov). Isi dari wa-satgas.txt (laporan satgas 13 Nov, kegiatan 12 Nov). Kerangka (judul, logo, ikon) diambil dari
slide 3 berkas generator, lalu dibingkai lewat lewat_deck.bingkai seperti deck resmi.

    PYTHONUTF8=1 DECK_BNPB=~/.claude/skills/ppt-konsultan/bnpb python bangun.py
"""
import copy, datetime as dt, os, shutil, sys
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Pt

S = os.path.dirname(os.path.abspath(__file__)); D13 = os.path.dirname(S)
G = os.path.normpath(os.path.join(D13, '..', '..', '..', 'generator')); sys.path.insert(0, G)
SUMBER = os.path.join(D13, 'Laporan Penanganan Pengendalian Karhutla 131126 (generator).pptx')
NAMA = os.path.join(S, 'Operasi Penanganan Karhutla 131126 (coba tata letak).pptx')

NAVY, ORANYE, BIRU, ABU, TEKS, TEKS2 = '051C2C', 'D9600B', '4A9BE0', '6B7280', '1A1A1A', '2E3440'
LATAR, LATAR2, GARIS, PUDAR = 'F3F5F8', 'E6EAF0', 'D5D9DE', 'BFC5CC'
X0, LEBAR = 548640, 11094415   # tepi kiri dan lebar isi (sama dengan garis judul)
Y_ISI, Y_KAKI = 1325880, 6400800


def warna(h): return RGBColor.from_string(h)


def kotak(s, x, y, w, h, isi=None, garis=None, bentuk=MSO_SHAPE.RECTANGLE):
    b = s.shapes.add_shape(bentuk, Emu(x), Emu(y), Emu(w), Emu(h))
    if isi: b.fill.solid(); b.fill.fore_color.rgb = warna(isi)
    else: b.fill.background()
    if garis: b.line.color.rgb = warna(garis); b.line.width = Emu(6350)
    else: b.line.fill.background()
    b.shadow.inherit = False
    st = b._element.find(qn('p:style'))   # gaya bawaan python-pptx memakai schemeClr (D-9)
    if st is not None: b._element.remove(st)
    if bentuk == MSO_SHAPE.ROUNDED_RECTANGLE: b.adjustments[0] = 0.5
    return b


def teks(s, x, y, w, h, baris, rata=PP_ALIGN.LEFT, jangkar=MSO_ANCHOR.MIDDLE, spasi=None):
    """baris: [[(teks, pt, tebal, hex, spc)...], ...] satu daftar run per paragraf."""
    t = s.shapes.add_textbox(Emu(x), Emu(y), Emu(w), Emu(h)); f = t.text_frame
    f.word_wrap = True; f.vertical_anchor = jangkar
    for a in ('margin_left', 'margin_right', 'margin_top', 'margin_bottom'): setattr(f, a, 0)
    for i, runs in enumerate(baris):
        p = f.paragraphs[0] if i == 0 else f.add_paragraph(); p.alignment = rata
        if spasi and i: p.space_before = Pt(spasi)
        for isi, pt, tebal, hx, *spc in runs:
            r = p.add_run(); r.text = isi; r.font.size = Pt(pt); r.font.bold = tebal; r.font.name = 'Roboto'; r.font.color.rgb = warna(hx)
            if spc: r.font._element.get_or_add_rPr().set('spc', str(spc[0])) if False else r._r.get_or_add_rPr().set('spc', str(spc[0]))
    return t


def pil(s, x, y, label, isi, tulisan='FFFFFF'):
    w = int(len(label) * 62000 + 228600)
    kotak(s, x, y, w, 155448, isi, bentuk=MSO_SHAPE.ROUNDED_RECTANGLE)
    teks(s, x, y, w, 155448, [[(label, 7.5, True, tulisan, 50)]], rata=PP_ALIGN.CENTER).text_frame.word_wrap = False
    return w


prs = Presentation(SUMBER)
# hanya slide 3 yang dipakai
lst = prs.slides._sldIdLst
for sid in list(lst)[:2]:
    prs.part.drop_rel(sid.get(qn('r:id'))); lst.remove(sid)
s = prs.slides[0]
ikon = {}
for sh in list(s.shapes):
    if sh.shape_type == 13:
        ikon[(sh.left, sh.top)] = sh._element
    if sh.top >= Y_ISI and sh.top < 6446520 or sh.top in (1325880, 1399032, 1389888) or (sh.shape_type == 13 and sh.top >= 1300000):
        sh._element.getparent().remove(sh._element)
IKON = {'armada': ikon[(6383884, 2432304)], 'patroli': ikon[(7590892, 2555748)], 'heli': ikon[(8969807, 2555748)],
        'cuaca': ikon[(749808, 2377440)], 'hujan': ikon[(717804, 2775204)], 'semai': ikon[(717804, 4891532)]}


def pasang_ikon(nama, x, y, d):
    e = copy.deepcopy(IKON[nama]); s.shapes._spTree.append(e)
    e.xpath('.//a:off')[0].set('x', str(x)); e.xpath('.//a:off')[0].set('y', str(y))
    e.xpath('.//a:ext')[0].set('cx', str(d)); e.xpath('.//a:ext')[0].set('cy', str(d))
    ids = [int(i) for i in s.shapes._spTree.xpath('.//p:cNvPr/@id')]
    e.xpath('.//p:cNvPr')[0].set('id', str(max(ids) + 1))


# subjudul: angka kunci di depan, tanpa personel (pemilik 10 Nov)
for sh in s.shapes:
    if sh.has_text_frame and sh.top == 905256:
        f = sh.text_frame; p = f.paragraphs[0]
        for r in list(p.runs)[1:]: r._r.getparent().remove(r._r)
        for e in p._p.findall(qn('a:pPr'))[1:]: p._p.remove(e)
        for q in f.paragraphs[1:]: q._p.getparent().remove(q._p)
        r0 = p.runs[0]
        isi = [('9', True), (' armada udara tergelar, ', False), ('37 kali', True), (' water bombing di Kalimantan Tengah, ', False),
               ('tanpa OMC', True), (', hujan di ', False), ('4 provinsi', True)]
        r0.text = isi[0][0]
        for t_, sorot in isi[1:]:
            r = copy.deepcopy(r0._r); p._p.append(r)
        for r, (t_, sorot) in zip(p.runs, isi):
            r.text = t_; r.font.color.rgb = warna(ORANYE if sorot else TEKS2); r.font.bold = False

# ---- ubin angka
UBIN = [('armada', 'ARMADA UDARA', '9', 'unit', '3 patroli/CASA/OMC, 6 heli water bombing', NAVY),
        ('heli', 'WATER BOMBING', '37', 'kali', '2 sortie UR-CSN di Seranau, Kotawaringin Timur, padam ±2 ha', ORANYE),
        ('semai', 'MODIFIKASI CUACA', '0', 'sortie', 'tanpa penyemaian NaCl dan dry ice di enam provinsi', ABU),
        ('hujan', 'HUJAN DILAPORKAN', '4', 'provinsi', 'Kalimantan Tengah, Kalimantan Selatan, Sumatera Selatan, dan Jambi', BIRU)]
JEDA = 137160; WU = (LEBAR - 3 * JEDA) // 4; HU = 777240
for k, (ik, lab, ang, sat, ket, aks) in enumerate(UBIN):
    x = X0 + k * (WU + JEDA)
    kotak(s, x, Y_ISI, WU, HU, LATAR)
    kotak(s, x, Y_ISI, 45720, HU, aks)
    kotak(s, x + 155448, Y_ISI + 118872, 274320, 274320, NAVY, bentuk=MSO_SHAPE.OVAL)
    pasang_ikon(ik, x + 155448 + 54864, Y_ISI + 118872 + 54864, 164592)
    teks(s, x + 502920, Y_ISI + 118872, WU - 548640, 274320, [[(lab, 8, True, ABU, 100)]])
    teks(s, x + 502920, Y_ISI + 118872, WU - 548640, 274320, [[(ang, 24, True, NAVY), (' ' + sat, 10, False, TEKS2)]], rata=PP_ALIGN.RIGHT)
    teks(s, x + 155448, Y_ISI + 438912, WU - 274320, 292608, [[(ket, 8.5, False, TEKS2)]], jangkar=MSO_ANCHOR.TOP)

# ---- matriks per provinsi
KOL = [('PROVINSI', 1737360), ('ARMADA TERGELAR', 2011680), ('PATROLI UDARA', 2423160), ('WATER BOMBING', 2468880), ('HUJAN 12 NOV', 0)]
KOL[-1] = (KOL[-1][0], LEBAR - sum(w for _, w in KOL[:-1]))
YT = Y_ISI + HU + 182880; HT = 246888
kotak(s, X0, YT, LEBAR, HT, NAVY)
x = X0
for k, (lab, w) in enumerate(KOL):
    teks(s, x + (137160 if k else 182880), YT, w - 182880, HT, [[(lab, 8, True, 'FFFFFF', 100)]])
    x += w

# (provinsi, patroli, wb, [patroli: status, ket], [wb: status, ket], hujan: (pil, warna pil, ket), status aktif patroli/wb)
P = [('Kalimantan Tengah', 1, 2, ('Tidak terbang', 'PK-KIA dan PK-DAP siaga; PK-FPU kontrak habis', False),
      ('2 sortie, 37 kali', 'UR-CSN di Seranau, Kotawaringin Timur, padam ±2 ha', True), ('HUJAN RINGAN', BIRU, 'Kawasan TNTP; padam ±20 ha pada 2 FS')),
     ('Sumatera Selatan', 1, 1, ('1 sortie, 4 FS', 'PK-IKC menemukan 4 FS seluas ±17 ha di Banyuasin', True),
      ('Tidak terbang', 'RA-22747 tertahan hujan, UR-VBC rusak mesin', False), ('HUJAN RINGAN', BIRU, 'Kota Palembang, siang hingga sore')),
     ('Jambi', 1, 1, ('Siaga', 'PK-WSA dan PK-ALA siaga di pangkalan', False),
      ('Siaga', 'disiagakan sesuai kebutuhan; RA-22840 dalam perawatan', False), ('HUJAN RINGAN–LEBAT', BIRU, 'Tanjung Jabung Timur, Tebo, Bungo, Kota Jambi, Muaro Jambi')),
     ('Kalimantan Barat', 0, 1, ('Selesai', 'Satgas Udara berakhir 10 Nov 2026', False),
      ('Selesai', 'tidak ada water bombing sejak 10 Nov', False), ('BELUM ADA LAPORAN', PUDAR, 'hujan terakhir dilaporkan 10 Nov')),
     ('Papua Barat Daya', 0, 1, ('Tanpa armada patroli', 'hanya heli water bombing yang tergelar', False),
      ('Tanpa laporan', 'laporan satgas tidak memuat kegiatan 12 Nov', False), ('BELUM ADA LAPORAN', PUDAR, 'tidak ada laporan hujan 12 Nov')),
     ('Riau', 0, 0, ('1 sortie, nihil FS', 'PK-WSD, TN Zamrud sampai SM Giam Siak Kecil', True),
      ('Tidak terbang', 'tanpa FS sasaran; 2 FS dipadamkan tim darat', False), ('BELUM ADA LAPORAN', PUDAR, 'OMC Riau berakhir 25 Sep 2026')),
     ('Kalimantan Selatan', 0, 0, ('Tidak terbang', 'demobilisasi; Satgas Udara selesai 11 Nov', False),
      ('Tidak terbang', 'armada demobilisasi', False), ('HUJAN RINGAN', BIRU, 'Banjarmasin, Banjar, Balangan, Tanah Laut, dan dua kabupaten'))]
y0 = YT + HT; HB = (Y_KAKI - y0) // len(P); SAT = 393192   # lebar satu unit armada
for i, (nama, pat, wb, pp, ww, hj) in enumerate(P):
    y = y0 + i * HB
    if i % 2: kotak(s, X0, y, LEBAR, HB, LATAR)
    kotak(s, X0, y + HB - 6350, LEBAR, 6350, GARIS)
    x = X0
    teks(s, x + 182880, y, KOL[0][1] - 182880, HB, [[(nama, 10.5, True, TEKS)]]); x += KOL[0][1]
    # armada: bilah per unit, patroli navy lalu heli oranye, jumlah di kanan
    bx = x + 137160; by = y + (HB - 228600) // 2
    if pat + wb:
        for n, hx in ((pat, NAVY), (wb, ORANYE)):
            if n:
                kotak(s, bx, by, n * SAT, 228600, hx); teks(s, bx, by, n * SAT, 228600, [[(str(n), 9, True, 'FFFFFF')]], rata=PP_ALIGN.CENTER); bx += n * SAT
        teks(s, bx + 91440, by, 640080, 228600, [[(str(pat + wb), 12, True, NAVY), (' unit', 8, False, ABU)]])
    else:
        teks(s, bx, y, KOL[1][1] - 182880, HB, [[('tidak ada armada tergelar' if nama != 'Riau' else 'PK-WSD di luar daftar gelar', 8.5, False, ABU)]])
    x += KOL[1][1]
    for (st, ket, aktif), w in ((pp, KOL[2][1]), (ww, KOL[3][1])):
        teks(s, x + 137160, y, w - 228600, HB, [[(st, 10, True, (ORANYE if aktif else NAVY) if aktif or st not in ('Tidak terbang', 'Selesai', 'Tanpa laporan', 'Tanpa armada patroli') else ABU)],
                                                [(ket, 8, False, TEKS2)]], spasi=1)
        x += w
    lab, hx, ket = hj
    py = y + (HB - 155448 - 36576 - 256032) // 2
    pil(s, x + 137160, py, lab, hx, 'FFFFFF' if hx == BIRU else TEKS2)
    teks(s, x + 137160, py + 155448 + 36576, KOL[4][1] - 228600, 256032, [[(ket, 8, False, TEKS2)]], jangkar=MSO_ANCHOR.TOP)

# legenda armada di kanan kepala tabel tidak perlu: warna bilah dijelaskan di ubin pertama
prs.save(NAMA)
print('isi', NAMA)

import lewat_deck, pdf
try:
  lewat_deck.bingkai(NAMA, 'penanganan', 'Laporan Penanganan Pengendalian Karhutla', 'Cut-off data 13 Nov 2026, 18.00 WIB', dt.date(2026, 11, 13), pdf=False,
      tanpa_kepada='coba tata letak slide operasi, bukan deck kirim',
      bagian=[{'judul': 'Operasi Penanganan', 'label': 'Operasi', 'halaman_tetap': [1]}],
      spek_tambah={'panel_sisi': 'gelap', 'skala_logo_bnpb': 1.0},
      susun=[{'halaman': 1, 'bagian': 1, 'sumber': 'Laporan Penanganan Karhutla Satgas, 13 Nov 2026 (kegiatan 12 Nov 2026)'}])
except RuntimeError as e:   # pil CUT OFF hanya di slide 1 deck resmi; deck coba ini memang hanya halaman Operasi
  assert 'CUT OFF' in str(e), e; print('dilewati:', e)
print('pdf', pdf.ke_pdf(NAMA))
