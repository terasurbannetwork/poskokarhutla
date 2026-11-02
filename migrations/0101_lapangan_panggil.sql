-- Pegawai dan Relawan Lapangan, tahap C (data/kajian-bnpb/lapangan/KONTRAK-TAHAP-C.md): panggilan relawan lewat bot WA, penanda keahlian orang, kit logbook. Idempoten (CREATE IF NOT EXISTS).
-- Enum di CHECK HARUS sama dengan src/lapangan_konst.js (dijaga tests/warga/lapangan_skema.test.mjs). Waktu = ms epoch UTC.
-- lp_panggil.id SAMA dengan relawan_permintaan.id (satu permintaan per panggilan): penugasan relawan memakai tabel relawan_penugasan yang sudah ada (LP-041), tanpa kolom rujukan baru.
-- kode_balas: 6 huruf besar acak, UNIQUE; balasan WA SIAP/TIDAK hanya sah bila nomor pengirim = nomor relawan penerimanya. relawan_id tanpa FK (rujukan lunak, relawan boleh dianonimkan).
CREATE TABLE IF NOT EXISTS lp_panggil (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  tugas_id TEXT NOT NULL REFERENCES lp_tugas (id) ON DELETE CASCADE,
  keahlian TEXT NOT NULL CHECK (json_valid(keahlian) AND json_type(keahlian) = 'array' AND json_array_length(keahlian) BETWEEN 1 AND 5),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT CHECK (kab IS NULL OR length(kab) BETWEEN 2 AND 60),
  kuota INTEGER NOT NULL CHECK (kuota BETWEEN 1 AND 100),
  batas INTEGER NOT NULL,
  pesan TEXT CHECK (pesan IS NULL OR length(pesan) <= 300),
  status TEXT NOT NULL DEFAULT 'buka' CHECK (status IN ('buka', 'penuh', 'tutup')),
  dibuat_oleh TEXT CHECK (dibuat_oleh IS NULL OR length(dibuat_oleh) <= 64),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS lp_panggil_tugas ON lp_panggil (tugas_id, dibuat);

CREATE TABLE IF NOT EXISTS lp_panggil_penerima (
  panggil_id TEXT NOT NULL REFERENCES lp_panggil (id) ON DELETE CASCADE,
  relawan_id TEXT NOT NULL CHECK (length(relawan_id) = 16),
  kode_balas TEXT NOT NULL UNIQUE CHECK (length(kode_balas) = 6 AND kode_balas NOT GLOB '*[^A-Z]*'),
  status TEXT NOT NULL DEFAULT 'antre' CHECK (status IN ('antre', 'terkirim', 'gagal', 'siap', 'tidak', 'penuh')),
  waktu INTEGER NOT NULL,
  PRIMARY KEY (panggil_id, relawan_id)
);
CREATE INDEX IF NOT EXISTS lp_panggil_penerima_relawan ON lp_panggil_penerima (relawan_id);

-- penanda keahlian di data induk (drone, pompa, medis, ...), diisi Super Admin; bukti = nomor lisensi/sertifikat ringkas
CREATE TABLE IF NOT EXISTS orang_keahlian (
  orang_id TEXT NOT NULL REFERENCES orang (id) ON DELETE CASCADE,
  keahlian TEXT NOT NULL CHECK (length(keahlian) BETWEEN 2 AND 30 AND keahlian NOT GLOB '*[^a-z_]*'),
  bukti TEXT CHECK (bukti IS NULL OR length(bukti) <= 200),
  dibuat INTEGER NOT NULL,
  PRIMARY KEY (orang_id, keahlian)
);

-- kit/peralatan yang dipakai pada satu logbook: kit_id = sippa_kit.id (16 hex) atau nama bebas
CREATE TABLE IF NOT EXISTS lp_logbook_kit (
  logbook_id TEXT NOT NULL REFERENCES lp_logbook (id) ON DELETE CASCADE,
  kit_id TEXT NOT NULL CHECK (length(kit_id) BETWEEN 1 AND 60),
  jumlah INTEGER NOT NULL DEFAULT 1 CHECK (jumlah BETWEEN 1 AND 9999),
  PRIMARY KEY (logbook_id, kit_id)
);
