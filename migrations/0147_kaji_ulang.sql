-- Kaji ulang pasca-kejadian (KU-01; data/kajian-bnpb/kaji-ulang/DESAIN-TEKNIS.md). Idempoten, data operasi tidak publik, tanpa kolom dummy. Waktu = ms epoch UTC.
-- ku_kaji: satu baris per kejadian (draf lalu disahkan; sahkan ulang menaikkan versi). ku_potret: versi lama yang digantikan, append-only (diisi pemicu).
-- ku_pelajaran, ku_rekomendasi: isian staf; sesudah disahkan hanya boleh ditambah. Status dan riwayat rekomendasi tinggal di dl_tindak/dl_tindak_log (0128), kunci kaji|KJ|nn.
-- Tiap FK ke sk_kejadian punya indeks penunjuk (pelajaran 0146): kejadian_id awal indeks komposit atau kunci utama.
CREATE TABLE IF NOT EXISTS ku_kaji (
  kejadian_id TEXT PRIMARY KEY REFERENCES sk_kejadian(id) CHECK (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????'),
  status TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'disahkan')),
  versi INTEGER NOT NULL DEFAULT 0 CHECK (versi BETWEEN 0 AND 999),
  mulai_oleh TEXT NOT NULL CHECK (length(mulai_oleh) BETWEEN 1 AND 64),
  dibuat INTEGER NOT NULL,
  disahkan_oleh TEXT CHECK (disahkan_oleh IS NULL OR length(disahkan_oleh) BETWEEN 1 AND 64),
  disahkan_pada INTEGER,
  potret TEXT CHECK (potret IS NULL OR (json_valid(potret) AND length(potret) <= 100000)),
  diubah INTEGER NOT NULL,
  CHECK ((status = 'draf' AND versi = 0 AND disahkan_oleh IS NULL AND disahkan_pada IS NULL AND potret IS NULL)
      OR (status = 'disahkan' AND versi >= 1 AND disahkan_oleh IS NOT NULL AND disahkan_pada IS NOT NULL AND potret IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS ku_potret (
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian(id) CHECK (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????'),
  versi INTEGER NOT NULL CHECK (versi BETWEEN 1 AND 999),
  potret TEXT NOT NULL CHECK (json_valid(potret) AND length(potret) <= 100000),
  disahkan_oleh TEXT NOT NULL CHECK (length(disahkan_oleh) BETWEEN 1 AND 64),
  disahkan_pada INTEGER NOT NULL,
  PRIMARY KEY (kejadian_id, versi)
);
CREATE TABLE IF NOT EXISTS ku_pelajaran (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian(id) CHECK (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????'),
  kategori TEXT NOT NULL CHECK (kategori IN ('baik', 'perbaiki')),
  teks TEXT NOT NULL CHECK (length(teks) BETWEEN 10 AND 1000),
  rujuk TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(rujuk) AND json_type(rujuk) = 'array' AND length(rujuk) <= 400),
  asal_ops_id TEXT CHECK (asal_ops_id IS NULL OR length(asal_ops_id) BETWEEN 1 AND 40),
  versi_tambah INTEGER NOT NULL DEFAULT 0 CHECK (versi_tambah BETWEEN 0 AND 999),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  dibuat INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ku_pelajaran_kej ON ku_pelajaran (kejadian_id, dibuat);
CREATE TABLE IF NOT EXISTS ku_rekomendasi (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian(id) CHECK (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????'),
  nomor INTEGER NOT NULL CHECK (nomor BETWEEN 1 AND 99),
  kunci TEXT NOT NULL UNIQUE CHECK (kunci = 'kaji|' || kejadian_id || '|' || printf('%02d', nomor)),
  teks TEXT NOT NULL CHECK (length(teks) BETWEEN 10 AND 400),
  unit TEXT NOT NULL CHECK (length(unit) BETWEEN 2 AND 80),
  tenggat TEXT NOT NULL CHECK (tenggat GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]' AND date(tenggat) IS tenggat),
  pelajaran_id TEXT REFERENCES ku_pelajaran(id),
  tidak_dilanjutkan INTEGER NOT NULL DEFAULT 0 CHECK (tidak_dilanjutkan IN (0, 1)),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  dibuat INTEGER NOT NULL,
  UNIQUE (kejadian_id, nomor)
);
CREATE INDEX IF NOT EXISTS ku_rekomendasi_pelajaran ON ku_rekomendasi (pelajaran_id) WHERE pelajaran_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ku_rekomendasi_tenggat ON ku_rekomendasi (tenggat, kejadian_id);
-- ku_kaji: tidak kembali ke draf; versi tidak turun; sahkan ulang memindahkan versi lama ke ku_potret (atomik dengan UPDATE-nya)
CREATE TRIGGER IF NOT EXISTS ku_kaji_tetap_sah BEFORE UPDATE ON ku_kaji WHEN OLD.status = 'disahkan' AND (NEW.status <> 'disahkan' OR NEW.versi < OLD.versi) BEGIN SELECT RAISE(ABORT, 'kaji ulang yang disahkan tidak kembali ke draf'); END;
CREATE TRIGGER IF NOT EXISTS ku_kaji_arsip_versi AFTER UPDATE OF versi ON ku_kaji WHEN OLD.status = 'disahkan' AND NEW.versi > OLD.versi BEGIN INSERT INTO ku_potret (kejadian_id, versi, potret, disahkan_oleh, disahkan_pada) VALUES (OLD.kejadian_id, OLD.versi, OLD.potret, OLD.disahkan_oleh, OLD.disahkan_pada); END;
CREATE TRIGGER IF NOT EXISTS ku_potret_tetap_ubah BEFORE UPDATE ON ku_potret BEGIN SELECT RAISE(ABORT, 'potret kaji ulang tidak boleh diubah'); END;
CREATE TRIGGER IF NOT EXISTS ku_potret_tetap_hapus BEFORE DELETE ON ku_potret BEGIN SELECT RAISE(ABORT, 'potret kaji ulang tidak boleh dihapus'); END;
-- pelajaran dan rekomendasi: beku sesudah kaji ulangnya disahkan (hanya tambah baris baru); satu-satunya perubahan sah sesudahnya ialah menandai rekomendasi tidak_dilanjutkan 0 -> 1 (Q8)
CREATE TRIGGER IF NOT EXISTS ku_pelajaran_beku_ubah BEFORE UPDATE ON ku_pelajaran WHEN EXISTS (SELECT 1 FROM ku_kaji WHERE kejadian_id = OLD.kejadian_id AND status = 'disahkan') BEGIN SELECT RAISE(ABORT, 'pelajaran kaji ulang yang disahkan tidak boleh diubah'); END;
CREATE TRIGGER IF NOT EXISTS ku_pelajaran_beku_hapus BEFORE DELETE ON ku_pelajaran WHEN EXISTS (SELECT 1 FROM ku_kaji WHERE kejadian_id = OLD.kejadian_id AND status = 'disahkan') BEGIN SELECT RAISE(ABORT, 'pelajaran kaji ulang yang disahkan tidak boleh dihapus'); END;
CREATE TRIGGER IF NOT EXISTS ku_rekomendasi_beku_ubah BEFORE UPDATE ON ku_rekomendasi WHEN EXISTS (SELECT 1 FROM ku_kaji WHERE kejadian_id = OLD.kejadian_id AND status = 'disahkan')
  AND NOT (OLD.tidak_dilanjutkan = 0 AND NEW.tidak_dilanjutkan = 1 AND NEW.id = OLD.id AND NEW.kejadian_id = OLD.kejadian_id AND NEW.nomor = OLD.nomor AND NEW.kunci = OLD.kunci AND NEW.teks = OLD.teks AND NEW.unit = OLD.unit AND NEW.tenggat = OLD.tenggat AND NEW.pelajaran_id IS OLD.pelajaran_id AND NEW.oleh = OLD.oleh AND NEW.dibuat = OLD.dibuat)
  BEGIN SELECT RAISE(ABORT, 'rekomendasi kaji ulang yang disahkan tidak boleh diubah'); END;
CREATE TRIGGER IF NOT EXISTS ku_rekomendasi_beku_hapus BEFORE DELETE ON ku_rekomendasi WHEN EXISTS (SELECT 1 FROM ku_kaji WHERE kejadian_id = OLD.kejadian_id AND status = 'disahkan') BEGIN SELECT RAISE(ABORT, 'rekomendasi kaji ulang yang disahkan tidak boleh dihapus'); END;
-- dl_tindak_log (0128) append-only: 0128 tidak punya pemicu tolak ubah/hapus; dipasang di sini (tidak ada kode yang meng-UPDATE/DELETE-nya)
CREATE TRIGGER IF NOT EXISTS dl_tindak_log_tetap_ubah BEFORE UPDATE ON dl_tindak_log BEGIN SELECT RAISE(ABORT, 'riwayat tindak lanjut tidak boleh diubah'); END;
CREATE TRIGGER IF NOT EXISTS dl_tindak_log_tetap_hapus BEFORE DELETE ON dl_tindak_log BEGIN SELECT RAISE(ABORT, 'riwayat tindak lanjut tidak boleh dihapus'); END;
-- Anti-akal: INSERT OR REPLACE menghapus baris bentrok tanpa memicu BEFORE DELETE (recursive_triggers mati), jadi tiap tabel beku menolak INSERT yang bentrok kunci SEBELUM penyelesaian konflik.
CREATE TRIGGER IF NOT EXISTS ku_kaji_tetap_hapus BEFORE DELETE ON ku_kaji WHEN OLD.status = 'disahkan' BEGIN SELECT RAISE(ABORT, 'kaji ulang yang disahkan tidak boleh dihapus'); END;
CREATE TRIGGER IF NOT EXISTS ku_kaji_tetap_sisip BEFORE INSERT ON ku_kaji WHEN EXISTS (SELECT 1 FROM ku_kaji WHERE kejadian_id = NEW.kejadian_id) BEGIN SELECT RAISE(ABORT, 'kaji ulang kejadian ini sudah ada; tidak boleh ditimpa'); END;
CREATE TRIGGER IF NOT EXISTS ku_potret_tetap_sisip BEFORE INSERT ON ku_potret WHEN EXISTS (SELECT 1 FROM ku_potret WHERE kejadian_id = NEW.kejadian_id AND versi = NEW.versi) BEGIN SELECT RAISE(ABORT, 'potret kaji ulang tidak boleh ditimpa'); END;
CREATE TRIGGER IF NOT EXISTS ku_pelajaran_tetap_sisip BEFORE INSERT ON ku_pelajaran WHEN EXISTS (SELECT 1 FROM ku_pelajaran WHERE id = NEW.id) BEGIN SELECT RAISE(ABORT, 'pelajaran tidak boleh ditimpa'); END;
CREATE TRIGGER IF NOT EXISTS ku_rekomendasi_tetap_sisip BEFORE INSERT ON ku_rekomendasi WHEN EXISTS (SELECT 1 FROM ku_rekomendasi WHERE id = NEW.id OR kunci = NEW.kunci OR (kejadian_id = NEW.kejadian_id AND nomor = NEW.nomor)) BEGIN SELECT RAISE(ABORT, 'rekomendasi tidak boleh ditimpa'); END;
-- potret, pengesah, dan waktu sahkan hanya berubah bersama kenaikan versi (sahkan ulang)
CREATE TRIGGER IF NOT EXISTS ku_kaji_tetap_potret BEFORE UPDATE ON ku_kaji WHEN OLD.status = 'disahkan' AND NEW.versi = OLD.versi AND (NEW.potret IS NOT OLD.potret OR NEW.disahkan_oleh IS NOT OLD.disahkan_oleh OR NEW.disahkan_pada IS NOT OLD.disahkan_pada) BEGIN SELECT RAISE(ABORT, 'potret yang disahkan hanya berubah lewat sahkan ulang (versi naik)'); END;
