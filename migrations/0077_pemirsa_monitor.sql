-- Tab "monitor" untuk akun pemirsa (src/pemirsa.js): pemirsa Dir. Dalops membaca halaman /monitor (karhutla dan banjir). Idempoten.
-- Trigger 0036 dibuang lalu dibuat ulang dengan 'monitor' di daftar sah; 0036 tidak disunting. CHECK json_array_length <= 7 di tabel tetap (cekTab membatasi 7 tab).
-- Daftar HARUS sama dengan TAB di src/pemirsa.js (dijaga tests/warga/pemirsa.test.mjs).
DROP TRIGGER IF EXISTS pemirsa_tab_sah;
DROP TRIGGER IF EXISTS pemirsa_tab_ubah;
CREATE TRIGGER pemirsa_tab_sah BEFORE INSERT ON pemirsa
WHEN EXISTS (SELECT 1 FROM json_each(NEW.tab) WHERE value NOT IN ('peta', 'insight', 'berita', 'tren', 'dampak', 'sim', 'monitor', 'foto'))
  OR json_array_length(NEW.tab) != (SELECT count(DISTINCT value) FROM json_each(NEW.tab))
BEGIN
  SELECT RAISE(ABORT, 'tab pemirsa tidak sah atau berulang');
END;
CREATE TRIGGER pemirsa_tab_ubah BEFORE UPDATE OF tab ON pemirsa
WHEN EXISTS (SELECT 1 FROM json_each(NEW.tab) WHERE value NOT IN ('peta', 'insight', 'berita', 'tren', 'dampak', 'sim', 'monitor', 'foto'))
  OR json_array_length(NEW.tab) != (SELECT count(DISTINCT value) FROM json_each(NEW.tab))
BEGIN
  SELECT RAISE(ABORT, 'tab pemirsa tidak sah atau berulang');
END;
