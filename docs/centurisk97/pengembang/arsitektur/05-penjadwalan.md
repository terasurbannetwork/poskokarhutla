# Penjadwalan cron dan penjaga

Halaman ini menjelaskan jadwal cron Worker per menit dan penjaga jadwal GitHub.

## Penjadwalan: satu cron Worker per menit

Akun Workers Free hanya mengizinkan 5 jadwal cron untuk semua worker. Karena itu `wrangler.jsonc` memuat satu jadwal, `* * * * *` (`wrangler.jsonc:20`), dan `scheduled()` memilih tugasnya dari menit dan jam UTC (`src/worker.js:1007-1056`). Gerbang `tests/agen/gerbang-anggaran-cf.test.mjs` menegakkan bahwa cron di `wrangler.jsonc` persis satu itu dan bahwa tugas baru dipasang pada menit tetap (satu angka, paling sering sekali per jam), kecuali yang terdaftar sebagai warisan "lebih sering" yang daftarnya hanya boleh menyusut.

| Waktu (UTC) | Tugas | Baris |
| --- | --- | --- |
| Tiap menit | Katalog gempa, peringatan sesudah gempa baru, email EWS dekat pusat gempa, tugas api instansi (cek murah), ulang kabar gagal, alarm Himawari | 1014, 1028, 1029, 1039, 1042, 1044 |
| Menit 15, jam kelipatan 3 | Titik panas FIRMS ke D1 | 1010 |
| Menit 16, jam kelipatan 3 | Antrean panggilan perusahaan | 1012 |
| Menit >= 25, jam kelipatan 3 | Push daerah (sisa akun dilanjutkan menit berikutnya) | 1017 |
| Menit 57 tiap jam | Denyut ke `jaga.yml` | 1016 |
| Jam 0 menit 5 dan 35 | Arsip sitrep 07 WIB (menit 35 mengulang bila gagal) | 1018 |
| Jam 0 menit 1 dan 31 | Draf Laporan Karhutla harian 07.01 WIB | 1019 |
| Jam 0 menit 40 | Antrean pengingat harian | 1020 |
| Jam 9 menit 0, 30 dan menit 5, 35 | Pertanyaan harian data lanjutan BPBD, tanya kondisi lapangan | 1022, 1023 |
| Menit kelipatan 10 | Nowcast BMKG | 1040 |
| Menit 7 dan 37 | Level gunung api MAGMA | 1041 |
| Menit 17 tiap jam | Pembersihan data kedaluwarsa (`bersihSemua`) dan peringatan Lapor | 1033, 1034 |
| Menit 19, 20, 21, 23 | Ringkasan jeda satelit, uji lapangan, peringatan jenis baru, nilai drop heli tertunda | 1025, 1026, 1043, 1027 |
| Menit 23 tiap jam; jam 20 untuk dasar | SIHKA (sungai terukur); dasar historis harian | 1049, 1050 |
| Menit 29 tiap jam | Peringatan dini warga (Web Push) | 1032 |
| Menit 38 | Sungai resmi DSDA dan SIPANTAU | 1047 |
| Menit 46 | ADS-B (pelacakan pesawat, 7 permintaan berjeda) | 1030 |
| Menit 3 tiap 10 menit, kecuali menit 23 | Hujan SIHKA per interval (menit 23 sudah dipegang SIHKA jam-an) | 1046 |
| Jam 3 dan 13, menit 40 | Pengingat lapangan: petugas belum absen (10.40 WIB) dan belum isi logbook (20.40 WIB) | 1021 |
| Menit 52 | Cadangan pemicu `titik.yml` bila run sukses terakhir lebih dari 4 jam | 1052 |
| Menit 55, jam kelipatan 6 | Pengingat prioritas | 1024 |

Bagian bersih-bersih (`src/worker.js:1061-1093`) memangkas laporan warga lama, foto, multipart video yang terbengkalai, sesi, arsip sitrep (retensi 400 hari), telemetri SIPPA lebih dari 30 hari, ADS-B lebih dari 90 hari, granul satelit lebih dari 400 hari, dan menganonimkan relawan ditolak atau nonaktif lebih dari 180 hari. Sesudah itu ia mencatat gangguan sumber dan memusnahkan garam IP hari sebelumnya.

## Penjaga jadwal GitHub

Pada 7 sampai 8 November 2026 GitHub membuang pemicu `schedule` secara luas, termasuk milik `jaga.yml` sendiri, sedangkan `workflow_dispatch` tetap berjalan (`scripts/terbit/jaga_jadwal.mjs:1-6`). Dua lapis cadangan dipasang:

1. Cron Worker menit 57 memicu `jaga.yml` lewat API GitHub (`src/jaga_jadwal.js`), tanpa mengurai apa pun.
2. `jaga.yml` menjalankan `scripts/terbit/jaga_jadwal.mjs`: untuk tiap workflow di daftar `JADWAL`, bila run sukses terakhir lebih tua dari `maks` menit, workflow itu dipicu. Aturan putusan (`putuskan`): tunggu bila ada run sedang jalan atau antre, bila run terakhir dibuat kurang dari 50 menit lalu, atau bila tiga run terakhir gagal berturut-turut (ditahan 6 jam, kecuali putaran cut-off laporan); picu bila lewat `maks` atau putaran cut-off terlewat.
3. Cadangan terpisah untuk titik panas: Worker menit 52 memicu `titik.yml` bila run sukses terakhir lebih dari 4 jam dan tidak ada run grup `data` yang antre atau jalan, paling banyak sekali per 3 jam (`src/jaga_pipa.js:10-20`).

![Grafik batang batas umur run sukses (menit) sebelum penjaga jadwal memicu tiap workflow. Sumber: daftar JADWAL di scripts/terbit/jaga_jadwal.mjs.](gambar/arsitektur-jaga-jadwal.svg)

Daftar `JADWAL` dan nilai `maks` (menit): `titik.yml` 170 (dengan jendela cut-off 09.10 sampai 09.50 dan 22.55 sampai 23.40 UTC), `himawari.yml` 50, `jarak_pandang.yml` 70 (hanya jam 23 sampai 10 UTC), `udara.yml` 770, `semai.yml` 770, `data.yml` 1490, `banjir.yml` 1490, `gempa.yml` 1490. Pemicuan butuh secret `GITHUB_TOKEN` di Worker; tanpa token langkah ini dilewati diam-diam.
