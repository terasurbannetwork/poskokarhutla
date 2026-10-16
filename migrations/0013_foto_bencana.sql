-- Foto per bencana (plug-and-play, MODUL-PLUG-AND-PLAY §3 foto): kolom `bencana` + kategori per bencana dari tabel rujukan.
-- CHECK kategori di 0007 beku (SQLite tidak bisa ALTER CHECK) dan membangun ulang `foto` mengosongkan anaknya lewat ON DELETE CASCADE,
-- jadi kategori khas bencana lain disimpan di `kategori_b` (kolom `kategori` untuk bencana lain berisi kode lama yang kebetulan sama, atau 'lainnya').
-- Kode kategori sah = coalesce(nullif(kategori_b, ''), kategori); trigger foto_kategori_sah menolak pasangan (bencana, kode) di luar foto_kategori.
-- Bencana baru: migrasi 00NN_<id>_rujukan.sql berisi INSERT OR IGNORE ke foto_kategori saja. Seed di bawah = foto_kategori tiap entri
-- public/bencana.json (dijaga tests/warga/foto_bencana.test.mjs). ADD COLUMN tidak punya IF NOT EXISTS: dijalankan sekali oleh wrangler
-- (tabel d1_migrations), seperti 0008. Baris foto lama otomatis bencana = 'karhutla'.
ALTER TABLE foto ADD COLUMN bencana TEXT NOT NULL DEFAULT 'karhutla' CHECK (length(bencana) BETWEEN 1 AND 20 AND bencana NOT GLOB '*[^a-z0-9_]*');
ALTER TABLE foto ADD COLUMN kategori_b TEXT NOT NULL DEFAULT '' CHECK (length(kategori_b) <= 30 AND kategori_b NOT GLOB '*[^a-z0-9_]*');
CREATE INDEX IF NOT EXISTS foto_bencana ON foto (bencana, status, dibuat);

CREATE TABLE IF NOT EXISTS foto_kategori (
  bencana TEXT NOT NULL CHECK (length(bencana) BETWEEN 1 AND 20),
  kode TEXT NOT NULL CHECK (length(kode) BETWEEN 1 AND 30),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 1 AND 40),
  PRIMARY KEY (bencana, kode)
) WITHOUT ROWID;

INSERT OR IGNORE INTO foto_kategori (bencana, kode, nama) VALUES
  ('karhutla', 'api', 'Api'),
  ('karhutla', 'asap', 'Asap'),
  ('karhutla', 'padam', 'Pemadaman'),
  ('karhutla', 'dampak', 'Dampak'),
  ('karhutla', 'lainnya', 'Lainnya');
INSERT OR IGNORE INTO foto_kategori (bencana, kode, nama) VALUES
  ('banjir', 'genangan', 'Genangan'),
  ('banjir', 'arus', 'Arus'),
  ('banjir', 'longsor', 'Longsor'),
  ('banjir', 'rob', 'Rob'),
  ('banjir', 'evakuasi', 'Evakuasi'),
  ('banjir', 'lainnya', 'Lainnya');
INSERT OR IGNORE INTO foto_kategori (bencana, kode, nama) VALUES
  ('gempa', 'guncangan', 'Kerusakan bangunan'),
  ('gempa', 'retakan', 'Retakan tanah'),
  ('gempa', 'pengungsian', 'Pengungsian'),
  ('gempa', 'tsunami', 'Genangan tsunami'),
  ('gempa', 'lainnya', 'Lainnya');
INSERT OR IGNORE INTO foto_kategori (bencana, kode, nama) VALUES
  ('cuaca', 'pohon', 'Pohon tumbang'),
  ('cuaca', 'genangan', 'Genangan'),
  ('cuaca', 'atap', 'Atap rusak'),
  ('cuaca', 'lainnya', 'Lainnya');
INSERT OR IGNORE INTO foto_kategori (bencana, kode, nama) VALUES
  ('udara', 'asap', 'Asap atau kabut'),
  ('udara', 'jarak_pandang', 'Jarak pandang'),
  ('udara', 'lainnya', 'Lainnya');
INSERT OR IGNORE INTO foto_kategori (bencana, kode, nama) VALUES
  ('gunungapi', 'hujan_abu', 'Hujan abu'),
  ('gunungapi', 'lahar', 'Lahar'),
  ('gunungapi', 'pengungsian', 'Pengungsian'),
  ('gunungapi', 'lainnya', 'Lainnya');
INSERT OR IGNORE INTO foto_kategori (bencana, kode, nama) VALUES
  ('kekeringan', 'sumur', 'Sumur kering'),
  ('kekeringan', 'sawah', 'Sawah puso'),
  ('kekeringan', 'antre', 'Antre air'),
  ('kekeringan', 'lainnya', 'Lainnya');

CREATE TRIGGER IF NOT EXISTS foto_kategori_sah BEFORE INSERT ON foto
WHEN NOT EXISTS (SELECT 1 FROM foto_kategori WHERE bencana = NEW.bencana AND kode = coalesce(nullif(NEW.kategori_b, ''), NEW.kategori))
BEGIN SELECT RAISE(ABORT, 'kategori foto tidak dikenal untuk bencana ini'); END;
