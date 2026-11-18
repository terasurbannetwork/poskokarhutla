-- 0152: CHECK tabel staf membatasi 1..7 peran per orang (0030), padahal daftar peran sudah 11 (0121). Pemilik 17 Nov 2026 tidak bisa menyimpan
-- semua peran untuk satu akun ("Kok ga bisa ya?", lalu "Naikkan batasnya"). CHECK tidak bisa diubah di SQLite, jadi tabel dibangun ulang
-- dengan pola 0119: cadangan, buang, bangun tabel BERNAMA sama, isi dari cadangan. Batas atas tidak ditulis lagi: trigger staf_larik_* sudah
-- memaksa tiap peran dari daftar tetap dan tanpa duplikat, jadi panjang larik otomatis tidak melebihi jumlah peran.
-- DROP TABLE staf menjalankan aksi FK anak walau defer_foreign_keys aktif: staf_sesi (ON DELETE CASCADE) terhapus dan pantau_tugas.ditugaskan_ke
-- (ON DELETE SET NULL) dikosongkan. Keduanya dicadangkan dulu lalu dipulihkan, jadi tidak ada staf yang terlempar keluar dan penugasan tetap.
-- Sesudahnya rujukan FK anak ("REFERENCES staf") menunjuk tabel baru karena namanya sama. 0030 tidak disunting (migrasi_beku.json).
PRAGMA defer_foreign_keys = true;
DROP TABLE IF EXISTS staf_cadang;
DROP TABLE IF EXISTS staf_sesi_cadang;
DROP TABLE IF EXISTS pantau_tugas_staf_cadang;
CREATE TABLE staf_cadang AS SELECT * FROM staf;
CREATE TABLE staf_sesi_cadang AS SELECT * FROM staf_sesi;
CREATE TABLE pantau_tugas_staf_cadang AS SELECT butir_id, ditugaskan_ke FROM pantau_tugas WHERE ditugaskan_ke IS NOT NULL;
DROP TABLE staf;

CREATE TABLE staf (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  username TEXT NOT NULL UNIQUE CHECK (length(username) BETWEEN 5 AND 60 AND username NOT GLOB '*[^a-z0-9]*'),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 100),
  nip TEXT NOT NULL UNIQUE CHECK (length(nip) BETWEEN 5 AND 30),
  unit TEXT NOT NULL CHECK (length(unit) BETWEEN 2 AND 120),
  email TEXT NOT NULL CHECK (length(email) BETWEEN 6 AND 254 AND email LIKE '_%@_%.__%' AND email NOT GLOB '*[ <>,;"]*'),
  wa TEXT NOT NULL CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  -- peran: larik tak kosong; isi dan keunikan dijaga trigger staf_larik_sah/staf_larik_ubah di bawah. wilayah: larik kode provinsi BPS; kosong = nasional.
  peran TEXT NOT NULL CHECK (json_valid(peran) AND json_type(peran) = 'array' AND json_array_length(peran) >= 1),
  wilayah TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(wilayah) AND json_type(wilayah) = 'array' AND json_array_length(wilayah) <= 40),
  garam TEXT NOT NULL CHECK (length(garam) = 32),
  sandi_sha TEXT NOT NULL CHECK (length(sandi_sha) = 64 AND sandi_sha NOT GLOB '*[^0-9a-f]*'),
  wajib_ganti INTEGER NOT NULL DEFAULT 1 CHECK (wajib_ganti IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'dicabut')),
  dibuat INTEGER NOT NULL,
  dibuat_oleh TEXT CHECK (dibuat_oleh IS NULL OR length(dibuat_oleh) BETWEEN 3 AND 40),
  diputus INTEGER,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
INSERT INTO staf (id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, status, dibuat, dibuat_oleh, diputus, dummy)
  SELECT id, username, nama, nip, unit, email, wa, peran, wilayah, garam, sandi_sha, wajib_ganti, status, dibuat, dibuat_oleh, diputus, dummy FROM staf_cadang;
INSERT INTO staf_sesi (token_sha, staf_id, dibuat, kedaluwarsa)
  SELECT token_sha, staf_id, dibuat, kedaluwarsa FROM staf_sesi_cadang WHERE token_sha NOT IN (SELECT token_sha FROM staf_sesi);
UPDATE pantau_tugas SET ditugaskan_ke = (SELECT c.ditugaskan_ke FROM pantau_tugas_staf_cadang c WHERE c.butir_id = pantau_tugas.butir_id)
  WHERE butir_id IN (SELECT butir_id FROM pantau_tugas_staf_cadang);
DROP TABLE staf_cadang;
DROP TABLE staf_sesi_cadang;
DROP TABLE pantau_tugas_staf_cadang;

-- indeks dan trigger ikut terbuang bersama tabel lama: pasang lagi (indeks 0133 dan 0151, trigger daftar 0121)
CREATE INDEX IF NOT EXISTS staf_wa ON staf (wa);
CREATE INDEX IF NOT EXISTS staf_aktif ON staf(status, dummy);
CREATE TRIGGER IF NOT EXISTS staf_larik_sah BEFORE INSERT ON staf
WHEN EXISTS (SELECT 1 FROM json_each(NEW.peran) WHERE value NOT IN ('verifikator', 'pusdalops', 'analis_konsesi', 'udara', 'tmc', 'koordalops', 'pimpinan', 'kemitraan', 'operator_cc', 'direktori', 'irtama'))
  OR json_array_length(NEW.peran) != (SELECT count(DISTINCT value) FROM json_each(NEW.peran))
  OR EXISTS (SELECT 1 FROM json_each(NEW.wilayah) WHERE typeof(value) != 'text' OR length(value) != 2 OR value GLOB '*[^0-9]*')
  OR json_array_length(NEW.wilayah) != (SELECT count(DISTINCT value) FROM json_each(NEW.wilayah))
BEGIN
  SELECT RAISE(ABORT, 'peran atau wilayah staf tidak sah atau berulang');
END;
CREATE TRIGGER IF NOT EXISTS staf_larik_ubah BEFORE UPDATE OF peran, wilayah ON staf
WHEN EXISTS (SELECT 1 FROM json_each(NEW.peran) WHERE value NOT IN ('verifikator', 'pusdalops', 'analis_konsesi', 'udara', 'tmc', 'koordalops', 'pimpinan', 'kemitraan', 'operator_cc', 'direktori', 'irtama'))
  OR json_array_length(NEW.peran) != (SELECT count(DISTINCT value) FROM json_each(NEW.peran))
  OR EXISTS (SELECT 1 FROM json_each(NEW.wilayah) WHERE typeof(value) != 'text' OR length(value) != 2 OR value GLOB '*[^0-9]*')
  OR json_array_length(NEW.wilayah) != (SELECT count(DISTINCT value) FROM json_each(NEW.wilayah))
BEGIN
  SELECT RAISE(ABORT, 'peran atau wilayah staf tidak sah atau berulang');
END;
