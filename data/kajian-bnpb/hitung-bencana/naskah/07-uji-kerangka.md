# BAB 7 Uji Kerangka

Status: Fase 2. Angka dari `analisis/hasil/sim_kerangka.json` (`riset/SIM-KERANGKA.md`), matriks dari
Lampiran B, uji konsistensi dari `riset/UJI-KONSISTENSI.md`, uji adversarial dari `riset/ADVERSARIAL.md`.


Kerangka diuji dengan empat cara, seperti uji unit pada perangkat lunak: (1) tiap paradoks dijawab
atau tidak oleh kerangka; (2) tidak ada dua jawaban yang saling bertentangan; (3) kerangka diterapkan
pada data DIBI 2024 sampai 2026 dan logbook 2026 lalu dibandingkan dengan angka resmi; (4) pemeriksa
yang tidak ikut menulis mencoba mematahkannya dengan kasus baru.

## 7.1 Matriks paradoks terhadap kerangka

Setiap paradoks dari 65 paradoks di Lampiran A diuji terhadap kerangka: TERJAWAB bila aturan kerangka memberi satu
jawaban yang dapat diterapkan operator tanpa tafsir tambahan, SEBAGIAN bila arahnya ada tetapi masih
bergantung pada angka bawaan, data yang belum ada, atau keputusan di luar BNPB, dan GAGAL bila kerangka
tidak menjawab atau jawabannya bertentangan dengan rekomendasi paradoks itu. Matriks lengkap ada di
Lampiran B.

Tabel 7.1. Status 65 paradoks terhadap kerangka versi 2.1

| Kelompok | Jumlah | TERJAWAB | SEBAGIAN | GAGAL |
| --- | ---: | ---: | ---: | ---: |
| A Identitas kejadian | 18 | 13 | 5 | 0 |
| B Ambang masuk | 14 | 9 | 5 | 0 |
| C Ukuran dan korban | 13 | 9 | 4 | 0 |
| D Kerugian dan uang | 4 | 3 | 1 | 0 |
| E Klasifikasi besar, sedang, kecil | 5 | 2 | 3 | 0 |
| F Penyajian | 7 | 3 | 4 | 0 |
| G Kelembagaan | 4 | 3 | 1 | 0 |
| Jumlah | 65 | 42 | 23 | 0 |

Sumber: Lampiran B, Tabel B.3.

Pada kerangka versi 1, dua paradoks GAGAL: P-47 (bencana nonalam dan sosial memakai ambang yang sama)
dan P-57 (penyebab manusia tidak punya tempat). Versi 2.1 menambah pintu masuk lewat otoritas sektor
untuk epidemi dan konflik, serta atribut pemicu dominan, sehingga keduanya terjawab. Status SEBAGIAN
yang tersisa berasal dari empat sebab: bagian aturan yang belum dirinci (cara menghitung luas gabungan
karhutla, P-01), angka bawaan yang belum diuji pada musim penuh (P-04, P-06), rekomendasi yang belum
masuk Bab 6 (P-43, P-44), dan data atau keputusan di luar kerangka (penduduk BPS untuk P-17 dan P-33,
indeks harga untuk P-30, konkordansi pemekaran untuk P-55). Tidak ada SEBAGIAN yang berasal dari
pertentangan logika.

## 7.2 Uji konsistensi

Penguji membandingkan semua aturan kerangka, rekomendasi 65 paradoks, dan bawaan `KEPUTUSAN.md`, lalu
mencatat 24 pertentangan (U-01 sampai U-24) dan 6 celah (C-1 sampai C-6) pada kerangka versi 1
(`riset/UJI-KONSISTENSI.md`). Pertentangan terpenting adalah enam bawaan di `KEPUTUSAN.md` yang berbeda
dengan pilihan kerangka (angka luas M5, bobot rumah, penaik relatif, satu tangga ambang, format nomor
induk, periode pembekuan versi). Bawaan itu kini diselaraskan dengan kerangka. Pertentangan lain:
jeda gempa susulan 7 hari lawan 30 hari, "mesin hanya menyarankan" lawan gabung karhutla otomatis, dan
orang hilang yang kemudian ditemukan meninggal terhitung dua kali di kelas. Ketiganya diselesaikan di
Bab 6 versi 2.1: jeda gempa 30 hari dengan batas 90 hari, aturan tertulis boleh diterapkan mesin dengan
jejak dan dapat dibatalkan, dan meninggal ditambah hilang dihitung sebagai nilai terbesar jumlah keduanya
per laporan.

Tabel 7.2. Status penyelesaian pertentangan dan celah

| Status | Jumlah |
| --- | ---: |
| Selesai di versi 2.1 | 22 |
| Sebagian, masih ada sisa | 8 |
| Terbuka | 0 |
| Jumlah | 30 |

Sumber: `riset/UJI-KONSISTENSI.md` bagian E; celah C-5 (ukuran dampak terbesar) selesai setelah Bab 6.2.2
aturan 3 menetapkan urutan meninggal dan hilang lalu RBS.

Sisa yang belum selesai bukan pertentangan logika, melainkan rincian yang belum ditulis: kalimat definisi
KJN untuk kejadian lambat (U-01), penaik relatif yang belum menyebut catatan kabupaten mana yang dipakai
(U-02), simulasi beban pencatatan yang belum diulang dengan aturan Tabel 6.2 (U-07), saat penetapan kelas
akhir (U-20), perlakuan data lama yang tidak memisahkan orang unik (U-23, U-24), jeda cuaca ekstrem dan
longsor (C-2), dan penomoran daftar "terdeteksi, belum diverifikasi" (C-6).

## 7.3 Uji ulang data 2024 sampai 2026

### 7.3.1 Unit kejadian

:::metode
Kejadian nasional (KJN) dibentuk dari baris DIBI: baris berpecahan dengan kategori, tanggal, dan provinsi
sama yang pecahannya berjumlah sekitar satu digabung menjadi satu KJN; baris lain menjadi satu KJN.
Karena DIBI tidak menyimpan nomor induk, cara ini adalah batas atas: banjir tiga kabupaten pada hari
yang sama tetap terhitung tiga KJN bila DIBI tidak memecahnya. Tanggal dikonversi ke WIB.
:::

Tabel 7.3. Baris, kejadian nasional, dan jumlah resmi DIBI

| Tahun | Baris DIBI (catatan kabupaten) | KJN | Jumlah resmi (semua baris) | Jumlah resmi (bertanda bencana) |
| --- | ---: | ---: | ---: | ---: |
| 2024 | 3.752 | 3.654 | 3.636 | 3.548 |
| 2025 | 8.946 | 8.763 | 9.304,4 | 5.439,4 |
| 2026 (1 Januari sampai 12 November) | 3.276 | 3.220 | 3.219 | 2.448 |

Sumber: tarikan DIBI 12 November 2026, `analisis/hasil/sim_kerangka.json`.

Sebanyak 98,1 persen KJN berasal dari satu baris. Perubahan terbesar ada pada gempa: 62 baris gempa 2024
menjadi 20 KJN. Jumlah resmi DIBI memuat pecahan (9.304,4 pada 2025) karena kejadian lintas kabupaten
dibagi; kerangka menggantinya dengan dua angka bulat yang bernama (Bab 6.2.1).

### 7.3.2 Ambang masuk

Tabel 7.4. KJN yang lolos ambang Juklak (K1 sampai K3) dan ambang usulan (M1 sampai M4)

| Tahun | Juklak | Usulan versi 1 | Usulan versi 2 | Versi 2 lawan Juklak |
| --- | ---: | ---: | ---: | ---: |
| 2024 | 2.556 | 2.281 | 2.285 | -10,6% |
| 2025 | 3.647 | 3.311 | 3.324 | -8,9% |
| 2026 | 1.332 | 1.220 | 1.226 | -8,0% |
| Jumlah | 7.535 | 6.812 | 6.835 | -9,3% |

Sumber: sama dengan Tabel 7.3. M5 (luas) dan M6 (SK tanggap darurat) tidak terukur di DIBI.

![Gambar 7.1. KJN lolos ambang Juklak dan ambang usulan, 2024 sampai 2026](gbr/sim-l2-juklak.png)
Sumber: `analisis/hasil/sim_kerangka.json`.

Ambang usulan mengurangi kejadian yang lolos sekitar 9 persen. Perubahan terbesar ada pada cuaca ekstrem
(minus 27 persen pada versi 1) dan tanah longsor (minus 18 persen), karena rumah rusak ringan kini
diberi bobot seperempat. Banjir hampir tidak berubah, dan gempa naik 9 persen karena korban hilang ikut
dihitung. Dari 891 KJN yang lolos Juklak tetapi tidak lolos usulan versi 1, hampir semuanya lolos lewat
kriteria rumah atau fasilitas dengan kerusakan ringan; contohnya Waropen 19 Maret 2026 dengan 48 orang
terdampak, 2 rumah rusak berat, dan 3 rusak ringan. Sebaliknya 168 KJN lolos usulan tetapi tidak lolos
Juklak, kebanyakan karena fasilitas rusak (158) dan sisanya korban hilang tanpa korban meninggal,
misalnya Kota Ternate 2 Oktober 2026 dengan 2 orang hilang.

Penentu tunggal tetap didominasi kriteria orang: M2 menjadi satu-satunya dasar masuk bagi 3.946 KJN,
dibanding K2 bagi 3.889 KJN pada aturan Juklak. Karena itu definisi operasional "terdampak langsung"
(Bab 6.3.1) adalah perubahan paling berpengaruh di L2, lebih dari angka ambangnya.

Batas data: DIBI tidak memilah tingkat kerusakan fasilitas, sehingga M4 dihitung sebagai fasilitas
rusak lebih dari nol (batas atas). Varian batas bawah memberi 6.662 KJN, 11,6 persen di bawah Juklak.

### 7.3.3 Skala keparahan

Tabel 7.5. Sebaran kelas per opsi (KJN lolos usulan versi 1, n = 6.812, persen)

| Opsi | Ringan | Sedang | Besar | Katastrofik |
| --- | ---: | ---: | ---: | ---: |
| a. Absolut | 96,3 | 3,2 | 0,5 | 0,1 |
| b. Relatif terhadap penduduk (aturan uji) | 87,7 | 10,4 | 1,3 | 0,5 |
| a dengan penaik relatif (usulan) | 95,1 | 4,0 | 0,8 | 0,1 |
| c. Tingkat status darurat (aturan uji) | 53,2 | 8,2 | 38,6 | 0 |
| d. Indeks gabungan | 96,3 | 3,2 | 0,5 | 0,1 |
| a, kerangka versi 2 | 96,3 | 3,3 | 0,3 | 0,1 |

Sumber: sama dengan Tabel 7.1; penduduk kabupaten dari WorldPop (`public/data/wilayah/*.json`), bukan
BPS; status dari `public/data/status_darurat.json`.

![Gambar 7.2. Sebaran kelas keparahan menurut opsi](gbr/sim-kelas-opsi.png)
Sumber: `analisis/hasil/sim_kerangka.json`.

Temuan:

1. **Opsi a dan d hampir sama.** Titik potong opsi d sengaja dipilih agar sebaran kelasnya sama dengan opsi a, sehingga Tabel 7.5 menunjukkan persentase yang sama; per kejadian, kelasnya sama pada 96,9 persen KJN. Indeks gabungan tidak memberi
   informasi tambahan, sedangkan bobotnya harus dibela. Opsi d ditolak.
2. **Opsi c tidak mengukur dampak.** Kelas menurut status darurat hanya sama dengan opsi a pada 52,7
   persen KJN. Sebanyak 2.510 KJN yang menurut dampaknya Ringan berada di bawah status darurat provinsi,
   sebagian besar karena status karhutla dan cuaca yang berlaku berbulan-bulan (P-62). Sebaliknya 53,2
   persen KJN yang lolos ambang tidak punya status sama sekali. Karena itu status dicatat sebagai penanda,
   bukan kelas (P-15, P-65).
3. **Penaik relatif berpengaruh kecil dan searah.** Opsi a dengan penaik relatif sama dengan opsi a
   pada 98,5 persen KJN; 105 KJN naik kelas dan tidak ada yang turun. Pada versi 2 dengan lantai
   absolut, 112 KJN naik; baris "a, kerangka versi 2" di Tabel 7.5 belum memuat kenaikan ini, sehingga
   sebaran kerangka akhir sedikit lebih tinggi di kelas Sedang dan Besar. Opsi b murni lebih agresif (Sedang 10,4 persen) tetapi peka terhadap angka
   terdampak yang membengkak: 10 KJN mencatat terdampak melebihi penduduk kabupatennya (Aceh Tamiang
   612 persen), tanda double counting di kolom DIBI atau selisih sumber penduduk.
4. **Kelas atas jarang.** Hanya 0,4 sampai 0,8 persen KJN mencapai Besar atau Katastrofik. Kelas inilah
   yang memikul sebagian besar korban (Bab 5.3, P-37).
5. **Gempa.** Dari 60 gempa yang lolos ambang, 4 mencapai kelas B atau K: Bojonegoro 22 Maret 2024
   (magnitudo 5,9, BMKG), Bandung 18 September 2024 (4,9, BMKG), Donggala 16 Juni 2026 (6,7, EMSC [BELUM TERVERIFIKASI]), dan
   gempa 15 Agustus 2026 di 11 kabupaten NTB, NTT, dan Sulawesi Selatan (7,7, EMSC [BELUM TERVERIFIKASI]; kelas K).
   Gempa magnitudo 4,9 masuk kelas Besar, sedangkan banyak gempa di atas 7 tidak berdampak. Data ini
   menjawab langsung P-34: tidak ada magnitudo ambang untuk bencana besar. Magnitudo 2026 dicocokkan
   manual dengan katalog EMSC karena katalog BMKG di repo berakhir 28 Desember 2025; keduanya belum
   dicek ke BMKG.

Kerangka memilih opsi a dengan penaik relatif (Bab 6.4.2). Pilihan ini tidak mengubah kelas 98,5
persen kejadian dibanding opsi a, tetapi memberi jalan bagi kabupaten kecil yang terpukul berat (P-17,
P-33) dengan lantai absolut yang mencegah permainan angka (Bab 7.4).

### 7.3.4 Tren

Tabel 7.6. Deret Januari sampai Oktober menurut ukuran

| Ukuran | 2024 | 2025 | 2026 |
| --- | ---: | ---: | ---: |
| Jumlah resmi DIBI | 2.951 | 8.093 | 3.124 |
| KJN lolos ambang usulan | 1.724 | 2.694 | 1.183 |
| KJN kelas Sedang ke atas | 92 | 108 | 54 |
| Meninggal dan hilang | 510 | 723 | 577 |

Sumber: sama dengan Tabel 7.3.

![Gambar 7.3. Deret jumlah kejadian dan korban, Januari sampai Oktober 2024 sampai 2026](gbr/sim-tren.png)
Sumber: `analisis/hasil/sim_kerangka.json`.

Jumlah resmi DIBI naik 174 persen dari 2024 ke 2025 lalu turun 61 persen ke 2026. Korban meninggal dan
hilang bergerak searah tetapi jauh lebih landai (naik 42 persen, lalu turun 20 persen). Lonjakan 2025
sebagian besar adalah baris di bawah ambang: baris bertanda bukan bencana naik dari 93 (2,5 persen)
pada 2024 menjadi 3.705 (41,4 persen) pada 2025. Deret jumlah resmi DIBI melintasi 2024 dan 2025 karena
itu tidak boleh dibaca sebagai tren (P-35).

Rumah setara rusak berat naik 227 persen pada 2026 sementara jumlah kejadian turun 61 persen, karena
gempa Agustus 2026. Lima KJN teratas memikul 37 persen korban 2025 dan 54 persen korban 2026. Jumlah
kejadian bukan ukuran keparahan.

### 7.3.5 Logbook 2026

Tabel 7.7. Logbook Januari sampai Oktober 2026 dengan tiga kunci kejadian

| Kunci | KJN | Lolos ambang usulan | Meninggal dan hilang |
| --- | ---: | ---: | ---: |
| Jenis, provinsi, kabupaten, jeda 7 hari (kerangka) | 2.809 | 745 | 643 |
| Jenis, provinsi, kabupaten beririsan, tanggal (`logbook_2026.json`) | 3.756 | 756 | 619 |
| Jenis, provinsi, kabupaten, tanggal | 3.860 | 768 | 625 |

Sumber: logbook harian Pusdalops, `analisis/hasil/sim_kerangka.json`; angka dampak diurai dari teks
bebas.

Kunci kejadian mengubah jumlah KJN 27 persen, tetapi jumlah yang lolos ambang hanya berubah 3 persen
(745 sampai 768). Ambang yang diterapkan sesudah kejadian dibentuk membuat jumlah bencana tahan terhadap
pilihan kunci, sedangkan jumlah kejadian mentah tidak. Ini bukti data untuk urutan penerapan L1, D, L2
(Bab 6.1). Karhutla hanya lolos pada 9 dari 681 KJN logbook karena luas belum dapat dipakai.

## 7.4 Uji adversarial

Pemeriksa yang tidak ikut menulis kajian membaca kerangka versi 1 dan bunyi kriteria lama, lalu mencari
kasus baru yang membuat kerangka memberi dua jawaban, tidak menjawab, menjawab tidak masuk akal, dapat
dimainkan, atau tidak dapat dijalankan. Hasilnya 26 kasus (A-01 sampai A-26): 13 berat, 12 sedang, 1
ringan (`riset/ADVERSARIAL.md`).

Tabel 7.8. Kasus adversarial berat dan perbaikan di kerangka versi 2.1

| Kode | Kasus | Celah versi 1 | Perbaikan versi 2 |
| --- | --- | --- | --- |
| A-01, A-02 | Banjir atau karhutla yang rantai jedanya menyambung berbulan-bulan | Satu KJN memakan satu musim | Batas durasi 30 hari, lanjutan menjadi KJN baru bertaut (6.2.2 aturan 7) |
| A-03 | Jeda 7 hari semu karena awan dan asap | Api yang sama dihitung dua kali | Hari tanpa pengamatan layak tidak dihitung dalam jeda |
| A-06 | Rantai gempa, longsor, bendung, banjir bandang | Induk dan anak hanya dua tingkat | Pohon induk dan anak tanpa batas tingkat; jumlah kejadian menghitung akar |
| A-09 | Rumah tergenang memicu lewat orang, dilarang lewat unit | Tampak bertentangan | M2 menulis tiga bentuk terdampak terpisah; unit rumah tergenang tidak memicu M3, penghuni yang air masuk ke rumahnya dihitung di M2 secara sengaja |
| A-10 | 40 luka dan 20 mengungsi tidak memicu apa pun | Ambang per kategori menyembunyikan 60 orang | M2 menjumlah orang unik antarkategori |
| A-11 | Satu fasilitas apa pun memicu | Fasilitas tanpa daftar dan satuan | Daftar tertutup, satuan lembaga atau ruas, rusak berat atau sedang |
| A-12 | Luas terverifikasi wajib, verifikasi tidak ada | Nasib kejadian tidak diatur | Status "tidak terverifikasi, kedaluwarsa" |
| A-15 | Kelas Besar dari pengungsian saja | Dapat dicapai tanpa kerusakan | Kelas dari pengungsi saja paling tinggi Sedang |
| A-16 | Penaik relatif di kabupaten berpenduduk kecil | 150 orang menaikkan kelas | Lantai absolut 100 dan 1.000 orang |
| A-18 | Gempa beruntun | Satu KJN untuk beberapa gempa merusak | Gempa sama atau lebih besar dengan dampak terpisah menjadi KJN baru; batas 90 hari |
| A-19 | Erupsi berkorban saat status Waspada | Tidak ada kejadian yang bisa dibentuk | Periode dimulai pada erupsi berdampak pertama |
| A-21 | Kekeringan per musim, musim berbeda antarwilayah | Musim tidak terdefinisi | Periode kemarau menurut zona musim BMKG |

Sumber: `riset/ADVERSARIAL.md`; perbaikan di Bab 6.

Penilaian ulang terhadap kerangka versi 2.1 (Lampiran B, Tabel B.5 dan B.6) memberi 17 kasus terjawab
penuh dan 9 sebagian, tanpa yang gagal. Lima kasus berat masih sebagian: A-03 (kata "pengamatan layak"
belum didefinisikan), A-11 dan A-12 (perbaikan yang diambil lebih kecil daripada usulan penguji), A-16
(sumber dan tahun penduduk belum ditetapkan), dan A-21 (peta zona musim BMKG belum dipasang ke data).
Perbaikan untuk kasus sedang mencakup penggabungan karena kesalahan data yang dapat dibatalkan (A-04),
anak yang lahir setelah induk selesai (A-07), ambang yang dinilai pada akar (A-08), SK yang harus cocok
jenis, wilayah, dan tanggal (A-13), pengungsi di kabupaten asal (A-17), jeda 14 hari untuk status gunung
api (A-20), asap sebagai anak karhutla (A-22), kode wilayah pada tanggal dampak pertama (A-23), hari
sebagai 24 jam sejak dampak pertama (A-25), dan rumah rusak belum terpilah berbobot 0,25 (A-26).

Kasus adversarial dimasukkan ke katalog sebagai kasus uji tambahan di Lampiran B. Kasus yang memerlukan
data di luar BNPB (zona musim BMKG, citra beresolusi tinggi untuk verifikasi luas) dicatat sebagai
keterbatasan penerapan di Bab 10.
