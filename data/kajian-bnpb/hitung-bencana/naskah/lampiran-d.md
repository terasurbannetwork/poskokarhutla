# Lampiran D. Pohon Keputusan untuk Operator

Status: Fase 2, versi 2.1 (selaras dengan Bab 6 versi 2.1). Pertanyaan terbuka memakai bawaan sementara di `KEPUTUSAN.md`. Pohon digambar dari `mesin/gambar/pohon-l1.pohon.json`, `pohon-l2.pohon.json`, `pohon-l3.pohon.json`, dan `pohon-d.pohon.json`.

Lampiran ini untuk petugas Pusat Pengendalian Operasi (Pusdalops) BNPB dan BPBD yang menerima laporan, membuka atau memperbarui catatan kejadian, dan mengisi angka dampak. Empat pohon di bawah menjawab empat pertanyaan yang muncul berurutan: laporan ini kejadian baru atau lanjutan (L1), kejadian ini masuk hitungan bencana atau tidak (L2), seberapa besar (L3), dan angka mana yang ditulis (D). Landasan dan alasannya ada di Bab 6; lampiran ini hanya memuat langkahnya.

Singkatan di lampiran ini: KJN (kejadian nasional, satu kejadian utuh apa pun jumlah wilayahnya); CK (catatan kabupaten, bagian kejadian di satu kabupaten atau kota); KIB (Kode Identitas Bencana, 16 digit Juklak 7/2023); M1 sampai M6 (enam syarat masuk hitungan, Bab 6.3); R, S, B, K (kelas Ringan, Sedang, Besar, Katastrofik); RB, RS, RR (rumah rusak berat, sedang, ringan); RBS (rumah setara rusak berat); SK (surat keputusan); DIBI (Data dan Informasi Bencana Indonesia); Pusdatinkom (Pusat Data, Informasi, dan Komunikasi Kebencanaan BNPB, walidata bencana). Semua angka ambang pada pohon berstatus [BAWAAN SEMENTARA] sampai pemilik data memutuskan.

Setiap pohon dibaca dari kotak pertama, dijawab ya atau tidak, dan diikuti sampai kotak hasil, paling banyak 6 kotak pertanyaan untuk pohon terpanjang (L2). Bila jawabannya belum diketahui, jangan ditebak. Tulis "belum diketahui" di catatan, tahan keputusan, dan tanyakan ke BPBD yang melapor.

## D.1 Pohon L1: laporan ini kejadian baru atau pengkinian?

![Gambar D.1. Pohon keputusan L1: laporan ini kejadian baru atau pengkinian?](gbr/pohon-l1.png)
Sumber: kerangka kajian ini, Bab 6.2; `mesin/gambar/pohon-l1.pohon.json`.

### D.1.1 Langkah demi langkah

1. Periksa nomor induk kejadian pada laporan. Bila ada, laporan ini pengkinian kejadian itu. Tambahkan ke kejadian yang bernomor itu dan selesai.
2. Tanpa nomor, cari kejadian yang masih aktif dengan jenis bahaya sama di kabupaten ini atau kabupaten yang berbatasan langsung. Bila tidak ada, lanjut ke langkah 6.
3. Bila ada, cek tanggal laporan aktif terakhir kejadian itu. Batas jedanya 7 hari untuk karhutla dan banjir, dan 30 hari untuk gempa. Untuk karhutla, hari tanpa pengamatan satelit yang layak (tertutup awan atau asap) tidak dihitung dalam 7 hari. Bila sudah lewat dari batas jeda, buka kejadian baru. Bila kejadian aktif itu sudah berumur 30 hari (gempa 90 hari), buka kejadian baru dengan tautan "lanjutan dari", walaupun jedanya belum lewat.
4. Bila masih dalam batas, nilai keterhubungan lokasi. Untuk karhutla, jarak gabungnya 1,5 kali ukuran piksel terbesar pasangan titik, paling kecil 0,6 kilometer dan paling besar 1,5 kilometer, dengan selisih waktu 48 jam; untuk banjir masih satu sistem hujan atau satu daerah aliran sungai. Bila tidak terhubung, buka kejadian baru.
5. Bila terhubung dan aturannya tertulis (gabung kluster karhutla), mesin menggabungkan dengan jejak dan operator tidak menggabungkan sendiri; Pusdatinkom dapat membatalkannya. Untuk jenis lain, atau kasus di luar aturan, operator mengirim usulan gabung ke Pusdatinkom dengan alasan satu baris, dan Pusdatinkom yang memutuskan (Q-08).
6. Bila tidak ada kejadian aktif sejenis, tentukan apakah bahaya ini dipicu kejadian lain yang sedang aktif, misalnya tsunami setelah gempa atau longsor setelah banjir. Bila ya, buka catatan anak dari kejadian pemicunya; anak boleh punya anak, dan boleh ditautkan ke induk yang sudah selesai bila masih dalam jeda jenis induknya. Bila tidak ada rantai sebab yang terdokumentasi, bahaya berbeda jenis selalu menjadi kejadian terpisah. Bila tidak ada pemicu, buka kejadian baru dan beri nomor usulan.

Aturan menyertai pohon ini (Bab 6.2.2): tanggal kejadian adalah tanggal dampak pertama, bukan tanggal laporan; "hari" berarti 24 jam sejak dampak pertama dalam zona waktu lokasi. Satu kejadian yang meliputi lebih dari satu kabupaten tetap satu nomor induk dengan satu CK per kabupaten, dan jumlah kejadian per provinsi tidak dijumlah menjadi angka nasional.

### D.1.2 Contoh pengerjaan

**Contoh 1, dari data kajian.** Pada 26 November 2025 DIBI mencatat banjir di 11 kabupaten Aceh dalam satu hari. Misalkan laporan banjir dari kabupaten kedua masuk tanpa nomor induk. Langkah 1: tidak ada nomor. Langkah 2: ada banjir aktif yang dilaporkan dari kabupaten tetangga. Langkah 3: laporan terakhirnya kurang dari 7 hari. Langkah 4: bila Pusdatinkom menyatakan keduanya satu sistem hujan atau satu daerah aliran sungai, lokasinya terhubung. Langkah 5: operator mengusulkan gabung, dan hasilnya satu KJN dengan satu CK per kabupaten, jadi 11 CK. Bila Pusdatinkom belum menyatakannya, jawaban langkah 4 adalah tidak dan laporan itu membuka kejadian baru yang dapat digabung belakangan.

**Contoh 2 [ILUSTRASI].** Kebakaran lahan di kabupaten X dilaporkan Senin, lalu laporan aktif berikutnya baru masuk 9 hari kemudian dengan titik api 800 meter dari lokasi semula. Langkah 1: tidak ada nomor. Langkah 2: ada kejadian karhutla di kabupaten itu. Langkah 3: laporan terakhir sudah 9 hari, melewati batas 7 hari, dengan anggapan satelit mengamati layak pada hari-hari itu. Hasilnya kejadian baru, dan kejadian lama dinyatakan selesai. Bila tiga dari sembilan hari itu tertutup awan tebal, hanya 6 hari yang dihitung, sehingga batas 7 hari belum lewat dan langkah 4 yang menentukan apakah laporan itu bagian dari kejadian lama.

## D.2 Pohon L2: apakah kejadian ini masuk hitungan bencana?

![Gambar D.2. Pohon keputusan L2: apakah kejadian ini masuk hitungan bencana?](gbr/pohon-l2.png)
Sumber: kerangka kajian ini, Bab 6.3; `mesin/gambar/pohon-l2.pohon.json`.

### D.2.1 Langkah demi langkah

1. Pastikan penyebabnya salah satu dari 13 jenis bencana. Bila bukan, kejadian ini bukan kejadian bencana dan tidak dicatat di sini.
2. Syarat M1 terpenuhi bila sedikitnya 1 orang meninggal atau hilang akibat langsung bahaya selama kejadian. Kejadian lalu masuk, dan operator menulis "M1" di kolom dasar masuk. Kematian tak langsung dicatat terpisah dan tidak memicu.
3. Syarat M2 terpenuhi bila jumlah orang unik yang luka atau sakit, mengungsi, atau terdampak langsung mencapai sedikitnya 50. Tiga kelompok itu dijumlah, dan satu orang hanya dihitung satu kali. Terdampak langsung adalah penghuni rumah yang rusak, penghuni rumah yang tergenang air sampai masuk ke dalam rumah, atau orang yang mata pencaharian atau akses air bersihnya terputus sedikitnya 3 hari. Pengungsi karena evakuasi pencegahan, orang yang hanya terancam, dan orang yang berpotensi terdampak tidak dihitung.
4. Syarat M3 terpenuhi bila sedikitnya 5 rumah setara rusak berat (RBS): rusak berat dihitung 1, rusak sedang 0,5, rusak ringan 0,25. Rumah rusak yang belum terpilah tingkatnya dihitung 0,25 sampai terpilah. Rumah yang hanya terendam tidak dihitung sebagai unit; penghuninya masuk M2.
5. Syarat M4 terpenuhi bila sedikitnya 1 fasilitas atau prasarana dari daftar tertutup rusak berat atau sedang: satuan pendidikan, fasilitas pelayanan kesehatan, rumah ibadat, kantor pemerintahan, atau pasar (satuan: lembaga), serta jembatan, ruas jalan, jaringan air bersih, atau jaringan listrik (satuan: unit atau ruas).
6. Syarat M5 terpenuhi bila luas karhutla yang terverifikasi lapangan atau citra resolusi tinggi sedikitnya 2 hektare, atau sedikitnya 10 hektare sawah atau kebun puso. Luas dari hotspot saja bukan luas terverifikasi.
7. Syarat M6 terpenuhi bila ada SK tanggap darurat yang menyebut jenis, wilayah, dan tanggal mulai yang cocok dengan kejadian ini. Siaga darurat dan status payung tidak memenuhi M6.
8. Kejadian masuk bila satu atau lebih dari M1 sampai M6 terpenuhi, dan semua kode yang terpenuhi ditulis di kolom dasar masuk, misalnya "M2, M4". Bila tidak satu pun, kejadian disimpan sebagai "kejadian di bawah ambang". Kejadian itu tidak dihitung sebagai bencana dan tidak dibuang. Selama tanggap darurat, status "bencana" bersifat sementara menurut angka terbaru; status akhir ditetapkan pada rilis statis.

Ambang dinilai pada kejadian nasional yang sudah dijumlahkan ke akar (Bab 6.2.2 butir umum 3), bukan pada tiap anak. Untuk epidemi dan konflik sosial, pintu masuknya adalah penetapan otoritas sektor ditambah M1; M2 sampai M5 tidak berlaku. Permintaan bantuan nasional, status siaga darurat, dan dana siap pakai tidak memicu masuk. Semuanya dicatat sebagai penanda, lengkap dengan nomor dokumennya. Gambar D.2 menggabungkan M3 dan M4 dalam satu kotak.

### D.2.2 Contoh pengerjaan

**Contoh 1, dari data kajian.** Banjir Aceh Utara, 28 November 2025, tercatat di DIBI dengan 246 meninggal, 739.710 terdampak, luka, atau mengungsi, dan 91.286 rumah rusak. Langkah 1: banjir termasuk jenis bencana. Langkah 2: M1 terpenuhi karena 246 meninggal. Kejadian masuk. Operator tetap menulis M2, M3, dan M4 bila angkanya terbukti, sehingga pemeriksa kelak tahu bahwa kejadian ini tidak bergantung pada satu syarat.

**Contoh 2 [ILUSTRASI].** Kebakaran lahan seluas 1,5 hektare di kabupaten Y, tanpa korban, tanpa pengungsi, tanpa rumah rusak, tanpa SK. Langkah 2, 3, dan 7: tidak. Langkah 4 dan 5: tidak ada rumah atau fasilitas rusak. Langkah 6: 1,5 hektare di bawah 2 hektare. Hasilnya kejadian di bawah ambang. Kejadian tetap tercatat, dan bila verifikasi lapangan kelak menemukan luas 2,3 hektare, kejadian naik masuk dengan dasar M5 dan catatan sumber luasnya.

## D.3 Pohon L3: kelas keparahan

![Gambar D.3. Pohon keputusan L3: kelas keparahan kejadian](gbr/pohon-l3.png)
Sumber: kerangka kajian ini, Bab 6.4; `mesin/gambar/pohon-l3.pohon.json`.

### D.3.1 Langkah demi langkah

Pohon ini hanya dijalankan untuk kejadian yang sudah lolos L2, pada angka kejadian nasional di akar. Tiga ukuran dipakai berdampingan: jumlah meninggal ditambah hilang (nilai terbesar dari jumlah keduanya pada satu laporan), jumlah pengungsi pada puncaknya (dihitung di kabupaten asal tempat tinggalnya), dan jumlah rumah setara rusak berat. Untuk karhutla ditambah ukuran keempat, luas terbakar terverifikasi. Kelas kejadian adalah kelas tertinggi yang dicapai salah satu ukuran, bukan rata-ratanya. Pengungsi tidak berdiri sendiri di kelas atas: kelas yang ditentukan oleh pengungsi saja paling tinggi S.

1. Kelas K (Katastrofik) berlaku bila salah satu ukuran mencapai 1.000 meninggal dan hilang, 10.000 rumah setara rusak berat, atau (karhutla) 100.000 hektare. Pengungsi 100.000 juga mencapai K, tetapi hanya bila meninggal dan hilang atau rumah setara rusak berat sudah mencapai kelas S.
2. Kelas B (Besar) berlaku bila tidak ada ukuran yang mencapai K, tetapi salah satunya mencapai 100 meninggal dan hilang, 1.000 rumah setara rusak berat, atau (karhutla) 10.000 hektare. Pengungsi 10.000 juga mencapai B dengan syarat yang sama seperti butir 1.
3. Kelas S (Sedang) berlaku bila tidak ada ukuran yang mencapai B, tetapi salah satunya mencapai 10 meninggal dan hilang, 1.000 pengungsi, 100 rumah setara rusak berat, atau (karhutla) 1.000 hektare. Lanjut ke butir 5.
4. Kejadian yang lolos L2 tetapi tidak mencapai S diberi kelas sementara R (Ringan). Lanjut ke butir 5.
5. Penaik: hitung pengungsi ditambah terdampak langsung di satu kabupaten (kabupaten dengan persentase tertinggi), bagi dengan jumlah penduduk kabupaten itu. Bila hasilnya 10 persen atau lebih, kelas naik satu tingkat, paling tinggi B, dengan lantai absolut: R menjadi S hanya bila jumlah itu paling sedikit 100 orang, dan S menjadi B hanya bila paling sedikit 1.000 orang. Penaik tidak berlaku untuk kelas B dan K.
6. Tulis kelas bersama indikator penentunya, misalnya "B, karena meninggal dan hilang". Tulis juga status darurat yang ditetapkan berdampingan dengan kelas, tanpa mengubah kelas.

Rupiah tidak dipakai menentukan kelas (Bab 6.4.2 butir 4). Cakupan wilayah dan dampak sosial ekonomi hanya keterangan. Kelas selama tanggap darurat boleh naik; kelas akhir ditetapkan saat rilis statis.

### D.3.2 Contoh pengerjaan

**Contoh 1, dari data kajian.** Banjir Aceh Utara, 28 November 2025: DIBI mencatat 246 meninggal. Langkah 1: 246 di bawah 1.000, ukuran lain belum cukup untuk K berdasarkan data yang ada. Langkah 2: 246 melewati 100 sehingga kelas B, dengan indikator penentu meninggal. Angka pengungsi dan jumlah rumah setara rusak berat belum bisa dibaca dari kolom DIBI karena rumah rusak (91.286) menjumlah tiga tingkat kerusakan; operator wajib memisahkan RB, RS, dan RR sebelum menyatakan apakah ukuran itu mencapai K (10.000 rumah setara rusak berat). Kelas sementara: B, sekurang-kurangnya.

**Contoh 2 [ILUSTRASI].** Banjir di kabupaten Z berpenduduk 12.000 jiwa. Meninggal 0, pengungsi puncak 1.200, rumah setara rusak berat 60. Langkah 1 dan 2: tidak. Langkah 3: pengungsi 1.200 melewati 1.000, kelas S (pengungsi saja paling tinggi S). Langkah 5: pengungsi ditambah terdampak langsung 1.500 orang dibagi 12.000 penduduk adalah 12,5 persen, melewati 10 persen, sehingga kelas naik ke B. Lantai terpenuhi, karena 1.500 orang melewati 1.000. Catatan akhir: "B, karena penaik relatif; indikator mutlak S".

## D.4 Pohon D: angka mana yang dipakai?

![Gambar D.4. Pohon keputusan D: angka mana yang dipakai?](gbr/pohon-d.png)
Sumber: kerangka kajian ini, Bab 6.5; `mesin/gambar/pohon-d.pohon.json`.

### D.4.1 Langkah demi langkah

Pohon ini dijalankan untuk setiap variabel dampak, satu per satu, setiap kali ada laporan susulan.

1. Untuk variabel meninggal atau kerusakan (rumah, fasilitas, prasarana), pakai nilai pada laporan terakhir yang sah. Bila laporan susulan menurunkan angka karena koreksi, angka yang diturunkan itulah yang berlaku, dan koreksi dicatat dengan alasannya.
2. Untuk variabel hilang, luka, terdampak, atau mengungsi, pakai nilai terbesar yang pernah dilaporkan selama masa kejadian (dari tanggal mulai sampai selesai), walaupun laporan terbaru lebih rendah.
3. Bila kolomnya terisi, pakai nilainya dan tulis sumber serta nomor versinya.
4. Bila kolomnya kosong, tanyakan apakah BPBD menyatakan nol (nihil). Bila ya, tulis nol dan tandai "nol terkonfirmasi". Bila BPBD tidak menyatakan, tulis "belum didata". Kosong tidak sama dengan nol, dan belum didata tidak dijumlahkan sebagai nol.
5. Laporan logbook menulis angka kumulatif. Angka hari ini sudah memuat angka kemarin, jadi jangan menjumlahkan laporan antarhari.
6. Satu orang hanya satu kategori, dengan urutan meninggal, hilang, luka, mengungsi, terdampak.
7. Untuk menentukan kelas keparahan, meninggal dan hilang dihitung sebagai nilai terbesar dari jumlah keduanya pada satu laporan, supaya orang hilang yang kemudian ditemukan meninggal tidak terhitung dua kali.

### D.4.2 Contoh pengerjaan

**Contoh 1, dari data kajian.** Dalam logbook Pusdalops Januari sampai Oktober 2026, 1.349 kejadian muncul di dua hari laporan atau lebih, dan 157 di antaranya menurunkan salah satu angka di laporan berikutnya. Untuk rumah rusak, nilai terbesar per kejadian bila dijumlah mencapai 120.116 sedangkan nilai laporan terakhir 44.938. Aturan pohon D menjawabnya per variabel: rumah rusak memakai laporan terakhir (langkah 1), dan jumlah terdampak memakai nilai terbesar (langkah 2). Bila semua laporan harian dijumlah, hasilnya 3.555.343 rumah rusak, 30 kali lipat nilai terbesar, dan itu salah karena angkanya kumulatif (langkah 5).

**Contoh 2 [ILUSTRASI].** Banjir di kabupaten W. Laporan hari ke-1: meninggal 2, terdampak 1.800, rumah rusak berat 30. Laporan hari ke-2: meninggal 1 (koreksi, satu korban ternyata tidak terkait), terdampak 1.500, rumah rusak berat 28 (hasil verifikasi). Aturan pohon: meninggal memakai laporan terakhir, yaitu 1 (langkah 1). Terdampak memakai nilai terbesar, yaitu 1.800 (langkah 2). Rumah rusak berat memakai laporan terakhir, yaitu 28 (langkah 1). Kolom luka kosong dan BPBD tidak menyatakan nol, jadi ditulis "belum didata" (langkah 4).
