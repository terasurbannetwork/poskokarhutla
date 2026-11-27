-- Laporan OMC posko dari WA (data/kajian-bnpb/semai-banjir/ KEPUTUSAN K7, K8; tiket SB-33). Hanya CREATE ... IF NOT EXISTS, tanpa trigger.
-- Tanpa nama orang dan tanpa nomor HP: hanya hasil pengurai scripts/wa/urai_omc_posko.mjs yang disaring rute. sidik = SHA-256 isi, menolak kiriman ganda.
CREATE TABLE IF NOT EXISTS op_omc_lapor (
  id            TEXT PRIMARY KEY,
  tanggal       TEXT NOT NULL CHECK (length(tanggal) = 10),
  prov_kode     TEXT NOT NULL CHECK (length(prov_kode) = 2),
  prov_nama     TEXT NOT NULL CHECK (length(prov_nama) BETWEEN 1 AND 60),
  posko_json    TEXT NOT NULL CHECK (length(posko_json) <= 2000),
  armada_json   TEXT NOT NULL CHECK (length(armada_json) <= 40000),
  sorti_hari    INTEGER NOT NULL CHECK (sorti_hari >= 0),
  kg_hari       REAL NOT NULL CHECK (kg_hari >= 0),
  kumulatif_json TEXT NOT NULL CHECK (length(kumulatif_json) <= 4000),
  sidik         TEXT NOT NULL CHECK (length(sidik) = 64),
  dibuat        TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS op_omc_lapor_sidik ON op_omc_lapor(sidik);
CREATE INDEX IF NOT EXISTS op_omc_lapor_tgl ON op_omc_lapor(tanggal, prov_kode);
