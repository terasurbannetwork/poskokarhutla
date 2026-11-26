# TIKET: Status Lifeline

Kerjakan urut; ambil satu tiket, kerjakan hanya cakupannya.

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| LF-01 | Migrasi `lf_status`, `lf_riwayat`, `lf_usulan` + sidik migrasi beku + cakupan | warga-api (+ migrasi-idempoten) | T1, T11 | - |
| LF-02 | Bagian Lifeline di `src/hak.js`: baca kisi, sel, riwayat; tulis status + riwayat satu batch | warga-api | T3, T10 | LF-01 |
| LF-03 | Migrasi indeks isyarat + pembaca isyarat per layanan (Lapor Warga per ip_hash, logbook kendala, meja dampak, meja pengungsi, titik) dengan pemetaan nama kab ke kab4 | warga-api (+ migrasi-idempoten) | T5, T8, T10, T13 | LF-02 |
| LF-04 | Fungsi usulan murni + cache `lf_usulan` | warga-api (+ validasi-model) | T5, T6, T7, T12 | LF-03 |
| LF-05 | Rute baca dan tetapkan, hak per peran | warga-api (+ guard-api, security-reviewer) | T2, T4 | LF-02, Q2, LF-11 (migrasi 0141 dan 0142 harus terapan di produksi sebelum rute terbit; kueri isyarat memakai INDEXED BY laporan_jenis_dibuat dari 0142) |
| LF-06 | Kartu kisi dan laci di halaman kejadian `/siklus` | siklus (+ inp-reviewer, selera-angka) | T9, tinjau lokal | LF-05 |
| LF-07 | Ringkasan per kejadian di `/bnpb/dalops` | ruang-bnpb | tinjau lokal | LF-05, Q4 |
| LF-08 | Konteks provinsi IODA di bawah kisi | siklus | T7 | LF-06 |
| LF-09 | Tabel Laporan Berkala | pipa-data + layar-peta | paket Laporan Berkala | Q5 |
| LF-10 | Jalur VNP46A2 di `lampu_malam.py`, uji balik ulang Palu 2018 dan Bali 2025; isyarat listrik bila lulus | pipa-umum (+ validasi-model) | `python3 scripts/umum/lampu_malam.py validasi` lulus | Q6, token Earthdata |
| LF-11 | Pemilik menerapkan migrasi di D1 produksi | pemilik | `wrangler d1 migrations apply` | LF-01 |

## Status LF-09 (26 Nov 2026)

Dikerjakan di sisi Laporan Berkala, tertahan di jalur data. `scripts/berkala/hitung.py` (`lifeline()`) menyusun satu tabel per kejadian aktif untuk laporan bulanan dan tahunan: kab/kota x delapan layanan (`LAYANAN` sama dengan `src/lifeline_usulan.js`, diuji di `tests/berkala/kontrak.test.mjs`), warna dari status yang ditetapkan staf apa adanya, sel tanpa status atau berwarna asing tetap abu, usulan mesin tidak dibawa. Halaman cetak menulisnya di Bab 1 (`public/laporan_berkala.js`, `blokLifeline`) dengan label warna yang sama dengan `public/siklus/lifeline.js`.

Penahan: laporan dirakit `rakit.py` di CI tanpa D1 dan tanpa sesi staf. Status hanya terbaca lewat rute berkuki staf per kejadian (`src/lifeline.js` kisi), tidak ada berkas yang diekspor, jadi masukan `lifeline` tidak pernah terisi dan bagian itu tertulis "status layanan dasar belum tersedia". Jalur yang perlu diputuskan (bukan dibuat di tiket ini): (a) ekspor harian status ke R2 privat, misalnya `berkala/sumber/lifeline.json`, oleh Worker atau langkah CI ber-token; atau (b) `wrangler d1 execute` dari CI, yang menyalin SQL `lfKisi` dan menambah baca D1. Bentuk masukan yang dibaca `hitung.py` tertulis di docstring berkas itu.
