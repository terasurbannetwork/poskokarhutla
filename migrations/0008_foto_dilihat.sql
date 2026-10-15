-- Jumlah dilihat per foto/video (dibuka di rincian), untuk urutan "Paling dilihat" di galeri Foto (pemilik, 15 Okt 2026).
-- Dijalankan sekali oleh wrangler (tabel d1_migrations mencatatnya); ADD COLUMN tidak punya IF NOT EXISTS di SQLite.
ALTER TABLE foto ADD COLUMN dilihat INTEGER NOT NULL DEFAULT 0 CHECK (dilihat >= 0);
