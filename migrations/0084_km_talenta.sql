-- Kemitraan Kampus, migrasi 5/5 (DESAIN-TEKNIS §3.5): magang + lamaran + mentor, desa binaan + catatan, dampingan, BUMN/swasta, modul. Idempoten (IF NOT EXISTS).
-- Alur lamaran magang = trigger km_magang_lamar_alur. Transisi sah:
--   diajukan>diterima, diajukan>ditolak, diajukan>cadangan, cadangan>diterima, cadangan>ditolak,
--   diterima>berjalan, berjalan>dinilai, dinilai>selesai, diajukan>mundur, diterima>mundur, berjalan>mundur.
-- desa_kode = kode Kemendagri desa NN.NN.NN.NNNN (13 huruf). Kunci kab tetap kab4 (IRBI).

CREATE TABLE IF NOT EXISTS km_magang (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  penyelenggara TEXT NOT NULL CHECK (penyelenggara IN ('bnpb', 'bpbd')),
  unit TEXT NOT NULL CHECK (length(unit) BETWEEN 2 AND 120),
  kab4 TEXT CHECK (kab4 IS NULL OR (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*')),
  kuota INTEGER NOT NULL CHECK (kuota BETWEEN 1 AND 50),
  keahlian TEXT CHECK (keahlian IS NULL OR (json_valid(keahlian) AND json_type(keahlian) = 'array')),
  mulai TEXT NOT NULL CHECK (mulai GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  selesai TEXT NOT NULL CHECK (selesai GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  pembimbing_nama TEXT CHECK (pembimbing_nama IS NULL OR length(pembimbing_nama) BETWEEN 2 AND 80),
  pembimbing_wa TEXT CHECK (pembimbing_wa IS NULL OR (length(pembimbing_wa) BETWEEN 10 AND 15 AND pembimbing_wa GLOB '62[0-9]*' AND pembimbing_wa NOT GLOB '*[^0-9]*')),
  pl_kode_id TEXT REFERENCES km_pl_kode (id),
  status TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'buka', 'tutup', 'berjalan', 'selesai')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (selesai > mulai),
  CHECK (penyelenggara <> 'bpbd' OR kab4 IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_km_magang_status ON km_magang (status, mulai);

CREATE TABLE IF NOT EXISTS km_magang_lamar (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  magang_id TEXT NOT NULL REFERENCES km_magang (id),
  relawan_id TEXT NOT NULL REFERENCES relawan (id),
  motivasi TEXT CHECK (motivasi IS NULL OR length(motivasi) <= 1000),
  cv_r2 TEXT CHECK (cv_r2 IS NULL OR (length(cv_r2) <= 200 AND cv_r2 GLOB 'kemitraan/*')),
  status TEXT NOT NULL DEFAULT 'diajukan' CHECK (status IN ('diajukan', 'diterima', 'ditolak', 'cadangan', 'berjalan', 'dinilai', 'selesai', 'mundur')),
  meja_petugas_id TEXT REFERENCES meja_petugas (id),
  nilai TEXT CHECK (nilai IS NULL OR (json_valid(nilai) AND json_type(nilai) = 'object'
    AND coalesce(json_type(nilai, '$.b1'), '') = 'integer' AND json_extract(nilai, '$.b1') BETWEEN 1 AND 5
    AND coalesce(json_type(nilai, '$.b2'), '') = 'integer' AND json_extract(nilai, '$.b2') BETWEEN 1 AND 5
    AND coalesce(json_type(nilai, '$.b3'), '') = 'integer' AND json_extract(nilai, '$.b3') BETWEEN 1 AND 5
    AND coalesce(json_type(nilai, '$.b4'), '') = 'integer' AND json_extract(nilai, '$.b4') BETWEEN 1 AND 5
    AND coalesce(json_type(nilai, '$.b5'), '') = 'integer' AND json_extract(nilai, '$.b5') BETWEEN 1 AND 5
    AND coalesce(json_type(nilai, '$.b6'), '') = 'integer' AND json_extract(nilai, '$.b6') BETWEEN 1 AND 5)),
  catatan_pembimbing TEXT CHECK (catatan_pembimbing IS NULL OR length(catatan_pembimbing) <= 2000),
  sertifikat_id TEXT REFERENCES km_sertifikat (id),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (magang_id, relawan_id)
);
CREATE TRIGGER IF NOT EXISTS km_magang_lamar_alur BEFORE UPDATE OF status ON km_magang_lamar
WHEN NEW.status <> OLD.status AND (OLD.status || '>' || NEW.status) NOT IN (
  'diajukan>diterima', 'diajukan>ditolak', 'diajukan>cadangan', 'cadangan>diterima', 'cadangan>ditolak',
  'diterima>berjalan', 'berjalan>dinilai', 'dinilai>selesai', 'diajukan>mundur', 'diterima>mundur', 'berjalan>mundur')
BEGIN SELECT RAISE(ABORT, 'km_magang_lamar_alur: transisi status tidak sah'); END;

CREATE TABLE IF NOT EXISTS km_mentor (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  mentor_relawan_id TEXT NOT NULL REFERENCES relawan (id),
  lamar_id TEXT NOT NULL REFERENCES km_magang_lamar (id),
  status TEXT NOT NULL DEFAULT 'disarankan' CHECK (status IN ('disarankan', 'dipasangkan', 'selesai')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_km_mentor_lamar ON km_mentor (lamar_id);

CREATE TABLE IF NOT EXISTS km_desa (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  institusi_id TEXT NOT NULL REFERENCES institusi (id),
  desa_kode TEXT NOT NULL CHECK (length(desa_kode) = 13 AND desa_kode GLOB '[0-9][0-9].[0-9][0-9].[0-9][0-9].[0-9][0-9][0-9][0-9]'),
  kab4 TEXT NOT NULL CHECK (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*'),
  nama_desa TEXT NOT NULL CHECK (length(nama_desa) BETWEEN 2 AND 100),
  tema TEXT CHECK (tema IS NULL OR (json_valid(tema) AND json_type(tema) = 'array')),
  mulai TEXT NOT NULL CHECK (mulai GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'pasif')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (institusi_id, desa_kode)
);
CREATE INDEX IF NOT EXISTS idx_km_desa_kab ON km_desa (kab4, status);

CREATE TABLE IF NOT EXISTS km_desa_catatan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  desa_id TEXT NOT NULL REFERENCES km_desa (id),
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  angkatan INTEGER CHECK (angkatan IS NULL OR angkatan BETWEEN 1960 AND 2035),
  kegiatan TEXT NOT NULL CHECK (length(kegiatan) BETWEEN 1 AND 2000),
  temuan TEXT CHECK (temuan IS NULL OR length(temuan) <= 2000),
  rencana TEXT CHECK (rencana IS NULL OR length(rencana) <= 1000),
  foto TEXT CHECK (foto IS NULL OR (json_valid(foto) AND json_type(foto) = 'array' AND json_array_length(foto) <= 3)),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 2 AND 80),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_km_desa_catatan_desa ON km_desa_catatan (desa_id, tanggal);

CREATE TABLE IF NOT EXISTS km_dampingan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  kab4 TEXT NOT NULL CHECK (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*'),
  institusi_id TEXT NOT NULL REFERENCES institusi (id),
  jenis TEXT NOT NULL CHECK (jenis IN ('KRB', 'RPB', 'IKD', 'renkon', 'destana')),
  mulai TEXT NOT NULL CHECK (mulai GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  tenggat TEXT NOT NULL CHECK (tenggat GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  status TEXT NOT NULL DEFAULT 'berjalan' CHECK (status IN ('berjalan', 'disusun', 'selesai', 'kedaluwarsa', 'batal')),
  dana TEXT NOT NULL CHECK (dana IN ('swakelola', 'apbd', 'hibah', 'lainnya')),
  bukti_r2 TEXT CHECK (bukti_r2 IS NULL OR (length(bukti_r2) <= 200 AND bukti_r2 GLOB 'kemitraan/*')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (tenggat >= mulai)
);
-- Satu dampingan aktif per (kab, jenis, kampus). Unik bersyarat WAJIB lewat indeks, bukan di dalam CREATE TABLE.
CREATE UNIQUE INDEX IF NOT EXISTS uq_km_dampingan ON km_dampingan (kab4, jenis, institusi_id) WHERE dummy = 0 AND status IN ('berjalan', 'disusun');

CREATE TABLE IF NOT EXISTS km_bumn (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 160),
  jenis TEXT NOT NULL CHECK (jenis IN ('bumn', 'swasta')),
  bidang_tjsl TEXT CHECK (bidang_tjsl IS NULL OR length(bidang_tjsl) <= 300),
  kab4 TEXT CHECK (kab4 IS NULL OR (json_valid(kab4) AND json_type(kab4) = 'array')),
  status TEXT NOT NULL DEFAULT 'baru' CHECK (status IN ('baru', 'dijajaki', 'sepakat', 'tidak')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 1000),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);

CREATE TABLE IF NOT EXISTS km_modul (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 3 AND 200),
  kategori TEXT NOT NULL CHECK (kategori IN ('mk', 'rps', 'latih_korps', 'kkn', 'kaji_cepat', 'lainnya')),
  versi TEXT NOT NULL CHECK (length(versi) BETWEEN 1 AND 20),
  berkas_r2 TEXT NOT NULL CHECK (length(berkas_r2) <= 200 AND berkas_r2 GLOB 'kemitraan/*'),
  mime TEXT NOT NULL CHECK (mime IN ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')),
  ukuran INTEGER NOT NULL CHECK (ukuran BETWEEN 1 AND 10485760),
  unduh INTEGER NOT NULL DEFAULT 0 CHECK (unduh >= 0),
  terbit TEXT NOT NULL CHECK (terbit GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
