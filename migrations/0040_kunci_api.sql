-- Kunci API mitra (src/api_v1.js): akses HANYA-BACA ke /api/v1/* untuk data yang di situs wajib login (rumah rusak, bangunan Open Buildings, laporan BNPB). Pemilik, 22 Okt 2026.
-- Waktu = ms epoch UTC. Idempoten. Kunci berbentuk pb_ + 64 hex, tampil SEKALI saat dibuat admin; yang disimpan hanya sha256-nya.
-- cakupan: larik tidak kosong, subset dari 'rumah_rusak', 'bangunan', 'laporan_bnpb' (dijaga trigger; sama dengan CAKUPAN di src/api_v1.js, dijaga tests/warga/api_v1.test.mjs).
-- Menerbitkan = Super Admin; melihat daftar dan mencabut = moderator ke atas (bukan akun gerbang AKUN_SITUS*).
-- terakhir: waktu pemakaian terakhir, diperbarui paling sering sekali per jam (bukan tiap permintaan).

CREATE TABLE IF NOT EXISTS kunci_api (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 3 AND 80),
  kunci_sha TEXT NOT NULL UNIQUE CHECK (length(kunci_sha) = 64 AND kunci_sha NOT GLOB '*[^0-9a-f]*'),
  cakupan TEXT NOT NULL CHECK (json_valid(cakupan) AND json_type(cakupan) = 'array' AND json_array_length(cakupan) BETWEEN 1 AND 3),
  dibuat INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dicabut INTEGER,
  dicabut_oleh TEXT CHECK (dicabut_oleh IS NULL OR length(dicabut_oleh) BETWEEN 3 AND 40),   -- moderator yang mencabut (12 hex awal hash token)
  terakhir INTEGER
);

CREATE TRIGGER IF NOT EXISTS kunci_api_cakupan_sah BEFORE INSERT ON kunci_api
WHEN EXISTS (SELECT 1 FROM json_each(NEW.cakupan) WHERE value NOT IN ('rumah_rusak', 'bangunan', 'laporan_bnpb'))
  OR json_array_length(NEW.cakupan) != (SELECT count(DISTINCT value) FROM json_each(NEW.cakupan))
BEGIN
  SELECT RAISE(ABORT, 'cakupan kunci api tidak sah atau berulang');
END;
CREATE TRIGGER IF NOT EXISTS kunci_api_cakupan_ubah BEFORE UPDATE OF cakupan ON kunci_api
WHEN EXISTS (SELECT 1 FROM json_each(NEW.cakupan) WHERE value NOT IN ('rumah_rusak', 'bangunan', 'laporan_bnpb'))
  OR json_array_length(NEW.cakupan) != (SELECT count(DISTINCT value) FROM json_each(NEW.cakupan))
BEGIN
  SELECT RAISE(ABORT, 'cakupan kunci api tidak sah atau berulang');
END;
