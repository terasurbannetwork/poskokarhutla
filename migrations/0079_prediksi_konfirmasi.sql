-- /prediksi fase 2: konfirmasi lapangan atas prediksi (docs/prediksi/RANCANGAN.md). Satu baris per (kab, tanggal, kode, pelapor);
-- kirim ulang = timpa (upsert). kode_regu = id regu (bukan kodenya) atau 'admin' untuk sesi staf; laporan warga TIDAK disimpan di sini,
-- GET menggabungkannya dari `laporan` (positif lemah saja).
CREATE TABLE IF NOT EXISTS prediksi_konfirmasi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 80),
  tanggal TEXT NOT NULL CHECK (length(tanggal) = 10 AND tanggal GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  kode TEXT NOT NULL CHECK (kode IN ('HJN', 'API', 'BNJ', 'LSR', 'ASP', 'ROB')),
  terjadi INTEGER NOT NULL CHECK (terjadi IN (0, 1)),
  nilai REAL,
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  sumber TEXT NOT NULL CHECK (sumber IN ('regu', 'warga')),
  kode_regu TEXT,
  dibuat TEXT NOT NULL,
  UNIQUE (kab, tanggal, kode, kode_regu)
);
CREATE INDEX IF NOT EXISTS prediksi_konfirmasi_tgl ON prediksi_konfirmasi (tanggal);
