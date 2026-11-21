# TIKET: Lapor tanpa sinyal

Ambil tiket berurutan; kerjakan hanya cakupannya. Tiap tiket ditutup dengan bukti di `RENCANA-UJI.md`. Subagent tidak commit atau push; sesi induk yang melakukannya (AGENTS 9). LR-02 sampai LR-12 menggantikan LA-35 dan LA-36 paket lapor-ai. Pemeriksa tidak pernah pengerja yang sama.

| Tiket | Isi | Pengerja | Pemeriksa | Tergantung | Q |
| --- | --- | --- | --- | --- | --- |
| LR-00 | Bagian "baca dulu, baru bangun" di `AGENTS.md` untuk folder ini, pemilik berkas baru di roster, catatan di KEPUTUSAN lapor-ai bahwa K37 diperinci paket ini; gerbang paket modul hijau | sesi induk | `penulis-gerbang` | paket diperiksa | |
| LR-01 | Pengukuran: URL kanonik `/lapor` lawan `/lapor/`, cakupan scope SW, ukuran cangkang, berkas yang dimuat `index.html`; hasil ditulis di RISET bagian 1 | `layar-peta` | pemeriksa bersih | LR-00 | |
| LR-02 | `public/inti/luring_spek.js` (spek bersama), uji murni bagian 1 untuk spek | `inti-layar` | `selera-angka` | LR-01 | |
| LR-03 | `public/sw-lapor.js`, pendaftaran, kartu Siapkan, status Siap per langkah, `manifest.webmanifest`; uji bagian 4 (cangkang luring) | `layar-peta` | `inp-reviewer`, `security-reviewer` | LR-01 | Q2, Q11 |
| LR-04 | Formulir luring: kartu jenis, lokasi GPS dan pilih kab/kota, waktu, korban, ringkasan; daftar kab/kota dan nomor penting di cangkang; pesan tetap 13 bahasa | `layar-peta` | `inp-reviewer`, `selera-angka` | LR-02, LR-03 | Q7 |
| LR-05 | Saluran `lapor` di antre.js, simpan butir, batas 5 butir dan 20 MB, kuota HP, pita belum terkirim, tombol Hapus semua data luring; uji antrean bagian 2 | `layar-peta` | `security-reviewer`, `inp-reviewer` | LR-04 | Q4, Q6, Q9 |
| LR-06 | Foto luring di HP: kamera saja, pemeriksaan 5 menit, EXIF, GPS bersamaan, butir foto terkait butir laporan | `layar-peta` | `security-reviewer` | LR-05 | Q1, Q5 |
| LR-07 | Migrasi `lapor_luring` dan `lapor_foto_luring` (nomor diambil saat dikerjakan), `src/lapor_mesin.js` `bentukLuring` murni; uji murni bagian 1 | `warga-api` | `migrasi-idempoten`, `validasi-model` | LR-02 | Q1, Q3 |
| LR-08 | `src/lapor_luring.js`: rute `/api/lapor/luring` dan `/luring/foto`, kuota, idempotensi, lencana foto, kait tabel rute; uji rute bagian 3 | `warga-api` | `guard-api`, `security-reviewer` | LR-07 | Q1 |
| LR-09 | Lencana "Dikirim dari luring" dan "dikirim terlambat" di meja, PDF, dan lacak; aturan pita darurat (Q3); dua waktu | `layar-peta`, `warga-api` | `selera-angka`, `inp-reviewer` | LR-08 | Q3 |
| LR-10 | `scripts/lapor/lokal.mjs` dan server tinjau: rute luring, penyedia SW, sinkron dengan Worker | `layar-peta` | pemeriksa bersih | LR-08 | |
| LR-11 | Uji peramban sungguhan (bagian 4) dan gerbang `gerbang-lapor-luring` (bagian 5) | `penulis-gerbang` | pemeriksa bersih | LR-09, LR-10 | |
| LR-12 | Pemilik meninjau di `http://localhost:8800/lapor/`; uji perangkat nyata (bagian 6) dan lembar hasil; paragraf privasi luring ke kebijakan privasi `/lapor` dan tinjauan hukum (K23) | sesi induk, pemilik | | LR-11 | |
| LR-13 | Fase 2: Background Sync Android Chrome lewat SW yang memuat `antre.js` (`importScripts`), deteksi fitur, cadangan tetap pengiriman saat halaman dibuka | `layar-peta` | `inp-reviewer`, `security-reviewer` | LR-12 | Q8 |
| LR-14 | Fase 2: video luring bila Q5 dijawab ya, memakai saluran `lapor-video` dan pengunggah bersambung yang ada | `layar-peta`, `warga-api` | `security-reviewer` | LR-12 | Q5 |

## Urutan dan siapa yang menunggu

1. Tidak butuh jawaban pemilik untuk mulai: LR-00 sampai LR-05 dan LR-10. Tiap bawaan sementara sudah jalan tanpa jawaban.
2. Menunggu Q1 sebelum dianggap final: LR-06 dan LR-08 (aturan waktu foto). Kode dibangun dengan bawaan; mengubahnya hanya konstanta di spek.
3. Q3 menahan LR-09 hanya pada aturan pita darurat.
4. Fase 2 (LR-13, LR-14) hanya sesudah uji perangkat nyata (LR-12) menunjukkan perlunya.
5. Perubahan perilaku halaman `/lapor` menaikkan versi aset (`?v=`) dan `VERSI` service worker.
