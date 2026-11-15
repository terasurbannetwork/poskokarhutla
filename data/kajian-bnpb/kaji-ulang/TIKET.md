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
