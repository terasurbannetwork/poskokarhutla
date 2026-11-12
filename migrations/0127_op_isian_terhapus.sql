-- Indeks butir isian manual yang dihapus (0126). Dibaca tiap permintaan /api/operasi/peta, nilai, monitor, temuan mesin, dan cron lengkapi;
-- tanpa indeks ini SELECT ... WHERE terhapus = 1 memindai seluruh op_isian (gerbang tests/agen/gerbang-d1-pindai). Hanya CREATE INDEX IF NOT EXISTS.
CREATE INDEX IF NOT EXISTS op_isian_terhapus ON op_isian(terhapus);
