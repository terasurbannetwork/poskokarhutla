# TIKET: Akun BPBD dengan profil PIC

Ambil satu tiket, kerjakan hanya cakupannya. Tiap tiket: pengerja pemilik berkas, lalu pemeriksa bersih yang bukan pengerjanya (`AGENTS.md` 3.2). Subagent tidak commit, tidak push, tidak `wrangler deploy`; sesi induk yang melakukannya dengan path spesifik. Keadaan: belum ada tiket yang dikerjakan (23 Nov 2026).

**Peringatan pohon kerja.** Saat dokumen ini ditulis, `src/instansi.js`, `src/hak.js`, `src/worker.js`, `src/lapor_ai.js`, `public/instansi.js`, `public/instansi.html`, `public/admin/kinerja.js` dan beberapa berkas lain punya perubahan belum di-commit dari sesi lain. Tiket yang menyentuh berkas itu dimulai sesudah perubahan tersebut masuk (atau pengerja membaca keadaan terkini lebih dulu), dikerjakan satu per satu, dan di-commit dengan path spesifik.

## Urutan

PF-00 dahulu. PF-01 lalu PF-02. Sesudah PF-02: PF-03, PF-04, PF-05, dan PF-06 boleh berjalan, tetapi tiket yang menyentuh `src/instansi.js` (PF-04, PF-05, PF-06) berjalan satu per satu. Perluasan: PF-07 sesudah PF-06, PF-08 sesudah PF-04, PF-09 sesudah PF-08; ketiganya menyentuh `src/hak.js` dan dua di antaranya `src/lapor_ai.js` dan `public/lapor/meja.js`, jadi berjalan satu per satu. Layar (PF-03, PF-06 bagian layar) menunggu rute yang dipakainya.

## Tiket

| Tiket | Kerja | Berkas | Pengerja | Pemeriksa | Bukti | Menunggu |
| --- | --- | --- | --- | --- | --- | --- |
| PF-00 | Armada agent dan peta modul: entri roster untuk `src/profil*.js`, `public/instansi_profil.*`, `public/admin/instansi_profil.js` ke `warga-api`; bagian "baca dulu, baru bangun" paket ini di `AGENTS.md` (nomor berikut yang bebas); ilmu `warga-api` memuat peta paket; kerangka `tests/agen/gerbang-profil.test.mjs` GP-1 sampai GP-11 dengan uji mode gagal | `scripts/agents/roster.json`, `AGENTS.md`, `.claude/ilmu-agent/warga-api.md`, `tests/agen/gerbang-profil.test.mjs` | `mekanik-mesin`, `penulis-gerbang` | `higiene-repo` | `npm run agents:build`, `npm run uji:agen`, `node scripts/agents/ilmu.mjs pemilik src/profil.js` menyebut `warga-api` | - |
| PF-01 | Migrasi `instansi_profil`, `instansi_sesi_profil`, `instansi_profil_log`, indeks, trigger (DESAIN-TEKNIS 2); nomor diambil saat tiket (D8); sidik di `migrasi_beku.json`; fungsi `pf*` dasar di `src/hak.js` | `migrations/<nomor>_profil_bpbd.sql`, `tests/warga/migrasi_beku.json`, `tests/warga/cakupan.json` (entri tabel dan trigger baru), `src/hak.js` | `warga-api` | `migrasi-idempoten` | UP-11, UP-20 (bagian trigger), UP-26; `cakupan.json` memuat tiga tabel dan lima trigger baru; migrasi dua kali tanpa galat | PF-00 |
| PF-02 | Rute akun-level: `GET` dan `POST /profil`, `/profil/:id`, `/profil/:id/foto`, `/profil/:id/pin`, `/profil/:id/gantipin`, `/profil/keluar`, `/kirim`; PIN HMAC dan reservasi percobaan; kuki `sesi_profil` tiga Path; `PROFIL_KUNCI`; `sesi_profil` di `tolakOrigin`; `masuk` membawa `profil_mode`; `gantiSandi`, `ubahAkun` `reset` dan `cabut` mencabut sesi profil; `verifikasi` lama untuk pemda 409 | `src/profil.js`, `src/profil_konst.js`, `src/profil_sesi.js`, `src/hak.js`, `src/instansi.js`, `src/worker.js`, `tests/warga/profil.test.mjs` | `warga-api` | `guard-api`, `security-reviewer` | UP-2, UP-4, UP-6 sampai UP-14, UP-17, UP-23 sampai UP-25, UP-27, UP-29, UP-31; `npm run uji:warga` | PF-01 |
| PF-03 | Layar pilih profil dan dialog PIN, formulir daftar PIC (foto kamera atau galeri, perkecil di peramban, atur PIN), kartu dokumen, layar menunggu, kepala kerja dengan ganti profil; tautan WA dihapus untuk pemda; semua teks lewat `bahasa-indonesia-plain`; pola UI dirujukkan ke skill `modern-web-guidance` lebih dulu | `public/instansi.html`, `public/instansi.js`, `public/instansi_profil.js`, `public/instansi_profil.css` | `warga-api` | `inp-reviewer`, `selera-angka`, `security-reviewer` | L-1, L-2, L-5; GP-6, GP-7; tautan `http://localhost:8800/instansi` di laporan | PF-02 |
| PF-04 | Sesi profil di jalur kerja: `akunAktif` untuk pemda, log `kerja` di pembungkus `RUTE_INSTANSI`, `GET /profil/log`; meja membaca sesi profil (`hakMeja`, `lpAkunMeja` tanpa pemda, log `meja`); `/masuk` melewatkan akun pemda (Q1); pembersihan sesi, log, foto; tautan masuk meja ke `/instansi` | `src/instansi.js`, `src/lapor_ai.js`, `src/hak.js`, `src/masuk.js`, `src/masuk_undang.js`, `public/lapor/meja.js`, `tests/warga/profil_meja.test.mjs`, `tests/warga/profil_log.test.mjs`, `tests/warga/masuk*.test.mjs`, `tests/lapor/**` bila uji meja ikut berubah | `warga-api` (`public/lapor/meja.js`: `layar-peta`, satu baris) | `guard-api`, `security-reviewer` | UP-3, UP-5, UP-19, UP-21, UP-22, UP-28, UP-32; GP-11, GP-12, GP-13; uji menyiapkan profil aktif lewat sisipan D1 langsung; `npm run uji:warga` | PF-02 |
| PF-05 | Buat massal hanya pemda; teks undangan baru (tiga langkah daftar PIC) dan CSV; tombol dan progres di layar admin | `src/instansi.js` (`buatMassal`), `public/admin/instansi.js`, `tests/warga/instansi.test.mjs` | `warga-api` | `guard-api`, `selera-angka` | UP-1; GP-8, GP-9 | PF-00 |
| PF-06 | Admin: `setuju` akun mengaktifkan profil (pra-periksa 3), `tolak`; rute `/admin/profil/:akunId`, `/admin/profil/:id` (`setuju`, `cabut`, `reset_pin`, `buka_kunci`), foto admin, `/admin/log`; layar L7 | `src/profil.js`, `src/instansi.js` (`ubahAkun`), `src/hak.js`, `public/admin/instansi.js`, `public/admin/instansi_profil.js`, `tests/warga/profil.test.mjs` | `warga-api` | `guard-api`, `security-reviewer`, `inp-reviewer`, `selera-angka` | UP-15, UP-16, UP-18, UP-30; L-4; tautan `http://localhost:8800/admin/instansi` | PF-02 |
| PF-07 | K11 papan aktivasi: kolom jumlah PIC, status akun, menunggu, terakhir masuk, baris provinsi, rincian profil tersamar, kirim ulang undangan (`wa_antre` atau teks salin) | `src/masuk_undang.js`, `src/hak.js`, `public/admin/aktivasi.js`, `public/admin/aktivasi.css`, `tests/warga/profil_papan.test.mjs` | `warga-api` | `guard-api`, `security-reviewer`, `inp-reviewer`, `selera-angka` | UP-33, UP-34; GP-15; L-6; tautan `http://localhost:8800/admin/aktivasi` | PF-02 (data profil), PF-06 (status admin) |
| PF-08 | K12 pengambil laporan dan respons: migrasi `lapor_ambil` (nomor diambil saat tiket) dengan sidik dan entri `cakupan.json`; aksi `ambil`, label di daftar dan rincian meja, `GET /api/lapor/respons`; tombol dan label di meja; kartu "Respons laporan warga" di layar Pimpinan; komentar kepala `pimpinan.js` diperbarui | `migrations/<nomor>_lapor_ambil.sql`, `tests/warga/migrasi_beku.json`, `tests/warga/cakupan.json`, `src/lapor_ai.js`, `src/lapor_meja_hak.js`, `src/hak.js`, `public/lapor/meja.js` dan `meja.css` (`layar-peta`), `public/admin/pimpinan.js` (`ruang-bnpb`), `tests/warga/profil_ambil.test.mjs` | `warga-api` (meja: `layar-peta`; Pimpinan: `ruang-bnpb`, satu kartu) | `migrasi-idempoten`, `guard-api`, `security-reviewer`, `inp-reviewer`, `selera-angka` | UP-35, UP-36; GP-16; L-7, L-8; tautan `http://localhost:8800/lapor/meja` dan `/admin/pimpinan` | PF-04 |
| PF-09 | K13 kontak PIC untuk staf BNPB: `GET` dan `POST /api/lapor/meja/:nomor/pic`, `GET /api/kontak/admin/pic`, bagian PIC BPBD di meja BNPB, kolom dan daftar PIC di buku kontak; pelapor tidak berubah | `src/lapor_ai.js`, `src/hak.js`, `src/kontak.js`, `public/lapor/meja.js` (`layar-peta`), `public/admin/kontak.js`, `public/admin/kontak.css`, `tests/warga/profil_pic.test.mjs` | `warga-api` (meja: `layar-peta`) | `security-reviewer`, `guard-api`, `selera-angka`, `inp-reviewer` | UP-37, UP-38; GP-14; L-7, L-8; tautan `http://localhost:8800/admin/kontak` | PF-04, PF-08 (berkas `meja.js` dan `lapor_ai.js` bersama, kerja berurutan) |

## Letak jawaban Q dan N di tiket

| Pertanyaan | Tiket sebenarnya |
| --- | --- |
| Q1 (tutup kode WA untuk pemda) | PF-04 |
| Q2, Q3, Q5, Q8 (PIN, atur ulang, sandi bersama, umur sesi) | PF-02 dan PF-06 |
| Q4 (surat dan kartu tetap wajib) | PF-02 (`kirim`), PF-03 (layar) |
| Q6 (Polri dan TNI tidak dibuat) | PF-05 |
| Q7 (log 2 tahun, siapa melihat) | PF-01, PF-04, PF-06 |
| Q9 (PIC yang jaga) | PF-09 |
| Q10 (respons tanpa peringkat, ambang 5 laporan) | PF-08 |
| N7 | PF-02 |
| N8, N12 | PF-08 |
| N9, N10 | PF-07 |
| N11, N13 | PF-09 |
| N1 sampai N6 | PF-02, PF-03, PF-06 sesuai kolom Tiket di `PRD.md` |

## Yang harus dilakukan pemilik

| Hal | Untuk tiket |
| --- | --- |
| Jawab Q1 sampai Q8 dan N1 sampai N6 (bawaan sementara berlaku sampai dijawab) | semua |
| Terapkan migrasi profil di D1 produksi | PF-01, P-1 |
| Isi rahasia `PROFIL_KUNCI` (minimal 32 karakter) lewat `wrangler secret put` | PF-02, P-1 |
| Rumusan pemberitahuan dan persetujuan data pribadi PIC | PF-03 |
| Jalankan buat massal pemda di produksi dan simpan CSV | PF-05, P-2 |
| Kirim teks undangan ke kontak BPBD; kumpulkan kontak resmi tiap BPBD | PF-05 |
| Login uji di localhost diketik sendiri | PF-03, PF-06 |
| Tinjau layar di `http://localhost:8800/instansi`, `/admin/instansi`, `/lapor/meja`, `/admin/aktivasi`, `/admin/pimpinan`, `/admin/kontak` | PF-03, PF-04, PF-06, PF-07, PF-08, PF-09 |
| Terapkan migrasi `lapor_ambil` di D1 produksi | PF-08 |
| Pastikan buku kontak memuat nomor BPBD tiap daerah (`kontak_pemangku` kategori `bpbd`) supaya kirim ulang lewat WA punya tujuan | PF-07 |
| Jawab N8 sampai N13 (bawaan sementara berlaku) | PF-07 sampai PF-09 |
| Bila ada akun uji yang dibuat saat tinjau: hapus lewat cabut sesudah selesai | PF-06 |

## Paket lanjutan (bukan tiket di sini)

Akun Polda, Polres, Kodam, Kodim (Q6), papan aktivasi kab/kota yang memakai jumlah profil lengkap, tombol hapus data PIC atas permintaan (N6), jejak "lihat data pribadi" di layar admin, dan tautan isian lama ke profil pembuatnya mendapat keputusan dan paket tersendiri bila pemilik memintanya.
