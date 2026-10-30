-- Riwayat dengan BNPB (/akademisi, staf saja): siapa (pakar/tokoh/lembaga di direktori) pernah diundang, dikontrak, atau dikirim ke lapangan. Semua staf boleh menambah; ubah/hapus hanya penulis atau admin (ditegakkan src/akademisi.js). Idempoten.
CREATE TABLE IF NOT EXISTS akademisi_riwayat (
  id             INTEGER PRIMARY KEY,
  jenis_target   TEXT    NOT NULL CHECK (jenis_target IN ('pakar','tokoh','lembaga')),
  target_id      TEXT    NOT NULL CHECK (length(target_id) BETWEEN 1 AND 80),
  jenis          TEXT    NOT NULL CHECK (jenis IN ('undangan','narasumber','kontrak','penugasan','lapangan','lainnya')),
  tanggal        TEXT    NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  tanggal_selesai TEXT   CHECK (tanggal_selesai IS NULL OR tanggal_selesai GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  judul          TEXT    NOT NULL CHECK (length(judul) BETWEEN 1 AND 200),
  kejadian_id    TEXT    CHECK (kejadian_id IS NULL OR length(kejadian_id) BETWEEN 1 AND 80),
  catatan        TEXT    NOT NULL DEFAULT '' CHECK (length(catatan) <= 2000),
  penilaian      INTEGER CHECK (penilaian IS NULL OR penilaian BETWEEN 1 AND 5),
  oleh           TEXT    NOT NULL CHECK (length(oleh) BETWEEN 1 AND 80),
  oleh_nama      TEXT    NOT NULL DEFAULT '' CHECK (length(oleh_nama) <= 120),
  dibuat         TEXT    NOT NULL,
  diubah         TEXT
);
CREATE INDEX IF NOT EXISTS akademisi_riwayat_target ON akademisi_riwayat (jenis_target, target_id);
CREATE INDEX IF NOT EXISTS akademisi_riwayat_kejadian ON akademisi_riwayat (kejadian_id);
