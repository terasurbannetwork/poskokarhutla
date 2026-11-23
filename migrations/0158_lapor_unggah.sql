-- 0158: Lapor Bencana BNPB, unggah video bersambung (K57, K61, D77, D89, D90). Tiket LA-58, LA-61.
-- lapor_unggah: satu baris per unggahan multipart R2 yang belum selesai; bagian = JSON {"<nomor bagian dari 0>": "<etag R2>"} supaya dua bagian serentak
-- tidak saling menimpa (json_set atomik). Baris dibuang saat video masuk laporan, ditolak, atau 24 jam tanpa bagian baru (cron bersih-bersih menit 17, multipart di-abort).
-- Metadata video (jenis, eks, durasi) tinggal di JSON sesi dan lapor_foto (kunci_r2 = lapor/foto/<id>.vid); lapor_foto tidak diubah.
-- Hanya CREATE ... IF NOT EXISTS; tanpa trigger; tanpa ALTER. Waktu = ms epoch UTC. Pemilik yang menerapkan ke D1 produksi.

CREATE TABLE IF NOT EXISTS lapor_unggah (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  wa TEXT NOT NULL,
  kunci_r2 TEXT NOT NULL,
  upload_id TEXT NOT NULL,
  ukuran INTEGER NOT NULL CHECK (ukuran BETWEEN 1000 AND 31457280),
  jumlah INTEGER NOT NULL CHECK (jumlah BETWEEN 1 AND 6),
  bagian TEXT NOT NULL DEFAULT '{}',
  gps TEXT,
  durasi INTEGER,
  bahasa TEXT NOT NULL DEFAULT 'id',
  mulai INTEGER NOT NULL,
  akhir INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lapor_unggah_wa ON lapor_unggah (wa);
CREATE INDEX IF NOT EXISTS lapor_unggah_akhir ON lapor_unggah (akhir);
