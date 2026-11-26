-- 0183: riwayat keputusan meja atas komentar Alun-alun dan usulan angkanya (paket data/kajian-bnpb/lapor-ai/, K95, D139, tiket LA-88).
-- Satu baris per keputusan: terima atau tolak usulan, sembunyikan atau tampilkan lagi komentar. Append-only (trigger menolak UPDATE dan DELETE).
-- nomor = laporan yang angkanya ditulis saat terima (laporan terbaru gugus, yang dibaca kartu); isian = nama isian laporan tujuan.
-- oleh = pelaku sesi meja (nama staf atau label profil), tanpa nomor HP. Hanya CREATE ... IF NOT EXISTS; pemilik yang menerapkan ke D1 produksi.

CREATE TABLE IF NOT EXISTS lp_komen_putus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  komen TEXT NOT NULL CHECK (length(komen) = 16),
  usul INTEGER,
  aksi TEXT NOT NULL CHECK (aksi IN ('terima', 'tolak', 'sembunyi', 'tampil')),
  nomor TEXT CHECK (nomor IS NULL OR length(nomor) BETWEEN 6 AND 40),
  isian TEXT CHECK (isian IS NULL OR length(isian) BETWEEN 1 AND 40),
  alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 300),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 300),
  waktu INTEGER NOT NULL,
  CHECK ((aksi IN ('terima', 'tolak')) = (usul IS NOT NULL)),
  CHECK ((aksi = 'terima') = (nomor IS NOT NULL AND isian IS NOT NULL)),
  CHECK (aksi = 'terima' OR (nomor IS NULL AND isian IS NULL))
);
CREATE INDEX IF NOT EXISTS lp_komen_putus_komen ON lp_komen_putus (komen, id);

CREATE TRIGGER IF NOT EXISTS lp_komen_putus_tanpa_ubah BEFORE UPDATE ON lp_komen_putus
BEGIN
  SELECT RAISE(ABORT, 'lp_komen_putus append-only');
END;
CREATE TRIGGER IF NOT EXISTS lp_komen_putus_tanpa_hapus BEFORE DELETE ON lp_komen_putus
BEGIN
  SELECT RAISE(ABORT, 'lp_komen_putus append-only');
END;
