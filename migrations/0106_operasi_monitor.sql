-- Monitoring operasi udara (3 Nov 2026): foto grup satgas yang diindeks dan hasil per aksi. Waktu = ms epoch UTC. Idempoten: IF NOT EXISTS.
-- Tabel samping, bukan ALTER op_gerak: ADD COLUMN tidak idempoten dan CHECK op_gerak.jenis tidak bisa diubah.
-- op_foto: berkas fisik ada di R2 (kunci di wa_masuk.berkas lewat wa_id). jam_utc/lat/lon/registrasi dari stempel foto atau keterangan; kosong bila tak terbaca. gerak_id = aksi (op_gerak) hasil pemasangan.
CREATE TABLE IF NOT EXISTS op_foto (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  wa_id      INTEGER NOT NULL,
  diterima   INTEGER NOT NULL,
  tanggal    TEXT NOT NULL CHECK (length(tanggal) = 10 AND tanggal GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  registrasi TEXT,
  jam_utc    INTEGER,
  lat        REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon        REAL CHECK (lon IS NULL OR lon BETWEEN 94.5 AND 141.5),
  stempel    TEXT,
  gerak_id   INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS op_foto_wa ON op_foto(wa_id);
CREATE INDEX IF NOT EXISTS op_foto_gerak ON op_foto(gerak_id);
CREATE INDEX IF NOT EXISTS op_foto_tanggal ON op_foto(tanggal);
-- op_gerak_hasil: satu baris per gerak yang punya catatan tambahan. hasil = padam/masih_api hanya setelah dinilai cron FIRMS (tak ada baris = menunggu atau tak dinilai);
-- sumber_lokasi = foto/temuan bila koordinat gerak berasal dari sana (selain itu teks); drops/liter/lapor/luas dari laporan "After WB"; menit_terbang dari "Arr Mov".
CREATE TABLE IF NOT EXISTS op_gerak_hasil (
  gerak_id         INTEGER PRIMARY KEY,
  sumber_lokasi    TEXT CHECK (sumber_lokasi IS NULL OR sumber_lokasi IN ('foto', 'temuan')),
  hasil            TEXT CHECK (hasil IS NULL OR hasil IN ('padam', 'masih_api')),
  dicek            INTEGER,
  titik_dekat      INTEGER,
  drops            INTEGER,
  liter            INTEGER,
  lapor            TEXT CHECK (lapor IS NULL OR lapor IN ('masih_berasap', 'padam')),
  luas_terbakar_ha REAL,
  luas_padam_ha    REAL,
  menit_terbang    INTEGER
);
