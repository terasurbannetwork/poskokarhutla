# Insiden dan luas terbakar

Halaman ini menjelaskan cara melacak api dari hari ke hari dan cara memperkirakan luas terbakar, belum padam, dan padam.

## 8. Insiden: melacak api dari hari ke hari

Kelompok berstatus 2 ke atas dicocokkan dengan insiden yang sudah ada:

1. Dua kelompok dianggap satu insiden bila titik terdekatnya berjarak paling jauh 0,6 km atau salah satunya berada di dalam garis luar yang lain.
2. Bila beberapa insiden bertemu, yang tertua dipertahankan dan yang lain digabung.
3. Batas waktu "tak terdeteksi" dan dibuka kembali ada di tabel di [Sekilas dan aturan waktu](/docs/data-karhutla/sekilas).

**Perkiraan luas insiden** = jumlah deteksi kumulatif dikali luas per deteksi. Luas per deteksi dihitung per provinsi dari luas resmi tahun-tahun sebelumnya dibagi jumlah deteksi tahun itu, lalu diambil nilai tengahnya. Sebanyak 15 dari 38 provinsi memakai faktor nasional karena datanya kurang. Lingkaran ketidakpastian hanya sebesar kotak pandang satelit, jadi ia batas bawah, bukan batas pasti.

**Perkembangan per hari**, dalam tiga langkah:

1. Perkirakan kapan api pertama tiba di tiap kotak 375 m, dari deteksi pertama di kotak itu dikurangi setengah jeda sejak satelit lewat sebelumnya.
2. Haluskan perkiraan itu dengan nilai tengah kotak-kotak terdeteksi di sekitarnya.
3. Gambar batas api (garis depan) tiap hari pukul 14.00 WIB. Kecepatan api dibaca dari kemajuan kotak baru, memakai persentil 90: kecepatan yang hanya dilampaui 1 dari 10 kotak tercepat. Lompatan api dicatat bila jaraknya 2 sampai 10 km. Titik awal diperkirakan sebagai lingkaran, dengan kotak berpanas kuat diberi bobot lebih besar.

Seberapa bisa dipercaya: masih HIPOTESIS. Dalam uji tahan (data 2019 dan 2023 disimpan dan tidak dipakai saat menyusun metode, lalu metode diuji padanya), cara nilai tengah lebih baik daripada cara membaca kotak terdekat saja: tepat dalam 24 jam pada 82 persen kasus lawan 75 persen. Namun hanya 1 insiden pada kelompok uji yang cukup besar (50 kotak atau lebih), sehingga kesimpulannya belum kuat. Bila tidak terukur, layar menulis "belum terukur", bukan nol.

## 9. Luas terbakar, belum padam, dan padam per hari

**Luas terbakar per provinsi dan kabupaten** (hari WIB):

1. Titik di sumber panas industri dibuang lebih dulu (lihat [Dari titik panas ke kelompok api](/docs/data-karhutla/titik-kelompok), bagian 3).
2. Hitung titik NOAA-20 dan NOAA-21 berkeyakinan sedang dan tinggi pada hari itu.
3. Luas = (jumlah titik NOAA-20 dikali 4,12 hektare + jumlah titik NOAA-21 dikali 4,16 hektare) dibagi 2. Bila di satu pita bujur satu satelit hilang, satelit yang ada dihitung penuh tanpa dibagi 2.
4. Hasil dibulatkan sekali per provinsi. Angka nasional adalah jumlah angka provinsi.

Contoh: 100 titik NOAA-20 dan 80 titik NOAA-21 memberi (100 x 4,12 + 80 x 4,16) / 2 = (412 + 332,8) / 2 = sekitar 372 hektare.

Asal angka 4,12 dan 4,16: luas resmi BNPB dibagi jumlah titik tiap satelit. Untuk NOAA-20 dipakai nilai tengah tahun 2019 sampai 2025, untuk NOAA-21 hanya 2024 sampai 2025 karena satelit itu baru beroperasi. Sebagai uji, untuk Januari sampai Juli 2026 cara baru memberi 219.174 hektare, sekitar 8,5 persen di atas angka SiPongi (202.011 hektare). Cara lama (titik S-NPP dikali porsi dan 4,3) lebih tinggi lagi, sekitar 20 persen di atas SiPongi.

**Belum padam** = (A + B) dikali 2,25 hektare per lokasi (2,25 hektare adalah perkiraan luas satu lokasi), dengan:

- A: kotak yang bertahan, yaitu ada deteksi di kotak itu atau di delapan kotak sekelilingnya pada 12 sampai 36 jam sebelumnya;
- B: kotak baru yang berada di kelompok firespot "ya".

Contoh: 40 kotak bertahan dan 10 kotak baru memberi (40 + 10) x 2,25 = 112,5 hektare.

**Padam** pada suatu hari: titik pada dua hari sebelumnya yang kotak sekitarnya tidak punya deteksi baru pada satu hari dan hari itu sendiri. Jadi 48 jam tanpa titik dianggap padam. Aturan ini berbeda dari aturan 72 jam pada kelompok, karena satuannya berbeda.

**Laporan harian** memakai cara tersendiri yang hanya bertumpu pada satu satelit, sehingga hasilnya tidak sama dengan angka di peta. Titik S-NPP keyakinan sedang ke atas dalam hari laporan (dari pukul 16.00 WIB hari sebelumnya sampai 16.00 WIB hari itu) dikali 4,30 hektare per titik (rentang 3,22 sampai 4,59). Sejak 2 November 2026, hari tanpa S-NPP memakai titik NOAA-20 yang disesuaikan agar sebanding.

Seberapa bisa dipercaya: ini perkiraan dari satelit, bukan luas lapangan. Hari "celah" tidak dikoreksi.

## 10. Luas dari foto satelit Sentinel-2

Setelah api tak terdeteksi lebih dari 7 hari, luas bekas bakar per insiden diperkirakan dari dua foto satelit Sentinel-2: satu sebelum api, satu sesudah. Bagian lahan yang berubah menjadi jauh lebih gelap pada sinar inframerah dihitung sebagai terbakar. Piksel berawan tidak dihitung, jadi hasilnya batas bawah. Luas hanya dilaporkan bila sedikitnya 60 persen area bersih dari awan, dan bila bagian yang berubah di insiden sedikitnya dua kali lipat perubahan di cincin sekitarnya (jarak 2 sampai 4 km) sebagai pembanding.

Seberapa bisa dipercaya: masih indikatif. Pada 33 dari 120 kelompok yang fotonya cukup bersih, luas dari foto sekitar 0,5 sampai 0,6 dari luas kotak titik panas. Sebarannya lebar dan tanpa pengecekan lapangan, jadi tidak dipakai untuk mengoreksi angka lain. Kata "terukur" baru boleh dipakai setelah dibandingkan dengan luas lapangan pada sedikitnya 20 insiden.
