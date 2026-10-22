-- Antrean ulang kabar seketika (src/kabar.js): kabar yang gagal terkirim (push 5xx/jaringan, email ditolak) disimpan di sini dan dicoba lagi oleh cron menit dengan jeda
-- 1, 5, 15, 60 menit, maksimal 5 percobaan. kabar_terkirim (0043) baru ditulis SESUDAH kirim berhasil, jadi tidak ada kabar yang "habis" tanpa terkirim dan tidak ada kirim ganda.
-- kanal = saluran yang MASIH gagal ("push", "email", atau "push,email"): saluran yang sudah berhasil tidak dikirim ulang. Waktu = ms epoch UTC. Retensi 2 hari.
CREATE TABLE IF NOT EXISTS kabar_ulang (
  kunci TEXT NOT NULL CHECK (length(kunci) BETWEEN 1 AND 80),
  penerima TEXT NOT NULL CHECK (length(penerima) BETWEEN 1 AND 120),
  akun TEXT,
  email TEXT CHECK (email IS NULL OR length(email) <= 254),
  pesan TEXT NOT NULL CHECK (length(pesan) <= 4000),
  kanal TEXT NOT NULL CHECK (kanal IN ('push', 'email', 'push,email')),
  percobaan INTEGER NOT NULL DEFAULT 1 CHECK (percobaan BETWEEN 1 AND 10),
  berikut INTEGER NOT NULL,
  dibuat INTEGER NOT NULL,
  PRIMARY KEY (kunci, penerima)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS kabar_ulang_berikut ON kabar_ulang (berikut);
