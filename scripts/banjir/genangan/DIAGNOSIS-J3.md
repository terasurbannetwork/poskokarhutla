# Diagnosis kegagalan J3: model genangan Jakarta

Tanggal 28 Okt 2026. Hanya diagnosis, tidak ada perbaikan, tidak ada penyetelan. Data uji 2024-08 dan 2025-04 (sudah dibuka sekali) dianalisis secara deskriptif; tidak ada angka dari analisis ini yang dipakai menyetel apa pun. Tidak menyentuh `j3_state.json`, `j3_sidik.json`, `j3_vonis.json`, `kunci_j3.py`; `vonis_j3.py` tidak dijalankan. Skrip dan peta ada di scratchpad `diag_j3/` (bukan di repo). Raster yang dipakai: cache `data/raw/banjir/genangan/j3_kal/f0ca9320ea_*_s2.0_kd2.raster.gz` (model final, Kd seragam 2, skala hujan 2,0).

## Kesimpulan satu paragraf

Penyebab terbesar bukan model, melainkan label. Pada dua kejadian uji, 99,6% laporan 2024-08 (1.096 dari 1.100) dan 98,3% laporan 2025-04 (404 dari 411) adalah laporan latihan atau simulasi (nama pelapor berawalan "Duta ..." dan "HKB ..."), bukan banjir. Hanya 773 dari 1.100 dan 196 dari 410 yang bertipe banjir, dan 81% dari semuanya menumpuk dalam 500 m di sekitar Monas. Hujan nyata di kedua jendela hampir nol (ERA5 1 dan 25 mm, CHIRPS 8 dan 15 mm, GSMaP 1 mm untuk 2025-04, tidak ada jam hujan di METAR Soekarno-Hatta/Halim untuk 2024-08). Jadi POD 0,9% mengukur model yang benar (tidak ada banjir) terhadap label yang salah. Terpisah dari itu, model punya masalah nyata: pada kejadian kalibrasi pun daya pembedanya rendah (AUC 0,53 sampai 0,64), luas basahnya didominasi cekungan DEM yang diangkat, dan kalibrasi menang dengan membesarkan luas basah, bukan dengan membaik di tempat yang benar.

## Tabel hipotesis

| H | Hipotesis | Vonis | Bukti inti |
| --- | --- | --- | --- |
| H4 | Label bermasalah | TERBUKTI (penyebab terbesar) | 98 sampai 99,6% laporan uji = latihan; 30% dan 52% bukan bertipe banjir; hujan nyata nol |
| H5 | Metrik tidak membedakan | TERBUKTI | POD acak = 1-(1-f)^29; pada kalibrasi acak 0,92 sampai 0,99 mengalahkan model 0,56 sampai 0,86 |
| H6 | Kalibrasi mentok bukan minimum | TERBUKTI | kerugian turun monoton ke Kd 2 (tepi); 2017-01 = 64 sampai 79% kerugian dan 95% perbaikan |
| H2 | Medan meratakan cekungan | SEBAGIAN, arahnya terbalik | 23,5% sel darat DKI diangkat (median 0,97 m); 65% sel basah 2017-01 ada di sel yang diangkat, laporan nyata hanya 26 sampai 32% di sana |
| H3 | Drainase membuang terlalu cepat | SEBAGIAN | Kd 2 membuang 75 sampai 123% limpasan hujan efektif; laporan tidak pernah basah sesaat |
| H1 | Hujan masukan terlalu kecil | SEBAGIAN (kalibrasi ya, uji tidak) | ERA5 mentah 1,7 sampai 1,9 kali di bawah GSMaP pada empat kejadian nyata; pada dua kejadian uji hujan memang kecil |

## H1 Hujan masukan

Rata-rata sel DKI, jendela 4 hari (mm), pembanding GSMaP gauge-adjusted harian 0,1 derajat (`data/banjir/genangan/gsmap_harian.json`), CHIRPS prelim 0,05 derajat (diunduh, dibaca stdlib), ERA5 dan IFS dari `hujan_jam`:

| Kejadian | ERA5 | IFS | GSMaP | CHIRPS | GSMaP / ERA5 |
| --- | --- | --- | --- | --- | --- |
| 2017-01 | 67 | 49 | 127 | 68 | 1,9 |
| 2018-01 | 46 | 36 | 81 | 73 | 1,8 |
| 2020-01 | 88 | 118 | 152 | 55 | 1,7 |
| 2021-02 | 73 | 77 | 131 | 81 | 1,8 |
| 2024-08 | 1 | 2 | tak ada (arsip hanya Nov-Apr) | 8 | tak berlaku |
| 2025-04 | 25 | 24 | 1 | 15 | tak berlaku |

- Total ERA5 pada empat kejadian kalibrasi rata-rata 1,8 kali lebih kecil daripada GSMaP. Skala hujan 2,0 yang menempel di batas grid ternyata hampir persis rasio ini, jadi mentoknya di tepi bukan tanda salah, melainkan koreksi bias yang masuk akal. Kurva tahap 1 juga datar: kerugian 1.293 (skala 1,0) ke 1.224 (2,0), hanya turun 5%, jadi hasil hampir tidak peka pada skala.
- Puncak per jam ERA5 hanya 4,7 sampai 7,2 mm/jam (IFS sampai 32,7 mm/jam di 2020-01). Hujan konvektif kota jauh lebih tajam; stasiun titik tidak tersedia di repo (METAR IEM tidak membawa curah, `p01i` selalu 0), jadi kekurangan puncak titik tidak bisa diukur di sini. Dari ingatan: Halim 1 Jan 2020 sekitar 377 mm dalam sehari, ERA5 maksimum 24 jam 50 mm (tidak diverifikasi di repo). CN80 dikenakan pada total harian, jadi bentuk jam kurang menentukan, tetapi kekurangan puncak tetap membuat hasil lahan terlalu kecil.
- Kejadian uji: 2024-08 adalah musim kemarau. ERA5 0 sampai 3 mm, CHIRPS 8 mm, METAR WIII dan WIHH 0 jam RA/TS/SH dalam 96 jam. Hujan efektif model 0 m3; seluruh air (9,1 Mm3) berasal dari debit dasar GloFAS. 2025-04: ERA5 25 mm, CHIRPS 15 mm, GSMaP 1,4 mm, METAR 9 sampai 11 jam hujan ringan; bukan kejadian banjir luas.
- Vonis: sebagian. Untuk kalibrasi, kekurangan 1,8 kali (total) dan jauh lebih besar di puncak, ditambal skala 2,0. Untuk uji, hujan kecil karena kejadiannya memang tidak ada; menaikkan hujan tidak akan menolong.
- Catatan: ERA5 juga salah hari. 2017-01: GSMaP puncak 20 Feb (84 mm), ERA5 puncak 21 Feb (39 mm).

## H2 Medan dan cekungan

Direkonstruksi dengan salinan `mesin.mjs` di scratchpad (kisi 100 m, tahun 2024; angka 33.293 sel diangkat cocok dengan log).

- 15.132 dari 64.262 sel darat DKI (23,5%) diangkat oleh `siapkanDEM`, median 0,97 m, p90 3,0 m, maks 14,9 m; volume yang diurug 205 Mm3, sekitar dua kali hujan efektif 2017-01 (107 Mm3 satu kisi penuh).
- Persentil elevasi titik laporan kejadian nyata (vs semua sel darat DKI): 2017-01 32, 2018-01 27, 2020-01 33, relief 1 km 33, 29, 28. Laporan nyata ada di sepertiga terendah, bukan di tempat tinggi relatif. Bagian laporan yang jatuh di sel diangkat: 28, 32, 26% (dasar 24%), jadi tidak menghindari cekungan diangkat.
- Yang terbalik: 65% sel basah 2017-01 (7.110 dari 10.900) ada di sel yang diangkat, 48% sel diangkat basah vs 5,8% sel tidak diangkat; 2020-01: 51% dan 23,5% vs 4,8%. Wilayah basah model dibentuk oleh lubang derau DSM (gedung, tanggul, underpass) yang tidak berhubungan dengan lokasi laporan. Sisa air tersimpan di akhir run 26 sampai 43% dari masukan.
- Peta: `peta2_cekungan_dan_kalibrasi.png` (kiri sel diangkat jingga, tengah dan kanan sel basah biru dengan laporan hitam untuk 2017-01 dan 2020-01).
- Vonis: sebagian. Medan tidak meratakan cekungan sehingga banjir hilang; ia menciptakan kolam di tempat yang salah.

## H3 Drainase dan neraca

Neraca run uji dan kalibrasi (Mm3, seluruh kisi, Kd 2):

| Kejadian | Masuk (hujan + sungai) | Drainase | Pompa | Laut keluar | Tepi | Sisa | Drainase / hujan efektif |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2017-01 | 232,7 (107,4 + 125,3) | 80,7 (35%) | 29,4 (13%) | 33,6 (14%) | 0,9 | 88,3 (38%) | 0,75 |
| 2018-01 | 163,6 | 47,4 (29%) | 25,6 | 32,4 | 0,2 | 58,0 | 1,01 |
| 2020-01 | 226,8 | 90,6 (40%) | 33,9 | 36,6 | 0,2 | 65,4 | 0,97 |
| 2024-08 | 9,1 (0 + 9,1) | 1,0 | 1,0 | 0 | 0 | 7,2 | tak berlaku |
| 2025-04 | 86,9 (13,8 + 73,1) | 16,9 (19%) | 11,9 | 20,9 | 0,06 | 37,2 | 1,23 |

- Pada Kd 2 (sudah nilai terkecil di grid), drainase seragam sendiri menghapus hampir seluruh limpasan hujan efektif (75 sampai 123%). Genangan nyata berasal dari debit hulu GloFAS (54 sampai 84% masukan), bukan hujan lokal. GloFAS di titik snap juga mencurigakan untuk sungai kecil kota (rata-rata Angke 126 m3/dtk, snap 8,2 km dari alur), tetapi ini bukan diuji di sini.
- Alur dan tepi tidak membuang berlebihan: tepi 0,06 sampai 0,9 Mm3; laut keluar 14 sampai 24% dan itu wajar (muara).
- Sel laporan tidak "basah sesaat": raster menyimpan kedalaman maksimum selama jendela, dan POD memakai maksimum itu. Pada 2024-08 maksimum dalam radius 300 m = 0 untuk semua ambang (1 cm sampai 30 cm); 2025-04 hanya 11,7% pada ambang 1 cm.
- Vonis: sebagian. Drainase seragam adalah kenop yang menang kalibrasi (lihat H6) dan menghapus limpasan hujan; tetapi untuk kegagalan uji bukan penyebab, karena tak ada air dan label salah.

## H4 Label (PetaBencana)

Dari berkas mentah `data/raw/banjir/genangan/petabencana/*.json`, yang punya `disaster_type`, `text`. `petabencana_laporan.json` (ringkasan) membuang tipe dan teks, sehingga muatLabel dan vonis memakai SEMUA tipe bencana sebagai "laporan banjir".

| | 2024-08 | 2025-04 |
| --- | --- | --- |
| Laporan di jendela, dalam DKI, tanpa duplikat | 1.100 | 410 |
| Bertipe flood | 773 | 196 |
| Tipe lain (wind, earthquake, haze, volcano, fire) | 327 | 214 |
| Teks berawalan "Duta ..." (2024-08) atau memuat "HKB" (2025-04) | 1.096 (99,6%) | 404 (98,3%) |
| Pelapor unik berteks | 17 teks | 19 teks |
| Dalam 500 m dari titik modus (Monas, 106,828 / -6,175) | 81% | 81% |
| Dalam 1 km | 94% | 90% |
| Laporan di satu sel 0,001 derajat terbanyak | 127 | 36 |
| Banjir tidak berlatihan | 1 | 5 |

- Setiap hari jendela 2024-08 memuat keenam tipe bencana sekaligus (gempa, gunung api, kabut asap, kebakaran, angin, banjir) di Jakarta; mustahil sebagai kejadian nyata. "Duta" bernama orang (Widi Iskandar Rangkuti 683, Sahal Mahfudz 211, Wahyu Permadi 151), "HKB" mengacu pada Hari Kesiapsiagaan Bencana (26 April); ini kesimpulan dari pola, bukan konfirmasi PetaBencana.
- Foto hanya 226 dari 1.100 (2024-08) dan 44 dari 411 (2025-04).
- Kedalaman: median 29 cm (2024-08), 74 cm (2025-04); bukan fisis untuk hujan 0 sampai 25 mm.
- Pemilihan kejadian ikut cacat: PRAREG memilih puncak dengan "hari laporan terbanyak", yang justru memilih hari latihan. 2024-08 benar BUKAN kejadian banjir Jakarta. Hari >= 60 laporan pada Apr 2024, Jul-Agu 2024, Mei 2023, Apr 2022 dan Apr 2025 bertanda latihan 83 sampai 100%.
- Kejadian kalibrasi bersih: 2017-01 (1.197 laporan, latihan 1%), 2018-01, 2020-01 (1%), 2021-02 (0%).
- Peta: `peta1_laporan_uji.png` (merah latihan, jingga tipe lain, hijau banjir bukan latihan, biru sel basah model). Pada 2024-08 sel basah model hanya alur sungai.
- Referensi Spearman 2024-2025 (hari ber-laporan per kecamatan) ikut tercemar: 968 dari 1.550 kecamatan-hari seluruhnya latihan atau non-banjir (62%).
- Vonis: TERBUKTI, penyebab nomor satu.

## H5 Metrik

- Skrip `skor_j3.py` tidak salah: grid raster identik dengan pemetaan saya, rumus POD benar. Bukan galat kode.
- Radius 300 m mencakup 29 sel 100 m. POD sel acak = 1-(1-f)^29: f 1,6% memberi 37%, f 5,7% memberi 82% (teramati 81%), f 10% memberi 95%, f 17% memberi 99,5%. Karena laporan uji menumpuk di satu tempat, POD kejadian itu praktis satu lemparan koin (acak 40 benih 2024-08: p10 7%, median 31%, p90 79%).
- Berlaku pada kejadian kalibrasi juga, yang bersih: POD acak median 0,99 (2017-01), 0,92 (2018-01), 0,97 (2020-01), 0,97 (2021-02) vs model 0,86, 0,56, 0,64, 0,60. POD >= 0,6 praktis bisa dicapai siapa pun yang menaburkan 10% luas basah; metrik tidak membedakan keterampilan. AUC laporan vs titik darat acak (maks 300 m): 0,53, 0,59, 0,63 (Kd 2); hampir identik pada Kd 12 (0,54, 0,58, 0,64).
- DIAGNOSTIK ONLY (bukan vonis, bukan penyetelan): POD model uji bila ambang 1 cm dan radius 600 m: 2025-04 0,84 (hanya karena lapisan tipis hujan ringan), 2024-08 0,001; pada ambang 5 cm 0,03 dan 0,001. Tidak ada kombinasi yang menyelamatkan POD, karena dasarnya labelnya latihan.
- Vonis: terbukti. Metrik perlu pembanding yang menormalkan luas (AUC, kenaikan di atas acak berklaster, atau CSI/HSS) dan penyeragaman unit.

## H6 Kalibrasi

- Tahap 1 (Kd 12): 1.293, 1.289, 1.267, 1.256, 1.224 untuk skala 1,0 sampai 2,0, turun monoton, tepi.
- Tahap 2 (skala 2,0): Kd 40: 1.333, 30: 1.301, 20: 1.293, 12: 1.224, 8: 1.143, 5: 1.031, 3: 783, 2: 630. Monoton sampai batas bawah; Kd < 2 tak pernah dicoba, jadi minimum sejati tidak diketahui.
- Dominasi 2017-01: 64% kerugian pada Kd 2, 79% pada Kd 12; penurunan total 594 (Kd 12 ke 2) berasal 563 (95%) dari 2017-01 (964 ke 401). 2018-01 turun 10%, 2020-01 turun 14%. 2017-01 adalah hari tunggal 1.057 laporan (21 Feb) dengan 1.017 laporan sumber Qlue dalam jendela.
- Mekanisme: Kd lebih kecil menaikkan luas basah 2017-01 dari 7,1% ke 17,0% dan POD dari 0,30 ke 0,86, sementara AUC tidak berubah (0,54 ke 0,53). Perbaikan kerugian = meluasnya genangan menutupi laporan, bukan lokasi yang makin benar. Bobot w = jumlah laporan dengan LAMBDA 1,0 mengimbalkan cakupan laporan lebih daripada luas, sehingga kecamatan sarat laporan menarik Kd ke bawah.
- Leave-one-event-out: peta Kd kecamatan kalah dari seragam di ketiga kejadian (603 vs 401, 120 vs 117, 114 vs 112); final = Kd seragam 2.
- Vonis: terbukti. Kalibrasi tidak menemukan keseimbangan; ia berlari ke tepi grid.

## Urutan penyebab

1. H4 Label (cacat pemilihan kejadian dan filter jenis laporan). Menjelaskan seluruh POD 0,9% dan Spearman negatif pada uji.
2. H5 Metrik saturasi. Membuat uji tak informatif juga pada kejadian bersih dan membuat kalibrasi memburu luas basah.
3. H2 Cekungan DEM. Menentukan di mana air berkumpul (65% sel basah di sel diangkat) tanpa kaitan dengan laporan; AUC 0,53 sampai 0,64.
4. H6 Kalibrasi (2017-01 dominan, tepi grid) dan H3 drainase (Kd 2 sudah menghapus limpasan hujan).
5. H1 Hujan (ERA5 rendah 1,8 kali, sudah ditambal skala 2,0; puncak titik tidak terukur).

Dengan kata lain: J3 tidak bisa dinilai gagal secara substansi maupun lulus; uji tidak sah. Tetapi bukti pada kalibrasi (AUC rendah) menunjukkan model belum punya keterampilan ruang walau label diperbaiki.

## Usulan J4

Syarat awal (lihat PRAREG baru): perubahan di bawah semuanya = kriteria baru, tanggal baru, sidik baru; tidak boleh dilihat hasilnya dulu.

1. Label. Sertakan hanya `disaster_type = flood`. Buang laporan latihan lewat aturan terdaftar sebelum skor (teks berawalan duta, hkb, hkn, simulasi, tes, test; satu pelapor dengan lebih dari 20 laporan dalam satu sel 0,001 derajat). Simpan `disaster_type` dan `text` di ringkasan `petabencana.py`. Pilih kejadian dari hujan independen (GSMaP/CHIRPS rata-rata DKI >= 40 mm per hari, atau stasiun BMKG), BUKAN dari hitungan laporan. Hapus 2024-08 dan 2025-04 dari peran uji (keduanya sudah dibuka dan tercemar).
2. Data uji baru yang belum pernah dibuka: Februari 2020 di luar jendela kalibrasi (laporan bersih, GSMaP DKI 158 mm pada 25 Feb, 66 mm pada 23 Feb, 81 mm pada 8 Feb, 36 mm pada 16 Feb; hasil hitung hari per laporan sudah terlihat, lokasi belum). Kandidat lain bersih: 2017-04-11, 2023-12-27, 2024-02-03, 2024-11-11, 2024-11-15 (hujan dicek dulu; GSMaP tidak mencakup Apr-Okt 2024). Kejadian prospektif musim hujan 2026/27: PetaBencana sejak Mei 2025 hanya maksimum 20 laporan per hari (290 laporan total), jadi label prospektif butuh sumber lain (data BPBD DKI RW terdampak per kejadian, JAKI/Qlue; belum diverifikasi di repo) dan jangkar commit sebelum musim dimulai (Nov 2026).
3. Metrik. Ganti POD radius 300 m dengan ukuran yang menormalkan luas: AUC peringkat laporan vs titik darat, atau HSS/CSI terhadap acak berklaster dengan luas sama; bootstrap per hari tetap; syarat lulus = batas bawah selisih atas pembanding InaRISK dan Kd seragam positif, bukan POD >= 0,6.
4. Kalibrasi. Perluas grid Kd ke bawah (0, 0,5, 1 mm/jam) dan skala hujan ke atas dari 2,0 hanya bila kriteria peningkatan melewati AUC, bukan luas; hentikan bila minimum jatuh di tepi. Bobot kejadian disamakan (maks 1/3 per kejadian) atau 2017-01 dibatasi.
5. Medan. Ganti pengangkatan cekungan global (`CEKUNGAN_MAKS` 0,5 m) dengan penyaring DSM: pisahkan bangunan, tanggul, dan underpass sebelum Priority-Flood (gedung OSM sudah ada di `data/raw/banjir/genangan/gedung_osm`), atau pakai FABDEM/DTM untuk kisi 100 m; laporkan fraksi sel basah di sel diangkat (target mendekati dasar 24%).
6. Hujan. Pakai GSMaP gauge-adjusted harian (tersedia 2016 sampai 2025) dengan bentuk jam IFS atau ERA5 (`--hujan gsmap_dis`) bila mencakup kejadian; skala hujan bukan kenop bebas.
7. Hulu. Uji debit GloFAS terhadap alur kecil (Angke 126 m3/dtk rata-rata tampak berlebih) sebelum J4.

Mulai dari PRAREG-J4 yang memuat daftar kejadian (peran kalibrasi, pagar, uji), aturan filter label, dan metrik baru, dijangkar sebelum label uji dibuka.

## Catatan batas

- Latihan didefinisikan dari pola teks dan lokasi, bukan konfirmasi pihak PetaBencana.
- Stasiun BMKG tidak tersedia; METAR dipakai hanya sebagai penanda jam hujan.
- Rekonstruksi DEM memakai salinan mesin di scratchpad dengan parameter yang sama; tidak ada berkas repo yang diubah selain dokumen ini.
