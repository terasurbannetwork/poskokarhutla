-- Asisten AI internal, langkah 2 (docs/ai-internal/PETA-FITUR.md §2.2, §4): pengetahuan berkas. Kode: src/ai.js, src/ai_teks.js.
-- Idempoten (IF NOT EXISTS). Berkas asli di R2 (MEDIA, kunci ai/pengetahuan/<id>); teks dipotong ke tabel FTS5 ai_potongan (pola sama dengan hukum_fts, migrasi 0052), tanpa vektor.
-- Status indeks per berkas: antre -> diproses -> selesai | gagal (galat berisi sebabnya). Menghapus berkas = hapus baris, potongan, tautan agen, dan objek R2.
CREATE TABLE IF NOT EXISTS ai_sumber (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 3 AND 120),
  deskripsi TEXT CHECK (deskripsi IS NULL OR length(deskripsi) <= 500),
  berkas TEXT NOT NULL CHECK (length(berkas) BETWEEN 1 AND 200),
  jenis TEXT NOT NULL CHECK (jenis IN ('txt', 'md', 'csv', 'json', 'docx', 'pptx', 'xlsx')),
  ukuran INTEGER NOT NULL CHECK (ukuran BETWEEN 1 AND 2097152),
  visibilitas TEXT NOT NULL DEFAULT 'pribadi' CHECK (visibilitas IN ('pribadi', 'unit', 'semua')),
  status TEXT NOT NULL DEFAULT 'antre' CHECK (status IN ('antre', 'diproses', 'selesai', 'gagal')),
  galat TEXT CHECK (galat IS NULL OR length(galat) <= 300),
  potongan INTEGER NOT NULL DEFAULT 0 CHECK (potongan >= 0),
  pemilik TEXT NOT NULL CHECK (length(pemilik) BETWEEN 1 AND 64),
  unit TEXT CHECK (unit IS NULL OR length(unit) <= 120),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_sumber_pemilik ON ai_sumber (pemilik, diubah);
CREATE INDEX IF NOT EXISTS ai_sumber_lihat ON ai_sumber (visibilitas, diubah);
CREATE TABLE IF NOT EXISTS ai_agen_sumber (
  agen_id TEXT NOT NULL CHECK (length(agen_id) = 16) REFERENCES ai_agen (id),
  sumber_id TEXT NOT NULL CHECK (length(sumber_id) = 16) REFERENCES ai_sumber (id) ON DELETE CASCADE,
  dibuat INTEGER NOT NULL,
  PRIMARY KEY (agen_id, sumber_id)
);
CREATE INDEX IF NOT EXISTS ai_agen_sumber_sumber ON ai_agen_sumber (sumber_id);
CREATE VIRTUAL TABLE IF NOT EXISTS ai_potongan USING fts5 (isi, sumber_id UNINDEXED, urut UNINDEXED, tokenize = 'unicode61 remove_diacritics 2');
