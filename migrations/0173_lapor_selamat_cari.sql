-- 0173: Kabar selamat dan orang dicari (paket data/kajian-bnpb/lapor-ai/, K91, D126-D130, tiket LA-80).
-- lapor_selamat: satu tanda aktif per nomor terbukti (sesi /masuk); tautan bertokennya lahir di tautan_token (0164, src/token.js) dan di sini hanya token_id; berlaku 7 hari, bisa dicabut.
-- lapor_cari: laporan orang belum ditemukan, hanya untuk meja BNPB dan BPBD wilayahnya; lapor_cari_riwayat: riwayat status, append-only.
-- Hanya CREATE ... IF NOT EXISTS; tanpa data contoh. Satu tanda aktif per nomor dijaga indeks unik sebagian; lapor_cari_riwayat dikunci trigger (tanpa UPDATE dan DELETE). Pemilik yang menerapkan ke D1 produksi (wrangler d1 migrations apply).

CREATE TABLE IF NOT EXISTS lapor_selamat (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nomor TEXT NOT NULL CHECK (nomor GLOB '62[0-9]*' AND length(nomor) BETWEEN 10 AND 15),
  nama_panggil TEXT NOT NULL CHECK (length(nama_panggil) BETWEEN 1 AND 40),
  status TEXT NOT NULL CHECK (status IN ('selamat', 'butuh_bantuan')),
  kab TEXT NOT NULL CHECK (length(kab) = 5),
  token_id TEXT NOT NULL CHECK (length(token_id) = 16),
  dibuat INTEGER NOT NULL,
  kedaluwarsa INTEGER NOT NULL,
  dicabut INTEGER
);
CREATE INDEX IF NOT EXISTS lapor_selamat_nomor ON lapor_selamat (nomor, dibuat);
CREATE UNIQUE INDEX IF NOT EXISTS lapor_selamat_aktif ON lapor_selamat (nomor) WHERE dicabut IS NULL;
CREATE INDEX IF NOT EXISTS lapor_selamat_dibuat ON lapor_selamat (dibuat);

CREATE TABLE IF NOT EXISTS lapor_cari (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nomor_pencari TEXT NOT NULL CHECK (nomor_pencari GLOB '62[0-9]*' AND length(nomor_pencari) BETWEEN 10 AND 15),
  nama_dicari TEXT NOT NULL CHECK (length(nama_dicari) BETWEEN 2 AND 80),
  ciri TEXT,
  lokasi_terakhir TEXT,
  waktu_terakhir TEXT,
  nomor_dicari TEXT CHECK (nomor_dicari IS NULL OR (nomor_dicari GLOB '62[0-9]*' AND length(nomor_dicari) BETWEEN 10 AND 15)),
  hubungan TEXT,
  kab TEXT NOT NULL CHECK (length(kab) = 5),
  status TEXT NOT NULL DEFAULT 'buka' CHECK (status IN ('buka', 'ditemukan_selamat', 'ditemukan_meninggal', 'ke_sar', 'tutup')),
  dibuat INTEGER NOT NULL,
  ditutup_oleh TEXT,
  ditutup INTEGER
);
CREATE INDEX IF NOT EXISTS lapor_cari_dibuat ON lapor_cari (dibuat);
CREATE INDEX IF NOT EXISTS lapor_cari_dicari ON lapor_cari (nomor_dicari);

CREATE TABLE IF NOT EXISTS lapor_cari_riwayat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cari_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('buka', 'ditemukan_selamat', 'ditemukan_meninggal', 'ke_sar', 'tutup')),
  catatan TEXT,
  oleh TEXT NOT NULL,
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lapor_cari_riwayat_cari ON lapor_cari_riwayat (cari_id, waktu);

CREATE TRIGGER IF NOT EXISTS lapor_cari_riwayat_tanpa_ubah BEFORE UPDATE ON lapor_cari_riwayat
BEGIN
  SELECT RAISE(ABORT, 'lapor_cari_riwayat append-only');
END;
CREATE TRIGGER IF NOT EXISTS lapor_cari_riwayat_tanpa_hapus BEFORE DELETE ON lapor_cari_riwayat
BEGIN
  SELECT RAISE(ABORT, 'lapor_cari_riwayat append-only');
END;
