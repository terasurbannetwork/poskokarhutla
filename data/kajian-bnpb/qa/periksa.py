#!/usr/bin/env python3
"""Gerbang QA mekanis dua kajian BNPB (PEDOMAN-DESAIN.md bagian D). Stdlib + poppler CLI
(pdftotext, pdffonts, pdfinfo) + soffice untuk render ulang DOCX (T-2).

    python3 qa/periksa.py --docx K.docx --pdf K.pdf --pptx D.pptx --pptx-pdf D.pdf
                          [--manifest-docx M.json] [--manifest-pptx M.json] [--kajian air]
                          [--lain peta.svg ...] [--semua] [--ketat] [--tanpa-render]

Manifest angka bawaan: <berkas>.manifest.json di samping berkasnya (mis. K.docx.manifest.json),
isinya {"angka": Konteks.manifest} dari bangun/kontrak/naskah.py.
Keluar 0 bila semua gerbang yang jalan lolos; 1 bila ada yang gagal (atau LEWAT dengan --ketat).
Bawaan berhenti di gerbang gagal pertama (PEDOMAN D); --semua menjalankan semuanya.
Ambang (huruf terkecil, baris judul, lebar isi, batas halaman, hex sah) dibaca dari tema.json.
Uji diri dan fixture: python3 qa/uji.py
"""
import argparse
import csv
import hashlib
import json
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

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
P = '{http://schemas.openxmlformats.org/presentationml/2006/main}'
R = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'
WP = '{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}'
PR = '{http://schemas.openxmlformats.org/package/2006/relationships}'
EMU_PT = 12700
CM_PT = 72 / 2.54
LABEL_KEYAKINAN = ('resmi', 'terverifikasi', 'estimasi model', 'asumsi kebijakan')
RE_EMOJI = re.compile('[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F\u200D]')
RE_URL = re.compile(r'https?://\S+|www\.\S+')
RE_ANGKA_ID = re.compile(r'^[+-]?\d{1,3}(?:\.\d{3})*(?:,\d+)?$')
BULAN = r'(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember|Jan|Feb|Mar|Apr|Jun|Jul|Agu|Agt|Sep|Okt|Nov|Des)'
# D-10 bawaan dari PEDOMAN D-10; glosarium.json {"terlarang": [...]} menggantikannya bila ada
TERLARANG = ['titik api', 'perkiraan satelit', 'provinsi prioritas', 'hujan pertama', 'kamu', 'Anda',
             'pra bencana', 'pra-bencana', 'subsiden', 'amblesan', 'Bali\u2013Nusa Tenggara', '[SEKUNDER]',
             'TIDAK DITEMUKAN']
SINGKATAN = set('BNPB BPBD BMKG PVMBG BPS BIG PU PUPR KLHK BRIN TNI POLRI IRBI DIBI KRB SPI RPJMN RPJPN RENAS RENSTRA '
                'PB PRB DAS WS SDA PSDA PDAM SPAM PDNA BUMN BUMD UU PP KK UPT OPD APBN APBD DSP NTB NTT DKI DIY RI SDG '
                'ENSO IOD ONI NOAA CPC FIRMS VIIRS MODIS MMI GNSS TPA ISPA DALY VSL GIS CC BY SA ND NC PD WIB WITA WIT '
                'K/L KAB/KOTA'.split())


class Lewat(Exception):
    """Gerbang tidak bisa jalan karena masukannya tidak ada (bukan lolos)."""


def norm(s):
    return re.sub(r'[ \t\u00a0\u202f]+', ' ', s or '').strip()


def angka_id(s):
    s = norm(s).replace('\u2212', '-')
    if not RE_ANGKA_ID.match(s):
        return None
    return float(s.replace('.', '').replace(',', '.'))


def onoff(el):
    return el is not None and el.get(W + 'val', 'true') not in ('0', 'false', 'off')


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
                self.tabel.append(t)
                self.blok.append(('tbl', t))
        if body.find(W + 'sectPr') is not None:
            self.seksi.append(body.find(W + 'sectPr'))
        st = self.root('word/settings.xml')
        self.update_fields = st is not None and onoff(st.find(W + 'updateFields'))

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
            runs.append({'teks': teks, 'sz': int(sz.get(W + 'val')) if sz is not None else 20,
                         'tebal': onoff(self._rpr(rpr, rsid, sid, 'b'))})
        ind = ppr.find(W + 'ind') if ppr is not None else None
        ind = ind if ind is not None else self.g.cari(sid, 'ppr', 'ind')
        kiri = int(ind.get(W + 'left', ind.get(W + 'start', '0')) or 0) / 20 if ind is not None else 0.0
        teks = ''.join(r['teks'] for r in runs)
        return {'part': part, 'jenis': jenis, 'i': i, 'gaya': sid, 'nama_gaya': self.g.nama(sid), 'teks': teks,
                'runs': runs, 'tabel': dalam_tabel, 'el': p, 'kiri_pt': kiri,
                'judul': self.g.tingkat_judul(sid), 'caption': self.g.cocok(sid, 'caption') or self._seq(p),
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
            baris.append({'kepala': onoff(tr.find(f'{W}trPr/{W}tblHeader')), 'sel': sel})
        tegak = [x.tag[len(W):] for x in (tb if tb is not None else [])
                 if x.tag[len(W):] in ('left', 'right', 'start', 'end', 'insideV') and x.get(W + 'val') not in ('nil', 'none')]
        par0 = next((s['pars'][0] for b in baris for s in b['sel'] if s['pars']), None)
        return {'baris': baris, 'caption': cap.get(W + 'val') if cap is not None else None, 'tegak': tegak,
                'teks': norm(' '.join(s['teks'] for b in baris for s in b['sel'])),
                'lok': par0['lok'] if par0 else '?'}

    def badan(self):
        return [p for p in self.par_semua() if p['part'] == 'word/document.xml']

    def par_semua(self):
        return sorted(self._idx.values(), key=lambda p: (p['part'] != 'word/document.xml', p['part'], p['i']))


class Pptx(Paket):
    def __init__(self, path):
        super().__init__(path)
        pres = self.root('ppt/presentation.xml')
        rel = self.rels('ppt/presentation.xml')
        self.slide = []
        for n, s in enumerate(pres.iterfind(f'{P}sldIdLst/{P}sldId'), 1):
            part = rel[s.get(R + 'id')][0]
            r = self.root(part)
            self.slide.append({'no': n, 'part': part, 'sembunyi': r.get('show') == '0', 'bentuk': list(self._bentuk(r))})

    @staticmethod
    def _runs(txbody, skala=1.0):
        pars = []
        for ap in txbody.iter(A + 'p'):
            runs = []
            for x in ap:
                if x.tag in (A + 'r', A + 'fld'):
                    rp = x.find(A + 'rPr')
                    sz = rp.get('sz') if rp is not None else None
                    runs.append({'teks': ''.join(t.text or '' for t in x.iter(A + 't')),
                                 'sz': int(sz) / 100 * skala if sz else None,
                                 'tebal': rp is not None and rp.get('b') in ('1', 'true')})
                elif x.tag == A + 'br':
                    runs.append({'teks': '\n', 'sz': None, 'tebal': False})
            pars.append(runs)
        return pars

    def _bentuk(self, root):
        for el in root.find(f'{P}cSld/{P}spTree').iter():
            if el.tag == P + 'sp':
                tx, nv = el.find(P + 'txBody'), el.find(f'{P}nvSpPr')
                ph = nv.find(f'{P}nvPr/{P}ph') if nv is not None else None
                off, ext = el.find(f'{P}spPr/{A}xfrm/{A}off'), el.find(f'{P}spPr/{A}xfrm/{A}ext')
                bp = tx.find(A + 'bodyPr') if tx is not None else None
                fit = bp.find(A + 'normAutofit') if bp is not None else None
                skala = int(fit.get('fontScale', 100000)) / 100000 if fit is not None else 1.0
                ins = {k: int(bp.get(k, 91440)) / EMU_PT if bp is not None else 7.2 for k in ('lIns', 'rIns')}
                yield {'jenis': 'sp', 'nama': nv.find(P + 'cNvPr').get('name', '') if nv is not None else '',
                       'ph': ph.get('type', 'body') if ph is not None else None,
                       'x': int(off.get('x')) / EMU_PT if off is not None else None,
                       'y': int(off.get('y')) / EMU_PT if off is not None else None,
                       'w': int(ext.get('cx')) / EMU_PT if ext is not None else None,
                       'ins': ins['lIns'] + ins['rIns'],
                       'isi': el.find(f'{P}spPr/{A}solidFill') is not None,
                       'par': self._runs(tx, skala) if tx is not None else []}
            elif el.tag == P + 'graphicFrame' and el.find(f'.//{A}tbl') is not None:
                nm = el.find(f'{P}nvGraphicFramePr/{P}cNvPr')
                sel = [[self._runs(tc.find(A + 'txBody')) if tc.find(A + 'txBody') is not None else []
                        for tc in tr.findall(A + 'tc')] for tr in el.find(f'.//{A}tbl').findall(A + 'tr')]
                yield {'jenis': 'tbl', 'nama': nm.get('name', '') if nm is not None else '', 'sel': sel,
                       'par': [p for row in sel for c in row for p in c]}

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


class Ctx:
    def __init__(self, docx=None, pdf=None, pptx=None, pptx_pdf=None, manifest_docx=None, manifest_pptx=None,
                 kajian=None, lain=(), tema=None, render=True):
        self.tema = tema or muat_tema()
        self.docx = Docx(docx) if docx else None
        self.pptx = Pptx(pptx) if pptx else None
        self.pdf = Pdf(pdf) if pdf else None
        self.pptx_pdf = Pdf(pptx_pdf) if pptx_pdf else None
        self.man = {}
        for berkas, m in ((docx, manifest_docx), (pptx, manifest_pptx)):
            if berkas:
                m = Path(m) if m else Path(str(berkas) + '.manifest.json')
                if m.exists():
                    d = json.loads(m.read_text(encoding='utf-8'))
                    self.man[Path(berkas).name] = d['angka'] if isinstance(d, dict) else d
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


def objek_bernomor(d):
    """[{label, nomor, awalan, urut, caption, objek: [blok], sumber: par|None}] dari urutan blok tubuh."""
    blok = [b for b in d.blok if not (b[0] == 'p' and not norm(b[1]['teks']) and not b[1]['gambar'])]
    out = []
    for i, (jenis, x) in enumerate(blok):
        if jenis != 'p' or not x['caption'] or x['toc']:
            continue
        m = RE_KET.match(norm(x['teks']))
        o = {'caption': x, 'label': m[1] if m else None, 'nomor': m[2] if m else None, 'awalan': m[3] if m else None,
             'urut': int(m[4]) if m else None, 'objek': [], 'sumber': None}
        j = i + 1
        while j < len(blok) and (blok[j][0] == 'tbl' or blok[j][1]['gambar']):
            o['objek'].append(blok[j])
            j += 1
        if j < len(blok) and blok[j][0] == 'p' and norm(blok[j][1]['teks']).startswith('Sumber:'):
            o['sumber'] = blok[j][1]
        out.append(o)
    return out


def ambang_gambar(tema):
    return tema['objek']['lebar_cm']['tiga-kolom'] * CM_PT * 0.9


def bagian_pustaka(d):
    """Paragraf isi sesudah judul DAFTAR PUSTAKA sampai judul tingkat 1 berikutnya."""
    out, dalam = [], False
    for p in d.badan():
        if p['judul'] == 1:
            dalam = norm(p['teks']).upper() == 'DAFTAR PUSTAKA'
            continue
        if dalam and norm(p['teks']) and not p['tabel']:
            out.append(p)
    return out


# ---------------------------------------------------------------- gerbang

GERBANG = []


def gerbang(kode, judul):
    def deko(fn):
        GERBANG.append((kode, judul, fn))
        return fn
    return deko


def butuh(*x):
    if not any(x):
        raise Lewat('berkas masukan tidak diberikan')


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
        raise Lewat('berkas masukan tidak diberikan')
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
            for b in s['bentuk']:
                for p in b['par']:
                    for r in p:
                        if not r['teks'].strip() or r['sz'] is None or r['sz'] >= bb:
                            continue
                        persen = re.fullmatch(r'[+-]?[\d.,]+\s?%', r['teks'].strip())
                        chip = b['jenis'] == 'sp' and b['isi'] and len(''.join(x['teks'] for x in p)) <= 30
                        if lo <= r['sz'] + 1e-6 and ((b['jenis'] == 'tbl' and persen) or chip):
                            continue
                        out.append((ctx.pptx.nama, f"slide {s['no']} '{b['nama']}'",
                                    f'{r["sz"]:.2f} pt < {bb:g} pt (pengecualian {lo:g}-{hi:g} pt hanya persen tabel dan chip), '
                                    f'teks "{potong(r["teks"], 40)}"'))
    return out


@gerbang('D-6', 'Angka silang')
def d6(ctx):
    butuh(ctx.docx, ctx.pptx)
    out = []
    # (a) baris Jumlah = jumlah baris tampil
    for nama, tabel in _semua_tabel(ctx):
        for t_lok, rows in tabel:
            out += [(nama, t_lok, x) for x in _cek_jumlah(rows)]
    # (b) manifest: angka segar terhadap registri, tampil di dokumen, sama lintas berkas
    if not ctx.man:
        if out:
            return out
        raise Lewat('manifest angka tidak ada (<berkas>.manifest.json); baris Jumlah sudah diperiksa')
    teks = {}
    if ctx.docx:
        teks[ctx.docx.nama] = norm('\n'.join(p['teks'] for p in ctx.docx.par_semua()))
    if ctx.pptx:
        teks[ctx.pptx.nama] = norm('\n'.join(ctx.pptx.teks_slide(s) for s in ctx.pptx.slide))
    k = naskah.Konteks()
    pakai = {}
    for nama, man in ctx.man.items():
        for m in man:
            kunci, tampil = m['kunci'], norm(m['tampil'])
            if nama in teks and tampil not in teks[nama]:
                out.append((nama, m.get('naskah', kunci), f'angka "{tampil}" ({kunci}) ada di manifest tetapi tidak tampil di berkas'))
            if kunci.startswith('csv:'):
                rel, _, kol = kunci[4:].partition('#')
                p = AKAR / rel
                if not p.exists():
                    out.append((nama, kunci, f'CSV {rel} tidak ada'))
                    continue
                with p.open(encoding='utf-8') as f:
                    nilai = {round(float(r[kol]), 9) for r in csv.DictReader(f) if r.get(kol) not in (None, '')}
                if round(float(m['nilai']), 9) not in nilai:
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


def _semua_tabel(ctx):
    if ctx.docx:
        yield ctx.docx.nama, [(t['lok'], [[s['teks'] for s in b['sel']] for b in t['baris'] if not b['kepala']])
                              for t in ctx.docx.tabel]
    if ctx.pptx:
        yield ctx.pptx.nama, [(f"slide {s['no']} '{b['nama']}'",
                               [[norm(' '.join(''.join(r['teks'] for r in p) for p in c)) for c in row] for row in b['sel'][1:]])
                              for s in ctx.pptx.slide for b in s['bentuk'] if b['jenis'] == 'tbl']


def _cek_jumlah(rows):
    out = []
    sel = lambda r, c: norm(r[c]) if c < len(r) else ''
    tot = [i for i, r in enumerate(rows) if r and norm(r[0]).lower() in ('jumlah', 'total')]
    for ti in tot:
        isi = [r for r in rows[:ti] if r and not re.match(r'(?i)(sub)?total|jumlah', norm(r[0]))]
        for c in range(1, len(rows[ti])):
            t = angka_id(rows[ti][c])
            vals = [angka_id(sel(r, c)) for r in isi]
            if t is None or not vals or any(v is None and sel(r, c) not in ('\u2013', '') for v, r in zip(vals, isi)):
                continue
            dec = max(len(x.split(',')[1]) if ',' in x else 0 for x in [sel(rows[ti], c)] + [sel(r, c) for r in isi])
            s = sum(v for v in vals if v is not None)
            if abs(s - t) > 0.5 * 10 ** -dec * max(1, len(vals)) + 1e-9:
                out.append(f'baris Jumlah kolom {c + 1} = {rows[ti][c]} tetapi jumlah {len(vals)} baris tampil = '
                           f'{naskah.fmt_id(s, dec)}')
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
        if id(x) in terpasang:
            continue
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
        sumber += [(d.nama, p, d.xml(p)) for p in [x for x, _ in d.bagian] + ['word/styles.xml', 'word/numbering.xml'] if p in d.isi]
    if ctx.pptx:
        sumber += [(ctx.pptx.nama, p, ctx.pptx.xml(p)) for p in sorted(ctx.pptx.isi)
                   if re.fullmatch(r'ppt/(slides/slide|slideLayouts/slideLayout|slideMasters/slideMaster)\d+\.xml', p)]
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


def daftar_terlarang():
    g = AKAR / 'glosarium.json'
    if g.exists():
        d = json.loads(g.read_text(encoding='utf-8'))
        return [x if isinstance(x, str) else x['istilah'] for x in d.get('terlarang', [])]
    return TERLARANG


@gerbang('D-10', 'Istilah terlarang nol')
def d10(ctx):
    pola = [(t, re.compile(r'(?<!\w)' + re.escape(t) + r'(?!\w)', re.I)) for t in daftar_terlarang()]
    pola.append(('"100%" pada peluang', re.compile(r'(?i)(peluang|kemungkinan|probabilitas)[^.]{0,60}?\b100\s?%')))
    out = []
    for b, lok, t in teks_tampil(ctx):
        for nama, pl in pola:
            if pl.search(t):
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
        for p in d.badan():
            t = norm(p['teks'])
            huruf = re.sub(r'[^A-Za-z]', '', t)
            if not huruf or p['tabel'] or p['toc'] or p['caption']:
                continue
            if p['judul'] == 1 and huruf != huruf.upper():
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
    for k in ('air', 'mitigasi'):
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
        raise Lewat('kajian (air/mitigasi) tidak terdeteksi; pakai --kajian')
    batas = ctx.tema['kajian'][kj]['batas_halaman_isi']
    mulai = _hal_bab1(ctx.pdf)
    if mulai is None:
        return [(ctx.pdf.nama, '-', 'halaman "BAB 1" tidak ditemukan di PDF')]
    akhir = next((i for i, h in enumerate(ctx.pdf.tata) if i > mulai and any(
        b.strip().upper() in ('DAFTAR PUSTAKA', 'LAMPIRAN') for b in h.splitlines())), ctx.pdf.n)
    isi = akhir - mulai
    if isi > batas:
        return [(ctx.pdf.nama, f'hlm. {mulai + 1}-{akhir}', f'{isi} halaman isi > batas {batas} (tema.json kajian.{kj}.batas_halaman_isi)')]
    return []


@gerbang('D-13', 'Penomoran dan indeks terisi')
def d13(ctx):
    butuh(ctx.docx)
    d, out = ctx.docx, []
    if not d.update_fields:
        out.append((d.nama, 'word/settings.xml', 'w:updateFields tidak aktif'))
    isi = [t for t in d.toc if '\\o' in t['instr']] or [t for t in d.toc if '\\c' not in t['instr']]
    h1 =[norm(p['teks']) for p in d.badan() if p['judul'] == 1 and norm(p['teks'])]
    if not isi:
        out.append((d.nama, 'Daftar Isi', 'bidang TOC daftar isi tidak ada'))
    elif not isi[0]['entri']:
        out.append((d.nama, 'Daftar Isi', 'hasil bidang TOC kosong; perbarui indeks lewat UNO sebelum simpan'))
    else:
        gabung = ' '.join(isi[0]['entri']).upper()
        out += [(d.nama, 'Daftar Isi', f'judul "{h}" tidak ada di Daftar Isi') for h in h1 if h.upper() not in gabung]
    for t in d.toc:
        if '\\c' in t['instr'] and not t['entri']:
            out.append((d.nama, 'Daftar ' + t['instr'].split('\\c')[1].strip().strip('"').split('"')[0], 'hasil bidang kosong'))
    # penomoran: seksi sebelum BAB 1 romawi kecil (atau sampul tanpa kaki), seksi BAB 1 mulai 1 arab
    bab1 = next((p for p in d.badan() if p['judul'] == 1 and norm(p['teks']).upper().startswith('BAB 1')), None)
    if bab1 is None:
        out.append((d.nama, '-', 'judul "BAB 1" tidak ditemukan'))
    elif d.seksi:
        for i, sp in enumerate(d.seksi[:bab1.get('seksi', 0) + 1]):
            pg = sp.find(W + 'pgNumType')
            fmt = pg.get(W + 'fmt') if pg is not None else None
            if i == bab1['seksi']:
                if (pg is None or pg.get(W + 'start') != '1') or fmt not in (None, 'decimal'):
                    out.append((d.nama, f'seksi {i + 1}', f'seksi BAB 1 harus mulai 1 arab (w:pgNumType start="1"), tertulis fmt={fmt} '
                                f'start={pg.get(W + "start") if pg is not None else None}'))
            elif fmt != 'lowerRoman' and sp.find(W + 'footerReference') is not None:
                out.append((d.nama, f'seksi {i + 1}', f'bagian depan harus romawi kecil, tertulis fmt={fmt}'))
    if ctx.pdf and h1:
        mulai = _hal_bab1(ctx.pdf)
        depan = '\n'.join(ctx.pdf.tata[:mulai] if mulai else []).upper()
        out += [(ctx.pdf.nama, 'Daftar Isi', f'judul "{h}" tidak tercetak di Daftar Isi PDF') for h in h1
                if not h.upper().startswith(('DAFTAR ISI', 'DAFTAR TABEL', 'DAFTAR GAMBAR')) and norm(h).upper() not in norm(depan)]
        if mulai is not None and not re.search(r'(^|\s)1\s*$', ctx.pdf.tata[mulai], re.M):
            out.append((ctx.pdf.nama, f'hlm. {mulai + 1}', 'halaman BAB 1 tidak bernomor 1'))
    return out


@gerbang('D-14', 'Label keyakinan di tabel dan kartu')
def d14(ctx):
    butuh(ctx.docx, ctx.pptx)
    out = []
    if ctx.docx:
        d = ctx.docx
        for o in objek_bernomor(d):
            if o['label'] != 'Tabel':
                continue
            teks = ' '.join([x['teks'] for j, x in o['objek'] if j == 'tbl'] + [o['sumber']['teks'] if o['sumber'] else '']).lower()
            if not any(k in teks for k in LABEL_KEYAKINAN):
                out.append((d.nama, o['caption']['lok'], f'Tabel {o["nomor"]}: tanpa label keyakinan (Resmi, Terverifikasi, '
                            'Estimasi model, Asumsi kebijakan) di tabel atau baris Sumber'))
        blok = d.blok
        for i, (j, t) in enumerate(blok):
            if j == 'tbl' and t['caption'] in ('kartu-angka', 'skenario'):
                nxt = next((x['teks'] for jj, x in blok[i + 1:] if jj == 'p' and norm(x['teks'])), '')
                if not any(k in (t['teks'] + ' ' + nxt).lower() for k in LABEL_KEYAKINAN):
                    out.append((d.nama, t['lok'], f'{t["caption"]} tanpa label keyakinan'))
    if ctx.pptx:
        for s in ctx.pptx.slide:
            if any(b['jenis'] == 'tbl' for b in s['bentuk']) and not any(k in ctx.pptx.teks_slide(s).lower() for k in LABEL_KEYAKINAN):
                out.append((ctx.pptx.nama, f"slide {s['no']}", 'slide bertabel tanpa label keyakinan'))
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
    for p in d.badan():
        t = norm(p['teks'])
        if not (t.startswith('Sumber:') and 'Commons' in t):
            continue
        m = re.search(r'Wikimedia Commons,\s*([^,;]+),\s*([^;.]+)', t)
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
RE_D16_KECUALI = re.compile(r'\b(?:Tabel|Gambar|Bab|Lampiran|Subbab)\s+(?:RE|[A-Z]|\d+)(?:\.\d+)*'
                            r'|\b\d{2}\.\d{2} (?:WIB|WITA|WIT)\b|\b[A-C]\.\d+\b')


def _masker(teks, man):
    for m in sorted(man, key=lambda x: -len(x['tampil'])):
        tp = norm(m['tampil'])
        if tp and tp in teks:
            teks = teks.replace(tp, ' ' * len(tp))
    return teks


def _teks_angka(ctx):
    """(berkas, lokasi, teks) isi yang diperiksa format angkanya: DOCX tanpa judul/keterangan/TOC/pustaka, PPTX."""
    if ctx.docx:
        d = ctx.docx
        pus = {id(p) for p in bagian_pustaka(d)}
        for p in d.par_semua():
            if p['part'] == 'word/document.xml' and (p['judul'] or p['caption'] or p['toc'] or id(p) in pus):
                continue
            yield d.nama, p['lok'], norm(p['teks']), p
    if ctx.pptx:
        for s in ctx.pptx.slide:
            for b in s['bentuk']:
                for p in b['par']:
                    yield ctx.pptx.nama, f"slide {s['no']} '{b['nama']}'", norm(''.join(r['teks'] for r in p)), None


@gerbang('D-16', 'Format angka id-ID')
def d16(ctx):
    butuh(ctx.docx, ctx.pptx)
    man = [m for v in ctx.man.values() for m in v]
    out = []
    for b, lok, t, _ in _teks_angka(ctx):
        t2 = RE_D16_KECUALI.sub(' ', _masker(RE_URL.sub(' ', t), man))
        t2 = re.sub(r'^\d+(\.\d+)+\s', ' ', t2)
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
        t2 = re.sub(r'\[\u2026\]|\.{4,}|(?:\. ){3,}|\u2026{2,}', ' ', t)  # kutipan terpotong resmi dan titik penuntun TOC
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
    return nama, m[2]


@gerbang('D-19', 'Pustaka dikutip dua arah, tanpa path internal')
def d19(ctx):
    out = []
    for b, lok, t in teks_tampil(ctx):
        t2 = RE_URL.sub(' ', t)
        m = re.search(r'/Users/|[A-Za-z]:\\|\b(?:data|public|scripts|bangun|src)/[\w.-]+/|\b[\w-]+\.(?:json|csv|py|mjs|geojson)\b', t2)
        if m:
            out.append((b, lok, f'path internal "{m[0]}" dalam "{potong(t)}"'))
    if not ctx.docx:
        return out
    d = ctx.docx
    pus = bagian_pustaka(d)
    idp = {id(p) for p in pus}
    badan = ' '.join(norm(p['teks']) for p in d.badan() if id(p) not in idp and not p['toc'])
    singkat = {s: n.strip() for n, s in re.findall(r'([A-Z][^\[\]()]+?) \[([A-Z][A-Za-z]+)\]', badan)}
    singkat |= {s: n.strip() for n, s in re.findall(r'([A-Z][^\[\]()]+?) \(([A-Z][A-Za-z]+), \d{4}', badan)}
    kutip = []
    for isi in re.findall(r'\(([^()]*\d{4}[a-z]?[^()]*)\)', badan):
        for bag in isi.split(';'):
            m = re.match(r'\s*(.+?),\s*((?:\d{4}[a-z]?|t\.t\.)(?:,\s*(?:\d{4}[a-z]?|t\.t\.))*)', bag)
            if m and not re.match(r'(hlm|Pasal|ayat)\b', m[1]):
                nama = re.sub(r'\s*\[[^\]]+\]$', '', m[1]).strip()
                kutip += [(nama, y.strip()) for y in m[2].split(',')]
    # kutipan naratif "Haque dkk. (2012)" hanya menandai entri terkutip; pola "Nama (2024)" terlalu lebar untuk arah balik
    naratif = re.findall(r'([A-Z][\w-]+(?: dkk\.| dan [A-Z][\w-]+)?) \((\d{4}[a-z]?)', badan)
    kunci =[(_pustaka_kunci(norm(p['teks'])), p) for p in pus]
    for k, p in kunci:
        if k is None:
            out.append((d.nama, p['lok'], f'entri pustaka tanpa pola "Penulis (Tahun)": "{potong(p["teks"])}"'))
    kunci = [(k, p) for k, p in kunci if k]

    def sama(nama_kutip, nama_entri):
        n = singkat.get(nama_kutip, nama_kutip)
        n = re.sub(r' dkk\.$', '', n).split(' dan ')[0].split(' & ')[0]
        return n == nama_entri

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
    navy = ctx.tema['warna']['inti']['navy']['hex'].lstrip('#').upper()
    for o in objek_bernomor(d):
        if o['label'] != 'Tabel' or not o['objek'] or o['objek'][0][0] != 'tbl':
            continue
        t, nm = o['objek'][0][1], f'Tabel {o["nomor"]}'
        lamp = bool(re.fullmatch(r'[A-Z]', o['awalan'] or '')) and o['awalan'] != 'RE'
        kep = [b for b in t['baris'] if b['kepala']]
        if not t['baris'] or not t['baris'][0]['kepala']:
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
        for b in isi:
            for s in b['sel']:
                if angka_id(s['teks']) is not None and s['jc'] and s['jc'][0] not in ('right', 'end'):
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


RE_D22_KECUALI = re.compile(
    r'\b(?:19|20)\d{2}[a-z]?(?:\u2013(?:19|20)?\d{2,4})?\b'
    r'|\b\d{1,2}(?:\u2013\d{1,2})? ' + BULAN + r'\b'
    r'|\b\d{2}\.\d{2}(?:\u2013\d{2}\.\d{2})? (?:WIB|WITA|WIT)\b'
    r'|\b(?:Tabel|Gambar|Bab|Lampiran|Subbab|Pasal|ayat|Nomor|No\.|hlm\.|halaman|Perban|Perpres|Perka|Perda|Pergub|'
    r'Inpres|Keppres|Kepres|PP|UU|SE|Permen\w*|Kepmen\w*|Kep|Renas PB|Renstra)\s*\(?(?:RE|[A-Z]|\d+)(?:[./]\d+)*[a-z]?\)?'
    r'|\b\d+/\d{4}\b|\b[A-C]\.\d+\b|\(\d+\)')


@gerbang('D-22', 'Angka ketikan nol')
def d22(ctx):
    butuh(ctx.docx)
    d = ctx.docx
    man = ctx.man.get(d.nama)
    if man is None:
        raise Lewat('manifest angka DOCX tidak ada (<berkas>.manifest.json)')
    kos = set()

    def kumpul(x):
        if isinstance(x, dict):
            [kumpul(v) for v in x.values()]
        elif isinstance(x, list):
            [kumpul(v) for v in x]
        elif isinstance(x, str) and re.search(r'\d', x):
            kos.add(x)
    kumpul(ctx.tema['kosakata'])
    man2 = man + [{'tampil': k} for k in kos]
    total = {id(s_p) for t in d.tabel for b in t['baris'] if b['sel'] and norm(b['sel'][0]['teks']).lower() in ('jumlah', 'total')
             for s in b['sel'] for s_p in s['pars']}
    kepala = {id(s_p) for t in d.tabel for b in t['baris'] if b['kepala'] for s in b['sel'] for s_p in s['pars']}
    out = []
    for _, lok, t, p in _teks_angka(ctx):
        if p is None or p['part'] != 'word/document.xml' or id(p['el']) in total or id(p['el']) in kepala:
            continue
        sisa = RE_D22_KECUALI.sub(' ', _masker(RE_URL.sub(' ', t), man2))
        if p['tabel'] and re.fullmatch(r'\s*\d{1,3}\s*', sisa):  # kolom No / peringkat / kode rekomendasi
            continue
        sisa = re.sub(r'^\s*\d+(\.\d+)+\s', ' ', sisa)
        m = re.search(r'\d[\d.,]*', sisa)
        if m:
            out.append((d.nama, lok, f'angka "{m[0]}" diketik, tidak ada di manifest injeksi: "{t[max(0, m.start() - 25):m.end() + 25]}"'))
    return out


@gerbang('D-23', 'Glif di luar Roboto nol')
def d23(ctx):
    cmap = set.intersection(*(set(f.cmap) for f in ctx.fon.values()))
    temu = {}
    for b, lok, t in teks_tampil(ctx, pdf=False):
        for c in set(t) - cmap - {'\n', '\t', '\r'}:
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
        prof = Path(tempfile.gettempdir()) / 'kajian-qa-lo-profil'
        out = Path(tempfile.mkdtemp(prefix='qa-render-'))
        subprocess.run(['soffice', f'-env:UserInstallation=file://{prof}', '--headless', '--convert-to', 'pdf',
                        '--outdir', str(out), str(path)], capture_output=True, check=True, timeout=600)
        pdf = out / (Path(path).stem + '.pdf')
        if not pdf.exists():
            raise RuntimeError(f'soffice tidak menghasilkan PDF untuk {path}')
        _RENDER[kunci] = (Pdf(pdf).n, pdf)
    return _RENDER[kunci]


@gerbang('T-2', 'Jumlah halaman PDF = dokumen asal')
def t2(ctx):
    if not ((ctx.docx and ctx.pdf) or (ctx.pptx and ctx.pptx_pdf)):
        raise Lewat('butuh pasangan DOCX+PDF atau PPTX+PDF')
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


# ---------------------------------------------------------------- jalan

def jalankan(ctx, semua=False, ketat=False, tulis=print, maks=20):
    """Kembalikan [(kode, status, temuan)]; status LOLOS, GAGAL, LEWAT."""
    hasil = []
    for kode, judul, fn in GERBANG:
        try:
            temuan = fn(ctx)
            status = 'GAGAL' if temuan else 'LOLOS'
            alasan = ''
        except Lewat as e:
            temuan, alasan = [], str(e)
            status = 'GAGAL' if ketat else 'LEWAT'
        hasil.append((kode, status, temuan))
        tulis(f'{status:5} {kode} {judul}' + (f' ({alasan})' if alasan else ''))
        for b, lok, pesan in temuan[:maks]:
            tulis(f'      {kode} {b} {lok}: {pesan}')
        if len(temuan) > maks:
            tulis(f'      ... dan {len(temuan) - maks} temuan lagi')
        if status == 'GAGAL' and not semua:
            sisa = [k for k, _, _ in GERBANG[len(hasil):]]
            if sisa:
                tulis(f'BERHENTI di temuan pertama; belum dijalankan: {", ".join(sisa)} (pakai --semua)')
            break
    cak = json.loads((QA / 'cakupan.json').read_text(encoding='utf-8'))
    tulis(f'Antre (belum bergerbang, qa/cakupan.json): {", ".join(sorted(cak["antre"], key=_urut_kode))}')
    n = {s: sum(1 for h in hasil if h[1] == s) for s in ('LOLOS', 'GAGAL', 'LEWAT')}
    tulis(f'Ringkasan: {n["LOLOS"]} lolos, {n["GAGAL"]} gagal, {n["LEWAT"]} lewat')
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
    ap.add_argument('--kajian', choices=['air', 'mitigasi'])
    ap.add_argument('--lain', nargs='*', default=[], help='SVG, HTML, CSS, JSON gaya untuk D-1..D-4, D-9, D-10, D-23')
    ap.add_argument('--semua', action='store_true', help='jalankan semua gerbang walau ada yang gagal')
    ap.add_argument('--ketat', action='store_true', help='LEWAT dihitung gagal (untuk build kirim)')
    ap.add_argument('--tanpa-render', action='store_true', help='T-2 memakai docProps/app.xml, bukan render soffice')
    a = ap.parse_args(argv)
    if not any([a.docx, a.pdf, a.pptx, a.pptx_pdf, a.lain]):
        ap.error('beri paling sedikit satu berkas')
    ctx = Ctx(a.docx, a.pdf, a.pptx, a.pptx_pdf, a.manifest_docx, a.manifest_pptx, a.kajian, a.lain, render=not a.tanpa_render)
    print('Gerbang QA kajian BNPB: ' + ', '.join(str(x) for x in [a.docx, a.pdf, a.pptx, a.pptx_pdf, *a.lain] if x))
    hasil = jalankan(ctx, a.semua, a.ketat)
    return 1 if any(s == 'GAGAL' for _, s, _ in hasil) else 0


if __name__ == '__main__':
    sys.exit(main())
