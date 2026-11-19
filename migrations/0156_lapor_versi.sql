-- 0156: Lapor Bencana BNPB, laporan susulan (F-28, ALGORITMA A12, KEPUTUSAN Q26: 72 jam, paling banyak 10 versi). Tiket LA-26.
-- lapor_versi: versi 2 dan seterusnya dari satu laporan (versi 1 = isian saat terkirim, tersimpan di lapor_sesi, jadi tidak ada barisnya).
-- Kunci utama (nomor, versi) menolak dua susulan serentak. Waktu = ms epoch UTC. Hanya CREATE ... IF NOT EXISTS; tanpa trigger.
-- Penanda "ada susulan" tanpa kolom: versi > 1 yang lebih baru daripada riwayat tiket terakhir oleh selain Pelapor.

CREATE TABLE IF NOT EXISTS lapor_versi (
  nomor TEXT NOT NULL,
  versi INTEGER NOT NULL CHECK (versi BETWEEN 2 AND 10),
  isi TEXT NOT NULL CHECK (length(isi) <= 60000),
  perubahan TEXT NOT NULL CHECK (length(perubahan) <= 8000),
  waktu INTEGER NOT NULL,
  PRIMARY KEY (nomor, versi)
);
