-- 0186: sampai 10 foto per laporan orang dicari (pemilik 26 Nov 2026: "Oke ini bisa sampai 10 foto ya").
-- 0185 hanya memuat satu foto (cari_id PRIMARY KEY) dan dibekukan, jadi foto ke-2 sampai ke-10 masuk tabel samping ini; foto pertama tetap di 0185.
-- Berkas di R2 lapor/foto/<foto_id>.jpg (privat). Ikut aturan anonim Q67 yang sama dengan 0185: cron menghapus berkas R2 lalu barisnya.
-- Hanya CREATE ... IF NOT EXISTS; tanpa trigger dan tanpa data contoh. Pemilik yang menerapkan ke D1 produksi (wrangler d1 migrations apply).
CREATE TABLE IF NOT EXISTS lapor_cari_foto_lain (
  cari_id TEXT NOT NULL CHECK (length(cari_id) = 16),
  foto_id TEXT NOT NULL CHECK (length(foto_id) = 16),
  PRIMARY KEY (cari_id, foto_id)
);
