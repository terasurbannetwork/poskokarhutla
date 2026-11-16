# BAB 5 Paradoks Penghitungan Bencana

Status: Fase 1, draf untuk dibaca pemilik. Bab ini merangkum katalog dan dependency map.
Bedah lengkap tiap paradoks dengan format seragam (kasus, mengapa paradoks, jawaban aturan saat ini,
jawaban praktik dunia, opsi penyelesaian, uji empiris, rekomendasi) ada di Lampiran A, satu berkas
per kelompok: `lampiran-a-A.md` sampai `lampiran-a-G.md`. Delapan paradoks inti dijabarkan di subbab 5.5, dan
semua paradoks diringkas di Tabel 5.4.


## 5.1 Cara katalog disusun

Paradoks di sini adalah kasus penghitungan yang jawabannya berbeda tergantung siapa yang menghitung
dan aturan apa yang dipakai. Katalog berisi 65 paradoks:

- 47 paradoks awal dari rancangan kajian (P-01 sampai P-47), semuanya dipertahankan;
- 18 paradoks tambahan (P-48 sampai P-65) yang muncul dari data repo dan dokumen kerja kita sendiri:
  pecahan kejadian di DIBI, baris tanpa angka dampak, jenis gabungan "banjir dan tanah longsor",
  evakuasi preventif, kematian yang bukan akibat bahaya, rumah terendam, dua tangga ambang di
  Pusdalops, status darurat payung dan status yang mendahului kejadian, sumber angka luas, kejadian
  di laut, bahaya dari luar negeri, respons sebagai ukuran, pemekaran wilayah, hari tanpa laporan,
  dan banyaknya sistem identitas kejadian.

Bahan uji empiris yang dipakai di seluruh katalog:

| Bahan | Isi | Periode |
| --- | --- | --- |
| DIBI, tarikan dasbor publik 12 November 2026 | 15.974 baris (hari, kabupaten, jenis) tanpa penggabungan | 1 Januari 2024 sampai 12 November 2026 |
| Logbook harian Pusdalops (DOCX) | 9.329 baris harian mentah dari 302 hari laporan | 1 Januari sampai 29 Oktober 2026 |
| Arsip logbook Pusdalops (CSV) | 56.685 kejadian | 2011 sampai 1 November 2026 |
| Hotspot VIIRS (FIRMS) | 295.488 deteksi keyakinan nominal dan tinggi di daratan Indonesia | 15 Oktober sampai 11 November 2026 |
| Regulasi | Juklak 7/2023, Perban 1/2023, UU 24/2007, PP 21/2008, Perpres 17/2018, Perban 4/2020, Perka 8/2011, 7/2012, 15/2011, panduan Pusdalops 2025 | Teks asli, lihat `riset/REGULASI.md` |
| Praktik dunia | EM-DAT, DesInventar, Sendai, GLIDE, PAGER, GDACS, basis data kebakaran, Jepang, Amerika Serikat, Filipina, India | Sumber dibuka, lihat `riset/PUSTAKA.md` |

Skrip dan angka mentah ada di `analisis/` dan `analisis/hasil/`.

## 5.2 Kelompok paradoks

Tabel 5.1. Kelompok paradoks

| Kelompok | Pertanyaan pokok | Jumlah | Kode |
| --- | --- | ---: | --- |
| A Identitas kejadian | Apa yang dihitung sebagai satu kejadian | 18 | P-01 sampai P-12, P-38, P-39, P-48, P-50, P-56, P-64 |
| B Ambang masuk | Kapan sesuatu masuk hitungan | 14 | P-13 sampai P-20, P-40, P-51, P-57, P-58, P-62, P-63 |
| C Ukuran dan korban | Apa yang diukur dan bagaimana | 13 | P-21 sampai P-27, P-41, P-49, P-52, P-53, P-54, P-60 |
| D Kerugian dan uang | Bagaimana dampak diuangkan | 4 | P-28 sampai P-31 |
| E Klasifikasi besar, sedang, kecil | Seberapa besar | 5 | P-32, P-33, P-34, P-42, P-65 |
| F Penyajian | Bagaimana angka dibaca tanpa menyesatkan | 7 | P-35, P-36, P-37, P-43, P-44, P-55, P-61 |
| G Kelembagaan | Siapa yang memutuskan | 4 | P-45, P-46, P-47, P-59 |
| Jumlah | | 65 | |

## 5.3 Temuan empiris yang paling menentukan

Delapan angka berikut paling sering dirujuk oleh paradoks lain. Semuanya dari data nyata; sumber dan
periode di Lampiran A dan berkas riset.

1. **Definisi menentukan jumlah.** Pada data hotspot 28 hari (15 Oktober sampai 11 November
   2026), jumlah kejadian karhutla berkisar 27.322 sampai 61.138, berubah 2,2 kali lipat hanya karena
   pilihan jarak gabung (0,5, 1, atau 2 km) dan time window (24 atau 72 jam). Bila jendela 6 jam
   ikut dihitung, rentangnya 3,4 kali lipat (sampai 94.091), tetapi jendela 6 jam lebih pendek
   daripada jarak antarlintasan satelit sehingga memecah api yang sama. Penggabungan dua
   api yang bermakna (dua kelompok yang masing-masing paling sedikit 3 piksel) hanya 0,28
   persen kejadian pada aturan acuan 1 km dan 24 jam. Paradoks api menyatu nyata, tetapi jarang;
   yang besar pengaruhnya adalah aturan gabung itu sendiri (P-01 sampai P-04).
2. **Deduplication key menentukan jumlah.** Logbook harian Pusdalops Januari sampai Oktober
   2026 menghasilkan 3.860 kejadian dengan kunci (jenis, provinsi, kabupaten, tanggal kejadian), 2.809
   dengan kunci tanpa tanggal dan jeda 7 hari, 2.913 dengan kunci tanpa kabupaten, dan 8.715 tanpa
   deduplication. Sebanyak 36,9 persen kejadian yang dilaporkan beberapa hari menulis tanggal
   kejadian yang berbeda antarhari (P-38, P-39).
3. **Menjumlah angka kumulatif menggelembungkan dampak 8 sampai 30 kali.** Logbook menulis angka
   kumulatif. Menjumlah lintas hari memberi 12.523 meninggal, sedangkan nilai terbesar per kejadian
   memberi 609 (P-41).
4. **Satu kejadian, tiga cara hitung.** Juklak menghitung kejadian lintas kabupaten satu kali di
   tingkat nasional dan satu kali per kabupaten di tingkat kabupaten. DIBI memuat 643 baris (4,0
   persen) dengan jumlah kejadian pecahan; pada 220 dari 286 kelompok pecahannya berjumlah tepat
   satu, sehingga DIBI tampaknya membagi satu kejadian ke kabupaten terdampak (gempa NTT 15 Agustus
   2026 tercatat 0,091 per kabupaten di 11 kabupaten). Arti resmi pecahan ini belum dikonfirmasi
   Pusdatinkom. Aturan lama Perka 8/2011 menghitung satu (P-05,
   P-48).
5. **Separuh baris yang lolos ditentukan oleh "terdampak".** K2 adalah penentu tunggal untuk 51,1 persen baris
   DIBI yang lolos ambang (12 bulan sampai 12 November 2026), dan definisi terdampak berbeda antara
   Juklak 7/2023 dan Juklak 3/2022 (P-25, P-53).
6. **Satelit dan laporan berpisah.** Kalimantan Tengah memegang 29 persen hotspot nasional 5
   sampai 12 Oktober 2026 dan berstatus tanggap darurat karhutla, tetapi DIBI tidak memuat satu pun
   baris karhutla Kalimantan Tengah sejak September 2026 (P-40, P-62).
7. **Penanda bencana DIBI berubah di 2025.** Penanda `is_bencana` hampir tidak dipakai pada 2024 (93
   dari 3.752 baris bertanda bukan bencana), lalu dipakai pada 41 persen baris 2025, dan di luar
   karhutla sama dengan hasil uji K1 sampai K3 pada 93,7 sampai 94,5 persen baris. Ini petunjuk kuat
   bahwa ambang Juklak baru diterapkan penuh sejak 2025, tetapi belum dikonfirmasi Pusdatinkom.
   Sampai dikonfirmasi, deret DIBI sebelum dan sesudah 2025 diperlakukan tidak sebanding (P-35).
8. **Long tail.** 1 persen baris DIBI teratas memikul 85,5 persen korban meninggal dalam 12 bulan,
   dan 94,8 persen baris tidak memuat korban meninggal (P-37).

## 5.4 Dependency map

Tiap paradoks di Lampiran A menyebut paradoks yang menentukan jawabannya ("Bergantung pada") dan
paradoks yang jawabannya ia tentukan ("Menentukan"). Dari 65 paradoks terbentuk 239 hubungan arah
(`analisis/hasil/peta_ketergantungan.json`). Graf ini berputar: hampir semua paradoks bisa dicapai
dari paradoks lain lewat beberapa langkah. Itu sendiri temuan, karena berarti kebingungan
penghitungan bencana tidak bisa diurai satu per satu; satu keputusan selalu menggeser beberapa
jawaban lain.

Untuk memilih paradoks inti dipakai dua ukuran dari 239 hubungan itu: jumlah paradoks yang ditentukan langsung, dan skor
PageRank pada graf yang dibalik (paradoks yang menjadi hulu bagi paradoks yang juga hulu mendapat
skor lebih tinggi).

Tabel 5.2. Paradoks dengan pengaruh terbesar

| Kode | Nama | Menentukan langsung | Skor hulu (persen) |
| --- | --- | ---: | ---: |
| P-45 | Siapa berwenang menyatakan satu kejadian | 15 | 10,1 |
| P-01 | Menyatu | 11 | 5,0 |
| P-60 | Sumber angka luas | 7 | 4,4 |
| P-12 | Titik lawan wilayah | 5 | 3,3 |
| P-38 | Tulis ulang harian | 6 | 3,1 |
| P-48 | Pecahan kejadian | 8 | 2,9 |
| P-39 | Tanggal kejadian lawan tanggal laporan | 8 | 2,8 |
| P-05 | Lintas batas | 7 | 2,6 |

Sumber: `analisis/hasil/peta_ketergantungan.json`, dihitung dari baris "Bergantung pada" dan
"Menentukan" di Lampiran A.

Hubungan di graf ini ditetapkan per kelompok paradoks, sehingga hubungan antarkelompok cenderung
kurang tercatat. Contohnya, paradoks skala (kelompok E) jarang menulis bahwa mereka bergantung pada
P-21, padahal pertanyaan "gempa skala berapa itu besar" tidak bisa dijawab sebelum diputuskan bahwa
magnitudo bukan ukuran bencana. Karena itu paradoks inti dipilih dari peringkat graf ditambah
penilaian atas lapisan kerangka yang dibangun di Bab 6.

## 5.5 Paradoks inti

Tabel 5.3. Delapan paradoks inti dan lapisan kerangka yang dijawabnya

| No | Paradoks inti | Lapisan | Mengapa inti | Paradoks yang ikut terjawab | Pertanyaan terbuka |
| --- | --- | --- | --- | --- | --- |
| 1 | P-45 Siapa berwenang menyatakan satu kejadian | Tata kelola | Tanpa pemutus, setiap aturan gabung hanya saran. Peringkat graf tertinggi. | P-01, P-05, P-07, P-09, P-27, P-31, P-38, P-46, P-48, P-59 | Q-08, Q-40 |
| 2 | P-01 Menyatu (aturan gabung ruang dan waktu) | L1 | Mewakili seluruh aturan identitas kejadian berbentuk wilayah: terpecah, berpindah, menyala lagi, berulang, susulan. | P-02, P-03, P-04, P-06, P-08, P-13, P-14, P-43 | Q-06, Q-09, Q-15 |
| 3 | P-38 dan P-39 Kunci dan tanggal kejadian | L1 | Menentukan berapa kejadian yang lahir dari laporan harian, dan di hari, bulan, tahun mana kejadian dihitung. | P-11, P-27, P-35, P-41, P-42, P-61 | Q-13, Q-19 |
| 4 | P-05 dan P-48 Lintas wilayah dan pecahan | L1 dan S | Menentukan satuan "jumlah kejadian" di tiap tingkat pemerintahan. | P-14, P-32, P-33, P-36, P-55, P-56 | Q-03 |
| 5 | P-15 Melingkar (kriteria administratif) | L2 | Menentukan apakah respons boleh menjadi pintu masuk; menyangkut keadilan antardaerah. | P-16, P-33, P-62, P-63, P-65 | Q-05 |
| 6 | P-60 Sumber angka luas | L2 dan D | Kriteria luas tidak bisa diuji tanpa sumber luas yang sah; satu piksel satelit sudah 14 ha. | P-12, P-13, P-20, P-40, P-44 | Q-04, Q-29 |
| 7 | P-27 Angka bergerak (versi angka) | D | Ambang harus diterapkan pada versi angka yang sah. 12,7 persen kejadian logbook baru memenuhi ambang di laporan susulan. | P-41, P-42, P-46, P-31 | Q-07, Q-41 |
| 8 | P-21 Magnitudo lawan dampak | L3 | Memisahkan ukuran bahaya dari ukuran bencana; prasyarat skala keparahan. | P-18, P-19, P-22, P-34, P-65 | Q-34 |

Urutan keputusan yang dianjurkan untuk kerangka (Bab 6): P-45 lebih dulu (siapa memutuskan), lalu P-01, P-38,
dan P-05 (apa yang dihitung), lalu P-27 (versi angka mana), baru P-15 dan P-60 (ambang), dan
terakhir P-21 (skala). Urutan ini mengikuti temuan Bab 4.8: ambang hanya bermakna bila unit kejadian
dan versi angka sudah ditetapkan.

## 5.6 Ringkasan rekomendasi sementara per paradoks

Tabel 5.4. Rekomendasi sementara (rinciannya di Lampiran A)

| Kode | Nama | Rekomendasi sementara |
| --- | --- | --- |
| P-01 | Menyatu | Gabung transitif dengan aturan kluster sistem kita; luas dilaporkan sebagai luas gabungan akhir (Q-06) |
| P-02 | Terpecah | Tidak dipecah karena bentuk; dipecah hanya bila semua bagian padam lebih lama dari jeda Q-09 |
| P-03 | Api berpindah | Tetap satu kejadian dengan penanda segmen wilayah dan waktu |
| P-04 | Menyala lagi | Kejadian baru setelah 7 hari tanpa laporan aktif; hari tertutup awan tidak dihitung (Q-09) |
| P-05 | Lintas batas | Satu kode induk dibawa semua baris kabupaten; dua angka bernama berbeda (Q-03) |
| P-06 | Berulang | Kejadian baru setelah 7 hari tanpa laporan aktif (Q-09) |
| P-07 | Berantai | Induk dan anak per bahaya; korban dicatat sekali pada penyebab langsung (Q-10) |
| P-08 | Susulan | Episode induk selama dalam jeda; kejadian baru bila terpisah ruang dan waktu (Q-15) |
| P-09 | Majemuk | Induk dengan anak per bahaya; tipe utama menurut dampak terbesar (Q-14) |
| P-10 | Lambat | Kekeringan per zona musim BMKG dan periode kemarau; asap sebagai anak karhutla; abrasi per tahun (Q-16) |
| P-11 | Lintas tahun | Tahun tanggal mulai dengan penanda lintas tahun (Q-13) |
| P-12 | Titik lawan wilayah | Satu titik perwakilan, daftar kabupaten, dan sumber luas per kejadian |
| P-13 | Sorites | Ambang diterapkan sesudah kejadian dibentuk; angka luas lewat Q-04 |
| P-14 | Iris salami | Ambang diuji pada kejadian utuh; dua angka sesuai Q-03 |
| P-15 | Melingkar | Kriteria e dan f menjadi penanda; jalur administratif hanya SK tanggap darurat per kejadian (Q-05) |
| P-16 | Insentif | Pertahankan ambang, tambah status verifikasi dan versi angka; data belum menunjukkan penggelembungan |
| P-17 | Normalisasi | Ambang absolut untuk masuk; angka per 100.000 penduduk disajikan berdampingan, persen penduduk untuk penaik kelas (Q-20) |
| P-18 | Bahaya tanpa bencana | Bahaya tanpa dampak dicatat di daftar terpisah, tidak dijumlah |
| P-19 | Bencana tanpa bahaya ekstrem | Dampak tetap dasar masuk; pemicu dicatat sebagai atribut |
| P-20 | Lahan dicampur | Ambang per jenis lahan dan bahaya dengan sumber luas wajib (Q-04) |
| P-21 | Magnitudo lawan dampak | Magnitudo hanya atribut bahaya, bukan ukuran bencana atau ambang |
| P-22 | Skala yang dipakai | Jenis skala dan sumber wajib dicatat di samping nilai |
| P-23 | Kematian tak langsung | K1 hanya kematian langsung; kematian tak langsung di kolom terpisah (Q-26) |
| P-24 | Hilang | Dicatat terpisah, menjadi diduga meninggal saat pencarian ditutup (Q-24) |
| P-25 | Double counting | Satu orang satu kategori; M2 menjumlah orang unik antarkategori (Q-25) |
| P-26 | Tingkat kerusakan | Rumah setara rusak berat RB + 0,5 RS + 0,25 RR (Q-27) |
| P-27 | Angka bergerak | Versi angka per Q-07; angka di laporan pimpinan menyebut nomor versi dan tanggal |
| P-28 | Bias kekayaan | Rupiah bukan ambang dan bukan skala; keterangan berasio PDRB atau APBD (Q-30) |
| P-29 | Kerusakan lawan kerugian | Dua kolom terpisah mengikuti Perka 15/2011 (Q-31) |
| P-30 | Inflasi | Tahun harga dicatat; lintas tahun dalam harga konstan (Q-32) |
| P-31 | Banyak penghitung | Satu angka resmi per versi dari walidata; sumber lain berdampingan, tidak dijumlah (Q-33) |
| P-32 | Kecil-kecil jadi bukit | Label ekstensif dan intensif dihitung pada unit kejadian (Q-36) |
| P-33 | Besar menurut siapa | Angka mutlak dan persen penduduk berdampingan (Q-34) |
| P-34 | Gempa skala berapa | Tidak ada magnitudo yang otomatis berarti bencana besar; magnitudo memicu verifikasi cepat |
| P-35 | Spurious trend | Tren hanya pada deret sebanding, series break 2025 ditandai |
| P-36 | Simpson | Tren nasional terbit bersama jumlah provinsi yang berlawanan arah; contoh nyata belum ditemukan |
| P-37 | Long tail | Rata-rata tidak boleh berdiri sendiri pada tabel dampak |
| P-38 | Tulis ulang harian | KIB dibawa sejak laporan pertama sebagai tujuan; kunci V1g dipakai sementara (Q-19) |
| P-39 | Tanggal kejadian lawan laporan | Tanggal kejadian untuk hitungan, tanggal laporan sebagai metadata, rilis berversi |
| P-40 | Satelit lawan laporan | Deteksi satelit belum terverifikasi di daftar terpisah (Q-22) |
| P-41 | Angka kumulatif | Menjumlah antarhari dilarang; aturan per variabel mengikuti Q-07 |
| P-42 | Naik kelas | Kelas mengikuti versi angka yang sah (Q-07) |
| P-43 | Hotspot lawan lokasi unik | Tiap angka hotspot memuat nama definisi dan daftar satelit (Q-39) |
| P-44 | Pergantian alat ukur | Simpan sensor aktif per hari; deret bertanda series break 1 November 2026 |
| P-45 | Kewenangan | Pusdatinkom memutuskan, BPBD mengusulkan; aturan tertulis boleh diterapkan mesin dengan jejak dan dapat dibatalkan (Q-08) |
| P-46 | Koreksi setelah terbit | Rilis berversi dan tabel angka terbit lawan angka kini (Q-41) |
| P-47 | Nonalam dan sosial | Pintu masuk penetapan otoritas sektor, tanpa ambang K2 (Q-42) |
| P-48 | Pecahan kejadian | Pecahan tidak dipakai sebagai satuan penyajian (Q-03) |
| P-49 | Kosong lawan nol | Formulir membedakan nilai, nihil, dan belum didata (Q-28) |
| P-50 | Jenis gabungan | Jenis dari 13 kode baku; jenis terkait di kolom terpisah |
| P-51 | Evakuasi preventif | Dicatat terpisah dari K2; dampaknya pada jumlah kejadian kecil (21 dari 973 baris) |
| P-52 | Kematian bukan akibat bahaya | Atribusi diusulkan BPBD dan diputuskan Pusdatinkom (Q-26) |
| P-53 | Terancam lawan terdampak | Terancam dicatat terpisah, tidak masuk K2 |
| P-54 | Rumah terendam | Tidak memicu K3; penghuninya dicatat sebagai terdampak |
| P-55 | Pemekaran wilayah | Simpan kode wilayah saat kejadian dan batas terkini (Q-37) |
| P-56 | Kejadian tanpa wilayah darat | Wilayah terdampak terdekat sesuai Juklak; titik laut disimpan (Q-17) |
| P-57 | Penyebab manusia | Jenis menurut bahaya, penyebab sebagai atribut (Q-23) |
| P-58 | Dua ambang | Disatukan: M1 sampai M6 untuk masuk, kelas Sedang ke atas untuk laporan menonjol (Q-21) |
| P-59 | Banyak sistem identitas | Kode kluster harian tidak pernah dipakai sebagai identitas kejadian (Q-40) |
| P-60 | Sumber angka luas | Hanya luas terverifikasi yang memicu ambang; luas hotspot indikasi (Q-29) |
| P-61 | Hari tanpa laporan | Hari kosong diperlakukan tidak diketahui, bukan nol (Q-38) |
| P-62 | Status payung | Status payung dicatat sebagai konteks, bukan pemicu (Q-05) |
| P-63 | Status mendahului kejadian | Hanya tanggap darurat dan sesudahnya yang memicu; siaga sebagai konteks (Q-05) |
| P-64 | Bahaya dari luar negeri | Dicatat dengan penanda sumber luar negeri (Q-18) |
| P-65 | Respons sebagai ukuran | Respons tidak dipakai sebagai ukuran besar-kecil (Q-35) |

## 5.7 Tindak lanjut katalog

1. Paradoks diuji terhadap kerangka di Bab 7 dan Lampiran B, ditambah 26 kasus uji adversarial
   (A-01 sampai A-26) dari pemeriksa yang tidak ikut menulis kajian.
2. Wawancara Pusdalops, BPBD, dan Pusdatinkom belum dilakukan. Daftar pertanyaannya ada di Lampiran E
   dan menunggu Q-11.
3. Paradoks baru dari pengalaman pemilik dan narasumber diberi kode P-66 dan seterusnya, lalu diuji
   dengan format yang sama.
