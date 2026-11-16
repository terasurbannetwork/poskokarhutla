# REGULASI: kutipan asli untuk kajian Penghitungan dan Klasifikasi Kejadian Bencana

Disusun 12 November 2026. Semua kutipan diambil dari teks asli yang dibuka langsung, bukan dari ingatan. Letak ditulis sebagai nomor halaman cetak dokumen ("hlm.") bila ada.

## 0. Sumber dan status teks

| Regulasi | Teks diperoleh dari | Status |
| --- | --- | --- |
| Juklak BNPB 7/2023 Standar Data Kejadian dan Dampak Bencana | PDF UNFPA Indonesia (`https://indonesia.unfpa.org/sites/default/files/pub-pdf/juklak_standar_data_kejadian_dan_dampak_bencana.pdf`), diekstrak dengan pdftotext. Tautan ini tercatat di `data/raw/hukum/indeks.json` sebagai `sumber_tidak_resmi`. | Sumber tidak resmi (bukan JDIH BNPB). Teks TIDAK ada di korpus `data/hukum/teks` (slug `juknis-nomor-7-tahun-2023`, `teks_ok: false`). Halaman 1, 10, 26, 52, 53 berupa gambar tanpa teks; lihat bagian 10. |
| Perban BNPB 1/2023 Satu Data Bencana | `data/hukum/teks/perban-nomor-1-tahun-2023.txt.gz` | Korpus JDIH, penuh |
| Perka BNPB 8/2011 Standardisasi Data Kebencanaan | `data/hukum/teks/perka-nomor-8-tahun-2011.txt.gz` | Korpus JDIH; `berlaku: false` di `peta_peraturan.json` |
| Perka BNPB 7/2012 Pengelolaan Data dan Informasi Bencana Indonesia | `data/hukum/teks/perka-nomor-7-tahun-2012.txt.gz` | Korpus JDIH; `berlaku: false` |
| Perka BNPB 15/2011 Pedoman Pengkajian Kebutuhan Pascabencana | `data/hukum/teks/perka-nomor-15-tahun-2011.txt.gz` | Korpus JDIH; `berlaku: true` |
| Perka BNPB 3/2016 Sistem Komando Penanganan Darurat Bencana | `data/hukum/teks/perka-nomor-3-tahun-2016.txt.gz` | Korpus JDIH |
| Perban BNPB 4/2020 Penggunaan Dana Siap Pakai | `data/hukum/teks/perban-nomor-4-tahun-2020.txt.gz` | Korpus JDIH |
| Perban BNPB 3/2018 Penanganan Pengungsi | `data/hukum/teks/perban-nomor-3-tahun-2018.txt.gz` | Korpus JDIH |
| Perpres 17/2018 Penyelenggaraan PB dalam Keadaan Tertentu | `data/hukum/teks/perpres-nomor-17-tahun-2018.txt.gz` | Korpus JDIH |
| Juklak BNPB 3/2022 Pengkajian Cepat | PDF salinan BPBD Kota Sukabumi (tautan di `indeks.json`) | Sumber tidak resmi; teks bukan di korpus |
| Juklak BNPB 9/2023 Data dan Informasi Pengungsi Terpilah | PDF UNFPA (tautan di `indeks.json`) | Sumber tidak resmi; teks bukan di korpus |
| UU 24/2007 | PDF `peraturan.bpk.go.id/Download/29492/UU Nomor 24 Tahun 2007.pdf` | Bukan di korpus; JDIH BPK |
| PP 21/2008 | PDF `peraturan.bpk.go.id/Download/36842/PP 21 Tahun 2008.pdf` | Bukan di korpus; JDIH BPK |
| Perpres 39/2019 Satu Data Indonesia | PDF `peraturan.bpk.go.id/Download/99827/Perpres Nomor 39 Tahun 2019.pdf` | Bukan di korpus; JDIH BPK |

Metadata Juklak 7/2023 dari `data/raw/hukum/indeks.json`: Jenis "Petunjuk Pelaksanaan", Nomor 7, Tahun 2023, Tanggal Penetapan "29 December 2023", Tanggal Pengundangan berisi tanda strip (kosong), Status "BERLAKU", lokasi dokumen "Biro Hukum, Organisasi dan Kerja Sama". Tidak ada daftar peraturan yang dicabut atau diubah (`relasi: []`).

Catatan penamaan: judul di JDIH "Standar Data Kejadian dan Dampak Bencana"; PROMPT-KAJIAN dan AGENTS memakai "Standar Kejadian dan Dampak Bencana". Judul resmi memuat kata "Data".

---

## 1. Juklak BNPB 7/2023 (hlm. = halaman cetak, "- n -")

### 1.1 Tujuan, ruang lingkup, pengertian (hlm. 2)

- Ruang lingkup (hlm. 2, Bab I huruf C): "pengelolaan data, standar data kejadian dan dampak bencana" dan "jenis ancaman bencana, kode referensi bencana, ambang batas, metode perhitungan dan daftar data."
- Tujuan butir 2 (hlm. 2, Bab I huruf B): "tercapainya interoperabilitas data kejadian dan dampak bencana antar BNPB, BPBD, kementerian/lembaga, dan pemangku kepentingan lainnya." Butir 1 dan Bab I huruf A ada di hlm. 1 (gambar, belum terbaca).
- Bencana (hlm. 2, Bab I huruf D angka 2): sama dengan UU 24/2007 Pasal 1 angka 1 (bagian 3).
- Data Bencana (angka 3): "Data mengenai Bencana yang sesuai kriteria yang ditetapkan oleh walidata bencana."
- Standar Data (angka 4): "terdiri dari lima komponen yaitu konsep, definisi, klasifikasi, ukuran dan satuan."
- Kode Referensi (angka 10): "tanda berisi karakter yang mengandung atau menggambarkan makna, maksud atau norma tertentu sebagai rujukan identitas Data yang bersifat unik."
- Definisi "kejadian bencana" TIDAK ada di daftar pengertian Bab I huruf D (hanya 10 butir: data, bencana, data bencana, standar data, konsep, definisi, klasifikasi, ukuran, satuan, kode referensi). Kejadian dibatasi hanya lewat ambang batas (1.2) dan Lampiran II butir 1 (1.12).

### 1.2 Enam kriteria ambang batas (hlm. 7, Bab II huruf B angka 3)

Teks asli, judul "3. Ambang batas kejadian bencana":

> "Dalam penentuan kejadian bencana dengan penyebabnya adalah salah satu dari Jenis Bencana dan setidaknya memenuhi satu dari kriteria berikut:
> a. 1 orang meninggal dunia;
> b. 50 orang yang terkena dampak/luka/mengungsi;
> c. 5 unit rumah dan/atau bangunan fasilitas publik rusak;
> d. 1 Hektar lahan;
> e. permintaan Pemerintah Daerah untuk diberikan bantuan nasional; atau
> f. penentuan status keadaan darurat bencana."

Pengamatan teks (bukan tafsir norma):
- Logika: "setidaknya memenuhi satu dari kriteria" (disjungsi, minimal satu). Kalimat pengantar tidak punya predikat utuh.
- Huruf c berbunyi "rumah dan/atau bangunan fasilitas publik", TIDAK memuat daftar rinci (satuan pendidikan, rumah ibadat, fasilitas kesehatan, kantor, jembatan). Daftar itu bukan bunyi kriteria. Huruf d berbunyi "1 Hektar lahan", TIDAK memuat rincian sawah, kebun, hutan, kolam; rincian itu hanya ada di Lampiran II sebagai jenis data.
- Huruf b memakai satu garis miring: "terkena dampak/luka/mengungsi". Teks tidak menyatakan apakah ketiganya dijumlah atau salah satu saja harus mencapai 50.
- Huruf c tidak menyebut tingkat kerusakan (RB, RS, RR, terendam) yang dihitung. Huruf a, b, d tidak menyebut jangka waktu (per hari, per kejadian, kumulatif).
- Huruf c memuat kata "rusak"; huruf d tidak ("1 Hektar lahan"). Teks tidak menyatakan apakah hektar itu terdampak, rusak, atau terbakar.
- Huruf e dan f bukan ambang dampak; keduanya ambang administratif.

### 1.3 Metode perhitungan (hlm. 7 sampai 8, Bab II huruf B angka 4)

> "a. Jika satu kejadian melibatkan lebih dari satu tipe kejadian bencana, ditentukan satu tipe kejadian utama.
> b. Jika suatu kejadian bencana berdampak lebih dari satu provinsi/ kabupaten/kota maka jumlah kejadian secara nasional dihitung sebagai satu kejadian, pada level provinsi jumlah kejadian dihitung berdasarkan provinsi terdampak, pada level kabupaten/kota jumlah kejadian dihitung berdasarkan kabupaten/kota terdampak.
> c. Jika bencana terjadi di dua wilayah berbeda pada hari yang sama namun berbeda jam kejadian dalam satu kabupaten/kota, dihitung satu kejadian bencana dan dalam Kode Referensi Bencana angka index yang menentukan kejadian tersebut." (huruf c bersambung ke hlm. 8)

Butir c memakai frasa "dua wilayah berbeda ... dalam satu kabupaten/kota" yang saling bertabrakan dalam teks asli; catat sebagai kerancuan redaksi.

Contoh pendukung (hlm. 20, Lampiran I huruf C, baris KIB, Catatan):
> "Jika kejadian gempabumi yang berdampak empat kabupaten, kejadian nasional dihitung sebagai satu kejadian gempabumi, namun di level kabupaten dihitung satu kejadian tiap kabupaten."
> "Jika kejadian bencana berdampak beberapa kecamatan berbeda dengan waktu yang berbeda maka tetap dihitung satu kejadian bencana."

Contoh tipe utama (hlm. 19, baris Nama kejadian): "Jika satu kejadian melibatkan lebih dari satu tipe kejadian bencana, ditentukan satu tipe kejadian utama. Misalnya, banjir dapat menyebabkan tanah longsor, jenis kejadiannya adalah banjir sedangkan nama kejadiannya adalah banjir dan tanah longsor."

### 1.4 Kode Identitas Bencana (hlm. 6 sampai 7, Bab II huruf B angka 2; hlm. 20)

> "Kode Referensi Bencana dituangkan pada Kode Identitas Bencana (KIB) yang merupakan kode unik kejadian bencana yang terdiri dari 16 digit, dengan komposisi sebagai berikut: a. 2 angka menunjukan kode provinsi; b. 2 angka menunjukan kode kabupaten/kota; c. 3 angka menunjukan kode bencana; d. 8 angka menunjukan waktu kejadian dengan format tahun bulan tanggal; dan e. 1 angka terakhir menunjukan index" (hlm. 6 sampai 7)

Catatan (hlm. 7):
> "a. Jika kejadian bencana menyebabkan beberapa wilayah terdampak, maka kode wilayah dalam Kode Referensi Bencana mengikuti lokasi episentrum. b. Jika episentrum bencana berada di wilayah lautan maka kode wilayah berdasarkan pada jarak terdekat wilayah terdampak. c. Kode referensi bencana sebagaimana kasus a dan b ditentukan oleh Pusat Data Informasi, dan Komunikasi Bencana melalui proses verifikasi."

Contoh dan satuan hitung (hlm. 20): "Contohnya Banjir di Kabupaten Bogor 19 September 2023 maka KIB-nya sebagai berikut : 32 01 101 20230919 1, 15 digit awal dihitung sebagai satu kejadian bencana."

Pengamatan: indeks hanya satu angka (0 sampai 9). Teks tidak menyebut apa yang terjadi bila ada lebih dari 9 kejadian satu jenis, satu kabupaten, satu hari. KIB hanya memuat satu kode kabupaten (episentrum), sedangkan butir 4b menghitung kejadian per kabupaten terdampak; teks tidak menjelaskan bagaimana kabupaten terdampak lain mendapat identitas.

### 1.5 Jenis ancaman dan kode (hlm. 5 sampai 6, Bab II huruf B angka 1; hlm. 19, Lampiran I)

> "Secara garis besar Indonesia memiliki 13 jenis ancaman bencana yang dibagi menjadi 3 klasifikasi bencana yaitu bencana alam, bencana non alam dan bencana sosial"

Kode (hlm. 19): 101 Banjir, 102 Tanah longsor, 103 Gelombang pasang dan abrasi, 104 Cuaca ekstrem, 105 Kekeringan, 106 Kebakaran hutan dan lahan, 107 Gempabumi, 108 Tsunami, 109 Erupsi gunung api; 201 Epidemi dan wabah penyakit, 202 Kebakaran gedung dan pemukiman, 203 Gagal teknologi (hlm. 6 tabel); 301 Konflik sosial.

Ketidakselarasan internal: Lampiran I hlm. 19 menulis "202. Kebakaran gedung dan pemukiman" dan "202. Gagal teknologi" (kode 202 ganda; Bab II hlm. 6 memberi Gagal teknologi kode 203). Lampiran II hlm. 34 menulis "202. Epidemi" dan "109. Letusan gunung api", berbeda dari Bab II. Catatan 1 (hlm. 25): "Untuk kebakaran gedung dan permukiman dicatat apabila BPBD bergabung dengan Damkar." Tabel hlm. 5 terbaca berantakan dari ekstraksi; subjenis dan pengelompokannya perlu dicek visual.

Bencana sosial hanya satu kode (301). Tabel hlm. 6 menaruh "Konflik sosial, Teror, Kerusuhan sosial" di bawah kode 301 sebagai nama kejadian.

### 1.6 Definisi korban dan terdampak (hlm. 28 sampai 29, Lampiran II huruf A)

- Korban Meninggal: "Orang yang dilaporkan tewas atau meninggal dunia akibat bencana."
- Korban Hilang: "Orang yang dilaporkan hilang atau tidak ditemukan atau tidak diketahui keberadaannya setelah terjadi bencana."
- Korban Luka/Sakit: "Orang yang mengalami luka-luka atau sakit, dalam keadaan luka ringan, maupun luka parah/berat, baik yang berobat jalan maupun rawat inap."
- Terdampak/Penderita: "Orang atau sekelompok orang yang menderita akibat dampak buruk bencana, seperti kerusakan dan atau kerugian harta benda, namun masih dapat menempati tempat tinggalnya."
- Pengungsi: "Orang atau kelompok orang yang terpaksa atau dipaksa keluar dari tempat tinggalnya untuk jangka waktu yang belum pasti sebagai akibat dampak buruk bencana."
- Korban hilang tidak masuk ambang huruf a (hanya "meninggal dunia").
- Pengungsi mengikuti juklak terkait (hlm. 21: "korban mengungsi sesuai dengan juklak terkait pengungsi"); lihat 7.2.
- Kelompok umur (hlm. 21): "Anak : 0 - 17 Tahun , Dewasa : 17-59 tahun, Lansia : 60 tahun keatas." Usia 17 tahun masuk dua kelompok menurut teks ini; Lampiran I hlm. 11 menulis "Dewasa (18-59 tahun)".

### 1.7 Tingkat kerusakan rumah dan fasilitas

- Lampiran II butir 14 (hlm. 37): kerusakan bangunan diklasifikasi "1. Rusak berat 2. Rusak sedang 3. Rusak ringan 4. terendam", ukuran "Total", satuan "unit".
- Definisi "Kerusakan bangunan" (Lampiran II butir 14, hlm. 28): "Tidak berfungsinya bangunan atau komponen bangunan akibat penyusutan/berakhirnya umur bangunan, atau akibat ulah manusia atau perilaku alam seperti beban fungsi yang berlebih, kebakaran, gempa bumi, atau sebab lain yang sejenis." Definisi ini memasukkan penyusutan umur bangunan sebagai penyebab, tidak terbatas pada bencana.
- Rumah (hlm. 28): "Bangunan yang dihuni sebagai tempat tinggal." Rumah kosong tidak termasuk menurut definisi ini.
- Catatan 2 (hlm. 25): "Pembagian jenis kerusakan terdiri atas: a. Rusak berat, merupakan kriteria kerusakan yang mengakibatkan bangunan roboh atau sebagian besar komponen struktur rusak, sebagai contoh : (1) bangunan roboh total / sebagian besar struktur utama bangunan rusak; (2) sebagian besar dinding dan lantai" lalu terputus di akhir hlm. 25. Lanjutan (RB selesai, RS, RR, terendam) ada di hlm. 26 yang berupa gambar dan belum terbaca. Sebagai pembanding, definisi RB, RS, RR di Perka 8/2011 Pasal 1 angka 34 sampai 36 (bagian 7.1).
- Singkatan di formulir (hlm. 12): "RB ... RS ... RR ... Terendam".
- Fasilitas yang punya baris RB/RS/RR/Terendam di formulir: kios/toko, pabrik, jembatan, rumah/pemukiman, rumah ibadat, fasilitas pelayanan kesehatan, satuan pendidikan, kantor, pasar (hlm. 12).
- Teks tidak menyatakan tingkat kerusakan mana yang terhitung untuk "5 unit rumah ... rusak" di huruf c.

### 1.8 Jenis fasilitas dan lahan (Lampiran II, hlm. 29 sampai 31)

- Satuan pendidikan: "kelompok layanan pendidikan yang menyelenggarakan pendidikan pada jalur formal, nonformal, dan informal pada setiap jenjang dan jenis pendidikan."
- Rumah ibadat: "Bangunan yang memiliki ciri-ciri tertentu yang khusus dipergunakan untuk beribadat bagi pemeluk masing-masing agama secara permanen, tidak termasuk tempat ibadat keluarga."
- Fasilitas pelayanan kesehatan: "Tempat dan/ atau alat yang digunakan untuk menyelenggarakan Pelayanan Kesehatan ..." (hlm. 29).
- Kantor: "Tempat yang digunakan untuk perniagaan atau perusahaan yang dijalankan secara rutin. Kantor bisa hanya berupa suatu kamar atau ruangan kecil maupun bangunan bertingkat tinggi." Lampiran I hlm. 24 memperluas ke "kantor pemerintah , swasta maupun gedung/bangunan yang dijadikan kegiatan perkantoran".
- Sawah (hlm. 29): "Tanah yang digarap dan diairi untuk tempat menanam padi yang rusak akibat kejadian bencana seperti gagal panen karena banjir atau kekeringan."
- Lahan (hlm. 29): "Bagian daratan dari permukaan bumi sebagai suatu lingkungan baik yang meliputi tanah beserta segenap faktor yang mempengaruhi penggunaannya seperti iklim relief, aspek geologi, dan hidrologi yang terbentuk secara alami maupun akibat pengaruh manusia."
- Kebun (hlm. 29): "Sebidang lahan, biasanya di tempat terbuka, yang mendapat perlakuan tertentu oleh manusia, khususnya sebagai tempat tumbuh tanaman".
- Hutan (hlm. 30): "Suatu kesatuan ekosistem berupa hamparan lahan berisi sumber daya alam hayati yang didominasi pepohonan dalam persekutuan alam lingkungannya".
- Kolam (hlm. 30): "Tempat melakukan kegiatan pembudidayaan perikanan."
- Kebakaran hutan dan lahan (hlm. 31): "Jumlah keadaan di mana hutan dan lahan dilanda api, sehingga mengakibatkan kerusakan hutan dan lahan yang menimbulkan kerugian ekonomis dan atau nilai lingkungan."
- Definisi "lahan" tidak mensyaratkan kerusakan, dan tidak ada ambang untuk jenis lahan tertentu. Ukuran "Luas", satuan "hektar" (Lampiran II hlm. 40 sampai 41).
- Daftar data sosial ekonomi (hlm. 8): sawah, lahan, kebun, hutan, kolam, kios/toko, pabrik, taksiran kerugian.

### 1.9 Data statis lawan dinamis dan frekuensi (hlm. 3 sampai 4; hlm. 19 sampai 25)

> "Ada dua jenis data, yaitu data dinamis dan data statis. Data dinamis merupakan data tentang kejadian bencana yang bersifat sementara. Artinya data tersebut masih mengalami perubahan sesuai dengan laporan perkembangan selama keadaan darurat bencana. Data statis merupakan data kejadian bencana yang bersifat tetap atau tidak mengalami perubahan." (hlm. 3)

> "Alur manajemen data dinamis digunakan pada saat tanggap darurat bencana dan alur manajemen data statis digunakan dalam proses verifikasi data bencana bulanan/triwulan/semester/tahunan." (hlm. 3)

> "a. saat keadaan darurat bencana data dinamis disampaikan minimal 1 hari sekali atau sesuai dengan kesepakatan dalam pos komando penanganan darurat bencana; b. data statis disampaikan kepada walidata bencana sesuai dengan periode waktu yang telah ditentukan." (hlm. 3 sampai 4)

Kolom Petunjuk Pengisian (hlm. 21 sampai 24): untuk meninggal, dinamis dan statis "Nominal terakhir"; untuk hilang, luka/sakit, terdampak, mengungsi, tabel menampilkan kolom statis "Nominal terbesar selama masa tanggap darurat" (tabel terbaca berantakan dari ekstraksi, perlu cek visual). Untuk kerusakan dan kerugian (sawah, lahan, rumah dan seterusnya) dinamis dan statis "Nominal terakhir".

Periode yang "telah ditentukan" tidak diisi angka. Mekanisme koreksi atau pembekuan versi statis tidak ada.

### 1.10 Lintas wilayah, berulang, berantai

- Lintas wilayah: diatur (1.3 b). Dampak pada beberapa kecamatan dengan waktu berbeda: satu kejadian (hlm. 20).
- Kejadian berantai antarjenis: satu tipe utama (1.3 a); contoh banjir lalu longsor.
- Kejadian berulang di tempat yang sama pada hari berbeda, gempa susulan, dan kapan satu kejadian dianggap berakhir: tidak diatur.

### 1.11 Siapa yang mencatat dan memverifikasi (hlm. 3 sampai 4, 9)

- Produsen daerah/pusat (hlm. 4): "Pengumpulan data bencana ini dilakukan oleh BPBD kabupaten/kota selaku Produsen Data bencana di daerah dan unit kerja BNPB selaku Produsen Data bencana di BNPB."
- Verifikasi di daerah (hlm. 4): "Proses verifikasi data di daerah dilakukan oleh BPBD provinsi, kabupaten/kota berkoordinasi dengan perangkat daerah terkait."
- Walidata pusat (hlm. 9): "Walidata Bencana di pusat dilaksanakan oleh Pusat Data Informasi dan Komunikasi kebencanaan."
- Kode referensi untuk kasus multi wilayah dan laut: ditentukan Pusdatinkom melalui verifikasi (hlm. 7 Catatan c).
- Sumber data (hlm. 3): "Data dan informasi bencana dikumpulkan dari berbagai sumber, antara lain dari pemerintahan, organisasi relawan/lembaga swadaya masyarakat/masyarakat dan berbagai sumber media." Pengumpulan dapat "tidak langsung seperti dari internet, televisi, media cetak dan sebagainya."
- Pengolahan (hlm. 4): "kompilasi data, pembersihan data dan verifikasi data."
- Metode verifikasi, kriteria bukti, dan batas waktu verifikasi: tidak diatur di Juklak ini (Perban 1/2023 Pasal 24 hanya umum, bagian 2).

### 1.12 Kaitan ambang dengan hitung (Lampiran II huruf B, hlm. 33 sampai 34)

Butir 1 "Jumlah Bencana", definisi: "Jumlah peristiwa atau rangkaian peristiwa yang mengancam dan mengganggu kehidupan dan penghidupan masyarakat ... sesuai dengan ambang batas bencana yang telah ditentukan." Ukuran "Total", satuan "kejadian", klasifikasi penyajian "Wilayah; Jenis Bencana". Frasa "sesuai dengan ambang batas bencana yang telah ditentukan" diulang di tiap baris jumlah per jenis bencana (hlm. 43 sampai 51).

### 1.13 Lampiran I: format data (hlm. 11 sampai 18)

- Formulir kejadian (hlm. 11): jenis bencana, nama kejadian, tarikh, waktu kejadian, lokasi (provinsi sampai kelurahan/desa), letak geografis, penyebab, kronologis, deskripsi, sumber, kondisi mutakhir, status keadaan darurat bencana, upaya penanganan, dokumentasi, sebaran dampak, Kode Identitas Bencana.
- Tabel korban dipilah anak, dewasa, lansia dan L/P untuk meninggal, hilang, luka/sakit, terdampak, mengungsi (hlm. 11).
- "Status keadaan darurat bencana" (hlm. 20): "Tuliskan status bencana yang ditetapkan oleh pemerintah sesuai dengan pedoman penetapan status keadaan darurat bencana." Pedoman yang dimaksud tidak disebut nomornya.
- Definisi "Status keadaan darurat bencana" (Lampiran II butir 44, hlm. 32): "Suatu keadaan yang ditetapkan oleh Pemerintah untuk jangka waktu tertentu atas dasar rekomendasi Badan yang diberi tugas untuk menanggulangi bencana".
- Taksiran kerugian (butir 45, hlm. 32): "kerugian yang dialami ketika terjadi bencana". Tidak ada metode rupiah; satuan "Rp (Juta)" (hlm. 23 sampai 25).
- Daftar data kebutuhan, kerusakan prasarana, pelayanan dasar, aset penanganan: hlm. 8 sampai 9.
- Formulir tidak memuat kolom luas terbakar khusus karhutla; karhutla hanya lewat hutan dan lahan (hektar).

---

## 2. Perban BNPB 1/2023 Satu Data Bencana

Menimbang (hlm. 1): "bahwa untuk melaksanakan ketentuan Pasal 14 ayat (3) dan Pasal 15 ayat (2) Peraturan Presiden Nomor 39 Tahun 2019 tentang Satu Data Indonesia". Mengingat memuat UU 24/2007 dan Perpres 39/2019. Perban 1/2023 TIDAK menyebut Juklak 7/2023 secara eksplisit.

- Pasal 1 angka 3 (hlm. 2): "Data Bencana adalah Data mengenai Bencana yang sesuai kriteria yang ditetapkan oleh walidata bencana."
- Pasal 1 angka 4: "Satu Data Bencana adalah kebijakan tata kelola Data akurat, mutakhir, terpadu, dapat dipertanggungjawabkan, serta mudah diakses, dan disebarluaskan serta dapat dibagipakaikan".
- Pasal 1 angka 5: "Walidata Bencana adalah unit kerja pada Badan Nasional Penanggulangan Bencana yang melaksanakan kegiatan pengumpulan, pemeriksaan, dan pengelolaan Data yang disampaikan oleh produsen Data Bencana, serta menyebarluaskan Data."
- Pasal 1 angka 6: "Produsen Data Bencana adalah unit kerja di lingkungan Badan Nasional Penanggulangan Bencana yang menghasilkan Data berdasarkan tugas dan kewenangannya." (BPBD tidak masuk definisi ini; Juklak 7/2023 menyebut BPBD kabupaten/kota produsen daerah.)
- Pasal 1 angka 9 (hlm. 2): Kode Referensi, bunyi sama dengan Juklak 7/2023.
- Pasal 1 angka 11 (hlm. 2): "Data Transaksi adalah Data yang bersifat dinamis dan dapat berubah sesuai dengan proses transaksi yang terjadi."
- Pasal 2 (hlm. 3): berpedoman pada "pemenuhan Standar Data; penyertaan Metadata; pemenuhan kaidah interoperabilitas; dan penggunaan Kode Referensi dan/atau Data Induk."
- Pasal 5 ayat (2) (hlm. 4): "Data saat tanggap darurat ... merupakan Data yang bersifat sementara ... paling sedikit terdiri atas: a. Data kejadian bencana; b. Data kebutuhan; c. Data akibat terhadap manusia; d. Data kerusakan dan kerugian sosial-ekonomi; ..." (delapan huruf, sama dengan daftar data Juklak 7/2023 hlm. 8 sampai 9).
- Pasal 8 huruf b (hlm. 5): Walidata "memastikan ketersediaan dan kemutakhiran Data, Metadata, dan Kode Referensi".
- Pasal 8 huruf c (hlm. 5): Walidata menyiapkan dasar-dasar, termasuk "1) kriteria kejadian bencana; 2) jangka waktu pengumpulan Data kejadian bencana; 3) nomor induk tiap-tiap kejadian bencana; dan 4) standar prosedur operasional Satu Data Bencana". Kriteria kejadian (ambang) didelegasikan ke Walidata, tidak dimuat dalam Perban.
- Pasal 10 (hlm. 6 sampai 7): tugas Produsen, antara lain "menyampaikan Data kepada Walidata Bencana sesuai dengan Standar Data yang berlaku".
- Pasal 12 ayat (4) (hlm. 7): Forum Satu Data Bencana rapat koordinasi "paling sedikit 2 (dua) kali dalam 1 (satu) tahun".
- Pasal 14 ayat (1) (hlm. 8): perencanaan Data bertujuan "mengatasi kesenjangan dan menghindari duplikasi Data". Pasal 16 ayat (3): Daftar Data "ditetapkan oleh Kepala Badan Nasional Penanggulangan Bencana".
- Pasal 20 ayat (1) (hlm. 9 sampai 10): pengumpulan sesuai "a. Standar Data; b. daftar Data; dan c. jadwal pemutakhiran Data atau rilis Data."
- Pasal 20 ayat (4) (hlm. 10): pengumpulan tidak langsung dari "naskah dinas; media sosial; dan/atau log file."
- Pasal 21 ayat (2) (hlm. 10): "kompilasi Data; pembersihan Data; dan verifikasi Data."
- Pasal 23 ayat (1) (hlm. 10): "Pembersihan Data ... dilakukan untuk memperbaiki Data yang tidak lengkap dan memastikan tidak terdapat duplikasi Data."
- Pasal 24 ayat (1) (hlm. 11): "Verifikasi Data ... dilaksanakan berdasarkan: a. metodologi pendataan dan kelogisan Data yang dihasilkan; b. kelengkapan; c. kesesuaian dengan kebenaran; dan d. keruntutan."
- Pasal 25 ayat (4) (hlm. 11): "Walidata Bencana dapat mengembalikan Data kepada Produsen Data Bencana untuk diperbaiki."
- Pasal 30 ayat (1) (hlm. 13): "Walidata Bencana menentukan periode penyimpanan Data historis".
- Pasal 31 (hlm. 13): Pemda "menyelenggarakan satu data bencana daerah sesuai kewenangannya"; tata kelola "disesuaikan dengan kebutuhan pada masing-masing daerah."
- Pasal 32 (hlm. 13), temuan penting:
  > "(1) Penyelenggaraan Satu Data Bencana sebagaimana dimaksud dalam Pasal 13 dikecualikan pada saat kondisi kedaruratan bencana. (2) Dalam hal kondisi kedaruratan bencana terdapat penetapan/pernyataan status darurat bencana oleh Kepala Daerah, penyelenggaraan Satu Data Bencana dilaksanakan sesuai ketentuan peraturan perundang-undangan mengenai sistem komando penanganan darurat bencana. (3) Dalam hal terdapat kejadian bencana namun tidak terdapat penetapan/pernyataan status darurat bencana, penyelenggaraan Satu Data Bencana dikoordinasikan oleh Badan Penanggulangan Bencana Daerah."
- Pasal 33 ayat (1) dan (2) (hlm. 13): "Pada saat kondisi kedaruratan bencana ... berakhir, Data Bencana yang didapatkan dilakukan pengolahan untuk mendapatkan Data Bencana yang sesuai prinsip Satu Data Indonesia." Data itu disampaikan ke Walidata.
- Perban 1/2023 tidak memuat definisi "kejadian bencana", ambang, atau kode kejadian.

---

## 3. UU 24/2007 tentang Penanggulangan Bencana

- Pasal 1 angka 1 (hlm. 2): "Bencana adalah peristiwa atau rangkaian peristiwa yang mengancam dan mengganggu kehidupan dan penghidupan masyarakat yang disebabkan, baik oleh faktor alam dan/atau faktor nonalam maupun faktor manusia sehingga mengakibatkan timbulnya korban jiwa manusia, kerusakan lingkungan, kerugian harta benda, dan dampak psikologis."
- Pasal 1 angka 2 sampai 4: bencana alam ("antara lain berupa gempa bumi, tsunami, gunung meletus, banjir, kekeringan, angin topan, dan tanah langsor" [sic, demikian di PDF]), bencana nonalam, bencana sosial.
- Pasal 7 ayat (1) huruf c (hlm. 7): wewenang Pemerintah meliputi "penetapan status dan tingkatan bencana nasional dan daerah".
- Pasal 7 ayat (2) (hlm. 7):
  > "Penetapan status dan tingkat bencana nasional dan daerah sebagaimana dimaksud pada ayat (1) huruf c memuat indikator yang meliputi: a. jumlah korban; b. kerugian harta benda; c. kerusakan prasarana dan sarana; d. cakupan luas wilayah yang terkena bencana; dan e. dampak sosial ekonomi yang ditimbulkan."
- Pasal 7 ayat (3) (hlm. 8): "Ketentuan lebih lanjut mengenai penetapan status dan tingkatan bencana sebagaimana dimaksud pada ayat (2) diatur dengan peraturan presiden." Penjelasan Pasal 7 ayat (2) dan (3): "Cukup jelas." Perpres khusus penetapan status dan tingkatan bencana tidak ditemukan di korpus; Perpres 17/2018 mengatur hal berbeda (bagian 5). UU tidak memuat ambang angka.
- Pasal 48 (hlm. 22 sampai 23): tanggap darurat meliputi "a. pengkajian secara cepat dan tepat terhadap lokasi, kerusakan, dan sumber daya; b. penentuan status keadaan darurat bencana; ..."
- Pasal 49 (hlm. 23): pengkajian cepat mengidentifikasi "a. cakupan lokasi bencana; b. jumlah korban; c. kerusakan prasarana dan sarana; d. gangguan terhadap fungsi pelayanan umum serta pemerintahan; dan e. kemampuan sumber daya alam maupun buatan."
- Pasal 50 ayat (1) (hlm. 23): "Dalam hal status keadaan darurat bencana ditetapkan, Badan Nasional Penanggulangan Bencana dan badan penanggulangan bencana daerah mempunyai kemudahan akses yang meliputi: a. pengerahan sumber daya manusia; b. pengerahan peralatan; c. pengerahan logistik; d. imigrasi, cukai, dan karantina; e. perizinan; f. pengadaan barang/jasa; g. pengelolaan dan pertanggungjawaban uang dan/atau barang; h. penyelamatan; dan i. komando untuk memerintahkan sektor/lembaga."
- Pasal 51 (hlm. 23 sampai 24): "(1) Penetapan status darurat bencana dilaksanakan oleh pemerintah sesuai dengan skala bencana. (2) ... skala nasional dilakukan oleh Presiden, skala provinsi dilakukan oleh gubernur, dan skala kabupaten/kota dilakukan oleh bupati/walikota."
- UU tidak memuat definisi "kejadian bencana".

## 4. PP 21/2008 tentang Penyelenggaraan Penanggulangan Bencana

- Pasal 21 ayat (1) (hlm. 13): tanggap darurat meliputi "a. pengkajian secara cepat dan tepat terhadap lokasi, kerusakan, kerugian, dan sumber daya; b. penentuan status keadaan darurat bencana". Penjelasan huruf b: "Termasuk dalam penentuan status keadaan darurat bencana adalah penentuan tingkatan bencana."
- Pasal 22 ayat (2) (hlm. 14): pengkajian cepat dilakukan "oleh tim kaji cepat berdasarkan penugasan dari Kepala BNPB atau kepala BPBD sesuai kewenangannya."
- Pasal 22 ayat (3) (hlm. 14): identifikasi "a. cakupan lokasi bencana; b. jumlah korban bencana; c. kerusakan prasarana dan sarana; d. gangguan terhadap fungsi pelayanan umum serta pemerintahan; dan e. kemampuan sumber daya alam maupun buatan." Penjelasan huruf c: "Termasuk dalam kerusakan prasarana dan sarana adalah kerugian materiil dan nonmateriil."
- Pasal 23 ayat (1) dan (2) (hlm. 14): "Penentuan status keadaan darurat bencana ... dilaksanakan oleh Pemerintah atau pemerintah daerah sesuai dengan tingkatan bencana." Nasional oleh Presiden, provinsi oleh gubernur, kabupaten/kota oleh bupati/walikota. Penjelasan Pasal 23 ayat (1): "Yang dimaksud dengan status keadaan darurat dimulai sejak status siaga darurat, tanggap darurat, dan transisi darurat ke pemulihan."
- Pasal 24 (hlm. 15): pada saat status ditetapkan, BNPB dan BPBD mempunyai kemudahan akses di sembilan bidang (sama dengan UU 24/2007 Pasal 50).
- PP 21/2008 tidak memuat ambang angka. Perka 8/2011 menyebut PP 21/2008 Pasal 18 ayat (3) sebagai dasar standardisasi data (Menimbang huruf a); isi pasal itu tidak diperiksa.

## 5. Status keadaan darurat, tingkatan, dan dasar lain

- Perpres 17/2018 Pasal 1 angka 3 (hlm. 3): "Keadaan Darurat Bencana adalah suatu keadaan yang mengancam dan mengganggu kehidupan dan penghidupan sekelompok orang/masyarakat yang memerlukan tindakan penanganan segera dan memadai, yang meliputi kondisi siaga darurat, tanggap darurat, dan transisi darurat ke pemulihan."
- Perpres 17/2018 Pasal 1 angka 1 (hlm. 2): "Keadaan Tertentu adalah suatu keadaan dimana status Keadaan Darurat Bencana belum ditetapkan atau status Keadaan Darurat Bencana telah berakhir dan/atau tidak diperpanjang, namun diperlukan atau masih diperlukan tindakan guna mengurangi Risiko Bencana dan dampak yang lebih luas."
- Perpres 17/2018 Pasal 2 (hlm. 3): penentuan status oleh pemerintah atau pemda "sesuai dengan tingkatan bencana"; nasional Presiden, provinsi gubernur, kabupaten/kota bupati/wali kota.
- Perpres 17/2018 Pasal 3 ayat (2) (hlm. 3 sampai 4): Keadaan Tertentu pada kondisi "a. adanya potensi Bencana dengan tingkat ancaman maksimum; dan b. telah terjadi evakuasi/penyelamatan/pengungsian atau gangguan fungsi pelayanan umum yang berdampak luas terhadap kehidupan sosial dan ekonomi masyarakat." Ayat (4): ketentuan lebih lanjut dalam pedoman Kepala BNPB; pedoman itu tidak ada di korpus. Relevansi: ada penanganan BNPB tanpa status darurat; kriteria huruf f Juklak 7/2023 ("penentuan status keadaan darurat bencana") tidak menyebut "Keadaan Tertentu".
- Perka BNPB 3/2016 Pasal 1 angka 2 (hlm. 3): "Status Keadaan Darurat Bencana adalah Keadaan Darurat Bencana yang ditetapkan oleh Pemerintah atau pemerintah daerah untuk jangka waktu tertentu atas dasar rekomendasi badan yang menyelenggarakan urusan di bidang penanggulangan bencana dimulai sejak status siaga darurat, tanggap darurat dan transisi darurat ke pemulihan." Angka 3 sampai 5 mendefinisikan siaga darurat, tanggap darurat, transisi.
- Perka 3/2016 Pasal 3 ayat (2) (hlm. 6 sampai 7): komando dibedakan menurut "status keadaan darurat bencana kabupaten/kota untuk kejadian bencana pada: 1. satu kabupaten/kota terdampak; 2. beberapa kabupaten/kota dalam satu provinsi; dan 3. beberapa kabupaten/kota di beberapa provinsi; b. status keadaan darurat bencana provinsi untuk kejadian bencana pada satu atau lebih dari satu kabupaten/kota dalam satu provinsi; dan c. status keadaan darurat bencana nasional." Status dibedakan menurut cakupan wilayah, bukan angka dampak.
- Pedoman tersendiri "penetapan status keadaan darurat bencana" (dirujuk Juklak 7/2023 hlm. 20): tidak ditemukan di korpus dengan judul itu.
- Perban 4/2020 Pasal 2 ayat (1) (hlm. 6, Dana Siap Pakai): pemberian bantuan dalam negeri berdasarkan "a. adanya penetapan Status Keadaan Darurat Bencana yang ditetapkan oleh bupati/walikota, gubernur, atau Presiden, b. adanya penetapan Status Keadaan Tertentu: dan c. pertimbangan adanya risiko Bencana berdampak luas yang ditetapkan oleh Kepala BNPB." Pasal 8 (hlm. 10): permohonan atas dasar risiko berdampak luas dilengkapi "rekomendasi dari Deputi terkait yang menjelaskan analisis risiko, potensi luasan dampak serta kebutuhan dan rincian biaya". Ini jalur bantuan nasional tanpa status daerah.
- "Permintaan Pemerintah Daerah untuk diberikan bantuan nasional" (kriteria e): bentuk, saluran, dan bukti permintaan tidak didefinisikan di Juklak 7/2023.

## 6. Perpres 39/2019 Satu Data Indonesia

- Pasal 3: "Satu Data Indonesia harus dilakukan berdasarkan prinsip sebagai berikut: a. Data yang dihasilkan oleh Produsen Data harus memenuhi Standar Data; b. ... harus memiliki Metadata; c. ... harus memenuhi kaidah Interoperabilitas Data; dan d. ... harus menggunakan Kode Referensi dan/atau Data Induk."
- Pasal 4 ayat (2): Standar Data "terdiri atas: a. konsep; b. definisi; c. klasifikasi; d. ukuran; dan e. satuan." Ayat (5): klasifikasi adalah penggolongan data "berdasarkan kriteria yang ditetapkan oleh Pembina Data atau dibakukan secara luas." Juklak 7/2023 Lampiran II mengikuti kolom ini.
- Pasal 14 ayat (1) (hlm. 15): Walidata pusat "mengumpulkan, memeriksa kesesuaian Data, dan mengelola Data yang disampaikan oleh Produsen Data sesuai dengan prinsip Satu Data Indonesia".
- Pasal 15 ayat (1) (hlm. 16): Produsen "menghasilkan Data sesuai dengan prinsip Satu Data Indonesia; dan menyampaikan Data dan Metadata kepada Walidata."
- Perpres 39/2019 tidak mengatur ambang kejadian atau cara menghitung.

## 7. Aturan lain yang menyentuh pendataan dampak

### 7.1 Perka BNPB 8/2011 dan Perka 7/2012 (pendahulu; berlaku: false di peta repo)

- Perka 8/2011 Pasal 1 angka 8: "Kejadian Bencana adalah peristiwa bencana yang terjadi dan dicatat berdasarkan tanggal kejadian, lokasi, jenis bencana, korban dan/ataupun kerusakan. Jika terjadi bencana pada tanggal yang sama dan melanda lebih dari satu wilayah, maka dihitung sebagai satu kejadian." Perka 7/2012 Pasal 1 angka 6 serupa ("korban dan/atau kerusakan"). Pencarian kata ambang, minimal, paling sedikit di kedua perka tidak menemukan ambang kejadian. Definisi lama menghitung SATU kejadian lintas wilayah pada tanggal yang sama; Juklak 7/2023 menghitung per kabupaten dan provinsi terdampak. Catatan repo `data/kajian-bnpb/data/dibi/README.md` menyebut perubahan ini sebagai salah satu sebab patahan seri DIBI 2024 (itu tafsir repo, bukan bunyi regulasi).
- Perka 8/2011 Pasal 1 angka 31 (Penderita/terdampak): "orang atau sekelompok orang yang menderita akibat dampak buruk bencana, seperti kerusakan dan atau kerugian harta benda, namun masih dapat menempati tempat tinggalnya." Angka 32 (Pengungsi): "terpaksa atau dipaksa keluar dari tempat tinggalnya ketempat yang lebih aman dalam upaya menyelamatkan diri/jiwa untuk jangka waktu yang belum pasti". Angka 33: kerusakan harta benda "meliputi rumah, fasilitas pendidikan ..., fasilitas kesehatan ..., fasilitas peribadatan ..., bangunan lain (kantor, pasar, kios) dan jalan ... serta sawah yang terkena bencana dan puso (gagal panen)."
- Perka 8/2011 Pasal 1 angka 34 sampai 36: rusak berat ("bangunan roboh atau sebagian besar komponen struktur rusak"), rusak sedang ("sebagian kecil komponen struktur rusak, dan komponen penunjang rusak namun bangunan masih tetap berdiri"), rusak ringan ("sebagian komponen struktur retak (struktur masih bisa digunakan) dan bangunan masih tetap berdiri"). Semuanya deskriptif, tanpa persentase.
- Perka 7/2012 Bab V (DIBI), butir F Operasionalisasi: admin DIBI kabupaten/kota mengumpulkan dan memverifikasi dengan OPD terkait; admin provinsi "verifikasi dan validasi"; admin nasional "menyetujui apabila data yang akan ditampilkan di DIBI nasional sudah valid"; salinan data per semester. Bab V awal: DIBI "menggunakan metodologi desinventar". Pengertian data dinamis dan statis di Juklak 7/2023 hlm. 3 hampir identik dengan kalimat Perka 7/2012.
- Dokumen yang mencabut kedua perka tidak diperiksa; bagian Juklak 7/2023 yang terbaca tidak memuat ketentuan pencabutan.

### 7.2 Juklak 9/2023 Data dan Informasi Pengungsi Terpilah (sumber tidak resmi)

- Bab I huruf D huruf b (hlm. 2): "Pengungsi adalah orang atau kelompok orang yang terpaksa atau dipaksa keluar dari tempat tinggalnya untuk jangka waktu yang belum pasti sebagai akibat dampak buruk bencana."
- Bab II (hlm. 10 sampai 11): "Pos Lapangan PDB melakukan pembaharuan data Pengungsi terpilah setiap hari". Membedakan "Pengungsi Terkonsentrasi" (berkelompok pada satu tempat penampungan) dan "Pengungsi Tidak Terkonsentrasi" ("tinggal sementara di sekitar tempat tinggalnya yang dikelola secara mandiri maupun yang tinggal di tempat kerabat atau rumah sewa").
- Perban 3/2018 Pasal 1 angka 3 memuat definisi pengungsi yang sama.
- Pembedaan terkonsentrasi dan tidak terkonsentrasi tidak muncul di Juklak 7/2023. Tafsir (bukan kutipan): definisi "terdampak" Juklak 7/2023 ("masih dapat menempati tempat tinggalnya") dan "pengungsi tidak terkonsentrasi di sekitar tempat tinggalnya" dapat tumpang tindih dalam praktik.

### 7.3 Juklak 3/2022 Pengkajian Cepat (sumber tidak resmi)

- Bab I huruf D angka 11 (hlm. 3): "Penduduk terdampak adalah sekelompok orang/masyarakat yang terkena dampak buruk pada saat kejadian bencana." Tidak memuat frasa "masih dapat menempati tempat tinggalnya" seperti Juklak 7/2023: dua definisi "terdampak" berbeda dalam dua juklak BNPB yang terbit berselang satu tahun.
- Bab II huruf C angka 1 (hlm. 7): status siaga darurat: kaji cepat "paling lambat 1 x 24 jam setelah informasi diterima"; status tanggap darurat: "paling lambat 1 x 24 jam setelah informasi awal terjadinya bencana yang diterima berdasarkan laporan oleh masyarakat ataupun petugas lokal."
- Bab I huruf A (hlm. 2): dasar UU 24/2007 Pasal 48 dan PP 21/2008 Pasal 22 ayat (1).

### 7.4 Perka BNPB 15/2011 Pengkajian Kebutuhan Pascabencana (PDNA)

- Bab II huruf A (hlm. 4 sampai 5): komponen PDNA: pengkajian akibat bencana (kerusakan, kerugian, gangguan akses, gangguan fungsi, naiknya risiko), pengkajian dampak bencana, pengkajian kebutuhan pemulihan (Diagram 2.1, hlm. 4).
- Tabel 2.1 (hlm. 5):
  - Kerusakan: "Perubahan bentuk pada aset fisik dan infrastruktur milik pemerintah, masyarakat, keluarga dan badan usaha sehingga terganggu fungsinya secara parsial atau total sebagai akibat langsung dari suatu bencana ... dalam kategori tingkat kerusakan ringan, sedang dan berat."
  - Kerugian: "Meningkatnya biaya kesempatan atau hilangnya kesempatan untuk memperoleh keuntungan ekonomi karena kerusakan aset ... sebagai akibat tidak langsung dari suatu bencana."
  - Gangguan Akses: "Hilang atau terganggunya akses individu, keluarga dan masyarakat terhadap pemenuhan kebutuhan dasarnya akibat suatu bencana."
  - Gangguan Fungsi: "Hilang atau terganggunya fungsi kemasyarakatan dan pemerintahan akibat suatu bencana."
  - Naiknya risiko: "Meningkatnya kerentanan dan atau menurunnya kapasitas individu, keluarga dan masyarakat sebagai akibat dari suatu bencana."
- Cara hitung rupiah (hlm. 24, data harga satuan): "Data ini diperlukan untuk menghitung kerusakan fisik menjadi nilai rupiah." Formulir 08 (hlm. 104): nilai kerusakan = data kerusakan per tingkat (RB, RS, RR) dikali harga satuan (Rp) per tingkat, ditambah perkiraan kerugian (losses).
- Tabel unit dan satuan biaya (PDF hlm. 47; nomor cetak tidak dicatat): "Tingkat kerusakan terdiri dari kategori rusak berat, rusak sedang, dan rusak ringan. Masing-masing kategori memiliki kriteria tersendiri. Harga (biaya) satuan berbeda menurut tingkat kerusakannya".
- Di bagian yang dicari lewat kata kunci, Perka 15/2011 tidak memuat persentase atau skor teknis RB/RS/RR (tidak dibaca penuh, 108 halaman).
- Juklak 7/2023 memuat "Taksiran kerugian" tanpa menunjuk Perka 15/2011 dan tanpa memisahkan kerusakan (damage) dari kerugian (losses).

---

## 8. Asal-usul angka 1 / 50 / 5 / 1 ha: hasil pencarian

Hasil: TIDAK DITEMUKAN naskah akademik, notulen, kajian pendukung, atau penjelasan yang menurunkan angka 1 orang meninggal, 50 orang, 5 unit, 1 hektar.

Sudah dicari di:
- seluruh `data/hukum/teks/*.txt.gz` (184 berkas) dengan kata "Standar Kejadian", "kriteria kejadian", "ambang batas": hanya tiga berkas cocok (Perban 1/2023 lewat Pasal 8 huruf c; Juklak 17/2025 dan Perban 6/2024, keduanya tampaknya tentang manajemen risiko lembaga dan tidak dibuka lebih lanjut);
- `data/hukum/peta_peraturan.json`, `data/raw/hukum/indeks.json` (entri Juklak 7/2023 tanpa PDF resmi, `relasi: []`);
- `data/kajian-bnpb/juklak/DATA-DAMPAK.md`, `juklak/KEPUTUSAN-JUKLAK.md`, `data/dibi/README.md`, `hitung-bencana/riset/DAFTAR-PARADOKS.md`, `hitung-bencana/naskah/lampiran-e-wawancara.md`: menyebut Juklak 7/2023 dan angka ambang, tidak menyebut asal angka. Pencarian teks di seluruh `data/kajian-bnpb` berhenti karena batas waktu (hasil sebagian);
- teks Juklak 7/2023 sendiri (halaman yang berteks): tidak ada bagian alasan angka. Bab I huruf A dan B ada di hlm. 1 (gambar, belum terbaca) dan bisa memuat alasan; perlu cek visual;
- web (12 Nov 2026): satu pencarian standar dengan kata kunci ambang dan angka; tidak ada hasil naskah akademik. Belum dicoba: fetch langsung `jdih.bnpb.go.id`, permintaan resmi ke Pusdatinkom, arsip rapat Forum Satu Data Bencana (Perban 1/2023 Pasal 12 menyebut rapat 2 kali setahun).
- Perka 7/2012 menyebut metodologi desinventar tetapi tidak memuat ambang.

---

## 9. Yang tidak diatur (celah)

Berdasarkan teks Juklak 7/2023 yang terbaca dan Perban 1/2023, hal berikut tidak diatur:

1. Definisi "kejadian bencana" sebagai konsep (selain lewat ambang batas); tidak ada di daftar pengertian Bab I.
2. Apakah huruf b ("terkena dampak/luka/mengungsi") dijumlah atau salah satu kategori mencapai 50; cara menghindari hitung ganda orang yang sekaligus luka dan mengungsi.
3. Tingkat kerusakan (RB, RS, RR, terendam) yang dihitung untuk "5 unit ... rusak" pada huruf c; apakah rumah terendam terhitung.
4. Daftar "bangunan fasilitas publik" pada huruf c (daftar rinci hanya di Lampiran II sebagai jenis data, bukan bunyi kriteria).
5. Jenis lahan pada huruf d (sawah, kebun, hutan, kolam, atau lahan) dan syarat apakah luas itu rusak, terbakar, terendam, atau terdampak; tidak ada ambang berbeda per jenis.
6. Jangka waktu penghitungan ambang (per hari, per episode, kumulatif) dan siapa menetapkan bahwa ambang "terpenuhi".
7. Penerapan ambang pada kejadian lintas kabupaten: apakah ambang berlaku di tingkat kejadian atau tiap kabupaten terdampak. Butir 4b menghitung kejadian per kabupaten tetapi tidak menyatakan ambang per kabupaten atau gabungan.
8. Bukti minimal atau metode verifikasi tiap kriteria (Perban 1/2023 Pasal 24 hanya umum).
9. Definisi, bentuk, saluran, dan bukti "permintaan Pemerintah Daerah untuk diberikan bantuan nasional" (huruf e); nomor pedoman "penetapan status keadaan darurat bencana" (huruf f); perlakuan status "Keadaan Tertentu" (Perpres 17/2018).
10. Kejadian berulang di lokasi yang sama pada hari berbeda, gempa susulan, banjir berulang dalam satu musim; kapan satu kejadian berakhir dan kejadian baru dimulai.
11. Kapasitas indeks KIB (satu angka) bila lebih dari 9 kejadian sejenis dalam satu hari di satu kabupaten.
12. Identitas kejadian bagi kabupaten terdampak selain kabupaten episentrum.
13. Periode pasti penyampaian data statis ("sesuai dengan periode waktu yang telah ditentukan") dan jadwal rilis; mekanisme koreksi, revisi angka, pembekuan versi, dan jejak perubahan.
14. Perlakuan korban hilang yang kemudian ditemukan meninggal; pemilihan "nominal terakhir" lawan "nominal terbesar" saat angka turun (tabel hlm. 21 sampai 23, perlu cek visual).
15. Metode taksiran kerugian rupiah dan rujukan ke Perka 15/2011.
16. Persentase atau skor tiap kategori RB, RS, RR (di bagian yang terbaca hanya contoh deskriptif).
17. Perlakuan bencana tanpa korban dan kerusakan fisik tetapi berdampak luas (kabut asap, kekeringan meteorologis, gelombang pasang tanpa kerusakan); ambang hektar dan unit tidak cocok untuk asap, gangguan layanan, atau dampak kesehatan.
18. Epidemi dan wabah memakai ambang yang sama (1 meninggal, 50 terdampak) tanpa definisi kasus atau sumber data sektor kesehatan.
19. Kedudukan Juklak (kolom Tanggal Pengundangan di JDIH kosong) terhadap UU 24/2007 Pasal 7 ayat (2) dan (3) yang mengamanatkan peraturan presiden untuk status dan tingkatan bencana.
20. Hubungan ambang Juklak dengan indikator status dan tingkat bencana di UU 24/2007 Pasal 7 ayat (2) (jumlah korban, kerugian harta benda, kerusakan prasarana dan sarana, cakupan luas wilayah, dampak sosial ekonomi): tidak disinggung.

## 10. Belum terverifikasi

1. Halaman 1, 10, 26, 52, 53 PDF Juklak 7/2023 berupa gambar (tanpa teks): Bab I huruf A (latar belakang) dan huruf B butir 1, halaman pengesahan/penandatangan (hlm. 10), lanjutan Catatan 2 Lampiran I (definisi lengkap RB, RS, RR, terendam, hlm. 26), dan dua halaman terakhir. Perlu OCR atau pembacaan visual PDF UNFPA, atau berkas resmi dari JDIH BNPB.
2. Sumber teks Juklak 7/2023 adalah PDF UNFPA (bukan JDIH BNPB resmi); keasliannya tidak dibandingkan dengan berkas resmi.
3. Tabel Petunjuk Pengisian (hlm. 21 sampai 24) dan tabel jenis ancaman (hlm. 5 sampai 6) terbaca berantakan dari ekstraksi teks; isi kolom dinamis/statis/satuan per baris perlu dicek visual sebelum dikutip sebagai tabel.
4. Nomor halaman Juklak 7/2023 memakai nomor cetak "- n -"; hlm. 1 dan 10 tidak berteks sehingga nomornya diasumsikan berurutan. Nomor halaman UU 24/2007 dan PP 21/2008 diambil dari penanda "- n -" pada berkas BPK, dan dapat bergeser satu halaman.
5. Ketentuan peralihan atau pencabutan Perka 8/2011 dan Perka 7/2012 oleh Juklak 7/2023: tidak ada di teks yang terbaca (hlm. 10 yang bisa memuat penutup belum terbaca).
6. Perpres penetapan status dan tingkatan bencana (amanat UU 24/2007 Pasal 7 ayat (3)): ada atau tidak, tidak diperiksa di luar korpus.
7. Pedoman penetapan status keadaan darurat bencana (rujukan Juklak 7/2023 hlm. 20) dan pedoman Perpres 17/2018 Pasal 3 ayat (4): nomor dan teksnya tidak ditemukan.
8. Perban pengganti Perka 15/2011 (Jitupasna terbaru) tidak diperiksa; keberlakuan Perka 15/2011 memakai flag `berlaku: true` dari `peta_peraturan.json`. Perban 5/2017 dan 6/2017 (rehabilitasi dan rekonstruksi) ada di korpus tetapi tidak dibaca di sini.
9. PP 21/2008 Pasal 18 ayat (3) (dasar standardisasi data menurut Perka 8/2011) tidak dikutip.
10. Juklak 3/2022 dan 9/2023 dikutip dari PDF tidak resmi (BPBD Kota Sukabumi, UNFPA).
11. Interaksi Perban 1/2023 Pasal 32 dengan Perka 3/2016 (sistem komando) tidak ditelaah pasal demi pasal.
