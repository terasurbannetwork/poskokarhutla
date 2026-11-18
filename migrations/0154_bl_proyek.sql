-- 0154: Bot Laporan WA dengan Claude API (paket data/kajian-bnpb/bot-laporan/, tiket BL-01; DESAIN-TEKNIS.md "Tabel D1 (bl_*)").
-- Proyek laporan per (nomor, jenis, tanggal), bahan, versi append-only, pola revisi, daftar nomor, biaya harian, detak mesin.
-- Hanya CREATE ... IF NOT EXISTS; tanpa trigger; tanpa ALTER pada tabel lama (wa_* tidak disentuh, tautan bahan lewat bl_bahan.wa_id).
-- Nomor hanya sebagai wa_sha (sha256 hex, 64 huruf), tidak pernah nomor mentah. Waktu = ms epoch UTC; biaya dalam mikro-USD (INTEGER).
-- Jenis laporan tidak dikunci daftar di CHECK (CHECK berdaftar tidak bisa diubah tanpa membangun ulang tabel; tahap 2 menambah jenis); daftar dijaga Worker.
-- Tanpa data contoh. Pemilik yang menerapkan ke D1 produksi (BL-13).

CREATE TABLE IF NOT EXISTS bl_proyek (
  id TEXT PRIMARY KEY CHECK (length(id) = 11 AND id GLOB 'P-[0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  wa_sha TEXT NOT NULL CHECK (length(wa_sha) = 64 AND wa_sha NOT GLOB '*[^0-9a-f]*'),
  jenis TEXT NOT NULL CHECK (length(jenis) BETWEEN 2 AND 30 AND jenis NOT GLOB '*[^a-z_]*'),
  tanggal TEXT NOT NULL CHECK (length(tanggal) = 10 AND tanggal GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  status TEXT NOT NULL CHECK (status IN ('terbuka', 'bertanya', 'membangun', 'draf', 'final', 'ditutup', 'batal', 'kedaluwarsa')),
  versi INTEGER NOT NULL DEFAULT 0 CHECK (versi >= 0),
  drive_url TEXT CHECK (drive_url IS NULL OR (length(drive_url) <= 500 AND drive_url GLOB 'https://*')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS bl_proyek_nomor ON bl_proyek (wa_sha, status);
CREATE INDEX IF NOT EXISTS bl_proyek_status ON bl_proyek (status, diubah);

CREATE TABLE IF NOT EXISTS bl_bahan (
  proyek_id TEXT NOT NULL REFERENCES bl_proyek (id) ON DELETE CASCADE,
  wa_id TEXT NOT NULL CHECK (length(wa_id) BETWEEN 1 AND 128),
  jenis_bahan TEXT CHECK (jenis_bahan IS NULL OR (length(jenis_bahan) BETWEEN 2 AND 40 AND jenis_bahan NOT GLOB '*[^a-z0-9_]*')),
  ditambah INTEGER NOT NULL,
  PRIMARY KEY (proyek_id, wa_id)
);

-- Append-only: baris versi tidak pernah diubah atau dihapus (dijaga Worker; tanpa trigger sesuai brief BL-01).
CREATE TABLE IF NOT EXISTS bl_versi (
  proyek_id TEXT NOT NULL REFERENCES bl_proyek (id),   -- tanpa CASCADE: versi append-only, proyek tidak boleh terhapus bila punya versi
  n INTEGER NOT NULL CHECK (n BETWEEN 1 AND 999),
  isian_r2 TEXT CHECK (isian_r2 IS NULL OR (length(isian_r2) <= 300 AND isian_r2 GLOB 'bot-laporan/*')),
  ubah_r2 TEXT CHECK (ubah_r2 IS NULL OR (length(ubah_r2) <= 300 AND ubah_r2 GLOB 'bot-laporan/*')),
  pptx_r2 TEXT CHECK (pptx_r2 IS NULL OR (length(pptx_r2) <= 300 AND pptx_r2 GLOB 'bot-laporan/*')),
  pdf_r2 TEXT CHECK (pdf_r2 IS NULL OR (length(pdf_r2) <= 300 AND pdf_r2 GLOB 'bot-laporan/*')),
  instruksi TEXT CHECK (instruksi IS NULL OR length(instruksi) <= 4000),
  peringatan TEXT CHECK (peringatan IS NULL OR length(peringatan) <= 8000),
  dibuat INTEGER NOT NULL,
  PRIMARY KEY (proyek_id, n)
);

CREATE TABLE IF NOT EXISTS bl_pola (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 8 AND 64),
  jenis TEXT NOT NULL CHECK (length(jenis) BETWEEN 2 AND 30 AND jenis NOT GLOB '*[^a-z_]*'),
  slide_judul TEXT NOT NULL CHECK (length(slide_judul) BETWEEN 1 AND 200),
  operasi TEXT NOT NULL CHECK (length(operasi) BETWEEN 2 AND 30 AND operasi NOT GLOB '*[^a-z_]*'),
  ringkas TEXT NOT NULL CHECK (length(ringkas) BETWEEN 1 AND 120),
  hitung INTEGER NOT NULL DEFAULT 0 CHECK (hitung >= 0),
  status TEXT NOT NULL CHECK (status IN ('mengamati', 'diusulkan', 'aturan', 'ditolak')),
  diubah INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS bl_pola_jenis ON bl_pola (jenis, status);

CREATE TABLE IF NOT EXISTS bl_daftar (
  wa_sha TEXT PRIMARY KEY CHECK (length(wa_sha) = 64 AND wa_sha NOT GLOB '*[^0-9a-f]*'),
  nama TEXT CHECK (nama IS NULL OR length(nama) BETWEEN 2 AND 80),
  instansi TEXT CHECK (instansi IS NULL OR length(instansi) BETWEEN 2 AND 120),
  status TEXT NOT NULL CHECK (status IN ('menunggu', 'setuju', 'tolak')),
  dibuat INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS bl_daftar_status ON bl_daftar (status);

CREATE TABLE IF NOT EXISTS bl_biaya (
  tanggal TEXT PRIMARY KEY CHECK (length(tanggal) = 10 AND tanggal GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  usd_mikro INTEGER NOT NULL DEFAULT 0 CHECK (usd_mikro >= 0)
);

CREATE TABLE IF NOT EXISTS bl_detak (
  mesin TEXT PRIMARY KEY CHECK (length(mesin) BETWEEN 2 AND 40 AND mesin NOT GLOB '*[^a-z0-9_-]*'),
  terakhir INTEGER NOT NULL
);
