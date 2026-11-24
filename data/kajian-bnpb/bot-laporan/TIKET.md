# TIKET: Bot WA pembuat laporan

Urutan kerja. Ambil satu tiket, kerjakan hanya cakupannya. Tiket yang ditahan Q menunggu jawaban pemilik atau memakai bawaan sementara yang tertulis di KEPUTUSAN.

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| BL-01 | Migrasi `bl_*` + sidik di `tests/warga/migrasi_beku.json` | warga-api | T17 | - |
| BL-02 | Fungsi SQL bagian bot laporan di `src/hak.js`; `src/wa_proyek.js` rute `/api/wa/proyek*`, `/api/wa/terdaftar`, `/api/wa/daftar`, `/api/wa/detak` | warga-api | T8, T9, T18 | BL-01 |
| BL-03 | Pendaftaran: `src/wa.js` menerima nomor `bl_daftar` setuju lewat fungsi `src/hak.js`; gateway memegang salinan daftar (D10), membalas T-DAFTAR sekali sehari, meneruskan `daftar` ke pemilik, `setuju`/`tolak` | warga-api, wa-bot | T1, T21 | BL-02, Q8 |
| BL-04 | `scripts/wa/claude.mjs`: klien, skema, validator kutipan, penyamaran, biaya, batas harian | wa-bot | T4, T5, T13, T14 | - |
| BL-05 | Skema isian dan 10 sampai 20 contoh arsip untuk `harian` dan `penanganan` di `scripts/wa/claude/` | wa-bot | contoh lolos penyamaran; ditinjau pemeriksa bersih | BL-04 |
| BL-06 | Generator `harian_ringkas.py` dan `penanganan_otomatis.py`: nama shape stabil, `--isian`, `kunci.json` | pipa-data | keluaran tanpa `--isian` identik dengan sebelumnya; `kunci.json` memuat 4 angka sistem | - |
| BL-07 | `data/laporan-bnpb/generator/ubah.py`: inventaris, terapkan operasi, pratinjau PNG | pipa-data | T7 | BL-06 |
| BL-08 | `scripts/wa/proyek.mjs`: status, `buat`, bahan `LAPORAN[].butuh`, T-TANYA, ekstraksi teks PDF dan foto sebelum dikirim ke Claude (K15), bangun v1, antrean per proyek; `--isian` opsional di entri `LAPORAN` `otomatis.mjs`; pindah `buat`/`status`/`bantuan` dari `perintah.mjs` (Q14) | wa-bot | T2, T3, T15, T16, T22 | BL-02, BL-04, BL-06, Q14 |
| BL-09 | Gateway dan limiter: arahkan perintah ke `proyek.mjs` atau `perintah.mjs`, batas balasan percakapan | wa-bot | uji limiter; T16, T22 | BL-08, Q1 |
| BL-10 | Revisi: operasi ubah, kunci, `versi`, `balik`, `pptx` | wa-bot | T6, T8 | BL-07, BL-08 |
| BL-11 | Pemeriksaan otomatis: `aturan_slide.py`, gerbang bahasa, banding 7 hari, bersamaan dengan PDF | wa-bot | T11, T19 | BL-08 |
| BL-12 | `final`: perluas `unggahLaporan()` untuk subfolder `Revisi N`; Drive tim IT, `/api/wa/hasil`, ulang bila gagal | wa-bot | T10 | BL-10, Q9 |
| BL-13 | Pemilik, ikuti `PANDUAN-PEMILIK.md`: tautkan organisasi API, buat kunci, isi `.env`; cek akun Drive yang tersambung (ganti ke tim IT hanya bila belum); terapkan migrasi di D1 produksi | pemilik | `node scripts/wa/proyek.mjs --kering` lolos | BL-01 |
| BL-14 | Detak mesin; susulan dibuang untuk bot proyek, T-TERLEWAT sekali per nomor | wa-bot, warga-api | uji detak; T23 | BL-08, Q2 |
| BL-15 | Label pola dan usulan aturan tetap | wa-bot, warga-api | T12 | BL-10, Q12 |
| BL-16 | Jenis tahap 2: penanganan banjir, gempa, kekeringan; `POST /api/wa/hasil` menerima jenis itu | pipa-data, wa-bot, warga-api | BL-06 dan BL-07 untuk tiap generator | BL-10, Q3 |
| BL-17 | Uji balik 20 hari arsip | wa-bot | laporan kemiripan per hari | BL-11, izin anggaran pemilik |
| BL-18 | Uji asap dengan nomor uji, ukur waktu | wa-bot | T20 | BL-13 |
| BL-19 | Kartu proyek bot dan detak di `/pelaporan` | layar-peta | tinjau lokal; `selera-angka`, `inp-reviewer` | BL-02 |
| BL-20 | Satu laporan banyak penyumbang | - | - | ditunda pemilik (K12) |

## V2

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| BV-01 | Paket dokumen V2 (bagian V2 di tiap dokumen folder ini) dan AGENTS §2.29 | orkestrator | ditinjau pemeriksa bersih | - |
| BV-02 | Pedoman agen `scripts/wa/agen/PEDOMAN*.md` dari kerja seminggu (K24) | wa-bot | T34; ditinjau pemilik | BV-01 |
| BV-03 | `scripts/wa/agen_isi.py` dan `scripts/wa/agen_pagar.mjs` | wa-bot | T28, T29 | BV-01 |
| BV-04 | `scripts/wa/agen.mjs`: ruang kerja, kemarin, penjaga, sandbox, lingkungan, kunci, biaya, `query`, resume, `hasil.json`, sesi, tanya, final | wa-bot | T24-T27, T33-T35 | BV-03 |
| BV-05 | `proyek.mjs` cabang V2: bangun, revisi, tanya, `balik`, `ulangi`, final, batal, kedaluwarsa, pesan "masih dikerjakan" | wa-bot | T30-T32, T36 | BV-04 |
| BV-06 | `package.json` gateway, `.env.contoh`, `PANDUAN-PEMILIK.md` bagian V2, `--kering` memeriksa SDK agen | wa-bot | `npm ci` di mesin; `--kering` lolos | BV-05 |
| BV-07 | Pemilik: pasang di Mac mini, `BL_VERSI=2`, uji asap satu laporan harian dan satu penanganan | pemilik | draf V2 sampai di WA | BV-06 |
| BV-08 | Uji banding 3 hari V1 lawan V2, dinilai pemilik | wa-bot, pemilik | laporan banding | BV-07, Q15 |
| BV-09 | V2 untuk nomor terdaftar lain | wa-bot, pemilik | kunci khusus V2 terpasang | Q17 |

## V2.1

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| BV-10 | Paket dokumen V2.1 (K29, K30, D30-D35, Q22-Q24, A15-A18, T37-T44) | orkestrator | ditinjau pemeriksa bersih | - |
| BV-11 | Rapikan bahan saat generator gagal (`claude.mjs` rapikan, `maksud.mjs` pagar, `proyek.mjs` buat) | wa-bot | T37, T38 | BV-10 |
| BV-12 | Kumpul revisi (`revisi`, `lanjut`, `batal`), `klasifikasi`, `arah.cjs` | wa-bot | T42, T43 | BV-10 |
| BV-13 | Maksud kalimat bebas dan tanya draf | wa-bot | T39-T41, T44 | BV-11 |
| BV-14 | Versi 2.1, changelog, panduan dan tutorial WA | wa-bot | `tests/wa/versi.test.mjs` | BV-11 sampai BV-13 |

## V2.2

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| BV-15 | Paket dokumen V2.2 (K36, D36-D40, Q25-Q26, A19-A21, T45-T50) | orkestrator | ditinjau pemeriksa bersih | - |
| BV-16 | Tinjau visual agen | wa-bot | T45, T46, T50 | BV-15 |
| BV-17 | Screenshot revisi, tanya bergambar, bukan-bahan | wa-bot | T47, T49 | BV-15 |
| BV-18 | Bahan gambar asli ke agen | wa-bot | T48 | BV-15 |

## V2.4

| Tiket | Isi | Pengerja | Bukti | Tergantung |
| --- | --- | --- | --- | --- |
| BV-19 | Paparan banjir sepekan berperiode bebas (K42): `banjir_sepekan.py`, `LAPORAN_PROYEK`, `parsePeriode`, Koordalops per hari, pedoman agen, acuan mingguan, `BL_JENIS` Worker | wa-bot, pipa-data, warga-api | `tests/wa/proyek.test.mjs` (banjir sepekan), `tests/wa/agen.test.mjs` (cariKemarin banjir_sepekan), `tests/warga/wa_proyek.test.mjs`; uji generator 16-19 dan 9-15 Nov QA deck LOLOS | - |
| BV-20 | Kalimat bebas untuk paparan banjir sepekan (maksud + periode) | wa-bot | - | BV-19 |
