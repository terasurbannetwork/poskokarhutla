-- Laporan Karhutla otomatis (src/laporan_karhutla.js, docs/laporan-karhutla/SOP.md). Waktu = ms epoch UTC; tanggal = YYYY-MM-DD WIB. Idempoten (IF NOT EXISTS).
-- Daftar tetap (status, bentuk sumber) HARUS sama dengan public/laporan_karhutla_spek.js; tests/warga/laporan_karhutla.test.mjs menjaganya.
-- Keputusan desain: isi kiriman = JSON tervalidasi spek (lk_kiriman). Fire spot (FS) ADA DI DUA TEMPAT dengan tugas berbeda: JSON kiriman = bentuk isian,
-- lk_fs = indeks relasional FS yang TERKIRIM (ditulis dalam batch yang sama dengan kirim), supaya rekonsiliasi antarhari (sisa kemarin) dan tautan tugas_id bisa di-query.
-- Dummy (dummy = 1) boleh dihapus; baris nyata tidak: lk_versi dan lk_snapshot hanya menambah.

-- Satu baris per hari laporan. status terbuka -> dikunci | dikunci_pengecualian (tidak bisa kembali). Snapshot beku ada di lk_snapshot (ralat terbaru = kolom ralat + hash).
CREATE TABLE IF NOT EXISTS lk_hari (
  tanggal_laporan TEXT PRIMARY KEY CHECK (length(tanggal_laporan) = 10 AND tanggal_laporan GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  status TEXT NOT NULL DEFAULT 'terbuka' CHECK (status IN ('terbuka', 'dikunci', 'dikunci_pengecualian')),
  prioritas TEXT NOT NULL CHECK (json_valid(prioritas) AND json_type(prioritas) = 'array' AND json_array_length(prioritas) BETWEEN 1 AND 38),
  pengecualian TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(pengecualian) AND json_type(pengecualian) = 'array'),
  ralat INTEGER NOT NULL DEFAULT 0 CHECK (ralat >= 0),
  hash TEXT CHECK (hash IS NULL OR (length(hash) = 64 AND hash NOT GLOB '*[^0-9a-f]*')),
  dikunci_oleh TEXT,
  dikunci_pada INTEGER,
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (status = 'terbuka' OR (hash IS NOT NULL AND dikunci_oleh IS NOT NULL AND dikunci_pada IS NOT NULL))
);

-- Sesudah dikunci: status tidak kembali terbuka, prioritas dan pengecualian beku (perubahan angka lewat ralat di lk_snapshot).
CREATE TRIGGER IF NOT EXISTS lk_hari_tetap_dikunci BEFORE UPDATE OF status, prioritas, pengecualian ON lk_hari
WHEN OLD.status != 'terbuka' AND (NEW.status = 'terbuka' OR NEW.prioritas != OLD.prioritas OR NEW.pengecualian != OLD.pengecualian)
BEGIN
  SELECT RAISE(ABORT, 'laporan yang sudah dikunci tidak bisa dibuka atau diubah; pakai ralat');
END;

-- Satu kiriman per (hari, sumber). sumber = prov:<kode BPS> | udara | omc | koordalops. versi naik 1 tiap simpan (penguncian optimistis).
CREATE TABLE IF NOT EXISTS lk_kiriman (
  tanggal_laporan TEXT NOT NULL CHECK (length(tanggal_laporan) = 10),
  sumber TEXT NOT NULL CHECK (sumber IN ('udara', 'omc', 'koordalops') OR (length(sumber) = 7 AND sumber GLOB 'prov:[0-9][0-9]')),
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
  PRIMARY KEY (tanggal_laporan, sumber),
  CHECK (status != 'disetujui' OR (verif_oleh IS NOT NULL AND verif_pada IS NOT NULL))
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS lk_kiriman_sumber ON lk_kiriman (sumber, tanggal_laporan);

-- Riwayat tiap simpan, kirim, kembalikan, setujui, ralat: append-only. klien_id unik per (hari, sumber): kirim ulang yang sama tidak menggandakan.
CREATE TABLE IF NOT EXISTS lk_versi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
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
-- Satu baris per versi, kecuali setujui/kembalikan yang memakai versi kiriman yang sama dengan kirimnya (aksi ikut kunci).
CREATE UNIQUE INDEX IF NOT EXISTS lk_versi_unik ON lk_versi (tanggal_laporan, sumber, versi, aksi);
CREATE UNIQUE INDEX IF NOT EXISTS lk_versi_klien ON lk_versi (tanggal_laporan, sumber, klien_id) WHERE klien_id IS NOT NULL;
CREATE TRIGGER IF NOT EXISTS lk_versi_tetap_ubah BEFORE UPDATE ON lk_versi WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'riwayat versi laporan karhutla hanya bisa ditambah');
END;
CREATE TRIGGER IF NOT EXISTS lk_versi_tetap_hapus BEFORE DELETE ON lk_versi WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'riwayat versi laporan karhutla hanya bisa ditambah');
END;

-- Snapshot beku per (hari, nomor ralat; 0 = kunci pertama). isi = JSON semua angka slide, lampiran, dan teks WA; hash = sha256(isi).
CREATE TABLE IF NOT EXISTS lk_snapshot (
  tanggal_laporan TEXT NOT NULL CHECK (length(tanggal_laporan) = 10),
  ralat INTEGER NOT NULL CHECK (ralat >= 0),
  hash TEXT NOT NULL CHECK (length(hash) = 64 AND hash NOT GLOB '*[^0-9a-f]*'),
  isi TEXT NOT NULL CHECK (json_valid(isi)),
  alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 500),
  perubahan TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(perubahan)),
  oleh TEXT NOT NULL,
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  PRIMARY KEY (tanggal_laporan, ralat),
  CHECK (ralat = 0 OR alasan IS NOT NULL)
) WITHOUT ROWID;
CREATE TRIGGER IF NOT EXISTS lk_snapshot_tetap_ubah BEFORE UPDATE ON lk_snapshot WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'snapshot laporan karhutla beku: koreksi lewat ralat baru');
END;
CREATE TRIGGER IF NOT EXISTS lk_snapshot_tetap_hapus BEFORE DELETE ON lk_snapshot WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'snapshot laporan karhutla beku: koreksi lewat ralat baru');
END;

-- Fire spot terkirim. fs_id tetap lintas hari (FS-<prov>-<YYYYMMDD pertama terlihat>-<NNN>); tugas_id menaut ke tugas api (tanpa FK: tugas dihapus retensi 180 hari, FS tetap arsip).
-- Tidak ada CHECK padam <= target: itu pelanggaran MERAH yang harus bisa tersimpan sebagai kiriman bercek, bukan galat 500.
CREATE TABLE IF NOT EXISTS lk_fs (
  fs_id TEXT NOT NULL CHECK (length(fs_id) BETWEEN 15 AND 24 AND fs_id GLOB 'FS-[0-9][0-9]-[0-9]*'),
  tanggal_laporan TEXT NOT NULL CHECK (length(tanggal_laporan) = 10),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  tugas_id TEXT CHECK (tugas_id IS NULL OR length(tugas_id) = 16),
  kab TEXT CHECK (kab IS NULL OR length(kab) <= 60),
  kec TEXT CHECK (kec IS NULL OR length(kec) <= 60),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  kawasan TEXT CHECK (kawasan IS NULL OR length(kawasan) <= 60),
  target_ha REAL NOT NULL CHECK (target_ha >= 0),
  padam_ha REAL NOT NULL CHECK (padam_ha >= 0),
  sisa_ha REAL NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('menyala', 'bara', 'padam')),
  kumulatif INTEGER NOT NULL DEFAULT 0 CHECK (kumulatif IN (0, 1)),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  PRIMARY KEY (fs_id, tanggal_laporan),
  CHECK (substr(fs_id, 4, 2) = prov)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS lk_fs_prov ON lk_fs (prov, tanggal_laporan);
CREATE UNIQUE INDEX IF NOT EXISTS lk_fs_tugas ON lk_fs (tanggal_laporan, tugas_id) WHERE tugas_id IS NOT NULL;
