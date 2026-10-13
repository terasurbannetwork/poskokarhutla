-- Titik panas hampir-waktu-nyata (src/titik.js, cron tiap 3 jam). Satu baris per putaran, 8 terakhir disimpan.
CREATE TABLE titik_terbaru (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dibuat INTEGER NOT NULL,
  isi TEXT NOT NULL CHECK (json_valid(isi) AND coalesce(json_type(isi, '$.baris'), '') = 'array' AND length(isi) <= 2000000)
);
