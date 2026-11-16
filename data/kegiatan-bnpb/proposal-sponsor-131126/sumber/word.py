"""Mesin Word (.docx) proposal kerja sama sponsor BNPB (13 Nov 2026).

Isi proposal ada di isi_telkom.py dan isi_paragon.py (satu dict ISI per proposal). Gaya disalin dari
data/kegiatan-bnpb/workshop-region-121126/sumber/word.py: Roboto, navy, kepala halaman berlogo KRIS dan BNPB.

    py word.py telkom      -> ../Proposal ... .docx
    py word.py paragon
PDF dibuat dengan LibreOffice: soffice --headless --convert-to pdf.
"""
import importlib, json, os, sys
from pathlib import Path
from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, Cm, RGBColor

D = Path(__file__).resolve().parent
AKAR = D.parents[3]
HOME = os.path.expanduser('~').replace(chr(92), '/') + '/'
SK = HOME + '.claude/skills/ppt-konsultan/bnpb/assets/'
LOGO_BNPB = SK + 'proyek-bnpb/logo/sumber-bnpb.png'
LOGO_KRIS = str(AKAR / 'data/laporan-bnpb/generator/sampul/media/kris-logo.png')
NAVY, ORANYE, TEKS, TEKS2, TEKS3, GARIS, TINT, BIRU = '051C2C', 'D9600B', '1A1A1A', '2E3440', '6B7280', 'BFC5CC', 'F1F3F6', '2F86D1'
LEBAR = 17.0

ISI = importlib.import_module('isi_' + sys.argv[1]).ISI

doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21), Cm(29.7)
sec.left_margin = sec.right_margin = Cm(2.0)
sec.top_margin, sec.bottom_margin = Cm(2.6), Cm(2.0)
sec.header_distance, sec.footer_distance = Cm(0.9), Cm(0.8)


def rgb(h):
    return RGBColor.from_string(h.upper())


def font(r, size=None, bold=None, italic=None, color=None):
    r.font.name = 'Roboto'
    r._element.get_or_add_rPr().get_or_add_rFonts().set(qn('w:eastAsia'), 'Roboto')
    if size: r.font.size = Pt(size)
    if bold is not None: r.font.bold = bold
    if italic is not None: r.font.italic = italic
    if color: r.font.color.rgb = rgb(color)
    return r


st = doc.styles['Normal']
st.font.name = 'Roboto'
st.element.rPr.rFonts.set(qn('w:eastAsia'), 'Roboto')
st.font.size = Pt(10.5)
st.font.color.rgb = rgb(TEKS)
st.paragraph_format.space_after = Pt(6)
st.paragraph_format.line_spacing = 1.25
lang = OxmlElement('w:lang'); lang.set(qn('w:val'), 'id-ID'); st.element.rPr.append(lang)
for nama, size, sb, sa in (('Heading 1', 16, 0, 10), ('Heading 2', 12, 12, 5)):
    h = doc.styles[nama]
    h.font.name = 'Roboto'; h.element.rPr.rFonts.set(qn('w:eastAsia'), 'Roboto')
    h.font.size = Pt(size); h.font.bold = True; h.font.color.rgb = rgb(NAVY); h.font.italic = False
    h.paragraph_format.space_before = Pt(sb); h.paragraph_format.space_after = Pt(sa); h.paragraph_format.keep_with_next = True


def shade(cell, hexw):
    tcPr = cell._element.get_or_add_tcPr()
    s = OxmlElement('w:shd'); s.set(qn('w:val'), 'clear'); s.set(qn('w:color'), 'auto'); s.set(qn('w:fill'), hexw)
    tcPr.append(s)


def borders(tbl, sisi=('bottom', 'insideH'), warna=GARIS, ukur=4):
    tblPr = tbl._element.tblPr
    b = OxmlElement('w:tblBorders')
    for k in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        e = OxmlElement(f'w:{k}')
        if k in sisi:
            e.set(qn('w:val'), 'single'); e.set(qn('w:sz'), str(ukur)); e.set(qn('w:color'), warna)
        else:
            e.set(qn('w:val'), 'nil')
        b.append(e)
    tblPr.append(b)


def margin_sel(tbl, atas=60, kiri=100):
    m = OxmlElement('w:tblCellMar')
    for k, v in (('top', atas), ('bottom', atas), ('left', kiri), ('right', kiri)):
        e = OxmlElement(f'w:{k}'); e.set(qn('w:w'), str(v)); e.set(qn('w:type'), 'dxa'); m.append(e)
    tbl._element.tblPr.append(m)


def lebar_kolom(tbl, persen, total=LEBAR):
    tot = sum(persen)
    tbl.autofit = False
    tblPr = tbl._element.tblPr
    lay = OxmlElement('w:tblLayout'); lay.set(qn('w:type'), 'fixed'); tblPr.append(lay)
    tw = OxmlElement('w:tblW'); tw.set(qn('w:w'), str(int(total / 2.54 * 1440))); tw.set(qn('w:type'), 'dxa')
    for e in tblPr.findall(qn('w:tblW')):
        tblPr.remove(e)
    tblPr.append(tw)
    grid = tbl._element.tblGrid
    for i, gc in enumerate(grid.findall(qn('w:gridCol'))):
        gc.set(qn('w:w'), str(int(total * persen[i] / tot / 2.54 * 1440)))
    for i, col in enumerate(tbl.columns):
        col.width = Cm(total * persen[i] / tot)
        for c in col.cells:
            c.width = Cm(total * persen[i] / tot)


def ulang_kepala(row):
    trPr = row._tr.get_or_add_trPr()
    trPr.append(OxmlElement('w:tblHeader'))
    trPr.append(OxmlElement('w:cantSplit'))


def tulis(p, teks, size=None, color=None, bold=None, italic=None):
    """**tebal** didukung."""
    bagian = teks.split('**')
    for i, b in enumerate(bagian):
        if b:
            font(p.add_run(b), size, True if i % 2 else bold, italic, color)
    return p


def para(teks='', rata='j', size=None, color=None, bold=None, italic=None, before=0, after=6, kiri=None):
    p = doc.add_paragraph()
    p.alignment = {'j': WD_ALIGN_PARAGRAPH.JUSTIFY, 'l': WD_ALIGN_PARAGRAPH.LEFT, 'c': WD_ALIGN_PARAGRAPH.CENTER,
                   'r': WD_ALIGN_PARAGRAPH.RIGHT}[rata]
    p.paragraph_format.space_before = Pt(before); p.paragraph_format.space_after = Pt(after)
    if kiri is not None:
        p.paragraph_format.left_indent = Cm(kiri)
    if teks:
        tulis(p, teks, size, color, bold, italic)
    return p


def butir(teks, nomor=None, kiri=0.9):
    p = para(after=4, kiri=kiri)
    p.paragraph_format.first_line_indent = Cm(-0.6)
    tulis(p, (f'{nomor}.' if nomor else '•') + '\t' + teks)
    p.paragraph_format.tab_stops.add_tab_stop(Cm(kiri))
    return p


def para_sel(cell, teks, size=9.5, color=TEKS, bold=None, rata='l', after=2, pertama=True):
    p = cell.paragraphs[0] if pertama and not cell.paragraphs[0].text else cell.add_paragraph()
    p.alignment = {'l': WD_ALIGN_PARAGRAPH.LEFT, 'c': WD_ALIGN_PARAGRAPH.CENTER, 'r': WD_ALIGN_PARAGRAPH.RIGHT,
                   'j': WD_ALIGN_PARAGRAPH.JUSTIFY}[rata]
    p.paragraph_format.space_after = Pt(after); p.paragraph_format.line_spacing = 1.15
    tulis(p, teks, size, color, bold)
    return p


def kotak(teks, isi=TINT, garis=ORANYE, warna=NAVY, size=10.5):
    t = doc.add_table(rows=1, cols=1)
    borders(t, sisi=('left',), warna=garis, ukur=24)
    margin_sel(t, 120, 180)
    c = t.cell(0, 0); shade(c, isi); lebar_kolom(t, [1])
    for i, baris in enumerate(teks if isinstance(teks, list) else [teks]):
        para_sel(c, baris, size, warna, rata='j', after=4, pertama=(i == 0))
    para(after=2)


def tabel(kolom, baris, lebar=None, rata=None, total=False, size=9):
    t = doc.add_table(rows=1 + len(baris), cols=len(kolom))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    borders(t); margin_sel(t)
    for j, k in enumerate(kolom):
        c = t.cell(0, j); shade(c, NAVY); c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        para_sel(c, k, size, 'FFFFFF', True, 'c')
    ulang_kepala(t.rows[0])
    for i, b in enumerate(baris, 1):
        akhir = total and i == len(baris)
        for j, v in enumerate(b):
            c = t.cell(i, j); c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            if akhir:
                shade(c, TINT)
            r = (rata[j] if rata else 'l')
            for k, bb in enumerate(str(v).split('\n')):
                para_sel(c, bb, size, TEKS, True if akhir else None, r, pertama=(k == 0))
        t.rows[i]._tr.get_or_add_trPr().append(OxmlElement('w:cantSplit'))
    if lebar:
        lebar_kolom(t, lebar)
    para(after=2)
    return t


def kartu(daftar, kolom=3):
    """daftar: (judul, isi, angka|None)."""
    t = doc.add_table(rows=(len(daftar) + kolom - 1) // kolom, cols=kolom)
    borders(t, sisi=()); margin_sel(t, 100, 120)
    for i, (j, isi, angka) in enumerate(daftar):
        c = t.cell(i // kolom, i % kolom); shade(c, TINT)
        if angka:
            para_sel(c, angka, 18, ORANYE, True)
        para_sel(c, j, 10, NAVY, True, pertama=not angka)
        para_sel(c, isi, 9, TEKS2, rata='l', pertama=False)
    lebar_kolom(t, [1] * kolom)
    para(after=2)


def sumber(teks):
    para('Sumber: ' + teks, 'l', 7.5, TEKS3, italic=True, after=10)


# ---------- sampul ----------
def sampul():
    mitra = ISI.get('logo_mitra', [])
    t = doc.add_table(rows=1, cols=2 + len(mitra))
    borders(t, sisi=())
    t.cell(0, 0).paragraphs[0].add_run().add_picture(LOGO_BNPB, height=Cm(2.4))
    for i, (lg, h) in enumerate(mitra, 1):
        c = t.cell(0, i); c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        c.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        c.paragraphs[0].add_run().add_picture(lg, height=Cm(h))
    c = t.cell(0, len(mitra) + 1); c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    c.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
    c.paragraphs[0].add_run().add_picture(LOGO_KRIS, height=Cm(1.3))
    lebar_kolom(t, [1] * (2 + len(mitra)))
    para(ISI['jenis'], 'l', 9.5, ORANYE, True, before=60, after=6)
    p = para(rata='l', after=10)
    for i, b in enumerate(ISI['judul_sampul']):
        if i: p.add_run().add_break()
        font(p.add_run(b), 26, True, None, NAVY)
    para(ISI['sub'], 'l', 12, TEKS2, after=40)
    for lab, isi in ISI['blok_sampul']:
        para(lab, 'l', 8.5, TEKS3, True, after=1)
        para(isi, 'l', 11, NAVY, True, after=14)
    para(ISI['tanggal'], 'l', 10.5, NAVY, True, before=40, after=4)
    para('Dokumen konsep untuk pembahasan. Angka anggaran dan sasaran adalah perkiraan awal yang disepakati bersama sebelum perjanjian ditandatangani.',
         'l', 8, TEKS3, italic=True)
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


def kepala_kaki(section):
    section.different_first_page_header_footer = True
    hd = section.header
    t = hd.add_table(rows=1, cols=2, width=Cm(LEBAR))
    borders(t, sisi=('bottom',), ukur=4)
    c0, c1 = t.cell(0, 0), t.cell(0, 1)
    p = c0.paragraphs[0]
    font(p.add_run(ISI['kepala']), 8, True, None, NAVY); p.add_run().add_break()
    font(p.add_run('Badan Nasional Penanggulangan Bencana'), 7.5, None, None, TEKS2)
    p1 = c1.paragraphs[0]; p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p1.add_run().add_picture(LOGO_KRIS, height=Cm(0.7)); p1.add_run('  ')
    p1.add_run().add_picture(LOGO_BNPB, height=Cm(1.0))
    c0.width, c1.width = Cm(11), Cm(6)
    if hd.paragraphs and not hd.paragraphs[0].text:
        hd.paragraphs[0]._element.getparent().remove(hd.paragraphs[0]._element)
    p = section.footer.paragraphs[0]
    p.paragraph_format.tab_stops.add_tab_stop(Cm(LEBAR), alignment=2)
    font(p.add_run('Graha BNPB, Jl. Pramuka Kav. 38, Jakarta Timur 13120. Call Center 117, www.bnpb.go.id'), 7, None, None, TEKS3)
    p.add_run('\t')
    r = p.add_run()
    for tag, txt in (('begin', None), (None, 'PAGE'), ('separate', None), ('end', None)):
        if tag:
            e = OxmlElement('w:fldChar'); e.set(qn('w:fldCharType'), tag); r._r.append(e)
        else:
            e = OxmlElement('w:instrText'); e.text = txt; r._r.append(e)
    font(r, 8, True, None, NAVY)


def daftar_isi():
    doc.add_heading('Daftar Isi', level=1)
    for i, bab in enumerate(ISI['bab'], 1):
        p = para(rata='l', after=3)
        tulis(p, f'{i}.\t{bab["judul"]}', 10.5, NAVY)
        p.paragraph_format.tab_stops.add_tab_stop(Cm(0.8))
    if ISI.get('lampiran'):
        p = para(rata='l', after=3)
        tulis(p, 'Lampiran.\t' + ISI['lampiran']['judul'], 10.5, NAVY)
    para(after=10)


# ---------- rakit ----------
kepala_kaki(sec)
sampul()
daftar_isi()
kotak(['**Ringkasan.** ' + ISI['ringkasan'][0]] + ISI['ringkasan'][1:], size=10.5)
for i, bab in enumerate(ISI['bab'], 1):
    h = doc.add_heading(level=1)
    h.paragraph_format.page_break_before = bab.get('halaman_baru', i == 1)
    h.paragraph_format.space_before = Pt(14)
    font(h.add_run(f'{i}. {bab["judul"]}'), 16, True, False, NAVY)
    for blok in bab['isi']:
        jenis = blok[0]
        if jenis == 'p':
            para(blok[1])
        elif jenis == 'h':
            h2 = doc.add_heading(level=2); font(h2.add_run(blok[1]), 12, True, False, NAVY)
        elif jenis == 'ul':
            for b in blok[1]:
                butir(b)
        elif jenis == 'ol':
            for n, b in enumerate(blok[1], 1):
                butir(b, n)
        elif jenis == 'tabel':
            tabel(**blok[1])
        elif jenis == 'kartu':
            kartu(*blok[1:])
        elif jenis == 'kotak':
            kotak(blok[1])
        elif jenis == 'sumber':
            sumber(blok[1])
if ISI.get('lampiran'):
    lp = ISI['lampiran']
    h = doc.add_heading(level=1); h.paragraph_format.page_break_before = True
    font(h.add_run('Lampiran. ' + lp['judul']), 16, True, False, NAVY)
    for blok in lp['isi']:
        if blok[0] == 'p':
            para(blok[1])
        elif blok[0] == 'tabel':
            tabel(**blok[1])
        elif blok[0] == 'sumber':
            sumber(blok[1])
        elif blok[0] == 'ol':
            for n, b in enumerate(blok[1], 1):
                butir(b, n)

cp = doc.core_properties
cp.title, cp.author, cp.subject, cp.language = ISI['judul'], 'Badan Nasional Penanggulangan Bencana', ISI['sub'], 'id-ID'
keluar = D.parent / (ISI['berkas'] + '.docx')
doc.save(keluar)
print(keluar)
