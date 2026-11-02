-- (di produksi pernah tercatat sebagai 0101_pengingat_lapangan.sql dari salinan iCloud; ulangan sesudah sukses aman, lihat baris 3)
-- Pengingat: jenis bertambah lapangan_absen dan lapangan_logbook (petugas belum absen masuk / belum isi logbook, src/pengingat.js, modul /petugas tahap C).
-- CHECK SQLite tidak bisa di-ALTER, jadi pengingat dibangun ulang lewat salinan tabel (pola 0091). Urutan: salin, buang, buat ulang, isi dari salinan, buang salinan.
-- TIDAK idempoten di bagian ini, dan sengaja: ulangan SETELAH penerapan sukses aman (salinan sudah terbuang, isi dibangun ulang sama persis).
-- Ulangan setelah penerapan TERPUTUS gagal keras di CREATE TABLE pengingat_cad karena salinan masih ada; periksa pengingat_cad dengan tangan sebelum melanjutkan.
CREATE TABLE pengingat_cad AS SELECT * FROM pengingat;
DROP TABLE pengingat;
CREATE TABLE pengingat (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  jenis TEXT NOT NULL CHECK (jenis IN ('mou_relawan', 'pks_riset', 'logistik_lambat', 'dsp_spj', 'renkon', 'rehab_macet', 'stok_rendah', 'bantuan_terbuka', 'prioritas_dampak', 'logbook_lanjutan', 'sensor_ambang', 'sensor_lapor', 'lapangan_absen', 'lapangan_logbook')),
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
  SELECT id, jenis, sumber_id, keadaan, tanggal, judul, rincian, muatan, prov, kab, status, dikirim_pada, oleh, dibuat, dummy FROM pengingat_cad ORDER BY rowid;
DROP TABLE pengingat_cad;
CREATE INDEX IF NOT EXISTS pengingat_status ON pengingat (status, jenis, dibuat);
