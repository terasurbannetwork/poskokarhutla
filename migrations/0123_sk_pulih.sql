-- 0123: Siklus Bencana gelombang G3 (F4 Jitupasna ke R3P Digital). Rancangan: data/kajian-bnpb/siklus/DESAIN-TEKNIS.md bagian 3.3; KEPUTUSAN-AWAL.md (butir 12, 13, 20; U4, U7, U8, U10).
-- Hanya CREATE ... IF NOT EXISTS. Tidak ada tabel rumah rusak kedua (rekap dibaca dari rumah_rusak), tidak ada kolom nama/NIK/koordinat, tidak menambah meja_*. Kolom dummy di semua tabel.
-- sektor TANPA CHECK daftar (U10 terbuka); daftar dijaga Worker. Harga satuan tanpa acuan resmi berlabel asumsi-kebijakan (U4, U8).
-- Komentar `--` sengaja di baris sendiri (pecah() di tests/warga/_bantu.mjs memotong di baris berakhir ';').
CREATE TABLE IF NOT EXISTS sk_harga (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  sektor TEXT NOT NULL CHECK (length(sektor) BETWEEN 2 AND 40),
  tingkat TEXT NOT NULL CHECK (tingkat IN ('rb', 'rs', 'rr', 'hancur', 'unit')),
  satuan TEXT NOT NULL CHECK (length(satuan) BETWEEN 1 AND 20),
  harga_rp INTEGER NOT NULL CHECK (harga_rp BETWEEN 1 AND 100000000000),
  tahun INTEGER NOT NULL CHECK (tahun BETWEEN 2000 AND 2100),
  kab4 TEXT CHECK (kab4 IS NULL OR (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*')),
  dokumen TEXT NOT NULL CHECK (length(dokumen) BETWEEN 3 AND 200),
  yakin TEXT NOT NULL DEFAULT 'asumsi-kebijakan' CHECK (yakin IN ('asumsi-kebijakan', 'resmi')),
  dibuat INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS sk_harga_cari ON sk_harga (sektor, tahun DESC, kab4);
CREATE INDEX IF NOT EXISTS sk_harga_dummy ON sk_harga (id) WHERE dummy = 1;

CREATE TABLE IF NOT EXISTS sk_jitupasna (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian(id) CHECK (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????' AND substr(kejadian_id, 9) NOT GLOB '*[^0-9A-HJKMNP-TV-Z]*'),
  kaji_id TEXT CHECK (kaji_id IS NULL OR (length(kaji_id) = 16 AND kaji_id NOT GLOB '*[^0-9a-f]*')),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab4 TEXT NOT NULL CHECK (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*'),
  status TEXT NOT NULL DEFAULT 'dibuka' CHECK (status IN ('dibuka', 'pengumpulan', 'dihitung', 'ditinjau', 'final')),
  tim_sk TEXT CHECK (tim_sk IS NULL OR length(tim_sk) BETWEEN 1 AND 120),
  versi INTEGER NOT NULL DEFAULT 1 CHECK (versi BETWEEN 1 AND 99),
  induk_id TEXT CHECK (induk_id IS NULL OR (length(induk_id) = 16 AND induk_id NOT GLOB '*[^0-9a-f]*')),
  tahun_harga INTEGER CHECK (tahun_harga IS NULL OR tahun_harga BETWEEN 2000 AND 2100),
  hitung TEXT CHECK (hitung IS NULL OR (json_valid(hitung) AND json_type(hitung) = 'object' AND length(hitung) <= 3000)),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (kejadian_id, kab4, versi, dummy),
  CHECK (status IN ('dibuka', 'pengumpulan') OR hitung IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS sk_jp_kab ON sk_jitupasna (kab4, diubah DESC);
CREATE INDEX IF NOT EXISTS sk_jp_kej ON sk_jitupasna (kejadian_id);
CREATE INDEX IF NOT EXISTS sk_jp_dummy ON sk_jitupasna (id) WHERE dummy = 1;

CREATE TABLE IF NOT EXISTS sk_jitupasna_baris (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  jitupasna_id TEXT NOT NULL REFERENCES sk_jitupasna(id) CHECK (length(jitupasna_id) = 16 AND jitupasna_id NOT GLOB '*[^0-9a-f]*'),
  jenis TEXT NOT NULL CHECK (jenis IN ('rusak', 'rugi')),
  sektor TEXT NOT NULL CHECK (length(sektor) BETWEEN 2 AND 40),
  tingkat TEXT CHECK (tingkat IS NULL OR tingkat IN ('rb', 'rs', 'rr', 'hancur', 'unit')),
  unit REAL CHECK (unit IS NULL OR unit BETWEEN 0 AND 10000000),
  komponen TEXT CHECK (komponen IS NULL OR length(komponen) BETWEEN 2 AND 40),
  arus_rp INTEGER CHECK (arus_rp IS NULL OR arus_rp BETWEEN 0 AND 100000000000),
  bulan INTEGER CHECK (bulan IS NULL OR bulan BETWEEN 1 AND 120),
  unit_asal TEXT NOT NULL DEFAULT 'isian' CHECK (unit_asal IN ('isian', 'rekap_rumah_rusak')),
  harga_id TEXT,
  nilai_rp INTEGER CHECK (nilai_rp IS NULL OR nilai_rp BETWEEN 0 AND 100000000000000),
  asumsi TEXT CHECK (asumsi IS NULL OR length(asumsi) <= 300),
  klien_id TEXT CHECK (klien_id IS NULL OR length(klien_id) BETWEEN 8 AND 40),
  dibuat INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (jitupasna_id, klien_id),
  CHECK ((jenis = 'rusak' AND tingkat IS NOT NULL AND unit IS NOT NULL AND komponen IS NULL AND arus_rp IS NULL AND bulan IS NULL)
      OR (jenis = 'rugi' AND tingkat IS NULL AND unit IS NULL AND komponen IS NOT NULL AND arus_rp IS NOT NULL AND bulan IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS sk_jpb_jp ON sk_jitupasna_baris (jitupasna_id, sektor);
CREATE INDEX IF NOT EXISTS sk_jpb_dummy ON sk_jitupasna_baris (id) WHERE dummy = 1;

CREATE TABLE IF NOT EXISTS sk_r3p (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  jitupasna_id TEXT NOT NULL REFERENCES sk_jitupasna(id) CHECK (length(jitupasna_id) = 16 AND jitupasna_id NOT GLOB '*[^0-9a-f]*'),
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian(id) CHECK (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????' AND substr(kejadian_id, 9) NOT GLOB '*[^0-9A-HJKMNP-TV-Z]*'),
  status TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'diusulkan', 'disetujui_pm', 'ditetapkan_resmi', 'berjalan', 'selesai')),
  versi INTEGER NOT NULL DEFAULT 1 CHECK (versi BETWEEN 1 AND 99),
  induk_id TEXT CHECK (induk_id IS NULL OR (length(induk_id) = 16 AND induk_id NOT GLOB '*[^0-9a-f]*')),
  tanggap_mulai TEXT CHECK (tanggap_mulai IS NULL OR tanggap_mulai GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  disetujui_oleh TEXT CHECK (disetujui_oleh IS NULL OR length(disetujui_oleh) BETWEEN 1 AND 64),
  disetujui_pada INTEGER,
  no_keputusan TEXT CHECK (no_keputusan IS NULL OR length(no_keputusan) BETWEEN 1 AND 120),
  tgl_keputusan TEXT CHECK (tgl_keputusan IS NULL OR tgl_keputusan GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  penandatangan TEXT CHECK (penandatangan IS NULL OR length(penandatangan) BETWEEN 2 AND 120),
  total_rp INTEGER CHECK (total_rp IS NULL OR total_rp >= 0),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (jitupasna_id, versi, dummy),
  CHECK ((status IN ('disetujui_pm', 'ditetapkan_resmi', 'berjalan', 'selesai')) = (disetujui_oleh IS NOT NULL)),
  CHECK ((disetujui_oleh IS NULL) = (disetujui_pada IS NULL)),
  CHECK (status NOT IN ('ditetapkan_resmi', 'berjalan', 'selesai') OR (no_keputusan IS NOT NULL AND tgl_keputusan IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS sk_r3p_kej ON sk_r3p (kejadian_id, versi DESC);
CREATE INDEX IF NOT EXISTS sk_r3p_jp ON sk_r3p (jitupasna_id);
CREATE INDEX IF NOT EXISTS sk_r3p_dummy ON sk_r3p (id) WHERE dummy = 1;

CREATE TABLE IF NOT EXISTS sk_r3p_kegiatan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  r3p_id TEXT NOT NULL REFERENCES sk_r3p(id) CHECK (length(r3p_id) = 16 AND r3p_id NOT GLOB '*[^0-9a-f]*'),
  sektor TEXT NOT NULL CHECK (length(sektor) BETWEEN 2 AND 40),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 3 AND 200),
  target REAL CHECK (target IS NULL OR target >= 0),
  satuan TEXT CHECK (satuan IS NULL OR length(satuan) BETWEEN 1 AND 20),
  nilai_rp INTEGER CHECK (nilai_rp IS NULL OR nilai_rp >= 0),
  tautan_jenis TEXT CHECK (tautan_jenis IS NULL OR tautan_jenis IN ('pemulihan', 'meja_rehab')),
  tautan_id TEXT CHECK (tautan_id IS NULL OR length(tautan_id) BETWEEN 1 AND 40),
  status TEXT NOT NULL DEFAULT 'rencana' CHECK (status IN ('rencana', 'berjalan', 'selesai', 'macet')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK ((tautan_jenis IS NULL) = (tautan_id IS NULL))
);
CREATE INDEX IF NOT EXISTS sk_r3pk_r3p ON sk_r3p_kegiatan (r3p_id);
CREATE INDEX IF NOT EXISTS sk_r3pk_dummy ON sk_r3p_kegiatan (id) WHERE dummy = 1;

-- Jitupasna final dikunci: baris dan induknya tidak berubah (ubah = versi baru); hapus baris dummy tetap boleh (tombol dummy). Trigger terpisah per peristiwa karena satu trigger SQLite hanya satu peristiwa.
CREATE TRIGGER IF NOT EXISTS sk_jitupasna_final BEFORE UPDATE ON sk_jitupasna
WHEN OLD.status = 'final'
BEGIN
  SELECT RAISE(ABORT, 'sk_jitupasna_final: Jitupasna final dikunci; buat versi baru');
END;

CREATE TRIGGER IF NOT EXISTS sk_jpb_beku_tambah BEFORE INSERT ON sk_jitupasna_baris
WHEN (SELECT status FROM sk_jitupasna WHERE id = NEW.jitupasna_id) = 'final'
BEGIN
  SELECT RAISE(ABORT, 'sk_jitupasna_final: baris Jitupasna final dikunci');
END;

CREATE TRIGGER IF NOT EXISTS sk_jpb_beku_ubah BEFORE UPDATE ON sk_jitupasna_baris
WHEN (SELECT status FROM sk_jitupasna WHERE id = OLD.jitupasna_id) = 'final'
BEGIN
  SELECT RAISE(ABORT, 'sk_jitupasna_final: baris Jitupasna final dikunci');
END;

CREATE TRIGGER IF NOT EXISTS sk_jpb_beku_hapus BEFORE DELETE ON sk_jitupasna_baris
WHEN OLD.dummy = 0 AND (SELECT status FROM sk_jitupasna WHERE id = OLD.jitupasna_id) = 'final'
BEGIN
  SELECT RAISE(ABORT, 'sk_jitupasna_final: baris Jitupasna final dikunci');
END;

-- R3P hanya dari Jitupasna final (ALUR 2.4); kejadian R3P sama dengan kejadian Jitupasna.
CREATE TRIGGER IF NOT EXISTS sk_r3p_baru BEFORE INSERT ON sk_r3p
WHEN coalesce((SELECT status FROM sk_jitupasna WHERE id = NEW.jitupasna_id), '') != 'final' OR NEW.status != 'draf'
BEGIN
  SELECT RAISE(ABORT, 'sk_r3p_status: R3P baru berstatus draf dan hanya dari Jitupasna final');
END;

-- Status R3P hanya maju satu langkah (ALUR 2.4); revisi = versi baru.
CREATE TRIGGER IF NOT EXISTS sk_r3p_status BEFORE UPDATE OF status ON sk_r3p
WHEN NEW.status != OLD.status AND NOT (
  (OLD.status = 'draf' AND NEW.status = 'diusulkan')
  OR (OLD.status = 'diusulkan' AND NEW.status = 'disetujui_pm')
  OR (OLD.status = 'disetujui_pm' AND NEW.status = 'ditetapkan_resmi')
  OR (OLD.status = 'ditetapkan_resmi' AND NEW.status = 'berjalan')
  OR (OLD.status = 'berjalan' AND NEW.status = 'selesai'))
BEGIN
  SELECT RAISE(ABORT, 'sk_r3p_status: pasangan status tidak sah');
END;

-- Tanda setuju internal (U7): pemberi berupa staf nyata (staf:<id>), bukan pembuat draf, tidak diganti sesudah terisi.
CREATE TRIGGER IF NOT EXISTS sk_r3p_setuju BEFORE UPDATE OF disetujui_oleh, disetujui_pada ON sk_r3p
WHEN (NEW.disetujui_oleh IS NOT OLD.disetujui_oleh OR NEW.disetujui_pada IS NOT OLD.disetujui_pada)
  AND (OLD.disetujui_oleh IS NOT NULL OR NEW.disetujui_oleh IS NULL OR NEW.disetujui_oleh NOT GLOB 'staf:*' OR NEW.disetujui_oleh = OLD.oleh OR OLD.status != 'diusulkan')
BEGIN
  SELECT RAISE(ABORT, 'sk_r3p_setuju: tanda setuju hanya dari staf pimpinan lain, sekali, pada draf diusulkan');
END;

-- Nilai R3P yang sudah ditetapkan tidak berubah (KEAMANAN 4.4).
CREATE TRIGGER IF NOT EXISTS sk_r3p_beku BEFORE UPDATE OF total_rp ON sk_r3p
WHEN OLD.status IN ('ditetapkan_resmi', 'berjalan', 'selesai') AND NEW.total_rp IS NOT OLD.total_rp
BEGIN
  SELECT RAISE(ABORT, 'sk_r3p_beku: nilai R3P yang ditetapkan tidak berubah');
END;

CREATE TRIGGER IF NOT EXISTS sk_r3pk_beku BEFORE UPDATE OF nilai_rp ON sk_r3p_kegiatan
WHEN (SELECT status FROM sk_r3p WHERE id = OLD.r3p_id) IN ('ditetapkan_resmi', 'berjalan', 'selesai') AND NEW.nilai_rp IS NOT OLD.nilai_rp
BEGIN
  SELECT RAISE(ABORT, 'sk_r3p_beku: nilai kegiatan R3P yang ditetapkan tidak berubah');
END;
