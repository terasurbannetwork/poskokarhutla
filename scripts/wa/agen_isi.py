"""Isi PPTX lengkap untuk pagar angka bot V2 (data/kajian-bnpb/bot-laporan D17, A11). Hanya pustaka standar.

Dibaca langsung dari ZIP supaya tidak ada yang lolos dari pemeriksaan:
- semua slide (termasuk yang disembunyikan atau tidak terdaftar, ditandai), shape bertulisan dan tabel dengan nama, teks, dan `tampak`
  (ukuran, letak di kanvas lewat transformasi grup, atribut hidden), termasuk shape di dalam mc:AlternateContent;
- teks semua bagian XML lain (catatan pembicara, grafik, layout, master, SmartArt) beserta teks alt (descr, title);
- sidik sha256 tiap bagian bukan XML (gambar, berkas tertanam, makro, apa pun letaknya) dan tiap bagian grafik atau diagram;
- tautan eksternal (TargetMode External) selain hyperlink, karena dimuat saat konversi PDF di luar sandbox.

pakai: python3 agen_isi.py <pptx>   -> JSON di stdout
"""
import hashlib
import json
import posixpath
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'mc': 'http://schemas.openxmlformats.org/markup-compatibility/2006',
}
REL = '{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'
A, P, MC = '{%s}' % NS['a'], '{%s}' % NS['p'], '{%s}' % NS['mc']
RID = '{%s}id' % NS['r']


def _rels(z, bagian):
    d, b = posixpath.split(bagian)
    try:
        root = ET.fromstring(z.read(posixpath.join(d, '_rels', b + '.rels')))
    except KeyError:
        return {}
    return {r.get('Id'): posixpath.normpath(posixpath.join(d, r.get('Target'))) for r in root.iter(REL) if r.get('TargetMode') != 'External'}


def _teks_paragraf(el):
    """Teks per paragraf a:p (a:br = baris baru), digabung baris baru; sama dengan bentuk teks ubah.py inventaris."""
    baris = []
    for p in el.iter(A + 'p'):
        bagian = []
        for c in p.iter():
            if c.tag == A + 't':
                bagian.append(c.text or '')
            elif c.tag == A + 'br':
                bagian.append('\n')
        baris.append(''.join(bagian))
    return '\n'.join(baris)


def _kotak(el):
    """(off_x, off_y, ext_cx, ext_cy, chOff, chExt) dari xfrm pertama shape atau grup, atau None."""
    x = None
    for tag in (P + 'spPr', P + 'grpSpPr', P + 'xfrm'):
        c = el.find(tag)
        if c is not None:
            x = c if tag == P + 'xfrm' else c.find(A + 'xfrm')
            if x is not None:
                break
    if x is None:
        return None
    off, ext = x.find(A + 'off'), x.find(A + 'ext')
    if off is None or ext is None:
        return None
    try:
        v = [int(off.get('x', 0)), int(off.get('y', 0)), int(ext.get('cx', 0)), int(ext.get('cy', 0))]
    except ValueError:
        return None
    cho, che = x.find(A + 'chOff'), x.find(A + 'chExt')
    try:
        ch = (int(cho.get('x', 0)), int(cho.get('y', 0)), int(che.get('cx', 0)), int(che.get('cy', 0))) if cho is not None and che is not None else None
    except ValueError:
        ch = None
    return v, ch


def _peta(t, x, y, cx, cy):
    """Terapkan transformasi grup t = (ox, oy, sx, sy) ke kotak anak."""
    ox, oy, sx, sy = t
    return ox + x * sx, oy + y * sy, cx * sx, cy * sy


def _anak(pohon):
    """Anak langsung, dengan mc:AlternateContent diurai (Choice dan Fallback dua-duanya dibaca)."""
    for el in list(pohon):
        if el.tag == MC + 'AlternateContent':
            for cabang in list(el):
                yield from _anak(cabang)
        else:
            yield el


def _shapes(pohon, lebar, tinggi, t=(0, 0, 1.0, 1.0), induk_tampak=True):
    out = []
    for el in _anak(pohon):
        tag = el.tag
        nv = el.find('.//' + P + 'cNvPr')
        hidden = nv is not None and nv.get('hidden') in ('1', 'true')
        k = _kotak(el)
        tampak = induk_tampak and not hidden
        kotak_abs = None
        if k is not None:
            (x, y, cx, cy), ch = k
            kotak_abs = _peta(t, x, y, cx, cy)
            ax, ay, acx, acy = kotak_abs
            if acx <= 0 or acy <= 0 or ax >= lebar or ay >= tinggi or ax + acx <= 0 or ay + acy <= 0:
                tampak = False
        if tag == P + 'grpSp':
            t2 = t
            if k is not None and k[1] is not None and k[1][2] > 0 and k[1][3] > 0:
                (x, y, cx, cy), (chx, chy, chcx, chcy) = k
                ax, ay, acx, acy = kotak_abs
                sx, sy = acx / chcx, acy / chcy
                t2 = (ax - chx * sx, ay - chy * sy, sx, sy)
            out.extend(_shapes(el, lebar, tinggi, t2, tampak))
            continue
        nama = nv.get('name') if nv is not None else ''
        alt = ' '.join(v for v in ((nv.get('descr') or ''), (nv.get('title') or '')) if v) if nv is not None else ''
        if tag == P + 'graphicFrame':
            tbl = el.find('.//' + A + 'tbl')
            if tbl is not None:
                tabel = [[_teks_paragraf(tc) for tc in tr.findall(A + 'tc')] for tr in tbl.findall(A + 'tr')]
                out.append({'nama': nama, 'teks': '', 'tabel': tabel, 'tampak': tampak, 'alt': alt})
            elif alt:
                out.append({'nama': nama, 'teks': '', 'tampak': tampak, 'alt': alt})
            continue
        teks = _teks_paragraf(el) if tag in (P + 'sp', P + 'cxnSp') else ''
        if teks.strip() or alt:
            out.append({'nama': nama, 'teks': teks, 'tampak': tampak, 'alt': alt})
    return out


def isi(berkas):
    with zipfile.ZipFile(berkas) as z:
        nama_semua = z.namelist()
        pres = ET.fromstring(z.read('ppt/presentation.xml'))
        sz = pres.find(P + 'sldSz')
        lebar, tinggi = (int(sz.get('cx')), int(sz.get('cy'))) if sz is not None else (12192000, 6858000)
        rel = _rels(z, 'ppt/presentation.xml')
        urut = [rel.get(s.get(RID)) for s in pres.iter(P + 'sldId')]
        slides, dipakai = [], set()

        def baca_slide(bagian, n, sembunyi):
            root = ET.fromstring(z.read(bagian))
            pohon = root.find('.//' + P + 'spTree')
            return {'n': n, 'bagian': bagian, 'tersembunyi': sembunyi or root.get('show') in ('0', 'false'),
                    'shapes': _shapes(pohon, lebar, tinggi) if pohon is not None else []}

        for bagian in [u for u in urut if u and u in nama_semua]:
            dipakai.add(bagian)
            slides.append(baca_slide(bagian, len(slides) + 1, False))
        # slide yang ada di ZIP tetapi tidak di daftar presentasi: tersembunyi, angkanya tetap diperiksa
        for nama in sorted(nama_semua):
            if nama.startswith('ppt/slides/') and nama.endswith('.xml') and nama not in dipakai:
                slides.append(baca_slide(nama, len(slides) + 1, True))
                dipakai.add(nama)
        lain, media, luar = [], [], []
        for nama in sorted(nama_semua):
            data = z.read(nama)
            if nama.endswith('.rels'):
                try:
                    root = ET.fromstring(data)
                except ET.ParseError:
                    continue
                for r in root.iter(REL):
                    if r.get('TargetMode') == 'External' and not str(r.get('Type', '')).endswith('/hyperlink'):
                        luar.append({'bagian': nama, 'target': r.get('Target', '')})
                continue
            if nama.endswith('.xml'):
                if nama in dipakai or nama == '[Content_Types].xml':
                    continue
                try:
                    root = ET.fromstring(data)
                except ET.ParseError:
                    root = None
                if root is not None:
                    teks = [t.text for t in root.iter() if t.text and t.text.strip() and t.tag.split('}')[-1] in ('t', 'v')]
                    teks += [v for t in root.iter() for k, v in t.attrib.items() if k in ('descr', 'title') and v and v.strip()]
                    if teks:
                        lain.append({'bagian': nama, 'teks': '\n'.join(teks)})
                if nama.startswith(('ppt/charts/', 'ppt/diagrams/')):
                    media.append({'bagian': nama, 'sha256': hashlib.sha256(data).hexdigest()})
                continue
            if nama.endswith('/'):
                continue
            media.append({'bagian': nama, 'sha256': hashlib.sha256(data).hexdigest()})
    return {'slides': slides, 'lain': lain, 'media': media, 'luar': luar}


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('pakai: agen_isi.py <pptx>', file=sys.stderr)
        sys.exit(2)
    sys.stdout.buffer.write((json.dumps(isi(sys.argv[1]), ensure_ascii=False) + '\n').encode('utf-8'))
