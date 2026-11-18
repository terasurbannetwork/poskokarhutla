"""Tab indikator dan kaki halaman baru (mesin ppt-konsultan deck.py, 17 Nov 2026) dipasang di deck Revisi 2.

Pemilik 17 Nov: deck bertab dari nol kalah bagus; "yg sebelumnya tambahin tab indicator sama footer yang baru".
Bentuk dan ukuran disalin dari keluaran deck.py (proyek-papsel1711): garis tab di y 17 pt, label 8 pt, tab aktif navy tebal bergaris
oranye; kaki = pita navy bersudut bulat berisi "Sumber: ...", hak cipta, dan nomor halaman. Catatan kaki lama dan kaki lama dibuang.

    python bingkai_baru.py keluar6.pptx keluar7.pptx
"""
import copy
import sys

from lxml import etree
from pptx import Presentation
from pptx.oxml.ns import qn

SRC, OUT = sys.argv[1], sys.argv[2]
NS = 'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"'
X0, W = 548640, 11094720
TAB = ['Papua Selatan', 'Kab. Merauke', 'Kecamatan Siaga', 'Hasil pemadaman', 'Penanganan']
AKTIF = [0, 1, 2, 2, 3, 4]   # slide 3-4 (Pulau Kimaam, Naukenjerai-Sota) di bawah satu tab Kecamatan Siaga (pemilik 17 Nov)
SATELIT = 'Sistem karhutla BNPB (NASA FIRMS VIIRS dan MODIS, tanpa panas industri), cut-off 16 Nov 2026 24.00 WIB'
SUMBER = [SATELIT + '; kecamatan 11–16 Nov',
          SATELIT + '; kecamatan 11–16 Nov',
          SATELIT + '; kecamatan 11–16 Nov',
          SATELIT + '; kecamatan 11–16 Nov',
          SATELIT,
          'Siaran pers BNPB 31 Okt 2026, konferensi pers BNPB 2 Nov 2026, daftar OMC BMKG, laporan Satgas Karhutla 9–16 Nov 2026']
NAVY, ORANYE, ABU = '051C2C', 'D9600B', '6B7280'


def sp(xml):
    return etree.fromstring(f'<p:sp {NS}>{xml}</p:sp>')


def run(t, sz, warna, b=False, i=False):
    return (f'<a:r><a:rPr lang="id-ID" sz="{sz}" b="{int(b)}" i="{int(i)}"><a:solidFill><a:srgbClr val="{warna}"/></a:solidFill>'
            f'<a:latin typeface="Roboto"/><a:ea typeface="Roboto"/><a:cs typeface="Roboto"/></a:rPr><a:t>{t}</a:t></a:r>')


def kotak(nid, nama, x, y, w, h, isi, geom='rect', adj=''):
    av = f'<a:gd name="adj" fmla="val {adj}"/>' if adj else ''
    return sp(f'<p:nvSpPr><p:cNvPr id="{nid}" name="{nama}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/>'
              f'<a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="{geom}"><a:avLst>{av}</a:avLst></a:prstGeom><a:solidFill><a:srgbClr val="{isi}"/>'
              '</a:solidFill><a:ln><a:noFill/></a:ln></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="id-ID"/></a:p></p:txBody>')


def teks(nid, nama, x, y, w, h, runs, algn, rins=0):
    return sp(f'<p:nvSpPr><p:cNvPr id="{nid}" name="{nama}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="{x}" y="{y}"/>'
              f'<a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody>'
              f'<a:bodyPr wrap="none" lIns="0" tIns="0" rIns="{rins}" bIns="0" anchor="ctr"><a:noAutofit/></a:bodyPr><a:lstStyle/>'
              f'<a:p><a:pPr algn="{algn}"/>{runs}</a:p></p:txBody>')


def garis(nid, y, warna):
    return etree.fromstring(f'<p:cxnSp {NS}><p:nvCxnSpPr><p:cNvPr id="{nid}" name="Garis tab"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr>'
                            f'<a:xfrm><a:off x="{X0}" y="{y}"/><a:ext cx="{W}" cy="0"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom>'
                            f'<a:ln w="9525"><a:solidFill><a:srgbClr val="{warna}"/></a:solidFill></a:ln></p:spPr></p:cxnSp>')


p = Presentation(SRC)
# slide 6 Musim hujan dihapus (pemilik 17 Nov: "slide 6 hapus aja")
for k, sl in enumerate(list(p.slides)):
    if any(x.has_text_frame and x.text_frame.text.startswith('Waspada peralihan musim') for x in sl.shapes):
        sid = p.slides._sldIdLst[k]; p.part.drop_rel(sid.rId); p.slides._sldIdLst.remove(sid)
assert len(p.slides) == len(AKTIF) == len(SUMBER)
for n, s in enumerate(p.slides):
    pohon = s.shapes._spTree
    for sh in list(s.shapes):   # kaki lama, nomor lama, catatan kaki dan bilahnya
        t = sh.text_frame.text.strip() if sh.has_text_frame else ''
        if sh.top >= 6500000 and (t.startswith('Badan Nasional') or t.isdigit()):
            pohon.remove(sh._element)
        elif 5900000 <= sh.top < 6440000 and (t.startswith('*') or t.startswith('Sumber:') or (sh.width < 60000 and sh.height < 200000)):
            pohon.remove(sh._element)
    nid = 9000
    pohon.append(garis(nid, 215900, 'BFC5CC'))
    lw = W // len(TAB)
    for k, nama in enumerate(TAB):
        aktif = k == AKTIF[n]
        runs = run(f'{k + 1:02d}  ', 800, ORANYE if aktif else ABU, True) + run(nama, 800, NAVY if aktif else ABU, aktif)
        pohon.append(teks(nid + 1 + k, f'Tab {k + 1}', X0 + k * lw, 25400, lw, 177800, runs, 'ctr'))
        if aktif:
            pohon.append(kotak(nid + 20, 'Tab aktif', X0 + k * lw + 76200, 200025, lw - 152400, 31750, ORANYE))
    assert len(SUMBER[n]) <= 125, (n, len(SUMBER[n]))
    pohon.append(kotak(nid + 30, 'Pita kaki', X0, 6510020, W, 297180, NAVY, 'roundRect', 17094))
    pohon.append(kotak(nid + 31, 'Bilah sumber', 650240, 6592570, 38100, 132080, '4A9BE0'))
    pohon.append(teks(nid + 32, 'Sumber', 751840, 6510020, 7127746, 297180, run('Sumber: ', 860, 'FFFFFF', True) + run(SUMBER[n], 860, 'FFFFFF', i=True), 'l'))
    pohon.append(teks(nid + 33, 'Hak cipta', 8031986, 6510020, 2808734, 297180, run('© 2026 Badan Nasional Penanggulangan Bencana', 980, 'C9D1E3'), 'r'))
    pohon.append(teks(nid + 34, 'Nomor', 11094720, 6510020, 548640, 297180, run(str(n + 1), 980, 'C9D1E3', True), 'r', 127000))
p.save(OUT)
print('ok', OUT)
