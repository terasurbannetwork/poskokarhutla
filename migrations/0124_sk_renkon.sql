-- 0124: Siklus Bencana gelombang G4 (F5 Renkon Hidup dan Gladi). Rancangan: data/kajian-bnpb/siklus/DESAIN-TEKNIS.md bagian 3.4; ALGORITMA F5; KEPUTUSAN-AWAL.md.
-- Hanya CREATE ... IF NOT EXISTS. `kedaluwarsa` BUKAN nilai status: dihitung saat dibaca dari berlaku_sampai (ADR-09). Stok dan personel tidak disalin ke sini (dibaca dari LogPal dan /petugas).
-- sk_gladi.kejadian_id ber-FK ke sk_kejadian: hanya kejadian yang sudah dipromosikan ke D1 (ADR-04). Tanpa nama orang, NIK, koordinat. Kolom dummy di kedua tabel.
-- Komentar `--` sengaja di baris sendiri (pecah() di tests/warga/_bantu.mjs memotong di baris berakhir ';').
CREATE TABLE IF NOT EXISTS sk_renkon (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 5 AND 200),
  bencana TEXT NOT NULL CHECK (length(bencana) BETWEEN 3 AND 24),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab4 TEXT CHECK (kab4 IS NULL OR (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*')),
  skenario TEXT CHECK (skenario IS NULL OR length(skenario) <= 4000),
  asumsi TEXT CHECK (asumsi IS NULL OR (json_valid(asumsi) AND length(asumsi) <= 6000)),
  kerangka TEXT CHECK (kerangka IS NULL OR (json_valid(kerangka) AND length(kerangka) <= 6000)),
  kesenjangan TEXT CHECK (kesenjangan IS NULL OR (json_valid(kesenjangan) AND length(kesenjangan) <= 6000)),
  status TEXT NOT NULL DEFAULT 'persiapan' CHECK (status IN ('persiapan', 'pelaksanaan', 'finalisasi', 'ditetapkan', 'berlaku', 'dimutakhirkan')),
  versi INTEGER NOT NULL DEFAULT 1 CHECK (versi BETWEEN 1 AND 99),
  induk_id TEXT CHECK (induk_id IS NULL OR (length(induk_id) = 16 AND induk_id NOT GLOB '*[^0-9a-f]*')),
  tgl_sah TEXT CHECK (tgl_sah IS NULL OR tgl_sah GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  berlaku_sampai TEXT CHECK (berlaku_sampai IS NULL OR berlaku_sampai GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  no_penetapan TEXT CHECK (no_penetapan IS NULL OR length(no_penetapan) BETWEEN 1 AND 120),
  reviu_terakhir TEXT CHECK (reviu_terakhir IS NULL OR reviu_terakhir GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  meja_id TEXT CHECK (meja_id IS NULL OR length(meja_id) BETWEEN 1 AND 40),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (status NOT IN ('ditetapkan', 'berlaku') OR (tgl_sah IS NOT NULL AND berlaku_sampai IS NOT NULL AND no_penetapan IS NOT NULL))
);
-- UNIQUE biasa tidak menangkap kab4 NULL (NULL tak sama dengan NULL): renkon provinsi dipaksa unik lewat coalesce.
CREATE UNIQUE INDEX IF NOT EXISTS sk_rk_unik ON sk_renkon (prov, coalesce(kab4, ''), bencana, versi, dummy);
CREATE INDEX IF NOT EXISTS sk_rk_wil ON sk_renkon (prov, kab4, bencana);
CREATE INDEX IF NOT EXISTS sk_rk_batas ON sk_renkon (berlaku_sampai) WHERE status = 'berlaku';
CREATE INDEX IF NOT EXISTS sk_rk_status ON sk_renkon (status, diubah DESC) WHERE status IN ('persiapan', 'pelaksanaan', 'finalisasi', 'ditetapkan');
CREATE INDEX IF NOT EXISTS sk_rk_dummy ON sk_renkon (id) WHERE dummy = 1;

CREATE TABLE IF NOT EXISTS sk_gladi (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  jenis TEXT NOT NULL CHECK (jenis IN ('ruang', 'posko', 'lapang')),
  renkon_id TEXT NOT NULL REFERENCES sk_renkon(id) CHECK (length(renkon_id) = 16 AND renkon_id NOT GLOB '*[^0-9a-f]*'),
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian(id) CHECK (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????' AND substr(kejadian_id, 9) NOT GLOB '*[^0-9A-HJKMNP-TV-Z]*'),
  status TEXT NOT NULL DEFAULT 'dirancang' CHECK (status IN ('dirancang', 'siap', 'berjalan', 'dievaluasi', 'selesai')),
  skenario TEXT CHECK (skenario IS NULL OR (json_valid(skenario) AND length(skenario) <= 6000)),
  masalah TEXT CHECK (masalah IS NULL OR (json_valid(masalah) AND length(masalah) <= 6000)),
  rekomendasi TEXT CHECK (rekomendasi IS NULL OR (json_valid(rekomendasi) AND length(rekomendasi) <= 4000)),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (status <> 'selesai' OR rekomendasi IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS sk_gl_renkon ON sk_gladi (renkon_id, diubah DESC);
CREATE INDEX IF NOT EXISTS sk_gl_kej ON sk_gladi (kejadian_id);
CREATE INDEX IF NOT EXISTS sk_gl_dummy ON sk_gladi (id) WHERE dummy = 1;

-- Pintu publik (skKejadianPublikDaftar): urut mulai terbaru tanpa pindai, hanya baris publik nyata.
CREATE INDEX IF NOT EXISTS sk_kej_publik ON sk_kejadian (mulai DESC, id DESC) WHERE publik = 1 AND dummy = 0;
