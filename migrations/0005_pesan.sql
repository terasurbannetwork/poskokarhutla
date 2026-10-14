-- Kotak pesan: pengunjung mengirim pesan ke tim (POST /api/pesan), admin membaca di /admin/pesan.
-- Email hanya untuk membalas; pesan dihapus cron 180 hari setelah dikirim. ip_hash = SHA-256 bergaram (batas laju), bukan IP.
CREATE TABLE pesan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  nama TEXT NOT NULL DEFAULT '' CHECK (length(nama) <= 100),
  instansi TEXT NOT NULL DEFAULT '' CHECK (length(instansi) <= 150),
  email TEXT NOT NULL CHECK (length(email) BETWEEN 6 AND 254 AND email GLOB '?*@?*.?*' AND email NOT GLOB '*[ <>]*'),
  kategori TEXT NOT NULL CHECK (kategori IN ('masukan', 'koreksi', 'kerja_sama', 'media', 'lainnya')),
  isi TEXT NOT NULL CHECK (length(isi) BETWEEN 10 AND 2000),
  tautan TEXT NOT NULL DEFAULT '' CHECK (length(tautan) <= 500),
  status TEXT NOT NULL DEFAULT 'baru' CHECK (status IN ('baru', 'dibaca', 'arsip')),
  ip_hash TEXT NOT NULL CHECK (length(ip_hash) = 64)
);
CREATE INDEX pesan_status ON pesan (status, dibuat);
