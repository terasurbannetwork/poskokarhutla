-- Uji lapangan banjir (src/uji_banjir.js, POST /api/instansi/uji-banjir): label nyata untuk menguji status banjir di peta.
-- sampel 'genangan' = petugas menemukan genangan (tinggi, luas kira-kira, lama); 'kontrol' = lokasi berstatus Aman yang dicek dan TIDAK tergenang (tanpa ini hanya positif yang terhitung).
-- status_peta (0 Aman, 1 Waspada, 2 Siaga, 3 Awas) dibaca SERVER dari status.json hari ke-0 untuk kecamatan itu, bukan dari kiriman klien.
-- Koordinat dibulatkan 3 desimal (~110 m) dan tidak pernah keluar lewat API agregat. foto_id merujuk foto bergeotag di tabel foto (tanpa REFERENCES: foto bisa dihapus lebih cepat). Idempoten.
CREATE TABLE IF NOT EXISTS uji_banjir (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  akun_id TEXT NOT NULL REFERENCES instansi_akun (id) ON DELETE CASCADE,
  sampel TEXT NOT NULL CHECK (sampel IN ('genangan', 'kontrol')),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 80),
  kec TEXT NOT NULL CHECK (length(kec) BETWEEN 2 AND 80),
  hari_status TEXT NOT NULL CHECK (length(hari_status) = 10 AND hari_status GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  status_peta INTEGER NOT NULL CHECK (status_peta BETWEEN 0 AND 3),
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  tinggi_cm INTEGER CHECK (tinggi_cm IS NULL OR tinggi_cm BETWEEN 1 AND 1000),
  luas_ha REAL CHECK (luas_ha IS NULL OR (luas_ha > 0 AND luas_ha <= 100000)),
  lama_jam INTEGER CHECK (lama_jam IS NULL OR lama_jam BETWEEN 0 AND 720),
  foto_id TEXT CHECK (foto_id IS NULL OR (length(foto_id) = 16 AND foto_id NOT GLOB '*[^0-9a-f]*')),
  waktu INTEGER NOT NULL,
  dibuat INTEGER NOT NULL,
  CHECK (sampel = 'genangan' OR (status_peta = 0 AND tinggi_cm IS NULL AND luas_ha IS NULL AND lama_jam IS NULL)),
  CHECK (sampel = 'kontrol' OR (tinggi_cm IS NOT NULL AND lama_jam IS NOT NULL))
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS uji_banjir_waktu ON uji_banjir (waktu);
CREATE INDEX IF NOT EXISTS uji_banjir_akun ON uji_banjir (akun_id, dibuat);
