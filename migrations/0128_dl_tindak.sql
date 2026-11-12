-- Log tindak lanjut Usulan langkah Pantau Dalops (data/kajian-bnpb/tindak-langkah/DESAIN-TEKNIS.md). Hanya CREATE ... IF NOT EXISTS, tanpa seed.
-- dl_tindak: status terkini per kunci langkah; dl_tindak_log: riwayat append-only (tidak ada rute ubah atau hapus). Waktu = ms epoch UTC.
CREATE TABLE IF NOT EXISTS dl_tindak (
  kunci TEXT PRIMARY KEY CHECK (length(kunci) BETWEEN 10 AND 120),
  status TEXT NOT NULL CHECK (status IN ('belum','proses','selesai')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  oleh TEXT NOT NULL CHECK (length(oleh) <= 40),
  waktu INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS dl_tindak_waktu ON dl_tindak(waktu);
CREATE TABLE IF NOT EXISTS dl_tindak_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kunci TEXT NOT NULL CHECK (length(kunci) BETWEEN 10 AND 120),
  status TEXT NOT NULL CHECK (status IN ('belum','proses','selesai')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  langkah TEXT CHECK (langkah IS NULL OR length(langkah) <= 400),
  oleh TEXT NOT NULL CHECK (length(oleh) <= 40),
  waktu INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS dl_tindak_log_kunci ON dl_tindak_log(kunci, id);
CREATE INDEX IF NOT EXISTS dl_tindak_log_oleh ON dl_tindak_log(oleh, waktu);
