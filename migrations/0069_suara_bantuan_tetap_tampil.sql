-- Aduan (3 suara) tidak lagi menyembunyikan otomatis laporan bantuan (minta, tawar, sehat, padam, evakuasi): tiga IP anonim tak boleh
-- menghapus permintaan tolong. Suara tetap dihitung (kolom aduan naik) sehingga moderator melihatnya di daftar admin dan memutuskan sendiri.
-- Himpunan jenis = trigger kontak_hanya_bantuan = bantuan:true di public/informasi_jenis.js. Idempoten: DROP lalu CREATE.
DROP TRIGGER IF EXISTS suara_tambah;
CREATE TRIGGER suara_tambah AFTER INSERT ON suara BEGIN
  UPDATE laporan SET
    benar = (SELECT count(*) FROM suara WHERE laporan_id = NEW.laporan_id AND nilai = 'benar'),
    salah = (SELECT count(*) FROM suara WHERE laporan_id = NEW.laporan_id AND nilai = 'salah'),
    aduan = (SELECT count(*) FROM suara WHERE laporan_id = NEW.laporan_id AND kelompok = 'aduan'),
    disembunyikan = CASE WHEN jenis NOT IN ('minta', 'tawar', 'sehat', 'padam', 'evakuasi')
      AND (SELECT count(*) FROM suara WHERE laporan_id = NEW.laporan_id AND kelompok = 'aduan') >= 3 THEN 1 ELSE disembunyikan END
  WHERE id = NEW.laporan_id;
END;
