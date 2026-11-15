# TIKET: Keterpaduan

Kerjakan urut; ambil satu tiket, kerjakan hanya cakupannya.

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| KP-01 | Gerbang `tests/agen/gerbang-keterpaduan.test.mjs` dengan daftar utang (tabel lama, enam antrean) yang hanya boleh menyusut | penulis-gerbang | T15 | - |
| KP-02 | Satukan normal nomor WA ke `normalWA`; ganti `normalWa` dan `normalNo` | warga-api | T14, `npm run uji:warga` | - |
| KP-03a | Migrasi `0132_indeks_kursor_modul` + sidik di `tests/warga/migrasi_beku.json` | warga-api (+ migrasi-idempoten) | `migrasi_beku` | - |
| KP-03 | `src/hak.js` bagian Keterpaduan + `src/kejadian_tautan.js` rute ingest modul | warga-api (+ guard-api, security-reviewer) | T1, T2 | KP-03a |
| KP-04 | `pasang.py`: sumber `tugas_api` dan `logbook_d1` | siklus | T3 | KP-03, migrasi 0132 sudah diterapkan pemilik di D1 produksi (tanpa indeks, rute memindai penuh) |
| KP-05 | `pasang.py`: sumber `sippa`, `lapangan`, `gempa_d1`, `lapsus` | siklus | T16, uji pasang per sumber | KP-04 |
| KP-06 | Rute `GET /api/kejadian/tautan` | warga-api | T4 | KP-03 |
| KP-07 | `public/inti/kj_tanda.js` dan pemasangannya di `/instansi`, logbook, SIPPA, `/petugas`, gempa | inti-layar, lalu pemilik layar masing-masing | tinjau lokal; `inp-reviewer` | KP-06 |
| KP-08 | Isian GLIDE di halaman kejadian `/siklus` + pengingat: kejadian besar tanpa GLIDE masuk daftar tugas staf (K8) | siklus | uji siklus | - |
| KP-09 | `public/inti/antre.js` + `tests/inti/antre.test.mjs` | inti-layar | T5, T7 | - |
| KP-10 | Pindahkan antrean `/siklus` | siklus | T6, T7 | KP-09 |
| KP-11 | Pindahkan antrean meja dan relawan (`public/bnpb/antre.js`) | ruang-bnpb | T6, T7 | KP-09 |
| KP-12 | Pindahkan antrean SIPPA | sippa | T6, T7 | KP-09 |
| KP-13 | Pindahkan antrean lacak | layar-peta | T6, T7 | KP-09 |
| KP-14 | Pindahkan antrean instansi | layar-peta | T6, T7 | KP-09 |
| KP-15 | Pindahkan antrean petugas (absen wajah) | lapangan (+ security-reviewer) | T6, T7, T8 | KP-09 |
| KP-16 | `public/inti/spek.js` + adapter + `tests/inti/spek.test.mjs` | inti-layar | T9, T10 | - |
| KP-17 | Meja kerja memakai spek baru (server, form, templat Excel) | ruang-bnpb + warga-api | T10 | KP-16 |
| KP-18 | Pendataan, uji pilot, SIPPA, operasi isian, siklus memakai spek baru | pemilik modul masing-masing | T9 per modul | KP-16 |
| KP-19 | Migrasi `titik_pengungsian`, `meja_pengungsi_titik` + rute titik pengungsian | warga-api (+ migrasi-idempoten) | T11, T12 | KP-01 |
| KP-20 | Layar titik pengungsian dan putaran di meja pengungsi | ruang-bnpb | tinjau lokal | KP-19, KP-16 |
| KP-21 | Migrasi `orang_akun`, `orang_tinjau` | warga-api (+ migrasi-idempoten) | `migrasi_beku` | KP-02 |
| KP-22 | `scripts/agents/cocok_orang.mjs` | warga-api | T13 | KP-21 |
| KP-23 | Layar tinjau pasangan admin | warga-api | tinjau lokal | KP-22 |
| KP-24 | Jejak per orang | lapangan | tinjau lokal | KP-22 |
| KP-25 | Pemilik menerapkan semua migrasi paket ini di D1 produksi dan menjalankan SQL pencocok orang | pemilik | `wrangler d1 migrations apply` | KP-03a, KP-19, KP-21, KP-22 |
