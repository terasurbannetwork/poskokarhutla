"""Paparan "Laporan Situasi dan Kondisi Wilayah Terdampak Banjir dan Tanah Longsor" sepekan 2 s.d. 8 Nov 2026 (dibuat 12 Nov 2026).

Format pemilik 12 Nov 2026: gabungan deck "Paparan Situasi Banjir Sepekan 021126" (sampul, daftar isi, rincian per kab/kota,
penutup) dan slide 1-5 deck "Situasi Banjir dan Bencana Lain 091126 prakiraan 9 Nov" (acuan desain: peta berlabel + tabel,
probabilitas, LogPal, jalur, mitigasi). Slide 2-5 deck 091126 diimpor apa adanya (tanggal paparan sama, 9 Nov 2026).

Data periode = tanggal laphar Dit. Koordalops 2 s.d. 8 Nov 2026 (teks WA laporan pagi 3 s.d. 9 Nov di harian-2026-11-*/wa-koordalops.txt).
Mulai, selesai, dan kabar terakhir = tanggal laphar. Kecamatan = lapkec.json laporan banjir 8 Nov; KK Aceh Barat (2.700) dan
Langkat (laporan terakhir 1 Nov) = deck 091126 dan 021126.

    python buat.py          # isi.pptx -> deck.py (sampul, daftar isi, tab bagian, penutup) -> PPTX + PDF
    python buat.py --isi    # hanya slide isi (cek cepat)
Butuh venv mesin ppt-konsultan (python-pptx, Pillow).
"""
import importlib.util, io, json, os, sys
from datetime import date

from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE
from pptx.util import Pt
from PIL import Image, ImageDraw

SINI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(SINI, '..', '..', '..', '..', '..'))
LB = os.path.join(REPO, 'data', 'laporan-bnpb')
D091 = os.path.join(REPO, 'data', 'kajian-bnpb', 'keluaran', 'final', 'Situasi Banjir dan Bencana Lain 091126 prakiraan 9 Nov bersih.pptx')
GEO = os.path.join(REPO, 'public', 'geo', 'kabupaten')

# alat gambar deck 021126 (Kanvas, R, ikon, Isi); ikon ditulis ke folder ini
_sp = importlib.util.spec_from_file_location('buat0211', os.path.join(LB, 'mingguan/2026-11-02/banjir', 'buat.py'))
B = importlib.util.module_from_spec(_sp); _sp.loader.exec_module(B)
B.SINI = SINI
os.makedirs(os.path.join(SINI, 'bahan', 'ikon'), exist_ok=True)
R, ikon, Kanvas = B.R, B.ikon, B.Kanvas
sys.path.insert(0, os.path.join(LB, 'generator'))

# ---- warna (tema proyek-bnpb; sama dengan deck 091126)
TEKS, NAVY, ORANYE, MERAH, PUTIH = '1A1A1A', '051C2C', 'D9600B', 'C8102E', 'FFFFFF'
BIRU, BIRU_TUA, PITA_BIRU, PITA_MERAH, KAB_TINT = '68A8E0', '1B5A93', 'DCEBF8', 'F8DDE0', 'EEF5FC'
GARIS_PANAH, GARIS_INSET, TEKS3, GARIS = '7A8699', 'CBD3DE', '6B7280', 'BFC5CC'
DARAT, BATAS = (0xDC, 0xE3, 0xEB, 255), (255, 255, 255, 255)
RGB = lambda h: tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (255,)

D = None

# ======================================================================== konfigurasi minggu (pemilik 16 Nov 2026: format dipakai tiap minggu)
# Minggu lain cukup menimpa MINGGU, BANJIR, LONGSOR, UNGSI (dan bila perlu POS_*, EXT_SUM, PANEL) lalu memanggil main();
# contoh: mingguan/2026-11-16/banjir-longsor/buat.py.
MINGGU = {
    'awal': date(2026, 11, 2), 'akhir': date(2026, 11, 8), 'paparan': date(2026, 11, 9),
    'nama': 'Paparan Situasi Banjir dan Longsor Sepekan 091126',
    'impor_091': True,              # bagian Probabilitas banjir + Mitigasi dari deck 091126 (tanggal paparan sama)
    'catatan_longsor': 'Simalungun melaporkan dua kejadian: 31 Okt dan 6 Nov 2026',
    'catatan_sumber': '',           # mis. laporan harian yang tidak tersedia
}
BLN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']


def tgl_p(d):
    return f'{d.day} {BLN[d.month][:3].replace("Okt", "Okt")}'


def tgl_l(d):
    return f'{d.day} {BLN[d.month]} {d.year}'


def periode():
    a, b = MINGGU['awal'], MINGGU['akhir']
    return f'{a.day} s.d. {tgl_l(b)}' if a.month == b.month else f'{a.day} {BLN[a.month]} s.d. {tgl_l(b)}'


def sumber():
    a, b = MINGGU['awal'], MINGGU['akhir']
    s = f'Laporan Dit. Koordalops BNPB, laporan harian {a.day} s.d. {tgl_p(b)} {b.year}'
    return s + (f'; {MINGGU["catatan_sumber"]}' if MINGGU['catatan_sumber'] else '')


def f0(v):
    return '–' if v in (None, '') else f'{int(v):,}'.replace(',', '.')


# ======================================================================== data
# (prov, kab, kecamatan, mulai, selesai|None, kk, jiwa, ungsi_kk, ungsi_jiwa, tinggi, kabar, kondisi_teks)
BANJIR = [
    ('Aceh', 'Pidie Jaya', 'Meurah Dua, Meureudu, Bandar Dua, Bandar Baru, Panteraja', '31 Okt', None, 4969, 16774, 4, D, D, '5 Nov',
     'Genangan kecil dan lumpur masih ada; tanggul jebol di Dayah Usen dan Mayang Cut'),
    ('Aceh', 'Kota Subulussalam', 'Sultan Daulat, Rundeng, Longkib', '24 Okt', '4 Nov', 2255, D, 32, D, D, '4 Nov',
     'Banjir sudah surut; pengungsi kembali ke rumah'),
    ('Aceh', 'Gayo Lues', 'Dabun Gelang, Blangkejeren', '28 Okt', '30 Okt', 373, 1261, D, 50, D, '8 Nov',
     'Surut; 8 Nov: 5 rumah hanyut, 100 rumah rusak berat, pembersihan berjalan'),
    ('Aceh', 'Aceh Selatan', 'Trumon Tengah, Trumon', '28 Okt', '5 Nov', 222, 794, 62, 220, '10-35 cm', '6 Nov',
     'Surut total; pengungsi kembali ke rumah'),
    ('Aceh', 'Aceh Barat', 'Pante Ceureumen, Sungai Mas, Woyla Barat, Woyla, Woyla Timur, Arongan Lambalek, Panton Reu, Kaway XVI, '
     'Meureubo, Johan Pahlawan', '31 Okt', '3 Nov', 2700, D, 147, 645, D, '3 Nov',
     'Surut; 2 jembatan antardesa di Sungai Mas putus'),
    ('Sumatera Utara', 'Langkat', 'Wampu, Sirapit, Besitang, Tanjung Pura', '28 Okt', None, 3157, 12431, 155, 694, D, '1 Nov',
     'Belum ada laporan surut sejak 1 Nov'),
    ('Sumatera Utara', 'Deli Serdang', 'Tanjung Morawa, Lubuk Pakam, Pancur Batu, Patumbak, Percut Sei Tuan', '27 Okt', None, 546, 2199,
     D, D, '5-10 cm', '8 Nov', 'Air berangsur surut; Tanggap Darurat s.d. 9 Nov'),
    ('Sumatera Utara', 'Serdang Bedagai', 'Perbaungan', '29 Okt', '8 Nov', 160, D, D, D, D, '8 Nov', 'Banjir sudah surut'),
    ('Sumatera Utara', 'Mandailing Natal', 'Huta Bargot, Panyabungan Utara, Panyabungan Barat, Panyabungan', '28 Okt', '2 Nov', 418, D,
     214, D, D, '2 Nov', 'Surut; pengungsi kembali ke rumah'),
    ('Sumatera Barat', 'Padang Pariaman', '', '6 Nov', '6 Nov', 133, D, D, D, D, '7 Nov', 'Surut total; 30 ha lahan pertanian terdampak'),
    ('Jawa Timur', 'Lumajang', 'Pasirian, Jatiroto, Tempursari, Pronojiwo, Senduro, Candipuro, Sukodono', '2 Nov', None, 1417, D, D, D, D,
     '4 Nov', 'Banjir dan longsor; Siaga Darurat s.d. 30 Jan 2027; buka akses jalan'),
]
KODE = {'Aceh': '11', 'Sumatera Utara': '12', 'Sumatera Barat': '13', 'Jawa Timur': '35', 'Bali': '51'}

# (prov, kab, lokasi, mulai, md, hilang, kk, kerusakan, kondisi_teks, kabar, masih)
LONGSOR = [
    ('Aceh', 'Gayo Lues', 'Jalan lintas Blangkejeren-Kutacane dan Blangkejeren-Blangpidie', '4 Nov', 1, D, D,
     'Jalan lintas lumpuh total; Jembatan Agusen Toa ambruk', 'Jalan belum bisa dilalui kendaraan roda dua dan roda empat', '4 Nov', True),
    ('Sumatera Utara', 'Simalungun', 'Lokasi belum disebut dalam laporan', '31 Okt', D, D, 90,
     '88 rumah terdampak, 2 rumah rusak, 3 ruas jalan terdampak, listrik padam', 'Ditangani pemerintah daerah bersama dinas PU, kesehatan, '
     'pendidikan, dan sosial', '2 Nov', True),
    ('Sumatera Utara', 'Simalungun', 'Dusun Batu Holing dan Urung Dolok', '6 Nov', D, D, 65,
     '65 rumah terdampak; material menutup akses jalan', 'Pembersihan material longsor yang menutup akses jalan', '6 Nov', True),
    ('Jawa Timur', 'Malang', 'Desa Sumberbening; wilayah Gandusari dan Tirtoyudo', '1 Nov', D, D, 24,
     '24 rumah, 14 akses jalan, 1 jembatan rusak, 1 titik jaringan listrik', 'Pembersihan material dengan ekskavator; perbaikan tiang '
     'listrik PLN', '3 Nov', True),
    ('Jawa Timur', 'Lumajang', 'Lokasi belum disebut dalam laporan', '2 Nov', 2, D, 1, '1 rumah terdampak',
     'Korban dievakuasi warga dan sudah dimakamkan', '2 Nov', False),
    ('Bali', 'Badung', 'Desa Pelaga', '2 Nov', D, 2, D, 'Dalam pendataan BPBD',
     'Pencarian 2 korban oleh Tim SAR gabungan masih berlangsung', '7 Nov', True),
]


# pengungsian (lampiran L3, pola L2 deck 021126): (prov, kab, jenis, masih, kk, jiwa, lokasi pengungsian dan asal, kabar terakhir)
# masih = banjir belum dilaporkan surut / longsor masih ditangani. Angka = laporan terakhir yang memuatnya; yang sudah pulang tetap dicatat.
UNGSI = [
    ('Aceh', 'Pidie Jaya', 'banjir', True, 4, D, 'Gampong Dayah Usen; tempat pengungsian belum disebut', '5 Nov'),
    ('Aceh', 'Kota Subulussalam', 'banjir', False, 32, D, 'Lokasi belum disebut; sudah kembali ke rumah', '4 Nov'),
    ('Aceh', 'Gayo Lues', 'banjir', False, D, 50, 'Masjid An-Nur Desa Badak, Kec. Dabun Gelang', '2 Nov'),
    ('Aceh', 'Aceh Selatan', 'banjir', False, 62, 220, 'Lokasi belum disebut; sudah kembali ke rumah', '6 Nov'),
    ('Aceh', 'Aceh Barat', 'banjir', False, 147, 645, 'Lokasi belum disebut; sudah kembali ke rumah', '3 Nov'),
    ('Sumatera Utara', 'Langkat', 'banjir', True, 155, 694, 'Posko pengungsian Desa Sekoci; asal Desa Sekoci, Kec. Besitang', '29 Okt'),
    ('Sumatera Utara', 'Mandailing Natal', 'banjir', False, 214, D, 'Lokasi belum disebut; sudah kembali ke rumah', '2 Nov'),
    ('Jawa Timur', 'Lumajang', 'banjir', True, D, D, 'Rumah sanak saudara; jumlah belum dilaporkan', '4 Nov'),
]


def lama(mulai, selesai):
    """Hari kalender sejak mulai sampai surut (atau akhir periode bila belum surut), dihitung inklusif seperti deck 021126.
    Mulai tidak diketahui (kejadian hanya muncul sebagai pengkinian) = None, tampil '–'."""
    if not mulai:
        return None
    bl = {'Okt': 10, 'Nov': 11, 'Des': 12}
    d = lambda s: date(2026, bl[s.split()[1]], int(s.split()[0]))
    return ((d(selesai) if selesai else MINGGU['akhir']) - d(mulai)).days + 1


def n_kec(r):
    return len(r[2].split(', ')) if r[2] else None


# ======================================================================== peta
_GEO = {}


def geo(kp):
    if kp not in _GEO:
        p = os.path.join(GEO, f'{kp}.json')
        _GEO[kp] = json.load(open(p, encoding='utf-8'))['features'] if os.path.exists(p) else []
    return _GEO[kp]


def cincin(f):
    g = f['geometry']
    return g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]


def pusat(kp, kab):
    """Titik jangkar: centroid luas poligon terbesar kab/kota."""
    f = next(f for f in geo(kp) if f['properties']['kab'] == kab)
    best = max((poly[0] for poly in cincin(f)), key=lambda r: abs(_luas(r)))
    a = _luas(best); cx = cy = 0
    for (x0, y0), (x1, y1) in zip(best, best[1:] + best[:1]):
        c = x0 * y1 - x1 * y0; cx += (x0 + x1) * c; cy += (y0 + y1) * c
    return cx / (6 * a), cy / (6 * a)


def _luas(r):
    return sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(r, r[1:] + r[:1])) / 2


def gambar_peta(path, ext, px, warna, provinsi, garis=2, kotak=None):
    """ext = (lon0, lon1, lat_atas, lat_bawah); warna = {(kode_prov, kab): hex}; latar transparan seperti peta deck 091126."""
    lon0, lon1, la1, la0 = ext; W, H = px
    pr = lambda x, y: ((x - lon0) / (lon1 - lon0) * W, (la1 - y) / (la1 - la0) * H)
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dr = ImageDraw.Draw(im)
    lapis = []
    for kp in provinsi:
        for f in geo(kp):
            w = warna.get((kp, f['properties']['kab']))
            lapis.append((1 if w else 0, f, RGB(w) if w else DARAT))
    for _, f, isi in sorted(lapis, key=lambda t: t[0]):
        for poly in cincin(f):
            pts = [pr(x, y) for x, y in poly[0]]
            if max(p[0] for p in pts) < 0 or min(p[0] for p in pts) > W or max(p[1] for p in pts) < 0 or min(p[1] for p in pts) > H:
                continue
            dr.polygon(pts, fill=isi)
            for lubang in poly[1:]:
                dr.polygon([pr(x, y) for x, y in lubang], fill=(0, 0, 0, 0))
            dr.line(pts + pts[:1], fill=BATAS, width=garis)
    if kotak:
        a, b = pr(kotak[0], kotak[2]), pr(kotak[1], kotak[3])
        dr.rectangle([a, b], outline=(5, 28, 44, 255), width=2)
    im.save(path)
    return lambda lon, lat: pr(lon, lat)


SEMUA_PROV = sorted(f[:-5] for f in os.listdir(GEO))
INSET_EXT = (94.8, 141.2, 6.3, -11.2)


# ======================================================================== bingkai slide (tiru 091126)
class Deck:
    def __init__(self):
        self.I = B.Isi()
        s0 = Presentation(D091).slides[0]
        pic = sorted((sh for sh in s0.shapes if sh.shape_type == 13 and sh.top < Pt(60)), key=lambda sh: sh.left)
        self.logo = [(p.image.blob, p.left, p.top, p.width, p.height) for p in pic]   # KRIS, BNPB
        assert len(self.logo) == 2, 'logo KRIS dan BNPB deck 091126 tidak ditemukan'

    def slide(self, judul_runs):
        I = self.I
        s = I.P.slides.add_slide(I.lay)
        for ph in list(s.placeholders):
            ph._element.getparent().remove(ph._element)
        k = Kanvas(s)
        k.teks(43.2, 23.5, 709.7, 65, judul_runs, jangkar='m', spasi=0.95)
        for blob, x, y, w, h in self.logo:
            s.shapes.add_picture(io.BytesIO(blob), x, y, w, h)
        k.garis(43.2, 95, 916.8, 95, TEKS, 0.75)
        I.n += 1
        return s, k


def judul(teks, pt=22):
    """'Terdapat [11] kab/kota ...': bagian dalam [..] oranye."""
    import re
    out = []
    for i, bag in enumerate(re.split(r'\[([^\]]+)\]', teks)):
        if bag:
            out.append(R(bag.replace(' kab/kota', ' kab/kota'), pt, ORANYE if i % 2 else TEKS, True))
    return out


def pil_status(k, x, y, w, h, teks, merah, pt=9.19):
    """Pil kondisi tabel: tint penuh, bulatan berikon di kiri, teks tebal di tengah."""
    sh = k.bulat(x, y, w, h, PITA_MERAH if merah else PITA_BIRU)
    d = h - 3
    k.kotak(x + 1.5, y + 1.5, d, d, MERAH if merah else BIRU, bentuk=MSO_SHAPE.OVAL)
    g = d * 0.64
    k.gambar(ikon('peringatan' if merah else 'rumah'), x + 1.5 + (d - g) / 2, y + 1.5 + (d - g) / 2, g, g)
    k.teks(x + d + 2, y, w - d - 4, h, [R(teks, pt, TEKS, True)], rata='c', bungkus=False)


def kartu(k, x, y, w, nilai, label, merah, warna=None):
    """warna = (tint, bulat, konsep ikon) untuk kartu selain merah/biru (mis. Awas dan Siaga prakiraan)."""
    tint, bulat, konsep = warna or ((PITA_MERAH, MERAH, 'peringatan') if merah else (PITA_BIRU, BIRU, 'rumah'))
    k.bulat(x, y, w, 30, tint, radius=4)
    k.kotak(x + 5, y + 6, 18, 18, bulat, bentuk=MSO_SHAPE.OVAL)
    k.gambar(ikon(konsep), x + 8.2, y + 9.2, 11.5, 11.5)
    k.teks(x + 28, y + 3, w - 30, 14, [R(str(nilai), 12, NAVY, True)], bungkus=False)
    k.teks(x + 28, y + 17, w - 30, 10, [R(label, 7, TEKS)], bungkus=False)


def label_peta(k, x, y, nama, status, merah, titik):
    """Label pil + garis penunjuk dari sisi pil terdekat ke titik kab/kota (pola deck 091126). Lebar pil dikalibrasi ke deck 091126
    ('Pidie Jaya  Belum surut' = 110,9 pt)."""
    lebar = (len(nama) * 9 + len(status) * 7.5) * 0.53 + 26   # 12 Nov: 0,47 membuat status terbungkus di render LibreOffice
    tx, ty = titik
    if x + lebar > 461:   # label tidak boleh masuk kolom tabel
        x = 461 - lebar
    ax = min(max(tx, x + 8), x + lebar - 8) if not (x <= tx <= x + lebar) or not (y <= ty <= y + 15.8) else tx
    ax = x + lebar if tx > x + lebar else x if tx < x else ax
    ay = y + 7.9 if (tx < x or tx > x + lebar) else (y + 15.8 if ty > y + 15.8 else y)
    if abs(ax - tx) + abs(ay - ty) > 4:
        k.garis(ax, ay, tx, ty, GARIS_PANAH, 0.75)
    k.bulat(x, y, lebar, 15.8, PITA_MERAH if merah else PITA_BIRU)
    k.kotak(x + 2.2, y + 2.2, 11.5, 11.5, MERAH if merah else BIRU, bentuk=MSO_SHAPE.OVAL)
    k.gambar(ikon('peringatan' if merah else 'rumah'), x + 4, y + 4, 7.9, 7.9)
    k.teks(x + 17.3, y, lebar - 18, 15.8, [R(nama, 9, TEKS, True), R('  ' + status, 7.5, MERAH if merah else BIRU_TUA, True)], bungkus=False)
    k.kotak(tx - 2.5, ty - 2.5, 5, 5, PUTIH, TEKS, bentuk=MSO_SHAPE.OVAL)


def unsur_peta(k, km_pt):
    """Panah utara dan skala 100 km di kiri bawah peta."""
    k.kotak(54, 414, 8.6, 12.2, NAVY, bentuk=MSO_SHAPE.ISOSCELES_TRIANGLE)
    k.teks(46.8, 427, 23, 9.4, [R('U', 8, NAVY, True)], rata='c', bungkus=False)
    k.garis(82.8, 432, 82.8 + km_pt, 432, NAVY, 1.0)
    k.teks(82.8, 419, max(42, km_pt), 10.8, [R('100 km', 8, NAVY, True)], rata='c', bungkus=False)


def inset(k, png, x=165.6, y=375.8):
    k.bulat(x, y, 122.4, 60.7, PUTIH, GARIS_INSET, radius=3)
    k.teks(x + 5, y + 2.2, 115, 10.8, [R('Se-Indonesia', 7.5, TEKS, True)], bungkus=False)
    k.gambar(png, x + 3.6, y + 13.7, 115.2, 43.4)
    return lambda p: (x + 3.6 + p[0] / 1000 * 115.2, y + 13.7 + p[1] / 377 * 43.4)


# ---- tabel bergaya 091126: kepala navy membulat, pita provinsi biru muda, garis baris, subtotal, total navy
def tabel(k, x, y, kol, baris, bawah=500, pt=9.19, kepala=16.6, maks=26, minh=18):
    """kol = [(judul, lebar, rata)]; baris = ('prov', teks) | ('data', sel, h?) | ('sub', sel) | ('total', sel).
    sel: teks | ('pil', teks, merah) | ('runs', runs). Tinggi baris data dibagi rata sampai `bawah` kecuali diberi h."""
    W = sum(c[1] for c in kol)
    xs = [x]
    for c in kol:
        xs.append(xs[-1] + c[1])
    k.bulat(x, y, W, kepala, NAVY, radius=3)
    for (j, w, rata), cx in zip(kol, xs):
        k.teks(cx, y, w, kepala, [R(j, 7.5, PUTIH, True, 0.6)], rata=rata, kiri=8 if rata == 'l' else 1, kanan=1, bungkus=False)
    yy = y + kepala
    tetap = {'prov': 14.4, 'sub': 18.7, 'total': 21.6}
    h_tetap = sum(tetap[b[0]] for b in baris if b[0] in tetap) + sum(b[2] for b in baris if b[0] == 'data' and len(b) > 2)
    bebas = [b for b in baris if b[0] == 'data' and len(b) == 2]

    def perlu(b):   # tinggi minimum dari teks terpanjang yang membungkus (taksiran baris Roboto deck 021126)
        n = 1
        for (j, w, rata), s in zip(kol, b[1]):
            if isinstance(s, tuple) and s[0] == 'runs':
                par, m = [[]], 0
                for r in s[1]:
                    if r == '\n': par.append([])
                    else: par[-1].append(r)
                for p in par:
                    if p:
                        m += B.baris_teks(''.join(r[0] for r in p), w - 10, max(r[1] for r in p))
                n = max(n, m)
        return 9.4 * n + 8
    need = {id(b): perlu(b) for b in bebas}
    ruang = bawah - yy - h_tetap
    lebih = max(0, ruang - sum(max(minh, v) for v in need.values())) / max(1, len(bebas))
    tinggi = {i: max(max(minh, v), min(maks, max(minh, v) + lebih)) for i, v in need.items()}
    if sum(tinggi.values()) > ruang + 0.5:
        print(f'PERINGATAN tabel meluap {sum(tinggi.values()) - ruang:.0f} pt', file=sys.stderr)
    for b in baris:
        jenis = b[0]
        if jenis == 'prov':   # ('prov', teks[, warna pita[, (warna bulat, konsep ikon)]])
            k.kotak(x, yy, W, 14.4, b[2] if len(b) > 2 else PITA_BIRU)
            tx = x + 8
            if len(b) > 3:
                k.kotak(x + 5, yy + 1.9, 10.6, 10.6, b[3][0], bentuk=MSO_SHAPE.OVAL)
                k.gambar(ikon(b[3][1]), x + 7, yy + 3.9, 6.6, 6.6)
                tx = x + 20
            k.teks(tx, yy, W - 16, 14.4, [R(b[1], pt, TEKS, True)], bungkus=False)
            yy += 14.4
            continue
        h = tetap.get(jenis) or (b[2] if len(b) > 2 else tinggi[id(b)])
        if jenis == 'sub':
            k.kotak(x, yy, W, h, KAB_TINT)
        if jenis == 'total':
            k.bulat(x, yy, W, h, NAVY, radius=3)
        warna = PUTIH if jenis == 'total' else TEKS
        for (j, w, rata), cx, s in zip(kol, xs, b[1]):
            if s in (None, ''):
                continue
            if isinstance(s, tuple) and s[0] == 'pil':
                ph = min(16.6, h - 4)
                pil_status(k, cx + 2, yy + (h - ph) / 2, w - 4, ph, s[1], s[2], pt=s[3] if len(s) > 3 else pt)
            elif isinstance(s, tuple) and s[0] == 'runs':
                k.teks(cx, yy, w, h, s[1], rata=rata, kiri=8 if rata == 'l' else 2, kanan=3, spasi=0.92)
            else:
                k.teks(cx, yy, w, h, [R(str(s), pt, warna, True)], rata=rata, kiri=8 if rata == 'l' else 2, kanan=2)
        yy += h
        if jenis in ('data', 'sub'):
            k.garis_datar(x, x + W, yy, TEKS, 0.75)
    return yy


# ======================================================================== slide 1: peta banjir
EXT_SUM = (93.6, 102.6, 6.3, -1.0)
PX = (2000, int(2000 * 338 / 418))


def peta_pt(proj):
    return lambda lon, lat: (43.2 + proj(lon, lat)[0] / PX[0] * 418, 102 + proj(lon, lat)[1] / PX[1] * 338)


def ungsi_sel(jiwa, kk):
    """Sel Mengungsi bersatuan (pemeriksa 12 Nov: KK dan jiwa tercampur tanpa satuan). Jiwa didahulukan; KK bila jiwa tidak dilaporkan."""
    return f'{f0(jiwa)} jiwa' if jiwa else f'{f0(kk)} KK' if kk else '–'


def ungsi_jml(jiwa, kk, warna):
    """Subtotal/total Mengungsi: jiwa dan KK (dari kab/kota yang hanya melaporkan KK) tidak dijumlah, ditulis dua baris."""
    bag = [x for x in (f'{f0(jiwa)} jiwa' if jiwa else '', f'{f0(kk)} KK' if kk else '') if x]
    if not bag:
        return '–'
    runs = []
    for i, b in enumerate(bag):
        runs += (['\n'] if i else []) + [R(b, 8, warna, True)]
    return ('runs', runs)


# posisi label peta banjir: kab -> ('k'|'n', y) kiri/kanan peta; kab yang tidak ada diatur otomatis (tata_label)
POS_BANJIR = {'Aceh Barat': ('k', 173), 'Gayo Lues': ('k', 196), 'Aceh Selatan': ('k', 231), 'Kota Subulussalam': ('k', 254.2),
              'Mandailing Natal': ('k', 341.7), 'Lumajang': ('k', 385.2), 'Pidie Jaya': ('n', 141.5), 'Langkat': ('n', 206.8),
              'Deli Serdang': ('n', 229.1), 'Serdang Bedagai': ('n', 251.4), 'Padang Pariaman': ('n', 423.4)}


def sisi_sumatera(lon, lat):
    """'k' bila kab/kota di sebelah barat sumbu Sumatera (garis Aceh barat laut ke Lampung tenggara), selain itu 'n'."""
    return 'k' if lon < 95.6 + (5.6 - lat) * 0.93 else 'n'


def tata_label(titik, sisi):
    """titik = {kab: (x, y)}, sisi = {kab: 'k'|'n'} -> {kab: (sisi, y)}. Label tiap sisi diurut menurut y titiknya, berjarak minimal
    21 pt. Kolom kiri berhenti di atas kotak inset Se-Indonesia (355 pt), kanan di atas kartu (430 pt)."""
    out = {}
    for s_, bawah in (('k', 355), ('n', 430)):
        xs = sorted(((y, kab) for kab, (x, y) in titik.items() if sisi[kab] == s_), key=lambda t: t[0])
        ys = []
        for y, kab in xs:
            ys.append(max(y - 8, 106, (ys[-1] + 21) if ys else 0))
        # lewat batas bawah: dorong naik dari bawah, hanya label yang bertabrakan yang ikut bergeser
        for i in range(len(ys) - 1, -1, -1):
            ys[i] = min(ys[i], bawah if i == len(ys) - 1 else ys[i + 1] - 21)
        out.update({kab: (s_, y) for (_, kab), y in zip(xs, ys)})
    return out


def s_peta_banjir(Dk):
    belum = [r for r in BANJIR if not r[4]]
    t_kk = sum(r[5] or 0 for r in belum)
    kec = f'[{sum(n_kec(r) for r in belum)}] kecamatan, ' if all(n_kec(r) for r in belum) else ''
    s, k = Dk.slide(judul(f'Terdapat [{len(BANJIR)}] kab/kota terdampak banjir pada periode {periode()}; '
                          f'[{len(belum)}] kab/kota ({kec}[{f0(t_kk)}] KK) belum dilaporkan surut'))
    warna = {(KODE[r[0]], r[1]): (MERAH if not r[4] else BIRU) for r in BANJIR}
    png = os.path.join(SINI, 'bahan', 'peta-banjir.png')
    proj = peta_pt(gambar_peta(png, EXT_SUM, PX, warna, ['11', '12', '13', '14', '21', '15', '16', '17', '18']))
    k.gambar(png, 43.2, 102, 418, 338)
    pin = os.path.join(SINI, 'bahan', 'inset-banjir.png')
    pi = gambar_peta(pin, INSET_EXT, (1000, 377), warna, SEMUA_PROV, garis=1, kotak=EXT_SUM)
    ke_inset = inset(k, pin)
    titik, sisi = {}, {}
    for r in BANJIR:
        lon, lat = pusat(KODE[r[0]], r[1])
        di_peta = EXT_SUM[0] <= lon <= EXT_SUM[1] and EXT_SUM[3] <= lat <= EXT_SUM[2]
        titik[r[1]] = proj(lon, lat) if di_peta else ke_inset(pi(lon, lat))   # di luar peta utama: tunjuk ke inset Se-Indonesia
        sisi[r[1]] = sisi_sumatera(lon, lat) if di_peta else 'k'
    pos = dict(tata_label({kb: t for kb, t in titik.items() if kb not in POS_BANJIR}, sisi), **POS_BANJIR)
    for r in BANJIR:
        sisi, yl = pos[r[1]]
        label_peta(k, 43.2 if sisi == 'k' else 320.4, yl, r[1], 'Belum surut' if not r[4] else 'Sudah surut', not r[4], titik[r[1]])
    unsur_peta(k, 100 / 111 * 418 / (EXT_SUM[1] - EXT_SUM[0]))
    kartu(k, 43.2, 446.4, 206.1, len(belum), 'Belum dilaporkan surut (kab/kota)', True)
    kartu(k, 254.3, 446.4, 206.1, len(BANJIR) - len(belum), 'Sudah dilaporkan surut (kab/kota)', False)
    # tabel
    kol = [('KAB/KOTA', 118.9, 'l'), ('KEC.', 22.6, 'c'), ('MULAI', 36, 'c'), ('SELESAI', 40, 'c'), ('KK TERDAMPAK', 68, 'c'),
           ('MENGUNGSI', 62, 'c'), ('KONDISI', 98, 'c')]   # 16 Nov: MULAI/SELESAI dilebarkan, "12 Nov" sempat terbungkus
    baris = []
    tot = [0, 0, 0, 0]
    for prov in dict.fromkeys(r[0] for r in BANJIR):
        rs = [r for r in BANJIR if r[0] == prov]
        baris.append(('prov', prov))
        for r in rs:
            # pengungsi yang hanya dilaporkan dalam KK ditulis "214 KK"; subtotal dan total tetap jumlah jiwa
            baris.append(('data', [r[1], n_kec(r) or '–', r[3] or '–', r[4] or '–', f0(r[5]), ungsi_sel(r[8], r[7]),
                                   ('pil', 'Belum surut' if not r[4] else 'Surut', not r[4])]))
        # jumlah kecamatan hanya bila semua kab/kota melaporkannya (selain itu '–', jumlah sebagian menyesatkan)
        sk, skk = (sum(n_kec(r) for r in rs) if all(n_kec(r) for r in rs) else None), sum(r[5] or 0 for r in rs)
        su, suk = sum(r[8] or 0 for r in rs), sum(r[7] or 0 for r in rs if not r[8])   # KK hanya dihitung bila jiwanya tidak dilaporkan
        tot = [None if sk is None or tot[0] is None else tot[0] + sk, tot[1] + skk, tot[2] + su, tot[3] + suk]
        if len(rs) > 1 and len(BANJIR) <= 12:   # 16 Nov: lebih dari 12 kab/kota, subtotal provinsi dilepas supaya tabel muat
            baris.append(('sub', [f'Subtotal {prov}', sk or '–', '', '', f0(skk), ungsi_jml(su, suk, TEKS), '']))
    baris.append(('total', [f'Total {len(BANJIR)} kab/kota', tot[0] or '–', '', '', f0(tot[1]), ungsi_jml(tot[2], tot[3], PUTIH), '']))
    tabel(k, 471.3, 101, kol, baris, minh=16 if len(BANJIR) > 12 else 18)
    return tot


# ======================================================================== slide 2: peta longsor
# dua panel berskala sama (8,9 derajat selebar 418 pt): Sumatera bagian utara di atas, Jawa Timur dan Bali di bawah
PANEL = [('Aceh dan Sumatera Utara', (94.8, 103.7, 5.95, 2.44), 102, ['11', '12', '13', '14', '21']),
         ('Jawa Timur dan Bali', (109.0, 117.9, -6.2, -9.71), 273, ['33', '34', '35', '51', '52'])]
PANEL_H = 165
LONGSOR_RINGKAS = 3   # sampai sekian kejadian: rincian longsor dimuat di slide peta, lampiran L2 tidak dibuat
# Malaysia tidak digambar, jadi Selat Malaka kosong untuk label Sumatera; label Jawa-Bali di Laut Jawa dan Samudra Hindia
POS_LONGSOR = {'Gayo Lues': (262, 138), 'Simalungun': (300, 196), 'Malang': (150, 286), 'Lumajang': (205, 412), 'Badung': (322, 412)}


def korban(md, hl):
    bag = [f'[{md}] jiwa meninggal dunia' if md else '', f'[{hl}] jiwa hilang' if hl else '']
    return ' dan '.join(b for b in bag if b)


def s_peta_longsor(Dk):
    kab = list(dict.fromkeys((r[0], r[1]) for r in LONGSOR))
    md, hl = sum(r[4] or 0 for r in LONGSOR), sum(r[5] or 0 for r in LONGSOR)
    s, k = Dk.slide(judul(f'Tanah longsor dilaporkan di [{len(kab)}] kab/kota pada periode {periode()}'
                          + (f'; {korban(md, hl)}' if md or hl else '')))
    masih = {(r[0], r[1]) for r in LONGSOR if r[10]}
    warna = {(KODE[p], kb): (MERAH if (p, kb) in masih else BIRU) for p, kb in kab}
    proj = {}
    for i, (nama, ext, y0, provs) in enumerate(PANEL):
        png = os.path.join(SINI, 'bahan', f'peta-longsor-{i + 1}.png')
        px = (2000, int(2000 * PANEL_H / 418))
        f = gambar_peta(png, ext, px, warna, provs)
        k.gambar(png, 43.2, y0, 418, PANEL_H)
        k.teks(43.2, y0 + 1, 200, 11, [R(nama, 7.5, TEKS3, True)], bungkus=False)
        for p, kb in kab:
            lon, lat = pusat(KODE[p], kb)
            if ext[0] <= lon <= ext[1] and ext[3] <= lat <= ext[2]:
                proj[kb] = (lambda f, y0: lambda lon, lat: (43.2 + f(lon, lat)[0] / px[0] * 418, y0 + f(lon, lat)[1] / px[1] * PANEL_H))(f, y0)(lon, lat)
    k.garis_datar(43.2, 461.2, 270, GARIS, 0.5)
    for p, kb in kab:
        m = (p, kb) in masih
        label_peta(k, *POS_LONGSOR[kb], kb, 'Masih ditangani' if m else 'Tertangani', m, proj[kb])
    unsur_peta(k, 100 / 111 * 418 / (PANEL[0][1][1] - PANEL[0][1][0]))
    kartu(k, 43.2, 446.4, 206.1, len(masih), 'Masih ditangani (kab/kota)', True)
    kartu(k, 254.3, 446.4, 206.1, len(kab) - len(masih), 'Tertangani (kab/kota)', False)
    # 12 Nov (pemeriksa: baris terlalu renggang): kolom kab/kota memuat lokasi kejadian di baris kedua
    ringkas = len(LONGSOR) <= LONGSOR_RINGKAS
    if ringkas:   # 16 Nov: kejadian sedikit, kerusakan dan penanganan masuk tabel ini; lampiran L2 tidak dibuat (D-39 ruang kosong)
        kol = [('KAB/KOTA, LOKASI, KERUSAKAN, PENANGANAN', 262.5, 'l'), ('MULAI', 34, 'c'), ('KABAR', 36, 'c'), ('MENINGGAL', 50, 'c'),
               ('HILANG', 34, 'c'), ('KK', 29, 'c')]
    else:
        kol = [('KAB/KOTA DAN LOKASI', 158, 'l'), ('MULAI', 34, 'c'), ('KABAR', 34, 'c'), ('MENINGGAL', 50, 'c'), ('HILANG', 38, 'c'),
               ('KK', 36, 'c'), ('KONDISI', 95.5, 'c')]
    baris = []
    for prov in dict.fromkeys(r[0] for r in LONGSOR):
        baris.append(('prov', prov))
        for r in (r for r in LONGSOR if r[0] == prov):
            if ringkas:
                nama = ('runs', [R(r[1], 11, TEKS, True), '\n', R(r[2], 9.5, TEKS3), '\n', R('Kerusakan: ', 9.5, TEKS, True), R(r[7], 9.5, TEKS),
                                 '\n', R('Masih ditangani. ' if r[10] else 'Tertangani. ', 9.5, MERAH if r[10] else BIRU_TUA, True),
                                 R(r[8], 9.5, TEKS)]
                        + [x for t in (r[11] if len(r) > 11 else []) for x in ('\n', R(t[0] + ': ', 9.5, TEKS, True), R(t[1], 9.5, TEKS))])
                baris.append(('data', [nama, r[3] or '–', r[9], f0(r[4]), f0(r[5]), f0(r[6])]))
            else:
                nama = ('runs', [R(r[1], 9.19, TEKS, True), '\n', R(r[2], 7.5, TEKS3)])
                baris.append(('data', [nama, r[3] or '–', r[9], f0(r[4]), f0(r[5]), f0(r[6]),
                                       ('pil', 'Masih ditangani' if r[10] else 'Tertangani', r[10], 8.6)]))
    baris.append(('total', [f'Total {len(LONGSOR)} kejadian', '', '', md, hl, f0(sum(r[6] or 0 for r in LONGSOR))] + ([] if ringkas else [''])))
    tabel(k, 471.3, 101, kol, baris, maks=150 if ringkas else 46)


# ======================================================================== slide 3-4: rincian (pola deck 021126, gaya 091126)
def kepala_panel(k, x, y, w, teks, konsep, kanan=None):
    k.ikon_bulat(konsep, x, y + 1, 22)
    k.teks(x + 30, y, w - 30, 24, [R(teks, 11, TEKS, True)])
    if kanan:
        k.teks(x + w - 360, y, 360, 24, [R(kanan, 7.5, TEKS3)], rata='r')
    k.garis(x, y + 30, x + w, y + 30, TEKS, 0.75)


def rt(teks, pt=7.5, b=False, w=TEKS):
    return ('runs', [R(teks, pt, w, b)])


def s_rincian_banjir(Dk):
    """L1, satu halaman sampai 11 kab/kota; lebih dari itu dipecah per batas provinsi menjadi (1/2), (2/2) seperti lampiran deck 021126.
    Mengembalikan jumlah halaman."""
    provs = list(dict.fromkeys(r[0] for r in BANJIR))
    if len(BANJIR) <= 11:
        bagi = [provs]
    else:   # potong di batas provinsi yang paling dekat separuh baris
        n, acc, cut = len(BANJIR), 0, 1
        for i, p in enumerate(provs):
            acc += sum(1 for r in BANJIR if r[0] == p)
            if abs(acc - n / 2) < abs(sum(1 for r in BANJIR if r[0] in provs[:cut]) - n / 2):
                cut = i + 1
        bagi = [provs[:cut], provs[cut:]]
    for h, ps in enumerate(bagi, 1):
        _rincian_banjir(Dk, ps, f' ({h}/{len(bagi)})' if len(bagi) > 1 else '')
    return len(bagi)


def _rincian_banjir(Dk, provs, hal):
    # pemilik 16 Nov 2026: judul lampiran dibuat to the point (bukan kalimat temuan)
    s, k = Dk.slide(judul(f'L1. Rincian [{len(BANJIR)}] kab/kota terdampak banjir{hal}'))
    kepala_panel(k, 43.2, 102, 873.6, 'Banjir sepekan per kab/kota', 'banjir',
                 f'Lama = hari sejak banjir mulai sampai surut, atau sampai {tgl_l(MINGGU["akhir"])} bila belum surut'
                 + ('; "–" = tanggal mulai tidak tercantum' if any(not r[3] for r in BANJIR) else ''))
    kol = [('KAB/KOTA', 104, 'l'), ('KECAMATAN TERDAMPAK', 214, 'l'), ('MULAI', 34, 'c'), ('LAMA', 30, 'c'), ('KK', 40, 'c'),
           ('JIWA', 42, 'c'), ('MENGUNGSI', 70, 'c'), ('TINGGI AIR', 50, 'c'), ('KONDISI TERAKHIR', 210.6, 'l'), ('KABAR', 39, 'c'),
           ('', 40, 'c')]
    kol = kol[:-1]
    kol[-2] = ('KONDISI TERAKHIR', 250.6, 'l')
    baris = []
    for prov in provs:
        baris.append(('prov', prov))
        for r in (r for r in BANJIR if r[0] == prov):
            ung = ' / '.join(x for x in (f'{f0(r[7])} KK' if r[7] else '', f'{f0(r[8])} jiwa' if r[8] else '') if x) or '–'
            kec = r[2] or 'Kecamatan belum disebut dalam laporan'
            baris.append(('data', [('runs', [R(r[1], 8.5, TEKS, True)]), rt(kec), r[3] or '–', f0(lama(r[3], r[4])), f0(r[5]), f0(r[6]), rt(ung, 7.5),
                                   r[9] or '–', ('runs', [R('Belum dilaporkan surut. ' if not r[4] else f'Surut {r[4]}. ', 7.5, MERAH if not r[4] else BIRU_TUA, True),
                                                          R(r[11], 7.5, TEKS)]), r[10]]))
    tabel(k, 43.2, 140, kol, baris, bawah=500, pt=8, maks=48 if hal else 26)   # halaman pecahan berisi lebih sedikit baris


def s_rincian_longsor(Dk):
    # pemilik 13 Nov: judul dan heading tidak diawali angka
    s, k = Dk.slide(judul(f'L2. Rincian [{len(LONGSOR)}] kejadian tanah longsor'))   # pemilik 16 Nov: judul lampiran to the point
    kepala_panel(k, 43.2, 102, 873.6, 'Tanah longsor sepekan per kejadian', 'longsor', MINGGU['catatan_longsor'] or None)
    kol = [('KAB/KOTA', 92, 'l'), ('LOKASI', 158, 'l'), ('MULAI', 36, 'c'), ('MENINGGAL', 52, 'c'), ('HILANG', 40, 'c'), ('KK', 34, 'c'),
           ('KERUSAKAN', 186, 'l'), ('PENANGANAN TERAKHIR', 196.6, 'l'), ('KABAR', 40, 'c'), ('', 39, 'c')]
    kol = kol[:-1]
    kol[-2] = ('PENANGANAN TERAKHIR', 235.6, 'l')
    baris = []
    for prov in dict.fromkeys(r[0] for r in LONGSOR):
        baris.append(('prov', prov))
        for r in (r for r in LONGSOR if r[0] == prov):
            baris.append(('data', [('runs', [R(r[1], 9, TEKS, True)]), rt(r[2], 8.5), r[3] or '–', f0(r[4]), f0(r[5]), f0(r[6]), rt(r[7], 8.5),
                                   ('runs', [R('Masih ditangani. ' if r[10] else 'Tertangani. ', 8.5, MERAH if r[10] else BIRU_TUA, True), R(r[8], 8.5, TEKS)]),
                                   r[9]]))
    baris.append(('total', [f'Total {len(LONGSOR)} kejadian', '', '', sum(r[4] or 0 for r in LONGSOR), sum(r[5] or 0 for r in LONGSOR),
                            f0(sum(r[6] or 0 for r in LONGSOR)), '', '', '']))
    tabel(k, 43.2, 140, kol, baris, bawah=500, pt=8.5, maks=46)


def s_lampiran_ungsi(Dk, no='L3'):
    """Lampiran pengungsian sepekan (pemilik 16 Nov 2026: 'tambahin lampiran yang kayak gini', contoh L2 deck 021126) dalam gaya tabel 091126."""
    jiwa = [r for r in UNGSI if r[5]]
    kk_saja = [r for r in UNGSI if r[4] and not r[5]]
    t_j, t_k = sum(r[5] for r in jiwa), sum(r[4] or 0 for r in UNGSI)
    s, k = Dk.slide(judul(f'{no}. Pengungsian sepekan di [{len(UNGSI)}] kab/kota'))   # pemilik 16 Nov: judul lampiran to the point
    kepala_panel(k, 43.2, 102, 873.6, 'Pengungsi per kab/kota', 'pengungsi',
                 'Angka dari laporan terakhir yang memuatnya; pengungsi yang sudah kembali tetap dicatat')
    kol = [('KAB/KOTA', 150, 'l'), ('KONDISI', 112, 'c'), ('KK', 56, 'c'), ('JIWA', 60, 'c'),
           ('LOKASI PENGUNGSIAN DAN DESA ASAL', 435.6, 'l'), ('KABAR', 60, 'c')]
    baris = []
    for prov in dict.fromkeys(r[0] for r in UNGSI):
        baris.append(('prov', prov))
        for r in (r for r in UNGSI if r[0] == prov):
            pil = ('Belum surut' if r[3] else 'Sudah surut') if r[2] == 'banjir' else ('Masih ditangani' if r[3] else 'Tertangani')
            nama = ('runs', [R(r[1], 9, TEKS, True), '\n', R('Banjir' if r[2] == 'banjir' else 'Tanah longsor', 7.5, TEKS3)])
            baris.append(('data', [nama, ('pil', pil, r[3], 8.6), f0(r[4]), f0(r[5]), rt(r[6], 8.5), r[7]]))
    baris.append(('total', ['Jumlah', '', f0(t_k), f0(t_j), ('runs', [R('KK dan jiwa dijumlah terpisah: tidak semua kab/kota melaporkan keduanya',
                                                                       7.5, PUTIH, False)]), '']))
    tabel(k, 43.2, 140, kol, baris, bawah=500, pt=8.5, maks=34)


# ======================================================================== probabilitas dan mitigasi dari data GIS (minggu tanpa deck 091126)
AWAS, SIAGA, PITA_SIAGA = '8F3F07', 'E8894A', 'FBE7D6'   # skala.api.5, skala.api.3, tint.api.pita (sama dengan deck 091126)
ARTI = [('Awas', AWAS, PITA_MERAH, 'peringatan', 'Hujan 3 hari 120 mm atau lebih di wilayah bahaya tinggi, atau debit sungai setara banjir 20 tahunan.'),
        ('Siaga', SIAGA, PITA_SIAGA, 'banjir', 'Hujan 3 hari 80 mm atau lebih, hujan 30 mm per jam, atau peluang hujan lebat 50% di wilayah '
                                                 'bahaya sedang ke atas, atau debit sungai setara banjir 5 tahunan.')]
MITIGASI = {}      # kab terdampak -> langkah (diisi skrip minggu, dari laporan Koordalops)
PANTAU = []        # [(kab, langkah)] pantauan khusus, mis. longsor yang masih ditangani
N_SIAGA_MITIGASI = 12


def muat_gis():
    """Rekap prakiraan sistem banjir (pola kec4s.py deck 091126): per kab/kota jumlah kecamatan Awas (level 3) dan Siaga (level 2) dalam
    4 hari, puncak hujan tiga hari dari kecamatan berstatus itu, dan daftar kecamatannya."""
    d = MINGGU['gis']
    P = json.load(open(os.path.join(d, 'prakiraan72.json'), encoding='utf-8'))
    S = json.load(open(os.path.join(d, 'status.json'), encoding='utf-8'))['kec']
    W = json.load(open(os.path.join(d, 'wilayah_hari.json'), encoding='utf-8'))
    hari = [date.fromisoformat(t) for t in P['hari']]
    nm = {p['kode']: p['nama'] for p in W['provinsi']}
    g = {}
    for key, v in P['kec'].items():
        m = max(v['b'])
        if m < 2:
            continue
        pr, kab, kec = key.split('|')
        o = g.setdefault(pr + '|' + kab, dict(pr=pr, prov=nm.get(pr, pr), kab=kab, a=0, s=0, mm=0, tgl=None, ka=[], ks=[]))
        o['a' if m == 3 else 's'] += 1
        h = (S.get(key) or {}).get('h3d') or [0]
        (o['ka'] if m == 3 else o['ks']).append((kec, max(h), hari[h.index(max(h))] if max(h) else None))
        if max(h) > o['mm']:
            o['mm'], o['tgl'] = max(h), hari[h.index(max(h))]
    for o in g.values():
        o['ka'].sort(key=lambda t: -t[1]); o['ks'].sort(key=lambda t: -t[1])
    dibuat = P['dibuat'][:16].replace('T', ' ')
    return sorted(g.values(), key=lambda o: (o['pr'], -o['a'], -o['s'], -o['mm'])), hari, dibuat


def sumber_gis():
    _, _, dibuat = muat_gis()
    t = date.fromisoformat(dibuat[:10])
    return f'GIS BNPB, {t.day} {BLN[t.month][:3]} {t.year} {dibuat[11:].replace(":", ".")} WIB'


def s_probabilitas(Dk):
    rows, hari, _ = muat_gis()
    na, ns = sum(o['a'] for o in rows), sum(o['s'] for o in rows)
    provs = list(dict.fromkeys(o['prov'] for o in rows))
    rentang = f'{hari[0].day}-{hari[-1].day} {BLN[hari[-1].month][:3]}'
    s, k = Dk.slide(judul(f'Terdapat [{na}] kecamatan berstatus Awas, [{ns}] Siaga di [{len(provs)}] provinsi pada periode '
                          f'[{len(hari)}] hari ke depan ([{rentang}])'))
    # peta Indonesia: kab/kota berkecamatan Awas (coklat) atau hanya Siaga (oranye)
    warna = {(o['pr'], o['kab']): (AWAS if o['a'] else SIAGA) for o in rows}
    W_, H_ = 418, 158
    png = os.path.join(SINI, 'bahan', 'peta-prakiraan.png')
    f = gambar_peta(png, INSET_EXT, (2000, int(2000 * H_ / W_)), warna, SEMUA_PROV, garis=1)
    k.gambar(png, 43.2, 102, W_, H_)
    ke = lambda lon, lat: (43.2 + f(lon, lat)[0] / 2000 * W_, 102 + f(lon, lat)[1] / int(2000 * H_ / W_) * H_)
    awas = [(o, kec) for o in rows if o['a'] for kec in o['ka']]
    taruh = []
    for i, (o, kec) in enumerate(awas, 1):   # nomor pada peta = nomor baris tabel kecamatan Awas di bawah
        try:
            x, y = ke(*pusat(o['pr'], o['kab']))
        except StopIteration:
            continue
        while any(abs(x - a) < 12 and abs(y - b) < 12 for a, b in taruh):   # titik berdekatan (Pemalang, Tegal, Brebes): berjajar
            x += 12
        taruh.append((x, y))
        k.kotak(x - 5.5, y - 13, 11, 11, AWAS, PUTIH, bentuk=MSO_SHAPE.OVAL)
        k.teks(x - 8, y - 13, 16, 11, [R(str(i), 6.5, PUTIH, True)], rata='c', bungkus=False)
    kartu(k, 43.2, 266, 206.1, sum(1 for o in rows if o['a']), 'Awas (kab/kota)', True, (PITA_MERAH, AWAS, 'peringatan'))
    kartu(k, 254.3, 266, 206.1, sum(1 for o in rows if not o['a']), 'Siaga (kab/kota)', False, (PITA_SIAGA, SIAGA, 'banjir'))
    for i, (nama, w_, tint, konsep, arti) in enumerate(ARTI):   # arti status, pola deck 091126
        x = 43.2 + i * 211.1
        k.bulat(x, 302, 206.1, 54, PUTIH, GARIS_INSET, radius=3)
        k.kotak(x, 302, 3.6, 54, w_)
        k.kotak(x + 9, 306, 11, 11, w_, bentuk=MSO_SHAPE.OVAL)
        k.gambar(ikon(konsep), x + 11.3, 308.3, 6.4, 6.4)
        k.teks(x + 24, 305, 170, 13, [R(nama, 9, TEKS, True)], bungkus=False)
        k.teks(x + 9, 319, 192, 34, [R(arti, 7, TEKS)], jangkar='t', spasi=0.95)
    kol = [('NO', 22, 'c'), ('KECAMATAN AWAS', 118, 'l'), ('KAB/KOTA', 110, 'l'), ('HUJAN 3 HARI, MM', 86, 'c'), ('PUNCAK', 81.8, 'c')]
    baris = [('data', [str(i), kec[0], o['kab'], ('runs', [R(str(round(kec[1])), 9, MERAH, True)]),
                       f'{kec[2].day} {BLN[kec[2].month][:3]}' if kec[2] else '–']) for i, (o, kec) in enumerate(awas, 1)]
    tabel(k, 43.2, 364, kol, baris, bawah=500, pt=8.5, maks=22)
    # tabel per provinsi
    kol = [('PROVINSI', 128, 'l'), ('KAB/KOTA', 52, 'c'), ('KEC. AWAS', 58, 'c'), ('KEC. SIAGA', 58, 'c'), ('HUJAN 3 HARI, MM', 82, 'c'),
           ('TGL. PUNCAK', 67.5, 'c')]
    baris = []
    for p in provs:
        xs = [o for o in rows if o['prov'] == p]
        top = max(xs, key=lambda o: o['mm'])
        a = sum(o['a'] for o in xs)
        baris.append(('data', [p, len(xs), ('runs', [R(str(a), 9, MERAH, True)]) if a else '–', sum(o['s'] for o in xs),
                               ('runs', [R(str(round(top['mm'])), 9, MERAH, True)]), f'{top["tgl"].day} {BLN[top["tgl"].month][:3]}']))
    baris.append(('total', ['Jumlah', len(rows), na, ns, '', '']))
    tabel(k, 471.3, 101, kol, baris, pt=9, minh=17)


def langkah_kec(kecs, n=2):
    nama = [x[0] for x in kecs]
    return ', '.join(nama[:n])


def s_mitigasi(Dk):
    rows, hari, _ = muat_gis()
    akhir = hari[-1]
    terdampak = [r for r in BANJIR if not r[4] and r[1] in MITIGASI]
    tk = {r[1] for r in terdampak}
    aw = [o for o in rows if o['a'] and o['kab'] not in tk]
    sg = sorted((o for o in rows if not o['a'] and o['kab'] not in tk), key=lambda o: (-o['s'], -o['mm']))[:N_SIAGA_MITIGASI]
    n = len(terdampak) + len(aw) + len(sg) + len(PANTAU)
    s, k = Dk.slide(judul(f'Mitigasi [{n}] kab/kota: [{len(terdampak)}] terdampak ditangani sekarang; [{len(aw)}] Awas dan [{len(sg)}] Siaga '
                          f'disiapkan sebelum {akhir.day} {BLN[akhir.month]}'))

    def panel(x, w, judul_p, konsep, isi):
        k.ikon_bulat(konsep, x + 6, 103, 22)
        k.teks(x + 36, 102, w - 36, 24, [R(judul_p, 11, TEKS, True)])
        k.garis(x, 132, x + w, 132, TEKS, 0.75)
        tabel(k, x + 6, 140, [('KAB/KOTA', 92, 'l'), ('LANGKAH BPBD BERSAMA BNPB', w - 104, 'l')], isi, bawah=500, pt=8.5, maks=24, minh=17)

    kiri = [('prov', 'Terdampak, belum dilaporkan surut', PITA_MERAH, (MERAH, 'peringatan'))]
    kiri += [('data', [r[1], rt(MITIGASI[r[1]], 8)]) for r in terdampak]
    kiri += [('prov', 'Awas', PITA_MERAH, (AWAS, 'peringatan'))]
    kiri += [('data', [o['kab'], rt(f'Siapkan evakuasi {langkah_kec(o["ka"])}' + (f'; pantau {langkah_kec(o["ks"])}' if o['ks'] else ''), 8)])
             for o in aw]
    kanan = [('prov', 'Siaga', PITA_SIAGA, (SIAGA, 'banjir'))]
    # tanggal puncak ditulis sebagai keterangan, bukan tenggat: puncak bisa jatuh sebelum tanggal paparan
    kanan += [('data', [o['kab'], rt(f'Siapkan evakuasi {langkah_kec(o["ks"])} ({o["s"]} kecamatan Siaga, puncak hujan '
                                     f'{o["tgl"].day} {BLN[o["tgl"].month][:3]})', 8)]) for o in sg]
    if PANTAU:
        kanan += [('prov', 'Pantauan khusus', PITA_BIRU, (BIRU, 'longsor'))]
        kanan += [('data', [kb, rt(t, 8)]) for kb, t in PANTAU]
    panel(43.2, 418, 'Tindakan terdekat', 'tanggap-darurat', kiri)
    panel(476.6, 440.2, f'Mitigasi sebelum {akhir.day} {BLN[akhir.month]}', 'prabencana', kanan)


def tulis_judul(sh, bagian):
    """Tulis ulang judul impor: bagian genap memakai gaya run hitam pertama, ganjil gaya run oranye pertama (angka sorot)."""
    import copy
    p = sh.text_frame.paragraphs[0]
    runs = p.runs
    hitam = next(r for r in runs if str(r.font.color.rgb) != ORANYE)._r
    oranye = next(r for r in runs if str(r.font.color.rgb) == ORANYE)._r
    for par in sh.text_frame.paragraphs[1:]:
        par._p.getparent().remove(par._p)
    for r in runs:
        p._p.remove(r._r)
    akhir = p._p.find('{http://schemas.openxmlformats.org/drawingml/2006/main}endParaRPr')
    for i, t in enumerate(bagian):
        r = copy.deepcopy(oranye if i % 2 else hitam)
        r.find('{http://schemas.openxmlformats.org/drawingml/2006/main}t').text = t
        if akhir is not None:
            akhir.addprevious(r)
        else:
            p._p.append(r)


def salinan_091():
    """Salinan deck 091126 untuk diimpor: gaya bawaan bentuk (p:style berisi schemeClr) dibuang, sama dengan Isi.simpan deck 021126,
    karena deck.py menolak warna di luar hex tema (D-9). Warna isi bentuknya sendiri sudah hex."""
    from pptx.oxml.ns import qn
    from lxml import etree
    GANTI = {'Tanggap Darurat hari ini, 9 Nov': 'Tanggap Darurat 9 Nov',   # D-10 (4.06): tulis tanggalnya, bukan "hari ini"
             ' di Aceh, Sumut, dan Sumbar': ' di Sumatera',                 # S-18 anti-AI: pola daftar tiga "A, B, dan C" di judul
             'Sudah surut 9 Nov': 'Sudah surut 8 Nov',                       # Serdang Bedagai: tanggal laphar, sama dengan slide 3 dan 5
             'disiapkan sebelum 10 November': 'disiapkan sebelum 12 November'}  # judul mitigasi = panel kanan dan prakiraan 9-12 Nov
    P = Presentation(D091)
    for sl in P.slides:
        for st in list(sl.shapes._spTree.iter(qn('p:style'))):
            st.getparent().remove(st)
        for sh in list(sl.shapes):   # tab bagian lama (01 Peta banjir ... 05 Bencana lain); deck.py memasang tab deck ini
            if sh.top < Pt(19) and sh.height < Pt(16):
                sh._element.getparent().remove(sh._element)
            # salin_slide deck.py menganggap garis datar lebar di bawah 85% tinggi slide sebagai garis kaki lama dan membuang semua
            # di bawahnya (baris Total LogPal hilang, 12 Nov). Garis pemisah tabel di atas garis kaki asli (507,6 pt) diberi tinggi 1 EMU.
            elif sh.height == 0 and sh.width >= 0.7 * P.slide_width and 0.85 * P.slide_height <= sh.top < Pt(505):
                sh.height = 1
        for t in sl.shapes._spTree.iter(qn('a:t')):
            for a, b in GANTI.items():
                if t.text and a in t.text:
                    t.text = t.text.replace(a, b)
        # judul impor (pemeriksa 12 Nov): hal. LogPal berjudul label tanpa angka; hal. mitigasi "8 Siaga" padahal panel kiri 8 + kanan 11
        for sh in sl.shapes:
            if not sh.has_text_frame or sh.top > Pt(40):
                continue
            teks = sh.text_frame.text
            if teks.startswith('Daftar Inventaris LogPal'):
                tulis_judul(sh, ['Gudang BNPB dan BPBD di Sumatera menyimpan ', '77', ' perahu dan ', '131',
                                 ' pompa; ', '13.173', ' matras dan kasur ada di Gudang UPT Padang'])
            elif teks.replace(' ', ' ').startswith('20 kab/kota di Sumatera'):   # pemilik 13 Nov: judul tidak diawali angka
                tulis_judul(sh, ['Poslog Kualanamu dan Gudang UPT Padang dapat melayani ', '20', ' kab/kota di Sumatera yang telah dan '
                                 'berpotensi banjir dengan waktu pengantaran paling lama ', '30', ' jam'])
            elif teks.startswith('Mitigasi') and 'Siaga disiapkan' in teks:
                for r_ in [r for p_ in sh.text_frame.paragraphs for r in p_.runs]:
                    if r_.text == ' 8':
                        r_.text = ' 19'
        # titik Solok (peta probabilitas) jatuh di dalam pil labelnya sendiri: pil digeser 45 pt ke kanan, garis penunjuk dipendekkan
        sol = next((sh for sh in sl.shapes if sh.has_text_frame and sh.text_frame.text.replace('\xa0', ' ').startswith('Solok  Awas')), None)
        if sol is not None:
            y0, geser = sol.top, Pt(45)
            grup = [sh for sh in sl.shapes if abs(sh.top + sh.height / 2 - (y0 + sol.height / 2)) < Pt(3) and Pt(315) < sh.left < sol.left + Pt(5)
                    and sh.height > 0]
            titik = [sh for sh in sl.shapes if sh.shape_type == 1 and sh.width <= Pt(6) and abs(sh.top - y0) < Pt(10) and Pt(320) < sh.left < Pt(400)]
            garis = [sh for sh in sl.shapes if sh.height == 0 and abs(sh.top - y0 - sol.height / 2) < Pt(1)]
            if titik and garis:
                kiri = min(sh.left for sh in grup)
                for sh in grup:
                    sh.left += geser
                cx = titik[0].left + titik[0].width // 2
                garis[0].left, garis[0].width = cx, kiri + geser - cx
        # T-7: keterangan inset "Garut, Tasikmalaya, ..." dua baris menempel tepi bawah kotak inset (slide probabilitas).
        # Kotak diperpanjang 14 pt ke atas (tepi bawah tetap, kartu Siaga di bawahnya tidak tertabrak), isinya ikut naik.
        ket = [sh for sh in sl.shapes if sh.has_text_frame and sh.text_frame.text.startswith(('Se-Indonesia', 'Garut, Tasikmalaya'))]
        if len(ket) == 2:
            x0, x1 = min(sh.left for sh in ket), max(sh.left + sh.width for sh in ket)
            y0, y1 = min(sh.top for sh in ket), max(sh.top + sh.height for sh in ket)
            def bungkus(sh):
                kosong = not sh.has_text_frame or not sh.text_frame.text
                return kosong and sh.left <= x0 and sh.left + sh.width >= x1 and sh.top <= y0 and sh.top + sh.height >= y1 - Pt(1)
            kotak = min((sh for sh in sl.shapes if bungkus(sh)), key=lambda sh: sh.width * sh.height)
            isi = [sh for sh in sl.shapes if sh is not kotak and sh.left >= kotak.left and sh.top >= kotak.top
                   and sh.left + sh.width <= kotak.left + kotak.width + 1 and sh.top + sh.height <= kotak.top + kotak.height + Pt(1)]
            kotak.top -= Pt(14); kotak.height += Pt(14)
            for sh in isi:
                sh.top -= Pt(14)
            cap = next(sh for sh in ket if sh.text_frame.text.startswith('Garut'))
            cap.height = Pt(12); cap.top -= Pt(4); cap.text_frame.word_wrap = False   # render LibreOffice tetap membungkus 2 baris dan menembus kotak
            for p_ in cap.text_frame.paragraphs:
                for r_ in p_.runs:
                    r_.font.size = Pt(6.5)
        sisa = etree.tostring(sl.shapes._spTree).decode().count('schemeClr')
        if sisa:
            print(f'PERINGATAN salinan 091126: {sisa} schemeClr tersisa di slide {P.slides.index(sl) + 1}', file=sys.stderr)
    out = os.path.join(SINI, 'bahan', 'impor-091126.pptx')
    P.save(out)
    return out


# ======================================================================== rakit
def main():
    Dk = Deck()
    s_peta_banjir(Dk)
    s_peta_longsor(Dk)
    gis = bool(MINGGU.get('gis'))
    if gis:   # 16 Nov: minggu tanpa deck 091126 memakai data GIS sendiri untuk probabilitas dan mitigasi
        s_probabilitas(Dk)
        s_mitigasi(Dk)
    n_isi = 4 if gis else 2
    n_l1 = s_rincian_banjir(Dk)
    n_l2 = 0 if len(LONGSOR) <= LONGSOR_RINGKAS else (s_rincian_longsor(Dk) or 1)
    s_lampiran_ungsi(Dk, 'L3' if n_l2 else 'L2')
    nama = MINGGU['nama']
    kerja = os.path.join(SINI, 'kerja')   # 16 Nov: hasil dibangun di sini lalu dipindah ke 'Revisi N' (PDF lama di folder bisa sedang dibuka)
    os.makedirs(kerja, exist_ok=True)
    isi = os.path.join(kerja, f'{nama}.pptx')
    Dk.I.simpan(isi)
    if '--isi' in sys.argv:
        print('isi saja:', isi); return
    sb091 = {2: 'GIS BNPB, 9 Nov 2026 13.34 WIB', 3: 'BPBD Aceh; BPBD Sumut; DSP Gudang UPT Padang; BPBD Sumbar, Okt 2026; Poslog Kualanamu, 25 Okt 2026',
             4: 'Perkiraan dari jarak dan kecepatan rata-rata tiap moda; belum dikonfirmasi operator angkutan',
             5: 'GIS BNPB, 9 Nov 2026 13.34 WIB; Laporan Dit. Koordalops BNPB, 5 s.d. 9 Nov 2026'}
    susun = [{'jenis': 'sampul'}, {'jenis': 'daftar-isi'}]
    susun += [{'halaman': n, 'bagian': 1, 'sumber': sumber()} for n in (1, 2)]
    judul_bagian = ['Peta banjir dan longsor']   # pemilik 16 Nov 2026 (sebelumnya "Situasi banjir dan longsor sepekan")
    if gis:
        susun += [{'halaman': 3, 'bagian': 2, 'sumber': sumber_gis()},
                  {'halaman': 4, 'bagian': 3, 'sumber': f'Usulan dari {sumber_gis()}; Laporan Dit. Koordalops BNPB, '
                                                        f'{MINGGU["awal"].day} s.d. {tgl_p(MINGGU["akhir"])} {MINGGU["akhir"].year}'}]
        judul_bagian += ['Probabilitas banjir', 'Mitigasi']
    elif MINGGU['impor_091']:
        imp = salinan_091()
        # pemilik 16 Nov 2026: bagian Kebutuhan dan jalur logistik (slide 3-4 deck 091126: LogPal, jalur) dihapus
        susun += [{'jenis': 'impor', 'pptx': imp, 'halaman': n, 'bagian': b, 'sumber': sb091[n]} for n, b in ((2, 2), (5, 3))]
        judul_bagian += ['Probabilitas banjir', 'Mitigasi']
    # pemilik 16 Nov 2026: rincian banjir, longsor, dan pengungsian jadi lampiran L1-L3 di belakang, tanpa bagian (tidak masuk daftar isi dan tab)
    susun += [{'halaman': n, 'sumber': sumber()} for n in range(n_isi + 1, n_isi + 1 + n_l1 + n_l2 + 1)]
    foto = os.path.join(LB, 'mingguan/2026-11-02/banjir', 'bahan', 'sampul.jpg').replace(os.sep, '/')
    kredit = 'Foto: Nasution007, CC BY-SA 4.0, Wikimedia Commons'
    susun.append({'jenis': 'penutup', 'layout': 'putih', 'foto': [foto], 'kredit': kredit})
    tetap = {}
    for no, b in enumerate(susun, 1):
        if b.get('bagian'):
            tetap.setdefault(b['bagian'], []).append(no)
    # label tab = judul bagian di daftar isi (pemeriksa 12 Nov)
    bagian = [{'judul': j, 'label': j} for j in judul_bagian]
    for n, b in enumerate(bagian, 1):
        b['halaman_tetap'] = tetap[n]
    import lewat_deck
    a, b_ = MINGGU['awal'], MINGGU['akhir']
    keluar = lewat_deck.bingkai(
        isi, 'kajian', 'Laporan Situasi dan Kondisi Wilayah Terdampak Banjir dan Tanah Longsor',
        f'{HARI[a.weekday()]}, {a.day} {BLN[a.month]} s.d. {HARI[b_.weekday()]}, {tgl_l(b_)}', MINGGU['paparan'],
        foto=([foto], kredit), penyaji={'nama': 'Tim Ahli dan Tim Sus IT BNPB', 'jabatan': 'Badan Nasional Penanggulangan Bencana'},
        kepada='Disampaikan kepada Kepala Badan Nasional Penanggulangan Bencana', bagian=bagian, susun=susun,
        spek_tambah={'panel_sisi': 'gelap', 'subjek_dokumen': 'Paparan Situasi Banjir dan Longsor Mingguan', 'skala_logo_bnpb': 1.1})
    # pemilik 16 Nov 2026: tiap keluaran masuk folder 'Revisi N' baru di folder minggu (PPTX dan PDF, nama tanpa (revN))
    import re, shutil
    n = 1 + max([int(x[7:]) for x in os.listdir(SINI) if re.fullmatch(r'Revisi \d+', x)] + [0])
    ke = os.path.join(SINI, f'Revisi {n}'); os.makedirs(ke)
    for ext in ('.pptx', '.pdf'):
        if os.path.exists(keluar[:-5] + ext):
            shutil.move(keluar[:-5] + ext, os.path.join(ke, nama + ext))
    print(ke)


if __name__ == '__main__':
    main()
