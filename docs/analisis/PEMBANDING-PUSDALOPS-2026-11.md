# Pembanding angka kita dengan versi resmi BMKG dan Pusdalops BNPB (Nov 2026)

Dibuat 1 Nov 2026. Hanya angka agregat: tanpa nama orang, nomor telepon, atau nama korban.
Berkas sumber ada di `data/raw/pusdalops-drive/2026/` (di-gitignore). Angka kita dihitung ulang dari
data mentah repo, bukan dari kartu di layar.

## Ringkasan: lima temuan utama

1. Faktsheet BMKG 19 Okt 2026 menghitung 1.744 titik panas nasional untuk 18 Okt, dan angka itu
   **cocok persis, di 23 provinsi, dengan hitungan ulang kita** bila definisinya: MODIS (Terra dan Aqua),
   VIIRS S-NPP, dan VIIRS NOAA-20, hanya keyakinan tinggi, titik mentah (tanpa buang kembaran), hari WIB
   00 sampai 23, NOAA-21 tidak ikut. Angka headline kita untuk hari yang sama 20.348, yaitu 11,7 kali lipat,
   murni karena beda definisi, bukan beda data.
2. Rekap Harian Pusdalops 2026 berisi 3.662 baris Jan sampai Okt dan **logbook kita menghasilkan 3.576
   kejadian unik bertanggal kejadian sama (rasio 0,98; korelasi bulanan 0,96)**. Banjir 798 lawan 796,
   longsor 423 lawan 428, karhutla 1.006 lawan 1.030. Mesin pengurai logbook kita setara dengan rekap manual mereka.
3. Rekap harian per jenis (Rekap bencana 2026, dilengkapi Grafik trend) dan logbook kita berkorelasi tinggi
   (banjir 0,94, cuaca 0,90, kekeringan 0,86, gempa 0,85), tetapi **kita menghitung 1,25 kali lebih banyak**
   (10.817 lawan 8.683 kab-hari) karena satuan kita memuat baris pembaruan kejadian yang masih berjalan.
   Selisih terbesar Jun dan Jul (1,41 dan 1,56 kali), terutama karhutla dan gempa.
4. Kolom "Referensi Log Book" di Rekap Harian terisi di 3.653 dari 3.662 baris (99,8 persen), tetapi isinya
   **nomor urut dalam berkas logbook harian, tanpa tanggal**. Dengan tebakan tanggal kejadian sampai dua hari
   sesudahnya plus kabupaten, 2.671 dari 3.638 baris bertanggal sah (73,4 persen) bisa ditautkan ke logbook kita; sisanya tidak bisa
   dipastikan tanpa kolom tanggal logbook.
5. Logbook kita **lebih lengkap dari rekap Pusdalops sendiri**: rekap harian per jenis hanya punya 200 dari
   274 hari (tidak ada 6 Agu sampai 27 Sep, 53 hari berturut-turut) dan 10 hari di antaranya kosong
   (templat belum diisi); logbook kita memuat 305 hari. Sebaliknya, laporan bulanan satu kabupaten
   (Lingga, Jan sampai Mei) mencatat 75 kejadian sedangkan logbook Pusdalops memuat 15 untuk kabupaten itu
   (rasio 5 banding 1): logbook adalah apa yang dinaikkan BPBD, bukan sensus.

## 1. Titik panas: faktsheet BMKG 19 Okt 2026 lawan kita

### Metode

- Faktsheet BMKG (berlaku 19 sampai 25 Okt): kalimat "deteksi titik panas dengan tingkat kepercayaan tinggi
  pada 18 Oktober 2026 (00 sampai 23 WIB)", total nasional 1.744, rincian 23 provinsi.
- Kita ulang dari CSV FIRMS mentah (`data/raw/firms/*.csv`: MODIS, VIIRS S-NPP, NOAA-20, NOAA-21; semuanya
  versi NRT untuk 18 Okt), dipetakan ke provinsi dengan poligon kecamatan repo (`scripts/data/wilayah.py`),
  hari kalender WIB (UTC tambah 7 jam). Keyakinan memakai `kelas_yakin` kita: MODIS 80 ke atas, VIIRS "h" = tinggi.
- Definisi headline kita (`scripts/data/titik_unik.py`, keputusan pemilik 25 dan 28 Okt): lokasi unik sel
  375 m per hari WIB, empat satelit, semua keyakinan, tanpa sumber panas tetap.

### Tangga definisi untuk 18 Okt 2026 (WIB, dalam poligon provinsi)

| Langkah | Definisi | Jumlah |
| --- | --- | ---: |
| A | Titik mentah, keyakinan tinggi, MODIS + S-NPP + NOAA-20 | 1.744 |
| B | A ditambah NOAA-21 (keyakinan tinggi) | 2.119 |
| C | Mentah, keyakinan sedang dan tinggi, empat satelit | 29.008 |
| D | Mentah, semua keyakinan, empat satelit | 30.660 |
| E | D dijadikan lokasi unik 375 m | 20.489 |
| F | E dikurangi sumber panas tetap (angka terbit kita) | 20.348 |

Angka BMKG sama dengan baris A. Rasio kita (F) terhadap BMKG: 20.348 dibagi 1.744 sama dengan 11,7.
Pemecahan baris B menurut satelit (keyakinan tinggi, mentah): MODIS 1.155, S-NPP 219, NOAA-20 370, NOAA-21 375.
Mengganti hari WIB dengan hari UTC (18 Okt 00 sampai 23 UTC) memberi 1.804, bukan 1.744, jadi BMKG memang
memakai hari WIB seperti tertulis.

### Per provinsi (keyakinan tinggi, mentah)

| Provinsi | BMKG | Kita, definisi A | Selisih | Kita, A plus NOAA-21 |
| --- | ---: | ---: | ---: | ---: |
| Kalimantan Tengah | 937 | 937 | 0 | 1.027 |
| Kalimantan Barat | 231 | 231 | 0 | 253 |
| Papua Selatan | 143 | 143 | 0 | 270 |
| Sumatera Selatan | 66 | 66 | 0 | 118 |
| Papua Pegunungan | 59 | 59 | 0 | 73 |
| Kalimantan Timur | 47 | 47 | 0 | 56 |
| Jawa Timur | 36 | 36 | 0 | 49 |
| Nusa Tenggara Barat | 36 | 36 | 0 | 36 |
| Papua Tengah | 35 | 35 | 0 | 37 |
| Kalimantan Selatan | 30 | 30 | 0 | 34 |
| Papua Barat | 19 | 19 | 0 | 19 |
| Kepulauan Bangka Belitung | 17 | 17 | 0 | 17 |
| Maluku | 16 | 16 | 0 | 30 |
| Sulawesi Tengah | 15 | 15 | 0 | 18 |
| Sulawesi Selatan | 13 | 13 | 0 | 15 |
| Nusa Tenggara Timur | 13 | 13 | 0 | 20 |
| Jambi | 9 | 9 | 0 | 14 |
| Lampung | 9 | 9 | 0 | 15 |
| Sulawesi Tenggara | 6 | 6 | 0 | 6 |
| Sulawesi Utara | 4 | 4 | 0 | 5 |
| Kalimantan Utara | 1 | 1 | 0 | 1 |
| Gorontalo | 1 | 1 | 0 | 3 |
| Sulawesi Barat | 1 | 1 | 0 | 1 |
| Jumlah | 1.744 | 1.744 | 0 | 2.119 |

Selisih mutlak jumlah seluruh provinsi nol. Kalimantan Tengah memikul 53,7 persen angka BMKG (937 dari 1.744)
dan 38,7 persen angka headline kita (7.866 dari 20.348).

### Riau dan tren tujuh hari

BMKG menulis Riau tidak terdeteksi titik panas dalam tujuh hari. Dengan definisi A, hasil kita untuk Riau
12 sampai 18 Okt: 0 tiap hari. Itu benar, sekaligus menjelaskan mengapa peta kita menampilkan titik di Riau
pada hari-hari itu: di definisi headline kita Riau punya 3, 0, 2, 3, 5, 0, dan 2 lokasi unik (12 sampai 18 Okt),
dan karena titik mentah keyakinan tinggi di Riau nol, semuanya keyakinan sedang atau rendah. Titik panas nasional definisi A per hari 12 sampai 18 Okt:
1.250, 1.683, 1.296, 1.076, 478, 481, 1.744. Lonjakan 18 Okt (3,6 kali hari sebelumnya) sama dengan yang
BMKG sebut "lonjakan besar"; pola Kalimantan Barat naik dan Jambi, Sumatera Selatan, Kalimantan Tengah
fluktuatif juga cocok dengan kalimat BMKG.

### Catatan mutu faktsheet BMKG

Subtotal wilayah di teks tidak sama dengan penjumlahan rincinya: Sumatera tertulis 92 tetapi rincian
9 + 9 + 17 + 66 sama dengan 101; Kalimantan tertulis 1.247, rincian 1.246; "37 titik di Jawa dan Nusa Tenggara"
padahal 36 + 36 + 13 sama dengan 85. Total nasional 1.744 sama dengan jumlah semua rincian provinsi, jadi
yang bisa dipegang rincian provinsinya, bukan subtotal wilayahnya.

### Penjelasan selisih (urut besarnya)

1. Keyakinan: membuang sedang dan rendah menurunkan 30.660 ke 2.119 (faktor 14,5). Ini sebab utama.
2. Unik 375 m lawan titik mentah: 30.660 ke 20.489 (faktor 1,5), karena NOAA-20 dan NOAA-21 melihat api yang
   sama dengan selang sekitar 50 menit, ditambah MODIS dan S-NPP.
3. NOAA-21: 2.119 lawan 1.744 (faktor 1,22). BMKG tidak memakainya.
4. Hari UTC lawan WIB: untuk keyakinan tinggi empat satelit, hari UTC memberi 1.804 dan hari WIB 2.119 (beda 15 persen).
   BMKG menulis WIB dan hitungannya cocok persis dengan WIB, jadi pembagian hari harus WIB.
5. NRT lawan arsip standar: untuk 18 Okt semua data kita NRT, sama dengan BMKG. Selisih NRT dan arsip standar
   tidak diukur di sini (baru muncul untuk hari yang sudah berganti ke arsip).

## 2. Hitungan harian per jenis bencana: Rekap bencana dan Grafik trend lawan logbook kita

### Metode

- Rekap bencana 2026: satu lembar per hari (204 lembar, 200 tanggal dapat dibaca; salinan dan lembar contoh
  dibuang). Baris 2 memuat jumlah per jenis; di bawahnya daftar kabupaten, dan jumlah sama dengan banyak kabupaten
  yang dicantumkan (diperiksa di 4 lembar sampel). Jadi satuannya kabupaten-hari.
- Grafik trend bencana 2026: lembar mingguan bertanda "DATA LOGBOOK". Dibaca 126 hari 2026. Dari 872 sel (hari x jenis)
  yang ada di keduanya, 846 sama (97,0 persen): Grafik adalah deret yang sama dengan Rekap, dan **mengisi 17 hari
  yang tidak ada di Rekap** (5 sampai 11 Jan, 16 sampai 17 Jan, 4 Jul, 27 Agu sampai 2 Sep). Deret Pusdalops
  yang dipakai di bawah = Rekap, ditambah Grafik untuk hari yang kosong atau tidak ada.
- Hari yang total semua jenisnya nol dibuang (templat belum diisi): 4 Jan, 19 sampai 25 Jan, 30 Sep, 1 Okt.
  Hasil: 207 hari yang punya isi di Pusdalops dan ada juga di logbook kita.
- Kita: `data/raw/logbook/arsip/2026/baris.jsonl`, hitungan pasangan (jenis, kabupaten) berbeda per tanggal
  logbook. Dipilih karena korelasi tertinggi di antara lima kandidat satuan dan tiga geseran tanggal (geseran
  nol hari menang jelas; geseran minus atau plus satu hari menurunkan korelasi banjir dari 0,65 ke 0,49 dan 0,47).
- Pemetaan jenis: "Bencana Non Alam (Kebakaran Pemukiman, dll)" dipasangkan dengan kebakaran permukiman,
  konflik sosial, kecelakaan, dan kegagalan teknologi kita. Gelombang pasang dan tsunami dilewati (hampir selalu
  kosong; kolom gelombang pasang kosong di lembar Januari). OMC tidak punya padanan di Pusdalops.

### Hasil per jenis (207 hari)

| Jenis | Pusdalops | Kita | Rasio kita per Pusdalops | Korelasi harian |
| --- | ---: | ---: | ---: | ---: |
| Banjir | 1.542 | 1.831 | 1,19 | 0,94 |
| Tanah longsor | 543 | 542 | 1,00 | 0,80 |
| Cuaca ekstrem | 703 | 778 | 1,11 | 0,90 |
| Kekeringan | 443 | 530 | 1,20 | 0,86 |
| Karhutla | 4.950 | 6.424 | 1,30 | 0,79 |
| Gempa bumi | 228 | 405 | 1,78 | 0,85 |
| Gunung api | 12 | 20 | 1,67 | 0,48 |
| Non alam | 262 | 287 | 1,10 | 0,69 |
| Total | 8.683 | 10.817 | 1,25 | 0,66 |

Korelasi total lebih rendah (0,66) daripada korelasi tiap jenis besar karena karhutla (hampir 60 persen total)
paling tidak seragam harian: tepat sama di 25 persen hari saja.

### Per bulan (hari yang dipakai, total semua jenis dan khusus karhutla)

| Bulan | Hari | Pusdalops | Kita | Rasio | Karhutla Pusdalops | Karhutla kita | Rasio karhutla |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Jan | 23 | 901 | 1.035 | 1,15 | 156 | 170 | 1,09 |
| Feb | 28 | 1.249 | 1.405 | 1,12 | 513 | 624 | 1,22 |
| Mar | 31 | 1.262 | 1.386 | 1,10 | 675 | 768 | 1,14 |
| Apr | 20 | 739 | 912 | 1,23 | 392 | 500 | 1,28 |
| Mei | 30 | 965 | 1.160 | 1,20 | 570 | 678 | 1,19 |
| Jun | 30 | 961 | 1.357 | 1,41 | 626 | 946 | 1,51 |
| Jul | 31 | 1.481 | 2.303 | 1,56 | 1.132 | 1.708 | 1,51 |
| Agu | 10 | 816 | 905 | 1,11 | 622 | 728 | 1,17 |
| Sep | 4 | 309 | 354 | 1,15 | 264 | 302 | 1,14 |

Bulan dengan selisih besar: Jun dan Jul. Penyebab terukur: gempa Jun 136 lawan 75 dan Jul 141 lawan 52
(daftar susulan memuat satu kabupaten berulang di banyak laporan), karhutla Jun 946 lawan 626 dan Jul 1.667
lawan 1.092. Penyebab pasti belum bisa dibuktikan dari data ini. Hipotesis: Pusdalops mengisi rekap dengan kabupaten
yang baru muncul atau berubah di hari itu, sedangkan kita menghitung semua kabupaten yang tampil di laporan hari itu
termasuk baris pembaruan kejadian yang masih berjalan. Pendukungnya: bila hanya baris non-pembaruan kita hitung,
totalnya 2.537, rasio 0,33 terhadap Pusdalops, jadi kebenaran Pusdalops ada di antara dua definisi kita.

## 3. Rekap Harian 2026: baris per bulan dan per jenis lawan logbook

### Metode

Rekap Harian 2026 memuat satu lembar per bulan (Jan sampai Des; Nov dan Des hampir kosong) dengan baris per kejadian
per kabupaten (kolom provinsi, kabupaten, kecamatan, desa, tanggal kejadian, jenis, korban, kerusakan, SK darurat,
"Referensi Log Book"). Jumlah baris: Jan 465, Feb 442, Mar 510, Apr 430, Mei 316, Jun 195, Jul 294, Agu 331,
Sep 394, Okt 285 (jumlah 3.662; Nov 8). Jenis ditulis bebas ("Banjir", "Angin Kencang", "Cuaca Ekstrem",
"Cuaca Ekstrim", "Cuaca Ekstem", "Kebakaran Hutan dan Lahan", "Karhutla" dan seterusnya), jadi saya
menormalkan dengan kata kunci. Kita: `kejadian.jsonl` (satu baris per kejadian unik, dihitung per `tgl_kejadian`),
tanpa OMC.

### Bulan

| Bulan | Baris Rekap Harian | Kejadian unik kita (tanggal kejadian) | Rasio |
| --- | ---: | ---: | ---: |
| Jan | 465 | 439 | 0,94 |
| Feb | 442 | 362 | 0,82 |
| Mar | 510 | 488 | 0,96 |
| Apr | 430 | 408 | 0,95 |
| Mei | 316 | 308 | 0,97 |
| Jun | 195 | 214 | 1,10 |
| Jul | 294 | 305 | 1,04 |
| Agu | 331 | 345 | 1,04 |
| Sep | 394 | 393 | 1,00 |
| Okt | 285 | 314 | 1,10 |
| Jumlah | 3.662 | 3.576 | 0,98 |

Korelasi bulanan total 0,96. Kejadian kita yang tanggalnya di luar 2026 (Des 2025): 79 baris, tidak masuk tabel.

### Jenis (Jan sampai Okt)

| Jenis | Rekap Harian | Kita | Rasio | Korelasi bulanan |
| --- | ---: | ---: | ---: | ---: |
| Banjir | 798 | 796 | 1,00 | 1,00 |
| Tanah longsor | 423 | 428 | 1,01 | 0,99 |
| Cuaca ekstrem | 828 | 795 | 0,96 | 1,00 |
| Karhutla | 1.006 | 1.030 | 1,02 | 1,00 |
| Kekeringan | 120 | 146 | 1,22 | 0,91 |
| Kebakaran permukiman | 267 | 261 | 0,98 | 0,64 |
| Gempa bumi | 50 | 54 | 1,08 | 0,77 |
| Gunung api | 10 | 13 | 1,30 | 0,81 |
| Lainnya dan jenis kosong | 160 | 53 | 0,33 | negatif |

Kecocokan sangat baik di jenis besar. Dua celah: "lainnya" (Rekap Harian menaruh gelombang pasang, jenis kosong 53 baris,
dan kategori bebas di sini; kita menyebar ke jenis lain) dan kebakaran permukiman Feb (49 lawan 23): ada
lonjakan yang tidak masuk logbook kita atau kita beri jenis lain.

### "Referensi Log Book"

| Bulan | Baris dengan referensi angka dan tanggal sah | Tertaut ke logbook kita | Persen |
| --- | ---: | ---: | ---: |
| Jan | 459 | 329 | 71,7 |
| Feb | 439 | 306 | 69,7 |
| Mar | 505 | 400 | 79,2 |
| Apr | 429 | 364 | 84,8 |
| Mei | 316 | 246 | 77,8 |
| Jun | 195 | 153 | 78,5 |
| Jul | 292 | 201 | 68,8 |
| Agu | 329 | 220 | 66,9 |
| Sep | 391 | 255 | 65,2 |
| Okt | 283 | 197 | 69,6 |
| Jumlah | 3.638 | 2.671 | 73,4 |

Terisi: 3.653 dari 3.662 baris (99,8 persen); kosong 9. Tidak memuat tanggal berkas, jadi bukan kunci unik.
Cara menautkan: nomor urut `no` di berkas logbook yang tanggalnya sama dengan tanggal kejadian sampai dua hari
sesudahnya, dan nama kabupaten ikut tercantum. Satu nilai berupa tanggal yang terketik sebagai angka (11102026),
14 baris tanggal kejadian rusak. Kenaikan peluang tautan butuh kolom tanggal logbook di sisi Pusdalops.

## 4. Kolom lain: Laporan Bulanan Bencana 2026

Berkas ini berisi laporan bulanan satu kabupaten (Lingga, Kepulauan Riau) untuk Jan sampai Mei, bukan nasional:
27, 22, 15, 10, dan 1 baris kejadian (jumlah 75), dominan karhutla (53 baris). Logbook Pusdalops kita memuat
3, 2, 6, 2, dan 2 kejadian untuk kabupaten itu pada bulan yang sama (jumlah 15). Selisih ini menandai bahwa logbook
nasional hanya memuat yang dinaikkan BPBD, bukan semua kejadian.

## 5. Daftar perbaikan untuk pipeline kita

Hanya yang bersumber dari ketidakcocokan definisi di sisi kita.

1. **Tambahkan seri "kriteria BMKG" di samping seri headline.** Hitung per hari WIB: MODIS + S-NPP + NOAA-20,
   keyakinan tinggi, titik mentah, per provinsi. Rujukan: `scripts/data/titik_hari.py` dan `public/data/titik_tahun.json`
   (yang sekarang hanya menyimpan unik semua keyakinan). Tujuannya agar kartu "titik panas" yang dibandingkan
   publik dengan BMKG dan SiPongi punya padanan 1 banding 1, dan faktor 11,7 bisa dijelaskan di kartu itu juga.
   Catatan jadwal: S-NPP pensiun 1 Nov 2026, jadi definisi BMKG akan bergeser; seri ini perlu catatan versi.
2. **Simpan keyakinan tertinggi per sel, bukan keyakinan deteksi pertama.** `tandai_unik` menandai deteksi pertama
   tiap sel 375 m dengan keyakinannya sendiri. Pada 18 Okt hanya 1.085 sel berlabel tinggi, padahal 1.915 sel punya
   setidaknya satu deteksi tinggi (selisih 43 persen). Saringan "keyakinan tinggi" di peta dan tabel yang
   memakai berkas hari akan menyusut diam-diam. Ubah supaya sel menyimpan maksimum keyakinan semua deteksi
   (dan, bila perlu, jumlah satelit yang melihatnya).
3. **Beri label definisi pada angka titik panas yang bersanding dengan BMKG di deck dan kartu.**
   Kalimat ringkas: "20.348 lokasi unik semua keyakinan; versi BMKG 1.744 titik keyakinan tinggi".
   Tanpa itu pembaca mengira satu dari dua angka salah.
4. **Satuan hitungan harian logbook.** Untuk angka yang dibandingkan dengan rekap Pusdalops pakai "kejadian unik
   per tanggal kejadian" (cocok 0,98 dengan Rekap Harian, 1,00 untuk banjir dan longsor), bukan "kabupaten
   dalam laporan hari itu" (1,25 kali Rekap bencana). Jika yang dipertahankan kabupaten-hari, buang baris
   pembaruan atau beri label "kejadian aktif" agar tidak dibaca sebagai kejadian baru.
5. **Gempa dan karhutla Jun sampai Jul.** Gempa kita 1,78 kali Pusdalops; kemungkinan susulan dihitung per laporan.
   Beri aturan: satu gempa utama dan susulannya satu kejadian (kunci pada tanggal dan wilayah). Periksa
   `scripts/data/logbook_*.py` untuk gabungan pembaruan.
6. **Peta kosong yang tampak palsu.** Pusdalops punya 10 hari templat kosong dan 53 hari tanpa lembar; jangan
   anggap hari itu "tidak ada kejadian". Saat membandingkan, saring hari yang total semua jenisnya nol.
7. **Tautan Referensi Log Book.** Bila ingin mengisi tautan otomatis, pakai aturan nomor urut + kabupaten + jendela
   tanggal 0 sampai 2 hari (73 persen terpetakan), dan tandai sisanya "tak terpetakan"; jangan paksa.

## 6. Cara mengulang

Skrip hitung ada di folder sementara sesi analisis (di luar repo), belum dimasukkan ke repo
(`hs18.py` titik 18 Okt, `hs7.py` tren tujuh hari, `rekap.py` dan `grafik.py` baca Pusdalops, `banding.py` dan
`banding2.py` banding harian, `harian.py` dan `harian2.py` Rekap Harian). Bila pemilik setuju seri BMKG dijadikan
bagian pipeline, pindahkan `hs18.py` ke `scripts/data/` sebagai uji definisi dengan faktsheet sebagai fixture.

## Batas dan hal yang tidak dipastikan

- Definisi BMKG disimpulkan dari kecocokan persis di satu hari (18 Okt); belum diuji di hari lain karena
  faktsheet hanya memuat satu hari.
- Pemetaan jenis Pusdalops ke jenis kita memakai kata kunci; kategori bebas "lainnya" tidak bisa dibandingkan andal.
- Alasan pasti kabupaten-hari kita lebih tinggi 25 persen (hipotesis di bagian 2) belum terbukti.
- Rekap bencana 2026 tidak memuat 6 Agu sampai 27 Sep; Grafik hanya menutup 27 Agu sampai 2 Sep, jadi 6 sampai 26 Agu
  dan 3 sampai 27 Sep tidak punya padanan Pusdalops.
