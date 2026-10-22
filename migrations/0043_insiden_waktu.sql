-- Jam deteksi pertama per tugas api + alarm Himawari + kunci idempoten kabar seketika (src/sla.js, src/alarm_himawari.js, src/kabar.js). Waktu = ms epoch UTC.
-- ALTER TABLE ADD COLUMN tidak idempoten di SQLite (pola 0013/0015): wrangler mencatat migrasi yang sudah jalan, jadi berkas ini diterapkan sekali.
-- Kode Worker tidak pernah menyebut kolom/tabel ini di jalur yang sama dengan tulisan lama; sebelum 0043 diterapkan semua fitur turunannya dilewati rapi.
ALTER TABLE tugas_api ADD COLUMN terdeteksi_awal INTEGER;
ALTER TABLE tugas_api ADD COLUMN himawari_awal INTEGER;
ALTER TABLE tugas_api ADD COLUMN sumber_awal TEXT CHECK (sumber_awal IS NULL OR sumber_awal IN ('viirs', 'himawari'));

-- Alarm Himawari: perkiraan lokasi api dalam radius 2 km (BUKAN titik api). siaga -> terkunci (VIIRS membuat tugas dalam 4 km) atau hilang (6 jam tanpa pindaian dan tanpa VIIRS).
CREATE TABLE IF NOT EXISTS alarm_himawari (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  radius_m INTEGER NOT NULL DEFAULT 2000 CHECK (radius_m > 0),
  pertama INTEGER NOT NULL,
  terakhir INTEGER NOT NULL,
  n_pindai INTEGER NOT NULL DEFAULT 1 CHECK (n_pindai >= 1),
  frp REAL,
  status TEXT NOT NULL DEFAULT 'siaga' CHECK (status IN ('siaga', 'terkunci', 'hilang')),
  tugas_id TEXT CHECK (tugas_id IS NULL OR length(tugas_id) = 16),
  terkunci_pada INTEGER,
  dikabarkan_pada INTEGER
);
CREATE INDEX IF NOT EXISTS alarm_himawari_status ON alarm_himawari (status, terakhir);

-- Satu kejadian satu kabar per penerima: INSERT OR IGNORE dulu, kirim hanya bila baris baru tercipta. Retensi 30 hari.
CREATE TABLE IF NOT EXISTS kabar_terkirim (
  kunci TEXT NOT NULL CHECK (length(kunci) BETWEEN 1 AND 80),
  penerima TEXT NOT NULL CHECK (length(penerima) BETWEEN 1 AND 120),
  waktu INTEGER NOT NULL,
  PRIMARY KEY (kunci, penerima)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS kabar_terkirim_waktu ON kabar_terkirim (waktu);
