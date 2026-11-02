-- Command center karhutla (keputusan pemilik 1 Nov 2026; src/command_center.js). Idempoten. Tiga bagian: peran staf 'operator_cc', tab pemirsa 'dinding', dan tiga tabel baru.
-- 0030/0085 dan 0036/0077 tidak disunting (beku): trigger daftar peran dan daftar tab dibuang lalu dibuat ulang, preseden 0085 dan 0077. CHECK json_array_length di tabel tetap.
-- Daftar peran HARUS sama dengan PERAN di src/staf.js dan public/admin/pantau.js; daftar tab HARUS sama dengan TAB di src/pemirsa.js (dijaga tests/warga/pantau.test.mjs dan pemirsa.test.mjs, yang membaca migrasi TERAKHIR yang mendefinisikannya).
DROP TRIGGER IF EXISTS staf_larik_sah;
DROP TRIGGER IF EXISTS staf_larik_ubah;
CREATE TRIGGER staf_larik_sah BEFORE INSERT ON staf
WHEN EXISTS (SELECT 1 FROM json_each(NEW.peran) WHERE value NOT IN ('verifikator', 'pusdalops', 'analis_konsesi', 'udara', 'tmc', 'koordalops', 'pimpinan', 'kemitraan', 'operator_cc'))
  OR json_array_length(NEW.peran) != (SELECT count(DISTINCT value) FROM json_each(NEW.peran))
  OR EXISTS (SELECT 1 FROM json_each(NEW.wilayah) WHERE typeof(value) != 'text' OR length(value) != 2 OR value GLOB '*[^0-9]*')
  OR json_array_length(NEW.wilayah) != (SELECT count(DISTINCT value) FROM json_each(NEW.wilayah))
BEGIN
  SELECT RAISE(ABORT, 'peran atau wilayah staf tidak sah atau berulang');
END;
CREATE TRIGGER staf_larik_ubah BEFORE UPDATE OF peran, wilayah ON staf
WHEN EXISTS (SELECT 1 FROM json_each(NEW.peran) WHERE value NOT IN ('verifikator', 'pusdalops', 'analis_konsesi', 'udara', 'tmc', 'koordalops', 'pimpinan', 'kemitraan', 'operator_cc'))
  OR json_array_length(NEW.peran) != (SELECT count(DISTINCT value) FROM json_each(NEW.peran))
  OR EXISTS (SELECT 1 FROM json_each(NEW.wilayah) WHERE typeof(value) != 'text' OR length(value) != 2 OR value GLOB '*[^0-9]*')
  OR json_array_length(NEW.wilayah) != (SELECT count(DISTINCT value) FROM json_each(NEW.wilayah))
BEGIN
  SELECT RAISE(ABORT, 'peran atau wilayah staf tidak sah atau berulang');
END;
DROP TRIGGER IF EXISTS pemirsa_tab_sah;
DROP TRIGGER IF EXISTS pemirsa_tab_ubah;
CREATE TRIGGER pemirsa_tab_sah BEFORE INSERT ON pemirsa
WHEN EXISTS (SELECT 1 FROM json_each(NEW.tab) WHERE value NOT IN ('peta', 'insight', 'berita', 'tren', 'dampak', 'sim', 'monitor', 'foto', 'dinding'))
  OR json_array_length(NEW.tab) != (SELECT count(DISTINCT value) FROM json_each(NEW.tab))
BEGIN
  SELECT RAISE(ABORT, 'tab pemirsa tidak sah atau berulang');
END;
CREATE TRIGGER pemirsa_tab_ubah BEFORE UPDATE OF tab ON pemirsa
WHEN EXISTS (SELECT 1 FROM json_each(NEW.tab) WHERE value NOT IN ('peta', 'insight', 'berita', 'tren', 'dampak', 'sim', 'monitor', 'foto', 'dinding'))
  OR json_array_length(NEW.tab) != (SELECT count(DISTINCT value) FROM json_each(NEW.tab))
BEGIN
  SELECT RAISE(ABORT, 'tab pemirsa tidak sah atau berulang');
END;

-- Status terkini tindak lanjut satu alert (tugas api level 3). Tanpa baris = 'baru'. TANPA FK ke tugas_api: tugas dibuang retensi 180 hari, log command center disimpan 2 tahun.
-- Ditulis hanya lewat compare-and-set di POST /api/cc/aksi/:id (UPDATE ... WHERE status = dari), jadi dua operator serentak tidak saling menimpa. oleh = 'staf:<id>' atau awalan token moderator.
CREATE TABLE IF NOT EXISTS cc_status (
  tugas_id TEXT PRIMARY KEY CHECK (length(tugas_id) = 16),
  status TEXT NOT NULL CHECK (status IN ('dalam_konfirmasi', 'ada_api', 'tidak_ada_api')),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  sejak INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
) WITHOUT ROWID;
-- layar dinding dan antrean membaca keputusan akhir 12 jam terakhir dan hitungan hari ini: rentang sejak, bukan pindai seluruh tabel
CREATE INDEX IF NOT EXISTS cc_status_sejak ON cc_status (sejak);

-- Log klik operator: siapa, kapan, dari status apa ke apa. Hanya menambah: UPDATE ditolak; DELETE ditolak kecuali baris dummy atau yang lebih tua dari 2 tahun (retensi cron, src/command_center.js);
-- INSERT dengan id yang sudah ada juga ditolak (INSERT OR REPLACE menimpa baris lama TANPA memicu trigger DELETE selama recursive_triggers mati, dan trigger UPDATE tidak ikut jalan).
CREATE TABLE IF NOT EXISTS cc_jejak (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  waktu INTEGER NOT NULL,
  tugas_id TEXT NOT NULL CHECK (length(tugas_id) = 16),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dari TEXT NOT NULL CHECK (dari IN ('baru', 'dalam_konfirmasi', 'ada_api', 'tidak_ada_api')),
  ke TEXT NOT NULL CHECK (ke IN ('baru', 'dalam_konfirmasi', 'ada_api', 'tidak_ada_api')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS cc_jejak_waktu ON cc_jejak (waktu);
CREATE INDEX IF NOT EXISTS cc_jejak_tugas ON cc_jejak (tugas_id, waktu);
CREATE INDEX IF NOT EXISTS cc_jejak_oleh ON cc_jejak (oleh, waktu);
CREATE TRIGGER IF NOT EXISTS cc_jejak_tetap_ubah BEFORE UPDATE ON cc_jejak
BEGIN
  SELECT RAISE(ABORT, 'cc_jejak hanya bisa ditambah');
END;
CREATE TRIGGER IF NOT EXISTS cc_jejak_tetap_tambah BEFORE INSERT ON cc_jejak
WHEN NEW.id IS NOT NULL AND EXISTS (SELECT 1 FROM cc_jejak WHERE id = NEW.id)
BEGIN
  SELECT RAISE(ABORT, 'cc_jejak hanya bisa ditambah; id sudah ada');
END;
CREATE TRIGGER IF NOT EXISTS cc_jejak_tetap_hapus BEFORE DELETE ON cc_jejak
WHEN OLD.dummy = 0 AND OLD.waktu >= CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 63072000000
BEGIN
  SELECT RAISE(ABORT, 'cc_jejak hanya bisa ditambah; baris dihapus setelah 2 tahun');
END;

-- Kehadiran operator di meja: satu baris per operator, terakhir kali mejanya menjajak. Diperbarui paling sering sekali per 5 menit (upsert bersyarat); layar dinding menampilkan yang terakhir <= 10 menit.
CREATE TABLE IF NOT EXISTS cc_hadir (
  staf_id TEXT PRIMARY KEY CHECK (length(staf_id) BETWEEN 3 AND 40),
  terakhir INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
) WITHOUT ROWID;
