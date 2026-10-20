-- Laporan rumah rusak per rumah (src/rumah_rusak.js), kategori Laporan Kejadian Bencana Harian BNPB: berat (RB), sedang (RS), ringan (RR).
-- Pelapor = akun masuk (adminOK) ATAU regu berkode (src/posko.js reguDari). Waktu = ms epoch UTC; tanggal = hari kejadian 'YYYY-MM-DD'. Idempoten.
-- bencana TIDAK dibekukan di CHECK (CHECK SQLite tak bisa di-ALTER, bencana baru di registry akan memaksa bangun ulang tabel): hanya bentuk id
-- dijaga di sini, daftar sahnya (registry) dijaga src/rumah_rusak.js. prov = kode 2 digit; kab/kec = nama dari wilayah() (geo/provinsi.json + pusat_kec.json).
CREATE TABLE IF NOT EXISTS rumah_rusak (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  bencana TEXT NOT NULL CHECK (length(bencana) BETWEEN 2 AND 30 AND bencana NOT GLOB '*[^a-z0-9_]*'),
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 80),
  kec TEXT NOT NULL CHECK (length(kec) BETWEEN 1 AND 80),
  tingkat TEXT NOT NULL CHECK (tingkat IN ('berat', 'sedang', 'ringan')),
  foto INTEGER NOT NULL DEFAULT 0 CHECK (foto IN (0, 1)),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  pelapor TEXT NOT NULL CHECK (length(pelapor) BETWEEN 6 AND 40 AND (pelapor GLOB 'akun:*' OR pelapor GLOB 'regu:*')),
  waktu INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'sah' CHECK (status IN ('sah', 'ditolak')),
  dikoreksi_oleh TEXT CHECK (dikoreksi_oleh IS NULL OR length(dikoreksi_oleh) = 12),
  dikoreksi_waktu INTEGER
);
CREATE INDEX IF NOT EXISTS rumah_rusak_hari ON rumah_rusak (bencana, tanggal, prov, kab);
CREATE INDEX IF NOT EXISTS rumah_rusak_pelapor ON rumah_rusak (pelapor, waktu);

-- Jejak koreksi admin: hanya bisa ditambah (ubah/hapus ditolak database), sama pola audit_moderasi (0003).
CREATE TABLE IF NOT EXISTS rumah_rusak_koreksi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rumah_id TEXT NOT NULL,
  waktu INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) = 12),
  sebelum TEXT NOT NULL CHECK (json_valid(sebelum)),
  sesudah TEXT NOT NULL CHECK (json_valid(sesudah)),
  alasan TEXT NOT NULL CHECK (length(alasan) BETWEEN 3 AND 200)
);
CREATE INDEX IF NOT EXISTS rumah_rusak_koreksi_rumah ON rumah_rusak_koreksi (rumah_id);
CREATE TRIGGER IF NOT EXISTS rumah_rusak_koreksi_tetap_ubah BEFORE UPDATE ON rumah_rusak_koreksi BEGIN SELECT RAISE(ABORT, 'jejak koreksi rumah rusak tidak boleh diubah'); END;
CREATE TRIGGER IF NOT EXISTS rumah_rusak_koreksi_tetap_hapus BEFORE DELETE ON rumah_rusak_koreksi BEGIN SELECT RAISE(ABORT, 'jejak koreksi rumah rusak tidak boleh dihapus'); END;
