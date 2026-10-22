-- Laporan harian multi-bahaya (src/laporan_bencana.js, public/laporan_bencana_spek.js): sumbu bencana untuk laporan harian selain karhutla.
-- Tabel lk_* (0032) TIDAK diubah: karhutla tetap di sana. Tabel di sini kembarannya dengan kolom bencana di kunci utama (ALTER ADD COLUMN tidak idempoten di SQLite dan tidak bisa mengubah PK).
-- Tanpa tabel ini Worker tetap jalan: rute ?bencana=<bahaya> menjawab 503 sopan, karhutla tidak terpengaruh. Waktu = ms epoch UTC; tanggal = YYYY-MM-DD WIB. Idempoten (IF NOT EXISTS).
-- Daftar bencana HARUS sama dengan DAFTAR_BENCANA (tanpa karhutla) di public/laporan_karhutla_spek.js; tests/warga/laporan_bencana.test.mjs menjaganya.
-- Sumber kiriman hanya prov:<kode BPS>: satu bentuk isian provinsi untuk semua bahaya. Angka otomatis (laporan.json v1) tidak disimpan di sini, hanya dibekukan di snapshot saat kunci.
-- Dummy (dummy = 1) boleh dihapus; baris nyata tidak: lkb_versi dan lkb_snapshot hanya menambah.

CREATE TABLE IF NOT EXISTS lkb_hari (
  bencana TEXT NOT NULL CHECK (bencana IN ('banjir', 'gempa', 'gunungapi', 'cuaca', 'kekeringan', 'udara')),
  tanggal_laporan TEXT NOT NULL CHECK (length(tanggal_laporan) = 10 AND tanggal_laporan GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  status TEXT NOT NULL DEFAULT 'terbuka' CHECK (status IN ('terbuka', 'dikunci', 'dikunci_pengecualian')),
  prioritas TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(prioritas) AND json_type(prioritas) = 'array' AND json_array_length(prioritas) <= 38),
  pengecualian TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(pengecualian) AND json_type(pengecualian) = 'array'),
  ralat INTEGER NOT NULL DEFAULT 0 CHECK (ralat >= 0),
  hash TEXT CHECK (hash IS NULL OR (length(hash) = 64 AND hash NOT GLOB '*[^0-9a-f]*')),
  dikunci_oleh TEXT,
  dikunci_pada INTEGER,
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  PRIMARY KEY (bencana, tanggal_laporan),
  CHECK (status = 'terbuka' OR (hash IS NOT NULL AND dikunci_oleh IS NOT NULL AND dikunci_pada IS NOT NULL))
) WITHOUT ROWID;

CREATE TRIGGER IF NOT EXISTS lkb_hari_tetap_dikunci BEFORE UPDATE OF status, prioritas, pengecualian ON lkb_hari
WHEN OLD.status != 'terbuka' AND (NEW.status = 'terbuka' OR NEW.prioritas != OLD.prioritas OR NEW.pengecualian != OLD.pengecualian)
BEGIN
  SELECT RAISE(ABORT, 'laporan yang sudah dikunci tidak bisa dibuka atau diubah; pakai ralat');
END;

-- Satu kiriman per (bencana, hari, provinsi). versi naik 1 tiap simpan (penguncian optimistis).
CREATE TABLE IF NOT EXISTS lkb_kiriman (
  bencana TEXT NOT NULL CHECK (bencana IN ('banjir', 'gempa', 'gunungapi', 'cuaca', 'kekeringan', 'udara')),
  tanggal_laporan TEXT NOT NULL CHECK (length(tanggal_laporan) = 10),
  sumber TEXT NOT NULL CHECK (length(sumber) = 7 AND sumber GLOB 'prov:[0-9][0-9]'),
  status TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'terkirim', 'dikembalikan', 'disetujui')),
  versi INTEGER NOT NULL CHECK (versi >= 1),
  isi TEXT NOT NULL CHECK (json_valid(isi) AND length(isi) <= 262144),
  cek TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(cek)),
  pengirim TEXT NOT NULL,
  diubah INTEGER NOT NULL,
  dikirim INTEGER,
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  verif_oleh TEXT,
  verif_pada INTEGER,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  PRIMARY KEY (bencana, tanggal_laporan, sumber),
  CHECK (status != 'disetujui' OR (verif_oleh IS NOT NULL AND verif_pada IS NOT NULL))
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS lkb_kiriman_sumber ON lkb_kiriman (bencana, sumber, tanggal_laporan);

-- Riwayat tiap simpan, kirim, kembalikan, setujui, ralat: append-only. klien_id unik per (bencana, hari, sumber): kirim ulang yang sama tidak menggandakan.
CREATE TABLE IF NOT EXISTS lkb_versi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bencana TEXT NOT NULL CHECK (bencana IN ('banjir', 'gempa', 'gunungapi', 'cuaca', 'kekeringan', 'udara')),
  tanggal_laporan TEXT NOT NULL,
  sumber TEXT NOT NULL,
  versi INTEGER NOT NULL CHECK (versi >= 1),
  aksi TEXT NOT NULL CHECK (aksi IN ('draf_otomatis', 'draf', 'kirim', 'kembalikan', 'setujui', 'ralat')),
  status TEXT NOT NULL CHECK (status IN ('draf', 'terkirim', 'dikembalikan', 'disetujui')),
  isi TEXT NOT NULL CHECK (json_valid(isi)),
  cek TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(cek)),
  oleh TEXT NOT NULL,
  waktu INTEGER NOT NULL,
  klien_id TEXT CHECK (klien_id IS NULL OR length(klien_id) BETWEEN 8 AND 40),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE UNIQUE INDEX IF NOT EXISTS lkb_versi_unik ON lkb_versi (bencana, tanggal_laporan, sumber, versi, aksi);
CREATE UNIQUE INDEX IF NOT EXISTS lkb_versi_klien ON lkb_versi (bencana, tanggal_laporan, sumber, klien_id) WHERE klien_id IS NOT NULL;
CREATE TRIGGER IF NOT EXISTS lkb_versi_tetap_ubah BEFORE UPDATE ON lkb_versi WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'riwayat versi laporan bencana hanya bisa ditambah');
END;
CREATE TRIGGER IF NOT EXISTS lkb_versi_tetap_hapus BEFORE DELETE ON lkb_versi WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'riwayat versi laporan bencana hanya bisa ditambah');
END;

-- Snapshot beku per (bencana, hari, nomor ralat; 0 = kunci pertama). isi = JSON semua angka slide dan teks WA; hash = sha256(isi).
CREATE TABLE IF NOT EXISTS lkb_snapshot (
  bencana TEXT NOT NULL CHECK (bencana IN ('banjir', 'gempa', 'gunungapi', 'cuaca', 'kekeringan', 'udara')),
  tanggal_laporan TEXT NOT NULL CHECK (length(tanggal_laporan) = 10),
  ralat INTEGER NOT NULL CHECK (ralat >= 0),
  hash TEXT NOT NULL CHECK (length(hash) = 64 AND hash NOT GLOB '*[^0-9a-f]*'),
  isi TEXT NOT NULL CHECK (json_valid(isi)),
  alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 500),
  perubahan TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(perubahan)),
  oleh TEXT NOT NULL,
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  PRIMARY KEY (bencana, tanggal_laporan, ralat),
  CHECK (ralat = 0 OR alasan IS NOT NULL)
) WITHOUT ROWID;
CREATE TRIGGER IF NOT EXISTS lkb_snapshot_tetap_ubah BEFORE UPDATE ON lkb_snapshot WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'snapshot laporan bencana beku: koreksi lewat ralat baru');
END;
CREATE TRIGGER IF NOT EXISTS lkb_snapshot_tetap_hapus BEFORE DELETE ON lkb_snapshot WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'snapshot laporan bencana beku: koreksi lewat ralat baru');
END;
