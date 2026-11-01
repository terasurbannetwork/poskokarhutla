-- Seed foto_kategori bencana pesisir (= public/bencana.json; dijaga tests/warga/foto_bencana.test.mjs). Pola 00NN_<id>_rujukan.sql dari 0013.
-- Trigger foto_kategori_sah menolak unggah foto pesisir tanpa baris ini. INSERT OR IGNORE: aman diulang.
INSERT OR IGNORE INTO foto_kategori (bencana, kode, nama) VALUES
  ('pesisir', 'abrasi', 'Abrasi pantai'),
  ('pesisir', 'rob', 'Rob'),
  ('pesisir', 'gelombang', 'Gelombang tinggi'),
  ('pesisir', 'lainnya', 'Lainnya');
