# Naskah Kepala BNPB, AMMDM ke-14: gaya dokumen BNPB (Laporan Bencana bulanan, word_tulis.py).
# Keluaran: 1 dokumen lengkap (sampul, daftar isi, jadwal) dan 7 dokumen per acara.
# Pakai: py bangun_desain.py [folder_keluar]   (dua lintasan: nomor halaman dari PDF LibreOffice)
import re, subprocess, sys, tempfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from isi_ammdm import ACARA, ISIAN
from kunci_ammdm import RE_KUNCI
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_COLOR_INDEX, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Pt, Cm, RGBColor

AKAR = Path(r"D:\Project\Work\BNPB\poskokarhutla")
KELUAR = Path(sys.argv[1]) if len(sys.argv) > 1 else AKAR / "data/kegiatan-bnpb/ammdm-14-251126"
LOGO_BNPB = str(AKAR / "data/kajian-bnpb/skill/surat-bnpb/assets/logo-bnpb.png")
LOGO_KRIS = str(AKAR / "data/templat-dokumen/aset/logo-kris.png")
SOFFICE = r"C:\Program Files\LibreOffice\program\soffice.exe"
LENGKAP = "Naskah Lengkap Kepala BNPB AMMDM ke-14.docx"
JUDUL_DOK = "Naskah Sambutan dan Pernyataan Kepala BNPB, AMMDM ke-14"
ALAMAT = "Graha BNPB, Jl. Pramuka Kav. 38, Jakarta Timur 13120. Call Center 117, www.bnpb.go.id"

# palet dan ukuran (konst.py Laporan Bencana)
NAVY, ORANYE, BIRU = "051C2C", "D9600B", "2F86D1"
TEKS, TEKS2, TEKS3, GARIS, TINT = "1A1A1A", "2E3440", "6B7280", "BFC5CC", "F1F3F6"
FONT, UK = "Roboto", 11
KIRI = KANAN = 1.9
LEBAR = 21 - KIRI - KANAN
RE_POT = re.compile(r"(\[[^\]]*\]|\(\([^)]*\)\))")


def isi(t):
    return re.sub(r"\{([A-Z_]+)\}", lambda m: ISIAN[m.group(1)], t)


def kata(baris):
    return sum(len(re.findall(r"[A-Za-z][A-Za-z'\-]*", RE_POT.sub("", isi(t)))) for t in baris)


def durasi(n, pendek=False):
    m = kata(n["en"]) / 120
    if m < 1: return "< 1 menit" if pendek else "kurang dari 1 menit"
    return f"± {round(m)} menit" if pendek else f"sekitar {round(m)} menit"


# ---------------------------------------------------------------- pembantu XML
def rgb(h): return RGBColor.from_string(h)


def huruf(r, size=UK, bold=None, italic=None, color=TEKS):
    r.font.name = FONT
    rf = r._element.get_or_add_rPr().get_or_add_rFonts()
    for a in ("w:eastAsia", "w:cs"): rf.set(qn(a), FONT)
    r.font.size = Pt(size)
    if bold is not None: r.font.bold = bold
    if italic is not None: r.font.italic = italic
    if color: r.font.color.rgb = rgb(color)
    return r


def shade(pr, warna):
    s = OxmlElement("w:shd"); s.set(qn("w:val"), "clear"); s.set(qn("w:color"), "auto"); s.set(qn("w:fill"), warna); pr.append(s)


def p_border(p, sisi, warna, ukur=8, ruang=4):
    pPr = p._p.get_or_add_pPr(); bd = pPr.find(qn("w:pBdr"))
    if bd is None: bd = OxmlElement("w:pBdr"); pPr.append(bd)
    e = OxmlElement("w:" + sisi)
    for k, v in (("w:val", "single"), ("w:sz", str(ukur)), ("w:space", str(ruang)), ("w:color", warna)): e.set(qn(k), v)
    bd.append(e)


def tbl_borders(t, sisi=("bottom", "insideH"), warna=GARIS, ukur=4):
    b = OxmlElement("w:tblBorders")
    for k in ("top", "left", "bottom", "right", "insideH", "insideV"):
        e = OxmlElement(f"w:{k}")
        if k in sisi:
            for a, v in (("w:val", "single"), ("w:sz", str(ukur)), ("w:color", warna)): e.set(qn(a), v)
        else:
            e.set(qn("w:val"), "nil")
        b.append(e)
    t._element.tblPr.append(b)


def tetap(t, lebar):
    t.autofit = False
    lay = OxmlElement("w:tblLayout"); lay.set(qn("w:type"), "fixed"); t._element.tblPr.append(lay)
    for col, w in zip(t.columns, lebar): col.width = Cm(w)
    for row in t.rows:
        for c, w in zip(row.cells, lebar): c.width = Cm(w)


def margin_sel(t, atas=60, kiri=100):
    m = OxmlElement("w:tblCellMar")
    for k, v in (("top", atas), ("left", kiri), ("bottom", atas), ("right", kiri)):
        e = OxmlElement(f"w:{k}"); e.set(qn("w:w"), str(v)); e.set(qn("w:type"), "dxa"); m.append(e)
    t._element.tblPr.append(m)


def field(p, instr, **kw):
    r = p.add_run()
    for tag, txt in (("begin", None), (None, instr), ("separate", None)):
        if tag:
            e = OxmlElement("w:fldChar"); e.set(qn("w:fldCharType"), tag); r._r.append(e)
        else:
            e = OxmlElement("w:instrText"); e.set(qn("xml:space"), "preserve"); e.text = txt; r._r.append(e)
    huruf(p.add_run("1"), **kw)
    r2 = p.add_run(); e = OxmlElement("w:fldChar"); e.set(qn("w:fldCharType"), "end"); r2._r.append(e)


def tanda(par, nama, nid):
    s = OxmlElement("w:bookmarkStart"); s.set(qn("w:id"), str(nid)); s.set(qn("w:name"), nama)
    e = OxmlElement("w:bookmarkEnd"); e.set(qn("w:id"), str(nid))
    pPr = par._p.pPr
    (pPr.addnext(s) if pPr is not None else par._p.insert(0, s)); par._p.append(e)


def tautan(par, teks, ke, **kw):
    h = OxmlElement("w:hyperlink"); h.set(qn("w:anchor"), ke); h.set(qn("w:history"), "1")
    r = huruf(par.add_run(teks), **kw); par._p.remove(r._r); h.append(r._r); par._p.append(h)


# ---------------------------------------------------------------- dokumen
class Naskah:
    def __init__(self, judul_kaki):
        self.d = Document(); self.nid = 0; self.judul_kaki = judul_kaki
        st = self.d.styles["Normal"]; st.font.name = FONT; st.font.size = Pt(UK)
        st.element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), FONT)
        s = self.d.sections[0]
        s.page_width, s.page_height = Cm(21), Cm(29.7)

    def atur_isi(self, sec, mulai_satu=True):
        sec.left_margin, sec.right_margin = Cm(KIRI), Cm(KANAN)
        sec.top_margin, sec.bottom_margin = Cm(2.6), Cm(2.0)
        sec.header_distance, sec.footer_distance = Cm(0.9), Cm(0.8)
        if mulai_satu:
            pg = OxmlElement("w:pgNumType"); pg.set(qn("w:start"), "1"); sec._sectPr.append(pg)
        sec.header.is_linked_to_previous = False; sec.footer.is_linked_to_previous = False
        hd = sec.header
        t = hd.add_table(rows=1, cols=2, width=Cm(LEBAR)); tbl_borders(t, sisi=("bottom",), ukur=4)
        p = t.cell(0, 0).paragraphs[0]; p.paragraph_format.space_after = Pt(0)
        huruf(p.add_run(self.judul_kaki), 8, True, color=NAVY); p.add_run().add_break()
        huruf(p.add_run("Badan Nasional Penanggulangan Bencana"), 7.5, color=TEKS2)
        t.cell(0, 0).vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        p1 = t.cell(0, 1).paragraphs[0]; p1.alignment = WD_ALIGN_PARAGRAPH.RIGHT; p1.paragraph_format.space_after = Pt(0)
        p1.add_run().add_picture(LOGO_KRIS, height=Cm(0.7)); p1.add_run("  ")
        p1.add_run().add_picture(LOGO_BNPB, height=Cm(1.0))
        tetap(t, [LEBAR - 4.6, 4.6])
        if hd.paragraphs and not hd.paragraphs[0].text:
            hd.paragraphs[0]._element.getparent().remove(hd.paragraphs[0]._element)
        hd.add_paragraph().paragraph_format.space_after = Pt(0)
        p = sec.footer.paragraphs[0]
        p_border(p, "top", GARIS, 4, 6)
        p.paragraph_format.tab_stops.add_tab_stop(Cm(LEBAR), WD_TAB_ALIGNMENT.RIGHT)
        huruf(p.add_run(ALAMAT), 7, color=TEKS3); p.add_run("\t")
        field(p, "PAGE", size=8, bold=True, color=NAVY)

    def p(self, teks="", size=UK, sesudah=6, sebelum=0, spasi=1.25, rata="l", lanjut=False, **kw):
        par = self.d.add_paragraph(); f = par.paragraph_format
        f.space_after, f.space_before, f.line_spacing = Pt(sesudah), Pt(sebelum), spasi
        f.keep_with_next = lanjut; f.keep_together = True; f.widow_control = True
        par.alignment = {"l": WD_ALIGN_PARAGRAPH.LEFT, "j": WD_ALIGN_PARAGRAPH.JUSTIFY, "c": WD_ALIGN_PARAGRAPH.CENTER}[rata]
        if teks: self.tulis(par, teks, size=size, **kw)
        return par

    def tulis(self, par, teks, size=UK, bahasa=None, **kw):
        for b in RE_POT.split(teks):
            if not b: continue
            if b.startswith("(("):
                huruf(par.add_run("[" + b[2:-2] + "]"), size, italic=True, color=TEKS3)
            elif b.startswith("["):
                huruf(par.add_run(b), size, **kw).font.highlight_color = WD_COLOR_INDEX.YELLOW
            elif bahasa:
                for i, k in enumerate(RE_KUNCI[bahasa].split(b)):
                    if k: huruf(par.add_run(k), size, bold=True if i % 2 else None, color=NAVY if i % 2 else TEKS)
            else:
                huruf(par.add_run(b), size, **kw)

    def label(self, teks, sebelum=10):
        return self.p(teks, size=8.5, sesudah=6, sebelum=sebelum, lanjut=True, bold=True, color=ORANYE)

    def h1(self, label, teks, nama, baru=True):
        """Kotak judul = tabel satu sel: latar abu, garis kiri navy tebal (satu garis utuh di Word dan LibreOffice),
        ruang dalam dari margin sel. Paragraf pemisah 1 pt di depannya membawa pindah halaman dan mencegah Word
        menggabungkan kotak ini dengan tabel sebelumnya (mis. tabel jadwal, yang lalu kepalanya berulang)."""
        pisah = self.d.add_paragraph(); f = pisah.paragraph_format
        f.space_before = f.space_after = Pt(0); f.line_spacing = Pt(1); f.keep_with_next = True; f.page_break_before = baru
        huruf(pisah.add_run(""), 1)
        t = self.d.add_table(rows=1, cols=1); tbl_borders(t, sisi=()); margin_sel(t, atas=150, kiri=240)
        c = t.cell(0, 0); tcPr = c._element.get_or_add_tcPr()
        tcb = OxmlElement("w:tcBorders"); e = OxmlElement("w:left")
        for k, v in (("w:val", "single"), ("w:sz", "36"), ("w:space", "0"), ("w:color", NAVY)): e.set(qn(k), v)
        tcb.append(e); tcPr.append(tcb); shade(tcPr, TINT)
        lb = c.paragraphs[0]; f = lb.paragraph_format
        f.space_before = Pt(0); f.space_after = Pt(2); f.keep_with_next = True
        huruf(lb.add_run(label), 8.5, True, color=ORANYE)
        h = c.add_paragraph(); f = h.paragraph_format
        f.space_before = f.space_after = Pt(0); f.line_spacing = 1.05; f.keep_with_next = True
        huruf(h.add_run(teks), 17, True, color=NAVY)
        tetap(t, [LEBAR]); t.alignment = WD_TABLE_ALIGNMENT.LEFT
        jarak = self.p(sesudah=0, lanjut=True); jarak.paragraph_format.line_spacing = Pt(10)   # ruang di bawah kotak
        self.nid += 1; tanda(h, nama, self.nid)
        return h

    def h2(self, teks, nama=None, baru=False):
        h = self.p(teks, size=13, sesudah=3, sebelum=4, lanjut=True, bold=True, color=NAVY)
        h.paragraph_format.page_break_before = baru
        p_border(h, "bottom", NAVY, 10, 3)
        if nama: self.nid += 1; tanda(h, nama, self.nid)
        return h

    def tabel(self, kepala, baris, lebar, tengah=(), gabung=(), size=9.5):
        t = self.d.add_table(rows=1 if kepala else 0, cols=len(lebar)); t.alignment = WD_TABLE_ALIGNMENT.CENTER
        tbl_borders(t, sisi=("top", "bottom", "insideH")); margin_sel(t)
        if kepala:
            for i, h in enumerate(kepala):
                c = t.rows[0].cells[i]; shade(c._element.get_or_add_tcPr(), NAVY)
                par = c.paragraphs[0]; par.alignment = WD_ALIGN_PARAGRAPH.CENTER
                huruf(par.add_run(h), size, True, color="FFFFFF")
            tr = t.rows[0]._tr.get_or_add_trPr(); e = OxmlElement("w:tblHeader"); e.set(qn("w:val"), "true"); tr.append(e)
        for b in baris:
            cs = t.add_row().cells
            for i, v in enumerate(b):
                par = cs[i].paragraphs[0]; f = par.paragraph_format; f.space_after = Pt(0); f.line_spacing = 1.1
                par.alignment = WD_ALIGN_PARAGRAPH.CENTER if i in tengah else WD_ALIGN_PARAGRAPH.LEFT
                cs[i].vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
                if (not kepala and i == 0) or i in gabung:
                    shade(cs[i]._element.get_or_add_tcPr(), TINT)      # kolom kelompok: latar seragam di semua baris
                if not kepala and i == 0:
                    huruf(par.add_run(v), size, True, color=NAVY)
                elif isinstance(v, tuple):
                    huruf(par.add_run(v[0]), size, True, color=NAVY)
                else:
                    huruf(par.add_run(v), size, color=TEKS)
        tetap(t, lebar)
        awal = 1 if kepala else 0
        for k in gabung:
            i = awal
            while i < len(t.rows):
                j = i + 1
                while j < len(t.rows) and baris[j - awal][k] in ("", ("",)): j += 1
                if j - i > 1:
                    m = t.cell(i, k).merge(t.cell(j - 1, k))
                    for par in m.paragraphs[1:]: par._element.getparent().remove(par._element)
                    m.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
                i = j
        return t

    def badan(self, baris, bahasa):
        baris = [isi(t) for t in baris]
        batas = baris.index("") if "" in baris else 0
        nomor = batas > 2
        for i, t in enumerate(baris):
            if not t: continue
            if i < batas:
                par = self.p(sesudah=1 if i < batas - 1 else 10, spasi=1.2)
                if nomor:
                    f = par.paragraph_format; f.left_indent = Cm(0.7); f.first_line_indent = Cm(-0.7)
                    f.tab_stops.add_tab_stop(Cm(0.7))
                    huruf(par.add_run(f"{i + 1}."), UK, True, color=ORANYE); par.add_run("\t")
                self.tulis(par, t, color=TEKS)
            else:
                # paragraf sebelum penutup diikat ke penutup: "Thank you." tidak pernah sendirian di halaman baru
                par = self.p(sesudah=6, spasi=1.25, rata="j", lanjut=(i == len(baris) - 2))
                self.tulis(par, t, bahasa=bahasa)

    def simpan(self, path):
        path.parent.mkdir(parents=True, exist_ok=True); self.d.save(path); return path


# ---------------------------------------------------------------- isi
def sampul(N):
    s = N.d.sections[0]
    s.left_margin = s.right_margin = Cm(2.2); s.top_margin, s.bottom_margin = Cm(2.0), Cm(1.5)
    # kop logo: BNPB | garis tegak | KRIS, sejajar tengah
    t = N.d.add_table(rows=1, cols=3); tbl_borders(t, sisi=()); margin_sel(t, atas=0, kiri=0)
    c0, c1, c2 = t.rows[0].cells
    for c in (c0, c1, c2):
        c.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
        c.paragraphs[0].paragraph_format.space_after = Pt(0)
    c0.paragraphs[0].add_run().add_picture(LOGO_BNPB, height=Cm(2.2))
    c1.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
    tcb = OxmlElement("w:tcBorders"); e = OxmlElement("w:left")
    for k, v in (("w:val", "single"), ("w:sz", "8"), ("w:color", GARIS)): e.set(qn(k), v)
    tcb.append(e); c1._element.get_or_add_tcPr().append(tcb)
    huruf(c1.paragraphs[0].add_run(" "), 30)
    c2.paragraphs[0].add_run().add_picture(LOGO_KRIS, width=Cm(4.6))
    tetap(t, [2.2, 0.9, 5.2])
    t.alignment = WD_TABLE_ALIGNMENT.LEFT
    N.p("AMMDM KE-14 DAN RANGKAIAN PERTEMUAN", size=9.5, sebelum=120, sesudah=6, bold=True, color=ORANYE)
    N.p("Naskah Sambutan dan Pernyataan Kepala BNPB", size=28, sesudah=10, spasi=1.05, bold=True, color=NAVY)
    N.p("Pertemuan Tingkat Menteri ASEAN ke-14 tentang Penanggulangan Bencana, Pertemuan ke-15 Konferensi Para Pihak AADMER, "
        "serta Pertemuan Tingkat Menteri ASEAN bersama Republik Rakyat Tiongkok, Jepang, dan Republik Korea",
        size=11.5, sesudah=14, color=TEKS2)
    q = N.p(sesudah=14); p_border(q, "bottom", GARIS, 8, 1)
    N.p("Disampaikan oleh", size=9.5, sesudah=2, color=TEKS2)
    N.p("Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si. (Han)", size=12, sesudah=0, bold=True, color=NAVY)
    N.p("Kepala Badan Nasional Penanggulangan Bencana", size=10.5, sesudah=16, color=TEKS2)
    # lencana tanggal: sel navy berjarak dalam rata, aksen oranye di kiri
    t = N.d.add_table(rows=1, cols=1); tbl_borders(t, sisi=()); margin_sel(t, atas=90, kiri=200)
    c = t.cell(0, 0); shade(c._element.get_or_add_tcPr(), NAVY)
    tcb = OxmlElement("w:tcBorders"); e = OxmlElement("w:left")
    for k, v in (("w:val", "single"), ("w:sz", "36"), ("w:color", ORANYE)): e.set(qn(k), v)
    tcb.append(e); c._element.get_or_add_tcPr().append(tcb)
    par = c.paragraphs[0]; par.paragraph_format.space_after = Pt(0)
    huruf(par.add_run("Jakarta, 25-26 November 2026"), 10.5, True, color="FFFFFF")
    tetap(t, [6.0]); t.alignment = WD_TABLE_ALIGNMENT.LEFT
    # Word (mode kompatibilitas) menaruh tepi tabel di luar margin sebesar margin sel; geser balik supaya sejajar teks
    ind = OxmlElement("w:tblInd"); ind.set(qn("w:w"), "200"); ind.set(qn("w:type"), "dxa"); t._element.tblPr.append(ind)
    q = N.p(sebelum=150, sesudah=0, size=8)
    huruf(q.add_run("Naskah dibacakan dalam bahasa Inggris; terjemahan Bahasa Indonesia menyertai setiap naskah."), 8, color=TEKS3)
    q.add_run().add_break()
    huruf(q.add_run("© 2026 Badan Nasional Penanggulangan Bencana"), 8, color=BIRU)
    sec = N.d.add_section(WD_SECTION.NEW_PAGE); N.atur_isi(sec)


def daftar_isi(N, hal):
    N.p("Daftar Isi", size=20, sesudah=12, bold=True, color=NAVY)
    ent = [("jadwal", "Jadwal Bicara Kepala BNPB", 1)]
    for a in ACARA:
        ent.append((f"a{a['no']}", f"{a['no']}. {a['file']}", 1))
        ent += [(f"a{a['no']}n{j + 1}", f"{a['no']}.{j + 1}  {n['judul_id']}", 2) for j, n in enumerate(a["naskah"])]
    for ke, teks, tg in ent:
        par = N.p(sesudah=3 if tg == 1 else 2, sebelum=7 if tg == 1 else 0, spasi=1.1)
        f = par.paragraph_format; f.tab_stops.add_tab_stop(Cm(LEBAR), WD_TAB_ALIGNMENT.RIGHT, WD_TAB_LEADER.DOTS)
        if tg == 2: f.left_indent = Cm(0.8)
        kw = dict(size=10.5 if tg == 1 else 9.5, bold=tg == 1, color=NAVY if tg == 1 else TEKS2)
        tautan(par, teks, ke, **kw)
        tautan(par, "\t", ke, size=kw["size"], bold=False, color=TEKS3)          # titik penghubung abu
        tautan(par, str(hal.get(ke, "")), ke, size=kw["size"], bold=tg == 1, color=ORANYE)


def jadwal(N, hal):
    N.h1("JADWAL", "Jadwal Bicara Kepala BNPB", "jadwal")
    N.p("Hanya saat Kepala BNPB berbicara, sesuai susunan acara resmi per 24 November 2026. Kolom Hal. menunjuk halaman naskahnya.",
        size=9.5, sesudah=10, color=TEKS3)
    baris, lalu = [], None
    for a in ACARA:
        for j, n in enumerate(a["naskah"]):
            tgl = a["tanggal_id"].replace(", ", ",\n") if a["tanggal_id"] != lalu else ""
            lalu = a["tanggal_id"]
            baris.append((tgl, (f"{a['no']}. {a['file']}",) if j == 0 else ("",), n["jam"].replace("± ", ""),
                          f"{a['no']}.{j + 1}  {n['judul_id']}", durasi(n, True), str(hal.get(f"a{a['no']}n{j + 1}", ""))))
    N.tabel(("Tanggal", "Acara", "Waktu", "Yang disampaikan", "Durasi", "Hal."), baris, (2.5, 3.7, 1.5, 5.4, 2.0, 1.1),
            tengah=(0, 2, 4, 5), gabung=(0, 1))


def acara(N, a, baru=True, hal=None):
    for j, n in enumerate(a["naskah"]):
        if j == 0:
            N.h1(f"ACARA {a['no']}, {a['tanggal_id'].upper()}", a["file"], f"a{a['no']}", baru=baru)
            N.p(a["nama_id"], size=10, sesudah=12, color=TEKS2)
            if hal is not None:          # dokumen per acara: jadwal bicara acara ini di atas
                N.label("JADWAL BICARA KEPALA BNPB", sebelum=0)
                N.tabel(("Waktu", "Yang disampaikan", "Durasi", "Hal."),
                        [(m["jam"].replace("± ", ""), f"{a['no']}.{k + 1}  {m['judul_id']} ({m['judul_en']})", durasi(m, True),
                          str(hal.get(f"a{a['no']}n{k + 1}", ""))) for k, m in enumerate(a["naskah"])],
                        (2.0, 10.6, 3.0, 1.6), tengah=(0, 2, 3))
                N.p(sesudah=0, size=6, lanjut=True).paragraph_format.line_spacing = Pt(14)
        # per acara dengan beberapa naskah: halaman pertama = judul + jadwal, naskah pertama mulai halaman baru
        N.h2(f"{a['no']}.{j + 1}  {n['judul_id']} ({n['judul_en']})", f"a{a['no']}n{j + 1}",
             baru=j > 0 or (hal is not None and len(a["naskah"]) > 1))
        N.p(f"Pukul {n['jam']} WIB, {durasi(n)}", size=9.5, sesudah=8, lanjut=True, color=TEKS3)
        N.label("NASKAH (ENGLISH)", sebelum=4)
        N.badan(n["en"], "en")
        lb = N.label("TERJEMAHAN BAHASA INDONESIA", sebelum=0)
        lb.paragraph_format.page_break_before = True
        N.badan(n["id"], "id")


def lengkap(hal):
    N = Naskah(JUDUL_DOK)
    sampul(N)
    daftar_isi(N, hal)
    jadwal(N, hal)
    for a in ACARA: acara(N, a)
    return N


def per_acara(a, hal):
    N = Naskah(f"Naskah Kepala BNPB: {a['no']}. {a['file']}")
    N.atur_isi(N.d.sections[0])
    acara(N, a, baru=False, hal=hal)
    return N


def halaman(docx, satu=None):
    import fitz
    tmp = Path(tempfile.mkdtemp())
    subprocess.run([SOFFICE, "-env:UserInstallation=file:///" + str(tmp / "lo").replace("\\", "/"), "--headless",
                    "--convert-to", "pdf", "--outdir", str(tmp), str(docx)], check=True, capture_output=True, timeout=300)
    pdf = fitz.open(next(tmp.glob("*.pdf")))
    teks = [re.sub(r"\s+", " ", pg.get_text()) for pg in pdf]
    cari = [] if satu else [("jadwal", "Jadwal Bicara Kepala BNPB Hanya saat")]
    for a in ([satu] if satu else ACARA):
        cari.append((f"a{a['no']}", f"ACARA {a['no']}, {a['tanggal_id'].upper()}"))
        cari += [(f"a{a['no']}n{j + 1}", f"{a['no']}.{j + 1} {n['judul_id']} ({n['judul_en']}) Pukul") for j, n in enumerate(a["naskah"])]
    hal, mulai, geser = {}, (0 if satu else 2), (1 if satu else 0)   # dokumen lengkap: sampul tanpa nomor
    for ke, s in cari:
        for i in range(mulai, len(teks)):
            if s in teks[i]: hal[ke] = i + geser; mulai = i; break
    return hal, len(pdf)


if __name__ == "__main__":
    KELUAR.mkdir(parents=True, exist_ok=True)
    jalur = KELUAR / LENGKAP
    lengkap({}).simpan(jalur)
    hal, total = halaman(jalur)
    assert len(hal) == 1 + len(ACARA) + sum(len(a["naskah"]) for a in ACARA), sorted(hal)
    lengkap(hal).simpan(jalur)
    print(jalur, f"({total} halaman)")
    for a in ACARA:
        j = KELUAR / "Per acara" / f"{a['no']}. {a['file']}.docx"
        per_acara(a, {}).simpan(j)
        h, _ = halaman(j, satu=a)
        assert len(h) == 1 + len(a["naskah"]), (a["file"], h)
        print(per_acara(a, h).simpan(j))
