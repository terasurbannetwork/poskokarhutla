-- 0145: ikatan kode email -> akun (Pintu Masuk PM-16, keputusan rancangan D21; data/kajian-bnpb/pintu-masuk/ALGORITMA.md §2.4).
-- Kode lewat email hanya boleh membuka akun yang emailnya cocok saat kode diminta, bukan semua peran bernomor itu. Satu kode bisa mengikat beberapa akun (email sama di beberapa akun satu nomor).
-- Hanya CREATE ... IF NOT EXISTS; tidak mengubah tabel lama. Baris dibuang bersama mk_kode oleh pembersih dan saat kode dipakai.
CREATE TABLE IF NOT EXISTS mk_kode_akun (
  kode_id TEXT NOT NULL CHECK (length(kode_id) = 16),
  tabel TEXT NOT NULL CHECK (tabel IN ('instansi_akun', 'pdt_akun', 'km_akun', 'staf')),
  akun_id TEXT NOT NULL CHECK (length(akun_id) = 16),
  PRIMARY KEY (kode_id, tabel, akun_id)
) WITHOUT ROWID;
