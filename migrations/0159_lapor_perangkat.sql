-- 0159: Lapor Bencana BNPB, pintu web tanpa kode WA: nomor yang diketik terikat ke perangkat (K65, D99-D102, Q57).
-- lapor_perangkat: ikatan (sidik perangkat, nomor). Sidik = sha256 dari kunci acak 32 byte di kuki HttpOnly lapor_perangkat; kunci mentah tidak pernah disimpan.
-- Dipakai untuk menolak kunci karangan (hanya kunci yang diterbitkan server dikenali) dan membatasi berapa nomor satu perangkat boleh dipakai (D102).
-- lapor_milik: sesi dan unggahan video yang dibuat dari sebuah perangkat. Bacaan, kotak, status, foto, dan unggahan jalur ini hanya melihat baris miliknya (D100).
-- Dipetakan di tabel samping karena lapor_sesi dan lapor_unggah tidak bisa diubah tanpa ALTER. jenis 'sesi' memakai lapor_sesi.id, 'unggah' memakai lapor_unggah.id.
-- Hanya CREATE ... IF NOT EXISTS; tanpa trigger; tanpa ALTER. Waktu = ms epoch UTC. Pemilik yang menerapkan ke D1 produksi.

CREATE TABLE IF NOT EXISTS lapor_perangkat (
  perangkat_sha TEXT NOT NULL CHECK (length(perangkat_sha) = 64),
  wa TEXT NOT NULL,
  dibuat INTEGER NOT NULL,
  terakhir INTEGER NOT NULL,
  PRIMARY KEY (perangkat_sha, wa)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS lapor_milik (
  jenis TEXT NOT NULL CHECK (jenis IN ('sesi', 'unggah')),
  id TEXT NOT NULL,
  perangkat_sha TEXT NOT NULL CHECK (length(perangkat_sha) = 64),
  PRIMARY KEY (jenis, id)
) WITHOUT ROWID;
