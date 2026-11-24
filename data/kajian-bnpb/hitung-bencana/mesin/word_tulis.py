"""Blok naskah -> DOCX (python-docx), gaya mengikuti Laporan Bencana bulanan A4 (word.py).

Daftar isi memakai bidang TOC Word; hasil antaranya diisi dari nomor halaman PDF sehingga tidak kosong,
dan dapat diperbarui Word (Update Field atau perbarui_word.ps1).
"""
import io
import re
from pathlib import Path
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, Cm, RGBColor
import naskah as N
import konst as K
import catatan as C

NAVY, ORANYE, TEKS, TEKS2, TEKS3, GARIS, TINT = K.NAVY, K.ORANYE, K.TEKS, K.TEKS2, K.TEKS3, K.GARIS, K.TINT
LEBAR = K.LEBAR
KARTU_WARNA = [K.NAVY, K.ORANYE, K.BIRU, 'A07A32', K.MERAH, '5B7A99']
RATA = {'j': WD_ALIGN_PARAGRAPH.JUSTIFY, 'l': WD_ALIGN_PARAGRAPH.LEFT, 'c': WD_ALIGN_PARAGRAPH.CENTER, 'r': WD_ALIGN_PARAGRAPH.RIGHT}


def rgb(h):
    return RGBColor.from_string(h.upper())


def set_font(r, size=None, bold=None, italic=None, color=None, nama='Roboto'):
    r.font.name = nama
    rpr = r._element.get_or_add_rPr()
    rf = rpr.find(qn('w:rFonts'))
    rf.set(qn('w:eastAsia'), nama)
    rf.set(qn('w:cs'), nama)
    if size:
        r.font.size = Pt(size)
    if bold is not None:
        r.font.bold = bold
    if italic is not None:
        r.font.italic = italic
    if color:
        r.font.color.rgb = rgb(color)
    return r


def bersih_tema(rfonts):
    for a in ('asciiTheme', 'hAnsiTheme', 'eastAsiaTheme', 'cstheme'):
        k = qn('w:' + a)
        if k in rfonts.attrib:
            del rfonts.attrib[k]


def shade(el_pr, hexw):
    s = OxmlElement('w:shd')
    s.set(qn('w:val'), 'clear')
    s.set(qn('w:color'), 'auto')
    s.set(qn('w:fill'), hexw)
    el_pr.append(s)


def p_border(p, sisi, warna, ukur=18, ruang=6):
    pPr = p._p.get_or_add_pPr()
    bd = pPr.find(qn('w:pBdr'))
    if bd is None:
        bd = OxmlElement('w:pBdr')
        pPr.append(bd)
    e = OxmlElement('w:' + sisi)
    e.set(qn('w:val'), 'single')
    e.set(qn('w:sz'), str(ukur))
    e.set(qn('w:space'), str(ruang))
    e.set(qn('w:color'), warna)
    bd.append(e)


def p_shade(p, hexw):
    shade(p._p.get_or_add_pPr(), hexw)


def tbl_borders(tbl, sisi=('bottom', 'insideH'), warna=GARIS, ukur=4):
    tblPr = tbl._element.tblPr
    b = OxmlElement('w:tblBorders')
    for k in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        e = OxmlElement(f'w:{k}')
        if k in sisi:
            e.set(qn('w:val'), 'single')
            e.set(qn('w:sz'), str(ukur))
            e.set(qn('w:color'), warna)
        else:
            e.set(qn('w:val'), 'nil')
        b.append(e)
    tblPr.append(b)


def cell_border(cell, sisi, warna, ukur=18):
    tcPr = cell._element.get_or_add_tcPr()
    b = tcPr.find(qn('w:tcBorders'))
    if b is None:
        b = OxmlElement('w:tcBorders')
        tcPr.append(b)
    e = OxmlElement(f'w:{sisi}')
    e.set(qn('w:val'), 'single')
    e.set(qn('w:sz'), str(ukur))
    e.set(qn('w:color'), warna)
    b.append(e)


def cell_shade(cell, hexw):
    shade(cell._element.get_or_add_tcPr(), hexw)


def margin_sel(tbl, atas=60, kiri=90):
    m = OxmlElement('w:tblCellMar')
    for k, v in (('top', atas), ('left', kiri), ('bottom', atas), ('right', kiri)):
        e = OxmlElement(f'w:{k}')
        e.set(qn('w:w'), str(v))
        e.set(qn('w:type'), 'dxa')
        m.append(e)
    tbl._element.tblPr.append(m)


def tetap(tbl, persen):
    """tata letak tetap dengan lebar kolom (persen)."""
    tbl.autofit = False
    tblPr = tbl._element.tblPr
    lay = OxmlElement('w:tblLayout')
    lay.set(qn('w:type'), 'fixed')
    tblPr.append(lay)
    tot = sum(persen)
    tw = tblPr.find(qn('w:tblW'))
    if tw is None:
        tw = OxmlElement('w:tblW')
        tblPr.append(tw)
    tw.set(qn('w:type'), 'dxa')
    tw.set(qn('w:w'), str(int(LEBAR / 2.54 * 1440)))
    grid = tbl._element.find(qn('w:tblGrid'))
    for i, gc in enumerate(grid.findall(qn('w:gridCol'))):
        gc.set(qn('w:w'), str(int(LEBAR / 2.54 * 1440 * persen[i] / tot)))
    for row in tbl.rows:
        for i, c in enumerate(row.cells):
            if i < len(persen):
                c.width = Cm(LEBAR * persen[i] / tot)


def row_flag(row, tag):
    trPr = row._tr.get_or_add_trPr()
    trPr.append(OxmlElement('w:' + tag))


def field(p, instr, hasil='', **kw):
    r = p.add_run()
    for tag, txt in (('begin', None), (None, instr), ('separate', None)):
        if tag:
            e = OxmlElement('w:fldChar')
            e.set(qn('w:fldCharType'), tag)
            r._r.append(e)
        else:
            e = OxmlElement('w:instrText')
            e.set(qn('xml:space'), 'preserve')
            e.text = txt
            r._r.append(e)
    set_font(p.add_run(hasil), **kw)
    r2 = p.add_run()
    e = OxmlElement('w:fldChar')
    e.set(qn('w:fldCharType'), 'end')
    r2._r.append(e)


class Dok:
    def __init__(self, toc_entri, toc_hal, tanggal):
        self.doc = Document()
        self.entri = toc_entri
        self.hal = toc_hal
        self.tanggal = tanggal
        self.pd = False       # di dalam blok paradoks (bilah kiri oranye)
        self.notes = []       # butir catatan berkas naskah yang sedang ditulis (catatan.DAFTAR[nama])
        self.fn = []          # teks catatan kaki, id = indeks + 1
        self.hn = 0           # urutan judul 1-2 (sama dengan urutan entri daftar isi)
        self.bm = 100
        self.gaya()
        self.halaman()

    # ---------- dasar ----------
    def gaya(self):
        d = self.doc
        st = d.styles['Normal']
        st.font.name = 'Roboto'
        st.element.rPr.rFonts.set(qn('w:eastAsia'), 'Roboto')
        bersih_tema(st.element.rPr.rFonts)
        st.font.size = Pt(10)
        st.font.color.rgb = rgb(TEKS)
        st.paragraph_format.space_after = Pt(6)
        st.paragraph_format.line_spacing = 1.2
        lang = OxmlElement('w:lang')
        lang.set(qn('w:val'), 'id-ID')
        st.element.rPr.append(lang)
        for nama, size, warna, sb, sa in (('Heading 1', 17, NAVY, 0, 10), ('Heading 2', 13, NAVY, 14, 6), ('Heading 3', 11, NAVY, 10, 4), ('Heading 4', 10, ORANYE, 8, 3)):
            h = d.styles[nama]
            h.font.name = 'Roboto'
            rf = h.element.rPr.rFonts
            rf.set(qn('w:eastAsia'), 'Roboto')
            bersih_tema(rf)
            h.font.size = Pt(size)
            h.font.bold = True
            h.font.italic = False
            h.font.color.rgb = rgb(warna)
            h.paragraph_format.space_before = Pt(sb)
            h.paragraph_format.space_after = Pt(sa)
            h.paragraph_format.keep_with_next = True
        # gaya catatan kaki (FootnoteText 8 pt, FootnoteReference superskrip)
        from docx.enum.style import WD_STYLE_TYPE as T
        ft = d.styles.add_style('footnote text', T.PARAGRAPH)
        ft.element.set(qn('w:styleId'), 'FootnoteText')
        ft.base_style = d.styles['Normal']
        ft.font.size = Pt(8)
        ft.paragraph_format.space_after = Pt(1)
        ft.paragraph_format.line_spacing = 1.0
        fr = d.styles.add_style('footnote reference', T.CHARACTER)
        fr.element.set(qn('w:styleId'), 'FootnoteReference')
        fr.font.superscript = True
        # gaya daftar isi (nama bawaan Word: toc 1, toc 2)
        from docx.enum.style import WD_STYLE_TYPE
        for n_, ind, ukur, tebal in ((1, 0, 10.5, True), (2, 0.6, 9, False)):
            s = d.styles.add_style(f'toc {n_}', WD_STYLE_TYPE.PARAGRAPH)
            s.base_style = d.styles['Normal']
            s.font.size = Pt(ukur)
            s.font.bold = tebal
            s.font.color.rgb = rgb(NAVY if tebal else TEKS2)
            s.paragraph_format.left_indent = Cm(ind)
            s.paragraph_format.space_after = Pt(2 if not tebal else 3)
            s.paragraph_format.space_before = Pt(6 if tebal else 0)
            s.paragraph_format.tab_stops.add_tab_stop(Cm(LEBAR), alignment=2, leader=1)   # kanan, titik-titik

    def halaman(self):
        s = self.doc.sections[0]
        s.page_width, s.page_height = Cm(21), Cm(29.7)
        s.left_margin = s.right_margin = Cm(0)
        s.top_margin, s.bottom_margin = Cm(0), Cm(0.8)
        s.header_distance = s.footer_distance = Cm(0)

    def runs(self, p, teks, size=None, color=None, bold=None, italic=None):
        potong = re.split(r'<br\s*/?>', teks)
        for k, bag in enumerate(potong):
            if k:
                p.add_run().add_break()
            for tx, f in N.inline(bag):
                if 'n' in f:
                    self.ref_catatan(p, tx)
                    continue
                r = p.add_run(tx)
                if 'c' in f:
                    set_font(r, (size or 10) - 1, bold, italic, TEKS2, 'Consolas')
                else:
                    set_font(r, size, True if ('b' in f or bold) else None, True if ('i' in f or italic) else None, color or (NAVY if 'b' in f else None))

    def ref_catatan(self, p, nomor):
        """Sisipkan referensi catatan kaki Word asli untuk tiap nomor (koma-terpisah) pada paragraf p."""
        for k, n in enumerate(nomor.split(',')):
            if k:
                r = p.add_run(',')
                rp = r._r.get_or_add_rPr()
                st = OxmlElement('w:rStyle')
                st.set(qn('w:val'), 'FootnoteReference')
                rp.insert(0, st)
            try:
                butir = self.notes[int(n) - 1]
            except (IndexError, ValueError):
                continue
            self.fn.append('; '.join(butir))
            r = p.add_run()
            rp = r._r.get_or_add_rPr()
            st = OxmlElement('w:rStyle')
            st.set(qn('w:val'), 'FootnoteReference')
            rp.insert(0, st)
            e = OxmlElement('w:footnoteReference')
            e.set(qn('w:id'), str(len(self.fn)))
            r._r.append(e)

    def tulis_footnotes(self):
        """Bagian /word/footnotes.xml (python-docx tak punya bawaan): pemisah -1 dan 0, lalu catatan 1..n."""
        if not self.fn:
            return
        from docx.opc.part import Part
        from docx.opc.packuri import PackURI
        from xml.sax.saxutils import escape
        W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
        x = [f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:footnotes xmlns:w="{W}">',
             '<w:footnote w:type="separator" w:id="-1"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:separator/></w:r></w:p></w:footnote>',
             '<w:footnote w:type="continuationSeparator" w:id="0"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:continuationSeparator/></w:r></w:p></w:footnote>']
        for i, t in enumerate(self.fn, start=1):
            x.append(f'<w:footnote w:id="{i}"><w:p><w:pPr><w:pStyle w:val="FootnoteText"/></w:pPr>'
                     '<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r>'
                     '<w:r><w:t xml:space="preserve"> </w:t></w:r>'
                     '<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas" w:eastAsia="Consolas"/><w:color w:val="2E3440"/><w:sz w:val="15"/><w:szCs w:val="15"/></w:rPr>'
                     f'<w:t xml:space="preserve">{escape(t)}</w:t></w:r></w:p></w:footnote>')
        x.append('</w:footnotes>')
        part = Part(PackURI('/word/footnotes.xml'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml',
                    ''.join(x).encode('utf-8'), self.doc.part.package)
        self.doc.part.relate_to(part, 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes')

    def para(self, teks='', rata='j', size=None, color=None, bold=None, italic=None, after=6, before=0, kiri=0, keep=False, cont=None, bar=None):
        p = self.doc.add_paragraph() if cont is None else cont.add_paragraph()
        p.alignment = RATA[rata]
        p.paragraph_format.space_after = Pt(after)
        p.paragraph_format.space_before = Pt(before)
        if keep:
            p.paragraph_format.keep_with_next = True
        use_bar = self.pd if bar is None else bar
        if use_bar and cont is None:
            kiri += 0.35
            p_border(p, 'left', ORANYE, 20, 8)
        if kiri:
            p.paragraph_format.left_indent = Cm(kiri)
        if teks:
            self.runs(p, teks, size, color, bold, italic)
        return p

    def sel_para(self, cell, teks='', size=9, color=None, bold=None, rata='l', first=True, after=1):
        if first and not cell.paragraphs[0].runs:
            p = cell.paragraphs[0]
        else:
            p = cell.add_paragraph()
        p.alignment = RATA[rata]
        p.paragraph_format.space_after = Pt(after)
        p.paragraph_format.line_spacing = 1.0
        if teks:
            self.runs(p, teks, size, color, bold)
        return p

    def kotak(self, isi_fn, warna_isi, garis_kiri=None, atas=110, kiri=160):
        t = self.doc.add_table(rows=1, cols=1)
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl_borders(t, sisi=())
        c = t.cell(0, 0)
        cell_shade(c, warna_isi)
        if garis_kiri:
            cell_border(c, 'left', garis_kiri, 24)
        margin_sel(t, atas, kiri)
        tetap(t, [100])
        isi_fn(c)
        self.spasi(2)
        return t

    def spasi(self, pt=2):
        p = self.doc.add_paragraph()
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.line_spacing = Pt(max(pt, 1))
        return p

    # ---------- sampul ----------
    def foto_sampul(self):
        from PIL import Image, ImageDraw, ImageFont
        im = Image.open(K.FOTO_SAMPUL).convert('RGB')
        w, h = im.size
        rasio = 116 / 210
        nh = int(w * rasio)
        y0 = int((h - nh) * 0.4)
        im = im.crop((0, y0, w, y0 + nh))
        im = im.resize((2100, int(2100 * rasio)))
        px = 2100 / 210          # piksel per mm
        dr = ImageDraw.Draw(im, 'RGBA')
        bn = Image.open(K.LOGO_BNPB).convert('RGBA')
        kr = Image.open(K.LOGO_KRIS).convert('RGBA')
        bh = int(19 * px)
        bn = bn.resize((int(bn.width * bh / bn.height), bh))
        kh = int(11 * px)
        kr = kr.resize((int(kr.width * kh / kr.height), kh))
        x0, y0 = int(18 * px), int(14 * px)
        pad = int(4.5 * px)
        dr.rounded_rectangle((x0, y0, x0 + bn.width + 2 * pad, y0 + bh + 2 * pad), radius=int(1.6 * px), fill=(255, 255, 255, 255))
        im.paste(bn, (x0 + pad, y0 + pad), bn)
        pk = int(6 * px)
        xr = int(210 * px) - int(18 * px) - kr.width - 2 * pk
        dr.rounded_rectangle((xr, y0, xr + kr.width + 2 * pk, y0 + kh + 2 * int(5 * px)), radius=int(1.6 * px), fill=(255, 255, 255, 255))
        im.paste(kr, (xr + pk, y0 + int(5 * px)), kr)
        try:
            f = ImageFont.truetype(K.FONT['R'], int(2.4 * px))
            tw = dr.textlength(K.FOTO_KREDIT, font=f)
            tx, ty = int(210 * px) - tw - int(6 * px), im.height - int(3 * px) - int(2.6 * px)
            dr.text((tx + 2, ty + 2), K.FOTO_KREDIT, font=f, fill=(0, 0, 0, 160))
            dr.text((tx, ty), K.FOTO_KREDIT, font=f, fill=(255, 255, 255, 255))
        except Exception:
            pass
        b = io.BytesIO()
        im.save(b, 'JPEG', quality=90)
        b.seek(0)
        return b

    def sampul(self):
        d = self.doc
        p = d.add_paragraph()
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.0
        p.add_run().add_picture(self.foto_sampul(), width=Cm(21))
        kiri = 1.8

        def kp(teks='', **kw):
            kw.setdefault('rata', 'l')
            q = self.para(teks, kiri=kiri, bar=False, **kw)
            q.paragraph_format.right_indent = Cm(1.8)
            return q
        kp(K.LABEL, size=9, bold=True, color=ORANYE, before=30, after=4)
        kp(K.JUDUL, size=29, bold=True, color=NAVY, after=8).paragraph_format.line_spacing = 1.05
        kp(K.ANAK, size=11.5, color=TEKS2, after=12)
        q = kp(after=14)
        p_border(q, 'bottom', GARIS, 8, 1)
        kp(K.OLEH_LABEL, size=9.5, color=TEKS2, after=2)
        kp(K.OLEH, size=11, bold=True, color=NAVY, after=14)
        q = kp(after=0)
        r = set_font(q.add_run(f'  Jakarta, {self.tanggal}  '), 10, True, None, 'FFFFFF')
        shade(r._element.get_or_add_rPr(), NAVY)
        q = kp(before=70, size=8, color=K.BIRU, after=0)
        self.runs(q, f'© {self.tanggal[-4:]} Badan Nasional Penanggulangan Bencana', 8, K.BIRU)
        q.add_run().add_break()
        set_font(q.add_run('Ketangguhan Bangsa dalam Menghadapi Bencana'), 8, None, True, K.BIRU)

        # bagian isi
        sec = d.add_section(WD_SECTION.NEW_PAGE)
        sec.left_margin = sec.right_margin = Cm(1.7)
        sec.top_margin, sec.bottom_margin = Cm(2.4), Cm(2.0)
        sec.header_distance, sec.footer_distance = Cm(0.9), Cm(0.8)
        pg = OxmlElement('w:pgNumType')
        pg.set(qn('w:start'), '1')
        sec._sectPr.append(pg)
        self.kepala_kaki(sec)

    def kepala_kaki(self, sec):
        sec.header.is_linked_to_previous = False
        sec.footer.is_linked_to_previous = False
        hd = sec.header
        t = hd.add_table(rows=1, cols=2, width=Cm(LEBAR))
        tbl_borders(t, sisi=('bottom',), ukur=4)
        c0, c1 = t.cell(0, 0), t.cell(0, 1)
        p = c0.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        set_font(p.add_run(K.JUDUL), 8, True, None, NAVY)
        p.add_run().add_break()
        set_font(p.add_run('Badan Nasional Penanggulangan Bencana'), 7.5, None, None, TEKS2)
        p1 = c1.paragraphs[0]
        p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p1.paragraph_format.space_after = Pt(0)
        p1.add_run().add_picture(K.LOGO_KRIS, height=Cm(0.7))
        p1.add_run('  ')
        p1.add_run().add_picture(K.LOGO_BNPB, height=Cm(1.0))
        tetap(t, [11, 6.6])
        if hd.paragraphs and not hd.paragraphs[0].text:
            hd.paragraphs[0]._element.getparent().remove(hd.paragraphs[0]._element)
        # satu paragraf kosong wajib sesudah tabel di header
        hd.add_paragraph().paragraph_format.space_after = Pt(0)
        ft = sec.footer
        p = ft.paragraphs[0]
        p.paragraph_format.tab_stops.add_tab_stop(Cm(LEBAR), alignment=2)
        set_font(p.add_run('Graha BNPB, Jl. Pramuka Kav. 38, Jakarta Timur 13120. Call Center 117, www.bnpb.go.id'), 7, None, None, TEKS3)
        p.add_run('\t')
        field(p, 'PAGE', '1', size=8, bold=True, color=NAVY)

    # ---------- daftar isi ----------
    def daftar_isi(self):
        d = self.doc
        q = d.add_paragraph()
        q.paragraph_format.space_after = Pt(10)
        set_font(q.add_run('Daftar Isi'), 20, True, None, NAVY)
        if not self.entri:
            return
        s = d.settings.element
        u = OxmlElement('w:updateFields')
        u.set(qn('w:val'), 'true')
        s.append(u)
        tmaks = K.TATA.get('toc_tingkat', 2)
        entri_toc = [x for x in self.entri if x[1] <= tmaks]
        n = len(entri_toc)
        for i, (kode, tg, teks) in enumerate(entri_toc):
            p = d.add_paragraph(style=f'toc {tg}')
            if i == 0:
                r = p.add_run()
                for tag, txt in (('begin', None), (None, f'TOC \\o "1-{tmaks}" \\h \\z \\u'), ('separate', None)):
                    if tag:
                        e = OxmlElement('w:fldChar')
                        e.set(qn('w:fldCharType'), tag)
                        r._r.append(e)
                    else:
                        e = OxmlElement('w:instrText')
                        e.set(qn('xml:space'), 'preserve')
                        e.text = txt
                        r._r.append(e)
            # hasil antara berupa hyperlink ke bookmark judul (w:anchor): klik bekerja sebelum Word memperbarui bidang
            hl = OxmlElement('w:hyperlink')
            hl.set(qn('w:anchor'), self.nama_bm(i + 1))
            hl.set(qn('w:history'), '1')
            p._p.append(hl)
            r1 = set_font(p.add_run(teks), 10.5 if tg == 1 else 9, tg == 1, None, NAVY if tg == 1 else TEKS2)
            r2 = p.add_run('\t')
            r3 = set_font(p.add_run(str(self.hal.get(kode, ''))), 10.5 if tg == 1 else 9, tg == 1, None, ORANYE)
            for r in (r1, r2, r3):
                hl.append(r._r)
            if i == n - 1:
                r2 = p.add_run()
                e = OxmlElement('w:fldChar')
                e.set(qn('w:fldCharType'), 'end')
                r2._r.append(e)

    def nama_bm(self, i):
        return f'_Toc9{i:08d}'

    def penanda_judul(self, h):
        """Bookmark _Toc... pada judul tingkat 1-2 (urutan sama dengan entri daftar isi) sebagai sasaran tautan daftar isi."""
        self.hn += 1
        self.bm += 1
        s = OxmlElement('w:bookmarkStart')
        s.set(qn('w:id'), str(self.bm))
        s.set(qn('w:name'), self.nama_bm(self.hn))
        h._p.append(s)       # run judul menyusul (urutan penambahan) lalu penutup di akhir paragraf lewat sisip_penutup
        self.tutup = (h, self.bm)

    def sisip_penutup(self):
        h, i = self.tutup
        e = OxmlElement('w:bookmarkEnd')
        e.set(qn('w:id'), str(i))
        h._p.append(e)

    # ---------- blok ----------
    def blok(self, b):
        getattr(self, 'b_' + b[0])(b)

    def semua(self, daftar, **kw):
        for b in daftar:
            self.blok(b)

    def b_h(self, b):
        self.tutup = None
        self._h(b)
        if self.tutup:
            self.sisip_penutup()

    def _h(self, b):
        tg, t = b[1], b[2]
        d = self.doc
        if tg == 1:
            lb, jd = N.pecah_h1(N.polos(t))
            h = d.add_heading(level=1)
            self.penanda_judul(h)
            h.paragraph_format.page_break_before = K.TATA.get('bab_baru', True)
            h.paragraph_format.space_after = Pt(12)
            p_border(h, 'left', NAVY, 36, 8)
            p_shade(h, TINT)
            if lb:
                set_font(h.add_run(lb), 8.5, True, False, ORANYE)
                h.add_run().add_break()
                set_font(h.add_run(jd), 17, True, False, NAVY)
            else:
                set_font(h.add_run(N.polos(t)), 17, True, False, NAVY)
            return
        h = d.add_heading(level=tg)
        if tg == 2:
            self.penanda_judul(h)
            p_border(h, 'bottom', NAVY, 10, 3)
        size = {2: 13, 3: 11, 4: 10}[tg]
        warna = ORANYE if tg == 4 else NAVY
        self.runs(h, t, size, warna, True)

    def b_p(self, b):
        self.para(b[1])

    def b_singkatan(self, b):
        def f(c):
            p = self.sel_para(c, size=7, color=ORANYE, bold=True, after=2)
            p.add_run().text = ''
            set_font(p.add_run('SINGKATAN DAN ISTILAH'), 7, True, None, ORANYE)
            self.sel_para(c, N.isi_singkatan(b[1]), size=8.3, color=TEKS2, rata='j', first=False, after=0)
        self.kotak(f, TINT, atas=70, kiri=140)

    def b_list(self, b):
        for it in b[1]:
            self._butir(it, 0)
            for s in it['sub']:
                self._butir(s, 1)
        self.doc.paragraphs[-1].paragraph_format.space_after = Pt(6)

    def _butir(self, it, tingkat):
        kiri = (0.75 if tingkat == 0 else 1.45)
        p = self.doc.add_paragraph()
        p.alignment = RATA['j']
        pf = p.paragraph_format
        pf.space_after = Pt(3)
        extra = 0.35 if self.pd else 0
        pf.left_indent = Cm(kiri + extra)
        pf.first_line_indent = Cm(-0.7 if tingkat == 0 else -0.5)
        pf.tab_stops.add_tab_stop(Cm(kiri + extra))
        if self.pd:
            p_border(p, 'left', ORANYE, 20, 8)
        pen = (it['no'] + '.') if it['jenis'] == 'ol' else ('•' if tingkat == 0 else '–')
        set_font(p.add_run(pen), 10, True, None, ORANYE if tingkat == 0 else TEKS3)
        p.add_run('\t')
        self.runs(p, it['teks'])

    def b_tabel(self, b):
        d = b[1]
        ncol = len(d['kepala'])
        if d['no']:
            c = self.para(rata='l', size=9, after=3, keep=True, bar=False)
            set_font(c.add_run(f'Tabel {d["no"]}. '), 9, True, None, ORANYE)
            self.runs(c, d['judul'], 9, TEKS2)
        t = self.doc.add_table(rows=1, cols=ncol)
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl_borders(t, sisi=('bottom', 'insideH'))
        margin_sel(t, 28, 70)
        ukur = N.ukuran_tabel(ncol)
        for i, kep in enumerate(d['kepala']):
            c = t.rows[0].cells[i]
            cell_shade(c, NAVY)
            c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            p = self.sel_para(c, '', rata='c')
            set_font(p.add_run(N.polos(kep).upper()), max(6.2, ukuran_kepala(ncol)), True, None, 'FFFFFF')
            p.paragraph_format.keep_with_next = True
        row_flag(t.rows[0], 'tblHeader')
        row_flag(t.rows[0], 'cantSplit')
        for r in d['baris']:
            row = t.add_row()
            panjang = sum(len(x) for x in r) > 450
            for i, x in enumerate(r):
                c = row.cells[i]
                c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
                self.sel_para(c, x, size=ukur, rata={'r': 'r', 'c': 'c'}.get(d['rata'][i], 'l'))
            if not panjang:
                row_flag(row, 'cantSplit')
        tetap(t, N.bobot_kolom(d['kepala'], d['baris']))
        if d['sumber']:
            self.para(f'**Sumber:** {d["sumber"]}', rata='l', size=7.5, color=TEKS3, italic=True, after=8, before=3, bar=False)
        else:
            self.spasi(6)

    def b_gambar(self, b):
        d = b[1]
        if d['no']:
            c = self.para(rata='l', size=9, after=3, keep=True, bar=False)
            set_font(c.add_run(f'Gambar {d["no"]}. '), 9, True, None, ORANYE)
            self.runs(c, d['judul'], 9, TEKS2)
        png = K.GBR / Path(d['berkas']).name
        pp = self.doc.add_paragraph()
        pp.alignment = WD_ALIGN_PARAGRAPH.CENTER
        pp.paragraph_format.space_after = Pt(2)
        pp.paragraph_format.keep_with_next = bool(d['sumber'])
        if png.exists():
            from PIL import Image
            w, h = Image.open(png).size
            lebar = min(LEBAR, w / 3 / 96 * 2.54)
            tinggi = lebar * h / w
            tmax = K.TATA.get('tinggi_gambar_cm', 21)
            if tinggi > tmax:
                lebar = lebar * tmax / tinggi
            pp.add_run().add_picture(str(png), width=Cm(lebar))
        else:
            set_font(pp.add_run(f'[gambar belum tersedia: {d["berkas"]}]'), 9, None, True, TEKS3)
        if d['sumber']:
            self.para(f'**Sumber:** {d["sumber"]}', rata='l', size=7.5, color=TEKS3, italic=True, after=8, bar=False)

    def b_kutip(self, b):
        p = self.para(b[1], size=10, italic=True, color=TEKS2, kiri=0.6, bar=False, after=8)
        p_border(p, 'left', GARIS, 24, 8)
        p_shade(p, 'FAFBFC')

    def b_kode(self, b):
        p = self.doc.add_paragraph()
        p.paragraph_format.space_after = Pt(6)
        p.alignment = RATA['l']
        p_shade(p, TINT)
        for k, ln in enumerate(b[1].split('\n')):
            if k:
                p.add_run().add_break()
            set_font(p.add_run(ln), 8, None, None, TEKS2, 'Consolas')

    def b_kalimat(self, b):
        self.kotak(lambda c: self.sel_para(c, b[1], size=12, color=NAVY, rata='l'), 'FFFFFF', ORANYE)

    def b_kartu(self, b):
        item = b[1]
        n = len(item)
        per = 3 if n in (3, 5, 6) else min(n, 4) or 1
        rows = (n + per - 1) // per
        t = self.doc.add_table(rows=rows, cols=per)
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl_borders(t, sisi=('insideV',), warna='FFFFFF', ukur=24)
        margin_sel(t, 70, 110)
        tetap(t, [1] * per)
        for i, (v, l) in enumerate(item):
            c = t.cell(i // per, i % per)
            w = KARTU_WARNA[i % 6]
            cell_shade(c, TINT)
            cell_border(c, 'top', w, 24)
            p = self.sel_para(c, '', after=0)
            self.runs(p, v, 16 if per < 4 else 14, w, True)
            self.sel_para(c, l, size=8, color=TEKS2, first=False)
        self.spasi(4)

    def b_temuan(self, b):
        g = b[1]
        t = self.doc.add_table(rows=(len(g) + 1) // 2, cols=2)
        tbl_borders(t, sisi=())
        margin_sel(t, 60, 110)
        tetap(t, [1, 1])
        for i, (j, bl) in enumerate(g):
            c = t.cell(i // 2, i % 2)
            w = KARTU_WARNA[i % 6]
            cell_border(c, 'left', w, 24)
            p = self.sel_para(c, '', after=2)
            set_font(p.add_run(f'{i + 1}  '), 11, True, None, w)
            self.runs(p, j, 9.5, NAVY, True)
            for x in bl:
                if x[0] == 'p':
                    self.sel_para(c, x[1], size=9, rata='j', first=False)
            row_flag(t.rows[i // 2], 'cantSplit')
        self.spasi(4)

    def b_keputusan(self, b):
        for j, bl in b[1]:
            def f(c, j=j, bl=bl):
                self.sel_para(c, j, size=10.5, color=NAVY, bold=True, after=3)
                for x in bl:
                    if x[0] == 'p':
                        self.sel_para(c, x[1], size=9.5, rata='j', first=False, after=3)
                    elif x[0] == 'list':
                        for it in x[1]:
                            self.sel_para(c, ('• ' if it['jenis'] == 'ul' else it['no'] + '. ') + it['teks'], size=9.5, rata='j', first=False, after=2)
            self.kotak(f, 'FFF9F4', ORANYE, 90, 150)

    def b_metode(self, b):
        def f(c):
            p = self.sel_para(c, '', after=2)
            set_font(p.add_run('CATATAN METODE'), 7, True, None, ORANYE)
            for x in b[1]:
                if x[0] == 'p':
                    self.sel_para(c, x[1], size=8.5, color=TEKS2, rata='j', first=False, after=3)
                elif x[0] == 'list':
                    for it in x[1]:
                        self.sel_para(c, ('• ' if it['jenis'] == 'ul' else it['no'] + '. ') + it['teks'], size=8.5, color=TEKS2, rata='j', first=False, after=2)
        self.kotak(f, TINT, atas=80, kiri=150)

    def b_tentang(self, b):
        def f(c):
            p = self.sel_para(c, '', size=9.5, after=3)
            set_font(p.add_run('Tentang kajian ini.'), 9.5, True, None, NAVY)
            for x in b[1]:
                if x[0] == 'p':
                    self.sel_para(c, x[1], size=9.5, rata='j', first=False, after=3)
                elif x[0] == 'list':
                    for it in x[1]:
                        self.sel_para(c, ('• ' if it['jenis'] == 'ul' else it['no'] + '. ') + it['teks'], size=9.5, rata='j', first=False, after=2)
        self.kotak(f, K.TINTAIR, K.BIRU, 120, 160)

    def b_aksi(self, b):
        g = b[1]
        n = len(g)
        per = n if n <= 3 else 2
        baris = (n + per - 1) // per
        t = self.doc.add_table(rows=2 * baris, cols=per)
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl_borders(t, sisi=('top', 'left', 'bottom', 'right', 'insideV'), warna=GARIS)
        margin_sel(t, 60, 100)
        tetap(t, [1] * per)
        kepala = ['7F93AA', '4F6A88', ORANYE] if n == 3 else ['4F6A88'] * n
        for i, (j, bl) in enumerate(g):
            r, cc = (i // per) * 2, i % per
            h = t.cell(r, cc)
            cell_shade(h, kepala[i % len(kepala)])
            p = self.sel_para(h, '', after=0)
            self.runs(p, j, 9.5, 'FFFFFF', True)
            p.paragraph_format.keep_with_next = True
            c = t.cell(r + 1, cc)
            cell_shade(c, 'FAFBFC')
            first = True
            for x in bl:
                if x[0] == 'list':
                    for it in x[1]:
                        q = self.sel_para(c, '', size=8.5, first=first, after=3)
                        first = False
                        set_font(q.add_run('•  '), 8.5, True, None, ORANYE)
                        self.runs(q, it['teks'], 8.5)
                elif x[0] == 'p':
                    self.sel_para(c, x[1], size=8.5, first=first, after=3)
                    first = False
        for row in t.rows:
            row_flag(row, 'cantSplit')
        self.spasi(4)

    def b_paradoks(self, b):
        d = b[1]
        h = self.doc.add_heading(level=3)
        h.paragraph_format.space_before = Pt(14)
        h.paragraph_format.space_after = Pt(0)
        h.paragraph_format.keep_with_next = True
        p_shade(h, NAVY)
        r = set_font(h.add_run(f' {d["kode"]} '), 10.5, True, None, 'FFFFFF')
        shade(r._element.get_or_add_rPr(), ORANYE)
        set_font(h.add_run('  '), 12.5, True, None, 'FFFFFF')
        r = N.inline(d['nama'])
        for tx, f in r:
            set_font(h.add_run(tx), 12.5, True, None, 'FFFFFF')
        if d['meta']:
            p = self.para(d['meta'], rata='l', size=8.3, color=TEKS2, after=5, keep=True, bar=False)
            p_shade(p, K.TINTAPI)
        self.pd = True
        self.semua(d['blok'])
        self.pd = False
        self.spasi(4)

    # ---------- simpan ----------
    def simpan(self, path, perbarui_otomatis=True):
        cp = self.doc.core_properties
        cp.title, cp.author, cp.subject, cp.language = K.JUDUL, 'Tim Ahli dan Tim Sus IT BNPB', K.ANAK, 'id-ID'
        self.tulis_footnotes()
        self.doc.save(path)


def ukuran_kepala(ncol):
    return 7.4 if ncol <= 5 else 6.8 if ncol == 6 else 6.4


def bangun(dokumen, entri, hal, tanggal, path):
    w = Dok(entri, hal, tanggal)
    w.sampul()
    if K.TATA.get('daftar_isi', True):
        w.daftar_isi()
    for nama, blok in dokumen:
        w.notes = C.DAFTAR.get(nama) or []
        w.semua(blok)
    w.simpan(path)
    return w
