-- Indeks staf aktif non-dummy: pemeriksaan Koordalops lain (KU-06, kuKoordalopsLain di src/hak.js) dan daftar staf aktif
-- mencari lewat indeks, bukan memindai seluruh tabel staf (gerbang tests/agen/gerbang-d1-pindai.test.mjs, kuota baca D1).
CREATE INDEX IF NOT EXISTS staf_aktif ON staf(status, dummy);
