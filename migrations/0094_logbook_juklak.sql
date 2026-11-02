-- Logbook sesuai Juklak BNPB 7/2023 (src/logbook.js; spek docs/superpowers/specs/2026-11-01-pusdalops-standar.md butir W1). Idempoten (CREATE IF NOT EXISTS).
-- logbook_kejadian dan logbook_entri TIDAK diubah (ALTER ADD COLUMN tidak idempoten di SQLite; 0091 sudah membangun ulang keduanya). Medan baru tinggal di tabel samping 1:1 (pola 0027/0055).
-- Semua medan baru opsional; kejadian dan entri lama tetap sah tanpa baris samping. ON DELETE CASCADE: baris samping ikut hilang bersama induknya.
-- KIB kejadian lama TIDAK diisi di sini: kode kab/kota 4 angka (BPS) tidak ada di D1 (kejadian hanya menyimpan nama kab), jadi tidak bisa ditentukan deterministik dari SQL.
--   Kejadian lama mendapat KIB pada entri berikutnya bila klien mengirim kab_bps.

-- KIB 16 digit per kejadian: PPKK (BPS prov+kab) KKK (kode bencana DIBI) YYYYMMDD (tanggal mulai WIB) I (indeks 1-9 per prov-kab-kode-tanggal); urut = jumlah entri sejauh ini (sufiks -001, -002, ...).
CREATE TABLE IF NOT EXISTS logbook_kib (
  kejadian_id TEXT PRIMARY KEY REFERENCES logbook_kejadian (id) ON DELETE CASCADE,
  kib TEXT NOT NULL UNIQUE CHECK (length(kib) = 16 AND kib NOT GLOB '*[^0-9]*'),
  urut INTEGER NOT NULL DEFAULT 0 CHECK (urut >= 0)
);

-- Medan juklak per entri (nilai terkini, seperti angka dampak). Kolom JSON: larik/objek tervalidasi di src/logbook.js (periksaJuklak); NULL = tidak dilaporkan.
CREATE TABLE IF NOT EXISTS logbook_entri_juklak (
  entri_id TEXT PRIMARY KEY REFERENCES logbook_entri (id) ON DELETE CASCADE,
  kib_entri TEXT CHECK (kib_entri IS NULL OR (length(kib_entri) = 20 AND substr(kib_entri, 17, 1) = '-')),
  kerugian_juta REAL CHECK (kerugian_juta IS NULL OR kerugian_juta >= 0),
  korban TEXT CHECK (korban IS NULL OR (json_valid(korban) AND json_type(korban) = 'object')),
  rentan TEXT CHECK (rentan IS NULL OR (json_valid(rentan) AND json_type(rentan) = 'object')),
  prasarana TEXT CHECK (prasarana IS NULL OR (json_valid(prasarana) AND json_type(prasarana) = 'array')),
  kebutuhan_rinci TEXT CHECK (kebutuhan_rinci IS NULL OR (json_valid(kebutuhan_rinci) AND json_type(kebutuhan_rinci) = 'array')),
  pemberi TEXT CHECK (pemberi IS NULL OR (json_valid(pemberi) AND json_type(pemberi) = 'array')),
  dokumentasi TEXT CHECK (dokumentasi IS NULL OR (json_valid(dokumentasi) AND json_type(dokumentasi) = 'array')),
  posko TEXT CHECK (posko IS NULL OR (json_valid(posko) AND json_type(posko) = 'object'))
);

-- SK status darurat per kejadian (SK provinsi didahulukan saat dibaca). Tanggal ISO YYYY-MM-DD; perpanjangan_ke 0 = SK awal.
CREATE TABLE IF NOT EXISTS logbook_sk (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  kejadian_id TEXT NOT NULL REFERENCES logbook_kejadian (id) ON DELETE CASCADE,
  tingkat TEXT NOT NULL CHECK (tingkat IN ('siaga', 'tanggap', 'transisi')),
  wilayah TEXT NOT NULL CHECK (wilayah IN ('prov', 'kab')),
  nomor TEXT NOT NULL CHECK (length(nomor) BETWEEN 1 AND 80),
  tgl_sk TEXT CHECK (tgl_sk IS NULL OR tgl_sk GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  tmt_mulai TEXT NOT NULL CHECK (tmt_mulai GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  tmt_selesai TEXT CHECK (tmt_selesai IS NULL OR (tmt_selesai GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]' AND tmt_selesai >= tmt_mulai)),
  perpanjangan_ke INTEGER NOT NULL DEFAULT 0 CHECK (perpanjangan_ke BETWEEN 0 AND 20),
  tautan TEXT CHECK (tautan IS NULL OR (length(tautan) <= 300 AND tautan LIKE 'https://%')),
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dibuat INTEGER NOT NULL,
  UNIQUE (kejadian_id, nomor)
);
CREATE INDEX IF NOT EXISTS logbook_sk_kejadian ON logbook_sk (kejadian_id, wilayah, tmt_mulai);
