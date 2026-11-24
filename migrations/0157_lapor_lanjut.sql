-- 0157: Lapor Bencana BNPB, lanjutan K59-K63 (bukti tindak lanjut D87/D88, log akses meja BPBD D95, log unduhan agregat D93, pemberitahuan BPBD D97/Q55). Tiket LA-62, LA-65, LA-66, LA-67.
-- lapor_bukti: foto penanganan petugas, terpisah dari lapor_foto (foto pelapor); berkas di R2 lapor/bukti/<id>.jpg; publik = 1 hanya bila staf menandai per foto (Q47).
-- lapor_akses: siapa membuka rincian laporan (BPBD), append-only oleh kode. lapor_unduh: siapa mengunduh agregat, untuk laporan pemakaian.
-- lapor_kabar_bpbd: antrean pesan WA ke akun lembaga pemda; tabel sendiri karena CHECK jenis di lapor_kabar tidak bisa diubah tanpa membangun ulang tabel.
-- Hanya CREATE ... IF NOT EXISTS; tanpa trigger; tanpa ALTER. Waktu = ms epoch UTC. Pemilik yang menerapkan ke D1 produksi.

CREATE TABLE IF NOT EXISTS lapor_bukti (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nomor TEXT NOT NULL,
  kunci_r2 TEXT NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 200),
  lat REAL,
  lon REAL,
  akurasi REAL,
  publik INTEGER NOT NULL DEFAULT 0 CHECK (publik IN (0, 1)),
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lapor_bukti_nomor ON lapor_bukti (nomor, waktu);

CREATE TABLE IF NOT EXISTS lapor_akses (
  id INTEGER PRIMARY KEY,
  nomor TEXT NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 200),
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lapor_akses_nomor ON lapor_akses (nomor, waktu);

CREATE TABLE IF NOT EXISTS lapor_unduh (
  id INTEGER PRIMARY KEY,
  akun TEXT NOT NULL CHECK (length(akun) BETWEEN 1 AND 200),
  berkas TEXT NOT NULL CHECK (length(berkas) <= 60),
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lapor_unduh_waktu ON lapor_unduh (waktu);

CREATE TABLE IF NOT EXISTS lapor_kabar_bpbd (
  id INTEGER PRIMARY KEY,
  wa TEXT NOT NULL CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  nomor TEXT NOT NULL,
  kab TEXT NOT NULL CHECK (length(kab) <= 120),
  teks TEXT NOT NULL CHECK (length(teks) <= 1000),
  dibuat INTEGER NOT NULL,
  terkirim INTEGER
);
CREATE INDEX IF NOT EXISTS lapor_kabar_bpbd_antre ON lapor_kabar_bpbd (terkirim, id);
CREATE INDEX IF NOT EXISTS lapor_kabar_bpbd_kab ON lapor_kabar_bpbd (kab, dibuat);
