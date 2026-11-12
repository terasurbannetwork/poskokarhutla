"""Versi Word (.docx) kajian, dibangun dari laporan.html yang sama dengan PDF A4 (disalin dari bulanan-2026-10/a4/word.py).

Urutan: python laporan_a4.py -> node tangkap.mjs (grafik/peta jadi gbr/*.png) -> python word.py
Teks dan tabel tetap bisa disunting; grafik dan peta berupa gambar. Daftar isi memakai bidang TOC Word (diperbarui saat dibuka).
"""
import base64, io, re, os
from pathlib import Path
from lxml import html as LH
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, Cm, RGBColor, Emu

D = Path(__file__).resolve().parent
HOME = os.path.expanduser('~').replace(chr(92), '/') + '/'
SK = HOME + '.claude/skills/ppt-konsultan/bnpb/assets/'
LOGO_BNPB = SK + 'proyek-bnpb/logo/sumber-bnpb.png'
LOGO_KRIS = str(D.parents[3] / 'data/laporan-bnpb/generator/sampul/media/kris-logo.png')
import json
META = json.load(open(D / 'meta.json', encoding='utf-8'))
NAVY, ORANYE, TEKS, TEKS2, TEKS3, GARIS, TINT = '051C2C', 'D9600B', '1A1A1A', '2E3440', '6B7280', 'BFC5CC', 'F1F3F6'
LEBAR = 17.6  # cm isi (A4 21 cm, margin 1,7 cm)

doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Cm(21), Cm(29.7)
sec.left_margin = sec.right_margin = Cm(1.7)
sec.top_margin, sec.bottom_margin = Cm(2.4), Cm(2.0)
sec.header_distance, sec.footer_distance = Cm(0.9), Cm(0.8)


def rgb(h):
    return RGBColor.from_string(h.upper())


def font(r, size=None, bold=None, italic=None, color=None):
    r.font.name = 'Roboto'
    r._element.rPr.rFonts.set(qn('w:eastAsia'), 'Roboto')
    if size: r.font.size = Pt(size)
    if bold is not None: r.font.bold = bold
    if italic is not None: r.font.italic = italic
    if color: r.font.color.rgb = rgb(color)
    return r


# ---------- gaya dasar ----------
st = doc.styles['Normal']
st.font.name = 'Roboto'
st.element.rPr.rFonts.set(qn('w:eastAsia'), 'Roboto')
st.font.size = Pt(10)
st.font.color.rgb = rgb(TEKS)
st.paragraph_format.space_after = Pt(6)
st.paragraph_format.line_spacing = 1.2
lang = OxmlElement('w:lang'); lang.set(qn('w:val'), 'id-ID'); st.element.rPr.append(lang)
for nama, size, warna, sb, sa in (('Heading 1', 17, NAVY, 0, 10), ('Heading 2', 12, NAVY, 12, 5)):
    h = doc.styles[nama]
    h.font.name = 'Roboto'; h.element.rPr.rFonts.set(qn('w:eastAsia'), 'Roboto')
    h.font.size = Pt(size); h.font.bold = True; h.font.color.rgb = rgb(warna); h.font.italic = False
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


def cell_border(cell, sisi, warna, ukur=18):
    tcPr = cell._element.get_or_add_tcPr()
    b = OxmlElement('w:tcBorders')
    e = OxmlElement(f'w:{sisi}'); e.set(qn('w:val'), 'single'); e.set(qn('w:sz'), str(ukur)); e.set(qn('w:color'), warna)
    b.append(e); tcPr.append(b)


def margin_sel(tbl, atas=60, kiri=90):
    tblPr = tbl._element.tblPr
    m = OxmlElement('w:tblCellMar')
    for k, v in (('top', atas), ('bottom', atas), ('left', kiri), ('right', kiri)):
        e = OxmlElement(f'w:{k}'); e.set(qn('w:w'), str(v)); e.set(qn('w:type'), 'dxa'); m.append(e)
    tblPr.append(m)


def lebar_kolom(tbl, persen):
    tot = sum(persen)
    for i, col in enumerate(tbl.columns):
        w = Cm(LEBAR * persen[i] / tot)
        for c in col.cells:
            c.width = w


def tidak_pecah(tbl):
    for row in tbl.rows:
        trPr = row._tr.get_or_add_trPr()
        e = OxmlElement('w:cantSplit'); trPr.append(e)


def ulang_kepala(row):
    trPr = row._tr.get_or_add_trPr()
    e = OxmlElement('w:tblHeader'); trPr.append(e)


def rgba_hex(style, kunci):
    m = re.search(kunci + r':\s*rgba\((\d+),(\d+),(\d+),([\d.]+)\)', style or '')
    if m:
        r, g, b, a = int(m[1]), int(m[2]), int(m[3]), float(m[4])
        return ''.join(f'{round(255 - (255 - x) * a):02X}' for x in (r, g, b))
    m = re.search(kunci + r':\s*#([0-9A-Fa-f]{6})', style or '')
    return m[1].upper() if m else None


# ---------- teks sebaris ----------
def runs(p, el, size=None, color=None, bold=None, italic=None):
    """tulis isi elemen lxml ke paragraf, mempertahankan <b>, <i>, <span class=pil>, <small>."""
    def tulis(t, **kw):
        if t:
            t = re.sub(r'\s+', ' ', t)
            font(p.add_run(t), **kw)

    kw = dict(size=size, color=color, bold=bold, italic=italic)
    tulis(el.text, **kw)
    for c in el:
        k = dict(kw)
        cls = c.get('class') or ''
        if c.tag == 'b':
            k.update(bold=True, color=k['color'] or NAVY)
        elif c.tag in ('i', 'em'):
            k.update(italic=True)
        elif c.tag == 'small':
            k.update(size=(size or 10) - 2, color=TEKS3)
            p.add_run().add_break()
        elif c.tag == 'span' and 'pil' in cls:
            k.update(bold=True, size=8, color={'merah': 'C8102E', 'biru': '1B5A93'}.get(cls.split()[-1], TEKS3))
        elif c.tag == 'span' and 'turun' in cls:
            k.update(bold=True, color='2F86D1')
        elif c.tag == 'span' and 'lab' in cls:
            k.update(bold=True, color=ORANYE)
        elif c.tag == 'span' and 'url' in cls:
            k.update(size=7, color='2F86D1')
        elif c.tag == 'br':
            p.add_run().add_break()
        elif c.tag == 'svg':
            p.add_run().add_picture(ikon_png(c), height=Pt((size or 10) * 1.45))
            p.add_run(' ')
            tulis(c.tail, **kw)
            continue
        runs(p, c, **k) if c.tag != 'br' else None
        tulis(c.tail, **kw)


def para(el=None, teks=None, rata='j', size=None, color=None, bold=None, italic=None, after=6, before=0, kiri=None, keep=False):
    p = doc.add_paragraph()
    p.alignment = {'j': WD_ALIGN_PARAGRAPH.JUSTIFY, 'l': WD_ALIGN_PARAGRAPH.LEFT, 'c': WD_ALIGN_PARAGRAPH.CENTER, 'r': WD_ALIGN_PARAGRAPH.RIGHT}[rata]
    p.paragraph_format.space_after = Pt(after); p.paragraph_format.space_before = Pt(before)
    if kiri: p.paragraph_format.left_indent = Cm(kiri)
    if keep: p.paragraph_format.keep_with_next = True
    if el is not None:
        runs(p, el, size, color, bold, italic)
    elif teks:
        font(p.add_run(teks), size, bold, italic, color)
    return p


def para_sel(cell, el=None, teks=None, size=9, color=None, bold=None, rata='l', first=True, after=2):
    p = cell.paragraphs[0] if first and not cell.paragraphs[0].text and not cell.paragraphs[0].runs else cell.add_paragraph()
    p.alignment = {'j': WD_ALIGN_PARAGRAPH.JUSTIFY, 'l': WD_ALIGN_PARAGRAPH.LEFT, 'c': WD_ALIGN_PARAGRAPH.CENTER, 'r': WD_ALIGN_PARAGRAPH.RIGHT}[rata]
    p.paragraph_format.space_after = Pt(after); p.paragraph_format.line_spacing = 1.1
    if el is not None:
        runs(p, el, size, color, bold)
    elif teks is not None:
        font(p.add_run(teks), size, bold, None, color)
    return p


def kotak(isi_fn, isi_warna, garis_kiri=None):
    t = doc.add_table(rows=1, cols=1)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    borders(t, sisi=())
    c = t.cell(0, 0)
    shade(c, isi_warna)
    if garis_kiri:
        cell_border(c, 'left', garis_kiri, 24)
    margin_sel(t, 110, 160)
    isi_fn(c)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)
    return t


_IKC = {}


def ikon_png(svg):
    """svg lxml (ikon garis) -> PNG BytesIO lewat PyMuPDF"""
    import pymupdf
    from lxml import etree
    x = etree.tostring(svg, encoding='unicode')
    if 'xmlns=' not in x:
        x = x.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"', 1)
    x = re.sub(r'#([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})"', lambda m: '#' + ''.join(f'{round(255 - (255 - int(m[1][i:i + 2], 16)) * int(m[2], 16) / 255):02X}' for i in (0, 2, 4)) + '"', x)
    if x not in _IKC:
        d = pymupdf.open(stream=x.encode(), filetype='svg')
        pm = d[0].get_pixmap(matrix=pymupdf.Matrix(8, 8), alpha=True)
        _IKC[x] = pm.tobytes('png')
    return io.BytesIO(_IKC[x])


def gambar_b64(src):
    return io.BytesIO(base64.b64decode(src.split(',', 1)[1]))


# ---------- komponen ----------
def tabel_html(tb):
    rows_th = tb.xpath('./thead/tr/th')
    body = tb.xpath('./tbody/tr')
    ncol = len(rows_th)
    t = doc.add_table(rows=1, cols=ncol)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    borders(t, sisi=('bottom', 'insideH'))
    margin_sel(t, 45, 70)
    mini = 'mini' in (tb.get('class') or '')
    ukur = 7 if mini else 8.3
    lebar = [float(re.search(r'([\d.]+)%', c.get('style') or '0%')[1] or 0) for c in tb.xpath('./colgroup/col')]
    for i, th in enumerate(rows_th):
        c = t.rows[0].cells[i]
        shade(c, NAVY)
        para_sel(c, teks=th.text_content().strip().upper(), size=6.8 if mini else 7.2, color='FFFFFF', bold=True,
                 rata='r' if 'r' in (th.get('class') or '').split() else 'l')
    ulang_kepala(t.rows[0])
    for c in t.rows[0].cells:
        for pp in c.paragraphs:
            pp.paragraph_format.keep_with_next = True
    total = 'total' in (tb.get('class') or '')
    for j, tr in enumerate(body):
        tds = tr.xpath('./td')
        row = t.add_row()
        if 'grup' in (tr.get('class') or ''):
            m = row.cells[0].merge(row.cells[-1])
            shade(m, 'FBE7D6')
            para_sel(m, teks=tds[0].text_content().strip(), size=7.8, bold=True, color=NAVY)
            continue
        for i, td in enumerate(tds[:ncol]):
            c = row.cells[i]
            bg, fg = rgba_hex(td.get('style'), 'background'), rgba_hex(td.get('style'), 'color')
            if total and j == len(body) - 1:
                bg, fg = NAVY, 'FFFFFF'
            if bg:
                shade(c, bg)
            c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
            para_sel(c, el=td, size=ukur, color=fg, bold=True if (fg or 'hm' in (td.get('class') or '')) else None,
                     rata='r' if 'r' in (td.get('class') or '').split() else 'l')
    if any(lebar):
        lebar_kolom(t, [x or (100 - sum(lebar)) / max(1, lebar.count(0)) for x in lebar] if len(lebar) == ncol else [1] * ncol)
    tidak_pecah(t)
    return t


def kartu(div):
    kt = div.xpath('./div[contains(@class,"kt")]')
    n = len(kt)
    per = 3 if n == 6 else n
    rows = (n + per - 1) // per
    t = doc.add_table(rows=rows, cols=per)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    borders(t, sisi=())
    margin_sel(t, 70, 110)
    for i, k in enumerate(kt):
        c = t.cell(i // per, i % per)
        warna = re.search(r'#([0-9A-Fa-f]{6})', k.get('style') or '')[1]
        shade(c, TINT)
        cell_border(c, 'top', warna, 24)
        pk = para_sel(c, size=16, after=0)
        sv = k.xpath('.//svg')
        if sv:
            pk.add_run().add_picture(ikon_png(sv[0]), height=Pt(17)); pk.add_run('  ')
        font(pk.add_run(k.xpath('.//div[@class="kn"]')[0].text_content()), 16, True, None, warna)
        para_sel(c, teks=k.xpath('./div[@class="kl"]')[0].text_content(), size=8, color=TEKS2, first=False)
    tidak_pecah(t)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


def temuan(div):
    tm = div.xpath('./div[@class="tm"]')
    t = doc.add_table(rows=(len(tm) + 1) // 2, cols=2)
    borders(t, sisi=()); margin_sel(t, 60, 110)
    for i, x in enumerate(tm):
        c = t.cell(i // 2, i % 2)
        sv = x.xpath('./div[@class="tmk"]//svg')[0]
        from lxml import etree
        warna = re.search(r'stroke="#([0-9A-Fa-f]{6})"', etree.tostring(sv, encoding='unicode'))[1]
        cell_border(c, 'left', warna, 24)
        pi = para_sel(c, size=9, after=2)
        pi.add_run().add_picture(ikon_png(sv), height=Pt(20))
        para_sel(c, el=x.xpath('./div')[1], size=9, rata='j', first=False)
    tidak_pecah(t)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


def aksi(div):
    ak = div.xpath('./div[contains(@class,"ak")]')
    t = doc.add_table(rows=2, cols=len(ak))
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    borders(t, sisi=('top', 'left', 'bottom', 'right', 'insideV'), warna=GARIS)
    margin_sel(t, 60, 100)
    kepala = ['7F93AA', '4F6A88', ORANYE]
    for i, a in enumerate(ak):
        h = t.cell(0, i); shade(h, kepala[i])
        para_sel(h, el=a.xpath('./div[@class="akh"]')[0], size=9.5, color='FFFFFF', bold=True)
        for pp in h.paragraphs:
            pp.paragraph_format.keep_with_next = True
        c = t.cell(1, i); shade(c, 'FAFBFC')
        lis = a.xpath('.//li')
        if lis:
            for j, li in enumerate(lis):
                p = para_sel(c, size=8.5, first=(j == 0), after=4)
                font(p.add_run('•  '), 8.5, None, None, ORANYE if i == 2 else TEKS3)
                runs(p, li, 8.5)
        else:
            for j, pp in enumerate(a.xpath('./p')):
                para_sel(c, el=pp, size=8.5, first=(j == 0), after=3)
    tidak_pecah(t)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


def galeri(div):
    ft = div.xpath('./div[@class="ft"]')
    cls = div.get('class') or ''
    per = 4 if 'g4' in cls else 3 if 'g3' in cls else 2 if 'g2' in cls else 1
    if 'kecil' in cls:
        per = 2
    t = doc.add_table(rows=(len(ft) + per - 1) // per, cols=per)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    borders(t, sisi=()); margin_sel(t, 40, 60)
    lw = LEBAR / per - 0.3
    for i, f in enumerate(ft):
        c = t.cell(i // per, i % per)
        from PIL import Image
        bio = gambar_b64(f.xpath('.//img')[0].get('src'))
        im = Image.open(bio).convert('RGB')
        rasio = 0.75 if per > 2 else 9 / 16 if per == 2 else 0.75
        w, h = im.size
        if h / w > rasio:
            nh = int(w * rasio); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
        else:
            nw = int(h / rasio); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        im.thumbnail((1400, 1400))
        b2 = io.BytesIO(); im.save(b2, 'JPEG', quality=85); b2.seek(0)
        p = c.paragraphs[0]; p.paragraph_format.space_after = Pt(1)
        p.add_run().add_picture(b2, width=Cm(lw))
        fk = f.xpath('.//div[@class="fk"]')[0]
        kred = fk.xpath('./span')[0].text_content()
        para_sel(c, teks=(fk.text or '').strip(), size=7.5, color=TEKS2, first=False, after=0)
        para_sel(c, teks=kred, size=6.5, color=TEKS3, first=False)
    tidak_pecah(t)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


GBR = {}


def figure(fg):
    cap = fg.xpath('./figcaption')[0]
    p = para(el=cap, rata='l', size=9, color=TEKS2, after=3, keep=True)
    g = fg.xpath('./div[@class="gbr"]')[0]
    idx = GBR['i']; GBR['i'] += 1
    tb = g.xpath('.//table')
    if tb:
        tabel_html(tb[0])
    else:
        png = D / 'gbr' / f'gbr-{idx:02d}.png'
        from PIL import Image
        w, h = Image.open(png).size
        lebar = min(LEBAR, w / 3 / 96 * 2.54)   # skala layar 3x -> cm
        pp = doc.add_paragraph(); pp.alignment = WD_ALIGN_PARAGRAPH.CENTER; pp.paragraph_format.space_after = Pt(2)
        pp.add_run().add_picture(str(png), width=Cm(lebar))
    sb = fg.xpath('./div[@class="sb"]')[0]
    para(el=sb, rata='l', size=7.5, color=TEKS3, italic=True, after=8)


def kesimpulan(div):
    ks = div.xpath('./div[@class="ks"]')
    t = doc.add_table(rows=(len(ks) + 1) // 2, cols=2)
    borders(t, sisi=()); margin_sel(t, 70, 110)
    for i, k in enumerate(ks):
        c = t.cell(i // 2, i % 2)
        warna = re.search(r'#([0-9A-Fa-f]{6})', k.get('style'))[1]
        shade(c, TINT); cell_border(c, 'top', warna, 24)
        para_sel(c, teks=k.xpath('./span')[0].text_content().upper(), size=7, color=ORANYE, bold=True, after=0)
        sv = k.xpath('./svg')
        pj = para_sel(c, size=10, first=False, after=2)
        if sv:
            pj.add_run().add_picture(ikon_png(sv[0]), height=Pt(16)); pj.add_run('  ')
        runs(pj, k.xpath('./b')[0], 10, NAVY, True)
        para_sel(c, el=k.xpath('./p')[0], size=8.8, first=False)
    tidak_pecah(t)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


def daftar_isi():
    p = doc.add_paragraph()
    r = p.add_run()
    for tag, txt in (('begin', None), (None, 'TOC \\o "1-1" \\h \\z \\u'), ('separate', None)):
        if tag:
            e = OxmlElement('w:fldChar'); e.set(qn('w:fldCharType'), tag); r._r.append(e)
        else:
            e = OxmlElement('w:instrText'); e.set(qn('xml:space'), 'preserve'); e.text = txt; r._r.append(e)
    font(p.add_run('Klik kanan lalu pilih Update Field untuk memperbarui daftar isi.'), 9, None, True, TEKS3)
    r2 = p.add_run(); e = OxmlElement('w:fldChar'); e.set(qn('w:fldCharType'), 'end'); r2._r.append(e)
    s = doc.settings.element
    u = OxmlElement('w:updateFields'); u.set(qn('w:val'), 'true'); s.append(u)


def bab(div):
    lab = div.xpath('./span')[0].text_content()
    judul = ''.join(t for e in div.xpath('./text()|./span/following-sibling::text()') for t in [e]).strip() or ''.join(div.itertext()).replace(lab, '', 1).strip()
    warna = re.search(r'--w:#([0-9A-Fa-f]{6})', div.get('style') or '')
    warna = warna[1] if warna else NAVY
    h = doc.add_heading(level=1)
    h.paragraph_format.page_break_before = True
    pPr = h._p.get_or_add_pPr()
    bd = OxmlElement('w:pBdr'); l = OxmlElement('w:left'); l.set(qn('w:val'), 'single'); l.set(qn('w:sz'), '36'); l.set(qn('w:space'), '8'); l.set(qn('w:color'), warna); bd.append(l); pPr.append(bd)
    sh = OxmlElement('w:shd'); sh.set(qn('w:val'), 'clear'); sh.set(qn('w:fill'), TINT); pPr.append(sh)
    sv = div.xpath('.//div[@class="babi"]//svg')
    if sv:
        h.add_run().add_picture(ikon_png(sv[0]), height=Pt(26)); h.add_run('  ')
    font(h.add_run(lab), 8.5, True, False, warna)
    h.add_run().add_break()
    font(h.add_run(judul), 17, True, False, NAVY)


# ---------- sampul ----------
def sampul(sp):
    t = doc.add_table(rows=1, cols=3)
    borders(t, sisi=())
    t.cell(0, 0).paragraphs[0].add_run().add_picture(LOGO_BNPB, width=Cm(2.3))
    c = t.cell(0, 2); c.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
    c.paragraphs[0].add_run().add_picture(LOGO_KRIS, width=Cm(3.6))
    para(teks=sp.xpath('.//div[@class="sp-jenis"]')[0].text_content(), rata='l', size=9, bold=True, color=ORANYE, before=18, after=4)
    p = para(rata='l', after=6)
    for i_, b_ in enumerate(META['judul_sampul'].split('<br>')):
        if i_: p.add_run().add_break()
        font(p.add_run(b_), 27, True, None, NAVY)
    para(teks=sp.xpath('.//div[@class="sp-sub"]')[0].text_content(), rata='l', size=11.5, color=TEKS2, after=14)
    from PIL import Image
    st_ = sp.xpath('.//div[@class="sp-kanan"]')[0].get('style')
    src = re.search(r"url\('([^']+)'\)", st_)[1]
    im = Image.open(gambar_b64(src)).convert('RGB')
    w, h = im.size; nh = int(w * 0.4); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    b2 = io.BytesIO(); im.save(b2, 'JPEG', quality=88); b2.seek(0)
    pp = doc.add_paragraph(); pp.paragraph_format.space_after = Pt(2); pp.add_run().add_picture(b2, width=Cm(LEBAR))
    para(teks=sp.xpath('.//div[@class="sp-kredit"]')[0].text_content(), rata='r', size=7, color=TEKS3, after=16)
    for k in ('sp-kepada', 'sp-oleh'):
        el = sp.xpath(f'.//div[@class="{k}"]')[0]
        para(el=el, rata='l', size=10, color=TEKS2, after=10)
    p = para(rata='l', after=24)
    font(p.add_run(sp.xpath('.//div[@class="pil-tgl"]')[0].text_content()), 10, True, None, NAVY)
    para(el=sp.xpath('.//div[@class="sp-kaki"]')[0], rata='l', size=8, color='2F86D1')


# ---------- kepala dan kaki halaman ----------
def kepala_kaki(section):
    section.different_first_page_header_footer = True
    hd = section.header
    t = hd.add_table(rows=1, cols=2, width=Cm(LEBAR))
    borders(t, sisi=('bottom',), ukur=4)
    c0, c1 = t.cell(0, 0), t.cell(0, 1)
    p = c0.paragraphs[0]
    font(p.add_run(META['kepala']), 8, True, None, NAVY); p.add_run().add_break()
    font(p.add_run('Badan Nasional Penanggulangan Bencana'), 7.5, None, None, TEKS2)
    p1 = c1.paragraphs[0]; p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p1.add_run().add_picture(LOGO_KRIS, height=Cm(0.7)); p1.add_run('  ')
    p1.add_run().add_picture(LOGO_BNPB, height=Cm(1.0))
    for c, w in ((c0, 11), (c1, 6.6)):
        c.width = Cm(w)
    if hd.paragraphs and not hd.paragraphs[0].text:
        hd.paragraphs[0]._element.getparent().remove(hd.paragraphs[0]._element)
    ft = section.footer
    p = ft.paragraphs[0]
    p.paragraph_format.tab_stops.add_tab_stop(Cm(LEBAR), alignment=2)
    font(p.add_run('Graha BNPB, Jl. Pramuka Kav. 38, Jakarta Timur 13120. Call Center 117, www.bnpb.go.id'), 7, None, None, TEKS3)
    p.add_run('\t')
    r = p.add_run()
    for tag, txt in (('begin', None), (None, 'PAGE'), ('separate', None), (None, None), ('end', None)):
        if tag:
            e = OxmlElement('w:fldChar'); e.set(qn('w:fldCharType'), tag); r._r.append(e)
        elif txt:
            e = OxmlElement('w:instrText'); e.text = txt; r._r.append(e)
    font(r, 8, True, None, NAVY)


# ================= rakit =================
pohon = LH.fromstring((D / 'laporan.html').read_text(encoding='utf-8'))
sampul_h = LH.fromstring((D / 'sampul.html').read_text(encoding='utf-8'))
kepala_kaki(sec)
sampul(sampul_h.xpath('//section[contains(@class,"sampul")]')[0])
GBR['i'] = 0


def jalan(el):
    tag, cls = el.tag, (el.get('class') or '')
    if tag == 'section':
        if 'hal' in cls.split():
            pass
        for c in el:
            jalan(c)
    elif tag == 'h2':
        h = doc.add_heading(level=1)
        h.paragraph_format.page_break_before = True
        font(h.add_run(el.text_content()), 18, True, False, NAVY)
    elif 'bab' in cls.split() and tag == 'div':
        bab(el)
    elif tag == 'h3':
        h = doc.add_heading(level=2)
        runs(h, el, 12, NAVY, True)
    elif tag == 'ol' and 'toc' in cls:
        daftar_isi()
    elif tag == 'p':
        if 'tesis' in cls:
            kotak(lambda c: para_sel(c, el=el, size=12, color=NAVY, bold=None, rata='l'), 'FFFFFF', ORANYE)
        elif 'catatan' in cls:
            kotak(lambda c: para_sel(c, el=el, size=8.5, color=TEKS2, rata='j'), TINT)
        elif 'sb' in cls:
            para(el=el, rata='l', size=7.5, color=TEKS3, italic=True, after=8)
        else:
            para(el=el)
    elif 'kotak-info' in cls:
        kotak(lambda c: para_sel(c, el=el, size=9.5, rata='j'), 'DCEBF8', '2F86D1')
    elif 'kartu-satu' in cls:
        for c in el:
            jalan(c)
    elif tag == 'div' and cls.split()[:1] == ['kartu']:
        kartu(el)
    elif 'temuan' == cls:
        temuan(el)
    elif cls == 'aksi':
        aksi(el)
    elif 'galeri' in cls:
        galeri(el)
    elif tag == 'figure':
        figure(el)
    elif cls.startswith('dua'):
        for c in el:
            jalan(c)
    elif tag == 'div' and cls == '':
        for c in el:
            jalan(c)
    elif cls == 'kesimpulan':
        kesimpulan(el)
    elif cls == 'arahan':
        kotak(lambda c: para_sel(c, el=el, size=10.5, color='FFFFFF', rata='j'), ORANYE)
        for r in doc.tables[-1].cell(0, 0).paragraphs[0].runs:
            r.font.color.rgb = rgb('FFFFFF')
    elif cls == 'ttd':
        p = para(el=el, rata='l', size=9.5, before=12)
        p.paragraph_format.left_indent = Cm(9)
    elif tag == 'ul':
        for li in el.xpath('./li'):
            p = para(el=li, after=4, kiri=0.5)
            p.paragraph_format.first_line_indent = Cm(-0.4)
            p.runs[0].text = '•  ' + p.runs[0].text if p.runs else None
    elif tag == 'table':
        tabel_html(el)
        doc.add_paragraph().paragraph_format.space_after = Pt(0)
    else:
        for c in el:
            jalan(c)


for s in pohon.xpath('//body/section'):
    jalan(s)

cp = doc.core_properties
cp.title, cp.author, cp.subject, cp.language = META['judul'], 'Badan Nasional Penanggulangan Bencana', META['sub'], 'id-ID'
keluar = D / (META['berkas'] + '.docx')
doc.save(keluar)
print(keluar, 'gambar dipakai', GBR['i'])
