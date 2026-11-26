-- Sasaran manual semai banjir per kab dan hari (data/kajian-bnpb/semai-banjir/DESAIN-TEKNIS.md §4, tiket SB-06).
-- Hanya CREATE ... IF NOT EXISTS, tanpa seed, tanpa ALTER op_semai_target, tanpa trigger. oleh = id akun, bukan nama.
-- Hapus lunak dengan alasan; unik hanya untuk sasaran aktif (kab, tanggal). Kode kab dicek rute terhadap daftar kab repo.
CREATE TABLE IF NOT EXISTS op_semai_sasaran (
  id         TEXT PRIMARY KEY,
  kab        TEXT NOT NULL CHECK (length(kab) = 4),
  tanggal    TEXT NOT NULL,
  catatan    TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  oleh       TEXT NOT NULL,
  dibuat     TEXT NOT NULL,
  terhapus   TEXT,
  alasan_hapus TEXT,
  dihapus_oleh TEXT
);
CREATE INDEX IF NOT EXISTS op_semai_sasaran_tgl ON op_semai_sasaran(tanggal);
CREATE UNIQUE INDEX IF NOT EXISTS op_semai_sasaran_unik ON op_semai_sasaran(kab, tanggal) WHERE terhapus IS NULL;
