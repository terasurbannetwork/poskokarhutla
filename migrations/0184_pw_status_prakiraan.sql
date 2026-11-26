-- Push dari status prakiraan (paket dampak-peringatan DP-13, D16 dan D30). Idempoten.
-- pw_kendali punya CHECK kunci (0163) yang tidak bisa diubah, jadi penanda berkas status dan penjaga harian memakai tabel baru.
CREATE TABLE IF NOT EXISTS pw_kendali_status (
  kunci TEXT PRIMARY KEY CHECK (kunci IN ('status_dibuat')),
  nilai TEXT NOT NULL
);
-- paling banyak satu notifikasi per perangkat per kab per jenis per hari WIB, lintas kedua pemicu (perangkat = hash endpoint, bukan endpoint)
CREATE TABLE IF NOT EXISTS pw_kirim_harian (
  perangkat TEXT NOT NULL CHECK (length(perangkat) = 16),
  kab_kode TEXT NOT NULL CHECK (kab_kode GLOB '[0-9][0-9][0-9][0-9]'),
  jenis TEXT NOT NULL CHECK (jenis IN ('BNJ','LSR','ASP','CEX')),
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  PRIMARY KEY (perangkat, kab_kode, jenis, tanggal)
) WITHOUT ROWID;
