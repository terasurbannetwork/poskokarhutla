-- 0178: Laporan Berkala (paket data/kajian-bnpb/laporan-berkala/, tiket LB-07, DESAIN-TEKNIS bagian 3, KEPUTUSAN D3, D11).
-- Satu baris per (periode, kode, versi): versi 0 = draf (boleh diubah dan dihapus), versi 1.. = beku (append-only, dijaga trigger).
-- angka_kunci = objek R2 berkas angka di bawah berkala/<periode>/<kode>/; versi beku menunjuk salinan beku/v<N>.json dan sidiknya diperiksa tiap dibaca.
-- Hari 00 dicek tersendiri: date('2026-01-00') = NULL, dan CHECK yang bernilai NULL lolos.
-- Trigger ketiga menahan INSERT OR REPLACE yang menimpa versi beku (BEFORE UPDATE dan BEFORE DELETE tidak menahannya).
-- Hanya CREATE ... IF NOT EXISTS; tanpa ALTER, tanpa data contoh. Pemilik yang menerapkan ke D1 produksi.
-- Komentar `--` sengaja di baris sendiri (pecah() di tests/warga/_bantu.mjs memotong di baris berakhir ';').
CREATE TABLE IF NOT EXISTS laporan_berkala (
  periode TEXT NOT NULL CHECK (periode IN ('harian', 'mingguan', 'bulanan', 'tahunan')),
  kode TEXT NOT NULL CHECK (
    (periode = 'harian'   AND kode GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]' AND CAST(substr(kode, 6, 2) AS INTEGER) BETWEEN 1 AND 12 AND CAST(substr(kode, 9, 2) AS INTEGER) BETWEEN 1 AND 31 AND date(kode) = kode) OR
    (periode = 'mingguan' AND kode GLOB '[0-9][0-9][0-9][0-9]-W[0-5][0-9]' AND CAST(substr(kode, 7, 2) AS INTEGER) BETWEEN 1 AND 53) OR
    (periode = 'bulanan'  AND kode GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]' AND CAST(substr(kode, 6, 2) AS INTEGER) BETWEEN 1 AND 12) OR
    (periode = 'tahunan'  AND kode GLOB '[0-9][0-9][0-9][0-9]')),
  versi INTEGER NOT NULL CHECK (versi >= 0),
  isian TEXT NOT NULL CHECK (length(isian) <= 98304 AND json_valid(isian)),
  angka_kunci TEXT NOT NULL CHECK (angka_kunci GLOB ('berkala/' || periode || '/' || kode || '/*') AND angka_kunci NOT GLOB '*..*'),
  angka_sha256 TEXT NOT NULL CHECK (length(angka_sha256) = 64 AND angka_sha256 NOT GLOB '*[^0-9a-f]*'),
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 80),
  PRIMARY KEY (periode, kode, versi)
);
CREATE TRIGGER IF NOT EXISTS laporan_berkala_beku_ubah BEFORE UPDATE ON laporan_berkala
WHEN OLD.versi > 0 OR NEW.versi <> OLD.versi OR NEW.periode <> OLD.periode OR NEW.kode <> OLD.kode
BEGIN SELECT RAISE(ABORT, 'versi beku tidak bisa diubah'); END;
CREATE TRIGGER IF NOT EXISTS laporan_berkala_beku_hapus BEFORE DELETE ON laporan_berkala WHEN OLD.versi > 0
BEGIN SELECT RAISE(ABORT, 'versi beku tidak bisa dihapus'); END;
CREATE TRIGGER IF NOT EXISTS laporan_berkala_beku_timpa BEFORE INSERT ON laporan_berkala
WHEN EXISTS (SELECT 1 FROM laporan_berkala WHERE periode = NEW.periode AND kode = NEW.kode AND versi = NEW.versi AND versi > 0)
BEGIN SELECT RAISE(ABORT, 'versi beku tidak bisa ditimpa'); END;
CREATE TABLE IF NOT EXISTS laporan_berkala_jejak (
  periode TEXT NOT NULL,
  kode TEXT NOT NULL,
  versi INTEGER NOT NULL,
  aksi TEXT NOT NULL CHECK (aksi IN ('simpan', 'bekukan', 'buka', 'cetak', 'foto')),
  oleh TEXT NOT NULL,
  waktu INTEGER NOT NULL
);
-- jejak = catatan audit: tidak boleh diubah atau dihapus (pola 0003 audit_moderasi)
CREATE TRIGGER IF NOT EXISTS laporan_berkala_jejak_tetap_ubah BEFORE UPDATE ON laporan_berkala_jejak BEGIN SELECT RAISE(ABORT, 'jejak laporan berkala tidak boleh diubah'); END;
CREATE TRIGGER IF NOT EXISTS laporan_berkala_jejak_tetap_hapus BEFORE DELETE ON laporan_berkala_jejak BEGIN SELECT RAISE(ABORT, 'jejak laporan berkala tidak boleh dihapus'); END;
CREATE INDEX IF NOT EXISTS laporan_berkala_jejak_kode ON laporan_berkala_jejak (periode, kode, waktu);
