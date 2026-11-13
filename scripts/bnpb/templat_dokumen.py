#!/usr/bin/env python3
"""Turunkan template mentah dari dokumen resmi di repo ke data/templat-dokumen/ (kategori Template di /bnpb/katalog-dokumen).

Master, tata letak, ikon, dan label struktur dipertahankan; teks isi, angka, tanggal, nama, foto, dan peta diganti placeholder.
Repo publik: tidak boleh ada angka atau nama nyata yang tertinggal, jadi tiap keluaran disapu `sisa()` dan yang mencurigakan dilaporkan.

Butuh python-pptx, python-docx, openpyxl; PDF lewat PowerPoint/LibreOffice (data/laporan-bnpb/generator/pdf.py) dan Word.
Pakai: py scripts/bnpb/templat_dokumen.py [--tanpa-pdf] [--hanya kata]
"""
import hashlib, json, os, re, subprocess, sys, tempfile
from copy import deepcopy
from pathlib import Path

import docx
import openpyxl
from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_SHAPE_TYPE, PP_PLACEHOLDER
from pptx.enum.text import MSO_ANCHOR, PP_ALIGN
from pptx.util import Pt

AKAR = Path(__file__).resolve().parents[2]
KELUAR = AKAR / "data/templat-dokumen"
LOGO_KRIS = AKAR / "data/laporan-bnpb/generator/sampul/media/kris-logo.png"   # pemilik 9 Nov 2026: semua dokumen wajib memuat logo KRIS
RASIO_KRIS = 1690 / 393
sys.path.insert(0, str(AKAR / "data/laporan-bnpb/generator"))

BULAN = r"(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|Jan|Feb|Mar|Apr|Jun|Jul|Agu|Sep|Okt|Nov|Des)"
PROV = ("Aceh|Sumatera|Sumut|Sumsel|Sumbar|Riau|Jambi|Bengkulu|Lampung|Bangka|Belitung|Jakarta|Jawa|Jateng|Jatim|Jabar|Banten|Yogyakarta|Yogya|DIY|Bali|Nusa Tenggara|NTB|NTT|"
        "Kalimantan|Kalbar|Kalteng|Kalsel|Kaltim|Kaltara|Sulawesi|Sulut|Sulteng|Sulsel|Sultra|Gorontalo|Maluku|Papua|Merauke|Bandung|Semarang|Surabaya|Palangka|Banjarbaru|Bogor|Malang|Sleman|Bantul")
LEMBAGA = ("ITB|UGM|UMY|UII|UNY|UPNVY|UPN|UNS|UNDIP|IPB|ITS|UNAIR|Telkom|Universitas|BRIN|Kemdiktisaintek|Australia|NSW|RFS|Malaysia|NADMA|Presiden|Kristomei|Suharyanto|Letnan|Jenderal|Prof|Dr[.]|Dipl|"
           "Sawit|PT |Unand|Unhas|USK|Resources|Holdings|Corporation|Investment|Group|Rektor|Bupati|Gubernur|Wali Kota|Danrem|Kapolda|Kalaksa|Alfatehan|Titan|Muhammadiyah|Gadjah|Siti Nurbaya|Merapi|Semeru|Lewotobi|Marapi|Dukono|Ibu|Karangetang|Ruang|Pantau Bencana")
TEMPAT = r"Kab\.|Kec\.|Kel\.|Kabupaten|Kecamatan|Kota |Desa |Gn\.|Gunung |Sektor |Sungai |Besuk |Pulau |Selat |Teluk |Kawah |Tim |Satgas |Korem|Polda|Lanud"
RE_ASING = re.compile(rf"\b({PROV}|{LEMBAGA}|{TEMPAT})", re.I)
RE_ANGKA_SAJA = re.compile(r"^[\s\d.,:%+\-–/×x()~<>]+([A-Za-z%²³/. ]{0,10})$")
RE_TANGGAL = re.compile(rf"\b\d{{1,2}}(\s*[-–]\s*\d{{1,2}})?\s+{BULAN}\b\.?(\s+\d{{2,4}})?", re.I)
RE_DDMMYY = re.compile(r"(?<!\d)\d{6}(?!\d)")
JUDUL_SLIDE = "[Judul slide: kalimat kesimpulan dengan angka kunci]"
URAIAN = "[Uraian singkat: temuan, penyebab, atau tindak lanjut]"
LABEL_GAMBAR = "[Peta, foto, atau grafik]"
TETAP = {"terima kasih", "thank you", "dipresentasikan oleh", "daftar isi", "sumber", "lampiran", "agenda", "contents", "presented by"}

# Label struktur yang aman tetap ada; selain ini dan selain teks yang berulang di deck, teks pendek diganti [Label]
RE_LABEL = re.compile(r"^(ringkasan|ringkasan eksekutif|executive summary|kejadian bencana|informasi bencana|bencana|provinsi|kab/kota|kabupaten/kota|dampak|keterangan|ancaman|imbauan|zona bahaya.*|kawasan dihindari|"
                      r"banjir|banjir bandang|kekeringan|gempa bumi|gunung api|angin kencang|cuaca ekstrem|tanah longsor|longsor|abrasi|karhutla|hotspot\*?|firespot\*?|luas terbakar\*?|belum padam\*?|padam|awas|siaga|waspada|normal|"
                      r"peta|tabel|gambar|grafik|rekomendasi|tindak lanjut|latar belakang.*|pendahuluan|kesimpulan|program|program kerja sama|tujuan|sasaran|anggaran|kajian|status|lembaga|target|waktu|peran|penanggung jawab|kegiatan|"
                      r"keputusan yang diminta|hasil yang diharapkan|hal yang dibahas bersama|tahap|fase|prioritas|risiko|mitigasi|data|metode|temuan|strategi|kebutuhan|kapasitas|isu|isu utama|mitra|pakar|jumlah|total|no|nomor|uraian|tanggal|"
                      r"perkenalan|daftar isi|latar belakang dan kebutuhan|program kerja sama|tindak lanjut|prioritas dan keputusan|peran dan keluaran|inti pesan|perlu perhatian|cut off data|data satelit|rumpun bencana|"
                      r"aliran lava|lontaran batu pijar|lontaran material|hujan abu|erupsi sekunder|awan panas|guguran lava|lahar|tsunami|ancaman|kekeringan|gempa bumi|"
                      r"pemantauan|respons|pemulihan|logistik|pendanaan|koordinasi|kerja sama|tindakan|arahan|personel|armada|perkembangan|situasi|kondisi|wilayah|lokasi|korban|pengungsi|rumah rusak|terdampak|meninggal|hilang|luka)[:.]?$")
AMBANG_GAMBAR = {"Laporan Penanganan Pengendalian Karhutla": .001, "Brief Narasi Publik": .001}   # lambang provinsi kecil ikut ditutup

PPT = [
    ("Laporan Kejadian Bencana Harian", "data/laporan-bnpb/harian/2026-11/2026-11-06/Laporan Kejadian Bencana Harian 061126 (rev4).pptx", None),
    ("Laporan Penanganan Pengendalian Karhutla", "data/laporan-bnpb/penanganan-karhutla/2026-11/2026-11-08/Revisi 4/Laporan Penanganan Pengendalian Karhutla 081126.pptx", [1, 2, 3]),   # slide perusahaan hanya untuk deck 081126
    ("Paparan Kerja Sama dengan Perguruan Tinggi", "data/kegiatan-bnpb/kunjungan-kampus/UGM/Paparan Kerja Sama BNPB dengan UGM 061126 (rev3).pptx", list(range(1, 32))),
    ("Paparan Grand Design", "data/kajian-bnpb/keluaran/final/Grand Design Ketahanan Air Pulau Jawa 2026-2030.pptx", None),
    ("Ajuan Program Flagship", "data/kegiatan-bnpb/ajuan-program-kampus-021126/Ringkasan Ajuan Program Flagship Campus-first 031126.pptx", None),
    ("Paparan Karhutla per Wilayah", "Paparan Karhutla Papua Selatan - Merauke - Jagebob-Tanah Miring 311026.pptx", None),
    ("Brief Narasi Publik", "data/laporan-bnpb/paparan/narasi-publik-karhutla-041126/Brief Narasi Publik Karhutla 041126.pptx", None),
    ("Laporan Kegiatan Operasi Modifikasi Cuaca", "data/laporan-bnpb/omc/OMC_Karhutla_16-27Okt2026.pptx", None),
    ("Paparan Pertemuan Bilateral", "docs/deck-bnpb/Pertemuan BNPB Malaysia 271026/Pertemuan BNPB Malaysia 271026.pptx", None),
]


def isi_paragraf(p, teks):
    r = p.runs
    if not r: return
    r[0].text = teks
    for x in r[1:]: x._r.getparent().remove(x._r)


def uraian(n):
    """Placeholder sepanjang teks asalnya supaya kotak sempit tidak meluap."""
    return "[Isi]" if n < 16 else "[Keterangan]" if n < 34 else "[Uraian singkat]" if n < 75 else URAIAN


def teks_baru(t, judul=False):
    """None = biarkan apa adanya."""
    b = t.strip()
    if not b: return None
    if judul: return JUDUL_SLIDE
    if b.lower().rstrip(":") in TETAP: return None
    kata = len(b.split())
    if RE_TANGGAL.search(b) or RE_DDMMYY.search(b):
        if kata <= 6:
            hasil = RE_DDMMYY.sub("[DDMMYY]", RE_TANGGAL.sub("[Tanggal]", b))
            if re.search(r"\d", RE_DDMMYY.sub("", RE_TANGGAL.sub("", b))): return "[Tanggal dan keterangan]"
            hasil = re.sub(r"\b(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)\b", "[Hari]", hasil)
            return "[Kota], [Tanggal]" if re.match(r"^(?!\[)[^,\[]+,\s*\[Tanggal\]", hasil) else hasil if not RE_ASING.search(hasil) else "[Tanggal dan keterangan]"
        return uraian(len(b))
    if RE_ANGKA_SAJA.match(b): return re.sub(r"\d", "0", b)
    if re.search(r"\d", b): return uraian(len(b))
    if kata > 5 or len(b) > 42: return uraian(len(b))
    if RE_ASING.search(b): return "[Nama]"
    return None if RE_LABEL.match(b.lower()) else "[Label]"   # daftar izin: teks pendek lain bisa berupa nama perusahaan atau kasus


def ukuran_huruf(sh):
    return max((r.font.size or 0 for p in sh.text_frame.paragraphs for r in p.runs), default=0)


def isi_kotak(tf, judul=False, teks_judul=JUDUL_SLIDE):
    if judul:   # satu judul walau aslinya beberapa paragraf
        ps = [p for p in tf.paragraphs if p.text.strip()]
        isi_paragraf(ps[0], teks_judul)
        for p in ps[1:]: p._p.getparent().remove(p._p)
        return
    for p in tf.paragraphs:
        baru = teks_baru(p.text)
        if baru is not None: isi_paragraf(p, baru)


def sidik(pic):
    return hashlib.sha1(pic.image.blob).hexdigest()


def ganti_gambar(sl, pic, label=LABEL_GAMBAR):
    x, y, w, h = pic.left, pic.top, pic.width, pic.height
    k = sl.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, y, w, h)
    k.fill.solid(); k.fill.fore_color.rgb = RGBColor(0xEE, 0xF1, 0xF6); k.line.color.rgb = RGBColor(0xC9, 0xD2, 0xDF); k.line.width = Pt(0.75); k.shadow.inherit = False
    tf = k.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE; tf.word_wrap = True
    p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER; r = p.add_run(); r.text = label; r.font.size = Pt(9 if label == LABEL_GAMBAR else 7); r.font.name = "Roboto"; r.font.color.rgb = RGBColor(0x5B, 0x67, 0x82)
    el, rid = pic._element, pic._element.blipFill.blip.rEmbed
    el.addprevious(k._element); el.getparent().remove(el)
    if not any(rid == b.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed") for b in sl._element.iter("{http://schemas.openxmlformats.org/drawingml/2006/main}blip")):
        sl.part.drop_rel(rid)


def logo_kris(sh, tinggi):
    return sh.top < tinggi * .2 and sh.width / sh.height > 3 and sh.height < tinggi * .1


def pasang_kris(sl, w_slide, h_slide):
    """Logo KRIS di kiri logo BNPB, seperti deck harian; tanpa logo BNPB di kanan atas, menempel sudut kanan atas."""
    pic = [sh for sh in sl.shapes if sh.shape_type == MSO_SHAPE_TYPE.PICTURE and sh.top < h_slide * .2]
    for sh in pic:
        if logo_kris(sh, h_slide): sh.name = "Logo KRIS"; return
    skala, kanan = w_slide / 12192000, [sh for sh in pic if sh.left + sh.width > w_slide * .85 and sh.width < w_slide * .15]
    h = int(320040 * skala); w = int(h * RASIO_KRIS)
    if kanan:
        b = max(kanan, key=lambda x: x.left)
        x, y = b.left - int(137160 * skala) - w, b.top + (b.height - h) // 2
    else:
        x, y = w_slide - w - int(320040 * skala), int(228600 * skala)
    sl.shapes.add_picture(str(LOGO_KRIS), x, y, w, h).name = "Logo KRIS"


def buang_slide(d, simpan):
    daftar = d.slides._sldIdLst
    for i, s in reversed(list(enumerate(list(daftar), 1))):
        if i not in simpan:
            d.part.drop_rel(s.rId); daftar.remove(s)


def kerjakan_pptx(nama, sumber, simpan):
    d = Presentation(AKAR / sumber)
    if simpan: buang_slide(d, set(simpan))
    luas, tinggi = d.slide_width * d.slide_height, d.slide_height
    hitung = {}
    for s in d.slides:
        for sh in s.shapes:
            if sh.shape_type == MSO_SHAPE_TYPE.PICTURE:
                hitung[sidik(sh)] = hitung.get(sidik(sh), 0) + 1
    n = len(d.slides)
    logo_utama = max(hitung, key=hitung.get, default=None)
    for i, s in enumerate(d.slides, 1):
        if s.has_notes_slide: s.notes_slide.notes_text_frame.clear()
        tepi = n > 3 and i in (1, n)   # laporan 2 sampai 3 slide tidak punya sampul dan penutup
        calon = [sh for sh in s.shapes if sh.has_text_frame and sh.text_frame.text.strip() and sh.top is not None and sh.top < tinggi * .2 and len(sh.text_frame.text.split()) >= 3]
        judul = next((sh for sh in s.shapes if sh.is_placeholder and sh.placeholder_format.type in (PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE) and sh.text_frame.text.strip()), None) or (max(calon, key=ukuran_huruf) if calon and not tepi else None)
        teks_besar = [sh for sh in s.shapes if sh.has_text_frame and sh.text_frame.text.strip()]
        sampul = max(teks_besar, key=ukuran_huruf).shape_id if tepi and i == 1 and teks_besar else None
        for sh in list(s.shapes):
            nv = sh._element.xpath(".//p:cNvPr")
            for c in nv: c.attrib.pop("descr", None)
            if sh.shape_type == MSO_SHAPE_TYPE.PICTURE:
                a = sh.width * sh.height / luas
                if tepi and a > .6: continue
                if tepi and sh.top < tinggi * .2 and sh.width / sh.height <= 3:   # logo BNPB paling kiri tetap, logo mitra di sampingnya ditutup
                    if sh.left > min(x.left for x in s.shapes if x.shape_type == MSO_SHAPE_TYPE.PICTURE and x.top < tinggi * .2): ganti_gambar(s, sh, "Logo")
                    continue
                pojok_logo = sh.top < tinggi * .12 and sh.left > d.slide_width * .8 and sh.width < d.slide_width * .15
                if a >= AMBANG_GAMBAR.get(nama, .003) and sidik(sh) != logo_utama and not logo_kris(sh, tinggi) and not pojok_logo: ganti_gambar(s, sh)   # .003: foto wajah dan logo mitra ikut; ikon kecil yang berulang tetap
            elif getattr(sh, "has_chart", False) and sh.has_chart:
                data = CategoryChartData()
                seri = list(sh.chart.plots[0].series); kat = max(len(list(x.values)) for x in seri)
                data.categories = [f"Kategori {k + 1}" for k in range(kat)]
                for k in range(len(seri)): data.add_series(f"Seri {k + 1}", [1 + (j + k) % 3 for j in range(kat)])   # nilai contoh, bukan data
                sh.chart.replace_data(data)
            elif getattr(sh, "has_table", False) and sh.has_table:
                for ib, br in enumerate(sh.table.rows):
                    for c in br.cells:
                        for p in c.text_frame.paragraphs:
                            t = p.text.strip()
                            if not t: continue
                            if ib == 0 and not re.search(r"\d", t) and not RE_ASING.search(t): continue
                            isi_paragraf(p, "[Isi]" if len(t) < 30 else URAIAN)
            elif sh.has_text_frame:
                if i == 1 and sampul is not None and sh.shape_id == sampul: isi_kotak(sh.text_frame, True, "[Judul Paparan]")
                else: isi_kotak(sh.text_frame, judul is not None and sh.shape_id == judul.shape_id and not tepi)
    for s in d.slides:
        pasang_kris(s, d.slide_width, d.slide_height)
        xml = s._element.xml
        for rid, rel in list(s.part.rels.items()):   # gambar yang tidak tampil jangan ikut tersimpan
            if rel.reltype.endswith("/image") and f'"{rid}"' not in xml: s.part.rels.pop(rid)
    for bag in [*d.slide_masters, *d.slide_layouts]:
        for c in bag._element.iter("{http://schemas.openxmlformats.org/presentationml/2006/main}cNvPr"): c.attrib.pop("descr", None)
    d.core_properties.title = f"Template {nama}"; d.core_properties.author = "BNPB"; d.core_properties.last_modified_by = "BNPB"; d.core_properties.subject = ""; d.core_properties.comments = ""; d.core_properties.keywords = ""
    tujuan = KELUAR / "PowerPoint" / f"Template {nama}.pptx"
    tujuan.parent.mkdir(parents=True, exist_ok=True)
    d.save(tujuan)
    return tujuan


def sisa_pptx(f):
    """Teks yang masih memuat angka atau nama: untuk diperiksa manusia."""
    d, hasil = Presentation(f), []
    def periksa(i, t):
        t = t.strip()
        if t and "[" not in t and (RE_ASING.search(t) or re.search(r"[1-9]", t)): hasil.append((i, t[:70]))
    for i, s in enumerate(d.slides, 1):
        for sh in s.shapes:
            if sh.has_text_frame:
                for p in sh.text_frame.paragraphs: periksa(i, p.text)
            elif getattr(sh, "has_table", False) and sh.has_table:
                for br in sh.table.rows:
                    for c in br.cells: periksa(i, c.text)
    for lay in d.slide_layouts:
        for sh in lay.shapes:
            if sh.has_text_frame: periksa("tata letak", sh.text_frame.text)
    return hasil


# ---------- Word ----------
def kris_word(d):
    """Logo KRIS rata kanan di kepala halaman, termasuk halaman pertama yang kepalanya berbeda."""
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Cm
    n, sudah = 0, set()
    for i, sek in enumerate(d.sections):
        for k in [sek.header] + ([sek.first_page_header] if sek.different_first_page_header_footer else []):
            if k.is_linked_to_previous:
                if i: continue
                k.is_linked_to_previous = False   # bagian pertama tanpa kepala: buat kepalanya
            if k.part.partname in sudah: continue   # banyak bagian memakai kepala yang sama
            sudah.add(k.part.partname)
            p = k.paragraphs[0].insert_paragraph_before() if k.paragraphs else k.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT; p.add_run().add_picture(str(LOGO_KRIS), height=Cm(.8)); n += 1
    if not n: raise SystemExit("logo KRIS tidak terpasang di Word")


def kerjakan_naskah():
    """Sampul dan gaya dari naskah resmi; isi disusun ulang jadi kerangka ringkas (sisa pemisah bab naskah asli membuat puluhan halaman kosong)."""
    d = docx.Document(AKAR / "data/kajian-bnpb/keluaran/final/Grand Design Ketahanan Air Pulau Jawa 2026-2030.docx")
    tubuh, P = d.element.body, docx.text.paragraph.Paragraph
    gaya = lambda awalan: next(s.name for s in d.styles if s.name.startswith(awalan))
    anak = [e for e in tubuh if not e.tag.endswith("}sectPr")]
    akhir_sampul = next(i for i, e in enumerate(anak) if e.tag.endswith("}p") and e.xpath("./w:pPr/w:sectPr"))
    contoh_tabel = deepcopy(next(e for e in anak if e.tag.endswith("}tbl")))
    bagian = [e for e in anak if e.tag.endswith("}p") and e.xpath("./w:pPr/w:sectPr")]   # bagian terakhir naskah asli = sampul belakang gelap; isi memakai bagian tengah
    tubuh.replace(tubuh.sectPr, deepcopy(bagian[len(bagian) // 2].xpath("./w:pPr/w:sectPr")[0]))
    sampul = 0
    for i, e in enumerate(anak):
        if i > akhir_sampul: tubuh.remove(e); continue
        if not e.tag.endswith("}p"): continue
        p = P(e, d)
        if p.text.strip() and p.style.name == "Sampul":
            r = p.runs; r[0].text = ["[Judul Grand Design dan periode]", "[Subjudul: lingkup dan tujuan kajian]"][min(sampul, 1)]; sampul += 1
            for x in r[1:]: x._r.getparent().remove(x._r)
        elif p.text.strip():
            for x in p.runs[1:]: x._r.getparent().remove(x._r)
            if p.runs: p.runs[0].text = "[Bulan Tahun]"
    ISI = "[Tulis isi bagian ini: temuan, angka bersumber, dan kaitannya dengan keputusan yang diminta.]"
    tambah = lambda t, g: d.add_paragraph(t, style=g)
    def bab(nama, subbab):
        p = d.add_paragraph(style="Heading 1"); r = p.add_run(); r.add_break(); r.add_text(nama)
        for s in subbab:
            tambah(s, "Heading 2"); tambah(ISI, gaya("Isi"))
    for judul, isi in (("KATA PENGANTAR", "[Latar penyusunan, keputusan yang diminta, dan batas tanggal data.]"), ("RINGKASAN EKSEKUTIF", "[Lima sampai tujuh kalimat: masalah, temuan utama, keputusan yang diminta, dan akibatnya.]")):
        tambah(judul, gaya("Judul Bagian")); tambah(isi, gaya("Isi"))
    tambah("DAFTAR ISI", gaya("Judul Daftar")); tambah("[Susun daftar isi di Word: Referensi, Daftar Isi.]", gaya("Isi"))
    bab("PENDAHULUAN", ["Latar Belakang", "Tujuan dan Sasaran", "Ruang Lingkup"])
    bab("TINJAUAN PUSTAKA DAN KERANGKA KONSEPTUAL", ["Landasan Hukum", "Kerangka Konseptual"])
    bab("METODOLOGI DAN DATA", ["Sumber Data", "Metode Analisis", "Keterbatasan"])
    bab("KONDISI SAAT INI", ["[Judul subbab]"])
    tambah("Tabel [nomor] [Judul tabel]", "Caption")
    for ib, br in enumerate(docx.table.Table(contoh_tabel, d).rows):
        if ib > 3: contoh_tabel.remove(br._tr); continue
        for c in br.cells:
            for p in c.paragraphs:
                if p.text.strip():
                    p.runs[0].text = "[Kolom]" if ib == 0 else "[Isi]"
                    for x in p.runs[1:]: x._r.getparent().remove(x._r)
    tubuh.insert(list(tubuh).index(tubuh.sectPr), contoh_tabel)
    tambah("Sumber: [Lembaga, nama data, tahun]", "Sumber")
    bab("ANALISIS KESENJANGAN", ["Kebutuhan dan Kapasitas", "Kesenjangan Utama"])
    bab("GRAND DESIGN DAN STRATEGI", ["Visi dan Sasaran", "Strategi", "Program Prioritas"])
    bab("KELEMBAGAAN, PEMBIAYAAN, DAN PETA JALAN", ["Pembagian Peran", "Pembiayaan", "Peta Jalan"])
    bab("KESIMPULAN DAN REKOMENDASI", ["Kesimpulan", "Keputusan yang Diminta"])
    tambah("DAFTAR PUSTAKA", gaya("Judul Bagian")); tambah("[Penulis. (Tahun). Judul. Penerbit. URL]", "Pustaka")
    tambah("LAMPIRAN", gaya("Judul Bagian")); tambah("[Tabel rinci, metode, dan glosarium.]", gaya("Isi"))
    xml = docx.oxml.xmlchemy.serialize_for_reading(tubuh)
    for rid, rel in list(d.part.rels.items()):   # gambar bab yang dibuang jangan ikut tersimpan
        if rel.reltype.endswith(("/image", "/header", "/footer")) and f'"{rid}"' not in xml: del d.part.rels[rid]
        elif rel.reltype.endswith("/footnotes"):   # catatan kaki naskah asli berisi data nyata; yang tersisa hanya pemisah bawaan Word
            from lxml import etree
            W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
            akar = etree.fromstring(rel.target_part.blob)
            for c in list(akar):
                if c.get(W + "type") not in ("separator", "continuationSeparator"): akar.remove(c)
            rel.target_part._blob = etree.tostring(akar, xml_declaration=True, encoding="UTF-8", standalone=True)
    for sek in d.sections:
        for bag in (sek.header, sek.footer, sek.first_page_header, sek.first_page_footer, sek.even_page_header, sek.even_page_footer):
            for p in [*bag.paragraphs, *(p for t in bag.tables for br in t.rows for c in br.cells for p in c.paragraphs)]:
                if (len(p.text.split()) >= 2 or RE_ASING.search(p.text)) and "Badan Nasional" not in p.text and p.runs:
                    p.runs[0].text = "[Judul dokumen]"
                    for x in p.runs[1:]: x._r.getparent().remove(x._r)
    d.core_properties.title = "Template Naskah Kajian Grand Design"; d.core_properties.author = "BNPB"; d.core_properties.last_modified_by = "BNPB"; d.core_properties.subject = ""; d.core_properties.comments = ""; d.core_properties.keywords = ""
    kris_word(d)
    t = KELUAR / "Word" / "Template Naskah Kajian Grand Design.docx"
    t.parent.mkdir(parents=True, exist_ok=True); d.save(t)
    return t


def kerjakan_surat():
    contoh = json.loads((AKAR / "data/kajian-bnpb/skill/surat-bnpb/contoh/audiensi-ugm.json").read_text(encoding="utf-8"))
    def tutup(x, k=""):
        if isinstance(x, dict): return {a: tutup(b, a) for a, b in x.items()}
        if isinstance(x, list): return [tutup(b, k) for b in x]
        if not isinstance(x, str): return x
        return f"[{k.replace('_', ' ').capitalize() or 'Isi'}]" if len(x) < 70 else "[Tulis paragraf surat: maksud, dasar, dan permintaan.]"
    return contoh, {**tutup(contoh), "berkas": "Template Surat Dinas BNPB.docx", "nomor": "B-       /BNPB/[UNIT]/[KODE]/[BLN]/[THN]", "tanggal": "        [Bulan Tahun]", "lampiran": "-", "sifat": "[Biasa atau Segera]"}


# ---------- Excel ----------
def kerjakan_rab():
    wb = openpyxl.load_workbook(AKAR / "data/kegiatan-bnpb/susur-kampus-021126/RAB Rute Optimal Kampus Kunci 021126.xlsx")
    for ws in wb:
        kepala = next((r for r in range(1, 15) if str(ws.cell(r, 1).value).strip() == "No"), 5)
        for br in ws.iter_rows():
            for c in br:
                v = c.value
                if v is None or (isinstance(v, str) and v.startswith("=")): continue
                if c.row < kepala:
                    c.value = {1: "RENCANA ANGGARAN BIAYA [NAMA KEGIATAN]", 2: "[Lingkup, tanggal, dan jumlah tenaga]", 3: "Dasar: [Nomor dan tahun peraturan standar biaya]"}.get(c.row, "[Keterangan]")
                elif c.row == kepala: continue
                elif isinstance(v, (int, float)): c.value = 0
                elif c.column == 1: continue
                elif c.column == 2: c.value = "[KELOMPOK BIAYA]" if v.upper() == v else "[Uraian biaya]"
                elif c.column == 4: continue
                else: c.value = "[Keterangan]"
    from openpyxl.drawing.image import Image
    for ws in wb:
        g = Image(str(LOGO_KRIS)); g.height = 30; g.width = int(30 * RASIO_KRIS); ws.add_image(g, "F1")
    wb.properties.title = "Template Rencana Anggaran Biaya Kegiatan"; wb.properties.creator = "BNPB"; wb.properties.lastModifiedBy = "BNPB"
    t = KELUAR / "Excel" / "Template Rencana Anggaran Biaya Kegiatan.xlsx"
    t.parent.mkdir(parents=True, exist_ok=True); wb.save(t)
    return t


# ---------- Markdown ----------
MD = {
    "Template PRD Sistem": """# PRD: [Nama Sistem] (`/[alamat]`)

## 1. Ringkasan
### 1.1 Masalah
[Masalah yang dibuktikan dengan data, siapa yang terdampak.]
### 1.2 Tujuan
- [Tujuan yang bisa diukur]
### 1.3 Ukuran keberhasilan
| Ukuran | Sekarang | Target | Cara mengukur |
| --- | --- | --- | --- |
| [Ukuran] | [Angka] | [Angka] | [Sumber] |
### 1.4 Non-tujuan
- [Yang sengaja tidak dikerjakan]
### 1.5 Larangan
- [Hal yang tidak boleh ada di sistem]

## 2. Pengguna dan peran
| Peran | Bisa | Tidak bisa |
| --- | --- | --- |
| [Peran] | [Hak] | [Batas] |

## 3. Peta layar
[Daftar layar dan hubungan antarlayar.]

## 4. Fitur
### F-[Kode] [Nama fitur]
- **Tujuan:** [Satu kalimat]
- **Alur:** [Langkah pengguna]
- **Kriteria terima:** [Cara membuktikan selesai]

## 5. Ketergantungan dan risiko
| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| [Risiko] | [Dampak] | [Mitigasi] |
""",
    "Template Keputusan Pemilik": """# Keputusan pemilik: [Nama Program] ([Tanggal])

Dokumen ini menang atas dokumen lain di folder program ini.

## A. Arah
1. [Keputusan, dengan alasan singkat dan tanggal]

## B. [Modul atau fitur]
1. [Keputusan]

## C. Rupa dan kerja
1. [Keputusan tampilan dan cara kerja]

## D. Pertanyaan terbuka
| No | Pertanyaan | Bawaan bila belum dijawab | Pemilik keputusan |
| --- | --- | --- | --- |
| [No] | [Pertanyaan] | [Bawaan] | [Nama] |

## E. Perubahan sesudah rilis awal
- [Tanggal]: [Perubahan dan alasannya]
""",
    "Template Alur Sistem": """# ALUR: [Nama Sistem]

## 1. [Tahap]
### 1.1 [Peristiwa]
1. **[Aktor]** [melakukan apa] di [layar].
2. Sistem [menyimpan atau memeriksa apa].
3. **Status:** [status lama] menjadi [status baru].

## 2. Status dan peralihannya
| Status | Masuk dari | Keluar ke | Siapa yang memicu |
| --- | --- | --- | --- |
| [Status] | [Status] | [Status] | [Peran] |

## 3. Keadaan gagal
| Kejadian | Yang dilihat pengguna | Pemulihan |
| --- | --- | --- |
| [Kejadian] | [Pesan] | [Langkah] |
""",
    "Template Desain Teknis": """# DESAIN-TEKNIS: [Nama Sistem]

## 1. Arsitektur
[Komponen dan aliran data.]

## 2. Berkas
### 2.1 Baru
| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `[jalur]` | [Isi] | [Agent] |
### 2.2 Berubah
| Berkas | Perubahan |
| --- | --- |
| `[jalur]` | [Perubahan] |

## 3. Model data
### 3.1 Migrasi `[nomor]_[nama].sql`
| Kolom | Tipe | Batasan | Keterangan |
| --- | --- | --- | --- |
| [Kolom] | [Tipe] | [CHECK atau NOT NULL] | [Keterangan] |

## 4. Kontrak API
### 4.1 Aturan bersama
[Sesi, peran, batas laju, bentuk galat.]
### 4.2 Rute
| Metode dan jalur | Hak | Masukan | Keluaran |
| --- | --- | --- | --- |
| `[GET /api/...]` | [Peran] | [Masukan] | [Keluaran] |

## 5. Keputusan arsitektur
### ADR-[nomor]: [Judul]
- **Pilihan:** [Yang dipilih]
- **Alasan:** [Kenapa]
- **Yang ditolak:** [Alternatif]
""",
    "Template Rencana Uji": """# RENCANA-UJI: [Nama Sistem]

## 0. Aturan dasar
- [Lingkungan uji, data dummy, aturan penamaan]

## 1. Lapisan
| Lapisan | Alat | Perintah |
| --- | --- | --- |
| [Lapisan] | [Alat] | `[perintah]` |

## 2. Kriteria terima
### 2.1 Kasus acuan
| Masukan | Keluaran yang diharapkan |
| --- | --- |
| [Masukan] | [Keluaran] |
### 2.2 Per layar (1440 dan 390 piksel)
- [ ] [Perilaku yang diperiksa]
### 2.3 Matriks rute
| Rute | Tamu | Peran biasa | Peran berhak |
| --- | --- | --- | --- |
| `[rute]` | [Kode] | [Kode] | [Kode] |

## 3. Pengulas dan terbit
- [Pengulas yang wajib dan perintah bukti sebelum terbit]
""",
    "Template Tiket Kerja": """# TIKET: [Nama Sistem]

## 0. Batasan global
- [Aturan yang berlaku di semua tiket]

## 1. Indeks dan papan status
| Tiket | Judul | Bergantung pada | Status |
| --- | --- | --- | --- |
| [KODE-001] | [Judul] | [Tiket] | Belum |

## 2. Tiket
### [KODE-001] [Judul]
- **Cakupan:** [Berkas yang disentuh]
- **Di luar:** [Yang tidak disentuh]
- **Langkah:** [Urutan kerja]
- **Bukti siap:** `[perintah yang membuktikan selesai]`

## 3. Penghambat dari pemilik
- [Keputusan atau bahan yang ditunggu]
""",
    "Template Catatan Riset": """# [Topik riset]: [cakupan]

Tanggal pencarian: [Tanggal]

## Q1. [Pertanyaan riset]
### Inti temuan
[Dua sampai tiga kalimat jawaban.]
### Temuan berkutip
- [Temuan]. ([Lembaga], [tanggal], [URL])
### Inferensi
- [Kesimpulan penulis, ditandai sebagai inferensi]
### Celah
- [Yang belum terjawab dan kenapa]

## Daftar sumber
| Sumber | Lembaga | Tanggal | URL |
| --- | --- | --- | --- |
| [Judul] | [Lembaga] | [Tanggal] | [URL] |
""",
    "Template Pra-registrasi Model": """# Pra-registrasi: [Nama model]

Dikunci pada: [Tanggal]. Perubahan sesudah tanggal ini dicatat sebagai amandemen.

## 0. Latar
[Kenapa bentuk model ini dipilih.]

## 1. Pertanyaan
[Satu pertanyaan yang dijawab uji ini.]

## 2. Satuan, sampel, label
### 2.1 Satuan
[Wilayah x waktu.]
### 2.2 Label
[Sumber kejadian, definisi positif, cara menangani kurang lapor.]

## 3. Model
### 3.1 Tingkat [nomor]: [Nama]
[Rumus, fitur, data latih.]
### 3.2 Pembanding
[Model acuan yang wajib dikalahkan.]

## 4. Pembagian data
[Latih, validasi, uji; aturan anti-bocor.]

## 5. Ukuran dan ambang kelulusan
| Ukuran | Ambang lulus | Keterangan |
| --- | --- | --- |
| [POD, FAR, atau lainnya] | [Nilai] | [Keterangan] |

## 6. Vonis
[Yang dilakukan bila lulus, bila gagal, dan bila data tidak cukup.]

## 7. Amandemen
- [Tanggal]: [Perubahan dan alasannya]
""",
    "Panduan Template": """# Panduan Template Dokumen

Template ini diturunkan dari dokumen resmi di repo: master, tata letak, ikon, dan label tetap, sedangkan isi diganti placeholder.

## Cara memakai
1. Salin templatenya, jangan sunting berkas aslinya.
2. Ganti semua teks berkurung siku `[...]` dan angka `0`.
3. Ganti kotak abu-abu "[Peta, foto, atau grafik]" dengan gambar atau grafik yang sebenarnya.
4. Tulis judul slide sebagai kalimat kesimpulan dengan angka, dan cantumkan sumber tiap angka.

## Aturan tetap
- Huruf Roboto, tanpa emoji, angka format Indonesia.
- Hotspot, luas, dan belum padam hanya dari sistem kita.
- Laporan harian dan penanganan rutin tetap dibangun generator `data/laporan-bnpb/generator/`; template ini untuk penyusunan manual.

Dibuat ulang dengan `py scripts/bnpb/templat_dokumen.py`.
""",
}


def ke_pdf_word(f):
    pdf = f.with_suffix(".pdf")
    ps = ("$ErrorActionPreference='Stop'; $w=New-Object -ComObject Word.Application; $w.Visible=$false; try { $d=$w.Documents.Open($env:DOC_IN,$false,$true); $d.ExportAsFixedFormat($env:PDF_OUT,17); $d.Close(0) } finally { $w.Quit() }")
    subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=True, timeout=300, env={**os.environ, "DOC_IN": str(f), "PDF_OUT": str(pdf)}, capture_output=True)
    return pdf


def main():
    tanpa_pdf = "--tanpa-pdf" in sys.argv
    hanya = sys.argv[sys.argv.index("--hanya") + 1].lower() if "--hanya" in sys.argv else ""
    laporan = []
    for nama, sumber, simpan in PPT:
        if hanya and hanya not in nama.lower(): continue
        f = kerjakan_pptx(nama, sumber, simpan)
        if not tanpa_pdf:
            import pdf as P
            P.ke_pdf(str(f))
        s = sisa_pptx(f)
        print(f"{f.name}: {len(Presentation(f).slides)} slide, sisa {len(s)}")
        laporan += [(f.stem[9:30], i, t) for i, t in s]
    if not hanya or hanya in "word naskah surat excel rab markdown":
        n = kerjakan_naskah(); print(n.name, len(docx.Document(n).paragraphs), "paragraf")
        if not tanpa_pdf:
            try: ke_pdf_word(n)
            except Exception as e: print("PDF Word gagal:", str(e)[:120])
        contoh, data = kerjakan_surat()
        with tempfile.TemporaryDirectory() as t:
            j = Path(t) / "surat.json"; j.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            r = subprocess.run([sys.executable, str(AKAR / "data/kajian-bnpb/skill/surat-bnpb/scripts/buat_surat.py"), str(j), "-o", t], capture_output=True, text=True, encoding="utf-8")
            print("surat:", (r.stdout or r.stderr).strip()[-200:])
            dok = list(Path(t).glob("*.docx"))
            if dok:
                tuj = KELUAR / "Word" / "Template Surat Dinas BNPB.docx"; dsur = docx.Document(dok[0]); kris_word(dsur); dsur.save(tuj)
                if not tanpa_pdf:
                    try: ke_pdf_word(tuj)
                    except Exception as e: print("PDF surat gagal:", str(e)[:120])
        print(kerjakan_rab().name)
        (KELUAR / "Markdown").mkdir(parents=True, exist_ok=True)
        (KELUAR / "aset").mkdir(exist_ok=True); (KELUAR / "aset/logo-kris.png").write_bytes(LOGO_KRIS.read_bytes())
        for k, v in MD.items(): (KELUAR / "Markdown" / f"{k}.md").write_text("![Logo KRIS](../aset/logo-kris.png)\n\n" + v, encoding="utf-8", newline="\n")
    kurang = [f.name for f in (KELUAR / "PowerPoint").glob("*.pptx") if any(not any(sh.name == "Logo KRIS" for sh in s.shapes) for s in Presentation(f).slides)]
    if kurang and not hanya: raise SystemExit(f"logo KRIS kurang di: {kurang}")
    print("--- SISA untuk diperiksa")
    for x in laporan: print(x)


if __name__ == "__main__":
    main()
