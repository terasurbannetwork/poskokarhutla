-- Logbook Pusdalops mengikuti panduan resmi: jenis kejadian bertambah tiga (gelombang_pasang DIBI 103, tsunami 108, wabah 201).
-- CHECK SQLite tidak bisa di-ALTER, jadi logbook_kejadian dan anaknya logbook_entri dibangun ulang lewat salinan tabel (pola 0070; ALTER ... RENAME memeriksa seluruh skema).
-- Urutan: salin kedua tabel, buang anak lalu induk, buat ulang, isi dari salinan, buang salinan.
-- TIDAK idempoten di bagian ini, dan sengaja: ulangan SETELAH penerapan sukses aman (salinan sudah terbuang, isi dibangun ulang sama persis).
-- Ulangan setelah penerapan TERPUTUS gagal keras di CREATE TABLE ..._cad karena salinan masih ada; itu disengaja supaya satu-satunya salinan data tidak terhapus.
-- Bila itu terjadi, periksa logbook_kejadian_cad dan logbook_entri_cad dengan tangan sebelum melanjutkan.
CREATE TABLE logbook_kejadian_cad AS SELECT * FROM logbook_kejadian;
CREATE TABLE logbook_entri_cad AS SELECT * FROM logbook_entri;
DROP TABLE logbook_entri;
DROP TABLE logbook_kejadian;
CREATE TABLE logbook_kejadian (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  jenis TEXT NOT NULL CHECK (jenis IN ('banjir', 'cuaca', 'kebakaran_permukiman', 'karhutla', 'longsor', 'gempabumi', 'gunungapi', 'kekeringan', 'kecelakaan', 'konflik_sosial', 'lainnya', 'gelombang_pasang', 'tsunami', 'wabah')),
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
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE TABLE logbook_entri (
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
INSERT INTO logbook_kejadian (id, jenis, prov, kab, kec, desa, lat, lon, mulai, status, terakhir, dibuat, diubah, dibuat_oleh, dummy)
  SELECT id, jenis, prov, kab, kec, desa, lat, lon, mulai, status, terakhir, dibuat, diubah, dibuat_oleh, dummy FROM logbook_kejadian_cad ORDER BY rowid;
INSERT INTO logbook_entri (id, kejadian_id, waktu, md, hilang, luka, mengungsi_jiwa, mengungsi_kk, rumah_rb, rumah_rs, rumah_rr, rumah_terendam, luas_ha, kendala, kebutuhan, catatan, sumber_instansi, oleh, dibuat)
  SELECT id, kejadian_id, waktu, md, hilang, luka, mengungsi_jiwa, mengungsi_kk, rumah_rb, rumah_rs, rumah_rr, rumah_terendam, luas_ha, kendala, kebutuhan, catatan, sumber_instansi, oleh, dibuat FROM logbook_entri_cad ORDER BY rowid;
DROP TABLE logbook_entri_cad;
DROP TABLE logbook_kejadian_cad;
CREATE INDEX IF NOT EXISTS logbook_kejadian_kab ON logbook_kejadian (prov, kab, status, terakhir);
CREATE INDEX IF NOT EXISTS logbook_kejadian_pengingat ON logbook_kejadian (status, terakhir);
CREATE INDEX IF NOT EXISTS logbook_kejadian_dummy ON logbook_kejadian (dummy) WHERE dummy = 1;
CREATE INDEX IF NOT EXISTS logbook_entri_kejadian ON logbook_entri (kejadian_id, waktu);
CREATE INDEX IF NOT EXISTS logbook_entri_waktu ON logbook_entri (waktu);
