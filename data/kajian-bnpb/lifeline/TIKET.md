# TIKET: Status Lifeline

Kerjakan urut; ambil satu tiket, kerjakan hanya cakupannya.

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| LF-01 | Migrasi `lf_status`, `lf_riwayat`, `lf_usulan` + sidik migrasi beku + cakupan | warga-api (+ migrasi-idempoten) | T1, T11 | - |
| LF-02 | Bagian Lifeline di `src/hak.js`: baca kisi, sel, riwayat; tulis status + riwayat satu batch | warga-api | T3, T10 | LF-01 |
| LF-03 | Migrasi indeks isyarat + pembaca isyarat per layanan (Lapor Warga per ip_hash, logbook kendala, meja dampak, meja pengungsi, titik) dengan pemetaan nama kab ke kab4 | warga-api (+ migrasi-idempoten) | T5, T8, T10, T13 | LF-02 |
| LF-04 | Fungsi usulan murni + cache `lf_usulan` | warga-api (+ validasi-model) | T5, T6, T7, T12 | LF-03 |
| LF-05 | Rute baca dan tetapkan, hak per peran | warga-api (+ guard-api, security-reviewer) | T2, T4 | LF-02, Q2 |
| LF-06 | Kartu kisi dan laci di halaman kejadian `/siklus` | siklus (+ inp-reviewer, selera-angka) | T9, tinjau lokal | LF-05 |
| LF-07 | Ringkasan per kejadian di `/bnpb/dalops` | ruang-bnpb | tinjau lokal | LF-05, Q4 |
| LF-08 | Konteks provinsi IODA di bawah kisi | siklus | T7 | LF-06 |
| LF-09 | Tabel Laporan Berkala | pipa-data + layar-peta | paket Laporan Berkala | Q5 |
| LF-10 | Jalur VNP46A2 di `lampu_malam.py`, uji balik ulang Palu 2018 dan Bali 2025; isyarat listrik bila lulus | pipa-umum (+ validasi-model) | `python3 scripts/umum/lampu_malam.py validasi` lulus | Q6, token Earthdata |
| LF-11 | Pemilik menerapkan migrasi di D1 produksi | pemilik | `wrangler d1 migrations apply` | LF-01 |
