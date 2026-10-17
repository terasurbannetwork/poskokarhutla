-- Anti GPS palsu (src/gps.js): alasan curiga yang ditemukan Worker saat unggah, dipisah " · ". Kosong = tidak ada tanda.
-- Hanya untuk admin (antrean); tidak pernah ikut kolom publik.
ALTER TABLE foto ADD COLUMN gps_curiga TEXT NOT NULL DEFAULT '' CHECK (length(gps_curiga) <= 600);
