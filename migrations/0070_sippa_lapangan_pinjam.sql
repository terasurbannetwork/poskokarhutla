-- SIPPA fase 2 sisi server (keputusan pemilik 61; SP-120 sampai SP-131). Idempoten.
-- 1) sippa_lapangan: butir form lapangan HP per jenis (periksa, foto, sos, tekanan, jejak, selesai, bor, debit); isi per jenis di kolom data (JSON objek).
-- 2) sippa_pinjam + sippa_ba_urut: pinjam-pakai alat dengan nomor berita acara berurut per tahun.
-- 3) sippa_inspeksi dibangun ulang: tindakan 'tunggu_suku_cadang' ditambah ke CHECK (CHECK SQLite tidak bisa di-ALTER). Isi, indeks, dan empat trigger 0059 dipasang ulang apa adanya.

CREATE TABLE IF NOT EXISTS sippa_lapangan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 OR length(id) = 36),   -- UUID v4 klien (kirim ulang idempoten) atau id foto 16 heks
  jenis TEXT NOT NULL CHECK (jenis IN ('periksa', 'foto', 'sos', 'tekanan', 'jejak', 'selesai', 'bor', 'debit')),
  tugas_id TEXT NOT NULL CHECK (length(tugas_id) = 16),
  kit_id TEXT CHECK (kit_id IS NULL OR length(kit_id) = 16),
  kompleks_id TEXT CHECK (kompleks_id IS NULL OR kompleks_id GLOB 'K[0-9]*'),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  data TEXT NOT NULL CHECK (json_valid(data) AND json_type(data) = 'object' AND length(data) <= 40000),
  waktu INTEGER NOT NULL,
  diterima INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_sippa_lap_tugas ON sippa_lapangan (tugas_id, jenis, waktu);
CREATE INDEX IF NOT EXISTS idx_sippa_lap_kompleks ON sippa_lapangan (kompleks_id, jenis, waktu);
CREATE TRIGGER IF NOT EXISTS sippa_lap_tetap BEFORE UPDATE ON sippa_lapangan
BEGIN
  SELECT RAISE(ABORT, 'sippa_lap_tetap: sippa_lapangan hanya bisa ditambah');
END;
CREATE TRIGGER IF NOT EXISTS sippa_lap_hapus BEFORE DELETE ON sippa_lapangan
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'sippa_lap_hapus: sippa_lapangan hanya bisa ditambah');
END;
-- gelar selesai: komponen kit tugas yang dilaporkan hilang ditandai hilang bila kode_bom cocok (kode lain diabaikan)
CREATE TRIGGER IF NOT EXISTS sippa_lap_selesai AFTER INSERT ON sippa_lapangan
WHEN NEW.jenis = 'selesai' AND NEW.kit_id IS NOT NULL
BEGIN
  UPDATE sippa_komponen SET kondisi = 'hilang', dicek = NEW.waktu
   WHERE kit_id = NEW.kit_id AND kode_bom IN (SELECT value FROM json_each(NEW.data, '$.alat_hilang'));
END;

CREATE TABLE IF NOT EXISTS sippa_ba_urut (
  tahun INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  terakhir INTEGER NOT NULL CHECK (terakhir >= 1),
  PRIMARY KEY (tahun, dummy)
);
CREATE TABLE IF NOT EXISTS sippa_pinjam (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nomor_ba TEXT NOT NULL UNIQUE CHECK (nomor_ba GLOB 'BA-SIPPA-[0-9][0-9][0-9][0-9]-*'),
  kit_id TEXT CHECK (kit_id IS NULL OR length(kit_id) = 16),
  kode_bom TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(kode_bom) AND json_type(kode_bom) = 'array' AND length(kode_bom) <= 2000),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  pemilik_asal TEXT NOT NULL CHECK (length(pemilik_asal) BETWEEN 2 AND 80),
  penerima TEXT NOT NULL CHECK (length(penerima) BETWEEN 2 AND 80),
  mulai INTEGER NOT NULL,
  selesai_rencana INTEGER NOT NULL,
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  kembali INTEGER,
  kondisi_kembali TEXT CHECK (kondisi_kembali IS NULL OR length(kondisi_kembali) <= 200),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (selesai_rencana > mulai),
  CHECK (kit_id IS NOT NULL OR json_array_length(kode_bom) > 0)
);
CREATE INDEX IF NOT EXISTS idx_sippa_pinjam_prov ON sippa_pinjam (prov, mulai);
-- sesudah dikembalikan, baris tidak berubah lagi
CREATE TRIGGER IF NOT EXISTS sippa_pinjam_tetap BEFORE UPDATE ON sippa_pinjam
WHEN OLD.kembali IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'sippa_pinjam_tetap: pinjaman yang sudah kembali tidak bisa diubah');
END;
CREATE TRIGGER IF NOT EXISTS sippa_pinjam_hapus BEFORE DELETE ON sippa_pinjam
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'sippa_pinjam_hapus: berita acara tidak bisa dihapus');
END;

-- sippa_inspeksi: salinan 0059 dengan satu nilai tindakan tambahan
-- tanpa ALTER ... RENAME: RENAME memeriksa seluruh skema dan gagal bila tabel lain (mis. instansi_akun, 0029) belum ada. Jalur: salin ke tabel sementara, jatuhkan, buat ulang, isi kembali.
DROP TABLE IF EXISTS sippa_inspeksi_cad;
CREATE TABLE sippa_inspeksi_cad AS SELECT * FROM sippa_inspeksi;
DROP TABLE sippa_inspeksi;
CREATE TABLE sippa_inspeksi (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 OR length(id) = 36),
  sasaran_jenis TEXT NOT NULL CHECK (sasaran_jenis IN ('komponen', 'kit', 'aset')),
  sasaran_id TEXT NOT NULL CHECK (length(sasaran_id) = 16),
  kit_id TEXT CHECK (kit_id IS NULL OR length(kit_id) = 16),
  jenis TEXT NOT NULL CHECK (jenis IN ('pra_gelar', 'pasca_gelar', 'berkala', 'pra_musim', 'tahunan', 'pasca_bencana', 'servis', 'uji_tekanan', 'mutu_air', 'serah_terima')),
  skor INTEGER NOT NULL CHECK (skor BETWEEN 0 AND 3),
  jam_operasi REAL CHECK (jam_operasi IS NULL OR jam_operasi BETWEEN 0 AND 100000),
  temuan TEXT CHECK (temuan IS NULL OR length(temuan) <= 1000),
  tindakan TEXT NOT NULL DEFAULT 'tidak_ada' CHECK (tindakan IN ('tidak_ada', 'perbaiki', 'ganti', 'afkir', 'uji_ulang', 'serahkan', 'tunggu_suku_cadang')),
  hasil TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(hasil) AND json_type(hasil) = 'object' AND length(hasil) <= 2048),
  foto_id TEXT CHECK (foto_id IS NULL OR length(foto_id) = 16),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (sasaran_jenis = 'aset' OR kit_id IS NOT NULL),
  CHECK (jenis != 'mutu_air' OR json_extract(hasil, '$.e_coli_cfu') IS NOT NULL),
  CHECK (jenis != 'uji_tekanan' OR json_extract(hasil, '$.tekanan_bar') IS NOT NULL)
);
INSERT INTO sippa_inspeksi (id, sasaran_jenis, sasaran_id, kit_id, jenis, skor, jam_operasi, temuan, tindakan, hasil, foto_id, prov, oleh, waktu, dummy)
  SELECT id, sasaran_jenis, sasaran_id, kit_id, jenis, skor, jam_operasi, temuan, tindakan, hasil, foto_id, prov, oleh, waktu, dummy FROM sippa_inspeksi_cad ORDER BY rowid;
DROP TABLE sippa_inspeksi_cad;
CREATE INDEX IF NOT EXISTS idx_sippa_insp_sasaran ON sippa_inspeksi (sasaran_jenis, sasaran_id, waktu);
CREATE TRIGGER IF NOT EXISTS sippa_insp_komp_cek BEFORE INSERT ON sippa_inspeksi
WHEN NEW.sasaran_jenis = 'komponen'
  AND NOT EXISTS (SELECT 1 FROM sippa_komponen WHERE id = NEW.sasaran_id AND kit_id = NEW.kit_id)
BEGIN
  SELECT RAISE(ABORT, 'sippa_insp_komp_cek: komponen bukan milik kit ini');
END;
CREATE TRIGGER IF NOT EXISTS sippa_insp_komp_terapkan AFTER INSERT ON sippa_inspeksi
WHEN NEW.sasaran_jenis = 'komponen'
BEGIN
  UPDATE sippa_komponen
     SET kondisi = CASE NEW.skor WHEN 0 THEN 'baik' WHEN 1 THEN 'rusak_ringan' WHEN 2 THEN 'rusak_berat' ELSE 'hilang' END,
         dicek = NEW.waktu
   WHERE id = NEW.sasaran_id;
END;
CREATE TRIGGER IF NOT EXISTS sippa_insp_tetap BEFORE UPDATE ON sippa_inspeksi
BEGIN
  SELECT RAISE(ABORT, 'sippa_insp_tetap: sippa_inspeksi hanya bisa ditambah');
END;
CREATE TRIGGER IF NOT EXISTS sippa_insp_hapus BEFORE DELETE ON sippa_inspeksi
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'sippa_insp_hapus: sippa_inspeksi hanya bisa ditambah');
END;
