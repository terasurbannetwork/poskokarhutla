-- Inventori LogPal (src/logpal.js, /logpal): gudang logistik BNPB dan BPBD, barang, mutasi, stok opname, permintaan bantuan. Waktu = ms epoch UTC. Idempoten (IF NOT EXISTS).
-- Awalan logpal_: tidak menyentuh tabel gudang dan alat (0031, inventaris peralatan pemadam). Daftar tetap (pemilik, jenis mutasi, jenis permintaan) HARUS sama dengan src/logpal.js dan public/logpal/logpal.js.
-- Aturan akses ada di server (src/logpal.js), bukan di CHECK: akun instansi hanya menulis gudang yang akun_id-nya dirinya; staf BNPB hanya menulis gudang pemilik 'BNPB'.

-- Gudang. akun_id = akun instansi (BPBD) pemilik; NULL untuk gudang BNPB dan gudang BPBD yang belum dipasangkan ke akun (staf BNPB mengelola). prov = kode BPS 2 digit.
CREATE TABLE IF NOT EXISTS logpal_gudang (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kode TEXT UNIQUE CHECK (kode IS NULL OR length(kode) BETWEEN 3 AND 80),
  akun_id TEXT REFERENCES instansi_akun (id) ON DELETE SET NULL,
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 100),
  pemilik TEXT NOT NULL CHECK (pemilik IN ('BNPB', 'BPBD')),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  provinsi TEXT NOT NULL CHECK (length(provinsi) BETWEEN 2 AND 60),
  kab TEXT CHECK (kab IS NULL OR length(kab) BETWEEN 2 AND 60),
  kapasitas_ton REAL CHECK (kapasitas_ton IS NULL OR (kapasitas_ton > 0 AND kapasitas_ton <= 1000000)),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (pemilik != 'BNPB' OR akun_id IS NULL)
);
CREATE INDEX IF NOT EXISTS logpal_gudang_prov ON logpal_gudang (prov, pemilik);
CREATE INDEX IF NOT EXISTS logpal_gudang_akun ON logpal_gudang (akun_id);

-- Barang per gudang. Jumlah = baik + rusak + sisa belum dinilai; stok tidak pernah negatif (CHECK + UPDATE bersyarat di server).
-- Kolom aset (kode_barang..label) dipakai kelompok peralatan; kolom persediaan (batch, harga, kedaluwarsa) dipakai bahan habis pakai. Semua boleh NULL.
CREATE TABLE IF NOT EXISTS logpal_barang (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  gudang_id TEXT NOT NULL REFERENCES logpal_gudang (id) ON DELETE CASCADE,
  barang TEXT NOT NULL CHECK (length(barang) BETWEEN 2 AND 200),
  kategori TEXT NOT NULL DEFAULT 'Lainnya' CHECK (length(kategori) <= 60),
  item_standar TEXT NOT NULL DEFAULT '' CHECK (length(item_standar) <= 80),
  prioritas TEXT NOT NULL DEFAULT '' CHECK (prioritas IN ('', '1', '2')),
  kelompok TEXT NOT NULL CHECK (length(kelompok) BETWEEN 2 AND 40),
  satuan TEXT NOT NULL DEFAULT '' CHECK (length(satuan) <= 30),
  jumlah INTEGER NOT NULL DEFAULT 0 CHECK (jumlah >= 0 AND jumlah <= 100000000),
  baik INTEGER NOT NULL DEFAULT 0 CHECK (baik >= 0),
  rusak INTEGER NOT NULL DEFAULT 0 CHECK (rusak >= 0),
  kedaluwarsa TEXT NOT NULL DEFAULT '' CHECK (kedaluwarsa = '' OR (length(kedaluwarsa) = 10 AND kedaluwarsa GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]')),
  sumber_dana TEXT NOT NULL DEFAULT '' CHECK (length(sumber_dana) <= 60),
  per TEXT NOT NULL DEFAULT '' CHECK (length(per) <= 40),
  sumber TEXT NOT NULL DEFAULT '' CHECK (length(sumber) <= 120),
  catatan TEXT NOT NULL DEFAULT '' CHECK (length(catatan) <= 300),
  kode_barang TEXT NOT NULL DEFAULT '' CHECK (length(kode_barang) <= 40),
  nup TEXT NOT NULL DEFAULT '' CHECK (length(nup) <= 30),
  merek TEXT NOT NULL DEFAULT '' CHECK (length(merek) <= 80),
  seri TEXT NOT NULL DEFAULT '' CHECK (length(seri) <= 60),
  tahun INTEGER CHECK (tahun IS NULL OR tahun BETWEEN 1950 AND 2100),
  cara TEXT NOT NULL DEFAULT '' CHECK (length(cara) <= 60),
  nilai REAL CHECK (nilai IS NULL OR (nilai >= 0 AND nilai <= 1e13)),
  rr INTEGER CHECK (rr IS NULL OR rr >= 0),
  rb INTEGER CHECK (rb IS NULL OR rb >= 0),
  label TEXT NOT NULL DEFAULT '' CHECK (length(label) <= 40),
  batch TEXT NOT NULL DEFAULT '' CHECK (length(batch) <= 60),
  harga REAL CHECK (harga IS NULL OR (harga >= 0 AND harga <= 1e13)),
  lokasi TEXT NOT NULL DEFAULT '' CHECK (length(lokasi) <= 100),
  dokumen TEXT NOT NULL DEFAULT '' CHECK (length(dokumen) <= 100),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (baik + rusak <= jumlah)
);
CREATE INDEX IF NOT EXISTS logpal_barang_gudang ON logpal_barang (gudang_id);

-- Mutasi: tiap baris lahir dalam satu batch dengan perubahan stok barangnya (src/logpal.js mutasi). barang/kelompok/satuan disalin supaya riwayat tetap terbaca.
-- diterima = jumlah yang dikonfirmasi sampai di tujuan (hanya mutasi Keluar); selisih = jumlah - diterima.
CREATE TABLE IF NOT EXISTS logpal_mutasi (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  gudang_id TEXT NOT NULL REFERENCES logpal_gudang (id) ON DELETE CASCADE,
  barang_id TEXT NOT NULL REFERENCES logpal_barang (id) ON DELETE CASCADE,
  tanggal TEXT NOT NULL CHECK (length(tanggal) = 10 AND tanggal GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  jenis TEXT NOT NULL CHECK (jenis IN ('Masuk', 'Keluar', 'Penghapusan')),
  barang TEXT NOT NULL,
  kelompok TEXT NOT NULL DEFAULT '',
  satuan TEXT NOT NULL DEFAULT '',
  jumlah INTEGER NOT NULL CHECK (jumlah > 0 AND jumlah <= 100000000),
  lawan TEXT NOT NULL DEFAULT '' CHECK (length(lawan) <= 120),
  moda TEXT NOT NULL DEFAULT '' CHECK (length(moda) <= 30),
  dokumen TEXT NOT NULL DEFAULT '' CHECK (length(dokumen) <= 100),
  nilai REAL NOT NULL DEFAULT 0 CHECK (nilai >= 0 AND nilai <= 1e13),
  pj TEXT NOT NULL DEFAULT '' CHECK (length(pj) <= 80),
  diterima INTEGER CHECK (diterima IS NULL OR (diterima >= 0 AND diterima <= 100000000)),
  oleh TEXT NOT NULL DEFAULT '',
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (diterima IS NULL OR (jenis = 'Keluar' AND diterima <= jumlah))
);
CREATE INDEX IF NOT EXISTS logpal_mutasi_gudang ON logpal_mutasi (gudang_id, tanggal);

-- Berita acara stok opname dan barisnya. tercatat disalin dari stok server saat BA dibuat (bukan kiriman klien).
CREATE TABLE IF NOT EXISTS logpal_opname (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  gudang_id TEXT NOT NULL REFERENCES logpal_gudang (id) ON DELETE CASCADE,
  tanggal TEXT NOT NULL CHECK (length(tanggal) = 10 AND tanggal GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  petugas TEXT NOT NULL CHECK (length(petugas) BETWEEN 2 AND 80),
  disesuaikan INTEGER NOT NULL DEFAULT 0 CHECK (disesuaikan IN (0, 1)),
  oleh TEXT NOT NULL DEFAULT '',
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS logpal_opname_gudang ON logpal_opname (gudang_id, tanggal);

CREATE TABLE IF NOT EXISTS logpal_opname_baris (
  opname_id TEXT NOT NULL REFERENCES logpal_opname (id) ON DELETE CASCADE,
  barang_id TEXT NOT NULL REFERENCES logpal_barang (id) ON DELETE CASCADE,
  barang TEXT NOT NULL,
  satuan TEXT NOT NULL DEFAULT '',
  tercatat INTEGER NOT NULL CHECK (tercatat >= 0),
  fisik INTEGER NOT NULL CHECK (fisik >= 0 AND fisik <= 100000000),
  selisih INTEGER NOT NULL,
  ket TEXT NOT NULL DEFAULT '' CHECK (length(ket) <= 120),
  PRIMARY KEY (opname_id, barang_id)
) WITHOUT ROWID;

-- Permintaan bantuan BPBD ke BNPB. items = larik {barang, jumlah, satuan}. tahap = indeks FLOW[jenis] (src/logpal.js); ditolak = berhenti di tahap itu.
-- akun_id = pemohon (akun instansi); NULL bila diajukan staf. Alur dijaga trigger di bawah: maju satu tahap, tidak bergerak sesudah ditolak.
CREATE TABLE IF NOT EXISTS logpal_permintaan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  akun_id TEXT REFERENCES instansi_akun (id) ON DELETE SET NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('Tanggap darurat', 'Penguatan kesiapsiagaan')),
  bpbd TEXT NOT NULL CHECK (length(bpbd) BETWEEN 2 AND 100),
  provinsi TEXT NOT NULL CHECK (length(provinsi) BETWEEN 2 AND 60),
  kab TEXT NOT NULL DEFAULT '' CHECK (length(kab) <= 60),
  status_darurat TEXT NOT NULL DEFAULT '' CHECK (length(status_darurat) <= 40),
  sk TEXT NOT NULL DEFAULT '' CHECK (length(sk) <= 120),
  jiwa INTEGER NOT NULL DEFAULT 0 CHECK (jiwa >= 0 AND jiwa <= 100000000),
  rekomendasi TEXT NOT NULL DEFAULT '' CHECK (length(rekomendasi) <= 60),
  trc TEXT NOT NULL DEFAULT '' CHECK (length(trc) <= 600),
  items TEXT NOT NULL CHECK (json_valid(items) AND json_type(items) = 'array' AND json_array_length(items) BETWEEN 1 AND 40),
  tahap INTEGER NOT NULL DEFAULT 0 CHECK (tahap BETWEEN 0 AND 10 AND (jenis = 'Penguatan kesiapsiagaan' OR tahap <= 5)),
  ditolak INTEGER NOT NULL DEFAULT 0 CHECK (ditolak IN (0, 1)),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS logpal_permintaan_akun ON logpal_permintaan (akun_id, dibuat);

CREATE TABLE IF NOT EXISTS logpal_tahap (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  permintaan_id TEXT NOT NULL REFERENCES logpal_permintaan (id) ON DELETE CASCADE,
  tahap TEXT NOT NULL CHECK (length(tahap) BETWEEN 2 AND 80),
  petugas TEXT NOT NULL CHECK (length(petugas) BETWEEN 2 AND 80),
  catatan TEXT NOT NULL DEFAULT '' CHECK (length(catatan) <= 300),
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS logpal_tahap_permintaan ON logpal_tahap (permintaan_id, id);

CREATE TRIGGER IF NOT EXISTS logpal_permintaan_alur BEFORE UPDATE OF tahap, ditolak ON logpal_permintaan
WHEN OLD.ditolak = 1 OR (NEW.tahap != OLD.tahap AND (NEW.tahap != OLD.tahap + 1 OR NEW.ditolak = 1))
  OR (NEW.ditolak = 0 AND OLD.ditolak = 0 AND NEW.tahap = OLD.tahap)
BEGIN
  SELECT RAISE(ABORT, 'tahap permintaan hanya maju satu langkah, atau ditolak sekali; permintaan yang ditolak tidak bergerak lagi');
END;

-- Analisa kebutuhan wilayah terdampak (data pengajuan, bukan data publik): dibaca dari D1 oleh pengguna masuk, tidak di public/data. Kolom mengikuti CSV sumbernya.
CREATE TABLE IF NOT EXISTS logpal_kebutuhan (
  no INTEGER PRIMARY KEY,
  wilayah TEXT NOT NULL CHECK (length(wilayah) BETWEEN 2 AND 60),
  kebutuhan TEXT NOT NULL CHECK (length(kebutuhan) BETWEEN 2 AND 160),
  diajukan INTEGER NOT NULL CHECK (diajukan >= 0),
  satuan TEXT NOT NULL DEFAULT '',
  stok_a INTEGER NOT NULL DEFAULT 0 CHECK (stok_a >= 0),
  stok_a_teks TEXT NOT NULL DEFAULT '',
  stok_b INTEGER NOT NULL DEFAULT 0 CHECK (stok_b >= 0),
  stok_b_teks TEXT NOT NULL DEFAULT '',
  setara INTEGER NOT NULL DEFAULT 1 CHECK (setara IN (0, 1)),
  status_tetap TEXT NOT NULL DEFAULT '',
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);

-- Data statis LogPal yang BUKAN aset publik (repo publik, halaman wajib login): titik gudang, usulan, rute, jangkauan per kab/kota, teks catatan. Diisi pemilik lewat SQL keluaran scripts/logpal/impor.mjs dari CSV di luar repo;
-- dibaca hanya lewat GET /api/instansi/logpal/statis?nama= dengan sesi sah. stok_a dan stok_b di logpal_kebutuhan = stok dua gudang pembanding (namanya di baris 'teks').
CREATE TABLE IF NOT EXISTS logpal_statis (
  nama TEXT PRIMARY KEY CHECK (nama IN ('gudang', 'usulan', 'rute', 'jangkauan', 'teks')),
  isi TEXT NOT NULL CHECK (length(isi) BETWEEN 1 AND 1000000),
  diubah INTEGER NOT NULL
) WITHOUT ROWID;
