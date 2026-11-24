#!/usr/bin/env python3
"""Paparan Kebencanaan Kabupaten Solok, Sumatera Barat, fokus banjir (pemilik 24 Nov 2026: "buat yang versi lengkapnya aja kayak biasa",
pola Paparan Sumatera Barat 23 Nov 2026; "yang logistik gausah").
Data: DIBI BNPB (dibi_kab_tahun, kejadian dan status darurat per kabupaten, ditarik 23 Nov 2026), WA Koordalops 4 dan 9 Nov 2026,
prakiraan banjir per kecamatan centurisk97.id/banjir/data/status.json (salinan di data/sumut-aceh/sl/status.json), NASA FIRMS
diolah BNPB, MAGMA PVMBG.
  ../../.venv/bin/python spek/bangun_spek_solok.py
  deck.py spek/solok.json "<keluar>.pptx" --pdf --akar assets/proyek-wilayah"""
import collections as C, csv, json, re
from pathlib import Path
AKAR = Path(__file__).resolve().parents[1]
D = AKAR / 'data/sumut-aceh/sl'; D.mkdir(exist_ok=True)
HID = AKAR / 'data/skenario-hidromet'
P_D, P_K, P_P = 'bnpb-dibi-2026-11-01', 'sistem-karhutla-2026-11-23', 'sistem-prakiraan-banjir'
S_D = 'DIBI BNPB, 23 Nov 2026'
ANGKA = {}
def a(k, nilai, satuan, pustaka=P_D, sumber=S_D):
    ANGKA[k] = {'nilai': nilai, 'satuan': satuan, 'pustaka': pustaka, 'sumber': sumber, 'keyakinan': 'resmi'}
def t(k, o=''): return '{{angka:%s%s}}' % (k, o)
def tulis(n, kol, bar):
    with open(D / n, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f); w.writerow(kol); w.writerows(bar)
def c(n, kol, sumber=S_D): return {'csv': f'data/sumut-aceh/sl/{n}', 'kolom': kol, 'keyakinan': 'resmi', 'sumber': sumber}
F = lambda n, kp, **kw: {'nama': n, 'kepala': kp, 'fmt': '0', **kw}
s_ = lambda v: '' if v is None else v

# ---------- 1. riwayat banjir dan longsor 2008-2026 (DIBI tahunan)
T = [r for r in csv.DictReader(open(HID / 'dibi_kab_tahun.csv', encoding='utf-8')) if r['kode'] == '1302']
BASAH = {'banjir': 'Banjir', 'banjir_bandang': 'Banjir bandang', 'longsor': 'Tanah longsor'}
th = C.Counter()
for r in T:
    if r['jenis'] in BASAH: th[int(r['tahun'])] += float(r['kejadian'])
TH = list(range(2008, 2027)); n_th = {y: round(th[y]) for y in TH}
tulis('kejadian_tahun.csv', ['tahun', 'kejadian'], [[y, n_th[y]] for y in TH])
jn = {j: dict(kejadian=0, korban=0, rumah=0, ungsi=0) for j in BASAH}
for r in T:
    if r['jenis'] in BASAH:
        jn[r['jenis']]['kejadian'] += float(r['kejadian']); jn[r['jenis']]['korban'] += int(r['meninggal']) + int(r['hilang']); jn[r['jenis']]['rumah'] += int(r['rumah_rusak']); jn[r['jenis']]['ungsi'] += int(r['mengungsi'])
tulis('jenis_basah.csv', ['jenis', 'kejadian', 'korban', 'ungsi', 'rumah'], [[BASAH[j], round(v['kejadian']), v['korban'], v['ungsi'], v['rumah']] for j, v in jn.items()])
a('sl.h.n', sum(n_th.values()), 'kejadian'); a('sl.h.m', sum(v['korban'] for v in jn.values()), 'jiwa meninggal dan hilang'); a('sl.h.r', sum(v['rumah'] for v in jn.values()), 'rumah rusak')

# ---------- 2. dua banjir terakhir (DIBI per kejadian)
B25 = dict(meninggal=None, luka=88, mengungsi=792, terdampak=49306, rb=181, rs=60, rr=59, terendam=2353, pendidikan=25, ibadah=14, umum=39, jembatan=18, lahan=12)
B26 = dict(meninggal=2, luka=14, mengungsi=77, terdampak=None, rb=19, rs=9, rr=33, terendam=13, pendidikan=None, ibadah=None, umum=None, jembatan=2, lahan=15)
# dikelompokkan (pemilik 24 Nov 2026: "Korban, Rumah, Fasum ... coba cari kategorinya")
KEL = [('Korban', [('Meninggal', 'meninggal'), ('Luka', 'luka'), ('Mengungsi', 'mengungsi'), ('Jiwa terdampak', 'terdampak')]),
       ('Rumah', [('Rusak berat', 'rb'), ('Rusak sedang', 'rs'), ('Rusak ringan', 'rr'), ('Terendam', 'terendam')]),
       ('Fasilitas umum dan lahan', [('Sekolah rusak', 'pendidikan'), ('Tempat ibadah rusak', 'ibadah'), ('Fasilitas umum lain rusak', 'umum'),
                                     ('Jembatan rusak', 'jembatan'), ('Lahan rusak, ha', 'lahan')])]
BAR = [x for g in KEL for x in [(g[0], None), *g[1]]]
tulis('dampak.csv', ['dampak', 'b25', 'b26'], [[n, '', ''] if k is None else [n, s_(B25[k]), s_(B26[k])] for n, k in BAR])
a('sl.26.m', 2, 'jiwa meninggal'); a('sl.26.u', 77, 'jiwa mengungsi'); a('sl.26.r', 19 + 9 + 33, 'rumah rusak')
for k_, v_, st_ in (('mobil', 7, 'mobil'), ('motor', 7, 'sepeda motor'), ('jalan', 5, 'ruas jalan'), ('air', 5, 'jaringan air bersih'), ('sawah', 18, 'ha sawah'), ('kantor', 15, 'kantor'), ('kend', 14, 'kendaraan'), ('ancam', 10, 'rumah terancam')):
    a(f'sl.26.{k_}', v_, st_, sumber='Laporan Dit. Koordalops BNPB, 4 Nov s.d. 23 Nov 2026')

# ---------- 3. status darurat kabupaten sejak 2025 (DIBI)
ST = [('Siaga Darurat', 'Karhutla', '21 Jul 2025', '3 Agu 2025'),
      ('Tanggap Darurat', 'Banjir, longsor, cuaca ekstrem', '25 Nov 2025', '8 Des 2025'),
      ('Tanggap Darurat', 'Banjir, longsor, cuaca ekstrem', '9 Des 2025', '15 Des 2025'),
      ('Tanggap Darurat', 'Banjir, longsor, cuaca ekstrem', '16 Des 2025', '22 Des 2025'),
      ('Transisi Darurat', 'Banjir, longsor, cuaca ekstrem', '23 Des 2025', '23 Jun 2026'),
      ('Transisi Darurat', 'Banjir, longsor, cuaca ekstrem', '23 Jun 2026', '23 Jun 2028'),
      ('Tanggap Darurat', 'Banjir, longsor, cuaca ekstrem', '22 Sep 2026', '5 Okt 2026'),
      ('Tanggap Darurat', 'Banjir, longsor, cuaca ekstrem', '6 Okt 2026', '12 Okt 2026'),
      ('Transisi Darurat', 'Banjir, longsor, cuaca ekstrem', '13 Okt 2026', '13 Apr 2027')]
tulis('status.csv', ['status', 'jenis', 'mulai', 'berakhir'], ST)
a('sl.st.n', sum(1 for x in ST if x[1] != 'Karhutla'), 'kali')

# ---------- 4. prakiraan banjir per kecamatan (status.json situs)
st = json.load(open(D / 'status.json', encoding='utf-8'))
LV = {0: 'Normal', 1: 'Waspada', 2: 'Siaga', 3: 'Awas'}
BL = 'Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des'.split()
hr = [f'{int(h[8:])} {BL[int(h[5:7]) - 1]}' for h in st['hari']]
import re
kec = sorted([(re.sub(r'^(Ix|Xi|Vii|Iii|Ii|Iv|Vi)\b', lambda m: m[0].upper(), k.split('|')[2]), v) for k, v in st['kec'].items() if k.startswith('13|Solok|')], key=lambda x: (-max(x[1]['b']), -max(x[1]['h3d']), x[0]))
tulis('prakiraan.csv', ['kec', *[f'h{i}' for i in range(len(hr))]], [[n, *[f'{LV[b]}|{round(h)} mm' for b, h in zip(v['b'], v['h3d'])]] for n, v in kec])   # nilai hujan per tanggal (pemilik 24 Nov 2026)
w_ = sum(1 for _, v in kec if max(v['b']) == 1)
tulis('prakiraan_jumlah.csv', ['status', 'kec', 'ambang'], [[LV[l], sum(1 for _, v in kec if max(v['b']) == l),
      {3: 'Hujan 3 hari 120 mm atau lebih', 2: 'Hujan 3 hari 80 mm atau lebih', 1: 'Hujan 3 hari 40 mm atau lebih', 0: 'Di bawah ambang Waspada'}[l]] for l in (3, 2, 1, 0)])
rentang = f'{hr[0][:-4]}–{hr[-1]}' if hr[0][-3:] == hr[-1][-3:] else f'{hr[0]}–{hr[-1]}'
S_P = f'ECMWF IFS, GloFAS, InaRISK BNPB, {hr[0]} 2026'

# peta kecamatan Kab Solok, warna status tertinggi empat hari (pemilik 24 Nov 2026: "ga ada peta bro? ... untuk kondisi terkini")
TOK = {0: 'tint.netral.pita', 1: 'skala.emas.3', 2: 'oranye', 3: 'merah'}
def peta_solok(png, w_in=7.2, h_in=4.6):
    import importlib.util, os
    from PIL import Image, ImageDraw, ImageFont
    gen = Path.home() / 'Developer/poskokarhutla/data/laporan-bnpb/generator/situasi_banjir.py'
    sp_ = importlib.util.spec_from_file_location('situasi_banjir', gen); m = importlib.util.module_from_spec(sp_); sp_.loader.exec_module(m)
    import sys as _s; _s.path.insert(0, str(AKAR.parents[1] / 'scripts'))
    from tema import muat, warna as _w
    _t = muat(AKAR / 'tema.json')
    hx = lambda tok: '#' + _w(_t, tok).lstrip('#')
    lv = {n: max(v['b']) for n, v in kec}
    G = [f for f in json.load(open(Path(m.AKAR) / 'public/geo/kecamatan/13.json', encoding='utf-8'))['features'] if f['properties']['kab'] == 'Solok']
    K = m.geo_kab('13')
    xs = [c for f in G for q in m.cincin(f['geometry']) for c in q[0]]
    lon0, lon1, lat0, lat1 = min(c[0] for c in xs), max(c[0] for c in xs), min(c[1] for c in xs), max(c[1] for c in xs)
    SS, W, H = 2, int(w_in * 300), int(h_in * 300); W_, H_ = W * SS, H * SS
    sk = min(W_ * .92 / (lon1 - lon0), H_ * .92 / (lat1 - lat0)); cx, cy = (lon0 + lon1) / 2, (lat0 + lat1) / 2
    X = lambda o: W_ / 2 + (o - cx) * sk; Y = lambda a_: H_ / 2 - (a_ - cy) * sk
    im = Image.new('RGB', (W_, H_), '#FFFFFF'); d = ImageDraw.Draw(im)
    for k, g in K.items():
        if k != '13|Solok':
            for q in m.cincin(g): d.polygon([(X(c[0]), Y(c[1])) for c in q[0]], fill='#F3F5F8', outline='#FFFFFF', width=SS)
    pus = {}
    nama = lambda n: re.sub(r'^(Ix|Xi|Vii|Iii|Ii|Iv|Vi)\b', lambda m_: m_[0].upper(), n.title())
    for f in G:
        n = nama(f['properties']['kec']); l_ = lv.get(n, 0)
        for q in m.cincin(f['geometry']):
            pts = [(X(c[0]), Y(c[1])) for c in q[0]]
            if len(pts) > 2: d.polygon(pts, fill=hx(TOK[l_]), outline='#FFFFFF', width=3 * SS)
            if len(q[0]) > len(pus.get(n, (0, []))[1]): pus[n] = (l_, q[0])
    F = lambda n_, b=True: ImageFont.truetype(os.path.join(m.FONT, 'Roboto-' + ('Bold' if b else 'Regular') + '.ttf'), n_ * SS)
    for n, (l_, ring) in pus.items():
        x, y = X(sum(c[0] for c in ring) / len(ring)), Y(sum(c[1] for c in ring) / len(ring))
        d.text((x, y), n, font=F(22), fill=hx('navy'), anchor='mm', stroke_width=3 * SS, stroke_fill='#FFFFFF')
    px = 10 / 111.32 * sk; x0, y0 = 30 * SS, H_ - 26 * SS
    d.line([(x0, y0), (x0 + px, y0)], fill=hx('navy'), width=3 * SS)
    d.text((x0 + px / 2, y0 - 16 * SS), '10 km', font=F(20, False), fill=hx('navy'), anchor='mm')
    d.polygon([(x0 + 6 * SS, y0 - 70 * SS), (x0, y0 - 46 * SS), (x0 + 12 * SS, y0 - 46 * SS)], fill=hx('navy'))
    d.text((x0 + 6 * SS, y0 - 36 * SS), 'U', font=F(20), fill=hx('navy'), anchor='mm')
    im.resize((W, H), Image.LANCZOS).save(png, optimize=True)
    import hashlib
    Path(png).with_suffix('.json').write_text(json.dumps({'png': Path(png).name, 'unsur_peta': {'sumber_batas': 'Batas administrasi kecamatan dan kabupaten, data geo sistem BNPB',
        'sistem_referensi': 'WGS84', 'proyeksi': 'Ekuirektangular'}, 'masukan': {'prakiraan.csv': hashlib.sha256((D / 'prakiraan.csv').read_bytes()).hexdigest()}},
        ensure_ascii=False, indent=1), encoding='utf-8')

a('sl.p.w', w_, 'kecamatan Waspada', P_P, S_P); a('sl.p.hmax', round(max(max(v['h3d']) for _, v in kec)), 'mm', P_P, S_P); TOPK = kec[0][0]; a('sl.p.n', len(kec), 'kecamatan', P_P, S_P)

# ---------- 5. bencana lain: cuaca ekstrem, karhutla, kekeringan, gempa (DIBI); luas 2026 (sistem); Talang (MAGMA)
LAIN = {'cuaca_ekstrem': 'Cuaca ekstrem', 'karhutla': 'Karhutla', 'kekeringan': 'Kekeringan'}
ln = {j: dict(kejadian=0, korban=0, rumah=0) for j in LAIN}
for r in T:
    if r['jenis'] in LAIN:
        ln[r['jenis']]['kejadian'] += float(r['kejadian']); ln[r['jenis']]['korban'] += int(r['meninggal']) + int(r['hilang']); ln[r['jenis']]['rumah'] += int(r['rumah_rusak'])
G = [r for r in csv.reader(open(HID / 'dibi_geologi_kab_tahun.csv', encoding='utf-8')) if r[0] == '1302']
gk = dict(kejadian=len(G), korban=sum(int(r[7]) + int(r[8]) for r in G), rumah=sum(int(r[10]) for r in G))
tulis('lain.csv', ['jenis', 'kejadian', 'korban', 'rumah'], [[LAIN[j], round(v['kejadian']), v['korban'], v['rumah']] for j, v in ln.items()] + [['Gempa', gk['kejadian'], gk['korban'], gk['rumah']]])
a('sl.k.hot', 90, 'hotspot', P_K, 'NASA FIRMS, diolah BNPB, 23 Nov 2026'); a('sl.k.luas', 114, 'ha', P_K, 'NASA FIRMS, diolah BNPB, 23 Nov 2026')
a('sl.c.n', round(ln['cuaca_ekstrem']['kejadian']), 'kejadian')
a('sl.l.n', sum(round(v['kejadian']) for v in ln.values()) + gk['kejadian'], 'kejadian bencana')
a('sl.c.r', ln['cuaca_ekstrem']['rumah'], 'rumah rusak'); a('sl.g.r', gk['rumah'], 'rumah rusak'); a('sl.g.n', gk['kejadian'], 'kejadian')

H1 = {'jenis': 'temuan-grafik', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'judul_ikon': 'banjir', 'rasio': .58, 'cut_off': False,
      'pesan': 'Riwayat banjir dan longsor', 'sumber': S_D,
      'judul': f'Banjir dan Longsor: {t("sl.h.n", "|satuan")} di Kabupaten Solok sejak 2008, {t("sl.h.m", "|satuan")}, {t("sl.h.r", "|satuan")}',   # pemilik 24 Nov 2026 "tambahin 671 rumah rusak"
      'grafik': {'judul_panel': 'Kejadian banjir dan longsor per tahun', 'ikon': 'banjir', 'judul': '**Kejadian**, per tahun, 2008 sampai 2026',
                 'keluarga': 'netral', 'sorot': 'tertinggi', 'ubah': False, 'persen_batang': False,
                 'data': c('kejadian_tahun.csv', [{'nama': 'tahun', 'kepala': 'Tahun'}, F('kejadian', 'Kejadian')])},
      'panel': {'judul': 'Dampak per jenis sejak 2008', 'ikon': 'data', 'peringkat': False, 'total': True, 'baris_maks_pt': 90,
                'data': c('jenis_basah.csv', [{'nama': 'jenis', 'kepala': 'Jenis'}, F('kejadian', 'Kejadian'), F('korban', 'Meninggal dan hilang'), F('rumah', 'Rumah rusak')])}}

H2 = {'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'judul_ikon': 'banjir', 'rasio': .58, 'cut_off': False,
      'pesan': 'Dua banjir terakhir', 'sumber': 'DIBI BNPB, 23 Nov 2026; Laporan Dit. Koordalops BNPB, 4 Nov s.d. 23 Nov 2026',
      'judul': f'Banjir Bandang 22 September 2026: {t("sl.26.m", "|satuan")}, {t("sl.26.u", "|satuan")}, dan {t("sl.26.r", "|satuan")} di Kabupaten Solok',
      'tabel': {'judul_panel': 'Dampak dua banjir terakhir', 'ikon': 'banjir', 'baris_maks_pt': 30, 'total': False, 'peringkat': False,
                'data': {**c('dampak.csv', [{'nama': 'dampak', 'kepala': 'Dampak', 'bobot': 1.6}, F('b25', 'Banjir 27 Nov 2025'), F('b26', 'Banjir bandang 22 Sep 2026')]), 'kelompok': [g[0] for g in KEL]}},
      'panel': {'judul': 'Kerusakan lain banjir bandang 2026', 'ikon': 'rumah', 'daftar_ikon': {'mode': 'baris', 'baris': [
          {'ikon': 'kendaraan', 'judul': 'Kendaraan', 'isi': f'Terdampak: {t("sl.26.mobil", "|satuan")} dan {t("sl.26.motor", "|satuan")}', 'angka': t('sl.26.kend'), 'satuan': 'unit'},   # ikon benar (pemilik 24 Nov 2026); Lucide tidak punya glif sepeda motor
          {'ikon': 'jalan', 'judul': 'Ruas jalan', 'isi': 'Rusak', 'angka': t('sl.26.jalan'), 'satuan': 'ruas'},
          {'ikon': 'air-baku', 'judul': 'Jaringan air bersih', 'isi': 'Terdampak', 'angka': t('sl.26.air'), 'satuan': 'unit'},
          {'ikon': 'sawah', 'judul': 'Sawah', 'isi': 'Rusak berat dan ringan', 'angka': t('sl.26.sawah'), 'satuan': 'ha'},
          {'ikon': 'kantor', 'judul': 'Kantor', 'isi': 'Rusak berat sampai ringan', 'angka': t('sl.26.kantor'), 'satuan': 'unit'},
          {'ikon': 'rumah', 'judul': 'Rumah terancam', 'isi': 'Tercatat terancam per 4 Nov 2026', 'angka': t('sl.26.ancam'), 'satuan': 'unit'}]}}}

H3 = {'jenis': 'tabel-peringkat', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'judul_ikon': 'tanggap-darurat', 'rasio': .6, 'cut_off': False,
      'pesan': 'Status darurat', 'sumber': 'DIBI BNPB, 23 Nov 2026; Laporan Dit. Koordalops BNPB, 9 Nov s.d. 23 Nov 2026',
      'judul': f'Kabupaten Solok {t("sl.st.n", "|satuan")} Menetapkan Status Darurat Banjir sejak November 2025; Transisi Darurat Berlaku sampai April 2027',
      'tabel': {'judul_panel': 'Status darurat Kabupaten Solok sejak 2025', 'ikon': 'tanggap-darurat', 'baris_maks_pt': 40, 'total': False, 'peringkat': False,
                'data': c('status.csv', [{'nama': 'status', 'kepala': 'Status', 'bobot': 1.2}, {'nama': 'jenis', 'kepala': 'Jenis bencana', 'bobot': 1.9},
                                         {'nama': 'mulai', 'kepala': 'Mulai', 'bobot': .9}, {'nama': 'berakhir', 'kepala': 'Berakhir', 'bobot': .9}])},
      'panel': {'judul': 'Penanganan terkini', 'ikon': 'ringkasan', 'daftar_ikon': {'mode': 'baris', 'baris': [
          {'ikon': 'tanggap-darurat', 'judul': 'Transisi Darurat', 'isi': 'Berlaku 13 Okt 2026 sampai 13 Apr 2027'},
          {'ikon': 'banjir', 'judul': 'Pembersihan sungai', 'isi': 'Masih berjalan per 8 Nov 2026'},
          {'ikon': 'data', 'judul': 'Rencana induk pemulihan', 'isi': 'Rapat internalisasi bersama Bappenas dan K/L serta Satgas PRRP, 3 Nov 2026'},
          {'ikon': 'tanggap-darurat', 'judul': 'Pendampingan BNPB', 'isi': 'Tim BNPB mendampingi administrasi bantuan logistik di BPBD'},
          {'ikon': 'wilayah', 'judul': 'Siaga Darurat provinsi', 'isi': 'Sumatera Barat, 16 Nov 2026 sampai 18 Jan 2027'}]}}}

HP = {'jenis': 'temuan-peta', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan', 'judul_ikon': 'wilayah', 'rasio': .66, 'cut_off': False,
      'pesan': 'Peta prakiraan banjir', 'sumber': S_P,
      'judul': f'Peta Prakiraan Banjir {rentang}: {t("sl.p.w", "|satuan")} dari {t("sl.p.n", "|satuan")} di Kabupaten Solok',
      'peta': {'png': 'data/sumut-aceh/sl/peta_kec.png', 'unsur_tampil': False, 'keyakinan': 'resmi', 'sumber': S_P, 'penanda': [],
               'legenda': {'item': [{'warna': TOK[l], 'label': LV[l]} for l in (0, 1, 2, 3)]}},
      'panel': {'judul': 'Jumlah kecamatan per status', 'ikon': 'peringatan', 'peringkat': False, 'baris_maks_pt': 90,
                'data': c('prakiraan_jumlah.csv', [{'nama': 'status', 'kepala': 'Status'}, F('kec', 'Kecamatan'), {'nama': 'ambang', 'kepala': 'Ambang utama'}], S_P)}}

H4 = {'jenis': 'temuan-visual', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'judul_ikon': 'peringatan', 'rasio': .99, 'cut_off': False,
      'pesan': 'Prakiraan banjir', 'sumber': S_P,
      'judul': f'Hujan Tiga Hari Tertinggi {t("sl.p.hmax", "|satuan")} di {TOPK}; Status Banjir per Kecamatan Kabupaten Solok, {rentang}',
      'utama': {'judul': 'Status banjir dan hujan tiga hari per kecamatan, empat hari ke depan', 'ikon': 'peringatan',
                'heatmap': {'mode': 'kategori', 'kelas': [{'kunci': 'Normal', 'label': 'Normal', 'token': 'tint.netral.pita'},
                                                          {'kunci': 'Waspada', 'label': 'Waspada', 'token': 'skala.emas.3'},
                                                          {'kunci': 'Siaga', 'label': 'Siaga', 'token': 'oranye'},
                                                          {'kunci': 'Awas', 'label': 'Awas', 'token': 'merah'}],
                            'data': c('prakiraan.csv', [{'nama': 'kec', 'kepala': 'Kecamatan'}, *[{'nama': f'h{i}', 'kepala': h} for i, h in enumerate(hr)]], S_P)}},
}

H5 = {'jenis': 'temuan-grafik', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'judul_ikon': 'karhutla', 'rasio': .58, 'cut_off': False,
      'pesan': 'Bencana lain', 'sumber': 'DIBI BNPB, 23 Nov 2026; NASA FIRMS, diolah BNPB, 23 Nov 2026; MAGMA Indonesia, PVMBG, 21 Nov 2026',
      'judul': f'Bencana Lain: Terdapat {t("sl.l.n", "|satuan")} Terpantau di Kabupaten Solok sejak 2008 sampai November 2026',   # pemilik 24 Nov 2026: tanpa rincian jenis di judul
      'grafik': {'judul_panel': 'Kejadian selain banjir dan longsor sejak 2008', 'ikon': 'data', 'judul': '**Kejadian**, 2008 sampai 2026',
                 'keluarga': 'netral', 'sorot': 'tertinggi', 'ubah': False, 'persen_batang': False,   # tegak supaya bisa berikon (pemilik 24 Nov 2026 "kasih icon di masing2 bencana")
                 'ikon_label': {'Cuaca ekstrem': 'cuaca-ekstrem', 'Karhutla': 'karhutla', 'Kekeringan': 'kekeringan', 'Gempa': 'gempa'},
                 'data': c('lain.csv', [{'nama': 'jenis', 'kepala': 'Jenis'}, F('kejadian', 'Kejadian')])},
      'panel': {'judul': 'Dampak dan pantauan terkini', 'ikon': 'ringkasan', 'daftar_ikon': {'mode': 'baris', 'baris': [
          {'ikon': 'cuaca-ekstrem', 'judul': 'Cuaca ekstrem', 'isi': 'Rumah rusak sejak 2008', 'angka': t('sl.c.r'), 'satuan': 'rumah'},
          {'ikon': 'gempa', 'judul': 'Gempa 2009 dan 2018', 'isi': 'Rumah rusak', 'angka': t('sl.g.r'), 'satuan': 'rumah'},
          {'ikon': 'karhutla', 'judul': 'Perkiraan luas terbakar', 'isi': 'Citra satelit, sepanjang 2026', 'angka': t('sl.k.luas'), 'satuan': 'ha'},
          {'ikon': 'tanggap-darurat', 'judul': 'Siaga Darurat karhutla', 'isi': 'Terakhir 21 Jul sampai 3 Agu 2025'},
          {'ikon': 'gunungapi', 'judul': 'Gunung Talang', 'isi': 'Level I, Normal'},
          {'ikon': 'kekeringan', 'judul': 'Kekeringan', 'isi': 'Tercatat 2009 dan 2013, tanpa korban'}]}}}

SEK = lambda n: {'jenis': 'pembatas-seksi', 'bagian': n}
BAG = [{'judul': 'Riwayat Banjir', 'label': 'Riwayat banjir'}, {'judul': 'Situasi Terkini', 'label': 'Situasi terkini'},
       {'judul': 'Bencana Lain', 'label': 'Bencana lain'}]
FOTO = 'foto/bencana-rob.jpg'
SAMPUL = {'jenis': 'sampul', 'tanpa_tanggal': 'pemilik 22 Nov 2026: "pill jakarta 22nov hapus"', 'layout': 'putih', 'judul_penuh': True, 'skala_subjudul': 0.9, 'foto': FOTO,
          'kota': 'Jakarta', 'tanpa_kepada': True, 'tanpa_subjudul': True, 'judul_turun': 28, 'subjudul': 'Fokus Banjir',
          'penyaji': {'nama': 'Letnan Jenderal TNI Kristomei Sianturi, S.Sos., M.Si. (Han)', 'jabatan': 'Kepala Badan Nasional Penanggulangan Bencana'}}
SP = {'_catatan': 'Paparan Kabupaten Solok, fokus banjir. Dibangun dari spek/bangun_spek_solok.py.',
      'pesan_kunci': 'Kabupaten Solok dua kali dilanda banjir besar dalam setahun dan masih berstatus Transisi Darurat sampai April 2027.',
      'judul_dokumen': 'Paparan Kebencanaan Kabupaten Solok', 'subjek_dokumen': 'Fokus Banjir', 'kajian': 'banjir-solok', 'format': 'kajian',
      'tanpa_alur': 'pola Paparan Sumatera Barat tanpa halaman ringkasan (pemilik 9 Nov 2026)', 'judul_sampul_maks_baris': 2, 'bagian': BAG,
      'tanggal': '2026-11-23', 'cut_off': '23 Nov 2026',   # laporan Koordalops terakhir yang ada 23 Nov (24 Nov belum masuk)
      'slide': [SAMPUL, {'jenis': 'daftar-isi'}, SEK(1), H1, H2, SEK(2), H3, HP, H4, SEK(3), H5,
                {'jenis': 'penutup', 'foto': FOTO, 'teks': 'Terima Kasih', 'laporan': 'Fokus Banjir'}]}
PUS = [{'id': P_P, 'type': 'dataset', 'author': [{'literal': 'sistem BNPB, olahan ECMWF IFS, GloFAS, InaRISK'}], 'issued': {'date-parts': [[2026, 11, 24]]},
        'title': 'Prakiraan status banjir per kecamatan', 'URL': 'https://centurisk97.id/banjir/data/status.json', 'verifikasi': 'primer'}]

if __name__ == '__main__':
    peta_solok(D / 'peta_kec.png')
    p = AKAR / 'data/angka.json'; r = json.loads(p.read_text(encoding='utf-8')); r['angka'].update(ANGKA); p.write_text(json.dumps(r, ensure_ascii=False, indent=1), encoding='utf-8')
    q = AKAR / 'pustaka.json'; u = [x for x in json.loads(q.read_text(encoding='utf-8')) if x['id'] not in {y['id'] for y in PUS}] + PUS; q.write_text(json.dumps(u, ensure_ascii=False, indent=1), encoding='utf-8')
    tm = json.loads((AKAR / 'tema.json').read_text(encoding='utf-8'))
    tm['kajian']['banjir-solok'] = {'judul': 'Paparan Kebencanaan Kabupaten Solok', 'subjudul': 'Fokus Banjir', 'judul_pendek': 'Paparan Kabupaten Solok',
                                    'nama_berkas': 'Paparan Kebencanaan Kabupaten Solok {DDMMYY}', 'batas_halaman_isi': None, 'lampiran': 'ABCDEFGHIJKL',
                                    'kata_kunci': ['BNPB', 'Kabupaten Solok', 'banjir'], 'cakupan_sampul': 'Kabupaten Solok, Sumatera Barat.'}
    (AKAR / 'tema.json').write_text(json.dumps(tm, ensure_ascii=False, indent=1), encoding='utf-8')
    (AKAR / 'spek/solok.json').write_text(json.dumps(SP, ensure_ascii=False, indent=2), encoding='utf-8')
    print(len(ANGKA), 'angka;', {k: v['nilai'] for k, v in ANGKA.items()})
