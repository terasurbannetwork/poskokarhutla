# TIKET: Data lanjutan BPBD (`LJ-*`)

Ambil tiket berurutan, kerjakan hanya cakupannya. Tiap tiket layar ditinjau pemilik di `http://localhost:8800`.

| Tiket | Cakupan | Pengerja | Pemeriksa | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- | --- |
| LJ-00 | Bagian §2.31 di AGENTS.md, roster pemilik berkas baru | sesi induk | `higiene-repo` | `npm run uji:agen` | paket ini |
| LJ-01 | `migrations/0161_lapor_data.sql` sesuai DESAIN-TEKNIS | `warga-api` | `migrasi-idempoten` | migrasi jalan dua kali di Miniflare | LJ-00 |
| LJ-02 | `src/lapor_lanjut_spek.js`: spek tujuh jenis, validasi, penanda, rekap, kondisi akhir, sidik | `warga-api` | `validasi-model` | `tests/lapor/lanjut_spek.test.mjs` | LJ-01 |
| LJ-03 | Pembukaan berkas dari tiket, token web, rute baca berkas, penyamaran HP/NIK untuk staf (Q6) | `warga-api` | `guard-api`, `security-reviewer` | uji rute bagian 2 baris 1, 2, 6 | LJ-02 |
| LJ-04 | Rute objek dan media (tambah, ubah, batal, `klien_id`, `rev`), rumah dan prasarana (Q1, Q9) | `warga-api` | `guard-api`, `security-reviewer` | uji rute baris 4, 5, 7 | LJ-03 |
| LJ-05 | Mesin WA tahap 2 untuk rumah dan prasarana | `warga-api` | `security-reviewer` | uji mesin tahap 2 di `tests/lapor/mesin.test.mjs` | LJ-04 |
| LJ-06 | Titik pengungsian dan jiwa (WA dan rute), sambung `titik_pengungsian` (Q10) | `warga-api` | `security-reviewer` | uji rute titik dan jiwa | LJ-05 |
| LJ-07 | Korban per orang dan perubahan status pencarian (Q8) | `warga-api` | `security-reviewer` | uji rute korban | LJ-05 |
| LJ-08 | Usaha, kebutuhan, isian berkas (status darurat, SK, posko) | `warga-api` | `guard-api` | uji rute | LJ-05 |
| LJ-09 | Tim: tambah, cabut, putar token (Q5) | `warga-api` | `security-reviewer` | uji rute baris 3 | LJ-04 |
| LJ-10 | Pertanyaan harian lewat cron menit dan `lapor_kabar` (Q3) | `warga-api` | `guard-api` | uji rute pertanyaan harian | LJ-09 |
| LJ-11 | Penutupan, kondisi akhir, versi beku, terima staf, tiket ke `selesai` (Q2, Q7) | `warga-api` | `migrasi-idempoten`, `validasi-model` | uji rute baris penutupan | LJ-10 |
| LJ-12 | Dorong rekap ke meja `dampak`, meja `pengungsi`, `lf_usulan`; terima ke Jitupasna | `warga-api` | `validasi-model` | uji rute baris rekap | LJ-06, LJ-07 |
| LJ-13 | Layar `/lapor/data/`: tab jenis, peta, form per objek, foto, antrean luring | `layar-peta` | `inp-reviewer`, `selera-angka` | tinjau `http://localhost:8800/lapor/data/` | LJ-04 sampai LJ-08 |
| LJ-14 | Tab "Data lanjutan" di rincian `/lapor/meja`, Tampilkan tercatat, terima rekap dan penutupan | `layar-peta` | `inp-reviewer`, `selera-angka`, `security-reviewer` | tinjau `http://localhost:8800/lapor/meja` | LJ-11, LJ-12 |

Tiap perubahan perilaku bot WA menaikkan versi Lapor AI di changelog Lapor (bukan changelog Bot Laporan; memori: dua produk terpisah).
