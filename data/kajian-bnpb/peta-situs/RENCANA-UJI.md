# RENCANA-UJI: Peta Situs

| Kode | Kriteria terima | Perintah bukti |
| --- | --- | --- |
| U1 | Tidak ada halaman yatim, entri hantu, entri non-token tanpa menu, selisih `akses: tamu` dengan `PUBLIK_TANPA_SESI`, maupun JSON publik basi | `node --test tests/agen/gerbang-peta-situs.test.mjs` |
| U2 | `menuUntuk(sesi)` per peran: butir ber-`hak` mengikuti `bolehStaf`; akun direktori saja hanya melihat Direktori; admin melihat semua; instansi, petugas, dan kemitraan hanya melihat pintunya dan pintu Publik | `node --test tests/warga/peta_situs.test.mjs` |
| U3 | Nav admin Worker sama dengan hasil `menuUntuk` untuk sesi yang sama | `npm run uji:warga` (uji `staf_halaman`) |
| U4 | Pengalihan ke `/masuk` berlaku untuk GET dan POST `/admin/masuk?ke=/instansi`; `?ke=//luar` dan `?ke=https://luar` ditolak dan diarahkan ke beranda pintu; `?ke=/pendataan?x=1` dan `?ke=/siklus/kejadian/KJ-1` lolos; arah bawaan staf, direktori saja, `operator_cc`, instansi, petugas, kemitraan sesuai ALGORITMA | `node --test tests/warga/masuk_satu_pintu.test.mjs` |
| U5 | Dari `/` cukup klik untuk sampai ke `/lapor`, `/masuk`, dan semua bencana; dari `/bnpb` cukup klik untuk sampai ke setiap halaman staf yang boleh dibuka peran itu | playwright-cli: telusuri menu, lalu cocokkan rute terjangkau dengan `menuUntuk` |
| U6 | Klik menu tidak membekukan layar | `inp-reviewer` pada `kepala.js` dan `menu_pusdalops.js` |
| U7 | Pemilik meninjau di lokal | `http://localhost:8800/`, `/bnpb`, `/masuk`, `/instansi` |
