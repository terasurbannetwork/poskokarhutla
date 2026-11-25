# Tangga peringatan: membaca sinyal

Halaman ini menjelaskan cara membaca tangga peringatan dan sinyal antarskala waktu.

## Tangga peringatan: cara membaca sinyal

**Ringkasannya.** BMKG mengeluarkan pernyataan pada banyak skala waktu, dari musim sampai jam. Tangga menyusun semuanya dari yang terjauh ke yang terdekat. Bila makin dekat waktunya pernyataannya makin serius, sinyalnya "menguat". Bila dua pernyataan setingkat wilayahnya saling jauh tingkatnya, sinyalnya "belum selaras". Sumber yang terlalu lama tidak diperbarui tidak dipakai dan dicatat.

**Rincian: data.** Pernyataan resmi BMKG di berbagai skala: prediksi musim, prediksi curah hujan bulanan dan sepuluh harian, indeks kekeringan (SPI, ukuran seberapa kering suatu bulan dibanding biasanya), peringatan dini kekeringan per kecamatan, prakiraan 10 hari, prakiraan sepekan, prakiraan 3 hari dari beberapa prakiraan sekaligus, peringatan dini cuaca, dan petir. Ditambah citra awan dingin dari satelit cuaca dan prediksi Centurisk97 untuk 3 hari, hari tanpa hujan berturut-turut, peluang kekeringan bulan depan, dan bulan rawan. Tiap sumber punya batas kesegaran: peringatan jam 4 jam, data harian 48 jam, prediksi iklim 14 hari, indeks kekeringan 45 hari, prediksi musim 240 hari.

**Rincian: langkah hitung sinyal.**

1. Tiap pernyataan resmi diberi peringkat 0 sampai 3 (Waspada 1, Siaga 2, Awas 3) sesuai istilah sumbernya. Pernyataan tanpa tingkat tetap tampil tetapi tidak ikut sinyal. Misalnya, prediksi musim, prediksi curah hujan bulan dan dasarian, serta indeks kekeringan tidak diberi peringkat.
2. Untuk tiap skala dan ancaman, peringkat diambil dari pernyataan BMKG tertinggi yang berlaku untuk kabupaten/kota itu, provinsinya, atau nasional. Bila seri, cakupan yang lebih halus menang.
3. Peringkat disusun dari skala terjauh ke terdekat. Bila sedikitnya dua skala berperingkat 1 ke atas dan urutannya tidak menurun, sinyalnya "searah".
4. Bila searah, naik tegas dari yang terjauh ke terdekat, dan semua pernyataannya sama luas cakupannya, sinyalnya "menguat". Bila cakupannya berbeda atau peringkatnya datar, hasilnya hanya "searah".
5. Bila dua skala dengan cakupan sama berselisih 2 peringkat atau lebih, sinyalnya "belum selaras".
6. Prediksi Centurisk97 tampil di tangga tetapi tidak ikut menghitung sinyal.

Dasarian adalah sepuluh harian: tanggal 1 sampai 10, 11 sampai 20, dan 21 sampai akhir bulan.

**Contoh 1 (angka rekaan, hanya untuk menjelaskan aturan).** Sebuah provinsi punya pernyataan di dua skala yang sama cakupannya (provinsi): skala lebih jauh Waspada (1), skala lebih dekat Siaga (2). Urutannya naik tegas dan cakupannya sama, jadi sinyal "menguat". Bila skala lebih dekat berperingkat Awas (3) sedangkan skala lebih jauh Waspada (1), selisihnya 2, jadi "belum selaras" ikut menyala. Kedua tanda bisa menyala bersamaan.

**Contoh 2 (kejadian nyata di sistem).** Ancaman kering: peringatan dini kekeringan BMKG untuk skala dasarian berlaku per kecamatan (diringkas ke kabupaten/kota) dan bisa Waspada (1), sedangkan skala sepekan memuat catatan karhutla BMKG tingkat provinsi yang berperingkat 2. Karena cakupannya berbeda (kabupaten/kota dan provinsi), hasilnya hanya "searah", bukan "menguat". Perhatikan juga bahwa pada skala 10 hari tidak ada peringatan kekeringan resmi, jadi tidak ada peringkat kering di skala itu.

**Seberapa bisa dipercaya.** Sinyal belum diuji terhadap kejadian nyata. Pengujiannya direncanakan setelah ada sedikitnya 90 hari arsip dan 30 hari bersinyal untuk tiap ancaman. Sebelum itu, sinyal hanya penanda kesesuaian antar pernyataan resmi.
