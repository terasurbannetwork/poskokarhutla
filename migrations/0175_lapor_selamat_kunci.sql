-- 0175: penguat 0173 (Kabar selamat dan orang dicari, LA-80). 0173 sudah terpasang di D1 produksi sebelum temuan review, jadi tambahan ini migrasi sendiri.
-- Satu tanda aktif per nomor dijaga indeks unik sebagian; lapor_cari_riwayat dikunci trigger (append-only: tanpa UPDATE dan DELETE). Hanya ... IF NOT EXISTS.

CREATE UNIQUE INDEX IF NOT EXISTS lapor_selamat_aktif ON lapor_selamat (nomor) WHERE dicabut IS NULL;

CREATE TRIGGER IF NOT EXISTS lapor_cari_riwayat_tanpa_ubah BEFORE UPDATE ON lapor_cari_riwayat
BEGIN
  SELECT RAISE(ABORT, 'lapor_cari_riwayat append-only');
END;
CREATE TRIGGER IF NOT EXISTS lapor_cari_riwayat_tanpa_hapus BEFORE DELETE ON lapor_cari_riwayat
BEGIN
  SELECT RAISE(ABORT, 'lapor_cari_riwayat append-only');
END;
