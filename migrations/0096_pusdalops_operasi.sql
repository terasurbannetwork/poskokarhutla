-- Modul operasi Pusdalops, Gelombang 2 (spek docs/superpowers/specs/2026-11-01-pusdalops-standar.md, W2-W4): tracker pemulihan, Laporan Khusus, roll call radio.
-- Kode: src/pemulihan.js, src/lapsus.js, src/rollcall.js. Idempoten (CREATE IF NOT EXISTS), tidak menyentuh tabel lama. Waktu = ms epoch UTC; tanggal = YYYY-MM-DD.
-- Kunci wilayah: prov = kode 2 angka, kab = nama (pasangan "prov|nama" seperti logbook_kejadian). Kolom dummy=1 hanya di baris induk; anak ikut dihapus aksi hapus dummy.

-- Tanpa FK ke logbook_kejadian (pemulihan.kejadian_id, lapsus_kejadian.kejadian_id) dan ke lapsus_tim (lapsus_kejadian.tim_id): disengaja, supaya pembangunan ulang tabel logbook
-- (pola 0091) tidak menggugurkan baris di sini lewat kaskade. Integritas dijaga kode saat INSERT (src/pemulihan.js, src/lapsus.js).

-- W2 Tracker pemulihan
CREATE TABLE IF NOT EXISTS pemulihan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  jenis TEXT NOT NULL CHECK (jenis IN ('huntara', 'huntap', 'dana_tunggu_hunian', 'jembatan_gantung', 'sumur_bor', 'lainnya')),
  prov TEXT NOT NULL CHECK (prov GLOB '[0-9][0-9]'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  desa TEXT CHECK (desa IS NULL OR length(desa) BETWEEN 2 AND 60),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94 AND 142),
  target REAL NOT NULL CHECK (target >= 0),
  realisasi REAL NOT NULL DEFAULT 0 CHECK (realisasi >= 0),
  satuan TEXT NOT NULL CHECK (length(satuan) BETWEEN 1 AND 20),
  pelaksana TEXT CHECK (pelaksana IS NULL OR length(pelaksana) BETWEEN 2 AND 80),
  sumber_dana TEXT CHECK (sumber_dana IS NULL OR length(sumber_dana) BETWEEN 2 AND 80),
  status TEXT NOT NULL DEFAULT 'rencana' CHECK (status IN ('rencana', 'berjalan', 'selesai', 'terhenti')),
  mulai TEXT CHECK (mulai IS NULL OR mulai GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  selesai TEXT CHECK (selesai IS NULL OR selesai GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  kejadian_id TEXT CHECK (kejadian_id IS NULL OR length(kejadian_id) = 16),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK ((lat IS NULL) = (lon IS NULL)),
  CHECK (selesai IS NULL OR mulai IS NULL OR selesai >= mulai)
);
CREATE INDEX IF NOT EXISTS pemulihan_wilayah ON pemulihan (prov, kab, jenis);
CREATE INDEX IF NOT EXISTS pemulihan_diubah ON pemulihan (diubah DESC);
CREATE INDEX IF NOT EXISTS pemulihan_status ON pemulihan (status, diubah DESC);
CREATE INDEX IF NOT EXISTS pemulihan_jenis ON pemulihan (jenis, diubah DESC);
CREATE INDEX IF NOT EXISTS pemulihan_dummy ON pemulihan (id) WHERE dummy = 1;

CREATE TABLE IF NOT EXISTS pemulihan_progres (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  pemulihan_id TEXT NOT NULL REFERENCES pemulihan (id) ON DELETE CASCADE,
  tgl TEXT NOT NULL CHECK (tgl GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  realisasi REAL NOT NULL CHECK (realisasi >= 0),
  status TEXT NOT NULL CHECK (status IN ('rencana', 'berjalan', 'selesai', 'terhenti')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dibuat INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS pemulihan_progres_item ON pemulihan_progres (pemulihan_id, tgl, dibuat);

-- W3 Laporan Khusus operasi besar: operasi > provinsi > tim pendamping > kejadian logbook; entri harian per kab
CREATE TABLE IF NOT EXISTS lapsus_operasi (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 3 AND 120),
  jenis TEXT NOT NULL CHECK (length(jenis) BETWEEN 3 AND 40),
  mulai TEXT NOT NULL CHECK (mulai GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'selesai')),
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS lapsus_operasi_dummy ON lapsus_operasi (id) WHERE dummy = 1;
CREATE TABLE IF NOT EXISTS lapsus_prov (
  operasi_id TEXT NOT NULL REFERENCES lapsus_operasi (id) ON DELETE CASCADE,
  prov TEXT NOT NULL CHECK (prov GLOB '[0-9][0-9]'),
  PRIMARY KEY (operasi_id, prov)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS lapsus_tim (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  operasi_id TEXT NOT NULL REFERENCES lapsus_operasi (id) ON DELETE CASCADE,
  prov TEXT NOT NULL CHECK (prov GLOB '[0-9][0-9]'),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 80),
  dibuat INTEGER NOT NULL,
  UNIQUE (operasi_id, prov, nama)
);
CREATE TABLE IF NOT EXISTS lapsus_kejadian (
  operasi_id TEXT NOT NULL REFERENCES lapsus_operasi (id) ON DELETE CASCADE,
  kejadian_id TEXT NOT NULL CHECK (length(kejadian_id) = 16),
  prov TEXT NOT NULL CHECK (prov GLOB '[0-9][0-9]'),
  tim_id TEXT CHECK (tim_id IS NULL OR length(tim_id) = 16),
  dibuat INTEGER NOT NULL,
  PRIMARY KEY (operasi_id, kejadian_id)
) WITHOUT ROWID;
-- kebutuhan = larik {kelompok, barang, jumlah, satuan} (bentuk kebutuhan_rinci logbook 0094); layanan = objek {bbm|sinyal|listrik|air: {status: normal|terganggu|padam, catatan?}}
CREATE TABLE IF NOT EXISTS lapsus_entri (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  operasi_id TEXT NOT NULL REFERENCES lapsus_operasi (id) ON DELETE CASCADE,
  prov TEXT NOT NULL CHECK (prov GLOB '[0-9][0-9]'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  waktu_data INTEGER NOT NULL,
  kebutuhan TEXT CHECK (kebutuhan IS NULL OR (json_valid(kebutuhan) AND json_type(kebutuhan) = 'array')),
  layanan TEXT CHECK (layanan IS NULL OR (json_valid(layanan) AND json_type(layanan) = 'object')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dibuat INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lapsus_entri_kab ON lapsus_entri (operasi_id, prov, kab, waktu_data);

-- W4 Roll call radio harian
CREATE TABLE IF NOT EXISTS rollcall_sesi (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  tgl TEXT NOT NULL CHECK (tgl GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  slot TEXT NOT NULL CHECK (slot IN ('pagi', 'siang', 'malam')),
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (tgl, slot)
);
CREATE TABLE IF NOT EXISTS rollcall_peserta (
  sesi_id TEXT NOT NULL REFERENCES rollcall_sesi (id) ON DELETE CASCADE,
  kategori TEXT NOT NULL CHECK (kategori IN ('bpbd_prov', 'bpbd_kab', 'komunitas')),
  prov TEXT NOT NULL CHECK (prov GLOB '[0-9][0-9]'),
  kab TEXT CHECK (kab IS NULL OR length(kab) BETWEEN 2 AND 60),
  nama TEXT CHECK (nama IS NULL OR length(nama) BETWEEN 2 AND 60),
  hasil TEXT NOT NULL CHECK (hasil IN ('hadir', 'tidak', 'gangguan')),
  CHECK ((kategori = 'bpbd_prov' AND kab IS NULL AND nama IS NULL) OR (kategori = 'bpbd_kab' AND kab IS NOT NULL AND nama IS NULL) OR (kategori = 'komunitas' AND nama IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS rollcall_peserta_unik ON rollcall_peserta (sesi_id, kategori, prov, coalesce(kab, ''), coalesce(nama, ''));
CREATE INDEX IF NOT EXISTS rollcall_sesi_dummy ON rollcall_sesi (id) WHERE dummy = 1;
