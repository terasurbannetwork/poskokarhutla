#!/usr/bin/env python3
"""Bangun surat dinas BNPB (.docx) dari satu berkas JSON.

Pakai:
  python3 buat_surat.py contoh/audiensi-ugm.json            # tulis .docx ke folder JSON
  python3 buat_surat.py contoh/audiensi-ugm.json -o ~/Downloads
  python3 buat_surat.py --cek                               # self-check mesin

Format meniru surat BNPB yang sudah ditandatangani (Pusdatinkom, 2 Nov 2026):
kop BNPB, A4, Times New Roman 12, blok Nomor/Sifat/Lampiran/Perihal, tujuan
berupa jabatan, isi rata kiri-kanan, blok tanda tangan di kanan.
Kebutuhan: python-docx. Render PDF untuk diperiksa: soffice (LibreOffice).
"""
import json
import os
import sys

from docx import Document
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Mm, Pt

AKAR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO = os.path.join(AKAR, "assets", "logo-bnpb.png")
KOP = [
    ("BADAN NASIONAL PENANGGULANGAN BENCANA", 14, True),
    ("Gedung GRAHA BNPB Jalan Pramuka Kav. 38, Jakarta Timur, 13120", 12, False),
    ("Telepon : 021-2982 7793, Faksimile : 021-2128 1200", 12, False),
]
WAJIB = ["nomor", "perihal", "tujuan", "isi", "penanda_tangan"]


def _rapat(p, sebelum=0, sesudah=0):
    f = p.paragraph_format
    f.space_before, f.space_after, f.line_spacing = Pt(sebelum), Pt(sesudah), 1.0
    return f


def _kop(d):
    t = d.add_table(rows=1, cols=2)
    t.autofit = False
    for i, w in enumerate((Cm(3.0), Cm(13.0))):
        t.columns[i].width = w
        t.rows[0].cells[i].width = w
    lay = OxmlElement("w:tblLayout")
    lay.set(qn("w:type"), "fixed")
    t._tbl.tblPr.append(lay)
    logo, teks = t.rows[0].cells
    logo.paragraphs[0].add_run().add_picture(LOGO, width=Cm(2.1))
    teks.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    teks._tc.remove(teks.paragraphs[0]._p)
    for isi, uk, tebal in KOP + [(None, 12, False)]:
        p = teks.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        _rapat(p)
        bagian = [(isi, False)] if isi else [("Situs : ", False), ("http://www.bnpb.go.id", True)]
        for tx, miring in bagian:
            r = p.add_run(tx)
            r.font.size, r.bold, r.italic = Pt(uk), tebal, miring
    # garis tebal di bawah kop
    garis = d.add_paragraph()
    _rapat(garis, sesudah=6).line_spacing = Pt(2)
    bdr, bawah = OxmlElement("w:pBdr"), OxmlElement("w:bottom")
    for k, v in (("val", "single"), ("sz", "18"), ("space", "1"), ("color", "000000")):
        bawah.set(qn("w:" + k), v)
    bdr.append(bawah)
    garis._p.get_or_add_pPr().append(bdr)
    garis.add_run().font.size = Pt(2)


def _baris_kepala(d, label, nilai, tanggal=None):
    p = d.add_paragraph()
    f = _rapat(p)
    f.tab_stops.add_tab_stop(Cm(2.54))
    if tanggal is not None:
        f.tab_stops.add_tab_stop(Cm(11.0))
    # baris lanjutan (perihal panjang) sejajar setelah titik dua
    f.left_indent, f.first_line_indent = Cm(2.82), Cm(-2.82)
    p.add_run(f"{label}\t: {nilai}" + (f"\t{tanggal}" if tanggal is not None else ""))


def bangun(c, keluar):
    hilang = [k for k in WAJIB if not c.get(k)]
    if hilang:
        raise SystemExit(f"kolom wajib kosong: {', '.join(hilang)}")
    d = Document()
    st = d.styles["Normal"]
    st.font.name, st.font.size = "Times New Roman", Pt(12)
    st.element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    s = d.sections[0]
    s.page_width, s.page_height = Mm(210), Mm(297)
    s.top_margin, s.bottom_margin = Cm(1.2), Cm(2.0)
    s.left_margin = s.right_margin = Cm(2.5)

    _kop(d)
    _baris_kepala(d, "Nomor", c["nomor"], c.get("tanggal", "        " + "[bulan tahun]"))
    _baris_kepala(d, "Sifat", c.get("sifat", "Biasa"))
    _baris_kepala(d, "Lampiran", c.get("lampiran", "-"))
    _baris_kepala(d, "Perihal", c["perihal"])
    _rapat(d.add_paragraph())
    for baris in c["tujuan"]:
        _rapat(d.add_paragraph(baris))
    _rapat(d.add_paragraph())
    for teks in c["isi"]:
        p = d.add_paragraph(teks)
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        _rapat(p, sebelum=6).first_line_indent = Cm(0.75)
    _rapat(d.add_paragraph())
    tt = c["penanda_tangan"]
    for i, baris in enumerate(tt["jabatan"] + [""] * 4 + [tt["nama"]]):
        p = d.add_paragraph(baris)
        _rapat(p).left_indent = Cm(7.25)
    for i, baris in enumerate(c.get("tembusan", [])):
        if i == 0:
            _rapat(d.add_paragraph())
            _rapat(d.add_paragraph("Tembusan:"))
        _rapat(d.add_paragraph(f"{i + 1}. {baris}"))
    d.save(keluar)
    return keluar


def _cek():
    import tempfile

    sumber = os.path.join(AKAR, "contoh", "audiensi-ugm.json")
    c = json.load(open(sumber))
    with tempfile.TemporaryDirectory() as tmp:
        f = bangun(c, os.path.join(tmp, "cek.docx"))
        teks = [p.text for p in Document(f).paragraphs]
    i = {t: n for n, t in enumerate(teks)}
    assert any(t.startswith("Nomor\t: B-") for t in teks), "baris Nomor hilang"
    assert c["tujuan"][0] in i and c["isi"][0] in i, "tujuan/isi hilang"
    assert i[c["tujuan"][0]] < i[c["isi"][0]] < i[c["penanda_tangan"]["nama"]], "urutan blok salah"
    assert "Rektor" not in c["tujuan"][0], "tujuan ke unit kerja sama, bukan Rektor"
    assert not any("beserta tim" in t for t in teks), "'beserta tim' dilarang"
    try:
        bangun({"nomor": "x"}, os.devnull)
        raise AssertionError("kolom wajib kosong lolos")
    except SystemExit:
        pass
    print("cek surat: lulus")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["--cek"]:
        _cek()
        sys.exit()
    if not a:
        sys.exit(__doc__)
    c = json.load(open(a[0]))
    dir_out = os.path.expanduser(a[a.index("-o") + 1]) if "-o" in a else os.path.dirname(os.path.abspath(a[0]))
    print(bangun(c, os.path.join(dir_out, c.get("berkas", "surat.docx"))))
