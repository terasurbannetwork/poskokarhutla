-- 0110: meja 'rehab' boleh tanpa kaji cepat induk (KEPUTUSAN-AWAL F0-3; riset/5 temuan 9). 0026 tidak disunting (migrasi_beku.json).
-- Yang berubah HANYA: CHECK kaji_id (rehab boleh NULL; meja lain tetap wajib NULL), trigger tautan (hanya bila kaji_id diisi),
-- dan indeks unik baru untuk rehab tanpa induk per (prov, kab, kejadian_ref). Kolom, CHECK lain, indeks lain, trigger lain disalin persis dari 0026.
-- Idempoten: sisa tabel cadangan dari jalan terpotong dibuang dulu. CHECK baru hanya lebih longgar dari yang lama, jadi semua baris lama lolos.
-- meja_jejak dicadangkan karena DROP TABLE menjalankan ON DELETE CASCADE. Trigger meja_stok_sah tidak disentuh (badannya merujuk meja_catatan menurut nama).
PRAGMA defer_foreign_keys = true;
DROP TABLE IF EXISTS meja_catatan_cadang;
DROP TABLE IF EXISTS meja_jejak_cadang;

CREATE TABLE meja_catatan_cadang AS SELECT * FROM meja_catatan;
CREATE TABLE meja_jejak_cadang AS SELECT * FROM meja_jejak;
-- Urutan: salin ke cadangan, buang tabel lama, bangun tabel baru BERNAMA meja_catatan, isi dari cadangan. Mengisi SESUDAH tabel baru bernama sama itu
-- penting: SQLite hanya menurunkan hitungan pelanggaran FK yang ditunda (karena DROP) saat baris induk disisipkan; mengisi tabel _baru lalu RENAME
-- membuat COMMIT gagal 'FOREIGN KEY constraint failed' bila meja_stok/meja_jejak berisi (dibuktikan unit_skema R1).
DROP TABLE meja_catatan;
CREATE TABLE meja_catatan (
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
  klien_id TEXT CHECK (klien_id IS NULL OR length(klien_id) BETWEEN 8 AND 40),
  CHECK ((meja = 'kaji_cepat' AND status IN ('dilaporkan', 'diverifikasi', 'masuk_jitupasna'))
    OR (meja = 'logistik' AND status IN ('diminta', 'disetujui', 'dikirim', 'diterima'))
    OR (meja = 'dsp' AND status IN ('diajukan', 'disetujui', 'cair', 'spj', 'selesai', 'ditolak'))
    OR (meja = 'rehab' AND status IN ('jitupasna', 'usulan', 'disetujui', 'cair', 'dibangun', 'selesai', 'ditolak'))
    OR (meja IN ('renkon', 'destana', 'gudang') AND status = 'tercatat')),
  CHECK (meja = 'rehab' OR kaji_id IS NULL),
  CHECK ((meja = 'gudang') = (stok IS NOT NULL)),
  CHECK (meja NOT IN ('kaji_cepat', 'destana') OR desa IS NOT NULL),
  CHECK (meja != 'destana' OR kec IS NOT NULL)
);
INSERT INTO meja_catatan (id, meja, prov, kab, kec, desa, data, status, dibuat, diubah, oleh, petugas_id, dummy, kaji_id, stok, klien_id)
  SELECT id, meja, prov, kab, kec, desa, data, status, dibuat, diubah, oleh, petugas_id, dummy, kaji_id, stok, klien_id FROM meja_catatan_cadang;
DROP TABLE meja_catatan_cadang;
INSERT INTO meja_jejak (id, catatan_id, dari, ke, waktu, oleh, catatan, dummy, klien_id, diterima)
  SELECT id, catatan_id, dari, ke, waktu, oleh, catatan, dummy, klien_id, diterima FROM meja_jejak_cadang WHERE id NOT IN (SELECT id FROM meja_jejak);
DROP TABLE meja_jejak_cadang;

CREATE INDEX IF NOT EXISTS meja_catatan_wilayah ON meja_catatan (meja, prov, kab, status);
CREATE UNIQUE INDEX IF NOT EXISTS meja_catatan_klien ON meja_catatan (oleh, klien_id) WHERE klien_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS meja_rehab_satu ON meja_catatan (kaji_id) WHERE meja = 'rehab';
CREATE UNIQUE INDEX IF NOT EXISTS meja_gudang_unik ON meja_catatan (prov, kab, lower(json_extract(data, '$.gudang')), json_extract(data, '$.barang')) WHERE meja = 'gudang';
CREATE UNIQUE INDEX IF NOT EXISTS meja_rehab_kejadian ON meja_catatan (prov, kab, json_extract(data, '$.kejadian_ref'))
  WHERE meja = 'rehab' AND kaji_id IS NULL AND json_extract(data, '$.kejadian_ref') IS NOT NULL;

-- tautan ke kaji cepat tetap dijaga, tetapi hanya bila kaji_id diisi
CREATE TRIGGER IF NOT EXISTS meja_rehab_tautan BEFORE INSERT ON meja_catatan
WHEN NEW.meja = 'rehab' AND NEW.kaji_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM meja_catatan k WHERE k.id = NEW.kaji_id AND k.meja = 'kaji_cepat' AND k.status = 'masuk_jitupasna' AND k.prov = NEW.prov AND k.kab = NEW.kab AND k.dummy = NEW.dummy)
BEGIN
  SELECT RAISE(ABORT, 'rehab harus tertaut ke kaji cepat masuk_jitupasna di kabupaten yang sama');
END;
-- disalin persis dari 0026:68-77
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
