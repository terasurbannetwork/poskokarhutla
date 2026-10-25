#!/usr/bin/env python3
"""Tulis spek-air/grafik.json (grafik dan peta Kajian Ketahanan Air) dari paket data; daftar kode sorot dibaca dari data.
    .venv/bin/python bangun/visual/data_air.py && .venv/bin/python bangun/visual/spek_air.py
    (cd bangun/visual && node render.mjs spek-air/*.json --ke=../../gambar/air) lalu python3 bangun/visual/susun_air.py
"""
import csv, json
from pathlib import Path

SINI = Path(__file__).resolve().parent
AKAR = SINI.parents[1]
T = 'data/kajian-bnpb/data/turunan/gambar-air/'
AJ = 'data/kajian-bnpb/data/air-jawa/'

tanpa_longsor = [r['kode'] for r in csv.DictReader(open(AKAR / 'data/air-jawa/kab_jawa.csv')) if not r['irbi2025_longsor']]


def peta_irbi(nama, kolom, judul, tinggi=None, ukuran='penuh'):
    s = {'nama': nama, 'jenis': 'peta', 'pesan': 'G19', 'besaran': 'indeks', 'ukuran': ukuran,
         'keterangan': f'Nilai IRBI {judul} per kab/kota di Pulau Jawa, 2025',
         'sumber': 'InaRISK BNPB, IRBI 2025 ({rumus_kelas})', 'cakupan': 'jawa', 'tingkat': 'kab',
         'koroplet': {'sumber': {'berkas': AJ + 'irbi_kab_2015_2025.csv', 'saring': {'tahun': '2025'}, 'kunci': 'kode', 'nilai': kolom},
                      'kelas': {'ramp': 'api', 'kuantil': 5, 'desimal': 1},
                      'judul_legenda': f'IRBI {judul} 2025, kelas kuintil (jumlah kab/kota)'},
         'label': {'provinsi': ukuran == 'penuh'}}
    if tinggi:
        s['tinggi_cm'] = tinggi
    return s


def peta_tahun(nama, berkas, judul, ukuran='penuh', sorot=None):
    s = {'nama': nama, 'jenis': 'peta', 'pesan': 'G19', 'besaran': 'indeks', 'ukuran': ukuran,
         'keterangan': f'Jumlah tahun berkejadian {judul} kab/kota di Pulau Jawa menurut DIBI, 2015–2025',
         'sumber': 'DIBI BNPB 2015–2025 ({rumus_kelas})', 'cakupan': 'jawa', 'tingkat': 'kab',
         'koroplet': {'sumber': {'berkas': T + berkas, 'kunci': 'kode', 'nilai': 'n_tahun'},
                      'kelas': {'ramp': 'emas' if judul == 'kekeringan' else 'air', 'batas': [0, 2, 4, 6],
                                'label': ['0 tahun', '1–2 tahun', '3–4 tahun', '5–6 tahun', '7–11 tahun'],
                                'rumus': 'batas tetap jumlah tahun', 'desimal': 0},
                      'judul_legenda': f'Tahun berkejadian {judul} 2015–2025 (jumlah kab/kota)'},
         'label': {'provinsi': ukuran == 'penuh'}}
    if ukuran != 'penuh':
        s['skala'] = False
    if sorot:
        s['sorot'], s['sorot_label'] = sorot, 'IRBI longsor tidak dinilai'
    return s


spek = [
 {'nama': 'oni-2008-2026', 'jenis': 'garis', 'ukuran': 'penuh',
  'alasan': 'Seri delapan belas musim ditambah satu nilai Juli sampai September dengan nilai negatif; batang G1 tidak memuat nilai negatif',
  'keterangan': 'Oceanic Niño Index per musim hujan 2008/2009–2025/2026 dan Juli–September 2026 (°C)',
  'sumber': 'NOAA Climate Prediction Center, Oceanic Niño Index',
  'seri': [{'label': 'ONI', 'warna': 'navy', 'data': {'sumber': {'berkas': T + 'oni_ndj_musim.csv'}, 'x': 'musim', 'y': 'oni'}}],
  'desimal': 2, 'desimal_acuan': 1},
 {'nama': 'tokyo-air-tanah-1964-1975', 'jenis': 'batang', 'pesan': 'G1', 'ukuran': 'dua-kolom',
  'keterangan': 'Pengambilan air tanah di wilayah ku Tokyo, 1964 dan 1975 (m³ per hari)',
  'sumber': 'Yamamoto, UNESCO Guidebook, Case History 9.4 Tokyo',
  'data': {'sumber': {'berkas': T + 'tokyo_air_tanah.csv'}, 'x': 'tahun', 'y': 'm3_hari'},
  'seri_label': 'Pengambilan air tanah (m³ per hari)'},
 {'nama': 'bab04-batang-irigasi-kewenangan', 'jenis': 'bertumpuk', 'pesan': 'G8', 'ukuran': 'penuh',
  'keterangan': 'Luas daerah irigasi per provinsi di Pulau Jawa menurut kewenangan, penetapan 2015 (persen luas)',
  'sumber': 'Permen PUPR 14/PRT/M/2015, Lampiran I–III',
  'data': {'sumber': {'berkas': T + 'irigasi_kewenangan_provinsi.csv'}, 'x': 'provinsi', 'seri': 'kewenangan', 'nilai': 'persen',
           'urutan_x': ['Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur', 'Banten']},
  'seri': [{'id': 'Pusat', 'label': 'Pusat', 'warna': 'navy'}, {'id': 'Provinsi', 'label': 'Provinsi', 'warna': 'biru-abu'},
           {'id': 'Kabupaten/kota', 'label': 'Kabupaten/kota', 'warna': 'kategori.basah'}], 'desimal': 1},
 {'nama': 'bab04-peta-irigasi-permukaan-kab', 'jenis': 'peta', 'pesan': 'G20', 'besaran': 'total', 'ukuran': 'penuh',
  'keterangan': 'Luas irigasi permukaan per kabupaten/kota di Pulau Jawa menurut penetapan daerah irigasi 2015 (ha)',
  'sumber': 'Permen PUPR 14/PRT/M/2015', 'cakupan': 'jawa', 'tingkat': 'kab',
  'titik': [{'nama': 'Irigasi permukaan', 'judul_legenda': 'Luas irigasi permukaan (ha)', 'bentuk': 'lingkaran', 'warna': 'kategori.basah',
             'sumber': {'berkas': T + 'irigasi_permukaan_kab.csv'}, 'nilai': 'ha', 'label': 'nama', 'label_teratas': 4}],
  'label': {'provinsi': True}},
 {'nama': 'bab04-peta-bendungan-pemali-juana', 'jenis': 'peta', 'pesan': 'G20', 'besaran': 'total', 'ukuran': 'penuh',
  'keterangan': 'Bendungan BBWS Pemali-Juana menurut volume desain dan kehilangan tampungan, status Juli 2021',
  'sumber': 'BBWS Pemali-Juana, data bendungan status Juli 2021', 'cakupan': ['33'], 'tingkat': 'kab',
  'titik': [{'nama': 'Bendungan', 'judul_legenda': 'Volume desain (juta m³)', 'bentuk': 'persegi', 'warna': 'navy',
             'sumber': {'berkas': T + 'bendungan_pj.csv'}, 'nilai': 'kapasitas', 'label': 'label', 'label_teratas': 6, 'desimal': 0}],
  'label': {'provinsi': False}},
 {'nama': 'bab04-rentang-penurunan-muka-tanah', 'jenis': 'rentang', 'pesan': 'G12', 'ukuran': 'penuh',
  'keterangan': 'Laju penurunan muka tanah terukur per kota di Pulau Jawa menurut metode dan periode, 1982–2023 (cm per tahun)',
  'sumber': 'Literatur terverifikasi, paket air-jawa subsiden_kota',
  'data': {'sumber': {'berkas': T + 'laju_penurunan.csv'}, 'kategori': 'id', 'rendah': 'rendah', 'tinggi': 'tinggi'},
  'satuan': 'cm/th', 'desimal': 1, 'warna': 'navy', 'seri_label': 'rentang laju satu studi, terendah sampai tertinggi'},
 {'nama': 'bab05-garis-oni-2008-2026', 'jenis': 'garis', 'pesan': 'G2', 'ukuran': 'penuh',
  'keterangan': 'Oceanic Niño Index tiga bulanan dan musim El Niño kuat, 2008–2026 (°C)',
  'sumber': 'NOAA Climate Prediction Center, Oceanic Niño Index',
  'seri': [{'label': 'ONI', 'warna': 'navy', 'data': {'sumber': {'berkas': T + 'oni_musiman.csv'}, 'x': 'musim', 'y': 'oni'}}],
  'anotasi': [{'x': 'NDJ 2009', 'teks': 'El Niño kuat 2009/10'}, {'x': 'NDJ 2015', 'teks': '2015/16'}, {'x': 'NDJ 2023', 'teks': '2023/24'}],
  'desimal': 2, 'desimal_acuan': 1},
 {'nama': 'bab05-batang-kab-kekeringan-2008-2026', 'jenis': 'batang', 'pesan': 'G1', 'ukuran': 'penuh',
  'keterangan': 'Kab/kota di Pulau Jawa yang mencatat kekeringan per tahun, 2008–2026',
  'sumber': 'DIBI BNPB 2008–2026, kejadian bencana',
  'data': {'sumber': {'berkas': T + 'kekeringan_kab_tahun.csv'}, 'x': 'tahun', 'y': 'n_kab'},
  'tekan': list(range(18)), 'legenda': {'tekan': 'Kab/kota berkejadian kekeringan, 2008–2025', 'lama': '2026, sementara sampai 23 Oktober'}},
 peta_irbi('bab05-peta-irbi-kekeringan-kab', 'kekeringan', 'kekeringan'),
 peta_tahun('bab05-peta-tahun-dibi-kekeringan', 'tahun_kekeringan_kab.csv', 'kekeringan'),
 peta_tahun('kartu-kekeringan-tahun-dibi', 'tahun_kekeringan_kab.csv', 'kekeringan', ukuran='tiga-kolom'),
 {'nama': 'bab05-batang-karhutla-provinsi', 'jenis': 'batang', 'pesan': 'G1', 'ukuran': 'penuh',
  'keterangan': 'Luas karhutla di Pulau Jawa, 2015–2026 (ha)',
  'sumber': 'SiPongi Kementerian Kehutanan, luas kebakaran per provinsi, data sampai Juli 2026',
  'data': {'sumber': {'berkas': T + 'karhutla_provinsi_tahun.csv', 'kelompok': 'tahun', 'ringkas': {'luas': 'jumlah:luas'}}, 'x': 'tahun', 'y': 'luas'},
  'warna': 'kategori.api', 'warna_lama': 'seri-lama', 'tekan': list(range(11)),
  'legenda': {'tekan': 'Jumlah enam provinsi, 2015–2025', 'lama': '2026, sampai Juli'}},
 {'nama': 'kartu-karhutla-provinsi-2023', 'jenis': 'horizontal', 'pesan': 'G4', 'ukuran': 'tiga-kolom',
  'keterangan': 'Luas karhutla per provinsi di Pulau Jawa, 2023 (ha)', 'sumber': 'SiPongi Kementerian Kehutanan',
  'data': {'sumber': {'berkas': T + 'karhutla_provinsi_2023.csv'}, 'x': 'provinsi', 'y': 'luas'}, 'n': 6, 'desimal': 0,
  'seri_label': 'Luas karhutla 2023 (ha)', 'judul_kolom': {'nama': 'PROVINSI', 'nilai': 'HA'}},
 peta_irbi('bab06-irbi-banjir', 'banjir', 'banjir', tinggi=6.4),
 peta_irbi('bab06-irbi-longsor', 'longsor', 'tanah longsor', tinggi=6.4),
 peta_irbi('bab06-irbi-abrasi', 'abrasi', 'abrasi', tinggi=6.4),
 peta_tahun('bab06-peta-tahun-longsor-kab', 'tahun_longsor_kab.csv', 'tanah longsor', sorot=tanpa_longsor),
 {'nama': 'kartu-perhatian-banjir-longsor', 'jenis': 'peta', 'pesan': 'G19', 'besaran': 'indeks', 'ukuran': 'tiga-kolom',
  'keterangan': 'Kab/kota daftar perhatian banjir dan tanah longsor di Pulau Jawa, 2025',
  'sumber': 'Daftar perhatian kajian ini ({rumus_kelas})', 'cakupan': 'jawa', 'tingkat': 'kab',
  'koroplet': {'sumber': {'berkas': T + 'perhatian_banjir_longsor.csv', 'kunci': 'kode', 'nilai': 'n_bahaya'},
               'kelas': {'ramp': 'air', 'batas': [0, 1], 'label': ['Di luar daftar', 'Satu bahaya', 'Banjir dan longsor'],
                         'rumus': 'jumlah bahaya yang memenuhi daftar perhatian', 'desimal': 0},
               'judul_legenda': 'Daftar perhatian (jumlah kab/kota)'},
  'label': {'provinsi': False}, 'skala': False},
 {'nama': 'bab06-batang-tambahan-muka-tanah', 'jenis': 'rentang', 'pesan': 'G12', 'ukuran': 'penuh',
  'keterangan': 'Tambahan penurunan muka tanah 2026–2030 per titik atau kota terverifikasi di Pulau Jawa bila laju tetap (cm)',
  'sumber': 'Pengolahan Pantau Bencana dari laju terverifikasi',
  'data': {'sumber': {'berkas': T + 'tambahan_muka_tanah.csv'}, 'kategori': 'wilayah', 'rendah': 'rendah', 'tinggi': 'tinggi',
           'warna_kategori': {'Pekalongan, kutipan latar': 'seri-lama'},
           'legenda_warna': {'navy': 'laju terverifikasi dikali 4 tahun', 'seri-lama': 'versi kutipan latar, pembanding'}},
  'satuan': 'cm', 'desimal': 1, 'warna': 'navy'},
 {'nama': 'bab06-batang-musim-hujan-jawa', 'jenis': 'batang', 'pesan': 'G1', 'ukuran': 'penuh',
  'keterangan': 'Meninggal dan hilang per musim hujan di Pulau Jawa, 2008/2009–2025/2026 (jiwa)',
  'sumber': 'DIBI BNPB, musim hujan 1 Oktober sampai 30 April',
  'data': {'sumber': {'berkas': T + 'musim_hujan_total.csv'}, 'x': 'pendek', 'y': 'meninggal_hilang'},
  'warna': 'kategori.basah', 'tekan': [0], 'legenda': {'tekan': 'Lantai skenario, 2008/2009', 'lama': 'Musim lain'}},
 {'nama': 'bab06-batang-kepekaan-peringatan-dini', 'jenis': 'batang', 'pesan': 'G1', 'ukuran': 'penuh',
  'keterangan': 'Meninggal dan hilang tercatat dan setelah kepekaan cakupan peringatan dini di Pulau Jawa, musim 2008/2009 dan 2025/2026 (jiwa)',
  'sumber': 'Pengolahan Pantau Bencana dari DIBI BNPB; Renas PB 2025–2029 indikator 1.c; WMO 2022',
  'data': {'sumber': {'berkas': T + 'kepekaan_pd.csv'}, 'x': 'pendek', 'y': 'jiwa'},
  'tekan': [3, 4, 5], 'legenda': {'lama': 'Musim 2008/2009 (lantai)', 'tekan': 'Musim 2025/2026'}},
]
(SINI / 'spek-air' / 'grafik.json').write_text(json.dumps(spek, ensure_ascii=False, indent=1))
print(len(spek), 'spek')
