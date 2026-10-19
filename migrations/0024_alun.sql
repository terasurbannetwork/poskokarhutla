-- Alun-alun (docs/bnpb/RENCANA-12-JAM.md R2): forum publik warga, relawan, BPBD/BNPB. Idempoten.
-- Utas (4 jenis tetap), balasan satu tingkat, suara (upvote dan aduan; satu per hash IP per pos). IP mentah tidak pernah disimpan;
-- token pemilik utas disimpan sebagai sha256. Pengumuman hanya lewat admin (dijaga di JS), CHECK menjaga bentuknya.
CREATE TABLE IF NOT EXISTS alun_utas (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  jenis TEXT NOT NULL CHECK (jenis IN ('tanya', 'butuh_bantuan', 'info_lapangan', 'pengumuman')),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 3 AND 120),
  teks TEXT NOT NULL CHECK (length(teks) BETWEEN 1 AND 1000),
  bencana TEXT NOT NULL CHECK (length(bencana) BETWEEN 3 AND 30 AND bencana NOT GLOB '*[^a-z_]*'),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT CHECK (kab IS NULL OR length(kab) BETWEEN 2 AND 60),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  nama TEXT CHECK (nama IS NULL OR length(nama) BETWEEN 2 AND 40),
  pemilik_sha TEXT NOT NULL CHECK (length(pemilik_sha) = 64 AND pemilik_sha NOT GLOB '*[^0-9a-f]*'),
  sematan INTEGER NOT NULL DEFAULT 0 CHECK (sematan IN (0, 1) AND (sematan = 0 OR jenis = 'pengumuman')),
  bantuan TEXT CHECK (bantuan IS NULL OR bantuan IN ('terbuka', 'ditangani', 'selesai')),
  teruskan_ke TEXT CHECK (teruskan_ke IS NULL OR (teruskan_ke IN ('relawan', 'logistik') AND jenis = 'butuh_bantuan')),
  teruskan_catatan TEXT CHECK (teruskan_catatan IS NULL OR length(teruskan_catatan) <= 300),
  moderasi TEXT NOT NULL DEFAULT 'tampil' CHECK (moderasi IN ('tampil', 'dilaporkan', 'tersembunyi')),
  terjawab_id TEXT CHECK (terjawab_id IS NULL OR length(terjawab_id) = 16),
  terjawab_pada INTEGER,
  upvote INTEGER NOT NULL DEFAULT 0 CHECK (upvote >= 0),
  balasan_n INTEGER NOT NULL DEFAULT 0 CHECK (balasan_n >= 0),
  aduan_n INTEGER NOT NULL DEFAULT 0 CHECK (aduan_n >= 0),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK ((jenis = 'butuh_bantuan') = (bantuan IS NOT NULL)),
  CHECK ((lat IS NULL) = (lon IS NULL)),
  CHECK ((terjawab_id IS NULL) = (terjawab_pada IS NULL))
);
CREATE INDEX IF NOT EXISTS alun_utas_dibuat ON alun_utas (moderasi, dibuat);
CREATE INDEX IF NOT EXISTS alun_utas_jenis ON alun_utas (jenis, dibuat);
CREATE INDEX IF NOT EXISTS alun_utas_wilayah ON alun_utas (bencana, prov);

CREATE TABLE IF NOT EXISTS alun_balas (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  utas_id TEXT NOT NULL CHECK (length(utas_id) = 16),
  teks TEXT NOT NULL CHECK (length(teks) BETWEEN 1 AND 280),
  nama TEXT CHECK (nama IS NULL OR length(nama) BETWEEN 2 AND 40),
  petugas INTEGER NOT NULL DEFAULT 0 CHECK (petugas IN (0, 1)),
  moderasi TEXT NOT NULL DEFAULT 'tampil' CHECK (moderasi IN ('tampil', 'dilaporkan', 'tersembunyi')),
  upvote INTEGER NOT NULL DEFAULT 0 CHECK (upvote >= 0),
  aduan_n INTEGER NOT NULL DEFAULT 0 CHECK (aduan_n >= 0),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS alun_balas_utas ON alun_balas (utas_id, dibuat);

CREATE TABLE IF NOT EXISTS alun_suara (
  pos_id TEXT NOT NULL CHECK (length(pos_id) = 16),
  kunci TEXT NOT NULL CHECK (length(kunci) BETWEEN 3 AND 64),
  jenis TEXT NOT NULL CHECK (jenis IN ('upvote', 'aduan')),
  alasan TEXT CHECK (alasan IS NULL OR alasan IN ('spam', 'kasar', 'hoaks', 'data_pribadi', 'lainnya')),
  waktu INTEGER NOT NULL,
  PRIMARY KEY (pos_id, kunci, jenis),
  CHECK ((jenis = 'aduan') = (alasan IS NOT NULL))
);
