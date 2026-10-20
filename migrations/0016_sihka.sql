-- Tinggi muka air sungai terukur se-Indonesia (SIHKA, Kementerian PU Ditjen SDA) ditarik Worker tiap jam (src/sihka.js); idempoten.
-- Teks sumber TIDAK diurai Worker: diikat sebagai parameter, SQLite yang mengurai (json_each). Kesehatan & status siap saji di cuaca_sumber (kunci 'sihka', 'sihka_status').
-- sihka_baca sengaja tanpa indeks lain: tiap indeks = tulisan tambahan
CREATE TABLE IF NOT EXISTS sihka_baca (
  pos TEXT NOT NULL,              -- uuid pos SIHKA
  t INTEGER NOT NULL,             -- detik epoch UTC bacaan
  v REAL NOT NULL,                -- nilai dalam satuan pos (lihat sihka_pos.satuan)
  PRIMARY KEY (pos, t)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS sihka_pos (
  pos TEXT PRIMARY KEY,
  nama TEXT,
  x REAL,                         -- EPSG:3857 (meter); konversi ke lat/lon di klien
  y REAL,
  satuan TEXT,                    -- 'm' | 'cm' | 'mm' | lain | NULL (tidak diketahui)
  tz TEXT,
  merek TEXT,
  dilihat INTEGER                 -- detik epoch terakhir pos muncul di daftar
);

CREATE TABLE IF NOT EXISTS sihka_dasar (
  pos TEXT PRIMARY KEY,
  n INTEGER,                      -- jumlah sampel kenaikan 3 jam
  d3_p50 REAL,
  d3_p99 REAL,
  v_p95 REAL,
  v_max REAL,
  hari REAL,                      -- rentang riwayat (hari)
  dihitung INTEGER                -- detik epoch
);
