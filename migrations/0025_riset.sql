-- Kemitraan riset perguruan tinggi (docs/bnpb/RENCANA-12-JAM.md R3, docs/bnpb/ARSITEKTUR.md). Idempoten.
-- Daftar tetap di CHECK HARUS sama dengan src/riset.js (dijaga tests/warga/riset.test.mjs).
-- Urutan: 0023 (institusi, institusi_perjanjian) dijalankan lebih dulu; mitra_riset merujuk institusi (C7).
-- Waktu = ms epoch UTC; tanggal jadwal/PKS = teks YYYY-MM-DD; bencana = id registry atau 'lintas' (divalidasi JS, CHECK hanya bentuk).

CREATE TABLE IF NOT EXISTS riset_agenda (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 5 AND 200),
  latar TEXT NOT NULL CHECK (length(latar) <= 800),
  bencana TEXT NOT NULL CHECK (length(bencana) BETWEEN 3 AND 24 AND bencana NOT GLOB '*[^a-z_]*'),
  tema TEXT NOT NULL CHECK (tema IN ('peringatan_dini','pemodelan_bahaya','kerentanan_sosial','logistik','rehab_rekon','kebijakan_anggaran','kesehatan','teknologi','lainnya')),
  prioritas INTEGER NOT NULL CHECK (prioritas BETWEEN 1 AND 3),
  luaran TEXT NOT NULL CHECK (length(luaran) <= 400),
  status TEXT NOT NULL DEFAULT 'buka' CHECK (status IN ('buka','tutup')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0,1))
);

-- Mitra riset = peran kode riset yang menempel di institusi tunggal (0023). Identitas, PIC, dan PKS riset tinggal di institusi / institusi_perjanjian.
CREATE TABLE IF NOT EXISTS mitra_riset (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  institusi_id TEXT NOT NULL REFERENCES institusi (id),
  unit TEXT CHECK (unit IS NULL OR length(unit) BETWEEN 2 AND 120),
  kode_sha TEXT NOT NULL UNIQUE CHECK (length(kode_sha) = 64),
  dibuat INTEGER NOT NULL,
  dicabut INTEGER,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0,1))
);
CREATE INDEX IF NOT EXISTS mitra_riset_institusi ON mitra_riset (institusi_id);

CREATE TABLE IF NOT EXISTS riset_usulan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  mitra_id TEXT NOT NULL REFERENCES mitra_riset (id),
  agenda_id TEXT REFERENCES riset_agenda (id),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 5 AND 200),
  ketua TEXT NOT NULL CHECK (length(ketua) BETWEEN 2 AND 100),
  anggota TEXT CHECK (anggota IS NULL OR length(anggota) <= 400),
  bencana TEXT NOT NULL CHECK (length(bencana) BETWEEN 3 AND 24 AND bencana NOT GLOB '*[^a-z_]*'),
  wilayah TEXT NOT NULL CHECK (length(wilayah) BETWEEN 2 AND 120),
  metode TEXT NOT NULL CHECK (length(metode) BETWEEN 10 AND 800),
  data_butuh TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(data_butuh) AND coalesce(json_type(data_butuh), '') = 'array' AND length(data_butuh) <= 800),
  mulai TEXT NOT NULL CHECK (mulai GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  selesai TEXT NOT NULL CHECK (selesai GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]' AND selesai >= mulai),
  luaran_rencana TEXT NOT NULL CHECK (length(luaran_rencana) BETWEEN 3 AND 400),
  status TEXT NOT NULL DEFAULT 'diajukan' CHECK (status IN ('diajukan','ditelaah','revisi','disetujui','ditolak','berjalan','laporan_akhir','selesai')),
  nomor_pks TEXT CHECK (nomor_pks IS NULL OR length(nomor_pks) BETWEEN 3 AND 80),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 600),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0,1)),
  CHECK (status NOT IN ('disetujui','berjalan','laporan_akhir','selesai') OR nomor_pks IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS riset_usulan_mitra ON riset_usulan (mitra_id, dibuat);
CREATE INDEX IF NOT EXISTS riset_usulan_status ON riset_usulan (status, diubah);

-- alur status: hanya transisi sah (daftar sama dengan ALUR di src/riset.js)
CREATE TRIGGER IF NOT EXISTS riset_usulan_alur BEFORE UPDATE OF status ON riset_usulan
WHEN NEW.status != OLD.status AND NOT (
  (OLD.status = 'diajukan' AND NEW.status = 'ditelaah') OR
  (OLD.status = 'ditelaah' AND NEW.status IN ('revisi','disetujui','ditolak')) OR
  (OLD.status = 'revisi' AND NEW.status = 'diajukan') OR
  (OLD.status = 'disetujui' AND NEW.status = 'berjalan') OR
  (OLD.status = 'berjalan' AND NEW.status = 'laporan_akhir') OR
  (OLD.status = 'laporan_akhir' AND NEW.status IN ('selesai','berjalan')))
BEGIN SELECT RAISE(ABORT, 'transisi status usulan tidak sah'); END;

CREATE TABLE IF NOT EXISTS riset_jejak (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usulan_id TEXT NOT NULL REFERENCES riset_usulan (id),
  dari TEXT CHECK (dari IS NULL OR dari IN ('diajukan','ditelaah','revisi','disetujui','ditolak','berjalan','laporan_akhir','selesai')),
  ke TEXT NOT NULL CHECK (ke IN ('diajukan','ditelaah','revisi','disetujui','ditolak','berjalan','laporan_akhir','selesai')),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 600),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0,1))
);
CREATE INDEX IF NOT EXISTS riset_jejak_u ON riset_jejak (usulan_id, id);

CREATE TABLE IF NOT EXISTS riset_kemajuan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  usulan_id TEXT NOT NULL REFERENCES riset_usulan (id),
  jenis TEXT NOT NULL CHECK (jenis IN ('kemajuan','akhir')),
  isi TEXT NOT NULL CHECK (length(isi) BETWEEN 10 AND 1500),
  tautan TEXT CHECK (tautan IS NULL OR (length(tautan) <= 300 AND (tautan LIKE 'http://_%' OR tautan LIKE 'https://_%') AND tautan NOT GLOB '*[ <>"]*')),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0,1))
);
CREATE INDEX IF NOT EXISTS riset_kemajuan_u ON riset_kemajuan (usulan_id, waktu);

CREATE TABLE IF NOT EXISTS riset_luaran (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  usulan_id TEXT NOT NULL REFERENCES riset_usulan (id),
  jenis TEXT NOT NULL CHECK (jenis IN ('artikel','dataset','model','policy_brief','prototipe')),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 3 AND 200),
  tautan TEXT CHECK (tautan IS NULL OR (length(tautan) <= 300 AND (tautan LIKE 'http://_%' OR tautan LIKE 'https://_%') AND tautan NOT GLOB '*[ <>"]*')),
  doi TEXT CHECK (doi IS NULL OR (length(doi) BETWEEN 7 AND 120 AND doi GLOB '10.[0-9]*/*' AND doi NOT GLOB '*[ <>"]*')),
  waktu INTEGER NOT NULL,
  disetujui INTEGER NOT NULL DEFAULT 0 CHECK (disetujui IN (0,1)),   -- tampil di halaman publik hanya bila admin menyetujui
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0,1))
);
CREATE INDEX IF NOT EXISTS riset_luaran_u ON riset_luaran (usulan_id, waktu);

CREATE TABLE IF NOT EXISTS riset_permintaan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  mitra_id TEXT NOT NULL REFERENCES mitra_riset (id),
  usulan_id TEXT REFERENCES riset_usulan (id),
  dataset TEXT NOT NULL CHECK (length(dataset) BETWEEN 3 AND 40 AND dataset NOT GLOB '*[^a-z0-9_]*'),
  tujuan TEXT NOT NULL CHECK (length(tujuan) BETWEEN 10 AND 500),
  sitasi INTEGER NOT NULL CHECK (sitasi = 1),
  status TEXT NOT NULL DEFAULT 'diminta' CHECK (status IN ('diminta','disetujui','ditolak')),
  jalur TEXT CHECK (jalur IS NULL OR (length(jalur) <= 300 AND (jalur LIKE 'http://_%' OR jalur LIKE 'https://_%' OR (jalur LIKE '/_%' AND jalur NOT LIKE '//%')) AND jalur NOT GLOB '*[ <>"]*')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 600),
  dibuat INTEGER NOT NULL,
  diputus INTEGER,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0,1)),
  CHECK (status != 'disetujui' OR jalur IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS riset_permintaan_m ON riset_permintaan (mitra_id, dibuat);

CREATE TABLE IF NOT EXISTS riset_kebijakan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  luaran_id TEXT NOT NULL REFERENCES riset_luaran (id),
  instansi TEXT NOT NULL CHECK (length(instansi) BETWEEN 2 AND 120),
  bentuk TEXT NOT NULL CHECK (bentuk IN ('se','juknis','model_operasional','materi_rakor','lainnya')),
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 600),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0,1))
);
CREATE INDEX IF NOT EXISTS riset_kebijakan_l ON riset_kebijakan (luaran_id);
