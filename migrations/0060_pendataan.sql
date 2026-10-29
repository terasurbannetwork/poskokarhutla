-- Pendataan Satu Data BNPB, Fase 1 (docs/bnpb/PENDATAAN.md, src/pendataan.js). Daftar enum HARUS sama dengan public/bnpb/pendataan_spek.js (dijaga tests/warga/pendataan.test.mjs).
-- Akun responden membuat sendiri lewat /pendataan (status menunggu sampai Super Admin menyetujui). Sandi: PBKDF2-SHA256 100.000 iterasi. Waktu = ms epoch UTC. Idempoten.
CREATE TABLE IF NOT EXISTS pdt_akun (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  username TEXT NOT NULL UNIQUE CHECK (length(username) BETWEEN 5 AND 30 AND username NOT GLOB '*[^a-z0-9]*'),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 100),
  nip TEXT CHECK (nip IS NULL OR length(nip) BETWEEN 5 AND 30),
  jabatan TEXT NOT NULL CHECK (length(jabatan) BETWEEN 2 AND 120),
  unit TEXT NOT NULL CHECK (unit IN ('pusdatin', 'dalops', 'pdw1', 'pdw2', 'pdw3', 'rrp', 'rri', 'rrs', 'logistik', 'jaringan_logistik', 'lainnya')),
  unit_lain TEXT CHECK (unit_lain IS NULL OR length(unit_lain) BETWEEN 2 AND 120),
  email TEXT NOT NULL CHECK (length(email) BETWEEN 6 AND 254 AND email LIKE '_%@_%.__%' AND email NOT GLOB '*[ <>,;"]*'),
  wa TEXT NOT NULL CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  garam TEXT NOT NULL CHECK (length(garam) = 32),
  sandi_hash TEXT NOT NULL CHECK (length(sandi_hash) = 64),
  wajib_ganti INTEGER NOT NULL DEFAULT 0 CHECK (wajib_ganti IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'aktif', 'ditolak', 'dicabut')),
  dibuat INTEGER NOT NULL,
  diputus INTEGER,
  diputus_oleh TEXT,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (unit <> 'lainnya' OR unit_lain IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS pdt_akun_unit ON pdt_akun (unit, status);
CREATE UNIQUE INDEX IF NOT EXISTS pdt_akun_email ON pdt_akun (email);

CREATE TABLE IF NOT EXISTS pdt_sesi (
  token_sha TEXT PRIMARY KEY CHECK (length(token_sha) = 64),
  akun_id TEXT NOT NULL REFERENCES pdt_akun (id),
  dibuat INTEGER NOT NULL,
  kedaluwarsa INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS pdt_sesi_akun ON pdt_sesi (akun_id);

CREATE TABLE IF NOT EXISTS pdt_isian (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  akun_id TEXT NOT NULL REFERENCES pdt_akun (id),
  unit TEXT NOT NULL CHECK (unit IN ('pusdatin', 'dalops', 'pdw1', 'pdw2', 'pdw3', 'rrp', 'rri', 'rrs', 'logistik', 'jaringan_logistik', 'lainnya')),
  jenis TEXT NOT NULL CHECK (jenis IN ('data', 'aplikasi', 'umum')),
  isi TEXT NOT NULL CHECK (length(isi) <= 65536 AND json_valid(isi)),
  status TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'terkirim')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dikirim INTEGER,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (status = 'draf' OR dikirim IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS pdt_isian_akun ON pdt_isian (akun_id, jenis);
CREATE INDEX IF NOT EXISTS pdt_isian_unit ON pdt_isian (unit, status);
CREATE UNIQUE INDEX IF NOT EXISTS pdt_isian_umum ON pdt_isian (akun_id) WHERE jenis = 'umum';

CREATE TABLE IF NOT EXISTS pdt_berkas (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  isian_id TEXT NOT NULL REFERENCES pdt_isian (id),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 1 AND 160),
  mime TEXT NOT NULL CHECK (mime IN ('application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/png', 'image/jpeg')),
  ukuran INTEGER NOT NULL CHECK (ukuran BETWEEN 1 AND 10485760),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS pdt_berkas_isian ON pdt_berkas (isian_id);
