# Pra-registrasi: efek OMC karhutla Okt 2026 terhadap hujan

Ditulis 28 Okt 2026 SEBELUM data hujan hasil (CHIRPS, IFS) ditarik atau dihitung. Yang sudah dilihat sebelum menulis ini: tabel sortie (`omc_rekap.csv`), daftar berkas CHIRPS yang tersedia (sampai 25 Okt), kuota Open-Meteo, dan bentuk arsip METAR. Tidak ada nilai hujan yang dilihat.

## 1. Pertanyaan dan apa yang BISA dijawab

Berapa persen hujan harian di kabupaten/kota yang disemai berbeda dari yang diharapkan tanpa penyemaian, dibanding kabupaten/kota yang tidak disemai pada hari yang sama. Ini estimasi asosiasi terkontrol, bukan bukti sebab-akibat: penyemaian dilakukan di hari dan tempat yang berawan, sehingga seleksi menaikkan hujan di kelompok sasaran tanpa ada efek semai.

## 2. Data

- Sortie: `data/laporan-bnpb/omc/omc_rekap.csv`. Hanya baris bertanggal tunggal 16-27 Okt dan bertanggal sah yang menentukan perlakuan. Kolom `hujan_hasil` TIDAK dipakai (bocor hasil).
- Hujan observasi: CHIRPS-2.0 prelim harian 0,05 derajat (CHC UCSB, satelit IR + stasiun), hari UTC 00-24 (kira-kira 07 WIB sampai 07 WIB berikutnya), mm. GSMaP dan IMERG tidak tersedia (tanpa kredensial). Hari CHIRPS yang belum terbit saat penarikan (26-27 Okt) tidak ikut; bila terbit sebelum analisis dijalankan, ikut.
- Prakiraan model tanpa pengetahuan penyemaian: ECMWF IFS (Open-Meteo historical-forecast, model `ecmwf_ifs025`), jumlah hujan harian UTC di titik pusat kab/kota. Dipakai sebagai kovariat dan untuk anomali.
- Geometri: `public/geo/kabupaten/*.json` (properti `kab`). Hujan kab = rata-rata sel CHIRPS yang pusatnya di dalam poligon; bila tak ada sel, sel terdekat ke pusat.

## 3. Unit, perlakuan, kontrol

- Panel: kab/kota (Sumatera dan Kalimantan, kode provinsi 11-19, 21, 61-65) x hari, 1 Okt sampai hari CHIRPS terakhir. Jawa Timur, Jawa Barat, Papua Selatan di luar domain (diuji hanya deskriptif bila perlu).
- Perlakuan D=1: kab/kota yang namanya tertulis di `sasaran` baris bertanggal tunggal pada hari itu, 16-27 Okt. Pencocokan nama ke geometri: huruf kecil, awalan "kota"/"kab." dibuang, harus sama persis dengan nama poligon. Token yang tak cocok ("Kalteng bagian barat", "timur laut-timur Palembang", "perbatasan ...") tidak jadi perlakuan; provinsi-hari itu ditandai terkontaminasi.
- Bahan: D_nacl (baris dengan nacl_kg>0), D_dry (dry_ice_kg>0). Kab yang kena keduanya hari itu masuk keduanya (ditandai campuran). Baris tanpa bahan (Lampung 22 Okt) masuk D umum saja.
- Kontrol: sel kab-hari dengan D=0 DAN bukan tetangga berbatasan dari kab D=1 hari itu (penyangga spillover) DAN bukan di provinsi-hari terkontaminasi (baris rentang tanggal, token tak cocok, baris tanpa tanggal tidak mengubah apa-apa) DAN bukan di provinsi 25 Okt. Kontrol meliputi kab yang tidak disemai hari itu di provinsi ber-OMC dan seluruh Jambi dan Riau (nol sortie tercatat 16-26 Okt). Kalimantan Timur DIKELUARKAN seluruhnya: ada rekap 30 sortie tanpa periode, jadi statusnya tidak diketahui (bertentangan dengan anggapan awal bahwa Kaltim tanpa OMC).
- 25 Okt: tidak ada catatan, dibuang seluruhnya dari panel (status perlakuan tak diketahui).
- Periode: baseline 1-15 Okt (semua D=0), operasi 16-27 Okt. 1-15 Okt memakai OMC pra-16 Okt tidak tercatat di sini; diakui sebagai keterbatasan.

## 4. Ukuran hasil

- Primer: CHIRPS hujan harian kab (mm).
- Sekunder: (a) anomali = CHIRPS dikurangi IFS; (b) indikator hujan >= 1 mm; (c) ln(1+mm).
- Eksploratori kecil: jarak pandang METAR harian (rata-rata jam siang) dan PM2.5 BMKG (ln, hanya sampai 23 Okt) di stasiun yang berada dalam poligon kab (titik-dalam-poligon). Perlakuan sama dengan kab itu. Stasiun sangat sedikit; dilaporkan hanya dengan MDE.

## 5. Estimator

Efek tetap kab dan hari (two-way FE) pada panel seimbang hasil pembuangan: y_it = a_i + g_t + b D_it + c IFS_it + e. Spesifikasi PRIMER memakai kovariat IFS (mengendalikan seleksi pada hari berawan yang terbaca model); varian tanpa kovariat dan varian anomali dilaporkan sebagai sekunder. Panel tak seimbang karena sel dibuang: dikerjakan lewat regresi dummy penuh (penyelesaian kuadrat terkecil), bukan demeaning ganda.
- Persen efek = b / (rata-rata y kelompok D=1 dikurangi b). Selang untuk b diubah ke persen dengan penyebut tetap.
- Galat baku klaster per hari (G sekitar 24, koreksi G/(G-1)) dan selang t dengan G-1 derajat bebas; klaster per kab dilaporkan sebagai pembanding.
- Inferensi UTAMA = uji permutasi: 5.000 kali label hari-perlakuan (vektor D hari itu) diacak antar hari operasi dan baseline dengan kovariat tetap; p dua sisi dari taksiran b terhadap sebaran acak. Selang 90/95% dilaporkan dari t-klaster; bila berbeda tegas dari permutasi, keduanya ditampilkan.
- Plasebo tambahan: (1) kab yang sama pada baseline 1-15 Okt dengan D palsu dari pola 16-30 hari bergeser (lag 15 hari); (2) plasebo tata ruang: pola perlakuan harian diterapkan ke kab acak di provinsi tak disemai.
- Rincian: per bahan (D_nacl, D_dry dalam satu regresi), per provinsi (interaksi D x provinsi untuk Kalteng, Sumsel, Kalsel, Kalbar). Keluarga provinsi dikoreksi Holm; semuanya eksploratori.

## 6. Kekuatan statistik

Efek minimum terdeteksi (MDE, daya 80%, alfa 5% dua sisi) = 2,8 x SE, dengan SE = simpangan baku taksiran dari 5.000 permutasi (bukan asumsi normal), diubah ke persen terhadap rata-rata kontrafaktual kelompok D=1. Dilaporkan untuk tiap spesifikasi. Bila MDE melebihi 100%, hasil dinyatakan "tidak informatif".

## 7. Aturan melapor

- Efek dalam %, selang 90% dan 95%, n sel D=1 dan kontrol, n hari, MDE.
- Selang memuat 0 => "tidak terdeteksi" (bukan "tidak ada efek"). Tidak ada kata "berhasil" atau "gagal" untuk OMC.
- Arah positif signifikan tetap dilabeli "kesesuaian, belum sebab" kecuali plasebo bersih; seleksi awan tak bisa dikesampingkan.
- Semua spesifikasi di bagian ini dilaporkan, termasuk yang nol. Perubahan setelah melihat hasil ditulis sebagai "penyimpangan dari PRAREG" di HASIL.

## 8. Jendela jam (27 Okt, sortie berjam)

Deskriptif saja: METAR IEM per jam (curah p01i bila ada, kode wx) di bandara terdekat sasaran (Banjarmasin WAOO, Palangka Raya WAGG, Palembang WIPP bila ada data), jam jendela sortie sampai +3 jam dibanding jam yang sama pada hari tanpa OMC di bandara yang sama (1-15 Okt). Satu hari, beberapa stasiun: tidak ada uji, hanya tabel; CHIRPS tidak punya resolusi jam.

=== SHA256 dihitung atas semua teks DI ATAS baris ini ===

sha256: 21733ea91d55ddc718f0db6bf7ebac6d26037a16aea6ff0d257421ce3367c419
Dikunci 28 Okt 2026 sebelum penarikan data hasil.
