-- Halaman staf /monitor (src/monitor.js): tanda BACA peringatan api per tugas, oleh Dit. Dalops BNPB (pihak 'dalops') dan BPBD (pihak 'bpbd').
-- Satu baris = satu pembaca di satu tugas (INSERT OR IGNORE, jadi membuka berulang tidak menggeser waktu baca pertama).
-- pembaca = 'staf:<id>' | 'akun:<id>' | 'admin:<awalan>'; nama dan unit disalin saat dibaca supaya tetap terbaca sesudah akun dicabut. Waktu = ms epoch UTC. Idempoten.
-- Groundcheck dan tindak lanjut TIDAK disimpan di sini: dibaca dari tugas_isian (langkah 'konfirmasi' dan 'tindakan') dan instansi_media.
CREATE TABLE IF NOT EXISTS monitor_baca (
  tugas_id TEXT NOT NULL REFERENCES tugas_api (id) ON DELETE CASCADE,
  pihak TEXT NOT NULL CHECK (pihak IN ('dalops', 'bpbd')),
  pembaca TEXT NOT NULL CHECK (length(pembaca) BETWEEN 5 AND 40),
  nama TEXT CHECK (nama IS NULL OR length(nama) <= 100),
  unit TEXT CHECK (unit IS NULL OR length(unit) <= 120),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  PRIMARY KEY (tugas_id, pembaca)
) WITHOUT ROWID;
-- PK sudah melayani pencarian per tugas; indeks ini untuk pembersihan/urut waktu.
CREATE INDEX IF NOT EXISTS monitor_baca_waktu ON monitor_baca (waktu);
