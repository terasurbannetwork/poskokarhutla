# TIKET: Alun-alun Terpadu

Ambil satu tiket, kerjakan hanya cakupannya. Tiap tiket: pengerja pemilik berkas, lalu pemeriksa bersih yang bukan pengerjanya (AGENTS 3.2). Subagent tidak commit dan tidak push. Belum ada tiket yang dikerjakan.

## Urutan

Tahap 1 (utas sampai ke lembaga): AT-01, AT-02, AT-05 sampai AT-08. Bisa berjalan tanpa Buku Besar.
Tahap 2 (utas menempel ke kejadian): AT-03, AT-04, AT-11.
Tahap 3 (rekap untuk pimpinan): AT-09, AT-10, AT-12.

## Tahap 1

| Tiket | Kerja | Berkas | Pengerja | Pemeriksa | Bukti | Menunggu |
| --- | --- | --- | --- | --- | --- | --- |
| AT-01 | Kerangka gerbang G-1 sampai G-6 dengan uji mode gagal; cek pemilik berkas baru di roster | `tests/agen/gerbang-alun-terpadu.test.mjs`, `scripts/agents/roster.json` bila perlu | `penulis-gerbang`, `mekanik-mesin` | `higiene-repo` | `npm run uji:agen` | - |
| AT-02 | Migrasi `alun_riwayat`, trigger append-only, indeks kotak masuk | `migrations/<nomor>_alun_terpadu.sql`, `tests/warga/migrasi_beku.json` | `warga-api` | `migrasi-idempoten` | migrasi dua kali tanpa galat, U-13 | nomor migrasi (D13) |
| AT-05 | Kotak masuk: rute daftar dan rincian, lingkup di SQL, tab dan kartu di `/instansi` | `src/alun_instansi.js`, `src/alun_konst.js`, `src/hak.js`, `public/instansi.html`, `public/instansi.js`, `public/instansi_alun.js` | `warga-api` | `guard-api`, `security-reviewer`, `inp-reviewer`, `selera-angka` | U-6, U-7, L-1 | AT-02 |
| AT-06 | Balas sebagai lembaga dari kotak masuk dan dari halaman alun-alun; pil lembaga di layar publik | `src/alun_instansi.js`, `src/alun.js`, `src/hak.js`, `public/bnpb/alun-alun.js`, `.html`, `.css` | `warga-api`, `ruang-bnpb` | `guard-api`, `security-reviewer` | U-8 sampai U-11, L-2 | AT-05 |
| AT-07 | Ubah status bantuan dengan riwayat; "Riwayat penanganan" di rincian publik | `src/alun_instansi.js`, `src/alun.js`, `src/hak.js`, `public/instansi_alun.js`, `public/bnpb/alun-alun.js` | `warga-api`, `ruang-bnpb` | `guard-api`, `security-reviewer` | U-12 sampai U-14 | AT-06, jawaban Q7 dan Q8 bila ada |
| AT-08 | Pemberitahuan utas "butuh bantuan" ke akun wilayah lewat `kabarkan()` | `src/alun.js`, `src/kabar.js`, `src/hak.js`, `src/alun_konst.js` | `warga-api` | `security-reviewer` | U-15, U-16 | AT-05, jawaban Q3 bila ada |

## Tahap 2

| Tiket | Kerja | Berkas | Pengerja | Pemeriksa | Bukti | Menunggu |
| --- | --- | --- | --- | --- | --- | --- |
| AT-03 | Sumber `alun` di ingest modul dan di pencocok; tidak pernah membuat kejadian; daftar kabupaten di form tulis | `src/hak.js`, `src/kejadian_tautan.js`, `scripts/siklus/pasang.py`, `public/bnpb/alun-alun.js`, uji pipeline | `warga-api`, `siklus`, `ruang-bnpb` | `guard-api`, `validasi-model` (aturan pencocok tidak berubah) | U-1 sampai U-3, P-1 sampai P-3, G-1 | migrasi Keterpaduan (KP-25) untuk uji produksi |
| AT-04 | Tanda kejadian di jawaban baca dan di layar alun-alun | `src/alun.js`, `src/hak.js`, `public/bnpb/alun-alun.js` | `warga-api`, `ruang-bnpb` | `guard-api`, `security-reviewer` | U-4, U-5, L-2 | AT-03 |
| AT-11 | Kartu "Kabar warga" di halaman kejadian `/siklus` | `src/kejadian_tautan.js` atau rute Siklus, `public/siklus/**` | `warga-api`, `siklus` | `guard-api`, `inp-reviewer` | U-20 | AT-03 |

## Tahap 3

| Tiket | Kerja | Berkas | Pengerja | Pemeriksa | Bukti | Menunggu |
| --- | --- | --- | --- | --- | --- | --- |
| AT-09 | Ingest rekap, `alun_rekap.py`, langkah `siklus.yml`, rute rekap dari R2, "Belum ada di Buku Besar", statistik admin pindah ke rekap | `src/kejadian_tautan.js`, `src/alun.js`, `scripts/siklus/alun_rekap.py`, `.github/workflows/siklus.yml`, `public/admin/alun.js` | `warga-api`, `siklus`, `mekanik-mesin` | `guard-api`, `security-reviewer`, `validasi-model` (angka cocok hitungan mandiri) | U-17 sampai U-19, P-4 sampai P-7, G-2 sampai G-4, G-6 | AT-06, AT-03 |
| AT-10 | Kartu "Alun-alun" di Layar Pimpinan dan dua baris di dasbor pimpinan | `public/admin/pimpinan.js`, `public/inti/dasbor_pimpinan.js`, `src/pb_ringkas.js` | `ruang-bnpb`, `inti-layar`, `warga-api` | `selera-angka`, `inp-reviewer` | L-3, L-4, G-5 | AT-09 |
| AT-12 | Berkas angka untuk Laporan Berkala: bentuk `sumber` sesuai DESAIN-TEKNIS laporan-berkala, tanpa memasang ke perakit | `scripts/siklus/alun_rekap.py`, catatan di `data/kajian-bnpb/laporan-berkala/` | `siklus` | `validasi-model` | berkas lolos pemeriksa bentuk | AT-09; pemasangan menunggu tiket LB |

Rekap ke publik atau ke mitra berkunci API tidak punya tiket sampai pemilik menjawab Q1 dan Q2.

## Yang harus dilakukan pemilik

| Hal | Untuk tiket |
| --- | --- |
| Jawab Q1 dan Q2 (siapa di luar BNPB yang melihat rekap) | tiket baru sesudah AT-09 |
| Jawab Q3 (WA untuk pemberitahuan), Q7 dan Q8 (siapa mengubah status) bila bawaan tidak cocok | AT-07, AT-08 |
| Terapkan migrasi paket ini dan migrasi Keterpaduan (KP-25) di D1 produksi | AT-02, AT-03 |
| Aktifkan paket Satu Pintu Masuk di produksi dan akun instansi daerah | AT-05, AT-06 |
| Verifikasi domain pengirim email bila mau pemberitahuan lewat email | AT-08 |
