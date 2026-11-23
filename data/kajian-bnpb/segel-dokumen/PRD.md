# PRD: Segel dokumen dan halaman verifikasi

## Tujuan

Pemegang lembar cetak atau PDF terbitan sistem bisa memastikan dalam satu pindai bahwa dokumennya asli, isinya tidak berubah sejak terbit, dan apakah sudah ada versi yang lebih baru.

## Pengguna

| Peran | Kebutuhan |
| --- | --- |
| Penerima dokumen (pejabat, pemda, mitra, wartawan) | Pindai QR atau ketik kode, lihat status. Tanpa akun. |
| Staf penerbit (Pusdalops, koordalops, pimpinan) | Dokumen yang mereka kunci otomatis bersegel; tidak ada langkah tambahan. |
| Moderator dan pimpinan | Mencabut segel dengan alasan. Melihat daftar segel yang tidak cocok. |

## Fitur

| ID | Fitur | Fase |
| --- | --- | --- |
| F-1 | Register segel di D1 (`segel`, `segel_cabut`). | 1 |
| F-2 | Segel otomatis saat laporan harian karhutla dan bencana dikunci atau diralat. | 1 |
| F-3 | Segel otomatis saat dokumen PB dibekukan. | 1 |
| F-4 | Halaman publik `/verifikasi/<kode>` dan kotak ketik kode di `/verifikasi`. | 1 |
| F-5 | Pemeriksaan ulang sidik saat kode dibuka. | 1 |
| F-6 | Cocokkan berkas PDF di peramban, tanpa unggah. | 1 |
| F-7 | Blok QR, kode, dan sidik pendek di lembar cetak. | 1 |
| F-8 | Cabut segel oleh moderator atau pimpinan. | 1 |
| F-9 | Daftar segel tidak cocok dan dicabut untuk staf. | 1 |
| F-10 | Segel versi beku data lanjutan BPBD dan Laporan Berkala. | 2 (Q1) |
| F-11 | QR di deck generator Python. | 2 (Q4) |

## Larangan

- Halaman verifikasi tidak pernah menampilkan angka isi, kalimat, lampiran, foto, nomor telepon, NIK, atau nama orang.
- Segel tidak pernah disebut tanda tangan, dan sistem tidak pernah menulis "dijamin sah secara hukum".
- Segel tidak pernah dihapus atau diubah; pencabutan hanya menambah baris.
- Tidak ada segel untuk baris dummy dan tidak ada data contoh.

## Ukuran berhasil

- Tiap baris beku baru di lk, lkb, dan pb_dokumen punya tepat satu segel (diperiksa uji integrasi).
- Halaman verifikasi terbuka di bawah 1 detik di HP kelas bawah, tanpa pustaka PDF.
