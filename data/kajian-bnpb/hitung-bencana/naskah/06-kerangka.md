# BAB 6 Kerangka Tiga Lapis

Status: Fase 2, versi 2.1 (direvisi setelah uji adversarial dan uji konsistensi, Bab 7). Pertanyaan terbuka memakai bawaan sementara di `KEPUTUSAN.md`.


## 6.1 Susunan kerangka

Kerangka memisahkan tiga pertanyaan yang selama ini dibebankan pada enam kriteria Juklak 7/2023
(Bab 4.9), ditambah dua aturan pendukung.

Tabel 6.1. Lapisan kerangka dan pertanyaannya

| Lapisan | Pertanyaan | Keluaran | Paradoks inti |
| --- | --- | --- | --- |
| L1 Unit kejadian | Apa yang dihitung sebagai satu kejadian? | Nomor induk kejadian (KJN) dan catatan per kabupaten (CK) | P-01, P-05, P-38, P-39, P-45 |
| L2 Ambang masuk | Apakah kejadian itu masuk hitungan bencana? | Status "bencana" atau "di bawah ambang", dan dasar masuknya | P-15, P-60 |
| L3 Skala keparahan | Seberapa besar? | Kelas R, S, B, atau K dan indikator penentunya | P-21, P-33 |
| D Dampak dan kerugian | Angka mana yang sah dan bagaimana diukur? | Angka bernomor versi per variabel | P-27 |
| S Penyajian | Bagaimana angka dibaca tanpa menyesatkan? | Aturan tabel, grafik, dan tren | P-35, P-37 |

Sumber: Bab 5.5.

Urutan penerapan tetap: L1 lebih dulu, lalu D (versi angka), lalu L2, lalu L3, lalu S. Bab 4.8
menunjukkan bahwa membalik urutan ini mengubah jumlah kejadian karhutla 12 sampai 20 persen.

## 6.2 L1 Unit kejadian

### 6.2.1 Definisi

Satu kejadian bencana adalah satu rangkaian dampak yang disebabkan oleh satu bahaya utama yang
terhubung dalam ruang dan waktu, sejak dampak pertama tercatat sampai jeda tanpa laporan aktif yang
ditetapkan untuk jenis bahayanya. Definisi ini mengisi celah Juklak 7/2023 yang tidak mendefinisikan
"kejadian bencana" (Bab 4.1).

Satu kejadian dicatat dalam dua tingkat:

1. **Kejadian nasional (KJN).** Satu nomor induk per kejadian utuh, diterbitkan Pusdatinkom sebagai
   walidata (Perban 1/2023 Pasal 8 huruf c angka 3; Q-40). Gempa yang merusak 11 kabupaten adalah satu
   KJN.
2. **Catatan kabupaten (CK).** Satu catatan per kabupaten/kota terdampak, dengan KIB 16 digit Juklak
   7/2023 sebagai identitasnya dan nomor induk KJN sebagai rujukan. Gempa yang sama menghasilkan 11 CK.

Kedua tingkat dihitung dan disajikan dengan nama berbeda: "jumlah kejadian" untuk KJN dan "jumlah
catatan kabupaten" untuk CK (Q-03). Pecahan seperti 0,091 kejadian per kabupaten tidak dipakai lagi
(P-48). Tingkat provinsi menghitung KJN yang menyentuh provinsi itu, sehingga satu kejadian lintas
provinsi terhitung satu kali di tiap provinsi dan satu kali secara nasional, sesuai Juklak 7/2023 Bab
II huruf B angka 4 huruf b.

### 6.2.2 Aturan gabung, pisah, dan selesai per jenis bahaya

Tabel 6.2. Aturan L1 per jenis bahaya [BAWAAN SEMENTARA]

| Jenis | Gabung bila | Kejadian baru bila | Selesai bila | Dasar |
| --- | --- | --- | --- | --- |
| Karhutla | Deteksi atau laporan dalam jarak gabung dan selisih waktu 48 jam, berantai; jarak gabung mengikuti aturan kluster sistem kita: 1,5 kali ukuran piksel terbesar pasangan, paling kecil 0,6 km dan paling besar 1,5 km | Jeda 7 hari tanpa deteksi aktif dan tanpa laporan aktif di lokasi itu | 7 hari tanpa deteksi dan tanpa laporan aktif | Q-06, Q-09; aturan kluster sistem kita; P-01 sampai P-04 |
| Banjir, banjir bandang, rob | Jenis sama, kabupaten sama, laporan aktif terakhir kurang dari 7 hari; kabupaten lain bila dinyatakan satu sistem hujan atau satu daerah aliran sungai oleh Pusdatinkom | Jeda 7 hari tanpa laporan aktif, atau surut tercatat lalu naik lagi setelah 7 hari | Surut tercatat dan 7 hari tanpa laporan aktif | Q-09; P-05, P-06 |
| Tanah longsor | Lokasi dalam satu kabupaten dan hari yang sama dengan pemicu hujan yang sama; longsor susulan di lereng yang sama dalam 7 hari | Hari berbeda dengan pemicu hujan baru, atau lereng lain | Pencarian korban dan penanganan darurat ditutup | Juklak 7/2023 Bab II huruf B angka 4 huruf c |
| Cuaca ekstrem | Satu sistem cuaca pada hari yang sama di kabupaten yang bersinggungan | Hari berbeda | Hari kejadian | P-05 |
| Gempa bumi | Gempa utama (nomor kejadian BMKG) dan gempa susulan dalam 30 hari di zona yang sama | Gempa yang magnitudonya sama atau lebih besar dari gempa utama dan dampaknya dapat dipisahkan menurut wilayah, atau pusat gempa di luar zona | 30 hari tanpa susulan merusak; paling lama 90 hari per kejadian | Q-15; P-08; A-18 |
| Tsunami, likuefaksi akibat gempa | Anak dari KJN gempa pemicunya | Tsunami jarak jauh tanpa gempa lokal | Mengikuti induk | Q-10; P-07 |
| Erupsi gunung api | Satu gunung, satu periode yang dimulai pada erupsi berdampak pertama atau status Siaga, mana yang lebih dulu | Periode baru setelah 14 hari di status Waspada atau Normal | 14 hari di status Waspada atau Normal | P-10, P-51; A-19, A-20 |
| Kekeringan, abrasi | Kekeringan: satu zona musim BMKG, satu periode kemarau; kabupaten-kabupaten di zona itu menjadi catatan kabupaten. Abrasi: satu kabupaten, satu tahun kalender | Periode kemarau berikutnya atau tahun berikutnya | Periode kemarau zona musim berakhir atau SK status berakhir, mana yang lebih akhir; abrasi pada akhir tahun | Q-16; P-10; A-21 |
| Kabut asap | Anak dari kejadian karhutla sumbernya; catatan kabupaten di wilayah terpapar | Mengikuti induk | Mengikuti induk | P-10, P-64; A-22 |
| Kebakaran permukiman, gagal teknologi | Satu lokasi, satu hari | Lokasi atau hari berbeda | Hari kejadian | Juklak 7/2023 |
| Epidemi, konflik sosial | Mengikuti penetapan otoritas sektor | Penetapan baru | Penetapan berakhir | Q-42; P-47 |

Aturan umum yang berlaku untuk semua jenis:

1. **Bentuk tidak memecah kejadian.** Api yang terbelah sungai atau banjir yang menggenang di dua
   kecamatan tetap satu kejadian selama masih dalam jeda aktif (P-02, P-03).
2. **Penggabungan yang sah tidak dibatalkan.** Dua api yang menyatu menjadi satu kejadian sejak saat menyatu. Penggabungan yang terjadi karena kesalahan data (deteksi palsu yang menjembatani dua api) dibatalkan dengan jejak (A-04).
   Kejadian yang lebih kecil ditutup dengan status "digabung ke" nomor induk yang lebih besar, dan
   luasnya masuk ke luas gabungan akhir (P-01). Simulasi Bab 5.3 menunjukkan peristiwa ini jarang
   (0,28 persen kejadian karhutla pada aturan acuan), sehingga beban pencatatannya kecil.
3. **Rantai dan majemuk memakai pohon induk dan anak.** Bahaya pemicu menjadi KJN akar; bahaya ikutan
   (tsunami, likuefaksi, longsor akibat banjir, banjir bandang akibat bendung longsor) menjadi anak
   dengan jenisnya sendiri, dan anak boleh punya anak. Jumlah kejadian hanya menghitung akar; statistik
   per jenis menghitung tiap simpul. Anak boleh ditautkan ke induk yang sudah selesai bila masih dalam
   jeda jenis induknya. Korban dicatat sekali pada bahaya penyebab langsungnya dan dijumlah sekali di
   akar; ambang (L2) dan kelas (L3) dinilai pada akar (Q-10, P-07, P-09; A-06 sampai A-08). Bahaya
   berbeda jenis tanpa rantai sebab yang terdokumentasi menjadi KJN terpisah (A-05). Bila rantai sebab
   dinyatakan ada tetapi bahaya pemicunya tidak jelas (mis. banjir dan longsor serentak di satu desa),
   jenis utama akar adalah bahaya dengan dampak terbesar, diukur dengan meninggal dan hilang lalu RBS,
   diusulkan Pusdalops dan diputuskan Pusdatinkom (Q-14). Satu KJN punya satu jenis utama dan daftar
   jenis termuat (A-14).
4. **Tanggal kejadian adalah tanggal dampak pertama.** Tanggal laporan disimpan sebagai metadata.
   Kejadian lintas tahun dihitung pada tahun tanggal mulai, dengan penanda lintas tahun (Q-13, P-11,
   P-39).
5. **Lokasi berupa titik perwakilan ditambah daftar wilayah.** Kejadian berluas menyimpan daftar
   kabupaten dan, bila ada, poligon atau sel grid; titik koordinat hanya perwakilan (P-12). Kejadian di
   laut memakai kabupaten terdampak terdekat sesuai Juklak 7/2023 hlm. 7 (P-56).
6. **Bahaya dari luar negeri dicatat bila berdampak di wilayah kita**, dengan penanda sumber luar
   negeri dan rujukan nomor kejadian eksternal bila ada (Q-18, P-64).
7. **Batas durasi.** Rantai jeda tidak boleh membuat satu KJN banjir, rob, karhutla, atau cuaca
   ekstrem melebihi 30 hari (gempa 90 hari). Setelah batas itu, kejadian yang masih aktif dibuka sebagai
   KJN baru dengan tautan "lanjutan dari" (A-01, A-02). Untuk karhutla, hari tanpa pengamatan satelit
   yang layak (tertutup awan atau asap) tidak dihitung dalam jeda 7 hari (A-03).
8. **Waktu dan tempat.** "Hari" berarti 24 jam sejak dampak pertama dalam zona waktu lokasi (A-25).
   Kode wilayah catatan kabupaten diambil pada tanggal dampak pertamanya, dengan tabel padanan kode
   lama dan baru (A-23, P-55). Dampak dihitung menurut tempat kejadian, bukan kewarganegaraan korban
   (A-24).
9. **Identitas dibawa, bukan disimpulkan.** Laporan pertama memberi nomor usulan; tiap pengkinian
   membawa nomor itu. Kunci tebakan (jenis, provinsi, kabupaten, tanggal) hanya dipakai untuk data lama
   (Q-19, P-38). Aturan yang tertulis (mis. gabung kluster karhutla) boleh diterapkan mesin secara
   otomatis dengan jejak dan dapat dibatalkan; kasus di luar aturan atau yang disengketakan diputuskan
   Pusdatinkom (Q-08, P-45). "Zona" gempa adalah kabupaten yang terdampak gempa utama ditambah
   kabupaten yang bersinggungan dengannya. Kode kluster harian karhutla tidak pernah dipakai sebagai identitas (P-59).

![Gambar 6.1. Pohon keputusan L1: laporan ini kejadian baru atau pengkinian?](gbr/pohon-l1.png)
Sumber: kerangka kajian ini.

## 6.3 L2 Ambang masuk

### 6.3.1 Bunyi usulan

Ambang diterapkan pada KJN yang sudah dibentuk (L1), memakai versi angka yang sah (D), bukan pada
laporan harian per kabupaten. Kejadian masuk hitungan bencana bila penyebabnya salah satu jenis
bencana dan memenuhi sedikitnya satu kriteria berikut. Selama tanggap darurat, status "bencana"
bersifat sementara menurut versi angka terbaru; status akhir ditetapkan pada rilis statis. Untuk
epidemi dan konflik sosial, pintu masuknya adalah penetapan otoritas sektor ditambah M1; M2 sampai
M5 tidak berlaku (Q-42, P-47).

Tabel 6.3. Kriteria ambang masuk usulan (M1 sampai M6) dibanding Juklak 7/2023

| Kode | Bunyi usulan | Pengganti | Perubahan | Paradoks |
| --- | --- | --- | --- | --- |
| M1 | 1 orang meninggal atau hilang akibat langsung bahaya dalam masa KJN | Huruf a | Menambah hilang (sejalan dengan EM-DAT); kematian tak langsung dicatat terpisah dan tidak memicu | P-23, P-24, P-52 |
| M2 | 50 orang unik yang luka atau sakit, mengungsi, atau terdampak langsung, dijumlah. Terdampak langsung adalah salah satu dari tiga: (a) penghuni rumah yang rusak; (b) penghuni rumah yang tergenang air sampai masuk ke dalam rumah, berapa pun lamanya; (c) orang yang mata pencaharian atau akses air bersihnya terputus paling sedikit 3 hari [BAWAAN SEMENTARA]. Satu orang dihitung satu kali | Huruf b | Definisi operasional terdampak; karena satu orang satu kategori, penjumlahan tidak menimbulkan double counting; "berpotensi terdampak", "terancam", dan evakuasi preventif tidak dihitung | P-17, P-25, P-51, P-53; A-09, A-10 |
| M3 | 5 unit rumah setara rusak berat (RBS = RB + 0,5 RS + 0,25 RR). Rumah rusak yang belum terpilah tingkatnya dihitung dengan bobot 0,25 sampai terpilah | Huruf c (rumah) | Tingkat kerusakan disebut dan diberi bobot; rumah tergenang tidak dihitung sebagai unit (penghuninya masuk M2) | P-26, P-54; A-26 |
| M4 | 1 fasilitas atau prasarana dari daftar tertutup rusak berat atau sedang: satuan pendidikan, fasilitas pelayanan kesehatan, rumah ibadat, kantor pemerintahan, pasar (satuan: lembaga); jembatan, ruas jalan, jaringan air bersih, jaringan listrik (satuan: unit atau ruas) | Huruf c (fasilitas) | Fasilitas dipisah dari rumah, dengan daftar dan satuan yang jelas | P-26; A-11 |
| M5 | Karhutla: 2 ha luas terbakar terverifikasi lapangan atau citra resolusi tinggi; sawah atau kebun: 10 ha puso. Luas dari hotspot hanya indikasi | Huruf d | Jenis lahan dan sumber luas disebut; angka mengikuti ambang menonjol Pusdalops agar dua tangga ambang menyatu | P-20, P-58, P-60 |
| M6 | SK tanggap darurat bencana yang menyebut jenis, wilayah, dan tanggal mulai yang cocok dengan kejadian ini (A-13) | Huruf f (sebagian) | Hanya jalur administratif tunggal; siaga darurat dan status payung menjadi penanda | P-15, P-62, P-63 |
| Penanda | Permintaan bantuan nasional, status siaga darurat, status payung, Keadaan Tertentu, dana siap pakai | Huruf e dan f | Dicatat dengan nomor dokumen, tidak memicu masuk | P-15, P-65 |

Sumber: Bab 4.10 dan Lampiran A.

Bobot RBS (1, 0,5, 0,25) dan angka M5 adalah [BAWAAN SEMENTARA] untuk Q-27 dan Q-04. Bobot RBS
memakai prinsip aturan Jepang yang menghitung rumah setengah rusak sebagai setengah rumah hilang
(`riset/PUSTAKA.md`), dengan rusak ringan diberi seperempat. Angka M5 diambil dari ambang menonjol
panduan Pusdalops 2025 (karhutla 2 ha; banjir dan kekeringan 10 ha) supaya satu lembaga memakai satu
tangga ambang (Q-21).

### 6.3.2 Kejadian di bawah ambang

Kejadian yang tidak memenuhi M1 sampai M6 tetap disimpan sebagai "kejadian di bawah ambang". Kejadian
ini tidak masuk jumlah kejadian bencana, tetapi tetap dapat dianalisis sebagai extensive risk (P-32)
dan sebagai deteksi yang perlu diverifikasi (P-40). DIBI sudah menyimpan baris seperti ini dengan
penanda `is_bencana` salah sejak 2025 (Bab 4.3.5), sehingga perubahan yang dibutuhkan adalah membakukan
penanda itu dan menyebut kriteria pemicunya, bukan membuat basis data baru.

Kejadian yang terlihat satelit tetapi belum diverifikasi BPBD dicatat di daftar ketiga, "terdeteksi,
belum diverifikasi", dengan tenggang verifikasi 3 hari (Q-22). Bila tenggang lewat tanpa verifikasi,
statusnya menjadi "tidak terverifikasi, kedaluwarsa" dan tetap di daftar itu; verifikasi yang datang
kemudian tetap dapat memindahkannya (A-12). Daftar ini tidak pernah dijumlah dengan kejadian bencana.

### 6.3.3 Dasar masuk dicatat

Setiap kejadian yang masuk menyimpan kolom "dasar masuk", berisi kode kriteria yang terpenuhi (mis.
"M2, M4"). Dengan kolom ini, Pusdatinkom dan pembaca DIBI bisa memeriksa mengapa sebuah karhutla tanpa
korban dianggap bencana, hal yang saat ini tidak bisa diperiksa pada 1.113 baris karhutla DIBI 12 bulan
(Bab 4.5).

![Gambar 6.2. Pohon keputusan L2: apakah kejadian ini masuk hitungan bencana?](gbr/pohon-l2.png)
Sumber: kerangka kajian ini.

## 6.4 L3 Skala keparahan

### 6.4.1 Empat opsi yang dibandingkan

RQ5 meminta empat opsi dibandingkan. Ringkasan penilaian (uji data di Bab 7):

Tabel 6.4. Opsi skala keparahan

| Opsi | Cara | Kelebihan | Kelemahan |
| --- | --- | --- | --- |
| a. Ambang absolut | Kelas dari jumlah korban, pengungsi, dan rumah rusak berat setara, berskala sepuluh kali lipat | Mudah dihitung dan diperiksa; sejalan dengan PAGER (1, 100, 1.000 meninggal) | Kabupaten kecil dan besar diperlakukan sama (P-17, P-33) |
| b. Relatif terhadap kapasitas | Kelas dari porsi penduduk atau anggaran daerah yang terdampak | Adil antardaerah; sesuai pegangan teori bencana relatif terhadap kapasitas | Data anggaran per kejadian tidak tersedia; angka terdampak yang kabur ikut membesar |
| c. Tingkat status darurat | Kelas mengikuti siapa yang menetapkan status: bupati/wali kota, gubernur, atau Presiden | Sudah ada dasar hukumnya (UU 24/2007 Pasal 51) | Ukuran respons, bukan dampak; melingkar; status hanya terisi pada 25,7 persen kejadian logbook (P-15, P-65) |
| d. Indeks gabungan | Skor berbobot dari beberapa indikator | Merangkum banyak indikator | Bobot sewenang-wenang; sulit dijelaskan ke operator; mengaburkan indikator penentu |

Sumber: Bab 4 dan Lampiran A, kelompok E.

### 6.4.2 Pilihan: absolut berjenjang dengan penaik relatif

Kerangka memakai opsi a sebagai dasar, ditambah satu aturan relatif dari opsi b, dan memakai opsi c
hanya sebagai pembanding. Opsi d tidak dipakai. Alasannya: UU 24/2007 Pasal 7 ayat (2) sudah menyebut
indikator penetapan tingkat bencana (jumlah korban, kerugian harta benda, kerusakan prasarana, cakupan
wilayah, dampak sosial ekonomi), dan skala yang memakai indikator itu satu per satu lebih mudah
diperiksa daripada skor gabungan.

Tabel 6.5. Kelas keparahan [BAWAAN SEMENTARA]

| Kelas | Meninggal dan hilang | Mengungsi (puncak) | Rumah setara rusak berat (RBS) |
| --- | ---: | ---: | ---: |
| K Katastrofik | 1.000 atau lebih | 100.000 atau lebih | 10.000 atau lebih |
| B Besar | 100 sampai 999 | 10.000 sampai 99.999 | 1.000 sampai 9.999 |
| S Sedang | 10 sampai 99 | 1.000 sampai 9.999 | 100 sampai 999 |
| R Ringan | lolos L2, di bawah Sedang | | |

Sumber: kerangka kajian ini; jenjang sepuluh kali lipat mengikuti PAGER (`riset/PUSTAKA.md`).

Aturan kelas:

1. Kelas adalah kelas tertinggi yang dicapai salah satu indikator. Indikator penentu ditulis di
   samping kelas (mis. "B, karena mengungsi"). Meninggal dan hilang dihitung sebagai nilai terbesar
   dari jumlah keduanya per laporan, supaya orang hilang yang kemudian ditemukan meninggal tidak
   terhitung dua kali. Untuk karhutla ditambah indikator keempat, luas terbakar terverifikasi: S mulai
   1.000 ha, B mulai 10.000 ha, K mulai 100.000 ha [BAWAAN SEMENTARA], karena karhutla jarang
   menimbulkan korban jiwa atau rumah rusak tetapi dampak lingkungan dan asapnya besar. Cakupan
   wilayah dan dampak sosial ekonomi (UU 24/2007 Pasal 7 ayat 2) dicatat sebagai keterangan, tidak
   menentukan kelas, karena belum ada data yang dapat diukur seragam.
2. **Mengungsi tidak berdiri sendiri di kelas atas.** Kelas yang ditentukan oleh jumlah pengungsi saja
   paling tinggi S. Kelas B atau K karena pengungsi hanya berlaku bila meninggal dan hilang atau RBS
   sendiri sudah mencapai kelas S. Pengungsi dihitung di kabupaten asal tempat tinggalnya, bukan di
   kabupaten penampung (A-15, A-17).
3. **Penaik relatif.** Bila jumlah pengungsi ditambah terdampak langsung di satu kabupaten mencapai 10
   persen penduduknya, kelas naik satu tingkat, paling tinggi ke B, dengan lantai absolut: naik dari R
   ke S hanya bila jumlahnya paling sedikit 100 orang, dan dari S ke B paling sedikit 1.000 orang (A-16).
   Aturan ini menjawab P-17 dan P-33 tanpa membuat kabupaten berpenduduk besar kehilangan kelas. Angka
   10 persen adalah [BAWAAN SEMENTARA] untuk Q-34.
4. Rupiah tidak menentukan kelas (P-28, Q-30). Kerugian dicatat sebagai keterangan dengan rasio
   terhadap PDRB atau APBD.
5. Kelas ditetapkan pada versi angka statis yang sah. Selama tanggap darurat, kelas sementara boleh
   naik; kelas akhir ditetapkan saat rilis statis (P-42).
6. Status darurat dan tingkatnya ditulis berdampingan dengan kelas. Ketidakcocokan (kelas B tanpa
   status, atau status provinsi untuk kelas R) menjadi bahan evaluasi, bukan koreksi kelas.

### 6.4.3 Skala per jenis bahaya sebagai atribut

Ukuran bahaya disimpan sebagai atribut KJN, tidak menentukan kelas:

- gempa: magnitudo dengan jenis skalanya (Mw, M), kedalaman, intensitas MMI terbesar di daratan, dan
  level PAGER bila ada (P-22);
- banjir: tinggi genangan terbesar dan, bila tersedia, periode ulang curah hujan atau debit;
- karhutla: luas terbakar terverifikasi, durasi, porsi gambut;
- erupsi: status gunung api dan, bila tersedia, VEI;
- kekeringan: indeks kekeringan yang dipakai BMKG dan lamanya;
- semua bahaya: level GDACS bila ada;
- semua bahaya: pemicu dominan (alam, manusia sengaja, manusia lalai, teknologi), diusulkan BPBD dan
  ditetapkan Pusdatinkom saat verifikasi, tanpa mengubah jenis bahaya (Q-23, P-57).

### 6.4.4 Jawaban atas "gempa skala berapa itu bencana besar?"

Tidak ada magnitudo yang otomatis menjadikan gempa bencana besar. Gempa Cianjur 2022 berkekuatan 5,6
menewaskan 602 orang menurut DIBI (`data/kajian-bnpb/data/dibi/kejadian_besar.csv`), dan katalog BMKG
mencatat 8 dari 54 gempa bermagnitudo 7 atau lebih pada 2000 sampai 2025 tanpa korban jiwa (Lampiran A,
P-21). Gempa adalah bencana besar bila dampaknya mencapai kelas B: 100 orang meninggal atau hilang,
10.000 orang mengungsi, atau 1.000 rumah setara rusak berat. Magnitudo dan perkiraan PAGER dipakai untuk
memicu verifikasi cepat dan pengerahan, bukan untuk memberi kelas.

![Gambar 6.3. Pohon keputusan L3: kelas keparahan kejadian](gbr/pohon-l3.png)
Sumber: kerangka kajian ini.

## 6.5 D Aturan dampak dan kerugian

1. **Definisi operasional korban.** Meninggal: tewas akibat langsung bahaya dalam masa kejadian.
   Hilang: tidak ditemukan; berubah menjadi "diduga meninggal" saat pencarian resmi ditutup (Q-24).
   Luka atau sakit: memerlukan perawatan akibat langsung bahaya. Mengungsi: meninggalkan rumah karena
   dampak (bukan evakuasi preventif, yang dicatat terpisah). Terdampak langsung: definisi M2.
   Kematian tak langsung (penyakit pascabanjir, ISPA akibat asap, meninggal di pengungsian) dicatat di
   kolom tersendiri dengan jendela atribusi per jenis (P-23).
2. **Satu orang satu kategori.** Urutan: meninggal, hilang, luka, mengungsi, terdampak. Orang yang luka
   dan mengungsi dicatat sebagai luka (Q-25, P-25). Indikator Sendai yang mengakui double counting tidak
   dipakai untuk ambang.
3. **Tingkat kerusakan.** RB, RS, RR mengikuti definisi Perka BNPB 8/2011 Pasal 1 angka 34 sampai 36
   sampai Juklak menuliskan definisi lengkapnya. Rumah terendam dicatat terpisah; penghuninya dihitung
   terdampak (P-54). Jembatan dan prasarana dihitung dalam satuan masing-masing, tidak dijumlah dengan
   rumah (P-26).
4. **Tiga keadaan isian.** Tiap angka berada dalam satu dari tiga keadaan: bernilai, nihil
   (terkonfirmasi nol), atau belum didata. Kosong tidak sama dengan nol (Q-28, P-49).
5. **Versi angka.** Meninggal dan kerusakan memakai nilai terakhir; hilang, luka, terdampak, dan
   mengungsi memakai nilai terbesar selama masa KJN, sesuai Petunjuk Pengisian Juklak 7/2023.
   Menjumlah angka antarhari dilarang karena logbook menulis angka kumulatif (Q-07, P-41). Angka statis
   dirilis bulanan bernomor versi dan dibekukan per triwulan; koreksi diterbitkan sebagai rilis baru dengan tabel
   "angka terbit lawan angka kini" (Q-41, P-46).
6. **Sumber per angka.** Luas karhutla menyebut sumbernya (pengukuran lapangan, citra resolusi tinggi,
   atau indikasi hotspot). Hanya dua yang pertama boleh memicu M5 (Q-29, P-60).
7. **Kerusakan lawan kerugian.** Kerusakan (aset fisik) dan kerugian (pendapatan dan biaya yang hilang)
   dicatat di dua kolom mengikuti Perka BNPB 15/2011, dengan tahun harga. Keduanya tidak dijumlah dalam
   logbook dan tidak menentukan ambang atau kelas (Q-30 sampai Q-32, P-28 sampai P-30).
8. **Satu angka resmi per versi.** DIBI, setelah satuannya diganti menjadi KJN dan CK tanpa pecahan,
   adalah angka utama untuk jumlah kejadian dan dampak; angka
   instansi lain tampil berdampingan dengan label, tidak dijumlah (Q-33, P-31).

![Gambar 6.4. Pohon keputusan D: angka mana yang dipakai?](gbr/pohon-d.png)
Sumber: kerangka kajian ini.

## 6.6 S Aturan penyajian

1. Jumlah kejadian (KJN) dan jumlah catatan kabupaten (CK) selalu diberi nama berbeda dan tidak saling
   menggantikan.
2. Jumlah kejadian tidak disajikan sendirian. Tabel kejadian selalu didampingi dampak (meninggal dan
   hilang, mengungsi, RBS) dan sebaran kelas R, S, B, K (P-37).
3. Rata-rata dampak per kejadian tidak boleh berdiri sendiri; tulis median, total, dan porsi 1 persen
   kejadian teratas.
4. Tren hanya pada deret yang sebanding. Deret DIBI diberi garis series break pada 2025 (penanda
   `is_bencana`), deret hotspot pada 1 November 2026 (S-NPP berhenti), deret logbook pada tahun
   dengan hari kosong (P-35, P-44, P-61). Tren jumlah kejadian didampingi tren korban meninggal sebagai
   pembanding yang lebih tahan perubahan pelaporan.
5. Angka per 100.000 penduduk disajikan berdampingan dengan angka mutlak (P-17, Q-20). Penaik
   relatif L3 memakai persen penduduk kabupaten; keduanya tidak menggantikan angka mutlak.
6. Angka antarsumber tidak dijumlah. Tabel berdampingan menyebut sumber, periode, dan definisi tiap
   kolom (P-31, P-43).
7. Setiap angka di laporan pimpinan menyebut nomor versi dan tanggalnya (P-27, P-46).
8. Tren nasional diterbitkan bersama jumlah provinsi yang bergerak berlawanan arah (P-36).
9. Wilayah memakai batas terkini untuk penyajian dan kode saat kejadian untuk arsip (P-55).
10. Jumlah kejadian provinsi tidak dijumlah menjadi angka nasional, karena satu kejadian lintas
    provinsi terhitung di tiap provinsi. Deret yang melintasi tahun mulai berlakunya kerangka ini juga
    diberi tanda series break.
11. Yang dilarang: pecahan kejadian sebagai satuan penyajian; menjumlah angka kumulatif harian; grafik
    jumlah kejadian lintas 2024 dan 2025 tanpa tanda series break; peringkat provinsi menurut jumlah
    kejadian tanpa dampak; angka rupiah lintas tahun tanpa harga konstan.

Contoh tabel dan grafik baku dirinci di Bab 8.
