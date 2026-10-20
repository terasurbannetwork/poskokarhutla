-- Ruang Posko (src/posko.js): regu lapangan berkode, laporan regu, neraca harian, kontak perusahaan, antrean panggilan, templat paparan.
-- Waktu = ms epoch UTC; tanggal = hari WIB 'YYYY-MM-DD'. Idempoten (IF NOT EXISTS). Tabel baru, tidak menyentuh stat_hari:
-- /admin/posko dan /lapangan tidak dicatat sebagai halaman statistik, jadi CHECK `hal` (peringatan di 0017) tidak berubah.
-- Daftar tetap (unsur, status, kendala, sumber air) HARUS sama dengan src/posko.js dan public/lapangan.js; uji posko.test.mjs menjaganya.

-- Regu: hanya sha256 kode yang disimpan (kode asli ditampilkan sekali ke admin). dicabut terisi = kode ditolak.
CREATE TABLE IF NOT EXISTS regu (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 80),
  unsur TEXT NOT NULL CHECK (unsur IN ('BPBD', 'Manggala Agni', 'TNI', 'Polri', 'MPA', 'Damkar', 'Perusahaan', 'Relawan', 'Lainnya')),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  perusahaan_id TEXT CHECK (perusahaan_id IS NULL OR length(perusahaan_id) BETWEEN 3 AND 80),
  kode_sha TEXT NOT NULL UNIQUE CHECK (length(kode_sha) = 64 AND kode_sha NOT GLOB '*[^0-9a-f]*'),
  dibuat INTEGER NOT NULL,
  dicabut INTEGER CHECK (dicabut IS NULL OR dicabut >= dibuat),
  oleh TEXT,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);

-- Laporan regu. (regu_id, klien_id) unik: kiriman ulang draf offline tidak menggandakan baris.
CREATE TABLE IF NOT EXISTS lapangan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  regu_id TEXT NOT NULL REFERENCES regu (id),
  klien_id TEXT NOT NULL CHECK (length(klien_id) BETWEEN 8 AND 40),
  tgl TEXT NOT NULL CHECK (tgl GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  waktu INTEGER NOT NULL,
  dibuat INTEGER NOT NULL,
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  akurasi REAL CHECK (akurasi IS NULL OR (akurasi >= 0 AND akurasi <= 1000)),
  status TEXT NOT NULL CHECK (status IN ('menyala', 'bara', 'padam', 'tidak_ditemukan')),
  luas_ha REAL CHECK (luas_ha IS NULL OR (luas_ha >= 0 AND luas_ha <= 100000)),
  padam_ha REAL CHECK (padam_ha IS NULL OR (padam_ha >= 0 AND luas_ha IS NOT NULL AND padam_ha <= luas_ha)),
  personel INTEGER CHECK (personel IS NULL OR (personel BETWEEN 0 AND 1000)),
  kendala TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(kendala) AND json_type(kendala) = 'array' AND json_array_length(kendala) <= 6),
  sumber_air TEXT CHECK (sumber_air IS NULL OR sumber_air IN ('sungai', 'kanal', 'embung', 'sumur_bor', 'hidran', 'mobil_tangki', 'tidak_ada', 'lainnya')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  foto INTEGER NOT NULL DEFAULT 0 CHECK (foto IN (0, 1)),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  kompleks_id TEXT CHECK (kompleks_id IS NULL OR length(kompleks_id) BETWEEN 2 AND 12),
  gps_curiga TEXT CHECK (gps_curiga IS NULL OR length(gps_curiga) <= 600),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (regu_id, klien_id)
);
CREATE INDEX IF NOT EXISTS lapangan_hari ON lapangan (tgl, prov, kab);
CREATE INDEX IF NOT EXISTS lapangan_regu ON lapangan (regu_id, dibuat);

-- CHECK tidak boleh berisi subquery, jadi isi larik kendala dijaga trigger: hanya enam kendala tetap, tanpa duplikat.
CREATE TRIGGER IF NOT EXISTS lapangan_kendala_sah BEFORE INSERT ON lapangan
WHEN EXISTS (SELECT 1 FROM json_each(NEW.kendala) WHERE value NOT IN ('air_jauh', 'akses_sulit_rawa', 'roda_empat_sulit', 'air_tidak_cukup', 'asap_tebal', 'angin_kencang'))
  OR json_array_length(NEW.kendala) != (SELECT count(DISTINCT value) FROM json_each(NEW.kendala))
BEGIN
  SELECT RAISE(ABORT, 'kendala tidak sah atau berulang');
END;

-- Neraca harian per kabupaten. sumber 'regu' = agregat laporan regu (dihitung ulang tiap laporan masuk), 'rakor' = isian admin.
-- Pembaca memakai 'rakor' bila ada, kalau tidak 'regu'. sisa = luas - padam (selisih <= 1 ha).
CREATE TABLE IF NOT EXISTS neraca_harian (
  tgl TEXT NOT NULL CHECK (tgl GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  sumber TEXT NOT NULL CHECK (sumber IN ('regu', 'rakor')),
  fs INTEGER NOT NULL DEFAULT 0 CHECK (fs BETWEEN 0 AND 100000),
  luas_ha REAL NOT NULL DEFAULT 0 CHECK (luas_ha >= 0 AND luas_ha <= 1000000),
  padam_ha REAL NOT NULL DEFAULT 0 CHECK (padam_ha >= 0 AND padam_ha <= luas_ha),
  sisa_ha REAL NOT NULL DEFAULT 0 CHECK (sisa_ha >= 0 AND sisa_ha <= luas_ha AND abs(luas_ha - padam_ha - sisa_ha) <= 1),
  personel INTEGER NOT NULL DEFAULT 0 CHECK (personel BETWEEN 0 AND 100000),
  kendala TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(kendala) AND json_type(kendala) = 'array' AND json_array_length(kendala) <= 6),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  diubah INTEGER NOT NULL,
  oleh TEXT,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  PRIMARY KEY (tgl, prov, kab, sumber)
) WITHOUT ROWID;
CREATE TRIGGER IF NOT EXISTS neraca_kendala_sah BEFORE INSERT ON neraca_harian
WHEN EXISTS (SELECT 1 FROM json_each(NEW.kendala) WHERE value NOT IN ('air_jauh', 'akses_sulit_rawa', 'roda_empat_sulit', 'air_tidak_cukup', 'asap_tebal', 'angin_kencang'))
  OR json_array_length(NEW.kendala) != (SELECT count(DISTINCT value) FROM json_each(NEW.kendala))
BEGIN
  SELECT RAISE(ABORT, 'kendala tidak sah atau berulang');
END;
CREATE TRIGGER IF NOT EXISTS neraca_kendala_ubah BEFORE UPDATE OF kendala ON neraca_harian
WHEN EXISTS (SELECT 1 FROM json_each(NEW.kendala) WHERE value NOT IN ('air_jauh', 'akses_sulit_rawa', 'roda_empat_sulit', 'air_tidak_cukup', 'asap_tebal', 'angin_kencang'))
  OR json_array_length(NEW.kendala) != (SELECT count(DISTINCT value) FROM json_each(NEW.kendala))
BEGIN
  SELECT RAISE(ABORT, 'kendala tidak sah atau berulang');
END;

-- Kontak perusahaan: diinput admin, TIDAK PERNAH keluar di rute publik. Satu baris per perusahaan (id dari konsesi2026).
CREATE TABLE IF NOT EXISTS kontak_pt (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  perusahaan_id TEXT NOT NULL UNIQUE CHECK (length(perusahaan_id) BETWEEN 3 AND 80),
  nama_pt TEXT NOT NULL CHECK (length(nama_pt) BETWEEN 2 AND 120),
  kontak TEXT CHECK (kontak IS NULL OR length(kontak) <= 80),
  email TEXT CHECK (email IS NULL OR (length(email) BETWEEN 6 AND 254 AND email LIKE '_%@_%.__%' AND email NOT GLOB '*[ <>,;"]*')),
  wa TEXT CHECK (wa IS NULL OR (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*')),
  telepon TEXT CHECK (telepon IS NULL OR (length(telepon) BETWEEN 5 AND 20 AND telepon NOT GLOB '*[^0-9+ -]*')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  diubah INTEGER NOT NULL,
  oleh TEXT,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (email IS NOT NULL OR wa IS NOT NULL OR telepon IS NOT NULL)
);

-- Antrean panggilan: satu baris per perusahaan per hari deteksi (titik_n bertambah, tidak menggandakan baris).
-- Tidak ada kiriman otomatis: admin yang menekan tombol; batas respons = dipanggil_pada + 2 jam.
CREATE TABLE IF NOT EXISTS panggilan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  perusahaan_id TEXT NOT NULL CHECK (length(perusahaan_id) BETWEEN 3 AND 80),
  nama_pt TEXT NOT NULL CHECK (length(nama_pt) BETWEEN 2 AND 120),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  titik_n INTEGER NOT NULL CHECK (titik_n >= 1),
  terdeteksi INTEGER NOT NULL,
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  status TEXT NOT NULL DEFAULT 'baru' CHECK (status IN ('baru', 'dipanggil', 'direspons', 'dicek', 'tindak_lanjut', 'selesai', 'abaikan')),
  dipanggil_pada INTEGER,
  batas INTEGER,
  direspons_pada INTEGER,
  dicek_pada INTEGER,
  saluran TEXT CHECK (saluran IS NULL OR saluran IN ('email', 'wa', 'telepon')),
  hasil TEXT CHECK (hasil IS NULL OR length(hasil) <= 300),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  oleh TEXT,
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (tanggal, perusahaan_id),
  CHECK (status IN ('baru', 'abaikan') OR (dipanggil_pada IS NOT NULL AND saluran IS NOT NULL)),
  CHECK ((dipanggil_pada IS NULL) = (batas IS NULL)),
  CHECK (batas IS NULL OR batas = dipanggil_pada + 7200000),
  CHECK (direspons_pada IS NULL OR (dipanggil_pada IS NOT NULL AND direspons_pada >= dipanggil_pada)),
  CHECK (dicek_pada IS NULL OR dipanggil_pada IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS panggilan_status ON panggilan (status, tanggal);

-- Templat halaman /paparan: tepat satu baris (id = 1), JSON objek <= 64 KB; skema isinya divalidasi src/posko.js.
CREATE TABLE IF NOT EXISTS paparan_templat (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  isi TEXT NOT NULL CHECK (json_valid(isi) AND json_type(isi) = 'object' AND length(isi) <= 65536),
  diubah INTEGER NOT NULL,
  oleh TEXT
);
