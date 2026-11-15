# TIKET: Pembiayaan risiko

Kerjakan urut; ambil satu tiket, kerjakan hanya cakupannya.

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| PR-01 | Migrasi `pb_saldo`, `pb_skema`, `pb_model` + sidik migrasi beku + cakupan | warga-api (+ migrasi-idempoten) | T3, T10 | - |
| PR-02 | Bagian Pembiayaan di `src/hak.js` memakai peran yang ada (Q9); baca realisasi DSP | warga-api | T4, T9 | PR-01, Q2, Q9 |
| PR-02b | Tautan permohonan DSP ke kejadian: kolom `kejadian_id` FK `sk_kejadian` pada permohonan DSP atau tabel tautan `pb_dsp_kejadian` (migrasi saat tiket); `kejadian` di `src/meja_spek.js:160` adalah teks bebas, jadi staf memilih KJ per permohonan, tidak ada tebakan nama | warga-api (+ migrasi-idempoten) | T14 | PR-02 |
| PR-03 | Rute baca pembiayaan dan pembanding murni (kerugian Jitupasna, realisasi DSP, selisih) | warga-api (+ guard-api, security-reviewer) | T1, T2, T5, T6 | PR-02b |
| PR-04 | Rute dan laci isi saldo DSP/PFB | warga-api + siklus | T3, tinjau lokal | PR-03, Q1, Q2, Q7 |
| PR-05 | Kartu Kerugian, Dana, Perbandingan di halaman kejadian | siklus (+ inp-reviewer, selera-angka) | T1, T13, tinjau lokal | PR-03 |
| PR-06 | Pra-registrasi model kerugian dan uji balik `scripts/pembiayaan/ujibalik.py` | pipa-data (+ validasi-model) | T12 | Q3, data Jitupasna historis |
| PR-07 | Kartu Perkiraan awal (hanya bila PR-06 lulus) | siklus | tinjau lokal | PR-06 |
| PR-08 | Catatan skema dan pemantau parametrik | warga-api + siklus | T7, T8 | PR-03, Q4 |
| PR-09 | Tabel Laporan Berkala | pipa-data + layar-peta | paket Laporan Berkala | Q6 |
| PR-10 | Ringkasan di `/bnpb/dalops` | ruang-bnpb | tinjau lokal | PR-05 |
| PR-11 | Pemilik menerapkan migrasi di D1 produksi | pemilik | `wrangler d1 migrations apply` | PR-01 |
