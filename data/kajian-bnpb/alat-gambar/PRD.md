# PRD: Alat gambar wilayah

Alat di peta utama untuk menggambar wilayah sendiri (poligon, kotak, buffer) dan langsung melihat apa kata data kita tentang wilayah itu. Keputusan di `KEPUTUSAN-GAMBAR.md`.

## 1. Masalah

- Pengguna sering bertanya tentang wilayah yang tidak sama dengan batas administrasi: area sekitar konsesi, radius 10 km dari desa, koridor jalan.
- Peta utama menjawab per provinsi, kab/kota, kecamatan, dan insiden, bukan per bentuk bebas.
- Pembanding (SIPARHUTLA) punya alat gambar, tetapi menyajikan luas gambar sebagai luas terbakar. Kita perlu alat serupa tanpa menyesatkan.

## 2. Pengguna

| Peran | Kebutuhan |
| ----- | --------- |
| Pimpinan dan Pos komando | jawaban cepat tentang satu area: titik, FRP, desa |
| BPBD dan Manggala Agni daerah | radius sekitar titik kejadian atau desa |
| Relawan dan media | membaca angka dengan label jujur |

## 3. Fitur

| ID | Fitur | Isi | Tiket |
| -- | ----- | --- | ----- |
| F-1 | Gambar | poligon, kotak, lingkaran atau kapsul buffer 1 sampai 50 km; satu gambar aktif; hapus | AG-02 |
| F-2 | Luas wilayah digambar | km2 dan ha, geodesik, label tegas bukan luas terbakar | AG-02 |
| F-3 | Titik panas dan FRP | lokasi unik per hari, jumlah FRP dan maksimum, per periode 24 jam, 3 hari, 7 hari | AG-03 |
| F-4 | Siang lawan malam | dua angka, tanpa tafsir | AG-03 |
| F-5 | Sel berdeteksi dan jejak sel | petak 375 m dan jejak sel × 14,0625 ha, berlabel | AG-03 |
| F-6 | Luas dNBR insiden dalam gambar | per insiden, bila ada, tidak dijumlah | AG-04 |
| F-7 | Desa dan kecamatan | daftar desa beririsan; penduduk kecamatan beririsan berpil perkiraan kasar | AG-05 |
| F-8 | Kartu hasil | kartu standar, keadaan kosong jujur | AG-06 |
| F-9 | Gerbang | uji geometri dan kata | AG-07, AG-08 |

## 4. Di luar cakupan

Lihat D15: ekspor, simpan atau bagikan gambar, perbandingan periode, peringkat wilayah, buffer luar poligon, lapisan baru, emisi atau asap.
