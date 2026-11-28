"""Laporan harian 281126 (format 3 slide: Ringkasan, Rincian lokasi, Status siaga), data WA Koordalops 27 Nov 07.00-19.00 WIB,
BMKG & PVMBG 27 Nov 18.00 WIB; turunan harian/2026-11/2026-11-25/jalan.py."""
import datetime as dt, json, os, re as _re, shutil, subprocess, sys, zipfile as Z

S = os.path.dirname(os.path.abspath(__file__))
G = os.path.normpath(os.path.join(S, '..', '..', '..', 'generator'))
sys.path.insert(0, G)
os.chdir(G)

import harian, wa_harian

AWAL = os.environ.get('VERSI_AWAL', '1') == '1'
ALT2 = os.environ.get('ALT', '2') == '2'
if AWAL:
    sys.path.insert(0, S)
    import desain_kemarin
    desain_kemarin.pasang(('judul', 's2') if ALT2 else desain_kemarin.NAMA)

for _j, _w in (
    ('banjir', ('2F86D1', 'DCEBF8')),
    ('cuaca', ('3D6B5A', 'E3EDE8')),
    ('angin', ('3D6B5A', 'E3EDE8')),
    ('longsor', ('A07A32', 'F4ECDC')),
    ('gempabumi', ('4B4F58', 'E6EAF0')),
):
    harian.JENIS_LAIN[_j] = harian.JENIS_LAIN[_j][:2] + _w

OUT = S
os.makedirs(OUT, exist_ok=True)
T = dt.date(2026, 11, 28)
harian.angka_karhutla = lambda kej, web, tanggal, jam: (T, '07:00', set(), lambda k: {})


def wa_normal(t):
    t = _re.sub(r'\n(\d+) ?\.(?=Bencana)', r'\n\1. ', t)
    t = t.replace('- ⁠', '- ')
    t = _re.sub(r'\bKab (?=[A-Z])', 'Kab. ', t).replace('*(Pengkinian data)*', '(Pengkinian Data)').replace('*(Pengkinian Data*)', '(Pengkinian Data)')
    t = _re.sub(r'\bKota\. (?=[A-Z])', 'Kota ', t)
    t = _re.sub(r'\*([A-Z])\. Prov\.\s+', r'*\1. Prov. ', t)
    t = _re.sub(r'\n\* ', '\n- ', t)
    t = _re.sub(r'\nDetail:', '\n- Detail:', t)
    t = t.replace('*(Kejadian Baru)*', '(Kejadian Baru)').replace('*(Pengkinian Data)*', '(Pengkinian Data)')
    t = t.replace('Bencana Alam Angin Kencang', 'Bencana Alam Cuaca Ekstrem')
    t = t.replace('Bencana Alam Longsor ', 'Bencana Alam Tanah Longsor ')
    t = t.replace('Kab. Aceh Singkil Prov. Aceh', 'Kab. Aceh Singkil')
    t = t.replace('Kab. Garut Prov. Jawa Barat', 'Kab. Garut')
    t = t.replace('Kab. Bandung,', 'Kab. Bandung')
    n_ = len(_re.findall(r'\n\d+\.\s', t))
    print('WA: kejadian dirinci', n_)
    return _re.sub(r'(sejumlah\s+)\d+', lambda m: m[1] + str(n_), t)


BMKG_TEKS = open(f'{S}/wa-bmkg.txt', encoding='utf-8').read().replace('Sumatra ', 'Sumatera ')
_WA_TEKS = wa_normal(open(f'{S}/wa-koordalops.txt', encoding='utf-8').read())
wa = wa_harian.koordalops(_WA_TEKS, pagi=False)
w = wa_harian.bmkg(BMKG_TEKS)

ke = os.path.join(OUT, 'kerja-281126')
harian.SIMPAN = os.path.isdir(os.path.join(ke, 'web')) and os.environ.get('SEGAR') != '1'
print('mode', 'simpanan' if harian.SIMPAN else 'unduh segar')
web = harian.ambil_web(os.path.join(ke, 'web'))
D = harian.susun(wa, web, T, None)

# Format harian tanpa karhutla.
n_kh = sum(1 for x in wa['kejadian'] if x['jenis'] == 'karhutla')
D['kejadian'] = [x for x in D['kejadian'] if x['jenis'] != 'karhutla']
wa['kejadian'] = [x for x in wa['kejadian'] if x['jenis'] != 'karhutla']
wa['laporan'] -= n_kh
print('tanpa karhutla: laporan', wa['laporan'], 'menonjol', len(D['kejadian']))

# Banjir Kab. Bandung dan Longsor Kab. Cianjur tercatat *(Kejadian Baru)* pada rekap pagi 27 Nov (laphar 26/11 entri 31 dan 19).
# Cuaca Ekstrem Kab. Bandung hanya "Masih dalam penanganan" (kejadian angin sudah lewat), sehingga tidak masuk bencana berlangsung.
BERLANGSUNG = {
    ('banjir', 'Kota Subulussalam'): '2026-11-19',
    ('banjir', 'Aceh Singkil'): '2026-11-14',
    ('banjir', 'Bandung'): '2026-11-26',
    ('longsor', 'Cianjur'): '2026-11-26',
}
MULAI_BARU = {
    k: '2026-11-27'
    for k in (
        ('banjir', 'Gayo Lues'),
        ('longsor', 'Garut'),
        ('banjir', 'Cilacap'),
        ('banjir', 'Nganjuk'),
        ('banjir', 'Nunukan'),
    )
}
KJ = lambda x: (x['jenis'], x.get('lokasi'))

lama = [f"{x['jenis']} {x['lokasi'] or x['prov']}" for x in D['kejadian'] if not x.get('baru') and KJ(x) not in BERLANGSUNG]
D['kejadian'] = [x for x in D['kejadian'] if x.get('baru') or KJ(x) in BERLANGSUNG]
wa['kejadian'] = [x for x in wa['kejadian'] if x.get('baru') or KJ(x) in BERLANGSUNG]
for x in D['kejadian']:
    x['baru'] = KJ(x) in MULAI_BARU
    x['mulai'] = MULAI_BARU.get(KJ(x)) or BERLANGSUNG[KJ(x)]
    if x['lokasi'] == 'Garut':
        x['dampak_pil'] = '1 hilang'
    elif x['lokasi'] == 'Kota Subulussalam':
        x['dampak_pil'] = '2.666 KK'
    elif x['lokasi'] == 'Gayo Lues':
        x['dampak_pil'] = '8 KK'
print('dibuang (hanya penanganan):', lama, '| tampil:', [(x['jenis'], x['lokasi'], x['mulai'], 'baru' if x['baru'] else 'berlangsung') for x in D['kejadian']])

json.dump({**D, 'kejadian': [{**x, 'perhatian': False} for x in D['kejadian']]}, open(os.path.join(ke, 'data.json'), 'w'), ensure_ascii=False, indent=1)
if os.environ.get('UNGGAH_DALOPS') == '1':
    subprocess.run([sys.executable, 'scripts/data/dalops_banjir.py', '--unggah'], cwd=os.path.normpath(os.path.join(S, '..', '..', '..', '..', '..')))

tpl = os.path.join(G, 'cache', 'templat', 'harian-221026.pptx')
if os.path.isdir(os.path.join(ke, 'tpl')):
    shutil.rmtree(os.path.join(ke, 'tpl'))
Z.ZipFile(tpl).extractall(os.path.join(ke, 'tpl'))
subprocess.run(['node', os.path.join(G, 'harian_peta.mjs'), ke], check=True, stdout=subprocess.DEVNULL)
subprocess.run(['node', os.path.join(G, 'harian_ikon.mjs'), ke], check=True, stdout=subprocess.DEVNULL)

nama = os.path.join(OUT, 'Laporan Kejadian Bencana Harian 281126.pptx')
dk = harian.Deck(ke, D, wa, w, T, None)
dk.BJ = None
dk.TANPA_BARU = False
dk.V3 = dk.KRIS_ISI = True
dk.ALT_RINCI = False
dk.CD_PIL = 960120
dk.INFO_PIL = True
dk.LAMPIRAN = False
dk.SIAGA = True
dk.GA_GAYAS = ['lingkaran']


def pvmbg_normal(t):
    t = _re.sub(r'Level \*([IV]+ \(\w+\))\*', r'Level \1', t)
    t = _re.sub(r'(?m)^> LAPORAN KHUSUS GUNUNG API PADA LEVEL (\w+) \((\w+)\)\s*$', lambda m: f'*Laporan khusus gunung api pada Level {m[1]} ({m[2]})*', t)
    t = _re.sub(r'(?m)^\*\d+\. (Gn\. )', r'*\1', t)
    t = t.replace('*Laporan Khusus Gunung Api pada', '*Laporan khusus gunung api pada')
    t = _re.sub(r'(?m)^\*(Visual|Kegempaan|Rekomendasi):\*[ \t]*$', r'\1:', t)
    return _re.sub(r'(\*Gn\. [^(*\n]+?) \([^)]*\)\*', r'\1*', t)


_pvmbg_asli = wa_harian.pvmbg
wa_harian.pvmbg = lambda t: _pvmbg_asli(pvmbg_normal(t))
dk.GA = wa_harian.pvmbg(open(f'{S}/wa-pvmbg.txt', encoding='utf-8').read())
print('PVMBG', dk.GA['jam'], dk.GA['level'], [(g_['nama'], g_['level'], len(g_['visual']), len(g_['gempa']), len(g_['rekom']), g_['radius'], g_['sektor']) for g_ in dk.GA['gunung']])
dk.LAMP_TAMBAH = []

if AWAL and ALT2:
    dk.TANPA_KONDISI = True
    dk.KARTU_ALT = dk.SIAGA_INFO = dk.TINDAK_INFO = True
    dk.KOLOM_MULAI = False
    dk.INFO_Y = (1280160, 5010912)
    dk.PERINGATAN_PETA = [
        (95.75, 5.10, '|Hujan lebat', 'oranye', 'kiri'),
        (99.10, 2.00, 'Sumut|Hujan lebat', 'oranye', 'kanan'),
        (100.30, -0.70, 'Sumbar|Hujan lebat', 'oranye', 'kiri'),
        (102.20, -3.70, 'Bengkulu|Hujan lebat', 'oranye', 'kiri'),
        (104.20, -3.30, 'Sumsel|Hujan lebat', 'oranye', 'kanan'),
        (106.30, -2.00, 'Kep. Babel|Hujan lebat', 'oranye', 'kanan'),
        (105.00, -4.70, 'Lampung|Hujan lebat', 'oranye', 'kanan'),
        (105.80, -6.65, 'Banten|Hujan lebat', 'oranye', 'kiri'),
        (106.85, -5.92, 'Jakarta|Hujan lebat', 'oranye', 'kiri'),
        (115.30, -8.45, 'Bali|Hujan lebat', 'oranye', 'kanan'),
        (121.00, -9.70, 'NTT|Hujan lebat', 'oranye', 'kanan'),
        (122.30, 0.65, 'Gorontalo|Hujan lebat', 'oranye', 'kiri'),
        (124.70, 1.30, 'Sulut|Angin kencang', 'oranye', 'kanan'),
        (127.90, 0.70, 'Malut|Hujan lebat', 'oranye', 'kanan'),
        (135.80, -3.30, 'Papua Tengah|Hujan lebat', 'oranye', 'kiri'),
        (139.60, -4.50, 'Papua Pegunungan|Hujan lebat', 'oranye', 'kiri'),
    ]
    dk.JUDUL_STRIP = 'RENCANA AKSI'
    dk.STRIP_KARTU = [
        ('banjir_putih', 'Banjir', 'Memantau banjir di lima provinsi (±12.211 KK, 18 jiwa mengungsi).'),
        ('longsor_putih', 'Tanah longsor', 'Mencari satu korban hilang di Garut dan memantau ±398 KK di Cianjur.'),
    ]
    dk.PERINGATAN_KET = True
    dk.RES_T = 1620000
    dk.PERINGATAN_BARIS = [
        (
            'hujansolid_oranye',
            'Hujan lebat',
            'Aceh, Sumut, Sumbar, Sumsel,\nKep. Babel, Bengkulu, Lampung,\nBanten, DKI Jakarta, Jabar,\nJatim, Bali, NTT, Gorontalo,\nMalut, Papua Tengah,\nPapua Pegunungan',
            'Siaga',
            'oranye',
            '27–29 November',
        ),
        (
            'anginsolid_oranye',
            'Angin kencang',
            'Sulawesi Utara',
            'Berpotensi',
            'oranye',
            '27–29 November',
        ),
    ]
    dk.tindak = lambda: [
        ('awas_putih', 'Peringatan dini', [
            '•  Hujan lebat Siaga berlaku di 17 provinsi (27–29 Nov)',
            '•  Angin kencang berpotensi terjadi di Sulawesi Utara',
        ])
    ]

    judul_asli = dk.judul

    def _judul_jenis(a):
        nm_ = lambda j: 'kekeringan' if j == 'kekeringan' else (lambda v: v[0][0].lower() + v[0][1:])(harian.JENIS_LAIN[j])
        urut_ = ['banjir', 'cuaca', 'kekeringan'] + [j for j in harian.JENIS_LAIN if j not in ('banjir', 'cuaca')]
        hit_ = [(n_, nm_(j)) for j in urut_ for n_ in [sum(1 for x in D['kejadian'] if x['jenis'] == j)] if n_]
        o_ = [(a[0][0].rstrip(': ') + ': Terdapat ', *a[0][1:]), a[1], (' kejadian bencana dengan rincian ', *a[0][1:])]
        for i_, (n_, l_) in enumerate(hit_):
            if i_:
                o_.append((', dan ' if i_ == len(hit_) - 1 and len(hit_) > 2 else ' dan ' if i_ == len(hit_) - 1 else ', ', *a[0][1:]))
            o_ += [(harian.f0(n_), *a[1][1:]), (' ' + l_, *a[0][1:])]
        return o_

    dk.judul = lambda: (lambda a, b: (_judul_jenis(a), b))(*judul_asli())
    _jx = dk.judul_xml
    dk.judul_xml = lambda j_, sz_: _jx(j_, min(sz_, 1800))

sys.path.insert(0, S)
import rincian

_TIMPA = {
    ('banjir', 'Kota Subulussalam'): {'kerusakan': '±2.010 rumah, jalan, lahan, fasilitas'},
    ('banjir', 'Gayo Lues'): {'kerusakan': '8 rumah'},
    ('banjir', 'Aceh Singkil'): {'kerusakan': '±3.585 rumah, 15 jalan, 5 jembatan, 5 tiang listrik'},
    ('banjir', 'Bandung'): {'kerusakan': '±4.568 rumah, 53 fasilitas, 1 tanggul, 3 jalan'},
    ('banjir', 'Cilacap'): {'dampak': 'Pendataan', 'kerusakan': '3 ruko, jalan, lahan, irigasi'},
    ('banjir', 'Nganjuk'): {'kerusakan': '12 rumah, jalan'},
    ('banjir', 'Nunukan'): {'kerusakan': '4 sekolah, 2 fasum'},
    ('longsor', 'Cianjur'): {'kerusakan': '2 rumah, 3 sekolah, 1 jembatan, 1 jalan'},
    ('longsor', 'Garut'): {'kerusakan': '1 rumah'},
}
_isi_r = rincian.siapkan(_WA_TEKS, _TIMPA)
_nk = len(D['kejadian'])
_nkab = len({x['lokasi'] for x in D['kejadian']})
_npv = len({x['prov'] for x in D['kejadian']})
dk.HAL_TAMBAH = [
    (
        [
            ('Rincian lokasi: ', harian.INK, True),
            (f'{_nk} kejadian', harian.ORG, True),
            (' di ', harian.INK, True),
            (f'{_nkab} kab/kota', harian.ORG, True),
            (' dan ', harian.INK, True),
            (f'{_npv} provinsi', harian.ORG, True),
        ],
        lambda: rincian.gambar(dk, harian, _isi_r),
    )
]

dk.SKALA_LINGKARAN = {p_: 0.75 for p_ in ('32', '33', '35')}
dk.GUNUNG_LABEL = {'Merapi': 'kanan', 'Semeru': 'kanan'}
dk.POSISI_DARAT = {'32': (107.55, -7.18), '33': (109.90, -7.08), '35': (112.25, -7.55)}
dk.LABEL_URUT = {'32': ['bawah'], '33': ['atas'], '35': ['atas']}

dk.lbl_kolom, dk.lbl_hot, dk.lbl_kum = 'HOTSPOT DAN SISA', 'hotspot', 'TERBAKAR'
dk.bangun(tpl, nama)
print('ok', nama, '| kejadian', dk.N_TOT, '| tampil', len(D['kejadian']))

import lewat_deck, pdf
from pptx import Presentation as _P

_hal = {i + 1: ' '.join(sh.text_frame.text for sh in sl.shapes if sh.has_text_frame) for i, sl in enumerate(_P(nama).slides)}
H_RING = next(i for i, t in _hal.items() if 'INFORMASI BENCANA' in t)
H_RINC = next(i for i, t in _hal.items() if 'RINCIAN LOKASI KEJADIAN' in t)
H_SIAGA = next(i for i, t in _hal.items() if 'Status siaga bencana' in t)
print('halaman generator: ringkasan', H_RING, 'rincian', H_RINC, 'status siaga', H_SIAGA)

SK = 'Laporan Harian Dit. Koordalops BNPB, 27 Nov 2026 07.00 s.d. 19.00 WIB'
SR = {'sumber': SK + '; BMKG & PVMBG, 27 Nov 2026 18.00 WIB'}
SV = {'sumber': 'PVMBG Badan Geologi, 27 Nov 2026 18.00 WIB; definisi status Permen ESDM 15/2011'}
B_R = {'judul': 'Ringkasan Situasi', 'label': 'Ringkasan', 'halaman_tetap': [1]}
B_D = {'judul': 'Rincian Lokasi', 'label': 'Rincian lokasi', 'halaman_tetap': [2]}
B_S = {'judul': 'Status Siaga Bencana', 'label': 'Status siaga', 'halaman_tetap': [3]}

lewat_deck.bingkai(
    nama,
    'harian',
    'Laporan Kejadian Bencana Harian',
    'Periode 27 Nov 2026, 07.00 s.d. 19.00 WIB',
    T,
    pdf=False,
    tanpa_kepada='pemilik 2 Nov 2026: pil Disampaikan kepada dihapus, laporan harian dipresentasikan Kepala BNPB sendiri',
    bagian=[B_R, B_D, B_S],
    spek_tambah={'panel_sisi': 'gelap'},
    susun=[
        dict(SR, halaman=H_RING, bagian=1),
        dict({'sumber': SK}, halaman=H_RINC, bagian=2),
        dict(SV, halaman=H_SIAGA, bagian=3),
    ],
)
print('mesin ok', nama)
pdf_ = pdf.ke_pdf(nama)
rev = lewat_deck.serah_revisi(nama, pdf_)
print('folder', rev)
