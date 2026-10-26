#!/usr/bin/env python3
"""Tulis data turunan dan spek gambar Kajian Mitigasi Bencana dari paket data; lalu susun panel bertumpuk.
    .venv/bin/python bangun/visual/spek_mitigasi.py
    (cd bangun/visual && node render.mjs spek-mitigasi/*.json --ke=../../gambar/mitigasi)
    .venv/bin/python bangun/visual/spek_mitigasi.py --susun
"""
import csv, json, re, sys
from collections import Counter, defaultdict
from pathlib import Path

SINI = Path(__file__).resolve().parent
AKAR = SINI.parents[1]                      # data/kajian-bnpb
REPO = AKAR.parents[1]
TD = AKAR / 'data/turunan/gambar-mitigasi'
T = 'data/kajian-bnpb/data/turunan/gambar-mitigasi/'
D = 'data/kajian-bnpb/data/'
KE = AKAR / 'gambar/mitigasi'
BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']


def baca(p):
    return list(csv.DictReader(open(AKAR / p, encoding='utf-8')))


def tulis(nama, kolom, baris):
    TD.mkdir(parents=True, exist_ok=True)
    with open(TD / nama, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(kolom)
        w.writerows(baris)


f = lambda v: float(v or 0)

# ---------- data turunan ----------
rekap = baca('data/dibi/rekap_nasional_tahunan.csv')
alam = [r for r in rekap if r['klasifikasi'] == 'alam' and r['cakupan'] == 'bencana']
GEO = {'Gempabumi', 'Tsunami', 'Erupsi gunung api'}
mh = defaultdict(float)
kel = defaultdict(float)
for r in alam:
    t = int(r['tahun'])
    if 2015 <= t <= 2026:
        v = f(r['meninggal']) + f(r['hilang'])
        mh[t] += v
        kel[(t, 'geologi' if r['kategori_dibi'] in GEO else 'hidromet')] += v
tulis('korban_alam_tahun.csv', ['tahun', 'meninggal_hilang'], [[t, round(mh[t])] for t in range(2015, 2027)])
tulis('korban_alam_kelompok.csv', ['tahun', 'kelompok', 'meninggal_hilang'],
      [[t, k, round(kel[(t, k)])] for t in range(2015, 2027) for k in ('hidromet', 'geologi')])
assert round(mh[2025]) == 1956 and round(mh[2018]) == 6240, (mh[2025], mh[2018])

KLP = {'Banjir': 'hidromet', 'Longsor': 'hidromet', 'Cuaca ekstrem': 'hidromet', 'Gelombang pasang / Abrasi': 'hidromet', 'Kekeringan': 'hidromet',
       'Kebakaran hutan dan lahan': 'hidromet', 'Gempabumi': 'geologi', 'Tsunami': 'geologi', 'Erupsi gunung api': 'geologi',
       'Epidemi - Wabah penyakit': 'nonalam', 'Gagal teknologi': 'nonalam', 'Kebakaran permukiman': 'nonalam', 'Konflik sosial': 'nonalam'}
kj = defaultdict(float)
for r in rekap:
    if r['cakupan'] == 'bencana' and r['kategori_dibi'] in KLP and 2015 <= int(r['tahun']) <= 2026:
        kj[(int(r['tahun']), KLP[r['kategori_dibi']])] += f(r['kejadian'])
tulis('kejadian_kelompok.csv', ['tahun', 'kelompok', 'kejadian'], [[t, k, round(kj[(t, k)])] for t in range(2015, 2027) for k in ('hidromet', 'geologi', 'nonalam')])

mus = [r for r in baca('data/skenario-hidromet/musim_hujan.csv') if r['wilayah'] == 'nasional']
tulis('musim_hujan_nasional.csv', ['pendek', 'meninggal_hilang', 'la_nina'],
      [[f"{r['musim'][2:4]}/{r['musim'][7:9]}", round(f(r['meninggal']) + f(r['hilang'])), r['la_nina']] for r in mus])
lanina = [i for i, r in enumerate(mus) if r['la_nina'] == 'true']

kal = baca('data/skenario-hidromet/kalender_bulanan_pulau.csv')
MH5 = {'banjir', 'banjir_bandang', 'banjir_longsor', 'longsor', 'cuaca_ekstrem'}
MHK = MH5 | {'gelombang_abrasi'}


def porsi(baris, jenis, kolom):
    m = Counter()
    for x in baris:
        if x['jenis'] in jenis:
            m[int(x['bulan'])] += f(x[kolom])
    s = sum(m.values()) or 1
    return [round(m[i] / s * 100, 1) for i in range(1, 13)]


nas = [['Lima jenis musim hujan, meninggal dan hilang'] + porsi(kal, MH5, 'meninggal_hilang'),
       ['Kekeringan, kejadian'] + porsi(kal, {'kekeringan'}, 'kejadian'),
       ['Karhutla, kejadian'] + porsi(kal, {'karhutla'}, 'kejadian')]
assert nas[0][11] == 21.6, nas[0][11]
tulis('kalender_nasional.csv', ['baris'] + BULAN, nas)
PULAU = ['Sumatera', 'Jawa', 'Kalimantan', 'Sulawesi', 'Bali-Nusa Tenggara', 'Maluku', 'Papua']
NP = {'Sumatera': 'Sumatra', 'Bali-Nusa Tenggara': 'Bali dan Nusa Tenggara'}
bp = []
for p in PULAU:
    bp.append([f'{NP.get(p, p)}, musim hujan'] + porsi([x for x in kal if x['pulau'] == p], MHK, 'kejadian'))
for p in PULAU:
    bp.append([f'{NP.get(p, p)}, kemarau'] + porsi([x for x in kal if x['pulau'] == p], {'kekeringan', 'karhutla'}, 'kejadian'))
bp.append(['Rob, semua pulau'] + porsi(kal, {'rob'}, 'kejadian'))
tulis('kalender_pulau.csv', ['baris'] + BULAN, bp)

kp = {(r['skenario'], r['wilayah'], r['cakupan_awal'], r['cakupan_target']): r for r in baca('data/skenario-hidromet/kepekaan_peringatan_dini.csv')}
L = lambda a, b: round(f(kp[('musim_hujan_lantai', 'nasional', a, b)]['korban_tinggi']))
tulis('peringatan_dini_lantai.csv', ['tahap', 'jiwa'], [
    ['Cakupan 2025', round(f(kp[('musim_hujan_lantai', 'nasional', 'renas_2025', 'renas_2029')]['korban_tinggi_dasar']))],
    ['Lintasan IKP Renstra 2029', L('renstra_ikp_2025', 'renstra_ikp_2029')],
    ['Lintasan Renas PB 1.c 2029', L('renas_2025', 'renas_2029')],
    ['Cakupan penuh', L('renas_2025', 'penuh')]])

kota = json.load(open(REPO / 'scripts/udara/kota.json'))
LL = {b[0]: (b[3], b[4]) for b in kota['baris']}
gk = [r for r in baca('data/skenario-geologi/gempa_kab.csv') if r['skenario'] == 'jawa-mmaks' and f(r['jiwa_mmi7plus_tengah']) > 0]
gm = [r for r in baca('data/skenario-geologi/gempa_kab.csv') if r['skenario'] == 'mentawai-mmaks' and f(r['jiwa_mmi7plus_tengah']) > 0]
tulis('mmi7_mentawai_mmaks.csv', ['kode', 'nama', 'lat', 'lon', 'jiwa'],
      [[r['kode'], r['kab'], *LL[r['kode']], round(f(r['jiwa_mmi7plus_tengah']))] for r in gm])
PROV_MENT = sorted({r['prov'] for r in gm})
tulis('mmi7_jawa_persen.csv', ['kode', 'persen'], [[r['kode'], round(f(r['jiwa_mmi7plus_tengah']) / f(r['penduduk_kab']) * 100, 1)] for r in gk])
tulis('mmi7_jawa_mmaks.csv', ['kode', 'nama', 'lat', 'lon', 'jiwa'],
      [[r['kode'], r['kab'], *LL[r['kode']], round(f(r['jiwa_mmi7plus_tengah']))] for r in gk])
ts = [r for r in baca('data/skenario-geologi/tsunami_kab.csv') if r['skenario'] in ('jawa-mmaks', 'mentawai-mmaks')]
pes = defaultdict(float)
for r in ts:
    pes[(r['kode'], r['kab'])] += f(r['jiwa_pesisir_rendah_lt30'])
tulis('tsunami_30mnt.csv', ['kode', 'nama', 'lat', 'lon', 'jiwa'],
      [[k, n, *LL[k], round(v)] for (k, n), v in pes.items() if v > 0])
lubang = sorted({r['kode'] for r in ts if r['skenario'] == 'jawa-mmaks' and r['tiba_menit_sisi_aman'] and f(r['tiba_menit_sisi_aman']) < 30
                 and f(r['jiwa_pesisir_rendah_lt30']) == 0})
assert len(lubang) == 20, len(lubang)

kep = baca('data/skenario-geologi/kepekaan.csv')
SKN = [('jawa-mmaks', 'Megathrust Jawa Mw 9,1'), ('jawa', 'Megathrust Jawa Mw 8,5'), ('mentawai-mmaks', 'Mentawai Mw 8,9'), ('sumba', 'Sumba Mw 8,3')]
fk = lambda s, tuas, nil: next(f(r['faktor_terhadap_dasar']) for r in kep if r['skenario'] == s and r['tuas'].startswith(tuas) and r['nilai_tuas'].startswith(nil))
tulis('tuas_geologi.csv', ['skenario', 'e20', 'e50', 'e70', 'b_dasar', 'b_naik', 'b_penuh'],
      [[n] + [round(fk(s, 'porsi evakuasi', v), 2) for v in ('20%', '50%', '70%')]
       + [round(fk(s, 'kepatuhan', v), 2) for v in ('dasar', 'kepatuhan naik', 'kepatuhan penuh')] for s, n in SKN])

kab25 = baca('data/irbi/irbi_kab_2025.csv')
krb = baca('data/nonalam-sosial/krb_covid19_kab.csv')
KAP = {'rendah': 1, 'sedang': 2, 'tinggi': 3}
tulis('kapasitas_krb.csv', ['kode', 'kelas'], [[r['kode'], KAP[r['kapasitas_kab']]] for r in krb if r['kapasitas_kab'] in KAP])

pod = baca('data/nonalam-sosial/konflik_podes_provinsi.csv')
tulis('perkelahian_provinsi.csv', ['kode', 'provinsi', 'persen'],
      [[r['kode_prov'], r['provinsi'], round(f(r['jenis_antar_kelompok_masyarakat']) / f(r['desa_kelurahan_2024']) * 100, 2)] for r in pod])

who = list(csv.DictReader(open(AKAR / 'data/nonalam-sosial/mentah/who_covid19_idn.csv', encoding='utf-8')))
pek = [r for r in who if '2020-03' <= r['Date_reported'] <= '2023-06-30']
tulis('covid19_pekan.csv', ['pekan', 'meninggal'], [[r['Date_reported'], int(f(r['New_deaths']))] for r in pek])

pk = baca('data/turunan/profil_kerugian.csv')
NAMA_PK = {'sering_median': 'Lapisan sering, median', 'berat_p90': 'Lapisan berat, persentil 90',
           'ekstrem_analog_sulteng2018': 'Sulawesi Tengah 2018, kejadian', 'ekstrem_analog_sumatra2025': 'Sumatra 2025, kejadian'}
tulis('profil_kerugian.csv', ['id', 'rendah', 'tinggi'],
      [[r['tahun'] if r['lapisan'] == 'tahun' else NAMA_PK[r['lapisan']], round(f(r['rp_rendah']) / 1e12, 2), round(f(r['rp_tinggi']) / 1e12, 2)] for r in pk])
PK_LAIN = list(NAMA_PK.values())

# ---------- spek grafik dan peta ----------
def peta_bahaya(nama, kolom, judul, ukuran='tiga-kolom', pendek=None):
    return {'nama': nama, 'jenis': 'peta', 'pesan': 'G19', 'besaran': 'indeks', 'ukuran': ukuran,
            'keterangan': f'Nilai IRBI {judul} per kab/kota di Indonesia, 2025', 'sumber': 'InaRISK BNPB, IRBI 2025 ({rumus_kelas})',
            'cakupan': 'nasional', 'tingkat': 'kab', 'skala': False,
            'koroplet': {'sumber': {'berkas': D + 'irbi/irbi_kab_2025.csv', 'kunci': 'kode', 'nilai': kolom},
                         'kelas': {'ramp': 'api', 'kuantil': 5, 'desimal': 1}, 'judul_legenda': f'{pendek or judul.capitalize()}, kuintil'},
            'label': {'provinsi': False}}


BAHAYA9 = [('banjir', 'banjir'), ('longsor', 'tanah longsor'), ('kekeringan', 'kekeringan'), ('cuaca_ekstrem', 'cuaca ekstrem'),
           ('abrasi', 'gelombang ekstrem dan abrasi'), ('gempabumi', 'gempa bumi'), ('tsunami', 'tsunami'), ('karlahut', 'karhutla'),
           ('gunungapi', 'gunung api')]
HM4 = [('banjir', 'banjir'), ('longsor', 'tanah longsor'), ('kekeringan', 'kekeringan'), ('karlahut', 'karhutla')]
JAWA_BALI = ['31', '32', '33', '34', '35', '36', '51']

grafik = [
 {'nama': 'bab01-batang-korban-alam-2015-2025', 'jenis': 'batang', 'pesan': 'G1', 'ukuran': 'penuh',
  'keterangan': 'Meninggal dan hilang akibat bencana alam di Indonesia, 2015–2025 (jiwa)',
  'sumber': 'Pengolahan data Pantau Bencana dari DIBI BNPB, bencana alam kode 101–109',
  'data': {'sumber': {'berkas': T + 'korban_alam_tahun.csv', 'saring': {'tahun': [str(t) for t in range(2015, 2026)]}}, 'x': 'tahun', 'y': 'meninggal_hilang'},
  'tekan': [9, 10], 'legenda': {'lama': '2015–2023, laporan belum tersaring ambang', 'tekan': '2024–2025, saringan Juklak 7/2023'}},
 {'nama': 'bab04-kejadian-tahunan', 'jenis': 'garis', 'pesan': 'G3', 'ukuran': 'penuh',
  'keterangan': 'Kejadian bencana per tahun menurut kelompok di Indonesia, 2015–2026 (kejadian)',
  'sumber': 'BNPB, DIBI dasbor publik, cakupan kejadian bencana',
  'seri': [{'label': n, 'warna': w, 'data': {'sumber': {'berkas': T + 'kejadian_kelompok.csv', 'saring': {'kelompok': k}}, 'x': 'tahun', 'y': 'kejadian'}}
           for k, n, w in [('hidromet', 'Hidrometeorologi', 'kategori.basah'), ('geologi', 'Geologi', 'kategori.geologi'), ('nonalam', 'Nonalam dan sosial', 'kategori.nonalam')]],
  'anotasi': [{'x': '2024', 'teks': 'saringan Juklak 7/2023'}], 'desimal': 0},
 {'nama': 'bab04-korban-tahunan', 'jenis': 'garis', 'pesan': 'G3', 'ukuran': 'penuh',
  'keterangan': 'Meninggal dan hilang akibat bencana alam per tahun menurut kelompok di Indonesia, 2015–2026 (jiwa)',
  'sumber': 'BNPB, DIBI dasbor publik, sembilan jenis bencana alam, cakupan kejadian bencana',
  'seri': [{'label': n, 'warna': w, 'data': {'sumber': {'berkas': T + 'korban_alam_kelompok.csv', 'saring': {'kelompok': k}}, 'x': 'tahun', 'y': 'meninggal_hilang'}}
           for k, n, w in [('hidromet', 'Hidrometeorologi', 'kategori.basah'), ('geologi', 'Geologi', 'kategori.geologi')]],
  'desimal': 0},
 {'nama': 'bab05-tren-irb', 'jenis': 'matriks-titik', 'pesan': 'G16', 'ukuran': 'penuh',
  'keterangan': 'Indeks Risiko Bencana nasional dan rerata kab/kota per pulau di Indonesia, 2015–2024 (indeks)',
  'sumber': 'InaRISK BNPB, IRBI 2015–2024; Renstra BNPB 2025–2029 Tabel 1.6; pengolahan data Pantau Bencana ({rumus_kelas})',
  'data': {'sumber': {'berkas': D + 'irbi/irbi_tren_2015_2024.csv', 'saring': {'metode': 'rerata_sederhana', 'tingkat': ['nasional', 'pulau']}},
           'baris': 'kode', 'urutan': ['ID', 'SUM', 'JAW', 'KAL', 'SUL', 'BNT', 'MAL', 'PAP'],
           'label_baris': {'ID': 'Nasional', 'SUM': 'Sumatra', 'JAW': 'Jawa', 'KAL': 'Kalimantan', 'SUL': 'Sulawesi', 'BNT': 'Bali dan Nusa Tenggara', 'MAL': 'Maluku', 'PAP': 'Papua'},
           'kolom': [{'kolom': f'y{t}', 'label': str(t)} for t in range(2015, 2025)]},
  'kelas': {'ramp': 'api', 'batas': [130, 140, 150, 160], 'rumus': 'batas tetap indeks, pilihan penyusun', 'desimal': 0},
  'judul_legenda': 'Indeks Risiko Bencana'},
 {'nama': 'bab05-peta-status-irbi-2025', 'jenis': 'peta', 'pesan': 'G19', 'besaran': 'indeks', 'ukuran': 'penuh',
  'keterangan': 'Status Indeks Risiko Bencana Indonesia per kab/kota, 2025', 'sumber': 'InaRISK BNPB, IRBI 2025, kolom status',
  'cakupan': 'nasional', 'tingkat': 'kab',
  'koroplet': {'sumber': {'berkas': D + 'irbi/irbi_kab_2025.csv', 'kunci': 'kode', 'nilai': 'total'}, 'kelas': {'skala': 'irbi', 'kolom': 'status_total_resmi'}},
  'label': {'provinsi': False}},
 {'nama': 'bab05-peta-kelas-provinsi-2023', 'jenis': 'peta', 'pesan': 'G19', 'besaran': 'indeks', 'ukuran': 'penuh',
  'keterangan': 'Kelas Indeks Risiko Bencana Indonesia per provinsi, 2023', 'sumber': 'InaRISK BNPB, IRBI 2023; Renstra BNPB 2025–2029 Tabel 1.1',
  'cakupan': 'nasional', 'tingkat': 'provinsi',
  'koroplet': {'sumber': {'berkas': D + 'irbi/irbi_rekonsiliasi_provinsi.csv', 'saring': {'tahun': '2023'}, 'kunci': 'prov_kode', 'nilai': 'indeks_terbit'},
               'kelas': {'skala': 'irbi', 'kolom': 'kelas_terbit'}},
  'label': {'provinsi': False}},
 {'nama': 'bab05-peta-kapasitas-krb', 'jenis': 'peta', 'pesan': 'G19', 'besaran': 'indeks', 'ukuran': 'penuh',
  'keterangan': 'Kelas kapasitas penanggulangan bencana kab/kota menurut Kajian Risiko Bencana 2022–2026',
  'sumber': 'InaRISK BNPB, Kajian Risiko Bencana 2022–2026, kelas kapasitas kab/kota', 'cakupan': 'nasional', 'tingkat': 'kab',
  'koroplet': {'sumber': {'berkas': T + 'kapasitas_krb.csv', 'kunci': 'kode', 'nilai': 'kelas'},
               'kelas': {'ramp': 'air', 'batas': [1, 2], 'label': ['Rendah', 'Sedang', 'Tinggi'], 'rumus': 'kelas resmi KRB', 'desimal': 0},
               'judul_legenda': 'Kelas kapasitas KRB (kab/kota)'},
  'label': {'provinsi': False}},
 {'nama': 'bab05-matriks-kemungkinan-dampak', 'jenis': 'matriks', 'pesan': 'G17', 'ukuran': 'penuh', 'tinggi_sel_pt': 84,
  'keterangan': 'Matriks kemungkinan lima tahun dan kelas fatalitas per jenis bencana, Indonesia, 2026',
  'sumber': 'Pita kemungkinan dan fatalitas NRR Cabinet Office; DIBI BNPB 2008–2025; PuSGeN (2024); pengolahan data Pantau Bencana',
  'kolom': {'judul': 'KEMUNGKINAN LIMA TAHUN', 'label': ['Pita 1', 'Pita 2', 'Pita 3', 'Pita 4', 'Pita 5', 'Tidak dinilai']},
  'baris': {'judul': 'KELAS FATALITAS', 'label': ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5']},
  'butir': [{'nama': n, 'kolom': k, 'baris': b} for n, k, b in [
      ('Megathrust selatan Jawa, gabungan', 1, 3), ('Megathrust selatan Jawa, per segmen', 2, 3), ('Banjir dan banjir bandang', 3, 4),
      ('Gempa sesar darat dan majemuk', 5, 4), ('Tsunami nasional', 5, 4), ('Epidemi dan pandemi', 5, 4), ('Konflik sosial', 5, 4),
      ('Gunung api', 5, 3), ('Tanah longsor', 5, 3), ('Cuaca ekstrem', 5, 2), ('Gelombang ekstrem dan abrasi', 5, 1), ('Rob', 5, 1),
      ('Karhutla', 5, 1), ('Kebakaran industri', 5, 1), ('Kekeringan', 5, 0)]]},
 {'nama': 'bab06-peta-mmi-jawa', 'jenis': 'peta', 'pesan': 'G20', 'besaran': 'total', 'ukuran': 'penuh',
  'keterangan': 'Jiwa terpapar guncangan MMI VII atau lebih per kab/kota pada skenario megathrust Jawa Mw 9,1 PuSGeN 2024 (jiwa)',
  'sumber': 'Simulasi skenario Pantau Bencana, belum divalidasi; penduduk WorldPop 2026', 'cakupan': JAWA_BALI, 'tingkat': 'kab',
  'titik': [{'nama': 'Jiwa MMI VII+', 'judul_legenda': 'Jiwa terpapar MMI VII atau lebih, nilai tengah', 'bentuk': 'lingkaran', 'warna': 'kategori.geologi',
             'sumber': {'berkas': T + 'mmi7_jawa_mmaks.csv'}, 'nilai': 'jiwa', 'label': 'nama', 'label_teratas': 3}],
  'label': {'provinsi': False}},
 {'nama': 'bab06-peta-tsunami-30mnt', 'jenis': 'peta', 'pesan': 'G20', 'besaran': 'total', 'ukuran': 'penuh',
  'keterangan': 'Jiwa kecamatan pesisir rendah dengan tiba tsunami 30 menit atau kurang, skenario megathrust Jawa Mw 9,1 dan Mentawai Mw 8,9, 2026 (jiwa)',
  'sumber': 'Simulasi skenario Pantau Bencana, belum divalidasi', 'cakupan': ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21'] + JAWA_BALI + ['52'], 'tingkat': 'kab',
  'titik': [{'nama': 'Jiwa pesisir rendah', 'judul_legenda': 'Jiwa pesisir rendah, tiba 30 menit atau kurang', 'bentuk': 'lingkaran', 'warna': 'kategori.basah',
             'sumber': {'berkas': T + 'tsunami_30mnt.csv'}, 'nilai': 'jiwa', 'label': 'nama', 'label_teratas': 4}],
  'sorot': lubang, 'sorot_label': 'Tiba kurang dari 30 menit, luput dari proksi', 'label': {'provinsi': False}},
 {'nama': 'bab06-tuas-evakuasi-bangunan', 'jenis': 'matriks-titik', 'pesan': 'G16', 'ukuran': 'penuh',
  'keterangan': 'Faktor kematian tsunami menurut porsi evakuasi segera dan faktor korban guncangan menurut kepatuhan bangunan, empat skenario megathrust, 2026 (kali dasar)',
  'sumber': 'Cabinet Office Jepang 2025; simulasi skenario Pantau Bencana, belum divalidasi ({rumus_kelas})',
  'data': {'sumber': {'berkas': T + 'tuas_geologi.csv'}, 'baris': 'skenario',
           'kolom': [{'kolom': 'e20', 'label': 'Evakuasi 20%'}, {'kolom': 'e50', 'label': 'Evakuasi 50%'}, {'kolom': 'e70', 'label': 'Evakuasi 70%'},
                     {'kolom': 'b_dasar', 'label': 'Bangunan dasar'}, {'kolom': 'b_naik', 'label': 'Kepatuhan naik'}, {'kolom': 'b_penuh', 'label': 'Kepatuhan penuh'}]},
  'kelas': {'ramp': 'netral', 'batas': [0.4, 0.7], 'label': ['0,4 atau kurang', '0,4–0,7', 'di atas 0,7'], 'rumus': 'batas tetap faktor terhadap dasar', 'desimal': 2},
  'judul_legenda': 'Faktor terhadap dasar'},
 peta_bahaya('bab07-hm-banjir', 'banjir', 'banjir', 'dua-kolom'),
 peta_bahaya('bab07-hm-longsor', 'longsor', 'tanah longsor', 'dua-kolom'),
 peta_bahaya('bab07-hm-kekeringan', 'kekeringan', 'kekeringan', 'dua-kolom'),
 peta_bahaya('bab07-hm-karlahut', 'karlahut', 'karhutla', 'dua-kolom'),
 {'nama': 'bab07-g01-musim-hujan', 'jenis': 'batang', 'pesan': 'G1', 'ukuran': 'penuh',
  'keterangan': 'Meninggal dan hilang per musim hujan nasional menurut fase La Niña, 2008/2009–2025/2026 (jiwa)',
  'sumber': 'BNPB, DIBI dasbor publik; NOAA CPC, ONI; pengolahan kajian ini',
  'data': {'sumber': {'berkas': T + 'musim_hujan_nasional.csv'}, 'x': 'pendek', 'y': 'meninggal_hilang'},
  'warna': 'kategori.basah', 'tekan': lanina, 'legenda': {'tekan': 'Musim La Niña', 'lama': 'Musim lain'}},
 {'nama': 'bab07-g16-kalender', 'jenis': 'matriks-titik', 'pesan': 'G16', 'ukuran': 'penuh',
  'keterangan': 'Porsi bulanan meninggal dan hilang lima jenis musim hujan serta kejadian kekeringan dan karhutla di Indonesia, 2008–2026 (persen)',
  'sumber': 'BNPB, DIBI dasbor publik; pengolahan kajian ini ({rumus_kelas})',
  'data': {'sumber': {'berkas': T + 'kalender_nasional.csv'}, 'baris': 'baris', 'kolom': [{'kolom': b, 'label': b} for b in BULAN]},
  'kelas': {'ramp': 'air', 'batas': [5, 10, 20], 'label': ['5 atau kurang', '5–10', '10–20', 'di atas 20'], 'rumus': 'batas tetap porsi bulanan', 'desimal': 0},
  'judul_legenda': 'Porsi bulan dalam setahun (persen)'},
 {'nama': 'bab07-g14-peringatan-dini', 'jenis': 'batang', 'pesan': 'G1', 'ukuran': 'penuh',
  'keterangan': 'Korban jiwa lantai musim hujan 2025/2026 nasional pada cakupan peringatan dini 2025, dua lintasan 2029, dan cakupan penuh (jiwa)',
  'sumber': 'BNPB, DIBI dasbor publik; Renas PB 2025–2029; Renstra BNPB 2025–2029; WMO (2022); pengolahan kajian ini',
  'data': {'sumber': {'berkas': T + 'peringatan_dini_lantai.csv'}, 'x': 'tahap', 'y': 'jiwa'},
  'pembanding': 0, 'tekan': [1, 2, 3], 'legenda': {'pembanding': 'Lantai tercatat, cakupan 2025', 'tekan': 'Batas atas ilustratif sesudah kepekaan'}},
 {'nama': 'bab08-g11-kematian-covid19-pekan', 'jenis': 'garis', 'pesan': 'G2', 'ukuran': 'penuh',
  'keterangan': 'Kematian COVID-19 terlapor per pekan di Indonesia, Maret 2020–Juni 2023 (jiwa)',
  'sumber': 'WHO, data global COVID-19 (laporan Kementerian Kesehatan)',
  'seri': [{'label': 'Kematian per pekan', 'label_ujung': 'Juni 2023', 'warna': 'kategori.nonalam',
            'data': {'sumber': {'berkas': T + 'covid19_pekan.csv'}, 'x': 'pekan', 'y': 'meninggal'}}],
  'anotasi': [{'x': max((r for r in pek), key=lambda r: f(r['New_deaths']))['Date_reported'], 'teks': 'puncak Delta'}],
  'desimal': 0, 'dari_nol': True},
 {'nama': 'bab09-peta-perkelahian-antarkelompok-2024', 'jenis': 'peta', 'pesan': 'G19', 'besaran': 'rasio', 'ukuran': 'penuh',
  'keterangan': 'Persen desa/kelurahan dengan perkelahian massal antarkelompok masyarakat per provinsi di Indonesia, 2024',
  'sumber': 'Pengolahan data Pantau Bencana dari BPS, Statistik Potensi Desa Indonesia 2024 ({rumus_kelas})', 'cakupan': 'nasional', 'tingkat': 'provinsi',
  'koroplet': {'sumber': {'berkas': T + 'perkelahian_provinsi.csv', 'kunci': 'kode', 'nilai': 'persen'},
               'kelas': {'ramp': 'emas', 'kuantil': 5, 'desimal': 2}, 'judul_legenda': 'Persen desa/kelurahan, kelas kuintil (provinsi)'},
  'label': {'provinsi': False}},
 {'nama': 'bab11-g16-kalender-pulau', 'jenis': 'matriks-titik', 'pesan': 'G16', 'ukuran': 'penuh',
  'keterangan': 'Porsi kejadian bencana hidrometeorologi per bulan menurut pulau dan musim, Indonesia 2008–2025 (persen kejadian)',
  'sumber': 'DIBI BNPB 2008–2025, per tanggal kejadian; pengolahan kajian ini ({rumus_kelas})',
  'data': {'sumber': {'berkas': T + 'kalender_pulau.csv'}, 'baris': 'baris', 'kolom': [{'kolom': b, 'label': b} for b in BULAN]},
  'kelas': {'ramp': 'air', 'batas': [5, 10, 20], 'label': ['5 atau kurang', '5–10', '10–20', 'di atas 20'], 'rumus': 'batas tetap porsi bulanan', 'desimal': 0},
  'judul_legenda': 'Porsi bulan dalam setahun (persen kejadian)'},
 {'nama': 'bab12-profil-kerugian', 'jenis': 'rentang', 'pesan': 'G12', 'ukuran': 'penuh',
  'keterangan': 'Kebutuhan stimulan rumah tahunan batas bawah, 2015–2025, dengan lapisan dan kejadian tunggal (Rp triliun)',
  'sumber': 'Pengolahan data Pantau Bencana dari DIBI BNPB dan siaran Kemenko PMK 22 November 2023 (besaran stimulan)',
  'data': {'sumber': {'berkas': T + 'profil_kerugian.csv'}, 'kategori': 'id', 'rendah': 'rendah', 'tinggi': 'tinggi',
           'warna_kategori': {n: ('kategori.geologi' if 'kejadian' in n else 'slate') for n in PK_LAIN},
           'legenda_warna': {'navy': 'tahun, besaran 2010 sampai besaran 2023', 'slate': 'lapisan sering dan berat', 'kategori.geologi': 'kejadian tunggal'}},
  'satuan': 'T', 'desimal': 1, 'warna': 'navy'},
]
for k, j in BAHAYA9:
    grafik.append(peta_bahaya(f'bab05-irbi-{k}', k, j, pendek='Gelombang dan abrasi' if k == 'abrasi' else None))
def kartu_titik(nama, berkas, ket, cakupan):
    return {'nama': nama, 'jenis': 'peta', 'pesan': 'G20', 'besaran': 'total', 'ukuran': 'tiga-kolom', 'skala': False,
            'keterangan': ket, 'sumber': 'Simulasi skenario Pantau Bencana, belum divalidasi', 'cakupan': cakupan, 'tingkat': 'kab',
            'titik': [{'nama': 'Jiwa MMI VII+', 'judul_legenda': 'Jiwa MMI VII atau lebih', 'bentuk': 'lingkaran', 'warna': 'kategori.geologi',
                       'sumber': {'berkas': T + berkas}, 'nilai': 'jiwa'}], 'label': {'provinsi': False}}


grafik += [{'nama': 'bab06-kartu-megathrust-jawa', 'jenis': 'peta', 'pesan': 'G19', 'besaran': 'rasio', 'ukuran': 'tiga-kolom', 'skala': False,
            'keterangan': 'Persen penduduk kab/kota terpapar MMI VII atau lebih, megathrust Jawa Mw 9,1, 2026',
            'sumber': 'Simulasi skenario Pantau Bencana, belum divalidasi ({rumus_kelas})', 'cakupan': JAWA_BALI, 'tingkat': 'kab',
            'koroplet': {'sumber': {'berkas': T + 'mmi7_jawa_persen.csv', 'kunci': 'kode', 'nilai': 'persen'},
                         'kelas': {'ramp': 'emas', 'batas': [25, 50, 75], 'rumus': 'batas tetap persen penduduk', 'desimal': 0}, 'judul_legenda': 'Persen penduduk MMI VII+'},
            'label': {'provinsi': False}},
           kartu_titik('bab06-kartu-megathrust-mentawai', 'mmi7_mentawai_mmaks.csv', 'Jiwa terpapar MMI VII atau lebih, megathrust Mentawai Mw 8,9, 2026', PROV_MENT)]
for nama, kol, judul, pendek in [('bab06-kartu-sesar-darat', 'gempabumi', 'gempa bumi', None), ('bab06-kartu-tsunami', 'tsunami', 'tsunami', None),
                                 ('bab06-kartu-gunungapi', 'gunungapi', 'gunung api', None), ('bab07-kartu-banjir', 'banjir', 'banjir', None),
                                 ('bab07-kartu-longsor', 'longsor', 'tanah longsor', None), ('bab07-kartu-cuaca', 'cuaca_ekstrem', 'cuaca ekstrem', None),
                                 ('bab07-kartu-gelombang', 'abrasi', 'gelombang ekstrem dan abrasi', 'Gelombang dan abrasi'),
                                 ('bab07-kartu-kekeringan', 'kekeringan', 'kekeringan', None), ('bab07-kartu-karhutla', 'karlahut', 'karhutla', None)]:
    grafik.append(peta_bahaya(nama, kol, judul, pendek=pendek))
mj = peta_bahaya('bab06-kartu-majemuk', 'gempabumi', 'gempa bumi')
mj.update(cakupan=['72'], keterangan='Nilai IRBI gempa bumi per kab/kota di Sulawesi Tengah, 2025')
grafik.append(mj)

# ---------- spek diagram ----------
def kisi(nama, ket, sumber, alasan, kolom, baris, kelas, kotak, panah=(), judul_kolom=None, judul_baris=None, **lain):
    s = {'nama': nama, 'jenis': 'diagram', 'ukuran': 'penuh', 'alasan': alasan, 'keterangan': ket, 'sumber': sumber,
         'kolom': kolom, 'baris': baris, 'kelas': kelas, 'kotak': kotak, 'panah': list(panah)}
    if judul_kolom: s['judul_kolom'] = judul_kolom
    if judul_baris: s['judul_baris'] = judul_baris
    s.update(lain)
    return s


def K(id, k, b, kelas, judul, isi='', lk=1, lb=1):
    d = {'id': id, 'k': k, 'b': b, 'kelas': kelas, 'judul': judul, 'isi': isi}
    if lk > 1: d['lk'] = lk
    if lb > 1: d['lb'] = lb
    return d


P = lambda a, b, label=None: {'dari': a, 'ke': b, **({'label': label} if label else {})}

diagram = [
 kisi('rantai-metode', 'Rantai metode dari sumber data ke daftar perhatian dan rekomendasi, kajian mitigasi bencana Indonesia 2026',
      'Analisis kajian ini atas DIBI BNPB, InaRISK BNPB, NOAA CPC, PuSGeN 2024, SiPongi, dan BPS',
      'Alur dari sumber data ke paket, aturan kajian, dan keluaran; tabel pilih grafik B5.10 tidak memuat bagan alur', 4, 5,
      {'sumber': {'label': 'Sumber data resmi atau terverifikasi', 'warna': 'tint.netral.pita'}, 'paket': {'label': 'Paket data dan registri angka', 'warna': 'tint.basah.pita'},
       'aturan': {'label': 'Aturan kajian', 'warna': 'navy'}, 'model': {'label': 'Estimasi model, bukan Data Bencana', 'warna': 'tint.kering.pita'},
       'hasil': {'label': 'Keluaran kajian', 'warna': 'kertas', 'garis': 'garis-kuat'}},
      [K('s1', 0, 0, 'sumber', 'DIBI BNPB 2008–2026', 'kejadian dan korban per kab/kota'), K('d1', 1, 0, 'paket', 'Paket DIBI', 'seri tahun, musim, kejadian besar'),
       K('a1', 2, 0, 'aturan', 'Lantai skenario', 'kejadian tercatat terburuk'), K('c1', 3, 0, 'hasil', 'Kartu skenario', 'Bab 6 sampai 9'),
       K('s2', 0, 1, 'sumber', 'InaRISK BNPB', 'IRBI 2015–2025 dan KRB 2022–2026'), K('d2', 1, 1, 'paket', 'Paket IRBI', 'kelas resmi dan kelas kuintil'),
       K('a2', 2, 1, 'aturan', 'Daftar perhatian', 'syarat IRBI, DIBI, dan proksi'), K('c2', 3, 1, 'hasil', 'Daftar perhatian', 'Bab 5 dan Lampiran'),
       K('s3', 0, 2, 'sumber', 'NOAA CPC, PuSGeN, SiPongi, BPS', 'ONI, magnitudo, luas terbakar, Podes'), K('d3', 1, 2, 'paket', 'Registri angka', 'satu angka satu sumber'),
       K('a3', 2, 2, 'aturan', 'Kemungkinan dan dampak per aspek', 'pita lima tahun, kelas dampak'), K('c3', 3, 2, 'hasil', 'Kelas skenario', 'matriks Bab 5'),
       K('s4', 0, 3, 'sumber', 'Literatur terverifikasi', 'evaluasi program'), K('d4', 1, 3, 'paket', 'Paket program', 'kategori bukti'),
       K('a4', 2, 3, 'aturan', 'Kategori bukti', 'kuat, sedang, lemah, belum terbukti'), K('c4', 3, 3, 'hasil', 'Rekomendasi', 'Bab 10 sampai 13'),
       K('s5', 0, 4, 'model', 'Platform Pantau Bencana', 'simulasi geologi dan hidrometeorologi'), K('d5', 1, 4, 'model', 'Paket skenario', 'keluaran simulasi berpil'),
       K('a5', 2, 4, 'aturan', 'Kepekaan', 'peringatan dini, evakuasi, bangunan'), K('c5', 3, 4, 'hasil', 'Analisis kepekaan', 'kartu dan Lampiran')],
      [P(f'{a}{i}', f'{b}{i}') for i in range(1, 6) for a, b in (('s', 'd'), ('d', 'a'), ('a', 'c'))],
      judul_kolom=['Sumber data', 'Paket data', 'Aturan kajian', 'Keluaran']),
 kisi('bab08-g23-garis-waktu-status-epidemi',
      'Garis waktu penetapan status epidemi menurut rezim bencana, rezim kesehatan, dan krisis kesehatan di Indonesia, 2018–2026',
      'Keppres 11/2020, 12/2020, dan 17/2023; Perpres 17/2018, 82/2020, 48/2023, dan 46/2026; UU 17/2023; Permenkes 1/2026 (teks rancangan)',
      'Garis waktu status berlajur per rezim; tabel pilih grafik B5.10 tidak memuat garis waktu', 5, 3,
      {'bencana': {'label': 'Rezim bencana (UU 24/2007)', 'warna': 'navy'}, 'sehat': {'label': 'Rezim kesehatan', 'warna': 'tint.basah.pita'},
       'krisis': {'label': 'Krisis kesehatan, teks rancangan', 'warna': 'tint.kering.pita'}},
      [K('b0', 0, 0, 'bencana', 'Perpres 17/2018', 'status keadaan darurat menurut skala'),
       K('b1', 1, 0, 'bencana', 'Keppres 12/2020', 'bencana nasional nonalam COVID-19; Perpres 82/2020 Satuan Tugas', lk=2),
       K('b3', 3, 0, 'bencana', 'Keppres 17/2023', 'status dicabut; Perpres 48/2023 mengakhiri Satuan Tugas'),
       K('b4', 4, 0, 'bencana', 'Perpres 46/2026', 'keadaan tertentu sesudah rakor menteri koordinator'),
       K('h0', 0, 1, 'sehat', 'UU 6/2018', 'kekarantinaan kesehatan'),
       K('h1', 1, 1, 'sehat', 'Keppres 11/2020', 'kedaruratan kesehatan masyarakat, 31 Maret 2020', lk=2),
       K('h3', 3, 1, 'sehat', 'UU 17/2023', 'KLB oleh kepala daerah atau Menteri; Daerah Terjangkit Wabah oleh Menteri', lk=2),
       K('k4', 4, 2, 'krisis', 'Permenkes 1/2026', 'Krisis Kesehatan oleh kepala dinas atau Menteri')],
      [P('h3', 'b3', 'Pasal 369–370, nasional')],
      judul_kolom=['2018–2019', '2020', '2021–2022', '2023–2025', '2026'], judul_baris=['Bencana', 'Kesehatan', 'Krisis kesehatan']),
]

# sel fase x jenis (bab 10), dari registri mitigasi.sel_program
JENIS13 = ['Gempa bumi', 'Tsunami', 'Gunung api', 'Banjir', 'Tanah longsor', 'Cuaca ekstrem', 'Gelombang, abrasi', 'Kekeringan', 'Karhutla',
           'Epidemi', 'Kebakaran industri', 'Kebakaran TPA', 'Konflik sosial']
SEL = {('Gempa bumi', 0): ('sdn', 'InaTEWS'), ('Gempa bumi', 1): ('sdn', 'InaTEWS'), ('Gempa bumi', 2): ('sln', 'asuransi CCRIF/ARC'),
       ('Tsunami', 0): ('sdn', 'InaTEWS'), ('Tsunami', 1): ('sdn', 'InaTEWS'), ('Tsunami', 2): ('lemah', 'lemah atau belum terbukti'),
       ('Gunung api', 0): ('lemah', 'lemah atau belum terbukti'), ('Banjir', 0): ('kuat', 'Tokyo, Osaka, Bangkok'), ('Banjir', 1): ('sln', 'Odisha'),
       ('Banjir', 2): ('sln', 'asuransi CCRIF/ARC'), ('Tanah longsor', 0): ('lemah', 'lemah atau belum terbukti'),
       ('Cuaca ekstrem', 0): ('kuat', 'siklon Bangladesh'), ('Cuaca ekstrem', 1): ('kuat', 'siklon Bangladesh'), ('Cuaca ekstrem', 2): ('sln', 'asuransi CCRIF/ARC'),
       ('Gelombang, abrasi', 0): ('kuat', 'siklon Bangladesh'), ('Gelombang, abrasi', 1): ('kuat', 'siklon Bangladesh'),
       ('Kekeringan', 0): ('sdn', 'PAMSIMAS'), ('Kekeringan', 2): ('sln', 'asuransi CCRIF/ARC'), ('Karhutla', 0): ('lemah', 'lemah atau belum terbukti')}
hit = Counter(SEL.get((j, i), ('kosong',))[0] for j in JENIS13 for i in range(3))
assert hit == {'kosong': 20, 'kuat': 5, 'sdn': 5, 'sln': 5, 'lemah': 4}, hit
diagram.append(kisi('bab10-g16-sel-bukti-program', 'Sel fase × jenis bencana menurut kategori bukti program terbaik, Indonesia 2026',
    'Pengolahan Pantau Bencana dari paket program-terbukti (kompendium program)',
    'Kisi kategori jenis bencana kali fase dengan isi program; matriks titik G16 hanya untuk nilai berkelas angka', 3, 13,
    {'kuat': {'label': 'Kuat, luar negeri', 'warna': 'navy'}, 'sdn': {'label': 'Sedang, dalam negeri', 'warna': 'biru-abu'},
     'sln': {'label': 'Sedang, luar negeri', 'warna': 'tint.basah.pita'}, 'lemah': {'label': 'Lemah atau belum terbukti', 'warna': 'tint.kering.pita'},
     'kosong': {'label': 'Tanpa program', 'warna': 'kertas', 'garis': 'garis'}},
    [K(f's{b}{i}', i, b, SEL.get((j, i), ('kosong', ''))[0], '', SEL.get((j, i), ('kosong', ''))[1]) for b, j in enumerate(JENIS13) for i in range(3)],
    judul_kolom=['Prabencana', 'Tanggap darurat', 'Pascabencana'], judul_baris=JENIS13, sela_pt=3, tinggi_baris_min_pt=20))

diagram += [
 kisi('bab11-g21-alur-langkah', 'Alur langkah penanggulangan bencana dari peringatan dini sampai hibah rehabilitasi dan rekonstruksi, dengan pemicu dan tenggat tiap tahap, 2026',
      'UU 24/2007; PP 21/2008; Perpres 17/2018 jo. Perpres 46/2026; Perka BNPB 3/2016 dan 15/2011; Perban BNPB 4/2020, 5/2017, 4/2024, dan 2/2024; Juklak BNPB 3/2022, 4/2023',
      'Bagan alur tahap berpemicu dan bertenggat; tabel pilih grafik B5.10 tidak memuat bagan alur', 5, 3,
      {'tahap': {'label': 'Tahap', 'warna': 'navy'}, 'pemicu': {'label': 'Pemicu dan tenggat tertulis', 'warna': 'tint.netral.pita'},
       'jalur': {'label': 'Jalur tanpa penetapan status', 'warna': 'tint.kering.pita'}},
      [K('t1', 0, 0, 'tahap', 'Peringatan dini', 'K/L teknis ke platform BNPB'), K('t2', 1, 0, 'tahap', 'Penilaian awal dan kaji cepat', 'warga, relawan, TRC PB'),
       K('t3', 2, 0, 'tahap', 'Status keadaan darurat', 'siaga, tanggap, transisi'), K('t4', 3, 0, 'tahap', 'Komando dan DSP', 'SKPDB aktif sesudah status'),
       K('t5', 4, 0, 'tahap', 'R3P dan hibah', 'rehabilitasi dan rekonstruksi'),
       K('p1', 0, 1, 'pemicu', 'Rekomendasi aksi', 'Perban BNPB 2/2024 Pasal 14–16'), K('p2', 1, 1, 'pemicu', 'TRC bergerak paling lambat 24 jam', 'laporan awal dan lanjutan berjam'),
       K('p3', 2, 1, 'pemicu', 'Penetap menurut tingkat pemerintahan', 'Perpres 17/2018 Pasal 2; PP 21/2008 Pasal 23'),
       K('p4', 3, 1, 'pemicu', 'Pertanggungjawaban DSP', 'Perban BNPB 4/2020 Pasal 20–21'), K('p5', 4, 1, 'pemicu', 'R3P dimulai saat tanggap darurat', 'Perban BNPB 5/2017; hibah Perban BNPB 4/2024'),
       K('j1', 1, 2, 'jalur', 'Keadaan tertentu Perpres 46/2026', 'Kepala BNPB bertindak sesudah rakor menteri koordinator', lk=3)],
      [P('t1', 't2'), P('t2', 't3'), P('t3', 't4'), P('t4', 't5'), P('j1', 'p4')],
      judul_baris=['Tahap', 'Pemicu', 'Jalur lain']),
 kisi('bab12-forum-jalur-adopsi', 'Forum koordinasi dan jalur adopsi rekomendasi kajian mitigasi, 2026–2030',
      'Perpres 1/2019; Perpres 144/2024; Perpres 46/2026; Perpres 87/2020; Perpres 80/2025; Perban BNPB 5/2018, 6/2025, dan 1/2026; Renas PB 2025–2029',
      'Bagan forum dan jalur adopsi bertenggat; tabel pilih grafik B5.10 tidak memuat bagan lembaga', 4, 4,
      {'forum': {'label': 'Forum berdasar peraturan', 'warna': 'tint.netral.pita'}, 'kd': {'label': 'Keputusan Kepala BNPB', 'warna': 'navy'},
       'jalur': {'label': 'Jalur adopsi bertenggat', 'warna': 'tint.basah.pita'}, 'lapor': {'label': 'Pelaporan', 'warna': 'kertas', 'garis': 'garis-kuat'}},
      [K('f1', 0, 0, 'forum', 'Rakor Kemenko PMK', 'Perpres 1/2019 Pasal 6; Perpres 144/2024'), K('f2', 1, 0, 'forum', 'Rakor antar-K/L', 'syarat keadaan tertentu Perpres 46/2026'),
       K('f3', 2, 0, 'forum', 'Unsur Pengarah BNPB', 'Perban BNPB 6/2025 Pasal 7–10'), K('f4', 3, 0, 'forum', 'Forum K/L Renas PB', 'paling lambat triwulan II'),
       K('kd', 0, 1, 'kd', 'KD-1 Kepala BNPB', 'kajian sebagai masukan peninjauan Renas PB', lk=4),
       K('j1', 0, 2, 'jalur', 'Renas jalur berkala', 'paling lambat 2027'), K('j2', 1, 2, 'jalur', 'Renas jalur bencana', 'paling lambat 2028'),
       K('j3', 2, 2, 'jalur', 'Pengendalian', 'lokasi kegiatan tahun berjalan'), K('j4', 3, 2, 'jalur', 'Renstra BNPB', 'perubahan lewat Perpres 80/2025'),
       K('l1', 0, 3, 'lapor', 'Pemantauan RIPB', 'setahun sekali ke Presiden melalui Menko PMK (Perpres 87/2020 Pasal 6)', lk=4)],
      [P('f1', 'kd'), P('f2', 'kd'), P('f3', 'kd'), P('f4', 'kd'), P('kd', 'j1'), P('kd', 'j2'), P('kd', 'j3'), P('kd', 'j4'),
       P('j1', 'l1'), P('j2', 'l1'), P('j3', 'l1'), P('j4', 'l1')]),
 kisi('bab12-lapisan-pembiayaan', 'Lapisan kejadian dan sumber dana penanggulangan bencana menurut peraturan yang berlaku, Oktober 2026',
      'Strategi PARB Kemenkeu; PP 22/2008; PP 12/2019; UU 7/2012; Perpres 75/2021; PMK 28/2025; Perban BNPB 4/2020 dan 1/2026; Permendes PDT 16/2025',
      'Lapisan sumber dana per lapis kejadian tanpa nominal; tabel pilih grafik B5.10 tidak memuat bagan lapisan', 4, 5,
      {'lapis': {'label': 'Lapis kejadian', 'warna': 'navy'}, 'apbn': {'label': 'APBN, APBD, dana desa', 'warna': 'tint.netral.pita'},
       'bnpb': {'label': 'Dana BNPB dan daerah', 'warna': 'tint.basah.pita'}, 'bersama': {'label': 'Dana Bersama dan transfer risiko', 'warna': 'tint.kering.pita'}},
      [K('l1', 0, 0, 'lapis', 'Prabencana', 'mitigasi dan kesiapsiagaan'), K('a1', 1, 0, 'apbn', 'APBN K/L, APBD, dana desa', 'kontinjensi APBN (PP 22/2008 Pasal 6 ayat (1))'),
       K('b1', 2, 0, 'bersama', 'Dana Bersama prabencana', 'Perpres 75/2021 Pasal 8'), K('c1', 3, 0, 'apbn', 'Fokus dana desa 2026', 'Permendes PDT 16/2025 Pasal 2'),
       K('l2', 0, 1, 'lapis', 'Sering', 'sampai lapisan median'), K('a2', 1, 1, 'bnpb', 'DSP BNPB dan BPBD', 'Perban BNPB 4/2020 Pasal 20'),
       K('b2', 2, 1, 'bnpb', 'BTT APBD', 'PP 12/2019 Pasal 68–69', lk=2),
       K('l3', 0, 2, 'lapis', 'Berat', 'sampai persentil 90'), K('a3', 1, 2, 'bersama', 'Dana Bersama', 'R3P syarat wajib (Perban BNPB 1/2026 Pasal 14)'),
       K('b3', 2, 2, 'bnpb', 'Hibah rehabilitasi dan rekonstruksi', 'permohonan pemda (PP 22/2008 Pasal 23)', lk=2),
       K('l4', 0, 3, 'lapis', 'Ekstrem', 'tidak lebih ringan dari 2018'), K('a4', 1, 3, 'bersama', 'Dana utama Dana Bersama', 'rekening BPDLH (PMK 28/2025)'),
       K('b4', 2, 3, 'bersama', 'Transfer risiko dan asuransi BMN/BMD', 'Perpres 75/2021 Pasal 6; Renas 4.6.3.a', lk=2),
       K('l5', 0, 4, 'lapis', 'Konflik sosial', 'penghentian dan rekonsiliasi'), K('a5', 1, 4, 'bnpb', 'DSP APBN dan BTT APBD', 'UU 7/2012 Pasal 55 ayat (1)', lk=3)],
      judul_kolom=['Lapis', 'Sumber dana utama', 'Sumber dana tambahan', 'Sumber dana lain']),
 kisi('bab12-pelaporan-tiga-lapis', 'Tata kelola dan pelaporan rekomendasi kajian mitigasi dalam tiga lapis, 2026–2030',
      'Perpres 1/2019; Perpres 87/2020; Perban BNPB 1/2023, 1/2025, 1/2026, 4/2020, dan 6/2025; Kepka BNPB 327/2025',
      'Bagan lapis pelaporan berfrekuensi; tabel pilih grafik B5.10 tidak memuat bagan lembaga', 3, 3,
      {'internal': {'label': 'Lapis internal BNPB', 'warna': 'navy'}, 'kl': {'label': 'Lapis lintas K/L', 'warna': 'tint.basah.pita'},
       'daerah': {'label': 'Lapis daerah dan data', 'warna': 'tint.netral.pita'}},
      [K('i1', 0, 0, 'internal', 'Kepala BNPB ke Presiden', 'sebulan sekali; setiap saat bila darurat (Perpres 1/2019 Pasal 3)'),
       K('i2', 1, 0, 'internal', 'Pemantauan dan evaluasi', 'Biro Perencanaan dan Direktorat Pengembangan Strategi (Perban BNPB 6/2025)'),
       K('i3', 2, 0, 'internal', 'Progsun', 'Biro Hukum, Organisasi, dan Kerja Sama, tiap triwulan (Kepka 327/2025)'),
       K('k1', 0, 1, 'kl', 'Evaluasi Renas PB', 'bagian pemantauan RIPB'), K('k2', 1, 1, 'kl', 'Pemantauan RIPB', 'ke Presiden melalui Menko PMK (Perpres 87/2020)'),
       K('k3', 2, 1, 'kl', 'Metadata indikator Renas 4.7.1.c', 'tempat indikator usulan kajian'),
       K('d1', 0, 2, 'daerah', 'Laporan DSP', 'bulanan (Perban BNPB 4/2020 Pasal 21)'), K('d2', 1, 2, 'daerah', 'Laporan akhir Dana Bersama', 'Perban BNPB 1/2026 Pasal 32'),
       K('d3', 2, 2, 'daerah', 'Satu Data Bencana', 'Walidata Pusdatinkom (Perban BNPB 1/2023)')],
      [P('k1', 'k2'), P('d1', 'k1'), P('d2', 'k2'), P('d3', 'k3')],
      judul_kolom=['Pelapor', 'Isi dan penerima', 'Tempat data']),
]

if __name__ == '__main__':
    if '--susun' in sys.argv:
        from PIL import Image

        def susun(panel, nama, kolom):
            im = [Image.open(KE / f'{n}.png').convert('RGB') for n in panel]
            man = [json.loads((KE / f'{n}.json').read_text()) for n in panel]
            w, sela = max(i.width for i in im), 24
            baris = [im[i:i + kolom] for i in range(0, len(im), kolom)]
            hb = [max(x.height for x in b) for b in baris]
            out = Image.new('RGB', (w * kolom + sela * (kolom - 1), sum(hb) + sela * (len(baris) - 1)), 'white')
            y = 0
            for b, h in zip(baris, hb):
                for j, x in enumerate(b):
                    out.paste(x, (j * (w + sela), y))
                y += h + sela
            out.save(KE / f'{nama}.png', dpi=im[0].info.get('dpi', (300, 300)))
            hexb = {}
            for m in man:
                for h, ps in m['hex'].items():
                    hexb[h] = sorted(set(hexb.get(h, [])) | set(ps))
            teks_min = min(float(x) for n in panel for x in re.findall(r'font-size="([\d.]+)"', (KE / f'{n}.svg').read_text()))
            lebar_cm = round(man[0]['ukuran_cm'][0] * kolom + 0.2 * (kolom - 1), 2)
            (KE / f'{nama}.json').write_text(json.dumps({'nama': nama, 'jenis': 'peta', 'panel': panel, 'teks_min_pt': teks_min,
                'ukuran_cm': [lebar_cm, round(lebar_cm * out.height / out.width, 2)], 'hex': hexb}, ensure_ascii=False, indent=1))
            print(nama, out.size, lebar_cm)

        susun([f'bab05-irbi-{k}' for k, _ in BAHAYA9], 'bab05-peta-irbi-per-bahaya-2025', 3)
        susun([f'bab07-hm-{k}' for k, _ in HM4], 'bab07-g19-irbi-hidromet', 2)
    else:
        (SINI / 'spek-mitigasi').mkdir(exist_ok=True)
        (SINI / 'spek-mitigasi' / 'grafik.json').write_text(json.dumps(grafik, ensure_ascii=False, indent=1))
        (SINI / 'spek-mitigasi' / 'diagram.json').write_text(json.dumps(diagram, ensure_ascii=False, indent=1))
        print(len(grafik), 'grafik,', len(diagram), 'diagram')
