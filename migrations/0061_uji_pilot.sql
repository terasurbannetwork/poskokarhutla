-- Laporan uji pilot SIPPA Kalteng lewat /uji-pilot tanpa login (keputusan SIPPA 59, src/uji_pilot.js). Satu baris = satu foto bukti satu tahap.
-- Daftar tahap dan petak HARUS sama dengan public/pipa/uji_pilot_spek.js (dijaga tests/warga/uji_pilot.test.mjs). Waktu = ms epoch UTC. Idempoten.
-- Foto di R2 MEDIA: uji-pilot/<id> dan uji-pilot/<id>_t (metadata EXIF dibuang sebelum disimpan; GPS dan waktu EXIF hanya dicek, dicatat di kolom).
CREATE TABLE IF NOT EXISTS uji_pilot_lapor (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  lokasi INTEGER NOT NULL CHECK (lokasi BETWEEN 1 AND 10),
  tahap TEXT NOT NULL CHECK (tahap IN ('tiba', 'pompa', 'air_mengalir', 'petak_sebelum', 'injeksi', 'petak_sesudah', 'petak_24j', 'bongkar', 'kendala')),
  petak TEXT CHECK (petak IS NULL OR petak IN ('L1', 'L2', 'K1', 'K2')),
  isi TEXT NOT NULL DEFAULT '{}' CHECK (length(isi) <= 4000 AND json_valid(isi)),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 1000),
  nama TEXT CHECK (nama IS NULL OR length(nama) <= 60),
  regu TEXT CHECK (regu IS NULL OR length(regu) <= 80),
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  akurasi INTEGER NOT NULL CHECK (akurasi BETWEEN 0 AND 1000),
  jarak_petak_m INTEGER CHECK (jarak_petak_m IS NULL OR jarak_petak_m >= 0),
  diambil INTEGER NOT NULL,
  exif_waktu INTEGER NOT NULL DEFAULT 0 CHECK (exif_waktu IN (0, 1)),
  exif_jarak INTEGER CHECK (exif_jarak IS NULL OR exif_jarak >= 0),
  gps_curiga TEXT CHECK (gps_curiga IS NULL OR length(gps_curiga) <= 600),
  mime TEXT CHECK (mime IS NULL OR mime IN ('image/jpeg', 'image/webp')),
  ukuran INTEGER CHECK (ukuran IS NULL OR ukuran BETWEEN 1 AND 8388608),
  sha256 TEXT CHECK (sha256 IS NULL OR length(sha256) = 64),
  dibuat INTEGER NOT NULL,
  ip_hash TEXT,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (dummy = 1 OR (mime IS NOT NULL AND ukuran IS NOT NULL AND sha256 IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS uji_pilot_lapor_lokasi ON uji_pilot_lapor (lokasi, dibuat);
CREATE INDEX IF NOT EXISTS uji_pilot_lapor_ip ON uji_pilot_lapor (ip_hash, dibuat);
