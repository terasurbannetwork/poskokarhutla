-- Bahan pembasah (liter konsentrat, kunci 'pembasah_l', maks 5000) boleh di alat_dipakai isian tugas.
-- Layar /instansi dan src/instansi.js ALAT sudah mengirimnya sejak 22 Okt 2026, tetapi perubahan itu dulu ditulis dengan
-- menyunting 0029 yang SUDAH diterapkan, jadi trigger produksi tetap menolak kabar yang memuat pembasah.
-- 0029 dikembalikan ke isi yang diterapkan; trigger dibuat ulang di sini. Idempoten: DROP IF EXISTS lalu CREATE.
DROP TRIGGER IF EXISTS tugas_isian_unsur_sah;
CREATE TRIGGER tugas_isian_unsur_sah BEFORE INSERT ON tugas_isian
WHEN EXISTS (SELECT 1 FROM json_each(NEW.personel_unsur) WHERE key NOT IN ('bpbd', 'tni', 'polri', 'manggala_agni', 'mpa', 'damkar', 'swasta', 'relawan', 'lainnya')
    OR typeof(value) != 'integer' OR value < 0 OR value > 5000)
  OR EXISTS (SELECT 1 FROM json_each(NEW.alat_dipakai) WHERE key NOT IN ('pompa', 'selang_m', 'jet_shooter', 'heli_wb', 'alat_berat', 'drone_termal', 'pembasah_l')
    OR typeof(value) != 'integer' OR value < 0 OR value > 100000 OR (key = 'pembasah_l' AND value > 5000))
BEGIN
  SELECT RAISE(ABORT, 'personel_unsur atau alat_dipakai tidak sah');
END;

DROP TRIGGER IF EXISTS tugas_isian_unsur_ubah;
CREATE TRIGGER tugas_isian_unsur_ubah BEFORE UPDATE OF personel_unsur, alat_dipakai ON tugas_isian
WHEN EXISTS (SELECT 1 FROM json_each(NEW.personel_unsur) WHERE key NOT IN ('bpbd', 'tni', 'polri', 'manggala_agni', 'mpa', 'damkar', 'swasta', 'relawan', 'lainnya')
    OR typeof(value) != 'integer' OR value < 0 OR value > 5000)
  OR EXISTS (SELECT 1 FROM json_each(NEW.alat_dipakai) WHERE key NOT IN ('pompa', 'selang_m', 'jet_shooter', 'heli_wb', 'alat_berat', 'drone_termal', 'pembasah_l')
    OR typeof(value) != 'integer' OR value < 0 OR value > 100000 OR (key = 'pembasah_l' AND value > 5000))
BEGIN
  SELECT RAISE(ABORT, 'personel_unsur atau alat_dipakai tidak sah');
END;
