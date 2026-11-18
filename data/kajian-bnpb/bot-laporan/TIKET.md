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
| BL-08 | `scripts/wa/proyek.mjs`: status, `buat`, bahan `LAPORAN[].butuh`, T-TANYA, bangun v1, antrean per proyek; `--isian` opsional di entri `LAPORAN` `otomatis.mjs`; pindah `buat`/`status`/`bantuan` dari `perintah.mjs` (Q14) | wa-bot | T2, T3, T15, T16, T22 | BL-02, BL-04, BL-06, Q14 |
| BL-09 | Gateway dan limiter: arahkan perintah ke `proyek.mjs` atau `perintah.mjs`, batas balasan percakapan | wa-bot | uji limiter; T16, T22 | BL-08, Q1 |
| BL-10 | Revisi: operasi ubah, kunci, `versi`, `balik`, `pptx` | wa-bot | T6, T8 | BL-07, BL-08 |
| BL-11 | Pemeriksaan otomatis: `aturan_slide.py`, gerbang bahasa, banding 7 hari, bersamaan dengan PDF | wa-bot | T11, T19 | BL-08 |
| BL-12 | `final`: perluas `unggahLaporan()` untuk subfolder `Revisi N`; Drive tim IT, `/api/wa/hasil`, ulang bila gagal | wa-bot | T10 | BL-10, Q9 |
| BL-13 | Pemilik, ikuti `PANDUAN-PEMILIK.md`: tautkan organisasi API, buat kunci, isi `.env`; ganti `DRIVE_ROOT` dan `DRIVE_LAPORAN` lalu jalankan `drive-masuk.mjs` sebagai akun tim IT; terapkan migrasi di D1 produksi | pemilik | `node scripts/wa/proyek.mjs --kering` lolos | BL-01 |
| BL-14 | Detak mesin; susulan dibuang untuk bot proyek, T-TERLEWAT sekali per nomor | wa-bot, warga-api | uji detak; T23 | BL-08, Q2 |
| BL-15 | Label pola dan usulan aturan tetap | wa-bot, warga-api | T12 | BL-10, Q12 |
| BL-16 | Jenis tahap 2: penanganan banjir, gempa, kekeringan; `POST /api/wa/hasil` menerima jenis itu | pipa-data, wa-bot, warga-api | BL-06 dan BL-07 untuk tiap generator | BL-10, Q3 |
| BL-17 | Uji balik 20 hari arsip | wa-bot | laporan kemiripan per hari | BL-11, izin anggaran pemilik |
| BL-18 | Uji asap dengan nomor uji, ukur waktu | wa-bot | T20 | BL-13 |
| BL-19 | Kartu proyek bot dan detak di `/pelaporan` | layar-peta | tinjau lokal; `selera-angka`, `inp-reviewer` | BL-02 |
| BL-20 | Satu laporan banyak penyumbang | - | - | ditunda pemilik (K12) |
