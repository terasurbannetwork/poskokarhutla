# TIKET: Genangan satelit per kejadian

Kerjakan urut; ambil satu tiket, kerjakan hanya cakupannya. Tiket layar ditinjau pemilik di `http://localhost:8800/siklus/kaji`.

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| GS-00 | Daftarkan berkas baru di roster pemilik (`genangan_lahan.py`, `genangan_kaji.py`, `genangan_kriteria.py`, `genangan_kriteria.json`, `inti/geser.*`, uji baru); perbarui catatan usang di `data/kajian-bnpb/siklus/ALGORITMA.md` F3.3 dan `RISET.md` butir 7 ("GFM hanya DKI") dengan tautan ke paket ini | mekanik-mesin, siklus | T14 | - |
| GS-01 | Opsi `--pra-sebelum-acuan` untuk mode riwayat dan kejadian, status `tanpa_pra`, mode `kejadian` + titik baru per kab; ambang sah dibaca dari kriteria | banjir | T1 | GS-00, GS-02 |
| GS-02 | Hitung pasangan layak dari metadata saja, lalu kunci kriteria uji balik dan daftar kejadian kalibrasi/uji (`genangan_kriteria.py`, `genangan_kriteria.json`, sidik, jangkar commit) sebelum menghitung kejadian uji | siklus (+ validasi-model) | T5 | GS-00, Q4, Q5 |
| GS-03 | Jalankan kejadian Sumatera 26 Nov 2025 ujung ke ujung tanpa layar; ukur anggaran; usulkan angka Q7 ke pemilik | banjir, siklus | T10 | GS-01, Q2 |
| GS-04 | Lahan WorldCover (`genangan_lahan.py`) | banjir | T2 | GS-01 |
| GS-05 | Mode `kejadian` di `citra_banjir.py`: radar, warna asli, semu SWIR | banjir | `python3 scripts/banjir/citra_banjir.py uji` | GS-01, Q8 |
| GS-06 | `zona_dari_sel` di `paparan.py` + golden (`hitung_kab` tidak disentuh) | siklus | T3 | GS-01 |
| GS-07 | `banjir_gfm` di `kaji_banjir.py`, perakit `genangan_kaji.py`, `BATAS` di `saji.py` | siklus | T4 | GS-04, GS-05, GS-06, Q3 |
| GS-08 | Migrasi `sk_kaji` (model, `hasil_r2` terikat model dan versi) + `src/siklus_kaji.js` (saring BP per kab4, rute berkas) | warga-api (+ migrasi-idempoten, guard-api, security-reviewer) | T6, T7 | GS-07 |
| GS-09 | Pemilik menerapkan migrasi di D1 produksi | pemilik | `wrangler d1 migrations apply` | GS-08 |
| GS-10 | Pindah penggeser ke `public/inti/geser.*`, `bukti.js` memakainya | inti-layar, banjir | T9 | - |
| GS-11 | Kartu dan peta di `public/siklus/kaji.js` | siklus (+ inp-reviewer, selera-angka) | T8, T12, T13 | GS-07, GS-10, Q1 |
| GS-12 | Langkah di `siklus.yml` | mekanik-mesin | jalan manual `workflow_dispatch` hijau | GS-03, GS-09, Q2, Q7, Q9 |
| GS-13 | Uji balik dan vonis; pil hipotesis dicabut hanya bila lulus | siklus (+ validasi-model) | T11 | GS-02, GS-12 |
| GS-14 | Versi publik di `/banjir` | layar-peta, banjir | - | Q1 dijawab "ya" |
