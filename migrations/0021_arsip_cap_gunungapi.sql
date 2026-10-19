-- Arsip permanen CAP BMKG (src/nowcast.js) dan level gunung api MAGMA (src/gunungapi.js); idempoten.
-- cuaca_nowcast dibersihkan 6 jam sesudah kedaluwarsa; ringkasannya tinggal di sini untuk uji balik (scripts/cuaca/verifikasi.py).
CREATE TABLE IF NOT EXISTS cuaca_arsip (
  id TEXT PRIMARY KEY,            -- <identifier> CAP
  event TEXT NOT NULL,
  tingkat TEXT NOT NULL CHECK (tingkat IN ('Minor','Moderate','Severe','Extreme','Unknown')),   -- severity CAP
  mulai INTEGER NOT NULL,         -- effective, ms epoch UTC
  selesai INTEGER NOT NULL,       -- expires, ms epoch UTC
  bbox TEXT,                      -- JSON [minLon, minLat, maxLon, maxLat] dari SEMUA poligon asli; null bila tanpa poligon
  poligon TEXT,                   -- JSON [[[lon,lat],...],...] disederhanakan: <= 8 cincin x <= 12 titik
  wilayah TEXT NOT NULL,
  prov TEXT NOT NULL,             -- kode provinsi dipisah koma ("" bila tak ada)
  pertama_dilihat INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS cuaca_arsip_mulai ON cuaca_arsip (mulai, id);

-- level terkini tiap gunung api (satu baris per gunung); ditulis hanya bila level/data berubah
CREATE TABLE IF NOT EXISTS gunungapi_level (
  nama TEXT PRIMARY KEY,
  prov TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),   -- 1 Normal, 2 Waspada, 3 Siaga, 4 Awas
  laporan TEXT,                   -- tautan laporan MAGMA tanpa tanda tangan
  diubah INTEGER NOT NULL         -- kapan level ini pertama terlihat, ms epoch UTC
);

-- peristiwa perubahan level (naik = 1 bila level bertambah); sumber untuk src/ews.js nanti
CREATE TABLE IF NOT EXISTS gunungapi_ubah (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL,
  dari INTEGER NOT NULL CHECK (dari BETWEEN 1 AND 4),
  ke INTEGER NOT NULL CHECK (ke BETWEEN 1 AND 4),
  naik INTEGER NOT NULL CHECK (naik IN (0, 1)),
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS gunungapi_ubah_waktu ON gunungapi_ubah (waktu);
