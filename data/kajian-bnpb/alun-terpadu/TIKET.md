# TIKET: Alun-alun Terpadu

Ambil satu tiket, kerjakan hanya cakupannya. Tiap tiket: pengerja pemilik berkas, lalu pemeriksa bersih yang bukan pengerjanya (AGENTS 3.2). Subagent tidak commit dan tidak push. Sedang dikerjakan: AT-01, AT-02 (15 Nov 2026). Migrasi `0150_alun_terpadu.sql` belum diterapkan di D1 produksi; itu langkah pemilik.

## Urutan

Tahap 1 (utas sampai ke lembaga): AT-01 sampai AT-08. Tidak bergantung pada Buku Besar.
Tahap 2 (utas menempel ke kejadian): AT-09a, AT-10, AT-11.
Tahap 3 (rekap untuk pimpinan): AT-09b, AT-09c, AT-12.

## Tahap 1

| Tiket | Kerja | Berkas | Pengerja | Pemeriksa | Bukti | Menunggu |
| --- | --- | --- | --- | --- | --- | --- |
| AT-01 | Kerangka gerbang G-1 sampai G-8 dengan uji mode gagal; cek pemilik berkas baru di roster | `tests/agen/gerbang-alun-terpadu.test.mjs`, `scripts/agents/roster.json` bila perlu | `penulis-gerbang`, `mekanik-mesin` | `higiene-repo` | `npm run uji:agen` | - |
| AT-02 | Migrasi tabel samping (`alun_wilayah`, `alun_lembaga`, `alun_riwayat`, `alun_tanda`) dan indeks | `migrations/<nomor>_alun_terpadu.sql`, `tests/warga/migrasi_beku.json` | `warga-api` | `migrasi-idempoten` | migrasi dua kali tanpa galat | nomor migrasi (D18) |
| AT-03 | Kabupaten baku: pemeriksa kode di server, penyimpanan `alun_wilayah`, daftar kabupaten berkode di form tulis, kesamaan kode Worker dan pipeline | `src/siklus_kab.js`, `src/alun.js`, `src/hak.js`, `public/bnpb/alun-alun.js`, `.html` | `warga-api`, `ruang-bnpb` | `guard-api`, `security-reviewer` | U-1, U-2, L-1 | AT-02 |
| AT-04 | Kotak masuk: rute daftar dan rincian tersaring wilayah di SQL, tab dan kartu di `/instansi` | `src/alun_instansi.js`, `src/alun_konst.js`, `src/hak.js`, `src/worker.js`, `public/instansi.html`, `public/instansi.js`, `public/instansi_alun.js` | `warga-api` | `guard-api`, `security-reviewer`, `inp-reviewer`, `selera-angka` | U-3, U-4, L-2 | AT-03 |
| AT-05 | Balas atas nama lembaga lewat kotak masuk (`alun_lembaga`), pil lembaga di layar publik, label lembaga dilepas dari kiriman pribadi, daftar nama resmi diperluas | `src/alun_instansi.js`, `src/alun.js`, `src/hak.js`, `public/instansi_alun.js`, `public/bnpb/alun-alun.js`, `.css` | `warga-api`, `ruang-bnpb` | `guard-api`, `security-reviewer` | U-5 sampai U-9, L-3 | AT-04, jawaban Q13 |
| AT-06 | Status bantuan dengan alasan baku dan riwayat; moderator dan Teruskan ikut menulis riwayat; pelapor membuka lagi; hapus utas membuang semua tabel samping | `src/alun_instansi.js`, `src/alun.js`, `src/hak.js`, `public/instansi_alun.js`, `public/admin/alun.js`, `public/bnpb/alun-alun.js` | `warga-api`, `ruang-bnpb` | `guard-api`, `security-reviewer` | U-10 sampai U-14, G-7 | AT-05, jawaban Q13 |
| AT-07 | Tanda tidak valid dan antrean moderatornya | `src/alun_instansi.js`, `src/alun.js`, `src/hak.js`, `public/instansi_alun.js`, `public/admin/alun.js` | `warga-api` | `guard-api`, `security-reviewer` | U-15 | AT-04 |
| AT-08 | Pemberitahuan kebutuhan terverifikasi ke akun wilayah lewat `kabarkan()`, dengan batas per wilayah dan per akun | `src/alun.js`, `src/kabar.js`, `src/hak.js`, `src/worker.js`, `src/alun_konst.js` | `warga-api` | `security-reviewer` | U-16, U-17 | AT-04, jawaban Q10 |

## Tahap 2

| Tiket | Kerja | Berkas | Pengerja | Pemeriksa | Bukti | Menunggu |
| --- | --- | --- | --- | --- | --- | --- |
| AT-09a | Sumber `alun`: rute ingest modul, aturan khusus di pencocok, penolakan aksi `baru` di rute Worker, cabut tautan saat moderasi, pelaku `MATRIKS` | `src/hak.js`, `src/kejadian_tautan.js`, `src/siklus_kejadian.js`, `src/alun.js`, `scripts/siklus/pasang.py`, `tests/siklus/**` | `warga-api`, `siklus` | `guard-api`, `security-reviewer`, `validasi-model` (enam sumber lain tidak berubah) | U-18 sampai U-20, P-1 sampai P-3, G-1, G-2 | AT-03, AT-07; migrasi Keterpaduan (KP-25) untuk uji produksi |
| AT-10 | Tanda kejadian di jawaban baca publik dan di layar alun-alun | `src/alun.js`, `src/hak.js`, `public/bnpb/alun-alun.js` | `warga-api`, `ruang-bnpb` | `guard-api`, `security-reviewer` | U-21, U-22, L-3 | AT-09a |
| AT-11 | Kartu "Kabar warga" di halaman kejadian `/siklus` | rute Siklus di `src/`, `public/siklus/**` | `warga-api`, `siklus` | `guard-api`, `inp-reviewer` | U-26 | AT-09a |

## Tahap 3

| Tiket | Kerja | Berkas | Pengerja | Pemeriksa | Bukti | Menunggu |
| --- | --- | --- | --- | --- | --- | --- |
| AT-09b | Rute ingest rekap, `alun_rekap.py`, langkah `siklus.yml` | `src/kejadian_tautan.js`, `src/hak.js`, `scripts/siklus/alun_rekap.py`, `.github/workflows/siklus.yml`, `tests/siklus/**` | `warga-api`, `siklus`, `mekanik-mesin` | `security-reviewer`, `validasi-model` (angka cocok hitungan mandiri) | U-23, P-4 sampai P-7, G-4, G-5 | AT-05, AT-06, AT-07, AT-09a |
| AT-09c | Rute rekap dari R2 dengan hak staf berwilayah; statistik admin pindah ke rekap; kartu "Belum ada di Buku Besar" | `src/alun.js`, `src/worker.js`, `public/admin/alun.js` | `warga-api` | `guard-api`, `security-reviewer`, `selera-angka` | U-24, U-25, G-3, G-8 | AT-09b |
| AT-12 | Kartu "Alun-alun" di Layar Pimpinan dari rute rekap | `public/admin/pimpinan.js` | `ruang-bnpb` | `selera-angka`, `inp-reviewer` | L-4, L-5, G-6 | AT-09c |

Tidak ada tiket untuk dasbor pimpinan `/bnpb/pimpinan`, rekap publik, rekap untuk mitra, Laporan Berkala, atau balasan lembaga dari halaman publik sampai pemilik menjawab Q11, Q1, Q2, Q12, dan bagian kedua Q13.

## Yang harus dilakukan pemilik

| Hal | Untuk tiket |
| --- | --- |
| Jawab Q13 (BPBD menjawab atas nama lembaga dan mengubah status) | AT-05, AT-06 |
| Jawab Q10 (push dan email ke akun pemerintah daerah) | AT-08 |
| Jawab Q1, Q2, Q11, Q12 (siapa di luar pelaksana yang melihat rekap) | tiket baru sesudah AT-12 |
| Terapkan migrasi paket ini dan migrasi Keterpaduan (KP-25) di D1 produksi | AT-02, AT-09a |
| Aktifkan paket Satu Pintu Masuk di produksi dan akun instansi daerah | AT-04, AT-08 |
| Verifikasi domain pengirim email bila mau pemberitahuan lewat email | AT-08 |
