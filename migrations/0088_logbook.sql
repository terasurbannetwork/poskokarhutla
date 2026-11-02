-- Logbook Pusdalops (src/logbook.js, kontrak L1 docs/superpowers/specs/2026-11-01-logbook-pusdalops-design.md). Idempoten.
-- Waktu = milidetik epoch UTC, kecuali mulai (ISO 8601). prov = kode 2 angka, kab = nama (kunci wilayah "prov|nama" dipecah di API).
-- terakhir = waktu SERVER entri terakhir (denormal supaya pengingat 24/72 jam tanpa JOIN); angka dampak di entri = nilai terkini, bukan selisih (NULL = tidak dilaporkan).
CREATE TABLE IF NOT EXISTS logbook_kejadian (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  jenis TEXT NOT NULL CHECK (jenis IN ('banjir', 'cuaca', 'kebakaran_permukiman', 'karhutla', 'longsor', 'gempabumi', 'gunungapi', 'kekeringan', 'kecelakaan', 'konflik_sosial', 'lainnya')),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  kec TEXT CHECK (kec IS NULL OR length(kec) BETWEEN 1 AND 60),
  desa TEXT CHECK (desa IS NULL OR length(desa) BETWEEN 1 AND 60),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94 AND 142),
  mulai TEXT NOT NULL CHECK (length(mulai) BETWEEN 10 AND 30),
  status TEXT NOT NULL DEFAULT 'buka' CHECK (status IN ('buka', 'tutup')),
  terakhir INTEGER NOT NULL,
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dibuat_oleh TEXT CHECK (dibuat_oleh IS NULL OR length(dibuat_oleh) <= 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))   -- 1 = data contoh tombol dummy Super Admin (POST /api/logbook/dummy); entrinya ikut kejadian
);
CREATE INDEX IF NOT EXISTS logbook_kejadian_kab ON logbook_kejadian (prov, kab, status, terakhir);
CREATE INDEX IF NOT EXISTS logbook_kejadian_pengingat ON logbook_kejadian (status, terakhir);
CREATE INDEX IF NOT EXISTS logbook_kejadian_dummy ON logbook_kejadian (dummy) WHERE dummy = 1;

CREATE TABLE IF NOT EXISTS logbook_entri (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kejadian_id TEXT NOT NULL REFERENCES logbook_kejadian (id),
  waktu INTEGER NOT NULL,
  md INTEGER CHECK (md IS NULL OR md >= 0),
  hilang INTEGER CHECK (hilang IS NULL OR hilang >= 0),
  luka INTEGER CHECK (luka IS NULL OR luka >= 0),
  mengungsi_jiwa INTEGER CHECK (mengungsi_jiwa IS NULL OR mengungsi_jiwa >= 0),
  mengungsi_kk INTEGER CHECK (mengungsi_kk IS NULL OR mengungsi_kk >= 0),
  rumah_rb INTEGER CHECK (rumah_rb IS NULL OR rumah_rb >= 0),
  rumah_rs INTEGER CHECK (rumah_rs IS NULL OR rumah_rs >= 0),
  rumah_rr INTEGER CHECK (rumah_rr IS NULL OR rumah_rr >= 0),
  rumah_terendam INTEGER CHECK (rumah_terendam IS NULL OR rumah_terendam >= 0),
  luas_ha REAL CHECK (luas_ha IS NULL OR luas_ha >= 0),
  kendala TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(kendala) AND json_type(kendala) = 'array'),
  kebutuhan TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(kebutuhan) AND json_type(kebutuhan) = 'array'),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 1000),
  sumber_instansi TEXT CHECK (sumber_instansi IS NULL OR length(sumber_instansi) <= 80),
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dibuat INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS logbook_entri_kejadian ON logbook_entri (kejadian_id, waktu);
CREATE INDEX IF NOT EXISTS logbook_entri_waktu ON logbook_entri (waktu);

-- Antrean pengingat (0028) menerima tiga jenis baru: logbook_lanjutan (kejadian buka tanpa entri baru 24/72 jam), sensor_ambang dan sensor_lapor (src/sensor.js).
-- CHECK SQLite tak bisa di-ALTER: tabel dibangun ulang lewat salinan cadangan (pola 0070; tanpa ALTER RENAME, yang memeriksa seluruh skema).
-- TIDAK idempoten di bagian ini, dan sengaja: bila penerapan terputus, CREATE TABLE pengingat_cad gagal keras pada ulangan dan salinan data TETAP ada.
-- Pulihkan manual: bila pengingat belum ada, buat dari definisi di bawah lalu INSERT dari pengingat_cad; baru DROP pengingat_cad. Jangan hapus pengingat_cad lebih dulu.
CREATE TABLE pengingat_cad AS SELECT * FROM pengingat;
DROP TABLE pengingat;
CREATE TABLE pengingat (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  jenis TEXT NOT NULL CHECK (jenis IN ('mou_relawan', 'pks_riset', 'logistik_lambat', 'dsp_spj', 'renkon', 'rehab_macet', 'stok_rendah', 'bantuan_terbuka', 'prioritas_dampak', 'logbook_lanjutan', 'sensor_ambang', 'sensor_lapor')),
  sumber_id TEXT NOT NULL CHECK (length(sumber_id) = 16),
  keadaan TEXT NOT NULL CHECK (length(keadaan) BETWEEN 1 AND 60),
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 3 AND 160),
  rincian TEXT CHECK (rincian IS NULL OR length(rincian) <= 300),
  muatan TEXT CHECK (muatan IS NULL OR length(muatan) <= 600),
  prov TEXT CHECK (prov IS NULL OR (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*')),
  kab TEXT CHECK (kab IS NULL OR length(kab) BETWEEN 2 AND 60),
  status TEXT NOT NULL DEFAULT 'baru' CHECK (status IN ('baru', 'dikirim', 'selesai', 'abaikan')),
  dikirim_pada INTEGER,
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (jenis, sumber_id, keadaan)
);
INSERT INTO pengingat (id, jenis, sumber_id, keadaan, tanggal, judul, rincian, muatan, prov, kab, status, dikirim_pada, oleh, dibuat, dummy)
  SELECT id, jenis, sumber_id, keadaan, tanggal, judul, rincian, muatan, prov, kab, status, dikirim_pada, oleh, dibuat, dummy FROM pengingat_cad;
DROP TABLE pengingat_cad;
CREATE INDEX IF NOT EXISTS pengingat_status ON pengingat (status, jenis, dibuat);
