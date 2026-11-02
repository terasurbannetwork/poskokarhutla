-- Pegawai dan Relawan Lapangan, tahap A (data/kajian-bnpb/lapangan/DESAIN-TEKNIS.md §3): induk orang, persetujuan wajah, vektor wajah, antrean WA. Idempoten (CREATE IF NOT EXISTS).
-- Enum di CHECK HARUS sama dengan src/lapangan_konst.js (dijaga tests/warga/lapangan_skema.test.mjs). Waktu = ms epoch UTC. Kode pribadi: hanya sha256 (26 hex asli tidak disimpan).
-- staf_id dan relawan_id sengaja tanpa FK (rujukan lunak, modul asal tidak boleh terkunci oleh modul ini); satu orang per staf/relawan dijaga indeks unik bersyarat.
-- Vektor wajah hanya hidup di orang_wajah; tidak pernah keluar dari Worker (KEAMANAN-PRIVASI §2.2).
CREATE TABLE IF NOT EXISTS orang (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  jenis TEXT NOT NULL CHECK (jenis IN ('pegawai', 'relawan')),
  staf_id TEXT CHECK (staf_id IS NULL OR length(staf_id) = 16),
  relawan_id TEXT CHECK (relawan_id IS NULL OR length(relawan_id) = 16),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 120),
  nip TEXT UNIQUE CHECK (nip IS NULL OR (length(nip) = 18 AND nip NOT GLOB '*[^0-9]*')),
  unit TEXT CHECK (unit IS NULL OR length(unit) <= 120),
  jabatan TEXT CHECK (jabatan IS NULL OR length(jabatan) <= 120),
  wa TEXT CHECK (wa IS NULL OR (length(wa) BETWEEN 10 AND 15 AND wa NOT GLOB '*[^0-9]*')),
  email TEXT CHECK (email IS NULL OR (length(email) BETWEEN 5 AND 254 AND email LIKE '%_@_%.__%')),
  prov TEXT CHECK (prov IS NULL OR (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*')),
  kab TEXT CHECK (kab IS NULL OR length(kab) <= 60),
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  kode_sha TEXT UNIQUE CHECK (kode_sha IS NULL OR length(kode_sha) = 64),
  wajah_status TEXT NOT NULL DEFAULT 'belum' CHECK (wajah_status IN ('belum', 'terdaftar', 'dihapus')),
  wajah_versi TEXT CHECK (wajah_versi IS NULL OR length(wajah_versi) BETWEEN 1 AND 80),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE UNIQUE INDEX IF NOT EXISTS orang_staf_u ON orang (staf_id) WHERE staf_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orang_relawan_u ON orang (relawan_id) WHERE relawan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orang_jenis_nama ON orang (jenis, nama);

CREATE TABLE IF NOT EXISTS orang_setuju (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  orang_id TEXT NOT NULL REFERENCES orang (id) ON DELETE CASCADE,
  versi_teks TEXT NOT NULL CHECK (length(versi_teks) BETWEEN 1 AND 20),
  setuju INTEGER NOT NULL CHECK (setuju IN (0, 1)),
  waktu INTEGER NOT NULL,
  ip_hash TEXT CHECK (ip_hash IS NULL OR length(ip_hash) = 64)
);
CREATE INDEX IF NOT EXISTS orang_setuju_orang ON orang_setuju (orang_id, waktu);

CREATE TABLE IF NOT EXISTS orang_wajah (
  orang_id TEXT NOT NULL REFERENCES orang (id) ON DELETE CASCADE,
  arah TEXT NOT NULL CHECK (arah IN ('depan', 'kiri', 'kanan', 'atas', 'bawah')),
  vektor TEXT NOT NULL CHECK (length(vektor) BETWEEN 8 AND 12000),
  versi TEXT NOT NULL CHECK (length(versi) BETWEEN 1 AND 80),
  mutu REAL CHECK (mutu IS NULL OR (mutu >= 0 AND mutu <= 1)),
  dibuat INTEGER NOT NULL,
  PRIMARY KEY (orang_id, arah)
);

CREATE TABLE IF NOT EXISTS wa_antre (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  tujuan TEXT NOT NULL CHECK (length(tujuan) BETWEEN 10 AND 15 AND tujuan NOT GLOB '*[^0-9]*'),
  pesan TEXT NOT NULL CHECK (length(pesan) BETWEEN 1 AND 1500),
  jenis TEXT NOT NULL CHECK (length(jenis) BETWEEN 1 AND 20),
  rujukan TEXT CHECK (rujukan IS NULL OR length(rujukan) <= 40),
  status TEXT NOT NULL DEFAULT 'antre' CHECK (status IN ('antre', 'dikirim', 'gagal')),
  percobaan INTEGER NOT NULL DEFAULT 0 CHECK (percobaan >= 0),
  dibuat INTEGER NOT NULL,
  dikirim INTEGER,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS wa_antre_status ON wa_antre (status, dibuat);
