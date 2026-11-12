#!/usr/bin/env python3
"""Spek deck "Ajuan Program Flagship Kampus dan Swasta" (3 Nov 2026), analisis berangkat dari kampus.

Menulis data/angka.json, pustaka.json, CSV di data/ks/, lalu spek/kampus-swasta-031126.json.
Sumber isi: repo poskokarhutla data/kegiatan-bnpb/ajuan-program-kampus-021126 (01-analisis-kampus.md, riset.json).
Arah pemilik 2 Nov 2026: "Ikut semua usulan" sesi arah (20 pertanyaan, desain campuran, rekomendasi tambahan 1 sampai 4).
"""
import collections
import csv
import json
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
DATA = AKAR / 'data'
FD = DATA / 'ks'
FD.mkdir(parents=True, exist_ok=True)
DIBI = AKAR.parent / 'proyek-bnpb' / 'data' / 'dibi' / 'rekap_provinsi_tahunan.csv'

# ------------------------------------------------------------------ pustaka
PUSTAKA = []


def P(pid, judul, penulis, tahun, url, tipe='webpage'):
    PUSTAKA.append({'id': pid, 'type': tipe, 'author': [{'literal': penulis}], 'issued': {'date-parts': [[tahun]]},
                    'title': judul, 'URL': url, 'verifikasi': 'sekunder'})


P('rev4', 'Ajuan Program Kerja Sama BNPB dengan Perguruan Tinggi (paparan rev4)', 'Badan Nasional Penanggulangan Bencana', 2026,
  'https://bnpb.go.id', 'report')
P('analisis', 'Analisis ajuan program kampus dan swasta, berangkat dari kampus', 'Badan Nasional Penanggulangan Bencana', 2026,
  'https://bnpb.go.id', 'report')
P('dibi', 'Data dan Informasi Bencana Indonesia (DIBI), rekap provinsi 2016-2025', 'Badan Nasional Penanggulangan Bencana', 2026,
  'https://dibi.bnpb.go.id', 'dataset')
P('tdmrc-flume', 'Tsunami Flume Laboratory', 'TDMRC Universitas Syiah Kuala', 2023, 'https://tdmrc.usk.ac.id/tsunami-flume-laboratory/')
P('usk-medcom', '12 perguruan tinggi bahu-membahu bantu korban banjir', 'Medcom.id', 2025,
  'https://www.medcom.id/pendidikan/news-pendidikan/0KvZWX9K-12-perguruan-tinggi-bahu-membahu-bantu-korban-banjir')
P('usk-logistik', 'USK terima bantuan logistik Kemdiktisaintek untuk respons bencana', 'Good News From Indonesia', 2025,
  'https://www.goodnewsfromindonesia.id/network/content/usk-terima-bantuan-logistik-kemdiktisaintek-untuk-respons')
P('medco', 'MedcoEnergi community development: bantuan banjir Aceh', 'MedcoEnergi', 2025,
  'https://www.medcoenergi.com/en/our-sustainability/social-and-communities/community-development-progr')
P('pema', 'Universitas Syiah Kuala dan PEMA jalin kerja sama kelola hulu migas', 'Kumparan AcehKini', 2024,
  'https://kumparan.com/acehkini/universitas-syiah-kuala-dan-pema-jalin-kerja-sama-kelola-hulu-migas-1y')
P('bsi', 'BSI hadirkan program beasiswa perguruan tinggi di Aceh', 'ANTARA', 2023,
  'https://m.antaranews.com/amp/berita/3726738/bsi-hadirkan-program-beasiswa-perguruan-tinggi-di-aceh')
P('unand-mhs', '400 mahasiswa Unand terjun ke lokasi terdampak banjir', 'Good News From Indonesia', 2026,
  'https://www.goodnewsfromindonesia.id/short/400-mahasiswa-unand-terjun-ke-lokasi-terdampak-banjir-jalankan-tuga')
P('pegadaian', 'Pegadaian dan Universitas Andalas kembangkan model kesiapsiagaan megathrust', 'Katadata', 2026,
  'https://katadata.co.id/berita/nasional/6a4775341ae17/pegadaian-universitas-andalas-kembangkan-model-')
P('hutama', 'Hutama Karya gandeng Unand siapkan SDM sektor infrastruktur', 'Republika', 2026,
  'https://ekonomi.republika.co.id/berita/tgk6kw416/hutama-karya-gandeng-unand-siapkan-sdm-sektor-infra')
P('semenpadang', 'Semen Padang kerahkan alat berat dan personel ke Palembayan', 'Sumbarbisnis', 2025, 'https://www.sumbarbisnis.com/?p=54399')
P('ipb-latih', 'IPB latih pemadam kebakaran gambut lintas negara', 'IPB University', 2025, 'https://www.ipb.ac.id/?p=89138')
P('rfmrc', 'Regional Fire Management Resource Center Southeast Asia', 'RFMRC-SEA', 2017, 'https://rfmrc-sea.org/?p=11')
P('saksi', 'Saksi ahli tergugat dan preseden buruk pelestarian lingkungan', 'Mongabay Indonesia', 2018,
  'https://mongabay.co.id/2018/10/21/saksi-ahli-tergugat-hukum-preseden-buruk-dan-ancaman-pelestarian-lingkungan/')
P('phr', 'Pertamina group synergy deploys over 200 personnel to assist in fire handling', 'Pertamina', 2025,
  'https://pertamina.com/en/news-room/news-release/pertamina-group-synergy-deploys-over-200-personnel-to-assist-i')
P('asianagri', 'Program Desa Bebas Api Asian Agri efektif cegah kebakaran', 'Royal Golden Eagle', 2018,
  'https://www.rgei.com/attachments/article/1050/03.07.18---Program-Desa-Bebas-Api-Asian-Agri-Efektif-Cegah-Kebak')
P('drrc', 'Tim DRRC UI sampaikan temuan kondisi alam Sumatera Barat', 'Antara Megapolitan', 2025,
  'https://megapolitan.antaranews.com/berita/475543/tim-drrc-ui-sampaikan-temuan-kondisi-alam-sumatera-barat')
P('drrc-phr', 'DRRC UI dan Pertamina Hulu Rokan kaji kelola tanggap darurat kebakaran', 'Antara Megapolitan', 2024,
  'https://megapolitan.antaranews.com/berita/288237/drrc-ui-pertamina-hulu-rokan-kaji-kelola-tanggap-darurat-kebakaran')
P('astra', 'Astra continues to provide humanitarian support for disaster', 'PT Astra International Tbk', 2025,
  'https://www.astra.co.id/en/press-release/astra-continues-to-provide-humanitarian-support-for-disaste')
P('mandiri', 'Bank Mandiri percepat penyaluran 67.000 bantuan', 'Bisnis.com', 2025,
  'https://finansial.bisnis.com/read/20251203/90/1933989/bank-mandiri-percepat-penyaluran-67000-bantuan')
P('itb-cianjur', 'ITB initiated eight actions for handling the Cianjur earthquake', 'Institut Teknologi Bandung', 2022,
  'https://itb.ac.id/news/itb-initiated-eights-actions-for-handling-the-cianjur-earthquake/59100')
P('itb-sumatra', 'ITB strengthens post-disaster recovery in Sumatra through humanitarian action', 'Institut Teknologi Bandung', 2026,
  'https://itb.ac.id/news/itb-strengthens-post-disaster-recovery-in-sumatra-through-humanitarian-action-and-cross')
P('agam', 'ITB serahkan program penyediaan air bersih di Agam', 'Antara Megapolitan', 2026,
  'https://megapolitan.antaranews.com/berita/520809/itb-serahkan-program-penyediaan-air-bersih-di-agam-dukung-upa')
P('paragon-sum', 'Sosok Nurhayati Subakat dan bantuan Paragon untuk Sumatra', 'Katadata', 2025,
  'https://katadata.co.id/amp/finansial/korporasi/6944f7fa4e99e/sosok-nurhayati-subakat-perem')
P('labtek', 'ITB, Pertamina, dan Paragon resmikan Gedung Labtek XV', 'Institut Teknologi Bandung', 2025,
  'https://itb.ac.id/berita/itb-pertamina-dan-paragon-resmikan-gedung-labtek-xv-fasilitas-ter')
P('tsel-itb', 'Telkomsel dan ITB resmikan AI Innovation Hub', 'detikInet', 2025,
  'https://inet.detik.com/telecommunication/d-8263210/telkomsel-dan-itb-resmikan-ai-innovation-hub-pertama-di-ind')
P('telkom-cianjur', 'Telkom has distributed 1 billion rupiah in aid for Cianjur', 'PT Telkom Indonesia', 2022,
  'https://aro.telkom.co.id/sites/news-resources/en_US/news/telkom-has-distributed-1-billion-rupiah-in-')
P('telkom-sd', 'Telkom bangun fasilitas SD sementara di Cianjur', 'Selular.ID', 2023,
  'https://selular.id/2023/01/telkom-bangun-fasilitas-sd-sementara-di-cianjur/')
P('telkomsat', 'Pemulihan layanan TelkomGroup di Sumatra', 'Selular.ID', 2025,
  'https://selular.id/2025/12/pemulihan-layanan-telkomgroup-di-sumatra-tembus-80-tim-tambahan')
P('patriot', 'Telkom University supports local governments through climate technology', 'Telkom University', 2024,
  'https://sdgs.telkomuniversity.ac.id/news/telkom-university-supports-local-governments-through-climat')
P('floodeye', 'Flood Eye, riset AI untuk perkuat mitigasi banjir Semarang', 'Katadata', 2026,
  'https://katadata.co.id/digital/teknologi/6a9807321a5df/flood-eye-riset-ai-untuk-perkuat-mitigasi-banjir-semara')
P('icl', 'Progress Report 2024 SEA Network ICL', 'International Consortium on Landslides', 2024,
  'https://landslides.org/wp-content/uploads/2024/11/Progress-Report-2024_SEA-Network-ICL-20241124.pdf')
P('deru', 'DERU UGM dirikan klinik kesehatan di 8 titik pengungsian', 'Universitas Gadjah Mada', 2010,
  'https://ugm.ac.id/id/berita/2785-deru-ugm-dirikan-klinik-kesehatan-di-8-titik-pengungsian/')
P('ugm-100', 'Cooperating with 100 universities, UGM helps reawaken life of people', 'Universitas Gadjah Mada', 2010,
  'https://ugm.ac.id/en/news/5958-cooperating-with-100-private-state-universities-ugm-helps-reawaken-life-of-peop')
P('sidomuncul', 'Sido Muncul tambah donasi untuk korban bencana Sumatera', 'BCA Sekuritas', 2025,
  'https://bcasekuritas.co.id/latest-news/news/sido-muncul-tambah-donasi-rp500-juta-untuk-korban-bencana-di-sumat')
P('bmkg', 'Profil Teuku Faisal Fathani, pemimpin BMKG', 'CNN Indonesia', 2025,
  'https://www.cnnindonesia.com/teknologi/20251104101914-199-1291594/profil-teuku-faisal-fathani-pemimp')
P('its-huntara', 'ITS tuntaskan pembangunan 914 huntara di Lombok', 'Suara Surabaya', 2018,
  'https://www.suarasurabaya.net/kelanakota/2018/ITS-Tuntaskan-Pembangunan-914-Huntara-di-Lombok/')
P('its-kapal', 'Desain rumah sakit terapung di atas KCR 60 m', 'Repositori ITS', 2024, 'https://repository.its.ac.id/112906')
P('ut-huntara', 'United Tractors serahkan 100 unit huntara korban erupsi Semeru', 'Warta Ekonomi', 2022,
  'https://wartaekonomi.co.id/read427818/united-tractors-serahkan-100-unit-huntara-korban-erupsi-gunung-semeru-be')
P('petrokimia', 'Erupsi Gunung Semeru, Petrokimia Gresik langsung bergerak', 'JPNN', 2021,
  'https://www.jpnn.com/news/erupsi-gunung-semeru-petrokimia-gresik-langsung-bergerak')
P('amman', 'AMMAN distributes humanitarian aid to help Cianjur disaster victims', 'PT Amman Mineral Nusa Tenggara', 2022,
  'https://www.amman.co.id/article/amman-distributes-humanitarian-aid-to-help-cianjur-s-disaster-victim')
P('ntb', 'Unram dan Bank NTB Syariah tanda tangani MoU Tri Dharma', 'Universitas Mataram', 2026, 'https://unram.ac.id/en/tag/bank-ntb-en/')
P('benoa', 'Kerja sama pariwisata untuk mitigasi tsunami di Tanjung Benoa', 'Antara Bali', 2023,
  'https://bali.antaranews.com/berita/365822/kerjasama-pariwisata-untuk-mitigasi-tsunami-di-tanjung-benoa')
P('ppiig', 'PPIIG ULM analyzes factors causing floods in South Kalimantan', 'Universitas Lambung Mangkurat', 2025,
  'https://ulm.ac.id/en/2025/02/01/ppiig-ulm-analyzes-factors-causing-floods-in-south-kalimantan/')
P('pln', 'PLN pulihkan 1.036 gardu terdampak banjir di Kalimantan Selatan', 'CNBC Indonesia', 2021,
  'https://www.cnbcindonesia.com/news/20210118100323-4-216736/pln-pulihkan-1036-gardu-terdampak-banjir-di-kaliman')
P('ulm-mangrove', 'ULM kelola 629 hektare mangrove kembangkan hutan pendidikan', 'Antara Kalsel', 2023,
  'https://kalsel.antaranews.com/berita/388038/ulm-kelola-629-hektare-mangrove-kembangkan-hutan-pendidi')
P('masmindo', 'Masmindo Dwi Area gandeng Unhas untuk mitigasi bencana', 'Bisnis.com', 2024,
  'https://ekonomi.bisnis.com/read/20240717/44/1783182/masmindo-dwi-area-gandeng-unhas-mitigasi-bencana')
P('kalla', 'Inauguration of the Kalla dormitory for FT-UH students', 'Fakultas Teknik Universitas Hasanuddin', 2019,
  'https://eng.unhas.ac.id/post/show/en/inauguration-of-the-kalla-dormitory-for-ft-uh-students')
P('untad', 'Akademisi Untad Palu membuat alat deteksi likuefaksi', 'Kompas TV', 2021,
  'https://www.kompas.tv/article/145957/akademisi-untad-palu-membuat-alat-deteksi-likuefaksi')
P('inpex', 'Tahun ketujuh program beasiswa INPEX', 'Republika', 2021,
  'https://news.republika.co.id/berita/r21sgg456/tahun-ketujuh-program-beasiswa-inpex-sasar-55-mahasisw')
P('tsel-bts', 'Telkomsel bangun 800 BTS baru di wilayah Maluku Papua', 'Antara Ambon', 2023,
  'https://ambon.antaranews.com/berita/181707/telkomsel-bangun-800-bts-baru-di-wilayah-maluku-papua')
P('ambon', 'ITS sambung bantuan gempa Maluku lewat Unpatti', 'Institut Teknologi Sepuluh Nopember', 2019,
  'https://www.its.ac.id/news/its-sambung-bantuan-gempa-maluku-lewat-unpatti/')
P('pmk114', 'Peraturan Menteri Keuangan Nomor 114 Tahun 2025', 'Kementerian Keuangan', 2025,
  'https://jdih.kemenkeu.go.id/api/download/956c4a77-a4bb-4c97-a4a9-989bc6a98c79/2025pmkeuangan114.pdf', 'legislation')
P('mf', 'Ditjen Diktiristek buka penerimaan proposal Matching Fund', 'VIVA; Infobanknews', 2024,
  'https://www.viva.co.id/edukasi/1443253-ditjen-diktiristek-buka-penerimaan-proposal-program-penelitia')
P('ddtc-sd', 'PMK 81/2024 perbarui ketentuan super tax deduction litbang', 'DDTC News', 2024,
  'https://news.ddtc.co.id/berita/nasional/1807141/pmk-812024-perbarui-ketentuan-supertax-deduction-beg')
P('ddtc-wp', 'Sri Mulyani sebut baru 30 WP ajukan super tax deduction', 'DDTC News', 2024,
  'https://news.ddtc.co.id/berita/nasional/1812747/sri-mulyani-sebut-baru-30-wp-ajukan-supertax-deducti')
P('agincourt', 'Digugat pemerintah terkait bencana di Sumatra, begini penjelasan Agincourt Resources', 'Kontan', 2026,
  'https://nasional.kontan.co.id/news/digugat-pemerintah-terkait-bencana-di-sumatra-begini-penjelasan-agincourt-r')
P('infomedia', 'Kejati Jakarta tetapkan tersangka kasus kredit fiktif', 'Tirto', 2025,
  'https://tirto.id/kejati-jakarta-tetapkan-9-tersangka-kasus-kredit-fiktif-rp431-m-hbtL')
P('pertamina-kasus', 'Kerugian korupsi minyak mentah Pertamina', 'Bisnis.com', 2025,
  'https://kabar24.bisnis.com/read/20250225/16/1842494/kerugian-korupsi-minyak-mentah-pertamina-rp1937-triliun-in')
P('maipark', 'ITS mitigasi risiko bencana untuk tingkatkan ketangguhan Kota Surabaya', 'ITS News', 2022,
  'https://www.its.ac.id/news/its-mitigasi-risiko-bencana-untuk-tingkatkan-ketangguhan-kota-surabaya/')
P('vale-pipa', 'Vale buka suara soal kebocoran pipa minyak cemari sawah', 'Detik Finance', 2025,
  'https://finance.detik.com/energi/d-8079858/vale-buka-suara-soal-kebocoran-pipa-minyak-cemari-38-hektare-sawah')

# ------------------------------------------------------------------ registri angka
ANGKA = {}


def A(kunci, nilai, satuan, pustaka, sumber, keyakinan='terverifikasi', **kw):
    ANGKA[kunci] = dict(nilai=nilai, satuan=satuan, pustaka=pustaka, sumber=sumber, keyakinan=keyakinan, **kw)


R4 = 'Paparan kerja sama PT, 30 Okt 2026'
AN = 'Analisis BNPB, 2 Nov 2026'
DB = 'DIBI BNPB 2016-2025'
A('rev4.program', 15, 'program', 'rev4', R4, 'resmi')
A('rev4.pilar', 4, 'pilar', 'rev4', R4, 'resmi')
A('rev4.koordinator', 11, 'kampus', 'rev4', R4, 'resmi')
A('rev4.provinsi', 38, 'provinsi', 'rev4', R4, 'resmi')
A('rev4.unit', 6, 'unit', 'rev4', R4, 'resmi')
A('ks.kampus', 12, 'kampus', 'analisis', AN, 'asumsi-kebijakan')
A('ks.flagship', 12, 'flagship', 'analisis', AN, 'asumsi-kebijakan')
A('ks.l1', 9, 'flagship', 'analisis', AN, 'penilaian-pakar')
A('ks.langkah', 4, 'langkah', 'analisis', AN, 'asumsi-kebijakan')
A('ks.lapis', 3, 'lapis', 'analisis', AN, 'asumsi-kebijakan')
A('ks.tipe', 4, 'tipe', 'analisis', AN, 'penilaian-pakar')
A('ks.aset', 5, 'jenis', 'analisis', AN, 'penilaian-pakar')
A('ks.kembar', 3, 'pasang', 'analisis', AN, 'asumsi-kebijakan')
A('ks.swasta_kuat', 6, 'kampus', 'analisis', AN + ', jejaring swasta bernilai tiga atau lebih', 'penilaian-pakar')
A('ks.l3', 3, 'perusahaan', 'analisis', AN, 'asumsi-kebijakan')
A('ks.ut', 4, 'kelompok', 'analisis', AN, 'asumsi-kebijakan')
A('ks.pagar', 8, 'aturan', 'analisis', AN, 'asumsi-kebijakan')
A('ks.gel1', 5, 'flagship', 'analisis', AN, 'penilaian-pakar')
A('ks.gel2', 7, 'flagship', 'analisis', AN, 'penilaian-pakar')
A('ks.tahap', 3, 'tahap', 'analisis', AN, 'asumsi-kebijakan')
A('ks.keputusan', 6, 'langkah', 'analisis', AN, 'asumsi-kebijakan')
A('riset.temuan', 130, 'temuan', 'analisis', AN + ', riset web empat pencari', 'terverifikasi')
A('riset.titik', 61, 'titik data', 'analisis', AN + ', riset.py periksa', 'terverifikasi')
A('riset.lembaga', 47, 'lembaga', 'analisis', AN + ', riset web empat pencari', 'terverifikasi')

# kampus dan mitra (rekam jejak; tanggal kejadian ada di teks sumber)
A('usk.flume', 60, 'm', 'tdmrc-flume', 'TDMRC USK')
A('usk.warga', 642, 'warga', 'usk-medcom', 'Medcom.id, 15 Des 2025')
A('usk.logistik', 4114, 'item', 'usk-logistik', 'Good News From Indonesia, 19 Des 2025')
A('medco.air', 25000, 'liter per hari', 'medco', 'MedcoEnergi, 2025', 'terverifikasi')
A('bsi.kampus', 8, 'kampus', 'bsi', 'ANTARA, 2023')
A('unand.mhs', 400, 'mahasiswa', 'unand-mhs', 'Good News From Indonesia, 2 Jan 2026')
A('unand.komponen', 5, 'komponen', 'pegadaian', 'Katadata, 3 Jul 2026')
A('semenpadang.personel', 30, 'personel', 'semenpadang', 'Sumbarbisnis, 2 Des 2025')
A('semenpadang.alat', 3, 'alat berat', 'semenpadang', 'Sumbarbisnis, 2 Des 2025')
A('ipb.peserta', 19, 'peserta', 'ipb-latih', 'IPB University, 9 Mei 2025')
A('ipb.negara', 4, 'negara', 'ipb-latih', 'IPB University, 9 Mei 2025')
A('ipb.perkara', 24, 'perkara', 'saksi', 'Mongabay Indonesia, 21 Okt 2018')
A('phr.personel', 200, 'personel', 'phr', 'Pertamina, Agt 2025')
A('asianagri.desa', 16, 'desa', 'asianagri', 'Royal Golden Eagle, 3 Jul 2018')
A('ui.nagari', 3, 'nagari', 'drrc', 'Antara Megapolitan, 24 Des 2025')
A('astra.posko', 19, 'posko', 'astra', 'Astra International, 30 Des 2025')
A('astra.paket', 35500, 'paket', 'astra', 'Astra International, 30 Des 2025')
A('mandiri.bantuan', 67000, 'paket', 'mandiri', 'Bisnis.com, 3 Des 2025')
A('itb.seismograf', 6, 'seismograf', 'itb-cianjur', 'ITB, 2 Des 2022')
A('itb.mhs', 267, 'mahasiswa', 'itb-cianjur', 'ITB, 2 Des 2022')
A('itb.muf', 47, 'unit', 'itb-sumatra', 'ITB, 22 Jan 2026')
A('itb.lokasi', 35, 'lokasi', 'itb-sumatra', 'ITB, 22 Jan 2026')
A('itb.kampus', 14, 'kampus', 'itb-sumatra', 'ITB, 22 Jan 2026')
A('agam.liter', 35000, 'liter per hari', 'agam', 'Antara Megapolitan, 4 Apr 2026')
A('agam.kk', 281, 'KK', 'agam', 'Antara Megapolitan, 4 Apr 2026')
A('paragon.paket', 200, 'paket', 'agam', 'Antara Megapolitan, 4 Apr 2026')
A('paragon.ton', 30, 'ton', 'paragon-sum', 'Katadata, 19 Des 2025')
A('telkom.dana', 1, 'Rp miliar', 'telkom-cianjur', 'Telkom Indonesia, 25 Nov 2022', 'terverifikasi')
A('telkom.paket', 1000, 'paket', 'telkom-cianjur', 'Telkom Indonesia, 25 Nov 2022', 'terverifikasi')
A('telkomsat.unit', 120, 'unit', 'telkomsat', 'Selular.ID, 11 Des 2025')
A('floodeye.titik', 6, 'titik', 'floodeye', 'Katadata, 2 Sep 2026', 'terverifikasi')
A('ugm.kab', 120, 'kabupaten', 'icl', 'International Consortium on Landslides, 24 Nov 2024')
A('ugm.klinik', 8, 'klinik', 'deru', 'UGM, 8 Nov 2010')
A('ugm.kampus', 100, 'kampus', 'ugm-100', 'UGM, 30 Nov 2010')
A('sidomuncul.donasi', 1.4, 'Rp miliar', 'sidomuncul', 'BCA Sekuritas, 15 Des 2025')
A('its.huntara', 914, 'huntara', 'its-huntara', 'Suara Surabaya, 4 Okt 2018')
A('its.kapal', 60, 'm', 'its-kapal', 'Repositori ITS, 2024')
A('ut.huntara', 100, 'huntara', 'ut-huntara', 'Warta Ekonomi, 15 Jul 2022')
A('petrokimia.paket', 600, 'paket', 'petrokimia', 'JPNN, 5 Des 2021')
A('amman.personel', 9, 'personel', 'amman', 'AMMAN, 5 Des 2022')
A('amman.kasur', 440, 'kasur', 'amman', 'AMMAN, 5 Des 2022')
A('benoa.hotel', 4, 'hotel', 'benoa', 'Antara Bali, 2023')
A('ulm.kab', 11, 'kabupaten dan kota', 'ppiig', 'ULM, 1 Feb 2025')
A('pln.gardu', 1036, 'gardu', 'pln', 'CNBC Indonesia, 18 Jan 2021')
A('ulm.mangrove', 629.27, 'ha', 'ulm-mangrove', 'Antara Kalsel, 2023')
A('kalla.asrama', 810, 'orang', 'kalla', 'Fakultas Teknik Unhas, 14 Agt 2019')
A('untad.akurasi', 80, '%', 'untad', 'Kompas TV, 10 Feb 2021', 'terverifikasi')
A('inpex.mhs', 343, 'mahasiswa', 'inpex', 'Republika, 4 Nov 2021')
A('tsel.bts', 800, 'BTS', 'tsel-bts', 'Antara Ambon, 2023', 'terverifikasi')
A('ambon.mengungsi', 148619, 'jiwa', 'ambon', 'ITS, Okt 2019')
A('pmk114.batas', 5, '%', 'pmk114', 'PMK 114/2025 Pasal 4, 30 Des 2025', 'resmi')
A('mf.dana', 750, 'Rp miliar', 'mf', 'Ditjen Diktiristek lewat VIVA dan Infobanknews, 2024')
A('sd.persen', 300, '%', 'ddtc-sd', 'PP 45/2019 dan PMK 81/2024, lewat DDTC News 2024')
A('sd.wp', 30, 'wajib pajak', 'ddtc-wp', 'Menteri Keuangan lewat DDTC News, 2024')
A('agincourt.gugatan', 200.99, 'Rp miliar', 'agincourt', 'Kontan, 15 Jan 2026')
A('infomedia.kasus', 431.7, 'Rp miliar', 'infomedia', 'Tirto, 8 Mei 2025')
A('vale.sawah', 38, 'ha', 'vale-pipa', 'Detik Finance, 1 Agt 2025', 'terverifikasi')

# ------------------------------------------------------------------ DIBI per regional (dihitung dari CSV, bukan diketik)
REG = {'USK': [11, 12], 'Unand': [13, 14, 15, 16, 17, 18, 19, 21], 'UI': [31, 36], 'ITB': [32], 'UGM': [33, 34], 'ITS': [35],
       'Unram': [51, 52, 53], 'ULM': [61, 62, 63, 64, 65], 'Unhas': [71, 72, 73, 74, 75, 76], 'Unpatti': [81, 82, 91, 92, 93, 94, 95, 96]}
NAMA_REG = {'USK': 'Aceh dan Sumut', 'Unand': 'Sumatera lain', 'UI': 'DKI dan Banten', 'ITB': 'Jawa Barat', 'UGM': 'Jateng dan DIY',
            'ITS': 'Jawa Timur', 'Unram': 'Bali dan Nusra', 'ULM': 'Kalimantan', 'Unhas': 'Sulawesi', 'Unpatti': 'Maluku dan Papua'}
KEJ = collections.defaultdict(collections.Counter)
MATI = collections.defaultdict(collections.Counter)
RUSAK = collections.Counter()
for r in csv.DictReader(open(DIBI, encoding='utf-8')):
    if r['cakupan'] != 'bencana' or r['klasifikasi'] != 'alam' or not 2016 <= int(r['tahun']) <= 2025:
        continue
    reg = next((k for k, v in REG.items() if int(r['kode_prov']) in v), None)
    if not reg:
        continue
    kat = r['kategori_dibi']
    kat = 'Gempa dan tsunami' if kat in ('Gempabumi', 'Tsunami', 'Gempabumi dan tsunami') else kat
    KEJ[reg][kat] += float(r['kejadian'] or 0)
    MATI[reg][kat] += float(r['meninggal'] or 0) + float(r['hilang'] or 0)
    RUSAK[reg] += float(r['rumah_rusak'] or 0)


def pct(c, k):
    t = sum(c.values())
    return round(100 * c[k] / t, 1) if t else 0


for reg in REG:
    A(f'dibi.{reg}.mati', round(sum(MATI[reg].values())), 'jiwa', 'dibi', DB, 'resmi')
    A(f'dibi.{reg}.gempa', round(MATI[reg]['Gempa dan tsunami']), 'jiwa', 'dibi', DB, 'resmi')
    A(f'dibi.{reg}.rumah', round(RUSAK[reg]), 'rumah', 'dibi', DB, 'resmi')
A('dibi.ULM.karhutla', pct(KEJ['ULM'], 'Kebakaran hutan dan lahan'), '%', 'dibi', DB, 'resmi')
A('dibi.ITB.gempa_pct', pct(MATI['ITB'], 'Gempa dan tsunami'), '%', 'dibi', DB, 'resmi')
A('dibi.Unhas.gempa_pct', pct(MATI['Unhas'], 'Gempa dan tsunami'), '%', 'dibi', DB, 'resmi')
A('dibi.UI.gempa_pct', pct(MATI['UI'], 'Gempa dan tsunami'), '%', 'dibi', DB, 'resmi')
A('dibi.UGM.longsor', round(MATI['UGM']['Longsor']), 'jiwa', 'dibi', DB, 'resmi')
A('dibi.USK.banjir', round(MATI['USK']['Banjir']), 'jiwa', 'dibi', DB, 'resmi')
A('dibi.UI.banjir_pct', pct(KEJ['UI'], 'Banjir'), '%', 'dibi', DB, 'resmi')
beda = [r for r in REG if MATI[r].most_common(1)[0][0] == 'Gempa dan tsunami' and KEJ[r].most_common(1)[0][0] != 'Gempa dan tsunami']
A('dibi.beda', len(beda), 'regional', 'dibi', DB + ', regional yang korban jiwanya terbanyak dari gempa dan tsunami', 'resmi')


# ------------------------------------------------------------------ CSV
def tulis(nama, kepala, baris):
    with open(FD / nama, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(kepala)
        w.writerows(baris)
    return f'data/ks/{nama}'


def D(csv_, kolom, sumber, keyakinan='terverifikasi', **kw):
    return dict(csv=csv_, kolom=kolom, sumber=sumber, keyakinan=keyakinan, **kw)


def kartu_angka(nama, baris, sumber, keyakinan='terverifikasi', fmt=None):
    """angka_besar mode kartu: baris [label, nilai, satuan, ket, ikon]."""
    c = tulis(nama, ['label', 'nilai', 'satuan', 'ket', 'ikon'], baris)
    fmt = fmt or ('0,0' if any(isinstance(b[1], float) for b in baris) else '0')
    return {'mode': 'kartu', 'tata': 'kisi', 'kolom': 1, 'data': D(c, [{'nama': 'label'}, {'nama': 'nilai', 'kepala': 'Nilai', 'fmt': fmt},
                                           {'nama': 'satuan'}, {'nama': 'ket'}, {'nama': 'ikon'}], sumber, keyakinan)}


def ikon_baris(nama, baris, sumber, keyakinan='penilaian-pakar'):
    c = tulis(nama, ['judul', 'isi', 'ikon'], baris)
    return {'mode': 'baris', 'data': D(c, [{'nama': 'judul'}, {'nama': 'isi'}, {'nama': 'ikon'}], sumber, keyakinan)}


def kalimat(kolom):
    return [dict(k, isi='. '.join(k['isi']) + '.') if isinstance(k['isi'], list) else k for k in kolom]


def pita(label, kolom, nada='aksi'):
    return {'label': label, 'nada': nada, 'skala': 1.15, 'kolom': [{'ikon': i, 'judul': j, 'isi': t} for i, j, t in kolom]}


# ------------------------------------------------------------------ slide
S = []
KREDIT_KAMPUS = ('Foto: Ilham Kuniawan Gumilang (UI), A2613 (ITB), Alharamain354 (UGM), Davidelit (IPB); '
                 'CC BY-SA 4.0, Wikimedia Commons')
FOTO_KAMPUS = ['foto/kampus-ui.jpg', 'foto/kampus-itb.jpg', 'foto/kampus-ugm.jpg', 'foto/kampus-ipb.jpg']

S.append({'jenis': 'sampul', 'layout': 'putih', 'foto': FOTO_KAMPUS, 'kredit': KREDIT_KAMPUS, 'kota': 'Jakarta',
          'logo_kanan': 'foto/berakhlak-hd.png',
          'judul_sampul': 'Ajuan Program Flagship Campus-first: Kerja Sama BNPB dengan Kampus dan Swasta',
          'subjudul': 'Berangkat dari kekuatan tiap kampus koordinator, dimulai dari perusahaan yang sudah bekerja dengannya',
          'kepada': 'Disampaikan kepada Kepala Badan Nasional Penanggulangan Bencana',
          'tanpa_penyaji': 'pemilik 2 Nov 2026 (sesi arah no. 3): tanpa nama penyaji'})
S.append({'jenis': 'daftar-isi'})

# Ringkasan
S.append({
    'jenis': 'kesimpulan', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif', 'skala_isi': 1.2,
    'pesan': 'Ringkasan ajuan flagship berangkat dari kampus',
    'judul': 'Ringkasan: tiap kampus memimpin satu flagship dari asetnya sendiri, dengan calon mitra swasta yang diutamakan dari perusahaan yang sudah bekerja dengannya',
    'kartu': [
        {'label': 'Cara berpikir', 'ikon': 'ringkasan', 'warna': 'navy', 'judul': 'Kampus dulu, baru program',
         'isi': 'Aset kampus dipetakan lebih dulu. Setelah itu baru bahaya regional dicocokkan, lalu mitra swasta dipilih.'},
        {'label': 'Aset kampus', 'ikon': 'sekolah', 'warna': 'navy', 'judul': 'Kekuatan tiap kampus berbeda',
         'isi': '{{angka:ks.kampus}} kampus dinilai pada {{angka:ks.aset}} jenis aset; hanya {{angka:ks.swasta_kuat}} kampus punya jejaring swasta kebencanaan yang kuat.'},
        {'label': 'Bahaya regional', 'ikon': 'gempa', 'warna': 'navy', 'judul': 'Bahaya mematikan tetap dijawab',
         'isi': 'Di {{angka:dibi.beda}} regional korban terbanyak dari gempa atau tsunami; bila aset kampus belum siap, bahaya itu dijawab ajuan pendukung.'},
        {'label': 'Tipe kampus', 'ikon': 'lembaga', 'warna': 'navy', 'judul': 'Tipe menentukan peran swasta',
         'isi': 'Kampus terbagi {{angka:ks.tipe}} tipe; tipenya menentukan aset swasta yang paling berguna bagi flagship.'},
        {'label': 'Prioritas', 'ikon': 'wilayah', 'warna': 'oranye', 'judul': 'Dua gelombang',
         'isi': '{{angka:ks.gel1}} flagship paling siap untuk 2027; {{angka:ks.gel2}} lainnya masuk gelombang kedua setelah celah bukti dicek.'},
        {'label': 'Mitra swasta', 'ikon': 'pembiayaan', 'warna': 'oranye', 'judul': 'Mulai dari yang sudah bekerja',
         'isi': '{{angka:ks.l1}} flagship berpasangan dengan calon mitra utama yang sudah punya MoU, gedung, beasiswa, atau proyek dengan kampusnya.'},
        {'label': 'Pagar', 'ikon': 'peringatan', 'warna': 'merah', 'judul': 'Aset boleh, wajah tidak',
         'isi': 'Lapis tiga hanya membawa alat atau fasilitas; {{angka:ks.ut}} kelompok calon mitra wajib uji tuntas sebelum MoU.'},
        {'label': 'Bukti', 'ikon': 'data', 'warna': 'navy', 'judul': 'Riset bersumber',
         'isi': '{{angka:riset.temuan}} temuan bersumber dan {{angka:riset.titik}} titik data angka. Semua mitra masih berstatus calon.'},
    ],
    'arahan': {'label': 'Keputusan yang diminta', 'ikon': 'regulasi',
               'teks': 'Kepala BNPB menyetujui flagship gelombang satu (Unand, ITB, USK, UGM, Unhas) sebagai isi tahap 2027, mengizinkan penjajakan calon mitra dengan uji tuntas, dan menunjuk unit BNPB pasangan tiap flagship.'},
    'sumber': R4 + '; ' + AN + '; ' + DB,
})

# ------------------------------------------------------------------ Bagian 1: membaca kampus
S.append({'jenis': 'pembatas-seksi', 'bagian': 1})

lapis = ikon_baris('lapis.csv', [
    ['Lapis satu: sudah bermitra', 'MoU, gedung, beasiswa, atau proyek bersama kampus itu, ditambah rekam kemanusiaan', 'lembaga'],
    ['Lapis dua: rekam regional', 'Rekam tanggap bencana kuat di wilayahnya; dijajaki lewat BNPB', 'wilayah'],
    ['Lapis tiga: berpagar', 'Aset besar tetapi berisiko reputasi; hanya membawa alat atau fasilitas', 'peringatan'],
], AN, 'asumsi-kebijakan')
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan',
    'pesan': 'Program diturunkan dari aset kampus, dan mitra swasta dipilih berlapis',
    'judul': 'Program diturunkan dari kampus dalam {{angka:ks.langkah}} langkah, dan mitra swasta dipilih dari {{angka:ks.lapis}} lapis yang dimulai dari perusahaan yang sudah bekerja dengan kampusnya',
    'rasio': 0.64,
    'utama': {'judul': 'Dari kampus ke program', 'ikon': 'ringkasan',
              'alur': {'sorot': 0, 'label_hasil': 'Hasil', 'skala_huruf': 1.3, 'langkah': [
                  {'judul': 'Aset kampus', 'butir': ['Fasilitas uji dan latih', 'Produk siap pakai', 'Tanggap darurat',
                                                     'Pakar dan jejaring'],
                   'pelaku': 'Kampus koordinator', 'hasil': 'Kekuatan khas'},
                  {'judul': 'Bahaya regional', 'butir': ['Kejadian terbanyak', 'Korban jiwa terbanyak', 'Rumah rusak',
                                                         'Sepuluh tahun data'],
                   'pelaku': 'Data DIBI', 'hasil': 'Bahaya sasaran'},
                  {'judul': 'Unit BNPB', 'butir': ['Satu dari enam unit', 'Kebutuhan tiap unit', 'Program terwujud',
                                                   'Unit menjadi pemilik'],
                   'pelaku': 'Unit BNPB', 'hasil': 'Pemilik di BNPB'},
                  {'judul': 'Mitra swasta', 'butir': ['Sudah bermitra dulu', 'Rekam regional', 'Berpagar terakhir',
                                                      'Uji tuntas dulu'],
                   'pelaku': 'Kampus dan BNPB', 'hasil': 'Calon mitra'}]}},
    'panel': {'judul': 'Tiga lapis calon mitra', 'ikon': 'pembiayaan', 'daftar_ikon': lapis},
    'pita': pita('Contoh pembacaan', [
        ('tsunami', 'USK', 'Flume tsunami, bahaya tsunami Aceh, unit Pencegahan, calon mitra BSI.'),
        ('air-baku', 'ITB', 'Unit ultrafiltrasi, banjir Sumatera, unit Logistik, calon mitra Paragon.'),
        ('tsunami', 'Unand', 'Model megathrust untuk tsunami Padang; unit Pencegahan; calon mitra Pegadaian.')], 'data'),
    'sumber': AN + '; ' + R4,
})

# Harvey aset
H = [  # fasilitas, produk, tanggap, pendidikan dan pakar, jejaring swasta
    ['USK', 4, 2, 4, 4, 1], ['Unand', 1, 2, 3, 3, 3], ['UI', 1, 1, 3, 3, 2], ['ITB', 2, 3, 4, 3, 3],
    ['Tel-U', 2, 2, 0, 2, 3], ['UGM', 2, 4, 4, 4, 3], ['ITS', 3, 2, 3, 3, 3], ['Unram', 1, 2, 4, 2, 2],
    ['ULM', 2, 1, 1, 2, 2], ['Unhas', 1, 1, 3, 3, 4], ['Unpatti', 1, 1, 2, 2, 2], ['IPB', 4, 2, 3, 4, 1]]
assert sum(1 for h in H if h[5] >= 3) == ANGKA['ks.swasta_kuat']['nilai']
harvey = tulis('aset_harvey.csv', ['kampus', 'fasilitas', 'produk', 'tanggap', 'pakar', 'swasta'], H)
khas = ikon_baris('khas.csv', [
    ['USK dan IPB', 'Fasilitas langka: flume tsunami dan pusat latih api', 'tsunami'],
    ['UGM, ITB, ITS, Tel-U', 'Produk atau rancangan teruji yang siap dikembangkan', 'infrastruktur'],
    ['Unand, Unram, Unhas, Unpatti', 'Tuan rumah bencana besar di wilayah sendiri', 'tanggap-darurat'],
    ['UI dan ULM', 'Kesehatan darurat dan data lahan basah', 'jiwa'],
    ['Jejaring swasta terkuat', 'Unhas dan Unand: kajian bencana bersama perusahaan', 'pembiayaan'],
], AN + '; riset.json')
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan',
    'pesan': 'Kekuatan tiap kampus berbeda dan jejaring swasta kebencanaan masih tipis di separuh kampus',
    'judul': 'Kekuatan khas tiap kampus berbeda, dan hanya {{angka:ks.swasta_kuat}} dari {{angka:ks.kampus}} kampus sudah punya jejaring swasta kebencanaan yang kuat',
    'rasio': 0.62,
    'utama': {'judul': 'Aset kebencanaan tiap kampus', 'ikon': 'sekolah',
              'subjudul_grafik': 'Penilaian dari bukti riset: fasilitas, produk, tanggap darurat, pakar, jejaring swasta',
              'harvey': {'bentuk': 'bola', 'tingkat': ['Belum ditemukan', 'Awal', 'Ada', 'Kuat', 'Sangat kuat'],
                         'data': D(harvey, [{'nama': 'kampus'}, {'nama': 'fasilitas', 'kepala': 'Fasilitas', 'fmt': '0'},
                                            {'nama': 'produk', 'kepala': 'Produk', 'fmt': '0'}, {'nama': 'tanggap', 'kepala': 'Tanggap', 'fmt': '0'},
                                            {'nama': 'pakar', 'kepala': 'Pakar', 'fmt': '0'}, {'nama': 'swasta', 'kepala': 'Swasta', 'fmt': '0'}],
                                   AN + '; riset.json', 'penilaian-pakar')}},
    'panel': {'judul': 'Kekuatan khas menurut tipe kampus', 'ikon': 'naik', 'daftar_ikon': khas},
    'sumber': AN + ', dinilai dari riset web empat pencari (riset.json)',
})

# Heatmap bahaya
KOL = ['Banjir', 'Cuaca ekstrem', 'Longsor', 'Kebakaran hutan dan lahan']
hb = []
for reg in REG:
    hb.append([NAMA_REG[reg] + ' (' + reg + ')'] + [pct(KEJ[reg], k) for k in KOL] + [pct(MATI[reg], 'Gempa dan tsunami')])
bahaya = tulis('bahaya.csv', ['regional', 'banjir', 'cuaca', 'longsor', 'karhutla', 'gempa_mati'], hb)
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan',
    'pesan': 'Bahaya yang paling sering tidak selalu yang paling mematikan',
    'judul': 'Di {{angka:dibi.beda}} regional, korban jiwa terbanyak datang dari gempa atau tsunami walau kejadian terbanyaknya banjir atau cuaca ekstrem',
    'rasio': 0.66,
    'utama': {'judul': 'Porsi kejadian dan porsi korban jiwa per regional', 'ikon': 'data',
              'subjudul_grafik': 'Persen kejadian bencana alam per jenis; kolom Jiwa gempa = persen korban jiwa dari gempa dan tsunami, 2016-2025',
              'heatmap': {'mode': 'angka', 'ramp': 'netral', 'satuan': 'Persen', 'ambang': [10, 20, 30, 50],
                          'data': D(bahaya, [{'nama': 'regional'}, {'nama': 'banjir', 'kepala': 'Banjir', 'fmt': '1'},
                                             {'nama': 'cuaca', 'kepala': 'Cuaca ekstrem', 'fmt': '1'},
                                             {'nama': 'longsor', 'kepala': 'Longsor', 'fmt': '1'},
                                             {'nama': 'karhutla', 'kepala': 'Karhutla', 'fmt': '1'},
                                             {'nama': 'gempa_mati', 'kepala': 'Jiwa gempa', 'fmt': '1'}], DB, 'resmi')}},
    'panel': {'judul': 'Yang menentukan flagship', 'ikon': 'gempa',
              'angka_besar': kartu_angka('bahaya_kartu.csv', [
                  ['Sulawesi', ANGKA['dibi.Unhas.gempa']['nilai'], 'jiwa', 'korban gempa dan tsunami', 'gempa'],
                  ['Bali dan Nusra', ANGKA['dibi.Unram.rumah']['nilai'], 'rumah', 'rusak, tertinggi antarregional', 'rumah'],
                  ['Jateng dan DIY', ANGKA['dibi.UGM.longsor']['nilai'], 'jiwa', 'korban longsor', 'longsor']], DB, 'resmi')},
    'sumber': DB + ', rekap provinsi tahunan (dibi.bnpb.go.id)',
})

# Tipe kampus
motif = ikon_baris('motif.csv', [
    ['Kewajiban TJSL', 'Dampak terukur untuk laporan keberlanjutan', 'regulasi'],
    ['Melindungi aset sendiri', 'Pabrik dan gardu di zona rawan', 'infrastruktur'],
    ['Pengurang pajak', 'Sumbangan bencana dan litbang ke kampus', 'pembiayaan'],
    ['Talenta', 'Akses ke mahasiswa terbaik', 'sekolah'],
    ['Kepercayaan publik', 'Hadir di program resmi negara', 'lembaga'],
], AN, 'penilaian-pakar')
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan',
    'pesan': 'Tipe kampus menentukan aset swasta yang paling berguna',
    'judul': 'Kampus koordinator terbagi {{angka:ks.tipe}} tipe, dan tipenya menentukan aset swasta yang paling berguna, dari pabrik sampai karyawan relawan',
    'rasio': 0.66,
    'utama': {'judul': 'Tipe kampus dan peran swasta yang cocok', 'ikon': 'lembaga',
              'heatmap': {'mode': 'teks', 'skala_huruf': 1.3, 'data': D(tulis('tipe_kampus.csv', ['tipe', 'kampus', 'aset', 'swasta'], [
                  ['Pembuat produk', 'UGM, ITB, ITS dan Tel-U', 'Alat atau rancangan teruji', 'Pabrik dan dana unit'],
                  ['Pusat uji dan latih', 'USK dan IPB', 'Flume tsunami, pusat latih api', 'Sponsor dan peserta latih'],
                  ['Tuan rumah lapangan', 'Unand, Unram, Unhas, Unpatti', 'Rekam bencana besar', 'TJSL wilayah operasi'],
                  ['Manusia dan data', 'UI dan ULM', 'Kesehatan darurat, peta risiko', 'Karyawan relawan']]),
                  [{'nama': 'tipe', 'kepala': 'Tipe'}, {'nama': 'kampus', 'kepala': 'Kampus'}, {'nama': 'aset', 'kepala': 'Aset utama'},
                   {'nama': 'swasta', 'kepala': 'Peran swasta'}], AN, 'penilaian-pakar')}},
    'panel': {'judul': 'Mengapa swasta mau ikut', 'ikon': 'pembiayaan', 'daftar_ikon': motif},
    'sumber': AN,
})

# ------------------------------------------------------------------ Bagian 2: flagship per kampus
S.append({'jenis': 'pembatas-seksi', 'bagian': 2})

LOGO = {'USK': 'foto/logo-usk.png', 'Unand': 'foto/logo-unand.png', 'UI': 'foto/logo-ui.png', 'ITB': 'foto/logo-itb.png',
        'Tel-U': 'foto/logo-telu.png', 'UGM': 'foto/logo-ugm.png', 'ITS': 'foto/logo-its.png', 'Unram': 'foto/logo-unram.png',
        'ULM': 'foto/logo-ulm.png', 'Unhas': 'foto/logo-unhas.png', 'Unpatti': 'foto/logo-unpatti.png', 'IPB': 'foto/logo-ipb.png'}
GALERI = [('USK', 'Uji Tsunami Nasional'), ('Unand', 'Padang Siap Megathrust'), ('UI', 'Jakarta Tetap Bekerja'),
          ('ITB', 'Air Bersih Siaga'), ('Tel-U', 'Sekolah Siaga VR'), ('UGM', 'GAMA-EWS Desa Longsor'),
          ('ITS', 'Kapal Rumah Sakit'), ('Unram', 'Rumah Ferosemen'), ('ULM', 'Peta Lahan Basah'),
          ('Unhas', 'Industri Sadar Risiko'), ('Unpatti', 'Pulau Siaga Tsunami'), ('IPB', 'Akademi Pemadam Gambut')]
S.append({
    'jenis': 'galeri', 'jenis_slide': 'navigasi', 'judul_bentuk': 'deskriptif',
    'pesan': 'Dua belas kampus memimpin flagship masing-masing',
    'judul': 'Dua belas kampus koordinator dan flagship yang dipimpinnya',
    'panel': [{'judul': 'Kampus koordinator dan flagship-nya', 'ikon': 'sekolah', 'kolom_foto': 6,
               'foto': [{'berkas': LOGO[k], 'keterangan': f'{k}: {f}', 'kredit': 'Logo: kampus masing-masing', 'utuh': True} for k, f in GALERI]}],
    'sumber': AN + '; logo dari paparan kerja sama PT, 30 Okt 2026',
})

PROV = {
    'Aceh': 'USK', 'Sumatera Utara': 'USK',
    'Sumatera Barat': 'Unand', 'Riau': 'Unand', 'Kepulauan Riau': 'Unand', 'Jambi': 'Unand', 'Sumatera Selatan': 'Unand',
    'Kep. Bangka Belitung': 'Unand', 'Bengkulu': 'Unand', 'Lampung': 'Unand',
    'DKI Jakarta': 'UI', 'Banten': 'UI', 'Jawa Barat': 'ITB', 'Jawa Tengah': 'UGM', 'DI Yogyakarta': 'UGM', 'Jawa Timur': 'ITS',
    'Bali': 'Unram', 'Nusa Tenggara Barat': 'Unram', 'Nusa Tenggara Timur': 'Unram',
    'Kalimantan Barat': 'ULM', 'Kalimantan Tengah': 'ULM', 'Kalimantan Selatan': 'ULM', 'Kalimantan Timur': 'ULM', 'Kalimantan Utara': 'ULM',
    'Sulawesi Utara': 'Unhas', 'Gorontalo': 'Unhas', 'Sulawesi Tengah': 'Unhas', 'Sulawesi Barat': 'Unhas', 'Sulawesi Selatan': 'Unhas',
    'Sulawesi Tenggara': 'Unhas', 'Maluku': 'Unpatti', 'Maluku Utara': 'Unpatti', 'Papua': 'Unpatti', 'Papua Barat': 'Unpatti',
    'Papua Barat Daya': 'Unpatti', 'Papua Tengah': 'Unpatti', 'Papua Pegunungan': 'Unpatti', 'Papua Selatan': 'Unpatti'}
peta = tulis('korban_regional.csv', ['provinsi', 'korban'], sorted((p, ANGKA[f'dibi.{k}.mati']['nilai']) for p, k in PROV.items()))
FS = [['USK', 'Uji Tsunami Nasional', 'Satu'], ['Unand', 'Padang Siap Megathrust', 'Satu'],
      ['UI', 'Jakarta Tetap Bekerja', 'Dua'], ['ITB', 'Air Bersih Siaga', 'Satu'],
      ['Tel-U', 'Sekolah Siaga VR', 'Satu'], ['UGM', 'GAMA-EWS Desa Longsor', 'Satu'],
      ['ITS', 'Kapal Rumah Sakit', 'Satu'], ['Unram', 'Rumah Ferosemen', 'Satu'],
      ['ULM', 'Peta Lahan Basah', 'Satu'], ['Unhas', 'Industri Sadar Risiko', 'Satu'],
      ['Unpatti', 'Pulau Siaga Tsunami', 'Dua'], ['IPB', 'Akademi Pemadam Gambut', 'Dua']]
assert sum(1 for f in FS if f[2] == 'Satu') == ANGKA['ks.l1']['nilai']
daftar_fs = tulis('daftar_flagship.csv', ['kampus', 'flagship', 'lapis'], FS)
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'peta', 'judul_bentuk': 'temuan',
    'pesan': 'Flagship menjangkau semua regional dan sebagian besar memakai mitra yang sudah bekerja dengan kampusnya',
    'judul': 'Sulawesi mencatat korban jiwa tertinggi, {{angka:dibi.Unhas.mati}} jiwa, dan tiap regional dipimpin satu flagship; {{angka:ks.l1}} di antaranya bercalon mitra lapis satu',
    'rasio': 0.65,
    'utama': {'judul': 'Korban jiwa bencana alam per regional, 2016-2025', 'ikon': 'wilayah',
              'peta': {'mode': 'koroplet', 'ambang': [500, 1000, 1500, 3000], 'skala': 'api', 'satuan': 'Korban jiwa', 'label': 0,
                       'data': D(peta, [{'nama': 'provinsi'}, {'nama': 'korban', 'kepala': 'Jiwa', 'fmt': '0'}], DB, 'resmi')}},
    'panel': {'judul': 'Flagship dan lapis calon mitra utama', 'ikon': 'sekolah', 'skala_huruf': 1.15, 'baris_maks_pt': 30,
              'data': D(daftar_fs, [{'nama': 'kampus', 'kepala': 'Kampus', 'bobot': 0.9}, {'nama': 'flagship', 'kepala': 'Flagship', 'rata': 'l', 'bobot': 1.9},
                                    {'nama': 'lapis', 'kepala': 'Lapis', 'bobot': 0.6}], AN, 'asumsi-kebijakan')},
    'sumber': DB + '; ' + AN,
})


# ---------- tiga pola halaman kampus
def pola_kartu(judul, pesan, nama, kolom, panel_judul, kartu_csv, kartu_baris, kartu_sumber, pendukung, sumber, ikon='lembaga'):
    """Pola A: cara kerja flagship tiga pihak + angka aset + pita ajuan pendukung."""
    return {'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan', 'pesan': pesan, 'judul': judul,
            'rasio': 0.68,
            'utama': {'judul': f'Flagship: {nama}', 'ikon': ikon, 'kolom_teks': {'mode': 'kartu', 'huruf_maks': 18, 'kolom': kalimat(kolom)}},
            'panel': {'judul': panel_judul, 'ikon': 'naik', 'angka_besar': kartu_angka(kartu_csv, kartu_baris, kartu_sumber)},
            'pita': pita('Ajuan pendukung', pendukung), 'sumber': sumber}


def pola_tabel(judul, pesan, kode, baris, foto, foto_ket, kredit, aset, sumber, ikon='lembaga'):
    """Pola B: tabel flagship dan ajuan (mitra, unit BNPB) + foto bukti + pita aset kampus."""
    c = tulis(f'ajuan_{kode}.csv', ['program', 'isi', 'mitra', 'unit'], baris)
    return {'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan', 'pesan': pesan, 'judul': judul,
            'rasio': 0.72,
            'tabel': {'judul_panel': 'Flagship dan ajuan pendukung', 'ikon': ikon, 'peringkat': False, 'sel_dua_baris': True, 'sel_maks_baris': 3,
                      'skala_huruf': 1.4, 'baris_maks_pt': 72,
                      'data': D(c, [{'nama': 'program', 'kepala': 'Program', 'bobot': 1.3}, {'nama': 'isi', 'kepala': 'Cara kerja', 'bobot': 1.9, 'rata': 'l'},
                                    {'nama': 'mitra', 'kepala': 'Calon mitra (lapis)', 'bobot': 1.3, 'rata': 'l'},
                                    {'nama': 'unit', 'kepala': 'Unit BNPB', 'bobot': 1.0, 'rata': 'l'}], sumber, 'asumsi-kebijakan')},
            'panel': {'judul': 'Bukti yang sudah ada', 'ikon': 'situs', 'kolom_foto': 1,
                      'foto': [{'berkas': foto, 'keterangan': foto_ket, 'kredit': kredit}]},
            'pita': pita('Aset kampus yang dipakai', aset, 'data'), 'sumber': sumber}


def pola_aset(judul, pesan, kode, aset, fs_judul, fs_butir, pendukung, sumber, ikon='lembaga'):
    """Pola C: daftar aset terbukti (utama) + cara kerja flagship (panel) + pita ajuan pendukung."""
    return {'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan', 'pesan': pesan, 'judul': judul,
            'rasio': 0.55,
            'utama': {'judul': 'Aset yang sudah terbukti', 'ikon': 'sekolah', 'daftar_ikon': ikon_baris(f'aset_{kode}.csv', aset, sumber, 'terverifikasi')},
            'panel': {'judul': f'Flagship: {fs_judul}', 'ikon': ikon, 'daftar': fs_butir},
            'pita': pita('Ajuan pendukung', pendukung), 'sumber': sumber}


# 1 USK (B)
S.append(pola_tabel(
    'USK yang melayani lebih dari {{angka:usk.warga}} warga saat Senyar diusulkan membuka flume tsunami {{angka:usk.flume}} m sebagai pusat uji nasional',
    'Fasilitas uji tsunami USK paling langka di antara kampus koordinator', 'usk', [
        ['Uji Tsunami Nasional', 'Flume dan meja getar dibuka untuk uji alat kampus lain', 'BSI (satu); PEMA (dijajaki)', 'Pencegahan'],
        ['Belajar dari Senyar', 'Logistik banjir hari pertama dengan WebGIS USK', 'MedcoEnergi, Telkomsel (dua)', 'Logistik'],
        ['Beasiswa Magister', 'Magister Ilmu Kebencanaan untuk aparat BPBD Sumatera', 'BSI (satu)', 'Sistem dan Strategi']],
    'foto/tdmrc.jpg', 'Flume tsunami TDMRC USK', 'Foto: TDMRC USK',
    [('tsunami', 'Flume dan meja getar', 'Kolam uji gelombang dengan sensor dan kamera PIV.'),
     ('sekolah', 'Magister Ilmu Kebencanaan', 'Gelar ganda bersama Kobe University.'),
     ('tanggap-darurat', 'Satgas Senyar', 'Posko di tiga kabupaten dan RSUD Meureudu.')],
    'TDMRC USK; Medcom.id, 15 Des 2025; ANTARA, 2023; Kumparan; ' + AN, ikon='tsunami'))

# 2 Unand (A)
S.append(pola_kartu(
    'Unand dan Pegadaian sudah menyerahkan model megathrust berisi {{angka:unand.komponen}} komponen; flagship diusulkan menetapkan gedung dan masjid Padang sebagai tempat evakuasi',
    'Cetak biru Unand sudah ada; flagship mengubahnya jadi tempat evakuasi resmi', 'Padang Siap Megathrust',
    [{'judul': 'Unand', 'ikon': 'sekolah', 'isi': ['Center of Excellence BNPB menilai kelayakan struktur gedung dan masjid',
                                                  'Melatih warga dan pengurus masjid', 'Mengukur waktu evakuasi saat latihan kota']},
     {'judul': 'Calon mitra: Pegadaian, Hutama Karya', 'ikon': 'infrastruktur', 'isi': ['Pegadaian diajak membiayai rambu evakuasi dan latihan warga',
                                                                              'Hutama Karya diajak menjadi mitra teknik penguatan bangunan', 'Pemilik gedung diajak membuka akses ke lantai atas']},
     {'judul': 'BNPB dan BPBD', 'ikon': 'regulasi', 'isi': ['Pencegahan menetapkan tempat evakuasi resmi',
                                                           'Memasukkannya ke rencana kontinjensi kota', 'Meniru model ini di pesisir Bengkulu']}],
    'Rekam galodo Sumbar', 'unand.csv', [
        ['Mahasiswa Unand', ANGKA['unand.mhs']['nilai'], 'mahasiswa', 'terjun ke lokasi banjir', 'jiwa'],
        ['Semen Padang', ANGKA['semenpadang.personel']['nilai'], 'personel', 'posko Pauh dan Palembayan', 'tanggap-darurat']],
    'Good News From Indonesia, 2 Jan 2026; Sumbarbisnis, 2 Des 2025',
    [('banjir', 'Siaga Galodo Sumbar', 'Peringatan dini banjir bandang bersama Semen Padang (lapis dua).'),
     ('sekolah', 'KKN Pesisir Megathrust', 'KKN tematik Sumbar dan Bengkulu dengan TJSL Pegadaian.')],
    'Katadata, 3 Jul 2026; Republika, 13 Jun 2026; ' + AN, ikon='tsunami'))

# 3 UI (C)
S.append(pola_aset(
    'Banjir mencapai {{angka:dibi.UI.banjir_pct}} persen kejadian di DKI dan Banten; DRRC UI mengajak calon mitra korporasi menguji keberlangsungan usaha gedung kantornya',
    'UI paling kuat di kesehatan dan keberlangsungan usaha', 'ui', [
        ['DRRC UI', 'Kajian multidisiplin; dikontrak Pertamina Hulu Rokan untuk tanggap darurat kebakaran', 'lembaga'],
        ['RSUI dan FKUI', 'Relawan medis bergelombang ke Sumatera', 'kesehatan'],
        ['Psikologi UI', 'Relawan pertolongan pertama psikologis', 'jiwa'],
        ['Aturan kampus aman bencana', 'Peraturan Rektor tentang keberlangsungan usaha kampus', 'regulasi'],
        ['ILUNI UI', 'Relawan alumni, dua kali dihargai BNPB', 'kapasitas']],
    'Jakarta Tetap Bekerja', [
        'DRRC dan Fakultas Kesehatan Masyarakat UI menyusun dan menguji rencana keberlangsungan usaha gedung kantor bersama mahasiswa.',
        'Perusahaan diajak membiayai kajian gedungnya sendiri; karyawannya ikut Korps Relawan.',
        'Calon mitra: Bank Mandiri dan Astra (lapis dua), Pertamina Hulu Rokan (lapis satu).',
        'BNPB memakainya sebagai standar keberlangsungan usaha dunia usaha.'],
    [('kesehatan', 'Tim Medis dan Psikososial', 'RSUI dan Psikologi UI bersama Astra (lapis dua).'),
     ('tsunami', 'Selat Sunda Siaga Tsunami', 'Gempa dan tsunami: {{angka:dibi.UI.gempa_pct}} persen korban jiwa; bersama Untirta.')],
    'Antara Megapolitan, 2024 dan 2025; Kemdiktisaintek, 2021; ' + DB + '; ' + AN, ikon='infrastruktur'))

# 4 ITB (A)
S.append(pola_kartu(
    'ITB memasang {{angka:itb.muf}} unit pengolah air di Sumatera; bersama calon mitra ParagonCorp, unit itu bisa disiagakan di gudang regional sebelum bencana',
    'Respons teknis ITB dan kedekatan Paragon dipakai untuk air bersih siaga', 'Air Bersih Siaga',
    [{'judul': 'ITB', 'ikon': 'sekolah', 'isi': ['Membuat unit ultrafiltrasi dan menjamin mutunya',
                                                'Melatih operator BPBD di tiap gudang', 'Mengukur mutu air saat dipakai']},
     {'judul': 'Calon mitra: ParagonCorp', 'ikon': 'infrastruktur', 'isi': ['Diajak membiayai unit yang ditempatkan lebih dulu',
                                                              'Karyawan diajak bergabung sebagai relawan penyalur', 'Peran naik dari logistik pangan ke teknologi']},
     {'judul': 'BNPB', 'ikon': 'regulasi', 'isi': ['Logistik dan Peralatan memasukkan unit ke standar stok gudang',
                                                  'Mengirim unit saat darurat', 'Mengakui mitra di laporan publik']}],
    'Paragon sudah ikut program ITB', 'itb.csv', [
        ['Air bersih Agam', ANGKA['agam.liter']['nilai'], 'liter per hari', 'program ITB, April 2026', 'air-baku'],
        ['Paket Paragon', ANGKA['paragon.paket']['nilai'], 'paket', 'di program yang sama', 'pengungsi']],
    'Antara Megapolitan, 4 Apr 2026',
    [('kesehatan', 'Lab Inovasi Kemanusiaan', 'Kit kebersihan pengungsi dirancang dari riset, diuji di Labtek XV.'),
     ('gempa', 'Tim Cek Bangunan Pascagempa', 'Gempa: {{angka:dibi.ITB.gempa_pct}} persen korban jiwa Jabar; PPMB dan Geolini.')],
    'ITB, 22 Jan 2026; Antara Megapolitan, 4 Apr 2026; ITB, 2025; detikInet, 16 Des 2025; ' + AN, ikon='air-baku'))

# 5 Telkom University (B)
S.append(pola_tabel(
    'Telkom University membawa laboratorium metaverse ke sekolah; Telkom, yang menyalurkan {{angka:telkom.paket}} paket di Cianjur, diajak mendanai Sekolah Siaga VR',
    'Contoh pemilik: platform Telkom, kampus Tel-U, turun ke sekolah', 'telu', [
        ['Sekolah Siaga VR', 'Dibangun di CoE Metaverse; mahasiswa jadi fasilitator', 'Telkom Indonesia (satu)', 'Pencegahan'],
        ['PATRIOT-Net Posko', 'Komunikasi posko saat jaringan lumpuh', 'Telkomsel, Telkomsat (dua)', 'Pusdatinkom'],
        ['Modul Guru Siaga', 'Modul guru disusun UPI dan ITB; hasil belajar siswa diuji', 'Telkom Indonesia (satu)', 'Pencegahan']],
    'foto/flood-eye.jpg', 'Flood Eye Telkom University, tahap uji di Semarang', 'Foto: KONEKSI via Katadata',
    [('situs', 'CoE Metaverse', 'Pusat riset dan pengalaman metaverse kampus.'),
     ('peringatan', 'PATRIOT-Net', 'IoT banjir, longsor, gempa terintegrasi BMKG.'),
     ('banjir', 'Flood Eye', 'Prakiraan banjir Semarang, tahap awal di {{angka:floodeye.titik}} titik.')],
    'Telkom Indonesia, 2022; Selular.ID, 2023; Telkom University, 2024; Katadata, 2 Sep 2026; ' + AN, ikon='sekolah'))

# 6 UGM (C)
S.append(pola_aset(
    'Longsor menelan {{angka:dibi.UGM.longsor}} jiwa di Jateng dan DIY; UGM membawa GAMA-EWS yang sudah ada di {{angka:ugm.kab}} kabupaten ke lebih banyak desa bersama calon mitra Telkom',
    'UGM punya produk kebencanaan paling matang', 'ugm', [
        ['GAMA-EWS', 'Peringatan dini longsor berstandar ISO, dihilirkan perusahaan kampus', 'longsor'],
        ['EWS megathrust kabel laut', 'Dikembangkan bersama Telkom, diapresiasi BMKG', 'tsunami'],
        ['DERU UGM', 'Klinik pengungsian sejak Merapi; ratusan kampus ikut pemulihan', 'kesehatan'],
        ['PSBA dan Magister Manajemen Bencana', 'Sekolah aman bencana dan pendidikan pascasarjana', 'sekolah']],
    'GAMA-EWS Desa Longsor', [
        'UGM menjamin mutu alat dan melatih warga pemantau.',
        'PT INTI atau perusahaan kampus diajak memperbanyak alat; Telkom (lapis satu) diajak menyediakan jaringan.',
        'BNPB menetapkan lokasi dari kajian risiko dan menganggarkan pemasangan.',
        'Pengadaan dibuat terbuka sebagai pagar benturan kepentingan, karena penemunya kini memimpin BMKG.'],
    [('tsunami', 'EWS Megathrust Kabel Laut', 'BNPB menjadi pengguna hilir bersama BMKG.'),
     ('kesehatan', 'Klinik Pengungsian DERU', 'Sido Muncul dijajaki (lapis dua); bantuan Sumatera sekitar Rp{{angka:sidomuncul.donasi}} miliar.')],
    'International Consortium on Landslides, 2024; UGM, 2010; CNN Indonesia, 4 Nov 2025; BCA Sekuritas, 2025; ' + DB, ikon='longsor'))

# 7 ITS (B)
S.append(pola_tabel(
    'Mahasiswa ITS sudah merancang rumah sakit terapung di atas kapal {{angka:its.kapal}} m buatan PT PAL; flagship mematangkan rancangan itu untuk bencana kepulauan',
    'Teknik perkapalan ITS tidak dimiliki kampus koordinator lain', 'its', [
        ['Kapal Rumah Sakit', 'Rancangan ITS dimatangkan bersama PAL dan Unair', 'PT PAL (satu)', 'Penanganan Darurat'],
        ['Huntara Cepat Bangun', 'Konsep huntara-huntap hibrida dari Semeru', 'SIG, Petrokimia Gresik (dua)', 'Rehabilitasi'],
        ['Surabaya Tangguh Berasuransi', 'Pembiayaan risiko bencana kota', 'MAIPARK (satu)', 'Sistem dan Strategi']],
    'foto/raisa.jpg', 'Robot RAISA: bukti kerja sama ITS dan Unair', 'Foto: ITS News',
    [('tsunami', 'Puslit MKPI', 'Pemodelan tsunami untuk InaTEWS.'),
     ('rumah', 'Huntara Lombok', '{{angka:its.huntara}} huntara direncanakan pada 2018.'),
     ('kesehatan', 'Unair', 'RS Kapal Ksatria Airlangga sebagai operator.')],
    'Repositori ITS, 2024; Suara Surabaya, 2018; Warta Ekonomi, 2022; JPNN, 2021; ' + AN, ikon='tanggap-darurat'))

# 8 Unram (A)
S.append(pola_kartu(
    'Bali dan Nusa Tenggara mencatat {{angka:dibi.Unram.rumah}} rumah rusak, tertinggi antarregional; Unram dan calon mitra AMMAN membawa rumah ferosemen tahan gempa',
    'Unram tuan rumah gempa Lombok; flagship menjawab rumah rusak', 'Rumah Ferosemen',
    [{'judul': 'Unram', 'ikon': 'sekolah', 'isi': ['Magister Teknik Sipil menyusun desain baku ferosemen',
                                                  'Melatih tukang di desa rawan gempa', 'Menguji mutu bangunan percontohan']},
     {'judul': 'AMMAN, Bank NTB Syariah', 'ikon': 'infrastruktur', 'isi': ['Keduanya calon mitra lapis satu', 'AMMAN diajak membiayai rumah dan sekolah percontohan',
                                                                            'Bank NTB Syariah diajak menyiapkan pembiayaan mikro rumah', 'Tim tanggap darurat AMMAN diajak ikut latihan']},
     {'judul': 'BNPB', 'ikon': 'regulasi', 'isi': ['Rehabilitasi dan Rekonstruksi memakai desain itu',
                                                  'Untuk rumah pascabencana di Nusa Tenggara', 'Menjadikannya acuan rumah stimulan']}],
    'Rekam dan risiko', 'unram.csv', [
        ['Kasur', ANGKA['amman.kasur']['nilai'], 'kasur', 'dari AMMAN', 'pengungsi'],
        ['Korban gempa', ANGKA['dibi.Unram.gempa']['nilai'], 'jiwa', 'Bali dan Nusra, 2016-2025', 'gempa']],
    'PT Amman Mineral Nusa Tenggara, 5 Des 2022; Antara Bali, 2023',
    [('tsunami', 'Mandalika dan Tanjung Benoa Siaga', 'InJourney dan hotel (lapis dua); Unud di Bali.'),
     ('sekolah', 'KKN Desa Tangguh Tsunami', 'Meniru Labuhan Haji di pesisir NTB.')],
    'Universitas Mataram, 2026; AMMAN, 2022; Antara Bali, 2023; ' + DB + '; ' + AN, ikon='rumah'))

# 9 ULM (C)
S.append(pola_aset(
    'Karhutla mencapai {{angka:dibi.ULM.karhutla}} persen kejadian di Kalimantan; ULM memetakan risiko banjir dan api bersama calon mitra PLN, yang memulihkan {{angka:pln.gardu}} gardu saat banjir 2021',
    'ULM kuat di data lahan basah; PLN berkepentingan melindungi gardunya', 'ulm', [
        ['PPIIG ULM', 'Analisis faktor banjir di {{angka:ulm.kab}} kabupaten dan kota Kalsel', 'data'],
        ['Pusat Studi Kebencanaan', 'Sumur bor pembasahan gambut di Banjarbaru', 'karhutla'],
        ['Hutan mangrove Kotabaru', 'Hutan pendidikan untuk riset lahan basah', 'gelombang-abrasi'],
        ['Kemitraan PLN', 'Riset dan SDM bersama PLN Kalimantan sejak 2025', 'infrastruktur']],
    'Peta Lahan Basah', [
        'ULM memetakan risiko banjir dan api untuk desa dan jaringan listrik.',
        'PLN (lapis satu) diajak membiayai pemetaan di sekitar gardu dan jalur transmisi.',
        'BNPB memakai peta itu untuk kajian risiko provinsi.',
        'Untan menjadi rujukan pakar gambut.'],
    [('karhutla', 'Desa Gambut Siaga Api', 'Bersama Pertamina Hulu Indonesia (lapis dua).'),
     ('gelombang-abrasi', 'Sabuk Mangrove Kotabaru', 'Adaro hanya membawa alat dan bibit (lapis tiga).')],
    'ULM, 1 Feb 2025; CNBC Indonesia, 18 Jan 2021; Antara Kalsel, 2023; ' + DB + '; ' + AN, ikon='banjir'))

# 10 Unhas (A)
S.append(pola_kartu(
    'Gempa dan tsunami menelan {{angka:dibi.Unhas.gempa}} jiwa di Sulawesi; Unhas memperluas kajian bencana bersama Masmindo ke calon mitra industri lain',
    'Unhas sudah punya MoU kajian bencana dengan perusahaan', 'Industri Sadar Risiko',
    [{'judul': 'Unhas', 'ikon': 'sekolah', 'isi': ['Tim Kajian Kebencanaan menilai risiko wilayah operasi',
                                                  'Menyiapkan peringatan dini dan latihan desa sekitar', 'Menjaga kajian tetap independen']},
     {'judul': 'Calon mitra: Semen Tonasa, Masmindo', 'ikon': 'infrastruktur', 'isi': ['Masmindo sudah meneken MoU kajian bencana Luwu pada 2024',
                                                                              'Semen Tonasa diajak memakai model yang sama', 'Vale hanya dengan pagar, di luar wilayah Towuti']},
     {'judul': 'BNPB', 'ikon': 'regulasi', 'isi': ['Sistem dan Strategi menetapkan format kajian',
                                                  'Supaya sejalan dengan kajian risiko daerah', 'Memasukkan hasilnya ke rencana kontinjensi']}],
    'Mengapa Sulawesi', 'unhas.csv', [
        ['Korban jiwa', ANGKA['dibi.Unhas.mati']['nilai'], 'jiwa', 'meninggal dan hilang, semua bencana', 'jiwa'],
        ['Porsi gempa', ANGKA['dibi.Unhas.gempa_pct']['nilai'], '%', 'korban jiwa dari gempa dan tsunami', 'gempa']],
    'DIBI BNPB 2016-2025',
    [('likuefaksi', 'Peta Likuefaksi Palu dan Mamuju', 'Untuk tata ruang, bersama alat Untad.'),
     ('pengungsi', 'Logistik Laut Gempa Sulawesi', 'Bersama Kalla Group (lapis dua).')],
    'Bisnis.com, 17 Jul 2024; Kompas TV, 2021; Fakultas Teknik Unhas, 2019; ' + DB + '; ' + AN, ikon='gempa'))

# 11 Unpatti (C)
S.append(pola_aset(
    'Gempa Ambon 2019 membuat {{angka:ambon.mengungsi}} warga mengungsi; Unpatti membawa kesiapsiagaan tsunami ke pulau kecil bersama calon mitra Telkomsel dan INPEX',
    'Unpatti kampus di dalam zona bencana, kembaran USK untuk pulau kecil', 'unpatti', [
        ['Riset tsunami Ambon', 'Tata ruang Ambon bersama TDMRC USK sejak 2022', 'tsunami'],
        ['Jejaring IRIDeS Tohoku', 'Lokakarya rekayasa tsunami 2024', 'lembaga'],
        ['Edukasi pulau kecil', 'Pengabdian gempa dan tsunami di Saparua dan Negeri Lima', 'sekolah'],
        ['Kemitraan INPEX', 'Beasiswa untuk {{angka:inpex.mhs}} mahasiswa dan laboratorium Blok Masela', 'pembiayaan']],
    'Pulau Siaga Tsunami', [
        'Unpatti memimpin dengan riset tata ruang tsunami dan edukasi pulau kecilnya; USK mendampingi.',
        'Telkomsel (lapis dua) diajak membawa jaringan dan kanal pesan peringatan.',
        'INPEX (lapis satu) diajak mendanai kajian dan latihan.',
        'Pusdatinkom dan Pencegahan BNPB memakai kanal itu.',
        'Unkhair membawa pengalaman Pusat Studi Bencana untuk Maluku Utara.'],
    [('sekolah', 'Kampus Aman Bencana Unpatti', 'Contoh kawasan timur; PLN dijajaki.'),
     ('tanggap-darurat', 'Papua lewat Uncen', 'Freeport hanya membawa fasilitas dan tim (lapis tiga).')],
    'ITS, 2019; Republika, 2021; Antara Ambon, 2023 dan 2025; ' + AN, ikon='tsunami'))

# 12 IPB (B)
S.append(pola_tabel(
    'IPB sudah melatih {{angka:ipb.peserta}} peserta dari {{angka:ipb.negara}} negara; Akademi Pemadam Gambut diusulkan menyeragamkan latihan semua regu pemadam gambut',
    'Pusat latih api IPB dijadikan tempat sertifikasi regu', 'ipb', [
        ['Akademi Pemadam Gambut', 'Kurikulum baku dan sertifikat untuk semua regu pemadam', 'Pertamina Hulu Rokan (dua)', 'Penanganan Darurat'],
        ['FFEWS Desa Gambut', 'Alat peringatan api murah diperbanyak', 'Asian Agri, Telkomsel (dua)', 'Pencegahan'],
        ['Verifikasi Desa Bebas Api', 'Klaim bebas api diuji dengan data hotspot BNPB', 'Belum ada; dijajaki', 'Sistem dan Strategi']],
    'foto/ffews.jpg', 'FFEWS, peringatan dini karhutla gambut IPB', 'Foto: Mongabay Indonesia',
    [('karhutla', 'RFMRC-SEA', 'Pusat regional GFMC untuk Asia Tenggara sejak 2017.'),
     ('kapasitas', 'Pusat latih api gambut', 'Diresmikan pada Juni 2024.'),
     ('regulasi', 'Pakar forensik api', 'Saksi ahli di {{angka:ipb.perkara}} perkara; wajib aturan konflik kepentingan.')],
    'IPB University, 9 Mei 2025; RFMRC-SEA; Mongabay Indonesia, 2018; Pertamina, 2025; ' + AN, ikon='karhutla'))

# Kembaran kampus
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan',
    'pesan': 'Kampus saling menguatkan lewat kelompok kembaran',
    'judul': 'Sebanyak {{angka:ks.kembar}} kelompok kampus saling menguatkan; alat satu kampus ikut dipakai di regional lain',
    'rasio': 0.66,
    'utama': {'judul': 'Kelompok kembaran', 'ikon': 'lembaga',
              'kolom_teks': {'mode': 'kartu', 'huruf_maks': 20, 'kolom': kalimat([
                  {'judul': 'USK dan Unpatti', 'ikon': 'tsunami', 'isi': [
                      'Flume dan kurikulum tsunami USK diusulkan dipakai di pulau kecil Maluku', 'Sudah meneliti tata ruang Ambon bersama sejak 2022'],
                   'statistik': {'nilai': '{{angka:usk.flume}} m', 'ket': 'panjang flume tsunami TDMRC'}},
                  {'judul': 'ITB, Telkom University, UPI', 'ikon': 'sekolah', 'isi': [
                      'ITB menjamin isi ilmiah, Tel-U membuat VR, UPI menyusun modul guru', 'Satu paket edukasi untuk semua regional'],
                   'statistik': {'nilai': '{{angka:itb.kampus}}', 'ket': 'kampus dalam lokakarya pemulihan pimpinan ITB'}},
                  {'judul': 'Unhas dan Untad', 'ikon': 'likuefaksi', 'isi': [
                      'Kajian Unhas dan alat deteksi likuefaksi Untad', 'Untuk tata ruang Palu dan Mamuju'],
                   'statistik': {'nilai': '{{angka:untad.akurasi|persen}}', 'ket': 'akurasi uji laboratorium alat Untad'}},
              ])}},
    'panel': {'judul': 'Kampus sekitar sebagai pelaksana', 'ikon': 'wilayah',
              'daftar_ikon': ikon_baris('sekitar.csv', [
                  ['Unimal', 'Relawan medis Aceh Utara', 'kesehatan'],
                  ['Unri dan Unsri', 'Satelit gambut flagship IPB', 'karhutla'],
                  ['Unair', 'Operator kapal rumah sakit ITS', 'tanggap-darurat'],
                  ['UII', 'Rumah tahan gempa BARRATAGA', 'rumah'],
                  ['Unud', 'Tanjung Benoa siaga tsunami', 'tsunami']], AN + '; riset.json', 'terverifikasi')},
    'sumber': AN + '; riset web BNPB 2026',
})

# ------------------------------------------------------------------ Bagian 3: pelaksanaan
S.append({'jenis': 'pembatas-seksi', 'bagian': 3})

PIL = ['Fondasi', 'Pendidikan', 'Riset dan inovasi', 'Pengabdian dan relawan']
UNIT = ['Sistem dan Strategi', 'Pencegahan', 'Penanganan Darurat', 'Rehabilitasi dan Rekonstruksi', 'Logistik dan Peralatan', 'Pusdatinkom']
AJ = [  # (kampus, program, pilar, unit, lapis)
    ('USK', 'Uji Tsunami Nasional', 'Riset dan inovasi', 'Pencegahan', 'BSI (satu); PEMA (dijajaki)'),
    ('USK', 'Belajar dari Senyar', 'Pengabdian dan relawan', 'Logistik dan Peralatan', 'MedcoEnergi, Telkomsel (dua)'),
    ('USK', 'Beasiswa Magister', 'Pendidikan', 'Sistem dan Strategi', 'BSI (satu)'),
    ('Unand', 'Padang Siap Megathrust', 'Pengabdian dan relawan', 'Pencegahan', 'Pegadaian, Hutama Karya (satu)'),
    ('Unand', 'Siaga Galodo Sumbar', 'Riset dan inovasi', 'Pencegahan', 'Semen Padang (dua)'),
    ('Unand', 'KKN Pesisir Megathrust', 'Pengabdian dan relawan', 'Pencegahan', 'Pegadaian (satu)'),
    ('UI', 'Jakarta Tetap Bekerja', 'Pengabdian dan relawan', 'Pencegahan', 'Mandiri (dua); Astra, PHR (uji tuntas)'),
    ('UI', 'Tim Medis dan Psikososial', 'Pengabdian dan relawan', 'Penanganan Darurat', 'Astra (dua, uji tuntas)'),
    ('UI', 'Selat Sunda Siaga Tsunami', 'Pengabdian dan relawan', 'Pencegahan', 'Industri Banten (dijajaki)'),
    ('ITB', 'Air Bersih Siaga', 'Riset dan inovasi', 'Logistik dan Peralatan', 'ParagonCorp (satu)'),
    ('ITB', 'Lab Inovasi Kemanusiaan', 'Riset dan inovasi', 'Logistik dan Peralatan', 'ParagonCorp (satu)'),
    ('ITB', 'Tim Cek Bangunan Pascagempa', 'Pengabdian dan relawan', 'Rehabilitasi dan Rekonstruksi', 'Telkomsel (satu)'),
    ('Tel-U', 'Sekolah Siaga VR', 'Pendidikan', 'Pencegahan', 'Telkom Indonesia (satu, uji tuntas)'),
    ('Tel-U', 'PATRIOT-Net Posko', 'Riset dan inovasi', 'Pusdatinkom', 'Telkomsel, Telkomsat (dua)'),
    ('Tel-U', 'Modul Guru Siaga', 'Pendidikan', 'Pencegahan', 'Telkom Indonesia (satu, uji tuntas)'),
    ('UGM', 'GAMA-EWS Desa Longsor', 'Riset dan inovasi', 'Pencegahan', 'Telkom (satu, uji tuntas); PT INTI (dijajaki)'),
    ('UGM', 'EWS Megathrust Kabel Laut', 'Riset dan inovasi', 'Pencegahan', 'Telkom (satu, uji tuntas)'),
    ('UGM', 'Klinik Pengungsian DERU', 'Pengabdian dan relawan', 'Penanganan Darurat', 'Sido Muncul (dua)'),
    ('ITS', 'Kapal Rumah Sakit', 'Riset dan inovasi', 'Penanganan Darurat', 'PT PAL (satu)'),
    ('ITS', 'Huntara Cepat Bangun', 'Riset dan inovasi', 'Rehabilitasi dan Rekonstruksi', 'SIG, Petrokimia Gresik (dua)'),
    ('ITS', 'Surabaya Tangguh Berasuransi', 'Fondasi', 'Sistem dan Strategi', 'MAIPARK (satu)'),
    ('Unram', 'Rumah Ferosemen', 'Pengabdian dan relawan', 'Rehabilitasi dan Rekonstruksi', 'Bank NTB Syariah (satu); AMMAN (uji tuntas)'),
    ('Unram', 'Mandalika dan Tanjung Benoa Siaga', 'Pengabdian dan relawan', 'Pencegahan', 'InJourney, hotel (dua)'),
    ('Unram', 'KKN Desa Tangguh Tsunami', 'Pengabdian dan relawan', 'Pencegahan', 'Bank NTB Syariah (satu)'),
    ('ULM', 'Peta Lahan Basah', 'Fondasi', 'Sistem dan Strategi', 'PLN (satu)'),
    ('ULM', 'Desa Gambut Siaga Api', 'Pengabdian dan relawan', 'Penanganan Darurat', 'Pertamina Hulu Indonesia (uji tuntas)'),
    ('ULM', 'Sabuk Mangrove Kotabaru', 'Riset dan inovasi', 'Pencegahan', 'Adaro, aset saja (tiga)'),
    ('Unhas', 'Industri Sadar Risiko', 'Riset dan inovasi', 'Sistem dan Strategi', 'Semen Tonasa (satu); Masmindo (uji tuntas); Vale (tiga)'),
    ('Unhas', 'Peta Likuefaksi Palu dan Mamuju', 'Fondasi', 'Sistem dan Strategi', 'Belum ada; dijajaki'),
    ('Unhas', 'Logistik Laut Gempa Sulawesi', 'Pengabdian dan relawan', 'Logistik dan Peralatan', 'Kalla Group (dua)'),
    ('Unpatti', 'Pulau Siaga Tsunami', 'Riset dan inovasi', 'Pusdatinkom', 'Telkomsel (dua); INPEX (satu)'),
    ('Unpatti', 'Kampus Aman Bencana Unpatti', 'Pengabdian dan relawan', 'Pencegahan', 'PLN (dijajaki)'),
    ('Unpatti', 'Papua lewat Uncen', 'Pengabdian dan relawan', 'Penanganan Darurat', 'Freeport, aset saja (tiga)'),
    ('IPB', 'Akademi Pemadam Gambut', 'Pendidikan', 'Penanganan Darurat', 'Pertamina Hulu Rokan (dua, uji tuntas)'),
    ('IPB', 'FFEWS Desa Gambut', 'Riset dan inovasi', 'Pencegahan', 'Asian Agri, Telkomsel (dua)'),
    ('IPB', 'Verifikasi Desa Bebas Api', 'Riset dan inovasi', 'Sistem dan Strategi', 'Belum ada; dijajaki'),
]
A('ks.ajuan', len(AJ), 'ajuan', 'analisis', AN, 'asumsi-kebijakan')
hit = collections.Counter((u, p) for _, _, p, u, _ in AJ)
assert set(u for _, _, _, u, _ in AJ) == set(UNIT)
mat = tulis('unit_pilar.csv', ['unit'] + ['p%d' % i for i in range(4)], [[u] + [hit[(u, p)] for p in PIL] for u in UNIT])
A('ks.pencegahan', sum(v for (u, _), v in hit.items() if u == 'Pencegahan'), 'ajuan', 'analisis', AN, 'asumsi-kebijakan')
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan',
    'pesan': 'Ajuan program menyentuh keenam unit BNPB dan keempat pilar paparan',
    'judul': 'Sebanyak {{angka:ks.ajuan}} ajuan program menyentuh keenam unit BNPB, dengan {{angka:ks.pencegahan}} ajuan untuk Pencegahan',
    'rasio': 0.6,
    'utama': {'judul': 'Jumlah ajuan per unit BNPB dan pilar paparan', 'ikon': 'data',
              'subjudul_grafik': 'Flagship dan ajuan pendukung dua belas kampus',
              'heatmap': {'mode': 'angka', 'ramp': 'netral', 'ambang': [1, 2, 4, 6], 'satuan': 'Jumlah ajuan',
                          'data': D(mat, [{'nama': 'unit'}] + [{'nama': 'p%d' % i, 'kepala': k, 'fmt': '0'} for i, k in enumerate(['Fondasi', 'Pendidikan', 'Riset', 'Pengabdian'])],
                                    AN, 'asumsi-kebijakan')}},
    'panel': {'judul': 'Cara membaca', 'ikon': 'ringkasan', 'daftar': [
        'Tiap ajuan mewujudkan satu program di paparan sebelumnya, jadi tidak menambah wadah baru.',
        'Pencegahan paling banyak karena peringatan dini dan edukasi paling siap dikerjakan bersama swasta.',
        'Pusdatinkom dan Rehabilitasi paling sedikit; keduanya bisa diisi lewat Satu Data Bencana dan Bank Masalah.',
        'Daftar lengkap ajuan beserta calon mitranya ada di lampiran.']},
    'sumber': AN + '; ' + R4,
})

# Insentif
aturan = tulis('aturan.csv', ['aturan', 'isi', 'manfaat'], [
    ['UU 24/2007 Pasal 28', 'Lembaga usaha ikut menanggulangi bencana', 'Dasar keikutsertaan swasta'],
    ['PMK Nomor 114 Tahun 2025', 'Sumbangan bencana dan litbang ke kampus', 'Dibiayakan hingga 5% penghasilan neto'],
    ['PP 45/2019', 'Insentif litbang, proposal ditelaah BRIN', 'Pengurang biaya litbang berlipat'],
    ['Dana Padanan Kemdiktisaintek', 'Kontribusi industri dipadankan negara', 'Dana riset kampus berlipat'],
    ['TJSL BUMN', 'Program sosial dan lingkungan BUMN', 'Masuk laporan TJSL'],
    ['Pemakaian insentif litbang', 'Baru sekitar 30 wajib pajak yang mengajukan', 'Pendampingan klaim dari meja insentif BNPB'],
])
S.append({
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan',
    'pesan': 'Aturan sudah memberi insentif bagi swasta, tetapi jarang dipakai',
    'judul': 'Sumbangan bencana dan litbang ke kampus dapat dibiayakan hingga {{angka:pmk114.batas|persen}} penghasilan neto, tetapi insentif litbang baru dipakai sekitar {{angka:sd.wp}} wajib pajak',
    'rasio': 0.7,
    'tabel': {'judul_panel': 'Dasar hukum dan insentif bagi calon mitra', 'ikon': 'regulasi', 'peringkat': False, 'sel_dua_baris': True,
              'sel_maks_baris': 3, 'skala_huruf': 1.55, 'baris_maks_pt': 64,
              'data': D(aturan, [{'nama': 'aturan', 'kepala': 'Aturan'}, {'nama': 'isi', 'kepala': 'Isi', 'rata': 'l'},
                                 {'nama': 'manfaat', 'kepala': 'Manfaat bagi mitra', 'rata': 'l'}], 'JDIH BNPB; JDIH Kementerian Keuangan; Kemdiktisaintek', 'resmi')},
    'panel': {'judul': 'Skala insentif', 'ikon': 'pembiayaan',
              'angka_besar': kartu_angka('insentif.csv', [
                  ['Insentif litbang', ANGKA['sd.persen']['nilai'], '%', 'pengurang biaya litbang paling tinggi', 'pembiayaan'],
                  ['Dana Padanan', ANGKA['mf.dana']['nilai'], 'miliar rupiah', 'anggaran untuk kampus, 2024', 'sekolah']],
                  'DDTC News, 2024; VIVA dan Infobanknews, 2024')},
    'sumber': 'PMK 114/2025; PP 45/2019 dan PMK 81/2024 (DDTC News, 2024); UU 24/2007; Kemdiktisaintek',
})

# Pagar
pagar = tulis('pagar.csv', ['mitra', 'isu', 'aturan'], [
    ['Agincourt', 'Digugat KLH usai banjir Batang Toru', 'Tidak diajukan'],
    ['APP dan pemasoknya', 'Pemasok disanksi, kebakaran 2026', 'Tidak diajukan; boleh ikut latih'],
    ['Grup Astra', 'Induk Agincourt', 'Uji tuntas; di luar Sumut'],
    ['Adaro', 'Banjir Kalsel dikaitkan tambang', 'Lapis tiga; alat dan bibit'],
    ['Vale Indonesia', 'Pipa minyak bocor di Towuti', 'Lapis tiga; di luar wilayah Towuti'],
    ['Freeport Indonesia', 'Isu tailing dan Papua', 'Lapis tiga; fasilitas dan tim'],
    ['Grup Telkom, Infomedia', 'Perkara kredit fiktif anak usaha', 'Uji tuntas; lewat Telkomsel'],
    ['Grup Pertamina (PHR, PHI)', 'Perkara tata kelola minyak mentah', 'Uji tuntas; klausul tata kelola'],
    ['Masmindo dan AMMAN', 'Tambang di daerah rawan bencana', 'Uji tuntas; kajian independen'],
    ['Industri rokok', 'PP 28/2024: larangan sponsor anak', 'Tidak untuk program sekolah'],
])
S.append({
    'jenis': 'tabel-peringkat', 'jenis_slide': 'panel', 'judul_bentuk': 'temuan',
    'pesan': 'Calon mitra berisiko dibedakan: lapis tiga membawa aset saja, sisanya wajib uji tuntas',
    'judul': 'Sebanyak {{angka:ks.l3}} calon mitra lapis tiga hanya membawa aset, {{angka:ks.ut}} kelompok wajib uji tuntas, dan perusahaan tersanksi tidak diajukan',
    'rasio': 0.7,
    'tabel': {'judul_panel': 'Calon mitra berisiko dan aturan pakainya', 'ikon': 'peringatan', 'peringkat': False, 'sel_dua_baris': True,
              'sel_maks_baris': 2, 'skala_huruf': 1.3, 'baris_maks_pt': 40,
              'data': D(pagar, [{'nama': 'mitra', 'kepala': 'Calon mitra'}, {'nama': 'isu', 'kepala': 'Isu', 'rata': 'l'},
                                {'nama': 'aturan', 'kepala': 'Aturan pakai', 'rata': 'l'}], 'riset.json; Kontan; Tirto; Detik Finance; PP 28/2024', 'terverifikasi')},
    'panel': {'judul': 'Isu yang tercatat', 'ikon': 'peringatan',
              'angka_besar': kartu_angka('pagar_angka.csv', [
                  ['Gugatan Agincourt', ANGKA['agincourt.gugatan']['nilai'], 'miliar rupiah', 'oleh KLH, Jan 2026', 'regulasi'],
                  ['Perkara Infomedia', ANGKA['infomedia.kasus']['nilai'], 'miliar rupiah', 'pembiayaan fiktif, Mei 2025', 'peringatan']],
                  'Kontan, 15 Jan 2026; Tirto, 8 Mei 2025', fmt='2')},
    'sumber': 'Kontan, 15 Jan 2026; Tirto, 8 Mei 2025; Detik Finance, 1 Agt 2025; PP 28/2024; riset.json',
})

# Prioritas gelombang
pri = tulis('prioritas.csv', ['flagship', 'aset', 'mitra', 'bukti', 'risiko', 'gelombang'], [
    ['Unand: Padang Siap Megathrust', 3, 4, 4, 4, 'Gelombang satu, total 15'],
    ['ITB: Air Bersih Siaga', 4, 4, 4, 3, 'Gelombang satu, total 15'],
    ['USK: Uji Tsunami Nasional', 4, 3, 3, 4, 'Gelombang satu, total 14'],
    ['UGM: GAMA-EWS Desa Longsor', 4, 3, 4, 2, 'Gelombang satu, total 13'],
    ['Unhas: Industri Sadar Risiko', 3, 4, 3, 2, 'Gelombang satu, total 12'],
    ['Unram: Rumah Ferosemen', 3, 3, 3, 2, 'Gelombang dua, total 11'],
    ['IPB: Akademi Pemadam Gambut', 4, 2, 3, 2, 'Gelombang dua, total 11'],
    ['ULM: Peta Lahan Basah', 2, 3, 2, 3, 'Gelombang dua, total 10'],
    ['UI: Jakarta Tetap Bekerja', 3, 3, 2, 2, 'Gelombang dua, total 10'],
    ['ITS: Kapal Rumah Sakit', 3, 3, 1, 3, 'Gelombang dua, total 10'],
    ['Unpatti: Pulau Siaga Tsunami', 2, 3, 2, 2, 'Gelombang dua, total 9'],
    ['Tel-U: Sekolah Siaga VR', 2, 4, 1, 2, 'Gelombang dua, total 9']])
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'matriks', 'judul_bentuk': 'temuan',
    'pesan': 'Flagship dijalankan dalam dua gelombang menurut kesiapannya',
    'judul': 'Sebanyak {{angka:ks.gel1}} flagship paling siap dijalankan pada 2027; {{angka:ks.gel2}} lainnya masuk gelombang kedua setelah celah bukti dan calon mitranya dicek',
    'rasio': 0.66,
    'utama': {'judul': 'Kesiapan tiap flagship', 'ikon': 'ringkasan',
              'subjudul_grafik': 'Aset kampus, calon mitra yang sudah bekerja dengan kampus, bukti lapangan, risiko reputasi rendah',
              'harvey': {'bentuk': 'bola', 'tingkat': ['Belum ada', 'Awal', 'Ada', 'Kuat', 'Sangat kuat'], 'skala_huruf': 1.1,
                         'data': D(pri, [{'nama': 'flagship'}, {'nama': 'aset', 'kepala': 'Aset', 'fmt': '0'},
                                         {'nama': 'mitra', 'kepala': 'Mitra', 'fmt': '0'}, {'nama': 'bukti', 'kepala': 'Bukti', 'fmt': '0'},
                                         {'nama': 'risiko', 'kepala': 'Aman', 'fmt': '0'}, {'nama': 'gelombang', 'kepala': 'Gelombang', 'catatan': True}],
                                   AN + '; riset.json', 'penilaian-pakar')}},
    'panel': {'judul': 'Cara memilih', 'ikon': 'regulasi', 'daftar_ikon': ikon_baris('cara_memilih.csv', [
        ['Ambang', 'Gelombang satu bila total minimal dua belas dari enam belas', 'regulasi'],
        ['Aset', 'Fasilitas atau produk kampus yang dipakai flagship', 'sekolah'],
        ['Mitra', 'Calon mitra terkuat; lapis satu bernilai tertinggi', 'pembiayaan'],
        ['Bukti', 'Sudah dipakai di bencana nyata atau di lapangan', 'data'],
        ['Aman', 'Ada bila calon mitra wajib uji tuntas; kuat bila isu ringan', 'peringatan']], AN, 'penilaian-pakar')},
    'sumber': AN + '; riset web BNPB 2026',
})

# Tahapan
S.append({
    'jenis': 'temuan-visual', 'jenis_slide': 'grafik', 'judul_bentuk': 'temuan',
    'pesan': 'Flagship berjalan tiga tahap',
    'judul': 'Flagship mengikuti {{angka:ks.tahap}} tahap peta jalan paparan sebelumnya: seratus hari pertama, percontohan 2027, lalu perluasan 2028 sampai 2029',
    'utama': {'judul': 'Tahapan flagship', 'ikon': 'kalender',
              'alur': {'sorot': 1, 'label_hasil': 'Hasil', 'skala_huruf': 1.3, 'langkah': [
                  {'judul': 'Seratus hari pertama', 'butir': ['Unit BNPB pasangan tiap flagship', 'Uji tuntas calon mitra',
                                                    'Surat minat ke mitra lapis satu', 'Cek celah bukti ke kampus'], 'pelaku': 'BNPB dan kampus koordinator',
                   'hasil': 'Calon mitra sepakat'},
                  {'judul': 'Percontohan 2027', 'butir': ['Satu lokasi tiap flagship', 'Ukuran hasil disepakati',
                                                          'Laporan publik pertama', 'MoU dengan mitra lapis satu'], 'pelaku': 'Kampus, mitra, BNPB',
                   'hasil': 'Hasil terukur'},
                  {'judul': 'Perluasan 2028 sampai 2029', 'butir': ['Ditiru kampus sekitar', 'Masuk standar dan e-Katalog',
                                                                     'Mitra lapis dua bergabung', 'Laporan publik tahunan'], 'pelaku': 'Kampus sekitar dan BPBD',
                   'hasil': 'Program tetap'}]}},
    'pita': pita('Ukuran hasil yang dipakai semua flagship', [
        ('infrastruktur', 'Terpasang', 'Unit alat dan rumah yang dipakai warga.'),
        ('kapasitas', 'Terlatih', 'Orang dan regu yang lulus latihan bersama kampus.'),
        ('data', 'Dilaporkan', 'Laporan publik tahunan dengan kampus sebagai penilai.')], 'data'),
    'sumber': R4 + '; ' + AN,
})

S.append({
    'jenis': 'rekomendasi', 'jenis_slide': 'rekomendasi', 'judul_bentuk': 'temuan',
    'pesan': 'Keputusan Kepala BNPB untuk memulai flagship',
    'judul': 'Sebanyak {{angka:ks.keputusan}} langkah yang diminta dari Kepala BNPB untuk memulai flagship kampus dan swasta',
    'rekomendasi': [
        {'kode': '01', 'jenis': 'regulasi', 'langkah': 'Setujui gelombang satu',
         'rincian': 'Lima flagship paling siap menjadi isi tahap 2027; tujuh lainnya disiapkan untuk gelombang kedua.',
         'lembaga': ['Kepala BNPB'], 'dasar': 'slide 29', 'risiko': 'Tanpa persetujuan, penjajakan mitra tidak punya mandat resmi.'},
        {'kode': '02', 'jenis': 'kapasitas', 'langkah': 'Tunjuk unit pasangan',
         'rincian': 'Tiap flagship mendapat satu unit BNPB penanggung jawab dan satu penghubung kampus.',
         'lembaga': ['Sekretaris Utama BNPB'], 'dasar': 'slide 26', 'risiko': 'Flagship tanpa pemilik di BNPB berhenti di MoU.'},
        {'kode': '03', 'jenis': 'regulasi', 'ikon': 'peringatan', 'langkah': 'Terbitkan pedoman uji tuntas',
         'rincian': 'Aturan tiga lapis dan aturan pakai mitra berpagar menjadi lampiran tiap MoU.',
         'lembaga': ['Deputi Bidang Sistem dan Strategi BNPB'], 'dasar': 'slide 28', 'risiko': 'Mitra bermasalah merusak kepercayaan publik pada BNPB.'},
        {'kode': '04', 'jenis': 'data', 'ikon': 'telepon', 'langkah': 'Kirim surat minat lapis satu',
         'rincian': 'Surat minat ke calon mitra lapis satu; lebih dulu ke Paragon, Pegadaian, Hutama Karya, BSI, Semen Tonasa; Telkom dan Masmindo setelah uji tuntas.',
         'lembaga': ['Kampus koordinator', 'Deputi Bidang Sistem dan Strategi BNPB'], 'dasar': 'slide 11', 'risiko': 'Mitra dapat menolak bila tawaran hanya meminta dana.'},
        {'kode': '05', 'jenis': 'pembiayaan', 'langkah': 'Buka meja insentif mitra',
         'rincian': 'Membantu perusahaan memakai pengurang pajak sumbangan bencana dan litbang ke kampus.',
         'lembaga': ['Deputi Bidang Sistem dan Strategi BNPB'], 'dasar': 'slide 27', 'risiko': 'Tanpa pendampingan, insentif pajak tetap jarang dipakai.'},
        {'kode': '06', 'jenis': 'data', 'ikon': 'ringkasan', 'langkah': 'Hitung biaya dan cek celah',
         'rincian': 'Biaya tiap flagship gelombang satu dihitung bersama kampus, dan celah bukti di lampiran dicek sebelum MoU.',
         'lembaga': ['Kampus koordinator', 'Sekretaris Utama BNPB'], 'dasar': 'slide 6', 'risiko': 'Tanpa angka biaya, flagship sulit masuk perencanaan 2027.'},
    ],
    'sumber': R4 + '; ' + AN,
})

S.append({'jenis': 'penutup', 'layout': 'putih', 'foto': FOTO_KAMPUS, 'kredit': KREDIT_KAMPUS,
          'logo_kanan': 'foto/berakhlak-hd.png',
          'laporan': 'Ajuan Program Flagship Campus-first: Kerja Sama BNPB dengan Kampus dan Swasta', 'tanggal_pil': True})

# ------------------------------------------------------------------ Lampiran
S.append({'jenis': 'pembatas-lampiran', 'kelompok': {'A': 'Rincian ajuan program'}})
aj_csv = tulis('lampiran_ajuan.csv', ['kampus', 'program', 'unit', 'mitra'], [[k, p, u, m] for k, p, _, u, m in AJ])
S.append({'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'kode': 'A1',
          'pesan': 'Daftar lengkap ajuan', 'judul': 'Daftar flagship dan ajuan pendukung beserta calon mitra',
          'judul_daftar': 'Daftar ajuan program',
          'data': D(aj_csv, [{'nama': 'kampus', 'kepala': 'Kampus'}, {'nama': 'program', 'kepala': 'Program'},
                             {'nama': 'unit', 'kepala': 'Unit BNPB'}, {'nama': 'mitra', 'kepala': 'Calon mitra (lapis)'}], AN, 'asumsi-kebijakan'),
          'sumber': AN})
celah = tulis('lampiran_celah.csv', ['kampus', 'celah', 'cara'], sorted([
    ['Tel-U', 'VR edukasi bencana belum pernah dijalankan; status metaNesia', 'Tanya Telkom dan Tel-U'],
    ['IPB', 'Pendana pusat latih api; sikap atas peserta berbayar', 'Tanya RFMRC-SEA'],
    ['ITS', 'Perjanjian tiga pihak ITS, PAL, Unair belum ada', 'Tanya ITS dan PAL'],
    ['ULM', 'Rekam ULM saat banjir Kalsel 2021', 'Tanya LPPM ULM'],
    ['Unpatti', 'Pusat studi kebencanaan resmi', 'Tanya LPPM Unpatti'],
    ['Unram', 'Pusat studi bencana dan prodi mitigasi', 'Tanya LPPM Unram'],
    ['USK', 'Status paten produk TDMRC', 'Cek PDKI DJKI'],
    ['USK', 'Kerja sama PEMA dengan USK di luar hulu migas', 'Tanya USK dan PEMA'],
    ['UI', 'Kerja sama UI dengan Astra atau Mandiri', 'Tanya DRRC UI'],
    ['UGM dan Tel-U', 'Uji tuntas Grup Telkom sebelum surat minat', 'Pedoman uji tuntas'],
    ['Unhas', 'Uji tuntas Masmindo, tambang di daerah rawan', 'Pedoman uji tuntas'],
    ['Kampus sekitar', 'UNJ, Untirta, UB, Undana, Unmul, Unsrat belum dicari', 'Riset lanjutan'],
    ['USK', 'Jalur MedcoEnergi ke USK belum ada', 'Tanya Medco dan TDMRC'],
    ['USK', 'Pusat studi kebencanaan USU', 'Tanya LPPM USU'],
    ['Unand', 'Tahun berdiri dan kepala Pusat Studi Bencana', 'Tanya LPPM Unand'],
    ['Unhas', 'Nama prodi manajemen bencana', 'Tanya Unhas'],
    ['Unpatti', 'Kerja sama dengan Telkomsel dan Bank Maluku', 'Tanya Unpatti'],
    ['UGM', 'Jumlah unit dan paten GAMA-EWS terbaru', 'Tanya DPUI UGM'],
    ['ITS', 'Kerja sama riset ITS dengan SIG', 'Tanya ITS'],
    ['Unram', 'Tanggal MoU Bank NTB Syariah dari laman resmi', 'Tanya Unram'],
    ['Semua mitra', 'Belum satu pun calon mitra ditanya kesediaannya', 'Surat minat ke calon mitra']], key=lambda x: (x[0] in ('Kampus sekitar', 'Semua mitra'), x[0])))
S.append({'jenis': 'lampiran-tabel', 'jenis_slide': 'lampiran', 'judul_bentuk': 'deskriptif', 'kode': 'A2',
          'pesan': 'Celah bukti yang perlu dicek', 'judul': 'Celah bukti yang perlu dicek ke kampus dan calon mitra sebelum MoU',
          'judul_daftar': 'Celah bukti',
          'data': D(celah, [{'nama': 'kampus', 'kepala': 'Kampus'}, {'nama': 'celah', 'kepala': 'Celah'},
                            {'nama': 'cara', 'kepala': 'Cara cek'}], AN + '; riset.json', 'penilaian-pakar'),
          'sumber': AN + '; riset web BNPB 2026'})

# logo kampus di kepala dua belas halaman kampus (pemilik 2 Nov 2026: "Tampilkan juga logo2 univnya, jangan kosongan")
_hal_kampus = [sp for sp in S if (sp.get('pita') or {}).get('label') in ('Ajuan pendukung', 'Aset kampus yang dipakai')]
assert len(_hal_kampus) == 12, len(_hal_kampus)
for sp, (k, _) in zip(_hal_kampus, GALERI):
    sp['logo_kampus'] = LOGO[k]
for sp in S:   # kembaran: logo kampus yang berpasangan
    if sp.get('pesan') == 'Kampus saling menguatkan lewat kelompok kembaran':
        sp['logo_kampus'] = [LOGO['USK'], LOGO['Unpatti'], LOGO['ITB'], LOGO['Tel-U'], LOGO['Unhas']]
# baris Sumber muat satu baris (lebar pita sumber sekitar 75 karakter)
PENDEK = {
    3: 'Paparan kerja sama PT, 30 Okt 2026; DIBI BNPB 2016-2025; riset BNPB 2026',
    11: 'TDMRC USK; Medcom.id, Des 2025; ANTARA, 2023; Kumparan; riset BNPB 2026',
    13: 'Antara, 2024 dan 2025; Kemdiktisaintek, 2021; DIBI BNPB 2016-2025',
    14: 'ITB, Jan 2026; Antara, Apr 2026; detikInet, Des 2025; riset BNPB 2026',
    15: 'Telkom, 2022; Selular.ID, 2023; Tel-U, 2024; Katadata, Sep 2026',
    16: 'ICL, 2024; UGM, 2010; CNN Indonesia, 2025; BCA Sekuritas, 2025; DIBI BNPB',
    17: 'Repositori ITS, 2024; Suara Surabaya, 2018; ITS News, 2022; JPNN, 2021',
    18: 'Unram, 2026; AMMAN, 2022; Antara Bali, 2023; DIBI BNPB 2016-2025',
    19: 'ULM, Feb 2025; CNBC Indonesia, Jan 2021; Antara, 2023; DIBI BNPB 2016-2025',
    21: 'ITS, 2019; Republika, 2021; Antara Ambon, 2023 dan 2025; riset BNPB 2026',
    22: 'IPB, Mei 2025; RFMRC-SEA; Mongabay, 2018; Pertamina, 2025; riset BNPB 2026',
    26: 'PMK 114/2025; PP 45/2019 (DDTC News, 2024); VIVA, 2024; UU 24/2007',
    27: 'Kontan 2026; Tirto 2025; Detik Finance 2025; Bisnis.com 2025; PP 28/2024',
    20: 'Bisnis.com, Jul 2024; Dunia Energi, 2024; DIBI BNPB 2016-2025',
}
for i, t in PENDEK.items():   # nomor lama; galeri logo disisipkan sebagai slide 10, jadi slide 10 ke atas bergeser satu
    j = i - 1 + (1 if i >= 10 else 0)
    assert 'sumber' in S[j], i
    S[j]['sumber'] = t

SPEK = {
    '_catatan': 'Ajuan flagship kampus dan swasta, berangkat dari kampus, 3 Nov 2026. Dibangun dari spek/bangun_spek_ks.py.',
    'pesan_kunci': 'Tiap kampus koordinator memimpin satu flagship yang lahir dari asetnya sendiri, bersama perusahaan yang sudah terbukti bekerja dengannya.',
    'judul_dokumen': 'Ajuan Program Flagship Campus-first: Kerja Sama BNPB dengan Kampus dan Swasta',
    'subjek_dokumen': 'Usulan untuk Kepala BNPB, 3 November 2026',
    'format': 'kajian', 'kajian': 'kampus-swasta', 'tanggal': '2026-11-03',
    'bagian': [{'judul': 'Membaca Kekuatan Kampus', 'label': 'Kampus'},
               {'judul': 'Flagship per Kampus', 'label': 'Flagship'},
               {'judul': 'Pelaksanaan dan Tindak Lanjut', 'label': 'Pelaksanaan'}],
    'arah': 'Pemilik 2 Nov 2026: ikut semua usulan sesi arah (deck terpisah dari versi ide dulu, tanpa penyaji, mitra ditulis calon, desain campuran).',
    'slide': S,
}

(DATA / 'angka.json').write_text(json.dumps({'angka': ANGKA}, ensure_ascii=False, indent=1), encoding='utf-8')
(AKAR / 'pustaka.json').write_text(json.dumps(PUSTAKA, ensure_ascii=False, indent=1), encoding='utf-8')
(AKAR / 'spek' / 'kampus-swasta-031126.json').write_text(json.dumps(SPEK, ensure_ascii=False, indent=1), encoding='utf-8')
print(len(S), 'slide;', len(ANGKA), 'angka;', len(PUSTAKA), 'pustaka; beda', beda)

# ------------------------------------------------------------------ deck ringkasan (pemilik 2 Nov 2026: "bikin juga deck summarynya")
import copy


def ambil(pesan):
    sp = next(x for x in S if x.get('pesan') == pesan)
    return copy.deepcopy(sp)


R_ = []
samp = copy.deepcopy(S[0])
samp.update({'judul_sampul': 'Ringkasan Ajuan Program Flagship Campus-first bersama Kampus dan Swasta',
             'subjudul': 'Dua belas flagship kampus koordinator, lima siap dijalankan pada 2027'})
R_.append(samp)
R_.append({'jenis': 'daftar-isi'})
_rk = ambil('Ringkasan ajuan flagship berangkat dari kampus')
for _k in _rk['kartu']:
    if _k['label'] == 'Aset kampus':
        _k['isi'] = 'Aset tiap kampus dinilai dari bukti riset, lalu dipakai untuk memilih flagship dan calon mitranya.'
    if _k['label'] == 'Bahaya regional':
        _k['isi'] = 'Korban jiwa terbanyak di Sulawesi; bila aset kampus belum siap, bahaya yang paling mematikan dijawab ajuan pendukung.'
R_.append(_rk)
R_.append({'jenis': 'pembatas-seksi', 'bagian': 1})
R_.append(ambil('Program diturunkan dari aset kampus, dan mitra swasta dipilih berlapis'))
R_.append(ambil('Tipe kampus menentukan aset swasta yang paling berguna'))
R_.append(ambil('Aturan sudah memberi insentif bagi swasta, tetapi jarang dipakai'))
R_.append(ambil('Flagship menjangkau semua regional dan sebagian besar memakai mitra yang sudah bekerja dengan kampusnya'))
R_.append(ambil('Dua belas kampus memimpin flagship masing-masing'))
R_.append({'jenis': 'pembatas-seksi', 'bagian': 2})
R_.append(ambil('Flagship dijalankan dalam dua gelombang menurut kesiapannya'))
lima = tulis('lima_flagship.csv', ['flagship', 'isi', 'bukti', 'mitra'], [
    ['Unand: Padang Siap Megathrust', 'Gedung dan masjid Padang jadi tempat evakuasi', 'Model diserahkan ke Pemkot, Juni 2026', 'Pegadaian, Hutama Karya (satu)'],
    ['ITB: Air Bersih Siaga', 'Unit ultrafiltrasi disiagakan di gudang regional', 'Dikirim ke Sumatera sejak Nov 2025', 'ParagonCorp (satu)'],
    ['USK: Uji Tsunami Nasional', 'Flume dan meja getar dibuka untuk uji alat', 'Flume dipakai riset tsunami Palu', 'BSI (satu); PEMA (dijajaki)'],
    ['UGM: GAMA-EWS Desa Longsor', 'Peringatan dini longsor diperbanyak ke desa', 'Standar ISO 22327; produksi kampus', 'Telkom (satu, uji tuntas)'],
    ['Unhas: Industri Sadar Risiko', 'Kajian risiko wilayah industri dan latihan desa', 'Riset likuefaksi Palu dan Mamuju', 'Semen Tonasa (satu); Masmindo (uji tuntas)']])
R_.append({
    'jenis': 'tabel-peringkat', 'jenis_slide': 'tabel', 'judul_bentuk': 'temuan',
    'pesan': 'Lima flagship gelombang satu dan isinya',
    'judul': 'Sebanyak {{angka:ks.gel1}} flagship gelombang satu yang diminta disetujui untuk 2027 sudah punya bukti lapangan dan calon mitra lapis satu',
    'rasio': 0.72,
    'tabel': {'judul_panel': 'Lima flagship yang diminta disetujui', 'ikon': 'sekolah', 'peringkat': True, 'sel_dua_baris': True, 'sel_maks_baris': 3,
              'skala_huruf': 1.35, 'baris_maks_pt': 72,
              'data': D(lima, [{'nama': 'flagship', 'kepala': 'Flagship', 'bobot': 1.2}, {'nama': 'isi', 'kepala': 'Isi program', 'bobot': 1.5, 'rata': 'l'},
                               {'nama': 'bukti', 'kepala': 'Bukti lapangan', 'bobot': 1.5, 'rata': 'l'},
                               {'nama': 'mitra', 'kepala': 'Calon mitra (lapis)', 'bobot': 1.2, 'rata': 'l'}], AN + '; riset.json', 'terverifikasi')},
    'panel': {'judul': 'Aset yang sudah teruji', 'ikon': 'naik',
              'angka_besar': kartu_angka('lima_bukti.csv', [
                  ['Unit pengolah air ITB', ANGKA['itb.muf']['nilai'], 'unit', 'dikirim ke Sumatera', 'air-baku'],
                  ['GAMA-EWS UGM', ANGKA['ugm.kab']['nilai'], 'kabupaten', 'laporan ICL, 2024', 'longsor'],
                  ['Flume tsunami USK', ANGKA['usk.flume']['nilai'], 'm', 'TDMRC, Banda Aceh', 'tsunami']],
                  'ITB, Jan 2026; ICL, 2024; TDMRC USK')},
    'sumber': 'ITB, Jan 2026; ICL, 2024; TDMRC USK; riset BNPB 2026',
})
R_.append(ambil('Flagship berjalan tiga tahap'))
R_.append(ambil('Calon mitra berisiko dibedakan: lapis tiga membawa aset saja, sisanya wajib uji tuntas'))
rk = ambil('Keputusan Kepala BNPB untuk memulai flagship')
PETA_R = {'slide 29': 'slide 11', 'slide 26': 'slide 12', 'slide 28': 'slide 14', 'slide 11': 'slide 8', 'slide 27': 'slide 7', 'slide 6': 'slide 5'}
for b_ in rk['rekomendasi']:
    b_['dasar'] = PETA_R.get(b_['dasar'], b_['dasar'])
R_.append(rk)
R_.append(copy.deepcopy(next(x for x in S if x.get('jenis') == 'penutup')))
R_[-1]['laporan'] = 'Ringkasan Ajuan Program Flagship Campus-first: Kerja Sama BNPB dengan Kampus dan Swasta'
R_.append({'jenis': 'pembatas-lampiran', 'kelompok': {'A': 'Rincian ajuan program'}})
R_.append(copy.deepcopy(next(x for x in S if x.get('kode') == 'A1')))
R_.append(copy.deepcopy(next(x for x in S if x.get('kode') == 'A2')))
SPEK_R = dict(SPEK, slide=R_, kajian='kampus-swasta-ringkas',
              bagian=[{'judul': 'Dua Belas Flagship Kampus', 'label': 'Flagship'}, {'judul': 'Prioritas dan Keputusan', 'label': 'Keputusan'}],
              judul_dokumen='Ringkasan Ajuan Program Flagship Campus-first: Kerja Sama BNPB dengan Kampus dan Swasta',
              _catatan='Deck ringkasan dari deck lengkap kampus-swasta-031126 (slide disalin dari spek yang sama).')
(AKAR / 'spek' / 'ringkas-kampus-swasta-031126.json').write_text(json.dumps(SPEK_R, ensure_ascii=False, indent=1), encoding='utf-8')
print('ringkasan:', len(R_), 'slide')
