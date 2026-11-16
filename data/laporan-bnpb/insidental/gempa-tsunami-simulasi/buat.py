"""Templat Laporan Insidental Gempa Bumi dan Tsunami, diisi SKENARIO SIMULASI (dibuat 12 Nov 2026).

Tujuan: memperlihatkan wujud laporan 0 sampai 72 jam setelah gempa merusak yang disertai peringatan dini tsunami.
SEMUA ANGKA KEJADIAN ADALAH DATA CONTOH: gempa M6,8 di laut selatan Cianjur, peringatan tsunami, korban, kerusakan, pengerahan,
dan kebutuhan tidak pernah terjadi. Yang nyata hanya geografi (public/geo/kabupaten), penduduk per kecamatan
(public/data/penduduk.json, WorldPop 2026), model guncangan repo (scripts/gempa/guncangan.py: Zhao 2006 antarmuka + Worden 2012)
dan parameter model susulan repo (public/gempa/data/model_susulan.json, Reasenberg-Jones).

Desain dan alat gambar dipakai ulang dari deck banjir-longsor-sepekan-2026-11-09/buat.py (tidak disalin, tidak diubah).

    python buat.py          # isi.pptx -> deck.py (sampul, daftar isi, tab bagian, penutup) -> PPTX + PDF
    python buat.py --isi    # hanya slide isi (cek cepat)
"""
import importlib.util, json, math, os, sys
from collections import Counter, defaultdict
from datetime import date

from pptx.enum.shapes import MSO_SHAPE
from pptx.util import Emu

SINI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(SINI, '..', '..', '..', '..'))
LB = os.path.join(REPO, 'data', 'laporan-bnpb')
NAMA = 'Laporan Insidental Gempa dan Tsunami (Simulasi)'

_s = importlib.util.spec_from_file_location('bl', os.path.join(LB, 'mingguan/2026-11-09/banjir-longsor', 'buat.py'))
BL = importlib.util.module_from_spec(_s); _s.loader.exec_module(BL)
BL.B.SINI = SINI   # ikon PNG ditulis ke folder deck ini, bukan folder acuan
os.makedirs(os.path.join(SINI, 'bahan', 'ikon'), exist_ok=True)
R, judul, tabel, kartu, label_peta, kepala_panel, rt, f0 = BL.R, BL.judul, BL.tabel, BL.kartu, BL.label_peta, BL.kepala_panel, BL.rt, BL.f0
sys.path.insert(0, os.path.join(REPO, 'scripts', 'gempa'))
import guncangan as G   # noqa: E402

TEKS, NAVY, ORANYE, MERAH, PUTIH = BL.TEKS, BL.NAVY, BL.ORANYE, BL.MERAH, BL.PUTIH
BIRU, BIRU_TUA, PITA_BIRU, PITA_MERAH, KAB_TINT, TEKS3, GARIS = (BL.BIRU, BL.BIRU_TUA, BL.PITA_BIRU, BL.PITA_MERAH, BL.KAB_TINT,
                                                                 BL.TEKS3, BL.GARIS)
TEKS2, PITA_API, MUDA_API, PITA_KERING, EMAS_TEKS, NETRAL, BIRU_ABU = '2E3440', 'FBE7D6', 'FDF4EC', 'F4ECDC', '8A6A2E', 'E6EAF0', '3F5F80'
MMI_WARNA = {6: 'D9600B', 5: 'E8894A', 4: 'F4C3A0', 3: 'FBE7D6'}   # skala api tema.json kelas 4, 3, 2, 1
ROMAWI = {2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII'}

SIM = 'Data contoh (simulasi); '
PROV = {'32': 'Jawa Barat', '36': 'Banten', '31': 'DKI Jakarta', '33': 'Jawa Tengah'}


def angka(v, d=1):
    return f'{v:.{d}f}'.replace('.', ',')


# ======================================================================== skenario (DATA CONTOH)
GEMPA = {'m': 6.8, 'm_awal': 7.0, 'dalam': 25, 'lat': -7.92, 'lon': 107.00, 'jam': '14.21.07', 'mekanisme': 'Sesar naik (megathrust)'}
STATUS_JAM = 30   # laporan disusun per H+30 jam


def mmi_kab():
    """MMI rata-rata model repo di pusat tiap kecamatan (Zhao 2006 antarmuka + Worden 2012, Vs30 baku 400 m/s), penduduk
    kecamatan WorldPop 2026 dijumlah per kelas MMI (dibulatkan ke kelas terdekat)."""
    pend = json.load(open(os.path.join(REPO, 'public', 'data', 'penduduk.json'), encoding='utf-8'))['kec']
    pk = json.load(open(os.path.join(REPO, 'public', 'banjir', 'data', 'pusat_kec.json'), encoding='utf-8'))
    kelas, maks = defaultdict(Counter), defaultdict(float)
    for kunci, (la, lo) in pk.items():
        kp, kab = kunci.split('|')[:2]
        if kp not in PROV:
            continue
        m = G.mmi_perkiraan(GEMPA['m'], G.jarak_km(GEMPA['lat'], GEMPA['lon'], la, lo), GEMPA['dalam'], 'antarmuka')
        kelas[(kp, kab)][int(m + 0.5)] += pend.get(kunci, 0)
        maks[(kp, kab)] = max(maks[(kp, kab)], m)
    return kelas, maks


KELAS, MAKS = mmi_kab()
band = lambda m: int(m + 0.5)

# dampak per kab/kota: (kab, md, luka_berat, luka_ringan, hilang, pengungsi, rb, rs, rr, sekolah, faskes, ibadah, akses)
DAMPAK = [
    ('Cianjur', 4, 14, 62, 0, 4870, 186, 512, 1430, 24, 3, 38,
     'Longsor menutup jalan Sindangbarang-Cidaun di 2 titik; listrik padam di 6 kecamatan, 70% sudah menyala'),
    ('Sukabumi', 2, 8, 41, 2, 3215, 94, 337, 1012, 15, 2, 21,
     '2 nelayan hilang terseret arus di Palabuhanratu; Jembatan Cikaso retak, hanya kendaraan kecil'),
    ('Garut', 1, 4, 26, 0, 1460, 47, 164, 588, 9, 1, 12, 'Jalan Pameungpeuk-Cikajang retak, bisa dilalui; listrik normal'),
    ('Bandung', 0, 1, 9, 0, 210, 6, 41, 236, 4, 0, 5, 'Akses normal; 2 menara seluler sempat mati 3 jam'),
    ('Kota Sukabumi', 0, 0, 5, 0, 0, 2, 18, 97, 2, 0, 3, 'Akses dan listrik normal'),
    ('Bandung Barat', 0, 0, 3, 0, 0, 1, 12, 84, 1, 0, 2, 'Akses dan listrik normal'),
    ('Tasikmalaya', 0, 0, 2, 0, 0, 0, 9, 61, 1, 0, 1, 'Akses dan listrik normal'),
]
DAMPAK_LEBAK = ('Lebak', 0, 0, 1, 0, 0, 0, 3, 22, 0, 0, 1, 'Warga pesisir yang mengungsi saat peringatan tsunami sudah pulang')
DAMPAK.append(DAMPAK_LEBAK)
UNGSI_LOKASI = [('Lapangan Sindangbarang', 'Cianjur', 1840), ('GOR Palabuhanratu', 'Sukabumi', 1460),
                ('Alun-alun Cidaun', 'Cianjur', 1215)]
FASKRIT = [('Puskesmas Cidaun', 'Cianjur', 'Dinding retak; layanan pindah ke tenda halaman'),
           ('Jembatan Cikaso', 'Sukabumi', 'Retak; hanya kendaraan kecil yang boleh lewat'),
           ('Dermaga Palabuhanratu', 'Sukabumi', 'Rusak ringan; nelayan belum melaut sampai H+2')]
KP_DAMPAK = {r[0]: ('36' if r[0] == 'Lebak' else '32') for r in DAMPAK}
TOT = [sum(r[i] for r in DAMPAK) for i in range(1, 12)]   # md, lb, lr, hilang, ungsi, rb, rs, rr, sekolah, faskes, ibadah

# zona peringatan dini tsunami: (kab, prov, tingkat PD-1, tingkat PD-2, perkiraan tiba WIB, teramati, stasiun)
ZONA = [
    ('Cianjur bagian selatan', '32', 'Awas', 'Siaga', '14.41', ('0,5 m', '14.49'), 'Pengamatan BPBD di pantai Cidaun'),
    ('Sukabumi bagian selatan', '32', 'Siaga', 'Siaga', '14.44', ('0,6 m', '14.58'), 'Stasiun Palabuhanratu'),
    ('Garut bagian selatan', '32', 'Siaga', 'Waspada', '14.47', ('0,4 m', '15.06'), 'Stasiun Pameungpeuk'),
    ('Tasikmalaya bagian selatan', '32', 'Waspada', 'Waspada', '14.55', None, 'Tidak tercatat kenaikan muka air'),
    ('Pangandaran', '32', 'Waspada', 'Waspada', '15.02', ('0,3 m', '15.20'), 'Stasiun Pangandaran'),
    ('Lebak bagian selatan', '36', 'Waspada', 'Waspada', '14.52', ('0,3 m', '15.12'), 'Stasiun Binuangeun'),
    ('Pandeglang bagian selatan', '36', 'Waspada', 'Waspada', '15.05', None, 'Tidak tercatat kenaikan muka air'),
]
TL = [('14.21', 'Gempa M7,0', 'Parameter awal BMKG, 3 menit setelah gempa'),
      ('14.26', 'Peringatan PD-1', '1 zona Awas, 2 Siaga, 4 Waspada'),
      ('14.32', 'Peringatan PD-2', 'Mutakhir M6,8; Awas Cianjur turun ke Siaga'),
      ('14.58', 'Tsunami teramati', '0,6 m di Palabuhanratu, tertinggi'),
      ('15.40', 'Pembaruan PD-3', 'Tinggi teramati di 4 stasiun'),
      ('16.45', 'Berakhir PD-4', 'Warga boleh kembali ke rumah')]
TINGKAT = {'Awas': (PITA_MERAH, MERAH), 'Siaga': (PITA_API, ORANYE), 'Waspada': (PITA_KERING, EMAS_TEKS)}
TINGKAT_PETA = {'Awas': 'C8102E', 'Siaga': 'D9600B', 'Waspada': 'C4A262'}

# gempa susulan: laju Reasenberg-Jones dengan parameter repo
SUSUL = json.load(open(os.path.join(REPO, 'public', 'gempa', 'data', 'model_susulan.json'), encoding='utf-8'))['param']


def rj(m_min, t1, t2):
    """Jumlah harapan susulan M >= m_min pada selang hari (t1, t2] setelah gempa utama."""
    a, b, p, c = SUSUL['a'], SUSUL['b'], SUSUL['p'], SUSUL['c']
    return 10 ** (a + b * (GEMPA['m'] - m_min)) * ((t2 + c) ** (1 - p) - (t1 + c) ** (1 - p)) / (1 - p)


SUSUL_BESAR = [('H+0 pukul 17.48', 'M5,3', '18 km', 'V di Cidaun'), ('H+0 pukul 14.39', 'M5,0', '22 km', 'IV di Sindangbarang'),
               ('H+0 pukul 15.12', 'M4,8', '20 km', 'IV di Palabuhanratu'), ('H+0 pukul 22.05', 'M4,6', '27 km', 'III di Cianjur'),
               ('H+1 pukul 03.31', 'M4,4', '19 km', 'III di Pameungpeuk')]
GANGGU = [0.82, 1.06, 0.97, 1.10, 0.90, 1.04, 0.95, 1.08, 0.93, 1.02]   # simpangan tetap supaya batang tidak mulus sempurna
SUSUL_3J = [round(rj(3.0, i * 3 / 24, (i + 1) * 3 / 24) * g * 0.62) for i, g in enumerate(GANGGU)]   # 0,62: deteksi jaringan
T1 = STATUS_JAM / 24
PELUANG = {m: (1 - math.exp(-rj(m, T1, T1 + 1)), 1 - math.exp(-rj(m, T1, T1 + 7))) for m in (4.0, 5.0, 6.0, 6.8)}

# status darurat dan pos komando
STATUS = [('Kab. Cianjur', 'Tanggap Darurat', '14 hari, H+0 s.d. H+13', 'Pendopo Kabupaten Cianjur'),
          ('Kab. Sukabumi', 'Tanggap Darurat', '7 hari, H+0 s.d. H+6', 'Kecamatan Palabuhanratu'),
          ('Kab. Garut', 'Siaga Darurat', '7 hari, H+0 s.d. H+6', 'Kantor BPBD Garut'),
          ('Provinsi Jawa Barat', 'Siaga Darurat', '14 hari, H+0 s.d. H+13', 'Posko BNPB di Cianjur')]
UNSUR = [('BNPB', 36, 'Tim Reaksi Cepat dan pendampingan pos komando; dukungan dana siap pakai'),
         ('BPBD Jabar dan kab', 184, 'Kaji cepat, evakuasi, pendataan pengungsi'),
         ('Basarnas', 112, 'Pencarian 2 nelayan hilang; evakuasi korban reruntuhan'),
         ('TNI', 820, 'Evakuasi, dapur umum lapangan, pendirian tenda'),
         ('Polri', 560, 'Pengamanan pengungsian dan arus lalu lintas'),
         ('Kemenkes dan dinkes', 96, '4 tim medis darurat; layanan trauma dan rujukan'),
         ('Kemensos dan Tagana', 148, '6 dapur umum; logistik permakanan'),
         ('Kementerian PU', 74, '14 alat berat; buka jalan Sindangbarang-Cidaun'),
         ('PLN dan operator seluler', 184, 'Pemulihan listrik dan jaringan seluler')]
PERSONEL = sum(r[1] for r in UNSUR)
U = TOT[4]   # pengungsi


def keb():
    """Kebutuhan prioritas dihitung dari jumlah pengungsi dengan standar minimum Sphere (Piagam Kemanusiaan)."""
    tenda = math.ceil(U / 40)
    return [('Tenda pengungsi', f'{f0(tenda)} unit', '1 tenda peleton per 40 jiwa', 'Sebagian'),
            ('Air bersih', f'{f0(U * 15 // 1000)} ribu liter/hari', '15 liter per jiwa per hari', 'Sebagian'),
            ('Makanan siap saji', f'{f0(U * 3)} porsi/hari', '3 porsi per jiwa per hari', 'Terpenuhi'),
            ('Jamban darurat', f'{f0(math.ceil(U / 50))} unit', '1 jamban per 50 jiwa', 'Belum'),
            ('Selimut dan tikar', f'{f0(U)} lembar', '1 lembar per jiwa', 'Sebagian'),
            ('Paket bayi dan lansia', f'{f0(round(U * 0.11))} paket', '11% pengungsi balita dan lansia', 'Belum'),
            ('Tenaga dan obat trauma', '4 tim tambahan', f'{TOT[1] + TOT[2]} korban luka di 8 kab/kota', 'Sebagian'),
            ('Alat berat', '6 unit tambahan', '2 titik longsor jalan dan reruntuhan', 'Sebagian'),
            ('Genset dan penerangan', '24 unit', 'Pengungsian padam di 6 kecamatan', 'Belum')]


KEB = keb()
TIBA = [('BPBD Cianjur', 'Tenda keluarga 120 unit dari gudang kabupaten', 'H+0 21.40'),
        ('BNPB', 'Tenda pengungsi 60 unit dan selimut 2.000 lembar', 'H+0 23.10'),
        ('Kemensos', '6 dapur umum lapangan dan beras 12 ton', 'H+1 06.00'),
        ('Pemprov Jawa Barat', '4 truk tangki air bersih dan terpal 1.500 lembar', 'H+1 09.30')]

RENCANA = [
    ('+6 jam', 'sampai H+0 pukul 20.21', 'peringatan', [
        ('Tetapkan status darurat dan aktifkan posko', 'Bupati, BPBD', 'Selesai'),
        ('Kaji cepat korban dan kerusakan awal', 'BPBD, TRC BNPB', 'Selesai'),
        ('Evakuasi korban reruntuhan dan pencarian korban hilang', 'Basarnas, TNI, Polri', 'Selesai'),
        ('Dirikan pengungsian dan dapur umum pertama', 'Kemensos, TNI', 'Selesai'),
        ('Siarkan peringatan berakhir dan larangan masuk rumah retak', 'BMKG, BPBD', 'Selesai'),
        ('Laporkan kejadian awal ke Pusdalops BNPB', 'BPBD, Pusdalops', 'Selesai')]),
    ('+24 jam', 'sampai H+1 pukul 14.21', 'tanggap-darurat', [
        ('Buka jalan Sindangbarang-Cidaun yang tertutup longsor', 'Kementerian PU', 'Selesai'),
        ('Layanan trauma dan rujukan korban luka berat', 'Kemenkes, dinkes', 'Selesai'),
        ('Pulihkan listrik di 6 kecamatan padam', 'PLN', 'Berjalan'),
        ('Data pengungsi berbasis nama di tiap lokasi', 'BPBD, Dinsos', 'Selesai'),
        ('Rapat koordinasi dan rencana operasi darurat', 'BNPB, Pemprov Jabar', 'Selesai'),
        ('Tambah tenda dan genset pengungsian', 'BNPB, TNI', 'Berjalan')]),
    ('+72 jam', 'sampai H+3 pukul 14.21', 'pascabencana', [
        ('Verifikasi tingkat kerusakan semua rumah', 'BPBD, Dinas Perkim', 'Berjalan'),
        ('Pencarian 2 nelayan hilang sampai hari ke-7', 'Basarnas', 'Berjalan'),
        ('Periksa kelayakan sekolah dan faskes rusak', 'Kementerian PU', 'Rencana'),
        ('Penuhi kekurangan tenda dan jamban darurat', 'BNPB, Kemensos', 'Berjalan'),
        ('Sekolah darurat untuk siswa terdampak', 'Dinas Pendidikan', 'Rencana'),
        ('Putuskan perpanjangan atau masa transisi', 'Bupati, BNPB', 'Rencana')]),
]
STATUS_PIL = {'Selesai': (PITA_BIRU, BIRU_TUA), 'Terpenuhi': (PITA_BIRU, BIRU_TUA), 'Berjalan': (PITA_API, ORANYE),
              'Sebagian': (PITA_API, ORANYE), 'Rencana': (NETRAL, TEKS2), 'Belum': (PITA_MERAH, MERAH),
              'Tanggap Darurat': (PITA_MERAH, MERAH), 'Siaga Darurat': (PITA_API, ORANYE), **TINGKAT}

_pil_asli = BL.pil_status


def pil_status(k, x, y, w, h, teks, merah, pt=9.19):
    """Pil status bertint tanpa ikon untuk kosakata deck ini; selain itu pil acuan."""
    if teks not in STATUS_PIL:
        return _pil_asli(k, x, y, w, h, teks, merah, pt)
    isi, warna = STATUS_PIL[teks]
    k.bulat(x, y, w, h, isi)
    k.teks(x, y, w, h, [R(teks, min(pt, 8.5), warna, True)], rata='c', bungkus=False)


BL.pil_status = pil_status


def kepala2(k, x, y, kol, judul2, h):
    """Judul kolom dua baris di atas kepala navy yang digambar tabel() dengan judul kosong."""
    cx = x
    for (j, w, rata), t in zip(kol, judul2):
        runs = []
        for i, bag in enumerate(t.split('|')):
            runs += (['\n'] if i else []) + [R(bag, 7, PUTIH, True, 0.5)]
        k.teks(cx, y, w, h, runs, rata=rata, kiri=8 if rata == 'l' else 1, kanan=1, spasi=0.9)
        cx += w


# ======================================================================== bingkai slide: pita SIMULASI di bawah logo KRIS
class Deck(BL.Deck):
    def slide(self, judul_runs):
        s, k = super().slide(judul_runs)
        kx, ky, kw, kh = (Emu(v).pt for v in self.logo[0][1:])
        y = 77
        k.bulat(kx, y, kw, 14, MUDA_API, ORANYE, radius=7)
        k.gambar(BL.ikon('peringatan', 'oranye'), kx + 5, y + 2.5, 9, 9)
        k.teks(kx + 14, y, kw - 16, 14, [R('SIMULASI, data contoh', 7.5, ORANYE, True)], rata='c', bungkus=False)
        return s, k


# ======================================================================== peta
EXT1 = (105.6, 108.9, -6.05, -6.05 - 3.3 * 338 / 418)
PX1 = (2000, int(2000 * 338 / 418))


def proyeksi(f, x0, y0, w, h, px):
    return lambda lon, lat: (x0 + f(lon, lat)[0] / px[0] * w, y0 + f(lon, lat)[1] / px[1] * h)


def episenter(k, x, y, d=15):
    k.kotak(x - d / 2, y - d / 2, d, d, MERAH, PUTIH, 0.75, bentuk=MSO_SHAPE.STAR_5_POINT)


def s_guncangan(Dk):
    tampil = {kk: m for kk, m in MAKS.items() if m >= 3.5}
    v_atas = sum(n for kk, c in KELAS.items() for b, n in c.items() if b >= 5)
    s, k = Dk.slide(judul(f'Gempa [M6,8] di laut selatan Cianjur mengguncang [{len(tampil)}] kab/kota; '
                          f'[{angka(v_atas / 1e6, 2)} juta] jiwa merasakan guncangan MMI V ke atas'))
    warna = {kk: MMI_WARNA[band(m)] for kk, m in MAKS.items() if band(m) in MMI_WARNA}
    png = os.path.join(SINI, 'bahan', 'peta-guncangan.png')
    proj = proyeksi(BL.gambar_peta(png, EXT1, PX1, warna, ['31', '32', '33', '36']), 43.2, 102, 418, 338, PX1)
    k.gambar(png, 43.2, 102, 418, 338)
    ex, ey = proj(GEMPA['lon'], GEMPA['lat'])
    POS = {'Lebak': (48, 235), 'Sukabumi': (48, 262), 'Cianjur': (48, 300), 'Kota Sukabumi': (90, 150),
           'Bandung Barat': (230, 122), 'Bandung': (340, 150), 'Tasikmalaya': (335, 330), 'Garut': (300, 356)}
    for kab, (lx, ly) in POS.items():
        kp = '36' if kab == 'Lebak' else '32'
        b = band(MAKS[(kp, kab)])
        label_peta(k, lx, ly, kab, f'MMI {ROMAWI[b]} ({angka(MAKS[(kp, kab)])})', b >= 5, proj(*BL.pusat(kp, kab)))
    episenter(k, ex, ey)
    k.bulat(ex - 124, ey - 7.5, 112, 15, PUTIH, MERAH, radius=7)
    k.teks(ex - 124, ey - 7.5, 112, 15, [R('Pusat gempa, 25 km', 8, MERAH, True)], rata='c', bungkus=False)
    BL.unsur_peta(k, 100 / 111 * 418 / (EXT1[1] - EXT1[0]))
    # legenda kelas MMI
    lx = 54
    k.bulat(lx - 6, 356, 205, 40, PUTIH, GARIS, radius=4)
    k.teks(lx, 359, 195, 12, [R('Guncangan terkuat per kab/kota (MMI, model)', 7.5, TEKS, True)], bungkus=False)
    for i, b in enumerate((6, 5, 4, 3)):
        k.kotak(lx + i * 48, 377, 16, 11, MMI_WARNA[b], GARIS, 0.5)
        k.teks(lx + i * 48 + 19, 375, 28, 15, [R(ROMAWI[b], 9, TEKS, True)], bungkus=False)
    kartu(k, 43.2, 446.4, 206.1, f'{f0(v_atas)} jiwa', 'Penduduk dalam guncangan MMI V ke atas', True)
    kartu(k, 254.3, 446.4, 206.1, f'{len(tampil)} kab/kota', 'Merasakan guncangan MMI IV ke atas', False)
    # parameter gempa
    PAR = [('Waktu', f'H+0, {GEMPA["jam"]} WIB'), ('Magnitudo', 'M6,8 (awal M7,0)'), ('Kedalaman', '25 km'),
           ('Pusat', '7,92 LS 107,00 BT'), ('Mekanisme', 'Sesar naik, megathrust')]
    w = 445.5 / len(PAR)
    for i, (a, b) in enumerate(PAR):
        x = 471.3 + i * w
        k.bulat(x + (2 if i else 0), 101, w - 4, 38, KAB_TINT, radius=4)
        k.teks(x + 8, 104, w - 12, 12, [R(a, 7, TEKS3, True)], bungkus=False)
        k.teks(x + 8, 117, w - 12, 18, [R(b, 9 if len(b) < 18 else 8.6, NAVY, True)], bungkus=False)
    # tabel keterpaparan
    kol = [('', 128, 'l'), ('', 48, 'c'), ('', 66, 'c'), ('', 66, 'c'), ('', 66, 'c'), ('', 71.5, 'c')]
    urut = sorted(((kk, m) for kk, m in MAKS.items() if m >= 3.95), key=lambda t: -t[1])
    baris, sisa = [], [kk for kk in tampil if kk not in dict(urut)]
    for kp in ('32', '36'):
        rs = [(kk, m) for kk, m in urut if kk[0] == kp]
        if not rs:
            continue
        baris.append(('prov', PROV[kp]))
        for kk, m in rs:
            c = KELAS[kk]
            baris.append(('data', [kk[1], f'{ROMAWI[band(m)]} ({angka(m)})', f0(c[6] or None), f0(c[5] or None), f0(c[4] or None),
                                   f0(sum(c[b] for b in (4, 5, 6)))]))
    cs = Counter()
    for kk in sisa:
        cs.update(KELAS[kk])
    baris.append(('sub', [f'Lainnya, {len(sisa)} kab/kota', 'IV', '–', '–', f0(cs[4]), f0(cs[4] + cs[5] + cs[6])]))
    ct = Counter()
    for kk in tampil:
        ct.update(KELAS[kk])
    baris.append(('total', [f'Total {len(tampil)} kab/kota', '', f0(ct[6]), f0(ct[5]), f0(ct[4]), f0(ct[4] + ct[5] + ct[6])]))
    tabel(k, 471.3, 146, kol, baris, kepala=24, pt=8.6)
    kepala2(k, 471.3, 146, kol, ['KAB/KOTA', 'MMI|MAKS', 'JIWA|MMI VI', 'JIWA|MMI V', 'JIWA|MMI IV', 'JIWA|MMI IV-VI'], 24)


# ======================================================================== slide 2: peringatan dini tsunami
EXT2 = (105.2, 109.3, -6.2, -6.2 - 4.1 * 240 / 418)
PX2 = (2000, int(2000 * 240 / 418))
EVAK = [('Sukabumi bagian selatan', 7850, 'H+0 pukul 17.30'), ('Cianjur bagian selatan', 4320, 'H+0 pukul 17.45'),
        ('5 zona Waspada lainnya', 5770, 'H+0 pukul 17.10')]


def pantai(kp, kab, lon_min=None):
    """Titik pesisir selatan: simpul paling selatan poligon terbesar kab/kota (opsional di timur lon_min)."""
    f = next(f for f in BL.geo(kp) if f['properties']['kab'] == kab)
    ring = max((p[0] for p in BL.cincin(f)), key=lambda r: abs(BL._luas(r)))
    return min((q for q in ring if lon_min is None or q[0] >= lon_min), key=lambda q: q[1])


def lebar_label(nama, status=''):
    return (len(nama) * 9 + len(status) * 7.5) * 0.53 + 26


def s_tsunami(Dk):
    s, k = Dk.slide(judul(f'Peringatan dini tsunami berlaku [2 jam 24 menit] di [{len(ZONA)}] zona; tinggi teramati paling besar '
                          '[0,6 m] di Palabuhanratu'))
    kab_z = {(z[1], z[0].replace(' bagian selatan', '')): z for z in ZONA}
    warna = {kk: TINGKAT_PETA[z[3]] for kk, z in kab_z.items()}
    png = os.path.join(SINI, 'bahan', 'peta-tsunami.png')
    proj = proyeksi(BL.gambar_peta(png, EXT2, PX2, warna, ['31', '32', '33', '36']), 43.2, 102, 418, 240, PX2)
    k.gambar(png, 43.2, 102, 418, 240)
    # label nama di laut, tepat di bawah titik pesisir tiap zona; dua baris berselang supaya garis penunjuk tegak dan tidak bersilang
    BARIS = {'Pandeglang': 205, 'Lebak': 228, 'Sukabumi': 290, 'Garut': 290, 'Pangandaran': 290, 'Cianjur': 314, 'Tasikmalaya': 314}
    for (kp, kab), z in kab_z.items():
        tx, ty = proj(*pantai(kp, kab, 108.5 if kab == 'Pangandaran' else None))
        lx = tx - 12 if kab == 'Pangandaran' else max(48, tx - lebar_label(kab) / 2)
        label_peta(k, lx, BARIS[kab], kab, '', z[3] != 'Waspada', (tx, ty))
    ex, ey = proj(GEMPA['lon'], GEMPA['lat'])
    episenter(k, ex, ey, 13)
    # legenda
    k.bulat(48, 284, 110, 54, PUTIH, GARIS, radius=4)
    k.teks(54, 287, 100, 12, [R('Tingkat terakhir (PD-2)', 7.5, TEKS, True)], bungkus=False)
    for i, t in enumerate(('Siaga', 'Waspada')):
        k.kotak(54, 303 + i * 16, 16, 11, TINGKAT_PETA[t], GARIS, 0.5)
        k.teks(74, 301 + i * 16, 80, 15, [R(t, 9, TEKS, True)], bungkus=False)
    # lini masa
    kepala_panel(k, 43.2, 348, 418, 'Urutan peringatan dini BMKG, H+0', 'tsunami')
    w = 418 / len(TL)
    yl = 405
    k.garis_datar(43.2 + w / 2, 43.2 + 418 - w / 2, yl, GARIS, 1.5)
    for i, (jam, a, b) in enumerate(TL):
        cx = 43.2 + w * i + w / 2
        akhir = i == len(TL) - 1
        k.teks(cx - w / 2, 384, w, 14, [R(jam, 10, ORANYE if i in (1, 3) else NAVY, True)], rata='c', bungkus=False)
        k.kotak(cx - 5, yl - 5, 10, 10, BIRU_TUA if akhir else (ORANYE if i in (1, 3) else NAVY), PUTIH, 1.0, bentuk=MSO_SHAPE.OVAL)
        k.teks(cx - w / 2 + 2, 414, w - 4, 12, [R(a, 8, TEKS, True)], rata='c', bungkus=False)
        k.teks(cx - w / 2 + 3, 427, w - 6, 34, [R(b, 7.5, TEKS3)], rata='c', jangkar='t')
    kartu(k, 43.2, 466, 206.1, '16.45 WIB', 'Peringatan berakhir, 2 jam 24 menit sejak gempa', False)
    kartu(k, 254.3, 466, 206.1, '4 stasiun', 'Mencatat tsunami 0,3 sampai 0,6 m', True)
    # tabel zona
    kol = [('', 122, 'l'), ('', 58, 'c'), ('', 58, 'c'), ('', 48, 'c'), ('', 159.5, 'l')]
    baris = []
    for kp in ('32', '36'):
        baris.append(('prov', PROV[kp]))
        for z in (z for z in ZONA if z[1] == kp):
            ter = (('runs', [R(f'{z[5][0]} pukul {z[5][1]}', 8.6, MERAH if z[5][0] == '0,6 m' else TEKS, True), '\n', R(z[6], 7.5, TEKS3)])
                   if z[5] else ('runs', [R('Tidak teramati', 8.6, TEKS, True), '\n', R(z[6], 7.5, TEKS3)]))
            baris.append(('data', [('runs', [R(z[0], 8.6, TEKS, True)]), ('pil', z[2], False, 8), ('pil', z[3], False, 8), z[4], ter]))
    baris = [b if b[0] != 'data' else ('data', b[1], 31) for b in baris]
    yb = tabel(k, 471.3, 101, kol, baris, kepala=24, pt=8.6)
    kepala2(k, 471.3, 101, kol, ['ZONA', 'PD-1|14.26', 'PD-2|14.32', 'PERKIRAAN|TIBA', 'TERAMATI (TINGGI, WAKTU WIB)|DAN STASIUN'], 24)
    kol = [('', 180, 'l'), ('', 106, 'c'), ('', 159.5, 'c')]
    baris = [('data', [('runs', [R(a, 8.6, TEKS, True)]), f0(b), c]) for a, b, c in EVAK]
    baris.append(('total', ['Total warga pesisir mengungsi', f0(sum(r[1] for r in EVAK)), '']))
    tabel(k, 471.3, yb + 10, kol, baris, kepala=18, pt=8.6)
    kepala2(k, 471.3, yb + 10, kol, ['EVAKUASI SAAT PERINGATAN', 'JIWA', 'KEMBALI KE RUMAH (WIB)'], 18)


# ======================================================================== slide 3: dampak per kab/kota
def s_dampak(Dk):
    md, lb, lr, hl, ung, rb, rs, rr, sk, fk, ib = TOT
    # pemilik 13 Nov: judul dan heading tidak diawali angka
    s, k = Dk.slide(judul(f'Gempa menewaskan [{md}] jiwa dan [{hl}] jiwa hilang; [{f0(ung)}] jiwa mengungsi dan '
                          f'[{f0(rb + rs + rr)}] rumah rusak di [{len(DAMPAK)}] kab/kota per H+30 jam'))
    KR = [(md, 'Meninggal dunia (jiwa)', True), (lb + lr, f'Luka: {lb} berat, {lr} ringan', True), (hl, 'Hilang (jiwa)', True),
          (f0(ung), 'Mengungsi (jiwa)', True), (f0(rb + rs + rr), f'Rumah rusak; {rb} rusak berat', False),
          (sk + fk + ib, 'Fasilitas umum rusak', False)]
    w = 873.6 / len(KR)
    for i, (v, l, m) in enumerate(KR):
        kartu(k, 43.2 + i * w + (2 if i else 0), 101, w - 4, v, l, m)
    kol = [('', 104, 'l'), ('', 30, 'c'), ('', 46, 'c'), ('', 38, 'c'), ('', 40, 'c'), ('', 38, 'c'), ('', 52, 'c'),
           ('', 42, 'c'), ('', 42, 'c'), ('', 42, 'c'), ('', 42, 'c'), ('', 38, 'c'), ('', 38, 'c'), ('', 281.6, 'l')]
    baris = []
    for kp in ('32', '36'):
        baris.append(('prov', PROV[kp]))
        for r in (r for r in DAMPAK if KP_DAMPAK[r[0]] == kp):
            m = band(MAKS[(kp, r[0])])
            baris.append(('data', [('runs', [R(r[0], 8.6, TEKS, True)]), ROMAWI[m]] + [f0(v or None) for v in r[1:12]]
                          + [rt(r[12], 7.5)]))
    baris.append(('total', [f'Total {len(DAMPAK)} kab/kota', ''] + [f0(v) for v in TOT] + ['']))
    yb = tabel(k, 43.2, 139, kol, baris, kepala=30, pt=8.6, maks=22, bawah=398)
    kepala2(k, 43.2, 139, kol, ['KAB/KOTA', 'MMI', 'MENINGGAL|DUNIA', 'LUKA|BERAT', 'LUKA|RINGAN', 'HILANG', 'MENGUNGSI|(JIWA)',
                                'RUMAH|RUSAK|BERAT', 'RUMAH|RUSAK|SEDANG', 'RUMAH|RUSAK|RINGAN', 'SEKOLAH|RUSAK', 'FASKES|RUSAK',
                                'IBADAH|RUSAK', 'AKSES DAN LAYANAN DASAR'], 30)
    y = yb + 10
    kol = [('', 200, 'l'), ('', 110, 'l'), ('', 119.8, 'c')]
    baris = [('data', [('runs', [R(a, 8.6, TEKS, True)]), b, f0(c)], 24) for a, b, c in UNGSI_LOKASI]
    tabel(k, 43.2, y, kol, baris, kepala=18, pt=8.6)
    kepala2(k, 43.2, y, kol, ['LOKASI PENGUNGSIAN TERBESAR', 'KAB/KOTA', 'PENGUNGSI (JIWA)'], 18)
    kol = [('', 140, 'l'), ('', 66, 'l'), ('', 223.8, 'l')]
    baris = [('data', [('runs', [R(a, 8.6, TEKS, True)]), b, rt(c, 8)], 24) for a, b, c in FASKRIT]
    tabel(k, 487, y, kol, baris, kepala=18, pt=8.6)
    kepala2(k, 487, y, kol, ['FASILITAS PENTING TERDAMPAK', 'KAB/KOTA', 'KONDISI'], 18)


# ======================================================================== slide 4: gempa susulan
def s_susulan(Dk):
    n = sum(SUSUL_3J)
    p6 = PELUANG[6.0][1] * 100
    s, k = Dk.slide(judul(f'Tercatat [{n}] gempa susulan sampai H+30 jam dengan yang terbesar [M5,3]; peluang susulan M6 ke atas '
                          f'dalam 7 hari [{angka(p6)}%]'))
    kepala_panel(k, 43.2, 102, 418, 'Gempa susulan M3 ke atas per 3 jam', 'gempa')
    x0, y0, W, H = 70, 152, 380, 262
    mx = max(SUSUL_3J)
    skala = H / (math.ceil(mx / 10) * 10)
    for v in range(0, math.ceil(mx / 10) * 10 + 1, 10):
        y = y0 + H - v * skala
        k.garis_datar(x0, x0 + W, y, GARIS if v else TEKS, 0.5 if v else 0.75)
        k.teks(x0 - 26, y - 6, 22, 12, [R(str(v), 7, TEKS3)], rata='r', bungkus=False)
    bw = W / len(SUSUL_3J)
    for i, v in enumerate(SUSUL_3J):
        h = v * skala
        k.kotak(x0 + i * bw + 5, y0 + H - h, bw - 10, h, ORANYE if i == 1 else BIRU_ABU)
        k.teks(x0 + i * bw, y0 + H - h - 13, bw, 12, [R(str(v), 8, ORANYE if i == 1 else TEKS, True)], rata='c', bungkus=False)
        k.teks(x0 + i * bw, y0 + H + 3, bw, 11, [R(f'{i * 3}-{i * 3 + 3}', 7.5, TEKS3, True)], rata='c', bungkus=False)
    k.teks(x0, y0 + H + 15, W, 11, [R('Jam sejak gempa utama', 7.5, TEKS3)], rata='c', bungkus=False)
    # catatan susulan terbesar
    bx = x0 + bw * 1 + bw / 2
    k.garis(bx, y0 + H - SUSUL_3J[1] * skala - 15, bx + 60, y0 + 28, '7A8699', 0.75)
    k.bulat(bx + 60, y0 + 18, 150, 22, MUDA_API, ORANYE, radius=4)
    k.teks(bx + 64, y0 + 18, 144, 22, [R('M5,3 pukul 17.48, kedalaman 18 km', 8, ORANYE, True)], rata='c', bungkus=False)
    kartu(k, 43.2, 468, 206.1, f'{n} kali', 'Gempa susulan M3 ke atas sampai H+30 jam', False)
    kartu(k, 254.3, 468, 206.1, '9 kali', 'Susulan yang dirasakan warga (MMI III ke atas)', True)
    # peluang
    kepala_panel(k, 498.8, 102, 418, 'Peluang gempa susulan sejak H+30 jam', 'peringatan')
    kol = [('', 118, 'l'), ('', 80, 'c'), ('', 80, 'c'), ('', 140, 'l')]
    ARTI = {4.0: 'Dirasakan kuat di pesisir selatan; warga bisa panik', 5.0: 'Bisa merobohkan rumah yang sudah retak', 6.0: 'Bisa menambah kerusakan dan memicu longsor',
            6.8: 'Sama besar atau lebih besar dari gempa utama'}
    baris = [('data', [('runs', [R(f'M{angka(m)} ke atas' if m != 6.8 else 'M6,8 ke atas', 9, TEKS, True)]),
                       ('runs', [R(f'{angka(a * 100)}%', 10, ORANYE if a >= 0.1 else TEKS, True)]),
                       ('runs', [R('di atas 99%' if b > 0.99 else f'{angka(b * 100)}%', 10, ORANYE if b >= 0.1 else TEKS, True)]), rt(ARTI[m], 8.2)], 28)
             for m, (a, b) in PELUANG.items()]
    yb = tabel(k, 498.8, 142, kol, baris, kepala=24, pt=9)
    kepala2(k, 498.8, 142, kol, ['MAGNITUDO', '24 JAM|KE DEPAN', '7 HARI|KE DEPAN', 'ARTI BAGI PENANGANAN'], 24)
    # lima susulan terbesar
    y = yb + 10
    kol = [('', 118, 'l'), ('', 80, 'c'), ('', 80, 'c'), ('', 140, 'c')]
    baris = [('data', [('runs', [R(a, 8.6, TEKS, True)]), ('runs', [R(b, 8.6, ORANYE if b == 'M5,3' else TEKS, True)]), c, d], 18)
             for a, b, c, d in SUSUL_BESAR]
    yb = tabel(k, 498.8, y, kol, baris, kepala=18, pt=8.6)
    kepala2(k, 498.8, y, kol, ['SUSULAN TERBESAR (WIB)', 'MAGNITUDO', 'KEDALAMAN', 'DIRASAKAN (MMI)'], 18)
    # catatan metode dan langkah
    y = yb + 10
    k.bulat(498.8, y, 418, 500 - y, KAB_TINT, radius=4)
    k.teks(508, y + 6, 400, 500 - y - 12, [
        R('Cara menghitung: ', 8.6, NAVY, True),
        R('model Reasenberg dan Jones (1989) dengan parameter model susulan repo '
          f'(a {angka(SUSUL["a"], 2)}, b {angka(SUSUL["b"], 2)}, p {angka(SUSUL["p"], 2)}); jumlah per 3 jam juga angka contoh dari laju '
          'model yang sama. Saat kejadian nyata, grafik diisi dari katalog susulan BMKG.', 8.6, TEKS), '\n',
        R('Langkah: ', 8.6, NAVY, True),
        R('warga tidak kembali ke rumah rusak berat dan rusak sedang sampai diperiksa petugas; tenda didirikan di lapangan terbuka '
          'yang jauh dari tebing; pembaruan peluang disebarkan setiap 12 jam.', 8.6, TEKS)], rata='j', jangkar='m', spasi=1.05)


# ======================================================================== slide 5: status, pengerahan, kebutuhan
def s_penanganan(Dk):
    s, k = Dk.slide(judul(f'Tanggap darurat berlaku di [2] kabupaten; [{f0(PERSONEL)}] personel gabungan melayani '
                          f'[{f0(U)}] pengungsi di pos komando terpadu'))
    kepala_panel(k, 43.2, 102, 418, 'Status darurat dan pos komando', 'tanggap-darurat')
    kol = [('', 110, 'l'), ('', 98, 'c'), ('', 100, 'c'), ('', 110, 'l')]
    baris = [('data', [('runs', [R(a, 8.6, TEKS, True)]), ('pil', b, False, 8), rt(c, 7.8), rt(d, 7.8)], 22) for a, b, c, d in STATUS]
    yb = tabel(k, 43.2, 138, kol, baris, kepala=18, pt=8.6)
    kepala2(k, 43.2, 138, kol, ['WILAYAH', 'STATUS', 'MASA BERLAKU', 'POS KOMANDO'], 18)
    kol = [('', 120, 'l'), ('', 56, 'c'), ('', 242, 'l')]
    baris = [('data', [('runs', [R(a, 8.6, TEKS, True)]), f0(b), rt(c, 7.8)]) for a, b, c in UNSUR]
    baris.append(('total', [f'Total {len(UNSUR)} unsur', f0(PERSONEL), '']))
    tabel(k, 43.2, yb + 10, kol, baris, kepala=18, pt=8.6)
    kepala2(k, 43.2, yb + 10, kol, ['UNSUR YANG DIKERAHKAN', 'PERSONEL', 'TUGAS UTAMA'], 18)
    kepala_panel(k, 498.8, 102, 418, f'Kebutuhan prioritas untuk {f0(U)} pengungsi', 'pengungsi')
    kol = [('', 124, 'l'), ('', 90, 'c'), ('', 144, 'l'), ('', 60, 'c')]
    baris = [('data', [('runs', [R(a, 8.6, TEKS, True)]), ('runs', [R(b, 8.6, TEKS, True)]), rt(c, 7.8), ('pil', d, False, 8)])
             for a, b, c, d in KEB]
    yb = tabel(k, 498.8, 138, kol, baris, kepala=18, pt=8.6, maks=24, bawah=372)
    kepala2(k, 498.8, 138, kol, ['KEBUTUHAN', 'JUMLAH', 'DASAR HITUNG', 'STATUS'], 18)
    kol = [('', 112, 'l'), ('', 234, 'l'), ('', 72, 'c')]
    baris = [('data', [('runs', [R(a, 8.6, TEKS, True)]), rt(b, 8), c]) for a, b, c in TIBA]
    tabel(k, 498.8, yb + 10, kol, baris, kepala=18, pt=8.6)
    kepala2(k, 498.8, yb + 10, kol, ['BANTUAN SUDAH TIBA', 'ISI', 'TIBA'], 18)


# ======================================================================== slide 6: rencana 72 jam
def s_rencana(Dk):
    semua = [x for _, _, _, it in RENCANA for x in it]
    sel = sum(1 for x in semua if x[2] == 'Selesai')
    s, k = Dk.slide(judul(f'Rencana 72 jam: [{sel}] dari [{len(semua)}] langkah selesai sampai H+30 jam; verifikasi rumah rusak '
                          'dituntaskan sebelum H+72'))
    w = (873.6 - 2 * 14) / 3
    for i, (kap, sampai, ikon, item) in enumerate(RENCANA):
        x = 43.2 + i * (w + 14)
        kepala_panel(k, x, 102, w, f'{kap}, {sampai}', ikon)
        kol = [('', w - 70, 'l'), ('', 70, 'c')]
        baris = [('data', [('runs', [R(a, 9.5, TEKS, True), '\n', R(b, 8, TEKS3)]), ('pil', c, False, 8.5)]) for a, b, c in item]
        tabel(k, x, 140, kol, baris, kepala=18, pt=8.6, maks=70)
        kepala2(k, x, 140, kol, ['LANGKAH DAN PENANGGUNG JAWAB', 'STATUS'], 18)


# ======================================================================== rakit
def main():
    print('MMI maks:', {kk[1]: round(m, 2) for kk, m in sorted(MAKS.items(), key=lambda t: -t[1])[:10]})
    print('susulan per 3 jam:', SUSUL_3J, 'peluang:', {m: (round(a, 4), round(b, 4)) for m, (a, b) in PELUANG.items()})
    print('total dampak:', TOT)
    Dk = Deck()
    s_guncangan(Dk)
    s_tsunami(Dk)
    s_dampak(Dk)
    s_susulan(Dk)
    s_penanganan(Dk)
    s_rencana(Dk)
    isi = os.path.join(SINI, f'{NAMA}.pptx')
    Dk.I.simpan(isi)
    if '--isi' in sys.argv:
        print('isi saja:', isi); return
    sb = {1: SIM + 'model guncangan Zhao 2006 dan Worden 2012 (scripts/gempa/guncangan.py); penduduk WorldPop 2026 per kecamatan',
          2: SIM + 'format buletin peringatan dini tsunami BMKG InaTEWS (PD-1 sampai PD-4)',
          3: SIM + 'format laporan kaji cepat BPBD dan Pusdalops BNPB',
          4: SIM + 'model Reasenberg dan Jones dengan parameter public/gempa/data/model_susulan.json',
          5: SIM + 'standar minimum Sphere untuk dasar hitung kebutuhan',
          6: SIM + 'format rencana operasi tanggap darurat BNPB'}
    bag_hal = {1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3}
    susun = [{'jenis': 'sampul'}, {'jenis': 'daftar-isi'}]
    susun += [{'halaman': n, 'bagian': bag_hal[n], 'sumber': sb[n]} for n in range(1, 7)]
    foto = os.path.join(SINI, 'bahan', 'sampul.jpg').replace(os.sep, '/')
    kredit = 'Foto: Ungkeito, CC BY-SA 4.0, Wikimedia Commons'
    susun.append({'jenis': 'penutup', 'layout': 'putih', 'foto': [foto], 'kredit': kredit})
    tetap = {}
    for no, b in enumerate(susun, 1):
        if b.get('bagian'):
            tetap.setdefault(b['bagian'], []).append(no)
    bagian = [{'judul': j, 'label': j} for j in ('Gempa dan peringatan tsunami', 'Dampak dan gempa susulan',
                                                 'Penanganan dan rencana tiga hari')]
    for n, b in enumerate(bagian, 1):
        b['halaman_tetap'] = tetap[n]
    sys.path.insert(0, os.path.join(LB, 'generator'))
    import lewat_deck
    keluar = lewat_deck.bingkai(
        isi, 'kajian', 'Laporan Insidental Gempa Bumi dan Tsunami (Simulasi)',
        'Kejadian contoh: Gempa M6,8 Selatan Jawa Barat, data contoh untuk uji format', date(2026, 11, 9),
        foto=([foto], kredit), penyaji={'nama': 'Tim Ahli dan Tim Sus IT BNPB', 'jabatan': 'Badan Nasional Penanggulangan Bencana'},
        kepada='Disampaikan kepada Kepala Badan Nasional Penanggulangan Bencana', bagian=bagian, susun=susun,
        spek_tambah={'panel_sisi': 'gelap', 'subjek_dokumen': 'Laporan Insidental Gempa Bumi dan Tsunami (Simulasi)',
                     'skala_logo_bnpb': 1.1})
    print(keluar)


if __name__ == '__main__':
    main()
