-- Indeks untuk detektor Meja Pantau SOS dan gelar selesai (src/pantau.js sippaLapangan: WHERE jenis IN ('sos', 'selesai') AND diterima > ?). Idempoten.
-- Tanpa ini kueri per baca Meja Pantau memindai seluruh sippa_lapangan (tabel append-only yang terus tumbuh).
CREATE INDEX IF NOT EXISTS idx_sippa_lap_jenis_diterima ON sippa_lapangan (jenis, diterima);
