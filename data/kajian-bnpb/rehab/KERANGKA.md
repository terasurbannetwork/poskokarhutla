# Kerangka Grand Design ketiga BNPB: rehabilitasi dan rekonstruksi air dan akses

Versi 1 (kerangka awal), 25 Oktober 2026. Disusun dari keputusan pemilik dan bawaan (`data/kajian-bnpb/KEPUTUSAN.md`, `rehab/KEPUTUSAN-AWAL.md`), Buku Pegangan (`docs/buku-pegangan/pantau-bencana.md`, L1-L72 dan S1-S39), kontrak naskah `bangun/NASKAH-SPEK.md`, kerangka dua kajian saudara (`data/kajian-bnpb/KERANGKA.md`, bagian 4 dan 5 sebagai model kedalaman), dan riset `rehab/riset/A-F`.

**Konvensi.** Path relatif ke `data/kajian-bnpb/`. Kode komponen B5.x dan grafik G1-G25 mengikuti PEDOMAN §B5 dan tabel pilih grafik Buku Pegangan. Halaman adalah perkiraan, bukan batas (P18). Angka di berkas ini sudah dibaca dari riset atau paket data pada 25 Oktober 2026; label: **resmi**, **terverifikasi**, **estimasi-model**, **asumsi-kebijakan**. Angka yang sumbernya media ditandai **sekunder** dan tidak masuk badan teks sebelum sumber primernya dibuka (KEPUTUSAN-AWAL R3). Rujukan riset ditulis `[A3]` = riset A sumber nomor 3, `[F§2]` = riset F bagian 2. Slot `{a}` diisi token `{{angka:rehab.<kunci>}}` saat naskah dibangun.

---

## 0. Ringkasan arah

1. **Topik dipersempit ke dua layanan yang menentukan orang bisa pulang: air dan akses.** Perumahan masuk sebagai beban dan pengikat lokasi (Q3), bukan pokok rekomendasi.
2. **Tiga lapis waktu, satu rantai.** Tiap sektor ditulis dalam lapis darurat (hari), sementara (minggu sampai bulan), dan permanen (tahun), dengan titik serah yang jelas: bailey ke jembatan permanen; truk tangki dan sumur darurat ke SPAM; huntara ke huntap bersumber air. Pola ini menjawab temuan lintas kasus bahwa layanan sementara pulih cepat sementara aset permanen daerah tertinggal (riset E, pelajaran 5 dan 6).
3. **"Jembatan Merah Putih" ditulis menurut pemiliknya** (KEPUTUSAN-AWAL R2). Program jembatan terbesar adalah Satgas Pembangunan Jembatan TNI AD (Jembatan Garuda): 3.008 titik dikerjakan, 2.500 selesai, 798 di daerah bencana per 13 Agustus 2026 [B1] (resmi). Jembatan Merah Putih Presisi Polri: 895 unit, 874 selesai, swadaya di 30 Polda [B1] (resmi).
4. **Ukuran keberhasilan baru: waktu pulih layanan.** BNPB belum punya standar hari pulih untuk air dan akses [A§1]; DIBI tidak mencatat kerusakan SPAM sama sekali [F§4]. Grand Design membentuk baseline dulu (2027), lalu sasaran.
5. **Celah hukum yang paling menahan sudah berpasal:** hibah RR tidak dapat membiayai aset rusak milik pemerintah desa, pembelian lahan, dan biaya operasi serta pemeliharaan (Perban BNPB 4/2024 Pasal 5) [A5] (resmi).

---

## 1. Prinsip yang mengikat

Prinsip 1-20 KERANGKA induk berlaku kecuali yang diubah di bawah. Yang diubah atau ditambah:

1. **Posisi dan suara BNPB.** Grand Design ini menajamkan pelaksanaan Perban BNPB 5/2017 (R3P), 6/2017 (penyelenggaraan RR), dan 4/2024 (hibah RR), dan menjadi masukan peninjauan Renas PB 2025–2029 lewat jalur yang sama dengan dua kajian saudara (monev tahunan 2026 atau evaluasi paruh waktu 2027; KERANGKA induk prinsip 1). Untuk Sumatra 2025, kajian menjadi masukan pemutakhiran R3P dan rencana induk Satgas, bukan penilaian kinerja Satgas (Q7).
2. **Batas mandat.** Rehabilitasi dan rekonstruksi tanggung jawab pemda kecuali prasarana kewenangan pusat (PP 21/2008 Pasal 57 ayat (1), Pasal 76 ayat (1)) [A2]. Pemilik aset: Kementerian PU (Bina Marga untuk jalan dan jembatan nasional; Cipta Karya untuk SPAM; SDA untuk air baku), pemda (SPAM dan jalan daerah, UU 23/2014 Lampiran) [A18], desa (aset desa). Air tanah: penetapan CAT dan zona konservasi oleh Kementerian ESDM (Badan Geologi) [C§1]. Peran BNPB dari teks: koordinasi (PP 21/2008 Pasal 54 ayat (2), 59, 78), penetapan R3P (Perban 5/2017), penyaluran hibah RR dan DSP, pemantauan (Perban 6/2017 Pasal 14) [A2][A3][A4]. TNI dan Polri adalah pengguna DSP yang sah (Perban 4/2020 Pasal 14) [A6].
3. **Tiga lapis waktu.** Lapis darurat (status tanggap darurat dan transisi; Perban 4/2020), lapis sementara (transisi sampai R3P berjalan), lapis permanen (masa R3P, paling lama 3 tahun; Perban 5/2017 Pasal 10) [A3]. Tiap rekomendasi menyebut lapisnya.
4. **Lensa layanan, bukan unit.** Ukuran pemulihan air ditulis dalam jiwa atau sambungan terlayani dan liter per orang per hari, bukan "unit SPAM berfungsi", karena unit berfungsi tidak sama dengan layanan pulih (riset E, pelajaran 7). Ukuran akses ditulis dalam desa atau jiwa yang tersambung kembali dan hari sampai akses darurat terbuka.
5. **Hierarki bukti.** Angka utama dari DIBI, R3P, peraturan, rilis instansi (Kementerian PU, Badan Geologi, Setneg, Setkab, Polri, BNPB). Angka sekunder ke lampiran rekonsiliasi saja (R3). Angka berbeda versi ditulis berdampingan (L22, L27).
6. **Air tanah dalam batas konservasi.** Sumur bor RR mengikuti zona konservasi dan rekomendasi teknis Badan Geologi; di kawasan penurunan muka tanah pesisir utara Jawa diutamakan air permukaan dan perpipaan (Q10; KERANGKA induk prinsip 2 tentang tanah ambles sebagai daya rusak air).
7. **Skenario terburuk yang masuk akal untuk beban RR.** Definisi dan lantai mengikuti KERANGKA induk prinsip 9 (lantai = kejadian tercatat terburuk dalam periode acuan untuk jenis dan wilayah yang sama; hidrometeorologi DIBI 2008–2025, geologi 30 tahun 1996–2025). Empat besaran RR (Q6): (a) rumah rusak RB/RS/RR; (b) jembatan rusak dan desa terputus; (c) layanan air terganggu (SPAM terdampak, jiwa tanpa air perpipaan); (d) durasi pemulihan per lapis. Korban jiwa dan kerugian rupiah sebagai baris konteks. Seri jembatan DIBI baru terisi sejak 2018 [F§2], jadi periode acuan jembatan 2018–2025 dan dinyatakan sebagai keterbatasan.
8. **Biaya satuan sebagai pembanding, bukan anggaran** (P5, Q4). Tiap biaya satuan menyebut tahun harga, sumber, dan label; tidak dijumlah menjadi total program.
9. **Program bertingkat bukti.** Rubrik `program-terbukti` berlaku. Riset E tidak menemukan satu pun program RR berbukti kuat; posisi tertinggi "sedang" (hibah bertermin Nepal, SCIRT Christchurch, CSRRP Sulteng) [E kompendium]. Program jembatan TNI AD dan Polri berposisi **Program berjalan, wajib evaluasi dampak**.
10. **Tanpa pengulangan dengan Kajian 2.** Kajian 2 Bab 11.9 (Pemulihan per Instrumen) dan Bab 10.7 (kesenjangan RR) tetap di sana; Grand Design ini merujuknya dan memperdalam air dan akses. Satu register rekomendasi (Q13).
11. **SIPPA dirujuk satu kotak** (R1) di Bab 6.

---

## 2. Bagian depan

Sama dengan KERANGKA induk §3 (Buku Pegangan L6, L14): Sampul, Kolofon, Kata Pengantar draf (T7), Daftar Isi, Daftar Tabel, Daftar Gambar, Daftar Lampiran, Daftar Singkatan, Ringkasan Eksekutif dua lapis (Pesan Kunci 6-8 temuan dan pita keputusan; halaman keputusan; lapis rincian 4-6 halaman).

---

## 3. Judul, lingkup, tesis

**Judul usulan:** Grand Design Rehabilitasi dan Rekonstruksi Air dan Akses Pascabencana 2026–2030
*Sistem Perpipaan, Pemanfaatan Air Tanah, dan Jembatan untuk Pemulihan Daerah Terdampak Bencana*
(Q1; alternatif: "Grand Design Pemulihan Air dan Akses Daerah Pascabencana 2026–2030".)

**Lingkup.** 38 provinsi, 514 kab/kota; analisis sampai kab/kota bila data tersedia (jembatan per kab menunggu turunan, [F§4]). Bencana alam berkerusakan fisik: gempa bumi (sesar darat dan megathrust), tsunami, likuefaksi, banjir dan banjir bandang, tanah longsor, erupsi gunung api, cuaca ekstrem. Kekeringan sebagai konteks akuifer saja. Tiga sektor: akses (jembatan dan ruas jalan penghubung), air perpipaan (SPAM, transmisi, distribusi), air tanah (sumur bor, sumur gali, mata air sebagai sumber SPAM). Perumahan sebagai beban dan pengikat lokasi.

**Pesan inti (hipotesis kerja; dikunci setelah Bab 4-8, disimpan sebagai kunci `rehab.tesis`):**
"Pada 2018–2025 DIBI mencatat 3.833 jembatan rusak akibat bencana alam, sekitar 91% karena banjir dan 1.088 pada 2025 saja, sedangkan kerusakan sistem air minum tidak tercatat di DIBI dan aset desa berada di luar hibah rehabilitasi dan rekonstruksi; Grand Design 2026–2030 menjadikan waktu pulih akses dan air sebagai ukuran keberhasilan rehabilitasi dan rekonstruksi, mengikat program jembatan dan sumur bor TNI, Polri, dan Kementerian PU ke R3P, dan membentuk baseline kerusakan dan pemulihan layanan air per kab/kota paling lambat 2027."
Sumber: `dibi/rekap_nasional_tahunan.csv` (alam, cakupan bencana; hitungan sesi ini [F§2]), Perban BNPB 4/2024 Pasal 5 huruf e [A5]. Label resmi (angka DIBI dan pasal); komitmen baseline asumsi-kebijakan.

**Keputusan yang diminta di Pesan Kunci:** KD-R1, KD-R2, KD-R3 (§7); KD-R4 rekomendasi 100 hari.

---

## 4. Bab

### BAB 1 PENDAHULUAN (perkiraan 6 hlm)

- **Subbab:** 1.1 Latar Belakang; 1.2 Posisi terhadap R3P, Renas PB, dan Dua Grand Design Saudara; 1.3 Tujuan; 1.4 Lingkup, Lapis Waktu, dan Definisi Operasional; 1.5 Status Dokumen dan Jalur Adopsi; 1.6 Sistematika.
- **Tujuan bab:** menjelaskan mengapa air dan akses menjadi pokok RR 2026–2030 dan apa yang dicakup.
- **Pertanyaan kunci:**
  1. Mengapa rangkaian banjir dan longsor Sumatra November 2025 dan seri DIBI 2018–2025 menuntut Grand Design RR untuk air dan akses sekarang?
  2. Apa yang sudah diatur UU 24/2007, PP 21/2008, dan Perban BNPB 5/2017, 6/2017, 4/2024, dan apa yang belum?
  3. Apa arti rehabilitasi, rekonstruksi, membangun kembali lebih baik, dan tiga lapis waktu dalam kajian ini?
- **Temuan kunci yang diharapkan:**
  - Jembatan rusak 2018–2025: 3.833; 2025: 1.088 (resmi, DIBI [F§2]). Sumatra November 2025: 62.956 rumah RB, 228.006 rumah rusak, 970.876 mengungsi (resmi, DIBI [F§3]).
  - Sumatra 2025: 178 SPAM terdampak, sekitar 95,5% berfungsi Mei 2026, perbaikan permanen ditargetkan Agustus 2028 (resmi, Kementerian PU [D21][D22]).
  - Definisi UU 24/2007 Pasal 1 angka 11-12 dan Perban 6/2017 Pasal 1 angka 5 (membangun kembali lebih baik dan lebih aman) [A1][A4].
- **Komponen:** Gambar 1.1 jembatan rusak per tahun 2018–2025 dengan anotasi 2025 (G1, `dibi/rekap_nasional_tahunan.csv`); Kotak 1.1 definisi operasional dan tiga lapis (B5.5); Tabel 1.1 lingkup jenis bencana × sektor (B5.7).
- **Status data:** ada.

### BAB 2 TINJAUAN PUSTAKA DAN KERANGKA KONSEPTUAL (perkiraan 8 hlm)

- **Subbab:** 2.1 Rehabilitasi, Rekonstruksi, dan Membangun Kembali Lebih Baik; 2.2 Kajian dan Dokumen BNPB Terdahulu (R3P Cianjur, Kajian 2 Bab 10.7 dan 11.9, buku BRR); 2.3 Kronologi Regulasi RR; 2.4 Kelembagaan RR dan Pemilik Aset; 2.5 Praktik Pembanding; 2.6 Metode Penilaian Kebutuhan (Jitupasna, PDNA).
- **Tujuan bab:** menempatkan kajian di atas aturan dan pengalaman yang ada.
- **Pertanyaan kunci:**
  1. Norma apa yang berlaku untuk air dan jembatan di tiap tahap per Oktober 2026?
  2. Siapa pemilik aset dan siapa penanggung jawab penyelenggaraan?
  3. Praktik mana yang terbukti dan dapat dialihkan?
- **Temuan kunci yang diharapkan:**
  - Rantai norma: UU 24/2007 Pasal 48 huruf f, 53 huruf a, 56, 58 ayat (1) huruf b, 59 ayat (1) huruf a dan d; PP 21/2008 Pasal 54, 56-60, 64-67, 75-80; Perban 5/2017 Pasal 2, 8, 10; Perban 6/2017 Pasal 7, 12, 13; Perban 4/2024 Pasal 2-6, 26-28; Perban 4/2020 Pasal 2, 11, 14; Perka 12/2010; Perka 15/2011; Juklak 1/2023, 3/2023, 15/2025, 1/2025 [A1-A12] (resmi).
  - Perka 12/2010 sudah menyebut jembatan rangka baja dari Kementerian PU untuk perbaikan darurat [A7]; Perka 15/2011 memuat baris biaya infrastruktur darurat dengan contoh bailey [A8].
  - Pembanding (riset E): SCIRT Christchurch (aliansi pipa dan jalan, sedang), hibah bertermin Nepal (sedang), Pakistan ERRA (lemah), pemulihan air Kobe dan Tohoku (sedang untuk kurva pulih), Chile (sedang), Haiyan (pelajaran negatif, sedang), Turki 2023 (pelajaran kecepatan tanpa evaluasi mutu, lemah). Rwanda jembatan pejalan kaki (RCT, US$100.000 per jembatan; imbal hasil 78-98% estimasi-model) dan Nicaragua (banjir tanpa jembatan menurunkan pendapatan 18%, terverifikasi) [B38][B40].
- **Komponen:** Tabel 2.1 kronologi regulasi RR (B5.31, L32); Tabel 2.2 pemilik aset × tahap (B5.7); Tabel 2.3 praktik pembanding dan padanan di Indonesia (B5.7); Gambar 2.1 tiga lapis waktu dan titik serah (B5.23, G21).
- **Status data:** ada; Keppres 1/2026 dan Inpres 18/2025 belum dibuka.

### BAB 3 METODOLOGI DAN DATA (perkiraan 8 hlm)

- **Subbab:** 3.1 Data, Produsen, dan Label; 3.2 DIBI untuk Beban RR: Kolom, Patahan, dan Batas Tafsir; 3.3 Data Air dan Akses di Luar DIBI; 3.4 Skenario Terburuk Beban RR; 3.5 Biaya Satuan sebagai Pembanding; 3.6 Aturan Daftar Perhatian RR; 3.7 Rekonsiliasi Angka; 3.8 Keterbatasan.
- **Tujuan bab:** membuat semua angka beban, skenario, dan daftar perhatian dapat diperiksa.
- **Pertanyaan kunci:**
  1. Apa yang dapat dan tidak dapat dibaca dari DIBI untuk rumah, jembatan, dan air?
  2. Bagaimana lantai skenario dan empat besaran RR didefinisikan?
  3. Kab/kota mana masuk daftar perhatian dan dengan aturan apa?
  4. Angka mana yang berbeda versi?
- **Aturan daftar perhatian RR (3.6):** kab/kota masuk bila memenuhi ≥ 2 dari: (a) IRBI 2025 bahaya banjir, longsor, atau gempa di kelas nilai teratas nasional; (b) jembatan rusak tercatat ≥ 1 pada ≥ 2 tahun dari 2018–2025 (turunan baru per kab); (c) rumah RB 2015–2025 di kuartil atas; (d) berada di CAT berzona kritis atau rusak, atau di kawasan penurunan muka tanah terverifikasi (penanda kehati-hatian air tanah, bukan syarat prioritas bantuan). Uji kepekaan ambang; label asumsi-kebijakan.
- **Temuan kunci yang diharapkan:**
  - Kolom `jembatan_rusak` DIBI bernilai 0 untuk 2008–2017; seri efektif 2018 [F§2]. DIBI tidak punya kolom SPAM [F§4].
  - Rekonsiliasi: jembatan Sumatra 2025 (DIBI tiga provinsi 744 dari rekap provinsi 2025; BNPB 10 Desember 2025 498 sekunder; PU 14 jembatan nasional putus di Aceh per 1 Desember 2025, resmi) [F§4][B29][B36]; rumah rusak Sumatra (DIBI 228.006; BNPB sekitar 147.000; Kementerian PKP 189.308) [E27]; Cianjur (DIBI 57.337 lawan R3P 114.315); SPAM Sumatra (176 lawan 178 SPAM terdampak; 143 berfungsi 2 Februari 2026 resmi lawan 153 sekunder) [D21][D22][E28].
  - Biaya satuan dan rentangnya ditulis berlabel (Bab 6-7), tanpa total.
- **Komponen:** Tabel 3.1 sumber, produsen, label (B5.7); Tabel 3.2 kolom DIBI yang dipakai dan patahannya (B5.7); Tabel 3.3 matriks ketersediaan kuantifikasi jenis × besaran RR (G16); Tabel 3.4 aturan daftar perhatian dan uji kepekaan (B5.7); Tabel 3.5 rekonsiliasi angka (B5.7) dengan kotak "Perbandingan dengan sumber lain" (L22); Gambar 3.1 rantai metode (B5.23).
- **Status data:** sebagian; turunan baru: jembatan rusak per kab 2018–2025, rumah RB per kab 2015–2025 (dari `skenario-hidromet/dibi_kab.csv` dan `skenario-geologi`).

### BAB 4 BEBAN REHABILITASI DAN REKONSTRUKSI 2015–2025 (perkiraan 10 hlm)

- **Subbab:** 4.1 Rumah Rusak per Jenis dan Tahun; 4.2 Jembatan dan Fasilitas Umum Rusak; 4.3 Sebaran per Provinsi dan Daftar Perhatian; 4.4 Kejadian Besar sebagai Preseden; 4.5 Kecepatan Pemulihan: Lapis Sementara Cepat, Lapis Permanen Tertinggal.
- **Tujuan bab:** menunjukkan besar dan sebaran beban RR, dan di mana pemulihan biasanya tertahan.
- **Pertanyaan kunci:**
  1. Berapa rumah, jembatan, dan fasilitas umum rusak per tahun dan per jenis bencana?
  2. Provinsi dan kab/kota mana yang berulang menanggung beban?
  3. Kejadian mana menjadi preseden, dan seberapa cepat tiap lapis pulih?
- **Temuan kunci yang diharapkan:**
  - Rumah RB 2015–2025: 301.311 (RS 256.321; RR 743.198); gempa 182.522 dan banjir 105.016 RB (resmi [F§2]).
  - Jembatan rusak 2018–2025: banjir 3.490 dari 3.833; Aceh 633, Sumatera Barat 521, Sulawesi Selatan 280 (resmi [F§2]).
  - Preseden: Padang 2009 (119.005 RB), Lombok 2018 (75.160 RB; 217.855 rusak), Sulteng 2018 (34.166 RB), Cianjur 2022, Sumatra 2025 (62.956 RB), Aceh 2004 (140.304 rumah dibangun BRR, T14) [F§3][E1].
  - Kecepatan: Sumatra per 5 Oktober 2026 jalan dan jembatan nasional pulih 100%, jembatan daerah Aceh 58,93%, huntap 2.085 dari 57.027 (sekunder [E31]; masuk badan teks hanya bila sumber resmi dibuka). Sulteng: huntap tersisa 382 dari 5.598 per Juni 2024 (resmi [E14]).
- **Komponen:** Gambar 4.1 rumah RB per tahun bertumpuk kelompok bahaya 2015–2025 (G9, penanda patahan 2024); Gambar 4.2 jembatan rusak per jenis 2018–2025 (G8); Gambar 4.3 peta jembatan rusak per provinsi 2018–2025 (G20 bulatan sebanding, L34); Tabel 4.1 tabel preseden kejadian besar × besaran RR (L55); Gambar 4.4 capaian pemulihan per lapis Sumatra 2025 (G22) berpil sekunder sampai sumber resmi; Tabel 4.2 daftar perhatian RR ringkas (rinci Lampiran A).
- **Status data:** ada (nasional, provinsi); sebagian (kab/kota).

### BAB 5 AKSES: JEMBATAN DAN JALAN PENGHUBUNG PASCABENCANA (perkiraan 12 hlm)

- **Subbab:** 5.1 Kerusakan Jembatan dan Desa Terputus; 5.2 Lapis Darurat: Bailey dan Rangka Baja; 5.3 Program Jembatan Nasional 2025–2026: Satgas Pembangunan Jembatan (Jembatan Garuda TNI AD), Jembatan Merah Putih Presisi (Polri), Jembatan Gantung Kementerian PU; 5.4 Status Nama "Jembatan Merah Putih"; 5.5 Lapis Permanen dan Membangun Kembali Lebih Baik (Palu IV dan desain fungsi ganda); 5.6 Bukti Dampak Jembatan Pedesaan; 5.7 Kesenjangan Spesifik Akses.
- **Tujuan bab:** memetakan siapa membangun jembatan apa, pada lapis mana, dan bagaimana program yang ada dipakai untuk RR.
- **Pertanyaan kunci:**
  1. Berapa jembatan rusak dan desa terputus per kejadian, dan berapa hari sampai akses darurat terbuka?
  2. Program jembatan mana yang ada, milik siapa, jenis apa, berapa unit, dan berapa yang di daerah bencana?
  3. Apa yang sebenarnya dimaksud "Jembatan Merah Putih"?
  4. Bagaimana jembatan darurat diganti permanen tanpa menjadi aset yatim?
- **Temuan kunci yang diharapkan:**
  - Satgas Pembangunan Jembatan dibentuk 28 November 2025, dipimpin KSAD (sekunder [B11][B12][B21]; dasar hukum tidak ditemukan); 218 jembatan diresmikan 9 Maret 2026, dibangun dalam 2,5 bulan; di wilayah bencana 480 titik disurvei dan 145 selesai pada saat itu (resmi, Setkab [B15]); 3.008 titik dikerjakan, 2.500 selesai, 798 di daerah bencana per 13 Agustus 2026 (resmi, Setneg [B1]). Jenis: bailey, armco, beton, perintis (sekunder [B20][B21]).
  - Jembatan Merah Putih Presisi (Polri): 895 unit, 874 selesai, 17 dibangun, 4 rencana per 13 Agustus 2026, swadaya di 30 Polda (resmi [B1]); 178 unit pada 14 Januari 2026 dan sekitar 807 pada 8 Juli 2026 (resmi, Tribratanews [B5][B8]); 39 unit di wilayah bencana Sumatra (sekunder [B3]).
  - Kementerian PU: 43 jembatan gantung 2025 senilai Rp246,36 miliar; rencana 2026 sekitar Rp920 miliar untuk 122 unit (resmi [B25]) lawan target 105 unit menurut BBPJN Jateng-DIY (resmi [B26]); bentang utama maksimum 120 m (SE Menteri PU 02/SE/M/2010 [B28], status keberlakuan belum dicek). Biaya rata-rata 2025 sekitar Rp5,73 miliar per unit (asumsi-kebijakan, hitungan dari [B25]).
  - Bailey DSP: diadakan sebagai barang hibah ke daerah, dibayar setelah audit BPKP [B33][A20]; pemasangan bailey 16,5 m Temanggung Rp144 juta, DSP 2026 (resmi [B34], laman 403, perlu dibuka ulang).
  - Sumatra: 14 jembatan nasional putus di Aceh per 1 Desember 2025 (resmi [B29]); jembatan bailey Garoga 44 m, 25 ton (resmi [B31]).
  - Status nama: dipakai beberapa pihak; tidak ada satu program nasional bernama "Jembatan Merah Putih" (riset B §1).
  - Bukti: Rwanda RCT dan Nicaragua (terverifikasi, luar negeri; padanan di Indonesia: jembatan gantung PU dan Satgas); belum ada evaluasi dampak program Indonesia, sehingga posisi Program berjalan, wajib evaluasi dampak.
- **Komponen:** Tabel 5.1 program jembatan × pemilik × jenis × jumlah × wilayah bencana × biaya satuan × sumber (B5.7); Gambar 5.1 jumlah jembatan program lawan jembatan rusak DIBI 2025 (G9); Kotak 5.1 status nama "Jembatan Merah Putih" (B5.5); Gambar 5.2 rantai darurat ke permanen untuk jembatan (B5.23); Halaman studi kasus 5.1 Jembatan Palu IV fungsi ganda (B5.30, L21; bukti lemah, ditulis apa adanya) atau Rwanda RCT (B5.30, terverifikasi); Gambar 5.3 hari sampai akses darurat terbuka, beberapa kejadian (G24) bila data terkumpul.
- **Status data:** sebagian (biaya per unit Polri dan TNI tidak diumumkan; stok bailey nasional dan data bailey Palu, Lombok, Cianjur, Semeru tidak ditemukan; progres Oktober 2026 tidak ditemukan).

### BAB 6 AIR: SISTEM PERPIPAAN PASCABENCANA (perkiraan 12 hlm)

- **Subbab:** 6.1 Kerusakan Sistem Air Minum pada Kejadian Besar; 6.2 Lapis Darurat: Truk Tangki, Hidran Umum, IPA Mobile, dan Kit Pipa Bergerak; 6.3 Lapis Sementara: Transmisi HDPE dan Sistem Gravitasi; 6.4 Lapis Permanen: Rehabilitasi SPAM dan Membangun Kembali Lebih Baik; 6.5 Waktu Pulih: Pembanding Domestik dan Internasional; 6.6 Biaya Satuan sebagai Pembanding; 6.7 Bukti Program; 6.8 Kesenjangan Spesifik Air Perpipaan.
- **Tujuan bab:** menetapkan pola peralihan air darurat ke perpipaan permanen dan ukurannya.
- **Pertanyaan kunci:**
  1. Berapa SPAM dan jiwa terdampak per kejadian, dan berapa lama layanan pulih?
  2. Kapan truk tangki diganti perpipaan sementara, dan siapa memutus?
  3. Standar apa yang mengikat tiap lapis (Perka BNPB 7/2008, SPM air minum, SNI pipa)?
  4. Bagaimana kit pipa bergerak (SIPPA) dipakai di lapis darurat?
- **Temuan kunci yang diharapkan:**
  - Standar: 7 liter per orang per hari pada tiga hari pertama, lalu 15 liter (Perka 7/2008, resmi [A14]); SPM air minum 60 liter per orang per hari (resmi [D4]); Sphere 250 orang per keran (terverifikasi [D35]).
  - Lombok 2018: 37 titik SPAM rusak; lapis darurat 83 sumur bor (1.314 l/dt), 242 hidran 2.000 liter, 28 truk tangki (resmi, buku Satgas PU [D10]). Cianjur 2022: 10 titik SPAM rusak, 172 hidran pada puncak (resmi [D12]).
  - Sumatra 2025: 143 dari 176 SPAM berfungsi 2 Februari 2026; sekitar 95,5% dari 178 pada 7 Mei 2026; 537 sarana darurat dan 128 sumur bor; permanen ditargetkan Agustus 2028 (resmi [D21][D22]).
  - Waktu pulih pembanding: Kobe 90% dalam 38 hari dan 100% dalam 81 hari; Tohoku 90% dalam 36 hari (terverifikasi, JSCE [D36]). Kurva pulih domestik belum ada (celah).
  - Biaya satuan berlabel: truk PDAM sekitar Rp19.000 per m3 (2022, satu tarif kabupaten; estimasi-model [D32]); SPAM permanen sekitar Rp0,37-1,57 miliar per l/dt (2023–2025, hitungan dari proyek PU; estimasi-model [D29][D30][D31]); peralihan truk ke pipa di konteks pengungsian jangka panjang menurunkan biaya per m3 dari US$9 ke US$1 (terverifikasi [D46]).
  - Bukti: PAMSIMAS sekitar 24,4 juta orang akses (sedang, bukan program darurat [D33]); Satgas PU Lombok dan Cianjur terdokumentasi rinci tetapi tanpa ukuran liter yang diterima (sedang); tidak ada evaluasi independen pemulihan SPAM pascabencana di Indonesia.
- **Komponen:** Tabel 6.1 kerusakan sistem air per kejadian besar (L55); Gambar 6.1 persen layanan pulih lawan hari sejak kejadian: Kobe, Tohoku, Sumatra 2025 (G24); Tabel 6.2 standar per lapis (B5.7); Gambar 6.2 rantai darurat-sementara-permanen dengan titik serah dan pemutus (B5.23, G21); Gambar 6.3 biaya per m3 truk lawan pipa (G14, berpil sesuai label); Tabel 6.3 rentang biaya satuan (G12 bila digambar); Kotak 6.1 kit pipa bergerak SIPPA (B5.5, rujukan saja, R1); Halaman studi kasus 6.1 SCIRT Christchurch (B5.30, bukti sedang).
- **Status data:** sebagian (PDNA dan R3P dengan angka air terpisah untuk Palu, Lombok, Cianjur, Sumatra tidak diperoleh; biaya resmi pipa HDPE per km per diameter tidak ada; pedoman resmi PU untuk SPAM darurat tidak ditemukan).

### BAB 7 AIR: PEMANFAATAN AKUIFER (AIR TANAH) (perkiraan 12 hlm)

- **Subbab:** 7.1 Cekungan Air Tanah dan Zona Konservasi; 7.2 Sumur Bor Darurat dan Sumur Produksi: Praktik Badan Geologi, PU, TNI AD, Polri; 7.3 Mutu Air Tanah Pascabencana; 7.4 Intrusi Air Laut Pascatsunami; 7.5 Akuifer Terdampak Likuefaksi; 7.6 Batas Pengambilan: Penurunan Muka Tanah; 7.7 Air Tanah untuk Huntap; 7.8 Kesenjangan Spesifik Air Tanah.
- **Tujuan bab:** menentukan kapan air tanah menjadi jawaban RR dan kapan menjadi risiko baru.
- **Pertanyaan kunci:**
  1. Di CAT dan zona mana sumur bor RR aman dibangun?
  2. Berapa debit, kedalaman, jiwa terlayani, dan biaya satuan sumur bor?
  3. Bagaimana mutu air diuji dan oleh siapa?
  4. Apa yang terjadi pada akuifer setelah tsunami dan likuefaksi?
  5. Bagaimana sumur darurat diserahkan dan dirawat sesudah status berakhir?
- **Temuan kunci yang diharapkan:**
  - 421 CAT (resmi, Badan Geologi 2009 dan Permen ESDM 2/2017; lampiran berupa pindaian, angka dicek ulang [C2][C4]).
  - Sumur Badan Geologi tipikal sekitar 125 m, debit 1-2,4 l/detik, sekitar 2.000 jiwa per sumur; kumulatif 2005–2018 2.290 unit untuk sekitar 6,6 juta jiwa (resmi [C15]). Data 2021–2025 tidak ditemukan.
  - Biaya satuan sumur dalam sekitar Rp472-572 juta per unit dan sumur dangkal darurat sekitar Rp142 juta (estimasi-model, dihitung dari pagu ESDM 2019–2023 [C15][C16][C17]).
  - TNI AD: 3.000 sumber air bersih diresmikan 13 Agustus 2026 (resmi, jenis tidak disebut [C-T1]); 3.300 titik air bersih sumur bor per Januari 2025 (sekunder [C-T2]). Polri menargetkan 569 titik sumur di Sumatra (sekunder [C43]). PU 86 sumur dalam di Sumatra (sekunder [C44]) lawan 128 sumur bor (resmi [D21]); rekonsiliasi.
  - Mutu: Permenkes 2/2023 E. coli 0 CFU/100 ml, arsen paling tinggi 0,01 mg/L (resmi [C25]); Sphere E. coli tanpa klorin paling tinggi 10 CFU/100 ml (terverifikasi [C24]). Data E. coli sumur darurat Indonesia tidak ditemukan (celah).
  - Intrusi: salinitas air tanah Aceh Barat turun dari lebih dari 10 ke kurang dari 2 mS/cm dalam dua tahun (terverifikasi [C26]).
  - Penurunan muka tanah pesisir utara Jawa Tengah 6-10 cm per tahun (resmi [C50]); kawasan ini ditandai kehati-hatian sumur bor (prinsip 6).
  - Huntap Tondo 1.102 unit (resmi [C49]); sumber air huntap Lombok dan Cianjur tidak ditemukan.
- **Komponen:** Gambar 7.1 peta CAT dan zona konservasi dengan kab daftar perhatian RR (G19 untuk zona, bila poligon Badan Geologi diperoleh; bila tidak, tabel provinsi); Tabel 7.1 pelaksana sumur bor × jumlah × kedalaman × debit × biaya satuan × sumber (B5.7); Tabel 7.2 standar mutu air per lapis (B5.7); Kotak 7.1 air tanah di kawasan penurunan muka tanah (B5.5, argumen tandingan L63); Halaman studi kasus 7.1 pemulihan salinitas Aceh Barat 2006–2008 (B5.30, terverifikasi) atau Palu likuefaksi dan saluran Gumbasa.
- **Status data:** sebagian (poligon zona konservasi tidak terunduh; izin air tanah darurat tidak diatur; status PP 43/2008 dan penerbit izin belum pasti, KERANGKA induk celah 32).

### BAB 8 SKENARIO TERBURUK BEBAN REHABILITASI DAN REKONSTRUKSI PER JENIS BENCANA (perkiraan 14 hlm)

- **Subbab:** 8.1 Aturan Kartu; 8.2 Gempa Bumi; 8.3 Tsunami; 8.4 Likuefaksi; 8.5 Banjir dan Banjir Bandang; 8.6 Tanah Longsor; 8.7 Erupsi Gunung Api; 8.8 Cuaca Ekstrem; 8.9 Kartu Agregat Musim Hujan 2026/2027 untuk Kesiapan RR; 8.10 Sebaran per Provinsi dan Kab/Kota; 8.11 Matriks Kemungkinan × Dampak RR.
- **Tujuan bab:** memberi tiap jenis satu kartu beban RR yang dapat disalin ke R3P dan rencana kontingensi.
- **Pertanyaan kunci:**
  1. Berapa rumah, jembatan, layanan air, dan durasi pulih pada skenario terburuk yang masuk akal per jenis?
  2. Di provinsi dan kab/kota mana beban itu jatuh?
  3. Apa kebutuhan lapis darurat (bailey, sumur, kit pipa, truk) per skenario?
- **Format kartu (prinsip 7; L20):** karakteristik ancaman; skenario kejadian; lantai tercatat (kejadian, tahun, sumber, label); empat besaran RR; kebutuhan lapis darurat (dihitung dari standar Perka 7/2008 dan rasio satuan Bab 6-7, asumsi-kebijakan); baris kepekaan; matriks mini.
- **Tabel kartu (isi dikunci setelah turunan per kab):**

| Kartu | Jenis | Lantai rumah | Lantai jembatan/akses | Lantai layanan air | Durasi pulih acuan | Kepekaan |
|---|---|---|---|---|---|---|
| 8.2 | Gempa bumi | Padang 2009: 119.005 RB, 271.540 rusak (resmi, DIBI); Lombok 2018: 217.855 rusak (resmi) | DIBI gempa 2018–2025: 90 jembatan (resmi); per kejadian: perlu turunan | Lombok 2018: 37 SPAM rusak (resmi [D10]) | Huntap Sulteng tersisa 382 dari 5.598 per Juni 2024, lebih dari lima tahun (resmi [E14]) | Versi DIBI lawan R3P (Cianjur 57.337 lawan 114.315); Mmaks sesar darat PuSGeN 2024 dari KERANGKA induk |
| 8.3 | Tsunami | Aceh 2004: 140.304 rumah dibangun BRR (resmi, T14 [E1]) | Aceh 2004: jalan nasional dan provinsi 570 km dibangun MDF (terverifikasi [E4]) | Hampir 8.000 sumur atau sumber air oleh MDF (terverifikasi [E4]); salinitas pulih sekitar dua tahun (terverifikasi [C26]) | Rencana Induk berlaku 4 tahun (Perpres 30/2005, resmi [E3]) | Dengan dan tanpa Aceh 2004; lantai Jawa selatan Pangandaran 2006 (KERANGKA induk) |
| 8.4 | Likuefaksi | Sulteng 2018: 34.166 RB (resmi, DIBI; gabungan gempa, tsunami, likuefaksi) | Jembatan Palu IV runtuh; pengganti 250 m (terverifikasi [E18]) | Pasigala sekitar 90% layanan rusak (sekunder [D16]); DI Gumbasa 8.180 ha (sekunder [E19]) | Huntap relokasi zona merah lebih dari lima tahun (resmi [E14]) | Porsi likuefaksi dalam kerusakan Sulteng tidak terpisah di DIBI; tidak dikuantifikasi terpisah |
| 8.5 | Banjir dan banjir bandang | Sumatra 2025: 62.956 RB, 228.006 rusak (resmi, DIBI) | 2025: 1.088 jembatan nasional DIBI; Aceh 480 (resmi) | 178 SPAM terdampak; 95,5% berfungsi Mei 2026 (resmi [D22]) | Permanen SPAM Agustus 2028 (resmi [D21]); jembatan daerah Aceh 58,93% Oktober 2026 (sekunder) | Rumah: DIBI lawan BNPB 147.000 lawan PKP 189.308; jembatan: 744 lawan 498 |
| 8.6 | Tanah longsor | Lantai per kab dari turunan `dibi_kab.csv` (DIBI longsor 2015–2025: 13.580 RB nasional, resmi) | DIBI longsor 2018–2025: 250 jembatan (resmi) | Tidak dikuantifikasi (tidak ada data) | Tidak dikuantifikasi | Dengan dan tanpa porsi longsor dalam rangkaian Sumatra 2025 |
| 8.7 | Erupsi gunung api | Merapi 2010: 2.465 RB, 447.982 mengungsi (resmi, DIBI) | DIBI erupsi 2018–2025: 52 jembatan (resmi) | Tidak dikuantifikasi; mata air dan pipa gravitasi lereng sebagai risiko kualitatif | Tidak dikuantifikasi | Tuas relokasi KRB III (kualitatif) |
| 8.8 | Cuaca ekstrem | DIBI 2015–2025: 25.469 RB, 166.830 RR (resmi) | 37 jembatan (resmi) | Tidak berlaku | Lapis darurat saja | Patahan kategori 2018 dan 2024 |

- **Sebaran (8.10):** jembatan rusak per provinsi 2018–2025 dan 2025 [F§2]; rumah RB per provinsi 2018–2025 (NTB 77.311; Aceh 55.522; Sulawesi Tengah 35.570) [F§2]; per kab menunggu turunan.
- **Komponen:** Kartu 8.2-8.8 (NASKAH-SPEK §11.4, satu kartu satu jenis); Kartu agregat 8.9; Tabel 8.1 matriks ketersediaan kuantifikasi jenis × besaran RR (G16); Gambar 8.1 matriks kemungkinan × dampak RR (G17, B5.27; jenis tanpa dasar peluang di panel "dampak dinilai, kemungkinan tidak dinilai"); Gambar 8.2 peta kecil berganda per provinsi: rumah RB dan jembatan rusak (G20, L33, L34); Tabel 8.2 kebutuhan lapis darurat per kartu (B5.7, asumsi-kebijakan).
- **Status data:** sebagian.

### BAB 9 ANALISIS KESENJANGAN (perkiraan 8 hlm)

- **Subbab:** 9.1 Regulasi dan Pendanaan; 9.2 Kelembagaan, Koordinasi, dan Kepemilikan Aset; 9.3 Data dan Pencatatan; 9.4 Kapasitas Daerah dan Operasi-Pemeliharaan; 9.5 Air Tanah dan Perizinan; 9.6 Bukti Program; 9.7 Yang Sudah Berjalan dan Tidak Boleh Dikorbankan.
- **Tujuan bab:** menamai kesenjangan yang paling menahan, berbukti dan berpembuka.
- **Pertanyaan kunci:**
  1. Norma dan instrumen dana apa yang tidak menjangkau jembatan desa, SPAM desa, lahan, dan pemeliharaan?
  2. Di mana program jembatan dan air K/L tidak tercatat di R3P dan DIBI?
  3. Data apa yang tidak ada untuk mengukur pemulihan?
  4. Apa yang harus dipertahankan?
- **Temuan kunci yang diharapkan:**
  - Hibah RR tidak dapat membiayai aset desa, lahan, perencanaan-pengawasan-operasi-pemeliharaan, dan pekerjaan darurat (Perban 4/2024 Pasal 5) [A5]; perubahan RKA tidak boleh mengubah jenis atau lokasi (Pasal 26 ayat (2)), sehingga perubahan trase pipa atau lokasi jembatan setelah survei ulang sulit diakomodasi [A5] (inferensi penyusun).
  - Kegiatan DSP dan rincian kegiatan hibah RR ditetapkan Kepala BNPB (Perban 4/2020 Pasal 11; Perban 4/2024 Pasal 2 ayat (2)); keputusan rinciannya tidak ditemukan di korpus [A§4].
  - Tidak ada standar waktu pulih air dan akses di peraturan BNPB [A§1]; DIBI tanpa kolom SPAM; jembatan tanpa pembeda status jalan [F§4].
  - Program jembatan TNI AD dan Polri berjalan di luar R3P dan tanpa biaya satuan terbuka [B§1]; dasar hukum Satgas Pembangunan Jembatan tidak ditemukan.
  - Sumber air huntap tidak dipersyaratkan sebelum lokasi disahkan [A§5]; tidak ada izin air tanah khusus darurat [C§1].
  - Data penerima ganda di Sumatra (147.000 lawan 189.308) [E27].
  - Penyelarasan dokumen BNPB: rumusan Perban 6/2017 Pasal 9, status Perka 17/2010 di indeks JDIH, nomenklatur Perka 12/2010 [A§8].
  - Yang dipertahankan: Satgas PU di kejadian besar (dokumentasi Lombok dan Cianjur), DTH, Dana Bersama pascabencana berbasis R3P (Juklak 1/2025), bailey DSP sebagai hibah barang.
- **Komponen:** Kartu temuan 9.1-9.6 (B5.6); Tabel 9.1 celah instrumen dana × jenis aset (B5.7); Tabel 9.2 data yang hilang dan pemiliknya (B5.7); Gambar 9.1 sel matriks lapis × sektor per kategori bukti (G16); Kotak 9.1 yang tidak boleh dikorbankan (B5.5).
- **Status data:** ada.

### BAB 10 GRAND DESIGN REHABILITASI DAN REKONSTRUKSI AIR DAN AKSES 2026–2030 (perkiraan 16 hlm)

- **Subbab:** 10.1 Kerangka Program; 10.2 Sasaran 2029 dan Arah 2030; 10.3 Alur Langkah Tiga Lapis dan Titik Serah; 10.4 Paket Standar per Lapis: Akses, Air Perpipaan, Air Tanah; 10.5 Program Akses; 10.6 Program Air Perpipaan; 10.7 Program Air Tanah; 10.8 Pengikat Hunian: Air dan Akses sebagai Syarat Lokasi Huntap; 10.9 Kesiapan RR Musim Hujan 2026/2027 dan Pemutakhiran R3P Sumatra; 10.10 Agenda Bukti 2026–2030.
- **Tujuan bab:** menyusun program berlapis, berpasal, dan berbukti yang dimulai musim hujan 2026/2027.
- **Pertanyaan kunci:**
  1. Sasaran apa yang terukur sekarang, dan baseline apa yang dibentuk paling lambat 2027?
  2. Siapa memutus peralihan dari lapis darurat ke sementara ke permanen, pada pemicu apa?
  3. Program apa per sektor, dengan status P7, kategori bukti, unit BNPB, dan K/L?
  4. Apa yang dikerjakan sebelum puncak musim hujan 2026/2027?
- **Kerangka program (L18; kode dipakai ulang di matriks, indikator, rekomendasi):**

| Kode | Pilar dan program | Lapis | Status (P7) | Pemimpin | Peran BNPB (K/P/R/I) | Unit BNPB | Bukti |
|---|---|---|---|---|---|---|---|
| A1 | Pemasangan akses darurat dalam hari: bailey dan rangka baja DSP sebagai hibah barang | darurat | Sudah ada, perlu dikembangkan (standar hari dan stok) | Kementerian PU (Bina Marga), TNI (Zeni) | K, pendanaan DSP | Deputi Bidang Penanganan Darurat; Deputi Bidang Logistik dan Peralatan | Aksi wajib menurut peraturan (UU 24/2007 Pasal 48 huruf f; Perka 12/2010) |
| A2 | Pengikatan program jembatan Satgas TNI AD dan Polri ke R3P dan DIBI | sementara, permanen | Usulan baru | TNI AD, Polri, Kementerian PU | K, data | Direktorat RR Infrastruktur; Pusdatinkom | Program berjalan, wajib evaluasi dampak |
| A3 | Penggantian permanen jembatan darurat dengan jadwal dan pemilik aset tertulis | permanen | Usulan baru | Kementerian PU, pemda | K, monev | Direktorat RR Infrastruktur | Rujukan tata kelola (SCIRT) |
| A4 | Jalur dana jembatan desa pascabencana | permanen | Usulan baru (perubahan Perban 4/2024 atau jalur dana desa dan Dana Bersama) | BNPB, Kemendesa, Kemendagri | NSPK, pendanaan | Direktorat RR Infrastruktur; Biro Hukum, Organisasi, dan Kerja Sama | Uji coba terukur |
| W1 | Air darurat sesuai Perka 7/2008 dengan peralihan truk ke perpipaan sementara pada pemicu tertulis | darurat, sementara | Sudah ada, perlu dikembangkan | BPBD, PDAM, Kementerian PU (Cipta Karya) | K, pendanaan DSP | Deputi Bidang Penanganan Darurat | Aksi wajib menurut peraturan |
| W2 | Rehabilitasi SPAM membangun kembali lebih baik dalam R3P, ukuran jiwa terlayani | permanen | Sudah ada, perlu dikembangkan | Kementerian PU (Cipta Karya), pemda, PDAM | K, monev | Direktorat RR Infrastruktur | Program dengan syarat (bukti sedang, Satgas PU) |
| W3 | Kit pipa bergerak dan IPA mobile di gudang regional (rujukan SIPPA) | darurat | Usulan baru (bergantung hasil pilot SIPPA) | BNPB | P, logistik | Deputi Bidang Logistik dan Peralatan | Uji coba terukur |
| G1 | Protokol sumur bor RR bersama Badan Geologi: lokasi menurut zona, uji mutu, serah terima pengelola | darurat, sementara | Usulan baru | Kementerian ESDM (Badan Geologi), Kementerian PU (SDA) | K, data | Direktorat RR Infrastruktur; Direktorat Pemetaan dan Evaluasi Risiko Bencana | Uji coba terukur |
| G2 | Pencatatan sumur TNI AD, Polri, PU, dan Badan Geologi di daerah bencana dalam satu daftar | sementara | Usulan baru | BNPB (Pusdatinkom), Badan Geologi | data | Pusdatinkom | Rujukan tata kelola |
| H1 | Syarat sumber air dan akses sebelum penetapan lokasi huntap | permanen | Usulan baru | Kementerian PKP, pemda | NSPK | Direktorat RR Perumahan | Pelajaran (Haiyan, Sulteng) |
| D1 | Kolom DIBI untuk SPAM terdampak, jiwa tanpa air perpipaan, jembatan per status jalan, dan hari pulih | lintas | Usulan baru | BNPB | data | Pusdatinkom | Aksi wajib menurut peraturan (Perban 1/2023 Satu Data Bencana) |

- **Temuan kunci yang diharapkan:**
  - Sasaran 2029 resmi yang relevan: indikator RPJMN "daerah pascabencana masif" 100 (KERANGKA induk prinsip 13); sasaran berangka lain berlabel asumsi-kebijakan setelah baseline 2027 (Q11).
  - Alur langkah berpasal: kaji cepat (UU 24/2007 Pasal 49) → status (Perban 4/2020) → pemulihan segera prasarana vital (Pasal 48 huruf f, PP 21/2008 Pasal 54) → Jitupasna (Perka 15/2011) → R3P paling lama 90 hari, dimulai saat tanggap darurat (Perban 5/2017 Pasal 2) → hibah RR (Perban 4/2024) atau Dana Bersama pascabencana (Juklak 1/2025) → monev (Perban 6/2017 Pasal 14).
  - Kesiapan musim hujan 2026/2027: inventaris bailey, kit pipa, IPA mobile, dan truk per Direktorat PD Wilayah terhadap kartu agregat 8.9 (selaras keputusan 14 hari KERANGKA induk §6 butir 4).
  - Agenda bukti: evaluasi dampak program jembatan TNI AD dan Polri (desa tersambung, waktu tempuh, akses sekolah dan pasar; rancangan mengikuti RCT Rwanda), uji coba paket air dan akses di satu kabupaten Sumatra (Q20), evaluasi fungsi sumur darurat 12 bulan setelah serah terima.
- **Komponen:** Halaman kerangka 10.1 (B5.12, L18); Tabel 10.1 indikator dan sasaran (B5.19, G22); Gambar 10.1 alur langkah tiga lapis berpemicu (B5.23, G21); Tabel 10.2 paket standar per lapis × sektor (B5.22); Tabel 10.3 program per sektor (B5.7); Gambar 10.2 kalender kesiapan RR musim hujan 2026/2027 (G23); Tabel 10.4 agenda bukti (B5.7); Halaman studi kasus 10.1 hibah bertermin Nepal (B5.30, bukti sedang) sebagai rujukan pengunci mutu.
- **Status data:** sebagian.

### BAB 11 KELEMBAGAAN, PEMBIAYAAN, DAN PETA JALAN (perkiraan 10 hlm)

- **Subbab:** 11.1 Matriks Mandat Tertulis Lembaga × Lapis × Sektor; 11.2 Usulan Penugasan dan Instrumen Penetapannya; 11.3 Forum Koordinasi dan Jalur Adopsi; 11.4 Yang Berubah dari Renas PB dan Praktik R3P; 11.5 Arsitektur Pembiayaan per Lapis dan Jenis Aset; 11.6 Instrumen Hukum; 11.7 Peta Jalan; 11.8 Indikator Kinerja; 11.9 Pemantauan dan Pelaporan.
- **Tujuan bab:** memberi tiap program pemilik bermandat, forum, sumber dana, instrumen, dan jadwal.
- **Pertanyaan kunci:**
  1. Mandat tertulis siapa per lapis dan sektor, dan mana yang usulan?
  2. Sumber dana mana untuk aset nasional, daerah, dan desa pada tiap lapis?
  3. Instrumen hukum apa yang diubah atau dibentuk, oleh siapa, di Progsun mana?
- **Temuan kunci yang diharapkan:**
  - Mandat: PP 21/2008 Pasal 54, 57, 59, 60, 76, 78, 79; Perban 6/2017 Pasal 12-14; UU 23/2014 Lampiran (SPAM, jalan); UU 17/2019 (air) [A].
  - Pembiayaan per lapis: DSP (darurat; tiga keadaan, Perban 4/2020 Pasal 2); hibah RR (permanen, aset pemda, dengan pengecualian Pasal 5); Dana Bersama pascabencana (kegiatan di R3P, Juklak 1/2025); APBN K/L (aset nasional); APBD dan BTT; dana desa (aset desa); TKD tambahan Sumatra (sekunder [E29]). Tanpa pagu (P5).
  - Instrumen usulan: perubahan Perban 4/2024 (aset desa, perubahan lokasi karena survei ulang) (Usulan baru); pembaruan Perka 12/2010 perbaikan darurat (Sudah ada, perlu dikembangkan); juklak protokol sumur bor RR bersama Badan Geologi (Usulan baru); templat R3P dengan baris waktu pulih air dan akses dan daftar jembatan darurat yang harus diganti (perubahan Perban 5/2017 atau juklaknya) (Sudah ada, perlu dikembangkan).
- **Komponen:** Tabel 11.1 matriks mandat tertulis (B5.7, kode K/P/R/I, S22); Tabel 11.2 usulan penugasan (B5.7); Gambar 11.1 forum dan jalur adopsi (B5.23); Tabel 11.3 yang berubah dari Renas PB dan praktik R3P (B5.7); Gambar 11.2 lapisan pembiayaan × jenis aset (B5.21, G21 aliran tanpa lebar sebanding); Tabel 11.4 instrumen hukum dengan kolom Progsun (B5.20); Tabel 11.5 peta jalan (B5.13, kolom WAKTU); Tabel 11.6 indikator (B5.19); Gambar 11.3 tata kelola dan pelaporan (B5.23).
- **Status data:** ada (teks hukum); sebagian (Keppres 1/2026, Inpres 18/2025).

### BAB 12 KESIMPULAN DAN REKOMENDASI (perkiraan 4 hlm)

- **Subbab:** 12.1 Kesimpulan; 12.2 Keputusan yang Diminta dari Kepala BNPB; 12.3 Rekomendasi Internal BNPB; 12.4 Rekomendasi Lintas K/L; 12.5 Yang Sengaja Tidak Direkomendasikan; 12.6 Yang Belum Diketahui.
- **Yang tidak direkomendasikan:** BNPB membangun jembatan atau SPAM permanen sendiri di luar pemilik aset; sumur bor di zona rusak tanpa rekomendasi Badan Geologi; angka total kebutuhan RR nasional sebagai satu angka; menyebut "Jembatan Merah Putih" sebagai program tunggal; memakai unit SPAM berfungsi sebagai ukuran tunggal pemulihan.
- **Komponen:** kisi prioritas 3×3 bila rekomendasi > 9 (L31, G18); register (§6).

**Jumlah perkiraan:** 6 + 8 + 8 + 10 + 12 + 12 + 12 + 14 + 8 + 16 + 10 + 4 = 120 halaman isi (P18: bukan batas).

---

## 5. Angka wajib registri (namespace `rehab.*`)

Entri dibangun di `data/angka.json` blok `angka` dengan berkas, jalur, satuan, keyakinan, sumber (NASKAH-SPEK §8). Angka yang belum punya berkas paket memakai `nilai` + `pustaka`. Kunci terkelompok; daftar lengkap calon per riset ada di bagian akhir tiap berkas riset.

| Kunci | Nilai saat ini | Label | Sumber | Status |
|---|---|---|---|---|
| rehab.tesis | kalimat tesis §3 | resmi; asumsi-kebijakan | §3 | dikunci setelah Bab 4-8 |
| rehab.dibi.jembatan_rusak.2018_2025 | 3.833 | resmi | `dibi/rekap_nasional_tahunan.csv` | turunan skrip `bangun/rehab_angka.py` |
| rehab.dibi.jembatan_rusak.2025 | 1.088 | resmi | sama | idem |
| rehab.dibi.jembatan_rusak.porsi_banjir_persen | sekitar 91 | resmi (turunan) | sama | idem |
| rehab.dibi.jembatan_rusak.prov.aceh.2018_2025 | 633 | resmi | `dibi/rekap_provinsi_tahunan.csv` | idem |
| rehab.dibi.rumah_rb.2015_2025 | 301.311 | resmi | `dibi/rekap_nasional_tahunan.csv` | idem |
| rehab.dibi.fasum_rusak.2015_2025 | 21.703 | resmi | sama | idem |
| rehab.lantai.gempa.padang2009.rumah_rb | 119.005 | resmi | `dibi/kejadian_besar.csv` | ada |
| rehab.lantai.banjir.sumatra2025.rumah_rb | 62.956 | resmi | sama | ada |
| rehab.lantai.tsunami.aceh2004.rumah_brr | 140.304 | resmi (T14) | riset E [1] | pustaka |
| rehab.hukum.r3p_hari_maks | 90 | resmi | Perban 5/2017 Pasal 2 | ada (setara `perban2017_5.r3p_hari_maks` kajian 2) |
| rehab.hukum.r3p_tahun_maks | 3 | resmi | Perban 5/2017 Pasal 10 | baru |
| rehab.hukum.air_darurat_3hari / _lanjut | 7 / 15 | resmi | Perka 7/2008 | setara kunci `perka_2008` |
| rehab.hukum.dth_rp_bulan | 600.000 | resmi | Juklak 1/2023, 15/2025 | setara `juklak2023_1.dth_rp_bulan` |
| rehab.jembatan.garuda.selesai_2026_08 | 2.500 | resmi | Setneg 13 Agu 2026 [B1] | pustaka |
| rehab.jembatan.garuda.titik_wilayah_bencana_2026_08 | 798 | resmi | [B1] | pustaka |
| rehab.jembatan.polri_mpp.jumlah_total_2026_08 | 895 | resmi | [B1] | pustaka |
| rehab.jembatan.satgas.diresmikan_2026_03_09 | 218 | resmi | Setkab [B15] | pustaka |
| rehab.jembatan.pu.gantung_2025_anggaran / _unit | Rp246,36 miliar / 43 | resmi | PU [B25] | pustaka |
| rehab.jembatan.pu.gantung_biaya_rata2_2025 | sekitar Rp5,73 miliar per unit | asumsi-kebijakan | hitungan dari [B25] | pustaka |
| rehab.jembatan.bnpb.bailey_pemasangan_temanggung | Rp144 juta | resmi | BNPB [B34] | buka ulang laman |
| rehab.pipa.sumatra2025.spam_terdampak | 178 | resmi | PU [D22] | pustaka |
| rehab.pipa.sumatra2025.persen_fungsi_mei2026 | 95,5 | resmi | PU [D22] | pustaka |
| rehab.pipa.sumatra2025.target_permanen | Agustus 2028 | resmi | PU [D21] | pustaka |
| rehab.pipa.lombok.spam_rusak | 37 | resmi | buku Satgas PU [D10] | pustaka |
| rehab.pipa.pulih.kobe_90 / tohoku_90 | 38 / 36 hari | terverifikasi | JSCE [D36] | pustaka |
| rehab.pipa.biaya.per_lps (rentang) | Rp0,37-1,57 miliar per l/dt | estimasi-model | [D29]-[D31] | pustaka |
| rehab.akuifer.jumlah_cat | 421 | resmi | [C2][C4] | cek lampiran Permen ESDM 2/2017 |
| rehab.akuifer.sumur_bg_jiwa_per_sumur | 2.000 | resmi | [C15] | pustaka |
| rehab.akuifer.biaya_sumur_dalam (rentang) | Rp472-572 juta per unit | estimasi-model | [C15]-[C17] | pustaka |
| rehab.akuifer.aceh_barat_waktu_pulih_salinitas | 2 tahun | terverifikasi | [C26] | pustaka |
| rehab.akuifer.tniad_sumber_air_2026_08 | 3.000 | resmi | Setneg [C-T1] | pustaka |
| rehab.pelajaran.sulteng.huntap_sisa_jun2024 | 382 dari 5.598 | resmi | [E14] | pustaka |
| rehab.pelajaran.lombok.r3p_kebutuhan | Rp11,44 triliun | resmi | Kemenko PMK [E9] | setara kunci kajian 2 |

Angka sekunder (huntap Sumatra 2.085 dari 57.027, jembatan daerah Aceh 58,93%, rincian jenis jembatan Satgas, 498 jembatan Sumatra) didaftarkan dengan `keyakinan` sesuai sumber asli setelah dibuka; sampai itu hanya di lampiran rekonsiliasi (R3).

---

## 6. Register rekomendasi (calon) dan keputusan yang diminta

Kolom register sama dengan KERANGKA induk §6. ID `R-RR-nn`, kolom kajian `rehab`.

| ID | Langkah (≤ 8 kata) | Lapis | Status (P7) | Unit BNPB pemimpin | K/L | Waktu | Dasar |
|---|---|---|---|---|---|---|---|
| R-RR-01 | Tambah kolom air dan jembatan di DIBI | lintas | Usulan baru | Pusdatinkom | Kementerian PU, BPBD | 100 hari | Temuan 9.3; Perban 1/2023 |
| R-RR-02 | Tetapkan baseline waktu pulih air dan akses | lintas | Usulan baru | Direktorat RR Infrastruktur | Kementerian PU | 2026–2027 | Temuan 6.5, 9.3 |
| R-RR-03 | Masukkan baris waktu pulih ke templat R3P | permanen | Sudah ada, perlu dikembangkan | Deputi Bidang RR | Bappenas, Kemendagri | 2026–2027 | Perban 5/2017 Pasal 8 |
| R-RR-04 | Ikat jembatan Satgas TNI dan Polri ke R3P | sementara, permanen | Usulan baru | Direktorat RR Infrastruktur | TNI AD, Polri, Kementerian PU, Kemenko PMK | 100 hari | Temuan 5.3, 9.2 |
| R-RR-05 | Tetapkan standar hari pemasangan akses darurat | darurat | Sudah ada, perlu dikembangkan | Deputi Bidang Penanganan Darurat | Kementerian PU, TNI | 2026–2027 | Perka 12/2010 |
| R-RR-06 | Hitung stok bailey per Direktorat PD Wilayah | darurat | Usulan baru | Deputi Bidang Logistik dan Peralatan | Kementerian PU, TNI | 14 hari | Kartu 8.9 |
| R-RR-07 | Buka jalur dana jembatan dan SPAM desa | permanen | Usulan baru | Biro Hukum, Organisasi, dan Kerja Sama; Direktorat RR Infrastruktur | Kemendesa, Kemendagri, Kemenkeu | 2026–2027 | Perban 4/2024 Pasal 5 huruf e |
| R-RR-08 | Tulis pemicu peralihan truk ke pipa | darurat, sementara | Sudah ada, perlu dikembangkan | Deputi Bidang Penanganan Darurat | Kementerian PU, PDAM | 2026–2027 | Perka 7/2008; Temuan 6.2 |
| R-RR-09 | Ukur pemulihan air dalam jiwa terlayani | permanen | Usulan baru | Direktorat RR Infrastruktur | Kementerian PU | 2026–2027 | Prinsip 4 |
| R-RR-10 | Susun protokol sumur bor RR bersama Badan Geologi | darurat, sementara | Usulan baru | Direktorat RR Infrastruktur | Kementerian ESDM (Badan Geologi) | 2026–2027 | Temuan 7.1-7.3 |
| R-RR-11 | Satukan daftar sumur darurat semua pelaksana | sementara | Usulan baru | Pusdatinkom | Badan Geologi, TNI AD, Polri, Kementerian PU | 100 hari | Temuan 7.2 |
| R-RR-12 | Syaratkan sumber air sebelum lokasi huntap | permanen | Usulan baru | Direktorat RR Perumahan | Kementerian PKP, pemda | 2026–2027 | Temuan 9.4; pelajaran Haiyan |
| R-RR-13 | Evaluasi dampak program jembatan pedesaan | permanen | Usulan baru | Direktorat Pengembangan Strategi PB | TNI AD, Polri, Kementerian PU, Bappenas | 2028–2030 | Prinsip 9; RCT Rwanda |
| R-RR-14 | Uji coba paket air dan akses Sumatra | lintas | Usulan baru | Deputi Bidang RR | Satgas Sumatra, Kementerian PU | 2026–2027 | Q20 |
| R-RR-15 | Selaraskan Perban 6/2017, Perka 12/2010, indeks JDIH | lintas | Sudah ada, perlu dikembangkan | Biro Hukum, Organisasi, dan Kerja Sama | - (hanya pusat) | 2026–2027 | Riset A §8 |

**Keputusan yang diminta dari Kepala BNPB (kandidat):**

| Kode | Keputusan | Pilihan dan akibat |
|---|---|---|
| KD-R1 | Menjadikan waktu pulih air dan akses ukuran keberhasilan RR | (a) Tetapkan: Pusdatinkom menambah kolom DIBI dan baseline terbentuk 2027, sasaran masuk peninjauan Renas PB jalur berkala paling lambat 2027. (b) Tidak: pemulihan tetap diukur sebagai unit selesai, dan selisih antara aset nasional dan daerah tidak terlihat |
| KD-R2 | Mengusulkan jalur dana aset desa pascabencana | (a) Ubah Perban 4/2024 atau bentuk jalur dana desa dan Dana Bersama: jembatan dan SPAM desa masuk R3P berdana. (b) Tidak: aset desa bergantung pada APBDes dan program K/L di luar R3P |
| KD-R3 | Mengajukan pengikatan program jembatan TNI AD dan Polri ke R3P lewat rakor Kemenko PMK | (a) Ajukan: jembatan di daerah bencana tercatat di R3P, DIBI, dan aset daerah, dengan jadwal ganti permanen. (b) Tidak: jembatan berjalan di luar R3P; pemilik aset dan pemeliharaan tidak tertulis |
| KD-R4 | Menugaskan protokol sumur bor RR bersama Badan Geologi (100 hari) | (a) Tugaskan: sumur RR mengikuti zona konservasi dan uji mutu. (b) Tidak: sumur darurat dibangun tanpa daftar, uji mutu, dan pengelola |

**Keputusan 14 hari pertama (kandidat):** (1) penugasan Deputi Bidang RR sebagai pemimpin; (2) inventaris bailey, kit pipa, IPA mobile, dan truk tangki per Direktorat PD Wilayah terhadap kartu 8.9; (3) permintaan data ke Kementerian PU (SPAM dan jembatan Sumatra per kab, waktu pulih), Badan Geologi (CAT, zona, sumur 2021–2026), TNI AD dan Polri (daftar jembatan dan sumur di daerah bencana); (4) permintaan teks Keppres 1/2026 dan Inpres 18/2025 ke Biro Hukum; (5) penugasan Pusdatinkom merancang kolom DIBI baru.

---

## 7. Deck (sekitar 15 slide isi)

Bagian: A Beban, B Akses dan Air, C Skenario, D Kesenjangan, E Grand Design. Slide B1-B3 satu seri berchip AKSES, AIR PERPIPAAN, AIR TANAH (S12).

| No | Kode dan judul | Pesan | Jenis; medan judul | Visual dan sumber |
|---|---|---|---|---|
| - | Grand Design Rehabilitasi dan Rekonstruksi Air dan Akses Pascabencana 2026–2030 | Sampul | sampul | Subjudul |
| 1 | Pesan Kunci | Tesis, 3 keputusan, 5 temuan penopang | navigasi; deskriptif | Pita KD-R1 sampai KD-R3; kartu temuan berchip (S1, S2) |
| 2 | A1. Bencana alam merusak {a} jembatan pada 2018–2025, {b} di antaranya pada 2025 | Beban akses naik tajam | grafik; temuan | G1 jembatan rusak per tahun; 3 kartu angka (porsi banjir, Aceh, Sumbar); `dibi/rekap_nasional_tahunan.csv` |
| 3 | A2. Enam kejadian besar merusak {a} rumah dan memaksa relokasi bertahun-tahun | Preseden RR | tabel; temuan | Tabel preseden (L55); `dibi/kejadian_besar.csv`, riset E |
| 4 | A3. {a} provinsi menanggung separuh jembatan rusak 2018–2025 | Sebaran | peta; temuan | Peta bulatan per provinsi (G20); pil Aceh, Sumbar |
| 5 | B1. Satgas TNI AD menyelesaikan {a} jembatan, {b} titik di daerah bencana | Program akses yang ada | tabel; temuan | Chip AKSES. Tabel program per pemilik termasuk Jembatan Merah Putih Presisi; kotak status nama; [B1][B15][B25] |
| 6 | B2. SPAM Sumatra pulih {a}% dalam enam bulan, permanen baru {b} | Pemulihan air perpipaan | grafik; temuan | Chip AIR PERPIPAAN. G24 kurva Sumatra, Kobe, Tohoku; [D21][D22][D36] |
| 7 | B3. Satu sumur bor Badan Geologi melayani sekitar {a} jiwa, tetapi mutu air sumur darurat belum pernah dilaporkan | Air tanah sebagai jawaban dan risiko | panel; temuan | Chip AIR TANAH. Panel CAT dan zona, panel pelaksana sumur, panel mutu dan intrusi; [C15][C25][C26] |
| 8 | C1. Skenario Terburuk Beban RR per Jenis Bencana | Kartu ringkas tujuh jenis | tabel; deskriptif | Tabel skenario (S25) dari Bab 8 |
| 9 | C2. Matriks Kemungkinan dan Dampak RR | Penilaian terbanding | matriks; deskriptif | G17; panel "kemungkinan tidak dinilai" |
| 10 | D1. Hibah RR tidak menjangkau aset desa, lahan, dan pemeliharaan | Kesenjangan pendanaan | panel; temuan | Tiga kartu temuan; Perban 4/2024 Pasal 5 |
| 11 | D2. DIBI tidak mencatat kerusakan sistem air dan memisah jembatan menurut status jalan | Kesenjangan data | tabel; temuan | Tabel data hilang dan pemiliknya |
| 12 | E1. Kerangka Program dan Alur Tiga Lapis | Program berkode dan titik serah | grafik; deskriptif | G21 rantai tahap; kode A, W, G, H, D |
| 13 | E2. Tugas per Lapis untuk Akses, Air Perpipaan, dan Air Tanah | Siapa mengerjakan apa | matriks; deskriptif | Matriks mandat lembaga × lapis, kode K/P/R/I (S22) |
| 14 | E3. Rekomendasi dan Peta Jalan 2026–2030 | {a} rekomendasi, {b} dalam 100 hari | rekomendasi; deskriptif | Baris LANGKAH, RINCIAN, PENANGGUNG JAWAB (S28, S29) |
| 15 | Kesimpulan | 8 kesimpulan dan pita ARAHAN | navigasi; deskriptif | Kisi 4 × 2 (S32) |
| - | Terima kasih; Lampiran | Penutup dan pembatas | GELAP | - |

Lampiran deck: L1 rekap DIBI dan rekonsiliasi; L2 kartu skenario lengkap; L3 program jembatan rinci per pemilik; L4 SPAM per kejadian; L5 sumur bor per pelaksana; L6 biaya satuan berlabel; L7 instrumen hukum; L8 matriks mandat lengkap; L9 metode dan data yang belum ada; L10 daftar singkatan.

---

## 8. Lampiran DOCX

A Daftar perhatian RR per kab/kota dengan syarat (juga `.xlsx`); B Profil provinsi beban RR (rumah, jembatan, fasum) 2015–2025; C Kartu skenario lengkap per jenis dan kepekaan; D Rekap DIBI dan rekonsiliasi (termasuk angka sekunder berpenanda); E Kronologi dan matriks regulasi RR; F Program jembatan per pemilik (Satgas TNI AD, Polri, PU, bailey DSP) dan status nama; G Sumur bor dan sistem air per kejadian; H Biaya satuan berlabel dan tahun harga; I Katalog program per posisi bukti; J Register rekomendasi dan tabel silang dengan dua kajian saudara; K Penyelarasan dokumen BNPB; L Permintaan data; M Glosarium; N Atribusi foto.

## 9. Peta (web dan PNG)

Jembatan rusak per provinsi 2018–2025 (bulatan sebanding); jembatan rusak 2025 (bulatan); rumah RB per provinsi 2015–2025; daftar perhatian RR per kab (setelah turunan); CAT dan zona konservasi (bila poligon diperoleh); titik program jembatan di daerah bencana (bila daftar diperoleh dari TNI AD atau Polri); peta indeks studi kasus (L35).

---

## 10. Celah data yang diakui

| No | Celah | Bab | Penyajian tanpa mengarang |
|---|---|---|---|
| 1 | DIBI tanpa kolom SPAM dan waktu pulih | 3, 6, 9 | Angka per kejadian dari PU dan R3P; R-RR-01 |
| 2 | Jembatan DIBI mulai 2018, tanpa status jalan, tanpa tingkat kab di paket | 3, 4, 8 | Periode acuan 2018–2025; turunan per kab ditarik |
| 3 | Biaya per unit jembatan TNI AD dan Polri tidak diumumkan; dasar hukum Satgas tidak ditemukan | 5 | "Tidak diumumkan"; biaya PU sebagai pembanding berlabel |
| 4 | Stok bailey nasional dan data bailey Palu, Lombok, Cianjur, Semeru tidak ditemukan | 5, 10 | Permintaan data ke Kementerian PU dan TNI |
| 5 | PDNA/R3P dengan angka air terpisah (Palu, Lombok, Sumatra) tidak diperoleh; R3P Cianjur terbuka | 6, 8 | Buku Satgas PU dan rilis PU; R3P Cianjur |
| 6 | Biaya resmi pipa HDPE per km per diameter tidak ada | 6 | Rentang dari proyek PU berlabel estimasi-model |
| 7 | Kurva pulih air domestik tidak ada | 6 | Titik Sumatra 2025 (Februari, Mei 2026) dan pembanding Jepang |
| 8 | Poligon zona konservasi CAT, data sumur Badan Geologi 2021–2025, uji mutu sumur darurat tidak ditemukan | 7 | Tabel provinsi; permintaan data |
| 9 | Izin air tanah darurat tidak diatur; status PP 43/2008 belum pasti | 7, 9 | Ditulis sebagai kesenjangan |
| 10 | Keppres 1/2026 dan Inpres 18/2025 belum dibuka | 2, 9, 11 | Tidak mengutip isi; permintaan teks |
| 11 | Juklak 5/2024 stimulan rumah tidak ada di korpus | 2 | Besaran tidak dikutip |
| 12 | Angka Sumatra setelah Februari 2026 sebagian hanya di media | 4, 6 | Lampiran rekonsiliasi berpenanda sekunder |

## 11. Dokumen primer wajib dibuka sebelum naskah final

Keppres 1/2026 (JDIH Kemenko Infrastruktur); Inpres 18/2025; Juklak BNPB 5/2024; rencana induk RR Sumatra 2026–2028; R3P Aceh, Sumut, Sumbar; buku Satgas PU Lombok dan Cianjur (dibaca utuh); lampiran Permen ESDM 2/2017 (421 CAT); data sumur Badan Geologi 2019–2026; laman BNPB bailey Temanggung (403); rilis TNI AD dan Polri dengan daftar jembatan dan sumur; SE Menteri PU 02/SE/M/2010 (status keberlakuan); dokumen dasar Satgas Pembangunan Jembatan.

## 12. Penyesuaian yang wajib dibawa ke mesin dan paket (tidak dikerjakan di sesi ini)

- `tema.json` kosakata kajian: tambah `rehab` beserta daftar lampiran A-N; NASKAH-SPEK §2 `kajian` menerima `rehab`; `bangun/kontrak/naskah.py` ikut (pemilik: `mekanik-mesin`, gerbang: `penulis-gerbang`).
- Skrip workflow `naskah-kajian.js` dan `rakit-kajian.js` saat ini bercabang tetap `air`/`mitigasi` (catatan `pipa/PENYELARASAN.md`); perlu cabang `rehab`.
- Skrip turunan `bangun/rehab_angka.py` (stdlib) untuk angka §5 dari paket DIBI, dengan uji diri yang gagal bila jumlah 2018–2025 tidak sama dengan jumlah per tahun.
- Turunan baru: jembatan rusak per kab 2018–2025 (tarik DIBI), rumah RB per kab 2015–2025.
- Pemilik berkas `data/kajian-bnpb/rehab/**` di `scripts/agents/roster.json` belum ditetapkan (glob `data/**` saat ini jatuh ke `pipa-data`).
