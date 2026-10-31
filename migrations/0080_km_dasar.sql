-- Kemitraan Kampus, migrasi 1/5 (DESAIN-TEKNIS §3.1): kampus, akun koordinator, sesi, anggota, perjanjian baru, kode BPBD, jejak, kode pribadi non-anggota, antrean pengingat.
-- Gaya 0023/0053/0056: id 16 hex, waktu ms UTC, tanggal YYYY-MM-DD, kab = kode IRBI 4 digit (kab4), dummy di SEMUA tabel. Idempoten: hanya CREATE ... IF NOT EXISTS.
-- Kode pribadi (BPBD, penelaah, pakar piket) hanya disimpan sebagai sha256 (kode_sha). CHECK tabel selalu sesudah semua kolom.
-- Perjanjian mou_relawan dan pks_riset TETAP di institusi_perjanjian (ADR-05); km_perjanjian hanya jenis baru.

CREATE TABLE IF NOT EXISTS km_kampus (
  institusi_id TEXT PRIMARY KEY REFERENCES institusi (id) CHECK (length(institusi_id) = 16 AND institusi_id NOT GLOB '*[^0-9a-f]*'),
  status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'aktif', 'ditolak', 'dicabut')),
  peran TEXT CHECK (peran IS NULL OR peran IN ('simpul', 'satelit', 'mitra')),
  simpul_id TEXT CHECK (simpul_id IS NULL OR (length(simpul_id) = 16 AND simpul_id NOT GLOB '*[^0-9a-f]*')),
  kota TEXT CHECK (kota IS NULL OR length(kota) BETWEEN 2 AND 60),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  web TEXT CHECK (web IS NULL OR (length(web) <= 200 AND web GLOB 'https://*')),
  nama_akademisi TEXT CHECK (nama_akademisi IS NULL OR length(nama_akademisi) <= 160),
  pusat_studi TEXT CHECK (pusat_studi IS NULL OR (json_valid(pusat_studi) AND json_type(pusat_studi) = 'array')),
  fasilitas TEXT CHECK (fasilitas IS NULL OR (json_valid(fasilitas) AND json_type(fasilitas) = 'array')),
  surat_r2 TEXT CHECK (surat_r2 IS NULL OR (length(surat_r2) <= 200 AND surat_r2 GLOB 'kemitraan/surat/*')),
  mk_dibuka INTEGER CHECK (mk_dibuka IS NULL OR mk_dibuka BETWEEN 2026 AND 2035),
  renkon_ada INTEGER CHECK (renkon_ada IS NULL OR renkon_ada BETWEEN 2026 AND 2035),
  alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 500),
  disetujui INTEGER,
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 80),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);

CREATE TABLE IF NOT EXISTS km_akun (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  institusi_id TEXT NOT NULL REFERENCES institusi (id),
  peran TEXT NOT NULL DEFAULT 'kk' CHECK (peran IN ('kk')),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 80),
  jabatan TEXT CHECK (jabatan IS NULL OR length(jabatan) BETWEEN 2 AND 100),
  email TEXT NOT NULL UNIQUE CHECK (length(email) BETWEEN 6 AND 120 AND email LIKE '%_@_%._%'),
  wa TEXT CHECK (wa IS NULL OR (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*')),
  garam TEXT CHECK (garam IS NULL OR length(garam) = 32),
  sandi_sha TEXT CHECK (sandi_sha IS NULL OR (length(sandi_sha) = 64 AND sandi_sha NOT GLOB '*[^0-9a-f]*')),
  atur_sha TEXT CHECK (atur_sha IS NULL OR (length(atur_sha) = 64 AND atur_sha NOT GLOB '*[^0-9a-f]*')),
  atur_sampai INTEGER,
  status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'aktif', 'ditolak', 'dicabut')),
  gagal INTEGER NOT NULL DEFAULT 0 CHECK (gagal >= 0),
  kunci_sampai INTEGER,
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_km_akun_institusi ON km_akun (institusi_id, status);

CREATE TABLE IF NOT EXISTS km_sesi (
  sha TEXT PRIMARY KEY CHECK (length(sha) = 64 AND sha NOT GLOB '*[^0-9a-f]*'),
  akun_id TEXT NOT NULL REFERENCES km_akun (id),
  dibuat INTEGER NOT NULL,
  sampai INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (sampai > dibuat)
);

CREATE TABLE IF NOT EXISTS km_anggota (
  relawan_id TEXT PRIMARY KEY REFERENCES relawan (id),
  unsur TEXT NOT NULL CHECK (unsur IN ('dosen', 'tendik', 'mahasiswa', 'alumni')),
  prodi TEXT CHECK (prodi IS NULL OR length(prodi) BETWEEN 2 AND 100),
  angkatan INTEGER CHECK (angkatan IS NULL OR angkatan BETWEEN 1960 AND 2035),
  instansi TEXT CHECK (instansi IS NULL OR length(instansi) BETWEEN 2 AND 120),
  kab4_kerja TEXT CHECK (kab4_kerja IS NULL OR (length(kab4_kerja) = 4 AND kab4_kerja NOT GLOB '*[^0-9]*')),
  mentor INTEGER NOT NULL DEFAULT 0 CHECK (mentor IN (0, 1)),
  akademisi_id TEXT CHECK (akademisi_id IS NULL OR (length(akademisi_id) <= 13 AND akademisi_id GLOB 'A[0-9]*' AND akademisi_id NOT GLOB 'A*[^0-9]*')),
  latih_kaji_cepat INTEGER NOT NULL DEFAULT 0 CHECK (latih_kaji_cepat IN (0, 1)),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);

CREATE TABLE IF NOT EXISTS km_perjanjian (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  institusi_id TEXT REFERENCES institusi (id),
  jenis TEXT NOT NULL CHECK (jenis IN ('mou_payung', 'mou_kampus', 'pks_pendampingan', 'pks_satgas', 'lainnya')),
  nomor TEXT NOT NULL CHECK (length(nomor) BETWEEN 3 AND 80),
  pihak TEXT NOT NULL CHECK (length(pihak) BETWEEN 3 AND 200),
  mulai TEXT NOT NULL CHECK (mulai GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  berakhir TEXT NOT NULL CHECK (berakhir GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  berkas_r2 TEXT CHECK (berkas_r2 IS NULL OR (length(berkas_r2) <= 200 AND berkas_r2 GLOB 'kemitraan/perjanjian/*.pdf')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 80),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (berakhir > mulai)
);
CREATE INDEX IF NOT EXISTS idx_km_perjanjian_institusi ON km_perjanjian (institusi_id, jenis);

CREATE TABLE IF NOT EXISTS km_bpbd_kode (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  kode_sha TEXT NOT NULL UNIQUE CHECK (length(kode_sha) = 64 AND kode_sha NOT GLOB '*[^0-9a-f]*'),
  kab4 TEXT NOT NULL CHECK (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*'),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 80),
  jabatan TEXT CHECK (jabatan IS NULL OR length(jabatan) BETWEEN 2 AND 100),
  wa TEXT CHECK (wa IS NULL OR (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*')),
  jenis TEXT NOT NULL DEFAULT 'bpbd' CHECK (jenis IN ('bpbd', 'tim_pendataan')),
  berlaku INTEGER NOT NULL,
  dicabut INTEGER,
  dibuat INTEGER NOT NULL,
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 80),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_km_bpbd_kode_kab ON km_bpbd_kode (kab4, jenis);

CREATE TABLE IF NOT EXISTS km_jejak (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tabel TEXT NOT NULL CHECK (length(tabel) BETWEEN 3 AND 40),
  baris TEXT NOT NULL CHECK (length(baris) BETWEEN 1 AND 40),
  dari TEXT CHECK (dari IS NULL OR length(dari) <= 40),
  ke TEXT CHECK (ke IS NULL OR length(ke) <= 40),
  aksi TEXT NOT NULL CHECK (length(aksi) BETWEEN 2 AND 40),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 2 AND 80),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_km_jejak ON km_jejak (tabel, baris);
CREATE TRIGGER IF NOT EXISTS km_jejak_beku_u BEFORE UPDATE ON km_jejak BEGIN SELECT RAISE(ABORT, 'km_jejak_beku: jejak tidak boleh diubah'); END;
CREATE TRIGGER IF NOT EXISTS km_jejak_beku_d BEFORE DELETE ON km_jejak WHEN OLD.dummy = 0 BEGIN SELECT RAISE(ABORT, 'km_jejak_beku: jejak tidak boleh dihapus'); END;

-- Kode pribadi non-anggota (penelaah hibah, pakar piket, pembimbing magang). Dibuat di 0080 karena km_telaah (0082), km_piket (0083), km_magang (0084) merujuknya.
CREATE TABLE IF NOT EXISTS km_pl_kode (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  kode_sha TEXT NOT NULL UNIQUE CHECK (length(kode_sha) = 64 AND kode_sha NOT GLOB '*[^0-9a-f]*'),
  jenis TEXT NOT NULL CHECK (jenis IN ('penelaah', 'pakar_piket', 'pembimbing')),
  akademisi_id TEXT CHECK (akademisi_id IS NULL OR (length(akademisi_id) <= 13 AND akademisi_id GLOB 'A[0-9]*' AND akademisi_id NOT GLOB 'A*[^0-9]*')),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 80),
  wa TEXT CHECK (wa IS NULL OR (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*')),
  berlaku INTEGER NOT NULL,
  dicabut INTEGER,
  dibuat INTEGER NOT NULL,
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 80),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);

-- Antrean pengingat modul (ADR-06): kolom sama dengan pengingat (0028), kecuali jenis (7 nilai DESAIN-TEKNIS §6.4) dan sumber_id (1-60 huruf, boleh bukan 16 hex).
-- Admin yang menekan kirim, tidak ada kiriman otomatis.
CREATE TABLE IF NOT EXISTS km_pengingat (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  jenis TEXT NOT NULL CHECK (jenis IN ('km_perjanjian', 'km_tenggat_donor', 'km_masalah_basi', 'km_telaah_lambat', 'km_piket_kosong', 'km_magang_nilai', 'km_kampus_menunggu')),
  sumber_id TEXT NOT NULL CHECK (length(sumber_id) BETWEEN 1 AND 60),
  keadaan TEXT NOT NULL CHECK (length(keadaan) BETWEEN 1 AND 60),
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 3 AND 160),
  rincian TEXT CHECK (rincian IS NULL OR length(rincian) <= 300),
  muatan TEXT CHECK (muatan IS NULL OR length(muatan) <= 600),
  prov TEXT CHECK (prov IS NULL OR (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*')),
  kab TEXT CHECK (kab IS NULL OR length(kab) BETWEEN 2 AND 60),
  status TEXT NOT NULL DEFAULT 'baru' CHECK (status IN ('baru', 'dikirim', 'selesai', 'abaikan')),
  dikirim_pada INTEGER,
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (jenis, sumber_id, keadaan)
);
CREATE INDEX IF NOT EXISTS idx_km_pengingat_status ON km_pengingat (status, jenis, dibuat);
