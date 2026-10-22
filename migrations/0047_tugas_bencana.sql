-- Mesin tugas multi-bahaya (docs/bnpb/RANCANGAN-API-PADAM.md butir 7, diperluas): jenis bencana per tugas.
-- Tabel samping 1:1 (pola 0027/0041) karena ALTER TABLE ADD COLUMN tidak idempoten di SQLite; tugas_api tidak disentuh.
-- Baris TIDAK ADA = karhutla (semua tugas lama). Tanpa tabel ini Worker tetap jalan seperti dulu: hanya tugas karhutla yang dibuat.
-- reda = jumlah versi berkas berturut-turut yang menunjukkan bahayanya sudah reda/hilang di lokasi tugas (src/tugas_bencana.js, aturan selesai per bahaya).
CREATE TABLE IF NOT EXISTS tugas_bencana (
  tugas_id TEXT PRIMARY KEY REFERENCES tugas_api (id) ON DELETE CASCADE,
  bencana TEXT NOT NULL CHECK (bencana IN ('karhutla', 'banjir', 'gempa', 'gunungapi', 'cuaca', 'kekeringan', 'udara')),
  reda INTEGER NOT NULL DEFAULT 0 CHECK (reda >= 0)
);
CREATE INDEX IF NOT EXISTS tugas_bencana_jenis ON tugas_bencana (bencana);
