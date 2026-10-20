-- Statistik per halaman untuk SEMUA bencana di registry (gempa, cuaca, udara, gunungapi, kekeringan, dan yang menyusul).
-- Sebelumnya CHECK hal di 0006 hanya mendaftar karhutla/banjir, jadi INSERT OR IGNORE di src/statistik.js diam-diam menulis 0 baris
-- untuk lima bencana baru. Sekarang daftarnya = semua id registry (public/bencana.json) + halaman tetap (HAL_TETAP) + sistem/publik.
-- Bencana ke-8 dan seterusnya BUTUH migrasi serupa (uji statistik.test.mjs "tiap id bencana registry TERSIMPAN" akan merah bila lupa).
-- SQLite tidak bisa mengubah CHECK lewat ALTER, jadi stat_hari dibangun ulang seperti 0006: salin semua baris, buang yang lama, ganti nama.
-- stat_hari tanpa indeks selain PRIMARY KEY (WITHOUT ROWID), tanpa foreign key dan trigger. Satu transaksi: gagal di tengah = tidak berubah.
-- Idempoten: sisa stat_hari_baru dari percobaan lama dibuang dulu. Kolom lain sama persis dengan 0006.
DROP TABLE IF EXISTS stat_hari_baru;
CREATE TABLE stat_hari_baru (
  tgl TEXT NOT NULL CHECK (tgl GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  hal TEXT NOT NULL CHECK (hal IN ('karhutla', 'banjir', 'gempa', 'cuaca', 'udara', 'gunungapi', 'kekeringan', 'warga', 'tentang', 'privasi', 'statistik', 'sistem', 'publik')),
  kiriman INTEGER NOT NULL DEFAULT 0 CHECK (kiriman >= 0),
  orang REAL NOT NULL DEFAULT 0 CHECK (orang >= 0),
  kembali REAL NOT NULL DEFAULT 0 CHECK (kembali >= 0),
  kunjungan REAL NOT NULL DEFAULT 0 CHECK (kunjungan >= 0),
  tampilan REAL NOT NULL DEFAULT 0 CHECK (tampilan >= 0),
  klik REAL NOT NULL DEFAULT 0 CHECK (klik >= 0),
  detik REAL NOT NULL DEFAULT 0 CHECK (detik >= 0),
  ai_jawab REAL NOT NULL DEFAULT 0 CHECK (ai_jawab >= 0),
  ai_crawl REAL NOT NULL DEFAULT 0 CHECK (ai_crawl >= 0),
  mesin_cari REAL NOT NULL DEFAULT 0 CHECK (mesin_cari >= 0),
  tak_dihitung REAL NOT NULL DEFAULT 0 CHECK (tak_dihitung >= 0),
  sampel REAL NOT NULL DEFAULT 1 CHECK (sampel > 0 AND sampel <= 1),
  slot TEXT NOT NULL CHECK (json_valid(slot) AND json_array_length(slot) = 144),
  menit TEXT NOT NULL CHECK (json_valid(menit) AND json_array_length(menit) = 1440),
  dim TEXT NOT NULL DEFAULT '{"_n":{}}' CHECK (json_valid(dim) AND coalesce(json_type(dim, '$._n'), '') = 'object' AND length(dim) <= 1500000),
  kini TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(kini) AND json_type(kini) = 'array'),
  PRIMARY KEY (tgl, hal)
) WITHOUT ROWID;
INSERT INTO stat_hari_baru (tgl, hal, kiriman, orang, kembali, kunjungan, tampilan, klik, detik, ai_jawab, ai_crawl, mesin_cari, tak_dihitung, sampel, slot, menit, dim, kini)
  SELECT tgl, hal, kiriman, orang, kembali, kunjungan, tampilan, klik, detik, ai_jawab, ai_crawl, mesin_cari, tak_dihitung, sampel, slot, menit, dim, kini FROM stat_hari;
DROP TABLE stat_hari;
ALTER TABLE stat_hari_baru RENAME TO stat_hari;
