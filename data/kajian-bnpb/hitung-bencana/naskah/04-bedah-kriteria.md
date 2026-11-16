# BAB 4 Bedah Kriteria Ambang Batas Juklak 7/2023

Status: Fase 1, draf untuk dibaca pemilik. Angka berasal dari berkas di
`data/kajian-bnpb/hitung-bencana/analisis/hasil/` dan ringkasannya di `riset/SIM-KRITERIA.md` dan
`riset/SIM-KARHUTLA.md`. Kutipan regulasi berasal dari `riset/REGULASI.md`, rujukan praktik
internasional dari `riset/PUSTAKA.md` (semua sumber dibuka 12 November 2026).


## 4.1 Bunyi kriteria dan kedudukannya

Judul resmi peraturan ini di basis data hukum BNPB adalah Petunjuk Pelaksanaan (Juklak) BNPB
Nomor 7 Tahun 2023 tentang Standar **Data** Kejadian dan Dampak Bencana, ditetapkan 29 Desember
2023. Teksnya tidak ada di korpus hukum lokal repo. Teks yang kami baca berasal dari salinan PDF
yang diunggah UNFPA Indonesia, bukan dari laman resmi JDIH BNPB, sehingga semua kutipan di bab ini
masuk daftar periksa sampai salinan resmi diperoleh (Q-02).

Kriteria ambang batas tertulis di Bab II huruf B angka 3 (hlm. 7):

> "Dalam penentuan kejadian bencana dengan penyebabnya adalah salah satu dari Jenis Bencana dan
> setidaknya memenuhi satu dari kriteria berikut: a. 1 orang meninggal dunia; b. 50 orang yang
> terkena dampak/luka/mengungsi; c. 5 unit rumah dan/atau bangunan fasilitas publik rusak; d. 1
> Hektar lahan; e. permintaan Pemerintah Daerah untuk diberikan bantuan nasional; atau f. penentuan
> status keadaan darurat bencana."

Ada tiga hal yang perlu diluruskan sejak awal.

1. Bunyi huruf c dan d lebih pendek daripada yang selama ini kita kutip. Huruf c tidak menyebut
   satuan pendidikan, rumah ibadah, fasilitas kesehatan, kantor, dan jembatan. Huruf d tidak
   menyebut sawah, kebun, hutan, dan kolam. Rincian itu hanya muncul di Lampiran II sebagai daftar
   jenis data yang dikumpulkan, bukan sebagai bagian kriteria. Akibatnya, apakah jembatan termasuk
   "bangunan fasilitas publik" dan apakah kolam termasuk "lahan" bergantung pada tafsir pencatat.
2. Juklak tidak mendefinisikan "kejadian bencana". Daftar pengertian di Bab I huruf D hanya memuat
   sepuluh istilah, dan kata "kejadian" tidak ada di antaranya. Satu-satunya batas kejadian adalah
   ambang ini, ditambah kalimat Lampiran II butir 1 bahwa jumlah bencana dihitung "sesuai dengan
   ambang batas bencana yang telah ditentukan". Artinya Juklak menetapkan **kapan sesuatu masuk
   hitungan** tanpa menetapkan **apa yang dihitung**.
3. Ambang ini dipakai di dua tempat lain. Panduan Penyusunan Laporan Harian Pusdalops (draf
   02/PO.02/07/2025, hlm. 2) memakai enam kriteria yang sama sebagai syarat masuk laporan harian.
   Panduan Laporan Kejadian Menonjol (draf 03/PO.02/07/2025, hlm. 2) memakai ambang lain per jenis
   bencana: karhutla 2 ha, banjir 50 KK atau 200 orang atau 10 ha, longsor 10 KK atau 40 orang atau 10 rumah
   rusak, kekeringan 200 KK atau 800 orang atau 10 ha, gempa bumi cukup "ada dampak"
   (`scripts/wa/panduan_resmi.json`). Satu lembaga sudah memakai dua tangga ambang, dan keduanya
   tidak saling merujuk (P-58).

Kedudukan hukumnya juga perlu dicatat. Perban BNPB 1/2023 tentang Satu Data Bencana Pasal 8 huruf c
mendelegasikan "kriteria kejadian bencana" kepada Walidata Bencana, yaitu Pusdatinkom. Jadi enam
kriteria ini adalah keputusan walidata, bukan norma peraturan badan. Di sisi lain, UU 24/2007 Pasal
7 ayat (2) sudah menyebut lima indikator penetapan status dan tingkat bencana (jumlah korban,
kerugian harta benda, kerusakan prasarana dan sarana, cakupan luas wilayah, dampak sosial ekonomi)
dan ayat (3) mewajibkan peraturan presiden untuk merincinya. Peraturan presiden itu tidak kami
temukan. Juklak 7/2023 tidak merujuk Pasal 7 ayat (2), padahal kelima indikator itu adalah bahan
yang paling dekat dengan skala keparahan (L3) yang hendak dibangun kajian ini.

## 4.2 Asal-usul angka

Kami mencari naskah akademik, notulen, atau kajian yang menurunkan angka 1 orang, 50 orang, 5 unit,
dan 1 hektare. Hasilnya: **tidak ditemukan**. Yang sudah diperiksa: 184 teks peraturan di korpus
JDIH lokal, indeks peraturan repo, dokumen kajian BNPB di repo yang ditemukan lewat pencarian kata
kunci (sebagian folder), teks Juklak sendiri, dan satu pencarian web. Halaman 1 Juklak (latar belakang Bab I huruf A) berupa
gambar dan belum terbaca, sehingga alasan penyusunan mungkin ada di sana. Pertanyaan ini masuk
daftar wawancara Pusdatinkom (Lampiran E.4 butir 7).

Yang dapat dibuktikan dari teks adalah pergeseran pendekatan:

1. Perka BNPB 8/2011 dan Perka 7/2012 (pendahulu, sudah tidak berlaku menurut peta peraturan repo)
   tidak memuat ambang. Kejadian bencana di sana adalah "peristiwa bencana yang terjadi dan dicatat
   berdasarkan tanggal kejadian, lokasi, jenis bencana, korban dan/ataupun kerusakan". Perka 7/2012
   menyatakan DIBI "menggunakan metodologi desinventar", yaitu metode yang mencatat semua kejadian
   berdampak tanpa ambang (DesInventar Methodological Guide 8.1.9, lihat `riset/PUSTAKA.md`).
2. Juklak 7/2023 memperkenalkan ambang. Bentuknya mirip kriteria EM-DAT, basis data bencana global
   yang dikelola CRED, Universitas Louvain. Kejadian masuk EM-DAT bila memenuhi salah satu dari:
   sedikitnya 10 orang meninggal (termasuk hilang dan diduga meninggal), sedikitnya 100 orang
   terdampak (terdampak, luka, dan kehilangan tempat tinggal), atau seruan bantuan internasional
   atau pernyataan keadaan darurat (doc.emdat.be/docs/protocols/entry-criteria). Strukturnya
   serupa (kriteria dampak manusia ditambah kriteria administratif, logika ATAU), dengan dua
   kriteria fisik tambahan (unit bangunan dan hektare) dan angka yang lebih rendah: meninggal 10
   kali lebih rendah, terdampak 2 kali lebih rendah. Karena asal-usulnya tidak ditemukan, kemiripan
   ini tidak bisa disebut sebagai peniruan yang disengaja.

Angka yang lebih rendah masuk akal bila tujuannya berbeda. EM-DAT memilih bencana yang penting di tingkat
dunia, sedangkan DIBI hendak mencatat bencana yang penting di tingkat kabupaten. Masalahnya, angka
yang diturunkan tanpa kalibrasi tidak lagi menyaring dengan cara yang sama untuk tiap jenis bencana.
Bagian 4.3 sampai 4.5 menunjukkan akibatnya.

## 4.3 Kalibrasi tiap angka

### 4.3.1 Data dan satuan uji

Uji memakai baris DIBI yang ditarik langsung dari dasbor publik DIBI pada 12 November 2026 tanpa
penggabungan: 15.974 baris, 1 Januari 2024 sampai 12 November 2026. Satu baris adalah kombinasi hari,
kabupaten/kota, dan jenis bencana. Baris belum tentu sama dengan kejadian (4.8 dan P-48). Data 2024
jelas tidak lengkap (3.752 baris, dibanding 8.946 pada 2025), sehingga angka utama memakai periode 12
bulan, 13 November 2025 sampai 12 November 2026 (4.185 baris).

DIBI hanya bisa menguji K1, K2, dan K3. DIBI tidak punya kolom luas lahan, permintaan bantuan, atau
status darurat, sehingga K4, K5, dan K6 tidak bisa diuji langsung. Definisi uji:

- K1: meninggal paling sedikit 1;
- K2: terdampak (kolom DIBI "menderita") ditambah luka dan mengungsi paling sedikit 50. Bila K2
  dibaca sebagai salah satu kategori saja yang mencapai 50, jumlah baris yang lolos minimal satu
  kriteria hanya turun dari 1.903 ke 1.899, sehingga tafsir ini tidak mengubah kesimpulan;
- K3: rumah rusak berat, sedang, dan ringan ditambah satuan pendidikan, rumah ibadah, fasilitas
  kesehatan, kantor, dan jembatan rusak paling sedikit 5. Rumah terendam tidak dihitung.

### 4.3.2 Berapa yang lolos

Tabel 4.1. Baris DIBI yang memenuhi sedikitnya satu dari K1 sampai K3

| Periode | Baris | Lolos | Persen lolos |
| --- | ---: | ---: | ---: |
| 2025 | 8.946 | 3.682 | 41,2 |
| 2026 (1 Januari sampai 12 November) | 3.276 | 1.363 | 41,6 |
| 12 bulan (13 November 2025 sampai 12 November 2026) | 4.185 | 1.903 | 45,5 |

Sumber: tarikan DIBI 12 November 2026, `analisis/hasil/uji_kriteria.json`.

Lebih dari separuh baris DIBI tidak memenuhi satu pun kriteria dampak. Separuhnya adalah
karhutla (1.191 dari 2.282 baris yang tidak lolos dalam 12 bulan), yang mungkin lolos lewat K4 tetapi
tidak bisa dibuktikan dari DIBI.

### 4.3.3 Kriteria penentu tunggal

Tabel 4.2. Kombinasi kriteria pada 4.185 baris DIBI 12 bulan

| Kombinasi | Baris | Persen dari yang lolos |
| --- | ---: | ---: |
| Hanya K2 | 973 | 51,1 |
| K2 dan K3 | 440 | 23,1 |
| Hanya K3 | 273 | 14,3 |
| Hanya K1 | 106 | 5,6 |
| K1, K2, dan K3 | 67 | 3,5 |
| K1 dan K2 | 32 | 1,7 |
| K1 dan K3 | 12 | 0,6 |
| Tidak satu pun | 2.282 | bukan bagian dari yang lolos |

Sumber: sama dengan Tabel 4.1.

K2 adalah penentu tunggal untuk separuh kejadian yang lolos. Artinya definisi "terdampak", yang paling
kabur di antara semua istilah (4.7), menentukan masuk atau tidaknya separuh baris DIBI yang lolos
ambang.

### 4.3.4 Kepekaan angka

Tabel 4.3. Jumlah baris lolos bila satu atau semua angka diubah (DIBI 12 bulan)

| Skenario | Baris lolos | Perubahan dari 1.903 |
| --- | ---: | ---: |
| Juklak saat ini (1 orang, 50 orang, 5 unit) | 1.903 | 0 |
| 1, 10, 1 (lebih longgar) | 2.484 | +30,5% |
| 1, 100, 5 | 1.753 | -7,9% |
| 1, 50, 10 | 1.691 | -11,1% |
| 3, 100, 10 | 1.433 | -24,7% |
| 10, 500, 50 | 787 | -58,6% |
| EM-DAT (10 meninggal atau 100 terdampak) | 1.212 | -36,3% |
| Logika DAN (ketiganya harus terpenuhi) | 67 | -96,5% |

Sumber: sama dengan Tabel 4.1.

Per kriteria tunggal: baris yang memenuhi K1 berjumlah 217 pada ambang 1 orang, 65 pada ambang 3
orang, dan 33 pada ambang 10 orang. Baris yang memenuhi K2 berjumlah 2.095 pada 10 orang, 1.512 pada
50 orang, 1.207 pada 100 orang, dan 700 pada 500 orang. Baris yang memenuhi K3 berjumlah 1.291 pada 1
unit, 792 pada 5 unit, 540 pada 10 unit, dan 180 pada 50 unit.

Dua pelajaran dari tabel ini:

1. Angka kejadian sangat peka terhadap K3 di sekitar 5 sampai 10 unit dan terhadap K2 di sekitar 50
   sampai 100 orang. Pilihan angka di wilayah itu menggeser jumlah baris yang lolos 8 sampai 11
   persen.
2. Mengubah angka tidak membuat sistem lebih benar, hanya membuat jumlah kejadian lebih kecil atau
   lebih besar. Yang menentukan benar atau tidaknya adalah apakah ambang itu memisahkan kejadian
   yang memang memerlukan perhatian pemerintah dari yang tidak. Untuk itu dibutuhkan pembanding,
   misalnya kejadian yang memicu status darurat atau dana siap pakai. Pembanding itu belum ada di
   repo dan menjadi agenda riset (Bab 10.4).

### 4.3.5 Penanda `is_bencana` di DIBI

DIBI menyimpan kolom `is_bencana`. Kolom ini tidak tertulis di Juklak, dan isinya berubah tajam
antartahun: pada 2024 hanya 93 dari 3.752 baris bertanda bukan bencana, pada 2025 sebanyak 3.705 dari
8.946, dan pada 2026 sebanyak 771 dari 3.276. Di luar karhutla, tanda ini sama dengan hasil uji K1
sampai K3 pada 93,7 persen baris 2025 dan 94,5 persen baris 2026. Jadi DIBI tampaknya menerapkan ambang
Juklak secara penuh baru sejak 2025, dan baris yang tidak lolos tetap disimpan dengan tanda bukan
bencana.

Akibatnya penting untuk penyajian (P-35): jumlah "kejadian bencana" DIBI sebelum 2025 dan sesudah 2025
dihitung dengan aturan berbeda. Kenaikan atau penurunan antara 2024 dan 2025 tidak boleh dibaca
sebagai perubahan bahaya sebelum aturan hitungnya diseragamkan. Arti resmi kolom ini perlu
dikonfirmasi ke Pusdatinkom (Lampiran E.4 butir 1).

## 4.4 Logika ATAU: 1 meninggal setara dengan 1 hektare

Logika ATAU berarti satu kriteria cukup. Konsekuensinya, kejadian yang sangat berbeda masuk
hitungan dengan bobot yang sama: satu kejadian.

- 273 baris DIBI 12 bulan lolos hanya karena K3. Dari jumlah itu, 212 baris hanya memuat 5 sampai 9
  unit rusak, dan 28 baris tanpa satu pun korban (meninggal, hilang, luka, terdampak, dan mengungsi
  semuanya nol).
- 71 baris lolos hanya karena tepat 1 orang meninggal, tanpa kerusakan dan tanpa 50 terdampak.
  Juklak tidak mengatur atribusi, sehingga satu orang tersambar petir atau tenggelam di sungai saat
  hujan dapat memenuhi K1 (P-52).
- Di ujung lain, satu baris banjir Aceh Utara 28 November 2025 memuat 246 meninggal, 739.710
  terdampak, dan 91.286 rumah rusak. Baris itu dan baris 1 orang meninggal sama-sama bernilai satu
  kejadian.

Ketimpangan bobot ini bukan cacat logika ATAU sendiri. Ambang masuk memang bertugas memutuskan
ya atau tidak, bukan seberapa besar. Masalahnya, DIBI dan laporan pimpinan memakai **jumlah
kejadian** sebagai ukuran utama, sehingga keputusan ya atau tidak itu dibaca sebagai ukuran besar.
Dampak di DIBI sangat timpang: 85,5 persen dari 1.897 orang meninggal dalam 12 bulan berasal dari 1
persen baris teratas (41 baris), dan 94,8 persen baris tidak memuat korban meninggal sama sekali.
Untuk terdampak, 64,0 persen dari 12,5 juta orang berasal dari 1 persen baris teratas (P-37).

Mengganti ATAU dengan DAN bukan jalan keluar. Logika DAN memangkas kejadian 96,5 persen (dari 1.903
menjadi 67 baris) dan membuang kejadian dengan korban jiwa tanpa kerusakan, seperti longsor yang
menimbun orang di kebun. Jalan keluarnya adalah memisahkan tugas: ambang tetap ATAU (L2), dan
besar-kecil diukur oleh skala keparahan tersendiri (L3).

## 4.5 Kecocokan per jenis bencana

Tabel 4.4. Persen baris DIBI yang lolos K1 sampai K3 menurut jenis (12 bulan)

| Jenis | Baris | Persen lolos | Penentu tunggal terbanyak |
| --- | ---: | ---: | --- |
| Kekeringan | 129 | 94,6 | K2 (122 baris) |
| Gelombang pasang dan abrasi | 21 | 81,0 | K2 |
| Banjir | 1.188 | 76,6 | K2 (717 baris) |
| Gempa bumi | 60 | 71,7 | K3 |
| Cuaca ekstrem | 922 | 56,3 | K3 (178 baris) |
| Kebakaran permukiman | 188 | 48,9 | K1 |
| Erupsi gunung api | 14 | 42,9 | K2 |
| Tanah longsor | 431 | 36,4 | K3 |
| Karhutla | 1.208 | 1,4 | K2 (9 baris) |

Sumber: sama dengan Tabel 4.1.

Temuan per jenis:

1. **Kekeringan.** Hampir semua lolos, dan seluruhnya lewat K2. Kekeringan tidak menimbulkan korban
   jiwa atau rumah rusak pada data ini (K1 dan K3 nol); yang tercatat adalah penduduk terdampak,
   dengan median 3.600 orang per baris (`analisis/hasil/tambahan_C.json`). Ambang 50 orang hampir tidak menyaring apa pun untuk kekeringan. Kepekaan
   K2 50 ke 500 hanya menurunkan kekeringan dari 122 ke 105 baris. Panduan Laporan Menonjol
   Pusdalops sudah memakai ambang lebih tinggi untuk kekeringan (200 KK atau 800 orang).
2. **Banjir.** 76,6 persen lolos, 717 baris lewat K2 saja. Banjir genangan di kawasan padat dengan
   mudah melampaui 50 orang terdampak, sedangkan banjir dengan luas sama di desa jarang penduduk lebih
   sulit mencapainya (P-17).
3. **Cuaca ekstrem.** Penentu tunggal terbanyaknya K3 (178 baris), yaitu rumah rusak. Lima rumah rusak ringan
   akibat angin dihitung setara dengan lima rumah roboh akibat gempa (P-26).
4. **Karhutla.** Hanya 1,4 persen lolos K1 sampai K3, dan 98,7 persen dari 3.646 baris karhutla DIBI
   2024 sampai 2026 tidak memuat dampak apa pun. Meski begitu, 1.129 baris karhutla 12 bulan bertanda
   `is_bencana` benar, dan 1.113 di antaranya tidak memenuhi K1 sampai K3. Dugaan terkuat: karhutla
   masuk hitungan lewat K4 (luas), K5, atau K6, yang tidak tercatat di DIBI. Dugaan ini belum bisa
   diuji dan perlu dikonfirmasi ke Pusdatinkom. Pembaca DIBI tidak bisa memeriksa mengapa karhutla itu dianggap
   bencana. Hal yang sama berlaku untuk kebakaran permukiman: 104 baris bertanda bencana tanpa
   memenuhi K1 sampai K3.
5. **Kabut asap.** Tidak ada jenis "kabut asap" di daftar 13 jenis ancaman. Dampak asap berupa
   gangguan kesehatan dan penerbangan tidak terukur oleh K1 sampai K4. Asap dicatat lewat karhutla
   induknya, sehingga dampak di provinsi yang terkena asap tetapi tidak terbakar tidak punya
   tempat (P-10, P-64).
6. **Abrasi.** Abrasi berlangsung bertahun-tahun. Ambang hektare tidak menyebut hilangnya daratan,
   dan ambang unit hanya terpenuhi saat rumah sudah rusak. Abrasi masuk hitungan pada saat
   kerusakan sudah terjadi, tidak pada saat ancamannya diukur (P-10).

Kesimpulan bagian ini: satu set ambang untuk semua jenis bencana menyaring dengan kekuatan yang
sangat berbeda, dari 94,6 persen lolos (kekeringan) sampai 1,4 persen (karhutla) pada Tabel 4.4. Kekeringan nyaris tidak tersaring, karhutla tersaring oleh kriteria yang tidak
terekam, dan cuaca ekstrem tersaring oleh kerusakan ringan.

## 4.6 Kriteria administratif K5 dan K6

K5 (permintaan pemerintah daerah untuk bantuan nasional) dan K6 (penentuan status keadaan darurat)
bukan ukuran dampak. Keduanya ukuran **respons**. Ada empat masalah.

1. **Melingkar.** Sesuatu menjadi bencana karena dinyatakan bencana. UU 24/2007 Pasal 51 ayat (1)
   menyatakan status ditetapkan "sesuai dengan skala bencana", sehingga status seharusnya akibat dari
   penilaian dampak, bukan penggantinya (P-15).
2. **Bergantung pada kapasitas dan kemauan daerah.** Kabupaten yang mampu menangani sendiri tidak
   meminta bantuan dan mungkin tidak menetapkan status. Penetapan status membuka kemudahan akses
   (UU 24/2007 Pasal 50), sehingga ada dorongan untuk menetapkannya; apakah daerah berkapasitas
   rendah lebih cepat menetapkan status belum diuji dan masuk daftar wawancara.
   Dua kejadian yang sama dampaknya bisa berbeda nasib pencatatannya (P-15, P-16, P-33). Arsip
   logbook Pusdalops tiga tahun terakhir hanya mengisi status keadaan darurat pada 25,7 persen
   kejadian (`juklak/DATA-DAMPAK.md`), sehingga K6 pun tidak tercatat rapi.
3. **Status payung dan status pendahulu.** Status siaga darurat karhutla provinsi lazim berlaku
   berbulan-bulan dan diperpanjang. Selama status berlaku, setiap api kecil secara harfiah memenuhi
   K6 (P-62). Status siaga darurat juga ditetapkan sebelum dampak terjadi, sedangkan PP 21/2008
   menyatakan status keadaan darurat "dimulai sejak status siaga darurat". Jadi K6 bisa terpenuhi
   sebelum ada kejadian (P-63).
4. **Tidak terdefinisi.** Juklak tidak menyebut bentuk, saluran, atau bukti "permintaan". Kriteria
   f merujuk "pedoman penetapan status keadaan darurat bencana" tanpa nomor. Keadaan Tertentu
   menurut Perpres 17/2018 dan jalur dana siap pakai berbasis risiko berdampak luas menurut Perban
   BNPB 4/2020 Pasal 2 ayat (1) huruf c adalah bentuk bantuan nasional tanpa status daerah. Keduanya
   tidak disebut.

Meski begitu, K5 dan K6 punya fungsi yang sah: menangkap kejadian yang dampaknya belum terdata tetapi
jelas ditangani negara. Fungsi itu bisa dipertahankan tanpa membuat ukuran respons menjadi ukuran
dampak, yaitu dengan mencatat status dan permintaan bantuan sebagai **penanda** yang menempel pada
kejadian, beserta nomor dokumennya. Jalur masuk administratif cukup satu: SK tanggap darurat yang
menyebut kejadian tertentu (Q-05).

## 4.7 Kekaburan definisi

1. **Terdampak.** Juklak 7/2023 mendefinisikan terdampak sebagai orang yang "menderita akibat dampak
   buruk bencana, seperti kerusakan dan atau kerugian harta benda, namun masih dapat menempati tempat
   tinggalnya". Juklak 3/2022 tentang Pengkajian Cepat mendefinisikan penduduk terdampak tanpa frasa
   "masih dapat menempati tempat tinggalnya". Dua juklak BNPB berselang satu tahun memakai dua
   definisi. Di lapangan, laporan logbook memakai "jiwa berpotensi terdampak" dan "rumah terendam"
   bersama-sama, dan pengurai logbook kita menangkap keduanya dengan pola yang sama (P-53).
2. **Penjumlahan K2.** Garis miring "terkena dampak/luka/mengungsi" tidak menyatakan apakah ketiganya
   dijumlah. Bila dijumlah, satu orang yang luka dan mengungsi bisa terhitung dua kali (P-25).
3. **Tingkat kerusakan.** Huruf c tidak menyebut tingkat kerusakan mana yang dihitung. Definisi
   rusak berat ada di Lampiran I Catatan 2, sedangkan lanjutannya (rusak sedang, rusak ringan,
   terendam) ada di halaman 26 yang berupa gambar. Definisi "kerusakan bangunan" di Lampiran II juga
   memasukkan "penyusutan/berakhirnya umur bangunan" sebagai penyebab, sehingga rumah lapuk yang
   roboh tertiup angin sedang bisa dihitung (P-26).
4. **Jembatan.** Jembatan dihitung per unit, sama dengan rumah. Banjir Bener Meriah 26 November 2025
   mencatat 144 jembatan rusak, dan Padang Pariaman 7 Maret 2024 mencatat 103 jembatan. Pada K3,
   satu jembatan desa dan satu rumah sama-sama satu unit. Dalam 12 bulan, 96 baris DIBI memuat
   jembatan rusak, tetapi hanya 6 baris yang lolos K3 karena jembatan (P-26).
5. **Lahan.** Huruf d tidak memakai kata "rusak". Satu hektare lahan yang terendam semalam, satu
   hektare sawah puso, satu hektare hutan terbakar, dan satu hektare kolam yang meluap memenuhi
   kriteria yang sama (P-20).
6. **Sumber angka luas.** Juklak tidak menyebut sumber luas. Untuk karhutla, luas bisa berasal dari
   pengukuran lapangan, perkiraan petugas, atau citra satelit. Simulasi kami pada 28 hari data
   satelit VIIRS (15 Oktober sampai 11 November 2026) menunjukkan satu piksel deteksi sudah
   mewakili 14,06 ha, sehingga ambang 1 ha tidak bisa diperiksa dari satelit sama sekali (P-60).
7. **Rumah terendam.** Lampiran I memisahkan terendam dari rusak berat, sedang, dan ringan, dan huruf
   c hanya menyebut "rusak". Dalam 12 bulan, 74 baris DIBI memuat 5 rumah terendam atau lebih tetapi
   tidak lolos satu pun kriteria. Panduan Logbook Pusdalops justru menyatakan untuk banjir
   "terdampak = terdampak + terendam" (P-54).

## 4.8 Urutan penerapan: ambang sebelum atau sesudah kejadian digabung

Juklak 7/2023 Bab II huruf B angka 3 tidak menyatakan apakah ambang diterapkan pada satuan laporan (satu kabupaten pada satu hari)
atau pada kejadian utuh setelah semua laporannya digabung. Pilihan ini mengubah angka.

1. **Karhutla.** Simulasi pada data satelit VIIRS 15 Oktober sampai 11 November 2026 membandingkan dua
   urutan: (a) menyaring tiap kelompok api harian dengan ambang luas lalu menggabungkannya, dan (b)
   menggabungkan dulu lalu menyaring. Pada ambang 50 ha, urutan (a) menghasilkan 6.771 kejadian dan
   urutan (b) 7.714, selisih 12,2 persen. Pada ambang 100 ha selisihnya 20,4 persen (2.284 lawan
   2.869). Menyaring lebih dulu membuang api yang tumbuh pelan dan kelompok kecil yang menjadi
   jembatan antara dua api besar (P-13, P-14).
2. **Kejadian lintas kabupaten.** Juklak Bab II huruf B angka 4 huruf b menghitung kejadian lintas
   wilayah sebagai satu kejadian di tingkat nasional, tetapi satu kejadian per kabupaten di tingkat
   kabupaten. Ambangnya tidak disebut berlaku di tingkat mana. Gempa NTT 15 Agustus 2026 tercatat di
   DIBI pada 11 kabupaten masing-masing 0,091 kejadian. Bila ambang diterapkan per kabupaten,
   kabupaten yang hanya mengalami 3 rumah rusak tidak masuk; bila diterapkan pada gempa utuh, semua
   kabupaten terdampak ikut tercatat (P-05, P-48).
3. **Laporan susulan.** Di logbook harian Pusdalops 2026, 124 dari 975 kejadian yang akhirnya
   memenuhi ambang (12,7 persen) tidak memenuhinya pada laporan pertama. Pemicunya kebanyakan K2 (87
   kejadian). Bila ambang diterapkan pada laporan hari pertama, satu dari delapan kejadian yang layak
   akan terlewat (P-42, P-27).

Kesimpulan: ambang harus diterapkan **sesudah** kejadian dibentuk (L1) dan pada **versi angka
terakhir yang sah**, bukan pada laporan harian per kabupaten. Ini menuntut aturan unit kejadian (L1)
dan aturan versi angka (D) ditetapkan lebih dulu daripada ambang. Urutan inilah yang membuat P-01
dan P-27 menjadi paradoks inti (Bab 5).

## 4.9 Fungsi kriteria: hanya ambang masuk

Enam kriteria Bab II huruf B angka 3 hanya menjawab satu pertanyaan: apakah sebuah kejadian dicatat sebagai kejadian
bencana. Kriteria ini tidak menjawab dua pertanyaan lain yang selama ini dibebankan kepadanya:

- **Apa yang dihitung sebagai satu kejadian (L1).** Juklak memberi tiga aturan hitung (tipe utama,
  lintas wilayah, dua lokasi satu hari) dan Kode Identitas Bencana 16 digit, tetapi tidak mengatur
  api yang menyatu, banjir yang surut lalu naik lagi, gempa susulan, atau kapan kejadian berakhir.
  KIB hanya memuat satu kabupaten (episentrum) dan satu digit indeks, sehingga paling banyak sembilan
  kejadian sejenis per kabupaten per hari bila indeks dimulai dari 1 seperti contoh Juklak.
- **Seberapa besar (L3).** Logika ATAU memberi bobot sama pada 1 orang meninggal dan 246 orang
  meninggal. Pertanyaan "bencana besar" harus dijawab oleh skala keparahan yang dirancang di Bab 6,
  dengan bahan dari UU 24/2007 Pasal 7 ayat (2).

Pemisahan tiga lapis ini adalah prasyarat semua vonis di bagian berikut.

## 4.10 Vonis per kriteria

Tabel 4.5. Vonis kriteria ambang batas Juklak 7/2023

| Kriteria | Vonis | Alasan berbasis data | Arah revisi (dirinci di Bab 6) | Paradoks |
| --- | --- | --- | --- | --- |
| a. 1 orang meninggal | **Pertahankan, perjelas** | Penentu tunggal hanya 106 dari 1.903 baris (5,6 persen); 217 baris memenuhi K1 dalam 12 bulan. Biayanya kecil dan kematian adalah dampak paling pasti. | Tambah aturan atribusi: kematian langsung akibat bahaya dalam masa kejadian. Kematian tidak langsung dan korban hilang dicatat terpisah, tidak memicu K1. | P-23, P-24, P-52 |
| b. 50 orang terdampak, luka, atau mengungsi | **Revisi** | Penentu tunggal 51,1 persen kejadian. Kekeringan lolos 94,6 persen seluruhnya lewat K2. Definisi terdampak berbeda antarjuklak. | Pisahkan: luka dan mengungsi (sudah pasti) dengan ambang sendiri; terdampak hanya bila definisi operasionalnya dipenuhi (rumah atau mata pencaharian terkena langsung), tidak termasuk "berpotensi terdampak" dan evakuasi preventif. Tegaskan tidak dijumlah antarkategori. Kaji ambang per jenis atau relatif terhadap penduduk. | P-17, P-25, P-51, P-53 |
| c. 5 unit rumah dan/atau fasilitas publik rusak | **Revisi** | 212 dari 273 baris yang lolos hanya lewat K3 memuat 5 sampai 9 unit; 28 baris tanpa korban. Tingkat kerusakan dan daftar fasilitas tidak disebut di bunyi kriteria. | Hitung setara rusak berat (bobot per tingkat) atau minimal sebut tingkat yang dihitung. Rumah terendam dikeluarkan atau diberi ambang tersendiri. Jembatan dan prasarana dipisah dari rumah. | P-26, P-54 |
| d. 1 hektare lahan | **Ganti** | Tidak bisa diuji: DIBI tidak punya kolom luas, padahal 1.113 baris karhutla 12 bulan bertanda bencana tanpa memenuhi K1 sampai K3, sehingga diduga masuk lewat kriteria ini. Tidak menyebut kerusakan dan jenis lahan. Satu piksel satelit sudah 14 ha. Laporan Menonjol memakai 2 ha untuk karhutla. | Ganti dengan ambang per jenis lahan dan per bahaya: luas terbakar terverifikasi untuk karhutla, sawah puso untuk banjir dan kekeringan, dengan sumber angka luas wajib dicatat. Angkanya dipilih di Bab 6.3 (Q-04). | P-13, P-20, P-40, P-60 |
| e. Permintaan bantuan nasional | **Ganti menjadi penanda** | Ukuran respons, bukan dampak; bergantung kapasitas daerah; tidak terdefinisi bentuk dan buktinya; tidak tercatat di DIBI. | Catat sebagai penanda kejadian dengan nomor surat, bukan jalur masuk. Satu-satunya jalur masuk administratif adalah SK tanggap darurat yang menyebut kejadian tertentu (baris f), dengan tanda "masuk lewat jalur administratif" (Q-05). | P-15, P-16, P-33, P-65 |
| f. Status keadaan darurat | **Ganti menjadi penanda** | Melingkar; status siaga mendahului kejadian; status payung karhutla meliputi berbulan-bulan; hanya 25,7 persen kejadian logbook mengisi status. | Hanya SK tanggap darurat yang menyebut kejadian tertentu yang boleh menjadi jalur masuk. Status siaga dan status payung dicatat sebagai konteks, bukan pemicu. | P-15, P-62, P-63 |
| Logika ATAU | **Pertahankan** | Logika DAN memangkas 96,5 persen kejadian. | Catat kriteria mana yang memicu masuknya kejadian (kolom "dasar masuk") supaya dapat diaudit. | P-13 |
| Urutan penerapan | **Tetapkan** | Selisih 12 sampai 20 persen pada karhutla; 12,7 persen kejadian logbook baru lolos di laporan susulan. | Ambang diterapkan sesudah kejadian dibentuk (L1) dan pada versi angka terakhir yang sah. | P-01, P-14, P-27, P-42 |

Catatan: angka pengganti diusulkan di Bab 6.3 dan diuji pada data di Bab 7.3. Angka itu belum
dikalibrasi terhadap respons negara karena pembandingnya belum tersedia (lihat 4.3.4 butir 2 dan Bab
10.4).
