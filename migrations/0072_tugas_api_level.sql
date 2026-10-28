-- Hotfix kuota baca D1 (28 Okt 2026): aturan karhutla di src/peringatan.js (tiap menit) menyaring tugas_api level 3 yang buka dan bukan dummy
-- sejak waktu tertentu; tanpa indeks ini setiap putaran menyapu tabel (~1,8 juta baris terbaca per hari). Idempoten.
CREATE INDEX IF NOT EXISTS tugas_api_level_buka ON tugas_api (level, status, dummy, dibuat);
