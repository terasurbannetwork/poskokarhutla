-- Pegawai dan Relawan Lapangan, tahap B (data/kajian-bnpb/lapangan/DESAIN-TEKNIS.md §3): tugas, anggota, nonce absen, absen, logbook harian, foto logbook, label kondisi. Idempoten (CREATE IF NOT EXISTS).
-- Enum di CHECK HARUS sama dengan src/lapangan_konst.js (dijaga tests/warga/lapangan_skema.test.mjs). Waktu = ms epoch UTC; tanggal logbook/absen = tanggal WIB (YYYY-MM-DD).
-- Orang dihapus (cabut diri relawan) = absen, logbook, dan nonce-nya ikut hilang (ON DELETE CASCADE); berkas R2-nya dibuang oleh hapusOrang() di src/lapangan.js.
-- Tugas TIDAK bisa dihapus selagi punya absen atau logbook (ON DELETE RESTRICT): bukti kehadiran tidak ikut hilang. Dummy dihapus berurutan absen, logbook, lalu tugas. Ketua yang dihapus = ketua_id NULL.
-- Retensi 2 tahun (LP-049) belum punya cron; sampai itu jadi, tidak ada penghapusan otomatis absen/logbook.
-- Vektor wajah dari absen TIDAK disimpan di sini: hanya skor_wajah. lp_absen.foto_sha256 UNIQUE = foto yang sama tidak bisa dipakai dua kali.
CREATE TABLE IF NOT EXISTS lp_tugas (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 2 AND 120),
  bencana TEXT NOT NULL CHECK (length(bencana) BETWEEN 2 AND 30 AND bencana NOT GLOB '*[^a-z_]*'),
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  radius_m INTEGER NOT NULL CHECK (radius_m BETWEEN 50 AND 50000),
  wilayah_teks TEXT CHECK (wilayah_teks IS NULL OR length(wilayah_teks) <= 120),
  renlap_url TEXT CHECK (renlap_url IS NULL OR (length(renlap_url) BETWEEN 10 AND 300 AND renlap_url LIKE 'https://%')),
  mulai INTEGER NOT NULL,
  selesai INTEGER NOT NULL,
  ketua_id TEXT REFERENCES orang (id) ON DELETE SET NULL CHECK (ketua_id IS NULL OR length(ketua_id) = 16),
  dibuat_oleh TEXT CHECK (dibuat_oleh IS NULL OR length(dibuat_oleh) <= 64),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (selesai > mulai)
);
CREATE INDEX IF NOT EXISTS lp_tugas_waktu ON lp_tugas (selesai, mulai);

CREATE TABLE IF NOT EXISTS lp_anggota (
  tugas_id TEXT NOT NULL REFERENCES lp_tugas (id) ON DELETE CASCADE,
  orang_id TEXT NOT NULL REFERENCES orang (id) ON DELETE CASCADE,
  peran TEXT NOT NULL DEFAULT 'anggota' CHECK (peran IN ('ketua', 'anggota')),
  PRIMARY KEY (tugas_id, orang_id)
);
CREATE INDEX IF NOT EXISTS lp_anggota_orang ON lp_anggota (orang_id);

-- nonce: yang disimpan hanya sha256; sekali pakai; terikat orang. Dibuang cron menit 17 sesudah kedaluwarsa + 1 hari.
CREATE TABLE IF NOT EXISTS lp_nonce (
  nonce_sha TEXT PRIMARY KEY CHECK (length(nonce_sha) = 64),
  orang_id TEXT NOT NULL REFERENCES orang (id) ON DELETE CASCADE,
  tantangan TEXT NOT NULL CHECK (tantangan IN ('kedip', 'toleh_kiri', 'toleh_kanan')),
  kedaluwarsa INTEGER NOT NULL,
  dipakai INTEGER NOT NULL DEFAULT 0 CHECK (dipakai IN (0, 1)),
  dibuat INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lp_nonce_orang ON lp_nonce (orang_id, kedaluwarsa);

CREATE TABLE IF NOT EXISTS lp_absen (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  orang_id TEXT NOT NULL REFERENCES orang (id) ON DELETE CASCADE,
  tugas_id TEXT NOT NULL REFERENCES lp_tugas (id) ON DELETE RESTRICT,
  jenis TEXT NOT NULL CHECK (jenis IN ('masuk', 'pulang')),
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  waktu INTEGER NOT NULL,
  waktu_hp INTEGER,
  selisih_detik INTEGER,
  luring INTEGER NOT NULL DEFAULT 0 CHECK (luring IN (0, 1)),
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  akurasi REAL CHECK (akurasi IS NULL OR (akurasi >= 0 AND akurasi <= 5000)),
  sampel TEXT CHECK (sampel IS NULL OR (json_valid(sampel) AND length(sampel) <= 1000)),
  jarak_m INTEGER CHECK (jarak_m IS NULL OR jarak_m >= 0),
  dalam_radius INTEGER NOT NULL DEFAULT 0 CHECK (dalam_radius IN (0, 1)),
  gps_curiga INTEGER NOT NULL DEFAULT 0 CHECK (gps_curiga IN (0, 1)),
  gps_ket TEXT CHECK (gps_ket IS NULL OR length(gps_ket) <= 600),
  skor_wajah REAL CHECK (skor_wajah IS NULL OR (skor_wajah >= -1 AND skor_wajah <= 1)),
  tantangan TEXT CHECK (tantangan IS NULL OR tantangan IN ('kedip', 'toleh_kiri', 'toleh_kanan')),
  tantangan_lolos INTEGER NOT NULL DEFAULT 0 CHECK (tantangan_lolos IN (0, 1)),
  skor_hidup REAL CHECK (skor_hidup IS NULL OR (skor_hidup >= 0 AND skor_hidup <= 1)),
  versi_model TEXT CHECK (versi_model IS NULL OR length(versi_model) <= 80),
  foto_key TEXT NOT NULL CHECK (length(foto_key) BETWEEN 5 AND 120),
  foto_sha256 TEXT NOT NULL UNIQUE CHECK (length(foto_sha256) = 64),
  status TEXT NOT NULL CHECK (status IN ('lolos', 'tinjau', 'sah', 'tolak')),
  alasan TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(alasan) AND json_type(alasan) = 'array' AND length(alasan) <= 400),
  peninjau TEXT CHECK (peninjau IS NULL OR length(peninjau) <= 64),
  waktu_tinjau INTEGER,
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  ip_hash TEXT CHECK (ip_hash IS NULL OR length(ip_hash) = 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS lp_absen_orang ON lp_absen (orang_id, waktu);
CREATE INDEX IF NOT EXISTS lp_absen_tugas ON lp_absen (tugas_id, waktu);
CREATE INDEX IF NOT EXISTS lp_absen_tinjau ON lp_absen (waktu) WHERE status = 'tinjau';
CREATE INDEX IF NOT EXISTS lp_absen_tanggal ON lp_absen (tanggal, jenis);
-- satu absen masuk dan satu absen pulang per orang-tugas-hari; yang ditolak peninjau boleh diulang
CREATE UNIQUE INDEX IF NOT EXISTS lp_absen_sehari ON lp_absen (orang_id, tugas_id, jenis, tanggal) WHERE status <> 'tolak';

CREATE TABLE IF NOT EXISTS lp_logbook (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  orang_id TEXT NOT NULL REFERENCES orang (id) ON DELETE CASCADE,
  tugas_id TEXT NOT NULL REFERENCES lp_tugas (id) ON DELETE RESTRICT,
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  kegiatan TEXT NOT NULL CHECK (length(kegiatan) BETWEEN 2 AND 80),
  uraian TEXT CHECK (uraian IS NULL OR length(uraian) <= 2000),
  hasil TEXT CHECK (hasil IS NULL OR length(hasil) <= 1000),
  kendala TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(kendala) AND json_type(kendala) = 'array' AND length(kendala) <= 1000),
  kebutuhan TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(kebutuhan) AND json_type(kebutuhan) = 'array' AND length(kebutuhan) <= 1000),
  kondisi TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(kondisi) AND json_type(kondisi) = 'object' AND length(kondisi) <= 600),
  waktu INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  terkunci INTEGER NOT NULL DEFAULT 0 CHECK (terkunci IN (0, 1)),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (orang_id, tugas_id, tanggal)
);
CREATE INDEX IF NOT EXISTS lp_logbook_tugas ON lp_logbook (tugas_id, tanggal);
CREATE INDEX IF NOT EXISTS lp_logbook_tanggal ON lp_logbook (tanggal);

CREATE TABLE IF NOT EXISTS lp_logbook_foto (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  logbook_id TEXT NOT NULL REFERENCES lp_logbook (id) ON DELETE CASCADE,
  foto_key TEXT NOT NULL CHECK (length(foto_key) BETWEEN 5 AND 120),
  sha256 TEXT NOT NULL UNIQUE CHECK (length(sha256) = 64),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  akurasi REAL CHECK (akurasi IS NULL OR (akurasi >= 0 AND akurasi <= 5000)),
  waktu INTEGER NOT NULL,
  exif_jarak INTEGER CHECK (exif_jarak IS NULL OR exif_jarak >= 0),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS lp_logbook_foto_lb ON lp_logbook_foto (logbook_id);

-- label kondisi lapangan untuk model (ALGORITMA §7): satu baris per logbook dan jenis. sumber_id = id logbook.
-- terverifikasi = 1 bila foto bergeotag <= radius_m + 200 m dari titik tugas, tanggal dalam jadwal tugas, dan EXIF cocok; ekspor label untuk model HANYA memakai terverifikasi = 1.
-- nilai memuat isian terstruktur, dan untuk jenis api juga tugas_api_id + jarak_tugas_m bila ada tugas api Ruang Instansi <= 1 km.
CREATE TABLE IF NOT EXISTS lapangan_label (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  sumber_id TEXT NOT NULL CHECK (length(sumber_id) = 16),
  jenis TEXT NOT NULL CHECK (jenis IN ('api', 'banjir')),
  nilai TEXT NOT NULL CHECK (json_valid(nilai) AND json_type(nilai) = 'object' AND length(nilai) <= 600),
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  waktu INTEGER NOT NULL,
  terverifikasi INTEGER NOT NULL DEFAULT 0 CHECK (terverifikasi IN (0, 1)),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (sumber_id, jenis)
);
CREATE INDEX IF NOT EXISTS lapangan_label_waktu ON lapangan_label (jenis, waktu);

-- label ikut hilang bersama logbook-nya, lewat jalur mana pun (hapusOrang, CASCADE, dummy)
CREATE TRIGGER IF NOT EXISTS lapangan_label_ikut_logbook AFTER DELETE ON lp_logbook
BEGIN
  DELETE FROM lapangan_label WHERE sumber_id = OLD.id;
END;

-- sisa absen yang wajib ditinjau sesudah wajah didaftarkan ulang (alasan wajah_baru); diisi 3 saat daftar ulang, dikurangi tiap absen; 0 = bebas
CREATE TABLE IF NOT EXISTS lp_wajah_baru (
  orang_id TEXT PRIMARY KEY REFERENCES orang (id) ON DELETE CASCADE,
  sisa INTEGER NOT NULL CHECK (sisa BETWEEN 0 AND 10)
);
