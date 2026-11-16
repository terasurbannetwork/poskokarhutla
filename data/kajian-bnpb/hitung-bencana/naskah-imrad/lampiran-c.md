# Lampiran C. Pohon Keputusan untuk Pencatat

Lampiran ini untuk petugas Pusat Pengendalian Operasi (Pusdalops) BNPB dan BPBD yang menerima laporan, membuka atau memperbarui catatan kejadian, dan mengisi angka dampak. Empat pohon di bawah menjawab empat pertanyaan yang muncul berurutan. Pertama, laporan ini kejadian baru atau tambahan kejadian lama (langkah 1). Kedua, kejadian ini masuk hitungan bencana atau tidak (langkah 2). Ketiga, seberapa besar kelasnya (langkah 3). Keempat, angka mana yang ditulis. Alasan di balik tiap aturan ada di badan kajian; lampiran ini hanya memuat langkah kerjanya.

Beberapa istilah yang dipakai:

- Kejadian nasional adalah satu kejadian utuh, berapa pun jumlah kabupaten yang terkena. Bagiannya di satu kabupaten atau kota disebut catatan kabupaten.
- Kode Identitas Bencana (KIB) adalah kode 16 digit identitas catatan bencana menurut Juklak 7/2023.
- Kelas keparahan ada empat: Ringan, Sedang, Besar, dan Katastrofik.
- Rumah rusak berat atau setaranya: rumah rusak berat dihitung 1, rusak sedang 0,5, rusak ringan 0,25.
- DIBI adalah Data dan Informasi Bencana Indonesia. Pusdatinkom adalah Pusat Data, Informasi, dan Komunikasi Kebencanaan BNPB, pengelola data bencana resmi. SK adalah surat keputusan.

Semua angka batas pada pohon masih berstatus [ANGKA SEMENTARA] sampai disesuaikan dengan data respons dan diputuskan pemilik data.

Setiap pohon dibaca dari kotak pertama, dijawab ya atau tidak, dan diikuti sampai kotak hasil. Pohon terpanjang punya 6 kotak pertanyaan. Bila jawabannya belum diketahui, jangan ditebak. Tulis "belum diketahui" di catatan, tahan keputusan, dan tanyakan ke BPBD yang melapor.

## C.1 Langkah 1: laporan ini kejadian baru atau tambahan kejadian lama?

![Gambar C.1. Pohon keputusan langkah 1: laporan ini kejadian baru atau tambahan kejadian lama?](gbr/i-pohon-langkah1.png)
Sumber: aturan hitung tiga langkah kajian ini; `mesin/gambar/i-pohon-langkah1.pohon.json`.

### C.1.1 Urutan pengerjaan

1. Periksa nomor induk kejadian pada laporan. Bila ada, laporan ini tambahan untuk kejadian itu. Tambahkan ke kejadian yang bernomor itu dan selesai.
2. Bila tidak ada nomor, cari kejadian aktif dengan jenis bahaya sama di kabupaten ini atau kabupaten yang berbatasan langsung. Bila tidak ada, lanjut ke langkah 6.
3. Bila ada, lihat tanggal laporan aktif terakhir kejadian itu. Batas jedanya 7 hari untuk karhutla dan banjir, dan 30 hari untuk gempa. Untuk karhutla, hari tanpa pengamatan satelit yang layak (tertutup awan atau asap) tidak dihitung dalam 7 hari. Bila jeda sudah lewat, buka kejadian baru. Bila kejadian aktif itu sudah berumur 30 hari (gempa 90 hari), buka kejadian baru dengan tautan "lanjutan dari", walaupun jedanya belum lewat.
4. Bila masih dalam batas, nilai apakah lokasinya terhubung. Untuk karhutla, jarak gabungnya 1,5 kali ukuran piksel terbesar pasangan titik, paling kecil 0,6 kilometer dan paling besar 1,5 kilometer, dengan selisih waktu 48 jam. Untuk banjir, lokasi terhubung bila masih satu sistem hujan atau satu daerah aliran sungai. Bila tidak terhubung, buka kejadian baru.
5. Bila terhubung dan aturannya tertulis (menggabungkan kluster karhutla), mesin menggabungkan dengan jejak dan petugas tidak menggabungkan sendiri; Pusdatinkom dapat membatalkannya. Untuk jenis lain, atau kasus di luar aturan, petugas mengirim usulan gabung ke Pusdatinkom dengan alasan satu baris, dan Pusdatinkom yang memutuskan.
6. Bila tidak ada kejadian aktif sejenis, tentukan apakah bahaya ini dipicu kejadian lain yang sedang aktif, misalnya tsunami setelah gempa atau longsor setelah banjir. Bila ya, buka kejadian turunan dari kejadian pemicunya; turunan boleh punya turunan, dan boleh ditautkan ke induk yang sudah selesai bila masih dalam jeda jenis induknya. Bila tidak ada rantai sebab yang terdokumentasi, bahaya berbeda jenis selalu menjadi kejadian terpisah. Bila tidak ada pemicu, buka kejadian baru dan beri nomor usulan.

Dua aturan menyertai pohon ini. Tanggal kejadian adalah tanggal dampak pertama, bukan tanggal laporan, dan "hari" berarti 24 jam sejak dampak pertama dalam zona waktu lokasi. Satu kejadian yang meliputi lebih dari satu kabupaten tetap satu nomor induk dengan satu catatan kabupaten per kabupaten, dan jumlah kejadian per provinsi tidak dijumlah menjadi angka nasional.

### C.1.2 Contoh pengerjaan

**Contoh 1, dari data kajian.** Pada 26 November 2025 DIBI mencatat banjir di 11 kabupaten Aceh dalam satu hari. Misalkan laporan banjir dari kabupaten kedua masuk tanpa nomor induk. Langkah 1: tidak ada nomor. Langkah 2: ada banjir aktif yang dilaporkan dari kabupaten tetangga. Langkah 3: laporan terakhirnya kurang dari 7 hari. Langkah 4: bila Pusdatinkom menyatakan keduanya satu sistem hujan atau satu daerah aliran sungai, lokasinya terhubung. Langkah 5: petugas mengusulkan gabung, dan hasilnya satu kejadian nasional dengan satu catatan kabupaten per kabupaten, jadi 11 catatan. Bila Pusdatinkom belum menyatakannya, jawaban langkah 4 adalah tidak dan laporan itu membuka kejadian baru yang dapat digabung belakangan.

**Contoh 2 [ILUSTRASI].** Kebakaran lahan di kabupaten X dilaporkan Senin, lalu laporan aktif berikutnya baru masuk 9 hari kemudian dengan *hotspot* 800 meter dari lokasi semula. Langkah 1: tidak ada nomor. Langkah 2: ada kejadian karhutla di kabupaten itu. Langkah 3: laporan terakhir sudah 9 hari, melewati batas 7 hari, dengan anggapan satelit mengamati layak pada hari-hari itu. Hasilnya kejadian baru, dan kejadian lama dinyatakan selesai. Bila tiga dari sembilan hari itu tertutup awan tebal, hanya 6 hari yang dihitung, sehingga batas 7 hari belum lewat dan langkah 4 yang menentukan apakah laporan itu bagian dari kejadian lama.

## C.2 Langkah 2: apakah kejadian ini masuk hitungan bencana?

![Gambar C.2. Pohon keputusan langkah 2: apakah kejadian ini masuk hitungan bencana?](gbr/i-pohon-langkah2.png)
Sumber: aturan hitung tiga langkah kajian ini; `mesin/gambar/i-pohon-langkah2.pohon.json`.

### C.2.1 Urutan pengerjaan

1. Pastikan penyebabnya salah satu dari 13 jenis bencana. Bila bukan, kejadian ini bukan kejadian bencana dan tidak dicatat di sini.
2. Syarat korban meninggal atau hilang terpenuhi bila sedikitnya 1 orang meninggal atau hilang akibat langsung bahaya selama kejadian. Kejadian lalu masuk, dan petugas menulis "korban meninggal atau hilang" di kolom alasan masuk hitungan. Kematian tak langsung dicatat terpisah dan tidak memasukkan kejadian.
3. Syarat terdampak terpenuhi bila jumlah orang berbeda yang luka atau sakit, mengungsi, atau terdampak langsung mencapai sedikitnya 50. Tiga kelompok itu dijumlah, dan satu orang hanya dihitung satu kali. Terdampak langsung adalah penghuni rumah yang rusak, penghuni rumah yang tergenang air sampai masuk ke dalam rumah, atau orang yang mata pencaharian atau akses air bersihnya terputus sedikitnya 3 hari. Pengungsi karena evakuasi pencegahan, orang yang hanya terancam, dan orang yang berpotensi terdampak tidak dihitung.
4. Syarat rumah rusak terpenuhi bila ada sedikitnya 5 rumah rusak berat atau setaranya: rusak berat dihitung 1, rusak sedang 0,5, rusak ringan 0,25. Rumah rusak yang belum terpilah tingkatnya dihitung 0,25 sampai terpilah. Rumah yang hanya terendam tidak dihitung sebagai unit; penghuninya masuk hitungan terdampak.
5. Syarat fasilitas rusak terpenuhi bila sedikitnya 1 fasilitas atau prasarana dari daftar tertutup rusak berat atau sedang. Dari satuan lembaga: satuan pendidikan, fasilitas pelayanan kesehatan, rumah ibadat, kantor pemerintahan, atau pasar. Dari satuan unit atau ruas: jembatan, ruas jalan, jaringan air bersih, atau jaringan listrik.
6. Syarat lahan terpenuhi bila luas karhutla yang terverifikasi lapangan atau citra resolusi tinggi sedikitnya 2 hektare, atau sedikitnya 10 hektare sawah atau kebun puso (gagal panen). Luas dari *hotspot* saja bukan luas terverifikasi.
7. Syarat status darurat terpenuhi bila ada SK tanggap darurat yang menyebut jenis, wilayah, dan tanggal mulai yang cocok dengan kejadian ini. Siaga darurat dan status payung tidak memenuhi syarat ini.
8. Kejadian masuk bila satu atau lebih syarat terpenuhi, dan semua syarat yang terpenuhi ditulis di kolom alasan masuk hitungan, misalnya "terdampak, fasilitas rusak". Bila tidak satu pun, kejadian disimpan sebagai "kejadian di bawah ambang". Kejadian itu tidak dihitung sebagai bencana dan tidak dibuang. Selama tanggap darurat, status "bencana" bersifat sementara menurut angka terbaru; status akhir ditetapkan pada rilis statis.

*Threshold* dinilai pada kejadian nasional yang sudah dijumlahkan ke induknya, bukan pada tiap turunan. Untuk epidemi dan konflik sosial, pintu masuknya adalah penetapan otoritas sektor ditambah ada korban meninggal atau hilang; syarat terdampak, rumah, fasilitas, dan lahan tidak berlaku. Permintaan bantuan nasional, status siaga darurat, dan dana siap pakai tidak memasukkan kejadian. Semuanya dicatat sebagai penanda, lengkap dengan nomor dokumennya. Gambar C.2 menggabungkan syarat rumah rusak dan fasilitas rusak dalam satu kotak.

### C.2.2 Contoh pengerjaan

**Contoh 1, dari data kajian.** Banjir Aceh Utara, 28 November 2025, tercatat di DIBI dengan 246 meninggal, 739.710 terdampak, luka, atau mengungsi, dan 91.286 rumah rusak. Langkah 1: banjir termasuk jenis bencana. Langkah 2: syarat korban meninggal terpenuhi karena 246 meninggal. Kejadian masuk. Petugas tetap menulis syarat terdampak, rumah rusak, dan fasilitas rusak bila angkanya terbukti, sehingga pemeriksa kelak tahu bahwa kejadian ini tidak bergantung pada satu syarat.

**Contoh 2 [ILUSTRASI].** Kebakaran lahan seluas 1,5 hektare di kabupaten Y, tanpa korban, tanpa pengungsi, tanpa rumah rusak, tanpa SK. Langkah 2, 3, dan 7: tidak. Langkah 4 dan 5: tidak ada rumah atau fasilitas rusak. Langkah 6: 1,5 hektare di bawah 2 hektare. Hasilnya kejadian di bawah ambang. Kejadian tetap tercatat, dan bila verifikasi lapangan kelak menemukan luas 2,3 hektare, kejadian naik masuk dengan alasan syarat lahan dan catatan sumber luasnya.

## C.3 Langkah 3: kelas keparahan

![Gambar C.3. Pohon keputusan langkah 3: kelas keparahan kejadian](gbr/i-pohon-langkah3.png)
Sumber: aturan hitung tiga langkah kajian ini; `mesin/gambar/i-pohon-langkah3.pohon.json`.

### C.3.1 Urutan pengerjaan

Pohon ini hanya dijalankan untuk kejadian yang sudah lolos langkah 2, pada angka kejadian nasional di induknya. Tiga ukuran dipakai berdampingan: jumlah meninggal ditambah hilang (nilai terbesar dari jumlah keduanya pada satu laporan), jumlah pengungsi pada puncaknya (dihitung di kabupaten asal tempat tinggalnya), dan jumlah rumah rusak berat atau setaranya. Untuk karhutla ditambah ukuran keempat, luas terbakar terverifikasi. Kelas kejadian adalah kelas tertinggi yang dicapai salah satu ukuran, bukan rata-ratanya. Pengungsi tidak berdiri sendiri di kelas atas: kelas yang ditentukan oleh pengungsi saja paling tinggi Sedang.

1. Kelas Katastrofik berlaku bila salah satu ukuran mencapai 1.000 meninggal dan hilang, 10.000 rumah rusak berat atau setaranya, atau (karhutla) 100.000 hektare. Pengungsi 100.000 juga mencapai kelas ini, tetapi hanya bila meninggal dan hilang atau rumah rusak berat atau setaranya sudah mencapai kelas Sedang.
2. Kelas Besar berlaku bila tidak ada ukuran yang mencapai Katastrofik, tetapi salah satunya mencapai 100 meninggal dan hilang, 1.000 rumah rusak berat atau setaranya, atau (karhutla) 10.000 hektare. Pengungsi 10.000 juga mencapai kelas Besar dengan syarat yang sama seperti butir 1.
3. Kelas Sedang berlaku bila tidak ada ukuran yang mencapai kelas Besar, tetapi salah satunya mencapai 10 meninggal dan hilang, 1.000 pengungsi, 100 rumah rusak berat atau setaranya, atau (karhutla) 1.000 hektare. Lanjut ke butir 5.
4. Kejadian yang lolos langkah 2 tetapi tidak mencapai kelas Sedang diberi kelas sementara Ringan. Lanjut ke butir 5.
5. Kenaikan kelas untuk daerah berpenduduk kecil: hitung pengungsi ditambah terdampak langsung di satu kabupaten (kabupaten dengan persentase tertinggi), lalu bagi dengan jumlah penduduk kabupaten itu. Bila hasilnya 10 persen atau lebih, kelas naik satu tingkat, paling tinggi Besar. Ada lantai mutlak: Ringan menjadi Sedang hanya bila jumlah itu paling sedikit 100 orang, dan Sedang menjadi Besar hanya bila paling sedikit 1.000 orang. Kenaikan ini tidak berlaku untuk kelas Besar dan Katastrofik.
6. Tulis kelas bersama ukuran penentunya, misalnya "Besar, karena meninggal dan hilang". Tulis juga status darurat yang ditetapkan berdampingan dengan kelas, tanpa mengubah kelas.

Rupiah tidak dipakai menentukan kelas (lihat A-46 di Lampiran A). Cakupan wilayah dan dampak sosial ekonomi hanya keterangan. Kelas selama tanggap darurat boleh naik; kelas akhir ditetapkan saat rilis statis.

### C.3.2 Contoh pengerjaan

**Contoh 1, dari data kajian.** Banjir Aceh Utara, 28 November 2025: DIBI mencatat 246 meninggal. Butir 1: 246 di bawah 1.000, dan ukuran lain belum cukup untuk kelas Katastrofik berdasarkan data yang ada. Butir 2: 246 melewati 100 sehingga kelas Besar, dengan ukuran penentu jumlah meninggal. Angka pengungsi dan jumlah rumah rusak berat atau setaranya belum bisa dibaca dari kolom DIBI karena rumah rusak (91.286) menjumlah tiga tingkat kerusakan. Petugas wajib memisahkan rusak berat, sedang, dan ringan sebelum menyatakan apakah ukuran itu mencapai 10.000 rumah setara rusak berat. Kelas sementara: Besar, sekurang-kurangnya.

**Contoh 2 [ILUSTRASI].** Banjir di kabupaten Z berpenduduk 12.000 jiwa. Meninggal 0, pengungsi puncak 1.200, rumah rusak berat atau setaranya 60. Butir 1 dan 2: tidak. Butir 3: pengungsi 1.200 melewati 1.000, sehingga kelas Sedang (pengungsi saja paling tinggi Sedang). Butir 5: pengungsi ditambah terdampak langsung 1.500 orang dibagi 12.000 penduduk adalah 12,5 persen, melewati 10 persen, sehingga kelas naik ke Besar. Lantai terpenuhi, karena 1.500 orang melewati 1.000. Catatan akhir: "Besar, karena kenaikan kelas untuk daerah berpenduduk kecil; ukuran mutlak menunjukkan Sedang".

## C.4 Angka mana yang dipakai?

![Gambar C.4. Pohon keputusan angka mana yang dipakai](gbr/i-pohon-angka.png)
Sumber: aturan angka korban dan kerusakan kajian ini; `mesin/gambar/i-pohon-angka.pohon.json`.

### C.4.1 Urutan pengerjaan

Pohon ini dijalankan untuk setiap variabel dampak, satu per satu, setiap kali ada laporan susulan.

1. Untuk variabel meninggal atau kerusakan (rumah, fasilitas, prasarana), pakai nilai pada laporan terakhir yang berlaku. Bila laporan susulan menurunkan angka karena koreksi, angka yang diturunkan itulah yang berlaku, dan koreksi dicatat dengan alasannya.
2. Untuk variabel hilang, luka, terdampak, atau mengungsi, pakai nilai terbesar yang pernah dilaporkan selama masa kejadian (dari tanggal mulai sampai selesai), walaupun laporan terbaru lebih rendah.
3. Bila kolomnya terisi, pakai nilainya dan tulis sumber serta nomor versinya.
4. Bila kolomnya kosong, tanyakan apakah BPBD menyatakan nol (nihil). Bila ya, tulis nol dan tandai "nol terkonfirmasi". Bila BPBD tidak menyatakan, tulis "belum didata". Kosong tidak sama dengan nol, dan belum didata tidak dijumlahkan sebagai nol.
5. Laporan logbook menulis angka kumulatif. Angka hari ini sudah memuat angka kemarin, jadi jangan menjumlahkan laporan antarhari.
6. Satu orang hanya satu kategori, dengan urutan meninggal, hilang, luka, mengungsi, terdampak.
7. Untuk menentukan kelas keparahan, meninggal dan hilang dihitung sebagai nilai terbesar dari jumlah keduanya pada satu laporan, supaya orang hilang yang kemudian ditemukan meninggal tidak terhitung dua kali.

### C.4.2 Contoh pengerjaan

**Contoh 1, dari data kajian.** Dalam logbook Pusdalops Januari sampai Oktober 2026, 1.349 kejadian muncul di dua hari laporan atau lebih, dan 157 di antaranya menurunkan salah satu angka di laporan berikutnya. Untuk rumah rusak, nilai terbesar per kejadian bila dijumlah mencapai 120.116, sedangkan nilai laporan terakhir 44.938. Aturan pohon ini menjawabnya per variabel: rumah rusak memakai laporan terakhir (butir 1), dan jumlah terdampak memakai nilai terbesar (butir 2). Bila semua baris harian dijumlah, hasilnya 3.555.343 rumah rusak, 30 kali lipat nilai terbesar, dan itu salah karena angkanya kumulatif (butir 5).

**Contoh 2 [ILUSTRASI].** Banjir di kabupaten W. Laporan hari ke-1: meninggal 2, terdampak 1.800, rumah rusak berat 30. Laporan hari ke-2: meninggal 1 (koreksi, satu korban ternyata tidak terkait), terdampak 1.500, rumah rusak berat 28 (hasil verifikasi). Meninggal memakai laporan terakhir, yaitu 1 (butir 1). Terdampak memakai nilai terbesar, yaitu 1.800 (butir 2). Rumah rusak berat memakai laporan terakhir, yaitu 28 (butir 1). Kolom luka kosong dan BPBD tidak menyatakan nol, jadi ditulis "belum didata" (butir 4).
