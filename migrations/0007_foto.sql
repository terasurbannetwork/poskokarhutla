-- Foto & video lapangan: warga mengunggah dari lokasinya (GPS perangkat saat unggah), admin menyetujui sebelum tayang.
-- Berkas di R2 (binding MEDIA): foto/<id>.<ext> dan foto/<id>_t.webp (thumbnail). Waktu = milidetik epoch UTC.
-- Wilayah (prov|kab|kec) dihitung Worker dari koordinat (pusat kecamatan terdekat di dalam poligon provinsi), bukan diketik pengguna.
CREATE TABLE foto (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  jenis TEXT NOT NULL CHECK (jenis IN ('foto', 'video')),
  kategori TEXT NOT NULL CHECK (kategori IN ('api', 'asap', 'padam', 'dampak', 'lainnya')),
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  akurasi INTEGER NOT NULL CHECK (akurasi BETWEEN 0 AND 1000),
  prov TEXT NOT NULL DEFAULT '' CHECK (length(prov) <= 2),
  kab TEXT NOT NULL DEFAULT '' CHECK (length(kab) <= 80),
  kec TEXT NOT NULL DEFAULT '' CHECK (length(kec) <= 80),
  keterangan TEXT NOT NULL DEFAULT '' CHECK (length(keterangan) <= 280),
  nama TEXT NOT NULL DEFAULT '' CHECK (length(nama) <= 60),
  tampil_nama INTEGER NOT NULL DEFAULT 0 CHECK (tampil_nama IN (0, 1)),
  email TEXT NOT NULL DEFAULT '' CHECK (email = '' OR (length(email) BETWEEN 6 AND 254 AND email GLOB '?*@?*.?*' AND email NOT GLOB '*[ <>]*')),
  -- waktu pengambilan: dari EXIF bila ada (exif_waktu = 1), selain itu waktu unggah
  diambil INTEGER NOT NULL,
  dibuat INTEGER NOT NULL,
  exif_waktu INTEGER NOT NULL DEFAULT 0 CHECK (exif_waktu IN (0, 1)),
  -- jarak GPS di EXIF ke GPS perangkat (meter); NULL = foto tanpa GPS EXIF (umum: iOS membuangnya)
  exif_jarak INTEGER CHECK (exif_jarak IS NULL OR exif_jarak >= 0),
  kamera INTEGER NOT NULL DEFAULT 0 CHECK (kamera IN (0, 1)),        -- 1 = diambil langsung lewat kamera, bukan galeri
  ukuran INTEGER NOT NULL CHECK (ukuran BETWEEN 1 AND 31457280),
  durasi REAL,
  mime TEXT NOT NULL CHECK (mime IN ('image/webp', 'image/jpeg', 'video/mp4', 'video/webm', 'video/quicktime')),
  status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'tayang', 'ditolak')),
  alasan TEXT NOT NULL DEFAULT '' CHECK (length(alasan) <= 200),
  suka INTEGER NOT NULL DEFAULT 0 CHECK (suka >= 0),
  komentar INTEGER NOT NULL DEFAULT 0 CHECK (komentar >= 0),
  aduan INTEGER NOT NULL DEFAULT 0 CHECK (aduan >= 0),
  ip_hash TEXT NOT NULL CHECK (length(ip_hash) = 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK ((jenis = 'video') = (mime GLOB 'video/*')),
  CHECK (jenis = 'foto' OR coalesce(durasi, 0) BETWEEN 0.1 AND 61),   -- coalesce: CHECK dengan NULL lolos diam-diam
  CHECK (jenis = 'video' OR durasi IS NULL),
  CHECK (tampil_nama = 0 OR length(trim(nama)) > 0),
  CHECK (diambil <= dibuat + 600000)
);
CREATE INDEX foto_status ON foto (status, dibuat);
CREATE INDEX foto_ip ON foto (ip_hash, dibuat);

CREATE TABLE foto_suka (
  foto_id TEXT NOT NULL REFERENCES foto(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL CHECK (length(ip_hash) = 64),
  waktu INTEGER NOT NULL,
  PRIMARY KEY (foto_id, ip_hash)
);
CREATE TRIGGER foto_suka_tambah AFTER INSERT ON foto_suka BEGIN
  UPDATE foto SET suka = (SELECT count(*) FROM foto_suka WHERE foto_id = NEW.foto_id) WHERE id = NEW.foto_id; END;
CREATE TRIGGER foto_suka_hapus AFTER DELETE ON foto_suka BEGIN
  UPDATE foto SET suka = (SELECT count(*) FROM foto_suka WHERE foto_id = OLD.foto_id) WHERE id = OLD.foto_id; END;
-- suka hanya untuk yang tayang
CREATE TRIGGER foto_suka_tayang BEFORE INSERT ON foto_suka WHEN (SELECT status FROM foto WHERE id = NEW.foto_id) IS NOT 'tayang'
BEGIN SELECT RAISE(ABORT, 'foto belum tayang'); END;

-- Komentar langsung tayang; 3 aduan dari IP berbeda = disembunyikan (trigger). Hitungan di foto.komentar = yang tampil.
CREATE TABLE foto_komentar (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  foto_id TEXT NOT NULL REFERENCES foto(id) ON DELETE CASCADE,
  nama TEXT NOT NULL DEFAULT '' CHECK (length(nama) <= 60),
  teks TEXT NOT NULL CHECK (length(trim(teks)) BETWEEN 1 AND 500),
  dibuat INTEGER NOT NULL,
  disembunyikan INTEGER NOT NULL DEFAULT 0 CHECK (disembunyikan IN (0, 1)),
  aduan INTEGER NOT NULL DEFAULT 0 CHECK (aduan >= 0),
  ip_hash TEXT NOT NULL CHECK (length(ip_hash) = 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX foto_komentar_foto ON foto_komentar (foto_id, dibuat);
CREATE TRIGGER foto_komentar_tayang BEFORE INSERT ON foto_komentar WHEN (SELECT status FROM foto WHERE id = NEW.foto_id) IS NOT 'tayang'
BEGIN SELECT RAISE(ABORT, 'foto belum tayang'); END;
CREATE TRIGGER foto_komentar_hitung AFTER INSERT ON foto_komentar BEGIN
  UPDATE foto SET komentar = (SELECT count(*) FROM foto_komentar WHERE foto_id = NEW.foto_id AND disembunyikan = 0) WHERE id = NEW.foto_id; END;
CREATE TRIGGER foto_komentar_ubah AFTER UPDATE OF disembunyikan ON foto_komentar BEGIN
  UPDATE foto SET komentar = (SELECT count(*) FROM foto_komentar WHERE foto_id = NEW.foto_id AND disembunyikan = 0) WHERE id = NEW.foto_id; END;
CREATE TRIGGER foto_komentar_hapus AFTER DELETE ON foto_komentar BEGIN
  UPDATE foto SET komentar = (SELECT count(*) FROM foto_komentar WHERE foto_id = OLD.foto_id AND disembunyikan = 0) WHERE id = OLD.foto_id; END;

-- Aduan untuk foto (target = id foto) atau komentar (target = id komentar); satu per IP per target.
CREATE TABLE foto_aduan (
  target TEXT NOT NULL CHECK (length(target) = 16),
  jenis TEXT NOT NULL CHECK (jenis IN ('foto', 'komentar')),
  ip_hash TEXT NOT NULL CHECK (length(ip_hash) = 64),
  alasan TEXT NOT NULL CHECK (alasan IN ('tidak_relevan', 'palsu', 'kasar', 'pribadi', 'lainnya')),
  waktu INTEGER NOT NULL,
  PRIMARY KEY (target, ip_hash)
);
-- foto yang diadukan 3 kali kembali ke antrean admin (tidak dihapus); komentar 3 aduan disembunyikan
CREATE TRIGGER foto_aduan_tambah AFTER INSERT ON foto_aduan BEGIN
  UPDATE foto SET aduan = (SELECT count(*) FROM foto_aduan WHERE target = NEW.target),
    status = CASE WHEN (SELECT count(*) FROM foto_aduan WHERE target = NEW.target) >= 3 THEN 'menunggu' ELSE status END
  WHERE NEW.jenis = 'foto' AND id = NEW.target;
  UPDATE foto_komentar SET aduan = (SELECT count(*) FROM foto_aduan WHERE target = NEW.target),
    disembunyikan = CASE WHEN (SELECT count(*) FROM foto_aduan WHERE target = NEW.target) >= 3 THEN 1 ELSE disembunyikan END
  WHERE NEW.jenis = 'komentar' AND id = NEW.target;
END;

-- Jejak audit keputusan admin atas foto/komentar: hanya boleh ditambah.
CREATE TABLE audit_foto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  waktu INTEGER NOT NULL,
  moderator TEXT NOT NULL CHECK (length(moderator) = 12 AND moderator NOT GLOB '*[^0-9a-f]*'),
  aksi TEXT NOT NULL CHECK (aksi IN ('setujui', 'tolak', 'hapus', 'sembunyikan_komentar', 'tampilkan_komentar', 'isi_dummy', 'hapus_dummy')),
  target TEXT NOT NULL,
  alasan TEXT NOT NULL DEFAULT '' CHECK (length(alasan) <= 200)
);
CREATE TRIGGER audit_foto_ubah BEFORE UPDATE ON audit_foto BEGIN SELECT RAISE(ABORT, 'audit foto tidak boleh diubah'); END;
CREATE TRIGGER audit_foto_hapus BEFORE DELETE ON audit_foto BEGIN SELECT RAISE(ABORT, 'audit foto tidak boleh dihapus'); END;

-- Jejak laju unggah/komentar/suka/aduan per hash IP (tabel jejak lama punya CHECK aksi yang tidak bisa diubah).
CREATE TABLE foto_laju (
  ip_hash TEXT NOT NULL CHECK (length(ip_hash) = 64),
  aksi TEXT NOT NULL CHECK (aksi IN ('unggah', 'komentar', 'suka', 'aduan')),
  waktu INTEGER NOT NULL
);
CREATE INDEX foto_laju_ip ON foto_laju (ip_hash, aksi, waktu);
