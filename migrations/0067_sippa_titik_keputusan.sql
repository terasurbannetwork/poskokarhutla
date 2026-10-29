-- SP-103: titik panas baru dalam 2 km dari kompleks SIPPA zona A atau B (ditulis cron FIRMS, src/sippa_titik.js; dibaca Meja Pantau sebagai butir sippa_titik).
-- SP-115: keputusan jalan atau tunda per kompleks (POST /api/sippa/keputusan). Jejaknya ikut ke pantau_jejak (obyek 'sippa_keputusan:<id>'). Idempoten.
CREATE TABLE IF NOT EXISTS sippa_titik_dekat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kompleks_id TEXT NOT NULL CHECK (length(kompleks_id) BETWEEN 2 AND 11),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  kab TEXT,
  zona TEXT NOT NULL CHECK (zona IN ('A', 'B')),
  jarak_km REAL NOT NULL CHECK (jarak_km >= 0 AND jarak_km <= 2),
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS sippa_titik_dekat_kompleks ON sippa_titik_dekat (kompleks_id, dibuat);

-- Penanda putaran titik_terbaru terakhir yang alarmnya selesai diproses; putaran berikut dibandingkan dengan putaran ini, bukan sekadar putaran sebelumnya.
CREATE TABLE IF NOT EXISTS titik_proses_sippa (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  putaran INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sippa_keputusan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kompleks_id TEXT NOT NULL CHECK (length(kompleks_id) BETWEEN 2 AND 11),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  putusan TEXT NOT NULL CHECK (putusan IN ('jalan', 'tunda')),
  alasan TEXT NOT NULL CHECK (length(alasan) BETWEEN 3 AND 300),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS sippa_keputusan_waktu ON sippa_keputusan (waktu);
