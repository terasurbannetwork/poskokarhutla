-- Akun Instansi & Tugas Api (src/instansi.js). Waktu = ms epoch UTC. Idempoten (IF NOT EXISTS). Tabel baru; tidak menyentuh stat_hari.
-- Daftar tetap (jenis, status, hasil, bantuan, kendala) HARUS sama dengan src/instansi.js dan public/instansi.js; tests/warga/instansi.test.mjs menjaganya.
-- Batas laju memakai laju_bnpb (0022): CHECK aksi-nya longgar, jadi tidak perlu membangun ulang laju_posko.

-- Akun instansi: dibuat massal oleh admin (belum_klaim), diklaim wakil lewat verifikasi, diputus admin. Sandi acak 16 huruf; yang disimpan hanya
-- sha256(garam + sandi). wajib_ganti = 1: sandi awal (CSV admin) atau hasil reset masih diketahui admin, jadi akun aktif WAJIB membuat sandi baru (acak, tampil sekali ke pengguna) sebelum memakai rute lain. cakupan = larik kode provinsi BPS (kab/kota: satu provinsi; pemprov/polda: satu; kodam: beberapa), dijaga trigger.
CREATE TABLE IF NOT EXISTS instansi_akun (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  username TEXT NOT NULL UNIQUE CHECK (length(username) BETWEEN 5 AND 60 AND username NOT GLOB '*[^a-z0-9]*'),
  jenis TEXT NOT NULL CHECK (jenis IN ('pemprov', 'pemkab', 'pemkot', 'polda', 'polres', 'kodam', 'kodim')),
  tingkat TEXT NOT NULL CHECK (tingkat IN ('prov', 'kab')),
  wilayah TEXT NOT NULL CHECK (length(wilayah) BETWEEN 2 AND 100),
  kunci_wilayah TEXT NOT NULL CHECK (length(kunci_wilayah) BETWEEN 2 AND 100),
  cakupan TEXT NOT NULL CHECK (json_valid(cakupan) AND json_type(cakupan) = 'array' AND json_array_length(cakupan) BETWEEN 1 AND 6),
  prov TEXT CHECK (prov IS NULL OR (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*')),
  kab TEXT CHECK (kab IS NULL OR length(kab) BETWEEN 2 AND 60),
  garam TEXT NOT NULL CHECK (length(garam) = 32),
  sandi_sha TEXT NOT NULL CHECK (length(sandi_sha) = 64 AND sandi_sha NOT GLOB '*[^0-9a-f]*'),
  status TEXT NOT NULL DEFAULT 'belum_klaim' CHECK (status IN ('belum_klaim', 'menunggu', 'aktif', 'ditolak', 'dicabut')),
  alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 300),
  nama TEXT CHECK (nama IS NULL OR length(nama) BETWEEN 2 AND 100),
  nip TEXT CHECK (nip IS NULL OR length(nip) BETWEEN 5 AND 30),
  pangkat TEXT CHECK (pangkat IS NULL OR length(pangkat) <= 60),
  jabatan TEXT CHECK (jabatan IS NULL OR length(jabatan) BETWEEN 2 AND 100),
  unit TEXT CHECK (unit IS NULL OR length(unit) BETWEEN 2 AND 120),
  email TEXT CHECK (email IS NULL OR (length(email) BETWEEN 6 AND 254 AND email LIKE '_%@_%.__%' AND email NOT GLOB '*[ <>,;"]*')),
  wa TEXT CHECK (wa IS NULL OR (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*')),
  telepon_kantor TEXT CHECK (telepon_kantor IS NULL OR (length(telepon_kantor) BETWEEN 5 AND 20 AND telepon_kantor NOT GLOB '*[^0-9+ -]*')),
  surat INTEGER NOT NULL DEFAULT 0 CHECK (surat IN (0, 1)),
  kartu INTEGER NOT NULL DEFAULT 0 CHECK (kartu IN (0, 1)),
  dikirim INTEGER,
  diputus INTEGER,
  oleh TEXT,
  wajib_ganti INTEGER NOT NULL DEFAULT 1 CHECK (wajib_ganti IN (0, 1)),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (jenis, kunci_wilayah),
  CHECK ((tingkat = 'kab') = (kab IS NOT NULL AND prov IS NOT NULL) OR (tingkat = 'prov' AND kab IS NULL)),
  CHECK (status IN ('belum_klaim', 'dicabut', 'ditolak') OR (nama IS NOT NULL AND nip IS NOT NULL AND jabatan IS NOT NULL AND unit IS NOT NULL
    AND email IS NOT NULL AND wa IS NOT NULL AND surat = 1 AND kartu = 1)),
  CHECK (status != 'ditolak' OR alasan IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS instansi_akun_status ON instansi_akun (status, jenis);
CREATE INDEX IF NOT EXISTS instansi_akun_wilayah ON instansi_akun (tingkat, prov, kab);

-- CHECK tidak boleh berisi subquery: isi larik cakupan dijaga trigger (kode provinsi 2 digit, tanpa duplikat).
CREATE TRIGGER IF NOT EXISTS instansi_cakupan_sah BEFORE INSERT ON instansi_akun
WHEN EXISTS (SELECT 1 FROM json_each(NEW.cakupan) WHERE typeof(value) != 'text' OR length(value) != 2 OR value GLOB '*[^0-9]*')
  OR json_array_length(NEW.cakupan) != (SELECT count(DISTINCT value) FROM json_each(NEW.cakupan))
BEGIN
  SELECT RAISE(ABORT, 'cakupan akun instansi tidak sah atau berulang');
END;

-- Sesi: hanya sha256 token yang disimpan; kedaluwarsa 30 hari; cabut/reset sandi menghapus semua sesi akun.
CREATE TABLE IF NOT EXISTS instansi_sesi (
  token_sha TEXT PRIMARY KEY CHECK (length(token_sha) = 64 AND token_sha NOT GLOB '*[^0-9a-f]*'),
  akun_id TEXT NOT NULL REFERENCES instansi_akun (id) ON DELETE CASCADE,
  dibuat INTEGER NOT NULL,
  kedaluwarsa INTEGER NOT NULL CHECK (kedaluwarsa > dibuat)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS instansi_sesi_akun ON instansi_sesi (akun_id);
-- pembersihan cron: DELETE ... WHERE kedaluwarsa <= ?
CREATE INDEX IF NOT EXISTS instansi_sesi_kedaluwarsa ON instansi_sesi (kedaluwarsa);

-- Tugas api per lokasi (kompleks dari public/data/tugas_kompleks.json; id K#### tidak stabil, jadi kunci = lokasi). status turunan "terlambat" dihitung saat dibaca.
-- konfirmasi_pada terisi = langkah 1 selesai. isian_terakhir = waktu isian terakhir (acuan tenggat kabar 24 jam). rekomendasi = JSON dari orkestrator (<= 3000 huruf).
CREATE TABLE IF NOT EXISTS tugas_api (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  kec TEXT CHECK (kec IS NULL OR length(kec) BETWEEN 1 AND 60),
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  level INTEGER NOT NULL CHECK (level BETWEEN 0 AND 9),
  n24 INTEGER NOT NULL DEFAULT 0 CHECK (n24 >= 0),
  luas_ha REAL CHECK (luas_ha IS NULL OR luas_ha >= 0),
  dibuat INTEGER NOT NULL,
  terakhir_terdeteksi INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'buka' CHECK (status IN ('buka', 'padam', 'bukan_api')),
  konfirmasi_pada INTEGER,
  isian_terakhir INTEGER,
  rekomendasi TEXT CHECK (rekomendasi IS NULL OR (json_valid(rekomendasi) AND length(rekomendasi) <= 3000)),
  -- akses = salinan kunci saudara `akses` di tugas_kompleks.json (jalan terdekat, jalan kaki, pangkalan asal, barang dipikul); kartu akses dan checklist persiapan membacanya. <= 1500 huruf.
  akses TEXT CHECK (akses IS NULL OR (json_valid(akses) AND length(akses) <= 1500)),
  -- verifikasi padam (src/instansi.js verifikasiPadam): status tetap 'padam'; padam_verif menandai pemeriksaan satelit sesudahnya.
  -- padam_dilaporkan = baru dilaporkan padam (padam_pada); padam_terverifikasi = tanpa titik panas baru dalam 2 km selama 48 jam; muncul_lagi = ada titik baru, tugas dibuka kembali (status 'buka').
  padam_verif TEXT CHECK (padam_verif IS NULL OR padam_verif IN ('padam_dilaporkan', 'padam_terverifikasi', 'muncul_lagi')),
  padam_pada INTEGER,
  verif_pada INTEGER,
  cek_ulang_pada INTEGER,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS tugas_api_wilayah ON tugas_api (status, prov, kab);
-- retensi 180 hari: WHERE dibuat <= ?
CREATE INDEX IF NOT EXISTS tugas_api_dibuat ON tugas_api (dibuat);

-- Isian: langkah 'konfirmasi' (GPS + hasil + PIC lapangan wajib) dan 'tindakan' (tindakan + status api wajib). Tiap isian membawa akun pengisi.
-- (akun_id, tugas_id, klien_id) unik: kirim ulang yang sama ke tugas yang sama tidak menggandakan baris; klien_id yang sama di tugas lain isian baru.
CREATE TABLE IF NOT EXISTS tugas_isian (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  tugas_id TEXT NOT NULL REFERENCES tugas_api (id) ON DELETE CASCADE,
  akun_id TEXT NOT NULL REFERENCES instansi_akun (id),
  klien_id TEXT NOT NULL CHECK (length(klien_id) BETWEEN 8 AND 40),
  langkah TEXT NOT NULL CHECK (langkah IN ('konfirmasi', 'tindakan')),
  dibuat INTEGER NOT NULL,
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  akurasi REAL CHECK (akurasi IS NULL OR (akurasi >= 0 AND akurasi <= 1000)),
  waktu_gps INTEGER,
  jarak_km REAL CHECK (jarak_km IS NULL OR jarak_km >= 0),
  gps_curiga TEXT CHECK (gps_curiga IS NULL OR length(gps_curiga) <= 600),
  personel_terlihat INTEGER CHECK (personel_terlihat IS NULL OR personel_terlihat BETWEEN 0 AND 5000),
  hasil TEXT CHECK (hasil IS NULL OR hasil IN ('api_ada', 'bukan_api', 'sudah_padam')),
  pic_nama TEXT CHECK (pic_nama IS NULL OR length(pic_nama) BETWEEN 2 AND 80),
  pic_jabatan TEXT CHECK (pic_jabatan IS NULL OR length(pic_jabatan) BETWEEN 2 AND 80),
  pic_wa TEXT CHECK (pic_wa IS NULL OR (length(pic_wa) BETWEEN 10 AND 15 AND pic_wa GLOB '62[0-9]*' AND pic_wa NOT GLOB '*[^0-9]*')),
  tindakan TEXT CHECK (tindakan IS NULL OR length(tindakan) BETWEEN 2 AND 1000),
  kendala TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(kendala) AND json_type(kendala) = 'array' AND json_array_length(kendala) <= 6),
  kendala_lain TEXT CHECK (kendala_lain IS NULL OR length(kendala_lain) <= 300),
  bantuan TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(bantuan) AND json_type(bantuan) = 'array' AND json_array_length(bantuan) <= 7),
  bantuan_lain TEXT CHECK (bantuan_lain IS NULL OR length(bantuan_lain) <= 300),
  personel INTEGER CHECK (personel IS NULL OR personel BETWEEN 0 AND 5000),
  luas_ha REAL CHECK (luas_ha IS NULL OR (luas_ha >= 0 AND luas_ha <= 100000)),
  padam_ha REAL CHECK (padam_ha IS NULL OR (padam_ha >= 0 AND padam_ha <= 100000)),
  status_api TEXT CHECK (status_api IS NULL OR status_api IN ('menyala', 'bara', 'padam')),
  mulai_padam INTEGER,
  regu INTEGER CHECK (regu IS NULL OR regu BETWEEN 0 AND 500),
  personel_unsur TEXT CHECK (personel_unsur IS NULL OR (json_valid(personel_unsur) AND json_type(personel_unsur) = 'object' AND length(personel_unsur) <= 400)),
  alat_dipakai TEXT CHECK (alat_dipakai IS NULL OR (json_valid(alat_dipakai) AND json_type(alat_dipakai) = 'object' AND length(alat_dipakai) <= 400)),
  kedalaman_bara_cm INTEGER CHECK (kedalaman_bara_cm IS NULL OR kedalaman_bara_cm BETWEEN 0 AND 300),
  lahan_teramati TEXT CHECK (lahan_teramati IS NULL OR lahan_teramati IN ('gambut', 'mineral', 'campuran', 'tidak_tahu')),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (akun_id, tugas_id, klien_id),
  CHECK (langkah != 'konfirmasi' OR (hasil IS NOT NULL AND pic_nama IS NOT NULL AND pic_jabatan IS NOT NULL AND pic_wa IS NOT NULL AND lat IS NOT NULL AND lon IS NOT NULL AND waktu_gps IS NOT NULL)),
  CHECK (langkah != 'tindakan' OR status_api IS NOT NULL),
  CHECK (lat IS NULL OR lon IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS tugas_isian_tugas ON tugas_isian (tugas_id, dibuat);
CREATE INDEX IF NOT EXISTS tugas_isian_akun ON tugas_isian (akun_id, dibuat);
-- Satu konfirmasi per tugas (yang pertama menang); dua penulis serentak: yang kalah gagal oleh indeks ini.
CREATE UNIQUE INDEX IF NOT EXISTS tugas_isian_satu_konfirmasi ON tugas_isian (tugas_id) WHERE langkah = 'konfirmasi';

-- Isi larik kendala dan bantuan dijaga trigger (CHECK tanpa subquery): hanya kode tetap, tanpa duplikat.
CREATE TRIGGER IF NOT EXISTS tugas_isian_larik_sah BEFORE INSERT ON tugas_isian
WHEN EXISTS (SELECT 1 FROM json_each(NEW.kendala) WHERE value NOT IN ('air_jauh', 'akses_sulit_rawa', 'roda_empat_sulit', 'air_tidak_cukup', 'asap_tebal', 'angin_kencang'))
  OR json_array_length(NEW.kendala) != (SELECT count(DISTINCT value) FROM json_each(NEW.kendala))
  OR EXISTS (SELECT 1 FROM json_each(NEW.bantuan) WHERE value NOT IN ('personel', 'air_pompa', 'alat_berat', 'heli_water_bombing', 'logistik', 'medis', 'lainnya'))
  OR json_array_length(NEW.bantuan) != (SELECT count(DISTINCT value) FROM json_each(NEW.bantuan))
BEGIN
  SELECT RAISE(ABORT, 'kendala atau bantuan tidak sah atau berulang');
END;

-- Media (foto dan video) per isian: satu isian boleh 1-10 berkas. Diunggah per berkas dulu (isian_id NULL), lalu isian merujuk larik id. Berkas di R2: instansi/media/<id> dan <id>_t.
-- waktu_ambil = waktu EXIF tervalidasi, lalu waktu GPS perangkat, lalu waktu unggah (sumber_waktu mencatat yang dipakai). orang_terdeteksi = hitungan mesin (Workers AI), NULL bila AI tidak ada atau gagal;
-- untuk video = maksimum dari tiga bingkai (orang_bingkai menyimpan angka tiap bingkai). orang_sumber: foto dihitung dari thumbnail yang DISIMPAN server; video dari bingkai kiriman peramban (tidak bisa dibuktikan server). Ini perkiraan batas bawah, bukan sensus.
CREATE TABLE IF NOT EXISTS instansi_media (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  akun_id TEXT NOT NULL REFERENCES instansi_akun (id),
  tugas_id TEXT NOT NULL REFERENCES tugas_api (id) ON DELETE CASCADE,
  isian_id TEXT REFERENCES tugas_isian (id) ON DELETE CASCADE,
  jenis TEXT NOT NULL CHECK (jenis IN ('foto', 'video')),
  mime TEXT NOT NULL CHECK (mime IN ('image/jpeg', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm')),
  ukuran INTEGER NOT NULL CHECK (ukuran > 0),
  durasi REAL CHECK (durasi IS NULL OR (durasi > 0 AND durasi <= 60.5)),
  waktu_ambil INTEGER NOT NULL,
  sumber_waktu TEXT NOT NULL CHECK (sumber_waktu IN ('exif', 'gps', 'unggah')),
  exif_jarak INTEGER CHECK (exif_jarak IS NULL OR exif_jarak >= 0),
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  akurasi REAL CHECK (akurasi IS NULL OR (akurasi >= 0 AND akurasi <= 1000)),
  waktu_gps INTEGER NOT NULL,
  jarak_km REAL CHECK (jarak_km IS NULL OR jarak_km >= 0),
  gps_curiga TEXT CHECK (gps_curiga IS NULL OR length(gps_curiga) <= 600),
  orang_terdeteksi INTEGER CHECK (orang_terdeteksi IS NULL OR orang_terdeteksi BETWEEN 0 AND 1000),
  orang_sumber TEXT CHECK (orang_sumber IS NULL OR orang_sumber IN ('thumbnail', 'bingkai_klien')),
  orang_bingkai TEXT CHECK (orang_bingkai IS NULL OR (json_valid(orang_bingkai) AND json_type(orang_bingkai) = 'array' AND json_array_length(orang_bingkai) <= 3)),
  -- metadata EXIF yang dibaca peramban dari berkas ASLI (berkas yang disimpan tetap tanpa EXIF, media_bersih.js): waktu DateTimeOriginal (ms), GPS foto, kamera = 1 bila diambil langsung lewat kamera (bukan galeri),
  -- exif_api_km = jarak GPS EXIF ke titik api (exif_jarak di atas = jarak GPS EXIF ke GPS perangkat, meter)
  exif_waktu INTEGER,
  exif_lat REAL CHECK (exif_lat IS NULL OR exif_lat BETWEEN -90 AND 90),
  exif_lon REAL CHECK (exif_lon IS NULL OR exif_lon BETWEEN -180 AND 180),
  kamera INTEGER NOT NULL DEFAULT 0 CHECK (kamera IN (0, 1)),
  exif_api_km REAL CHECK (exif_api_km IS NULL OR exif_api_km >= 0),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK ((jenis = 'video') = (durasi IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS instansi_media_isian ON instansi_media (isian_id, waktu_ambil);
CREATE INDEX IF NOT EXISTS instansi_media_tugas ON instansi_media (tugas_id, waktu_ambil);
CREATE INDEX IF NOT EXISTS instansi_media_akun ON instansi_media (akun_id, dibuat);

-- personel_unsur: kunci tetap per unsur, nilai bilangan bulat 0-5000 (total = jumlahnya, dihitung Worker dan diturunkan ke kolom personel);
-- alat_dipakai: kunci tetap, nilai bilangan bulat 0-100000. CHECK tanpa subquery, jadi isi objek dijaga trigger seperti kendala.
CREATE TRIGGER IF NOT EXISTS tugas_isian_unsur_sah BEFORE INSERT ON tugas_isian
WHEN EXISTS (SELECT 1 FROM json_each(NEW.personel_unsur) WHERE key NOT IN ('bpbd', 'tni', 'polri', 'manggala_agni', 'mpa', 'damkar', 'swasta', 'relawan', 'lainnya')
    OR typeof(value) != 'integer' OR value < 0 OR value > 5000)
  OR EXISTS (SELECT 1 FROM json_each(NEW.alat_dipakai) WHERE key NOT IN ('pompa', 'selang_m', 'jet_shooter', 'heli_wb', 'alat_berat', 'drone_termal', 'pembasah_l')
    OR typeof(value) != 'integer' OR value < 0 OR value > 100000 OR (key = 'pembasah_l' AND value > 5000))
BEGIN
  SELECT RAISE(ABORT, 'personel_unsur atau alat_dipakai tidak sah');
END;

-- Usulan PIC perusahaan konsesi dari instansi. Admin (moderator ke atas) menerima: baris di-upsert ke kontak_pt (0018). Kontak tidak pernah keluar di rute publik.
CREATE TABLE IF NOT EXISTS usulan_kontak_pt (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  akun_id TEXT NOT NULL REFERENCES instansi_akun (id),
  tugas_id TEXT REFERENCES tugas_api (id) ON DELETE SET NULL,
  perusahaan_id TEXT NOT NULL CHECK (length(perusahaan_id) BETWEEN 3 AND 80),
  nama_pt TEXT NOT NULL CHECK (length(nama_pt) BETWEEN 2 AND 120),
  kontak TEXT CHECK (kontak IS NULL OR length(kontak) <= 80),
  email TEXT CHECK (email IS NULL OR (length(email) BETWEEN 6 AND 254 AND email LIKE '_%@_%.__%' AND email NOT GLOB '*[ <>,;"]*')),
  wa TEXT CHECK (wa IS NULL OR (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*')),
  telepon TEXT CHECK (telepon IS NULL OR (length(telepon) BETWEEN 5 AND 20 AND telepon NOT GLOB '*[^0-9+ -]*')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'diterima', 'ditolak')),
  alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 300),
  dibuat INTEGER NOT NULL,
  diputus INTEGER,
  oleh TEXT,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (email IS NOT NULL OR wa IS NOT NULL OR telepon IS NOT NULL),
  CHECK (status = 'menunggu' OR diputus IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS usulan_kontak_pt_status ON usulan_kontak_pt (status, dibuat);
-- daftar usulan milik akun
CREATE INDEX IF NOT EXISTS usulan_kontak_pt_akun ON usulan_kontak_pt (akun_id, dibuat);

-- Trigger yang sama untuk UPDATE: isi larik/objek tidak boleh dilonggarkan lewat UPDATE (CHECK tanpa subquery, jadi dijaga trigger).
CREATE TRIGGER IF NOT EXISTS instansi_cakupan_ubah BEFORE UPDATE OF cakupan ON instansi_akun
WHEN EXISTS (SELECT 1 FROM json_each(NEW.cakupan) WHERE typeof(value) != 'text' OR length(value) != 2 OR value GLOB '*[^0-9]*')
  OR json_array_length(NEW.cakupan) != (SELECT count(DISTINCT value) FROM json_each(NEW.cakupan))
BEGIN
  SELECT RAISE(ABORT, 'cakupan akun instansi tidak sah atau berulang');
END;
CREATE TRIGGER IF NOT EXISTS tugas_isian_larik_ubah BEFORE UPDATE OF kendala, bantuan ON tugas_isian
WHEN EXISTS (SELECT 1 FROM json_each(NEW.kendala) WHERE value NOT IN ('air_jauh', 'akses_sulit_rawa', 'roda_empat_sulit', 'air_tidak_cukup', 'asap_tebal', 'angin_kencang'))
  OR json_array_length(NEW.kendala) != (SELECT count(DISTINCT value) FROM json_each(NEW.kendala))
  OR EXISTS (SELECT 1 FROM json_each(NEW.bantuan) WHERE value NOT IN ('personel', 'air_pompa', 'alat_berat', 'heli_water_bombing', 'logistik', 'medis', 'lainnya'))
  OR json_array_length(NEW.bantuan) != (SELECT count(DISTINCT value) FROM json_each(NEW.bantuan))
BEGIN
  SELECT RAISE(ABORT, 'kendala atau bantuan tidak sah atau berulang');
END;
CREATE TRIGGER IF NOT EXISTS tugas_isian_unsur_ubah BEFORE UPDATE OF personel_unsur, alat_dipakai ON tugas_isian
WHEN EXISTS (SELECT 1 FROM json_each(NEW.personel_unsur) WHERE key NOT IN ('bpbd', 'tni', 'polri', 'manggala_agni', 'mpa', 'damkar', 'swasta', 'relawan', 'lainnya')
    OR typeof(value) != 'integer' OR value < 0 OR value > 5000)
  OR EXISTS (SELECT 1 FROM json_each(NEW.alat_dipakai) WHERE key NOT IN ('pompa', 'selang_m', 'jet_shooter', 'heli_wb', 'alat_berat', 'drone_termal', 'pembasah_l')
    OR typeof(value) != 'integer' OR value < 0 OR value > 100000 OR (key = 'pembasah_l' AND value > 5000))
BEGIN
  SELECT RAISE(ABORT, 'personel_unsur atau alat_dipakai tidak sah');
END;

-- Jejak audit aksi admin dan penggantian sandi: hanya menambah (UPDATE dan DELETE ditolak trigger). akun_id kosong untuk aksi massal (jumlah di alasan).
CREATE TABLE IF NOT EXISTS instansi_jejak (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  waktu INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  akun_id TEXT CHECK (akun_id IS NULL OR length(akun_id) = 16),
  aksi TEXT NOT NULL CHECK (aksi IN ('setuju', 'tolak', 'cabut', 'reset', 'ganti_sandi', 'buat_massal', 'terima_usulan', 'tolak_usulan')),
  alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 300)
);
CREATE INDEX IF NOT EXISTS instansi_jejak_akun ON instansi_jejak (akun_id, waktu);
CREATE TRIGGER IF NOT EXISTS instansi_jejak_tetap_ubah BEFORE UPDATE ON instansi_jejak
BEGIN
  SELECT RAISE(ABORT, 'instansi_jejak hanya bisa ditambah');
END;
CREATE TRIGGER IF NOT EXISTS instansi_jejak_tetap_hapus BEFORE DELETE ON instansi_jejak
BEGIN
  SELECT RAISE(ABORT, 'instansi_jejak hanya bisa ditambah');
END;
