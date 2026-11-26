-- 0177: orang dicari lewat obrolan (K105), tambahan pemilik 25 Nov 2026: nama panggilan, nomor yang dihubungi bila ditemukan,
-- dan tempat pelapor menunggu (posko atau alamat dengan nama jalan) supaya petugas tahu ke mana orang itu diantar.
-- foto_id (26 Nov 2026, sebelum 0177 diterapkan di produksi): foto orang dicari, berkas R2 lapor/foto/<id>.jpg dan baris lapor_foto; berkasnya dihapus cron saat anonim Q67.
-- Tabel samping untuk lapor_cari (ALTER ADD COLUMN tidak idempoten). Satu baris per laporan, ikut aturan anonim Q67 (dihapus bersama).
-- Hanya CREATE ... IF NOT EXISTS; tanpa trigger dan tanpa data contoh. Pemilik yang menerapkan ke D1 produksi (wrangler d1 migrations apply).
CREATE TABLE IF NOT EXISTS lapor_cari_temu (
  cari_id TEXT PRIMARY KEY CHECK (length(cari_id) = 16),
  panggilan TEXT CHECK (panggilan IS NULL OR length(panggilan) BETWEEN 2 AND 40),
  nomor_kontak TEXT NOT NULL CHECK (nomor_kontak GLOB '62[0-9]*' AND length(nomor_kontak) BETWEEN 10 AND 15),
  tempat_tunggu TEXT NOT NULL CHECK (length(tempat_tunggu) BETWEEN 5 AND 200),
  foto_id TEXT CHECK (foto_id IS NULL OR length(foto_id) = 16)
);
