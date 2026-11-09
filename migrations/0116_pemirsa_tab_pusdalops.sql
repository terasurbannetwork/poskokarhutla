-- Tab pemirsa 'pusdalops' (akun pemirsa yang diberi tab ini MELIHAT semua menu Pusdalops, baca saja; src/pemirsa.js, src/staf.js pemirsaLihat). Keputusan pemilik 9 Nov 2026.
-- Trigger daftar tab dibuat ulang seperti 0100 ditambah 'pusdalops'. Idempoten (DROP IF EXISTS + CREATE). Tanpa UPDATE data. CHECK json_array_length 1..7 di tabel 0036 tetap (SQLite tidak bisa mengubah CHECK).
DROP TRIGGER IF EXISTS pemirsa_tab_sah;
DROP TRIGGER IF EXISTS pemirsa_tab_ubah;
CREATE TRIGGER pemirsa_tab_sah BEFORE INSERT ON pemirsa
WHEN EXISTS (SELECT 1 FROM json_each(NEW.tab) WHERE value NOT IN ('peta', 'insight', 'berita', 'tren', 'dampak', 'sim', 'monitor', 'foto', 'pusdalops'))
  OR json_array_length(NEW.tab) != (SELECT count(DISTINCT value) FROM json_each(NEW.tab))
BEGIN
  SELECT RAISE(ABORT, 'tab pemirsa tidak sah atau berulang');
END;
CREATE TRIGGER pemirsa_tab_ubah BEFORE UPDATE OF tab ON pemirsa
WHEN EXISTS (SELECT 1 FROM json_each(NEW.tab) WHERE value NOT IN ('peta', 'insight', 'berita', 'tren', 'dampak', 'sim', 'monitor', 'foto', 'pusdalops'))
  OR json_array_length(NEW.tab) != (SELECT count(DISTINCT value) FROM json_each(NEW.tab))
BEGIN
  SELECT RAISE(ABORT, 'tab pemirsa tidak sah atau berulang');
END;
