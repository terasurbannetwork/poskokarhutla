#!/usr/bin/env python3
"""Bukti kebakaran di konsesi PT Merauke Sawit Jaya (sawit-gfw-1377), untuk Kepala BNPB, 3 Nov 2026.
Bahan: repo poskokarhutla (public/data/konsesi2026/93.json, riwayat_konsesi.json), tembolok FIRMS generator laporan
(24 Okt sampai 3 Nov), citra Sentinel-2 L2A (Element84) di data/laporan-bnpb/paparan/bukti-konsesi-msj-031126/, deck Pantauan Udara 011126.
Jalankan: python spek/bangun_spek_msj.py <msj_titik.json>  lalu deck.py spek/bukti-msj.json --akar ."""
import csv, hashlib, json, math, sys
from collections import defaultdict
from pathlib import Path
from PIL import Image, ImageDraw

AKAR = Path(__file__).resolve().parents[1]
REPO = Path('D:/Project/Work/BNPB/poskokarhutla')
BUKTI = REPO / 'data/laporan-bnpb/paparan/bukti-konsesi-msj-031126'
DM = AKAR / 'data/msj'
DM.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(REPO / 'scripts/data'))
import citra as C, titik_unik as TU  # noqa: E402

TITIK = json.load(open(sys.argv[1] if len(sys.argv) > 1 else BUKTI / 'msj_titik.json'))
P93 = json.load(open(REPO / 'public/data/konsesi2026/93.json', encoding='utf8'))
MSJ = [x for x in P93['perusahaan'] if x['id'] == 'sawit-gfw-1377'][0]
RIW = json.load(open(REPO / 'public/data/konsesi2026/riwayat_konsesi.json', encoding='utf8'))['perusahaan']['sawit-gfw-1377']
CJ = json.load(open(BUKTI / 'citra/citra.json'))
ST = json.load(open(BUKTI / 'citra/statistik_citra.json'))['luas']
POLY = MSJ['geom'][0]['coordinates'][0][0]

# ---------------- hitungan ----------------
harian = dict(MSJ['harian'])   # VIIRS S-NPP n/h, 14 Jun sampai 26 Okt (repo)
for r in TITIK['dalam']:      # sambung 27 Okt sampai 2 Nov dari tembolok FIRMS, definisi sama
    if r['src'] == 'VIIRS_SNPP_NRT' and '2026-10-27' <= r['hari'] <= '2026-11-02' and r['conf'] in ('n', 'h'):
        harian[r['hari']] = harian.get(r['hari'], 0) + 1
BLN = ['Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov']
bulan = defaultdict(int)
for d, n in harian.items():
    bulan[int(d[5:7])] += n
tot26 = sum(harian.values())
hari_aktif = sum(1 for n in harian.values() if n > 0)
unik, unik_l = defaultdict(set), defaultdict(set)
for r in TITIK['bbox']:
    if '2026-10-24' <= r['hari'] <= '2026-11-02':
        (unik if r['dalam'] else unik_l)[r['hari']].add(TU.sel(r['lat'], r['lon']))
HARI10 = sorted(set(unik) | set(unik_l))
ud, ul = sum(len(unik[h]) for h in HARI10), sum(len(unik_l[h]) for h in HARI10)
xs = [a for a, b in POLY]; ys = [b for a, b in POLY]
kmx = 111.32 * math.cos(math.radians(-7.85)); kmy = 110.574
bb_ha = (max(xs) - min(xs) + .1) * kmx * (max(ys) - min(ys) + .1) * kmy * 100
dalam_ha = ST['msj_sesudah_20261028.png']['dalam_ha']
luar_ha = bb_ha - dalam_ha
pd_, pl_ = ud / dalam_ha * 1000, ul / luar_ha * 1000
frp_dalam = max(r['frp'] for r in TITIK['dalam'])
buka_jun, buka_okt = ST['msj_sebelum_20260605.png']['buka_ha'], ST['msj_sesudah_20261028.png']['buka_ha']
viirs = dict(zip(range(2012, 2027), RIW['y']))
rek_lalu = max(v for t, v in viirs.items() if t < 2026)

# ---------------- registri angka ----------------
FI = 'firms-msj-2026'; KO = 'konsesi-gfw-sawit'; S2 = 'sentinel2-msj-2026'; RW = 'riwayat-konsesi-2026'; UD = 'bnpb-pantau-udara-merauke-2026-10-31'
S_F = 'NASA FIRMS VIIRS S-NPP, diolah BNPB'
ANGKA = {}


def a(k, nilai, satuan, pustaka, sumber, keyakinan='resmi', catatan=None):
    ANGKA[k] = {'nilai': nilai, 'satuan': satuan, 'pustaka': pustaka, 'sumber': sumber, 'keyakinan': keyakinan}
    if catatan:
        ANGKA[k]['catatan'] = catatan


def t(k, o=''):
    return '{{angka:%s%s}}' % (k, o)


a('msj.luas', MSJ['luas_ha'], 'ha', KO, 'Kemenhut via GFW, konsesi sawit 2014', catatan='luas peta poligon konsesi')
a('msj.titik', tot26, 'titik', FI, S_F, catatan='VIIRS S-NPP keyakinan nominal/tinggi di dalam batas konsesi, 14 Jun sampai 2 Nov 2026 WIB')
a('msj.hari', hari_aktif, 'hari', FI, S_F, catatan='hari dengan paling sedikit satu titik di dalam batas, 2026')
for i, b in enumerate(BLN):
    a(f'msj.bln.{b.lower()}', bulan[6 + i], 'titik', FI, S_F)
a('msj.okt.persen', round(100 * bulan[10] / tot26, 1), '%', FI, S_F, catatan='porsi Oktober dari titik 2026')
a('msj.sep.okt', bulan[9] + bulan[10], 'titik', FI, S_F)
a('msj.viirs2026', viirs[2026], 'titik', RW, 'NASA FIRMS VIIRS S-NPP 2012 sampai 2026, diolah BNPB', catatan='2026 s.d. 12 Okt')
a('msj.rekor', rek_lalu, 'titik', RW, 'NASA FIRMS VIIRS S-NPP 2012 sampai 2026, diolah BNPB', catatan='tahun terbanyak 2012-2025: 2015')
a('msj.kali', round(viirs[2026] / rek_lalu, 1), 'kali', RW, 'NASA FIRMS VIIRS S-NPP 2012 sampai 2026, diolah BNPB', catatan='2026 s.d. 12 Okt dibanding 2015 setahun penuh')
a('msj.modis2026', RIW['ym'][-1], 'titik', RW, 'NASA FIRMS MODIS 2003 sampai 2026, diolah BNPB')
a('msj.modis2015', RIW['ym'][12], 'titik', RW, 'NASA FIRMS MODIS 2003 sampai 2026, diolah BNPB')
a('msj.unik.dalam', ud, 'titik', FI, 'NASA FIRMS (MODIS, VIIRS), lokasi unik, diolah BNPB', catatan='24 Okt sampai 2 Nov 2026')
a('msj.unik.luar', ul, 'titik', FI, 'NASA FIRMS (MODIS, VIIRS), lokasi unik, diolah BNPB', catatan='cincin sekitar 5 km di luar batas, 24 Okt sampai 2 Nov 2026')
a('msj.pad.dalam', round(pd_, 1), 'titik per seribu ha', FI, 'NASA FIRMS, diolah BNPB')
a('msj.pad.luar', round(pl_, 1), 'titik per seribu ha', FI, 'NASA FIRMS, diolah BNPB')
a('msj.rasio', round(pd_ / pl_), 'kali', FI, 'NASA FIRMS, diolah BNPB', catatan='kepadatan titik di dalam batas dibanding cincin luar')
a('msj.cincin', round(luar_ha), 'ha', FI, 'NASA FIRMS, diolah BNPB', 'estimasi-model')
a('msj.frp', round(frp_dalam), 'MW', FI, 'NASA FIRMS MODIS, diolah BNPB', catatan='FRP tertinggi di dalam batas, 1 Nov 2026 00.39 WIB')
a('msj.frp.tepi', 1781, 'MW', FI, 'NASA FIRMS MODIS, diolah BNPB', catatan='31 Okt 2026 18.38 WIB, sekitar 100 m di luar garis barat batas')
a('msj.buka.jun', buka_jun, 'ha', S2, 'Copernicus Sentinel-2, diolah BNPB', 'estimasi-model', 'piksel SWIR tanpa vegetasi di dalam batas, 5 Jun 2026')
a('msj.buka.okt', buka_okt, 'ha', S2, 'Copernicus Sentinel-2, diolah BNPB', 'estimasi-model', 'piksel SWIR tanpa vegetasi di dalam batas, 28 Okt 2026')
a('msj.buka.tambah', buka_okt - buka_jun, 'ha', S2, 'Copernicus Sentinel-2, diolah BNPB', 'estimasi-model')
a('msj.buka.persen', round(100 * buka_okt / dalam_ha), '%', S2, 'Copernicus Sentinel-2, diolah BNPB', 'estimasi-model')
a('msj.bakar', MSJ['luas_bakar_ha'], 'ha', FI, 'NASA FIRMS VIIRS, piksel unik kali luas piksel, diolah BNPB', 'estimasi-model', 's.d. 26 Okt 2026')
import datetime as _dt
_d = [(_dt.date(2026, 9, 1) + _dt.timedelta(i)).isoformat() for i in range(63)]
a('msj.hari.sep', sum(1 for x in _d if harian.get(x, 0) > 0), 'hari', FI, S_F, catatan='hari berapi 1 Sep sampai 2 Nov 2026')
a('msj.hari.sep.n', len(_d), 'hari', FI, S_F)
a('msj.kompleks', len(MSJ['kompleks']), 'kompleks', FI, S_F, catatan='kompleks api aktif 20 sampai 26 Okt 2026')
a('msj.kompleks.besar', MSJ['kompleks_lalu'][0][3], 'titik', FI, S_F, catatan='kompleks Jagebob 20 Agu sampai 20 Okt 2026')
a('msj.kompleks.hari', MSJ['kompleks_lalu'][0][6], 'hari', FI, S_F)
a('msj.peringkat', 1, 'dari konsesi', KO, 'sistem konsesi BNPB, Papua Selatan', catatan='urutan titik 2026')
a('msj.papsel', len(P93['perusahaan']), 'konsesi', KO, 'sistem konsesi BNPB, Papua Selatan', catatan='konsesi berapi 2026 di Papua Selatan')
a('msj.u31', len(unik['2026-10-31']), 'titik', FI, 'NASA FIRMS (MODIS, VIIRS), lokasi unik, diolah BNPB', catatan='di dalam batas, 31 Okt 2026')

PUSTAKA = [
    {'id': FI, 'type': 'dataset', 'author': [{'literal': 'NASA FIRMS, diolah BNPB'}], 'issued': {'date-parts': [[2026, 11, 3]]},
     'title': 'Hotspot MODIS dan VIIRS (S-NPP, NOAA-20, NOAA-21) di dalam dan sekitar konsesi PT Merauke Sawit Jaya, 14 Jun sampai 2 Nov 2026',
     'URL': 'https://firms.modaps.eosdis.nasa.gov', 'verifikasi': 'primer'},
    {'id': KO, 'type': 'dataset', 'author': [{'literal': 'Kementerian Kehutanan via Global Forest Watch'}], 'issued': {'date-parts': [[2014]]},
     'title': 'Konsesi kelapa sawit Indonesia (gfw_oil_palm v20191031), data 2012 diperbarui 2014', 'URL': 'https://data.globalforestwatch.org', 'verifikasi': 'primer'},
    {'id': S2, 'type': 'dataset', 'author': [{'literal': 'Copernicus Sentinel-2, ESA'}], 'issued': {'date-parts': [[2026, 10, 28]]},
     'title': 'Sentinel-2 L2A adegan S2C_54MVS_20260605 dan S2B_54MVS_20261028, kanal B12/B8A/B04', 'URL': 'https://earth-search.aws.element84.com/v1', 'verifikasi': 'primer'},
    {'id': RW, 'type': 'dataset', 'author': [{'literal': 'NASA FIRMS, diolah BNPB'}], 'issued': {'date-parts': [[2026, 10, 12]]},
     'title': 'Riwayat hotspot per konsesi 2003 sampai 2026 (MODIS) dan 2012 sampai 2026 (VIIRS S-NPP)', 'URL': 'https://centurisk97.id/data/konsesi2026/riwayat_konsesi.json', 'verifikasi': 'primer'},
]

# ---------------- gambar ----------------
HEX = {'navy': (5, 28, 44), 'merah': (200, 16, 46), 'biru': (47, 134, 209), 'oranye': (217, 96, 11)}
km = CJ['km']; lat0 = sum([-7.97433, -7.71797]) / 2; lon0 = sum([140.53807, 140.79513]) / 2
E0, N0 = C.ke_utm(lat0, lon0, 54); KIRI = E0 - km * 500; ATAS = N0 + km * 500; MPX = km * 1000 / 500


def px(lon, lat, sk):
    E, N = C.ke_utm(lat, lon, 54)
    return ((E - KIRI) / MPX * sk, (ATAS - N) / MPX * sk)


def gambar(src, dst, lama=False, baru=False, sk=2):
    im = Image.open(BUKTI / 'citra' / src).convert('RGB').resize((500 * sk, 500 * sk), Image.LANCZOS)
    dr = ImageDraw.Draw(im, 'RGBA')
    if lama:
        for q in MSJ['pt']:
            x, y = px(q[1], q[0], sk); dr.ellipse([x - 2.2, y - 2.2, x + 2.2, y + 2.2], fill=HEX['navy'] + (200,))
    if baru:
        for q in TITIK['dalam'] + [r for r in TITIK['bbox'] if not r['dalam']]:
            if q['hari'] >= '2026-10-27':
                x, y = px(q['lon'], q['lat'], sk); dr.ellipse([x - 4, y - 4, x + 4, y + 4], fill=HEX['merah'] + (235,), outline=(255, 255, 255, 255), width=1)
    pts = [px(a_, b_, sk) for a_, b_ in POLY] + [px(*POLY[0], sk)]
    dr.line(pts, fill=(255, 255, 255, 255), width=9); dr.line(pts, fill=HEX['biru'] + (255,), width=5)
    im.save(DM / dst)
    return DM / dst


def manifest(png, sumber, masukan):
    m = {'png': png.name, 'batas': CJ['bbox'],
         'unsur_peta': {'sumber_batas': sumber, 'sistem_referensi': 'WGS84', 'proyeksi': 'UTM 54S',
                        'catatan': 'Bukan peta HGU resmi'},
         'masukan': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in masukan}}
    (png.parent / (png.stem + '.json')).write_text(json.dumps(m, ensure_ascii=False, indent=1), encoding='utf-8')


peta = gambar('msj_sesudah_20261028.png', 'peta-titik.png', True, True)
manifest(peta, 'Konsesi Kemenhut 2014 via GFW; Sentinel-2', [])
gambar('msj_sebelum_20260605.png', 'citra-0605.png')
gambar('msj_sesudah_20261028.png', 'citra-1028.png')
for f in ['udara-04.jpg', 'udara-26.jpg', 'udara-00.jpg', 'udara-06.jpg', 'udara-23.jpg', 'udara-27.jpg']:
    assert (AKAR / 'foto' / f).exists(), f

# ---------------- CSV ----------------


def tulis(nama, kolom, baris):
    with open(DM / nama, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(kolom); w.writerows(baris)


tulis('bulan.csv', ['bulan', 'titik'], [[b if b != 'Nov' else 'Nov (1-2)', bulan[6 + i]] for i, b in enumerate(BLN)])
tulis('tahun.csv', ['tahun', 'titik'], [[str(y), viirs[y]] for y in range(2012, 2027)])
NM = {'10': 'Okt', '11': 'Nov'}
tulis('dalamluar.csv', ['hari', 'dalam', 'luar'], [[f'{int(h[8:])} {NM[h[5:7]]}', len(unik[h]), len(unik_l[h])] for h in HARI10])
JN = {'sawit': 'Sawit', 'hti': 'HTI', 'hph': 'HPH', 'tambang': 'Tambang'}
tulis('peringkat.csv', ['perusahaan', 'titik'], [[x['nama'].replace(' Unit I & II', '').replace(' Tbr', '') + f" ({JN.get(x['jenis'], x['jenis'])})", x['titik']] for x in P93['perusahaan'][:8]])
KOMP = [['Aktif'] + k for k in MSJ['kompleks']] + [['Sebelumnya'] + k for k in MSJ['kompleks_lalu'][:9]]
tulis('kompleks.csv', ['status', 'lat', 'lon', 'kecamatan', 'titik', 'mulai', 'akhir', 'hari', 'frp'],
      [[s, la, lo, kc.replace(', Merauke', ''), n, f'{int(m[8:])} {"Jun Jul Agu Sep Okt".split()[int(m[5:7]) - 6]}', f'{int(e[8:])} {"Jun Jul Agu Sep Okt".split()[int(e[5:7]) - 6]}', hr, fr]
       for s, la, lo, kc, n, m, e, hr, fr in KOMP])

# ---------------- slide ----------------
KR_UD = 'Foto: pantauan udara tim BNPB, 31 Okt 2026'
KR_S2 = 'Citra: Copernicus Sentinel-2, diolah BNPB'
S_UD = 'Pantauan udara tim BNPB, 31 Okt 2026'
S_FI = 'NASA FIRMS, diolah BNPB, s.d. 2 Nov 2026; konsesi Kemenhut 2014 via GFW'

SAMPUL = {'jenis': 'sampul', 'layout': 'putih', 'judul_penuh': True, 'skala_subjudul': 0.9, 'foto': 'foto/udara-04.jpg', 'kota': 'Jakarta', 'kredit': KR_UD,
          'logo_kanan': 'foto/berakhlak-hd.png', 'kepada': 'Ditujukan khusus untuk Kepala BNPB',
          'subjudul': 'Kecamatan Jagebob dan Animha, Kabupaten Merauke, Papua Selatan',
          'penyaji': {'nama': 'Tim Ahli dan Tim Sus IT BNPB', 'jabatan': 'Badan Nasional Penanggulangan Bencana'}}

RINGKAS = {
    'jenis': 'galeri', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Ringkasan bukti', 'kredit': KR_UD,
    'judul': 'Bukti satelit, citra, dan pantauan udara menunjuk satu pola: lahan PT Merauke Sawit Jaya dibuka dengan api sepanjang 2026',
    'cut_off': False,
    'grup': [{'pil': 'Di dalam batas konsesi, 2026', 'nada': 'perhatian', 'ikon': 'karhutla', 'kartu': [
        {'nilai': t('msj.titik'), 'label': 'hotspot, 14 Jun sampai 2 Nov', 'ikon': 'karhutla', 'warna': 'merah'},
        {'nilai': t('msj.rasio', '|satuan'), 'label': 'lebih padat dari sekitarnya', 'ikon': 'naik', 'warna': 'merah'}]},
        {'pil': 'Peringkat Papua Selatan', 'nada': 'data', 'ikon': 'wilayah', 'kartu': [
            {'nilai': t('msj.peringkat'), 'label': f'dari {t("msj.papsel", "|satuan")} berapi', 'ikon': 'wilayah', 'warna': 'navy'}]}],
    'kolom_panel': 2,
    'panel': [
        {'judul': 'Tepi lahan PT Merauke Sawit Jaya, 31 Oktober', 'ikon': 'karhutla', 'kolom_foto': 1, 'bobot': 1,
         'foto': [{'berkas': 'foto/udara-04.jpg', 'keterangan': 'Batang pohon menghitam di tepi hutan, ekskavator menumbangkan pohon di lahan terbuka'}]},
        {'judul': 'Empat lapis bukti', 'ikon': 'ringkasan', 'bobot': 1, 'temuan': [
            {'kode': 'Temuan A.1', 'keyakinan': 'resmi', 'ikon': 'karhutla', 'teks': f'**Api berulang di dalam batas.** Hotspot terdeteksi pada {t("msj.hari", "|satuan")}; Oktober saja {t("msj.bln.okt", "|satuan")}.'},
            {'kode': 'Temuan A.2', 'keyakinan': 'estimasi-model', 'ikon': 'luas', 'teks': f'**Lahan terbuka bertambah.** Citra Sentinel-2: {t("msj.buka.jun", "|satuan")} pada 5 Jun menjadi {t("msj.buka.okt", "|satuan")} pada 28 Okt.'},
            {'kode': 'Temuan A.3', 'keyakinan': 'resmi', 'ikon': 'naik', 'teks': f'**Tidak pernah sebesar ini.** Titik 2026 sudah {t("msj.kali", "|satuan")} tahun El Nino 2015.'},
            {'kode': 'Temuan A.4', 'keyakinan': 'terverifikasi', 'ikon': 'peringatan', 'teks': '**Dilihat langsung dari udara.** Semak dibakar sebelum pohon ditumbangkan; tidak tampak regu maupun sekat bakar.'}]}],
    'sumber': 'NASA FIRMS dan Copernicus Sentinel-2, diolah BNPB; pantauan udara BNPB, 31 Okt 2026',
}

LOKASI = {
    'jenis': 'temuan-peta', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan', 'rasio': 0.56, 'pesan': 'Hotspot menumpuk di dalam batas konsesi',
    'judul': f'{t("msj.titik", "|satuan")} jatuh di dalam batas konsesi {t("msj.luas", "|satuan")}; titik terbaru menumpuk di tepi blok yang baru dibuka',
    'cut_off': False,
    'peta': {'png': 'data/msj/peta-titik.png', 'legenda': {'judul': 'Citra SWIR 28 Okt 2026', 'item': [
        {'warna': 'biru', 'label': 'Batas konsesi'}, {'warna': 'navy', 'label': 'Titik 14 Jun sampai 26 Okt'}, {'warna': 'merah', 'label': 'Titik 27 Okt sampai 2 Nov'}]},
        'keyakinan': 'resmi', 'sumber': 'NASA FIRMS, diolah BNPB; Copernicus Sentinel-2; konsesi Kemenhut 2014 via GFW'},
    'panel': {'judul': 'Identitas lahan', 'ikon': 'wilayah', 'skala_huruf': 1.25, 'daftar': [
        f'**PT Merauke Sawit Jaya**, konsesi kelapa sawit {t("msj.luas", "|satuan")} di Kecamatan Jagebob dan Animha, Kabupaten Merauke.',
        'Batas dari peta konsesi sawit Kemenhut 2014 (via Global Forest Watch); bukan peta HGU ATR/BPN.',
        'Blok kebun bergrid tampak jelas di citra dan berimpit dengan batas konsesi.',
        f'Titik merah 27 Okt sampai 2 Nov menumpuk di blok utara dan barat yang baru dibuka; di dalam batas tercatat {t("msj.u31", "|satuan")} pada 31 Okt, hari tim terbang.',
        'Gambut di dalam batas: nol; api di tanah mineral menyebar cepat di permukaan.']},
    'sumber': 'NASA FIRMS dan Sentinel-2 28 Okt 2026, diolah BNPB; konsesi Kemenhut 2014 via GFW',
}

CITRA = {
    'jenis': 'galeri', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': 'Lahan terbuka bertambah', 'kredit': KR_S2,
    'judul': f'Citra Sentinel-2: lahan terbuka di dalam batas naik dari {t("msj.buka.jun", "|satuan")} pada 5 Juni menjadi {t("msj.buka.okt", "|satuan")} pada 28 Oktober',
    'cut_off': False, 'kolom_panel': 3,
    'panel': [
        {'judul': 'Sebelum api: 5 Juni 2026', 'ikon': 'kalender', 'kolom_foto': 1, 'bobot': 1.15,
         'foto': [{'berkas': 'data/msj/citra-0605.png', 'utuh': True, 'keterangan': 'Blok utara dan segitiga tengah masih hutan (hijau)'}]},
        {'judul': 'Sesudah api: 28 Oktober 2026', 'ikon': 'karhutla', 'kolom_foto': 1, 'bobot': 1.15,
         'foto': [{'berkas': 'data/msj/citra-1028.png', 'utuh': True, 'keterangan': 'Blok baru terbuka; segitiga tengah gelap bekas bakar'}]},
        {'judul': 'Cara membaca citra', 'ikon': 'ringkasan', 'bobot': 0.9, 'skala_huruf': 1.2, 'daftar': [
            '**Kanal SWIR** (inframerah gelombang pendek): vegetasi hijau, tanah terbuka jingga-merah muda, bekas bakar cokelat gelap, api aktif merah terang.',
            f'**Bertambah** {t("msj.buka.tambah", "|satuan")} lahan tanpa vegetasi, kini {t("msj.buka.persen", "|satuan")} dari luas konsesi.',
            f'**Sejalan dengan satelit api:** luas piksel ber-hotspot sampai 26 Okt {t("msj.bakar", "|satuan")}.',
            '**Batas biru** = konsesi Kemenhut 2014; hampir seluruh blok kebun yang terbuka berada di dalam batas ini.']}],
    'sumber': 'Copernicus Sentinel-2 L2A, 5 Jun dan 28 Okt 2026, luas di dalam batas konsesi, diolah BNPB',
}

TREN = {
    'jenis': 'temuan-grafik', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'rasio': 0.6, 'pesan': 'Api memuncak Oktober',
    'judul': f'Api di konsesi melonjak sejak September: Oktober mencatat {t("msj.bln.okt", "|satuan")}, {t("msj.okt.persen", "|satuan")} dari titik 2026',
    'cut_off': False,
    'grafik': {'judul_panel': 'Hotspot di dalam batas per bulan', 'ikon': 'kalender', 'judul': '**Hotspot VIIRS S-NPP**, titik, Juni sampai 2 November 2026',
               'keluarga': 'api', 'ubah': False, 'persen_batang': False, 'data': {'csv': 'data/msj/bulan.csv', 'kolom': [{'nama': 'bulan', 'kepala': 'Bulan'}, {'nama': 'titik', 'kepala': 'Titik', 'fmt': '0'}],
                                           'keyakinan': 'resmi', 'sumber': S_F}},
    'panel': {'judul': 'Yang terbaca', 'ikon': 'naik', 'skala_huruf': 1.3, 'daftar': [
        f'**Bukan api sesaat.** Api pertama 14 Jun; sejak 1 September hotspot muncul pada {t("msj.hari.sep", "|satuan")} dari {t("msj.hari.sep.n", "|satuan")}.',
        f'**September dan Oktober** menyumbang {t("msj.sep.okt", "|satuan")}, masa puncak pembukaan blok baru.',
        f'**Satu kompleks api** di Jagebob menyala {t("msj.kompleks.hari", "|satuan")} berturut-turut dengan {t("msj.kompleks.besar", "|satuan")}.',
        '**Api belum padam:** titik masih tercatat tiap hari sampai 2 Nov.']},
    'sumber': S_F + ', keyakinan nominal dan tinggi, hari WIB',
}

RIWAYAT = {
    'jenis': 'temuan-grafik', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'rasio': 0.64, 'pesan': 'Rekor tertinggi sejak ada satelit',
    'judul': f'Titik 2026 di konsesi ini sudah {t("msj.kali", "|satuan")} tahun El Nino 2015, rekor sejak satelit VIIRS mulai mengamati',
    'cut_off': False,
    'grafik': {'judul_panel': 'Hotspot di dalam batas per tahun', 'ikon': 'data', 'judul': '**Hotspot VIIRS S-NPP**, titik, 2012 sampai 12 Oktober 2026',
               'keluarga': 'api', 'sorot': 'terbaru', 'ubah': False, 'persen_batang': False, 'data': {'csv': 'data/msj/tahun.csv', 'kolom': [{'nama': 'tahun', 'kepala': 'Tahun'}, {'nama': 'titik', 'kepala': 'Titik', 'fmt': '0'}],
                                                              'keyakinan': 'resmi', 'sumber': 'NASA FIRMS VIIRS S-NPP 2012 sampai 2026, diolah BNPB'}},
    'panel': {'judul': 'Pembanding', 'ikon': 'kalender', 'skala_huruf': 1.3, 'daftar': [
        '**Tahun terbanyak sebelumnya** 2015, tahun El Nino kuat dengan kemarau panjang; 2026 sudah jauh melampauinya sebelum musim api selesai.',
        f'**MODIS sejak 2003** memberi pola sama: {t("msj.modis2026", "|satuan")} pada 2026, {t("msj.modis2015", "|satuan")} pada 2015.',
        '**Tahun normal** 2016 sampai 2025 hampir tanpa api di lahan ini.',
        '**Artinya:** lonjakan 2026 bukan cuaca semata, tetapi bertepatan dengan pembukaan blok kebun baru.']},
    'sumber': 'NASA FIRMS VIIRS S-NPP dan MODIS, diolah BNPB, s.d. 12 Okt 2026',
}

BANDING = {
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'rasio': 0.5, 'pesan': 'Api terpusat di dalam batas',
    'judul': f'Api tidak datang dari luar: titik di dalam batas {t("msj.rasio", "|satuan")} lebih padat dibanding cincin {t("msj.cincin", "|satuan")} di sekelilingnya',
    'cut_off': False,
    'grup': [{'pil': '24 Okt sampai 2 Nov', 'nada': 'perhatian', 'ikon': 'karhutla', 'kartu': [
        {'nilai': t('msj.pad.dalam'), 'label': 'titik per seribu ha di dalam', 'ikon': 'karhutla', 'warna': 'merah'},
        {'nilai': t('msj.pad.luar'), 'label': 'titik per seribu ha di luar', 'ikon': 'wilayah', 'warna': 'navy'}]}],
    'tabel': {'judul_panel': 'Lokasi titik unik per hari', 'ikon': 'kalender', 'peringkat': False, 'data': {
        'csv': 'data/msj/dalamluar.csv', 'kolom': [{'nama': 'hari', 'kepala': 'Hari'}, {'nama': 'dalam', 'kepala': 'Di dalam batas', 'fmt': '0'}, {'nama': 'luar', 'kepala': 'Cincin luar batas', 'fmt': '0'}],
        'keyakinan': 'resmi', 'sumber': 'NASA FIRMS (MODIS, VIIRS), lokasi unik 375 m per hari WIB, diolah BNPB'}},
    'panel': {'judul': 'Kenapa ini penting', 'ikon': 'peringatan', 'skala_huruf': 1.25, 'daftar': [
        f'**Total sepuluh hari:** {t("msj.unik.dalam", "|satuan")} di dalam batas, {t("msj.unik.luar", "|satuan")} di cincin luar yang dua kali lebih luas.',
        '**Api bermula di dalam,** bukan merambat dari kampung atau hutan sekitar.',
        '**Lahan tetangga** PT Selaras Inti Semesta dan PT Medcopapua Alam Lestari hampir tanpa titik pada hari terbang.']},
    'sumber': 'NASA FIRMS lokasi unik, diolah BNPB, 24 Okt sampai 2 Nov 2026; pantauan udara BNPB',
}

MODUS = {
    'jenis': 'galeri', 'jenis_slide': 'panel', 'judul_bentuk': 'deskriptif', 'pesan': 'Modus pembukaan lahan', 'kredit': KR_UD,
    'judul': 'Dari udara: semak dibakar dulu di bawah pohon tegak, pohon ditumbangkan sesudahnya, tanpa regu dan sekat bakar',
    'cut_off': False, 'kolom_panel': 4,
    'panel': [
        {'judul': '1. Semak dibakar', 'ikon': 'karhutla', 'kolom_foto': 1, 'foto': [{'berkas': 'foto/udara-26.jpg', 'keterangan': 'Asap di lantai hutan, pohon masih tegak'}]},
        {'judul': '2. Pohon ditumbang', 'ikon': 'peringatan', 'kolom_foto': 1, 'foto': [{'berkas': 'foto/udara-00.jpg', 'keterangan': 'Ekskavator di lahan baru dibuka'}]},
        {'judul': '3. Kayu ditumpuk', 'ikon': 'luas', 'kolom_foto': 1, 'foto': [{'berkas': 'foto/udara-06.jpg', 'keterangan': 'Kayu tumbang ditumpuk berbaris'}]},
        {'judul': 'Klaim dan kenyataan', 'ikon': 'ringkasan', 'skala_huruf': 1.3, 'daftar': [
            '**Klaim perusahaan:** pohon ditebang dulu, kayu disusun, baru dibakar terkendali.',
            '**Kenyataan:** batang pohon yang masih tegak menghitam setinggi semak; api lewat sebelum pohon ditebang.',
            '**Api di samping alat berat** yang sedang bekerja, mengikuti batas lahan yang dibuka.',
            '**Tidak dijaga:** tidak tampak regu atau sekat bakar; api menjalar ke hutan sekitar.']}],
    'sumber': S_UD,
}

PERINGKAT = {
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'rasio': 0.6, 'pesan': 'Terbanyak di Papua Selatan',
    'judul': f'Di antara {t("msj.papsel", "|satuan")} berapi di Papua Selatan, PT Merauke Sawit Jaya mencatat titik terbanyak 2026',
    'cut_off': False,
    'utama': {'judul': 'Hotspot 2026 per konsesi s.d. 26 Okt, delapan teratas Papua Selatan', 'ikon': 'wilayah', 'lollipop': {
        'sorot': 'PT Merauke Sawit Jaya (Sawit)', 'satuan': 'Titik VIIRS S-NPP', 'skala_huruf': 1.2, 'data': {
            'csv': 'data/msj/peringkat.csv', 'kolom': [{'nama': 'perusahaan'}, {'nama': 'titik', 'kepala': 'Titik', 'fmt': '0'}],
            'keyakinan': 'resmi', 'sumber': 'NASA FIRMS VIIRS S-NPP, konsesi Kemenhut/GFW dan Trase, diolah BNPB, 1 Jan sampai 26 Okt 2026'}}},
    'panel': {'judul': 'Beda dengan yang lain', 'ikon': 'peringatan', 'skala_huruf': 1.3, 'daftar': [
        f'**Paling padat:** {t("msj.bakar", "|satuan")} piksel api, hampir separuh konsesi; HPH dan HTI lain yang lebih luas di bawah seperlima.',
        '**Satu-satunya konsesi sawit** di jajaran atas; sisanya izin kayu (HPH, HTI).',
        f'**Kompleks aktif:** {t("msj.kompleks", "|satuan")} pada 20 Okt sampai 26 Okt, seluruhnya di Jagebob dan Animha.']},
    'sumber': 'NASA FIRMS VIIRS S-NPP, diolah BNPB, s.d. 26 Okt 2026; konsesi Kemenhut via GFW dan Trase',
}

HUKUM = {
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'deskriptif', 'pesan': 'Kewajiban hukum dan temuan', 'rasio': 0.64,
    'judul': 'Temuan berhadapan langsung dengan dua larangan dan satu kewajiban pelaku usaha perkebunan',
    'cut_off': False,
    'utama': {'judul': 'Aturan dan bukti', 'ikon': 'regulasi', 'banding': {
        'kiri': {'judul': 'Aturan'}, 'kanan': {'judul': 'Bukti yang ada'},
        'baris': [
            {'label': 'Larangan membakar', 'kiri': 'UU 39/2014 Pasal 56: pelaku usaha perkebunan dilarang membuka lahan dengan cara membakar.',
             'kanan': 'Foto udara: semak dibakar sebelum pohon ditumbang, api di samping ekskavator yang bekerja.'},
            {'label': 'Wajib sarana pengendalian', 'kiri': 'UU 39/2014 Pasal 56: wajib punya sistem, sarana, dan prasarana pengendalian kebakaran.',
             'kanan': f'Tidak tampak regu atau sekat bakar; api menyala {t("msj.hari", "|satuan")} dan menjalar ke hutan.'},
            {'label': 'Larangan lingkungan', 'kiri': 'UU 32/2009 Pasal 69: setiap orang dilarang membuka lahan dengan cara membakar.',
             'kanan': f'{t("msj.titik", "|satuan")} di dalam batas, {t("msj.rasio", "|satuan")} lebih padat dari sekitarnya.'},
            {'label': 'Tata cara tanpa bakar', 'kiri': 'Permentan 5/2018: pembukaan lahan perkebunan wajib tanpa membakar.',
             'kanan': 'Pola bakar lalu tebang bertentangan langsung dengan tata cara ini.'}]}},
    'panel': {'judul': 'Yang masih perlu dipastikan', 'ikon': 'peringatan', 'skala_huruf': 1.2, 'daftar': [
        '**Status izin dan pemegang hak** sekarang (HGU, IUP-B) dari ATR/BPN dan Kementan; batas di deck ini peta 2014.',
        '**Siapa yang membuka lahan:** Merauke juga lokasi PSN pangan dan energi; pastikan alat berat milik siapa.',
        '**Foto udara asli bergeotag** dari tim; berkas di deck sudah tanpa koordinat.',
        '**Cek lapangan** di kompleks aktif: bekas bakar, alat, dan saksi.']},
    'sumber': 'UU 39/2014 Perkebunan; UU 32/2009 PPLH; Permentan 5/2018; data satelit dan pantauan udara BNPB',
}

RTL = {
    'jenis': 'rekomendasi', 'jenis_slide': 'rekomendasi', 'judul_bentuk': 'deskriptif', 'pesan': 'Rencana tindak lanjut',
    'judul': 'Enam langkah tindak lanjut: bukti diserahkan ke penegak hukum, api di konsesi dipadamkan, perusahaan dipanggil',
    'cut_off': False, 'sumber': 'Rangkuman bukti satelit, citra, dan pantauan udara',
    'rekomendasi': [
        {'kode': 'R-1', 'jenis': 'regulasi', 'langkah': 'Serahkan berkas bukti', 'waktu': 'segera', 'rincian': 'Deck ini, data titik, citra, foto, dan video udara diserahkan sebagai bahan penyelidikan dugaan pembakaran lahan.', 'lembaga': ['Kementerian Lingkungan Hidup', 'Polri']},
        {'kode': 'R-2', 'jenis': 'regulasi', 'langkah': 'Panggil PT Merauke Sawit Jaya', 'waktu': 'segera', 'rincian': 'Klarifikasi pembukaan lahan, minta hentikan pembakaran dan padamkan api di areal serta sekitarnya.', 'lembaga': ['Pemkab Merauke', 'Kementerian Pertanian']},
        {'kode': 'R-3', 'jenis': 'data', 'langkah': 'Pastikan izin dan pemegang hak', 'waktu': 'sepekan', 'rincian': 'Cocokkan batas 2014 dengan HGU dan IUP-B terbaru serta lokasi PSN Merauke.', 'lembaga': ['ATR/BPN', 'Kementerian Pertanian']},
        {'kode': 'R-4', 'jenis': 'data', 'langkah': 'Cek lapangan kompleks aktif', 'waktu': 'sepekan', 'rincian': 'Regu datang ke kompleks di lampiran dengan foto bergeotag, sampel bekas bakar, dan keterangan saksi.', 'lembaga': ['Manggala Agni', 'BPBD Papua Selatan']},
        {'kode': 'R-5', 'jenis': 'kapasitas', 'langkah': 'Padamkan cluster Jagebob', 'waktu': 'segera', 'rincian': 'Water bombing dan regu darat diarahkan ke blok utara dan barat konsesi yang masih menyala.', 'lembaga': ['Deputi Penanganan Darurat', 'BPBD Papua Selatan']},
        {'kode': 'R-6', 'jenis': 'data', 'langkah': 'Pantau harian sampai padam', 'waktu': 'segera', 'rincian': 'Titik di dalam batas dilaporkan tiap pagi; citra baru ditarik tiap ada lintasan cerah.', 'lembaga': ['Pusdalops BNPB', 'Tim Ahli BNPB']}],
}

LAMP = {'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'kode': 'A1', 'pesan': 'Koordinat kompleks api',
        'judul': 'Koordinat kompleks api di dalam batas konsesi untuk cek lapangan', 'judul_daftar': 'Koordinat kompleks api untuk cek lapangan',
        'cut_off': False, 'data': {'csv': 'data/msj/kompleks.csv', 'kolom': [
            {'nama': 'status', 'kepala': 'Status'}, {'nama': 'kecamatan', 'kepala': 'Kecamatan'}, {'nama': 'lat', 'kepala': 'Lintang', 'fmt': '4'}, {'nama': 'lon', 'kepala': 'Bujur', 'fmt': '4'},
            {'nama': 'titik', 'kepala': 'Titik', 'fmt': '0'}, {'nama': 'mulai', 'kepala': 'Mulai'}, {'nama': 'akhir', 'kepala': 'Akhir'}, {'nama': 'hari', 'kepala': 'Hari', 'fmt': '0'},
            {'nama': 'frp', 'kepala': 'FRP maks (MW)', 'fmt': '1'}],
            'keyakinan': 'resmi', 'sumber': 'NASA FIRMS VIIRS S-NPP, kompleks api sistem BNPB, 20 Agu sampai 26 Okt 2026'},
        'sumber': 'NASA FIRMS VIIRS S-NPP, kompleks api sistem BNPB, s.d. 26 Okt 2026'}

PENUTUP = {'jenis': 'penutup', 'foto': 'foto/udara-23.jpg', 'logo_kanan': 'foto/berakhlak-hd.png', 'kredit': KR_UD, 'teks': 'Terima Kasih',
           'laporan': 'Bukti kebakaran di konsesi PT Merauke Sawit Jaya, 3 November 2026'}

SPEK = {
    '_catatan': 'Bukti kebakaran di konsesi PT Merauke Sawit Jaya untuk Kepala BNPB. Dibangun dari spek/bangun_spek_msj.py.',
    'pesan_kunci': 'Api Merauke 2026 terpusat di konsesi PT Merauke Sawit Jaya dan bergerak bersama pembukaan lahan; bukti satelit, citra, dan udara cukup untuk diserahkan ke penegak hukum.',
    'judul_dokumen': 'Bukti Kebakaran di Konsesi PT Merauke Sawit Jaya', 'subjek_dokumen': 'Bukti karhutla konsesi, 3 November 2026',
    'kajian': 'bukti-msj', 'format': 'kajian', 'tanggal': '2026-11-03', 'cut_off': '2 Nov 2026, 24.00 WIB',
    'bagian': [{'judul': 'Bukti Satelit dan Citra', 'label': 'Bukti satelit'}, {'judul': 'Bukti Udara dan Dasar Hukum', 'label': 'Bukti udara dan hukum'}],
    'slide': [SAMPUL, RINGKAS, {'jenis': 'daftar-isi'}, {'jenis': 'pembatas-seksi', 'bagian': 1}, LOKASI, CITRA, TREN, BANDING, PERINGKAT, RIWAYAT,
              {'jenis': 'pembatas-seksi', 'bagian': 2}, MODUS, HUKUM, RTL,
              {'jenis': 'pembatas-lampiran', 'kelompok': {'A': 'Data cek lapangan'}}, LAMP, PENUTUP],
}

if __name__ == '__main__':
    tp = AKAR / 'tema.json'
    tema = json.loads(tp.read_text(encoding='utf-8'))
    tema['kajian']['bukti-msj'] = {'judul': 'Bukti Kebakaran di Konsesi PT Merauke Sawit Jaya', 'subjudul': 'Kecamatan Jagebob dan Animha, Kabupaten Merauke, Papua Selatan',
                                   'judul_pendek': 'Bukti Konsesi PT MSJ', 'nama_berkas': 'Bukti Karhutla PT Merauke Sawit Jaya {DDMMYY}', 'batas_halaman_isi': None,
                                   'lampiran': 'ABCDEFGHIJKL', 'kata_kunci': ['BNPB', 'karhutla', 'Merauke', 'konsesi', 'PT Merauke Sawit Jaya'],
                                   'cakupan_sampul': 'Kabupaten Merauke, Papua Selatan.'}
    tp.write_text(json.dumps(tema, ensure_ascii=False, indent=1), encoding='utf-8')
    rp = AKAR / 'data/angka.json'
    reg = json.loads(rp.read_text(encoding='utf-8'))
    reg['angka'].update(ANGKA)
    rp.write_text(json.dumps(reg, ensure_ascii=False, indent=1), encoding='utf-8')
    pp = AKAR / 'pustaka.json'
    pu = [x for x in json.loads(pp.read_text(encoding='utf-8')) if x['id'] not in {p['id'] for p in PUSTAKA}] + PUSTAKA
    pp.write_text(json.dumps(pu, ensure_ascii=False, indent=1), encoding='utf-8')
    (AKAR / 'spek/bukti-msj.json').write_text(json.dumps(SPEK, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{len(ANGKA)} angka, {len(SPEK["slide"])} slide; titik {tot26}, unik {ud}/{ul}, rasio {pd_ / pl_:.1f}, buka {buka_jun}->{buka_okt}')
