-- Web Push untuk akun instansi (src/push.js). Waktu = ms epoch UTC. Idempoten (IF NOT EXISTS). Tabel baru; tidak menyentuh tabel lain.
-- push_langganan: satu baris per perangkat (endpoint layanan push). Endpoint + kunci TIDAK pernah ditampilkan ke akun mana pun.
-- Dihapus bersama akunnya (CASCADE) dan oleh cron saat layanan push menjawab 404/410.
CREATE TABLE IF NOT EXISTS push_langganan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  akun_id TEXT NOT NULL REFERENCES instansi_akun (id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE CHECK (length(endpoint) BETWEEN 20 AND 1000 AND endpoint LIKE 'https://%'),
  p256dh TEXT NOT NULL CHECK (length(p256dh) BETWEEN 80 AND 100),
  auth TEXT NOT NULL CHECK (length(auth) BETWEEN 20 AND 30),
  dibuat INTEGER NOT NULL,
  terakhir_status INTEGER,
  terakhir_pada INTEGER
);
CREATE INDEX IF NOT EXISTS push_langganan_akun ON push_langganan (akun_id);

-- push_akun: penanda per akun. terakhir_kirim = kiriman sukses terakhir ("api baru" dihitung sejak itu); putaran = nomor putaran 3 jam
-- yang sudah diproses (floor(ms / 3 jam)), supaya invokasi menit berikutnya melanjutkan akun yang belum, bukan mengulang.
CREATE TABLE IF NOT EXISTS push_akun (
  akun_id TEXT PRIMARY KEY REFERENCES instansi_akun (id) ON DELETE CASCADE,
  terakhir_kirim INTEGER,
  putaran INTEGER NOT NULL DEFAULT 0
) WITHOUT ROWID;
