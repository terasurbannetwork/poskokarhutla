-- Pusdalops Gelombang 3 (spek docs/superpowers/specs/2026-11-01-pusdalops-standar.md, G1-G4): wajib tutup, papan SK aktif, peringatan berantai, antrean medsos.
-- Kode: src/logbook.js (G1, G2), src/berantai.js (G3), src/medsos_antre.js (G4). Idempoten (CREATE IF NOT EXISTS), tidak menyentuh tabel lama.
-- Waktu = ms epoch UTC; tanggal = YYYY-MM-DD. Tanpa FK ke logbook_kejadian (pola 0096: pembangunan ulang tabel logbook tak boleh menggugurkan baris di sini); integritas dijaga kode.
-- Komentar `--` di baris sendiri (pecah() memotong di baris berakhir titik koma).

-- G1 Detail penutupan kejadian (tabel samping: ALTER ADD COLUMN tidak idempoten). Kejadian lama yang sudah tutup tanpa baris di sini tetap sah.
CREATE TABLE IF NOT EXISTS logbook_tutup (
  kejadian_id TEXT PRIMARY KEY CHECK (length(kejadian_id) = 16),
  tgl_tuntas TEXT NOT NULL CHECK (tgl_tuntas GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  kondisi_akhir TEXT NOT NULL CHECK (length(kondisi_akhir) BETWEEN 3 AND 300),
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dibuat INTEGER NOT NULL
) WITHOUT ROWID;

-- G2 Papan SK aktif: SK yang masih berlaku (tmt_selesai >= hari ini) atau tanpa tmt_selesai (NULL terurut pertama di indeks, IS NULL ikut SEARCH)
CREATE INDEX IF NOT EXISTS logbook_sk_selesai ON logbook_sk (tmt_selesai);

-- G3 Peringatan berantai: satu baris per (kab, jenis susulan); entri baru memperpanjang baris itu (upsert), jadi tak pernah dobel dan tabel terbatas ~ jumlah kab x 2
CREATE TABLE IF NOT EXISTS berantai_peringatan (
  prov TEXT NOT NULL CHECK (prov GLOB '[0-9][0-9]'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  susulan TEXT NOT NULL CHECK (susulan IN ('longsor', 'banjir')),
  pemicu TEXT NOT NULL CHECK (pemicu IN ('banjir', 'cuaca')),
  kejadian_id TEXT CHECK (kejadian_id IS NULL OR length(kejadian_id) = 16),
  mulai INTEGER NOT NULL,
  berlaku_sampai INTEGER NOT NULL,
  dibuat INTEGER NOT NULL,
  diperbarui INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  PRIMARY KEY (prov, kab, susulan),
  CHECK (berlaku_sampai > mulai)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS berantai_berlaku ON berantai_peringatan (berlaku_sampai DESC);
CREATE INDEX IF NOT EXISTS berantai_dummy ON berantai_peringatan (prov) WHERE dummy = 1;

-- G4 Antrean verifikasi pantauan medsos/TV; tidak ada impor otomatis, staf memasukkan butir satu per satu
CREATE TABLE IF NOT EXISTS medsos_butir (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  sumber TEXT NOT NULL CHECK (sumber IN ('medsos', 'tv')),
  tautan TEXT NOT NULL CHECK (tautan LIKE 'https://%' AND length(tautan) <= 300),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 3 AND 140),
  prov TEXT NOT NULL CHECK (prov GLOB '[0-9][0-9]'),
  kab TEXT CHECK (kab IS NULL OR length(kab) BETWEEN 2 AND 60),
  jenis TEXT CHECK (jenis IS NULL OR length(jenis) BETWEEN 3 AND 30),
  waktu_pantau INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'baru' CHECK (status IN ('baru', 'terverifikasi', 'ditolak', 'jadi_kejadian')),
  kejadian_id TEXT CHECK (kejadian_id IS NULL OR length(kejadian_id) = 16),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 200),
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dibuat INTEGER NOT NULL,
  diverifikasi INTEGER,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (kejadian_id IS NULL OR status IN ('terverifikasi', 'jadi_kejadian'))
);
CREATE UNIQUE INDEX IF NOT EXISTS medsos_tautan ON medsos_butir (tautan);
CREATE INDEX IF NOT EXISTS medsos_antre ON medsos_butir (status, waktu_pantau DESC);
CREATE INDEX IF NOT EXISTS medsos_jeda ON medsos_butir (waktu_pantau) WHERE kejadian_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS medsos_dummy ON medsos_butir (id) WHERE dummy = 1;
