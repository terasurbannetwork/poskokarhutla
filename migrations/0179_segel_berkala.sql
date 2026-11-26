-- 0179: segel.jenis ditambah 'berkala' (versi beku Laporan Berkala, LB-07; paket data/kajian-bnpb/segel-dokumen/ D1, D3: tiap titik beku ikut menyegel).
-- CHECK SQLite tidak bisa di-ALTER, jadi segel dibangun ulang. segel_cabut punya REFERENCES segel(kode) (0171) dan D1 menyalakan FK: DROP induk yang masih
-- punya anak dihitung pelanggaran FK, dan ALTER RENAME menulis ulang FK anak ke nama sementara (pelajaran 0176). Jadi anak ikut dibangun ulang, tanpa RENAME:
-- salin induk dan anak, buang anak, buang induk, buat induk dengan DDL 0171 + 'berkala', isi, buat anak dengan DDL 0171 apa adanya, isi, buang salinan, indeks lagi.
-- Ulangan sesudah penerapan SUKSES aman (salinan sudah terbuang, isi dibangun ulang sama). Ulangan sesudah penerapan TERPUTUS sengaja gagal keras di CREATE TABLE
-- salinan yang masih ada (segel_cad, segel_cabut_cad): periksa dan pulihkan dengan tangan, salinan tidak pernah dibuang diam-diam (tanpa DROP IF EXISTS pembuka).
-- 0171 dan 0172 tidak punya trigger; indeks segel_dasar (0171) dan segel_terbit (0172) dibuat lagi di akhir. Pemilik yang menerapkan ke D1 produksi.
-- Komentar `--` sengaja di baris sendiri (pecah() di tests/warga/_bantu.mjs memotong di baris berakhir ';').
CREATE TABLE segel_cad AS SELECT * FROM segel;
CREATE TABLE segel_cabut_cad AS SELECT * FROM segel_cabut;
DROP TABLE segel_cabut;
DROP TABLE segel;
CREATE TABLE segel (
  kode TEXT PRIMARY KEY CHECK (length(kode) = 10 AND kode NOT GLOB '*[^0-9A-HJKMNP-TV-Z]*'),
  jenis TEXT NOT NULL CHECK (jenis IN ('lk', 'lkb', 'pb', 'lj', 'berkala')),
  rujukan TEXT NOT NULL CHECK (length(rujukan) BETWEEN 1 AND 120),
  dasar TEXT NOT NULL CHECK (length(dasar) BETWEEN 1 AND 120),
  versi INTEGER NOT NULL CHECK (versi >= 0),
  sidik TEXT NOT NULL CHECK (length(sidik) = 64 AND sidik NOT GLOB '*[^0-9a-f]*'),
  sidik_berkas TEXT CHECK (sidik_berkas IS NULL OR (length(sidik_berkas) = 64 AND sidik_berkas NOT GLOB '*[^0-9a-f]*')),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 1 AND 160),
  wilayah TEXT CHECK (wilayah IS NULL OR length(wilayah) <= 80),
  periode TEXT NOT NULL CHECK (length(periode) BETWEEN 4 AND 23),
  penerbit TEXT NOT NULL CHECK (length(penerbit) BETWEEN 1 AND 80),
  terbit INTEGER NOT NULL CHECK (terbit > 0),
  UNIQUE (jenis, rujukan)
);
INSERT INTO segel (kode, jenis, rujukan, dasar, versi, sidik, sidik_berkas, judul, wilayah, periode, penerbit, terbit)
  SELECT kode, jenis, rujukan, dasar, versi, sidik, sidik_berkas, judul, wilayah, periode, penerbit, terbit FROM segel_cad;
CREATE TABLE segel_cabut (
  kode TEXT PRIMARY KEY REFERENCES segel(kode),
  alasan TEXT NOT NULL CHECK (length(alasan) BETWEEN 5 AND 500),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 80),
  waktu INTEGER NOT NULL CHECK (waktu > 0)
);
INSERT INTO segel_cabut (kode, alasan, oleh, waktu) SELECT kode, alasan, oleh, waktu FROM segel_cabut_cad;
DROP TABLE segel_cabut_cad;
DROP TABLE segel_cad;
CREATE INDEX IF NOT EXISTS segel_dasar ON segel (jenis, dasar, versi);
CREATE INDEX IF NOT EXISTS segel_terbit ON segel (terbit);
