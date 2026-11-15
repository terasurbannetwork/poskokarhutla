# PRD: Keterpaduan

## Tujuan

Satu kejadian, satu nomor, di semua layar. Satu antrean luring yang perilakunya sama di semua aplikasi lapangan. Satu definisi formulir untuk web, luring, dan Excel. Titik pengungsian yang bisa dipantau per putaran. Satu orang tercatat sekali.

## Pengguna

| Peran | Kebutuhan |
| --- | --- |
| Staf Pusdalops dan Koordalops | Membuka satu kejadian dan melihat semua tugas, logbook, laporan khusus, operasi, dan pengungsian yang tertaut. |
| Petugas lapangan, regu, instansi daerah | Mengisi luring tanpa tahu aplikasi mana yang menyimpan; melihat satu angka "belum terkirim". |
| Petugas kab (meja kerja) | Mengisi kaji pengungsian per titik per putaran. |
| Admin | Meninjau tautan ambigu dan pasangan orang yang bentrok. |
| Pimpinan | Membaca ringkasan per kejadian tanpa angka yang saling berbeda. |

## Fitur

| Kode | Fitur | Keputusan |
| --- | --- | --- |
| F-1 | Baris tugas api, logbook, SIPPA, tugas lapangan, gempa, dan laporan khusus tertaut ke `KJ-` lewat `sk_kejadian_sumber`. | K1, D1, D3 |
| F-2 | Tanda `KJ-` di layar tiap modul, mengarah ke halaman kejadian di `/siklus`; tanda "belum bertaut" bila belum. | K1 |
| F-3 | Isian nomor GLIDE pada kejadian. | D4, Q1 |
| F-4 | `public/inti/antre.js` dengan saluran per modul dan pita "belum terkirim" bersama. | K3, D5, D6 |
| F-5 | `public/inti/spek.js`: satu format spek, satu validator, satu penggambar form, templat Excel. | K4, D7 |
| F-6 | Register titik pengungsian berkode `TP-` dengan koordinat dan tautan kejadian. | K5, D9 |
| F-7 | Meja pengungsi per titik per putaran; tabel putaran per titik. | K5, D9, Q5 |
| F-8 | Tabel samping `orang_akun` untuk empat tabel akun, pencocokan NIP baku lalu WA, daftar tinjau bentrok dan NIP tidak baku. | K6, D10 |
| F-9 | Satu fungsi normal nomor WA. | D11 |
| F-10 | Gerbang: tabel kejadian atau tugas baru tanpa jalur tautan ditolak; antrean IndexedDB di luar `public/inti/antre.js` ditolak sesudah pemindahan selesai. | AGENTS 3.4 |

## Larangan

- Tidak ada router WA bersama (K2).
- Cara login tidak diubah (D12).
- Pencocokan orang tidak pernah dari nama (D10).
- Tidak ada aturan pencocok kejadian kedua di JS (D3).
- Tidak ada buku kejadian kedua: semua tautan ke `sk_kejadian`.
- Vektor wajah tidak pernah masuk cadangan localStorage antrean.
