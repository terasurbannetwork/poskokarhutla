-- Keselamatan regu (src/penugasan.js, butir L3): tombol darurat di halaman /lacak. Waktu = ms epoch UTC. Idempoten (IF NOT EXISTS). Tabel baru; tidak menyentuh 0035.
-- Append-only. lat/lon boleh kosong (GPS belum terbaca saat tombol ditekan; tampilan memakai posisi terakhir). Retensi 30 hari di cron bersih-bersih bersama posisi.
-- Tanpa 0041: POST /api/lacak/darurat menjawab 503 sopan, alarm sunyi/rotasi/angin tetap jalan.
CREATE TABLE IF NOT EXISTS penugasan_darurat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  penugasan_id TEXT NOT NULL REFERENCES penugasan (id) ON DELETE CASCADE,
  jenis TEXT NOT NULL CHECK (jenis IN ('cedera', 'terkepung_api', 'tersesat', 'lainnya')),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  akurasi REAL CHECK (akurasi IS NULL OR (akurasi >= 0 AND akurasi <= 5000)),
  pada INTEGER NOT NULL,
  CHECK ((lat IS NULL) = (lon IS NULL))
);
CREATE INDEX IF NOT EXISTS penugasan_darurat_jejak ON penugasan_darurat (penugasan_id, pada DESC);
CREATE INDEX IF NOT EXISTS penugasan_darurat_pada ON penugasan_darurat (pada);
