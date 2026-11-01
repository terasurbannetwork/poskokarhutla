-- Korban: CHECK bencana diperlebar dengan 'pesisir' (Gelombang pasang dan abrasi, hazard baru di public/bencana.json). SQLite tidak bisa mengubah CHECK, jadi tabel dibangun ulang.
-- Pola: salin ke korban_cadang, DROP korban (indeks dan trigger ikut hilang; tabel anak korban_jejak tanpa kunci asing, aman), CREATE ulang, isi kembali, buang cadang.
-- Sengaja BUKAN ALTER TABLE RENAME: RENAME memvalidasi ulang semua trigger dan gagal bila instansi_akun belum ada. Satu transaksi (migrasi D1). Ulangan sesudah penerapan sukses aman (cadang sudah dibuang); ulangan sesudah penerapan TERPUTUS gagal keras di CREATE TABLE korban_cadang supaya satu-satunya salinan data tidak terhapus (pola 0090): periksa korban_cadang dengan tangan.
-- Daftar bencana HARUS sama dengan src/korban.js, public/instansi_korban.js, public/admin/korban.js (dijaga korban.test.mjs, yang membaca CHECK dari migrasi terbaru ini).
CREATE TABLE korban_cadang AS SELECT * FROM korban;
DROP TABLE korban;
CREATE TABLE korban (
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
  bencana TEXT NOT NULL DEFAULT 'karhutla' CHECK (bencana IN ('karhutla', 'banjir', 'gempa', 'cuaca', 'udara', 'gunungapi', 'kekeringan', 'pesisir', 'lainnya')),
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
CREATE INDEX korban_waktu ON korban (waktu_kejadian);
CREATE INDEX korban_status ON korban (status, prov);
CREATE INDEX korban_akun ON korban (akun_id);
-- kirim ulang (ketuk ganda, sinyal putus lalu ulang) dari pelapor yang sama dengan klien_id yang sama = satu laporan
CREATE UNIQUE INDEX korban_klien ON korban (oleh, klien_id) WHERE klien_id IS NOT NULL;

-- isi kembali SEBELUM trigger dipasang: trigger insert akan menolak baris lama yang akunnya sudah berubah cakupan
INSERT INTO korban SELECT * FROM korban_cadang;
DROP TABLE korban_cadang;

-- CHECK tidak boleh berisi subquery: provinsi laporan akun instansi harus salah satu cakupan akunnya. Korban nyata tidak dihapus keras (hanya baris dummy).
CREATE TRIGGER korban_prov_sah BEFORE INSERT ON korban
WHEN NEW.akun_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM instansi_akun a, json_each(a.cakupan) j WHERE a.id = NEW.akun_id AND j.value = NEW.prov)
BEGIN
  SELECT RAISE(ABORT, 'provinsi korban di luar cakupan akun pelapor');
END;
CREATE TRIGGER korban_tetap_hapus BEFORE DELETE ON korban
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'laporan korban tidak dihapus');
END;
