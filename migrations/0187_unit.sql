-- Ruang Unit BNPB: isian manusia (DESAIN-TEKNIS kedeputian §2.2). Hasil hitungan TIDAK di sini (R2 unit/). Idempoten.

-- MB-7: keputusan staf atas usulan baris di R2 unit/usulan_<berkas>.json. Hanya ditambah; keputusan terbaru per (berkas, usulan_id) yang berlaku.
CREATE TABLE IF NOT EXISTS unit_ketuk (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  berkas TEXT NOT NULL CHECK (length(berkas) BETWEEN 3 AND 40 AND berkas NOT GLOB '*[^a-z0-9_]*'),
  usulan_id TEXT NOT NULL CHECK (length(usulan_id) = 16 AND usulan_id NOT GLOB '*[^0-9a-f]*'),
  keputusan TEXT NOT NULL CHECK (keputusan IN ('terima', 'tolak', 'koreksi')),
  koreksi TEXT CHECK (koreksi IS NULL OR (json_valid(koreksi) AND json_type(koreksi) = 'object' AND length(koreksi) <= 2000)),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 200),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK ((keputusan = 'koreksi') = (koreksi IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS unit_ketuk_berkas ON unit_ketuk (berkas, usulan_id, waktu);
CREATE INDEX IF NOT EXISTS unit_ketuk_waktu ON unit_ketuk (waktu);
CREATE TRIGGER IF NOT EXISTS unit_ketuk_beku BEFORE UPDATE ON unit_ketuk
BEGIN SELECT RAISE(ABORT, 'keputusan ketuk tidak boleh diubah; tambahkan keputusan baru'); END;
CREATE TRIGGER IF NOT EXISTS unit_ketuk_tahan BEFORE DELETE ON unit_ketuk WHEN OLD.dummy = 0
BEGIN SELECT RAISE(ABORT, 'keputusan ketuk tidak boleh dihapus'); END;
-- INSERT OR REPLACE melewati trigger UPDATE dan DELETE (tinjauan migrasi 26 Nov 2026): baris yang sudah ada tidak boleh ditimpa
CREATE TRIGGER IF NOT EXISTS unit_ketuk_timpa BEFORE INSERT ON unit_ketuk WHEN EXISTS (SELECT 1 FROM unit_ketuk WHERE id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'keputusan ketuk tidak boleh ditimpa'); END;

-- RRI-1: status titik akses putus. titik_id = id stabil dari R2 unit/akses_putus.json. Hanya ditambah; status terbaru per titik yang berlaku.
CREATE TABLE IF NOT EXISTS akses_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titik_id TEXT NOT NULL CHECK (length(titik_id) = 16 AND titik_id NOT GLOB '*[^0-9a-f]*'),
  tgl TEXT NOT NULL CHECK (date(tgl) IS tgl),
  status TEXT NOT NULL CHECK (status IN ('putus', 'darurat', 'pulih')),
  sumber TEXT NOT NULL CHECK (sumber IN ('wa', 'isian')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 200),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS akses_status_titik ON akses_status (titik_id, tgl);
CREATE UNIQUE INDEX IF NOT EXISTS akses_status_satu ON akses_status (titik_id, tgl, status);
CREATE TRIGGER IF NOT EXISTS akses_status_beku BEFORE UPDATE ON akses_status
BEGIN SELECT RAISE(ABORT, 'status akses tidak boleh diubah; tambahkan baris baru'); END;
CREATE TRIGGER IF NOT EXISTS akses_status_tahan BEFORE DELETE ON akses_status WHEN OLD.dummy = 0
BEGIN SELECT RAISE(ABORT, 'status akses tidak boleh dihapus'); END;
CREATE TRIGGER IF NOT EXISTS akses_status_timpa BEFORE INSERT ON akses_status
WHEN EXISTS (SELECT 1 FROM akses_status WHERE id = NEW.id OR (titik_id = NEW.titik_id AND tgl = NEW.tgl AND status = NEW.status))
BEGIN SELECT RAISE(ABORT, 'status akses tidak boleh ditimpa'); END;

-- PLP-3: BAST hibah logistik dan peralatan (Juklak 3/2024). Diisi impor skrip dari lampiran Keputusan Deputi, bukan form.
CREATE TABLE IF NOT EXISTS hibah_bast (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  tahun INTEGER NOT NULL CHECK (tahun BETWEEN 2015 AND 2100),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT CHECK (kab IS NULL OR (length(kab) = 4 AND kab NOT GLOB '*[^0-9]*' AND substr(kab, 1, 2) = prov)),
  barang TEXT NOT NULL CHECK (length(barang) BETWEEN 2 AND 80),
  jumlah INTEGER NOT NULL CHECK (jumlah BETWEEN 1 AND 10000000),
  satuan TEXT NOT NULL CHECK (length(satuan) BETWEEN 1 AND 20),
  tgl_bast TEXT NOT NULL CHECK (date(tgl_bast) IS tgl_bast),
  kedaluwarsa TEXT CHECK (kedaluwarsa IS NULL OR date(kedaluwarsa) IS kedaluwarsa),
  tgl_lapor TEXT CHECK (tgl_lapor IS NULL OR (date(tgl_lapor) IS tgl_lapor AND tgl_lapor >= tgl_bast)),
  sumber TEXT NOT NULL CHECK (sumber IN ('kepdep', 'inalogpal', 'isian')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL CHECK (diubah >= dibuat),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS hibah_bast_wilayah ON hibah_bast (prov, kab, tahun);
-- hanya tgl_lapor yang boleh berubah sesudah impor
CREATE TRIGGER IF NOT EXISTS hibah_bast_ubah BEFORE UPDATE ON hibah_bast
WHEN NEW.id != OLD.id OR NEW.tahun != OLD.tahun OR NEW.prov != OLD.prov OR NEW.kab IS NOT OLD.kab OR NEW.barang != OLD.barang
  OR NEW.jumlah != OLD.jumlah OR NEW.satuan != OLD.satuan OR NEW.tgl_bast != OLD.tgl_bast OR NEW.sumber != OLD.sumber OR NEW.dibuat != OLD.dibuat
BEGIN SELECT RAISE(ABORT, 'hanya tanggal laporan penggunaan yang boleh diubah'); END;
CREATE TRIGGER IF NOT EXISTS hibah_bast_timpa BEFORE INSERT ON hibah_bast WHEN EXISTS (SELECT 1 FROM hibah_bast WHERE id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'BAST yang sudah tercatat tidak boleh ditimpa; ubah tanggal laporan saja'); END;

-- DIK-1: angkatan pelatihan Pusdiklat PB, tanpa nama peserta (agregat per angkatan per kab).
CREATE TABLE IF NOT EXISTS diklat_angkatan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  program TEXT NOT NULL CHECK (length(program) BETWEEN 3 AND 120),
  jenis TEXT NOT NULL CHECK (jenis IN ('teknis_dasar', 'teknis_lanjutan', 'teknis_kepemimpinan', 'fungsional')),
  tgl_mulai TEXT NOT NULL CHECK (date(tgl_mulai) IS tgl_mulai),
  tgl_selesai TEXT NOT NULL CHECK (date(tgl_selesai) IS tgl_selesai AND tgl_selesai >= tgl_mulai),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT CHECK (kab IS NULL OR (length(kab) = 4 AND kab NOT GLOB '*[^0-9]*' AND substr(kab, 1, 2) = prov)),
  n_peserta INTEGER NOT NULL CHECK (n_peserta BETWEEN 1 AND 5000),
  n_lulus INTEGER NOT NULL CHECK (n_lulus BETWEEN 0 AND n_peserta),
  penyelenggara TEXT NOT NULL CHECK (length(penyelenggara) BETWEEN 2 AND 80),
  dibuat INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS diklat_angkatan_kab ON diklat_angkatan (prov, kab, tgl_selesai);
CREATE UNIQUE INDEX IF NOT EXISTS diklat_angkatan_unik ON diklat_angkatan (program, tgl_mulai, prov, ifnull(kab, ''));
