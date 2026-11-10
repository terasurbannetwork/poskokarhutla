-- Peran 'irtama' (Inspektorat Utama): pemegang identitas pelapor pengaduan Juklak 5/2025, keputusan pemilik 10 Nov 2026. Idempoten, migrasi lama tidak disunting.
-- Daftar HARUS sama dengan PERAN di src/staf.js dan public/admin/pantau.js (dijaga tests/warga/pantau.test.mjs).
DROP TRIGGER IF EXISTS staf_larik_sah;
DROP TRIGGER IF EXISTS staf_larik_ubah;
CREATE TRIGGER staf_larik_sah BEFORE INSERT ON staf
WHEN EXISTS (SELECT 1 FROM json_each(NEW.peran) WHERE value NOT IN ('verifikator', 'pusdalops', 'analis_konsesi', 'udara', 'tmc', 'koordalops', 'pimpinan', 'kemitraan', 'operator_cc', 'direktori', 'irtama'))
  OR json_array_length(NEW.peran) != (SELECT count(DISTINCT value) FROM json_each(NEW.peran))
  OR EXISTS (SELECT 1 FROM json_each(NEW.wilayah) WHERE typeof(value) != 'text' OR length(value) != 2 OR value GLOB '*[^0-9]*')
  OR json_array_length(NEW.wilayah) != (SELECT count(DISTINCT value) FROM json_each(NEW.wilayah))
BEGIN
  SELECT RAISE(ABORT, 'peran atau wilayah staf tidak sah atau berulang');
END;
CREATE TRIGGER staf_larik_ubah BEFORE UPDATE OF peran, wilayah ON staf
WHEN EXISTS (SELECT 1 FROM json_each(NEW.peran) WHERE value NOT IN ('verifikator', 'pusdalops', 'analis_konsesi', 'udara', 'tmc', 'koordalops', 'pimpinan', 'kemitraan', 'operator_cc', 'direktori', 'irtama'))
  OR json_array_length(NEW.peran) != (SELECT count(DISTINCT value) FROM json_each(NEW.peran))
  OR EXISTS (SELECT 1 FROM json_each(NEW.wilayah) WHERE typeof(value) != 'text' OR length(value) != 2 OR value GLOB '*[^0-9]*')
  OR json_array_length(NEW.wilayah) != (SELECT count(DISTINCT value) FROM json_each(NEW.wilayah))
BEGIN
  SELECT RAISE(ABORT, 'peran atau wilayah staf tidak sah atau berulang');
END;
