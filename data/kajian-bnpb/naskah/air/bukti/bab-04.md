# Berkas bukti BAB 4 KONDISI SUMBER DAYA AIR PULAU JAWA

Kajian: Grand Design Ketahanan Air Pulau Jawa 2026–2030 (BNPB; pembaca utama Kepala BNPB).
Disusun peneliti 23 Oktober 2026 untuk penulis bab (PEDOMAN-DESAIN §C9); direvisi 24 Oktober 2026 sesuai temuan
pemeriksa (catatan revisi di akhir berkas). Penulis bab menulis hanya dari berkas ini dan dari registri angka; klaim
yang tidak ada di sini ditolak penyunting substansi.

Berkas pendamping:

- `naskah/air/bukti/bab-04.angka.json`: kunci angka baru untuk registri (belum digabung ke `data/angka.json`).
- `naskah/air/bukti/bab-04.pustaka.json`: entri CSL-JSON (34 sumber).

Bahan yang dibaca: `KERANGKA.md` §2, §4 (Bab 4), §6, §7, §8; `KEPUTUSAN.md`; Buku Pegangan L56–L64 dan baris
"Program kajian hanya yang terbukti"; `PEDOMAN-DESAIN.md` §C9; `riset/A`–`E` (E6, E7, E17 dimuat pada revisi
24 Oktober 2026); paket `data/air-jawa/` (README dan semua tabel), `data/program-terbukti/kompendium_program.csv`,
`data/angka.json`; `riset/mentah/pj.pdf` (dirender ulang 300 dpi), `riset/mentah/bn638.txt`,
`riset/mentah/slh.txt`, `riset/mentah/oni_cpc.txt`; teks UU 17/2019 (`data/lembaga/mentah/teks/uu-17-2019.json.gz`);
sumber web yang dibuka 23 dan 24 Oktober 2026 (disebut per butir), termasuk Keppres 26/2011 (Lampiran I), RPSDA WS
Jratunseluna 2024, dan laporan World Bank–Bappenas *Indonesia Vision 2045: Towards Water Security* (2021).

## Konvensi label

| Label | Arti |
| --- | --- |
| resmi | Instansi pemerintah, dokumen atau tabel dibuka langsung |
| terverifikasi | Sumber primer non-pemerintah yang dibuka (jurnal bertinjauan, data terbuka akademik, laporan lembaga multilateral yang dibuka langsung; KERANGKA §2 butir 6 "sumber primer non-resmi") |
| estimasi-model | Keluaran model yang belum diuji balik |
| asumsi-kebijakan | Pilihan penyusun |
| sekunder | Berita atau ringkasan; sumber primer tidak terbuka. **Tidak masuk badan teks**, hanya pembanding atau celah, dan tidak masuk registri |
| olah(x) | Hitungan tim dari angka berlabel x; rumus disebut |

Bagian "Inferensi" adalah penilaian tim peneliti, bukan temuan sumber, dan ditandai **[Inferensi tim]**.

---

## Kerangka bab (dari KERANGKA.md §4, BAB 4)

- **Judul:** BAB 4 KONDISI SUMBER DAYA AIR PULAU JAWA (14 hlm).
- **Subbab:** 4.1 Ketersediaan dan Pemakaian Air; 4.2 Air Baku dan Air Minum; 4.3 Irigasi; 4.4 Waduk dan Bendungan;
  4.5 Air Tanah; 4.6 Penurunan Muka Tanah dan Pesisir Utara; 4.7 DAS dan Tutupan Lahan Hulu.
- **Tujuan bab:** menggambarkan lima komponen pada tingkat data yang ada; komponen tanpa data ditulis sebagai celah
  dan permintaan data, bukan peta kosong.
- **Pertanyaan kunci:**
  1. Berapa porsi rumah tangga tiap provinsi yang bersumber air minum leding lawan sumur dan mata air, yaitu sumber
     yang rentan saat kemarau?
  2. Berapa luas irigasi per kab/kota dan kewenangan, dan di mana daerah irigasi kewenangan pusat?
  3. Bendungan mana yang kehilangan tampungan dan instrumen keamanannya rusak menurut dokumen resmi?
  4. Kota mana yang punya laju penurunan muka tanah terverifikasi, dan CAT mana yang dinyatakan rusak?
- **Temuan kunci yang diharapkan (KERANGKA) dan status setelah diperiksa:**

| Temuan yang diharapkan | Status setelah diperiksa |
| --- | --- |
| IPA Jawa 2010 54% (kritis sedang), 42% tanpa aliran pemeliharaan; estimasi model, konteks pulau | Dikonfirmasi pada teks BPS 2020 di repo (`riset/mentah/slh.txt` baris 2186–2190). Tetap estimasi model |
| Air minum layak 2025 95,73–99,98%; leding 2023 DKI 7,64%, Banten 2,18% | Dikonfirmasi. **Ditambah:** sumur bor/pompa, sumur dan mata air terlindung serta tak terlindung, dan air kemasan per provinsi kini dapat ditulis (kolom 1–7 tabel BPS menurut urutan judul; alasan di P1 temuan 3) |
| Irigasi Jawa 3.135.123 ha (34,3% nasional), permukaan 3.001.332 ha; 94 DI pusat, 457 DI provinsi | Dikonfirmasi; ditambah porsi per kewenangan dan sebaran DI pusat per kab |
| Cacaban 90 ke 45,13 juta m³; Kedung Ombo 5,5%; piezometer rusak Kedung Ombo 3/58, Penjalin 12/51, Jatibarang 11/39 | Dikonfirmasi pada dokumen. **Ditambah:** volume hilang Kedung Ombo 39,81 juta m³ (41,2% sedimentasi balai) disandingkan dengan persennya; jumlah seluruh instrumen 18 bendungan (V-notch 26/48 rusak, inklinometer 13/24 rusak) dan instrumen Kedung Ombo (inklinometer 11/13 rusak) |
| Pekalongan 10–19 cm/th (Widodo dkk. 2024); Semarang maks 10–12 cm/th (Aditiya dan Ito 2023) | **Dikoreksi sebagian:** angka 10–19 cm/th tertulis di kalimat latar abstrak Widodo dkk.; hasil studinya sendiri adalah penurunan kumulatif sampai 100 cm 2014–2022. **Ditambah:** GNSS BIG CPKL Pekalongan 10,7 cm/th (Susilo dkk. 2023); Sidiq dkk. (2021) sebagai baris berdampingan; dua angka resmi Badan Geologi: CAT Jakarta 0,04–6,30 cm/th (2015–2022) dan Kota Semarang 2–10 cm/th, Demak lebih dari 10 cm/th (Badan Geologi 2018, dikutip RPSDA Jratunseluna 2024) |
| Tujuh CAT rusak (Badan Geologi, Nov 2023), berlabel sekunder | **Naik menjadi pernyataan instansi (resmi, tanpa dokumen penetapan):** artikel situs Badan Geologi 22 Januari 2024 menyebut CAT rusak Jakarta, Karawang-Bekasi, Semarang, Bandung-Soreang, Bogor, Serang-Tangerang (ditambah Palangkaraya di luar Jawa). Pekalongan-Pemalang hanya ada di daftar media. Tetap bukan syarat daftar perhatian (lihat P4) |

- **Komponen (KERANGKA):** Gambar 4.1 diagram hulu ke hilir lima komponen dan pelakunya (B5.23); Tabel 4.1 profil
  6 provinsi (B5.7); Gambar 4.2 koroplet luas irigasi permukaan per kab/kota 2015 (G19); Gambar 4.3 irigasi per
  provinsi dan kewenangan (G8); Gambar 4.4 titik bendungan dalam paket (G20); Tabel 4.2 bendungan BBWS
  Pemali-Juana (B5.7, resmi saja); Gambar 4.5 rentang laju penurunan muka tanah terverifikasi per kota (G12);
  Tabel 4.3 CAT rusak dan permintaan rilis Badan Geologi (B5.7). Rincian dan usulan perubahan di bagian Komponen.
- **Status data (KERANGKA):** ada (irigasi, inventaris BBWS Pemali-Juana, penurunan muka tanah terverifikasi);
  sebagian (air minum per kab hanya Jawa Tengah; bendungan bukan inventaris lengkap; GNSS Susilo dkk. 2023
  belum ditarik); celah (air tanah per kab, zona konservasi CAT, debit sungai, IPA per WS, kondisi jaringan irigasi).
  **Pembaruan:** tabel kecepatan vertikal 20 stasiun GNSS Susilo dkk. (2023, Tabel 2) sudah dibaca dan dipetakan ke
  kab/kota; deret waktu Zenodo belum diolah. Neraca per WS sebagian tertutup: Pola/RPSDA 10 WS Jawa terbuka (riset E6),
  Pemali-Comal belum; yang dibaca langsung untuk bab ini hanya RPSDA Jratunseluna 2024. Kondisi jaringan irigasi kini
  ada untuk tingkat nasional per kewenangan (data 2014), belum per provinsi.

Catatan lingkup: Bab 4 tidak memuat skenario, jadi aturan lantai skenario (KERANGKA §2 butir 9) tidak dipakai di
sini. Angka model di bab ini (IPA, ketersediaan per kapita, WorldPop) selalu disandingkan dengan angka tercatat
(lihat bagian Bahan subbab 4.1). Strategi dan program tidak dibahas di bab ini (prinsip 17); posisi bukti program
yang disebut hanya dicatat supaya penulis tidak menyebutnya "terbukti".

---

## P1. Berapa porsi rumah tangga tiap provinsi yang bersumber air minum leding lawan sumur dan mata air?

### Inti

Pada 2023, rumah tangga yang air minum utamanya leding hanya 2,18% (Banten) sampai 12,97% (Jawa Tengah), sedangkan
sumur dan mata air (sumur bor atau pompa, sumur dan mata air terlindung, sumur dan mata air tak terlindung) bersama-sama
40,30% (Banten) sampai 60,51% (DI Yogyakarta); Jawa Tengah 56,40% dan Jawa Timur 55,27%. Sumber tak terlindung, yang
paling rentan saat kemarau, menyumbang 2,07 (Jawa Timur) sampai 4,09 poin persen (Banten) di lima provinsi selain DKI.
Tanpa sumber tak terlindung, angkanya 36,21–57,80% (batas bawah). DKI Jakarta berbeda: sumur dan mata air hanya 12,86%, karena 79,39% rumah
tangganya minum air dalam kemasan (bermerk dan isi ulang). Nama kolom tak terlindung dan kemasan dibaca dari urutan
judul tabel BPS (P1 temuan 3). Akses air minum "layak" 2025 sudah 95,73–99,98% di semua provinsi, jadi ukuran layak
tidak membedakan kerentanan kemarau; komposisi sumber yang membedakannya.

### Temuan bersumber

1. **Leding 2023 (persen rumah tangga):** DKI Jakarta 7,64; Jawa Barat 4,66; Jawa Tengah 12,97; DI Yogyakarta 10,33;
   Jawa Timur 8,58; Banten 2,18; Indonesia 8,92. Sumber: `data/air-jawa/air_minum.csv` (indikator
   `rumah_tangga_sumber_air_minum_leding_persen`, tahun 2023) dan `provinsi.csv` kolom `air_minum_leding_2023`;
   BPS, tabel "Distribusi Persentase Rumah Tangga Menurut Provinsi dan Sumber Air Minum, 2023" (diperbarui 15 Februari
   2024; ditarik 23 Oktober 2026). Label: resmi.
2. **Sumur dan mata air 2023 (persen rumah tangga; kolom 1–7 tabel yang sama):**

   | Provinsi | Leding (1) | Sumur bor/pompa (2) | Sumur terlindung (4) | Sumur tak terlindung (5) | Mata air terlindung (6) | Mata air tak terlindung (7) | Terlindung, jumlah 2+4+6 | Semua sumur dan mata air, 2+4+5+6+7 | Air dalam kemasan (3) |
   | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
   | DKI Jakarta | 7,64 | 12,57 | 0,18 | – (nol) | 0,08 | 0,03 | 12,83 | 12,86 | 79,39 |
   | Jawa Barat | 4,66 | 18,44 | 15,24 | 1,79 | 8,56 | 1,89 | 42,24 | 45,92 | 49,03 |
   | Jawa Tengah | 12,97 | 17,58 | 17,89 | 1,92 | 16,95 | 2,06 | 52,42 | 56,40 | 29,78 |
   | DI Yogyakarta | 10,33 | 25,00 | 28,41 | 1,72 | 4,39 | 0,99 | 57,80 | 60,51 | 22,76 |
   | Jawa Timur | 8,58 | 24,52 | 15,66 | 0,59 | 13,02 | 1,48 | 53,20 | 55,27 | 35,75 |
   | Banten | 2,18 | 23,21 | 8,51 | 2,44 | 4,49 | 1,65 | 36,21 | 40,30 | 56,82 |
   | Indonesia | 8,92 | 17,07 | 15,26 | 2,41 | 10,10 | 2,07 | 42,43 | 46,91 | 40,64 |

   Sumber: `data/air-jawa/mentah/bps/sumber_air_minum_prov_2023.txt` (teks tabel BPS yang dirender, URL dan waktu tarik
   di baris pertama). Angka: resmi. Jumlah: olah(resmi). Sumber tak terlindung (5 + 7) dalam poin persen: DKI 0,03;
   Jawa Barat 3,68; Jawa Tengah 3,98; DI Yogyakarta 2,71; Jawa Timur 2,07; Banten 4,09; Indonesia 4,48. Penamaan kolom:
   lihat temuan 3.
3. **Penamaan kolom tabel BPS 2023:** halaman memuat 11 judul kolom (kategori 2020): Leding, Pompa, Air Dalam Kemasan,
   Sumur Terlindung, Sumur Tak Terlindung, Mata Air Terlindung, Mata Air Tak Terlindung, Air Permukaan, Air Hujan,
   Lainnya, Jumlah. Tiap baris hanya memuat 8 nilai, lalu 100,00 dan dua `...`. Tim menerima pemetaan menurut urutan
   untuk kolom 1–7, dan tidak menafsirkan kolom 8 per kategori. Alasannya: (a) kedelapan nilai tiap baris berjumlah
   100 (selisih paling besar 0,01), jadi 100,00 adalah kolom Jumlah dan ekor judul yang bergeser, bukan awalnya;
   (b) kolom 1, 2, 4, 6 cocok dengan pembanding luar: Kompas, 13 Februari 2024, mengutip BPS *Indikator Perumahan dan
   Kesehatan Lingkungan 2023*, menulis leding 8,92%, sumur bor atau pompa 17,07%, sumur terlindung 15,26%, dan mata air
   terlindung 10,10% untuk Indonesia, sama dengan kolom 1, 2, 4, 6 baris Indonesia
   (https://lestari.kompas.com/read/2024/02/13/100000486/mayoritas-penduduk-indonesia-andalkan-air-isi-ulang-untuk-minum,
   diakses 23 dan 24 Oktober 2026); kolom 3, 5, 7 terletak di antara kolom yang sudah cocok itu, sesuai urutan judul;
   (c) kolom 3 Indonesia 40,64 lebih besar dari air isi ulang 31,87% di berita yang sama, cocok dengan "air dalam
   kemasan" yang memuat isi ulang dan kemasan bermerk; (d) kolom 8 Kalimantan Barat 48,39 cocok dengan sisa yang memuat
   air hujan, jadi kolom 8 adalah gabungan air permukaan, air hujan, dan lainnya. Label: angka resmi; nama kolom 1, 2,
   4, 6 terverifikasi pembanding; nama kolom 3, 5, 7 olah(resmi) menurut urutan judul, belum dicek ke publikasi BPS.
   Bila penyunting menolak pemetaan kolom 5 dan 7, penulis memakai angka terlindung (36,21–57,80%) sebagai batas bawah.
4. **Air minum layak 2025 (persen rumah tangga):** DKI 99,98; Jawa Barat 95,84; Jawa Tengah 95,73; DI Yogyakarta 97,33;
   Jawa Timur 97,30; Banten 96,03; Indonesia 93,22. Sumber: `air_minum.csv` (indikator
   `rumah_tangga_akses_air_minum_layak_persen`); BPS tabel provinsi (diperbarui 16 Desember 2025). Label: resmi.
5. **Jawa Tengah per kab/kota 2025:** terendah Grobogan 83,47%, lalu Banjarnegara 89,83%, Purworejo 90,01%; 12 dari 35
   kab/kota di bawah 95%, 2 di bawah 90%. Sumber: `air_minum.csv` (tingkat `kab`); BPS Jawa Tengah (diperbarui 14 April
   2026). Label: resmi; hitungan jumlah kab: olah(resmi).
6. **Layak tidak sama dengan aman atau perpipaan; leding Susenas bukan cakupan jaringan PU.** Sumber: `air-jawa/README.md`
   §3 dan §6. Label: resmi (definisi paket).
7. **Disandingkan, bukan dibandingkan:** kejadian kekeringan DIBI 2015–2025 per provinsi: Jawa Barat 156, Jawa Tengah
   140, Jawa Timur 71, Banten 19, DI Yogyakarta 10, DKI 0. Sumber: `provinsi.csv` kolom `dibi1525_kejadian_kekeringan`.
   Label: olah(resmi). Jumlah kejadian kekeringan DIBI mengukur intensitas pelaporan, bukan keparahan (KERANGKA §2
   butir 7).
8. **Dibantah oleh / tidak sebanding:** perpipaan nasional 19,47% (Perpamsi) lawan 30,15% (Kementerian PU), dan DKI layak
   sekitar 100% lawan cakupan perpipaan PAM Jaya sekitar 75% (Oktober 2025). Sumber: `riset/B-air-jawa.md` §5.1. Label:
   sekunder, tidak masuk badan teks; paket sengaja tidak memasukkannya (`air-jawa/README.md` §6).

### Inferensi

- **[Inferensi tim]** Di lima provinsi (DI Yogyakarta, Jawa Tengah, Jawa Timur, Jawa Barat, Banten) lebih dari 40%
  rumah tangga minum dari sumur atau mata air, yaitu sumber yang debitnya turun saat kemarau panjang; sumber tak
  terlindung menambah 2–4 poin persen di tiap provinsi itu. Rasio sumur dan mata air terhadap leding paling timpang di
  Banten (18,5 kali) dan Jawa Barat (9,9 kali). Dengan ukuran ini, kerentanan kemarau 2026 lebih tepat dibaca dari
  komposisi sumber daripada dari akses layak yang sudah hampir penuh.
- **[Inferensi tim]** DKI dan Banten bertumpu pada air dalam kemasan (79,39% dan 56,82%; nama kolom olah(resmi), lihat
  temuan 3). Kerentanan saat kemarau di sana bergeser ke harga dan rantai pasok depot isi ulang, yang sebagian juga
  mengambil air tanah atau mata air; ini belum dapat dibuktikan dengan data paket.
- **[Inferensi tim]** Sumur bor atau pompa dipakai hampir seperempat rumah tangga di DI Yogyakarta, Jawa Timur, dan
  Banten. Di kota pesisir utara, pengambilan air tanah ini terkait langsung dengan penurunan muka tanah (P4), jadi
  komponen air minum dan penurunan muka tanah tidak dapat dibaca terpisah.
- **[Inferensi tim]** Grobogan punya akses layak terendah di Jawa Tengah (83,47%, BPS) dan termasuk lima kab/kota yang
  disebut RPSDA Jratunseluna 2024 sebagai tempat defisit air baku WS itu terutama terjadi, bersama Pati, Demak, Blora, dan
  Kota Semarang (hlm. 27; Bahan 4.1 temuan 8). Dua dokumen resmi dari instansi berbeda menunjuk kabupaten yang sama;
  angka 41,60 m³/detik adalah hasil analisis neraca untuk seluruh WS, bukan defisit Grobogan sendiri, dan urutan
  penyebutan bukan peringkat. Empat bendungan kecil Grobogan yang kehilangan 56,78–86,94% tampungan (P3)
  hanya kehilangan 3,18 juta m³ bersama-sama, jadi bukan bukti utama. Ini bahan Bab 5, bukan syarat daftar perhatian
  (syarat (d) Bab 3 tidak memuat air minum).

### Celah

- Sumber air minum per kab/kota di luar Jawa Tengah (dan sumber air minum per kab di Jawa Tengah) tidak ditarik; tabel
  BPS provinsi lain tidak termuat lewat peramban otomatis. **Penyajian:** tingkat provinsi berlabel; kab/kota lain
  ditulis "belum tersedia". **Permintaan:** BPS provinsi (Susenas, tabel sumber air minum per kab/kota).
- Nama kolom 3, 5, 7 tabel 2023 dibaca dari urutan judul (temuan 3), belum dicek ke publikasi; kolom 8 tidak dirinci
  per kategori. **Permintaan:** buka publikasi BPS *Indikator Perumahan dan Kesehatan Lingkungan 2023* (katalog
  3301001; berkas sekitar 12 MB, bps.go.id menolak pengambilan otomatis) dan tabel tahun 2024 bila ada.
- Sumber air untuk mandi dan cuci (bukan minum) tidak ditarik, padahal kebutuhan volume saat kemarau ada di situ.
- Cakupan SPAM perpipaan per kab/kota (Kementerian PU) dan data distribusi air bersih BPBD per kab saat kemarau 2023 dan
  2026 tidak ditemukan. **Permintaan:** Kementerian PU (Ditjen Cipta Karya), BPBD provinsi lewat Pusdatinkom (keputusan
  14 hari pertama butir 3, KERANGKA §6).

---

## P2. Berapa luas irigasi per kab/kota dan kewenangan, dan di mana daerah irigasi kewenangan pusat?

### Inti

Jawa memiliki 3.135.123 ha daerah irigasi (34,3% nasional; penetapan Permen PUPR 14/PRT/M/2015, baseline 2015),
3.001.332 ha di antaranya irigasi permukaan. Menurut kewenangan, pusat memegang 1.120.683 ha (35,7%) di 94 DI,
provinsi 406.395 ha (13,0%) di 457 DI, dan kab/kota 1.608.045 ha (51,3%) di 30.432 DI. DI kewenangan pusat menyentuh
73 dari 119 kab/kota, tetapi terpusat di pesisir utara Jawa Barat: Indramayu, Karawang, Subang, dan Bekasi memegang
326.970 ha (29,2% luas DI pusat Jawa). Angka itu memuat tiga sumber air yang berbeda: DI Jatiluhur 237.790 ha (21,2% DI
pusat Jawa, seluruhnya di empat kab ini) bergantung pada kaskade Citarum; bagian Indramayu dari DI Rentang (66.612 ha)
dipasok Sungai Cimanuk lewat Waduk Jatigede; sisanya 22.568 ha DI lain.

### Temuan bersumber

1. **Rekap per provinsi dan kewenangan (ha):** Banten pusat 62.209, provinsi 30.856, kab/kota 120.865; Jawa Barat
   405.510, 100.600, 365.577; Jawa Tengah 347.674, 86.865, 543.988; DI Yogyakarta 12.460, 13.987, 44.581; Jawa Timur
   292.830, 174.087, 533.034 (tercetak; rekap per jenis 533.035). Sumber: `air-jawa/provinsi.csv` kolom
   `irigasi_*_ha_rekap`, `irigasi_rekonsiliasi.csv`; Permen PUPR 14/PRT/M/2015 Lampiran rekap hlm 13, 29, 63 (BN 2015
   No. 638). Label: resmi.
2. **Jumlah per kewenangan Jawa:** pusat 1.120.683 ha (35,75%), provinsi 406.395 ha (12,96%), kab/kota 1.608.045 ha
   (51,29%); jumlahnya 3.135.123 ha. Jumlah DI kab/kota 30.432 (1.392 + 5.166 + 12.174 + 1.389 + 10.311). Sumber: idem.
   Label: olah(resmi).
3. **Total dan jenis:** 3.135.123 ha = permukaan 3.001.332, air tanah 74.432, tambak 50.301, pompa 7.503, rawa 1.556
   (jumlah rekap 3.135.124 karena selisih 1 ha Jawa Timur di dokumen); 94 DI pusat dan 457 DI provinsi. Sumber:
   `air-jawa/air-jawa.json` `meta.irigasi`. Label: resmi.
4. **Porsi nasional 34,32%:** 3.135.123 / 9.136.027 ha (Indonesia: pusat 3.142.532 + provinsi 1.634.467 + kab/kota
   4.359.028). Sumber: Permen PUPR 14/PRT/M/2015, baris JUMLAH rekap nasional BN 638 hlm 13, 29, 63
   (`air-jawa/mentah/permen14_ocr/p013.txt` baris 49, `p029.txt` baris 49, `p063.txt` baris 50). Label: olah(resmi).
5. **Ambang kewenangan:** pusat untuk DI lebih dari 3.000 ha, lintas provinsi, lintas negara, dan strategis nasional;
   provinsi untuk 1.000–3.000 ha dan lintas kab/kota; kab/kota untuk kurang dari 1.000 ha dalam satu kab/kota. Sumber:
   Permen PUPR 14/PRT/M/2015 Pasal 9–11 (`riset/mentah/bn638.txt` baris 340–360). Label: resmi.
6. **DI pusat terbesar:** Jatiluhur 237.790 ha (Bekasi 52.728; Indramayu 24.511; Karawang 100.049; Subang 60.502),
   21,2% luas DI pusat Jawa dan 58,6% DI pusat Jawa Barat; Rentang 87.803 ha (Indramayu 66.612; Cirebon 20.620;
   Majalengka 571); Klambu 37.451 ha (Demak 20.649; Pati 9.348; Kudus 6.515); Waduk Wadaslintang 31.853 ha (Kebumen
   21.422; Purworejo 10.431); Mrican 30.341 ha. Sumber: `air-jawa/irigasi_di_pusat_provinsi.csv` (hlm BN 638 16–17).
   Label: resmi; persentase olah(resmi).
7. **Kab/kota dengan DI pusat terluas (ha):** Indramayu 100.706; Karawang 100.049; Subang 70.267; Bekasi 55.948; Demak
   43.140; Jember 40.206; Brebes 39.790; Cilacap 39.141. Empat teratas = 326.970 ha (29,18% DI pusat). 73 kab/kota punya
   luas DI pusat lebih dari 0. Sumber: `air-jawa/kab_jawa.csv` kolom `irigasi_pusat_ha`. Label: olah(resmi) (atribusi
   OCR, lolos cek rekap).
8. **Irigasi permukaan per kab/kota terluas (ha):** Karawang 112.256; Indramayu 108.563; Subang 92.385; Jember 87.830;
   Tasikmalaya 67.865; Brebes 67.283. Sepuluh kab teratas memegang 26,3% irigasi permukaan Jawa. Sembilan kab/kota tanpa
   irigasi permukaan: Kep. Seribu, lima kota administrasi Jakarta, Kota Bekasi, Kota Surabaya, Kota Tangerang Selatan.
   Sumber: `kab_jawa.csv` kolom `irigasi_permukaan_ha`. Label: olah(resmi).
9. **Mutu atribusi:** subtotal Lampiran III yang cocok penuh dengan baris DI di bawahnya baru 96 dari 175; luas tak
   teratribusi neto −3 ha, bruto 7 ha. Sumber: `air-jawa/README.md` §5; `air-jawa.json` `meta.irigasi`. Label: olah(resmi).
10. **Dibantah oleh:** riset B §4.1 menulis "DI Jatiluhur: Bekasi 82.728 ha"; pindaian BN 638 hlm 16 menulis 52.728
    (52.728 + 24.511 + 100.049 + 60.502 = 237.790). Paket memakai 52.728. Sumber: `air-jawa/README.md` §5 butir 7.
    Label: resmi.
11. **Kondisi jaringan, hanya nasional dan per kewenangan (data 2014):** teks laporan menulis 46% sistem irigasi
    Indonesia berkondisi buruk ("poor"; hlm. xx, 64, 65) dan pertanian memakai sekitar 80% air (hlm. 13, 65). Gambar 33
    laporan yang sama (hlm. 65, sumber: Renstra Ditjen SDA 2015–2019, data 2014) merinci 7.145.168 ha irigasi menurut
    kewenangan; jumlah kategori per kewenangan sama dengan luas irigasi permukaan Permen PUPR 14/2015 (pusat 2.376.521,
    provinsi 1.105.474, kab/kota 3.663.173 ha; `permen14_ocr` p013 baris 49, p029 baris 49, p063 baris 50). Gambar 33
    mencetak total pusat 2.378.521, provinsi 1.105.475, kab/kota 3.663.172 ha, tetapi kategori di bawahnya berjumlah
    persis angka Permen dan total 7.145.168 ha. Porsi berkategori "ruined": pusat 6,96%, provinsi 18,68%, kab/kota
    21,4%; "poor" dan "ruined" bersama: pusat 18,1%, provinsi 35,6%, kab/kota 40,2%, nasional 32,2%; semua selain
    "good": nasional 43,6%. **Ditulis berdampingan:** angka 46% di teks tidak dapat direkonstruksi dari Gambar 33
    (32,2% atau 43,6%, tergantung kategori). Sumber: World Bank (2021), *Indonesia Vision 2045: Towards Water Security*,
    disusun bersama Bappenas, CC BY 3.0 IGO (https://hdl.handle.net/10986/36727, PDF dibuka 24 Oktober 2026). Label:
    terverifikasi (laporan lembaga multilateral bersama Bappenas, dibuka; data asal Renstra Ditjen SDA belum dibuka);
    persentase per kewenangan olah(terverifikasi). Tidak ada rincian per provinsi. Unggahan blog de Jong (21 Mei 2022)
    hanya meringkas laporan ini dan tidak dipakai sebagai sumber.
12. **DI Rentang bukan bagian kaskade Citarum:** Waduk Jatigede, satu-satunya waduk di Sungai Cimanuk, mengairi Daerah
    Irigasi Rentang sekitar 90.000 ha. Sumber: Sekretariat Kabinet, "Mulai Diisi Air, Waduk Jatigede Diharapkan Dapat
    Tingkatkan Intensitas Tanam Padi", 31 Agustus 2015 (setkab.go.id, diakses 24 Oktober 2026). Label: resmi. Luas
    penetapan DI Rentang 87.803 ha (temuan 6) dipakai untuk hitungan; angka 90.000 ha pembulatan siaran. Permen PUPR
    14/2015 tidak menyebut BBWS pemegang (`irigasi_di_pusat_provinsi.csv` kolom `bbws_disebut` kosong); pemegangnya
    BBWS Cimanuk-Cisanggarung belum dicek ke dokumen balai.
13. **DI Jatiluhur dan pasokan waduk:** DI Jatiluhur 237.790 ha adalah 30% dari 797.971 ha irigasi padi yang dipasok
    waduk secara nasional; dalam sepuluh tahun sebelum studi, luas terairi turun 9.355 ha (musim hujan) dan 10.170 ha
    (musim kemarau) seiring turunnya debit Citarum. Sumber: Tarigan dan Tukayo (2013), *Journal of Tropical Soils* 18(2):
    169, doi:10.5400/jts.2013.18.2.169 (abstrak dibaca lewat API DOAJ, 23 Oktober 2026). Label: terverifikasi.
14. **Tidak memuat Jawa:** daftar 14 provinsi prioritas tahap awal Inpres 2/2025 tentang jaringan irigasi tidak memuat
    provinsi Jawa. Sumber: `riset/B-air-jawa.md` §4.3. Label: sekunder (PDF Inpres tidak terunduh).

### Inferensi

- **[Inferensi tim]** DI Jatiluhur 237.790 ha (21,2% DI pusat Jawa) bergantung pada kaskade Citarum. Kekurangan air
  waduk Citarum pada kemarau panjang akan menekan seperlima luas DI pusat Jawa sekaligus; ini titik tunggal yang perlu
  dibawa ke Bab 5 (dampak pangan) dan Bab 8 (rekomendasi per BBWS). DI Rentang (87.803 ha, 66.612 ha di antaranya di
  Indramayu) bergantung pada Cimanuk dan Jatigede, jadi merupakan titik tunggal kedua yang terpisah, bukan bagian dari
  risiko Citarum.
- **[Inferensi tim]** Separuh luas irigasi Jawa (51,3%) ada di 30.432 DI kewenangan kab/kota yang masing-masing kurang
  dari 1.000 ha. Pelaksana daerah untuk rekomendasi kemarau di irigasi adalah dinas kab/kota, bukan BBWS; rekomendasi yang
  hanya menyasar BBWS akan meleset dari separuh luas.
- **[Inferensi tim]** Baseline sudah berumur 11 tahun, tetapi tidak ada data pembanding setelah 2015 untuk menilai
  apakah luas penetapan masih sama dengan luas terairi. Penurunan di hilir Citarum (temuan 13) terjadi sebelum 2013,
  dan Permen PUPR 14/2015 sudah memakai luas Cacaban yang menyusut (DI Cacaban/Bd. Dukuh Jati 7.439 ha, sama dengan
  layanan 2021; `irigasi_di_pusat_provinsi.csv` baris 71, hlm BN 20), demikian pula DI Pemali Bawah/Bd. Notog 26.952 ha
  (baris 24, hlm BN 16) yang sama dengan layanan Penjalin 2021. Jadi keduanya bukan bukti bahwa penetapan 2015 melebihi luas terairi 2026.
- **[Inferensi tim]** Bila pola nasional 2014 (temuan 11) berlaku di Jawa, porsi jaringan rusak terbesar ada di DI
  kab/kota, yang memegang 51,3% luas irigasi Jawa. Ini memperkuat inferensi kedua di atas, tetapi belum dapat
  dibuktikan untuk Jawa.

### Celah

- Kondisi jaringan irigasi per provinsi atau per DI (e-PAKSI, Indeks Kinerja Sistem Irigasi) tidak ditemukan di sumber
  terbuka (dicari 23 Oktober 2026). Yang ada hanya rincian nasional per kewenangan data 2014 (temuan 11), dan dokumen
  asalnya (Renstra Ditjen SDA 2015–2019) belum dibuka. **Permintaan:** Kementerian PU (Ditjen SDA, e-PAKSI).
- Tidak ada data pembanding luas terairi setelah 2015 (e-PAKSI, luas baku sawah ATR/BPN dan Kementan). **Penyajian:**
  penulis tidak menyatakan luas penetapan lebih besar atau lebih kecil dari luas terairi 2026.
- Pengganti atau pemutakhiran Permen PUPR 14/PRT/M/2015 tidak ditemukan (dicari 23 Oktober 2026). **Penyajian:**
  "baseline 2015" di judul gambar dan tabel.
- Poligon DI dan luas baku sawah terkini (ATR/BPN, Kementan) tidak ditarik; peta memakai atribusi per kab.
- Tautan kab ke WS resmi hanya untuk WS kategori C (`air-jawa/README.md` §6); rekomendasi diturunkan ke BBWS pemegang
  DI pusat (KERANGKA §2 butir 8).

---

## P3. Bendungan mana yang kehilangan tampungan dan instrumen keamanannya rusak menurut dokumen resmi?

### Inti

Dokumen resmi yang dibuka hanya inventaris BBWS Pemali-Juana (status Juli 2021, 18 bendungan): tampungan desain
898,44 juta m³ tinggal 801,93 juta m³, hilang 96,51 juta m³ (10,7%). Cacaban 44,87 juta m³ (49,86% tampungannya) dan
Kedung Ombo 39,81 juta m³ (5,51%) bersama-sama 88% sedimentasi balai. Empat bendungan kecil berumur lebih dari seabad di
Grobogan kehilangan 56,78–86,94% tampungan masing-masing, tetapi hanya 3,18 juta m³ bersama-sama (3,3%). Dari 543
piezometer, 87 rusak (16,0%); kerusakan terberat pada V-notch (26 dari 48) dan inklinometer (13 dari 24), dan di Kedung
Ombo, bendungan terbesar, 11 dari 13 inklinometer dan 21 dari 48 alat ukur penurunan (settlement) rusak.

### Temuan bersumber

1. **Jumlah 18 bendungan BBWS Pemali-Juana (status Juli 2021):** volume normal 898,44 juta m³; volume efektif 790,19;
   tampungan 2021 801,93; sedimentasi 96,51 (tercetak; jumlah barisnya 96,545). Sumber: `air-jawa/bendungan_rekonsiliasi.csv`;
   BBWS Pemali Juana (2021), *Daftar inventarisasi bendungan di lingkungan BBWS Pemali Juana*, baris TOTAL hlm 2
   (`riset/mentah/pj.pdf`). Label: resmi. Kehilangan 10,74% = 96,51 / 898,44: olah(resmi).
2. **Kehilangan tampungan per bendungan (1 − tampungan 2021 / volume normal desain):** Butak 86,94%; Simo 82,95%;
   Sanggeh 77,78%; Nglangon 56,78%; Cacaban 49,86%; Banyukuwung 40,81%; Greneng 24,61%; Klego 23,36%; Lodan 20,32%;
   Penjalin 18,21%; Tempuran 17,83%; Gembong 12,63%; Panohan 10,32%; Jatibarang 9,17%; Grawan 6,75%; Kedung Ombo
   5,51%; Gunungrowo 1,36%; Logung 0,0%. Butak (1901–1903), Simo (1904), Sanggeh (1909), dan Nglangon (1911–1914) di
   Kab. Grobogan. Sumber: `air-jawa/bendungan.csv` kolom `kehilangan_tampungan_persen`, `tahun_bangun`. Label: olah(resmi).
   **Dalam volume (juta m³, kolom `sedimentasi_juta_m3`; porsi dari 96,51):** Cacaban 44,87 (46,5%); Kedung Ombo 39,81
   (41,2%; `pj.txt` baris 186); Jatibarang 1,87; Penjalin 1,73; Butak 1,39; Nglangon 1,24; Gembong 1,20; Lodan 1,095;
   Banyukuwung 0,99; Klego 0,64; Greneng 0,57; Tempuran 0,38; Simo 0,37; Sanggeh 0,18; Gunungrowo 0,10; Panohan 0,08;
   Grawan 0,03; Logung 0. Cacaban dan Kedung Ombo bersama 84,68 (87,7%); empat bendungan Grobogan (Butak, Simo, Sanggeh,
   Nglangon) 3,18 (3,3%). Label: resmi; porsi olah(resmi). Penulis menyajikan volume dan persen berdampingan.
3. **Cacaban:** 90 juta m³ desain, 45,13 juta m³ terukur 2021, sedimentasi 44,87 juta m³ (46,5% dari sedimentasi 18
   bendungan); layanan irigasi desain 17.481 ha, 2021 7.439 ha (turun 57,4%). Sumber: `bendungan.csv` (kolom
   `pemanfaatan`), `pj.txt` baris 29 dan 162. Label: resmi; persentase olah(resmi). Kunci registri yang sudah ada:
   `airjawa.bendungan.cacaban.*`.
4. **Layanan irigasi lain yang turun (desain lawan 2021):** Gunungrowo 6.052 ke 3.921 ha; Penjalin 29.000 ke 26.952 ha;
   Kedung Ombo 64.365 ke 60.920 ha; Panohan 530 ke 329 ha; Sanggeh 263 ke 50 ha. Sumber: `bendungan.csv` kolom
   `pemanfaatan`. Label: resmi.
5. **Instrumen keamanan, jumlah 18 bendungan (buah, rusak):** piezometer 543 (87; 16,0%); V-notch 48 (26; 54,2%);
   inklinometer 24 (13; 54,2%); papan duga 26 (5); OW/GP 70 (14; 20,0%); patok geser 197 (25; 12,7%); settlement 56
   (21; 37,5%); extensometer 22 (4); seismograf 8 (2); under drain 8 (3). Sumber: `riset/mentah/pj.pdf` hlm 2, baris
   "T O T A L = 18 BENDUNGAN" dan judul kolom 30–39, dicek tim pada render 300 dpi 23 Oktober 2026; piezometer juga di
   `bendungan_rekonsiliasi.csv`. Label: resmi; persentase olah(resmi).
6. **Piezometer rusak per bendungan:** Penjalin 12 dari 51; Jatibarang 11 dari 39; Cacaban 10 dari 54; Gembong 9 dari
   17 (52,9%); Panohan 7 dari 29; Tempuran 6 dari 29; Kedung Ombo 3 dari 58; Klego, Gunungrowo, Lodan 0. Sumber:
   `air-jawa/bendungan_angka.csv` (besaran `piezometer`, `piezometer_rusak`). Label: resmi.
7. **Kedung Ombo (723 juta m³ desain, 80,5% volume desain 18 bendungan):** inklinometer 13 (rusak 11); settlement 48
   (rusak 21); OW/GP 24 (rusak 10); V-notch 5 (rusak 4); extensometer 7 (rusak 4); seismograf 3 (rusak 2); piezometer
   58 (rusak 3). Sumber: `pj.pdf` hlm 2 baris Kedungombo, dicek pada render 300 dpi. Label: resmi.
8. **Galat di dokumen sumber:** koordinat Gunungrowo, Simo, Greneng, dan Sanggeh jatuh di luar kab yang disebut; Grawan
   dicantumkan di bawah Kab. Pati padahal Kec. Sumber dan koordinatnya di Rembang. Sumber: `air-jawa/README.md` §6;
   `bendungan.csv` kolom `koordinat_cek`. Label: resmi (dokumen) dengan koreksi olah.
9. **Jatiluhur:** volume 2.970 juta m³ (1964), 2.556 (1987), 2.456 (1995), 2.448 (2000), menurut laporan akhir Perum
   Otorita Jatiluhur 2000 yang dikutip Sheftiana, Purwanto, dan Tarigan (2021), *Jurnal Ilmu Tanah dan Lingkungan* 23(1):
   18–21, doi:10.29244/jitl.23.1.18-21 (abstrak dibuka 23 Oktober 2026). Label: terverifikasi. Hilang 522 juta m³ dalam
   36 tahun (17,6%; rata-rata 14,5 juta m³ per tahun): olah(terverifikasi).
10. **Dibantah oleh (laju sedimentasi Jatiluhur):** rata-rata 20 juta m³ per tahun 1995–2009 (echosounding 2009, tesis
    UGM; `riset/B-air-jawa.md` §3.2 dan hasil pencarian 23 Oktober 2026), sedangkan deret volume operator di butir 9
    hanya turun 8 juta m³ pada 1995–2000 (1,6 juta m³ per tahun). Ditulis berdampingan; tesis berlabel sekunder.
11. **Saguling:** dalam sepuluh tahun sebelum studi, sedimentasi memperpendek waktu paruh tampungan (setengah kapasitas
    terisi sedimen) dari 294 menjadi 28 tahun. Sumber: Tarigan dan Tukayo (2013). Label: terverifikasi.
12. **Sekunder (tidak masuk badan teks):** Sutami 343 ke 178,16 juta m³ (2019); Gajah Mungkur efektif 433 (1983) ke 375
    (2005); Cirata 2.165 lawan 1.900 juta m³ (bertentangan); Jatiluhur 3.000 lawan 2.440 juta m³ di paket. Sumber:
    `air-jawa/bendungan.csv`, `bendungan_angka.csv`, `riset/B-air-jawa.md` §3. Label: sekunder.
13. **Cakupan paket:** 37 bendungan, 18 resmi BBWS Pemali-Juana dan 19 dari riset B (sekunder); bukan inventaris
    lengkap. Kapasitas Selorejo, Tukul, Sadawarna, Gongseng, Lesti tidak ditemukan. Sumber: `air-jawa.json`
    `meta.bendungan`; `air-jawa/README.md` §3. Label: olah(resmi, sekunder).
14. **Dasar hukum:** "erosi dan sedimentasi" dan "perembesan" termasuk daya rusak air (UU 17/2019 Penjelasan Pasal 35
    ayat (3) huruf b dan k). Sumber: `data/lembaga/mentah/teks/uu-17-2019.json.gz`. Label: resmi.
15. **Posisi bukti program terkait (bukan untuk Bab 4):** sodetan dan bendungan kering Ciliwung (P14) berkekuatan bukti
    lemah, posisi "Program berjalan, wajib evaluasi dampak"; embung dan panen air hujan (P10) belum terbukti. Klaim
    reduksi banjir Ciawi 20,87% dan Sukamahi 7% (Maret 2025) sekunder. Sumber: `program-terbukti/kompendium_program.csv`;
    `bendungan_angka.csv`. Label: resmi (rubrik paket); klaim reduksi sekunder. Penulis tidak menyebut keduanya
    "terbukti".

### Inferensi

- **[Inferensi tim]** Dalam volume, kehilangan tampungan di BBWS Pemali-Juana terkumpul di dua bendungan: Cacaban
  44,87 dan Kedung Ombo 39,81 juta m³ (88% sedimentasi balai). Dalam persen, bendungan kecil tua di Grobogan dan Cacaban
  yang menonjol; karena itu persen tidak boleh disajikan tanpa volume. Kedung Ombo, yang memegang 85,2% tampungan 2021
  balai ini, mengalami kehilangan tampungan absolut besar sekaligus instrumen pemantau deformasi yang paling rusak;
  implikasinya ke rencana tindak darurat bendungan dan rencana kontingensi kab di hilir dibahas di Bab 6 dan Bab 8.
- **[Inferensi tim]** Dua angka Jatiluhur di paket (3.000 dan 2.440 juta m³) sejalan dengan volume desain 1964 (2.970)
  dan volume terukur 2000 (2.448) di deret operator. Keduanya kemungkinan bukan dua versi kapasitas yang sama, melainkan
  dua titik waktu; tabel rekonsiliasi Bab 3 sebaiknya memakai deret operator berlabel terverifikasi.
- **[Inferensi tim]** Data berstatus Juli 2021. Pada kemarau El Niño 2026, kondisi tampungan dan instrumen kemungkinan
  tidak lebih baik; tidak ada data untuk menyatakan seberapa buruk.
- **[Inferensi tim]** Delapan BBWS lain dan PJT I/II tidak punya inventaris terbuka setara, sehingga Bab 4 tidak dapat
  menyatakan apa pun tentang keamanan bendungan Brantas, Citarum, atau Bengawan Solo. Pita "data sedimentasi dan
  instrumen hanya BBWS Pemali-Juana" wajib di Gambar 4.4 dan Tabel 4.2.

### Celah

- Inventaris bendungan (tampungan terukur, sedimentasi, instrumen) BBWS selain Pemali-Juana dan Perum Jasa Tirta I/II
  tidak ditemukan terbuka. **Permintaan:** Kementerian PU (Ditjen SDA, Balai Teknik Bendungan), PJT I, PJT II.
- Status keamanan resmi per bendungan (klasifikasi bahaya, rekomendasi Komisi Keamanan Bendungan) dan rencana tindak
  darurat (RTD) per bendungan tidak ditemukan. **Permintaan:** Kementerian PU; tembusan ke BPBD kab hilir.
- Daftar PSN bendungan terbaru tidak dibuka (KERANGKA §8). **Penyajian:** PSN tidak disebut per bendungan.
- Survei batimetri Jatiluhur setelah 2000, Cirata, Saguling, Sutami tidak ditemukan dari sumber primer.

---

## P4. Kota mana yang punya laju penurunan muka tanah terverifikasi, dan CAT mana yang dinyatakan rusak?

### Inti

Di antara 20 stasiun GNSS kontinu BIG di pesisir utara, yang tercepat adalah CPKL di Kota Pekalongan: 10,7 cm per tahun
(2010–2021). Angka lain diukur dengan metode dan periode berbeda dan tidak diperingkat terhadapnya: Pekalongan sampai
7 cm per tahun (InSAR SBAS 2016–2020) dan sampai 16 cm per tahun (InSAR PS 2016–2023), kumulatif sampai 100 cm
(PS-InSAR 2014–2022); Semarang dan Demak sampai 8 cm per tahun (InSAR SBAS 2016–2020) dan maksimum 10–12 cm per tahun di
Semarang utara-timur dan Demak (InSAR SBAS 2015–2022); titik InSAR tertinggi di Kab. Bandung dan Bandung Barat sekitar
22 cm per tahun (InSAR Sentinel-1, periode tidak disebut di sumber yang dibaca). Ada dua angka resmi Badan Geologi
(metode tidak disebut): CAT Jakarta 0,04–6,30 cm per tahun (2015–2022), dan Kota Semarang 2–10 cm per tahun serta
Demak lebih dari 10 cm per tahun (Badan Geologi 2018, dikutip RPSDA Jratunseluna 2024; periode ukur tidak disebut).
Badan Geologi menyatakan enam CAT di Jawa rusak (Jakarta, Karawang-Bekasi, Semarang, Bandung-Soreang, Bogor,
Serang-Tangerang); daftar ini dimuat di situs resmi Badan Geologi 22 Januari 2024 sebagai pernyataan Plt. Kepala Badan
Geologi, bukan dokumen penetapan status. Nama CAT Pekalongan-Pemalang tidak ada di daftar itu dan hanya muncul di
pemberitaan; Pekalongan disebut di artikel yang sama sebagai contoh penurunan tanah di Pantura.

### Temuan bersumber

1. **GNSS kontinu BIG, 20 stasiun pesisir utara, 2010–2021 (kecepatan vertikal):** CPKL Kota Pekalongan −107,0 mm/th
   (ketidakpastian 0,202); CROL Indramayu −15,9; CTGL Kota Tegal −12,5; CJKT Jakarta Utara −6,4; CLMG Lamongan −4,9;
   CPAI Probolinggo −3,5; CTGR Tangerang Selatan −2,9; CJPR Jepara −2,7; CCIR Kota Cirebon −2,3; CSBY Surabaya −2,2;
   CSEM Kota Semarang −0,8; stasiun lain antara −2,1 dan +0,4. Sumber: Susilo dkk. (2023), *Scientific Data* 10: 421,
   doi:10.1038/s41597-023-02274-0, Tabel 2 (teks penuh Europe PMC PMC10314896, diakses 23 Oktober 2026). Label:
   terverifikasi. Pemetaan stasiun ke kab/kota: olah (uji titik dalam poligon `air-jawa/peta_kab.geojson`).
2. **Patok dalam Badan Geologi di Pekalongan** (sekitar 500 m dari CPKL, dipasang 17 Maret 2020): turun 60 ± 1 mm
   sampai 6 April 2021 dan 140 ± 1 mm sampai 2 Oktober 2022, jadi 80 ± 1 mm dalam sekitar 1,5 tahun. Sumber: Susilo
   dkk. (2023), Gambar 5. Label: terverifikasi.
3. **Pekalongan, InSAR:** 60,9% titik pengamatan turun, sampai 100 cm kumulatif 2014–2022 (PS-InSAR ALOS-2, 45 citra;
   kesesuaian dengan patok lapangan 83%). Kalimat latar abstrak yang sama menyebut laju Pekalongan 10–19 cm per tahun
   dan Semarang serta Demak rata-rata 4–10 cm per tahun tanpa menyebut asalnya. Sumber: Widodo dkk. (2024), *Urban
   Science* 8(4): 234, doi:10.3390/urbansci8040234 (abstrak lewat OpenAlex, 23 Oktober 2026). Label: terverifikasi
   (hasil studi); angka 10–19 cm/th diperlakukan sebagai kutipan latar. Kunci registri yang sudah ada
   `airjawa.turun_tanah.pekalongan.widodo2024` memakai 10–19; lihat catatan di bagian Angka untuk registri.
4. **Pekalongan, InSAR lain (tiga baris berdampingan, metode dan periode berbeda):** sampai 7 cm/th (InSAR SBAS
   Sentinel-1 2016–2020; Sidiq dkk. 2021, *IOP Conf. Ser.: Earth Environ. Sci.* 873: 012078,
   doi:10.1088/1755-1315/873/1/012078); maksimum 16 cm/th di barat kota, pesisir sekitar 5 cm/th, laju hampir konstan
   (InSAR PS Sentinel-1 2016–2023; Sidiq dkk. 2023); lebih dari 5 cm/th di Pekalongan Utara, sesuai GNSS (InSAR
   Sentinel-1 dan GNSS 2016–2024; Handoko dkk. 2026, *J. Phys.: Conf. Ser.* 3238: 012037,
   doi:10.1088/1742-6596/3238/1/012037). Sumber: `air-jawa/subsiden_kota.csv` (abstrak dibaca via OpenAlex 21 Oktober
   2026). Label: terverifikasi.
5. **Semarang dan Demak:** maksimum 100–120 mm/th di Semarang utara-timur dan Demak, sekitar 20% luas Semarang
   terdampak, Kendal 50 mm/th (SBAS InSAR Sentinel-1 2015–2022); korelasi 0,86 antara muka air tanah dan deformasi.
   Sumber: Aditiya dan Ito (2023), *International Journal of Applied Earth Observation and Geoinformation* 125: 103579,
   doi:10.1016/j.jag.2023.103579; `subsiden_kota.csv`; `riset/B-air-jawa.md` §6.1. Label: terverifikasi. Ditulis
   berdampingan: Semarang dan Demak sampai 8 cm/th (InSAR SBAS Sentinel-1 2016–2020; Sidiq dkk. 2021). Label:
   terverifikasi. Semarang 1999–2011: rata-rata ruang GPS 6–7 cm/th, maksimum lokal 14–19 cm/th (Abidin dkk. 2013).
   Label: terverifikasi.
5a. **Semarang dan Demak, resmi:** Tabel 5.83 "Penurunan Muka Tanah di WS Jratunseluna" mencantumkan Kota Semarang
   2–10 cm per tahun dan Kab. Demak lebih dari 10 cm per tahun, bersumber Badan Geologi Kementerian ESDM 2018 (periode
   ukur dan metode tidak disebut). Sumber: Kementerian PUPR (2024), *Rencana Pengelolaan Sumber Daya Air WS Jratunseluna
   Tahun 2024*, hlm. 262 (sda.pu.go.id, dibuka 24 Oktober 2026; riset E6). Label: resmi (angka Badan Geologi dikutip
   dokumen Kementerian PU; rilis Badan Geologi 2018 sendiri belum dibuka).
6. **Bandung:** titik tertinggi 22,3 cm/th (Kab. Bandung) dan 22,0 cm/th (Bandung Barat), Sentinel-1 (Virtriana dkk.
   2026). Sumber: `subsiden_kota.csv`. Label: terverifikasi.
7. **Jakarta, resmi:** "pengukuran selama periode tahun 2015-2022 di wilayah Cekungan Air Tanah Jakarta" menunjukkan
   laju penurunan tanah 0,04–6,30 cm per tahun, lebih rendah daripada 1997–2005 (1–10 cm per tahun hingga 15–20 cm per
   tahun). Pemantauan air tanah dilakukan di 220 lokasi tiap tahun; rumah tangga yang memakai air tanah lebih dari
   100 m³ per bulan wajib berizin. Sumber: Kementerian ESDM, siaran pers No. 541.Pers/04/SJI/2023, 10 November 2023,
   "Perbaiki Kondisi Air Tanah, Pemerintah Optimalkan Upaya Pengendalian Penggunaannya" (esdm.go.id, diakses 23 Oktober
   2026). Label: resmi.
8. **Jakarta, literatur (disandingkan dengan butir 7):** 1982–2010 umumnya 1–15 cm/th, lokal 20–28 cm/th (Abidin dkk.
   2011); 1982–2014 tipikal 3–10 cm/th (leveling, GPS, InSAR; Abidin dkk. 2015, *Proc. IAHS* 370: 15–20,
   doi:10.5194/piahs-370-15-2015); maksimum lebih dari 5 cm/th (InSAR SBAS Sentinel-1 2016–2020; Sidiq dkk. 2021);
   GNSS CJKT 0,64 cm/th 2010–2021 (butir 1). Sumber: `subsiden_kota.csv`. Label: terverifikasi.
8a. **Jakarta, resmi 2009:** Kepala Badan Geologi menyatakan CAT Jakarta sudah masuk zona kritis hingga rusak;
   pengambilan air tanah akuifer dalam sekitar 21 juta m³ per tahun dari potensi 52 juta m³ per tahun (sekitar 40%,
   padahal batas yang dianjurkan 20%). Sumber: Kementerian ESDM, "Cekungan Air Tanah Jakarta Kritis", 18 Agustus 2009
   (esdm.go.id, diakses 24 Oktober 2026). Label: resmi (pernyataan pejabat dalam situs instansi).
9. **Laju terhadap muka laut:** Jakarta, Pekalongan, Semarang, dan Demak turun paling sedikit sekitar 9 kali lebih cepat
   daripada laju kenaikan muka laut global saat ini. Sumber: Susilo dkk. (2023), abstrak. Label: terverifikasi.
10. **Surabaya dan Cirebon:** Surabaya hanya laju LOS (bukan vertikal) −40 sampai +30 mm/th, Asemrowo sampai −45 mm/th
    (SBAS Sentinel-1A Mei 2015–September 2017; Anjasmara dkk. 2020, *Int. J. Adv. Sci. Eng. Inf. Technol.* 10(1):
    191–197, doi:10.18517/ijaseit.10.1.6749); Cirebon belum ada angka terverifikasi (abstrak Bramanto dkk. 2023 diblokir penerbit); GNSS
    CCIR Kota Cirebon −2,3 mm/th. Sumber: `subsiden_kota.csv`; Susilo dkk. (2023). Label: terverifikasi (Surabaya LOS,
    GNSS); Cirebon InSAR sekunder.
11. **Dibantah oleh / ditulis berdampingan:** Pekalongan 2,1–11,0 cm/th (BRIN 2015–2020) dan 12–30 cm/th (Deputi
    Bappenas, 13 November 2024); Semarang 0,9–6,0 cm/th (BRIN) dan pernyataan pers ITB 2022 "20 cm/thn" untuk Semarang,
    Pekalongan, Demak. Sumber: `subsiden_kota.csv`. Label: sekunder. Susilo dkk. (2023) juga mengutip InSAR Sentinel-1
    2015–2020 untuk Semarang 2–3 cm/th, dan stasiun CSEM mencatat 0,08 cm/th; keduanya mengukur lokasi atau periode lain
    dari InSAR maksimum Aditiya dan Ito. Label: terverifikasi. (Baris Sidiq dkk. 2021 kini di butir 4, 5, 8.)
12. **CAT rusak: pernyataan resmi lawan pemberitaan:**

    | Sumber | Label | CAT atau wilayah yang disebut rusak di Jawa |
    | --- | --- | --- |
    | Badan Geologi, artikel situs resmi 22 Jan 2024 (rubrik berita, Humas Pusat Air Tanah dan Geologi Tata Lingkungan), pernyataan Plt. Kepala Badan Geologi (19 Jan 2024 dan 13 Nov 2023) | resmi (pernyataan instansi, tanpa dokumen penetapan) | Jakarta, Karawang-Bekasi, Semarang, Bandung-Soreang, Bogor, Serang-Tangerang (ditambah Palangkaraya di luar Jawa). Pekalongan disebut dalam kutipan sebagai contoh CAT di Pantura yang sudah berimplikasi penurunan tanah, tetapi tidak ada di daftar CAT rusak; Pemalang tidak disebut |
    | Kementerian ESDM, 18 Agu 2009 (butir 8a) | resmi (pernyataan pejabat) | CAT Jakarta "kritis hingga rusak" |
    | IDX Channel, 13 Nov 2023, konferensi pers Plt. Kepala Badan Geologi | sekunder | Jakarta, Karawang-Bekasi, Serang-Tangerang, Bogor, Bandung-Soreang, Pekalongan-Pemalang, Semarang (ditambah Palangkaraya-Banjarmasin) |
    | CNBC Indonesia, 13 Nov 2023 | sekunder | Jakarta, Karawang Bekasi, Semarang, Bandung-Soreang, Bogor, Serang-Tangerang (ditambah Palangkaraya); Pekalongan-Pemalang tidak disebut |
    | CNBC Indonesia, 8 Jan 2025, Wakil Menteri ESDM | sekunder | Jakarta, Karawang, Bekasi, Bogor, Tangerang, Bandung, Soreang, Pekalongan, Pemalang, Semarang; "kritis": Brantas, Denpasar, Tabanan, Palangkaraya, Banjarmasin |

    Sumber: https://geologi.esdm.go.id/media-center/tanah-pantura-jawa-alami-penurunan-ini-mitigasi-badan-geologi
    (diakses 24 Oktober 2026; riset E7); https://esdm.go.id/id/media-center/arsip-berita/cekungan-air-tanah-jakarta-kritis
    (diakses 24 Oktober 2026); https://www.idxchannel.com/news/esdm-beberkan-wilayah-yang-cekungan-air-tanahnya-rusak-simak-lokasinya/all;
    https://www.cnbcindonesia.com/news/20231113154002-4-488634/waspada-tanah-pantura-jawa-sudah-ambles;
    https://www.cnbcindonesia.com/news/20250108163515-4-601705/waspada-air-tanah-di-daerah-ri-ini-masuk-zona-kritis-rusak
    (berita diakses 23 Oktober 2026; artikel Badan Geologi dibuka ulang 24 Oktober 2026). Artikel Badan Geologi
    tidak memuat kategori, kriteria, atau tanggal penetapan status; Kepmen ESDM 291.K/GL.01/MEM.G/2023 yang disebut di
    artikel mengatur standar persetujuan penggunaan air tanah, bukan penetapan status CAT (riset E7). Teks artikel itu
    dibuka dengan "Jakarta, CNBC Indonesia", jadi isinya tulisan media yang dimuat ulang di situs instansi; daftar CAT
    di dalamnya sama dengan versi CNBC 13 November 2023. Label resmi dipakai karena instansi memuatnya di kanal
    resminya, tetapi bobotnya tetap pernyataan, bukan penetapan. Nomor dan nama di Keppres 26/2011 Lampiran I:
    Serang-Tangerang (CAT no. 68), Jakarta (70), Bogor (71), Bekasi-Karawang (75), Bandung-Soreang (80),
    Pekalongan-Pemalang (103), Semarang-Demak (116). Paket memakai daftar tujuh CAT versi IDX
    (`air-jawa/cat_air_tanah_rusak.csv`), yang memuat Pekalongan-Pemalang; daftar resmi tidak memuatnya.
13. **Siaran pers resmi lain tidak menyebut nama CAT:** siaran pers 10 November 2023 (butir 7) hanya menyebut CAT
    Jakarta tanpa status rusak; siaran pers 8 Januari 2025 ("Dukung Pengelolaan Air Tanah Berkelanjutan, Kementerian ESDM
    Beri Kemudahan Perizinan") menyebut ada daerah dengan cadangan air tanah "rawan, kritis, dan rusak" tanpa menyebut
    namanya, dengan dasar Permen ESDM 14/2024. Sumber: esdm.go.id (diakses 23 Oktober 2026). Label: resmi. Daftar nama
    resmi hanya ada di artikel Badan Geologi 22 Januari 2024 (butir 12).
14. **Jumlah dan zonasi CAT:** Keppres 26/2011 tentang Penetapan Cekungan Air Tanah, Lampiran I, menetapkan 421 CAT
    ("Total Keseluruhan CAT"; 205 dalam satu kab/kota, 176 lintas kab/kota, 36 lintas provinsi, 4 lintas negara). CAT di
    provinsi Jawa adalah nomor 66 (Labuan, Banten) sampai 145 (Toranggo, Sumenep), yaitu 80 CAT (Lampiran I hlm. 12–25),
    sama dengan 80 CAT di data KLH 2008 yang dikutip BPS 2020 (`neraca_jawa.csv`; luas 80.936 km², potensi 41.334 juta m³
    dari sumber itu). Sumber: Keppres 26/2011, ditetapkan 13 September 2011, salinan JDIH Kementerian ESDM
    (https://jdih.esdm.go.id/storage/document/Keppres%20No.%2026%20Thn%202011.pdf, dibuka 24 Oktober 2026; teks pindaian
    dibaca lewat pdftotext, nomor CAT Jawa dicek berurutan). Label: resmi; hitungan CAT Jawa olah(resmi). Zona konservasi
    air tanah ditargetkan tersusun di seluruh CAT pada 2045, CAT prioritas pada 2029; sumur pantau air tanah 161 titik di
    seluruh Indonesia (artikel yang sama menulis 131 dibangun ditambah 37 di akhir tahun, jumlahnya 168, tidak sama
    dengan 161). Sumber: Badan Geologi, "Badan Geologi Tebar Jejak Prestasi Capaian Kapasitas Survei dan Pelayanan 2025",
    27 Oktober 2025 (geologi.esdm.go.id, diakses 23 Oktober 2026). Label: resmi (dengan selisih internal tertulis).
15. **Dasar hukum:** "tanah ambles" dan "intrusi" termasuk daya rusak air (UU 17/2019 Penjelasan Pasal 35 ayat (3) huruf
    i dan j). Sumber: `uu-17-2019.json.gz`. Label: resmi.
16. **Platform belum mengukur sendiri:** `scripts/banjir/subsiden.py` (LiCSBAS) belum pernah dijalankan; air tanah tidak ada
    di platform. Sumber: `riset/D-inventaris-platform.md` §1.12. Label: resmi (inventaris repo).

### Inferensi

- **[Inferensi tim]** Di Kota Pekalongan ada tiga pengukuran yang searah: GNSS kontinu CPKL 10,7 cm/th (2010–2021),
  patok dalam Badan Geologi 8 cm dalam sekitar 1,5 tahun (2021–2022, setara sekitar 5,4 cm/th), dan PS-InSAR sampai
  100 cm kumulatif (2014–2022). Besarnya berbeda sekitar dua kali lipat antara GNSS dan patok, dan Susilo dkk. (2023)
  sendiri menyatakan patok dan CPKL tidak dapat dibandingkan satu lawan satu (lokasi berbeda sekitar 500 m, deret GNSS
  berakhir 2021; teks penuh Europe PMC PMC10314896, dibuka ulang 24 Oktober 2026). Penulis sumber memakai patok sebagai
  pengamatan independen untuk memvalidasi arah, tetapi patok dan GNSS dilaporkan di makalah yang sama, jadi kajian ini
  tidak menyebutnya "garis bukti bebas yang saling menguatkan". Yang dapat ditulis hanya kesamaan arah.
- **[Inferensi tim]** Laju di Semarang sangat lokal: stasiun GNSS kota hampir stabil (CSEM 0,08 cm/th, 2010–2021),
  sedangkan InSAR menemukan sampai 8 cm/th (2016–2020) dan 10–12 cm/th (2015–2022) di utara-timur, dan Badan Geologi
  mencatat 2–10 cm/th (2018, periode tidak disebut). Penulis wajib menulis
  "kota tanpa titik = belum diukur" dan "satu titik stabil bukan berarti kota stabil".
- **[Inferensi tim]** Indramayu (1,59 cm/th) dan Kota Tegal (1,25 cm/th) muncul dari data GNSS tetapi belum dibahas
  literatur yang dibaca. Indramayu juga kab dengan DI pusat terluas (P2); penurunan muka tanah di hilir DI dapat
  mengubah kemiringan saluran dan drainase, tetapi tidak ada data untuk menilainya.
- **[Inferensi tim]** Tiga dari CAT yang dinyatakan rusak oleh Badan Geologi (Jakarta, Bandung-Soreang, Semarang)
  bertepatan dengan kota yang laju penurunannya terverifikasi; Pekalongan-Pemalang bertepatan juga, tetapi hanya ada di
  daftar media. Kesamaan ini menaikkan keyakinan arah. Daftar CAT tetap tidak boleh menjadi syarat daftar perhatian,
  karena yang terbuka hanya pernyataan instansi tanpa dokumen penetapan, kategori, kriteria, atau tanggal (KERANGKA §8,
  riset E7).
- **[Inferensi tim]** Angka resmi Jakarta 0,04–6,30 cm/th (2015–2022) yang lebih rendah dari 1997–2005 sejalan dengan
  pengendalian air tanah Jakarta (zona bebas air tanah, perizinan), tetapi bab ini tidak dapat menyatakan sebab-akibat.
  Pengendalian pengambilan air tanah dengan pasokan pengganti berkekuatan bukti kuat hanya untuk Tokyo, Osaka, dan
  Bangkok (P16 kompendium); padanan Indonesia belum dievaluasi. Bahasan ini di Bab 2 dan Bab 8, bukan Bab 4.

### Celah

- Dokumen penetapan status CAT (rawan, kritis, rusak) beserta kriteria dan tanggalnya, dan peta zona konservasi air
  tanah per CAT, tidak ditemukan terbuka (riset E7). **Penyajian:** Tabel 4.3 berjudul "CAT yang dinyatakan rusak oleh
  Badan Geologi (pernyataan instansi, tanpa dokumen penetapan) dan permintaan rilis"; baris resmi dari artikel Badan
  Geologi 22 Januari 2024 berlabel resmi; kolom pembanding memuat versi media (sekunder) dan catatan bahwa
  Pekalongan-Pemalang hanya ada di versi media; tidak dipakai sebagai syarat daftar perhatian. **Permintaan:**
  Kementerian ESDM (Badan Geologi, Pusat Air Tanah dan Geologi Tata Lingkungan). Tabel paket
  `air-jawa/cat_air_tanah_rusak.csv` masih berlabel sekunder dan memuat Pekalongan-Pemalang; pemutakhirannya kerja
  pemilik paket, bukan berkas ini.
- Air tanah per kab/kota (volume pengambilan berizin, muka air tanah sumur pantau, intrusi) tidak ada. **Permintaan:**
  Badan Geologi (BKAT, 161 sumur pantau), dinas ESDM provinsi.
- Deret waktu GNSS Susilo dkk. di Zenodo (doi:10.5281/zenodo.7775016) belum diolah; hanya Tabel 2 yang dipakai.
- Pengukuran sendiri (LiCSBAS) butuh keputusan pemilik (riset D). **Penyajian:** baris terverifikasi saja; sekunder di
  lampiran.
- Penurunan muka tanah Cirebon, Bekasi, Subang, Surabaya (vertikal) belum ada angka terverifikasi yang dibuka.
- Rilis Badan Geologi 2018 yang dikutip RPSDA Jratunseluna (Semarang 2–10, Demak lebih dari 10 cm/th) belum dibuka;
  periode dan metode ukurnya tidak diketahui.

---

## Bahan subbab 4.1 dan 4.7 (konteks, bukan pertanyaan kunci)

### Inti

Indeks pemakaian air Jawa 2010 adalah 54% (kritis sedang), atau 42% tanpa aliran pemeliharaan; ini keluaran model
tingkat pulau yang tidak dapat diturunkan ke wilayah sungai atau kab/kota. Di hulu Citarum, hutan menyusut dari
71.750 ha ke 9.899 ha dan permukiman bertambah dari 81.686 ha ke 176.442 ha pada 2000–2009.

### Temuan bersumber

1. **IPA per pulau 2010:** Jawa ketersediaan 5.004,64 m³/s, kebutuhan dengan aliran pemeliharaan 2.681,41 m³/s, IPA 54%
   (kritis sedang); tanpa aliran pemeliharaan 2.078,52 m³/s, 42% (kritis ringan); Sumatera 31%, Bali dan Nusa Tenggara
   46%. Sumber: `air-jawa/ipa_pulau_2010.csv`; BPS (2020) *Statistik Lingkungan Hidup Indonesia 2020* Gbr. 2.5 mengutip
   Radhika dkk. (2013); dicek pada `riset/mentah/slh.txt` baris 2186–2190. Label: estimasi-model.
2. **Air permukaan Jawa** 5.567 m³/s (175.558 juta m³/th), 6,3% nasional; CAT Jawa 80. Sumber: `neraca_jawa.csv`;
   jumlah CAT Jawa dicocokkan dengan Keppres 26/2011 Lampiran I (CAT no. 66–145, 80 CAT; P4 temuan 14). Label:
   estimasi-model (ketersediaan); resmi (CAT). Kunci registri sudah ada (`airjawa.jawa.*`).
3. **Ketersediaan per kapita** 1.227 (2020), 1.178 (2025), 1.142 (2030) m³/kapita/th adalah proyeksi terbit 2017 lewat
   rantai tersier; tidak dipakai di judul. Sumber: `neraca_jawa.csv`. Label: estimasi-model.
4. **Disandingkan dengan angka tercatat, deret penuh:** jumlah kab/kota Jawa dengan sedikitnya satu kejadian kekeringan
   DIBI, dengan ONI Juli–September (JAS) di sampingnya: 2008 73 (−0,20); 2009 26 (0,56); 2010 4 (−1,24); 2011 54
   (−0,50); 2012 64 (0,39); 2013 42 (−0,34); 2014 5 (0,07); 2015 3 (1,73); 2016 0 (−0,34); 2017 7 (−0,07); 2018 67
   (0,30); 2019 76 (0,20); 2020 12 (−0,43); 2021 7 (−0,46); 2022 3 (−0,78); 2023 43 (1,25); 2024 45 (−0,04); 2025 18
   (−0,26); 2026 55 sampai tanggal tarik (2,16). Sumber: `air-jawa/dibi_kab_tahun.csv` (kelompok `kekeringan`,
   `is_bencana` = 1, `jumlah_kejadian` lebih dari 0; 2016 tidak punya baris kekeringan), dihitung ulang 24 Oktober 2026;
   ONI dari NOAA CPC (`riset/mentah/oni_cpc.txt`; pustaka `noaa-2026-oni`). Label: olah(resmi) untuk hitungan DIBI;
   ONI resmi (lembaga pemerintah, sama dengan kunci registri `hidromet.nasional.musim_*.oni`). **Catatan baca:** deret ini tidak mengikuti ONI. Tahun El Niño kuat 2015 hanya 3 kab; tahun netral 2018
   67 kab dan 2008 73 kab; 2024 (netral) lebih banyak dari 2023 (El Niño); kemarau 2019 bukan El Niño (ONI JJA 0,38,
   JAS 0,20). Hitungan DIBI dipengaruhi intensitas pelaporan (KERANGKA §2 butir 7; P1 temuan 7), jadi deret ini tidak
   dipakai sebagai ukuran keparahan kemarau. Angka 2019 dan 2023 juga dipakai tesis (KERANGKA §4) dan Bab 5; penulis
   bab lain wajib menyertakan catatan baca yang sama.
5. **Konteks nasional:** pertanian memakai sekitar 80% kebutuhan air (2019) dan kebutuhan air diperkirakan naik 31% pada
   2015–2045 (hlm. 13); separuh PDB dihasilkan di WS bertekanan air "high" atau "severe" pada musim kemarau, dan pada
   musim kemarau 24 dari 128 WS tidak dapat memenuhi kebutuhan, 13 di antaranya di Jawa (hlm. 14); dari lima WS dengan
   defisit tahunan, tiga di Jawa (hlm. 14). **Selisih internal:** kalimat yang sama menyebut lima WS lalu merinci tiga di
   Jawa, dua di Bali, dan satu di Nusa Tenggara (jumlahnya enam); penulis hanya boleh menulis "tiga WS di Jawa" dengan
   catatan selisih ini. Sumber: World Bank (2021), *Indonesia Vision 2045: Towards Water Security*,
   disusun bersama Bappenas (https://hdl.handle.net/10986/36727, PDF dibuka 24 Oktober 2026). Label: estimasi-model
   (analisis tekanan air dan proyeksi laporan, dihitung dari PUS AIR 2016 dan data internal World Bank); disandingkan
   dengan angka tercatat di temuan 4.
6. **Hulu Citarum:** permukiman 81.686 ke 176.442 ha, hutan 71.750 ke 9.899 ha (2000–2009); debit cenderung turun walau
   hujan cenderung naik (data debit 1984–2008). Sumber: Tarigan dan Tukayo (2013). Label: terverifikasi.
7. **Bertentangan (sekunder):** porsi air Jawa 4,2% dan sekitar 7%; daya dukung air Jawa 148,6 juta jiwa (KLHS RPJPN,
   lewat Hukumonline). Sumber: `riset/B-air-jawa.md` §1. Label: sekunder; KLHS RPJPN wajib dibuka sebelum dikutip.
8. **Neraca WS Jratunseluna (dokumen resmi, per WS):** rata-rata kebutuhan air eksisting 281,20 m³/detik, pemenuhan
   eksisting 239,60 m³/detik (hlm. 26 menyebutnya "ketersediaan eksisting"), defisit 41,60 m³/detik, defisit di semua
   bulan (tabel neraca "Hasil Analisis, 2023", hlm. 191);
   defisit air baku untuk rumah tangga, perkotaan, irigasi, dan industri terutama di Kab. Grobogan, Pati, Demak, Blora,
   dan Kota Semarang (hlm. 27); kebutuhan diproyeksikan 378,81 m³/detik dalam 20 tahun (hlm. 26). Sumber: Kementerian PUPR (2024),
   *Rencana Pengelolaan Sumber Daya Air WS Jratunseluna Tahun 2024* (sda.pu.go.id, dibuka 24 Oktober 2026; riset E6).
   Label: resmi untuk pernyataan dokumen (lima kab/kota tempat defisit terutama terjadi); estimasi-model untuk angka
   m³/detik (hasil analisis neraca 2023 dalam dokumen resmi Kementerian PU, sejalan dengan perlakuan riset E6 untuk
   simulasi rob dokumen yang sama), disandingkan dengan angka tercatat (P1 temuan 5: Grobogan layak 83,47%). Dokumen tidak merinci defisit per kab dalam
   bagian yang dibaca. Pola/RPSDA sembilan WS Jawa lain terbuka di riset E6 tetapi belum dibaca untuk bab ini.

### Inferensi

- **[Inferensi tim]** IPA tahunan per pulau menyembunyikan defisit musiman dan per WS; yang dapat dipakai Bab 4 hanya
  sebagai konteks. Neraca resmi per WS (temuan 8) lebih dekat ke keputusan daripada IPA pulau, karena menyebut bulan
  defisit dan kab/kota tempat defisit terjadi. Deret DIBI (temuan 4) disandingkan sebagai angka tercatat, tetapi tidak
  dibaca sebagai ukuran keparahan kemarau dan tidak dikaitkan dengan El Niño.
- **[Inferensi tim]** Penyusutan hutan hulu Citarum dan penurunan luas terairi di hilir (P2 temuan 13) serta waktu paruh
  Saguling (P3 temuan 11) adalah satu rantai hulu ke hilir; Gambar 4.1 dapat memakai rantai ini sebagai contoh berangka.

### Celah

- Neraca air per WS **sebagian tertutup:** Pola/RPSDA tersedia untuk 10 WS Jawa (riset E6); Pemali-Comal tidak
  ditemukan; yang dibaca untuk bab ini baru RPSDA Jratunseluna 2024. IPA per WS yang seragam, batas WS vektor, dan debit
  sungai Jawa (0 titik GloFAS) tetap tidak ada (KERANGKA §7 celah 21–22). **Permintaan:** Kementerian PU (BBWS,
  Pola/RPSDA Pemali-Comal; tabel neraca per kab), BMKG atau PU untuk pos duga air.
- Tutupan lahan hulu terkini per DAS dan daftar DAS prioritas resmi tidak ditarik. **Permintaan:** KLH/BPLH dan
  Kementerian Kehutanan (Ditjen PDASRH).

---

## Komponen

| Komponen | Isi | Sumber data | Kode | Catatan untuk penulis dan perancang |
| --- | --- | --- | --- | --- |
| Gambar 4.1 | Diagram hulu ke hilir lima komponen dan pelakunya (BBWS, PJT, dinas kab, PDAM, Badan Geologi, BPBD) | KERANGKA §2 butir 2; P2–P4 | B5.23, G21 (aliran tanggung jawab, tanpa lebar sebanding) | Contoh berangka: hutan hulu Citarum, Saguling, DI Jatiluhur |
| Tabel 4.1 | Profil 6 provinsi: penduduk KRB, leding 2023, sumur dan mata air (terlindung; terlindung dan tak terlindung) 2023, air kemasan 2023, layak 2025, irigasi per kewenangan, bendungan dalam paket, kota dengan penurunan muka tanah terverifikasi | `air-jawa/provinsi.csv`; `mentah/bps/sumber_air_minum_prov_2023.txt`; `subsiden_kota.csv` | B5.7 | Tambah dua kolom sumur dan mata air (P1 temuan 2); catatan kaki penamaan kolom 3, 5, 7 (P1 temuan 3). Label per kolom |
| Gambar 4.2 | Luas irigasi permukaan per kab/kota 2015 | `air-jawa/peta_kab.geojson` kolom `irigasi_permukaan_ha` | G19 (KERANGKA) | **Usul:** G19 untuk rasio atau indeks; luas adalah total, jadi pakai G20 (simbol sebanding) atau rasio ha per km² luas kab. Pita "baseline 2015" |
| Gambar 4.3 | Irigasi per provinsi menurut kewenangan (pusat, provinsi, kab/kota) | `provinsi.csv` kolom `irigasi_*_ha_rekap` | G8 | Batang bertumpuk 100%, 3 kategori |
| Gambar 4.4 | Titik bendungan dalam paket, simbol sebanding kapasitas | `air-jawa/peta_bendungan.geojson` | G20 | Pita "data sedimentasi dan instrumen hanya BBWS Pemali-Juana"; titik sekunder diberi tanda; 9 titik peraga di pusat kab ditandai |
| Tabel 4.2 | Bendungan BBWS Pemali-Juana: volume desain, tampungan 2021, kehilangan (juta m³ dan persen, berdampingan), instrumen rusak | `bendungan.csv`, `bendungan_angka.csv`, `bendungan_rekonsiliasi.csv`, `riset/mentah/pj.pdf` hlm 2 | B5.7 | Resmi saja. Kolom kehilangan dalam juta m³ wajib di samping persen (P3 temuan 2). **Usul:** tambah baris jumlah instrumen (V-notch, inklinometer, settlement) dan kolom instrumen Kedung Ombo |
| Gambar 4.5 | Rentang laju penurunan muka tanah terverifikasi per kota | `subsiden_kota.csv` (baris terverifikasi, termasuk Sidiq dkk. 2021); Susilo dkk. 2023 Tabel 2; RPSDA Jratunseluna 2024 Tabel 5.83 | G12 | Tiap batang memuat periode dan metode; GNSS sebagai penanda titik terpisah; baris resmi Badan Geologi (Jakarta, Semarang, Demak) ditandai lain; tidak dibandingkan antarbaris dan tidak diperingkat antarmetode; label "kota tanpa titik = belum diukur" |
| Tabel 4.3 | CAT yang dinyatakan rusak oleh Badan Geologi (pernyataan instansi, tanpa dokumen penetapan) dan permintaan rilis | Artikel Badan Geologi 22 Jan 2024; ESDM 18 Agu 2009; tiga berita sebagai pembanding (P4 temuan 12); Keppres 26/2011 untuk nomor dan nama CAT | B5.7 | Baris resmi berlabel resmi; kolom pembanding media berlabel sekunder; catatan "Pekalongan-Pemalang hanya di versi media"; baris permintaan dokumen penetapan; bukan syarat daftar perhatian |
| Gambar 4.6 (usulan) | Komposisi sumber air minum 2023 per provinsi: leding, sumur bor/pompa, sumur dan mata air terlindung, sumur dan mata air tak terlindung, air kemasan, lainnya | `mentah/bps/sumber_air_minum_prov_2023.txt` | G8 | Hanya bila halaman cukup; "lainnya" = kolom 8 (air permukaan, air hujan, lainnya); catatan kaki penamaan kolom 3, 5, 7 |

---

## Angka untuk registri

Ditulis juga sebagai JSON di `naskah/air/bukti/bab-04.angka.json` dengan bentuk entri `data/angka.json` (bentuk A:
`berkas` + `jalur` relatif ke `data/`; bentuk B: `nilai` + `pustaka`). `data/angka.json` tidak disunting. Kunci yang
sudah ada dipakai ulang dan tidak didaftar lagi (`airjawa.bendungan.cacaban.*`, `airjawa.bendungan.kedungombo.*`,
`airjawa.bendungan.pj.sedimentasi_total`, `airjawa.turun_tanah.*` empat kunci, `airjawa.jawa.*` tujuh kunci termasuk
`airjawa.jawa.cat_jumlah` (80, sama dengan Keppres 26/2011), `dibi.jawa.kab_kekeringan.2019` dan `.2023`). Angka
sekunder tidak masuk registri.

**Catatan untuk kunci lama:** `airjawa.turun_tanah.pekalongan.widodo2024` (10–19 cm/th) berasal dari kalimat latar abstrak,
bukan hasil studi (P4 temuan 3). Kunci tidak diganti maknanya; penulis memakai kunci baru
`airjawa.turun_tanah.pekalongan.widodo2024_kumulatif` untuk hasil studi, atau menulis 10–19 cm/th sebagai kutipan latar.

| Kunci | Nilai | Berkas sumber + jalur (atau pustaka) | Label | Sumber |
| --- | --- | --- | --- | --- |
| airjawa.dki.air_minum_layak_2025 | 99,98% | air-jawa/provinsi.csv `[prov_nama=DKI Jakarta].air_minum_layak_2025` | resmi | BPS 2025 |
| airjawa.jateng.air_minum_layak_2025 | 95,73% | air-jawa/provinsi.csv `[prov_nama=Jawa Tengah].air_minum_layak_2025` | resmi | BPS 2025 |
| airjawa.nasional.air_minum_layak_2025 | 93,22% | air-jawa/air_minum.csv `[prov_kode=ID,indikator=rumah_tangga_akses_air_minum_layak_persen].nilai` | resmi | BPS 2025 |
| airjawa.grobogan.air_minum_layak_2025 | 83,47% | air-jawa/air_minum.csv `[kode_kab=3315].nilai` | resmi | BPS Jawa Tengah 2026 |
| airjawa.jateng.n_kab_layak_bawah95_2025 | 12 kab/kota | pustaka bps-jateng-2026-air-minum-layak-kab | resmi | olah: hitung di air_minum.csv |
| airjawa.banten.leding_2023 | 2,18% | air-jawa/provinsi.csv `[prov_nama=Banten].air_minum_leding_2023` | resmi | BPS 2024 |
| airjawa.jateng.leding_2023 | 12,97% | air-jawa/provinsi.csv `[prov_nama=Jawa Tengah].air_minum_leding_2023` | resmi | BPS 2024 |
| airjawa.dki.leding_2023 | 7,64% | air-jawa/provinsi.csv `[prov_nama=DKI Jakarta].air_minum_leding_2023` | resmi | BPS 2024 |
| airjawa.nasional.leding_2023 | 8,92% | air-jawa/air_minum.csv `[prov_kode=ID,indikator=rumah_tangga_sumber_air_minum_leding_persen].nilai` | resmi | BPS 2024 |
| airjawa.dki.sumur_mata_air_terlindung_2023 | 12,83% | pustaka bps-2024-sumber-air-minum-prov | resmi | olah kolom 2+4+6 |
| airjawa.jabar.sumur_mata_air_terlindung_2023 | 42,24% | idem | resmi | idem |
| airjawa.jateng.sumur_mata_air_terlindung_2023 | 52,42% | idem | resmi | idem |
| airjawa.diy.sumur_mata_air_terlindung_2023 | 57,80% | idem | resmi | idem |
| airjawa.jatim.sumur_mata_air_terlindung_2023 | 53,20% | idem | resmi | idem |
| airjawa.banten.sumur_mata_air_terlindung_2023 | 36,21% | idem | resmi | idem |
| airjawa.nasional.sumur_mata_air_terlindung_2023 | 42,43% | idem | resmi | idem |
| airjawa.dki.sumur_mata_air_semua_2023 | 12,86% | pustaka bps-2024-sumber-air-minum-prov | resmi | olah kolom 2+4+5+6+7 (nama kolom 5, 7 menurut urutan judul, P1 temuan 3) |
| airjawa.jabar.sumur_mata_air_semua_2023 | 45,92% | idem | resmi | idem |
| airjawa.jateng.sumur_mata_air_semua_2023 | 56,40% | idem | resmi | idem |
| airjawa.diy.sumur_mata_air_semua_2023 | 60,51% | idem | resmi | idem |
| airjawa.jatim.sumur_mata_air_semua_2023 | 55,27% | idem | resmi | idem |
| airjawa.banten.sumur_mata_air_semua_2023 | 40,30% | idem | resmi | idem |
| airjawa.nasional.sumur_mata_air_semua_2023 | 46,91% | idem | resmi | idem |
| airjawa.jatim.sumber_tak_terlindung_2023 | 2,07 poin persen | pustaka bps-2024-sumber-air-minum-prov | resmi | olah kolom 5+7 |
| airjawa.banten.sumber_tak_terlindung_2023 | 4,09 poin persen | idem | resmi | idem |
| airjawa.dki.air_kemasan_2023 | 79,39% | pustaka bps-2024-sumber-air-minum-prov | resmi | kolom 3 (nama menurut urutan judul) |
| airjawa.banten.air_kemasan_2023 | 56,82% | idem | resmi | idem |
| airjawa.jawa.irigasi_total_ha | 3.135.123 ha | air-jawa/air-jawa.json `meta.irigasi.total_jawa_ha` | resmi | Permen PUPR 14/2015 |
| airjawa.jawa.irigasi_permukaan_ha | 3.001.332 ha | air-jawa/air-jawa.json `meta.irigasi.total_jawa_per_jenis_ha_rekap.Permukaan` | resmi | idem |
| airjawa.jawa.irigasi_porsi_nasional_persen | 34,3% | pustaka pupr-2015-permen14 (hlm rekap) | resmi | olah 3.135.123 / 9.136.027 |
| airjawa.jawa.n_di_pusat | 94 DI | air-jawa/air-jawa.json `meta.irigasi.n_di_pusat_jawa` | resmi | idem |
| airjawa.jawa.n_di_provinsi | 457 DI | air-jawa/air-jawa.json `meta.irigasi.n_di_provinsi_jawa` | resmi | idem |
| airjawa.jawa.n_di_kabkota | 30.432 DI | pustaka pupr-2015-permen14 | resmi | olah jumlah rekap |
| airjawa.jawa.irigasi_pusat_ha | 1.120.683 ha | pustaka pupr-2015-permen14 | resmi | olah jumlah rekap |
| airjawa.jawa.irigasi_provinsi_ha | 406.395 ha | idem | resmi | idem |
| airjawa.jawa.irigasi_kabkota_ha | 1.608.045 ha | idem | resmi | idem |
| airjawa.jawa.irigasi_pusat_porsi_persen | 35,7% | idem | resmi | olah |
| airjawa.jawa.irigasi_kabkota_porsi_persen | 51,3% | idem | resmi | olah |
| airjawa.jabar.irigasi_pusat_ha | 405.510 ha | air-jawa/provinsi.csv `[prov_nama=Jawa Barat].irigasi_pusat_ha_rekap` | resmi | idem |
| airjawa.di.jatiluhur.luas_ha | 237.790 ha | air-jawa/irigasi_di_pusat_provinsi.csv `[kewenangan=pusat,nama_di=Jatiluhur].total_ha` | resmi | idem, hlm 16 |
| airjawa.di.rentang.luas_ha | 87.803 ha | air-jawa/irigasi_di_pusat_provinsi.csv `[kewenangan=pusat,nama_di=Rentang].total_ha` | resmi | idem, hlm 16 |
| airjawa.di.jatiluhur.porsi_di_pusat_jawa_persen | 21,2% | pustaka pupr-2015-permen14 | resmi | olah 237.790 / 1.120.683 |
| airjawa.di.rentang.indramayu_ha | 66.612 ha | pustaka pupr-2015-permen14 (hlm 16) | resmi | irigasi_di_pusat_provinsi.csv kolom per kab |
| airjawa.pantura_jabar.irigasi_pusat_di_lain_ha | 22.568 ha | pustaka pupr-2015-permen14 | resmi | olah 326.970 − 237.790 − 66.612 |
| airjawa.indramayu.irigasi_pusat_ha | 100.706 ha | air-jawa/kab_jawa.csv `[kode=3212].irigasi_pusat_ha` | resmi | olah atribusi |
| airjawa.karawang.irigasi_permukaan_ha | 112.256 ha | air-jawa/kab_jawa.csv `[kode=3215].irigasi_permukaan_ha` | resmi | olah atribusi |
| airjawa.pantura_jabar.irigasi_pusat_ha | 326.970 ha | pustaka pupr-2015-permen14 | resmi | olah empat kab |
| airjawa.pantura_jabar.irigasi_pusat_porsi_persen | 29,2% | idem | resmi | olah |
| airjawa.jawa.n_kab_di_pusat | 73 kab/kota | pustaka pupr-2015-permen14 | resmi | olah kab_jawa.csv |
| airjawa.nasional.irigasi_kondisi_buruk_persen | 46% | pustaka worldbank-2021-vision2045 (hlm. 64–65) | terverifikasi | World Bank 2021, disusun bersama Bappenas; tidak dapat direkonstruksi dari Gambar 33 |
| airjawa.nasional.irigasi_ruined_pusat_persen | 6,96% | pustaka worldbank-2021-vision2045 (Gambar 33, hlm. 65) | terverifikasi | data 2014, Renstra Ditjen SDA 2015–2019 |
| airjawa.nasional.irigasi_ruined_kabkota_persen | 21,4% | idem | terverifikasi | idem |
| airjawa.nasional.irigasi_poor_ruined_persen | 32,2% | idem | terverifikasi | olah (poor + ruined) / 7.145.168 ha |
| airjawa.nasional.irigasi_waduk_ha | 797.971 ha | pustaka tarigan-2013-citarum | terverifikasi | Tarigan dan Tukayo |
| airjawa.bendungan.pj.volume_normal_total | 898,44 juta m³ | air-jawa/bendungan_rekonsiliasi.csv `[kolom=vol_normal_juta_m3].total_tercetak_dokumen` | resmi | BBWS PJ 2021 |
| airjawa.bendungan.pj.tampungan_2021_total | 801,93 juta m³ | air-jawa/bendungan_rekonsiliasi.csv `[kolom=tampungan_2021_juta_m3].total_tercetak_dokumen` | resmi | idem |
| airjawa.bendungan.pj.kehilangan_persen | 10,7% | pustaka bbwspj-2021-inventaris-bendungan | resmi | olah 96,51 / 898,44 |
| airjawa.bendungan.cacaban.sedimentasi | 44,87 juta m³ | air-jawa/bendungan.csv `[nama=Cacaban].sedimentasi_juta_m3` | resmi | BBWS PJ 2021 |
| airjawa.bendungan.pj.cacaban_kedungombo_porsi_sedimentasi_persen | 87,7% | pustaka bbwspj-2021-inventaris-bendungan | resmi | olah (44,87 + 39,81) / 96,51 |
| airjawa.bendungan.pj.grobogan4_sedimentasi | 3,18 juta m³ | idem | resmi | olah Butak 1,39 + Simo 0,37 + Sanggeh 0,18 + Nglangon 1,24 (3,3% dari 96,51) |
| airjawa.bendungan.kedungombo.porsi_tampungan_2021_persen | 85,2% | idem | resmi | olah 683,19 / 801,93 |
| airjawa.bendungan.pj.piezometer | 543 buah | air-jawa/bendungan_rekonsiliasi.csv `[kolom=piezometer].total_tercetak_dokumen` | resmi | idem |
| airjawa.bendungan.pj.piezometer_rusak | 87 buah | air-jawa/bendungan_rekonsiliasi.csv `[kolom=piezometer_rusak].total_tercetak_dokumen` | resmi | idem |
| airjawa.bendungan.pj.vnotch | 48 buah | pustaka bbwspj-2021-inventaris-bendungan (hlm 2) | resmi | idem |
| airjawa.bendungan.pj.vnotch_rusak | 26 buah | idem | resmi | idem |
| airjawa.bendungan.pj.inklinometer | 24 buah | idem | resmi | idem |
| airjawa.bendungan.pj.inklinometer_rusak | 13 buah | idem | resmi | idem |
| airjawa.bendungan.pj.settlement | 56 buah | idem | resmi | idem |
| airjawa.bendungan.pj.settlement_rusak | 21 buah | idem | resmi | idem |
| airjawa.bendungan.kedungombo.inklinometer | 13 buah | idem | resmi | idem |
| airjawa.bendungan.kedungombo.inklinometer_rusak | 11 buah | idem | resmi | idem |
| airjawa.bendungan.kedungombo.settlement | 48 buah | idem | resmi | idem |
| airjawa.bendungan.kedungombo.settlement_rusak | 21 buah | idem | resmi | idem |
| airjawa.bendungan.kedungombo.piezometer_rusak | 3 buah | air-jawa/bendungan_angka.csv `[id=kedungombo,besaran=piezometer_rusak].nilai` | resmi | idem |
| airjawa.bendungan.penjalin.piezometer_rusak | 12 buah | air-jawa/bendungan_angka.csv `[id=penjalin,besaran=piezometer_rusak].nilai` | resmi | idem |
| airjawa.bendungan.jatibarang.piezometer_rusak | 11 buah | air-jawa/bendungan_angka.csv `[id=jatibarang,besaran=piezometer_rusak].nilai` | resmi | idem |
| airjawa.bendungan.butak.kehilangan_persen | 86,94% | air-jawa/bendungan.csv `[id=butak].kehilangan_tampungan_persen` | resmi | olah BBWS PJ |
| airjawa.bendungan.simo.kehilangan_persen | 82,95% | air-jawa/bendungan.csv `[id=simo].kehilangan_tampungan_persen` | resmi | idem |
| airjawa.bendungan.sanggeh.kehilangan_persen | 77,78% | air-jawa/bendungan.csv `[id=sanggeh].kehilangan_tampungan_persen` | resmi | idem |
| airjawa.bendungan.nglangon.kehilangan_persen | 56,78% | air-jawa/bendungan.csv `[id=nglangon].kehilangan_tampungan_persen` | resmi | idem |
| airjawa.bendungan.cacaban.irigasi_desain_ha | 17.481 ha | pustaka bbwspj-2021-inventaris-bendungan (hlm 1) | resmi | idem |
| airjawa.bendungan.cacaban.irigasi_2021_ha | 7.439 ha | idem | resmi | idem |
| airjawa.bendungan.jatiluhur.volume_1964 | 2.970 juta m³ | pustaka sheftiana-2021-jatiluhur | terverifikasi | Perum Otorita Jatiluhur via Sheftiana dkk. |
| airjawa.bendungan.jatiluhur.volume_2000 | 2.448 juta m³ | idem | terverifikasi | idem |
| airjawa.bendungan.jatiluhur.kehilangan_1964_2000_persen | 17,6% | idem | terverifikasi | olah |
| airjawa.bendungan.saguling.paruh_umur_awal | 294 tahun | pustaka tarigan-2013-citarum | terverifikasi | Tarigan dan Tukayo |
| airjawa.bendungan.saguling.paruh_umur_akhir | 28 tahun | idem | terverifikasi | idem |
| airjawa.bendungan.n_paket | 37 bendungan | air-jawa/air-jawa.json `meta.bendungan.n` | resmi | olah paket |
| airjawa.bendungan.n_pj2021 | 18 bendungan | air-jawa/air-jawa.json `meta.bendungan.n_pj2021` | resmi | BBWS PJ 2021 |
| airjawa.turun_tanah.pekalongan.gnss_cpkl | 10,7 cm/th | pustaka susilo-2023-gnss (Tabel 2) | terverifikasi | Susilo dkk. 2023 |
| airjawa.turun_tanah.indramayu.gnss_crol | 1,59 cm/th | idem | terverifikasi | idem |
| airjawa.turun_tanah.tegal.gnss_ctgl | 1,25 cm/th | idem | terverifikasi | idem |
| airjawa.turun_tanah.jakarta.gnss_cjkt | 0,64 cm/th | idem | terverifikasi | idem |
| airjawa.turun_tanah.semarang.gnss_csem | 0,08 cm/th | idem | terverifikasi | idem |
| airjawa.turun_tanah.pekalongan.patok_2021_2022 | 8,0 cm | pustaka susilo-2023-gnss (Gambar 5) | terverifikasi | Badan Geologi via Susilo dkk. |
| airjawa.turun_tanah.pekalongan.widodo2024_kumulatif | 100 cm | pustaka widodo-2024-pekalongan | terverifikasi | Widodo dkk. 2024 |
| airjawa.turun_tanah.jakarta.esdm_2015_2022 | 0,04–6,30 cm/th | pustaka esdm-2023-air-tanah | resmi | Kementerian ESDM |
| airjawa.turun_tanah.jakarta.abidin2011 | 1–15 cm/th | air-jawa/subsiden_kota.csv `[kota_kunci=jakarta,periode=1982-2010]` min dan tengah | terverifikasi | Abidin dkk. 2011 |
| airjawa.turun_tanah.semarang.abidin2013_maks | 19 cm/th | air-jawa/subsiden_kota.csv `[kota_kunci=semarang,periode=1999-2011 (GPS 2008-2011)].maks_cm_th` | terverifikasi | Abidin dkk. 2013 |
| airjawa.turun_tanah.kab_bandung.virtriana2026 | 22,3 cm/th | air-jawa/subsiden_kota.csv `[kota_kunci=bandung,wilayah_literatur=Kab. Bandung].maks_cm_th` | terverifikasi | Virtriana dkk. 2026 |
| airjawa.turun_tanah.semarang.badangeologi2018 | 2–10 cm/th | pustaka kemenpupr-2024-rpsda-jratunseluna (Tabel 5.83, hlm. 262) | resmi | Badan Geologi 2018 via RPSDA; periode dan metode tidak disebut |
| airjawa.turun_tanah.demak.badangeologi2018 | lebih dari 10 cm/th | idem | resmi | idem |
| airjawa.turun_tanah.pekalongan.sidiq2021 | 7 cm/th (maks) | air-jawa/subsiden_kota.csv `[kota_kunci=pekalongan,periode=2016-2020].maks_cm_th` | terverifikasi | Sidiq dkk. 2021, InSAR SBAS 2016–2020 |
| airjawa.turun_tanah.semarang_demak.sidiq2021 | 8 cm/th (maks) | air-jawa/subsiden_kota.csv `[kota_kunci=semarang,periode=2016-2020].maks_cm_th` | terverifikasi | idem |
| airjawa.turun_tanah.jakarta.sidiq2021 | lebih dari 5 cm/th | air-jawa/subsiden_kota.csv `[kota_kunci=jakarta,periode=2016-2020].maks_cm_th` | terverifikasi | idem |
| airjawa.turun_tanah.jakarta.abidin2015 | 3–10 cm/th | air-jawa/subsiden_kota.csv `[kota_kunci=jakarta,periode=1982-2014]` min dan maks | terverifikasi | Abidin dkk. 2015 |
| airjawa.turun_tanah.pekalongan.handoko2026 | lebih dari 5 cm/th | air-jawa/subsiden_kota.csv `[kota_kunci=pekalongan,periode=2016-2024].min_cm_th` | terverifikasi | Handoko dkk. 2026 |
| airjawa.turun_tanah.surabaya.anjasmara2020_los | 4,5 cm/th (LOS) | air-jawa/subsiden_kota.csv `[kota_kunci=surabaya,periode=Mei 2015 sampai Sep 2017].maks_cm_th` | terverifikasi | Anjasmara dkk. 2020; laju LOS, bukan vertikal |
| airjawa.nasional.cat_jumlah | 421 CAT | pustaka keppres-2011-cat (Lampiran I) | resmi | Keppres 26/2011 |
| airjawa.nasional.sumur_pantau_air_tanah | 161 titik | idem | resmi | idem (selisih internal tertulis) |
| airjawa.jakarta.lokasi_pantau_air_tanah | 220 lokasi per tahun | pustaka esdm-2023-air-tanah | resmi | Kementerian ESDM |
| airjawa.jawa.ipa_2010_persen | 54% | air-jawa/ipa_pulau_2010.csv `[pulau=Jawa].ipa_persen` | estimasi-model | BPS 2020 mengutip Radhika dkk. 2013 |
| airjawa.jawa.ipa_2010_tanpa_pemeliharaan_persen | 42% | air-jawa/ipa_pulau_2010.csv `[pulau=Jawa].ipa_tanpa_persen` | estimasi-model | idem |
| airjawa.jratunseluna.defisit_m3s | 41,60 m³/detik | pustaka kemenpupr-2024-rpsda-jratunseluna (hlm. 26, 191) | estimasi-model | hasil analisis neraca 2023 dalam dokumen resmi |
| airjawa.jratunseluna.kebutuhan_eksisting_m3s | 281,20 m³/detik | idem | estimasi-model | idem |
| airjawa.jratunseluna.kebutuhan_proyeksi_m3s | 378,81 m³/detik | idem (hlm. 26) | estimasi-model | proyeksi 20 tahun |
| dibi.jawa.kab_kekeringan.2015 | 3 kab/kota | pustaka bnpb-dibi | resmi | olah dibi_kab_tahun.csv |
| dibi.jawa.kab_kekeringan.2018 | 67 kab/kota | idem | resmi | idem |
| dibi.jawa.kab_kekeringan.2024 | 45 kab/kota | idem | resmi | idem |
| iklim.oni.jas_2015 | 1,73 | pustaka noaa-2026-oni | resmi | NOAA CPC |
| iklim.oni.jas_2019 | 0,20 | idem | resmi | idem |
| iklim.oni.jas_2023 | 1,25 | idem | resmi | idem |
| iklim.oni.jas_2024 | −0,04 | idem | resmi | idem |
| airjawa.citarum.hutan_2000_ha | 71.750 ha | pustaka tarigan-2013-citarum | terverifikasi | Tarigan dan Tukayo |
| airjawa.citarum.hutan_2009_ha | 9.899 ha | idem | terverifikasi | idem |
| airjawa.citarum.permukiman_2000_ha | 81.686 ha | idem | terverifikasi | idem |
| airjawa.citarum.permukiman_2009_ha | 176.442 ha | idem | terverifikasi | idem |

---

## Pustaka

Entri CSL-JSON lengkap di `naskah/air/bukti/bab-04.pustaka.json` (34 entri; kunci `id` dipakai kolom `pustaka`
registri). `bnpb-dibi` dipakai registri tetapi sudah ada di `pustaka.json` induk, jadi tidak diulang. Ringkas:

| id | Sumber | Verifikasi |
| --- | --- | --- |
| bps-2024-sumber-air-minum-prov | BPS, Distribusi Persentase Rumah Tangga Menurut Provinsi dan Sumber Air Minum, 2023 (tabel daring) | primer |
| bps-2025-air-minum-layak-prov | BPS, Persentase Rumah Tangga menurut Provinsi dan Sumber Air Minum Layak (tabel daring) | primer |
| bps-jateng-2026-air-minum-layak-kab | BPS Provinsi Jawa Tengah, akses air minum layak per kab/kota (tabel daring) | primer |
| kompas-2024-isi-ulang | Kompas, 13 Februari 2024, mengutip BPS (dipakai hanya untuk memastikan nama kolom) | sekunder |
| pupr-2015-permen14 | Permen PUPR 14/PRT/M/2015, BN 2015 No. 638 | primer |
| worldbank-2021-vision2045 | World Bank (2021), Indonesia Vision 2045: Towards Water Security, bersama Bappenas | primer |
| setkab-2015-jatigede | Sekretariat Kabinet, 31 Agustus 2015, Waduk Jatigede dan DI Rentang | primer |
| bbwspj-2021-inventaris-bendungan | BBWS Pemali Juana (2021), Daftar inventarisasi bendungan | primer |
| sheftiana-2021-jatiluhur | Sheftiana, Purwanto, Tarigan (2021), Jurnal Ilmu Tanah dan Lingkungan 23(1) | primer |
| tarigan-2013-citarum | Tarigan dan Tukayo (2013), Journal of Tropical Soils 18(2) | primer |
| susilo-2023-gnss | Susilo dkk. (2023), Scientific Data 10: 421 | primer |
| widodo-2024-pekalongan | Widodo dkk. (2024), Urban Science 8(4): 234 | primer |
| aditiya-2023-semarang | Aditiya dan Ito (2023), Int. J. Appl. Earth Obs. Geoinf. 125: 103579 | primer |
| sidiq-2021-pantura | Sidiq dkk. (2021), IOP Conf. Ser. Earth Environ. Sci. 873: 012078 | primer (abstrak) |
| sidiq-2023-pekalongan | Sidiq dkk. (2023), IOP Conf. Ser. Earth Environ. Sci. 1276: 012014 | primer (abstrak) |
| handoko-2026-pekalongan | Handoko dkk. (2026), J. Phys.: Conf. Ser. 3238: 012037 | primer (abstrak) |
| abidin-2011-jakarta | Abidin dkk. (2011), Natural Hazards 59(3) | primer (abstrak) |
| abidin-2013-semarang | Abidin dkk. (2013), Geomatics, Natural Hazards and Risk 4(3) | primer (abstrak) |
| abidin-2015-jakarta | Abidin dkk. (2015), Proc. IAHS 370: 15–20 | primer (abstrak) |
| anjasmara-2020-surabaya | Anjasmara dkk. (2020), Int. J. Adv. Sci. Eng. Inf. Technol. 10(1): 191–197 | primer (abstrak) |
| virtriana-2026-bandung | Virtriana dkk. (2026), Geoenvironmental Disasters 13 | primer (abstrak) |
| kemenpupr-2024-rpsda-jratunseluna | Kementerian PUPR (2024), RPSDA WS Jratunseluna Tahun 2024 | primer |
| esdm-2009-cat-jakarta | Kementerian ESDM, "Cekungan Air Tanah Jakarta Kritis", 18 Agustus 2009 | primer |
| esdm-2023-air-tanah | Kementerian ESDM, siaran pers 541.Pers/04/SJI/2023, 10 November 2023 | primer |
| esdm-2025-perizinan-air-tanah | Kementerian ESDM, siaran 8 Januari 2025 | primer |
| badangeologi-2024-cat | Badan Geologi, 22 Januari 2024 (memuat ulang tulisan CNBC Indonesia) | primer |
| badangeologi-2025-capaian | Badan Geologi, 27 Oktober 2025 | primer |
| keppres-2011-cat | Keppres 26/2011 tentang Penetapan Cekungan Air Tanah | primer |
| idx-2023-cat-rusak | IDX Channel, 13 November 2023 | sekunder |
| cnbc-2023-cat-rusak | CNBC Indonesia, 13 November 2023 | sekunder |
| cnbc-2025-air-tanah | CNBC Indonesia, 8 Januari 2025 | sekunder |
| bps-2020-slh | BPS (2020), Statistik Lingkungan Hidup Indonesia 2020 | primer |
| noaa-2026-oni | NOAA CPC, Oceanic Niño Index (ONI) | primer |
| ri-2019-uu17 | UU 17/2019 tentang Sumber Daya Air | primer |

Sumber berbeda untuk bab ini: 34 entri, 30 primer dan 4 sekunder (sekunder tidak untuk badan teks). Unggahan blog
de Jong (World Bank, 21 Mei 2022) dikeluarkan dari pustaka karena hanya meringkas laporan `worldbank-2021-vision2045`.

---

## Catatan pemeriksaan temuan (24 Oktober 2026)

Tiga belas temuan pemeriksa dicek ke sumber sebelum disunting. Sebelas diterima utuh dan dua diterima dengan
penyesuaian; tidak ada yang ditolak.

| No | Temuan | Hasil cek ke sumber | Tindakan |
| --- | --- | --- | --- |
| 1 | P4 usang terhadap riset E; "satu-satunya angka resmi" | Artikel geologi.esdm.go.id 22 Januari 2024 dibuka ulang: daftar CAT rusak Jakarta, Karawang Bekasi, Semarang, Bandung-Soreang, Bogor, Serang-Tangerang, Palangkaraya; RPSDA Jratunseluna 2024 hlm. 262 Tabel 5.83 (Badan Geologi 2018: Semarang 2–10, Demak lebih dari 10 cm/th); esdm.go.id 18 Agustus 2009 "zona kritis hingga rusak" | Diterima dengan penyesuaian. Temuan 5a, 8a, 12, 13 dan Inti P4 dimutakhirkan; Tabel 4.3 berganti judul; larangan syarat daftar perhatian dipertahankan. Penyesuaian: teks artikel Badan Geologi dibuka dengan "Jakarta, CNBC Indonesia", jadi label resmi diberi catatan bahwa isinya tulisan media yang dimuat ulang di kanal instansi. Kalimat lama "Pekalongan disebut hanya sebagai contoh dampak, bukan CAT rusak" dilunakkan: kutipannya menyebut Pekalongan sebagai contoh CAT Pantura yang berimplikasi penurunan tanah, tetapi namanya tidak ada di daftar |
| 2 | Kaitan El Niño dengan jumlah kab berkejadian kekeringan | Hitung ulang `dibi_kab_tahun.csv` dan `oni_cpc.txt` cocok dengan pemeriksa (2015 = 3, ONI JAS 1,73; 2018 = 67, 0,30; 2024 = 45 lawan 2023 = 43; 2019 JJA 0,38, JAS 0,20) | Diterima. Deret penuh 2008–2026 dengan ONI JAS di Bahan 4.1 temuan 4, catatan baca pelaporan, kaitan El Niño dihapus dari Inferensi; kunci `dibi.jawa.kab_kekeringan.2015/2018/2024` dan `iklim.oni.jas_*` diusulkan. ONI berlabel resmi (sama dengan registri), bukan terverifikasi |
| 3 | "Hampir sepertiga" DI pusat bergantung pada Citarum | `irigasi_di_pusat_provinsi.csv`: Jatiluhur 237.790 ha (21,2% dari 1.120.683); Rentang Indramayu 66.612 ha; sisa 22.568 ha. Setkab 31 Agustus 2015: Jatigede satu-satunya waduk di S. Cimanuk, mengairi DI Rentang sekitar 90.000 ha | Diterima. Inti dan Inferensi P2 ditulis ulang; temuan 12 (Setkab) ditambahkan. Pemegang DI Rentang (BBWS Cimanuk-Cisanggarung) belum dicek ke dokumen balai, dicatat di temuan 12 |
| 4 | Kedung Ombo disebut tanpa kehilangan tampungan | `bendungan.csv`: Kedung Ombo 39,81, Cacaban 44,87 juta m³; jumlah 84,68 = 87,7% dari 96,51; empat bendungan Grobogan 3,18 (3,3%) | Diterima. Volume dan persen berdampingan di Inti, temuan 2, Inferensi, dan Tabel 4.2; frasa "bukan kehilangan tampungan" dihapus |
| 5 | Bukti baseline 2015 lebih besar dari luas terairi terjadi sebelum baseline | `irigasi_di_pusat_provinsi.csv` baris 71 (Cacaban 7.439 ha) dan DI Pemali Bawah 26.952 ha sama dengan layanan 2021 | Diterima. Inferensi diganti "tidak ada data pembanding setelah 2015"; celah e-PAKSI dan luas baku sawah ditambahkan |
| 6 | Pemetaan kolom BPS tidak konsisten | Delapan nilai tiap baris berjumlah 100; urutan judul di `sumber_air_minum_prov_2023.txt`; Kompas cocok untuk kolom 1, 2, 4, 6; Kalimantan Barat kolom 8 = 48,39 | Diterima, pilihan (a): kolom 1–7 menurut urutan judul dengan alasan tertulis; tabel P1 memuat terlindung dan tak terlindung; angka terlindung tetap ditulis sebagai batas bawah |
| 7 | Peringkat "paling cepat" antarmetode | Inti memuat 10,7 (GNSS), 16 (InSAR PS), 22,3 (InSAR) | Diterima. Inti menjadi "tercepat di antara 20 stasiun GNSS BIG"; tiap angka diberi metode dan periode, termasuk "periode tidak disebut" untuk Virtriana dkk. dan Badan Geologi 2018 |
| 8 | "Tiga garis bukti bebas" | Europe PMC PMC10314896 dibuka ulang: penulis menyatakan patok dan CPKL tidak dapat dibandingkan satu lawan satu | Diterima. Ditulis "tiga pengukuran searah", besar berbeda sekitar dua kali lipat |
| 9 | Sidiq dkk. 2021 tidak dimuat | Abstrak OpenAlex dibuka: Jakarta lebih dari 5, Pekalongan sampai 7, Semarang dan Demak sampai 8 cm/th (SBAS Sentinel-1 2016–2020) | Diterima. Baris berdampingan di temuan 4, 5, 8; pustaka `sidiq-2021-pantura` dan tiga kunci registri |
| 10 | Blog de Jong diberi label primer | Laporan World Bank (2021) dibuka (OKR handle 10986/36727, DOI 10.1596/36727, 150 hlm.): 46% di hlm. xx, 64, 65; 80% di hlm. 13, 65; Jawa di hlm. 14 ("13 on Java"); parafrase "pulau yang paling dikhawatirkan" sudah tidak dipakai di berkas ini | Diterima dengan penyesuaian. Sumber diganti laporan; label terverifikasi dipertahankan karena laporan primer dibuka dan KERANGKA §2 butir 6 mendefinisikan terverifikasi sebagai sumber primer non-resmi (konvensi bab diselaraskan). Ditemukan dua catatan tambahan: Gambar 33 mencetak total pusat 2.378.521 ha padahal kategorinya berjumlah 2.376.521 (= Permen), dan hlm. 14 menyebut lima WS defisit tahunan tetapi merinci enam |
| 11 | Sumber perantara untuk 421 CAT dan total irigasi nasional | Keppres 26/2011 (JDIH ESDM) dibuka: "Total Keseluruhan CAT 421" (205, 176, 36, 4); CAT Jawa no. 66–145 = 80, Lampiran I hlm. 12–25. OCR BN 638 p013 baris 49, p029 baris 49, p063 baris 50 | Diterima. P4 temuan 14, Bahan 4.1 temuan 2, P2 temuan 4 merujuk sumber asli; kunci `airjawa.nasional.cat_jumlah` pindah ke `keppres-2011-cat` |
| 12 | Tiga sumber terverifikasi tanpa pustaka | Crossref dan OpenAlex dibuka untuk Abidin dkk. 2015, Anjasmara dkk. 2020, Handoko dkk. 2026; abstrak cocok dengan `subsiden_kota.csv` | Diterima. Ketiganya masuk pustaka; jumlah sumber kini 34 |
| 13 | Celah neraca per WS sudah tidak benar | RPSDA Jratunseluna 2024 dibuka: hlm. 26 (281,20; 239,60; 41,60; proyeksi 378,81 m³/detik), hlm. 27 (lima kab/kota), hlm. 191 (defisit tiap bulan, "Hasil Analisis, 2023") | Diterima. Celah menjadi "sebagian tertutup (10 WS; Pemali-Comal belum)"; Bahan 4.1 temuan 8 ditambahkan; inferensi Grobogan di P1 memakai RPSDA. Label dipecah: pernyataan lima kab/kota resmi, angka m³/detik estimasi-model (hasil analisis neraca), sejalan dengan perlakuan riset E6 untuk simulasi rob di dokumen yang sama |

Catatan untuk penggabungan: id `badangeologi-2024-cat` dan `kemenpupr-2024-rpsda-jratunseluna` sama dengan
`riset/E-pustaka.json`, dan `noaa-2026-oni` sama dengan `bab-03.pustaka.json`. Tabel paket
`air-jawa/cat_air_tanah_rusak.csv` masih berlabel sekunder dan memuat Pekalongan-Pemalang; pemutakhirannya kerja pemilik
paket. Kalimat tesis KERANGKA §4 yang memakai angka 2019 dan 2023 perlu catatan baca yang sama dengan Bahan 4.1 temuan 4;
itu di luar berkas ini.
