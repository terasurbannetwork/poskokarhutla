-- SIPPA fase 3 sisi server (keputusan pemilik 61; SP-140 Renlap Generator, SP-145 anggaran T0-T4 terkunci gerbang). Idempoten.
-- sippa_anggaran_tingkat: lima tingkat PRD 11.1 (T0 terbuka, sisanya terkunci sampai gerbangnya lulus, keputusan 50); tingkat yang sudah terbuka tidak bisa dikunci lagi.
-- sippa_anggaran_realisasi: kuitansi per tingkat, tambah-saja, hanya ke tingkat terbuka; prov NULL = nasional.
-- sippa_renlap: antrean Renlap Generator (PDF + data HP); hanya sha256 token HP disimpan.

CREATE TABLE IF NOT EXISTS sippa_anggaran_tingkat (
  tingkat TEXT PRIMARY KEY CHECK (tingkat IN ('T0', 'T1', 'T2', 'T3', 'T4')),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 3 AND 80),
  gerbang_pembuka TEXT NOT NULL CHECK (length(gerbang_pembuka) BETWEEN 2 AND 80),
  pagu_rp INTEGER CHECK (pagu_rp IS NULL OR pagu_rp > 0),
  status TEXT NOT NULL DEFAULT 'terkunci' CHECK (status IN ('terkunci', 'terbuka')),
  gerbang_bukti TEXT CHECK (gerbang_bukti IS NULL OR length(gerbang_bukti) BETWEEN 3 AND 300),
  dibuka_oleh TEXT CHECK (dibuka_oleh IS NULL OR length(dibuka_oleh) BETWEEN 3 AND 40),
  dibuka_waktu INTEGER,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (status = 'terkunci' OR (dibuka_oleh IS NOT NULL AND dibuka_waktu IS NOT NULL))
);
-- isi awal dari PRD 11.1; pagu NULL karena PRD memberi slot realisasi atau rentang, bukan satu angka
INSERT OR IGNORE INTO sippa_anggaran_tingkat (tingkat, nama, gerbang_pembuka, pagu_rp, status, gerbang_bukti, dibuka_oleh, dibuka_waktu) VALUES
  ('T0', 'Pilot Okt 2026', 'keputusan pemilik', NULL, 'terbuka', 'keputusan pemilik: pilot Oktober 2026 berjalan', 'sistem', 1792800000000),
  ('T1', 'Fase 0 2027', 'keputusan pemilik', NULL, 'terkunci', NULL, NULL, NULL),
  ('T2', 'Pilot 2027-2028', 'G0, G1, G2', NULL, 'terkunci', NULL, NULL, NULL),
  ('T3', 'Skala Kalteng 2029+', 'G4, G5', NULL, 'terkunci', NULL, NULL, NULL),
  ('T4', 'Nasional 2030+', 'G5', NULL, 'terkunci', NULL, NULL, NULL);
CREATE TRIGGER IF NOT EXISTS sippa_anggaran_tingkat_tetap BEFORE UPDATE ON sippa_anggaran_tingkat
WHEN OLD.status = 'terbuka' AND NEW.status <> 'terbuka'
BEGIN
  SELECT RAISE(ABORT, 'sippa_anggaran_tetap: tingkat yang sudah terbuka tidak bisa dikunci lagi');
END;
CREATE TRIGGER IF NOT EXISTS sippa_anggaran_tingkat_hapus BEFORE DELETE ON sippa_anggaran_tingkat
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'sippa_anggaran_tetap: tingkat anggaran tidak bisa dihapus');
END;

CREATE TABLE IF NOT EXISTS sippa_anggaran_realisasi (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  tingkat TEXT NOT NULL REFERENCES sippa_anggaran_tingkat (tingkat),
  prov TEXT CHECK (prov IS NULL OR length(prov) = 2),
  uraian TEXT NOT NULL CHECK (length(uraian) BETWEEN 3 AND 200),
  rp INTEGER NOT NULL CHECK (rp > 0),
  tanggal INTEGER NOT NULL,
  bukti TEXT CHECK (bukti IS NULL OR length(bukti) BETWEEN 1 AND 300),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_sippa_realisasi_tingkat ON sippa_anggaran_realisasi (tingkat, tanggal);
CREATE TRIGGER IF NOT EXISTS sippa_realisasi_terkunci BEFORE INSERT ON sippa_anggaran_realisasi
WHEN (SELECT status FROM sippa_anggaran_tingkat WHERE tingkat = NEW.tingkat) IS NOT 'terbuka'
BEGIN
  SELECT RAISE(ABORT, 'sippa_realisasi_terkunci: tingkat anggaran masih terkunci gerbang');
END;
CREATE TRIGGER IF NOT EXISTS sippa_realisasi_tetap BEFORE UPDATE ON sippa_anggaran_realisasi
BEGIN
  SELECT RAISE(ABORT, 'sippa_realisasi_tetap: realisasi hanya bisa ditambah');
END;
CREATE TRIGGER IF NOT EXISTS sippa_realisasi_hapus BEFORE DELETE ON sippa_anggaran_realisasi
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'sippa_realisasi_tetap: realisasi hanya bisa ditambah');
END;

CREATE TABLE IF NOT EXISTS sippa_renlap (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kompleks_ids TEXT NOT NULL CHECK (json_valid(kompleks_ids) AND json_type(kompleks_ids) = 'array' AND json_array_length(kompleks_ids) BETWEEN 1 AND 10 AND length(kompleks_ids) <= 400),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  status TEXT NOT NULL DEFAULT 'antre' CHECK (status IN ('antre', 'jalan', 'siap', 'gagal')),
  pdf_kunci TEXT CHECK (pdf_kunci IS NULL OR length(pdf_kunci) BETWEEN 5 AND 120),
  data_kunci TEXT CHECK (data_kunci IS NULL OR length(data_kunci) BETWEEN 5 AND 120),
  token_hp_sha TEXT NOT NULL CHECK (length(token_hp_sha) = 64),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  selesai INTEGER,
  galat TEXT CHECK (galat IS NULL OR length(galat) <= 300),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (status <> 'siap' OR (pdf_kunci IS NOT NULL AND data_kunci IS NOT NULL))   -- siap hanya bila kedua berkas R2 tercatat
);
CREATE INDEX IF NOT EXISTS idx_sippa_renlap_prov ON sippa_renlap (prov, waktu);
-- status akhir (siap, gagal) tidak berubah lagi; id, wilayah, dan token tidak bisa diganti
CREATE TRIGGER IF NOT EXISTS sippa_renlap_tetap BEFORE UPDATE ON sippa_renlap
WHEN OLD.status IN ('siap', 'gagal') OR (OLD.status = 'jalan' AND NEW.status = 'antre') OR NEW.id <> OLD.id OR NEW.prov <> OLD.prov OR NEW.token_hp_sha <> OLD.token_hp_sha OR NEW.kompleks_ids <> OLD.kompleks_ids
BEGIN
  SELECT RAISE(ABORT, 'sippa_renlap_tetap: renlap yang selesai atau kuncinya tidak bisa diubah');
END;
