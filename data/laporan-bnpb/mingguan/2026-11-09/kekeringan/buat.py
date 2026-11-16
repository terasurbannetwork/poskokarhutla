"""Paparan "Laporan Situasi Kekeringan" sepekan 2 s.d. 8 Nov 2026 (dipaparkan 9 Nov 2026, dibuat 12 Nov 2026).

Desain dan alat gambar = deck "Paparan Situasi Banjir dan Longsor Sepekan 091126" (banjir-longsor-sepekan-2026-11-09/buat.py,
dimuat sebagai modul, tidak disalin). Data:
  - Laporan Dit. Koordalops BNPB (teks WA laporan pagi 4 s.d. 9 Nov = laphar 3 s.d. 8 Nov; laphar 2 Nov dan 6 Nov tanpa kekeringan).
    Tanggal di deck = tanggal laphar. Laphar 31 Okt dan 1 Nov (berkas 1 dan 2 Nov) hanya dipakai untuk membandingkan status.
  - Hujan harian: Open-Meteo (model gabungan; metode HTH sama dengan scripts/kekeringan/hth.py), diambil 12 Nov 2026 lewat hujan.py
    ke bahan/hujan.json. Bukan pos BMKG; semua turunan hujan berlabel hipotesis (ambang kekeringan repo gagal uji balik, FAR 97%).
  - BMKG: teks WA laporan meteorologi 9 Nov 2026 (prakiraan 9 s.d. 12 Nov).
  - Standar minimum air: Sphere Handbook 2018, Water Supply Standard 2.1 (15 liter per orang per hari; sama dengan posko_kekeringan.json).

    python hujan.py         # sekali: ambil hujan model ke bahan/hujan.json
    python buat.py          # isi.pptx -> deck.py (sampul, daftar isi, tab bagian, penutup) -> PPTX + PDF
    python buat.py --isi    # hanya slide isi
"""
import importlib.util, json, os, statistics, sys
from datetime import date

from pptx.enum.shapes import MSO_SHAPE
from PIL import Image, ImageDraw

SINI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(SINI, '..', '..', '..', '..', '..'))
LB = os.path.join(REPO, 'data', 'laporan-bnpb')
NAMA = 'Paparan Situasi Kekeringan Sepekan 091126'

_s = importlib.util.spec_from_file_location('bl', os.path.join(LB, 'mingguan/2026-11-09/banjir-longsor', 'buat.py'))
BL = importlib.util.module_from_spec(_s); _s.loader.exec_module(BL)
BL.B.SINI = SINI   # ikon ditulis ke folder deck ini
os.makedirs(os.path.join(SINI, 'bahan', 'ikon'), exist_ok=True)
R, ikon, f0 = BL.R, BL.ikon, BL.f0
TEKS, NAVY, ORANYE, MERAH, PUTIH = BL.TEKS, BL.NAVY, BL.ORANYE, BL.MERAH, BL.PUTIH
BIRU, BIRU_TUA, PITA_BIRU, PITA_MERAH, KAB_TINT = BL.BIRU, BL.BIRU_TUA, BL.PITA_BIRU, BL.PITA_MERAH, BL.KAB_TINT
TEKS3, GARIS, GARIS_PANAH = BL.TEKS3, BL.GARIS, BL.GARIS_PANAH
KERING, PITA_KERING, KERING_PETA, EMAS = 'B08A3E', 'F4ECDC', 'DCC79C', '8A6A2E'   # kategori kering tema proyek-bnpb
TEKS2, PEMBANDING = '2E3440', 'DCE1E7'

SB_KOORD = 'Laporan Dit. Koordalops BNPB, laporan harian 3 s.d. 8 Nov 2026'
D = None


def des(v, n=1):
    return f'{v:.{n}f}'.replace('.', ',')


# ======================================================================== data laphar (teks WA Koordalops)
# kab: (prov, kab, kk, jiwa, status_teks, akhir, golongan, kabar, distribusi_terakhir)
# golongan: 'putus' = status berakhir atau tanggal akhir perlu dicek sebelum Desember; 'des' = berlaku s.d. 31 Des; 'tanpa' = belum dilaporkan
KAB = [
    ('Jawa Barat', 'Subang', 10378, 27479, 'Belum dilaporkan', None, 'tanpa', '7 Nov', 'Total 378.000 liter; 150 ha sawah terdampak'),
    ('Jawa Tengah', 'Pemalang', 14847, D, 'Siaga Darurat 1 Jun s.d. 30 Nov 2026', '30 Nov', 'putus', '5 Nov',
     '83.000 liter (BPBD 71.000, PDAM 12.000)'),
    ('Jawa Tengah', 'Pekalongan', 12934, 41768, 'Siaga Darurat 1 Jul s.d. "31 Nov" 2026', '31/11?', 'putus', '8 Nov', 'Total 3.539.000 liter'),
    ('Jawa Tengah', 'Kendal', 2706, 8452, 'Siaga Darurat Provinsi 1 Jun s.d. 31 Des 2026', '31 Des', 'des', '8 Nov', 'Total 2.701.580 liter'),
    ('Jawa Tengah', 'Temanggung', 1759, 6094, 'Siaga Darurat Provinsi 1 Jun s.d. 31 Des 2026', '31 Des', 'des', '4 Nov', '35.000 liter (6 tangki)'),
    ('Jawa Tengah', 'Grobogan', 3491, D, 'Siaga Darurat Provinsi 1 Jun s.d. 31 Des 2026', '31 Des', 'des', '4 Nov', '58.000 liter (BPBD dan CSR)'),
    ('Jawa Tengah', 'Boyolali', 12022, 57311, 'Perpanjangan Siaga Darurat 1 Jun s.d. 31 Des 2026', '31 Des', 'des', '5 Nov',
     '56.000 liter (10 tangki)'),
    ('Jawa Tengah', 'Klaten', 5775, 19588, 'Siaga Darurat Provinsi 1 Jun s.d. 31 Des 2026', '31 Des', 'des', '4 Nov',
     '35.000 liter (7 tangki) untuk 1.314 jiwa'),
    ('Jawa Timur', 'Blitar', 19836, 56165, 'Perpanjangan Siaga Darurat 7 Okt s.d. 1 Des 2026', '1 Des', 'putus', '5 Nov',
     '40.000 liter (8 rit)'),
    ('Sulawesi Selatan', 'Bone', 1060, 5083, 'Belum dilaporkan', None, 'tanpa', '4 Nov', '57.400 liter'),
    ('Sulawesi Selatan', 'Takalar', 56, D, 'Belum dilaporkan', None, 'tanpa', '4 Nov', '10.000 liter'),
    ('Sulawesi Tengah', 'Banggai Kepulauan', 1868, 5574, 'Belum dilaporkan', None, 'tanpa', '7 Nov', 'Total 520.000 liter'),
]
KODE = {'Jawa Barat': '32', 'Jawa Tengah': '33', 'Jawa Timur': '35', 'Sulawesi Selatan': '73', 'Sulawesi Tengah': '72'}
GOL = {'putus': (MERAH, PITA_MERAH, MERAH, 'peringatan'), 'des': (BIRU, PITA_BIRU, BIRU_TUA, 'kalender'),
       'tanpa': (KERING, PITA_KERING, EMAS, 'kekeringan')}
PETA_WARNA = {'putus': MERAH, 'des': BIRU, 'tanpa': KERING_PETA}

# distribusi air per laporan: (kab, laphar, liter, jenis, penerima_teks, penerima_jiwa, hari, keterangan)
# jenis 'harian' = liter dalam satu laporan harian; 'kumulatif' = total sejak awal penanganan (periode dalam keterangan)
AIR = [
    ('Klaten', '3 Nov', 90000, 'harian', '2.757 jiwa (681 KK)', 2757, 1, '18 tangki'),
    ('Klaten', '4 Nov', 35000, 'harian', '1.314 jiwa (537 KK)', 1314, 1, '7 tangki'),
    ('Blitar', '3 Nov', 67900, 'harian', '11.075 jiwa (3.793 KK)', 11075, 1, '13 rit, disalurkan Senin 2 Nov'),
    ('Blitar', '5 Nov', 40000, 'harian', D, D, 1, '8 rit'),
    ('Pemalang', '4 Nov', 53000, 'harian', '949 KK', D, 1, 'Mobil tangki 5.000 dan 4.000 liter'),
    ('Pemalang', '5 Nov', 83000, 'harian', D, D, 1, 'BPBD 71.000 liter, PDAM 12.000 liter'),
    ('Temanggung', '4 Nov', 35000, 'harian', D, D, 1, '6 tangki'),
    ('Grobogan', '4 Nov', 58000, 'harian', D, D, 1, 'BPBD dan CSR'),
    ('Boyolali', '5 Nov', 56000, 'harian', D, D, 1, '10 tangki'),
    ('Bone', '4 Nov', 57400, 'harian', D, D, 1, 'BPBD Kab. Bone'),
    ('Takalar', '4 Nov', 10000, 'harian', D, D, 1, 'Volume yang disalurkan'),
    ('Blitar', '3 Nov', 3114300, 'kumulatif', D, D, 104, 'Periode 22 Jul s.d. 2 Nov 2026 (104 hari)'),
    ('Subang', '7 Nov', 378000, 'kumulatif', D, D, D, 'Total; tanggal mulai tidak disebut'),
    ('Banggai Kepulauan', '7 Nov', 520000, 'kumulatif', D, D, D, 'Total dropping; tanggal mulai tidak disebut'),
    ('Kendal', '8 Nov', 2701580, 'kumulatif', D, D, D, 'Total; tanggal mulai tidak disebut'),
    ('Pekalongan', '8 Nov', 3539000, 'kumulatif', D, D, D, 'Total; tanggal mulai tidak disebut'),
]
LITER_MIN = 15   # Sphere 2018, Water Supply Standard 2.1
KABD = {r[1]: r for r in KAB}


def per_jiwa(a):
    kb = KABD[a[0]]
    if not kb[3] or not a[6]:
        return None
    return a[2] / kb[3] / a[6]


def per_kk(a):
    kb = KABD[a[0]]
    return a[2] / kb[2] / a[6] if a[6] else None


# ======================================================================== hujan model (hipotesis)
HJ = json.load(open(os.path.join(SINI, 'bahan', 'hujan.json'), encoding='utf-8'))
TGL = HJ['tanggal']
PRAKIRAAN_MULAI = '2026-11-12'   # diambil 12 Nov: hari ini dan sesudahnya = prakiraan
DAS = [('Okt I', '10', 1, 10), ('Okt II', '10', 11, 20), ('Okt III', '10', 21, 31), ('Nov I', '11', 1, 10), ('Nov II', '11', 11, 20),
       ('Nov III', '11', 21, 27)]


def _hth(p, i):
    n = 0
    while i >= 0 and p[i] is not None and p[i] < 1:
        n += 1; i -= 1
    return n


def hujan(kp, kab):
    H = HJ['kab'][f'{kp}|{kab}']['hujan']
    rata = [statistics.mean([x[j] for x in H if x[j] is not None]) if any(x[j] is not None for x in H) else None for j in range(len(TGL))]
    i8 = TGL.index('2026-11-08')
    das = []
    for nama, bl, d0, d1 in DAS:
        hari = [j for j, t in enumerate(TGL) if t[5:7] == bl and d0 <= int(t[8:]) <= d1]
        s = sum(rata[j] for j in hari)
        das.append((nama, s, s * 10 / len(hari) if nama == 'Nov III' else s))   # Nov III baru 7 hari: disetarakan ke 10 hari
    # awal musim hujan kriteria BMKG: hujan dasarian minimal 50 mm tiga dasarian berturut-turut
    awal, pasti = None, False
    for i, (nama, s, s10) in enumerate(das):
        lanjut = [x[2] for x in das[i + 1:i + 3]]
        if s10 >= 50 and lanjut and all(v >= 50 for v in lanjut):
            awal, pasti = nama, len(lanjut) == 2
            break
    j2, j8 = TGL.index('2026-11-02'), i8
    return {'rata': rata, 'hth': max(_hth(p, i8) for p in H), 'mm': sum(rata[j2:j8 + 1]),
            'hari_hujan': sum(1 for v in rata[j2:j8 + 1] if v >= 1), 'das': das, 'awal': awal, 'pasti': pasti,
            'prak': sum(rata[TGL.index(PRAKIRAAN_MULAI):])}


HUJAN = {r[1]: hujan(KODE[r[0]], r[1]) for r in KAB}


def indikasi(kab):
    h = HUJAN[kab]
    if h['awal'] and h['pasti']:
        return 'masuk', f'Masuk {h["awal"]}'
    if h['awal']:
        return 'mulai', f'Mulai {h["awal"]}'
    return 'belum', 'Belum masuk'


# ======================================================================== alat gambar tambahan
def tabel_k(k, x, y, kol, baris, kepala=24, pt=8):
    """kol = [(judul 'BARIS 1|baris 2', lebar, rata)]; baris = ('grup', teks) | ('data', sel, h) | ('total', sel, h).
    sel: teks | ('runs', runs) | fungsi(k, x, y, w, h). Tinggi tiap baris diberikan pemanggil supaya posisi bisa dihitung."""
    W = sum(c[1] for c in kol)
    xs = [x]
    for c in kol:
        xs.append(xs[-1] + c[1])
    k.bulat(x, y, W, kepala, NAVY, radius=3)
    for (j, w, rata), cx in zip(kol, xs):
        bag = j.split('|')
        runs = [R(bag[0], 7.5, PUTIH, True, 0.6)]
        for b in bag[1:]:
            runs += ['\n', R(b, 6.5, PUTIH, False)]
        k.teks(cx, y, w, kepala, runs, rata=rata, kiri=8 if rata == 'l' else 1, kanan=1, bungkus=False, spasi=0.9)
    yy = y + kepala
    for b in baris:
        if b[0] == 'grup':
            k.kotak(x, yy, W, 14.4, PITA_BIRU)
            k.teks(x + 8, yy, W - 16, 14.4, [R(b[1], 8.5, TEKS, True)], bungkus=False)
            yy += 14.4
            continue
        h = b[2]
        if b[0] == 'total':
            k.bulat(x, yy, W, h, NAVY, radius=3)
        warna = PUTIH if b[0] == 'total' else TEKS
        for (j, w, rata), cx, s in zip(kol, xs, b[1]):
            if s in (None, ''):
                continue
            if callable(s):
                s(k, cx, yy, w, h)
            elif isinstance(s, tuple) and s[0] == 'runs':
                k.teks(cx, yy, w, h, s[1], rata=rata, kiri=8 if rata == 'l' else 2, kanan=3, spasi=0.92)
            else:
                k.teks(cx, yy, w, h, [R(str(s), pt, warna, True)], rata=rata, kiri=8 if rata == 'l' else 2, kanan=2)
        yy += h
        if b[0] == 'data':
            k.garis_datar(x, x + W, yy, GARIS, 0.5)
    return yy


def pil(teks, gol, pt=8):
    """Sel pil berwarna golongan: tint penuh, bulatan berikon di kiri, teks tebal di tengah."""
    def f(k, x, y, w, h):
        isi, pita, tulis, kon = GOL[gol]
        ph = min(16.6, h - 4); py = y + (h - ph) / 2
        k.bulat(x + 2, py, w - 4, ph, pita)
        d = ph - 3
        k.kotak(x + 3.5, py + 1.5, d, d, isi, bentuk=MSO_SHAPE.OVAL)
        g = d * 0.64
        k.gambar(ikon(kon), x + 3.5 + (d - g) / 2, py + 1.5 + (d - g) / 2, g, g)
        k.teks(x + d + 4, py, w - d - 8, ph, [R(teks, pt, TEKS, True)], rata='c', bungkus=False)
    return f


def label(k, x, y, nama, status, gol, titik, batas=461):
    """Label pil peta (pola label_peta deck acuan) dengan tiga golongan warna."""
    isi, pita, tulis, kon = GOL[gol]
    lebar = (len(nama) * 9 + len(status) * 7.5) * 0.53 + 26
    tx, ty = titik
    x = min(x, batas - lebar)
    if tx < x or tx > x + lebar:
        ax, ay = (x + lebar if tx > x + lebar else x), y + 7.9
    else:
        ax, ay = tx, (y + 15.8 if ty > y + 15.8 else y)
    if abs(ax - tx) + abs(ay - ty) > 4:
        k.garis(ax, ay, tx, ty, GARIS_PANAH, 0.75)
    k.bulat(x, y, lebar, 15.8, pita)
    k.kotak(x + 2.2, y + 2.2, 11.5, 11.5, isi, bentuk=MSO_SHAPE.OVAL)
    k.gambar(ikon(kon), x + 4, y + 4, 7.9, 7.9)
    k.teks(x + 17.3, y, lebar - 18, 15.8, [R(nama, 9, TEKS, True), R('  ' + status, 7.5, tulis, True)], bungkus=False)
    k.kotak(tx - 2.5, ty - 2.5, 5, 5, PUTIH, TEKS, bentuk=MSO_SHAPE.OVAL)


def kartu(k, x, y, w, nilai, teks, gol):
    isi, pita, tulis, kon = GOL[gol]
    k.bulat(x, y, w, 30, pita, radius=4)
    k.kotak(x + 5, y + 6, 18, 18, isi, bentuk=MSO_SHAPE.OVAL)
    k.gambar(ikon(kon), x + 8.2, y + 9.2, 11.5, 11.5)
    k.teks(x + 28, y + 3, w - 30, 14, [R(str(nilai), 12, NAVY, True)], bungkus=False)
    k.teks(x + 28, y + 17, w - 30, 10, [R(teks, 7, TEKS)], bungkus=False)


def skala(k, x, y, pt_100km):
    k.garis(x, y, x + pt_100km, y, NAVY, 1.0)
    k.teks(x - 10, y - 12, pt_100km + 20, 10.8, [R('100 km', 7.5, NAVY, True)], rata='c', bungkus=False)


def utara(k, x, y):
    k.kotak(x, y, 8.6, 12.2, NAVY, bentuk=MSO_SHAPE.ISOSCELES_TRIANGLE)
    k.teks(x - 7, y + 13, 23, 9.4, [R('U', 8, NAVY, True)], rata='c', bungkus=False)


# ======================================================================== slide 1: peta + tabel
# tiga panel berskala sama (66,3 pt per derajat): Jawa selebar kolom peta, Sulawesi Selatan dan Sulawesi Tengah berdampingan di bawahnya
# (poles 12 Nov: panel Sulawesi lama sebagian besar daratan kosong; kini dipangkas ke wilayah terdampak)
SKALA = 66.3
SUL = ['71', '72', '73', '74', '75', '76']
PANEL = [('Jawa', 43.2, 102, 418, 216, (106.7, -5.5), ['31', '32', '33', '34', '35', '36', '51']),
         ('Sulawesi Selatan', 43.2, 324, 195, 116, (118.55, -3.95), SUL),
         ('Sulawesi Tengah', 243.2, 324, 218, 116, (121.55, -0.45), SUL)]


def status_pendek(r, cek, tanpa):
    if r[6] == 'tanpa':
        return tanpa
    return cek if r[5] == '31/11?' else 's.d. ' + r[5]


def s_peta(Dk):
    kk = sum(r[2] for r in KAB); jiwa = sum(r[3] or 0 for r in KAB); n_jiwa = sum(1 for r in KAB if r[3])
    siaga = [r for r in KAB if r[6] != 'tanpa']
    n_prov = len({r[0] for r in KAB})
    s, k = Dk.slide(BL.judul(f'Kekeringan dilaporkan di [{len(KAB)}] kab/kota di {n_prov} provinsi dengan [{f0(kk)}] KK terdampak; '
                             f'[{len(siaga)}] kab/kota berstatus Siaga Darurat'))
    warna = {(KODE[r[0]], r[1]): PETA_WARNA[r[6]] for r in KAB}
    proj = {}
    for i, (nama, x0, y0, w, h, (lon0, lat0), provs) in enumerate(PANEL):
        ext = (lon0, lon0 + w / SKALA, lat0, lat0 - h / SKALA)
        png = os.path.join(SINI, 'bahan', f'peta-{i + 1}.png')
        px = (int(2000 * w / 418), int(2000 * h / 418))
        f = BL.gambar_peta(png, ext, px, warna, provs)
        k.gambar(png, x0, y0, w, h)
        k.teks(x0 + 2, y0 + (h - 13 if i != 1 else 2), 200, 11, [R(nama, 7.5, TEKS3, True)], bungkus=False)
        for r in KAB:
            lon, lat = BL.pusat(KODE[r[0]], r[1])
            if ext[0] <= lon <= ext[1] and ext[3] <= lat <= ext[2]:
                p = f(lon, lat)
                proj[r[1]] = (x0 + p[0] / px[0] * w, y0 + p[1] / px[1] * h)
    k.garis_datar(43.2, 461.2, 321, GARIS, 0.5)
    k.kotak(240.7, 324, 0.5, 116, GARIS)
    skala(k, 400, 134, 100 / 111 * SKALA)
    utara(k, 446, 104)
    POS = {'Subang': (46, 192), 'Pemalang': (105, 128), 'Pekalongan': (175, 106), 'Kendal': (250, 128), 'Grobogan': (353, 152),
           'Boyolali': (353, 196), 'Blitar': (367, 240), 'Temanggung': (60, 282), 'Klaten': (240, 282),
           'Bone': (140, 330), 'Takalar': (46, 384), 'Banggai Kepulauan': (300, 404)}
    for r in KAB:
        st = status_pendek(r, 'tanggal dicek', 'Tanpa status')
        label(k, *POS[r[1]], r[1], st, r[6], proj[r[1]], batas=238 if r[1] in ('Bone', 'Takalar') else 461)
    n_put = sum(1 for r in KAB if r[6] == 'putus'); n_des = sum(1 for r in KAB if r[6] == 'des'); n_tanpa = len(KAB) - n_put - n_des
    kartu(k, 43.2, 446.4, 137.3, n_put, 'Perlu keputusan sebelum Des', 'putus')
    kartu(k, 183.6, 446.4, 137.3, n_des, 'Siaga Darurat s.d. 31 Des 2026', 'des')
    kartu(k, 324.0, 446.4, 137.3, n_tanpa, 'Status belum dilaporkan', 'tanpa')
    # tabel
    kol = [('KAB/KOTA', 98, 'l'), ('KK', 40, 'c'), ('JIWA', 46, 'c'), ('STATUS DARURAT', 92, 'c'), ('DISTRIBUSI AIR TERAKHIR', 128.5, 'l'),
           ('KABAR', 41, 'c')]
    baris = []
    prov = list(dict.fromkeys(r[0] for r in KAB))
    tinggi = (500 - 101 - 18 - len(prov) * 14.4 - 21.6) / len(KAB)
    for p in prov:
        baris.append(('grup', p))
        for r in (r for r in KAB if r[0] == p):
            st = status_pendek(r, 'Tanggal dicek', 'Belum ada')
            baris.append(('data', [('runs', [R(r[1], 8.5, TEKS, True)]), f0(r[2]), f0(r[3]), pil(st, r[6], 7.5),
                                   ('runs', [R(r[8], 7.5, TEKS)]), r[7]], tinggi))
    baris.append(('total', [f'Total {len(KAB)} kab/kota', f0(kk), ('runs', [R(f0(jiwa), 8, PUTIH, True), '\n',
                                                                          R(f'{n_jiwa} kab/kota', 6.5, PUTIH)]), '', '', ''], 21.6))
    tabel_k(k, 471.3, 101, kol, baris, kepala=18)
    return kk, jiwa


# ======================================================================== slide 2: air bersih
def s_air(Dk):
    har = [a for a in AIR if a[3] == 'harian']
    cak = [(a, per_jiwa(a) / LITER_MIN * 100) for a in har if per_jiwa(a) is not None]
    lo, hi = min(c for _, c in cak), max(c for _, c in cak)
    rendah = list(dict.fromkeys(a[0] for a, c in cak if c < 10))
    s, k = Dk.slide(BL.judul(f'Air harian hanya memenuhi [{des(lo)}] s.d. [{des(hi)}] persen kebutuhan minimum; '
                             f'{" dan ".join(rendah)} di bawah [10] persen'))
    BL.kepala_panel(k, 43.2, 102, 873.6, 'Penyaluran air bersih per laporan', 'kekeringan',
                    f'Liter per jiwa per hari = liter disalurkan ÷ jiwa terdampak ÷ hari. Cakupan = liter per jiwa per hari ÷ {LITER_MIN} liter '
                    '(standar minimum Sphere 2018)')
    kol = [('KAB/KOTA', 92, 'l'), ('LAPHAR', 40, 'c'), ('LITER|disalurkan', 68, 'c'), ('PENERIMA|menurut laporan', 104, 'c'),
           ('TERDAMPAK', 76, 'c'), ('LITER PER JIWA|terdampak per hari', 82, 'c'), (f'CAKUPAN KEBUTUHAN MINIMUM|{LITER_MIN} liter per jiwa per hari', 170, 'l'),
           ('KETERANGAN', 241.6, 'l')]
    bawah, kepala = 500, 24
    n = len(AIR)
    h = (bawah - 140 - kepala - 2 * 14.4) / n

    def bar(c):
        def f(k, x, y, w, hh):
            bw = w - 46
            k.bulat(x + 6, y + hh / 2 - 4, bw, 8, PEMBANDING, radius=2)
            k.garis(x + 6 + bw * 0.1, y + hh / 2 - 6, x + 6 + bw * 0.1, y + hh / 2 + 6, TEKS3, 0.5)
            k.bulat(x + 6, y + hh / 2 - 4, max(2, bw * min(c, 100) / 100), 8, MERAH if c < 10 else BIRU, radius=2)
            k.teks(x + w - 40, y, 38, hh, [R(f'{des(c)}%', 8, MERAH if c < 10 else TEKS, True)], rata='r', bungkus=False)
        return f

    baris = [('grup', 'Penyaluran dalam satu laporan harian')]
    for jenis in ('harian', 'kumulatif'):
        if jenis == 'kumulatif':
            baris.append(('grup', 'Angka total sejak awal penanganan'))
        for a in (a for a in AIR if a[3] == jenis):
            kb = KABD[a[0]]
            terd = f'{f0(kb[3])} jiwa' if kb[3] else f'{f0(kb[2])} KK'
            pj = per_jiwa(a)
            if pj is not None:
                pj_s = ('runs', [R(des(pj), 8.5, MERAH if pj / LITER_MIN < 0.1 else TEKS, True)])
                cak_s = bar(pj / LITER_MIN * 100)
            elif a[6] and not kb[3]:
                pj_s = ('runs', [R(f'{des(per_kk(a))} per KK', 8, TEKS3, True)])
                cak_s = ('runs', [R('Jiwa terdampak tidak dilaporkan', 7.5, TEKS3)])
            else:
                pj_s = '–'
                cak_s = ('runs', [R('Periode penyaluran tidak disebut', 7.5, TEKS3)])
            ket = a[7]
            if a[5]:
                ket += f'; {des(a[2] / a[5])} liter per penerima'
            baris.append(('data', [('runs', [R(a[0], 8.5, TEKS, True)]), a[1], f0(a[2]), ('runs', [R(a[4] or '–', 7.5, TEKS)]),
                                   ('runs', [R(terd, 7.5, TEKS)]), pj_s, cak_s, ('runs', [R(ket, 7.5, TEKS)])], h))
    tabel_k(k, 43.2, 140, kol, baris, kepala=kepala)
    return lo, hi, rendah


# ======================================================================== slide 3: hujan kembali (hipotesis)
def garis_hujan(kab, path, W=1040, H=72, maks=40.0):
    """Batang hujan harian rerata kab/kota 1 Okt s.d. 27 Nov; skala sama (batas 40 mm), batang muda = prakiraan, pita 2-8 Nov."""
    h = HUJAN[kab]['rata']
    i0 = TGL.index('2026-10-01'); ip = TGL.index(PRAKIRAAN_MULAI)
    hari = list(range(i0, len(TGL)))
    bw = W / len(hari)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dr = ImageDraw.Draw(im)
    a, b = TGL.index('2026-11-02') - i0, TGL.index('2026-11-08') - i0
    dr.rectangle([a * bw, 0, (b + 1) * bw, H], fill=BL.RGB('FBE7D6'))
    dr.line([0, H - 1, W, H - 1], fill=BL.RGB('BFC5CC'), width=2)
    for n, j in enumerate(hari):
        v = h[j] or 0
        if v <= 0.05:
            continue
        tinggi = max(2, min(v, maks) / maks * (H - 4))
        dr.rectangle([n * bw + 1, H - 1 - tinggi, (n + 1) * bw - 2, H - 1], fill=BL.RGB(BIRU if j >= ip else BIRU_TUA))
    x1 = (TGL.index('2026-11-01') - i0) * bw
    dr.line([x1, 0, x1, H], fill=BL.RGB('6B7280'), width=2)
    im.save(path)


def s_hujan(Dk):
    ind = {r[1]: indikasi(r[1]) for r in KAB}
    kembali = [r for r in KAB if ind[r[1]][0] != 'belum']
    terpanjang = max(KAB, key=lambda r: HUJAN[r[1]]['hth'])
    s, k = Dk.slide(BL.judul(f'Model hujan menunjukkan musim hujan mulai di [{len(kembali)}] dari [{len(KAB)}] kab/kota; hari tanpa hujan '
                             f'per 8 November paling lama [{HUJAN[terpanjang[1]]["hth"]}] hari di {terpanjang[1]}'))
    BL.kepala_panel(k, 43.2, 102, 873.6, 'Hujan model per kab/kota (hipotesis, belum dicocokkan dengan pos BMKG)', 'cuaca-ekstrem',
                    'Awal musim hujan kriteria BMKG: hujan dasarian minimal 50 mm tiga dasarian berturut-turut. Hujan mulai 12 Nov adalah prakiraan')
    kol = [('KAB/KOTA', 96, 'l'), ('HTH 8 NOV|hari tanpa hujan', 70, 'c'), ('HUJAN 2-8 NOV|mm, hari hujan', 76, 'c'),
           ('OKT III|mm', 44, 'c'), ('NOV I|mm', 44, 'c'), ('NOV II|mm, prakiraan', 58, 'c'),
           ('HUJAN HARIAN 1 OKT S.D. 27 NOV|batang muda = prakiraan, pita = 2-8 Nov, garis = 1 Nov; kanan = puncak dan tanggalnya', 286, 'l'),
           ('INDIKASI AWAL|musim hujan (hipotesis)', 199.6, 'c')]
    kepala = 24
    prov = list(dict.fromkeys(r[0] for r in KAB))
    bawah = 466
    h = (bawah - 140 - kepala - len(prov) * 14.4) / len(KAB)
    GOL_IND = {'masuk': 'des', 'mulai': 'des', 'belum': 'putus'}

    def spark(kab):
        def f(k, x, y, w, hh):
            png = os.path.join(SINI, 'bahan', f'hujan-{kab.replace(" ", "-").lower()}.png')
            garis_hujan(kab, png)
            k.gambar(png, x + 6, y + 2, w - 72, hh - 4)
            h = HUJAN[kab]['rata']; i0 = TGL.index('2026-10-01')
            j = max(range(i0, len(TGL)), key=lambda j: h[j] or 0)
            k.teks(x + w - 64, y, 54, hh, [R(f'{f0(round(h[j]))} mm', 7.5, TEKS, True),
                                          R(f'  {int(TGL[j][8:])}/{int(TGL[j][5:7])}', 7, TEKS3)], rata='r', bungkus=False)
        return f

    def mm(v, merah=False):
        return ('runs', [R(f0(round(v)), 8.5, MERAH if merah else TEKS, True)])

    baris = []
    for p in prov:
        baris.append(('grup', p))
        for r in (r for r in KAB if r[0] == p):
            hu = HUJAN[r[1]]
            das = {d[0]: d[1] for d in hu['das']}
            hth = hu['hth']
            kls = ['sangat pendek', 'pendek', 'menengah', 'panjang', 'sangat panjang', 'ekstrem'][sum(1 for b in (5, 10, 20, 30, 60) if hth > b)]
            baris.append(('data', [('runs', [R(r[1], 8.5, TEKS, True)]),
                                   ('runs', [R(str(hth), 8.5, TEKS, True), R(f'  {kls}', 7, TEKS3)]),
                                   ('runs', [R(f0(round(hu['mm'])), 8.5, TEKS, True), R(f'  {hu["hari_hujan"]} hari', 7, TEKS3)]),
                                   mm(das['Okt III'], das['Okt III'] < 50), mm(das['Nov I'], das['Nov I'] < 50), mm(das['Nov II'], das['Nov II'] < 50),
                                   spark(r[1]), pil(ind[r[1]][1], GOL_IND[ind[r[1]][0]], 7.5)], h))
    tabel_k(k, 43.2, 140, kol, baris, kepala=kepala)
    # pernyataan resmi BMKG di kaki
    k.bulat(43.2, 472, 873.6, 28, PITA_KERING, radius=4)
    k.ikon_bulat('prabencana', 49, 475, 22, KERING)
    k.teks(78, 472, 832, 28, [R('BMKG, 9 Nov 2026: ', 8.5, TEKS, True),
                              R('peningkatan hujan intensitas sedang pada 9 s.d. 12 Nov di semua provinsi Pulau Jawa kecuali DKI Jakarta; '
                                'Sulawesi Selatan dan Sulawesi Tengah tidak termasuk. Imbauan BMKG masih menyebut musim kemarau berlangsung, '
                                'sehingga indikasi model di atas perlu dicocokkan dengan pernyataan awal musim hujan resmi BMKG.', 8, TEKS2)])
    return ind


# ======================================================================== slide 4: keputusan status
def usulan(r, ind):
    kab, gol = r[1], r[6]
    i = ind[kab][0]
    hu = HUJAN[kab]
    if kab == 'Pekalongan':
        return ('Konfirmasi SK', 'putus', 'Laphar 8 Nov: 1 Jul s.d. 31 Nov 2026 (tanggal tidak ada); laphar 31 Okt dan 1 Nov: '
                f'1 Jun s.d. 31 Des 2026. Model: musim hujan {ind[kab][1][0].lower() + ind[kab][1][1:]}.')
    if gol == 'putus':
        return ('Akhiri sesuai jadwal', 'des', f'Model: musim hujan {ind[kab][1][0].lower() + ind[kab][1][1:]}; berakhir {r[5]} 2026 tanpa perpanjangan bila '
                'sumur dan mata air di desa penerima sudah pulih.')
    if gol == 'des':
        if i == 'belum':
            return ('Pertahankan', 'putus', f'Hujan model terendah di Jawa Tengah (Nov I {f0(round(dict((d[0], d[1]) for d in hu["das"])["Nov I"]))} mm); '
                    'penyaluran air tetap berjalan sampai status berakhir.')
        tambah = ' Status kabupaten 1 Agu s.d. 31 Okt sudah berakhir.' if kab == 'Klaten' else ''
        return ('Evaluasi awal Des', 'des', f'Model: musim hujan {ind[kab][1][0].lower() + ind[kab][1][1:]}; dapat diakhiri sebelum 31 Des bila sumber air '
                f'pulih.{tambah}')
    if i == 'belum':
        return ('Kaji kebutuhan', 'putus', f'Model belum memenuhi kriteria awal musim hujan; {r[0]} tidak masuk daftar hujan '
                'sedang BMKG 9 s.d. 12 Nov.')
    return ('Tanpa status baru', 'tanpa', f'Model: musim hujan {ind[kab][1][0].lower() + ind[kab][1][1:]}; penyaluran air cukup diteruskan sampai sumber air pulih.')


def s_status(Dk, ind):
    put = [r for r in KAB if r[6] == 'putus' and r[5] != '31/11?']
    s, k = Dk.slide(BL.judul(f'Siaga Darurat {put[0][1]} berakhir [{put[0][5]}] dan {put[1][1]} [{put[1][5]}] 2026; '
                             'model hujan mendukung keduanya tidak diperpanjang'))
    BL.kepala_panel(k, 43.2, 102, 873.6, 'Usulan keputusan status per kab/kota', 'tanggap-darurat',
                    'Sisa hari dihitung dari 9 Nov 2026. Keputusan status tetap pada pemerintah daerah')
    kol = [('KAB/KOTA', 100, 'l'), ('STATUS MENURUT LAPHAR TERAKHIR', 180, 'l'), ('SISA|hari', 40, 'c'), ('HUJAN MODEL|hipotesis', 78, 'c'),
           ('DISTRIBUSI AIR TERAKHIR', 136, 'l'), ('USULAN', 104, 'c'), ('ALASAN', 235.6, 'l')]
    akhir = {'30 Nov': date(2026, 11, 30), '1 Des': date(2026, 12, 1), '31 Des': date(2026, 12, 31)}
    grup = [('putus', 'Berakhir atau perlu dicek sebelum Desember 2026'), ('des', 'Berlaku sampai 31 Desember 2026'),
            ('tanpa', 'Status darurat belum dilaporkan')]
    kepala = 24
    h = (500 - 140 - kepala - 3 * 14.4) / len(KAB)
    baris = []
    for g, judul_g in grup:
        baris.append(('grup', judul_g))
        for r in (r for r in KAB if r[6] == g):
            u, ug, alasan = usulan(r, ind)
            sisa = (akhir[r[5]] - date(2026, 11, 9)).days if r[5] in akhir else None
            gi = {'masuk': 'des', 'mulai': 'des', 'belum': 'putus'}[ind[r[1]][0]]
            baris.append(('data', [('runs', [R(r[1], 8.5, TEKS, True)]), ('runs', [R(r[4], 7.5, TEKS)]),
                                   ('runs', [R(f0(sisa) if sisa is not None else '–', 8.5, MERAH if sisa is not None and sisa <= 22 else TEKS, True)]),
                                   ('runs', [R(ind[r[1]][1], 7.5, GOL[gi][2], True)]),
                                   ('runs', [R(r[8], 7.5, TEKS)]), pil(u, ug, 7.5), ('runs', [R(alasan, 7, TEKS)])], h))
    tabel_k(k, 43.2, 140, kol, baris, kepala=kepala)


# ======================================================================== slide 5: rekomendasi
REKOM = [
    ('Verifikasi sumber air sebelum status berakhir', 'Pemalang (30 Nov) dan Blitar (1 Des): cek sumur dan mata air di desa penerima '
     'droping. Bila pulih, status berakhir sesuai jadwal tanpa perpanjangan; bila belum, penyaluran diteruskan.',
     ['BPBD Kab. Pemalang', 'BPBD Kab. Blitar'], 'Paling lambat 27 Nov 2026'),
    ('Konfirmasi SK status Kabupaten Pekalongan', 'Laphar 8 Nov menulis masa berlaku sampai "31 Nov 2026", laphar sebelumnya 31 Des 2026. '
     'Salinan SK dikirim supaya tanggal akhir dan rencana penanganan pasti.', ['BPBD Kab. Pekalongan', 'Pusdalops BNPB'], '16 s.d. 20 Nov 2026'),
    ('Evaluasi Siaga Darurat Provinsi Jawa Tengah', 'Pakai data hujan pos BMKG dasarian Nov II dan Nov III serta pernyataan awal musim hujan '
     'resmi. Empat kab/kota dengan indikasi musim hujan mulai Nov II dapat diakhiri lebih cepat; Boyolali dipertahankan.',
     ['BPBD Prov. Jawa Tengah', 'BMKG'], '1 s.d. 5 Des 2026'),
    ('Tambah penyaluran di cakupan rendah', 'Blitar dan Boyolali di bawah 10 persen kebutuhan minimum 15 liter per jiwa per hari. Bone '
     'dan Banggai Kepulauan tanpa status dan belum masuk musim hujan menurut model: kaji kebutuhan dan dukungan mobil tangki bila diminta pemda.',
     ['BPBD Kab. Blitar', 'BPBD Kab. Boyolali', 'BPBD Kab. Bone', 'BPBD Kab. Banggai Kepulauan'], '10 s.d. 16 Nov 2026'),
    ('Lengkapi isi laporan distribusi air', 'Tiap laporan memuat liter per hari dan jumlah penerima dalam jiwa; angka total disertai '
     'tanggal mulai penyaluran. Pekan ini 3 kab/kota hanya melaporkan KK dan 4 kab/kota hanya angka total (halaman 4).',
     ['BPBD 12 kab/kota', 'Dit. Koordalops BNPB'], 'Mulai laphar 10 Nov 2026'),
]


def s_rekom(Dk):
    s, k = Dk.slide(BL.judul(f'Rekomendasi tindak lanjut: [{len(REKOM)}] langkah sampai awal Desember 2026 untuk menutup status '
                             'kekeringan dengan aman'))
    k.bulat(43.2, 102, 873.6, 18, NAVY, radius=4)
    X = [(43.2, 262, 'LANGKAH'), (305.2, 330, 'RINCIAN'), (645.2, 170, 'PELAKSANA'), (825.2, 91.6, 'WAKTU')]
    for x, w, t in X:
        k.teks(x, 102, w, 18, [R(t, 7.5, PUTIH, True, 0.6)], rata='c', bungkus=False)
    KON = ['pascabencana', 'data', 'kalender', 'kekeringan', 'ringkasan']
    y0, hb = 122, 75.6
    for i, (lk, rc, pk, wk) in enumerate(REKOM):
        y = y0 + i * hb
        k.ikon_bulat(KON[i], 52, y + hb / 2 - 15, 30)
        k.teks(92, y, 205, hb, [R(lk, 11, NAVY, True)])   # pemilik 13 Nov: heading tidak diawali nomor
        k.teks(305.2, y, 330, hb, [R(rc, 9.5, TEKS2)], rata='j')
        cy = y + hb / 2 - (len(pk) * 17 - 3) / 2
        for j, p in enumerate(pk):
            w = 22 + len(p) * 4.1
            utama = j == 0
            k.bulat(650, cy, w, 14, NAVY if utama else PUTIH, None if utama else GARIS)
            k.gambar(ikon('lembaga', 'kertas' if utama else 'navy'), 655, cy + 3, 8, 8)
            k.teks(666, cy, w - 18, 14, [R(p, 7, PUTIH if utama else TEKS, True)], bungkus=False)
            cy += 17
        k.bulat(830, y + hb / 2 - 11, 82, 22, PITA_KERING, radius=4)
        k.teks(830, y + hb / 2 - 11, 82, 22, [R(wk, 7.5, TEKS, True)], rata='c', spasi=0.9)
        k.garis_datar(43.2, 916.8, y + hb, GARIS if i < len(REKOM) - 1 else TEKS, 0.5 if i < len(REKOM) - 1 else 0.75)


# ======================================================================== rakit
def main():
    Dk = BL.Deck()
    s_peta(Dk)
    s_air(Dk)
    ind = s_hujan(Dk)
    s_status(Dk, ind)
    s_rekom(Dk)
    isi = os.path.join(SINI, f'{NAMA}.pptx')
    Dk.I.simpan(isi)
    if '--isi' in sys.argv:
        print('isi saja:', isi); return
    sb_hujan = 'Open-Meteo (model hujan gabungan, diambil 12 Nov 2026), diolah Tim Ahli BNPB; BMKG, prakiraan 9 s.d. 12 Nov 2026'
    sumber = {1: SB_KOORD, 2: SB_KOORD + '; Sphere Handbook 2018', 3: sb_hujan,
              4: SB_KOORD + '; ' + sb_hujan.split(';')[0], 5: SB_KOORD + '; analisis halaman 2 s.d. 4'}
    bagian_hal = {1: 1, 2: 2, 3: 3, 4: 3, 5: 4}
    susun = [{'jenis': 'sampul'}, {'jenis': 'daftar-isi'}]
    susun += [{'halaman': n, 'bagian': bagian_hal[n], 'sumber': sumber[n]} for n in range(1, 6)]
    foto = os.path.join(SINI, 'bahan', 'sampul.jpg').replace(os.sep, '/')
    kredit = 'Foto: Crisco 1492, CC BY-SA 4.0, Wikimedia Commons'
    susun.append({'jenis': 'penutup', 'layout': 'putih', 'foto': [foto], 'kredit': kredit})
    tetap = {}
    for no, b in enumerate(susun, 1):
        if b.get('bagian'):
            tetap.setdefault(b['bagian'], []).append(no)
    bagian = [{'judul': j, 'label': j} for j in ('Situasi kekeringan sepekan', 'Distribusi air bersih', 'Hujan dan status darurat',
                                                 'Rekomendasi')]
    for n, b in enumerate(bagian, 1):
        b['halaman_tetap'] = tetap[n]
    import lewat_deck
    keluar = lewat_deck.bingkai(
        isi, 'kajian', 'Laporan Situasi Kekeringan',   # nbsp: D-41 menolak satu kata di baris terakhir sampul
        'Senin, 2 November s.d. Minggu, 8 November 2026', date(2026, 11, 9),
        foto=([foto], kredit), penyaji={'nama': 'Tim Ahli dan Tim Sus IT BNPB', 'jabatan': 'Badan Nasional Penanggulangan Bencana'},
        kepada='Disampaikan kepada Kepala Badan Nasional Penanggulangan Bencana', bagian=bagian, susun=susun,
        spek_tambah={'panel_sisi': 'gelap', 'subjek_dokumen': 'Paparan Situasi Kekeringan Mingguan', 'skala_logo_bnpb': 1.1})
    print(keluar)


if __name__ == '__main__':
    main()
