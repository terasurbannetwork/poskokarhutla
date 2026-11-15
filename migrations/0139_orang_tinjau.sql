-- Keterpaduan KP-21: antrean tinjau admin untuk akun yang tidak bisa dipasangkan otomatis (bentrok NIP lawan WA, NIP tidak baku). Idempoten.
-- keputusan NULL = belum diputus. kandidat = larik JSON id orang (bukan data pribadi). Nama tidak pernah menjadi dasar pasangan.
CREATE TABLE IF NOT EXISTS orang_tinjau (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  akun_tabel TEXT NOT NULL CHECK (akun_tabel IN ('staf', 'instansi_akun', 'pdt_akun', 'km_akun')),
  akun_id TEXT NOT NULL CHECK (length(akun_id) = 16),
  kandidat TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(kandidat) AND json_type(kandidat) = 'array'),
  alasan TEXT NOT NULL CHECK (alasan IN ('bentrok', 'nip_tidak_baku')),
  keputusan TEXT CHECK (keputusan IS NULL OR keputusan IN ('pasang', 'tolak')),
  diputus INTEGER,
  pemutus TEXT,
  dibuat INTEGER NOT NULL,
  CHECK ((keputusan IS NULL) = (diputus IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS orang_tinjau_akun ON orang_tinjau (akun_tabel, akun_id);
CREATE INDEX IF NOT EXISTS orang_tinjau_antre ON orang_tinjau (dibuat, id) WHERE keputusan IS NULL;
