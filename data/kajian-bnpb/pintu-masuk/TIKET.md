# TIKET: Satu Pintu Masuk

Ambil satu tiket, kerjakan hanya cakupannya. Tiap tiket: pengerja pemilik berkas, lalu pemeriksa bersih yang bukan pengerjanya (AGENTS 3.2). Subagent tidak commit dan tidak push. Selesai: PM-01, PM-02 (15 Nov 2026). Migrasi `0133_masuk.sql` belum diterapkan di D1 produksi; itu langkah pemilik.

## Urutan

Tahap 1 (pintu dasar): PM-01 sampai PM-08. Sesudah tahap ini orang yang akunnya sudah ada bisa masuk dengan kode, dan siapa pun bisa punya akun umum.
Tahap 2 (tanpa menunggu admin): PM-09 sampai PM-12.
Tahap 3 (pelengkap): PM-13 sampai PM-16.

## Tahap 1

| Tiket | Kerja | Berkas | Pengerja | Pemeriksa | Bukti | Menunggu |
| --- | --- | --- | --- | --- | --- | --- |
| PM-01 | Entri wilayah roster untuk `public/masuk.*` dan `src/masuk*.js`; kerangka gerbang G-1 sampai G-7 dengan uji mode gagal | `scripts/agents/roster.json`, `tests/agen/gerbang-pintu-masuk.test.mjs` | `mekanik-mesin`, `penulis-gerbang` | `higiene-repo` | `npm run uji:agen` | - |
| PM-02 | Migrasi `mk_*`, `alun_penulis`, indeks `wa`; nama kolom dicocokkan dengan migrasi asli | `migrations/<nomor>_masuk.sql`, `tests/warga/migrasi_beku.json` | `warga-api` | `migrasi-idempoten` | migrasi jalan dua kali tanpa galat | nomor migrasi (D13) |
| PM-03 | Minta dan periksa kode, batas laju, HMAC, penjaga `x-pb` dan `Origin`, 503 saat tabel atau rahasia belum ada, pendaftaran rute, `sesi_masuk` di `tolakOrigin` | `src/masuk.js`, `src/masuk_konst.js`, `src/worker.js`, `tests/warga/masuk.test.mjs` | `warga-api` | `guard-api`, `security-reviewer` | U-1 sampai U-9 | PM-02 |
| PM-04 | Gerbang WA: aturan tarik dan hapus baris `otp`, jeda tarik 5 detik, denyut `mk_denyut`, pembersihan `mk_*` | `src/lapangan_wa.js`, `src/lapangan_panel.js`, `scripts/wa/lapangan_tarik.mjs` | `warga-api`, `wa-bot` | `security-reviewer` | U-10, U-11 | PM-03 |
| PM-05 | Buka `/masuk` dan `/alun-alun` di `PUBLIK_TANPA_SESI` (K8), tiap entri beralasan | `src/worker.js`, `tests/warga/posko.test.mjs` (daftar 11 kunci di baris 646 disamakan atau memakai `tests/agen/fixtures/pintu_masuk.json`) | `warga-api` | `guard-api` | U-12, G-4 | - |
| PM-06 | `sesiUntuk` dan `cabutSesi` di modul instansi, pendataan, kampus; `cabutSesi` staf; pencocokan nomor ke akun; pemilih ruang; `cariOrang` dan `cariRelawan` menerima sesi bernomor sama dengan hak terbatas; `mk_masuk_log`; pemirsa lewat `mk_pemirsa_wa` dan rute Super Admin pengisi nomornya; keluar | `src/masuk.js`, `src/pemirsa.js`, `src/instansi.js`, `src/pendataan.js`, `src/kemitraan_akun.js`, `src/staf.js`, `src/lapangan.js` | `warga-api` | `guard-api`, `security-reviewer` | U-13 sampai U-17, U-35 | PM-03 |
| PM-07 | Sandi staf sesudah kode lewat `cobaMasukStaf`; akun rahasia tidak pernah lewat pintu ini | `src/masuk.js` | `warga-api` | `security-reviewer` | U-18, U-19 | PM-06 |
| PM-08 | Akun umum: lengkapi profil, persetujuan, layar L1 sampai L4, tautan dari pintu lama | `src/masuk.js`, `public/masuk.html`, `public/masuk.js`, `public/masuk.css`, `src/statistik.js`, `public/instansi.html` dan halaman masuk modul lain | `warga-api` | `inp-reviewer`, `selera-angka`, `security-reviewer` | U-20, U-21, L-1, L-4 | PM-03 |

## Tahap 2

| Tiket | Kerja | Berkas | Pengerja | Pemeriksa | Bukti | Menunggu |
| --- | --- | --- | --- | --- | --- | --- |
| PM-09 | Permohonan anggota dan aktif otomatis lewat kontak; pendataan aktif lewat kontak `bnpb`; tanda "cocok kontak" di antrean tinjau instansi; relawan diarahkan ke form relawan bernomor terisi; layar L5 | `src/masuk_undang.js`, `src/masuk.js`, `public/masuk.js` | `warga-api` | `guard-api`, `security-reviewer` | U-22 sampai U-24 | PM-08 |
| PM-10 | Peta domain oleh admin dan kode ke email terpetakan | `src/masuk_undang.js`, `src/masuk.js` | `warga-api` | `security-reviewer` | U-25 | domain pengirim terverifikasi |
| PM-11 | Undangan berantai, daftar dan cabut anggota, kartu "Undang rekan" | `src/masuk_undang.js`, `public/inti/undang.js` | `warga-api`, `inti-layar` | `guard-api`, `security-reviewer`, `inp-reviewer` | U-26 sampai U-28 | PM-06 |
| PM-12 | Papan aktivasi 514 kab/kota | `src/masuk_undang.js`, `public/admin/aktivasi.js` | `warga-api` | `selera-angka`, `inp-reviewer`, `guard-api` | U-29, L-2, L-3 | PM-11 |

## Tahap 3

| Tiket | Kerja | Berkas | Pengerja | Pemeriksa | Bukti | Menunggu |
| --- | --- | --- | --- | --- | --- | --- |
| PM-13 | `aturSandi` di modul instansi, pendataan, kampus; rute atur sandi sesudah kode | `src/masuk.js`, `src/instansi.js`, `src/pendataan.js`, `src/kemitraan_akun.js`, `public/masuk.js` | `warga-api` | `security-reviewer` | U-30 | PM-06 |
| PM-14 | Hapus akun umum sendiri; bukti ulang 180 hari | `src/masuk.js`, `src/masuk_undang.js` | `warga-api` | `security-reviewer` | U-31, U-32 | PM-09 |
| PM-15 | Alun-alun mengenali akun yang masuk (`alun_penulis`, label); kode contoh dan tombolnya dibuang | `src/alun.js`, `public/bnpb/alun-alun.js`, `public/admin/alun.js`, `tests/warga/alun.test.mjs` | `warga-api`, `ruang-bnpb` | `guard-api`, `security-reviewer` | U-33, `npm run uji:warga` | PM-08 |
| PM-16 | Cadangan kode lewat email saat gerbang mati (ALUR A8) dan uji produksi | `src/masuk.js`, `public/masuk.js` | `warga-api` | `security-reviewer` | U-34, P-1 sampai P-5 | PM-04, domain pengirim terverifikasi |

## Yang harus dilakukan pemilik

| Hal | Untuk tiket |
| --- | --- |
| Isi nomor WA tiap pemirsa (Super Admin) | PM-06 |
| Terapkan migrasi di D1 produksi | PM-02 |
| Isi rahasia `MASUK_KUNCI`; pastikan `TURNSTILE_SECRET` terisi | PM-03 |
| Verifikasi domain pengirim email di Resend | PM-10, PM-16 |
| Impor kontak pemangku (CSV) supaya aktif otomatis berguna | PM-09 |
| Aktifkan akun instansi pertama tiap daerah lewat verifikasi yang ada (K11) | PM-09, PM-11 |

## Paket lanjutan (bukan tiket di sini)

Integrasi alun-alun ke nomor kejadian, antrean BPBD kabupaten, lencana terverifikasi, dan rekap untuk Kepala (KEPUTUSAN D14) mendapat paket dokumen sendiri sesudah Tahap 1 tayang. Menautkan tiap isian instansi ke anggota pengisinya juga di luar paket ini.
