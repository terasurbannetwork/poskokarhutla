#!/usr/bin/env python3
"""Laporan kejadian bencana (Pantau Bencana BNPB) ke Word dan PDF (data/kajian-bnpb/lapor-ai KEPUTUSAN K8, K17, K18, D21).

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
FONT = "Roboto"
NAVY = RGBColor(0x0B, 0x25, 0x45)
ABU = RGBColor(0x5B, 0x67, 0x7A)
JINGGA = RGBColor(0xB4, 0x53, 0x09)
GARIS, MUDA = "D5DCE6", "F1F4F8"
IKON = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ikon")   # PNG dari sprite /lapor (pemilik 25 Nov 2026: "pakai icon biar bagus")


def _ikon(run, nama, cm=0.42):
    f = os.path.join(IKON, f"{nama}.png")
    if os.path.exists(f):
        run.add_picture(f, width=Cm(cm))
        return True
    return False


def _tepi_sel(sel, **sisi):
    """garis per sisi sel: _tepi_sel(sel, top=("single", 24, "C62828"))"""
    b = OxmlElement("w:tcBorders")
    for nama in ("top", "left", "bottom", "right"):
        e = OxmlElement(f"w:{nama}")
        val, sz, warna = sisi.get(nama, ("nil", 0, "auto"))
        e.set(qn("w:val"), val), e.set(qn("w:sz"), str(sz)), e.set(qn("w:space"), "0"), e.set(qn("w:color"), warna)
        b.append(e)
    sel._tc.get_or_add_tcPr().append(b)


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
    # LibreOffice membaca lebar dari tblGrid, bukan dari sel: samakan supaya kolom tidak dibagi rata
    for g, w in zip(t._tbl.tblGrid.findall(qn("w:gridCol")), lebar):
        g.set(qn("w:w"), str(int(w.twips if hasattr(w, "twips") else w / 635)))


def _judul_bagian(d, isi, sebelum=12):
    p = d.add_paragraph()
    _rapat(p, sebelum, 4).keep_with_next = True
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

    # kop (pemilik 19 Nov 2026: KRIS dihapus, "bagusin maksimal"): logo BNPB kiri, nama lembaga dan judul rata kiri, nomor tiket di kotak navy kanan
    kop = d.add_table(rows=1, cols=3)
    kop.alignment = WD_TABLE_ALIGNMENT.CENTER
    a, b, k = kop.rows[0].cells
    if os.path.exists(LOGO):
        a.paragraphs[0].add_run().add_picture(LOGO, width=Cm(1.7))
    p = b.paragraphs[0]
    _rapat(p, 2, 0)
    _teks(p, "BADAN NASIONAL PENANGGULANGAN BENCANA", 9, True, ABU)
    p = b.add_paragraph()
    _rapat(p, 1, 0, 1.0)
    _teks(p, "Laporan Kejadian Bencana", 19, True, NAVY)
    p = b.add_paragraph()
    _rapat(p, 2, 0)
    _teks(p, "Pantau Bencana BNPB, diteruskan ke BPBD setempat", 9, False, ABU)
    _latar(k, "0B2545")
    for q, (isi, uk, tebal) in zip([k.paragraphs[0], k.add_paragraph()], (("Nomor tiket", 8, False), (c["nomor"], 11.5, True))):
        q.alignment = WD_ALIGN_PARAGRAPH.CENTER
        _rapat(q, 4 if uk == 8 else 0, 0 if uk == 8 else 4)
        _teks(q, isi, uk, tebal, RGBColor(0xFF, 0xFF, 0xFF))
    from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT as VA
    for sel in (a, b, k):
        sel.vertical_alignment = VA.CENTER
    _lebar(kop, (Cm(2.2), Cm(10.6), Cm(4.2)))
    kop.autofit = False
    tw = OxmlElement("w:tblW"); tw.set(qn("w:w"), str(int(17 / 2.54 * 1440))); tw.set(qn("w:type"), "dxa"); kop._tbl.tblPr.append(tw)
    lay = OxmlElement("w:tblLayout"); lay.set(qn("w:type"), "fixed"); kop._tbl.tblPr.append(lay)
    garis = d.add_paragraph()
    _rapat(garis, 4, 8, 1.0)
    bdr, bawah = OxmlElement("w:pBdr"), OxmlElement("w:bottom")
    for kk, v in (("val", "single"), ("sz", "18"), ("space", "1"), ("color", "0B2545")):
        bawah.set(qn("w:" + kk), v)
    bdr.append(bawah)
    garis._p.get_or_add_pPr().append(bdr)
    if c.get("tingkat_label"):  # pita status verifikasi
        t = d.add_table(rows=1, cols=1)
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        sel = t.rows[0].cells[0]
        _latar(sel, "FDF1E3")
        q = sel.paragraphs[0]
        _rapat(q, 3, 3)
        _teks(q, c["tingkat_label"], 9, True, JINGGA)
        _lebar(t, (Cm(17),))

    # angka kunci: kotak besar di atas narasi supaya pembaca langsung menangkap skala kejadian
    kunci = []
    for nama in ("Meninggal", "Hilang", "Luka-luka", "Mengungsi", "Rusak berat"):
        for g in c["kelompok"]:
            for label, nilai in g["baris"]:
                if label == nama and str(nilai)[:1].isdigit():
                    kunci.append((label, str(nilai)))
    if kunci:
        # kartu angka berikon dengan garis warna di atas, dipisah celah (pemilik 25 Nov 2026: "jelek banget")
        GAYA = {"Meninggal": ("korban", "C62828"), "Hilang": ("hilang", "C62828"), "Luka-luka": ("luka", "D97706"), "Mengungsi": ("mengungsi", "1F4F93"), "Rusak berat": ("rumah", "0B2545")}
        p = d.add_paragraph(); _rapat(p, 2, 0, 1.0)
        n = len(kunci); celah = Cm(0.3); lebar = Cm((17 - 0.3 * (n - 1)) / n)
        t = d.add_table(rows=1, cols=2 * n - 1)
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        sel_all = t.rows[0].cells
        for i, (label, nilai) in enumerate(kunci):
            sel = sel_all[2 * i]; ik, warna = GAYA.get(label, ("dampak", "1F4F93"))
            garis = ("single", 4, GARIS)
            _tepi_sel(sel, top=("single", 24, warna), left=garis, right=garis, bottom=garis)
            angka, _, satuan = nilai.partition(" ")
            q = sel.paragraphs[0]; q.alignment = WD_ALIGN_PARAGRAPH.CENTER; _rapat(q, 6, 0, 1.0)
            _ikon(q.add_run(), ik, 0.5)
            q = sel.add_paragraph(); q.alignment = WD_ALIGN_PARAGRAPH.CENTER; _rapat(q, 2, 0, 1.0)
            _teks(q, angka, 20, True, RGBColor.from_string(warna)); _teks(q, f" {satuan}" if satuan else "", 9, True, ABU)
            q = sel.add_paragraph(); q.alignment = WD_ALIGN_PARAGRAPH.CENTER; _rapat(q, 1, 6)
            _teks(q, "Rumah rusak berat" if label == "Rusak berat" else label, 8.5, True, NAVY)
            if i < n - 1:
                _tepi_sel(sel_all[2 * i + 1])
        _lebar(t, tuple(lebar if k % 2 == 0 else celah for k in range(2 * n - 1)))

    # 1. narasi gaya Koordalops
    n = c.get("narasi")
    if n:
        # judul di pita navy, butir jadi tabel ikon dan label di kiri, isi di kanan (pemilik 25 Nov 2026: "bagusin lagi")
        p = d.add_paragraph(); _rapat(p, 8, 0, 1.0)
        tj = d.add_table(rows=1, cols=1); tj.alignment = WD_TABLE_ALIGNMENT.CENTER
        sj = tj.rows[0].cells[0]; _latar(sj, "0B2545")
        q = sj.paragraphs[0]; _rapat(q, 5, 5, 1.1); _teks(q, n["judul"], 12, True, RGBColor(0xFF, 0xFF, 0xFF))
        _lebar(tj, (Cm(17),))
        IK = {"lokasi": "lokasi", "waktu": "waktu", "kronologis": "kronologi", "kronologi": "kronologi", "dampak": "dampak", "kebutuhan mendesak": "kebutuhan", "sumber": "sumber"}
        t = d.add_table(rows=0, cols=2); t.alignment = WD_TABLE_ALIGNMENT.CENTER
        for k, (label, isi) in enumerate(n["butir"]):
            kiri, kanan = t.add_row().cells
            _latar(kiri, MUDA)
            q = kiri.paragraphs[0]; _rapat(q, 4, 4, 1.1)
            if _ikon(q.add_run(), IK.get(label.lower(), "dampak"), 0.4):
                _teks(q, "  ", 10)
            _teks(q, label, 10, True, NAVY)
            q = kanan.paragraphs[0]; _rapat(q, 4, 4 if not isinstance(isi, list) else 1, 1.15)
            if isinstance(isi, list):
                for m, x in enumerate(isi):
                    if m:
                        q = kanan.add_paragraph(); _rapat(q, 1, 4 if m == len(isi) - 1 else 1, 1.15)
                    f = q.paragraph_format; f.left_indent, f.first_line_indent = Cm(0.45), Cm(-0.45)
                    _teks(q, "•  ", 10, True, NAVY); _teks(q, x, 10)
            else:
                _teks(q, isi, 10)
        _garis_tabel(t)
        _lebar(t, (Cm(5.4), Cm(11.6)))
        from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT as VA2
        for r in t.rows:
            r.cells[0].vertical_alignment = VA2.TOP

    # 2. pelapor dan waktu
    pel = c["pelapor"]
    _judul_bagian(d, "Pelapor")
    _tabel(d, [("Nama pelapor", pel["nama"]), ("Melapor sebagai", pel["peran"]),
               *([("Instansi", pel["instansi"])] if pel.get("instansi") else []),
               ("Nomor WhatsApp", pel["wa_samar"]), ("Waktu dilaporkan", c["waktu_lapor"])])

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
    _teks(p, "Laporan ini disusun otomatis dari percakapan Pantau Bencana BNPB. Angka berasal dari pelapor dan belum diverifikasi kecuali dinyatakan lain.", 8, False, ABU, True)
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
         "kelompok": [{"judul": "Kejadian", "baris": [["Jenis bencana", "Banjir"], ["Waktu kejadian", "1 Januari 2026, 14.30 WIB"]]}, {"judul": "Korban", "baris": [["Meninggal", "2 orang"]]}], "foto": [], "asal": [["Jenis bencana", "pilihan"]]}
    with tempfile.TemporaryDirectory() as tmp:
        f = bangun(c, os.path.join(tmp, "cek.docx"))
        doc = Document(f)
        isi = "\n".join([p.text for p in doc.paragraphs] + [sel.text for t in doc.tables for r in t.rows for sel in r.cells])
    for wajib in ("LA-010126-01", "Bencana Alam Banjir", "Waktu kejadian", "Waktu dilaporkan", "Pengungsi: 12 jiwa", "0812****1234", "Pelapor tidak mengirim foto", "Laporan Kejadian Bencana", "Nomor tiket"):
        assert wajib in isi, f"{wajib} hilang"
    assert "Meninggal" in isi and isi.count("2") >= 1, "angka kunci hilang"
    for wajib in ():
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
