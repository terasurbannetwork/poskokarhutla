"""Laporan Khusus satu halaman: Gempa M7,1 Laut Banda, 17 Nov 2026 04.11.20 WIB (Kepulauan Tanimbar, Maluku Tenggara, Kota Tual).

Bahan: parameter BMKG dan laporan BPBD lewat Pusdalops BNPB (teks WA 17 Nov 2026). Guncangan per kab/kota adalah MODEL repo
(scripts/gempa/guncangan.py, Zhao 2006 intraslab, Vs30 baku), bukan pengamatan; penduduk WorldPop 2026 per kecamatan.
Bingkai dan alat gambar dipakai ulang dari deck banjir-longsor 091126 lewat insidental/gempa-tsunami-simulasi (tidak disalin).

    python buat.py          # isi.pptx -> deck.py (tanpa sampul) -> PPTX + PDF
    python buat.py --isi    # hanya slide isi
    python buat.py --radius # versi pembanding dengan lingkaran jarak 100, 200, 400 km
"""
import importlib.util, json, math, os, sys
from collections import Counter, defaultdict
from datetime import date

SINI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(SINI, '..', '..', '..', '..'))
LB = os.path.join(REPO, 'data', 'laporan-bnpb')
TANPA_RADIUS = '--radius' not in sys.argv   # pemilik 17 Nov 2026 memilih versi tanpa lingkaran jarak; --radius untuk pembanding
NAMA = 'Laporan Khusus Gempa M7,1 Laut Banda 171126' + ('' if TANPA_RADIUS else ' (dengan radius)')

_s = importlib.util.spec_from_file_location('bl', os.path.join(LB, 'mingguan/2026-11-09/banjir-longsor', 'buat.py'))
BL = importlib.util.module_from_spec(_s); _s.loader.exec_module(BL)
BL.B.SINI = SINI
os.makedirs(os.path.join(SINI, 'bahan', 'ikon'), exist_ok=True)
R, judul, tabel, kartu, label_peta, kepala_panel, rt, f0 = BL.R, BL.judul, BL.tabel, BL.kartu, BL.label_peta, BL.kepala_panel, BL.rt, BL.f0
TEKS, NAVY, ORANYE, MERAH, PUTIH, GARIS, KAB_TINT, TEKS3 = BL.TEKS, BL.NAVY, BL.ORANYE, BL.MERAH, BL.PUTIH, BL.GARIS, BL.KAB_TINT, BL.TEKS3
sys.path.insert(0, os.path.join(REPO, 'scripts', 'gempa'))
import guncangan as G   # noqa: E402
from pptx.enum.shapes import MSO_SHAPE   # noqa: E402

MMI_WARNA = {6: 'D9600B', 5: 'E8894A', 4: 'F4C3A0', 3: 'FBE7D6'}
ROMAWI = {1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII'}
GEMPA = {'m': 7.1, 'dalam': 115, 'lat': -6.03, 'lon': 131.62}
KP = '81'


def angka(v, d=1):
    return f'{v:.{d}f}'.replace('.', ',')


def mmi_kab():
    pend = json.load(open(os.path.join(REPO, 'public', 'data', 'penduduk.json'), encoding='utf-8'))['kec']
    pk = json.load(open(os.path.join(REPO, 'public', 'banjir', 'data', 'pusat_kec.json'), encoding='utf-8'))
    kelas, maks = defaultdict(Counter), defaultdict(float)
    for kunci, (la, lo) in pk.items():
        kp, kab = kunci.split('|')[:2]
        if kp != KP:
            continue
        m = G.mmi_perkiraan(GEMPA['m'], G.jarak_km(GEMPA['lat'], GEMPA['lon'], la, lo), GEMPA['dalam'], 'intraslab')
        kelas[kab][int(m + 0.5)] += pend.get(kunci, 0)
        maks[kab] = max(maks[kab], m)
    return kelas, maks


KELAS, MAKS = mmi_kab()
DARI_ROMAWI = {v: k for k, v in ROMAWI.items()}
_pil_asli = BL.pil_status


def pil_status(k, x, y, w, h, teks, merah, pt=9.19, warna=None):
    """Pil MMI berwarna legenda peta (teks putih hanya di kelas VI); selain itu pil acuan."""
    b = DARI_ROMAWI.get(teks)
    if b not in MMI_WARNA:
        return _pil_asli(k, x, y, w, h, teks, merah, pt, warna)
    k.bulat(x, y, w, h, MMI_WARNA[b])
    k.teks(x, y, w, h, [R(teks, min(pt, 8.5), PUTIH if b >= 6 else TEKS, True)], rata='c', bungkus=False)


BL.pil_status = pil_status
band = lambda m: int(m + 0.5)

# laporan BPBD lewat Pusdalops BNPB: (kab/kota di peta, nama di tabel, jarak BMKG, lama dirasakan, kondisi)
LAPOR = [
    ('Maluku Tenggara', 'Kab. Maluku Tenggara', '130 km', '±10 detik',
     'Dirasakan kuat; sebagian warga panik dan keluar rumah. BPBD memantau situasi pascagempa.'),
    ('Kota Tual', 'Kota Tual', '133 km', '±3-5 detik',
     'Sebagian warga berhamburan keluar rumah, lalu situasi kembali kondusif. BPBD memantau situasi pascagempa.'),
    ('Kepulauan Tanimbar', 'Kab. Kepulauan Tanimbar', '218 km', '±10 detik',
     'Dirasakan kuat; sebagian warga panik dan keluar rumah. BPBD memantau situasi pascagempa.'),
]

EXT = (127.4, 136.0, -2.55, -2.55 - 8.6 * 338 / 418)
PX = (2000, int(2000 * 338 / 418))


RADIUS = () if TANPA_RADIUS else (100, 200, 400)
KM_PX = PX[0] / ((EXT[1] - EXT[0]) * 111.32 * math.cos(math.radians(-GEMPA['lat'])))   # piksel PNG per km di lintang pusat


def cincin_radius(png):
    """Lingkaran radius dari pusat gempa, garis putus abu, digambar di PNG supaya terpotong tepi peta."""
    from PIL import Image, ImageDraw
    im = Image.open(png); dr = ImageDraw.Draw(im)
    cx = (GEMPA['lon'] - EXT[0]) / (EXT[1] - EXT[0]) * PX[0]
    cy = (EXT[2] - GEMPA['lat']) / (EXT[2] - EXT[3]) * PX[1]
    for r in RADIUS:
        rp = r * KM_PX
        for a in range(0, 360, 6):
            dr.arc([cx - rp, cy - rp, cx + rp, cy + rp], a, a + 3.5, fill=(122, 134, 153, 255), width=4)
    im.save(png)


def proyeksi(f, x0, y0, w, h):
    return lambda lon, lat: (x0 + f(lon, lat)[0] / PX[0] * w, y0 + f(lon, lat)[1] / PX[1] * h)


def s_laporan(Dk):
    s, k = Dk.slide(judul('Gempa [M7,1] di Laut Banda dirasakan kuat di Kepulauan Kei dan Tanimbar; gempa '
                          '[tidak berpotensi tsunami] dan warga sempat keluar rumah', pt=20))
    # ---------------------------------------------------------------- peta guncangan (model)
    warna = {(KP, kab): MMI_WARNA[band(m)] for kab, m in MAKS.items() if band(m) in MMI_WARNA}
    png = os.path.join(SINI, 'bahan', 'peta-guncangan.png')
    proj = proyeksi(BL.gambar_peta(png, EXT, PX, warna, BL.SEMUA_PROV), 43.2, 102, 418, 338)
    cincin_radius(png)
    k.gambar(png, 43.2, 102, 418, 338)
    ex, ey = proj(GEMPA['lon'], GEMPA['lat'])
    for r in RADIUS:
        rp = r * KM_PX * 418 / PX[0]
        sudut = math.radians({100: 135, 200: 135, 400: 160}[r])   # label di laut, arah barat daya dan barat
        lx, ly = ex + rp * math.cos(sudut), ey + rp * math.sin(sudut)
        k.bulat(lx - 20, ly - 7, 40, 14, PUTIH, '7A8699', radius=7)
        k.teks(lx - 20, ly - 7, 40, 14, [R(f'{r} km', 7.5, TEKS, True)], rata='c', bungkus=False)
    TITIK = {'Maluku Barat Daya': (129.72, -7.90)}   # Kep. Babar; pusat poligon terbesar (Wetar) di luar peta
    POS = {'Kota Tual': (232, 205), 'Maluku Tenggara': (330, 226), 'Kepulauan Aru': (360, 328), 'Kepulauan Tanimbar': (48, 394),
           'Maluku Tengah': (100, 156), 'Seram Bagian Timur': (232, 156), 'Seram Bagian Barat': (48, 178),
           'Maluku Barat Daya': (48, 370)}
    for kab, (lx, ly) in POS.items():
        b = band(MAKS[kab])
        label_peta(k, lx, ly, kab.replace('Kepulauan', 'Kep.'), f'MMI {ROMAWI[b]}', b >= 6, proj(*TITIK.get(kab, BL.pusat(KP, kab))))
    ex, ey = proj(GEMPA['lon'], GEMPA['lat'])
    px_ = ex - 205   # pil di kiri, berjarak, dengan garis penunjuk dan titik ke ikon pusat gempa
    k.garis(px_ + 150, ey, ex - 11, ey, MERAH, 0.75)
    k.kotak(px_ + 147.5, ey - 2.5, 5, 5, PUTIH, MERAH, bentuk=MSO_SHAPE.OVAL)
    k.kotak(ex - 11, ey - 11, 22, 22, PUTIH, MERAH, 1.0, bentuk=MSO_SHAPE.OVAL)
    k.ikon_bulat('gempa', ex - 9, ey - 9, 18, MERAH)
    k.bulat(px_, ey - 7.5, 145, 15, PUTIH, MERAH, radius=7)
    k.teks(px_, ey - 7.5, 145, 15, [R('Pusat gempa, kedalaman 115 km', 8, MERAH, True)], rata='c', bungkus=False)
    BL.unsur_peta(k, 100 / 111 * 418 / (EXT[1] - EXT[0]))
    lx, ly = (256, 397) if TANPA_RADIUS else (256, 381)
    k.bulat(lx - 6, ly, 205, 40 if TANPA_RADIUS else 56, PUTIH, GARIS, radius=4)
    k.teks(lx, ly + 3, 195, 12, [R('Guncangan terkuat per kab/kota (MMI, model)', 7.5, TEKS, True)], bungkus=False)
    for i, b in enumerate((6, 5, 4, 3)):
        k.kotak(lx + i * 48, ly + 21, 16, 11, MMI_WARNA[b], GARIS, 0.5)
        k.teks(lx + i * 48 + 19, ly + 19, 28, 15, [R(ROMAWI[b], 9, TEKS, True)], bungkus=False)
    for j in range(0 if TANPA_RADIUS else 4):   # contoh garis putus cincin radius
        k.garis(lx + j * 5, ly + 43, lx + j * 5 + 3, ly + 43, '7A8699', 1.25)
    if not TANPA_RADIUS:
        k.teks(lx + 24, ly + 37, 175, 12, [R('Jarak dari pusat gempa (100, 200, dan 400 km)', 7.5, TEKS)], bungkus=False)
    kartu(k, 43.2, 446.4, 206.1, 'Tidak berpotensi tsunami', 'Penilaian BMKG; pusat gempa berada di laut', False)
    kartu(k, 254.3, 446.4, 206.1, 'Pemantauan BPBD', 'Berjalan di 3 kab/kota yang melapor', True)
    # ---------------------------------------------------------------- parameter BMKG
    PAR = [('Waktu (17 Nov 2026)', '04.11.20 WIB', 'kalender', 106), ('Magnitudo', 'M7,1', 'gempa', 68),
           ('Kedalaman', '115 km', 'turun', 70), ('Pusat gempa', '6,03 LS 131,62 BT', 'wilayah', 108),
           ('Waktu setempat', '06.11.20 WIT', 'kalender', 93.5)]
    from PIL import ImageFont
    fon = os.path.join(REPO, 'data', 'kajian-bnpb', 'skill', 'deck-bnpb', 'assets', 'fonts', 'Roboto-Bold.ttf')
    lebar = lambda t, pt: ImageFont.truetype(fon, int(pt * 20)).getlength(t) / 20   # lebar teks Roboto tebal dalam pt
    x = 471.3
    for i, (a, b, ik, w) in enumerate(PAR):
        x0 = x + (2 if i else 0)
        wk = w - (2 if i else 0) - 2
        k.bulat(x0, 101, wk, 38, KAB_TINT, radius=4)
        pv = 9 if len(b) < 16 else 8
        wt = max(lebar(a, 7), lebar(b, pv)) + 2
        gx = x0 + (wk - (18 + 6 + wt)) / 2   # ikon + teks ditengahkan sebagai satu kelompok
        k.ikon_bulat(ik, gx, 111, 18, NAVY)
        k.teks(gx + 24, 108, wt, 10, [R(a, 7, TEKS3, True)], bungkus=False, jangkar='b')
        k.teks(gx + 24, 118, wt, 13, [R(b, pv, NAVY, True)], bungkus=False, jangkar='t')
        x += w
    # ---------------------------------------------------------------- kondisi per kab/kota
    kepala_panel(k, 471.3, 147, 445.5, 'Kondisi saat gempa menurut BPBD', 'gempa')
    kol = [('', 98, 'l'), ('', 56, 'c'), ('', 40, 'c'), ('', 58, 'c'), ('', 193.5, 'l')]
    baris = [('data', [('runs', [R(nm, 8.6, TEKS, True)]), jr, ('pil', ROMAWI[band(MAKS[kab])], False, 8.5), rt(lama, 7.8), rt(kon, 7.8)], 34)
             for kab, nm, jr, lama, kon in LAPOR]
    yb = tabel(k, 471.3, 184, kol, baris, kepala=24, pt=8.6)
    _kepala2(k, 471.3, 184, kol, ['KAB/KOTA', 'JARAK KE|PUSAT', 'MMI|MODEL', 'LAMA|DIRASAKAN', 'KONDISI DAN TINDAKAN'], 24)
    # ---------------------------------------------------------------- keterpaparan penduduk (model)
    y = yb + 10
    kepala_panel(k, 471.3, y, 445.5, 'Penduduk dalam jangkauan guncangan (model)', 'pengungsi')
    kol = [('', 150, 'l'), ('', 55, 'c'), ('', 80, 'c'), ('', 80, 'c'), ('', 80.5, 'c')]
    urut = sorted(((kab, m) for kab, m in MAKS.items() if m >= 3.5), key=lambda t: -t[1])
    baris = [('data', [kab if kab.startswith('Kota') else f'Kab. {kab}', ('pil', ROMAWI[band(m)], False, 8.5), f0(KELAS[kab][6] or None),
                       f0(KELAS[kab][5] or None), f0(KELAS[kab][4] or None)], 15) for kab, m in urut]
    ct = Counter()
    for kab, _ in urut:
        ct.update(KELAS[kab])
    baris.append(('total', [f'Total {len(urut)} kab/kota', '', f0(ct[6]), f0(ct[5]), f0(ct[4])]))
    tabel(k, 471.3, y + 36, kol, baris, kepala=20, pt=8.6, minh=14)
    _kepala2(k, 471.3, y + 36, kol, ['KAB/KOTA', 'MMI MAKS', 'JIWA MMI VI', 'JIWA MMI V', 'JIWA MMI IV'], 20)
    print('total jiwa VI/V/IV:', ct[6], ct[5], ct[4], 'y akhir tabel kondisi', yb)


def _kepala2(k, x, y, kol, judul2, h):
    cx = x
    for (j, w, rata), t in zip(kol, judul2):
        runs = []
        for i, bag in enumerate(t.split('|')):
            runs += (['\n'] if i else []) + [R(bag, 7, PUTIH, True, 0.5)]
        k.teks(cx, y, w, h, runs, rata=rata, kiri=8 if rata == 'l' else 1, kanan=1, spasi=0.9)
        cx += w


def main():
    print('MMI maks:', {kab: round(m, 2) for kab, m in sorted(MAKS.items(), key=lambda t: -t[1])})
    Dk = BL.Deck()
    s_laporan(Dk)
    isi = os.path.join(SINI, f'{NAMA}.pptx')
    Dk.I.simpan(isi)
    if '--isi' in sys.argv:
        print('isi saja:', isi); return
    sb = 'BMKG 17 Nov 2026; BPBD lewat Pusdalops BNPB; MMI model Zhao 2006 intraslab; penduduk WorldPop 2026'
    sys.path.insert(0, os.path.join(LB, 'generator'))
    import lewat_deck
    keluar = lewat_deck.bingkai(
        isi, 'kajian', 'Laporan Khusus Gempa Bumi M7,1 Laut Banda', 'Kepulauan Tanimbar, Maluku Tenggara, dan Kota Tual, Provinsi Maluku',
        date(2026, 11, 17), sampul=False, susun=[{'halaman': 1, 'sumber': sb}],
        spek_tambah={'subjek_dokumen': 'Laporan Khusus Gempa Bumi M7,1 Laut Banda', 'tanpa_alur': 'laporan khusus satu halaman'})
    print(keluar)


if __name__ == '__main__':
    main()
