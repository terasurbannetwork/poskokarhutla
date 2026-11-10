# DESAIN-TEKNIS

Berkas: `src/meja_spek.js` (spek, `validasi`, `statusEfektif`, `tandaBahaya`, `EKSPOR_RISIKO`), `src/meja.js` (rute, agregat, dummy), `src/hak.js` (akses D1 identitas pelapor), `public/admin/meja.js`, `migrations/0118_meja_juklak.sql`.

Migrasi 0118 membangun ulang tiga tabel dengan pola 0110 (cadangan, buang, buat ulang bernama sama, isi, indeks, trigger):

- `meja_catatan`: CHECK daftar meja dan status pengaduan.
- `meja_petugas`: CHECK larik sampai 9 meja; trigger `meja_petugas_sah` tanpa `pengaduan` dan `risiko`.
- `meja_ringkas`: CHECK daftar meja.
- Baru: `meja_pelapor` (identitas, 1 baris per pengaduan, tidak ada baris untuk anonim). Indeks unik `meja_pengungsi_hari`, `meja_pengaduan_register`, `meja_risiko_kode`.
- Transisi pengaduan ditambah ke trigger `meja_catatan_ubah`.

Sifat di spek: `pusat`, `adminIsi`, `publik: false`, `rapor: false`, `rekapTerakhir`, `hitung`.

Rute baru: `GET /api/meja/pelapor/:id` (hanya `PERAN_ULP`, batas laju per staf). Rute lama: `POST /api/meja/catatan` menerima objek `pelapor`; `GET /api/meja/ekspor?meja=risiko&lampiran=2|3|4`; batas badan `MAKS_ISIAN` 9000 huruf (isian pengungsi terpanjang tidak muat di 4096).

Akses D1 baru hanya di `src/hak.js` (gerbang-d1). `src/meja.js` tidak menambah panggilan.
