-- 0172: indeks waktu terbit segel untuk daftar staf 100 terbaru (paket data/kajian-bnpb/segel-dokumen/, SG-02; GET /api/segel).
-- Tanpa indeks ini ORDER BY terbit memindai seluruh tabel segel (gerbang tests/agen/gerbang-d1-pindai.test.mjs). 0171 sudah dibekukan, jadi indeksnya migrasi baru.
-- Hanya CREATE INDEX IF NOT EXISTS. Pemilik yang menerapkan ke D1 produksi bersama 0171 (SG-14).
CREATE INDEX IF NOT EXISTS segel_terbit ON segel (terbit);
