# Tiruan presisi KompasTV hal. 1, 3, 5. Semua gaya teks DIPASANG dari kotak batas rujukan (ukur.py): ukuran dari tinggi tinta,
# jarak huruf dari lebar, garis dasar dan tepi kiri dari posisi tinta. Mode 'kal' = klon isi rujukan (untuk mengukur selisih),
# mode 'papua' = isi Papua Selatan dengan gaya yang sama.
# python bangun3.py <kal|papua> <kerja_dir> <keluar.pptx>
import json, sys, os
from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw, ImageFont
from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.oxml.ns import qn
from lxml import etree

SINI = Path(__file__).parent; sys.path.insert(0, str(SINI))
import ukur
MODE, KERJA, KELUAR = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3]); KERJA.mkdir(parents=True, exist_ok=True)
REPO = Path(r'D:\Project\Work\BNPB\poskokarhutla'); PS = REPO / 'data/laporan-bnpb/paparan/papsel-2026-11-17'
ASLI = SINI / 'asli'
FONT = {'Anton': r'C:\Users\USER\AppData\Local\Microsoft\Windows\Fonts\Anton-Regular.ttf',
        # kunci 'Arial'/'ArialB' dipertahankan, isinya Helvetica (dipasang pemilik 18 Nov 2026)
        'Arial': r'C:\Users\USER\AppData\Local\Microsoft\Windows\Fonts\Helvetica.ttf',
        'ArialB': r'C:\Users\USER\AppData\Local\Microsoft\Windows\Fonts\Helvetica-Bold.ttf'}
# kalibrasi PowerPoint (lihat pp.py): garis dasar = atas kotak + CB * ukuran; PowerPoint menggambar SM kali lebih kecil dari peramban
KAL = json.load(open(SINI / 'kal.json')) if (SINI / 'kal.json').exists() else {}
SM = KAL.get('SM', {'Anton': 1.0, 'Arial': 1.014, 'ArialB': 1.014})
CB = KAL.get('CB', {'Anton': 0.945, 'Arial': 0.955, 'ArialB': 0.975})
DX = KAL.get('DX', {'Anton': 0.03, 'Arial': 0.04, 'ArialB': 0.05})

_f = {}
def fnt(k, px):
    key = (k, round(px * 4) / 4)
    if key not in _f: _f[key] = ImageFont.truetype(FONT[k], max(1, round(px * 4) / 4))
    return _f[key]
def bb(k, t, px):
    b = fnt(k, 1000).getbbox(t, anchor='ls')   # tanpa hinting: ukur di 1000 lalu skala linear
    return tuple(v * px / 1000 for v in b)

# ---------- rujukan: ukur sekali ----------
UK = {h: ukur.ukur(str(ASLI / f'p0{h}.jpeg'), h) for h in (1, 3, 5)}
_img = {h: np.asarray(Image.open(ASLI / f'p0{h}.jpeg').convert('RGB')).astype(int) for h in (1, 3, 5)}

def baris_tinta(h, nama):
    """pecah kotak elemen jadi kotak per baris (celah >= 3 baris kosong)."""
    reg = dict((n, (r, p)) for n, r, p in ukur.E[h])[nama]
    (x0, y0, x1, y1), p = reg
    c = _img[h][y0:y1, x0:x1]; m = ukur.pred(p)(c[..., 0], c[..., 1], c[..., 2])
    rows = np.nonzero(m.any(1))[0]
    grup = [[rows[0], rows[0]]]
    for r in rows[1:]:
        if r - grup[-1][1] >= 3: grup.append([r, r])
        else: grup[-1][1] = r
    out = []
    for a, b_ in grup:
        mm = m[a:b_ + 1]; xs = np.nonzero(mm.any(0))[0]
        out.append((x0 + xs.min(), y0 + a, x0 + xs.max() + 1, y0 + b_ + 1))
    return out

def gaya(h, nama, teks, f, baris=0, k_nol=False, warna=None):
    """pasang gaya dari kotak tinta rujukan: px, k (jarak huruf / px), x tinta, garis dasar, warna, jarak baris."""
    kotak = baris_tinta(h, nama) if baris is not None else None
    x0, y0, x1, y1 = kotak[baris]
    b100 = bb(f, teks, 100); px = (y1 - y0) / (b100[3] - b100[1]) * 100
    b = bb(f, teks, px); lebar_alami = b[2] - b[0]
    k = 0 if k_nol or len(teks) < 2 else ((x1 - x0) - lebar_alami) / ((len(teks) - 1) * px)
    if len(teks) < 3: k = 0
    elif abs(k) < 0.05 or f == 'Arial':
        # jarak huruf kecil dibulatkan PowerPoint: pasang ukuran dari lebar, tanpa jarak huruf
        k = 0; px = px * (x1 - x0) / lebar_alami; b = bb(f, teks, px)
    dasar = (y0 - b[1] + y1 - b[3]) / 2 if b[3] <= 0.5 else y0 - b[1]
    pitch = None
    if len(kotak) > 1: pitch = kotak[1][1] - kotak[0][1]
    w = warna or UK[h][nama][4]
    if not warna and f == 'Arial' and px < 24:
        w = ''.join('%02X' % min(255, int(w[i:i + 2], 16) + 10) for i in (0, 2, 4))
    return dict(px=px, k=k, x=x0, dasar=dasar, warna=w, f=f, pitch=pitch)

# ---------- PowerPoint ----------
prs = Presentation(); prs.slide_width, prs.slide_height = Emu(1920 * 6350), Emu(1080 * 6350)
KOSONG = prs.slide_layouts[6]
E = lambda v: Emu(int(round(v * 6350)))

def tulis(s, teks, g, x=None, dasar=None, warna=None, rata='kiri', lebar_kotak=None, px=None):
    """letakkan teks agar tinta mulai di x dan garis dasarnya di `dasar` (piksel rujukan)."""
    f = g['f']; px = px or g['px']; k = g['k']; x = g['x'] if x is None else x + g.get('dxr', 0); dasar = g['dasar'] if dasar is None else dasar
    pxp = px * SM[f]
    b = bb(f, teks, px); w = (b[2] - b[0]) + k * px * (len(teks) - 1)
    if rata == 'kanan': x = x - w
    elif rata == 'tengah': x = x - w / 2
    kiri = x - b[0] - DX[f] * pxp
    atas = dasar - CB[f] * pxp
    t = s.shapes.add_textbox(E(kiri), E(atas), E(lebar_kotak or (w + px * 2)), E(px * 1.4)); tf = t.text_frame
    tf.word_wrap = False; tf.auto_size = None
    for a in ('margin_left', 'margin_right', 'margin_top', 'margin_bottom'): setattr(tf, a, 0)
    r = tf.paragraphs[0].add_run(); r.text = teks; ft = r.font
    ft.size = Pt(round(pxp / 2 * 100) / 100); ft.name = 'Anton' if f == 'Anton' else 'Helvetica'; ft.bold = f == 'ArialB'
    ft.color.rgb = RGBColor.from_string(warna or g['warna'])
    if k: r._r.get_or_add_rPr().set('spc', str(int(round(k * px * 50))))
    return x + w   # tepi kanan tinta

def kotak(s, x0, y0, x1, y1, isi=None, gradien=None, sudut=0):
    """kotak penuh dari piksel x0..x1-1, y0..y1-1 (tanpa garis, supaya tepi tepat piksel)."""
    b = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if sudut else MSO_SHAPE.RECTANGLE, E(x0), E(y0), E(x1 - x0), E(y1 - y0))
    if sudut: b.adjustments[0] = sudut / min(x1 - x0, y1 - y0)
    if gradien:
        b.fill.gradient(); b.fill.gradient_angle = gradien[2] if len(gradien) > 2 else 0
        st = b.fill.gradient_stops
        st[0].color.rgb = RGBColor.from_string(gradien[0]); st[0].position = 0
        st[1].color.rgb = RGBColor.from_string(gradien[1]); st[1].position = 1.0
    elif isi: b.fill.solid(); b.fill.fore_color.rgb = RGBColor.from_string(isi)
    b.line.fill.background(); b.shadow.inherit = False
    return b

def berbingkai(s, x0, y0, x1, y1, isi, bingkai):
    kotak(s, x0, y0, x1, y1, bingkai); kotak(s, x0 + 1, y0 + 1, x1 - 1, y1 - 1, isi)

def gambar(s, p, x, y, w, h): return s.shapes.add_picture(str(p), E(x), E(y), E(w), E(h))

# ---------- aset gambar ----------
def logo_aset():
    i = Image.open(REPO / 'public/img/logo-kris.png').convert('RGBA'); W, H = i.size; a = np.array(i)
    opak = a[..., 3] > 20; kol = opak[: int(H * 0.75)].any(0)
    x0 = np.argmax(kol); x = x0
    while x < W and kol[x]: x += 1
    biru = (a[..., 2].astype(int) > a[..., 0].astype(int) + 20) & opak
    xx, yy = np.meshgrid(np.arange(W), np.arange(H))
    ganti = opak & ((xx > x) | (yy > H * 0.75))
    a[ganti, 0:3] = 255
    Image.fromarray(a).crop(Image.fromarray(a).getbbox()).save(KERJA / 'kris.png')
    j = Image.open(REPO / 'data/kajian-bnpb/skill/surat-bnpb/assets/logo-bnpb.png').convert('RGBA').crop((0, 0, 565, 565))
    j.crop(j.getbbox()).save(KERJA / 'lambang.png')

PROFIL = {}
def profil(h, x, y0, y1):
    a = _img[h][y0:y1, x]; return a
PROFIL['gelap49'] = profil(3, 790, 712, 761); PROFIL['oranye49'] = profil(3, 790, 880, 929)
PROFIL['gelap60'] = profil(5, 776, 722, 782); PROFIL['oranye60'] = profil(5, 776, 422, 482)

def tombol(nama_ikon, uk, jenis, keluar, latar_terang=False):
    S = 4; m = 16; W = (uk + 2 * m) * S; r = uk * 0.2 * S
    im = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    bay = Image.new('L', (W, W)); ImageDraw.Draw(bay).rounded_rectangle((m * S + 2 * S, (m + 4) * S, (m + uk - 2) * S, (m + uk + 3) * S), r, fill=150 if latar_terang else 200)
    im.paste((0, 0, 0, 255), (0, 0), bay.filter(ImageFilter.GaussianBlur(5 * S)))
    prof = PROFIL[f"{jenis}{'60' if uk >= 55 else '49'}"]
    g = np.zeros((W, W, 3), 'uint8')
    for y in range(uk * S):
        i = min(len(prof) - 1, int(y / (uk * S) * len(prof))); g[m * S + y, :] = prof[i]
    mk = Image.new('L', (W, W)); ImageDraw.Draw(mk).rounded_rectangle((m * S, m * S, (m + uk) * S - 1, (m + uk) * S - 1), r, fill=255)
    im.paste(Image.fromarray(g), (0, 0), mk)
    ui = int(uk * 0.46 * S)
    if nama_ikon == 'denyut':
        ik = Image.new('RGBA', (96 * 4, 96 * 4), (0, 0, 0, 0)); d = ImageDraw.Draw(ik); q = 16
        pts = [(22, 12), (18, 12), (15, 21), (9, 3), (6, 12), (2, 12)]
        d.line([(x * q, y * q) for x, y in pts], fill='white', width=int(2 * q), joint='curve')
        for x, y in (pts[0], pts[-1]): d.ellipse((x * q - q, y * q - q, x * q + q, y * q + q), fill='white')
    else: ik = Image.open(PS / f'ik/lpg-ik-{nama_ikon}-putih.png').convert('RGBA')
    ik = ik.resize((ui, ui), Image.LANCZOS)
    im.alpha_composite(ik, ((W - ui) // 2, (W - ui) // 2))
    im = im.resize((uk + 2 * m, uk + 2 * m), Image.LANCZOS); im.save(keluar)
    return m

def tombol_lama(nama_ikon, uk, jenis, keluar, latar_terang=False):
    """tombol ikon mengilap: tepi abu di atas, kilap setengah atas, bayangan bawah. Kanvas = kotak + 16 px margin bayangan."""
    S = 4; m = 16; W = (uk + 2 * m) * S; r = uk * 0.2 * S
    im = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    bay = Image.new('L', (W, W)); ImageDraw.Draw(bay).rounded_rectangle((m * S, (m + 5) * S, (m + uk) * S, (m + uk + 4) * S), r, fill=170 if not latar_terang else 90)
    bay = bay.filter(ImageFilter.GaussianBlur(6 * S))
    im.paste((0, 0, 0, 255), (0, 0), bay)
    kotak_m = Image.new('L', (W, W)); ImageDraw.Draw(kotak_m).rounded_rectangle((m * S, m * S, (m + uk) * S - 1, (m + uk) * S - 1), r, fill=255)
    if jenis == 'oranye': atas, bawah, tepi, kilap = (255, 140, 66), (240, 92, 12), (255, 176, 120), 70
    else: atas, bawah, tepi, kilap = (52, 52, 52), (8, 8, 8), (120, 120, 120), 60
    g = Image.new('RGB', (W, W))
    for y in range(W):
        t = max(0, min(1, (y - m * S) / (uk * S))); g.paste(tuple(int(atas[i] + (bawah[i] - atas[i]) * t) for i in range(3)), (0, y, W, y + 1))
    im.paste(g, (0, 0), kotak_m)
    # tepi terang tipis di atas (bevel)
    tp = Image.new('L', (W, W)); d = ImageDraw.Draw(tp)
    d.rounded_rectangle((m * S, m * S, (m + uk) * S - 1, (m + uk) * S - 1), r, outline=255, width=int(1.5 * S))
    gradtp = Image.new('L', (W, W))
    for y in range(W):
        t = max(0, min(1, (y - m * S) / (uk * 0.5 * S))); gradtp.paste(int(255 * (1 - t)), (0, y, W, y + 1))
    tp = Image.fromarray((np.array(tp).astype(int) * np.array(gradtp) // 255).astype('uint8'))
    im.paste(tepi, (0, 0), tp)
    # kilap setengah atas
    kl = Image.new('L', (W, W)); ins = 3 * S
    ImageDraw.Draw(kl).rounded_rectangle((m * S + ins, m * S + ins, (m + uk) * S - ins, (m + uk * 0.5) * S), r * 0.8, fill=255)
    gk = Image.new('L', (W, W))
    for y in range(W):
        t = max(0, min(1, (y - m * S - ins) / (uk * 0.45 * S))); gk.paste(int(kilap * (1 - t) + 12 * t), (0, y, W, y + 1))
    kl = Image.fromarray((np.array(kl).astype(int) * np.array(gk) // 255).astype('uint8'))
    im.paste((255, 255, 255), (0, 0), kl)
    # ikon putih
    ik = Image.open(PS / f'ik/lpg-ik-{nama_ikon}-putih.png').convert('RGBA')
    ui = int(uk * 0.46 * S); ik = ik.resize((ui, ui), Image.LANCZOS)
    im.alpha_composite(ik, ((W - ui) // 2, (W - ui) // 2))
    im = im.resize((uk + 2 * m, uk + 2 * m), Image.LANCZOS); im.save(keluar)
    return m

def hantu_aset(teks, px, warna, keluar, potong_atas_y, dasar):
    """teks Anton besar sebagai gambar, dipotong pada y kartu atas. return (x_tinta0, y, w, h) relatif tinta."""
    f = ImageFont.truetype(FONT['Anton'], int(px * 4)); b = f.getbbox(teks, anchor='ls')
    im = Image.new('RGBA', (b[2] - b[0] + 8, b[3] - b[1] + 8), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((-b[0] + 4, -b[1] + 4), teks, font=f, fill='#' + warna, anchor='ls')
    im = im.crop(im.getbbox()); im = im.resize((round(im.width / 4), round(im.height / 4)), Image.LANCZOS)
    atas = dasar - im.height
    if atas < potong_atas_y: im = im.crop((0, potong_atas_y - atas, im.width, im.height)); atas = potong_atas_y
    im.save(keluar); return atas, im.width, im.height

def isi_foto(foto, w, h, geser=0.5, gy=0.5):
    f = Image.open(foto).convert('RGB'); sk = max(w / f.width, h / f.height)
    f = f.resize((int(f.width * sk) + 1, int(f.height * sk) + 1), Image.LANCZOS)
    x = int((f.width - w) * geser); y = int((f.height - h) * gy); return f.crop((x, y, x + w, y + h))

def latar_isi(foto, keluar, geser=0.5):
    """latar sangat gelap seperti rujukan: rata-rata kecerahan ~12, maksimum ~24."""
    f = isi_foto(foto, 1920, 1080, geser).filter(ImageFilter.GaussianBlur(2))
    a = np.asarray(ImageEnhance.Color(f).enhance(0.6)).astype(float)
    a = 9 + a * (15 / 255.0)
    Image.fromarray(np.clip(a, 0, 255).astype('uint8')).save(keluar, quality=95)

def kartu_foto(foto, w, h, keluar, geser=0.5, gy=0.5, gelap=(0.45, 1.0, 0.92), terang=0.9, atas=None):
    f = isi_foto(foto, w * 2, h * 2, geser, gy); f = ImageEnhance.Brightness(ImageEnhance.Color(f).enhance(0.85)).enhance(terang)
    a = np.asarray(f).astype(float); H = a.shape[0]
    t = np.clip((np.arange(H) / H - gelap[0]) / (gelap[1] - gelap[0]), 0, 1)[:, None, None] * gelap[2]
    if atas: t = np.maximum(t, np.clip(1 - np.arange(H) / (H * atas[0]), 0, 1)[:, None, None] * atas[1])
    a = a * (1 - t) + np.array([16, 15, 13]) * t
    Image.fromarray(a.astype('uint8')).save(keluar, quality=93)

def latar_sampul(foto, keluar, geser=0.4, gy=0.5):
    W, H = 1920, 1080
    f = isi_foto(foto, 1200, H, geser, gy)
    f = ImageEnhance.Brightness(ImageEnhance.Color(f).enhance(0.55)).enhance(0.85)
    a = np.asarray(f).astype(float)
    kan = np.full((H, W, 3), 10.0); kan[:, 720:] = a
    x = np.arange(W); t = np.clip((x - 800) / 380, 0, 1) ** 1.2
    kan = kan * t[None, :, None] + 10 * (1 - t[None, :, None])
    # cahaya oranye kanan bawah
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.sqrt(((W - xx) / 1100) ** 2 + ((H - yy) / 650) ** 2); g = np.clip(1 - d, 0, 1) ** 1.3 * 0.55
    kan = kan * (1 - g[..., None]) + np.array([255, 106, 19]) * g[..., None]
    Image.fromarray(np.clip(kan, 0, 255).astype('uint8')).save(keluar, quality=93)

logo_aset()
def tagline_aset():
    # tulisan kecil di bawah BNPB: digambar 4x lalu diperkecil (PowerPoint merusak jarak huruf pada 9 px)
    S = 4; im = Image.new('RGBA', (170 * S, 26 * S), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    r = [b for b in baris_tinta(3, 'tagline')]
    for t, (x0, y0, x1, y1) in zip(('BADAN NASIONAL', 'PENANGGULANGAN BENCANA'), r):
        f1000 = ImageFont.truetype(FONT['ArialB'], 1000); b = f1000.getbbox(t, anchor='ls')
        px = (x1 - x0) / (b[2] - b[0]) * 1000
        f = ImageFont.truetype(FONT['ArialB'], int(px * S)); bb4 = f.getbbox(t, anchor='ls')
        d.text(((x0 - 1660) * S - bb4[0], (y1 - 96) * S), t, font=f, fill=(255, 255, 255, 255), anchor='ls')
    im.resize((170, 26), Image.LANCZOS).save(KERJA / 'tagline.png')

tagline_aset()
# ---------- isi ----------
if MODE == 'kal':
    from types import SimpleNamespace as NS
    C = NS(
        s1_label='BNPB / KOMPAS SIANG', s1_judul=['HADIR.', 'SIAGA.', 'MELINDUNGI.'], s1_sub='Negara hadir. Warga merasa aman.',
        s1_pil=['BERSIH', 'SIAGA', 'TERHUBUNG'], s1_tgl='17 NOVEMBER 2026', s1_kaki='WAWANCARA KEPALA BNPB', s1_kredit='Foto: Dok. BNPB',
        s1_foto=None,
        label='BNPB / KOMPAS SIANG', seg='SEGMEN 1 · BANJIR ACEH',
        s2_no='1.1 /', s2_j=['HUJAN TINGGI BERTEMU', 'SUNGAI YANG RENTAN.'], s2_sub='Dua kali berturut-turut: ketahanan sungai harus diperkuat.',
        s2_pil='PIDIE JAYA · NOV 2026', s2_fk='PEMICU LANGSUNG', s2_fj='HUJAN INTENSITAS TINGGI', s2_ft='bertemu sungai, tebing, dan tanggul yang rentan.',
        s2_kredit='Foto: Metro TV · banjir Pidie Jaya', s2_foto=None,
        k1=dict(kick='BANJIR 2025', angka='596', sat='JIWA', sub='meninggal & hilang · banjir-longsor · 15 kab/kota', a2='947.266', t2='jiwa mengungsi · seluruh Aceh', hantu='2025'),
        k2=dict(kick='BANJIR 2026', angka='17.307', sat='KK', sub='terdampak · 9 kab/kota · per 15 Nov', a2='8', t2='kab/kota belum surut · per 15 Nov', hantu='2026'),
        pola='POLA DARI LAPORAN LAPANGAN',
        baris=[('gelombang', 'PIDIE JAYA', ['Tebing sungai di Dayah Usen jebol dan meluas.']), ('perisai', 'ACEH TAMIANG', ['Tanggul penahan banjir terkikis.']),
               ('denyut', 'SUBULUSSALAM', ['Debit sungai di Sultan Daulat diperkirakan', 'mendekati batas meluap.'])],
        persen='±80%', persen_n=80, persen_lbl='batas meluap',
        s2_cat='Angka 2025 dan 2026 berbeda cakupan dan tanggal; tidak dijumlahkan.',
        s2_sumber=['DIBI BNPB, Nov 2026', 'BNPB | Laporan Dit. Koordalops, 2–15 Nov 2026', 'Paparan Situasi Banjir Sepekan, 16 Nov 2026', 'GloFAS, 15 Nov 2026'],
        s3_no='1.3 /', s3_j=['BANTUAN HARUS SAMPAI,', 'TERMASUK KE DESA TERPUTUS.'], s3_sub='Data kebutuhan menentukan arah bantuan.',
        s3_kredit='Foto: Metro TV · banjir Subulussalam', s3_foto=None, s3_fk='PENGUNGSI DI ACEH · 15 NOV', s3_angka='5.626', s3_sat='JIWA',
        s3_ft='Terbanyak di Aceh Tamiang.', s3_pil=[['MAKANAN', 'AIR BERSIH', 'LAYANAN KESEHATAN'], ['LANSIA, IBU, ANAK']],
        s3_baris=[('1', 'kalender', 'oranye', 'POSKO', ['Data kebutuhan dan pengungsi; diperbarui setiap hari.'], None),
                  ('2', 'rumah', 'oranye', 'JALUR DARAT', ['Logistik BPBD ke Sultan Daulat & Rundeng. Gayo Lues: 4 jembatan putus, jembatan darurat disiapkan.', 'Aceh Singkil: 10 titik akses terdampak.'], None),
                  ('3', 'pesawat', 'gelap', 'JALUR UDARA', ['Dukungan helikopter untuk wilayah', 'yang sulit dijangkau.'], 'DIRENCANAKAN'),
                  ('4', 'centang', 'gelap', 'TERCATAT', ['Dari gudang sampai diterima warga.'], None)],
        tl_atas='±498 km · ±149 menit', tl=['Lanud Soewondo', 'Subulussalam', 'Tukka'],
        s3_cat='Jalur udara masih rencana; pelaksanaan ditentukan pilot dan komando sesuai cuaca dan keselamatan.',
        s3_sumber=['Paparan Kebencanaan Sumut & Aceh, 16 Nov 2026', 'Paparan Situasi Banjir Sepekan, 16 Nov 2026', 'Flight plan heli dropping bantuan, 16 Nov 2026 | jarak & waktu: hitungan perencanaan 200 km/jam tanpa angin'],
    )
else:
    from types import SimpleNamespace as NS
    A = json.load(open(PS / 'angka.json', encoding='utf8'))
    P, HARI, K = A['prov'], A['HARI'], A['kec']; belum, hot = P['belum'], P['hot']
    ipk = belum.index(max(belum)); imn = belum.index(min(belum[ipk:])); lv, nk = A['level'], A['n_komp']
    kb = lambda k: K[f'Merauke|{k}']['belum']
    nauk, sota, kont, kim = kb('Naukenjerai'), kb('Sota'), kb('Kontuar'), kb('Kimaam')
    assert nauk + sota == 124 and belum[-1] == 275
    f0 = lambda v: f'{v:,.0f}'.replace(',', '.'); tg = lambda d: str(int(d[-2:]))
    persen = round(100 * belum[-1] / belum[ipk])
    C = NS(
        s1_label='BNPB / PAPARAN KARHUTLA', s1_judul=['PANTAU.', 'PADAMKAN.', 'LINDUNGI.'], s1_sub=f'{f0(belum[-1])} ha masih menyala di Papua Selatan.',
        s1_pil=['MERAUKE', 'NAUKENJERAI–SOTA', 'PULAU KIMAAM'], s1_tgl='17 NOVEMBER 2026', s1_kaki='PAPARAN KARHUTLA PAPUA SELATAN', s1_kredit='Foto: Dok. BNPB',
        s1_foto=PS / 'foto/tinjau-31okt.jpg',
        label='BNPB / PAPARAN KARHUTLA', seg='SEGMEN 1 · PAPUA SELATAN',
        s2_no='1.1 /', s2_j=['PUNCAK SUDAH LEWAT,', 'SISA API NAIK LAGI.'],
        s2_sub=f'Belum padam turun ke {f0(belum[imn])} ha pada {tg(HARI[imn])} Nov, lalu naik lagi ke {f0(belum[-1])} ha pada {tg(HARI[-1])} Nov.',
        s2_pil='MERAUKE · 31 OKT 2026', s2_fk='PENANGANAN', s2_fj='OMC 22 OKT–9 NOV', s2_ft='Laporan Satgas tidak mencatat armada 13–16 Nov.',
        s2_kredit='Foto: Dok. BNPB · OMC Merauke', s2_foto=PS / 'foto/omc-31okt.jpg',
        k1=dict(kick=f'PUNCAK · {tg(HARI[ipk])} NOV', angka=f0(belum[ipk]), sat='HA', sub=f'belum padam · {f0(hot[ipk])} titik panas · Papua Selatan',
                a2=f0(sum(hot)), t2=f'titik panas · {tg(HARI[0])}–{tg(HARI[-1])} Nov', hantu=f'{tg(HARI[ipk])}'),
        k2=dict(kick=f'TERKINI · {tg(HARI[-1])} NOV', angka=f0(belum[-1]), sat='HA', sub=f'belum padam · {f0(hot[-1])} titik panas · per {tg(HARI[-1])} Nov',
                a2=f0(nk), t2=f'cluster aktif · per {tg(HARI[-1])} Nov', hantu=f'{tg(HARI[-1])}'),
        pola='POLA DARI DATA SISTEM',
        baris=[('api', 'API BESAR', [f'{lv["2"]} cluster perlu pemadaman, semuanya di Kab. Merauke.']), ('mata', 'API SEDANG', [f'{lv["1"]} cluster perlu dicek tim patroli.']),
               ('denyut', 'BELUM PADAM', ['Naik tiga hari berturut-turut:', f'{f0(belum[-3])} ha, {f0(belum[-2])} ha, lalu {f0(belum[-1])} ha.'])],
        persen=f'{persen}%', persen_n=persen, persen_lbl='dari puncak',
        s2_cat=f'Angka sistem per akhir hari; cut-off {tg(HARI[-1])} Nov 2026 pukul 24.00 WIB.',
        s2_sumber=['Centurisk97, harian30, 17 Nov 2026', f'Centurisk97, kluster_hari {tg(HARI[0])}–{tg(HARI[-1])} Nov 2026', 'Laporan Satgas Karhutla, 9–16 Nov 2026', 'Dok. BNPB, OMC Merauke 31 Okt 2026'],
        s3_no='1.2 /', s3_j=['SISA API DI DUA KAWASAN,', 'PERBATASAN DAN PULAU KIMAAM.'],
        s3_sub=f'{f0(nauk + sota + kont + kim)} dari {f0(belum[-1])} ha belum padam berada di empat kecamatan.',
        s3_kredit='Foto: Dok. BNPB · rakor karhutla Merauke', s3_foto=PS / 'foto/rakor-30okt.jpg', s3_fk=f'BELUM PADAM · {tg(HARI[-1])} NOV',
        s3_angka=f0(nauk + sota + kont + kim), s3_sat='HA', s3_ft=f'Dari {f0(belum[-1])} ha di Papua Selatan.',
        s3_pil=[['NAUKENJERAI', 'SOTA', 'KONTUAR'], ['KIMAAM']],
        s3_baris=[('1', 'pin', 'oranye', 'NAUKENJERAI–SOTA', [f'Koridor perbatasan PNG: {f0(nauk + sota)} ha belum padam (Naukenjerai {f0(nauk)} ha, Sota {f0(sota)} ha).'], None),
                  ('2', 'pohon', 'oranye', 'PULAU KIMAAM', [f'Kontuar {f0(kont)} ha dan Kimaam {f0(kim)} ha, total {f0(kont + kim)} ha belum padam.', 'Keduanya memiliki cluster api besar.'], None),
                  ('3', 'tetes', 'gelap', 'CUACA', ['Siaga hujan lebat 13–15 Nov,', 'hujan sedang 16–17 Nov.'], 'BMKG'),
                  ('4', 'luas', 'gelap', 'KAB. MERAUKE', [f'Seluruh {f0(belum[-1])} ha belum padam Papua Selatan ada di Kab. Merauke.'], None)],
        tl_atas='hujan lebat · hujan sedang', tl=['13 Nov', '15 Nov', '17 Nov'],
        s3_cat=f'Belum padam per kecamatan pada akhir hari {tg(HARI[-1])} Nov 2026; cuaca menurut peringatan dini harian BMKG.',
        s3_sumber=[f'Centurisk97, peta_karhutla_wil {tg(HARI[-1])} Nov 2026', 'BMKG, peringatan dini harian 10–17 Nov 2026', 'Dok. BNPB, rakor karhutla Merauke'],
    )
IKON_KAL = {'gelombang': 'luas', 'perisai': 'perisai', 'denyut': 'denyut'}

# ---------- gaya dari rujukan ----------
G = {}
G['label'] = gaya(3, 'label', 'BNPB / KOMPAS SIANG', 'ArialB')
G['nomor'] = gaya(3, 'nomor', '1.1 /', 'Anton')
G['seg'] = gaya(3, 'segmen', 'SEGMEN 1 · BANJIR ACEH', 'ArialB')
G['bnpb'] = gaya(3, 'bnpb', 'BNPB', 'ArialB')
G['tag1'] = gaya(3, 'tagline', 'BADAN NASIONAL', 'ArialB', 0, k_nol=True)
G['j1'] = gaya(3, 'judul1', 'HUJAN TINGGI BERTEMU', 'Anton'); G['j2'] = gaya(3, 'judul2', 'SUNGAI YANG RENTAN.', 'Anton')
G['sub'] = gaya(3, 'sub', 'Dua kali berturut-turut: ketahanan sungai harus diperkuat.', 'Arial')
G['pil_t'] = gaya(3, 'pil_teks', 'PIDIE JAYA · NOV 2026', 'ArialB', warna='2E0A00')
G['fk'] = gaya(3, 'kick_foto', 'PEMICU LANGSUNG', 'ArialB', warna='FF6A13')
G['fj'] = gaya(3, 'judul_foto', 'HUJAN INTENSITAS TINGGI', 'Anton')
G['ft'] = gaya(3, 'teks_foto', 'bertemu sungai, tebing, dan tanggul yang rentan.', 'Arial')
G['kredit'] = gaya(3, 'kredit', 'Foto: Metro TV · banjir Pidie Jaya', 'Arial')
G['k1_kick'] = gaya(3, 'kick_k1', 'BANJIR 2025', 'ArialB', warna='FF6A13')
G['k1_a'] = gaya(3, 'angka_k1', '596', 'Anton'); G['k1_s'] = gaya(3, 'satuan_k1', 'JIWA', 'Anton')
G['k1_sub'] = gaya(3, 'sub_k1', 'meninggal & hilang · banjir-longsor · 15 kab/kota', 'Arial')
G['k1_a2'] = gaya(3, 'angka2_k1', '947.266', 'Anton', warna='FF6A13'); G['k1_t2'] = gaya(3, 'teks2_k1', 'jiwa mengungsi · seluruh Aceh', 'Arial')
G['k2_kick'] = gaya(3, 'kick_k2', 'BANJIR 2026', 'ArialB', warna='2E0A00')
G['k2_a'] = gaya(3, 'angka_k2', '17.307', 'Anton', warna='0B0A08'); G['k2_s'] = gaya(3, 'satuan_k2', 'KK', 'Anton', warna='0B0A08')
G['k2_sub'] = gaya(3, 'sub_k2', 'terdampak · 9 kab/kota · per 15 Nov', 'Arial', warna='3F0E02')
G['k2_a2'] = gaya(3, 'angka2_k2', '8', 'Anton', warna='0B0A08'); G['k2_t2'] = gaya(3, 'teks2_k2', 'kab/kota belum surut · per 15 Nov', 'Arial', warna='3F0E02')
G['pola'] = gaya(3, 'pola', 'POLA DARI LAPORAN LAPANGAN', 'ArialB')
G['nama'] = gaya(3, 'nama1', 'PIDIE JAYA', 'Anton', warna='FF6A13'); G['desk'] = gaya(3, 'desk1', 'Tebing sungai di Dayah Usen jebol dan meluas.', 'Arial')
G['desk3'] = gaya(3, 'desk3', 'Debit sungai di Sultan Daulat diperkirakan', 'Arial', 0, warna='1C1B18')
G['nama3'] = gaya(3, 'nama3', 'SUBULUSSALAM', 'Anton', warna='0A0A09')
G['persen'] = gaya(3, 'persen3', '±80%', 'Anton', warna='FF6A13')
G['bilah_lbl'] = gaya(3, 'bilah_lbl', 'batas meluap', 'Arial', warna='6B6A66')
G['cat'] = gaya(3, 'catatan', 'Angka 2025 dan 2026 berbeda cakupan dan tanggal; tidak dijumlahkan.', 'Arial')
G['sumber'] = gaya(3, 'sumber1', 'DIBI BNPB, Nov 2026', 'Arial')
# sampul
G['c_label'] = gaya(1, 'label', 'BNPB / KOMPAS SIANG', 'ArialB')
G['c_j'] = [gaya(1, 'judul1', 'HADIR.', 'Anton'), gaya(1, 'judul2', 'SIAGA.', 'Anton'), gaya(1, 'judul3', 'MELINDUNGI.', 'Anton')]
G['c_sub'] = gaya(1, 'sub', 'Negara hadir. Warga merasa aman.', 'Arial', warna='FFFFFF')
G['c_pil'] = gaya(1, 'pil1', 'BERSIH', 'ArialB', warna='FFFFFF')
G['c_tgl'] = gaya(1, 'tanggal', '17 NOVEMBER 2026', 'Anton', warna='FF6A13')
G['c_kaki'] = gaya(1, 'label_kaki', 'WAWANCARA KEPALA BNPB', 'ArialB')
G['c_kredit'] = gaya(1, 'kredit', 'Foto: Dok. BNPB', 'Arial', warna='DDDDDD')
# hal. 5
G['e_sub'] = gaya(5, 'sub', 'Data kebutuhan menentukan arah bantuan.', 'Arial')
G['e_kredit'] = dict(G['kredit'], dasar=G['kredit']['dasar'] - (UK[3]['kredit'][3] - UK[5]['kredit'][3]))
G['e_fk'] = gaya(5, 'kick_foto', 'PENGUNGSI DI ACEH · 15 NOV', 'ArialB', warna='FF6A13')
G['e_a'] = gaya(5, 'angka_foto', '5.626', 'Anton'); G['e_s'] = gaya(5, 'satuan_foto', 'JIWA', 'Anton', warna='FF6A13')
G['e_ft'] = gaya(5, 'teks_foto', 'Terbanyak di Aceh Tamiang.', 'Arial')
G['e_pil'] = gaya(5, 'pil_foto_teks', 'MAKANAN', 'ArialB', warna='FFFFFF')
G['e_no'] = gaya(5, 'no1', '1', 'Anton', warna='FF6A13')
G['e_nama'] = gaya(5, 'nama1', 'POSKO', 'Anton', warna='FFFFFF')
G['e_desk'] = gaya(5, 'desk1', 'Data kebutuhan dan pengungsi; diperbarui setiap hari.', 'Arial')
G['e_desk2'] = gaya(5, 'desk2', 'Logistik BPBD ke Sultan Daulat & Rundeng. Gayo Lues: 4 jembatan putus, jembatan darurat disiapkan.', 'Arial', 0)
G['e_tag'] = gaya(5, 'tag_teks', 'DIRENCANAKAN', 'ArialB', warna='FFFFFF')
G['e_tl'] = gaya(5, 'tl_lbl1', 'Lanud Soewondo', 'ArialB', warna='FFFFFF')
G['e_tla'] = gaya(5, 'tl_atas', '±498 km · ±149 menit', 'Anton', warna='FF6A13')
G['e_cat'] = gaya(5, 'catatan', 'Jalur udara masih rencana; pelaksanaan ditentukan pilot dan komando sesuai cuaca dan keselamatan.', 'Arial')
def _js(G):
    return {k: ([{kk: (float(vv) if isinstance(vv, (int, float, np.integer, np.floating)) else vv) for kk, vv in g.items()} for g in v] if isinstance(v, list) else
              {kk: (float(vv) if isinstance(vv, (int, float, np.integer, np.floating)) else vv) for kk, vv in v.items()}) for k, v in G.items()}
json.dump(_js(G), open(KERJA / 'gaya_mentah.json', 'w'), indent=1)
KOR = json.load(open(SINI / 'koreksi.json')) if (SINI / 'koreksi.json').exists() else {}
def terap(kunci, g):
    c = KOR.get(kunci)
    if not c: return g
    g = dict(g); g['px'] *= c['skala']; g['k'] += c['dk']; g['dasar'] += c['dy']
    if c.get('jangkar', 1): g['x'] += c['dx']
    else: g['dxr'] = c['dx']
    return g
for _k in list(G):
    if isinstance(G[_k], list): G[_k] = [terap(f'{_k}{i}', g) for i, g in enumerate(G[_k])]
    else: G[_k] = terap(_k, G[_k])
json.dump({k: ([{kk: (float(vv) if isinstance(vv, (int, float, np.integer, np.floating)) else vv) for kk, vv in g.items()} for g in v] if isinstance(v, list) else
              {kk: (float(vv) if isinstance(vv, (int, float, np.integer, np.floating)) else vv) for kk, vv in v.items()}) for k, v in G.items()},
          open(KERJA / 'gaya.json', 'w'), indent=1)

ORANYE, GADING = 'FF6A13', 'F1F0EB'

def logo(s):
    k = Image.open(KERJA / 'kris.png'); w = 1534 - 1322; h = w * k.height / k.width
    gambar(s, KERJA / 'kris.png', 1322, 67, w, h)
    kotak(s, 1563, 66, 1565, 118, '545557')
    gambar(s, KERJA / 'lambang.png', 1594, 60, 64, 64)
    tulis(s, 'BNPB', G['bnpb'])
    gambar(s, KERJA / 'tagline.png', 1660, 96, 170, 26)

def kepala(s, label, nomor, seg):
    xk = tulis(s, label, G['label'])
    x = xk + (397 - 373); kotak(s, x, 67, x + 38, 69, ORANYE)
    xn = tulis(s, nomor, G['nomor'], x=x + 38 + (455 - 435))
    tulis(s, seg, G['seg'], x=xn + (511 - 491))
    logo(s)

def judul(s, b1, b2, sub, gsub):
    tulis(s, b1, G['j1']); tulis(s, b2, G['j2'], warna=ORANYE); tulis(s, sub, gsub)

def kaki(s, cat, sumber):
    kotak(s, 108, 966, 1812, 969, 'CD5B31')
    tulis(s, cat, G['cat'] if s is not None else None)
    x = G['sumber']['x']
    for t in sumber:
        x = tulis(s, t, G['sumber'], x=x) + (283 - 254)

def pil(s, x, y0, y1, t, g, isi, bingkai, pad, dasar):
    b = bb(g['f'], t, g['px']); w = (b[2] - b[0]) + g['k'] * g['px'] * (len(t) - 1)
    x1 = round(x + pad + w + max(0, g['k']) * g['px'] + pad)
    if bingkai: berbingkai(s, x, y0, x1, y1, isi, bingkai)
    else: kotak(s, x, y0, x1, y1, isi)
    tulis(s, t, g, x=x + pad, dasar=dasar)
    return x1

def tombol_di(s, x0, y0, uk, ikon, jenis, terang=False):
    p = KERJA / f'tombol-{ikon}-{jenis}-{uk}{"-t" if terang else ""}.png'
    m = tombol(ikon, uk, jenis, p, terang); gambar(s, p, x0 - m, y0 - m, uk + 2 * m, uk + 2 * m)

# =================== slide 1: sampul ===================
s = prs.slides.add_slide(KOSONG)
if C.s1_foto: latar_sampul(C.s1_foto, KERJA / 'sampul.jpg', 0.42)
else: Image.new('RGB', (1920, 1080), (10, 10, 10)).save(KERJA / 'sampul.jpg')
gambar(s, KERJA / 'sampul.jpg', 0, 0, 1920, 1080)
kotak(s, 1906, 0, 1920, 1080, ORANYE)
kotak(s, 108, 88, 168, 92, ORANYE)
tulis(s, C.s1_label, G['c_label'])
logo(s)
for t, g, w in zip(C.s1_judul, G['c_j'], ('FFFFFF', 'FFFFFF', ORANYE)): tulis(s, t, g, warna=w)
tulis(s, C.s1_sub, G['c_sub'])
x = 108
for t in C.s1_pil:
    x = pil(s, x, 890, 934, t, G['c_pil'], '1C1C1C', '555555', 126 - 108, G['c_pil']['dasar']) + 10
kotak(s, 108, 966, 1812, 969, 'CD5B31')
xt = tulis(s, C.s1_tgl, G['c_tgl'])
tulis(s, C.s1_kaki, G['c_kaki'], x=xt + (396 - 373))
tulis(s, C.s1_kredit, G['c_kredit'], x=1798, rata='kanan')

# =================== slide 2: data (hal. 3) ===================
s = prs.slides.add_slide(KOSONG)
if C.s2_foto: latar_isi(PS / 'foto/rakor-30okt.jpg', KERJA / 'latar2.jpg')
else: Image.new('RGB', (1920, 1080), (11, 11, 11)).save(KERJA / 'latar2.jpg')
gambar(s, KERJA / 'latar2.jpg', 0, 0, 1920, 1080)
kepala(s, C.label, C.s2_no, C.seg)
judul(s, C.s2_j[0], C.s2_j[1], C.s2_sub, G['sub'])
# kartu foto 108..727 x 392..939
if C.s2_foto: kartu_foto(C.s2_foto, 620, 548, KERJA / 'foto2.jpg', 0.45, 0.5, (0.40, 1.0, 0.93))
else: Image.new('RGB', (620, 548), (40, 40, 40)).save(KERJA / 'foto2.jpg')
gambar(s, KERJA / 'foto2.jpg', 108, 392, 620, 548)
pil(s, 134, 416, 451, C.s2_pil, G['pil_t'], ORANYE, None, 151 - 134, G['pil_t']['dasar'])
tulis(s, C.s2_fk, G['fk']); tulis(s, C.s2_fj, G['fj']); tulis(s, C.s2_ft, G['ft'])
tulis(s, C.s2_kredit, G['kredit'], x=715, rata='kanan')
# kartu angka
berbingkai(s, 760, 392, 1279, 642, '161616', '414141')
kotak(s, 1295, 392, 1812, 642, ORANYE)
for kk, x0, x1, pre, gar, hw in ((C.k1, 760, 1279, 'k1', '373737', '232323'), (C.k2, 1295, 1812, 'k2', 'D04E00', 'E56011')):
    ref_h = UK[3]['hantu_' + pre]
    tref = '2025' if pre == 'k1' else '2026'; b100 = bb('Anton', tref, 100)
    gpx = (ref_h[2] - ref_h[0]) / (b100[2] - b100[0]) * 100; gdasar = ref_h[3] - bb('Anton', tref, gpx)[3]
    p = KERJA / f'hantu-{pre}.png'
    atas, w_, h_ = hantu_aset(kk['hantu'], gpx, hw, p, 393, gdasar)
    gambar(s, p, ref_h[2] - w_, atas, w_, h_)
    dx = x0 - 760
    tulis(s, kk['kick'], G[pre + '_kick'])
    xa = tulis(s, kk['angka'], G[pre + '_a'])
    tulis(s, kk['sat'], G[pre + '_s'], x=xa + (UK[3]['satuan_' + pre][0] - UK[3]['angka_' + pre][2]))
    tulis(s, kk['sub'], G[pre + '_sub'])
    kotak(s, x0 + 29, 558 if pre == 'k1' else 557, x1 - 29, 560 if pre == 'k1' else 559, gar)
    xa2 = tulis(s, kk['a2'], G[pre + '_a2'])
    tulis(s, kk['t2'], G[pre + '_t2'], x=xa2 + (UK[3]['teks2_' + pre][0] - UK[3]['angka2_' + pre][2]))
tulis(s, C.pola, G['pola'])
for n, (ikn, nama, desk) in enumerate(C.baris):
    y0 = (700, 784, 868)[n]; dy = y0 - 700
    terang = n == 2
    if terang: kotak(s, 760, 868, 1812, 940, GADING)
    else: berbingkai(s, 760, y0, 1812, y0 + 74, '141414', '353535')
    tombol_di(s, 785, y0 + 12 if not terang else 880, 49, IKON_KAL.get(ikn, ikn), 'oranye' if terang else 'gelap', terang)
    if terang:
        tulis(s, nama, G['nama3'])
        g = G['desk3']; tulis(s, desk[0], g); tulis(s, desk[1], g, dasar=g['dasar'] + g['pitch'])
        xp = tulis(s, C.persen, G['persen'])
        tulis(s, C.persen_lbl, G['bilah_lbl'], x=1788, rata='kanan')
        bil = np.zeros((12 * 4, 200 * 4, 3), 'uint8'); bil[:] = (0xD3, 0xD1, 0xD0)
        isi = int(200 * 4 * C.persen_n / 100); ref_isi = 158 * 4
        for xx in range(isi):
            t = min(1, xx / ref_isi); bil[:, xx] = (int(0xFC + (0xFF - 0xFC) * t), int(0xC3 + (0x6B - 0xC3) * t), int(0x7E + (0x15 - 0x7E) * t))
        Image.fromarray(bil).resize((200, 12), Image.LANCZOS).save(KERJA / 'bilah.png')
        gambar(s, KERJA / 'bilah.png', 1588, 917, 200, 12)
    else:
        tulis(s, nama, G['nama'], dasar=G['nama']['dasar'] + dy)
        tulis(s, desk[0], G['desk'], dasar=G['desk']['dasar'] + dy)
kaki(s, C.s2_cat, C.s2_sumber)

# =================== slide 3: daftar (hal. 5) ===================
s = prs.slides.add_slide(KOSONG)
if C.s3_foto: latar_isi(PS / 'foto/tinjau-31okt.jpg', KERJA / 'latar3.jpg', 0.6)
else: Image.new('RGB', (1920, 1080), (11, 11, 11)).save(KERJA / 'latar3.jpg')
gambar(s, KERJA / 'latar3.jpg', 0, 0, 1920, 1080)
kepala(s, C.label, C.s3_no, C.seg)
g1 = dict(G['j1']); g2 = dict(G['j2'])
tulis(s, C.s3_j[0], g1); tulis(s, C.s3_j[1], g2, warna=ORANYE); tulis(s, C.s3_sub, G['e_sub'])
if C.s3_foto: kartu_foto(C.s3_foto, 540, 548, KERJA / 'foto3.jpg', 0.55, 0.5, (0.22, 0.95, 0.9), 0.75, atas=(0.15, 0.5))
else: Image.new('RGB', (540, 548), (40, 40, 40)).save(KERJA / 'foto3.jpg')
gambar(s, KERJA / 'foto3.jpg', 108, 392, 540, 548)
tulis(s, C.s3_kredit, G['e_kredit'], x=635, rata='kanan')
tulis(s, C.s3_fk, G['e_fk'])
xa = tulis(s, C.s3_angka, G['e_a'])
tulis(s, C.s3_sat, G['e_s'], x=xa + (UK[5]['satuan_foto'][0] - UK[5]['angka_foto'][2]))
tulis(s, C.s3_ft, G['e_ft'])
for r, baris_pil in enumerate(C.s3_pil):
    x = 140; y0 = (838, 875)[r]
    for t in baris_pil:
        x = pil(s, x, y0, y0 + 29, t, G['e_pil'], '161616', '5F5F5F', 152 - 140, G['e_pil']['dasar'] + (y0 - 838)) + 8
RB = [(392, 510), (522, 680), (692, 811), (824, 940)]
for n, ((no, ikn, jenis, nama, desk, tag), (y0, y1)) in enumerate(zip(C.s3_baris, RB)):
    cy = (y0 + y1) / 2
    if n == 3: kotak(s, 688, y0, 1812, y1, ORANYE)
    elif n == 2:
        b = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, E(689), E(y0 + 1), E(1811 - 689), E(y1 - y0 - 2))
        b.fill.background(); b.line.color.rgb = RGBColor.from_string('808080'); b.line.width = Emu(int(1.5 * 6350)); b.line.dash_style = 4; b.shadow.inherit = False
    else: berbingkai(s, 688, y0, 1812, y1, '151515', '373737')
    gno = G['e_no']; dyno = cy - 451
    tulis(s, no, gno, dasar=gno['dasar'] + dyno, warna='0D0908' if n == 3 else ORANYE)
    tombol_di(s, 771, cy - 30, 60, ikn, jenis)
    # blok nama + deskripsi dipusatkan vertikal seperti rujukan
    gn, gd = G['e_nama'], G['e_desk']
    dn = gn['dasar'] + (cy - 451) - 13 * (len(desk) - 1)
    xn = tulis(s, nama, gn, dasar=dn, warna='130801' if n == 3 else 'FFFFFF')
    if tag:
        dy = cy - 751.5
        pil(s, round(xn + (1038 - UK[5]['nama3'][2])), round(712 + dy), round(736 + dy), tag, G['e_tag'], '2A2A2A', None, 1047 - 1038, G['e_tag']['dasar'] + dy)
    for j, d in enumerate(desk):
        tulis(s, d, gd, dasar=dn + (gd['dasar'] - gn['dasar']) + 26 * j, warna='3A0A00' if n == 3 else None)
    if n == 2:
        # lini rute: titik kiri berongga, tengah penuh, kanan berongga, garis putus lengkung
        pts = [(1236, 764), (1486, 748), (1736, 754)]
        import math
        ff = s.shapes.build_freeform(E(pts[0][0]), E(pts[0][1]))
        kp = [(1236, 764), (1236, 764), (1380, 734), (1486, 748), (1610, 768), (1736, 754), (1736, 754)]
        jalur = []
        for j in range(1, len(kp) - 2):
            p0, p1, p2, p3 = kp[j - 1], kp[j], kp[j + 1], kp[j + 2]
            for t in [i / 20 for i in range(1, 21)]:
                x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t * t + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t ** 3)
                y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t * t + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t ** 3)
                jalur.append((E(x), E(y)))
        jalur = [(E(1236), E(764))] + jalur
        ff.add_line_segments(jalur[1:], close=False); sh = ff.convert_to_shape()
        sh.fill.background(); sh.line.color.rgb = RGBColor.from_string(ORANYE); sh.line.width = Emu(int(2.5 * 6350)); sh.line.dash_style = 4; sh.shadow.inherit = False
        for (px_, py_), penuh in zip(pts, (False, True, False)):
            rr = 11 if penuh else 9
            o = s.shapes.add_shape(MSO_SHAPE.OVAL, E(px_ - rr), E(py_ - rr), E(2 * rr), E(2 * rr))
            o.fill.solid(); o.fill.fore_color.rgb = RGBColor.from_string(ORANYE if penuh else '121212')
            if penuh: o.line.fill.background()
            else: o.line.color.rgb = RGBColor.from_string(ORANYE); o.line.width = Emu(int(3 * 6350))
            o.shadow.inherit = False
        for (px_, _), t, xc in zip(pts, C.tl, ((1207 + 1330) / 2, (1437 + 1537) / 2, (1686 + 1728) / 2)):
            tulis(s, t, G['e_tl'], x=xc if MODE == 'kal' else px_, rata='tengah')
        tulis(s, C.tl_atas, G['e_tla'], x=(1357 + 1542) / 2, rata='tengah')
kaki(s, C.s3_cat, C.s3_sumber)

prs.save(KELUAR); print('ok', KELUAR)
