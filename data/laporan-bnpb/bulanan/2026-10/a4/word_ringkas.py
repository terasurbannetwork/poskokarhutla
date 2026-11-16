"""Versi Word ringkas 3 lembar, dibangun dari ringkas.html (helper DOCX dari word.py bagian sebelum 'rakit').
python ringkas.py -> node tangkap2.mjs ringkas.html gbr-rk -> python word_ringkas.py
"""
from pathlib import Path
SINI = Path(__file__).resolve().parent
_src = (SINI / 'word.py').read_text(encoding='utf-8').split('# ================= rakit =================')[0]
exec(compile(_src.replace('D = Path(__file__).resolve().parent', f'D = Path(r"{SINI}")'), 'word', 'exec'))

sec.top_margin, sec.bottom_margin = Cm(1.6), Cm(1.4)
sec.left_margin = sec.right_margin = Cm(1.4)
LEBAR = 18.2
st.font.size = Pt(8.8)
st.paragraph_format.space_after = Pt(3)
st.paragraph_format.line_spacing = 1.08


def tetap(t, cm):
    """tata letak tabel tetap dengan lebar kolom (cm)"""
    t.autofit = False
    tblPr = t._element.tblPr
    lay = OxmlElement('w:tblLayout'); lay.set(qn('w:type'), 'fixed'); tblPr.append(lay)
    grid = t._element.find(qn('w:tblGrid'))
    for i, gc in enumerate(grid.findall(qn('w:gridCol'))):
        gc.set(qn('w:w'), str(int(cm[i] * 567)))
    for row in t.rows:
        for i, c in enumerate(row.cells):
            c.width = Cm(cm[i])


def temuan(div):
    tm = div.xpath('./div[@class="tm"]')
    t = doc.add_table(rows=(len(tm) + 1) // 2, cols=2)
    borders(t, sisi=()); margin_sel(t, 50, 100); tetap(t, [LEBAR / 2] * 2)
    for i, x in enumerate(tm):
        c = t.cell(i // 2, i % 2)
        sv = x.xpath('./div[@class="tmk"]//svg')[0]
        from lxml import etree
        warna = re.search(r'stroke="#([0-9A-Fa-f]{6})"', etree.tostring(sv, encoding='unicode'))[1]
        cell_border(c, 'left', warna, 24)
        p = para_sel(c, size=8.6, rata='j', after=0)
        p.add_run().add_picture(ikon_png(sv), height=Pt(14)); p.add_run(' ')
        runs(p, x.xpath('./div')[1], 8.6)

pohon = LH.fromstring((SINI / 'ringkas.html').read_text(encoding='utf-8'))
lembar = pohon.xpath('//div[@class="lembar"]')


def kaki_hal(section):
    ft = section.footer
    p = ft.paragraphs[0]
    p.paragraph_format.tab_stops.add_tab_stop(Cm(LEBAR), alignment=2)
    font(p.add_run('Graha BNPB, Jl. Pramuka Kav. 38, Jakarta Timur 13120. Call Center 117, www.bnpb.go.id'), 6.8, None, None, TEKS3)
    p.add_run('\t')
    r = p.add_run()
    for tag, txt in (('begin', None), (None, 'PAGE'), ('separate', None), ('end', None)):
        if tag:
            e = OxmlElement('w:fldChar'); e.set(qn('w:fldCharType'), tag); r._r.append(e)
        else:
            e = OxmlElement('w:instrText'); e.text = txt; r._r.append(e)
    font(r, 7, True, None, NAVY)
    font(p.add_run(' dari 3'), 7, True, None, NAVY)


def kop(teks_kecil=None):
    t = doc.add_table(rows=1, cols=2)
    borders(t, sisi=('bottom',), ukur=6, warna=NAVY if teks_kecil is None else GARIS)
    c0, c1 = t.cell(0, 0), t.cell(0, 1)
    p = c0.paragraphs[0]
    if teks_kecil is None:
        p.add_run().add_picture(LOGO_BNPB, height=Cm(1.7)); p.add_run('   ')
        r = p.add_run(); r.add_break()
        p2 = c0.add_paragraph()
        font(p2.add_run('LAPORAN BULANAN KEPALA BNPB'), 7.5, True, None, ORANYE)
        p3 = c0.add_paragraph(); p3.paragraph_format.space_after = Pt(0)
        font(p3.add_run('Laporan Bencana Oktober 2026'), 19, True, None, NAVY)
        p4 = c0.add_paragraph()
        font(p4.add_run('Disampaikan kepada Presiden Republik Indonesia, Jakarta, 12 November 2026'), 9, None, None, TEKS2)
    else:
        font(p.add_run('Laporan Bencana Oktober 2026'), 9, True, None, NAVY); p.add_run().add_break()
        font(p.add_run(teks_kecil), 8, None, None, TEKS2)
    q = c1.paragraphs[0]; q.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    q.add_run().add_picture(LOGO_KRIS, height=Cm(0.75 if teks_kecil else 0.9))
    if teks_kecil:
        q.add_run('  '); q.add_run().add_picture(LOGO_BNPB, height=Cm(1.0))
    tetap(t, [11.6, 6.6])
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


def judul(el):
    h = doc.add_heading(level=2)
    h.paragraph_format.space_before = Pt(6); h.paragraph_format.space_after = Pt(3)
    runs(h, el, 11, NAVY, True)


def pisah_halaman():
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


kepala_kaki_dummy = None
sec.different_first_page_header_footer = False
kaki_hal(sec)

# ---------- lembar 1 ----------
L = lembar[0]
kop()
for el in L:
    cls = el.get('class') or ''
    if cls in ('kop1', 'kaki'):
        continue
    if el.tag == 'p' and 'tesis' in cls:
        kotak(lambda c, e=el: para_sel(c, el=e, size=10.5, color=NAVY, rata='l'), 'FFFFFF', ORANYE)
    elif el.tag == 'h3':
        judul(el)
    elif cls.startswith('kartu'):
        kartu(el)
    elif el.tag == 'p':
        para(el=el, size=8.8, after=4)
    elif cls == 'dua':
        t = doc.add_table(rows=1, cols=2); borders(t, sisi=())
        c0, c1 = t.cell(0, 0), t.cell(0, 1)
        figs = el.xpath('.//figure')
        p = para_sel(c0, el=figs[0].xpath('./figcaption')[0], size=8, color=TEKS2)
        c0.add_paragraph().add_run().add_picture(str(SINI / 'gbr-rk' / 'gbr-00.png'), width=Cm(8.6))
        para_sel(c0, el=figs[0].xpath('./div[@class="sb"]')[0], size=6.8, color=TEKS3, first=False)
        para_sel(c1, el=figs[1].xpath('./figcaption')[0], size=8, color=TEKS2)
        tb = figs[1].xpath('.//table')[0]
        rows = [[x.text_content().strip() for x in tr.xpath('./th|./td')] for tr in tb.xpath('.//tr')]
        nt = c1.add_table(rows=len(rows), cols=len(rows[0])); borders(nt, sisi=('bottom', 'insideH'))
        for i, r in enumerate(rows):
            for j, v in enumerate(r):
                c = nt.cell(i, j)
                if i == 0:
                    shade(c, NAVY)
                para_sel(c, teks=v.upper() if i == 0 else v, size=6.8 if i == 0 else 7.6, color='FFFFFF' if i == 0 else ('2F86D1' if j == 3 else None),
                         bold=True if i == 0 or j == 3 else None, rata='r' if j else 'l', after=0)
        para_sel(c1, el=figs[1].xpath('./div[@class="sb"]')[0], size=6.8, color=TEKS3, first=False)
        tetap(t, [8.9, 9.3])
        tetap(nt, [3.2, 1.6, 1.6, 2.4])
    elif cls == 'temuan':
        temuan(el)
pisah_halaman()

# ---------- lembar 2 ----------
L = lembar[1]
kop('Rincian per jenis bencana')
blok = L.xpath('.//div[@class="blok"]')
t = doc.add_table(rows=2, cols=2); borders(t, sisi=('top', 'left', 'bottom', 'right', 'insideH', 'insideV'), warna=GARIS); tetap(t, [LEBAR / 2] * 2)
margin_sel(t, 50, 80)
for i, b in enumerate(blok):
    c = t.cell(i // 2, i % 2)
    warna = re.search(r'--w:#([0-9A-Fa-f]{6})', b.get('style'))[1]
    cell_border(c, 'top', warna, 24)
    para_sel(c, el=b.xpath('./div[@class="bl-h"]')[0], size=10, color=NAVY, bold=True, after=3)
    img = b.xpath('.//img[@class="pt"]')
    if img:
        pi = c.add_paragraph(); pi.alignment = WD_ALIGN_PARAGRAPH.CENTER; pi.paragraph_format.space_after = Pt(2)
        from PIL import Image
        bio = gambar_b64(img[0].get('src')); w, h = Image.open(bio).size; bio.seek(0)
        lebar = 8.4 if w / h > 1.2 else 4.6
        pi.add_run().add_picture(bio, width=Cm(lebar))
    for a in b.xpath('.//div[@class="ang"]'):
        pa = c.add_paragraph(); pa.paragraph_format.space_after = Pt(1)
        pa.add_run().add_picture(ikon_png(a.xpath('./svg')[0]), height=Pt(12)); pa.add_run(' ')
        av = a.xpath('.//div[@class="av"]')[0]
        wv = re.search(r'#([0-9A-Fa-f]{6})', av.get('style'))[1]
        font(pa.add_run(av.text_content() + '  '), 11, True, None, wv)
        font(pa.add_run(a.xpath('.//div[@class="al"]')[0].text_content()), 7.6, None, None, TEKS2)
    for d in b.xpath('./div[@class="bl-ak"]/div'):
        para_sel(c, el=d.xpath('./b')[0], size=7.6, bold=True, color=ORANYE if 'ak2' in (d.xpath('./b')[0].get('class') or '') else NAVY, first=False, after=0)
        para_sel(c, el=d.xpath('./p')[0], size=7.8, first=False, after=3)
    c.width = Cm(LEBAR / 2)
para(el=L.xpath('.//p[@class="sb"]')[0], rata='l', size=6.6, color=TEKS3, italic=True, before=3)
pisah_halaman()

# ---------- lembar 3 ----------
L = lembar[2]
kop('Program kerja dan dukungan yang dimohon')
for el in L:
    cls = el.get('class') or ''
    if cls in ('kop', 'kaki'):
        continue
    if el.tag == 'h3':
        judul(el)
    elif el.tag == 'p':
        para(el=el, size=8.8, after=4)
    elif 'dua' in cls:
        t = doc.add_table(rows=1, cols=2); borders(t, sisi=())
        c0, c1 = t.cell(0, 0), t.cell(0, 1)
        tb = el.xpath('.//table')[0]
        rows = [[x for x in tr.xpath('./th|./td')] for tr in tb.xpath('.//tr')]
        nt = c0.add_table(rows=len(rows), cols=3); borders(nt, sisi=('bottom', 'insideH'))
        for i, r in enumerate(rows):
            for j, x in enumerate(r):
                cc = nt.cell(i, j)
                if i == 0:
                    shade(cc, NAVY)
                para_sel(cc, teks=x.text_content().strip().upper() if i == 0 else x.text_content().strip(), size=6.8 if i == 0 else 7.8,
                         color='FFFFFF' if i == 0 else None, bold=True if i == 0 else None, after=0)
        tetap(nt, [1.5, 6.5, 3.0])
        for im, fk in zip(el.xpath('.//div[@class="ft2"]/img'), el.xpath('.//div[@class="ft2"]/div[@class="fk"]')):
            from PIL import Image
            bio = gambar_b64(im.get('src')); pim = Image.open(bio).convert('RGB'); W, H = pim.size; nh = int(W * 0.62)
            pim = pim.crop((0, max(0, (H - nh) // 2), W, max(0, (H - nh) // 2) + min(nh, H))); b2 = io.BytesIO(); pim.save(b2, 'JPEG', quality=85); b2.seek(0)
            p = c1.paragraphs[0] if not c1.paragraphs[0].runs else c1.add_paragraph()
            p.paragraph_format.space_after = Pt(1)
            p.add_run().add_picture(b2, width=Cm(6.4))
            para_sel(c1, teks=(fk.text or '').strip(), size=7, color=TEKS2, first=False, after=0)
            para_sel(c1, teks=fk.xpath('./span')[0].text_content(), size=6.3, color=TEKS3, first=False, after=3)
        tetap(t, [11.4, 6.8])
    elif cls == 'duk':
        for dk_ in el.xpath('./div[@class="dk"]'):
            t = doc.add_table(rows=1, cols=2); borders(t, sisi=('bottom',))
            c0, c1 = t.cell(0, 0), t.cell(0, 1)
            c0.paragraphs[0].add_run().add_picture(ikon_png(dk_.xpath('./svg')[0]), height=Pt(18))
            isi = dk_.xpath('./div')[0]
            p = para_sel(c1, size=8.4, after=0)
            runs(p, isi.xpath('./b')[0], 8.4, NAVY, True)
            tail = isi.xpath('./b')[0].tail or ''
            font(p.add_run(' ' + tail.strip()), 8.4)
            for x in isi.xpath('./i'):
                pass
            txt = ''.join(isi.xpath('./text()|./i/text()|./i/following-sibling::text()'))
            p.runs[-1].text = ' ' + re.sub(r'\s+', ' ', ' '.join(t.strip() for t in isi.xpath('./b/following-sibling::text()|./i/text()')))
            para_sel(c1, teks=isi.xpath('./div[@class="dkm"]')[0].text_content(), size=7, color=TEKS3, first=False, after=2)
            tetap(t, [1.0, 17.2])
    elif cls == 'arahan':
        kotak(lambda c, e=el: para_sel(c, el=e, size=9.2, color='FFFFFF', rata='j'), ORANYE)
        for r in doc.tables[-1].cell(0, 0).paragraphs[0].runs:
            r.font.color.rgb = rgb('FFFFFF')
    elif cls == 'ttd':
        p = para(el=el, rata='l', size=8.6, before=4)
        p.paragraph_format.left_indent = Cm(9.5)

cp = doc.core_properties
cp.title, cp.author, cp.language = 'Laporan Bencana Oktober 2026 Ringkas', 'Badan Nasional Penanggulangan Bencana', 'id-ID'
keluar = SINI / 'Laporan Bencana Oktober 2026 Ringkas v2.docx'
doc.save(keluar)
print(keluar)
