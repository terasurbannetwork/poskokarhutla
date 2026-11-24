# PRD: Panel EWS sensor dan CCTV

## Tujuan

Petugas Pusdalops dan BPBD melihat, dalam satu panel di halaman `/banjir` dan `/gunungapi`, nilai terkini tiap pos pemantauan, mana yang melewati ambang tercatat, mana yang terputus, dan rekaman CCTV-nya, tanpa membuka dasbor vendor satu per satu.

## Pengguna

| Peran | Kebutuhan |
| --- | --- |
| Pusdalops, Koordalops (pusat) | semua pos, pemberitahuan alat terputus, seri waktu untuk laporan |
| BPBD kab/kota | pos di wilayahnya |
| Pimpinan | ringkasan: berapa pos di atas ambang, berapa terputus |
| Warga | hanya sumber yang memang sudah publik (SIHKA, level PVMBG); lihat KEPUTUSAN Q2 |

## Fitur

| No | Fitur | Bencana | Sumber |
| --- | --- | --- | --- |
| F-1 | Kartu pos: nilai besar dan satuan, tingkat, ambang, hujan jam dan hari, baterai, suhu alat, waktu bacaan | banjir, gunung api | sensor sendiri, SIHKA, sumber berizin |
| F-2 | Titik pos di peta halaman bencana, warna mengikuti tingkat, abu bila basi | banjir, gunung api | sama |
| F-3 | Baris pemberitahuan alat tanpa data terkini, berisi daftar nama alat dan waktu terakhir | banjir, gunung api | semua sumber |
| F-4 | Grafik seri waktu 24 jam per pos, interaktif dengan tooltip | banjir (tinggi air, hujan), gunung api (getaran) | sensor sendiri dulu |
| F-5 | Kisi CCTV, diputar hanya saat panel dibuka | banjir, gunung api | hanya aliran berizin (Q1) |
| F-6 | Ringkasan di kepala panel: jumlah pos, jumlah di atas ambang, jumlah terputus, jumlah kamera | banjir, gunung api | turunan F-1 |
| F-7 | Langkah cepat per tingkat dari tangga tindakan yang sudah ada | banjir, gunung api | `public/ews_tindakan.js` |
| F-8 | Daftar alat untuk staf: tambah alat geofon (jenis baru) | gunung api | migrasi baru (Q3) |

## Di luar lingkup

- Bencana selain banjir dan gunung api (K1).
- Halaman `/ews` tersendiri (K1).
- Peringatan publik, email, atau notifikasi PWA dari bacaan sensor (D6).
- Ambang baru buatan kita (D5).
- Data sensor atau CCTV contoh (K3).
- Mengambil data dasbor vendor tanpa izin tertulis (Q1).

## Ukuran berhasil

- Pos yang basi tidak pernah tampil dengan angka 0 atau warna tingkat.
- Membuka tab atau memilih pos tidak membekukan layar (INP di bawah 200 ms pada uji `inp-reviewer`).
- Panel tanpa satu pun sumber aktif tidak tampil sama sekali, tidak menampilkan kotak kosong.
