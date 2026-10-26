#!/usr/bin/env python3
"""Uji diri gerbang QA.

1. Fixture bersih (DOCX + PDF-nya, PPTX + PDF-nya, hasil soffice; SVG + manifest bangun/visual) mewujudkan konvensi
   PEDOMAN dan Buku Pegangan, termasuk pola yang disahkan: sampul tanpa nomor, Heading 1 bernomor otomatis, kolom NO
   rata tengah, label pita kapital, kartu skenario majemuk, grup kartu angka, foto Commons dengan Lampiran Atribusi,
   singkatan APA, pembatas Lampiran, pil keyakinan C6.2, kepala/kaki B4, kerangka slide. Lolos semua gerbang --ketat.
2. Satu fixture negatif per sub-aturan (qa/cakupan.json "diuji"): ditolak TEPAT oleh kode yang diharapkan dan pesannya
   memuat potongan khas cabang itu, sehingga cabang yang dibuang membuat uji diri merah. Fixture positif harus lolos.
3. Regresi: qa/regresi/contoh.docx (DOCX nyata pertama dari bangun/docx) tidak memicu positif palsu yang pernah ada
   dan tetap memicu temuan benarnya. Keluaran hidup bangun/docx dan bangun/pptx diperiksa terhadap pola positif palsu
   yang sama (tanpa menuntut lolos, karena pembangunnya masih bergerak).

    python3 qa/uji.py
"""
import copy
import json
import re
import shutil
import struct
import subprocess
import sys
import zipfile
import zlib
from pathlib import Path

QA = Path(__file__).resolve().parent
sys.path.insert(0, str(QA))
import periksa  # noqa: E402
from periksa import naskah  # noqa: E402

FIX = QA / 'fixtures'
REG = QA / 'regresi'
TEMA = periksa.muat_tema()
H = {k: v['hex'].lstrip('#') for g in ('inti', 'aksen') for k, v in TEMA['warna'][g].items()}
hx = lambda tok: periksa.hex_token(TEMA, tok)
TD, HAL, SL = TEMA['tipografi_docx'], TEMA['halaman'], TEMA['slide']
LOGO = periksa.AKAR.parents[1] / 'public/img/lembaga/sumber-bnpb.png'
IKON = periksa.AKAR.parents[1] / 'data/laporan-bnpb/harian-2026-10-23/ik/orang-putih.png'
SISIP = 'Kajian ini memakai data resmi lembaga.'
CATATAN = 'IRBI 2015 dan 2024 dihitung dengan metode yang sama.'
FOTO = TEMA['docx']['sampul_foto']['air']
NS_W = ('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
        'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
        'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"')
NS_P = ('xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"')
XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
RELS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
CT = 'application/vnd.openxmlformats-officedocument.'
TW = lambda cm: round(cm * 567)  # twip
EMU = lambda pt: round(pt * 12700)
HP = lambda k: round(TD[k]['ukuran_pt'] * 2)  # half-point
LEBAR = TW(HAL['lebar_isi_cm'])
KW = [round(LEBAR * x) for x in (0.12, 0.5, 0.38)]  # kolom NO | label | angka


def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def png(w, h, rgb):
    raw = b''.join(b'\x00' + bytes(rgb) * w for _ in range(h))
    blok = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d))
    return b'\x89PNG\r\n\x1a\n' + blok(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + \
        blok(b'IDAT', zlib.compress(raw)) + blok(b'IEND', b'')


def rgb(tok):
    return bytes.fromhex(hx(tok))


def tulis_zip(path, parts):
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        for n in sorted(parts, key=lambda n: n != '[Content_Types].xml'):  # cap waktu tetap: fixture sama tiap jalan
            z.writestr(zipfile.ZipInfo(n, (2026, 10, 23, 0, 0, 0)), parts[n] if isinstance(parts[n], bytes) else parts[n].encode('utf-8'),
                       zipfile.ZIP_DEFLATED)


def ganti(parts, part, lama, baru, n=1):
    assert lama in parts[part], f'mutasi fixture tidak menemukan "{lama[:70]}" di {part}'
    parts = dict(parts)
    parts[part] = parts[part].replace(lama, baru, n)
    return parts


def ganti_re(parts, part, pola, baru):
    s, n = re.subn(pola, baru, parts[part], flags=re.S)
    assert n, f'mutasi fixture tidak menemukan pola {pola} di {part}'
    return dict(parts, **{part: s})


# ---------------------------------------------------------------- DOCX: blok dasar

def r(t, b=None, warna=None, sz=None, shd=None, bdr=None, spasi=None):
    """Run; b=None mewarisi gaya, True Bold, False Regular eksplisit."""
    rpr = ('<w:b/>' if b else '<w:b w:val="0"/>' if b is False else '') + (f'<w:color w:val="{warna}"/>' if warna else '') \
        + (f'<w:spacing w:val="{spasi}"/>' if spasi else '') + (f'<w:sz w:val="{sz}"/>' if sz else '') \
        + (f'<w:bdr w:val="single" w:sz="6" w:space="0" w:color="{bdr}"/>' if bdr else '') \
        + (f'<w:shd w:val="clear" w:color="auto" w:fill="{shd}"/>' if shd else '')
    return f'<w:r>{"<w:rPr>" + rpr + "</w:rPr>" if rpr else ""}<w:t xml:space="preserve">{esc(t)}</w:t></w:r>'


def tab():
    return '<w:r><w:tab/></w:r>'


def rt(t, **kw):
    """Run dengan tab di dalam teks ("1.1\\tLatar Belakang")."""
    return tab().join(r(x, **kw) for x in t.split('\t'))


def pil(label):
    """Pil label keyakinan atau status usulan sesuai tampilan PEDOMAN C6.2 (isi atau garis dari tema.json)."""
    spek = next(v for g in ('keyakinan', 'status_usulan') for k, v in TEMA['kosakata'][g].items()
                if not k.startswith('_') and v['label'] == label)
    return r(f' {label} ', True, hx(spek['pil_teks']), HP('pil'), shd=hx(spek['pil_isi']) if 'pil_isi' in spek else None,
             bdr=hx(spek['pil_garis']) if 'pil_garis' in spek else None, spasi=16)


def p(runs, gaya=None, jc=None, sect='', extra=''):
    ppr = (f'<w:pStyle w:val="{gaya}"/>' if gaya else '') + extra + (f'<w:jc w:val="{jc}"/>' if jc else '') + sect
    return f'<w:p>{"<w:pPr>" + ppr + "</w:pPr>" if ppr else ""}{runs}</w:p>'


def fld(instr, hasil):
    return (f'<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve">{esc(instr)}</w:instrText></w:r>'
            f'<w:r><w:fldChar w:fldCharType="separate"/></w:r>{hasil}<w:r><w:fldChar w:fldCharType="end"/></w:r>')


def toc(instr, entri):
    """Bidang TOC berhasil terisi; entri = [(teks, halaman, gaya)]; label objek ("Tabel 1.1") Bold."""
    if not entri:
        return p(fld(instr, ''), 'TOC1')
    out = []
    for i, (t, h, g) in enumerate(entri):
        m = periksa.RE_KET.match(t)
        isi = (r(m[0], True) + r(t[m.end():]) if m else rt(t)) + tab() + r(str(h))
        if i == 0:
            isi = (f'<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve">{esc(instr)}</w:instrText>'
                   '</w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>') + isi
        if i == len(entri) - 1:
            isi += '<w:r><w:fldChar w:fldCharType="end"/></w:r>'
        out.append(p(isi, g))
    return ''.join(out)


def keterangan(label, awalan, urut, judul):
    """Keterangan: format label (Bold navy) di gaya Caption sehingga hasil SEQ yang dirender ulang LibreOffice ikut
    berformat; judul Regular teks. \\r 1 pada objek pertama tiap awalan (LibreOffice tidak membaca \\s 1)."""
    ulang = ' \\r 1' if urut == 1 else ''
    return p(r(f'{label} {awalan}.') + fld(f' SEQ {label} \\* ARABIC{ulang} ', r(str(urut))) + r(' ' + judul, False, H['teks']), 'Caption')


def gambar(rid, n, lebar_cm, tinggi_cm, alt):
    cx, cy = round(lebar_cm * 360000), round(tinggi_cm * 360000)
    return (f'<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="{cx}" cy="{cy}"/>'
            f'<wp:docPr id="{n}" name="Gambar {n}" descr="{esc(alt)}"/><a:graphic><a:graphicData '
            'uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr>'
            f'<pic:cNvPr id="{n}" name="g{n}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="{rid}"/>'
            f'<a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/>'
            '</a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic>'
            '</wp:inline></w:drawing></w:r>')


def tbl(baris, kol, tblcap=None, vertikal='nil', garis=True, rapat=False):
    g = f'w:val="single" w:sz="4" w:space="0" w:color="{H["garis"]}"'
    nil = 'w:val="nil"'
    bd = (f'<w:tblBorders><w:top {nil}/><w:left {nil}/><w:bottom {g if garis else nil}/><w:right {nil}/>'
          f'<w:insideH {g if garis else nil}/><w:insideV w:val="{vertikal}" w:sz="4" w:space="0" w:color="{H["garis"]}"/></w:tblBorders>')
    cap = f'<w:tblCaption w:val="{tblcap}"/>' if tblcap else ''
    mar = '<w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar>' if rapat else ''
    return (f'<w:tbl><w:tblPr><w:tblW w:w="{sum(kol)}" w:type="dxa"/>{bd}<w:tblLayout w:type="fixed"/>{mar}{cap}</w:tblPr><w:tblGrid>'
            + ''.join(f'<w:gridCol w:w="{w}"/>' for w in kol) + '</w:tblGrid>' + ''.join(baris) + '</w:tbl>')


def tr(sel, kepala=False):
    return ('<w:tr><w:trPr><w:tblHeader/></w:trPr>' if kepala else '<w:tr>') + ''.join(sel) + '</w:tr>'


def tc(isi, w, fill=None, span=1, bawah=None, tengah=False):
    pr = f'<w:tcW w:w="{w}" w:type="dxa"/>' + (f'<w:gridSpan w:val="{span}"/>' if span > 1 else '') \
        + (f'<w:tcBorders><w:bottom w:val="single" w:sz="{bawah[0]}" w:space="0" w:color="{bawah[1]}"/></w:tcBorders>' if bawah else '') \
        + (f'<w:shd w:val="clear" w:color="auto" w:fill="{fill}"/>' if fill else '') + ('<w:vAlign w:val="center"/>' if tengah else '')
    return f'<w:tc><w:tcPr>{pr}</w:tcPr>{isi}</w:tc>'


def tabel_data(kepala, baris, total=None, kol=None, rata=None, lampiran=False):
    """Tabel data B5.7: kepala navy (lampiran: tanpa isi, garis bawah 1 pt teks-3), kolom label Bold, kolom NO rata
    tengah, angka rata kanan, garis bawah 0,5 pt, tanpa garis tegak, baris Jumlah navy."""
    kol = kol or [LEBAR // len(kepala)] * len(kepala)
    rata = rata or ['left'] + ['right'] * (len(kepala) - 1)
    gk = TEMA['garis_pt']['kepala_tabel_lampiran']
    kep = [tc(p(r(t), 'KepalaLampiran' if lampiran else 'KepalaTabel'), w, None if lampiran else H['navy'],
              bawah=(round(gk['tebal_pt'] * 8), hx(gk['warna'])) if lampiran else None) for t, w in zip(kepala, kol)]
    label = rata.index('left') if 'left' in rata else -1
    rows = [tr(kep, True)]
    for b in baris:
        rows.append(tr([tc(x if x.startswith('<w:p>') else p(r(x), 'LabelTabel' if i == label else 'IsiTabel', rata[i]), w)
                        for i, (x, w) in enumerate(zip(b, kol))]))
    if total:
        rows.append(tr([tc(p(r(t), 'TotalTabel', 'left' if i == 0 else 'right'), w, H['navy']) for i, (t, w) in enumerate(zip(total, kol))]))
    return tbl(rows, kol)


def seksi(fmt, mulai=None, polos=False, acuan=True):
    m = HAL['margin_cm']
    h, f = ('rIdH0', 'rIdF0') if polos else ('rIdH', 'rIdF')
    ref = f'<w:headerReference w:type="default" r:id="{h}"/><w:footerReference w:type="default" r:id="{f}"/>' if acuan else ''
    return (f'<w:sectPr>{ref}<w:type w:val="nextPage"/><w:pgSz w:w="{TW(HAL["lebar_cm"])}" w:h="{TW(HAL["tinggi_cm"])}"/>'
            f'<w:pgMar w:top="{TW(m["atas"])}" w:right="{TW(m["kanan"])}" w:bottom="{TW(m["bawah"])}" w:left="{TW(m["kiri"])}" '
            f'w:header="{TW(HAL["header_dari_tepi_cm"])}" w:footer="{TW(HAL["footer_dari_tepi_cm"])}" w:gutter="0"/>'
            f'<w:pgNumType w:fmt="{fmt}"{f" w:start={chr(34)}{mulai}{chr(34)}" if mulai else ""}/></w:sectPr>')


def gaya_xml():
    tab_kanan = f'<w:tab w:val="right" w:leader="dot" w:pos="{LEBAR}"/>'
    tabs = lambda kiri=None: '<w:tabs>' + (f'<w:tab w:val="left" w:pos="{kiri}"/>' if kiri else '') + tab_kanan + '</w:tabs>'
    st = lambda sid, nama, ppr='', rpr='', basis='Normal': (
        f'<w:style w:type="paragraph" w:styleId="{sid}"><w:name w:val="{nama}"/>'
        + (f'<w:basedOn w:val="{basis}"/>' if basis else '') + f'<w:pPr>{ppr}</w:pPr><w:rPr>{rpr}</w:rPr></w:style>')
    roboto = '<w:rFonts w:ascii="Roboto" w:hAnsi="Roboto" w:eastAsia="Roboto" w:cs="Roboto"/>'
    c = lambda tok: f'<w:color w:val="{hx(tok)}"/>'
    sp = lambda sebelum=0, sesudah=0: f'<w:spacing w:before="{round(sebelum * 20)}" w:after="{round(sesudah * 20)}"/>'
    gd, inden2 = TEMA['docx']['gantung_daftar_cm'], round(TEMA['spasi_pt']['inden_toc2_mm'] * 56.7)
    return (XML + f'<w:styles {NS_W}><w:docDefaults><w:rPrDefault><w:rPr>{roboto}{c("teks")}'
            f'<w:sz w:val="{HP("isi")}"/><w:lang w:val="id-ID"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr>'
            f'<w:spacing w:after="{TEMA["spasi_pt"]["sesudah_paragraf"] * 20}" w:line="276" w:lineRule="auto"/></w:pPr>'
            '</w:pPrDefault></w:docDefaults>'
            + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:jc w:val="both"/></w:pPr></w:style>'
            + st('Heading1', 'heading 1', '<w:keepNext/><w:pageBreakBefore/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>'
                 + sp(0, 12) + '<w:jc w:val="left"/><w:outlineLvl w:val="0"/>', f'<w:b/>{c("navy")}<w:sz w:val="{HP("judul_bab")}"/>')
            + st('Heading2', 'heading 2', '<w:keepNext/>' + sp(TEMA['spasi_pt']['sebelum_subbab'], 6) + '<w:jc w:val="left"/><w:outlineLvl w:val="1"/>',
                 f'<w:b/>{c("navy")}<w:sz w:val="{HP("subbab")}"/>')
            + st('Caption', 'caption', '<w:keepNext/>' + sp(TEMA['spasi_pt']['sebelum_keterangan'], 6) + '<w:jc w:val="center"/>',
                 f'<w:b/>{c("navy")}<w:sz w:val="{HP("keterangan")}"/>')
            + st('Sumber', 'Sumber', sp(3, TEMA['spasi_pt']['sesudah_sumber']) + '<w:jc w:val="left"/>', f'{c("teks-3")}<w:sz w:val="{HP("sumber")}"/>')
            + st('IsiTabel', 'Isi Tabel', sp(2, 2), f'<w:sz w:val="{HP("isi_tabel")}"/>')
            + st('LabelTabel', 'Label Tabel', '', '<w:b/>', 'IsiTabel')
            + st('TotalTabel', 'Total Tabel', '', f'<w:b/>{c("kertas")}', 'IsiTabel')
            + st('KepalaTabel', 'Kepala Tabel', sp(2, 2) + '<w:jc w:val="center"/>',
                 f'<w:b/>{c("kertas")}<w:spacing w:val="16"/><w:sz w:val="{HP("kepala_tabel")}"/>')
            + st('KepalaLampiran', 'Kepala Tabel Lampiran', sp(2, 2) + '<w:jc w:val="left"/>',
                 f'<w:b/>{c("teks-3")}<w:sz w:val="{HP("kepala_tabel_lampiran")}"/>')
            + st('LabelBagian', 'Label Bagian', '<w:keepNext/>' + sp(9, 3) + '<w:jc w:val="left"/>',
                 f'<w:b/>{c("teks-2")}<w:spacing w:val="16"/><w:sz w:val="{HP("label_bagian")}"/>')
            + st('JudulDepan', 'Judul Bagian Depan', sp(12, 12) + '<w:jc w:val="left"/><w:outlineLvl w:val="0"/>',
                 f'<w:b/>{c("navy")}<w:sz w:val="{HP("judul_bagian_depan")}"/>')
            + st('JudulDaftarIsi', 'Judul Daftar Isi', sp(0, 12) + '<w:jc w:val="left"/>',
                 f'<w:b/>{c("navy")}<w:sz w:val="{HP("judul_bagian_depan")}"/>')
            + st('JudulLampiran', 'Judul Lampiran', sp(0, 12) + '<w:jc w:val="left"/><w:outlineLvl w:val="0"/>',
                 f'<w:b/>{c("navy")}<w:sz w:val="{HP("subbab")}"/>')
            + st('JudulSampul', 'Judul Sampul', sp(12, 6) + '<w:jc w:val="left"/>', f'<w:b/>{c("kertas")}<w:sz w:val="{HP("judul_sampul")}"/>')
            + st('TeksSampul', 'Teks Sampul', sp(0, 6) + '<w:jc w:val="left"/>', f'{c("kertas")}<w:sz w:val="{HP("subjudul_sampul")}"/>')
            + st('TOC1', 'toc 1', tabs(TW(gd['toc1'])) + sp(3, 3) + '<w:jc w:val="left"/>', f'<w:b/>{c("navy")}<w:sz w:val="{HP("toc1")}"/>')
            + st('TOC2', 'toc 2', tabs(inden2 + TW(gd['toc2'])) + sp(0, 3) + f'<w:ind w:left="{inden2}"/><w:jc w:val="left"/>',
                 f'<w:b w:val="0"/>{c("teks")}<w:sz w:val="{HP("toc2")}"/>')
            + st('DaftarObjek', 'table of figures', tabs() + sp(0, 3) + '<w:jc w:val="left"/>', f'<w:sz w:val="{HP("daftar_objek")}"/>')
            + st('Pustaka', 'Pustaka', f'<w:ind w:left="{TW(TEMA["spasi_pt"]["inden_gantung_pustaka_cm"])}" '
                 f'w:hanging="{TW(TEMA["spasi_pt"]["inden_gantung_pustaka_cm"])}"/><w:jc w:val="left"/>', f'<w:sz w:val="{HP("pustaka")}"/>')
            + st('Kepala', 'header', sp(0, 0) + '<w:jc w:val="left"/>', f'<w:sz w:val="{HP("header")}"/>')
            + st('Kaki', 'footer', sp(0, 0) + '<w:jc w:val="center"/>', f'{c("teks-3")}<w:sz w:val="{HP("footer")}"/>')
            + st('NomorHalaman', 'Nomor Halaman', sp(0, 0) + '<w:jc w:val="right"/>',
                 f'<w:b/>{c(TD["nomor_halaman"]["warna"])}<w:sz w:val="{HP("nomor_halaman")}"/>', 'Kaki')
            + '</w:styles>')


def numbering_xml():
    """Heading 1 bernomor otomatis "BAB %1" (PEDOMAN B4: nomor bab tidak diketik)."""
    return (XML + f'<w:numbering {NS_W}><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/>'
            f'<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:pStyle w:val="Heading1"/>'
            f'<w:suff w:val="space"/><w:lvlText w:val="{TD["label_bab"]["pola"].format(n="%1")}"/><w:lvlJc w:val="left"/></w:lvl>'
            '</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num></w:numbering>')


def tema_xml(accent1=None, fon_minor='Roboto'):
    c = lambda t, v: f'<a:{t}><a:srgbClr val="{v}"/></a:{t}>'
    s3 = lambda x: x * 3
    return (XML + '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="BNPB"><a:themeElements>'
            '<a:clrScheme name="BNPB">' + c('dk1', H['teks']) + c('lt1', H['kertas']) + c('dk2', H['navy']) + c('lt2', H['garis'])
            + c('accent1', accent1 or H['oranye']) + c('accent2', H['biru']) + c('accent3', H['merah']) + c('accent4', H['slate'])
            + c('accent5', H['biru-abu']) + c('accent6', H['emas-teks']) + c('hlink', H['biru-lembaga']) + c('folHlink', H['teks-3'])
            + '</a:clrScheme><a:fontScheme name="Roboto"><a:majorFont><a:latin typeface="Roboto"/><a:ea typeface=""/>'
            f'<a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="{fon_minor}"/><a:ea typeface=""/><a:cs typeface=""/>'
            '</a:minorFont></a:fontScheme><a:fmtScheme name="BNPB"><a:fillStyleLst>'
            + s3('<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>') + '</a:fillStyleLst><a:lnStyleLst>'
            + s3('<a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln>') + '</a:lnStyleLst><a:effectStyleLst>'
            + s3('<a:effectStyle><a:effectLst/></a:effectStyle>') + '</a:effectStyleLst><a:bgFillStyleLst>'
            + s3('<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>') + '</a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>')


def tema_pptx(fon_minor='Roboto', accent1=None):
    return tema_xml(accent1, fon_minor)


def kepala_xml():
    """Kepala B4: garis tegak oranye 2 pt di kiri dua baris (judul pendek Bold, "BNPB | Oktober 2026"), logo 8 mm kanan,
    garis bawah 0,75 pt garis-kuat selebar isi."""
    gp, kj = TEMA['garis_pt'], TEMA['kajian']
    aksen = (f'<w:pBdr><w:left w:val="single" w:sz="{round(gp["aksen_header"]["tebal_pt"] * 8)}" w:space="4" '
             f'w:color="{hx(gp["aksen_header"]["warna"])}"/></w:pBdr><w:ind w:left="100"/>')
    logo_mm = TEMA['objek']['logo_header_tinggi_mm']
    kol = [LEBAR - 680, 680]
    isi = tr([tc(p(r(kj['air']['judul_pendek'], True), 'Kepala', extra=aksen)
                 + p(r(TEMA['header_footer']['header']['baris2'].format(terbit=kj['terbit'])), 'Kepala', extra=aksen), kol[0]),
              tc(p(gambar('rIdLogo', 90, logo_mm / 10 * 0.794, logo_mm / 10, 'logo BNPB'), 'Kepala', 'right'), kol[1])])
    t = tbl([isi], kol, garis=False, rapat=True).replace(
        '<w:bottom w:val="nil"/>', f'<w:bottom w:val="single" w:sz="{round(gp["header"]["tebal_pt"] * 8)}" w:space="0" '
        f'w:color="{hx(gp["header"]["warna"])}"/>', 1)
    return XML + f'<w:hdr {NS_W}>{t}' + p('', 'Kepala') + '</w:hdr>'


def kaki_xml():
    """Kaki B4: garis atas 0,5 pt garis, alamat dua baris 8 pt rata tengah (T4), nomor halaman bidang PAGE 9 pt Bold kanan
    (format di gaya paragraf NomorHalaman, karena hasil PAGE dirender ulang tanpa format run)."""
    gp = TEMA['garis_pt']['footer']
    kol = [851, LEBAR - 1702, 851]
    isi = tr([tc(p('', 'Kaki'), kol[0]), tc(''.join(p(r(b), 'Kaki') for b in TEMA['header_footer']['footer']['baris']), kol[1], tengah=True),
              tc(p(fld(' PAGE ', r('1')), 'NomorHalaman'), kol[2], tengah=True)])
    t = tbl([isi], kol, garis=False, rapat=True).replace(
        '<w:top w:val="nil"/>', f'<w:top w:val="single" w:sz="{round(gp["tebal_pt"] * 8)}" w:space="0" w:color="{hx(gp["warna"])}"/>', 1)
    return XML + f'<w:ftr {NS_W}>{t}' + p('', 'Kaki') + '</w:ftr>'


def kosong_xml(jenis):
    tag = 'hdr' if jenis == 'header' else 'ftr'
    return XML + f'<w:{tag} {NS_W}>' + p('', 'Kepala' if jenis == 'header' else 'Kaki') + f'</w:{tag}>'


def naskah_tabel(k, prov='DI Yogyakarta'):
    """Tabel CSV lewat pembaca naskah: (kepala, baris, total, manifest csv tercatat di k)."""
    teks = ('---\nkajian: air\nbab: 1\njudul: Uji\npertanyaan: Apa?\n---\n# Uji\n\n::: tabel {#tbl:uji}\n'
            f'judul: Penduduk kab/kota {prov} 2026\ncsv: data/irbi/irbi_kab_2025.csv\nsaring: prov_nama={prov}\n'
            'kolom: nama_kepmendagri="KAB/KOTA"; penduduk_2026="PENDUDUK (jiwa)" fmt=0\ntotal: ya\nsumber: WorldPop 2026\n'
            'keyakinan: asumsi-kebijakan\n:::\n')
    n = naskah.baca_teks(teks, k, 'uji-tabel')
    tb = next(b for b in naskah._jelajah(n['blok']) if b['jenis'] == 'tabel')
    return tb['kepala'], [[naskah.polos(c) for c in row] for row in tb['baris']], tb['total']


# ---------------------------------------------------------------- DOCX bersih

J = {'tbl': 'Penduduk kab/kota DI Yogyakarta, 2026', 'kartu': 'Musim hujan La Niña setara 2020/2021 di Pulau Jawa',
     'rek': 'Rekomendasi musim hujan 2026–2027', 'lamp': 'Foto Wikimedia Commons yang dipakai kajian, akses Oktober 2026',
     'gbr': 'Rerata IRBI nasional, 2015 dan 2024', 'foto': f'{FOTO["judul"]}, akses Oktober 2026'}
DAFTAR_ISI = [('DAFTAR TABEL', 'TOC1'), ('DAFTAR GAMBAR', 'TOC1'), ('BAB 1\tPENDAHULUAN', 'TOC1'), ('1.1\tLatar Belakang', 'TOC2'),
              ('1.2\tSkenario Musim Hujan', 'TOC2'), ('DAFTAR PUSTAKA', 'TOC1'), ('Lampiran A. Atribusi Foto', 'TOC1')]
DAFTAR_TABEL = [f'Tabel 1.1 {J["tbl"]}', f'Tabel 1.2 {J["kartu"]}', f'Tabel 1.3 {J["rek"]}', f'Tabel A.1 {J["lamp"]}']
DAFTAR_GAMBAR = [f'Gambar 1.1 {J["gbr"]}', f'Gambar 1.2 {J["foto"]}']
FOTO_P = p(gambar('rIdFoto', 3, TEMA['objek']['lebar_cm']['dua-kolom'], 5, 'foto'), jc='center')
FOTO_SUMBER = f'Wikimedia Commons, {FOTO["pengarang"]}, {FOTO["lisensi"]}'


def docx_bersih(hal=None):
    """(parts, manifest, info) dokumen contoh kajian air yang mematuhi semua gerbang. hal = {judul entri: halaman}
    hasil render sebelumnya (titik tetap nomor halaman indeks, seperti pembangun DOCX)."""
    hal = hal or {}
    h = lambda t: hal.get(periksa.norm(t).upper(), '0')
    k = naskah.Konteks()
    v15 = k.suntik('irbi.nasional.2015', 'fmt=2', 'uji:isi')
    v24 = k.suntik('irbi.nasional.2024', 'fmt=2', 'uji:isi')
    arah = k.suntik('irbi.nasional.persen_2015_2024', 'fmt=1|persen|arah', 'uji:isi')
    cit1 = k.kutip([('bnpb-2025-renas', None, False)])
    cit2 = k.kutip([('bnpb-2025-renas', None, False)])
    haque = k.kutip([('haque-2012-siklon', None, False)], naratif=True)
    m70 = k.suntik('bukti.bangladesh_siklon.kematian_1970', '', 'uji:isi')
    m07 = k.suntik('bukti.bangladesh_siklon.kematian_2007', '', 'uji:isi')
    ka = [(k.suntik('irbi.kab.tinggi.2023', 'satuan', 'uji:kartu'), 'kelas Tinggi, IRBI 2023'),
          (k.suntik('irbi.kab.dinilai.2023', 'satuan', 'uji:kartu'), 'dinilai, IRBI 2023'),
          (k.suntik('irbi.prov.tinggi.2023', 'satuan', 'uji:kartu'), 'kelas Tinggi, IRBI 2023')]
    analog = k.suntik('hidromet.jawa.lanina.tahun_analog', 'tahun', 'uji:skenario')
    korban = k.suntik('hidromet.jawa.lanina.korban_jiwa', 'rentang|satuan', 'uji:skenario')
    ungsi = k.suntik('hidromet.jawa.lanina.mengungsi', 'satuan', 'uji:skenario')
    rumah = k.suntik('hidromet.jawa.lanina.rumah_rusak_berat', 'satuan', 'uji:skenario')
    kep, baris, total = naskah_tabel(k)
    pola = TD['sumber']['pola'].split(': ', 1)[1]
    sumber = lambda s, label=None, per='23 Okt 2026': p(r('Sumber: ', True) + r(pola.format(sumber=s, data_per=per) + ' ')
                                                        + (pil(label) if label else ''), 'Sumber')
    # sampul (seksi polos: tanpa kepala, kaki, nomor; B5.1)
    sampul = (p(gambar('rIdSampul', 1, HAL['lebar_isi_cm'], 12, 'foto sampul'), jc='center')
              + tbl([tr([tc(p(r(TEMA['kajian']['air']['judul']), 'JudulSampul') + p(r(TEMA['kajian']['air']['subjudul']), 'TeksSampul')
                            + p(r(TEMA['kajian']['penerbit']), 'TeksSampul') + p(r(TEMA['kajian']['terbit']), 'TeksSampul'),
                            LEBAR, H['navy'])])], [LEBAR], garis=False)
              + p('', sect=seksi('decimal', polos=True)))
    depan = (p(r('DAFTAR ISI'), 'JudulDaftarIsi')
             + toc(' TOC \\o "1-3" \\h \\z \\u \\t "Judul Lampiran,1" ', [(t, h(t), g) for t, g in DAFTAR_ISI])
             + p(r('DAFTAR TABEL'), 'JudulDepan') + toc(' TOC \\h \\z \\c "Tabel" ', [(t, h(t), 'DaftarObjek') for t in DAFTAR_TABEL])
             + p(r('DAFTAR GAMBAR'), 'JudulDepan') + toc(' TOC \\h \\z \\c "Gambar" ', [(t, h(t), 'DaftarObjek') for t in DAFTAR_GAMBAR])
             + p('', sect=seksi('lowerRoman', TEMA['docx']['romawi_mulai'])))
    # grup kartu angka (B5.4): kartu putih bergaris, satu baris kaki "Sumber: ...; Resmi" per grup
    g = f'w:val="single" w:sz="6" w:space="0" w:color="{H["garis"]}"'
    kartu = ''.join(f'<w:tc><w:tcPr><w:tcW w:w="{LEBAR // 3}" w:type="dxa"/><w:tcBorders><w:top {g}/><w:left {g}/><w:bottom {g}/>'
                    f'<w:right {g}/></w:tcBorders><w:shd w:val="clear" w:color="auto" w:fill="{hx("kertas")}"/></w:tcPr>'
                    + p(r(v, True, H['navy'], HP('nilai_kartu')), 'IsiTabel') + p(r(lb, None, hx('teks-3'), HP('label_kartu')), 'IsiTabel')
                    + '</w:tc>' for v, lb in ka)
    grup = tbl([f'<w:tr>{kartu}</w:tr>'], [LEBAR // 3] * 3, tblcap='kartu-angka', garis=False)
    # kartu skenario majemuk (B5.11): bingkai ber-w:tblCaption skenario, matriks mini, label pita, tabel kerusakan, kaki
    pita = tbl([tr([tc(p(r(f'Banjir dan banjir bandang: musim hujan La Niña, analog {analog}/2021', True)), LEBAR,
                       hx('tint.basah.pita'))])], [LEBAR], tblcap='skenario', garis=False)
    rusak = tabel_data(['BESARAN', 'NILAI', 'KEYAKINAN'],
                       [['Korban jiwa', korban, p(pil('Estimasi model'), 'IsiTabel')],
                        ['Pengungsi', ungsi, p(pil('Resmi'), 'IsiTabel')],
                        ['Rumah rusak berat', rumah, p(pil('Resmi'), 'IsiTabel')]],
                       kol=[round(LEBAR * 0.4), round(LEBAR * 0.3), LEBAR - round(LEBAR * 0.4) - round(LEBAR * 0.3)])
    kartu_skenario = (keterangan('Tabel', 1, 2, J['kartu']) + pita
                      + p(gambar('rIdMatriks', 4, TEMA['objek']['lebar_cm']['dua-kolom'], 2.5, 'matriks mini'), jc='left')
                      + p(r('KERUSAKAN DAN KERUGIAN'), 'LabelBagian') + rusak
                      + p(r('Simulasi skenario Pantau Bencana, belum divalidasi; korban jiwa berupa rentang model.'), 'Sumber')
                      + sumber('DIBI BNPB 2008–2026; simulasi skenario Pantau Bencana'))
    rek = tabel_data(['NO', 'LANGKAH', 'WAKTU'],
                     [['01', p(r('Perluas peringatan dini banjir kab/kota kelas Tinggi'), 'LabelTabel')
                       + p(pil('Sudah ada, perlu dikembangkan'), 'IsiTabel'), '2026–2027']],
                     kol=KW, rata=['center', 'left', 'left'])
    isi = (p(r('PENDAHULUAN'), 'Heading1') + p(rt('1.1\tLatar Belakang'), 'Heading2')
           + p(r(f'Rerata indeks risiko bencana Indonesia {arah} dari {v15} pada 2015 menjadi {v24} pada 2024 {cit1}.'))
           + p(r(f'{haque} mencatat kematian akibat siklon di Bangladesh turun dari {m70} jiwa pada 1970 menjadi {m07} '
                 'jiwa pada 2007 setelah peringatan dini diperluas.'))
           + p(r(SISIP))
           + p(r(f'Rencana Nasional Penanggulangan Bencana (Renas PB) 2025–2029 menetapkan penurunan indeks risiko sebagai sasaran nasional {cit2}.'))
           + grup + sumber('InaRISK BNPB, IRBI 2023', 'Resmi')
           + keterangan('Tabel', 1, 1, J['tbl'])
           + tabel_data(['NO'] + kep, [[str(i + 1)] + b for i, b in enumerate(baris)], total[:1] + [''] + total[1:], kol=KW,
                        rata=['center', 'left', 'right'])
           + sumber('WorldPop 2026', 'Asumsi kebijakan')
           + keterangan('Gambar', 1, 1, J['gbr']) + p(gambar('rIdG1', 2, HAL['lebar_isi_cm'], 4, 'grafik'), jc='center')
           + sumber('InaRISK BNPB, IRBI 2015 dan 2024', 'Resmi')
           + p(r('Catatan: ', True) + r(CATATAN), 'Sumber')
           + p(rt('1.2\tSkenario Musim Hujan'), 'Heading2')
           + p(r(f'Kartu skenario memakai musim La Niña {analog}/2021 sebagai analog dari Data dan Informasi Bencana Indonesia (DIBI) (Tabel 1.2).'))
           + kartu_skenario
           + keterangan('Tabel', 1, 3, J['rek']) + rek + sumber('Analisis kajian ini; Renas PB 2025–2029', 'Asumsi kebijakan')
           + keterangan('Gambar', 1, 2, J['foto']) + FOTO_P + p(r('Sumber: ', True) + r(FOTO_SUMBER), 'Sumber')
           + p('', sect=seksi('decimal', 1)))
    pustaka = (p(r('DAFTAR PUSTAKA'), 'JudulDepan')
               + ''.join(p(''.join(r(re.sub(r'(\d)\u2013(\d)', '\\1\ufeff\u2013\ufeff\\2', x['s'])) for x in runs), 'Pustaka')
                         for _, runs in k.daftar_pustaka())  # U+FEFF di kiri-kanan en dash: rentang "2025\u20132029" tidak patah
               + p('', sect=seksi('decimal')))
    pembatas = (p(gambar('rIdPembatas', 5, HAL['lebar_isi_cm'], 9, 'pembatas lampiran'), jc='center')
                + p(r('LAMPIRAN', True, H['navy'], HP('judul_bagian_depan'))) + p(r('Lampiran A. Atribusi Foto'))
                + p('', sect=seksi('decimal', polos=True)))
    lampiran = (p(r('Lampiran A. Atribusi Foto'), 'JudulLampiran')
                + keterangan('Tabel', 'A', 1, J['lamp'])
                + tabel_data(['FOTO', 'PENGARANG', 'LISENSI'], [[FOTO['judul'], FOTO['pengarang'], FOTO['lisensi']]],
                             rata=['left', 'left', 'left'], lampiran=True)
                + p(r('Sumber: ', True) + r('Wikimedia Commons; tanggal akses tercatat di metadata berkas foto ') + pil('Terverifikasi'), 'Sumber')
                + p('', sect=seksi('decimal')))
    belakang = (p(gambar('rIdBelakang', 6, HAL['lebar_isi_cm'], 9, 'sampul belakang'), jc='center')
                + ''.join(p(r(b)) for b in TEMA['header_footer']['sampul_belakang']))
    doc = (XML + f'<w:document {NS_W}><w:body>{sampul}{depan}{isi}{pustaka}{pembatas}{lampiran}{belakang}'
           f'{seksi("decimal", polos=True)}</w:body></w:document>')
    rel = lambda rs: XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + ''.join(
        f'<Relationship Id="{i}" Type="{RELS}/{t}" Target="{g_}"/>' for i, t, g_ in rs) + '</Relationships>'
    ov = lambda n, t: f'<Override PartName="/{n}" ContentType="{CT}{t}"/>'
    parts = {
        '[Content_Types].xml': XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>'
        + ov('word/document.xml', 'wordprocessingml.document.main+xml') + ov('word/styles.xml', 'wordprocessingml.styles+xml')
        + ov('word/settings.xml', 'wordprocessingml.settings+xml') + ov('word/numbering.xml', 'wordprocessingml.numbering+xml')
        + ov('word/theme/theme1.xml', 'theme+xml')
        + ''.join(ov(f'word/{n}.xml', f'wordprocessingml.{"header" if n.startswith("h") else "footer"}+xml')
                  for n in ('header1', 'header2', 'footer1', 'footer2'))
        + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>',
        '_rels/.rels': rel([('rId1', 'officeDocument', 'word/document.xml')]).replace(
            '</Relationships>', '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/'
            'metadata/core-properties" Target="docProps/core.xml"/></Relationships>'),
        'docProps/core.xml': XML + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
        f'xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>{esc(TEMA["kajian"]["air"]["judul_pendek"])}</dc:title></cp:coreProperties>',
        'word/document.xml': doc,
        'word/styles.xml': gaya_xml(),
        'word/numbering.xml': numbering_xml(),
        'word/theme/theme1.xml': tema_xml(),
        'word/settings.xml': XML + f'<w:settings {NS_W}><w:updateFields w:val="true"/></w:settings>',
        'word/header1.xml': kepala_xml(), 'word/footer1.xml': kaki_xml(),
        'word/header2.xml': kosong_xml('header'), 'word/footer2.xml': kosong_xml('footer'),
        'word/_rels/document.xml.rels': rel([('rIdS', 'styles', 'styles.xml'), ('rIdSet', 'settings', 'settings.xml'),
                                            ('rIdN', 'numbering', 'numbering.xml'), ('rIdT', 'theme', 'theme/theme1.xml'),
                                            ('rIdH', 'header', 'header1.xml'), ('rIdF', 'footer', 'footer1.xml'),
                                            ('rIdH0', 'header', 'header2.xml'), ('rIdF0', 'footer', 'footer2.xml'),
                                            ('rIdG1', 'image', 'media/grafik.png'), ('rIdFoto', 'image', 'media/foto.png'),
                                            ('rIdMatriks', 'image', 'media/matriks.png'), ('rIdSampul', 'image', 'media/sampul.png'),
                                            ('rIdPembatas', 'image', 'media/pembatas.png'), ('rIdBelakang', 'image', 'media/belakang.png')]),
        'word/_rels/header1.xml.rels': rel([('rIdLogo', 'image', 'media/logo.png')]),
        'word/media/grafik.png': png(330, 80, rgb('tint.netral.pita')),
        'word/media/foto.png': png(160, 100, rgb('tint.basah.pita')),
        'word/media/matriks.png': png(160, 50, rgb('tint.netral.muda')),
        'word/media/sampul.png': png(210, 120, rgb('tint.basah.pita')),
        'word/media/pembatas.png': png(210, 90, rgb('navy')),
        'word/media/belakang.png': png(210, 90, rgb('navy')),
        'word/media/logo.png': LOGO.read_bytes(),
    }
    return parts, k.manifest, {'total': total, 'baris': baris, 'rusak': rusak, 'v24': v24}


def halaman_indeks(pdf):
    """{judul entri indeks (kapital, dinormalkan): label halaman} dari PDF: halaman terakhir tempat judul tercetak
    (halaman Daftar Isi sendiri juga memuat teksnya, jadi diambil kemunculan terakhir)."""
    f = periksa.Pdf(pdf)
    out = {}
    for t in [t for t, _ in DAFTAR_ISI] + DAFTAR_TABEL + DAFTAR_GAMBAR:
        j = periksa.norm(t).upper()
        ada = [a for a in (periksa.label_halaman(f.tata[i]) for i, x in enumerate(f.hal) if j in periksa.norm(x).upper()) if a]
        if ada:
            out[j] = ada[-1]
    return out


# ---------------------------------------------------------------- PPTX

def a_run(t, pt, b=False, warna=None, spc=None):
    warna = warna or H['teks']
    return (f'<a:r><a:rPr lang="id-ID" sz="{round(pt * 100)}"{" b=" + chr(34) + "1" + chr(34) if b else ""}'
            f'{" spc=" + chr(34) + str(spc) + chr(34) if spc else ""} dirty="0">'
            f'<a:solidFill><a:srgbClr val="{warna}"/></a:solidFill><a:latin typeface="Roboto"/><a:ea typeface="Roboto"/>'
            f'<a:cs typeface="Roboto"/></a:rPr><a:t>{esc(t)}</a:t></a:r>')


def a_sp(n, nama, x, y, w, h, paras, isi=None, anchor='t', garis=None, algn=None, geom=None, lins=0):
    fill = f'<a:solidFill><a:srgbClr val="{isi}"/></a:solidFill>' if isi else '<a:noFill/>'
    ln = f'<a:ln w="9525"><a:solidFill><a:srgbClr val="{garis}"/></a:solidFill></a:ln>' if garis else '<a:ln><a:noFill/></a:ln>'
    geom = geom or ('roundRect' if isi or garis else 'rect')
    ppr = f'<a:pPr algn="{algn}"/>' if algn else ''
    return (f'<p:sp><p:nvSpPr><p:cNvPr id="{n}" name="{nama}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr>'
            f'<a:xfrm><a:off x="{EMU(x)}" y="{EMU(y)}"/><a:ext cx="{EMU(w)}" cy="{EMU(h)}"/></a:xfrm>'
            f'<a:prstGeom prst="{geom}"><a:avLst/></a:prstGeom>{fill}{ln}</p:spPr><p:txBody>'
            f'<a:bodyPr wrap="square" lIns="{EMU(lins)}" tIns="0" rIns="{EMU(lins)}" bIns="0" anchor="{anchor}"/><a:lstStyle/>'
            + ''.join(f'<a:p>{ppr}{x_}</a:p>' for x_ in paras) + '</p:txBody></p:sp>')


def a_garis(n, y, warna=None):
    return (f'<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="{n}" name="Garis {n}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr>'
            f'<a:xfrm><a:off x="{EMU(SL["margin_kiri_pt"])}" y="{EMU(y)}"/><a:ext cx="{EMU(SL["lebar_isi_pt"])}" cy="0"/></a:xfrm>'
            f'<a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="{EMU(SL["garis"]["tebal_pt"])}"><a:solidFill>'
            f'<a:srgbClr val="{warna or hx(SL["garis"]["warna"])}"/></a:solidFill></a:ln></p:spPr></p:cxnSp>')


def a_pic(n, rid, x, y, w, h, nama='Gambar'):
    return (f'<p:pic><p:nvPicPr><p:cNvPr id="{n}" name="{nama}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="{rid}"/>'
            f'<a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="{EMU(x)}" y="{EMU(y)}"/>'
            f'<a:ext cx="{EMU(w)}" cy="{EMU(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>')


def a_tabel(n, x, y, kepala, baris, total):
    lebar = 420
    kol = [EMU(lebar * 0.6), EMU(lebar * 0.4)]
    ln = f'<a:lnB w="6350"><a:solidFill><a:srgbClr val="{H["garis"]}"/></a:solidFill></a:lnB>'

    def tc_(t, jc, b=False, fill=None, warna=None):
        f = f'<a:solidFill><a:srgbClr val="{fill}"/></a:solidFill>' if fill else '<a:noFill/>'
        return (f'<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr algn="{jc}"/>{a_run(t, 8, b, warna)}</a:p></a:txBody>'
                f'<a:tcPr><a:lnL w="0"><a:noFill/></a:lnL><a:lnR w="0"><a:noFill/></a:lnR>{ln}{f}</a:tcPr></a:tc>')
    rows = [''.join(tc_(t, 'ctr', True, H['navy'], H['kertas']) for t in kepala)]
    rows += [''.join(tc_(t, 'l' if i == 0 else 'r', i == 0) for i, t in enumerate(b)) for b in baris]
    rows += [''.join(tc_(t, 'l' if i == 0 else 'r', True, H['navy'], H['kertas']) for i, t in enumerate(total))]
    return (f'<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="{n}" name="Tabel penduduk"/><p:cNvGraphicFramePr>'
            '<a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>'
            f'<p:xfrm><a:off x="{EMU(x)}" y="{EMU(y)}"/><a:ext cx="{sum(kol)}" cy="{EMU(18 * len(rows))}"/></p:xfrm>'
            '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="1"/>'
            '<a:tblGrid>' + ''.join(f'<a:gridCol w="{w}"/>' for w in kol) + '</a:tblGrid>'
            + ''.join(f'<a:tr h="{EMU(18)}">{x_}</a:tr>' for x_ in rows) + '</a:tbl></a:graphicData></a:graphic></p:graphicFrame>')


def pptx_bersih():
    """Slide data dengan kerangka Buku Pegangan: judul 2 baris (lebar 644 pt karena ada pil CUT OFF), garis y95 dan
    y507,6, pil CUT OFF DATA navy, tabel berikon di kepala, pil keyakinan garis (C6.2), footer dan nomor halaman."""
    k = naskah.Konteks()
    v15 = k.suntik('irbi.nasional.2015', 'fmt=2', 'uji:slide1')
    v24 = k.suntik('irbi.nasional.2024', 'fmt=2', 'uji:slide1')
    arah = k.suntik('irbi.nasional.persen_2015_2024', 'fmt=1|persen|arah', 'uji:slide1')
    kep, baris, total = naskah_tabel(k)
    jk, ts, kb = SL['judul_kotak'], SL['tipografi'], SL['komponen']['bingkai']
    pt_j = ts['judul_temuan']['ukuran_pt'][1]
    judul = (a_run('Rerata IRBI nasional ', pt_j, True) + a_run(arah, pt_j, True, H['oranye'])
             + a_run(' dari ', pt_j, True) + a_run(v15, pt_j, True, H['oranye']) + a_run(' pada 2015 menjadi ', pt_j, True)
             + a_run(v24, pt_j, True, H['oranye']) + a_run(' pada 2024', pt_j, True))
    lg, kaki = SL['logo'], SL['footer']
    cut = a_sp(3, 'Cut off', 696, 70, 200, 18, [
        a_run(TEMA['qa']['cut_off_teks'], ts['cut_off_label']['ukuran_pt'], True, hx(ts['cut_off_label']['warna']), 100)
        + a_run('   23 Okt 2026', ts['cut_off_nilai']['ukuran_pt'], True, hx(ts['cut_off_nilai']['warna']))],
        isi=H['navy'], anchor='ctr', algn='ctr')
    spk = TEMA['kosakata']['keyakinan']['asumsi-kebijakan']
    nomor = a_sp(10, 'Nomor halaman', SL['tepi_kanan_isi_pt'] - kb['nomor_lebar_pt'], kaki['y_pt'], kb['nomor_lebar_pt'],
                 kb['footer_tinggi_pt'], [a_run('1', ts['nomor_halaman']['ukuran_pt'], True, hx(ts['nomor_halaman']['warna']))], algn='r')
    pohon = (a_sp(2, 'Judul', jk['x_pt'], jk['y_pt'], jk['lebar_dengan_pil_pt'], jk['tinggi_pt'][1], [judul], anchor='b')
             + cut + a_garis(4, SL['garis']['y_pt'][0]) + a_garis(5, SL['garis']['y_pt'][1])
             + a_tabel(6, SL['margin_kiri_pt'], 110, kep, baris, total)
             + a_pic(7, 'rIdIkon', SL['margin_kiri_pt'] + 4, 113, 12, 12, 'Ikon kepala')
             + a_sp(8, 'Pil keyakinan', 480, 110, 110, 16, [a_run(spk['label'], ts['chip']['ukuran_pt'], True, hx(spk['pil_teks']))],
                    garis=hx(spk['pil_garis']), anchor='ctr', algn='ctr')
             + a_sp(9, 'Footer', SL['margin_kiri_pt'], kaki['y_pt'], kb['footer_lebar_pt'], kb['footer_tinggi_pt'],
                    [a_run(kaki['teks'], kaki['ukuran_pt'], False, hx(kaki['warna']))])
             + nomor + a_pic(11, 'rIdImg', lg['x_pt'], lg['y_pt'], lg['lebar_pt'], lg['tinggi_pt'], 'Logo'))
    grp = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>'
    rel = lambda rs: XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + ''.join(
        f'<Relationship Id="{i}" Type="{RELS}/{t}" Target="{g}"/>' for i, t, g in rs) + '</Relationships>'
    parts = {
        '[Content_Types].xml': XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/>'
        f'<Override PartName="/ppt/presentation.xml" ContentType="{CT}presentationml.presentation.main+xml"/>'
        f'<Override PartName="/ppt/slides/slide1.xml" ContentType="{CT}presentationml.slide+xml"/>'
        f'<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="{CT}presentationml.slideLayout+xml"/>'
        f'<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="{CT}presentationml.slideMaster+xml"/>'
        f'<Override PartName="/ppt/theme/theme1.xml" ContentType="{CT}theme+xml"/></Types>',
        '_rels/.rels': rel([('rId1', 'officeDocument', 'ppt/presentation.xml')]),
        'ppt/presentation.xml': XML + f'<p:presentation {NS_P}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/>'
        f'</p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="{EMU(SL["lebar_pt"])}" '
        f'cy="{EMU(SL["tinggi_pt"])}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>',
        'ppt/_rels/presentation.xml.rels': rel([('rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'),
                                                ('rId2', 'slide', 'slides/slide1.xml'), ('rId3', 'theme', 'theme/theme1.xml')]),
        'ppt/slideMasters/slideMaster1.xml': XML + f'<p:sldMaster {NS_P}><p:cSld><p:spTree>{grp}</p:spTree></p:cSld>'
        '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" '
        'accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>'
        '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>',
        'ppt/slideMasters/_rels/slideMaster1.xml.rels': rel([('rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'),
                                                             ('rId2', 'theme', '../theme/theme1.xml')]),
        'ppt/slideLayouts/slideLayout1.xml': XML + f'<p:sldLayout {NS_P} type="blank" preserve="1"><p:cSld name="Putih">'
        f'<p:spTree>{grp}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>',
        'ppt/slideLayouts/_rels/slideLayout1.xml.rels': rel([('rId1', 'slideMaster', '../slideMasters/slideMaster1.xml')]),
        'ppt/slides/slide1.xml': XML + f'<p:sld {NS_P}><p:cSld><p:spTree>{grp}{pohon}</p:spTree></p:cSld>'
        '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>',
        'ppt/slides/_rels/slide1.xml.rels': rel([('rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'),
                                                ('rIdImg', 'image', '../media/logo.png'), ('rIdIkon', 'image', '../media/ikon.png')]),
        'ppt/theme/theme1.xml': tema_pptx(),
        'ppt/media/logo.png': LOGO.read_bytes(),
        'ppt/media/ikon.png': IKON.read_bytes(),
    }
    return parts, k.manifest, {'cut': cut, 'nomor': nomor, 'v24': v24}


# ---------------------------------------------------------------- PDF tangan (Helvetica, untuk gerbang PDF)

def pdf_tangan(path, halaman):
    objs = {1: b'<< /Type /Catalog /Pages 2 0 R >>',
            3: b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'}
    kids = []
    for i, teks in enumerate(halaman):
        c, pg = 4 + 2 * i, 5 + 2 * i
        t = teks.encode('cp1252').replace(b'\\', b'\\\\').replace(b'(', b'\\(').replace(b')', b'\\)')
        isi = b'BT /F1 12 Tf 72 720 Td (' + t + b') Tj ET'
        objs[c] = b'<< /Length %d >>\nstream\n' % len(isi) + isi + b'\nendstream'
        objs[pg] = b'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents %d 0 R >>' % c
        kids.append(b'%d 0 R' % pg)
    objs[2] = b'<< /Type /Pages /Kids [' + b' '.join(kids) + b'] /Count %d >>' % len(halaman)
    out, off = bytearray(b'%PDF-1.4\n'), {}
    for k in sorted(objs):
        off[k] = len(out)
        out += b'%d 0 obj\n' % k + objs[k] + b'\nendobj\n'
    x = len(out)
    out += b'xref\n0 %d\n0000000000 65535 f \n' % (len(objs) + 1) + b''.join(b'%010d 00000 n \n' % off[k] for k in sorted(objs))
    out += b'trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n' % (len(objs) + 1, x)
    Path(path).write_bytes(bytes(out))


# ---------------------------------------------------------------- jalan

def periksa_ctx(ketat=False, visual=None, **kw):
    log = []
    ctx = periksa.Ctx(visual=visual, **kw)
    hasil = periksa.jalankan(ctx, semua=True, ketat=ketat, tulis=log.append)
    gagal = {k for k, s, _ in hasil if s == 'GAGAL'}
    return gagal, log


PUSTAKA_BERSIH = {'kajian': 'air', 'status': 'draf', 'bab': {'1': ['bnpb-2025-renas', 'haque-2012-siklon']}}


def tulis_manifest(path, man, mentah=None, pustaka=None):
    isi = mentah if mentah is not None else json.dumps({'angka': man, **({'pustaka': pustaka} if pustaka else {})},
                                                       ensure_ascii=False, indent=1)
    periksa.nama_manifest(path).write_text(isi, encoding='utf-8')


def render(src, tujuan):
    shutil.copy(periksa.render_docx(src)[1], tujuan)
    return tujuan


# tabel rekomendasi Tabel 1.3 fixture bersih: diganti diagram garis waktu di tempat yang sama (keterangan, Sumber, Daftar Tabel tetap)
POLA_REK = r'<w:tbl>(?:(?!<w:tbl>).)*?Perluas peringatan dini banjir.*?</w:tbl>'


def garis_waktu(isi_kepala=None, vertikal='single'):
    """Diagram garis waktu B5.12: tiga kolom fase kosakata, baris kepala w:tblHeader bertint kotak.garis-waktu.warna_pita, garis pemisah
    antarkolom (insideV), w:tblCaption "garis-waktu" (qa/periksa.py d20_garis_waktu)."""
    fase = [v['label'] for k, v in TEMA['kosakata']['fase'].items() if not k.startswith('_')]
    kol = [LEBAR // 3] * 3
    isi_kepala = isi_kepala or hx(TEMA['kotak']['garis-waktu']['warna_pita'])
    kep = tr([tc(p(r(f, True), 'IsiTabel'), w, isi_kepala) for f, w in zip(fase, kol)], True)
    aksi = ['Perbarui rencana kontinjensi banjir', 'Aktifkan pos komando', 'Kaji kebutuhan pemulihan']
    return tbl([kep, tr([tc(p(r(x), 'IsiTabel'), w) for x, w in zip(aksi, kol)])], kol, tblcap='garis-waktu', vertikal=vertikal)


def tema_pustaka(bab_min, kajian_min, resmi_persen):
    """tema.json dengan ambang L65 yang disetel (kenop qa.pustaka), supaya cabang lolos dan gagal teruji tanpa 50 entri pustaka."""
    t = copy.deepcopy(TEMA)
    t['qa']['pustaka'].update(bab_min=bab_min, kajian_min={'air': kajian_min, 'mitigasi': kajian_min}, resmi_primer_min_persen=resmi_persen)
    return t


def kasus_negatif(dp, dman, info, pp, pman, pinfo, pdf_d):
    """[(nama, jenis, parts, harap, ekstra)]; ekstra.pesan = potongan khas cabang yang wajib muncul di temuan kodenya."""
    D, PP, H1, F1 = 'word/document.xml', 'ppt/slides/slide1.xml', 'word/header1.xml', 'word/footer1.xml'
    # sufiks a/b/c kutipan BNPB bergeser tiap pustaka tumbuh: pakai kutipan yang sudah ada di fixture bersih (terdaftar di Daftar Pustaka)
    KUTIPAN_BNPB = re.search(r'\(BNPB, \d{4}[a-z]?\)', dp[D])[0]
    run_sisip = f'<w:r><w:t xml:space="preserve">{SISIP}</w:t></w:r>'
    sisip = lambda teks: ganti(dp, D, SISIP, esc(teks))
    tambah_slide = lambda xml: ganti(pp, PP, '</p:spTree>', xml + '</p:spTree>')
    ket = keterangan
    sumber_tbl = 'WorldPop 2026; data per 23 Okt 2026 </w:t></w:r>' + pil('Asumsi kebijakan')
    tot = info['total'][1]
    tot2 = lambda d: naskah.fmt_id(periksa.angka_id(tot) + d)
    v24 = next(m for m in dman if m['kunci'] == 'irbi.nasional.2024')
    man_basi = copy.deepcopy(dman)
    next(m for m in man_basi if m['kunci'] == 'irbi.nasional.2024')['nilai'] += 1
    man_csv = copy.deepcopy(dman)
    next(m for m in man_csv if m['kunci'].startswith('csv:'))['nilai'] = 0.5
    tema_ketat = copy.deepcopy(TEMA)
    tema_ketat['kajian']['air']['batas_halaman_isi'] = 0
    cl = SL['tipografi']['cut_off_label']
    warisan = (f'<p:sp><p:nvSpPr><p:cNvPr id="31" name="Catatan warisan"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr>'
               f'<a:xfrm><a:off x="{EMU(620)}" y="{EMU(300)}"/><a:ext cx="{EMU(250)}" cy="{EMU(16)}"/></a:xfrm>'
               '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle><a:lvl1pPr>'
               '<a:defRPr sz="400"/></a:lvl1pPr></a:lstStyle><a:p><a:r><a:rPr lang="id-ID"><a:latin typeface="Roboto"/></a:rPr>'
               '<a:t>catatan yang sangat kecil sekali</a:t></a:r></a:p></p:txBody></p:sp>')
    skema = ('<p:sp><p:nvSpPr><p:cNvPr id="30" name="Kotak"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/>'
             '<a:ext cx="127000" cy="127000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill>'
             '<a:schemeClr val="accent1"/></a:solidFill></p:spPr></p:sp>')
    awal_toc = dp[D].index('<w:p><w:pPr><w:pStyle w:val="TOC1"/>')
    akhir_toc = dp[D].index('<w:p><w:pPr><w:pStyle w:val="JudulDepan"/></w:pPr><w:r><w:t xml:space="preserve">DAFTAR TABEL')
    toc_kosong = ganti(dp, D, dp[D][awal_toc:akhir_toc], toc(' TOC \\o "1-3" \\h \\z \\u ', []))
    i_gbr = dp[D].rindex('<w:p>', 0, dp[D].index('\\c &quot;Gambar&quot;'))
    gbr_kosong = ganti(dp, D, dp[D][i_gbr:dp[D].index('<w:p><w:pPr><w:sectPr>', i_gbr)], toc(' TOC \\h \\z \\c "Gambar" ', []))
    entri_pustaka = 'DAFTAR PUSTAKA</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t xml:space="preserve">'
    n_pustaka = dp[D].index('<w:p><w:pPr><w:sectPr>', dp[D].index('w:val="Pustaka"'))
    pustaka_sisip = lambda x: dict(dp, **{D: dp[D][:n_pustaka] + x + dp[D][n_pustaka:]})
    depan_akhir = p('', sect=seksi('lowerRoman', TEMA['docx']['romawi_mulai']))
    bab_br = ganti(ganti(dp, D, p(r('PENDAHULUAN'), 'Heading1'),
                         p(r('BAB 1') + '<w:r><w:br/></w:r>' + r('PENDAHULUAN'), 'Heading1',
                           extra='<w:numPr><w:ilvl w:val="0"/><w:numId w:val="0"/></w:numPr>')),
                   'word/numbering.xml', '<w:lvlText w:val="BAB %1"/>', '<w:lvlText w:val=""/>')
    svg = FIX / 'd16-svg.svg'
    svg.write_text('<svg xmlns="http://www.w3.org/2000/svg"><text font-family="Roboto">1,234 jiwa; 3.5 mm</text></svg>', encoding='utf-8')
    css = FIX / 'd4-gaya.css'
    css.write_text('body { font-family: Arial, sans-serif; }\n@font-face { src: url("https://fonts.example.org/roboto.woff2"); }\n',
                   encoding='utf-8')
    svg_hex = FIX / 'd9-svg.svg'
    svg_hex.write_text('<svg xmlns="http://www.w3.org/2000/svg"><rect fill="#123456"/></svg>', encoding='utf-8')
    pil_resmi = pil('Resmi')
    kep_lamp = f'w:color="{hx("teks-3")}"/></w:tcBorders></w:tcPr><w:p><w:pPr><w:pStyle w:val="KepalaLampiran"/>'
    kepala_t11 = ('<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>' + ''.join(f'<w:gridCol w:w="{w}"/>' for w in KW)
                  + '</w:tblGrid><w:tr><w:trPr><w:tblHeader/></w:trPr>' + tc(p(r('NO'), 'KepalaTabel'), KW[0], H['navy']))
    assert dp[D].index(kepala_t11) < dp[D].index('Perluas peringatan dini'), 'kepala Tabel 1.1 harus muncul sebelum tabel rekomendasi'
    zebra = dp[D]
    for i in range(1, len(info['baris']), 2):
        lama = (f'<w:tc><w:tcPr><w:tcW w:w="{KW[0]}" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:pStyle w:val="IsiTabel"/>'
                f'<w:jc w:val="center"/></w:pPr><w:r><w:t xml:space="preserve">{i + 1}<')
        assert lama in zebra, 'mutasi selang-seling tidak menemukan sel NO'
        zebra = zebra.replace(lama, lama.replace('w:type="dxa"/></w:tcPr>', f'w:type="dxa"/><w:shd w:val="clear" w:color="auto" '
                                                 f'w:fill="{hx("tint.netral.muda")}"/></w:tcPr>'), 1)
    foto_lain = ket('Gambar', 1, 3, 'Waduk Jatiluhur dari udara, akses Oktober 2026') + FOTO_P.replace('id="3"', 'id="7"')
    pil_teks = (a_sp(42, 'Pil label', 600, 300, 120, 16, [a_run('CUT OFF DATA', 6.4, True, hx('batas'))], isi=H['navy'], algn='l', lins=4)
                + a_sp(43, 'Tanggal pil', 660, 300, 56, 16, [a_run('23 Okt 2026', 6.4, True, H['kertas'])], anchor='ctr'))
    panel = (a_sp(40, 'Panel', 600, 150, 300, 60, [''], isi=hx('tint.netral.muda'))
             + a_sp(41, 'Isi panel', 610, 160, 280, 48, [a_run('Dua titik pantau baru di hulu', 8)], anchor='b'))
    sl_ = pp[PP]
    i_j = sl_.index('name="Judul"')
    j_j = sl_.index('</p:sp>', i_j)
    judul_kapital = dict(pp, **{PP: sl_[:i_j] + re.sub(r'<a:t>([^<]*)</a:t>', lambda m: f'<a:t>{m[1].upper()}</a:t>', sl_[i_j:j_j]) + sl_[j_j:]})
    nh_gaya = f'<w:b/><w:color w:val="{hx(TD["nomor_halaman"]["warna"])}"/><w:sz w:val="{HP("nomor_halaman")}"/>'
    return [
        ('d1-em-dash', 'docx', sisip('Kajian ini \u2014 memakai data resmi lembaga.'), {'D-1'}, {'pesan': ['em dash']}),
        ('d2-titik-tengah-pptx', 'pptx', ganti(pp, PP, 'Rerata IRBI nasional ', 'Rerata IRBI \u00b7 nasional '), {'D-2'}, {'pesan': ['titik tengah']}),
        ('d3-emoji', 'docx', sisip(SISIP + ' \U0001F525'), {'D-3', 'D-23'}, {'pesan': ['emoji']}),
        ('d4-arial-docx', 'docx', ganti(dp, D, run_sisip, run_sisip.replace(
            '<w:r>', '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr>')), {'D-4'}, {'pesan': ['w:rFonts ascii="Arial"']}),
        ('d4-tema-calibri-pptx', 'pptx', {**pp, 'ppt/theme/theme1.xml': tema_pptx('Calibri')}, {'D-4'}, {'pesan': ['font tema harus Roboto']}),
        ('d4-bufont-master-pptx', 'pptx', ganti(pp, 'ppt/slideMasters/slideMaster1.xml', '</p:sldLayoutIdLst>',
                                                '</p:sldLayoutIdLst><p:txStyles><p:bodyStyle><a:lvl1pPr><a:buFont typeface="Arial"/>'
                                                '</a:lvl1pPr></p:bodyStyle></p:txStyles>'), {'D-4'}, {'pesan': ['a:buFont typeface="Arial"']}),
        ('d4-css-lain', 'docx', dp, {'D-4'}, {'lain': [css], 'pesan': ['font-family: Arial', 'URL font CDN']}),
        ('d5-7pt-docx', 'docx', ganti(dp, D, run_sisip, run_sisip.replace('<w:r>', '<w:r><w:rPr><w:sz w:val="14"/></w:rPr>')), {'D-5'},
         {'pesan': ['w:sz=14']}),
        ('d5-5pt-pptx', 'pptx', tambah_slide(a_sp(21, 'Catatan', 700, 320, 120, 10, [a_run('catatan sangat kecil', 5.5)])), {'D-5'},
         {'pesan': ['5.50 pt < 6 pt']}),
        ('d5-warisan-pptx', 'pptx', tambah_slide(warisan), {'D-5'}, {'pesan': ['diwarisi']}),
        ('d5-chip-boleh-pptx', 'pptx', tambah_slide(a_sp(20, 'Chip', 700, 300, 60, 10, [a_run('sementara', 5.5, True, H['kertas'])], isi=H['oranye'])),
         set()),
        ('d6-manifest-basi', 'docx', dp, {'D-6'}, {'manifest': man_basi, 'pesan': ['angka basi']}),
        ('d6-jumlah-salah', 'docx', ganti(dp, D, f'>{tot}<', f'>{tot2(1000)}<'), {'D-6'}, {'pesan': ['baris Jumlah kolom 3']}),
        ('d6-jumlah-meleset-2', 'docx', ganti(dp, D, f'>{tot}<', f'>{tot2(2)}<'), {'D-6'}, {'pesan': ['nilai CSV mentah']}),
        ('d6-jumlah-bulat-persis', 'docx', ganti(dp, D, f'>{tot}<', f'>{tot2(2)}<'), {'D-6', 'D-22'},
         {'manifest': [m for m in dman if not m['kunci'].startswith('csv:')], 'pesan': ['baris tampil', 'toleransi 0,00']}),
        ('d6-tidak-tampil', 'docx', dp, {'D-6'}, {'manifest': dman + [dict(v24, tampil='999,99')], 'pesan': ['tidak tampil di berkas']}),
        ('d6-format-registri', 'docx', ganti(dp, D, f' {v24["tampil"]} pada 2024', ' 128,5 pada 2024'), {'D-6'},
         {'manifest': [dict(m, tampil='128,5') if m is v24 else m for m in dman], 'pesan': ['format registri']}),
        ('d6-csv-basi', 'docx', dp, {'D-6'}, {'manifest': man_csv, 'pesan': ['tidak ada lagi di kolom']}),
        ('d6-registri-menolak', 'docx', dp, {'D-6'}, {'manifest': dman + [dict(v24, kunci='irbi.tidak.ada')], 'pesan': ['registri menolak']}),
        ('d6-turunan-tanpa-sumber', 'docx', dp, {'D-6'},
         {'manifest': dman + [{'kunci': 'turunan:uji#ubah', 'tampil': v24['tampil'], 'nilai': 1.0, 'naskah': 'uji'}], 'pesan': ['angka turunan tanpa']}),
        ('d6-manifest-skema', 'docx', dp, {'D-6'}, {'manifest_mentah': json.dumps(dman), 'pesan': ['harus objek berkunci']}),
        ('d6-beda-berkas', 'docx+pptx', dp, {'D-6'},
         {'pptx_parts': ganti(pp, PP, f'>{pinfo["v24"]}<', '>128,5<'),
          'manifest_pptx': [dict(m, tampil='128,5') if m['kunci'] == 'irbi.nasional.2024' else m for m in pman], 'pesan': ['tampil beda antar berkas']}),
        ('d7-nomor-loncat', 'docx', ganti(dp, D, ket('Tabel', 1, 3, J['rek']), ket('Tabel', 1, 4, J['rek'])), {'D-7'}, {'pesan': ['loncat']}),
        ('d7-nomor-ganda', 'docx', ganti(dp, D, ket('Tabel', 1, 3, J['rek']), ket('Tabel', 1, 2, J['rek'])), {'D-7'}, {'pesan': ['ganda']}),
        ('d7-awalan-ulang', 'docx', ganti(dp, D, ket('Tabel', 1, 2, J['kartu']), ket('Tabel', 'A', 2, J['kartu'])), {'D-7', 'D-20'}, {'pesan': ['muncul lagi']}),
        ('d7-tanpa-sumber', 'docx', ganti(dp, D, '<w:t xml:space="preserve">Sumber: </w:t></w:r><w:r><w:t xml:space="preserve">InaRISK BNPB, IRBI 2015',
                                          '<w:t xml:space="preserve">Data: </w:t></w:r><w:r><w:t xml:space="preserve">InaRISK BNPB, IRBI 2015'), {'D-7'},
         {'pesan': ['Gambar 1.1: baris "Sumber:" tidak ada']}),
        ('d7-legenda-antara', 'docx', ganti(dp, D, '</w:tbl>' + p(r('Sumber: ', True) + r('WorldPop 2026; data per 23 Okt 2026 ') + pil('Asumsi kebijakan'), 'Sumber'),
                                            '</w:tbl>' + p(r('Legenda: baris biru tua adalah jumlah kab/kota.'))
                                            + p(r('Sumber: ', True) + r('WorldPop 2026; data per 23 Okt 2026 ') + pil('Asumsi kebijakan'), 'Sumber')),
         {'D-7', 'D-14'}, {'pesan': ['Tabel 1.1: baris "Sumber:" tidak ada']}),
        ('d7-legenda-baris-akhir', 'docx', ganti(dp, D, f'>{tot}</w:t></w:r></w:p></w:tc></w:tr></w:tbl>',
                                                 f'>{tot}</w:t></w:r></w:p></w:tc></w:tr>'
                                                 + tr([tc(p(r('Legenda: baris biru tua adalah jumlah kab/kota.'), 'IsiTabel'), LEBAR, span=3)]) + '</w:tbl>'),
         set()),
        ('d7-tidak-diawali', 'docx', ganti(dp, D, ket('Gambar', 1, 2, J['foto']), p(r('Foto ' + J['foto']), 'Caption')), {'D-7'},
         {'pesan': ['tidak diawali "Gambar n.m"']}),
        ('d7-bukan-tabel', 'docx', ganti(dp, D, ket('Gambar', 1, 2, J['foto']), ket('Tabel', 1, 4, J['foto'])), {'D-7', 'D-14'},
         {'pesan': ['objek di bawahnya bukan tabel']}),
        ('d7-tanpa-objek', 'docx', ganti(dp, D, FOTO_P, ''), {'D-7'}, {'pesan': ['tidak ada tabel atau gambar tepat di bawah']}),
        ('d7-tabel-tanpa-keterangan', 'docx', ganti(dp, D, ket('Tabel', 1, 3, J['rek']), ''), {'D-7'}, {'pesan': ['tanpa keterangan "Tabel n.m"']}),
        ('d7-gambar-tanpa-keterangan', 'docx', ganti(dp, D, ket('Gambar', 1, 2, J['foto']), ''), {'D-7'}, {'pesan': ['tanpa keterangan "Gambar n.m"']}),
        ('d7-daftar-tidak-ada', 'docx', ganti(dp, D, esc(' TOC \\h \\z \\c "Gambar" '), ' TOC \\h \\z \\f x '), {'D-7'},
         {'pesan': ['(Daftar Gambar) tidak ada']}),
        ('d7-daftar-basi', 'docx', ganti(dp, D, FOTO_P + p(r('Sumber: ', True) + r(FOTO_SUMBER), 'Sumber'),
                                         FOTO_P + p(r('Sumber: ', True) + r(FOTO_SUMBER), 'Sumber') + foto_lain
                                         + p(r('Sumber: ', True) + r(FOTO_SUMBER), 'Sumber')), {'D-7'}, {'pesan': ['perbarui indeks']}),
        ('d9-hex-terlarang', 'docx', ganti(dp, D, run_sisip, run_sisip.replace('<w:r>', '<w:r><w:rPr><w:color w:val="D9650B"/></w:rPr>')),
         {'D-9'}, {'pesan': ['terlarang, PEDOMAN B1.6']}),
        ('d9-hex-slide', 'pptx', ganti(pp, PP, f'<a:srgbClr val="{H["teks"]}"/>', '<a:srgbClr val="123456"/>'), {'D-9'},
         {'pesan': ['slide1.xml: #123456']}),
        ('d9-skema-tema-pptx', 'pptx', {**tambah_slide(skema), 'ppt/theme/theme1.xml': tema_pptx(accent1='0F1E2D')}, {'D-9'},
         {'pesan': ['warna skema accent1 #0F1E2D']}),
        ('d9-themecolor-docx', 'docx', {**ganti(dp, D, run_sisip, run_sisip.replace('<w:r>', '<w:r><w:rPr><w:color w:val="1A1A1A" w:themeColor="accent1"/></w:rPr>')),
                                        'word/theme/theme1.xml': tema_xml('4472C4')}, {'D-9'}, {'pesan': ['warna skema accent1 #4472C4']}),
        ('d9-chart-pptx', 'pptx', {**pp, 'ppt/charts/chart1.xml': XML + '<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" '
                                   'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:srgbClr val="70AD47"/></c:chartSpace>'},
         {'D-9'}, {'pesan': ['chart1.xml: #70AD47']}),
        ('d9-svg-lain', 'docx', dp, {'D-9'}, {'lain': [svg_hex], 'pesan': ['d9-svg.svg mentah: #123456']}),
        ('d10-titik-api', 'docx', sisip('Kajian ini memakai data titik api.'), {'D-10'}, {'pesan': ['"titik api"']}),
        ('d10-tag-riset', 'docx', sisip('Kajian ini memakai data resmi lembaga [TIDAK DITEMUKAN].'), {'D-10'}, {'pesan': ['[TIDAK DITEMUKAN]']}),
        ('d10-peluang-100', 'docx', sisip('Peluang banjir musim ini 100% menurut kajian.'), {'D-10', 'D-22'}, {'pesan': ['"100%" pada peluang']}),
        ('d10-frasa-biasa-boleh', 'docx', sisip('Data kejadian sebelum Data dan Informasi Bencana Indonesia (DIBI) tidak ditemukan di arsip lembaga.'), set()),
        ('d11-kapital-isi', 'docx', sisip('KAJIAN INI MEMAKAI DATA RESMI LEMBAGA.'), {'D-11'}, {'pesan': ['di isi; hanya singkatan resmi']}),
        ('d11-judul-bab-kecil', 'docx', ganti(dp, D, p(r('PENDAHULUAN'), 'Heading1'), p(r('Pendahuluan'), 'Heading1')), {'D-11'},
         {'pesan': ['judul bab harus KAPITAL']}),
        ('d11-subbab-kapital', 'docx', ganti(dp, D, p(rt('1.1\tLatar Belakang'), 'Heading2'), p(rt('1.1\tLATAR BELAKANG'), 'Heading2')), {'D-11'},
         {'pesan': ['judul tingkat 2 kapital penuh']}),
        ('d11-judul-slide-kapital', 'pptx', judul_kapital, {'D-11', 'D-6', 'D-22'},  # angka arah ikut dikapitalkan, jadi D-6/D-22 juga
         {'pesan': ['judul slide kapital penuh']}),
        ('d12-melebihi-batas', 'docx+pdf', dp, {'D-12'}, {'tema': tema_ketat, 'pesan': ['halaman isi > batas']}),
        ('d13-toc-kosong', 'docx', toc_kosong, {'D-13'}, {'pesan': ['hasil bidang TOC kosong']}),
        ('d13-pdf-toc-kosong', 'docx+pdf', toc_kosong, {'D-13'}, {'render': True, 'pesan': ['tidak tercetak di Daftar Isi PDF']}),
        ('d13-updatefields', 'docx', {**dp, 'word/settings.xml': dp['word/settings.xml'].replace('w:val="true"', 'w:val="false"')}, {'D-13'},
         {'pesan': ['w:updateFields tidak aktif']}),
        ('d13-tanpa-toc', 'docx', ganti(dp, D, esc(' TOC \\o "1-3" \\h \\z \\u \\t "Judul Lampiran,1" '), ' INDEX '), {'D-13'},
         {'pesan': ['bidang TOC daftar isi tidak ada']}),
        ('d13-judul-tak-di-toc', 'docx', ganti(dp, D, entri_pustaka, 'DAFTAR RUJUKAN</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t xml:space="preserve">'),
         {'D-13'}, {'pesan': ['judul "DAFTAR PUSTAKA" tidak ada di Daftar Isi']}),
        ('d13-daftar-kosong', 'docx', gbr_kosong, {'D-13'}, {'pesan': ['Daftar Gambar: hasil bidang kosong']}),
        ('d13-gaya-toc', 'docx', ganti(dp, D, '<w:p><w:pPr><w:pStyle w:val="TOC2"/></w:pPr><w:r><w:t xml:space="preserve">1.1<',
                                       '<w:p><w:pPr><w:pStyle w:val="TOC1"/></w:pPr><w:r><w:t xml:space="preserve">1.1<'), {'D-13'},
         {'pesan': ['bergaya toc 1, harus toc 2']}),
        ('d13-tanpa-seq', 'docx', ganti(dp, D, ket('Tabel', 1, 3, J['rek']), p(r('Tabel 1.3') + r(' ' + J['rek'], False, H['teks']), 'Caption')),
         {'D-13'}, {'pesan': ['tanpa bidang SEQ']}),
        ('d13-depan-desimal', 'docx', ganti(dp, D, depan_akhir, p('', sect=seksi('decimal', 2))), {'D-13'},
         {'pesan': ['bagian depan harus romawi kecil, tertulis fmt=decimal']}),
        ('d13-depan-warisan', 'docx', ganti(dp, D, depan_akhir, depan_akhir + p('', sect=seksi('decimal', acuan=False))), {'D-13'},
         {'pesan': ['diwarisi dari seksi sebelumnya']}),
        ('d13-bab1-tidak-mulai-1', 'docx', ganti(dp, D, seksi('decimal', 1), seksi('decimal')), {'D-13'}, {'pesan': ['seksi BAB 1 harus mulai 1 arab']}),
        ('d13-bab-tak-ada', 'docx', ganti(dp, 'word/numbering.xml', '<w:lvlText w:val="BAB %1"/>', '<w:lvlText w:val="%1."/>'), {'D-13'},
         {'pesan': ['judul "BAB 1" tidak ditemukan']}),
        ('d13-pdf-bab1-bukan-1', 'docx+pdf', dp, {'D-13'}, {'pdf_dari': ganti(dp, D, seksi('decimal', 1), seksi('decimal', 3)),
                                                             'pesan': ['halaman BAB 1 tidak bernomor 1']}),
        ('d13-nomor-halaman-indeks', 'docx+pdf', ganti(dp, D, f'{entri_pustaka}{info["hal_pustaka"]}<', f'{entri_pustaka}9<'), {'D-13'},
         {'render': True, 'pesan': ['tertulis halaman 9']}),
        ('d14-tanpa-keyakinan', 'docx', ganti(dp, D, sumber_tbl, 'WorldPop 2026; data per 23 Okt 2026 </w:t></w:r>'), {'D-14'},
         {'pesan': ['Tabel 1.1: tanpa label keyakinan']}),
        ('d14-kata-resmi', 'docx', ganti(dp, D, sumber_tbl, 'WorldPop 2026, data resmi kependudukan; data per 23 Okt 2026 </w:t></w:r>'), {'D-14'},
         {'pesan': ['Tabel 1.1: tanpa label keyakinan']}),
        ('d14-kartu', 'docx', ganti(dp, D, info['rusak'], info['rusak'].replace(pil('Estimasi model'), r('model')).replace(pil_resmi, r('lembaga'))),
         {'D-14'}, {'pesan': ['Tabel 1.2 (kartu): tanpa label keyakinan']}),
        ('d14-kartu-angka', 'docx', ganti(dp, D, 'IRBI 2023; data per 23 Okt 2026 </w:t></w:r>' + pil_resmi, 'IRBI 2023; data per 23 Okt 2026 </w:t></w:r>'),
         {'D-14'}, {'pesan': ['kartu-angka tanpa label keyakinan']}),
        ('d14-slide-bertabel', 'pptx', ganti(pp, PP, '<a:t>Asumsi kebijakan</a:t>', '<a:t>Data kependudukan</a:t>'), {'D-14'},
         {'pesan': ['slide bertabel tanpa label keyakinan']}),
        ('d14-pil-warna-docx', 'docx', ganti(dp, D, pil_resmi, pil_resmi.replace(f'w:fill="{H["navy"]}"', f'w:fill="{H["oranye"]}"')), {'D-14'},
         {'pesan': ['pil keyakinan "Resmi": isi #D9600B']}),
        ('d14-pil-teks-docx', 'docx', ganti(dp, D, pil('Terverifikasi'), pil('Terverifikasi').replace(f'<w:color w:val="{H["teks"]}"/>', f'<w:color w:val="{H["oranye"]}"/>')),
         {'D-14'}, {'pesan': ['pil keyakinan "Terverifikasi": teks #D9600B']}),
        ('d14-pil-garis-pptx', 'pptx', ganti(pp, PP, f'<a:noFill/><a:ln w="9525"><a:solidFill><a:srgbClr val="{hx("teks-3")}"/>',
                                             f'<a:solidFill><a:srgbClr val="{H["navy"]}"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="{hx("teks-3")}"/>'),
         {'D-14'}, {'pesan': ['harus pil garis #6B7280 tanpa isi']}),
        ('d14-pil-menempel-pptx', 'pptx', ganti(pp, PP, '<a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="id-ID" sz="640"', '<a:p><a:pPr algn="l"/><a:r><a:rPr lang="id-ID" sz="640"'),
         {'D-14'}, {'pesan': ['menempel tepi kiri']}),
        ('d15-lisensi-nc', 'docx', ganti(dp, D, FOTO_SUMBER, f'Wikimedia Commons, {FOTO["pengarang"]}, CC BY-NC 4.0'), {'D-15'}, {'pesan': ['tidak sah']}),
        ('d15-pengarang', 'docx', ganti(dp, D, FOTO_SUMBER, f'Wikimedia Commons, Fulan Fulani, {FOTO["lisensi"]}'), {'D-15'},
         {'pesan': ['tidak ada di Lampiran Atribusi']}),
        ('d15-lisensi-nc-pengarang-koma', 'docx', ganti(dp, D, FOTO_SUMBER, 'Wikimedia Commons, Fulan Fulani, Budi Budiman (Proyek X), CC BY-NC 4.0'), {'D-15'},
         {'pesan': ['lisensi "CC BY-NC 4.0" tidak sah']}),
        ('d15-pola', 'docx', ganti(dp, D, FOTO_SUMBER, f'Wikimedia Commons oleh {FOTO["pengarang"]}'), {'D-15'},
         {'pesan': ['harus "Wikimedia Commons, pengarang, lisensi"']}),
        ('d16-desimal-titik', 'docx', sisip('Kajian ini memakai 3.5 juta data.'), {'D-16', 'D-22'}, {'pesan': ['desimal titik']}),
        ('d16-ribuan-koma', 'docx', sisip('Kajian ini memakai 1,234 data.'), {'D-16', 'D-22'}, {'pesan': ['pemisah ribuan koma']}),
        ('d16-tanggal-iso', 'docx', sisip('Data ditarik 2026-10-23.'), {'D-16', 'D-22'}, {'pesan': ['tanggal ISO']}),
        ('d16-jam-titik-dua', 'docx', sisip('Data ditarik pukul 15:00 WIB.'), {'D-16', 'D-22'}, {'pesan': ['jam bertitik dua']}),
        ('d16-svg', 'docx', dp, {'D-16'}, {'lain': [svg], 'pesan': ['d16-svg.svg teks 1: pemisah ribuan koma']}),
        ('d16-pengecualian-boleh', 'docx', sisip('Data pada Tabel 1.1 dan Gambar 1.1 ditarik pukul 15.00 WIB, '
                                                  'lisensi foto CC BY-SA 4.0, standar CAP 1.2 dan SNI 1726:2019.'), set()),
        ('d17-judul-3-baris-pptx', 'pptx', ganti(pp, PP, '<a:t> pada 2024</a:t>',
                                                 '<a:t> pada 2024 dengan penurunan terbesar di kabupaten pesisir selatan Pulau Jawa '
                                                 'yang menerima program peringatan dini berbasis masyarakat sejak awal dekade</a:t>'), {'D-17'},
         {'pesan': ['(perkiraan lebar teks) > 2']}),
        # kata terpotong juga bukan kata kamus: T-10 ikut menolak (penanda yang sama dari dua arah)
        ('d17-elipsis-docx', 'docx', sisip('Kajian ini memakai data resmi lemb\u2026'), {'D-17', 'T-10'}, {'pesan': ['teks terpotong', '"lemb"']}),
        ('d17-tiga-titik-docx', 'docx', sisip('Kajian ini memakai data resmi lemb... dan lainnya.'), {'D-17', 'T-10'}, {'pesan': ['teks terpotong']}),
        ('d17-judul-docx', 'docx', ganti(dp, D, p(rt('1.2\tSkenario Musim Hujan'), 'Heading2'),
                                         p(rt('1.2\tSkenario Musim Hujan Terburuk yang Masuk Akal untuk Seluruh Kabupaten dan Kota di Pulau Jawa '
                                              'Bagian Selatan dan Utara beserta Pulau Kecil di Sekitarnya'), 'Heading2')), {'D-17'},
         {'pesan': ['judul 3 baris (perkiraan) > 2']}),
        ('d17-keterangan-docx', 'docx', ganti(dp, D, ket('Gambar', 1, 1, J['gbr']), ket('Gambar', 1, 1, J['gbr'] + ' untuk seluruh kabupaten dan kota '
                                                                                          'di Indonesia menurut kelas risiko, komponen bahaya utama, '
                                                                                          'keterpaparan penduduk, kerentanan sosial dan ekonomi, serta '
                                                                                          'kapasitas daerah yang dinilai bersama pemerintah provinsi')),
         {'D-17'}, {'pesan': ['keterangan 3 baris (perkiraan) > 2']}),
        ('d19-pustaka-yatim', 'docx', pustaka_sisip(p(r('Badan Pusat Statistik. (2024). Statistik Indonesia. BPS.'), 'Pustaka')), {'D-19'},
         {'pesan': ['entri pustaka "Badan Pusat Statistik (2024)" tidak dikutip']}),
        ('d19-dkk-entri-dan-kutipan-cocok', 'docx', ganti(pustaka_sisip(p(r('Fulan dkk. (2024). Judul contoh. Penerbit Uji.'), 'Pustaka')), D, SISIP,
                                                          esc('Kajian ini memakai data resmi lembaga (Fulan dkk., 2024).')), set()),
        ('d19-dkk-tahun-beda', 'docx', ganti(pustaka_sisip(p(r('Fulan dkk. (2024). Judul contoh. Penerbit Uji.'), 'Pustaka')), D, SISIP,
                                             esc('Kajian ini memakai data resmi lembaga (Fulan dkk., 2023).')), {'D-19'},
         {'pesan': ['kutipan "Fulan dkk., 2023" tidak ada di Daftar Pustaka', 'entri pustaka "Fulan (2024)" tidak dikutip']}),
        ('d19-path-internal', 'docx', sisip('Kajian ini memakai data/irbi/irbi.json sebagai sumber.'), {'D-19'}, {'pesan': ['path internal']}),
        ('d19-url-terpatah-pdf-boleh', 'docx+pdf', dp, set(), {'pdf_dari': sisip('Kajian ini memakai arsip https://contoh.example.org/arsip/uji/satu/dua/tiga/empat/lima/enam/tujuh/delapan/sembilan/sepuluh/sebelas/dua-belas/tiga-belas/empat-belas/data.json sebagai sumber.')}),
        ('d19-path-internal-pdf', 'docx+pdf', dp, {'D-19'}, {'pdf_dari': sisip('Kajian ini memakai data/irbi/irbi.json sebagai sumber.'),
                                                              'pesan': ['path internal']}),
        ('d19-kutipan-tanpa-entri', 'docx', sisip('Kajian ini memakai data resmi lembaga (Badan Pusat Statistik, 2024).'), {'D-19'},
         {'pesan': ['kutipan "Badan Pusat Statistik, 2024" tidak ada di Daftar Pustaka']}),
        ('d19-entri-tanpa-pola', 'docx', pustaka_sisip(p(r('Catatan lapangan tim tanpa tahun terbit.'), 'Pustaka')), {'D-19'},
         {'pesan': ['entri pustaka tanpa pola']}),
        ('d19-pustaka-tanpa-gaya', 'docx', ganti(dp, D, '<w:pStyle w:val="Pustaka"/>', '<w:pStyle w:val="Normal"/>', 9), {'D-19', 'D-22'},
         {'pesan': ['Daftar Pustaka tanpa entri bergaya']}),
        ('d20-garis-vertikal', 'docx', ganti(dp, D, '<w:insideV w:val="nil"', '<w:insideV w:val="single"', 9), {'D-20'}, {'pesan': ['garis vertikal (insideV)']}),
        ('d20-tanpa-tblheader', 'docx', ganti(dp, D, '<w:tr><w:trPr><w:tblHeader/></w:trPr>' + tc(p(r('NO'), 'KepalaTabel'), KW[0], H['navy']),
                                              '<w:tr>' + tc(p(r('NO'), 'KepalaTabel'), KW[0], H['navy'])), {'D-20'},
         {'pesan': ['Tabel 1.1: baris kepala tanpa w:tblHeader']}),
        ('d20-kepala-bukan-navy', 'docx', ganti(dp, D, tc(p(r('NO'), 'KepalaTabel'), KW[0], H['navy']), tc(p(r('NO'), 'KepalaTabel'), KW[0], hx('tint.netral.pita'))),
         {'D-20'}, {'pesan': ['isi kepala #E6EAF0 != navy']}),
        ('d20-lampiran-berisi', 'docx', ganti(dp, D, kep_lamp, kep_lamp.replace('</w:tcBorders></w:tcPr>', f'</w:tcBorders><w:shd w:val="clear" '
                                                                                f'w:color="auto" w:fill="{H["navy"]}"/></w:tcPr>')), {'D-20'},
         {'pesan': ['kepala tabel lampiran harus tanpa isi']}),
        ('d20-selang-seling', 'docx', dict(dp, **{D: zebra}), {'D-20'}, {'pesan': ['pita selang-seling']}),
        ('d20-angka-kiri', 'docx', ganti(dp, D, f'<w:jc w:val="right"/></w:pPr><w:r><w:t xml:space="preserve">{info["baris"][0][1]}<',
                                         f'<w:jc w:val="left"/></w:pPr><w:r><w:t xml:space="preserve">{info["baris"][0][1]}<'), {'D-20'},
         {'pesan': ['rata left, harus kanan']}),
        ('d20-jumlah-bukan-navy', 'docx', ganti(dp, D, tc(p(r('Jumlah'), 'TotalTabel', 'left'), KW[0], H['navy']), tc(p(r('Jumlah'), 'TotalTabel', 'left'), KW[0])),
         {'D-20'}, {'pesan': ['baris Jumlah harus isi navy']}),
        ('d20-kartu-dalam', 'docx', ganti(dp, D, tc(p(r('BESARAN'), 'KepalaTabel'), round(LEBAR * 0.4), H['navy']),
                                          tc(p(r('BESARAN'), 'KepalaTabel'), round(LEBAR * 0.4), H['oranye'])), {'D-20'},
         {'pesan': ['Tabel 1.2 (kartu): isi kepala']}),
        # komponen diagram garis waktu B5.12 (w:tblCaption "garis-waktu"): penanda sah dengan aturannya sendiri, bukan pengecualian buta
        ('d20-garis-waktu-pinjam', 'docx', ganti(dp, D, kepala_t11, kepala_t11.replace('</w:tblPr>', '<w:tblCaption w:val="garis-waktu"/></w:tblPr>')),
         {'D-20'}, {'pesan': ['penanda garis-waktu hanya untuk diagram B5.12']}),
        ('d20-garis-waktu-tint', 'docx', ganti_re(dp, D, POLA_REK, garis_waktu(hx('navy'))), {'D-20'}, {'pesan': ['(garis waktu): isi kepala']}),
        ('d20-garis-waktu-tanpa-pemisah', 'docx', ganti_re(dp, D, POLA_REK, garis_waktu(vertikal='nil')), {'D-20'},
         {'pesan': ['(garis waktu): tanpa garis pemisah antarkolom']}),
        ('d20-garis-waktu-sah', 'docx', ganti_re(dp, D, POLA_REK, garis_waktu()), set()),
        # naskah per bab: ambang anti-AI (T-8), glosarium (T-9), ejaan (T-10), kepadatan pustaka (T-11)
        ('t8-tiga-serangkai', 'docx', sisip('Kajian mencakup air baku, irigasi, dan bendungan pada 2024.'), {'T-8'},
         {'pesan': ['vonis GAGAL RINGAN', 'S-18']}),
        ('t8-faktual-boleh', 'docx', sisip('Banjir melanda Jawa Barat, Jawa Tengah, dan Jawa Timur pada 2024.'), set()),
        ('t9-singkatan', 'docx', sisip('BPBD mencatat genangan pada 2024.'), {'T-9'}, {'pesan': ['singkatan "BPBD" pertama di bab']}),
        ('t9-nama-lama', 'docx', sisip('Data irigasi 2015 diterbitkan Kementerian PUPR.'), {'T-9'}, {'pesan': ['nama K/L lama']}),
        # kutipan APA singkat "(BNPB, 2025a)" sebelum kepanjangan di prosa: bukan pemakaian singkatan (L66 menghitung prosa)
        ('t9-kutipan-boleh', 'docx', ganti(dp, D, '>Rerata indeks risiko bencana Indonesia ',
                                            f'>Sejak 2019 lembaga mencatat penurunan {KUTIPAN_BNPB}. Rerata indeks risiko bencana Indonesia '), set()),
        ('t9-dahulu-boleh', 'docx', sisip('Data irigasi 2015 diterbitkan Kementerian PUPR (kini Kementerian Pekerjaan Umum).'), set()),
        ('t10-ejaan', 'docx', sisip('Kajian ini mencatat genangan yang meluaz pada 2024.'), {'T-10'}, {'pesan': ['"meluaz"']}),
        ('t10-singkatan-asing', 'docx', sisip('Data XYZQ mencatat genangan pada 2024.'), {'T-10'},
         {'pesan': ['singkatan belum terdaftar di glosarium']}),
        ('t11-pustaka-bab', 'docx', dp, {'T-11'}, {'pustaka': dict(PUSTAKA_BERSIH, status='final'),
                                                   'pesan': ['sumber berbeda dirujuk < 8 per bab', 'untuk kajian air']}),
        ('t11-kunci-asing', 'docx', dp, {'T-11'}, {'pustaka': dict(PUSTAKA_BERSIH, bab={'1': ['bnpb-2025-renas', 'kunci-tak-ada']}),
                                                   'pesan': ['kunci tidak ada di pustaka.json']}),
        ('t11-resmi', 'docx', dp, {'T-11'}, {'pustaka': dict(PUSTAKA_BERSIH, status='final'), 'tema': tema_pustaka(1, 1, 101),
                                             'pesan': ['sumber resmi atau primer']}),
        ('t11-final-cukup', 'docx', dp, set(), {'pustaka': dict(PUSTAKA_BERSIH, status='final'), 'tema': tema_pustaka(2, 2, 50)}),
        ('d22-angka-ketikan', 'docx', sisip('Kajian ini memakai 4.321 data lembaga.'), {'D-22'}, {'pesan': ['angka "4.321" diketik']}),
        ('d22-sel-tabel', 'docx', ganti(dp, D, '>2026–2027<', '>245<'), {'D-22', 'D-20'}, {'pesan': ['angka "245" diketik']}),
        ('d22-tahun-cacah', 'docx', sisip('Kajian ini mencatat 1987 kejadian banjir.'), {'D-22'}, {'pesan': ['angka "1987" diketik']}),
        ('d22-kurung', 'docx', sisip('Kajian ini mencatat (312) desa terdampak.'), {'D-22'}, {'pesan': ['angka "312" diketik']}),
        ('d22-angka-dekat-nama', 'docx', sisip('Kode bangunan Chile NCh433 mencatat 433 gedung rusak.'), {'D-22'}, {'pesan': ['angka "433" diketik']}),
        ('d22-nama-diri-boleh', 'docx', sisip('Foto: Wikimedia Commons, Crisco 1492, CC BY-SA 4.0; kode bangunan Chile NCh433 berlaku.'), set()),
        ('d22-nomor-pertimbangan-boleh', 'docx', sisip('Pertimbangan Hukum nomor 3.13.6 memberi rambu.'), set()),
        ('d22-nomor-pertimbangan-angka-lain', 'docx', sisip('Pertimbangan Hukum nomor 3.13.6 mencatat 312 desa terdampak.'), {'D-22'}, {'pesan': ['angka "312" diketik']}),
        ('d22-nama-pengguna-lepas-boleh', 'docx', sisip('Crisco 1492'), set()),
        ('d22-nama-pengguna-angka-lain', 'docx', sisip('Crisco 1492 mencatat 1492 gedung rusak.'), {'D-22'}, {'pesan': ['angka "1492" diketik']}),
        ('d22-pptx', 'pptx', tambah_slide(a_sp(45, 'Catatan cakupan', 480, 140, 200, 16, [a_run('Pantauan 37 provinsi', 8)])), {'D-22'},
         {'pesan': ['angka "37" diketik']}),
        ('d23-panah', 'docx', sisip('Kajian ini memakai data \u2192 lembaga.'), {'D-23'}, {'pesan': ['U+2192']}),
        ('d31-keterangan-tanpa-tahun', 'docx', ganti(dp, D, ket('Gambar', 1, 1, J['gbr']), ket('Gambar', 1, 1, 'Rerata IRBI nasional menurun')),
         {'D-31'}, {'pesan': ['keterangan tanpa tahun']}),
        ('d31-langkah-panjang', 'docx', ganti(dp, D, '>Perluas peringatan dini banjir kab/kota kelas Tinggi<',
                                              '>Susun peta jalur evakuasi banjir dan longsor untuk seluruh desa rawan<'), {'D-31'},
         {'pesan': ['LANGKAH 11 kata > 8']}),  # 11 = paragraf pertama saja; pil status tidak dihitung
        ('d32-catatan-panjang', 'docx', ganti(dp, D, CATATAN, CATATAN + ' Nilai kab/kota yang belum lengkap pada salah satu '
                                              'tahun tidak dimasukkan ke rerata nasional supaya perbandingan tetap setara.'), {'D-32'},
         {'pesan': ['"Catatan:"']}),
        ('t1-token-sisa', 'docx', sisip('Kajian ini memakai {{angka:irbi.kab.dinilai}} data.'), {'T-1'}, {'pesan': ['sisa sintaks "{{"']}),
        ('t2-halaman-beda', 'pptx+pdf', pp, {'T-2'}, {'pdf': pdf_d, 'pesan': ['slide tampil']}),
        ('t3-gambar-hilang', 'docx', ganti(dp, D, 'r:embed="rIdG1"', 'r:embed="rIdHilang"'), {'T-3'}, {'pesan': ['tidak ada di relasi']}),
        ('t3-target-hilang', 'docx', ganti(dp, 'word/_rels/document.xml.rels', 'media/grafik.png', 'media/hilang.png'), {'T-3'},
         {'pesan': ['yang tidak ada di paket']}),
        ('t4-slop', 'docx', sisip('Di era yang serba cepat ini, kajian memainkan peran yang sangat penting.'), {'T-4'}, {'pesan': ['S-']}),
        ('t5-tanpa-logo', 'docx', ganti_re(dp, H1, r'<w:r><w:drawing>.*?</w:drawing></w:r>', ''), {'T-5'}, {'pesan': ['logo BNPB setinggi']}),
        ('t5-baris1', 'docx', ganti(dp, H1, TEMA['kajian']['air']['judul_pendek'], 'Kajian Air'), {'T-5'}, {'pesan': ['baris 1 judul pendek']}),
        ('t5-baris1-regular', 'docx', ganti(dp, H1, '<w:rPr><w:b/></w:rPr>', '<w:rPr><w:b w:val="0"/></w:rPr>'), {'T-5'}, {'pesan': ['harus Bold']}),
        ('t5-baris2', 'docx', ganti(dp, H1, 'BNPB | ', 'BNPB, '), {'T-5'}, {'pesan': ['baris 2 "BNPB | Oktober 2026"']}),
        ('t5-tanpa-aksen', 'docx', ganti_re(dp, H1, r'<w:pBdr>.*?</w:pBdr>', ''), {'T-5'}, {'pesan': ['garis tegak kiri']}),
        ('t5-tanpa-garis-bawah', 'docx', ganti(dp, H1, f'w:color="{hx("garis-kuat")}"', f'w:color="{H["garis"]}"'), {'T-5'}, {'pesan': ['garis bawah kepala']}),
        ('t5-alamat', 'docx', ganti(dp, F1, esc(TEMA['header_footer']['footer']['baris'][0]), 'Badan Nasional Penanggulangan Bencana'), {'T-5'},
         {'pesan': ['baris alamat']}),
        ('t5-garis-atas-kaki', 'docx', ganti(dp, F1, '<w:top w:val="single"', '<w:top w:val="nil"'), {'T-5'}, {'pesan': ['garis atas kaki']}),
        ('t5-nomor-teks', 'docx', ganti(dp, F1, fld(' PAGE ', r('1')), r('1')), {'T-5', 'D-13'}, {'pesan': ['bukan bidang PAGE']}),
        ('t5-nomor-format', 'docx', ganti(dp, 'word/styles.xml', nh_gaya, f'<w:color w:val="{hx(TD["nomor_halaman"]["warna"])}"/><w:sz w:val="16"/>'),
         {'T-5'}, {'pesan': ['nomor halaman harus 9 pt Bold']}),
        ('t5-nomor-kiri', 'docx', ganti(dp, F1, '<w:pStyle w:val="NomorHalaman"/>', '<w:pStyle w:val="NomorHalaman"/><w:jc w:val="left"/>'), {'T-5'},
         {'pesan': ['nomor halaman harus rata kanan']}),
        ('t5-tanpa-kepala', 'docx', ganti_re(dp, D, r'<w:headerReference [^>]*/>', ''), {'T-5'}, {'pesan': ['tanpa kepala halaman']}),
        ('t5-tanpa-kaki', 'docx', ganti_re(dp, D, r'<w:footerReference [^>]*/>', ''), {'T-5', 'D-13'}, {'pesan': ['tanpa kaki halaman']}),
        ('t6-tanpa-garis', 'pptx', ganti(pp, PP, a_garis(4, SL['garis']['y_pt'][0]), ''), {'T-6'}, {'pesan': ['garis y95 selebar']}),
        ('t6-garis-warna', 'pptx', ganti(pp, PP, a_garis(5, SL['garis']['y_pt'][1]), a_garis(5, SL['garis']['y_pt'][1], H['garis'])), {'T-6'},
         {'pesan': ['garis y507.6 harus 0.75 pt']}),
        ('t6-tanpa-nomor', 'pptx', ganti(pp, PP, pinfo['nomor'], ''), {'T-6'}, {'pesan': ['nomor halaman 1 tidak ada']}),
        ('t6-nomor-kiri', 'pptx', ganti(pp, PP, pinfo['nomor'], pinfo['nomor'].replace('algn="r"', 'algn="l"')), {'T-6'},
         {'pesan': ['nomor halaman harus rata kanan']}),
        ('t6-tanpa-cutoff', 'pptx', ganti(pp, PP, pinfo['cut'], ''), {'T-6'}, {'pesan': ['tanpa pil "CUT OFF DATA"']}),
        ('t6-judul-lebar', 'pptx', ganti(pp, PP, f'<a:ext cx="{EMU(SL["judul_kotak"]["lebar_dengan_pil_pt"])}"', f'<a:ext cx="{EMU(SL["judul_kotak"]["lebar_pt"])}"'),
         {'T-6', 'T-7'}, {'pesan': ['kotak judul selebar 823', 'beririsan']}),  # judul lebar menabrak pil CUT OFF
        ('t7-irisan', 'pptx', tambah_slide(a_sp(44, 'Catatan', 60, 510, 300, 16, [a_run('Catatan sumber data kependudukan', 8)])), {'T-7'},
         {'pesan': ['beririsan']}),
        ('t7-panel', 'pptx', tambah_slide(panel), {'T-7'}, {'pesan': ['dari tepi bawah panel']}),
        ('t7-teks-di-pil-boleh', 'pptx', tambah_slide(pil_teks), set()),
        ('positif-bab-br', 'docx', bab_br, set()),
    ]


def main():
    if FIX.exists():
        shutil.rmtree(FIX)
    FIX.mkdir()
    # DOCX bersih: rakit, render, isi nomor halaman indeks dari render (titik tetap), rakit dan render ulang
    bd, bp = FIX / 'bersih-air.docx', FIX / 'bersih-deck.pptx'
    dp, dman, info = docx_bersih()
    tulis_zip(bd, dp)
    hal = halaman_indeks(render(bd, FIX / 'bersih-air.pdf'))
    dp, dman, info = docx_bersih(hal)
    info['hal_pustaka'] = hal.get('DAFTAR PUSTAKA', '0')
    tulis_zip(bd, dp)
    tulis_manifest(bd, dman, pustaka=PUSTAKA_BERSIH)
    pdf_d = render(bd, FIX / 'bersih-air.pdf')
    assert halaman_indeks(pdf_d) == hal, f'nomor halaman indeks belum tetap: {hal} -> {halaman_indeks(pdf_d)}'
    pp, pman, pinfo = pptx_bersih()
    tulis_zip(bp, pp)
    tulis_manifest(bp, pman)
    pdf_p = render(bp, FIX / 'bersih-deck.pdf')  # soffice merender PPTX dengan jalan yang sama
    # fixture visual (SVG + manifest): spek contoh bangun/visual (bersih) dan spek/SVG yang dimutasi (negatif)
    vis = FIX / 'visual'
    subprocess.run(['node', str(periksa.VISUAL / 'uji.mjs'), '--tanpa-png', f'--fixture={vis}'], check=True)

    # 1) fixture bersih: semua gerbang lolos dengan --ketat, tanpa LEWAT
    gagal, log = periksa_ctx(True, docx=bd, pdf=pdf_d, pptx=bp, pptx_pdf=pdf_p, visual=vis / 'bersih')
    assert not gagal, 'fixture bersih ditolak:\n' + '\n'.join(log)
    print('fixture bersih lolos semua gerbang (--ketat): ' + ', '.join(sorted((k for k, _, _ in periksa.GERBANG), key=periksa._urut_kode)))

    # 2) fixture negatif dan positif
    kasus = kasus_negatif(dp, dman, info, pp, pman, pinfo, pdf_d)
    terlihat, positif = {}, {'bersih'}
    for nama, jenis, parts, harap, *ekstra in kasus:
        ek = ekstra[0] if ekstra else {}
        utama = jenis.split('+')[0]
        f = FIX / f'{nama}.{utama}'
        tulis_zip(f, parts)
        tulis_manifest(f, ek.get('manifest', dman if utama == 'docx' else pman), ek.get('manifest_mentah'),
                       ek.get('pustaka', PUSTAKA_BERSIH) if utama == 'docx' else None)
        kw = {utama: f, 'tema': ek.get('tema'), 'lain': ek.get('lain', ())}
        if jenis == 'docx+pdf':
            kw['pdf'] = render(f, FIX / f'{nama}.pdf') if ek.get('render') else pdf_d
            if ek.get('pdf_dari'):  # PDF dari varian lain: DOCX yang diperiksa tetap bersih, cabang PDF yang diuji
                tulis_zip(FIX / f'{nama}-sumber.docx', ek['pdf_dari'])
                kw['pdf'] = render(FIX / f'{nama}-sumber.docx', FIX / f'{nama}.pdf')
        if jenis == 'pptx+pdf':
            kw['pptx_pdf'] = ek['pdf']
        if jenis == 'docx+pptx':
            fp = FIX / f'{nama}-deck.pptx'
            tulis_zip(fp, ek['pptx_parts'])
            tulis_manifest(fp, ek['manifest_pptx'])
            kw['pptx'] = fp
        gagal, log = periksa_ctx(**kw)
        assert gagal == harap, f'fixture {nama}: harap ditolak {sorted(harap)}, nyatanya {sorted(gagal)}\n' + '\n'.join(log)
        if harap:
            assert ek.get('pesan'), f'fixture negatif {nama} wajib menyebut potongan pesan cabangnya'
            kode = sorted(harap, key=periksa._urut_kode)[0] if len(harap) == 1 else None
            for pesan in ek['pesan']:
                assert any(pesan in x and (kode is None or x.strip().startswith(kode + ' ')) for x in log), \
                    f'fixture {nama}: pesan "{pesan}" tidak muncul\n' + '\n'.join(log)
        else:
            positif.add(nama)
        for k_ in harap:
            terlihat.setdefault(k_, []).append(nama)
        print(f'  {nama:30} ditolak {", ".join(sorted(harap, key=periksa._urut_kode)) or "(fixture positif, lolos)"}')

    # 3) fixture PDF tangan: em dash, font Helvetica, desimal titik
    fp = FIX / 'pdf-helvetica-em-dash.pdf'
    pdf_tangan(fp, ['Rerata indeks \u2014 turun 3.5 poin'])
    gagal, log = periksa_ctx(pdf=fp)
    assert gagal == {'D-1', 'D-4', 'D-16'}, f'fixture PDF: {sorted(gagal)}\n' + '\n'.join(log)
    for pesan in ('em dash', 'font "Helvetica" tertanam', 'pdf-helvetica-em-dash.pdf hlm. 1: desimal titik'):
        assert any(pesan in x for x in log), f'fixture PDF: pesan "{pesan}" tidak muncul\n' + '\n'.join(log)
    for k_ in gagal:
        terlihat.setdefault(k_, []).append('pdf-helvetica-em-dash')
    print('  pdf-helvetica-em-dash          ditolak D-1, D-4, D-16')

    # 3b) fixture visual: tiap folder ditolak tepat oleh kodenya (gerbang lain tidak berlaku tanpa DOCX/PPTX)
    harap_vis = json.loads((vis / 'harap.json').read_text(encoding='utf-8'))
    for nama, harap in harap_vis.items():
        gagal, log = periksa_ctx(visual=vis / nama)
        assert gagal == set(harap), f'fixture visual {nama}: harap ditolak {harap}, nyatanya {sorted(gagal)}\n' + '\n'.join(log)
        for k_ in gagal:
            terlihat.setdefault(k_, []).append(nama)
        print(f'  {nama:30} ditolak {", ".join(harap)}')

    # 4) regresi DOCX nyata dan keluaran hidup pembangun
    regresi()

    # 5) registri cakupan: lengkap terhadap pedoman, tiap sub-aturan diuji punya fixture yang benar-benar menolak
    cak = json.loads((QA / 'cakupan.json').read_text(encoding='utf-8'))
    ped = set(re.findall(r'^\| (D-\d+) \|', (periksa.AKAR / 'PEDOMAN-DESAIN.md').read_text(encoding='utf-8'), re.M))
    kel = {k.split()[0] for k in cak['dikecualikan']}
    terdaftar = set(cak['diuji']) | set(cak['antre']) | {k for k in kel if k not in cak['diuji']}
    assert ped <= terdaftar, f'kode pedoman belum di cakupan.json: {sorted(ped - terdaftar)}'
    assert not set(cak['diuji']) & set(cak['antre']), 'kode di diuji dan antre sekaligus'
    jalan = {k for k, _, _ in periksa.GERBANG}
    assert set(cak['diuji']) == jalan, f'diuji != gerbang terpasang: {sorted(set(cak["diuji"]) ^ jalan)}'
    nama_kasus = {k[0] for k in kasus} | {'pdf-helvetica-em-dash'} | set(harap_vis)
    n_sub = 0
    for k_, sub in cak['diuji'].items():
        assert isinstance(sub, dict) and sub, f'{k_}: diuji harus peta sub-aturan -> fixture'
        for s, fx in sub.items():
            assert fx in nama_kasus, f'{k_} {s}: fixture {fx} tidak ada di qa/uji.py'
            assert fx in terlihat.get(k_, []), f'{k_} {s}: fixture {fx} tidak ditolak {k_}'
            n_sub += 1
    for s, fx in cak['positif'].items():
        assert fx in positif, f'positif {s}: fixture {fx} tidak ada atau tidak lolos'
    print(f'cakupan.json lengkap: {len(cak["diuji"])} gerbang, {n_sub} sub-aturan diuji, {len(cak["positif"])} pola positif, '
          f'{len(cak["dikecualikan"])} dikecualikan, {len(cak["antre"])} antre')
    print(f'uji diri lolos: {len(kasus) + 1 + len(harap_vis)} fixture negatif/positif di {FIX}')


# ---------------------------------------------------------------- regresi

# positif palsu yang pernah menolak DOCX dan deck nyata pertama (temuan pemeriksa 23 Okt 2026); tidak boleh muncul lagi
POSITIF_PALSU = [
    ('D-20', re.compile(r'angka "0?1" rata center')),
    ('D-11', re.compile(r'Label Bagian|KERUSAKAN DAN KERUGIAN|PEMICU DAN POLA')),
    ('D-13', re.compile(r'tidak ada di Daftar Isi|harus romawi|tidak tercetak di Daftar Isi PDF|"LAMPIRAN" tertulis halaman')),
    ('D-15', re.compile(r'tanggal akses')),
    ('D-19', re.compile(r'"BNPB, 2025[a-z]?" tidak ada di Daftar Pustaka|tanpa pola "Penulis \(Tahun\)": "(LAMPIRAN|Lampiran)')),
    ('D-31', re.compile(r'LANGKAH \d+ kata > 8: "Perluas peringatan dini banjir kab/kota kelas Tinggi Sud')),
    ('D-7', re.compile(r'gambar selebar 21\.0 cm')),
    ('D-10', re.compile(r'"TIDAK DITEMUKAN" dalam "[^"]*tidak ditemukan')),
    ('D-22', re.compile(r'angka "26" diketik')),
]
# temuan benar di contoh.docx (pemeriksa 23 Okt): tetap harus tertangkap
TEMUAN_BENAR = [('D-19', 'path internal "angka.json"'), ('D-20', 'Tabel 2.3: isi kepala #E6EAF0'),
                ('D-20', 'Tabel 2.3: garis vertikal (insideV)'), ('D-20', 'Tabel 2.2: baris kepala tanpa w:tblHeader')]


def _temuan(log):
    return [(m[1], m[2]) for x in log if (m := re.match(r'\s+([DT]-\d+) (.*)', x))]


def _cek_palsu(nama, log):
    t = _temuan(log)
    palsu = [(k, s) for k, s in t for kk, pl in POSITIF_PALSU if k == kk and pl.search(s)]
    assert not palsu, f'{nama}: positif palsu muncul lagi:\n' + '\n'.join(f'{k} {s}' for k, s in palsu)
    return t


def regresi():
    log = []
    periksa.jalankan(periksa.Ctx(docx=REG / 'contoh.docx', pdf=REG / 'contoh.pdf', render=False), semua=True, tulis=log.append)
    t = _cek_palsu('regresi contoh.docx', log)
    for k, s in TEMUAN_BENAR:
        assert any(k == kk and s in ss for kk, ss in t), f'regresi contoh.docx: temuan benar {k} "{s}" hilang\n' + '\n'.join(log)
    gagal = sorted({k for k, _ in t}, key=periksa._urut_kode)
    print(f'  regresi contoh.docx: positif palsu lama nol, {len(TEMUAN_BENAR)} temuan benar tetap tertangkap (gagal: {", ".join(gagal)})')
    # keluaran hidup pembangun: hanya dijaga dari pola positif palsu; gagal lain dilaporkan, bukan dituntut
    hidup = [('docx', x) for x in sorted((periksa.AKAR / 'bangun/docx/keluaran').glob('*.docx')) if not x.name.startswith('_')]
    hidup += [('pptx', x) for x in sorted((periksa.AKAR / 'bangun/pptx/keluaran').glob('*.pptx'))]
    for jenis, x in hidup:
        pdf_x = x.with_suffix('.pdf')
        kw = {jenis: x, ('pdf' if jenis == 'docx' else 'pptx_pdf'): pdf_x if pdf_x.exists() else None, 'render': False}
        log = []
        try:
            hasil = periksa.jalankan(periksa.Ctx(**kw), semua=True, tulis=log.append)
        except Exception as e:  # berkas sedang ditulis pembangun
            print(f'  keluaran hidup {x.name}: dilewati ({type(e).__name__}: {e})')
            continue
        _cek_palsu(f'keluaran hidup {x.name}', log)
        g = sorted({k for k, s, _ in hasil if s == 'GAGAL'}, key=periksa._urut_kode)
        print(f'  keluaran hidup {x.relative_to(periksa.AKAR)}: positif palsu lama nol; gagal (dilaporkan) {", ".join(g) or "-"}')


if __name__ == '__main__':
    main()
