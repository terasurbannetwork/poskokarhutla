# DESIGN-SYSTEM: Segel dokumen

Token dari `public/inti/tema.css`; kepala situs navy bersama (memori "kepala situs wajib"). Tidak ada palet lokal (gerbang `gerbang-token-warna`). Teks lewat skill `bahasa-indonesia-plain`; tanpa huruf kapital semua, tanpa titik tengah sebagai pemisah, tidak pernah menulis "aman".

## 1. Halaman `/verifikasi`

- Satu kolom, lebar paling banyak 560 px, ramah HP.
- Kotak kode: satu `input` teks (`inputmode="text"`, `autocapitalize="characters"`, `autocomplete="off"`) dan tombol Periksa. Label: "Kode di bawah QR".

## 2. Halaman `/verifikasi/<kode>`

Satu kartu `.ex.ex-std` (AGENTS 3.5) berkepala nama seksi "Keaslian dokumen", tanpa kalimat kesimpulan.

| Baris | Isi |
| --- | --- |
| Status | pil berwarna token: Berlaku (hijau), Ada versi lebih baru (kuning, dengan tautan "Buka versi terbaru"), Dicabut (abu), Tidak cocok (merah) |
| Dokumen | judul publik, mis. "Laporan Harian Karhutla" |
| Wilayah | provinsi atau kab/kota (Q3) |
| Periode | tanggal atau rentang |
| Versi | "Terbitan awal" atau "Ralat 2" |
| Penerbit | unit, mis. "Pusdalops BNPB" |
| Terbit | tanggal dan jam WIB, format `public/inti/format.js` |
| Sidik | 12 huruf awal (hanya itu yang dikirim server) dalam huruf monospasi, bisa disalin |

Di bawah kartu: pemilih berkas "Cocokkan PDF yang Anda pegang" (hanya bila sidik berkas ada), lalu satu baris kecil "Segel keaslian sistem, bukan tanda tangan elektronik."

## 3. Blok QR di lembar cetak

- Kaki halaman pertama, kanan bawah, 22 mm x 22 mm QR, koreksi galat M.
- Di bawahnya dua baris 8 pt: `Kode ABCDE-FGHJK` dan `Sidik 1a2b3c4d5e6f`.
- Di kirinya satu baris: "Periksa keaslian di centurisk97.id/verifikasi".
- Hitam di atas putih; tidak ikut tema gelap. A4 saja (gerbang `gerbang-kertas-a4`).

## 4. Daftar segel staf

Tab di halaman admin yang sudah ada (bukan halaman baru): tabel standar `public/inti/tabel.js` dengan kolom Kode, Dokumen, Terbit, Status; vonis cabut lewat dialog yang menampilkan data sampul dulu (FITUR §5, "vonis hanya sesudah melihat dokumennya").
