-- Staf BNPB per orang dan Meja Pantau (src/staf.js, src/pantau.js). Waktu = ms epoch UTC. Idempoten (IF NOT EXISTS). Tabel baru; tidak menyentuh 0029.
-- Mengapa tabel `staf` terpisah dari instansi_akun: instansi_akun mengunci jenis, tingkat, kunci_wilayah, dan CHECK "surat+kartu wajib saat aktif" (mengubahnya = membangun ulang
-- tabel 0029 yang dipakai tugas, isian, media). Staf BNPB tanpa klaim dokumen: dibuat Super Admin per orang, sandi acak tampil sekali, wajib diganti saat masuk pertama.
-- Daftar tetap (peran, status) HARUS sama dengan src/staf.js dan public/admin/pantau.js; tests/warga/pantau.test.mjs menjaganya.

CREATE TABLE IF NOT EXISTS staf (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  username TEXT NOT NULL UNIQUE CHECK (length(username) BETWEEN 5 AND 60 AND username NOT GLOB '*[^a-z0-9]*'),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 100),
  nip TEXT NOT NULL UNIQUE CHECK (length(nip) BETWEEN 5 AND 30),
  unit TEXT NOT NULL CHECK (length(unit) BETWEEN 2 AND 120),
  email TEXT NOT NULL CHECK (length(email) BETWEEN 6 AND 254 AND email LIKE '_%@_%.__%' AND email NOT GLOB '*[ <>,;"]*'),
  wa TEXT NOT NULL CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  -- peran: larik tak kosong dari verifikator, pusdalops, analis_konsesi, udara, tmc, koordalops, pimpinan. wilayah: larik kode provinsi BPS; kosong = nasional.
  peran TEXT NOT NULL CHECK (json_valid(peran) AND json_type(peran) = 'array' AND json_array_length(peran) BETWEEN 1 AND 7),
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

-- CHECK tidak boleh berisi subquery: isi larik dijaga trigger (peran dari daftar tetap, wilayah kode 2 digit, tanpa duplikat), untuk INSERT dan UPDATE.
CREATE TRIGGER IF NOT EXISTS staf_larik_sah BEFORE INSERT ON staf
WHEN EXISTS (SELECT 1 FROM json_each(NEW.peran) WHERE value NOT IN ('verifikator', 'pusdalops', 'analis_konsesi', 'udara', 'tmc', 'koordalops', 'pimpinan'))
  OR json_array_length(NEW.peran) != (SELECT count(DISTINCT value) FROM json_each(NEW.peran))
  OR EXISTS (SELECT 1 FROM json_each(NEW.wilayah) WHERE typeof(value) != 'text' OR length(value) != 2 OR value GLOB '*[^0-9]*')
  OR json_array_length(NEW.wilayah) != (SELECT count(DISTINCT value) FROM json_each(NEW.wilayah))
BEGIN
  SELECT RAISE(ABORT, 'peran atau wilayah staf tidak sah atau berulang');
END;
CREATE TRIGGER IF NOT EXISTS staf_larik_ubah BEFORE UPDATE OF peran, wilayah ON staf
WHEN EXISTS (SELECT 1 FROM json_each(NEW.peran) WHERE value NOT IN ('verifikator', 'pusdalops', 'analis_konsesi', 'udara', 'tmc', 'koordalops', 'pimpinan'))
  OR json_array_length(NEW.peran) != (SELECT count(DISTINCT value) FROM json_each(NEW.peran))
  OR EXISTS (SELECT 1 FROM json_each(NEW.wilayah) WHERE typeof(value) != 'text' OR length(value) != 2 OR value GLOB '*[^0-9]*')
  OR json_array_length(NEW.wilayah) != (SELECT count(DISTINCT value) FROM json_each(NEW.wilayah))
BEGIN
  SELECT RAISE(ABORT, 'peran atau wilayah staf tidak sah atau berulang');
END;

-- Sesi staf: hanya sha256 token yang disimpan; kedaluwarsa 30 hari; cabut/reset/ubah peran menghapus semua sesi staf itu.
CREATE TABLE IF NOT EXISTS staf_sesi (
  token_sha TEXT PRIMARY KEY CHECK (length(token_sha) = 64 AND token_sha NOT GLOB '*[^0-9a-f]*'),
  staf_id TEXT NOT NULL REFERENCES staf (id) ON DELETE CASCADE,
  dibuat INTEGER NOT NULL,
  kedaluwarsa INTEGER NOT NULL CHECK (kedaluwarsa > dibuat)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS staf_sesi_staf ON staf_sesi (staf_id);
-- pembersihan cron: DELETE ... WHERE kedaluwarsa <= ?
CREATE INDEX IF NOT EXISTS staf_sesi_kedaluwarsa ON staf_sesi (kedaluwarsa);

-- Penugasan butir Meja Pantau. Butir sendiri TIDAK disimpan: dihitung saat dibaca dari sumbernya (tugas api, panggilan, akun instansi, usulan kontak).
-- Baris di sini hanya menyimpan siapa memegang dan statusnya. butir_id = jenis + sumber + keadaan sumber (mis. 'api-kabar:<tugas>:<isian_terakhir>'),
-- jadi butir yang kambuh sesudah selesai berid baru. Butir yang kondisinya sudah tak berlaku hilang dari antrean sendiri; barisnya dibuang cron retensi.
CREATE TABLE IF NOT EXISTS pantau_tugas (
  butir_id TEXT PRIMARY KEY CHECK (length(butir_id) BETWEEN 5 AND 120),
  jenis TEXT NOT NULL CHECK (length(jenis) BETWEEN 3 AND 40),
  ditugaskan_ke TEXT REFERENCES staf (id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'baru' CHECK (status IN ('baru', 'dikerjakan', 'selesai', 'abaikan')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 300),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (status != 'abaikan' OR (alasan IS NOT NULL AND length(alasan) >= 3))
);
CREATE INDEX IF NOT EXISTS pantau_tugas_staf ON pantau_tugas (ditugaskan_ke, status);

-- Jejak waktu dan pelaku: hanya menambah (UPDATE ditolak; DELETE hanya baris dummy). obyek = 'butir:<id>' atau 'staf:<id>'.
CREATE TABLE IF NOT EXISTS pantau_jejak (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  waktu INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  obyek TEXT NOT NULL CHECK (length(obyek) BETWEEN 6 AND 130),
  aksi TEXT NOT NULL CHECK (length(aksi) BETWEEN 2 AND 30),
  ke TEXT CHECK (ke IS NULL OR length(ke) <= 40),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS pantau_jejak_obyek ON pantau_jejak (obyek, waktu);
CREATE TRIGGER IF NOT EXISTS pantau_jejak_tetap_ubah BEFORE UPDATE ON pantau_jejak
BEGIN
  SELECT RAISE(ABORT, 'pantau_jejak hanya bisa ditambah');
END;
CREATE TRIGGER IF NOT EXISTS pantau_jejak_tetap_hapus BEFORE DELETE ON pantau_jejak
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'pantau_jejak hanya bisa ditambah');
END;
