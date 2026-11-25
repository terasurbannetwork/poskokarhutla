-- 0176: EW-03 (data/kajian-bnpb/ews/DESAIN-TEKNIS.md, KEPUTUSAN-EWS.md Q3 bawaan sementara). sensor_alat.jenis ditambah 'geofon' (getaran mm/s, frekuensi Hz).
-- CHECK SQLite tidak bisa di-ALTER, jadi sensor_alat dibangun ulang. sensor_baca dan sensor_lapor punya REFERENCES sensor_alat (id) (0089) dan D1 menyalakan FK:
-- DROP induk yang masih punya anak dihitung pelanggaran FK walau induk dibuat lagi dengan id yang sama. Versi awal dengan PRAGMA defer_foreign_keys = ON
-- ditolak D1 Miniflare saat pengembangan (sekali coba, tidak dijadikan uji). ALTER RENAME induk lama menulis ulang FK anak ke nama sementara. Jadi kedua anak ikut dibangun ulang:
-- salin anak, buang anak, bangun ulang induk (buat baru, salin, buang lama, ubah nama), buat anak lagi dengan DDL 0089 apa adanya, isi dari salinan, buang salinan.
-- Ulangan sesudah penerapan SUKSES aman (salinan sudah terbuang, isi dibangun ulang sama). Ulangan sesudah penerapan TERPUTUS sengaja gagal keras di CREATE TABLE
-- salinan yang masih ada (sensor_baca_cad, sensor_lapor_cad, sensor_alat_baru): periksa dan pulihkan dengan tangan, salinan tidak pernah dibuang diam-diam.
-- 0089 tidak punya indeks atau trigger di ketiga tabel.
-- Komentar `--` sengaja di baris sendiri (pecah() di tests/warga/_bantu.mjs memotong di baris berakhir ';').
CREATE TABLE sensor_baca_cad AS SELECT * FROM sensor_baca;
CREATE TABLE sensor_lapor_cad AS SELECT * FROM sensor_lapor;
DROP TABLE sensor_baca;
DROP TABLE sensor_lapor;
CREATE TABLE sensor_alat_baru (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 3 AND 40 AND id NOT GLOB '*[^A-Za-z0-9_-]*'),
  jenis TEXT NOT NULL CHECK (jenis IN ('tma', 'hujan', 'longsor', 'gambut', 'gas', 'gateway', 'geofon')),
  kab TEXT CHECK (kab IS NULL OR length(kab) BETWEEN 2 AND 60),
  desa TEXT CHECK (desa IS NULL OR length(desa) BETWEEN 1 AND 60),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94 AND 142),
  ambang TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(ambang) AND json_type(ambang) = 'object' AND length(ambang) <= 1000),
  kunci_hash TEXT NOT NULL CHECK (length(kunci_hash) BETWEEN 16 AND 64 AND kunci_hash NOT GLOB '*[^0-9a-f]*'),
  aktif INTEGER NOT NULL DEFAULT 1 CHECK (aktif IN (0, 1)),
  dibuat INTEGER NOT NULL
);
INSERT INTO sensor_alat_baru (id, jenis, kab, desa, lat, lon, ambang, kunci_hash, aktif, dibuat)
  SELECT id, jenis, kab, desa, lat, lon, ambang, kunci_hash, aktif, dibuat FROM sensor_alat;
DROP TABLE sensor_alat;
ALTER TABLE sensor_alat_baru RENAME TO sensor_alat;
CREATE TABLE sensor_baca (
  alat_id TEXT NOT NULL REFERENCES sensor_alat (id),
  waktu INTEGER NOT NULL,
  nilai TEXT NOT NULL CHECK (json_valid(nilai) AND json_type(nilai) = 'object' AND length(nilai) <= 600),
  baterai REAL CHECK (baterai IS NULL OR baterai BETWEEN 0 AND 100),
  rssi REAL CHECK (rssi IS NULL OR rssi BETWEEN -200 AND 0),
  diterima INTEGER NOT NULL,
  PRIMARY KEY (alat_id, waktu)
) WITHOUT ROWID;
CREATE TABLE sensor_lapor (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  alat_id TEXT NOT NULL REFERENCES sensor_alat (id),
  waktu INTEGER NOT NULL,
  pengirim_node TEXT NOT NULL CHECK (length(pengirim_node) BETWEEN 1 AND 40),
  teks TEXT NOT NULL CHECK (length(teks) BETWEEN 1 AND 500),
  diterima INTEGER NOT NULL
);
INSERT INTO sensor_baca (alat_id, waktu, nilai, baterai, rssi, diterima) SELECT alat_id, waktu, nilai, baterai, rssi, diterima FROM sensor_baca_cad;
INSERT INTO sensor_lapor (id, alat_id, waktu, pengirim_node, teks, diterima) SELECT id, alat_id, waktu, pengirim_node, teks, diterima FROM sensor_lapor_cad;
DROP TABLE sensor_baca_cad;
DROP TABLE sensor_lapor_cad;
