# TIKET: Data lanjutan BPBD (`LJ-*`)

Ambil tiket berurutan, kerjakan hanya cakupannya. Tiap tiket layar ditinjau pemilik di `http://localhost:8800`.

| Tiket | Cakupan | Pengerja | Pemeriksa | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- | --- |
| LJ-00 | Bagian §2.31 di AGENTS.md; pemilik berkas baru di roster | sesi induk | `higiene-repo` | `npm run uji:agen` | paket ini |
| LJ-01 | `migrations/0161_lapor_data.sql`; entri `MATRIKS` `src/hak.js`; `tests/warga/cakupan.json` | `warga-api` | `migrasi-idempoten` | `node --test tests/lapor/lanjut_migrasi.test.mjs` (semua migrasi di SQLite, 0161 dua kali, CHECK, UNIQUE, FK) | LJ-00 |
| LJ-02 | `src/lapor_lanjut_spek.js`: spek tujuh jenis, isian `pribadi`, nihil per metrik, penanda, rekap, kondisi akhir, sidik | `warga-api` | `validasi-model` | `tests/lapor/lanjut_spek.test.mjs` | LJ-01 |
| LJ-03 | Pembukaan berkas dari tiket (syarat kab izin), token per anggota ke kuki, rute `berkas`, `daftar`, `tampil`, `lj_akses`, entri `src/worker.js` (Q6, Q11, Q15) | `warga-api` | `guard-api`, `security-reviewer` | uji rute bagian 2 baris berkas, token, tersamar | LJ-02 |
| LJ-04 | Rute objek, batal, dan foto (`lj_media`), rumah dan prasarana (K10, Q9, Q12); nihil per metrik pindah ke LJ-08, video ke LJ-18 | `warga-api` | `guard-api`, `security-reviewer` | uji rute objek, `rev`, `klien_id`, media | LJ-03 |
| LJ-05 | Mesin WA tahap 2: pesan pembuka, rumah dan prasarana, isian pribadi lewat kode (D19), gerbang izin `lj_tim` di `src/lapor_ai.js` | `warga-api` | `security-reviewer` | uji mesin bagian 3 | LJ-04 |
| LJ-06 | Titik pengungsian dan jiwa (WA dan rute), sambung `titik_pengungsian` (Q10, Q13) | `warga-api` | `security-reviewer` | uji rute titik dan jiwa | LJ-05 |
| LJ-07 | Korban per orang dan perubahan status pencarian (Q8) | `warga-api` | `security-reviewer` | uji rute korban | LJ-05 |
| LJ-08 | Usaha, kebutuhan, isian berkas (status darurat, SK, posko), tanda nihil per metrik (rute `nihil`) | `warga-api` | `guard-api` | uji rute | LJ-05 |
| LJ-09 | Tim: tambah, cabut, pindah ketua, perintah WA `tim tambah/cabut`, nama anggota (Q5, Q14) | `warga-api` | `security-reviewer` | uji rute tim, uji mesin tim | LJ-05 |
| LJ-10 | Pertanyaan harian: cron menit jam kirim, `lj_tanya`, `lj_kabar` (Q3) | `warga-api` | `guard-api` | uji rute pertanyaan harian | LJ-09 |
| LJ-11 | Gateway WA mengambil dan mengirim antrean `lj_kabar`; saat ditandai terkirim, kolom `teks` dikosongkan (pesan pembuka memuat token tautan mentah, tinjauan keamanan LJ-03) dan cron bersih-bersih menghapus baris pembuka lebih dari 1 hari | `wa-bot` | `security-reviewer` | uji gateway di `tests/wa/**`, versi Lapor naik | LJ-10 |
| LJ-12 | Dorong rekap ke meja `dampak` (kolom sistem `lapor_berkas`, sumber `daftar`, `beda_sumber`, `rekap_baru`, pelaku `lapor_lanjut`) dan meja `pengungsi`; terima ke Jitupasna (D8) | `warga-api` | `validasi-model` | uji rute baris rekap dan Jitupasna | LJ-06, LJ-07, LJ-08 |
| LJ-13 | Penutupan: kondisi akhir, versi beku tanpa pribadi (sidik objek pakai HMAC berkunci seperti `lj_jejak`, bukan SHA-256 polos), tulis objek dan media bersyarat berkas masih terbuka di SQL (balapan tutup lawan tulis, tinjauan guard-api LJ-04), terima staf, tiket ke `selesai` (Q2, Q7) | `warga-api` | `migrasi-idempoten`, `validasi-model` | uji rute baris penutupan | LJ-10, LJ-12 |
| LJ-14 | Usulan fase dari penutupan yang diterima lewat sumber `lapor_ai` di `pasang.py`; isi `kejadian_id` dan `kab4` berkas dari tautan | `siklus` | `validasi-model` | uji `pasang.py` yang ada ditambah kasus penutupan | LJ-13 |
| LJ-15 | Layar `/lapor/data/`: tab jenis, peta, form per objek, foto, nihil per metrik, tim (tambah dan cabut), antrean luring dengan saluran `rahasia` untuk pribadi | `layar-peta` | `inp-reviewer`, `selera-angka`, `security-reviewer` | uji luring bagian 4; tinjau `http://localhost:8800/lapor/data/` | LJ-04 sampai LJ-09 |
| LJ-16 | Tab "Data lanjutan" di rincian `/lapor/meja`, Tampilkan tercatat, daftar berkas lintas kab, terima penutupan dan Jitupasna, pilihan sumber `beda_sumber` di meja `dampak` | `layar-peta` | `inp-reviewer`, `selera-angka`, `security-reviewer` | tinjau `http://localhost:8800/lapor/meja` | LJ-12, LJ-13 |
| LJ-18 | Video bersambung untuk objek: jalur unggah `lapor_unggah` (0158) dengan konteks objek berkas, selesai unggah menulis `lj_media` jenis `video`, sajian dengan Range | `warga-api` | `guard-api`, `security-reviewer` | uji rute unggah video objek | LJ-04 |
| LJ-19 | Sapu foto draf R2 `lapor/data/*/draf/` yang lebih tua dari 2 hari di cron bersih-bersih (foto draf tertinggal bila proses mati di antara simpan R2 dan D1, atau draf rusak; tinjauan keamanan LJ-05) | `warga-api` | `security-reviewer` | uji cron menyapu draf yatim | LJ-05 |
| LJ-17 | Hapus data pribadi 5 tahun sesudah penutupan diterima (D23): cron menit 17, bertahap, kosongkan `pribadi`, hapus media wajah dan foto korban di R2, catat di `lj_jejak`; uji: berkas 5 tahun lewat sehari dikosongkan, berkas dibuka lagi tidak | `warga-api` | `security-reviewer`, `migrasi-idempoten` | uji rute penghapusan | LJ-13 |

Tiap perubahan perilaku bot WA menaikkan versi Lapor AI di changelog Lapor (bukan changelog Bot Laporan; dua produk terpisah).
