#!/usr/bin/env python3
"""Spek deck "Program Flagship Kerja Sama BNPB, Perguruan Tinggi, dan Dunia Usaha" (3 Nov 2026).

Menulis data/angka.json, pustaka.json, CSV di data/flagship/, lalu spek/flagship-031126.json.
Sumber isi: repo poskokarhutla data/laporan-bnpb/ajuan-program-pt-swasta-021126 (01-brainstorm-ide.md,
02-pemetaan-kampus.md, riset.json). Arah pemilik 2 Nov 2026: "ikut semua usulan" sesi arah.
"""
import csv
import json
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
DATA = AKAR / 'data'
FD = DATA / 'flagship'
FD.mkdir(parents=True, exist_ok=True)

# ------------------------------------------------------------------ pustaka
PUSTAKA = []


def P(pid, judul, penulis, tahun, url, tipe='webpage'):
    PUSTAKA.append({'id': pid, 'type': tipe, 'author': [{'literal': penulis}], 'issued': {'date-parts': [[tahun]]},
                    'title': judul, 'URL': url, 'verifikasi': 'sekunder'})


P('rev4', 'Ajuan Program Kerja Sama BNPB dengan Perguruan Tinggi (paparan rev4)', 'Badan Nasional Penanggulangan Bencana', 2026,
  'https://bnpb.go.id', 'report')
P('brainstorm', 'Brainstorm dan penyaringan ide program flagship kampus dan dunia usaha', 'Badan Nasional Penanggulangan Bencana', 2026,
  'https://bnpb.go.id', 'report')
P('pmk114', 'Peraturan Menteri Keuangan Nomor 114 Tahun 2025', 'Kementerian Keuangan', 2025,
  'https://jdih.kemenkeu.go.id/api/download/956c4a77-a4bb-4c97-a4a9-989bc6a98c79/2025pmkeuangan114.pdf', 'legislation')
P('ddtc-sd', 'PMK 81/2024 perbarui ketentuan super tax deduction litbang', 'DDTC News', 2024,
  'https://news.ddtc.co.id/berita/nasional/1807141/pmk-812024-perbarui-ketentuan-supertax-deduction-beg')
P('ddtc-wp', 'Sri Mulyani sebut baru 30 WP ajukan super tax deduction', 'DDTC News', 2024,
  'https://news.ddtc.co.id/berita/nasional/1812747/sri-mulyani-sebut-baru-30-wp-ajukan-supertax-deducti')
P('mf', 'Matching Fund Kedaireka dan Dana Padanan', 'VIVA; Infobanknews', 2024,
  'https://www.viva.co.id/edukasi/1443253-ditjen-diktiristek-buka-penerimaan-proposal-program-penelitia')
P('riim', 'Anggaran riset BRIN terbuka untuk semua pihak', 'ANTARA', 2024,
  'https://m.antaranews.com/amp/berita/4480293/anggaran-riset-brin-terbuka-untuk-semua-pihak')
P('arise', 'New private sector alliance gets down to business (ARISE)', 'UNDRR PreventionWeb', 2015,
  'https://www.preventionweb.net/news/new-private-sector-alliance-gets-down-business')
P('tdmrc', 'TDMRC gathering dan respons Siklon Senyar', 'TDMRC USK', 2026,
  'https://tdmrc.usk.ac.id/2026/02/12/tdmrc-gathering-to-welcome-ramadan-1447-h-and-meet-and-greet-with')
P('medco', 'MedcoEnergi community development: bantuan banjir Aceh', 'MedcoEnergi', 2025,
  'https://www.medcoenergi.com/en/our-sustainability/social-and-communities/community-development-progr')
P('pegadaian', 'Pegadaian dan Universitas Andalas kembangkan model kesiapsiagaan megathrust', 'Katadata', 2026,
  'https://katadata.co.id/berita/nasional/6a4775341ae17/pegadaian-universitas-andalas-kembangkan-model-')
P('astra', 'Astra continues to provide humanitarian support for disaster', 'PT Astra International Tbk', 2025,
  'https://www.astra.co.id/en/press-release/astra-continues-to-provide-humanitarian-support-for-disaste')
P('mandiri', 'Bank Mandiri percepat penyaluran 67.000 bantuan', 'Bisnis.com', 2025,
  'https://finansial.bisnis.com/read/20251203/90/1933989/bank-mandiri-percepat-penyaluran-67000-bantuan')
P('danantara', 'Danantara Indonesia kirim 1.000 relawan', 'CNN Indonesia', 2025,
  'https://www.cnnindonesia.com/ekonomi/20251220104437-625-1308942/danantara-indonesia-kirim-1000-relaw')
P('paragon-sum', 'Sosok Nurhayati Subakat dan bantuan Paragon untuk Sumatra', 'Katadata', 2025,
  'https://katadata.co.id/amp/finansial/korporasi/6944f7fa4e99e/sosok-nurhayati-subakat-perem')
P('paragon-itb', 'ITB dan ParagonCorp perkuat akses pendidikan melalui beasiswa', 'Institut Teknologi Bandung', 2025,
  'https://itb.ac.id/berita/itb-dan-paragoncorp-perkuat-akses-pendidikan-melalui-beasiswa-yie')
P('labtek', 'ITB, Pertamina, dan Paragon resmikan Gedung Labtek XV', 'Institut Teknologi Bandung', 2025,
  'https://itb.ac.id/berita/itb-pertamina-dan-paragon-resmikan-gedung-labtek-xv-fasilitas-ter')
P('telkom', 'Pemulihan layanan TelkomGroup di Sumatra', 'Selular.ID', 2025,
  'https://selular.id/2025/12/pemulihan-layanan-telkomgroup-di-sumatra-tembus-80-tim-tambahan')
P('spab', 'Prudential Indonesia tingkatkan kesiapsiagaan pelajar dan guru', 'Media Asuransi News', 2024,
  'https://mediaasuransinews.co.id/asuransi/prudential-indonesia-tingkatkan-kesiapsiagaan-pelajar-dan-g')
P('icl', 'Progress Report 2024 SEA Network ICL', 'International Consortium on Landslides', 2024,
  'https://landslides.org/wp-content/uploads/2024/11/Progress-Report-2024_SEA-Network-ICL-20241124.pdf')
P('ugm-eru', 'Kampus berdampak memperkuat kontribusi kemanusiaan', 'Universitas Gadjah Mada', 2025,
  'https://ugm.ac.id/id/berita/kampus-berdampak-memperkuat-kontribusi-kemanusiaan/')
P('zcra', 'Zurich Flood and Climate Resilience Alliance impact brief', 'Mercy Corps', 2024,
  'https://www.prosperglobal.org/sites/default/files/2025-03/zfra-zcra-impact-brief-dec2024.pdf')
P('amman', 'AMMAN distributes humanitarian aid to help Cianjur disaster victims', 'PT Amman Mineral Nusa Tenggara', 2022,
  'https://www.amman.co.id/article/amman-distributes-humanitarian-aid-to-help-cianjur-s-disaster-victim')
P('ulm', 'ULM kelola 629 hektare mangrove kembangkan hutan pendidikan', 'Antara Kalsel', 2023,
  'https://kalsel.antaranews.com/berita/388038/ulm-kelola-629-hektare-mangrove-kembangkan-hutan-pendidi')
P('vale', 'PT Vale dan Pemkab Luwu Utara perkuat mitigasi banjir', 'RRI Makassar', 2025,
  'https://rri.co.id/makassar/ekonomi/bisnis/2060508/pt-vale-pemkab-luwu-utara-perkuat-mitigasi-banjir')
P('tsel-bts', 'Telkomsel bangun 800 BTS baru di wilayah Maluku Papua', 'Antara Ambon', 2023,
  'https://ambon.antaranews.com/berita/181707/telkomsel-bangun-800-bts-baru-di-wilayah-maluku-papua')
P('inpex', 'Tahun ketujuh program beasiswa INPEX', 'Republika', 2021,
  'https://news.republika.co.id/berita/r21sgg456/tahun-ketujuh-program-beasiswa-inpex-sasar-55-mahasisw')
P('asian-agri', 'Asian Agri holds fire readiness drill', 'Asian Agri', 2024,
  'https://asianagri.com/en/media-publications/press-release/asian-agri-holds-fire-readiness-drill-in-a')
P('klh', 'KLH catat kebakaran di konsesi 2026', 'Kementerian Lingkungan Hidup lewat media', 2026,
  'https://katadata.co.id')
P('sanksi', 'Kemenhut sanksi perusahaan atas kebakaran 2026; NEA kirim pemberitahuan ke pemasok APP', 'Katadata', 2026,
  'https://katadata.co.id')
P('walhi', 'Walhi: lubang tambang dan banjir Kalimantan Selatan 2021', 'Walhi', 2021, 'https://www.walhi.or.id')
P('gopay', 'Aplikasi GoPay salurkan donasi dan zakat Rp129 miliar', 'Bisnis.com', 2025,
  'https://finansial.bisnis.com/read/20250910/563/1910457/aplikasi-gopay-salurkan-donasi-dan-zakat-rp12')
P('arise-fiskal', 'Luncurkan ARISE, pemerintah bersiap hitung kerugian bencana', 'Kabar Bursa', 2026,
  'https://www.kabarbursa.com/makro/luncurkan-arise-pemerintah-bersiap-hitung-kerugian-bencana')
P('freeport-ntt', 'Freeport salurkan 2,5 ton bantuan kemanusiaan gempa NTT', 'Katadata', 2026,
  'https://katadata.co.id/berita/nasional/6a9adc0d07c04/freeport-salurkan-2-5-ton-bantuan-kemanusiaan-b')
P('kemendagri', 'Kode dan data wilayah administrasi pemerintahan', 'Kementerian Dalam Negeri', 2025,
  'https://kemendagri.go.id', 'legislation')
P('petabencana', 'DisasterBot dan kampanye kesiapsiagaan nasional', 'Yayasan Peta Bencana', 2025, 'https://info.petabencana.id/250426')

# ------------------------------------------------------------------ registri angka
ANGKA = {}


def A(kunci, nilai, satuan, pustaka, sumber, keyakinan='terverifikasi', **kw):
    ANGKA[kunci] = dict(nilai=nilai, satuan=satuan, pustaka=pustaka, sumber=sumber, keyakinan=keyakinan, **kw)


R4 = 'Paparan kerja sama perguruan tinggi, 30 Okt 2026'
BS = 'Brainstorm ide BNPB, 2 Nov 2026'
A('rev4.program', 15, 'program', 'rev4', R4, 'resmi')
A('rev4.pilar', 4, 'pilar', 'rev4', R4, 'resmi')
A('rev4.koordinator', 11, 'kampus', 'rev4', R4, 'resmi')
A('rev4.sekitar', 116, 'kampus', 'rev4', R4 + ', jumlah kampus sekitar sepuluh regional', 'resmi')
A('ide.total', 53, 'ide', 'brainstorm', BS, 'penilaian-pakar')
A('ide.gugus', 10, 'gugus', 'brainstorm', BS, 'penilaian-pakar')
A('ide.lensa', 4, 'lensa', 'brainstorm', BS, 'penilaian-pakar')
A('ide.kriteria', 5, 'kriteria', 'brainstorm', BS, 'penilaian-pakar')
A('ide.dinilai', 24, 'ide', 'brainstorm', BS, 'penilaian-pakar')
A('ide.lolos', 17, 'ide', 'brainstorm', BS, 'penilaian-pakar')
A('ide.motif', 6, 'motif', 'brainstorm', BS, 'penilaian-pakar')
A('rev4.mitra2028', 50, 'kampus', 'rev4', R4 + ', peta jalan 2028', 'resmi')
A('rev4.mitra2029', 100, 'kampus', 'rev4', R4 + ', peta jalan 2029', 'resmi')
A('skor.ambang', 20, 'poin', 'brainstorm', BS, 'penilaian-pakar')
A('skor.tabel', 18, 'poin', 'brainstorm', BS, 'penilaian-pakar')
A('rev4.relawan2029', 5000, 'anggota', 'rev4', R4 + ', peta jalan 2029', 'resmi')
A('itb.sekitar', 10, 'kampus', 'rev4', R4 + ', kampus sekitar regional Jawa Barat', 'resmi')
A('unram.sekitar', 8, 'kampus', 'rev4', R4 + ', kampus sekitar regional Bali dan Nusa Tenggara', 'resmi')
A('unpatti.sekitar', 8, 'kampus', 'rev4', R4 + ', kampus sekitar regional Maluku dan Papua', 'resmi')
A('rev4.unit', 6, 'unit', 'rev4', R4 + ', unit BNPB yang dipetakan kebutuhannya', 'resmi')
A('keputusan.kepala', 3, 'keputusan', 'brainstorm', BS, 'asumsi-kebijakan')
A('tindak.unit', 3, 'tindak lanjut', 'brainstorm', BS, 'asumsi-kebijakan')
A('ntt.gempa', 7.7, 'magnitudo', 'freeport-ntt', 'Katadata, 4 Sep 2026')
A('ui.sekitar', 5, 'kampus', 'rev4', R4 + ', kampus sekitar regional DKI dan Banten', 'resmi')
A('usk.posko', 7, 'kabupaten/kota', 'tdmrc', 'Good News From Indonesia; TDMRC USK')
A('aceh.kab', 23, 'kabupaten/kota', 'kemendagri', 'Kemendagri, kode wilayah 2025', 'resmi')
A('ri.kab', 514, 'kabupaten/kota', 'kemendagri', 'Kemendagri, kode wilayah 2025', 'resmi')
A('rev4.relawan2027', 500, 'relawan', 'rev4', R4 + ', target 2027', 'resmi')
A('skor.tertinggi', 24, 'poin', 'brainstorm', BS, 'penilaian-pakar')
A('skor.maks', 25, 'poin', 'brainstorm', BS, 'penilaian-pakar')
A('fs.jumlah', 12, 'flagship', 'brainstorm', BS, 'asumsi-kebijakan')
A('lintas.jumlah', 5, 'program', 'brainstorm', BS, 'asumsi-kebijakan')
A('pagar.jumlah', 7, 'syarat', 'brainstorm', BS, 'asumsi-kebijakan')
A('keputusan.jumlah', 6, 'langkah', 'brainstorm', BS, 'asumsi-kebijakan')
A('pmk114.batas', 5, '%', 'pmk114', 'PMK 114/2025 Pasal 4, 30 Des 2025', 'resmi')
A('sd.persen', 300, '%', 'ddtc-sd', 'PP 45/2019 dan PMK 81/2024, lewat DDTC News 2024')
A('sd.wp', 30, 'wajib pajak', 'ddtc-wp', 'Menteri Keuangan dikutip DDTC News, 2024')
A('usk.relawan', 120, 'relawan', 'tdmrc', 'TDMRC USK, 12 Feb 2026')
A('unand.komponen', 5, 'komponen', 'pegadaian', 'Katadata, 3 Jul 2026')
A('astra.posko', 19, 'posko', 'astra', 'Astra International, 30 Des 2025')
A('mandiri.bantuan', 67000, 'paket', 'mandiri', 'Bisnis.com, 3 Des 2025')
A('paragon.ton', 30, 'ton', 'paragon-sum', 'Katadata, 19 Des 2025')
A('telkom.satelit', 120, 'unit', 'telkom', 'Selular.ID, 11 Des 2025')
A('ugm.kab', 120, 'kabupaten', 'icl', 'International Consortium on Landslides, 24 Nov 2024')
A('target.ugm', 1000, 'unit', 'brainstorm', BS + ', usulan target sampai 2029', 'asumsi-kebijakan')
A('its.sekitar', 16, 'kampus', 'rev4', R4 + ', kampus sekitar regional Jawa Timur', 'resmi')
A('paragon.beasiswa', 60, 'mahasiswa', 'paragon-itb', 'Institut Teknologi Bandung, 22 Jun 2025')
A('spab.sekolah', 133, 'sekolah', 'spab', 'Media Asuransi News, 29 Agt 2024')
A('unhas.sekitar', 14, 'kampus', 'rev4', R4 + ', kampus sekitar regional Sulawesi', 'resmi')
A('amman.personel', 9, 'personel', 'amman', 'AMMAN, 5 Des 2022')
A('amman.kasur', 440, 'kasur', 'amman', 'AMMAN, 5 Des 2022')
A('ulm.mangrove', 629.27, 'ha', 'ulm', 'Antara Kalsel, 2023')
A('vale.bbm', 10000, 'liter', 'vale', 'RRI Makassar, 23 Des 2025')
A('tsel.bts', 800, 'BTS', 'tsel-bts', 'Antara Ambon, 2023')
A('klh.ha', 85000, 'ha', 'klh', 'KLH dikutip media, 24 Agt 2026')
A('sanksi.2026', 32, 'perusahaan', 'sanksi', 'Kementerian Kehutanan lewat Katadata, 19 Okt 2026')

# ------------------------------------------------------------------ CSV


def tulis(nama, kepala, baris):
    with open(FD / nama, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(kepala)
        w.writerows(baris)
    return f'data/flagship/{nama}'


def D(csv_, kolom, sumber, keyakinan='terverifikasi', **kw):
    return dict(csv=csv_, kolom=kolom, sumber=sumber, keyakinan=keyakinan, **kw)


def kartu_angka(nama, baris, sumber, keyakinan='terverifikasi'):
    """angka_besar mode kartu: baris [label, nilai, satuan, ket, ikon]."""
    c = tulis(nama, ['label', 'nilai', 'satuan', 'ket', 'ikon'], baris)
    return {'mode': 'kartu', 'data': D(c, [{'nama': 'label'}, {'nama': 'nilai', 'kepala': 'Nilai', 'fmt': '0'},
                                           {'nama': 'satuan'}, {'nama': 'ket'}, {'nama': 'ikon'}], sumber, keyakinan)}


def kalimat(kolom):
    """Isi kartu sebagai paragraf, bukan butir bertebal (gerbang anti-AI S-2)."""
    return [dict(k, isi='. '.join(k['isi']) + '.') if isinstance(k['isi'], list) else k for k in kolom]


# ------------------------------------------------------------------ slide
S = []
KREDIT_KAMPUS = ('Foto: Ilham Kuniawan Gumilang (UI), A2613 (ITB), Alharomain354 (UGM), Davidelit (IPB); '
                 'CC BY-SA 4.0, Wikimedia Commons')
FOTO_KAMPUS = ['foto/kampus-ui.jpg', 'foto/kampus-itb.jpg', 'foto/kampus-ugm.jpg', 'foto/kampus-ipb.jpg']

S.append({'jenis': 'sampul', 'layout': 'putih', 'foto': FOTO_KAMPUS, 'kredit': KREDIT_KAMPUS, 'kota': 'Jakarta',
          'logo_kanan': 'foto/berakhlak-hd.png',
          'judul_sampul': 'Program Flagship Kerja Sama BNPB dengan Perguruan Tinggi dan Dunia Usaha',
          'subjudul': 'Satu proyek bernama per kampus koordinator bersama calon mitra swasta yang akan diuji tuntas',
          'kepada': 'Disampaikan kepada Kepala Badan Nasional Penanggulangan Bencana',
          'tanpa_penyaji': 'pemilik 2 Nov 2026 (sesi arah no. 2): pil Disampaikan kepada Kepala BNPB, tanpa nama penyaji'})
S.append({'jenis': 'daftar-isi'})

# 3. Ringkasan
S.append({
    'jenis': 'kesimpulan', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'skala_isi': 1.22,
    'pesan': 'Ringkasan usulan flagship',
    'judul': 'Ringkasan: tiap kampus koordinator memimpin satu proyek bernama bersama mitra swasta, dengan kampus sebagai penjamin mutu',
    'kartu': [
        {'label': 'Celah', 'ikon': 'ringkasan', 'warna': 'navy', 'judul': 'Program masih berupa wadah',
         'isi': 'Paparan sebelumnya memuat {{angka:rev4.program}} program dalam {{angka:rev4.pilar}} pilar; belum ada proyek bernama yang bisa diresmikan dan diukur.'},
        {'label': 'Model tiga pihak', 'ikon': 'lembaga', 'warna': 'navy', 'judul': 'Aset yang saling melengkapi',
         'isi': 'Kampus menguji dan memverifikasi; swasta membawa pabrik, platform, armada, dan karyawan; BNPB membawa mandat dan data.'},
        {'label': 'Alasan swasta ikut', 'ikon': 'pembiayaan', 'warna': 'navy', 'judul': 'Pajak dan reputasi',
         'isi': 'Sumbangan bencana lewat BNPB dan sumbangan litbang ke kampus dapat dikurangkan, paling tinggi {{angka:pmk114.batas|persen}} penghasilan neto.'},
        {'label': 'Brainstorming', 'ikon': 'data', 'warna': 'navy', 'judul': 'Ide disaring dulu',
         'isi': '{{angka:ide.total}} ide dinilai dengan {{angka:ide.kriteria}} kriteria; {{angka:ide.lolos}} ide lolos ambang dan menjadi bahan flagship.'},
        {'label': 'Flagship', 'ikon': 'wilayah', 'warna': 'oranye', 'judul': 'Satu identitas per kampus',
         'isi': '{{angka:fs.jumlah}} flagship: satu untuk tiap kampus koordinator, ditambah Telkom University di regional Jawa Barat.'},
        {'label': 'Lintas regional', 'ikon': 'satu-data', 'warna': 'oranye', 'judul': 'Dijalankan semua kampus',
         'isi': '{{angka:lintas.jumlah}} program bersama, dari pesan siaga di aplikasi sampai asuransi bencana daerah.'},
        {'label': 'Pagar', 'ikon': 'peringatan', 'warna': 'merah', 'judul': 'Uji tuntas sebelum MoU',
         'isi': '{{angka:pagar.jumlah}} syarat menjaga BNPB dari mitra tersanksi kebakaran, tambang di DAS banjir, dan tembakau.'},
        {'label': 'Tahapan', 'ikon': 'kalender', 'warna': 'navy', 'judul': 'Dari percontohan ke perluasan',
         'isi': 'Penjajakan 100 hari, percontohan 2027, lalu perluasan sesuai peta jalan sampai {{angka:rev4.mitra2029}} kampus mitra pada 2029.'},
    ],
    'arahan': {'label': 'Keputusan yang diminta', 'ikon': 'regulasi',
               'teks': 'Kepala BNPB diminta menyetujui daftar flagship (termasuk status Telkom University), menunjuk unit pasangan, dan mengizinkan penjajakan calon mitra dengan uji tuntas.'},
    'sumber': R4 + '; ' + BS + '; PMK 114/2025',
})

# ------------------------------------------------------------------ Bagian 1
S.append({'jenis': 'pembatas-seksi', 'bagian': 1})

S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan',
    'pesan': 'Paparan sebelumnya belum punya proyek bernama dan memperlakukan swasta hanya sebagai sumber dana',
    'judul': 'Paparan sebelumnya memuat {{angka:rev4.program}} program dalam {{angka:rev4.pilar}} pilar, tetapi program masih berupa wadah dan swasta hanya hadir sebagai sumber dana',
    'rasio': 0.68,
    'utama': {'judul': 'Dari wadah program ke proyek bernama', 'ikon': 'ringkasan',
              'banding': {'kiri': {'judul': 'Paparan sebelumnya'}, 'kanan': {'judul': 'Usulan flagship'},
                          'baris': [
                              {'label': 'Bentuk program', 'kiri': 'Wadah: Ruang Inovasi, Simpul riset, Korps Relawan',
                               'kanan': 'Proyek bernama dengan mitra dan target; tiap proyek punya unit BNPB pasangan'},
                              {'label': 'Peran swasta', 'kiri': 'Sumber dana TJSL dan CSR',
                               'kanan': 'Pembawa aset: pabrik, platform, armada, gedung, dan karyawan'},
                              {'label': 'Identitas kampus', 'kiri': 'Semua kampus koordinator menjalankan daftar program yang sama',
                               'kanan': 'Satu flagship per kampus sesuai bahaya regional dan kekuatannya'},
                              {'label': 'Peran kampus', 'kiri': 'Pelaksana riset dan pengabdian',
                               'kanan': 'Penguji dan verifikator yang membuat program swasta dipercaya'},
                              {'label': 'Ukuran hasil', 'kiri': 'Jumlah hibah dan artikel',
                               'kanan': 'Unit terpasang, desa terverifikasi, kit teruji di kejadian nyata'},
                          ]}},
    'panel': {'judul': 'Fondasi yang sudah ada', 'ikon': 'lembaga',
              'angka_besar': kartu_angka('fondasi.csv', [
                  ['Kampus koordinator', 11, 'kampus', 'sepuluh regional dan satu tematik', 'wilayah'],
                  ['Kampus sekitar', 116, 'kampus', 'dibina kampus koordinator', 'sekolah'],
                  ['Mitra pendukung', 14, 'lembaga', 'pusat, daerah, masyarakat, internasional', 'lembaga'],
              ], R4, 'resmi')},
    'sumber': R4,
})

# Model tiga pihak + motif
motif = tulis('motif.csv', ['judul', 'isi', 'ikon'], [
    ['Kewajiban TJSL', 'Dampak terukur untuk laporan', 'regulasi'],
    ['Kelangsungan usaha', 'Pabrik di zona rawan', 'infrastruktur'],
    ['Riset produk', 'Produk diuji di lapangan', 'data'],
    ['Merek', 'Hadir di program negara', 'lembaga'],
    ['Talenta', 'Akses mahasiswa terbaik', 'sekolah'],
    ['Pasar baru', 'Asuransi dan bahan bangunan', 'naik'],
])
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan',
    'pesan': 'Tiap pihak membawa aset yang tidak dimiliki dua pihak lain, dan swasta punya motif sendiri untuk bertahan',
    'judul': 'Tiap pihak dalam flagship membawa aset yang tidak dimiliki pihak lain; {{angka:ide.motif}} motif usaha menjadi alasan swasta ikut',
    'rasio': 0.66,
    'utama': {'judul': 'Yang dibawa tiap pihak ke satu flagship', 'ikon': 'lembaga',
              'kolom_teks': {'mode': 'kartu', 'huruf_maks': 15, 'kolom': kalimat([
                  {'judul': 'Perguruan tinggi', 'ikon': 'sekolah', 'isi': [
                      'Pakar dan laboratorium untuk merancang dan menguji',
                      'Mahasiswa lewat KKN dan magang',
                      'Penilaian independen yang membuat hasil dipercaya',
                      'Jejaring alumni ke daerah dan industri']},
                  {'judul': 'Dunia usaha', 'ikon': 'infrastruktur', 'isi': [
                      'Pabrik dan laboratorium produk untuk produksi massal',
                      'Platform digital milik perusahaan',
                      'Armada dan jaringan distribusi',
                      'Karyawan terlatih dan dana TJSL']},
                  {'judul': 'BNPB', 'ikon': 'regulasi', 'isi': [
                      'Mandat dan standar penanggulangan bencana',
                      'Data DIBI dan InaRISK untuk riset',
                      'Jalur ke BPBD dan pemerintah daerah',
                      'Pengakuan resmi dan panggung nasional']},
              ])}},
    'pita': {'label': 'Contoh di flagship', 'nada': 'data', 'kolom': [
        {'ikon': 'infrastruktur', 'judul': 'Pabrik', 'isi': 'Usulan: industri elektronika memproduksi alat peringatan UGM.'},
        {'ikon': 'sekolah', 'judul': 'Platform', 'isi': 'Usulan: platform VR calon mitra untuk latihan siaga sekolah.'},
        {'ikon': 'tsunami', 'judul': 'Gedung', 'isi': 'Usulan: Unand menilai gedung swasta Padang untuk evakuasi.'}]},
    'panel': {'judul': 'Motif swasta untuk ikut', 'ikon': 'pembiayaan',
              'daftar_ikon': {'mode': 'baris', 'data': D(motif, [{'nama': 'judul'}, {'nama': 'isi'}, {'nama': 'ikon'}], BS, 'penilaian-pakar')}},
    'sumber': BS,
})

# Insentif dan dasar hukum
aturan = tulis('aturan.csv', ['aturan', 'isi', 'manfaat'], [
    ['UU 24/2007 Pasal 28', 'Lembaga usaha ikut menanggulangi bencana', 'Dasar keikutsertaan swasta'],
    ['Perka BNPB Nomor 12 Tahun 2014', 'MoU dan rencana kegiatan bersama mitra', 'Penghargaan BNPB dan laporan publik'],
    ['PMK Nomor 114 Tahun 2025', 'Bencana lewat BNPB; litbang lewat kampus', 'Mengurangi penghasilan bruto'],
    ['PP 45/2019', 'Insentif litbang, proposal ditelaah BRIN', 'Pengurang biaya litbang berlipat'],
    ['Dana Padanan Kemdiktisaintek', 'Kontribusi industri dipadankan negara', 'Dana riset kampus berlipat'],
])
S.append({
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan',
    'pesan': 'Aturan sudah memberi insentif bagi swasta, tetapi pemakaiannya rendah',
    'judul': 'Sumbangan bencana lewat BNPB dan sumbangan litbang ke kampus dapat dikurangkan sampai {{angka:pmk114.batas|persen}} penghasilan neto, tetapi insentif litbang baru dipakai sekitar {{angka:sd.wp}} wajib pajak',
    'rasio': 0.7,
    'tabel': {'judul_panel': 'Dasar hukum dan insentif bagi mitra swasta', 'ikon': 'regulasi', 'peringkat': False, 'sel_dua_baris': True, 'sel_maks_baris': 3, 'skala_huruf': 1.55, 'baris_maks_pt': 64,
              'data': D(aturan, [{'nama': 'aturan', 'kepala': 'Aturan'}, {'nama': 'isi', 'kepala': 'Isi'},
                                 {'nama': 'manfaat', 'kepala': 'Manfaat bagi mitra'}], 'JDIH BNPB; JDIH Kementerian Keuangan; Kemdiktisaintek', 'resmi')},
    'panel': {'judul': 'Skala insentif dan dana', 'ikon': 'pembiayaan',
              'angka_besar': kartu_angka('insentif.csv', [
                  ['Insentif litbang', 300, '%', 'pengurang penghasilan bruto, paling tinggi', 'naik'],
                  ['Dana Padanan 2024', 750, 'miliar rupiah', 'anggaran tahun 2024 untuk kampus', 'pembiayaan'],
                  ['Pemakai insentif litbang', 30, 'wajib pajak', 'menurut Menteri Keuangan, 2024', 'lembaga'],
              ], 'DDTC News 2024; Infobanknews 2024')},
    'sumber': 'PMK 114/2025 Pasal 4; PP 45/2019 dan PMK 81/2024 (DDTC News, 2024); Perka BNPB 12/2014; Kemdiktisaintek',
})

# Corong ide
corong = tulis('corong.csv', ['tahap', 'jumlah'], [['Ide terkumpul dan dinilai', 53], ['Masuk tabel nilai', 24], ['Lolos ambang', 17]])
gugus = tulis('gugus.csv', ['gugus', 'ide'], [
    ['Edukasi dan literasi', 7], ['Peringatan dini', 7], ['Logistik kemanusiaan', 6], ['Talenta dan relawan', 6],
    ['Data dan AI', 5], ['Hunian dan bangunan', 5], ['Kesehatan darurat', 5], ['Tata kelola', 5],
    ['Ekonomi dan pemulihan', 4], ['Solusi berbasis alam', 3]])
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan',
    'pesan': 'Ide dicari luas dulu lalu disaring ketat',
    'judul': 'Sebanyak {{angka:ide.total}} ide dinilai dengan {{angka:ide.kriteria}} kriteria; {{angka:ide.dinilai}} ide meraih {{angka:skor.tabel}} poin ke atas dan {{angka:ide.lolos}} ide lolos ambang {{angka:skor.ambang}} poin',
    'rasio': 0.55,
    'utama': {'judul': 'Penyaringan ide program', 'ikon': 'data',
              'corong': {'data': D(corong, [{'nama': 'tahap'}, {'nama': 'jumlah', 'fmt': '0'}], BS, 'penilaian-pakar'),
                         'keterangan_persen': 'dari ide terkumpul'}},
    'panel': {'judul': 'Jumlah ide per gugus', 'ikon': 'ringkasan',
              'lollipop': {'data': D(gugus, [{'nama': 'gugus'}, {'nama': 'ide', 'kepala': 'Ide', 'fmt': '0'}], BS, 'penilaian-pakar')}},
    'pita': {'label': 'Cara menyaring', 'nada': 'data', 'kolom': [
        {'ikon': 'regulasi', 'judul': 'Kebutuhan BNPB', 'isi': 'Menjawab kebutuhan unit di paparan sebelumnya.'},
        {'ikon': 'naik', 'judul': 'Dampak dan kesiapan', 'isi': 'Skala manfaat besar; prototipe sudah ada.'},
        {'ikon': 'pembiayaan', 'judul': 'Daya tarik swasta', 'isi': 'Perusahaan mendapat manfaat balik terukur.'},
        {'ikon': 'peringatan', 'judul': 'Risiko rendah', 'isi': 'Risiko reputasi dan konflik kepentingan kecil.'}]},
    'sumber': BS,
})

# Heatmap skor
skor = tulis('skor.csv', ['ide', 'K', 'D', 'S', 'B', 'R'], [
    ['Alat kampus diproduksi massal', 'Penuh', 'Penuh', 'Tinggi', 'Penuh', 'Penuh'],
    ['Sekolah Siaga VR', 'Tinggi', 'Penuh', 'Penuh', 'Tinggi', 'Penuh'],
    ['Rumah tahan gempa di toko bangunan', 'Penuh', 'Penuh', 'Penuh', 'Tinggi', 'Tinggi'],
    ['Kit martabat berbasis riset', 'Tinggi', 'Tinggi', 'Penuh', 'Tinggi', 'Penuh'],
    ['Kaji cepat hari pertama', 'Penuh', 'Tinggi', 'Tinggi', 'Tinggi', 'Penuh'],
    ['Gedung swasta jadi tempat evakuasi', 'Penuh', 'Penuh', 'Tinggi', 'Tinggi', 'Tinggi'],
    ['Relawan karyawan dan mahasiswa', 'Tinggi', 'Tinggi', 'Penuh', 'Tinggi', 'Penuh'],
    ['Kapal tanggap bencana kepulauan', 'Penuh', 'Tinggi', 'Tinggi', 'Tinggi', 'Penuh'],
    ['Sensor gempa di gedung swasta', 'Tinggi', 'Tinggi', 'Penuh', 'Tinggi', 'Penuh'],
    ['Desa bebas api berinsentif', 'Penuh', 'Penuh', 'Tinggi', 'Penuh', 'Cukup'],
    ['Tim medis darurat kampus', 'Penuh', 'Tinggi', 'Tinggi', 'Tinggi', 'Penuh'],
    ['Gudang bersama dan stok siaga', 'Penuh', 'Tinggi', 'Tinggi', 'Cukup', 'Penuh']])
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan',
    'pesan': 'Ide dengan nilai tertinggi memakai aset swasta selain dana dan memberi swasta manfaat balik',
    'judul': 'Ide bernilai tertinggi, {{angka:skor.tertinggi}} dari {{angka:skor.maks}} poin, memindahkan alat kampus dari percontohan ke produksi massal bersama industri',
    'rasio': 0.62,
    'utama': {'judul': 'Nilai dua belas ide teratas per kriteria', 'ikon': 'data', 'subjudul_grafik': 'Nilai per kriteria: kebutuhan BNPB, dampak, daya tarik swasta, kesiapan, risiko rendah',
              'heatmap': {'mode': 'kategori', 'ramp': 'netral', 'kelas': [
                  {'kunci': 'Cukup', 'label': 'Cukup, tiga poin'}, {'kunci': 'Tinggi', 'label': 'Tinggi, empat poin'}, {'kunci': 'Penuh', 'label': 'Penuh, lima poin'}],
                          'data': D(skor, [{'nama': 'ide'}, {'nama': 'K', 'kepala': 'Butuh'},
                                           {'nama': 'D', 'kepala': 'Dampak'}, {'nama': 'S', 'kepala': 'Swasta'},
                                           {'nama': 'B', 'kepala': 'Siap'}, {'nama': 'R', 'kepala': 'Aman'}], BS, 'penilaian-pakar')}},
    'panel': {'judul': 'Pola dari penyaringan', 'ikon': 'ringkasan', 'daftar': [
        'Nilai tertinggi {{angka:skor.tertinggi}} dari {{angka:skor.maks}} poin: alat kampus diproduksi massal bersama industri.',
        'Ide terkuat memakai aset swasta selain uang: pabrik, platform, gedung, armada, dan karyawan.',
        'Ide terkuat memberi swasta manfaat balik, sehingga kerja sama bertahan setelah satu tahun anggaran.',
        'Kampus berperan sebagai penguji dan verifikator, pagar dari program yang hanya pencitraan.',
        'Desa bebas api bernilai tinggi tetapi butuh pagar reputasi karena sebagian konsesi tersanksi.']},
    'sumber': BS + ', poin satu sampai lima per kriteria',
})

# ------------------------------------------------------------------ Bagian 2 (revisi r2: rapor juri 2 Nov 2026)
S.append({'jenis': 'pembatas-seksi', 'bagian': 2})

NAMA = {'USK': 'Lumbung Siaga Aceh', 'Unand': 'Padang Siap Megathrust', 'UI': 'Korps Siaga Korporat',
        'ITB': 'Lab Inovasi Kemanusiaan', 'Tel-U': 'Sekolah Siaga Imersif', 'UGM': 'EWS Produksi Massal',
        'ITS': 'Kapal Tanggap Bencana', 'Unram': 'Rumah Tahan Gempa', 'ULM': 'Desa Lahan Basah Tangguh',
        'Unhas': 'Sulawesi Aman Bangun', 'Unpatti': 'Pulau Siaga Terhubung', 'IPB': 'Desa Bebas Api Terverifikasi'}

REG = {
    'Aceh': 9, 'Sumatera Utara': 9,
    'Sumatera Barat': 18, 'Riau': 18, 'Kepulauan Riau': 18, 'Jambi': 18, 'Sumatera Selatan': 18, 'Kep. Bangka Belitung': 18,
    'Bengkulu': 18, 'Lampung': 18,
    'DKI Jakarta': 5, 'Banten': 5, 'Jawa Barat': 10, 'Jawa Tengah': 13, 'DI Yogyakarta': 13, 'Jawa Timur': 16,
    'Bali': 8, 'Nusa Tenggara Barat': 8, 'Nusa Tenggara Timur': 8,
    'Kalimantan Barat': 15, 'Kalimantan Tengah': 15, 'Kalimantan Selatan': 15, 'Kalimantan Timur': 15, 'Kalimantan Utara': 15,
    'Sulawesi Utara': 14, 'Gorontalo': 14, 'Sulawesi Tengah': 14, 'Sulawesi Barat': 14, 'Sulawesi Selatan': 14, 'Sulawesi Tenggara': 14,
    'Maluku': 8, 'Maluku Utara': 8, 'Papua': 8, 'Papua Barat': 8, 'Papua Barat Daya': 8, 'Papua Tengah': 8, 'Papua Pegunungan': 8,
    'Papua Selatan': 8}
peta = tulis('kampus_sekitar.csv', ['provinsi', 'kampus'], sorted(REG.items()))
daftar_fs = tulis('daftar_flagship.csv', ['kampus', 'flagship'], [[k + (' (usulan)' if k == 'Tel-U' else ''), v] for k, v in NAMA.items()])
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan',
    'pesan': 'Flagship tersebar di semua regional dan bisa ditiru kampus sekitar',
    'judul': 'Dua belas flagship dipimpin {{angka:rev4.koordinator}} kampus koordinator dan Telkom University, dan dapat ditiru {{angka:rev4.sekitar}} kampus di sekitarnya',
    'rasio': 0.56,
    'utama': {'judul': 'Kampus koordinator dan kampus sekitar yang dibina', 'ikon': 'wilayah',
              'peta': {'mode': 'titik', 'skala': 'netral', 'satuan': 'Kampus sekitar', 'label': 10,
                       'data': D(tulis('titik_kampus.csv', ['kampus', 'sekitar', 'lon', 'lat'], [
                           ['USK', 9, 95.37, 5.57], ['Unand', 18, 100.46, -0.91], ['UI', 5, 106.83, -6.36], ['ITB', 10, 107.61, -6.89],
                           ['UGM', 13, 110.38, -7.77], ['ITS', 16, 112.79, -7.28], ['Unram', 8, 116.10, -8.59], ['ULM', 15, 114.59, -3.30],
                           ['Unhas', 14, 119.49, -5.13], ['Unpatti', 8, 128.22, -3.66]]),
                           [{'nama': 'kampus'}, {'nama': 'sekitar', 'kepala': 'Kampus sekitar', 'fmt': '0'},
                            {'nama': 'lon', 'fmt': '2'}, {'nama': 'lat', 'fmt': '2'}], R4, 'resmi')}},
    'panel': {'judul': 'Nama flagship tiap kampus', 'ikon': 'sekolah', 'skala_huruf': 1.2, 'baris_maks_pt': 40,
              'data': D(daftar_fs, [{'nama': 'kampus', 'kepala': 'Kampus'}, {'nama': 'flagship', 'kepala': 'Flagship'}], BS, 'asumsi-kebijakan')},
    'sumber': R4 + '; ' + BS,
})

# Jembatan ide ke kampus
jembatan = tulis('jembatan.csv', ['kampus', 'bahaya', 'bukti', 'ide'], [
    ['USK', 'Tsunami dan banjir', 'Satgas Senyar, pelacak logistik', 'Gudang bersama dan stok siaga (E1)'],
    ['Unand', 'Megathrust Mentawai', 'Pusat unggulan BNPB', 'Gedung jadi tempat evakuasi (D3)'],
    ['UI', 'Banjir kota', 'DRRC berkontrak dengan industri', 'Relawan karyawan (H1)'],
    ['ITB', 'Gempa dan longsor', 'Farmasi ITB, Labtek XV', 'Kit martabat (E4)'],
    ['Tel-U', 'Gempa dan banjir', 'Laboratorium VR, Flood Eye', 'Sekolah Siaga VR (A1)'],
    ['UGM', 'Longsor', 'GAMA-EWS berstandar ISO', 'Alat diproduksi massal (B1)'],
    ['ITS', 'Kepulauan, gunung api', 'Perkapalan, RS Kapal Unair', 'Kapal kepulauan (E2)'],
    ['Unram', 'Gempa', 'Pascagempa Lombok', 'Rumah tahan gempa (D1)'],
    ['ULM', 'Banjir dan kebakaran rawa', 'Lahan basah dan mangrove', 'Sabuk hijau dan lahan basah (I1)'],
    ['Unhas', 'Gempa dan likuefaksi', 'Riset likuefaksi Palu', 'Daftar panjang: peta kota rawan (C4)'],
    ['Unpatti', 'Tsunami, pulau kecil', 'Riset tsunami Ambon', 'Daftar panjang: sirene dan pesan (B7, B3)'],
    ['IPB', 'Karhutla dan gambut', 'FFEWS di Muaro Jambi', 'Desa bebas api (G4)']])
S.append({
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan',
    'pesan': 'Flagship dipilih dari ide lolos menurut bahaya regional dan bukti kampus',
    'judul': 'Sepuluh flagship diambil dari {{angka:ide.lolos}} ide lolos; flagship Sulawesi serta Maluku diambil dari daftar panjang karena bahayanya belum terjawab',
    'tabel': {'judul_panel': 'Dari ide lolos ke kampus', 'ikon': 'sekolah', 'peringkat': False, 'skala_huruf': 1.25, 'baris_maks_pt': 40,
              'data': D(jembatan, [{'nama': 'kampus', 'kepala': 'Kampus'}, {'nama': 'bahaya', 'kepala': 'Bahaya utama regional'},
                                   {'nama': 'bukti', 'kepala': 'Bukti yang sudah ada'}, {'nama': 'ide', 'kepala': 'Ide terpilih (kode)'}],
                        BS + '; riset web BNPB', 'penilaian-pakar')},
    'pita': {'label': 'Aturan pemilihan', 'nada': 'data', 'kolom': [
        {'ikon': 'wilayah', 'judul': 'Cocok bahaya regional', 'isi': 'Ide lolos dipakai bila menjawab bahaya utama regional kampus itu.'},
        {'ikon': 'satu-data', 'judul': 'Ide lolos lainnya', 'isi': 'A5 dan C3 jadi program lintas; B2, B5, E5, F1, G1 jadi pendukung.'},
        {'ikon': 'peringatan', 'judul': 'Pengecualian', 'isi': 'Sulawesi dan Maluku memakai daftar panjang; dinilai ulang saat percontohan.'}]},
    'sumber': BS + '; riset web BNPB, 2 Nov 2026; kode ide di Lampiran A1',
})

# Pagar sebelum seri flagship
pagar = tulis('pagar.csv', ['judul', 'isi', 'ikon'], [
    ['Uji tuntas sebelum MoU', 'Sanksi dan perkara diperiksa; afiliasi diumumkan', 'regulasi'],
    ['Tema tidak bersinggungan', 'Tambang tidak untuk banjir di DAS yang sama', 'banjir'],
    ['Sanksi kebakaran aktif', 'Tidak menjadi mitra karhutla selama sanksi berlaku', 'karhutla'],
    ['Tembakau', 'Tidak diajukan sebagai calon mitra', 'kesehatan'],
    ['Tanpa merek produk', 'Pada materi anak dan barang bantuan negara', 'sekolah'],
    ['Penerima inklusif', 'Walau dana lewat zakat atau yayasan', 'jiwa'],
    ['Laporan publik', 'Tiap tahun, kampus sebagai penilai hasil', 'data']])
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan',
    'pesan': 'Semua calon mitra di slide berikut wajib lolos uji tuntas dulu',
    'judul': 'Semua calon mitra di slide berikut wajib lolos {{angka:pagar.jumlah}} syarat uji tuntas, karena {{angka:sanksi.2026}} perusahaan dikenai sanksi atas kebakaran 2026',
    'rasio': 0.62,
    'utama': {'judul': 'Syarat mitra dalam MoU', 'ikon': 'peringatan',
              'daftar_ikon': {'mode': 'baris', 'data': D(pagar, [{'nama': 'judul'}, {'nama': 'isi'}, {'nama': 'ikon'}], BS, 'asumsi-kebijakan')}},
    'panel': {'judul': 'Mengapa pagar perlu', 'ikon': 'peringatan',
              'angka_besar': kartu_angka('pagar_angka.csv', [
                  ['Perusahaan disanksi', 32, 'perusahaan', 'atas kebakaran 2026, Kemenhut', 'regulasi'],
                  ['Perusahaan ditandai', 335, 'perusahaan', 'kebakaran di konsesi 2026, KLH', 'karhutla']],
                  'Kementerian Kehutanan lewat Katadata, 19 Okt 2026; KLH dikutip media, 24 Agt 2026')},
    'pita': {'label': 'Cara menerapkan', 'nada': 'data', 'kolom': [
        {'ikon': 'regulasi', 'judul': 'Lampiran MoU', 'isi': 'Tujuh syarat menjadi lampiran baku tiap MoU flagship.'},
        {'ikon': 'data', 'judul': 'Status calon mitra', 'isi': 'Semua mitra di slide flagship berstatus calon sampai lolos uji.'},
        {'ikon': 'peringatan', 'judul': 'Bila dilanggar', 'isi': 'Kerja sama ditunda sampai sanksi atau sengketa selesai.'}]},
    'sumber': 'Kementerian Kehutanan lewat Katadata, 19 Okt 2026; KLH dikutip media, 24 Agt 2026; PP 28/2024',
})


LOGO = {k: f'foto/logo/{k.lower()}.png' for k in ['USK', 'Unand', 'UI', 'ITB', 'Tel-U', 'UGM', 'ITS', 'Unram', 'ULM', 'Unhas', 'Unpatti', 'IPB']}


def logo(kampus):
    return {'logo_kampus': LOGO[kampus]} if kampus in LOGO else {}


def peran(kolom):
    return {'label': 'Usulan peran, belum dijajaki', 'nada': 'data', 'kolom': [{'ikon': i, 'judul': j, 'isi': t} for i, j, t in kolom]}


def pita_pendukung(kolom):
    return {'label': 'Program pendukung', 'nada': 'aksi', 'kolom': [{'ikon': i, 'judul': j, 'isi': t} for i, j, t in kolom]}


def fs_alur(kampus, judul, pesan, kolom, panel_judul, kartu_csv, kartu_baris, kartu_sumber, pendukung, sumber, jenis_slide='grafik', ikon='lembaga'):
    """Pola F1: alur usulan tiga pihak + angka bukti + pita pendukung."""
    return {'jenis': 'temuan-visual', 'jenis_slide': jenis_slide, 'judul_bentuk': 'temuan', 'pesan': pesan, 'judul': judul,
            'rasio': 0.68, **logo(kampus),
            'utama': {'judul': f'{NAMA[kampus]}: usulan peran, belum dijajaki', 'ikon': ikon,
                      'alur': {'sorot': 1, 'skala_huruf': 1.75, 'langkah': [{'judul': j, 'butir': b} for j, b in kolom]}},
            'panel': {'judul': panel_judul, 'ikon': 'naik', 'angka_besar': kartu_angka(kartu_csv, kartu_baris, kartu_sumber)},
            'pita': pita_pendukung(pendukung), 'sumber': sumber}


def fs_tabel(kampus, judul, pesan, baris, panel_judul, kartu_csv, kartu_baris, kartu_sumber, pendukung, sumber, ikon='lembaga', jenis_slide='tabel'):
    """Pola F2: tabel usulan peran + angka bukti + pita pendukung."""
    c = tulis(f'peran_{kampus.lower().replace("-", "")}.csv', ['pihak', 'membawa', 'hasil'], baris)
    return {'jenis': 'tabel-peringkat', 'jenis_slide': jenis_slide, 'judul_bentuk': 'temuan', 'pesan': pesan, 'judul': judul,
            'rasio': 0.68, **logo(kampus),
            'tabel': {'judul_panel': f'{NAMA[kampus]}: usulan peran, belum dijajaki', 'ikon': ikon, 'peringkat': False,
                      'sel_dua_baris': True, 'sel_maks_baris': 3, 'skala_huruf': 1.6, 'baris_maks_pt': 64,
                      'data': D(c, [{'nama': 'pihak', 'kepala': 'Pihak'}, {'nama': 'membawa', 'kepala': 'Usulan peran'},
                                    {'nama': 'hasil', 'kepala': 'Usulan hasil 2027'}], sumber, 'asumsi-kebijakan')},
            'panel': {'judul': panel_judul, 'ikon': 'naik', 'angka_besar': kartu_angka(kartu_csv, kartu_baris, kartu_sumber)},
            'pita': pita_pendukung(pendukung), 'sumber': sumber}


def fs_banding(kampus, judul, pesan, baris, panel_judul, kartu_csv, kartu_baris, kartu_sumber, pendukung, sumber, ikon='lembaga', jenis_slide='panel'):
    """Pola F3: sekarang lawan usulan flagship + angka bukti + pita pendukung."""
    return {'jenis': 'temuan-visual', 'jenis_slide': jenis_slide, 'judul_bentuk': 'temuan', 'pesan': pesan, 'judul': judul,
            'rasio': 0.68, **logo(kampus),
            'utama': {'judul': f'{NAMA[kampus]}: usulan, belum dijajaki', 'ikon': ikon,
                      'banding': {'kiri': {'judul': 'Sekarang'}, 'kanan': {'judul': 'Usulan flagship'},
                                  'baris': [{'label': a, 'kiri': b, 'kanan': c} for a, b, c in baris]}},
            'panel': {'judul': panel_judul, 'ikon': 'naik', 'angka_besar': kartu_angka(kartu_csv, kartu_baris, kartu_sumber)},
            'pita': pita_pendukung(pendukung), 'sumber': sumber}


# 1. USK
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'logo_kampus': LOGO['USK'],
    'pesan': 'Pengalaman logistik USK dijadikan stok siaga tetap',
    'judul': 'USK memantau logistik Siklon Senyar di {{angka:usk.posko}} dari {{angka:aceh.kab}} kabupaten/kota Aceh; Lumbung Siaga Aceh diusulkan menjadikannya stok siaga tetap',
    'rasio': 0.5,
    'utama': {'judul': 'Kabupaten/kota yang logistiknya dipantau USK', 'ikon': 'pengungsi',
              'angka_besar': {'mode': 'cincin', 'data': D(tulis('usk_cincin.csv', ['label', 'nilai', 'dari', 'satuan', 'ket'], [
                  ['Dipantau lewat WebGIS USK', 7, 23, 'kabupaten/kota', 'tujuh posko aktif dan tujuh dapur umum, Nov 2025']]),
                  [{'nama': 'label'}, {'nama': 'nilai', 'kepala': 'Posko', 'fmt': '0'}, {'nama': 'dari', 'kepala': 'Aceh', 'fmt': '0', 'peran': 'dari'},
                   {'nama': 'satuan', 'peran': 'satuan'}, {'nama': 'ket', 'peran': 'ket'}], 'Good News From Indonesia; Kemendagri', 'terverifikasi')}},
    'panel': {'judul': 'Bukti saat Senyar', 'ikon': 'naik', 'angka_besar': kartu_angka('usk.csv', [
        ['Relawan dan mitra satgas', 120, 'orang', 'hadir di temu satgas, Feb 2026', 'jiwa'],
        ['Air bersih calon mitra', 25000, 'liter per hari', 'Medco, banjir Aceh 2025', 'air-baku']], 'TDMRC USK, 12 Feb 2026; MedcoEnergi')},
    'pita': peran([('sekolah', 'USK (TDMRC)', 'Menghitung stok siaga dan lokasi gudang dari data Senyar.'),
                   ('infrastruktur', 'Calon mitra', 'Medco: pengolah air; Telkomsel: koneksi posko.'),
                   ('regulasi', 'BNPB', 'Standar stok siaga, sambung ke gudang regional.')]),
    'sumber': 'TDMRC USK, 12 Feb 2026; Good News From Indonesia; Kemendagri; ' + BS,
})

# 2. Unand
S.append(fs_banding(
    'Unand',
    'Cetak biru megathrust Unand dan Pegadaian dengan {{angka:unand.komponen}} komponen diserahkan ke Wali Kota Padang; flagship diusulkan melaksanakannya mulai dari tempat evakuasi',
    'Cetak biru sudah ada; yang belum adalah pelaksanaan',
    [('Cetak biru', 'Diserahkan ke Wali Kota Padang, Juni 2026', 'Dilaksanakan dengan target gedung dan masjid tiap kelurahan'),
     ('Tempat evakuasi', 'Gedung dan masjid belum dinilai kelayakan strukturnya', 'Dinilai Unand dan ditetapkan BPBD sebagai tempat evakuasi resmi'),
     ('Biaya', 'Belum ada pembagian biaya', 'Diusulkan: Pegadaian dan pemilik gedung membiayai rambu dan latihan'),
     ('Latihan', 'Belum ada latihan skala kota', 'Latihan evakuasi kota tiap tahun bersama warga')],
    'Dasar yang sudah ada', 'unand.csv', [
        ['Komponen cetak biru', 5, 'komponen', 'Unand dan Pegadaian, Jun 2026', 'tsunami'],
        ['Kampus sekitar', 18, 'kampus', 'regional Sumatera tengah dan selatan', 'sekolah']],
    'Katadata, 3 Jul 2026; paparan kerja sama perguruan tinggi, 30 Okt 2026',
    [('gempa', 'Hitung rugi megathrust', 'Model kerugian bersama perusahaan reasuransi.'),
     ('banjir', 'Peringatan galodo', 'Memakai alat dari flagship EWS Produksi Massal.'),
     ('sekolah', 'Kampus aman bencana', 'Unand menjadi contoh rencana evakuasi kampus.')],
    'Katadata, 3 Jul 2026; ANTARA, 24 Mei 2026; ' + BS, ikon='tsunami'))

# 3. UI
S.append(fs_alur(
    'UI',
    'Korps Relawan menargetkan {{angka:rev4.relawan2029}} anggota pada 2029; Korps Siaga Korporat diusulkan agar UI dan {{angka:ui.sekitar}} kampus sekitarnya melatih regu karyawan dan mahasiswa',
    'Relawan karyawan sudah banyak tetapi belum terlatih seragam',
    [('UI (DRRC)', ['Kurikulum dan sertifikasi relawan', 'Pengalaman kontrak dengan industri', 'Mahasiswa satu regu dengan karyawan']),
     ('Calon mitra usaha', ['Biaya pelatihan karyawan', 'Regu karyawan siap kirim', 'Perusahaan di Jakarta dan Banten']),
     ('BNPB', ['Mendaftarkan regu gabungan', 'Mengaktifkan saat darurat', 'Data relawan nasional'])],
    'Target dan kampus regional', 'ui.csv', [
        ['Target Korps Relawan', 5000, 'anggota', 'nasional, 2029, paparan sebelumnya', 'jiwa'],
        ['Kampus sekitar UI', 5, 'kampus', 'regional DKI Jakarta dan Banten', 'sekolah']],
    R4,
    [('kesehatan', 'Tim medis darurat', 'FK UI membentuk tim siap kirim berstandar.'),
     ('pembiayaan', 'UMKM bangkit', 'FEB UI bersama bank melatih rencana kelangsungan usaha.'),
     ('telepon', 'Pesan siaga di aplikasi', 'Psikologi UI menguji pesan bersama platform digital.')],
    R4 + '; Antara, 6 Mei 2024; ' + BS, jenis_slide='grafik', ikon='kapasitas'))

# 4. ITB + Paragon
S.append(fs_alur(
    'ITB',
    'Kit kebersihan pengungsi berbasis riset kebutuhan diusulkan dirumuskan Lab Inovasi Kemanusiaan ITB, lalu dibagikan ke {{angka:itb.sekitar}} kampus regional Jawa Barat',
    'Kedekatan ITB dan Paragon diarahkan ke produk bantuan berbasis riset',
    [('ITB', ['Meneliti kebutuhan pengungsi', 'Merumuskan produk di Labtek XV', 'Menguji kit di kejadian nyata']),
     ('Calon: Paragon', ['Memproduksi pembersih tanpa air', 'Menyimpan stok siaga', 'Karyawan relawan menyalurkan']),
     ('BNPB', ['Spesifikasi generik jadi standar', 'Pengadaan tetap terbuka', 'Membuka uji di pengungsian'])],
    'Kampus dan calon mitra', 'itb.csv', [
        ['Kampus regional', 10, 'kampus', 'sekitar ITB di Jawa Barat', 'sekolah'],
        ['Kapasitas kirim calon mitra', 30, 'ton', 'bantuan Paragon ke Sumatera, Des 2025', 'pengungsi']],
    'Paparan kerja sama perguruan tinggi, 30 Okt 2026; Katadata, 19 Des 2025',
    [('sekolah', 'Sekolah Siaga Imersif', 'Bersama Telkom University; slide berikut.'),
     ('gempa', 'Sensor gempa di gedung', 'Seismograf buatan ITB dipasang di gedung swasta.'),
     ('pembiayaan', 'Asuransi bencana daerah', 'ITB sudah bersama DJPK dalam ARISE fiskal.')],
    'Katadata, 19 Des 2025; ITB, 22 Jun 2025 dan 7 Agt 2025; ' + BS, jenis_slide='matriks', ikon='kesehatan'))

# 4b. Tel-U
S.append(fs_tabel(
    'Tel-U',
    'Satu program sekolah aman bencana swasta menjangkau {{angka:spab.sekolah}} sekolah di Yogyakarta dalam dua tahun; Sekolah Siaga Imersif diusulkan membawa latihan VR ke Jawa Barat',
    'Latihan siaga di sekolah belum imersif dan jangkauannya kecil',
    [['ITB', 'Isi ilmiah gempa, longsor, banjir', 'Naskah empat modul'],
     ['Telkom University', 'Konten VR portabel dan fasilitator', 'Modul dan fasilitator'],
     ['Calon mitra Telkom', 'Koneksi sekolah; perangkat lewat pengadaan', 'Sekolah percontohan'],
     ['BNPB', 'Kurikulum sekolah aman bencana', 'Uji hasil belajar']],
    'Modul sekolah yang sudah ada', 'telu.csv', [
        ['Sekolah SPAB', 133, 'sekolah', 'Yogyakarta, 2022 sampai 2024', 'sekolah'],
        ['Peserta SPAB', 21922, 'orang', 'Prudence Foundation dan Plan', 'jiwa']],
    'Media Asuransi News, 29 Agt 2024',
    [('sekolah', 'Modul tiap regional', 'Konten dibuka untuk semua kampus dengan bahaya lokal.'),
     ('banjir', 'Peraga peringatan dini', 'Flood Eye dipakai sebagai alat peraga di sekolah.'),
     ('wilayah', 'Dome Theater Museum ITB', 'Ruang tayang publik untuk film siaga.')],
    'Media Asuransi News, 29 Agt 2024; Telkom University; ' + BS, ikon='sekolah', jenis_slide='tabel'))

# Pertimbangan status Telkom University (rapor juri r4)
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan',
    'pesan': 'Status Telkom University perlu diputuskan dengan pembanding',
    'logo_kampus': ['foto/logo/tel-u.png', 'foto/logo/itb.png'],
    'judul': 'Telkom University berada di regional ITB yang memuat {{angka:itb.sekitar}} kampus sekitar; usulan: memimpin flagship tambahan dengan afiliasi Telkom diumumkan',
    'rasio': 0.66,
    'utama': {'judul': 'Dua pilihan status Telkom University', 'ikon': 'sekolah',
              'banding': {'kiri': {'judul': 'Pilihan A: memimpin flagship tambahan'}, 'kanan': {'judul': 'Pilihan B: pelaksana di bawah ITB'},
                          'baris': [
                              {'label': 'Aset', 'kiri': 'Laboratorium VR dan Flood Eye dipakai penuh', 'kanan': 'Aset tetap dipakai, arah dari ITB'},
                              {'label': 'Afiliasi', 'kiri': 'Hubungan dengan Telkom diumumkan; penilai hasil dari kampus lain', 'kanan': 'Risiko afiliasi lebih kecil karena ITB memimpin'},
                              {'label': 'Koordinasi', 'kiri': 'Dua pemimpin flagship di satu regional', 'kanan': 'Satu pintu koordinasi Jawa Barat'},
                              {'label': 'Kecepatan', 'kiri': 'Lebih cepat, Tel-U memegang anggaran sendiri', 'kanan': 'Mengikuti jadwal koordinasi ITB'},
                              {'label': 'Risiko', 'kiri': 'Telkom juga calon mitra; konflik kepentingan perlu dijaga', 'kanan': 'Aset Tel-U kurang dipakai; beban ITB bertambah'},
                          ]}},
    'panel': {'judul': 'Usulan', 'ikon': 'regulasi', 'daftar': [
        'Pilihan A untuk percontohan 2027: Telkom University punya laboratorium VR dan riset VR gempa.',
        'Syarat: afiliasi dengan Telkom diumumkan dan perangkat dibeli lewat pengadaan terbuka.',
        'Hasil belajar siswa dinilai kampus lain di regional Jawa Barat secara terbuka.',
        'Status dinilai ulang saat perluasan 2028 bersama ITB sebagai koordinator regional.']},
    'sumber': R4 + '; ' + BS,
})



# 5. UGM
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'logo_kampus': LOGO['UGM'],
    'pesan': 'Alat terbukti, skalanya belum',
    'judul': 'GAMA-EWS sudah terpasang di {{angka:ugm.kab}} dari {{angka:ri.kab}} kabupaten/kota; EWS Produksi Massal diusulkan memproduksinya bersama industri',
    'rasio': 0.6,
    'utama': {'judul': 'Kabupaten/kota yang sudah memasang GAMA-EWS', 'ikon': 'longsor',
              'angka_besar': {'mode': 'cincin', 'data': D(tulis('ugm_cincin.csv', ['label', 'nilai', 'dari', 'satuan', 'ket'], [
                  ['Kabupaten/kota dengan GAMA-EWS', 120, 514, 'kabupaten/kota', 'dipasang bersama BNPB dan pemda sampai 2024']]),
                  [{'nama': 'label'}, {'nama': 'nilai', 'kepala': 'Terpasang', 'fmt': '0'}, {'nama': 'dari', 'kepala': 'Indonesia', 'fmt': '0', 'peran': 'dari'},
                   {'nama': 'satuan', 'peran': 'satuan'}, {'nama': 'ket', 'peran': 'ket'}],
                  'International Consortium on Landslides, 24 Nov 2024; Kemendagri', 'terverifikasi')}},
    'panel': {'judul': 'Target dan kampus pendukung', 'ikon': 'longsor', 'angka_besar': kartu_angka('ugm_kartu.csv', [
        ['Usulan target 2029', 1000, 'unit', 'alat buatan industri, standar UGM', 'naik'],
        ['Kampus regional', 13, 'kampus', 'sekitar UGM di Jawa Tengah dan DIY', 'sekolah']], BS + '; ' + R4, 'asumsi-kebijakan')},
    'pita': peran([('sekolah', 'UGM', 'Desain dan standar ISO; menguji unit hasil pabrik.'),
                   ('infrastruktur', 'Calon mitra industri', 'Produksi massal dengan biaya per unit lebih rendah.'),
                   ('regulasi', 'BNPB dan BPBD', 'Menetapkan desa rawan longsor dan banjir bandang.')]),
    'sumber': 'International Consortium on Landslides, 24 Nov 2024; ' + R4 + '; Kemendagri',
})

# 6. ITS
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'logo_kampus': LOGO['ITS'],
    'pesan': 'Wilayah kepulauan butuh kapal yang bisa jadi klinik dan sumber air',
    'judul': 'RS Kapal Unair sudah melayani korban banjir Agam; ITS diusulkan merancang modul klinik siap pasang bersama Unair, salah satu dari {{angka:its.sekitar}} kampus regional',
    'rasio': 0.68,
    'utama': {'judul': 'Kapal Tanggap Bencana: usulan tahapan', 'ikon': 'kalender',
              'linimasa': {'data': D(tulis('its_linimasa.csv', ['kegiatan', 'kelompok', 'mulai', 'selesai', 'tonggak'], [
                  ['Desain modul klinik dan air bersih', 'ITS', 2027, 2027, 2027],
                  ['Bangun modul di galangan calon mitra', 'Calon mitra', 2027, 2028, 2028],
                  ['Uji di satu kapal bersama tim Unair', 'ITS dan Unair', 2028, 2028, 2028],
                  ['Siaga untuk Kepulauan Maluku dan Papua', 'BNPB', 2028, 2029, 2029],
                  ['Sandar di simpul flagship Unpatti', 'BNPB dan Unpatti', 2029, 2029, 2029]]),
                  [{'nama': 'kegiatan'}, {'nama': 'kelompok'}, {'nama': 'mulai', 'fmt': '0|tahun'}, {'nama': 'selesai', 'fmt': '0|tahun'},
                   {'nama': 'tonggak', 'fmt': '0|tahun'}], BS, 'asumsi-kebijakan'),
                  'kepala_kegiatan': 'Kegiatan usulan', 'ket_batang': 'Masa kerja', 'ket_tonggak': 'Hasil yang diukur'}},
    'panel': {'judul': 'Bukti yang sudah ada', 'ikon': 'naik', 'angka_besar': kartu_angka('its.csv', [
        ['Kampus regional', 16, 'kampus', 'sekitar ITS di Jawa Timur, termasuk Unair', 'sekolah'],
        ['Provinsi sasaran', 8, 'provinsi', 'Kepulauan Maluku dan enam provinsi Papua', 'wilayah']],
        'Paparan kerja sama perguruan tinggi, 30 Okt 2026', 'resmi')},
    'pita': peran([('sekolah', 'ITS dan Unair', 'ITS merancang modul klinik; Unair menyiapkan tim medis kapal.'),
                   ('infrastruktur', 'Calon mitra PT PAL', 'Membangun modul di galangan, lini kapal rumah sakit.'),
                   ('regulasi', 'BNPB', 'Mengaktifkan saat darurat dan menjadwalkan siaga musim gelombang.')]),
    'sumber': 'Unair, 13 Des 2025; ' + R4 + '; ' + BS,
})

# 7. Unram
c_ = tulis('peran_unram.csv', ['pihak', 'membawa', 'hasil'], [
    ['Unram dan UII', 'Paket desain dan modul tukang', 'Paket desain baku'],
    ['Calon mitra AMMAN', 'Pelatihan dan sertifikasi tukang', 'Tukang bersertifikat'],
    ['Produsen bahan', 'Paket bahan di jaringan toko', 'Paket tersedia di toko'],
    ['BNPB', 'Desain generik jadi acuan rehabilitasi', 'Diusulkan untuk pemulihan NTT']])
S.append({
    'jenis': 'tabel-peringkat', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'logo_kampus': LOGO['Unram'],
    'pesan': 'Desain rumah tahan gempa belum sampai ke tukang',
    'judul': 'Unram diusulkan menyiapkan paket desain rumah tahan gempa di toko bangunan, untuk ditiru {{angka:unram.sekitar}} kampus regional Bali dan Nusa Tenggara',
    'rasio': 0.64,
    'tabel': {'judul_panel': 'Rumah Tahan Gempa: usulan peran, belum dijajaki', 'ikon': 'rumah', 'peringkat': False,
              'sel_dua_baris': True, 'sel_maks_baris': 3, 'skala_huruf': 1.6, 'baris_maks_pt': 64,
              'data': D(c_, [{'nama': 'pihak', 'kepala': 'Pihak'}, {'nama': 'membawa', 'kepala': 'Usulan peran'},
                             {'nama': 'hasil', 'kepala': 'Usulan hasil 2027'}], BS, 'asumsi-kebijakan')},
    'panel': {'judul': 'Desain yang sudah teruji', 'ikon': 'rumah', 'kolom_foto': 1,
              'foto': [{'berkas': 'foto/barrataga.jpg', 'keterangan': 'BARRATAGA, rumah rakyat tahan gempa (UII)', 'kredit': 'Foto: ANTARA'}]},
    'pita': {'label': 'Dasar yang sudah ada', 'nada': 'data', 'kolom': [
        {'ikon': 'sekolah', 'judul': 'Kampus regional', 'isi': 'Sebanyak {{angka:unram.sekitar}} kampus di Bali dan Nusa Tenggara bisa meniru paket.'},
        {'ikon': 'tanggap-darurat', 'judul': 'Calon mitra', 'isi': 'AMMAN mengirim tim tanggap darurat ke gempa Cianjur 2022.'},
        {'ikon': 'wilayah', 'judul': 'Program pendukung', 'isi': 'Hotel siap tsunami dan sekolah aman Bali; rincian di lampiran.'}]},
    'sumber': R4 + '; AMMAN, 5 Des 2022; ANTARA; ' + BS,
})

# 8. ULM
S.append(fs_alur(
    'ULM',
    'ULM mengelola {{angka:ulm.mangrove|fmt=0}} hektare mangrove; Desa Lahan Basah Tangguh diusulkan memakai pengalaman itu untuk desa rawa di Kalimantan',
    'Kekuatan lahan basah ULM dipakai untuk desa yang rawan dua bahaya',
    [('ULM', ['Memetakan desa rawa rawan', 'Peringatan dini berbasis warga', 'Budidaya tanpa bakar']),
     ('Calon mitra', ['PHKT: melatih regu desa', 'Alat pemadam desa', 'Diperiksa: perkara induk']),
     ('BNPB', ['BPBD menetapkan desa tangguh', 'Data desa ke peringatan dini', 'Perluasan ke lima provinsi'])],
    'Bukti yang sudah ada', 'ulm.csv', [
        ['Mangrove dikelola', 629, 'hektare', 'hutan pendidikan ULM di Kotabaru', 'gelombang-abrasi'],
        ['Provinsi regional', 5, 'provinsi', 'seluruh Kalimantan', 'wilayah']],
    'Antara Kalsel, 2023; paparan kerja sama perguruan tinggi',
    [('sekolah', 'Talenta Kalimantan', 'Beasiswa kebencanaan lewat jalur beasiswa perusahaan yang ada.'),
     ('gelombang-abrasi', 'Sabuk hijau pesisir', 'Mangrove Kotabaru sebagai peredam gelombang.'),
     ('wilayah', 'Dukungan IKN', 'Desa tangguh di sekitar ibu kota baru.')],
    'Antara Kalsel, 2023; ' + BS, jenis_slide='grafik', ikon='banjir'))

# 9. Unhas
S.append(fs_banding(
    'Unhas',
    'Sulawesi Aman Bangun mengusulkan perluasan peta zona likuefaksi dan longsor dari Palu ke wilayah lain bersama {{angka:unhas.sekitar}} kampus regional Sulawesi',
    'Peta bahaya rinci belum masuk tata ruang',
    [('Peta bahaya', 'Peta zona rawan Palu tersedia sesudah 2018', 'Diperluas ke wilayah prioritas lain di Sulawesi'),
     ('Tata ruang', 'Pemakaian peta di daerah lain belum seragam', 'Diusulkan masuk revisi rencana tata ruang'),
     ('Pendanaan', 'Belum ada sumber dana pemetaan', 'Calon mitra di Sulawesi setelah lolos uji tuntas'),
     ('Batas peran mitra', 'Belum ada aturan', 'Mitra tambang tidak dilibatkan pada tema banjir dan DAS')],
    'Bukti yang sudah ada', 'unhas.csv', [
        ['Kampus sekitar', 14, 'kampus', 'regional Sulawesi, termasuk Untad', 'sekolah'],
        ['Provinsi regional', 6, 'provinsi', 'seluruh Sulawesi, bersama Untad', 'wilayah']],
    'Paparan kerja sama perguruan tinggi, 30 Okt 2026',
    [('tanggap-darurat', 'Kaji cepat hari pertama', 'Korps drone mahasiswa Unhas dan Untad.'),
     ('rumah', 'Rumah tahan gempa', 'Memakai paket dari flagship Rumah Tahan Gempa.'),
     ('kesehatan', 'Tim medis FK Unhas', 'Tim siap kirim untuk Sulawesi.')],
    R4 + '; riset web BNPB, 2 Nov 2026; ' + BS, ikon='likuefaksi', jenis_slide='tabel'))

# 10. Unpatti
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan', 'logo_kampus': LOGO['Unpatti'],
    'pesan': 'Pulau kecil terputus saat bencana',
    'judul': 'Pulau Siaga Terhubung diusulkan menyiapkan simpul komunikasi darurat di pulau kecil Maluku dan Papua bersama {{angka:unpatti.sekitar}} kampus regional',
    'rasio': 0.66,
    'utama': {'judul': 'Dasar yang sudah ada di regional Maluku dan Papua', 'ikon': 'wilayah',
              'kisi_ikon': {'kolom': 2, 'sorot': 0, 'skala_huruf': 0.9, 'data': D(tulis('unpatti_kisi.csv', ['label', 'nilai', 'ikon', 'ket'], [
                  ['Kampus regional', 8, 'sekolah', 'termasuk Uncen dan Unkhair'],
                  ['Provinsi regional', 8, 'wilayah', 'Kepulauan Maluku dan Papua'],
                  ['BTS baru calon mitra', 800, 'telepon', 'Telkomsel, 2023'],
                  ['Fakultas tim Masela', 9, 'lembaga', 'bersama INPEX, 2025']]),
                  [{'nama': 'label'}, {'nama': 'nilai', 'fmt': '0'}, {'nama': 'ikon'}, {'nama': 'ket'}],
                  R4 + '; Antara Ambon, 2023 dan 17 Jan 2025', 'terverifikasi')}},
    'panel': {'judul': 'Program pendukung', 'ikon': 'tsunami', 'daftar': [
        'Kembar kampus tsunami: lanjutan riset Ambon bersama TDMRC USK sejak 2022.',
        'Sabuk hijau pulau kecil: mangrove sebagai peredam gelombang.',
        'Tanggap darurat timur: tim perusahaan di Papua sebagai pendukung.']},
    'pita': peran([('sekolah', 'Unpatti', 'Memetakan pulau tanpa jalur darurat; menguji pesan bahasa lokal.'),
                   ('infrastruktur', 'Calon mitra', 'Telkomsel: BTS bergerak; INPEX: dana sirene di Tanimbar.'),
                   ('regulasi', 'BNPB', 'Sambung ke sistem nasional; tetapkan pulau prioritas.')]),
    'sumber': R4 + '; Antara Ambon, 2023 dan 17 Jan 2025; ' + BS,
})

# 11. IPB
S.append(fs_tabel(
    'IPB',
    'Sekitar {{angka:klh.ha}} hektare konsesi terbakar pada 2026; IPB diusulkan menjadi verifikator independen desa bebas api dari program perusahaan',
    'Program desa bebas api swasta butuh penilai independen',
    [['IPB dan Unri', 'Verifikasi independen dan FFEWS', 'Standar verifikasi'],
     ['Calon mitra sawit', 'Insentif desa dan regu pemadam', 'Desa Riau dan Jambi'],
     ['BPBD', 'Mendampingi regu desa', 'Regu desa terlatih'],
     ['BNPB', 'Standar dan data peringatan karhutla', 'Desa tercatat']],
    'Mengapa verifikasi perlu', 'ipb.csv', [
        ['Konsesi terbakar', 85000, 'hektare', 'kebakaran 2026, KLH', 'karhutla'],
        ['Perusahaan ditandai', 335, 'perusahaan', 'kebakaran di konsesi 2026, KLH', 'regulasi']],
    'KLH dikutip media, 24 Agt 2026; Asian Agri, 3 Jul 2024',
    [('kesehatan', 'Udara bersih musim asap', 'Ruang udara bersih sekolah bersama Unri.'),
     ('pengungsi', 'Pangan darurat lokal', 'Dirumuskan kampus pangan IPB.'),
     ('karhutla', 'Gambut basah', 'FFEWS memantau muka air gambut.')],
    'KLH dikutip media, 24 Agt 2026; Asian Agri, 3 Jul 2024; Mongabay, 15 Sep 2026; ' + BS, ikon='karhutla', jenis_slide='tabel'))

lintas = tulis('lintas.csv', ['program', 'isi', 'mitra'], [
    ['Pesan Siaga di Aplikasi', 'Pesan musiman diuji kampus', 'Calon: GoTo, Telkomsel'],
    ['Meja Insentif Mitra', 'Pendampingan pengurang pajak', 'Deputi Sistem dan Strategi'],
    ['Dana Padanan', 'Dana industri dipadankan negara', 'Kemdiktisaintek, LPDP'],
    ['Pintu Dunia Usaha', 'Kapasitas perusahaan dipetakan', 'Calon: Kadin'],
    ['Asuransi Bencana Daerah', 'Pembiayaan risiko aset daerah', 'ITB, DJPK, UNDRR']])
S.append({
    'jenis': 'tabel-peringkat', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan',
    'pesan': 'Lima program dijalankan semua kampus untuk melengkapi flagship',
    'judul': 'Sebanyak {{angka:lintas.jumlah}} program lintas regional melengkapi flagship, dari pesan siaga di aplikasi sampai asuransi bencana daerah',
    'rasio': 0.68,
    'tabel': {'judul_panel': 'Program lintas regional', 'ikon': 'satu-data', 'peringkat': True, 'sel_dua_baris': True, 'sel_maks_baris': 3,
              'skala_huruf': 1.6, 'baris_maks_pt': 64,
              'data': D(lintas, [{'nama': 'program', 'kepala': 'Program'}, {'nama': 'isi', 'kepala': 'Isi'},
                                 {'nama': 'mitra', 'kepala': 'Pihak terkait'}], BS, 'asumsi-kebijakan')},
    'panel': {'judul': 'Kanal yang sudah terbukti', 'ikon': 'telepon',
              'angka_besar': kartu_angka('lintas_angka.csv', [
                  ['Donasi lewat GoPay', 129, 'miliar rupiah', 'sepanjang 2024', 'pembiayaan'],
                  ['Peserta kampanye siaga', 25000, 'orang', 'dilatih PetaBencana bersama BNPB, 2025', 'telepon']],
                  'Bisnis.com, 10 Sep 2025; Yayasan Peta Bencana, 26 Apr 2025')},
    'sumber': 'Bisnis.com, 10 Sep 2025; Yayasan Peta Bencana, 26 Apr 2025; Kabar Bursa, 1 Sep 2026; ' + BS,
})

# ------------------------------------------------------------------ Bagian 3
S.append({'jenis': 'pembatas-seksi', 'bagian': 3})

sd = tulis('sumber_daya.csv', ['judul', 'isi', 'ikon'], [
    ['Sekretariat program', 'Lintas deputi, sesuai rencana 100 hari', 'lembaga'],
    ['Unit pasangan', 'Satu unit penanggung jawab per flagship; satu unit boleh memegang beberapa', 'kapasitas'],
    ['Penghubung kampus', 'Satu dosen per kampus pelaksana flagship', 'sekolah'],
    ['Meja insentif', 'Di Deputi Bidang Sistem dan Strategi', 'pembiayaan'],
    ['Biaya lapangan', 'Dari calon mitra dan dana padanan', 'infrastruktur'],
    ['Biaya koordinasi', 'APBN BNPB, dihitung setelah penjajakan', 'regulasi']])
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan',
    'pesan': 'Kebutuhan sumber daya BNPB untuk tahap percontohan',
    'judul': 'Tahap percontohan butuh satu sekretariat dan unit penanggung jawab per flagship dari {{angka:rev4.unit}} unit BNPB; biaya koordinasi dihitung setelah penjajakan',
    'rasio': 0.64,
    'utama': {'judul': 'Kebutuhan BNPB untuk percontohan', 'ikon': 'kapasitas',
              'daftar_ikon': {'mode': 'baris', 'data': D(sd, [{'nama': 'judul'}, {'nama': 'isi'}, {'nama': 'ikon'}], R4 + '; ' + BS, 'asumsi-kebijakan')}},
    'panel': {'judul': 'Dasar yang sudah ada', 'ikon': 'lembaga',
              'angka_besar': kartu_angka('sd_angka.csv', [
                  ['Unit BNPB berkebutuhan', 6, 'unit', 'dipetakan di paparan sebelumnya', 'lembaga'],
                  ['Kampus koordinator', 11, 'kampus', 'ditambah Telkom University', 'sekolah'],
                  ['Mitra pendukung', 14, 'lembaga', 'pusat, daerah, masyarakat, internasional', 'regulasi']], R4, 'resmi')},
    'pita': {'label': 'Yang belum dihitung', 'nada': 'aksi', 'kolom': [
        {'ikon': 'pembiayaan', 'judul': 'Biaya koordinasi', 'isi': 'Dihitung bersama Biro Perencanaan setelah penjajakan.'},
        {'ikon': 'kapasitas', 'judul': 'Beban kerja unit', 'isi': 'Diukur per unit pasangan pada triwulan pertama.'},
        {'ikon': 'kalender', 'judul': 'Usulan anggaran', 'isi': 'Masuk perencanaan BNPB setelah izin prinsip.'}]},
    'sumber': R4 + '; ' + BS,
})

S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan',
    'pesan': 'Flagship berjalan tiga tahap',
    'judul': 'Flagship berjalan tiga tahap, dari penjajakan 100 hari sampai perluasan ke {{angka:rev4.mitra2028}} kampus mitra pada 2028 dan {{angka:rev4.mitra2029}} kampus pada 2029',
    'utama': {'judul': 'Tahapan flagship', 'ikon': 'kalender',
              'alur': {'sorot': 1, 'label_hasil': 'Hasil', 'langkah': [
                  {'judul': 'Penjajakan 100 hari', 'butir': ['SK tim dan unit pasangan', 'Uji tuntas calon mitra',
                                                             'Surat minat dan rancangan MoU'], 'pelaku': 'BNPB dan kampus koordinator',
                   'hasil': 'Mitra sepakat'},
                  {'judul': 'Percontohan 2027', 'butir': ['Satu lokasi tiap flagship', 'Ukuran hasil disepakati',
                                                          'Laporan publik pertama'], 'pelaku': 'Kampus, mitra, BNPB',
                   'hasil': 'Hasil terukur'},
                  {'judul': 'Perluasan 2028–2029', 'butir': ['Ditiru {{angka:rev4.mitra2028}} lalu {{angka:rev4.mitra2029}} kampus mitra', 'Spesifikasi generik jadi standar BNPB',
                                                                     'Mitra baru lewat pintu dunia usaha'], 'pelaku': 'Kampus sekitar dan BPBD',
                   'hasil': 'Program tetap'}]}},
    'pita': {'label': 'Bila keputusan ditunda', 'nada': 'aksi', 'kolom': [
        {'ikon': 'kalender', 'judul': 'Percontohan mundur', 'isi': 'Lokasi 2027 belum siap sebelum musim kemarau 2027.'},
        {'ikon': 'pembiayaan', 'judul': 'Anggaran mitra lewat', 'isi': 'Rencana TJSL 2027 disusun perusahaan pada akhir 2026.'},
        {'ikon': 'regulasi', 'judul': 'Insentif tak terpakai', 'isi': 'Pengurang pajak dihitung per tahun pajak berjalan.'}]},
    'sumber': R4 + '; ' + BS,
})
# Daftar keputusan: 12 flagship, unit pasangan usulan, ukuran hasil 2027 (rapor juri r6)
dk = tulis('daftar_keputusan.csv', ['kampus', 'flagship', 'unit', 'hasil'], [
    ['USK', 'Lumbung Siaga Aceh', 'Logistik dan Peralatan', 'Satu gudang bersama di Banda Aceh'],
    ['Unand', 'Padang Siap Megathrust', 'Pencegahan', 'Gedung dan masjid zona merah dinilai'],
    ['UI', 'Korps Siaga Korporat', 'Penanganan Darurat', 'Kurikulum dan perusahaan pertama'],
    ['ITB', 'Lab Inovasi Kemanusiaan', 'Logistik dan Peralatan', 'Spesifikasi kit teruji di satu kejadian'],
    ['Tel-U', 'Sekolah Siaga Imersif (bersyarat)', 'Pencegahan', 'Modul dan uji hasil belajar di sekolah'],
    ['UGM', 'EWS Produksi Massal', 'Pencegahan', 'Unit pabrik pertama lolos uji standar'],
    ['ITS', 'Kapal Tanggap Bencana', 'Penanganan Darurat', 'Desain modul, uji di satu kapal'],
    ['Unram', 'Rumah Tahan Gempa', 'Rehabilitasi dan Rekonstruksi', 'Paket desain dan tukang bersertifikat'],
    ['ULM', 'Desa Lahan Basah Tangguh', 'Pencegahan', 'Desa percontohan Kalsel dan Kaltim'],
    ['Unhas', 'Sulawesi Aman Bangun', 'Sistem dan Strategi', 'Peta wilayah prioritas ke pemda'],
    ['Unpatti', 'Pulau Siaga Terhubung', 'Pusdatinkom', 'Peta pulau terputus di Maluku'],
    ['IPB', 'Desa Bebas Api Terverifikasi', 'Penanganan Darurat', 'Standar verifikasi dan desa percontohan']])
S.append({
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan',
    'pesan': 'Daftar flagship yang dimintakan persetujuan',
    'judul': 'Daftar {{angka:fs.jumlah}} flagship yang dimintakan persetujuan, dengan usulan unit BNPB pasangan dan ukuran hasil percontohan 2027',
    'tabel': {'judul_panel': 'Unit pasangan dan ukuran hasil tiap flagship', 'ikon': 'regulasi', 'peringkat': True, 'skala_huruf': 1.2, 'baris_maks_pt': 40,
              'data': D(dk, [{'nama': 'kampus', 'kepala': 'Kampus'}, {'nama': 'flagship', 'kepala': 'Flagship'},
                             {'nama': 'unit', 'kepala': 'Unit pasangan usulan'}, {'nama': 'hasil', 'kepala': 'Ukuran hasil 2027'}], BS, 'asumsi-kebijakan')},
    'sumber': BS + '; unit dari paparan kerja sama perguruan tinggi, 30 Okt 2026',
})

S.append({
    'jenis': 'rekomendasi', 'jenis_slide': 'rekomendasi', 'judul_bentuk': 'temuan', 'keputusan': True,
    'pesan': 'Keputusan Kepala BNPB untuk memulai flagship',
    'judul': 'Sebanyak {{angka:keputusan.kepala}} keputusan diminta dari Kepala BNPB, lalu {{angka:tindak.unit}} tindak lanjut dijalankan unit BNPB untuk memulai flagship',
    'rekomendasi': [
        {'kode': '01', 'jenis': 'regulasi', 'langkah': 'Setujui daftar flagship', 'waktu': '100-hari',
         'rincian': 'Usulan: Telkom University memimpin flagship tambahan; alternatif: pelaksana di bawah koordinasi ITB.',
         'lembaga': ['Kepala BNPB'], 'dasar': 'slide 31', 'risiko': 'Tanpa persetujuan, penjajakan mitra tidak punya mandat resmi.'},
        {'kode': '02', 'jenis': 'kapasitas', 'langkah': 'Tunjuk unit pasangan', 'waktu': '100-hari',
         'rincian': 'Tiap flagship mendapat satu unit BNPB penanggung jawab dan satu penghubung kampus.',
         'lembaga': ['Kepala BNPB'], 'dasar': 'slide 31', 'risiko': 'Flagship tanpa pemilik di BNPB berhenti di MoU.'},
        {'kode': '03', 'jenis': 'regulasi', 'langkah': 'Izinkan penjajakan calon mitra', 'waktu': '100-hari',
         'rincian': 'Penjajakan hanya dengan calon mitra yang lolos tujuh syarat uji tuntas.',
         'lembaga': ['Kepala BNPB'], 'dasar': 'slide 13', 'risiko': 'Mitra bermasalah merusak kepercayaan publik pada BNPB.'},
        {'kode': '04', 'jenis': 'pembiayaan', 'langkah': 'Buka meja insentif mitra', 'waktu': '2026-2027',
         'rincian': 'Membantu perusahaan memakai pengurang pajak: sumbangan bencana lewat BNPB, litbang lewat kampus.',
         'lembaga': ['Deputi Bidang Sistem dan Strategi BNPB'], 'dasar': 'slide 7', 'risiko': 'Tanpa pendampingan, insentif pajak tetap jarang dipakai.'},
        {'kode': '05', 'jenis': 'regulasi', 'langkah': 'Terbitkan pedoman uji tuntas', 'waktu': '100-hari',
         'rincian': 'Tujuh syarat mitra masuk pedoman dan menjadi lampiran tiap MoU.',
         'lembaga': ['Deputi Bidang Sistem dan Strategi BNPB'], 'dasar': 'slide 13', 'risiko': 'Calon mitra dapat menolak bila tawaran hanya meminta dana.'},
        {'kode': '06', 'jenis': 'data', 'langkah': 'Laporan publik tahunan', 'waktu': '2026-2027',
         'rincian': 'Laporan pertama akhir 2027, lalu tiap tahun; hasil diukur kampus dan diumumkan.',
         'lembaga': ['Pusdatinkom BNPB', 'Kampus koordinator'], 'dasar': 'slide 13', 'risiko': 'Tanpa laporan, flagship sulit dipertahankan saat anggaran berganti.'},
    ],
    'sumber': R4 + '; ' + BS,
})

S.append({'jenis': 'penutup', 'layout': 'putih', 'foto': FOTO_KAMPUS, 'kredit': KREDIT_KAMPUS,
          'logo_kanan': 'foto/berakhlak-hd.png',
          'laporan': 'Program Flagship Kerja Sama BNPB dengan Perguruan Tinggi dan Dunia Usaha', 'tanggal_pil': True})

# ------------------------------------------------------------------ Lampiran
S.append({'jenis': 'pembatas-lampiran', 'kelompok': {'A': 'Daftar ide beserta profil mitra'}})

IDE = [
    ('A1', 'Edukasi', 'Sekolah Siaga VR'), ('A2', 'Edukasi', 'Truk simulasi bencana keliling'), ('A3', 'Edukasi', 'Game jam kebencanaan nasional'),
    ('A4', 'Edukasi', 'Buku cerita siaga berbahasa daerah'), ('A5', 'Edukasi', 'Pesan siaga di aplikasi harian'),
    ('A6', 'Edukasi', 'Museum bencana virtual'), ('A7', 'Edukasi', 'Siaga ramah disabilitas'),
    ('B1', 'Peringatan dini', 'Alat kampus diproduksi massal'), ('B2', 'Peringatan dini', 'Sensor gempa di gedung swasta'),
    ('B3', 'Peringatan dini', 'Uji pesan peringatan seluler'), ('B4', 'Peringatan dini', 'Banjir laporan pengemudi'),
    ('B5', 'Peringatan dini', 'Kaji cepat hari pertama'), ('B6', 'Peringatan dini', 'Pemantauan muka air gambut terbuka'),
    ('B7', 'Peringatan dini', 'Sirene sekolah dan rumah ibadah'),
    ('C1', 'Data dan AI', 'Data berbagi untuk kemanusiaan'), ('C2', 'Data dan AI', 'Tantangan Bank Masalah'),
    ('C3', 'Data dan AI', 'Hitung rugi dan asuransi bencana'), ('C4', 'Data dan AI', 'Kembaran digital kota rawan'),
    ('C5', 'Data dan AI', 'Taksir rusak dari foto'),
    ('D1', 'Hunian', 'Rumah tahan gempa di toko bangunan'), ('D2', 'Hunian', 'Sekolah dan puskesmas aman'),
    ('D3', 'Hunian', 'Gedung swasta jadi tempat evakuasi'), ('D4', 'Hunian', 'Hunian sementara modular'), ('D5', 'Hunian', 'Bata dari puing'),
    ('E1', 'Logistik', 'Gudang bersama dan stok siaga'), ('E2', 'Logistik', 'Kapal tanggap bencana kepulauan'),
    ('E3', 'Logistik', 'Bantuan sesuai kebutuhan'), ('E4', 'Logistik', 'Kit martabat berbasis riset'),
    ('E5', 'Logistik', 'Pangan darurat bergizi lokal'), ('E6', 'Logistik', 'Listrik dan air di hari pertama'),
    ('F1', 'Kesehatan', 'Tim medis darurat kampus'), ('F2', 'Kesehatan', 'Pemulihan jiwa anak'),
    ('F3', 'Kesehatan', 'Klinik pengungsian jarak jauh'), ('F4', 'Kesehatan', 'Udara bersih di musim asap'),
    ('F5', 'Kesehatan', 'Wabah setelah banjir'),
    ('G1', 'Ekonomi', 'UMKM bangkit'), ('G2', 'Ekonomi', 'Asesmen ketangguhan kawasan industri'),
    ('G3', 'Ekonomi', 'Asuransi mikro petani dan nelayan'), ('G4', 'Ekonomi', 'Desa bebas api berinsentif'),
    ('H1', 'Talenta', 'Relawan karyawan dan mahasiswa'), ('H2', 'Talenta', 'Beasiswa tangguh'),
    ('H3', 'Talenta', 'Magang ketangguhan usaha'), ('H4', 'Talenta', 'Sertifikasi petugas siaga perusahaan'),
    ('H5', 'Talenta', 'Pusat latihan simulasi regional'), ('H6', 'Talenta', 'Pakar kampus siaga panggil'),
    ('I1', 'Berbasis alam', 'Sabuk hijau pesisir'), ('I2', 'Berbasis alam', 'Gambut basah'), ('I3', 'Berbasis alam', 'Hulu sehat hilir aman'),
    ('J1', 'Tata kelola', 'Perusahaan tangguh bencana'), ('J2', 'Tata kelola', 'Belajar dari bencana'),
    ('J3', 'Tata kelola', 'Dana abadi riset kebencanaan'), ('J4', 'Tata kelola', 'Laporan risiko tahunan'),
    ('J5', 'Tata kelola', 'Kantor hilirisasi inovasi kebencanaan')]
LOLOS = {'B1', 'A1', 'D1', 'E4', 'B5', 'D3', 'H1', 'E2', 'B2', 'G4', 'F1', 'C3', 'E1', 'G1', 'A5', 'I1', 'E5'}
CAD = {'C5', 'J5', 'F4', 'A6', 'J2', 'C1', 'B4'}
ide_csv = tulis('lampiran_ide.csv', ['kode', 'gugus', 'ide', 'status'],
                [[k, g, i, 'Lolos' if k in LOLOS else 'Cadangan' if k in CAD else 'Kegiatan pendukung'] for k, g, i in IDE])
S.append({'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'kode': 'A1',
          'pesan': 'Daftar panjang ide', 'judul': 'Daftar panjang ide program dari brainstorming dan statusnya',
          'judul_daftar': 'Daftar panjang ide',
          'data': D(ide_csv, [{'nama': 'kode', 'kepala': 'Kode'}, {'nama': 'gugus', 'kepala': 'Gugus'},
                              {'nama': 'ide', 'kepala': 'Ide'}, {'nama': 'status', 'kepala': 'Status'}], BS, 'penilaian-pakar'),
          'sumber': BS})

pend = tulis('lampiran_pendukung.csv', ['kampus', 'program', 'isi'], [
    ['USK', 'Belajar dari Senyar', 'Laporan pelajaran tanggap darurat'], ['USK', 'EvaNami dan latihan VR', 'Aplikasi evakuasi tsunami di sekolah pesisir'],
    ['USK', 'Konsorsium kampus', 'Jejaring kampus kebencanaan'],
    ['UI', 'Tim medis darurat', 'Tim FK UI siap kirim'], ['UI', 'UMKM bangkit', 'Rencana kelangsungan usaha bersama bank'],
    ['UI', 'Pesan siaga di aplikasi', 'Pesan diuji Psikologi UI'],
    ['UGM', 'KKN di desa binaan swasta', 'Desa binaan jadi lokasi KKN tematik'], ['UGM', 'Taksir rusak dari foto', 'Model AI kampus'],
    ['UGM', 'Unit tanggap darurat', 'ERU UGM sebagai model satgas'],
    ['Unram', 'Pariwisata tangguh', 'Hotel siap tsunami bersama Unud'], ['Unram', 'Sekolah aman Bali', 'Model provinsi SPAB'],
    ['Unram', 'Asuransi bencana Bali', 'Provinsi uji ARISE fiskal DJPK'],
    ['Unand', 'Hitung rugi megathrust', 'Model kerugian bersama reasuransi'], ['Unand', 'Peringatan galodo', 'Memakai alat EWS Produksi Massal'],
    ['Unand', 'Kampus aman bencana', 'Rencana evakuasi kampus'],
    ['ITB', 'Sensor gempa di gedung', 'Seismograf ITB di gedung swasta'], ['ITB', 'Asuransi bencana daerah', 'ARISE fiskal bersama DJPK'],
    ['Tel-U', 'Modul tiap regional', 'Konten bahaya lokal untuk semua kampus'], ['Tel-U', 'Peraga peringatan dini', 'Flood Eye di sekolah'],
    ['ITS', 'Peringatan lahar Semeru', 'Sensor Puslit MKPI bersama BPBD Jatim'], ['ITS', 'Robot SAR dan logistik', 'Pengembangan RAISA'],
    ['ULM', 'Talenta Kalimantan', 'Beasiswa kebencanaan'], ['ULM', 'Sabuk hijau pesisir', 'Mangrove Kotabaru'],
    ['Unhas', 'Kaji cepat hari pertama', 'Korps drone Unhas dan Untad'], ['Unhas', 'Tim medis FK Unhas', 'Tim siap kirim Sulawesi'],
    ['Unpatti', 'Kembar kampus tsunami', 'Riset Ambon bersama TDMRC USK'], ['Unpatti', 'Sabuk hijau pulau kecil', 'Mangrove peredam gelombang'],
    ['IPB', 'Udara bersih musim asap', 'Ruang udara bersih sekolah bersama Unri'], ['IPB', 'Pangan darurat lokal', 'Kampus pangan IPB'],
    ['IPB', 'Gambut basah', 'FFEWS memantau muka air']])
S.append({'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'kode': 'A2',
          'pesan': 'Program pendukung yang dipindah dari slide flagship', 'judul': 'Program pendukung tiap flagship',
          'judul_daftar': 'Program pendukung flagship', 'maks_baris': 15,
          'data': D(pend, [{'nama': 'kampus', 'kepala': 'Kampus'}, {'nama': 'program', 'kepala': 'Program'}, {'nama': 'isi', 'kepala': 'Isi'}], BS, 'asumsi-kebijakan'),
          'sumber': BS})

mitra = tulis('lampiran_mitra.csv', ['mitra', 'rekam', 'aset', 'periksa'], [
    ['MedcoEnergi', 'Bantuan dan air bersih banjir Aceh, 2025', 'Pengolah air, stok bantuan', 'Uji tuntas standar; belum ada kaitan dengan USK'],
    ['Pegadaian', 'Cetak biru megathrust bersama Unand, 2026', 'Dana pelaksanaan', 'Uji tuntas standar'],
    ['Astra', 'Posko, alat berat, relawan Sumatera, 2025', 'Relawan, armada, desa binaan', 'Uji tuntas standar'],
    ['Bank Mandiri', 'Penyaluran bantuan Sumatera, 2025', 'Relawan, kredit pemulihan', 'Uji tuntas standar'],
    ['ParagonCorp', 'Bantuan Sumatera dan Cianjur; Labtek XV ITB', 'Produk, stok, relawan karyawan', 'Penerima inklusif bila lewat zakat'],
    ['Telkom dan Telkomsel', 'Pemulihan jaringan dan satelit posko, 2025', 'Platform, koneksi, BTS bergerak', 'Status platform VR; afiliasi dengan Tel-U'],
    ['PT Len Industri', 'Industrialisasi alat BMKG', 'Manufaktur alat', 'Belum ada kaitan dengan UGM'],
    ['PT PAL', 'Kerja sama strategis dengan ITS, 2026', 'Galangan kapal', 'Batasi ke lini kapal rumah sakit'],
    ['AMMAN', 'Tim tanggap darurat ke Cianjur, 2022', 'Personel, logistik, dana', 'Uji tuntas standar'],
    ['Pertamina Hulu Kaltim', 'Pelatihan pemadam warga, latihan darurat', 'Pelatihan dan peralatan', 'Perkara hukum induk perusahaan'],
    ['PT Vale Indonesia', 'Hibah alat dan kajian DAS Luwu Utara, 2025', 'Dana, alat berat', 'Kasus Towuti; tidak untuk tema banjir dan DAS'],
    ['INPEX', 'Beasiswa dan laboratorium Masela bersama Unpatti', 'Dana dan sirene', 'Uji tuntas standar'],
    ['GoTo', 'Kanal donasi GoPay Rp129 miliar, 2024', 'Kanal pesan dan donasi', 'Uji tuntas standar'],
    ['Asian Agri, Musim Mas', 'Program desa bebas api', 'Insentif desa, regu', 'Daftar sanksi dan catatan pemasok']],)
S.append({'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'kode': 'A3',
          'pesan': 'Profil dan pagar mitra', 'judul': 'Profil calon mitra swasta beserta pagarnya',
          'judul_daftar': 'Profil calon mitra swasta',
          'data': D(mitra, [{'nama': 'mitra', 'kepala': 'Mitra'}, {'nama': 'rekam', 'kepala': 'Rekam jejak'},
                            {'nama': 'aset', 'kepala': 'Aset dibawa'}, {'nama': 'periksa', 'kepala': 'Yang wajib diperiksa'}],
                    'riset web lima pencari, 2 Nov 2026 (riset.json)', 'terverifikasi'),
          'sumber': 'Riset web BNPB, 2 Nov 2026: situs perusahaan, ANTARA, Katadata, Bisnis.com, Kemenhut, KLH'})

SPEK = {
    '_catatan': 'Program flagship kampus dan dunia usaha, 3 Nov 2026. Dibangun dari spek/bangun_spek_flagship.py. Arah: ikut semua usulan sesi arah (pemilik 2 Nov 2026).',
    'pesan_kunci': 'Tiap kampus koordinator memimpin satu flagship bersama mitra swasta yang rekam jejaknya terbukti; swasta membawa pabrik, platform, armada, dan karyawan, bukan hanya dana.',
    'judul_dokumen': 'Program Flagship Kerja Sama BNPB dengan Perguruan Tinggi dan Dunia Usaha',
    'subjek_dokumen': 'Usulan untuk Kepala BNPB, 3 November 2026',
    'format': 'kajian', 'kajian': 'flagship', 'tanggal': '2026-11-03',
    'bagian': [{'judul': 'Brainstorming dan Penyaringan Ide', 'label': 'Ide'},
               {'judul': 'Flagship Kampus Koordinator', 'label': 'Flagship'},
               {'judul': 'Tata Kelola dan Tindak Lanjut', 'label': 'Tindak lanjut'}],
    'arah': 'Pemilik 2 Nov 2026: ikut semua usulan sesi arah (20 pertanyaan, desain campuran, rekomendasi tambahan).',
    'slide': S,
}

(DATA / 'angka.json').write_text(json.dumps({'angka': ANGKA}, ensure_ascii=False, indent=1), encoding='utf-8')
(AKAR / 'pustaka.json').write_text(json.dumps(PUSTAKA, ensure_ascii=False, indent=1), encoding='utf-8')
(AKAR / 'spek' / 'flagship-031126.json').write_text(json.dumps(SPEK, ensure_ascii=False, indent=1), encoding='utf-8')
print(len(S), 'slide;', len(ANGKA), 'angka;', len(PUSTAKA), 'pustaka')
