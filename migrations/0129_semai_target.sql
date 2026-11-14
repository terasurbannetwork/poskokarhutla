-- Target semai awan (OMC) dari zona semai (data/kajian-bnpb/semai-awan/DESAIN-TEKNIS.md §4, tiket SA-07).
-- Hanya CREATE ... IF NOT EXISTS, tanpa seed. Tabel sendiri, bukan op_target, supaya renlapMesin tidak menghapusnya.
-- Hapus lunak dengan alasan; unik hanya untuk target aktif (zona_id, base_id). Koordinat dari server, bukan klien.
CREATE TABLE IF NOT EXISTS op_semai_target (
  id         TEXT PRIMARY KEY,
  zona_id    TEXT NOT NULL,
  putaran    TEXT NOT NULL,
  base_id    TEXT NOT NULL,
  base_icao  TEXT,
  base_nama  TEXT,
  tanggal    TEXT NOT NULL,
  lat        REAL NOT NULL CHECK (lat BETWEEN -12 AND 7),
  lon        REAL NOT NULL CHECK (lon BETWEEN 94 AND 142),
  mulai      TEXT NOT NULL,
  selesai    TEXT NOT NULL,
  skor       REAL NOT NULL CHECK (skor BETWEEN 0 AND 1),
  alasan_json TEXT NOT NULL,
  catatan    TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  oleh       TEXT NOT NULL,
  dibuat     TEXT NOT NULL,
  terhapus   TEXT,
  alasan_hapus TEXT,
  dihapus_oleh TEXT
);
CREATE INDEX IF NOT EXISTS op_semai_target_tgl ON op_semai_target(tanggal, base_id);
CREATE UNIQUE INDEX IF NOT EXISTS op_semai_target_unik ON op_semai_target(zona_id, base_id) WHERE terhapus IS NULL;
CREATE INDEX IF NOT EXISTS op_semai_target_oleh ON op_semai_target(oleh, dibuat);
CREATE INDEX IF NOT EXISTS op_semai_target_hapus ON op_semai_target(dihapus_oleh, terhapus);
