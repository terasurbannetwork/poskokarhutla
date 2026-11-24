-- 0171: register segel dokumen (paket data/kajian-bnpb/segel-dokumen/, tiket SG-01, DESAIN-TEKNIS bagian 2, D1-D15).
-- Segel menempel pada titik beku yang sudah ada (lk_snapshot.hash, lkb_snapshot.hash, pb_dokumen.sha, lj_beku.sidik); tabel ini tidak membekukan apa pun.
-- Kode 10 huruf Crockford base32 (tanpa I, L, O, U). Satu segel per (jenis, rujukan). Halaman publik hanya membaca kolom sampul, tanpa angka isi dan nama orang.
-- Append-only (D14) dijaga src/hak.js yang tidak punya UPDATE atau DELETE untuk kedua tabel; mencabut = baris baru di segel_cabut.
-- Tanpa kolom dummy (D13: baris dummy tidak disegel). Hanya CREATE ... IF NOT EXISTS; tanpa ALTER, tanpa trigger, tanpa data contoh. Pemilik yang menerapkan ke D1 produksi (SG-14).
CREATE TABLE IF NOT EXISTS segel (
  kode TEXT PRIMARY KEY CHECK (length(kode) = 10 AND kode NOT GLOB '*[^0-9A-HJKMNP-TV-Z]*'),
  jenis TEXT NOT NULL CHECK (jenis IN ('lk', 'lkb', 'pb', 'lj')),
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
CREATE INDEX IF NOT EXISTS segel_dasar ON segel (jenis, dasar, versi);
CREATE TABLE IF NOT EXISTS segel_cabut (
  kode TEXT PRIMARY KEY REFERENCES segel(kode),
  alasan TEXT NOT NULL CHECK (length(alasan) BETWEEN 5 AND 500),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 80),
  waktu INTEGER NOT NULL CHECK (waktu > 0)
);
