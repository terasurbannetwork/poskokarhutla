-- Posisi pesawat terbuka (adsb.fi open data, nonkomersial) tiap jam di 7 lingkaran karhutla: bukti kehadiran helikopter/pesawat rendah. Ditulis src/adsb.js (menit 46), dibuang > 90 hari. Idempoten.
CREATE TABLE IF NOT EXISTS adsb_posisi (
  hex     TEXT    NOT NULL,
  menit   INTEGER NOT NULL,
  wilayah TEXT    NOT NULL,
  lat     REAL    NOT NULL,
  lon     REAL    NOT NULL,
  alt     INTEGER,
  gs      REAL,
  heli    INTEGER NOT NULL DEFAULT 0 CHECK (heli IN (0,1)),
  flight  TEXT,
  tipe    TEXT,
  PRIMARY KEY (hex, menit)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS adsb_posisi_menit ON adsb_posisi(menit);
