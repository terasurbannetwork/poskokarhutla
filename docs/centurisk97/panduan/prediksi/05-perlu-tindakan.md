# Aturan Perlu tindakan

Halaman ini menjelaskan kapan sebuah kabupaten/kota masuk daftar Perlu tindakan dan bagaimana peluang disesuaikan otomatis.

## Aturan "Perlu tindakan"

Bagian ini memakai aturan jika-maka. Aturan yang syaratnya tidak bisa dicek karena data hilang tidak dipicu.

| Aturan | Syarat |
| --- | --- |
| Waspada banjir | hujan 24 jam sedikitnya 50 mm dan kelembapan tanah sedikitnya 0,45 pada skala 0 (kering) sampai 1 (jenuh), yang berarti tanah sudah penuh air |
| Waspada longsor | hujan 24 jam sedikitnya 100 mm, atau jumlah tiga hari sedikitnya 150 mm |
| Waspada karhutla | peluang indeks bahaya kebakaran tinggi sedikitnya 0,6 dan hujan tiga hari kurang dari 3 mm |
| Imbauan masker dan sekolah kurangi kegiatan luar ruang | asap sudah masuk kategori tidak sehat atau lebih buruk |
| Hari tidak melaut bagi nelayan kecil | gelombang sedikitnya 1,25 m |
| Waspada angin kencang | embusan sedikitnya 46 km/jam |

**Perkiraan dampak, langkah demi langkah:**

1. Jiwa terpapar: penduduk di wilayah rawan. Banjir memakai penduduk zona bahaya tinggi. Longsor memakai seluruh penduduk kecamatan yang indeks bahaya longsornya tinggi. Karhutla dan angin memakai seluruh penduduk kabupaten/kota. Untuk longsor, karhutla, dan angin, angkanya adalah batas atas, yaitu angka tertinggi yang mungkin, bukan perkiraan tengah.
2. Pengungsi: jiwa terpapar dikali perbandingan antara jumlah pengungsi dan jumlah terdampak pada kejadian-kejadian lalu dari data kejadian bencana nasional. Perbandingan milik kabupaten/kota dipakai bila sedikitnya 3 kejadian tercatat; selain itu dipakai perbandingan nasional.
3. Kebutuhan harian: memakai standar kemanusiaan internasional (Sphere, edisi 2018), yaitu air 15 liter per orang, hunian tertutup 3,5 meter persegi per orang, satu jamban untuk 20 orang, dan 2.100 kilokalori per orang.

Contoh dengan angka rekaan: 10.000 jiwa terpapar dengan perbandingan mengungsi 10% berarti sekitar 1.000 pengungsi, yang butuh sekitar 15.000 liter air per hari dan 50 jamban. Angka 10% hanya untuk contoh, bukan angka sesungguhnya. Jumlah nelayan per kabupaten/kota tidak tersedia, sehingga aturan hari tidak melaut tidak punya angka jiwa.

## Penyesuaian peluang otomatis

Kadang peluang model terlalu tinggi atau rendah dibanding kenyataan. Bila riwayat menunjukkan "70%" ternyata hanya terjadi 4 dari 10 kali, layar akan menampilkan sekitar 40%. Penyesuaian ini dilatih dari riwayat dan hanya dipakai bila terbukti memperbaiki hasil pada 14 hari terakhir yang tidak ikut dilatih; bila tidak, layar tetap memakai peluang mentah. Untuk banjir, koreksi dilakukan sebulan sekali dan baru diganti bila perbaikannya meyakinkan pada uji ulang. Semua ini terjadi otomatis.
