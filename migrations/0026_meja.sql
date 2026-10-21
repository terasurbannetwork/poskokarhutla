-- Meja Kerja (src/meja.js, src/meja_spek.js): satu mesin alur untuk kaji cepat, logistik, DSP, renkon, Destana, rehab-rekon, stok gudang + tabel ringkas (agregat). Idempoten (IF NOT EXISTS).
-- Waktu = ms epoch UTC. Daftar meja, status per meja, dan transisi sah HARUS sama dengan src/meja_spek.js; tests/warga/meja.test.mjs menjaganya.
-- Isi `data` divalidasi per spek di Worker (kolom tak dikenal ditolak); di sini D1 menjaga bentuknya: JSON objek <= 6000 huruf.

-- Petugas BPBD berkode: satu kode per orang per kabupaten, hanya sha256 kode disimpan (tampil SEKALI ke admin). meja = larik meja yang boleh diisi.
CREATE TABLE IF NOT EXISTS meja_petugas (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 80),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  meja TEXT NOT NULL CHECK (json_valid(meja) AND json_type(meja) = 'array' AND json_array_length(meja) BETWEEN 1 AND 7),
  kode_sha TEXT NOT NULL UNIQUE CHECK (length(kode_sha) = 64 AND kode_sha NOT GLOB '*[^0-9a-f]*'),
  dibuat INTEGER NOT NULL,
  dicabut INTEGER CHECK (dicabut IS NULL OR dicabut >= dibuat),
  oleh TEXT,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
-- CHECK tidak boleh berisi subquery, jadi isi larik meja dijaga trigger: hanya tujuh meja, tanpa duplikat.
CREATE TRIGGER IF NOT EXISTS meja_petugas_sah BEFORE INSERT ON meja_petugas
WHEN EXISTS (SELECT 1 FROM json_each(NEW.meja) WHERE value NOT IN ('kaji_cepat', 'logistik', 'dsp', 'renkon', 'destana', 'rehab', 'gudang'))
  OR json_array_length(NEW.meja) != (SELECT count(DISTINCT value) FROM json_each(NEW.meja))
BEGIN
  SELECT RAISE(ABORT, 'meja petugas tidak sah atau berulang');
END;

-- Catatan: satu baris per isian di meja mana pun. renkon, destana, gudang berstatus tunggal 'tercatat' (status efektif diturunkan saat dibaca). rehab wajib tertaut ke kaji cepat (kaji_id); gudang menyimpan saldo di kolom stok (tidak boleh minus).
CREATE TABLE IF NOT EXISTS meja_catatan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  meja TEXT NOT NULL CHECK (meja IN ('kaji_cepat', 'logistik', 'dsp', 'renkon', 'destana', 'rehab', 'gudang')),
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
  kaji_id TEXT REFERENCES meja_catatan (id),
  stok INTEGER CHECK (stok IS NULL OR stok >= 0),
  klien_id TEXT CHECK (klien_id IS NULL OR length(klien_id) BETWEEN 8 AND 40),   -- kunci kirim ulang antrean luring: pembuat yang sama + klien_id sama = catatan yang sama
  CHECK ((meja = 'kaji_cepat' AND status IN ('dilaporkan', 'diverifikasi', 'masuk_jitupasna'))
    OR (meja = 'logistik' AND status IN ('diminta', 'disetujui', 'dikirim', 'diterima'))
    OR (meja = 'dsp' AND status IN ('diajukan', 'disetujui', 'cair', 'spj', 'selesai', 'ditolak'))
    OR (meja = 'rehab' AND status IN ('jitupasna', 'usulan', 'disetujui', 'cair', 'dibangun', 'selesai', 'ditolak'))
    OR (meja IN ('renkon', 'destana', 'gudang') AND status = 'tercatat')),
  CHECK ((meja = 'rehab') = (kaji_id IS NOT NULL)),
  CHECK ((meja = 'gudang') = (stok IS NOT NULL)),
  CHECK (meja NOT IN ('kaji_cepat', 'destana') OR desa IS NOT NULL),
  CHECK (meja != 'destana' OR kec IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS meja_catatan_wilayah ON meja_catatan (meja, prov, kab, status);
CREATE UNIQUE INDEX IF NOT EXISTS meja_catatan_klien ON meja_catatan (oleh, klien_id) WHERE klien_id IS NOT NULL;

-- Rehab-rekon hanya boleh tertaut ke catatan kaji cepat berstatus masuk_jitupasna di kabupaten yang sama, dan satu usulan per kaji cepat.
CREATE TRIGGER IF NOT EXISTS meja_rehab_tautan BEFORE INSERT ON meja_catatan
WHEN NEW.meja = 'rehab' AND NOT EXISTS (SELECT 1 FROM meja_catatan k WHERE k.id = NEW.kaji_id AND k.meja = 'kaji_cepat' AND k.status = 'masuk_jitupasna' AND k.prov = NEW.prov AND k.kab = NEW.kab AND k.dummy = NEW.dummy)
BEGIN
  SELECT RAISE(ABORT, 'rehab harus tertaut ke kaji cepat masuk_jitupasna di kabupaten yang sama');
END;
CREATE UNIQUE INDEX IF NOT EXISTS meja_rehab_satu ON meja_catatan (kaji_id) WHERE meja = 'rehab';
-- Satu catatan per (kabupaten, gudang, barang).
CREATE UNIQUE INDEX IF NOT EXISTS meja_gudang_unik ON meja_catatan (prov, kab, lower(json_extract(data, '$.gudang')), json_extract(data, '$.barang')) WHERE meja = 'gudang';

-- Meja, wilayah, dan transisi status tidak boleh berubah di luar jalur sah (jaring kedua di bawah validasi Worker).
CREATE TRIGGER IF NOT EXISTS meja_catatan_ubah BEFORE UPDATE ON meja_catatan
WHEN NEW.meja != OLD.meja OR NEW.prov != OLD.prov OR NEW.kab != OLD.kab OR NEW.kaji_id IS NOT OLD.kaji_id
  OR (NEW.status != OLD.status AND (OLD.meja || ':' || OLD.status || '>' || NEW.status) NOT IN (
    'kaji_cepat:dilaporkan>diverifikasi', 'kaji_cepat:diverifikasi>masuk_jitupasna',
    'logistik:diminta>disetujui', 'logistik:disetujui>dikirim', 'logistik:dikirim>diterima',
    'dsp:diajukan>disetujui', 'dsp:diajukan>ditolak', 'dsp:disetujui>cair', 'dsp:cair>spj', 'dsp:spj>selesai',
    'rehab:jitupasna>usulan', 'rehab:usulan>disetujui', 'rehab:usulan>ditolak', 'rehab:disetujui>cair', 'rehab:cair>dibangun', 'rehab:dibangun>selesai'))
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
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  klien_id TEXT CHECK (klien_id IS NULL OR length(klien_id) BETWEEN 8 AND 40),   -- kirim ulang perpindahan status dari antrean luring
  diterima INTEGER   -- waktu server menerima; waktu = waktu kejadian menurut klien bila kiriman luring
);
CREATE INDEX IF NOT EXISTS meja_jejak_catatan ON meja_jejak (catatan_id, waktu);
CREATE UNIQUE INDEX IF NOT EXISTS meja_jejak_klien ON meja_jejak (catatan_id, klien_id) WHERE klien_id IS NOT NULL;

-- Transaksi stok gudang (masuk, keluar, koreksi): hanya ditambah, tidak diubah. delta bertanda; saldo = stok sesudah transaksi.
-- keluar dari logistik 'dikirim' membawa logistik_id (satu transaksi per permintaan logistik).
CREATE TABLE IF NOT EXISTS meja_stok (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gudang_id TEXT NOT NULL REFERENCES meja_catatan (id),
  jenis TEXT NOT NULL CHECK (jenis IN ('masuk', 'keluar', 'koreksi')),
  delta INTEGER NOT NULL CHECK (delta BETWEEN -10000000 AND 10000000),
  saldo INTEGER NOT NULL CHECK (saldo >= 0),
  logistik_id TEXT REFERENCES meja_catatan (id),
  waktu INTEGER NOT NULL,
  oleh TEXT,
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 200),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK ((jenis = 'masuk' AND delta > 0) OR (jenis = 'keluar' AND delta < 0) OR (jenis = 'koreksi' AND delta != 0))
);
CREATE INDEX IF NOT EXISTS meja_stok_gudang ON meja_stok (gudang_id, waktu);
CREATE UNIQUE INDEX IF NOT EXISTS meja_stok_logistik ON meja_stok (logistik_id) WHERE logistik_id IS NOT NULL;
CREATE TRIGGER IF NOT EXISTS meja_stok_sah BEFORE INSERT ON meja_stok
WHEN NOT EXISTS (SELECT 1 FROM meja_catatan WHERE id = NEW.gudang_id AND meja = 'gudang')
  OR (NEW.logistik_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM meja_catatan WHERE id = NEW.logistik_id AND meja = 'logistik'))
BEGIN
  SELECT RAISE(ABORT, 'transaksi stok harus untuk catatan gudang (dan logistik bila ada)');
END;
CREATE TRIGGER IF NOT EXISTS meja_stok_beku BEFORE UPDATE ON meja_stok
BEGIN
  SELECT RAISE(ABORT, 'transaksi stok tidak boleh diubah');
END;
CREATE TRIGGER IF NOT EXISTS meja_stok_tahan BEFORE DELETE ON meja_stok
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'transaksi stok tidak boleh dihapus');
END;

-- Agregat (C8): satu baris per (meja, prov, kab, status efektif, dummy). Dibangun ulang per kelompok (meja, prov, kab, dummy) setiap
-- tulis, dan seluruhnya tiap jam (cron) atau saat dibaca lewat 2 jam, karena tanda berbasis waktu (>24 jam dst.) berubah tanpa ada tulis.
-- bahaya = jumlah catatan bertanda; jumlah = JSON penjumlahan kolom rekap; terbaru = diubah terbaru (ms).
CREATE TABLE IF NOT EXISTS meja_ringkas (
  meja TEXT NOT NULL CHECK (meja IN ('kaji_cepat', 'logistik', 'dsp', 'renkon', 'destana', 'rehab', 'gudang')),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  status TEXT NOT NULL CHECK (length(status) BETWEEN 3 AND 20),
  dummy INTEGER NOT NULL CHECK (dummy IN (0, 1)),
  n INTEGER NOT NULL CHECK (n > 0),
  bahaya INTEGER NOT NULL CHECK (bahaya BETWEEN 0 AND n),
  jumlah TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(jumlah) AND json_type(jumlah) = 'object'),
  terbaru INTEGER NOT NULL,
  PRIMARY KEY (meja, prov, kab, status, dummy)
) WITHOUT ROWID;
-- Bahan "kabupaten tanpa renkon berlaku": per bencana, jumlah catatan kaji cepat / renkon (berlaku = belum kedaluwarsa).
CREATE TABLE IF NOT EXISTS meja_ringkas_bencana (
  meja TEXT NOT NULL CHECK (meja IN ('kaji_cepat', 'renkon')),
  bencana TEXT NOT NULL CHECK (length(bencana) BETWEEN 3 AND 20),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  dummy INTEGER NOT NULL CHECK (dummy IN (0, 1)),
  n INTEGER NOT NULL CHECK (n > 0),
  berlaku INTEGER NOT NULL CHECK (berlaku BETWEEN 0 AND n),
  PRIMARY KEY (meja, bencana, prov, kab, dummy)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS meja_ringkas_meta (
  kunci TEXT PRIMARY KEY CHECK (kunci = 'dihitung'),
  nilai INTEGER NOT NULL
) WITHOUT ROWID;
