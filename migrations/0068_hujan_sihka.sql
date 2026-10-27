-- Pos curah hujan SIHKA (type 'CURAH HUJAN', Kementerian PU Ditjen SDA) untuk Jawa-Bali, dipanen Worker tiap 5 menit (src/hujan.js); idempoten.
-- TERPISAH dari tabel sungai: bacaan hujan tidak boleh ikut status tinggi muka air. Nilai sumber = per INTERVAL (5/10 menit), bukan kumulatif.
-- hujan_baca hanya menyimpan bacaan > 0 selama 3 hari (cukup untuk 'sejak 00.00 WIB' dan 1 jam); hujan_pos menyimpan bacaan terakhir apa pun nilainya.
CREATE TABLE IF NOT EXISTS hujan_pos (
  pos TEXT PRIMARY KEY,
  nama TEXT,
  lon REAL,                       -- derajat (dari EPSG:3857 sumber)
  lat REAL,
  tz TEXT,
  merek TEXT,
  satuan TEXT,
  dilihat INTEGER,                -- detik epoch terakhir pos maju
  t_akhir INTEGER,                -- detik epoch bacaan terakhir
  v_akhir REAL,                   -- nilai bacaan terakhir (mm per interval)
  sama_sejak INTEGER              -- detik epoch sejak nilai > 0 ini tak berubah (deteksi macet)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS hujan_baca (
  pos TEXT NOT NULL,
  t INTEGER NOT NULL,             -- detik epoch UTC bacaan
  v REAL NOT NULL,                -- mm per interval, 0 < v <= 100
  PRIMARY KEY (pos, t)
) WITHOUT ROWID;
