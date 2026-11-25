# Neraca air Jawa dihitung bagaimana

Bagian ini menjelaskan cara membaca dan cara menghitung neraca air Jawa, termasuk air tanah dan proyeksi iklim.

## Neraca air Jawa: cara membaca

Neraca air tidak punya halaman web. Hasilnya dipakai oleh penyusun kajian dan deck, dan datanya dibaca modul lain, misalnya profil daerah Kemitraan Kampus dan model banjir kabupaten/kota.

Cara membaca hasilnya:

1. Satuan adalah juta meter kubik.
2. N adalah air yang tersedia dikurangi kebutuhan. Positif berarti surplus, negatif berarti kekurangan.
3. N80 kemarau menunjukkan kondisi pada musim kemarau (Juni sampai Oktober) yang terlampaui di 80 persen tahun. Bila N80 negatif, daerah itu kekurangan air pada sedikitnya 1 dari 5 tahun.
4. Skenario yang tersedia: rata-rata iklim, serta tahun kering 1997, 2015, 2019, dan 2023.
5. Semua angka berlabel perkiraan model.

## Neraca air Jawa: cara menghitung

Gambaran sederhana: bayangkan tanah seperti ember berukuran 130 mm. Hujan mengisi ember, penguapan menguras, dan kelebihannya meluap menjadi aliran sungai yang mengalir ke daerah di hilir. Neraca air menjumlahkan air yang sampai di tiap kabupaten/kota, lalu mengurangkan kebutuhan penduduk, pertanian, ternak, dan industri.

Cakupan: 119 kabupaten/kota di enam provinsi Jawa, periode 1991 sampai 2025, per bulan.

Data:

- Hujan: CHIRPS, peta hujan gabungan satelit dan pos hujan dari Universitas California Santa Barbara, bulanan.
- Penguapan potensial (air yang akan menguap bila tersedia): dihitung dengan rumus standar FAO dari data suhu, angin, dan radiasi matahari NASA.
- Aliran sungai: peta sub-daerah aliran sungai (sub-DAS, yaitu anak daerah tangkapan air sungai) HydroBASINS.
- Penduduk: WorldPop yang disesuaikan dengan proyeksi penduduk BPS.
- Ternak, industri, dan waduk dari tabel BPS dan data enam waduk.

Langkah menghitung:

1. Untuk tiap petak seluas 0,1 derajat (sekitar 11 km), dibuat "ember tanah" dengan kapasitas 130 mm. Bila hujan melebihi penguapan, kelebihannya mengisi ember dan yang meluap menjadi limpasan, yaitu air hujan yang tidak meresap atau menguap dan mengalir ke sungai. Bila hujan kurang dari penguapan, tanah mengering perlahan.
2. Limpasan dibagi dua: 60 persen langsung mengalir, sisanya masuk simpanan yang melepas air pelan-pelan (konstanta waktu 2 bulan).
3. Air dialirkan dari hulu ke hilir antar sub-DAS. Ketersediaan tiap kabupaten/kota = bagian luas wilayahnya dikali aliran dari hulu, ditambah limpasan setempat.
4. Kebutuhan: rumah tangga 120 liter per orang per hari di kota dan 60 liter di desa. Irigasi dihitung dari kebutuhan tanaman dikurangi hujan, dibagi efisiensi 0,65. Ternak dan industri dari data BPS. Kebutuhan yang benar-benar dikonsumsi dikurangi 30 persen karena sebagian air irigasi kembali mengalir ke sungai.
5. Waduk menampung lalu melepas air sebesar rata-rata aliran 1991 sampai 2025.
6. N = air tersedia dikurangi kebutuhan konsumtif. Setiap hitungan diperiksa agar tidak ada air yang hilang atau muncul begitu saja (toleransi galat 0,1 persen).

Hasil rata-rata 1991 sampai 2025 untuk seluruh Jawa, dalam juta meter kubik per tahun:

| Besaran | Nilai |
| --- | --- |
| Hujan | 340.910 |
| Penguapan | 155.032 |
| Limpasan lokal | 185.590 |
| Kebutuhan konsumtif 2025 | 33.193 |

Kebutuhan konsumtif itu sekitar 17,9 persen dari limpasan tahunan dan 32,3 persen limpasan Juni sampai Oktober.

Jumlah kabupaten/kota yang kekurangan air pada kemarau, dari 119:

| Skenario | Jumlah |
| --- | --- |
| Kemarau rata-rata | 16 |
| Tahun kering 1997 | 99 |
| Tahun kering 2015 | 63 |
| Tahun kering 2019 | 74 |
| Tahun kering 2023 | 47 |

Contoh sederhana: bila sebuah kabupaten punya limpasan lokal 100 dan aliran dari hulu 50 pada kemarau, tersedia 150. Bila kebutuhan konsumtifnya 120, N = 30 (surplus). Bila kebutuhannya 170, N = -20 (kekurangan).

Kepercayaan: tanpa data debit sungai dari balai sungai, label tetap perkiraan model. Hasil dibandingkan dengan GloFAS, model banjir global Eropa yang dipakai sebagai pembanding (GloFAS sendiri adalah model, bukan alat ukur). Pembandingan dilakukan di muara 12 sungai besar:

| Yang dicek | Hasil | Batas | Keputusan |
| --- | --- | --- | --- |
| Total limpasan Jawa dibanding angka BPS 2020 | selisih +5,9 persen | 15 persen | Lolos |
| Rasio model terhadap GloFAS, skala tahunan (nilai tengah dari 12 muara) | 1,01 | 0,80 sampai 1,25 | Lolos |
| Korelasi bulanan (nilai tengah dari 12 muara) | 0,85 | 0,80 | Lolos |
| Rasio Juni sampai Oktober (nilai tengah dari 12 muara) | 1,34 | 0,80 sampai 1,25 | Tidak lolos |
| Jumlah sungai di luar rentang rasio 0,5 sampai 2 pada Juni sampai Oktober | 1 dari 12 | tidak ada | Tidak lolos |

Jadi model baik untuk rata-rata tahunan dan pola bulanan, tetapi kurang tepat pada aliran dasar di musim kemarau. Arah kesalahannya bergantung pada tahun. Pada 1997 model memadamkan aliran di sebagian sungai sehingga kekurangan air dilebih-lebihkan. Pada 2019 dan 2023, dan di beberapa muara pada 2015, model mengalirkan lebih banyak dari GloFAS sehingga kekurangan diremehkan. Skenario tahun kering karena itu hanya petunjuk, bukan batas atas atau bawah.

Artinya bagi Anda: pakailah untuk melihat pola tahunan dan perbandingan antar daerah, jangan untuk angka kemarau yang tepat.

## Simpanan air tanah (GRACE) dan proyeksi iklim

Dua tambahan ini hanya konteks, bukan bagian utama neraca.

- GRACE adalah satelit yang mengukur perubahan berat air di bawah tanah dengan petak yang sangat kasar, sekitar 330 km. Karena itu 119 kabupaten/kota hanya berbagi 7 petak, dan angkanya tidak boleh dibaca sebagai simpanan air tanah tiap kabupaten/kota. Model sederhana yang memperkirakan 1, 2, dan 3 bulan ke depan lolos uji karena galatnya lebih kecil dari dua pembanding (menganggap kondisi sekarang berlanjut, dan memakai rata-rata iklim). Meski begitu, ini bukan peringatan kekeringan.
- Proyeksi iklim 2041 sampai 2060 memakai lima model iklim dari NASA untuk dua skenario emisi. Neraca dihitung ulang dengan mengubah hujan menurut perubahan yang diproyeksikan, menggeser suhu, dan menjaga kebutuhan tetap pada kondisi 2025. Ini proyeksi yang masih mengandung bias model, bukan prakiraan.
