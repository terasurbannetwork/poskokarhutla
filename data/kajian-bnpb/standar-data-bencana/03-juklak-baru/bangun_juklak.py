"""Bangun rancangan Juklak Standar Data Kejadian dan Dampak Bencana menjadi DOCX (dan PDF lewat Word bila ada).

  py data/kajian-bnpb/standar-data-bencana/03-juklak-baru/bangun_juklak.py [--pdf]

Naskah: naskah/*.md (urut nama berkas). Konvensi naskah:
  # BAB I | PENDAHULUAN        judul bab dua baris di tengah
  # JUDUL LAMPIRAN             judul di tengah (dipakai sesudah ::: lampiran)
  ## A. JUDUL BAGIAN           bagian berhuruf dengan inden gantung
  1. / a. / 1) / a)            butir bernomor; tingkat ditentukan oleh inden spasi (3 spasi per tingkat)
  | tabel |                    tabel Markdown; baris "Tabel n. Judul" tepat di atasnya menjadi keterangan
  ![Gambar n. Judul](path)     gambar selebar naskah, keterangan di bawahnya
  ::: lampiran II              pindah halaman dan kepala lampiran
  ::: ttd                      blok penetapan
Format meniru Juklak BNPB 7/2023: Bookman Old Style, rata kanan-kiri, nomor halaman "- n -" di atas.
Logo BNPB di halaman pertama, logo KRIS di kaki setiap halaman.
"""
import datetime
import os
import re
import subprocess
import sys
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

DI = Path(__file__).resolve().parent
REPO = DI.parents[3]
# Versi lain (misalnya Juklak praktis) memakai mesin yang sama lewat variabel lingkungan.
NASKAH = Path(os.environ.get('JUKLAK_NASKAH', DI / 'naskah'))
KELUARAN = Path(os.environ.get('JUKLAK_KELUARAN', DI.parent / 'keluaran' / '03 Rancangan Juklak Standar Data'))
NAMA = os.environ.get('JUKLAK_NAMA', 'Rancangan Juklak Standar Data Kejadian dan Dampak Bencana')
LOGO_BNPB = Path(os.path.expanduser('~')) / '.claude/skills/ppt-konsultan/bnpb/assets/proyek-bnpb/logo/sumber-bnpb.png'
LOGO_KRIS = REPO / 'data/laporan-bnpb/generator/sampul/media/kris-logo.png'
HURUF = 'Bookman Old Style'
UKURAN = 11.5
TAHUN = '2026'
LEBAR_ISI = 15.5  # cm (A4 21 cm, kiri 3 cm, kanan 2,5 cm)
INDEN = 0.75      # cm per tingkat butir


def huruf(run, ukuran=UKURAN, tebal=False, miring=False):
    run.font.name = HURUF
    run.element.rPr.rFonts.set(qn('w:eastAsia'), HURUF)
    run.font.size = Pt(ukuran)
    run.bold = tebal
    run.italic = miring
    run.font.color.rgb = RGBColor(0, 0, 0)


def tulis_inline(par, teks, ukuran=UKURAN, tebal=False):
    """**tebal** dan *miring*."""
    for bag in re.split(r'(\*\*[^*]+\*\*|\*[^*]+\*)', teks):
        if not bag:
            continue
        if bag.startswith('**'):
            huruf(par.add_run(bag[2:-2]), ukuran, True)
        elif bag.startswith('*'):
            huruf(par.add_run(bag[1:-1]), ukuran, tebal, True)
        else:
            huruf(par.add_run(bag), ukuran, tebal)


def paragraf(doc, teks='', rata=WD_ALIGN_PARAGRAPH.JUSTIFY, kiri=0.0, gantung=0.0, sesudah=6, sebelum=0,
             ukuran=UKURAN, tebal=False, lekat=False):
    p = doc.add_paragraph()
    pf = p.paragraph_format
    pf.keep_with_next = lekat
    pf.alignment = rata
    pf.left_indent = Cm(kiri)
    pf.first_line_indent = Cm(-gantung) if gantung else None
    pf.space_after = Pt(sesudah)
    pf.space_before = Pt(sebelum)
    pf.line_spacing = 1.08
    if teks:
        tulis_inline(p, teks, ukuran, tebal)
    return p


def tab_gantung(p, posisi):
    tabs = p.paragraph_format.tab_stops
    tabs.add_tab_stop(Cm(posisi))


def bidang_halaman(par):
    """Isi '- PAGE -' sebagai bidang Word."""
    huruf(par.add_run('- '))
    r = par.add_run()
    for jenis, isi in (('begin', None), ('instr', ' PAGE '), ('separate', None), ('end', None)):
        if jenis == 'instr':
            el = OxmlElement('w:instrText')
            el.set(qn('xml:space'), 'preserve')
            el.text = isi
        else:
            el = OxmlElement('w:fldChar')
            el.set(qn('w:fldCharType'), jenis)
        r._r.append(el)
    huruf(r)
    huruf(par.add_run(' -'))


def siapkan(doc):
    st = doc.styles['Normal']
    st.font.name = HURUF
    st.element.rPr.rFonts.set(qn('w:eastAsia'), HURUF)
    st.font.size = Pt(UKURAN)
    s = doc.sections[0]
    s.page_width, s.page_height = Cm(21), Cm(29.7)
    s.left_margin, s.right_margin = Cm(3), Cm(2.5)
    s.top_margin, s.bottom_margin = Cm(2.5), Cm(2.2)
    s.header_distance, s.footer_distance = Cm(1.2), Cm(1.0)
    s.different_first_page_header_footer = True
    hp = s.header.paragraphs[0]
    hp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    bidang_halaman(hp)
    for kaki in (s.footer, s.first_page_footer):
        fp = kaki.paragraphs[0]
        fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        if LOGO_KRIS.exists():
            fp.add_run().add_picture(str(LOGO_KRIS), height=Cm(0.55))


def halaman_judul(doc):
    p = paragraf(doc, rata=WD_ALIGN_PARAGRAPH.RIGHT, sesudah=0)
    r = p.add_run('RANCANGAN')
    huruf(r, 13, True)
    # bingkai kotak seperti cap SALINAN pada naskah asli
    pPr = p._p.get_or_add_pPr()
    bdr = OxmlElement('w:pBdr')
    for sisi in ('top', 'left', 'bottom', 'right'):
        e = OxmlElement(f'w:{sisi}')
        e.set(qn('w:val'), 'single'); e.set(qn('w:sz'), '8'); e.set(qn('w:space'), '4'); e.set(qn('w:color'), '000000')
        bdr.append(e)
    pPr.append(bdr)
    p.paragraph_format.left_indent = Cm(11.2)
    p = paragraf(doc, rata=WD_ALIGN_PARAGRAPH.CENTER, sesudah=6)
    if LOGO_BNPB.exists():
        p.add_run().add_picture(str(LOGO_BNPB), height=Cm(2.6))
    for t in ('KEPALA', 'BADAN NASIONAL PENANGGULANGAN BENCANA'):
        paragraf(doc, t, WD_ALIGN_PARAGRAPH.CENTER, sesudah=0, tebal=True)
    paragraf(doc, '', sesudah=10)
    for t in ('PETUNJUK PELAKSANAAN', 'STANDAR DATA KEJADIAN DAN DAMPAK BENCANA', f'NOMOR ... TAHUN {TAHUN}'):
        paragraf(doc, t, WD_ALIGN_PARAGRAPH.CENTER, sesudah=0)
    paragraf(doc, '', sesudah=8)


def kepala_lampiran(doc, nomor):
    p = doc.add_paragraph()
    p.add_run().add_break(WD_BREAK.PAGE)
    for t in (f'LAMPIRAN {nomor}', 'PETUNJUK PELAKSANAAN', 'STANDAR DATA KEJADIAN DAN', 'DAMPAK BENCANA',
              f'NOMOR ... TAHUN {TAHUN}'):
        paragraf(doc, t, WD_ALIGN_PARAGRAPH.LEFT, kiri=8.5, sesudah=0)
    paragraf(doc, '', sesudah=10)


def ttd(doc):
    paragraf(doc, '', sesudah=12)
    for t, s in (('Ditetapkan di Jakarta', 0), ('pada tanggal ...', 8), ('KEPALA BADAN NASIONAL', 0),
                 ('PENANGGULANGAN BENCANA,', 36), ('...', 0)):
        paragraf(doc, t, WD_ALIGN_PARAGRAPH.LEFT, kiri=8.5, sesudah=s)


def bobot(kepala, baris):
    n = len(kepala)
    pj = [max([len(kepala[i])] + [len(b[i]) if i < len(b) else 0 for b in baris]) for i in range(n)]
    w = [min(max(p, 4), 70) ** 0.75 for p in pj]
    tot = sum(w)
    return [LEBAR_ISI * x / tot for x in w]


def latar(sel, warna):
    tcPr = sel._tc.get_or_add_tcPr()
    sh = OxmlElement('w:shd')
    sh.set(qn('w:val'), 'clear'); sh.set(qn('w:color'), 'auto'); sh.set(qn('w:fill'), warna)
    tcPr.append(sh)


def ulang_kepala(baris):
    trPr = baris._tr.get_or_add_trPr()
    e = OxmlElement('w:tblHeader'); e.set(qn('w:val'), 'true'); trPr.append(e)


def tabel(doc, kepala, baris, rata_kanan, keterangan, kiri):
    if keterangan:
        p = paragraf(doc, keterangan, WD_ALIGN_PARAGRAPH.CENTER, sebelum=4, sesudah=4, tebal=False, lekat=True)
    n = len(kepala)
    t = doc.add_table(rows=1, cols=n)
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    ukuran = 9 if n >= 5 else 10
    lebar = bobot(kepala, baris)
    if [k.lower() for k in kepala] == ['no', 'nama data', 'definisi', 'klasifikasi', 'ukuran', 'satuan']:
        lebar = [0.9, 2.9, 5.2, 3.6, 1.5, 1.4]   # kolom Lampiran II: nama data tidak terlalu sempit
    for i, k in enumerate(kepala):
        sel = t.rows[0].cells[i]
        sel.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        tulis_inline(sel.paragraphs[0], k.upper(), ukuran, True)
        latar(sel, 'D9D9D9')
    ulang_kepala(t.rows[0])
    for b in baris:
        cells = t.add_row().cells
        for i in range(n):
            isi = b[i] if i < len(b) else ''
            par = cells[i].paragraphs[0]
            par.alignment = WD_ALIGN_PARAGRAPH.RIGHT if rata_kanan[i] else WD_ALIGN_PARAGRAPH.LEFT
            par.paragraph_format.space_after = Pt(1)
            tulis_inline(par, isi, ukuran)
    for row in t.rows:
        for i, w in enumerate(lebar):
            row.cells[i].width = Cm(w)
    paragraf(doc, '', sesudah=4)


def sel_tabel(ln):
    return [c.strip().replace('\\|', '|') for c in ln.strip().strip('|').split('|')]


def bangun(keluar):
    doc = Document()
    siapkan(doc)
    halaman_judul(doc)
    berkas = sorted(NASKAH.glob('*.md'))
    baris_semua = []
    for b in berkas:
        baris_semua += b.read_text(encoding='utf-8').split('\n') + ['']
    i = 0
    dasar = 0.0          # inden dasar: 1 cm di dalam bagian berhuruf (##), 0 di luar
    keterangan = None
    while i < len(baris_semua):
        ln = baris_semua[i]
        s = ln.strip()
        if not s:
            i += 1
            continue
        m = re.match(r'::: lampiran (\S+)', s)
        if m:
            kepala_lampiran(doc, m.group(1)); dasar = 0.0; i += 1; continue
        if s == '::: ttd':
            ttd(doc); i += 1; continue
        if s.startswith('# '):
            judul = s[2:]
            if '|' in judul:
                a, b2 = [x.strip() for x in judul.split('|', 1)]
                paragraf(doc, a, WD_ALIGN_PARAGRAPH.CENTER, sebelum=10, sesudah=0, lekat=True)
                paragraf(doc, b2, WD_ALIGN_PARAGRAPH.CENTER, sesudah=10, lekat=True)
            else:
                paragraf(doc, judul, WD_ALIGN_PARAGRAPH.CENTER, sesudah=10, lekat=True)
            dasar = 0.0; i += 1; continue
        if s.startswith('## '):
            m = re.match(r'##\s+([A-Z])\.\s+(.*)', s)
            if m:
                p = paragraf(doc, f'{m.group(1)}.\t{m.group(2)}', WD_ALIGN_PARAGRAPH.LEFT, kiri=1.0, gantung=1.0,
                             sebelum=6, sesudah=4, lekat=True)
                tab_gantung(p, 1.0)
            else:
                paragraf(doc, s[3:], WD_ALIGN_PARAGRAPH.LEFT, sebelum=6, sesudah=4)
            dasar = 1.0; i += 1; continue
        m = re.match(r'(Tabel [IVX\d.]+\..*)$', s)
        if m and i + 2 < len(baris_semua) and (baris_semua[i + 1].strip().startswith('|') or baris_semua[i + 2].strip().startswith('|')):
            keterangan = s; i += 1; continue
        if s.startswith('|'):
            blok = []
            while i < len(baris_semua) and baris_semua[i].strip().startswith('|'):
                blok.append(baris_semua[i]); i += 1
            kepala = sel_tabel(blok[0])
            pemisah = sel_tabel(blok[1])
            rata_kanan = [c.endswith(':') and not c.startswith(':') for c in pemisah]
            tabel(doc, kepala, [sel_tabel(x) for x in blok[2:]], rata_kanan, keterangan, dasar)
            keterangan = None
            continue
        m = re.match(r'!\[([^\]]*)\]\(([^)]+)\)', s)
        if m:
            p = paragraf(doc, rata=WD_ALIGN_PARAGRAPH.CENTER, sebelum=4, sesudah=2)
            p.add_run().add_picture(str((NASKAH / m.group(2)).resolve()), width=Cm(LEBAR_ISI - dasar))
            paragraf(doc, m.group(1), WD_ALIGN_PARAGRAPH.CENTER, sesudah=8)
            i += 1; continue
        m = re.match(r'^(\s*)(\d+|[a-z])([.)])\s+(.*)$', ln)
        if m:
            tingkat = len(m.group(1)) // 3
            penanda = f'{m.group(2)}{m.group(3)}'
            kiri = dasar + INDEN * (tingkat + 1)
            p = paragraf(doc, f'{penanda}\t{m.group(4)}', kiri=kiri, gantung=INDEN, sesudah=3)
            tab_gantung(p, kiri)
            i += 1; continue
        paragraf(doc, s, kiri=dasar)
        i += 1
    keluar.parent.mkdir(parents=True, exist_ok=True)
    doc.core_properties.title = 'Rancangan Petunjuk Pelaksanaan Standar Data Kejadian dan Dampak Bencana'
    doc.core_properties.author = 'Tim Ahli dan Tim Sus IT BNPB'
    doc.save(keluar)
    return keluar


if __name__ == '__main__':
    tgl = datetime.date.today().strftime('%d%m%y')
    docx = bangun(KELUARAN / f'{NAMA} {tgl}.docx')
    print('DOCX', docx)
    if '--pdf' in sys.argv:
        ps = (f"$w=New-Object -ComObject Word.Application; $d=$w.Documents.Open('{docx}',$false,$true); "
              f"$d.ExportAsFixedFormat('{docx.with_suffix('.pdf')}',17); $d.Close(0); $w.Quit()")
        r = subprocess.run(['powershell', '-NoProfile', '-Command', ps], capture_output=True, text=True)
        print('PDF', docx.with_suffix('.pdf') if not r.returncode else r.stderr[:400])
