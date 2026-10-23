-- Cakupan kunci API 'konsesi' (data perusahaan, hanya mitra berkunci) dan batas cakupan naik dari 3 ke 4. Pemilik, 23 Okt 2026.
-- Batas json_array_length di 0040 adalah CHECK kolom, tidak bisa diubah di tempat: tabel dibangun ulang, baris disalin apa adanya.
-- 'bangunan' tetap sah dan tetap ditawarkan (CAKUPAN di src/api_v1.js).
-- Idempoten: sisa tabel sementara dari jalan terpotong dibuang dulu (pencabutan di antaranya tidak hilang); salinan memakai INSERT biasa
-- supaya baris yang melanggar batas baru membuat migrasi gagal SEBELUM tabel lama dibuang, bukan hilang diam-diam.

DROP TABLE IF EXISTS kunci_api_baru;

CREATE TABLE IF NOT EXISTS kunci_api_baru (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 3 AND 80),
  kunci_sha TEXT NOT NULL UNIQUE CHECK (length(kunci_sha) = 64 AND kunci_sha NOT GLOB '*[^0-9a-f]*'),
  cakupan TEXT NOT NULL CHECK (json_valid(cakupan) AND json_type(cakupan) = 'array' AND json_array_length(cakupan) BETWEEN 1 AND 4),
  dibuat INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dicabut INTEGER,
  dicabut_oleh TEXT CHECK (dicabut_oleh IS NULL OR length(dicabut_oleh) BETWEEN 3 AND 40),
  terakhir INTEGER
);

INSERT INTO kunci_api_baru (id, nama, kunci_sha, cakupan, dibuat, oleh, dicabut, dicabut_oleh, terakhir)
  SELECT id, nama, kunci_sha, cakupan, dibuat, oleh, dicabut, dicabut_oleh, terakhir FROM kunci_api;

DROP TABLE kunci_api;
ALTER TABLE kunci_api_baru RENAME TO kunci_api;

CREATE TRIGGER IF NOT EXISTS kunci_api_cakupan_sah BEFORE INSERT ON kunci_api
WHEN EXISTS (SELECT 1 FROM json_each(NEW.cakupan) WHERE value NOT IN ('rumah_rusak', 'bangunan', 'laporan_bnpb', 'konsesi'))
  OR json_array_length(NEW.cakupan) != (SELECT count(DISTINCT value) FROM json_each(NEW.cakupan))
BEGIN
  SELECT RAISE(ABORT, 'cakupan kunci api tidak sah atau berulang');
END;
CREATE TRIGGER IF NOT EXISTS kunci_api_cakupan_ubah BEFORE UPDATE OF cakupan ON kunci_api
WHEN EXISTS (SELECT 1 FROM json_each(NEW.cakupan) WHERE value NOT IN ('rumah_rusak', 'bangunan', 'laporan_bnpb', 'konsesi'))
  OR json_array_length(NEW.cakupan) != (SELECT count(DISTINCT value) FROM json_each(NEW.cakupan))
BEGIN
  SELECT RAISE(ABORT, 'cakupan kunci api tidak sah atau berulang');
END;
