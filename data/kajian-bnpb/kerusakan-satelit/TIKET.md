# TIKET: Perkiraan kerusakan satelit

Kerjakan urut; ambil satu tiket, kerjakan hanya cakupannya.

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| KS-01 | Kunci kriteria banjir (tingkat kab dan kecamatan terpisah), daftar kejadian uji dan pemisahan kalibrasi/uji di `kerusakan_kriteria.json` sebelum citra dilihat | siklus (+ validasi-model) | T1 | Q4, Q5 |
| KS-02 | Pipeline banjir: air dari Sentinel-1 ke agregat per kab dengan bangunan; WAJIB menolak jalan bila `jangkar_commit` di `scripts/siklus/kerusakan_sidik.json` null atau sidik berkas kriteria tidak cocok; menghitung naif HAND sebelum vonis | siklus | `python3 scripts/siklus/kerusakan.py uji` | KS-01 |
| KS-03 | Uji balik banjir, vonis ke R2 dan ringkasan | siklus (+ validasi-model) | T2 | KS-02 |
| KS-04 | Anggaran R2 di `sumber.json`, jadwal di `siklus.yml` | siklus + mekanik-mesin | T11 | KS-03 |
| KS-05 | Migrasi perluasan CHECK `unit_asal` (bangun ulang tabel) + sidik beku + cakupan | warga-api (+ migrasi-idempoten) | T7 | Q7 |
| KS-06 | Pemilik menerapkan migrasi di D1 produksi | pemilik | `wrangler d1 migrations apply` | KS-05 |
| KS-07 | Rute baca dan terima, hak per peran, penolakan bila vonis tidak lulus | warga-api (+ guard-api, security-reviewer) | T4, T6, T8 | KS-05, KS-03, Q6 |
| KS-08 | Kartu Perkiraan satelit dan laci terima di Jitupasna; kartu gempa berstatus gagal | siklus (+ inp-reviewer, selera-angka) | T10, tinjau lokal | KS-07 |
| KS-09 | Pipeline karhutla: hanya setelah target uji mandiri ada; sampai itu vonis menunggu uji | siklus (+ validasi-model) | T3 | Q9 |
| KS-10 | Pembukaan ulang gempa: hanya bila Q2 dijawab pemilik dengan metode dan kebenaran baru | siklus (+ validasi-model) | kriteria baru terkunci | Q2 |

Status 26 Nov 2026: KS-02 pipeline selesai dan kalibrasi berjalan dengan kunci v2 berjangkar, tetapi gerbang kelayakan MENUNGGU: n = 11 dari 20 pasangan (anggaran unduhan 2,5 GB habis, terpakai sekitar 2,28 GB); tidak ada ambang layak. KS-03 belum boleh jalan sampai n >= 20 dan satu ambang layak, atau pemilik menambah anggaran. Rincian di KEPUTUSAN-KERUSAKAN.md bagian Kalibrasi KS-02.

Status 26 Nov 2026 (putaran 2): n = 17 dari 20, unduhan baru sekitar 2,18 GB; kelayakan tetap menunggu dan tidak ada ambang layak (proporsi tertinggi 0,5, rasio tertinggi 1,0). KS-03 tidak jalan sesuai kriteria; lanjut hanya bila pemilik menambah anggaran untuk indeks 36 dan seterusnya.
