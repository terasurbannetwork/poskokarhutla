-- 0174: GS-08 (data/kajian-bnpb/genangan-satelit/DESAIN-TEKNIS.md bagian 4). sk_kaji dibangun ulang (CHECK SQLite tidak bisa di-ALTER):
-- model ditambah 'banjir_gfm'; hasil_r2 untuk banjir_gfm wajib tepat siklus/saji/kaji/<kejadian_id>_banjir_gfm_v<versi>.json (cocok dengan kolom baris itu); gempa dan banjir_jam1 tetap pola lama.
-- Isi, indeks, dan semua CHECK lain dipasang ulang apa adanya. Idempoten: dijalankan ulang hanya menyalin tabel ke dirinya sendiri.
-- Komentar `--` sengaja di baris sendiri (pecah() di tests/warga/_bantu.mjs memotong di baris berakhir ';').
DROP TABLE IF EXISTS sk_kaji_baru;
CREATE TABLE sk_kaji_baru (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian(id) CHECK (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????' AND substr(kejadian_id, 9) NOT GLOB '*[^0-9A-HJKMNP-TV-Z]*'),
  model TEXT NOT NULL CHECK (model IN ('gempa', 'banjir_jam1', 'banjir_gfm')),
  versi INTEGER NOT NULL CHECK (versi BETWEEN 1 AND 99),
  status TEXT NOT NULL CHECK (status IN ('menunggu_data', 'dihitung', 'diperiksa', 'dipakai', 'ditarik')),
  masukan TEXT NOT NULL CHECK (json_valid(masukan) AND json_type(masukan) = 'object' AND length(masukan) <= 800),
  ringkas TEXT NOT NULL CHECK (json_valid(ringkas) AND json_type(ringkas) = 'object' AND length(ringkas) <= 1500 AND (status = 'menunggu_data' OR coalesce(json_array_length(ringkas, '$.rentang'), 0) = 2)),
  hasil_r2 TEXT CHECK (hasil_r2 IS NULL OR (model = 'banjir_gfm' AND hasil_r2 = 'siklus/saji/kaji/' || kejadian_id || '_banjir_gfm_v' || versi || '.json') OR (model <> 'banjir_gfm' AND hasil_r2 GLOB 'siklus/saji/kaji/KJ-*')),
  galat_kalibrasi TEXT CHECK (galat_kalibrasi IS NULL OR (json_valid(galat_kalibrasi) AND length(galat_kalibrasi) <= 400)),
  yakin TEXT NOT NULL DEFAULT 'estimasi-model' CHECK (yakin = 'estimasi-model'),
  alasan_tarik TEXT CHECK (alasan_tarik IS NULL OR length(alasan_tarik) BETWEEN 3 AND 300),
  dihitung INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (kejadian_id, model, versi, dummy),
  CHECK ((status = 'ditarik') = (alasan_tarik IS NOT NULL))
);
INSERT OR IGNORE INTO sk_kaji_baru (id, kejadian_id, model, versi, status, masukan, ringkas, hasil_r2, galat_kalibrasi, yakin, alasan_tarik, dihitung, diubah, oleh, dummy)
  SELECT id, kejadian_id, model, versi, status, masukan, ringkas, hasil_r2, galat_kalibrasi, yakin, alasan_tarik, dihitung, diubah, oleh, dummy FROM sk_kaji;
DROP TABLE sk_kaji;
ALTER TABLE sk_kaji_baru RENAME TO sk_kaji;
CREATE INDEX IF NOT EXISTS sk_kaji_kej ON sk_kaji (kejadian_id, versi DESC);
CREATE INDEX IF NOT EXISTS sk_kaji_status ON sk_kaji (status, diubah DESC) WHERE status IN ('menunggu_data', 'dihitung', 'diperiksa');
CREATE INDEX IF NOT EXISTS sk_kaji_dummy ON sk_kaji (id) WHERE dummy = 1;
