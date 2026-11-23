-- Peringatan dini Pantau Bencana untuk warga (paket data/kajian-bnpb/pwa-peringatan, PW-01). Idempoten.
-- Satu baris per (perangkat, kecamatan); endpoint push adalah rahasia pemegangnya dan tidak pernah ditampilkan.
CREATE TABLE IF NOT EXISTS pw_langganan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  endpoint TEXT NOT NULL CHECK (length(endpoint) BETWEEN 20 AND 1000 AND endpoint LIKE 'https://%'),
  p256dh TEXT NOT NULL CHECK (length(p256dh) BETWEEN 80 AND 100),
  auth TEXT NOT NULL CHECK (length(auth) BETWEEN 20 AND 30),
  kec_kode TEXT NOT NULL CHECK (kec_kode GLOB '[0-9][0-9].[0-9][0-9].[0-9][0-9]'),
  kab_kode TEXT NOT NULL CHECK (kab_kode GLOB '[0-9][0-9][0-9][0-9]'),
  kec_nama TEXT NOT NULL CHECK (length(kec_nama) BETWEEN 1 AND 80),
  jenis INTEGER NOT NULL CHECK (jenis BETWEEN 1 AND 15),
  ambang INTEGER NOT NULL DEFAULT 1 CHECK (ambang BETWEEN 1 AND 3),
  bahasa TEXT NOT NULL DEFAULT 'id' CHECK (bahasa IN ('id','en')),
  uji INTEGER NOT NULL DEFAULT 0 CHECK (uji IN (0,1)),
  dibuat INTEGER NOT NULL,
  terakhir_aktif INTEGER NOT NULL,
  UNIQUE (endpoint, kec_kode)
);
CREATE INDEX IF NOT EXISTS pw_langganan_kab ON pw_langganan (kab_kode, id);
CREATE INDEX IF NOT EXISTS pw_langganan_endpoint ON pw_langganan (endpoint);

-- tingkat tertinggi yang sudah dikirim per (kab, jenis, tanggal sasaran): naik saja yang memicu peristiwa
CREATE TABLE IF NOT EXISTS pw_status (
  kab_kode TEXT NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('BNJ','LSR','ASP','CEX')),
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
  PRIMARY KEY (kab_kode, jenis, tanggal)
) WITHOUT ROWID;

-- satu peristiwa = satu kab dalam satu terbitan prakiraan; dikirim bertahap dengan kursor (40 per menit)
CREATE TABLE IF NOT EXISTS pw_peristiwa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dibuat_berkas TEXT NOT NULL,
  kab_kode TEXT NOT NULL,
  ringkas TEXT NOT NULL,
  dibuat INTEGER NOT NULL,
  ditahan_sampai INTEGER,
  kursor TEXT NOT NULL DEFAULT '',
  selesai INTEGER NOT NULL DEFAULT 0 CHECK (selesai IN (0,1)),
  ok INTEGER NOT NULL DEFAULT 0,
  gagal INTEGER NOT NULL DEFAULT 0,
  mati INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS pw_peristiwa_belum ON pw_peristiwa (selesai, id);

-- penanda berkas prakiraan terakhir yang diproses dan jeda global
CREATE TABLE IF NOT EXISTS pw_kendali (
  kunci TEXT PRIMARY KEY CHECK (kunci IN ('dibuat_terakhir','jeda')),
  nilai TEXT NOT NULL
);
