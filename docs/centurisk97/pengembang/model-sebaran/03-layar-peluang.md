# Peluang 7 hari, cerita musim, kartu

Halaman ini mencatat layar peluang 7 hari, cerita musim, kartu metode, dan peringatan email.

## Peluang api 7 hari (lapisan peta, eksperimental)

Jalur: peta utama di halaman utama, menu "Lapisan", bagian "Eksperimental", kotak "Peluang api 7 hari (eksperimental)".

Siapa yang boleh melihat: hanya yang sudah masuk, yaitu admin (token atau sesi) atau akun pemirsa. Halaman anonim tidak membawa tombol ini; tombol baru dipasang bila `GET /api/risiko7/akses` menjawab `{masuk: true}` (`public/risiko7.js`, `src/risiko7.js`). Tamu yang memanggil data langsung memperoleh 401.

Langkah pakai:

1. Masuk sebagai admin atau pemirsa. Buka peta utama dan menu Lapisan.
2. Centang "Peluang api 7 hari (eksperimental)". Sebuah kartu keterangan muncul di atas legenda berisi pil "Eksperimental, belum lolos uji prospektif" (atau "lolos" atau "tidak lolos" bila vonis sudah ada), masa berlaku minggu itu, dan rincian "Seberapa bisa dipercaya".
3. Arahkan penunjuk ke sel untuk melihat tooltip (peluang dan peringkat di provinsi); klik sel untuk membuka popup dengan tiga angka: Peluang berapi, Peringkat di provinsi, Berlaku, ditambah tombol aksi lokasi.

Arti warna (kelas peluang mutlak, tetap antar provinsi dan antar minggu, `KELAS` di `public/risiko7.js:18`):

| Peluang sel berapi dalam 7 hari | Warna |
| --- | --- |
| di bawah 1 persen | tanpa warna |
| 1 sampai 5 persen | ungu muda |
| 5 sampai 10 persen | ungu |
| 10 sampai 20 persen | ungu sedang |
| 20 sampai 40 persen | ungu tua |
| 40 persen atau lebih | ungu sangat tua |


![Tangga enam kelas warna peluang sel berapi dalam 7 hari, dari di bawah 1 persen sampai 40 persen atau lebih. Sumber: public/risiko7.js.](gambar/model-sebaran-tangga-peluang.svg)

Peringkat provinsi ("teratas N persen", dibulatkan ke atas) hanya keterangan dan tidak menentukan warna. Kartu "Seberapa bisa dipercaya" memuat dua kalimat yang dibentuk dari berkas data: hasil uji balik (AUC di dalam provinsi dan minggu 0,847, pembanding riwayat api saja 0,840, dan 41 persen sel yang berapi berada di 10 persen sel teratas tiap provinsi) dan status uji prospektif. Daftar "Perkiraan sel berapi per provinsi" menampilkan enam provinsi dengan harapan jumlah sel berapi tertinggi.

Status khusus yang mungkin muncul: "Belum ada ramalan yang terbit" (Worker menjawab 503 `belum_ada`), "Terbit terlambat: dibuat sesudah minggunya mulai, jadi tidak ikut dinilai", dan "Masa berlaku sudah lewat dan ramalan minggu berikutnya belum terbit". Bila sesi habis, kotak dimatikan dan muncul toast "Sesi berakhir". Data diambil ulang bila halaman terbuka lebih dari enam jam.

Hal yang sering disalahpahami: yang diramal adalah peluang satelit NOAA-20 menangkap sekurangnya satu titik api di sel sekitar 5,5 km, bukan peluang adanya api. Sensor kedua hanya mengonfirmasi sekitar 49 persen sel-minggu berapi pada uji, jadi sebagian target sebenarnya ditentukan lintasan satelit.

## Cerita musim dan pendorong (Insight dan Tren)

Jalur: tab Insight, bagian "cerita" di bawah kartu Insight (`public/cerita_karhutla.js`), dan kartu "Penempatan regu" yang dipasang di tab Tren (`reguKartu`, `public/index.html:4025`).

1. "Musim 2026": peta bergerak dengan penggeser waktu dan penanda awal musim per provinsi serta kompleks besar pertama. Tombol rekam di kepala kartu menghasilkan video 1080 kali 1350 piksel dari peta, tanggal, angka, judul, dan merek, lalu dapat diunduh atau dibagikan lewat lembar bagikan. Definisi awal musim ada di bagian Metode.
2. "Pendorong": diagram batang rasio peluang membesar (merah menaikkan, hijau tosca menurunkan) untuk sekitar empat belas faktor (gambut, malam, ukuran awal, FRP awal, DC, hujan, RH, angin, jarak jalan, jarak desa, kanal, bekas terbakar, lereng, El Niño). Rasio 1 kali berarti sama dengan kelas acuan.
3. "Penempatan regu": kabupaten dengan peristiwa 1.000 hektare atau lebih terbanyak sejak 2015.

Enam eksibit Insight (`sebMusim`, `sebDorong`, `sebUji`, `sebLolos`, `sebGalat`, `sebModel`) dan bab "Uji model" di cerita didefinisikan di `public/insight_sebaran.js` tetapi tidak terdaftar di daftar `Insight.EX` karena disembunyikan atas permintaan pemilik 14 Okt 2026. Pemulihan eksibit "Peringatan dini" dilakukan dengan `Insight.EX.splice(1, 0, "sebLolos")` (komentar di `public/insight_sebaran.js:174`).

## Kartu "Model sebaran dan peluang api membesar" (tab Metode)

Jalur: tab Metode, kartu dengan ikon dadu (`public/index.html:6494`). Kartu ini menampilkan alur lima langkah, contoh dengan data hari ini yang dibaca dari `model_sebaran.json` dan `gerbang_model.json`, tabel hasil uji, penjelasan gerbang, status uji prospektif, peralihan satelit, dan daftar batas. Isinya dimuat dari berkas data, jadi angka kartu ini selalu sejalan dengan berkas yang sedang terbit.

## Peringatan email berdasarkan jejak api (tanpa halaman)

Peringatan email langganan (`src/ews.js`) memakai `public/data/jejak_api.json` untuk menilai apakah api akan mendekati lokasi pelanggan. Jejak hanya dipakai bila `boleh_tampil` persis `true`, `status` bernilai `ok`, dan acuan datanya tidak lebih tua dari 36 jam. Tingkat Awas: sel dengan peluang 50 persen atau lebih dalam radius 2 km dari lokasi. Tingkat Siaga: peluang 20 persen atau lebih dalam radius 5 km (`SIM_AWAS_KM`, `SIM_AWAS_P`, `SIM_SIAGA_KM`, `SIM_SIAGA_P`, `src/ews.js:42`). Kompleks yang daftar sel aktifnya dipangkas (`terpangkas`) tidak boleh dipakai untuk peringatan tertinggi.
