-- Paritas bencana PB-21 (D13, data/kajian-bnpb/paritas-bencana/DESAIN-TEKNIS.md 3.4): tabel samping untuk jenis peringatan baru.
-- CHECK jenis/sumber di `peringatan` (0010) tidak bisa diubah tanpa membangun ulang tabel, jadi tabel itu TIDAK disentuh.
-- Skema kolom sama dengan `peringatan`; hanya CHECK jenis (enam nilai baru) dan sumber (diperluas) yang beda. Idempoten.
CREATE TABLE IF NOT EXISTS peringatan_x (
  kunci TEXT PRIMARY KEY CHECK (length(kunci) BETWEEN 3 AND 200),
  jenis TEXT NOT NULL CHECK (jenis IN ('gunungapi', 'udara', 'kekeringan', 'pesisir', 'longsor', 'rob')),
  tingkat TEXT NOT NULL CHECK (tingkat IN ('Waspada', 'Siaga', 'Awas')),
  prov TEXT CHECK (prov IS NULL OR length(prov) <= 2),
  kab TEXT CHECK (kab IS NULL OR length(kab) <= 80),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94 AND 142),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 1 AND 200),
  teks TEXT NOT NULL DEFAULT '' CHECK (length(teks) <= 600),
  sumber TEXT NOT NULL CHECK (sumber IN ('BMKG', 'InaTEWS', 'PVMBG', 'KLHK', 'Badan Geologi', 'Deteksi Centurisk97')),
  sumber_url TEXT CHECK (sumber_url IS NULL OR sumber_url LIKE 'https://%'),
  dibuat INTEGER NOT NULL,
  berlaku_hingga INTEGER NOT NULL,
  dicabut INTEGER,
  dicabut_oleh TEXT
);
CREATE INDEX IF NOT EXISTS peringatan_x_aktif ON peringatan_x (berlaku_hingga, dibuat DESC);
