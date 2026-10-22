-- Luas satelit AWAL tiap tugas api (GET /api/pipa/lapangan: luas_satelit_awal_ha). tugas_api.luas_ha hanya menyimpan MAKS sepanjang umur tugas, jadi luas saat tugas dibuat hilang;
-- kalibrasi koefisien (scripts/data/kalibrasi.py) butuh keduanya untuk menimbang bias. Tabel samping (pola 0027/0041: ALTER tidak idempoten), ditulis sekali saat tugas dibuat. Tugas lama: tidak ada baris (null, tidak ditebak).
CREATE TABLE IF NOT EXISTS tugas_luas_awal (
  tugas_id TEXT PRIMARY KEY REFERENCES tugas_api (id) ON DELETE CASCADE,
  luas_ha REAL NOT NULL CHECK (luas_ha >= 0 AND luas_ha <= 1000000)
) WITHOUT ROWID;
