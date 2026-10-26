-- SIPPA aset bukan kit, inspeksi, dan stok (PRD §6.10, §9.7.2; keputusan 56). Idempoten. Waktu = ms epoch UTC.
-- Persis DESAIN-TEKNIS §3.6; pesan RAISE diawali nama trigger (RENCANA-UJI §3.1).

CREATE TABLE IF NOT EXISTS sippa_aset (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  kode TEXT NOT NULL UNIQUE CHECK (kode GLOB 'AS-[0-9][0-9][0-9][0-9]'),
  kelas TEXT NOT NULL CHECK (kelas IN ('sumur_bor', 'pompa_sumur', 'pipa_sementara', 'tandon_hidran', 'pipa_koridor', 'jembatan_darurat', 'jembatan_permanen')),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 120),
  status TEXT NOT NULL DEFAULT 'rencana' CHECK (status IN ('rencana', 'berfungsi', 'rusak', 'diserahkan', 'diganti_permanen', 'nonaktif')),
  sumber TEXT NOT NULL CHECK (sumber IN ('bnpb_dsp', 'bpbd', 'pu_bina_marga', 'pu_cipta_karya', 'pu_sda', 'badan_geologi', 'tniad', 'polri', 'pemda', 'desa', 'pdam', 'lain')),
  pemilik_aset TEXT NOT NULL CHECK (length(pemilik_aset) BETWEEN 3 AND 120),
  pemelihara TEXT CHECK (pemelihara IS NULL OR length(pemelihara) BETWEEN 3 AND 120),
  kit_id TEXT CHECK (kit_id IS NULL OR length(kit_id) = 16),          -- pompa sumur atau pipa koridor yang melekat ke kit
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT CHECK (kab IS NULL OR length(kab) <= 60),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  kejadian TEXT CHECK (kejadian IS NULL OR length(kejadian) <= 120),
  rencana_ganti INTEGER,                                               -- jembatan darurat: tanggal rencana ganti permanen
  atribut TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(atribut) AND json_type(atribut) = 'object' AND length(atribut) <= 4096),
  rujukan TEXT CHECK (rujukan IS NULL OR length(rujukan) <= 300),
  keyakinan TEXT NOT NULL CHECK (keyakinan IN ('resmi', 'terverifikasi', 'asumsi-kebijakan')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (dummy = 1 OR kode < 'AS-9000'),                               -- AS-9000..9999 khusus dummy
  -- rehab Q10: sumur di zona kritis atau rusak wajib rekomendasi teknis Badan Geologi
  CHECK (kelas != 'sumur_bor'
         OR coalesce(json_extract(atribut, '$.zona_konservasi'), 'belum') NOT IN ('kritis', 'rusak')
         OR json_extract(atribut, '$.rekomendasi_bg') IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_sippa_aset_kelas ON sippa_aset (kelas, prov);

-- inspeksi tambah-saja untuk komponen kit, kit utuh, dan aset bukan kit
CREATE TABLE IF NOT EXISTS sippa_inspeksi (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 OR length(id) = 36),    -- 16 heks staf atau UUID v4 lapangan
  sasaran_jenis TEXT NOT NULL CHECK (sasaran_jenis IN ('komponen', 'kit', 'aset')),
  sasaran_id TEXT NOT NULL CHECK (length(sasaran_id) = 16),
  kit_id TEXT CHECK (kit_id IS NULL OR length(kit_id) = 16),
  jenis TEXT NOT NULL CHECK (jenis IN ('pra_gelar', 'pasca_gelar', 'berkala', 'pra_musim', 'tahunan', 'pasca_bencana', 'servis', 'uji_tekanan', 'mutu_air', 'serah_terima')),
  skor INTEGER NOT NULL CHECK (skor BETWEEN 0 AND 3),
  jam_operasi REAL CHECK (jam_operasi IS NULL OR jam_operasi BETWEEN 0 AND 100000),
  temuan TEXT CHECK (temuan IS NULL OR length(temuan) <= 1000),
  tindakan TEXT NOT NULL DEFAULT 'tidak_ada' CHECK (tindakan IN ('tidak_ada', 'perbaiki', 'ganti', 'afkir', 'uji_ulang', 'serahkan')),
  hasil TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(hasil) AND json_type(hasil) = 'object' AND length(hasil) <= 2048),
  foto_id TEXT CHECK (foto_id IS NULL OR length(foto_id) = 16),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (sasaran_jenis = 'aset' OR kit_id IS NOT NULL),
  CHECK (jenis != 'mutu_air' OR json_extract(hasil, '$.e_coli_cfu') IS NOT NULL),
  CHECK (jenis != 'uji_tekanan' OR json_extract(hasil, '$.tekanan_bar') IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_sippa_insp_sasaran ON sippa_inspeksi (sasaran_jenis, sasaran_id, waktu);

-- komponen harus milik kit yang disebut
CREATE TRIGGER IF NOT EXISTS sippa_insp_komp_cek BEFORE INSERT ON sippa_inspeksi
WHEN NEW.sasaran_jenis = 'komponen'
  AND NOT EXISTS (SELECT 1 FROM sippa_komponen WHERE id = NEW.sasaran_id AND kit_id = NEW.kit_id)
BEGIN
  SELECT RAISE(ABORT, 'sippa_insp_komp_cek: komponen bukan milik kit ini');
END;
-- satu sumber kondisi: skor 0-3 ke enum kondisi 0056
CREATE TRIGGER IF NOT EXISTS sippa_insp_komp_terapkan AFTER INSERT ON sippa_inspeksi
WHEN NEW.sasaran_jenis = 'komponen'
BEGIN
  UPDATE sippa_komponen
     SET kondisi = CASE NEW.skor WHEN 0 THEN 'baik' WHEN 1 THEN 'rusak_ringan' WHEN 2 THEN 'rusak_berat' ELSE 'hilang' END,
         dicek = NEW.waktu
   WHERE id = NEW.sasaran_id;
END;
CREATE TRIGGER IF NOT EXISTS sippa_insp_tetap BEFORE UPDATE ON sippa_inspeksi
BEGIN
  SELECT RAISE(ABORT, 'sippa_insp_tetap: sippa_inspeksi hanya bisa ditambah');
END;
CREATE TRIGGER IF NOT EXISTS sippa_insp_hapus BEFORE DELETE ON sippa_inspeksi
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'sippa_insp_hapus: sippa_inspeksi hanya bisa ditambah');
END;

-- stok suku cadang: buku besar tambah-saja per gudang
CREATE TABLE IF NOT EXISTS sippa_stok_gerak (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  gudang TEXT NOT NULL CHECK (length(gudang) BETWEEN 3 AND 80),
  kode_bom TEXT NOT NULL CHECK (kode_bom GLOB '[A-Z]*-[0-9]*' AND length(kode_bom) <= 12),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 120),
  delta REAL NOT NULL CHECK (delta != 0 AND abs(delta) <= 100000),
  satuan TEXT NOT NULL CHECK (satuan IN ('unit', 'm', 'set', 'paket', 'liter')),
  alasan TEXT NOT NULL CHECK (alasan IN ('terima', 'pakai', 'pindah', 'koreksi', 'afkir')),
  kit_id TEXT CHECK (kit_id IS NULL OR length(kit_id) = 16),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_sippa_stok ON sippa_stok_gerak (gudang, kode_bom);
CREATE TRIGGER IF NOT EXISTS sippa_stok_cek BEFORE INSERT ON sippa_stok_gerak
WHEN NEW.delta < 0
  AND coalesce((SELECT sum(delta) FROM sippa_stok_gerak
                 WHERE gudang = NEW.gudang AND kode_bom = NEW.kode_bom AND dummy = NEW.dummy), 0) + NEW.delta < 0
BEGIN
  SELECT RAISE(ABORT, 'sippa_stok_cek: stok tidak cukup');
END;
CREATE TRIGGER IF NOT EXISTS sippa_stok_tetap BEFORE UPDATE ON sippa_stok_gerak
BEGIN
  SELECT RAISE(ABORT, 'sippa_stok_tetap: sippa_stok_gerak hanya bisa ditambah');
END;
CREATE TRIGGER IF NOT EXISTS sippa_stok_hapus BEFORE DELETE ON sippa_stok_gerak
WHEN OLD.dummy = 0
BEGIN
  SELECT RAISE(ABORT, 'sippa_stok_hapus: sippa_stok_gerak hanya bisa ditambah');
END;
