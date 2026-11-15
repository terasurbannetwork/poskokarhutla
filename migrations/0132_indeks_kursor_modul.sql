-- 0132: indeks kursor untuk GET /api/siklus/ingest/modul (paket Keterpaduan KP-03a; data/kajian-bnpb/keterpaduan/DESAIN-TEKNIS.md).
-- Tiap sumber dibaca per jendela lewat kolom kursornya (waktu, id); tanpa indeks ini tiap panggilan memindai penuh tabelnya (kuota baca D1 Free 5 jt/hari).
-- sippa_log_gelar(tugas_id): penyaring tugas latihan SIPPA (sippa_tugas tidak punya kolom jenis; jenis hanya ada di log gelar).
-- Hanya CREATE INDEX IF NOT EXISTS.
CREATE INDEX IF NOT EXISTS logbook_kejadian_dibuat ON logbook_kejadian (dibuat, id);
CREATE INDEX IF NOT EXISTS sippa_tugas_mulai ON sippa_tugas (mulai, id);
CREATE INDEX IF NOT EXISTS lp_tugas_mulai ON lp_tugas (mulai, id);
CREATE INDEX IF NOT EXISTS lapsus_kejadian_dibuat ON lapsus_kejadian (dibuat);
CREATE INDEX IF NOT EXISTS sippa_log_tugas ON sippa_log_gelar (tugas_id);
