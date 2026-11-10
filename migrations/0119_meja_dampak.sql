-- 0119: meja 'dampak' (Data kejadian dan dampak bencana, Juklak 7/2023 Lampiran I; data/kajian-bnpb/juklak/DATA-DAMPAK.md) + tabel samping meja_kelengkapan. 0118 tidak disunting (migrasi_beku.json).
-- Pola sama dengan 0118: cadangan, buang, bangun tabel BERNAMA sama, isi dari cadangan. Yang berubah: daftar meja di CHECK (meja_catatan, meja_ringkas), status dampak, batas data 20000 huruf KHUSUS dampak (lainnya tetap 6000),
-- larik meja petugas 1..10 (+ trigger meja_petugas_sah), pasangan transisi dampak di meja_catatan_ubah (dilaporkan>diverifikasi>masuk_logbook; kembali ke dilaporkan saat diubah; masuk_logbook>diverifikasi hanya untuk batal terima bila tulis Logbook gagal).
-- Satu kejadian per kabupaten: indeks unik (prov, kab, dummy, jenis, tanggal, nama). meja_kelengkapan = agregat per kabupaten yang dibangun ulang bersama meja_ringkas (tanpa pemindaian tambahan).
PRAGMA defer_foreign_keys = true;
DROP TABLE IF EXISTS meja_catatan_cadang;
DROP TABLE IF EXISTS meja_jejak_cadang;
DROP TABLE IF EXISTS meja_petugas_cadang;
DROP TABLE IF EXISTS meja_ringkas_cadang;

CREATE TABLE meja_catatan_cadang AS SELECT * FROM meja_catatan;
CREATE TABLE meja_jejak_cadang AS SELECT * FROM meja_jejak;
CREATE TABLE meja_petugas_cadang AS SELECT * FROM meja_petugas;
CREATE TABLE meja_ringkas_cadang AS SELECT * FROM meja_ringkas;
DROP TABLE meja_catatan;
DROP TABLE meja_petugas;
DROP TABLE meja_ringkas;

CREATE TABLE meja_petugas (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 80),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  meja TEXT NOT NULL CHECK (json_valid(meja) AND json_type(meja) = 'array' AND json_array_length(meja) BETWEEN 1 AND 10),
  kode_sha TEXT NOT NULL UNIQUE CHECK (length(kode_sha) = 64 AND kode_sha NOT GLOB '*[^0-9a-f]*'),
  dibuat INTEGER NOT NULL,
  dicabut INTEGER CHECK (dicabut IS NULL OR dicabut >= dibuat),
  oleh TEXT,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
INSERT INTO meja_petugas (id, nama, prov, kab, meja, kode_sha, dibuat, dicabut, oleh, dummy)
  SELECT id, nama, prov, kab, meja, kode_sha, dibuat, dicabut, oleh, dummy FROM meja_petugas_cadang;
DROP TABLE meja_petugas_cadang;
CREATE TRIGGER IF NOT EXISTS meja_petugas_sah BEFORE INSERT ON meja_petugas
WHEN EXISTS (SELECT 1 FROM json_each(NEW.meja) WHERE value NOT IN ('kaji_cepat', 'logistik', 'dsp', 'renkon', 'destana', 'rehab', 'gudang', 'pengungsi', 'klaster', 'dampak'))
  OR json_array_length(NEW.meja) != (SELECT count(DISTINCT value) FROM json_each(NEW.meja))
BEGIN
  SELECT RAISE(ABORT, 'meja petugas tidak sah atau berulang');
END;

CREATE TABLE meja_catatan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  meja TEXT NOT NULL CHECK (meja IN ('kaji_cepat', 'logistik', 'dsp', 'renkon', 'destana', 'rehab', 'gudang', 'pengungsi', 'pengaduan', 'klaster', 'risiko', 'dampak')),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  kec TEXT CHECK (kec IS NULL OR length(kec) BETWEEN 2 AND 60),
  desa TEXT CHECK (desa IS NULL OR length(desa) BETWEEN 2 AND 80),
  data TEXT NOT NULL CHECK (json_valid(data) AND json_type(data) = 'object' AND length(data) <= CASE WHEN meja = 'dampak' THEN 20000 ELSE 6000 END),
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
    OR (meja = 'pengaduan' AND status IN ('register', 'telaah', 'diteruskan', 'tindak_lanjut', 'selesai', 'ditolak'))
    OR (meja = 'dampak' AND status IN ('dilaporkan', 'diverifikasi', 'masuk_logbook'))
    OR (meja IN ('renkon', 'destana', 'gudang', 'pengungsi', 'klaster', 'risiko') AND status = 'tercatat')),
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

CREATE TABLE meja_ringkas (
  meja TEXT NOT NULL CHECK (meja IN ('kaji_cepat', 'logistik', 'dsp', 'renkon', 'destana', 'rehab', 'gudang', 'pengungsi', 'pengaduan', 'klaster', 'risiko', 'dampak')),
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
INSERT INTO meja_ringkas (meja, prov, kab, status, dummy, n, bahaya, jumlah, terbaru)
  SELECT meja, prov, kab, status, dummy, n, bahaya, jumlah, terbaru FROM meja_ringkas_cadang;
DROP TABLE meja_ringkas_cadang;

CREATE INDEX IF NOT EXISTS meja_catatan_wilayah ON meja_catatan (meja, prov, kab, status);
CREATE UNIQUE INDEX IF NOT EXISTS meja_catatan_klien ON meja_catatan (oleh, klien_id) WHERE klien_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS meja_rehab_satu ON meja_catatan (kaji_id) WHERE meja = 'rehab';
CREATE UNIQUE INDEX IF NOT EXISTS meja_gudang_unik ON meja_catatan (prov, kab, lower(json_extract(data, '$.gudang')), json_extract(data, '$.barang')) WHERE meja = 'gudang';
CREATE UNIQUE INDEX IF NOT EXISTS meja_rehab_kejadian ON meja_catatan (prov, kab, json_extract(data, '$.kejadian_ref'))
  WHERE meja = 'rehab' AND kaji_id IS NULL AND json_extract(data, '$.kejadian_ref') IS NOT NULL;
-- satu catatan per tempat pengungsian per hari (Juklak 9/2023 Format 2), nomor register dan kode risiko per unit per tahun unik
CREATE UNIQUE INDEX IF NOT EXISTS meja_pengungsi_hari ON meja_catatan (prov, kab, lower(json_extract(data, '$.nama_tempat')), json_extract(data, '$.tgl_data')) WHERE meja = 'pengungsi';
CREATE UNIQUE INDEX IF NOT EXISTS meja_pengaduan_register ON meja_catatan (json_extract(data, '$.nomor_register')) WHERE meja = 'pengaduan';
CREATE UNIQUE INDEX IF NOT EXISTS meja_risiko_kode ON meja_catatan (lower(json_extract(data, '$.unit_pemilik')), json_extract(data, '$.tahun'), json_extract(data, '$.kode')) WHERE meja = 'risiko';

CREATE TRIGGER IF NOT EXISTS meja_rehab_tautan BEFORE INSERT ON meja_catatan
WHEN NEW.meja = 'rehab' AND NEW.kaji_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM meja_catatan k WHERE k.id = NEW.kaji_id AND k.meja = 'kaji_cepat' AND k.status = 'masuk_jitupasna' AND k.prov = NEW.prov AND k.kab = NEW.kab AND k.dummy = NEW.dummy)
BEGIN
  SELECT RAISE(ABORT, 'rehab harus tertaut ke kaji cepat masuk_jitupasna di kabupaten yang sama');
END;
CREATE TRIGGER IF NOT EXISTS meja_catatan_ubah BEFORE UPDATE ON meja_catatan
WHEN NEW.meja != OLD.meja OR NEW.prov != OLD.prov OR NEW.kab != OLD.kab OR NEW.kaji_id IS NOT OLD.kaji_id
  OR (NEW.status != OLD.status AND (OLD.meja || ':' || OLD.status || '>' || NEW.status) NOT IN (
    'kaji_cepat:dilaporkan>diverifikasi', 'kaji_cepat:diverifikasi>masuk_jitupasna',
    'logistik:diminta>disetujui', 'logistik:disetujui>dikirim', 'logistik:dikirim>diterima',
    'dsp:diajukan>disetujui', 'dsp:diajukan>ditolak', 'dsp:disetujui>cair', 'dsp:cair>spj', 'dsp:spj>selesai',
    'rehab:jitupasna>usulan', 'rehab:usulan>disetujui', 'rehab:usulan>ditolak', 'rehab:disetujui>cair', 'rehab:cair>dibangun', 'rehab:dibangun>selesai',
    'pengaduan:register>telaah', 'pengaduan:telaah>diteruskan', 'pengaduan:telaah>ditolak', 'pengaduan:diteruskan>tindak_lanjut', 'pengaduan:tindak_lanjut>selesai',
    'dampak:dilaporkan>diverifikasi', 'dampak:diverifikasi>masuk_logbook', 'dampak:diverifikasi>dilaporkan', 'dampak:masuk_logbook>dilaporkan', 'dampak:masuk_logbook>diverifikasi'))
BEGIN
  SELECT RAISE(ABORT, 'perubahan meja, wilayah, atau status tidak sah');
END;

-- satu kejadian dampak per kabupaten/kota (kejadian = jenis + tanggal + nama); impor dan isian ulang tidak menggandakan
CREATE UNIQUE INDEX IF NOT EXISTS meja_dampak_kejadian ON meja_catatan (prov, kab, dummy, json_extract(data, '$.jenis'), json_extract(data, '$.tanggal'), lower(json_extract(data, '$.nama_kejadian'))) WHERE meja = 'dampak';

CREATE TABLE IF NOT EXISTS meja_kelengkapan (
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  dummy INTEGER NOT NULL CHECK (dummy IN (0, 1)),
  n INTEGER NOT NULL CHECK (n > 0),
  persen_jumlah INTEGER NOT NULL CHECK (persen_jumlah BETWEEN 0 AND 100 * n),
  inti_lengkap INTEGER NOT NULL CHECK (inti_lengkap BETWEEN 0 AND n),
  belum INTEGER NOT NULL CHECK (belum BETWEEN 0 AND n),
  kosong TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(kosong) AND json_type(kosong) = 'object'),
  terbaru INTEGER NOT NULL,
  PRIMARY KEY (prov, kab, dummy)
) WITHOUT ROWID;
