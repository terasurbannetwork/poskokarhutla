-- Tautan bertoken untuk pihak luar tanpa akun (FITUR.md §6, WEBSITE.md §6d, pemilik 21 Nov 2026). Satu tabel untuk semua modul BARU;
-- tw_token, penugasan, lj_tim, kunci_api tetap di tempatnya. Hanya sha-256 token yang disimpan; token tampil sekali saat terbit.
-- Kedaluwarsa wajib (celah tw_token dan kunci_api tanpa masa berlaku tidak diulang). Daftar cakupan hidup di kode (src/token.js), bukan trigger.
-- Idempoten, tanpa kolom dummy, tidak publik. Akses hanya lewat src/hak.js (bagian Tautan bertoken).
CREATE TABLE IF NOT EXISTS tautan_token (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  jenis TEXT NOT NULL CHECK (length(jenis) BETWEEN 2 AND 40 AND jenis NOT GLOB '*[^a-z0-9_]*'),
  token_sha TEXT NOT NULL UNIQUE CHECK (length(token_sha) = 64 AND token_sha NOT GLOB '*[^0-9a-f]*'),
  sasaran TEXT NOT NULL CHECK (json_valid(sasaran) AND length(sasaran) <= 500),
  cakupan TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(cakupan) AND json_type(cakupan) = 'array' AND length(cakupan) <= 500),
  dibuat INTEGER NOT NULL,
  kedaluwarsa INTEGER NOT NULL CHECK (kedaluwarsa > dibuat),
  dicabut INTEGER,
  terakhir INTEGER,
  dipakai_n INTEGER NOT NULL DEFAULT 0 CHECK (dipakai_n >= 0),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64)
);
CREATE INDEX IF NOT EXISTS tautan_token_jenis ON tautan_token (jenis, kedaluwarsa);
