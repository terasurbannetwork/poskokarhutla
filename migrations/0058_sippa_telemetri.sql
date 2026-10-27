-- SIPPA telemetri sensor (keputusan 38; PRD §9.7.2 dan §9.11; DESAIN-TEKNIS §3.4, ADR-07). Idempoten. Waktu = ms epoch UTC.
-- Satu baris per PESAN, bukan per bacaan, karena kuota tulis D1 gratis 100 rb baris per hari dipakai bersama seluruh situs. Tidak ada INSERT; hanya tabel dan indeks baru, tidak mengubah 0056 atau 0057.

CREATE TABLE IF NOT EXISTS sippa_perangkat (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kit_id TEXT NOT NULL REFERENCES sippa_kit (id),
  tag TEXT NOT NULL CHECK (tag GLOB '[A-Z]*-[0-9]*' AND length(tag) <= 12),
  tag_datar TEXT CHECK (tag_datar IS NULL OR length(tag_datar) <= 20),   -- kunci bentuk datar paket pemilik (mis. 'T03_50cm_C'), DT §6.3
  jenis TEXT NOT NULL CHECK (jenis IN ('gateway', 'tekanan', 'debit', 'level', 'suhu_gambut', 'muka_air_tanah', 'co', 'pm25', 'bbm', 'rpm', 'posisi')),
  satuan TEXT NOT NULL CHECK (satuan IN ('-', 'bar', 'm3/jam', 'L/s', 'm', 'C', 'ppm', 'ug/m3', '%', 'rpm', 'derajat')),
  kedalaman_cm INTEGER CHECK (kedalaman_cm IS NULL OR kedalaman_cm IN (10, 30, 50, 100, 150, 300, 400, 500)),
  min_sah REAL, maks_sah REAL CHECK (maks_sah IS NULL OR min_sah IS NULL OR maks_sah > min_sah),
  interval_s INTEGER NOT NULL DEFAULT 60 CHECK (interval_s BETWEEN 10 AND 3600),
  token_sha TEXT UNIQUE CHECK (token_sha IS NULL OR (length(token_sha) = 64 AND token_sha NOT GLOB '*[^0-9a-f]*')),
  aktif INTEGER NOT NULL DEFAULT 1 CHECK (aktif IN (0, 1)),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (kit_id, tag),
  CHECK (jenis != 'gateway' OR token_sha IS NOT NULL)
);

-- satu baris per pesan masuk; bacaan = [[tag, t_ms, nilai, mutu, kedalaman_cm|null], ...]; mutu 0 baik, 1 diragukan, 2 di luar rentang sah
CREATE TABLE IF NOT EXISTS sippa_telemetri (
  id TEXT PRIMARY KEY CHECK (length(id) = 32),          -- 32 heks awal sha256(token_sha || badan): kirim ulang pesan sama = diabaikan
  pengirim_id TEXT NOT NULL REFERENCES sippa_perangkat (id),
  kit_id TEXT NOT NULL,
  diterima INTEGER NOT NULL,
  t_awal INTEGER NOT NULL, t_akhir INTEGER NOT NULL CHECK (t_akhir >= t_awal),
  n INTEGER NOT NULL CHECK (n BETWEEN 1 AND 500),
  n_mutu2 INTEGER NOT NULL DEFAULT 0 CHECK (n_mutu2 BETWEEN 0 AND n),
  bacaan TEXT NOT NULL CHECK (json_valid(bacaan) AND json_type(bacaan) = 'array' AND length(bacaan) <= 65536),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_sippa_tel_kit ON sippa_telemetri (kit_id, t_akhir);
CREATE INDEX IF NOT EXISTS idx_sippa_tel_pengirim ON sippa_telemetri (pengirim_id, diterima);

CREATE TABLE IF NOT EXISTS sippa_telemetri_harian (
  perangkat_id TEXT NOT NULL,
  hari TEXT NOT NULL CHECK (hari GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),   -- tanggal WIB
  n INTEGER NOT NULL, min REAL, maks REAL, rerata REAL, n_mutu2 INTEGER NOT NULL DEFAULT 0,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  PRIMARY KEY (perangkat_id, hari)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS sippa_alarm (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  perangkat_id TEXT NOT NULL,
  kit_id TEXT NOT NULL,
  kode TEXT NOT NULL CHECK (kode IN ('hisap_rendah', 'debit_rendah', 'dry_run', 'tekanan_lebih', 'belum_dingin', 'co_tinggi', 'bbm_rendah', 'diam')),
  nilai REAL, ambang REAL,
  mulai INTEGER NOT NULL,
  ditutup INTEGER,
  ditutup_oleh TEXT CHECK (ditutup_oleh IS NULL OR length(ditutup_oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
-- paling banyak satu alarm terbuka per (perangkat, kode)
CREATE UNIQUE INDEX IF NOT EXISTS uq_sippa_alarm_buka ON sippa_alarm (perangkat_id, kode) WHERE ditutup IS NULL;
