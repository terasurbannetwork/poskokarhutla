# TIKET: Kaji ulang pasca-kejadian

Kerjakan urut; ambil satu tiket, kerjakan hanya cakupannya. Nomor migrasi diambil saat tiket.

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| KU-01 | Migrasi `ku_kaji`, `ku_pelajaran`, `ku_rekomendasi` + pemicu + sidik migrasi beku + cakupan; periksa ulang kutipan benchmark HSEEP dan WHO | warga-api (+ migrasi-idempoten) | T12, T15 | - |
| KU-02 | Bagian Kaji ulang di `src/hak.js`: entri `MATRIKS`, baca dan tulis `ku_*`, baca `dl_tindak` per rentang kunci | warga-api | T8, T9 | KU-01 |
| KU-03 | Perakit murni `src/kaji_ulang_rakit.js`: linimasa, durasi tahap, celah; periksa isi `sk_kejadian_sumber.kode` untuk `tugas_api`; satu kueri set-based memuat kolom yang sama dengan `muatTugas` (tiba, kabar, himawari_awal, terdeteksi_awal; ALGORITMA 3 dan 2a) | warga-api (+ validasi-model) | T1, T2, T3, T4, T9 | KU-02 |
| KU-04 | Rute kandidat dan baca draf; kriteria Q1 | warga-api (+ guard-api) | T5, T7, T9, T17 | KU-03, Q1 |
| KU-05 | Rute tulis pelajaran, rekomendasi, status lewat `dl_tindak`; pengecualian awalan `kaji\|` di rute Dalops | warga-api (+ guard-api, security-reviewer) | T8, T10, T11, T16, T18 | KU-02, Q2, Q4, Q5, Q8, Q10 |
| KU-06 | Rute sahkan, sahkan ulang, potret beku dan `ku_potret`, `sk_jejak` | warga-api (+ guard-api) | T12, T13, T20 | KU-05, Q3 |
| KU-07 | Kartu draf di halaman kejadian: linimasa, durasi, celah, layanan, koordinasi, catatan lapangan | siklus (+ inp-reviewer, selera-angka) | T19, tinjau lokal | KU-04 |
| KU-08 | Kartu pelajaran dan rekomendasi, laci riwayat, baca BPBD | siklus (+ inp-reviewer, selera-angka) | T14, T19, tinjau lokal | KU-05, KU-07, Q6 |
| KU-09 | Cetak A4 bernomor versi dan halaman Rekomendasi terbuka | siklus | T19, tinjau lokal | KU-06, KU-08, Q7 |
| KU-10 | Ringkasan hitungan di Laporan Berkala | pipa-data + layar-peta | paket Laporan Berkala | Q9 |
| KU-11 | Pemilik menerapkan migrasi di D1 produksi | pemilik | `wrangler d1 migrations apply` | KU-01 |
| KU-12 | Kalibrasi kriteria Q1 sesudah 10 kejadian disahkan | siklus (+ validasi-model) | catatan kalibrasi di ALGORITMA 8 | KU-09 |

## Catatan untuk rute KU-04 sampai KU-06 (temuan security-reviewer atas KU-02, 15 Nov 2026)

- `oleh` selalu dari sesi (`staf:<id>` atau `admin:<kode>`), tidak pernah dari body. Batasnya: `dl_tindak.oleh` 40 karakter, `ku_*.oleh` dan `sk_jejak.oleh` 64; pakai identitas yang muat 40.
- Fungsi `ku*` di `src/hak.js` mengembalikan `oleh` apa adanya; rute membuangnya untuk Pimpinan dan BP (peran saja). Pemetaan pelaku: Super Admin, Pusdalops, Koordalops ke `pelakuKuTulis`; Pimpinan dan BP ke `pelakuKuBaca`.
- BP hanya kab wilayahnya dan hanya kaji ulang berstatus disahkan; di luar itu dijawab sama dengan kejadian tidak ada. Penyaringan ada di rute, bukan di hak.js.
- Batas laju 120 tulis per 10 menit per pengisi (`dlTindakLaju`) dicek di rute sebelum fungsi tulis; rentang tenggat 7..365 hari dan aturan penulis tunggal Q3 juga di rute.
- `kuMulai` mengembalikan false untuk kejadian tak ada DAN kaji ulang yang sudah dimulai; rute membedakannya lewat `kuBaca` (404 vs 200/409) sebelum memanggil.
- Fungsi tulis `ku*` yang memakai `dlStmtTindak*` memeriksa hak sendiri (tidak lewat `sedia`); fungsi baru yang sama wajib begitu.

## Status (26 Nov 2026)

| Tiket | Status | Bukti |
| --- | --- | --- |
| KU-01, KU-02, KU-03 | selesai (migrasi 0147, `src/hak.js` bagian Kaji ulang, `src/kaji_ulang_rakit.js`) | `tests/warga/kaji_ulang.test.mjs`, `kaji_ulang_rakit.test.mjs` |
| KU-04, KU-05, KU-06 | selesai di kode (`src/kaji_ulang.js`, digabung ke `RUTE_SIKLUS`) | `node --test tests/warga/kaji_ulang_rute.test.mjs` hijau |
| KU-07 | selesai di layar: kartu Kaji ulang, Linimasa (saring tahap, 100 baris per muat), Durasi tahap, Celah data, Layanan dasar, Koordinasi, Catatan lapangan (`public/siklus/kaji_ulang.js`, dipasang di `kejadian.js`) | `node --test tests/siklus/layar_kaji_ulang.test.mjs` |
| KU-08 | selesai di layar: Pelajaran dua kolom, angkat catatan lapangan, Rekomendasi dengan laci riwayat dan status. Baca BPBD: modul mencoba `/api/instansi/siklus/...` bila rute staf 401, tetapi halaman `/siklus/kejadian/<KJ>` belum terbuka bagi sesi instansi (cookie berpath `/api/instansi`), jadi pemasangan di layar instansi menunggu warga-api | sama |
| KU-09 | selesai di layar: cetak A4 dari potret beku bernomor versi (draf dicetak bertanda belum disahkan), lampiran setelah versi n, halaman `/siklus/kaji-ulang` (kandidat F-1, rekomendasi terbuka F-7, per unit). Menunggu warga-api: `kaji-ulang` di `RE_HAL` `src/siklus.js` dan entri `/siklus/kaji-ulang` di `src/peta_situs.js` | sama |
| KU-10 | menunggu paket Laporan Berkala (Q9) | - |
| KU-11 | menunggu pemilik: `wrangler d1 migrations apply` untuk 0147 di produksi | - |
| KU-12 | menunggu 10 kejadian disahkan | - |
