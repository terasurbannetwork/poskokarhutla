-- Meja Kerja (src/meja.js, src/meja_spek.js): satu mesin alur untuk kaji cepat, logistik, DSP, renkon, Destana. Idempoten (IF NOT EXISTS).
-- Waktu = ms epoch UTC. Daftar meja, status per meja, dan transisi sah HARUS sama dengan src/meja_spek.js; tests/warga/meja.test.mjs menjaganya.
-- Isi `data` divalidasi per spek di Worker (kolom tak dikenal ditolak); di sini D1 menjaga bentuknya: JSON objek <= 6000 huruf.

-- Petugas BPBD berkode: satu kode per orang per kabupaten, hanya sha256 kode disimpan (tampil SEKALI ke admin). meja = larik meja yang boleh diisi.
CREATE TABLE IF NOT EXISTS meja_petugas (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 80),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  meja TEXT NOT NULL CHECK (json_valid(meja) AND json_type(meja) = 'array' AND json_array_length(meja) BETWEEN 1 AND 5),
  kode_sha TEXT NOT NULL UNIQUE CHECK (length(kode_sha) = 64 AND kode_sha NOT GLOB '*[^0-9a-f]*'),
  dibuat INTEGER NOT NULL,
  dicabut INTEGER CHECK (dicabut IS NULL OR dicabut >= dibuat),
  oleh TEXT,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
-- CHECK tidak boleh berisi subquery, jadi isi larik meja dijaga trigger: hanya lima meja, tanpa duplikat.
CREATE TRIGGER IF NOT EXISTS meja_petugas_sah BEFORE INSERT ON meja_petugas
WHEN EXISTS (SELECT 1 FROM json_each(NEW.meja) WHERE value NOT IN ('kaji_cepat', 'logistik', 'dsp', 'renkon', 'destana'))
  OR json_array_length(NEW.meja) != (SELECT count(DISTINCT value) FROM json_each(NEW.meja))
BEGIN
  SELECT RAISE(ABORT, 'meja petugas tidak sah atau berulang');
END;

-- Catatan: satu baris per isian di meja mana pun. renkon dan destana berstatus tunggal 'tercatat' (status efektif diturunkan dari tanggal saat dibaca).
CREATE TABLE IF NOT EXISTS meja_catatan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  meja TEXT NOT NULL CHECK (meja IN ('kaji_cepat', 'logistik', 'dsp', 'renkon', 'destana')),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  kec TEXT CHECK (kec IS NULL OR length(kec) BETWEEN 2 AND 60),
  desa TEXT CHECK (desa IS NULL OR length(desa) BETWEEN 2 AND 80),
  data TEXT NOT NULL CHECK (json_valid(data) AND json_type(data) = 'object' AND length(data) <= 6000),
  status TEXT NOT NULL,
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL CHECK (diubah >= dibuat),
  oleh TEXT,
  petugas_id TEXT REFERENCES meja_petugas (id),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK ((meja = 'kaji_cepat' AND status IN ('dilaporkan', 'diverifikasi', 'masuk_jitupasna'))
    OR (meja = 'logistik' AND status IN ('diminta', 'disetujui', 'dikirim', 'diterima'))
    OR (meja = 'dsp' AND status IN ('diajukan', 'disetujui', 'cair', 'spj', 'selesai', 'ditolak'))
    OR (meja IN ('renkon', 'destana') AND status = 'tercatat')),
  CHECK (meja NOT IN ('kaji_cepat', 'destana') OR desa IS NOT NULL),
  CHECK (meja != 'destana' OR kec IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS meja_catatan_wilayah ON meja_catatan (meja, prov, kab, status);

-- Meja, wilayah, dan transisi status tidak boleh berubah di luar jalur sah (jaring kedua di bawah validasi Worker).
CREATE TRIGGER IF NOT EXISTS meja_catatan_ubah BEFORE UPDATE ON meja_catatan
WHEN NEW.meja != OLD.meja OR NEW.prov != OLD.prov OR NEW.kab != OLD.kab
  OR (NEW.status != OLD.status AND (OLD.meja || ':' || OLD.status || '>' || NEW.status) NOT IN (
    'kaji_cepat:dilaporkan>diverifikasi', 'kaji_cepat:diverifikasi>masuk_jitupasna',
    'logistik:diminta>disetujui', 'logistik:disetujui>dikirim', 'logistik:dikirim>diterima',
    'dsp:diajukan>disetujui', 'dsp:diajukan>ditolak', 'dsp:disetujui>cair', 'dsp:cair>spj', 'dsp:spj>selesai'))
BEGIN
  SELECT RAISE(ABORT, 'perubahan meja, wilayah, atau status tidak sah');
END;

-- Jejak status: tiap pembuatan, perpindahan, dan perubahan isi. dari NULL = baris dibuat.
CREATE TABLE IF NOT EXISTS meja_jejak (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  catatan_id TEXT NOT NULL REFERENCES meja_catatan (id) ON DELETE CASCADE,
  dari TEXT CHECK (dari IS NULL OR length(dari) BETWEEN 3 AND 20),
  ke TEXT NOT NULL CHECK (length(ke) BETWEEN 3 AND 20),
  waktu INTEGER NOT NULL,
  oleh TEXT,
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 200),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS meja_jejak_catatan ON meja_jejak (catatan_id, waktu);
