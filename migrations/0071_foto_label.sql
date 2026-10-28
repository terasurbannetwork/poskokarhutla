-- Label kerusakan foto lapangan dari manusia (fondasi computer vision yang jujur: kumpulkan label dulu, model nanti; src/foto_label.js).
-- Satu baris = satu pelabel menilai satu foto. Foto boleh dilabel banyak orang (kesepakatan antar-pelabel); unik (sumber, foto_id, pelabel).
-- sumber menunjuk tabel foto yang sudah ada tanpa FK (polimorfik; rute memeriksa fotonya ada): foto (laporan warga, R2 foto/<id>),
-- uji_pilot (uji_pilot_lapor, R2 uji-pilot/<id>), instansi_media (uji lapangan, R2 instansi/media/<id>). pelabel = id akun admin (adminOK). Waktu = ms epoch UTC.
-- dummy = 1 untuk label foto contoh (tombol 🧪/🧹 halaman /admin/labelfoto). Hanya tabel baru, CREATE IF NOT EXISTS: aman diulang.
CREATE TABLE IF NOT EXISTS foto_label (
  sumber TEXT NOT NULL CHECK (sumber IN ('foto', 'uji_pilot', 'instansi_media')),
  foto_id TEXT NOT NULL CHECK (length(foto_id) = 16),
  pelabel TEXT NOT NULL CHECK (length(pelabel) BETWEEN 1 AND 40),
  kelas TEXT NOT NULL CHECK (kelas IN ('rusak_berat', 'rusak_sedang', 'rusak_ringan', 'tidak_rusak', 'bukan_bangunan', 'tidak_jelas')),
  jenis_objek TEXT CHECK (jenis_objek IS NULL OR jenis_objek IN ('rumah', 'sekolah', 'ibadah', 'kesehatan', 'jembatan', 'jalan', 'lain')),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  PRIMARY KEY (sumber, foto_id, pelabel)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS foto_label_pelabel ON foto_label (pelabel, waktu);
