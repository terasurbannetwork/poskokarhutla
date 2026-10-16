-- Peringatan dini (src/peringatan.js): alarm dari sensor sendiri (gempa, tsunami, cuaca BMKG) ditulis idempoten lewat kunci "jenis:kode:jendela".
-- Waktu = milidetik epoch UTC. dicabut = NULL (aktif) atau waktu admin mencabut. Idempoten: aman dijalankan ulang.
CREATE TABLE IF NOT EXISTS peringatan (
  kunci TEXT PRIMARY KEY CHECK (length(kunci) BETWEEN 3 AND 200),
  jenis TEXT NOT NULL CHECK (jenis IN ('gempa', 'tsunami', 'karhutla', 'banjir', 'cuaca')),
  tingkat TEXT NOT NULL CHECK (tingkat IN ('Waspada', 'Siaga', 'Awas')),
  prov TEXT CHECK (prov IS NULL OR length(prov) <= 2),
  kab TEXT CHECK (kab IS NULL OR length(kab) <= 80),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94 AND 142),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 1 AND 200),
  teks TEXT NOT NULL DEFAULT '' CHECK (length(teks) <= 600),         -- teks pihak ketiga disimpan mentah, hanya dipotong; klien wajib meng-escape
  sumber TEXT NOT NULL CHECK (sumber IN ('BMKG', 'InaTEWS', 'Deteksi Pantau Bencana')),
  sumber_url TEXT CHECK (sumber_url IS NULL OR sumber_url LIKE 'https://%'),
  dibuat INTEGER NOT NULL,
  berlaku_hingga INTEGER NOT NULL,
  dicabut INTEGER,
  dicabut_oleh TEXT
);
CREATE INDEX IF NOT EXISTS peringatan_aktif ON peringatan (berlaku_hingga, dibuat DESC);
