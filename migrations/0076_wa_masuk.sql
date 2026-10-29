-- Kotak masuk WhatsApp untuk laporan harian (src/wa.js, pemilik 29 Okt 2026): tiap pesan ke nomor Fonnte dari pengirim terdaftar = satu baris.
-- Tidak ada balasan ke pengirim. tanggal = tanggal laporan (WIB saat diterima, atau tanggal yang ditulis di awal pesan); jenis dari tagar/kata kunci.
-- Berkas lampiran disimpan di R2 MEDIA kunci `berkas` (wa/...). Pesan hanya bahan: angka masuk laporan setelah diurai dan diperiksa petugas. Idempoten.
CREATE TABLE IF NOT EXISTS wa_masuk (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  diterima    INTEGER NOT NULL,
  tanggal     TEXT    NOT NULL CHECK (length(tanggal) = 10 AND tanggal GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  jenis       TEXT    NOT NULL CHECK (jenis IN ('bencana', 'karhutla')),
  dari        TEXT    NOT NULL,
  nama        TEXT,
  teks        TEXT    CHECK (teks IS NULL OR length(teks) <= 65536),
  berkas      TEXT,
  nama_berkas TEXT,
  tipe        TEXT
);
CREATE INDEX IF NOT EXISTS wa_masuk_tanggal ON wa_masuk(tanggal, jenis);
