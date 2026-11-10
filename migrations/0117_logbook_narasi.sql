-- Isian naratif Juklak BNPB 7/2023 per kejadian (src/logbook.js): nama kejadian, penyebab, kronologis, deskripsi, upaya penanganan. Idempoten; tabel samping 1:1 seperti 0094.
-- induk_id: kejadian utama bila satu bencana berdampak lintas wilayah (Bab II B.4.b): nasional dihitung satu, tingkat provinsi per provinsi terdampak.
CREATE TABLE IF NOT EXISTS logbook_narasi (
  kejadian_id TEXT PRIMARY KEY REFERENCES logbook_kejadian (id) ON DELETE CASCADE,
  nama_kejadian TEXT CHECK (nama_kejadian IS NULL OR length(nama_kejadian) <= 120),
  penyebab TEXT CHECK (penyebab IS NULL OR length(penyebab) <= 300),
  kronologis TEXT CHECK (kronologis IS NULL OR length(kronologis) <= 2000),
  deskripsi TEXT CHECK (deskripsi IS NULL OR length(deskripsi) <= 1000),
  upaya TEXT CHECK (upaya IS NULL OR length(upaya) <= 1000),
  induk_id TEXT REFERENCES logbook_kejadian (id) ON DELETE SET NULL,
  diubah INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS logbook_narasi_induk ON logbook_narasi (induk_id) WHERE induk_id IS NOT NULL;
