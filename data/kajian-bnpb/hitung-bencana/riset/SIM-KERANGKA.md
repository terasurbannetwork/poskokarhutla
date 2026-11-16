# SIM-KERANGKA: simulasi kerangka L1, L2, L3 pada DIBI 2024 sampai 2026 dan logbook 2026

Status: hasil mesin, 12 November 2026. Pengolah: `analisis/sim_kerangka.py`; keluaran lengkap: `analisis/hasil/sim_kerangka.json`;
grafik: `mesin/gambar/sim-kjn-resmi.json`, `sim-l2-juklak.json`, `sim-kelas-opsi.json`, `sim-tren.json`.
Semua ambang adalah bawaan sementara atau aturan uji. Dua versi L2 dan L3 dihitung: **v1** (kerangka awal, M2 dan M3 terpisah, M4 menyatukan rumah dan fasilitas) dan **v2** (kerangka revisi: M2 = luka + mengungsi + menderita >= 50; M3 = RBS >= 5; M4 = fasilitas > 0; L3 dari mengungsi saja maksimum S; penaik relatif berbatas absolut 100 dan 1.000).

## 1. Data dan cara

- DIBI: 15.974 baris, dasbor publik DIBI (dibi.bnpb.go.id), ditarik 12 November 2026, 1 Januari 2024 sampai 12 November 2026; tanggal dikonversi ke WIB (UTC+7).
- Penduduk kabupaten: `public/data/penduduk.json` hanya berisi grid per provinsi tanpa kode kabupaten, sehingga dipakai `public/data/wilayah/<prov>.json` kolom `pp.wp` (WorldPop R2025A per kabupaten). **Ini bukan angka BPS.** Kabupaten DIBI yang cocok dengan penduduk: 95,7 persen baris (505 kabupaten unik; contoh yang tidak cocok: Berau, Fak Fak, Karimun, Kota Banda Aceh, Kota Dumai). 229 KJN lolos L2 tidak punya penduduk, dihitung kelas relatif R.
- Status darurat: `public/data/status_darurat.json` (BNPB CKAN), 2.481 SK (2.277 kabupaten, 204 provinsi, tanpa SK skala nasional). SK mulai 2024: 617, 2025: 847, 2026: 452 (catatan berkas: data tahun berjalan menyusul).
- Katalog gempa: BMKG Katalog Signifikan dan Merusak (berakhir 28 Desember 2025) dan EMSC (`emsc_arsip.json`, sampai 28 Oktober 2026).

### Pembentukan KJN (L1, pendekatan)

Baris dengan `jumlah_kejadian` 1 atau lebih tetap satu baris satu KJN. Baris pecahan (632 baris) digabung bila kategori, tanggal, dan provinsi sama dan pecahannya berjumlah 0,95 sampai 1,05 (157 KJN), lalu sisanya digabung lintas provinsi bila kategori dan tanggal sama (8 KJN). Sisa 130 KJN adalah kelompok pecahan tak genap, dijadikan satu KJN per kelompok. 556 baris punya `jumlah_kejadian` 2 atau lebih (hampir semua 2025); tetap satu KJN, dicatat sebagai keterbatasan.

**Keterbatasan besar:** 98,1 persen KJN berasal dari baris tunggal. Banjir tiga kabupaten pada hari yang sama di satu provinsi terhitung tiga KJN, jadi jumlah KJN di bawah adalah **batas atas**; KJN sebenarnya (gabungan antar-kabupaten oleh Pusdatinkom) lebih kecil. Karena itu dampak "per KJN" praktis sama dengan per baris kecuali pada gempa dan beberapa banjir besar.

## 2. L1: baris, KJN, CK, dan jumlah resmi

Tabel 1. Baris, KJN, CK, dan jumlah kejadian resmi DIBI per tahun

| Tahun | Baris (= CK) | KJN | Resmi (semua baris) | Resmi (is_bencana benar) | KJN dengan is_bencana |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2024 | 3.752 | 3.654 | 3.636,0 | 3.548,0 | 3.566 |
| 2025 | 8.946 | 8.763 | 9.304,4 | 5.439,4 | 5.117 |
| 2026 (s.d. 12 Nov) | 3.276 | 3.220 | 3.219,0 | 2.448,0 | 2.449 |

Sumber: DIBI ditarik 12 November 2026; `hasil/sim_kerangka.json` bagian L1.

Temuan: jumlah resmi 2025 (9.304,4) melebihi KJN (8.763) karena 555 baris punya `jumlah_kejadian` 2 atau lebih (gandaan baris). Pada 2024 dan 2026 jumlah resmi sama dengan jumlah baris hampir persis. Per kategori (2025): banjir 2.774 baris, 2.729 KJN, resmi 2.994,0; cuaca ekstrem 2.412 baris, 2.366 KJN, resmi 2.434,5 (is_bencana benar hanya 1.019,5); karhutla 1.487 baris, 1.460 KJN, resmi 1.516,8; gempa bumi 100 baris, 82 KJN, resmi 90,2. Gempa 2024: 62 baris menjadi 20 KJN (resmi 18,0), karena pecahan lintas kabupaten; inilah satu-satunya kategori yang L1 sungguh mengubah angka. Per kategori semua tahun ada di JSON.

## 3. L2 lawan Juklak 7/2023 (K1 sampai K3)

Juklak: K1 meninggal >= 1; K2 menderita + luka + mengungsi >= 50 (dijumlah); K3 RB + RS + RR + fasilitas (pendidikan, ibadat, fasyankes, kantor, jembatan) >= 5. `menderita` DIBI belum tentu sama dengan "terdampak langsung" M3 versi kerangka.

Tabel 2. KJN lolos ambang menurut Juklak dan kerangka

| Tahun | KJN | Juklak | L2 v1 | L2 v1 lawan Juklak | L2 v2 | L2 v2 lawan Juklak |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2024 | 3.654 | 2.556 | 2.281 | -10,8% | 2.285 | -10,6% |
| 2025 | 8.763 | 3.647 | 3.311 | -9,2% | 3.324 | -8,9% |
| 2026 (s.d. 12 Nov) | 3.220 | 1.332 | 1.220 | -8,4% | 1.226 | -8,0% |
| Semua | 15.637 | 7.535 | 6.812 | -9,6% | 6.835 | -9,3% |

Sumber: `hasil/sim_kerangka.json` bagian L2 dan v2. Pada satuan baris selisihnya sama (7.654 baris lolos Juklak, 6.917 L2 v1). Varian batas bawah fasilitas (M4b: fasilitas dihitung hanya bila RBS >= 1) memberi 6.662 KJN, -11,6 persen; 150 KJN lolos hanya karena fasilitas tanpa dampak rumah.

Per kategori, semua tahun (Juklak, v1, v2): banjir 3.896, 3.906, 3.910; cuaca ekstrem 2.097, 1.530, 1.537 (-27 persen); longsor 626, 504, 511 (-18 persen); kebakaran permukiman 444, 396, 400; gempa bumi 55, 60, 60 (+9 persen); karhutla 30, 32, 32; kekeringan 245, 245, 245.

Penentu tunggal (semua tahun): Juklak K1 384, K2 3.889, K3 1.395. L2 v1: M1 394, M2 (mengungsi atau luka saja) 86, M3 (menderita) 3.546, M4 699. L2 v2: M1 393, M2 3.946, M3 (RBS) 324, M4 (fasilitas) 291. Lebih dari separuh KJN yang lolos (3.889 dari 7.535 menurut Juklak; 3.946 dari 6.835 menurut v2) lolos hanya karena jumlah orang menderita, luka, atau mengungsi mencapai 50.

Selisih arah: KJN lolos L2 v1 tetapi tidak Juklak 168; lolos Juklak tetapi tidak L2 v1 891 (v2: 868). Penyebab Juklak tanpa L2 v1: K3 saja 868 (rumah rusak ringan bobot 0,25 dan fasilitas dihitung per jenis), K2 saja 12, K2 dan K3 11. Penyebab L2 tanpa Juklak: M4 fasilitas > 0 saja 158, M1 saja 9 (hilang tanpa meninggal), dan satu M1 dan M4. Contoh (wilayah, tanggal, angka):
- Lolos Juklak, tidak L2: Waropen (Papua), 19 Maret 2026, gelombang pasang, menderita 48, mengungsi 48, RB 2, RR 3 (RBS 2,75). Kota Cimahi, 7 April 2025, longsor, menderita 46, RB 3, RR 1 (RBS 3,25).
- Lolos L2, tidak Juklak: Kota Ternate, 2 Oktober 2026, karhutla, hilang 2, luka 1. Mahakam Ulu, 4 September 2025, kategori lainnya, hilang 1, menderita 3.

Hubungan dengan penanda `is_bencana` DIBI (baris): 2025 memuat 3.705 baris is_bencana salah (41,4 persen), dan 87 di antaranya lolos Juklak, 201 lolos L2 v1. Penanda DIBI jelas tidak memakai Juklak persis: 2025 baris is_bencana benar yang lolos Juklak 3.595 dari 5.241.

## 4. L3: sebaran kelas pada KJN lolos L2 (v1, n = 6.812)

Aturan: (a) absolut Tabel 6.5; (b) porsi (mengungsi + menderita) terhadap penduduk kabupaten WorldPop terbesar dalam KJN, R < 1 persen, S 1 sampai < 10, B 10 sampai < 30, K >= 30 (aturan uji); (a+b) = (a) naik satu tingkat bila porsi >= 10 persen, maksimum B; (c) status darurat: tanpa status R, kabupaten S, provinsi B (tidak ada SK nasional), cocok bila SK sejenis (kategori dipetakan dari teks jenis SK) menyebut kabupaten (atau provinsi) KJN dan SK mulai paling lambat 14 hari setelah tanggal kejadian sampai berakhir (aturan ketat tanpa jeda 14 hari memberi 57,9 persen tanpa status); (d) indeks log10 tiga indikator berbobot sama, titik potong 1,11, 2,10, dan 3,71 agar proporsi sama dengan (a).

Tabel 3. Persen KJN lolos L2 v1 menurut kelas, semua tahun

| Opsi | R | S | B | K |
| --- | ---: | ---: | ---: | ---: |
| a absolut | 96,3 | 3,2 | 0,5 | 0,1 |
| b relatif | 87,7 | 10,4 | 1,3 | 0,5 |
| a+b | 95,1 | 4,0 | 0,8 | 0,1 |
| c status | 53,2 | 8,2 | 38,6 | 0,0 |
| d indeks | 96,3 | 3,2 | 0,5 | 0,1 |
| a v2 (pada L2 v2, n = 6.835) | 96,3 | 3,3 | 0,3 | 0,1 |
| a+b v2 | 95,1 | 4,0 | 0,8 | 0,1 |

Sumber: `hasil/sim_kerangka.json` bagian L3 dan v2. Jumlah mutlak (R, S, B, K): a 6.560, 216, 32, 4; b 5.976, 708, 91, 37; a+b 6.479, 273, 56, 4; c 3.627, 558, 2.627, 0; d sama dengan a. Hitungan per tahun dan per kategori ada di JSON. Sebaran per tahun (a+b): 2024 B 1,1 persen; 2025 B 0,9 dan K 0,1; 2026 B 0,2 dan K 0,1.

Matriks kecocokan (baris, kolom: kelas R S B K):
- a lawan b: sama 87,2 persen; (b) lebih tinggi 10,9 persen, (a) lebih tinggi 1,9 persen. Isinya: 624 KJN R pada (a) menjadi S pada (b), 66 menjadi B, 15 menjadi K.
- a lawan c: sama hanya 52,7 persen; status lebih tinggi 45,8 persen; 2.510 KJN kelas R menurut (a) mendapat status provinsi (B pada opsi c): status provinsi menutup banyak kabupaten sekaligus, jadi opsi c mengukur respons administratif, bukan dampak.
- a+b lawan a: sama 98,5 persen; 105 KJN naik oleh penaik relatif (81 R ke S, 24 S ke B); tidak ada yang turun.
- a lawan d: sama 96,9 persen; 3,1 persen berbeda satu kelas (indeks merata-ratakan tiga indikator, sehingga KJN dengan satu indikator tinggi dan dua rendah bergeser).
- a v1 lawan a v2: dari 6.835 KJN L2 v2, hanya 10 KJN turun dari B ke S karena pengungsi saja tidak lagi membuat kelas B; yang lain identik.

Status darurat: 53,2 persen KJN lolos L2 tanpa status (2024 55,3; 2025 56,3; 2026 41,0). Kelas B atau K menurut (a) tanpa status hanya 2 dari 36. Kelas R yang punya status provinsi 2.510, jadi status dan keparahan hanya cocok pada ujung atas.

Penaik relatif: 128 KJN berporsi >= 10 persen, 37 berporsi >= 30 persen, 10 KJN berporsi di atas 100 persen. **Porsi di atas 100 persen adalah artefak data** (kolom `menderita` DIBI memuat angka kumulatif, atau mengungsi ikut dihitung dua kali, atau penduduk WorldPop lebih kecil dari pencatatan), misalnya Aceh Tamiang 612 persen dan Bireuen 395 persen. Aturan relatif v2 (batas absolut 100 untuk R ke S dan 1.000 untuk S ke B) menaikkan 112 KJN.

### Daftar 15 KJN tertinggi menurut a+b (v1)

Tabel 4. KJN kelas tertinggi (meninggal+hilang / mengungsi / RBS)

| Kelas | Kategori | Tanggal | Wilayah | Meninggal+hilang | Mengungsi | RBS | Penentu |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| K | Banjir | 28 Nov 2025 | Aceh Utara | 251 | 304.631 | 39.415 | mengungsi; RBS |
| K | Gempa bumi | 15 Agu 2026 | 11 kab NTB, NTT, Sulsel | 151 | 171.271 | 63.425 | mengungsi; RBS |
| K | Banjir | 26 Nov 2025 | Aceh Tamiang | 101 | 262.087 | 24.670 | mengungsi; RBS |
| K | Banjir | 22 Nov 2025 | Aceh Timur | 58 | 204.867 | 10.806 | mengungsi; RBS |
| B | Banjir | 7 Mar 2024 | Pesisir Selatan | 30 | 76.178 | 4.511 | mengungsi; RBS |
| B | Banjir | 23 Nov 2025 | Bireuen | 43 | 17.563 | 5.137 | mengungsi; RBS |
| B | Banjir | 26 Nov 2025 | Pidie Jaya | 29 | 20.114 | 5.972 | mengungsi; RBS |
| B | Banjir | 24 Nov 2025 | Tapanuli Tengah | 164 | 4.414 | 4.410 | meninggal+hilang; RBS |
| B | Banjir | 25 Nov 2025 | Aceh Tengah | 28 | 35.896 | 2.994 | mengungsi; RBS |
| B | Banjir | 26 Nov 2025 | Bener Meriah | 44 | 38.650 | 1.538 | mengungsi; RBS |
| B | Banjir | 23 Nov 2025 | Agam | 233 | 4.311 | 1.201 | meninggal+hilang; RBS |
| B | Banjir | 25 Nov 2025 | Tapanuli Selatan | 97 | 3.650 | 2.252 | RBS |
| B | Banjir | 26 Nov 2025 | Gayo Lues | 5 | 19.906 | 4.621 | mengungsi; RBS |
| B | Erupsi gunung api | 3 Nov 2024 | Flores Timur | 9 | 12.658 | 2.384 | mengungsi; RBS |
| B | Banjir | 26 Nov 2025 | Aceh Tenggara | 15 | 5.633 | 3.157 | RBS |

Sumber: DIBI 12 November 2026; `hasil/sim_kerangka.json` L3.top15_a+b. Hampir semuanya satu rangkaian banjir Sumatera November 2025 yang di DIBI terpecah per kabupaten (satu KJN per baris); dengan gabungan kabupaten oleh Pusdatinkom ia satu KJN besar, sehingga daftar ini menunjukkan kelemahan satuan baris, bukan 12 kejadian berbeda. Pada v2 empat KJN K dan 53 B (tercantum juga di JSON v2.L3.top15_ab2) dengan susunan atas yang sama.

### Gempa: kelas B atau K

Dari 126 KJN gempa (60 lolos L2), menurut (a) maupun (a+b): 3 kelas B dan 1 kelas K (4 dari 60; menurut opsi b hanya 1). Daftar dan magnitudonya:
- 22 Maret 2024, Bojonegoro, Gresik, Surabaya dan 5 kabupaten lain: B (mengungsi 34.154, RBS 2.737); M 5,9 (BMKG).
- 18 September 2024, Bandung, Bandung Barat, Bogor dan 3 kabupaten lain: B (mengungsi 11.026, RBS 2.676, meninggal 1); M 4,9 (BMKG).
- 16 Juni 2026, Donggala, Kota Palu, Parigi Moutong dan 2 kabupaten lain: B menurut RBS saja (RBS 2.390, meninggal 3, mengungsi 0); M 6,7 (EMSC, 3:27 UTC; dicocokkan manual menurut tanggal dan lokasi, bukan katalog BMKG).
- 15 Agustus 2026, 11 kabupaten NTB, NTT, Sulsel: K (meninggal 151, mengungsi 171.271, RBS 63.425); M 7,7 (EMSC, 14 Agustus 21:58 UTC, kedalaman 20 km; dicocokkan manual).
Magnitudo 4,9 (Bandung) sampai kelas B menunjukkan jawaban: tidak ada magnitudo ambang. Kelas S gempa: 8 KJN (daftar di JSON).

## 5. Tren (Januari sampai Oktober tiap tahun agar sebanding)

Tabel 5. Tren Januari sampai Oktober

| Ukuran | 2024 | 2025 | 2026 | 2025 lawan 2024 | 2026 lawan 2025 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Jumlah kejadian resmi DIBI (semua baris) | 2.951,0 | 8.092,9 | 3.124,0 | +174,2% | -61,4% |
| Jumlah kejadian resmi (is_bencana benar) | 2.880,0 | 4.613,0 | 2.379,0 | +60,2% | -48,4% |
| KJN lolos L2 v1 | 1.724 | 2.694 | 1.183 | +56,3% | -56,1% |
| KJN lolos L2 v2 | 1.725 | 2.702 | 1.189 | +56,6% | -56,0% |
| KJN kelas S ke atas (a+b) | 92 | 108 | 54 | +17,4% | -50,0% |
| KJN kelas B ke atas (a+b) | 21 | 6 | 3 | -71,4% | -50,0% |
| Meninggal + hilang | 510 | 723 | 577 | +41,8% | -20,2% |
| Mengungsi | 482.778 | 193.266 | 255.737 | -60,0% | +32,3% |
| Rumah setara rusak berat (RBS) | 27.030 | 23.145 | 75.590 | -14,4% | +226,6% |

Sumber: DIBI 12 November 2026; `hasil/sim_kerangka.json` bagian tren. Tahun lengkap (2024, 2025, 2026 sampai 12 November): meninggal + hilang 644, 2.289, 580; KJN lolos L2 v1 2.281, 3.311, 1.220.

Tafsir:
1. **Patahan 2025.** Baris dengan is_bencana salah: 93 (2,5 persen) pada 2024, 3.705 (41,4 persen) pada 2025, 771 (23,5 persen) pada 2026. Kenaikan jumlah resmi 2025 (+174 persen) sebagian besar adalah pencatatan baris di bawah ambang (cuaca ekstrem 1.390, longsor 787, banjir 625), bukan lonjakan kebencanaan. Serupa, jumlah baris per bulan 2024 jauh lebih sedikit, dan DIBI 2024 hampir pasti tidak lengkap; maka 2025 lawan 2024 tidak dapat dibaca sebagai tren.
2. **Jumlah kejadian dan korban searah** pada 2026 lawan 2025 (kejadian -48 sampai -61 persen, meninggal + hilang -20 persen) dan pada 2025 lawan 2024 (kejadian +56 sampai +174 persen, korban +42 persen). Tetapi besaran jauh berbeda dan korban dikendalikan segelintir kejadian: 5 KJN teratas memikul 846 dari 2.289 meninggal + hilang tahun 2025 (37 persen; semuanya banjir November 2025), 312 dari 580 pada 2026 (54 persen; gempa 15 Agustus 151, longsor Januari 94), dan 158 dari 644 pada 2024.
3. **Mengungsi dan rumah rusak tidak mengikuti jumlah kejadian**: RBS 2026 naik 227 persen sementara jumlah kejadian turun 61 persen, karena gempa Agustus 2026 (RBS 63.425). Jumlah kejadian bukan ukuran keparahan; hanya kelas keparahan yang menangkapnya, tetapi jumlah KJN kelas B ke atas sendiri sangat kecil (3 sampai 21) sehingga rentan acak.

## 6. Logbook 2026 (Januari sampai Oktober, tanggal kejadian)

Baris harian mentah 9.329 (302 hari arsip; 1.461 baris tak terurai). Angka dari regex teks bebas; hektare tidak dipakai. Aturan D: meninggal dan rumah nilai terakhir; hilang, luka, jiwa terdampak, mengungsi nilai terbesar. Kolom logbook tidak punya fasilitas rusak, sehingga M4 hanya RBS (M4 fasilitas tidak terukur).

Tabel 6. Logbook Januari sampai Oktober 2026 menurut kunci L1

| Kunci | KJN | Lolos L2 | Lolos Juklak | L2 tanpa Juklak | Juklak tanpa L2 | Meninggal + hilang |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| V2 (jenis, prov, kab, jeda 7 hari) | 2.809 | 745 | 838 | 3 | 96 | 643 |
| V1g (V1 + gabung kab beririsan; sama dengan `logbook_2026.json`: 3.756 pada Jan sampai Okt) | 3.756 | 756 | 895 | 3 | 142 | 619 |
| V1 (jenis, prov, kab, tgl) | 3.860 | 768 | 909 | 3 | 144 | 625 |

Sumber: `analisis/hasil/logbook_baris_harian.json`, `analisis/uji_kunci_logbook.py`. V2 membuat KJN 25,2 persen lebih sedikit daripada V1g tetapi KJN yang lolos L2 hampir sama (745 lawan 756, -1,5 persen) dan meninggal + hilang lebih besar (643 lawan 619, karena angka meninggal nilai terakhir dalam rangkaian hari berbeda), sehingga ambang L2 memang kebal terhadap pilihan kunci, sedangkan jumlah kejadian tidak. Penurunan terbesar V2: karhutla 1.160 (V1g) menjadi 681; longsor 424 menjadi 288; cuaca 785 menjadi 541; kekeringan 137 menjadi 270 (naik, karena jeda 7 hari menyambung berbagai tanggal). Karhutla lolos L2 hanya 9 dari 681 (V2), konsisten dengan DIBI (32 dari 3.589 KJN). Penentu tunggal L2 (V2): M1 83, M2 26, M3 (menderita) 398, M4 (RBS) 89. Perbandingan dengan DIBI Januari sampai Oktober 2026: DIBI 3.125 KJN, 1.183 lolos L2 v1, 577 meninggal + hilang; logbook V2 2.809 KJN, 745 lolos L2, 643 meninggal + hilang. Selisih meninggal + hilang 11,4 persen, sedangkan jumlah lolos L2 logbook 37 persen lebih sedikit (logbook hanya mencatat yang dilaporkan BPBD ke Pusdalops dan tidak memuat fasilitas).

## 7. Temuan paling tajam

1. Kerangka tidak mengubah jumlah kejadian besar-besaran: L2 hanya 9 sampai 10 persen di bawah Juklak. Perbedaan nyata ada pada kategori: cuaca ekstrem -27 persen, longsor -18 persen, gempa bumi +9 persen.
2. Separuh KJN lolos hanya karena orang menderita atau mengungsi mencapai 50; jadi definisi "menderita" DIBI menentukan lebih banyak daripada semua kriteria lain. Karhutla hampir tidak pernah lolos ambang dampak (7 dari 1.460 KJN pada 2025; 30 dari 3.589 menurut Juklak).
3. Status darurat tidak bisa menjadi skala: 53 persen KJN lolos tanpa status, 2.510 KJN kelas R menurut (a) punya status provinsi.
4. Keparahan terkonsentrasi: 0,6 persen KJN lolos L2 berkelas B atau K (a), dan di dalamnya didominasi satu rangkaian banjir.
5. Opsi d (indeks) hanya berbeda 3,1 persen dari (a): tidak memberi informasi tambahan, sejalan dengan keputusan membuangnya.
6. Revisi v2 (pengungsi saja maksimum S) hanya mengubah 10 KJN pada data ini; penaik relatif dengan batas absolut tetap memengaruhi 112 KJN.

## 8. Keterbatasan

- KJN dibentuk dari baris DIBI, bukan dari nomor kejadian; KJN adalah batas atas (lihat bagian 1). Tidak ada gabungan antar-kabupaten pada baris `jumlah_kejadian` 1.
- DIBI tidak memilah tingkat kerusakan fasilitas: M4 memakai fasilitas > 0 (batas atas); varian batas bawah dilaporkan. M5 dan M6 tidak terukur; kolom `menderita` DIBI belum sama dengan definisi M3.
- Penduduk WorldPop bukan BPS; 4,3 persen baris tanpa penduduk. Porsi di atas 100 persen adalah artefak.
- Aturan cocok status darurat (kategori dari teks, jeda 14 hari) adalah aturan uji; 86 SK tanpa jenis tidak dicocokkan; data SK 2026 belum lengkap.
- Katalog gempa BMKG berakhir 28 Desember 2025; dua magnitudo 2026 dari EMSC dicocokkan manual.
- DIBI 2024 tidak lengkap dan penanda is_bencana berubah pada 2025; tren lintas tahun tidak setara.
- Logbook: angka dari regex teks bebas, 1.461 baris tak terurai, bukan sistem pencatatan baku.
