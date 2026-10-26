-- SIPPA inti (PRD §9.7.2; DESAIN-TEKNIS §3.2; nomor 0056 karena 0055 = uji_lapangan). Idempoten. Waktu = ms epoch UTC. Pemilik program BNPB, keputusan pemilik 24 Okt 2026.

CREATE TABLE IF NOT EXISTS sippa_kit (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  kode TEXT NOT NULL UNIQUE CHECK (kode GLOB 'SIPPA-[0-9][0-9][0-9]'),
  jenis TEXT NOT NULL CHECK (jenis IN ('gambut', 'mineral', 'banjir', 'pinjam_pilot')),
  status TEXT NOT NULL DEFAULT 'gudang' CHECK (status IN ('gudang', 'depot', 'gelar', 'banjir', 'servis', 'hilang', 'pensiun')),
  lokasi TEXT CHECK (lokasi IS NULL OR length(lokasi) <= 120),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  prov TEXT CHECK (prov IS NULL OR (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*')),
  kab TEXT CHECK (kab IS NULL OR length(kab) <= 60),
  pemilik_asal TEXT NOT NULL DEFAULT 'BMN BNPB' CHECK (length(pemilik_asal) BETWEEN 3 AND 80),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 1000),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (dummy = 1 OR kode < 'SIPPA-900')            -- SIPPA-900..999 khusus dummy, tidak pernah bertabrakan dengan kit nyata
);
CREATE INDEX IF NOT EXISTS idx_sippa_kit_status ON sippa_kit (status);

CREATE TABLE IF NOT EXISTS sippa_komponen (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kit_id TEXT NOT NULL REFERENCES sippa_kit (id),
  kode_bom TEXT NOT NULL CHECK (kode_bom GLOB '[A-Z]*-[0-9]*' AND length(kode_bom) <= 12),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 120),
  jumlah REAL NOT NULL CHECK (jumlah > 0 AND jumlah <= 100000),
  satuan TEXT NOT NULL CHECK (satuan IN ('unit', 'm', 'set', 'paket')),
  nomor_seri TEXT CHECK (nomor_seri IS NULL OR length(nomor_seri) <= 60),
  kondisi TEXT NOT NULL DEFAULT 'baik' CHECK (kondisi IN ('baik', 'rusak_ringan', 'rusak_berat', 'hilang')),
  pemilik_asal TEXT CHECK (pemilik_asal IS NULL OR length(pemilik_asal) <= 80),
  alat_id TEXT CHECK (alat_id IS NULL OR length(alat_id) = 16),   -- rujukan lunak ke alat (0031) bila dipinjam instansi
  dicek INTEGER,
  musim_awal INTEGER NOT NULL DEFAULT 1 CHECK (musim_awal IN (0, 1)),  -- 1 = dihitung di penyebut kehilangan musim
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_sippa_komp_kit ON sippa_komponen (kit_id);

-- Transisi sah ditegakkan DI SINI (sumber kebenaran), hak per peran di src/sippa.js. Tabel §6.2.
CREATE TABLE IF NOT EXISTS sippa_gerak (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 OR length(id) = 36),
  kit_id TEXT NOT NULL REFERENCES sippa_kit (id),
  dari_status TEXT NOT NULL,
  ke_status TEXT NOT NULL,
  ke_lokasi TEXT CHECK (ke_lokasi IS NULL OR length(ke_lokasi) <= 120),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  prov TEXT CHECK (prov IS NULL OR length(prov) = 2),
  kab TEXT CHECK (kab IS NULL OR length(kab) <= 60),
  alasan TEXT NOT NULL CHECK (alasan IN ('pra_posisi', 'gelar', 'bongkar', 'pindah_banjir', 'kembali', 'servis', 'hilang', 'ditemukan', 'pensiun', 'koreksi')),
  rencana INTEGER NOT NULL DEFAULT 0 CHECK (rencana IN (0, 1)),
  eta_jam REAL CHECK (eta_jam IS NULL OR eta_jam BETWEEN 0 AND 720),
  tiba INTEGER,
  pengangkut TEXT CHECK (pengangkut IS NULL OR pengangkut IN ('yontp', 'bpbd', 'daops', 'manggala_agni', 'lain')),
  permintaan_dari TEXT CHECK (permintaan_dari IS NULL OR length(permintaan_dari) <= 120),
  tugas_id TEXT CHECK (tugas_id IS NULL OR length(tugas_id) = 16),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (dari_status || '>' || ke_status IN (
    'gudang>depot','gudang>gelar','gudang>banjir','gudang>servis','gudang>hilang','gudang>pensiun',
    'depot>gudang','depot>gelar','depot>banjir','depot>servis','depot>hilang',
    'gelar>gudang','gelar>depot','gelar>banjir','gelar>servis','gelar>hilang',
    'banjir>gudang','banjir>depot','banjir>gelar','banjir>servis','banjir>hilang',
    'servis>gudang','servis>hilang','servis>pensiun',
    'hilang>gudang','hilang>pensiun')),
  CHECK (rencana = 1 OR tiba IS NOT NULL)   -- gerak langsung selalu tiba saat dicatat; rencana diisi tiba belakangan
);
CREATE INDEX IF NOT EXISTS idx_sippa_gerak_kit ON sippa_gerak (kit_id, waktu);
CREATE INDEX IF NOT EXISTS idx_sippa_gerak_buka ON sippa_gerak (kit_id) WHERE tiba IS NULL;

-- dari_status harus status kit SEKARANG dan tidak boleh ada gerak rencana yang masih terbuka (kendali konkurensi optimistis)
CREATE TRIGGER IF NOT EXISTS sippa_gerak_cek BEFORE INSERT ON sippa_gerak
WHEN NEW.dari_status IS NOT (SELECT status FROM sippa_kit WHERE id = NEW.kit_id)
  OR EXISTS (SELECT 1 FROM sippa_gerak WHERE kit_id = NEW.kit_id AND tiba IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'sippa_gerak_cek: status kit sudah berubah atau masih ada gerak terencana yang belum tiba');
END;
-- gerak langsung (tiba terisi) menerapkan status dan lokasi ke kit dalam transaksi yang sama
CREATE TRIGGER IF NOT EXISTS sippa_gerak_terapkan AFTER INSERT ON sippa_gerak
WHEN NEW.tiba IS NOT NULL
BEGIN
  UPDATE sippa_kit SET status = NEW.ke_status, diubah = NEW.waktu,
    lokasi = coalesce(NEW.ke_lokasi, lokasi), lat = coalesce(NEW.lat, lat), lon = coalesce(NEW.lon, lon),
    prov = coalesce(NEW.prov, prov), kab = coalesce(NEW.kab, kab)
  WHERE id = NEW.kit_id;
END;
-- satu-satunya UPDATE sah: mengisi tiba dari NULL; kit harus masih di dari_status
CREATE TRIGGER IF NOT EXISTS sippa_gerak_tetap BEFORE UPDATE ON sippa_gerak
WHEN OLD.tiba IS NOT NULL OR NEW.tiba IS NULL
  OR NEW.id IS NOT OLD.id OR NEW.kit_id IS NOT OLD.kit_id OR NEW.dari_status IS NOT OLD.dari_status OR NEW.ke_status IS NOT OLD.ke_status
  OR NEW.alasan IS NOT OLD.alasan OR NEW.rencana IS NOT OLD.rencana OR NEW.waktu IS NOT OLD.waktu OR NEW.oleh IS NOT OLD.oleh OR NEW.dummy IS NOT OLD.dummy
  OR OLD.dari_status IS NOT (SELECT status FROM sippa_kit WHERE id = OLD.kit_id)
BEGIN
  SELECT RAISE(ABORT, 'sippa_gerak_tetap: sippa_gerak hanya bisa ditambah; satu-satunya ubahan sah adalah tiba dari kosong');
END;
CREATE TRIGGER IF NOT EXISTS sippa_gerak_tiba AFTER UPDATE OF tiba ON sippa_gerak
BEGIN
  UPDATE sippa_kit SET status = NEW.ke_status, diubah = NEW.tiba,
    lokasi = coalesce(NEW.ke_lokasi, lokasi), lat = coalesce(NEW.lat, lat), lon = coalesce(NEW.lon, lon),
    prov = coalesce(NEW.prov, prov), kab = coalesce(NEW.kab, kab)
  WHERE id = NEW.kit_id;
END;
CREATE TRIGGER IF NOT EXISTS sippa_gerak_hapus BEFORE DELETE ON sippa_gerak
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'sippa_gerak_hapus: sippa_gerak hanya bisa ditambah');
END;

CREATE TABLE IF NOT EXISTS sippa_tugas (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kit_id TEXT REFERENCES sippa_kit (id),
  kode_sha TEXT NOT NULL UNIQUE CHECK (length(kode_sha) = 64 AND kode_sha NOT GLOB '*[^0-9a-f]*'),
  nama_regu TEXT NOT NULL CHECK (length(nama_regu) BETWEEN 2 AND 80),
  unsur TEXT NOT NULL CHECK (unsur IN ('manggala_agni', 'bpbd', 'yontp', 'mpa', 'lain')),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  kompleks_id TEXT CHECK (kompleks_id IS NULL OR kompleks_id GLOB 'K[0-9]*'),
  lengan_dalam INTEGER NOT NULL DEFAULT 0 CHECK (lengan_dalam IN (0, 1)),
  mulai INTEGER NOT NULL,
  berakhir INTEGER NOT NULL CHECK (berakhir > mulai AND berakhir - mulai <= 2592000000),
  dicabut INTEGER,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_sippa_tugas_kit ON sippa_tugas (kit_id);

CREATE TABLE IF NOT EXISTS sippa_log_gelar (
  id TEXT PRIMARY KEY CHECK (length(id) = 36 OR length(id) = 16),  -- UUID v4 klien (kirim ulang idempoten) atau 16 heks entri staf
  tugas_id TEXT CHECK (tugas_id IS NULL OR length(tugas_id) = 16),
  kit_id TEXT CHECK (kit_id IS NULL OR length(kit_id) = 16),
  kompleks_id TEXT CHECK (kompleks_id IS NULL OR kompleks_id GLOB 'K[0-9]*'),
  prov TEXT CHECK (prov IS NULL OR length(prov) = 2),
  jenis TEXT NOT NULL CHECK (jenis IN ('karhutla', 'banjir', 'latihan')),
  kelas_medan TEXT CHECK (kelas_medan IS NULL OR kelas_medan IN ('I', 'II', 'III')),
  panjang_m REAL CHECK (panjang_m IS NULL OR panjang_m BETWEEN 0 AND 5000),
  n_orang INTEGER CHECK (n_orang IS NULL OR n_orang BETWEEN 1 AND 300),
  t_tiba INTEGER, t_mulai_gelar INTEGER, t_air_mengalir INTEGER, t_mulai_injeksi INTEGER, t_selesai INTEGER, t_bongkar_selesai INTEGER,
  jam_pompa REAL CHECK (jam_pompa IS NULL OR jam_pompa BETWEEN 0 AND 720),
  bbm_l REAL CHECK (bbm_l IS NULL OR bbm_l BETWEEN 0 AND 20000),
  air_m3 REAL CHECK (air_m3 IS NULL OR air_m3 BETWEEN 0 AND 1000000),
  banjir_m3 REAL CHECK (banjir_m3 IS NULL OR banjir_m3 BETWEEN 0 AND 10000000),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 1000),
  foto_id TEXT CHECK (foto_id IS NULL OR length(foto_id) = 16),
  -- medan vonis pilot "dapat dipakai" (keputusan 53, §5.5.2)
  petak_id TEXT CHECK (petak_id IS NULL OR length(petak_id) BETWEEN 3 AND 40),
  air_sampai_lance INTEGER CHECK (air_sampai_lance IS NULL OR air_sampai_lance IN (0, 1)),
  p_ujung_bar REAL CHECK (p_ujung_bar IS NULL OR p_ujung_bar BETWEEN 0 AND 25),
  p_ujung_menit INTEGER CHECK (p_ujung_menit IS NULL OR p_ujung_menit BETWEEN 0 AND 1440),   -- lama terus-menerus pada >= 2 bar
  p_ujung_sumber TEXT CHECK (p_ujung_sumber IS NULL OR p_ujung_sumber IN ('gauge', 'operator')),
  kecelakaan INTEGER CHECK (kecelakaan IS NULL OR kecelakaan IN (0, 1)),
  bocor_henti_menit INTEGER CHECK (bocor_henti_menit IS NULL OR bocor_henti_menit BETWEEN 0 AND 1440),
  konfigurasi TEXT CHECK (konfigurasi IS NULL OR (json_valid(konfigurasi) AND length(konfigurasi) <= 4096)),  -- masukan hidraulika() kit yang dipakai
  koreksi_dari TEXT CHECK (koreksi_dari IS NULL OR length(koreksi_dari) IN (16, 36)),
  jam_klien_meleset INTEGER NOT NULL DEFAULT 0 CHECK (jam_klien_meleset IN (0, 1)),
  waktu_klien INTEGER NOT NULL,
  diterima INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (oleh GLOB 'tugas:*' OR oleh GLOB 'staf:*' OR length(oleh) = 12),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_sippa_log_kelas ON sippa_log_gelar (jenis, kelas_medan);
CREATE INDEX IF NOT EXISTS idx_sippa_log_kit ON sippa_log_gelar (kit_id, t_tiba);
CREATE TRIGGER IF NOT EXISTS sippa_log_urut BEFORE INSERT ON sippa_log_gelar
WHEN (NEW.t_tiba IS NOT NULL AND NEW.t_mulai_gelar IS NOT NULL AND NEW.t_mulai_gelar < NEW.t_tiba)
  OR (NEW.t_mulai_gelar IS NOT NULL AND NEW.t_air_mengalir IS NOT NULL AND NEW.t_air_mengalir < NEW.t_mulai_gelar)
  OR (NEW.t_air_mengalir IS NOT NULL AND NEW.t_mulai_injeksi IS NOT NULL AND NEW.t_mulai_injeksi < NEW.t_air_mengalir)
  OR (NEW.t_air_mengalir IS NOT NULL AND NEW.t_selesai IS NOT NULL AND NEW.t_selesai < NEW.t_air_mengalir)
  OR (NEW.t_selesai IS NOT NULL AND NEW.t_bongkar_selesai IS NOT NULL AND NEW.t_bongkar_selesai < NEW.t_selesai)
  OR (NEW.t_tiba IS NOT NULL AND NEW.t_air_mengalir IS NOT NULL AND NEW.t_air_mengalir < NEW.t_tiba)
  OR (NEW.t_tiba IS NOT NULL AND NEW.t_mulai_injeksi IS NOT NULL AND NEW.t_mulai_injeksi < NEW.t_tiba)
  OR (NEW.t_tiba IS NOT NULL AND NEW.t_selesai IS NOT NULL AND NEW.t_selesai < NEW.t_tiba)
  OR (NEW.t_tiba IS NOT NULL AND NEW.t_bongkar_selesai IS NOT NULL AND NEW.t_bongkar_selesai < NEW.t_tiba)
  OR (NEW.t_mulai_gelar IS NOT NULL AND NEW.t_mulai_injeksi IS NOT NULL AND NEW.t_mulai_injeksi < NEW.t_mulai_gelar)
  OR (NEW.t_mulai_gelar IS NOT NULL AND NEW.t_selesai IS NOT NULL AND NEW.t_selesai < NEW.t_mulai_gelar)
  OR (NEW.t_mulai_gelar IS NOT NULL AND NEW.t_bongkar_selesai IS NOT NULL AND NEW.t_bongkar_selesai < NEW.t_mulai_gelar)
  OR (NEW.t_air_mengalir IS NOT NULL AND NEW.t_bongkar_selesai IS NOT NULL AND NEW.t_bongkar_selesai < NEW.t_air_mengalir)
  OR (NEW.banjir_m3 IS NOT NULL AND NEW.jenis != 'banjir')
BEGIN
  SELECT RAISE(ABORT, 'sippa_log_urut: urutan waktu tahap terbalik atau banjir_m3 pada jenis selain banjir');
END;
CREATE TRIGGER IF NOT EXISTS sippa_log_tetap BEFORE UPDATE ON sippa_log_gelar
BEGIN
  SELECT RAISE(ABORT, 'sippa_log_tetap: log gelar tidak disunting; koreksi = baris baru dengan koreksi_dari');
END;
CREATE TRIGGER IF NOT EXISTS sippa_log_hapus BEFORE DELETE ON sippa_log_gelar
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'sippa_log_hapus: log gelar hanya bisa ditambah');
END;

CREATE TABLE IF NOT EXISTS sippa_probe (
  id TEXT PRIMARY KEY CHECK (length(id) IN (16, 36)),
  log_id TEXT CHECK (log_id IS NULL OR length(log_id) IN (16, 36)),
  tugas_id TEXT CHECK (tugas_id IS NULL OR length(tugas_id) = 16),
  petak_id TEXT CHECK (petak_id IS NULL OR length(petak_id) BETWEEN 3 AND 40),
  titik TEXT NOT NULL CHECK (length(titik) BETWEEN 1 AND 20),
  tahap TEXT NOT NULL CHECK (tahap IN ('sebelum', 'sesudah', '24j', '72j', '7h', '30h', '90h')),   -- 'sesudah' = segera sesudah injeksi (keputusan 53 butir 5)
  kedalaman_cm INTEGER NOT NULL CHECK (kedalaman_cm IN (10, 30, 50, 100, 150, 300, 400, 500)),
  suhu_c REAL NOT NULL CHECK (suhu_c BETWEEN -10 AND 900),
  waktu INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_sippa_probe_petak ON sippa_probe (petak_id, tahap);

CREATE TABLE IF NOT EXISTS sippa_bbm (
  id TEXT PRIMARY KEY CHECK (length(id) IN (16, 36)),
  kit_id TEXT CHECK (kit_id IS NULL OR length(kit_id) = 16),
  log_id TEXT CHECK (log_id IS NULL OR length(log_id) IN (16, 36)),
  waktu INTEGER NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('bensin', 'solar')),
  aksi TEXT NOT NULL CHECK (aksi IN ('terima', 'keluar', 'kembali', 'koreksi')),
  liter REAL NOT NULL CHECK (liter > 0 AND liter <= 20000),
  operator TEXT CHECK (operator IS NULL OR length(operator) <= 80),
  tiket TEXT CHECK (tiket IS NULL OR length(tiket) <= 40),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE TRIGGER IF NOT EXISTS sippa_bbm_tetap BEFORE UPDATE ON sippa_bbm
BEGIN
  SELECT RAISE(ABORT, 'sippa_bbm_tetap: buku BBM hanya bisa ditambah');
END;
CREATE TRIGGER IF NOT EXISTS sippa_bbm_hapus BEFORE DELETE ON sippa_bbm
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'sippa_bbm_hapus: buku BBM hanya bisa ditambah');
END;

CREATE TABLE IF NOT EXISTS sippa_foto (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  tugas_id TEXT CHECK (tugas_id IS NULL OR length(tugas_id) = 16),
  prov TEXT CHECK (prov IS NULL OR length(prov) = 2),
  mime TEXT NOT NULL CHECK (mime IN ('image/jpeg', 'image/webp')),
  ukuran INTEGER NOT NULL CHECK (ukuran BETWEEN 1 AND 8388608),
  waktu INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);

CREATE TABLE IF NOT EXISTS sippa_jalan_cek (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kompleks_id TEXT NOT NULL CHECK (kompleks_id GLOB 'K[0-9]*'),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  musim TEXT NOT NULL CHECK (musim IN ('kemarau', 'hujan')),
  hasil TEXT NOT NULL CHECK (hasil IN ('lolos', 'gagal')),
  kendaraan TEXT CHECK (kendaraan IS NULL OR kendaraan IN ('pickup_4x4', 'truk', 'motor', 'jalan_kaki', 'perahu')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  foto_id TEXT CHECK (foto_id IS NULL OR length(foto_id) = 16),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_sippa_jalan ON sippa_jalan_cek (kompleks_id, waktu);

CREATE TABLE IF NOT EXISTS sippa_aoi_usul (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kompleks_id TEXT CHECK (kompleks_id IS NULL OR kompleks_id GLOB 'K[0-9]*'),
  sel TEXT CHECK (sel IS NULL OR sel GLOB 's[0-9]*_[0-9]*'),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  alasan TEXT NOT NULL CHECK (length(alasan) BETWEEN 5 AND 500),
  status TEXT NOT NULL DEFAULT 'usul' CHECK (status IN ('usul', 'survei', 'terpilih', 'ditolak')),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (kompleks_id IS NOT NULL OR sel IS NOT NULL)
);
