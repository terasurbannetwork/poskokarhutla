-- Metadata pos tinggi muka air dari sumber berambang resmi (DSDA DKI, SIPANTAU Kota Tangerang) yang dipanen Worker tiap jam (src/sungai_resmi.js); idempoten.
-- Bacaan dan daftar pos memakai tabel SIHKA yang sama (id berawalan 'd:' atau 't:'), jadi dasar persentil dan status ikut tanpa jalur kedua.
-- a3/a2/a1 = ambang Siaga 3/2/1 dalam cm (NULL = sumber tidak punya ambang); resmi = status resmi sumber; jenis = 'pompa' untuk lokasi pompa.
CREATE TABLE IF NOT EXISTS sungai_meta (
  pos TEXT PRIMARY KEY,
  sumber TEXT NOT NULL,
  pengelola TEXT,
  lon REAL,
  lat REAL,
  a3 REAL,
  a2 REAL,
  a1 REAL,
  resmi TEXT,
  jenis TEXT,
  diperbarui INTEGER
) WITHOUT ROWID;
