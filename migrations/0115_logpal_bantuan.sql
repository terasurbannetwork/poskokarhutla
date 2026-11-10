-- LogPal tab Bantuan (src/logpal.js, GET /api/instansi/logpal/bantuan): bantuan peralatan dan logistik per BPBD per tahun. BUKAN stok gudang: tidak menyentuh logpal_barang atau logpal_mutasi, dan belum diketahui apakah barangnya sudah terkirim (KEPUTUSAN-LOGPAL D11, Q9). Idempoten (IF NOT EXISTS).
-- Diisi hanya lewat SQL keluaran scripts/logpal/impor.mjs --bantuan (data asli di luar repo); tidak ada rute tulis. id = 16 heks deterministik dari prov|wilayah|tahun|barang.
CREATE TABLE IF NOT EXISTS logpal_bantuan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  provinsi TEXT NOT NULL CHECK (length(provinsi) BETWEEN 2 AND 60),
  tingkat TEXT NOT NULL CHECK (tingkat IN ('prov', 'kab')),
  wilayah TEXT NOT NULL CHECK (length(wilayah) BETWEEN 2 AND 100),
  tahun INTEGER NOT NULL CHECK (tahun BETWEEN 2000 AND 2100),
  barang TEXT NOT NULL CHECK (length(barang) BETWEEN 2 AND 100),
  jumlah INTEGER NOT NULL CHECK (jumlah > 0 AND jumlah <= 100000000),
  satuan TEXT NOT NULL DEFAULT '' CHECK (length(satuan) <= 30),
  belum_usulkan INTEGER NOT NULL DEFAULT 0 CHECK (belum_usulkan IN (0, 1)),
  catatan TEXT NOT NULL DEFAULT '' CHECK (length(catatan) <= 300),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (prov, wilayah, tahun, barang)
);
CREATE INDEX IF NOT EXISTS logpal_bantuan_prov_tahun ON logpal_bantuan (prov, tahun);
