-- Push 3-jam akun instansi: "status banjir naik" per kabupaten (src/push.js, aset /banjir/data/status.json).
-- Satu baris per (akun, "prov|kab") = level tertinggi (0 Aman .. 3 Awas) yang TERAKHIR dicatat; notifikasi hanya bila level sekarang > level tercatat, jadi tidak berulang.
-- Akun tanpa baris sama sekali = belum punya garis dasar: putaran pertama hanya mencatat (tidak membanjiri akun dengan seluruh status yang sudah ada). Idempoten.
CREATE TABLE IF NOT EXISTS push_banjir (
  akun_id TEXT NOT NULL REFERENCES instansi_akun (id) ON DELETE CASCADE,
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 4 AND 100),
  level INTEGER NOT NULL CHECK (level BETWEEN 0 AND 3),
  diperbarui INTEGER NOT NULL,
  PRIMARY KEY (akun_id, kab)
) WITHOUT ROWID;
