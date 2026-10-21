-- Catatan sortie OMC (operasi modifikasi cuaca): src/omc.js, halaman /admin/omc. Waktu = ms epoch UTC; tanggal = YYYY-MM-DD WIB. Idempoten (IF NOT EXISTS).
-- Aturan: sortie dihapus LUNAK (kolom dihapus) supaya evaluasi lama tidak hilang diam-diam; baris nyata (dummy = 0) tidak bisa dihapus keras atau dihidupkan lagi.
-- Jam yang tidak diketahui = NULL (mulai, selesai, ketinggian_kaki), bukan angka karangan. Pembacanya (pipeline cuaca-udara) melewati sortie tanpa mulai.
-- Bentuk larik sasaran_kab ("11|Aceh Barat") dan isi poligon (Polygon GeoJSON dalam BBOX Indonesia, <= 500 titik) divalidasi src/omc.js; di sini hanya tipe, ukuran, dan kewarasan.

CREATE TABLE IF NOT EXISTS omc_operasi (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 100),
  provinsi TEXT CHECK (provinsi IS NULL OR (length(provinsi) = 2 AND provinsi NOT GLOB '*[^0-9]*')),
  mulai TEXT CHECK (mulai IS NULL OR (length(mulai) = 10 AND mulai GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')),
  selesai TEXT CHECK (selesai IS NULL OR (length(selesai) = 10 AND selesai GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')),
  dibuat INTEGER NOT NULL,
  pengisi TEXT NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (mulai IS NULL OR selesai IS NULL OR selesai >= mulai)
);

CREATE TABLE IF NOT EXISTS omc_sortie (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  operasi_id TEXT REFERENCES omc_operasi (id),
  tanggal TEXT NOT NULL CHECK (length(tanggal) = 10 AND tanggal GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  pesawat TEXT NOT NULL CHECK (length(pesawat) BETWEEN 2 AND 40),
  mulai INTEGER,
  selesai INTEGER,
  bahan TEXT NOT NULL CHECK (bahan IN ('nacl', 'dry_ice')),
  kg REAL NOT NULL CHECK (kg > 0 AND kg <= 20000),
  ketinggian_kaki INTEGER CHECK (ketinggian_kaki IS NULL OR ketinggian_kaki BETWEEN 0 AND 60000),
  sasaran_kab TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(sasaran_kab) AND json_type(sasaran_kab) = 'array' AND json_array_length(sasaran_kab) <= 20),
  sasaran_poligon TEXT CHECK (sasaran_poligon IS NULL OR (json_valid(sasaran_poligon) AND length(sasaran_poligon) <= 20480)),
  lintas_provinsi INTEGER NOT NULL DEFAULT 0 CHECK (lintas_provinsi IN (0, 1)),
  prov TEXT NOT NULL CHECK (json_valid(prov) AND json_type(prov) = 'array' AND json_array_length(prov) BETWEEN 1 AND 6),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  pengisi TEXT NOT NULL,
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dihapus INTEGER,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (mulai IS NULL OR selesai IS NULL OR (selesai >= mulai AND selesai - mulai <= 43200000)),
  CHECK (json_array_length(sasaran_kab) > 0 OR sasaran_poligon IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS omc_sortie_tanggal ON omc_sortie (tanggal);
CREATE INDEX IF NOT EXISTS omc_sortie_operasi ON omc_sortie (operasi_id);

-- Baris nyata tidak dihapus keras (hanya dummy boleh) dan sortie yang sudah dihapus lunak tidak hidup lagi.
CREATE TRIGGER IF NOT EXISTS omc_sortie_tetap_hapus BEFORE DELETE ON omc_sortie WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'sortie OMC nyata tidak dihapus keras; pakai hapus lunak');
END;
CREATE TRIGGER IF NOT EXISTS omc_sortie_tetap_mati BEFORE UPDATE OF dihapus ON omc_sortie WHEN OLD.dihapus IS NOT NULL AND NEW.dihapus IS NULL
BEGIN
  SELECT RAISE(ABORT, 'sortie OMC yang sudah dihapus tidak dihidupkan lagi; catat sortie baru');
END;
CREATE TRIGGER IF NOT EXISTS omc_operasi_tetap_hapus BEFORE DELETE ON omc_operasi WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'operasi OMC nyata tidak dihapus');
END;
