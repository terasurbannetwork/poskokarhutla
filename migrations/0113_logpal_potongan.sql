-- LogPal: data statis besar (matriks waktu tempuh, kecamatan, terdampak) yang tidak muat di satu baris logpal_statis
-- (CHECK 1 MB) dan tidak muat di satu pernyataan SQL D1 (100 KB). Disimpan sebagai potongan berurutan, tiap isi maks 90000 karakter;
-- GET /api/instansi/logpal/statis?nama= merakitnya urut. Diisi pemilik lewat SQL keluaran scripts/logpal/impor.mjs (--statis). Idempoten.
-- Data ini memuat koordinat gudang: BUKAN aset publik, tidak masuk repo.
CREATE TABLE IF NOT EXISTS logpal_statis_potong (
  nama TEXT NOT NULL CHECK (nama IN ('matriks', 'kecamatan', 'terdampak')),
  urut INTEGER NOT NULL CHECK (urut BETWEEN 0 AND 59),
  isi TEXT NOT NULL CHECK (length(isi) BETWEEN 1 AND 90000),
  diubah INTEGER NOT NULL,
  PRIMARY KEY (nama, urut)
) WITHOUT ROWID;
