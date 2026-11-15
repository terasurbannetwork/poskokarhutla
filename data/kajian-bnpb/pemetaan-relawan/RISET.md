# RISET: Pemetaan bangunan oleh relawan

Tanggal riset 15 Nov 2026. Bagian A dari internet (dikutip, bukan diverifikasi ulang kecuali ditandai), bagian B dari kode repo (dibaca berkas dan baris), bagian C uji sambungan API publik yang dijalankan hari ini.

## A. Benchmark luar

| Sumber | Temuan |
| --- | --- |
| HOT Tasking Manager | Alat pembagian kerja pemetaan OSM: proyek dipecah jadi tugas persegi, tiap tugas dipetakan lalu divalidasi orang lain. Standar de facto aktivasi kemanusiaan. |
| Studi akademik Tasking Manager | 38.893 kontributor menyelesaikan 312.289 tugas pada Des 2021 sampai Nov 2023. Menunjukkan skala yang bisa diharapkan dan kebutuhan validator. |
| Mapathon antisipatif | HOT dan mitra memetakan daerah rawan sebelum bencana, bukan sesudahnya; itulah bentuk F8. |
| Aktivasi 2025 | Badai Melissa (Jamaika) pemetaan kerusakan; gempa Myanmar 2025; Siklon Jude (Mozambik) 2025. Pola: peta dasar bangunan lebih dulu, lalu kerusakan. |
| MapSwipe | Aplikasi seluler untuk menyaring citra (ada bangunan atau tidak) sebelum dipetakan; berguna sebagai langkah lanjutan, bukan inti F8. |
| Pedoman organised editing OSM | Penyuntingan terorganisir (kelompok, kampus, perusahaan) wajib punya halaman wiki, hashtag, dan komunikasi dengan komunitas lokal. Menjadi dasar D3 dan Q2. |

Catatan jujur: baris studi (38.893 kontributor, 312.289 tugas) dan baris Aktivasi 2025 **[BELUM DIVERIFIKASI]**: judul, penulis, tahun makalah dan sumber tiap aktivasi belum dicantumkan; isi di HR-03 sebelum dikutip di buku atau layar.

## B. Fakta repo

| Fakta | Bukti |
| --- | --- |
| Paparan memakai Google Open Buildings v3, ambang keyakinan 0,70. | `scripts/umum/bangunan.py:1,34,40`; `scripts/siklus/paparan.py:1,32`; `src/bangunan.js:1` |
| OSM hanya cadangan kepadatan kasar Jakarta (ubin 0,05 derajat, Overpass); sendiri mengaku kelengkapan OSM bervariasi. | `scripts/banjir/genangan/gedung.py:1-6` |
| Overture sudah terdaftar sebagai sumber hidup, tetapi pangsa sumbernya hanya disampel di dua tempat: Banda Aceh (OSM 127.228 dari 133.727) dan Jakarta (OSM 80,5 persen). | `scripts/siklus/sumber.json:209-223` |
| Tidak ada metrik kelengkapan OSM per kab dan tidak ada integrasi Tasking Manager. Yang ada dan layak dipakai ulang: `scripts/akademisi/sambung_panen.mjs:233` membaca daftar proyek HOT Tasking Manager per kejadian (id, persen dipetakan, kontributor) dari panen; `public/data/citra_terbuka.json` indeks citra OpenAerialMap (1091 citra, 206 kab) untuk saran citra (Q4); `data/kajian-bnpb/pustaka/4-ndpba.md:76,378,383` menyebut HOTOSM. HR-04 dan HR-07 wajib memeriksa pemakaian ulang ini sebelum menulis pembaca baru. | grep 15 Nov 2026 |
| Kemitraan: tabel `km_masalah`, `km_aktivasi`, `km_satgas`, `km_piket`, `km_pelajaran` ada di migrasi 0081 dan 0083; `src/kemitraan_masalah.js` ada, tetapi tidak ada rujukan `km_aktivasi` atau `km_satgas` di `src/`. | grep `src` 15 Nov 2026 |
| `relawan_permintaan` ada. | `migrations/0023_relawan.sql:98-111` |
| `km_aktivasi` membatasi `bahaya` ke daftar tetap dan `radius_km` 50-500. | `migrations/0083*.sql:51-71` |

Konsekuensi: kelengkapan harus dihitung baru, dan kampus tidak bisa menerima tugas lewat kode hari ini; F8 butuh tabel sendiri.

## C. Uji sambungan 15 Nov 2026

| Uji | Hasil |
| --- | --- |
| ohsome API `v1/metadata` tanpa kunci | 200. Rentang data 8 Okt 2007 sampai 27 Jul 2026; jadi data terbaru tertinggal sekitar 3,5 bulan. |
| ohsome `elements/count`, bbox kota Banda Aceh, `building=*`, tanggal 2026-11-01 | 404: tanggal di luar rentang. Tanggal 2026-07-01 berhasil (153.076 elemen). |
| ohsome `contributions/count` dengan `clipGeometry` | 400: parameter tidak dikenal. Perlu cari bentuk kueri yang benar. |
| OSM API 0.6 `changesets.json` | 200 tanpa kunci; pencarian hashtag lewat parameter `q` tidak terbukti, perlu diuji di HR-03. |

Kesimpulan kelayakan: HITUNG kelengkapan lewat ohsome layak (publik, tanpa kunci), tetapi tertinggal beberapa bulan. BACA BALIK sumbangan per hashtag BELUM terbukti dengan ohsome; jalur cadangannya API changeset OSM atau layanan statistik hashtag publik. Dua-duanya dijadikan tiket uji (HR-03) sebelum desain pembacaan balik dikunci. Batas laju dan kuota ohsome tidak kami asumsikan; diukur di HR-03 dan dicatat.
