-- 3W dan tawaran bantuan (TW-02; data/kajian-bnpb/tiga-w/DESAIN-TEKNIS.md). Idempoten, tanpa kolom dummy, tidak publik.
-- org = register aktor luar (bukan per kejadian). tw_* = per kejadian, semua FK ke sk_kejadian (aturan Keterpaduan D2).
-- Delapan klaster PB nasional (Keputusan Kepala BNPB 173/2014); daftar yang sama WAJIB ada di public/inti/klaster.js dan src/hak.js (TW_KLASTER).
CREATE TABLE IF NOT EXISTS org (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 120),
  singkatan TEXT CHECK (singkatan IS NULL OR length(singkatan) BETWEEN 2 AND 20),
  jenis TEXT NOT NULL CHECK (jenis IN ('kl', 'tni', 'polri', 'ngo_nasional', 'ngo_internasional', 'dunia_usaha', 'kampus', 'pmi', 'pbb_regional', 'lainnya')),
  negara TEXT CHECK (negara IS NULL OR (length(negara) = 2 AND negara NOT GLOB '*[^A-Z]*')),
  institusi_id TEXT REFERENCES institusi (id),
  dibuat INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  CHECK (jenis != 'ngo_internasional' OR negara IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS tw_baris (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian (id) CHECK (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????'),
  kab4 TEXT NOT NULL CHECK (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*'),
  klaster TEXT NOT NULL CHECK (klaster IN ('kesehatan', 'sar', 'logistik', 'pengungsian', 'pendidikan', 'sarpras', 'ekonomi', 'pemulihan')),
  org_id TEXT NOT NULL REFERENCES org (id),
  kegiatan TEXT NOT NULL CHECK (length(kegiatan) BETWEEN 5 AND 200),
  status TEXT NOT NULL CHECK (status IN ('rencana', 'berjalan', 'selesai')),
  mulai INTEGER,
  selesai INTEGER,
  sumber TEXT NOT NULL CHECK (sumber IN ('staf', 'token')),
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  CHECK (selesai IS NULL OR mulai IS NULL OR selesai >= mulai)
);
CREATE INDEX IF NOT EXISTS tw_baris_sel ON tw_baris (kejadian_id, kab4, klaster);
CREATE INDEX IF NOT EXISTS tw_baris_org ON tw_baris (kejadian_id, org_id);
-- hanya sha-256 token yang disimpan; satu token AKTIF per (organisasi, kejadian); dicabut = penanda, bukan hapus
CREATE TABLE IF NOT EXISTS tw_token (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  org_id TEXT NOT NULL REFERENCES org (id),
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian (id) CHECK (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????'),
  token_sha TEXT NOT NULL UNIQUE CHECK (length(token_sha) = 64 AND token_sha NOT GLOB '*[^0-9a-f]*'),
  dibuat INTEGER NOT NULL,
  cabut INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS tw_token_aktif ON tw_token (org_id, kejadian_id) WHERE cabut IS NULL;
CREATE TABLE IF NOT EXISTS tw_tawaran (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian (id) CHECK (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????'),
  org_id TEXT NOT NULL REFERENCES org (id),
  barang TEXT NOT NULL CHECK (length(barang) BETWEEN 2 AND 40),
  barang_lain TEXT CHECK (barang_lain IS NULL OR length(barang_lain) BETWEEN 2 AND 80),
  jumlah INTEGER NOT NULL CHECK (jumlah BETWEEN 1 AND 100000000),
  satuan TEXT NOT NULL CHECK (length(satuan) BETWEEN 1 AND 20),
  syarat TEXT CHECK (syarat IS NULL OR length(syarat) <= 300),
  mitra_lokal_org_id TEXT REFERENCES org (id),
  status TEXT NOT NULL DEFAULT 'masuk' CHECK (status IN ('masuk', 'dicocokkan', 'diterima', 'dialihkan', 'ditolak')),
  alasan_internal TEXT CHECK (alasan_internal IS NULL OR length(alasan_internal) <= 300),
  alasan_organisasi TEXT CHECK (alasan_organisasi IS NULL OR length(alasan_organisasi) <= 300),
  kebutuhan TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(kebutuhan) AND json_type(kebutuhan) = 'array' AND length(kebutuhan) <= 2000),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  CHECK (status NOT IN ('dialihkan', 'ditolak') OR length(coalesce(alasan_organisasi, '')) >= 5)
);
CREATE INDEX IF NOT EXISTS tw_tawaran_status ON tw_tawaran (kejadian_id, status);
CREATE INDEX IF NOT EXISTS tw_tawaran_org ON tw_tawaran (kejadian_id, org_id);
CREATE TABLE IF NOT EXISTS tw_tawaran_riwayat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tawaran_id TEXT NOT NULL REFERENCES tw_tawaran (id),
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian (id) CHECK (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????'),
  status TEXT NOT NULL CHECK (status IN ('masuk', 'dicocokkan', 'diterima', 'dialihkan', 'ditolak')),
  alasan_internal TEXT CHECK (alasan_internal IS NULL OR length(alasan_internal) <= 300),
  alasan_organisasi TEXT CHECK (alasan_organisasi IS NULL OR length(alasan_organisasi) <= 300),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  dibuat INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS tw_riwayat_sel ON tw_tawaran_riwayat (tawaran_id, id);
CREATE TRIGGER IF NOT EXISTS tw_riwayat_tetap_ubah BEFORE UPDATE ON tw_tawaran_riwayat BEGIN SELECT RAISE(ABORT, 'riwayat tawaran tidak boleh diubah'); END;
CREATE TRIGGER IF NOT EXISTS tw_riwayat_tetap_hapus BEFORE DELETE ON tw_tawaran_riwayat BEGIN SELECT RAISE(ABORT, 'riwayat tawaran tidak boleh dihapus'); END;
-- Pencocokan tawaran ke meja logistik (ALGORITMA 3): barang ada di JSON data, jadi indeks ekspresi (kunci JSON: 'barang', meja_spek.js logistik).
CREATE INDEX IF NOT EXISTS tw_meja_barang ON meja_catatan (meja, prov, kab, json_extract(data, '$.barang')) WHERE meja = 'logistik';
