/* L1 verifikasi padam + api muncul lagi (docs/bnpb/RENCANA-OPERASI-LAPANGAN.md). Hanya tabel baru, CREATE IF NOT EXISTS: aman diulang.
   Tanpa REFERENCES: tugas dummy dan retensi menghapus tugas_api tanpa terhalang baris sini (yatim dibuang cron). */

-- Riwayat "api muncul lagi": satu baris per kejadian. sumber: firms = titik NASA, himawari = satelit 2 km (perkiraan), regu = laporan regu berkode.
CREATE TABLE IF NOT EXISTS tugas_muncul (
  tugas_id TEXT NOT NULL CHECK (length(tugas_id) = 16),
  waktu INTEGER NOT NULL,
  sumber TEXT NOT NULL CHECK (sumber IN ('firms', 'himawari', 'regu')),
  jarak_km REAL CHECK (jarak_km IS NULL OR (jarak_km >= 0 AND jarak_km <= 50)),
  keterangan TEXT CHECK (keterangan IS NULL OR length(keterangan) <= 300),
  PRIMARY KEY (tugas_id, waktu)
);

-- Laporan regu berkode (lapangan) dalam 2 km dari tugas api di kabupaten yang sama. Satu laporan menaut ke satu tugas (yang terdekat).
-- regu_id + dipercaya: padam dari regu hanya klaim; tugas berubah padam_dilaporkan bila dua regu BERBEDA yang dipercaya (GPS di wilayah regu, tidak ditahan, tanpa tanda curiga) melapor padam dalam 24 jam.
CREATE TABLE IF NOT EXISTS tugas_lapangan (
  tugas_id TEXT NOT NULL CHECK (length(tugas_id) = 16),
  lapangan_id TEXT NOT NULL CHECK (length(lapangan_id) = 16),
  jarak_km REAL NOT NULL CHECK (jarak_km >= 0 AND jarak_km <= 50),
  status TEXT NOT NULL CHECK (status IN ('menyala', 'bara', 'padam', 'tidak_ditemukan')),
  dibuat INTEGER NOT NULL,
  regu_id TEXT,
  dipercaya INTEGER NOT NULL DEFAULT 1 CHECK (dipercaya IN (0, 1)),
  PRIMARY KEY (tugas_id, lapangan_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS tugas_lapangan_satu ON tugas_lapangan (lapangan_id);
