# Indeks risiko kecamatan dan kabupaten

Halaman ini menjelaskan cara indeks risiko kecamatan dan kabupaten dihitung.

## Indeks risiko kecamatan

Data yang dipakai: bahaya dari InaRISK dan prakiraan Centurisk97, kepadatan penduduk dari data sebaran penduduk WorldPop 2026, dan jarak ke kantor BPBD terdekat. Diperbarui setiap hari.

Rumus akhirnya: skor = 100 x bahaya x keterpaparan x (1 - 0,3 x kapasitas). Tiga bahan itu dihitung begini.

Langkah 1, bahaya. Tiap bencana punya nilai bahaya antara 0 dan 1 pada hari itu, lalu diambil yang tertinggi.

- Karhutla: nilai tertinggi antara dua angka. Angka pertama adalah indeks cuaca kebakaran dibagi 14 (indeks 14 ke atas dianggap bahaya penuh). Angka kedua adalah jumlah titik panas 3 hari dibagi 5 (5 titik atau lebih dianggap bahaya penuh). Keduanya dibatasi maksimum 1. Contoh: indeks 7 menghasilkan 0,5; 4 titik panas menghasilkan 0,8; bahaya karhutla hari itu 0,8.
- Banjir: bahaya InaRISK dikali (0,2 ditambah 0,8 dikali peluang hujan 50 mm atau lebih hari ini atau besok). Contoh: bahaya InaRISK 0,9 dan peluang hujan 0,5 menghasilkan 0,9 x (0,2 + 0,4) = 0,54. Artinya makin besar peluang hujan lebat, makin dekat hasilnya ke bahaya InaRISK penuh.
- Gunung api: tingkat PVMBG dikali zona kawasan rawan bencana tempat kecamatan itu berada.
- Gempa: indeks bahaya InaRISK di titik pusat kecamatan.

Langkah 2, keterpaparan: urutan kecamatan menurut jumlah penduduk, dari 0 sampai 1. Kecamatan berpenduduk terbanyak bernilai 1, yang di tengah-tengah bernilai 0,5, yang paling sedikit mendekati 0.

Langkah 3, kapasitas: 1 dikurangi jarak ke kantor BPBD terdekat dibagi 100 km. Jarak 20 km menghasilkan 1 - 0,2 = 0,8. Jarak 100 km atau lebih menghasilkan 0.

Kelas: di bawah 15 Rendah, 15 sampai di bawah 35 Sedang, 35 sampai di bawah 60 Tinggi, 60 ke atas Sangat tinggi.

Contoh lengkap: bahaya 0,8, keterpaparan 0,5, kapasitas 0,8. Skor = 100 x 0,8 x 0,5 x (1 - 0,3 x 0,8) = 40 x 0,76 = 30,4, jadi kelas Sedang.

Relawan siap hanya menaikkan kapasitas yang ditampilkan, bukan kapasitas untuk daftar prioritas, supaya daftar prioritas tidak bisa dipengaruhi lewat pendaftaran relawan. Komponen yang datanya hilang dibiarkan kosong, tidak diisi nol.

Kecamatan prioritas dampak adalah kecamatan yang kelasnya naik dan sekarang Tinggi atau lebih, atau yang skor dari bahaya harian saja sudah Sangat tinggi. Kekeringan tidak ikut dihitung dalam syarat "kelasnya naik", dan baris yang bahaya utamanya kekeringan diberi label hipotesis, karena ambang kekeringan belum lulus uji balik.

Seberapa bisa dipercaya: masih hipotesis. Uji balik hanya bisa dilakukan untuk komponen bahaya tetap banjir, longsor, dan gempa. Pengujiannya per kabupaten: skor sebuah kabupaten diambil dari kecamatannya yang tertinggi, lalu seperempat kabupaten dengan skor tertinggi diperiksa apakah memang lebih sering mengalami kejadian.

- Banjir dan longsor: tidak lebih baik daripada sekadar mengurutkan kabupaten menurut jumlah penduduk dan riwayat kejadian.
- Gempa: lebih baik dari urutan penduduk, tetapi tidak lebih baik dari peta bahaya InaRISK saja, dan tidak lebih baik dari riwayat kejadian pada paruh waktu pertama.
- Komponen harian tidak bisa diuji karena indeks harian tidak punya riwayat.

Pakai sebagai bahan pertimbangan.

## Risiko kabupaten: bahaya, kerentanan, dan kapasitas

Data yang dipakai: indeks bahaya InaRISK (rata-rata kecamatan), data kerentanan, dan peta kapasitas InaRISK.

1. Risiko tiap jenis bencana dihitung dengan rumus bahaya dikali kerentanan, dibagi kapasitas.
2. Risiko per kabupaten adalah jumlah risiko semua jenis.
3. Bahaya memakai rata-rata kecamatan, bukan nilai tertinggi. Alasannya, bila memakai nilai tertinggi, 440 dari 515 kabupaten bernilai bahaya banjir 100, sehingga kabupaten tidak bisa dibedakan.

Contoh dengan angka rekaan, hanya untuk memperlihatkan arah: bahaya banjir 0,6, kerentanan 0,5, kapasitas 0,25. Risiko banjir = 0,6 x 0,5 / 0,25 = 1,2. Bila kapasitas naik menjadi 0,5, risikonya turun menjadi 0,6.

Hasilnya adalah indeks peringkat, bukan perkiraan korban dan bukan IRBI resmi. Model korban jiwa diuji dengan melatihnya pada data sampai 2021 lalu menilai hasilnya pada kejadian 2022 sampai tahun penuh terakhir. Hasilnya tidak cukup baik, sehingga berkas ini diberi label "indeks peringkat, bukan prediksi korban".
