-- Nowcast peringatan dini cuaca BMKG (CAP) yang ditarik Worker tiap 10 menit (src/nowcast.js); idempoten.
CREATE TABLE IF NOT EXISTS cuaca_nowcast (
  id TEXT PRIMARY KEY,            -- <identifier> CAP
  url TEXT NOT NULL,              -- tautan _alert.xml di RSS (dasar "sudah diambil")
  selesai INTEGER NOT NULL,       -- expires, ms epoch UTC
  isi TEXT NOT NULL,              -- JSON satu peringatan (bentuk nowcast[] peringatan.json tanpa `aktif`)
  dibuat INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS cuaca_nowcast_selesai ON cuaca_nowcast (selesai);
CREATE INDEX IF NOT EXISTS cuaca_nowcast_url ON cuaca_nowcast (url);

-- kapan RSS BMKG terakhir menjawab sehat (kunci 'nowcast'); isi = {terbit: lastBuildDate RSS, item, baru, rusak, gagal}
CREATE TABLE IF NOT EXISTS cuaca_sumber (
  kunci TEXT PRIMARY KEY,
  isi TEXT,
  dibuat INTEGER NOT NULL
);
