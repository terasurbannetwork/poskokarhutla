-- 0185: foto orang dicari lewat obrolan (pemilik 26 Nov 2026: "Foto orang dicari"). Satu foto per laporan, boleh dari galeri.
-- Berkas di R2 lapor/foto/<foto_id>.jpg dengan baris lapor_foto (sesi obrolannya); tabel ini hanya menautkan laporan lapor_cari ke foto itu.
-- Tabel samping, bukan kolom di 0177 (migrasi yang sudah ada dibekukan). Ikut aturan anonim Q67: cron menghapus berkas R2 lalu barisnya.
-- Hanya CREATE ... IF NOT EXISTS; tanpa trigger dan tanpa data contoh. Pemilik yang menerapkan ke D1 produksi (wrangler d1 migrations apply).
CREATE TABLE IF NOT EXISTS lapor_cari_foto (
  cari_id TEXT PRIMARY KEY CHECK (length(cari_id) = 16),
  foto_id TEXT NOT NULL CHECK (length(foto_id) = 16)
);
