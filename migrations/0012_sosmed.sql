-- Kurasi post media sosial (src/sosmed.js): admin menempel URL, layar publik menampilkan embed iframe.
-- Yang disimpan hanya URL kanonik + kode; URL embed dihitung ulang saat dibaca. Waktu = ms epoch UTC. Idempoten.
CREATE TABLE IF NOT EXISTS sosmed (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'x', 'threads')),
  kode TEXT NOT NULL CHECK (length(kode) BETWEEN 1 AND 40),
  url TEXT NOT NULL UNIQUE CHECK (url LIKE 'https://%'),
  akun TEXT CHECK (akun IS NULL OR length(akun) <= 40),
  teks TEXT CHECK (teks IS NULL OR length(teks) <= 500),
  prov TEXT CHECK (prov IS NULL OR (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*')),
  bencana TEXT NOT NULL DEFAULT 'karhutla',
  dibuat INTEGER NOT NULL,
  oleh TEXT,
  tampil INTEGER NOT NULL DEFAULT 1 CHECK (tampil IN (0, 1))
);
CREATE INDEX IF NOT EXISTS sosmed_tampil ON sosmed (bencana, tampil, dibuat DESC);
