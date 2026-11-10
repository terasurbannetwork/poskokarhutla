-- 0120: Siklus Bencana gelombang G1 (F1 Buku Besar Kejadian). Rancangan: data/kajian-bnpb/siklus/DESAIN-TEKNIS.md bagian 3.1; keputusan KEPUTUSAN-AWAL.md.
-- Hanya CREATE ... IF NOT EXISTS; tidak menyentuh tabel lain (tanpa meja_*). Kolom dummy di semua tabel. ID kejadian 'KJ-<tahun>-<8 Crockford base32>' (16 karakter), dari hash di Worker.
-- Enum yang bisa tumbuh (jenis, nama sumber) hanya di-CHECK panjangnya; daftar sahnya dijaga Worker dan uji.
-- Komentar `--` sengaja di baris sendiri (pecah() di tests/warga/_bantu.mjs memotong di baris berakhir ';').
CREATE TABLE IF NOT EXISTS sk_kejadian (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????' AND substr(id, 9) NOT GLOB '*[^0-9A-HJKMNP-TV-Z]*'),
  jenis TEXT NOT NULL CHECK (length(jenis) BETWEEN 3 AND 24),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 3 AND 160),
  prov TEXT CHECK (prov IS NULL OR (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*')),
  kab4 TEXT CHECK (kab4 IS NULL OR (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*')),
  mulai TEXT NOT NULL CHECK (mulai GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  akhir TEXT CHECK (akhir IS NULL OR akhir GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  pusat_lat REAL CHECK (pusat_lat IS NULL OR pusat_lat BETWEEN -11.5 AND 6.5),
  pusat_lon REAL CHECK (pusat_lon IS NULL OR pusat_lon BETWEEN 94 AND 142),
  fase TEXT NOT NULL DEFAULT 'terdeteksi' CHECK (fase IN ('terdeteksi', 'terverifikasi', 'tanggap', 'transisi', 'pemulihan', 'selesai', 'dibatalkan', 'digabung')),
  fase_diubah INTEGER NOT NULL,
  ke TEXT CHECK (ke IS NULL OR (length(ke) = 16 AND ke GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????' AND substr(ke, 9) NOT GLOB '*[^0-9A-HJKMNP-TV-Z]*')),
  tanggap_mulai TEXT CHECK (tanggap_mulai IS NULL OR tanggap_mulai GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  tanggap_akhir TEXT CHECK (tanggap_akhir IS NULL OR tanggap_akhir GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  nomor_induk TEXT CHECK (nomor_induk IS NULL OR length(nomor_induk) BETWEEN 1 AND 40),
  asal TEXT NOT NULL CHECK (asal IN ('otomatis', 'manual', 'promosi')),
  arsip_tahun INTEGER CHECK (arsip_tahun IS NULL OR arsip_tahun BETWEEN 2011 AND 2100),
  publik INTEGER NOT NULL DEFAULT 0 CHECK (publik IN (0, 1)),
  ringkasan_publik TEXT CHECK (ringkasan_publik IS NULL OR length(ringkasan_publik) <= 600),
  yakin TEXT NOT NULL DEFAULT 'terverifikasi' CHECK (yakin IN ('resmi', 'terverifikasi', 'estimasi-model', 'asumsi-kebijakan', 'hipotesis', 'menunggu')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK ((fase = 'digabung') = (ke IS NOT NULL)),
  CHECK (publik = 0 OR (ringkasan_publik IS NOT NULL AND fase NOT IN ('terdeteksi', 'dibatalkan', 'digabung')))
);
CREATE INDEX IF NOT EXISTS sk_kej_kab ON sk_kejadian (kab4, mulai DESC);
CREATE INDEX IF NOT EXISTS sk_kej_mulai ON sk_kejadian (mulai DESC, id DESC);
CREATE INDEX IF NOT EXISTS sk_kej_fase ON sk_kejadian (fase, fase_diubah) WHERE fase NOT IN ('selesai', 'dibatalkan', 'digabung');
CREATE INDEX IF NOT EXISTS sk_kej_dummy ON sk_kejadian (id) WHERE dummy = 1;

CREATE TABLE IF NOT EXISTS sk_kejadian_kab (
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian(id) CHECK (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????' AND substr(kejadian_id, 9) NOT GLOB '*[^0-9A-HJKMNP-TV-Z]*'),
  kab4 TEXT NOT NULL CHECK (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*'),
  mulai TEXT NOT NULL CHECK (mulai GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  PRIMARY KEY (kejadian_id, kab4)
);
CREATE INDEX IF NOT EXISTS sk_kejkab_kab ON sk_kejadian_kab (kab4, mulai DESC, kejadian_id);

CREATE TABLE IF NOT EXISTS sk_kejadian_alias (
  alias_id TEXT PRIMARY KEY CHECK (length(alias_id) = 16 AND alias_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????' AND substr(alias_id, 9) NOT GLOB '*[^0-9A-HJKMNP-TV-Z]*'),
  ke_id TEXT NOT NULL REFERENCES sk_kejadian(id) CHECK (length(ke_id) = 16 AND ke_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????' AND substr(ke_id, 9) NOT GLOB '*[^0-9A-HJKMNP-TV-Z]*'),
  alasan TEXT NOT NULL CHECK (length(alasan) BETWEEN 3 AND 200),
  dibuat INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS sk_alias_ke ON sk_kejadian_alias (ke_id);

CREATE TABLE IF NOT EXISTS sk_kejadian_sumber (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  sumber TEXT NOT NULL CHECK (length(sumber) BETWEEN 2 AND 24),
  kode TEXT NOT NULL CHECK (length(kode) BETWEEN 1 AND 120),
  kode_hari TEXT CHECK (kode_hari IS NULL OR length(kode_hari) BETWEEN 1 AND 16),
  pengenal_luar TEXT CHECK (pengenal_luar IS NULL OR length(pengenal_luar) BETWEEN 1 AND 120),
  kejadian_id TEXT REFERENCES sk_kejadian(id) CHECK (kejadian_id IS NULL OR (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????' AND substr(kejadian_id, 9) NOT GLOB '*[^0-9A-HJKMNP-TV-Z]*')),
  asal_id TEXT CHECK (asal_id IS NULL OR (length(asal_id) = 16 AND asal_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????' AND substr(asal_id, 9) NOT GLOB '*[^0-9A-HJKMNP-TV-Z]*')),
  status TEXT NOT NULL CHECK (status IN ('terpasang', 'ambigu', 'tanpa_wilayah', 'ditolak')),
  jenis TEXT NOT NULL CHECK (length(jenis) BETWEEN 3 AND 24),
  kab4 TEXT CHECK (kab4 IS NULL OR (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*')),
  mulai TEXT NOT NULL CHECK (mulai GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  kandidat TEXT CHECK (kandidat IS NULL OR (json_valid(kandidat) AND length(kandidat) <= 600)),
  dampak TEXT CHECK (dampak IS NULL OR (json_valid(dampak) AND length(dampak) <= 2000)),
  diambil INTEGER NOT NULL,
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (sumber, kode, dummy),
  CHECK ((status = 'terpasang') = (kejadian_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS sk_ks_kej ON sk_kejadian_sumber (kejadian_id);
CREATE INDEX IF NOT EXISTS sk_ks_mulai ON sk_kejadian_sumber (mulai, id);
CREATE INDEX IF NOT EXISTS sk_ks_antre ON sk_kejadian_sumber (status, mulai, id) WHERE status IN ('ambigu', 'tanpa_wilayah');

CREATE TABLE IF NOT EXISTS sk_jejak (
  id INTEGER PRIMARY KEY,
  waktu INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  obyek TEXT NOT NULL CHECK (length(obyek) BETWEEN 2 AND 24),
  obyek_id TEXT NOT NULL CHECK (length(obyek_id) BETWEEN 1 AND 40),
  aksi TEXT NOT NULL CHECK (length(aksi) BETWEEN 2 AND 24),
  dari TEXT CHECK (dari IS NULL OR length(dari) BETWEEN 1 AND 40),
  ke TEXT CHECK (ke IS NULL OR length(ke) BETWEEN 1 AND 40),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 200),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS sk_jejak_obyek ON sk_jejak (obyek, obyek_id, waktu DESC);
CREATE INDEX IF NOT EXISTS sk_jejak_dummy ON sk_jejak (id) WHERE dummy = 1;

-- Fase hanya maju atau mundur satu langkah (ALUR 2.1); dibatalkan hanya dari terdeteksi; digabung dari fase hidup mana pun; dibatalkan dan digabung tidak pernah keluar.
CREATE TRIGGER IF NOT EXISTS sk_kejadian_fase BEFORE UPDATE OF fase ON sk_kejadian
WHEN NEW.fase != OLD.fase AND NOT (
  (OLD.fase = 'terdeteksi' AND NEW.fase IN ('terverifikasi', 'dibatalkan', 'digabung'))
  OR (OLD.fase = 'terverifikasi' AND NEW.fase IN ('terdeteksi', 'tanggap', 'digabung'))
  OR (OLD.fase = 'tanggap' AND NEW.fase IN ('terverifikasi', 'transisi', 'digabung'))
  OR (OLD.fase = 'transisi' AND NEW.fase IN ('tanggap', 'pemulihan', 'digabung'))
  OR (OLD.fase = 'pemulihan' AND NEW.fase IN ('transisi', 'selesai', 'digabung'))
  OR (OLD.fase = 'selesai' AND NEW.fase IN ('pemulihan', 'digabung')))
BEGIN
  SELECT RAISE(ABORT, 'sk_fase: pasangan fase tidak sah');
END;

-- publik = 1 ditolak untuk kejadian dibatalkan atau digabung (CHECK tabel menolak terdeteksi juga; trigger memberi pesan jelas).
CREATE TRIGGER IF NOT EXISTS sk_kejadian_publik BEFORE UPDATE OF publik, fase ON sk_kejadian
WHEN NEW.publik = 1 AND NEW.fase IN ('dibatalkan', 'digabung')
BEGIN
  SELECT RAISE(ABORT, 'sk_publik: kejadian dibatalkan atau digabung tidak boleh publik');
END;

CREATE TRIGGER IF NOT EXISTS sk_kejadian_publik_baru BEFORE INSERT ON sk_kejadian
WHEN NEW.publik = 1 AND NEW.fase IN ('dibatalkan', 'digabung')
BEGIN
  SELECT RAISE(ABORT, 'sk_publik: kejadian dibatalkan atau digabung tidak boleh publik');
END;
