-- 0155: Lapor Bencana BNPB (paket data/kajian-bnpb/lapor-ai/, tiket LA-05, LA-06, LA-10; DESAIN-TEKNIS.md "Skema D1", disederhanakan).
-- Sesi utuh (isian, transkrip, jejak, foto, keadaan mesin) tersimpan sebagai JSON di lapor_sesi.kerja, dengan kolom indeks untuk cari dan meja.
-- Transkrip juga ditulis append-only ke lapor_pesan sebagai audit. Status sesi mengikuti mesin (identitas, lokasi, wilayah, rtrw, melengkapi, kronologi,
-- bercerita, foto, ringkasan, terkirim, batal), jadi tidak ada CHECK status sesi (CHECK tidak bisa diubah tanpa membangun ulang tabel).
-- Hanya CREATE ... IF NOT EXISTS; tanpa trigger; tanpa ALTER pada tabel lama. Waktu = ms epoch UTC.
-- Nomor WA pelapor terbaca di lapor_pelapor dan lapor_sesi.wa (K7, D12): hanya tampil di layar staf, tidak pernah di public/ atau log.
-- Tanpa data contoh. Pemilik yang menerapkan ke D1 produksi.

CREATE TABLE IF NOT EXISTS lapor_pelapor (
  wa TEXT PRIMARY KEY CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 1 AND 120),
  peran TEXT NOT NULL CHECK (peran IN ('warga', 'bpbd_klaim', 'bpbd')),
  kab TEXT CHECK (kab IS NULL OR length(kab) <= 120),
  jabatan TEXT CHECK (jabatan IS NULL OR length(jabatan) <= 120),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lapor_izin (
  wa TEXT PRIMARY KEY CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  peran TEXT CHECK (peran IS NULL OR peran = 'bpbd'),
  kab TEXT CHECK (kab IS NULL OR length(kab) <= 120),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 80),
  dibuat INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lapor_sesi (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 6 AND 40),
  wa TEXT NOT NULL CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  status TEXT NOT NULL CHECK (length(status) BETWEEN 1 AND 30),
  tingkat TEXT CHECK (tingkat IS NULL OR tingkat IN ('warga', 'bpbd_klaim', 'bpbd')),
  jenis TEXT CHECK (jenis IS NULL OR length(jenis) <= 40),
  kab TEXT CHECK (kab IS NULL OR length(kab) <= 10),
  lat REAL,
  lon REAL,
  nomor TEXT UNIQUE CHECK (nomor IS NULL OR nomor GLOB 'LA-[0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9]*'),
  token_sha TEXT CHECK (token_sha IS NULL OR length(token_sha) = 64),
  terkirim INTEGER,
  kerja TEXT NOT NULL,
  ringkas TEXT CHECK (ringkas IS NULL OR length(ringkas) <= 4000),
  rev INTEGER NOT NULL DEFAULT 0,
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lapor_sesi_wa ON lapor_sesi (wa, diubah);
CREATE INDEX IF NOT EXISTS lapor_sesi_wa_terkirim ON lapor_sesi (wa, terkirim);
CREATE INDEX IF NOT EXISTS lapor_sesi_token ON lapor_sesi (token_sha);
CREATE INDEX IF NOT EXISTS lapor_sesi_terkirim ON lapor_sesi (terkirim);

CREATE TABLE IF NOT EXISTS lapor_pesan (
  id INTEGER PRIMARY KEY,
  sesi TEXT NOT NULL,
  dari TEXT NOT NULL CHECK (dari IN ('pelapor', 'bot')),
  pintu TEXT NOT NULL CHECK (pintu IN ('wa', 'web')),
  teks TEXT CHECK (teks IS NULL OR length(teks) <= 4000),
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lapor_pesan_sesi ON lapor_pesan (sesi, id);

CREATE TABLE IF NOT EXISTS lapor_foto (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  sesi TEXT NOT NULL,
  kunci_r2 TEXT NOT NULL,
  lat REAL,
  lon REAL,
  akurasi REAL,
  waktu_ambil INTEGER,
  waktu_terima INTEGER NOT NULL,
  lencana TEXT NOT NULL CHECK (lencana IN ('gps', 'exif', 'wa', 'tanpa')),
  pintu TEXT NOT NULL CHECK (pintu IN ('wa', 'web'))
);
CREATE INDEX IF NOT EXISTS lapor_foto_sesi ON lapor_foto (sesi);

CREATE TABLE IF NOT EXISTS lapor_tiket (
  nomor TEXT PRIMARY KEY,
  sesi TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('baru', 'dilihat', 'ditelaah', 'diteruskan', 'ditindaklanjuti', 'selesai', 'tidak_valid')),
  diubah INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lapor_tiket_status ON lapor_tiket (status, diubah);

CREATE TABLE IF NOT EXISTS lapor_tiket_riwayat (
  id INTEGER PRIMARY KEY,
  nomor TEXT NOT NULL,
  dari TEXT,
  ke TEXT NOT NULL,
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 1000),
  pelaku TEXT NOT NULL,
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lapor_tiket_riwayat_nomor ON lapor_tiket_riwayat (nomor, id);

CREATE TABLE IF NOT EXISTS lapor_balasan (
  id INTEGER PRIMARY KEY,
  nomor TEXT NOT NULL,
  teks TEXT NOT NULL CHECK (length(teks) BETWEEN 1 AND 1000),
  oleh TEXT NOT NULL,
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lapor_balasan_nomor ON lapor_balasan (nomor, id);

CREATE TABLE IF NOT EXISTS lapor_kabar (
  id INTEGER PRIMARY KEY,
  wa TEXT NOT NULL,
  nomor TEXT NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('balasan', 'status', 'pdf')),
  teks TEXT NOT NULL CHECK (length(teks) <= 2000),
  url TEXT CHECK (url IS NULL OR length(url) <= 300),
  dibuat INTEGER NOT NULL,
  terkirim INTEGER
);
CREATE INDEX IF NOT EXISTS lapor_kabar_antre ON lapor_kabar (terkirim, id);
CREATE INDEX IF NOT EXISTS lapor_kabar_wa ON lapor_kabar (wa, dibuat);

CREATE TABLE IF NOT EXISTS lapor_urut (
  tgl TEXT PRIMARY KEY CHECK (length(tgl) = 10),
  n INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lapor_pdf (
  nomor TEXT NOT NULL,
  versi INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('antre', 'cetak', 'jadi', 'gagal')),
  coba INTEGER NOT NULL DEFAULT 0,
  diubah INTEGER NOT NULL,
  PRIMARY KEY (nomor, versi)
);
CREATE INDEX IF NOT EXISTS lapor_pdf_status ON lapor_pdf (status, diubah);
