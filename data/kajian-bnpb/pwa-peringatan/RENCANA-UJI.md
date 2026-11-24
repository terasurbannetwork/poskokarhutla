# RENCANA-UJI: Pasang dan Peringatan

Prinsip pemilik: perilaku yang tinggal di luar TypeScript (D1, CHECK, rute, cron, enkripsi) diuji dengan yang benar-benar menjalankannya, bukan tiruan. Uji memakai `node:test` dan SQLite dengan semua migrasi dijalankan, seperti `tests/lapor/lanjut_migrasi.test.mjs`. Rute baru masuk registri cakupan yang dibaca gerbang integrasi (`tests/warga/cakupan.json`).

## Kriteria terima per fitur

| Fitur | Diterima bila | Bukti |
| --- | --- | --- |
| F-1 | manifest valid (nama, ikon 192 dan 512 PNG yang benar-benar ada dan ukurannya cocok, scope, start_url di dalam scope) | `tests/lapor/pwa_manifest.test.mjs` membaca berkas dan memeriksa ukuran PNG dari header |
| F-1 | `sw.js` dilayani dengan tipe JavaScript dan tidak di-cache lama | uji `_headers` dan uji server tinjau |
| F-2 | kartu tidak tampil bila standalone atau ditutup kurang dari 30 hari | uji fungsi murni `perluKartuPasang(keadaan)` |
| F-3, F-4 | batas 3 kecamatan, kode wilayah tak dikenal ditolak, jenis 0 ditolak | uji rute di SQLite |
| F-5 | tanpa dukungan, ditolak, dan diizinkan menghasilkan keadaan tampilan berbeda tanpa galat | uji fungsi murni keadaan |
| F-6 | isi push terenkripsi bisa didekripsi lawan (uji putar balik) dan di bawah 3993 byte | uji `enkripsi` dengan kunci penerima buatan |
| Peristiwa | sifat (a) sampai (e) di ALGORITMA 2 | uji tabel keputusan, termasuk `null` tidak menurunkan tingkat |
| Pemicu | `dibuat` sama tidak menghitung ulang; `dibuat` basi tidak mengirim; jeda global menahan semuanya | uji `jalankanPeringatan` dengan D1 SQLite dan `ASSETS` tiruan yang membaca berkas nyata `public/prediksi/data/prediksi.json` |
| Kecepatan | 100 langganan menghasilkan potongan 40, 40, 20 dan kursor maju tanpa mengulang | uji dengan `kirimKe` diganti pencatat |
| Berhenti | 404 dan 410 menghapus baris, 429 dan 5xx tidak | uji `catatHasil` |
| Titik evakuasi | urutan A sebelum B, radius 5 km, nama kosong dibuang, tanpa titik menghasilkan kalimat rujukan BPBD | uji fungsi murni dengan berkas OSM nyata satu provinsi |
| Teks | tidak ada kata "aman" di semua templat, label belum teruji muncul untuk angin, panjang di bawah batas | uji templat; gerbang tanpa kata "aman" meliputi `src/pw_peringatan.js` dan `public/lapor/peringatan.js` |
| Privasi | log dan jawaban rute tidak memuat endpoint, kunci, lat, lon; rute staf hanya agregat | uji rute menyisir jawaban dan `console` yang ditangkap |
| Retensi | baris 181 hari tanpa kunjungan dihapus, 179 tidak; peristiwa 31 hari dihapus | uji `bersihSemua` dengan jam tiruan |
| Skema | `migrations/0163_pw_peringatan.sql` idempoten (jalan dua kali), CHECK menolak endpoint non-https, kode kecamatan salah, jenis 0 atau 16, ambang 0 atau 4 | uji migrasi |

## Uji perangkat nyata (tidak bisa diotomatiskan penuh)

| No | Uji | Perangkat | Catatan |
| --- | --- | --- | --- |
| M1 | Pasang dari Chrome Android, buka dari ikon, nyalakan peringatan, terima notifikasi uji dari server dengan `PW_UJI=1` | satu HP Android | klik membuka kartu Arahan |
| M2 | Tambah ke Layar Utama di iPhone, buka dari ikon, nyalakan, terima | satu iPhone dengan iOS 16.4 atau lebih baru | memverifikasi R1 dan format kirim ke Apple (Q17) |
| M3 | Matikan izin di pengaturan sistem, kirim lagi, baris terhapus | kedua | memverifikasi 404 atau 410 |
| M4 | Mode hemat daya dan Jangan Ganggu | kedua | hanya dicatat, tidak ada jaminan |
| M5 | Layar 360 px dan 1280 px, bahasa Inggris, gerak dikurangi, pembaca layar | peramban | `inp-reviewer`, `selera-angka` |

Hasil M1 sampai M3 ditulis di TIKET (kolom bukti) dan di changelog Pantau Bencana; versi aplikasi dinaikkan tiap perubahan perilaku (pola gerbang versi Lapor).

## Tinjau lokal

`http://localhost:8800/lapor/` memakai server tinjau; rute `/api/lapor/peringatan/*` dijawab mesin lokal (`scripts/lapor/lokal.mjs`) tanpa mengirim push nyata. Localhost termasuk secure context, jadi pemasangan, service worker, dan izin notifikasi bisa dicoba; pengiriman nyata hanya di M1 sampai M3.

## Gerbang yang ditambahkan

1. `tests/agen/gerbang-pwa-peringatan.test.mjs` (PW-10): tidak ada literal warna baru, tidak ada kata "aman" di berkas modul, manifest dan ikon konsisten, `sw.js` tidak memuat `fetch` handler (D2), tidak ada `lat`/`lon` di pemanggilan `console` modul.
2. Entri `tests/warga/cakupan.json` untuk tiap rute baru.
