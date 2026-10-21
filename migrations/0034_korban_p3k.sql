-- Laporan korban jiwa (src/korban.js) dan inventaris P3K dan medis (src/inventaris.js). Waktu = ms epoch UTC. Idempoten (IF NOT EXISTS). Tabel baru; tidak menyentuh 0029/0031.
-- Daftar tetap (bencana, kategori korban, penyebab, sumber, status, kategori P3K, satuan) HARUS sama dengan src/korban.js, src/inventaris.js, public/instansi_korban.js, public/instansi_alat.js, public/admin/korban.js;
-- tests/warga/korban.test.mjs dan inventaris.test.mjs menjaganya.
-- P3K = tabel SENDIRI (bukan kategori baru di alat): CHECK kategori di alat (0031) tidak bisa dilonggarkan tanpa membangun ulang tabel dan itu tidak idempoten. Gudang tetap tabel gudang.

-- Korban: satu baris = satu kejadian (jumlah meninggal, luka berat, hilang). nama_korban OPSIONAL dan HANYA dibaca moderator dan staf pusdalops (src/korban.js menjaganya); tidak pernah ke rute publik, teks WA, atau slide.
-- Koreksi menimpa angka di baris ini dan menyimpan nilai SEBELUMNYA di korban_jejak (hanya menambah). Korban nyata tidak dihapus keras.
CREATE TABLE IF NOT EXISTS korban (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  akun_id TEXT REFERENCES instansi_akun (id) ON DELETE SET NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  klien_id TEXT CHECK (klien_id IS NULL OR (length(klien_id) BETWEEN 8 AND 64 AND klien_id NOT GLOB '*[^0-9A-Za-z_-]*')),
  waktu_kejadian INTEGER NOT NULL CHECK (waktu_kejadian > 0),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT CHECK (kab IS NULL OR length(kab) BETWEEN 2 AND 60),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  sumber_lokasi TEXT NOT NULL DEFAULT 'manual' CHECK (sumber_lokasi IN ('gps', 'tugas', 'manual')),
  tugas_id TEXT REFERENCES tugas_api (id) ON DELETE SET NULL,
  bencana TEXT NOT NULL DEFAULT 'karhutla' CHECK (bencana IN ('karhutla', 'banjir', 'gempa', 'cuaca', 'udara', 'gunungapi', 'kekeringan', 'lainnya')),
  meninggal INTEGER NOT NULL DEFAULT 0 CHECK (meninggal BETWEEN 0 AND 100000),
  luka_berat INTEGER NOT NULL DEFAULT 0 CHECK (luka_berat BETWEEN 0 AND 100000),
  hilang INTEGER NOT NULL DEFAULT 0 CHECK (hilang BETWEEN 0 AND 100000),
  kategori TEXT NOT NULL CHECK (kategori IN ('warga', 'petugas_pemadam', 'relawan', 'lainnya')),
  penyebab TEXT NOT NULL CHECK (penyebab IN ('terbakar', 'asap_ispa', 'tenggelam', 'kecelakaan_tugas', 'lainnya')),
  kronologi TEXT CHECK (kronologi IS NULL OR length(kronologi) <= 600),
  sumber TEXT NOT NULL DEFAULT 'laporan_langsung' CHECK (sumber IN ('laporan_langsung', 'rs', 'kepolisian')),
  nama_korban TEXT CHECK (nama_korban IS NULL OR length(nama_korban) <= 300),
  foto INTEGER NOT NULL DEFAULT 0 CHECK (foto IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'dilaporkan' CHECK (status IN ('dilaporkan', 'terverifikasi', 'dikoreksi')),
  diverifikasi_oleh TEXT CHECK (diverifikasi_oleh IS NULL OR length(diverifikasi_oleh) BETWEEN 3 AND 40),
  diverifikasi_pada INTEGER,
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK ((lat IS NULL) = (lon IS NULL)),
  CHECK (meninggal + luka_berat + hilang > 0),
  CHECK (status != 'terverifikasi' OR diverifikasi_pada IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS korban_waktu ON korban (waktu_kejadian);
CREATE INDEX IF NOT EXISTS korban_status ON korban (status, prov);
CREATE INDEX IF NOT EXISTS korban_akun ON korban (akun_id);
-- kirim ulang (ketuk ganda, sinyal putus lalu ulang) dari pelapor yang sama dengan klien_id yang sama = satu laporan
CREATE UNIQUE INDEX IF NOT EXISTS korban_klien ON korban (oleh, klien_id) WHERE klien_id IS NOT NULL;

-- CHECK tidak boleh berisi subquery: provinsi laporan akun instansi harus salah satu cakupan akunnya. Korban nyata tidak dihapus keras (hanya baris dummy).
CREATE TRIGGER IF NOT EXISTS korban_prov_sah BEFORE INSERT ON korban
WHEN NEW.akun_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM instansi_akun a, json_each(a.cakupan) j WHERE a.id = NEW.akun_id AND j.value = NEW.prov)
BEGIN
  SELECT RAISE(ABORT, 'provinsi korban di luar cakupan akun pelapor');
END;
CREATE TRIGGER IF NOT EXISTS korban_tetap_hapus BEFORE DELETE ON korban
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'laporan korban tidak dihapus');
END;

-- Jejak laporan korban: hanya menambah, kecuali baris dummy. dari/ke = nilai sebelum/sesudah (JSON bidang yang berubah, TANPA nama korban). korban_id tanpa kunci asing.
CREATE TABLE IF NOT EXISTS korban_jejak (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  waktu INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  korban_id TEXT NOT NULL CHECK (length(korban_id) = 16),
  aksi TEXT NOT NULL CHECK (aksi IN ('lapor', 'verifikasi', 'koreksi', 'foto', 'foto_hapus')),
  dari TEXT CHECK (dari IS NULL OR length(dari) <= 800),
  ke TEXT CHECK (ke IS NULL OR length(ke) <= 800),
  alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 300),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS korban_jejak_korban ON korban_jejak (korban_id, waktu);
CREATE TRIGGER IF NOT EXISTS korban_jejak_tetap_ubah BEFORE UPDATE ON korban_jejak
BEGIN
  SELECT RAISE(ABORT, 'korban_jejak hanya bisa ditambah');
END;
CREATE TRIGGER IF NOT EXISTS korban_jejak_tetap_hapus BEFORE DELETE ON korban_jejak
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'korban_jejak hanya bisa ditambah');
END;

-- P3K dan medis: barang habis pakai per gudang. jumlah boleh 0 (habis). kedaluwarsa = tanggal WIB YYYY-MM-DD, kosong bila tak berkedaluwarsa. ambang = pemilik gudang minta peringatan bila jumlah di bawahnya.
CREATE TABLE IF NOT EXISTS p3k (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  gudang_id TEXT NOT NULL REFERENCES gudang (id) ON DELETE CASCADE,
  kategori TEXT NOT NULL CHECK (kategori IN ('kotak_p3k', 'tandu', 'tabung_oksigen', 'regulator', 'masker_n95', 'obat_tetes_mata', 'salep_luka_bakar', 'infus_oralit', 'aed', 'lainnya')),
  nama TEXT CHECK (nama IS NULL OR length(nama) <= 80),
  satuan TEXT NOT NULL DEFAULT 'unit' CHECK (satuan IN ('unit', 'kotak', 'buah', 'liter')),
  jumlah INTEGER NOT NULL CHECK (jumlah BETWEEN 0 AND 1000000),
  ambang INTEGER CHECK (ambang IS NULL OR ambang BETWEEN 1 AND 1000000),
  kedaluwarsa TEXT CHECK (kedaluwarsa IS NULL OR (length(kedaluwarsa) = 10 AND kedaluwarsa GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS p3k_gudang ON p3k (gudang_id);
CREATE INDEX IF NOT EXISTS p3k_kedaluwarsa ON p3k (kedaluwarsa) WHERE kedaluwarsa IS NOT NULL;

-- Jejak P3K: hanya menambah, kecuali dummy. aksi pakai = stok berkurang saat dipakai; tugas_id terisi bila dipakai di tugas api ("dipakai di tugas X").
CREATE TABLE IF NOT EXISTS p3k_jejak (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  waktu INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  p3k_id TEXT NOT NULL CHECK (length(p3k_id) = 16),
  gudang_id TEXT NOT NULL CHECK (length(gudang_id) = 16),
  aksi TEXT NOT NULL CHECK (aksi IN ('tambah', 'jumlah', 'pakai', 'ubah', 'hapus')),
  dari TEXT CHECK (dari IS NULL OR length(dari) <= 80),
  ke TEXT CHECK (ke IS NULL OR length(ke) <= 80),
  tugas_id TEXT CHECK (tugas_id IS NULL OR length(tugas_id) = 16),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS p3k_jejak_p3k ON p3k_jejak (p3k_id, waktu);
CREATE INDEX IF NOT EXISTS p3k_jejak_gudang ON p3k_jejak (gudang_id, waktu);
CREATE TRIGGER IF NOT EXISTS p3k_jejak_tetap_ubah BEFORE UPDATE ON p3k_jejak
BEGIN
  SELECT RAISE(ABORT, 'p3k_jejak hanya bisa ditambah');
END;
CREATE TRIGGER IF NOT EXISTS p3k_jejak_tetap_hapus BEFORE DELETE ON p3k_jejak
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'p3k_jejak hanya bisa ditambah');
END;
