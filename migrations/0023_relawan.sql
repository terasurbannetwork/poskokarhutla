-- Relawan: rekrutmen, verifikasi, penugasan, jam kerja, relawan kampus lewat MoU PTN (institusi tunggal, C7) (docs/bnpb/RENCANA-12-JAM.md R1). Idempoten.
-- Tanpa NIK dan tanpa KTP (keputusan pemilik 19 Okt 2026). Akses tanpa akun: hanya sha256 kode pribadi (26 hex) yang disimpan.
-- Enum di sini HARUS sama dengan daftar di src/relawan.js (dijaga tests/warga/relawan.test.mjs). Waktu = ms epoch UTC; tanggal = 'YYYY-MM-DD'.

-- Institusi tunggal (perguruan tinggi atau organisasi), dipakai bersama modul relawan (0023) dan riset (0025, mitra_riset.institusi_id).
-- Identitas dan PIC hanya di sini. kode_sha = kode koordinator relawan (NULL = dicabut); kode mitra riset tetap di mitra_riset. prov NULL = belum diisi.
CREATE TABLE IF NOT EXISTS institusi (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 3 AND 120),
  singkatan TEXT CHECK (singkatan IS NULL OR length(singkatan) BETWEEN 2 AND 20),
  jenis TEXT NOT NULL CHECK (jenis IN ('ptn', 'pts', 'organisasi')),
  prov TEXT CHECK (prov IS NULL OR (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*')),
  pic_nama TEXT NOT NULL CHECK (length(pic_nama) BETWEEN 2 AND 100),
  pic_jabatan TEXT CHECK (pic_jabatan IS NULL OR length(pic_jabatan) <= 80),
  pic_email TEXT CHECK (pic_email IS NULL OR length(pic_email) <= 254),
  pic_wa TEXT CHECK (pic_wa IS NULL OR (length(pic_wa) BETWEEN 8 AND 15 AND pic_wa NOT GLOB '*[^0-9]*')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  kode_sha TEXT UNIQUE CHECK (kode_sha IS NULL OR length(kode_sha) = 64),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);

-- Perjanjian per institusi: MoU relawan (berkuota) dan/atau PKS riset (tanpa kuota). Satu institusi boleh punya beberapa.
CREATE TABLE IF NOT EXISTS institusi_perjanjian (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  institusi_id TEXT NOT NULL REFERENCES institusi (id),
  jenis_perjanjian TEXT NOT NULL CHECK (jenis_perjanjian IN ('mou_relawan', 'pks_riset')),
  nomor TEXT NOT NULL CHECK (length(nomor) BETWEEN 3 AND 80),
  mulai TEXT NOT NULL CHECK (mulai GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  berakhir TEXT NOT NULL CHECK (berakhir GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]' AND berakhir >= mulai),
  kuota INTEGER CHECK (kuota IS NULL OR kuota BETWEEN 1 AND 100000),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK ((jenis_perjanjian = 'mou_relawan') = (kuota IS NOT NULL)),
  UNIQUE (institusi_id, jenis_perjanjian, nomor)
);
CREATE INDEX IF NOT EXISTS institusi_perjanjian_i ON institusi_perjanjian (institusi_id, jenis_perjanjian, berakhir);

CREATE TABLE IF NOT EXISTS relawan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kode_sha TEXT UNIQUE CHECK (kode_sha IS NULL OR length(kode_sha) = 64),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 80),
  wa TEXT CHECK (wa IS NULL OR (length(wa) BETWEEN 10 AND 15 AND wa NOT GLOB '*[^0-9]*')),
  email TEXT CHECK (email IS NULL OR (length(email) BETWEEN 5 AND 254 AND email LIKE '%_@_%.__%')),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  jalur TEXT NOT NULL CHECK (jalur IN ('umum', 'kampus', 'organisasi')),
  kampus_id TEXT REFERENCES institusi (id),
  organisasi TEXT CHECK (organisasi IS NULL OR length(organisasi) BETWEEN 2 AND 120),
  keahlian TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(keahlian) AND json_type(keahlian) = 'array' AND json_array_length(keahlian) <= 15),
  sertifikat TEXT CHECK (sertifikat IS NULL OR length(sertifikat) <= 300),
  hari_per_minggu INTEGER NOT NULL CHECK (hari_per_minggu BETWEEN 1 AND 7),
  maks_hari INTEGER NOT NULL CHECK (maks_hari BETWEEN 1 AND 365),
  luar_provinsi INTEGER NOT NULL CHECK (luar_provinsi IN (0, 1)),
  gol_darah TEXT CHECK (gol_darah IS NULL OR gol_darah IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  darurat_nama TEXT CHECK (darurat_nama IS NULL OR length(darurat_nama) BETWEEN 2 AND 80),
  darurat_wa TEXT CHECK (darurat_wa IS NULL OR (length(darurat_wa) BETWEEN 10 AND 15 AND darurat_wa NOT GLOB '*[^0-9]*')),
  status TEXT NOT NULL DEFAULT 'terdaftar' CHECK (status IN ('terdaftar', 'diverifikasi', 'siap_tugas', 'ditugaskan', 'bertugas', 'selesai', 'ditolak', 'nonaktif', 'daftar_hitam')),
  alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 300),
  setuju_pdp INTEGER NOT NULL CHECK (setuju_pdp = 1),
  anonim INTEGER NOT NULL DEFAULT 0 CHECK (anonim IN (0, 1)),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  diverifikasi INTEGER,
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  -- sha256 bergaram WA/email: dipakai menolak pendaftaran ulang daftar_hitam walau datanya sudah diminimalkan; NULL untuk yang lain setelah anonim
  wa_sha TEXT CHECK (wa_sha IS NULL OR length(wa_sha) = 64),
  email_sha TEXT CHECK (email_sha IS NULL OR length(email_sha) = 64),
  CHECK (jalur <> 'kampus' OR kampus_id IS NOT NULL OR anonim = 1),
  -- anonim=1 (hak UU PDP): D1 menjamin identitas dan kuasi-identifier kosong. Tersisa prov, jalur, stempel dibuat/diubah. Hash kontak hanya boleh ada pada daftar_hitam.
  CHECK (anonim = 0 OR (wa IS NULL AND email IS NULL AND darurat_wa IS NULL AND darurat_nama IS NULL AND kode_sha IS NULL AND organisasi IS NULL AND sertifikat IS NULL AND gol_darah IS NULL
    AND alasan IS NULL AND kampus_id IS NULL AND oleh IS NULL AND diverifikasi IS NULL AND nama = '(dihapus)' AND kab = '(dihapus)' AND keahlian = '[]'
    AND hari_per_minggu = 1 AND maks_hari = 1 AND luar_provinsi = 0 AND (status = 'daftar_hitam' OR (wa_sha IS NULL AND email_sha IS NULL))))
);
CREATE INDEX IF NOT EXISTS relawan_status ON relawan (status, prov);
CREATE INDEX IF NOT EXISTS relawan_kampus_i ON relawan (kampus_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS relawan_wa_aktif ON relawan (wa) WHERE anonim = 0 AND status NOT IN ('ditolak', 'nonaktif');
CREATE INDEX IF NOT EXISTS relawan_wa_sha ON relawan (wa_sha) WHERE wa_sha IS NOT NULL;
CREATE INDEX IF NOT EXISTS relawan_email_sha ON relawan (email_sha) WHERE email_sha IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS relawan_email_aktif ON relawan (email) WHERE anonim = 0 AND status NOT IN ('ditolak', 'nonaktif');

-- CHECK SQLite tidak boleh subquery: tiap butir keahlian dijaga trigger (daftar sama dengan KEAHLIAN di src/relawan.js).
CREATE TRIGGER IF NOT EXISTS relawan_keahlian_sah_ins BEFORE INSERT ON relawan
WHEN EXISTS (SELECT 1 FROM json_each(NEW.keahlian) WHERE value NOT IN ('medis', 'perawat', 'psikososial', 'sar', 'pemadaman', 'logistik', 'dapur_umum', 'distribusi', 'gis_data', 'komunikasi', 'bahasa_isyarat', 'teknik_bangunan', 'pendidikan_anak', 'pengemudi', 'lainnya'))
BEGIN SELECT RAISE(ABORT, 'keahlian tidak dikenal'); END;

CREATE TRIGGER IF NOT EXISTS relawan_keahlian_sah_upd BEFORE UPDATE OF keahlian ON relawan
WHEN EXISTS (SELECT 1 FROM json_each(NEW.keahlian) WHERE value NOT IN ('medis', 'perawat', 'psikososial', 'sar', 'pemadaman', 'logistik', 'dapur_umum', 'distribusi', 'gis_data', 'komunikasi', 'bahasa_isyarat', 'teknik_bangunan', 'pendidikan_anak', 'pengemudi', 'lainnya'))
BEGIN SELECT RAISE(ABORT, 'keahlian tidak dikenal'); END;

-- Permintaan kebutuhan relawan (BPBD/admin). butuh = [{"keahlian":"medis","jumlah":3}, ...] (isinya dicek di JS).
CREATE TABLE IF NOT EXISTS relawan_permintaan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 3 AND 120),
  bencana TEXT NOT NULL CHECK (length(bencana) BETWEEN 2 AND 40),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  butuh TEXT NOT NULL CHECK (json_valid(butuh) AND json_type(butuh) = 'array' AND json_array_length(butuh) BETWEEN 1 AND 15),
  mulai TEXT NOT NULL CHECK (mulai GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  selesai TEXT NOT NULL CHECK (selesai GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]' AND selesai >= mulai),
  status TEXT NOT NULL DEFAULT 'buka' CHECK (status IN ('buka', 'ditutup')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  dibuat INTEGER NOT NULL,
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);

CREATE TABLE IF NOT EXISTS relawan_penugasan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  permintaan_id TEXT NOT NULL REFERENCES relawan_permintaan (id),
  relawan_id TEXT NOT NULL REFERENCES relawan (id),
  status TEXT NOT NULL DEFAULT 'ditawarkan' CHECK (status IN ('ditawarkan', 'diterima', 'ditolak', 'bertugas', 'selesai', 'dibatalkan')),
  asuransi TEXT NOT NULL DEFAULT 'belum' CHECK (asuransi IN ('belum', 'diajukan', 'aktif', 'tidak_perlu')),
  polis TEXT CHECK (polis IS NULL OR length(polis) <= 60),
  nilai INTEGER CHECK (nilai IS NULL OR nilai BETWEEN 1 AND 5),
  nilai_catatan TEXT CHECK (nilai_catatan IS NULL OR length(nilai_catatan) <= 300),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (permintaan_id, relawan_id)
);
CREATE INDEX IF NOT EXISTS relawan_penugasan_r ON relawan_penugasan (relawan_id, status);

-- Jam kerja: lahir dari check-in/check-out. menit dihitung server saat check-out (maks 960 = 16 jam). sah: 0 menunggu, 1 sah, 2 ditolak.
CREATE TABLE IF NOT EXISTS relawan_jam (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  relawan_id TEXT NOT NULL REFERENCES relawan (id),
  penugasan_id TEXT NOT NULL REFERENCES relawan_penugasan (id),
  masuk INTEGER NOT NULL,
  keluar INTEGER CHECK (keluar IS NULL OR keluar >= masuk),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  menit INTEGER CHECK (menit IS NULL OR menit BETWEEN 0 AND 960),
  sah INTEGER NOT NULL DEFAULT 0 CHECK (sah IN (0, 1, 2)),
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  klien_masuk TEXT CHECK (klien_masuk IS NULL OR length(klien_masuk) BETWEEN 8 AND 40),   -- kunci kirim ulang check-in/out dari antrean luring
  klien_keluar TEXT CHECK (klien_keluar IS NULL OR length(klien_keluar) BETWEEN 8 AND 40),
  CHECK ((keluar IS NULL) = (menit IS NULL))
);
CREATE INDEX IF NOT EXISTS relawan_jam_r ON relawan_jam (relawan_id, masuk);
CREATE UNIQUE INDEX IF NOT EXISTS relawan_jam_klien_masuk ON relawan_jam (relawan_id, klien_masuk) WHERE klien_masuk IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS relawan_jam_klien_keluar ON relawan_jam (relawan_id, klien_keluar) WHERE klien_keluar IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS relawan_jam_terbuka ON relawan_jam (relawan_id) WHERE keluar IS NULL;

CREATE TABLE IF NOT EXISTS relawan_pelatihan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  relawan_id TEXT NOT NULL REFERENCES relawan (id),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 120),
  penyelenggara TEXT CHECK (penyelenggara IS NULL OR length(penyelenggara) <= 120),
  tgl TEXT NOT NULL CHECK (tgl GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  berlaku_sampai TEXT CHECK (berlaku_sampai IS NULL OR (berlaku_sampai GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]' AND berlaku_sampai >= tgl)),
  dibuat INTEGER NOT NULL,
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS relawan_pelatihan_r ON relawan_pelatihan (relawan_id);
