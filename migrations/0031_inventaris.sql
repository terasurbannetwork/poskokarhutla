-- Inventaris peralatan pemadam per pihak dan per gudang (src/inventaris.js). Waktu = ms epoch UTC. Idempoten (IF NOT EXISTS). Tabel baru; tidak menyentuh 0029/0030.
-- Pemilik = akun instansi (0029). Daftar tetap (jenis gudang, kategori, kelas pompa, kondisi, status) HARUS sama dengan src/inventaris.js dan public/instansi_alat.js;
-- tests/warga/inventaris.test.mjs menjaganya, termasuk kelas pompa terhadap tabel POMPA di scripts/data/taktik.py.

-- Gudang: tempat alat disimpan. prov wajib salah satu cakupan akun pemilik (trigger), karena rekap per provinsi dan wilayah staf bertumpu padanya.
-- diubah = terakhir pemilik mengubah gudang/isinya ATAU menekan "Konfirmasi masih sama"; > 30 hari = butir Meja Pantau. Pemilik terhapus (akun dummy) membawa gudangnya.
CREATE TABLE IF NOT EXISTS gudang (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  akun_id TEXT NOT NULL REFERENCES instansi_akun (id) ON DELETE CASCADE,
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 100),
  jenis TEXT NOT NULL CHECK (jenis IN ('gudang', 'posko', 'markas', 'pos_daops', 'kendaraan_siaga')),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT CHECK (kab IS NULL OR length(kab) BETWEEN 2 AND 60),
  alamat TEXT CHECK (alamat IS NULL OR length(alamat) <= 200),
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  sumber_koordinat TEXT NOT NULL DEFAULT 'peta' CHECK (sumber_koordinat IN ('peta', 'gps')),
  pic_nama TEXT CHECK (pic_nama IS NULL OR length(pic_nama) BETWEEN 2 AND 80),
  pic_wa TEXT CHECK (pic_wa IS NULL OR (length(pic_wa) BETWEEN 10 AND 15 AND pic_wa GLOB '62[0-9]*' AND pic_wa NOT GLOB '*[^0-9]*')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (pic_wa IS NULL OR pic_nama IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS gudang_akun ON gudang (akun_id);
CREATE INDEX IF NOT EXISTS gudang_prov ON gudang (prov, diubah);

-- Alat: satu baris = satu jenis alat (jumlah unit) di satu gudang. kapasitas = per unit (liter tangki/mobil, meter selang). kelas_pompa hanya untuk kategori pompa,
-- nilainya selaras dengan POMPA di scripts/data/taktik.py (kebutuhan pompa rekomendasi). dikerahkan_ke_tugas hanya bila status dikerahkan; rusak_berat tidak boleh siap.
CREATE TABLE IF NOT EXISTS alat (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  gudang_id TEXT NOT NULL REFERENCES gudang (id) ON DELETE CASCADE,
  kategori TEXT NOT NULL CHECK (kategori IN ('pompa', 'selang_1_5', 'selang_2_5', 'nozzle', 'jet_shooter_lance', 'tangki_fleksibel', 'mobil_tangki', 'mobil_pemadam', 'motor_trail',
    'alat_berat', 'drone_termal', 'genset', 'perahu', 'apd_set', 'scba', 'kepyok_garu', 'pompa_punggung', 'ht_radio', 'tenda', 'lainnya')),
  merek_model TEXT CHECK (merek_model IS NULL OR length(merek_model) <= 80),
  kelas_pompa TEXT CHECK (kelas_pompa IS NULL OR (kategori = 'pompa' AND kelas_pompa IN ('tekanan_tinggi', 'debit_besar', 'jinjing_ringan', 'portabel_besar'))),
  hp REAL CHECK (hp IS NULL OR (hp > 0 AND hp <= 2000)),
  kapasitas REAL CHECK (kapasitas IS NULL OR (kapasitas >= 0 AND kapasitas <= 10000000)),
  jumlah INTEGER NOT NULL CHECK (jumlah BETWEEN 1 AND 100000),
  kondisi TEXT NOT NULL DEFAULT 'baik' CHECK (kondisi IN ('baik', 'rusak_ringan', 'rusak_berat')),
  status TEXT NOT NULL DEFAULT 'siap' CHECK (status IN ('siap', 'dikerahkan', 'servis')),
  dikerahkan_ke_tugas TEXT REFERENCES tugas_api (id) ON DELETE SET NULL,
  tahun INTEGER CHECK (tahun IS NULL OR tahun BETWEEN 1970 AND 2100),
  foto INTEGER NOT NULL DEFAULT 0 CHECK (foto IN (0, 1)),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (dikerahkan_ke_tugas IS NULL OR status = 'dikerahkan'),
  CHECK (kondisi != 'rusak_berat' OR status != 'siap')
);
CREATE INDEX IF NOT EXISTS alat_gudang ON alat (gudang_id);
CREATE INDEX IF NOT EXISTS alat_siap ON alat (status, kategori);
CREATE INDEX IF NOT EXISTS alat_tugas ON alat (dikerahkan_ke_tugas) WHERE dikerahkan_ke_tugas IS NOT NULL;

-- CHECK tidak boleh berisi subquery: provinsi gudang harus salah satu cakupan akun pemilik, pemilik tak bisa diganti, alat hanya pindah antar gudang SATU pemilik.
CREATE TRIGGER IF NOT EXISTS gudang_prov_sah BEFORE INSERT ON gudang
WHEN NOT EXISTS (SELECT 1 FROM instansi_akun a, json_each(a.cakupan) j WHERE a.id = NEW.akun_id AND j.value = NEW.prov)
BEGIN
  SELECT RAISE(ABORT, 'provinsi gudang di luar cakupan akun pemilik');
END;
CREATE TRIGGER IF NOT EXISTS gudang_prov_ubah BEFORE UPDATE OF prov ON gudang
WHEN NOT EXISTS (SELECT 1 FROM instansi_akun a, json_each(a.cakupan) j WHERE a.id = NEW.akun_id AND j.value = NEW.prov)
BEGIN
  SELECT RAISE(ABORT, 'provinsi gudang di luar cakupan akun pemilik');
END;
CREATE TRIGGER IF NOT EXISTS gudang_pemilik_tetap BEFORE UPDATE OF akun_id ON gudang
WHEN NEW.akun_id != OLD.akun_id
BEGIN
  SELECT RAISE(ABORT, 'pemilik gudang tidak bisa diganti');
END;
CREATE TRIGGER IF NOT EXISTS alat_pindah_satu_pemilik BEFORE UPDATE OF gudang_id ON alat
WHEN (SELECT akun_id FROM gudang WHERE id = NEW.gudang_id) IS NOT (SELECT akun_id FROM gudang WHERE id = OLD.gudang_id)
BEGIN
  SELECT RAISE(ABORT, 'alat hanya bisa pindah antar gudang milik pihak yang sama');
END;

-- Jejak perubahan alat: hanya menambah, kecuali baris dummy (UPDATE selalu ditolak; DELETE hanya untuk dummy = 1). alat_id/gudang_id TANPA kunci asing: jejak alat yang sudah dihapus tetap ada.
-- oleh = id akun pemilik (16 hex) atau penanda 'sistem' (alat pulang saat tugas padam). dari/ke = nilai sebelum/sesudah (teks); tugas_id terisi untuk kerahkan dan kembali.
CREATE TABLE IF NOT EXISTS alat_jejak (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  waktu INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  alat_id TEXT NOT NULL CHECK (length(alat_id) = 16),
  gudang_id TEXT NOT NULL CHECK (length(gudang_id) = 16),
  aksi TEXT NOT NULL CHECK (aksi IN ('tambah', 'jumlah', 'kondisi', 'status', 'pindah', 'hapus')),
  dari TEXT CHECK (dari IS NULL OR length(dari) <= 80),
  ke TEXT CHECK (ke IS NULL OR length(ke) <= 80),
  tugas_id TEXT CHECK (tugas_id IS NULL OR length(tugas_id) = 16),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS alat_jejak_alat ON alat_jejak (alat_id, waktu);
CREATE INDEX IF NOT EXISTS alat_jejak_gudang ON alat_jejak (gudang_id, waktu);
CREATE TRIGGER IF NOT EXISTS alat_jejak_tetap_ubah BEFORE UPDATE ON alat_jejak
BEGIN
  SELECT RAISE(ABORT, 'alat_jejak hanya bisa ditambah');
END;
CREATE TRIGGER IF NOT EXISTS alat_jejak_tetap_hapus BEFORE DELETE ON alat_jejak
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'alat_jejak hanya bisa ditambah');
END;
