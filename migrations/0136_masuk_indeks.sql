-- 0136: indeks waktu untuk pembersihan berkala Pintu Masuk (PM-04; DESAIN-TEKNIS.md §7). Tanpa indeks, DELETE ... WHERE waktu < ? memindai seluruh tabel (kuota baca D1).
-- Hanya CREATE INDEX IF NOT EXISTS; tidak mengubah data.
CREATE INDEX IF NOT EXISTS mk_kode_dibuat ON mk_kode (dibuat);
CREATE INDEX IF NOT EXISTS mk_sesi_habis ON mk_sesi (habis);
CREATE INDEX IF NOT EXISTS mk_undang_habis ON mk_undang (habis);
CREATE INDEX IF NOT EXISTS mk_masuk_log_waktu ON mk_masuk_log (waktu);
