# ALUR: Log tindak lanjut Usulan langkah

1. Staf membuka `/bnpb/dalops`, menu Penanganan. Layar memuat daftar langkah (dihitung di peramban) lalu `GET /api/dalops/tindak` sekali: status terkini semua kunci yang diubah dalam 60 hari terakhir dan bendera `boleh_tulis`.
2. Tiap baris langkah menampilkan tanda status: Belum (tanpa baris D1), Dikerjakan, atau Selesai dengan tanggal.
3. Staf mengklik tanda status. Dialog terbuka seketika (data langkah sudah ada di layar). Riwayat dimuat lewat `GET /api/dalops/tindak/riwayat?kunci=`.
4. Staf memilih status, menulis catatan, lalu Simpan: `POST /api/dalops/tindak {kunci, status, catatan, langkah}`.
5. Worker memeriksa hak, wilayah, bentuk kunci, panjang teks, dan batas laju, lalu menulis satu batch: upsert `dl_tindak` + sisip `dl_tindak_log`.
6. Layar mengganti tanda status baris itu dan hitungan pita tanpa merender ulang tabel.
7. Pemirsa baca-saja: langkah 3 hanya menampilkan riwayat; pilihan status dan Simpan tidak ada.

Status gagal: 401/403 (hak), 400 (isian salah), 429 (terlalu cepat), 503 (migrasi 0128 belum diterapkan). Layar menampilkan pesannya di dialog.
