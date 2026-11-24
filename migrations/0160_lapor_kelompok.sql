-- 0160: Lapor Bencana BNPB, kejadian yang sama (KEPUTUSAN K66, D103-D107; TIKET LA-68).
-- lapor_kelompok: laporan terkirim (nomor tiket) yang oleh pelapornya dikonfirmasi sebagai kejadian yang sama, dikelompokkan dengan satu kode KJ-ddmmyy-NN.
-- Tabel samping karena lapor_sesi tidak bisa diubah tanpa ALTER. Hanya pengelompokan laporan warga, BUKAN buku kejadian (AGENTS 2.15); penempelan ke Buku Besar tetap lewat pasang.py.
-- Staf BNPB melepas laporan dari kejadian dengan menghapus barisnya (tercatat di riwayat tiket). lapor_kelompok_urut: nomor urut harian kode KJ (tgl = ddmmyy WIB laporan induk).
-- Hanya CREATE ... IF NOT EXISTS; tanpa trigger; tanpa ALTER. Waktu = ms epoch UTC. Tanpa data contoh. Pemilik yang menerapkan ke D1 produksi.

CREATE TABLE IF NOT EXISTS lapor_kelompok (
  nomor TEXT PRIMARY KEY CHECK (nomor GLOB 'LA-[0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9]*'),
  kode TEXT NOT NULL CHECK (kode GLOB 'KJ-[0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9]*'),
  induk TEXT CHECK (induk IS NULL OR induk GLOB 'LA-[0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9]*'),
  dibuat INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lapor_kelompok_kode ON lapor_kelompok (kode);

CREATE TABLE IF NOT EXISTS lapor_kelompok_urut (
  tgl TEXT PRIMARY KEY CHECK (length(tgl) = 6),
  n INTEGER NOT NULL
);
