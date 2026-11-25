# Peluang terbakar per kotak

Halaman ini menjelaskan peluang per kotak, baik kotak 375 meter maupun kotak 5,5 km untuk tujuh hari.

## Peluang tiap kotak 375 meter ikut terbakar (model data per kotak)

Pertanyaan: kotak 375 meter mana di sekitar api yang ikut terbakar dalam 24, 48, dan 72 jam?

Langkah hitung:

1. Dari sebuah kompleks api, sistem memilih kotak calon, yaitu kotak yang belum terbakar dalam jarak 5 kotak (sekitar 1,9 km) dari kotak yang aktif. Jarak ini mencakup sekitar 97 persen kotak yang di kenyataan ikut terbakar berikutnya.
2. Tiap kotak calon diberi keterangan: jarak ke api, cuaca 24 jam, tingkat kekeringan bahan bakar (sistem kode kekeringan Kanada), jenis lahan, jarak ke kanal, jalan, dan desa, serta iklim El Niño.
3. Model memberi peluang untuk tiap kotak. Satu langkah mewakili 24 jam, tiga langkah menjadi 72 jam.
4. Kotak dianggap terbakar bila peluangnya melewati batas dasar 8 persen. Batas ini digeser sedikit menurut jenis lahan (lebih ketat untuk gambut dan tanah mineral), karena pada pemeriksaan model cenderung melebihkan luas. Garis biru di peta memakai batas lain, yaitu 5 persen, hanya untuk menggambarkan kotak yang cukup mungkin terbakar.
5. Agar tahu seberapa pasti hasilnya, sistem mengulang hitungan puluhan kali dengan sedikit variasi, lalu menampilkan rentang dari kemungkinan terkecil sampai terbesar.

Seberapa bisa dipercaya: pada uji 2024 sampai 2026 (604 titik awal), model menebak dengan tepat kotak baru yang terbakar dalam 24 jam pada skor 0,38 (skala 0 sampai 1), dan tumpang tindih kotak tebakan dengan kenyataan 0,65. Namun pada uji 123 kejadian lampau, model kalah dari pembanding sederhana yang menganggap api tidak berubah: tumpang tindih 0,58 lawan 0,67. Karena itu model ini berlabel eksperimental. Arah penjalaran pun tidak dapat diramal baik: semua model meleset 71 sampai 87 derajat, padahal menebak acak meleset 90 derajat. Rentang luas yang ditampilkan menjangkau sekitar 80 persen kejadian pada uji untuk 24 jam, tetapi tetap terlalu sempit untuk api yang benar-benar besar.

## Peluang api 7 hari per kotak 5,5 km

Pertanyaan: kotak sekitar 5,5 km mana yang akan tertangkap satelit membawa sedikitnya satu titik panas dalam 7 hari sesudah ramalan terbit?

Yang diramal adalah tertangkapnya titik panas oleh satelit NOAA-20, bukan adanya api. Satelit kedua hanya membenarkan sekitar 49 persen kotak-minggu berapi pada uji, sehingga sebagian hasilnya ditentukan oleh jalur lintasan satelit.

Langkah hitung:

1. Sistem menyusun keterangan tiap kotak: berapa titik panas dalam 7 dan 30 hari terakhir (juga di kotak tetangga), berapa hari sejak api terakhir, jenis lahan, jarak ke kanal dan jalan, kepadatan penduduk, dan kekerapan api di minggu kalender yang sama pada tahun-tahun lalu. Cuaca sengaja tidak dipakai.
2. Kotak yang berapi terus-menerus karena sumber panas tetap (misalnya pabrik atau tambang) dibuang.
3. Model dilatih pada semua minggu lengkap 2013 sampai sebelum 23 Oktober 2026, lalu menghasilkan peluang per kotak.
4. Bila data satelit NOAA-20 kurang dari 85 hari dalam 90 hari terakhir, ramalan minggu itu tidak dibuat dan peta menampilkan ramalan terakhir lengkap dengan tanggalnya.
5. Ramalan terbit mingguan dan dibekukan saat terbit, bersama dua pembanding sederhana. Dinilai 2 hari sesudah minggu berakhir.

Contoh: kotak yang tahun-tahun lalu hampir selalu berapi pada minggu ini, dan 7 hari terakhir memang ada titik panas di sekitarnya, akan mendapat peluang tinggi dan berwarna ungu tua. Kotak tanpa api bertahun-tahun mendapat peluang di bawah 1 persen dan tidak berwarna.

Seberapa bisa dipercaya: pada uji balik yang menyembunyikan satu tahun bergantian untuk 2015 sampai 2025, bila 10 persen kotak teratas tiap provinsi ditandai, sekitar 41 dari tiap 100 kotak yang benar berapi tertangkap. Pembanding sederhana menangkap 40,8 dan 34,3. Jadi keunggulannya tipis. Angka yang lebih tinggi pernah dilaporkan tetapi dibatalkan karena pembandingnya terlalu lemah.

Agar dibuka untuk publik, ramalan harus lolos empat syarat dari uji berjalan. Syarat dihitung sekali pada awalan minggu terpendek yang sudah memenuhi paling sedikit 6 minggu dan 2.000 kotak berapi, dan penyetelan ulang pada minggu yang sudah dinilai dilarang:

1. Lebih baik daripada pembanding yang kuat (pembanding pertama), dengan keunggulan yang tetap terlihat setelah memperhitungkan ketidakpastian.
2. Dalam menandai 10 persen teratas, tidak kalah daripada pembanding pertama.
3. Peluang rata-rata sesuai kenyataan, yaitu antara 0,7 dan 1,3 kali yang teramati.
4. Di provinsi prioritas yang punya sedikitnya 300 kotak-minggu berapi, tidak kalah daripada pembanding kedua.

Saat ini ramalan ini masih berlabel eksperimental dan hanya untuk pengguna yang sudah masuk. Hasil di tahun La Niña (tahun lebih basah) baru diwakili satu tahun, jadi belum meyakinkan.
