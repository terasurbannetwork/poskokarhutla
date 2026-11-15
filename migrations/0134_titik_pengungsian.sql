-- Keterpaduan KP-19: register titik pengungsian bernomor tetap TP- (data/kajian-bnpb/keterpaduan/DESAIN-TEKNIS.md, KEPUTUSAN D9).
-- Data operasi, tidak tampil di layar publik. Idempoten.
CREATE TABLE IF NOT EXISTS titik_pengungsian (
  id TEXT PRIMARY KEY CHECK (id GLOB 'TP-????????'),
  prov TEXT NOT NULL,
  kab4 TEXT NOT NULL,
  kec TEXT,
  desa TEXT,
  nama TEXT NOT NULL,
  jenis_tempat TEXT NOT NULL,
  lat REAL,
  lon REAL,
  kejadian_id TEXT REFERENCES sk_kejadian(id) CHECK (kejadian_id IS NULL OR (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????')),
  buka TEXT,
  tutup TEXT,
  dibuat INTEGER NOT NULL,
  pembuat TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS titik_pengungsian_kab_tutup ON titik_pengungsian (kab4, tutup);
CREATE INDEX IF NOT EXISTS titik_pengungsian_kab_koordinat ON titik_pengungsian (kab4, lat, lon);
