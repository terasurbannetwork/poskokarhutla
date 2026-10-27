-- Laporan petugas bertoken (/lacak, src/penugasan.js -> laporPetugas di src/instansi.js) dan alasan "bukan api".
-- Hanya tabel baru, CREATE IF NOT EXISTS: aman diulang. tugas_isian dan instansi_media TIDAK diubah (ALTER ADD COLUMN tidak idempoten di SQLite): tabel samping 1:1 (pola 0041/0046/0055).
-- Ikut terhapus bersama isian/medianya (ON DELETE CASCADE, retensi tugas 180 hari). penugasan_id sengaja tanpa REFERENCES: penugasan dummy dihapus lebih dulu tanpa menghapus jejak isiannya.

-- Satu baris per isian yang dikirim lewat tautan petugas (penugasan_id) dan/atau membawa alasan bukan api (tugas karhutla). penugasan_id NULL = dikirim akun instansi.
CREATE TABLE IF NOT EXISTS isian_lapangan (
  isian_id TEXT PRIMARY KEY REFERENCES tugas_isian (id) ON DELETE CASCADE,
  penugasan_id TEXT CHECK (penugasan_id IS NULL OR length(penugasan_id) = 16),
  alasan_bukan_api TEXT CHECK (alasan_bukan_api IS NULL OR alasan_bukan_api IN ('tidak_ada_bekas', 'bekas_lama', 'sumber_panas_lain')),
  CHECK (penugasan_id IS NOT NULL OR alasan_bukan_api IS NOT NULL)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS isian_lapangan_penugasan ON isian_lapangan (penugasan_id);

-- Berkas yang diunggah lewat tautan petugas: hanya penugasan pengunggahnya yang boleh merujuknya di isian.
CREATE TABLE IF NOT EXISTS media_petugas (
  media_id TEXT PRIMARY KEY REFERENCES instansi_media (id) ON DELETE CASCADE,
  penugasan_id TEXT NOT NULL CHECK (length(penugasan_id) = 16)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS media_petugas_penugasan ON media_petugas (penugasan_id);

-- Penanda kapan aturan tahan "bukan api" beralasan mulai berlaku (src/instansi.js TAHAN_BUKAN_API berlaku begitu tabel di atas ada).
-- Dibaca catatan Kinerja (src/sla.js) dan uji lapangan (src/uji_lapangan.js agregat): angka sebelum dan sesudah tanggal ini tidak sebanding langsung. OR IGNORE: diulang tidak menggeser tanggal.
INSERT OR IGNORE INTO tugas_meta (kunci, nilai) VALUES ('tahan_bukan_api_sejak', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
