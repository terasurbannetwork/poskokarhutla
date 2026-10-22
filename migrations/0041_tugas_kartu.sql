-- Kartu Api + ID insiden stabil + versi berkas terakhir yang diproses (docs/bnpb/RANCANGAN-API-PADAM.md butir 0.3, 1.1).
-- ALTER TABLE ADD COLUMN tidak idempoten di SQLite, jadi insiden dan kartu disimpan di tabel samping 1:1 (pola 0027): CREATE IF NOT EXISTS, aman diulang, tugas_api tidak disentuh.
-- Tanpa tabel ini Worker tetap jalan seperti dulu (pencocokan jarak 2 km, tanpa kartu).

-- Satu baris per tugas. insiden = ID stabil dari pipeline (contoh 62-261022-007); kartu = JSON <= 3000 huruf
-- {insiden, front, masuk, radius_m, luas_aktif, luas_koreksi, tren, konsesi, syarat}, diperbarui tiap putaran. Ikut terhapus bersama tugasnya.
CREATE TABLE IF NOT EXISTS tugas_kartu (
  tugas_id TEXT PRIMARY KEY REFERENCES tugas_api (id) ON DELETE CASCADE,
  insiden TEXT CHECK (insiden IS NULL OR length(insiden) BETWEEN 3 AND 40),
  kartu TEXT CHECK (kartu IS NULL OR (json_valid(kartu) AND length(kartu) <= 3000)),
  diperbarui INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS tugas_kartu_insiden ON tugas_kartu (insiden);

-- Meta kecil pembuat tugas. kunci 'tugas_kompleks_dibuat' = nilai `dibuat` berkas tugas_kompleks.json yang terakhir selesai diproses (satu versi diproses sekali).
CREATE TABLE IF NOT EXISTS tugas_meta (
  kunci TEXT PRIMARY KEY CHECK (length(kunci) BETWEEN 1 AND 40),
  nilai TEXT NOT NULL CHECK (length(nilai) <= 100)
);
