-- Overlay Foto peta untuk staf (src/foto_lapangan.js) menyaring foto logbook dan uji pilot per waktu. Tanpa indeks ini kueri memindai seluruh tabel; kode tetap jalan tanpanya.
-- Idempoten. Pemilik menerapkannya sendiri ke D1 jarak jauh.
CREATE INDEX IF NOT EXISTS lp_logbook_foto_waktu ON lp_logbook_foto (waktu);
CREATE INDEX IF NOT EXISTS uji_pilot_lapor_diambil ON uji_pilot_lapor (diambil);
