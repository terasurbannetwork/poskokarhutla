-- Modul Karbon (docs/karbon/RANCANGAN.md §5, src/karbon.js): proyek, peringatan pemantauan, pihak, kesepakatan,
-- buku kredit (append-only), laporan MRV. Semua di balik adminOK. Waktu = ms epoch UTC. Idempoten.
-- Daftar CHECK harus sama dengan konstanta TAHAP/JENIS_PIHAK/... di src/karbon.js (diuji tests/warga/karbon.test.mjs).
CREATE TABLE IF NOT EXISTS karbon_proyek (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 1 AND 200),
  konsesi_id TEXT CHECK (konsesi_id IS NULL OR length(konsesi_id) <= 80),
  pemegang TEXT CHECK (pemegang IS NULL OR length(pemegang) <= 200),
  prov TEXT CHECK (prov IS NULL OR length(prov) = 2),
  kab TEXT CHECK (kab IS NULL OR length(kab) <= 100),
  jenis_kegiatan TEXT CHECK (jenis_kegiatan IS NULL OR length(jenis_kegiatan) <= 80),
  metodologi TEXT CHECK (metodologi IS NULL OR length(metodologi) <= 120),
  tahap TEXT NOT NULL DEFAULT 'identifikasi' CHECK (tahap IN ('identifikasi', 'loi', 'kesepakatan', 'studi', 'pdd', 'validasi', 'registrasi', 'pemantauan', 'verifikasi', 'terbit', 'hentikan')),
  geom TEXT CHECK (geom IS NULL OR length(geom) <= 1048576),
  luas_ha REAL CHECK (luas_ha IS NULL OR luas_ha > 0),
  asumsi TEXT CHECK (asumsi IS NULL OR length(asumsi) <= 32768),
  stat TEXT CHECK (stat IS NULL OR length(stat) <= 262144),
  stat_diambil INTEGER,
  pantau_terakhir INTEGER,
  pantau_galat TEXT CHECK (pantau_galat IS NULL OR length(pantau_galat) <= 300),   -- galat GFW terakhir cron; NULL = jalan terakhir sukses
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 2000),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS karbon_proyek_pantau ON karbon_proyek (pantau_terakhir, id);   -- ORDER BY pantau_terakhir, id (NULL dulu) cron

CREATE TABLE IF NOT EXISTS karbon_peringatan (
  id INTEGER PRIMARY KEY,
  proyek_id TEXT NOT NULL REFERENCES karbon_proyek (id),
  sumber TEXT NOT NULL CHECK (sumber IN ('gfw_terpadu', 'firms')),
  tanggal TEXT NOT NULL CHECK (length(tanggal) = 10),
  lat REAL NOT NULL CHECK (lat BETWEEN -11.6 AND 6.6),
  lon REAL NOT NULL CHECK (lon BETWEEN 93.9 AND 141.6),
  luas_ha REAL CHECK (luas_ha IS NULL OR luas_ha >= 0),
  keyakinan TEXT CHECK (keyakinan IS NULL OR length(keyakinan) <= 20),
  status TEXT NOT NULL DEFAULT 'baru' CHECK (status IN ('baru', 'dicek', 'valid', 'palsu', 'selesai')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 2000),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT,
  UNIQUE (proyek_id, sumber, tanggal, lat, lon)
);
CREATE INDEX IF NOT EXISTS karbon_peringatan_status ON karbon_peringatan (status, tanggal);

CREATE TABLE IF NOT EXISTS karbon_pihak (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 1 AND 200),
  jenis TEXT NOT NULL CHECK (jenis IN ('pemegang_konsesi', 'pembeli', 'investor', 'vvb', 'mitra', 'pemerintah', 'komunitas')),
  negara TEXT CHECK (negara IS NULL OR length(negara) <= 80),
  kontak TEXT CHECK (kontak IS NULL OR length(kontak) <= 300),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 2000),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS karbon_kesepakatan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  pihak_id TEXT NOT NULL REFERENCES karbon_pihak (id),
  proyek_id TEXT REFERENCES karbon_proyek (id),
  arah TEXT NOT NULL CHECK (arah IN ('pasok', 'jual', 'modal', 'jasa')),
  tahap TEXT NOT NULL DEFAULT 'prospek' CHECK (tahap IN ('prospek', 'nda', 'term_sheet', 'loi', 'kontrak', 'selesai', 'batal')),
  volume_t_th REAL CHECK (volume_t_th IS NULL OR volume_t_th >= 0),
  tenor_th REAL CHECK (tenor_th IS NULL OR tenor_th >= 0),
  harga_usd REAL CHECK (harga_usd IS NULL OR harga_usd >= 0),
  nilai_usd REAL CHECK (nilai_usd IS NULL OR nilai_usd >= 0),
  langkah_berikut TEXT CHECK (langkah_berikut IS NULL OR length(langkah_berikut) <= 500),
  tenggat TEXT CHECK (tenggat IS NULL OR length(tenggat) = 10),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 2000),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL
);

-- Buku kredit: APPEND-ONLY. Koreksi = entri baru (batal, lepas_cadang), tidak pernah UPDATE/DELETE.
-- Saldo (proyek, vintage) = terbit - alih - pensiun - batal; tersedia = saldo - cadang + lepas_cadang (src/karbon.js menolak negatif).
CREATE TABLE IF NOT EXISTS karbon_buku (
  id INTEGER PRIMARY KEY,
  proyek_id TEXT NOT NULL REFERENCES karbon_proyek (id),
  vintage INTEGER NOT NULL CHECK (vintage BETWEEN 2000 AND 2100),
  jenis TEXT NOT NULL CHECK (jenis IN ('terbit', 'cadang', 'lepas_cadang', 'alih', 'pensiun', 'batal')),
  jumlah_t INTEGER NOT NULL CHECK (typeof(jumlah_t) = 'integer' AND jumlah_t > 0 AND jumlah_t <= 1000000000),
  -- rentang serial bernomor (1 serial = 1 tCO2e): keduanya ada atau keduanya kosong, panjang rentang = jumlah_t
  serial_awal INTEGER,
  serial_akhir INTEGER,
  kesepakatan_id TEXT REFERENCES karbon_kesepakatan (id),
  pembeli TEXT CHECK (pembeli IS NULL OR length(pembeli) <= 200),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 2000),
  waktu INTEGER NOT NULL,
  oleh TEXT NOT NULL,
  CHECK ((serial_awal IS NULL AND serial_akhir IS NULL)
    OR (typeof(serial_awal) = 'integer' AND typeof(serial_akhir) = 'integer' AND serial_awal >= 1 AND serial_akhir - serial_awal + 1 = jumlah_t))
);
CREATE INDEX IF NOT EXISTS karbon_buku_saldo ON karbon_buku (proyek_id, vintage);
CREATE TRIGGER IF NOT EXISTS karbon_buku_tanpa_ubah BEFORE UPDATE ON karbon_buku
BEGIN
  SELECT RAISE(ABORT, 'karbon_buku append-only: buat entri koreksi');
END;
CREATE TRIGGER IF NOT EXISTS karbon_buku_tanpa_hapus BEFORE DELETE ON karbon_buku
BEGIN
  SELECT RAISE(ABORT, 'karbon_buku append-only: buat entri koreksi');
END;

CREATE TABLE IF NOT EXISTS karbon_laporan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  proyek_id TEXT NOT NULL REFERENCES karbon_proyek (id),
  periode_awal TEXT NOT NULL CHECK (length(periode_awal) = 10),
  periode_akhir TEXT NOT NULL CHECK (length(periode_akhir) = 10 AND periode_akhir >= periode_awal),
  isi TEXT NOT NULL CHECK (length(isi) <= 131072),
  status TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'tinjau', 'kirim')),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT NOT NULL
);

-- indeks untuk saringan per proyek/pihak dan rujukan balik (FK) buku -> kesepakatan
CREATE INDEX IF NOT EXISTS karbon_kesepakatan_pihak ON karbon_kesepakatan (pihak_id);
CREATE INDEX IF NOT EXISTS karbon_kesepakatan_proyek ON karbon_kesepakatan (proyek_id);
CREATE INDEX IF NOT EXISTS karbon_laporan_proyek ON karbon_laporan (proyek_id);
CREATE INDEX IF NOT EXISTS karbon_buku_kesepakatan ON karbon_buku (kesepakatan_id);
