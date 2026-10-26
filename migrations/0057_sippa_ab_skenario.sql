-- SIPPA A/B, skenario, laporan (PRD §9.7.2; DESAIN-TEKNIS §3.3). Idempoten. Waktu = ms epoch UTC. Tidak ada INSERT; tabel baru, tidak mengubah 0056.

CREATE TABLE IF NOT EXISTS sippa_ab_unggah (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nama_berkas TEXT CHECK (nama_berkas IS NULL OR length(nama_berkas) <= 120),
  sha TEXT NOT NULL UNIQUE CHECK (length(sha) = 64),          -- berkas sama = 409 (UNIQUE, bukan cek JS saja)
  n_baris INTEGER NOT NULL CHECK (n_baris BETWEEN 1 AND 2000),
  status TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'ditinjau_evaluator')),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE TABLE IF NOT EXISTS sippa_petak (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  unggah_id TEXT REFERENCES sippa_ab_unggah (id),
  petak_id TEXT NOT NULL CHECK (length(petak_id) BETWEEN 3 AND 40),
  aoi TEXT NOT NULL CHECK (length(aoi) BETWEEN 1 AND 40),
  prov TEXT CHECK (prov IS NULL OR length(prov) = 2),
  lengan TEXT NOT NULL CHECK (lengan IN ('konvensional', 'lance', 'lance_surfaktan', 'sekat_rewetting', 'lance_dalam')),
  pasangan_id TEXT CHECK (pasangan_id IS NULL OR length(pasangan_id) <= 40),
  tanggal_perlakuan TEXT NOT NULL CHECK (tanggal_perlakuan GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  luas_m2 REAL NOT NULL CHECK (luas_m2 BETWEEN 1 AND 100000),
  regu_hari REAL CHECK (regu_hari IS NULL OR regu_hari BETWEEN 0 AND 1000),
  air_m3 REAL CHECK (air_m3 IS NULL OR air_m3 BETWEEN 0 AND 100000),
  surfaktan_l REAL NOT NULL DEFAULT 0 CHECK (surfaktan_l >= 0),
  biaya_rp INTEGER CHECK (biaya_rp IS NULL OR biaya_rp >= 0),
  dingin_24j INTEGER CHECK (dingin_24j IS NULL OR dingin_24j IN (0, 1)),
  dingin_72j INTEGER CHECK (dingin_72j IS NULL OR dingin_72j IN (0, 1)),
  nyala_7h INTEGER CHECK (nyala_7h IS NULL OR nyala_7h IN (0, 1)),
  nyala_30h INTEGER CHECK (nyala_30h IS NULL OR nyala_30h IN (0, 1)),
  nyala_90h INTEGER CHECK (nyala_90h IS NULL OR nyala_90h IN (0, 1)),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  sumber TEXT NOT NULL CHECK (sumber IN ('unggah', 'lapangan')),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (aoi, petak_id),
  CHECK (surfaktan_l = 0 OR lengan = 'lance_surfaktan')
);
CREATE INDEX IF NOT EXISTS idx_sippa_petak_lengan ON sippa_petak (aoi, lengan);
CREATE TABLE IF NOT EXISTS sippa_skenario (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 3 AND 80),
  state TEXT NOT NULL CHECK (json_valid(state) AND json_type(state) = 'object' AND length(state) <= 32768),
  versi_mesin TEXT NOT NULL CHECK (length(versi_mesin) BETWEEN 3 AND 40),
  ringkas TEXT CHECK (ringkas IS NULL OR (json_valid(ringkas) AND length(ringkas) <= 8192)),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dihapus INTEGER,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE TABLE IF NOT EXISTS sippa_laporan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  jenis TEXT NOT NULL CHECK (jenis IN ('pilot', 'kejadian', 'mingguan', 'musim', 'skenario')),
  prov TEXT CHECK (prov IS NULL OR length(prov) = 2),
  parameter TEXT NOT NULL CHECK (json_valid(parameter) AND length(parameter) <= 8192),
  ada_berkas INTEGER NOT NULL DEFAULT 0 CHECK (ada_berkas IN (0, 1)),   -- kunci R2 = sippa-laporan/<id>.pdf, selalu dari server
  sha TEXT CHECK (sha IS NULL OR length(sha) = 64),
  ukuran INTEGER CHECK (ukuran IS NULL OR ukuran BETWEEN 1 AND 10485760),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (ada_berkas = 0 OR (sha IS NOT NULL AND ukuran IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_sippa_laporan_jenis ON sippa_laporan (jenis, waktu);
