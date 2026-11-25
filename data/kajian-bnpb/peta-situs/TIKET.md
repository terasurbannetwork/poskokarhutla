# TIKET: Peta Situs

Ambil satu tiket dan kerjakan hanya cakupannya. Urutannya mengikuti `DESAIN-TEKNIS.md`.

| Tiket | Isi | Pengerja → pemeriksa | Bergantung | Bukti siap | Status |
| --- | --- | --- | --- | --- | --- |
| PS-00 | Bagian "baca dulu, baru bangun" di AGENTS.md §2.49 dan pemilik berkas baru di `scripts/agents/roster.json` (`npm run agents:build`) | sesi induk, `mekanik-mesin` | - | `npm run uji:agen` | sebagian (§2.49 ada) |
| PS-01 | `src/peta_situs.js` berisi semua halaman dari `HTML_RUTE`, `tabelRute()`, dan `public/**/*.html`; generator dan `peta_situs_publik.json` | `warga-api` + `mekanik-mesin` → `higiene-repo` | PS-00 | U1 mode laporan: yatim 0, hantu 0 | registri selesai (cfdc34819); generator berjalan |
| PS-02 | Gerbang `tests/agen/gerbang-peta-situs.test.mjs` dalam mode laporan | `penulis-gerbang` | PS-01 | U1 | belum |
| PS-03 | `menuUntuk`, `GET /api/peta-situs`, uji per peran | `warga-api` → `guard-api`, `security-reviewer` | PS-01 | U2 | belum |
| PS-04 | Nav admin Worker dari registri, menggantikan `GRUP_ADMIN`, `GRUP_STAF`, `SUB`, `RUANG_LAPORAN` | `warga-api` → `guard-api` | PS-03 | U3 | belum |
| PS-05 | Kepala publik dengan Lapor dan Masuk; kaki publik dari JSON publik | `inti-layar` + `layar-peta` → `inp-reviewer`, `selera-angka` | PS-01 | U1, U5, U6 | belum |
| PS-05b | `/prediksi` memuat kepala bersama (`details.bencana` + `/inti/kepala.js`) supaya Lapor dan Masuk juga tampil di sana | `prediksi` → `inp-reviewer` | PS-05 | U5 | belum |
| PS-06 | Menu staf dan pintu `/bnpb` dari `/api/peta-situs`, delapan grup, dipasang di semua `/bnpb/*` | `ruang-bnpb` → `inp-reviewer` | PS-03 | U2, U5 | belum |
| PS-07 | Menu `/instansi`, `/petugas`, dan `/kemitraan` dari registri. Cookie `sesi_instansi` ber-`Path=/instansi` dan `/api/instansi`, jadi menu instansi memakai alias `GET /api/instansi/peta-situs`; pemegang kode saja (`x-kode`) mendapat menu tamu kecuali ditangani di sini | `warga-api`, `lapangan`, `kampus` | PS-03 | U1, U5 | belum |
| PS-08 | `/masuk` satu pintu: form sandi, alih GET/POST `/admin/masuk` dan semua 303, arah bawaan per akun, fixture `pintu_masuk.json`, teks K16 merujuk K21 | `warga-api` → `security-reviewer`, `guard-api` | PS-03 | U4 | belum |
| PS-09 | Hapus delapan daftar menu lama dan kartu `dasbor_admin.js` tulisan tangan | pemilik berkas masing-masing | PS-04..PS-07 | `grep` daftar lama kosong, U1 | belum |
| PS-10 | Pensiun dan alih halaman lama menurut Q1–Q5 (termasuk 301 `/warga`) | `layar-peta` | jawaban Q | U1 | belum |
| PS-11 | Gerbang dikunci (bukan mode laporan), tinjau lokal, laporan ke pemilik | sesi induk | PS-04..PS-10 | U1–U7 | belum |
