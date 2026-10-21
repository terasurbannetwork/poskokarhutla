-- C1 tautan Alun-alun -> relawan/logistik dan C2 antrean pengingat (src/alun.js, src/pengingat.js). Idempoten (IF NOT EXISTS).
-- alun_tautan: satu utas boleh banyak tautan. tujuan_id menunjuk relawan_permintaan.id atau meja_catatan.id (sengaja tanpa FK: dua tabel berbeda).
CREATE TABLE IF NOT EXISTS alun_tautan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  utas_id TEXT NOT NULL REFERENCES alun_utas (id),
  jenis TEXT NOT NULL CHECK (jenis IN ('relawan', 'logistik')),
  tujuan_id TEXT NOT NULL CHECK (length(tujuan_id) = 16),
  dibuat INTEGER NOT NULL,
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (utas_id, jenis, tujuan_id)
);
CREATE INDEX IF NOT EXISTS alun_tautan_utas ON alun_tautan (utas_id);

-- F2 prioritas_dampak: sumber_id = 16 hex hash prov|kab|kec, keadaan = 'k<kelas>' (naik kelas = baris baru).
-- pengingat: ANTREAN yang dibuat cron harian; admin yang menekan kirim (tidak ada kiriman otomatis).
-- keadaan = keadaan sumber saat terdeteksi (mis. 'diminta', 'segera_habis:2026-12-01'). Unik per (jenis, sumber, keadaan): hal yang sama tidak
-- berulang tiap hari; baris baru lahir hanya bila keadaan sumber berubah. tanggal = hari WIB terdeteksi.
CREATE TABLE IF NOT EXISTS pengingat (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  jenis TEXT NOT NULL CHECK (jenis IN ('mou_relawan', 'pks_riset', 'logistik_lambat', 'dsp_spj', 'renkon', 'rehab_macet', 'stok_rendah', 'bantuan_terbuka', 'prioritas_dampak')),
  sumber_id TEXT NOT NULL CHECK (length(sumber_id) = 16),
  keadaan TEXT NOT NULL CHECK (length(keadaan) BETWEEN 1 AND 60),
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 3 AND 160),
  rincian TEXT CHECK (rincian IS NULL OR length(rincian) <= 300),
  muatan TEXT CHECK (muatan IS NULL OR length(muatan) <= 600),   -- prioritas_dampak: JSON agregat publik {kec, kab, kelas, bahaya, jiwa, bpbd, wa, hari}; jenis lain NULL
  prov TEXT CHECK (prov IS NULL OR (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*')),
  kab TEXT CHECK (kab IS NULL OR length(kab) BETWEEN 2 AND 60),
  status TEXT NOT NULL DEFAULT 'baru' CHECK (status IN ('baru', 'dikirim', 'selesai', 'abaikan')),
  dikirim_pada INTEGER,
  oleh TEXT CHECK (oleh IS NULL OR length(oleh) <= 64),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  UNIQUE (jenis, sumber_id, keadaan)
);
CREATE INDEX IF NOT EXISTS pengingat_status ON pengingat (status, jenis, dibuat);
