-- 0165: keadaan percakapan WA tahap 2 data lanjutan BPBD (paket data/kajian-bnpb/lapor-lanjutan/, D24, tiket LJ-05).
-- Satu draf per nomor WA anggota tim berkas. Mesin pengisi rumah dan prasarana di src/lapor_lanjut_mesin.js tanpa model AI; keadaan berisi isian yang sedang
-- diketik (termasuk isian pribadi). Draf dihapus begitu objek tersimpan atau dibatalkan, dan dibuang bila lebih tua dari 24 jam (saat dibaca dan oleh cron bersih-bersih).
-- Hanya CREATE ... IF NOT EXISTS; tanpa trigger; tanpa ALTER. Waktu = ms epoch UTC. Tanpa data contoh. Pemilik yang menerapkan ke D1 produksi.

CREATE TABLE IF NOT EXISTS lj_sesi (
  wa TEXT PRIMARY KEY CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  berkas TEXT NOT NULL REFERENCES lj_berkas (id),
  keadaan TEXT NOT NULL CHECK (json_valid(keadaan) AND length(keadaan) <= 6000),
  diubah INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lj_sesi_diubah ON lj_sesi (diubah);
