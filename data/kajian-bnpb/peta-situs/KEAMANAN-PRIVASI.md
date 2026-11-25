# KEAMANAN-PRIVASI: Peta Situs

- Menu bukan penjaga hak. Hak tetap ditegakkan Worker lewat `halamanTerkunci`, `bolehStaf`, dan sesi modul. Halaman yang tidak tampil di menu tetap ditolak bila dibuka tanpa hak (D8).
- Peta halaman staf, instansi, petugas, dan admin tidak pernah jadi berkas statis publik. Peta itu hanya keluar dari `GET /api/peta-situs` untuk sesi sah, dan isinya sudah disaring menurut peran (D3). Berkas publik `peta_situs_publik.json` hanya memuat pintu Publik dan Kampus.
- Registri tidak memuat token, nama orang, nomor, atau endpoint rahasia. Rute bertoken ditulis sebagai pola, misalnya `/lacak/:t`.
- `?ke=` tetap diperiksa `tujuan()` (`src/statistik.js`). Pemeriksaan itu hanya menerima jalur relatif sesama asal dan sudah menolak `//host` serta karakter kontrol. Pemeriksaan di sisi klien `jalurAman` (`public/masuk.js`) tetap sama.
- Pemindahan form sandi ke `/masuk` tidak mengubah batas laju, hash sandi, atau aturan staf wajib sandi. Q2 paket `pintu-masuk` menegaskan tidak ada staf yang masuk dengan kode.
- `GET /api/peta-situs` hanya membaca sesi. Rute itu tidak menyentuh D1, jadi tidak menambah beban kuota baca.
- Pemeriksa: `security-reviewer` dan `guard-api` untuk ubahan `src/masuk.js`, `src/worker.js`, dan `src/peta_situs.js`.
