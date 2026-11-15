-- 0130: paritas bencana, operasi, sarana, renlap (PB-05). Hanya CREATE ... IF NOT EXISTS; tanpa nama orang (D8).

-- Jenis tugas longsor dan pesisir (CHECK tugas_bencana 0047 tidak mencakupnya). Tabel samping 1:1; baris tak ada di kedua tabel = karhutla.
CREATE TABLE IF NOT EXISTS tugas_bencana_x (
  tugas_id TEXT PRIMARY KEY REFERENCES tugas_api (id) ON DELETE CASCADE,
  bencana TEXT NOT NULL CHECK (bencana IN ('longsor','pesisir')),
  reda INTEGER NOT NULL DEFAULT 0 CHECK (reda >= 0));
CREATE INDEX IF NOT EXISTS tugas_bencana_x_jenis ON tugas_bencana_x (bencana);

-- Sarana dan fasilitas sasaran (F-2, F-7). Tanpa nama orang, tanpa nomor telepon.
CREATE TABLE IF NOT EXISTS pb_titik (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  golongan TEXT NOT NULL CHECK (golongan IN ('sarana','fasilitas')),
  jenis TEXT NOT NULL CHECK (jenis IN ('heli_evakuasi','perahu_karet','perahu_motor','pompa_air','truk_tangki','tenda','terpal','atap_darurat','alat_berat','genset','dapur_umum','masker','air_bersih_unit','tim_sar_unit','tempat_evakuasi','faskes','sekolah','gudang','helipad','sumber_air','barak','ruang_udara_bersih','pos_pantau')),
  bencana TEXT NOT NULL CHECK (bencana IN ('karhutla','banjir','longsor','pesisir','cuaca','udara','kekeringan','gempa','gunungapi')),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  kab TEXT NOT NULL DEFAULT '' CHECK (kab = '' OR length(kab) = 4),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 1 AND 80),        -- nama tempat atau unit, bukan nama orang
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5), lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  kapasitas INTEGER CHECK (kapasitas IS NULL OR kapasitas BETWEEN 0 AND 1000000),   -- orang, liter, atau unit menurut jenis
  status TEXT NOT NULL DEFAULT 'siap' CHECK (status IN ('siap','dipakai','rusak','tidak_tersedia')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 200),
  oleh TEXT NOT NULL, dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL, dihapus INTEGER);   -- dihapus: ms UTC, NULL = aktif (hapus lunak)
CREATE INDEX IF NOT EXISTS pb_titik_wilayah ON pb_titik (prov, kab, bencana);
CREATE INDEX IF NOT EXISTS pb_titik_bencana ON pb_titik (bencana, golongan, jenis);

-- Renlap generik berversi (F-3). Berkas isi di R2 (§4); baris ini = metadata dan status.
CREATE TABLE IF NOT EXISTS pb_renlap (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  bencana TEXT NOT NULL CHECK (bencana IN ('karhutla','banjir','longsor','pesisir','cuaca','udara','kekeringan','gempa','gunungapi')),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  kab TEXT NOT NULL DEFAULT '' CHECK (kab = '' OR length(kab) = 4),
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  versi INTEGER NOT NULL CHECK (versi BETWEEN 1 AND 99),
  status TEXT NOT NULL CHECK (status IN ('diminta','draf','terbit','selesai','gagal','dibatalkan')),
  berlaku_sampai INTEGER,                                          -- ms UTC; terbit + 14 hari mengikuti RENLAP_BERLAKU_MS (src/sippa.js:1904) [BAWAAN SEMENTARA, Q26]
  jml_target INTEGER CHECK (jml_target IS NULL OR jml_target BETWEEN 0 AND 500),
  ukuran INTEGER, sha TEXT CHECK (sha IS NULL OR length(sha) = 64),
  galat TEXT CHECK (galat IS NULL OR length(galat) <= 200),
  oleh TEXT NOT NULL, dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL,
  UNIQUE (bencana, prov, kab, tanggal, versi));
CREATE INDEX IF NOT EXISTS pb_renlap_tanggal ON pb_renlap (tanggal, bencana);
CREATE INDEX IF NOT EXISTS pb_renlap_wilayah ON pb_renlap (prov, tanggal);

-- Hasil tindakan dan kepatuhan (F-5). Satu baris per target renlap.
CREATE TABLE IF NOT EXISTS pb_renlap_hasil (
  renlap_id TEXT NOT NULL REFERENCES pb_renlap (id) ON DELETE CASCADE,
  target_no INTEGER NOT NULL CHECK (target_no BETWEEN 1 AND 500),
  didatangi INTEGER CHECK (didatangi IS NULL OR didatangi IN (0,1)),
  alasan TEXT CHECK (alasan IS NULL OR alasan IN ('akses_terputus','cuaca','sarana_kurang','warga_menolak','sudah_aman','lokasi_salah','lainnya')),
  hasil TEXT CHECK (hasil IS NULL OR hasil IN ('selesai','sebagian','belum','eskalasi')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 200),
  oleh TEXT NOT NULL, waktu INTEGER NOT NULL,
  PRIMARY KEY (renlap_id, target_no));

-- Jejak audit untuk semua tulis pb_* (siapa, apa, sebelum, sesudah); juga dasar batas laju.
CREATE TABLE IF NOT EXISTS pb_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, waktu INTEGER NOT NULL, oleh TEXT NOT NULL,
  tabel TEXT NOT NULL CHECK (tabel IN ('pb_titik','pb_renlap','pb_renlap_hasil','pb_dokumen','pb_tindakan')),
  kunci TEXT NOT NULL CHECK (length(kunci) BETWEEN 1 AND 80),
  aksi TEXT NOT NULL CHECK (aksi IN ('isi','ubah','hapus','terbit','selesai','minta','gagal')),
  sebelum TEXT CHECK (sebelum IS NULL OR (json_valid(sebelum) AND length(sebelum) <= 8192)),
  sesudah TEXT CHECK (sesudah IS NULL OR (json_valid(sesudah) AND length(sesudah) <= 8192)),
  alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 300));
CREATE INDEX IF NOT EXISTS pb_log_kunci ON pb_log (tabel, kunci, waktu);
CREATE INDEX IF NOT EXISTS pb_log_oleh ON pb_log (oleh, waktu);
