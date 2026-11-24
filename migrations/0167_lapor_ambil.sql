-- 0167: pengambil laporan di meja Lapor Bencana (paket data/kajian-bnpb/profil-bpbd/, K12, tiket PF-08, DESAIN-TEKNIS 10.1).
-- Satu laporan diambil satu profil BPBD ("Ditangani: Andi, Pusdalops BPBD Kota Padang"). Tanpa kunci asing ke instansi_profil supaya penghapusan data PIC tidak menghapus catatan
-- penanganan; hanya nama dan jabatan, tanpa NIP, email, atau HP. Tidak pernah ke jawaban publik atau halaman lacak. Waktu = ms epoch UTC.
-- Hanya CREATE ... IF NOT EXISTS; tanpa ALTER; tanpa data contoh. Pemilik yang menerapkan ke D1 produksi.
CREATE TABLE IF NOT EXISTS lapor_ambil (
  nomor TEXT PRIMARY KEY,
  profil_id TEXT NOT NULL CHECK (length(profil_id) = 16),
  akun_id TEXT NOT NULL CHECK (length(akun_id) = 16),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 100),
  jabatan TEXT NOT NULL CHECK (length(jabatan) BETWEEN 2 AND 100),
  label TEXT NOT NULL CHECK (length(label) BETWEEN 10 AND 300),
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lapor_ambil_akun ON lapor_ambil (akun_id, waktu);
CREATE INDEX IF NOT EXISTS lapor_ambil_waktu ON lapor_ambil (waktu);
