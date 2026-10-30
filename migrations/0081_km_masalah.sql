-- Kemitraan Kampus, migrasi 2/5 (DESAIN-TEKNIS §3.2): bank masalah daerah, pakar disarankan, kunjungan, jawaban, koreksi profil. Idempoten (IF NOT EXISTS).
-- ALUR_MASALAH (konstanta yang nanti dipakai src/kemitraan_masalah.js, KM-C03) = trigger km_masalah_alur di bawah. Transisi sah:
--   diajukan>ditelaah, diajukan>tervalidasi, diajukan>ditolak, diajukan>digabung,
--   ditelaah>tervalidasi, ditelaah>ditolak, ditelaah>digabung,
--   tervalidasi>dicocokkan, tervalidasi>diambil, dicocokkan>diambil,
--   diambil>berjalan, berjalan>selesai, ditolak>ditelaah.
-- Enum bahaya (11) dan aspek (A1..A10) identik dengan konstanta modul (konst.py = konst.js).

CREATE TABLE IF NOT EXISTS km_masalah (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  kab4 TEXT NOT NULL CHECK (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*'),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  bahaya TEXT NOT NULL CHECK (bahaya IN ('banjir', 'longsor', 'gempa', 'tsunami', 'gunungapi', 'kekeringan', 'karhutla', 'cuaca_ekstrem', 'abrasi_rob', 'udara', 'multi')),
  aspek TEXT NOT NULL CHECK (aspek IN ('A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10')),
  sumber TEXT NOT NULL CHECK (sumber IN ('otomatis', 'bpbd', 'unit', 'lapangan')),
  auto_id TEXT CHECK (auto_id IS NULL OR length(auto_id) BETWEEN 1 AND 60),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 5 AND 120),
  uraian TEXT CHECK (uraian IS NULL OR length(uraian) BETWEEN 50 AND 2000),
  dampak TEXT CHECK (dampak IS NULL OR length(dampak) <= 1000),
  kebutuhan TEXT CHECK (kebutuhan IS NULL OR (json_valid(kebutuhan) AND json_type(kebutuhan) = 'array')),
  pernah TEXT CHECK (pernah IS NULL OR length(pernah) <= 1000),
  bukti TEXT CHECK (bukti IS NULL OR (json_valid(bukti) AND json_type(bukti) = 'array')),
  lampiran TEXT CHECK (lampiran IS NULL OR (json_valid(lampiran) AND json_type(lampiran) = 'array' AND json_array_length(lampiran) <= 3)),
  nilai TEXT CHECK (nilai IS NULL OR (json_valid(nilai) AND json_type(nilai) = 'object')),
  skor REAL CHECK (skor IS NULL OR skor BETWEEN 0 AND 1),
  kelas TEXT CHECK (kelas IS NULL OR kelas IN ('P1', 'P2', 'P3')),
  status TEXT NOT NULL DEFAULT 'diajukan' CHECK (status IN ('diajukan', 'ditelaah', 'tervalidasi', 'digabung', 'ditolak', 'dicocokkan', 'diambil', 'berjalan', 'selesai')),
  induk_id TEXT CHECK (induk_id IS NULL OR (length(induk_id) = 16 AND induk_id NOT GLOB '*[^0-9a-f]*')),
  pengaju TEXT NOT NULL CHECK (length(pengaju) BETWEEN 2 AND 80),
  alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 500),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (status <> 'digabung' OR induk_id IS NOT NULL),
  CHECK (sumber <> 'otomatis' OR auto_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_km_masalah_auto ON km_masalah (auto_id) WHERE auto_id IS NOT NULL AND dummy = 0;
CREATE INDEX IF NOT EXISTS idx_km_masalah_kab ON km_masalah (kab4, status);

CREATE TRIGGER IF NOT EXISTS km_masalah_alur BEFORE UPDATE OF status ON km_masalah
WHEN NEW.status <> OLD.status AND (OLD.status || '>' || NEW.status) NOT IN (
  'diajukan>ditelaah', 'diajukan>tervalidasi', 'diajukan>ditolak', 'diajukan>digabung',
  'ditelaah>tervalidasi', 'ditelaah>ditolak', 'ditelaah>digabung',
  'tervalidasi>dicocokkan', 'dicocokkan>diambil', 'tervalidasi>diambil',
  'diambil>berjalan', 'berjalan>selesai', 'ditolak>ditelaah')
BEGIN SELECT RAISE(ABORT, 'km_masalah_alur: transisi status tidak sah'); END;

CREATE TABLE IF NOT EXISTS km_masalah_pakar (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  masalah_id TEXT NOT NULL REFERENCES km_masalah (id),
  akademisi_id TEXT NOT NULL CHECK (length(akademisi_id) <= 13 AND akademisi_id GLOB 'A[0-9]*' AND akademisi_id NOT GLOB 'A*[^0-9]*'),
  peringkat INTEGER NOT NULL CHECK (peringkat BETWEEN 1 AND 10),
  skor REAL NOT NULL CHECK (skor BETWEEN 0 AND 1),
  pecah TEXT NOT NULL CHECK (json_valid(pecah) AND json_type(pecah) = 'object'),
  status TEXT NOT NULL DEFAULT 'disarankan' CHECK (status IN ('disarankan', 'dihubungi', 'bersedia', 'tidak', 'tanpa_jawaban')),
  dihitung INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 80),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (masalah_id, akademisi_id)
);

CREATE TABLE IF NOT EXISTS km_kunjungan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  kab4 TEXT NOT NULL CHECK (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*'),
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  tim TEXT NOT NULL CHECK (json_valid(tim) AND json_type(tim) = 'array' AND json_array_length(tim) BETWEEN 1 AND 12),
  narasumber TEXT NOT NULL CHECK (json_valid(narasumber) AND json_type(narasumber) = 'array'),
  status TEXT NOT NULL DEFAULT 'rencana' CHECK (status IN ('rencana', 'berjalan', 'selesai', 'batal')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 2 AND 80),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_km_kunjungan_kab ON km_kunjungan (kab4, tanggal);

CREATE TABLE IF NOT EXISTS km_jawaban (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  kunjungan_id TEXT NOT NULL REFERENCES km_kunjungan (id),
  klien_id TEXT NOT NULL CHECK (length(klien_id) BETWEEN 8 AND 40),
  narasumber TEXT NOT NULL CHECK (narasumber IN ('bpbd', 'bappeda', 'pu', 'dinkes', 'dinsos', 'kades', 'warga', 'usaha')),
  templat_id TEXT NOT NULL CHECK (length(templat_id) BETWEEN 2 AND 40),
  masalah_id TEXT REFERENCES km_masalah (id),
  auto_id TEXT CHECK (auto_id IS NULL OR length(auto_id) BETWEEN 1 AND 60),
  pilihan TEXT CHECK (pilihan IS NULL OR pilihan IN ('ya', 'sebagian', 'tidak')),
  teks TEXT CHECK (teks IS NULL OR length(teks) <= 3000),
  angka REAL,
  dibuat INTEGER NOT NULL,
  waktu_klien INTEGER,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 2 AND 80),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (kunjungan_id, klien_id)
);
CREATE INDEX IF NOT EXISTS idx_km_jawaban_masalah ON km_jawaban (masalah_id);

CREATE TABLE IF NOT EXISTS km_koreksi (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  kab4 TEXT NOT NULL CHECK (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*'),
  kunjungan_id TEXT REFERENCES km_kunjungan (id),
  jalur TEXT NOT NULL CHECK (length(jalur) BETWEEN 3 AND 80),
  lama TEXT CHECK (lama IS NULL OR length(lama) <= 200),
  baru TEXT NOT NULL CHECK (length(baru) BETWEEN 1 AND 200),
  sumber TEXT NOT NULL CHECK (length(sumber) BETWEEN 3 AND 200),
  status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'diterima', 'ditolak')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 2 AND 80),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_km_koreksi_kab ON km_koreksi (kab4, status);
