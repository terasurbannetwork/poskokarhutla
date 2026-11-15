-- 0144: indeks untuk hapus akun umum dan cabut sesi atur sandi (Pintu Masuk PM-13, PM-14; data/kajian-bnpb/pintu-masuk/DESAIN-TEKNIS.md §2).
-- Tanpa indeks, DELETE ... WHERE mk_id (alun_penulis) dan DELETE ... WHERE akun_id (km_sesi) memindai seluruh tabel (kuota baca D1). Hanya CREATE INDEX IF NOT EXISTS; tidak mengubah data.
CREATE INDEX IF NOT EXISTS alun_penulis_mk ON alun_penulis (mk_id);
CREATE INDEX IF NOT EXISTS km_sesi_akun ON km_sesi (akun_id);
