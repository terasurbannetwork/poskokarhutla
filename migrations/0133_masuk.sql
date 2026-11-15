-- 0133: Pintu Masuk satu nomor WA (paket data/kajian-bnpb/pintu-masuk/, tiket PM-02; DESAIN-TEKNIS.md §2).
-- Identitas masuk satu nomor + kode sekali pakai: mk_akun, mk_sesi, mk_kode, mk_anggota, mk_undang, mk_domain, mk_masuk_log, mk_denyut, mk_pemirsa_wa,
-- alun_penulis (tabel samping alun-alun; ALTER ADD COLUMN tidak idempoten), serta indeks pada kolom wa tabel akun lama (pencarian per nomor).
-- Hanya CREATE ... IF NOT EXISTS; tidak mengubah tabel lama. relawan sudah punya relawan_wa_aktif (0023), tidak ditambah.
-- Tanpa data contoh. Pemilik yang menerapkan ke D1 produksi (wrangler d1 migrations apply).

CREATE TABLE IF NOT EXISTS mk_akun (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  wa TEXT NOT NULL UNIQUE CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  nama TEXT CHECK (nama IS NULL OR length(nama) BETWEEN 2 AND 80),
  prov TEXT CHECK (prov IS NULL OR (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*')),
  kab TEXT CHECK (kab IS NULL OR length(kab) BETWEEN 2 AND 60),
  setuju_pdp INTEGER,
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'diblokir')),
  dibuat INTEGER NOT NULL,
  terakhir_masuk INTEGER
);

CREATE TABLE IF NOT EXISTS mk_sesi (
  token_sha TEXT PRIMARY KEY CHECK (length(token_sha) = 64),
  mk_id TEXT NOT NULL REFERENCES mk_akun (id) ON DELETE CASCADE,
  kode_pada INTEGER NOT NULL,
  dibuat INTEGER NOT NULL,
  habis INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS mk_sesi_akun ON mk_sesi (mk_id);

CREATE TABLE IF NOT EXISTS mk_kode (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nomor_sha TEXT NOT NULL CHECK (length(nomor_sha) = 64),
  kode_sha TEXT NOT NULL CHECK (length(kode_sha) = 64),
  saluran TEXT NOT NULL CHECK (saluran IN ('wa', 'email')),
  coba INTEGER NOT NULL DEFAULT 0 CHECK (coba >= 0),
  dibuat INTEGER NOT NULL,
  habis INTEGER NOT NULL,
  dipakai INTEGER
);
CREATE INDEX IF NOT EXISTS mk_kode_nomor ON mk_kode (nomor_sha, dibuat);

CREATE TABLE IF NOT EXISTS mk_anggota (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  mk_id TEXT NOT NULL REFERENCES mk_akun (id) ON DELETE CASCADE,
  tabel TEXT NOT NULL CHECK (tabel IN ('instansi_akun')),
  akun_id TEXT NOT NULL CHECK (length(akun_id) = 16),
  status TEXT NOT NULL CHECK (status IN ('aktif', 'menunggu', 'dicabut')),
  jalur TEXT NOT NULL CHECK (jalur IN ('undang', 'kontak', 'email', 'tinjau')),
  rujukan TEXT NOT NULL,
  oleh TEXT,
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  UNIQUE (mk_id, tabel, akun_id)
);
CREATE INDEX IF NOT EXISTS mk_anggota_akun ON mk_anggota (tabel, akun_id, status);

CREATE TABLE IF NOT EXISTS mk_undang (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  wa TEXT NOT NULL CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  nama TEXT CHECK (nama IS NULL OR length(nama) BETWEEN 2 AND 80),
  tabel TEXT NOT NULL CHECK (tabel IN ('instansi_akun', 'pdt_akun')),
  akun_id TEXT CHECK (akun_id IS NULL OR length(akun_id) = 16),
  oleh_tabel TEXT NOT NULL, oleh_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'terkirim' CHECK (status IN ('terkirim', 'diterima', 'dicabut')),
  dibuat INTEGER NOT NULL,
  habis INTEGER NOT NULL,
  CHECK ((tabel = 'instansi_akun') = (akun_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS mk_undang_wa ON mk_undang (wa, status);
CREATE INDEX IF NOT EXISTS mk_undang_akun ON mk_undang (tabel, akun_id, status);

CREATE TABLE IF NOT EXISTS mk_domain (
  domain TEXT NOT NULL CHECK (length(domain) BETWEEN 4 AND 120),
  tabel TEXT NOT NULL CHECK (tabel IN ('instansi_akun')),
  akun_id TEXT NOT NULL CHECK (length(akun_id) = 16),
  oleh TEXT NOT NULL, dibuat INTEGER NOT NULL,
  PRIMARY KEY (domain, tabel, akun_id)
);

CREATE TABLE IF NOT EXISTS mk_masuk_log (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  mk_id TEXT NOT NULL, tabel TEXT NOT NULL, akun_id TEXT NOT NULL,
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS mk_masuk_log_akun ON mk_masuk_log (tabel, akun_id, waktu);

CREATE TABLE IF NOT EXISTS mk_pemirsa_wa (
  pemirsa_id TEXT PRIMARY KEY CHECK (length(pemirsa_id) = 16),
  wa TEXT NOT NULL UNIQUE CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  oleh TEXT NOT NULL, dibuat INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mk_denyut (
  nama TEXT PRIMARY KEY, waktu INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS alun_penulis (
  pos_id TEXT PRIMARY KEY CHECK (length(pos_id) = 16),
  mk_id TEXT NOT NULL,
  label TEXT CHECK (label IS NULL OR length(label) <= 80)
);

CREATE INDEX IF NOT EXISTS staf_wa ON staf (wa);
CREATE INDEX IF NOT EXISTS instansi_akun_wa ON instansi_akun (wa);
CREATE INDEX IF NOT EXISTS pdt_akun_wa ON pdt_akun (wa);
CREATE INDEX IF NOT EXISTS km_akun_wa ON km_akun (wa);
CREATE INDEX IF NOT EXISTS orang_wa ON orang (wa);
CREATE INDEX IF NOT EXISTS kontak_pemangku_wa ON kontak_pemangku (wa);
