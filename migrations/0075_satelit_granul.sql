-- Riwayat kedatangan data FIRMS per satelit: satu baris per granul = (sensor, menit akuisisi). Ditulis putaran titik Worker (src/titik.js, perbaruiTitik,
-- INSERT OR IGNORE: `terlihat` = putaran PERTAMA yang melihat granul itu, tidak pernah ditimpa; granul yang akuisisinya masih di depan jam Worker melanggar
-- CHECK dan dilewati, tercatat di putaran berikutnya). Jeda terukur = terlihat - akuisisi = latensi FIRMS + tunggu putaran Worker (tiap 3 jam), yaitu "sampai tampil
-- di aplikasi". Kolom `sumber` 'pipeline' dicadangkan untuk fase 2 (titik.yml ikut menulis); penulisnya belum ada. Dipangkas 400 hari sekali sehari di cron bersih-bersih. Idempoten.
CREATE TABLE IF NOT EXISTS satelit_granul (
  sensor   TEXT    NOT NULL CHECK (sensor IN ('M','N','N20','N21')),
  akuisisi INTEGER NOT NULL,
  terlihat INTEGER NOT NULL CHECK (terlihat >= akuisisi),
  n        INTEGER NOT NULL CHECK (n >= 0),
  sumber   TEXT    NOT NULL DEFAULT 'worker' CHECK (sumber IN ('worker','pipeline')),
  PRIMARY KEY (sensor, akuisisi)
) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS satelit_granul_akuisisi ON satelit_granul(akuisisi);

-- Ringkasan jeda 30 hari berbentuk persis respons GET /api/satelit/jeda, dihitung sekali sehari oleh cron (src/satelit.js, ringkasGranul) dan disimpan sebagai satu baris;
-- endpoint publik hanya membaca baris ini (tidak pernah menghitung dari satelit_granul per permintaan, supaya miss cache di banyak colo tidak memakan kuota baca D1).
CREATE TABLE IF NOT EXISTS satelit_ringkas (
  id     INTEGER PRIMARY KEY CHECK (id = 1),
  isi    TEXT    NOT NULL,
  dibuat INTEGER NOT NULL
);
