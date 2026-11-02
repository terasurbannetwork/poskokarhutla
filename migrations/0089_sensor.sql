-- Sensor lapangan (src/sensor.js, kontrak L1). Idempoten. Waktu = milidetik epoch UTC.
-- Kunci HMAC alat TIDAK disimpan: kunci_alat = HMAC-SHA256(secret SENSOR_KUNCI_INDUK, id alat) dalam hex 64, dipakai sebagai string UTF-8 oleh firmware/gateway.
-- kunci_hash hanya sidik jari audit (16 hex pertama SHA-256 dari kunci_alat) untuk mencocokkan alat dengan kunci yang dicetak; tidak dipakai memverifikasi.
-- ambang = {"<kunci nilai>": {"waspada": n, "siaga": n, "awas": n}}, terlewati bila nilai >= n; nilai null tidak dinilai. jenis 'gateway' = gateway LoRa/mesh yang boleh memakai /api/sensor/lapor.
CREATE TABLE IF NOT EXISTS sensor_alat (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 3 AND 40 AND id NOT GLOB '*[^A-Za-z0-9_-]*'),
  jenis TEXT NOT NULL CHECK (jenis IN ('tma', 'hujan', 'longsor', 'gambut', 'gas', 'gateway')),
  kab TEXT CHECK (kab IS NULL OR length(kab) BETWEEN 2 AND 60),
  desa TEXT CHECK (desa IS NULL OR length(desa) BETWEEN 1 AND 60),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94 AND 142),
  ambang TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(ambang) AND json_type(ambang) = 'object' AND length(ambang) <= 1000),
  kunci_hash TEXT NOT NULL CHECK (length(kunci_hash) BETWEEN 16 AND 64 AND kunci_hash NOT GLOB '*[^0-9a-f]*'),
  aktif INTEGER NOT NULL DEFAULT 1 CHECK (aktif IN (0, 1)),
  dibuat INTEGER NOT NULL
);

-- waktu = waktu ukur (waktu_asli bila gateway mengirim ulang bacaan tertunda, selain itu waktu kirim); diterima = waktu server menerima (audit; batas laju ada di laju_bnpb).
CREATE TABLE IF NOT EXISTS sensor_baca (
  alat_id TEXT NOT NULL REFERENCES sensor_alat (id),
  waktu INTEGER NOT NULL,
  nilai TEXT NOT NULL CHECK (json_valid(nilai) AND json_type(nilai) = 'object' AND length(nilai) <= 600),
  baterai REAL CHECK (baterai IS NULL OR baterai BETWEEN 0 AND 100),
  rssi REAL CHECK (rssi IS NULL OR rssi BETWEEN -200 AND 0),
  diterima INTEGER NOT NULL,
  PRIMARY KEY (alat_id, waktu)
) WITHOUT ROWID;

-- id = 16 hex pertama SHA-256(alat|waktu|node|teks): kiriman ulang yang sama persis = satu baris, teks berbeda = baris berbeda.
-- Laporan teks desa tanpa sinyal (LAPOR lewat radio mesh) dari gateway; antrean untuk Pusdalops ada di pengingat (jenis sensor_lapor).
CREATE TABLE IF NOT EXISTS sensor_lapor (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  alat_id TEXT NOT NULL REFERENCES sensor_alat (id),
  waktu INTEGER NOT NULL,
  pengirim_node TEXT NOT NULL CHECK (length(pengirim_node) BETWEEN 1 AND 40),
  teks TEXT NOT NULL CHECK (length(teks) BETWEEN 1 AND 500),
  diterima INTEGER NOT NULL
);
