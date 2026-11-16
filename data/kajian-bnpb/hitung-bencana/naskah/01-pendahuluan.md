# BAB 1 Pendahuluan

Status: Fase 1, draf untuk dibaca pemilik. Angka berasal dari bab dan lampiran lain kajian ini; rujukan bab ditulis di samping angkanya.


## 1.1 Latar

BNPB mencatat kejadian bencana di DIBI dengan dasar Perban BNPB Nomor 1 Tahun 2023 tentang Satu Data Bencana, yang ditetapkan 4 Januari 2023, dan Juklak BNPB Nomor 7 Tahun 2023 tentang Standar Data Kejadian dan Dampak Bencana, yang ditetapkan 29 Desember 2023. Perban 1/2023 Pasal 8 huruf c menyerahkan penetapan "kriteria kejadian bencana" kepada walidata bencana, yaitu Pusdatinkom. Juklak 7/2023 Bab II huruf B angka 3 (hlm. 7) mengisi penyerahan itu dengan enam kriteria ambang batas. Suatu kejadian dicatat bila penyebabnya salah satu jenis bencana dan memenuhi sedikitnya satu kriteria: 1 orang meninggal dunia, 50 orang terkena dampak, luka, atau mengungsi, 5 unit rumah dan/atau bangunan fasilitas publik rusak, 1 hektare lahan, permintaan pemerintah daerah untuk bantuan nasional, atau penentuan status keadaan darurat bencana.

Enam kriteria itu menjawab satu pertanyaan, yaitu kapan sesuatu masuk hitungan. Juklak tidak menjawab pertanyaan yang mendahuluinya, yaitu apa yang dihitung. Daftar pengertian Juklak 7/2023 Bab I huruf D memuat sepuluh istilah dan tidak memuat "kejadian bencana". Perka BNPB 8/2011 Pasal 1 angka 8 pernah mendefinisikannya sebagai peristiwa bencana yang dicatat menurut tanggal, lokasi, jenis, korban, dan kerusakan, tetapi peraturan itu sudah tidak berlaku menurut peta peraturan repo kita (`riset/REGULASI.md`, bagian 7.1). UU 24/2007 Pasal 1 angka 1 mendefinisikan bencana sebagai peristiwa atau rangkaian peristiwa, tanpa aturan tentang kapan rangkaian itu satu dan kapan dua.

Kekosongan itu terasa di tiga tempat kerja kita. Pusdatinkom menyajikan DIBI. Pusdalops menyusun logbook harian dan laporan untuk pimpinan dari kiriman BPBD. BPBD menulis laporan awal yang berubah tiap hari selama tanggap darurat. Ketiganya memakai kata "kejadian", tetapi bilangan yang keluar bergantung pada siapa yang menghitung dan aturan apa yang dipakai. Ambil contoh api menyatu [ILUSTRASI]. Karhutla seluas 10 ha dan karhutla seluas 20 ha berjarak 1 km, lalu beberapa jam kemudian menyatu menjadi satu api. Hitungan bisa menjadi satu kejadian atau dua, dan luasnya bisa 30 ha atau luas akhir setelah menyatu. Juklak tidak memberi jawaban, dan kedua jawaban dapat dibela.

Persoalannya lebih luas daripada api menyatu. Dari enam kriteria Juklak 7/2023, tidak satu pun menjawab apa yang dihitung, dan kita belum memiliki kerangka utuh tentang cara bencana dihitung (apa itu satu kejadian), diklasifikasikan (kapan masuk hitungan dan seberapa besar), diukur dampaknya (korban, kerusakan, kerugian, rupiah), dan disajikan. Karena itu langkah pertama kajian ini adalah menguraikan kebingungan menjadi pertanyaan yang terpisah dan bisa dijawab, baru kemudian menjawabnya.

Bedah kriteria dan katalog paradoks menghasilkan lima temuan angka yang menjadi pangkal bab-bab berikut.

1. Pada 28 hari data hotspot VIIRS (15 Oktober sampai 11 November 2026, 295.488 deteksi), jumlah kejadian karhutla berkisar 27.322 sampai 61.138, berubah 2,2 kali lipat hanya karena pilihan jarak dan time window penggabungan (Bab 5.3).
2. Logbook harian Pusdalops Januari sampai Oktober 2026 menghasilkan 3.860 kejadian dengan satu deduplication key dan 2.809 dengan kunci lain (Bab 5.3).
3. Dari 4.185 baris DIBI dalam 12 bulan sampai 12 November 2026, 1.903 baris (45,5 persen) memenuhi sedikitnya satu dari K1 sampai K3; K2 menjadi penentu tunggal pada 51,1 persen baris yang lolos (Bab 4.3).
4. Satu persen baris DIBI teratas memikul 85,5 persen korban meninggal dalam periode yang sama, sehingga jumlah kejadian tidak menggambarkan besar dampak (Bab 4.4).
5. Katalog kajian ini memuat 65 paradoks penghitungan, dan 239 hubungan ketergantungan di antaranya berputar sehingga tidak ada satu paradoks yang dapat dijawab sendirian (Bab 5.4).

## 1.2 Rumusan masalah

Masalah kajian dirumuskan dalam enam butir yang masing-masing menjadi pangkal satu atau lebih pertanyaan penelitian pada 1.4.

1. Satuan hitung. Juklak 7/2023 tidak mendefinisikan satu kejadian, tidak mengatur penggabungan dan pemecahan, dan hanya memberi tiga aturan hitung (tipe utama, lintas wilayah, dua lokasi satu hari). Jumlah kejadian karena itu berbeda menurut aturan yang dipakai pencatat.
2. Ambang masuk. Enam kriteria bekerja dengan logika ATAU, tanpa asal-usul angka yang dapat ditelusuri, dan dua di antaranya (K5, K6) mengukur respons pemerintah, bukan dampak.
3. Ukuran yang dicampur. Besaran bahaya (magnitudo, luas, tinggi muka air), dampak (korban, kerusakan), kerugian rupiah, dan respons (status, permintaan bantuan) hidup dalam satu formulir tanpa pemisahan yang tegas.
4. Skala keparahan. Juklak tidak membedakan bencana ringan, sedang, besar, dan katastrofik. Pertanyaan "gempa skala berapa itu bencana besar" tidak punya jawaban resmi.
5. Penyajian. Jumlah kejadian, tren, dan dampak disajikan tanpa aturan tentang pelaporan yang membaik, long tail, angka antarsumber, dan versi angka.
6. Penerapan. Perubahan apa pun pada definisi harus sampai ke formulir, DIBI, logbook, dan laporan harian, dan beban kerja pencatat belum pernah dihitung.

## 1.3 Tujuan

Kajian ini mempunyai enam tujuan.

- T1. Menguraikan persoalan penghitungan bencana menjadi pertanyaan terpisah yang dapat dijawab.
- T2. Menyusun katalog paradoks penghitungan bencana dan menjawab tiap paradoks.
- T3. Menilai enam kriteria Juklak 7/2023 dengan data, tidak hanya dengan pendapat.
- T4. Merancang kerangka tiga lapis (unit kejadian, ambang masuk, skala keparahan), dilengkapi aturan pengukuran dampak dan kerugian serta aturan penyajian.
- T5. Membuktikan bahwa kerangka itu konsisten, yaitu menjawab seluruh katalog paradoks tanpa logika yang saling bertentangan.
- T6. Menghasilkan usulan revisi Juklak 7/2023 pasal per pasal dan langkah penerapannya di DIBI dan Satu Data Bencana.

## 1.4 Pertanyaan penelitian

Tujuh pertanyaan menurunkan tujuan di atas. Tiap pertanyaan dijawab pada bab yang disebut di kolom terakhir.

Tabel 1.1. Pertanyaan penelitian dan tempat jawabannya

| Kode | Pertanyaan | Tujuan | Bab |
| --- | --- | --- | --- |
| RQ1 | Unit kejadian. Apa definisi satu kejadian bencana, termasuk batas ruang dan waktu, penggabungan dan pemecahan, kejadian berantai dan majemuk, lintas wilayah administrasi, bencana lambat, dan identitas kejadian (kode induk dan anak) | T2, T4 | 5, 6 |
| RQ2 | Ambang masuk. Seberapa layak enam kriteria Juklak 7/2023, ditinjau dari asal-usul, kalibrasi angka, logika ATAU, kecocokan per jenis bencana, kriteria administratif, kekaburan definisi, dan urutan penerapan terhadap penggabungan kejadian | T3, T4 | 4, 6 |
| RQ3 | Apa yang diukur. Bagaimana bahaya, intensitas, paparan, dampak, kerugian, dan respons dipisahkan, dan mengapa besaran bahaya bukan ukuran besar-kecilnya bencana | T4 | 2, 6 |
| RQ4 | Dampak dan kerugian. Bagaimana meninggal, hilang, luka, mengungsi, dan terdampak didefinisikan secara operasional, bagaimana tingkat kerusakan dan kerugian diukur dan diuangkan, dan bagaimana double counting dihindari | T4 | 5, 6 |
| RQ5 | Skala keparahan. Apa definisi bencana ringan, sedang, besar, dan katastrofik menurut ambang absolut, ukuran relatif terhadap kapasitas daerah, tingkat status darurat, atau indeks gabungan, dan skala khusus apa yang berlaku per bahaya | T4, T5 | 2, 6 |
| RQ6 | Penyajian. Bagaimana jumlah kejadian dan dampak disajikan tanpa menyesatkan | T4 | 8 |
| RQ7 | Penerapan. Apa yang harus berubah di DIBI, logbook Pusdalops, laporan harian, dan Satu Data Bencana, dan berapa beban kerja tambahannya | T6 | 9 |

Sumber: `PROMPT-KAJIAN.md`, bagian 2 dan 3.

## 1.5 Manfaat

Kajian ini disusun untuk lima pemakai di lingkungan kita.

- Pusdatinkom sebagai walidata memperoleh dasar tertulis untuk menetapkan kriteria kejadian bencana, nomor induk kejadian, dan aturan versi angka, yaitu hal yang Perban 1/2023 Pasal 8 huruf c serahkan kepadanya tanpa rincian. Katalog paradoks dan matriks uji menjadi daftar periksa saat Pusdatinkom memutuskan dua laporan sebagai satu kejadian.
- Pusdalops memperoleh pohon keputusan untuk operator (Lampiran D) yang bisa dipakai tanpa pelatihan statistik, dan deduplication key logbook yang diuji pada data 2026.
- BPBD memperoleh aturan yang sama untuk semua daerah, termasuk daerah yang tidak menetapkan status darurat, sehingga pencatatan kejadian tidak bergantung pada kapasitas administrasi daerah (P-15, Bab 4.6).
- Penyusun peraturan memperoleh usulan revisi Juklak 7/2023 pasal per pasal beserta paradoks yang dijawab tiap usulan, dan daftar hal yang tidak diatur (`riset/REGULASI.md`, bagian 9).
- Pimpinan memperoleh aturan penyajian yang menyebut satuan di setiap angka, sehingga kenaikan jumlah kejadian tidak dibaca sebagai kenaikan bahaya sebelum pelaporan yang membaik disingkirkan (Bab 8).

## 1.6 Batas kajian

Batas kajian ditetapkan supaya pembaca tahu angka mana yang dapat dipegang.

1. **Periode data.** Uji kriteria memakai tarikan DIBI 1 Januari 2024 sampai 12 November 2026 (15.974 baris). Data 2024 tidak lengkap (3.752 baris, dibanding 8.946 pada 2025), sehingga angka utama memakai 12 bulan terakhir, 13 November 2025 sampai 12 November 2026 (4.185 baris). Uji logbook memakai logbook harian Pusdalops 1 Januari sampai 29 Oktober 2026 (9.329 baris dari 302 hari laporan). Uji penggabungan api memakai 28 hari hotspot VIIRS, 15 Oktober sampai 11 November 2026. Arsip logbook 2011 sampai 1 November 2026 (56.685 kejadian) dipakai terbatas.
2. **DIBI hanya menguji tiga kriteria.** DIBI tidak memiliki kolom luas lahan, permintaan bantuan, dan status darurat, sehingga K4, K5, dan K6 tidak dapat diuji langsung (Bab 4.3.1). Tarikan DIBI berasal dari dasbor publik, bukan dari antarmuka resmi, dan angkanya belum dikonfirmasi Pusdatinkom (Q-12).
3. **Teks Juklak 7/2023 berasal dari salinan tidak resmi.** Kajian membaca PDF yang diunggah UNFPA Indonesia, bukan berkas JDIH BNPB. Halaman 1, 10, 26, 52, dan 53 berupa gambar dan belum terbaca, termasuk latar belakang penyusunan dan lanjutan definisi tingkat kerusakan (Q-02). Semua kutipan Juklak masuk daftar periksa sampai salinan resmi diperoleh.
4. **Belum ada wawancara.** Tidak ada wawancara yang sudah terlaksana. Lampiran E memuat daftar pertanyaan untuk Pusdalops, BPBD, dan Pusdatinkom, dan jawabannya tidak dikarang (Q-11). Asal-usul angka ambang tetap berstatus tidak ditemukan sampai Pusdatinkom menjawab.
5. **Angka logbook diurai dari teks bebas.** Meninggal, terdampak, dan hektare di logbook diambil dengan pola dari kalimat laporan. Hektare terbukti terinflasi oleh salah urai dan tidak dipakai untuk menguji K4 (`KEPUTUSAN.md`, daftar periksa butir 4).
6. **Bencana nonalam dan sosial hanya disinggung.** Juklak 7/2023 memuat 13 jenis ancaman, termasuk epidemi, kegagalan teknologi, dan konflik sosial. Kajian ini menguji ambang pada bencana alam dan kebakaran permukiman dan menyinggung jenis lain sebagai paradoks (P-47, Q-42, Q-43). Ambang epidemi dan konflik tidak dikalibrasi.
7. **Tidak ada pembanding respons.** Daftar surat keputusan status darurat dan dana siap pakai per kejadian belum tersedia (Q-35), sehingga benar-salahnya ambang terhadap kebutuhan respons belum bisa diuji (Bab 4.3.4).
8. **Hotspot bukan luas terbakar.** Simulasi penggabungan api menghitung deteksi satelit. Satu piksel VIIRS sudah mewakili 14,06 ha, jadi hasilnya menunjukkan kepekaan aturan, bukan luas kejadian sebenarnya (Bab 4.7).

## 1.7 Sistematika

Dokumen ini terdiri atas sepuluh bab, penutup, daftar pustaka, dan tujuh lampiran.

Tabel 1.2. Susunan dokumen

| Bagian | Isi |
| --- | --- |
| Ringkasan Eksekutif | Satu kalimat temuan, empat angka kunci, temuan utama, dan keputusan yang dimohon |
| Bab 1 Pendahuluan | Latar, masalah, tujuan, pertanyaan penelitian, manfaat, batas kajian |
| Bab 2 Kerangka Konsep dan Tinjauan Pustaka | Bahaya, paparan, kerentanan, kapasitas; praktik pencatatan internasional dan negara; posisi Indonesia |
| Bab 3 Metode | Pendekatan dua sisi (paradoks dan kerangka), sumber data, simulasi, uji kerangka, keterbatasan data |
| Bab 4 Bedah Kriteria Ambang Batas Juklak 7/2023 | Asal-usul, kalibrasi, logika ATAU, kecocokan per jenis, kriteria administratif, kekaburan definisi, vonis per kriteria |
| Bab 5 Paradoks Penghitungan Bencana | Tujuh kelompok (A sampai G), paradoks inti, dependency map |
| Bab 6 Kerangka Tiga Lapis | L1, L2, L3, aturan dampak dan kerugian (D), aturan penyajian (S), masing-masing dengan pohon keputusan |
| Bab 7 Uji Kerangka | Matriks paradoks terhadap lapisan, uji konsistensi, uji ulang data, uji adversarial |
| Bab 8 Penyajian Data Bencana | Aturan, contoh tabel dan grafik baku, contoh yang dilarang |
| Bab 9 Rekomendasi dan Usulan Revisi Juklak | Tabel pasal per pasal, perubahan DIBI dan formulir, tahapan penerapan, rencana aksi |
| Bab 10 Keterbatasan dan Agenda Riset | Keterbatasan data dan metode, agenda lanjutan |
| Penutup dan Daftar Pustaka | |
| Lampiran A sampai G | Katalog paradoks lengkap; matriks uji; tabel perbandingan internasional; pohon keputusan untuk operator; daftar pertanyaan wawancara; glosarium; sumber data dan catatan metode |

Sumber: `PROMPT-KAJIAN.md`, bagian 9.

Kajian dijalankan dalam tiga fase. Fase 1 sudah menghasilkan Bab 4, katalog paradoks, dependency map, dan daftar wawancara. Pada Fase 2 kerangka dirancang dan diuji, lalu pekerjaan berhenti di pertanyaan terbuka yang menunggu keputusan pemilik. Rekomendasi dan dokumen lengkap baru ditulis di Fase 3. Pertanyaan terbuka dikumpulkan di `KEPUTUSAN.md` beserta bawaan sementara yang dipakai naskah sampai pemilik menjawab.
