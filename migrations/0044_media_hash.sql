-- Hash SHA-256 berkas bukti lapangan (rantai kustodi Gakkum; src/instansi.js, src/posko.js, src/operasi_lapangan.js GET /api/ops/bukti).
-- sha256 = hex 64 huruf dari byte yang DISIMPAN ke R2 (sesudah metadata dibuang), dihitung di Worker sebelum put; bisa dicocokkan dengan berkas yang diunduh dari rute media.
-- Baris lama tetap NULL (tidak ditebak). ALTER TABLE ADD COLUMN tidak idempoten di SQLite (pola 0013/0015/0043): wrangler mencatat migrasi yang sudah jalan, berkas ini diterapkan sekali.
-- Kode Worker menulis hash lewat UPDATE terpisah yang menelan "no such column": sebelum 0044 diterapkan unggahan jalan seperti biasa tanpa hash.
ALTER TABLE instansi_media ADD COLUMN sha256 TEXT CHECK (sha256 IS NULL OR (length(sha256) = 64 AND sha256 NOT GLOB '*[^0-9a-f]*'));
ALTER TABLE lapangan ADD COLUMN foto_sha256 TEXT CHECK (foto_sha256 IS NULL OR (length(foto_sha256) = 64 AND foto_sha256 NOT GLOB '*[^0-9a-f]*'));
