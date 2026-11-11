-- 0125: indeks untuk kueri yang memindai penuh dan menghabiskan kuota baca D1 Free (5 jt baris/hari) pada 11 Nov 2026.
-- tugas_api: OR (status = 'buka' OR dibuat > ? OR padam_pada > ?) di /api/monitor dan /api/pantau/ringkas butuh indeks per cabang OR.
-- Hanya CREATE INDEX IF NOT EXISTS.
CREATE INDEX IF NOT EXISTS tugas_api_padam ON tugas_api (padam_pada);
CREATE INDEX IF NOT EXISTS tugas_api_level_dibuat ON tugas_api (level, dibuat);
CREATE INDEX IF NOT EXISTS peringatan_jenis ON peringatan (jenis, dibuat);
CREATE INDEX IF NOT EXISTS gempa_kejadian_aktif ON gempa_kejadian (aktif_hingga);
CREATE INDEX IF NOT EXISTS hujan_baca_t ON hujan_baca (t);
