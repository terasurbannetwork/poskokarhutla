# TIKET: Panel EWS

Kerjakan urut. Tiket yang ditahan pertanyaan terbuka tidak dimulai sebelum pemilik menjawab.

| Tiket | Isi | Pemilik | Ditahan | Bukti selesai |
| --- | --- | --- | --- | --- |
| EW-00 | Bagian "baca dulu, baru bangun" di AGENTS.md menunjuk paket ini | orkestrator | - | `npm run uji:agen` (gerbang paket modul) |
| EW-01 | Fungsi murni tingkat, basi, ringkasan, pembentuk seri (`public/inti/pantau_alat.js` bagian murni) | `inti-layar` | - | U1, U12 |
| EW-02 | Kunci registri `kemampuan.alat` + pemeriksa di `scripts/umum/bencana.py` | `inti-layar`, `pipa-umum` | - | U8 |
| EW-03 | Migrasi jenis `geofon` di `sensor_alat` | `warga-api` → `migrasi-idempoten` | Q3 | U4 |
| EW-04 | `src/alat.js`: rute pos dan seri, adapter `sensor`, `sihka`, `pvmbg` | `warga-api` → `guard-api` + `security-reviewer` | Q2 (hak lihat) | U3, U5 |
| EW-05 | Komponen layar: angka, pil, tabel mini, kartu pos, baris pemberitahuan, grafik; pasang di `/banjir` dan `/gunungapi` | `inti-layar`, `banjir`, `gunungapi-kering` → `selera-angka` + `inp-reviewer` | EW-04 | U2, U6, U7, U10, U11; tinjau `http://localhost:8800/banjir` dan `/gunungapi` |
| EW-06 | Adapter MHEWS BNPB (sensor lidar, geofon Gunung Ibu) | `warga-api` | Q1 | izin tertulis tercatat di `scripts/siklus/sumber.json` |
| EW-07 | Adapter EWS banjir Kota Banda Aceh dan geodashboard.io | `warga-api` | Q1 | sama |
| EW-08 | Kisi CCTV + pemuat `cctv.json` berizin + grafik getaran ringkas per menit | `inti-layar`, `warga-api` | Q1, Q6 | U9 |
| EW-09 | Kotak Langkah cepat dari `public/ews_tindakan.js` | `inti-layar` | Q5 | uji DOM: teks sama persis dengan entri tangga |
| EW-10 | Daftarkan sumber di `scripts/siklus/sumber.json` (MHEWS, Banda Aceh, geodashboard) dengan status `bersyarat` | `siklus` | - | `node --test tests/siklus/gerbang_registri.test.mjs` |
