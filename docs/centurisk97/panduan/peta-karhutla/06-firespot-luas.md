# Firespot dan luas terbakar

Halaman ini menjelaskan metode firespot dan cara luas terbakar, api belum padam, dan padam diperkirakan.

## Firespot ala Kemenhut

Firespot adalah titik panas yang kemungkinan besar api nyata. Caranya meniru metode Kementerian Kehutanan.

1. Periksa tiga hari berurutan: hari acuan, satu hari sebelumnya, dan dua hari sebelumnya. Tiap hari diberi nilai H bila ada sedikitnya satu titik berkeyakinan tinggi atau sedikitnya 4 piksel berkeyakinan nominal. Selain itu nilainya M.
2. Susun pola tiga hari itu menjadi salah satu pola di tabel di bawah. Pola HH, H, MH, dan MMM diberi label "ya". Pola lain diberi label "mungkin".
3. Bila cluster berlabel "mungkin" teramati dalam 24 jam terakhir dan statusnya di atas 1, statusnya diturunkan ke 1. Jadi status 2 dan 3 untuk cluster yang teramati hanya berlaku bagi yang berlabel "ya".

| Pola | Artinya | Label |
| --- | --- | --- |
| HH | Hari acuan dan satu hari sebelumnya sama-sama H | ya |
| H | Hari acuan H, satu hari sebelumnya bukan H | ya |
| MH | Hari acuan M, satu hari sebelumnya H | ya |
| MMM | Satu dan dua hari sebelumnya sama-sama M | ya |
| MM | Satu hari sebelumnya M, dua hari sebelumnya bukan M | mungkin |
| M | Selain pola di atas | mungkin |

Contoh: api yang baru muncul hari ini dengan satu titik berkeyakinan tinggi berpola H, jadi berlabel "ya". Api yang hari ini hanya berupa 2 piksel nominal dan kemarin juga lemah berpola M atau MM, jadi berlabel "mungkin" sampai ada pengamatan berikutnya.

Perbedaan dengan Kemenhut: Centurisk97 menghitung piksel unik, bukan titik, dan persistensi dinilai dari keanggotaan cluster. Hasil uji perbandingan sudah dibuat dan aturan ini dipertahankan.

## Luas terbakar, api belum padam, dan padam

Data: titik panas dari dua satelit NOAA-20 dan NOAA-21 berkeyakinan nominal atau tinggi, di luar sumber panas tetap. Dihitung per provinsi, per hari kalender WIB, dan per kabupaten.

Langkah hitung luas terbakar:

1. Hitung titik NOAA-20 dan titik NOAA-21 pada periode yang dipilih.
2. Kalikan titik NOAA-20 dengan 4,12 hektare dan titik NOAA-21 dengan 4,16 hektare. Angka ini adalah nilai tengah hubungan antara luas resmi BNPB tahun 2019 sampai 2025 dan jumlah titik.
3. Jumlahkan kedua hasil lalu bagi dua, karena dua satelit melihat api yang sama sehingga dirata-rata supaya tidak terhitung dobel.
4. Bila salah satu satelit tidak punya data di suatu jalur wilayah, titik satelit yang ada dihitung penuh, tidak dibagi dua.
5. Bulatkan sekali per provinsi. Angka nasional adalah jumlah angka provinsi.

Contoh: 100 titik NOAA-20 dan 80 titik NOAA-21 memberi (100 kali 4,12 ditambah 80 kali 4,16) dibagi 2, yaitu sekitar 372 hektare.

Api belum padam: setiap lokasi unik pada satu hari dihitung bila (A) masih ada deteksi di sekitarnya 12 sampai 36 jam sebelumnya, atau (B) lokasi baru tetapi berada di cluster berlabel firespot "ya". Luasnya adalah jumlah lokasi (A dan B) dikali 2,25 hektare, yaitu nilai tengah luas resmi BNPB per lokasi pada 2024 dan 2025. Hasilnya tidak pernah melebihi luas terbakar wilayah yang sama. Contoh: 40 lokasi berarti sekitar 90 hektare, selama belum melampaui luas terbakar wilayah itu. Karena ini gambaran satu hari, jangan dijumlahkan antarhari.

Padam: api dinyatakan padam bila 48 jam tidak ada titik di lokasi itu dan sekitarnya.

Seberapa bisa dipercaya: untuk Januari sampai Juli 2026, jumlah nasional hitungan ini 219.174 hektare, 8,5 persen di atas angka SiPongi (202.011 hektare). Ini perkiraan satelit. Luas resmi BNPB 129.899 hektare adalah luas yang dipadamkan, bukan luas terbakar, jadi keduanya tidak boleh dibandingkan langsung. Hari saat lintasan satelit hilang ditandai celah dan tidak dikoreksi.
