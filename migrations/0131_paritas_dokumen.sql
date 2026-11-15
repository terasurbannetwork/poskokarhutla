-- 0131: paritas bencana, dokumen, tindakan, indeks papan SK (PB-20). Hanya CREATE ... IF NOT EXISTS; tanpa nama orang (D8).

-- Dokumen terbit berversi beku (sitrep, renops, laporan per KIB, renkon pemetaan). Berkas di R2.
CREATE TABLE IF NOT EXISTS pb_dokumen (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  jenis TEXT NOT NULL CHECK (jenis IN ('sitrep','renops','laporan_kib','renkon_peta')),
  bencana TEXT NOT NULL CHECK (bencana IN ('karhutla','banjir','longsor','pesisir','cuaca','udara','kekeringan','gempa','gunungapi')),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  kab TEXT NOT NULL DEFAULT '' CHECK (kab = '' OR length(kab) = 4),
  kib TEXT CHECK (kib IS NULL OR (length(kib) = 16 AND kib NOT GLOB '*[^0-9]*')),   -- KIB 16 digit (0094), wajib untuk laporan_kib
  periode TEXT NOT NULL CHECK (length(periode) BETWEEN 4 AND 20),                    -- '2026-11-15', '2026-W46', '2026-11', '2026'
  versi INTEGER NOT NULL CHECK (versi BETWEEN 1 AND 99),
  status TEXT NOT NULL CHECK (status IN ('draf','beku','dibatalkan')),
  ukuran INTEGER, sha TEXT CHECK (sha IS NULL OR length(sha) = 64),
  oleh TEXT NOT NULL, dibuat INTEGER NOT NULL, dibekukan INTEGER,
  UNIQUE (jenis, bencana, prov, kab, periode, versi));
CREATE INDEX IF NOT EXISTS pb_dokumen_periode ON pb_dokumen (periode, jenis, bencana);
CREATE INDEX IF NOT EXISTS pb_dokumen_kib ON pb_dokumen (kib, jenis);

-- Pelaksanaan butir tangga tindakan (F-15): keadaan per peringatan.
CREATE TABLE IF NOT EXISTS pb_tindakan (
  peringatan TEXT NOT NULL CHECK (length(peringatan) BETWEEN 1 AND 120),    -- kunci peringatan terpadu (src/peringatan.js)
  butir INTEGER NOT NULL CHECK (butir BETWEEN 0 AND 30),
  pelaksana TEXT CHECK (pelaksana IS NULL OR pelaksana IN ('warga','pusdalops','bpbd','regu')),
  batas INTEGER,                                                              -- ms UTC
  selesai INTEGER NOT NULL DEFAULT 0 CHECK (selesai IN (0,1)),
  oleh TEXT, waktu INTEGER NOT NULL,
  PRIMARY KEY (peringatan, butir));
CREATE INDEX IF NOT EXISTS pb_tindakan_waktu ON pb_tindakan (waktu);

-- Papan status darurat (F-20) membaca logbook_sk menurut masa berlaku; indeks agar SEARCH, bukan SCAN.
CREATE INDEX IF NOT EXISTS logbook_sk_selesai ON logbook_sk (tmt_selesai, tmt_mulai);
