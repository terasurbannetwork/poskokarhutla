-- 0166: akun BPBD dengan profil PIC (paket data/kajian-bnpb/profil-bpbd/, tiket PF-01, DESAIN-TEKNIS 2).
-- Satu akun lembaga (instansi_akun pemprov, pemkab, pemkot) punya paling banyak 4 profil orang (PIC): berfoto, ber-PIN, dan tercatat di log.
-- Sesi kerja = sesi akun (username dan sandi) ditambah sesi profil (PIN benar). PIN hanya HMAC bergaram berkunci rahasia Worker (PROFIL_KUNCI), tidak pernah terbaca.
-- Hanya CREATE ... IF NOT EXISTS; tanpa ALTER pada tabel lama; tanpa DROP. Waktu = ms epoch UTC. Tanpa data contoh. Pemilik yang menerapkan ke D1 produksi.

CREATE TABLE IF NOT EXISTS instansi_profil (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  akun_id TEXT NOT NULL REFERENCES instansi_akun (id) ON DELETE CASCADE,
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 100),
  jabatan TEXT NOT NULL CHECK (length(jabatan) BETWEEN 2 AND 100),
  nip TEXT NOT NULL CHECK (length(nip) BETWEEN 5 AND 30),
  email TEXT NOT NULL CHECK (length(email) BETWEEN 6 AND 254 AND email LIKE '_%@_%.__%' AND email NOT GLOB '*[ <>,;"]*'),
  wa TEXT NOT NULL CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  foto INTEGER NOT NULL DEFAULT 0 CHECK (foto IN (0, 1)),
  pin_garam TEXT CHECK (pin_garam IS NULL OR length(pin_garam) = 16),
  pin_sha TEXT CHECK (pin_sha IS NULL OR (length(pin_sha) = 64 AND pin_sha NOT GLOB '*[^0-9a-f]*')),
  pin_wajib_ganti INTEGER NOT NULL DEFAULT 0 CHECK (pin_wajib_ganti IN (0, 1)),
  pin_pada INTEGER,
  status TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'menunggu', 'aktif', 'dicabut')),
  salah_hari INTEGER NOT NULL DEFAULT 0 CHECK (salah_hari >= 0),
  hari_tgl INTEGER NOT NULL DEFAULT 0,
  kunci_admin INTEGER NOT NULL DEFAULT 0 CHECK (kunci_admin IN (0, 1)),
  disetujui INTEGER,
  oleh TEXT,
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  terakhir_masuk INTEGER,
  CHECK ((pin_sha IS NULL) = (pin_garam IS NULL)),
  CHECK (status NOT IN ('menunggu', 'aktif') OR (pin_sha IS NOT NULL AND foto = 1))
);
CREATE INDEX IF NOT EXISTS instansi_profil_akun ON instansi_profil (akun_id, status);
-- pembersihan jam-an: profil dicabut lebih dari 30 hari (foto R2 dibuang) tanpa memindai tabel
CREATE INDEX IF NOT EXISTS instansi_profil_status ON instansi_profil (status, diubah);
CREATE UNIQUE INDEX IF NOT EXISTS instansi_profil_nip ON instansi_profil (akun_id, nip) WHERE status != 'dicabut';
CREATE UNIQUE INDEX IF NOT EXISTS instansi_profil_email ON instansi_profil (akun_id, email) WHERE status != 'dicabut';

-- paling banyak 4 profil bukan dicabut per akun; D1 menjalankan penulisan satu per satu, jadi dua sisipan serentak tidak lolos bersama
CREATE TRIGGER IF NOT EXISTS instansi_profil_maks BEFORE INSERT ON instansi_profil
WHEN (SELECT count(*) FROM instansi_profil WHERE akun_id = NEW.akun_id AND status != 'dicabut') >= 4
BEGIN
  SELECT RAISE(ABORT, 'satu akun paling banyak 4 profil');
END;
-- batas 4 juga berlaku bila profil dicabut dihidupkan lagi lewat UPDATE (dicabut -> draf, menunggu, aktif)
CREATE TRIGGER IF NOT EXISTS instansi_profil_maks_ubah BEFORE UPDATE OF status ON instansi_profil
WHEN OLD.status = 'dicabut' AND NEW.status != 'dicabut' AND (SELECT count(*) FROM instansi_profil WHERE akun_id = NEW.akun_id AND status != 'dicabut') >= 4
BEGIN
  SELECT RAISE(ABORT, 'satu akun paling banyak 4 profil');
END;
-- memindahkan profil ke akun lain (UPDATE akun_id) tidak boleh melewati batas 4 atau masuk ke akun non-pemda
CREATE TRIGGER IF NOT EXISTS instansi_profil_pindah BEFORE UPDATE OF akun_id ON instansi_profil
WHEN NEW.akun_id != OLD.akun_id AND ((SELECT jenis FROM instansi_akun WHERE id = NEW.akun_id) NOT IN ('pemprov', 'pemkab', 'pemkot')
  OR (NEW.status != 'dicabut' AND (SELECT count(*) FROM instansi_profil WHERE akun_id = NEW.akun_id AND status != 'dicabut') >= 4))
BEGIN
  SELECT RAISE(ABORT, 'profil tidak bisa dipindah ke akun itu');
END;
-- akun yang bukan pemda tidak punya profil (jenis dijaga di Worker; trigger menjaga D1)
CREATE TRIGGER IF NOT EXISTS instansi_profil_jenis BEFORE INSERT ON instansi_profil
WHEN (SELECT jenis FROM instansi_akun WHERE id = NEW.akun_id) NOT IN ('pemprov', 'pemkab', 'pemkot')
BEGIN
  SELECT RAISE(ABORT, 'profil hanya untuk akun pemda');
END;

CREATE TABLE IF NOT EXISTS instansi_sesi_profil (
  sesi_sha TEXT PRIMARY KEY CHECK (length(sesi_sha) = 64 AND sesi_sha NOT GLOB '*[^0-9a-f]*'),
  profil_id TEXT NOT NULL REFERENCES instansi_profil (id) ON DELETE CASCADE,
  akun_id TEXT NOT NULL REFERENCES instansi_akun (id) ON DELETE CASCADE,
  dibuat INTEGER NOT NULL,
  kedaluwarsa INTEGER NOT NULL CHECK (kedaluwarsa > dibuat)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS instansi_sesi_profil_profil ON instansi_sesi_profil (profil_id);
CREATE INDEX IF NOT EXISTS instansi_sesi_profil_akun ON instansi_sesi_profil (akun_id);
CREATE INDEX IF NOT EXISTS instansi_sesi_profil_kedaluwarsa ON instansi_sesi_profil (kedaluwarsa);

-- log tindakan per profil (K5): hanya menambah; isi badan, pesan, foto, dan PIN tidak pernah masuk. Tanpa kunci asing supaya jejak bertahan selama retensi.
CREATE TABLE IF NOT EXISTS instansi_profil_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  waktu INTEGER NOT NULL,
  akun_id TEXT NOT NULL CHECK (length(akun_id) = 16),
  profil_id TEXT CHECK (profil_id IS NULL OR length(profil_id) = 16),
  jenis TEXT NOT NULL CHECK (jenis IN ('masuk', 'pin_ok', 'pin_salah', 'terkunci', 'terkunci_admin', 'ganti_profil', 'keluar',
    'profil_buat', 'profil_ubah', 'foto', 'pin_atur', 'pin_ganti', 'kirim', 'setuju', 'tolak', 'cabut', 'reset_pin', 'buka_kunci', 'kerja', 'meja')),
  rute TEXT CHECK (rute IS NULL OR length(rute) <= 100),
  objek TEXT CHECK (objek IS NULL OR length(objek) <= 40),
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) BETWEEN 3 AND 40),
  ip TEXT CHECK (ip IS NULL OR length(ip) = 12)
);
CREATE INDEX IF NOT EXISTS instansi_profil_log_akun ON instansi_profil_log (akun_id, waktu);
CREATE INDEX IF NOT EXISTS instansi_profil_log_profil ON instansi_profil_log (profil_id, waktu);
CREATE INDEX IF NOT EXISTS instansi_profil_log_waktu ON instansi_profil_log (waktu);
CREATE TRIGGER IF NOT EXISTS instansi_profil_log_tetap_ubah BEFORE UPDATE ON instansi_profil_log
BEGIN
  SELECT RAISE(ABORT, 'log profil hanya bisa ditambah');
END;
-- hapus hanya baris yang umurnya lebih dari 730 hari (Q7)
CREATE TRIGGER IF NOT EXISTS instansi_profil_log_tetap_hapus BEFORE DELETE ON instansi_profil_log
WHEN OLD.waktu > (CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 63072000000)
BEGIN
  SELECT RAISE(ABORT, 'log profil disimpan 2 tahun');
END;
