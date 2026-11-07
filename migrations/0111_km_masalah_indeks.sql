-- Kemitraan Kampus KM-C03: indeks daftar masalah. Idempoten (IF NOT EXISTS); tidak menyentuh data.
-- 1) saring bahaya + aspek + status (daftar ?b=&a=&status=, saran gabung sekategori).
-- 2) urutan baku daftar (kelas, skor, dibuat) persis ekspresi ORDER BY src/kemitraan_masalah.js, sebagian untuk baris bukan dummy.
CREATE INDEX IF NOT EXISTS idx_km_masalah_kategori ON km_masalah (bahaya, aspek, status);
CREATE INDEX IF NOT EXISTS idx_km_masalah_urut ON km_masalah ((kelas IS NULL), kelas, (skor IS NULL), skor DESC, dibuat DESC) WHERE dummy = 0;
