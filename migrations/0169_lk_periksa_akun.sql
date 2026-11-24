-- 0169: penanda pemeriksa untuk lapor_periksa (paket data/kajian-bnpb/lapor-kejadian/, tiket LK-02, ALGORITMA A3 butir 2, D4).
-- lapor_periksa.oleh hanya teks bebas (nama staf BNPB bisa berbunyi "BPBD ..."), jadi jenis dan wilayah akun pemeriksa dicatat terpisah
-- dari cakupan sesi meja saat pengecekan ditulis. Satu baris per baris lapor_periksa, append-only (INSERT dan SELECT saja di matriks hak).
-- Tanpa nama orang; hanya jenis akun dan kode wilayah. Pengecekan lama tanpa baris di sini dihitung belum terverifikasi.
-- Hanya CREATE ... IF NOT EXISTS; tanpa ALTER; tanpa data contoh. Pemilik yang menerapkan ke D1 produksi.
CREATE TABLE IF NOT EXISTS lk_periksa_akun (
  periksa_id INTEGER PRIMARY KEY,
  jenis TEXT NOT NULL CHECK (jenis IN ('bnpb', 'bpbd')),
  tingkat TEXT CHECK (tingkat IS NULL OR tingkat IN ('kab', 'prov')),
  prov TEXT CHECK (prov IS NULL OR prov GLOB '[0-9][0-9]'),
  kab TEXT CHECK (kab IS NULL OR kab GLOB '[0-9][0-9].[0-9][0-9]'),
  kab_nama TEXT CHECK (kab_nama IS NULL OR length(kab_nama) <= 100),
  CHECK (jenis = 'bnpb' OR (tingkat IS NOT NULL AND prov IS NOT NULL))
);
