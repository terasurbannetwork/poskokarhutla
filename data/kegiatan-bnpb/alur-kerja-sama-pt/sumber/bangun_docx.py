"""Naskah markdown ringan -> DOCX bergaya laporan BNPB (tiruan Inventarisasi Data Geoportal BNPB 111126).

Pakai (dari folder ini): py bangun_docx.py konsep-acara.md "../Konsep Acara ... 111126.docx"; butuh python-docx dan Pillow.
Kepala naskah (baris "key: nilai" sampai baris kosong pertama): judul, subjudul, tanggal, foto, kredit.
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
AKAR = Path(r"D:/Project/Work/BNPB/poskokarhutla")
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


def foto_sampul(foto, keluar):
    """Foto 210 x 150 mm terpotong rapi + kotak logo KRIS putih di kanan atas + garis oranye di bawah."""
    pxmm = 10
    W, H, G = 210 * pxmm, 150 * pxmm, int(2.2 * pxmm)
    im = Image.open(foto).convert("RGB")
    r = max(W / im.width, H / im.height)
    im = im.resize((int(im.width * r) + 1, int(im.height * r) + 1), Image.LANCZOS)
    x0, y0 = (im.width - W) // 2, (im.height - H) // 2
    im = im.crop((x0, y0, x0 + W, y0 + H))
    kanvas = Image.new("RGB", (W, H + G), "#" + ORANYE)
    kanvas.paste(im, (0, 0))
    kris = Image.open(LOGO_KRIS).convert("RGBA")
    lw = int(48 * pxmm) - int(7 * pxmm)
    kris = kris.resize((lw, int(kris.height * lw / kris.width)), Image.LANCZOS)
    pad = int(3.5 * pxmm)
    kotak = Image.new("RGBA", (lw + 2 * pad, kris.height + 2 * int(2.5 * pxmm)), (255, 255, 255, 235))
    kotak.alpha_composite(kris, (pad, int(2.5 * pxmm)))
    lapis = kanvas.convert("RGBA")
    lapis.alpha_composite(kotak, (W - int(14 * pxmm) - kotak.width, int(12 * pxmm)))
    lapis.convert("RGB").save(keluar, quality=92)
    return keluar


def sampul(doc, meta):
    sek = doc.sections[0]
    sek.page_width, sek.page_height = Mm(210), Mm(297)
    sek.top_margin = sek.bottom_margin = sek.left_margin = sek.right_margin = Mm(0)
    sek.header_distance = sek.footer_distance = Mm(0)
    gambar = foto_sampul(meta["foto"], KERJA / (Path(meta["foto"]).stem + "-sampul.jpg"))
    p = doc.paragraphs[0] if doc.paragraphs else doc.add_paragraph()
    format_par(p, sesudah=0, spasi=1.0, rata=WD_ALIGN_PARAGRAPH.LEFT)
    p.add_run().add_picture(str(gambar), width=Mm(210))
    t = doc.add_table(rows=1, cols=1)
    tanpa_batas_tabel(t); lebar_kolom(t, [210])
    baris = t.rows[0]; baris.height = Mm(141); baris.height_rule = WD_ROW_HEIGHT_RULE.EXACTLY
    sel = baris.cells[0]; shade(sel._tc, NAVY); margin_sel(sel, atas=mm_dxa(18), kiri=mm_dxa(20), kanan=mm_dxa(20))
    p = sel.paragraphs[0]; format_par(p, sesudah=16, spasi=1.05, rata=WD_ALIGN_PARAGRAPH.LEFT)
    run(p, meta["judul"], ukuran=26, warna="FFFFFF", tebal=True)
    p = sel.add_paragraph(); format_par(p, sesudah=28, spasi=1.25, rata=WD_ALIGN_PARAGRAPH.LEFT)
    run(p, meta["subjudul"], ukuran=12.5, warna="D6E0EA")
    # kotak lembaga putih: logo | nama
    k = sel.add_table(rows=1, cols=2); tanpa_batas_tabel(k); lebar_kolom(k, [26, 89])
    for i, c in enumerate(k.rows[0].cells):
        shade(c._tc, "FFFFFF"); c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        margin_sel(c, atas=mm_dxa(3), bawah=mm_dxa(3), kiri=mm_dxa(4), kanan=mm_dxa(3))
    pl = k.rows[0].cells[0].paragraphs[0]; format_par(pl, sesudah=0, spasi=1.0, rata=WD_ALIGN_PARAGRAPH.LEFT)
    pl.add_run().add_picture(str(LOGO_BNPB), height=Mm(15))
    c2 = k.rows[0].cells[1]; batas_sel(c2, left=(6, "C9D2DB"))
    pn = c2.paragraphs[0]; format_par(pn, sesudah=0, spasi=1.0, rata=WD_ALIGN_PARAGRAPH.LEFT)
    run(pn, "Badan Nasional Penanggulangan Bencana", ukuran=11.5, warna=NAVY, tebal=True)
    p = sel.add_paragraph(); format_par(p, sebelum=18, sesudah=4, spasi=1.0, rata=WD_ALIGN_PARAGRAPH.LEFT)
    run(p, meta["tanggal"], ukuran=11, warna="D6E0EA")
    if meta.get("kredit"):
        p = sel.add_paragraph(); format_par(p, sebelum=60, sesudah=0, spasi=1.0, rata=WD_ALIGN_PARAGRAPH.LEFT)
        run(p, meta["kredit"], ukuran=7.5, warna="8FA3B8")
    # paragraf penutup seksi dibuat sekecil mungkin supaya tidak melimpah ke halaman kosong
    p = doc.add_paragraph(); format_par(p, sesudah=0, spasi=1.0)
    p.paragraph_format.line_spacing = Pt(1)
    r = p.add_run(" "); r.font.size = Pt(1)


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
    n = len(kepala)
    pendek = sum(len(x) for b in baris for x in b) < 1200   # tabel pendek dijaga satu halaman
    lebar_pct = lebar_pct or [100 / n] * n
    tot = sum(lebar_pct)
    lebar = [170 * x / tot for x in lebar_pct]
    t = doc.add_table(rows=1 + len(baris), cols=n)
    tanpa_batas_tabel(t); lebar_kolom(t, lebar); t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for j, teks in enumerate(kepala):
        c = t.rows[0].cells[j]; shade(c._tc, NAVY); c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        margin_sel(c, atas=100, bawah=100, kiri=120, kanan=120)
        p = c.paragraphs[0]; format_par(p, sesudah=0, spasi=1.15, rata=WD_ALIGN_PARAGRAPH.CENTER)
        run(p, teks, ukuran=9, warna="FFFFFF", tebal=True)
    jaga_baris(t.rows[0], kepala=True)
    for i, b in enumerate(baris, start=1):
        tebal_baris = b[0].startswith("**") and b[0].endswith("**")
        for j in range(n):
            teks = b[j] if j < len(b) else ""
            c = t.rows[i].cells[j]
            margin_sel(c, atas=100, bawah=100, kiri=120, kanan=120)
            batas_sel(c, bottom=(4, GARIS))
            if i % 2 == 0:
                shade(c._tc, "F7F9FB")
            p = c.paragraphs[0]
            bersih = teks.strip("* ")
            angka = bool(re.fullmatch(r"[\d.,\s]+", bersih)) and bersih != ""
            rata = WD_ALIGN_PARAGRAPH.LEFT
            if angka:
                rata = WD_ALIGN_PARAGRAPH.CENTER if len(bersih) <= 5 else WD_ALIGN_PARAGRAPH.RIGHT
            format_par(p, sesudah=0, spasi=1.15, rata=rata)
            if pendek and i < len(baris):
                p.paragraph_format.keep_with_next = True   # tabel pendek tidak dipotong di ujung halaman
            run(p, teks.replace("**", "") if tebal_baris else teks, ukuran=9, tebal=tebal_baris)
        jaga_baris(t.rows[i])
    if pendek:
        for c in t.rows[0].cells:
            c.paragraphs[0].paragraph_format.keep_with_next = True
    p = doc.add_paragraph(); format_par(p, sesudah=4, spasi=1.0)


def kotak(doc, teks):
    t = doc.add_table(rows=1, cols=1); tanpa_batas_tabel(t); lebar_kolom(t, [170])
    c = t.rows[0].cells[0]; shade(c._tc, "FDF3EA"); batas_sel(c, left=(32, ORANYE))
    margin_sel(c, atas=160, bawah=160, kiri=220, kanan=220)
    p = c.paragraphs[0]; format_par(p, sesudah=0); run(p, teks)
    p = doc.add_paragraph(); format_par(p, sesudah=4, spasi=1.0)


def daftar(doc, butir, bernomor):
    for i, teks in enumerate(butir, start=1):
        p = doc.add_paragraph(); format_par(p, sesudah=4)
        pf = p.paragraph_format; pf.left_indent = Mm(7); pf.first_line_indent = Mm(-5)
        pf.tab_stops.add_tab_stop(Mm(7))
        run(p, (f"{i}." if bernomor else "\u2022") + "\t" + teks)
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
            p.add_run().add_picture(str((Path(naskah).parent / m.group(2)).resolve()), width=Mm(165))
            p = doc.add_paragraph(); format_par(p, sesudah=10, rata=WD_ALIGN_PARAGRAPH.CENTER, spasi=1.1)
            run(p, m.group(1), ukuran=8.6, warna=ABU, miring=True)
        elif s.startswith("~ "):
            siram(); p = doc.add_paragraph(); format_par(p, sesudah=8, spasi=1.2); run(p, s[2:], ukuran=8.6, warna=ABU)
        else:
            siram(); p = doc.add_paragraph(); format_par(p); run(p, s)
        j += 1
    siram()
    cp = doc.core_properties
    cp.title = meta["judul"]; cp.author = "Badan Nasional Penanggulangan Bencana"; cp.subject = meta["subjudul"]; cp.language = "id-ID"
    doc.save(keluar)
    print("ok", keluar)


if __name__ == "__main__":
    bangun(sys.argv[1], sys.argv[2])
