-- Operasi Lapangan OP-1 (spek docs/superpowers/specs/2026-11-02-operasi-lapangan.md bagian 8): base ops, armada udara, renlap, gerak, temuan patroli.
-- Waktu = ms epoch UTC; tanggal = YYYY-MM-DD (WIB). Data operasional khusus staf (src/operasi_udara.js). Nama kru TIDAK disimpan di kolom mana pun.
-- Seed base dan armada dari bahan 27 Okt sampai 2 Nov 2026, koordinat OurAirports. Idempoten: IF NOT EXISTS dan INSERT OR IGNORE.
CREATE TABLE IF NOT EXISTS op_base (
  id       TEXT PRIMARY KEY CHECK (length(id) BETWEEN 2 AND 8),
  nama     TEXT NOT NULL,
  icao     TEXT,
  iata     TEXT,
  prov     TEXT NOT NULL CHECK (length(prov) = 2),
  lat      REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon      REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  vor_kode TEXT,
  vor_lat  REAL,
  vor_lon  REAL,
  aktif    INTEGER NOT NULL DEFAULT 1 CHECK (aktif IN (0, 1))
);
CREATE TABLE IF NOT EXISTS op_armada (
  registrasi  TEXT PRIMARY KEY CHECK (length(registrasi) BETWEEN 3 AND 12),
  tipe        TEXT NOT NULL,
  peran       TEXT NOT NULL CHECK (peran IN ('patroli', 'wb', 'omc', 'patroli_wb')),
  operator    TEXT,
  pemilik     TEXT NOT NULL CHECK (pemilik IN ('bnpb_sewa', 'tni_au', 'tni_ad', 'lainnya')),
  base_id     TEXT REFERENCES op_base(id),
  bucket_liter INTEGER,
  jelajah_nm  INTEGER,
  dummy       INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  diubah      INTEGER
);
CREATE TABLE IF NOT EXISTS op_armada_status (
  tanggal TEXT NOT NULL CHECK (length(tanggal) = 10 AND tanggal GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  registrasi TEXT NOT NULL,
  status     TEXT NOT NULL CHECK (status IN ('siap', 'operasi', 'siaga', 'tidak_siap')),
  alasan     TEXT,
  sumber     TEXT,
  diubah     INTEGER,
  PRIMARY KEY (tanggal, registrasi)
);
CREATE TABLE IF NOT EXISTS op_renlap (
  id       TEXT PRIMARY KEY,
  tanggal TEXT NOT NULL CHECK (length(tanggal) = 10 AND tanggal GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  versi    TEXT NOT NULL CHECK (versi IN ('malam', 'pagi')),
  base_id  TEXT NOT NULL,
  dibuat   INTEGER NOT NULL,
  isi_json TEXT CHECK (isi_json IS NULL OR (json_valid(isi_json) AND length(isi_json) <= 262144)),
  status   TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'diperiksa', 'dikirim')),
  dummy    INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE TABLE IF NOT EXISTS op_target (
  id          TEXT PRIMARY KEY,
  renlap_id   TEXT NOT NULL REFERENCES op_renlap(id),
  urut        INTEGER NOT NULL,
  jenis       TEXT NOT NULL CHECK (jenis IN ('patroli', 'wb')),
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  skor        REAL,
  alasan_json TEXT CHECK (alasan_json IS NULL OR json_valid(alasan_json))
);
CREATE TABLE IF NOT EXISTS op_gerak (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tanggal TEXT NOT NULL CHECK (length(tanggal) = 10 AND tanggal GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  registrasi TEXT NOT NULL,
  jenis      TEXT NOT NULL CHECK (jenis IN ('rencana', 'berangkat', 'kembali', 'batal')),
  jam_utc    INTEGER,
  misi       TEXT,
  rute       TEXT,
  lokasi     TEXT,
  lat        REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon        REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  rujukan    TEXT,
  alasan     TEXT,
  wa_id      INTEGER,
  dummy      INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE TABLE IF NOT EXISTS op_temuan (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  tanggal TEXT NOT NULL CHECK (length(tanggal) = 10 AND tanggal GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  jam_utc        INTEGER,
  registrasi     TEXT NOT NULL,
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  status         TEXT NOT NULL CHECK (status IN ('fs', 'berasap', 'berasap_tipis', 'clear')),
  luas_klaim_ha  REAL,
  umur_klaim_hari INTEGER,
  lokasi         TEXT,
  kab_kode       TEXT,
  target_id      TEXT,
  wa_id          INTEGER,
  dummy          INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (registrasi, tanggal, lat, lon)
);
CREATE INDEX IF NOT EXISTS op_gerak_tanggal ON op_gerak(tanggal);
CREATE INDEX IF NOT EXISTS op_temuan_tanggal ON op_temuan(tanggal);
CREATE INDEX IF NOT EXISTS op_renlap_tanggal ON op_renlap(tanggal, versi);
CREATE INDEX IF NOT EXISTS op_target_renlap ON op_target(renlap_id, urut);
INSERT OR IGNORE INTO op_base (id, nama, icao, iata, prov, lat, lon, vor_kode, vor_lat, vor_lon, aktif) VALUES ('PNK', 'Supadio', 'WIOO', 'PNK', '61', -0.152258, 109.404493, 'PNK', -0.079153, 109.375, 1);
INSERT OR IGNORE INTO op_base (id, nama, icao, iata, prov, lat, lon, vor_kode, vor_lat, vor_lon, aktif) VALUES ('KTG', 'Rahadi Oesman', 'WIOK', 'KTG', '61', -1.817165, 109.963469, NULL, NULL, NULL, 1);
INSERT OR IGNORE INTO op_base (id, nama, icao, iata, prov, lat, lon, vor_kode, vor_lat, vor_lon, aktif) VALUES ('PKY', 'Tjilik Riwut', 'WAGG', 'PKY', '62', -2.227146, 113.943388, 'PKY', -2.2435, 113.95, 1);
INSERT OR IGNORE INTO op_base (id, nama, icao, iata, prov, lat, lon, vor_kode, vor_lat, vor_lon, aktif) VALUES ('SMQ', 'H. Asan Sampit', 'WAOS', 'SMQ', '62', -2.499198, 112.974987, NULL, NULL, NULL, 1);
INSERT OR IGNORE INTO op_base (id, nama, icao, iata, prov, lat, lon, vor_kode, vor_lat, vor_lon, aktif) VALUES ('KLP', 'Kuala Pembuang', 'WAGF', 'KLP', '62', -3.376062, 112.536521, NULL, NULL, NULL, 1);
INSERT OR IGNORE INTO op_base (id, nama, icao, iata, prov, lat, lon, vor_kode, vor_lat, vor_lon, aktif) VALUES ('BDJ', 'Syamsudin Noor / Lanud SAM', 'WAOO', 'BDJ', '63', -3.440112, 114.761209, 'BDM', -3.4368, 114.731, 1);
INSERT OR IGNORE INTO op_base (id, nama, icao, iata, prov, lat, lon, vor_kode, vor_lat, vor_lon, aktif) VALUES ('PLM', 'SMB II / Lanud SMH', 'WIPP', 'PLM', '16', -2.897653, 104.698147, 'PLB', -2.87859, 104.653, 1);
INSERT OR IGNORE INTO op_base (id, nama, icao, iata, prov, lat, lon, vor_kode, vor_lat, vor_lon, aktif) VALUES ('DJB', 'Sultan Thaha', 'WIPA', 'DJB', '15', -1.638685, 103.645063, 'JMB', -1.63604, 103.645, 1);
INSERT OR IGNORE INTO op_base (id, nama, icao, iata, prov, lat, lon, vor_kode, vor_lat, vor_lon, aktif) VALUES ('PKU', 'Roesmin Nurjadin', 'WIBB', 'PKU', '14', 0.458647, 101.444321, 'PKU', 0.425589, 101.441, 1);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('PK-FPA', 'Bell 206 B3', 'patroli', 'PT Falcon Patriot Udara', 'bnpb_sewa', 'PNK', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('VH-L6T', 'Sikorsky UH-60L', 'wb', 'PT Elang Dhirgantara Candracanta', 'bnpb_sewa', 'PNK', 4000, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('VN-8424', 'Mi-172', 'wb', 'PT Gunung Selatan', 'bnpb_sewa', 'PNK', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('H-3217', 'NAS-332 Super Puma', 'patroli_wb', 'TNI AU Skadud 6', 'tni_au', 'PNK', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('HA-5231', 'Bell 412 EPI', 'patroli_wb', 'TNI AD', 'tni_ad', 'PNK', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('HA-5228', 'Bell 412 EPI', 'patroli_wb', 'TNI AD', 'tni_ad', 'PNK', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('VN-8416', 'Mi-17-1V', 'wb', 'PT Buana Multi Techindo', 'bnpb_sewa', 'KTG', 4000, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('PK-ALE', 'Bell 206 L4', 'patroli', 'PT Alkonost Aviasi Indonesia', 'bnpb_sewa', 'KTG', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('PK-FPU', 'Cessna C208B EX', 'patroli', 'PT ACP', 'bnpb_sewa', 'PKY', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('PK-KIA', 'AS350B3', 'patroli', NULL, 'lainnya', 'PKY', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('ZK-HKU', 'EH-60A Blackhawk', 'wb', NULL, 'bnpb_sewa', 'PKY', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('UR-CSM', 'Kamov Ka-32AO', 'wb', NULL, 'bnpb_sewa', 'PKY', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('N-814AR', 'SA330J Puma', 'wb', NULL, 'bnpb_sewa', 'PKY', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('PK-SNC', 'tidak diketahui', 'omc', NULL, 'bnpb_sewa', 'PKY', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('RA-22700', 'tidak diketahui', 'wb', NULL, 'bnpb_sewa', 'BDJ', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('N61AA', 'tidak diketahui', 'wb', NULL, 'bnpb_sewa', NULL, NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('PK-SCH', 'tidak diketahui', 'omc', NULL, 'bnpb_sewa', NULL, NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('UR-CSN', 'Kamov Ka-32AO', 'wb', NULL, 'bnpb_sewa', 'SMQ', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('PK-DAP', 'Airbus AS350B3E', 'wb', NULL, 'bnpb_sewa', 'KLP', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('HA-5172', 'Bell 412EP', 'wb', NULL, 'tni_ad', 'KLP', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('RA-31021', 'Kamov Ka-32C', 'wb', NULL, 'bnpb_sewa', 'KLP', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('HA-5235', 'Mi-17 V5', 'wb', NULL, 'tni_ad', 'KLP', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('PK-RTQ', 'AS355 F1', 'patroli', 'PT Abhipraya/APD', 'bnpb_sewa', 'BDJ', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('PK-SNK', 'Cessna Caravan 208', 'omc', 'PT Milan Pillery Bersatu', 'bnpb_sewa', 'BDJ', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('PK-SNL', 'Cessna Caravan 208B', 'omc', NULL, 'bnpb_sewa', 'BDJ', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('A-2904', 'CN-295', 'omc', 'TNI AU', 'tni_au', 'BDJ', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('A-2105', 'CASA 212', 'omc', 'TNI AU', 'tni_au', 'BDJ', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('A-2107', 'CASA 212', 'omc', 'TNI AU', 'tni_au', 'BDJ', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('A-2119', 'CASA 212', 'omc', 'TNI AU', 'tni_au', 'BDJ', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('A-1328', 'Hercules C-130', 'omc', 'TNI AU', 'tni_au', 'BDJ', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('RA-22834', 'Mi-8AMT', 'wb', NULL, 'bnpb_sewa', 'BDJ', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('N261BE', 'UH-60L', 'wb', NULL, 'bnpb_sewa', 'BDJ', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('HA-5234', 'Mi-17V5', 'wb', NULL, 'tni_ad', 'BDJ', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('VH-HGM', 'Super Puma H225', 'wb', NULL, 'bnpb_sewa', 'BDJ', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('PK-RTY', 'AS365', 'patroli', 'PT Genesa Dirgantara', 'bnpb_sewa', 'PLM', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('PK-IKC', 'Cessna C208B', 'patroli', 'PT Sango Aviasi Indonesia', 'bnpb_sewa', 'PLM', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('PK-SNP', 'Cessna Caravan 208B', 'omc', NULL, 'bnpb_sewa', 'PLM', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('A-2117', 'CASA NC-212', 'omc', 'TNI AU', 'tni_au', 'PLM', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('A-2104', 'CASA NC-212', 'omc', 'TNI AU', 'tni_au', 'PLM', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('A-1319', 'Hercules C-130H', 'omc', 'TNI AU', 'tni_au', 'PLM', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('RA-22747', 'Mi-8AMT', 'wb', 'PT LBA', 'bnpb_sewa', 'PLM', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('RA-22477', 'Mi-8AMT', 'wb', 'PT APN', 'bnpb_sewa', 'PLM', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('RA-22279', 'Mi-8MTV-1', 'wb', 'PT KBP', 'bnpb_sewa', 'PLM', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('UR-VBC', 'Mi-8MSB-T', 'wb', 'PT SAI', 'bnpb_sewa', 'PLM', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('UR-CBH', 'Kamov Ka-32A', 'wb', 'PT KHA', 'bnpb_sewa', 'PLM', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('PK-WSA', 'Bell 505', 'patroli', 'PT Berkah Maju Sejahtera', 'bnpb_sewa', 'DJB', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('PK-ALA', 'Cessna Caravan 208B', 'patroli', 'PT Alkonost Aviasi Indonesia', 'bnpb_sewa', 'DJB', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('RA-22840', 'Mi-8AMT', 'wb', 'PT Batavia Langit Sejahtera', 'bnpb_sewa', 'DJB', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('N-274TH', 'Sikorsky UH-60A', 'wb', 'PT Transna Dirgantara Utama', 'bnpb_sewa', 'DJB', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('VN-8414', 'Mi-17-1V', 'wb', 'PT Erlangga Angkasa Nasta', 'bnpb_sewa', 'DJB', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('PK-WSD', 'Bell 505', 'patroli', 'PT Kurnia Alam Sentosa', 'bnpb_sewa', 'PKU', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('RA-22729', 'Mi-8AMT', 'wb', 'PT Genesa Dirgantara', 'bnpb_sewa', 'PKU', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('N5193Y', 'S-61A', 'wb', 'PT Rajawali Pengawal Utama', 'bnpb_sewa', 'PKU', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('RDPL-34194', 'Mi-8T', 'wb', 'PT Mitra Global Heliaero', 'bnpb_sewa', 'PKU', NULL, 0, 0);
INSERT OR IGNORE INTO op_armada (registrasi, tipe, peran, operator, pemilik, base_id, bucket_liter, dummy, diubah) VALUES ('N4875A', 'UH-60L', 'wb', 'PT Centra Multi Aviasi', 'bnpb_sewa', 'PKU', NULL, 0, 0);
