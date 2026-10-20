-- Ruang Posko, perbaikan dari security-reviewer (0018 sudah ikut commit, jadi tidak disunting). Idempoten.
-- Laporan regu berangka pencilan DITAHAN dari agregat publik sampai admin memutuskan: tabel samping (bukan ALTER, supaya aman diulang).
-- Tidak ada baris = laporan biasa. putusan 'tahan' = dikecualikan dari neraca; 'setuju' = ikut dihitung.
CREATE TABLE IF NOT EXISTS lapangan_tahan (
  lapangan_id TEXT PRIMARY KEY REFERENCES lapangan (id) ON DELETE CASCADE,
  alasan TEXT NOT NULL CHECK (length(alasan) BETWEEN 1 AND 200),
  putusan TEXT NOT NULL CHECK (putusan IN ('tahan', 'setuju')),
  waktu INTEGER NOT NULL,
  oleh TEXT
);
-- luas dan padam per laporan paling banyak 5000 ha (0018 mengizinkan 100000)
CREATE TRIGGER IF NOT EXISTS lapangan_luas_maks BEFORE INSERT ON lapangan
WHEN NEW.luas_ha > 5000 OR NEW.padam_ha > 5000
BEGIN
  SELECT RAISE(ABORT, 'luas atau padam melebihi 5000 ha per laporan');
END;
-- kendala yang diubah lewat UPDATE tetap hanya enam nilai tetap
CREATE TRIGGER IF NOT EXISTS lapangan_kendala_ubah BEFORE UPDATE OF kendala ON lapangan
WHEN EXISTS (SELECT 1 FROM json_each(NEW.kendala) WHERE value NOT IN ('air_jauh', 'akses_sulit_rawa', 'roda_empat_sulit', 'air_tidak_cukup', 'asap_tebal', 'angin_kencang'))
  OR json_array_length(NEW.kendala) != (SELECT count(DISTINCT value) FROM json_each(NEW.kendala))
BEGIN
  SELECT RAISE(ABORT, 'kendala tidak sah atau berulang');
END;
-- Batas laju kegagalan autentikasi dan unggah foto regu. Tabel sendiri (bukan melebarkan CHECK `laju` di 0004, yang butuh bangun ulang tabel panas).
-- kunci = hash IP bergaram IP_SALT (kode_gagal, admin_gagal) atau id regu (foto). Dibersihkan cron menit 17 (2 hari).
CREATE TABLE IF NOT EXISTS laju_posko (
  kunci TEXT NOT NULL CHECK (length(kunci) BETWEEN 3 AND 64),
  aksi TEXT NOT NULL CHECK (aksi IN ('kode_gagal', 'admin_gagal', 'foto')),
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS laju_posko_k ON laju_posko (kunci, aksi, waktu);
