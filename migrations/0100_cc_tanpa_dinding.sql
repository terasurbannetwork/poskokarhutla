-- Layar dinding command center dibuang (keputusan pemilik 2 Nov 2026): tab pemirsa 'dinding' tidak lagi sah.
-- Dibuat ulang trigger daftar tab seperti 0099 tanpa 'dinding'. Idempoten (DROP IF EXISTS + CREATE). Akun pemirsa lama yang masih memegang 'dinding' tidak diubah (tidak ada UPDATE); hanya penyisipan/pengubahan tab baru yang menolak.
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
