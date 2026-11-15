-- Status Lifeline per kab/kota (LF-01; data/kajian-bnpb/lifeline/DESAIN-TEKNIS.md). Idempoten, data operasi tidak publik.
-- lf_status = status resmi terkini (ditetapkan staf), lf_riwayat = jejak append-only, lf_usulan = cache usulan mesin (tidak pernah menjadi status).
-- Status selain abu wajib bertumpu pada bukti (daftar isyarat) atau catatan 20 sampai 300 karakter (D4); CHECK di lf_riwayat menjaganya.
CREATE TABLE IF NOT EXISTS lf_status (
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian(id) CHECK (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????'),
  kab4 TEXT NOT NULL CHECK (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*'),
  layanan TEXT NOT NULL CHECK (layanan IN ('listrik', 'sinyal', 'air', 'jalan', 'bbm', 'faskes', 'pangan', 'pengungsian')),
  warna TEXT NOT NULL CHECK (warna IN ('hijau', 'kuning', 'merah', 'abu')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) BETWEEN 20 AND 300),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  diubah INTEGER NOT NULL,
  PRIMARY KEY (kejadian_id, kab4, layanan)
);
CREATE TABLE IF NOT EXISTS lf_riwayat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian(id) CHECK (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????'),
  kab4 TEXT NOT NULL CHECK (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*'),
  layanan TEXT NOT NULL CHECK (layanan IN ('listrik', 'sinyal', 'air', 'jalan', 'bbm', 'faskes', 'pangan', 'pengungsian')),
  warna TEXT NOT NULL CHECK (warna IN ('hijau', 'kuning', 'merah', 'abu')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) BETWEEN 20 AND 300),
  bukti TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(bukti) AND json_type(bukti) = 'array' AND length(bukti) <= 2000),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  dibuat INTEGER NOT NULL,
  CHECK (warna = 'abu' OR json_array_length(bukti) > 0 OR catatan IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS lf_riwayat_sel ON lf_riwayat (kejadian_id, kab4, layanan, dibuat);
CREATE TRIGGER IF NOT EXISTS lf_riwayat_tetap_ubah BEFORE UPDATE ON lf_riwayat BEGIN SELECT RAISE(ABORT, 'riwayat lifeline tidak boleh diubah'); END;
CREATE TRIGGER IF NOT EXISTS lf_riwayat_tetap_hapus BEFORE DELETE ON lf_riwayat BEGIN SELECT RAISE(ABORT, 'riwayat lifeline tidak boleh dihapus'); END;
CREATE TABLE IF NOT EXISTS lf_usulan (
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian(id) CHECK (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????'),
  kab4 TEXT NOT NULL CHECK (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*'),
  layanan TEXT NOT NULL CHECK (layanan IN ('listrik', 'sinyal', 'air', 'jalan', 'bbm', 'faskes', 'pangan', 'pengungsian')),
  warna TEXT NOT NULL CHECK (warna IN ('hijau', 'kuning', 'merah', 'abu')),
  alasan TEXT NOT NULL CHECK (length(alasan) <= 300),
  isyarat TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(isyarat) AND json_type(isyarat) = 'array' AND length(isyarat) <= 2000),
  dihitung INTEGER NOT NULL,
  PRIMARY KEY (kejadian_id, kab4, layanan)
);
