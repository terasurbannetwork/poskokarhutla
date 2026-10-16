-- Katalog gempa hampir-waktu-nyata (src/gempa.js, cron "* * * * *"): BMKG + USGS digabung, kejadian G0001.. dikelompokkan Worker.
-- Waktu = milidetik epoch UTC. Idempoten: aman dijalankan ulang.
CREATE TABLE IF NOT EXISTS gempa (
  id TEXT PRIMARY KEY,                                            -- "b:"+DateTime+"|"+Coordinates (BMKG) atau "u:"+id USGS
  t INTEGER NOT NULL,
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94 AND 142),
  m REAL NOT NULL CHECK (m BETWEEN 0 AND 10),
  mtipe TEXT,
  dalam REAL CHECK (dalam IS NULL OR dalam >= 0),
  wilayah TEXT NOT NULL DEFAULT '' CHECK (length(wilayah) <= 200),   -- teks Wilayah BMKG / place USGS apa adanya
  prov TEXT CHECK (prov IS NULL OR length(prov) <= 2),               -- NULL = lebih dari 300 km dari pusat kecamatan mana pun
  kab TEXT CHECK (kab IS NULL OR length(kab) <= 80),
  sumber TEXT NOT NULL CHECK (sumber IN ('bmkg', 'usgs', 'gabung')),
  potensi INTEGER CHECK (potensi IS NULL OR potensi BETWEEN 0 AND 3), -- NULL = BMKG tidak menyebut tsunami (BUKAN "aman")
  potensi_teks TEXT,
  dirasakan TEXT,
  mmi_maks REAL,
  shakemap TEXT,
  pager TEXT,
  usgs_id TEXT,
  tsunami_usgs INTEGER CHECK (tsunami_usgs IS NULL OR tsunami_usgs IN (0, 1)),
  kej TEXT,
  diperbarui INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS gempa_t ON gempa (t DESC);
CREATE INDEX IF NOT EXISTS gempa_m_t ON gempa (m, t);
CREATE INDEX IF NOT EXISTS gempa_kej ON gempa (kej, t);

CREATE TABLE IF NOT EXISTS gempa_kejadian (
  kode TEXT PRIMARY KEY CHECK (kode GLOB 'G[0-9][0-9][0-9][0-9]*'),
  utama_id TEXT NOT NULL,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  mulai INTEGER NOT NULL,
  akhir INTEGER NOT NULL,
  m REAL NOT NULL,
  nama TEXT NOT NULL DEFAULT '',
  aktif_hingga INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS gempa_kejadian_mulai ON gempa_kejadian (mulai DESC);

-- ETag per sumber + kapan terakhir berhasil (200 atau 304) + ringkasan putaran terakhir
CREATE TABLE IF NOT EXISTS gempa_sumber (
  kunci TEXT PRIMARY KEY,
  etag TEXT,
  isi TEXT,
  dibuat INTEGER NOT NULL
);
