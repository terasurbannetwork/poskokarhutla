# TIKET: Pemetaan bangunan oleh relawan

Kerjakan urut; ambil satu tiket, kerjakan hanya cakupannya. Awalan HR (PM sudah dipakai paket pintu masuk).

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| HR-01 | Konstanta `konst.py` = `konst.js` dengan uji identik | kampus | T3 | - |
| HR-02 | Pembaca N_pembanding per kab dalam zona bahaya (pakai ulang `bangunan.py`) | kampus | T1 | HR-01 |
| HR-03 | Uji sambungan ohsome dan jalur baca balik hashtag: kueri nyata, ukur batas laju, putuskan jalur (ohsome, API changeset OSM, atau layanan statistik hashtag), tulis hasil di RISET C | kampus | T11 | - |
| HR-04 | `kelengkapan.py`: N_osm lewat ohsome, rasio, kelas, keluaran agregat | kampus | T1, T2, T8 | HR-02, HR-03 |
| HR-05 | Uji kejujuran manual 10 kab dan kalibrasi ambang | kampus (+ validasi-model) | T10 | HR-04, Q6 |
| HR-06 | Migrasi `pm_proyek`, `pm_gabung`, `pm_riwayat` + cakupan | warga-api (+ migrasi-idempoten) | T6, T7 | - |
| HR-07 | `paket.py`: AOI GeoJSON, instruksi, saran citra, hashtag | kampus | T8 | HR-04, Q4 |
| HR-08 | Rute `src/pemetaan.js` dengan hak staf, pemilik, kampus | warga-api (+ guard-api, security-reviewer) | T4, T5, T12 | HR-06, Q1, Q2 |
| HR-13 | Daftar periksa penyuntingan terorganisir sebelum status `dikirim`: halaman wiki OSM kegiatan, pemberitahuan ke komunitas OSM lokal, hashtag terdaftar; dicentang staf per proyek | kampus + warga-api | T4 (status dikirim ditolak bila daftar belum lengkap) | HR-08 |
| HR-09 | Layar daftar prioritas, paket, proyek terbuka, sumbangan | kampus (+ inp-reviewer, selera-angka) | T9, tinjau lokal | HR-08, HR-04 |
| HR-10 | Keputusan sumber data bila kab memadai (pembanding saja atau beralih) | pemilik, siklus | keputusan tertulis | Q5, HR-05 |
| HR-11 | Workflow `pemetaan.yml` bulanan | mekanik-mesin | workflow lolos dry run | HR-04 |
| HR-12 | Pemilik menerapkan migrasi di D1 produksi | pemilik | `wrangler d1 migrations apply` | HR-06 |
