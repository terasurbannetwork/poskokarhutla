#!/usr/bin/env python3
"""Gerbang QA mekanis dua kajian BNPB (PEDOMAN-DESAIN.md bagian D). Stdlib + poppler CLI
(pdftotext, pdffonts, pdfinfo) + soffice untuk render ulang DOCX (T-2).

    python3 qa/periksa.py --docx K.docx --pdf K.pdf --pptx D.pptx --pptx-pdf D.pdf
                          [--manifest-docx M.json] [--manifest-pptx M.json] [--kajian air]
                          [--lain peta.svg ...] [--semua] [--ketat] [--tanpa-render]

Manifest angka: <stem>.manifest.json di samping berkasnya (K.docx -> K.manifest.json), isinya objek berkunci
"angka" (Konteks.manifest dari bangun/kontrak/naskah.py; kunci lain seperti spek, slide, catatan dibiarkan).
Keluar 0 bila semua gerbang yang jalan lolos; 1 bila ada yang gagal (atau LEWAT dengan --ketat).
Bawaan berhenti di gerbang gagal pertama (PEDOMAN D); --semua menjalankan semuanya.
Ambang (huruf terkecil, baris judul, lebar isi, batas halaman, hex sah, gaya yang dikecualikan) dibaca dari tema.json.
Pembangun memanggil periksa.wajib_lolos(docx=..., pdf=...) di akhir build. Uji diri dan fixture: python3 qa/uji.py
"""
import argparse
import csv
import functools
import hashlib
import html
import json
import os
import posixpath
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

QA = Path(__file__).resolve().parent
AKAR = QA.parent  # data/kajian-bnpb
sys.path.insert(0, str(AKAR / 'bangun/kontrak'))
import naskah  # noqa: E402  Konteks, format angka id-ID
from tema import kajian_sah  # noqa: E402  kode kajian sah dari tema.json

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
P = '{http://schemas.openxmlformats.org/presentationml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
WP = '{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}'
PR = '{http://schemas.openxmlformats.org/package/2006/relationships}'
EMU_PT = 12700
CM_PT = 72 / 2.54
CADANGAN_PAGINASI = 0.05  # D-12: batas halaman isi dikurangi 5% untuk beda paginasi Word dan soffice
MAKS_KATA_LANGKAH = 8  # D-31, Buku Pegangan L30
MAKS_HURUF_CATATAN = 120  # D-32
RE_EMOJI = re.compile('[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F\u200D]')
RE_URL = re.compile(r'https?://\S+|www\.\S+')
RE_ANGKA_ID = re.compile(r'^[+-]?\d{1,3}(?:\.\d{3})*(?:,\d+)?$')
BULAN = r'(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|Jan|Feb|Mar|Apr|Jun|Jul|Agu|Agt|Sep|Okt|Nov|Des)'
SINGKATAN = set('BNPB BPBD BMKG PVMBG BPS BIG PU PUPR KLHK BRIN TNI POLRI IRBI DIBI KRB SPI RPJMN RPJPN RENAS RENSTRA '
                'PB PRB DAS WS SDA PSDA PDAM SPAM PDNA BUMN BUMD UU PP KK UPT OPD APBN APBD DSP NTB NTT DKI DIY RI SDG '
                'ENSO IOD ONI NOAA CPC FIRMS VIIRS MODIS MMI GNSS TPA ISPA DALY VSL GIS CC BY SA ND NC PD WIB WITA WIT '
                'K/L KAB/KOTA'.split())


class Lewat(Exception):
    """Gerbang tidak bisa jalan karena masukannya tidak ada (bukan lolos)."""


class TakBerlaku(Lewat):
    """Jenis berkas yang diperiksa gerbang ini tidak diberikan sama sekali (mis. T-6 kerangka slide pada build DOCX)."""


def norm(s):
    """Lipat semua spasi (termasuk tab, w:br, spasi tak putus) jadi satu spasi."""
    return re.sub(r'\s+', ' ', s or '').strip()


def angka_id(s):
    s = norm(s).replace('\u2212', '-')
    if not RE_ANGKA_ID.match(s):
        return None
    return float(s.replace('.', '').replace(',', '.'))


def onoff(el):
    return el is not None and el.get(W + 'val', 'true') not in ('0', 'false', 'off')


def romawi(n):
    out = ''
    for v, s in ((1000, 'm'), (900, 'cm'), (500, 'd'), (400, 'cd'), (100, 'c'), (90, 'xc'), (50, 'l'), (40, 'xl'),
                 (10, 'x'), (9, 'ix'), (5, 'v'), (4, 'iv'), (1, 'i')):
        while n >= v:
            out, n = out + s, n - v
    return out


def _fmt_nomor(n, fmt):
    if fmt in ('lowerRoman', 'upperRoman'):
        return romawi(n) if fmt == 'lowerRoman' else romawi(n).upper()
    if fmt in ('lowerLetter', 'upperLetter'):
        s = chr(ord('a') + (n - 1) % 26) * ((n - 1) // 26 + 1)
        return s if fmt == 'lowerLetter' else s.upper()
    return f'{n:02d}' if fmt == 'decimalZero' else str(n)


def _ada_page(xml):
    return bool(re.search(r'<w:instrText[^>]*>\s*PAGE\b|w:instr="\s*PAGE\b', xml))


def judul_teks(p):
    """Teks judul seperti tercetak: label nomor otomatis (mis. "BAB 1") + teks paragraf."""
    return norm(f"{p['label']} {p['teks']}")


# ---------------------------------------------------------------- tema dan fon

def muat_tema(path=AKAR / 'tema.json'):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def hex_tema(tema):
    """(hex sah, hex terlarang) dari blok warna tema.json."""
    sah, w = set(), tema['warna']
    for k, v in w.items():
        if k != 'terlarang':
            sah |= {h.upper() for h in re.findall(r'#([0-9A-Fa-f]{6})', json.dumps(v))}
    return sah, {h.lstrip('#').upper() for h in w.get('terlarang', [])}


class Fon:
    """cmap dan lebar maju dari berkas TTF (head, hhea, hmtx, cmap format 4 dan 12)."""

    def __init__(self, path):
        b = Path(path).expanduser().read_bytes()
        tab = {}
        for i in range(struct.unpack('>H', b[4:6])[0]):
            tag, _, off, ln = struct.unpack('>4sIII', b[12 + 16 * i:28 + 16 * i])
            tab[tag.decode('latin-1')] = off
        self.upem = struct.unpack('>H', b[tab['head'] + 18:tab['head'] + 20])[0]
        nhm = struct.unpack('>H', b[tab['hhea'] + 34:tab['hhea'] + 36])[0]
        self.adv = [struct.unpack('>H', b[tab['hmtx'] + 4 * i:tab['hmtx'] + 4 * i + 2])[0] for i in range(nhm)]
        self.cmap, co = {}, tab['cmap']
        for i in range(struct.unpack('>H', b[co + 2:co + 4])[0]):
            _, _, off = struct.unpack('>HHI', b[co + 4 + 8 * i:co + 12 + 8 * i])
            s = co + off
            fmt = struct.unpack('>H', b[s:s + 2])[0]
            if fmt == 12:
                for g in range(struct.unpack('>I', b[s + 12:s + 16])[0]):
                    a, e, gid = struct.unpack('>III', b[s + 16 + 12 * g:s + 28 + 12 * g])
                    for c in range(a, e + 1):
                        self.cmap.setdefault(c, gid + c - a)
            elif fmt == 4:
                n = struct.unpack('>H', b[s + 6:s + 8])[0] // 2
                end = struct.unpack(f'>{n}H', b[s + 14:s + 14 + 2 * n])
                mulai = struct.unpack(f'>{n}H', b[s + 16 + 2 * n:s + 16 + 4 * n])
                delta = struct.unpack(f'>{n}h', b[s + 16 + 4 * n:s + 16 + 6 * n])
                ro_at = s + 16 + 6 * n
                ro = struct.unpack(f'>{n}H', b[ro_at:ro_at + 2 * n])
                for k in range(n):
                    for c in range(mulai[k], end[k] + 1):
                        if c == 0xFFFF:
                            continue
                        if ro[k] == 0:
                            gid = (c + delta[k]) & 0xFFFF
                        else:
                            at = ro_at + 2 * k + ro[k] + 2 * (c - mulai[k])
                            gid = struct.unpack('>H', b[at:at + 2])[0]
                            gid = (gid + delta[k]) & 0xFFFF if gid else 0
                        if gid:
                            self.cmap.setdefault(c, gid)

    def lebar(self, teks, pt):
        return sum(self.adv[min(self.cmap.get(ord(c), 0), len(self.adv) - 1)] for c in teks) / self.upem * pt


def baris_perkiraan(fon, teks, pt, lebar_pt):
    """Jumlah baris bila teks dibungkus per kata ke lebar_pt (perkiraan tanpa kerning)."""
    total = 0
    for bagian in teks.split('\n'):
        n, isi, spasi = 1, 0.0, fon.lebar(' ', pt)
        for kata in bagian.split():
            w = fon.lebar(kata, pt)
            if isi and isi + spasi + w > lebar_pt:
                n, isi = n + 1, w
            else:
                isi += (spasi if isi else 0) + w
            while isi > lebar_pt:  # kata lebih panjang dari baris
                n, isi = n + 1, isi - lebar_pt
        total += n
    return total


# ---------------------------------------------------------------- pembaca berkas

class Paket:
    def __init__(self, path):
        self.path = Path(path)
        self.nama = self.path.name
        self.z = zipfile.ZipFile(self.path)
        self.isi = set(self.z.namelist())

    def xml(self, part):
        return self.z.read(part).decode('utf-8') if part in self.isi else None

    def root(self, part):
        s = self.xml(part)
        return ET.fromstring(s) if s else None

    def rels(self, part):
        d, f = posixpath.split(part)
        r = self.root(posixpath.join(d, '_rels', f + '.rels'))
        out = {}
        for x in ([] if r is None else r.iter(PR + 'Relationship')):
            mode, t = x.get('TargetMode'), x.get('Target')
            tgt = t if mode == 'External' else posixpath.normpath(posixpath.join(d, t)).lstrip('/')
            if t.startswith('/'):
                tgt = t.lstrip('/')
            out[x.get('Id')] = (tgt, x.get('Type', '').rsplit('/', 1)[-1], mode)
        return out

    def judul_meta(self):
        r = self.root('docProps/core.xml')
        t = r.find('{http://purl.org/dc/elements/1.1/}title') if r is not None else None
        return (t.text or '') if t is not None else ''


class Gaya:
    def __init__(self, root):
        self.s, self.def_p, self.def_rpr = {}, None, None
        if root is None:
            return
        self.def_rpr = root.find(f'{W}docDefaults/{W}rPrDefault/{W}rPr')
        for st in root.iter(W + 'style'):
            sid, nm, bs = st.get(W + 'styleId'), st.find(W + 'name'), st.find(W + 'basedOn')
            self.s[sid] = {'nama': nm.get(W + 'val') if nm is not None else sid,
                           'induk': bs.get(W + 'val') if bs is not None else None,
                           'rpr': st.find(W + 'rPr'), 'ppr': st.find(W + 'pPr')}
            if st.get(W + 'type') == 'paragraph' and st.get(W + 'default') in ('1', 'true'):
                self.def_p = sid

    def rantai(self, sid):
        out = []
        while sid and sid in self.s and sid not in out:
            out.append(sid)
            sid = self.s[sid]['induk']
        return out

    def cari(self, sid, bag, tag):
        for x in self.rantai(sid):
            el = self.s[x][bag]
            if el is not None and el.find(W + tag) is not None:
                return el.find(W + tag)
        return None

    def nama(self, sid):
        return self.s[sid]['nama'] if sid in self.s else (sid or 'Normal')

    def cocok(self, sid, pola):
        return any(re.fullmatch(pola, self.s[x]['nama'], re.I) for x in self.rantai(sid))

    def salah_satu(self, sid, nama):
        """Rantai gaya sid memuat salah satu nama (tanpa beda huruf)."""
        nama = {n.lower() for n in nama}
        return any(self.s[x]['nama'].lower() in nama for x in self.rantai(sid))

    def tingkat_judul(self, sid):
        for x in self.rantai(sid):
            m = re.fullmatch(r'heading (\d)', self.s[x]['nama'], re.I)
            if m:
                return int(m[1])
        o = self.cari(sid, 'ppr', 'outlineLvl')
        return int(o.get(W + 'val')) + 1 if o is not None and o.get(W + 'val', '9').isdigit() and int(o.get(W + 'val')) < 9 else 0


class Docx(Paket):
    """Paragraf (teks, run berukuran efektif), urutan blok tubuh, tabel, bidang TOC, seksi."""

    def __init__(self, path):
        super().__init__(path)
        self.g = Gaya(self.root('word/styles.xml'))
        self.tabel, self.blok, self.seksi, self.sym = [], [], [], []
        self.bagian = [('word/document.xml', 'isi')]
        self.bagian += [(n, 'kepala') for n in sorted(self.isi) if re.fullmatch(r'word/header\d*\.xml', n)]
        self.bagian += [(n, 'kaki') for n in sorted(self.isi) if re.fullmatch(r'word/footer\d*\.xml', n)]
        self.bagian += [(n, 'catatan') for n in ('word/footnotes.xml', 'word/endnotes.xml') if n in self.isi]
        self._idx, akar = {}, {}
        for part, jenis in self.bagian:
            akar[part] = self.root(part)
            self._jalan(akar[part], part, jenis, False, [0])
        doc = akar['word/document.xml']
        self.toc = self._bidang(doc)
        body = doc.find(W + 'body')
        sek = 0
        for jenis, el in self._tubuh(body):
            if jenis == 'p':
                p = self._idx[id(el)]
                p['seksi'] = sek
                self.blok.append(('p', p))
                if el.find(f'{W}pPr/{W}sectPr') is not None:
                    self.seksi.append(el.find(f'{W}pPr/{W}sectPr'))
                    sek += 1
            else:
                t = self._info_tabel(el)
                t['seksi'] = sek
                self.tabel.append(t)
                self.blok.append(('tbl', t))
        if body.find(W + 'sectPr') is not None:
            self.seksi.append(body.find(W + 'sectPr'))
        st = self.root('word/settings.xml')
        self.update_fields = st is not None and onoff(st.find(W + 'updateFields'))
        self._penomoran()
        self.info_seksi = self._seksi_info()

    def _penomoran(self):
        """Label nomor otomatis (numbering.xml, mis. lvlText "BAB %1") untuk paragraf bernomor di badan."""
        r = self.root('word/numbering.xml')
        absn, num, hit = {}, {}, {}
        for a in ([] if r is None else r.iter(W + 'abstractNum')):
            lv = {}
            for l in a.findall(W + 'lvl'):
                g = lambda tag: l.find(W + tag).get(W + 'val') if l.find(W + tag) is not None else None
                lv[int(l.get(W + 'ilvl', '0'))] = {'fmt': g('numFmt') or 'decimal', 'teks': g('lvlText') or '',
                                                   'mulai': int(g('start') or 1)}
            absn[a.get(W + 'abstractNumId')] = lv
        for n in ([] if r is None else r.iter(W + 'num')):
            a = n.find(W + 'abstractNumId')
            over = {int(o.get(W + 'ilvl', '0')): int(o.find(W + 'startOverride').get(W + 'val'))
                    for o in n.findall(W + 'lvlOverride') if o.find(W + 'startOverride') is not None}
            num[n.get(W + 'numId')] = (absn.get(a.get(W + 'val') if a is not None else None, {}), over)
        for p in self.badan():
            nid, il = p['numpr']
            if nid not in num or il not in num[nid][0]:
                continue
            lv, over = num[nid]
            c = hit.setdefault(nid, {})
            for k in [k for k in c if k > il]:
                del c[k]
            c[il] = c.get(il, over.get(il, lv[il]['mulai']) - 1) + 1
            if lv[il]['fmt'] in ('bullet', 'none'):
                continue
            teks = lv[il]['teks']
            for k in range(9):
                if f'%{k + 1}' in teks:
                    teks = teks.replace(f'%{k + 1}', _fmt_nomor(c.get(k, lv.get(k, {}).get('mulai', 1)),
                                                                lv.get(k, {}).get('fmt', 'decimal')))
            p['label'] = teks

    def _seksi_info(self):
        """Per seksi: bagian kepala/kaki efektif (default, diwarisi dari seksi sebelumnya bila tanpa rujukan),
        polos (kepala dan kaki kosong: sampul, pembatas), nomor (kaki memuat bidang PAGE), fmt dan start."""
        rel, out, kini = self.rels('word/document.xml'), [], {'header': None, 'footer': None}
        for sp in self.seksi:
            for jenis in ('header', 'footer'):
                ref = [x for x in sp.findall(f'{W}{jenis}Reference') if x.get(W + 'type', 'default') == 'default']
                if ref:
                    kini[jenis] = rel.get(ref[0].get(R + 'id'), (None,))[0]
            pg = sp.find(W + 'pgNumType')
            isi = {j: self._isi_bagian(kini[j]) for j in ('header', 'footer')}
            out.append({'kepala': kini['header'], 'kaki': kini['footer'], 'polos': not isi['header'] and not isi['footer'],
                        'nomor': bool(kini['footer']) and _ada_page(self.xml(kini['footer']) or ''),
                        'fmt': (pg.get(W + 'fmt') if pg is not None else None) or 'decimal',
                        'start': pg.get(W + 'start') if pg is not None else None, 'acuan_kaki': any(
                            x.get(W + 'type', 'default') == 'default' for x in sp.findall(W + 'footerReference'))})
        return out

    def _isi_bagian(self, part):
        s = self.xml(part) if part else None
        if not s:
            return False
        # teks atau bidang saja: gambar latar penuh di kepala sampul/pembatas tidak menjadikannya kepala halaman biasa
        return bool(re.search(r'<w:t[ >][^<]*\S|w:fldCharType="begin"|<w:fldSimple', s))

    def _tubuh(self, el):
        for ch in el:
            if ch.tag in (W + 'p', W + 'tbl'):
                yield ch.tag[len(W):], ch
            elif ch.tag == W + 'sdt' and ch.find(W + 'sdtContent') is not None:
                yield from self._tubuh(ch.find(W + 'sdtContent'))

    def _jalan(self, el, part, jenis, dalam_tabel, n):
        for ch in el:
            if ch.tag == W + 'p':
                n[0] += 1
                self._idx[id(ch)] = self._paragraf(ch, part, jenis, n[0], dalam_tabel)
            else:
                self._jalan(ch, part, jenis, dalam_tabel or ch.tag == W + 'tbl', n)

    def _rpr(self, rpr, rsid, psid, tag):
        if rpr is not None and rpr.find(W + tag) is not None:
            return rpr.find(W + tag)
        for sid, bag in ((rsid, 'rpr'), (psid, 'rpr')):
            if sid and (x := self.g.cari(sid, bag, tag)) is not None:
                return x
        return self.g.def_rpr.find(W + tag) if self.g.def_rpr is not None else None

    def _paragraf(self, p, part, jenis, i, dalam_tabel):
        ppr = p.find(W + 'pPr')
        ps = ppr.find(W + 'pStyle') if ppr is not None else None
        sid = ps.get(W + 'val') if ps is not None else self.g.def_p
        runs = []
        for r in p.iter(W + 'r'):
            teks = ''
            for ch in r:
                if ch.tag == W + 't':
                    teks += ch.text or ''
                elif ch.tag == W + 'tab':
                    teks += '\t'
                elif ch.tag in (W + 'br', W + 'cr'):
                    teks += '\n'
                elif ch.tag == W + 'noBreakHyphen':
                    teks += '-'
                elif ch.tag == W + 'sym':
                    self.sym.append((part, i, ch.get(W + 'font', '?')))
            rpr = r.find(W + 'rPr')
            rs = rpr.find(W + 'rStyle') if rpr is not None else None
            rsid = rs.get(W + 'val') if rs is not None else None
            sz = self._rpr(rpr, rsid, sid, 'sz')
            att = lambda tag, a: (x.get(W + a) if (x := self._rpr(rpr, rsid, sid, tag)) is not None else None)
            shd, bdr = att('shd', 'fill'), att('bdr', 'color')
            runs.append({'teks': teks, 'sz': int(sz.get(W + 'val')) if sz is not None else 20,
                         'tebal': onoff(self._rpr(rpr, rsid, sid, 'b')), 'warna': (att('color', 'val') or '').upper(),
                         'shd': None if shd in (None, 'auto') else shd.upper(),
                         'bdr': None if bdr is None or att('bdr', 'val') in ('nil', 'none') else bdr.upper()})
        ind = ppr.find(W + 'ind') if ppr is not None else None
        ind = ind if ind is not None else self.g.cari(sid, 'ppr', 'ind')
        kiri = int(ind.get(W + 'left', ind.get(W + 'start', '0')) or 0) / 20 if ind is not None else 0.0
        teks = ''.join(r['teks'] for r in runs)
        np_ = ppr.find(W + 'numPr') if ppr is not None else None
        np_ = np_ if np_ is not None else self.g.cari(sid, 'ppr', 'numPr')
        nid = np_.find(W + 'numId') if np_ is not None else None
        il = np_.find(W + 'ilvl') if np_ is not None else None
        seq = self._seq(p)
        return {'part': part, 'jenis': jenis, 'i': i, 'gaya': sid, 'nama_gaya': self.g.nama(sid), 'teks': teks,
                'runs': runs, 'tabel': dalam_tabel, 'el': p, 'kiri_pt': kiri, 'label': '',
                'numpr': (nid.get(W + 'val') if nid is not None else None, int(il.get(W + 'val')) if il is not None else 0),
                'judul': self.g.tingkat_judul(sid), 'caption': self.g.cocok(sid, 'caption') or seq, 'seq': seq,
                'toc': self.g.cocok(sid, r'toc \d|toc heading|table of figures'),
                'gambar': self._gambar(p),
                'lok': f'p.{i}' if part == 'word/document.xml' else f'{posixpath.basename(part)} p.{i}'}

    @staticmethod
    def _seq(p):
        return any(re.match(r'\s*SEQ\b', x.text or '') for x in p.iter(W + 'instrText')) or \
            any(re.match(r'\s*SEQ\b', x.get(W + 'instr', '')) for x in p.iter(W + 'fldSimple'))

    @staticmethod
    def _gambar(p):
        out = []
        for d in p.iter(W + 'drawing'):
            ext = d.find(f'.//{WP}extent')
            out.append(int(ext.get('cx', 0)) / EMU_PT if ext is not None else 0)
        return out

    def _bidang(self, root):
        tumpuk, hasil = [], []
        for el in root.iter():
            t = el.tag
            if t == W + 'p':
                for f in tumpuk:
                    if f['fase'] == 'hasil':
                        f['entri'].append('')
            elif t == W + 'fldChar':
                ty = el.get(W + 'fldCharType')
                if ty == 'begin':
                    tumpuk.append({'instr': '', 'fase': 'instr', 'entri': ['']})
                elif ty == 'separate' and tumpuk:
                    tumpuk[-1]['fase'] = 'hasil'
                elif ty == 'end' and tumpuk:
                    hasil.append(tumpuk.pop())
            elif t == W + 'instrText' and tumpuk and tumpuk[-1]['fase'] == 'instr':
                tumpuk[-1]['instr'] += el.text or ''
            elif t in (W + 't', W + 'tab'):
                for f in tumpuk:
                    if f['fase'] == 'hasil':
                        f['entri'][-1] += (el.text or '') if t == W + 't' else '\t'
        return [{'instr': norm(f['instr']), 'entri': [norm(e) for e in f['entri'] if norm(e)]}
                for f in hasil if norm(f['instr']).startswith('TOC')]

    def _info_tabel(self, tbl):
        tp = tbl.find(W + 'tblPr')
        cap = tp.find(W + 'tblCaption') if tp is not None else None
        tb = tp.find(W + 'tblBorders') if tp is not None else None
        baris = []
        for tr in tbl.findall(W + 'tr'):
            sel = []
            for tc in tr.findall(W + 'tc'):
                pars = [self._idx[id(p)] for p in tc.iter(W + 'p') if id(p) in self._idx]
                shd = tc.find(f'{W}tcPr/{W}shd')
                fill = shd.get(W + 'fill') if shd is not None else None
                fill = None if fill in (None, 'auto', 'FFFFFF', 'ffffff') else fill.upper()
                jc = [(p['el'].find(f'{W}pPr/{W}jc').get(W + 'val') if p['el'].find(f'{W}pPr/{W}jc') is not None else None)
                      for p in pars]
                bd = tc.find(f'{W}tcPr/{W}tcBorders')
                sel.append({'teks': norm(' '.join(p['teks'] for p in pars)), 'fill': fill, 'jc': jc, 'pars': pars,
                            'tegak': [x.tag[len(W):] for x in (bd if bd is not None else [])
                                      if x.tag[len(W):] in ('left', 'right', 'start', 'end', 'insideV')
                                      and x.get(W + 'val') not in ('nil', 'none')]})
                gs = tc.find(f'{W}tcPr/{W}gridSpan')  # sel gabungan: sisipkan sel kosong supaya kolom tetap sejajar
                sel += [{'teks': '', 'fill': fill, 'jc': [], 'pars': [], 'tegak': []}
                        for _ in range(int(gs.get(W + 'val', '1')) - 1 if gs is not None else 0)]
            baris.append({'kepala': onoff(tr.find(f'{W}trPr/{W}tblHeader')), 'sel': sel})
        tegak = [x.tag[len(W):] for x in (tb if tb is not None else [])
                 if x.tag[len(W):] in ('left', 'right', 'start', 'end', 'insideV') and x.get(W + 'val') not in ('nil', 'none')]
        par0 = next((s['pars'][0] for b in baris for s in b['sel'] if s['pars']), None)
        return {'baris': baris, 'caption': cap.get(W + 'val') if cap is not None else None, 'tegak': tegak,
                'teks': norm(' '.join(s['teks'] for b in baris for s in b['sel'])),
                'lok': par0['lok'] if par0 else '?'}

    def badan(self):
        return [p for p in self.par_semua() if p['part'] == 'word/document.xml']

    def polos(self, seksi):
        """Seksi tanpa kepala dan kaki (sampul, pembatas Lampiran, sampul belakang)."""
        return bool(self.info_seksi) and self.info_seksi[min(seksi, len(self.info_seksi) - 1)]['polos']

    def par_semua(self):
        return sorted(self._idx.values(), key=lambda p: (p['part'] != 'word/document.xml', p['part'], p['i']))


def _lst_sz(el):
    """{tingkat 1..9: sz pt} dari a:lstStyle, p:titleStyle/bodyStyle/otherStyle, atau p:defaultTextStyle."""
    out = {}
    for n in range(1, 10):
        d = el.find(f'{A}lvl{n}pPr/{A}defRPr') if el is not None else None
        if d is not None and d.get('sz'):
            out[n] = int(d.get('sz')) / 100
    return out


def _srgb(el):
    """Hex srgbClr di dalam solidFill el (None bila noFill, tidak ada, atau warna skema)."""
    if el is None:
        return None
    c = el.find(f'{A}solidFill/{A}srgbClr')
    return c.get('val').upper() if c is not None else None


class Pptx(Paket):
    """Slide: bentuk berposisi mutlak (transformasi grup diterapkan), ukuran huruf efektif lewat rantai pewarisan
    (run, paragraf, lstStyle bentuk, placeholder tata letak dan master, txStyles master, defaultTextStyle)."""

    def __init__(self, path):
        super().__init__(path)
        pres = self.root('ppt/presentation.xml')
        rel = self.rels('ppt/presentation.xml')
        self.bawaan = _lst_sz(pres.find(P + 'defaultTextStyle'))
        self.slide = []
        for n, s in enumerate(pres.iterfind(f'{P}sldIdLst/{P}sldId'), 1):
            part = rel[s.get(R + 'id')][0]
            r = self.root(part)
            lay = next((t for t, j, _ in self.rels(part).values() if j == 'slideLayout'), None)
            mas = next((t for t, j, _ in self.rels(lay).values() if j == 'slideMaster'), None) if lay else None
            self._kini = (self.root(lay) if lay else None, self.root(mas) if mas else None)
            self.slide.append({'no': n, 'part': part, 'sembunyi': r.get('show') == '0',
                               'latar': next((h for h in (_srgb(x.find(f'{P}cSld/{P}bg/{P}bgPr')) for x in (r, *self._kini)
                                                          if x is not None) if h), 'FFFFFF'),
                               'bentuk': list(self._bentuk(r.find(f'{P}cSld/{P}spTree'), (0, 0, 1, 1)))})

    def _ph_lst(self, ph):
        """lstStyle placeholder yang sepadan di tata letak lalu master, lalu txStyles master, sebagai daftar {lvl: sz}."""
        if ph is None:
            return [self.bawaan]
        tipe, idx = ph.get('type', 'body'), ph.get('idx')
        out = []
        for akar in self._kini:
            if akar is None:
                continue
            for sp in akar.iter(P + 'sp'):
                q = sp.find(f'{P}nvSpPr/{P}nvPr/{P}ph')
                if q is not None and ((idx and q.get('idx') == idx) or q.get('type', 'body') == tipe):
                    out.append(_lst_sz(sp.find(f'{P}txBody/{A}lstStyle')))
                    break
        mas = self._kini[1]
        gaya = 'titleStyle' if tipe in ('title', 'ctrTitle') else 'bodyStyle' if tipe in ('body', 'obj', 'subTitle') else 'otherStyle'
        if mas is not None:
            out.append(_lst_sz(mas.find(f'{P}txStyles/{P}{gaya}')))
        return out + [self.bawaan]

    def _runs(self, txbody, skala=1.0, ph=None):
        rantai = [_lst_sz(txbody.find(A + 'lstStyle'))] + self._ph_lst(ph)
        pars = []
        for ap in txbody.iter(A + 'p'):
            ppr = ap.find(A + 'pPr')
            lvl = int(ppr.get('lvl', 0)) + 1 if ppr is not None else 1
            dp = ppr.find(A + 'defRPr') if ppr is not None else None
            bawaan = next((d[lvl] for d in rantai if lvl in d), 18.0)
            if dp is not None and dp.get('sz'):
                bawaan = int(dp.get('sz')) / 100
            runs = []
            for x in ap:
                if x.tag in (A + 'r', A + 'fld'):
                    rp = x.find(A + 'rPr')
                    sz = rp.get('sz') if rp is not None else None
                    runs.append({'teks': ''.join(t.text or '' for t in x.iter(A + 't')),
                                 'sz': (int(sz) / 100 if sz else bawaan) * skala, 'warisan': not sz,
                                 'tebal': rp is not None and rp.get('b') in ('1', 'true'), 'warna': _srgb(rp),
                                 'fld': x.get('type') if x.tag == A + 'fld' else None})
                elif x.tag == A + 'br':
                    runs.append({'teks': '\n', 'sz': None, 'tebal': False, 'warna': None, 'fld': None})
            pars.append(runs)
        return pars

    def _bentuk(self, akar, tf):
        """Bentuk anak akar; tf = (dx, dy, sx, sy) memetakan koordinat anak ke koordinat slide (pt)."""
        dx, dy, sx, sy = tf

        def kotak(xfrm):
            off, ext = (xfrm.find(A + 'off'), xfrm.find(A + 'ext')) if xfrm is not None else (None, None)
            if off is None or ext is None:
                return None, None, None, None
            return (dx + int(off.get('x')) / EMU_PT * sx, dy + int(off.get('y')) / EMU_PT * sy,
                    int(ext.get('cx')) / EMU_PT * sx, int(ext.get('cy')) / EMU_PT * sy)
        for el in akar:
            if el.tag == P + 'grpSp':
                xf = el.find(f'{P}grpSpPr/{A}xfrm')
                x, y, w, h = kotak(xf)
                co, ce = (xf.find(A + 'chOff'), xf.find(A + 'chExt')) if xf is not None else (None, None)
                if x is not None and co is not None and ce is not None and int(ce.get('cx')) and int(ce.get('cy')):
                    ksx, ksy = w / (int(ce.get('cx')) / EMU_PT), h / (int(ce.get('cy')) / EMU_PT)
                    yield from self._bentuk(el, (x - int(co.get('x')) / EMU_PT * ksx, y - int(co.get('y')) / EMU_PT * ksy, ksx, ksy))
                else:
                    yield from self._bentuk(el, tf)
            elif el.tag == P + 'sp':
                tx, nv, sppr = el.find(P + 'txBody'), el.find(f'{P}nvSpPr'), el.find(P + 'spPr')
                ph = nv.find(f'{P}nvPr/{P}ph') if nv is not None else None
                x, y, w, h = kotak(sppr.find(A + 'xfrm') if sppr is not None else None)
                bp = tx.find(A + 'bodyPr') if tx is not None else None
                fit = bp.find(A + 'normAutofit') if bp is not None else None
                skala = int(fit.get('fontScale', 100000)) / 100000 if fit is not None else 1.0
                ins = {k: int(bp.get(k, d)) / EMU_PT if bp is not None else d / EMU_PT
                       for k, d in (('lIns', 91440), ('rIns', 91440), ('tIns', 45720), ('bIns', 45720))}
                geo = sppr.find(A + 'prstGeom') if sppr is not None else None
                ln = sppr.find(A + 'ln') if sppr is not None else None
                yield {'jenis': 'sp', 'nama': nv.find(P + 'cNvPr').get('name', '') if nv is not None else '',
                       'ph': ph.get('type', 'body') if ph is not None else None, 'x': x, 'y': y, 'w': w, 'h': h,
                       'ins': ins['lIns'] + ins['rIns'], 'lIns': ins['lIns'], 'tIns': ins['tIns'], 'bIns': ins['bIns'],
                       'jangkar': bp.get('anchor', 't') if bp is not None else 't',
                       'isi': sppr is not None and sppr.find(A + 'solidFill') is not None, 'isi_warna': _srgb(sppr),
                       'garis_warna': _srgb(ln) if ln is not None and ln.find(A + 'noFill') is None else None,
                       'geom': geo.get('prst') if geo is not None else None,
                       'rata': {(q.find(A + 'pPr').get('algn', 'l') if q.find(A + 'pPr') is not None else 'l')
                                for q in (tx.iter(A + 'p') if tx is not None else [])},
                       'par': self._runs(tx, skala, ph) if tx is not None else []}
            elif el.tag == P + 'cxnSp':
                sppr = el.find(P + 'spPr')
                x, y, w, h = kotak(sppr.find(A + 'xfrm') if sppr is not None else None)
                ln = sppr.find(A + 'ln') if sppr is not None else None
                yield {'jenis': 'garis', 'nama': '', 'x': x, 'y': y, 'w': w, 'h': h, 'par': [],
                       'warna': _srgb(ln), 'tebal': int(ln.get('w', 12700)) / EMU_PT if ln is not None else None}
            elif el.tag == P + 'pic':
                x, y, w, h = kotak(el.find(f'{P}spPr/{A}xfrm'))
                yield {'jenis': 'pic', 'nama': '', 'x': x, 'y': y, 'w': w, 'h': h, 'par': []}
            elif el.tag == P + 'graphicFrame' and el.find(f'.//{A}tbl') is not None:
                nm = el.find(f'{P}nvGraphicFramePr/{P}cNvPr')
                x, y, w, h = kotak(el.find(P + 'xfrm'))
                sel = [[self._runs(tc.find(A + 'txBody')) if tc.find(A + 'txBody') is not None else []
                        for tc in tr.findall(A + 'tc')] for tr in el.find(f'.//{A}tbl').findall(A + 'tr')]
                yield {'jenis': 'tbl', 'nama': nm.get('name', '') if nm is not None else '', 'sel': sel,
                       'x': x, 'y': y, 'w': w, 'h': h, 'par': [p for row in sel for c in row for p in c]}

    def teks_slide(self, s):
        return '\n'.join(''.join(r['teks'] for r in p) for b in s['bentuk'] for p in b['par'])


class Pdf:
    def __init__(self, path):
        self.path = Path(path)
        self.nama = self.path.name
        run = lambda *a: subprocess.run(a, capture_output=True, text=True, check=True).stdout
        self.hal = run('pdftotext', '-enc', 'UTF-8', str(path), '-').split('\f')[:-1]
        self.tata = run('pdftotext', '-layout', '-enc', 'UTF-8', str(path), '-').split('\f')[:-1]
        self.n = int(re.search(r'^Pages:\s+(\d+)', run('pdfinfo', str(path)), re.M)[1])
        baris = run('pdffonts', str(path)).splitlines()[2:]
        self.fon = sorted({re.sub(r'^[A-Z]{6}\+', '', b.split()[0]) for b in baris if b.strip()})


def nama_manifest(berkas):
    """Kontrak satu nama: <stem>.manifest.json di samping berkasnya (K.docx -> K.manifest.json). DOCX dan PPTX satu
    kajian tidak boleh berbagi stem, karena PDF keduanya pun akan bertabrakan (K.pdf)."""
    return Path(berkas).with_suffix('.manifest.json')


class Ctx:
    def __init__(self, docx=None, pdf=None, pptx=None, pptx_pdf=None, manifest_docx=None, manifest_pptx=None,
                 kajian=None, lain=(), tema=None, render=True, visual=None):
        self.tema = tema or muat_tema()
        self.visual = visual  # folder keluaran bangun/visual/render.mjs (D-8, D-21, D-24, D-28)
        self.docx = Docx(docx) if docx else None
        self.pptx = Pptx(pptx) if pptx else None
        self.pdf = Pdf(pdf) if pdf else None
        self.pptx_pdf = Pdf(pptx_pdf) if pptx_pdf else None
        self.man, self.man_galat, self.man_penuh = {}, {}, {}
        for berkas, m in ((docx, manifest_docx), (pptx, manifest_pptx)):
            if berkas:
                m = Path(m) if m else nama_manifest(berkas)
                if m.exists():
                    d = json.loads(m.read_text(encoding='utf-8'))
                    if not isinstance(d, dict) or not isinstance(d.get('angka'), list):
                        self.man_galat[Path(berkas).name] = f'{m.name}: harus objek berkunci "angka" (daftar), lihat qa/README.md'
                    else:
                        self.man[Path(berkas).name] = d['angka']
                        self.man_penuh[Path(berkas).name] = d
        self.lain = [Path(x) for x in lain]
        self.kajian, self.render = kajian, render
        fb = self.tema['font']['berkas']
        self.fon = {k: Fon(v) for k, v in fb.items()}

    def fon_untuk(self, tebal):
        return self.fon['bold' if tebal else 'regular']


# ---------------------------------------------------------------- sumber teks

def teks_tampil(ctx, pdf=True):
    """(berkas, lokasi, teks) semua teks yang dibaca orang."""
    if ctx.docx:
        d = ctx.docx
        for p in d.par_semua():
            yield d.nama, p['lok'], p['teks']
        yield d.nama, 'docProps/core.xml judul', d.judul_meta()
    if ctx.pptx:
        for s in ctx.pptx.slide:
            for b in s['bentuk']:
                for p in b['par']:
                    yield ctx.pptx.nama, f"slide {s['no']} '{b['nama']}'", ''.join(r['teks'] for r in p)
        yield ctx.pptx.nama, 'docProps/core.xml judul', ctx.pptx.judul_meta()
    if pdf:
        for f in (ctx.pdf, ctx.pptx_pdf):
            if f:
                for i, h in enumerate(f.hal, 1):
                    yield f.nama, f'hlm. {i}', h
    for f in ctx.lain:
        s = f.read_text(encoding='utf-8')
        if f.suffix in ('.svg', '.html', '.htm'):
            s = re.sub(r'<style.*?</style>|<script.*?</script>', '', s, flags=re.S)
            s = re.sub(r'<title>(.*?)</title>', r'\n\1\n', s, flags=re.S)
            s = re.sub(r'<[^>]+>', '\n', s)
        for i, b in enumerate(s.splitlines(), 1):
            yield f.name, f'baris {i}', b


def potong(s, n=60):
    s = norm(s)
    return s if len(s) <= n else s[:n - 3] + '...'


def cari_char(ctx, ch, apa):
    out = []
    for berkas, lok, t in teks_tampil(ctx):
        if ch in t:
            out.append((berkas, lok, f'{apa} U+{ord(ch):04X} x{t.count(ch)} dalam "{potong(t)}"'))
    for f in ctx.lain:  # berkas lain dihitung mentah (termasuk atribut dan CSS)
        mentah = f.read_text(encoding='utf-8')
        if ch in mentah and not any(o[0] == f.name for o in out):
            out.append((f.name, 'mentah', f'{apa} U+{ord(ch):04X} x{mentah.count(ch)}'))
    return out


# ---------------------------------------------------------------- objek bernomor (dipakai beberapa gerbang)

RE_KET = re.compile(r'^(Gambar|Tabel)\s+((RE|[A-Z]|\d+)\.(\d+))\b')
KARTU = ('skenario', 'kartu-angka')  # w:tblCaption kotak majemuk (qa/README.md)


def _akhir_kartu(x):
    return x[0] == 'p' and (norm(x[1]['teks']).startswith('Sumber:') or x[1]['judul'] or (x[1]['caption'] and not x[1]['toc']))


def objek_bernomor(d):
    """[{label, nomor, awalan, urut, caption, objek: [blok], isi: [blok], kartu, sumber: par|None}] dari urutan blok.
    Objek biasa = tabel/gambar berturut tepat di bawah keterangan; tanpa melewati paragraf kosong, karena "Sumber:"
    harus paragraf pertama sesudah objek (D-7). Kartu majemuk (tabel pertama ber-w:tblCaption skenario atau kartu-angka,
    PEDOMAN B5.11) = semua blok sampai baris "Sumber:" kaki kartu, judul, atau keterangan berikutnya."""
    blok, out = d.blok, []
    for i, (jenis, x) in enumerate(blok):
        if jenis != 'p' or not x['caption'] or x['toc']:
            continue
        m = RE_KET.match(norm(x['teks']))
        o = {'caption': x, 'label': m[1] if m else None, 'nomor': m[2] if m else None, 'awalan': m[3] if m else None,
             'urut': int(m[4]) if m else None, 'objek': [], 'isi': [], 'sumber': None, 'kartu': False}
        j = i + 1
        o['kartu'] = j < len(blok) and blok[j][0] == 'tbl' and blok[j][1]['caption'] in KARTU
        while j < len(blok) and (not _akhir_kartu(blok[j]) if o['kartu'] else (blok[j][0] == 'tbl' or blok[j][1]['gambar'])):
            if blok[j][0] == 'tbl' or blok[j][1]['gambar']:
                o['objek'].append(blok[j])
            o['isi'].append(blok[j])
            j += 1
        if j < len(blok) and blok[j][0] == 'p' and norm(blok[j][1]['teks']).startswith('Sumber:'):
            o['sumber'] = blok[j][1]
        out.append(o)
    return out


def label_keyakinan(tema):
    """Label tampil persis (tema.json kosakata.keyakinan) beserta varian bertambahan ("Estimasi model, belum diuji balik")."""
    out = {}
    for k, v in tema['kosakata']['keyakinan'].items():
        if k.startswith('_'):
            continue
        out[v['label']] = v
        for t in v.get('tambahan', []):
            out[f'{v["label"]}, {t}'] = out[f'{v["label"]}; {t}'] = v
    return out


def ada_keyakinan(tema, teks=(), runs=()):
    """Label keyakinan sah: pola "Keyakinan: <label>" di teks, atau run/sel yang teksnya persis satu label."""
    lab = label_keyakinan(tema)
    pola = re.compile(r'Keyakinan:\s*(' + '|'.join(sorted(map(re.escape, lab), key=len, reverse=True)) + r')(?![\w])')
    return any(pola.search(norm(t)) or norm(t) in lab for t in teks) or any(norm(r) in lab for r in runs)


def ambang_gambar(tema):
    return tema['objek']['lebar_cm']['tiga-kolom'] * CM_PT * 0.9


def bagian_pustaka(d, tema):
    """Entri sesudah judul DAFTAR PUSTAKA: paragraf berturut bergaya pustaka (tema.json qa.gaya_pustaka); berhenti di
    paragraf berisi pertama bergaya lain (mis. pembatas LAMPIRAN bergaya Normal) atau di judul tingkat 1."""
    out, dalam = [], False
    for p in d.badan():
        if p['judul'] == 1:
            if dalam:
                break
            dalam = norm(p['teks']).upper() == 'DAFTAR PUSTAKA'
            continue
        if not dalam or p['tabel'] or not norm(p['teks']):
            continue
        if not d.g.salah_satu(p['gaya'], tema['qa']['gaya_pustaka']):
            break
        out.append(p)
    return out


def hex_token(tema, token):
    """Hex (tanpa #, kapital) untuk nama token warna tema.json (navy, teks-3, tint.netral.pita, ...)."""
    w = tema['warna']
    for grup in ('inti', 'aksen'):
        if token in w[grup]:
            return w[grup][token]['hex'].lstrip('#').upper()
    if token.startswith('tint.'):
        _, a, b = token.split('.')
        return w['tint'][a][b].lstrip('#').upper()
    raise KeyError(f'token warna "{token}" tidak ada di tema.json')


def kolom_kepala(t, tema):
    """Indeks kolom tabel DOCX yang kepalanya ada di tema.json qa.kolom_tanpa_rata_kanan (No, peringkat, kode)."""
    kep = next((b for b in t['baris'] if b['kepala']), t['baris'][0] if t['baris'] else None)  # tanpa tblHeader: baris pertama
    boleh = {k.upper() for k in tema['qa']['kolom_tanpa_rata_kanan']}
    # kolom kode dan peringkat sering bernama "KODE JUKLAK", "PERINGKAT DAFTAR": kata pertama menentukan jenis kolomnya
    awal = {'KODE', 'PERINGKAT'}
    return {i for i, s in enumerate(kep['sel']) if (h := norm(s['teks']).upper()) in boleh or h.split(' ')[0] in awal} if kep else set()


# ---------------------------------------------------------------- gerbang

GERBANG = []


def gerbang(kode, judul):
    def deko(fn):
        GERBANG.append((kode, judul, fn))
        return fn
    return deko


def butuh(*x):
    if not any(x):
        raise TakBerlaku('berkas masukan tidak diberikan')


@gerbang('D-1', 'Em dash nol')
def d1(ctx):
    return cari_char(ctx, '\u2014', 'em dash')


@gerbang('D-2', 'Titik tengah nol')
def d2(ctx):
    return cari_char(ctx, '\u00b7', 'titik tengah')


@gerbang('D-3', 'Emoji nol')
def d3(ctx):
    out = [(b, lok, f'emoji {" ".join(sorted(set(RE_EMOJI.findall(t))))} dalam "{potong(t)}"')
           for b, lok, t in teks_tampil(ctx) if RE_EMOJI.search(t)]
    return out


def _roboto(nama):
    return nama == '' or nama.startswith('Roboto') or nama.startswith('+m')


@gerbang('D-4', 'Font hanya Roboto')
def d4(ctx):
    out = []
    if ctx.docx:
        d = ctx.docx
        parts = [p for p, _ in d.bagian] + [x for x in ('word/styles.xml', 'word/numbering.xml') if x in d.isi]
        for part in parts:
            for m in re.finditer(r'<w:rFonts\b([^>]*)/?>', d.xml(part) or ''):
                for k, v in re.findall(r'w:(ascii|hAnsi|eastAsia|cs)="([^"]*)"', m[1]):
                    if not _roboto(v):
                        out.append((d.nama, part, f'w:rFonts {k}="{v}"; hanya keluarga Roboto'))
        for part, i, f in d.sym:
            out.append((d.nama, f'{posixpath.basename(part)} p.{i}', f'w:sym berfont "{f}"; simbol harus teks Roboto'))
        out += _tema_fon(d, 'word/theme/theme1.xml')
    if ctx.pptx:
        x = ctx.pptx
        for part in sorted(x.isi):
            if re.fullmatch(r'ppt/(slides/slide|slideLayouts/slideLayout|slideMasters/slideMaster)\d+\.xml', part):
                for tag, v in re.findall(r'<a:(latin|ea|cs|sym|buFont) typeface="([^"]*)"', x.xml(part)):
                    if not _roboto(v):
                        out.append((x.nama, part, f'a:{tag} typeface="{v}"; hanya keluarga Roboto'))
        for part in sorted(p for p in x.isi if re.fullmatch(r'ppt/theme/theme\d+\.xml', p)):
            out += _tema_fon(x, part)
    for f in (ctx.pdf, ctx.pptx_pdf):
        if f:
            out += [(f.nama, 'pdffonts', f'font "{n}" tertanam; hanya Roboto') for n in f.fon if not n.startswith('Roboto')]
    for f in ctx.lain:
        s = f.read_text(encoding='utf-8')
        for v in re.findall(r'font-family\s*:\s*([^;}"]+)', s) + re.findall(r'font-family="([^"]+)"', s):
            if [k for k in (x.strip(" '") for x in v.split(',')) if k and not k.startswith('Roboto') and k not in ('sans-serif', 'inherit')]:
                out.append((f.name, 'CSS', f'font-family: {v.strip()}; hanya Roboto'))
        for u in re.findall(r'url\((["\']?)(https?://[^)"\']+)\1\)', s):
            out.append((f.name, '@font-face', f'URL font CDN {u[1]}; font harus lokal'))
    if not (ctx.docx or ctx.pptx or ctx.pdf or ctx.pptx_pdf or ctx.lain):
        raise TakBerlaku('berkas masukan tidak diberikan')
    return out


def _tema_fon(pk, part):
    r = pk.root(part)
    if r is None:
        return []
    out = []
    fs = r.find(f'.//{A}fontScheme')
    for grup in ('majorFont', 'minorFont'):
        g = fs.find(A + grup) if fs is not None else None
        for tag in ('latin', 'ea', 'cs'):
            el = g.find(A + tag) if g is not None else None
            if el is not None and not _roboto(el.get('typeface', '')):
                out.append((pk.nama, part, f'{grup} a:{tag} typeface="{el.get("typeface")}"; font tema harus Roboto'))
    return out


@gerbang('D-5', 'Huruf terkecil')
def d5(ctx):
    butuh(ctx.docx, ctx.pptx)
    out = []
    if ctx.docx:
        bb = ctx.tema['tipografi_docx']['batas_bawah_pt']
        for p in ctx.docx.par_semua():
            kecil = [r for r in p['runs'] if r['teks'].strip() and r['sz'] < 2 * bb]
            if kecil:
                sz = min(r['sz'] for r in kecil)
                out.append((ctx.docx.nama, p['lok'], f'w:sz={sz} ({sz / 2:g} pt) < {2 * bb:g} ({bb:g} pt), gaya "{p["nama_gaya"]}", '
                            f'teks "{potong(kecil[0]["teks"], 40)}"'))
    if ctx.pptx:
        ts = ctx.tema['slide']['tipografi']
        bb, (lo, hi) = ts['batas_bawah_pt'], ts['pengecualian_bawah']['ukuran_pt']
        for s in ctx.pptx.slide:
            # chip = bentuk berisi warna setinggi pil, atau kotak teks yang duduk di atas bentuk seperti itu
            pil = [b for b in s['bentuk'] if b['jenis'] == 'sp' and b['isi'] and b['h'] is not None and b['h'] <= 24]
            di_pil = lambda b: b['jenis'] == 'sp' and b['x'] is not None and any(
                q['x'] <= b['x'] + b['w'] / 2 <= q['x'] + q['w'] and q['y'] <= b['y'] + b['h'] / 2 <= q['y'] + q['h'] for q in pil)
            for b in s['bentuk']:
                for p in b['par']:
                    for r in p:
                        if not r['teks'].strip() or r['sz'] is None or r['sz'] >= bb:
                            continue
                        persen = re.fullmatch(r'[+-]?[\d.,]+\s?%', r['teks'].strip())
                        chip = (b in pil or di_pil(b)) and len(''.join(x['teks'] for x in p)) <= 30
                        if lo <= r['sz'] + 1e-6 and ((b['jenis'] == 'tbl' and persen) or chip):
                            continue
                        out.append((ctx.pptx.nama, f"slide {s['no']} '{b['nama']}'",
                                    f'{r["sz"]:.2f} pt{" (diwarisi lstStyle/tata letak/master, run tanpa sz)" if r.get("warisan") else ""}'
                                    f' < {bb:g} pt (pengecualian {lo:g}-{hi:g} pt hanya persen tabel dan chip), '
                                    f'teks "{potong(r["teks"], 40)}"'))
    return out


@gerbang('D-6', 'Angka silang')
def d6(ctx):
    butuh(ctx.docx, ctx.pptx)
    out = [(nama, 'manifest', g) for nama, g in ctx.man_galat.items()]
    # (a) baris Jumlah = jumlah baris tampil (atau jumlah nilai CSV mentah bila manifest memetakannya)
    for nama, tabel in _semua_tabel(ctx):
        mentah = _mentah(ctx.man.get(nama, []))
        for t_lok, rows in tabel:
            out += [(nama, t_lok, x) for x in _cek_jumlah(rows, mentah)]
    # (b) manifest: angka segar terhadap registri, tampil di dokumen, sama lintas berkas
    if not ctx.man:
        if out:
            return out
        harap = ', '.join(nama_manifest(pk.path).name for pk in (ctx.docx, ctx.pptx) if pk)
        raise Lewat(f'manifest angka tidak ada ({harap}); baris Jumlah sudah diperiksa')
    teks = {}
    if ctx.docx:
        teks[ctx.docx.nama] = norm('\n'.join(p['teks'] for p in ctx.docx.par_semua()))
    if ctx.pptx:
        teks[ctx.pptx.nama] = norm('\n'.join(ctx.pptx.teks_slide(s) for s in ctx.pptx.slide))
    k = naskah.Konteks()
    pakai = {}
    for nama, man in ctx.man.items():
        ada = {m['kunci'] for m in man}
        for m in man:
            kunci, tampil = m['kunci'], norm(m['tampil'])
            if nama in teks and tampil not in teks[nama]:
                out.append((nama, m.get('naskah', kunci), f'angka "{tampil}" ({kunci}) ada di manifest tetapi tidak tampil di berkas'))
            if kunci.startswith('turunan:'):  # dihitung pembangun dari angka lain (mis. "turun 42%"): wajib bersumber
                if not norm(str(m.get('sumber') or '')):
                    out.append((nama, kunci, 'angka turunan tanpa "sumber" (data asal atau rumusnya); lihat qa/README.md'))
                out += [(nama, kunci, f'angka turunan merujuk "{x}" yang tidak ada di manifest') for x in m.get('dari', []) if x not in ada]
                continue
            if kunci.startswith('csv:'):
                rel, _, kol = kunci[4:].partition('#')
                p = AKAR / rel
                if not p.exists():
                    out.append((nama, kunci, f'CSV {rel} tidak ada'))
                    continue
                if round(float(m['nilai']), 9) not in _kolom_csv(p, kol):
                    out.append((nama, kunci, f'nilai {m["nilai"]} tidak ada lagi di kolom {kol}; angka basi, bangun ulang'))
                continue
            try:
                segar = k.suntik(kunci, m.get('opsi', ''), 'qa')
                v = k.nilai(kunci)
            except (KeyError, ValueError) as e:
                out.append((nama, kunci, f'registri menolak: {e}'))
                continue
            if not all(a == b or (isinstance(a, (int, float)) and isinstance(b, (int, float)) and abs(a - b) <= 1e-9 * max(1, abs(b)))
                       for a, b in zip((m.get('nilai'), m.get('rendah'), m.get('tinggi')), v[:3])):
                out.append((nama, kunci, f'nilai manifest {m.get("nilai")}/{m.get("rendah")}/{m.get("tinggi")} != registri '
                            f'{v[0]}/{v[1]}/{v[2]}; angka basi, bangun ulang'))
            elif norm(segar) != tampil:
                out.append((nama, kunci, f'tampil "{tampil}" != format registri "{segar}"'))
            pakai.setdefault((kunci, m.get('opsi', '')), {})[nama] = tampil
            if kunci.startswith('tesis.') and nama == (ctx.docx.nama if ctx.docx else None) and teks[nama].count(tampil) < 2:
                out.append((nama, kunci, 'kalimat tesis harus identik di Ringkasan Eksekutif dan Bab Kesimpulan (tampil < 2 kali)'))
    for (kunci, opsi), per in pakai.items():
        if len(set(per.values())) > 1:
            out.append((' / '.join(per), kunci, f'tampil beda antar berkas: {per}'))
    return out


@functools.lru_cache(maxsize=None)
def _kolom_csv(path, kol):
    with Path(path).open(encoding='utf-8') as f:
        return frozenset(round(float(r[kol]), 9) for r in csv.DictReader(f) if r.get(kol) not in (None, ''))


def _semua_tabel(ctx):
    if ctx.docx:
        yield ctx.docx.nama, [(t['lok'], [[s['teks'] for s in b['sel']] for b in t['baris'] if not b['kepala']])
                              for t in ctx.docx.tabel]
    if ctx.pptx:
        yield ctx.pptx.nama, [(f"slide {s['no']} '{b['nama']}'",
                               [[norm(' '.join(''.join(r['teks'] for r in p) for p in c)) for c in row] for row in b['sel'][1:]])
                              for s in ctx.pptx.slide for b in s['bentuk'] if b['jenis'] == 'tbl']


def _mentah(man):
    """tampil -> {nilai mentah} dari entri csv: manifest (nilai sebelum dibulatkan)."""
    out = {}
    for m in man:
        if m['kunci'].startswith('csv:') and isinstance(m.get('nilai'), (int, float)):
            out.setdefault(norm(m['tampil']), set()).add(float(m['nilai']))
    return out


def _cek_jumlah(rows, mentah=None):
    """Baris Jumlah per kolom. Bila tiap sel terpetakan ke satu nilai CSV mentah lewat manifest: Jumlah = jumlah mentah
    (selisih hanya pembulatan Jumlah itu sendiri). Tanpa itu: kolom bulat tanpa nilai mentah pecahan wajib persis;
    kolom berdesimal boleh selisih pembulatan per baris."""
    out, mentah = [], mentah or {}
    sel = lambda r, c: norm(r[c]) if c < len(r) else ''
    dec_ = lambda x: len(x.split(',')[1]) if ',' in x else 0
    tot = [i for i, r in enumerate(rows) if r and norm(r[0]).lower() in ('jumlah', 'total')]
    for ti in tot:
        isi = [r for r in rows[:ti] if r and not re.match(r'(?i)(sub)?total|jumlah', norm(r[0]))]
        for c in range(1, len(rows[ti])):
            t = angka_id(rows[ti][c])
            vals = [angka_id(sel(r, c)) for r in isi]
            if t is None or not vals or any(v is None and sel(r, c) not in ('\u2013', '') for v, r in zip(vals, isi)):
                continue
            tampil = [sel(r, c) for r, v in zip(isi, vals) if v is not None]
            dec = max(dec_(x) for x in [sel(rows[ti], c)] + tampil)
            peta = [mentah.get(x, set()) for x in tampil]
            if peta and all(len(x) == 1 for x in peta):
                s, asal, tol = sum(next(iter(x)) for x in peta), 'nilai CSV mentah', 0.5 * 10 ** -dec_(sel(rows[ti], c))
            else:
                pecahan = any(v != round(v) for x in peta for v in x)
                s, asal = sum(v for v in vals if v is not None), 'baris tampil'
                tol = 0 if dec == 0 and not pecahan else 0.5 * 10 ** -dec * max(1, len(vals))
            if abs(s - t) > tol + 1e-9:
                out.append(f'baris Jumlah kolom {c + 1} = {rows[ti][c]} tetapi jumlah {len(vals)} {asal} = '
                           f'{naskah.fmt_id(s, max(dec, dec_(sel(rows[ti], c))))} (toleransi {naskah.fmt_id(tol, 2)})')
    return out


@gerbang('D-7', 'Gambar dan Tabel bernomor urut, berketerangan, bersumber')
def d7(ctx):
    butuh(ctx.docx)
    d, out = ctx.docx, []
    obj = objek_bernomor(d)
    seri = {}
    for o in obj:
        c = o['caption']
        if not o['label']:
            out.append((d.nama, c['lok'], f'keterangan "{potong(c["teks"])}" tidak diawali "Gambar n.m" atau "Tabel n.m"'))
            continue
        s = seri.setdefault(o['label'], {'awalan': [], 'nomor': {}})
        if o['awalan'] in s['awalan'] and s['awalan'][-1] != o['awalan']:
            out.append((d.nama, c['lok'], f'{o["label"]} {o["nomor"]}: awalan {o["awalan"]} muncul lagi sesudah awalan lain'))
        if o['awalan'] not in s['awalan']:
            s['awalan'].append(o['awalan'])
        harap = s['nomor'].get(o['awalan'], 0) + 1
        if o['urut'] != harap:
            out.append((d.nama, c['lok'], f'{o["label"]} {o["nomor"]}: nomor {"ganda" if o["urut"] < harap else "loncat"}, '
                        f'harusnya {o["label"]} {o["awalan"]}.{harap}'))
        s['nomor'][o['awalan']] = max(o['urut'], s['nomor'].get(o['awalan'], 0))
        if not o['objek']:
            out.append((d.nama, c['lok'], f'{o["label"]} {o["nomor"]}: tidak ada tabel atau gambar tepat di bawah keterangan'))
        elif o['label'] == 'Tabel' and o['objek'][0][0] != 'tbl':
            out.append((d.nama, c['lok'], f'Tabel {o["nomor"]}: objek di bawahnya bukan tabel'))
        if o['objek'] and not o['sumber']:
            out.append((d.nama, c['lok'], f'{o["label"]} {o["nomor"]}: baris "Sumber:" tidak ada tepat di bawah objek'))
    terpasang = {id(x) for o in obj for _, x in o['objek']}
    batas = ambang_gambar(ctx.tema)
    for jenis, x in d.blok:
        if id(x) in terpasang or d.polos(x['seksi']):
            continue  # seksi tanpa kepala dan kaki: sampul, pembatas Lampiran, sampul belakang (PEDOMAN B4, B5.1, B5.24)
        if jenis == 'tbl' and any(b['kepala'] for b in x['baris']):
            out.append((d.nama, x['lok'], 'tabel data (berbaris kepala) tanpa keterangan "Tabel n.m" di atasnya'))
        elif jenis == 'p' and any(w >= batas for w in x['gambar']):
            out.append((d.nama, x['lok'], f'gambar selebar {max(x["gambar"]) / CM_PT:.1f} cm tanpa keterangan "Gambar n.m" di atasnya'))
    for label in seri:
        n = sum(1 for o in obj if o['label'] == label)
        daftar = [t for t in d.toc if re.search(rf'\\c\s+"?{label}', t['instr'])]
        if not daftar:
            out.append((d.nama, 'Daftar ' + label, f'bidang TOC \\c "{label}" (Daftar {label}) tidak ada'))
        elif daftar[0]['entri'] and len([e for e in daftar[0]['entri'] if e.startswith(label)]) != n:
            out.append((d.nama, 'Daftar ' + label, f'Daftar {label} memuat {len(daftar[0]["entri"])} entri, keterangan {n}; '
                        'perbarui indeks'))
    return out


@gerbang('D-9', 'Hex di luar tema.json nol')
def d9(ctx):
    butuh(ctx.docx, ctx.pptx, ctx.lain)
    sah, larang = hex_tema(ctx.tema)
    out, pola = [], [r'<w:color\b[^>]*\bw:val="([0-9A-Fa-f]{6})"', r'\bw:(?:color|fill)="([0-9A-Fa-f]{6})"',
                     r'<a:srgbClr val="([0-9A-Fa-f]{6})"']
    sumber = []
    if ctx.docx:
        d = ctx.docx
        parts = [x for x, _ in d.bagian] + ['word/styles.xml', 'word/numbering.xml'] + sorted(
            p for p in d.isi if re.fullmatch(r'word/charts/chart\d+\.xml', p))
        sumber += [(d.nama, p, d.xml(p)) for p in parts if p in d.isi]
        out += _warna_skema(d, parts, 'word/theme/theme1.xml', r'w:theme(?:Color|Fill)="(\w+)"', sah, larang)
    if ctx.pptx:
        x = ctx.pptx
        parts = [p for p in sorted(x.isi) if re.fullmatch(
            r'ppt/(slides/slide|slideLayouts/slideLayout|slideMasters/slideMaster|charts/chart)\d+\.xml', p)]
        sumber += [(x.nama, p, x.xml(p)) for p in parts]
        for tm in sorted(p for p in x.isi if re.fullmatch(r'ppt/theme/theme\d+\.xml', p)):
            out += _warna_skema(x, parts, tm, r'<a:schemeClr val="(\w+)"', sah, larang)
    pola_lain = [r'#([0-9A-Fa-f]{6})\b']
    sumber += [(f.name, 'mentah', f.read_text(encoding='utf-8'), pola_lain) for f in ctx.lain]
    for nama, part, s, *pl_khusus in sumber:
        temu = {}
        for pl in (pl_khusus[0] if pl_khusus else pola):
            for h in re.findall(pl, s):
                temu[h.upper()] = temu.get(h.upper(), 0) + 1
        for h in sorted(set(temu) - sah):
            out.append((nama, part, f'#{h} x{temu[h]} tidak ada di tema.json' + (' (terlarang, PEDOMAN B1.6)' if h in larang else '')))
    return out


SKEMA_WORD = {'text1': 'dk1', 'dark1': 'dk1', 'background1': 'lt1', 'light1': 'lt1', 'text2': 'dk2', 'dark2': 'dk2',
              'background2': 'lt2', 'light2': 'lt2', 'hyperlink': 'hlink', 'followedHyperlink': 'folHlink'}


def _warna_skema(pk, parts, tema_part, pola, sah, larang):
    """Warna skema tema (clrScheme) yang dirujuk lewat schemeClr atau w:themeColor/w:themeFill harus ada di tema.json.
    Skema yang tidak dirujuk tidak tampil, jadi tidak diperiksa; peta bg1/tx1 dibaca dari clrMap master."""
    r = pk.root(tema_part)
    cs = r.find(f'.//{A}clrScheme') if r is not None else None
    if cs is None:
        return []
    skema = {}
    for el in cs:
        c = el.find(A + 'srgbClr')
        c = c.get('val') if c is not None else (el.find(A + 'sysClr').get('lastClr') if el.find(A + 'sysClr') is not None else None)
        if c:
            skema[el.tag[len(A):]] = c.upper()
    peta = dict(SKEMA_WORD, bg1='lt1', tx1='dk1', bg2='lt2', tx2='dk2')
    for p in parts:
        m = re.search(r'<p:clrMap ([^>]*)/>', pk.xml(p) or '')
        if m:
            peta.update(re.findall(r'(\w+)="(\w+)"', m[1]))
    rujuk = {}
    for p in parts:
        for v in re.findall(pola, pk.xml(p) or ''):
            if v != 'phClr':
                rujuk.setdefault(peta.get(v, v), set()).add(v)
    return [(pk.nama, tema_part, f'warna skema {k} #{skema[k]} (dirujuk sebagai {"/".join(sorted(rujuk[k]))}) tidak ada di tema.json'
             + (' (terlarang, PEDOMAN B1.6)' if skema[k] in larang else ''))
            for k in sorted(rujuk) if k in skema and skema[k] not in sah]


def daftar_terlarang(tema, kajian=None):
    """glosarium.json {"terlarang": [...]} bila ada; bila belum, tema.json kosakata.istilah.terlarang.
    `terlarang_kajian` ([{kajian, istilah, alasan}]) hanya berlaku di kajian yang disebut (KB SIPPA M7)."""
    g = AKAR / 'data' / 'glosarium.json'
    if g.exists():
        d = json.loads(g.read_text(encoding='utf-8'))
        return ([x if isinstance(x, str) else x['istilah'] for x in d.get('terlarang', [])]
                + [x['istilah'] for x in d.get('terlarang_kajian', []) if kajian and x['kajian'] == kajian])
    return tema['kosakata']['istilah']['terlarang']


def _pola_terlarang(t):
    """Tag riset (huruf kapital semua, mis. [SEKUNDER], TIDAK DITEMUKAN) dicocokkan peka huruf dan berkurung siku
    (PEDOMAN C8: tag [TIDAK DITEMUKAN], bukan frasa "tidak ditemukan"); istilah lain kata utuh tanpa beda huruf."""
    inti = t.strip('[]')
    if re.sub(r'[^A-Za-z]', '', inti).isupper():
        return re.compile(re.escape(f'[{inti}]'))
    return re.compile(r'(?<!\w)' + re.escape(t) + r'(?!\w)', re.I)


@gerbang('D-10', 'Istilah terlarang nol')
def d10(ctx):
    pola = [(t, _pola_terlarang(t)) for t in daftar_terlarang(ctx.tema, _kajian(ctx))]
    pola.append(('"100%" pada peluang', re.compile(r'(?i)(peluang|kemungkinan|probabilitas)[^.]{0,60}?\b100\s?%')))
    out = []
    # judul dokumen sumber di entri Daftar Pustaka ditulis persis seperti terbitannya ("Pasca Bencana" Bappenas 2007);
    # kemunculan sesudah "(Tahun). " sampai titik berikutnya tidak dihitung
    judul_pus = re.compile(r'\((?:1[89]|20)\d{2}[a-z]?\)\. [^.()]*$')
    for b, lok, t in teks_tampil(ctx):
        for nama, pl in pola:
            if any(not judul_pus.search(t[max(0, m.start() - 300):m.start()]) for m in pl.finditer(t)):
                out.append((b, lok, f'istilah terlarang "{nama}" dalam "{potong(t)}"'))
    return out


def _singkatan_dok(d):
    s, dalam = set(SINGKATAN), False
    for p in d.badan():
        if p['judul'] == 1:
            dalam = 'SINGKATAN' in norm(p['teks']).upper()
        elif dalam:
            s |= set(re.findall(r'\b[A-Z][A-Z0-9/&-]+\b', p['teks']))
    return s


@gerbang('D-11', 'Kapital penuh')
def d11(ctx):
    butuh(ctx.docx, ctx.pptx)
    out = []
    if ctx.docx:
        d = ctx.docx
        sing = _singkatan_dok(d)
        boleh = ctx.tema['qa']['gaya_kapital_boleh']  # label pita, kepala kolom, pil, judul bagian depan (PEDOMAN D-11)
        for p in d.badan():
            t = norm(p['teks'])
            huruf = re.sub(r'[^A-Za-z]', '', t)
            if not huruf or p['tabel'] or p['toc'] or p['caption'] or d.g.salah_satu(p['gaya'], boleh):
                continue
            if p['judul'] == 1 and judul_teks(p).upper().startswith('BAB ') and huruf != huruf.upper():
                out.append((d.nama, p['lok'], f'judul bab harus KAPITAL (KEPUTUSAN T1): "{potong(t)}"'))
            elif p['judul'] >= 2 and len(huruf) >= 4 and huruf == huruf.upper():
                out.append((d.nama, p['lok'], f'judul tingkat {p["judul"]} kapital penuh; pakai huruf judul: "{potong(t)}"'))
            elif not p['judul']:
                for m in re.finditer(r'(?:\b[A-Z][A-Z0-9/&-]*[A-Z]\b[\s,]*){3,}', t):
                    kata = [k for k in re.findall(r'[A-Z][A-Z0-9/&-]*[A-Z]', m[0]) if k not in sing]
                    if len(kata) >= 3:
                        out.append((d.nama, p['lok'], f'kapital penuh "{potong(m[0], 50)}" di isi; hanya singkatan resmi'))
    if ctx.pptx:
        for s in ctx.pptx.slide:
            for b in _judul_slide(ctx, s):
                t = norm(''.join(r['teks'] for p in b['par'] for r in p))
                huruf = re.sub(r'[^A-Za-z]', '', t)
                if len(huruf) >= 8 and huruf == huruf.upper():
                    out.append((ctx.pptx.nama, f"slide {s['no']} '{b['nama']}'", f'judul slide kapital penuh: "{potong(t)}"'))
    return out


def _kajian(ctx):
    if ctx.kajian:
        return ctx.kajian
    teks = ' '.join(p['teks'] for p in ctx.docx.par_semua()) if ctx.docx else ''
    for k in kajian_sah(ctx.tema):
        kj = ctx.tema['kajian'][k]
        if kj['judul_pendek'] in teks or kj['judul'] in teks:
            return k
    return None


def _hal_bab1(pdf):
    for i, h in enumerate(pdf.tata):
        for b in h.splitlines():
            if re.match(r'\s*BAB 1\b', b) and not re.search(r'(\.{3,}|\s)\d+\s*$', b.strip()[5:] or ' '):
                return i
    return None


@gerbang('D-12', 'Panjang halaman isi')
def d12(ctx):
    butuh(ctx.pdf)
    kj = _kajian(ctx)
    if not kj:
        raise Lewat('kajian (' + '/'.join(kajian_sah(ctx.tema)) + ') tidak terdeteksi; pakai --kajian')
    if ctx.tema['kajian'][kj].get('batas_halaman_isi') is None:  # KEPUTUSAN P18: batas halaman dicabut pemilik 24 Okt 2026
        return []  # null = tidak ada batas; D-12 lolos tanpa membatasi (fixture d12-melebihi-batas tetap menguji batas angka)
    batas = int(ctx.tema['kajian'][kj]['batas_halaman_isi'] * (1 - CADANGAN_PAGINASI))
    mulai = _hal_bab1(ctx.pdf)
    if mulai is None:
        return [(ctx.pdf.nama, '-', 'halaman "BAB 1" tidak ditemukan di PDF')]
    akhir = next((i for i, h in enumerate(ctx.pdf.tata) if i > mulai and any(
        b.strip().upper() in ('DAFTAR PUSTAKA', 'LAMPIRAN') for b in h.splitlines())), ctx.pdf.n)
    isi = akhir - mulai
    if isi > batas:
        return [(ctx.pdf.nama, f'hlm. {mulai + 1}-{akhir}', f'{isi} halaman isi > batas {batas} (tema.json kajian.{kj}.batas_halaman_isi '
                 f'dikurangi {CADANGAN_PAGINASI:.0%} cadangan paginasi)')]
    return []


@gerbang('D-13', 'Penomoran dan indeks terisi')
def d13(ctx):
    butuh(ctx.docx)
    d, out = ctx.docx, []
    if not d.update_fields:
        out.append((d.nama, 'word/settings.xml', 'w:updateFields tidak aktif'))
    isi = [t for t in d.toc if '\\o' in t['instr']] or [t for t in d.toc if '\\c' not in t['instr']]
    h1 = [judul_teks(p) for p in d.badan() if p['judul'] == 1 and norm(p['teks']) and 'lampiran' not in p['nama_gaya'].lower()]
    if not isi:
        out.append((d.nama, 'Daftar Isi', 'bidang TOC daftar isi tidak ada'))
    elif not isi[0]['entri']:
        out.append((d.nama, 'Daftar Isi', 'hasil bidang TOC kosong; perbarui indeks lewat UNO sebelum simpan'))
    else:
        gabung = ' '.join(isi[0]['entri']).upper()
        out += [(d.nama, 'Daftar Isi', f'judul "{h}" tidak ada di Daftar Isi') for h in h1 if h.upper() not in gabung]
    for t in d.toc:
        if '\\c' in t['instr'] and not t['entri']:
            out.append((d.nama, _nama_daftar(t), 'hasil bidang kosong'))
    # gaya entri per tingkat (PEDOMAN B2: TOC1 bab, TOC2 subbab inden 7 mm, TOC3 sub-subbab inden 14 mm)
    for p in d.badan():
        m = re.match(r'toc (\d)', p['nama_gaya'], re.I) if p['toc'] else None
        t = norm(p['teks'])
        harap = 3 if re.match(r'\d+\.\d+\.\d+\b', t) else 2 if re.match(r'\d+\.\d+\b', t) else 1 if re.match(r'BAB \d+\b', t) else None
        if m and harap and int(m[1]) != harap:
            out.append((d.nama, p['lok'], f'entri Daftar Isi "{potong(t, 40)}" bergaya {p["nama_gaya"]}, harus toc {harap} (PEDOMAN B2)'))
    # nomor keterangan dari bidang SEQ, tidak diketik (PEDOMAN B4)
    for p in d.badan():
        if d.g.cocok(p['gaya'], 'caption') and not p['seq'] and not p['toc'] and RE_KET.match(norm(p['teks'])):
            out.append((d.nama, p['lok'], f'keterangan "{potong(p["teks"], 40)}" tanpa bidang SEQ; nomor diketik (PEDOMAN B4)'))
    # penomoran: sampul dan pembatas tanpa nomor; bagian depan romawi kecil; seksi BAB 1 mulai 1 arab. Seksi tanpa
    # footerReference mewarisi kaki seksi sebelumnya (nomornya tetap tampil).
    bab1 = next((p for p in d.badan() if p['judul'] == 1 and judul_teks(p).upper().startswith('BAB 1')), None)
    if bab1 is None:
        out.append((d.nama, '-', 'judul "BAB 1" tidak ditemukan (teks atau label nomor otomatis Heading 1)'))
    elif d.info_seksi:
        for i, s in enumerate(d.info_seksi[:bab1['seksi'] + 1]):
            if i == bab1['seksi']:
                if s['start'] != '1' or s['fmt'] != 'decimal' or not s['nomor']:
                    out.append((d.nama, f'seksi {i + 1}', f'seksi BAB 1 harus mulai 1 arab (w:pgNumType start="1", kaki berbidang PAGE), '
                                f'tertulis fmt={s["fmt"]} start={s["start"]} PAGE={"ada" if s["nomor"] else "tidak ada"}'))
            elif s['nomor'] and s['fmt'] != 'lowerRoman':
                out.append((d.nama, f'seksi {i + 1}', f'bagian depan harus romawi kecil, tertulis fmt={s["fmt"]}'
                            + ('' if s['acuan_kaki'] else ' (kaki berbidang PAGE diwarisi dari seksi sebelumnya)')))
    if ctx.pdf and h1:
        mulai = _hal_bab1(ctx.pdf)
        depan = '\n'.join(ctx.pdf.tata[:mulai] if mulai else []).upper()
        out += [(ctx.pdf.nama, 'Daftar Isi', f'judul "{h}" tidak tercetak di Daftar Isi PDF') for h in h1
                if not h.upper().startswith(('DAFTAR ISI', 'DAFTAR TABEL', 'DAFTAR GAMBAR')) and norm(h).upper() not in norm(depan)]
        if mulai is not None and label_halaman(ctx.pdf.tata[mulai]) != '1':
            out.append((ctx.pdf.nama, f'hlm. {mulai + 1}', f'halaman BAB 1 tidak bernomor 1 (tercetak {label_halaman(ctx.pdf.tata[mulai])})'))
    if ctx.pdf:
        out += _cek_halaman_indeks(d, ctx.pdf)
    return out


def _nama_daftar(t):
    if '\\c' not in t['instr']:
        return 'Daftar Isi'
    return 'Daftar ' + t['instr'].split('\\c')[1].strip().strip('"').split('"')[0]


def label_halaman(tata):
    """Nomor halaman tercetak di kaki: baris berisi hanya angka arab atau romawi kecil di enam baris terbawah,
    atau angka di ujung kanan baris kaki. None bila halaman tanpa nomor (sampul, pembatas)."""
    baris = [b for b in tata.splitlines() if b.strip()][-6:]
    for b in reversed(baris):
        if re.fullmatch(r'\s*(\d{1,4}|[ivxlcdm]{1,8})\s*', b):
            return b.strip()
    for b in reversed(baris):
        m = re.search(r'\S\s{3,}(\d{1,4}|[ivxlcdm]{1,8})\s*$', b)
        if m:
            return m[1]
    return None


def _cek_halaman_indeks(d, pdf):
    """Nomor halaman tiap entri Daftar Isi/Tabel/Gambar = halaman tempat judulnya tercetak di PDF."""
    label = [label_halaman(h) for h in pdf.tata]
    for i in range(1, len(label)):  # halaman tanpa nomor tercetak (pembatas) melanjutkan nomor arab halaman sebelumnya
        if label[i] is None and label[i - 1] and label[i - 1].isdigit():
            label[i] = str(int(label[i - 1]) + 1)
    # spasi diabaikan di kedua sisi: baris judul yang putus sesudah tanda pisah ("2011–" / "2025", "KAB/" / "KOTA") atau nomor
    # dua angka yang menempel pada judulnya ("11.10Agenda") tetap judul yang sama; yang dicari tetap urutan hurufnya
    tanpa = lambda x: re.sub(r'\s+', '', x)
    hal, teks, out = {}, [tanpa(norm(h).upper()) for h in pdf.hal], []
    for i, lb in enumerate(label):
        if lb:
            hal.setdefault(lb, []).append(i)
    for t in d.toc:
        for e in t['entri']:
            m = re.match(r'^(.*\S)\s+(\d{1,4}|[ivxlcdm]{1,8})$', e)
            if not m:
                continue
            judul, no = norm(m[1]).upper(), m[2]
            cari = tanpa(judul)
            if any(cari in teks[i] for i in hal.get(no, [])):
                continue
            ada = [label[i] or f'PDF {i + 1}' for i, x in enumerate(teks) if cari in x and i not in hal.get(no, [])]
            out.append((pdf.nama, _nama_daftar(t), f'entri "{potong(judul, 40)}" tertulis halaman {no}, tetapi judulnya tidak tercetak '
                        f'di halaman {no}' + (f' (tercetak di: {", ".join(ada[:3])})' if ada else '') + '; perbarui indeks'))
    return out


@gerbang('D-14', 'Label keyakinan di tabel dan kartu')
def d14(ctx):
    butuh(ctx.docx, ctx.pptx)
    out, tema = [], ctx.tema
    dasar = ', '.join(v['label'] for k, v in tema['kosakata']['keyakinan'].items() if not k.startswith('_'))
    syarat = f'pola "Keyakinan: <label>" atau pil/sel berlabel persis ({dasar}; tema.json kosakata.keyakinan)'
    cek = lambda pars: ada_keyakinan(tema, [p['teks'] for p in pars], [r['teks'] for p in pars for r in p['runs']])
    if ctx.docx:
        d = ctx.docx
        obj = objek_bernomor(d)
        for o in obj:
            if o['label'] != 'Tabel' and not o['kartu']:
                continue
            pars = [p for j, x in o['isi'] for p in _pars_blok(j, x)] + ([o['sumber']] if o['sumber'] else [])
            if not cek(pars):
                out.append((d.nama, o['caption']['lok'], f'{o["label"]} {o["nomor"]}{" (kartu)" if o["kartu"] else ""}: tanpa label '
                            f'keyakinan; harus {syarat} di tabel atau baris Sumber'))
        terpasang = {id(x) for o in obj for _, x in o['isi']}
        for i, (j, t) in enumerate(d.blok):
            if j == 'tbl' and t['caption'] in KARTU and id(t) not in terpasang:  # grup kartu angka: label di baris kaki grup
                nxt = next((x for jj, x in d.blok[i + 1:] if jj == 'p' and norm(x['teks'])), None)
                if not cek(_pars_blok('tbl', t) + ([nxt] if nxt else [])):
                    out.append((d.nama, t['lok'], f'{t["caption"]} tanpa label keyakinan; harus {syarat}'))
        out += _pil_docx(d, tema)
    if ctx.pptx:
        for s in ctx.pptx.slide:
            if any(b['jenis'] == 'tbl' for b in s['bentuk']):
                teks = [''.join(r['teks'] for r in p) for b in s['bentuk'] for p in b['par']]
                if not ada_keyakinan(tema, teks):
                    out.append((ctx.pptx.nama, f"slide {s['no']}", f'slide bertabel tanpa label keyakinan; harus {syarat}'))
        out += _pil_pptx(ctx.pptx, tema)
    return out


def _pars_blok(j, x):
    return [p for b in x['baris'] for s in b['sel'] for p in s['pars']] if j == 'tbl' else [x]


def _spek_pil(tema, spek):
    """(isi, garis, teks) hex yang diwajibkan PEDOMAN C6.2 untuk satu label keyakinan."""
    g = lambda k: hex_token(tema, spek[k]) if k in spek else None
    return g('pil_isi'), g('pil_garis'), g('pil_teks')


def _pil_docx(d, tema):
    """Run pil (berisi w:shd atau w:bdr) yang teksnya persis label keyakinan: warna isi, garis, dan teks sesuai C6.2."""
    lab, out, kertas = label_keyakinan(tema), [], hex_token(tema, 'kertas')
    for p in d.par_semua():
        for r in p['runs']:
            t = norm(r['teks'])
            if t not in lab or not (r['shd'] or r['bdr']):
                continue
            isi, garis, teks = _spek_pil(tema, lab[t])
            salah = []
            if isi and r['shd'] != isi:
                salah.append(f'isi #{r["shd"]} (harus #{isi})')
            if garis and (r['bdr'] != garis or (r['shd'] and r['shd'] != kertas)):
                salah.append(f'garis #{r["bdr"]} isi #{r["shd"]} (harus pil garis #{garis} tanpa isi)')
            if teks and r['warna'] and r['warna'] != teks:
                salah.append(f'teks #{r["warna"]} (harus #{teks})')
            if salah:
                out.append((d.nama, p['lok'], f'pil keyakinan "{t}": {", ".join(salah)} (PEDOMAN C6.2, tema.json kosakata.keyakinan)'))
    return out


def _pil_pptx(x, tema):
    """Bentuk pil (berisi warna atau bergaris) yang teksnya persis label keyakinan: warna sesuai C6.2, teks tidak
    menempel tepi (inset kiri >= 2 pt atau rata tengah)."""
    lab, out, kertas = label_keyakinan(tema), [], hex_token(tema, 'kertas')
    for s in x.slide:
        for b in s['bentuk']:
            if b['jenis'] != 'sp':
                continue
            t = norm(' '.join(''.join(r['teks'] for r in p) for p in b['par']))
            if t not in lab or not (b['isi'] or b['garis_warna']):
                continue
            isi, garis, teks = _spek_pil(tema, lab[t])
            wt = {r['warna'] for p in b['par'] for r in p if r['teks'].strip() and r['warna']}
            salah = []
            if isi and b['isi_warna'] != isi:
                salah.append(f'isi #{b["isi_warna"]} (harus #{isi})')
            if garis and (b['garis_warna'] != garis or (b['isi'] and b['isi_warna'] != kertas)):
                salah.append(f'garis #{b["garis_warna"]} isi #{b["isi_warna"]} (harus pil garis #{garis} tanpa isi)')
            if teks and wt - {teks}:
                salah.append(f'teks #{"/#".join(sorted(wt))} (harus #{teks})')
            if b['lIns'] < 2 and 'ctr' not in b['rata']:
                salah.append(f'teks menempel tepi kiri (lIns {b["lIns"]:g} pt, tidak rata tengah)')
            if salah:
                out.append((x.nama, f"slide {s['no']} '{b['nama']}'", f'pil keyakinan "{t}": {", ".join(salah)} (PEDOMAN C6.2)'))
    return out


@gerbang('D-15', 'Atribusi foto')
def d15(ctx):
    butuh(ctx.docx)
    d, out = ctx.docx, []
    lis = ctx.tema['kosakata']['lisensi_foto']
    atrib, dalam = '', False
    for p in d.badan():
        if p['judul'] == 1:
            dalam = 'ATRIBUSI' in norm(p['teks']).upper()
        elif dalam:
            atrib += ' ' + p['teks']
    # hanya baris "Sumber:" tepat di bawah gambar (foto); "Sumber: Wikimedia Commons; tanggal akses ..." di bawah tabel
    # Lampiran Atribusi adalah sumber tabel, bukan atribusi foto
    for i, (j, p) in enumerate(d.blok):
        t = norm(p['teks']) if j == 'p' else ''
        if not (t.startswith('Sumber:') and 'Commons' in t) or i == 0 or d.blok[i - 1][0] != 'p' or not d.blok[i - 1][1]['gambar']:
            continue
        m = re.search(r'Wikimedia Commons,\s*([^;]+),\s*([^,;]+?)\.?\s*(?:;|$)', t)  # pengarang boleh memuat koma ("NASA Earth Observatory, Joshua Stevens"); lisensi = segmen terakhir
        if not m:
            out.append((d.nama, p['lok'], f'atribusi foto harus "Wikimedia Commons, pengarang, lisensi": "{potong(t)}"'))
            continue
        peng, li = m[1].strip(), m[2].strip()
        if not any(li.startswith(x) for x in lis) or re.search(r'\b(NC|ND)\b', li):
            out.append((d.nama, p['lok'], f'lisensi "{li}" tidak sah; hanya {", ".join(lis)} tanpa NC/ND'))
        if peng not in atrib:
            out.append((d.nama, p['lok'], f'pengarang "{peng}" tidak ada di Lampiran Atribusi'))
    return out


RE_D16 = [(re.compile(r'\d,\d{3}\b'), 'pemisah ribuan koma (pakai titik)'),
          (re.compile(r'\d\.\d{1,2}\b'), 'desimal titik (pakai koma)'),
          (re.compile(r'\b\d{4}-\d{2}-\d{2}\b'), 'tanggal ISO'),
          (re.compile(r'\b\d{1,2}:\d{2}\b'), 'jam bertitik dua (pakai titik)')]
# nama yang memuat angka, bukan angka data: versi lisensi foto (B5.15), polutan, nomor standar, nama pengarang foto di
# atribusi "Wikimedia Commons, pengarang, lisensi" (akun "Crisco 1492" tidak boleh diubah), norma Chile NCh433
RE_NAMA = (r'Wikimedia Commons,\s*[^;]+?,\s*(?:CC BY|CC0|PD)[^;]*|\bNCh\s?\d+\b|\bCC0\s+\d\.\d\b|\b(?:CC[ -]?)?BY(?:-?(?:SA|NC|ND))*\s+\d\.\d\b|\bPM ?(?:2[.,]5|10)\b'
           r'|\bCrisco 1492\b|\bNasution007\b'  # nama pengguna Wikimedia (CC BY: nama pencipta ditulis persis); sel PENGARANG lampiran atribusi berdiri tanpa kata Wikimedia
           r'|\b(?:CAP|ISO|SNI|IEC|IEEE)\s?\d+(?:[.:-]\d+)*\b|\bWGS ?84\b|\bEPSG:? ?\d+\b')
# kode resmi bertitik, bukan desimal: aksi Renas PB (2.4.4.a, 1.1.2.a), kegiatan prioritas RPJMN (08.04.02), nama indeks
# (Niño 3.4, HadISST1.1), jam "pukul 15.23", dan bagian dokumen bertanda § (D-16 dan D-22 memakai daftar yang sama)
RE_KODE = (r'\b(?:Renas(?: PB)?|aksi)\s+(?:aksi\s+)?\d+(?:\.\d+)+(?:\.[a-z])?\b(?:;\s*\d+(?:\.\d+)+(?:\.[a-z])?\b)*|\b\d+(?:\.\d+){2,}\.[a-z]\b|\b\d+(?:\.\d+)+\.[a-z]\b|\b\d+(?:\.\d+){2,}\.(?=\s|$)|\b\d{2}\.\d{2}\.\d{2}\b|\b0\d\.\d{2}\b|\bNiño ?3\.4\b|\bHadISST ?\d\.\d\b'
           r'|\bhlm\.\s*\d+(?:[\u2013-]\d+)?(?:,\s*\d+(?:[\u2013-]\d+)?)+|\bTabel [IVX]+\.\d+\b|\bpukul \d{1,2}\.\d{2}\b|§ ?\d+(?:\.\d+)*(?:[\u2013-]\d+(?:\.\d+)*)?')
# rujukan objek: "Tabel 2.5 dan 2.6", "Tabel 2.2, 2.5, dan 2.6", "Subbab 7.1 sampai 7.9", "Program 4.1.1", dan pertimbangan putusan "[3.13.6]"
# adalah nomor bagian, bukan desimal; daftar nomor hanya terbaca rujukan bila diawali kata label
RE_D16_KECUALI = re.compile(RE_NAMA + '|' + RE_KODE + r'|\[\d+(?:\.\d+)+\]'
                            r'|\bnomor\s+\d+(?:\.\d+){2,}\b'
                            r'|\b(?:Tabel|Gambar|Bab|Lampiran|Subbab|Kartu|Kotak|butir|Program)\s+(?:RE|[A-Z]|\d+)(?![A-Za-z])(?:\.\d+)*'
                            r'(?:(?:,\s*(?:dan\s+)?|\s+(?:dan|sampai|atau)\s+)\d+(?:\.\d+)*)*'
                            r'|\b\d{2}\.\d{2} (?:WIB|WITA|WIT)\b|\b[A-C]\.\d+\b')


def _masker(teks, man):
    """Kosongkan angka tampil manifest dari teks. Batasnya angka utuh: tampil "20" tidak memakan "2026" atau "1.204"."""
    for m in sorted(man, key=lambda x: -len(x['tampil'])):
        tp = norm(m['tampil'])
        if not tp or tp not in teks:
            continue
        pl = (r'(?<![\d.,])' if tp[0].isdigit() else '') + re.escape(tp) + (r'(?!\d|[.,]\d)' if tp[-1].isdigit() else '')
        teks = re.sub(pl, lambda x: ' ' * len(x[0]), teks)
    return teks


def _teks_angka(ctx, luas=False):
    """(berkas, lokasi, teks, par|None) isi yang diperiksa format angkanya: DOCX tanpa judul/keterangan/TOC/pustaka,
    PPTX per paragraf. luas=True menambah teks SVG/HTML --lain dan baris PDF (PEDOMAN D, Cakupan berkas)."""
    if ctx.docx:
        d = ctx.docx
        pus = {id(p) for p in bagian_pustaka(d, ctx.tema)}
        for p in d.par_semua():
            if p['part'] == 'word/document.xml' and (p['judul'] or p['caption'] or p['toc'] or id(p) in pus):
                continue
            yield d.nama, p['lok'], norm(p['teks']), p
    if ctx.pptx:
        for s in ctx.pptx.slide:
            for b in s['bentuk']:
                for p in b['par']:
                    yield ctx.pptx.nama, f"slide {s['no']} '{b['nama']}'", norm(''.join(r['teks'] for r in p)), None
    if not luas:
        return
    for f in ctx.lain:
        for lok, t in _teks_lain(f):
            yield f.name, lok, norm(t), None
    for f in (ctx.pdf, ctx.pptx_pdf):
        pustaka, prev = False, ''
        for i, h in enumerate(f.hal if f else [], 1):
            for b in h.splitlines():
                if norm(b).upper() in ('DAFTAR PUSTAKA', 'LAMPIRAN'):  # entri pustaka dikecualikan, seperti di DOCX
                    pustaka = norm(b).upper() == 'DAFTAR PUSTAKA'
                if not pustaka and norm(b):
                    # rujukan terpecah baris ("(Tabel" / "2.4)") dibaca utuh: kata label baris sebelumnya ikut
                    lab = re.search(r'\b(?:Tabel|Gambar|Subbab|Bab|Lampiran|Kartu|Program)$', prev)
                    yield f.nama, f'hlm. {i}', (lab[0] + ' ' if lab else '') + norm(b), None
                prev = norm(b)


def _teks_lain(f):
    """Teks tampil berkas --lain: simpul teks SVG dan HTML (tanpa style, script, komentar, atribut). JSON dan CSS
    dilewati untuk format angka: nilainya data mesin yang diformat saat tampil."""
    if f.suffix not in ('.svg', '.html', '.htm'):
        return
    s = re.sub(r'<style.*?</style>|<script.*?</script>|<!--.*?-->', '', f.read_text(encoding='utf-8'), flags=re.S)
    for i, t in enumerate(re.findall(r'>([^<]+)<', s), 1):
        if t.strip():
            yield f'teks {i}', html.unescape(t)


@gerbang('D-16', 'Format angka id-ID')
def d16(ctx):
    butuh(ctx.docx, ctx.pptx, ctx.lain, ctx.pdf, ctx.pptx_pdf)
    man = [m for v in ctx.man.values() for m in v]
    out = []
    for b, lok, t, _ in _teks_angka(ctx, luas=True):
        t2 = RE_D16_KECUALI.sub(' ', _masker(RE_URL.sub(' ', t), man))
        t2 = re.sub(r'^\d+(\.\d+)+(\s|$|;)', ' ', t2)  # nomor subbab di awal paragraf atau baris PDF
        for pl, apa in RE_D16:
            m = pl.search(t2)
            if m:
                out.append((b, lok, f'{apa}: "{t[max(0, m.start() - 15):m.end() + 15]}"'))
    return out


def _judul_slide(ctx, s):
    jk = ctx.tema['slide']['judul_kotak']
    for b in s['bentuk']:
        if b['jenis'] != 'sp':
            continue
        if b['ph'] in ('title', 'ctrTitle') or (b['x'] is not None and abs(b['x'] - jk['x_pt']) <= 2
                                               and abs(b['y'] - jk['y_pt']) <= 8 and (b['w'] or 0) >= 400):
            yield b


@gerbang('D-17', 'Judul paling banyak 2 baris, tanpa teks terpotong')
def d17(ctx):
    out = []
    for b, lok, t in teks_tampil(ctx):
        # kutipan terpotong resmi dan titik penuntun TOC; judul panjang menyisakan penuntun 3 titik, sah hanya bila ujungnya nomor halaman
        t2 = re.sub(r'\[\u2026\]|\.{4,}|(?:\. ){3,}|\u2026{2,}|\.{3}(?=\s*(?:\d+|[ivxlc]+)\s*(?:\n|$))', ' ', t)
        if '\u2026' in t2 or '...' in t2:
            out.append((b, lok, f'teks terpotong "\u2026" atau "...": "{potong(t)}"'))
    if ctx.pptx:
        maks = ctx.tema['slide']['tipografi']['judul_temuan']['maks_baris']
        for s in ctx.pptx.slide:
            for b in _judul_slide(ctx, s):
                n = 0
                for p in b['par']:
                    runs = [r for r in p if r['teks'].strip()]
                    if not runs:
                        continue
                    pt = max(r['sz'] or 18 for r in runs)
                    n += baris_perkiraan(ctx.fon_untuk(all(r['tebal'] for r in runs)), ''.join(r['teks'] for r in p), pt,
                                         b['w'] - b['ins'])
                if n > maks:
                    out.append((ctx.pptx.nama, f"slide {s['no']} '{b['nama']}'", f'judul {n} baris (perkiraan lebar teks) > {maks}'))
    if ctx.docx:
        to = ctx.tema['objek']
        lebar = ctx.tema['halaman']['lebar_isi_cm'] * CM_PT
        for p in ctx.docx.badan():
            t = p['teks'].strip()
            if not t or not (p['judul'] in (1, 2, 3) or p['caption']):
                continue
            maks = ctx.tema['tipografi_docx']['judul_bab']['maks_baris'] if p['judul'] == 1 else \
                to['keterangan_maks_baris'] if p['caption'] else to['judul_maks_baris']
            runs = [r for r in p['runs'] if r['teks'].strip()]
            pt = max(r['sz'] for r in runs) / 2
            n = baris_perkiraan(ctx.fon_untuk(all(r['tebal'] for r in runs)), t, pt, lebar - p['kiri_pt'])
            if n > maks:
                out.append((ctx.docx.nama, p['lok'], f'{"keterangan" if p["caption"] else "judul"} {n} baris (perkiraan) > {maks}: '
                            f'"{potong(t)}"'))
    return out


def _pustaka_kunci(entri):
    m = re.match(r'^(.+?)\.?\s\((\d{4}[a-z]?|t\.t\.(?:-[a-z])?)\)', entri)
    if not m:
        return None
    a = m[1]
    nama = a.split(',')[0].strip() if re.search(r',\s*[A-Z]\.', a) else a.strip()
    return re.sub(r' dkk$', '', nama), m[2]  # entri "Harnantyari dkk. (2020)" (nama depan penulis tak tercatat) dikutip "Harnantyari dkk., 2020"


@gerbang('D-19', 'Pustaka dikutip dua arah, tanpa path internal')
def d19(ctx):
    out = []
    for b, lok, t in teks_tampil(ctx):
        t2 = RE_URL.sub(' ', re.sub(r'(https?://\S*[/-])\n(?=\S)', r'\1', t))  # URL terpatah di ujung baris PDF ("api/\nupdate.json") tetap satu URL
        m = re.search(r'/Users/|[A-Za-z]:\\|\b(?:data|public|scripts|bangun|src)/[\w.-]+/|\b[\w-]+\.(?:json|csv|py|mjs|geojson)\b', t2)
        if m:
            out.append((b, lok, f'path internal "{m[0]}" dalam "{potong(t)}"'))
    if not ctx.docx:
        return out
    d = ctx.docx
    pus = bagian_pustaka(d, ctx.tema)
    judul_pus = next((p for p in d.badan() if p['judul'] == 1 and norm(p['teks']).upper() == 'DAFTAR PUSTAKA'), None)
    if judul_pus and not pus:
        out.append((d.nama, judul_pus['lok'], f'Daftar Pustaka tanpa entri bergaya {"/".join(ctx.tema["qa"]["gaya_pustaka"])} '
                    '(tema.json qa.gaya_pustaka)'))
    idp = {id(p) for p in pus}
    badan = ' '.join(norm(p['teks']) for p in d.badan() if id(p) not in idp and not p['toc'])
    # pengenalan singkatan pertama "Nama [SINGKATAN]" bisa jatuh di sel tabel; dipakai untuk pemetaan saja, bukan daftar kutipan
    badan_peta = badan + ' ' + ' '.join(norm(x['teks']) for t in d.tabel for b in t['baris'] for c in b['sel'] for x in c['pars'])
    kunci = [(_pustaka_kunci(norm(p['teks'])), p) for p in pus]
    pengarang = sorted({k[0] for k, _ in kunci if k}, key=len, reverse=True)

    def peta(n, s):
        """Singkatan APA -> pengarang pustaka yang menjadi akhiran teks sebelum singkatan (bukan potongan kalimat)."""
        n = n.strip()
        return next((a for a in pengarang if n == a or n.endswith(' ' + a)), None)
    singkat = {}
    for n, s in re.findall(r'([A-Z][^\[\]()]+?) \[([A-Z][\w/.-]*(?: [\w/.-]+)*)\]', badan_peta):  # (Nama Lembaga [SINGKATAN], 2025); singkatan boleh berspasi (Kementerian ESDM)
        singkat.setdefault(s, peta(n, s) or n.strip())
    for n, s in re.findall(r'([A-Z][^\[\]()]+?) \(([A-Z][\w/.-]*(?: [A-Z][\w/.-]*)*), \d{4}', badan_peta):  # Nama Lembaga (SINGKATAN, 2025)
        if s not in singkat and s not in pengarang and peta(n, s):  # tidak menimpa pemetaan [SINGKATAN] atau nama pengarang utuh; hanya bila akhirannya pengarang pustaka
            singkat[s] = peta(n, s)
    th = r'(?:\d{4}[a-z]?|t\.t\.(?:-[a-z])?)'
    kutip = []
    for isi in re.findall(r'\(([^()]*' + th + r'[^()]*)\)', badan):
        for bag in isi.split(';'):
            bag = re.sub(rf',\s*(?:hlm\.|Pasal|ayat|Lampiran|Bab|Tabel)\s.*?(?=,\s*{th}(?![\w.])|$)', '', bag)  # lokasi (hlm. 2, 5, 7) di antara atau sesudah tahun
            m = re.match(rf'\s*(.+?),\s*({th}(?:,\s*{th})*)\s*$', bag)
            if m and not re.match(r'(hlm|Pasal|ayat)\b', m[1]):
                nama = re.sub(r'\s*\[[^\]]+\]$', '', m[1]).strip()
                kutip += [(nama, y.strip()) for y in m[2].split(',')]
    # kutipan naratif "Haque dkk. (2012)", "BNPB (t.t.-a)" hanya menandai entri terkutip (dicari per nama pengarang dan
    # singkatan yang dikenal); pola umum "Nama (2024)" terlalu lebar untuk arah balik
    naratif = [(n, y) for n in pengarang + sorted(singkat) + sorted({a.split(',')[0] for a in pengarang})
               for y in re.findall(re.escape(n) + rf'(?: dkk\.| dan [A-Z][\w-]+| & [A-Z][\w-]+)? \(({th})\)', badan)]
    for k, p in kunci:
        if k is None:
            out.append((d.nama, p['lok'], f'entri pustaka tanpa pola "Penulis (Tahun)": "{potong(p["teks"])}"'))
    kunci = [(k, p) for k, p in kunci if k]

    def sama(nama_kutip, nama_entri):
        # nama lembaga boleh memuat "dan" (Kementerian Energi dan Sumber Daya Mineral); pemisah dua penulis hanya dicoba
        # bila nama utuh tidak cocok. Entri "Yamamoto, S." dikutip "Yamamoto": bandingkan juga nama keluarga saja.
        n = re.sub(r' dkk\.$', '', singkat.get(nama_kutip, nama_kutip))
        calon = {n, n.split(' dan ')[0].split(' & ')[0]}
        return nama_entri in calon or (re.fullmatch(r"[^,]+, [A-Z](?:\. ?[A-Z])*\.?", nama_entri) and nama_entri.split(',')[0] in calon)

    for (nm, th), p in kunci:
        if not any(sama(n, nm) and y == th for n, y in kutip + naratif):
            out.append((d.nama, p['lok'], f'entri pustaka "{nm} ({th})" tidak dikutip di teks'))
    for n, y in kutip:
        if not any(sama(n, nm) and y == th for (nm, th), _ in kunci):
            out.append((d.nama, 'isi', f'kutipan "{n}, {y}" tidak ada di Daftar Pustaka'))
    return out


@gerbang('D-20', 'Standar tabel data')
def d20(ctx):
    butuh(ctx.docx)
    d, out = ctx.docx, []
    navy = hex_token(ctx.tema, 'navy')
    periksa_ = []
    for o in objek_bernomor(d):
        if o['label'] != 'Tabel' or not o['objek'] or o['objek'][0][0] != 'tbl':
            continue
        nm = f'Tabel {o["nomor"]}'
        lamp = bool(re.fullmatch(r'[A-Z]', o['awalan'] or '')) and o['awalan'] != 'RE'
        if o['kartu']:  # kartu majemuk: bingkai kartu bukan tabel data; tabel berbaris kepala di dalamnya diperiksa
            periksa_ += [(t, f'{nm} (kartu)', lamp, False) for j, t in o['objek'] if j == 'tbl' and any(b['kepala'] for b in t['baris'])]
        else:
            periksa_.append((o['objek'][0][1], nm, lamp, True))
    for t, nm, lamp, wajib_kepala in periksa_:
        if t['caption'] == 'garis-waktu':  # komponen diagram B5.12 bertanda sah: aturannya sendiri, bukan pengecualian buta
            out += d20_garis_waktu(ctx, d, t, nm)
            continue
        kep = [b for b in t['baris'] if b['kepala']]
        if wajib_kepala and (not t['baris'] or not t['baris'][0]['kepala']):
            out.append((d.nama, t['lok'], f'{nm}: baris kepala tanpa w:tblHeader (tidak diulang tiap halaman)'))
        for b in kep:
            for s in b['sel']:
                if lamp and s['fill']:
                    out.append((d.nama, t['lok'], f'{nm}: kepala tabel lampiran harus tanpa isi, tertulis #{s["fill"]}'))
                    break
                if not lamp and s['fill'] != navy:
                    out.append((d.nama, t['lok'], f'{nm}: isi kepala #{s["fill"]} != navy #{navy}'))
                    break
        tegak = t['tegak'] + [x for b in t['baris'] for s in b['sel'] for x in s['tegak']]
        if tegak:
            out.append((d.nama, t['lok'], f'{nm}: garis vertikal ({", ".join(sorted(set(tegak)))})'))
        isi = [b for b in t['baris'] if not b['kepala'] and b['sel'] and norm(b['sel'][0]['teks']).lower() not in ('jumlah', 'total')]
        fill = [b['sel'][0]['fill'] for b in isi]
        if len(fill) >= 4 and all(fill[i] != fill[i + 1] for i in range(len(fill) - 1)):
            out.append((d.nama, t['lok'], f'{nm}: pita selang-seling ({", ".join(str(f) for f in fill[:4])})'))
        bebas = kolom_kepala(t, ctx.tema)  # kolom No, peringkat, kode: rata tengah sah (PEDOMAN B5.7)
        # kolom campuran (teks bebas dengan sesekali angka, mis. "ARAH 2030", "PITA") rata kiri; hanya kolom yang mayoritas
        # selnya angka wajib rata kanan
        mayoritas = set()
        for i in range(max((len(b['sel']) for b in isi), default=0)):
            isi_i = [norm(b['sel'][i]['teks']) for b in isi if i < len(b['sel'])]
            isi_i = [x for x in isi_i if x not in ('', '-', '\u2013')]
            if isi_i and sum(angka_id(x) is not None for x in isi_i) * 2 > len(isi_i):
                mayoritas.add(i)
        for b in isi:
            for i, s in enumerate(b['sel']):
                if i not in bebas and i in mayoritas and angka_id(s['teks']) is not None and s['jc'] and s['jc'][0] not in ('right', 'end'):
                    out.append((d.nama, t['lok'], f'{nm}: angka "{s["teks"]}" rata {s["jc"][0] or "kiri"}, harus kanan'))
                    break
            else:
                continue
            break
        for b in t['baris']:
            if not b['kepala'] and b['sel'] and norm(b['sel'][0]['teks']).lower() in ('jumlah', 'total') and not lamp \
                    and b['sel'][0]['fill'] != navy:
                out.append((d.nama, t['lok'], f'{nm}: baris Jumlah harus isi navy, tertulis #{b["sel"][0]["fill"]}'))
    return out


def d20_garis_waktu(ctx, d, t, nm):
    """PEDOMAN B5.12: garis waktu fase (w:tblCaption "garis-waktu") adalah diagram, bukan tabel data. Yang diperiksa: kolom = fase
    kosakata (Prabencana, Tanggap darurat, Pascabencana), baris kepala w:tblHeader bertint tema kotak.garis-waktu.warna_pita,
    garis pemisah antarkolom (insideV) ada. Tabel data yang meminjam penanda ini gagal di jumlah kolom atau kepala."""
    out, fase = [], [v['label'] for k, v in ctx.tema['kosakata']['fase'].items() if not k.startswith('_')]
    pita = hex_token(ctx.tema, ctx.tema['kotak']['garis-waktu']['warna_pita'])
    kep = t['baris'][0] if t['baris'] else None
    if not kep or not kep['kepala']:
        return [(d.nama, t['lok'], f'{nm} (garis waktu): baris kepala fase tanpa w:tblHeader')]
    label = [norm(s['teks']) for s in kep['sel'] if norm(s['teks'])]
    if label != fase:
        out.append((d.nama, t['lok'], f'{nm} (garis waktu): kolom {label} != fase {fase} (penanda garis-waktu hanya untuk diagram B5.12)'))
    salah = [s['fill'] for s in kep['sel'] if s['fill'] != pita]
    if salah:
        out.append((d.nama, t['lok'], f'{nm} (garis waktu): isi kepala #{salah[0]} != tint #{pita} (kotak.garis-waktu.warna_pita)'))
    if 'insideV' not in t['tegak']:
        out.append((d.nama, t['lok'], f'{nm} (garis waktu): tanpa garis pemisah antarkolom (insideV)'))
    return out


@gerbang('D-31', 'Langkah rekomendasi pendek, keterangan bertahun')
def d31(ctx):
    butuh(ctx.docx)
    d, out = ctx.docx, []
    for p in d.badan():
        if p['caption'] and not p['toc'] and not re.search(r'\d{4}', p['teks']):
            out.append((d.nama, p['lok'], f'keterangan tanpa tahun atau periode: "{potong(p["teks"])}"'))
    for t in d.tabel:
        kep = next((b for b in t['baris'] if b['kepala']), None)
        kol = [i for i, s in enumerate(kep['sel']) if norm(s['teks']).upper() == 'LANGKAH'] if kep else []
        for b in t['baris']:
            for i in kol:
                # hanya paragraf berisi pertama sel: judul tindakan; pil status dan jenis aksi di paragraf berikutnya
                par = next((p['teks'] for p in b['sel'][i]['pars'] if norm(p['teks'])), '') if i < len(b['sel']) else ''
                if not b['kepala'] and len(par.split()) > MAKS_KATA_LANGKAH:
                    out.append((d.nama, t['lok'], f'LANGKAH {len(par.split())} kata > {MAKS_KATA_LANGKAH}: "{potong(par)}"'))
    return out


@gerbang('D-32', 'Catatan sesudah Sumber satu baris')
def d32(ctx):
    butuh(ctx.docx)
    d, out = ctx.docx, []
    lebar = ctx.tema['halaman']['lebar_isi_cm'] * CM_PT
    blok = d.blok
    for i, (j, p) in enumerate(blok[1:], 1):
        if j != 'p' or not norm(p['teks']).startswith('Catatan:') or blok[i - 1][0] != 'p' \
                or not norm(blok[i - 1][1]['teks']).startswith('Sumber:'):
            continue
        t, runs = norm(p['teks']), [r for r in p['runs'] if r['teks'].strip()]
        n = baris_perkiraan(ctx.fon_untuk(False), t, max(r['sz'] for r in runs) / 2, lebar - p['kiri_pt'])
        if len(t) > MAKS_HURUF_CATATAN or n > 1:
            out.append((d.nama, p['lok'], f'"Catatan:" {len(t)} huruf, {n} baris (perkiraan) > {MAKS_HURUF_CATATAN} huruf atau 1 baris'))
    return out


RE_D22_KECUALI = re.compile(
    RE_NAMA + '|' + RE_KODE + r'|\b\d{1,2}(?:\u2013\d{1,2})?\s' + BULAN + r'\b'
    r'|\b\d{2}\.\d{2}(?:\u2013\d{2}\.\d{2})? (?:WIB|WITA|WIT)\b'
    r'|\b(?:Tabel|Gambar|Bab|Lampiran|Subbab|Kartu|Kotak|butir|Pasal|ayat|Nomor|No\.|hlm\.|halaman|Perban|Perpres|Perka|Perda|Pergub|'
    r'Inpres|Keppres|Kepres|PP|UU|SE|Permen\w*|Kepmen\w*|Kep|Renas PB|Renstra)\s*\(?(?:RE|[A-Z]|\d+)(?:[./\u2013]\d+)*[a-z]?\)?'
    r'|\b(?:Butuh|Membuka)\s+\d{2}(?:,\s*\d{2})*'  # relasi antar rekomendasi (PEDOMAN B5.13)
    r'|\b0\d\b'  # kode rekomendasi berangka nol di depan ("01", "(02)"); cacah tidak pernah ditulis begitu
    r'|\b\d+/\d{4}\b|\b[A-C]\.\d+\b'
    # label dan nomor rujukan, bukan angka data: hari ke-n peta jalan, kode temuan deck (A1.), kode rekomendasi (R-A21),
    # kode baris paket (C05, P16, B095), daftar halaman (hlm. 70, 133), nomor Kepmen ESDM, tabel bernomor romawi sumber
    r'|\bhari ke-\d+\b|\b[A-E]\d\.(?=\s)|\bR-[A-Z]\d{2}\b|\b[A-Z]{1,2}\d{2,3}\b'
    r'|\b\d+\.K/\S+'
    r'|\bnomor\s+\d+(?:\.\d+){2,}\b')  # nomor pertimbangan putusan MK (3.13.6): label bagian, sama dengan pengecualian D-16
RE_TAHUN = re.compile(r'(?<![\d.,])((?:19|20)\d{2})([a-z]?)((?:[\u2013/](?:19|20)?\d{2,4})?)(?![\d.,]?\d)')


def _buang_tahun(t, tema):
    """Hapus tahun (D-22: "kecuali tahun"): 19xx/20xx, juga rentang atau bersufiks (2015\u20132024, 2020/2021, 2025a).
    Angka empat digit yang diikuti kata cacah (tema.json qa.kata_cacah: "1987 kejadian", "2024 jiwa", "1987 banjir")
    adalah hitungan, bukan tahun, jadi tetap diperiksa."""
    cacah = re.compile(r'\s*(?:' + '|'.join(map(re.escape, tema['qa']['kata_cacah'])) + r')(?!\w)')
    return RE_TAHUN.sub(lambda m: m[0] if cacah.match(t, m.end()) else ' ' * len(m[0]), t)


def _kosakata_angka(tema):
    kos = set()

    def kumpul(x):
        if isinstance(x, dict):
            [kumpul(v) for v in x.values()]
        elif isinstance(x, list):
            [kumpul(v) for v in x]
        elif isinstance(x, str) and re.search(r'\d', x):
            kos.add(x)
    kumpul(tema['kosakata'])  # teks tetap dari tema.json, bukan angka naskah: kosakata, alamat kaki, judul kajian, kolofon
    kumpul(tema['header_footer'])
    kumpul(tema['kajian'])
    kumpul(tema.get('docx', {}))  # kolofon, foto sampul (judul, lisensi, pemotongan)
    return [{'tampil': k} for k in kos]


def _sisa_angka(t, man, tema):
    # gabungan dua topeng atas teks yang sama: angka manifest dan pengecualian label (urutan apa pun memutus pola yang lain:
    # manifest memakan "118" dari "hlm. 118–124", pengecualian "Renstra 6" memakan awal "6,10%")
    t0 = RE_URL.sub(' ', t)
    a, b = _masker(t0, man), RE_D22_KECUALI.sub(lambda m: ' ' * len(m[0]), t0)
    sisa = ''.join(' ' if x == ' ' or y == ' ' else x for x, y in zip(a, b))
    sisa = re.sub(r'^\s*(?:\d+(?:\.\d+)+|\(\d+\))\s', ' ', _buang_tahun(sisa, tema))  # nomor subbab, butir "(1)" di awal
    sisa = re.sub(r'^(\s*[A-Z]\d+\.\s.*\S)\s+\d{1,3}(?:\u2013\d{1,3})?\s*$', r'\1', sisa)  # "A1. Judul 8\u20139": nomor halaman lampiran
    return sisa


def _di_lencana(s, b, kertas):
    """Bentuk b (atau titik tengahnya) berada di bentuk berwarna (bukan putih) setinggi paling banyak 40 pt: bulatan
    peringkat, kotak kelas, pil. Kartu angka berlatar putih tidak termasuk, jadi nilai kartu tetap diperiksa."""
    if b['x'] is None:
        return False
    cx, cy = b['x'] + b['w'] / 2, b['y'] + b['h'] / 2
    return any(q['jenis'] == 'sp' and q['isi_warna'] not in (None, kertas) and q['h'] <= 40 and q['x'] is not None
               and q['x'] <= cx <= q['x'] + q['w'] and q['y'] <= cy <= q['y'] + q['h'] for q in s['bentuk'])


@gerbang('D-22', 'Angka ketikan nol')
def d22(ctx):
    butuh(ctx.docx, ctx.pptx)
    hilang = [nama_manifest(pk.path).name for pk in (ctx.docx, ctx.pptx) if pk and pk.nama not in ctx.man]
    if hilang:
        raise Lewat(f'manifest angka tidak ada ({", ".join(hilang)})')
    kos, out = _kosakata_angka(ctx.tema), []
    if ctx.docx:
        d = ctx.docx
        man2 = ctx.man[d.nama] + kos
        lewati, bebas = set(), set()
        for t in d.tabel:
            kol = kolom_kepala(t, ctx.tema)
            for b in t['baris']:
                jml = b['sel'] and norm(b['sel'][0]['teks']).lower() in ('jumlah', 'total')
                for i, s in enumerate(b['sel']):
                    if b['kepala'] or jml:  # baris kepala dan Jumlah (diperiksa D-6)
                        lewati |= {id(x) for x in s['pars']}
                    elif i in kol:  # kolom No, peringkat, kode (tema.json qa.kolom_tanpa_rata_kanan)
                        bebas |= {id(x) for x in s['pars']}
        for _, lok, t, p in _teks_angka(ctx):
            if p is None or p['part'] != 'word/document.xml' or id(p) in lewati:
                continue
            sisa = _sisa_angka(t, man2, ctx.tema)
            if id(p) in bebas and re.fullmatch(r'\s*\d{1,6}\s*', sisa):
                continue
            m = re.search(r'\d[\d.,]*', sisa)
            if m:
                out.append((d.nama, lok, f'angka "{m[0]}" diketik, tidak ada di manifest injeksi: "{t[max(0, m.start() - 25):m.end() + 25]}"'))
    if ctx.pptx:
        x, man2 = ctx.pptx, ctx.man[ctx.pptx.nama] + kos
        kaki, kertas = ctx.tema['slide']['footer']['y_pt'] - 4, hex_token(ctx.tema, 'kertas')
        for s in x.slide:
            for b in s['bentuk']:
                pars = b['par']
                if b['jenis'] == 'tbl':  # baris kepala dan baris Jumlah dilewati (D-6 memeriksa Jumlah)
                    teks_sel = lambda c: norm(' '.join(''.join(r['teks'] for r in q) for q in c)).lower()
                    pars = [q for row in b['sel'][1:] if not (row and teks_sel(row[0]) in ('jumlah', 'total')) for c in row for q in c]
                for p in pars:
                    t = norm(''.join(r['teks'] for r in p))
                    sisa = _sisa_angka(t, man2, ctx.tema)
                    if re.fullmatch(r'\s*\d{1,2}\s*', sisa) and (
                            (b['y'] is not None and b['y'] >= kaki and t == str(s['no']))  # nomor halaman
                            or _di_lencana(s, b, kertas)):  # nomor peringkat, kelas kemungkinan dalam bulatan atau kotak berwarna
                        continue
                    m = re.search(r'\d[\d.,]*', sisa)
                    if m:
                        out.append((x.nama, f"slide {s['no']} '{b['nama']}'",
                                    f'angka "{m[0]}" diketik, tidak ada di manifest injeksi: "{t[max(0, m.start() - 25):m.end() + 25]}"'))
    return out


@gerbang('D-23', 'Glif di luar Roboto nol')
def d23(ctx):
    cmap = set.intersection(*(set(f.cmap) for f in ctx.fon.values()))
    temu = {}
    for b, lok, t in teks_tampil(ctx, pdf=False):
        for c in {c for c in set(t) if ord(c) not in cmap} - {'\n', '\t', '\r'}:
            temu.setdefault((b, c), [0, lok, t])[0] += t.count(c)
    return [(b, v[1], f'U+{ord(c):04X} "{c}" x{v[0]} tidak ada di cmap Roboto, mis. "{potong(v[2])}"')
            for (b, c), v in sorted(temu.items())]


@gerbang('T-1', 'Sisa sintaks naskah nol (token angka, rujukan, kutipan, catatan kaki)')
def t1(ctx):
    pl = re.compile(r'\{\{|\}\}|\[\^[a-z0-9-]+\]|\[-?@[a-z0-9]|(?<![\w.])@(?:bab|sub|gbr|tbl|lamp|rek):[a-z0-9]|:::')
    return [(b, lok, f'sisa sintaks "{pl.search(t)[0]}" dalam "{potong(t)}"') for b, lok, t in teks_tampil(ctx) if pl.search(t)]


_RENDER = {}


def render_docx(path):
    """Halaman DOCX hasil soffice (cache per isi berkas). Kembalikan (jumlah halaman, path pdf)."""
    kunci = hashlib.sha1(Path(path).read_bytes()).hexdigest()
    if kunci not in _RENDER:
        # profil LibreOffice per proses: proses lain (pembangun, uji paralel) yang memegang profil bersama membuat
        # soffice kedua keluar tanpa PDF
        prof = Path(tempfile.gettempdir()) / f'kajian-qa-lo-profil-{os.getpid()}'
        # salinan profil ekspor pembangun DOCX (kamus dan pola pemenggalan id_ID terpasang di sana, Buku Pegangan L67):
        # tanpa pola itu soffice memenggal lebih sedikit dan jumlah halamannya berbeda dari PDF yang dikirim
        asal = AKAR / 'bangun' / 'docx' / 'keluaran' / '.lo-profil'
        if asal.is_dir() and not prof.exists():
            shutil.copytree(asal, prof, symlinks=True, ignore=shutil.ignore_patterns('.lock', 'lock', '*.lock'))
        out = Path(tempfile.mkdtemp(prefix='qa-render-'))
        pdf = out / (Path(path).stem + '.pdf')
        for _ in range(2):
            r = subprocess.run(['soffice', f'-env:UserInstallation=file://{prof}', '--headless', '--convert-to', 'pdf',
                                '--outdir', str(out), str(path)], capture_output=True, text=True, timeout=600)
            if pdf.exists():
                break
        else:
            raise RuntimeError(f'soffice tidak menghasilkan PDF untuk {path}: {(r.stderr or r.stdout).strip()[-300:]}')
        _RENDER[kunci] = (Pdf(pdf).n, pdf)
    return _RENDER[kunci]


@gerbang('T-2', 'Jumlah halaman PDF = dokumen asal')
def t2(ctx):
    if not ((ctx.docx and ctx.pdf) or (ctx.pptx and ctx.pptx_pdf)):
        raise TakBerlaku('butuh pasangan DOCX+PDF atau PPTX+PDF')
    out = []
    if ctx.pptx and ctx.pptx_pdf:
        n = sum(1 for s in ctx.pptx.slide if not s['sembunyi'])
        if n != ctx.pptx_pdf.n:
            out.append((ctx.pptx_pdf.nama, '-', f'{ctx.pptx_pdf.n} halaman, PPTX {n} slide tampil'))
    if ctx.docx and ctx.pdf:
        if ctx.render:
            n = render_docx(ctx.docx.path)[0]
            asal = 'render soffice DOCX'
        else:
            app = ctx.docx.xml('docProps/app.xml') or ''
            m = re.search(r'<Pages>(\d+)</Pages>', app)
            if not m:
                raise Lewat('--tanpa-render dan docProps/app.xml tanpa <Pages>')
            n, asal = int(m[1]), 'docProps/app.xml'
        if n != ctx.pdf.n:
            out.append((ctx.pdf.nama, '-', f'{ctx.pdf.n} halaman, {asal} {n} halaman; PDF basi atau beda paginasi'))
    return out


@gerbang('T-3', 'Tautan gambar tidak hilang')
def t3(ctx):
    butuh(ctx.docx, ctx.pptx)
    out = []
    for pk in (ctx.docx, ctx.pptx):
        if not pk:
            continue
        for part in sorted(p for p in pk.isi if p.endswith('.xml') and '/_rels/' not in p and not p.startswith('[')):
            s = pk.xml(part)
            ids = set(re.findall(r'\br:(?:embed|link|id)="([^"]+)"', s))
            if not ids:
                continue
            rel = pk.rels(part)
            for i in sorted(ids):
                if i not in rel:
                    out.append((pk.nama, part, f'r:id "{i}" tidak ada di relasi'))
                    continue
                tgt, jenis, mode = rel[i]
                if jenis == 'image' and mode == 'External':
                    out.append((pk.nama, part, f'gambar {i} ditaut ke luar ({tgt}); harus tertanam'))
                elif mode != 'External' and tgt not in pk.isi:
                    out.append((pk.nama, part, f'{jenis} {i} menunjuk {tgt} yang tidak ada di paket'))
    return out


@gerbang('T-4', 'Bebas AI slop (ANTI-SLOP.md, qa/slop.py ambang final)')
def t4(ctx):
    butuh(ctx.docx, ctx.pptx)
    if str(QA) not in sys.path:
        sys.path.insert(0, str(QA))
    import slop  # S-1..S-3 dilewati: D-1..D-3 sudah memeriksanya di DOCX, PDF, dan SVG
    return slop.temuan_gerbang([pk.path for pk in (ctx.docx, ctx.pptx) if pk], final=True,
                               lewati=('S-1', 'S-2', 'S-3'))


def _garis(root, sisi):
    """[(tebal pt, hex)] garis sisi (left/start, bottom, top) di pBdr, tcBorders, dan tblBorders sebuah bagian."""
    out = []
    for wadah in ('pBdr', 'tcBorders', 'tblBorders'):
        for w in root.iter(W + wadah):
            for s in sisi:
                el = w.find(W + s)
                if el is not None and el.get(W + 'val') not in (None, 'nil', 'none'):
                    out.append((int(el.get(W + 'sz', '0')) / 8, (el.get(W + 'color') or '').upper()))
    return out


@gerbang('T-5', 'Kepala dan kaki halaman DOCX (PEDOMAN B4, Buku Pegangan L3-L4)')
def t5(ctx):
    butuh(ctx.docx)
    d, t, out = ctx.docx, ctx.tema, []
    gp, hf, td = t['garis_pt'], t['header_footer'], t['tipografi_docx']
    judul = {t['kajian'][k]['judul_pendek'] for k in kajian_sah(t)}
    baris2 = hf['header']['baris2'].format(terbit=t['kajian']['terbit'])
    logo_mm, tol = t['objek']['logo_header_tinggi_mm'], t['qa']['logo_toleransi_mm']
    sama = lambda daftar, tebal, warna: any(abs(a - tebal) < 0.01 and b == hex_token(t, warna) for a, b in daftar)
    dicek = set()
    for i, s in enumerate(d.info_seksi):
        if s['polos'] or (s['kepala'], s['kaki']) in dicek:
            continue
        dicek.add((s['kepala'], s['kaki']))
        lok = f'seksi {i + 1}'
        kp = d.root(s['kepala']) if s['kepala'] else None
        if kp is None:
            out.append((d.nama, lok, 'tanpa kepala halaman; hanya sampul dan pembatas yang tanpa kepala (B4)'))
        else:
            pars = [p for p in d.par_semua() if p['part'] == s['kepala']]
            teks = [norm(p['teks']) for p in pars]
            nm = f'{lok} {posixpath.basename(s["kepala"])}'
            tinggi = [int(e.get('cy', 0)) / 36000 for e in kp.iter(WP + 'extent')]
            if not any(abs(h - logo_mm) <= tol for h in tinggi):
                out.append((d.nama, nm, f'logo BNPB setinggi {logo_mm:g} mm tidak ada (tinggi gambar: {[round(h, 1) for h in tinggi]} mm)'))
            b1 = next((p for p in pars if norm(p['teks']) in judul), None)
            if b1 is None:
                out.append((d.nama, nm, f'baris 1 judul pendek kajian ({" / ".join(sorted(judul))}) tidak ada; tertulis {teks}'))
            elif not all(r['tebal'] for r in b1['runs'] if r['teks'].strip()):
                out.append((d.nama, nm, f'baris 1 "{norm(b1["teks"])}" harus Bold (B2 Header)'))
            if baris2 not in teks:
                out.append((d.nama, nm, f'baris 2 "{baris2}" tidak ada; tertulis {teks}'))
            ga = gp['aksen_header']
            if not sama(_garis(kp, ('left', 'start')), ga['tebal_pt'], ga['warna']):
                out.append((d.nama, nm, f'garis tegak kiri {ga["warna"]} #{hex_token(t, ga["warna"])} {ga["tebal_pt"]:g} pt tidak ada; '
                            f'tertulis {_garis(kp, ("left", "start"))}'))
            if not sama(_garis(kp, ('bottom',)), gp['header']['tebal_pt'], gp['header']['warna']):
                out.append((d.nama, nm, f'garis bawah kepala {gp["header"]["tebal_pt"]:g} pt #{hex_token(t, gp["header"]["warna"])} tidak ada; '
                            f'tertulis {_garis(kp, ("bottom",))}'))
        kk = d.root(s['kaki']) if s['kaki'] else None
        if kk is None:
            out.append((d.nama, lok, 'tanpa kaki halaman; hanya sampul dan pembatas yang tanpa kaki (B4)'))
            continue
        nm = f'{lok} {posixpath.basename(s["kaki"])}'
        pars = [p for p in d.par_semua() if p['part'] == s['kaki']]
        teks = [norm(p['teks']) for p in pars]
        for b in hf['footer']['baris']:
            if b not in teks:
                out.append((d.nama, nm, f'baris alamat "{potong(b, 50)}" tidak ada (KEPUTUSAN T4)'))
        if not sama(_garis(kk, ('top',)), gp['footer']['tebal_pt'], gp['footer']['warna']):
            out.append((d.nama, nm, f'garis atas kaki {gp["footer"]["tebal_pt"]:g} pt #{hex_token(t, gp["footer"]["warna"])} tidak ada; '
                        f'tertulis {_garis(kk, ("top",))}'))
        pg = [p for p in pars if any(re.match(r'\s*PAGE\b', x.text or '') for x in p['el'].iter(W + 'instrText'))
              or any(re.match(r'\s*PAGE\b', x.get(W + 'instr', '')) for x in p['el'].iter(W + 'fldSimple'))]
        if not pg:
            out.append((d.nama, nm, 'nomor halaman bukan bidang PAGE (B4: dari bidang PAGE Word, bukan teks tempelan)'))
            continue
        nh, p = td['nomor_halaman'], pg[0]
        runs = [r for r in p['runs'] if r['teks'].strip()]
        jc = p['el'].find(f'{W}pPr/{W}jc')
        jc = jc if jc is not None else d.g.cari(p['gaya'], 'ppr', 'jc')
        if not runs or any(r['sz'] != round(nh['ukuran_pt'] * 2) or not r['tebal'] for r in runs):
            out.append((d.nama, nm, f'nomor halaman harus {nh["ukuran_pt"]:g} pt Bold; tertulis '
                        f'{sorted({(r["sz"] / 2, r["tebal"]) for r in runs})} (hasil PAGE tanpa format: taruh format di gaya paragraf)'))
        if jc is None or jc.get(W + 'val') not in ('right', 'end'):
            out.append((d.nama, nm, f'nomor halaman harus rata kanan; tertulis {jc.get(W + "val") if jc is not None else "kiri"}'))
    return out


def _kotak(b):
    return b['x'], b['y'], b['x'] + b['w'], b['y'] + b['h']


def _teks_bentuk(b):
    return norm(' '.join(''.join(r['teks'] for r in p) for p in b['par']))


def _kotak_teks(ctx, b):
    """Kotak teks yang tampak: bentuk berisi warna atau bergaris (pil, chip, tabel) = seluruh bentuk; kotak teks tanpa isi
    = luas teks yang dirender (lebar glif Roboto, rata, jangkar), karena kotak boleh lebih besar dari teksnya."""
    if b['jenis'] != 'sp' or b['isi'] or b['garis_warna']:
        return _kotak(b)
    dalam = max(1.0, b['w'] - b['ins'])
    lebar = max([min(dalam, sum(ctx.fon_untuk(r['tebal']).lebar(r['teks'], r['sz'] or 18) for r in p if r['teks'].strip()))
                 for p in b['par']] or [0.0])
    atas, bawah = _rentang_teks(ctx, b)
    kiri = b['x'] + b['lIns']
    if b['rata'] == {'r'}:
        kiri = b['x'] + b['w'] - (b['ins'] - b['lIns']) - lebar
    elif b['rata'] == {'ctr'}:
        kiri += (dalam - lebar) / 2
    return kiri, atas, kiri + lebar, bawah


@gerbang('T-6', 'Kerangka slide (Buku Pegangan: garis y95 dan y507,6, nomor halaman, pil CUT OFF di slide data)')
def t6(ctx):
    butuh(ctx.pptx)
    x, sl, out = ctx.pptx, ctx.tema['slide'], []
    man = ctx.man.get(x.nama, [])
    csv_tampil = {norm(m['tampil']) for m in man if m['kunci'].startswith('csv:')}
    garis_hex, cut = hex_token(ctx.tema, sl['garis']['warna']), ctx.tema['qa']['cut_off_teks']
    gelap = hex_token(ctx.tema, sl['layout']['gelap'])
    for s in x.slide:
        if s['sembunyi']:
            continue
        lok = f"slide {s['no']}"
        teks = [(b, _teks_bentuk(b)) for b in s['bentuk'] if b['par']]
        if not any(norm(sl['footer']['teks']) in t for _, t in teks):
            continue  # sampul dan penutup: tanpa footer dan tanpa nomor
        no = [b for b, t in teks if t == str(s['no']) and b['y'] is not None and b['y'] >= sl['footer']['y_pt'] - 4]
        if not no:
            out.append((x.nama, lok, f'nomor halaman {s["no"]} tidak ada di pita footer (y >= {sl["footer"]["y_pt"] - 4:g} pt)'))
        elif abs(no[0]['x'] + no[0]['w'] - sl['tepi_kanan_isi_pt']) > 2 or 'r' not in no[0]['rata']:
            out.append((x.nama, lok, f'nomor halaman harus rata kanan berakhir di x{sl["tepi_kanan_isi_pt"]:g}; '
                        f'tertulis x{no[0]["x"] + no[0]["w"]:.1f}, rata {sorted(no[0]["rata"])}'))
        if s['latar'] != gelap:  # pembatas Lampiran dan penutup gelap tanpa garis
            for gy in sl['garis']['y_pt']:
                ada = [b for b in s['bentuk'] if b['jenis'] in ('garis', 'sp') and not b['par'] and b['y'] is not None
                       and abs(b['y'] - gy) <= 1 and (b['h'] or 0) <= 1 and abs(b['x'] - sl['margin_kiri_pt']) <= 2
                       and abs(b['w'] - sl['lebar_isi_pt']) <= 2]
                if not ada:
                    out.append((x.nama, lok, f'garis y{gy:g} selebar {sl["lebar_isi_pt"]:g} pt dari x{sl["margin_kiri_pt"]:g} tidak ada'))
                elif (ada[0].get('warna') or ada[0].get('garis_warna')) not in (None, garis_hex) or abs((ada[0].get('tebal') or sl['garis']['tebal_pt']) - sl['garis']['tebal_pt']) > 0.05:
                    out.append((x.nama, lok, f'garis y{gy:g} harus {sl["garis"]["tebal_pt"]:g} pt #{garis_hex}; tertulis '
                                f'{ada[0].get("tebal")} pt #{ada[0].get("warna") or ada[0].get("garis_warna")}'))
        # nomor halaman di pita footer bukan angka data walau sama dengan nilai CSV (slide 7 pembatas, nilai tabel 7)
        data = any(b['jenis'] == 'tbl' for b in s['bentuk']) or any(t in csv_tampil for b, t in teks if b not in no)
        pil = [b for b, t in teks if t.startswith(cut)]
        if data and not pil:
            out.append((x.nama, lok, f'slide data (tabel atau angka CSV) tanpa pil "{cut}" (Buku Pegangan: dipasang di setiap slide data)'))
        if pil:
            for b in _judul_slide(ctx, s):
                if b['w'] > sl['judul_kotak']['lebar_dengan_pil_pt'] + 1:
                    out.append((x.nama, lok, f'kotak judul selebar {b["w"]:.1f} pt; dengan pil {cut} paling lebar '
                                f'{sl["judul_kotak"]["lebar_dengan_pil_pt"]:g} pt'))
    return out


def _rentang_teks(ctx, b):
    """(atas, bawah) perkiraan teks yang dirender dalam bentuk b: jumlah baris dari lebar glif x 1,2 ukuran huruf,
    diletakkan menurut jangkar (atas, tengah, bawah) dan inset."""
    tinggi = 0.0
    for p in b['par']:
        runs = [r for r in p if r['teks'].strip()]
        if runs:
            pt = max(r['sz'] or 18 for r in runs)
            tinggi += baris_perkiraan(ctx.fon_untuk(all(r['tebal'] for r in runs)), ''.join(r['teks'] for r in p), pt,
                                      max(1, b['w'] - b['ins'])) * pt * 1.2
    if b['jangkar'] == 'b':
        bawah = b['y'] + b['h'] - b['bIns']
    elif b['jangkar'] == 'ctr':
        bawah = b['y'] + b['h'] / 2 + tinggi / 2
    else:
        bawah = b['y'] + b['tIns'] + tinggi
    return bawah - tinggi, bawah


@gerbang('T-7', 'Teks slide tidak beririsan; isi >= 7 pt dari tepi bawah panel (Buku Pegangan Alur kerja 4)')
def t7(ctx):
    butuh(ctx.pptx)
    x, q, out = ctx.pptx, ctx.tema['qa'], []
    tol, jarak = q['irisan_toleransi_pt'], q['jarak_tepi_bawah_panel_pt']
    for s in x.slide:
        teks = [b for b in s['bentuk'] if b['x'] is not None and b['par'] and _teks_bentuk(b)]
        pil = lambda b: b['jenis'] == 'sp' and (b['isi'] or b['garis_warna']) and b['h'] <= 24
        for i, a in enumerate(teks):
            for b in teks[i + 1:]:
                ax0, ay0, ax1, ay1 = _kotak_teks(ctx, a)
                bx0, by0, bx1, by1 = _kotak_teks(ctx, b)
                ox, oy = min(ax1, bx1) - max(ax0, bx0), min(ay1, by1) - max(ay0, by0)
                if ox <= tol or oy <= tol:
                    continue
                dalam = lambda p, c: c['x'] >= p['x'] - tol and c['y'] >= p['y'] - tol and \
                    c['x'] + c['w'] <= p['x'] + p['w'] + tol and c['y'] + c['h'] <= p['y'] + p['h'] + tol
                if (pil(a) and dalam(a, b)) or (pil(b) and dalam(b, a)):
                    continue  # teks di atas pilnya sendiri
                out.append((x.nama, f"slide {s['no']}", f'teks "{potong(_teks_bentuk(a), 30)}" dan "{potong(_teks_bentuk(b), 30)}" '
                            f'beririsan {ox:.1f} x {oy:.1f} pt'))
        panel = [b for b in s['bentuk'] if b['jenis'] == 'sp' and not _teks_bentuk(b) and (b['isi'] or b['garis_warna'])
                 and b['x'] is not None and b['h'] >= q['panel_tinggi_min_pt'] and b['w'] < ctx.tema['slide']['lebar_pt'] * 0.98]
        for b in teks:
            if b['jenis'] != 'sp':
                continue
            wadah = [p for p in panel if p['x'] - 0.5 <= b['x'] and b['x'] + b['w'] <= p['x'] + p['w'] + 0.5
                     and p['y'] - 0.5 <= b['y'] and b['y'] + b['h'] <= p['y'] + p['h'] + 0.5]
            if not wadah:
                continue
            p = min(wadah, key=lambda c: c['w'] * c['h'])
            sisa = p['y'] + p['h'] - _rentang_teks(ctx, b)[1]
            if sisa < jarak - 0.01:
                out.append((x.nama, f"slide {s['no']}", f'teks "{potong(_teks_bentuk(b), 30)}" berjarak {sisa:.1f} pt dari tepi bawah '
                            f'panel (< {jarak:g} pt, tema.json qa.jarak_tepi_bawah_panel_pt)'))
    return out


# ---------------------------------------------------------------- visual (bangun/visual)
# Gambar diperiksa dari SVG + manifest keluaran render.mjs (folder --visual), sesudah uji diri bangun/visual/uji.mjs lolos:
# gerbang yang fixture negatifnya tidak lagi ditolak tidak boleh dipercaya untuk memeriksa gambar sungguhan.

VISUAL = AKAR / 'bangun' / 'visual'
_UJI_VISUAL = []  # hasil uji.mjs sekali per proses


# ---------------------------------------------------------------- naskah per bab: ambang anti-AI, glosarium, ejaan, pustaka

KAMUS_ID = AKAR / 'bangun' / 'kamus' / 'id' / 'id_ID'  # hunspell id_ID dari repositori kamus LibreOffice (folder id)
JUDUL_BUKAN_BAB = re.compile(r'(daftar|kolofon|pustaka|singkatan|atribusi|glosarium|catatan kaki|bagian awal)', re.I)
RE_KATA_EJA = re.compile(r"[^\W\d_]+(?:[-'\u2019][^\W\d_]+)*")
RE_KUTIP_TAHUN = re.compile(r'\([^()]*(?:\b(?:1[89]|20)\d{2}[a-z]?\b|\bt\.t\.(?:-[a-z])?)[^()]*\)|\b[A-Z][\w-]*(?: dkk\.)? \((?:(?:1[89]|20)\d{2}[a-z]?|t\.t\.(?:-[a-z])?)\)')  # tanpa tahun (t.t.) juga kutipan
KLITIK = ('nya', 'lah', 'kah', 'pun')
RE_BUKAN_KATA = re.compile(r'https?://\S+|www\.\S+|\S+@\S+\.\w+|\b(?:[\w-]+/){2,}[\w.-]*|\b[\w/-]+\.(?:json|csv|py|mjs|geojson|md|pdf|png|svg)\b')
BUKAN_BAB_ISI = re.compile(r'(kata pengantar|ringkasan eksekutif|lampiran\b)', re.I)  # partikel dan enklitik yang tidak diurai kamus hunspell id_ID


def glosarium():
    g = AKAR / 'data' / 'glosarium.json'
    if not g.exists():
        raise Lewat('data/glosarium.json belum ada (PEDOMAN B5.18)')
    return json.loads(g.read_text(encoding='utf-8'))


def _slop():
    if str(QA) not in sys.path:
        sys.path.insert(0, str(QA))
    import slop
    return slop


def bab_prosa(path, jenis=('isi', 'butir')):
    """[(judul bab, [(lokasi, teks, jenis)])] dari DOCX: satu unit per Heading 1 (pembaca qa/slop.py), tanpa bagian daftar,
    kolofon, pustaka, singkatan, glosarium, atribusi, dan catatan kaki. Bawaan hanya prosa (isi, butir), bukan tabel data."""
    return [(judul, [(p['lokasi'], p['teks'], p['jenis']) for p in paras if p['jenis'] in jenis])
            for judul, paras in _slop().baca_docx(path) if not JUDUL_BUKAN_BAB.search(judul)]


@gerbang('T-8', 'Ambang anti-AI per bab dan slide: vonis LULUS (Buku Pegangan Angka & copy; qa/slop.py AMBANG_KODE)')
def t8(ctx):
    butuh(ctx.docx, ctx.pptx)
    return _slop().temuan_ambang([pk.path for pk in (ctx.docx, ctx.pptx) if pk], lewati=('S-1',))  # em dash: D-1


@gerbang('T-9', 'Glosarium: singkatan dieja pada kemunculan pertama tiap BAB, varian berkonteks nol (Buku Pegangan L66)')
def t9(ctx):
    butuh(ctx.docx)
    g, d, out = glosarium(), ctx.docx, []
    kj = _kajian(ctx)  # entri berkolom kajian (IPA air lawan rehab) hanya diperiksa di kajian itu
    singk = [x for x in g['singkatan'] if x.get('periksa', True) and (kj is None or kj in x.get('kajian', [kj]))]
    for judul, paras in bab_prosa(d.path):
        if BUKAN_BAB_ISI.match(judul):  # L66 "tiap bab": BAB n; bagian depan dan lampiran tidak diperiksa singkatannya
            continue
        teks, awal = '', []
        for lok, t, _ in paras:
            awal.append((len(teks), lok))
            # kutipan pustaka "(BNPB, 2025a)" memakai singkatan pengarang APA 7 yang dikenalkan sekali per dokumen; bukan pemakaian di prosa
            teks += RE_KUTIP_TAHUN.sub(lambda m: ' ' * len(m[0]), t) + ' '
        rendah = teks.lower()
        lok_di = lambda pos: next(lk for a, lk in reversed(awal) if a <= pos)
        for x in singk:
            m = re.search(r'(?<![\w/])' + re.escape(x['singkatan']) + r'(?![\w/])', teks)
            if not m:
                continue
            panjang = [x['kepanjangan']] + x.get('kepanjangan_lain', [])
            if not any(k.lower() in rendah[:m.end() + len(k) + 4] for k in panjang):
                out.append((d.nama, lok_di(m.start()), f'singkatan "{x["singkatan"]}" pertama di bab "{judul[:40]}" tanpa kepanjangan '
                            f'"{x["kepanjangan"]}" (L66: dieja lengkap pada kemunculan pertama tiap bab)'))
        sl = _slop()
        for lok, t, _ in paras:
            for k in sl.pecah_kalimat(t):
                k = RE_KUTIP_TAHUN.sub(lambda q: ' ' * len(q[0]), k)  # pengarang pustaka di kutipan (nama saat terbit) = rujukan historis
                for v in g.get('varian_konteks', []):
                    m = re.search(v['pola'], k)
                    if m and not (v.get('kecuali') and re.search(v['kecuali'], k, re.I)):
                        out.append((d.nama, lok, f'varian terlarang ({v["nama"]}) "{m[0]}"; ganti {v["ganti"]}: "{potong(k)}"'))
    return out


@functools.lru_cache(maxsize=1)
def _kamus_id():
    try:
        from spylls.hunspell import Dictionary
    except ImportError:
        raise Lewat('spylls belum terpasang di venv: .venv/bin/python -m pip install spylls (Buku Pegangan L67)')
    if not (KAMUS_ID.with_suffix('.dic').exists() and KAMUS_ID.with_suffix('.aff').exists()):
        raise Lewat(f'kamus {KAMUS_ID}.dic/.aff tidak ada (repositori kamus LibreOffice, folder id)')
    return Dictionary.from_files(str(KAMUS_ID))


@gerbang('T-10', 'Ejaan id-ID: kata tak dikenal kamus id_ID (spylls) di luar glosarium dan nama diri nol per bab (Buku Pegangan L67)')
def t10(ctx):
    butuh(ctx.docx)
    g, kamus, d, out = glosarium(), _kamus_id(), ctx.docx, []
    kenal = {w.lower() for w in g.get('kata_tambahan', [])}
    kj = _kajian(ctx)  # tak terdeteksi = entri berkunci kajian tidak dihitung (lebih ketat, bukan lebih longgar)
    sah = lambda x: not x.get('kajian') or kj in x['kajian']
    for x in g['istilah']:
        if sah(x):
            kenal |= {w.lower() for w in RE_KATA_EJA.findall(x['istilah'])}
    singk = {w for x in g['singkatan'] if sah(x) for w in re.split(r'[\s/]+', x['singkatan'])}
    cache = {}

    def dikenal(w):
        if w not in cache:
            cache[w] = kamus.lookup(w) or any(w.endswith(x) and len(w) > len(x) + 2 and (kamus.lookup(w[:-len(x)]) or w[:-len(x)] in kenal)
                                              for x in KLITIK)
        return cache[w]
    for judul, paras in bab_prosa(d.path, ('isi', 'butir', 'judul', 'keterangan')):
        asing = {}
        for lok, t, _ in paras:
            t = RE_BUKAN_KATA.sub(' ', t)  # alamat web, surel, dan jalur berkas bukan kata (jalur ditolak D-19)
            for w in RE_KATA_EJA.findall(t):
                if w.lower() in kenal or w in singk or len(w) == 1:
                    continue
                if w.isupper():  # judul kapital dari kata dikenal, atau singkatan yang wajib terdaftar di glosarium
                    if not dikenal(w.lower()):
                        asing.setdefault(w, f'{lok}, singkatan belum terdaftar di glosarium')
                    continue
                if w[0].isupper():  # nama diri (L67)
                    continue
                if not dikenal(w):
                    asing.setdefault(w, lok)
        if asing:
            daftar = ', '.join(f'"{w}" ({lk})' for w, lk in list(asing.items())[:12])
            out.append((d.nama, f'bab "{judul[:40]}"', f'{len(asing)} kata tak dikenal kamus id_ID dan glosarium: {daftar}'
                        + (f' (dan {len(asing) - 12} lagi)' if len(asing) > 12 else '')
                        + '; betulkan ejaannya, atau tambahkan ke data/glosarium.json kata_tambahan sesudah dicek ke KBBI'))
    return out


@gerbang('T-11', 'Kepadatan pustaka: sumber berbeda per bab dan per kajian, porsi resmi atau primer (Buku Pegangan L65)')
def t11(ctx):
    butuh(ctx.docx)
    d = ctx.docx
    pk = ctx.man_penuh.get(d.nama, {}).get('pustaka')
    if not pk:
        raise Lewat(f'{nama_manifest(d.path).name} tanpa blok "pustaka" (bab -> kunci pustaka.json yang dirujuk; ditulis bangun/docx)')
    pus = {x['id']: x for x in json.loads((AKAR / 'pustaka.json').read_text(encoding='utf-8'))}
    out = []
    semua = {k for ks in pk['bab'].values() for k in ks}
    asing = sorted(semua - set(pus))
    if asing:
        out.append((d.nama, 'manifest pustaka', f'kunci tidak ada di pustaka.json: {", ".join(asing[:8])}'))
    if pk.get('status') != 'final':  # ambang L65 untuk kajian final; draf hanya diperiksa keutuhan kuncinya
        return out
    q = ctx.tema['qa']['pustaka']
    for bab, ks in sorted(pk['bab'].items(), key=lambda x: int(x[0]) if str(x[0]).isdigit() else 0):
        if len(set(ks)) < q['bab_min']:
            out.append((d.nama, f'bab {bab}', f'{len(set(ks))} sumber berbeda dirujuk < {q["bab_min"]} per bab (L65)'))
    kaj = pk.get('kajian') or ctx.kajian
    if kaj not in q['kajian_min']:
        out.append((d.nama, 'manifest pustaka', f'kajian "{kaj}" tidak ada di tema.json qa.pustaka.kajian_min'))
    elif len(semua) < q['kajian_min'][kaj]:
        out.append((d.nama, 'kajian', f'{len(semua)} sumber dirujuk < {q["kajian_min"][kaj]} untuk kajian {kaj} (L65)'))
    resmi = sum(1 for k in semua if pus.get(k, {}).get('verifikasi') in ('primer', 'resmi'))
    if semua and resmi * 100 < q['resmi_primer_min_persen'] * len(semua):
        out.append((d.nama, 'kajian', f'sumber resmi atau primer {resmi} dari {len(semua)} ({resmi * 100 / len(semua):.0f}%) '
                    f'< {q["resmi_primer_min_persen"]}% (L65; pustaka.json verifikasi)'))
    return out


def _visual(ctx):
    d = getattr(ctx, 'visual', None)
    if not d:
        raise TakBerlaku('--visual DIR (keluaran bangun/visual/render.mjs: SVG + manifest) tidak diberikan')
    if getattr(ctx, '_vis', None) is None:
        if not _UJI_VISUAL:
            r = subprocess.run(['node', str(VISUAL / 'uji.mjs'), '--tanpa-png'], capture_output=True, text=True)
            _UJI_VISUAL.append((r.returncode, ((r.stderr or r.stdout).strip().splitlines() or [''])[-1]))
        r = subprocess.run(['node', str(VISUAL / 'render.mjs'), f'--periksa={d}'], capture_output=True, text=True)
        if r.returncode not in (0, 1) or not r.stdout.lstrip().startswith('{'):
            raise RuntimeError(f'bangun/visual/render.mjs --periksa={d} gagal jalan: {r.stderr.strip()[-300:]}')
        ctx._vis = (*_UJI_VISUAL[0], json.loads(r.stdout))
    return ctx._vis


def _gerbang_visual(kode):
    def fn(ctx):
        uji, pesan, hasil = _visual(ctx)
        t = [] if uji == 0 else [('bangun/visual/uji.mjs', 'uji diri', f'gerbang visual rusak: {potong(pesan, 200)}')]
        return t + [(f'{n}.svg', 'gambar', s) for n, ss in hasil.items() for s in ss if s.startswith(kode + ' ')]
    return fn


for _k, _j in (('D-8', 'Peta: irisan label dan teks, unsur peta resmi, inset, skala (SVG + manifest bangun/visual)'),
               ('D-21', 'Legenda grafik = warna yang tergambar (SVG bangun/visual)'),
               ('D-24', 'Satu hex satu arti per gambar (manifest hex bangun/visual)'),
               ('D-28', 'Pilih grafik: pesan G lawan jenis, alasan, besaran peta (manifest bangun/visual)')):
    gerbang(_k, _j)(_gerbang_visual(_k))


def wajib_lolos(**berkas):
    """Untuk pembangun: jalankan semua gerbang dengan --ketat dan hentikan build (SystemExit 1) bila ada yang gagal.
    berkas: docx, pdf, pptx, pptx_pdf, lain, kajian, visual (argumen Ctx). Mengembalikan hasil jalankan() bila lolos."""
    log = []
    hasil = jalankan(Ctx(**berkas), semua=True, ketat=True, tulis=log.append, berkas_saja=True)
    if any(s == 'GAGAL' for _, s, _ in hasil):
        raise SystemExit('Gerbang QA (qa/periksa.py --ketat) gagal:\n' + '\n'.join(log))
    return hasil


# ---------------------------------------------------------------- jalan

def jalankan(ctx, semua=False, ketat=False, tulis=print, maks=20, berkas_saja=False):
    """Kembalikan [(kode, status, temuan)]; status LOLOS, GAGAL, LEWAT, TAK. ketat: LEWAT dihitung GAGAL. berkas_saja:
    gerbang untuk jenis berkas yang tidak diberikan sama sekali berstatus TAK (tidak berlaku), dipakai build satu jenis
    berkas (wajib_lolos); manifest yang hilang tetap GAGAL."""
    hasil, urut = [], sorted(GERBANG, key=lambda g: _urut_kode(g[0]))
    for kode, judul, fn in urut:
        try:
            temuan = fn(ctx)
            status = 'GAGAL' if temuan else 'LOLOS'
            alasan = ''
        except Lewat as e:
            temuan, alasan = [], str(e)
            status = 'TAK' if berkas_saja and isinstance(e, TakBerlaku) else 'GAGAL' if ketat else 'LEWAT'
        hasil.append((kode, status, temuan))
        tulis(f'{status:5} {kode} {judul}' + (f' ({alasan})' if alasan else ''))
        unik = {}
        for t in temuan:
            unik[t] = unik.get(t, 0) + 1
        for (b, lok, pesan), n in list(unik.items())[:maks]:
            tulis(f'      {kode} {b} {lok}: {pesan}' + (f' (x{n})' if n > 1 else ''))
        if len(unik) > maks:
            tulis(f'      ... dan {len(unik) - maks} temuan lain')
        if status == 'GAGAL' and not semua:
            sisa = [k for k, _, _ in urut[len(hasil):]]
            if sisa:
                tulis(f'BERHENTI di temuan pertama; belum dijalankan: {", ".join(sisa)} (pakai --semua)')
            break
    cak = json.loads((QA / 'cakupan.json').read_text(encoding='utf-8'))
    tulis(f'Antre (belum bergerbang, qa/cakupan.json): {", ".join(sorted(cak["antre"], key=_urut_kode))}')
    n = {s: sum(1 for h in hasil if h[1] == s) for s in ('LOLOS', 'GAGAL', 'LEWAT', 'TAK')}
    tulis(f'Ringkasan: {n["LOLOS"]} lolos, {n["GAGAL"]} gagal, {n["LEWAT"]} lewat' + (f', {n["TAK"]} tidak berlaku' if n['TAK'] else ''))
    return hasil


def _urut_kode(k):
    a, _, b = k.partition('-')
    return (a, int(b) if b.isdigit() else 0)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--docx')
    ap.add_argument('--pdf', help='PDF dari DOCX')
    ap.add_argument('--pptx')
    ap.add_argument('--pptx-pdf', help='PDF dari PPTX')
    ap.add_argument('--manifest-docx')
    ap.add_argument('--manifest-pptx')
    ap.add_argument('--kajian', choices=kajian_sah(muat_tema()))
    ap.add_argument('--lain', nargs='*', default=[], help='SVG, HTML, CSS, JSON gaya untuk D-1..D-4, D-9, D-10, D-23; teks SVG/HTML juga D-16')
    ap.add_argument('--semua', action='store_true', help='jalankan semua gerbang walau ada yang gagal')
    ap.add_argument('--ketat', action='store_true', help='LEWAT dihitung gagal (untuk build kirim)')
    ap.add_argument('--tanpa-render', action='store_true', help='T-2 memakai docProps/app.xml, bukan render soffice')
    ap.add_argument('--berkas-saja', action='store_true', help='gerbang untuk jenis berkas yang tidak diberikan: tidak berlaku')
    ap.add_argument('--visual', help='folder keluaran bangun/visual/render.mjs (SVG + manifest) untuk D-8, D-21, D-24, D-28')
    a = ap.parse_args(argv)
    if not any([a.docx, a.pdf, a.pptx, a.pptx_pdf, a.lain, a.visual]):
        ap.error('beri paling sedikit satu berkas')
    ctx = Ctx(a.docx, a.pdf, a.pptx, a.pptx_pdf, a.manifest_docx, a.manifest_pptx, a.kajian, a.lain, render=not a.tanpa_render)
    ctx.visual = a.visual
    print('Gerbang QA kajian BNPB: ' + ', '.join(str(x) for x in [a.docx, a.pdf, a.pptx, a.pptx_pdf, *a.lain, a.visual] if x))
    hasil = jalankan(ctx, a.semua, a.ketat, berkas_saja=a.berkas_saja)
    return 1 if any(s == 'GAGAL' for _, s, _ in hasil) else 0


if __name__ == '__main__':
    sys.exit(main())
