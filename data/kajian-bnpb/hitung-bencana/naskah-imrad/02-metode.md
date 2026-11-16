# BAB 2 Metode

Kajian ini menguji angka bencana dengan satu cara sederhana: mengubah satu aturan hitung, lalu mengukur seberapa jauh hasilnya bergeser. Semua uji memakai data nyata milik kita (15.974 baris DIBI, 9.329 baris logbook, 295.488 deteksi satelit). Berikut data yang dipakai (2.1), cara menjawab tiap pertanyaan penelitian (2.2, 2.3, 2.5), aturan hitung yang diuji (2.4), dan batas mutu data (2.6).

## 2.1 Data

Kajian memakai tiga jenis data (Tabel 2.1): DIBI, logbook Pusdalops, dan *hotspot* satelit VIIRS. DIBI adalah Data dan Informasi Bencana Indonesia, *database* resmi BNPB. Logbook adalah catatan harian kejadian yang disusun Pusdalops dari kiriman BPBD, dan satu barisnya memuat laporan satu kejadian pada satu hari (baris harian). VIIRS adalah sensor satelit yang mendeteksi *hotspot*, dan datanya kita ambil dari FIRMS, layanan data kebakaran milik NASA.

Tabel 2.1. Sumber data kajian

| Sumber | Periode | Satuan satu baris | Jumlah baris | Catatan |
| --- | --- | --- | --- | --- |
| DIBI, tarikan dasbor publik 12 November 2026 | 1 Januari 2024 sampai 12 November 2026 | Satu hari, satu kabupaten atau kota, satu jenis bencana | 15.974 | Bukan jalur resmi; 2024 tidak lengkap |
| DIBI, 12 bulan terakhir | 13 November 2025 sampai 12 November 2026 | Sama | 4.185 | Dasar angka utama |
| Logbook Pusdalops, baris harian | 1 Januari sampai 29 Oktober 2026 (302 hari) | Satu baris harian | 9.329 | Angka korban diurai dari teks bebas |
| Logbook Pusdalops, arsip | 2011 sampai 1 November 2026 | Satu kejadian | 56.685 | Dipakai terbatas, untuk melihat tren jangka panjang |
| Logbook Koordalops | 1 Januari sampai 11 November 2026 | Satu kejadian | 2.346 | Hanya pembanding antarsumber |
| *Hotspot* VIIRS (FIRMS) | 15 Oktober sampai 11 November 2026 (28 hari) | Satu deteksi satelit | 295.488 | Daratan Indonesia, keyakinan nominal dan tinggi |

Sumber: tarikan DIBI 12 November 2026, arsip logbook Pusdalops, dan arsip FIRMS (Lampiran F). Angka antarsumber tidak dijumlah.

Ada empat hal yang perlu dipahami pembaca. Pertama, satu baris DIBI bukan satu kejadian. Satu baris adalah satu kombinasi hari, kabupaten atau kota, dan jenis bencana, sehingga satu gempa yang merusak banyak kabupaten muncul sebagai banyak baris. Kedua, DIBI 2024 hanya memuat 3.752 baris, dibanding 8.946 baris pada 2025. Selisih itu mencerminkan kelengkapan pencatatan dan bukan kejadian yang bertambah, jadi angka utama memakai 12 bulan terakhir. Ketiga, *hotspot* tidak sama dengan luas terbakar. Satu piksel satelit 375 meter kita hitung 14,06 hektare, apa pun luas api sebenarnya. Keempat, dari 420.428 deteksi mentah, 311.804 jatuh di daratan Indonesia, dan 295.488 tersisa setelah deteksi berkeyakinan rendah dibuang. Data pelengkap yang kita pakai berupa teks peraturan dan pustaka internasional (EM-DAT, basis data bencana global; DesInventar; kerangka Sendai).

## 2.2 Cara menjawab pertanyaan 1

Pertanyaan 1 bertanya seberapa besar jumlah kejadian berubah bila cara menghitungnya berubah. Kita menjawabnya dengan mengubah satu aturan hitung dan menghitung ulang jumlah kejadian dari data yang sama. Kita lakukan tiga uji.

**Uji penggabungan kebakaran.** Yang diubah adalah dua pengaturan: jarak maksimum antardeteksi (0,5, 1, atau 2 kilometer) dan jeda waktu maksimum (6, 24, atau 72 jam). Dua deteksi dianggap satu kejadian bila jaraknya dan selisih waktunya tidak melewati batas itu. Penggabungannya berantai: bila A dekat B dan B dekat C, ketiganya satu kejadian walaupun A dan C berjauhan. Sembilan kombinasi diuji, dengan jarak 1 kilometer dan jeda 24 jam sebagai acuan. Yang diukur adalah jumlah kejadian, jumlah titik per kejadian, jumlah kejadian yang berlangsung lebih dari 7 hari, dan jumlah kejadian yang melewati batas kabupaten. Datanya *hotspot* VIIRS 28 hari.

Luas tidak ada di data ini, jadi kita memakai *proxy*, yaitu pengganti yang kasar: jumlah piksel unik dikalikan 14,0625 hektare. Akibatnya angka batas luas 1 hektare dan 10 hektare tidak menyaring apa pun, sebab kejadian terkecil pun sudah 14,06 hektare. Uji tetap menjalankan batas 1, 10, 50, dan 100 hektare supaya keterbatasan ini terlihat dalam angka. Kita juga menguji urutan kerja. Pada urutan pertama, kelompok harian di bawah batas dibuang lebih dulu, baru sisanya digabung antarhari. Pada urutan kedua, kejadian digabung lebih dulu, baru yang di bawah batas dibuang. Selisih keduanya menunjukkan apakah urutan mengubah hasil.

**Uji cara mencocokkan laporan logbook.** Logbook menulis kejadian yang sama berulang tiap hari dengan keterangan "Update", jadi jumlah kejadian bergantung pada cara membuang laporan kembar. Cara ini disebut *deduplication key*, yaitu kombinasi kolom yang dipakai untuk menyatakan dua baris sebagai kejadian yang sama. Kita membandingkan lima cara pada 9.329 baris harian.

Tabel 2.2. Lima cara mencocokkan baris harian logbook

| Cara | Dua baris dianggap satu kejadian bila |
| --- | --- |
| Cara 1 | jenis, provinsi, kabupaten atau kota, dan tanggal kejadian sama |
| Cara 2 | sama seperti cara 1, ditambah penggabungan kabupaten yang berbatasan; ini yang dipakai arsip logbook 2026 |
| Cara 3 | jenis, provinsi, dan kabupaten atau kota sama, dengan jeda antarkemunculan paling lama 7 hari, tanpa memperhatikan tanggal |
| Cara 4 | jenis, provinsi, dan tanggal sama, tanpa memperhatikan kabupaten |
| Cara 5 | tidak ada pencocokan; tiap baris harian dihitung sendiri |

Sumber: uji pencocokan logbook (Lampiran F).

Untuk tiap cara kita juga membandingkan tiga aturan angka korban ketika satu kejadian muncul di lebih dari satu hari: memakai nilai terbesar, menjumlahkan semua kemunculan, atau memakai laporan terakhir. Pada cara 3, misalnya, 1.256 kejadian muncul lebih dari satu hari dan 464 di antaranya (36,9 persen) mencatat lebih dari satu tanggal kejadian. Logbook menulis angka kumulatif, sehingga penjumlahan diperkirakan melipatgandakan dampak. Uji ini mengukur seberapa besar kelipatannya.

**Uji pecahan di DIBI.** Kita memeriksa kolom jumlah kejadian di DIBI yang tidak selalu bernilai satu. Satu gempa pada 15 Agustus 2026 yang merusak 11 kabupaten tercatat 0,091 kejadian di tiap kabupaten. Kita menghitung berapa baris yang berupa pecahan dan berapa dampak yang melekat padanya.

## 2.3 Cara menjawab pertanyaan 2

Pertanyaan 2 bertanya apakah enam kriteria Juklak menyaring kejadian dengan terukur dan setara antarjenis bencana. Kita memeriksanya dengan memasang tiap kriteria pada baris DIBI, lalu melihat baris mana yang lolos. Satu baris lolos bila memenuhi sedikitnya satu kriteria berikut:

- ada sedikitnya 1 korban meninggal;
- jumlah orang terdampak, luka, dan mengungsi, dijumlah, sedikitnya 50;
- jumlah rumah rusak (berat, sedang, ringan), ditambah satuan pendidikan, rumah ibadah, fasilitas kesehatan, kantor, dan jembatan rusak, sedikitnya 5. Rumah terendam tidak dihitung.

Tiga kriteria lain tidak bisa diuji karena DIBI tidak punya kolomnya: lahan terbakar sedikitnya 1 hektare, permintaan bantuan nasional, dan status keadaan darurat. Bila terdampak dibaca sebagai satu kategori saja yang mencapai 50, jumlah baris yang lolos hanya turun dari 1.903 menjadi 1.899 pada 12 bulan terakhir, jadi cara membaca ini tidak mengubah kesimpulan.

Dari baris yang lolos, kita mengukur lima hal. Satu, berapa persen baris lolos menurut jenis bencana. Dua, kriteria mana yang menjadi satu-satunya alasan lolos, untuk melihat kriteria mana yang paling menentukan. Tiga, apa yang terjadi bila kriteria dibaca "dan" dan bukan "atau". Empat, seberapa peka hasil terhadap angka batasnya: korban meninggal diuji pada 1, 3, dan 10 orang; terdampak pada 10, 50, 100, dan 500 orang; kerusakan pada 1, 5, 10, dan 50 unit. Aturan lembaga internasional EM-DAT (sedikitnya 10 meninggal atau 100 terdampak) kita pasang sebagai pembanding. Lima, seberapa terpusat dampak: berapa persen korban meninggal berasal dari 1 persen baris teratas. Pengujian per jenis dilakukan untuk sembilan kelompok bencana.

Kita juga memeriksa tanda "bencana" di DIBI terhadap hasil uji kriteria, untuk melihat apakah baris yang ditandai bencana memang memenuhi kriteria.

## 2.4 Aturan hitung yang diuji

Pertanyaan 3 menguji aturan hitung baru. Aturan ini terdiri atas tiga langkah yang dijalankan berurutan. Semua angka batas di bawah ini adalah angka sementara [ANGKA SEMENTARA], yaitu angka yang belum disesuaikan dengan data respons (daftar SK status darurat dan dana siap pakai). Kita memakainya agar uji bisa jalan, dan pimpinan bisa menggantinya tanpa mengubah susunan aturan.

**Langkah 1: menentukan satu kejadian.** Satu kejadian adalah satu rangkaian dampak dari satu bahaya utama yang berhubungan dalam ruang dan waktu, sejak dampak pertama tercatat sampai laporan aktif berhenti selama jeda yang ditetapkan untuk jenis bahayanya. Tiap kejadian mendapat satu nomor induk nasional, dan tiap kabupaten atau kota yang terdampak mendapat satu catatan kabupaten yang merujuk nomor itu. Gempa yang merusak 11 kabupaten karena itu menjadi satu kejadian nasional dan 11 catatan kabupaten. Pecahan seperti 0,091 tidak dipakai lagi. Dua angka ini dihitung dan disajikan dengan nama berbeda: jumlah kejadian dan jumlah catatan kabupaten.

**Langkah 2: syarat masuk hitungan.** Kejadian dari langkah 1 masuk hitungan bila memenuhi sedikitnya satu syarat pada Tabel 2.3.

Tabel 2.3. Syarat masuk hitungan [ANGKA SEMENTARA]

| Syarat | Bunyi | Perbedaan dari Juklak 7/2023 |
| --- | --- | --- |
| Korban jiwa | Ada sedikitnya 1 orang meninggal atau hilang akibat langsung bahaya | Orang hilang ditambahkan; kematian tidak langsung dicatat terpisah |
| Orang terdampak | Sedikitnya 50 orang unik yang luka, sakit, mengungsi, atau terdampak langsung. Terdampak langsung berarti penghuni rumah rusak, penghuni rumah yang kemasukan air berapa pun lamanya, atau orang yang mata pencaharian atau air bersihnya terputus sedikitnya 3 hari | Terdampak diberi definisi; satu orang dihitung sekali; "berpotensi terdampak" dan evakuasi pencegahan tidak dihitung |
| Rumah rusak | Sedikitnya 5 rumah rusak berat atau setaranya (rusak sedang dihitung setengah, rusak ringan seperempat). Rumah yang tingkat rusaknya belum dipilah dihitung seperempat | Tingkat kerusakan disebut; rumah tergenang tidak dihitung sebagai rumah rusak |
| Fasilitas penting | Sedikitnya 1 fasilitas dari daftar tertutup rusak berat atau sedang: sekolah, fasilitas kesehatan, rumah ibadat, kantor pemerintah, pasar, jembatan, ruas jalan, jaringan air bersih, atau jaringan listrik | Fasilitas dipisah dari rumah |
| Lahan terbakar | Karhutla sedikitnya 2 hektare terverifikasi lapangan atau citra resolusi tinggi; sawah atau kebun puso sedikitnya 10 hektare. Luas dari *hotspot* hanya indikasi | Jenis lahan dan sumber luas disebut; angka sama dengan batas laporan menonjol Pusdalops |
| Status darurat | Ada surat keputusan (SK) tanggap darurat yang jenis, wilayah, dan tanggal mulainya cocok dengan kejadian | Hanya jalur administratif ini yang memicu; siaga darurat, status payung, dan permintaan bantuan dicatat sebagai penanda dan tidak memicu |

Sumber: usulan kajian ini, dibandingkan dengan Juklak BNPB 7/2023 Bab II huruf B angka 3.

Perbedaan terpenting dari Juklak ada pada urutan dan bahan hitung. Batas dipasang pada kejadian yang sudah dibentuk di langkah 1, bukan pada baris harian per kabupaten. Angka yang dipakai adalah versi angka resmi, yaitu angka terbaru selama tanggap darurat dan angka beku pada rilis akhir. Urutannya dibuat tetap: langkah 1, lalu penetapan angka korban dan kerusakan, lalu langkah 2, lalu langkah 3, lalu penyajian. Membalik urutan ini mengubah jumlah kejadian karhutla sebesar 12 sampai 20 persen (batas 50 dan 100 hektare).

**Langkah 3: kelas keparahan.** Kejadian yang masuk hitungan diberi kelas Ringan, Sedang, Besar, atau Katastrofik.

Tabel 2.4. Batas kelas keparahan [ANGKA SEMENTARA]

| Kelas | Meninggal dan hilang | Mengungsi (puncak) | Rumah rusak berat atau setaranya |
| --- | ---: | ---: | ---: |
| Katastrofik | 1.000 atau lebih | 100.000 atau lebih | 10.000 atau lebih |
| Besar | 100 sampai 999 | 10.000 sampai 99.999 | 1.000 sampai 9.999 |
| Sedang | 10 sampai 99 | 1.000 sampai 9.999 | 100 sampai 999 |
| Ringan | masuk hitungan, di bawah batas Sedang | | |

Sumber: usulan kajian ini; jenjang sepuluh kali lipat mengikuti sistem peringatan korban gempa USGS PAGER.

Aturan pemakaiannya ada lima. Kelas ditentukan oleh indikator tertinggi, dan indikator penentunya ditulis di samping kelas. Jumlah pengungsi saja paling tinggi menghasilkan kelas Sedang; kelas Besar atau Katastrofik karena pengungsi hanya berlaku bila korban jiwa atau rumah rusak sudah mencapai Sedang. Untuk karhutla ditambah indikator luas terbakar terverifikasi: Sedang mulai 1.000 hektare, Besar mulai 10.000 hektare, Katastrofik mulai 100.000 hektare. Kerugian dalam rupiah tidak menentukan kelas dan dicatat sebagai keterangan. Terakhir, ada kenaikan kelas untuk daerah berpenduduk kecil: bila pengungsi ditambah terdampak langsung mencapai 10 persen penduduk kabupaten, kelas naik satu tingkat, paling tinggi ke Besar. Kenaikan dari Ringan ke Sedang butuh sedikitnya 100 orang, dan dari Sedang ke Besar sedikitnya 1.000 orang, supaya kabupaten kecil tidak naik kelas karena angka yang sangat kecil.

## 2.5 Cara menjawab pertanyaan 3

Pertanyaan 3 bertanya apakah aturan hitung baru membuat angka lebih stabil dan bermakna. Kita mengujinya dengan menerapkan ketiga langkah pada data nyata, lalu membandingkannya dengan aturan lama. Ada empat uji.

**Uji jumlah kejadian.** Langkah 1 diterapkan pada DIBI 2024 sampai 2026 sehingga baris menjadi kejadian nasional (15.637 kejadian). Lalu syarat masuk dipasang dan hasilnya dibandingkan dengan jumlah kejadian yang lolos menurut Juklak. Yang diukur adalah selisih jumlah per tahun dan per jenis bencana.

**Uji kestabilan pada logbook.** Aturan baru dijalankan pada logbook dengan tiga dari lima cara pencocokan di Tabel 2.2, yaitu Cara 1, Cara 2, dan Cara 3. Cara 4 membuang kabupaten dan Cara 5 tidak mencocokkan sama sekali, sehingga keduanya tidak dijalankan. Yang diukur adalah selisih jumlah kejadian antarcara. Bila aturan baru berhasil, selisih itu mengecil dibanding 27 persen pada hitungan lama (2.809 sampai 3.860 kejadian).

**Uji empat cara menentukan skala.** Kita membandingkan empat cara memberi kelas pada 6.835 kejadian yang masuk hitungan: skala absolut (batas angka sama untuk semua daerah), skala relatif terhadap penduduk, skala mengikuti status darurat, dan indeks gabungan beberapa indikator. Yang diukur adalah sebaran kelas dan kecocokan antarcara. Uji ini menjawab dua hal: berapa persen kejadian masuk kelas Besar atau Katastrofik, dan seberapa jauh status darurat cocok dengan skala dampak. Hasil skala absolut, skala relatif, dan status darurat ada di Tabel 3.7, dan hasil indeks gabungan disebut di teks Subbab 3.3.3.

**Uji kasus sulit.** Pemeriksa yang tidak ikut menulis kerangka mencoba mematahkan aturan dengan 26 kasus buatan, misalnya api yang menyatu, gempa lintas provinsi, atau banjir yang berubah menjadi longsor. Kasus yang tidak terjawab aturan dicatat dan aturan diperbaiki (Lampiran A).

Tiap uji hanya mengubah satu hal dan memakai satu sumber data.

## 2.6 Pemeriksaan mutu dan keterbatasan data

Mutu naskah dijaga dengan 3 cara. Pemeriksa yang tidak ikut menulis membaca dokumen akhir dan melaporkan angka yang tidak cocok dengan berkas sumber. Detektor otomatis memeriksa tanda baca terlarang, frasa kosong, dan paragraf tanpa angka. Aturan kejujuran melarang angka, pasal, atau kutipan karangan; yang belum bisa diperiksa ditandai [BELUM TERVERIFIKASI]; kasus rekaan ditandai [ILUSTRASI]; angka yang menunggu keputusan pimpinan atau data respons ditandai [ANGKA SEMENTARA]. Data pribadi seperti nama korban, petugas, pelapor, dan nomor telepon tidak masuk analisis.

Enam keterbatasan data memengaruhi cara membaca angka.

1. DIBI kita tarik dari dasbor publik dan sering dikoreksi susulan, jadi angka bisa berubah bila tarikan diulang. Arti resmi kolom tanda bencana dan jumlah kejadian pecahan baru tafsiran kita dan belum dikonfirmasi Pusdatinkom.
2. DIBI 2024 tidak lengkap. Kenaikan jumlah dari 2024 ke 2025 tidak boleh dibaca sebagai tren.
3. DIBI tidak punya kolom luas, permintaan bantuan, dan status darurat, sehingga tiga kriteria tidak bisa diuji. Hasil karhutla di DIBI hanya batas bawah.
4. Angka logbook diurai dari teks bebas. Sebanyak 1.461 baris tabel tidak terurai karena tidak punya tanggal atau provinsi. Luas hasil urai membengkak karena salah baca, sehingga tidak dipakai.
5. *Hotspot* bukan luas terbakar. Awan, asap, dan hujan menutupi deteksi, sehingga jeda tanpa deteksi belum tentu berarti api padam. Arsip hanya 28 hari, memuat puncak 22 Oktober, dan satelit S-NPP berhenti dipakai pada 1 November 2026, sehingga jumlah titik per hari tidak sebanding sepanjang arsip. Kajian ini bukan *backtest*, yaitu uji ulang aturan terhadap kejadian resmi yang hasilnya sudah diketahui.
6. Wawancara dengan Pusdalops, BPBD, dan Pusdatinkom belum dilakukan. Asal-usul angka batas, arti kolom DIBI, dan praktik penggabungan di lapangan karena itu masih bersandar pada dokumen dan data.

Keterbatasan yang lebih sempit disebut di tempat angkanya dipakai.
