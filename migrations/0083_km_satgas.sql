-- Kemitraan Kampus, migrasi 4/5 (DESAIN-TEKNIS §3.4): satgas kampus, piket pakar, aktivasi + panggilan + laporan + meja, sertifikat, catatan pembelajaran. Idempoten (IF NOT EXISTS).
-- km_pl_kode sudah dibuat di 0080. km_aktivasi.permintaan_id wajib: aktivasi dibuat bersama satu relawan_permintaan (ADR-08, karena relawan_penugasan.permintaan_id NOT NULL).
-- km_satgas.status = cache hasil status_satgas (dihitung kode, bukan trigger): belum_lengkap | siap | terbatas | tidak_siap.
-- Rumpun piket = 13 nilai RUMPUN_SAH di src/akademisi.js.

CREATE TABLE IF NOT EXISTS km_satgas (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  institusi_id TEXT NOT NULL REFERENCES institusi (id),
  ketua_relawan_id TEXT REFERENCES relawan (id),
  wakil_kampus_id TEXT REFERENCES relawan (id),
  wakil_mahasiswa_id TEXT REFERENCES relawan (id),
  wakil_alumni_id TEXT REFERENCES relawan (id),
  radius_km INTEGER NOT NULL CHECK (radius_km BETWEEN 10 AND 1000),
  status TEXT NOT NULL DEFAULT 'belum_lengkap' CHECK (status IN ('belum_lengkap', 'siap', 'terbatas', 'tidak_siap')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_km_satgas ON km_satgas (institusi_id) WHERE dummy = 0;
-- Wakil mahasiswa harus berunsur mahasiswa, wakil alumni berunsur alumni (baris km_anggota).
CREATE TRIGGER IF NOT EXISTS km_satgas_unsur_i BEFORE INSERT ON km_satgas
WHEN (NEW.wakil_mahasiswa_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM km_anggota WHERE relawan_id = NEW.wakil_mahasiswa_id AND unsur = 'mahasiswa'))
  OR (NEW.wakil_alumni_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM km_anggota WHERE relawan_id = NEW.wakil_alumni_id AND unsur = 'alumni'))
BEGIN SELECT RAISE(ABORT, 'km_satgas_unsur: wakil mahasiswa harus unsur mahasiswa dan wakil alumni unsur alumni'); END;
CREATE TRIGGER IF NOT EXISTS km_satgas_unsur_u BEFORE UPDATE OF wakil_mahasiswa_id, wakil_alumni_id ON km_satgas
WHEN (NEW.wakil_mahasiswa_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM km_anggota WHERE relawan_id = NEW.wakil_mahasiswa_id AND unsur = 'mahasiswa'))
  OR (NEW.wakil_alumni_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM km_anggota WHERE relawan_id = NEW.wakil_alumni_id AND unsur = 'alumni'))
BEGIN SELECT RAISE(ABORT, 'km_satgas_unsur: wakil mahasiswa harus unsur mahasiswa dan wakil alumni unsur alumni'); END;

CREATE TABLE IF NOT EXISTS km_satgas_anggota (
  satgas_id TEXT NOT NULL REFERENCES km_satgas (id),
  relawan_id TEXT NOT NULL REFERENCES relawan (id),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  PRIMARY KEY (satgas_id, relawan_id)
);

CREATE TABLE IF NOT EXISTS km_piket (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  minggu TEXT NOT NULL CHECK (minggu GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]' AND coalesce(strftime('%w', minggu), '') = '1'),
  rumpun TEXT NOT NULL CHECK (rumpun IN ('gempa', 'tsunami', 'gunung api', 'banjir', 'longsor', 'karhutla', 'hidrometeorologi', 'iklim', 'pesisir', 'geologi', 'manajemen bencana', 'kesehatan bencana', 'penginderaan jauh')),
  akademisi_id TEXT NOT NULL CHECK (length(akademisi_id) <= 13 AND akademisi_id GLOB 'A[0-9]*' AND akademisi_id NOT GLOB 'A*[^0-9]*'),
  peran TEXT NOT NULL CHECK (peran IN ('utama', 'cadangan')),
  pl_kode_id TEXT NOT NULL REFERENCES km_pl_kode (id),
  jawab TEXT NOT NULL DEFAULT 'belum' CHECK (jawab IN ('belum', 'bersedia', 'tidak')),
  dijawab INTEGER,
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (minggu, rumpun, akademisi_id)
);

CREATE TABLE IF NOT EXISTS km_aktivasi (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 5 AND 160),
  bahaya TEXT NOT NULL CHECK (bahaya IN ('banjir', 'longsor', 'gempa', 'tsunami', 'gunungapi', 'kekeringan', 'karhutla', 'cuaca_ekstrem', 'abrasi_rob', 'udara', 'multi')),
  kab4 TEXT NOT NULL CHECK (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*'),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  radius_km INTEGER NOT NULL CHECK (radius_km BETWEEN 50 AND 500),
  kebutuhan TEXT NOT NULL CHECK (json_valid(kebutuhan) AND json_type(kebutuhan) = 'array'),
  sumber TEXT NOT NULL CHECK (sumber IN ('peringatan', 'dibi', 'manual')),
  sumber_id TEXT CHECK (sumber_id IS NULL OR length(sumber_id) BETWEEN 1 AND 60),
  status TEXT NOT NULL DEFAULT 'buka' CHECK (status IN ('buka', 'tutup')),
  dibuka INTEGER NOT NULL,
  ditutup INTEGER,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 2 AND 80),
  permintaan_id TEXT NOT NULL REFERENCES relawan_permintaan (id),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_km_aktivasi_status ON km_aktivasi (status, kab4);

CREATE TABLE IF NOT EXISTS km_panggilan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  aktivasi_id TEXT NOT NULL REFERENCES km_aktivasi (id),
  relawan_id TEXT REFERENCES relawan (id),
  akademisi_id TEXT CHECK (akademisi_id IS NULL OR (length(akademisi_id) <= 13 AND akademisi_id GLOB 'A[0-9]*' AND akademisi_id NOT GLOB 'A*[^0-9]*')),
  jenis TEXT NOT NULL CHECK (jenis IN ('anggota', 'pakar')),
  urutan REAL NOT NULL,
  dikirim INTEGER,
  jawab TEXT NOT NULL DEFAULT 'belum' CHECK (jawab IN ('belum', 'bersedia', 'tidak')),
  hari_tersedia INTEGER CHECK (hari_tersedia IS NULL OR hari_tersedia BETWEEN 1 AND 30),
  dijawab INTEGER,
  penugasan_id TEXT REFERENCES relawan_penugasan (id),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (relawan_id IS NOT NULL OR akademisi_id IS NOT NULL),
  UNIQUE (aktivasi_id, relawan_id),
  UNIQUE (aktivasi_id, akademisi_id)
);

CREATE TABLE IF NOT EXISTS km_aktivasi_laporan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  aktivasi_id TEXT NOT NULL REFERENCES km_aktivasi (id),
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  institusi_id TEXT NOT NULL REFERENCES institusi (id),
  anggota_hadir INTEGER NOT NULL CHECK (anggota_hadir >= 0),
  ringkas TEXT CHECK (ringkas IS NULL OR length(ringkas) <= 2000),
  angka TEXT CHECK (angka IS NULL OR (json_valid(angka) AND json_type(angka) = 'object')),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 2 AND 80),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (aktivasi_id, institusi_id, tanggal)
);

-- Tim kaji cepat: kode meja dicabut otomatis saat aktivasi ditutup (cron bersih menit 17).
CREATE TABLE IF NOT EXISTS km_aktivasi_meja (
  aktivasi_id TEXT NOT NULL REFERENCES km_aktivasi (id),
  meja_petugas_id TEXT NOT NULL REFERENCES meja_petugas (id),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  PRIMARY KEY (aktivasi_id, meja_petugas_id)
);

CREATE TABLE IF NOT EXISTS km_sertifikat (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  jenis TEXT NOT NULL CHECK (jenis IN ('satgas', 'magang', 'pelatihan')),
  relawan_id TEXT NOT NULL REFERENCES relawan (id),
  nama_tampil TEXT NOT NULL CHECK (length(nama_tampil) BETWEEN 2 AND 80),
  institusi_nama TEXT CHECK (institusi_nama IS NULL OR length(institusi_nama) BETWEEN 2 AND 120),
  peran TEXT NOT NULL CHECK (length(peran) BETWEEN 2 AND 60),
  jam REAL NOT NULL CHECK (jam >= 0),
  rujukan_id TEXT CHECK (rujukan_id IS NULL OR length(rujukan_id) BETWEEN 1 AND 40),
  terbit TEXT NOT NULL CHECK (terbit GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  dicabut INTEGER,
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_km_sertifikat_relawan ON km_sertifikat (relawan_id);

CREATE TABLE IF NOT EXISTS km_pelajaran (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  aktivasi_id TEXT NOT NULL UNIQUE REFERENCES km_aktivasi (id),
  kerangka TEXT CHECK (kerangka IS NULL OR (json_valid(kerangka) AND json_type(kerangka) IN ('object', 'array'))),
  analisis TEXT CHECK (analisis IS NULL OR length(analisis) <= 10000),
  penulis_akademisi_id TEXT CHECK (penulis_akademisi_id IS NULL OR (length(penulis_akademisi_id) <= 13 AND penulis_akademisi_id GLOB 'A[0-9]*' AND penulis_akademisi_id NOT GLOB 'A*[^0-9]*')),
  status TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'terbit')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
