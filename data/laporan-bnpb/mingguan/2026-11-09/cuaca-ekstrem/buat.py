"""Paparan "Laporan Situasi Cuaca Ekstrem" sepekan 2 s.d. 8 Nov 2026 (dipaparkan 9 Nov 2026, dibuat 12 Nov 2026).

Pola dan alat gambar = deck banjir-longsor-sepekan-2026-11-09/buat.py (diimpor, tidak disalin, tidak diubah).

Data
- Kejadian: teks WA Dit. Koordalops laporan pagi 3 s.d. 9 Nov (harian-2026-11-0N/wa-koordalops.txt, laporan N = laphar N-1),
  diurai generator/wa_harian.koordalops; jenis 'cuaca' dan 'angin' (gelombang_pasang nihil pada periode ini). Rincian RB/RS/RR,
  fasilitas, dan pengungsi dibaca dari butir Kerusakan/Pengungsi di teks yang sama. Ciamis memakai pengkinian laphar 8 Nov.
- Peringatan dini: teks WA BMKG pagi pada tanggal laphar yang sama (harian-2026-11-0D/wa-bmkg.txt), diurai wa_harian.bmkg.
- Prakiraan: WA BMKG 9 Nov (periode 9 s.d. 12 Nov) dan arsip prakiraan hujan per kab/kota terbitan 9 Nov
  (public/prediksi/data/arsip/2026-11.jsonl, kode HJN dan ROB, berlaku 10 s.d. 12 Nov).

    python buat.py          # isi.pptx -> deck.py (sampul, daftar isi, tab bagian, penutup) -> PPTX + PDF
    python buat.py --isi    # hanya slide isi
"""
import importlib.util, json, os, sys
from collections import Counter, OrderedDict
from datetime import date

from pptx.enum.shapes import MSO_SHAPE
from PIL import Image, ImageDraw

SINI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(SINI, '..', '..', '..', '..', '..'))
LB = os.path.join(REPO, 'data', 'laporan-bnpb')
NAMA = 'Paparan Situasi Cuaca Ekstrem Sepekan 091126'

_s = importlib.util.spec_from_file_location('bl', os.path.join(LB, 'mingguan/2026-11-09/banjir-longsor', 'buat.py'))
BL = importlib.util.module_from_spec(_s); _s.loader.exec_module(BL)
BL.B.SINI = SINI                      # ikon ditulis ke folder deck ini, bukan folder acuan
os.makedirs(os.path.join(SINI, 'bahan', 'ikon'), exist_ok=True)
os.makedirs(os.path.join(SINI, 'bahan', 'cek'), exist_ok=True)
R, judul, tabel, kartu, kepala_panel, rt, f0, ikon = BL.R, BL.judul, BL.tabel, BL.kartu, BL.kepala_panel, BL.rt, BL.f0, BL.ikon
TEKS, NAVY, ORANYE, MERAH, PUTIH = BL.TEKS, BL.NAVY, BL.ORANYE, BL.MERAH, BL.PUTIH
BIRU, BIRU_TUA, PITA_BIRU, PITA_MERAH, KAB_TINT = BL.BIRU, BL.BIRU_TUA, BL.PITA_BIRU, BL.PITA_MERAH, BL.KAB_TINT
TEKS3, GARIS, GARIS_PANAH = BL.TEKS3, BL.GARIS, BL.GARIS_PANAH
TEKS2, SIAGA, NETRAL_MUDA, NETRAL_PITA = BL.B.TEKS2, BL.B.SIAGA, BL.B.NETRAL_MUDA, BL.B.NETRAL_PITA
sys.path.insert(0, os.path.join(LB, 'generator'))
import wa_harian as W

PROV = {k: v['nama'] for k, v in json.load(open(os.path.join(REPO, 'public', 'data', 'laporan.json'), encoding='utf-8'))['prov'].items()}
HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
TGL = list(range(2, 9))   # laphar 2 s.d. 8 Nov
S_KOORD = 'Laporan Dit. Koordalops BNPB, laporan harian 2 s.d. 8 Nov 2026'
S_BMKG = 'Laporan pagi BMKG kepada Kepala BNPB, 2 s.d. 8 Nov 2026'
D = None

# ======================================================================== data kejadian
# Angka dari butir Dampak/Pengungsi/Kerusakan WA Koordalops (diperiksa terhadap hasil urai koordalops() di urai()).
# (laphar, kode_prov, kab, label WA, kk, jiwa, rb, rs, rr, md, luka, ungsi_jiwa, catatan, kondisi, masih, status_teks)
KEJADIAN = [
    (2, '12', 'Dairi', 'Cuaca ekstrem', D, D, 1, 0, 0, 1, 1, 0, '',
     'Masih dalam penanganan pemerintah setempat', True, 'Masih ditangani'),
    (3, '33', 'Brebes', 'Cuaca ekstrem', 33, D, 0, 0, 33, 0, 0, 0, '1 fasilitas pendidikan rusak ringan',
     'Penanganan dan pembersihan material masih dilakukan', True, 'Masih ditangani'),
    (3, '35', 'Sumenep', 'Cuaca ekstrem', 11, D, 0, 0, 11, 0, 0, 0, '1 kandang ternak rusak; angka masih pendataan',
     'Dalam penanganan BPBD Kab. Sumenep', True, 'Masih ditangani'),
    (5, '35', 'Kediri', 'Angin kencang', 81, D, 1, 1, 78, 0, 0, 0, 'Siaga Darurat s.d. 1 Des 2026',
     'Pembersihan material rumah rusak masih dilakukan', True, 'Masih ditangani'),
    (6, '18', 'Lampung Selatan', 'Angin kencang', 30, D, 2, 10, 18, 0, 0, 0, '',
     'Situasi terpantau aman dan kondusif', False, 'Kondusif'),
    (7, '12', 'Serdang Bedagai', 'Cuaca ekstrem', 10, D, D, D, D, 0, 0, 0, '10 rumah terdampak, tingkat kerusakan belum dirinci',
     'Dalam penanganan BPBD Kab. Serdang Bedagai', True, 'Masih ditangani'),
    (7, '32', 'Ciamis', 'Cuaca ekstrem', 76, 214, 0, 0, 66, 0, 0, 0, '3 fasilitas umum rusak sedang (laporan 7 Nov)',
     'Dalam penanganan; pengkinian 8 Nov', True, 'Masih ditangani'),
    (7, '32', 'Bogor', 'Cuaca ekstrem', 31, 132, 1, 11, 19, 0, 0, 3, 'pohon tumbang; 1 KK (3 jiwa) mengungsi',
     'Pohon tumbang selesai dievakuasi; sebagian rumah diperbaiki mandiri', False, 'Pemulihan'),
    (7, '33', 'Kendal', 'Cuaca ekstrem', D, D, 0, 0, 0, 1, 3, 0, 'tanpa kerusakan bangunan',
     'Kondisi sudah kondusif', False, 'Kondusif'),
    (8, '35', 'Jember', 'Cuaca ekstrem', 184, D, 0, 6, 178, 0, 5, 0, 'Siaga Darurat Provinsi s.d. 1 Des 2026',
     'Sebagian warga memperbaiki rumah secara mandiri', False, 'Pemulihan'),
]


def rumah(e):
    return sum(x or 0 for x in e[6:9])


def urai():
    """Cocokkan KEJADIAN dengan hasil koordalops() (kab, jenis, KK, rumah, MD) supaya angka tangan tidak melenceng."""
    hasil = {}
    for n in range(3, 10):
        for x in W.koordalops(open(os.path.join(LB, f'harian/2026-11/2026-11-0{n}', 'wa-koordalops.txt'), encoding='utf-8').read())['kejadian']:
            if x['jenis'] in ('cuaca', 'angin'):
                hasil[x['lokasi']] = (n - 1, x)        # pengkinian (Ciamis 8 Nov) menimpa laporan awal
            assert x['jenis'] != 'gelombang_pasang', 'ada gelombang pasang; tambahkan ke deck'
    assert sorted(hasil) == sorted(e[2] for e in KEJADIAN), sorted(hasil)
    for e in KEJADIAN:
        n, x = hasil[e[2]]
        a = x['angka']
        assert x['prov'] == e[1] and (x['jenis'] == 'angin') == (e[3] == 'Angin kencang'), e[2]
        assert a.get('kk') == e[4] and int(a.get('meninggal', 0)) == e[9], (e[2], a)
        if e[6] is not None and 'rumah' in a:
            assert a['rumah'] == rumah(e), (e[2], a)
        if e[2] != 'Ciamis':
            assert n == e[0], (e[2], n)


# ======================================================================== data peringatan BMKG
def kode(nama):
    n = nama.replace('Sumatra', 'Sumatera').replace('Kep. Riau', 'Kepulauan Riau').strip()
    return W.kode_prov(n)


def bmkg(tgl):
    t = open(os.path.join(LB, f'harian/2026-11/2026-11-{tgl:02d}', 'wa-bmkg.txt'), encoding='utf-8').read()
    b = W.bmkg(t)
    sedang = []
    for p in b['hujan']:
        sedang += ['Aceh', 'Sumatera Utara'] if p == 'Aceh Sumatra Utara' else [p]   # WA 8 Nov: koma hilang
    return {'periode': b['periode'].replace('–', 's.d.').replace('  ', ' '),
            'awas': {kode(p) for p in b['awas']}, 'siaga': {kode(p) for p in b['siaga']},
            'angin': {kode(p) for p in b['angin']}, 'sedang': {kode(p) for p in sedang}}


PER = {d: bmkg(d) for d in TGL}
P9 = bmkg(9)


def dini(d):
    return PER[d]['awas'] | PER[d]['siaga'] | PER[d]['angin']


def cocok(e):
    d, kp = e[0], e[1]
    return kp in dini(d), kp in PER[d]['sedang'] | dini(d)


# ======================================================================== prakiraan model 9 Nov
def prakiraan():
    P = json.load(open(os.path.join(REPO, 'public', 'prediksi', 'data', 'prediksi.json'), encoding='utf-8'))
    nm = {k['id']: (k['nama'], k['prov']) for k in P['kab']}
    ar = [json.loads(l) for l in open(os.path.join(REPO, 'public', 'prediksi', 'data', 'arsip', '2026-11.jsonl'), encoding='utf-8')]
    hjn = next(l for l in ar if l['t'] == '2026-11-09' and l['k'] == 'HJN')
    rob = next(l for l in ar if l['t'] == '2026-11-09' and l['k'] == 'ROB')
    i_tot = hjn['kol'].index('tot')
    lebat = sorted(((r[i_tot], h, nm[kab]) for kab, rows in hjn['kab'].items() for h, r in zip(hjn['hari'], rows)
                    if r[i_tot] is not None and r[i_tot] >= 50), reverse=True)
    ev = {}
    for e in KEJADIAN:
        kid = next(i for i, (n, p) in nm.items() if n == f'Kab. {e[2]}' and p == e[1])
        rows = hjn['kab'][kid]
        mx = max(range(3), key=lambda j: rows[j][i_tot])
        ev[e[2]] = (rows[mx][i_tot], hjn['hari'][mx])
    rob_lewat = sum(1 for v in rob['kab'].values() if any(x[0] for x in v))
    return {'hari': hjn['hari'], 'lebat': lebat, 'ev': ev, 'rob_n': len(rob['kab']), 'rob_lewat': rob_lewat}


PRA = prakiraan()


def tgl_teks(iso):
    return f'{int(iso[8:])} Nov'


# ======================================================================== label peta (pola BL.label_peta tanpa batas kolom tabel)
def label(k, x, y, nama, status, merah, titik, warna_status=None):
    lebar = (len(nama) * 9 + len(status) * 7.5) * 0.53 + 26
    tx, ty = titik
    if not (x <= tx <= x + lebar and y <= ty <= y + 15.8):
        ax = x + lebar if tx > x + lebar else x if tx < x else min(max(tx, x + 8), x + lebar - 8)
        ay = y + 7.9 if (tx < x or tx > x + lebar) else (y + 15.8 if ty > y + 15.8 else y)
        if abs(ax - tx) + abs(ay - ty) > 4:
            k.garis(ax, ay, tx, ty, GARIS_PANAH, 0.75)
    k.bulat(x, y, lebar, 15.8, PITA_MERAH if merah else PITA_BIRU)
    k.kotak(x + 2.2, y + 2.2, 11.5, 11.5, MERAH if merah else BIRU, bentuk=MSO_SHAPE.OVAL)
    k.gambar(ikon('peringatan' if merah else 'rumah'), x + 4, y + 4, 7.9, 7.9)
    k.teks(x + 17.3, y, lebar - 18, 15.8, [R(nama, 9, TEKS, True), R('  ' + status, 7.5, warna_status or (MERAH if merah else BIRU_TUA), True)],
           bungkus=False)
    k.kotak(tx - 2.5, ty - 2.5, 5, 5, PUTIH, TEKS, bentuk=MSO_SHAPE.OVAL)
    return lebar


# ======================================================================== slide 1: peta kejadian + tabel
PANEL = [('Sumatera Utara', (96.9, 106.6, 3.95, 1.75), 104, ['11', '12', '13', '14', '21']),
         ('Lampung dan Pulau Jawa', (104.9, 114.6, -4.6, -8.95), 214, ['16', '17', '18', '19', '31', '32', '33', '34', '35', '36', '51'])]
LEBAR_PETA = 418


def tinggi_panel(ext):
    return LEBAR_PETA * (ext[2] - ext[3]) / (ext[1] - ext[0])


def korban_sel(e, pt=8.5):
    bag = [x for x in (f'{e[9]} MD' if e[9] else '', f'{e[10]} luka' if e[10] else '') if x]
    if not bag:
        return '–'
    runs = []
    for i, b in enumerate(bag):
        runs += (['\n'] if i else []) + [R(b, pt, MERAH if 'MD' in b else TEKS, True)]
    return ('runs', runs)


def rumah_sel(e):
    if e[6] is None:
        return ('runs', [R('–', 9.19, TEKS, True)])
    n = rumah(e)
    if not n:
        return ('runs', [R('–', 9.19, TEKS, True)])
    rinci = ', '.join(f'{v} {s}' for v, s in zip(e[6:9], ('RB', 'RS', 'RR')) if v)
    return ('runs', [R(f0(n), 9.19, TEKS, True), '\n', R(rinci, 7, TEKS3)])


def s_peta(Dk):
    n_kab = len({(e[1], e[2]) for e in KEJADIAN})
    t_rumah = sum(rumah(e) for e in KEJADIAN)
    md = sum(e[9] for e in KEJADIAN)
    s, k = Dk.slide(judul(f'Terdapat [{len(KEJADIAN)}] kejadian cuaca ekstrem di [{n_kab}] kab/kota pada 2 s.d. 8 November 2026; '
                          f'[{t_rumah}] rumah rusak dan [{md}] jiwa meninggal dunia'))
    masih = {e[2] for e in KEJADIAN if e[14]}
    warna = {(e[1], e[2]): (MERAH if e[14] else BIRU) for e in KEJADIAN}
    titik = {}
    for i, (nama, ext, y0, provs) in enumerate(PANEL):
        h = tinggi_panel(ext)
        png = os.path.join(SINI, 'bahan', f'peta-kejadian-{i + 1}.png')
        px = (2000, int(2000 * h / LEBAR_PETA))
        f = BL.gambar_peta(png, ext, px, warna, provs)
        k.gambar(png, 43.2, y0, LEBAR_PETA, h)
        k.teks(43.2, y0 + 1, 200, 11, [R(nama, 7.5, TEKS3, True)], bungkus=False)
        for e in KEJADIAN:
            lon, lat = BL.pusat(e[1], e[2])
            if ext[0] <= lon <= ext[1] and ext[3] <= lat <= ext[2]:
                p = f(lon, lat)
                titik[e[2]] = (43.2 + p[0] / px[0] * LEBAR_PETA, y0 + p[1] / px[1] * h)
    k.garis_datar(43.2, 461.2, PANEL[1][2] - 6, GARIS, 0.5)
    POS = {'Dairi': (160, 172), 'Serdang Bedagai': (220, 112),
           'Lampung Selatan': (110, 230), 'Bogor': (50, 345), 'Ciamis': (150, 370), 'Brebes': (150, 262),
           'Kendal': (272, 236), 'Kediri': (262, 390), 'Jember': (360, 412), 'Sumenep': (340, 272)}
    for e in KEJADIAN:
        lb = label(k, *POS[e[2]], e[2], e[15], e[14], titik[e[2]])
        assert POS[e[2]][0] + lb <= 461.5, (e[2], POS[e[2]][0] + lb)
    BL.unsur_peta(k, 100 / 111 * LEBAR_PETA / (PANEL[0][1][1] - PANEL[0][1][0]))
    kartu(k, 43.2, 446.4, 206.1, len(masih), 'Masih ditangani (kab/kota)', True)
    kartu(k, 254.3, 446.4, 206.1, len(KEJADIAN) - len(masih), 'Kondusif atau pemulihan mandiri (kab/kota)', False)
    # tabel
    kol = [('KAB/KOTA DAN JENIS', 130, 'l'), ('LAPHAR', 38, 'c'), ('KK', 34, 'c'), ('RUMAH RUSAK', 76, 'c'), ('KORBAN', 50, 'c'),
           ('KONDISI', 117.5, 'c')]
    baris = []
    for kp in dict.fromkeys(e[1] for e in sorted(KEJADIAN, key=lambda e: e[1])):
        baris.append(('prov', PROV[kp]))
        for e in sorted((e for e in KEJADIAN if e[1] == kp), key=lambda e: e[0]):
            nama = ('runs', [R(e[2], 9.19, TEKS, True), '\n', R(e[3], 7, TEKS3)])
            kk = f0(e[4]) if not e[5] else ('runs', [R(f0(e[4]), 9.19, TEKS, True), '\n', R(f'{f0(e[5])} jiwa', 7, TEKS3)])
            baris.append(('data', [nama, f'{e[0]} Nov', kk, rumah_sel(e), korban_sel(e), ('pil', e[15], e[14], 8.6)], 27))
    tot_kk = sum(e[4] or 0 for e in KEJADIAN)
    baris.append(('total', [f'Total {len(KEJADIAN)} kejadian', '', f0(tot_kk), f0(sum(rumah(e) for e in KEJADIAN)),
                            ('runs', [R(f'{md} MD', 8, PUTIH, True), '\n', R(f'{sum(e[10] for e in KEJADIAN)} luka', 8, PUTIH, True)]), '']))
    yb = tabel(k, 471.3, 101, kol, baris, bawah=486, maks=30)
    k.teks(471.3, yb + 3, 445.5, 11, [R('RB rusak berat, RS rusak sedang, RR rusak ringan, MD meninggal dunia; laphar tanggal laporan harian; '
                                        'KK Ciamis dari pengkinian 8 Nov', 7, TEKS3)], bungkus=False)


# ======================================================================== slide 2: pola sepekan
def s_pola(Dk):
    per_hari = Counter(e[0] for e in KEJADIAN)
    puncak = max(TGL, key=lambda d: per_hari[d])
    prov_rumah = Counter()
    for e in KEJADIAN:
        prov_rumah[e[1]] += rumah(e)
    p1 = prov_rumah.most_common(1)[0]
    total = sum(prov_rumah.values())
    s, k = Dk.slide(judul(f'Kejadian terbanyak pada [{puncak} November] dengan [{per_hari[puncak]}] kejadian; '
                          f'{PROV[p1[0]]} menanggung [{p1[1]}] dari [{total}] rumah rusak sepekan'))
    # ---- kiri atas: per hari
    xl, wl = 43.2, 420
    kepala_panel(k, xl, 104, wl, 'Kejadian per hari', 'kalender', 'tanggal laporan harian')
    base, satuan = 304, 36
    bw, gap = 40, (wl - 20 - 7 * 40) / 6
    for i, d in enumerate(TGL):
        x = xl + 10 + i * (bw + gap)
        n_c = sum(1 for e in KEJADIAN if e[0] == d and e[3] == 'Cuaca ekstrem')
        n_a = sum(1 for e in KEJADIAN if e[0] == d and e[3] == 'Angin kencang')
        y = base
        for n, w in ((n_c, BIRU_TUA), (n_a, ORANYE)):
            if n:
                k.kotak(x, y - n * satuan, bw, n * satuan, w)
                y -= n * satuan
        k.teks(x - 5, y - 16, bw + 10, 14, [R(str(n_c + n_a), 11, NAVY if n_c + n_a else TEKS3, True)], rata='c', bungkus=False)
        k.teks(x - 8, base + 4, bw + 16, 22, [R(HARI[date(2026, 11, d).weekday()], 7.5, TEKS3), '\n', R(f'{d} Nov', 8.5, TEKS, True)],
               rata='c', jangkar='t', spasi=0.95)
        nama = ', '.join(e[2] for e in KEJADIAN if e[0] == d)
    k.garis_datar(xl, xl + wl, base, TEKS, 0.75)
    for j, (lab, w) in enumerate((('Cuaca ekstrem', BIRU_TUA), ('Angin kencang', ORANYE))):
        x = xl + 10 + j * 98
        k.kotak(x, 146, 9, 9, w)
        k.teks(x + 13, 143, 80, 15, [R(lab, 7.5, TEKS)], bungkus=False)
    # ---- kiri bawah: tingkat kerusakan rumah
    yk = 356
    rb, rs, rr = (sum(e[6 + j] or 0 for e in KEJADIAN) for j in range(3))
    kepala_panel(k, xl, yk, wl, 'Tingkat kerusakan rumah', 'rumah', f'{total} rumah rusak sepekan')
    yb, hb, w_tot = yk + 62, 26, wl
    x = xl
    for v, w, lab in ((rb, MERAH, 'Rusak berat'), (rs, SIAGA, 'Rusak sedang'), (rr, BIRU, 'Rusak ringan')):
        ww = w_tot * v / total
        k.kotak(x, yb, ww, hb, w)
        x += ww
    for j, (v, w, lab) in enumerate(((rb, MERAH, 'Rusak berat'), (rs, SIAGA, 'Rusak sedang'), (rr, BIRU, 'Rusak ringan'))):
        xx = xl + j * 140
        k.kotak(xx, yb + hb + 12, 9, 9, w)
        k.teks(xx + 13, yb + hb + 8, 125, 17, [R(f'{v}', 11, NAVY, True), R(f'  {lab} ({v / total * 100:.0f}%)', 7.5, TEKS)], bungkus=False)
    k.teks(xl, yb - 20, wl, 14, [R(f'{rr} dari {total} rumah rusak ringan; Serdang Bedagai melaporkan 10 rumah terdampak tanpa rincian kerusakan',
                                   7.5, TEKS2)], bungkus=False)
    k.teks(xl, yb + hb + 32, wl, 26, [R('Rusak berat: Lampung Selatan 2, Dairi 1, Kediri 1, Bogor 1. Rusak sedang terbanyak di Bogor (11) '
                                        'dan Lampung Selatan (10).', 7.5, TEKS2)], jangkar='t')
    # ---- kanan: per provinsi
    xr, wr = 490, 426.8
    kepala_panel(k, xr, 104, wr, 'Dampak per provinsi', 'wilayah', 'urut jumlah rumah rusak')
    kol = [('PROVINSI', 104, 'l'), ('KEJADIAN', 50, 'c'), ('RUMAH RUSAK', 150, 'l'), ('KK', 46, 'c'), ('KORBAN', 76.8, 'c')]
    xs = [xr]
    for c in kol:
        xs.append(xs[-1] + c[1])
    yh = 142
    k.bulat(xr, yh, wr, 16.6, NAVY, radius=3)
    for (j, w, rata), cx in zip(kol, xs):
        k.teks(cx, yh, w, 16.6, [R(j, 7.5, PUTIH, True, 0.6)], rata=rata, kiri=8 if rata == 'l' else 1, bungkus=False)
    urut = sorted({e[1] for e in KEJADIAN}, key=lambda p: (-prov_rumah[p], p))
    y, hrow = yh + 16.6, 58
    for p in urut:
        es = [e for e in KEJADIAN if e[1] == p]
        k.teks(xs[0], y, kol[0][1], hrow, [R(PROV[p], 9.19, TEKS, True), '\n', R(', '.join(e[2] for e in es), 7, TEKS3)], kiri=8, spasi=0.95)
        k.teks(xs[1], y, kol[1][1], hrow, [R(str(len(es)), 11, NAVY, True)], rata='c')
        v = prov_rumah[p]
        bl = 104 * v / p1[1]
        if v:
            k.kotak(xs[2] + 4, y + hrow / 2 - 6, max(bl, 2), 12, BIRU_TUA)
        k.teks(xs[2] + 8 + bl, y, 40, hrow, [R(str(v) if v else '–', 9.19, TEKS, True)], bungkus=False)
        k.teks(xs[3], y, kol[3][1], hrow, [R(f0(sum(e[4] or 0 for e in es)), 9.19, TEKS, True)], rata='c')
        md, lk = sum(e[9] for e in es), sum(e[10] for e in es)
        kb = [x for x in (f'{md} MD' if md else '', f'{lk} luka' if lk else '') if x]
        k.teks(xs[4], y, kol[4][1], hrow, [R(', '.join(kb) or '–', 8.5, MERAH if md else TEKS, True)], rata='c')
        y += hrow
        k.garis_datar(xr, xr + wr, y, TEKS, 0.75)
    # kartu korban
    yk2 = y + 14
    ung = sum(e[11] for e in KEJADIAN)
    for j, (v, lab, m) in enumerate(((sum(e[9] for e in KEJADIAN), 'Meninggal dunia (Dairi, Kendal)', True),
                                     (sum(e[10] for e in KEJADIAN), 'Luka-luka (jiwa)', True), (ung, 'Mengungsi (jiwa, Bogor)', False))):
        kartu(k, xr + j * (wr + 6) / 3, yk2, (wr - 12) / 3, v, lab, m)


# ======================================================================== slide 3: peringatan dini BMKG vs kejadian
def s_bmkg(Dk):
    hasil = [(e, *cocok(e)) for e in KEJADIAN]
    n_dini = sum(1 for _, a, _ in hasil if a)
    n_sebut = sum(1 for _, _, b in hasil if b)
    ev_hari = {(e[0], e[1]) for e in KEJADIAN}
    ph = [(d, p) for d in TGL for p in sorted(dini(d))]
    ph_kosong = [x for x in ph if x not in ev_hari]
    s, k = Dk.slide(judul(f'Hanya [{n_dini}] dari [{len(KEJADIAN)}] kejadian cuaca ekstrem terjadi di provinsi yang pada hari itu '
                          f'berstatus peringatan dini BMKG'))
    # ---- kiri: per kejadian
    xl, wl = 43.2, 400
    kepala_panel(k, xl, 104, wl, 'Kejadian dan peringatan BMKG hari itu', 'peringatan')
    kol = [('LAPHAR', 42, 'c'), ('KAB/KOTA DAN PROVINSI', 152, 'l'), ('PERINGATAN DINI', 103, 'c'), ('HUJAN SEDANG', 103, 'c')]
    baris = []
    for e, a, b in sorted(hasil, key=lambda t: (t[0][0], t[0][2])):
        sedang = e[1] in PER[e[0]]['sedang']
        jenis_p = ('Siaga hujan lebat' if e[1] in PER[e[0]]['siaga'] else 'Awas' if e[1] in PER[e[0]]['awas'] else 'Angin kencang') if a else 'Tidak ada'
        baris.append(('data', [f'{e[0]} Nov', ('runs', [R(e[2], 9, TEKS, True), R(f'  {PROV[e[1]]}', 7, TEKS3)]),
                               ('pil', jenis_p, False, 8) if a else ('runs', [R('Tidak ada', 8.5, MERAH, True)]),
                               ('runs', [R('Disebut' if sedang else 'Tidak disebut', 8.5, BIRU_TUA if sedang else MERAH, True)])], 26))
    yb = tabel(k, xl, 140, kol, baris, bawah=440, pt=9)
    # kartu ringkas
    k.teks(xl, yb + 6, wl, 26, [R('Peringatan dini: Siaga atau Awas hujan lebat, atau angin kencang. Hujan sedang: provinsi yang disebut '
                                  'perlu waspada hujan sedang di laporan BMKG yang sama.', 7.5, TEKS3)], jangkar='t')
    kartu(k, xl, 464, (wl - 6) / 2, f'{n_dini} dari {len(KEJADIAN)}', 'kejadian di provinsi berperingatan dini', False)
    kartu(k, xl + (wl + 6) / 2, 464, (wl - 6) / 2, f'{len(KEJADIAN) - n_sebut} dari {len(KEJADIAN)}', 'kejadian di provinsi yang sama sekali tidak disebut', True)
    # ---- kanan: kisi provinsi x hari
    xr, wr = 463, 453.8
    kepala_panel(k, xr, 104, wr, 'Peringatan dini per provinsi dan hari', 'kalender', 'laporan pagi BMKG; titik = kejadian baru')
    prov = sorted({p for d in TGL for p in dini(d)} | {e[1] for e in KEJADIAN})
    prov.sort(key=lambda p: (-sum(1 for d in TGL if p in dini(d)), p))
    wn, wc = 118, (wr - 118) / 7
    yh = 140
    k.bulat(xr, yh, wr, 16.6, NAVY, radius=3)
    k.teks(xr, yh, wn, 16.6, [R('PROVINSI', 7.5, PUTIH, True, 0.6)], kiri=8, bungkus=False)
    for i, d in enumerate(TGL):
        k.teks(xr + wn + i * wc, yh, wc, 16.6, [R(f'{d} NOV', 7.5, PUTIH, True, 0.6)], rata='c', bungkus=False)
    y, hr = yh + 18.6, 19
    for p in prov:
        k.teks(xr, y, wn, hr, [R(PROV[p], 8.5, TEKS, True)], kiri=8, bungkus=False)
        for i, d in enumerate(TGL):
            cx = xr + wn + i * wc
            s_, a_ = p in PER[d]['siaga'] | PER[d]['awas'], p in PER[d]['angin']
            if s_ or a_:
                if s_ and a_:
                    k.kotak(cx + 2, y + 1.5, (wc - 4) / 2, hr - 3, SIAGA)
                    k.kotak(cx + 2 + (wc - 4) / 2, y + 1.5, (wc - 4) / 2, hr - 3, BIRU_TUA)
                else:
                    k.kotak(cx + 2, y + 1.5, wc - 4, hr - 3, SIAGA if s_ else BIRU_TUA)
            elif p in PER[d]['sedang']:
                k.kotak(cx + 2, y + 1.5, wc - 4, hr - 3, PITA_BIRU)
            n_ev = sum(1 for e in KEJADIAN if e[0] == d and e[1] == p)
            if n_ev:
                dd = 12.5
                k.kotak(cx + (wc - dd) / 2, y + (hr - dd) / 2, dd, dd, MERAH, PUTIH, 1, bentuk=MSO_SHAPE.OVAL)
                k.teks(cx, y, wc, hr, [R(str(n_ev), 7.5, PUTIH, True)], rata='c', bungkus=False)
        y += hr
        k.garis_datar(xr, xr + wr, y, NETRAL_PITA, 0.5)
    # legenda
    y += 6
    lg = [(SIAGA, 'Siaga hujan lebat'), (BIRU_TUA, 'Angin kencang'), (PITA_BIRU, 'Waspada hujan sedang'), (MERAH, 'Kejadian baru')]
    x = xr
    for w, lab in lg:
        if w == MERAH:
            k.kotak(x, y + 2, 10, 10, MERAH, bentuk=MSO_SHAPE.OVAL)
        else:
            k.kotak(x, y + 2.5, 14, 9, w)
        k.teks(x + 18, y, 110, 14, [R(lab, 7.5, TEKS)], bungkus=False)
        x += 18 + len(lab) * 4.1 + 16
    # aturan dan temuan
    y += 22
    k.bulat(xr, y, wr, 500 - y, NETRAL_MUDA, radius=4)
    k.teks(xr + 10, y + 6, wr - 20, 500 - y - 12, [
        R('Aturan pencocokan. ', 8, NAVY, True),
        R('Kejadian dihitung terperingatkan bila provinsinya tercantum Siaga atau Awas hujan lebat, atau angin kencang, di laporan pagi BMKG '
          'kepada Kepala BNPB pada tanggal laphar yang sama (terkirim sebelum pukul 07.00 WIB, awal periode laphar). Pencocokan tingkat provinsi.', 7.5, TEKS2),
        '\n',
        R('Temuan. ', 8, NAVY, True),
        R(f'{len(ph_kosong)} dari {len(ph)} provinsi-hari berperingatan dini tanpa kejadian cuaca ekstrem baru. Laporan 8 Nov (periode 6 s.d. 8 Nov) '
          'baru memasukkan Jawa Barat dan Lampung, sesudah tiga kejadian di kedua provinsi itu pada 6 dan 7 Nov.', 7.5, TEKS2)],
        jangkar='t', rata='j', spasi=1.0)


# ======================================================================== slide 4: prakiraan 9 s.d. 12 Nov
GEO_PROV = os.path.join(REPO, 'public', 'geo', 'provinsi.json')
EXT_ID = (94.8, 141.2, 6.3, -11.2)


def peta_prov(path, ext, px, warna):
    lon0, lon1, la1, la0 = ext; Wd, H = px
    pr = lambda x, y: ((x - lon0) / (lon1 - lon0) * Wd, (la1 - y) / (la1 - la0) * H)
    im = Image.new('RGBA', (Wd, H), (0, 0, 0, 0)); dr = ImageDraw.Draw(im)
    for f in json.load(open(GEO_PROV, encoding='utf-8'))['features']:
        w = warna.get(f['properties']['kode'])
        isi = BL.RGB(w) if w else BL.DARAT
        g = f['geometry']
        for poly in (g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]):
            pts = [pr(x, y) for x, y in poly[0]]
            dr.polygon(pts, fill=isi)
            for lubang in poly[1:]:
                dr.polygon([pr(x, y) for x, y in lubang], fill=(0, 0, 0, 0))
            dr.line(pts + pts[:1], fill=BL.BATAS, width=2)
    im.save(path)
    return pr


def pusat_prov(kp):
    f = next(f for f in json.load(open(GEO_PROV, encoding='utf-8'))['features'] if f['properties']['kode'] == kp)
    g = f['geometry']
    best = max((poly[0] for poly in (g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']])), key=lambda r: abs(BL._luas(r)))
    a = BL._luas(best); cx = cy = 0
    for (x0, y0), (x1, y1) in zip(best, best[1:] + best[:1]):
        c = x0 * y1 - x1 * y0; cx += (x0 + x1) * c; cy += (y0 + y1) * c
    return cx / (6 * a), cy / (6 * a)


def s_prakiraan(Dk):
    awas, siaga, angin, sedang = sorted(P9['awas']), sorted(P9['siaga']), sorted(P9['angin']), P9['sedang']
    s, k = Dk.slide(judul(f'[{PROV[awas[0]]}] berstatus Awas dan [{len(siaga)}] provinsi lain Siaga hujan lebat menurut BMKG '
                          'untuk 9 s.d. 12 November 2026'))
    warna = {}
    for p in sedang:
        warna[p] = PITA_BIRU
    for p in angin:
        warna[p] = BIRU_TUA
    for p in siaga:
        warna[p] = SIAGA
    for p in awas:
        warna[p] = MERAH
    xm, ym, wm = 43.2, 104, 560
    hm = wm * (EXT_ID[2] - EXT_ID[3]) / (EXT_ID[1] - EXT_ID[0])
    px = (2400, int(2400 * hm / wm))
    png = os.path.join(SINI, 'bahan', 'peta-prakiraan.png')
    pr = peta_prov(png, EXT_ID, px, warna)
    k.gambar(png, xm, ym, wm, hm)
    ke = lambda lon, lat: (xm + pr(lon, lat)[0] / px[0] * wm, ym + pr(lon, lat)[1] / px[1] * hm)
    POS = {'12': (150, 110, 'Awas', True), '11': (60, 150, 'Siaga', True), '13': (60, 228, 'Siaga', True), '93': (420, 290, 'Angin kencang', False)}
    for p in awas + siaga + angin:
        x, y, st, m = POS[p]
        label(k, x, y, PROV[p], st, m, ke(*pusat_prov(p)))
    # legenda
    yl = ym + hm + 6
    x = xm
    for w, lab in ((MERAH, 'Awas hujan sangat lebat'), (SIAGA, 'Siaga hujan lebat'), (BIRU_TUA, 'Angin kencang'),
                   (PITA_BIRU, f'Waspada hujan sedang ({len(sedang)} provinsi)')):
        k.kotak(x, yl + 2.5, 14, 9, w)
        k.teks(x + 18, yl, 160, 14, [R(lab, 7.5, TEKS)], bungkus=False)
        x += 18 + len(lab) * 4.1 + 18
    # ---- kiri bawah: kab/kota hujan lebat menurut model
    yt = yl + 26
    lebat = PRA['lebat']
    kepala_panel(k, xm, yt, wm, f'Hujan lebat 50 mm atau lebih per hari: {len(lebat)} kab/kota', 'cuaca-ekstrem',
                 f'prakiraan model per kab/kota terbit 9 Nov, berlaku {tgl_teks(PRA["hari"][0])} s.d. {tgl_teks(PRA["hari"][-1])}')
    kol = [('KAB/KOTA', 190, 'l'), ('PROVINSI', 170, 'l'), ('TANGGAL', 90, 'c'), ('HUJAN (MM)', 110, 'c')]
    baris = [('data', [n.replace('Kab. ', ''), PROV[p], tgl_teks(h), f'{v:.0f}']) for v, h, (n, p) in lebat]
    tabel(k, xm, yt + 36, kol, baris, bawah=497, pt=9)
    # ---- kanan: ringkas BMKG + kab/kota kejadian sepekan
    xr, wr = 620, 296.8
    kepala_panel(k, xr, 104, wr, 'Kab/kota kejadian sepekan', 'wilayah')
    k.teks(xr, 136, wr, 22, [R(f'Hujan harian tertinggi menurut model, {tgl_teks(PRA["hari"][0])} s.d. {tgl_teks(PRA["hari"][-1])}; '
                                'status = peringatan BMKG 9 Nov untuk provinsinya', 7, TEKS3)], jangkar='t')
    kol = [('KAB/KOTA', 112, 'l'), ('HUJAN (MM)', 74, 'c'), ('BMKG 9 NOV', 110.8, 'c')]
    baris = []
    for e in sorted(KEJADIAN, key=lambda e: -PRA['ev'][e[2]][0]):
        v, h = PRA['ev'][e[2]]
        st = 'Awas' if e[1] in P9['awas'] else 'Siaga' if e[1] in P9['siaga'] else 'Angin kencang' if e[1] in P9['angin'] else \
            'Waspada hujan sedang' if e[1] in sedang else 'Tidak disebut'
        baris.append(('data', [e[2], ('runs', [R(f'{v:.0f}', 9, TEKS, True), R(f'  {tgl_teks(h)}', 7, TEKS3)]),
                               ('pil', st, False, 7.8) if st in ('Waspada hujan sedang', 'Tidak disebut') else ('pil', st, True, 7.8)], 25))
    yb = tabel(k, xr, 160, kol, baris, bawah=416, pt=9)
    k.bulat(xr, yb + 8, wr, 497 - yb - 8, NETRAL_MUDA, radius=4)
    k.teks(xr + 10, yb + 14, wr - 20, 497 - yb - 24, [
        R('Cakupan. ', 8, NAVY, True),
        R('Prakiraan yang diterima sampai 9 Nov berlaku hingga 12 Nov; prakiraan 13 s.d. 15 Nov belum terbit pada tanggal paparan. ', 7.5, TEKS2),
        R(f'Muka laut di {PRA["rob_n"]} kab/kota pesisir pantauan tidak melewati ambang rob {tgl_teks(PRA["hari"][0])} s.d. '
          f'{tgl_teks(PRA["hari"][-1])}. ', 7.5, TEKS2),
        R(f'Provinsi tempat {sum(1 for e in KEJADIAN if e[1] in sedang)} kejadian sepekan di Lampung dan Pulau Jawa masih disebut waspada '
          'hujan sedang; hujan disertai angin kencang dapat terjadi lokal di luar peringatan dini.', 7.5, TEKS2)], jangkar='t', rata='j')


# ======================================================================== slide 5: rekomendasi
def s_rekom(Dk):
    jt = [e for e in KEJADIAN if e[1] == '35']
    n_luar = sum(1 for e in KEJADIAN if not cocok(e)[0])
    REKOM = [
        ('peringatan', 'Siagakan Sumatera Utara', 'Awas',
         f'Pantau hujan harian bersama BMKG di Sumatera Utara (Awas) serta Aceh dan Sumatera Barat (Siaga); siapkan evakuasi di kab/kota '
         f'yang diprakirakan hujan 50 mm atau lebih ({", ".join(n.replace("Kab. ", "") for _, _, (n, _) in PRA["lebat"][:4])}).',
         ['BPBD Sumatera Utara', 'BPBD Aceh', 'BPBD Sumatera Barat', 'BMKG'], '9 s.d. 12 Nov'),
        ('data', 'Teruskan peringatan per kecamatan', 'Dini',
         f'{n_luar} dari {len(KEJADIAN)} kejadian sepekan terjadi di provinsi tanpa peringatan dini. Minta BMKG meneruskan peringatan dini '
         'cuaca per kecamatan berjangka jam ke Pusdalops BNPB dan BPBD di Pulau Jawa dan Lampung.',
         ['Pusdalops BNPB', 'BMKG', 'BPBD provinsi'], 'Mulai 10 Nov'),
        ('pascabencana', 'Perbaikan rumah di Jawa Timur', 'Jatim',
         f'{sum(rumah(e) for e in jt)} rumah rusak di {len(jt)} kab/kota Jawa Timur, terbanyak di Jember ({rumah(jt[-1])}); sebagian warga memperbaiki secara mandiri. '
         'Verifikasi data rumah dan siapkan bahan bangunan atau stimulan perbaikan.',
         ['BPBD Jawa Timur', 'Deputi Penanganan Darurat'], '9 s.d. 15 Nov'),
        ('ringkasan', 'Lengkapi data kejadian', 'Data',
         'Serdang Bedagai belum merinci tingkat kerusakan 10 rumah; Sumenep masih pendataan; Dairi, Brebes, Kediri, dan Jember belum '
         'melaporkan jiwa terdampak.', ['Pusdalops BNPB', 'BPBD kab/kota'], 's.d. 11 Nov'),
        ('jiwa', 'Kurangi korban saat angin kencang', 'Korban',
         'Dua jiwa meninggal (Dairi, Kendal) dan 9 jiwa luka. Sebarkan imbauan menjauhi pohon dan bangunan rapuh saat hujan disertai angin, '
         'dan pangkas pohon rawan tumbang di permukiman seperti di Bogor.', ['BPBD kab/kota', 'Pemerintah daerah'], '9 s.d. 15 Nov'),
    ]
    s, k = Dk.slide(judul(f'Lima langkah tindak lanjut sampai [15 November 2026], dimulai dari kesiapsiagaan '
                          f'[{PROV[sorted(P9["awas"])[0]]}] yang berstatus Awas'))
    k.bulat(43.2, 102, 873.6, 18, NAVY, radius=4)
    for x, w, h in ((43.2, 250, 'LANGKAH'), (300, 340, 'RINCIAN'), (650, 186, 'PELAKSANA'), (836, 80.8, 'WAKTU')):
        k.teks(x, 102, w, 18, [R(h, 7.5, PUTIH, True, 0.6)], rata='c', bungkus=False)
    y0, hb = 122, 75
    for i, (kon, lk, _, rc, pk, wkt) in enumerate(REKOM):
        y = y0 + i * hb
        k.ikon_bulat(kon, 52, y + hb / 2 - 15, 30)
        k.teks(90, y, 205, hb, [R(lk, 11, NAVY, True)])   # pemilik 13 Nov: heading tidak diawali nomor
        k.teks(300, y, 340, hb, [R(rc, 9, TEKS2)], rata='j')
        baris_chip, cx = [[]], 650
        for p in pk:
            w = 24 + len(p) * 4.05
            if cx + w > 832 and baris_chip[-1]:
                baris_chip.append([]); cx = 650
            baris_chip[-1].append((p, cx, w)); cx += w + 5
        cy = y + hb / 2 - (len(baris_chip) * 17 - 3) / 2
        j = 0
        for bc in baris_chip:
            for p, cx, w in bc:
                utama = j == 0
                k.bulat(cx, cy, w, 14, NAVY if utama else PUTIH, None if utama else GARIS)
                k.gambar(ikon('lembaga', 'kertas' if utama else 'navy'), cx + 5, cy + 3, 8, 8)
                k.teks(cx + 16, cy, w - 18, 14, [R(p, 7, PUTIH if utama else TEKS, True)], bungkus=False)
                j += 1
            cy += 17
        k.teks(836, y, 80.8, hb, [R(wkt, 9, NAVY, True)], rata='c')
        k.garis_datar(43.2, 916.8, y + hb, GARIS if i < len(REKOM) - 1 else TEKS, 0.5 if i < len(REKOM) - 1 else 0.75)
    return REKOM


# ======================================================================== rakit
def main():
    urai()
    Dk = BL.Deck()
    s_peta(Dk)
    s_pola(Dk)
    s_bmkg(Dk)
    s_prakiraan(Dk)
    s_rekom(Dk)
    isi = os.path.join(SINI, f'{NAMA}.pptx')
    Dk.I.simpan(isi)
    if '--isi' in sys.argv:
        print('isi saja:', isi); return
    S_PRA = 'Laporan pagi BMKG, 9 Nov 2026; prakiraan hujan dan muka laut Open-Meteo olahan Tim Sus IT BNPB, terbit 9 Nov 2026'
    S_GAB = 'Laporan harian Dit. Koordalops BNPB dan laporan pagi BMKG, 2 s.d. 8 Nov 2026'
    sumber = {1: S_KOORD, 2: S_KOORD, 3: S_GAB, 4: S_PRA, 5: 'Laporan harian Dit. Koordalops BNPB dan laporan pagi BMKG, 2 s.d. 9 Nov 2026'}
    bag = {1: 1, 2: 1, 3: 2, 4: 3, 5: 4}
    susun = [{'jenis': 'sampul'}, {'jenis': 'daftar-isi'}]
    susun += [{'halaman': n, 'bagian': bag[n], 'sumber': sumber[n]} for n in range(1, 6)]
    foto = os.path.join(SINI, 'bahan', 'sampul.jpg').replace(os.sep, '/')   # public/img/bencana-cuaca.jpg dipangkas (kredit.json)
    kredit = 'Citra: NASA LANCE/MODIS Aqua, Siklon Tropis Seroja 2021, domain publik, Wikimedia Commons'
    susun.append({'jenis': 'penutup', 'layout': 'putih', 'foto': [foto], 'kredit': kredit})
    tetap = {}
    for no, b in enumerate(susun, 1):
        if b.get('bagian'):
            tetap.setdefault(b['bagian'], []).append(no)
    bagian = [{'judul': j, 'label': j} for j in ('Kejadian cuaca ekstrem sepekan', 'Peringatan dini BMKG',
                                                 'Prakiraan cuaca ke depan', 'Rekomendasi tindak lanjut')]
    for n, b in enumerate(bagian, 1):
        b['halaman_tetap'] = tetap[n]
    import lewat_deck
    keluar = lewat_deck.bingkai(
        isi, 'kajian', 'Laporan Situasi Cuaca Ekstrem', 'Senin, 2 November s.d. Minggu, 8 November 2026', date(2026, 11, 9),
        foto=([foto], kredit), penyaji={'nama': 'Tim Ahli dan Tim Sus IT BNPB', 'jabatan': 'Badan Nasional Penanggulangan Bencana'},
        kepada='Disampaikan kepada Kepala Badan Nasional Penanggulangan Bencana', bagian=bagian, susun=susun,
        spek_tambah={'panel_sisi': 'gelap', 'subjek_dokumen': 'Paparan Situasi Cuaca Ekstrem Mingguan', 'skala_logo_bnpb': 1.1})
    print(keluar)


if __name__ == '__main__':
    main()
