# Dari titik panas ke kelompok api

Halaman ini menjelaskan cara menghitung angka titik panas dan mengelompokkannya menjadi satu api, dari sumber data sampai kelompok.

## 1. Dari mana titik panas berasal

Data berasal dari FIRMS, layanan milik NASA yang mengumpulkan deteksi panas dari beberapa satelit. Ada dua jenis sensor. MODIS (di satelit Terra dan Aqua) adalah sensor lama dengan kotak pandang sekitar 1 km. VIIRS (di satelit S-NPP, NOAA-20, dan NOAA-21) adalah sensor yang lebih baru dan lebih tajam dengan kotak pandang sekitar 375 m. Wilayah yang dipantau mencakup seluruh Indonesia. Data diperbarui sekitar tiap 3 jam, dan perhitungan penuh dijalankan setiap hari.

Satelit S-NPP berhenti didistribusikan pada 1 November 2026. Sejak itu angka memakai satelit yang tersisa. Akibatnya, membandingkan angka sesudah 2 November dengan tahun lalu perlu hati-hati: bandingkan hanya dengan sensor yang setara.

Untuk keperluan cuaca, Centurisk97 memakai data cuaca global dan prakiraan cuaca dari penyedia internasional (lihat [Keparahan, FWI, dan firespot](/docs/data-karhutla/keparahan-firespot), bagian 6).

## 2. Satu angka titik panas: lokasi unik

NOAA-20 dan NOAA-21 melintas berselang sekitar 50 menit di jalur yang sama, sehingga sering melihat api yang sama. Menghitung semua titik mentah membuat api yang sama terhitung dua kali.

Karena itu angka utama dihitung begini:

1. Peta dibagi menjadi kotak kecil sekitar 375 meter.
2. Semua titik dari MODIS (Terra dan Aqua), S-NPP (untuk hari sebelum berhenti), NOAA-20, dan NOAA-21 pada satu hari WIB dikumpulkan, termasuk yang berkeyakinan rendah.
3. Titik yang berada di sumber panas industri (lihat nomor 3) dibuang. Titik di kawah gunung api tetap dihitung.
4. Angka hari itu adalah jumlah kotak berbeda yang tersisa.

Contoh: jika hari itu satelit melaporkan 100 titik tetapi 40 di antaranya jatuh di kotak yang sama dengan titik satelit lain, angka yang tampil adalah 60.

Titik berkeyakinan rendah dimasukkan sejak 28 Oktober 2026 karena api gambut yang membara bersuhu rendah dan tertutup asap sering terbaca satelit sebagai keyakinan rendah. Konsekuensinya, ada lebih banyak alarm palsu di luar gambut.

Seberapa bisa dipercaya: ini sebuah definisi, bukan prediksi, sehingga tidak ada uji balik. Definisinya diperiksa dengan uji otomatis.

## 3. Sumber panas tetap dan gunung api

Tidak semua panas adalah kebakaran lahan. Pembangkit listrik, suar gas, tambang, dan kilang menyala berbulan-bulan di tempat yang sama. Sebuah kotak sekitar 1 km masuk daftar "sumber panas tetap" bila menyala sedikitnya 30 hari dalam setahun, di sedikitnya 8 bulan berbeda, pada sedikitnya 2 tahun berbeda. Kebakaran gambut besar menyala berminggu-minggu tetapi tidak di kotak yang sama tiap tahun, jadi tidak ikut tersaring. Daftar disegarkan tiap bulan. Titik di kotak daftar ini dibuang dari angka utama.

Kawah gunung api diperlakukan lain. Titik dalam radius 3 km dari puncak 40 gunung api yang pernah meletus sejak tahun 2000 tetap ikut dihitung dalam angka utama, tetapi tidak dijadikan kelompok karhutla.

## 4. Pengelompokan titik menjadi satu api

Titik yang berdekatan dalam ruang dan waktu dianggap satu api:

1. Ambil titik VIIRS berkeyakinan sedang dan tinggi dalam 7 hari terakhir.
2. Dua titik dianggap bertetangga bila jaraknya tidak lebih dari sekitar 1 km (tepatnya antara 0,6 dan 1,5 km, tergantung ukuran kotak pandang satelitnya) dan terdeteksi dalam selisih paling lama 48 jam.
3. Titik yang bertetangga dirangkai menjadi satu kelompok. Titik tunggal pun tetap menjadi satu kelompok.
4. Kelompok dianggap aktif sesuai tabel di [Sekilas dan aturan waktu](/docs/data-karhutla/sekilas).

Garis luar kelompok digambar mengikuti sebaran titik.

Seberapa bisa dipercaya: hasil pengelompokan rapuh terhadap pilihan jarak. Pada uji di Kalimantan Tengah, 12 Oktober, melonggarkan jarak dari 1,0 ke 1,25 km membuat kelompok terbesar membengkak 59 persen jumlah titiknya, padahal jumlah seluruh kelompok malah berkurang. Karena itu kelompok adalah alat bantu membaca peta, bukan hitungan api yang pasti.
