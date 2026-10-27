-- Rincian lapangan ala laporan Daops Manggala Agni (laporan posko Dalkarhut): desa, fungsi kawasan, tipe kebakaran, vegetasi, kedalaman gambut,
-- dan luas yang dipadamkan sejak laporan sebelumnya. Diisi petugas /lacak dan akun /instansi (src/instansi.js bacaRinci), semua opsional.
-- Hanya tabel baru, CREATE IF NOT EXISTS: aman diulang. tugas_isian TIDAK diubah: tabel samping 1:1 (pola 0055/0062), ikut terhapus bersama isiannya (180 hari).
-- padam_baru_ha = angka yang diketik petugas; tugas_isian.padam_ha tetap TOTAL (dihitung server: total terakhir tugas + padam_baru_ha), jadi pembaca lama tidak berubah.
CREATE TABLE IF NOT EXISTS isian_rinci (
  isian_id TEXT PRIMARY KEY REFERENCES tugas_isian (id) ON DELETE CASCADE,
  desa TEXT CHECK (desa IS NULL OR length(desa) BETWEEN 2 AND 80),
  kawasan TEXT CHECK (kawasan IS NULL OR kawasan IN ('apl', 'hp', 'hpt', 'hpk', 'hl', 'konservasi', 'khdtk', 'tidak_tahu')),
  tipe_kebakaran TEXT CHECK (tipe_kebakaran IS NULL OR tipe_kebakaran IN ('permukaan', 'bawah', 'permukaan_bawah', 'tajuk')),
  vegetasi TEXT CHECK (vegetasi IS NULL OR (json_valid(vegetasi) AND json_type(vegetasi) = 'array' AND json_array_length(vegetasi) BETWEEN 1 AND 9)),
  kedalaman_gambut_cm INTEGER CHECK (kedalaman_gambut_cm IS NULL OR kedalaman_gambut_cm BETWEEN 0 AND 1500),
  padam_baru_ha REAL CHECK (padam_baru_ha IS NULL OR (padam_baru_ha >= 0 AND padam_baru_ha <= 100000)),
  CHECK (coalesce(desa, kawasan, tipe_kebakaran, vegetasi, kedalaman_gambut_cm, padam_baru_ha) IS NOT NULL)
) WITHOUT ROWID;
