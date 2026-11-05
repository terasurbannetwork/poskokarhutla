-- Asisten AI internal BNPB, langkah 1 (docs/ai-internal/PETA-FITUR.md §4): agen buatan staf, percakapan, pesan. Kode: src/ai.js.
-- Idempoten (IF NOT EXISTS). Agen tidak pernah dihapus keras: status 'hapus' menyembunyikannya dari daftar, percakapan lama tetap terbaca pemiliknya.
CREATE TABLE IF NOT EXISTS ai_agen (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 3 AND 80),
  avatar TEXT NOT NULL DEFAULT 'klasik' CHECK (avatar IN ('klasik', 'otak', 'asisten')),
  suhu REAL NOT NULL DEFAULT 0.3 CHECK (suhu >= 0 AND suhu <= 2),
  instruksi TEXT NOT NULL CHECK (length(instruksi) BETWEEN 10 AND 8000),
  deskripsi TEXT CHECK (deskripsi IS NULL OR length(deskripsi) <= 500),
  visibilitas TEXT NOT NULL DEFAULT 'pribadi' CHECK (visibilitas IN ('pribadi', 'unit', 'semua')),
  alat TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(alat)),
  alih_manusia INTEGER NOT NULL DEFAULT 0 CHECK (alih_manusia IN (0, 1)),
  pemilik TEXT NOT NULL CHECK (length(pemilik) BETWEEN 1 AND 64),
  unit TEXT CHECK (unit IS NULL OR length(unit) <= 120),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'hapus')),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS ai_agen_pemilik ON ai_agen (pemilik, status, diubah);
CREATE INDEX IF NOT EXISTS ai_agen_lihat ON ai_agen (visibilitas, status, diubah);
CREATE TABLE IF NOT EXISTS ai_percakapan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  agen_id TEXT NOT NULL CHECK (length(agen_id) = 16),
  pemilik TEXT NOT NULL CHECK (length(pemilik) BETWEEN 1 AND 64),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 1 AND 120),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'hapus'))
);
CREATE INDEX IF NOT EXISTS ai_percakapan_pemilik ON ai_percakapan (pemilik, status, diubah);
CREATE INDEX IF NOT EXISTS ai_percakapan_agen ON ai_percakapan (agen_id, status);
CREATE TABLE IF NOT EXISTS ai_pesan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  percakapan_id TEXT NOT NULL CHECK (length(percakapan_id) = 16),
  peran TEXT NOT NULL CHECK (peran IN ('user', 'assistant', 'tool')),
  isi TEXT NOT NULL CHECK (length(isi) <= 20000),
  sumber TEXT CHECK (sumber IS NULL OR json_valid(sumber)),
  langkah TEXT CHECK (langkah IS NULL OR json_valid(langkah)),
  model TEXT CHECK (model IS NULL OR length(model) <= 120),
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_pesan_percakapan ON ai_pesan (percakapan_id, waktu);
