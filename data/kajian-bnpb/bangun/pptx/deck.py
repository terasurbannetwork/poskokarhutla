#!/usr/bin/env python3
"""Pembangun deck PPTX kajian BNPB: spek JSON -> PPTX (-> PDF lewat soffice).

    ../../.venv/bin/python deck.py contoh/spek-mitigasi.json keluaran/deck.pptx --pdf

Gaya rumah BNPB (Buku Pegangan bab Selera presentasi). Semua warna, ukuran huruf, margin, dan jarak dibaca
dari tema.json (blok 'slide'); angka dari data/angka.json lewat naskah.Konteks (token {{angka:kunci|opsi}});
master, tema, dan layout PUTIH/GELAP dari templat/templat-bnpb.pptx (deck pemilik). Semua teks, pil, tabel,
penanda, dan label native; gambar hanya foto, logo, peta dasar, dan ikon. Format spek: README.md.
Galat spek atau pelanggaran gaya -> DeckGalat('spek#slide: pesan'), berhenti di galat pertama.
"""
import argparse
import csv
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

import pymupdf
from pptx.opc.constants import RELATIONSHIP_TYPE as RT
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Pt

SINI = Path(__file__).resolve().parent
sys.path.insert(0, str(SINI.parent / 'kontrak'))
sys.path.insert(0, str(SINI))
from ikon import png as ikon_png  # noqa: E402
from naskah import Konteks, fmt_id, format_angka, ikuti  # noqa: E402
from tema import warna  # noqa: E402

AKAR = SINI.parents[1]  # data/kajian-bnpb
REPO = AKAR.parents[1]
TEMPLAT = SINI / 'templat/templat-bnpb.pptx'
HARI = 'Senin Selasa Rabu Kamis Jumat Sabtu Minggu'.split()
BULAN = 'Januari Februari Maret April Mei Juni Juli Agustus September Oktober November Desember'.split()
EMU = 12700
RE_TOK = re.compile(r'\{\{(angka|tempat|sorot):([^{}]*)\}\}|\*\*(.+?)\*\*')
RE_SISA = re.compile(r'\{\{|\}\}')
# angka yang boleh tertulis di spek tanpa token (D-22): tahun, rentang tahun, kode temuan/lampiran, urutan "ke-7", horizon
RE_BOLEH = re.compile(r'\b(?:19|20)\d{2}(?:/\d{4})?\b|\b[A-I]\.?\d{1,2}\b|\bke-\d+\b|\b100 hari\b')
DILARANG = {'\u2014': 'em dash', '\u00b7': 'titik tengah', '\u2026': 'elipsis', '\u25b2': 'segitiga', '\u25bc': 'segitiga',
            '\u2192': 'panah', '\u2713': 'centang'}
RE_EMOJI = re.compile('[\U0001F300-\U0001FAFF\u2600-\u27bf]')
RE_KELAS = re.compile(r'\bkelas (Rendah|Sedang|Tinggi)\b', re.I)  # kartu berlabel kelas indeks wajib warna skala.irbi (T8)
BENTUK = {'kotak': MSO_SHAPE.RECTANGLE, 'bulat': MSO_SHAPE.ROUNDED_RECTANGLE, 'elips': MSO_SHAPE.OVAL,
          'atas': MSO_SHAPE.ROUND_2_SAME_RECTANGLE, 'segitiga': MSO_SHAPE.ISOSCELES_TRIANGLE}
RATA = {'l': PP_ALIGN.LEFT, 'c': PP_ALIGN.CENTER, 'r': PP_ALIGN.RIGHT, 'j': PP_ALIGN.JUSTIFY}
JANGKAR = {'t': MSO_ANCHOR.TOP, 'm': MSO_ANCHOR.MIDDLE, 'b': MSO_ANCHOR.BOTTOM}
# dari kuat ke lemah; penilaian pakar paling lemah: posisi hasil penilaian, bukan rumus atau model (PEDOMAN C6.2)
URUT_YAKIN = ['resmi', 'terverifikasi', 'asumsi-kebijakan', 'estimasi-model', 'penilaian-pakar']
# garis besar deck (Buku Pegangan S34, S35, S7): tiap slide di luar bingkai memuat pesan, jenis_slide, judul_bentuk
BINGKAI = {'sampul', 'penutup', 'pembatas-lampiran'}
JENIS_S35 = {'navigasi', 'peta', 'grafik', 'tabel', 'matriks', 'kartu-skenario', 'panel', 'rekomendasi', 'lampiran'}
JENIS_S35_TATA = {'kesimpulan': {'navigasi'}, 'lampiran-tabel': {'lampiran'}, 'rekomendasi': {'rekomendasi'},
                  'skenario': {'kartu-skenario'}, 'temuan-peta': {'peta'}}  # tata letak yang hanya sah untuk jenis ini
RE_KODE_BAGIAN = re.compile(r'^\s*(?:\{\{sorot:)?([A-Z])\d+\.\s')  # "A1. " di depan judul (S10, T12)


class DeckGalat(Exception):
    pass


def E(v):
    return int(round(v * EMU))


def pt_dari(g):
    u = g['ukuran_pt']
    return max(u) if isinstance(u, list) else u


def berkas_font(t, bobot):
    """Roboto untuk metrik: ROBOTO_DIR, lalu tema.json font.berkas (font sistem yang juga dipakai soffice), lalu
    public/vendor/roboto di repo. Font sistem tetap wajib untuk PDF; pdffonts di periksa.py menangkap substitusi."""
    nama = Path(t['font']['berkas'][bobot]).name
    calon = ([Path(os.environ['ROBOTO_DIR']) / nama] if os.environ.get('ROBOTO_DIR') else []) + [
        Path(t['font']['berkas'][bobot]).expanduser(), REPO / 'public/vendor/roboto' / nama]
    for p in calon:
        if p.exists():
            return p
    raise DeckGalat(f'font {nama} tidak ada di {", ".join(map(str, calon))}; pasang Roboto atau setel ROBOTO_DIR')


def soffice():
    """LibreOffice: SOFFICE, lalu soffice/libreoffice di PATH, lalu lokasi baku Homebrew dan macOS."""
    for p in (os.environ.get('SOFFICE'), shutil.which('soffice'), shutil.which('libreoffice'),
              '/opt/homebrew/bin/soffice', '/Applications/LibreOffice.app/Contents/MacOS/soffice'):
        if p and Path(p).exists():
            return p
    raise DeckGalat('soffice (LibreOffice) tidak ditemukan; pasang LibreOffice atau setel SOFFICE')


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def peran_token(t, tok):
    """Peran warna bawaan dari nama token (PEDOMAN B1, gerbang D-24): kategori.<k>, skala.<ramp>, permukaan, inti, aksen."""
    bag = tok.split('.')
    if bag[0] in ('kategori', 'skala'):
        return f'{bag[0]}.{bag[1]}'
    if bag[0] == 'tint':
        return 'permukaan'
    return 'inti' if tok in t['warna']['inti'] else 'aksen'


class Ukur:
    """Lebar teks dari metrik Roboto (PyMuPDF), untuk pas judul, lebar pil, dan cek muat baris."""

    def __init__(self, t):
        self.f = {False: pymupdf.Font(fontfile=str(berkas_font(t, 'regular'))),
                  True: pymupdf.Font(fontfile=str(berkas_font(t, 'bold')))}

    def lebar(self, runs):
        return sum(self.f[r[2]].text_length(r[0], fontsize=r[3]) + r[4] * len(r[0]) for r in runs)

    def baris(self, paras, w):
        """Jumlah baris bila paragraf run dibungkus per kata ke lebar w (pt), seperti renderer."""
        n = 0
        for runs in paras:
            kata, cur = [], []
            for r in runs:
                for i, bag in enumerate(re.split(r'( )', r[0])):
                    if bag == ' ':
                        kata.append(cur)
                        cur = []
                    elif bag:
                        cur.append((bag,) + tuple(r[1:]))
            kata.append(cur)
            garis, isi = 1, 0.0
            for k in kata:
                lk = self.lebar(k)
                spasi = self.lebar([(' ',) + tuple(k[0][1:])]) if k else 0
                if isi and isi + spasi + lk > w * 0.98:
                    garis, isi = garis + 1, lk
                else:
                    isi += (spasi if isi else 0) + lk
            n += garis
        return n


class Kanvas:
    """Satu slide: bentuk, teks, garis, gambar, ikon dalam satuan pt."""

    def __init__(self, d, slide):
        self.d, self.sh = d, slide.shapes

    def bentuk(self, jenis, x, y, w, h, isi=None, garis=None, tebal=0.75, radius=None, putar=0):
        s = self.sh.add_shape(BENTUK[jenis], E(x), E(y), E(max(w, 0.1)), E(max(h, 0.1)))
        gaya = s._element.find(qn('p:style'))
        if gaya is not None:
            s._element.remove(gaya)
        if isi:
            s.fill.solid()
            s.fill.fore_color.rgb = self.d.rgb(isi)
        else:
            s.fill.background()
        if garis:
            s.line.color.rgb = self.d.rgb(garis)
            s.line.width = Pt(tebal)
        else:
            s.line.fill.background()
        if radius is not None and jenis in ('bulat', 'atas'):
            s.adjustments[0] = min(0.5, radius / max(min(w, h), 0.1))
        if jenis == 'atas':
            s.adjustments[1] = 0.0
        if putar:
            s.rotation = putar
        return s

    def isi_teks(self, tf, paras, rata='l', jangkar='t', bungkus=True, spasi=None, kiri=0, kanan=0):
        tf.word_wrap = bungkus
        tf.auto_size = MSO_AUTO_SIZE.NONE
        bp = tf._txBody.find(qn('a:bodyPr'))
        for a, v in (('lIns', kiri), ('tIns', 0), ('rIns', kanan), ('bIns', 0)):
            bp.set(a, str(E(v)))
        tf.vertical_anchor = JANGKAR[jangkar]
        for i, runs in enumerate(paras):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.alignment = RATA[rata]
            if spasi:
                p.line_spacing = spasi
            for teks, wtok, tebal, ukuran, spc in runs:
                if teks == '\n':  # patah baris di dalam paragraf (judul seimbang)
                    p.add_line_break()
                    continue
                r = p.add_run()
                r.text = teks
                f = r.font
                f.name, f.size, f.bold = 'Roboto', Pt(ukuran), tebal
                f.color.rgb = self.d.rgb(wtok)
                rpr = r._r.get_or_add_rPr()
                rpr.set('lang', 'id-ID')
                if spc:
                    rpr.set('spc', str(int(round(spc * 100))))

    def teks(self, x, y, w, h, paras, rata='l', jangkar='t', bungkus=True, spasi=None):
        if paras and isinstance(paras[0], tuple):
            paras = [paras]
        tb = self.sh.add_textbox(E(x), E(y), E(max(w, 0.1)), E(max(h, 0.1)))
        self.isi_teks(tb.text_frame, paras, rata, jangkar, bungkus, spasi)
        return tb

    def garis(self, x1, y1, x2, y2, wtok, tebal=0.75):
        c = self.sh.add_connector(MSO_CONNECTOR.STRAIGHT, E(x1), E(y1), E(x2), E(y2))
        gaya = c._element.find(qn('p:style'))
        if gaya is not None:
            c._element.remove(gaya)
        c.line.color.rgb = self.d.rgb(wtok)
        c.line.width = Pt(tebal)
        return c

    def gambar(self, path, x, y, w, h, jenis=None):
        """jenis: logo, foto, peta, ikon; dicatat per halaman untuk laporan QA deck (Buku Pegangan S37, S39)."""
        if self.d.hal is not None:
            self.d.hal.setdefault('gambar', []).append(jenis or ('logo' if Path(path).resolve() == self.d.logo else 'lain'))
        return self.sh.add_picture(str(path), E(x), E(y), E(w), E(h))

    def ikon(self, konsep, wtok, x, y, d):
        return self.gambar(self.d.ikon(konsep, wtok), x, y, d, d, 'ikon')

    def bulat_ikon(self, x, y, d, isi, konsep, wtok, rasio):
        self.bentuk('elips', x, y, d, d, isi)
        di = d * rasio
        self.ikon(konsep, wtok, x + (d - di) / 2, y + (d - di) / 2, di)

    def segitiga(self, x, y, s, naik, wtok):
        return self.bentuk('segitiga', x, y, s, s * 0.8, wtok, putar=0 if naik else 180)


class Deck:
    def __init__(self, spek, nama='spek', akar=AKAR, keluaran=None, berkas_spek=None):
        self.k = Konteks(akar)
        self.t = self.k.tema
        self.S, self.T, self.K = self.t['slide'], self.t['slide']['tipografi'], self.t['slide']['komponen']
        self.u = Ukur(self.t)
        self.spek, self.nama, self.akar = spek, nama, Path(akar)
        self.keluaran = Path(keluaran or SINI / 'keluaran')
        self.logo = (self.akar / self.t['header_footer']['header']['logo']).resolve()
        self.catatan = []  # (asal, butir, nilai) untuk gerbang
        self.hal = None  # halaman yang sedang digambar: nomor, keluarga warna, warna tercatat, judul, struktur, peta
        self.halaman = []  # rekaman per halaman untuk manifest (D-8, D-17, D-24, angka struktur)
        self.masukan = {self.akar / 'tema.json', self.akar / 'data/angka.json', TEMPLAT, self.logo}
        if berkas_spek:
            self.masukan.add(Path(berkas_spek).resolve())
        self.prs = Presentation(TEMPLAT)
        daftar = self.prs.slides._sldIdLst
        for sid in list(daftar):  # slide templat dibuang; master, tema, layout tetap
            self.prs.part.drop_rel(sid.rId)
            daftar.remove(sid)
        self.lay = {lay.name: lay for lay in self.prs.slide_layouts}
        kaj = spek.get('kajian')
        if kaj not in self.t['kajian'] or not isinstance(self.t['kajian'][kaj], dict):
            raise DeckGalat(f'{nama}: kajian "{kaj}" tidak ada di tema.json kajian')
        self.kaj = self.t['kajian'][kaj]
        self.tgl = date.fromisoformat(spek['tanggal'])
        self.X0, self.W = self.S['margin_kiri_pt'], self.S['lebar_isi_pt']
        self.X1 = self.X0 + self.W
        if spek.get('horizon_label'):  # label chip waktu, mis. "100 hari sejak penetapan"; kode tetap dari kosakata
            asing = set(spek['horizon_label']) - set(self.t['kosakata']['horizon'])
            if asing:
                raise DeckGalat(f'{nama}: horizon_label {sorted(asing)} bukan kode kosakata.horizon')
            self.t['kosakata']['horizon'] = dict(self.t['kosakata']['horizon'], **spek['horizon_label'])
        if spek.get('judul_sampul_maks_baris'):  # Buku Pegangan: judul paling banyak dua baris, huruf dikecilkan
            self.T['judul_sampul'] = dict(self.T['judul_sampul'], maks_baris=spek['judul_sampul_maks_baris'],
                                          ukuran_pt=spek.get('judul_sampul_pt', self.T['judul_sampul']['ukuran_pt']))

    # ------------------------------------------------------------------ dasar
    def visual(self, jenis):
        """Grafik native, tabel native (termasuk matriks dan kisi), atau peta di halaman ini (Buku Pegangan S36)."""
        if self.hal is not None:
            self.hal.setdefault('visual', set()).add(jenis)

    def catat_warna(self, tok):
        """'token' atau 'token@peran' -> hex; dicatat per halaman (hex, peran) untuk gerbang D-24 (PEDOMAN B1.8)."""
        tok, _, peran = tok.partition('@')
        h = warna(self.t, tok)
        if self.hal is not None:
            self.hal['warna'].add((h[1:], peran or peran_token(self.t, tok)))
        return tok, h

    def rgb(self, tok):
        return RGBColor.from_string(self.catat_warna(tok)[1][1:])

    def ikon(self, konsep, wtok):
        return ikon_png(self.t, konsep, self.catat_warna(wtok)[0], self.keluaran / 'ikon')

    def st(self, teks):
        """Teks berangka buatan mesin (nomor halaman, kode, tanggal, label kosakata): dicatat sebagai struktur, bukan data."""
        if self.hal is not None:
            self.hal['struktur'].append(teks)
        return teks

    def berkeluarga(self):
        """Halaman menampilkan kategori atau ramp api/basah (B1.5, B1.8): arah memakai teks-2 dan katanya ditulis."""
        return bool(self.hal and self.hal['keluarga'] & {'api', 'basah'})

    def arah(self, nilai):
        """Token arah halaman ini: naik oranye, turun biru, 0 teks-3; di halaman berkeluarga api/basah teks-2."""
        A = self.t['warna']['arah']
        tok = A['nol'] if not nilai else A['berkeluarga'] if self.berkeluarga() else A['naik' if nilai > 0 else 'turun']
        return tok + '@arah'

    def kata_arah(self, nilai):
        """Kata naik/turun di depan angka arah: wajib di halaman berkeluarga, karena warnanya tidak lagi membawa arah."""
        return ('naik ' if nilai > 0 else 'turun ') if self.berkeluarga() and nilai else ''

    def sumber_olah(self, *sumber):
        """Sumber angka turunan: tiap sumber asal diberi awalan pengolahan, sehingga baris Sumber menulis 'diolah Pantau Bencana'."""
        aw = self.K['bingkai']['sumber']['awalan_olah']
        bag = []
        for s in sumber:
            for b in (x.strip() for x in s.split(';')):
                b = b[len(aw):].strip() if b.startswith(aw) else b
                if b and not aw.startswith(b) and b not in bag:
                    bag.append(b)
        return '; '.join(f'{aw} {b}' for b in bag)

    def turunan(self, kunci, tampil, nilai, asal, keyakinan, *sumber, dari=()):
        self.k.manifest.append({'kunci': f'turunan:{asal}#{kunci}', 'tampil': tampil, 'nilai': nilai, 'naskah': asal,
                                'keyakinan': keyakinan, 'sumber': self.sumber_olah(*sumber), 'dari': list(dari)})

    def cek_kelas(self, teks, wt, asal):
        """Kartu berlabel kelas indeks (Rendah/Sedang/Tinggi) wajib warna kelas skala.irbi; merah ditolak (T8, B1.1)."""
        m = RE_KELAS.search(teks)
        if not m:
            return
        ir = self.t['warna']['skala']['irbi']
        harus = f'skala.{ir["ramp"]}.{ir["kelas"][ir["label"].index(m[1].capitalize())]}'
        if wt.partition('@')[0] != harus:
            raise DeckGalat(f'{asal}: "{teks[:50]}" berlabel kelas indeks {m[1]}; warna harus {harus}, bukan {wt} '
                            '(T8; PEDOMAN B1.1: merah tidak untuk kelas indeks)')

    def cek_ilustrasi(self, kunci, asal):
        """Angka registri dari baris berlabel ilustrasi (utama=false atau 'hanya ilustrasi') tidak boleh tampil di deck."""
        e = self.k.angka.get(kunci, {})
        jalur = e.get('jalur') or e.get('jalur_rendah') or ''
        catatan = e.get('catatan', '')
        if 'berkas' in e and '].' in jalur:
            baris = ikuti(self.k._muat(e['berkas']), jalur.rsplit('.', 1)[0])
            if isinstance(baris, dict):
                catatan += ' ' + str(baris.get('catatan', ''))
                if str(baris.get('utama', '')).lower() == 'false':
                    catatan += ' hanya ilustrasi'
        if 'hanya ilustrasi' in catatan.lower():
            raise DeckGalat(f'{asal}: angka {kunci} bersumber baris berlabel ilustrasi (utama=false atau "hanya ilustrasi" '
                            f'di {e.get("berkas")}); pakai pasangan utama')

    def R(self, teks, g, warna_=None, tebal=None, ukuran=None):
        """Satu run dari gaya tipografi: (teks, token warna, tebal, pt, spasi huruf pt)."""
        return (teks, warna_ or g.get('warna', 'teks'), g.get('bobot') == 'bold' if tebal is None else tebal,
                ukuran or pt_dari(g), g.get('spasi_huruf_pt', 0))

    def cek_teks(self, teks, asal):
        for c, nama in DILARANG.items():
            if c in teks:
                raise DeckGalat(f'{asal}: {nama} (U+{ord(c):04X}) di "{teks[:60]}"')
        if RE_EMOJI.search(teks):
            raise DeckGalat(f'{asal}: emoji di "{teks[:60]}"')
        for ist in self.t['kosakata']['istilah']['terlarang']:
            if re.search(rf'(?<!\w){re.escape(ist)}(?!\w)', teks, re.I):
                raise DeckGalat(f'{asal}: istilah terlarang "{ist}" (D-10) di "{teks[:60]}"')

    def urai(self, teks, asal):
        """Teks spek -> [(teks, jenis, tebal)]; jenis teks/angka/tempat/sorot. Angka disuntik dari registri."""
        self.cek_teks(teks, asal)
        polos = RE_TOK.sub(lambda m: '' if m[1] else m[3], teks)
        if RE_SISA.search(polos):
            raise DeckGalat(f'{asal}: token tidak dikenal di "{teks[:60]}"; yang ada {{{{angka:}}}}, {{{{tempat:}}}}, {{{{sorot:}}}}')
        sisa = RE_BOLEH.sub('', RE_TOK.sub(lambda m: m[2] if m[1] in ('tempat', 'sorot') else '' if m[1] else m[3], teks))
        if re.search(r'\d', sisa):
            raise DeckGalat(f'{asal}: angka diketik di "{teks[:60]}" (D-22); pakai {{{{angka:kunci}}}}')
        segs, pos = [], 0
        for m in RE_TOK.finditer(teks):
            if m.start() > pos:
                segs.append((teks[pos:m.start()], 'teks', False))
            if m[1] == 'angka':
                kunci, _, opsi = m[2].partition('|')
                try:
                    segs.append((self.k.suntik(kunci.strip(), '|' + opsi, asal), 'angka', False))
                except (KeyError, ValueError) as e:
                    raise DeckGalat(f'{asal}: {str(e).strip(chr(34))}')
                self.cek_ilustrasi(kunci.strip(), asal)
            elif m[1]:
                segs.append((m[2], m[1], False))
            else:
                segs.append((m[3], 'teks', True))
            pos = m.end()
        if pos < len(teks):
            segs.append((teks[pos:], 'teks', False))
        return segs

    def runs(self, teks, g, asal, mode='isi', warna_=None, ukuran=None, tebal=None):
        """Teks spek -> run bergaya. mode judul: angka dan sorot oranye, tempat biru lembaga; mode isi: angka tebal."""
        out = []
        api = bool(self.hal and 'api' in self.hal['keluarga'])  # B1.8: kategori atau ramp api tampil -> angka judul navy
        for s, jenis, b in self.urai(teks, asal):
            w, tb = warna_, (tebal if tebal is not None else (b or None))
            if mode == 'judul' and jenis == 'angka':
                w = g['warna_angka_berkeluarga' if api else 'warna_angka'] + '@angka-judul'
            elif mode == 'judul' and jenis == 'sorot':
                w = g['warna_angka']
            elif mode == 'judul' and jenis == 'tempat':
                w = g.get('warna_tempat', 'biru-lembaga')
            elif jenis != 'teks':
                tb = True
            out.append(self.R(s, g, w, tb, ukuran))
        return out

    def muat(self, paras, w, maks, asal, butir):
        if paras and isinstance(paras[0], tuple):
            paras = [paras]
        n = self.u.baris(paras, w)
        if n > maks:
            teks = ''.join(r[0] for r in paras[0])[:60]
            raise DeckGalat(f'{asal}: {butir} {n} baris > {maks} pada lebar {w:.0f} pt ("{teks}"); pendekkan')
        return n

    def tint(self, wtok):
        wtok = wtok.partition('@')[0]
        warna(self.t, wtok)  # token tak dikenal ditolak dulu dengan pesan tema.py
        m = self.K['kartu']['tint_ikon']
        if wtok in m:
            return m[wtok]
        if wtok.startswith('kategori.'):
            return f"tint.{self.t['warna']['kategori'][wtok.split('.')[1]]['tint']}.pita"
        if wtok.startswith('skala.'):  # B1.4: kelas 1 tiap ramp = tint pita keluarganya, jadi kelas berlatar tint netral
            return 'tint.netral.pita'
        raise DeckGalat(f'warna "{wtok}" tidak punya tint di slide.komponen.kartu.tint_ikon')

    def gelap(self, j):
        """Layout GELAP (navy): tema slide.layout.gelap_untuk, atau "layout": "gelap" di spek slide (sampul gelap)."""
        return j['spek'].get('layout', 'gelap' if j['jenis'] in self.S['layout']['gelap_untuk'] else 'putih') == 'gelap'

    def bawah(self, ada_sumber=True):
        B = self.K['bingkai']
        return B['sumber']['isi_bawah_pt'] if ada_sumber else self.S['area_isi_y_pt'][1]

    # ------------------------------------------------------------------ data CSV
    def opsi_fmt(self, f):
        o = {'flag': set()}
        for bag in filter(None, str(f).split('|')):
            if bag.isdigit():
                o['fmt'] = bag
            else:
                o['flag'].add(bag)
        return o

    def tampil(self, v, f, kyk):
        """Angka sel; kolom 'arah' tanpa kata (segitiga yang membawa arah), kecuali di halaman berkeluarga (B1.5)."""
        o = self.opsi_fmt(f)
        if 'arah' in o['flag'] and not self.berkeluarga():
            o['flag'].discard('arah')
            v = abs(v)
        return format_angka(v, None, None, '', kyk, o)

    def data(self, sp, asal):
        """Tabel dari CSV (saring, urut, batas, kolom) seperti tabel csv naskah; tiap angka masuk manifest."""
        for w in ('csv', 'kolom', 'sumber', 'keyakinan'):
            if w not in sp:
                raise DeckGalat(f'{asal}: data tanpa "{w}"')
        kyk = sp['keyakinan'].split(';')[0].strip()
        if kyk not in self.t['kosakata']['keyakinan']:
            raise DeckGalat(f'{asal}: keyakinan "{kyk}" bukan salah satu dari lima label (tema.json kosakata.keyakinan)')
        p = self.akar / sp['csv']
        if not p.exists():
            raise DeckGalat(f'{asal}: csv {sp["csv"]} tidak ada (relatif ke data/kajian-bnpb/)')
        self.masukan.add(p)
        with p.open(encoding='utf-8') as f:
            rows = list(csv.DictReader(f))
        for syarat in filter(None, (s.strip() for s in sp.get('saring', '').split(';'))):
            beda = '!=' in syarat
            k_, _, v = syarat.partition('!=' if beda else '=')
            rows = [r for r in rows if (r.get(k_.strip()) == v.strip()) != beda]
        if not rows:
            raise DeckGalat(f'{asal}: {sp["csv"]} kosong setelah saring "{sp.get("saring", "")}"')
        if sp.get('urut'):
            u = sp['urut'].lstrip('-')
            rows.sort(key=lambda r: float(r[u]) if r[u] != '' else float('-inf'), reverse=sp['urut'].startswith('-'))
        if sp.get('batas'):
            rows = rows[:int(sp['batas'])]
        kolom = [c if isinstance(c, dict) else {'nama': c} for c in sp['kolom']]
        ganti = self.t['kosakata']['istilah']['ganti']
        for c in kolom:
            if c['nama'] not in rows[0]:
                raise DeckGalat(f'{asal}: kolom "{c["nama"]}" tidak ada di {sp["csv"]}')
            self.cek_teks(c.get('kepala', ''), asal)
        baris = []
        for r in rows:
            sel = []
            for c in kolom:
                v = r[c['nama']]
                if c.get('fmt') and v != '':
                    x = float(v)
                    s = self.tampil(x, c['fmt'], kyk)
                    self.k.manifest.append({'kunci': f'csv:{sp["csv"]}#{c["nama"]}', 'tampil': s, 'nilai': x, 'naskah': asal,
                                            'keyakinan': sp['keyakinan'], 'sumber': sp['sumber']})
                    sel.append({'teks': s, 'nilai': x})
                else:
                    s = c.get('ganti', {}).get(v) or ganti.get(v, v) if v != '' else '–'  # ganti per kolom: kode besaran -> label tampil
                    self.cek_teks(s, asal)
                    sel.append({'teks': s, 'nilai': None})
            baris.append(sel)
        return {'kolom': kolom, 'baris': baris, 'keyakinan': sp['keyakinan'], 'sumber': sp['sumber'],
                'sorot': set(sp.get('sorot', []))}

    def seimbang(self, teks, g, w, maks, asal):
        """Patah baris seimbang untuk judul sampul: tiap baris muat, baris terpanjang sependek mungkin (tanpa yatim)."""
        kata = teks.split(' ')
        lebar = lambda ks: self.u.lebar([self.R(' '.join(ks), g)])
        if lebar(kata) <= w * 0.98:
            return [teks]
        from itertools import combinations
        for n in range(2, maks + 1):
            calon = []
            for potong in combinations(range(1, len(kata)), n - 1):
                bag = [kata[a:b] for a, b in zip((0,) + potong, potong + (len(kata),))]
                lw = [lebar(b) for b in bag]
                if max(lw) <= w * 0.98:
                    calon.append((max(lw), [' '.join(b) for b in bag]))
            if calon:
                return min(calon)[1]
        raise DeckGalat(f'{asal}: judul sampul lebih dari {maks} baris; pendekkan')

    # ------------------------------------------------------------------ komponen
    def lebar_pil(self, runs, h, ikon=False):
        C = self.K['chip']
        pad = h * C['pad_rasio']
        return pad * 2 + self.u.lebar(runs) + (h * C['ikon_rasio'] + pad * 0.6 if ikon else 0)

    def pil(self, kv, x, y, runs, h, isi=None, garis=None, ikon=None, warna_ikon=None, w=None, rata='c', kanan=False):
        """Pil membulat penuh berteks (dan ikon). x = tepi kiri, atau tepi kanan bila kanan=True. Kembalikan lebar."""
        C = self.K['chip']
        di = h * C['ikon_rasio'] if ikon else 0
        pad = h * C['pad_rasio']
        lebar = w or self.lebar_pil(runs, h, bool(ikon))
        if kanan:
            x -= lebar
        pil = lambda tok: tok and (tok if '@' in tok or tok.startswith(('kategori.', 'skala.')) else tok + '@pil')  # pil berteks: arti di teksnya
        s = kv.bentuk('bulat', x, y, lebar, h, pil(isi or 'kertas'), pil(garis), radius=h / 2)
        kiri = pad + di + pad * 0.6 if ikon else pad
        kv.isi_teks(s.text_frame, [runs], rata='l' if ikon else rata, jangkar='m', bungkus=False,
                    kiri=kiri if ikon or rata == 'l' else 0)
        if ikon:
            kv.ikon(ikon, warna_ikon, x + pad, y + (h - di) / 2, di)
        return lebar

    def pil_nada(self, kv, x, y, teks, g, h, nada, ikon=None, kanan=False):
        """Pil berkosakata nada_pil/keyakinan/status_usulan: {pil_isi | pil_garis, pil_teks}."""
        tw = nada['pil_teks']
        return self.pil(kv, x, y, [self.R(teks, g, tw)], h, nada.get('pil_isi', 'kertas'), nada.get('pil_garis'),
                        ikon, tw, kanan=kanan)

    def pil_keyakinan(self, kv, x_kanan, y, h, kode):
        kyk, *tamb = [p.strip() for p in kode.split(';')]
        if kyk not in self.t['kosakata']['keyakinan']:
            raise DeckGalat(f'keyakinan "{kyk}" bukan salah satu dari lima label (D-14)')
        v = self.t['kosakata']['keyakinan'][kyk]
        return self.pil_nada(kv, x_kanan, y, v['label'] + (', ' + tamb[0] if tamb else ''), self.T['chip'], h, v, kanan=True)

    def pil_bagian(self, kv, x, y, teks, ikon, nada):
        P = self.K['pil_bagian']
        n = self.t['kosakata']['nada_pil'][nada]
        return self.pil(kv, x, y, [self.R(teks.upper(), self.T['pil_bagian'], n['pil_teks'])], P['tinggi_pt'],
                        n.get('pil_isi', 'kertas'), n.get('pil_garis'), ikon, n['pil_teks'])

    def grup_kartu(self, kv, grup, y, asal):
        G, KR = self.K['grup_kartu'], self.K['kartu']
        n = sum(len(g['kartu']) for g in grup)
        tetap = sum(2 * G['pad_pt'] + (len(g['kartu']) - 1) * KR['jarak_pt'] for g in grup) + G['jarak_pt'] * (len(grup) - 1)
        cw = (self.W - tetap) / n
        if cw < KR['lebar_pt'][0]:
            raise DeckGalat(f'{asal}: {n} kartu terlalu banyak (lebar {cw:.0f} pt < {KR["lebar_pt"][0]} pt)')
        x = self.X0
        for g in grup:
            nada = g.get('nada', 'data')
            gw = 2 * G['pad_pt'] + len(g['kartu']) * cw + (len(g['kartu']) - 1) * KR['jarak_pt']
            kv.bentuk('bulat', x, y, gw, G['tinggi_pt'], G['nada'][nada]['warna_latar'], radius=G['radius_pt'])
            bw = self.pil_bagian(kv, x + G['pad_pt'], y + G['pil_dy_pt'], g['pil'], g.get('ikon', 'data'), nada)
            m0 = len(self.k.manifest)
            for i, k in enumerate(g['kartu']):
                self.kartu(kv, x + G['pad_pt'] + i * (cw + KR['jarak_pt']), y + G['kartu_dy_pt'], cw, k, asal)
            baru = self.k.manifest[m0:]
            if not baru:
                raise DeckGalat(f'{asal}: grup "{g["pil"]}" tanpa angka registri; label keyakinan kartu tidak bisa diturunkan (KERANGKA 4)')
            kyk = max((m['keyakinan'] for m in baru), key=lambda v: URUT_YAKIN.index(v.split(';')[0].strip()))
            C, PB = self.K['chip'], self.K['pil_bagian']
            yw = self.pil_keyakinan(kv, x + gw - G['pad_pt'], y + G['pil_dy_pt'] + (PB['tinggi_pt'] - C['tinggi_pt']) / 2, C['tinggi_pt'], kyk)
            if bw + yw + G['pad_pt'] > gw - 2 * G['pad_pt']:
                raise DeckGalat(f'{asal}: pil grup "{g["pil"]}" menabrak pil keyakinan; pendekkan pil atau tambah kartu')
            x += gw + G['jarak_pt']
        return y + G['tinggi_pt']

    def kartu(self, kv, x, y, w, k, asal):
        KR = self.K['kartu']
        wt, h, d = k.get('warna', 'navy'), KR['tinggi_pt'], KR['lingkaran_pt']
        self.cek_kelas(k['label'], wt, asal)
        if re.search(r'\{\{angka:[^}]*\|arah', k['nilai']):  # nilai berarah: warnanya arah halaman ini (B1.5, B1.8)
            m0 = len(self.k.manifest)
            awal = self.urai(k['nilai'], asal)[0][0]
            wt = self.arah(-1 if awal.startswith('turun') else 1 if awal.startswith('naik') else 0)
            del self.k.manifest[m0:]  # urai di atas hanya untuk membaca arah; nilai dicatat sekali di bawah
        kv.bentuk('bulat', x, y, w, h, 'kertas', KR['warna_garis'], radius=KR['radius_pt'])
        kv.bulat_ikon(x + KR['lingkaran_dx_pt'], y + (h - d) / 2, d, self.tint(wt), k['ikon'], wt, KR['ikon_pt'] / d)
        tx, tw = x + KR['teks_dx_pt'], w - KR['teks_dx_pt'] - KR['lingkaran_dx_pt']
        nilai = self.runs(k['nilai'], self.T['nilai_kartu'], asal, warna_=wt, tebal=True)
        label = self.runs(k['label'], self.T['label_kartu'], asal)
        self.muat(nilai, tw, 1, asal, 'nilai kartu')
        self.muat(label, tw, 1, asal, 'label kartu')
        kv.teks(tx, y + KR['nilai_dy_pt'], tw, KR['nilai_tinggi_pt'], nilai, jangkar='m', bungkus=False)
        kv.teks(tx, y + KR['label_dy_pt'], tw, KR['label_tinggi_pt'], label, jangkar='m', bungkus=False)

    def panel(self, kv, x, y, w, h, judul, ikon, nada='netral', hitungan=None, keyakinan=None, asal=''):
        """Panel putih berpita kepala; kembalikan kotak isi (x, y, w, h)."""
        P = self.K['panel']
        N, pita = P['nada'][nada], P['pita_pt']
        kv.bentuk('bulat', x, y, w, h, 'kertas', radius=P['radius_pt'])
        kv.bentuk('bulat', x, y, w, pita, N['warna_pita'], radius=P['radius_pt'])
        kv.bentuk('kotak', x, y + pita / 2, w, pita / 2, N['warna_pita'])
        kv.bentuk('bulat', x, y, w, h, None, P['warna_garis'], P['tebal_garis_pt'], radius=P['radius_pt'])
        d = P['lingkaran_pt']
        kv.bulat_ikon(x + P['pad_pt'], y + (pita - d) / 2, d, N['warna_ikon'], ikon, 'kertas', P['ikon_pt'] / d)
        kanan = x + w - P['pad_pt']
        if hitungan:
            r = self.runs(hitungan, self.T['hitungan_panel'], asal, warna_=N['warna_ikon'], tebal=True)
            hw = self.u.lebar(r)
            kv.teks(kanan - hw - 2, y, hw + 2, pita, r, rata='r', jangkar='m', bungkus=False)
            kanan -= hw + P['pad_pt']
        if keyakinan:
            kanan -= self.pil_keyakinan(kv, kanan, y + (pita - self.K['chip']['tinggi_pt']) / 2, self.K['chip']['tinggi_pt'], keyakinan) + P['pad_pt']
        jx = x + P['pad_pt'] + d + P['jarak_judul_pt']
        jr = self.runs(judul, self.T['judul_panel'], asal)
        self.muat(jr, kanan - jx, 1, asal, 'judul panel')
        kv.teks(jx, y, kanan - jx, pita, jr, jangkar='m', bungkus=False)
        jarak = self.K['jarak_isi_ke_tepi_panel_pt']
        return x + P['pad_pt'], y + pita + P['pad_pt'] * 0.8, w - 2 * P['pad_pt'], h - pita - P['pad_pt'] * 0.8 - jarak

    def pita(self, kv, x, y, w, p, asal):
        PB = self.K['pita_bawah']
        N, h = PB['nada'][p.get('nada', 'data')], PB['tinggi_baku_pt']
        kv.bentuk('bulat', x, y, w, h, N['warna_latar'], radius=PB['radius_pt'])
        kv.teks(x + PB['pad_pt'], y + PB['label_dy_pt'], w / 2, PB['label_tinggi_pt'],
                [self.R(p['label'].upper(), self.T['label_bagian'], N['warna_label'])], bungkus=False)
        kol = p['kolom']
        cw = (w - 2 * PB['pad_pt']) / len(kol)
        d = PB['lingkaran_pt']
        for i, c in enumerate(kol):
            cx = x + PB['pad_pt'] + i * cw
            if i:
                kv.garis(cx - PB['pad_pt'] / 2, y + PB['pemisah_dy_pt'], cx - PB['pad_pt'] / 2, y + h - PB['pemisah_bawah_pt'],
                         N['warna_pemisah'] + '@garis')  # garis hias, bukan kelas skala
            kv.bulat_ikon(cx, y + PB['lingkaran_dy_pt'], d, N['warna_ikon'], c['ikon'], 'kertas', PB['ikon_pt'] / d)
            tx, tw = cx + PB['teks_dx_pt'], cw - PB['teks_dx_pt'] - PB['pad_pt']
            jr = self.runs(c['judul'], self.T['judul_kolom_pita'], asal)
            ir = self.runs(c['isi'], self.T['isi_pita'], asal)
            self.muat(jr, tw, 1, asal, 'judul kolom pita')
            self.muat(ir, tw, 2, asal, 'isi kolom pita')
            kv.teks(tx, y + PB['judul_dy_pt'], tw, PB['judul_tinggi_pt'], jr, bungkus=False)
            kv.teks(tx, y + PB['isi_dy_pt'], tw, h - PB['isi_dy_pt'] - 4, ir)
        return h

    def daftar_temuan(self, kv, x, y, w, h, items, asal, kolom=2):
        """Temuan bernomor (Pesan Kunci, PEDOMAN B5.26): lingkaran ikon, kode "Temuan B.1", temuan <= 3 baris, pil keyakinan kanan."""
        TM, C = self.K['temuan'], self.K['chip']
        for it in items:
            if not re.fullmatch(TM['pola_kode'], it.get('kode', '')):
                raise DeckGalat(f'{asal}: kode temuan "{it.get("kode")}" harus berbentuk "Temuan B.1" (PEDOMAN B5.26; bentuk '
                                'telanjang bertabrakan dengan "Tabel A.1" dan lampiran "A1", D-27)')
            if it.get('keyakinan', '').split(';')[0].strip() not in self.t['kosakata']['keyakinan']:
                raise DeckGalat(f'{asal}: {it["kode"]} tanpa keyakinan dari lima label (PEDOMAN B5.26: tiap temuan ditutup '
                                'label keyakinan)')
        nb = math.ceil(len(items) / kolom)
        rh = min(TM['baris_maks_pt'], h / nb)
        y += (h - rh * nb) / 2
        cw = (w - (kolom - 1) * TM['jarak_kolom_pt']) / kolom
        d, g, gk = TM['lingkaran_pt'], self.T['temuan_isi'], self.T['temuan_kode']
        kode_w = max(self.u.lebar([self.R(it['kode'], gk)]) for it in items) + TM['jarak_pt']
        yakin = lambda kyk: self.t['kosakata']['keyakinan'][kyk.split(';')[0].strip()]['label'] + (
            ', ' + kyk.split(';')[1].strip() if ';' in kyk else '')
        pil_w = max(self.lebar_pil([self.R(yakin(it['keyakinan']), self.T['chip'])], C['tinggi_pt']) for it in items)
        for i, it in enumerate(items):
            cx, ry = x + (i // nb) * (cw + TM['jarak_kolom_pt']), y + (i % nb) * rh
            if i % nb:
                kv.garis(cx, ry, cx + cw, ry, TM['warna_pemisah'], 0.5)
            kx = cx + d + TM['jarak_pt']
            tx = kx + kode_w
            tw = cx + cw - pil_w - TM['jarak_pil_pt'] - tx
            m0 = len(self.k.manifest)
            r = self.runs(it['teks'], g, asal)
            lemah = max((URUT_YAKIN.index(m['keyakinan'].split(';')[0].strip()) for m in self.k.manifest[m0:]), default=0)
            if URUT_YAKIN.index(it['keyakinan'].split(';')[0].strip()) < lemah:
                raise DeckGalat(f'{asal}: {it["kode"]} berlabel {it["keyakinan"]}, lebih kuat dari angka terlemahnya '
                                f'({URUT_YAKIN[lemah]}); keyakinan temuan ikut angka terlemah (C6.2)')
            nbar = self.muat(r, tw, TM['maks_baris'], asal, f'{it["kode"]}')
            th = nbar * pt_dari(g) * TM['tinggi_baris']
            iy = ry + (rh - max(d, th)) / 2
            kv.bulat_ikon(cx, iy, d, TM['warna_lingkaran'], it['ikon'], 'kertas', TM['ikon_rasio'])
            kv.teks(kx, iy, kode_w, d, [self.R(it['kode'], gk)], jangkar='m', bungkus=False)
            kv.teks(tx, iy + max(0, (d - th) / 2), tw, th + 2, r)
            self.pil_keyakinan(kv, cx + cw, iy + (d - C['tinggi_pt']) / 2, C['tinggi_pt'], it['keyakinan'])

    def paras_daftar(self, butir, g, asal):
        if len(butir) > 6:
            raise DeckGalat(f'{asal}: daftar {len(butir)} butir > 6 (Buku Pegangan S38: paling banyak 6 butir per daftar)')
        return [[self.R(self.t['font']['butir_1'] + '  ', g, 'teks-3')] + self.runs(b, g, asal) for b in butir]

    def tinggi_daftar(self, paras, g, w):
        return pt_dari(g) * 1.2 * self.u.baris(paras, w) + pt_dari(g) * 0.5 * (len(paras) - 1)

    def daftar(self, kv, x, y, w, h, butir, asal, g=None):
        g = g or self.T['isi_daftar']
        paras = self.paras_daftar(butir, g, asal)
        tinggi = self.tinggi_daftar(paras, g, w)
        if tinggi > h:
            raise DeckGalat(f'{asal}: daftar setinggi {tinggi:.0f} pt tidak muat di {h:.0f} pt; kurangi butir')
        tb = kv.teks(x, y, w, h, paras)
        gantung = E(self.u.lebar([paras[0][0]]))
        for i, p in enumerate(tb.text_frame.paragraphs):  # inden gantung: baris lanjutan sejajar teks, bukan butir
            p._p.get_or_add_pPr().set('marL', str(gantung))
            p._p.get_or_add_pPr().set('indent', str(-gantung))
            if i:
                p.space_before = Pt(pt_dari(g) * 0.5)

    def peringkat(self, kv, x, y, w, h, tb, asal, nomor=True, total=False):
        """Tabel peringkat native (d5 s1): nomor dalam bulatan navy, kolom metrik berpil, baris sorot, baris total navy."""
        TP = self.K['tabel_peringkat']
        kol, rows = tb['kolom'], tb['baris']
        self.visual('tabel')
        n_label = next((i for i, c in enumerate(kol) if c.get('fmt')), len(kol))
        hk, d = TP['kepala_tinggi_pt'], TP['bulatan_pt']
        rh = min(TP['baris_maks_pt'], (h - hk - (TP['total_pt'] + 4 if total else 0)) / len(rows))
        if rh < TP['baris_min_pt']:
            raise DeckGalat(f'{asal}: {len(rows)} baris peringkat tidak muat ({rh:.1f} pt < {TP["baris_min_pt"]} pt)')
        # lebar kolom metrik: pil kepala atau isi terlebar
        lm = []
        for j in range(n_label, len(kol)):
            c = kol[j]
            isi = max(self.u.lebar([self.R(r[j]['teks'], self.T['nilai_tabel'])]) for r in rows) + (TP['segitiga_pt'] + 3 if 'arah' in str(c['fmt']) else 0)
            if c.get('warna'):
                kep = max(self.lebar_pil([self.R(c['kepala'].upper(), self.T['pil_bagian'])], TP['pil_tinggi_pt'], bool(c.get('ikon'))), TP['pil_lebar_min_pt'])
            else:
                kep = self.u.lebar([self.R(c.get('kepala', '').upper(), self.T['kepala_kolom'])])
            lm.append(max(isi, kep) + TP['kolom_jarak_pt'])
        x_label = x + (d + TP['kolom_jarak_pt'] if nomor else 0)
        x_metrik = x + w - sum(lm)
        lebar_label = (x_metrik - x_label) / max(n_label, 1)
        # kepala
        gk = self.T['kepala_kolom']
        for j in range(n_label):
            kv.teks(x_label + j * lebar_label, y, lebar_label, hk, [self.R(kol[j].get('kepala', '').upper(), gk)], jangkar='m', bungkus=False)
        xm = x_metrik
        for j, lw in zip(range(n_label, len(kol)), lm):
            c = kol[j]
            if c.get('warna'):
                self.pil(kv, xm + lw - TP['kolom_jarak_pt'], y + (hk - TP['pil_tinggi_pt']) / 2,
                         [self.R(c['kepala'].upper(), self.T['pil_bagian'], 'kertas')], TP['pil_tinggi_pt'], c['warna'],
                         ikon=c.get('ikon'), warna_ikon='kertas', kanan=True)
            else:
                kv.teks(xm, y, lw - TP['kolom_jarak_pt'], hk, [self.R(c.get('kepala', '').upper(), gk)], rata='r', jangkar='m', bungkus=False)
            xm += lw
        y0 = y + hk
        kv.garis(x, y0, x + w, y0, TP['warna_garis_kepala'], 0.75)
        for i, r in enumerate(rows):
            ry = y0 + i * rh
            label_teks = r[0]['teks']
            if label_teks in tb['sorot']:
                kv.bentuk('kotak', x, ry + 0.5, w, rh - 1, TP['warna_sorot'])
            elif i:
                kv.garis(x, ry, x + w, ry, TP['warna_pemisah'], 0.5)
            if nomor:
                dd = min(d, rh - 3)
                s = kv.bentuk('elips', x, ry + (rh - dd) / 2, dd, dd, TP['warna_nomor'])
                kv.isi_teks(s.text_frame, [[self.R(self.st(str(i + 1)), self.T['nomor_peringkat'])]], 'c', 'm', False)
            for j in range(n_label):
                g = self.T['label_tabel_utama'] if j == 0 else self.T['isi_tabel']
                rr = [self.R(r[j]['teks'], g)]
                self.muat(rr, lebar_label - 4, 1, asal, 'label peringkat')
                kv.teks(x_label + j * lebar_label, ry, lebar_label - 4, rh, rr, jangkar='m', bungkus=False)
            xm = x_metrik
            for j, lw in zip(range(n_label, len(kol)), lm):
                c, sel = kol[j], r[j]
                xr = xm + lw - TP['kolom_jarak_pt']
                if 'arah' in str(c['fmt']) and sel['nilai'] is not None:
                    naik = sel['nilai'] > 0
                    wt = self.arah(sel['nilai'])
                    rr = [self.R(sel['teks'], self.T['nilai_tabel'], wt)]
                    tw = self.u.lebar(rr)
                    kv.teks(xr - tw - 1, ry, tw + 1, rh, rr, rata='r', jangkar='m', bungkus=False)
                    if sel['nilai']:
                        s_ = TP['segitiga_pt']
                        kv.segitiga(xr - tw - 3 - s_, ry + (rh - s_ * 0.8) / 2, s_, naik, wt)
                else:
                    kv.teks(xm, ry, lw - TP['kolom_jarak_pt'], rh, [self.R(sel['teks'], self.T['nilai_tabel'])], rata='r', jangkar='m', bungkus=False)
                xm += lw
        bawah = y0 + len(rows) * rh
        if total:
            ty = bawah + 4
            kv.bentuk('bulat', x, ty, w, TP['total_pt'], TP['warna_total'], radius=3)
            kv.teks(x_label, ty, lebar_label, TP['total_pt'], [self.R('Jumlah', self.T['total_tabel'])], jangkar='m', bungkus=False)
            xm = x_metrik
            for j, lw in zip(range(n_label, len(kol)), lm):
                if 'arah' not in str(kol[j]['fmt']) and 'persen' not in str(kol[j]['fmt']):
                    jml = sum(r[j]['nilai'] or 0 for r in rows)
                    self.turunan(f'jumlah:{kol[j]["nama"]}', fmt_id(jml), jml, asal, tb['keyakinan'], tb['sumber'])
                    kv.teks(xm, ty, lw - TP['kolom_jarak_pt'], TP['total_pt'], [self.R(fmt_id(jml), self.T['total_tabel'])], rata='r', jangkar='m', bungkus=False)
                xm += lw
            bawah = ty + TP['total_pt']
        return bawah

    def grafik_batang(self, kv, x, y, w, h, g, asal):
        """Grafik batang native pola laporan harian: ujung atas membulat, nilai di atas, label dan % perubahan di bawah, tanpa sumbu Y."""
        GB = self.K['grafik_batang']
        self.visual('grafik')
        tb = self.data(g['data'], asal)
        if g['data'].get('seri') == 'kolom':
            r = tb['baris'][0]
            pasang = [(c.get('kepala', c['nama']), sel) for c, sel in zip(tb['kolom'], r)]
        else:
            pasang = [(r[0]['teks'], r[1]) for r in tb['baris']]
        if any(p[1]['nilai'] is None for p in pasang):
            raise DeckGalat(f'{asal}: grafik butuh kolom angka ber-fmt')
        if len(pasang) > GB['maks_batang']:
            raise DeckGalat(f'{asal}: {len(pasang)} batang > {GB["maks_batang"]} (G1); ringkas per periode')
        kel = GB['keluarga'][g.get('keluarga', 'netral')]
        vals = [p[1]['nilai'] for p in pasang]
        # kepala: nama metrik kiri, perubahan neto kanan (segitiga vektor + kata)
        jr = self.runs(g['judul'], self.T['judul_grafik'], asal)
        kv.teks(x, y, w * 0.6, GB['kepala_tinggi_pt'], jr, jangkar='m', bungkus=False)
        if vals[0]:
            ubah = (vals[-1] - vals[0]) / vals[0] * 100
            naik = ubah > 0
            wt = self.arah(ubah)
            teks = ('naik ' if naik else 'turun ') + fmt_id(abs(ubah), 1) + '%'
            self.turunan('ubah', teks, ubah, asal, tb['keyakinan'], tb['sumber'])
            rr = [self.R(teks, self.T['ubah_grafik'], wt)]
            tw = self.u.lebar(rr)
            kv.teks(x + w - tw - 1, y, tw + 1, GB['kepala_tinggi_pt'], rr, rata='r', jangkar='m', bungkus=False)
            s_ = GB['segitiga_kepala_pt']
            kv.segitiga(x + w - tw - 4 - s_, y + (GB['kepala_tinggi_pt'] - s_ * 0.8) / 2, s_, naik, wt)
        dasar = y + h - GB['bawah_pt']
        atas = y + GB['kepala_tinggi_pt'] + GB['nilai_tinggi_pt'] + 2
        slot = w / len(pasang)
        bw = slot * GB['lebar_rasio']
        vmax = max(vals) or 1
        n = len(pasang)
        for i, (lab, sel) in enumerate(pasang):
            bx = x + i * slot + (slot - bw) / 2
            bh = max((dasar - atas) * sel['nilai'] / vmax, 0.5)
            wb = (kel['warna_pekat'] if g.get('seragam')  # satu warna: tanpa sandi warna yang perlu legenda (ANTI-SLOP 5.8)
                  else GB['warna_pembanding'] if i == 0 and g.get('pembanding', True)
                  else kel['warna_pekat'] if i >= n - GB['pekat_terakhir'] else kel['warna_lama'])
            kv.bentuk('atas', bx, dasar - bh, bw, bh, wb, radius=bw * GB['radius_rasio'])
            kv.teks(x + i * slot, dasar - bh - GB['nilai_tinggi_pt'] - 1, slot, GB['nilai_tinggi_pt'],
                    [self.R(sel['teks'], self.T['nilai_batang'])], rata='c', jangkar='b', bungkus=False)
            kv.teks(x + i * slot, dasar + 2, slot, GB['label_tinggi_pt'], [self.R(lab, self.T['tanggal_batang'])], rata='c', jangkar='t', bungkus=False)
            if i and vals[i - 1]:
                p = (vals[i] - vals[i - 1]) / vals[i - 1] * 100
                naik = p > 0
                wt = self.arah(round(p, 1))
                teks = self.kata_arah(round(p, 1)) + fmt_id(abs(p), 1) + '%'
                self.turunan(f'persen:{lab}', teks, p, asal, tb['keyakinan'], tb['sumber'])
                rr = [self.R(teks, self.T['persen_batang'], wt)]
                tw, s_ = self.u.lebar(rr), GB['segitiga_pt']
                lx = x + i * slot + (slot - tw - s_ - 2) / 2
                py = dasar + 2 + GB['label_tinggi_pt']
                if round(p, 1):
                    kv.segitiga(lx, py + (GB['persen_tinggi_pt'] - s_ * 0.8) / 2, s_, naik, wt)
                kv.teks(lx + s_ + 2, py, tw + 2, GB['persen_tinggi_pt'], rr, jangkar='m', bungkus=False)
        kv.garis(x, dasar, x + w, dasar, GB['warna_garis_dasar'], 0.75)
        return tb

    def legenda(self, kv, cx, y, items, judul=None):
        """Legenda satu baris rata tengah: kotak warna + label; items [(token, label)]."""
        LG = self.K['legenda']
        g = self.T['legenda']
        runs = [[self.R(lab, g)] for _, lab in items]
        lj = [self.R(judul, g, tebal=True)] if judul else None
        lebar = sum(LG['kotak_pt'] + LG['jarak_kotak_pt'] + self.u.lebar(r) for r in runs) + LG['jarak_item_pt'] * (len(items) - 1)
        lebar += (self.u.lebar(lj) + LG['jarak_item_pt']) if lj else 0
        x = x0 = cx - lebar / 2
        if lj:
            jw = self.u.lebar(lj)
            kv.teks(x, y, jw + 2, LG['tinggi_pt'], lj, jangkar='m', bungkus=False)
            x += jw + LG['jarak_item_pt']
        for (tok, _), r in zip(items, runs):
            kv.bentuk('kotak', x, y + (LG['tinggi_pt'] - LG['kotak_pt']) / 2, LG['kotak_pt'], LG['kotak_pt'], tok, LG['warna_garis_kotak'], 0.5)
            x += LG['kotak_pt'] + LG['jarak_kotak_pt']
            tw = self.u.lebar(r)
            kv.teks(x, y, tw + 2, LG['tinggi_pt'], r, jangkar='m', bungkus=False)
            x += tw + LG['jarak_item_pt']
        return x0, x0 + lebar

    def item_legenda(self, lg):
        """Spek legenda -> [(token, label)]; {"irbi": [label]} dibaca dari tema.json warna.skala.irbi (T8)."""
        if isinstance(lg, dict) and 'irbi' in lg:
            ir = self.t['warna']['skala']['irbi']
            out = []
            for lab in lg['irbi']:
                if lab not in ir['label']:
                    raise DeckGalat(f'kelas IRBI "{lab}" tidak ada di tema.json skala.irbi.label')
                out.append((f'skala.{ir["ramp"]}.{ir["kelas"][ir["label"].index(lab)]}', lab))
            return out, lg.get('judul', ir['legenda'])
        return [(i['warna'], i['label']) for i in lg['item']], lg.get('judul')

    def peta(self, kv, x, y, w, h, pt, asal):
        """PNG peta dasar + legenda, unsur peta resmi, dan pil keyakinan di kaki; label pulau native tanpa tumpuk (B5.9, D-8)."""
        PT = self.K['peta']
        self.visual('peta')
        p = self.akar / pt['png']
        if not p.exists():
            raise DeckGalat(f'{asal}: PNG peta {pt["png"]} tidak ada')
        mp = p.with_suffix('.json')  # manifest perender: unsur peta resmi dan hash masukan
        if not mp.exists():
            raise DeckGalat(f'{asal}: manifest perender {mp.name} tidak ada; perender wajib menulis unsur peta (PEDOMAN B5.9, D-8)')
        mr = json.loads(mp.read_text(encoding='utf-8'))
        basi = [b for b, hs in mr.get('masukan', {}).items() if not (REPO / b).exists() or sha(REPO / b) != hs]
        if basi:
            raise DeckGalat(f'{asal}: peta {p.name} basi, masukan berubah sesudah dirender: {basi[:3]}; render ulang perendernya')
        un = mr.get('unsur_peta') or {}
        if not (un.get('sumber_batas') and un.get('sistem_referensi')):
            raise DeckGalat(f'{asal}: manifest {mp.name} tanpa sumber batas atau sistem referensi (PEDOMAN B5.9)')
        self.masukan |= {p, mp}
        pix = pymupdf.Pixmap(str(p))
        ekor = PT['legenda_tinggi_pt'] + PT['jarak_legenda_pt'] + PT['unsur_tinggi_pt']
        skala = min(w / pix.width, (h - ekor) / pix.height)
        mw, mh = pix.width * skala, pix.height * skala
        mx, my = x + (w - mw) / 2, y + (h - mh - ekor) / 2  # peta + kaki di bawahnya, satu blok di tengah
        kv.gambar(p, mx, my, mw, mh, 'peta')
        if pt['legenda'].get('dari_manifest'):  # kelas nilai: label rentang ditulis perender dari data ke manifest
            if not mr.get('legenda'):
                raise DeckGalat(f'{asal}: legenda dari_manifest tetapi manifest {mp.name} tanpa legenda')
            items, judul = [], pt['legenda'].get('judul')
            for n, i in enumerate(mr['legenda']):  # rentang kelas = angka turunan dari data peta, dicatat di manifest angka (D-22)
                if re.search(r'\d', i['label']):
                    self.turunan(f'legenda:{p.stem}:{n}', i['label'], None, asal, pt['keyakinan'], pt['sumber'])
                items.append((i['warna'], i['label']))
        else:
            items, judul = self.item_legenda(pt['legenda'])
        ly = my + mh + PT['jarak_legenda_pt']
        lx0, lx1 = self.legenda(kv, x + w / 2, ly, items, judul)
        C = self.K['chip']
        pw = self.pil_keyakinan(kv, x + w, ly + (PT['legenda_tinggi_pt'] - C['tinggi_pt']) / 2, C['tinggi_pt'], pt['keyakinan'])
        if lx1 > x + w - pw - self.K['legenda']['jarak_item_pt']:
            raise DeckGalat(f'{asal}: legenda peta menabrak pil keyakinan; pendekkan label legenda')
        unsur = '; '.join(v for v in (un['sumber_batas'], un['sistem_referensi'], un.get('proyeksi'), un.get('catatan')) if v)
        ru = [self.R(self.st('Sumber batas: ' + unsur), self.T['catatan_kaki'])]
        self.cek_teks(ru[0][0], asal)
        self.muat(ru, w, 1, asal, 'baris unsur peta')
        kv.teks(x, ly + PT['legenda_tinggi_pt'], w, PT['unsur_tinggi_pt'], ru, rata='c', jangkar='m', bungkus=False)
        kotak = []
        for pn in pt.get('penanda', []):  # label native: pil putih bergaris abu, posisi pecahan lebar/tinggi PNG
            px, py = mx + pn['x'] * mw, my + pn['y'] * mh
            r = [self.R(t_[0], self.T['label_peta']) for t_ in self.urai(pn['teks'], asal)]
            hp = PT['penanda_tinggi_pt']
            lw = self.u.lebar(r) + hp
            k = (px - lw / 2, py - hp / 2, px + lw / 2, py + hp / 2)
            if k[0] < mx or k[1] < my or k[2] > mx + mw or k[3] > my + mh:
                raise DeckGalat(f'{asal}: label peta "{pn["teks"]}" keluar dari batas peta (D-8)')
            g = PT['label_jarak_min_pt']
            for lain, kl in kotak:
                if k[0] < kl[2] + g and kl[0] < k[2] + g and k[1] < kl[3] + g and kl[1] < k[3] + g:
                    raise DeckGalat(f'{asal}: label peta "{pn["teks"]}" tumpang dengan "{lain}" (D-8)')
            darat = self.darat(pix, [(v - o) / skala for v, o in zip(k, (mx, my, mx, my))])
            if darat > PT['label_darat_maks']:
                raise DeckGalat(f'{asal}: label peta "{pn["teks"]}" menutup {darat:.0%} daratan berdata '
                                f'(batas {PT["label_darat_maks"]:.0%}); geser ke laut (D-8)')
            kotak.append((pn['teks'], k))
            self.pil(kv, k[0], k[1], r, hp, 'kertas', PT['warna_garis_penanda'], w=lw)
        self.hal['peta'] = {'legenda': bool(items), 'unsur_peta': un, 'resmi': not un.get('catatan'),
                            'batas': [mx, my, mx + mw, my + mh], 'label': [{'teks': t_, 'kotak': k} for t_, k in kotak],
                            'ukuran_label_pt': pt_dari(self.T['label_peta'])}
        return {'keyakinan': pt['keyakinan'], 'sumber': pt['sumber']}

    @staticmethod
    def darat(pix, kotak):
        """Pecahan piksel tak transparan (daratan berdata) di kotak PNG (x0, y0, x1, y1 dalam piksel)."""
        x0, y0, x1, y1 = (max(0, int(v)) for v in kotak)
        x1, y1 = min(x1, pix.width), min(y1, pix.height)
        n, isi = pix.n, 0
        for yy in range(y0, y1):
            baris = pix.samples_mv[(yy * pix.width + x0) * n:(yy * pix.width + x1) * n]
            isi += sum(1 for i in range(n - 1, len(baris), n) if baris[i] > 32)
        return isi / max((x1 - x0) * (y1 - y0), 1)

    # ------------------------------------------------------------------ bingkai
    def pas_judul(self, segs_fn, w, g, asal, maks=None):
        lo, hi = g['ukuran_pt']
        langkah = self.K['bingkai']['langkah_judul_pt']
        maks = maks or g['maks_baris']
        u = hi
        while u >= lo - 1e-9:
            runs = segs_fn(u)
            n = self.u.baris([runs], w)
            if n <= maks:
                self.catatan.append((asal, 'judul_baris', n))
                return runs, u
            u -= langkah
        raise DeckGalat(f'{asal}: judul lebih dari {maks} baris pada {lo} pt; pendekkan judul (Buku Pegangan: paling banyak dua baris)')

    def seimbang_runs(self, runs, w):
        """Judul dua baris: pindahkan patah baris ke titik yang membuat kedua baris paling seimbang (tanpa yatim)."""
        kata, cur = [], []
        for r in runs:
            for bag in re.split(r'( )', r[0]):
                if bag == ' ':
                    kata.append(cur)
                    cur = []
                elif bag:
                    cur.append((bag,) + tuple(r[1:]))
        kata.append(cur)
        kata = [k for k in kata if k]

        def gabung(ks):
            out = []
            for i, k in enumerate(ks):
                for c in ([(' ',) + tuple(k[0][1:])] if i else []) + k:
                    if out and out[-1][1:] == c[1:]:
                        out[-1] = (out[-1][0] + c[0],) + tuple(c[1:])
                    else:
                        out.append(c)
            return out
        calon = []
        for i in range(1, len(kata)):
            a, b = gabung(kata[:i]), gabung(kata[i:])
            la, lb = self.u.lebar(a), self.u.lebar(b)
            if max(la, lb) <= w * 0.98:
                calon.append((max(la, lb), a, b))
        if not calon:
            return runs
        _, a, b = min(calon, key=lambda c: c[0])
        return a + [('\n',) + tuple(a[-1][1:])] + b

    def footer(self, kv, nomor, gelap=False):
        F, B = self.S['footer'], self.K['bingkai']
        g = self.T['footer_gelap'] if gelap else self.T['footer']
        gn = dict(self.T['nomor_halaman'], warna=g['warna'])
        kv.teks(self.X0, F['y_pt'], B['footer_lebar_pt'], B['footer_tinggi_pt'], [self.R(F['teks'], g)], bungkus=False)
        kv.teks(self.X1 - B['nomor_lebar_pt'], F['y_pt'], B['nomor_lebar_pt'], B['footer_tinggi_pt'],
                [self.R(self.st(str(nomor)), gn)], rata='r', bungkus=False)

    def bingkai(self, kv, j):
        sp, asal = j['spek'], j['asal']
        jk, B, g = self.S['judul_kotak'], self.K['bingkai'], self.T['judul_temuan']
        cut = sp.get('cut_off')
        cut = self.spek.get('cut_off') if cut is True else cut
        w = jk['lebar_dengan_pil_pt'] if cut else jk['lebar_pt']
        h = jk['tinggi_pt'][0] if sp.get('subjudul') else jk['tinggi_pt'][1]
        judul, akhir = j.get('judul') or sp['judul'], j.get('judul_akhir', '')  # akhir dibangkitkan mesin ("(lanjutan 2/3)")
        if akhir:
            self.st(akhir)
        m0 = len(self.k.manifest)
        runs, _ = self.pas_judul(lambda u: self.runs(judul, g, asal, 'judul', ukuran=u, tebal=True)
                                 + ([self.R(akhir, g, ukuran=u, tebal=True)] if akhir else []), w, g, asal)
        m1 = len(self.k.manifest)
        del self.k.manifest[m0:m1 - len(re.findall(r'\{\{angka:', judul))]  # pas_judul mencoba beberapa ukuran; angka judul dicatat sekali
        if self.catatan[-1][2] == 2:
            runs = self.seimbang_runs(runs, w)
        kv.teks(jk['x_pt'], jk['y_pt'], w, h, runs, jangkar='b', spasi=B['spasi_baris_judul'])
        self.hal['judul'] = [jk['x_pt'], jk['y_pt'], w, h, g['maks_baris']]  # D-17 diukur dari PDF di kotak ini
        if sp.get('subjudul'):
            r = self.runs(sp['subjudul'], self.T['subjudul'], asal)
            sw = B['subjudul_maks_x_pt'] - jk['x_pt']
            self.muat(r, sw, 1, asal, 'subjudul')
            kv.teks(jk['x_pt'], jk['y_pt'] + h + B['subjudul_jarak_pt'], sw, B['subjudul_tinggi_pt'], r, jangkar='m', bungkus=False)
        if cut:
            C = self.K['cut_off']
            self.cek_teks(cut, asal)
            runs = [self.R(C['label'], self.T['cut_off_label']), self.R('   ' + self.st(cut), self.T['cut_off_nilai'])]
            lebar = min(max(self.u.lebar(runs) + 2 * C['pad_pt'], C['lebar_pt'][0]), C['lebar_pt'][1])
            self.pil(kv, C['x_pt'], C['y_pt'], runs, C['tinggi_pt'][1], C['warna_isi'], w=lebar)
            if self.spek.get('pil_draf'):  # deck draf: pil kedua berpola CUT OFF tepat di atas pil batas data, lebar minimum supaya tidak menyentuh logo
                lab, _, nilai = self.spek['pil_draf'].partition('|')
                self.cek_teks(lab + nilai, asal)
                rd = [self.R(lab, self.T['cut_off_label']), self.R('   ' + self.st(nilai), self.T['cut_off_nilai'])]
                h = C['tinggi_pt'][1]
                self.muat([rd], C['lebar_pt'][0] - 2 * C['pad_pt'], 1, asal, 'pil draf')
                self.pil(kv, C['x_pt'], C['y_pt'] - h - 4, rd, h, C['warna_isi'], w=C['lebar_pt'][0])
        gs = self.S['garis']
        for gy in gs['y_pt']:
            kv.garis(self.X0, gy, self.X1, gy, gs['warna'], gs['tebal_pt'])
        lg = self.S['logo']
        kv.gambar(self.logo, lg['x_pt'], lg['y_pt'], lg['lebar_pt'], lg['tinggi_pt'])
        self.footer(kv, j['nomor'])

    def catatan_sumber(self, kv, j, tambahan=(), keyakinan=None):
        """Baris "Sumber:" 7,5 pt dengan bilah biru, disusun dari manifest angka slide ini (tiap angka bersumber).
        keyakinan: pil label keyakinan rata kanan di baris yang sama (tabel lampiran tanpa panel berpil, D-14, S15)."""
        sp = j['spek']
        if sp.get('sumber') is False:
            return
        if sp.get('sumber'):
            teks = sp['sumber']
        else:
            urut = []
            for m in self.k.manifest:
                if m.get('naskah') == j['asal'] and m['sumber'] not in urut:
                    urut.append(m['sumber'])
            for s in tambahan:
                if s and s not in urut:
                    urut.append(s)
            if not urut:
                return
            teks = ringkas_sumber(urut, self.K['bingkai']['sumber']['awalan_olah'], self.K['bingkai']['sumber']['label_olah'])
        self.cek_teks(teks, j['asal'])
        S_ = self.K['bingkai']['sumber']
        C = self.K['catatan_kaki']
        r = [self.R('Sumber: ' + self.st(teks), self.T['catatan_kaki'])]  # metadata asal, bukan angka data
        kanan = self.X1
        if keyakinan:
            ch = self.K['chip']['tinggi_pt']
            kanan -= self.pil_keyakinan(kv, self.X1, S_['y_pt'] + (S_['tinggi_pt'] - ch) / 2, ch, keyakinan) + self.K['chip']['jarak_pt']
        self.muat(r, kanan - S_['teks_x_pt'], 1, j['asal'], 'baris sumber (tulis "sumber" pendek di spek)')
        kv.bentuk('kotak', self.X0, S_['bilah_y_pt'], C['bilah_pt'][0], S_['bilah_tinggi_pt'], C['warna_bilah'])
        kv.teks(S_['teks_x_pt'], S_['y_pt'], kanan - S_['teks_x_pt'], S_['tinggi_pt'], r, jangkar='m', bungkus=False)

    def logo_bulat(self, kv, L):
        d = L['d_pt']
        kv.bentuk('elips', L['x_pt'], L['y_pt'], d, d, self.K['logo_bulat']['warna_isi'])
        lh = d * self.K['logo_bulat']['rasio_logo']
        pix = pymupdf.Pixmap(str(self.logo))
        lw = lh * pix.width / pix.height
        kv.gambar(self.logo, L['x_pt'] + (d - lw) / 2, L['y_pt'] + (d - lh) / 2, lw, lh)

    def foto(self, berkas, w_pt, h_pt, alpha, nama):
        """Foto Commons dipotong ke rasio bidang, lalu diberi gradasi alfa kiri ke kanan (pudar ke latar slide)."""
        src = (self.akar / berkas).resolve()
        if not src.exists():
            raise DeckGalat(f'foto {berkas} tidak ada')
        self.masukan.add(src)
        dok = pymupdf.open(str(src))
        r = dok[0].rect
        rasio = w_pt / h_pt
        if r.width / r.height > rasio:
            cw = r.height * rasio
            klip = pymupdf.Rect(r.x0 + (r.width - cw) / 2, r.y0, r.x0 + (r.width + cw) / 2, r.y1)
        else:
            ch = r.width / rasio
            klip = pymupdf.Rect(r.x0, r.y0 + (r.height - ch) / 2, r.x1, r.y0 + (r.height + ch) / 2)
        px_w = w_pt * self.K['foto']['skala_px_per_pt']
        pix = dok[0].get_pixmap(matrix=pymupdf.Matrix(px_w / klip.width, px_w / klip.width), clip=klip, alpha=False)
        pix = pymupdf.Pixmap(pix, 1)
        a0, a1, ujung = alpha
        baris = bytes(int(255 * (a0 + (a1 - a0) * min(1.0, i / max(pix.width * ujung, 1)))) for i in range(pix.width))
        pix.set_alpha(baris * pix.height)
        out = self.keluaran / 'foto' / f'{nama}-{src.stem}.png'
        out.parent.mkdir(parents=True, exist_ok=True)
        pix.save(out)
        return out

    def kredit(self, berkas, sp):
        if sp.get('kredit'):
            return sp['kredit']
        nama = Path(berkas).name
        for f in self.t.get('docx', {}).get('sampul_foto', {}).values():  # foto sampul DOCX dipakai ulang (satu set gambar, A5)
            if Path(f['berkas']).name == nama:
                return f'Foto: {f["pengarang"]}, {f["lisensi"]}, Wikimedia Commons'
        kred = json.loads((self.akar / '../../public/img/kredit.json').read_text(encoding='utf-8'))
        for k in kred:
            if k['file'] == nama:
                if any(x in k['lisensi'] for x in ('NC', 'ND')):
                    raise DeckGalat(f'foto {nama}: lisensi {k["lisensi"]} tidak bebas (K5)')
                return f'Foto: {k["penulis"]}, {k["lisensi"]}, Wikimedia Commons'
        raise DeckGalat(f'foto {nama}: tanpa atribusi; isi "kredit" di spek atau daftarkan di public/img/kredit.json')

    def tanggal_panjang(self):
        return f'{HARI[self.tgl.weekday()]}, {self.tgl.day} {BULAN[self.tgl.month - 1]} {self.tgl.year}'

    # ------------------------------------------------------------------ jenis slide
    def s_sampul(self, kv, j):
        sp, SM = j['spek'], self.K['sampul']
        gelap = self.gelap(j)
        Wn = SM['gelap' if gelap else 'putih']
        if sp.get('foto'):
            fx = SM['foto_x_pt']
            p = self.foto(sp['foto'], self.S['lebar_pt'] - fx, self.S['tinggi_pt'], SM['foto_alfa'], 'sampul')
            kv.gambar(p, fx, 0, self.S['lebar_pt'] - fx, self.S['tinggi_pt'], 'foto')
            KR = SM['kredit']
            kv.teks(KR['x_pt'], KR['y_pt'], KR['lebar_pt'], KR['tinggi_pt'], [self.R(self.st(self.kredit(sp['foto'], sp)), self.T['kredit_foto'])], rata='r', bungkus=False)
        self.logo_bulat(kv, SM['logo'])
        x, w = SM['teks_x_pt'], SM['teks_lebar_pt']
        g = dict(self.T['judul_sampul'], warna=Wn['warna_judul'])
        baris = self.seimbang(self.kaj['judul'], g, w, g['maks_baris'], j['asal'])
        self.catatan.append((j['asal'], 'judul_baris', len(baris)))
        kv.teks(x, SM['judul_y_pt'], w, SM['judul_tinggi_pt'], [[self.R(b, g)] for b in baris], jangkar='b', spasi=SM['spasi_baris_judul'])
        self.hal['judul'] = [x, SM['judul_y_pt'], w, SM['judul_tinggi_pt'], g['maks_baris']]
        y = SM['judul_y_pt'] + SM['judul_tinggi_pt'] + SM['jarak_pt']['subjudul']
        tumpuk = [('subjudul_sampul', sp.get('subjudul', self.kaj['subjudul']), 'warna_subjudul', 'lembaga'),
                  ('lembaga_sampul', self.t['kajian']['penerbit'], 'warna_lembaga', 'kepada')]
        if sp.get('kepada'):
            tumpuk.append(('kepada_sampul', sp['kepada'], 'warna_kepada', 'garis'))
        for gaya, teks, wk, berikut in tumpuk:
            gg = dict(self.T[gaya], warna=Wn[wk])
            r = [self.R(self.st(teks), gg)] if gaya == 'subjudul_sampul' and sp.get('subjudul') else self.runs(teks, gg, j['asal'])  # subjudul spek: baris tanggal paparan (struktur)
            nb = self.muat(r, w, 2, j['asal'], gaya)
            hh = pt_dari(gg) * 1.25 * nb
            kv.teks(x, y, w, hh, r)
            y += hh + SM['jarak_pt'][berikut]
        kv.garis(x, y, x + SM['garis_lebar_pt'], y, Wn['warna_garis'], 0.75)
        TG = SM['tanggal']
        g = dict(self.T['tanggal_sampul'], warna=Wn['warna_tanggal_teks'])
        self.pil(kv, x, TG['y_pt'], [self.R(self.st(self.tanggal_panjang()), g)], TG['tinggi_pt'], Wn['warna_tanggal_isi'], w=TG['lebar_pt'])

    def s_penutup(self, kv, j):
        sp, PN = j['spek'], self.K['penutup']
        if sp.get('foto'):
            p = self.foto(sp['foto'], self.S['lebar_pt'], self.S['tinggi_pt'], PN['foto_alfa'], 'penutup')
            kv.gambar(p, 0, 0, self.S['lebar_pt'], self.S['tinggi_pt'], 'foto')
            KR = self.K['sampul']['kredit']
            kv.teks(KR['x_pt'], KR['y_pt'], KR['lebar_pt'], KR['tinggi_pt'], [self.R(self.st(self.kredit(sp['foto'], sp)), self.T['kredit_foto'])], rata='r', bungkus=False)
        self.logo_bulat(kv, PN['logo'])
        x, w = self.X0, PN['teks_lebar_pt']
        kv.teks(x, PN['judul_y_pt'], w, PN['judul_tinggi_pt'], [self.R(sp.get('teks', 'Terima kasih'), self.T['terima_kasih'])], jangkar='b', bungkus=False)
        G = PN['garis']
        kv.bentuk('kotak', x, G['y_pt'] - G['tebal_pt'] / 2, G['lebar_pt'], G['tebal_pt'], G['warna'])
        kv.teks(x, PN['lembaga_y_pt'], w, PN['lembaga_tinggi_pt'], [self.R(self.t['kajian']['penerbit'], self.T['lembaga_penutup'])], jangkar='m', bungkus=False)
        laporan = self.st(f'{self.kaj["judul"]}, {self.tanggal_panjang()}')
        r = [self.R(laporan, self.T['laporan_penutup'])]
        self.muat(r, w, 1, j['asal'], 'baris laporan penutup')
        kv.teks(x, PN['laporan_y_pt'], w, PN['laporan_tinggi_pt'], r, jangkar='m', bungkus=False)

    def s_pembatas_lampiran(self, kv, j):
        sp, PB = j['spek'], self.K['pembatas']
        self.logo_bulat(kv, PB['logo'])
        kv.teks(self.X0, PB['judul_y_pt'], 600, PB['judul_tinggi_pt'], [self.R(sp.get('teks', 'Lampiran'), self.T['judul_pembatas'])], jangkar='b', bungkus=False)
        if sp.get('subjudul'):
            r = self.runs(sp['subjudul'], self.T['subjudul_pembatas'], j['asal'])
            kv.teks(self.X0, PB['subjudul_y_pt'], 720, PB['subjudul_tinggi_pt'], r, jangkar='m', bungkus=False)
        kv.garis(self.X0, PB['garis_y_pt'], self.X1, PB['garis_y_pt'], PB['warna_garis'], 0.75)
        kel = {}
        for lj in j['lampiran']:
            kel.setdefault(lj['kode'][0], []).append(lj)
        if len(kel) > len(PB['kolom_x_pt']):
            raise DeckGalat(f'{j["asal"]}: {len(kel)} kelompok lampiran > {len(PB["kolom_x_pt"])} kolom pembatas')
        gb = self.T['butir_pembatas']
        for (huruf, isi), kx in zip(kel.items(), PB['kolom_x_pt']):
            judul = sp.get('kelompok', {}).get(huruf)
            if not judul:
                raise DeckGalat(f'{j["asal"]}: kelompok lampiran {huruf} tanpa judul di "kelompok"')
            kv.teks(kx, PB['kelompok_y_pt'], PB['kolom_lebar_pt'], PB['kelompok_tinggi_pt'],
                    self.runs(f'{huruf}, {judul}', self.T['kelompok_pembatas'], j['asal']), jangkar='m', bungkus=False)
            for i, lj in enumerate(isi):
                hal = self.st(str(lj['halaman'][0]) if len(lj['halaman']) == 1 else f'{lj["halaman"][0]}–{lj["halaman"][-1]}')
                r = ([self.R(lj['kode'], gb, gb['warna_kode'], True), self.R('   ', gb)] + self.runs(lj['judul_daftar'], gb, j['asal'])
                     + [self.R('   ' + hal, gb, gb['warna_halaman'])])
                self.muat(r, PB['kolom_lebar_pt'], 1, j['asal'], 'butir pembatas')
                kv.teks(kx, PB['kelompok_y_pt'] + PB['kelompok_tinggi_pt'] + i * PB['baris_pt'], PB['kolom_lebar_pt'], PB['baris_pt'], r, jangkar='m', bungkus=False)
        self.footer(kv, j['nomor'], gelap=True)

    def s_temuan(self, kv, j):
        """kartu-angka, temuan-grafik, temuan-peta, tabel-peringkat: [grup kartu] + utama [+ panel samping] + [pita bawah]."""
        sp, asal = j['spek'], j['asal']
        jarak = self.K['bingkai']['jarak_blok_pt']
        y = self.S['area_isi_y_pt'][0]
        if sp.get('grup'):
            y = self.grup_kartu(kv, sp['grup'], y, asal) + jarak
        bawah = self.bawah(sp.get('sumber') is not False)
        if sp.get('pita'):
            h = self.K['pita_bawah']['tinggi_baku_pt']
            self.pita(kv, self.X0, bawah - h, self.W, sp['pita'], asal)
            bawah -= h + jarak
        samping = sp.get('panel')
        uw = self.W * sp.get('rasio', self.K['bingkai']['rasio_utama']) if samping else self.W
        tambah = []
        jenis = j['jenis']
        if jenis == 'temuan-peta':
            tambah.append(self.peta(kv, self.X0, y, uw - jarak, bawah - y, sp['peta'], asal)['sumber'])
        elif jenis == 'kartu-angka':
            if sp.get('temuan'):  # halaman Pesan Kunci (B5.26): kalimat tesis navy, lalu temuan bernomor
                if not sp.get('tesis'):
                    raise DeckGalat(f'{asal}: halaman Pesan Kunci tanpa "tesis" (PEDOMAN B5.26: kalimat tesis 12 pt navy)')
                TM = self.K['temuan']
                bx, by, bw, bh = self.panel(kv, self.X0, y, uw, bawah - y, sp.get('judul_panel', 'Pesan kunci'), 'ringkasan', asal=asal)
                rt = self.runs(sp['tesis'], self.T['tesis'], asal)
                th = self.muat(rt, bw, TM['tesis_maks_baris'], asal, 'tesis') * pt_dari(self.T['tesis']) * TM['tinggi_baris']
                kv.teks(bx, by, bw, th, rt)
                kv.garis(bx, by + th + TM['tesis_jarak_pt'] / 2, bx + bw, by + th + TM['tesis_jarak_pt'] / 2, TM['warna_pemisah'], 0.5)
                self.daftar_temuan(kv, bx, by + th + TM['tesis_jarak_pt'], bw, bh - th - TM['tesis_jarak_pt'], sp['temuan'], asal,
                                   kolom=sp.get('kolom', 2))
        else:
            utama = sp['grafik'] if jenis == 'temuan-grafik' else sp['tabel']
            kyk = utama['data']['keyakinan']
            bx = self.panel(kv, self.X0, y, uw, bawah - y, utama['judul_panel'], utama.get('ikon', 'data'),
                            utama.get('nada', 'netral'), utama.get('hitungan'), kyk, asal)
            if jenis == 'temuan-grafik':
                tb = self.grafik_batang(kv, *bx, utama, asal)
            else:
                tb = self.data(utama['data'], asal)
                self.peringkat(kv, *bx, tb, asal, utama.get('peringkat', True), utama.get('total', False))
            tambah.append(tb['sumber'])
        if samping:
            sx = self.X0 + uw + (0 if jenis == 'temuan-peta' else jarak)
            tambah += self.panel_isi(kv, sx, y, self.X1 - sx, bawah - y, samping, asal)
        self.catatan_sumber(kv, j, tambah)

    def panel_isi(self, kv, x, y, w, h, p, asal):
        kyk = p.get('data', {}).get('keyakinan') or p.get('keyakinan')
        bx, by, bw, bh = self.panel(kv, x, y, w, h, p['judul'], p.get('ikon', 'ringkasan'), p.get('nada', 'netral'), p.get('hitungan'), kyk, asal)
        sumber = []
        if 'data' in p:
            tb = self.data(p['data'], asal)
            tinggi = bh
            if 'daftar' in p:  # tabel di atas, butir catatan di bawahnya dalam panel yang sama (satu topik satu kontainer)
                g = self.T['isi_daftar']
                tinggi = bh - self.tinggi_daftar(self.paras_daftar(p['daftar'], g, asal), g, bw) - self.K['panel']['pad_pt'] * 2
            akhir = self.peringkat(kv, bx, by, bw, tinggi, tb, asal, p.get('peringkat', True), p.get('total', False))
            bh -= akhir - by + self.K['panel']['pad_pt']
            by = akhir + self.K['panel']['pad_pt']
            sumber.append(tb['sumber'])
        if 'temuan' in p:
            self.daftar_temuan(kv, bx, by, bw, bh, p['temuan'], asal, kolom=1)
        if 'daftar' in p:  # panel yang hanya berisi butir memakai huruf panel yang lebih besar
            self.daftar(kv, bx, by, bw, bh, p['daftar'], asal, None if 'data' in p else self.T['isi_panel'])
        return sumber

    def s_kesimpulan(self, kv, j):
        sp, asal, KS = j['spek'], j['asal'], self.K['kesimpulan']
        kartu = sp['kartu']
        if len(kartu) != KS['kolom'] * KS['baris']:
            raise DeckGalat(f'{asal}: kesimpulan butuh {KS["kolom"] * KS["baris"]} kartu (Buku Pegangan: grid 4 x 2), ada {len(kartu)}')
        jr = KS['jarak_pt']
        cw = (self.W - (KS['kolom'] - 1) * jr) / KS['kolom']
        pad, d = KS['pad_pt'], KS['lingkaran_pt']
        for i, k in enumerate(kartu):
            x = self.X0 + (i % KS['kolom']) * (cw + jr)
            y = KS['y_pt'] + (i // KS['kolom']) * (KS['tinggi_pt'] + jr)
            wt = k.get('warna', 'navy')
            self.cek_kelas(k['label'] + ' ' + k['judul'], wt, asal)
            kv.bentuk('bulat', x, y, cw, KS['tinggi_pt'], 'kertas', self.K['kartu']['warna_garis'], radius=KS['radius_pt'])
            kv.bulat_ikon(x + pad, y + pad, d, self.tint(wt), k['ikon'], wt, KS['ikon_rasio'])
            kv.teks(x + cw - pad - KS['nomor_lebar_pt'], y + pad, KS['nomor_lebar_pt'], d * 0.7,
                    [self.R(self.st(f'{i + 1:02d}'), self.T['nomor_kartu_kesimpulan'])], rata='r', bungkus=False)
            tw = cw - 2 * pad
            kv.teks(x + pad, y + KS['label_dy_pt'], tw, KS['label_tinggi_pt'], [self.R(k['label'].upper(), self.T['label_kartu_kesimpulan'], wt)], jangkar='m', bungkus=False)
            r = self.runs(k['judul'], self.T['judul_kartu_kesimpulan'], asal)
            self.muat(r, tw, 2, asal, f'judul kartu {i + 1}')
            kv.teks(x + pad, y + KS['judul_dy_pt'], tw, KS['judul_tinggi_pt'], r)
            r = self.runs(k['isi'], self.T['isi_kartu_kesimpulan'], asal)
            self.muat(r, tw, KS['isi_maks_baris'], asal, f'isi kartu {i + 1}')
            kv.teks(x + pad, y + KS['isi_dy_pt'], tw, KS['tinggi_pt'] - KS['isi_dy_pt'] - pad * 0.6, r)
        if sp.get('arahan'):
            A, a = KS['arahan'], sp['arahan']
            y = KS['y_pt'] + KS['baris'] * (KS['tinggi_pt'] + jr)
            kv.bentuk('bulat', self.X0, y, self.W, A['tinggi_pt'], A['warna_isi'], radius=A['radius_pt'])
            dd = A['lingkaran_pt']
            kv.bulat_ikon(self.X0 + pad, y + (A['tinggi_pt'] - dd) / 2, dd, A['warna_lingkaran'], a.get('ikon', 'peringatan'), A['warna_ikon'], KS['ikon_rasio'])
            lx = self.X0 + pad + dd + pad
            lab = [self.R(a.get('label', 'ARAHAN').upper(), self.T['label_arahan'])]
            lw = self.u.lebar(lab) + pad
            kv.teks(lx, y, lw, A['tinggi_pt'], lab, jangkar='m', bungkus=False)
            r = self.runs(a['teks'], self.T['arahan'], asal)
            tw = self.X1 - pad - lx - lw
            self.muat(r, tw, 2, asal, 'arahan')
            kv.teks(lx + lw, y, tw, A['tinggi_pt'], r, jangkar='m')
        self.catatan_sumber(kv, j)

    def chip_lembaga(self, kv, x, y, maks_x, lembaga, asal, baris_maks=2):
        """Chip lembaga berikon (bukan logo): pemimpin pil navy, pendukung pil bergaris; dibungkus ke baris berikut."""
        C = self.K['chip']
        h, x0, n = C['tinggi_pt'], x, 1
        for i, nama in enumerate(lembaga):
            self.cek_teks(nama, asal)
            r = [self.R(nama, self.T['chip'], 'kertas' if i == 0 else 'teks')]
            lebar = h * C['pad_rasio'] * 2 + self.u.lebar(r) + h * C['ikon_rasio'] + h * C['pad_rasio'] * 0.6
            if x + lebar > maks_x and x > x0:
                x, y, n = x0, y + h + C['jarak_pt'], n + 1
                if n > baris_maks:
                    raise DeckGalat(f'{asal}: chip lembaga lebih dari {baris_maks} baris; kurangi lembaga')
            self.pil(kv, x, y, r, h, C['warna_pemimpin'] if i == 0 else 'kertas', None if i == 0 else C['warna_garis'],
                     'lembaga', 'kertas' if i == 0 else C['warna_ikon'])
            x += lebar + C['jarak_pt']
        return y + h

    def chip_teks(self, kv, x, y, teks, nada, ikon=None):
        C = self.K['chip']
        return self.pil_nada(kv, x, y, teks, self.T['chip'], C['tinggi_pt'], nada, ikon)

    def s_rekomendasi(self, kv, j):
        sp, asal, RK = j['spek'], j['asal'], self.K['baris_rekomendasi']
        rows = sp['rekomendasi']
        self.visual('tabel')
        y0 = self.S['area_isi_y_pt'][0]
        xs = [self.X0 + f * self.W for f in RK['kolom_rasio']]
        gk = self.T['kepala_kolom']
        for teks, x in zip(('LANGKAH', 'RINCIAN', 'PENANGGUNG JAWAB'), xs):
            kv.teks(x + (RK['lingkaran_pt'] + RK['jarak_pt'] if x == xs[0] else 0), y0, 200, RK['kepala_tinggi_pt'], [self.R(teks, gk)], jangkar='m', bungkus=False)
        yk = y0 + RK['kepala_tinggi_pt'] + 2
        kv.garis(self.X0, yk, self.X1, yk, RK['warna_garis_kepala'], 0.75)
        ada_sumber = bool(sp.get('sumber'))  # baris rekomendasi tanpa kaki (d5), kecuali spek menulis sumbernya
        rh = max(RK['tinggi_pt'], min(RK['tinggi_maks_pt'], (self.bawah(ada_sumber) - yk) / len(rows)))
        if yk + len(rows) * rh > self.bawah(ada_sumber):
            raise DeckGalat(f'{asal}: {len(rows)} rekomendasi tidak muat satu slide; pecah ke slide berikut')
        d = RK['lingkaran_pt']
        st = self.t['kosakata']['status_usulan']
        for i, r in enumerate(rows):
            ry = yk + i * rh
            if i:
                kv.garis(self.X0, ry, self.X1, ry, RK['warna_pemisah'], 0.5)
            if r['jenis'] not in self.t['kosakata']['jenis_aksi']:
                raise DeckGalat(f'{asal}: jenis aksi "{r["jenis"]}" tidak dikenal')
            kv.bulat_ikon(self.X0, ry + (rh - d) / 2, d, RK['warna_lingkaran'], r['jenis'], 'kertas', RK['ikon_rasio'])
            lx = self.X0 + d + RK['jarak_pt']
            lw = xs[1] - lx - RK['jarak_pt']
            oy = ry + (rh - RK['tinggi_pt']) / 2  # blok langkah di tengah baris
            jr = [self.R(self.st(r['kode']) + '  ', self.T['langkah'], RK['warna_kode'])] + self.runs(r['langkah'], self.T['langkah'], asal)
            self.muat(jr, lw, 1, asal, f'langkah {r["kode"]}')
            kv.teks(lx, oy + RK['langkah_dy_pt'], lw, 14, jr, jangkar='m', bungkus=False)
            cx = lx
            hz = self.t['kosakata']['horizon']
            if r['waktu'] not in hz:
                raise DeckGalat(f'{asal}: waktu "{r["waktu"]}" bukan 100-hari, 2026-2027, 2028-2030')
            cx += self.chip_teks(kv, cx, oy + RK['chip_dy_pt'], hz[r['waktu']], RK['nada_waktu'], 'kalender') + self.K['chip']['jarak_pt']
            if r.get('status'):
                if r['status'] not in st:
                    raise DeckGalat(f'{asal}: status "{r["status"]}" bukan sudah-ada, dikembangkan, baru')
                self.chip_teks(kv, cx, oy + RK['chip_dy_pt'], st[r['status']]['label'], st[r['status']])
            rw = xs[2] - xs[1] - RK['jarak_pt'] * 2
            rr = self.runs(r['rincian'], self.T['rincian_rekomendasi'], asal)
            self.muat(rr, rw, 2, asal, f'rincian {r["kode"]}')
            kv.teks(xs[1], ry, rw, rh, rr, rata='j', jangkar='m')
            hc = self.K['chip']['tinggi_pt']
            nb = 1 if self.u.lebar([self.R('  '.join(r['lembaga']), self.T['chip'])]) + len(r['lembaga']) * hc * 1.6 < self.X1 - xs[2] else 2
            self.chip_lembaga(kv, xs[2], ry + (rh - nb * hc - (nb - 1) * self.K['chip']['jarak_pt']) / 2, self.X1, r['lembaga'], asal)
        if ada_sumber:
            self.catatan_sumber(kv, j)

    def s_strategi_tiga_fase(self, kv, j):
        sp, asal, TF = j['spek'], j['asal'], self.K['tiga_fase']
        self.visual('grafik')  # rantai tahap (G21)
        jarak = self.K['bingkai']['jarak_blok_pt']
        y = self.S['area_isi_y_pt'][0]
        bawah = self.bawah(False)
        if sp.get('pita'):
            h = self.K['pita_bawah']['tinggi_baku_pt']
            self.pita(kv, self.X0, bawah - h, self.W, sp['pita'], asal)
            bawah -= h + jarak
        fase = self.t['kosakata']['fase']
        cw = (self.W - 2 * jarak) / 3
        for i, kode in enumerate(('prabencana', 'tanggap-darurat', 'pascabencana')):
            aksi = j['fase'][kode]  # waktu dan pemimpin diturunkan dari matriks rekomendasi di siapkan()
            x = self.X0 + i * (cw + jarak)
            bx, by, bw, bh = self.panel(kv, x, y, cw, bawah - y, fase[kode]['label'], kode, 'netral', asal=asal)
            ah = min(TF['aksi_maks_pt'], bh / len(aksi))
            isi_h = TF['chip_dy_pt'] + self.K['chip']['tinggi_pt']
            for n, a in enumerate(aksi):
                ay = by + n * ah
                if n:
                    kv.garis(bx, ay, bx + bw, ay, TF['warna_pemisah'], 0.5)
                ay += (ah - isi_h) / 2
                s = kv.bentuk('bulat', bx, ay + 1, TF['kode_lebar_pt'], TF['kode_tinggi_pt'], TF['warna_kode'], radius=3)
                kv.isi_teks(s.text_frame, [[self.R(self.st(a['kode']), self.T['kode_aksi'])]], 'c', 'm', False)
                tx = bx + TF['kode_lebar_pt'] + 6
                r = self.runs(a['aksi'], self.T['aksi_fase'], asal)
                self.muat(r, bx + bw - tx, 2, asal, f'aksi {a["kode"]}')
                kv.teks(tx, ay, bx + bw - tx, TF['aksi_teks_tinggi_pt'], r)
                cy = ay + TF['chip_dy_pt']
                cx = tx + self.chip_teks(kv, tx, cy, self.t['kosakata']['horizon'][a['waktu']], TF['nada_waktu'], 'kalender') + self.K['chip']['jarak_pt']
                self.chip_lembaga(kv, cx, cy, bx + bw, a['lembaga'], asal, baris_maks=1)

    def s_skenario(self, kv, j):
        sp, asal, SK = j['spek'], j['asal'], self.K['skenario']
        s = sp['skenario']
        kat = next((k for k, v in self.t['warna']['kategori'].items() if not k.startswith('_') and s['jenis'] in v['jenis']), None)
        if not kat:
            raise DeckGalat(f'{asal}: jenis "{s["jenis"]}" tidak ada di kategori bencana')
        kw = self.t['warna']['kategori'][kat]
        y0, bawah = self.S['area_isi_y_pt'][0], self.bawah()
        x, w = self.X0, self.W
        pita, P = SK['kepala_tinggi_pt'], self.K['panel']
        tint = f'tint.{kw["tint"]}.pita'
        # satu topik satu kontainer
        kv.bentuk('bulat', x, y0, w, bawah - y0, 'kertas', radius=P['radius_pt'])
        kv.bentuk('bulat', x, y0, w, pita, tint, radius=P['radius_pt'])
        kv.bentuk('kotak', x, y0 + pita / 2, w, pita / 2, tint)
        kv.bentuk('bulat', x, y0, w, bawah - y0, None, P['warna_garis'], P['tebal_garis_pt'], radius=P['radius_pt'])
        d = P['lingkaran_pt']
        kv.bulat_ikon(x + P['pad_pt'], y0 + (pita - d) / 2, d, f'kategori.{kat}', s['jenis'], 'kertas', P['ikon_pt'] / d)
        kanan = x + w - P['pad_pt'] - self.pil_keyakinan(kv, x + w - P['pad_pt'], y0 + (pita - self.K['chip']['tinggi_pt']) / 2, self.K['chip']['tinggi_pt'], s['keyakinan']) - P['pad_pt']
        label_jenis = s.get('label_jenis') or self.t['kosakata']['jenis_bencana'][s['jenis']]  # lingkup ancaman bila lebih sempit dari kosakata
        self.cek_teks(label_jenis, asal)
        jr = [self.R(label_jenis + ': ', self.T['judul_panel'])] + self.runs(s['judul'], self.T['judul_panel'], asal)
        jx = x + P['pad_pt'] + d + P['jarak_judul_pt']
        self.muat(jr, kanan - jx, 1, asal, 'judul skenario')
        kv.teks(jx, y0, kanan - jx, pita, jr, jangkar='m', bungkus=False)
        pad = P['pad_pt']
        top = y0 + pita + pad
        kiri_w = w * SK['rasio_kerusakan']
        cw = (w - 2 * pad - 2 * pad) / 3
        gd = self.T['isi_panel']
        h_daftar = max(self.tinggi_daftar(self.paras_daftar(s[k], gd, asal), gd, cw) for k in ('respons', 'pemulihan'))
        bawah_atas = bawah - self.K['jarak_isi_ke_tepi_panel_pt'] - h_daftar - SK['label_tinggi_pt'] - 10 - pad * 0.6
        gk = self.T['kepala_kolom']
        # kerusakan
        kv.teks(x + pad, top, kiri_w, SK['label_tinggi_pt'], [self.R('KERUSAKAN DAN KORBAN', gk)], jangkar='m', bungkus=False)
        rows = s['kerusakan']
        self.visual('tabel')
        rt = top + SK['label_tinggi_pt'] + 2
        rh = min(SK['baris_maks_pt'], (bawah_atas - rt) / len(rows))
        xv = x + pad + kiri_w * SK['kolom_nilai_rasio']
        for i, r in enumerate(rows):
            ry = rt + i * rh
            kv.garis(x + pad, ry, x + kiri_w, ry, self.K['tabel_peringkat']['warna_pemisah'], 0.5)
            kv.teks(x + pad, ry, xv - x - pad - 6, rh, self.runs(r['besaran'], self.T['isi_tabel'], asal), jangkar='m', bungkus=False)
            nr = self.runs(r['nilai'], self.T['nilai_tabel'], asal, tebal=True)
            kv.teks(xv, ry, kiri_w * 0.3, rh, nr, jangkar='m', bungkus=False)
            kyk = r.get('keyakinan') or self.k.manifest[-1]['keyakinan']
            self.pil_keyakinan(kv, x + kiri_w, ry + (rh - self.K['chip']['tinggi_pt']) / 2, self.K['chip']['tinggi_pt'], kyk)
        # kemungkinan dan angka kebijakan
        kx = x + kiri_w + pad * 2
        kw_ = x + w - pad - kx
        kv.garis(kx - pad, top, kx - pad, bawah_atas, self.K['tabel_peringkat']['warna_pemisah'], 0.75)
        kv.teks(kx, top, kw_, SK['label_tinggi_pt'], [self.R('KEMUNGKINAN DALAM LIMA TAHUN', gk)], jangkar='m', bungkus=False)
        ch = self.K['chip']['tinggi_pt']
        yw = self.pil_keyakinan(kv, kx + kw_, top + (SK['label_tinggi_pt'] - ch) / 2, ch, s['kemungkinan_keyakinan']) + 4 \
            if s.get('kemungkinan_keyakinan') else 0
        pel = self.t['kosakata']['kemungkinan_5_tahun']
        bw = (kw_ - 4 * 3) / 5
        if s.get('kemungkinan') is None:  # belum dihitung dari data: tidak menyorot kelas apa pun
            r = self.runs(s.get('kemungkinan_catatan', 'Kelas kemungkinan dalam penyusunan'), self.T['isi_tabel'], asal)
            rw = self.u.lebar(r) + 4
            kv.teks(kx + kw_ - yw - rw, top, rw, SK['label_tinggi_pt'], r, rata='r', jangkar='m', bungkus=False)
        for n in range(1, 6):
            aktif = str(n) == str(s['kemungkinan'])
            bxk = kx + (n - 1) * (bw + 3)
            kv.bentuk('bulat', bxk, rt, bw, SK['kemungkinan_tinggi_pt'], f'kategori.{kat}' if aktif else 'tint.netral.muda', radius=3)
            kv.teks(bxk, rt, bw, SK['kemungkinan_tinggi_pt'], [[self.R(self.st(str(n)), self.T['kemungkinan_kelas'], 'kertas' if aktif else 'teks-3')],
                                                               [self.R(self.st(pel[str(n)]), self.T['kemungkinan_label'], 'kertas' if aktif else 'teks-3')]], rata='c', jangkar='m')
        kb = s['kebijakan']
        ky = rt + SK['kemungkinan_tinggi_pt'] + SK['jarak_kebijakan_pt']
        kv.teks(kx, ky, kw_, SK['label_tinggi_pt'], [self.R('ANGKA KEBIJAKAN', gk)], jangkar='m', bungkus=False)
        self.pil_keyakinan(kv, kx + kw_, ky + (SK['label_tinggi_pt'] - self.K['chip']['tinggi_pt']) / 2, self.K['chip']['tinggi_pt'],
                           kb.get('keyakinan', 'asumsi-kebijakan'))
        ky += SK['label_tinggi_pt'] + 2
        vals = []
        for b in (kb['sekarang'], kb['target']):
            segs = self.urai(b['nilai'], asal)
            m = next(mm for mm in reversed(self.k.manifest) if mm['naskah'] == asal)
            lo, hi = (m['rendah'], m['tinggi']) if m['rendah'] is not None else (m['nilai'], m['nilai'])
            vals.append((b, ''.join(x_[0] for x_ in segs), lo, hi, m))
        vmax = max(v[3] for v in vals)
        self.visual('grafik')
        lab_w = kw_ * SK['label_kebijakan_rasio']
        bar_w = kw_ - lab_w - SK['nilai_kebijakan_lebar_pt']
        for i, (b, teks, lo, hi, _) in enumerate(vals):
            by = ky + i * SK['batang_kebijakan_jarak_pt']
            kv.teks(kx, by, lab_w - 4, SK['batang_kebijakan_pt'], self.runs(b['label'], self.T['isi_tabel'], asal), jangkar='m')
            bx0 = kx + lab_w
            # sekarang lawan target: pembanding lawan teks-2, tanpa warna arah (B1.5), supaya tidak bentrok dengan kategori
            kv.bentuk('bulat', bx0 + bar_w * lo / vmax, by + 3, bar_w * (hi - lo) / vmax, SK['batang_kebijakan_pt'] - 6,
                      SK['warna_batang'][min(i, 1)], radius=2)
            kv.teks(bx0 + bar_w + 4, by, SK['nilai_kebijakan_lebar_pt'] - 4, SK['batang_kebijakan_pt'], [self.R(teks, self.T['nilai_tabel'])], jangkar='m', bungkus=False)
        if vals[0][3]:
            p = (vals[1][3] - vals[0][3]) / vals[0][3] * 100
            teks = ('turun ' if p < 0 else 'naik ') + fmt_id(abs(p), 0) + '%'
            self.turunan('kebijakan', teks, p, asal, 'asumsi-kebijakan', vals[0][4]['sumber'], vals[1][4]['sumber'],
                         dari=(vals[0][4]['kunci'], vals[1][4]['kunci']))
            wt = self.arah(p)
            ty = ky + 2 * SK['batang_kebijakan_jarak_pt']
            rr = [self.R(teks, self.T['ubah_grafik'], wt)] + self.runs(' ' + kb['keterangan'], self.T['isi_tabel'], asal)
            kv.segitiga(kx + lab_w, ty + 4, 6, p > 0, wt)
            kv.teks(kx + lab_w + 9, ty, kw_ - lab_w - 9, 14, rr, jangkar='m', bungkus=False)
            ty += 14
        else:
            ty = ky + 2 * SK['batang_kebijakan_jarak_pt']
        if kb.get('legenda'):  # keterangan batang (mis. dua lintasan peringatan dini), satu baris di bawah angka perubahan
            r = self.runs(kb['legenda'], self.T['catatan_kaki'], asal)
            self.muat(r, kw_ - lab_w, 1, asal, 'legenda batang kebijakan')
            kv.teks(kx + lab_w, ty, kw_ - lab_w, 12, r, jangkar='m', bungkus=False)
            ty += 12
        if s.get('catatan'):  # catatan baca angka skenario, di bawah angka kebijakan dalam kontainer yang sama
            g = self.T['isi_daftar']
            ty += 6
            self.daftar(kv, kx, ty, kw_, bawah_atas - ty, s['catatan'], asal, g)
        # respons, pemulihan, lembaga
        by = bawah_atas + pad * 0.6
        kv.garis(x + pad, by, x + w - pad, by, self.K['tabel_peringkat']['warna_pemisah'], 0.75)
        for i, (lab, isi) in enumerate((('RESPONS YANG DIBUTUHKAN', s['respons']), ('KEBUTUHAN PEMULIHAN', s['pemulihan']))):
            cx = x + pad + i * (cw + pad)
            kv.teks(cx, by + 4, cw, SK['label_tinggi_pt'], [self.R(lab, gk)], jangkar='m', bungkus=False)
            self.daftar(kv, cx, by + 4 + SK['label_tinggi_pt'] + 2, cw, bawah - by - SK['label_tinggi_pt'] - 6 - self.K['jarak_isi_ke_tepi_panel_pt'], isi, asal, gd)
        cx = x + pad + 2 * (cw + pad)
        kv.teks(cx, by + 4, cw, SK['label_tinggi_pt'], [self.R('LEMBAGA', gk)], jangkar='m', bungkus=False)
        self.chip_lembaga(kv, cx, by + 6 + SK['label_tinggi_pt'], cx + cw, s['lembaga'], asal, baris_maks=3)
        self.catatan_sumber(kv, j)

    def s_lampiran_tabel(self, kv, j):
        """Tabel native lampiran: kepala bergaris 1 pt, baris bergaris 0,5 pt, tanpa garis tegak, angka rata kanan."""
        TL = self.K['tabel_lampiran']
        tb, rows = j['tabel'], j['baris']
        self.visual('tabel')
        y, x, w = self.S['area_isi_y_pt'][0], self.X0, self.W
        kol = tb['kolom']
        gk, gi = self.T['kepala_tabel_lampiran'], self.T['isi_tabel_lampiran']
        lebar = []
        for i, c in enumerate(kol):
            isi = max([self.u.lebar([self.R(r[i]['teks'], gi)]) for r in tb['baris']] + [self.u.lebar([self.R(c.get('kepala', c['nama']), gk)])])
            lebar.append(isi + 2 * TL['pad_sel_pt'] + TL['kolom_jarak_pt'])
        sisa = w - sum(lebar)
        if sisa < 0:
            raise DeckGalat(f'{j["asal"]}: tabel lampiran {sum(lebar):.0f} pt lebih lebar dari {w} pt; kurangi kolom')
        teks_i = [i for i, c in enumerate(kol) if not c.get('fmt')] or [0]
        tot = sum(lebar[i] for i in teks_i)
        for i in teks_i:  # sisa lebar dibagi ke kolom teks sebanding isinya
            lebar[i] += sisa * lebar[i] / tot
        rh = TL['baris_pt'][0]
        gf = kv.sh.add_table(len(rows) + 1, len(kol), E(x), E(y), E(w), E(TL['kepala_tinggi_pt'] + rh * len(rows)))
        t = gf.table
        tp = t._tbl.tblPr
        tp.set('firstRow', '0')
        tp.set('bandRow', '0')
        sid = tp.find(qn('a:tableStyleId'))
        if sid is None:
            sid = tp.makeelement(qn('a:tableStyleId'), {})
            tp.append(sid)
        sid.text = '{2D5ABB26-0587-4C30-8999-92F81FD0307C}'  # No Style, No Grid
        for i, lw in enumerate(lebar):
            t.columns[i].width = E(lw)
        t.rows[0].height = E(TL['kepala_tinggi_pt'])
        for r in range(1, len(rows) + 1):
            t.rows[r].height = E(rh)

        def sel(cell, runs, rata, garis_tok, tebal):
            cell.margin_left = cell.margin_right = Pt(TL['pad_sel_pt'])
            cell.margin_top = cell.margin_bottom = 0
            kv.isi_teks(cell.text_frame, [runs], rata, 'm', False)
            tc = cell._tc.get_or_add_tcPr()
            tc.set('anchor', 'ctr')
            for ch in list(tc):
                tc.remove(ch)
            for tag in ('a:lnL', 'a:lnR', 'a:lnT'):
                ln = tc.makeelement(qn(tag), {'w': '0'})
                ln.append(ln.makeelement(qn('a:noFill'), {}))
                tc.append(ln)
            ln = tc.makeelement(qn('a:lnB'), {'w': str(E(tebal))})
            sf = ln.makeelement(qn('a:solidFill'), {})
            sf.append(sf.makeelement(qn('a:srgbClr'), {'val': str(self.rgb(garis_tok))}))
            ln.append(sf)
            tc.append(ln)
            tc.append(tc.makeelement(qn('a:noFill'), {}))

        for i, c in enumerate(kol):
            sel(t.cell(0, i), [self.R(c.get('kepala', c['nama']).upper(), gk)], 'r' if c.get('fmt') else 'l', TL['warna_garis_kepala'], TL['tebal_kepala_pt'])
        for r, row in enumerate(rows, start=1):
            for i, c in enumerate(kol):
                g = dict(gi, bobot='bold') if i == 0 else gi
                sel(t.cell(r, i), [self.R(row[i]['teks'], g)], 'r' if c.get('fmt') else 'l', TL['warna_garis_baris'], TL['tebal_baris_pt'])
        self.catatan_sumber(kv, j, [tb['sumber']], keyakinan=tb['keyakinan'])

    # ------------------------------------------------------------------ rakit
    def fase_bertaut(self, sp, rek, asal):
        """Aksi tiga fase bertaut ke matriks rekomendasi (B5.12, C7): kode wajib ada; waktu dan lembaga pemimpin diturunkan
        dari baris rekomendasi, dan bila spek menulisnya sendiri harus identik."""
        out = {}
        for kode in ('prabencana', 'tanggap-darurat', 'pascabencana'):
            aksi = sp['fase'][kode]
            if not 3 <= len(aksi) <= 5:
                raise DeckGalat(f'{asal}: fase {kode} butuh 3 sampai 5 aksi (PEDOMAN B5.12), ada {len(aksi)}')
            out[kode] = []
            for a in aksi:
                r = rek.get(a['kode'])
                if r is None:
                    raise DeckGalat(f'{asal}: aksi {a["kode"]} tidak ada di matriks rekomendasi deck ({", ".join(sorted(rek)) or "kosong"}); '
                                    'nomor aksi merujuk matriks (PEDOMAN B5.12)')
                turun = {'waktu': r['waktu'], 'lembaga': r['lembaga'][:1]}
                for k, v in turun.items():
                    if k in a and a[k] != v:
                        raise DeckGalat(f'{asal}: aksi {a["kode"]} {k} {a[k]} beda dengan rekomendasi {a["kode"]} {v} (C7)')
                out[kode].append(dict(a, **turun))
        return out

    def periksa_garis_besar(self):
        """Garis besar sebelum membangun (Buku Pegangan S34, S35, S7): satu kalimat pesan_kunci per deck; tiap slide di luar
        sampul, penutup, dan pembatas memuat pesan, jenis_slide dari daftar tertutup S35, dan judul_bentuk temuan|deskriptif.
        Medan S35 "jenis" dan S7 "judul" ditulis jenis_slide dan judul_bentuk, karena "jenis" (tata letak) dan "judul" (teks)
        sudah dipakai spek. Dua slide isi berurutan tidak berjenis sama kecuali lampiran atau satu seri (spek "seri" sama: seri
        berchip S12, profil wilayah S26, lanjutan satu tabel)."""
        pk = self.spek.get('pesan_kunci')
        if not isinstance(pk, str) or not pk.strip():
            raise DeckGalat(f'{self.nama}: spek tanpa "pesan_kunci" (Buku Pegangan S34: satu kalimat pesan kunci per deck sebelum membangun)')
        self.cek_teks(pk, f'{self.nama}#pesan_kunci')
        lalu = None
        for i, sp in enumerate(self.spek['slide']):
            asal, tata = f'{self.nama}#{i + 1}', sp.get('jenis')
            if tata in BINGKAI:
                continue
            if not isinstance(sp.get('pesan'), str) or not sp['pesan'].strip():
                raise DeckGalat(f'{asal}: slide tanpa "pesan" (Buku Pegangan S34: judul, pesan, dan visual tiap slide ditulis sebelum render)')
            self.cek_teks(sp['pesan'], asal + '/pesan')
            js = sp.get('jenis_slide')
            if js not in JENIS_S35:
                raise DeckGalat(f'{asal}: jenis_slide "{js}" di luar daftar tertutup S35: {", ".join(sorted(JENIS_S35))}')
            if tata in JENIS_S35_TATA and js not in JENIS_S35_TATA[tata]:
                raise DeckGalat(f'{asal}: tata letak "{tata}" hanya sah untuk jenis_slide {sorted(JENIS_S35_TATA[tata])}, tertulis "{js}"')
            jb = sp.get('judul_bentuk')
            if jb not in ('temuan', 'deskriptif'):
                raise DeckGalat(f'{asal}: judul_bentuk "{jb}" harus "temuan" atau "deskriptif" (Buku Pegangan S7, KEPUTUSAN T11)')
            if js in ('navigasi', 'lampiran') and jb != 'deskriptif':
                raise DeckGalat(f'{asal}: slide {js} berjudul deskriptif (S7: Pesan Kunci, Kesimpulan, dan lampiran), tertulis "{jb}"')
            judul = sp.get('judul', '')
            if jb == 'temuan' and '{{angka:' not in judul:
                raise DeckGalat(f'{asal}: judul_bentuk temuan tanpa token {{{{angka:...}}}} di judul (S7: kalimat temuan berangka)')
            kb = RE_KODE_BAGIAN.match(judul)
            if kb and kb[1] in 'ABCD' and jb != 'temuan':
                raise DeckGalat(f'{asal}: slide bagian {kb[1]} berjudul_bentuk "{jb}"; slide bagian A sampai D wajib temuan (S7, T11)')
            if js != 'lampiran':
                if lalu and lalu[0] == js and not (sp.get('seri') and sp.get('seri') == lalu[1]):
                    raise DeckGalat(f'{asal}: jenis_slide "{js}" sama dengan slide isi sebelumnya; S35 meminta variasi tata letak '
                                    '(kecuali seri berchip atau profil wilayah: isi "seri" yang sama)')
                lalu = (js, sp.get('seri'))

    def siapkan(self):
        """Spek -> daftar pekerjaan slide (lampiran-tabel dipecah rata), bernomor, dengan rujukan halaman lampiran."""
        kerja = []
        jenis_sah = {'sampul', 'kartu-angka', 'temuan-grafik', 'temuan-peta', 'tabel-peringkat', 'skenario', 'strategi-tiga-fase',
                     'rekomendasi', 'kesimpulan', 'penutup', 'pembatas-lampiran', 'lampiran-tabel'}
        for i, sp in enumerate(self.spek['slide']):
            if sp.get('jenis') not in jenis_sah:
                raise DeckGalat(f'{self.nama}#{i + 1}: jenis slide "{sp.get("jenis")}" tidak dikenal: {", ".join(sorted(jenis_sah))}')
        self.periksa_garis_besar()
        rek = {}  # matriks rekomendasi deck: kode -> baris (nomor aksi tiga fase merujuk ke sini, B5.12)
        for i, sp in enumerate(self.spek['slide']):
            for r in sp.get('rekomendasi', []) if sp.get('jenis') == 'rekomendasi' else []:
                if r['kode'] in rek:
                    raise DeckGalat(f'{self.nama}#{i + 1}: kode rekomendasi {r["kode"]} dobel')
                rek[r['kode']] = r
        for i, sp in enumerate(self.spek['slide']):
            jn = sp.get('jenis')
            if jn not in jenis_sah:
                raise DeckGalat(f'{self.nama}#{i + 1}: jenis slide "{jn}" tidak dikenal: {", ".join(sorted(jenis_sah))}')
            asal = f'{self.nama}#{i + 1}'
            if jn == 'strategi-tiga-fase':
                kerja.append({'jenis': jn, 'spek': sp, 'asal': asal, 'fase': self.fase_bertaut(sp, rek, asal)})
                continue
            if jn != 'lampiran-tabel':
                kerja.append({'jenis': jn, 'spek': sp, 'asal': asal})
                continue
            tb = self.data(sp['data'], asal + '/data')
            TL = self.K['tabel_lampiran']
            ruang = self.bawah() - self.S['area_isi_y_pt'][0] - TL['kepala_tinggi_pt']
            per = min(sp.get('maks_baris', TL['maks_baris']), int(ruang // TL['baris_pt'][0]))
            n = math.ceil(len(tb['baris']) / per)
            rata = math.ceil(len(tb['baris']) / n)
            for b in range(n):
                kerja.append({'jenis': jn, 'spek': sp, 'asal': f'{asal}.{b + 1}', 'tabel': tb, 'judul': f'{sp["kode"]}. {sp["judul"]}',
                              'judul_akhir': f' (lanjutan {b + 1}/{n})' if b else '',
                              'baris': tb['baris'][b * rata:(b + 1) * rata]})
        for n, kj in enumerate(kerja, start=1):
            kj['nomor'] = n
        for i, kj in enumerate(kerja):
            if kj['jenis'] == 'pembatas-lampiran':
                lamp = {}
                for kk in kerja[i + 1:]:
                    if kk['jenis'] == 'lampiran-tabel':
                        lj = lamp.setdefault(kk['spek']['kode'], {'kode': kk['spek']['kode'], 'halaman': [],
                                                                    'judul_daftar': kk['spek'].get('judul_daftar', kk['spek']['judul'])})
                        lj['halaman'].append(kk['nomor'])
                if not lamp:
                    raise DeckGalat(f'{kj["asal"]}: pembatas Lampiran tanpa slide lampiran sesudahnya')
                kj['lampiran'] = list(lamp.values())
        return kerja

    def gambar(self, kj):
        sl = self.prs.slides.add_slide(self.lay['GELAP' if self.gelap(kj) else 'PUTIH'])
        kv = Kanvas(self, sl)
        if kj['jenis'] not in {'sampul', 'penutup', 'pembatas-lampiran'}:
            self.bingkai(kv, kj)
        fn = {'kartu-angka': self.s_temuan, 'temuan-grafik': self.s_temuan, 'temuan-peta': self.s_temuan,
              'tabel-peringkat': self.s_temuan}.get(kj['jenis']) or getattr(self, 's_' + kj['jenis'].replace('-', '_'))
        fn(kv, kj)

    def keluarga(self):
        """Keluarga bencana yang tampil di halaman ini, dari peran warna kategori.<k> dan skala.<ramp> yang tercatat."""
        sk = self.t['warna']['skala']
        out = set()
        for _, peran in self.hal['warna']:
            jenis, _, nama = peran.partition('.')
            if jenis == 'kategori':
                out.add(nama)
            elif jenis == 'skala' and sk[nama].get('kategori'):
                out.add(sk[nama]['kategori'])
        return out

    def rapikan_templat(self):
        """Sisa templat pemilik yang ditolak qa/periksa.py: judul dokumen lama (D-10), buFont Arial di master (D-4),
        warna skema dk1 hitam sistem (D-9). Diganti dengan judul kajian, Roboto, dan hex teks tema."""
        cp = self.prs.core_properties  # L71: judul, penerbit BNPB, subjek, kata kunci, bahasa id-ID
        cp.title = self.spek.get('judul_dokumen') or self.kaj['judul']
        cp.subject = self.spek.get('subjek_dokumen') or self.kaj['subjudul']
        cp.author = cp.last_modified_by = self.t['kajian']['penerbit']
        cp.keywords = '; '.join(self.kaj.get('kata_kunci', []))
        cp.language = 'id-ID'
        cp.category = 'Kajian'
        cp.comments = self.spek.get('pesan_kunci', '')
        A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
        teks = warna(self.t, 'teks').lstrip('#').upper()
        for m in self.prs.slide_masters:
            for bu in m._element.iter(A + 'buFont'):
                if bu.get('typeface') != self.t['font']['keluarga']:
                    bu.set('typeface', self.t['font']['keluarga'])
            th = m.part.part_related_by(RT.THEME)
            th._blob = th.blob.replace(b'<a:sysClr val="windowText" lastClr="000000"/>', f'<a:srgbClr val="{teks}"/>'.encode())

    def bangun(self, keluar):
        """Dua lintasan per halaman isi: lintasan 1 di slide buangan hanya mengenali keluarga warna yang tampil, lintasan 2
        menggambar dengan peran warna halaman itu (arah teks-2, angka judul navy; PEDOMAN B1.5, B1.8)."""
        kerja = self.siapkan()
        for kj in kerja:
            kel = set()
            if kj['jenis'] not in {'sampul', 'penutup', 'pembatas-lampiran'}:
                m0, c0 = len(self.k.manifest), len(self.catatan)
                self.hal = {'nomor': kj['nomor'], 'keluarga': set(), 'warna': set(), 'struktur': []}
                self.gambar(kj)
                kel = self.keluarga()
                sid = self.prs.slides._sldIdLst[-1]
                self.prs.part.drop_rel(sid.rId)
                self.prs.slides._sldIdLst.remove(sid)
                del self.k.manifest[m0:], self.catatan[c0:]
            self.hal = {'nomor': kj['nomor'], 'keluarga': kel, 'warna': set(), 'struktur': []}
            self.gambar(kj)
            sp = kj['spek']
            self.halaman.append({'nomor': kj['nomor'], 'jenis': kj['jenis'], 'asal': kj['asal'], 'keluarga': sorted(self.keluarga()),
                                 'judul': self.hal.get('judul'), 'peta': self.hal.get('peta'), 'struktur': self.hal['struktur'],
                                 'warna': sorted(self.hal['warna']), 'judul_spek': (kj.get('judul') or sp.get('judul', '')) + kj.get('judul_akhir', ''),
                                 'pesan': sp.get('pesan'), 'jenis_slide': sp.get('jenis_slide'), 'judul_bentuk': sp.get('judul_bentuk'),
                                 'seri': sp.get('seri'), 'visual': sorted(self.hal.get('visual', ())), 'gambar': self.hal.get('gambar', [])})
        self.hal = None
        keluar = Path(keluar)
        keluar.parent.mkdir(parents=True, exist_ok=True)
        self.rapikan_templat()
        self.prs.save(keluar)
        self.masukan |= {self.akar / 'data' / rel for rel in self.k._berkas}
        (keluar.with_suffix('.manifest.json')).write_text(json.dumps(
            {'spek': self.nama, 'pesan_kunci': self.spek.get('pesan_kunci'), 'slide': self.halaman, 'angka': self.k.manifest, 'catatan': self.catatan,
             'masukan': {str(p.resolve().relative_to(REPO)): sha(p) for p in sorted(self.masukan)}},
            ensure_ascii=False, indent=1, default=str), encoding='utf-8')
        return kerja


def ringkas_sumber(daftar, awalan, label_olah):
    """Gabung sumber per lembaga: 'InaRISK BNPB, IRBI 2024' + 'InaRISK BNPB, IRBI 2015 dan 2024' -> 'InaRISK BNPB, IRBI 2015, 2024'."""
    olah, grup = False, {}
    for s in daftar:
        for bag in (b.strip() for b in s.split(';')):
            if bag.startswith(awalan):
                olah, bag = True, bag[len(awalan):].strip()
            lembaga, _, rinci = bag.partition(', ')
            grup.setdefault(lembaga, [])
            if rinci and rinci not in grup[lembaga]:
                grup[lembaga].append(rinci)
    out = []
    for lembaga, rinci in grup.items():
        kata = {r.split(' ')[0] for r in rinci}
        if len(kata) == 1 and len(rinci) > 1:  # 'IRBI 2015 dan 2024', 'IRBI 2023' -> 'IRBI 2015, 2023, 2024'
            tahun = sorted({t for r in rinci for t in re.findall(r'(?:19|20)\d{2}(?:–(?:19|20)\d{2})?', r)})
            rentang = [tuple(map(int, t.split('–'))) for t in tahun if '–' in t]
            tahun = [t for t in tahun if '–' in t or not any(a <= int(t) <= b for a, b in rentang)]
            sisa = {re.sub(r'(?:19|20)\d{2}(?:–(?:19|20)\d{2})?|\bdan\b|,', '', r).strip() for r in rinci}
            rinci = [f'{kata.pop()} {", ".join(tahun)}'] if sisa == {next(iter(sisa))} and len(next(iter(sisa)).split()) == 1 else rinci
        out.append(lembaga + (', ' + ', '.join(rinci) if rinci else ''))
    return '; '.join(out) + (f'; {label_olah}' if olah else '')


def ke_pdf(pptx, outdir=None):
    """PPTX -> PDF dengan soffice berprofil terpisah (tidak bentrok dengan LibreOffice yang sedang terbuka)."""
    pptx = Path(pptx).resolve()
    outdir = Path(outdir or pptx.parent).resolve()
    profil = (SINI / 'keluaran/.profil-lo').resolve()
    pdf = outdir / (pptx.stem + '.pdf')
    pdf.unlink(missing_ok=True)  # PDF lama tidak boleh lolos sebagai hasil konversi yang gagal
    subprocess.run([soffice(), f'-env:UserInstallation=file://{profil}', '--headless',
                    '--convert-to', 'pdf', '--outdir', str(outdir), str(pptx)], check=True, capture_output=True, timeout=300)
    if not pdf.exists():
        raise DeckGalat(f'soffice tidak menghasilkan {pdf}')
    return pdf


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('spek')
    ap.add_argument('keluar', nargs='?', help='bawaan: keluaran/<nama berkas kajian DDMMYY>.pptx')
    ap.add_argument('--pdf', action='store_true', help='juga ekspor PDF lewat soffice dan periksa PDF-nya (D-4, D-17)')
    a = ap.parse_args(argv)
    sp = json.loads(Path(a.spek).read_text(encoding='utf-8'))
    d = Deck(sp, Path(a.spek).stem, berkas_spek=a.spek)
    keluar = a.keluar or SINI / 'keluaran' / (d.kaj['nama_berkas'].replace('{DDMMYY}', d.tgl.strftime('%d%m%y')) + '.pptx')
    kerja = d.bangun(keluar)
    from periksa import laporan, periksa
    pdf = ke_pdf(keluar) if a.pdf else None
    hasil = periksa(keluar, d.t, pdf)
    print('ok', keluar, pdf or '', json.dumps(hasil, ensure_ascii=False))
    if pdf:  # laporan QA per deck (Buku Pegangan S39): font, ikon, tata letak, anti-AI ke keluaran/qa/
        jalur, vonis = laporan(keluar, d.t, pdf)
        print(f'laporan QA deck: {jalur} ({vonis})')
        if vonis != 'LOLOS':
            sys.exit(f'laporan QA deck GAGAL: {jalur}')


if __name__ == '__main__':
    try:
        main()
    except DeckGalat as e:
        sys.exit(f'DeckGalat: {e}')
