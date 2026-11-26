-- 0178: komentar warga di kartu kejadian Alun-alun Pantau Bencana (paket data/kajian-bnpb/lapor-ai/, K94-K95, D135-D140, tiket LA-85).
-- lp_komen: satu baris per komentar. kartu = id kartu Alun-alun (10 heks, sha256 id laporan jangkar gugus), sesi = id laporan jangkar itu (untuk meja, LA-88).
--   wa = nomor penulis, hanya untuk meja dan batas laju; tidak pernah keluar ke jawaban publik. status: tampil, dilaporkan (aduan >= 3 pengadu berbeda, menunggu meja), tersembunyi (keputusan meja).
-- lp_komen_aduan: satu aduan per pengadu per komentar (PK menolak aduan ganda). pengadu = sha256 nomor (sesi /masuk, mesin WA) atau sidik alamat IP (nomor ketikan), tanpa nomor mentah.
-- lp_komen_usul: angka dampak yang dibaca mesin dari komentar (LA-86), berkutipan; usulan tidak mengubah kartu sampai petugas menerima (LA-88).
-- Hanya CREATE ... IF NOT EXISTS; tanpa data contoh. Pemilik yang menerapkan ke D1 produksi (wrangler d1 migrations apply).

CREATE TABLE IF NOT EXISTS lp_komen (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kartu TEXT NOT NULL CHECK (length(kartu) = 10 AND kartu NOT GLOB '*[^0-9a-f]*'),
  sesi TEXT NOT NULL CHECK (length(sesi) BETWEEN 6 AND 40),
  wa TEXT NOT NULL CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  teks TEXT NOT NULL CHECK (length(teks) BETWEEN 2 AND 500),
  status TEXT NOT NULL DEFAULT 'tampil' CHECK (status IN ('tampil', 'dilaporkan', 'tersembunyi')),
  aduan INTEGER NOT NULL DEFAULT 0 CHECK (aduan >= 0),
  dibuat INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lp_komen_kartu ON lp_komen (kartu, status, dibuat);
CREATE INDEX IF NOT EXISTS lp_komen_sesi ON lp_komen (sesi, dibuat);
CREATE INDEX IF NOT EXISTS lp_komen_wa ON lp_komen (wa, dibuat);

CREATE TABLE IF NOT EXISTS lp_komen_aduan (
  komen TEXT NOT NULL,
  pengadu TEXT NOT NULL CHECK (length(pengadu) = 64 AND pengadu NOT GLOB '*[^0-9a-f]*'),
  waktu INTEGER NOT NULL,
  PRIMARY KEY (komen, pengadu)
);

CREATE TABLE IF NOT EXISTS lp_komen_usul (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  komen TEXT NOT NULL,
  kolom TEXT NOT NULL CHECK (kolom IN ('meninggal', 'hilang', 'luka', 'mengungsi', 'rumah', 'terendam')),
  nilai INTEGER NOT NULL CHECK (nilai >= 0),
  kutipan TEXT NOT NULL CHECK (length(kutipan) BETWEEN 1 AND 200),
  status TEXT NOT NULL DEFAULT 'usul' CHECK (status IN ('usul', 'terima', 'tolak')),
  dibuat INTEGER NOT NULL,
  diputus_oleh TEXT,
  diputus INTEGER
);
CREATE INDEX IF NOT EXISTS lp_komen_usul_komen ON lp_komen_usul (komen, status);
