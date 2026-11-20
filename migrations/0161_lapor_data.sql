-- 0161: Lapor Bencana BNPB, data lanjutan BPBD tahap 2 dan 3 (paket data/kajian-bnpb/lapor-lanjutan/, DESAIN-TEKNIS "Skema D1", tiket LJ-01).
-- lj_berkas: satu kejadian per kab/kota, berinduk nomor LA- laporan awal BPBD atau laporan induk kelompok (D2). kejadian_id dan kab4 diisi saat tiket induk
--   tertaut Buku Besar lewat pasang.py; mesin tidak pernah membuat sk_kejadian.
-- lj_tim: ketua dan anggota per berkas; token per orang (sidik di token_sha) ditukar kuki HttpOnly (D20). Nomor WA hanya di sini dan tidak pernah di public/.
-- lj_objek: rumah, prasarana, titik, jiwa, korban, usaha, kebutuhan. Isian umum di data, data pribadi di pribadi (D4) supaya bisa dikosongkan saat masa simpan
--   5 tahun habis (K9, D23). Tidak dihapus keras: salah input = status batal.
-- lj_jejak: riwayat append-only; isi pribadi hanya sidik (pribadi_sidik). lj_akses: log buka berkas, tampil pribadi, unduh media, append-only (D22).
-- lj_media: foto, video, wajah, dokumen per objek; berkas di R2 lapor/data/<berkas>/. lj_tanya: pertanyaan harian per berkas per tanggal WIB (D12).
-- lj_kabar: antrean pesan WA tahap 2, diambil gateway (bukan lapor_kabar yang CHECK jenisnya tertutup). lj_beku: versi beku tanpa data pribadi (D14).
-- Hanya CREATE ... IF NOT EXISTS; tanpa trigger; tanpa ALTER. Waktu = ms epoch UTC. Tanpa data contoh. Pemilik yang menerapkan ke D1 produksi.

CREATE TABLE IF NOT EXISTS lj_berkas (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  induk TEXT NOT NULL CHECK (induk GLOB 'LA-[0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 10),
  kejadian_id TEXT CHECK (kejadian_id IS NULL OR (length(kejadian_id) = 16 AND kejadian_id GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????')),
  kab4 TEXT CHECK (kab4 IS NULL OR (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*')),
  status TEXT NOT NULL DEFAULT 'terbuka' CHECK (status IN ('terbuka', 'usul_tutup', 'selesai', 'selesai_catatan')),
  isian TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(isian) AND length(isian) <= 6000),
  ditutup INTEGER,
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  UNIQUE (induk, kab),
  CHECK ((status IN ('selesai', 'selesai_catatan')) = (ditutup IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS lj_berkas_status ON lj_berkas (status, ditutup);
CREATE INDEX IF NOT EXISTS lj_berkas_kejadian ON lj_berkas (kejadian_id, kab4);

CREATE TABLE IF NOT EXISTS lj_tim (
  berkas TEXT NOT NULL REFERENCES lj_berkas (id),
  wa TEXT NOT NULL CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  nama TEXT CHECK (nama IS NULL OR length(nama) BETWEEN 1 AND 120),
  peran TEXT NOT NULL CHECK (peran IN ('ketua', 'anggota')),
  token_sha TEXT UNIQUE CHECK (token_sha IS NULL OR (length(token_sha) = 64 AND token_sha NOT GLOB '*[^0-9a-f]*')),
  kedaluwarsa INTEGER,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 200),
  dibuat INTEGER NOT NULL,
  dicabut INTEGER CHECK (dicabut IS NULL OR dicabut >= dibuat),
  PRIMARY KEY (berkas, wa),
  CHECK ((token_sha IS NULL) = (kedaluwarsa IS NULL))
);
CREATE INDEX IF NOT EXISTS lj_tim_wa ON lj_tim (wa, dicabut);

CREATE TABLE IF NOT EXISTS lj_objek (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  berkas TEXT NOT NULL REFERENCES lj_berkas (id),
  jenis TEXT NOT NULL CHECK (jenis IN ('rumah', 'prasarana', 'titik', 'jiwa', 'korban', 'usaha', 'kebutuhan')),
  urut INTEGER NOT NULL CHECK (urut >= 1),
  data TEXT NOT NULL CHECK (json_valid(data) AND length(data) <= 4000),
  pribadi TEXT CHECK (pribadi IS NULL OR (json_valid(pribadi) AND length(pribadi) <= 2000)),
  titik_id TEXT CHECK (titik_id IS NULL OR titik_id GLOB 'TP-????????'),
  desa TEXT CHECK (desa IS NULL OR length(desa) <= 120),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'batal')),
  klien_id TEXT UNIQUE CHECK (klien_id IS NULL OR (length(klien_id) BETWEEN 8 AND 64 AND klien_id NOT GLOB '*[^0-9A-Za-z_-]*')),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 200),
  rev INTEGER NOT NULL DEFAULT 0 CHECK (rev >= 0),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  UNIQUE (berkas, jenis, urut),
  CHECK ((lat IS NULL) = (lon IS NULL))
);
CREATE INDEX IF NOT EXISTS lj_objek_berkas ON lj_objek (berkas, jenis, status);
CREATE INDEX IF NOT EXISTS lj_objek_titik ON lj_objek (titik_id);

CREATE TABLE IF NOT EXISTS lj_jejak (
  id INTEGER PRIMARY KEY,
  berkas TEXT NOT NULL,
  objek TEXT,
  aksi TEXT NOT NULL CHECK (length(aksi) BETWEEN 2 AND 40),
  sebelum TEXT CHECK (sebelum IS NULL OR length(sebelum) <= 6000),
  sesudah TEXT CHECK (sesudah IS NULL OR length(sesudah) <= 6000),
  pribadi_sidik TEXT CHECK (pribadi_sidik IS NULL OR length(pribadi_sidik) = 64),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 200),
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lj_jejak_berkas ON lj_jejak (berkas, id);

CREATE TABLE IF NOT EXISTS lj_media (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  objek TEXT NOT NULL REFERENCES lj_objek (id),
  kunci_r2 TEXT NOT NULL CHECK (kunci_r2 GLOB 'lapor/data/*'),
  jenis TEXT NOT NULL CHECK (jenis IN ('foto', 'video', 'wajah', 'dokumen')),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  akurasi REAL,
  waktu_ambil INTEGER,
  waktu_terima INTEGER NOT NULL,
  lencana TEXT NOT NULL CHECK (lencana IN ('gps', 'exif', 'wa', 'tanpa')),
  pintu TEXT NOT NULL CHECK (pintu IN ('wa', 'web')),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 200),
  CHECK ((lat IS NULL) = (lon IS NULL))
);
CREATE INDEX IF NOT EXISTS lj_media_objek ON lj_media (objek);

CREATE TABLE IF NOT EXISTS lj_tanya (
  berkas TEXT NOT NULL,
  tgl TEXT NOT NULL CHECK (length(tgl) = 10 AND tgl GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  jawab TEXT CHECK (jawab IS NULL OR jawab IN ('masih', 'selesai')),
  waktu INTEGER NOT NULL,
  PRIMARY KEY (berkas, tgl)
);

CREATE TABLE IF NOT EXISTS lj_kabar (
  id INTEGER PRIMARY KEY,
  wa TEXT NOT NULL CHECK (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*'),
  jenis TEXT NOT NULL CHECK (jenis IN ('pembuka', 'harian', 'tim', 'tutup')),
  teks TEXT NOT NULL CHECK (length(teks) BETWEEN 1 AND 2000),
  dibuat INTEGER NOT NULL,
  terkirim INTEGER
);
CREATE INDEX IF NOT EXISTS lj_kabar_antre ON lj_kabar (terkirim, id);

CREATE TABLE IF NOT EXISTS lj_beku (
  berkas TEXT NOT NULL,
  versi INTEGER NOT NULL CHECK (versi >= 1),
  isi TEXT NOT NULL CHECK (json_valid(isi)),
  sidik TEXT NOT NULL CHECK (length(sidik) = 64 AND sidik NOT GLOB '*[^0-9a-f]*'),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 200),
  waktu INTEGER NOT NULL,
  PRIMARY KEY (berkas, versi)
);

CREATE TABLE IF NOT EXISTS lj_akses (
  id INTEGER PRIMARY KEY,
  berkas TEXT NOT NULL,
  objek TEXT,
  aksi TEXT NOT NULL CHECK (aksi IN ('buka', 'tampil_pribadi', 'media')),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 200),
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS lj_akses_berkas ON lj_akses (berkas, waktu);
