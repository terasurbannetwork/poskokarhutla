"""Paparan "Laporan Situasi Kebakaran Hutan dan Lahan" sepekan 2 s.d. 8 Nov 2026 (paparan 9 Nov 2026, dibuat 12 Nov 2026).

Desain dan alat gambar = deck banjir-longsor sepekan 091126 (../banjir-longsor-sepekan-2026-11-09/buat.py, dipakai ulang lewat importlib).

Angka hotspot, firespot, luas terbakar, dan belum padam HANYA dari sistem kita (aturan pemilik), metode deck Penanganan harian:
- hotspot per hari kalender WIB = harian30.json; luas, belum padam, padam per hari = peta_karhutla.json (hari api yang sama);
  keduanya salinan situs di ../satelit-2026-11-12/web (rilis 12 Nov 2026 17.58 WIB, hari 26 Okt s.d. 8 Nov sudah lengkap);
- firespot = kluster_hari/<hari>.json kolom indeks 4, salinan terbaru tiap hari di ../satelit-*/web;
- luas dan belum padam per kab/kota = public/data/peta_karhutla_kab.json (rilis 9 Nov 2026 19.15 WIB, rumus sama).
Teks WA Koordalops (harian-2026-11-03..09) dan laporan Satgas (satelit-2026-11-0N/wa-satgas.txt) hanya untuk status darurat dan
kegiatan penanganan (tanpa angka luas/hotspot/belum padam mereka). Kegiatan 6 Nov tidak ada (folder satelit-2026-11-07 tidak ada).
Cuaca: WA BMKG 9 Nov 2026 (periode 9 s.d. 12 Nov).

    python buat.py          # isi.pptx -> deck.py (sampul, daftar isi, tab bagian, penutup) -> PPTX + PDF
    python buat.py --isi    # hanya slide isi
"""
import datetime as dt, glob, importlib.util, json, math, os, sys
from datetime import date

from pptx.enum.shapes import MSO_SHAPE

SINI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(SINI, '..', '..', '..', '..', '..'))
LB = os.path.join(REPO, 'data', 'laporan-bnpb')
NAMA = 'Paparan Situasi Karhutla Sepekan 091126'

_s = importlib.util.spec_from_file_location('bl', os.path.join(LB, 'mingguan/2026-11-09/banjir-longsor', 'buat.py'))
BL = importlib.util.module_from_spec(_s); _s.loader.exec_module(BL)
BL.B.SINI = SINI   # ikon ditulis ke folder ini
os.makedirs(os.path.join(SINI, 'bahan', 'ikon'), exist_ok=True)
R, ikon, f0 = BL.R, BL.ikon, BL.f0
TEKS, NAVY, ORANYE, MERAH, PUTIH = BL.TEKS, BL.NAVY, BL.ORANYE, BL.MERAH, BL.PUTIH
BIRU, BIRU_TUA, PITA_BIRU, PITA_MERAH, KAB_TINT = BL.BIRU, BL.BIRU_TUA, BL.PITA_BIRU, BL.PITA_MERAH, BL.KAB_TINT
TEKS3, GARIS, GARIS_INSET = BL.TEKS3, BL.GARIS, BL.GARIS_INSET
import wa_harian   # noqa: E402  (generator/ sudah di sys.path lewat BL)
import wa_operasi  # noqa: E402

# ======================================================================== data sistem
WEB = os.path.join(LB, 'penanganan-karhutla/2026-11/2026-11-12', 'web')
P = json.load(open(os.path.join(WEB, 'peta_karhutla.json'), encoding='utf-8'))
H = json.load(open(os.path.join(WEB, 'harian30.json'), encoding='utf-8'))
KAB = json.load(open(os.path.join(REPO, 'public', 'data', 'peta_karhutla_kab.json'), encoding='utf-8'))
_rentang = lambda a, n: [(date.fromisoformat(a) + dt.timedelta(days=i)).isoformat() for i in range(n)]
INI, LALU = _rentang('2026-11-02', 7), _rentang('2026-10-26', 7)
TGL = lambda d: f'{int(d[8:])} {"Okt" if d[5:7] == "10" else "Nov"}'
TGLP = lambda d: f'{int(d[8:])} {"Oktober" if d[5:7] == "10" else "November"}'


def _kh(d):
    fs = sorted(glob.glob(os.path.join(LB, 'penanganan-karhutla', '*', '*', 'web', f'kluster_hari-{d}.json')), key=os.path.getmtime)
    assert fs, f'kluster_hari {d} tidak ada'
    return json.load(open(fs[-1], encoding='utf-8'))['w']


KH = {d: _kh(d) for d in LALU + INI}
assert P['hari'][-1] >= '2026-11-08' and H['hari'][-1] >= '2026-11-08'
PROV = {}
for kp, v in P['prov'].items():
    o = {'nama': v['nama']}
    for lab, hs in (('', INI), ('_l', LALU)):
        o['hot' + lab] = [H['prov'].get(kp, [0] * len(H['hari']))[H['hari'].index(d)] for d in hs]
        o['fs' + lab] = [KH[d].get(kp, [0] * 7)[4] for d in hs]
        for m in ('luas', 'belum', 'padam'):
            o[m + lab] = [v[m][P['hari'].index(d)] for d in hs]
    PROV[kp] = o
KABD = {}
ik8 = KAB['hari'].index('2026-11-08')
for kk, ser in H['kab'].items():
    kp, nm = kk.split('|')
    dd = {j: (l, b) for j, l, b in KAB['kab'].get(kk, {}).get('d', [])}
    fs_all = [KH[d].get(kk, [0] * 7)[4] for d in LALU + INI]
    run = 0
    for x in reversed(fs_all):
        if x <= 0:
            break
        run += 1
    KABD[kk] = {'kp': kp, 'nama': nm, 'hot': [ser[H['hari'].index(d)] for d in INI], 'fs': fs_all[7:], 'run': run,
                'belum8': dd.get(ik8, (0, 0))[1], 'luas': sum(dd.get(KAB['hari'].index(d), (0, 0))[0] for d in INI)}
S = lambda xs: sum(xs)
NAS = {m: S(S(o[m]) for o in PROV.values()) for m in ('hot', 'hot_l', 'fs', 'fs_l', 'luas', 'luas_l')}
NAS['belum8'] = S(o['belum'][-1] for o in PROV.values())
NAS['harian'] = [S(o['hot'][i] for o in PROV.values()) for i in range(7)]
NAS['harian_l'] = [S(o['hot_l'][i] for o in PROV.values()) for i in range(7)]
NAS['fs_harian'] = [S(o['fs'][i] for o in PROV.values()) for i in range(7)]
URUT = sorted(PROV, key=lambda k: -S(PROV[k]['hot']))
TOP10 = URUT[:10]
pct = lambda a, b: round((a - b) / b * 100) if b else None
SINGKAT = {'93': 'Papua Selatan', '62': 'Kalimantan Tengah', '64': 'Kalimantan Timur', '74': 'Sulawesi Tenggara', '53': 'Nusa Tenggara Timur',
           '81': 'Maluku', '72': 'Sulawesi Tengah', '16': 'Sumatera Selatan', '73': 'Sulawesi Selatan', '63': 'Kalimantan Selatan',
           '52': 'Nusa Tenggara Barat', '15': 'Jambi', '82': 'Maluku Utara', '35': 'Jawa Timur'}
nama_p = lambda kp: SINGKAT.get(kp, PROV[kp]['nama'])

SB_SISTEM = 'GIS BNPB, NASA FIRMS (VIIRS dan MODIS), rilis 12 Nov 2026 17.58 WIB'


# ======================================================================== alat gambar tambahan
def pil_arah(k, x, y, w, h, teks, jenis, pt=9.19):
    """Pengganti BL.pil_status: jenis naik/tinggi = merah, turun/reda = biru, ikon panah naik/turun atau peringatan."""
    merah = jenis in ('naik', 'tinggi', True)
    k.bulat(x, y, w, h, PITA_MERAH if merah else PITA_BIRU)
    d = h - 3
    k.kotak(x + 1.5, y + 1.5, d, d, MERAH if merah else BIRU, bentuk=MSO_SHAPE.OVAL)
    g = d * 0.64
    kons = {'naik': 'naik', 'turun': 'turun', 'tinggi': 'peringatan', 'reda': 'cuaca-ekstrem', True: 'peringatan', False: 'kalender'}[jenis]
    k.gambar(ikon(kons), x + 1.5 + (d - g) / 2, y + 1.5 + (d - g) / 2, g, g)
    k.teks(x + d + 2, y, w - d - 4, h, [R(teks, pt, TEKS, True)], rata='c', bungkus=False)


BL.pil_status = lambda k, x, y, w, h, teks, merah, pt=9.19: pil_arah(k, x, y, w, h, teks, merah, pt)


def sel_arah(ini, lalu, pt=9.19):
    p = pct(ini, lalu)
    if p is None:
        return '–'
    return ('pil', f'{abs(p)}%', 'naik' if p > 0 else 'turun', pt)


EXT = BL.INSET_EXT   # 94,8 s.d. 141,2 BT, 6,3 LU s.d. 11,2 LS
PXW = 2600
PXH = int(PXW * (EXT[2] - EXT[3]) / (EXT[1] - EXT[0]))
MW = 487.0
MH = MW * PXH / PXW


def peta(nama, warna_prov, x, y, warna_kab=None):
    """Peta se-Indonesia berwarna per provinsi (semua kab/kota provinsi itu) atau per kab/kota; mengembalikan proyeksi ke pt."""
    warna = {}
    for kp in BL.SEMUA_PROV:
        for f in BL.geo(kp):
            kb = f['properties']['kab']
            w = (warna_kab or {}).get((kp, kb)) or warna_prov.get(kp)
            if w:
                warna[(kp, kb)] = w
    png = os.path.join(SINI, 'bahan', f'peta-{nama}.png')
    pr = BL.gambar_peta(png, EXT, (PXW, PXH), warna, BL.SEMUA_PROV, garis=1)
    return png, (lambda lon, lat: (x + pr(lon, lat)[0] / PXW * MW, y + pr(lon, lat)[1] / PXH * MH))


def unsur(k, x, y, km_pt):
    k.kotak(x + 7, y, 8.6, 12.2, NAVY, bentuk=MSO_SHAPE.ISOSCELES_TRIANGLE)
    k.teks(x, y + 13, 23, 9.4, [R('U', 8, NAVY, True)], rata='c', bungkus=False)
    k.garis(x + 32, y + 18, x + 32 + km_pt, y + 18, NAVY, 1.0)
    k.teks(x + 32, y + 5, max(46, km_pt), 10.8, [R('500 km', 8, NAVY, True)], rata='c', bungkus=False)


KM500 = 500 / 111 * MW / (EXT[1] - EXT[0])


def legenda(k, x, y, isi):
    """isi = [(hex, teks)]; kotak warna kecil + teks 7,5 pt, berderet."""
    for w, t in isi:
        k.bulat(x, y + 2, 10, 8, w, radius=2)
        lw = len(t) * 7.5 * 0.5 + 6
        k.teks(x + 13, y, lw, 12, [R(t, 7.5, TEKS)], bungkus=False)
        x += 13 + lw + 10


def kpi(k, x, y, w, h, konsep, label, nilai, sub, merah=False):
    k.bulat(x, y, w, h, PITA_MERAH if merah else PITA_BIRU, radius=4)
    k.ikon_bulat(konsep, x + 7, y + (h - 24) / 2, 24, isi=MERAH if merah else NAVY)
    k.teks(x + 37, y + 4, w - 40, 11, [R(label, 7.5, TEKS, True)], bungkus=False)
    k.teks(x + 37, y + 15, w - 40, 19, [R(nilai, 15, NAVY, True)], bungkus=False)
    k.teks(x + 37, y + h - 13, w - 40, 10, [R(sub, 7, TEKS3)], bungkus=False)


def batang(k, x, y, w, h, lalu, ini, fs, label_semua=False, pt=7):
    """14 batang harian: pekan lalu abu-abu, pekan ini biru tua dengan firespot merah di dasar; puncak pekan ini berlabel oranye."""
    n = 14
    vals = lalu + ini
    top = max(vals) or 1
    slot = w / n
    bw = slot * 0.64
    bawah = y + h - 11
    tinggi = h - 11 - 12
    puncak = max(range(7), key=lambda i: ini[i])
    for i, v in enumerate(vals):
        bx = x + i * slot + (slot - bw) / 2
        bh = max(0.8, v / top * tinggi)
        k.kotak(bx, bawah - bh, bw, bh, GARIS_INSET if i < 7 else BIRU_TUA)
        if i >= 7:
            f = fs[i - 7]
            fh = f / top * tinggi
            if fh >= 0.8:
                k.kotak(bx, bawah - fh, bw, fh, MERAH)
            if label_semua or i - 7 == puncak:
                k.teks(bx - 12, bawah - bh - 11, bw + 24, 10, [R(f0(v), pt, ORANYE if i - 7 == puncak else TEKS, True)], rata='c', bungkus=False)
    k.garis_datar(x, x + w, bawah, TEKS, 0.5)
    hari = LALU + INI
    for i in ((0, 7, 13) if not label_semua else range(14)):
        k.teks(x + i * slot - 8, bawah + 1, slot + 16, 9.5, [R(TGL(hari[i]), 6.8 if label_semua else 7, TEKS3)], rata='c', bungkus=False)


# ======================================================================== slide 1: peta + tabel provinsi
def s_peta(Dk):
    pn, pl = NAS['hot'], NAS['hot_l']
    kt = PROV['62']
    s, k = Dk.slide(BL.judul(f'Hotspot sepekan turun [{abs(pct(pn, pl))}] persen menjadi [{f0(pn)}] titik; Kalimantan Tengah naik '
                             f'[{pct(S(kt["hot"]), S(kt["hot_l"]))}] persen, [{f0(round(kt["belum"][-1]))}] ha belum padam'))
    x0, y0 = 43.2, 104
    warna = {kp: (MERAH if S(PROV[kp]['hot']) > S(PROV[kp]['hot_l']) else BIRU) for kp in TOP10}
    for kp in URUT[10:]:
        if S(PROV[kp]['hot']) >= 100:
            warna[kp] = PITA_BIRU if S(PROV[kp]['hot']) <= S(PROV[kp]['hot_l']) else PITA_MERAH
    png, pr = peta('hotspot', warna, x0, y0)
    k.gambar(png, x0, y0, MW, MH)
    top = max(S(PROV[kp]['hot']) for kp in TOP10)
    GESER = {'63': (6, 9), '62': (-4, -4), '74': (8, 4), '72': (0, -6)}
    for i, kp in enumerate(TOP10, 1):
        kb = max((kk for kk in KABD if KABD[kk]['kp'] == kp), key=lambda kk: S(KABD[kk]['hot']))
        cx, cy = pr(*BL.pusat(kp, KABD[kb]['nama']))
        dx, dy = GESER.get(kp, (0, 0))
        d = 13 + 22 * math.sqrt(S(PROV[kp]['hot']) / top)
        k.kotak(cx + dx - d / 2, cy + dy - d / 2, d, d, ORANYE, PUTIH, 0.75, bentuk=MSO_SHAPE.OVAL)
        k.teks(cx + dx - d / 2 - 4, cy + dy - d / 2, d + 8, d, [R(str(i), 8 if d > 16 else 7, PUTIH, True)], rata='c', bungkus=False)
    unsur(k, 50, y0 + MH - 30, KM500)
    ly = y0 + MH + 4
    legenda(k, x0, ly, [(MERAH, 'Hotspot naik dari pekan lalu'), (BIRU, 'Hotspot turun'), (ORANYE, 'Lingkaran = 10 provinsi terbanyak, nomor = urutan')])
    # kartu ringkas
    cy = ly + 18
    w4 = (MW - 3 * 6) / 4
    kart = [('karhutla', 'Hotspot', f0(pn), f'Pekan lalu {f0(pl)}', False),
            ('peringatan', 'Firespot', f0(NAS['fs']), f'Pekan lalu {f0(NAS["fs_l"])}', False),
            ('luas', 'Luas terbakar (ha)', f0(round(NAS['luas'])), f'Pekan lalu {f0(round(NAS["luas_l"]))}', False),
            ('karhutla', 'Belum padam (ha)', f0(round(NAS['belum8'])), 'Sisa api pada 8 Nov', True)]
    for i, (kons, lab, v, sub, m) in enumerate(kart):
        kpi(k, x0 + i * (w4 + 6), cy, w4, 46, kons, lab, v, sub, m)
    # hotspot harian nasional
    by = cy + 54
    k.teks(x0, by, MW, 12, [R('Hotspot harian nasional, 26 Okt s.d. 8 Nov 2026', 8.5, TEKS, True),
                            R('   abu-abu = pekan lalu, biru = pekan ini, merah = firespot', 7, TEKS3)], bungkus=False)
    batang(k, x0, by + 13, MW, 500 - by - 13, NAS['harian_l'], NAS['harian'], NAS['fs_harian'], label_semua=True)
    # tabel
    kol = [('PROVINSI', 112, 'l'), ('HOTSPOT', 44, 'c'), ('NAIK/TURUN', 54, 'c'), ('FIRESPOT', 46, 'c'), ('LUAS (HA)', 50, 'c'),
           ('BELUM PADAM', 72, 'c')]
    baris = []
    for i, kp in enumerate(URUT[:12], 1):
        o = PROV[kp]
        nm = ('runs', [R(f'{i}  ' if i <= 10 else '     ', 8.5, ORANYE, True), R(nama_p(kp), 8.5, TEKS, True)])
        baris.append(('data', [nm, f0(S(o['hot'])), sel_arah(S(o['hot']), S(o['hot_l']), 8.6), f0(S(o['fs'])), f0(round(S(o['luas']))),
                               f0(round(o['belum'][-1]))]))
    lain = URUT[12:]
    sl = lambda m: S(S(PROV[kp][m]) for kp in lain)
    baris.append(('sub', [f'{len([kp for kp in lain if S(PROV[kp]["hot"])])} provinsi lain', f0(sl('hot')), sel_arah(sl('hot'), sl('hot_l'), 8.6),
                          f0(sl('fs')), f0(round(sl('luas'))), f0(round(S(PROV[kp]['belum'][-1] for kp in lain)))]))
    baris.append(('total', ['Indonesia', f0(pn), '', f0(NAS['fs']), f0(round(NAS['luas'])), f0(round(NAS['belum8']))]))
    yt = BL.tabel(k, 916.8 - S(c[1] for c in kol), 101, kol, baris, pt=8.6, bawah=488, maks=27.5)
    k.teks(916.8 - 378, yt + 2, 378, 12, [R('Belum padam (ha) per 8 Nov; luas = jumlah luas harian 2 s.d. 8 Nov; naik/turun = hotspot terhadap 26 Okt s.d. 1 Nov',
                                         6.8, TEKS3)], rata='r', bungkus=False)


# ======================================================================== slide 2: tren harian 8 provinsi
def s_tren(Dk):
    top8 = URUT[:8]
    arah = {kp: pct(S(PROV[kp]['hot'][4:7]), S(PROV[kp]['hot'][0:3])) for kp in top8}   # 6-8 Nov (3 hari) vs 2-4 Nov (3 hari)
    turun = [kp for kp in top8 if arah[kp] < 0]
    ip = max(range(7), key=lambda i: NAS['harian'][i])
    s, k = Dk.slide(BL.judul(f'Hotspot nasional memuncak [{f0(NAS["harian"][ip])}] titik pada {TGLP(INI[ip])}; [{len(turun)}] dari 8 provinsi '
                             'teratas menurun pada 6 s.d. 8 November'))
    BL.kepala_panel(k, 43.2, 102, 873.6, 'Hotspot harian 8 provinsi teratas', 'karhutla',
                    'Abu-abu = pekan lalu, biru = pekan ini, merah = firespot; arah = 6 s.d. 8 Nov dibanding 2 s.d. 4 Nov')
    gw, gh, gap = (873.6 - 3 * 14) / 4, (500 - 142 - 12) / 2, 14
    for i, kp in enumerate(top8):
        o = PROV[kp]
        x = 43.2 + (i % 4) * (gw + gap)
        y = 142 + (i // 4) * (gh + 12)
        k.bulat(x, y, gw, gh, 'F3F5F8', radius=4)
        k.teks(x + 8, y + 5, gw - 16, 14, [R(f'{i + 1}  ', 9, ORANYE, True), R(nama_p(kp), 9.5, TEKS, True)], bungkus=False)
        ip = max(range(7), key=lambda j: o['hot'][j])
        k.teks(x + 8, y + 20, gw - 70, 11, [R(f'{f0(S(o["hot"]))} hotspot, puncak {TGL(INI[ip])}', 7.5, TEKS3)], bungkus=False)
        a = arah[kp]
        pil_arah(k, x + gw - 66, y + 7, 58, 16, f'{abs(a)}%', 'naik' if a > 0 else 'turun', 8.5)
        batang(k, x + 8, y + 36, gw - 16, gh - 42, o['hot_l'], o['hot'], o['fs'])
    return turun


# ======================================================================== slide 3: kab/kota firespot beruntun
def s_kab(Dk):
    tiap = [kk for kk, v in KABD.items() if all(x > 0 for x in v['fs'])]
    penuh = [kk for kk in tiap if KABD[kk]['run'] >= 14]
    bel = S(KABD[kk]['belum8'] for kk in tiap)
    # pemilik 13 Nov: judul dan heading tidak diawali angka
    s, k = Dk.slide(BL.judul(f'Firespot muncul setiap hari di [{len(tiap)}] kab/kota selama 2 s.d. 8 November 2026; [{len(penuh)}] di antaranya '
                             f'beruntun [14] hari sejak 26 Oktober'))
    x0, y0 = 43.2, 104
    wk = {}
    for kk, v in KABD.items():
        if v['run'] >= 14: wk[(v['kp'], v['nama'])] = MERAH
        elif v['run'] >= 7: wk[(v['kp'], v['nama'])] = ORANYE
        elif v['run'] >= 3: wk[(v['kp'], v['nama'])] = BIRU
    png, pr = peta('beruntun', {}, x0, y0, wk)
    k.gambar(png, x0, y0, MW, MH)
    unsur(k, 50, y0 + MH - 30, KM500)
    ly = y0 + MH + 4
    legenda(k, x0, ly, [(MERAH, 'Firespot 14 hari beruntun'), (ORANYE, '7 s.d. 13 hari'), (BIRU, '3 s.d. 6 hari')])
    cy = ly + 18
    w3 = (MW - 2 * 6) / 3
    kpi(k, x0, cy, w3, 46, 'kalender', 'Firespot setiap hari 2 s.d. 8 Nov', f'{len(tiap)} kab/kota', 'dari 362 kab/kota berhotspot', True)
    kpi(k, x0 + w3 + 6, cy, w3, 46, 'karhutla', 'Belum padam 8 Nov (ha)', f0(round(bel)),
        f'di {len(tiap)} kab/kota, {round(bel / NAS["belum8"] * 100)} persen nasional', True)
    kpi(k, x0 + 2 * (w3 + 6), cy, w3, 46, 'wilayah', 'Firespot 14 hari beruntun', f'{len(penuh)} kab/kota', 'sejak 26 Okt sampai 8 Nov', False)
    # daftar 14 hari
    py = cy + 56
    BL.kepala_panel(k, x0, py, MW, 'Kab/kota dengan firespot beruntun terlama sampai 8 November', 'peringatan')
    yy = py + 36
    for lab, cocok, merah in (('14 hari', lambda r: r >= 14, True), ('10 s.d. 13 hari', lambda r: 10 <= r < 14, False)):
        ks = sorted((kk for kk, v in KABD.items() if cocok(v['run'])), key=lambda kk: (KABD[kk]['kp'], -S(KABD[kk]['hot'])))
        pil_arah(k, x0, yy, 84, 16, lab, 'tinggi' if merah else False, 8.4)
        teks = '; '.join(f"{KABD[kk]['nama']} ({nama_p(KABD[kk]['kp'])})" for kk in ks)
        k.teks(x0 + 92, yy - 1, MW - 92, 34, [R(teks, 8, TEKS)], jangkar='t', spasi=1.0)
        yy += 36
    # tabel
    kol = [('KAB/KOTA', 160, 'l'), ('BERUNTUN', 56, 'c'), ('HOTSPOT', 44, 'c'), ('FIRESPOT', 46, 'c'), ('BELUM PADAM', 72, 'c')]
    rows = sorted(tiap, key=lambda kk: -KABD[kk]['belum8'])[:15]
    baris = []
    for kk in rows:
        v = KABD[kk]
        nm = ('runs', [R(v['nama'], 8.5, TEKS, True), R('  ' + nama_p(v['kp']), 7, TEKS3)])
        baris.append(('data', [nm, ('pil', f'{v["run"]} hari', v['run'] >= 14, 8.4), f0(S(v['hot'])), f0(S(v['fs'])), f0(round(v['belum8']))]))
    baris.append(('total', [f'Jumlah {len(tiap)} kab/kota', '', f0(S(S(KABD[kk]['hot']) for kk in tiap)), f0(S(S(KABD[kk]['fs']) for kk in tiap)),
                            f0(round(bel))]))
    yt = BL.tabel(k, 916.8 - S(c[1] for c in kol), 101, kol, baris, pt=8.5, bawah=488)
    k.teks(916.8 - 378, yt + 2, 378, 12, [R(f'15 kab/kota dengan belum padam terbesar per 8 Nov (ha); hari firespot beruntun dihitung mundur dari 8 Nov', 6.8, TEKS3)],
           rata='r', bungkus=False)
    return tiap, penuh


# ======================================================================== slide 4: status darurat dan penanganan
def _koordalops():
    last = {}
    for n in range(3, 10):
        r = wa_harian.koordalops(open(os.path.join(LB, f'harian/2026-11/2026-11-{n:02d}', 'wa-koordalops.txt'), encoding='utf-8').read())
        for x in r['kejadian']:
            if x['jenis'] == 'karhutla':
                last[(x['prov'], x['lokasi'])] = x
    return last


def _satgas():
    omc, ar = {}, {}
    hari = []
    for d in ('03', '04', '05', '06', '08', '09'):
        r = wa_operasi.operasi(open(os.path.join(LB, f'penanganan-karhutla/2026-11/2026-11-{d}', 'wa-satgas.txt'), encoding='utf-8').read())
        hari.append(str(r['tanggal']))
        for p, o in r['omc'].items():
            a = omc.setdefault(p, [0, 0, 0]); a[0] += o['sortie']; a[1] += o['nacl']; a[2] += o['dryice']
        ar = r['armada']
    return omc, ar, hari


# (kode, status, mulai, berakhir 'YYYY-MM-DD', wilayah)
STATUS = [('93', 'Tanggap Darurat Kab. Merauke', '28 Okt', '2026-11-12'), ('61', 'Siaga Darurat', '2 Feb', '2026-11-15'),
          ('62', 'Perpanjangan Kedua Tanggap Darurat', '30 Okt', '2026-11-30'), ('64', 'Siaga Darurat', '31 Agu', '2026-11-30'),
          ('16', 'Perpanjangan Siaga Darurat', '22 Apr', '2026-11-30'), ('63', 'Siaga Darurat', '1 Nov', '2026-11-30'),
          ('15', 'Siaga Darurat', '27 Apr', '2026-11-30'), ('14', 'Siaga Darurat', '13 Feb', '2026-11-30'),
          ('33', 'Siaga Darurat Provinsi', '1 Jun', '2026-12-31')]


def s_status(Dk):
    ko = _koordalops()
    omc, ar, hari = _satgas()
    # status dari teks Koordalops terakhir; dicek ke tabel STATUS supaya tanggal berakhir tidak salah ketik
    for kp, st, _, akhir in STATUS:
        teks = next(x['teks']['status_darurat'] for (p, l), x in ko.items() if p == kp)
        dd, mm = int(akhir[8:]), int(akhir[5:7])
        assert f'{dd:02d}/{mm:02d}/2026' in teks or f'{dd}/{mm:02d}/2026' in teks or f'{dd} ' in teks, (kp, teks)
    p0 = date(2026, 11, 9)
    sisa = {kp: (date.fromisoformat(a) - p0).days for kp, _, _, a in STATUS}
    tanpa = [kp for kp in TOP10 if kp not in sisa]
    hot_tanpa = S(S(PROV[kp]['hot']) for kp in tanpa)
    s, k = Dk.slide(BL.judul(f'Status darurat Merauke berakhir [12] November, Kalimantan Barat [15] November; [{len(tanpa)}] provinsi '
                             f'dengan [{f0(hot_tanpa)}] hotspot belum berstatus darurat'))
    om = lambda p: f'OMC {omc[p][0]} sortie, {f0(omc[p][1])} kg NaCl' + (f' dan {f0(omc[p][2])} kg dry ice' if omc[p][2] else '') if omc.get(p, [0])[0] else 'Tanpa OMC'
    arm = lambda p: f'{ar[p][1]} helikopter WB dan {ar[p][0]} pesawat patroli tergelar'
    KEG = {
        '93': f'{ar["Papua Selatan"][0]} pesawat patroli tergelar, tanpa helikopter water bombing dalam daftar armada Satgas',
        '61': f'{arm("Kalimantan Barat")}, tanpa OMC; WB 8 Nov di Simpang Hilir dan Teluk Batang; dukungan udara BNPB berakhir 10 Nov, armada disiapkan demobilisasi',
        '62': f'{om("Kalimantan Tengah")}; {arm("Kalimantan Tengah")}; WB 8 Nov di Seranau, Kotawaringin Timur',
        '64': 'Water bombing 5 sortie di Kutai Kartanegara dan Kutai Timur pada 8 Nov (Koordalops); helikopter water bombing IKN tercatat 2 s.d. 4 Nov',
        '16': f'{om("Sumatera Selatan")}; {arm("Sumatera Selatan")}; WB 8 Nov di Pangkalan Lampam, Ogan Komering Ilir',
        '63': f'{om("Kalimantan Selatan")}; {arm("Kalimantan Selatan")}; WB 8 Nov di Hulu Sungai Utara dan Tanah Laut',
        '15': f'{arm("Jambi")}; pemadaman darat 8 Nov di Kumpeh (Muaro Jambi) dan Sadu (Tanjung Jabung Timur)',
        '14': f'{arm("Riau")}; patroli udara 8 Nov di Pelalawan dan Indragiri Hulu tanpa temuan api baru; operasi modifikasi cuaca berakhir 25 Sep',
        '33': 'Kebakaran kecil di tiga kab/kota (Batang; Sragen; Magelang) dilaporkan padam',
        '74': f'{ar["Sulawesi Tenggara"][0]} pesawat patroli tergelar; Kolaka Timur 7 Nov: api terkendali, sisa nyala di batang pinus',
        '72': 'Morowali Utara dan Parigi Moutong dilaporkan padam; Banggai Kepulauan masih ditangani (laporan 6 Nov)',
        '53': 'Tidak ada laporan kejadian karhutla di Koordalops 2 s.d. 8 Nov; tanpa armada udara',
        '81': 'Tidak ada laporan kejadian karhutla di Koordalops 2 s.d. 8 Nov; tanpa armada udara',
        '73': 'Kota Palopo padam 6 Nov; api di kawasan Gunung Buntu Kamiri, Luwu masih menyala pada laporan 7 Nov',
    }
    kol = [('PROVINSI', 112, 'l'), ('STATUS DARURAT', 150, 'l'), ('BERLAKU', 92, 'c'), ('SISA', 62, 'c'), ('HOTSPOT', 48, 'c'),
           ('NAIK/TURUN', 56, 'c'), ('PENANGANAN 2 S.D. 8 NOV', 353.6, 'l')]
    baris = []
    for kp, st, mulai, akhir in STATUS:
        o = PROV[kp]
        baris.append(('data', [('runs', [R(nama_p(kp), 8.5, TEKS, True)]), BL.rt(st, 8), BL.rt(f'{mulai} s.d. {TGL(akhir)}' if akhir < '2026-12-01' else f'{mulai} s.d. 31 Des', 8),
                               ('pil', f'{sisa[kp]} hari', sisa[kp] <= 14, 8.4), f0(S(o['hot'])), sel_arah(S(o['hot']), S(o['hot_l']), 8.4), BL.rt(KEG[kp], 7.8)], 26))
    for kp in tanpa:
        o = PROV[kp]
        baris.append(('data', [('runs', [R(nama_p(kp), 8.5, TEKS, True)]), BL.rt('Belum tercatat', 8, True, MERAH), '–', '–', f0(S(o['hot'])),
                               sel_arah(S(o['hot']), S(o['hot_l']), 8.4), BL.rt(KEG[kp], 7.8)], 26))
    BL.tabel(k, 43.2, 101, kol, baris, pt=8.5, maks=28)
    k.teks(43.2, 486, 873.6, 12, [R('WB = water bombing; OMC = operasi modifikasi cuaca; sisa = hari dari 9 Nov sampai status berakhir; hotspot dan naik/turun = '
                                    '2 s.d. 8 Nov terhadap 26 Okt s.d. 1 Nov (GIS BNPB)', 6.8, TEKS3)], rata='r', bungkus=False)
    return tanpa, hot_tanpa, hari, sisa


# ======================================================================== slide 5: prakiraan cuaca
def s_cuaca(Dk):
    b = wa_harian.bmkg(open(os.path.join(LB, 'harian/2026-11/2026-11-09', 'wa-bmkg.txt'), encoding='utf-8').read())
    kode = lambda n: wa_harian.kode_prov({'Kep. Riau': 'Kepulauan Riau', 'DI Yogyakarta': 'Daerah Istimewa Yogyakarta'}.get(n, n))
    hujan = {kode(n) for n in b['hujan']}
    lebat = {kode(n) for n in b['siaga'] + b['awas']}
    assert None not in hujan | lebat, b
    keluar = [kp for kp in TOP10 if kp not in hujan and kp not in lebat]
    hk = S(S(PROV[kp]['hot']) for kp in keluar)
    s, k = Dk.slide(BL.judul(f'Sebanyak [{f0(hk)}] hotspot sepekan di [{len(keluar)}] provinsi teratas berada di luar wilayah hujan sedang BMKG '
                             '9 s.d. 12 November'))
    x0, y0 = 43.2, 104
    warna = {kp: BIRU for kp in hujan}
    warna.update({kp: BIRU_TUA for kp in lebat})
    warna.update({kp: MERAH for kp in keluar})
    png, pr = peta('cuaca', warna, x0, y0)
    k.gambar(png, x0, y0, MW, MH)
    unsur(k, 50, y0 + MH - 30, KM500)
    ly = y0 + MH + 4
    legenda(k, x0, ly, [(BIRU, 'Hujan sedang'), (BIRU_TUA, 'Siaga atau Awas hujan lebat'), (MERAH, '10 provinsi teratas tanpa hujan sedang')])
    cy = ly + 18
    w3 = (MW - 2 * 6) / 3
    pm = b['pm'][0]
    kpi(k, x0, cy, w3, 46, 'cuaca-ekstrem', 'Hujan sedang 9 s.d. 12 Nov', f'{len(hujan)} provinsi', 'Peringatan dini BMKG', False)
    kpi(k, x0 + w3 + 6, cy, w3, 46, 'peringatan', 'Teratas tanpa hujan sedang', f'{len(keluar)} provinsi', f'{f0(hk)} hotspot sepekan', True)
    kpi(k, x0 + 2 * (w3 + 6), cy, w3, 46, 'kesehatan', 'PM2,5 tertinggi (mikrogram/m³)', f'{str(pm[1]).replace(".", ",")}',
        f'{pm[0]} 9 Nov 06.00, {pm[2].lower()}', False)
    py = cy + 56
    BL.kepala_panel(k, x0, py, MW, 'Imbauan BMKG 9 November 2026', 'prabencana')
    imb = [('Musim kemarau masih berlangsung menurut BMKG: ', 'udara kering menaikkan ancaman kekeringan dan karhutla.'),
           ('Tidak membakar sampah atau membuka lahan dengan membakar, ', 'terutama di lahan gambut dan hutan.'),
           ('Hujan ringan sampai sedang tetap bisa muncul lokal: ', 'pantau peringatan dini BMKG sebelum mengatur operasi.'),
           ('Peringatan dini 9 s.d. 12 Nov: ', 'Awas hujan sangat lebat di Sumatera Utara; Siaga di Aceh dan Sumatera Barat.')]
    yy = py + 36
    for a, c in imb:
        k.kotak(x0 + 2, yy + 5, 4, 4, ORANYE, bentuk=MSO_SHAPE.OVAL)
        k.teks(x0 + 12, yy, MW - 12, 14, [R(a, 8.5, TEKS, True), R(c, 8.5, TEKS)], bungkus=False)
        yy += 19
    # tabel
    kol = [('PROVINSI', 114, 'l'), ('HOTSPOT', 52, 'c'), ('ARAH 3 HARI', 62, 'c'), ('BMKG 9-12 NOV', 76, 'c'), ('PEKAN DEPAN', 74, 'c')]
    baris = []
    for i, kp in enumerate(URUT[:14], 1):
        o = PROV[kp]
        a = pct(S(o['hot'][4:7]), S(o['hot'][0:3]))
        cuaca = 'Hujan lebat' if kp in lebat else 'Hujan sedang' if kp in hujan else 'Hujan ringan'
        tinggi = kp in keluar or a > 0
        nm = ('runs', [R(f'{i}  ', 8.5, ORANYE, True), R(nama_p(kp), 8.5, TEKS, True)])
        baris.append(('data', [nm, f0(o['hot'][-1]), ('pil', f'{abs(a)}%', 'naik' if a > 0 else 'turun', 8.4),
                               BL.rt(cuaca, 8.5, True, BIRU_TUA if kp in hujan | lebat else MERAH), ('pil', 'Tetap tinggi' if tinggi else 'Mereda', 'tinggi' if tinggi else 'reda', 8.4)]))
    yt = BL.tabel(k, 916.8 - S(c[1] for c in kol), 101, kol, baris, pt=8.5, bawah=488)
    k.teks(916.8 - 378, yt + 2, 378, 12, [R('Hotspot = 8 Nov; arah = 6 s.d. 8 Nov dibanding 2 s.d. 4 Nov; hujan ringan = di luar daftar hujan sedang BMKG',
                                         6.8, TEKS3)], rata='r', bungkus=False)
    return keluar, hk, hujan


# ======================================================================== slide 6: rekomendasi
def s_rekom(Dk, ctx):
    kb = lambda kp, nm: KABD[f'{kp}|{nm}']
    p = lambda kp: PROV[kp]
    hp = lambda kp: pct(S(p(kp)['hot']), S(p(kp)['hot_l']))
    B = lambda kp: f0(round(p(kp)['belum'][-1]))
    rows = [
        ('Kalimantan Tengah', f'Hotspot naik {hp("62")} persen ({f0(S(p("62")["hot"]))}); belum padam 8 Nov {B("62")} ha, terbanyak Kapuas '
         f'{f0(round(kb("62", "Kapuas")["belum8"]))} ha, Seruyan {f0(round(kb("62", "Seruyan")["belum8"]))} ha, Barito Selatan '
         f'{f0(round(kb("62", "Barito Selatan")["belum8"]))} ha',
         'Pusatkan helikopter water bombing dan regu darat di tiga kab/kota terbesar sisa apinya (Kapuas; Seruyan; Barito Selatan); lanjutkan operasi modifikasi cuaca selama hujan sedang 9 s.d. 12 Nov',
         'Satgas Karhutla dan BPBD Kalimantan Tengah; BNPB mempertahankan 7 helikopter water bombing', '12 Nov', ['Kapuas', 'Seruyan', 'Barito Selatan']),
        ('Papua Selatan', f'Merauke {f0(S(kb("93", "Merauke")["hot"]))} hotspot sepekan, firespot {kb("93", "Merauke")["run"]} hari beruntun, '
         f'belum padam {f0(round(kb("93", "Merauke")["belum8"]))} ha; Tanggap Darurat berakhir 12 Nov; tanpa helikopter water bombing',
         'Putuskan perpanjangan Tanggap Darurat Merauke berdasarkan hotspot 9 s.d. 11 Nov; ajukan helikopter water bombing dan regu darat bila diperpanjang',
         'Pemkab Merauke dan BPBD Merauke; BNPB menilai dukungan armada', '11 Nov', ['Merauke']),
        ('Kalimantan Timur', f'Hotspot turun {abs(hp("64"))} persen, tetapi firespot 14 hari beruntun di empat kab/kota (Kutai Timur; Kutai Barat; Paser; '
         f'Kutai Kartanegara); belum padam 8 Nov {B("64")} ha',
         'Arahkan water bombing dan patroli darat ke empat kab/kota itu; catat hasil per lokasi supaya cluster yang menyala ulang terlihat',
         'BPBD Kalimantan Timur, Manggala Agni; BNPB mendukung water bombing', '15 Nov', ['Kutai Timur', 'Kutai Barat', 'Paser', 'Kutai Kartanegara']),
        ('Sulawesi Tenggara dan Sulawesi Tengah', f'{f0(S(p("74")["hot"]) + S(p("72")["hot"]))} hotspot sepekan; firespot 14 hari beruntun di empat kab/kota (Konawe; '
         'Banggai; Tojo Una Una; Morowali); belum berstatus darurat, tidak masuk wilayah hujan sedang BMKG',
         'Kaji penetapan Siaga Darurat provinsi; siapkan patroli udara dan regu darat di Konawe, Konawe Utara, Morowali Utara',
         'BPBD Sulawesi Tenggara dan Sulawesi Tengah; BNPB menyiapkan patroli udara', '15 Nov', ['Konawe', 'Banggai', 'Tojo Una Una', 'Morowali',
                                                                                     'Konawe Utara', 'Morowali Utara']),
        ('Maluku dan Nusa Tenggara Timur', f'{f0(S(p("81")["hot"]) + S(p("53")["hot"]))} hotspot sepekan tanpa laporan kejadian di Koordalops; Kepulauan Tanimbar '
         f'belum padam {f0(round(kb("81", "Kepulauan Tanimbar")["belum8"]))} ha dengan firespot {kb("81", "Kepulauan Tanimbar")["run"]} hari beruntun',
         'Minta BPBD memverifikasi lapangan di Kepulauan Tanimbar, Buru, Timor Tengah Utara, lalu melaporkan kejadiannya ke Pusdalops',
         'BPBD Maluku dan Nusa Tenggara Timur; Pusdalops BNPB menagih laporan', '12 Nov', ['Kepulauan Tanimbar', 'Buru', 'Timor Tengah Utara']),
        ('Sumatera Selatan dan Jambi', f'Hotspot naik {hp("16")} persen di Sumatera Selatan dan {hp("15")} persen di Jambi; Ogan Komering Ilir belum padam '
         f'{f0(round(kb("16", "Ogan Komering Ilir")["belum8"]))} ha; Muaro Jambi {f0(S(kb("15", "Muaro Jambi")["hot"]))} hotspot',
         'Perketat patroli darat lahan gambut Ogan Komering Ilir, Muaro Jambi, Tanjung Jabung Timur; siagakan helikopter water bombing Jambi',
         'Satgas Karhutla Sumatera Selatan dan Jambi, BPBD, TNI, Polri', '12 Nov', ['Ogan Komering Ilir', 'Muaro Jambi', 'Tanjung Jabung Timur']),
        ('Kalimantan Barat', f'Hotspot turun {abs(hp("61"))} persen ({f0(S(p("61")["hot"]))}); belum padam 8 Nov {B("61")} ha; Siaga Darurat '
         'berakhir 15 Nov dan dukungan udara BNPB berakhir 10 Nov',
         'Nilai perpanjangan Siaga Darurat dari hotspot 9 s.d. 14 Nov; pindahkan armada yang didemobilisasi ke Kalimantan Tengah bila hotspot rendah',
         'BPBD Kalimantan Barat dan BNPB', '14 Nov', []),
    ]
    kabs = {x for r in rows for x in r[5]}
    s, k = Dk.slide(BL.judul(f'Tindak lanjut 9 s.d. 15 November menyasar [{len(kabs)}] kab/kota prioritas; status Merauke diputuskan '
                             'paling lambat [11] November'))
    kol = [('PROVINSI', 116, 'l'), ('DASAR DARI DATA SEPEKAN', 268, 'l'), ('TINDAK LANJUT', 260, 'l'), ('PELAKSANA', 165.6, 'l'), ('TENGGAT', 64, 'c')]
    baris = []
    for prov, dasar, aksi, siapa, kapan, _ in rows:
        baris.append(('data', [('runs', [R(prov, 8.5, TEKS, True)]), BL.rt(dasar, 7.8), BL.rt(aksi, 7.8, True, NAVY), BL.rt(siapa, 7.8),
                               ('pil', kapan, int(kapan.split()[0]) <= 12, 8.4)]))
    BL.tabel(k, 43.2, 101, kol, baris, pt=8.5, maks=52)


# ======================================================================== rakit
def main():
    Dk = BL.Deck()
    s_peta(Dk)
    s_tren(Dk)
    s_kab(Dk)
    tanpa, hot_tanpa, hari_satgas, sisa = s_status(Dk)
    s_cuaca(Dk)
    s_rekom(Dk, None)
    isi = os.path.join(SINI, f'{NAMA}.pptx')
    Dk.I.simpan(isi)
    if '--isi' in sys.argv:
        print('isi saja:', isi); return
    SB = {1: f'{SB_SISTEM}; luas = jumlah luas harian',
          2: f'{SB_SISTEM}; hari kalender WIB',
          3: f'{SB_SISTEM}; kab/kota rilis 9 Nov 19.15 WIB',
          4: 'Laporan harian Dit. Koordalops dan Satgas Karhutla 2 s.d. 8 Nov 2026 (Satgas 6 Nov tidak ada); GIS BNPB',
          5: 'BMKG, laporan meteorologi 9 Nov 2026 (periode 9 s.d. 12 Nov); hotspot GIS BNPB',
          6: 'Disusun dari halaman 1 s.d. 5 deck ini'}
    BAG = {1: 1, 2: 1, 3: 1, 4: 2, 5: 3, 6: 4}
    susun = [{'jenis': 'sampul'}, {'jenis': 'daftar-isi'}]
    susun += [{'halaman': n, 'bagian': BAG[n], 'sumber': SB[n]} for n in range(1, 7)]
    # data/kajian-bnpb/gambar/foto/mit-b13-gambut.jpg: asap bara gambut, TN Sebangau, Kalteng 2019 (Wikimedia Commons "Out_of_Controls.jpg")
    foto = os.path.join(SINI, 'bahan', 'sampul.jpg').replace(os.sep, '/')
    kredit = 'Foto: DenY Krisbiyantoro, CC BY-SA 4.0, Wikimedia Commons'
    susun.append({'jenis': 'penutup', 'layout': 'putih', 'foto': [foto], 'kredit': kredit})
    tetap = {}
    for no, b in enumerate(susun, 1):
        if b.get('bagian'):
            tetap.setdefault(b['bagian'], []).append(no)
    bagian = [{'judul': j, 'label': j} for j in ('Situasi hotspot dan firespot sepekan', 'Status darurat dan penanganan',
                                                 'Prakiraan cuaca', 'Rekomendasi tindak lanjut')]
    for n, b in enumerate(bagian, 1):
        b['halaman_tetap'] = tetap[n]
    import lewat_deck
    keluar = lewat_deck.bingkai(
        isi, 'kajian', 'Laporan Situasi Kebakaran Hutan dan Lahan',
        'Senin, 2 November s.d. Minggu, 8 November 2026', date(2026, 11, 9),
        foto=([foto], kredit), penyaji={'nama': 'Tim Ahli dan Tim Sus IT BNPB', 'jabatan': 'Badan Nasional Penanggulangan Bencana'},
        kepada='Disampaikan kepada Kepala Badan Nasional Penanggulangan Bencana', bagian=bagian, susun=susun,
        spek_tambah={'panel_sisi': 'gelap', 'subjek_dokumen': 'Paparan Situasi Karhutla Mingguan', 'skala_logo_bnpb': 1.1})
    print(keluar)


if __name__ == '__main__':
    main()
