-- Penjaga tambahan laporan multi-bahaya (0048 sudah terbit dan tidak diubah; ini migrasi susulan, idempoten).
-- Hari yang sudah dikunci (nyata, bukan dummy) tidak boleh dihapus lewat DELETE langsung: sebelumnya hanya UPDATE yang dijaga trigger lkb_hari_tetap_dikunci.
-- Kiriman milik hari terkunci: tidak boleh dihapus, dan UPDATE hanya sah bila hasilnya berstatus disetujui (jalur ralat). Jalur draf dan kirim sudah ditolak aplikasi pada hari terkunci.
-- Tidak diperketat: GLOB pada lkb_kiriman.tanggal_laporan, karena SQLite tidak bisa menambah CHECK tanpa membangun ulang tabel (tabel berisi arsip beku).
CREATE TRIGGER IF NOT EXISTS lkb_hari_tetap_hapus BEFORE DELETE ON lkb_hari
WHEN OLD.status != 'terbuka' AND OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'laporan yang sudah dikunci tidak bisa dihapus; pakai ralat');
END;

CREATE TRIGGER IF NOT EXISTS lkb_kiriman_tetap_hapus BEFORE DELETE ON lkb_kiriman
WHEN OLD.dummy = 0 AND EXISTS (SELECT 1 FROM lkb_hari h WHERE h.bencana = OLD.bencana AND h.tanggal_laporan = OLD.tanggal_laporan AND h.status != 'terbuka')
BEGIN
  SELECT RAISE(ABORT, 'kiriman pada laporan yang sudah dikunci tidak bisa dihapus; pakai ralat');
END;

CREATE TRIGGER IF NOT EXISTS lkb_kiriman_tetap_ubah BEFORE UPDATE ON lkb_kiriman
WHEN OLD.dummy = 0 AND NEW.status != 'disetujui' AND EXISTS (SELECT 1 FROM lkb_hari h WHERE h.bencana = OLD.bencana AND h.tanggal_laporan = OLD.tanggal_laporan AND h.status != 'terbuka')
BEGIN
  SELECT RAISE(ABORT, 'kiriman pada laporan yang sudah dikunci hanya bisa diubah lewat ralat');
END;
