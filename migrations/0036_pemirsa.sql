-- Akun pemirsa (src/pemirsa.js): orang yang hanya boleh MELIHAT tab tertentu situs Centurisk97 (mis. hanya Berita). Pemilik, 22 Okt 2026. Waktu = ms epoch UTC. Idempoten.
-- Cukup nama dan daftar tab; dibuat Super Admin di /admin/akun, sandi acak tampil sekali. Tab lain disembunyikan dan alamatnya dialihkan;
-- berkas data JSON tetap aset statis (sengaja, keputusan pemilik), jadi ini pembatas tampilan, bukan pengaman data.
-- Daftar tab tetap HARUS sama dengan TAB di src/pemirsa.js (dijaga tests/warga/pemirsa.test.mjs).

CREATE TABLE IF NOT EXISTS pemirsa (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  username TEXT NOT NULL UNIQUE CHECK (length(username) BETWEEN 5 AND 60 AND username NOT GLOB '*[^a-z0-9]*'),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 100),
  tab TEXT NOT NULL CHECK (json_valid(tab) AND json_type(tab) = 'array' AND json_array_length(tab) BETWEEN 1 AND 7),
  garam TEXT NOT NULL CHECK (length(garam) = 32),
  sandi_sha TEXT NOT NULL CHECK (length(sandi_sha) = 64 AND sandi_sha NOT GLOB '*[^0-9a-f]*'),
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'dicabut')),
  dibuat INTEGER NOT NULL,
  dibuat_oleh TEXT CHECK (dibuat_oleh IS NULL OR length(dibuat_oleh) BETWEEN 3 AND 40),
  diputus INTEGER
);

-- isi larik tab: dari daftar tetap, tanpa duplikat (CHECK tidak boleh berisi subquery)
CREATE TRIGGER IF NOT EXISTS pemirsa_tab_sah BEFORE INSERT ON pemirsa
WHEN EXISTS (SELECT 1 FROM json_each(NEW.tab) WHERE value NOT IN ('peta', 'insight', 'berita', 'tren', 'dampak', 'sim', 'foto'))
  OR json_array_length(NEW.tab) != (SELECT count(DISTINCT value) FROM json_each(NEW.tab))
BEGIN
  SELECT RAISE(ABORT, 'tab pemirsa tidak sah atau berulang');
END;
CREATE TRIGGER IF NOT EXISTS pemirsa_tab_ubah BEFORE UPDATE OF tab ON pemirsa
WHEN EXISTS (SELECT 1 FROM json_each(NEW.tab) WHERE value NOT IN ('peta', 'insight', 'berita', 'tren', 'dampak', 'sim', 'foto'))
  OR json_array_length(NEW.tab) != (SELECT count(DISTINCT value) FROM json_each(NEW.tab))
BEGIN
  SELECT RAISE(ABORT, 'tab pemirsa tidak sah atau berulang');
END;

-- sesi: hanya sha256 token; 30 hari; ubah tab tidak mencabut sesi (dibaca ulang tiap permintaan), cabut/reset mencabut semua sesinya
CREATE TABLE IF NOT EXISTS pemirsa_sesi (
  token_sha TEXT PRIMARY KEY CHECK (length(token_sha) = 64 AND token_sha NOT GLOB '*[^0-9a-f]*'),
  pemirsa_id TEXT NOT NULL REFERENCES pemirsa (id) ON DELETE CASCADE,
  dibuat INTEGER NOT NULL,
  kedaluwarsa INTEGER NOT NULL CHECK (kedaluwarsa > dibuat)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS pemirsa_sesi_pemirsa ON pemirsa_sesi (pemirsa_id);
CREATE INDEX IF NOT EXISTS pemirsa_sesi_kedaluwarsa ON pemirsa_sesi (kedaluwarsa);
