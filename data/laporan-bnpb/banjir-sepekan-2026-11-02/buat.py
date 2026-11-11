"""Paparan "Laporan Situasi dan Kondisi Wilayah Terdampak Banjir" sepekan 26 Okt s.d. 1 Nov 2026, revisi 4 Nov 2026.

Revisi pemilik atas deck 021126 (PDF di Desktop, dibangun di Mac tanpa sumber di repo):
  - tab bagian di atas slide disamakan dengan Daftar Isi (label dan bagian aktif per slide);
  - slide 3: kolom jumlah kecamatan dan desa terdampak;
  - slide 4 (dan 5, supaya seragam): Terdampak dan Pengungsi masing-masing KK + Jiwa di bawah kepala gabungan,
    kolom Daerah ("x desa di Kec. Y, ..."), kepala "Lama" dengan "Hari" di baris kedua lebih kecil dan redup;
  - lampiran baru: rincian wilayah terdampak sampai desa/kelurahan, dan pengungsian.

Angka kab/kota (mulai, lama, KK, jiwa, mengungsi, tinggi air, kabar terakhir) = deck 021126 (logbook Pusdalops s.d. 1 Nov).
Rincian kecamatan/desa dan pengungsi = rincian.json (disuling dari logbook Pusdalops, laphar Koordalops 30-31 Okt,
dan teks WA Koordalops 1-2 Nov).

    python buat.py            # isi.pptx -> deck.py (sampul, daftar isi, tab bagian, penutup) -> PPTX + PDF
Butuh python-pptx (venv mesin ppt-konsultan) dan Pillow.
"""
import json, os, re, sys
from copy import deepcopy

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
from pptx.util import Pt
from lxml import etree

SINI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(SINI, '..', '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'data', 'laporan-bnpb', 'generator'))
NAMA = 'Paparan Situasi Banjir Sepekan 021126'
BASIS = os.path.join(REPO, 'data', 'laporan-bnpb', 'harian-2026-11-03', 'Laporan Kejadian Bencana Harian 031126 (isi).pptx')
SUMBER = 'Logbook Pusdalops BNPB, Laporan Harian Dit. Koordalops BNPB 26 Okt s.d. 2 Nov 2026, dan Simulasi Internal Banjir BNPB'

# ---- palet tema proyek-bnpb (hex di luar tema ditolak deck.py D-9)
NAVY, TEKS, TEKS2, TEKS3 = '051C2C', '1A1A1A', '2E3440', '6B7280'
GARIS, PUTIH, ORANYE, MERAH = 'BFC5CC', 'FFFFFF', 'D9600B', 'C8102E'
KELOMPOK, KAB_TINT, DI_NAVY = 'F4C3A0', 'EEF5FC', 'C9D1E3'
BAHAYA_PITA, BASAH_PITA, AIR_TUA = 'F8DDE0', 'DCEBF8', '1B5A93'
NETRAL_PITA, NETRAL_MUDA = 'E6EAF0', 'F3F5F8'
WASPADA, SIAGA, KERING_PITA = 'C4A262', 'E8894A', 'F4ECDC'
F = 'Roboto'

# ---- data deck 021126: (status, prov, kab, mulai, lama, kk, jiwa, ungsi_jiwa, tinggi, kabar)
D = None
BARIS = [
    ('belum', 'Aceh', 'Kota Subulussalam', '24 Okt', 9, 2245, D, D, D, '1 Nov'),
    ('belum', 'Aceh', 'Aceh Tenggara', '26 Okt', 7, 532, 1920, D, D, '30 Okt'),
    ('belum', 'Aceh', 'Aceh Selatan', '28 Okt', 5, 218, 756, 346, '10-20 cm', '1 Nov'),   # 4 Nov: WA Koordalops 2 Nov (deck 021126: 81 KK, 314 jiwa)
    ('belum', 'Aceh', 'Aceh Tengah', '23 Okt', 10, D, D, D, D, '26 Okt'),   # 4 Nov: angka 8 di deck 021126 = 8 KK mengungsi, bukan terdampak
    ('belum', 'Aceh', 'Aceh Barat', '24 Okt', 9, D, D, D, '50 cm', '1 Nov'),
    ('belum', 'Aceh', 'Aceh Barat Daya', '31 Okt', 2, D, D, D, '30-60 cm', '1 Nov'),
    ('belum', 'Aceh', 'Aceh Jaya', '31 Okt', 2, D, D, D, D, '1 Nov'),
    ('belum', 'Aceh', 'Aceh Utara', '30 Okt', 3, D, D, D, D, '1 Nov'),
    ('belum', 'Aceh', 'Nagan Raya', '25 Okt', 8, D, D, D, D, '26 Okt'),
    ('belum', 'Aceh', 'Pidie Jaya', '25 Okt', 8, D, D, D, D, '1 Nov'),
    ('belum', 'Sumatera Utara', 'Langkat', '29 Okt', 4, 310, D, D, D, '30 Okt'),
    ('belum', 'Sumatera Utara', 'Mandailing Natal', '28 Okt', 5, 287, D, D, D, '1 Nov'),
    ('belum', 'Sumatera Utara', 'Dairi', '23 Okt', 10, D, D, D, D, '26 Okt'),
    ('belum', 'Jawa Barat', 'Kota Bandung', '30 Okt', 3, 34, 112, 10, D, '1 Nov'),
    ('belum', 'Jawa Tengah', 'Cilacap', '31 Okt', 2, 44, 159, D, D, '1 Nov'),
    ('belum', 'Jawa Tengah', 'Banyumas', '30 Okt', 3, 9, 32, D, D, '1 Nov'),
    ('belum', 'Jawa Timur', 'Trenggalek', '29 Okt', 4, 27, D, D, D, '30 Okt'),
    ('belum', 'Jawa Timur', 'Kota Batu', '28 Okt', 5, 2, D, D, D, '28 Okt'),
    ('sudah', 'Aceh', 'Gayo Lues', '28 Okt', 5, 373, 1261, 175, D, '1 Nov'),
    ('sudah', 'Sumatera Utara', 'Deli Serdang', '27 Okt', 4, 7615, 29730, 596, D, '30 Okt'),
    ('sudah', 'Sumatera Utara', 'Langkat', '28 Okt', 5, 3157, 12431, D, D, '1 Nov'),
    ('sudah', 'Sumatera Utara', 'Kota Medan', '28 Okt', 3, 2405, 7930, D, D, '30 Okt'),
    ('sudah', 'Sumatera Utara', 'Kota Binjai', '29 Okt', 4, 1006, 3212, 16, D, '1 Nov'),
    ('sudah', 'Sumatera Utara', 'Asahan', '27 Okt', 2, 757, 3610, D, D, '28 Okt'),
    ('sudah', 'Sumatera Utara', 'Labuhanbatu', '24 Okt', 4, 520, D, D, D, '27 Okt'),
    ('sudah', 'Sumatera Utara', 'Tapanuli Tengah', '23 Okt', 4, 106, 424, D, D, '26 Okt'),
    ('sudah', 'Sumatera Utara', 'Serdang Bedagai', '29 Okt', 4, 31, D, D, D, '1 Nov'),
    ('sudah', 'Jawa Barat', 'Bandung Barat', '27 Okt', 2, 6, D, D, D, '28 Okt'),
    ('sudah', 'Jawa Barat', 'Cianjur', '30 Okt', 3, 1, 3, 5, D, '1 Nov'),
    ('sudah', 'Jawa Tengah', 'Sragen', '30 Okt', 1, 6, 29, D, D, '30 Okt'),
]
KEJADIAN_PROV = {'Aceh': 13, 'Sumatera Utara': 12, 'Jawa Barat': 3, 'Jawa Tengah': 3, 'Jawa Timur': 2}   # label peta deck 021126
SINGKAT = {'Aceh': 'Aceh', 'Sumatera Utara': 'Sumut', 'Jawa Barat': 'Jabar', 'Jawa Tengah': 'Jateng', 'Jawa Timur': 'Jatim'}


def f0(v):
    return '–' if v is None else f'{int(v):,}'.replace(',', '.')


# ======================================================================== rincian (desa, pengungsi)
def muat_rincian():
    R = json.load(open(os.environ.get('RINCIAN') or os.path.join(SINI, 'rincian.json'), encoding='utf-8'))
    out = {}
    for k in R['kejadian']:
        kab = re.sub(r'^(Kab\.|Kabupaten)\s+', '', k['kab']).strip()
        out[(k['status'], kab)] = k
    return out


def kec_list(r):
    return [k for k in (r or {}).get('kecamatan') or [] if k.get('nama')]


def n_kec(r):
    if not r:
        return None
    ks = [k for k in kec_list(r) if not k['nama'].startswith('(')]
    return max(len(ks), r.get('n_kec') or 0) or None


def n_desa(r):
    if not r:
        return None
    nd = sum(len(k.get('desa') or []) for k in kec_list(r))
    return max(nd, r.get('n_desa') or 0) or None


KOTA_KEL = {'Kota Bandung', 'Kota Medan', 'Kota Binjai'}   # wilayah terdampaknya kelurahan; Subulussalam dan Batu berdesa


def daerah(r, kab):
    """'4 desa di Kec. Wampu, 1 desa di Kec. Besitang' dari rincian; jumlah saja bila nama tidak ada."""
    unit = 'kel.' if kab in KOTA_KEL else 'desa'
    bag = []
    ks_ = [k for k in kec_list(r) if not k['nama'].startswith('(')]
    nd_ = (r or {}).get('n_desa')
    if ks_ and nd_ and not any(k.get('desa') for k in kec_list(r)):
        nama = [f"Kec. {k['nama']}" for k in ks_]
        return f"{nd_} {unit} di " + (', '.join(nama[:-1]) + ' dan ' + nama[-1] if len(nama) > 1 else nama[0])
    for k in kec_list(r):
        nd = len(k.get('desa') or [])
        nama = k['nama']
        if nama.startswith('('):
            if nd:
                bag.append(f'{nd} {unit} (kec. belum disebut)')
            continue
        bag.append(f'{nd} {unit} di Kec. {nama}' if nd else f'Kec. {nama}')
    if bag:
        return ', '.join(bag)
    nk, nd = (r or {}).get('n_kec'), (r or {}).get('n_desa')
    if nd and nk:
        return f'{nd} {unit} di {nk} kecamatan'
    if nk:
        return f'{nk} kecamatan'
    return '–'


def pengungsi(r, ungsi_lama):
    """(kk, jiwa): jiwa deck 021126 dipakai bila ada (angka yang sudah dipaparkan), KK dari rincian."""
    p = (r or {}).get('pengungsi') or {}
    kk, jw = p.get('kk'), p.get('jiwa')
    if jw is None:
        jw = ungsi_lama   # sumber rincian tanpa jiwa: angka deck 021126
    return kk, jw


# ======================================================================== ikon (registri mesin ppt-konsultan)
SKILL = os.environ.get('DECK_BNPB', os.path.expanduser('~/.claude/skills/ppt-konsultan/bnpb'))
sys.path.insert(0, os.path.join(SKILL, 'scripts'))
_TEMA = None


def ikon(konsep, token='kertas'):
    """PNG ikon garis Lucide dari tema.json proyek-bnpb (satu konsep satu glif, D-25)."""
    global _TEMA
    import ikon as _ik
    from tema import muat
    if _TEMA is None:
        _TEMA = muat(os.path.join(SKILL, 'assets', 'proyek-bnpb', 'tema.json'))
    return str(_ik.png(_TEMA, konsep, token, os.path.join(SINI, 'bahan', 'ikon')))


# ======================================================================== alat gambar
class Kanvas:
    def __init__(self, slide):
        self.s = slide

    def kotak(self, x, y, w, h, isi=None, garis=None, tebal=0.75, bentuk=MSO_SHAPE.RECTANGLE, radius=None):
        sh = self.s.shapes.add_shape(bentuk, Pt(x), Pt(y), Pt(w), Pt(h))
        if isi:
            sh.fill.solid(); sh.fill.fore_color.rgb = RGBColor.from_string(isi)
        else:
            sh.fill.background()
        if garis:
            sh.line.color.rgb = RGBColor.from_string(garis); sh.line.width = Pt(tebal)
        else:
            sh.line.fill.background()
        if bentuk == MSO_SHAPE.ROUNDED_RECTANGLE:
            sh.adjustments[0] = 0.5 if radius is None else min(0.5, radius / min(w, h))
        return sh

    def bulat(self, x, y, w, h, isi, garis=None, radius=None):
        return self.kotak(x, y, w, h, isi, garis, 0.75, MSO_SHAPE.ROUNDED_RECTANGLE, radius)

    def garis(self, x0, y0, x1, y1, warna=GARIS, tebal=0.75):
        ln = self.s.shapes.add_connector(1, Pt(x0), Pt(y0), Pt(x1), Pt(y1))
        ln.line.color.rgb = RGBColor.from_string(warna); ln.line.width = Pt(tebal)
        return ln

    def garis_datar(self, x0, x1, y, warna=GARIS, tebal=0.5):
        """Garis pemisah sebagai persegi tipis: garis mendatar lebar di bawah 85% tinggi slide dianggap kaki lama oleh
        salin_slide deck.py dan dibuang bersama semua isi di bawahnya (baris Kota Batu hilang, 4 Nov)."""
        return self.kotak(x0, y - tebal / 2, x1 - x0, tebal, warna)

    def gambar(self, path, x, y, w, h):
        return self.s.shapes.add_picture(path, Pt(x), Pt(y), Pt(w), Pt(h))

    def teks(self, x, y, w, h, runs, rata='l', jangkar='m', bungkus=True, spasi=None, kiri=0, kanan=0):
        tb = self.s.shapes.add_textbox(Pt(x), Pt(y), Pt(w), Pt(h))
        tf = tb.text_frame
        tf.word_wrap = bungkus
        tf.margin_left, tf.margin_right, tf.margin_top, tf.margin_bottom = Pt(kiri), Pt(kanan), 0, 0
        tf.vertical_anchor = {'t': MSO_ANCHOR.TOP, 'm': MSO_ANCHOR.MIDDLE, 'b': MSO_ANCHOR.BOTTOM}[jangkar]
        isi_par(tf, runs, rata, spasi)
        return tb

    def ikon_bulat(self, konsep, x, y, d=22, isi=NAVY, token='kertas'):
        """Bulatan berisi ikon (pola kepala panel mesin deck.py)."""
        self.kotak(x, y, d, d, isi, bentuk=MSO_SHAPE.OVAL)
        g = d * 0.56
        self.gambar(ikon(konsep, token), x + (d - g) / 2, y + (d - g) / 2, g, g)

    def nomor(self, x, y, n, d=11):
        self.kotak(x, y, d, d, NAVY, bentuk=MSO_SHAPE.OVAL)
        self.teks(x - 3, y, d + 6, d, [R(str(n), 6, PUTIH, True)], rata='c', bungkus=False)

    def pil(self, x, y, w, h, teks, isi, warna, konsep=None, token='kertas', pt=6.5, persegi=False):
        """Pil (atau blok bila persegi) berisi teks tebal, ikon opsional di kiri teks; teks dan ikon di tengah."""
        if persegi:
            self.kotak(x, y, w, h, isi)
        else:
            self.bulat(x, y, w, h, isi)
        if konsep:
            g = min(h * 0.6, 9)
            lt = len(teks) * pt * 0.56
            x0 = x + (w - (g + 3 + lt)) / 2
            self.gambar(ikon(konsep, token), x0, y + (h - g) / 2, g, g)
            self.teks(x0 + g + 3, y, lt + 8, h, [R(teks, pt, warna, True)], bungkus=False)
        else:
            self.teks(x, y, w, h, [R(teks, pt, warna, True)], rata='c', bungkus=False)


def isi_par(tf, runs, rata='l', spasi=None):
    """runs = [(teks, pt, warna, tebal[, spasi_huruf_pt])] dengan '\n' sebagai paragraf baru."""
    paras = [[]]
    for r in runs:
        if r == '\n':
            paras.append([])
        else:
            paras[-1].append(r)
    for i, pr in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = {'l': PP_ALIGN.LEFT, 'c': PP_ALIGN.CENTER, 'r': PP_ALIGN.RIGHT, 'j': PP_ALIGN.JUSTIFY}[rata]
        p.space_before = p.space_after = 0
        if spasi:
            p.line_spacing = spasi
        for r in pr:
            t, pt, w, b = r[:4]
            rn = p.add_run(); rn.text = t
            rn.font.name = F; rn.font.size = Pt(pt); rn.font.bold = b
            rn.font.color.rgb = RGBColor.from_string(w)
            if len(r) > 4 and r[4]:
                rn.font._rPr.set('spc', str(int(r[4] * 100)))
        ukur(p, pr)


def ukur(p, pr):
    """Ukuran tanda akhir paragraf = huruf terkecil di paragraf itu; tanpa ini paragraf kosong memakai 18 pt bawaan."""
    sz = str(int(min([x[1] for x in pr] or [6]) * 100))
    e = p._p.get_or_add_endParaRPr(); e.set('sz', sz)
    for r in p._p.findall(qn('a:r')):
        if not (r.findtext(qn('a:t')) or ''):
            p._p.remove(r)


def R(t, pt=9, w=TEKS, b=False, spc=None):
    return (t, pt, w, b, spc) if spc else (t, pt, w, b)


def nilai(v, pt=8, warna=TEKS):
    return [R(f0(v), pt, TEKS3 if v is None else warna, v is not None)]


PIL_KONDISI = {'belum': ('Belum surut', BAHAYA_PITA, MERAH), 'sudah': ('Sudah surut', BASAH_PITA, AIR_TUA)}


# ======================================================================== tabel bergaya referensi (bentuk, bukan tabel bawaan)
def gambar_tabel(k, x, y, kol, baris, grup=None, kepala_h=18, pt_kepala=6.5):
    """Tabel ala deck 021126: kepala rounded rectangle navy berhuruf kapital renggang, kolom berpita (tint) di badan,
    baris provinsi peach, nomor bulat navy, pil kondisi seragam, garis baris abu, baris jumlah navy membulat.
    Digambar sebagai bentuk supaya tinggi tiap baris pasti (tabel bawaan PowerPoint/LibreOffice menggeser tinggi baris).

    kol   = [{'w', 'judul', 'sub', 'rata', 'pita'}]          pita = warna tint badan kolom
    grup  = [(c0, c1, label, ikon)]                         kepala di atas kepala, berikon dan bergaris kurung
    baris = [{'jenis': 'data'|'prov'|'total', 'h', 'sel': [...], 'pisah': 'tebal'|'tipis'|None, 'pita': bool}]
      sel: runs | ('no', n) | ('no_teks', n, runs) | ('pil', status) | ('blok', teks, isi, warna, ikon, token) | None
    Mengembalikan y bawah tabel."""
    xs = [x]
    for c in kol:
        xs.append(xs[-1] + c['w'])
    W = xs[-1] - x
    yy = y
    if grup:
        for c0, c1, label, konsep in grup:
            gx, gw = xs[c0], xs[c1 + 1] - xs[c0]
            lt = len(label) * 6.5 * 0.66
            ix = gx + (gw - (10 + 4 + lt)) / 2
            k.gambar(ikon(konsep, 'navy'), ix, yy + 1, 10, 10)
            k.teks(ix + 14, yy, lt + 10, 12, [R(label, 6.5, NAVY, True, 0.6)], bungkus=False)
            k.garis(gx + 4, yy + 15, gx + gw - 4, yy + 15, NAVY, 1.0)
        yy += 19
    k.bulat(x, yy, W, kepala_h, NAVY, radius=4)
    for i, c in enumerate(kol):
        if not c.get('judul'):
            continue
        runs = [R(c['judul'], pt_kepala, PUTIH, True, 0.6)]
        if c.get('sub'):
            runs += ['\n', R(c['sub'], 6, DI_NAVY, False)]
        rata = c.get('rata', 'c')
        k.teks(xs[i], yy, c['w'], kepala_h, runs, rata=rata, kiri=6 if rata == 'l' else 1, kanan=1, spasi=0.9)
    yy += kepala_h + 2
    for b in baris:
        h, jenis = b['h'], b.get('jenis', 'data')
        if jenis == 'prov':
            k.kotak(x, yy, W, h, KELOMPOK)
            k.teks(x, yy, W, h, b['sel'], kiri=6)
            yy += h
            continue
        if jenis == 'total':
            yy += 2
            k.bulat(x, yy, W, h, NAVY, radius=4)
        else:
            for i, c in enumerate(kol):
                if c.get('pita') and b.get('pita', True):
                    k.kotak(xs[i], yy, c['w'], h, c['pita'])
        for i, (c, s) in enumerate(zip(kol, b['sel'])):
            if s is None:
                continue
            cx, cw, rata = xs[i], c['w'], c.get('rata', 'c')
            if isinstance(s, tuple) and s and s[0] == 'no':
                k.nomor(cx + (cw - 11) / 2, yy + (h - 11) / 2, s[1])
            elif isinstance(s, tuple) and s and s[0] == 'no_teks':
                k.nomor(cx + 6, yy + (h - 11) / 2, s[1])
                k.teks(cx + 22, yy, cw - 24, h, s[2])
            elif isinstance(s, tuple) and s and s[0] == 'pil':
                teks, isi, warna = PIL_KONDISI[s[1]]
                ph = min(12, h - 2.5)
                k.pil(cx + 5, yy + (h - ph) / 2, cw - 10, ph, teks, isi, warna)
            elif isinstance(s, tuple) and s and s[0] == 'blok':
                _, teks, isi, warna, konsep, token = s
                k.pil(cx + 3, yy + 3, cw - 6, h - 6, teks, isi, warna, konsep, token, 7, persegi=True)
            else:
                k.teks(cx, yy, cw, h, s, rata=rata, kiri=6 if rata == 'l' else 2, kanan=3,
                       jangkar=b.get('jangkar', 'm'))
        yy += h
        if jenis == 'data' and b.get('pisah', 'tipis'):
            tebal = b.get('pisah') == 'tebal'
            k.garis_datar(x if tebal or not b.get('garis_dari') else xs[b['garis_dari']], x + W, yy,
                          GARIS, 0.75 if tebal else 0.5)
    return yy


def tinggi_teks(teks, lebar_pt, pt=7.5, satu=13, per=9.2):
    n = baris_teks(teks, lebar_pt, pt)
    return satu if n == 1 else per * n + 4


# ======================================================================== bingkai slide isi
class Isi:
    def __init__(self):
        self.P = Presentation(BASIS)
        lay = self.P.slides[1].slide_layout
        logo = next(sh for sh in self.P.slides[1].shapes if sh.shape_type == 13 and sh.left > Pt(800))
        self.logo_blob = logo.image.blob
        self.logo_geo = (logo.left, logo.top, logo.width, logo.height)
        self.lay = lay
        lst = self.P.slides._sldIdLst
        for sid in list(lst):
            self.P.part.drop_rel(sid.get(qn('r:id'))); lst.remove(sid)
        self.n = 0

    def slide(self, judul_runs):
        import io
        s = self.P.slides.add_slide(self.lay)
        for ph in list(s.placeholders):
            ph._element.getparent().remove(ph._element)
        k = Kanvas(s)
        k.teks(43, 23, 823, 59, judul_runs, jangkar='m', spasi=0.95)
        x, y, w, h = self.logo_geo
        s.shapes.add_picture(io.BytesIO(self.logo_blob), x, y, w, h)
        k.garis(43, 95, 917, 95, TEKS, 0.75)
        self.n += 1
        return s, k

    def simpan(self, path):
        # gaya bawaan bentuk (p:style berisi schemeClr) ditolak gerbang D-9: semua warna wajib hex tema
        for sl in self.P.slides:
            for st in list(sl.shapes._spTree.iter(qn('p:style'))):
                st.getparent().remove(st)
            assert 'schemeClr' not in etree.tostring(sl.shapes._spTree).decode(), 'schemeClr tersisa'
        self.P.save(path)


def judul(teks, pt=22):
    """'Terdapat [33] Laporan ...' : bagian dalam [..] oranye."""
    out = []
    for i, bag in enumerate(re.split(r'\[([^\]]+)\]', teks)):
        if bag:
            out.append(R(bag, pt, ORANYE if i % 2 else NAVY, True))
    return out


def kepala_panel(k, x, y, w, teks, konsep, kanan=None):
    """Kepala panel: bulatan navy berikon, judul tebal, garis bawah; kanan = teks kecil rata kanan."""
    k.ikon_bulat(konsep, x, y + 1, 22)
    k.teks(x + 30, y, w - 30, 24, [R(teks, 11, TEKS, True)])
    if kanan:
        k.teks(x + w - 300, y, 300, 24, [R(kanan, 7.5, TEKS3)], rata='r')
    k.garis(x, y + 28, x + w, y + 28, TEKS, 0.75)


def regang(th, target, maks=1.6):
    """Tinggi baris direnggangkan rata sampai tabel mengisi target pt (ruang mati slide paling banyak 25%)."""
    sisa = target - sum(th)
    if sisa <= 0:
        return th
    f = min(maks, 1 + sisa / sum(th))
    return [round(h * f, 1) for h in th]


def baris_teks(teks, lebar_pt, pt=7.5):
    """Taksiran jumlah baris teks Roboto (rata-rata 0,52 em per huruf), dengan sedikit cadangan."""
    per = max(1, int((lebar_pt - 9) / (pt * 0.48)))   # 0,48 em: kalibrasi render Roboto 7-7,5 pt (4 Nov)
    n, cur = 1, 0
    for w in teks.split(' '):
        if cur + len(w) + (1 if cur else 0) > per:
            n += 1; cur = len(w)
        else:
            cur += len(w) + (1 if cur else 0)
    return n


# ======================================================================== slide 3: ringkasan per provinsi
def s_ringkasan(I, rin):
    prov = list(KEJADIAN_PROV)
    agg = {p: dict(kab=set(), belum=0, kk=0, jiwa=0, ungsi=0, kec=0, desa=0, ada=set()) for p in prov}
    for st, p, kab, mulai, lama, kk, jw, us, tg, kb in BARIS:
        a = agg[p]; a['kab'].add(kab); a['belum'] += st == 'belum'
        r = rin.get((st, kab))
        u = pengungsi(r, us)[1]
        a['kk'] += kk or 0; a['jiwa'] += jw or 0; a['ungsi'] += u or 0
        a['ada'] |= {n for n, v in (('kk', kk), ('jiwa', jw), ('ungsi', u)) if v is not None}
        a['kec'] += n_kec(r) or 0; a['desa'] += n_desa(r) or 0
    n_lap = sum(KEJADIAN_PROV.values()); n_belum = sum(a['belum'] for a in agg.values())
    s, k = I.slide(judul(f'Terdapat [{n_lap}] Laporan Banjir dalam Sepekan, [{n_belum}] Wilayah Belum Dilaporkan Surut per [1 November 2026]'))
    kepala_panel(k, 43, 104, 352, 'Sebaran laporan banjir', 'banjir')
    k.gambar(os.path.join(SINI, 'bahan', 'peta-s3.png'), 56, 138, 326, 333)
    ly = 476
    k.teks(56, ly, 88, 12, [R('Angka = kejadian', 7.5, TEKS, True)])
    k.kotak(146, ly + 2, 9, 9, MERAH); k.teks(159, ly, 112, 12, [R('Belum dilaporkan surut', 7.5, TEKS2)])
    k.kotak(276, ly + 2, 9, 9, '68A8E0'); k.teks(289, ly, 80, 12, [R('Sudah surut', 7.5, TEKS2)])
    x0 = 415
    kepala_panel(k, x0, 104, 502, 'Per provinsi', 'wilayah')
    kol = [dict(w=104, judul='PROVINSI', rata='l', pita=KAB_TINT), dict(w=52, judul='KAB/KOTA'), dict(w=60, judul='KECAMATAN'),
           dict(w=56, judul='DESA/KEL.'), dict(w=62, judul='BELUM SURUT', sub='kab/kota', pita=BAHAYA_PITA),
           dict(w=58, judul='KK', sub='terdampak'), dict(w=58, judul='JIWA', sub='terdampak'), dict(w=52, judul='MENGUNGSI', sub='jiwa')]
    baris, tot = [], dict(kab=0, belum=0, kk=0, jiwa=0, ungsi=0, kec=0, desa=0)
    for i, p in enumerate(prov, 1):
        a = agg[p]
        vals = [len(a['kab']), a['kec'] or None, a['desa'] or None, a['belum']] + [a[n] if n in a['ada'] else None for n in ('kk', 'jiwa', 'ungsi')]
        sel = [('no_teks', i, [R(SINGKAT[p], 13, NAVY, True)])]
        sel += [nilai(v, 13, MERAH if c == 3 else TEKS) for c, v in enumerate(vals)]
        baris.append(dict(h=52, sel=sel))
        for kk_, v in zip(('kab', 'kec', 'desa', 'belum', 'kk', 'jiwa', 'ungsi'), vals):
            tot[kk_] += v or 0
    baris.append(dict(jenis='total', h=20, sel=[[R('Jumlah', 8, PUTIH, True)]] +
                      [[R(f0(tot[n]), 8, PUTIH, True)] for n in ('kab', 'kec', 'desa', 'belum', 'kk', 'jiwa', 'ungsi')]))
    kol[0]['rata'] = 'l'
    yb = gambar_tabel(k, x0, 140, kol, baris, grup=[(1, 4, 'WILAYAH TERDAMPAK', 'wilayah'), (5, 7, 'DAMPAK', 'jiwa')], kepala_h=24)
    k.teks(x0, yb + 5, 502, 11, [R('Kecamatan dan desa/kelurahan dari kab/kota yang rinciannya sudah dilaporkan; rincian per desa di Lampiran L1.', 7, TEKS3)])


# ======================================================================== slide 4-5: tabel kab/kota
def kolom_kab():
    kol = [dict(w=18), dict(w=104, judul='KAB/KOTA', rata='l', pita=KAB_TINT), dict(w=0, judul='DAERAH TERDAMPAK', rata='l'),
           dict(w=40, judul='MULAI'), dict(w=34, judul='LAMA', sub='hari'), dict(w=44, judul='KK'), dict(w=46, judul='JIWA'),
           dict(w=40, judul='KK'), dict(w=42, judul='JIWA'), dict(w=50, judul='TINGGI AIR'), dict(w=68, judul='KONDISI'),
           dict(w=52, judul='KABAR', sub='terakhir')]
    kol[2]['w'] = 874 - sum(c['w'] for c in kol)
    return kol


def s_tabel_kab(I, rin, status, judul_teks, kepala_teks):
    rows = [b for b in BARIS if b[0] == status]
    kol = kolom_kab()
    prov_urut = []
    for b in rows:
        if b[1] not in prov_urut:
            prov_urut.append(b[1])
    tinggi = {b[2]: tinggi_teks(daerah(rin.get((status, b[2])), b[2]), kol[2]['w'], 7, 12.5, 8.6) for b in rows}
    H_PROV, MAKS = 12.5, 310
    halaman, cur, cur_h = [], [], 0
    for p in prov_urut:
        blok = [b for b in rows if b[1] == p]
        h = H_PROV + sum(tinggi[b[2]] for b in blok)
        if cur and cur_h + h > MAKS:
            halaman.append(cur); cur, cur_h = [], 0
        cur.append((p, blok)); cur_h += h
    halaman.append(cur)
    no = 0
    for hi, hal in enumerate(halaman):
        jt = judul_teks + (f' (lanjutan {hi + 1}/{len(halaman)})' if len(halaman) > 1 and hi else '')
        s, k = I.slide(judul(jt))
        kepala_panel(k, 43, 104, 874, kepala_teks, 'banjir', kanan='Lama = hari sejak banjir mulai sampai 1 Nov 2026')
        tot_h = sum(H_PROV + sum(tinggi[b[2]] for b in bl) for _, bl in hal)
        f = min(1.6, max(1.0, MAKS / tot_h))
        baris = []
        for p, bl in hal:
            baris.append(dict(jenis='prov', h=H_PROV * f, sel=[R(p, 8, TEKS, True), R(f'   {len(bl)} kab/kota', 6.5, TEKS2)]))
            for b in bl:
                no += 1
                st, pv, kab, mulai, lama, kk, jw, us, tg, kb = b
                rr = rin.get((st, kab))
                ukk, ujw = pengungsi(rr, us)
                dt = daerah(rr, kab)
                sel = [('no', no), [R(kab, 8, TEKS, True)], [R(dt, 7, TEKS3 if dt == '–' else TEKS2)], [R(mulai, 7.5, TEKS2)],
                       nilai(lama), nilai(kk), nilai(jw), nilai(ukk), nilai(ujw),
                       [R(tg, 7.5, TEKS, True)] if tg else nilai(None), ('pil', st), [R(kb, 7.5, TEKS, True)]]
                baris.append(dict(h=tinggi[kab] * f, sel=sel))
        gambar_tabel(k, 43, 137, kol, baris, grup=[(5, 6, 'TERDAMPAK', 'jiwa'), (7, 8, 'PENGUNGSI', 'pengungsi')], kepala_h=22)


# ======================================================================== slide 6: status siaga
SIAGA_DATA = [
    ('Aceh', [('Nagan Raya', 'Sudah banjir', ['Waspada', 'Siaga', 'Siaga', 'Siaga'], 115),
              ('Aceh Barat', 'Sudah banjir', ['Siaga', 'Waspada', 'Waspada', 'Waspada'], 82)]),
    ('Bengkulu', [('Mukomuko', 'Belum', ['Siaga', 'Siaga', 'Siaga', 'Waspada'], 82)]),
    ('Kalimantan Barat', [('Ketapang', 'Belum', ['Siaga', 'Siaga', 'Aman', 'Waspada'], 92)]),
    ('Jawa Timur', [('Lumajang', 'Belum', ['Siaga', 'Siaga', 'Aman', 'Aman'], 89)]),
    ('Sumatera Barat', [('Pesisir Selatan', 'Belum', ['Waspada', 'Waspada', 'Siaga', 'Waspada'], 86)]),
]
# isian, warna teks, ikon, token warna ikon; Aman dan Belum tanpa ikon
GAYA_STATUS = {'Waspada': (KERING_PITA, '6E5424', 'peringatan', 'emas-teks'), 'Siaga': (SIAGA, PUTIH, 'peringatan', 'kertas'),
               'Aman': (NETRAL_MUDA, TEKS3, None, None), 'Sudah banjir': (BAHAYA_PITA, MERAH, 'banjir', 'merah'),
               'Belum': (NETRAL_MUDA, TEKS3, None, None)}


def s_siaga(I):
    s, k = I.slide(judul('6 Wilayah Berstatus Siaga Banjir hingga [5 November 2026], Dua di Antaranya Sudah Banjir Sepekan Ini'))
    kepala_panel(k, 43, 104, 874, 'Status banjir harian per kab/kota', 'cuaca-ekstrem', kanan='Prakiraan berbasis hujan tiga hari dan debit sungai')
    kol = [dict(w=170, judul='KAB/KOTA', rata='l', pita=KAB_TINT), dict(w=118, judul='BANJIR SEPEKAN')] + \
          [dict(w=114, judul=f'{d} NOV') for d in (2, 3, 4, 5)] + [dict(w=130, judul='HUJAN TIGA HARI', sub='mm, 2 Nov')]
    baris, no = [], 0
    for p, bl in SIAGA_DATA:
        baris.append(dict(jenis='prov', h=14, sel=[R(p, 8.5, TEKS, True), R(f'   {len(bl)} kab/kota', 6.5, TEKS2)]))
        for kab, bj, st, mm in bl:
            no += 1
            sel = [('no_teks', no, [R(kab, 10, NAVY, True)])]
            for v in [bj] + st:
                isi, warna, konsep, token = GAYA_STATUS[v]
                sel.append(('blok', v, isi, warna, konsep, token))
            sel.append([R(str(mm), 11, NAVY, True)])
            baris.append(dict(h=26, sel=sel))
    gambar_tabel(k, 43, 137, kol, baris, grup=[(2, 5, 'PRAKIRAAN STATUS HARIAN', 'kalender')], kepala_h=22)
    # arti status
    ay = 432
    k.garis_datar(43, 917, ay, TEKS, 0.75)
    k.teks(55, ay + 5, 200, 12, [R('ARTI STATUS', 6.5, TEKS3, True, 0.6)])
    arti = [('Waspada', WASPADA, 'Hujan tiga hari 40 mm atau lebih, atau sungai mulai naik.'),
            ('Siaga', SIAGA, 'Hujan tiga hari 80 mm di wilayah rawan banjir, atau debit sungai tinggi.'),
            ('Awas', MERAH, 'Hujan tiga hari 120 mm di wilayah sangat rawan, atau sungai meluap.')]
    for i, (n, w, t_) in enumerate(arti):
        x = 55 + i * 288
        k.ikon_bulat('peringatan', x, ay + 22, 26, w)
        k.teks(x + 34, ay + 19, 240, 13, [R(n, 10, TEKS, True)])
        k.teks(x + 34, ay + 33, 240, 24, [R(t_, 7.5, TEKS2)], jangkar='t')
        if i:
            k.garis(x - 10, ay + 20, x - 10, ay + 56, GARIS, 0.75)


# ======================================================================== slide penanganan: upaya BNPB dan BPBD sepekan
# Disuling dari kolom upaya dan pihak terlibat logbook Pusdalops (22-29 Okt), laphar Koordalops 30-31 Okt, dan "Kondisi
# Mutakhir" WA Koordalops 1-4 Nov untuk 29 kab/kota di deck. Kolom kebutuhan, kendala, dan rekomendasi di sumber yang sama
# kosong untuk kejadian sepekan ini kecuali kebutuhan Kota Bandung.
# 4 Nov pemilik: tanpa batang progres (rasio terhadap 29 kab/kota terbaca sebagai cakupan, padahal hanya "disebut di laporan");
# isi = apa yang dikerjakan di mana.
TINDAKAN = [   # (ikon, judul, [(kab/kota, apa yang dikerjakan)])
    ('infrastruktur', 'Alat berat dan tanggul', [
        ('Aceh Tenggara', 'alat berat BPJN dan Satgas PRR; tanggul sementara Sungai Lawe Kisam'),
        ('Aceh Tengah', '1 ekskavator membersihkan drainase dan gorong-gorong'),
        ('Langkat', 'ukur tanggul jebol bersama PUPR, geobag disiapkan'),
        ('Deli Serdang', 'tanggul jebol Dusun II Punden Rejo, koordinasi Bendungan Perdamean')]),
    ('rumah', 'Pembersihan', [
        ('Kota Bandung', 'lumpur di rumah warga'),
        ('Kota Batu', 'sampah penyumbat drainase'),
        ('Mandailing Natal', 'batang kayu bawaan Sungai Aek Kitang'),
        ('Tapanuli Tengah', 'bersama Satpol PP dan TNI'),
        ('Gayo Lues', 'warga membersihkan lumpur setelah air surut')]),
    ('pengungsi', 'Evakuasi warga', [
        ('Gayo Lues', 'ke titik kumpul; 175 jiwa di Masjid An-Nur'),
        ('Mandailing Natal', 'oleh TRC BPBD'),
        ('Pidie Jaya', 'Tim SAR siaga evakuasi')]),
    ('jiwa', 'Sembako dan dapur umum', [
        ('Aceh Tengah', 'sembako untuk pengungsi'),
        ('Asahan', 'sembako lewat Polres'),
        ('Deli Serdang', 'dapur umum Kec. Tanjung Morawa dan Dinsos')]),
    ('kesehatan', 'Layanan kesehatan', [
        ('Mandailing Natal', 'posko kesehatan di lokasi terdampak')]),
    ('regulasi', 'Status darurat', [
        ('Aceh Selatan', 'Tanggap Darurat 30 Okt s.d. 12 Nov'),
        ('Aceh Barat', 'Siaga Darurat, menunggu tanda tangan Bupati')]),
]
PENDATAAN = ['Kota Subulussalam', 'Aceh Barat', 'Aceh Selatan', 'Aceh Tengah', 'Aceh Tenggara', 'Nagan Raya', 'Pidie Jaya', 'Asahan',
             'Dairi', 'Deli Serdang', 'Kota Binjai', 'Labuhanbatu', 'Mandailing Natal', 'Serdang Bedagai', 'Tapanuli Tengah',
             'Kota Bandung', 'Bandung Barat', 'Banyumas', 'Sragen', 'Kota Batu']
PEMANTAUAN = ['Aceh Barat', 'Aceh Selatan', 'Aceh Tengah', 'Aceh Tenggara', 'Gayo Lues', 'Langkat', 'Trenggalek']
PIHAK = [   # (label, kab/kota yang menyebutnya)
    ('BPBD kab/kota', sorted(set(PENDATAAN) | set(PEMANTAUAN))),
    ('Pemerintah desa/kecamatan', ['Pidie Jaya', 'Nagan Raya', 'Labuhanbatu', 'Deli Serdang', 'Kota Batu', 'Mandailing Natal',
                                   'Trenggalek', 'Sragen', 'Banyumas', 'Kota Bandung', 'Aceh Selatan']),
    ('Masyarakat dan relawan', ['Aceh Barat', 'Pidie Jaya', 'Nagan Raya', 'Aceh Selatan', 'Kota Batu', 'Mandailing Natal', 'Trenggalek',
                                'Sragen', 'Banyumas', 'Tapanuli Tengah', 'Kota Bandung']),
    ('TNI dan Polri', ['Pidie Jaya', 'Asahan', 'Aceh Selatan', 'Kota Batu', 'Mandailing Natal', 'Trenggalek', 'Banyumas', 'Tapanuli Tengah']),
    ('BPBD/BPBA provinsi', ['Nagan Raya', 'Aceh Tenggara', 'Asahan']),
    ('Dinas PU', ['Langkat', 'Deli Serdang', 'Aceh Tenggara']),
    ('Tim BNPB', ['Aceh Barat', 'Pidie Jaya']),
]
N_KAB_DECK = len({b[2] for b in BARIS})
TANPA_UPAYA = ['Aceh Barat Daya', 'Aceh Jaya', 'Aceh Utara', 'Cilacap', 'Kota Medan', 'Cianjur']


def s_penanganan(I):
    fisik = {k for kon, _, ls in TINDAKAN if kon != 'regulasi' for k, _ in ls}   # status darurat = administratif, bukan fisik
    ada = fisik | {k for _, _, ls in TINDAKAN for k, _ in ls} | set(PENDATAAN) | set(PEMANTAUAN)
    assert not (set(TANPA_UPAYA) & ada) and len(ada) + len(TANPA_UPAYA) == N_KAB_DECK, (len(ada), N_KAB_DECK)
    n_data = len(ada - fisik)
    s, k = I.slide(judul(f'Tindakan Fisik Tercatat di [{len(fisik)}] Kab/Kota, [{n_data}] Lainnya Baru Kaji Cepat dan Pemantauan'))
    API_PITA = 'FBE7D6'
    # ---- kiri: kartu tindakan di lapangan (apa dikerjakan di mana)
    xl, wl = 43, 556
    kepala_panel(k, xl, 104, wl, 'Tindakan di lapangan', 'tanggap-darurat', kanan='BPBD kab/kota bersama unsur daerah')
    cw, gk = (wl - 12) / 2, 12
    KEPALA_K, PAD = 32, 9

    def tinggi_butir(kb, apa):
        return 10.5 * baris_teks(f'{kb} {apa}', cw - 24, 8) + 7

    tinggi_baris = [max(KEPALA_K + sum(tinggi_butir(kb, apa) for kb, apa in ls) + PAD for _, _, ls in TINDAKAN[r * 2:r * 2 + 2])
                    for r in range(3)]
    # tinggi kartu = isinya; sisa tinggi panel dibagi ke celah antarbaris (kartu tidak berongga, pemilik 4 Nov)
    gb = min(20, max(10, (345 - sum(tinggi_baris)) / 2))
    y = 140
    for r in range(3):
        h = tinggi_baris[r]
        for c, (kon, jud, ls) in enumerate(TINDAKAN[r * 2:r * 2 + 2]):
            x = xl + c * (cw + gk)
            k.bulat(x, y, cw, h, NETRAL_MUDA, radius=5)
            k.ikon_bulat(kon, x + 9, y + 7, 18)
            k.teks(x + 34, y + 6, cw - 110, 20, [R(jud, 10.5, NAVY, True)])
            k.teks(x + cw - 84, y + 6, 74, 20, [R(str(len(ls)), 12, ORANYE, True), R(' kab/kota', 7, TEKS3)], rata='r', bungkus=False)
            k.garis_datar(x + 9, x + cw - 9, y + KEPALA_K - 2, PUTIH, 1.2)
            yy = y + KEPALA_K + 2
            for i, (kb, apa) in enumerate(ls):
                hh = tinggi_butir(kb, apa)
                k.teks(x + 12, yy, cw - 24, hh, [R(kb, 8.5, NAVY, True), R(f'   {apa}', 8, TEKS2)], jangkar='t')
                yy += hh
                if i < len(ls) - 1:
                    k.garis_datar(x + 12, x + cw - 12, yy - 3.5, NETRAL_PITA, 0.5)
        y += h + gb
    y_dasar = y - gb
    # ---- kanan atas: pendataan dan pemantauan (dua angka, tanpa batang)
    xr, wr = 619, 298
    kepala_panel(k, xr, 104, wr, 'Pendataan dan pemantauan', 'ringkasan')
    for i, (n, lab) in enumerate(((len(PENDATAAN), 'kab/kota kaji cepat dan pendataan'),
                                  (len(PEMANTAUAN), 'kab/kota pantau tinggi air dan siaga'))):
        x = xr + i * (wr / 2 + 4)
        k.teks(x, 138, 46, 32, [R(str(n), 26, NAVY, True)])
        k.teks(x + 46, 140, wr / 2 - 52, 28, [R(lab, 8, TEKS2)])
    # ---- kanan tengah: pihak terlibat (chip berangka)
    kepala_panel(k, xr, 182, wr, 'Pihak yang terlibat', 'lembaga', kanan='angka = kab/kota')
    cx, cy = xr, 218
    for lab, ks in PIHAK:
        bnpb = lab == 'Tim BNPB'
        w = len(lab) * 4.1 + 32
        if cx + w > xr + wr:
            cx, cy = xr, cy + 21
        k.bulat(cx, cy, w, 17, ORANYE if bnpb else PUTIH, None if bnpb else GARIS)
        k.teks(cx + 8, cy, w - 10, 17, [R(lab, 7, PUTIH if bnpb else TEKS, True), R(f'  {len(ks)}', 8, PUTIH if bnpb else ORANYE, True)], bungkus=False)
        cx += w + 5
    # ---- kanan bawah: perlu tindak lanjut, berakhir sejajar dasar kartu kiri
    yt = cy + 31
    kepala_panel(k, xr, yt, wr, 'Perlu tindak lanjut', 'peringatan')
    butir = [('lembaga', 'Pendampingan BNPB', 'baru tercatat di Aceh Barat dan Pidie Jaya (3 sampai 4 Nov)'),
             ('rumah', 'Kebutuhan Kota Bandung', '50 karung pasir dan alat pembersih; kirmir roboh perlu ditutup'),
             ('data', f'{len(TANPA_UPAYA)} kab/kota tanpa catatan upaya', ', '.join(TANPA_UPAYA))]
    y = yt + 36
    h = (y_dasar - y) / len(butir)
    for i, (kon, jud, isi) in enumerate(butir):
        k.ikon_bulat(kon, xr, y + 1, 20, API_PITA, 'oranye')
        k.teks(xr + 28, y, wr - 28, 13, [R(jud, 9, TEKS, True)])
        k.teks(xr + 28, y + 14, wr - 28, h - 18, [R(isi, 8, TEKS2)], jangkar='t')
        y += h
        if i < len(butir) - 1:
            k.garis_datar(xr + 28, xr + wr, y - 6, NETRAL_PITA, 0.5)


# ======================================================================== slide 7: rekomendasi
REKOM = [
    ('data', 'Lengkapi pendataan wilayah', 'Berkoordinasi dengan BPBD di tujuh kab/kota untuk melengkapi data dan informasi, termasuk jumlah KK dan jiwa terdampak serta ketinggian banjir.', ['BPBD Aceh', 'BPBD Sumatera Utara', 'Pusdalops BNPB']),
    ('tanggap-darurat', 'Dukung wilayah yang masih tergenang', 'Berkoordinasi terkait logistik dan bantuan untuk wilayah yang masih tergenang sampai genangan surut.', ['BPBD kab/kota', 'Deputi Penanganan Darurat']),
    ('regulasi', 'Sepakati metode luas genangan', 'Berkoordinasi dengan BPBD untuk menyepakati metode penentuan luas genangan dan penetapan status surut.', ['BPBD provinsi', 'Pusdalops BNPB']),
    ('peringatan', 'Siagakan wilayah berstatus Siaga', 'Berkoordinasi dengan BMKG dan BPBD untuk memantau hujan harian dan menyampaikan peringatan dini ke desa yang pekan ini tergenang.', ['BPBD Aceh', 'BMKG']),
    ('pascabencana', 'Percepat pemulihan Sumatera Utara', 'Berkoordinasi dengan BPBD Sumatera Utara untuk pembersihan lumpur dan pendataan rumah rusak di wilayah yang sudah surut.', ['BPBD Sumatera Utara', 'Deputi Rehabilitasi dan Rekonstruksi']),
]


def s_rekom(I):
    s, k = I.slide(judul('Rekomendasi Rencana Tindak Lanjut Sepekan ([7 hari]) ke Depan'))
    k.bulat(43, 102, 874, 18, NAVY, radius=4)
    for x, w, h in ((43, 290, 'LANGKAH'), (345, 330, 'RINCIAN'), (690, 227, 'PEMANGKU KEPENTINGAN')):
        k.teks(x, 102, w, 18, [R(h, 6.5, PUTIH, True, 0.6)], rata='c')
    y0, hb = 122, 73
    for i, (kon, lk, rc, pk) in enumerate(REKOM):
        y = y0 + i * hb
        k.ikon_bulat(kon, 52, y + hb / 2 - 15, 30)
        k.teks(90, y, 245, hb, [R(f'{i + 1:02d}  ', 9, ORANYE, True), R(lk, 11, NAVY, True)])
        k.teks(345, y, 330, hb, [R(rc, 10, TEKS2)], rata='j')
        baris_chip, cx = [[]], 690
        for p in pk:
            w = 22 + len(p) * 3.75
            if cx + w > 917 and baris_chip[-1]:
                baris_chip.append([]); cx = 690
            baris_chip[-1].append((p, cx, w)); cx += w + 5
        cy = y + hb / 2 - (len(baris_chip) * 17 - 3) / 2
        j = 0
        for bc in baris_chip:
            for p, cx, w in bc:
                utama = j == 0
                k.bulat(cx, cy, w, 14, NAVY if utama else PUTIH, None if utama else GARIS)
                k.gambar(ikon('lembaga', 'kertas' if utama else 'navy'), cx + 5, cy + 3, 8, 8)
                k.teks(cx + 16, cy, w - 18, 14, [R(p, 6.5, PUTIH if utama else TEKS, True)], bungkus=False)
                j += 1
            cy += 17
        k.garis_datar(43, 917, y + hb, GARIS if i < len(REKOM) - 1 else TEKS, 0.5 if i < len(REKOM) - 1 else 0.75)


# ======================================================================== lampiran L1: rincian sampai desa
def s_lampiran_desa(I, rin):
    """Satu baris = satu kecamatan; desa dijajar dengan KK/jiwa bila ada. Dibagi rata ke beberapa halaman."""
    kol = [dict(w=18), dict(w=116, judul='KAB/KOTA', rata='l', pita=KAB_TINT), dict(w=116, judul='KECAMATAN', rata='l'),
           dict(w=0, judul='DESA/KELURAHAN', sub='beserta angka yang dilaporkan', rata='l'),
           dict(w=48, judul='KK'), dict(w=52, judul='JIWA'), dict(w=70, judul='KONDISI')]
    kol[3]['w'] = 874 - sum(c['w'] for c in kol)
    item = []
    for b in BARIS:
        st, pv, kab = b[0], b[1], b[2]
        r = rin.get((st, kab))
        ks = kec_list(r)
        if not ks:
            nk, nd = (r or {}).get('n_kec'), (r or {}).get('n_desa')
            ket = (f'{nd} desa/kel. di {nk} kecamatan, nama belum dilaporkan' if nd and nk else
                   f'{nk} kecamatan, nama belum dilaporkan' if nk else 'Rincian kecamatan dan desa belum dilaporkan')
            item.append((st, pv, kab, '–', ket, None, None, True))
            continue
        for kc in ks:
            ds = kc.get('desa') or []
            nama = []
            for d_ in ds:
                ext = []
                if d_.get('kk') is not None:
                    ext.append(f"{f0(d_['kk'])} KK")
                if d_.get('jiwa') is not None:
                    ext.append(f"{f0(d_['jiwa'])} jiwa")
                if d_.get('tinggi_air'):
                    ext.append(d_['tinggi_air'])
                nama.append(d_['nama'] + (f' ({", ".join(ext)})' if ext else ''))
            kk_ = sum(d_['kk'] for d_ in ds if d_.get('kk') is not None) if any(d_.get('kk') is not None for d_ in ds) else None
            jw_ = sum(d_['jiwa'] for d_ in ds if d_.get('jiwa') is not None) if any(d_.get('jiwa') is not None for d_ in ds) else None
            kec = kc['nama'] if not kc['nama'].startswith('(') else 'Belum disebut'
            item.append((st, pv, kab, kec, ', '.join(nama) if nama else 'Nama desa belum dilaporkan', kk_, jw_, not nama))

    def tinggi(it, baru):
        h = tinggi_teks(it[4], kol[3]['w'], 7.5, 14, 9.2)
        return max(h, 22) if baru else h   # baris pertama kab memuat nama kab dan provinsi (dua baris)

    def pecah(batas):
        hal, cur, h, akhir = [], [], 0, None
        for it in item:
            ti = tinggi(it, (it[0], it[2]) != akhir or not cur)
            if cur and h + ti > batas:
                hal.append(cur); cur, h = [], 0
                ti = tinggi(it, True)
            cur.append(it); h += ti; akhir = (it[0], it[2])
        return hal + [cur]
    n_hal = len(pecah(330))
    batas = sum(tinggi(it, False) for it in item) / n_hal
    while len(pecah(batas)) > n_hal:
        batas += 2
    halaman = pecah(batas)
    no_kab, akhir = 0, None
    for hi, hal in enumerate(halaman):
        lanj = f' ({hi + 1}/{len(halaman)})' if len(halaman) > 1 else ''
        s, k = I.slide(judul(f'L1. Rincian Wilayah Terdampak Banjir sampai Desa dan Kelurahan{lanj}', 20))
        hs, akhir_h = [], None
        for i, it in enumerate(hal):
            baru = (it[0], it[2]) != akhir_h or i == 0
            hs.append(tinggi(it, baru)); akhir_h = (it[0], it[2])
        f = min(1.25, max(1.0, 345 / sum(hs)))
        baris = []
        for i, it in enumerate(hal):
            st, pv, kab, kec, ds, kk_, jw_, kosong = it
            baru = (st, kab) != akhir
            tampil_kab = baru or i == 0
            if baru:
                no_kab += 1; akhir = (st, kab)
            berikut_lain = i + 1 >= len(hal) or (hal[i + 1][0], hal[i + 1][2]) != (st, kab)
            sel = [('no', no_kab) if tampil_kab else None,
                   [R(kab, 8, TEKS, True), '\n', R(pv, 6.5, TEKS3)] if tampil_kab else None,
                   [R(kec, 7.5, TEKS, True)], [R(ds, 7.5, TEKS3 if kosong else TEKS2)], nilai(kk_, 7.5), nilai(jw_, 7.5),
                   ('pil', st) if tampil_kab else None]
            baris.append(dict(h=hs[i] * f, sel=sel, pisah='tebal' if berikut_lain else 'tipis', garis_dari=2))
        gambar_tabel(k, 43, 104, kol, baris, kepala_h=22)
    return len(halaman)


# ======================================================================== lampiran L2: pengungsian
def s_lampiran_ungsi(I, rin):
    item = []
    for b in BARIS:
        st, pv, kab, us = b[0], b[1], b[2], b[7]
        r = rin.get((st, kab)) or {}
        p = r.get('pengungsi') or {}
        lok = p.get('lokasi') or []
        if not (lok or p.get('jiwa') or p.get('kk') or us):
            continue
        ukk, ujw = pengungsi(r, us)
        item.append((st, pv, kab, ukk, ujw, lok, p.get('tanggal')))
    n_kab = len(item)
    tot_kk = sum(i[3] or 0 for i in item); tot_jw = sum(i[4] or 0 for i in item)
    s, k = I.slide(judul(f'L2. Pengungsian Sepekan: [{f0(tot_jw)}] Jiwa Tercatat Mengungsi di [{n_kab}] Kab/Kota', 20))
    kol = [dict(w=18), dict(w=124, judul='KAB/KOTA', rata='l', pita=KAB_TINT), dict(w=74, judul='KONDISI'),
           dict(w=56, judul='KK'), dict(w=56, judul='JIWA'), dict(w=0, judul='LOKASI PENGUNGSIAN DAN DESA ASAL', rata='l'),
           dict(w=70, judul='KK / JIWA'), dict(w=52, judul='KABAR', sub='terakhir')]
    kol[5]['w'] = 874 - sum(c['w'] for c in kol)
    rows = []
    for it in item:
        if it[5]:
            rows += [(it, j == 0, l, j == len(it[5]) - 1) for j, l in enumerate(it[5])]
        else:
            rows.append((it, True, None, True))
    hs = [max(tinggi_teks(lokasi_teks(l) if l else 'Lokasi pengungsian belum dilaporkan', kol[5]['w'], 7.5, 15, 9.2), 22 if p else 15)
          for _, p, l, _ in rows]
    f = min(1.35, max(1.0, 318 / sum(hs)))
    baris, no = [], 0
    for (it, pertama, l, terakhir), h in zip(rows, hs):
        st, pv, kab, ukk, ujw, lok, tg = it
        if pertama:
            no += 1
        if l:
            kk_l = f0(l.get('kk')) if l.get('kk') is not None else '–'
            jw_l = f0(l.get('jiwa')) if l.get('jiwa') is not None else '–'
            lok_r, kj = [R(lokasi_teks(l), 7.5, TEKS2)], [R(f'{kk_l} / {jw_l}', 7.5, TEKS, True)]
            tgl = l.get('tanggal_kabar') or tg
        else:
            lok_r, kj, tgl = [R('Lokasi pengungsian belum dilaporkan', 7.5, TEKS3)], nilai(None, 7.5), tg
        sel = [('no', no) if pertama else None, [R(kab, 8, TEKS, True), '\n', R(pv, 6.5, TEKS3)] if pertama else None,
               ('pil', st) if pertama else None, nilai(ukk) if pertama else None, nilai(ujw) if pertama else None,
               lok_r, kj, [R(tgl_pendek(tgl) if tgl else '–', 7.5, TEKS, True)]]
        baris.append(dict(h=h * f, sel=sel, pisah='tebal' if terakhir else 'tipis', garis_dari=5))
    baris.append(dict(jenis='total', h=20, sel=[None, [R('Jumlah', 8, PUTIH, True)], None, [R(f0(tot_kk) if tot_kk else '–', 8, PUTIH, True)],
                                               [R(f0(tot_jw), 8, PUTIH, True)],
                                               [R('KK hanya dari kab/kota yang melaporkan KK; wilayah sudah surut = angka saat banjir, warga Langkat sudah kembali 31 Okt', 6.5, DI_NAVY)],
                                               None, None]))
    gambar_tabel(k, 43, 104, kol, baris, grup=[(3, 4, 'PENGUNGSI', 'pengungsi'), (5, 7, 'PER LOKASI', 'wilayah')], kepala_h=22)


def lokasi_teks(l):
    lok = l.get('lokasi') or ''
    bag = ['Lokasi belum disebut' if (not lok or lok.startswith('(')) else lok[0].upper() + lok[1:]]
    da = l.get('desa_asal') or ''
    da = (f"warga {da.strip('()')}" if da.startswith('(') else f"asal Desa {da}") if da else ''
    asal = ', '.join(x for x in (da, l.get('kecamatan') and f"Kec. {l['kecamatan']}") if x)
    return bag[0] + (f'; {asal}' if asal else '')


def tgl_pendek(iso):
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})', iso or '')
    if not m:
        return iso or '–'
    return f"{int(m[3])} {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][int(m[2]) - 1]}"


# ======================================================================== rakit
def main():
    rin = muat_rincian()
    I = Isi()
    s_ringkasan(I, rin)                                    # isi 1
    n0 = I.n
    s_tabel_kab(I, rin, 'belum', 'Terdapat [18] Wilayah yang Belum Dilaporkan Surut', 'Belum dilaporkan surut')
    n_belum = I.n - n0
    n0 = I.n
    s_tabel_kab(I, rin, 'sudah', 'Terdapat [12] Wilayah yang Sudah Dilaporkan Surut', 'Sudah dilaporkan surut')
    n_sudah = I.n - n0
    s_siaga(I)
    s_penanganan(I)   # 4 Nov pemilik: upaya BNPB dan BPBD sepekan, slide isi (bukan lampiran)
    s_rekom(I)
    n0 = I.n
    s_lampiran_desa(I, rin)
    n_l1 = I.n - n0
    s_lampiran_ungsi(I, rin)
    isi = os.path.join(SINI, f'{NAMA}.pptx')
    I.simpan(isi)
    # urutan deck: sampul, daftar isi, isi bertab bagian, penutup
    hal = iter(range(1, I.n + 1))
    susun = [{'jenis': 'sampul'}, {'jenis': 'daftar-isi'}]
    susun.append({'halaman': next(hal), 'bagian': 1})
    susun += [{'halaman': next(hal), 'bagian': 1} for _ in range(n_belum)]
    susun += [{'halaman': next(hal), 'bagian': 2} for _ in range(n_sudah)]
    susun += [{'halaman': next(hal), 'bagian': 3} for _ in range(3)]   # siaga, penanganan, rekomendasi
    # pemilik 4 Nov: lampiran tidak masuk daftar isi dan tab bagian (slide lampiran tanpa 'bagian')
    susun += [{'halaman': next(hal)} for _ in range(n_l1 + 1)]
    # 4 Nov: penutup wajib berfoto; isian bawaan lewat_deck hanya ada bila berkas isi punya slide "Terima kasih"
    susun.append({'jenis': 'penutup', 'layout': 'putih', 'foto': [os.path.join(SINI, 'bahan', 'sampul.jpg').replace(os.sep, '/')],
                  'kredit': 'Foto: Nasution007, CC BY-SA 4.0, Wikimedia Commons'})
    for b in susun:
        if 'halaman' in b:
            b['sumber'] = SUMBER
    tetap = {}
    for no, b in enumerate(susun, 1):
        if b.get('bagian'):
            tetap.setdefault(b['bagian'], []).append(no)
    bagian = [{'judul': 'Situasi banjir sepekan', 'label': 'Situasi banjir sepekan'},
              {'judul': 'Banjir yang sudah surut', 'label': 'Banjir yang sudah surut'},
              {'judul': 'Prakiraan dan tindak lanjut', 'label': 'Prakiraan dan tindak lanjut'}]
    for n, b in enumerate(bagian, 1):
        b['halaman_tetap'] = tetap[n]
    if '--isi' in sys.argv:
        print('isi saja:', isi); return
    import lewat_deck
    foto = os.path.join(SINI, 'bahan', 'sampul.jpg').replace(os.sep, '/')
    keluar = lewat_deck.bingkai(
        isi, 'kajian', 'Laporan Situasi dan Kondisi Wilayah Terdampak Banjir',
        'Senin, 26 Oktober s.d. Minggu, 1 November 2026', __import__('datetime').date(2026, 11, 2),
        foto=([foto], 'Foto: Nasution007, CC BY-SA 4.0, Wikimedia Commons'),
        penyaji={'nama': 'Tim Ahli dan Tim Sus IT BNPB', 'jabatan': 'Badan Nasional Penanggulangan Bencana'},
        kepada='Disampaikan kepada Kepala Badan Nasional Penanggulangan Bencana', bagian=bagian, susun=susun,
        spek_tambah={'panel_sisi': 'gelap', 'subjek_dokumen': 'Paparan Situasi Banjir Mingguan',
                     'skala_logo_bnpb': 1.1})   # 4 Nov pemilik: logo sampul dikecilkan sedikit (bawaan mesin 1,3)
    print(keluar)


if __name__ == '__main__':
    main()
