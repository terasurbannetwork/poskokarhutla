# Sebaran abu, lahar, peluang letusan

Halaman ini menjelaskan sebaran abu, lahar, awan panas, dan peluang letusan.

## Sebaran abu letusan (skenario)

**Pertanyaan.** Bila gunung ini meletus sekarang, ke mana abunya akan bergerak.

**Langkah.**

1. Tiap gunung berlevel II atau lebih diandaikan meletus sekarang. Tinggi kolom letusan memakai tinggi teramati terbaru bila terbit 0 sampai 48 jam sebelum awal skenario. Bila tidak ada, dipakai asumsi per level: Level II 1.000 m, Level III 2.000 m, Level IV 5.000 m.
2. Abu dilepas selama 3 jam dan dibawa angin prakiraan ECMWF (lembaga prakiraan cuaca Eropa) di berbagai ketinggian, sambil menyebar mendatar.
3. Butir abu mengendap menurut ukurannya: halus 10 mikron (40 persen), 30 mikron (30 persen), 100 mikron (20 persen), dan 250 mikron (10 persen). Butir kasar jatuh paling cepat.
4. Abu dianggap berbahaya bagi penerbangan bila kepadatannya di satu kotak peta (sekitar 11 km kali 11 km) setara 2 miligram per meter kubik pada tebal awan 2 km. Jejak abu sah bila sedikitnya 5 kotak melewati ambang itu. Jejak kosong berarti di bawah ambang penerbangan, bukan berarti tidak ada abu.
5. Waktu tiba di bandara adalah jam pertama saat ada kotak berbahaya dalam 25 km dari bandara.
6. Untuk peluang abu, hitungan diulang dengan berbagai skenario angin, tinggi kolom (setengah, satu, dan dua kali), dan lama letusan (3 dan 6 jam), ditambah 51 variasi prakiraan angin untuk level tinggi. Peluang adalah persentase skenario yang abunya sampai ke tempat itu, semua skenario berbobot sama.

**Contoh.** Sebuah bandara berjarak 20 km dari kotak abu berbahaya pada pukul 03.00. Karena jaraknya di dalam 25 km, pukul 03.00 dicatat sebagai waktu tiba abu di bandara itu.

**Seberapa bisa dipercaya.** Hipotesis. Dibandingkan dengan laporan abu resmi VONA (laporan abu letusan untuk penerbangan, periode April 2024 sampai Oktober 2026), hanya 4 dari 29 kejadian punya jejak sah. Arah awan modelnya tepat (selisih 45 derajat atau kurang) pada 25 persen kejadian, sama dengan tebakan acak, sedangkan tebakan sederhana dari kebiasaan angin mencapai 75 persen. Model tidak menghitung hujan yang mencuci abu dan tidak menghitung gumpalan butir abu.

## Lahar dan awan panas (simulasi)

**Pertanyaan.** Ke mana lahar (aliran lumpur vulkanik) dan awan panas (semburan gas dan abu panas) mengalir.

**Langkah.**

1. Bentuk permukaan tanah diambil dari data tinggi daratan dengan ketelitian sekitar 38 m, lalu cekungan palsu akibat galat data diisi supaya air mengalir sampai ke bawah.
2. Aliran dicari dari kawah menuruni lembah.
3. Lahar mengikuti lembah. Lebar dan tebal alirannya dihitung dari volume yang dipilih memakai rumus empiris LAHARZ (rumus hasil pengamatan banyak lahar di dunia). Kecepatan dihitung dari rumus aliran di saluran terbuka dan dibatasi 0,5 sampai 25 meter per detik.
4. Awan panas: jangkauannya ditentukan dari perbandingan tinggi jatuh terhadap jarak mendatar (rasio yang dipilih), dengan lidah selebar 0,2 kali jarak. Kecepatan dibatasi 3 sampai 50 meter per detik.
5. Lapisan tanggap menghitung rute evakuasi berkapasitas, urutan perlakuan, masker, dan bandara memakai asumsi yang bisa diganti.

**Contoh.** Awan panas dari tinggi jatuh 2.000 m dengan rasio 0,25 menjangkau 2.000 dibagi 0,25 sama dengan 8 km secara mendatar. Lidahnya selebar 0,2 kali 8 km sama dengan 1,6 km.

**Seberapa bisa dipercaya.** Ilustrasi bahaya tanpa kalibrasi pada kejadian nyata. Lembah yang lebih sempit dari 80 m tidak dapat dipisahkan.

## Peluang letusan 7 hari

Kartu peluang letusan 7 hari sengaja tidak dibuat. Dalam uji balik, model peluang letusan (dilatih sampai 22 Juni 2025, diuji 1 Juli 2025 sampai 2 November 2026) hanya sedikit lebih baik dari tebakan "keadaan minggu depan sama dengan sekarang". Skor keunggulannya 0,059 dengan rentang 90 persen dari minus 0,014 sampai 0,13. Rentang itu memuat nol, jadi tidak bisa dibedakan dari tidak ada keunggulan sama sekali. Hasil uji ini tampil di bagian Metode halaman gunung api.
