# Guncangan, susulan, dan gempa 12 bulan

Halaman ini menjelaskan cara menghitung perkiraan guncangan, peluang gempa susulan, dan peluang gempa 12 bulan.

## Perkiraan guncangan satu gempa

**Pertanyaan.** Seberapa kuat gempa ini terasa di tiap kecamatan.

**Langkah.**

1. Hitung jarak dari kecamatan ke bidang patahan. Panjang bidang patahan diperkirakan dari magnitudo: makin besar gempa, makin panjang patahannya.
2. Tentukan jenis sumber dari kedalaman. Kedalaman 50 km atau lebih dianggap gempa di dalam lempeng. Gempa dangkal 15 sampai 50 km dengan M 7 atau lebih yang berjarak 200 km atau kurang dari jalur pertemuan dua lempeng dianggap gempa pertemuan lempeng. Selain itu dianggap gempa kerak, yaitu gempa dangkal di lapisan atas bumi.
3. Pakai rumus penurunan kekuatan guncangan terhadap jarak yang lazim dipakai peneliti dunia untuk jenis sumber itu, untuk mendapat percepatan tanah di kecamatan tersebut.
4. Ubah percepatan tanah menjadi skala MMI, yaitu skala 1 sampai 10 tentang seberapa kuat guncangan dirasakan dan seberapa besar kerusakannya. Tanah dianggap seragam kerasnya, kecuali di tab Simulasi yang memakai perkiraan kekerasan tanah dari kemiringan permukaan.
5. Kecamatan dihitung sampai guncangannya turun di bawah MMI 2, paling jauh 400 km.

**Contoh.** Gempa M 6,5 yang dangkal, 10 km dalamnya, termasuk gempa kerak (tidak masuk syarat M 7 untuk pertemuan lempeng). Jarak tiap kecamatan ke patahan dihitung, lalu rumus kerak dipakai, dan kecamatan yang jauh dari patahan mendapat MMI makin rendah.

**Seberapa bisa dipercaya.** Hipotesis. Hasilnya belum cukup diuji terhadap laporan guncangan warga BMKG. Dalam uji awal, model cenderung terlalu tinggi sekitar 1,6 kelas MMI, tetapi jumlah gempa yang dinilai terlalu sedikit untuk disimpulkan (2 dinilai dari 5 dicatat). Di pantai yang jauh dari jalur pertemuan lempeng, model cenderung 0,5 sampai 1,5 kelas lebih rendah dari kenyataan. Percobaan memperbaikinya dengan laporan warga dari lembaga EMSC tidak membantu, sehingga koreksi itu tidak dipakai.

## Peluang gempa susulan

**Pertanyaan.** Setelah gempa utama, berapa peluang terjadi gempa susulan M 5 atau lebih dalam beberapa hari ke depan.

**Langkah.**

1. Dari gempa utama dan sejarah susulan di Indonesia, model menghitung laju susulan: banyak di jam dan hari awal, lalu menurun cepat dan jarang.
2. Jumlahkan laju itu selama jendela waktu yang ditanyakan. Hasilnya perkiraan jumlah susulan, sebut N. Angka N inilah yang dihitung model dari magnitudo gempa utama dan lamanya jendela.
3. Peluang minimal satu susulan = 1 dikurangi e pangkat minus N (rumus baku untuk kejadian acak yang jarang). Kalkulator biasa bisa menghitungnya.
4. Karena laju itu sendiri tidak pasti, hitungan diulang untuk banyak kemungkinan laju, lalu dirata-rata. Untuk gempa utama sampai M 5,5, rentang 10 sampai 90 persen ikut ditampilkan; di atas itu hanya angka tengahnya yang tampil.

**Contoh.** Bila model memperkirakan N = 1 susulan, peluangnya 1 dikurangi 0,37 = sekitar 63 persen. Bila N = 2, peluangnya 1 dikurangi 0,14 = sekitar 86 persen.

**Seberapa bisa dipercaya.** Hipotesis. Model dilatih dengan gempa 2000 sampai 2019, divalidasi 2020 sampai 2022, dan diuji 2023 sampai sekarang. Skor keunggulannya atas tebakan sederhana (proporsi gempa sekelas yang diikuti susulan) hanya 0,0021, hampir nol, jadi belum terbukti lebih baik. Pada peluang tinggi model meramal 67,5 persen padahal yang teramati 55,6 persen. Hanya gempa M 5 atau lebih yang diterbitkan, dan jam pertama sesudah gempa tidak dimodelkan.

## Peluang gempa dalam 12 bulan

**Pertanyaan.** Berapa peluang wilayah ini mengalami gempa M 5, M 6, atau M 7 atau lebih dalam setahun.

**Langkah.**

1. Ambil katalog USGS gempa M 5 atau lebih tahun 1990 sampai 2025, lalu buang gempa susulan lewat metode pengelompokan Gardner-Knopoff agar yang dihitung hanya gempa utama.
2. Hitung rata-rata jumlah gempa utama per tahun di tiap wilayah. Wilayah dengan kurang dari 3 kejadian tidak ditampilkan peluangnya.
3. Peluang minimal satu gempa dalam 12 bulan = 1 dikurangi e pangkat minus laju tahunan.

**Contoh.** Bila rata-rata 0,5 gempa per tahun, peluang setahun = 1 dikurangi 0,61 = sekitar 39 persen.

**Seberapa bisa dipercaya.** Bercampur. Laju 1990 sampai 2015 diuji terhadap jumlah gempa sebenarnya 2016 sampai 2025:

| Kelas gempa | Teramati | Rentang perkiraan 90 persen | Hasil |
| --- | --- | --- | --- |
| M 5 atau lebih | 1.120 | 1.144 sampai 1.258 | gagal (di bawah rentang) |
| M 6 atau lebih | 119 | 115 sampai 153 | lolos |
| M 7 atau lebih | 14 | 13 sampai 28 | lolos tipis |
| M 7 atau lebih yang dangkal | 8 | 10 sampai 23 | gagal (di bawah rentang) |

Untuk kelas yang gagal, angka peluang tidak ditampilkan. Untuk M 7 atau lebih, yang tampil adalah rentang perkiraan 90 persen dari jumlah gempa 2016 sampai 2025, bukan satu angka peluang.
