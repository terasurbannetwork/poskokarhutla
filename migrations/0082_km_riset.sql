-- Kemitraan Kampus, migrasi 3/5 (DESAIN-TEKNIS §3.3): donor, panggilan donor, proposal + konsorsium, hibah riset bersama + telaah, inovasi, sumber agenda. Idempoten (IF NOT EXISTS).
-- Uang = INTEGER rupiah >= 0 (mata uang panggilan donor terpisah). CHECK tidak boleh berisi subkueri di SQLite, jadi himpunan isi array JSON dan Σbobot rubrik dijaga TRIGGER.
-- Enum bahaya (11, ditambah 'semua' untuk donor) dan aspek (A1..A10) identik dengan konstanta modul (konst.py = konst.js).

CREATE TABLE IF NOT EXISTS km_donor (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 120),
  jenis TEXT NOT NULL CHECK (jenis IN ('internasional', 'nasional', 'bumn', 'swasta', 'filantropi')),
  bahaya TEXT NOT NULL CHECK (json_valid(bahaya) AND json_type(bahaya) = 'array' AND json_array_length(bahaya) BETWEEN 1 AND 12),
  aspek TEXT NOT NULL CHECK (json_valid(aspek) AND json_type(aspek) = 'array' AND json_array_length(aspek) BETWEEN 1 AND 10),
  syarat_mitra TEXT CHECK (syarat_mitra IS NULL OR length(syarat_mitra) <= 500),
  status TEXT NOT NULL DEFAULT 'belum' CHECK (status IN ('siap', 'terbatas', 'belum')),
  tautan TEXT CHECK (tautan IS NULL OR (length(tautan) <= 200 AND tautan GLOB 'https://*')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 1000),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE TRIGGER IF NOT EXISTS km_donor_himpunan_i BEFORE INSERT ON km_donor
WHEN EXISTS (SELECT 1 FROM json_each(NEW.bahaya) WHERE value NOT IN ('banjir', 'longsor', 'gempa', 'tsunami', 'gunungapi', 'kekeringan', 'karhutla', 'cuaca_ekstrem', 'abrasi_rob', 'udara', 'multi', 'semua'))
  OR EXISTS (SELECT 1 FROM json_each(NEW.aspek) WHERE value NOT IN ('A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10'))
BEGIN SELECT RAISE(ABORT, 'km_donor_himpunan: bahaya atau aspek di luar daftar'); END;
CREATE TRIGGER IF NOT EXISTS km_donor_himpunan_u BEFORE UPDATE OF bahaya, aspek ON km_donor
WHEN EXISTS (SELECT 1 FROM json_each(NEW.bahaya) WHERE value NOT IN ('banjir', 'longsor', 'gempa', 'tsunami', 'gunungapi', 'kekeringan', 'karhutla', 'cuaca_ekstrem', 'abrasi_rob', 'udara', 'multi', 'semua'))
  OR EXISTS (SELECT 1 FROM json_each(NEW.aspek) WHERE value NOT IN ('A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A9', 'A10'))
BEGIN SELECT RAISE(ABORT, 'km_donor_himpunan: bahaya atau aspek di luar daftar'); END;

CREATE TABLE IF NOT EXISTS km_panggilan_donor (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  donor_id TEXT NOT NULL REFERENCES km_donor (id),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 5 AND 200),
  buka TEXT NOT NULL CHECK (buka GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  tenggat TEXT NOT NULL CHECK (tenggat GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  nilai_maks INTEGER CHECK (nilai_maks IS NULL OR nilai_maks >= 0),
  mata_uang TEXT NOT NULL DEFAULT 'IDR' CHECK (mata_uang IN ('IDR', 'USD', 'EUR', 'JPY', 'AUD', 'KRW')),
  tautan TEXT CHECK (tautan IS NULL OR (length(tautan) <= 200 AND tautan GLOB 'https://*')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (tenggat >= buka)
);
CREATE INDEX IF NOT EXISTS idx_km_panggilan_donor_tenggat ON km_panggilan_donor (tenggat);

CREATE TABLE IF NOT EXISTS km_proposal (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  masalah_id TEXT REFERENCES km_masalah (id),
  donor_id TEXT REFERENCES km_donor (id),
  panggilan_id TEXT REFERENCES km_panggilan_donor (id),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 5 AND 200),
  ketua_institusi TEXT NOT NULL REFERENCES institusi (id),
  status TEXT NOT NULL DEFAULT 'ide' CHECK (status IN ('ide', 'tim', 'draf', 'diajukan', 'lolos', 'ditolak', 'berjalan', 'selesai')),
  nilai_diminta INTEGER CHECK (nilai_diminta IS NULL OR nilai_diminta >= 0),
  nilai_disetujui INTEGER CHECK (nilai_disetujui IS NULL OR nilai_disetujui >= 0),
  dana_pendamping INTEGER CHECK (dana_pendamping IS NULL OR dana_pendamping >= 0),
  surat_nomor TEXT UNIQUE CHECK (surat_nomor IS NULL OR (length(surat_nomor) <= 60 AND surat_nomor GLOB 'KM/SD/[0-9][0-9][0-9][0-9]/*')),
  berkas_r2 TEXT CHECK (berkas_r2 IS NULL OR (length(berkas_r2) <= 200 AND berkas_r2 GLOB 'kemitraan/*')),
  diajukan_tgl TEXT CHECK (diajukan_tgl IS NULL OR diajukan_tgl GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  hasil_tgl TEXT CHECK (hasil_tgl IS NULL OR hasil_tgl GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  pelajaran TEXT CHECK (pelajaran IS NULL OR length(pelajaran) <= 2000),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 80),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_km_proposal_status ON km_proposal (status, donor_id);
CREATE TRIGGER IF NOT EXISTS km_proposal_alur BEFORE UPDATE OF status ON km_proposal
WHEN NEW.status <> OLD.status AND (OLD.status || '>' || NEW.status) NOT IN (
  'ide>tim', 'tim>draf', 'draf>diajukan', 'diajukan>lolos', 'diajukan>ditolak', 'lolos>berjalan', 'berjalan>selesai',
  'draf>tim', 'tim>ide')
BEGIN SELECT RAISE(ABORT, 'km_proposal_alur: transisi status tidak sah'); END;

CREATE TABLE IF NOT EXISTS km_konsorsium (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  proposal_id TEXT NOT NULL REFERENCES km_proposal (id),
  jenis TEXT NOT NULL CHECK (jenis IN ('kampus', 'pakar', 'mitra_ln', 'unit_bnpb', 'bpbd')),
  rujukan TEXT NOT NULL CHECK (length(rujukan) BETWEEN 1 AND 160),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 160),
  negara TEXT CHECK (negara IS NULL OR (length(negara) = 2 AND negara NOT GLOB '*[^A-Z]*')),
  peran TEXT NOT NULL CHECK (peran IN ('ketua', 'anggota', 'pendamping')),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (proposal_id, jenis, rujukan)
);

CREATE TABLE IF NOT EXISTS km_hibah_panggilan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  tahun INTEGER NOT NULL CHECK (tahun BETWEEN 2026 AND 2035),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 5 AND 200),
  agenda TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(agenda) AND json_type(agenda) = 'array'),
  pagu INTEGER NOT NULL CHECK (pagu >= 0),
  kuota_per_kampus INTEGER NOT NULL CHECK (kuota_per_kampus BETWEEN 1 AND 5),
  rubrik TEXT NOT NULL CHECK (json_valid(rubrik) AND json_type(rubrik) = 'array'),
  tenggat TEXT NOT NULL CHECK (tenggat GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  status TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'buka', 'telaah', 'diumumkan')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 80),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
-- Σbobot rubrik harus 100; rubrik kosong ikut ditolak (coalesce menjadikannya 0). JS menjaga juga (KM-E04).
CREATE TRIGGER IF NOT EXISTS km_hibah_rubrik_i BEFORE INSERT ON km_hibah_panggilan
WHEN coalesce((SELECT SUM(json_extract(value, '$.bobot')) FROM json_each(NEW.rubrik)), 0) <> 100
BEGIN SELECT RAISE(ABORT, 'km_hibah_rubrik: jumlah bobot rubrik harus 100'); END;
CREATE TRIGGER IF NOT EXISTS km_hibah_rubrik_u BEFORE UPDATE ON km_hibah_panggilan
WHEN coalesce((SELECT SUM(json_extract(value, '$.bobot')) FROM json_each(NEW.rubrik)), 0) <> 100
BEGIN SELECT RAISE(ABORT, 'km_hibah_rubrik: jumlah bobot rubrik harus 100'); END;

CREATE TABLE IF NOT EXISTS km_hibah_proposal (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  panggilan_id TEXT NOT NULL REFERENCES km_hibah_panggilan (id),
  institusi_id TEXT NOT NULL REFERENCES institusi (id),
  masalah_id TEXT REFERENCES km_masalah (id),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 5 AND 200),
  ketua TEXT NOT NULL CHECK (length(ketua) BETWEEN 2 AND 80),
  anggota TEXT CHECK (anggota IS NULL OR (json_valid(anggota) AND json_type(anggota) = 'array')),
  metode TEXT CHECK (metode IS NULL OR length(metode) <= 5000),
  anggaran INTEGER CHECK (anggaran IS NULL OR anggaran >= 0),
  berkas_r2 TEXT CHECK (berkas_r2 IS NULL OR (length(berkas_r2) <= 200 AND berkas_r2 GLOB 'kemitraan/*')),
  nilai REAL CHECK (nilai IS NULL OR nilai >= 0),
  bendera_selisih INTEGER NOT NULL DEFAULT 0 CHECK (bendera_selisih IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'diajukan' CHECK (status IN ('diajukan', 'ditelaah', 'lolos', 'cadangan', 'tidak', 'ditarik')),
  riset_usulan_id TEXT REFERENCES riset_usulan (id),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_km_hibah_proposal_panggilan ON km_hibah_proposal (panggilan_id, status);

CREATE TABLE IF NOT EXISTS km_telaah (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  hibah_proposal_id TEXT NOT NULL REFERENCES km_hibah_proposal (id),
  penelaah_akademisi_id TEXT NOT NULL CHECK (length(penelaah_akademisi_id) <= 13 AND penelaah_akademisi_id GLOB 'A[0-9]*' AND penelaah_akademisi_id NOT GLOB 'A*[^0-9]*'),
  pl_kode_id TEXT NOT NULL REFERENCES km_pl_kode (id),
  skor TEXT CHECK (skor IS NULL OR (json_valid(skor) AND json_type(skor) = 'object')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 3000),
  dikirim INTEGER,
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_km_telaah_proposal ON km_telaah (hibah_proposal_id);
-- Telaah yang sudah dikirim beku: tidak boleh diubah apa pun.
CREATE TRIGGER IF NOT EXISTS km_telaah_beku BEFORE UPDATE ON km_telaah
WHEN OLD.dikirim IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'km_telaah_beku: telaah yang sudah dikirim tidak boleh diubah'); END;

CREATE TABLE IF NOT EXISTS km_inovasi (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  institusi_id TEXT NOT NULL REFERENCES institusi (id),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 3 AND 160),
  masalah_id TEXT REFERENCES km_masalah (id),
  bahaya TEXT NOT NULL CHECK (bahaya IN ('banjir', 'longsor', 'gempa', 'tsunami', 'gunungapi', 'kekeringan', 'karhutla', 'cuaca_ekstrem', 'abrasi_rob', 'udara', 'multi')),
  tkt INTEGER NOT NULL CHECK (tkt BETWEEN 1 AND 9),
  tkt_bukti TEXT CHECK (tkt_bukti IS NULL OR (json_valid(tkt_bukti) AND json_type(tkt_bukti) = 'array' AND json_array_length(tkt_bukti) <= 9)),
  tkt_verif INTEGER CHECK (tkt_verif IS NULL OR tkt_verif BETWEEN 1 AND 9),
  uji TEXT NOT NULL DEFAULT 'belum' CHECK (uji IN ('belum', 'dijadwalkan', 'lolos', 'gagal')),
  uji_kab4 TEXT CHECK (uji_kab4 IS NULL OR (length(uji_kab4) = 4 AND uji_kab4 NOT GLOB '*[^0-9]*')),
  uji_tgl TEXT CHECK (uji_tgl IS NULL OR uji_tgl GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  ekatalog TEXT NOT NULL DEFAULT 'belum' CHECK (ekatalog IN ('belum', 'proses', 'tayang')),
  kontak TEXT CHECK (kontak IS NULL OR length(kontak) <= 200),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS idx_km_inovasi_uji ON km_inovasi (uji, institusi_id);

CREATE TABLE IF NOT EXISTS km_agenda_sumber (
  agenda_id TEXT NOT NULL REFERENCES riset_agenda (id),
  masalah_id TEXT NOT NULL REFERENCES km_masalah (id),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  PRIMARY KEY (agenda_id, masalah_id)
);
