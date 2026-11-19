#!/usr/bin/env python3
"""Laporan kejadian bencana (Lapor Bencana BNPB) ke Word dan PDF (data/kajian-bnpb/lapor-ai KEPUTUSAN K8, K17, K18, D21).

Bentuk: halaman 1 = narasi gaya laporan pemantauan Koordalops (judul "Bencana Alam ... di ...", lokasi, waktu, kronologis,
dampak bernomor, kebutuhan, sumber) supaya bisa disalin Pusdalops tanpa diketik ulang; lalu rincian isian per kelompok,
pelapor dan dua waktu (kejadian, dilaporkan), dan foto berlencana.

Pakai:
  python3 scripts/lapor/dokumen.py laporan.json keluar/LA-191126-01      # tulis .docx lalu .pdf (soffice) di sebelahnya
  python3 scripts/lapor/dokumen.py --cek                                   # self-check tanpa soffice
Masukan JSON disusun scripts/lapor/lokal.mjs (bahanDokumen). Kebutuhan: python-docx; PDF: soffice (LibreOffice). Font Roboto.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LOGO = os.path.join(AKAR, "data/kajian-bnpb/skill/surat-bnpb/assets/logo-bnpb.png")
KRIS = os.path.join(AKAR, "public/img/logo-kris.png")
FONT = "Roboto"
NAVY = RGBColor(0x0B, 0x25, 0x45)
ABU = RGBColor(0x5B, 0x67, 0x7A)
JINGGA = RGBColor(0xB4, 0x53, 0x09)
GARIS, MUDA = "D5DCE6", "F1F4F8"


def _rapat(p, sebelum=0, sesudah=0, baris=1.15):
    f = p.paragraph_format
    f.space_before, f.space_after, f.line_spacing = Pt(sebelum), Pt(sesudah), baris
    return f


def _teks(p, isi, uk=10, tebal=False, warna=None, miring=False):
    r = p.add_run(isi)
    r.font.name, r.font.size, r.bold, r.italic = FONT, Pt(uk), tebal, miring
    r._element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    if warna:
        r.font.color.rgb = warna
    return r


def _latar(sel, hex6):
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear"), shd.set(qn("w:color"), "auto"), shd.set(qn("w:fill"), hex6)
    sel._tc.get_or_add_tcPr().append(shd)


def _garis_tabel(t, warna=GARIS):
    """garis tipis abu di bawah tiap baris saja (tanpa kisi tebal)"""
    tbl = t._tbl.tblPr
    b = OxmlElement("w:tblBorders")
    for sisi in ("top", "left", "right", "insideV"):
        e = OxmlElement(f"w:{sisi}"); e.set(qn("w:val"), "nil"); b.append(e)
    for sisi in ("bottom", "insideH"):
        e = OxmlElement(f"w:{sisi}")
        for k, v in (("val", "single"), ("sz", "4"), ("space", "0"), ("color", warna)):
            e.set(qn(f"w:{k}"), v)
        b.append(e)
    tbl.append(b)


def _lebar(t, lebar):
    t.autofit = False
    for baris in t.rows:
        for i, w in enumerate(lebar):
            baris.cells[i].width = w


def _judul_bagian(d, isi, sebelum=12):
    p = d.add_paragraph()
    _rapat(p, sebelum, 4)
    _teks(p, isi, 11.5, True, NAVY)
    # garis navy pendek di bawah judul bagian
    bdr, bawah = OxmlElement("w:pBdr"), OxmlElement("w:bottom")
    for k, v in (("val", "single"), ("sz", "8"), ("space", "2"), ("color", "0B2545")):
        bawah.set(qn("w:" + k), v)
    bdr.append(bawah)
    p._p.get_or_add_pPr().append(bdr)


def _tabel(d, baris, lebar=(Cm(5.2), Cm(11.8))):
    t = d.add_table(rows=0, cols=2)
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for n, (label, nilai) in enumerate(baris):
        sel = t.add_row().cells
        if n % 2:
            _latar(sel[0], MUDA), _latar(sel[1], MUDA)
        _rapat(sel[0].paragraphs[0], 2, 2)
        _rapat(sel[1].paragraphs[0], 2, 2)
        _teks(sel[0].paragraphs[0], label, 9.5, False, ABU)
        kosong = str(nilai) in ("belum didata", "tidak tahu", "belum ditanyakan")
        _teks(sel[1].paragraphs[0], str(nilai), 9.5, not kosong, ABU if kosong else None)
    _garis_tabel(t)
    _lebar(t, lebar)
    return t


def bangun(c, docx_keluar):
    d = Document()
    st = d.styles["Normal"]
    st.font.name, st.font.size = FONT, Pt(10)
    st.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    s = d.sections[0]
    s.page_width, s.page_height = Cm(21), Cm(29.7)
    s.top_margin, s.bottom_margin = Cm(1.4), Cm(1.6)
    s.left_margin = s.right_margin = Cm(2)

    # kop: logo BNPB kiri, judul tengah, KRIS kanan, garis navy tebal
    kop = d.add_table(rows=1, cols=3)
    kop.alignment = WD_TABLE_ALIGNMENT.CENTER
    a, b, k = kop.rows[0].cells
    if os.path.exists(LOGO):
        a.paragraphs[0].add_run().add_picture(LOGO, width=Cm(1.9))
    if os.path.exists(KRIS):
        k.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
        k.paragraphs[0].add_run().add_picture(KRIS, width=Cm(2.6))
    p = b.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    _rapat(p)
    _teks(p, "BADAN NASIONAL PENANGGULANGAN BENCANA", 10, True, NAVY)
    p = b.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    _rapat(p, 2, 0)
    _teks(p, "Laporan Kejadian Bencana", 17, True, NAVY)
    p = b.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    _rapat(p, 2, 0)
    _teks(p, f"Nomor tiket {c['nomor']}", 10, True)
    _lebar(kop, (Cm(2.6), Cm(11.8), Cm(2.6)))
    kop.autofit = False
    tw = OxmlElement("w:tblW"); tw.set(qn("w:w"), str(int(17 / 2.54 * 1440))); tw.set(qn("w:type"), "dxa"); kop._tbl.tblPr.append(tw)
    lay = OxmlElement("w:tblLayout"); lay.set(qn("w:type"), "fixed"); kop._tbl.tblPr.append(lay)
    garis = d.add_paragraph()
    _rapat(garis, 4, 6, 1.0)
    bdr, bawah = OxmlElement("w:pBdr"), OxmlElement("w:bottom")
    for kk, v in (("val", "single"), ("sz", "18"), ("space", "1"), ("color", "0B2545")):
        bawah.set(qn("w:" + kk), v)
    bdr.append(bawah)
    garis._p.get_or_add_pPr().append(bdr)
    if c.get("tingkat_label"):
        p = d.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        _rapat(p, 0, 6)
        _teks(p, c["tingkat_label"], 9, True, JINGGA)

    # 1. narasi gaya Koordalops
    n = c.get("narasi")
    if n:
        p = d.add_paragraph()
        _rapat(p, 4, 6)
        _teks(p, n["judul"], 12.5, True, NAVY)
        for i, (label, isi) in enumerate(n["butir"], 1):
            p = d.add_paragraph()
            f = _rapat(p, 3, 1)
            f.left_indent, f.first_line_indent = Cm(0.7), Cm(-0.7)
            _teks(p, f"{i}.\t", 10, True)
            _teks(p, f"{label}: ", 10, True)
            if isinstance(isi, list):
                for j, x in enumerate(isi):
                    q = d.add_paragraph()
                    g = _rapat(q, 1, 0)
                    g.left_indent, g.first_line_indent = Cm(1.3), Cm(-0.5)
                    _teks(q, f"{'abcdefghij'[j]}.  ", 10)
                    _teks(q, x, 10)
            else:
                _teks(p, isi, 10)
                p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    # 2. pelapor dan waktu
    pel = c["pelapor"]
    _judul_bagian(d, "Pelapor dan waktu")
    _tabel(d, [("Nama pelapor", pel["nama"]), ("Melapor sebagai", pel["peran"]),
               *([("Instansi", pel["instansi"])] if pel.get("instansi") else []),
               ("Nomor WhatsApp", pel["wa_samar"]), ("Waktu kejadian", c["waktu_kejadian"]), ("Waktu dilaporkan", c["waktu_lapor"])])

    # 3. rincian per kelompok
    for g in c["kelompok"]:
        if g["judul"] == "Foto":
            continue
        _judul_bagian(d, g["judul"])
        _tabel(d, g["baris"])

    # 4. foto berlencana, dua per baris
    foto = [f for f in c.get("foto", []) if os.path.exists(f["berkas"])]
    _judul_bagian(d, "Foto kejadian")
    if foto:
        t = d.add_table(rows=0, cols=2)
        for i in range(0, len(foto), 2):
            sel = t.add_row().cells
            for j, f in enumerate(foto[i:i + 2]):
                q = sel[j].paragraphs[0]
                q.alignment = WD_ALIGN_PARAGRAPH.CENTER
                q.add_run().add_picture(f["berkas"], width=Cm(7.8))
                r = sel[j].add_paragraph()
                r.alignment = WD_ALIGN_PARAGRAPH.CENTER
                _teks(r, f"Foto {i + j + 1}. {f['ket']}", 8.5, False, ABU)
        _lebar(t, (Cm(8.5), Cm(8.5)))
    else:
        p = d.add_paragraph()
        _teks(p, "Pelapor tidak mengirim foto.", 9.5, False, ABU)

    p = d.add_paragraph()
    _rapat(p, 14, 0)
    _teks(p, "Laporan ini disusun otomatis dari percakapan Lapor Bencana BNPB. Angka berasal dari pelapor dan belum diverifikasi kecuali dinyatakan lain.", 8, False, ABU, True)
    kaki = s.footer.paragraphs[0]
    kaki.alignment = WD_ALIGN_PARAGRAPH.CENTER
    _teks(kaki, f"Badan Nasional Penanggulangan Bencana  |  Copyright 2026  |  {c['nomor']}", 8, False, ABU)
    d.save(docx_keluar)
    return docx_keluar


def ke_pdf(docx):
    soffice = shutil.which("soffice") or "/Applications/LibreOffice.app/Contents/MacOS/soffice"
    if not os.path.exists(soffice):
        return None
    folder = os.path.dirname(docx)
    with tempfile.TemporaryDirectory() as profil:  # profil terpisah: tidak bentrok dengan LibreOffice yang sedang terbuka
        # profil baru tidak membaca font pengguna: Roboto disalin ke folder font profil supaya PDF tidak jatuh ke serif
        fonts = os.path.join(profil, "user", "fonts")
        os.makedirs(fonts, exist_ok=True)
        for folder_font in (os.path.expanduser("~/Library/Fonts"), "/Library/Fonts"):
            if os.path.isdir(folder_font):
                for f in os.listdir(folder_font):
                    if f.lower().startswith("roboto") and f.lower().endswith((".ttf", ".otf")):
                        shutil.copy(os.path.join(folder_font, f), fonts)
        subprocess.run([soffice, f"-env:UserInstallation=file://{profil}", "--headless", "--convert-to", "pdf", "--outdir", folder, docx],
                       check=True, capture_output=True, timeout=120)
    pdf = docx[:-5] + ".pdf"
    return pdf if os.path.exists(pdf) else None


def _cek():
    c = {"nomor": "LA-010126-01", "tingkat_label": "Laporan warga, belum terverifikasi",
         "narasi": {"judul": "Bencana Alam Banjir di Kota Bogor, Prov. Jawa Barat", "butir": [["Lokasi", "Desa X"], ["Dampak", ["Korban jiwa: nihil.", "Pengungsi: 12 jiwa."]]]},
         "pelapor": {"nama": "Uji", "peran": "Warga", "wa_samar": "0812****1234"},
         "waktu_kejadian": "1 Januari 2026, 14.30 WIB", "waktu_lapor": "1 Januari 2026, 15.00 WIB",
         "kelompok": [{"judul": "Kejadian", "baris": [["Jenis bencana", "Banjir"]]}], "foto": [], "asal": [["Jenis bencana", "pilihan"]]}
    with tempfile.TemporaryDirectory() as tmp:
        f = bangun(c, os.path.join(tmp, "cek.docx"))
        doc = Document(f)
        isi = "\n".join([p.text for p in doc.paragraphs] + [sel.text for t in doc.tables for r in t.rows for sel in r.cells])
    for wajib in ("LA-010126-01", "Bencana Alam Banjir", "Waktu kejadian", "Waktu dilaporkan", "Pengungsi: 12 jiwa", "0812****1234", "Pelapor tidak mengirim foto"):
        assert wajib in isi, f"{wajib} hilang"
    print("cek dokumen lapor: lulus")


if __name__ == "__main__":
    if sys.argv[1:] == ["--cek"]:
        _cek()
        sys.exit(0)
    sumber, dasar = sys.argv[1], sys.argv[2]
    c = json.load(open(sumber, encoding="utf-8"))
    docx = bangun(c, dasar + ".docx")
    print(json.dumps({"docx": docx, "pdf": ke_pdf(docx)}))
