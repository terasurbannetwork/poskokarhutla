-- Pembiayaan risiko (PR-01; data/kajian-bnpb/pembiayaan-risiko/DESAIN-TEKNIS.md). Idempoten. Data uang TIDAK PERNAH masuk public/. Tanpa kolom dummy.
-- pb_saldo: saldo DSP/PFB per lapis, append-only (nilai baru = baris baru); kejadian_id NULL = saldo umum. Nilai selalu rupiah bulat berjalan (Q8), tidak pernah 0 sebagai pengganti belum diisi.
-- pb_skema: catatan skema parametrik/indemnitas dari staf; pembaruan = baris baru, append-only. Sistem tidak pernah membuat skema sendiri (Q4).
-- pb_model: pra-registrasi model kerugian; rumus dan hash beku, status hanya berubah sekali dari hipotesis ke lulus atau gagal.
CREATE TABLE IF NOT EXISTS pb_saldo (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kejadian_id TEXT REFERENCES sk_kejadian(id) CHECK (kejadian_id IS NULL OR (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????')),
  lapis TEXT NOT NULL CHECK (lapis IN ('dsp', 'pfb')),
  nilai INTEGER NOT NULL CHECK (typeof(nilai) = 'integer' AND nilai >= 0),
  tanggal_data TEXT NOT NULL CHECK (tanggal_data GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]' AND date(tanggal_data) IS tanggal_data),
  sumber TEXT NOT NULL CHECK (length(sumber) BETWEEN 3 AND 200),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  dibuat INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS pb_saldo_lapis ON pb_saldo (lapis, tanggal_data DESC);
CREATE INDEX IF NOT EXISTS pb_saldo_kej ON pb_saldo (kejadian_id, lapis, tanggal_data DESC) WHERE kejadian_id IS NOT NULL;
CREATE TRIGGER IF NOT EXISTS pb_saldo_tetap_ubah BEFORE UPDATE ON pb_saldo BEGIN SELECT RAISE(ABORT, 'riwayat saldo tidak boleh diubah'); END;
CREATE TRIGGER IF NOT EXISTS pb_saldo_tetap_hapus BEFORE DELETE ON pb_saldo BEGIN SELECT RAISE(ABORT, 'riwayat saldo tidak boleh dihapus'); END;
CREATE TABLE IF NOT EXISTS pb_skema (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 120),
  penerbit TEXT NOT NULL CHECK (length(penerbit) BETWEEN 2 AND 120),
  jenis TEXT NOT NULL CHECK (jenis IN ('parametrik', 'indemnitas')),
  indeks TEXT NOT NULL CHECK (length(indeks) BETWEEN 2 AND 120),
  ambang TEXT NOT NULL CHECK (length(ambang) BETWEEN 1 AND 120),
  wilayah TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(wilayah) AND json_type(wilayah) = 'array' AND length(wilayah) <= 2000),
  bayaran TEXT CHECK (bayaran IS NULL OR length(bayaran) <= 200),
  berlaku_dari TEXT NOT NULL CHECK (berlaku_dari GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]' AND date(berlaku_dari) IS berlaku_dari),
  berlaku_sampai TEXT NOT NULL CHECK (berlaku_sampai GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]' AND date(berlaku_sampai) IS berlaku_sampai AND berlaku_sampai >= berlaku_dari),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  dibuat INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS pb_skema_nama ON pb_skema (nama, dibuat DESC);
CREATE TRIGGER IF NOT EXISTS pb_skema_tetap_ubah BEFORE UPDATE ON pb_skema BEGIN SELECT RAISE(ABORT, 'riwayat skema tidak boleh diubah'); END;
CREATE TRIGGER IF NOT EXISTS pb_skema_tetap_hapus BEFORE DELETE ON pb_skema BEGIN SELECT RAISE(ABORT, 'riwayat skema tidak boleh dihapus'); END;
CREATE TABLE IF NOT EXISTS pb_model (
  id TEXT PRIMARY KEY CHECK (length(id) BETWEEN 2 AND 40),
  rumus TEXT NOT NULL CHECK (length(rumus) BETWEEN 5 AND 4000),
  hash TEXT NOT NULL CHECK (length(hash) = 64 AND hash NOT GLOB '*[^0-9a-f]*'),
  didaftar INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'hipotesis' CHECK (status IN ('hipotesis', 'lulus', 'gagal'))
);
CREATE TRIGGER IF NOT EXISTS pb_model_beku_ubah BEFORE UPDATE ON pb_model WHEN NEW.id <> OLD.id OR NEW.rumus <> OLD.rumus OR NEW.hash <> OLD.hash OR NEW.didaftar <> OLD.didaftar OR OLD.status <> 'hipotesis' BEGIN SELECT RAISE(ABORT, 'pra-registrasi model tidak boleh diubah'); END;
CREATE TRIGGER IF NOT EXISTS pb_model_tetap_hapus BEFORE DELETE ON pb_model BEGIN SELECT RAISE(ABORT, 'pra-registrasi model tidak boleh dihapus'); END;
-- Anti-akal: INSERT OR REPLACE menghapus baris bentrok tanpa memicu BEFORE DELETE; INSERT yang membawa id yang sudah ada ditolak lebih dulu.
CREATE TRIGGER IF NOT EXISTS pb_saldo_tetap_sisip BEFORE INSERT ON pb_saldo WHEN NEW.id IS NOT NULL AND EXISTS (SELECT 1 FROM pb_saldo WHERE id = NEW.id) BEGIN SELECT RAISE(ABORT, 'riwayat saldo tidak boleh ditimpa'); END;
CREATE TRIGGER IF NOT EXISTS pb_skema_tetap_sisip BEFORE INSERT ON pb_skema WHEN NEW.id IS NOT NULL AND EXISTS (SELECT 1 FROM pb_skema WHERE id = NEW.id) BEGIN SELECT RAISE(ABORT, 'riwayat skema tidak boleh ditimpa'); END;
CREATE TRIGGER IF NOT EXISTS pb_model_tetap_sisip BEFORE INSERT ON pb_model WHEN NEW.status <> 'hipotesis' OR EXISTS (SELECT 1 FROM pb_model WHERE id = NEW.id) BEGIN SELECT RAISE(ABORT, 'pra-registrasi model tidak boleh ditimpa dan selalu mulai sebagai hipotesis'); END;
