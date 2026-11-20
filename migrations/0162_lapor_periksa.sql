-- 0162: Lapor Bencana BNPB, pengecekan lapangan dan jenis tindakan (K69-K70, D108-D112). Tiket LA-73. Nomor 0161 dipesan paket data lanjutan (LJ-01).
-- lapor_periksa: satu baris per pengecekan (Valid, Sebagian benar, Tidak valid) oleh BNPB atau BPBD wilayahnya; perubahan = JSON [{nama, dari, ke}] revisi angka
--   yang ikut ditulis sebagai versi baru di lapor_versi (isian pelapor tidak ditimpa). Append-only: tidak ada UPDATE atau DELETE di src/hak.js.
-- lapor_tindakan: satu baris per tindakan yang dilakukan (kode dari kemampuan.tindakan public/bencana.json, atau 'lain' dengan label bebas). Append-only.
-- Hanya CREATE ... IF NOT EXISTS; tanpa trigger; tanpa ALTER. Waktu = ms epoch UTC. Pemilik yang menerapkan ke D1 produksi.

CREATE TABLE IF NOT EXISTS lapor_periksa (
  id INTEGER PRIMARY KEY,
  nomor TEXT NOT NULL,
  hasil TEXT NOT NULL CHECK (hasil IN ('valid', 'sebagian', 'tidak_valid')),
  catatan TEXT NOT NULL CHECK (length(catatan) BETWEEN 5 AND 1000),
  perubahan TEXT NOT NULL DEFAULT '[]',
  oleh TEXT NOT NULL,
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lapor_periksa_nomor ON lapor_periksa (nomor, waktu);

CREATE TABLE IF NOT EXISTS lapor_tindakan (
  id INTEGER PRIMARY KEY,
  nomor TEXT NOT NULL,
  kode TEXT NOT NULL CHECK (length(kode) BETWEEN 2 AND 40),
  label TEXT NOT NULL CHECK (length(label) BETWEEN 3 AND 120),
  oleh TEXT NOT NULL,
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lapor_tindakan_nomor ON lapor_tindakan (nomor, waktu);
