-- 0122: Siklus Bencana gelombang G2 (F3 Kaji Cepat Otomatis). Rancangan: data/kajian-bnpb/siklus/DESAIN-TEKNIS.md bagian 3.2; keputusan KEPUTUSAN-AWAL.md (KA 9).
-- Hanya CREATE ... IF NOT EXISTS. Kolom dummy ada. yakin terkunci 'estimasi-model' di CHECK: melepasnya butuh migrasi baru dan keputusan pemilik.
-- ringkas: objek JSON dengan rentang SELALU larik dua [bawah, atas]; hanya status menunggu_data boleh tanpa rentang. coalesce menjaga NULL tidak lolos CHECK.
-- Komentar `--` sengaja di baris sendiri (pecah() di tests/warga/_bantu.mjs memotong di baris berakhir ';').
CREATE TABLE IF NOT EXISTS sk_kaji (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian(id) CHECK (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????' AND substr(kejadian_id, 9) NOT GLOB '*[^0-9A-HJKMNP-TV-Z]*'),
  model TEXT NOT NULL CHECK (model IN ('gempa', 'banjir_jam1')),
  versi INTEGER NOT NULL CHECK (versi BETWEEN 1 AND 99),
  status TEXT NOT NULL CHECK (status IN ('menunggu_data', 'dihitung', 'diperiksa', 'dipakai', 'ditarik')),
  masukan TEXT NOT NULL CHECK (json_valid(masukan) AND json_type(masukan) = 'object' AND length(masukan) <= 800),
  ringkas TEXT NOT NULL CHECK (json_valid(ringkas) AND json_type(ringkas) = 'object' AND length(ringkas) <= 1500 AND (status = 'menunggu_data' OR coalesce(json_array_length(ringkas, '$.rentang'), 0) = 2)),
  hasil_r2 TEXT CHECK (hasil_r2 IS NULL OR hasil_r2 GLOB 'siklus/saji/kaji/KJ-*'),
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
CREATE INDEX IF NOT EXISTS sk_kaji_kej ON sk_kaji (kejadian_id, versi DESC);
CREATE INDEX IF NOT EXISTS sk_kaji_status ON sk_kaji (status, diubah DESC) WHERE status IN ('menunggu_data', 'dihitung', 'diperiksa');
CREATE INDEX IF NOT EXISTS sk_kaji_dummy ON sk_kaji (id) WHERE dummy = 1;
