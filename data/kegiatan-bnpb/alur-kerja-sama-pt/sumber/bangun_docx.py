"""Naskah markdown ringan -> DOCX bergaya laporan BNPB (tiruan Inventarisasi Data Geoportal BNPB 111126).

Pakai (dari folder ini): py bangun_docx.py konsep-acara.md "../Konsep Acara ... 111126.docx"; butuh python-docx dan Pillow.
Kepala naskah (baris "key: nilai" sampai baris kosong pertama): judul, subjudul, tanggal, foto, foto_geser
(0 potong dari atas, 1 dari bawah), label (pita kecil di atas judul sampul), kredit.
Blok: "# " bab (halaman baru kecuali bab pertama), "## " subbab, "1. " daftar bernomor, "- " butir,
"> " kotak sorot, "|" tabel (baris pertama kepala; baris "%% 10,30,60" sebelum tabel = lebar persen),
"![keterangan](jalur)" gambar selebar isi, "~ " catatan kecil abu.
"""
import re, sys
from pathlib import Path
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ROW_HEIGHT_RULE, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Mm, Pt, RGBColor
from PIL import Image, ImageDraw

NAVY, ABU, TEKS, GARIS, ORANYE = "0B1F33", "5B6673", "1D2733", "D5DCE4", "E8792B"
AKAR = Path(__file__).resolve().parents[4]
LOGO_KRIS = AKAR / "data/templat-dokumen/aset/logo-kris.png"
LOGO_BNPB = Path(__file__).parent / "aset/logo-bnpb.png"
KERJA = Path(__file__).parent / "kerja"   # foto sampul olahan; tidak perlu di-commit
KERJA.mkdir(exist_ok=True)
ALAMAT = "Badan Nasional Penanggulangan Bencana, Graha BNPB, Jl. Pramuka Kav. 38, Jakarta Timur 13120"


def rgb(h):
    return RGBColor.from_string(h)


def shade(el, warna):
    pr = el.get_or_add_tcPr() if hasattr(el, "get_or_add_tcPr") else el
    s = OxmlElement("w:shd"); s.set(qn("w:val"), "clear"); s.set(qn("w:color"), "auto"); s.set(qn("w:fill"), warna)
    pr.append(s)


def batas_sel(sel, **sisi):
    tcPr = sel._tc.get_or_add_tcPr()
    b = tcPr.find(qn("w:tcBorders"))
    if b is None:
        b = OxmlElement("w:tcBorders"); tcPr.append(b)
    for nama in ("top", "left", "bottom", "right"):
        e = OxmlElement(f"w:{nama}")
        if nama in sisi and sisi[nama]:
            sz, warna = sisi[nama]
            e.set(qn("w:val"), "single"); e.set(qn("w:sz"), str(sz)); e.set(qn("w:color"), warna)
        else:
            e.set(qn("w:val"), "nil")
        b.append(e)


def margin_sel(sel, atas=0, bawah=0, kiri=0, kanan=0):
    tcPr = sel._tc.get_or_add_tcPr()
    m = OxmlElement("w:tcMar")
    for nama, v in (("top", atas), ("bottom", bawah), ("start", kiri), ("end", kanan)):
        e = OxmlElement(f"w:{nama}"); e.set(qn("w:w"), str(int(v))); e.set(qn("w:type"), "dxa"); m.append(e)
    tcPr.append(m)


def mm_dxa(mm):
    return int(mm * 56.7)


def lebar_kolom(tabel, lebar_mm):
    tbl = tabel._tbl
    grid = tbl.tblGrid
    for i, gc in enumerate(grid.findall(qn("w:gridCol"))):
        gc.set(qn("w:w"), str(mm_dxa(lebar_mm[i])))
    for baris in tabel.rows:
        for i, sel in enumerate(baris.cells):
            sel.width = Mm(lebar_mm[i])
    tblPr = tbl.tblPr
    lay = OxmlElement("w:tblLayout"); lay.set(qn("w:type"), "fixed"); tblPr.append(lay)
    w = tblPr.find(qn("w:tblW"))
    if w is None:
        w = OxmlElement("w:tblW"); tblPr.append(w)
    w.set(qn("w:w"), str(mm_dxa(sum(lebar_mm)))); w.set(qn("w:type"), "dxa")


def tanpa_batas_tabel(tabel):
    tblPr = tabel._tbl.tblPr
    b = OxmlElement("w:tblBorders")
    for nama in ("top", "left", "bottom", "right", "insideH", "insideV"):
        e = OxmlElement(f"w:{nama}"); e.set(qn("w:val"), "nil"); b.append(e)
    tblPr.append(b)


def jaga_baris(baris, kepala=False):
    trPr = baris._tr.get_or_add_trPr()
    e = OxmlElement("w:cantSplit"); trPr.append(e)
    if kepala:
        e = OxmlElement("w:tblHeader"); trPr.append(e)


def run(p, teks, ukuran=10.5, warna=TEKS, tebal=False, miring=False):
    """Teks dengan **tebal** sebaris."""
    for i, bag in enumerate(re.split(r"\*\*", teks)):
        for j, sub in enumerate(re.split(r"\*", bag)):   # *miring* untuk istilah asing
            if not sub:
                continue
            r = p.add_run(sub)
            r.font.size = Pt(ukuran); r.font.color.rgb = rgb(warna); r.font.name = "Roboto"
            r.bold = tebal or (i % 2 == 1); r.italic = miring or (j % 2 == 1)
    return p


def run_judul(h, teks):
    """Judul dengan *miring*; ukuran dan warna diwarisi dari gaya Heading."""
    for j, sub in enumerate(teks.split("*")):
        if sub:
            h.add_run(sub).italic = (j % 2 == 1)


def format_par(p, ukuran=10.5, sesudah=7, sebelum=0, rata=WD_ALIGN_PARAGRAPH.JUSTIFY, spasi=1.28):
    pf = p.paragraph_format
    pf.space_after = Pt(sesudah); pf.space_before = Pt(sebelum); pf.line_spacing = spasi; p.alignment = rata


def gaya_dasar(doc):
    st = doc.styles["Normal"]
    st.font.name = "Roboto"; st.font.size = Pt(10.5); st.font.color.rgb = rgb(TEKS)
    rpr = st.element.get_or_add_rPr()
    rf = rpr.find(qn("w:rFonts"))
    for a in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
        rf.set(qn(a), "Roboto")
    lang = OxmlElement("w:lang"); lang.set(qn("w:val"), "id-ID"); rpr.append(lang)
    for nama, uk, sebelum, sesudah, caps in (("Heading 1", 19, 0, 8, True), ("Heading 2", 12.5, 16, 5, False)):
        h = doc.styles[nama]
        h.font.name = "Roboto"; h.font.size = Pt(uk); h.font.bold = True; h.font.color.rgb = rgb(NAVY); h.font.italic = False
        h.font.all_caps = caps
        r = h.element.get_or_add_rPr(); rf = r.find(qn("w:rFonts"))
        if rf is None:
            rf = OxmlElement("w:rFonts"); r.append(rf)
        for a in ("w:ascii", "w:hAnsi", "w:cs", "w:eastAsia"):
            rf.set(qn(a), "Roboto")
        for a in ("w:asciiTheme", "w:hAnsiTheme", "w:cstheme", "w:eastAsiaTheme"):
            if rf.get(qn(a)) is not None:
                del rf.attrib[qn(a)]
        pf = h.paragraph_format
        pf.space_before = Pt(sebelum); pf.space_after = Pt(sesudah); pf.keep_with_next = True; pf.line_spacing = 1.1


def huruf(uk, gaya="Regular"):
    from PIL import ImageFont
    nama = f"Roboto-{gaya}.ttf"
    for d in (Path("C:/Windows/Fonts"), Path.home() / "AppData/Local/Microsoft/Windows/Fonts"):
        if (d / nama).exists():
            return ImageFont.truetype(str(d / nama), uk)
    raise FileNotFoundError(nama)


def latar_sampul(meta, keluar):
    """Latar sampul A4 utuh 200 dpi: foto HD 165 mm, gradasi ke navy, garis oranye, kotak logo KRIS,
    blok logo BNPB di kaki, dan kredit foto. Satu gambar, jadi tidak ada unsur yang bisa geser."""
    px = 200 / 25.4
    W, H = round(210 * px), round(297 * px)
    hf = round(165 * px)
    kanvas = Image.new("RGB", (W, H), "#" + NAVY)
    im = Image.open(Path(meta["foto"]).expanduser()).convert("RGB")
    r = max(W / im.width, hf / im.height)
    im = im.resize((round(im.width * r) + 1, round(im.height * r) + 1), Image.LANCZOS)
    geser = float(meta.get("foto_geser", "0.5"))          # 0 = potong dari atas, 1 = dari bawah
    x0, y0 = (im.width - W) // 2, round((im.height - hf) * geser)
    kanvas.paste(im.crop((x0, y0, x0 + W, y0 + hf)), (0, 0))
    # gradasi bawah foto ke navy supaya sambungannya halus
    lapis = Image.new("RGBA", (W, hf), (0, 0, 0, 0)); dl = ImageDraw.Draw(lapis)
    navy = tuple(int(NAVY[i:i + 2], 16) for i in (0, 2, 4))
    tinggi = round(55 * px)
    for i in range(tinggi):
        a = int(235 * (i / tinggi) ** 1.6)
        dl.line((0, hf - tinggi + i, W, hf - tinggi + i), fill=navy + (a,))
    # bayangan tipis di atas supaya kotak logo terbaca
    for i in range(round(30 * px)):
        dl.line((0, i, W, i), fill=(0, 0, 0, int(70 * (1 - i / (30 * px)))))
    kanvas = kanvas.convert("RGBA"); kanvas.alpha_composite(lapis)
    d = ImageDraw.Draw(kanvas)
    d.rectangle((0, hf, W, hf + round(2.2 * px)), fill="#" + ORANYE)
    # kotak logo KRIS di kanan atas
    kris = Image.open(LOGO_KRIS).convert("RGBA")
    lw = round(40 * px); kris = kris.resize((lw, round(kris.height * lw / kris.width)), Image.LANCZOS)
    pad = round(4 * px)
    kx, ky = W - round(18 * px) - lw - 2 * pad, round(14 * px)
    d.rounded_rectangle((kx, ky, kx + lw + 2 * pad, ky + kris.height + 2 * pad), radius=round(2 * px), fill="white")
    kanvas.alpha_composite(kris, (kx + pad, ky + pad))
    # blok lembaga di kaki: logo BNPB di kotak putih + nama lembaga
    bn = Image.open(LOGO_BNPB).convert("RGBA")
    bh = round(17 * px); bn = bn.resize((round(bn.width * bh / bn.height), bh), Image.LANCZOS)
    by = H - round(40 * px); bx = round(20 * px); bp = round(3 * px)
    d.rounded_rectangle((bx, by, bx + bn.width + 2 * bp, by + bh + 2 * bp), radius=round(2 * px), fill="white")
    kanvas.alpha_composite(bn, (bx + bp, by + bp))
    tx = bx + bn.width + 2 * bp + round(6 * px)
    d.text((tx, by + round(3.2 * px)), "Badan Nasional", font=huruf(round(13 * px * 0.3528 * 1.0), "Bold"), fill="white")
    d.text((tx, by + round(9.2 * px)), "Penanggulangan Bencana", font=huruf(round(13 * px * 0.3528), "Bold"), fill="white")
    d.text((tx, by + round(16.4 * px)), "Graha BNPB, Jl. Pramuka Kav. 38, Jakarta Timur", font=huruf(round(8.5 * px * 0.3528)), fill="#9FB3C8")
    d.line((round(20 * px), by - round(7 * px), W - round(20 * px), by - round(7 * px)), fill="#2A3F55", width=2)
    if meta.get("kredit"):
        d.text((round(20 * px), H - round(10 * px)), meta["kredit"], font=huruf(round(6.5 * px * 0.3528)), fill="#7F93A8")
    kanvas.convert("RGB").save(keluar, quality=93, dpi=(200, 200))
    return keluar


def gambar_latar(paragraf, jalur, lebar, tinggi):
    """Gambar menempel di halaman (pojok kiri atas), di belakang teks."""
    from docx.oxml import parse_xml
    r = paragraf.add_run(); r.add_picture(str(jalur), width=lebar, height=tinggi)
    inline = r._r.find(".//" + qn("wp:inline"))
    ext = inline.find(qn("wp:extent")); graf = inline.find(qn("a:graphic")); dp = inline.find(qn("wp:docPr"))
    xml = (
        '<wp:anchor xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
        'distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="0" behindDoc="1" locked="1" '
        'layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/>'
        '<wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH>'
        '<wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV>'
        f'<wp:extent cx="{ext.get("cx")}" cy="{ext.get("cy")}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>'
        f'<wp:wrapNone/><wp:docPr id="{dp.get("id")}" name="Latar sampul"/><wp:cNvGraphicFramePr/></wp:anchor>'
    )
    anchor = parse_xml(xml); anchor.append(graf)
    inline.getparent().replace(inline, anchor)


def sampul(doc, meta):
    sek = doc.sections[0]
    sek.page_width, sek.page_height = Mm(210), Mm(297)
    sek.top_margin, sek.bottom_margin, sek.left_margin, sek.right_margin = Mm(178), Mm(10), Mm(20), Mm(22)
    sek.header_distance = sek.footer_distance = Mm(0)
    latar = latar_sampul(meta, KERJA / (Path(meta["foto"]).stem + "-sampul.jpg"))
    p = doc.paragraphs[0] if doc.paragraphs else doc.add_paragraph()
    format_par(p, sesudah=0, spasi=1.0, rata=WD_ALIGN_PARAGRAPH.LEFT)
    gambar_latar(p, latar, Mm(210), Mm(297))
    r = p.add_run(meta.get("label", "").upper()); r.font.size = Pt(8.5); r.bold = True
    r.font.color.rgb = rgb(ORANYE); r.font.name = "Roboto"; _spasi_huruf(r, 30)
    p = doc.add_paragraph(); format_par(p, sebelum=6, sesudah=12, spasi=1.04, rata=WD_ALIGN_PARAGRAPH.LEFT)
    run(p, meta["judul"], ukuran=float(meta.get("judul_ukuran", 25)), warna="FFFFFF", tebal=True)
    p = doc.add_paragraph(); format_par(p, sesudah=14, spasi=1.3, rata=WD_ALIGN_PARAGRAPH.LEFT)
    run(p, meta["subjudul"], ukuran=11.5, warna="C9D6E3")
    p = doc.add_paragraph(); format_par(p, sesudah=0, spasi=1.0, rata=WD_ALIGN_PARAGRAPH.LEFT)
    pPr = p._p.get_or_add_pPr(); bd = OxmlElement("w:pBdr"); kiri = OxmlElement("w:left")
    kiri.set(qn("w:val"), "single"); kiri.set(qn("w:sz"), "24"); kiri.set(qn("w:color"), ORANYE); kiri.set(qn("w:space"), "8")
    bd.append(kiri); pPr.append(bd)
    run(p, meta["tanggal"], ukuran=11, warna="FFFFFF", tebal=True)


def _spasi_huruf(r, nilai):
    rpr = r._r.get_or_add_rPr(); e = OxmlElement("w:spacing"); e.set(qn("w:val"), str(nilai)); rpr.append(e)


def kepala_kaki(sek, meta):
    sek.top_margin, sek.bottom_margin, sek.left_margin, sek.right_margin = Mm(30), Mm(22), Mm(20), Mm(20)
    sek.header_distance, sek.footer_distance = Mm(10), Mm(9)
    sek.different_first_page_header_footer = False
    for hf in (sek.header, sek.footer):
        hf.is_linked_to_previous = False
    h = sek.header
    for p in h.paragraphs:
        p.text = ""
    t = h.add_table(rows=1, cols=3, width=Mm(170)); tanpa_batas_tabel(t); lebar_kolom(t, [124, 34, 12])
    c1, c2, c3 = t.rows[0].cells
    for c in (c1, c2, c3):
        batas_sel(c, bottom=(5, "B8C3CE")); margin_sel(c, bawah=mm_dxa(2))
        c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.BOTTOM
    p = c1.paragraphs[0]; format_par(p, sesudah=0, spasi=1.1, rata=WD_ALIGN_PARAGRAPH.LEFT)
    run(p, meta["judul_pendek"], ukuran=7.5, warna=NAVY, tebal=True)
    p = c1.add_paragraph(); format_par(p, sesudah=0, spasi=1.1, rata=WD_ALIGN_PARAGRAPH.LEFT)
    run(p, meta["tanggal"], ukuran=7.5, warna=ABU)
    p = c2.paragraphs[0]; format_par(p, sesudah=0, spasi=1.0, rata=WD_ALIGN_PARAGRAPH.RIGHT)
    p.add_run().add_picture(str(LOGO_KRIS), height=Mm(7))
    p = c3.paragraphs[0]; format_par(p, sesudah=0, spasi=1.0, rata=WD_ALIGN_PARAGRAPH.RIGHT)
    p.add_run().add_picture(str(LOGO_BNPB), height=Mm(9))
    h.paragraphs[0]._p.getparent().remove(h.paragraphs[0]._p) if len(h.paragraphs) > 1 else None
    f = sek.footer
    p = f.paragraphs[0]; format_par(p, sesudah=0, spasi=1.0, rata=WD_ALIGN_PARAGRAPH.LEFT)
    pPr = p._p.get_or_add_pPr()
    bd = OxmlElement("w:pBdr"); top = OxmlElement("w:top")
    top.set(qn("w:val"), "single"); top.set(qn("w:sz"), "5"); top.set(qn("w:color"), "B8C3CE"); top.set(qn("w:space"), "4")
    bd.append(top); pPr.append(bd)
    ts = p.paragraph_format.tab_stops
    ts.add_tab_stop(Mm(85), WD_TAB_ALIGNMENT.CENTER); ts.add_tab_stop(Mm(170), WD_TAB_ALIGNMENT.RIGHT)
    run(p, "\t" + ALAMAT + "\t", ukuran=7, warna=ABU)
    r = p.add_run(); r.font.size = Pt(9); r.bold = True; r.font.color.rgb = rgb(NAVY); r.font.name = "Roboto"
    for jenis, isi in (("begin", None), (None, " PAGE "), ("end", None)):
        if jenis:
            e = OxmlElement("w:fldChar"); e.set(qn("w:fldCharType"), jenis); r._r.append(e)
        else:
            e = OxmlElement("w:instrText"); e.set(qn("xml:space"), "preserve"); e.text = isi; r._r.append(e)


def nomor_halaman_mulai(sek, n=1):
    sectPr = sek._sectPr
    pg = OxmlElement("w:pgNumType"); pg.set(qn("w:start"), str(n)); sectPr.append(pg)


def tabel(doc, kepala, baris, lebar_pct):
    """Kepala navy, pita selang-seling per kelompok, sel kolom pertama yang berulang digabung,
    baris tebal (Jumlah) diberi latar biru muda dan garis atas navy."""
    n = len(kepala)
    pendek = sum(len(x) for b in baris for x in b) < 1200   # tabel pendek dijaga satu halaman
    lebar_pct = lebar_pct or [100 / n] * n
    tot = sum(lebar_pct)
    lebar = [170 * x / tot for x in lebar_pct]
    t = doc.add_table(rows=1 + len(baris), cols=n)
    tanpa_batas_tabel(t); lebar_kolom(t, lebar); t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for j, teks in enumerate(kepala):
        c = t.rows[0].cells[j]; shade(c._tc, NAVY); c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        margin_sel(c, atas=90, bawah=90, kiri=110, kanan=110)
        batas_sel(c, bottom=(12, ORANYE))
        p = c.paragraphs[0]; format_par(p, sesudah=0, spasi=1.1, rata=WD_ALIGN_PARAGRAPH.CENTER)
        run(p, teks, ukuran=8.8, warna="FFFFFF", tebal=True)
    jaga_baris(t.rows[0], kepala=True)
    # kelompok: baris berturut-turut dengan isi kolom pertama yang sama
    kel, k = [], -1
    for i, b in enumerate(baris):
        if i == 0 or b[0] != baris[i - 1][0] or not b[0].strip():
            k += 1
        kel.append(k)
    ada_kelompok = n > 2 and k < len(baris) - 1
    for i, b in enumerate(baris, start=1):
        tebal_baris = b[0].startswith("**") and b[0].endswith("**")
        pita = (kel[i - 1] if ada_kelompok else i - 1) % 2 == 1
        for j in range(n):
            teks = b[j] if j < len(b) else ""
            c = t.rows[i].cells[j]
            margin_sel(c, atas=55, bawah=55, kiri=100, kanan=100)
            c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
            if tebal_baris:
                shade(c._tc, "E3EAF2"); batas_sel(c, top=(8, NAVY), bottom=(8, NAVY))
            else:
                batas_sel(c, bottom=(4, GARIS))
                if pita:
                    shade(c._tc, "F4F7FA")
            p = c.paragraphs[0]
            bersih = teks.strip("* ")
            angka = bool(re.fullmatch(r"[\d.,\s]+", bersih)) and bersih != ""
            rata = WD_ALIGN_PARAGRAPH.LEFT
            if angka:
                rata = WD_ALIGN_PARAGRAPH.CENTER if len(bersih) <= 5 else WD_ALIGN_PARAGRAPH.RIGHT
            format_par(p, sesudah=0, spasi=1.15, rata=rata)
            if pendek and i < len(baris):
                p.paragraph_format.keep_with_next = True   # tabel pendek tidak dipotong di ujung halaman
            if ada_kelompok and j == 0 and i > 1 and kel[i - 1] == kel[i - 2]:
                continue                                    # diisi lewat sel gabungan di atasnya
            run(p, teks.replace("**", "") if tebal_baris else teks, ukuran=8.8,
                tebal=tebal_baris or (ada_kelompok and j == 0), warna=NAVY if (ada_kelompok and j == 0) else TEKS)
        jaga_baris(t.rows[i])
    if ada_kelompok:
        i = 0
        while i < len(baris):
            j = i
            while j + 1 < len(baris) and kel[j + 1] == kel[i]:
                j += 1
            if j > i:
                atas = t.cell(i + 1, 0)
                gab = atas.merge(t.cell(j + 1, 0))
                for p in gab.paragraphs[1:]:
                    p._p.getparent().remove(p._p)
                batas_sel(gab, bottom=(4, GARIS))
            i = j + 1
    if pendek:
        for c in t.rows[0].cells:
            c.paragraphs[0].paragraph_format.keep_with_next = True
    p = doc.add_paragraph(); format_par(p, sesudah=4, spasi=1.0)


def kotak(doc, teks):
    t = doc.add_table(rows=1, cols=1); tanpa_batas_tabel(t); lebar_kolom(t, [170])
    c = t.rows[0].cells[0]; shade(c._tc, "FDF3EA"); batas_sel(c, left=(32, ORANYE))
    margin_sel(c, atas=160, bawah=160, kiri=220, kanan=220)
    p = c.paragraphs[0]; format_par(p, sesudah=3, rata=WD_ALIGN_PARAGRAPH.LEFT, spasi=1.0)
    r = p.add_run("CATATAN"); r.font.size = Pt(8); r.bold = True; r.font.color.rgb = rgb(ORANYE); r.font.name = "Roboto"
    _spasi_huruf(r, 20)
    p = c.add_paragraph(); format_par(p, sesudah=0); run(p, teks)
    p = doc.add_paragraph(); format_par(p, sesudah=4, spasi=1.0)


def daftar(doc, butir, bernomor):
    for i, teks in enumerate(butir, start=1):
        p = doc.add_paragraph(); format_par(p, sesudah=4)
        pf = p.paragraph_format; pf.left_indent = Mm(8); pf.first_line_indent = Mm(-6)
        pf.tab_stops.add_tab_stop(Mm(8))
        if bernomor:
            run(p, f"{i}.", tebal=True, warna=NAVY)
        else:
            run(p, "\u25a0", ukuran=7, warna=ORANYE)
        run(p, "\t" + teks)
    doc.paragraphs[-1].paragraph_format.space_after = Pt(9)


def bangun(naskah, keluar):
    baris = Path(naskah).read_text(encoding="utf-8").splitlines()
    meta, i = {}, 0
    while baris[i].strip():
        k, v = baris[i].split(":", 1); meta[k.strip()] = v.strip(); i += 1
    meta.setdefault("judul_pendek", meta["judul"])
    doc = Document()
    gaya_dasar(doc)
    sampul(doc, meta)
    sek = doc.add_section(WD_SECTION.NEW_PAGE)
    kepala_kaki(sek, meta); nomor_halaman_mulai(sek, 1)
    bab_pertama, lebar, buf_daftar, jenis_daftar = True, None, [], None
    blok = baris[i:]
    j = 0

    def siram():
        nonlocal buf_daftar, jenis_daftar
        if buf_daftar:
            daftar(doc, buf_daftar, jenis_daftar == "ol")
        buf_daftar, jenis_daftar = [], None

    while j < len(blok):
        s = blok[j].rstrip()
        if not s.strip():
            siram(); j += 1; continue
        if s.startswith("# "):
            siram()
            h = doc.add_heading("", level=1); run_judul(h, s[2:])
            bd = OxmlElement("w:pBdr")
            for sisi, uk, warna, jarak in (("left", 36, ORANYE, 8), ("bottom", 6, GARIS, 6)):
                e = OxmlElement(f"w:{sisi}"); e.set(qn("w:val"), "single"); e.set(qn("w:sz"), str(uk))
                e.set(qn("w:color"), warna); e.set(qn("w:space"), str(jarak)); bd.append(e)
            h._p.get_or_add_pPr().append(bd)
            if not bab_pertama:
                h.paragraph_format.page_break_before = True
            bab_pertama = False
        elif s.startswith("## "):
            siram(); run_judul(doc.add_heading("", level=2), s[3:])
        elif s.startswith("%% "):
            lebar = [float(x) for x in s[3:].split(",")]
        elif s.startswith("|"):
            siram()
            rows = []
            while j < len(blok) and blok[j].startswith("|"):
                sel = [x.strip() for x in blok[j].strip().strip("|").split("|")]
                if not all(re.fullmatch(r":?-{3,}:?", x) for x in sel):
                    rows.append(sel)
                j += 1
            tabel(doc, rows[0], rows[1:], lebar); lebar = None
            continue
        elif re.match(r"^\d+\. ", s):
            if jenis_daftar != "ol":
                siram(); jenis_daftar = "ol"
            buf_daftar.append(re.sub(r"^\d+\. ", "", s))
        elif s.startswith("- "):
            if jenis_daftar != "ul":
                siram(); jenis_daftar = "ul"
            buf_daftar.append(s[2:])
        elif s.startswith("> "):
            siram(); kotak(doc, s[2:])
        elif s.startswith("!["):
            siram()
            m = re.match(r"!\[(.*)\]\((.*)\)", s)
            p = doc.add_paragraph(); format_par(p, sesudah=3, rata=WD_ALIGN_PARAGRAPH.CENTER, spasi=1.0)
            p.paragraph_format.keep_with_next = True
            jalur = (Path(naskah).parent / m.group(2)).resolve()
            with Image.open(jalur) as gb:
                rasio = gb.height / gb.width
            lebar_g = min(165, 185 / rasio)
            p.add_run().add_picture(str(jalur), width=Mm(lebar_g))
            p = doc.add_paragraph(); format_par(p, sesudah=10, rata=WD_ALIGN_PARAGRAPH.CENTER, spasi=1.1)
            run(p, m.group(1), ukuran=8.6, warna=ABU, miring=True)
        elif s.startswith("~ "):
            siram(); p = doc.add_paragraph(); format_par(p, sesudah=8, spasi=1.2); run(p, s[2:], ukuran=8.6, warna=ABU)
        else:
            siram(); p = doc.add_paragraph(); format_par(p); run(p, s)
            berikut = next((x for x in blok[j + 1:] if x.strip()), "")
            if re.match(r"^(\||%% |\d+\. |- |!\[)", berikut):
                p.paragraph_format.keep_with_next = True   # kalimat pengantar tidak terpisah dari daftar atau tabelnya
        j += 1
    siram()
    cp = doc.core_properties
    cp.title = meta["judul"]; cp.author = "Badan Nasional Penanggulangan Bencana"; cp.subject = meta["subjudul"]; cp.language = "id-ID"
    doc.save(keluar)
    print("ok", keluar)


if __name__ == "__main__":
    bangun(sys.argv[1], sys.argv[2])
