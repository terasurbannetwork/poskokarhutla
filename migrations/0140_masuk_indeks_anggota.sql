-- 0140: indeks untuk antrean tinjau anggota dan batas undangan per pengundang (Pintu Masuk PM-09, PM-11; data/kajian-bnpb/pintu-masuk/DESAIN-TEKNIS.md §2).
-- Tanpa indeks, daftar anggota menunggu dan hitungan undangan per pengundang memindai seluruh tabel (kuota baca D1). Hanya CREATE INDEX IF NOT EXISTS; tidak mengubah data.
CREATE INDEX IF NOT EXISTS mk_anggota_status ON mk_anggota (status, dibuat);
CREATE INDEX IF NOT EXISTS mk_undang_oleh ON mk_undang (oleh_tabel, oleh_id, dibuat);
