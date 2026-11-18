-- 0153: tindakan lapangan per target renlap (tindakan-operasi TO-03). Hanya CREATE ... IF NOT EXISTS; tanpa ALTER pada tabel lama; tanpa nama orang.

-- Kode tindakan tidak dikunci dengan daftar di CHECK (Paritas D13: CHECK berdaftar tidak bisa diubah tanpa membangun ulang tabel); daftar dijaga Worker dari registri kemampuan.tindakan.
CREATE TABLE IF NOT EXISTS pb_renlap_tindakan (
  renlap_id TEXT NOT NULL REFERENCES pb_renlap (id) ON DELETE CASCADE,
  target_no INTEGER NOT NULL CHECK (target_no BETWEEN 1 AND 500),
  tindakan TEXT NOT NULL CHECK (length(tindakan) BETWEEN 2 AND 30 AND tindakan NOT GLOB '*[^a-z_]*'),
  oleh TEXT NOT NULL, waktu INTEGER NOT NULL,
  PRIMARY KEY (renlap_id, target_no, tindakan));
