# Ajuan program bersama kampus dan swasta: analisis berangkat dari kampus

Pijakan: paparan "Ajuan Program Kerja Sama BNPB dengan Perguruan Tinggi" (30 Okt 2026, rev4): 15 program, 4 pilar,
10 kampus koordinator regional dan IPB sebagai koordinator tematik. Bukti: `riset.json` (lolos `riset.py periksa --ketat`:
129 temuan bersumber, 61 titik data dari 47 lembaga; 55 inferensi dan 38 celah dicatat). Profil bahaya: DIBI BNPB 2016 sampai
2025, bencana alam, dihitung dari `proyek-bnpb/data/dibi/rekap_provinsi_tahunan.csv` (`dibi_regional.json`).

Beda dengan sesi "ide dulu" (`../ajuan-program-pt-swasta-021126/`): di sana 53 ide disusun tanpa melihat kampus, lalu dipasangkan.
Di sini urutannya dibalik. Tiap kampus diinventaris dulu, dan program hanya diturunkan dari aset yang sudah terbukti ada.

## 1. Cara berpikir: empat langkah dari kampus ke program

1. **Aset kampus**: apa yang sudah dimiliki dan terbukti, dalam lima jenis:
   - fasilitas uji dan latih;
   - produk siap pakai;
   - rekam tanggap darurat;
   - pendidikan dan pakar;
   - jejaring industri yang sudah berjalan.
2. **Bahaya regional**: bencana yang paling sering terjadi dan yang paling mematikan di wilayah koordinasinya (DIBI 2016-2025).
3. **Kebutuhan unit BNPB**: satu dari enam unit di paparan rev4 yang paling diuntungkan.
4. **Mitra swasta**: dipilih berlapis, dimulai dari perusahaan yang sudah bekerja dengan kampus itu.

Satu kampus mendapat **satu flagship** (aset paling khas dikali bahaya dominan) dan **dua sampai tiga ajuan pendukung**.
Tiap ajuan adalah wujud konkret salah satu dari 15 program rev4, jadi tidak menambah wadah baru.

### Tiga lapis mitra swasta

| Lapis | Aturan | Contoh |
|---|---|---|
| L1 Sudah bermitra | Sudah punya MoU, gedung, beasiswa, atau proyek bersama kampus itu, dan punya rekam kemanusiaan | Paragon dan ITB, Telkom dan Tel-U/UGM, Pegadaian dan Unand, Masmindo dan Unhas, PAL dan ITS, Amman dan Unram, PLN dan ULM, INPEX dan Unpatti |
| L2 Rekam regional | Rekam tanggap bencana kuat di wilayah itu tetapi belum bermitra dengan kampusnya; dijajaki lewat BNPB | Medco (Aceh), Semen Padang (Sumbar), Astra dan Mandiri (Jakarta), Sido Muncul (Jateng), Kalla Group (Sulsel), Telkomsel (Maluku) |
| L3 Berpagar | Aset besar tetapi berisiko reputasi; boleh membawa aset (alat berat, fasilitas), bukan wajah program | Adaro, Vale, Freeport, APP, Agincourt, industri rokok (untuk program anak), Infomedia |

### Empat tipe kampus (menentukan peran swasta)

| Tipe | Kampus | Aset utama | Peran swasta yang cocok |
|---|---|---|---|
| Pembuat produk | UGM, ITB, Tel-U | Alat teruji (GAMA-EWS, ultrafiltrasi IGW, PATRIOT-Net, Geolini) | Produksi massal, pembiayaan unit, platform dan jaringan |
| Pusat uji dan latih | USK, IPB, ITS | Fasilitas langka (flume tsunami 60 m, pusat latih api gambut, desain kapal rumah sakit) | Sponsor fasilitas, peserta latih berbayar, galangan |
| Tuan rumah lapangan | Unand, Unram, Unhas, Unpatti | Rekam bencana besar di wilayah sendiri dan kedekatan dengan pemda | TJSL wilayah operasi, bangunan dan pembiayaan mikro |
| Manusia dan data | UI, ULM | Kesehatan, psikososial, keberlangsungan usaha (UI); data geospasial lahan basah (ULM) | Karyawan relawan, perlindungan aset perusahaan |

## 2. Profil bahaya regional (DIBI 2016-2025, bencana alam)

| Kampus | Kejadian | Tiga jenis teratas (% kejadian) | Paling mematikan (meninggal + hilang) | Rumah rusak |
|---|---|---|---|---|
| USK | 3.787 | Banjir 39, karhutla 29, cuaca ekstrem 25 | Banjir 1.227 dari 1.506 | 254.993 |
| Unand | 6.030 | Banjir 37, karhutla 34, cuaca ekstrem 21 | Banjir 625, longsor 250, tsunami 128 | 105.112 |
| UI | 1.009 | Banjir 58, cuaca ekstrem 26, longsor 9 | Tsunami 325 dari 462 (Selat Sunda 2018) | 19.660 |
| ITB | 6.610 | Cuaca ekstrem 37, longsor 34, banjir 22 | Gempa 616, longsor 323 | 177.575 |
| UGM | 7.104 | Cuaca ekstrem 36, longsor 32, banjir 21 | Longsor 331 dari 583 | 61.355 |
| ITS | 3.893 | Cuaca ekstrem 36, banjir 32, karhutla 15 | Longsor 158, banjir 119, erupsi 74 | 81.040 |
| Unram | 2.248 | Banjir 37, cuaca ekstrem 29, longsor 17 | Gempa 574 dari 1.180 | 314.825 |
| ULM | 4.822 | Karhutla 51, banjir 32, cuaca ekstrem 9 | Longsor 126, banjir 118 | 32.623 |
| Unhas | 3.377 | Banjir 52, cuaca ekstrem 29, longsor 10 | Gempa 4.958 dari 5.541 (Palu 2018, Sulbar 2021) | 191.396 |
| Unpatti | 1.022 | Banjir 63, cuaca ekstrem 13, longsor 10 | Banjir 366, gempa 64 | 36.719 |

Bacaan:
- **Yang paling sering tidak selalu yang paling mematikan.** Di empat regional (UI, ITB, Unram, Unhas), korban jiwa
  terbanyak datang dari gempa atau tsunami, padahal kejadian terbanyaknya banjir atau cuaca ekstrem.
- **Flagship mengikuti bahaya yang paling mematikan,** selama kampusnya punya aset untuk bahaya itu.
- **Program pendukung mengisi bahaya yang paling sering.**

## 3. Analisis per kampus

Format tiap kampus:
- **Aset terbukti**: apa yang sudah dimiliki kampus.
- **Celah**: apa yang belum ditemukan.
- **Flagship**: program unggulan, dengan masalah, cara kerja segitiga (kampus, swasta, BNPB), dan unit BNPB pasangannya.
- **Ajuan pendukung**: diberi kode Pn, diikuti program rev4 yang diwujudkan.
- **Mitra dan lapisnya**: lapis L1 sampai L3 dari bagian 1.
- **Kampus sekitar**: peran kampus anggota regional.

### 3.1 USK (Aceh dan Sumut): tipe pusat uji dan latih

- **Aset terbukti**:
  - Fasilitas TDMRC: flume tsunami 60 x 2,5 x 1,7 m (sensor, kamera PIV, laser), meja getar, dan laboratorium observasi gempa.
  - Flume itu dipakai riset longsor-tsunami Palu bersama STMKG.
  - Magister Ilmu Kebencanaan sejak 2011, gelar ganda dengan Kobe University.
  - Jejaring IRIDeS Tohoku dan UNESCO-IOC.
  - Satgas Siklon Senyar 2025: posko di Pidie, Bireuen, dan Meulaboh, WebGIS logistik, dan mengambil alih RSUD Meureudu
    (lebih dari 642 warga dilayani).
- **Celah**: jalur swasta kebencanaan USK masih tipis. Yang ada baru PEMA (migas, magang), BSI (beasiswa, nilam), dan
  penyaluran BTN Peduli.
- **Flagship: Pusat Uji Tsunami Nasional di TDMRC**
  - Masalah: alat peringatan dini dan desain bangunan pesisir dari kampus mana pun belum punya tempat uji gelombang bersama.
  - Kampus: USK membuka flume dan meja getar sebagai fasilitas uji bersama untuk kampus lain (ITS, Unand, Unpatti).
  - Swasta: PEMA (L1, BUMD Aceh dengan aset pesisir) mensponsori operasi fasilitas dan menjadi pengguna pertama untuk uji aset
    pesisirnya.
  - BNPB: menjadikan hasil uji syarat masuk Ruang Inovasi dan e-Katalog.
  - Unit BNPB: Pencegahan.
- **Ajuan pendukung**:
  - P2 **Belajar dari Senyar: logistik banjir 72 jam** (Satgas Bencana dan Ruang Inovasi). WebGIS logistik USK dipadukan dengan
    unit air bersih dan stok bergilir. Mitra: MedcoEnergi (L2, bantuan Senyar lebih dari USD 500.000) dan Telkomsel. Unit BNPB:
    Logistik dan Peralatan.
  - P3 **Beasiswa Magister Ilmu Kebencanaan untuk aparat BPBD Sumatera** (Mata kuliah dan Pendampingan BPBD). Mitra: BSI (L1,
    sudah memberi beasiswa Aceh). Unit BNPB: Sistem dan Strategi.
- **Kampus sekitar**:
  - Unimal: menurunkan 49 personel FK ke pengungsian Desember 2025; menjadi simpul Korps Relawan Aceh Utara.
  - USU: pusat studi kebencanaan belum ditemukan.
- **Pagar**: Agincourt Resources (Grup Astra) dihentikan dan digugat KLH sekitar Rp200,99 miliar setelah banjir Batang Toru.
  Jangan dipakai di Sumut.

### 3.2 Unand (Sumatera tengah dan selatan): tipe tuan rumah lapangan

- **Aset terbukti**:
  - Center of Excellence manajemen bencana dari BNPB (Februari 2025).
  - Riset megathrust Mentawai (hibah BNPB-DFAT SIAP SIAGA).
  - Model masjid-shelter dan perangkat peringatan dini tsunami buatan lokal bersama Pegadaian, diserahkan ke Pemkot Padang
    29 Juni 2026.
  - Galodo November 2025: posko komando medis di Palembayan, Agam, sejak hari pertama, dengan 400 mahasiswa.
- **Flagship: Padang Siap Megathrust, dari cetak biru ke tempat evakuasi resmi**
  - Masalah: cetak biru sudah diserahkan, tetapi gedung dan masjid belum ditetapkan resmi sebagai tempat evakuasi sementara.
  - Kampus: Unand menilai kelayakan struktur.
  - Swasta:
    - Pegadaian (L1) membiayai rambu, tangga, dan latihan.
    - Hutama Karya (L1, MoU 5 Juni 2026) menjadi mitra teknik penguatan bangunan.
  - BNPB dan BPBD: menetapkan tempat evakuasi dan memasukkannya ke rencana kontinjensi.
  - Unit BNPB: Pencegahan.
- **Ajuan pendukung**:
  - P2 **Siaga Galodo Sumbar** (Ruang Inovasi dan KKN Tematik).
    - Peringatan dini banjir bandang di DAS rawan memakai alat lokal Unand, dibandingkan dengan GAMA-EWS UGM.
    - Mitra: Semen Padang (L2, posko Palembayan 2025 dengan 3 alat berat, 30 personel, 2 water truck, dan RS Semen Padang).
  - P3 **KKN Tematik Pesisir Megathrust** Sumbar-Bengkulu (KKN Tematik). Mitra: TJSL Pegadaian.
- **Kampus sekitar**:
  - Unri: Pusat Studi Gambut dan Kebencanaan sejak 2014.
  - Unsri: restorasi gambut bersama NIFOS Korea.
  - Keduanya menjadi satelit flagship IPB untuk karhutla, bukan program Unand.
- **Pagar**: APP/Arara Abadi sudah menggandeng Unri, padahal pemasok APP disanksi pada 2026. Jangan dijadikan mitra program.

### 3.3 IPB (tematik karhutla dan gambut): tipe pusat uji dan latih

- **Aset terbukti**:
  - RFMRC-SEA sejak 2017, satu-satunya pusat regional Global Fire Monitoring Center di Asia Tenggara.
  - Pusat pelatihan kebakaran hutan dan gambut berteknologi tinggi (diresmikan 24 Juni 2024).
  - Melatih 19 peserta dari 4 negara bersama Manggala Agni (Mei 2025).
  - FFEWS dan FINCAPES di Muaro Jambi.
  - Pakar forensik kebakaran yang sudah menjadi saksi ahli di 24 perkara.
- **Celah**: tidak ditemukan perjanjian karhutla IPB dengan APP, APRIL, Asian Agri, atau Musim Mas. Hubungannya baru di tingkat
  asosiasi (GAPKI) dan beasiswa (Tanoto).
- **Flagship: Akademi Regu Pemadam Gambut**
  - Masalah: regu pemadam perusahaan, Masyarakat Peduli Api, dan BPBD dilatih dengan standar berbeda.
  - Kampus: IPB menjadikan pusat latihnya tempat sertifikasi regu dengan kurikulum baku.
  - Swasta:
    - Perusahaan perkebunan dan HTI menjadi peserta berbayar. Motifnya kewajiban kesiapan pemadaman di ISPO dan RSPO.
    - Pertamina Hulu Rokan (L2, BUMN di gambut Riau, lebih dari 200 personel pemadaman) menjadi mitra pendiri.
  - BNPB: mengakui sertifikat itu untuk Satgas Karhutla.
  - Unit BNPB: Penanganan Darurat.
- **Ajuan pendukung**:
  - P2 **FFEWS ke desa gambut** (Ruang Inovasi). Alat murah IPB diproduksi lebih banyak. Mitra: Asian Agri (L2, Desa Bebas Api
    sejak 2016, belum di daftar sanksi) dan Telkomsel untuk jaringan.
  - P3 **Verifikasi independen Desa Bebas Api** (Simpul riset). IPB memeriksa klaim program perusahaan dengan data hotspot sistem
    BNPB.
- **Pagar**:
  - Pakar IPB bersaksi melawan perusahaan, jadi dana sawit atau HTI wajib lewat aturan konflik kepentingan.
  - APP hanya boleh menjadi peserta latih, bukan sponsor.
  - APRIL/Tanoto berisiko sedang.

### 3.4 UI (DKI dan Banten): tipe manusia dan data

- **Aset terbukti**:
  - DRRC UI: kajian multidisiplin dan simulasi evakuasi 3D. Pernah dikontrak Pertamina Hulu Rokan (2024) untuk tata kelola
    tanggap darurat kebakaran.
  - RSUI dan FKUI: relawan medis bergelombang.
  - Psikologi UI: relawan Psychological First Aid.
  - Peraturan Rektor 15/2024 tentang Kampus Aman Bencana dan keberlangsungan usaha.
  - ILUNI UI: dua kali menerima penghargaan BNPB.
- **Celah**: mitra swasta kebencanaan UI yang terdokumentasi baru Pertamina Hulu Rokan.
- **Flagship: Jakarta Tetap Bekerja, rencana keberlangsungan usaha gedung kantor**
  - Masalah: kantor pusat perusahaan menumpuk di Jakarta yang 58% kejadian bencananya banjir, tetapi rencana keberlangsungan
    usahanya jarang diuji.
  - Kampus: DRRC dan K3 FKM UI menyusun dan menguji rencana itu bersama mahasiswa, memakai aturan kampus aman bencana UI sebagai
    contoh.
  - Swasta: perusahaan membiayai kajian gedungnya sendiri, dan karyawannya ikut Korps Relawan. Mitra: Bank Mandiri (L2,
    sekitar 67.000 bantuan Sumatra), Astra (L2), dan Pertamina Hulu Rokan (L1).
  - BNPB: memakainya sebagai standar keberlangsungan usaha dunia usaha.
  - Unit BNPB: Pencegahan.
- **Ajuan pendukung**:
  - P2 **Tim Medis dan Psikososial Darurat Kampus** (Satgas Bencana). RSUI ditambah Psikologi UI. Mitra: Astra (L2, 19 posko,
    perbaikan ambulans bersama Kemenkes). Unit BNPB: Penanganan Darurat.
  - P3 **Selat Sunda Siaga Tsunami** bersama Untirta (KKN Tematik).
    - Dasarnya: tsunami adalah penyebab 325 dari 462 korban jiwa di regional ini.
    - Industri Banten (Krakatau Steel, Chandra Asri) masih perlu dijajaki.
- **Kampus sekitar**: UNJ untuk modul sekolah DKI; Untirta untuk pesisir Banten. Keduanya masih celah dan perlu dicek.

### 3.5 ITB (Jawa Barat): tipe pembuat produk

- **Aset terbukti**:
  - Respons teknis cepat di dua bencana:
    - Cianjur 2022: 6 seismograf, penilaian bangunan PPMB, 267 mahasiswa.
    - Sumatra 2025: 47 unit ultrafiltrasi IGW, dan alat 1.000 liter/jam di 35 lokasi.
  - Memimpin lokakarya konsorsium 14 kampus bersama BNPB dan JICA (12 Januari 2026).
  - Geolini, seismograf IoT.
  - AI Innovation Hub Telkomsel di Labtek STEI (sejak 16 Desember 2025).
- **Mitra yang sudah ada**: ParagonCorp (L1). Paragon sudah bersama ITB di banyak jalur:
  - Labtek XV bersama Pertamina (2025);
  - Dana Lestari sejak 2019 dan sekitar 60 beasiswa (2025);
  - Dome Theater imersif Museum ITB (2026);
  - ikut program air bersih ITB di Agam (April 2026, pipa 4,1 km, 35.000 liter/hari, 281 KK).
- **Flagship: Air Bersih Siaga ITB-Paragon**
  - Masalah: unit air bersih ITB baru dikirim setelah bencana terjadi.
  - Kampus: ITB melatih operator BPBD dan menjamin mutu.
  - Swasta: Paragon membiayai unit ultrafiltrasi IGW yang ditempatkan lebih dulu di gudang regional. Peran Paragon naik dari
    logistik pangan menjadi pembiayaan teknologi, dan karyawannya bergabung sebagai relawan.
  - BNPB: memasukkan unit itu ke standar stok gudang.
  - Unit BNPB: Logistik dan Peralatan.
- **Ajuan pendukung**:
  - P2 **Laboratorium Inovasi Kemanusiaan ITB-Paragon** (Ruang Inovasi). Kit kebersihan dan martabat pengungsi dirancang dari riset
    kebutuhan lapangan dan diuji di Labtek XV. Ini menjawab logika pemilik bahwa Paragon membawa inovasi berbasis riset.
  - P3 **Tim Cek Bangunan Pascagempa dan jaringan Geolini** (Satgas Bencana).
    - Dasarnya: gempa adalah penyebab 616 korban jiwa di Jawa Barat.
    - Analitik di AI Hub. Mitra: Telkomsel (L1).
    - Unit BNPB: Rehabilitasi dan Rekonstruksi.
- **Kampus sekitar**:
  - Unpad: Pusat Riset Kebencanaan dan pemulihan trauma.
  - UPI: kampus kependidikan di zona Sesar Lembang; mitra pedagogi program Tel-U.
- **Pagar**:
  - Polemik beasiswa YPM Salman tahun 2021 bisa diungkit bila Paragon tampil menonjol.
  - Program tetap atas nama BNPB dan ITB, dan Paragon disebut sebagai mitra.

### 3.6 Telkom University (pelaksana di regional Jawa Barat): contoh pemilik

- **Aset terbukti**:
  - PATRIOT-Net: IoT terintegrasi BMKG, ditambah base station radio kognitif bergerak untuk komunikasi cadangan.
  - Flood Eye dan Tide Eye bersama University of Wollongong. Flood Eye belum aktif; targetnya 6 titik pada akhir Oktober 2026.
  - CoE Metaverse Research and Experience Center.
  - Aplikasi VR SIGAP untuk simulasi gempa.
- **Celah**:
  - VR edukasi bencana ke sekolah belum pernah dijalankan.
  - Status platform metaNesia Telkom 2025-2026 belum jelas.
- **Flagship: Sekolah Siaga VR**
  - Kampus:
    - Tel-U membangun skenario VR gempa, banjir, dan longsor dari data kejadian nyata.
    - ITB (PPMB) menjamin substansi; UPI menyusun modul guru.
    - Mahasiswa Tel-U turun ke sekolah sebagai fasilitator.
  - Swasta: Telkom Indonesia (L1, induk ekosistem Tel-U) mensponsori platform, headset, dan jaringan. Relawan Telkom ikut ke
    sekolah. Rekam Telkom yang paling dekat adalah sekolah sementara SDN Cibulakan di Cianjur.
  - BNPB: kurikulum Satuan Pendidikan Aman Bencana dan akses ke dinas pendidikan.
  - Unit BNPB: Pencegahan.
- **Ajuan pendukung**: P2 **PATRIOT-Net untuk komunikasi posko** (Ruang Inovasi). Mitra: Telkomsel dan Telkomsat (120 unit satelit
  cadangan di Sumatra 2025).
- **Pagar**:
  - Hindari Infomedia sebagai pintu masuk, karena terseret perkara pembiayaan fiktif Telkom senilai Rp431,7 miliar.
  - Masuk lewat Telkom induk atau Telkomsel.

### 3.7 UGM (Jateng dan DIY): tipe pembuat produk

- **Aset terbukti**:
  - GAMA-EWS: standar ISO 22327, dihilirkan lewat PT Gama Multi Usaha Mandiri, terpasang di 30 provinsi.
  - EWS megathrust kabel laut optik bersama Telkom, diapresiasi BMKG 30 Mei 2025.
  - DERU sejak Merapi 2010: 3 posko kampus, 8 klinik pengungsian, sekitar 100 kampus mitra pemulihan.
  - PSBA untuk Satuan Pendidikan Aman Bencana (SPAB); Magister Manajemen Bencana.
- **Flagship: GAMA-EWS ke desa rawan longsor**
  - Masalah: longsor adalah penyebab 331 dari 583 korban jiwa di regional ini.
  - Kampus: UGM menjamin mutu dan melatih warga.
  - Swasta: perusahaan kampus dan mitra manufaktur (pola MoU PT INTI 2018) memproduksi alat; Telkom (L1) menyediakan jaringan.
  - BNPB: menetapkan lokasi dari kajian risiko dan menganggarkan pemasangan.
  - Unit BNPB: Pencegahan.
- **Ajuan pendukung**:
  - P2 **EWS megathrust kabel laut UGM-Telkom** (Simpul riset). BNPB menjadi pengguna hilir bersama BMKG.
  - P3 **Klinik Pengungsian DERU** (Satgas Bencana). Mitra: Sido Muncul (L1, kemitraan riset herbal sejak September 2024; bantuan
    Sumatra sekitar Rp1,4 miliar).
- **Kampus sekitar**:
  - UII: BARRATAGA, rumah tahan gempa.
  - Undip dan UNS: satelit KKN dan Korps Relawan.
- **Pagar**:
  - Penemu GAMA-EWS kini Kepala BMKG, jadi pengadaan lewat BNPB wajib terbuka.
  - Industri rokok tidak dipakai untuk program anak (PP 28/2024).

### 3.8 ITS (Jawa Timur): tipe pusat uji dan latih

- **Aset terbukti**:
  - Pusat kebencanaan sejak 2004 (kini Puslit MKPI).
  - Pemodelan tsunami untuk InaTEWS Merah Putih.
  - Desain kapal rumah sakit bencana di platform KCR 60 m buatan PT PAL.
  - Huntara Lombok 2018 (914 unit direncanakan) dan konsep huntara-huntap hibrida untuk Semeru.
  - MoU dengan MAIPARK (2022).
  - RAISA bersama Unair.
- **Flagship: Kapal Rumah Sakit Bencana Kepulauan**
  - Kampus: ITS merancang.
  - Swasta: PT PAL (L1, kerja sama strategis Juli 2026) membangun.
  - Operasi: Unair mengoperasikan dengan pengalaman RS Kapal Ksatria Airlangga.
  - BNPB: menetapkan kebutuhan operasi kepulauan.
  - Unit BNPB: Penanganan Darurat, serta Logistik dan Peralatan.
  - Catatan: perjanjian tiga pihak belum ada (inferensi).
- **Ajuan pendukung**:
  - P2 **Huntara Cepat Bangun** (Ruang Inovasi). Mitra: SIG dan Petrokimia Gresik (L1/L2, sudah turun di Semeru), United Tractors.
    Unit BNPB: Rehabilitasi dan Rekonstruksi.
  - P3 **Surabaya Tangguh Berasuransi** (Simpul riset). Mitra: MAIPARK (L1). Unit BNPB: Sistem dan Strategi.
- **Kampus sekitar**: Unair (RS Kapal, psikososial); UB belum diverifikasi.
- **Pagar**: kapal kemanusiaan dipisahkan tegas dari lini kapal perang PAL.

### 3.9 Unram (Bali dan Nusa Tenggara): tipe tuan rumah lapangan

- **Aset terbukti**:
  - Posko gabungan gempa Lombok 2018; memimpin identifikasi wilayah bagi ITS dan UGM.
  - Magister Teknik Sipil: rumah dan sekolah tahan gempa ferosemen, desa tangguh tsunami Labuhan Haji.
  - Kajian kesiapsiagaan Kuta Mandalika.
- **Celah**: laman pusat studi bencana Unram tidak ditemukan.
- **Flagship: Rumah dan Sekolah Ferosemen Tahan Gempa**
  - Masalah: regional ini mencatat 314.825 rumah rusak, tertinggi di antara 10 regional, dan gempa adalah penyebab 574 dari
    1.180 korban jiwa.
  - Kampus: Unram melatih tukang dan menyusun desain baku.
  - Swasta:
    - AMMAN (L1, mitra riset Unram; tim tanggap daruratnya turun di Lombok 2018, Cianjur, dan Bima) membiayai percontohan.
    - Bank NTB Syariah (L1, MoU Tri Dharma 18 Mei 2026) menyiapkan pembiayaan mikro rumah.
  - Unit BNPB: Rehabilitasi dan Rekonstruksi.
- **Ajuan pendukung**: P2 **Mandalika dan Tanjung Benoa Siaga Tsunami** (Kampus Aman Bencana, diperluas ke kawasan wisata).
  - Unram menggarap Mandalika, Unud menggarap Bali.
  - Mitra: InJourney/ITDC (L2) dan hotel sebagai tempat evakuasi vertikal.
- **Kampus sekitar**: Unud (MoU InJourney 2025, gunung api bersama UGM); Undana belum diverifikasi.
- **Pagar**: uji tuntas tambang, dan kajian dampak Batu Hijau tetap independen.

### 3.10 ULM (Kalimantan): tipe manusia dan data

- **Aset terbukti**:
  - PPIIG: analisis faktor banjir di 11 kabupaten/kota Kalsel.
  - Pusat Studi Kebencanaan: sumur bor pembasahan gambut di Banjarbaru.
  - Hutan pendidikan mangrove Kotabaru 629 ha.
  - MoU lahan basah dengan KLH (2025).
- **Celah**: rekam tanggap darurat ULM sebagai lembaga saat banjir Kalsel 2021 tidak ditemukan.
- **Flagship: Peta Risiko Lahan Basah Kalimantan**
  - Masalah: karhutla adalah 51% kejadian di regional ini, dan banjir 32%.
  - Kampus: ULM memetakan risiko banjir dan api untuk desa dan jaringan listrik.
  - Swasta: PLN (L1, kemitraan riset 16 Juli 2025; memulihkan 1.036 gardu saat banjir 2021). PLN berkepentingan melindungi
    gardunya sendiri.
  - BNPB: memakai peta itu untuk kajian risiko provinsi.
  - Unit BNPB: Sistem dan Strategi.
- **Ajuan pendukung**:
  - P2 **Desa Gambut Siaga Api Kalsel-Kalteng** (KKN Tematik). Mitra: Pertamina Hulu Indonesia (L2). Untan menjadi rujukan pakar
    gambut.
  - P3 **Sabuk Mangrove Kotabaru** (Simpul riset). Adaro (L3) hanya sebagai penyedia aset (alat, bibit), bukan wajah program.
- **Pagar**: banjir Kalsel Januari 2026 kembali dikaitkan media dengan tambang.

### 3.11 Unhas (Sulawesi): tipe tuan rumah lapangan

- **Aset terbukti**:
  - Pusat Studi Kebencanaan dan Tim Kajian Kebencanaan lintas disiplin.
  - Riset likuefaksi Palu dan Mamuju.
  - Tim bedah FK di RS Undata Palu (2018) dan TBM FK di gempa Sulbar (2021).
- **Model swasta yang sudah terbukti**: MoU dengan PT Masmindo Dwi Area (17 Juli 2024) untuk kajian bencana, sistem peringatan
  dini, dan pelatihan tanggap darurat di Luwu; hasilnya dipaparkan Maret 2025.
- **Flagship: Industri Sulawesi Sadar Risiko**
  - Masalah: gempa adalah penyebab 4.958 dari 5.541 korban jiwa di regional ini, dan banyak industri berdiri di zona rawan.
  - Kampus: Unhas menjalankan kajian risiko wilayah operasi, sistem peringatan dini, dan latihan desa sekitar.
  - Swasta: model Masmindo diperluas ke perusahaan lain (Vale dengan MoU Agustus 2025, Semen Tonasa dengan MoU Agustus 2026).
  - BNPB: menetapkan formatnya agar sejalan dengan kajian risiko daerah.
  - Unit BNPB: Sistem dan Strategi.
- **Ajuan pendukung**:
  - P2 **Peta Likuefaksi untuk Tata Ruang Palu-Mamuju** (Pendampingan BPBD). Untad membawa alat deteksi likuefaksi (akurasi uji
    laboratorium 80%).
  - P3 **Logistik Laut Gempa Sulawesi** (Satgas Bencana). Mitra: Kalla Group (L2, logistik laut Palu 2018, mitra BPBD Sulsel 2022).
    Kalla juga mitra ITB, jadi bisa menjadi jembatan Unhas dan ITB.
- **Pagar**:
  - Masmindo menambang di daerah rawan, jadi perlu uji tuntas.
  - Vale membawa risiko tumpahan minyak Towuti 2025.

### 3.12 Unpatti (Maluku dan Papua): tipe tuan rumah lapangan

- **Aset terbukti**:
  - Kampus yang ikut terdampak gempa Ambon 2019.
  - Riset tsunami dan tata ruang Ambon bersama TDMRC USK sejak 2022.
  - Lokakarya IRIDeS Tohoku (2024).
  - Edukasi tsunami pulau kecil yang rutin.
  - Laboratorium Terpadu Blok Masela.
- **Celah**: pusat studi kebencanaan resmi Unpatti belum ditemukan.
- **Flagship: Pulau Kecil Siaga Tsunami, kembaran USK-Unpatti**
  - Kampus: kurikulum dan alat TDMRC dipindahkan ke pulau kecil.
  - Swasta:
    - Telkomsel (L2, lebih dari 800 BTS baru di Maluku-Papua) membawa jaringan dan kanal pesan peringatan.
    - INPEX Masela (L1, beasiswa 343 mahasiswa dan laboratorium) mendanai kajian.
  - Unit BNPB: Pusdatinkom dan Pencegahan.
- **Ajuan pendukung**:
  - P2 **Kampus Aman Bencana Unpatti** sebagai contoh kawasan timur. Mitra: PLN (L1).
  - P3 **Papua lewat Uncen** (Satgas Bencana). Freeport (L3) hanya menyediakan fasilitas dan tim tanggap darurat.
  - Unkhair membawa pengalaman Pusat Studi Bencana dalam program CaRED (2017).

## 4. Ringkasan: 12 flagship dan mitra utamanya

| Kampus | Flagship | Mitra utama (lapis) | Unit BNPB | Program rev4 yang diwujudkan |
|---|---|---|---|---|
| USK | Pusat Uji Tsunami Nasional | PEMA (L1), BSI (L1) | Pencegahan | Ruang Inovasi |
| Unand | Padang Siap Megathrust | Pegadaian (L1), Hutama Karya (L1) | Pencegahan | Pendampingan BPBD |
| IPB | Akademi Regu Pemadam Gambut | Pertamina Hulu Rokan (L2), Asian Agri (L2) | Penanganan Darurat | Korps Relawan |
| UI | Jakarta Tetap Bekerja | Mandiri (L2), Astra (L2), PHR (L1) | Pencegahan | Kampus Aman Bencana (diperluas ke kantor) |
| ITB | Air Bersih Siaga ITB-Paragon | ParagonCorp (L1) | Logistik dan Peralatan | Ruang Inovasi |
| Tel-U | Sekolah Siaga VR | Telkom Indonesia (L1) | Pencegahan | Mata kuliah dan KKN (ke sekolah) |
| UGM | GAMA-EWS ke desa rawan longsor | Telkom (L1), mitra manufaktur | Pencegahan | Ruang Inovasi ke e-Katalog |
| ITS | Kapal Rumah Sakit Bencana Kepulauan | PT PAL (L1) | Penanganan Darurat | Ruang Inovasi |
| Unram | Rumah dan Sekolah Ferosemen | AMMAN (L1), Bank NTB Syariah (L1) | Rehabilitasi dan Rekonstruksi | KKN Tematik |
| ULM | Peta Risiko Lahan Basah | PLN (L1) | Sistem dan Strategi | Pendampingan BPBD |
| Unhas | Industri Sulawesi Sadar Risiko | Masmindo (L1), Vale (L1, berpagar) | Sistem dan Strategi | Simpul riset |
| Unpatti | Pulau Kecil Siaga Tsunami | Telkomsel (L2), INPEX (L1) | Pusdatinkom | Joint Research (dengan USK) |

Sebaran:
- **Lapis mitra**: 9 dari 12 flagship memakai mitra lapis L1, yaitu yang sudah bekerja dengan kampusnya. Tiga sisanya (IPB, UI,
  Unpatti) memakai mitra L2 karena perjanjian kebencanaan kampusnya dengan swasta belum ditemukan.
- **Unit BNPB**: semua enam unit dari paparan rev4 tersentuh. Pencegahan 5, Sistem dan Strategi 2, Penanganan Darurat 2, Logistik
  dan Peralatan 1, Rehabilitasi dan Rekonstruksi 1, Pusdatinkom 1.

## 5. Yang belum bisa dipastikan (perlu cek sebelum masuk deck)

- **Tel-U dan Telkom**:
  - VR edukasi bencana Tel-U belum pernah dijalankan.
  - Status platform metaNesia Telkom belum jelas.
- **IPB**: pendana pusat latih api, dan sikap IPB bila perusahaan sawit menjadi peserta latih berbayar.
- **ITS**: perjanjian tiga pihak ITS-PAL-Unair belum ada.
- **ULM**: rekam ULM saat banjir Kalsel 2021 belum ditemukan.
- **Kampus yang belum dicari atau belum ketemu**:
  - pusat studi kebencanaan Unpatti dan Unram;
  - UNJ, Untirta, UB, Undana, Unmul, dan Unsrat.
- **Angka yang perlu dicek ulang**: "63 unit" di berita Antara tentang Agam menulis IPB padahal konteksnya ITB.
- **Penjajakan swasta**: belum satu pun perusahaan yang ditanya kesediaannya. Status di deck ditulis "calon mitra"
  dan "dijajaki", bukan "mitra".
