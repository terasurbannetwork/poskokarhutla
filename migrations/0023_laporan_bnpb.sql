-- Laporan BNPB yang diketik tim di /laporan-bnpb (src/laporan_bnpb.js): satu baris per (jenis, tanggal), isi = JSON bebas
-- yang sudah dibersihkan server (teks tanpa karakter kontrol, kedalaman dan ukuran dibatasi). Idempoten.
CREATE TABLE IF NOT EXISTS laporan_bnpb (
  jenis TEXT NOT NULL CHECK (jenis IN ('harian', 'presiden')),
  tanggal TEXT NOT NULL CHECK (length(tanggal) = 10),
  isi TEXT NOT NULL CHECK (length(isi) <= 131072),
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL,
  PRIMARY KEY (jenis, tanggal)
);
