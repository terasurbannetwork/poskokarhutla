-- Penugasan orang ke tugas api dan pelacak posisi lewat tautan (src/penugasan.js). Waktu = ms epoch UTC. Idempoten (IF NOT EXISTS). Tabel baru; tidak menyentuh tabel lain.
-- Tautan /lacak/<token>: token 18 byte acak (36 hex) dibuat Worker, TAMPIL SEKALI ke akun yang menugaskan; yang disimpan hanya sha256-nya (token_sha).
-- Tanpa 0035 semua rute penugasan menjawab 503 sopan; tugas api, isian, dan peta lain tetap jalan.
-- Kolom baru tugas_api (akses, padam_verif, padam_pada, verif_pada, cek_ulang_pada) dan instansi_media (exif_*, kamera) ada di 0029 (belum diterapkan di produksi saat 0035 ditulis).
CREATE TABLE IF NOT EXISTS penugasan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  tugas_id TEXT NOT NULL REFERENCES tugas_api (id) ON DELETE CASCADE,
  akun_id TEXT NOT NULL REFERENCES instansi_akun (id) ON DELETE CASCADE,
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 80),
  peran TEXT NOT NULL CHECK (peran IN ('driver', 'ketua_regu', 'anggota', 'lainnya')),
  wa TEXT CHECK (wa IS NULL OR (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*')),
  orang INTEGER NOT NULL DEFAULT 1 CHECK (orang BETWEEN 1 AND 200),
  token_sha TEXT NOT NULL UNIQUE CHECK (length(token_sha) = 64 AND token_sha NOT GLOB '*[^0-9a-f]*'),
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'dicabut', 'selesai')),
  dibuat INTEGER NOT NULL,
  kedaluwarsa INTEGER NOT NULL CHECK (kedaluwarsa > dibuat),
  dibuka_pada INTEGER,
  berangkat_pada INTEGER,
  tiba_pada INTEGER,
  selesai_pada INTEGER,
  -- butir persiapan yang dicentang: {"kunci": waktu_ms}; daftar butirnya disusun Worker dari rekomendasi tugas, jadi kunci tak dikenal ditolak di Worker
  checklist TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(checklist) AND json_type(checklist) = 'object' AND length(checklist) <= 2000),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS penugasan_tugas ON penugasan (tugas_id, dibuat);
CREATE INDEX IF NOT EXISTS penugasan_akun ON penugasan (akun_id, dibuat);

-- Posisi: hanya menambah (append-only). Retensi 30 hari di cron bersih-bersih: DELETE ... WHERE pada <= ?
CREATE TABLE IF NOT EXISTS penugasan_posisi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  penugasan_id TEXT NOT NULL REFERENCES penugasan (id) ON DELETE CASCADE,
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  akurasi REAL CHECK (akurasi IS NULL OR (akurasi >= 0 AND akurasi <= 5000)),
  pada INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS penugasan_posisi_jejak ON penugasan_posisi (penugasan_id, pada DESC);
CREATE INDEX IF NOT EXISTS penugasan_posisi_pada ON penugasan_posisi (pada);
