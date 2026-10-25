"""Paparan metode perhitungan karhutla satelit, dalam bahasa desain deck kita sendiri (paparan Jatim/Lampung/Jambi, Laporan Harian 211026):
kartu angka berikon dalam wadah berpil, panel berpita dengan bulatan ikon dan hitungan, baris status berpil, pita bawah, judul berkata kunci
oranye, pil VERSI di kanan judul, catatan kaki berpalang biru. Paparan Kemenhut hanya rujukan isi, bukan rujukan desain.
Sampul dan penutup dari templat rumah BNPB (data/kajian-bnpb/bangun/pptx/templat/templat-bnpb.pptx). Isi = metode yang jalan di repo:
scripts/data/harian.py (titik, cluster, firespot), titik_palsu.py (saringan), peta_karhutla.py (luas, belum, padam), laporan.py
(kalibrasi_noaa.py: faktor 4,12 / 4,16 ha), aturan.py (status). Ikon pil: ik/lpg-ik-<nama>-<warna>.png (ikon.mjs paparan Jambi). Tiap slide membawa catatan pembicara.
Pakai: data/kajian-bnpb/.venv/bin/python buat.py keluar.pptx"""
import io, os, sys
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Emu, Pt

R = '/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/'
SINI = os.path.dirname(os.path.abspath(__file__))
TEMPLAT = R + 'data/kajian-bnpb/bangun/pptx/templat/templat-bnpb.pptx'
OUT = sys.argv[1]
NAVY, ORANYE, MERAH, BIRU, COKLAT, BAJA = '051C2C', 'D9600B', 'C8102E', '2F86D1', 'B5480A', '5B7A99'
TUA, TEKS, ABU, BINGKAI, GARIS = '1A1A1A', '2E3440', '6B7280', 'BFC5CC', 'EEF0F3'
# gaya pil/kartu: (latar tipis, warna teks/ikon, nama warna ikon)
GAYA = {'merah': ('F8DDE0', MERAH, 'merah'), 'oranye': ('FBE7D6', ORANYE, 'oranye'), 'navy': ('E6EAF0', NAVY, 'navy'), 'biru': ('DCEBF8', BIRU, 'biru'),
        'abu': ('E6EAF0', ABU, 'abu')}
C = lambda h: RGBColor.from_string(h)

prs = Presentation(TEMPLAT)
sampul, isi_contoh, penutup = prs.slides[0], prs.slides[1], prs.slides[3]
LOGO = [s for s in isi_contoh.shapes if s.shape_type == 13 and s.left > 11000000][0]
LOGO_BLOB = LOGO.image.blob


def ikon(n, w): return os.path.join(SINI, 'ik', f'lpg-ik-{n}-{w}.png')


# ------------------------------------------------------------------ primitif
def tx(s, x, y, w, h, runs, al='l', an='m', spc=None, wrap=True):
    """runs: [(teks, pt, tebal, warna)]; '\\n' di dalam teks = paragraf baru."""
    t = s.shapes.add_textbox(Emu(int(x)), Emu(int(y)), Emu(int(w)), Emu(int(h))); tf = t.text_frame; tf.word_wrap = wrap
    for a in ('margin_left', 'margin_right', 'margin_top', 'margin_bottom'): setattr(tf, a, 0)
    tf.vertical_anchor = {'t': MSO_ANCHOR.TOP, 'm': MSO_ANCHOR.MIDDLE, 'b': MSO_ANCHOR.BOTTOM}[an]
    p = tf.paragraphs[0]; ra = {'l': PP_ALIGN.LEFT, 'c': PP_ALIGN.CENTER, 'r': PP_ALIGN.RIGHT}[al]; p.alignment = ra
    for tk, z, b, c in runs:
        for k, bag in enumerate(tk.replace('>=', '≥').replace('<=', '≤').split('\n')):
            if k: p = tf.add_paragraph(); p.alignment = ra
            r = p.add_run(); r.text = bag; f = r.font; f.size = Pt(z); f.bold = b; f.color.rgb = C(c); f.name = 'Roboto'
            if spc: r._r.get_or_add_rPr().set('spc', str(spc))
    return t


def bentuk(s, x, y, w, h, isi=None, garis=None, prst=MSO_SHAPE.RECTANGLE, adj=None, lw=0.75):
    k = s.shapes.add_shape(prst, Emu(int(x)), Emu(int(y)), Emu(int(w)), Emu(int(h)))
    if adj is not None: k.adjustments[0] = adj
    if isi: k.fill.solid(); k.fill.fore_color.rgb = C(isi)
    else: k.fill.background()
    if garis: k.line.color.rgb = C(garis); k.line.width = Pt(lw)
    else: k.line.fill.background()
    k.shadow.inherit = False
    return k


def gambar(s, x, y, w, h, path): return s.shapes.add_picture(path, Emu(int(x)), Emu(int(y)), Emu(int(w)), Emu(int(h)))


def garis(s, x1, y1, x2, y2, c=GARIS, lw=0.5):
    g = s.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Emu(int(x1)), Emu(int(y1)), Emu(int(x2)), Emu(int(y2))); g.line.color.rgb = C(c); g.line.width = Pt(lw)


def lebar_pil(t, sz=6.0, h=137160): return int(63500 + h * 0.6 + 38100 + 7600 * sz * len(t) + 76200)


def pil(s, x, y, t, gaya, ik, h=137160, sz=6.0, w=None):
    """Pil berikon (sama dengan pil() paparan): latar tipis, ikon 60% tinggi, teks tebal berwarna. -> lebar."""
    f, c, wi = GAYA[gaya]; si = h * 0.6; w = w or lebar_pil(t, sz, h)
    bentuk(s, x, y, w, h, f, prst=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.5)
    gambar(s, x + 63500, y + (h - si) / 2, si, si, ikon(ik, wi))
    tx(s, x + 63500 + si + 38100, y, w - 63500 - si - 76200, h, [(t, sz, True, c)], wrap=False)
    return w


def deret(s, x, y, chips, xmaks, h=137160, gap=45720):
    for t, gy, ik in chips:
        w = lebar_pil(t, h=h); assert x + w <= xmaks, (t, x + w, xmaks)
        pil(s, x, y, t, gy, ik, h); x += w + gap


def pil_bagian(s, x, y, t, isi=NAVY, ik='api', w=None):
    """Pil judul bagian (DATA SATELIT, PERLU PERHATIAN): kapsul gelap, ikon putih, huruf kapital renggang."""
    w = w or int(260000 + 68000 * len(t))
    bentuk(s, x, y, w, 182880, isi, prst=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.5)
    gambar(s, x + 73152, y + 36576, 109728, 109728, ikon(ik, 'putih'))
    tx(s, x + 237744, y, w - 260000, 182880, [(t, 6.6, True, 'FFFFFF')], spc=100, wrap=False)
    return w


# ------------------------------------------------------------------ komponen
def wadah_kartu(s, x, y, w, judul, kartu, latar='F3F5F8', warna_pil=NAVY, ik_pil='api'):
    """Wadah membulat + pil bagian + kartu angka berikon (bulatan latar tipis, angka 17 pt berwarna, label 7,5 pt)."""
    bentuk(s, x, y, w, 932688, latar, prst=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.078)
    pil_bagian(s, x + 109728, y + 54864, judul, warna_pil, ik_pil)
    n = len(kartu); g = 91440; cw = (w - 2 * 109728 - (n - 1) * g) / n
    for k, (ik, gy, angka, label) in enumerate(kartu):
        cx = x + 109728 + k * (cw + g); f, c, wi = GAYA[gy]
        bentuk(s, cx, y + 310896, cw, 512064, 'FFFFFF', BINGKAI, MSO_SHAPE.ROUNDED_RECTANGLE, 0.143)
        bentuk(s, cx + 109728, y + 420624, 329184, 329184, f, prst=MSO_SHAPE.OVAL)
        gambar(s, cx + 182880, y + 493776, 182880, 182880, ikon(ik, wi))
        tx(s, cx + 512064, y + 347472, cw - 560000, 274320, [(angka, 17, True, c)], wrap=False)
        if len(label) > int((cw - 560000) / 50000): PANJANG.append((label, int((cw - 560000) / 50000)))   # 7,5 pt ~ 50.000 EMU/huruf: satu baris
        tx(s, cx + 512064, y + 612648, cw - 560000, 155448, [(label, 7.5, False, TEKS)], wrap=False)


def panel(s, x, y, w, h, judul, warna, latar, ik, hitung=None):
    """Panel putih berbingkai + pita kepala berwarna tipis, bulatan ikon berwarna, judul 11 pt, hitungan 16 pt di kanan. -> y isi."""
    bentuk(s, x, y, w, h, 'FFFFFF', BINGKAI, MSO_SHAPE.ROUNDED_RECTANGLE, 0.015)
    bentuk(s, x, y, w, 457200, latar, prst=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.16)
    bentuk(s, x + 128016, y + 82296, 292608, 292608, warna, prst=MSO_SHAPE.OVAL)
    gambar(s, x + 182880, y + 137160, 182880, 182880, ikon(ik, 'putih'))
    tx(s, x + 502920, y + 73152, w - 1500000, 310896, [(judul, 11, True, TUA)], wrap=False)
    if hitung is not None: tx(s, x + w - 1100000, y + 54864, 980000, 347472, [(str(hitung), 16, True, warna)], al='r')
    return y + 457200


def baris(s, x0, y0, xk, judul, chips, status=None, bulat=NAVY, ik='api', sub=None):
    """Baris panel: bulatan berikon, judul 7,6 pt, pil status rata kanan, deret pil di bawah (atau teks keterangan)."""
    bentuk(s, x0 - 265176, y0 + 18288, 201168, 201168, bulat, prst=MSO_SHAPE.OVAL)
    gambar(s, x0 - 224028, y0 + 59436, 118872, 118872, ikon(ik, 'putih'))
    tx(s, x0, y0, xk - x0 - 950000, 146304, [(judul, 7.6, True, TUA)], wrap=False)
    if status:
        t, gy, si = status; w = lebar_pil(t); pil(s, xk - w, y0 + 4572, t, gy, si)
    if chips: deret(s, x0, y0 + 160020, chips, xk)
    if sub: tx(s, x0, y0 + 160020, xk - x0, 280000, [(sub, 6.8, False, TEKS)], an='t')


def pita(s, x, y, w, h, judul, kolom, warna=BIRU, latar='EEF5FC'):
    """Pita bawah: wadah tipis, judul kapital berwarna, kolom bulatan ikon + judul + keterangan, dipisah garis tegak."""
    bentuk(s, x, y, w, h, latar, prst=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.09)
    tx(s, x + 146304, y + 73152, w, 182880, [(judul, 7.5, True, warna)], spc=100, wrap=False)
    n = len(kolom); cw = (w - 292608) / n
    for k, (ik, j, d) in enumerate(kolom):
        cx = x + 146304 + k * cw
        if k: garis(s, cx - 73152, y + 330000, cx - 73152, y + h - 90000, 'C9DDF2', 0.75)
        bentuk(s, cx, y + 347472, 329184, 329184, warna, prst=MSO_SHAPE.OVAL)
        gambar(s, cx + 73152, y + 420624, 182880, 182880, ikon(ik, 'putih'))
        tx(s, cx + 420624, y + 292608, cw - 560000, 201168, [(j, 8.5, True, TUA)], wrap=False)
        tx(s, cx + 420624, y + 493776, cw - 560000, h - 560000, [(d, 7, False, TEKS)], an='t')


def tabel(s, x, y, w, kolom, isi, rh=210000, sorot=()):
    """Tabel gaya paparan: judul kolom kapital 6,5 pt abu rata tengah, garis tebal bawah judul, nomor bulat navy, garis antarbaris tipis.
    kolom: [(judul, lebar_relatif, rata)]; isi: [[sel]], sel = str atau [(teks, pt, tebal, warna)]."""
    tot = sum(k[1] for k in kolom); xs = [x + 230000]; lebar = [(w - 230000) * k[1] / tot for k in kolom]
    for lb in lebar[:-1]: xs.append(xs[-1] + lb)
    for (j, _, _), xx, lb in zip(kolom, xs, lebar):
        tx(s, xx, y, lb - 60000, 164592, [(j, 6.5, True, ABU)], al='c', spc=80)
    garis(s, x, y + 200000, x + w, y + 200000, TUA, 0.75); yy = y + 228600
    for i, r in enumerate(isi):
        if i in sorot: bentuk(s, x, yy, w, rh, 'FDF1E8')
        bentuk(s, x + 18288, yy + (rh - 128016) / 2, 128016, 128016, NAVY, prst=MSO_SHAPE.OVAL)
        tx(s, x + 18288, yy + (rh - 128016) / 2, 128016, 128016, [(str(i + 1), 5, True, 'FFFFFF')], al='c')
        for (j, _, al), xx, lb, v in zip(kolom, xs, lebar, r):
            runs = v if isinstance(v, list) else [(v, 7.2, xx == xs[0], TUA if xx == xs[0] else NAVY)]
            tx(s, xx + 30000, yy, lb - 90000, rh, runs, al=al)
        yy += rh
        if i < len(isi) - 1: garis(s, x, yy, x + w, yy, GARIS)
    return yy


NOMOR = [1]
PANJANG = []   # label kartu yang akan melipat: dikumpulkan, build gagal di akhir


def slide(judul, catatan, kunci=()):
    """Slide isi: judul 20 pt dengan kata kunci oranye, pil VERSI METODE di kanan, logo, garis kepala & kaki, footer, catatan pembicara."""
    s = prs.slides.add_slide(prs.slide_layouts[1]); NOMOR[0] += 1
    s.shapes.add_picture(io.BytesIO(LOGO_BLOB), LOGO.left, LOGO.top, LOGO.width, LOGO.height)
    runs, sisa = [], judul
    for k in kunci:
        a, b = sisa.split(k, 1); runs += [(a, 20, True, TUA), (k, 20, True, ORANYE)]; sisa = b
    runs.append((sisa, 20, True, TUA))
    tx(s, 548640, 365760, 8150000, 438912, runs, an='m')
    bentuk(s, 8833104, 480000, 2362200, 210312, NAVY, prst=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.5)
    gambar(s, 8915400, 516576, 137160, 137160, ikon('kalender', 'putih'))
    tx(s, 9098280, 480000, 900000, 210312, [('VERSI METODE', 6, True, 'A9B4C2')], spc=100, wrap=False)
    tx(s, 9838944, 480000, 1274064, 210312, [('25 Okt 2026', 8, True, 'FFFFFF')], al='r', wrap=False)
    garis(s, 548640, 906272, 11643055, 906272, TUA, 0.75); garis(s, 548640, 6446520, 11643055, 6446520, TUA, 0.75)
    tx(s, 548640, 6510528, 5486400, 201168, [('Badan Nasional Penanggulangan Bencana  |  Copyright 2026', 8.5, False, TUA)])
    tx(s, 11094415, 6510528, 548640, 201168, [(str(NOMOR[0]), 8.5, True, TUA)], al='r')
    s.notes_slide.notes_text_frame.text = catatan
    return s


def kaki(s, t='*Data berdasarkan Geographic Information System (GIS) dengan satelit NASA (FIRMS: VIIRS dan MODIS).'):
    bentuk(s, 548640, 6227064, 36576, 164592, '4A9BE0'); tx(s, 640080, 6217920, 10000000, 182880, [(t, 7.2, False, TUA)])


X0, XK, W = 548640, 11643055, 11094415      # tepi kiri, tepi kanan, lebar isi
Y1, Y2 = 1050000, 2100000                   # wadah kartu, isi bawahnya

def cara(judul, kunci, catatan, langkah, contoh, hasil, ket_hasil, rumus, warna=ORANYE, latar='FBE7D6', ik='api'):
    """Slide 'cara menghitung': kiri langkah bernomor (bulatan, judul, keterangan, garis sambung), kanan contoh Jambi 24 Okt
    (baris hitungan + hasil besar). contoh: [(label, nilai)]."""
    s = slide(judul, catatan, kunci)
    H_ = 6100000 - 1050000 - 110000 - 950000; pit = (H_ - 457200 - 230000) / len(langkah)   # panel mengisi tinggi, pita rumus 950.000 di bawah
    yi = panel(s, X0, 1050000, 7170725, H_, 'Langkah menghitung', warna, latar, ik, len(langkah))
    for k, (j, d_) in enumerate(langkah):
        y = yi + 170000 + k * pit
        bentuk(s, X0 + 180000, y, 329184, 329184, warna, prst=MSO_SHAPE.OVAL)
        tx(s, X0 + 180000, y, 329184, 329184, [(str(k + 1), 10, True, 'FFFFFF')], al='c')
        tx(s, X0 + 650000, y - 10000, 6300000, 220000, [(j, 9.5, True, TUA)], wrap=False)
        tx(s, X0 + 650000, y + 220000, 6300000, pit - 260000, [(d_, 7.5, False, TEKS)], an='t')
        if k < len(langkah) - 1: garis(s, X0 + 344592, y + 340000, X0 + 344592, y + pit - 10000, 'D1D5DB', 1.25)
    xr = 7810000; wr = XK - xr
    yi = panel(s, xr, 1050000, wr, H_, 'Contoh: Jambi, 24 Okt 2026', NAVY, 'E6EAF0', 'pin')
    for k, (a, v) in enumerate(contoh):
        y = yi + 150000 + k * 360000
        tx(s, xr + 200000, y, wr - 1500000, 300000, [(a, 7.8, False, TEKS)])
        tx(s, xr + wr - 1400000, y, 1200000, 300000, [(v, 10, True, NAVY)], al='r')
        garis(s, xr + 200000, y + 320000, xr + wr - 200000, y + 320000, GARIS)
    yh = yi + 150000 + len(contoh) * 360000 + 150000
    bentuk(s, xr + 150000, yh, wr - 300000, 900000, 'FDF1E8', prst=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.12)
    tx(s, xr + 300000, yh + 80000, wr - 600000, 520000, [(hasil, 24, True, warna)])
    tx(s, xr + 300000, yh + 620000, wr - 600000, 300000, [(ket_hasil, 7.8, True, TUA)])
    assert yh + 900000 <= 1050000 + H_, ('contoh melebihi panel', judul)
    # pita rumus di bawah, selebar halaman
    yp = 1050000 + H_ + 110000; hp = 6100000 - yp
    bentuk(s, X0, yp, W, hp, NAVY, prst=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.08)
    tx(s, X0 + 250000, yp + 120000, 3000000, 182880, [('RUMUS', 7.5, True, 'F4C3A0')], spc=150, wrap=False)
    tx(s, X0 + 250000, yp + 320000, W - 500000, hp - 400000, [(rumus, 15, True, 'FFFFFF')], an='m')
    kaki(s)
    return s


# ================================================================== sampul
def ganti(slide_, lama, baru, sz=None):
    for sh in slide_.shapes:
        if sh.has_text_frame and sh.text_frame.text.startswith(lama):
            p = sh.text_frame.paragraphs[0]; r0 = p.runs[0]
            for r in p.runs[1:]: r._r.getparent().remove(r._r)
            for pp in sh.text_frame.paragraphs[1:]: pp._p.getparent().remove(pp._p)
            r0.text = baru
            if sz: r0.font.size = Pt(sz)
            return
    raise KeyError(lama)


ganti(sampul, 'Laporan Kejadian Bencana Harian', 'Metode Perhitungan Titik Panas dan Luas Terbakar', 30)
for sh in [sh for sh in sampul.shapes if 3400000 < sh.top < 3950000 and sh.left < 6000000]:   # pil PERIODE/VERSI di sampul dibuang (pemilik)
    sh._element.getparent().remove(sh._element)
ganti(sampul, 'DISAMPAIKAN OLEH', 'CAKUPAN')
ganti(sampul, 'Letnan Jenderal', 'Titik panas, luas terbakar, belum padam, padam, cluster, dan status')
ganti(sampul, 'Kepala Badan', 'Data GIS satelit NASA FIRMS: MODIS dan VIIRS')
ganti(sampul, 'Kamis, 22 Oktober 2026', 'Minggu, 25 Oktober 2026')
sampul.notes_slide.notes_text_frame.text = ('Paparan ini menjelaskan bagaimana angka titik panas, luas terbakar, belum padam, padam, dan status cluster '
    'di website dan di laporan harian BNPB dihitung. Semua angka berasal dari satelit NASA FIRMS, dihitung otomatis, dan '
    'merupakan perkiraan, bukan luas terbakar resmi hasil verifikasi lapangan.')

# ================================================================== 2 alur
s = slide('Lima langkah metode perhitungan',
    'Gambaran besarnya ada lima langkah. Pertama, satelit mendeteksi titik panas dan kami hitung per hari WIB. Kedua, titik yang bukan '
    'kebakaran vegetasi, seperti industri, PLTU, dan kawah, dibuang. Ketiga, titik diubah menjadi perkiraan luas terbakar. Keempat, kami cek '
    'apakah api masih bertahan di lokasi yang sama, untuk belum padam dan padam. Kelima, titik berdekatan digabung menjadi cluster dan diberi '
    'status, dari pencegahan rutin sampai prioritas pemadaman.', ('Lima langkah',))
wadah_kartu(s, X0, Y1, 7170725, 'DATA SATELIT', [('pesawat', 'oranye', '4', 'satelit NASA FIRMS'), ('luas', 'navy', '375 m', 'piksel VIIRS'),
            ('putar', 'navy', '3 jam', 'sekali tarik data'), ('pin', 'navy', '38', 'provinsi, rinci kec.')])
wadah_kartu(s, 7810000, Y1, XK - 7810000, 'PERLU DIINGAT', [('awas', 'merah', 'Perkiraan', 'bukan luas resmi'), ('mata', 'merah', 'Harian', 'dihitung ulang terus')],
            latar='FCF1F2', warna_pil=MERAH, ik_pil='awas')
yi = panel(s, X0, Y2, 7170725, 4000000, 'Alur perhitungan', ORANYE, 'FBE7D6', 'putar', 5)
L = [('Titik panas', 'oranye', 'api', [('MODIS 1 km + VIIRS 375 m (S-NPP, NOAA-20)', 'navy', 'pesawat'), ('semua keyakinan', 'navy', 'centang'), ('hari WIB', 'navy', 'kalender')]),
     ('Saringan', 'navy', 'awas', [('industri, tambang', 'merah', 'awas'), ('PLTU', 'merah', 'awas'), ('kawah gunung api', 'merah', 'awas')]),
     ('Luas terbakar', 'oranye', 'luas', [('titik NOAA-20/21', 'navy', 'pesawat'), ('x 4,12 / 4,16 ha, dibagi 2', 'oranye', 'luas'), ('perkiraan', 'merah', 'awas')]),
     ('Belum padam dan padam', 'merah', 'awas', [('bertahan 12 s.d. 36 jam', 'merah', 'api'), ('padam = 48 jam tanpa titik', 'navy', 'centang')]),
     ('Cluster dan status', 'navy', 'pin', [('gabung <= 1,5 km', 'navy', 'pin'), ('Rutin, Patroli, Siaga, Prioritas', 'oranye', 'lapis')])]
for k, (j, gy, ik, ch) in enumerate(L):
    y = yi + 150000 + k * 680000
    bentuk(s, X0 + 160000, y, 329184, 329184, GAYA[gy][1], prst=MSO_SHAPE.OVAL)
    tx(s, X0 + 160000, y, 329184, 329184, [(str(k + 1), 10, True, 'FFFFFF')], al='c')
    tx(s, X0 + 600000, y - 10000, 4000000, 200000, [(j, 9.5, True, TUA)], wrap=False)
    deret(s, X0 + 600000, y + 210000, ch, X0 + 7170725 - 120000, h=150000)
    if k < len(L) - 1: garis(s, X0 + 324592, y + 340000, X0 + 324592, y + 670000, 'D1D5DB', 1.25)
yi = panel(s, 7810000, Y2, XK - 7810000, 4000000, 'Dipakai di', NAVY, 'E6EAF0', 'mata')
D = [('Peta dan tabel website', 'titik, luas, belum padam per provinsi s.d. kecamatan', 'rumah'), ('Laporan Kejadian Bencana Harian', 'cut-off 12.00 WIB', 'kalender'),
     ('Laporan Penanganan Karhutla', 'cut-off 15.00 WIB', 'kalender'), ('Paparan wilayah', 'Jawa Timur, Lampung, Jambi', 'pin'), ('API dan MCP mitra', 'hanya baca, angka yang sama', 'lapis')]
for k, (j, d, ik) in enumerate(D):
    baris(s, 7810000 + 400000, yi + 140000 + k * 690000, XK - 120000, j, None, bulat=NAVY, ik=ik, sub=d)
kaki(s)

# ================================================================== 3 titik panas
s = slide('Titik panas dihitung dengan definisi yang sama dengan SiPongi',
    'Jumlah titik panas memakai tiga satelit: MODIS, VIIRS S-NPP, dan NOAA-20, semua tingkat keyakinan, per hari kalender WIB. Ini definisi '
    'SiPongi, jadi angkanya bisa dibandingkan dengan GIS BNPB. NOAA-21 tampil di peta tetapi tidak ikut dihitung. S-NPP berhenti mengirim data '
    '1 November 2026, dan sejak hari itu NOAA-21 menggantikannya. Satu api yang dilihat tiga satelit tercatat tiga titik, jadi jumlah titik '
    'bukan jumlah api.', ('SiPongi',))
wadah_kartu(s, X0, Y1, 7170725, 'DEFINISI', [('pesawat', 'oranye', '3', 'satelit dihitung'), ('centang', 'navy', 'Semua', 'tingkat keyakinan'),
            ('kalender', 'navy', '00.00', 's.d. 24.00 WIB'), ('lapis', 'navy', 'Tanpa', 'hapus titik ganda')])
wadah_kartu(s, 7810000, Y1, XK - 7810000, 'PERLU DIINGAT', [('awas', 'merah', '1 Nov', 'S-NPP berhenti'), ('api', 'merah', 'Titik', 'bukan jumlah api')],
            latar='FCF1F2', warna_pil=MERAH, ik_pil='awas')
yi = panel(s, X0, Y2, 7170725, 4000000, 'Satelit yang dipakai', ORANYE, 'FBE7D6', 'pesawat', 4)
SAT = [('Sensor MODIS, satelit Terra dan Aqua', [('resolusi 1 km = 100 ha', 'navy', 'luas'), ('seri sejak 2001', 'navy', 'kalender')], ('dihitung', 'oranye', 'centang'), ORANYE),
       ('Sensor VIIRS, satelit S-NPP', [('resolusi 375 m = 14,06 ha', 'navy', 'luas'), ('berhenti 1 Nov 2026, 20.00 WIB', 'merah', 'awas')], ('dihitung', 'oranye', 'centang'), ORANYE),
       ('Sensor VIIRS, satelit NOAA-20', [('resolusi 375 m = 14,06 ha', 'navy', 'luas'), ('juga dasar luas terbakar', 'oranye', 'luas')], ('dihitung', 'oranye', 'centang'), ORANYE),
       ('Sensor VIIRS, satelit NOAA-21', [('resolusi 375 m', 'navy', 'luas'), ('pengganti S-NPP mulai 1 Nov', 'navy', 'putar'), ('dasar luas terbakar', 'oranye', 'luas')], ('peta saja', 'abu', 'mata'), BAJA)]
for k, (j, ch, st, bl) in enumerate(SAT):
    baris(s, X0 + 400000, yi + 160000 + k * 820000, X0 + 7170725 - 140000, j, ch, st, bl, 'pesawat')
yi = panel(s, 7810000, Y2, XK - 7810000, 4000000, 'Cocok dengan GIS BNPB', NAVY, 'E6EAF0', 'centang')
tx(s, 7960000, yi + 120000, 3500000, 250000, [('PAPUA SELATAN, 18 S.D. 20 OKT', 6.5, True, ABU)], spc=80)
for k, (a, b_) in enumerate((('2.619', '2.618'), ('2.632', '2.632'), ('2.766', '2.766'))):
    y = yi + 420000 + k * 560000
    tx(s, 7960000, y, 1700000, 300000, [(a, 15, True, ORANYE)]); tx(s, 7960000, y + 280000, 1700000, 200000, [('metode ini', 7, False, TEKS)])
    tx(s, 9800000, y, 1700000, 300000, [(b_, 15, True, NAVY)]); tx(s, 9800000, y + 280000, 1700000, 200000, [('GIS BNPB', 7, False, TEKS)])
tx(s, 7960000, yi + 2250000, 3550000, 900000, [('Provinsi lain bisa berselisih karena GIS BNPB menyaring titik dengan cara yang berbeda; selisih yang tercatat disebut di deck.', 7, False, ABU)], an='t')
kaki(s)

# ------------------------------------------------------------------ cara menghitung titik panas
cara('Cara menghitung titik panas', ('Cara menghitung',),
    'Begini cara menghitung titik panas satu wilayah untuk satu hari. Ambil semua titik MODIS, S-NPP, dan NOAA-20 dari FIRMS, semua tingkat '
    'keyakinan. Ubah jam satelit ke WIB dan ambil yang jatuh pada pukul 00.00 sampai 24.00 hari itu. Tentukan provinsi, kabupaten, dan kecamatan '
    'tiap titik dari batas wilayah. Hitung semua titik tanpa menghapus titik ganda antarsatelit dan tanpa saringan sumber panas tetap, sama dengan SiPongi. '
    'Contoh Jambi 24 Oktober: MODIS 66, S-NPP 110, NOAA-20 23, jumlahnya 199 titik.',
    [('Tarik titik FIRMS', 'MODIS Terra/Aqua, VIIRS S-NPP, VIIRS NOAA-20; semua tingkat keyakinan (rendah, nominal, tinggi). NOAA-21 tidak ikut dihitung.'),
     ('Ubah ke jam WIB', 'jam akuisisi satelit (UTC) + 7 jam; ambil titik yang jatuh 00.00 s.d. 24.00 WIB hari itu.'),
     ('Tentukan wilayah', 'cocokkan koordinat tiap titik dengan batas provinsi, kabupaten/kota, dan kecamatan.'),
     ('Hitung semua', 'tanpa hapus titik ganda antarsatelit dan tanpa saringan sumber panas tetap (definisi SiPongi); saringan dipakai untuk luas.')],
    [('Titik MODIS (resolusi 1 km)', '66'), ('Titik VIIRS di S-NPP (375 m)', '110'), ('Titik VIIRS di NOAA-20 (375 m)', '23'), ('Jumlah titik panas', '199')],
    '199 titik', 'titik panas Jambi, 24 Okt 2026 (66 + 110 + 23)', 'Titik panas = MODIS (1 km) + VIIRS (375 m) di S-NPP dan NOAA-20, semua keyakinan, hari WIB', ik='api')

# ================================================================== 4 saringan
s = slide('Titik panas yang bukan kebakaran vegetasi dibuang',
    'Tidak semua titik panas adalah kebakaran. Industri, tambang, kilang, PLTU, dan kawah gunung api juga panas hampir tiap hari. Kami menandai '
    'sel sekitar 1 km yang menyala sedikitnya 30 hari setahun, tersebar di 8 bulan, dan berulang di 2 tahun berbeda. Kebakaran gambut besar '
    'seperti OKI 2015 dan 2019 tetap lolos karena hanya menyala 3 sampai 5 bulan dan tidak di sel yang sama tiap tahun. Saat musim api, dampaknya '
    'sekitar satu persen titik nasional. Di luar musim api bagiannya besar: Januari sampai Juli 2026, 10,5 persen titik NOAA berada di sel ini. '
    'Karena itu titik ini dibuang dari luas terbakar, belum padam, dan padam. Jumlah titik panas provinsi tetap tidak disaring, supaya sama dengan SiPongi.',
    ('bukan kebakaran vegetasi',))
wadah_kartu(s, X0, Y1, 7170725, 'SARINGAN', [('awas', 'merah', '130', 'titik dibuang, 20 Okt'), ('lapis', 'navy', '1%', 'dari titik nasional'),
            ('kalender', 'navy', '30 hari', 'menyala tiap tahun'), ('pin', 'navy', '3 km', 'dari puncak kawah')])
wadah_kartu(s, 7810000, Y1, XK - 7810000, 'TETAP DIHITUNG', [('gambut', 'oranye', 'Gambut', 'OKI 2015, 2019 lolos'), ('pohon', 'oranye', 'Sabana', 'lereng > 3 km')],
            latar='FCF1F2', warna_pil=ORANYE, ik_pil='centang')
yi = panel(s, X0, Y2, 7170725, 4000000, 'Yang dibuang', MERAH, 'F8DDE0', 'awas', 3)
SR = [('Sumber panas tetap: industri, tambang, kilang', [('sel ~1,1 km', 'navy', 'luas'), ('>= 30 hari per tahun', 'merah', 'kalender'), ('>= 8 bulan', 'merah', 'kalender'), ('>= 2 tahun', 'merah', 'kalender')]),
      ('PLTU batu bara', [('titik dalam 1 km dari PLTU', 'merah', 'pin')]),
      ('Kawah gunung api', [('40 gunung meletus sejak 2000', 'navy', 'segitiga'), ('dalam 3 km dari puncak', 'merah', 'pin')])]
for k, (j, ch) in enumerate(SR):
    baris(s, X0 + 400000, yi + 200000 + k * 1050000, X0 + 7170725 - 140000, j, ch, ('dibuang', 'merah', 'awas'), MERAH, 'awas')
tx(s, X0 + 400000, yi + 3250000, 6500000, 250000, [('Daftar sel diturunkan dari arsip FIRMS 4 tahun terakhir (kolom jenis titik), diperbarui tiap bulan.', 7, False, ABU)])
yi = panel(s, 7810000, Y2, XK - 7810000, 4000000, 'Dampak per wilayah', NAVY, 'E6EAF0', 'pin')
for k, (j, d) in enumerate((('Nasional', 'sekitar 1% titik NOAA-20/21 (130 dari 12.516, 20 Okt)'), ('Kabupaten industri', 'Halmahera Tengah, Cilacap, Kota Cilegon'),
                            ('Luas, belum padam, padam', 'disaring; Jan s.d. Jul 2026: 10,5% titik NOAA dibuang'), ('Titik panas provinsi', 'tidak disaring, supaya sama dengan SiPongi'))):
    baris(s, 7810000 + 400000, yi + 160000 + k * 820000, XK - 120000, j, None, bulat=NAVY, ik='pin', sub=d)
kaki(s)

# ================================================================== 5 kenapa 4,3 ha
import json as _json
KN = _json.load(open(os.path.join(SINI, 'kalibrasi_noaa.json')))   # kalibrasi_noaa.py, saringan sama dengan mesin luas
F20, F21 = round(KN['F20'], 2), round(KN['F21'], 2)
assert (F20, F21) == (4.12, 4.16), (F20, F21)   # = peta_karhutla.F20/F21
JJ = KN['janjul_2026']; JJ_KITA = 219174   # jumlah luas nasional 1 Jan s.d. 31 Jul 2026, public/data/peta_karhutla.json bangun penuh 25 Okt 15.34
assert abs(JJ_KITA / JJ['est_gabung'] - 1) < 0.01, (JJ_KITA, JJ['est_gabung'])
kf = lambda v, n=2: f"{v:.{n}f}".replace('.', ',')
s = slide('Mengapa satu titik dihitung sekitar 4,1 hektare, bukan 14 hektare',
    'Satu titik VIIRS mewakili satu piksel berukuran 375 kali 375 meter, atau 14,06 hektare. Satelit hanya tahu ada panas di kotak itu, tidak '
    'tahu berapa luas yang benar-benar terbakar. Kalau tiap titik dihitung 14 hektare, luasnya membesar tiga sampai empat kali. Karena itu kami '
    'kalibrasi ke luas resmi: luas terbakar tahunan BNPB 2019 sampai 2025 dibagi jumlah titik NOAA-20 tahun yang sama, sesudah titik sumber panas '
    'tetap dibuang. Mediannya 4,12 hektare per titik, sekitar 29 persen piksel. NOAA-21, yang baru punya dua tahun penuh, 4,16 hektare. Uji Januari '
    'sampai Juli 2026: perkiraan 219 ribu hektare, SiPongi 202 ribu hektare, selisih 8,5 persen. Saringan sumber panas dipilih sesudah uji ini dilihat, jadi angka '
    'itu bukan uji murni; galat rata-rata uji tinggalkan satu tahun 13,5 persen lebih jujur sebagai ukuran ketelitian.', ('4,1 hektare',))
wadah_kartu(s, X0, Y1, 7170725, 'LUAS PER TITIK', [('luas', 'navy', '14,06 ha', 'satu piksel VIIRS'), ('luas', 'oranye', f'{kf(F20)} ha', 'per titik NOAA-20'),
            ('luas', 'oranye', f'{kf(F21)} ha', 'per titik NOAA-21'), ('centang', 'navy', '+8,5%', 'selisih SiPongi 2026')])
wadah_kartu(s, 7810000, Y1, XK - 7810000, 'PERLU DIINGAT', [('awas', 'merah', 'Nasional', 'kalibrasi tahunan'), ('mata', 'merah', 'Indikatif', 'per hari, per provinsi')],
            latar='FCF1F2', warna_pil=MERAH, ik_pil='awas')
yi = panel(s, X0, Y2, 4300000, 4000000, 'Satu piksel, satu titik', ORANYE, 'FBE7D6', 'luas')
S_ = 2600000; xq = X0 + (4300000 - S_) / 2; yq = yi + 330000
bentuk(s, xq, yq, S_, S_, 'EEF0F3', '6B7A8C', lw=1.25)
d = S_ * (F20 / 14.0625) ** 0.5; bentuk(s, xq + (S_ - d) / 2, yq + (S_ - d) / 2, d, d, 'F4C3A0', ORANYE, lw=1.25)
tx(s, xq + (S_ - d) / 2, yq + (S_ - d) / 2, d, d, [(f'{kf(F20)} ha', 17, True, COKLAT), (f'\n{round(100 * F20 / 14.0625)}% piksel', 7.5, False, COKLAT)], al='c')
tx(s, xq, yq - 220000, S_, 180000, [('375 m', 7.5, True, ABU)], al='c')
tx(s, xq, yq + S_ + 70000, S_, 180000, [('1 piksel VIIRS = 375 m x 375 m = 14,06 ha', 7.5, True, ABU)], al='c')
yi = panel(s, X0 + 4300000 + 91440, Y2, XK - X0 - 4300000 - 91440, 4000000, 'Kalibrasi dan uji', NAVY, 'E6EAF0', 'centang')
xp = X0 + 4300000 + 91440 + 400000
K5 = [('Titik = piksel yang panas', 'Satelit melihat panas di dalam kotak 14,06 ha, bukan luas yang terbakar. Dihitung 14 ha, luas membesar 3 s.d. 4 kali.', 'mata', NAVY),
      ('Dikalibrasi ke luas resmi', 'Luas resmi BNPB 2019 s.d. 2025 dibagi titik NOAA-20 tersaring tahun yang sama: median 4,12 ha, rentang 3,69 s.d. 5,91. NOAA-21 2024 s.d. 2025: 4,16 ha.', 'luas', ORANYE),
      ('Uji tinggalkan satu tahun', '5 dari 7 tahun meleset <= 15%; terburuk -32% (2021) dan -24% (2023).', 'centang', NAVY),
      ('Uji luar contoh 2026', f"Jan s.d. Jul 2026: perkiraan {f'{JJ_KITA:,}'.replace(',', '.')} ha, SiPongi 202.011 ha, selisih +8,5%; cara lama +20%. Saringan dipilih sesudah uji ini dilihat, jadi bukan uji luar contoh murni.", 'centang', NAVY)]
for k, (j, d_, ik, bl) in enumerate(K5):
    baris(s, xp, yi + 160000 + k * 820000, XK - 140000, j, None, bulat=bl, ik=ik, sub=d_)
kaki(s)

# ================================================================== 5b riwayat tahunan: dasar 4,3 ha
RW = _json.load(open(os.path.join(SINI, 'riwayat.json')))   # luas resmi: factsheet_karhutla.json website (Bakom/BNPB), 25 Okt 2026
# kolom titik dan ha per titik = NOAA-20 n/h tersaring (kalibrasi_noaa.json); NOAA-20 baru utuh sejak 2019
TB26 = {'ha': 2380800, 'rendah': 2213219, 'tinggi': 3056901, 'sd': '2026-10-24'}   # jumlah luas nasional 2026 peta_karhutla.json; rentang = x 3,83 / 4,12 dan x 5,29 / 4,12
rows = [(th, ha, KN['titik_n20'].get(th) if th >= '2019' else None, round(KN['rasio_n20'][th], 2) if th in KN['rasio_n20'] else None)
        for th, ha, _, _ in RW['rows']]
rows[-1] = (rows[-1][0], TB26['ha'], KN['titik_n20']['2026'], None)
tb = TB26; f0 = lambda v: f"{int(round(v)):,}".replace(',', '.')
med = round(F20, 2)
lebih = [r for r in rows[1:-1] if r[1] > rows[-1][1]]
jt = lambda v: f"{v / 1e6:.1f}".replace('.', ',')
s = slide('Titik dan luas terbakar per tahun: dari sinilah angka 4,12 hektare',
    'Tabel ini dasar angka 4,12 hektare. Untuk tiap tahun 2019 sampai 2025, luas terbakar resmi dibagi jumlah titik VIIRS NOAA-20 keyakinan nominal '
    'atau tinggi pada tahun yang sama, sesudah titik sumber panas tetap dibuang. Hasilnya berkisar 3,7 sampai 5,9 hektare per titik. Nilai tengah '
    'tujuh tahun itu 4,12 hektare, dan separuh tahun berada di antara 3,8 dan 5,3. Sebelum 2019 NOAA-20 belum mengorbit penuh. Tahun 2026 belum punya '
    'angka resmi, jadi luasnya diperkirakan dengan rumus harian: sekitar 2,4 juta hektare hingga 24 Oktober, dengan rentang 2,2 sampai 3,1 juta hektare '
    'memakai kuartil bawah dan atas. Ini tertinggi kedua sejak 2015, di bawah 2015. Angka 1997 sampai 1998 adalah perkiraan kumulatif dua tahun.', ('4,12 hektare',))
wadah_kartu(s, X0, Y1, 7170725, 'DASAR 4,12 HA', [('lapis', 'oranye', f"{kf(med)} ha", 'median 2019 s.d. 2025'),
            ('luas', 'navy', '3,8 s.d. 5,3', 'rentang separuh tahun'), ('kalender', 'navy', '7 tahun', 'dibandingkan'), ('pesawat', 'navy', 'NOAA-20', 'nominal/tinggi, 375 m')])
wadah_kartu(s, 7810000, Y1, XK - 7810000, '2026 HINGGA 24 OKT',[('luas', 'merah', f"{jt(tb['ha'])} juta ha", 'perkiraan, bukan resmi'), ('api', 'merah', f"ke-{len(lebih) + 1}", 'tertinggi sejak 2015')],
            latar='FCF1F2', warna_pil=MERAH, ik_pil='awas')
yi = panel(s, X0, Y2, W, 4000000, 'Titik panas dan luas terbakar Indonesia per tahun', ORANYE, 'FBE7D6', 'kalender', len(rows))
xT, xTB, xL, xLB, xR = X0 + 200000, X0 + 1150000, X0 + 4300000, X0 + 4300000, XK - 200000
wT, wL = 2200000, 5200000; MXT = max(r[2] or 0 for r in rows); MXL = 2.8e6
tx(s, xTB, yi + 70000, 2000000, 160000, [('TITIK NOAA-20 SETAHUN', 6.5, True, ABU)], spc=80)
tx(s, xLB, yi + 70000, 3000000, 160000, [('LUAS TERBAKAR (HA)', 6.5, True, ABU)], spc=80)
tx(s, xR - 900000, yi + 70000, 900000, 160000, [('HA PER TITIK', 6.5, True, ABU)], al='r', spc=80)
rh = (4000000 - 457200 - 330000) / len(rows)
for i, (th, ha, t, ra) in enumerate(rows):
    y = yi + 270000 + i * rh; ini = i == len(rows) - 1
    tx(s, xT, y, 900000, rh, [(th, 7.5, True, TUA)])
    if t:
        w = max(20000, t / MXT * wT); bentuk(s, xTB, y + rh * 0.2, w, rh * 0.6, 'F4C3A0' if ini else 'E08A3C', prst=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.2)
        tx(s, xTB + w + 50000, y, 900000, rh, [(f0(t), 7, True, TUA)])
    else:
        tx(s, xTB, y, 1800000, rh, [('belum ada satelit' if th < '2000' else 'sebelum NOAA-20 penuh', 7, False, ABU)])
    w = max(20000, min(ha, MXL) / MXL * wL); c = 'F2B8AE' if ini else (MERAH if ha >= 1e6 else NAVY)
    bentuk(s, xLB, y + rh * 0.2, w, rh * 0.6, c, prst=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.2)
    lab = (f"± {jt(ha)} juta ha" if ha > MXL else f"{f0(ha)} ha") + (f"   perkiraan {jt(tb['rendah'])} s.d. {jt(tb['tinggi'])} juta" if ini else '')
    if ha > MXL: tx(s, xLB + w - 1500000, y, 1450000, rh, [(lab, 7, True, 'FFFFFF')], al='r')
    else: tx(s, xLB + w + 50000, y, 3000000, rh, [(lab, 7, True, MERAH if ha >= 1e6 or ini else TUA)])
    tx(s, xR - 900000, y, 900000, rh, [(kf(ra) if ra else '-', 7.5, True, ORANYE if ra == med else NAVY)], al='r')
    if i < len(rows) - 1: garis(s, X0 + 150000, y + rh, XK - 150000, y + rh, GARIS)
kaki(s, '*Titik: NASA FIRMS VIIRS NOAA-20 nominal/tinggi setahun, tanpa sel sumber panas tetap. Luas 2015 s.d. 2025: BNPB (Bakom RI, Infografis Data Karhutla 2026). 2026: jumlah luas harian, bukan angka resmi.')

# ================================================================== 5c porsi 0,534: rasio harian S-NPP : NOAA-20+21
PH = [r for r in _json.load(open(os.path.join(SINI, 'porsi_harian.json'))) if '2026-10-15' <= r[0] <= '2026-10-24']   # hari WIB lengkap di cache FIRMS
ACU = ('2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19')
ra = sorted(r[3] for r in PH if r[0] in ACU); porsi = (ra[1] + ra[2]) / 2
assert abs(porsi - 0.5338) < 0.001, porsi   # sama dengan PORSI peta_karhutla.py
kom = lambda v, n=3: f"{v:.{n}f}".replace('.', ',')
s = slide('Angka 0,534 kini hanya untuk mendeteksi data hilang',
    'Sampai 25 Oktober, luas dihitung dari titik NOAA kali 0,534 kali 4,3 hektare. Angka 0,534 adalah rasio titik S-NPP terhadap NOAA-20 ditambah '
    'NOAA-21 pada 16 sampai 19 Oktober, empat hari ketika semua satelit lengkap: 0,516, 0,590, 0,552, dan 0,436, dua angka tengahnya dirata-rata. '
    'Cara ini bertumpu pada satu satelit yang berhenti 1 November, dan pada empat hari saja. Ujinya Januari sampai Juli 2026 meleset 20 persen di atas '
    'SiPongi. Sekarang faktor luas dikalibrasi langsung per satelit NOAA, jadi 0,534 tidak dibutuhkan lagi untuk luas. Rasio harian ini tetap dipakai '
    'untuk satu hal: kalau turun jauh, seperti 0,261 pada 20 Oktober, berarti lintasan S-NPP hilang di FIRMS dan hari itu ditandai bercelah.', ('0,534',))
wadah_kartu(s, X0, Y1, 7170725, 'RASIO S-NPP : NOAA', [('lapis', 'oranye', '0,534', 'median 16 s.d. 19 Okt'), ('kalender', 'navy', '4 hari', 'semua satelit lengkap'),
            ('centang', 'navy', '0,50', 'median 264 hari 2026'), ('awas', 'merah', '+20%', 'cara lama vs SiPongi')])
wadah_kartu(s, 7810000, Y1, XK - 7810000, 'KINI DIPAKAI UNTUK', [('awas', 'merah', '0,261', '20 Okt, S-NPP hilang'), ('pesawat', 'navy', 'Celah', 'tandai hari bercelah')],
            latar='FCF1F2', warna_pil=MERAH, ik_pil='awas')
yi = panel(s, X0, Y2, 7170725, 4000000, 'Titik sedang/tinggi per hari, Indonesia', ORANYE, 'FBE7D6', 'kalender', len(PH))
MX = max(r[2] for r in PH); xb = X0 + 1150000; wb = 4300000; xr = X0 + 7170725 - 200000
tx(s, X0 + 200000, yi + 70000, 900000, 160000, [('TANGGAL', 6.5, True, ABU)], spc=80)
tx(s, xb, yi + 70000, 3000000, 160000, [('S-NPP (OREN)  DAN  NOAA-20 + NOAA-21 (NAVY)', 6.5, True, ABU)], spc=60)
tx(s, xr - 900000, yi + 70000, 900000, 160000, [('RASIO', 6.5, True, ABU)], al='r', spc=80)
rh = (4000000 - 457200 - 330000) / len(PH)
for i, (d, sn, no, r) in enumerate(PH):
    y = yi + 270000 + i * rh; acu = d in ACU
    if acu: bentuk(s, X0 + 120000, y, 7170725 - 240000, rh, 'FDF1E8')
    tx(s, X0 + 200000, y, 900000, rh, [(f"{int(d[8:])} Okt", 7.5, True, TUA)])
    h = rh * 0.32
    w1 = max(20000, sn / MX * wb); bentuk(s, xb, y + rh * 0.15, w1, h, 'E08A3C', prst=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.2)
    tx(s, xb + w1 + 40000, y + rh * 0.15 - 20000, 900000, h + 40000, [(f0(sn), 6.5, True, TUA)])
    w2 = max(20000, no / MX * wb); bentuk(s, xb, y + rh * 0.53, w2, h, NAVY, prst=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.2)
    tx(s, xb + w2 + 40000, y + rh * 0.53 - 20000, 900000, h + 40000, [(f0(no), 6.5, True, TUA)])
    ket = 'acuan' if acu else ('S-NPP siang hilang' if d == '2026-10-20' else '')
    tx(s, xr - 2100000, y, 1150000, rh, [(ket, 6.5, True, ORANYE if acu else MERAH)], al='r')
    tx(s, xr - 900000, y, 900000, rh, [(kom(r), 8, True, ORANYE if acu else (MERAH if d == '2026-10-20' else NAVY))], al='r')
    if i < len(PH) - 1: garis(s, X0 + 150000, y + rh, X0 + 7170725 - 150000, y + rh, GARIS)
yi = panel(s, 7810000, Y2, XK - 7810000, 4000000, 'Cara mendapat 0,534', NAVY, 'E6EAF0', 'lapis', 3)
xp = 7810000 + 400000
baris(s, xp, yi + 180000, XK - 140000, 'Hitung rasio tiap hari', None, bulat=NAVY, ik='kalender', sub='titik S-NPP dibagi titik NOAA-20 + NOAA-21, keyakinan sedang/tinggi, seluruh Indonesia')
baris(s, xp, yi + 900000, XK - 140000, 'Urutkan 4 hari acuan', None, bulat=NAVY, ik='lapis', sub=' < '.join(kom(v) for v in ra))
baris(s, xp, yi + 1620000, XK - 140000, 'Ambil nilai tengah', None, bulat=ORANYE, ik='centang', sub=f'({kom(ra[1])} + {kom(ra[2])}) / 2 = {kom(porsi)}')
bentuk(s, 7960000, yi + 2400000, XK - 7810000 - 300000, 1000000, 'FDF1E8', prst=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.12)
tx(s, 8100000, yi + 2470000, 3300000, 480000, [('lama 2,30 ha, kini 2,07 ha', 13, True, ORANYE)])
tx(s, 8100000, yi + 2950000, 3300000, 400000, [('luas per titik NOAA-20/21: dulu 0,534 x 4,3; kini (4,12 + 4,16) / 4, kalibrasi langsung', 7, False, TEKS)], an='t')
kaki(s, '*Titik VIIRS keyakinan sedang/tinggi dari NASA FIRMS NRT, hari WIB, di dalam batas wilayah Indonesia. Median 2026: 264 hari tanpa celah data.')

# ================================================================== 6 rumus luas
JB = {'n20': 23, 'n21': 265, 'luas': 599, 'b': 199, 'belum': 414}   # Jambi 24 Okt 2026: peta_karhutla.hitung() atas cache bangun penuh 25 Okt 15.34
assert round((JB['n20'] * F20 + JB['n21'] * F21) / 2) == JB['luas']
s = slide('Luas terbakar harian: rata-rata NOAA-20 dan NOAA-21 dengan faktornya',
    'Luas harian dihitung dari dua satelit NOAA yang tetap lengkap sesudah S-NPP berhenti 1 November. Titik NOAA-20 dikali 4,12 hektare, titik '
    'NOAA-21 dikali 4,16 hektare, lalu keduanya dirata-rata, karena dua satelit melihat api yang sama. Kalau satu satelit tidak punya data hari itu, '
    'dipakai satelit yang ada saja, tanpa dibagi dua. Titik di sel sumber panas tetap sudah dibuang lebih dulu. Contoh Jambi 24 Oktober: 23 titik '
    'NOAA-20 dan 265 titik NOAA-21, jadi 599 hektare.', ('rata-rata NOAA-20 dan NOAA-21',))
wadah_kartu(s, X0, Y1, 7170725, 'FAKTOR', [('luas', 'oranye', f'{kf(F20)} ha', 'per titik NOAA-20'), ('luas', 'oranye', f'{kf(F21)} ha', 'per titik NOAA-21'),
            ('lapis', 'navy', '/ 2', 'dua satelit dirata'), ('centang', 'navy', '1 kali', 'bulat per provinsi')])
wadah_kartu(s, 7810000, Y1, XK - 7810000, 'CONTOH JAMBI, 24 OKT', [('api', 'oranye', f"{JB['n20'] + JB['n21']}", 'titik NOAA-20/21'), ('luas', 'merah', f"{JB['luas']} ha", 'luas terbakar')],
            latar='FCF1F2', warna_pil=ORANYE, ik_pil='pin')
yi = panel(s, X0, Y2, W, 1500000, 'Rumus', ORANYE, 'FBE7D6', 'luas')
langkah = [('titik NOAA-20 x 4,12', 'nominal/tinggi, tersaring', NAVY), ('+ titik NOAA-21 x 4,16', 'nominal/tinggi, tersaring', NAVY), ('/ 2', 'dua satelit, api yang sama', NAVY), ('= luas terbakar', 'ha per hari, per wilayah', ORANYE)]
cw = (W - 400000) / 4
for k, (a, b_, c_) in enumerate(langkah):
    x = X0 + 200000 + k * cw
    tx(s, x, yi + 170000, cw - 200000, 380000, [(a, 15, True, c_)], al='c'); tx(s, x, yi + 560000, cw - 200000, 200000, [(b_, 7.5, False, ABU)], al='c')
    if k < 3: bentuk(s, x + cw - 160000, yi + 290000, 120000, 120000, 'BFC5CC', prst=MSO_SHAPE.RIGHT_ARROW)
yi = panel(s, X0, Y2 + 1590000, 5500000, 2410000, 'Mengapa per satelit', NAVY, 'E6EAF0', 'lapis')
for k, (j, d_) in enumerate((('S-NPP berhenti 1 Nov 2026', 'faktor lama 4,3 ha bertumpu pada S-NPP dan porsi 0,534 dari empat hari'),
                             ('Kalibrasi langsung', 'luas resmi BNPB 2019 s.d. 2025 dibagi titik tiap satelit NOAA, saringan sama'),
                             ('Lebih dekat SiPongi', 'Jan s.d. Jul 2026: +8,5%, cara lama +20%'))):
    baris(s, X0 + 400000, yi + 140000 + k * 600000, X0 + 5500000 - 140000, j, None, bulat=NAVY, ik='lapis', sub=d_)
yi = panel(s, X0 + 5591440, Y2 + 1590000, W - 5591440, 2410000, 'Contoh Jambi, 24 Okt 2026', ORANYE, 'FBE7D6', 'pin')
tx(s, X0 + 5800000, yi + 250000, 5100000, 500000, [(f"({JB['n20']} x 4,12 + {JB['n21']} x 4,16) / 2", 15, True, TUA)])
tx(s, X0 + 5800000, yi + 800000, 5100000, 500000, [(f"= {JB['luas']} ha", 24, True, ORANYE), ('   luas terbakar 24 Okt', 8, False, ABU)])
tx(s, X0 + 5800000, yi + 1450000, 5100000, 400000, [('Angka per provinsi dibulatkan sekali; angka nasional = jumlah angka provinsi.', 7, False, ABU)], an='t')
kaki(s)

# ------------------------------------------------------------------ cara menghitung luas terbakar
cara('Cara menghitung luas terbakar', ('Cara menghitung',),
    'Begini cara menghitung luas terbakar satu wilayah untuk satu hari. Ambil titik NOAA-20 dan NOAA-21 yang keyakinannya nominal atau tinggi. '
    'Buang titik di sel sumber panas tetap. Kalikan titik NOAA-20 dengan 4,12 hektare dan titik NOAA-21 dengan 4,16 hektare, jumlahkan, lalu bagi dua. '
    'Bulatkan sekali per provinsi; kabupaten dihitung sendiri dari titiknya. Contoh Jambi 24 Oktober: 23 kali 4,12 sama dengan 94,8, ditambah 265 kali '
    '4,16 sama dengan 1.102,4, jumlahnya 1.197,2, dibagi dua sama dengan 599 hektare.',
    [('Pilih titik NOAA', 'titik VIIRS NOAA-20 dan NOAA-21 hari itu dengan keyakinan nominal atau tinggi; MODIS dan S-NPP tidak dipakai.'),
     ('Buang sumber panas tetap', 'titik di sel industri, tambang, kilang, dan PLTU tidak masuk luas, belum padam, dan padam.'),
     ('Kalikan faktor tiap satelit', 'NOAA-20 x 4,12 ha, NOAA-21 x 4,16 ha: kalibrasi ke luas resmi BNPB 2019 s.d. 2025; jumlahkan lalu bagi 2.'),
     ('Bulatkan sekali', 'per provinsi, setengah ke atas; kabupaten dihitung sendiri; nasional = jumlah angka provinsi.')],
    [('Titik NOAA-20 x 4,12 ha', f"{JB['n20']} = 94,8 ha"), ('Titik NOAA-21 x 4,16 ha', f"{JB['n21']} = 1.102,4 ha"), ('Jumlah dibagi 2', '598,6 ha')],
    f"{JB['luas']} ha", 'luas terbakar Jambi, 24 Okt 2026', 'Luas terbakar = (titik NOAA-20 x 4,12 ha + titik NOAA-21 x 4,16 ha) / 2, nominal/tinggi, tanpa sumber panas tetap', ik='luas')

# ================================================================== 7 belum padam
s = slide('Belum padam: api yang masih menyala di lokasi yang sama',
    'Belum padam dihitung dari api yang bertahan. Setiap titik NOAA hari ini dicek: apakah di sekitarnya, dalam kotak tiga kali tiga sel atau '
    'sekitar 1,1 kilometer, sudah ada titik 12 sampai 36 jam sebelumnya. Kalau ya, api itu bertahan, bukan api baru. Belum padam adalah luas '
    'titik yang bertahan dikali faktor satelitnya, dengan rumus yang sama dengan luas. Contoh Jambi 24 Oktober: 199 dari 288 titik bertahan, jadi 414 hektare belum padam. Angka ini '
    'kondisi pada hari itu, jadi tidak dijumlahkan antarhari.', ('Belum padam',))
wadah_kartu(s, X0, Y1, 7170725, 'ATURAN', [('kalender', 'navy', '12 s.d. 36', 'jam sebelumnya'), ('luas', 'navy', '3 x 3', 'sel 375 m, ~1,1 km'),
            ('api', 'merah', '199/288', 'titik bertahan'), ('awas', 'merah', '414 ha', 'belum padam Jambi')])
wadah_kartu(s, 7810000, Y1, XK - 7810000, 'PERLU DIINGAT', [('lapis', 'merah', 'Stok', 'tidak dijumlah antarhari'), ('pesawat', 'merah', 'NOAA', 'S-NPP tidak dipakai')],
            latar='FCF1F2', warna_pil=MERAH, ik_pil='awas')
yi = panel(s, X0, Y2, 7170725, 2000000, 'Garis waktu: titik hari ini dicek ke belakang', MERAH, 'F8DDE0', 'kalender')
x0_, x1_ = X0 + 400000, X0 + 6800000; yg = yi + 650000
garis(s, x0_, yg, x1_, yg, '9CA3AF', 1.5)
jam = lambda h: x0_ + (x1_ - x0_) * (48 - h) / 48
bentuk(s, jam(36), yg - 230000, jam(12) - jam(36), 460000, 'F4C3A0', ORANYE, MSO_SHAPE.ROUNDED_RECTANGLE, 0.2)
tx(s, jam(36), yg - 230000, jam(12) - jam(36), 460000, [('jendela 12 s.d. 36 jam: titik lama di sel tetangga', 7.5, True, COKLAT)], al='c')
for h, lab in ((48, '48 jam lalu'), (36, '36 jam'), (12, '12 jam'), (0, 'titik hari ini')):
    garis(s, jam(h), yg + 230000, jam(h), yg + 330000, ABU, 1); tx(s, jam(h) - 600000, yg + 350000, 1200000, 180000, [(lab, 7, False, ABU)], al='c')
bentuk(s, jam(0) - 110000, yg - 110000, 220000, 220000, MERAH, 'FFFFFF', MSO_SHAPE.OVAL)
yi = panel(s, X0, Y2 + 2090000, 7170725, 1910000, 'Rumus', NAVY, 'E6EAF0', 'luas')
tx(s, X0 + 200000, yi + 150000, 6800000, 300000, [('Belum padam = (titik bertahan NOAA-20 x 4,12 + titik bertahan NOAA-21 x 4,16) / 2', 10, True, TUA)])
deret(s, X0 + 200000, yi + 650000, [('Jambi 24 Okt', 'oranye', 'pin'), ('199 dari 288 titik bertahan', 'merah', 'api'), ('(19 x 4,12 + 180 x 4,16) / 2 = 414 ha', 'merah', 'awas')], X0 + 7000000, h=170000)
yi = panel(s, 7810000, Y2, XK - 7810000, 4000000, 'Kotak 3 x 3 sel', MERAH, 'F8DDE0', 'luas')
gs = 900000; gx = 7810000 + (XK - 7810000 - 3 * gs) / 2; gy = yi + 300000
for i in range(3):
    for j in range(3): bentuk(s, gx + i * gs, gy + j * gs, gs, gs, 'FBE7D6' if (i, j) != (1, 1) else 'F4C3A0', ORANYE, lw=1)
bentuk(s, gx + 1.5 * gs - 110000, gy + 1.5 * gs - 110000, 220000, 220000, MERAH, 'FFFFFF', MSO_SHAPE.OVAL)
bentuk(s, gx + 2.3 * gs, gy + 0.3 * gs, 180000, 180000, ABU, 'FFFFFF', MSO_SHAPE.OVAL)
deret(s, gx, gy + 3 * gs + 120000, [('titik hari ini', 'merah', 'api'), ('titik 12 s.d. 36 jam lalu', 'abu', 'kalender')], XK - 100000)
kaki(s)

# ------------------------------------------------------------------ cara menghitung belum padam
cara('Cara menghitung luas belum padam', ('Cara menghitung',),
    'Begini cara menghitung luas belum padam. Mulai dari titik NOAA hari itu, yang juga dipakai untuk luas. Untuk setiap titik, periksa kotak '
    'tiga kali tiga sel di sekitarnya: apakah ada titik 12 sampai 36 jam sebelumnya. Kalau ada, titik itu api yang bertahan. Hitung luas titik '
    'bertahan dengan rumus luas: NOAA-20 kali 4,12 hektare, NOAA-21 kali 4,16 hektare, dibagi dua. Contoh Jambi 24 Oktober: 199 dari 288 titik bertahan, '
    '19 NOAA-20 dan 180 NOAA-21, jadi 19 kali 4,12 ditambah 180 kali 4,16, dibagi dua, sama dengan 414 hektare.',
    [('Mulai dari titik NOAA hari itu', 'titik NOAA-20/21 nominal/tinggi yang sama dengan dasar luas terbakar.'),
     ('Cek lokasi 12 s.d. 36 jam lalu', 'untuk tiap titik, lihat kotak 3 x 3 sel 375 m di sekitarnya (sekitar 1,1 km): ada titik 12 s.d. 36 jam sebelumnya?'),
     ('Pisahkan per satelit', 'titik bertahan NOAA-20 dan NOAA-21 dihitung terpisah.'),
     ('Kalikan faktor, bagi 2', 'belum padam = (bertahan NOAA-20 x 4,12 + bertahan NOAA-21 x 4,16) / 2; kondisi hari itu, tidak dijumlah antarhari.')],
    [('Titik NOAA hari itu', '288'), ('Titik bertahan (12 s.d. 36 jam)', '199'), ('NOAA-20 / NOAA-21 bertahan', '19 / 180'), ('(19 x 4,12 + 180 x 4,16) / 2', '413,5 ha')],
    '414 ha', 'belum padam Jambi, 24 Okt 2026', 'Belum padam = (titik bertahan NOAA-20 x 4,12 ha + titik bertahan NOAA-21 x 4,16 ha) / 2', warna=MERAH, latar='F8DDE0', ik='awas')

# ================================================================== 8 padam
s = slide('Padam: 48 jam tanpa titik panas di lokasi yang sama',
    'Api dianggap padam bila lokasinya tidak terdeteksi lagi selama 48 jam. Padam hari ini adalah luas dua hari lalu dikali porsi titik dua hari '
    'lalu yang sel di sekitarnya tidak muncul lagi kemarin maupun hari ini. Tidak terdeteksi tidak selalu berarti padam: awan dan asap tebal '
    'bisa menutupi api, api di bawah gambut tidak terlihat satelit, dan lintasan satelit kadang hilang. Karena itu cluster di peta tetap aktif '
    'lebih lama, 72 jam, atau 168 jam di gambut.', ('48 jam',))
wadah_kartu(s, X0, Y1, 7170725, 'ATURAN', [('kalender', 'navy', '48 jam', 'tanpa titik = padam'), ('luas', 'navy', '3 x 3', 'sel yang dicek'),
            ('api', 'oranye', 'H-2', 'dasar hitungan'), ('centang', 'navy', 'H', 'hari dihitung padam')])
wadah_kartu(s, 7810000, Y1, XK - 7810000, 'PERLU DIINGAT', [('awas', 'merah', 'Bukan pasti', 'padam di lapangan'), ('pin', 'merah', '72 jam', 'cluster tetap aktif')],
            latar='FCF1F2', warna_pil=MERAH, ik_pil='awas')
yi = panel(s, X0, Y2, 7170725, 4000000, 'Tiga hari yang dicek', NAVY, 'E6EAF0', 'kalender', 3)
H = [('H-2', 'dua hari lalu', 'api terdeteksi; luas dan porsinya jadi dasar', 'F8DDE0', MERAH), ('H-1', 'kemarin', 'tidak ada titik di sel 3 x 3 sekitarnya', 'F3F5F8', ABU),
     ('H', 'hari ini', 'tetap tidak ada titik: dihitung padam', NAVY, 'FFFFFF')]
cw = (7170725 - 400000 - 2 * 250000) / 3
for k, (a, b_, c_, f, w) in enumerate(H):
    x = X0 + 200000 + k * (cw + 250000)
    bentuk(s, x, yi + 200000, cw, 1600000, f, None if k else None, MSO_SHAPE.ROUNDED_RECTANGLE, 0.06)
    tx(s, x + 150000, yi + 330000, cw - 300000, 400000, [(a, 20, True, w)])
    tx(s, x + 150000, yi + 760000, cw - 300000, 200000, [(b_, 8.5, True, 'F4C3A0' if k == 2 else TUA)])
    tx(s, x + 150000, yi + 1000000, cw - 300000, 600000, [(c_, 7.5, False, 'D1D5DB' if k == 2 else TEKS)], an='t')
    if k < 2: bentuk(s, x + cw + 65000, yi + 930000, 120000, 120000, 'BFC5CC', prst=MSO_SHAPE.RIGHT_ARROW)
tx(s, X0 + 200000, yi + 2050000, 6800000, 300000, [('Padam (H) = luas (H-2) x porsi titik H-2 yang tidak terdeteksi lagi pada H-1 dan H', 9.5, True, NAVY)])
tx(s, X0 + 200000, yi + 2450000, 6800000, 600000, [('Beda dengan cluster di peta: cluster dianggap aktif sampai 72 jam sejak titik terakhir, 168 jam di gambut kering, supaya api bawah tidak terlalu cepat dianggap selesai.', 7.5, False, ABU)], an='t')
yi = panel(s, 7810000, Y2, XK - 7810000, 4000000, 'Tidak terdeteksi tidak selalu padam', MERAH, 'F8DDE0', 'awas', 3)
for k, (j, d_, ik) in enumerate((('Awan dan asap tebal', 'menutupi api dari pandangan satelit', 'mata'), ('Api bawah gambut', 'bara di bawah permukaan tidak terlihat', 'gambut'),
                                 ('Lintasan hilang', 'contoh: S-NPP siang 20 Okt hilang di FIRMS', 'pesawat'))):
    baris(s, 7810000 + 400000, yi + 200000 + k * 900000, XK - 120000, j, None, bulat=MERAH, ik=ik, sub=d_)
kaki(s)

# ================================================================== 9 cluster
s = slide('Titik berdekatan digabung menjadi satu cluster kebakaran',
    'Satu kebakaran biasanya muncul sebagai banyak titik. Titik yang berjarak sampai 1,5 kilometer kami gabung menjadi satu cluster dengan metode '
    'DBSCAN, yang juga dipakai sistem kejadian api NASA. Jaraknya menyesuaikan kepadatan titik, mulai 0,6 kilometer. Satu titik tunggal pun tetap '
    'dihitung sebagai kejadian. Cluster menyambung antarhari bila titik baru muncul dalam 48 jam, dan dianggap aktif bila terdeteksi dalam 72 jam '
    'terakhir, atau 168 jam di gambut kering.', ('cluster',))
wadah_kartu(s, X0, Y1, 7170725, 'ATURAN CLUSTER', [('pin', 'oranye', '<= 1,5 km', 'jarak gabung'), ('api', 'navy', '1 titik', 'sudah satu kejadian'),
            ('kalender', 'navy', '7 hari', 'titik yang dibaca'), ('putar', 'navy', '48 jam', 'sambungan antarhari')])
wadah_kartu(s, 7810000, Y1, XK - 7810000, 'CLUSTER AKTIF', [('kalender', 'merah', '72 jam', 'sejak titik terakhir'), ('gambut', 'merah', '168 jam', 'di gambut kering')],
            latar='FCF1F2', warna_pil=MERAH, ik_pil='pin')
yi = panel(s, X0, Y2, 4300000, 4000000, 'Titik dalam 1,5 km = satu api', ORANYE, 'FBE7D6', 'pin')
cx, cy, r = X0 + 2000000, yi + 1550000, 1250000
bentuk(s, cx - r, cy - r, 2 * r, 2 * r, 'FBE7D6', ORANYE, MSO_SHAPE.OVAL, lw=1.25)
for dx, dy in ((-450000, -300000), (200000, -550000), (380000, 280000), (-200000, 450000), (-650000, 180000), (600000, -100000)):
    bentuk(s, cx + dx - 100000, cy + dy - 100000, 200000, 200000, ORANYE, 'FFFFFF', MSO_SHAPE.OVAL)
bentuk(s, cx + 1600000, cy - 1100000, 200000, 200000, ABU, 'FFFFFF', MSO_SHAPE.OVAL)
deret(s, X0 + 300000, yi + 3150000, [('satu cluster', 'oranye', 'pin'), ('titik jauh = cluster lain', 'abu', 'pin')], X0 + 4200000)
yi = panel(s, X0 + 4391440, Y2, XK - X0 - 4391440, 4000000, 'Cara kerja', NAVY, 'E6EAF0', 'putar', 4)
xp = X0 + 4391440 + 400000
for k, (j, d_, ik) in enumerate((('DBSCAN Haversine', 'jarak gabung menyesuaikan kepadatan titik, 0,6 s.d. 1,5 km', 'pin'), ('Titik tunggal tetap kejadian', 'minimal 1 titik; api kecil tidak hilang', 'api'),
                                 ('Sambung antarhari', 'cluster hari ini menyambung ke cluster kemarin bila titik baru muncul dalam 48 jam', 'putar'),
                                 ('Rujukan', 'FEDS (Chen dkk. 2022), Indradjad dkk. 2024', 'lapis'))):
    baris(s, xp, yi + 180000 + k * 820000, XK - 140000, j, None, bulat=NAVY, ik=ik, sub=d_)
kaki(s)

# ------------------------------------------------------------------ cara menghitung cluster
cara('Cara menghitung cluster', ('Cara menghitung',),
    'Begini cara membentuk cluster. Ambil titik VIIRS dari tiga satelit dengan keyakinan nominal atau tinggi selama tujuh hari terakhir. Titik '
    'yang berjarak sampai 1,5 kilometer digabung menjadi satu cluster. Cluster menyambung antarhari bila apinya muncul lagi dalam 48 jam. Cluster '
    'masih aktif bila titik terakhirnya 72 jam terakhir, atau 168 jam di gambut, lalu diberi status. Contoh Jambi 24 Oktober: 180 cluster aktif, '
    'terdiri dari 3 Prioritas, 31 Siaga, 97 Patroli, dan 49 Rutin.',
    [('Ambil titik 7 hari', 'titik VIIRS S-NPP, NOAA-20, NOAA-21 keyakinan nominal atau tinggi, tujuh hari terakhir.'),
     ('Gabung titik berdekatan', 'titik berjarak <= 1,5 km jadi satu cluster (DBSCAN; jarak menyesuaikan kepadatan, mulai 0,6 km); titik tunggal tetap satu cluster.'),
     ('Sambung antarhari', 'cluster hari ini menyambung ke cluster kemarin bila api muncul lagi dalam 48 jam.'),
     ('Saring yang aktif, beri status', 'aktif bila titik terakhir <= 72 jam (168 jam di gambut kering); status Prioritas, Siaga, Patroli, atau Rutin.')],
    [('Prioritas pemadaman', '3'), ('Siaga pemadaman awal', '31'), ('Patroli terpadu', '97'), ('Pencegahan rutin', '49')],
    '180 cluster', 'cluster aktif Jambi, 24 Okt 2026', 'Cluster = titik VIIRS 7 hari yang berjarak <= 1,5 km; aktif bila titik terakhir <= 72 jam (168 jam di gambut)', warna=NAVY, latar='E6EAF0', ik='pin')

# ================================================================== 10a keyakinan: tingkat titik (NASA) dan kelas harian cluster
s = slide('Keyakinan titik dan kelas harian cluster: dasar firespot',
    'Ada dua tingkat keyakinan. Pertama, keyakinan tiap titik dari NASA. VIIRS memakai tiga kode: rendah untuk titik siang dengan selisih panas kecil '
    'atau terkena pantulan matahari, sedang untuk selisih panas yang jelas tanpa pantulan, dan tinggi untuk piksel yang jenuh karena panasnya sangat '
    'kuat. MODIS memakai angka 0 sampai 100 yang kami kelompokkan menjadi rendah 0 sampai 29, sedang 30 sampai 79, dan tinggi 80 sampai 100. Kedua, '
    'kelas harian cluster dari kami: High bila ada satu titik keyakinan tinggi atau empat piksel unik keyakinan sedang, selain itu Medium. Titik '
    'keyakinan rendah tidak dipakai untuk cluster. Piksel unik dipakai supaya satu api yang dilihat tiga satelit tidak terhitung tiga kali. Titik '
    'tinggi jarang di malam hari, jadi api malam biasanya menjadi High lewat jalur empat piksel.', ('Keyakinan titik',))
wadah_kartu(s, X0, Y1, 7170725, 'KEYAKINAN TITIK (NASA)', [('awas', 'abu', 'Rendah', 'VIIRS l, MODIS 0-29'), ('centang', 'oranye', 'Sedang', 'VIIRS n, MODIS 30-79'),
            ('api', 'merah', 'Tinggi', 'VIIRS h, MODIS 80-100'), ('mata', 'navy', '1 s.d. 3%', 'titik tinggi di malam')])
wadah_kartu(s, 7810000, Y1, XK - 7810000, 'PERLU DIINGAT', [('awas', 'merah', 'Rendah', 'tidak dipakai cluster'), ('luas', 'merah', 'Piksel', 'unik, bukan titik')],
            latar='FCF1F2', warna_pil=MERAH, ik_pil='awas')
yi = panel(s, X0, Y2, 7170725, 4000000, 'Tingkat 1: keyakinan tiap titik, dari algoritma NASA', NAVY, 'E6EAF0', 'pesawat', 3)
for k, (j, ch, st, bl, d_) in enumerate((
        ('Rendah', [('VIIRS: l', 'abu', 'pesawat'), ('MODIS: 0 s.d. 29', 'abu', 'pesawat')], ('sering bukan api', 'abu', 'awas'), ABU,
         'titik siang dengan selisih panas kecil (kurang dari sekitar 15 K dari latar) atau di daerah pantulan matahari'),
        ('Sedang (nominal)', [('VIIRS: n', 'oranye', 'pesawat'), ('MODIS: 30 s.d. 79', 'oranye', 'pesawat')], ('hampir pasti api', 'oranye', 'centang'), ORANYE,
         'selisih panas jelas (lebih dari sekitar 15 K) dan bebas pantulan matahari, siang maupun malam'),
        ('Tinggi', [('VIIRS: h', 'merah', 'pesawat'), ('MODIS: 80 s.d. 100', 'merah', 'pesawat')], ('api kuat', 'merah', 'api'), MERAH,
         'piksel jenuh: panas sangat kuat sampai sensor mentok; jarang di malam hari (1 s.d. 3% vs 10 s.d. 13% siang)'))):
    y = yi + 170000 + k * 1150000
    baris(s, X0 + 400000, y, X0 + 7170725 - 140000, j, ch, st, bl, 'api')
    tx(s, X0 + 400000, y + 340000, 6500000, 400000, [(d_, 7, False, TEKS)], an='t')
tx(s, X0 + 400000, yi + 3350000, 6500000, 200000, [('Pembagian MODIS mengikuti BRIN; nilai bukan angka dianggap rendah, kode VIIRS lain dianggap sedang.', 6.5, False, ABU)])
yi = panel(s, 7810000, Y2, XK - 7810000, 4000000, 'Tingkat 2: kelas harian cluster', ORANYE, 'FBE7D6', 'lapis', 2)
xp = 7810000 + 400000
baris(s, xp, yi + 160000, XK - 140000, 'High', None, ('firespot bila berulang', 'merah', 'api'), MERAH, 'api', '>= 1 titik keyakinan tinggi, atau >= 4 piksel unik keyakinan sedang')
baris(s, xp, yi + 760000, XK - 140000, 'Medium', None, ('perlu bukti hari lain', 'oranye', 'mata'), ORANYE, 'api', 'selain itu: 1 s.d. 3 piksel sedang tanpa titik tinggi')
tx(s, 7960000, yi + 1380000, 3400000, 160000, [('CONTOH ISI CLUSTER SEHARI', 6.5, True, ABU)], spc=80)
for k, (a, c_) in enumerate((('1 titik keyakinan tinggi', 'High'), ('5 piksel keyakinan sedang', 'High'), ('3 piksel keyakinan sedang', 'Medium'),
                             ('6 titik sedang, 2 piksel (3 satelit)', 'Medium'))):
    y = yi + 1600000 + k * 330000
    tx(s, 7960000, y, 2700000, 300000, [(a, 7.2, False, TUA)])
    pil(s, XK - 140000 - lebar_pil(c_), y + 80000, c_, 'merah' if c_ == 'High' else 'oranye', 'api')
    garis(s, 7960000, y + 320000, XK - 140000, y + 320000, GARIS)
tx(s, 7960000, yi + 3000000, 3450000, 400000, [('Titik rendah tidak masuk cluster. Piksel unik: satu api di piksel yang sama dilihat 3 satelit dihitung 1.', 6.8, False, ABU)], an='t')
kaki(s)

# ================================================================== 10 firespot
s = slide('Firespot: saringan api nyata, diadaptasi dari SIPANTAU Kemenhut',
    'Kami mengadopsi gagasan firespot Kemenhut sebagai saringan apakah sebuah cluster benar api nyata. Tiap hari cluster diberi kelas High bila ada '
    'satu titik keyakinan tinggi atau empat piksel nominal; selain itu Medium. Pola tiga hari menentukan firespot: High-High, High, Medium-High, '
    'dan Medium tiga hari berturut-turut adalah firespot. Bedanya, kami menghitung piksel unik, supaya satu api yang dilihat tiga satelit tidak '
    'terhitung tiga kali, dan persistensi memakai keanggotaan cluster yang sama, bukan radius 375 meter.', ('Firespot',))
wadah_kartu(s, X0, Y1, 7170725, 'KELAS HARIAN CLUSTER', [('api', 'merah', 'High', '1 titik yakin tinggi'), ('lapis', 'merah', '4 piksel', 'unik keyakinan nominal'),
            ('api', 'oranye', 'Medium', 'selain itu'), ('kalender', 'navy', '3 hari', 'pola yang dibaca')])
wadah_kartu(s, 7810000, Y1, XK - 7810000, 'UJI BALIK 2019, 2023', [('centang', 'oranye', '0', 'api besar lolos'), ('kalender', 'oranye', '<= 2 hari', 'tertunda paling lama')],
            latar='FCF1F2', warna_pil=ORANYE, ik_pil='centang')
yi = panel(s, X0, Y2, 7170725, 4000000, 'Pola tiga hari', MERAH, 'F8DDE0', 'api', 6)
POLA = [('High-High', 'High hari ini dan kemarin, cluster yang sama', ('firespot', 'merah', 'api')), ('High', 'High hari ini, kemarin tidak ada', ('firespot', 'merah', 'api')),
        ('Medium-High', 'Medium hari ini, High kemarin', ('firespot', 'merah', 'api')), ('Medium tiga hari', 'Medium tiga hari berturut-turut', ('firespot', 'merah', 'api')),
        ('Medium satu hari', 'belum cukup kuat', ('mungkin, cek lapangan', 'abu', 'mata')), ('Medium dua hari', 'tidak berlanjut ke hari ketiga', ('mungkin, cek lapangan', 'abu', 'mata'))]
for k, (j, d_, st) in enumerate(POLA):
    baris(s, X0 + 400000, yi + 140000 + k * 560000, X0 + 7170725 - 140000, j, None, st, MERAH if st[1] == 'merah' else BAJA, 'api', d_)
yi = panel(s, 7810000, Y2, XK - 7810000, 4000000, 'Beda dengan Kemenhut', NAVY, 'E6EAF0', 'jabat', 3)
for k, (j, d_) in enumerate((('Piksel unik, bukan titik', 'satu api dilihat 3 satelit VIIRS tidak dihitung 3 kali'),
                             ('Persistensi lewat cluster', 'bukan radius 375 m: posisi VIIRS bergeser ± 375 m antarlintasan'),
                             ('Api malam', 'keyakinan tinggi jarang malam (1 s.d. 3%), jadi lolos lewat jalur 4 piksel'))):
    baris(s, 7810000 + 400000, yi + 200000 + k * 900000, XK - 120000, j, None, bulat=NAVY, ik='jabat', sub=d_)
kaki(s)

# ------------------------------------------------------------------ cara menghitung firespot
cara('Cara menentukan firespot', ('Cara menentukan',),
    'Begini cara menentukan firespot. Setiap hari, tiap cluster diberi kelas High bila ada satu titik keyakinan tinggi atau empat piksel unik '
    'keyakinan nominal, selain itu Medium. Lalu baca pola tiga hari: hari ini, kemarin, dan dua hari lalu. Pola High-High, High, Medium-High, dan '
    'Medium tiga hari berturut-turut adalah firespot. Pola Medium satu atau dua hari masih mungkin, dicek lapangan dulu. Contoh Jambi 24 Oktober: '
    '29 dari 180 cluster adalah firespot.',
    [('Beri kelas harian', 'High bila >= 1 titik keyakinan tinggi atau >= 4 piksel unik keyakinan nominal; selain itu Medium.'),
     ('Baca pola 3 hari', 'kelas hari ini, kemarin, dan dua hari lalu pada cluster yang sama.'),
     ('Tentukan firespot', 'High-High, High, Medium-High, Medium x3 = firespot; Medium dan Medium-Medium = mungkin.'),
     ('Cek lapangan yang mungkin', 'cluster "mungkin" berstatus rendah diperiksa lapangan dulu sebelum dianggap api nyata.')],
    [('High-High', '8'), ('High', '12'), ('Medium-High', '6'), ('Medium x3', '3'), ('Mungkin (Medium, Medium-Medium)', '151')],
    '29 firespot', 'dari 180 cluster aktif Jambi, 24 Okt 2026', 'Firespot = cluster dengan pola 3 hari High-High, High, Medium-High, atau Medium x3', warna=MERAH, latar='F8DDE0', ik='api')

# ================================================================== 11 status
s = slide('Empat tingkat status cluster untuk mengurutkan pemadaman',
    'Setiap cluster aktif diberi satu dari empat status. Dasarnya keparahan dari satelit, yaitu seberapa besar front api 24 jam dan berapa lama '
    'bertahan, lalu disesuaikan dengan cuaca kebakaran BMKG. Cuaca hanya boleh menaikkan status, tidak boleh menurunkan api besar yang terlihat. '
    'Prioritas pemadaman diberikan bila front aktif 24 jam sedikitnya 15 piksel dan indeks cuaca kebakaran tinggi. Uji balik musim 2019 dan 2023: '
    'ambang ini menangkap 90 sampai 95 persen api yang akhirnya besar sebelum mencapai separuh ukurannya.', ('Empat tingkat status',))
wadah_kartu(s, X0, Y1, W, 'TINGKAT STATUS', [('awas', 'merah', 'Prioritas', 'pemadaman'), ('api', 'oranye', 'Siaga', 'pemadaman awal'),
            ('mata', 'navy', 'Patroli', 'terpadu'), ('perisai', 'abu', 'Rutin', 'pencegahan')])
yi = panel(s, X0, Y2, 7170725, 4000000, 'Syarat tiap status', NAVY, 'E6EAF0', 'lapis', 4)
ST = [('Prioritas pemadaman', MERAH, 'awas', [('front 24 jam >= 15 piksel', 'merah', 'api'), ('FWI >= 7 atau tidak tersedia', 'merah', 'sinyal')]),
      ('Siaga pemadaman awal', ORANYE, 'api', [('keparahan S3, cuaca apa pun', 'oranye', 'api'), ('atau S2 dengan FWI >= 7', 'oranye', 'sinyal')]),
      ('Patroli terpadu', BAJA, 'mata', [('S2 dengan FWI < 7', 'navy', 'sinyal'), ('S1 dengan FWI >= 7', 'navy', 'sinyal'), ('S1/S2 tanpa data cuaca', 'navy', 'awas')]),
      ('Pencegahan rutin', ABU, 'perisai', [('S1 dengan FWI < 7', 'abu', 'sinyal')])]
for k, (j, bl, ik, ch) in enumerate(ST):
    baris(s, X0 + 400000, yi + 200000 + k * 820000, X0 + 7170725 - 140000, j, ch, None, bl, ik)
yi = panel(s, 7810000, Y2, XK - 7810000, 4000000, 'Keparahan dari satelit', ORANYE, 'FBE7D6', 'api', 3)
for k, (j, d_, bl) in enumerate((('S3', 'front >= 10 piksel 24 jam, atau >= 4 hari dengan >= 5 piksel', MERAH), ('S2', 'di antara S1 dan S3', ORANYE),
                                 ('S1', '< 3 deteksi dan baru 1 hari', ABU))):
    baris(s, 7810000 + 400000, yi + 200000 + k * 700000, XK - 120000, j, None, bulat=bl, ik='api', sub=d_)
tx(s, 7960000, yi + 2350000, 3500000, 900000, [('Cuaca hanya menaikkan: api besar (S3) minimal Siaga. Uji balik Agu s.d. Okt 2019 dan 2023: menangkap 90 s.d. 95% api yang akhirnya >= 100 piksel sebelum separuh ukurannya.', 7, False, ABU)], an='t')
kaki(s)

# ================================================================== 12 angka acuan
s = slide('Angka acuan yang dipakai sistem',
    'Ini ringkasan seluruh angka acuan. Ukuran piksel, faktor luas 4,12 hektare untuk NOAA-20 dan 4,16 hektare untuk NOAA-21, jendela 12 sampai 36 jam untuk belum padam, '
    '48 jam untuk padam, jarak gabung 1,5 kilometer, ambang firespot empat piksel, dan ambang prioritas 15 piksel. Faktor luas adalah satu-satunya '
    'angka hasil kalibrasi ke luas resmi; yang lain aturan operasional yang sudah diuji balik atau ditetapkan pemilik.', ('Angka acuan',))
yi = panel(s, X0, 1050000, W, 5050000, 'Parameter', NAVY, 'E6EAF0', 'lapis', 12)
tabel(s, X0 + 150000, yi + 120000, W - 300000, [('PARAMETER', 3, 'l'), ('NILAI', 2, 'c'), ('KETERANGAN', 5, 'l')],
      [['Piksel VIIRS', '14,06 ha', '375 m x 375 m'], ['Piksel MODIS', '100 ha', '1 km x 1 km'],
       ['Luas per titik NOAA-20', [('4,12 ha', 7.2, True, ORANYE)], 'luas resmi BNPB 2019 s.d. 2025 / titik tersaring; rentang 3,69 s.d. 5,91'],
       ['Luas per titik NOAA-21', [('4,16 ha', 7.2, True, ORANYE)], 'median 2024 s.d. 2025'], ['Rumus luas', '(N20 x 4,12 + N21 x 4,16) / 2', 'satu satelit hilang: yang ada saja, tanpa dibagi 2'],
       ['Sel persistensi', '3 x 3 sel', 'sel 375 m, sekitar 1,1 km'], ['Jendela belum padam', '12 s.d. 36 jam', 'titik lama di sel tetangga'],
       ['Padam', '48 jam', 'tanpa titik di sel 3 x 3'], ['Jarak gabung cluster', '<= 1,5 km', 'adaptif mulai 0,6 km'],
       ['Cluster aktif', '72 jam', '168 jam di gambut kering'], ['Ambang firespot High', '4 piksel unik', 'atau 1 titik keyakinan tinggi'],
       ['Prioritas pemadaman', '15 piksel', 'front aktif 24 jam dan FWI >= 7']], rh=330000, sorot=(2, 4))
kaki(s)

# ================================================================== 13 cut-off
s = slide('Jam cut-off: kapan satu hari dihitung',
    'Satu hari di website adalah hari kalender WIB, pukul 00.00 sampai 24.00, menurut waktu akuisisi satelit. Laporan BNPB memakai jam tutup '
    'sendiri: Laporan Kejadian Bencana Harian pukul 12.00 WIB dan Laporan Penanganan Karhutla pukul 15.00 WIB. Angka hari laporan pada jam itu '
    'masih sementara, karena lintasan sore dan malam belum lewat, dan data FIRMS datang sekitar tiga jam sesudah satelit lewat.', ('cut-off',))
wadah_kartu(s, X0, Y1, W, 'JAM CUT-OFF', [('rumah', 'navy', '24.00', 'website, hari kalender'), ('kalender', 'oranye', '12.00', 'Laporan Harian Bencana'),
            ('kalender', 'oranye', '15.00', 'Laporan Penanganan'), ('putar', 'merah', '± 3 jam', 'keterlambatan FIRMS')])
yi = panel(s, X0, Y2, 7170725, 4000000, 'Lintasan satelit di Sumatra dan Kalimantan', ORANYE, 'FBE7D6', 'pesawat', 4)
for k, (j, ch) in enumerate((('VIIRS S-NPP, NOAA-20, NOAA-21', [('00.00 s.d. 02.30 WIB', 'navy', 'kalender'), ('12.00 s.d. 14.00 WIB', 'navy', 'kalender')]),
                             ('MODIS Terra', [('07.30 s.d. 08.30 WIB', 'navy', 'kalender'), ('19.00 s.d. 21.00 WIB', 'navy', 'kalender')]),
                             ('MODIS Aqua', [('03.00 s.d. 04.00 WIB', 'navy', 'kalender'), ('14.30 s.d. 16.00 WIB', 'navy', 'kalender')]),
                             ('Data tiba di FIRMS', [('+-3 jam sesudah lintasan', 'merah', 'putar')]))):
    baris(s, X0 + 400000, yi + 200000 + k * 820000, X0 + 7170725 - 140000, j, [(t.replace('+-', '±'), g, i) for t, g, i in ch], None, ORANYE if k < 3 else MERAH, 'pesawat')
yi = panel(s, 7810000, Y2, XK - 7810000, 4000000, 'Angka sementara', MERAH, 'F8DDE0', 'awas')
for k, (j, d_) in enumerate((('Laporan 12.00', 'lintasan siang Sumatra dan Kalimantan belum semua tiba'), ('Laporan 15.00', 'lintasan malam belum lewat'),
                             ('Hari lengkap', 'sekitar 04.00 WIB hari berikutnya'), ('Di grafik', 'hari sementara ditandai dan batangnya putus-putus'))):
    baris(s, 7810000 + 400000, yi + 200000 + k * 820000, XK - 120000, j, None, bulat=MERAH, ik='kalender', sub=d_)
kaki(s)

# ================================================================== 13b jadwal lintasan
s = slide('Kapan satelit lewat: angka hari ini bertambah sepanjang hari',
    'Satu hari dimulai pukul 00.00 WIB, tetapi satelit tidak melihat Indonesia terus-menerus. Satelit VIIRS lewat dua kali sehari: malam sekitar '
    'pukul 00.00 sampai 02.30 dan siang sekitar 12.00 sampai 14.00 WIB untuk Sumatra dan Kalimantan. MODIS Aqua lewat sekitar 03.00 dan 15.00, '
    'Terra sekitar 08.00 dan 20.00. Data tiba di FIRMS sekitar tiga jam sesudah satelit lewat. Jadi pada dini hari angka hari ini baru berisi '
    'lintasan malam, dan sering jauh lebih kecil daripada kemarin. Contoh 25 Oktober pukul 02.45: baru sekitar 3.780 titik, sedangkan kemarin '
    'pada jam yang sama sudah 10.431. Lintasan siang kemarin menyumbang sekitar 6.400 dari 17.818 titik. Untuk gambaran utuh di pagi hari, pakai '
    'angka kemarin.', ('angka hari ini bertambah',))
wadah_kartu(s, X0, Y1, 7170725, 'HARI SATELIT', [('kalender', 'navy', '00.00', 'hari baru mulai (WIB)'), ('pesawat', 'oranye', '2 kali', 'VIIRS lewat per hari'),
            ('putar', 'merah', '± 3 jam', 'data terlambat tiba'), ('centang', 'navy', '04.00', 'hari kemarin lengkap')])
wadah_kartu(s, 7810000, Y1, XK - 7810000, 'CONTOH 25 OKT, 02.45 WIB', [('api', 'merah', '3.780', 'titik baru masuk'), ('kalender', 'navy', '10.431', 'kemarin, jam sama')],
            latar='FCF1F2', warna_pil=MERAH, ik_pil='awas')
yi = panel(s, X0, Y2, 7170725, 4000000, 'Jadwal lintasan, Sumatra dan Kalimantan (WIB)', ORANYE, 'FBE7D6', 'pesawat', 5)
gx0, gx1 = X0 + 1700000, X0 + 7170725 - 200000
jx = lambda h: gx0 + (gx1 - gx0) * h / 24
for h in range(0, 25, 3):
    garis(s, jx(h), yi + 180000, jx(h), yi + 3150000, 'EEF0F3', 0.75)
    tx(s, jx(h) - 200000, yi + 3180000, 400000, 160000, [(f'{h:02d}.00', 6.5, False, ABU)], al='c')
LIN = [('VIIRS S-NPP', [(0.0, 2.5), (12.0, 14.0)], ORANYE, 's.d. 1 Nov'), ('VIIRS NOAA-20', [(0.5, 1.5), (12.0, 14.0)], ORANYE, ''),
       ('VIIRS NOAA-21', [(0.0, 1.5), (12.5, 13.5)], ORANYE, ''), ('MODIS Aqua', [(3.0, 4.0), (14.5, 16.0)], NAVY, ''), ('MODIS Terra', [(7.5, 8.5), (19.0, 21.0)], NAVY, '')]
for k, (n, win, c_, cat_) in enumerate(LIN):
    y = yi + 300000 + k * 560000
    tx(s, X0 + 200000, y, 1450000, 260000, [(n, 8, True, TUA)] + ([('\n' + cat_, 6.5, False, MERAH)] if cat_ else []), an='t')
    for a, z in win:
        bentuk(s, jx(a), y + 20000, jx(z) - jx(a), 220000, c_, prst=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.3)
        bentuk(s, jx(a + 3), y + 20000, jx(z + 3) - jx(a + 3), 220000, 'F4C3A0' if c_ == ORANYE else 'C9D1DA', prst=MSO_SHAPE.ROUNDED_RECTANGLE, adj=0.3)
deret(s, X0 + 200000, yi + 3420000, [('satelit lewat', 'oranye', 'pesawat'), ('data tiba di FIRMS (± 3 jam)', 'abu', 'putar'), ('Papua: sekitar 1,5 jam lebih awal', 'navy', 'pin')], X0 + 7100000)
yi = panel(s, 7810000, Y2, XK - 7810000, 4000000, 'Mengapa angka pagi masih kecil', MERAH, 'F8DDE0', 'awas', 3)
for k, (j, d_, ik) in enumerate((('Baru lintasan malam', 'pukul 02.45 baru lintasan 00.00 s.d. 02.30 yang masuk; lintasan siang belum lewat', 'kalender'),
                                 ('Lintasan siang besar', 'kemarin sekitar 6.400 dari 17.818 titik datang dari lintasan siang', 'pesawat'),
                                 ('Awan atau api berkurang', 'malam yang jauh lebih rendah bisa karena awan/hujan; dipastikan sesudah lintasan siang', 'mata'))):
    baris(s, 7810000 + 400000, yi + 200000 + k * 850000, XK - 120000, j, None, bulat=MERAH, ik=ik, sub=d_)
tx(s, 7960000, yi + 2850000, 3500000, 500000, [('Untuk gambaran utuh di pagi hari, pakai angka kemarin. Jam lintasan diukur dari data FIRMS 22 s.d. 24 Okt 2026.', 7, False, ABU)], an='t')
kaki(s)

# ================================================================== 14 batasan
s = slide('Batasan yang perlu disampaikan bersama angka',
    'Ada enam batasan yang perlu disampaikan bersama angka. Luas adalah perkiraan, bukan luas resmi. Kalibrasinya nasional dan tahunan, jadi per '
    'hari dan per provinsi bersifat indikatif. Awan, asap, dan api di bawah gambut tidak terlihat satelit. S-NPP berhenti 1 November, jadi seri '
    'titik panas berubah mulai hari itu. Dan jumlah titik bukan jumlah api.', ('Batasan',))
yi = panel(s, X0, 1050000, W, 5050000, 'Enam batasan', MERAH, 'F8DDE0', 'awas', 6)
BT = [('Perkiraan, bukan luas resmi', 'luas resmi tetap dari verifikasi lapangan dan citra dNBR', ('perkiraan', 'merah', 'awas'), 'luas'),
      ('Indikatif per hari dan provinsi', 'kalibrasi nasional tahunan; rasio terhadap SiPongi antarprovinsi 0,3 s.d. 2,2', ('indikatif', 'merah', 'awas'), 'pin'),
      ('Awan dan asap', 'api di bawah awan atau asap tebal tidak terdeteksi; titik hari itu terlalu rendah', ('bisa kurang', 'oranye', 'mata'), 'mata'),
      ('Api bawah gambut', 'bara di bawah permukaan tidak terlihat; padam versi satelit bisa terlalu cepat', ('bisa kurang', 'oranye', 'gambut'), 'gambut'),
      ('S-NPP berhenti 1 Nov 2026', 'NOAA-21 menggantikannya; seri titik panas berubah mulai hari itu dan ditandai di grafik', ('seri berubah', 'navy', 'putar'), 'pesawat'),
      ('Titik bukan jumlah api', 'satu api dilihat beberapa satelit; jumlah kejadian = jumlah cluster', ('baca cluster', 'navy', 'pin'), 'api')]
for k, (j, d_, st, ik) in enumerate(BT):
    baris(s, X0 + 400000, yi + 200000 + k * 720000, XK - 140000, j, None, st, MERAH if k < 2 else ORANYE if k < 4 else NAVY, ik, d_)
kaki(s)

# ================================================================== 15 banding Kemenhut
s = slide('Beda dengan SIPANTAU Kemenhut',
    'Kedua sistem memakai data FIRMS yang sama, tetapi berbeda di tiga hal. Cara mengelompokkan: kami DBSCAN sampai 1,5 kilometer, Kemenhut '
    'radius 750 meter. Firespot: kami menghitung piksel unik dan persistensi lewat cluster yang sama. Luas: kami 4,12 hektare per titik NOAA-20 '
    'dan 4,16 hektare per titik NOAA-21 yang dikalibrasi ke luas resmi BNPB, lalu dirata-rata, setara 2,07 hektare per titik NOAA; Kemenhut 20 persen '
    'luas piksel, sekitar 2,8 hektare, sebagai asumsi yang akan dikalibrasi dengan dNBR. Faktor Kemenhut sekitar 35 persen lebih besar.', ('SIPANTAU Kemenhut',))
wadah_kartu(s, X0, Y1, 7170725, 'LUAS PER TITIK VIIRS', [('luas', 'oranye', '2,07 ha', 'metode ini'), ('luas', 'navy', '2,8 ha', 'SIPANTAU Kemenhut'),
            ('lapis', 'navy', '35%', 'Kemenhut lebih besar'), ('centang', 'navy', 'FIRMS', 'sumber yang sama')])
wadah_kartu(s, 7810000, Y1, XK - 7810000, 'DASAR FAKTOR', [('centang', 'oranye', 'Kalibrasi', 'BNPB 2019 s.d. 2025'), ('awas', 'merah', 'Asumsi', 'Kemenhut, dNBR nanti')],
            latar='FCF1F2', warna_pil=ORANYE, ik_pil='luas')
yi = panel(s, X0, Y2, W, 4000000, 'Perbandingan per aspek', NAVY, 'E6EAF0', 'jabat', 7)
tabel(s, X0 + 150000, yi + 100000, W - 300000, [('ASPEK', 2, 'l'), ('METODE INI', 4, 'l'), ('SIPANTAU KEMENHUT', 4, 'l')],
      [['Titik panas', 'MODIS 1 km + VIIRS 375 m (S-NPP, NOAA-20), semua keyakinan, hari WIB', 'VIIRS dan MODIS, keyakinan Medium atau High'],
       ['Cluster', 'DBSCAN, jarak adaptif sampai 1,5 km', 'radius 750 m dari titik tengah'],
       ['Persistensi', 'cluster yang sama, sambungan 48 jam', 'H-1 dalam 750 m; H-2 dalam 375 m'],
       ['Firespot', 'pola High dan Medium 3 hari, dihitung per piksel unik', 'pola yang sama, dihitung per titik'],
       ['Luas per titik VIIRS', [('2,07 ha', 7.2, True, ORANYE), ('  ((4,12 + 4,16) / 4)', 7.2, False, NAVY)], [('2,8 ha', 7.2, True, NAVY), ('  (14,06 ha x 20%)', 7.2, False, NAVY)]],
       ['Dasar faktor luas', 'kalibrasi ke luas resmi BNPB 2019 s.d. 2025, diuji', 'asumsi; kalibrasi dNBR direncanakan'],
       ['Belum padam dan padam', '12 s.d. 36 jam bertahan; 48 jam tanpa titik', 'tidak dipaparkan']], rh=440000, sorot=(4, 5))
kaki(s)

# ================================================================== penutup
ganti(penutup, 'Laporan Kejadian Bencana Harian', 'Metode Perhitungan Titik Panas dan Luas Terbakar, 25 Oktober 2026')
ganti(penutup, 'Lampiran', 'Data dan peta: centurisk97.id')

lst = prs.slides._sldIdLst; ids = list(lst)
for sid in ids[1:3]: prs.part.drop_rel(sid.rId); lst.remove(sid)
ids = list(lst); lst.remove(ids[1]); lst.append(ids[1])
for sl in prs.slides:
    for sh in sl.shapes:
        if sh.has_text_frame:
            t = sh.text_frame.text
            assert '—' not in t and '·' not in t, ('em dash / titik tengah', t)
            assert 'pantau bencana' not in t.lower() and '+-' not in t, ('nama Pantau Bencana / +- tersisa (pemilik 25 Okt)', t)
    assert 'pantau bencana' not in sl.notes_slide.notes_text_frame.text.lower(), 'nama Pantau Bencana di catatan pembicara'
assert not PANJANG, ('label kartu terlalu panjang (label, maks huruf)', PANJANG)
prs.save(OUT); print('ok', OUT, len(prs.slides), 'slide')
