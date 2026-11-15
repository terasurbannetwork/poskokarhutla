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

### Hasil HR-03 (15 Nov 2026, kueri nyata, tanpa kunci, User-Agent generik, tanpa data pribadi)

| Uji | Hasil |
| --- | --- |
| ohsome `elements/count`, bbox Banda Aceh, `filter=building=* and geometry:polygon`, `time=2026-07-01` | 200, 128.574 elemen. Filter baru (`filter=`) dipakai, bukan parameter lama `types`/`keys`. |
| ohsome `elements/count`, bbox sekitar Tanah Laut (Kalsel), tanggal sama | 200, 86.828 elemen, 2,2 detik. Satu kueri per kab di bbox kab layak; poligon zona bahaya belum diuji (HR-04). |
| ohsome `contributions/count`, `time=2026-06-01,2026-07-01` | 200, 30 kontribusi bangunan. Bentuk benar dipastikan; 400 sebelumnya karena `clipGeometry` bukan parameter endpoint ini. |
| ohsome menyaring hashtag | TIDAK bisa: `hashtag=` ditolak 400 "Unknown parameter". `filter=changeset:<id>` sah, tetapi butuh daftar id changeset dari luar. |
| OSM API 0.6 `changesets.json?q=...` | 200 tetapi `q` DIABAIKAN (mengembalikan changeset acak, memuat nama pengguna). Tidak dipakai untuk hashtag, dan jawabannya memuat nama pengguna. |
| ohsomeNow Stats `https://stats.now.ohsome.org/api/stats/hashtags/<hashtag>?startdate=&enddate=` | 200, tanpa kunci, hashtag tidak peka huruf besar. Jawaban agregat: `changesets`, `users` (hitungan), `buildings`, `roads`, `edits`, `latest`. Data hidup (maks timestamp 15 Nov 2026), jadi tidak tertinggal seperti ohsome. Tanpa nama pengguna. |
| ohsomeNow `/stats?hashtag=&topics=building&startdate=&enddate=` | 200: `added`, `modified`, `deleted`, `value` (bersih) untuk topik bangunan. Hashtag tak ada = nol semua, bukan galat (nol berarti belum ada hasil, bukan kampus tidak aktif). |
| Batas laju | 40 kueri berurutan ke tiap layanan, tanpa jeda: semua 200, tanpa 429, tanpa header `RateLimit`/`Retry-After`. ohsome rata-rata 3,5 detik (maks 4,6); ohsomeNow rata-rata 0,87 detik (maks 0,98). Batas resmi tidak diumumkan; pipeline tetap memakai jeda 1 detik dan ulang dengan jeda naik saat 429/5xx. |

### Keputusan jalur (HR-03)

- Hitung N_osm per kab: ohsome `elements/count` (publik, tanpa kunci), kueri per kab, tanggal = `toTimestamp` metadata. Tertinggal sekitar 3,5 bulan; tanggal data selalu tampil (ALG §6).
- Baca balik sumbangan per kampus: **ohsomeNow Stats per hashtag** (`/stats/hashtags/<hashtag>` untuk changeset, jumlah pengguna, bangunan; `/stats?topics=building` untuk dibuat/diubah/dihapus). Hanya agregat, jadi D5, Q3, dan KEAMANAN-PRIVASI terpenuhi tanpa membuang nama dari memori. API changeset OSM TIDAK dipakai. Ohsome TIDAK dipakai untuk hashtag.
- Risiko: ohsomeNow adalah layanan HeiGIT/HOT tanpa jaminan tingkat layanan; kontrak jawaban belum dibekukan. Pembaca balik wajib menolak bentuk jawaban tak dikenal dan menandai "tidak tersedia", bukan nol. Kolom `users` hanya hitungan; jangan pernah memanggil `/stats/user*` (memuat id pengguna).
- Catatan: baris studi dan aktivasi 2025 di bagian A tetap BELUM diverifikasi; tidak dikerjakan di tiket ini.
