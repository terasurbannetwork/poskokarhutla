-- Pemetaan bangunan oleh relawan (HR-06; data/kajian-bnpb/pemetaan-relawan/DESAIN-TEKNIS.md). Idempoten, tanpa kolom dummy, tanpa taut ke sk_kejadian (proyek antisipatif).
-- pm_proyek: satu kab hanya satu proyek aktif (indeks unik sebagian). Alur status dijaga pemicu: disiapkan -> disetujui|ditolak; disetujui -> dikirim; dikirim -> berjalan|selesai; berjalan -> selesai; selesai -> ditutup.
-- Status dikirim butuh persetujuan pemilik, tautan Tasking Manager, dan tiga centang daftar penyuntingan terorganisir (HR-13: halaman wiki OSM, pemberitahuan komunitas lokal, hashtag terdaftar).
-- pm_gabung: kampus (institusi) yang bergabung; pm_riwayat: jejak status append-only. Tidak ada nama atau nama pengguna OSM di tabel mana pun.
CREATE TABLE IF NOT EXISTS pm_proyek (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  kab4 TEXT NOT NULL CHECK (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*'),
  bahaya TEXT NOT NULL CHECK (bahaya IN ('banjir', 'longsor', 'gempa', 'tsunami', 'gunungapi', 'kekeringan', 'karhutla', 'cuaca_ekstrem', 'abrasi_rob', 'udara')),
  status TEXT NOT NULL DEFAULT 'disiapkan' CHECK (status IN ('disiapkan', 'disetujui', 'ditolak', 'dikirim', 'berjalan', 'selesai', 'ditutup')),
  aoi_r2 TEXT NOT NULL CHECK (length(aoi_r2) BETWEEN 3 AND 200),
  hashtag_dasar TEXT NOT NULL CHECK (length(hashtag_dasar) BETWEEN 3 AND 60 AND hashtag_dasar NOT GLOB '*[^A-Za-z0-9_-]*'),
  tautan_tm TEXT CHECK (tautan_tm IS NULL OR (tautan_tm GLOB 'https://*' AND length(tautan_tm) <= 200 AND tautan_tm NOT GLOB '*[ <>"]*')),
  cek_wiki INTEGER NOT NULL DEFAULT 0 CHECK (cek_wiki IN (0, 1)),
  cek_komunitas INTEGER NOT NULL DEFAULT 0 CHECK (cek_komunitas IN (0, 1)),
  cek_hashtag INTEGER NOT NULL DEFAULT 0 CHECK (cek_hashtag IN (0, 1)),
  rasio_awal REAL CHECK (rasio_awal IS NULL OR rasio_awal >= 0),
  rasio_akhir REAL CHECK (rasio_akhir IS NULL OR rasio_akhir >= 0),
  tanggal_data TEXT CHECK (tanggal_data IS NULL OR (tanggal_data GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]' AND date(tanggal_data) IS tanggal_data)),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  disetujui_oleh TEXT CHECK (disetujui_oleh IS NULL OR length(disetujui_oleh) BETWEEN 1 AND 64),
  CHECK (status IN ('disiapkan', 'ditolak') OR disetujui_oleh IS NOT NULL),
  CHECK (tautan_tm IS NULL OR status IN ('dikirim', 'berjalan', 'selesai', 'ditutup'))
);
CREATE UNIQUE INDEX IF NOT EXISTS pm_proyek_aktif ON pm_proyek (kab4) WHERE status NOT IN ('ditolak', 'ditutup');
CREATE INDEX IF NOT EXISTS pm_proyek_status ON pm_proyek (status, dibuat);
CREATE TRIGGER IF NOT EXISTS pm_proyek_alur BEFORE UPDATE OF status ON pm_proyek WHEN NEW.status <> OLD.status AND NOT (
     (OLD.status = 'disiapkan' AND NEW.status IN ('disetujui', 'ditolak'))
  OR (OLD.status = 'disetujui' AND NEW.status = 'dikirim')
  OR (OLD.status = 'dikirim' AND NEW.status IN ('berjalan', 'selesai'))
  OR (OLD.status = 'berjalan' AND NEW.status = 'selesai')
  OR (OLD.status = 'selesai' AND NEW.status = 'ditutup')) BEGIN SELECT RAISE(ABORT, 'perpindahan status proyek pemetaan tidak sah'); END;
CREATE TRIGGER IF NOT EXISTS pm_proyek_kirim BEFORE UPDATE OF status ON pm_proyek WHEN NEW.status = 'dikirim' AND OLD.status <> 'dikirim' AND NOT (NEW.tautan_tm IS NOT NULL AND NEW.cek_wiki = 1 AND NEW.cek_komunitas = 1 AND NEW.cek_hashtag = 1) BEGIN SELECT RAISE(ABORT, 'daftar penyuntingan terorganisir belum lengkap'); END;
CREATE TRIGGER IF NOT EXISTS pm_proyek_tetap_hapus BEFORE DELETE ON pm_proyek BEGIN SELECT RAISE(ABORT, 'proyek pemetaan tidak boleh dihapus'); END;
CREATE TABLE IF NOT EXISTS pm_gabung (
  proyek_id TEXT NOT NULL REFERENCES pm_proyek(id) CHECK (length(proyek_id) = 16),
  institusi_id TEXT NOT NULL REFERENCES institusi(id) CHECK (length(institusi_id) = 16),
  hashtag TEXT NOT NULL CHECK (hashtag GLOB 'CentuRisk-*' AND length(hashtag) BETWEEN 12 AND 60 AND hashtag NOT GLOB '*[^A-Za-z0-9_-]*'),
  dibuat INTEGER NOT NULL,
  PRIMARY KEY (proyek_id, institusi_id)
);
CREATE INDEX IF NOT EXISTS pm_gabung_institusi ON pm_gabung (institusi_id, proyek_id);
CREATE TABLE IF NOT EXISTS pm_riwayat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proyek_id TEXT NOT NULL REFERENCES pm_proyek(id) CHECK (length(proyek_id) = 16),
  status TEXT NOT NULL CHECK (status IN ('disiapkan', 'disetujui', 'ditolak', 'dikirim', 'berjalan', 'selesai', 'ditutup')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS pm_riwayat_proyek ON pm_riwayat (proyek_id, id);
CREATE TRIGGER IF NOT EXISTS pm_riwayat_tetap_ubah BEFORE UPDATE ON pm_riwayat BEGIN SELECT RAISE(ABORT, 'riwayat proyek pemetaan tidak boleh diubah'); END;
CREATE TRIGGER IF NOT EXISTS pm_riwayat_tetap_hapus BEFORE DELETE ON pm_riwayat BEGIN SELECT RAISE(ABORT, 'riwayat proyek pemetaan tidak boleh dihapus'); END;
-- Anti-akal: proyek baru selalu mulai 'disiapkan' tanpa tautan, persetujuan, atau centang (gerbang HR-13 tidak bisa dilewati lewat INSERT), dan INSERT OR REPLACE tidak boleh
-- menimpa id atau proyek aktif sekab (REPLACE menghapus baris bentrok tanpa memicu BEFORE DELETE). pm_riwayat tidak bisa ditimpa lewat id.
CREATE TRIGGER IF NOT EXISTS pm_proyek_sisip BEFORE INSERT ON pm_proyek WHEN NEW.status <> 'disiapkan' OR NEW.tautan_tm IS NOT NULL OR NEW.disetujui_oleh IS NOT NULL OR NEW.cek_wiki <> 0 OR NEW.cek_komunitas <> 0 OR NEW.cek_hashtag <> 0
  OR EXISTS (SELECT 1 FROM pm_proyek WHERE id = NEW.id OR (kab4 = NEW.kab4 AND status NOT IN ('ditolak', 'ditutup'))) BEGIN SELECT RAISE(ABORT, 'proyek pemetaan baru harus disiapkan, polos, dan satu per kab aktif'); END;
CREATE TRIGGER IF NOT EXISTS pm_proyek_tetap_syarat BEFORE UPDATE OF tautan_tm, cek_wiki, cek_komunitas, cek_hashtag, status ON pm_proyek WHEN OLD.status IN ('dikirim', 'berjalan', 'selesai', 'ditutup') AND NEW.status IN ('dikirim', 'berjalan', 'selesai', 'ditutup')
  AND (NEW.tautan_tm IS NULL OR NEW.cek_wiki = 0 OR NEW.cek_komunitas = 0 OR NEW.cek_hashtag = 0) BEGIN SELECT RAISE(ABORT, 'tautan dan daftar penyuntingan tidak boleh dicabut sesudah dikirim'); END;
CREATE TRIGGER IF NOT EXISTS pm_riwayat_tetap_sisip BEFORE INSERT ON pm_riwayat WHEN NEW.id IS NOT NULL AND EXISTS (SELECT 1 FROM pm_riwayat WHERE id = NEW.id) BEGIN SELECT RAISE(ABORT, 'riwayat proyek pemetaan tidak boleh ditimpa'); END;
