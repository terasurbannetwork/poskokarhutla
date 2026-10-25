#!/usr/bin/env python3
"""Pembangun DOCX dua kajian BNPB dari naskah Markdown (bangun/NASKAH-SPEK.md).

    .venv/bin/python bangun/docx/bangun.py air       # naskah/air/*.md -> keluaran/air.docx + air.pdf
    .venv/bin/python bangun/docx/bangun.py --naskah naskah/_contoh --keluar bangun/docx/keluaran/contoh.docx

Isi dibaca lewat bangun/kontrak/naskah.py; warna, huruf, margin, garis, dan jarak dari tema.json. Bidang TOC dan
SEQ terisi: DOCX dirakit, LibreOffice (makro ekspor.bas, profil pribadi) mengekspor PDF dengan tujuan bernama dari
penanda Word, halaman tiap penanda dibaca, lalu DOCX dirakit ulang dengan nomor itu sebagai hasil bidang tersimpan
sampai halaman tidak berubah lagi (titik tetap). PDF akhir = ekspor DOCX akhir. Di samping DOCX ditulis
<nama>.manifest.json: angka injeksi (gerbang D-6, D-22) dan hex beserta perannya per halaman (D-24).

Lingkungan: SOFFICE (bawaan `soffice` di PATH), node di PATH. Satu build sekali jalan: profil LibreOffice tunggal.
"""
import argparse
import functools
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from xml.sax.saxutils import escape

from docx import Document
from docx.opc.constants import RELATIONSHIP_TYPE as RT
from docx.opc.packuri import PackURI
from docx.opc.part import Part
from docx.oxml import parse_xml

SINI = Path(__file__).resolve().parent
AKAR = SINI.parents[1]  # data/kajian-bnpb
sys.path.insert(0, str(SINI.parent / 'kontrak'))
import naskah as N  # noqa: E402
from tema import muat, warna  # noqa: E402

T = muat()
TY, DX, KOS = T['tipografi_docx'], T['docx'], T['kosakata']
SOFFICE = os.environ.get('SOFFICE') or shutil.which('soffice') or next(
    (x for x in ('/Applications/LibreOffice.app/Contents/MacOS/soffice', '/opt/homebrew/bin/soffice') if Path(x).exists()), None)
KERJA = SINI / 'keluaran'
IKON_DIR = KERJA / 'ikon'
NBSP, ENDASH = chr(160), chr(0x2013)
# isi pil: tepi dan spasi dalam NARROW NO-BREAK SPACE (ada di Roboto, tak terputus). NBSP membuat LibreOffice memecah
# porsi teks dan menggambar garis putih di isi dan garis pil (diuji 23 Okt 2026, PDF 300 dpi).
TEPI_PIL, SPASI_PIL = chr(0x202F) * 2, chr(0x202F)
NS = ('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
      'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
      'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"')
# label tampil komponen (bukan gaya); diubah di sini bila redaksi berubah
LABEL = {'dasar': 'DASAR', 'kemungkinan': 'KEMUNGKINAN 5 TAHUN', 'analog': 'KEJADIAN ANALOG', 'lembaga': 'LEMBAGA',
         'kerusakan': 'KERUSAKAN DAN KERUGIAN', 'kebijakan': 'ANGKA KEBIJAKAN', 'kepekaan': 'ANALISIS KEPEKAAN',
         'respons': 'KEMAMPUAN RESPONS', 'pemulihan': 'KEBUTUHAN PEMULIHAN', 'pemicu': 'PEMICU DAN POLA',
         'mandat': 'BATAS MANDAT', 'lokasi': 'LOKASI', 'periode': 'PERIODE', 'dampak': 'DAMPAK',
         'pemimpin': 'Pemimpin', 'pendukung': 'Pendukung', 'tidak berlaku': 'Tidak berlaku',
         'ringkasan': 'Ringkasan bab', 'indikator': 'Indikator selesai', 'dasar_rek': 'Dasar',
         'butuh': 'Butuh', 'membuka': 'Membuka', 'horizon': 'Horizon peta jalan', 'jumlah': 'Jumlah',
         'no': 'NO', 'langkah': 'LANGKAH', 'waktu': 'WAKTU', 'jenis': 'JENIS', 'subtotal': 'Subtotal',
         'legenda': 'Legenda', 'status': 'Status usulan', 'pembatas': 'LAMPIRAN'}
# isi baris legenda tabel (PEDOMAN B5.7, Buku Pegangan L48): kunci -> teks; disusun otomatis dari penanda yang dipakai tabel
LEGENDA = {'peringkat': 'angka dalam bulatan navy = peringkat', 'sorot': 'baris berlatar = wilayah fokus',
           'keyakinan': 'pil = label keyakinan angka', 'kemungkinan': 'pil terisi = kelas kemungkinan skenario ini',
           'peran': 'pil Pemimpin dan Pendukung = peran lembaga', 'rek': 'angka dalam bulatan = nomor rekomendasi',
           'status': 'pil = status usulan', 'jenis_aksi': 'ikon = jenis aksi', 'keluarga': 'warna ikon = keluarga bencana'}


# ---------------------------------------------------------------- satuan dan warna

def hx(tok):
    return warna(T, tok)[1:]


def tw_cm(cm):
    return round(cm / 2.54 * 1440)


def tw_pt(pt):
    return round(pt * 20)


def emu_cm(cm):
    return round(cm * 360000)


LEBAR = tw_cm(T['halaman']['lebar_isi_cm'])
SEL = {k: tw_cm(v / 10) for k, v in DX['sel_tabel_mm'].items()}
# tabel di dalam kartu skenario (satu halaman, B5.11): docx.sel_tabel_kartu_mm, bawaan separuh tinggi sel tabel biasa
SEL_KARTU = {k: tw_cm(v / 10) for k, v in DX.get('sel_tabel_kartu_mm', {k: v / 2 if k in ('atas', 'bawah') else v
                                                                      for k, v in DX['sel_tabel_mm'].items()}).items()}


def gaya(nama, **ubah):
    """Entri tipografi_docx -> argumen rpr()."""
    g = TY[nama]
    k = {'pt': g.get('ukuran_pt'), 'b': g.get('bobot') == 'bold', 'i': bool(g.get('miring')),
         'warna': g.get('warna'), 'spasi': g.get('spasi_huruf_pt')}
    k.update(ubah)
    return k


# ---------------------------------------------------------------- XML: run, paragraf, bidang, tabel

def esc(s):
    return escape(str(s), {'"': '&quot;'})


def rpr(b=False, i=False, warna=None, pt=None, spasi=None, shd=None, bdr=None, sup=False, rstyle=None):
    s = f'<w:rStyle w:val="{rstyle}"/>' if rstyle else ''
    s += '<w:b/><w:bCs/>' if b else ''
    s += '<w:i/><w:iCs/>' if i else ''
    s += f'<w:color w:val="{hx(warna)}"/>' if warna else ''
    s += f'<w:spacing w:val="{tw_pt(spasi)}"/>' if spasi else ''
    s += f'<w:sz w:val="{round(pt * 2)}"/><w:szCs w:val="{round(pt * 2)}"/>' if pt else ''
    s += f'<w:bdr w:val="single" w:sz="6" w:space="0" w:color="{hx(bdr)}"/>' if bdr else ''
    s += f'<w:shd w:val="clear" w:color="auto" w:fill="{hx(shd)}"/>' if shd else ''
    s += '<w:vertAlign w:val="superscript"/>' if sup else ''
    return f'<w:rPr>{s}</w:rPr>' if s else ''


def r(teks, **k):
    return f'<w:r>{rpr(**k)}<w:t xml:space="preserve">{esc(teks)}</w:t></w:r>' if teks else ''


TAB, HAL_BARU = '<w:r><w:tab/></w:r>', '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'


def bidang_buka(kode, k=None):
    rp = rpr(**(k or {}))
    return (f'<w:r>{rp}<w:fldChar w:fldCharType="begin"/></w:r><w:r>{rp}<w:instrText xml:space="preserve"> {esc(kode)} '
            f'</w:instrText></w:r><w:r>{rp}<w:fldChar w:fldCharType="separate"/></w:r>')


def bidang_tutup(k=None):
    return f'<w:r>{rpr(**(k or {}))}<w:fldChar w:fldCharType="end"/></w:r>'


def bidang(kode, hasil, k=None):
    return bidang_buka(kode, k) + hasil + bidang_tutup(k)


def garis(sz_pt, tok, space=0):
    return round(sz_pt * 8), tok, space


def ppr(gaya=None, jc=None, keep=False, keeplines=False, sebelum=None, sesudah=None, baris=None, exact=None, kiri=None,
        kanan=None, gantung=None, tabs=(), shd=None, bdr=None, numpr=None, outline=None, sect='', hal_baru=False):
    s = f'<w:pStyle w:val="{gaya}"/>' if gaya else ''
    s += '<w:keepNext/>' if keep else ''
    s += '<w:keepLines/>' if keeplines else ''
    s += '<w:pageBreakBefore/>' if hal_baru else ''
    if numpr:
        s += f'<w:numPr><w:ilvl w:val="{numpr[0]}"/><w:numId w:val="{numpr[1]}"/></w:numPr>'
    if bdr:
        s += '<w:pBdr>' + ''.join(f'<w:{sisi} w:val="single" w:sz="{v[0]}" w:space="{v[2]}" w:color="{hx(v[1])}"/>'
                                  for sisi, v in bdr.items()) + '</w:pBdr>'
    s += f'<w:shd w:val="clear" w:color="auto" w:fill="{hx(shd)}"/>' if shd else ''
    if tabs:
        s += '<w:tabs>' + ''.join(f'<w:tab w:val="{v}" w:pos="{pos}"' + (f' w:leader="{ld}"' if ld else '') + '/>'
                                  for v, pos, ld in tabs) + '</w:tabs>'
    sp = (f' w:before="{tw_pt(sebelum)}"' if sebelum is not None else '') + (
        f' w:after="{tw_pt(sesudah)}"' if sesudah is not None else '')
    if exact is not None:
        sp += f' w:line="{tw_pt(exact)}" w:lineRule="exact"'
    elif baris is not None:
        sp += f' w:line="{round(baris * 240)}" w:lineRule="auto"'
    s += f'<w:spacing{sp}/>' if sp else ''
    ind = (f' w:left="{kiri}"' if kiri is not None else '') + (f' w:right="{kanan}"' if kanan is not None else '') + (
        f' w:hanging="{gantung}"' if gantung else '')
    s += f'<w:ind{ind}/>' if ind else ''
    s += f'<w:jc w:val="{jc}"/>' if jc else ''
    s += f'<w:outlineLvl w:val="{outline}"/>' if outline is not None else ''
    s += sect
    return f'<w:pPr>{s}</w:pPr>' if s else ''


def p(isi='', **k):
    return f'<w:p>{ppr(**k)}{isi}</w:p>'


def bdr_xml(tag, bdr):
    if bdr is None:
        return ''
    out = ''
    for sisi in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        if sisi in bdr:
            v = bdr[sisi]
            out += (f'<w:{sisi} w:val="nil"/>' if v is None else
                    f'<w:{sisi} w:val="single" w:sz="{v[0]}" w:space="0" w:color="{hx(v[1])}"/>')
    return f'<w:{tag}>{out}</w:{tag}>'


TANPA = {s: None for s in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV')}


def tc(isi, w, shd=None, bdr=None, span=1, valign=None, mar=None):
    if ('<w:p>' not in isi and '<w:p ' not in isi) or isi.rstrip().endswith('</w:tbl>'):
        isi += '<w:p/>'
    s = f'<w:tcW w:w="{w}" w:type="dxa"/>' + (f'<w:gridSpan w:val="{span}"/>' if span > 1 else '')
    s += bdr_xml('tcBorders', bdr)
    s += f'<w:shd w:val="clear" w:color="auto" w:fill="{hx(shd)}"/>' if shd else ''
    if mar:
        s += '<w:tcMar>' + ''.join(f'<w:{k} w:w="{v}" w:type="dxa"/>' for k, v in zip(('top', 'left', 'bottom', 'right'), mar)) + '</w:tcMar>'
    s += f'<w:vAlign w:val="{valign}"/>' if valign else ''
    return f'<w:tc><w:tcPr>{s}</w:tcPr>{isi}</w:tc>'


def tr(sel, kepala=False, utuh=True):
    s = ('<w:cantSplit/>' if utuh else '') + ('<w:tblHeader/>' if kepala else '')
    return f'<w:tr>{"<w:trPr>" + s + "</w:trPr>" if s else ""}{"".join(sel)}</w:tr>'


def tahan(xml):
    """keepNext di tiap paragraf xml: baris tabel ini ikut pindah halaman bersama baris sesudahnya (PEDOMAN B4)."""
    xml = re.sub(r'<w:p>(?!<w:pPr>)', '<w:p><w:pPr></w:pPr>', xml.replace('<w:p/>', '<w:p></w:p>'))
    xml = re.sub(r'(<w:pPr><w:pStyle w:val="[^"]*"/>)(?!<w:keepNext/>)', r'\1<w:keepNext/>', xml)
    return re.sub(r'<w:pPr>(?!<w:pStyle|<w:keepNext/>)', '<w:pPr><w:keepNext/>', xml)


def tahan_ekor(rows, n=T['objek']['tabel_sisa_baris_min']):
    """rows = [kepala] + baris isi: n baris terakhir tak terpisah, tabel sampai n + 1 baris isi ditahan utuh."""
    if len(rows) <= n + 2:
        return [tahan(x) for x in rows[:-1]] + rows[-1:]
    return rows[:-n] + [tahan(x) for x in rows[-n:-1]] + rows[-1:]


def tbl(baris, lebar, bdr=None, mar=None, jc=None, caption=None):
    """caption: w:tblCaption ('skenario', 'kartu-angka'), penanda kotak majemuk bagi gerbang QA (qa/README.md)."""
    m = mar or (SEL['atas'], SEL['kiri'], SEL['bawah'], SEL['kanan'])
    pr = (f'<w:tblW w:w="{sum(lebar)}" w:type="dxa"/>' + (f'<w:jc w:val="{jc}"/>' if jc else '') + bdr_xml('tblBorders', bdr or TANPA)
          + '<w:tblLayout w:type="fixed"/><w:tblCellMar>' + ''.join(
              f'<w:{k} w:w="{v}" w:type="dxa"/>' for k, v in zip(('top', 'left', 'bottom', 'right'), m)) + '</w:tblCellMar>'
          + '<w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/>'
          + (f'<w:tblCaption w:val="{caption}"/>' if caption else ''))
    grid = ''.join(f'<w:gridCol w:w="{w}"/>' for w in lebar)
    return f'<w:tbl><w:tblPr>{pr}</w:tblPr><w:tblGrid>{grid}</w:tblGrid>{"".join(baris)}</w:tbl>'


def roman(n):
    out = ''
    for v, s in ((1000, 'm'), (900, 'cm'), (500, 'd'), (400, 'cd'), (100, 'c'), (90, 'xc'), (50, 'l'), (40, 'xl'),
                 (10, 'x'), (9, 'ix'), (5, 'v'), (4, 'iv'), (1, 'i')):
        while n >= v:
            out, n = out + s, n - v
    return out


@functools.lru_cache(maxsize=4)
def _huruf(tebal):
    from PIL import ImageFont
    return ImageFont.truetype(str(Path(T['font']['berkas']['bold' if tebal else 'regular']).expanduser()), 200)


def lebar_teks(s, pt, tebal=False, spasi=0):
    """Lebar teks Roboto dalam pt (metrik glif dari TTF tema.json)."""
    return _huruf(tebal).getlength(s) * pt / 200 + spasi * len(s)


def bagi_lebar(bobot, total=LEBAR):
    s = sum(bobot)
    w = [round(total * b / s) for b in bobot]
    w[-1] += total - sum(w)
    return w


# ---------------------------------------------------------------- bagian paket: gaya, tema, huruf, penomoran

def gaya_xml():
    isi, sp = TY['isi'], T['spasi_pt']
    gj, gd = DX['gantung_judul_cm'], DX['gantung_daftar_cm']

    def rp(nama, **u):
        return rpr(**gaya(nama, **u))

    def st(sid, nama, pp='', rr='', jenis='paragraph', dasar='Normal', lanjut=None, ekstra=''):
        b = f'<w:basedOn w:val="{dasar}"/>' if dasar else ''
        n = f'<w:next w:val="{lanjut}"/>' if lanjut else ''
        return (f'<w:style w:type="{jenis}" w:customStyle="{0 if nama.islower() or nama == "Normal" else 1}" '
                f'w:styleId="{sid}"><w:name w:val="{nama}"/>{b}{n}{ekstra}<w:qFormat/>{pp}{rr}</w:style>')

    kanan = ('right', LEBAR, 'dot')
    toc = lambda lv, kiri, g: ppr(sesudah=3, baris=1.0, kiri=tw_cm(kiri + g), gantung=tw_cm(g),
                                   tabs=[('left', tw_cm(kiri + g), None), kanan])
    baris_tabel = DX['spasi_baris_tabel']
    s = [
        f'<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Roboto" w:hAnsi="Roboto" w:eastAsia="Roboto" w:cs="Roboto"/>'
        f'<w:color w:val="{hx(isi["warna"])}"/><w:sz w:val="{round(isi["ukuran_pt"] * 2)}"/><w:szCs w:val="{round(isi["ukuran_pt"] * 2)}"/>'
        f'<w:lang w:val="id-ID" w:eastAsia="id-ID" w:bidi="ar-SA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr>'
        f'<w:spacing w:after="{tw_pt(isi["sesudah_pt"])}" w:line="{round(isi["spasi_baris"] * 240)}" w:lineRule="auto"/>'
        f'</w:pPr></w:pPrDefault></w:docDefaults>',
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>',
        '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/>'
        '<w:uiPriority w:val="1"/><w:semiHidden/></w:style>',
        '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:semiHidden/><w:tblPr>'
        '<w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/>'
        '<w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>',
        '<w:style w:type="numbering" w:default="1" w:styleId="NoList"><w:name w:val="No List"/><w:semiHidden/></w:style>',
        st('Isi', 'Isi', ppr(jc='both')),
        # paragraf temuan: run pertama Bold navy (kalimat pembuka) ditulis naskah; gaya ini penanda bagi gerbang D-26
        st('IsiTemuan', 'Isi Temuan', dasar='Isi', lanjut='IsiTemuan'),
        st('Heading1', 'heading 1', ppr(keep=True, keeplines=True, sebelum=0, sesudah=6, baris=1.0, outline=0),
           rp('judul_bab'), lanjut='Pertanyaan'),
        st('Heading2', 'heading 2', ppr(keep=True, keeplines=True, sebelum=sp['sebelum_subbab'], sesudah=6, baris=1.0,
                                        kiri=tw_cm(gj['subbab']), gantung=tw_cm(gj['subbab']),
                                        tabs=[('left', tw_cm(gj['subbab']), None)], outline=1), rp('subbab'), lanjut='Isi'),
        st('Heading3', 'heading 3', ppr(keep=True, keeplines=True, sebelum=sp['sebelum_subsubbab'], sesudah=6, baris=1.0,
                                        kiri=tw_cm(gj['subsubbab']), gantung=tw_cm(gj['subsubbab']),
                                        tabs=[('left', tw_cm(gj['subsubbab']), None)], outline=2), rp('subsubbab'), lanjut='Isi'),
        st('Heading4', 'heading 4', ppr(keep=True, sebelum=6, sesudah=3, outline=3), rp('tingkat4'), lanjut='Isi'),
        st('Pertanyaan', 'Pertanyaan Bab', ppr(sesudah=12), rp('pertanyaan_bab'), lanjut='Isi'),
        st('JudulDepan', 'Judul Bagian Depan', ppr(keep=True, sesudah=18, baris=1.0, outline=0), rp('judul_bagian_depan')),
        st('JudulDaftarIsi', 'Judul Daftar Isi', ppr(keep=True, sesudah=18, baris=1.0), rp('judul_bagian_depan')),
        st('JudulLampiran', 'Judul Lampiran', ppr(keep=True, sesudah=18, baris=1.0, outline=0), rp('judul_bagian_depan')),
        # judul halaman pembatas lampiran: tingkat 1 (masuk Daftar Isi, mengakhiri Daftar Pustaka bagi gerbang D-19)
        st('JudulPembatas', 'Judul Pembatas Lampiran', ppr(keep=True, sesudah=18, baris=1.0, outline=0),
           rp('judul_sampul', warna=T['kotak']['pembatas-lampiran']['warna_judul'])),
        st('Caption', 'caption', ppr(jc='center', keep=True, sebelum=TY['keterangan']['sebelum_pt'], sesudah=4, baris=1.0),
           rpr(pt=TY['keterangan']['ukuran_pt'], warna=TY['keterangan']['warna_judul'])),
        st('Sumber', 'Sumber', ppr(sesudah=TY['sumber']['sesudah_pt'], sebelum=3, baris=1.0, jc='left'),
           rpr(pt=TY['sumber']['ukuran_pt'], warna=TY['sumber']['warna'])),
        st('IsiTabel', 'Isi Tabel', ppr(sebelum=0, sesudah=0, baris=baris_tabel), rp('isi_tabel')),
        st('KepalaTabel', 'Kepala Tabel', ppr(jc='center', sebelum=0, sesudah=0, baris=baris_tabel), rp('kepala_tabel'),
           dasar='IsiTabel'),
        st('DaftarTabel', 'Daftar Tabel Isi', ppr(sesudah=1), dasar='IsiTabel'),
        st('IsiKotak', 'Isi Kotak', ppr(sesudah=3, baris=isi['spasi_baris']), rp('isi_kotak')),
        st('JudulKotak', 'Judul Kotak', ppr(keep=True, sesudah=4, baris=1.0), rp('judul_kotak'), dasar='IsiKotak'),
        st('DaftarKotak', 'Daftar Kotak', ppr(sesudah=2), dasar='IsiKotak'),
        st('Daftar', 'Daftar Butir', ppr(sesudah=DX['daftar']['sesudah_pt'], jc='both')),
        st('LabelBagian', 'Label Bagian', ppr(keep=True, sebelum=9, sesudah=3, baris=1.0), rp('label_bagian')),
        st('TOC1', 'toc 1', toc(1, 0, gd['toc1']), rp('toc1')),
        st('TOC2', 'toc 2', toc(2, T['spasi_pt']['inden_toc2_mm'] / 10, gd['toc2']), rp('toc2')),
        st('TOC3', 'toc 3', toc(3, T['spasi_pt']['inden_toc3_mm'] / 10, gd['toc3']), rp('toc3')),
        st('TableofFigures', 'table of figures', ppr(sesudah=3, baris=1.0, kiri=tw_cm(gd['objek']), gantung=tw_cm(gd['objek']),
                                                   tabs=[kanan]), rp('daftar_objek')),
        st('FootnoteText', 'footnote text', ppr(sesudah=0, baris=1.0), rp('catatan_kaki')),
        st('FootnoteReference', 'footnote reference', rr=rpr(sup=True), jenis='character', dasar='DefaultParagraphFont'),
        st('Header', 'header', ppr(sesudah=0, baris=1.0), rpr(pt=TY['header']['ukuran_pt'], warna=TY['header']['warna'])),
        st('Footer', 'footer', ppr(sesudah=0, baris=1.0), rpr(pt=TY['footer']['ukuran_pt'], warna=TY['footer']['warna'])),
        st('Pustaka', 'Pustaka', ppr(sesudah=6, kiri=tw_cm(sp['inden_gantung_pustaka_cm']),
                                     gantung=tw_cm(sp['inden_gantung_pustaka_cm'])), rp('pustaka')),
        st('Jarak', 'Jarak Objek', ppr(sebelum=0, sesudah=0, exact=6)),
        # sama dengan dasarnya, hanya tidak dipenggal: judul sampul (paragraf tanpa gaya = Normal ikut dipenggal) dan chip lembaga
        st('Sampul', 'Sampul'),
        st('Chip', 'Chip Lembaga', dasar='IsiKotak'),
    ]
    # PEDOMAN B2, Buku Pegangan L67: semua gaya berbahasa id-ID; pemenggalan otomatis hanya untuk teks mengalir rata kiri-kanan
    # (Isi, Isi Temuan, Daftar, kotak, pustaka); judul, keterangan, tabel, daftar isi, kepala, dan kaki tidak dipenggal.
    lang = '<w:lang w:val="id-ID" w:eastAsia="id-ID" w:bidi="ar-SA"/>'
    tanpa_penggal = ('Heading1', 'Heading2', 'Heading3', 'Heading4', 'Pertanyaan', 'JudulDepan', 'JudulDaftarIsi', 'JudulLampiran',
                     'JudulPembatas', 'Caption', 'Sumber', 'IsiTabel', 'KepalaTabel', 'DaftarTabel', 'JudulKotak', 'LabelBagian', 'TOC1',
                     'TOC2', 'TOC3', 'TableofFigures', 'Header', 'Footer', 'Jarak', 'Sampul', 'Chip')
    out = []
    for x in s:
        m = re.match(r'<w:style w:type="(paragraph|character)"[^>]*w:styleId="([^"]+)"', x)
        if m:
            if m[2] in tanpa_penggal and m[1] == 'paragraph':  # urutan skema CT_PPrBase: sesudah tabs, sebelum spacing/ind/jc
                if '<w:pPr>' not in x:
                    x = x.replace('<w:qFormat/>', '<w:qFormat/><w:pPr><w:suppressAutoHyphens/></w:pPr>', 1)
                else:
                    blok_ppr = re.search(r"<w:pPr>.*?</w:pPr>", x)[0]
                    i = min([blok_ppr.find(t) for t in ('<w:spacing', '<w:ind', '<w:jc', '<w:outlineLvl') if t in blok_ppr]
                            or [len(blok_ppr) - len('</w:pPr>')])
                    x = x.replace(blok_ppr, blok_ppr[:i] + '<w:suppressAutoHyphens/>' + blok_ppr[i:], 1)
            x = (x.replace('</w:rPr></w:style>', lang + '</w:rPr></w:style>') if '</w:rPr></w:style>' in x
                 else x.replace('</w:style>', f'<w:rPr>{lang}</w:rPr></w:style>'))
        out.append(x)
    return f'<w:styles {NS}>{"".join(out)}</w:styles>'


NUM_BAB = 900  # numId Heading 1 bab n = NUM_BAB + n (lvlOverride startOverride n: nomor tampil = meta bab naskah)


def penomoran_xml(n_nomor, bab=()):
    """Butir, daftar bernomor, dan label bab: Heading 1 bernomor 'BAB %1' (PEDOMAN B4: nomor bab dari penomoran
    otomatis, tidak diketik). Labelnya bergaya label_bab tema dan berdiri sebaris sendiri di atas judul."""
    d = DX['daftar']
    lb = TY['label_bab']
    teks_bab = lb['pola'].replace('{n}', '%1')
    bab_xml = (f'<w:abstractNum w:abstractNumId="3"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/>'
               f'<w:numFmt w:val="decimal"/><w:lvlText w:val="{teks_bab}"/><w:lvlJc w:val="left"/><w:suff w:val="nothing"/>'
               f'<w:pPr><w:ind w:left="0" w:firstLine="0"/></w:pPr><w:rPr><w:rFonts w:ascii="Roboto" w:hAnsi="Roboto" w:cs="Roboto"/>'
               + rpr(**gaya('label_bab'))[7:-8] + '</w:rPr></w:lvl></w:abstractNum>')
    bab_num = ''.join(f'<w:num w:numId="{NUM_BAB + b}"><w:abstractNumId w:val="3"/><w:lvlOverride w:ilvl="0">'
                      f'<w:startOverride w:val="{b}"/></w:lvlOverride></w:num>' for b in bab)
    ind = lambda lv: (f'<w:pPr><w:ind w:left="{tw_cm((lv + 1) * d["inden_mm"] / 10)}" '
                      f'w:hanging="{tw_cm(d["gantung_mm"] / 10)}"/></w:pPr><w:rPr><w:rFonts w:ascii="Roboto" w:hAnsi="Roboto" w:cs="Roboto"/></w:rPr>')

    def lvl(i, fmt, teks):
        return (f'<w:lvl w:ilvl="{i}"><w:start w:val="1"/><w:numFmt w:val="{fmt}"/><w:lvlText w:val="{teks}"/>'
                f'<w:lvlJc w:val="left"/>{ind(i)}</w:lvl>')
    butir = T['font']['butir_1']
    absn = (f'<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>{lvl(0, "bullet", butir)}'
            f'{lvl(1, "lowerLetter", "%2.")}</w:abstractNum>'
            f'<w:abstractNum w:abstractNumId="2"><w:multiLevelType w:val="hybridMultilevel"/>{lvl(0, "decimal", "%1.")}'
            f'{lvl(1, "lowerLetter", "%2.")}</w:abstractNum>')
    nums = '<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num>' + ''.join(
        f'<w:num w:numId="{i}"><w:abstractNumId w:val="2"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/>'
        f'</w:lvlOverride></w:num>' for i in range(2, n_nomor + 2))
    return f'<w:numbering {NS}>{absn}{bab_xml}{nums}{bab_num}</w:numbering>'


SETELAN = (f'<w:settings {NS}><w:zoom w:percent="100"/><w:defaultTabStop w:val="709"/>'
           '<w:autoHyphenation w:val="true"/><w:consecutiveHyphenLimit w:val="2"/><w:hyphenationZone w:val="357"/>'
           '<w:characterSpacingControl w:val="doNotCompress"/><w:updateFields w:val="true"/>'
           '<w:footnotePr><w:numRestart w:val="eachSect"/><w:footnote w:id="-1"/><w:footnote w:id="0"/></w:footnotePr>'
           '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>'
           '</w:compat><w:themeFontLang w:val="id-ID"/><w:decimalSymbol w:val=","/><w:listSeparator w:val=";"/></w:settings>')
# slot warna tema Word -> token tema.json; docx.tema_word di tema.json menimpa slot bila diisi
SLOT_WARNA = {'dk1': 'teks', 'lt1': 'kertas', 'dk2': 'navy', 'lt2': 'tint.netral.muda', 'accent1': 'navy', 'accent2': 'oranye',
              'accent3': 'biru', 'accent4': 'biru-abu', 'accent5': 'slate', 'accent6': 'teks-2', 'hlink': 'navy', 'folHlink': 'teks-2'}


def skema_warna():
    slot = {**SLOT_WARNA, **DX.get('tema_word', {})}
    return '<a:clrScheme name="BNPB">' + ''.join(f'<a:{k}><a:srgbClr val="{hx(v)}"/></a:{k}>' for k, v in slot.items()) + '</a:clrScheme>'


HURUF = (f'<w:fonts {NS}><w:font w:name="Roboto"><w:charset w:val="00"/><w:family w:val="auto"/>'
         '<w:pitch w:val="variable"/></w:font></w:fonts>')


# ---------------------------------------------------------------- naskah

URUT_BAGIAN = {'kata-pengantar': 0, 'ringkasan-eksekutif': 1}


def _kunci_urut(path):
    meta = dict(re.findall(r'^(bab|lampiran|bagian):\s*(\S+)', path.read_text(encoding='utf-8').split('\n---', 1)[0], re.M))
    if 'bagian' in meta:
        return (0, URUT_BAGIAN.get(meta['bagian'], 9), '')
    if 'bab' in meta:
        return (1, int(meta['bab']), '')
    return (2, 0, meta.get('lampiran', ''))


def muat_dokumen(folder):
    """Baca semua naskah dalam urutan dokumen (urutan kutipan pertama APA ikut urutan ini) lalu beri nomor."""
    k = N.Konteks()
    berkas = sorted(Path(folder).glob('*.md'), key=_kunci_urut)
    if not berkas:
        raise SystemExit(f'tidak ada naskah *.md di {folder}')
    semua = [N.baca(f, k) for f in berkas]
    label = N.nomori(semua)
    kajian = {n['meta']['kajian'] for n in semua}
    if len(kajian) != 1:
        raise SystemExit(f'naskah bercampur kajian: {sorted(kajian)}')
    return {'naskah': semua, 'label': label, 'konteks': k, 'kajian': kajian.pop()}


# ---------------------------------------------------------------- perakit

class Perakit:
    def __init__(self, dok, halaman=None, n_hal=None, hal_baru=frozenset()):
        """halaman, n_hal: label halaman penanda dan jumlah halaman lintasan sebelumnya. hal_baru: id objek yang
        keterangannya dipaksa mulai halaman baru (kartu yang terbelah dari keterangan atau Sumber-nya di lintasan lalu)."""
        self.dok, self.k, self.kajian = dok, dok['konteks'], dok['kajian']
        self.halaman, self.n_hal, self.hal_baru = halaman or {}, n_hal, hal_baru
        self.d = Document()
        self.bm_id, self.docpr, self.kaki_id, self.n_toc = 0, 0, 0, 0
        self.kaki, self.toc, self.lamp, self.foto = [], [], [], []
        self.objek = {'Tabel': [], 'Gambar': []}
        self.n_nomor, self.ikon_perlu, self.peringatan = 0, {}, []
        self.ref = {rid: f'_Ref{i:04d}' for i, rid in enumerate(sorted(dok['label']))}
        self.rek = {b['id']: b for n in dok['naskah'] for b in N._jelajah(n['blok'])
                    if b['jenis'] == 'direktif' and b['nama'] == 'rek'}
        self.naskah = None
        self.bm_depan = self.bm_isi = None
        self.kj = T['kajian'][self.kajian]
        self.final = any(n['meta'].get('status') == 'final' for n in dok['naskah'])
        self.bab = sorted(int(n['meta']['bab']) for n in dok['naskah'] if 'bab' in n['meta'])
        self.kartu = []  # (id, penanda keterangan, kepala kartu, baris Sumber): ketiganya harus satu halaman
        self.turunan = []  # angka yang dihitung pembangun (subtotal grup): masuk manifest sebagai turunan:
        self.ekor = []  # (penanda baris ke-4 dari akhir, penanda baris terakhir) tiap tabel: uji.py memeriksa satu halaman
        self.peran = []  # (penanda, objek, {hex: {peran}}): bahan manifest halaman (PEDOMAN B1.8, gerbang D-24)
        self.log_qa = []  # penanda pemeriksaan yang tidak tercetak (T7 Kata Pengantar), ditulis ke keluaran/qa/log-<nama>.md

    def galat(self, pesan):
        """Cacat yang boleh ada di draf (dilaporkan) tetapi menolak build bila ada naskah berstatus final."""
        if self.final:
            raise SystemExit(f'naskah final: {pesan}')
        self.peringatan.append(pesan)

    def wajib_ada(self, path, apa):
        """True bila berkas ada; bila tidak, galat (draf memakai pengganti, final ditolak)."""
        if Path(path).exists():
            return True
        self.galat(f'{apa} {Path(path).relative_to(AKAR) if Path(path).is_relative_to(AKAR) else path} belum ada; dipakai pengganti')
        return False

    def catat_peran(self, objek, peran):
        """peran: [(token atau #hex, peran)]. Kembalikan nama penanda; pemanggil memasangnya di paragraf pertama objek."""
        nama = f'_Obj{len(self.peran) + 1:04d}'
        hx_ = {}
        for tok, v in peran:
            hx_.setdefault((tok if tok.startswith('#') else warna(T, tok)).upper(), set()).add(v)
        self.peran.append((nama, objek, hx_))
        return nama

    # -- penanda, ikon, gambar
    def tanda(self, nama, isi):
        if not nama:
            return isi
        self.bm_id += 1
        return f'<w:bookmarkStart w:id="{self.bm_id}" w:name="{nama}"/>{isi}<w:bookmarkEnd w:id="{self.bm_id}"/>'

    def bm_baru(self):
        self.n_toc += 1
        return f'_Toc{self.n_toc:05d}'

    def inline(self, part, path, cx, cy, crop='', turun_pt=0):
        rid, _ = part.get_or_add_image(str(path))
        self.docpr += 1
        i = self.docpr
        pos = f'<w:rPr><w:position w:val="{-round(turun_pt * 2)}"/></w:rPr>' if turun_pt else ''
        return (f'<w:r>{pos}<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="{cx}" cy="{cy}"/>'
                f'<wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="{i}" name="Gambar {i}"/>'
                f'<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>'
                f'<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>'
                f'<pic:nvPicPr><pic:cNvPr id="{i}" name="{esc(Path(path).name)}"/><pic:cNvPicPr/></pic:nvPicPr>'
                f'<pic:blipFill><a:blip r:embed="{rid}"/>{crop}<a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
                f'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect">'
                f'<a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>')

    def jangkar(self, path, x, y, cx, cy, crop='', part=None):
        """Gambar mengapung di belakang teks, posisi dari tepi halaman (EMU). Latar halaman dipasang di kepala halaman
        seksinya (latar_kepala), bukan di badan: latar bukan gambar isi dan tidak butuh keterangan."""
        rid, _ = (part or self.d.part).get_or_add_image(str(path))
        self.docpr += 1
        i = self.docpr
        return (f'<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="{i}" '
                f'behindDoc="1" locked="1" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/>'
                f'<wp:positionH relativeFrom="page"><wp:posOffset>{x}</wp:posOffset></wp:positionH>'
                f'<wp:positionV relativeFrom="page"><wp:posOffset>{y}</wp:posOffset></wp:positionV>'
                f'<wp:extent cx="{cx}" cy="{cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/>'
                f'<wp:docPr id="{i}" name="Latar {i}"/><wp:cNvGraphicFramePr/>'
                f'<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic>'
                f'<pic:nvPicPr><pic:cNvPr id="{i}" name="{esc(Path(path).name)}"/><pic:cNvPicPr/></pic:nvPicPr>'
                f'<pic:blipFill><a:blip r:embed="{rid}"/>{crop}<a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
                f'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm><a:prstGeom prst="rect">'
                f'<a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>')

    def ikon(self, konsep, glif_tok, lingkaran_tok, mm, part=None):
        glif = T['ikon'][konsep]
        warna_g, warna_l = warna(T, glif_tok), (warna(T, lingkaran_tok) if lingkaran_tok else None)
        nama = re.sub(r'[^a-z0-9-]', '-', f'{konsep}-{glif}') + f'-{warna_g[1:]}-{(warna_l or "#none")[1:]}.png'
        berkas = IKON_DIR / nama
        # semua ikon dirender ulang tiap build (render_ikon), jadi glif yang berubah tidak pernah tertahan cache
        self.ikon_perlu[str(berkas)] = {'glif': glif, 'warna': warna_g, 'lingkaran': warna_l, 'px': DX['ikon_px'],
                                        'rasio': sum(T['objek']['ikon_rasio_lingkaran']) / 2, 'berkas': str(berkas)}
        if not berkas.exists():
            return ''
        e = emu_cm(mm / 10)
        # ikon sebaris teks diturunkan agar pusatnya sejajar huruf kapital (tinggi kapital Roboto kira-kira 0,71 em)
        turun = max(0.0, (mm * 72 / 25.4 - TY['isi']['ukuran_pt'] * 0.71) / 2) if mm < T['objek']['lingkaran_ikon_kartu_mm'] else 0
        return self.inline(part or self.d.part, berkas, e, e, turun_pt=round(turun, 1))

    def png_polos(self, tok):
        """PNG satu warna token (latar navy, garis aksen)."""
        from PIL import Image
        f = KERJA / 'polos' / f'{hx(tok)}.png'
        if not f.exists():
            f.parent.mkdir(parents=True, exist_ok=True)
            Image.new('RGB', (8, 8), warna(T, tok)).save(f)
        return f

    def pengganti(self, rel, rasio, teks):
        """PNG pengganti untuk visual yang belum dirender: tanpa-data berarsir, jalur tertulis."""
        from PIL import Image, ImageDraw, ImageFont
        f = KERJA / 'pengganti' / (hashlib.sha1(f'{rel}{rasio}{teks}'.encode()).hexdigest()[:12] + '.png')
        if not f.exists():
            f.parent.mkdir(parents=True, exist_ok=True)
            w, h = 1600, round(1600 / rasio)
            im = Image.new('RGB', (w, h), warna(T, 'tanpa-data'))
            dr = ImageDraw.Draw(im)
            for x in range(-h, w, 28):
                dr.line([(x, h), (x + h, 0)], fill=warna(T, 'arsir-tanpa-data'), width=2)
            fn = ImageFont.truetype(str(Path(T['font']['berkas']['bold']).expanduser()), 40)
            fs = ImageFont.truetype(str(Path(T['font']['berkas']['regular']).expanduser()), 30)
            for i, (s, ft) in enumerate(((teks, fn), (rel, fs))):
                bb = dr.textbbox((0, 0), s, font=ft)
                x0, y0 = (w - bb[2]) / 2, h / 2 - 50 + i * 64
                dr.rectangle([x0 - 16, y0 - 8, x0 + bb[2] + 16, y0 + bb[3] + 12], fill=warna(T, 'kertas'))
                dr.text((x0, y0), s, font=ft, fill=warna(T, 'teks-3'))
            im.save(f)
        return f

    def cek_manifest_gambar(self, path, a, lebar_cm):
        """Manifest render bangun/visual (<berkas>.json di samping PNG): huruf terkecil pada ukuran cetak >= batas bawah
        (PEDOMAN B2, Buku Pegangan L43). Kembalikan [(hex, peran)] dari manifest untuk manifest halaman (D-24)."""
        m = Path(path).with_suffix('.json')
        if not m.exists():
            if a['jenis'] != 'foto':
                self.galat(f'{a["berkas"]}: manifest render {m.name} tidak ada; ukuran huruf di gambar tidak bisa diperiksa')
            return []
        man = json.loads(m.read_text(encoding='utf-8'))
        desain = man['ukuran_cm'][0]
        svg = Path(path).with_suffix('.svg')  # font-size SVG bangun/visual dalam pt pada lebar desain
        ukuran = [float(x) for x in re.findall(r'font-size="([\d.]+)"', svg.read_text(encoding='utf-8'))] if svg.exists() else []
        teks_min = man.get('teks_min_pt') or (min(ukuran) if ukuran else None)
        if teks_min is None:
            return [(h, x) for h, ps in man.get('hex', {}).items() for x in ps]
        pt = teks_min * lebar_cm / desain
        if pt < TY['batas_bawah_pt'] - 0.05:
            raise SystemExit(f'{a["berkas"]}: huruf terkecil {teks_min:g} pt pada lebar desain {desain:g} cm menjadi '
                             f'{pt:.1f} pt bila dipasang {lebar_cm:g} cm (< {TY["batas_bawah_pt"]:g} pt); render ulang spek dengan '
                             f'ukuran "{a.get("lebar", "penuh")}", jangan mengecilkan PNG lebar lain')
        return [(h, x) for h, ps in man.get('hex', {}).items() for x in ps]

    # -- run dari naskah
    def runs(self, rs, **dasar):
        out = []
        for x in rs:
            k = dict(dasar)
            if x.get('tebal'):
                k.update(b=True, warna=dasar.get('warna_tebal', TY['penekanan']['warna']))
            if x.get('miring'):
                k['i'] = True
            k.pop('warna_tebal', None)
            if x['j'] == 'catatan':
                out.append(self.catatan(x['label']))
            elif x['j'] == 'rujuk':
                out.append(self.rujuk(x, k))
            else:
                out.append(r(x['s'], **k))
        return ''.join(out)

    def catatan(self, label):
        isi = next(c['isi'] for c in self.naskah['catatan_kaki'] if c['label'] == label)
        self.kaki_id += 1
        self.kaki.append(f'<w:footnote w:id="{self.kaki_id}"><w:p>{ppr(gaya="FootnoteText")}<w:r><w:rPr>'
                         f'<w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteRef/></w:r>{r(" ")}{self.runs(isi)}</w:p></w:footnote>')
        return f'<w:r><w:rPr><w:rStyle w:val="FootnoteReference"/></w:rPr><w:footnoteReference w:id="{self.kaki_id}"/></w:r>'

    def rujuk(self, x, k):
        rid, lab = x['id'], x['s']
        pref = ''
        if rid.startswith(('bab:', 'sub:')):
            pref, lab = lab.split(' ', 1)
            pref += ' '
        if rid.startswith('bab:'):
            # tautan ke judul bab, tanpa bidang REF: LibreOffice mengabaikan \t pada REF \n (tercetak "Bab BAB 2"); nomornya
            # sama dengan penomoran Heading 1 karena startOverride = meta bab
            return f'<w:hyperlink w:anchor="{self.ref[rid]}" w:history="1">{r(pref + lab, **k)}</w:hyperlink>'
        return r(pref, **k) + bidang(f'REF {self.ref[rid]} \\h \\* CHARFORMAT', r(lab, **k), k)

    # -- pil
    def pil(self, teks, isi=None, garis_tok=None, teks_tok='teks', kapital=False, tanda=None):
        """Pil sebaris: spasi di dalamnya tak terputus (SPASI_PIL), jadi pil tidak pernah terbelah dua baris. Tanpa
        w:spacing: LibreOffice menggambar garis putih di tiap batas run bershading atau bergaris yang berspasi huruf
        (diuji 23 Okt 2026, varian per kata dan per huruf sama cacatnya), jadi tipografi_docx.pil.spasi_huruf_pt tidak
        dipakai di DOCX. Label keyakinan tetap satu run utuh, sesuai gerbang D-14."""
        g = TY['pil']
        k = dict(pt=g['ukuran_pt'], b=True, warna=teks_tok, shd=isi, bdr=garis_tok)
        teks = (teks.upper() if kapital else teks).replace(' ', SPASI_PIL)
        if tanda:
            return r(TEPI_PIL, **k) + self.tanda(tanda, r(teks, **k)) + r(TEPI_PIL, **k)
        return r(TEPI_PIL + teks + TEPI_PIL, **k)

    def pil_kode(self, spek, teks, kapital=False):
        return self.pil(teks, spek.get('pil_isi'), spek.get('pil_garis'), spek.get('pil_teks', 'teks'), kapital)

    def pil_keyakinan(self, v):
        bag = [x.strip() for x in v.split(';')]
        if bag[0] not in KOS['keyakinan']:
            return ''
        s = KOS['keyakinan'][bag[0]]
        return self.pil_kode(s, ', '.join([s['label']] + bag[1:]))

    # -- blok umum
    def blok(self, bs, ruang='isi'):
        """ruang: isi (badan), kotak (di dalam panel), tabel (di dalam sel)."""
        g_par, g_daf = {'isi': ('Isi', 'Daftar'), 'kotak': ('IsiKotak', 'DaftarKotak'), 'tabel': ('IsiTabel', 'DaftarTabel')}[ruang]
        out = []
        for b in bs:
            j = b['jenis']
            if j == 'judul':
                out += self.judul(b)
            elif j == 'paragraf':
                lab = r(b['label'] + ': ', b=True, warna='teks' if ruang != 'isi' else TY['penekanan']['warna']) if b['label'] else ''
                # paragraf isi yang dibuka kalimat tebal = paragraf temuan (PEDOMAN B2 "Isi Temuan", gerbang D-26)
                temuan = ruang == 'isi' and not lab and bool(b['isi']) and bool(b['isi'][0].get('tebal'))
                out.append(p(lab + self.runs(b['isi']), gaya='IsiTemuan' if temuan else g_par))
            elif j == 'daftar':
                out += self.daftar(b, g_daf)
            elif j == 'tabel':
                out += self.tabel_data(b, {})
            elif j == 'halaman-baru':
                out.append(HAL_BARU)
            elif j == 'direktif':
                out += self.direktif(b)
        return out

    def daftar(self, b, g, lv=0, num=None):
        if num is None:
            if b.get('nomor'):
                self.n_nomor += 1
                num = self.n_nomor + 1
            else:
                num = 1
        out = []
        for x in b['butir']:
            out.append(p(self.runs(x['isi']), gaya=g, numpr=(lv, num)))
            if 'anak' in x:
                out += self.daftar(x['anak'], g, 1, num)
        return out

    def judul(self, b):
        t, meta = b['tingkat'], self.naskah['meta']
        if t == 1:
            if 'bab' in meta:
                return self.judul_bab(b)
            if 'lampiran' in meta:
                return self.judul_lampiran(meta['lampiran'], b['teks'], self.ref.get(b['id']))
            return self.judul_depan(b['teks'])
        if t == 4:
            return [p(r(b['teks']), gaya='Heading4')]
        nomor = b.get('nomor') if ('bab' in meta or 'lampiran' in meta) else None
        bm = self.bm_baru()
        isi = (self.tanda(self.ref.get(b['id']), r(nomor)) + TAB if nomor else '') + r(b['teks'])
        self.toc.append((t, nomor, b['teks'], bm))
        return [p(self.tanda(bm, isi), gaya=f'Heading{t}')]

    def judul_bab(self, b):
        """Label "BAB n" dari penomoran Heading 1 (penomoran_xml), bukan teks ketikan: Word yang memperbarui bidang
        menyusun entri Daftar Isi "BAB n<tab>JUDUL" sendiri. Judul dibuka w:br setinggi label, sehingga label berdiri
        sebaris sendiri di atasnya; TOC tanpa \\x mengganti baris baru dengan spasi."""
        no, teks = self.naskah['meta']['bab'], b['teks'].upper() if TY['judul_bab']['kapital'] else b['teks']
        a = T['garis_pt']['aksen_label_bab']
        aksen = p('', bdr={'top': garis(a['tebal_pt'], a['warna'])}, sebelum=0, sesudah=DX['aksen_bab_sesudah_pt'], exact=3,
                  kanan=LEBAR - tw_cm(a['lebar_mm'] / 10))
        bm = self.bm_baru()
        if self.bm_isi is None:
            self.bm_isi = bm
        self.toc.append((1, TY['label_bab']['pola'].format(n=no), teks, bm))
        pt = round(TY['label_bab']['ukuran_pt'] * 2)
        putus = f'<w:r><w:rPr><w:sz w:val="{pt}"/><w:szCs w:val="{pt}"/></w:rPr><w:br/></w:r>'
        return [aksen, p(self.tanda(bm, putus + self.tanda(self.ref.get(b['id']), r(teks))), gaya='Heading1',
                         numpr=(0, NUM_BAB + int(no))),
                p(r(self.naskah['meta']['pertanyaan']), gaya='Pertanyaan')]

    def judul_depan(self, teks, toc=True):
        teks = teks.upper() if TY['judul_bagian_depan']['kapital'] else teks
        if not toc:
            bm = self.bm_baru()
            return [p(self.tanda(bm, r(teks)), gaya='JudulDaftarIsi')], bm
        bm = self.bm_baru()
        self.toc.append((1, None, teks, bm))
        return [p(self.tanda(bm, r(teks)), gaya='JudulDepan')]

    def judul_lampiran(self, kode, teks, ref=None):
        bm = self.bm_baru()
        nama = f'Lampiran {kode}'
        self.toc.append((1, None, f'{nama}. {teks}', bm))
        self.lamp.append((f'{nama}. {teks}', bm))
        return [p(self.tanda(bm, self.tanda(ref, r(nama)) + r(f'. {teks}')), gaya='JudulLampiran')]

    # -- keterangan, sumber
    def keterangan(self, d, judul_runs):
        kata, nomor = N.NOMOR.get(d['nama'], 'Tabel'), d['nomor']
        pref, seq = nomor.rsplit('.', 1)
        kl = {'b': True, 'warna': TY['keterangan']['warna_label']}
        kode = f'SEQ {kata} \\* ARABIC' + (' \\r 1' if seq == '1' else '')
        depan, _, belakang = TY['keterangan']['pola'].partition('{judul}')
        bag = re.split(r'(\{label\}|\{nomor\})', depan)
        idx = [i for i, x in enumerate(bag) if x in ('{label}', '{nomor}')]
        # awalan bab dari penomoran Heading 1 (PEDOMAN B4): STYLEREF \n nomor paragraf, \t hanya angkanya. \s yang dipakai
        # Word untuk keterangan berbab dibaca LibreOffice 26.2 sebagai teks judul, jadi \n \t (sama di Word dan LibreOffice).
        # RE dan kode lampiran tetap teks.
        awalan = (bidang('STYLEREF 1 \\n \\t', r(pref, **kl), kl) if pref.isdigit() else r(pref, **kl)) + r('.', **kl)
        xml = []
        for i, x in enumerate(bag):
            s = (r(kata, **kl) if x == '{label}' else
                 awalan + bidang(kode, r(seq, **kl), kl) if x == '{nomor}' else r(x, **kl))
            xml.append(s)
        a, z = idx[0], idx[-1] + 1
        lab = ''.join(xml[:a]) + self.tanda(self.ref.get(d['id']), ''.join(xml[a:z])) + ''.join(xml[z:])
        bm = self.bm_baru()
        isi = self.tanda(bm, lab + self.runs(judul_runs) + r(belakang))
        judul = N.polos(judul_runs)
        self.objek[kata].append((f'{kata} {nomor}', judul, bm))
        if not re.search(r'\d{4}', judul):  # Buku Pegangan L38, gerbang D-31
            self.galat(f'{self.naskah["nama"]}: keterangan {kata} {nomor} "{judul}" tanpa tahun atau periode')
        return p(isi, gaya='Caption', hal_baru=d.get('id') in self.hal_baru)

    def wajib_keyakinan(self, d, tb=None):
        """PEDOMAN C6.2: tiap tabel dan kartu skenario berlabel keyakinan, di baris Sumber (atribut keyakinan) atau di kolom
        KEYAKINAN tabelnya. Kartu yang kolomnya berisi "-" semua tetap butuh atribut."""
        if d['atribut'].get('keyakinan'):
            return
        if tb and 'keyakinan' in tb.get('kunci', []):
            c = tb['kunci'].index('keyakinan')
            if any(N.polos(row[c]).split(';')[0].strip() in KOS['keyakinan'] for row in tb['baris']):
                return
        raise SystemExit(f'{self.naskah["nama"]}:{d.get("baris", "?")}: {d["nama"]} {d.get("nomor", "")} tanpa label keyakinan; '
                         'tambahkan atribut keyakinan (PEDOMAN C6.2)')

    def baris_sumber(self, d, teks_sumber=None, dalam_tint=False, tanda=None):
        a, t = d['atribut'], d['teks']
        s = TY['sumber']
        k = {'pt': s['ukuran_pt'], 'warna': s['warna_dalam_tint'] if dalam_tint else s['warna']}
        bag = re.split(r'(\{sumber\}|\{data_per\})', s['pola'])
        if 'data_per' not in t:
            i = bag.index('{data_per}')
            bag = bag[:i - 1] + bag[i + 1:]
        xml = ''
        for i, x in enumerate(bag):
            if x == '{sumber}':
                xml += teks_sumber if teks_sumber is not None else self.runs(t.get('sumber', []), **k)
            elif x == '{data_per}':
                xml += self.runs(t['data_per'], **k)
            else:
                xml += r(x, **k, b=(i == 0))
        if a.get('keyakinan'):
            xml += r(' ', **k) + self.pil_keyakinan(a['keyakinan'])
        out = [p(self.tanda(tanda, xml), gaya='Sumber', sesudah=None if 'catatan' not in t else 2)]
        if 'catatan' in t:
            out.append(p(r('Catatan: ', b=True, **k) + self.runs(t['catatan'], **k), gaya='Sumber'))
        return out

    # -- tabel data
    def lebar_kolom(self, kepala, baris, kanan, pil=()):
        """Lebar kolom dari ukuran glif Roboto sebenarnya (PIL). Minimum: kata kepala terpanjang, kata isi terpanjang, angka
        dan pil utuh (tidak pernah patah). Sisa lebar diberikan rakus ke kolom yang paling murah membuat satu sel lagi
        muat sebaris, supaya baris tabel serendah mungkin; sisanya dibagi sebanding kebutuhan."""
        pad = SEL['kiri'] + SEL['kanan'] + 30
        kp, ip, pp = TY['kepala_tabel'], TY['isi_tabel']['ukuran_pt'], TY['pil']['ukuran_pt']
        tw = lambda s, pt, tebal=False, spasi=0: lebar_teks(s, pt, tebal, spasi) * 20 + pad
        mn, alami = [], []
        for c, h in enumerate(kepala):
            sel = [N.polos(row[c]) for row in baris]
            if c in pil:
                sel = [KOS['keyakinan'].get(x.split(';')[0].strip(), {}).get('label', x) for x in sel]
                al = [tw(TEPI_PIL + x + TEPI_PIL, pp, True) + 60 for x in sel]  # + garis pil kiri-kanan dan pembulatan
            else:
                al = [tw(x, ip) for x in sel]
            kata = [tw(w, ip) for x in sel for w in x.split()[:40]]
            m = max([tw(w, kp['ukuran_pt'], True, kp['spasi_huruf_pt']) for w in h.split()] + (al if c in kanan or c in pil else kata) + [pad])
            mn.append(min(m, LEBAR * 0.3))  # kata sangat panjang (URL) boleh patah
            alami.append(sorted(al))
        if sum(mn) >= LEBAR:
            return bagi_lebar([m * LEBAR / sum(mn) for m in mn])
        w, sisa = list(mn), LEBAR - sum(mn)
        while True:
            terbaik = None
            for c in range(len(w)):
                lebih = [x for x in alami[c] if x > w[c]]
                if lebih and lebih[0] - w[c] <= sisa:
                    skor = lebih.count(lebih[0]) / (lebih[0] - w[c] + 1)
                    if terbaik is None or skor > terbaik[0]:
                        terbaik = (skor, c, lebih[0] - w[c])
            if terbaik is None:
                break
            w[terbaik[1]] += terbaik[2]
            sisa -= terbaik[2]
        butuh = [max(0, max(alami[c], default=0) - w[c]) for c in range(len(w))]
        bagi = butuh if sum(butuh) else w
        return bagi_lebar([x + sisa * b_ / sum(bagi) for x, b_ in zip(w, bagi)])

    def p_legenda(self, kunci, tambahan=()):
        """Paragraf legenda 8 pt dari kunci LEGENDA yang dipakai (urutan pertama muncul) dan potongan xml tambahan."""
        k = {'pt': TY['batas_bawah_pt'], 'warna': 'teks-2'}
        bag = [r(TEPI_PIL * 2, shd='tint.sorot-baris.pita', **k) + r(' ' + LEGENDA[x], **k) if x == 'sorot' else r(LEGENDA[x], **k)
               for x in dict.fromkeys(kunci)] + list(tambahan)
        return p(r(LABEL['legenda'] + ': ', b=True, **k) + r('; ', **k).join(bag), gaya='IsiTabel', sebelum=2) if bag else ''

    def baris_legenda(self, kunci, lebar, tambahan=()):
        """Baris terakhir tabel (PEDOMAN B5.7, L48): sel digabung selebar tabel, tanpa isi warna, 8 pt."""
        x = self.p_legenda(kunci, tambahan)
        return tr([tc(x, sum(lebar), span=len(lebar), bdr={'bottom': None})]) if x else None

    def _kelompok(self, tb, a):
        """Atribut grup (mis. "PULAU; PROVINSI"): kolom itu dilepas dari tabel dan menjadi baris grup berjenjang, dengan
        subtotal per grup berisi lebih dari satu baris bila tabel berjumlah (PEDOMAN B5.7, B5.8)."""
        grup = [N._norm(x) for x in a.get('grup', '').split(';') if x.strip()]
        for g in grup:
            if g not in tb['kunci']:
                raise SystemExit(f'{self.naskah["nama"]}: grup "{g}" bukan kolom tabel ({", ".join(tb["kunci"])})')
        return [tb['kunci'].index(g) for g in grup]

    def tabel_data(self, tb, a, lampiran=False, kode_pil=(), legenda=(), legenda_ke=None, mar=None):
        """legenda_ke: daftar penampung kunci legenda (tabel di dalam kartu: legenda satu baris di kaki kartu).
        mar: margin sel (SEL_KARTU untuk tabel di dalam kartu)."""
        gi = self._kelompok(tb, a)
        simpan = [c for c in range(len(tb['kepala'])) if c not in gi]
        kepala, rata = [tb['kepala'][c] for c in simpan], [tb['rata'][c] for c in simpan]
        kode_pil = {simpan.index(c) for c in kode_pil if c in simpan}
        for x in filter(None, (s.strip() for s in a.get('angka', '').split(';'))):
            rata[simpan.index(int(x) - 1)] = 'kanan'
        peringkat, sorot = a.get('peringkat') == 'ya', {s.strip() for s in a.get('sorot', '').split(';') if s.strip()}
        kunci_grup = [tuple(N.polos(row[c]) for c in gi) for row in tb['baris']]
        baris = [[row[c] for c in simpan] for row in tb['baris']]
        if peringkat:
            kepala, rata = [LABEL['no']] + kepala, ['tengah'] + rata
            baris = [[[{'j': 'peringkat', 's': str(i + 1)}]] + row for i, row in enumerate(baris)]
            kode_pil = {c + 1 for c in kode_pil}
        kanan = {i for i, x in enumerate(rata) if x == 'kanan'}
        lebar = self.lebar_kolom(kepala, baris, kanan, kode_pil)
        garis_b = garis(T['garis_pt']['baris_tabel']['tebal_pt'], T['garis_pt']['baris_tabel']['warna'])
        if lampiran:
            gk = T['garis_pt']['kepala_tabel_lampiran']
            kep = tr([tc(p(r(h, **gaya('kepala_tabel_lampiran')), gaya='KepalaTabel'), w,
                         bdr={'bottom': garis(gk['tebal_pt'], gk['warna'])}, valign='bottom') for h, w in zip(kepala, lebar)], kepala=True)
        else:
            kep = tr([tc(p(r(h), gaya='KepalaTabel'), w, shd=TY['kepala_tabel']['warna_isi'], valign='center')
                      for h, w in zip(kepala, lebar)], kepala=True)
        jc = {'kanan': 'right', 'tengah': 'center', 'kiri': 'left'}
        n_lab = max(1, next((i for i, x in enumerate(rata) if x == 'kanan'), len(rata)))  # kolom label di depan angka pertama
        pakai = list(legenda)

        def baris_jumlah(label, nilai, isi_tok, teks_tok):
            sel = [tc(p(r(label, b=True, warna=teks_tok), gaya='IsiTabel'), sum(lebar[:n_lab]), shd=isi_tok, span=n_lab)]
            sel += [tc(p(r(v, b=True, warna=teks_tok), gaya='IsiTabel', jc=jc[rata[c]]), lebar[c], shd=isi_tok)
                    for c, v in enumerate(nilai) if c >= n_lab]
            return tr(sel)

        def subtotal(label, idx):
            nilai = []
            for c in range(len(kepala)):
                sel = [N.polos(baris[i][c]) for i in idx]
                v = [self._angka(s) for s in sel]
                if c < n_lab or c not in kanan or any(x is None for x in v):
                    nilai.append('')
                    continue
                dec = max((len(s.split(',')[1]) if ',' in s else 0) for s in sel)
                s = N.fmt_id(sum(v), dec)
                self.turunan.append({'kunci': f'turunan:subtotal:{label}:{kepala[c]}', 'tampil': s, 'nilai': sum(v),
                                     'sumber': f'jumlah {len(idx)} baris {label} kolom {kepala[c]}', 'dari': []})
                nilai.append(s)
            return baris_jumlah(f'{LABEL["subtotal"]} {label}', nilai, 'tint.netral.pita', 'teks')

        rows, isi_rows, buka = [], [], [None] * len(gi)
        anggota = [[] for _ in gi]
        for i, row in enumerate(baris):
            for lv in range(len(gi)):
                if kunci_grup[i][lv] != buka[lv]:
                    for lv2 in range(len(gi) - 1, lv - 1, -1):  # tutup grup yang selesai, dalam ke luar
                        if tb.get('total') and len(anggota[lv2]) > 1:
                            isi_rows.append(subtotal(buka[lv2], anggota[lv2]))
                        anggota[lv2], buka[lv2] = [], None
                    for lv2 in range(lv, len(gi)):
                        buka[lv2] = kunci_grup[i][lv2]
                        isi_rows.append(tahan(tr([tc(p(r(buka[lv2], b=True), gaya='IsiTabel', kiri=tw_cm(0.3 * lv2)), sum(lebar),
                                                     span=len(lebar), shd='tint.netral.pita')])))  # baris grup ikut baris sesudahnya
                    break
            for lv in range(len(gi)):
                anggota[lv].append(i)
            teks0 = {N.polos(c) for c in row}
            shd = 'tint.sorot-baris.pita' if teks0 & sorot else None
            pakai += ['sorot'] if shd else []
            sel = []
            for c, (isi, w) in enumerate(zip(row, lebar)):
                if isi and isi[0]['j'] == 'peringkat':
                    x = self.pil(isi[0]['s'], isi='navy', teks_tok='kertas')
                    pakai.append('peringkat')
                elif c in kode_pil and N.polos(isi).split(';')[0].strip() in KOS['keyakinan']:
                    x = self.pil_keyakinan(N.polos(isi))
                    pakai.append('keyakinan')
                else:
                    x = self.runs(isi)
                sel.append(tc(p(x, gaya='IsiTabel', jc=jc[rata[c]]), w, shd=shd))
            isi_rows.append(tr(sel))
        for lv2 in range(len(gi) - 1, -1, -1):
            if tb.get('total') and len(anggota[lv2]) > 1:
                isi_rows.append(subtotal(buka[lv2], anggota[lv2]))
        if tb.get('total'):
            total = [v for c, v in enumerate(tb['total']) if c in simpan]
            isi_rows.append(baris_jumlah(LABEL['jumlah'], ([''] if peringkat else []) + total, 'navy', 'kertas'))
        if legenda_ke is not None:
            legenda_ke += pakai
        leg = self.baris_legenda(pakai, lebar) if legenda_ke is None else None
        rows = tahan_ekor([kep] + self.tandai_ekor(isi_rows)) + ([leg] if leg else [])
        if leg:  # legenda ikut baris terakhir isi
            rows[-2] = tahan(rows[-2])
        m = mar or SEL
        return [tbl(rows, lebar, bdr={'insideH': garis_b, 'bottom': garis_b}, mar=(m['atas'], m['kiri'], m['bawah'], m['kanan']))]

    def tandai_ekor(self, rows):
        """Penanda di baris isi ke-n dari akhir dan baris terakhir (n = objek.tabel_sisa_baris_min): bila keduanya satu
        halaman, sisa tabel lanjutan >= n baris (PEDOMAN B4). Dibaca uji.py dari PDF."""
        if not rows:
            return rows
        a, z = f'_Ekor{len(self.ekor) + 1:03d}a', f'_Ekor{len(self.ekor) + 1:03d}z'
        self.ekor.append((a, z))
        rows = list(rows)
        i = max(0, len(rows) - T['objek']['tabel_sisa_baris_min'])
        for j, nama in ((i, a), (len(rows) - 1, z)):
            m = re.search(r'<w:p>(<w:pPr>.*?</w:pPr>)?', rows[j])
            rows[j] = rows[j][:m.end()] + self.tanda(nama, '') + rows[j][m.end():]
        return rows

    @staticmethod
    def _angka(s):
        s = s.strip()
        return float(s.replace('.', '').replace(',', '.')) if re.fullmatch(r'-?\d{1,3}(\.\d{3})*(,\d+)?', s) else None

    # -- direktif
    def direktif(self, d):
        f = getattr(self, 'd_' + d['nama'].replace('-', '_'))
        return f(d)

    def kotak(self, isi, latar, garis_kiri, rapat=True, inset_tb=None):
        m = tw_cm(T['objek']['inset_panel_mm'] / 10)
        mt = m if inset_tb is None else inset_tb
        sel = tc(isi, LEBAR, shd=latar, bdr={'left': garis(T['garis_pt']['kotak_kiri']['tebal_pt'], garis_kiri),
                                              'top': None, 'right': None, 'bottom': None})
        return [tbl([tr([sel], utuh=rapat)], [LEBAR], mar=(mt, m, mt, m)), p(gaya='Jarak')]

    def panel(self, pita_xml, isi_baris, lebar=None):
        """Panel putih bergaris dengan pita kepala bertint (B5.6). isi_baris: daftar baris <w:tr>."""
        g = garis(T['garis_pt']['panel']['tebal_pt'], T['garis_pt']['panel']['warna'])
        lebar = lebar or [LEBAR]
        pita = tr([tc(pita_xml, sum(lebar), shd='tint.netral.pita', span=len(lebar), valign='center')], kepala=False)
        m = tw_cm(T['objek']['inset_panel_mm'] / 10)
        return [tbl([pita] + isi_baris, lebar, bdr={'top': g, 'left': g, 'bottom': g, 'right': g}, mar=(SEL['atas'] * 2, m, SEL['atas'] * 2, m)),
                p(gaya='Jarak')]

    def kepala_pita(self, konsep, judul_xml, kanan_xml='', lebar=LEBAR):
        m = tw_cm(T['objek']['inset_panel_mm'] / 10)
        ik = self.ikon(konsep, 'kertas', 'navy', DX['ikon_mm']['pita'])
        return p(ik + r(' ') + judul_xml + (TAB + kanan_xml if kanan_xml else ''), gaya='JudulKotak', sesudah=0,
                 tabs=[('right', lebar - 2 * m, None)] if kanan_xml else ())

    def d_gambar(self, d):
        a, t = d['atribut'], d['teks']
        lebar_cm = T['objek']['lebar_cm'][a.get('lebar', 'penuh')]
        path = AKAR / a['berkas']
        peran = []
        if self.wajib_ada(path, f'{self.naskah["nama"]}:{d["baris"]}: gambar'):
            from PIL import Image
            with Image.open(path) as im:
                w, h = im.size
            peran = self.cek_manifest_gambar(path, a, lebar_cm)
        else:
            w, h = 1600, 900 if a['jenis'] != 'peta' else 1000
            path = self.pengganti(a['berkas'], w / h, 'Belum dirender')
        cx = emu_cm(lebar_cm)
        cy = round(cx * h / w)
        if cy > emu_cm(DX['tinggi_gambar_maks_cm']):  # lebar objek tetap salah satu lebar kolom (B3), tidak disusutkan diam-diam
            raise SystemExit(f'{self.naskah["nama"]}:{d["baris"]}: {a["berkas"]} setinggi {cy / 360000:.1f} cm pada lebar {lebar_cm} cm '
                             f'> docx.tinggi_gambar_maks_cm {DX["tinggi_gambar_maks_cm"]}; render ulang dengan tinggi lebih kecil')
        obj = self.catat_peran(f'Gambar {d["nomor"]}', peran)
        out = [self.keterangan(d, t['judul']),
               p(self.tanda(obj, self.inline(self.d.part, path, cx, cy)), jc='center', keep=True, sesudah=0, baris=1.0)]
        if a['jenis'] == 'foto':
            k = {'pt': TY['sumber']['ukuran_pt'], 'warna': TY['sumber']['warna']}
            src = r(f'Wikimedia Commons, {a["pengarang"]}, {a["lisensi"]}', **k)
            self.foto.append((N.polos(t['judul']), a['pengarang'], a['lisensi'], a['url'], a.get('potong', ENDASH)))
            out += self.baris_sumber(d, teks_sumber=src)
        else:
            out += self.baris_sumber(d)
        for b in d['isi']:
            if b['jenis'] == 'paragraf':
                k = {'pt': TY['sumber']['ukuran_pt'], 'warna': TY['sumber']['warna']}
                out.append(p(r('Catatan: ', b=True, **k) + self.runs(b['isi'], **k), gaya='Sumber'))
        return out

    def d_tabel(self, d):
        tb = next(b for b in d['isi'] if b['jenis'] == 'tabel')
        lampiran = 'lampiran' in self.naskah['meta']
        kode = {i for i, h in enumerate(tb['kunci']) if h == 'keyakinan'}
        self.wajib_keyakinan(d, tb)
        return [self.keterangan(d, d['teks']['judul'])] + self.tabel_data(tb, d['atribut'], lampiran, kode) + self.baris_sumber(d)

    def d_kartu_angka(self, d):
        a = d['atribut']
        tb = next(b for b in d['isi'] if b['jenis'] == 'tabel')
        n = len(tb['baris'])
        per = n if n <= 4 else (3 if n in (5, 6, 9) else 4)
        m = tw_cm(T['objek']['inset_panel_mm'] / 10)
        dalam = LEBAR - 2 * m
        sela = tw_cm(DX['kartu_sela_mm'] / 10)
        wk = (dalam - sela * (per - 1)) // per
        lebar = []
        for i in range(per):
            lebar += [wk] + ([sela] if i < per - 1 else [])
        lebar[-1] += dalam - sum(lebar)
        g = garis(T['garis_pt']['panel']['tebal_pt'], T['kotak']['kartu-angka']['warna_garis'])
        tint_dari = {'navy': 'netral', 'oranye': 'api', 'biru': 'basah', 'merah': 'bahaya', 'emas-teks': 'kering'}
        baris_xml, peran = [], []
        for mulai in range(0, n, per):
            sel = []
            for i in range(per):
                if mulai + i < n:
                    nil, sat, lab, ik, w = tb['baris'][mulai + i]
                    wt = N.polos(w) or 'navy'
                    kel = wt.split('.')[1] if wt.startswith('kategori.') else None
                    tint = T['warna']['kategori'][kel]['tint'] if kel else tint_dari.get(wt, 'netral')
                    # warna nilai bermakna keluarga (oranye = api, biru = basah), navy = identitas (PEDOMAN B1.8)
                    peran += [(wt, 'identitas' if tint == 'netral' else 'bahaya' if tint == 'bahaya' else 'kategori'),
                              (f'tint.{tint}.pita', 'tint')]
                    isi = (p(self.ikon(N.polos(ik), wt, f'tint.{tint}.pita', T['objek']['lingkaran_ikon_kartu_mm']), gaya='IsiKotak', sesudah=2)
                           + p(self.runs(nil, **gaya('nilai_kartu', warna=wt)) + r(' ') + self.runs(sat, **gaya('label_kartu', warna='teks-2')),
                               gaya='IsiKotak', sesudah=0, baris=1.0)
                           + p(self.runs(lab, **gaya('label_kartu')), gaya='IsiKotak', sesudah=0, baris=1.0))
                    sel.append(tc(isi, wk, shd=T['kotak']['kartu-angka']['warna_latar_kartu'], bdr={'top': g, 'left': g, 'bottom': g, 'right': g}))
                else:
                    sel.append(tc(p(gaya='IsiKotak'), wk))
                if i < per - 1:
                    sel.append(tc(p(gaya='IsiKotak'), sela, mar=(0, 0, 0, 0)))
            baris_xml.append(tr(sel))
            if mulai + per < n:
                baris_xml.append(tr([tc(p(gaya='Jarak'), dalam, span=len(lebar))]))
        nada = KOS['nada_pil'][a.get('nada', 'data')]
        kartu = tbl(baris_xml, lebar, mar=(m // 2, m, m // 2, m))
        obj = self.catat_peran('kartu angka', peran)
        isi = (p(self.tanda(obj, self.pil_kode(nada, a['pil'], kapital=True)), gaya='IsiKotak', sesudah=6) + kartu
               + ''.join(self.baris_sumber(d, dalam_tint=True)))
        sel = tc(isi, LEBAR, shd=T['kotak']['kartu-angka']['warna_latar_grup'])
        return [tbl([tr([sel])], [LEBAR], mar=(m, m, m // 2, m), caption='kartu-angka'), p(gaya='Jarak')]

    def _kotak_berjudul(self, d, nama, judul_xml=''):
        k = T['kotak'][nama]
        isi = (p(judul_xml, gaya='JudulKotak') if judul_xml else '') + ''.join(self.blok(d['isi'], 'kotak'))
        return self.kotak(isi, k['warna_latar'], k['warna_garis_kiri'])

    def d_temuan(self, d):
        m = tw_cm(T['objek']['inset_panel_mm'] / 10)
        sif = KOS['sifat_temuan'][d['atribut']['sifat']]
        k = T['kotak']['temuan']
        judul = p(self.runs(d['teks']['judul'], b=True, warna='teks') + TAB + self.pil(sif, garis_tok='slate', kapital=True),
                  gaya='JudulKotak', tabs=[('right', LEBAR - 2 * m - tw_pt(3), None)])
        return self.kotak(judul + ''.join(self.blok(d['isi'], 'kotak')), k['warna_latar'], k['warna_garis_kiri'])

    def d_keputusan(self, d):
        return self._kotak_berjudul(d, 'keputusan', self.runs(d['teks']['judul'], b=True, warna='teks') if 'judul' in d['teks'] else '')

    def d_koreksi(self, d):
        return self._kotak_berjudul(d, 'koreksi', r(T['kotak']['koreksi']['label']))

    def d_catatan(self, d):
        return self._kotak_berjudul(d, 'catatan', r(T['kotak']['catatan']['label']))

    def d_ringkasan_bab(self, d):
        pita = self.kepala_pita(T['kotak']['ringkasan-bab']['ikon'], r(T['kotak']['ringkasan-bab']['judul']))
        isi = ''.join(self.blok(d['isi'], 'kotak'))
        return self.panel(pita, [tr([tc(isi, LEBAR)], utuh=False)])

    def baris_label(self, label, isi_xml, lebar):
        return tr([tc(p(r(label), gaya='LabelBagian', sebelum=0, sesudah=0), lebar[0]), tc(isi_xml, lebar[1])])

    def d_program(self, d):
        a, t = d['atribut'], d['teks']
        kanan = ''
        if a.get('status'):
            kanan += self.pil_kode(KOS['status_usulan'][a['status']], KOS['status_usulan'][a['status']]['label'])
        if a.get('jenis') == 'uji-coba':
            kanan += r(' ') + self.pil('Uji coba', garis_tok='teks-3')
        lebar = [tw_cm(DX['label_kolom_kartu_cm']), LEBAR - tw_cm(DX['label_kolom_kartu_cm'])]
        pita = self.kepala_pita(T['kotak']['program']['ikon'], self.runs(t['nama'], b=True, warna='teks'), kanan, LEBAR)
        rows = [self.baris_label(LABEL[x], p(self.runs(t[x]), gaya='IsiKotak', sesudah=0), lebar)
                for x in ('lokasi', 'lembaga', 'periode', 'dampak')]
        rows.append(tr([tc(''.join(self.blok(d['isi'], 'kotak')) + ''.join(self.baris_sumber(d)), LEBAR, span=2)], utuh=False))
        return self.panel(pita, rows, lebar)

    def d_skenario(self, d):
        """Kartu skenario satu halaman (PEDOMAN B5.11) sebagai satu blok: satu tabel luar berbaris tunggal cantSplit
        (w:tblCaption "skenario"), jadi kartu pindah halaman utuh bila tidak muat dan tidak pernah terbelah. Urutan B5.11:
        kepala, dasar, kemungkinan, dan lembaga (peta kecil di sampingnya), kerusakan, angka kebijakan, kepekaan, kemampuan
        respons dan kebutuhan pemulihan. Teks isi kartu bergaya tabel (Isi Tabel, Daftar Tabel Isi), kaki dan legenda di
        dalam kartu, "Sumber:" paragraf pertama sesudahnya."""
        a, t = d['atribut'], d['teks']
        kel = T['warna']['kategori'][d['keluarga']]
        anak = {b['nama']: b for b in d['isi'] if b['jenis'] == 'direktif'}
        m = tw_cm(T['objek']['inset_panel_mm'] / 10)
        tb_rusak = next((b for b in anak['kerusakan']['isi'] if b['jenis'] == 'tabel'), None) if 'kerusakan' in anak else None
        self.wajib_keyakinan(d, tb_rusak)
        n = len(self.kartu) + 1
        awal, akhir = f'_Kartu{n:03d}a', f'_Kartu{n:03d}z'
        obj = self.catat_peran(f'kartu skenario {d["nomor"]}', [(f'kategori.{d["keluarga"]}', 'kategori'),
                                                                (f'tint.{kel["tint"]}.pita', 'tint')])
        legenda = []
        out = [self.keterangan(d, t['judul'])]
        self.kartu.append((d['id'], self.objek['Tabel'][-1][2], awal, akhir))
        ik = self.ikon(a['jenis'], 'kertas', f'kategori.{d["keluarga"]}', DX['ikon_mm']['pita'])
        kepala = p(self.tanda(awal, self.tanda(obj, ik + r(' ') + r(KOS['jenis_bencana'][a['jenis']], b=True)
                                               + r(f'  {kel["label"]}', warna='teks-2'))), gaya='JudulKotak', sesudah=0)
        blok = [tbl([tr([tc(kepala, LEBAR, shd=f'tint.{kel["tint"]}.pita', mar=(SEL['atas'], m, SEL['atas'], m))])], [LEBAR])]
        # lebar peta kecil = docx.lebar_peta_kartu (kunci objek.lebar_cm); sela kolom = penuh - 2 x dua-kolom (B3: 4 mm)
        peta = d['varian'] == 'a' and a.get('peta')
        kunci_peta = DX.get('lebar_peta_kartu', 'tiga-kolom')
        lb = tw_cm(T['objek']['lebar_cm'][kunci_peta])
        sela = LEBAR - 2 * tw_cm(T['objek']['lebar_cm']['dua-kolom'])
        wi = LEBAR - lb - sela if peta else LEBAR
        lebar = [tw_cm(DX['label_kolom_kartu_cm']), wi - tw_cm(DX['label_kolom_kartu_cm'])]
        rows = [self.baris_label(LABEL['dasar'], p(self.runs(t['dasar']), gaya='IsiTabel', sesudah=0), lebar)]
        if d['varian'] == 'a':
            kk = a['kemungkinan']
            if kk in KOS['kemungkinan_5_tahun']:
                pita = r(' ').join(self.pil(v, isi='navy', teks_tok='kertas') if k_ == kk else self.pil(v, garis_tok='garis')
                                   for k_, v in KOS['kemungkinan_5_tahun'].items())
                isi = p(pita, gaya='IsiTabel', sesudah=0)
                legenda.append('kemungkinan')
            else:
                isi = p(r(kk[:1].upper() + kk[1:]), gaya='IsiTabel', sesudah=0)
            rows.append(self.baris_label(LABEL['kemungkinan'], isi, lebar))
        else:  # b nonalam dan c sosial: kartu analog berangka; c menambah kemungkinan "tidak dinilai" (KERANGKA prinsip 9)
            rows.append(self.baris_label(LABEL['analog'], p(self.runs(t['analog']), gaya='IsiTabel', sesudah=0), lebar))
            if d['varian'] == 'c':
                rows.append(self.baris_label(LABEL['kemungkinan'], p(r(a['kemungkinan'][:1].upper() + a['kemungkinan'][1:]), gaya='IsiTabel', sesudah=0), lebar))
        rows.append(self.baris_label(LABEL['lembaga'], self.chip_lembaga(N.polos(t['lembaga']), sebaris=True), lebar))
        legenda.append('peran')
        g = garis(T['garis_pt']['baris_tabel']['tebal_pt'], T['garis_pt']['baris_tabel']['warna'])
        info = tbl(rows, lebar, bdr={'insideH': g, 'bottom': g}, mar=(SEL_KARTU['atas'], SEL['kiri'], SEL_KARTU['bawah'], SEL['kanan']))
        if peta:
            path = AKAR / a['peta']
            if self.wajib_ada(path, f'{self.naskah["nama"]}:{d["baris"]}: peta skenario'):
                from PIL import Image
                with Image.open(path) as im:
                    w, h = im.size
                self.cek_manifest_gambar(path, {'berkas': a['peta'], 'jenis': 'peta', 'lebar': kunci_peta}, T['objek']['lebar_cm'][kunci_peta])
            else:
                w, h = 1600, 1000
                path = self.pengganti(a['peta'], 1.6, 'Peta jejak skenario belum dirender')
            ex = emu_cm(T['objek']['lebar_cm'][kunci_peta])
            gb = p(self.inline(self.d.part, path, ex, round(ex * h / w)), sesudah=0, baris=1.0)
            info = tbl([tr([tc(info, wi), tc(p(gaya='Jarak'), sela), tc(gb, lb, valign='top')])], [wi, sela, lb], mar=(0, 0, 0, 0))
        blok += [info]
        for nama in ('pemicu', 'mandat'):
            if nama in anak:
                blok += [p(r(LABEL[nama]), gaya='LabelBagian', sebelum=4)] + self.blok(anak[nama]['isi'], 'tabel')
        if tb_rusak:
            kode = {i for i, h in enumerate(tb_rusak['kunci']) if h == 'keyakinan'}
            blok += [p(r(LABEL['kerusakan']), gaya='LabelBagian', sebelum=4)] + self.tabel_data(tb_rusak, {}, kode_pil=kode, legenda_ke=legenda, mar=SEL_KARTU)
        if 'kebijakan' in anak:
            k = T['kotak']['temuan']
            isi = ''.join(self.blok(anak['kebijakan']['isi'], 'tabel'))
            mm = re.search(r'<w:p>(<w:pPr>.*?</w:pPr>)?', isi)  # label sebaris di depan paragraf pertama: hemat satu baris
            isi = isi[:mm.end()] + r(LABEL['kebijakan'] + '   ', **gaya('label_bagian')) + isi[mm.end():]
            blok += [p(gaya='Jarak')] + self.kotak(isi, k['warna_latar'], k['warna_garis_kiri'], inset_tb=m // 2)
        if 'kepekaan' in anak:
            tb = next(b for b in anak['kepekaan']['isi'] if b['jenis'] == 'tabel')
            blok += [p(r(LABEL['kepekaan']), gaya='LabelBagian', sebelum=4)] + self.tabel_data(tb, {}, legenda_ke=legenda, mar=SEL_KARTU)
        kol = [p(r(LABEL[x]), gaya='LabelBagian', sebelum=4) + ''.join(self.blok(anak[x]['isi'], 'tabel'))
               for x in ('respons', 'pemulihan') if x in anak]
        if kol:
            ws = bagi_lebar([1] * len(kol))
            blok += [tbl([tr([tc(x, w_, valign='top') for x, w_ in zip(kol, ws)])], ws, mar=(0, 0, 0, SEL['kanan'] * 2))]
        if 'kaki' in t:  # kaki kartu (B5.11 butir 9) di dalam kartu, supaya "Sumber:" tetap paragraf pertama sesudahnya
            blok.append(p(self.runs(t['kaki'], pt=TY['sumber']['ukuran_pt'], warna='teks-2', i=True), gaya='IsiTabel', sebelum=4))
        blok.append(self.p_legenda(legenda) or p(gaya='Jarak'))
        kartu = tbl([tahan(tr([tc(''.join(blok), LEBAR)]))], [LEBAR], mar=(0, 0, 0, 0), caption='skenario')
        return out + [kartu] + self.baris_sumber(d, tanda=akhir)

    def chip_lembaga(self, teks, pemimpin=True, sebaris=False):
        """Chip lembaga berikon (B5.7): yang pertama pemimpin. sebaris: semua chip dalam satu paragraf (kartu skenario)."""
        bag = [x.strip() for x in teks.split(';') if x.strip()]
        chip = []
        for i, nama in enumerate(bag):
            ik = self.ikon('lembaga', 'navy', 'tint.netral.pita', DX['ikon_mm']['chip'])
            peran = (self.pil(LABEL['pemimpin'], isi='navy', teks_tok='kertas') if i == 0 and pemimpin
                     else self.pil(LABEL['pendukung'], garis_tok='navy')) if pemimpin else ''
            chip.append(ik + r(' ') + r(nama, b=i == 0) + (r(NBSP) + peran if peran else ''))
        if sebaris:
            return p(r('   ').join(chip), gaya='IsiTabel', sesudah=0)
        return ''.join(p(x, gaya='Chip', sesudah=1, baris=1.0) for x in chip)

    def d_garis_waktu(self, d):
        """PEDOMAN B5.12: tiga kolom fase bertint netral dipisah garis 0,75 pt (diagram, bukan tabel data: w:tblCaption
        "garis-waktu"), pita horizon di kaki sebagai legenda tetap."""
        a = d['atribut']
        tb = next(b for b in d['isi'] if b['jenis'] == 'tabel')
        self.wajib_keyakinan(d)
        fase = [f for f in KOS['fase'] if not f.startswith('_')]
        lebar = bagi_lebar([1] * len(fase))
        g = garis(T['garis_pt']['diagram']['tebal_pt'], T['kotak']['garis-waktu']['warna_pemisah'])
        kep = tr([tc(p(self.ikon(f, 'kertas', 'navy', DX['ikon_mm']['pita']) + r(' ') + r(KOS['fase'][f]['label'], b=True),
                       gaya='JudulKotak', sesudah=0), w, shd=T['kotak']['garis-waktu']['warna_pita'], valign='center')
                  for f, w in zip(fase, lebar)], kepala=True)
        kol = []
        for f in fase:
            isi = ''
            for row in tb['baris']:
                if N.polos(row[0]) != f:
                    continue
                rid = next(x['id'] for x in row[2] if x['j'] == 'rujuk')
                rek = self.rek.get(rid)
                no = self.dok['label'].get(rid, '?')
                hz = KOS['horizon'].get(rek['atribut']['waktu'], rek['atribut']['waktu']) if rek else ''
                isi += p(self.pil(no, isi='navy', teks_tok='kertas') + r(' ') + self.runs(row[1]), gaya='IsiKotak', sesudah=0)
                isi += p(self.runs(row[3], **gaya('label_kartu')) + (r(f', {hz}', **gaya('label_kartu')) if hz else ''),
                         gaya='IsiKotak', sesudah=6, kiri=0)
            kol.append(isi)
        badan = tr([tc(x, w) for x, w in zip(kol, lebar)], utuh=False)
        hz = r(LABEL['horizon'] + ': ', b=True, pt=TY['sumber']['ukuran_pt'], warna='teks-2') + r(' ').join(
            self.pil(v, garis_tok='navy') for v in KOS['horizon'].values())
        if a.get('musim'):
            ms = KOS['musim'][a['musim']]
            hz += r('   ') + self.pil(ms['label'], isi=f'tint.{ms["tint"]}.pita')
        kaki = tr([tc(p(hz, gaya='IsiKotak', sesudah=0) + self.p_legenda(['rek']), LEBAR, span=len(fase))])
        tabel = tbl([kep, badan, kaki], lebar, bdr={'insideV': g, 'top': g, 'bottom': g, 'insideH': g}, caption='garis-waktu')
        return [self.keterangan(d, d['teks']['judul']), tabel] + self.baris_sumber(d)

    def d_matriks_rekomendasi(self, d):
        """PEDOMAN B5.13: baris 1 No | LANGKAH (ikon jenis aksi + judul, tanpa pil: D-31 menghitung katanya) | LEMBAGA (chip
        berikon, pil peran) | WAKTU; baris 2 digabung: pil status usulan, rincian, indikator, dasar."""
        self.wajib_keyakinan(d)
        lebar = bagi_lebar([1.1, 7.0, 5.4, 3.0])
        kep_teks = (LABEL['no'], LABEL['langkah'], LABEL['lembaga'], LABEL['waktu'])
        if 'lampiran' in self.naskah['meta']:  # kepala tabel lampiran tanpa isi (D-20), sama dengan tabel_data
            gk = T['garis_pt']['kepala_tabel_lampiran']
            kep = tr([tc(p(r(h, **gaya('kepala_tabel_lampiran')), gaya='KepalaTabel'), w,
                         bdr={'bottom': garis(gk['tebal_pt'], gk['warna'])}, valign='bottom') for h, w in zip(kep_teks, lebar)], kepala=True)
        else:
            kep = tr([tc(p(r(h), gaya='KepalaTabel'), w, shd=TY['kepala_tabel']['warna_isi'], valign='center')
                      for h, w in zip(kep_teks, lebar)], kepala=True)
        g = garis(T['garis_pt']['baris_tabel']['tebal_pt'], T['garis_pt']['baris_tabel']['warna'])
        rows, jenis = [kep], []
        for rek in (b for b in d['isi'] if b['jenis'] == 'direktif'):
            a, t = rek['atribut'], rek['teks']
            st = KOS['status_usulan'][a['status']]
            no = self.pil(rek['nomor'], isi='navy', teks_tok='kertas', tanda=self.ref.get(rek['id']))
            ik = self.ikon(a['jenis'], 'navy', 'tint.netral.pita', DX['ikon_mm']['chip'])
            jenis.append(a['jenis'])
            langkah = p(ik + r(' ') + self.runs(t['langkah'], b=True, warna='teks'), gaya='IsiTabel', keep=True)
            nama = [x.strip() for x in (a['unit'] + ';' + a['kl']).split(';') if x.strip() and x.strip() != ENDASH]
            hz = KOS['horizon'].get(a['waktu'], a['waktu'])
            rows.append(tr([tc(p(no, gaya='IsiTabel', jc='center', keep=True), lebar[0]), tc(langkah, lebar[1]),
                            tc(tahan(self.chip_lembaga('; '.join(nama))), lebar[2]),
                            tc(p(self.pil(hz, garis_tok='navy'), gaya='IsiTabel', keep=True), lebar[3])]))
            rinci = p(self.pil_kode(st, st['label']), gaya='IsiTabel', sesudah=2)
            rinci += ''.join(p(self.runs(b['isi']), gaya='IsiTabel', jc='both', sesudah=2) for b in rek['isi']
                             if b['jenis'] == 'paragraf' and not b['label'])
            meta = (r(LABEL['indikator'] + ': ', b=True) + self.runs(t['indikator'])
                    + r('. ') + r(LABEL['dasar_rek'] + ': ', b=True) + self.runs(t['dasar']))
            for w in ('butuh', 'membuka'):
                if a.get(w):
                    ids = re.findall(r'@(rek:[a-z0-9-]+)', a[w])
                    meta += r(f'. {LABEL[w]} ', b=True) + r(', '.join(self.dok['label'][x] for x in ids))
            rinci += p(meta, gaya='IsiTabel', sesudah=2)
            rinci += ''.join(self.blok([b for b in rek['isi'] if b['jenis'] != 'paragraf' or b['label']], 'tabel'))
            rows.append(tr([tc(rinci, sum(lebar), span=4, bdr={'bottom': g})], utuh=False))
        k = {'pt': TY['batas_bawah_pt'], 'warna': 'teks-2'}
        ikon_jenis = r(LEGENDA['jenis_aksi'] + ' ', **k) + r(', ', **k).join(
            self.ikon(j, 'navy', 'tint.netral.pita', DX['ikon_mm']['chip']) + r(' ' + KOS['jenis_aksi'][j], **k)
            for j in dict.fromkeys(jenis))
        rows[-1] = tahan(rows[-1])
        rows.append(self.baris_legenda(['status'], lebar, [ikon_jenis]))
        return [self.keterangan(d, d['teks']['judul']), tbl(rows, lebar, bdr={'bottom': g})] + self.baris_sumber(d)

    def _matriks_fase(self, d, kolom0, legenda=()):
        self.wajib_keyakinan(d)
        tb = next(b for b in d['isi'] if b['jenis'] == 'tabel')
        lebar = bagi_lebar([3.4, 4.4, 4.4, 4.4])
        g = garis(T['garis_pt']['baris_tabel']['tebal_pt'], T['garis_pt']['baris_tabel']['warna'])
        kep = tr([tc(p(r(h), gaya='KepalaTabel'), w, shd=TY['kepala_tabel']['warna_isi'], valign='center')
                  for h, w in zip(tb['kepala'], lebar)], kepala=True)
        rows, pakai = [kep], list(legenda)
        for row in tb['baris']:
            sel = [tc(kolom0(row[0]), lebar[0])]
            for c, w in zip(row[1:], lebar[1:]):
                s = N.polos(c)
                m = re.match(r'^(pemimpin|pendukung|tidak berlaku):\s*', s)
                if m:
                    peran = m[1]
                    sisa = self._potong_awal(c, m.end())
                    pil = (self.pil(LABEL[peran], isi='navy', teks_tok='kertas') if peran == 'pemimpin' else
                           self.pil(LABEL[peran], garis_tok='navy') if peran == 'pendukung' else
                           self.pil(LABEL[peran], garis_tok='teks-3', teks_tok='teks-3'))
                    isi = p(pil, gaya='IsiTabel', sesudah=2) + p(self.runs(sisa, warna='teks-3' if peran == 'tidak berlaku' else None),
                                                                 gaya='IsiTabel')
                    pakai.append('peran')
                else:
                    isi = p(self.runs(c), gaya='IsiTabel')
                sel.append(tc(isi, w))
            rows.append(tr(sel))
        leg = self.baris_legenda(pakai, lebar)
        rows = tahan_ekor(rows[:1] + self.tandai_ekor(rows[1:])) + ([leg] if leg else [])
        if leg:
            rows[-2] = tahan(rows[-2])
        return [self.keterangan(d, d['teks']['judul']), tbl(rows, lebar, bdr={'insideH': g, 'bottom': g})] + self.baris_sumber(d)

    @staticmethod
    def _potong_awal(runs, n):
        out, i = [], 0
        for x in runs:
            s = x['s']
            if i + len(s) <= n:
                i += len(s)
                continue
            out.append({**x, 's': s[max(0, n - i):]})
            i += len(s)
        return out

    def d_matriks_lembaga(self, d):
        return self._matriks_fase(d, lambda c: self.chip_lembaga(N.polos(c), pemimpin=False))

    def d_matriks_jenis(self, d):
        def jenis(c):
            j = N.polos(c)
            kel = next(k for k, v in T['warna']['kategori'].items() if isinstance(v, dict) and j in v['jenis'])
            ik = self.ikon(j, f'kategori.{kel}', f'tint.{T["warna"]["kategori"][kel]["tint"]}.pita', DX['ikon_mm']['chip'] * 1.3)
            return p(ik + r(' ') + r(KOS['jenis_bencana'][j], b=True), gaya='IsiTabel')
        return self._matriks_fase(d, jenis, ['keluarga'])

    # -- bagian depan dan belakang
    def kepala_kaki(self):
        hdr, self.rid_hdr = self.d.part.add_header_part()
        ftr, self.rid_ftr = self.d.part.add_footer_part()
        hk, self.rid_hdr0 = self.d.part.add_header_part()
        fk, self.rid_ftr0 = self.d.part.add_footer_part()
        hf, ty = T['header_footer'], TY
        kiri = LEBAR - tw_cm(1.2)
        a = T['garis_pt']['aksen_header']
        baris = [hf['header']['baris1'].format(judul_pendek=self.kj['judul_pendek']),
                 hf['header']['baris2'].format(terbit=T['kajian']['terbit'])]
        teks = ''.join(p(r(s, b=(i == 0 and ty['header']['bobot_baris1'] == 'bold'), pt=ty['header']['ukuran_pt'], warna=ty['header']['warna']),
                         gaya='Header', bdr={'left': garis(a['tebal_pt'], a['warna'], 4)}, kiri=tw_pt(5)) for i, s in enumerate(baris))
        tinggi = emu_cm(T['objek']['logo_header_tinggi_mm'] / 10)
        logo = AKAR / hf['header']['logo']
        from PIL import Image
        with Image.open(logo) as im:
            lw, lh = im.size
        logo_x = p(self.inline(hdr, logo, round(tinggi * lw / lh), tinggi), gaya='Header', jc='right')
        gk = T['garis_pt']['header']
        x = tbl([tr([tc(teks, kiri, valign='bottom'), tc(logo_x, LEBAR - kiri, valign='bottom')])], [kiri, LEBAR - kiri],
                bdr={**TANPA, 'bottom': garis(gk['tebal_pt'], gk['warna'])}, mar=(0, 0, tw_pt(3), 0))
        self._isi_part(hdr, x + p(gaya='Header', exact=1))
        gf, k = T['garis_pt']['footer'], {'pt': ty['footer']['ukuran_pt'], 'warna': ty['footer']['warna']}
        alamat = ''.join(p(r(s, **k), gaya='Footer', jc='center') for s in hf['footer']['baris'])
        kn = {'pt': ty['nomor_halaman']['ukuran_pt'], 'b': True, 'warna': ty['nomor_halaman']['warna']}
        nomor = bidang('PAGE', r('1', **kn), kn) + r(DX['akhiran_nomor_halaman'], **k)
        sisi = tw_cm(2.0)
        x = tbl([tr([tc(p(gaya='Footer'), sisi), tc(alamat, LEBAR - 2 * sisi, valign='center'),
                     tc(p(nomor, gaya='Footer', jc='right'), sisi, valign='center')])], [sisi, LEBAR - 2 * sisi, sisi],
                bdr={**TANPA, 'top': garis(gf['tebal_pt'], gf['warna'])}, mar=(tw_pt(3), 0, 0, 0))
        self._isi_part(ftr, x + p(gaya='Footer', exact=1))
        self._isi_part(hk, p(gaya='Header'))
        self._isi_part(fk, p(gaya='Footer'))

    @staticmethod
    def _isi_part(part, xml):
        el = part.element
        for c in list(el):
            el.remove(c)
        for c in parse_xml(f'<w:body {NS}>{xml}</w:body>'):
            el.append(c)

    def sect(self, jenis, nomor=None, margin=None, hdr=None):
        """jenis: sampul (tanpa kepala/kaki, romawi agar seksi sebelum Bab 1 seragam), depan (romawi), isi, polos.
        hdr: kepala halaman khusus (latar halaman gelap dan sampul), bawaan kepala kosong untuk seksi polos."""
        m = dict(T['halaman']['margin_cm'], **(margin or {}))
        polos = jenis in ('polos', 'sampul')
        h, f = (hdr or self.rid_hdr0, self.rid_ftr0) if polos else (self.rid_hdr, self.rid_ftr)
        fmt = 'lowerRoman' if jenis in ('depan', 'sampul') else 'decimal'
        pg = f'<w:pgNumType w:fmt="{fmt}"' + (f' w:start="{nomor}"' if nomor else '') + '/>'
        hl = T['halaman']
        return (f'<w:sectPr><w:headerReference w:type="default" r:id="{h}"/><w:footerReference w:type="default" r:id="{f}"/>'
                f'<w:type w:val="nextPage"/><w:pgSz w:w="{tw_cm(hl["lebar_cm"])}" w:h="{tw_cm(hl["tinggi_cm"])}"/>'
                f'<w:pgMar w:top="{tw_cm(m["atas"])}" w:right="{tw_cm(m["kanan"])}" w:bottom="{tw_cm(m["bawah"])}" '
                f'w:left="{tw_cm(m["kiri"])}" w:header="{tw_cm(hl["header_dari_tepi_cm"])}" w:footer="{tw_cm(hl["footer_dari_tepi_cm"])}" '
                f'w:gutter="0"/>{pg}<w:cols w:space="708"/><w:docGrid w:linePitch="360"/></w:sectPr>')

    def latar_kepala(self, lapis):
        """Kepala halaman baru berisi gambar latar (jangkar di belakang teks, posisi dari tepi halaman). lapis: daftar
        (path, x, y, cx, cy, crop) dalam EMU. Kembalikan rId untuk sect(hdr=...)."""
        part, rid = self.d.part.add_header_part()
        lat = ''.join(self.jangkar(path, x, y, cx, cy, crop, part=part) for path, x, y, cx, cy, crop in lapis)
        self._isi_part(part, p(lat, gaya='Header', exact=1))
        return rid

    def sampul(self):
        foto = DX['sampul_foto'][self.kajian]
        tinggi_foto = T['halaman']['tinggi_cm'] * T['objek']['sampul_foto_persen_tinggi'] / 100
        lebar_hal, tinggi_hal = T['halaman']['lebar_cm'], T['halaman']['tinggi_cm']
        path = AKAR / foto['berkas']
        rasio_kotak = lebar_hal / tinggi_foto
        crop = ''
        if self.wajib_ada(path, f'foto sampul (unduh dari {foto["url"]})'):
            from PIL import Image
            with Image.open(path) as im:
                w, h = im.size
            rasio = w / h
            if rasio > rasio_kotak:
                s = round((1 - rasio_kotak / rasio) / 2 * 100000)
                crop = f'<a:srcRect l="{s}" r="{s}"/>'
            else:
                s = round((1 - rasio / rasio_kotak) / 2 * 100000)
                crop = f'<a:srcRect t="{s}" b="{s}"/>'
        else:
            path = self.pengganti(foto['berkas'], rasio_kotak, f'Foto sampul belum diunduh: {foto["judul"]}')
        self.foto.append((foto['judul'] + ' (sampul)', foto['pengarang'], foto['lisensi'], foto['url'], foto['potong']))
        a = T['garis_pt']['aksen_sampul']
        tebal = a['tebal_pt'] * 2.54 / 72
        hdr = self.latar_kepala([
            (path, 0, 0, emu_cm(lebar_hal), emu_cm(tinggi_foto), crop),
            (self.png_polos('navy'), 0, emu_cm(tinggi_foto), emu_cm(lebar_hal), emu_cm(tinggi_hal - tinggi_foto), ''),
            (self.png_polos(a['warna']), 0, emu_cm(tinggi_foto - tebal / 2), emu_cm(lebar_hal), emu_cm(tebal), '')])
        s = DX['sampul']
        judul = p(r(self.kj['judul'], **gaya('judul_sampul')), gaya='Sampul', sesudah=0, baris=1.0, jc='left')
        sub = p(r(self.kj['subjudul'], **gaya('subjudul_sampul')), gaya='Sampul', sebelum=s['sela_subjudul_pt'], sesudah=0, baris=1.1)
        tinggi = emu_cm(s['logo_tinggi_mm'] / 10)
        logo = AKAR / T['header_footer']['header']['logo']
        from PIL import Image
        with Image.open(logo) as im:
            lw, lh = im.size
        m = tw_cm(3 / 10)
        kl = round(tinggi * lw / lh) / 360000 / 2.54 * 1440 + 2 * m
        kotak = tbl([tr([tc(p(self.inline(self.d.part, logo, round(tinggi * lw / lh), tinggi), sesudah=0, baris=1.0), round(kl),
                            shd='kertas', valign='center'),
                         tc(p(r(T['kajian']['penerbit'], b=True, pt=s['nama_lembaga_pt'], warna='navy'), sesudah=0, baris=1.0),
                            tw_cm(9.0), shd='kertas', valign='center')])], [round(kl), tw_cm(9.0)], mar=(m, m, m, m))
        terbit = p(r(T['kajian']['terbit'], pt=s['terbit_pt'], warna='kertas'), sebelum=12, sesudah=0)
        isi = [judul, sub, p(sebelum=s['sela_logo_pt'], sesudah=0, exact=1), kotak, terbit]
        margin = {'atas': tinggi_foto + s['teks_di_bawah_foto_cm'], 'bawah': s['margin_bawah_cm']}
        return {'isi': isi, 'sect': ('sampul', None, margin, hdr)}

    def halaman_gelap(self, dari_atas):
        """(rId kepala berlatar gelap, margin): satu kepala dipakai bersama pembatas lampiran dan sampul belakang."""
        if not getattr(self, 'rid_gelap', None):
            self.rid_gelap = self.latar_kepala([(self.png_polos(T['kotak']['pembatas-lampiran']['warna_latar']), 0, 0,
                                                 emu_cm(T['halaman']['lebar_cm']), emu_cm(T['halaman']['tinggi_cm']), '')])
        return self.rid_gelap, {'atas': dari_atas}

    def sampul_belakang(self):
        s = DX['sampul_belakang']
        hdr, margin = self.halaman_gelap(s['teks_dari_atas_cm'])
        tinggi = emu_cm(s['logo_tinggi_mm'] / 10)
        logo = AKAR / T['header_footer']['header']['logo']
        from PIL import Image
        with Image.open(logo) as im:
            lw, lh = im.size
        m = tw_cm(0.4)
        lb = round(round(tinggi * lw / lh) / 360000 / 2.54 * 1440) + 2 * m
        kotak = tbl([tr([tc(p(self.inline(self.d.part, logo, round(tinggi * lw / lh), tinggi), sesudah=0, baris=1.0, jc='center'),
                            lb, shd='kertas')])], [lb], mar=(m, m, m, m), jc='center')
        baris = T['header_footer']['sampul_belakang']
        isi = [kotak] + [
            p(r(x, pt=s['baris_pt'] + (1 if i == 0 else 0), b=i == 0, warna='kertas'), jc='center', sebelum=12 if i == 0 else 0, sesudah=2)
            for i, x in enumerate(baris)]
        # satu paragraf ringkas kajian: judul, kalimat tesis dari registri (token, D-6/D-22), cakupan (PEDOMAN B5.24, L70)
        tesis = ''
        if f'tesis.{self.kajian}' in self.k.angka:
            tesis = self.k.suntik(f'tesis.{self.kajian}', 'teks', 'sampul-belakang')
        else:
            self.galat(f'data/angka.json tanpa kunci tesis.{self.kajian}; sampul belakang tanpa kalimat tesis')
        ring = ' '.join(x for x in (tesis, self.kj.get('cakupan_sampul', '')) if x)
        if ring:
            kp = {'pt': s['ringkas_pt'], 'warna': 'kertas'}
            isi.append(p(r(self.kj['judul'], b=True, **kp), jc='center', sebelum=s['ringkas_sebelum_pt'], sesudah=4, kiri=tw_cm(1.5), kanan=tw_cm(1.5)))
            isi.append(p(r(ring, **kp), jc='both', sesudah=0, baris=1.15, kiri=tw_cm(1.5), kanan=tw_cm(1.5)))
        return {'isi': isi, 'sect': ('polos', None, margin, hdr)}

    def pembatas_lampiran(self, tambahan=()):
        """Halaman gelap pembatas lampiran (B5.2). Judulnya tingkat 1 (gaya Judul Pembatas Lampiran): masuk Daftar Isi."""
        s = DX['pembatas_lampiran']
        hdr, margin = self.halaman_gelap(s['judul_dari_atas_cm'])
        warna_j = T['kotak']['pembatas-lampiran']['warna_judul']
        bm = self.bm_baru()
        self.toc.append((1, None, LABEL['pembatas'], bm))
        isi = [p(self.tanda(bm, r(LABEL['pembatas'])), gaya='JudulPembatas')]
        for n in self.dok['naskah']:
            if 'lampiran' in n['meta']:
                isi.append(p(r(f'Lampiran {n["meta"]["lampiran"]}. {n["meta"]["judul"]}', pt=s['daftar_pt'], warna=warna_j), sesudah=4))
        isi += [p(r(x, pt=s['daftar_pt'], warna=warna_j), sesudah=4) for x in tambahan]
        return {'isi': isi, 'sect': ('polos', None, margin, hdr)}

    def versi(self):
        """Status kolofon dari meta naskah, bukan teks tetap: Final hanya bila semua naskah berstatus final."""
        st = [n['meta'].get('status', 'draf') for n in self.dok['naskah']]
        return 'Final' if all(x == 'final' for x in st) else 'Draf'

    def kolofon(self):
        kf = DX['kolofon']
        el, self.bm_depan = self.judul_depan('Kolofon', toc=False)
        lebar = [tw_cm(4.2), LEBAR - tw_cm(4.2)]
        k = {'pt': TY['pustaka']['ukuran_pt']}
        foto = DX['sampul_foto'][self.kajian]
        baris = [
            ('JUDUL', [self.kj['judul'], self.kj['subjudul']]),
            ('PENERBIT', T['header_footer']['sampul_belakang'][:2]),
            ('DITUJUKAN KEPADA', [kf['ditujukan']]),
            ('DASAR PENYUSUNAN', kf['dasar']),
            ('VERSI', [f'{self.versi()}, {T["kajian"]["terbit"]}']),
            ('TAHUN TERBIT', [re.search(r'\d{4}', T['kajian']['terbit'])[0]]),
            ('BAHASA', ['Indonesia']),
            ('BATAS DATA', [kf['batas_data']]),
            ('FOTO SAMPUL', [f'{foto["judul"]}. Wikimedia Commons, {foto["pengarang"]}, {foto["lisensi"]}. {foto["url"]}']),
        ]
        g = garis(T['garis_pt']['baris_tabel']['tebal_pt'], T['garis_pt']['baris_tabel']['warna'])
        rows = [tr([tc(p(r(lab), gaya='LabelBagian', sebelum=0, sesudah=0), lebar[0]),
                    tc(''.join(p(r(v, **k), gaya='IsiTabel', sesudah=2, baris=1.15) for v in vals), lebar[1])])
                for lab, vals in baris]
        tahun = re.search(r'\d{4}', T['kajian']['terbit'])[0]
        kutip = (r(f'{T["kajian"]["penerbit"]}. ({tahun}). ', **k) + r(self.kj['judul'], i=True, **k)
                 + r(f'. {T["kajian"]["penerbit"]}.', **k))
        rows.append(tr([tc(p(r('CARA MENGUTIP'), gaya='LabelBagian', sebelum=0, sesudah=0), lebar[0]),
                        tc(p(kutip, gaya='IsiTabel', baris=1.15), lebar[1])]))
        return el + [tbl(rows, lebar, bdr={'insideH': g, 'top': g, 'bottom': g}, mar=(tw_pt(4), SEL['kiri'], tw_pt(4), SEL['kanan']))]

    def entri(self, gaya_p, isi, bm):
        hal = self.halaman.get(bm, '00')
        return gaya_p, f'<w:hyperlink w:anchor="{bm}" w:history="1">{isi}{TAB}{r(hal)}</w:hyperlink>'

    def bidang_daftar(self, kode, entri):
        if not entri:
            return [p(bidang(kode, r('Tidak ada entri.')), gaya='Isi')]
        out = []
        for i, (g, isi) in enumerate(entri):
            out.append(p((bidang_buka(kode) if i == 0 else '') + isi + (bidang_tutup() if i == len(entri) - 1 else ''), gaya=g))
        return out

    def daftar_isi(self):
        e = [self.entri(f'TOC{lv}', (r(nomor) + TAB if nomor else '') + r(judul), bm) for lv, nomor, judul, bm in self.toc]
        return self.bidang_daftar('TOC \\o "1-3" \\h \\z \\u', e)

    def daftar_objek(self, kata):
        kl = {'b': True}
        e = [self.entri('TableofFigures', r(lab, **kl) + r(' ' + judul), bm) for lab, judul, bm in self.objek[kata]]
        return self.bidang_daftar(f'TOC \\h \\z \\c "{kata}"', e)

    def daftar_lampiran(self):
        e = []
        for teks, bm in self.lamp:
            kode, _, judul = teks.partition('. ')
            e.append(self.entri('TableofFigures', r(kode + '.', b=True) + r(' ' + judul), bm))
        return self.bidang_daftar('TOC \\h \\z \\t "Judul Lampiran,1"', e)

    def daftar_singkatan(self):
        f = AKAR / 'data' / 'glosarium.json'
        if f.exists():
            g = json.loads(f.read_text(encoding='utf-8'))
            # hanya singkatan yang benar-benar muncul di naskah (PEDOMAN B5.18); glosarium memuat singkatan kedua kajian
            isi = json.dumps([n['blok'] for n in self.dok['naskah']], ensure_ascii=False)
            pasang = sorted((x['singkatan'], x['kepanjangan']) for x in g.get('singkatan', [])
                            if re.search(r'(?<![\w/])' + re.escape(x['singkatan']) + r'(?![\w/])', isi))
        else:
            self.galat('data/glosarium.json belum ada; Daftar Singkatan diisi sementara dari singkatan pengarang pustaka')
            pasang = sorted({(a['singkatan'], a['literal']) for it in self.k.pustaka.values() for a in it.get('author', [])
                             if a.get('singkatan')})
        lebar = [tw_cm(3.0), LEBAR - tw_cm(3.0)]
        g = garis(T['garis_pt']['baris_tabel']['tebal_pt'], T['garis_pt']['baris_tabel']['warna'])
        rows = [tr([tc(p(r(s, b=True), gaya='IsiTabel'), lebar[0]), tc(p(r(k_), gaya='IsiTabel'), lebar[1])]) for s, k_ in pasang]
        return [tbl(rows, lebar, bdr={'insideH': g, 'bottom': g, 'top': g})] if rows else [p(r('Belum ada singkatan.'), gaya='Isi')]

    def pustaka(self):
        return [p(''.join(r(x['s'], i=x.get('miring', False)) for x in runs), gaya='Pustaka') for _, runs in self.k.daftar_pustaka()]

    def atribusi(self, kode):
        el = self.judul_lampiran(kode, 'Atribusi Foto')
        # keyakinan: metadata lisensi dibaca langsung dari halaman berkas Commons (sumber primer non-resmi, PEDOMAN C6.2)
        d = {'nama': 'tabel', 'id': None, 'nomor': f'{kode}.1', 'atribut': {'keyakinan': 'terverifikasi'},
             'teks': {'sumber': [{'j': 'teks', 's': 'Wikimedia Commons; tanggal akses tercatat di metadata berkas foto'}]}}
        kep = ['FOTO', 'PENGARANG', 'LISENSI', 'URL', 'PEMOTONGAN']
        baris = [[[{'j': 'teks', 's': v}] for v in row] for row in self.foto]
        tb = {'kepala': kep, 'kunci': [x.lower() for x in kep], 'rata': ['kiri'] * 5, 'baris': baris}
        judul = [{'j': 'teks', 's': f'Foto Wikimedia Commons yang dipakai dokumen ini, diakses {T["kajian"]["terbit"]}'}]
        return el + [self.keterangan(d, judul)] + self.tabel_data(tb, {}, lampiran=True) + self.baris_sumber(d)

    # -- rakit
    def rakit(self):
        self.kepala_kaki()
        nask = self.dok['naskah']
        unit = [self.sampul()]
        tunda = {}

        def tambah(isi, jenis, nomor=None):
            unit.append({'isi': isi, 'sect': (jenis, nomor)})

        tambah(self.kolofon(), 'depan', DX['romawi_mulai'])
        bagian = {n['meta']['bagian']: n for n in nask if 'bagian' in n['meta']}
        if 'kata-pengantar' in bagian:
            self.naskah = n = bagian['kata-pengantar']
            isi = self.blok(n['blok'])
            if n['meta'].get('catatan_pemilik'):  # T7 diterapkan lewat log QA, tidak tercetak di keluaran (KERANGKA §3, K18)
                self.log_qa.append(f'{n["nama"]}: diperiksa pemilik (T7): {n["meta"]["catatan_pemilik"]}')
            tambah(isi, 'depan')
        el, _ = self.judul_depan('Daftar Isi', toc=False)
        tunda['isi'] = len(unit)
        tambah(el, 'depan')
        # KERANGKA §3 (PEDOMAN A3.4): Ringkasan Eksekutif langsung sesudah Daftar Isi, sebelum daftar tabel dan singkatan
        if 'ringkasan-eksekutif' in bagian:
            self.naskah = n = bagian['ringkasan-eksekutif']
            tambah(self.blok(n['blok']), 'depan')
        for kata, nama in (('Tabel', 'Daftar Tabel'), ('Gambar', 'Daftar Gambar'), ('Lampiran', 'Daftar Lampiran')):
            tunda[kata] = len(unit)
            tambah(self.judul_depan(nama), 'depan')
        tambah(self.judul_depan('Daftar Singkatan') + self.daftar_singkatan(), 'depan')
        pertama = True
        for n in (x for x in nask if 'bab' in x['meta']):
            self.naskah = n
            self.cek_ringkasan(n)
            tambah(self.blok(n['blok']), 'isi', 1 if pertama else None)
            pertama = False
        if self.k.dikutip:
            tambah(self.judul_depan('Daftar Pustaka') + self.pustaka(), 'isi', 1 if pertama else None)
        lampiran = [x for x in nask if 'lampiran' in x['meta']]
        kode_atribusi = next((c for c in reversed(self.kj['lampiran']) if c not in {x['meta']['lampiran'] for x in lampiran}), None)
        atribusi = self.foto and kode_atribusi
        if lampiran or atribusi:
            unit.append(self.pembatas_lampiran([f'Lampiran {kode_atribusi}. Atribusi Foto'] if atribusi else []))
        for n in lampiran:
            self.naskah = n
            tambah(self.blok(n['blok']), 'isi')
        if atribusi:
            tambah(self.atribusi(kode_atribusi), 'isi')
        unit.append(self.sampul_belakang())
        # daftar yang membaca entri seluruh dokumen dirakit terakhir
        unit[tunda['isi']]['isi'] += self.daftar_isi()
        unit[tunda['Tabel']]['isi'] += self.daftar_objek('Tabel')
        unit[tunda['Gambar']]['isi'] += self.daftar_objek('Gambar')
        unit[tunda['Lampiran']]['isi'] += self.daftar_lampiran()
        self.susun(unit)
        self.tanpa_penggal_sel()
        self.paket()
        return self

    def tanpa_penggal_sel(self):
        """Sel tabel berkolom banyak (kartu angka, garis waktu, pil lembaga, matriks) tidak dipenggal walau bergaya kotak
        (PEDOMAN B2: hanya teks mengalir rata kiri-kanan yang dipenggal). Kotak satu kolom tetap mengikuti gayanya."""
        from docx.oxml.ns import qn
        from docx.oxml import OxmlElement
        sebelum = {qn(f'w:{t}') for t in ('pStyle', 'keepNext', 'keepLines', 'pageBreakBefore', 'framePr', 'widowControl', 'numPr',
                                          'suppressLineNumbers', 'pBdr', 'shd', 'tabs')}
        for tbl in self.d.element.body.iter(qn('w:tbl')):
            grid = tbl.find(qn('w:tblGrid'))
            if grid is None or len(grid.findall(qn('w:gridCol'))) < 2:
                continue
            for par in tbl.iter(qn('w:p')):
                ppr = par.find(qn('w:pPr'))
                if ppr is None:
                    ppr = OxmlElement('w:pPr'); par.insert(0, ppr)
                if ppr.find(qn('w:suppressAutoHyphens')) is not None:
                    continue
                el = OxmlElement('w:suppressAutoHyphens')
                i = 0
                for i, ch in enumerate(list(ppr)):
                    if ch.tag not in sebelum:
                        break
                else:
                    i = len(ppr)
                ppr.insert(i, el)

    def cek_ringkasan(self, n):
        """Tiap bab dibuka kotak ringkasan bab (PEDOMAN B5.2, B5.3; Buku Pegangan L17): draf diperingatkan, final ditolak."""
        if not any(b['jenis'] == 'direktif' and b['nama'] == 'ringkasan-bab' for b in N._jelajah(n['blok'])):
            self.galat(f'{n["nama"]}: bab tanpa ::: ringkasan-bab (PEDOMAN B5.2 dan B5.3, Buku Pegangan L17)')

    def susun(self, unit):
        body = self.d.element.body
        for c in list(body):
            body.remove(c)
        for i, u in enumerate(unit):
            sp = self.sect(*u['sect'])
            els = list(parse_xml(f'<w:body {NS}>{"".join(u["isi"])}</w:body>'))
            if i == len(unit) - 1:
                for e in els:
                    body.append(e)
                body.append(parse_xml(sp.replace('<w:sectPr>', f'<w:sectPr {NS}>', 1)))
                continue
            if not els or not els[-1].tag.endswith('}p'):
                els.append(parse_xml(f'<w:p {NS}>{ppr(sebelum=0, sesudah=0, exact=1)}</w:p>'))
            last = els[-1]
            pp = last.find('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}pPr')
            if pp is None:
                pp = parse_xml(f'<w:pPr {NS}/>')
                last.insert(0, pp)
            pp.append(parse_xml(sp.replace('<w:sectPr>', f'<w:sectPr {NS}>', 1)))
            for e in els:
                body.append(e)

    def paket(self):
        dp = self.d.part
        dp._styles_part._element = parse_xml(gaya_xml())
        dp.numbering_part._element = parse_xml(penomoran_xml(self.n_nomor, self.bab))
        dp._settings_part._element = parse_xml(SETELAN)
        for rel in list(dp.rels.values()):
            if rel.reltype.endswith('/stylesWithEffects'):
                dp.drop_rel(rel.rId)
            elif rel.reltype == RT.THEME:
                th = rel.target_part.blob.decode('utf-8')
                th = re.sub(r'<a:font script="[^"]*" typeface="[^"]*"/>', '', th)
                th = re.sub(r'<a:latin typeface="[^"]*"( panose="[^"]*")?', '<a:latin typeface="Roboto"', th)
                # palet tema Office 2007 (ungu, sian) diganti token tema.json; bayangan hitam efek memakai warna teks skema
                th = re.sub(r'<a:clrScheme .*?</a:clrScheme>', skema_warna(), th, flags=re.S)
                th = re.sub(r'<a:srgbClr val="000000">(.*?)</a:srgbClr>', r'<a:schemeClr val="tx1">\1</a:schemeClr>', th, flags=re.S)
                rel.target_part._blob = th.encode('utf-8')
            elif rel.reltype == RT.FONT_TABLE:
                rel.target_part._blob = HURUF.encode('utf-8')
        for rel in list(self.d.part.package.rels.values()):
            if rel.reltype.endswith('/thumbnail'):
                self.d.part.package.rels.pop(rel.rId)
        kaki = (f'<w:footnotes {NS}><w:footnote w:type="separator" w:id="-1"><w:p>{ppr(sesudah=0, baris=1.0)}<w:r><w:separator/></w:r></w:p></w:footnote>'
                f'<w:footnote w:type="continuationSeparator" w:id="0"><w:p>{ppr(sesudah=0, baris=1.0)}<w:r><w:continuationSeparator/></w:r></w:p>'
                f'</w:footnote>{"".join(self.kaki)}</w:footnotes>')
        part = Part(PackURI('/word/footnotes.xml'), 'application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml',
                    kaki.encode('utf-8'), dp.package)
        dp.relate_to(part, RT.FOOTNOTES)
        cp = self.d.core_properties  # PEDOMAN B4 Metadata, Buku Pegangan L71: judul, penerbit, subjek, kata kunci, bahasa id-ID
        cp.title, cp.author, cp.language = self.kj['judul'], T['kajian']['penerbit'], 'id-ID'
        cp.subject, cp.comments, cp.keywords = self.kj['subjudul'], '', '; '.join(self.kj['kata_kunci'])
        cp.last_modified_by, cp.category = T['kajian']['penerbit'], 'Kajian kebijakan'
        import datetime as _dt
        cp.created = cp.modified = _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0, tzinfo=None)
        # jumlah halaman lintasan sebelumnya (titik tetap: sama dengan PDF akhir) untuk KEPUTUSAN P13 dan gerbang T-2
        app = next((x for x in self.d.part.package.iter_parts() if x.partname == '/docProps/app.xml'), None)
        if app is not None:
            b = app.blob
            if self.n_hal:
                b = re.sub(rb'<Pages>\d+</Pages>', f'<Pages>{self.n_hal}</Pages>'.encode(), b)
            b = re.sub(rb'<Company>.*?</Company>|<Company/>', b'', b).replace(b'</Properties>', f'<Company>{esc(T["kajian"]["penerbit"])}</Company></Properties>'.encode())
            app._blob = b


# ---------------------------------------------------------------- LibreOffice, halaman, titik tetap

PROFIL = KERJA / '.lo-profil'
XBA = ('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE script:module PUBLIC "-//OpenOffice.org//DTD OfficeDocument 1.0//EN" '
       '"module.dtd">\n<script:module xmlns:script="http://openoffice.org/2000/script" script:name="Module1" '
       'script:language="StarBasic">{}</script:module>')


# Kamus id_ID dan pola pemenggalan hyph_id_ID dari repositori kamus LibreOffice (folder id), disalin ke bangun/kamus/id (lihat
# README pembangun ini). Dipasang sebagai ekstensi ke profil ekspor, bukan profil pemilik (PEDOMAN B2, Buku Pegangan L67).
KAMUS = SINI.parent / 'kamus' / 'id'
KAMUS_SHA = {'hyph_id_ID.dic': 'ac53214620527f8a145ce4d70f0a3a5d336a145643b52547375aedacef558dc0',
             'id_ID.aff': 'c625d5b237a489c452cf1f9c666600103e8093667dff89e7030a24217995dc79',
             'id_ID.dic': '775ff17a52801f3d2ee80120952fb44cc9bac6c3cf61740de775e439851a5803'}
KAMUS_ISI = ('dictionaries.xcu', 'META-INF/manifest.xml', 'description.xml', 'LICENSE-dict', *KAMUS_SHA)


def unopkg():
    calon = [os.environ.get('UNOPKG'), shutil.which('unopkg'), '/Applications/LibreOffice.app/Contents/MacOS/unopkg']
    if SOFFICE:
        calon.insert(1, str(Path(SOFFICE).resolve().parent / 'unopkg'))
    return next((x for x in calon if x and Path(x).exists()), None)


def pasang_kamus(env):
    """Kemas bangun/kamus/id menjadi .oxt dan pasang ke profil ekspor dengan unopkg (sekali; dipasang ulang bila SHA kamus berubah).
    Tanpa ini LibreOffice di mesin ini tidak memenggal teks Indonesia, dan isi rata kiri-kanan bercelah lebar."""
    import zipfile
    for f, h in KAMUS_SHA.items():
        if hashlib.sha256((KAMUS / f).read_bytes()).hexdigest() != h:
            raise SystemExit(f'kamus {KAMUS / f} berubah (SHA-256 beda dengan KAMUS_SHA); perbarui KAMUS_SHA dan README bila disengaja')
    tanda, kunci = PROFIL / 'kamus-id.json', json.dumps(KAMUS_SHA, sort_keys=True)
    if tanda.exists() and tanda.read_text(encoding='utf-8') == kunci:
        return
    up = unopkg()
    if not up:
        raise SystemExit('unopkg tidak ditemukan (setel UNOPKG): pola hyph_id_ID tidak bisa dipasang ke profil ekspor')
    oxt = KERJA / 'kamus-id.oxt'
    with zipfile.ZipFile(oxt, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in KAMUS_ISI:
            z.write(KAMUS / f, f)
    subprocess.run([up, 'remove', env, 'org.openoffice.id.hunspell.dictionaries'], capture_output=True, timeout=300)
    h = subprocess.run([up, 'add', '--force', env, str(oxt)], capture_output=True, text=True, timeout=300)
    if h.returncode:
        raise SystemExit(f'unopkg gagal memasang kamus id_ID: {h.stderr or h.stdout}')
    tanda.write_text(kunci, encoding='utf-8')


def ekspor_pdf(docx, pdf):
    """Satu proses LibreOffice berprofil tunggal (keluaran/.lo-profil): jangan jalankan dua build sekaligus."""
    if not SOFFICE:
        raise SystemExit('soffice tidak ditemukan: pasang LibreOffice atau setel SOFFICE=/jalur/ke/soffice')
    env = f'-env:UserInstallation={PROFIL.as_uri()}'
    mod = PROFIL / 'user/basic/Standard/Module1.xba'
    if not mod.exists():
        subprocess.run([SOFFICE, env, '--headless', '--terminate_after_init'], capture_output=True, timeout=180)
    pasang_kamus(env)
    teks = XBA.format(escape((SINI / 'ekspor.bas').read_text(encoding='utf-8'), {'"': '&quot;'}))
    if not mod.exists() or mod.read_text(encoding='utf-8') != teks:
        mod.write_text(teks, encoding='utf-8')
    pdf = Path(pdf)
    pdf.unlink(missing_ok=True)
    subprocess.run([SOFFICE, env, '--headless', '--norestore', f'macro:///Standard.Module1.Ekspor("{docx}","{pdf}")'],
                   capture_output=True, timeout=900)
    if not pdf.exists():
        raise SystemExit(f'LibreOffice gagal mengekspor {docx}')


def baca_halaman(pdf, pk):
    """Penanda -> label halaman tampil. Label dihitung dari awal seksi depan (romawi) dan Bab 1 (arab)."""
    import pymupdf
    with pymupdf.open(pdf) as d:
        tujuan = {k.replace('5F', '_'): v['page'] for k, v in d.resolve_names().items() if 'page' in v}
        n = d.page_count
    awal_depan, awal_isi = tujuan[pk.bm_depan], tujuan.get(pk.bm_isi, n)

    def label(hal):
        return roman(DX['romawi_mulai'] + hal - awal_depan) if hal < awal_isi else str(hal - awal_isi + 1)
    semua = [bm for *_, bm in pk.toc] + [bm for v in pk.objek.values() for *_, bm in v] + [bm for _, bm in pk.lamp]
    hilang = [bm for bm in semua if bm not in tujuan]
    if hilang:
        raise SystemExit(f'{len(hilang)} penanda tidak muncul di PDF (mis. {hilang[:3]}); LibreOffice tidak mengekspor tujuan')
    return {bm: label(tujuan[bm]) for bm in semua}, n


def render_ikon(perlu, final=False):
    """Semua ikon yang dipakai dirender ulang tiap build (tanpa cache basi). Glif dari bangun/visual/ikon.mjs lewat
    ikon.mjs, diraster PyMuPDF. Glif yang belum digambar: lingkaran kosong di draf, build ditolak untuk naskah final.
    Kembalikan daftar peringatan."""
    if not perlu:
        return []
    import pymupdf
    IKON_DIR.mkdir(parents=True, exist_ok=True)
    h = subprocess.run(['node', str(SINI / 'ikon.mjs'), *sorted({s['glif'] for s in perlu.values()})],
                       capture_output=True, text=True, timeout=120)
    if h.returncode:
        raise SystemExit(f'ikon.mjs gagal (butuh node di PATH): {h.stderr}')
    glif = json.loads(h.stdout)
    hilang = sorted(g for g, v in glif.items() if v is None)
    pesan = f'glif belum digambar di bangun/visual/ikon.mjs: {", ".join(hilang)}; lingkarannya kosong'
    if hilang and final:
        raise SystemExit(f'naskah final: {pesan}')
    for s in perlu.values():
        px = s['px']
        sk = px * s['rasio'] / 24
        ling = f'<circle cx="{px / 2}" cy="{px / 2}" r="{px / 2}" fill="{s["lingkaran"]}"/>' if s['lingkaran'] else ''
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{px}" height="{px}" viewBox="0 0 {px} {px}">{ling}'
               f'<g transform="translate({px / 2 - 12 * sk} {px / 2 - 12 * sk}) scale({sk})" fill="none" stroke="{s["warna"]}" '
               f'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
               f'{(glif[s["glif"]] or "").replace("currentColor", s["warna"])}</g></svg>')
        pymupdf.open('svg', svg.encode()).load_page(0).get_pixmap(alpha=True).save(s['berkas'])
    return [pesan] if hilang else []


def halaman_penanda(pdf):
    """Nama penanda Word -> indeks halaman PDF (0-based), dari tujuan bernama ekspor LibreOffice."""
    import pymupdf
    with pymupdf.open(pdf) as d:
        return {k.replace('5F', '_'): v['page'] for k, v in d.resolve_names().items() if 'page' in v}


PERAN_MAKNA = {'kategori', 'skala', 'arah'}  # PEDOMAN B1.8: satu hex satu arti per halaman


def manifest_halaman(pk, pdf, label):
    """[{halaman, objek, hex: {hex: [peran]}}] dari penanda _Obj; galat bila satu hex berperan ganda bermakna."""
    tujuan, per = halaman_penanda(pdf), {}
    for nama, objek, hx_ in pk.peran:
        if nama not in tujuan:
            continue
        h = per.setdefault(tujuan[nama], {'halaman': label(tujuan[nama]), 'objek': [], 'hex': {}})
        h['objek'].append(objek)
        for x, v in hx_.items():
            h['hex'].setdefault(x, set()).update(v)
    out = []
    for i in sorted(per):
        h = per[i]
        for x, v in h['hex'].items():
            if len(v & PERAN_MAKNA) > 1:
                pk.galat(f'halaman {h["halaman"]}: #{x} dipakai sebagai {" dan ".join(sorted(v & PERAN_MAKNA))} '
                         f'({", ".join(h["objek"])}); PEDOMAN B1.8')
        out.append({**h, 'hex': {x: sorted(v) for x, v in sorted(h['hex'].items())}})
    return out


def pustaka_bab(dok):
    """{nomor bab: [kunci pustaka.json yang dirujuk di naskah bab itu]} dari run 'pustaka' hasil naskah.py (gerbang T-11, L65)."""
    def kunci(x, out):
        if isinstance(x, dict):
            if x.get('j') == 'pustaka':
                out.update(x.get('kunci', []))
            for v in x.values():
                kunci(v, out)
        elif isinstance(x, list):
            for v in x:
                kunci(v, out)
        return out
    return {str(n['meta']['bab']): sorted(kunci(n['blok'], set())) for n in dok['naskah'] if 'bab' in n['meta']}


def bangun(folder, keluar):
    keluar = Path(keluar)
    keluar.parent.mkdir(parents=True, exist_ok=True)
    KERJA.mkdir(parents=True, exist_ok=True)
    dok = muat_dokumen(folder)
    pk0 = Perakit(dok).rakit()
    peringatan = pk0.peringatan + render_ikon(pk0.ikon_perlu, pk0.final)
    tmp_docx, tmp_pdf = KERJA / f'_kerja-{keluar.stem}.docx', KERJA / f'_kerja-{keluar.stem}.pdf'
    halaman, n_lalu, hal_baru, riwayat = None, None, frozenset(), []
    for lintas in range(1, 7):
        pk = Perakit(dok, halaman, n_lalu, hal_baru).rakit()
        pk.d.save(tmp_docx)
        ekspor_pdf(tmp_docx, tmp_pdf)
        baru, n = baca_halaman(tmp_pdf, pk)
        riwayat.append(n)
        # LibreOffice tidak menahan tabel bersama paragraf sesudahnya: kartu yang terbelah dari keterangan atau baris
        # Sumber-nya mulai halaman baru di lintasan berikut (kartu sendiri satu baris cantSplit, muat satu halaman)
        tj = halaman_penanda(tmp_pdf)
        pisah = hal_baru | {i for i, *bm in pk.kartu if len({tj.get(x) for x in bm}) > 1}
        if baru == halaman and n == n_lalu and pisah == hal_baru:
            break
        halaman, n_lalu, hal_baru = baru, n, frozenset(pisah)
    else:
        raise SystemExit(f'nomor halaman tidak mencapai titik tetap dalam 6 lintasan: {riwayat}')
    shutil.copy(tmp_docx, keluar)
    shutil.copy(tmp_pdf, keluar.with_suffix('.pdf'))
    tujuan = halaman_penanda(tmp_pdf)
    a_d, a_i = tujuan[pk.bm_depan], tujuan.get(pk.bm_isi, n)
    label = lambda i: roman(DX['romawi_mulai'] + i - a_d) if a_d <= i < a_i else str(i - a_i + 1) if i >= a_i else ''
    # manifest gerbang QA (qa/README.md): angka injeksi + turunan pembangun, dan hex per halaman (D-24)
    man = {'angka': dok['konteks'].manifest + pk.turunan, 'halaman': manifest_halaman(pk, tmp_pdf, label),
           'pustaka': {'kajian': pk.kajian, 'status': pk.versi().lower(), 'bab': pustaka_bab(dok)}}  # gerbang T-11 (L65)
    keluar.with_suffix('.manifest.json').write_text(json.dumps(man, ensure_ascii=False, indent=1), encoding='utf-8')
    # pindaian ambang anti-AI per bab (Buku Pegangan Angka & copy, PEDOMAN D4): laporan vonis ke keluaran/qa/slop-<nama>.md
    sys.path.insert(0, str(AKAR / 'qa'))
    import slop
    lap = AKAR / 'keluaran' / 'qa' / f'slop-{keluar.stem}.md'
    lap.parent.mkdir(parents=True, exist_ok=True)
    lap.write_text(slop.laporan_ambang([slop.periksa_berkas(keluar, final=True)]), encoding='utf-8')
    if pk.log_qa:  # penanda pemeriksaan (T7) ke log QA, bukan ke dokumen (KERANGKA §3)
        log = AKAR / 'keluaran' / 'qa' / f'log-{keluar.stem}.md'
        log.parent.mkdir(parents=True, exist_ok=True)
        log.write_text(f'# Log QA {keluar.name}\n\n' + ''.join(f'- {x}\n' for x in dict.fromkeys(pk.log_qa)), encoding='utf-8')
    for w in dict.fromkeys(peringatan[len(pk0.peringatan):] + pk.peringatan):
        print('peringatan:', w, file=sys.stderr)
    print(f'{keluar} dan {keluar.with_suffix(".pdf").name}: {n} halaman, {lintas} lintasan, '
          f'{len(pk.toc)} entri daftar isi, {len(pk.objek["Tabel"])} tabel, {len(pk.objek["Gambar"])} gambar, '
          f'{pk.kaki_id} catatan kaki')
    return {'docx': keluar, 'pdf': keluar.with_suffix('.pdf'), 'halaman': halaman, 'perakit': pk, 'n': n,
            'manifest': keluar.with_suffix('.manifest.json'), 'tujuan': tujuan}


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('kajian', nargs='?', choices=['air', 'mitigasi'])
    ap.add_argument('--naskah', help='folder naskah (bawaan naskah/<kajian>)')
    ap.add_argument('--keluar', help='berkas .docx keluaran (bawaan keluaran/<kajian>.docx)')
    x = ap.parse_args()
    if not (x.kajian or x.naskah):
        ap.error('sebut kajian (air|mitigasi) atau --naskah')
    bangun(x.naskah or AKAR / 'naskah' / x.kajian, x.keluar or AKAR / 'keluaran' / f'{x.kajian}.docx')
