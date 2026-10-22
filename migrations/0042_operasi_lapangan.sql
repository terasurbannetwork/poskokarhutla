-- Operasi lapangan (src/operasi_lapangan.js; docs/bnpb/RENCANA-OPERASI-LAPANGAN.md L4-L13). Waktu = ms epoch UTC. Idempoten (IF NOT EXISTS). Hanya tabel baru.
-- Tabel yang menempel pada satu tugas api memakai ON DELETE CASCADE (retensi tugas_api 180 hari ikut membuang isinya). Sumber air, patroli, TMAT berdiri sendiri (tanpa FK ke tugas).
-- Daftar tetap (jenis, kondisi, status) HARUS sama dengan src/operasi_lapangan.js; tests/warga/operasi_lapangan.test.mjs menjaganya.
-- Semua tabel punya kolom dummy (0/1): diisi dan dihapus oleh POST /api/ops/dummy (Super Admin).

-- Garis hasil rekam jalan penugasan_posisi atau koordinat kiriman. koordinat = larik [lon, lat] (urutan GeoJSON), 2-500 titik; panjang dan luas dihitung Worker.
CREATE TABLE IF NOT EXISTS ops_garis (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  tugas_id TEXT NOT NULL REFERENCES tugas_api (id) ON DELETE CASCADE,
  penugasan_id TEXT REFERENCES penugasan (id) ON DELETE SET NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('garis_api', 'padam', 'sektor_aktif', 'sektor_dingin')),
  koordinat TEXT NOT NULL CHECK (json_valid(koordinat) AND json_type(koordinat) = 'array' AND json_array_length(koordinat) BETWEEN 2 AND 500 AND length(koordinat) <= 40000),
  n_titik INTEGER NOT NULL CHECK (n_titik BETWEEN 2 AND 500),
  panjang_km REAL NOT NULL CHECK (panjang_km >= 0),
  luas_ha REAL CHECK (luas_ha IS NULL OR luas_ha >= 0),
  tertutup INTEGER NOT NULL DEFAULT 0 CHECK (tertutup IN (0, 1)),
  sumber TEXT NOT NULL CHECK (sumber IN ('rekam', 'kirim')),
  mulai INTEGER,
  selesai INTEGER,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS ops_garis_tugas ON ops_garis (tugas_id, dibuat);

-- Sumber air yang dilaporkan lapangan (L5). tugas_id = tugas yang melaporkan (tanpa FK: sumber air tetap berguna sesudah tugas dibuang).
CREATE TABLE IF NOT EXISTS ops_sumber_air (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  tugas_id TEXT CHECK (tugas_id IS NULL OR length(tugas_id) = 16),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  jenis TEXT NOT NULL CHECK (jenis IN ('sungai', 'kanal', 'embung', 'sumur_bor', 'sekat_kanal', 'hidran', 'lainnya')),
  kondisi TEXT NOT NULL CHECK (kondisi IN ('ada_air', 'kering', 'tidak_tahu')),
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS ops_sumber_air_wilayah ON ops_sumber_air (prov, lat, lon);

-- Rencana aksi periode operasi (L6). sektor dan regu = larik teks.
CREATE TABLE IF NOT EXISTS ops_periode (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  tugas_id TEXT NOT NULL REFERENCES tugas_api (id) ON DELETE CASCADE,
  mulai INTEGER NOT NULL,
  selesai INTEGER NOT NULL,
  sasaran TEXT CHECK (sasaran IS NULL OR length(sasaran) <= 500),
  sektor TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(sektor) AND json_type(sektor) = 'array' AND json_array_length(sektor) <= 20),
  regu TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(regu) AND json_type(regu) = 'array' AND json_array_length(regu) <= 40),
  alat TEXT CHECK (alat IS NULL OR length(alat) <= 400),
  pj TEXT CHECK (pj IS NULL OR length(pj) <= 80),
  komunikasi TEXT CHECK (komunikasi IS NULL OR length(komunikasi) <= 200),
  keselamatan TEXT CHECK (keselamatan IS NULL OR length(keselamatan) <= 600),
  cuaca TEXT CHECK (cuaca IS NULL OR length(cuaca) <= 300),
  status TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'terbit', 'selesai')),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (selesai > mulai)
);
CREATE INDEX IF NOT EXISTS ops_periode_tugas ON ops_periode (tugas_id, mulai);

-- Serah terima antar periode: hanya menambah.
CREATE TABLE IF NOT EXISTS ops_serah (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  periode_id TEXT NOT NULL REFERENCES ops_periode (id) ON DELETE CASCADE,
  dari TEXT NOT NULL CHECK (length(dari) BETWEEN 2 AND 80),
  ke TEXT NOT NULL CHECK (length(ke) BETWEEN 2 AND 80),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  waktu INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS ops_serah_periode ON ops_serah (periode_id, waktu);

-- Permintaan dari lapangan (L7 heli water bombing, L8 logistik regu). Status heli: diminta, disetujui, dijadwalkan, selesai, ditolak.
-- Status logistik (sama dengan meja Logistik): diminta, disetujui, dikirim, diterima, ditolak. Transisi sah dijaga Worker (UPDATE ... WHERE status = lama).
CREATE TABLE IF NOT EXISTS ops_permintaan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  tugas_id TEXT NOT NULL REFERENCES tugas_api (id) ON DELETE CASCADE,
  jenis TEXT NOT NULL CHECK (jenis IN ('heli', 'logistik')),
  status TEXT NOT NULL DEFAULT 'diminta' CHECK (status IN ('diminta', 'disetujui', 'dijadwalkan', 'selesai', 'dikirim', 'diterima', 'ditolak')),
  prioritas TEXT NOT NULL DEFAULT 'sedang' CHECK (prioritas IN ('rendah', 'sedang', 'tinggi', 'darurat')),
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  luas_ha REAL CHECK (luas_ha IS NULL OR (luas_ha >= 0 AND luas_ha <= 100000)),
  sumber_dari TEXT CHECK (sumber_dari IS NULL OR sumber_dari IN ('sumber_air', 'kanal')),
  sumber_id TEXT CHECK (sumber_id IS NULL OR length(sumber_id) = 16),
  sumber_lat REAL,
  sumber_lon REAL,
  sumber_km REAL CHECK (sumber_km IS NULL OR sumber_km >= 0),
  barang TEXT CHECK (barang IS NULL OR length(barang) BETWEEN 2 AND 40),
  barang_ket TEXT CHECK (barang_ket IS NULL OR length(barang_ket) <= 100),
  jumlah REAL CHECK (jumlah IS NULL OR (jumlah > 0 AND jumlah <= 1e7)),
  satuan TEXT CHECK (satuan IS NULL OR length(satuan) BETWEEN 1 AND 20),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  meja_id TEXT CHECK (meja_id IS NULL OR length(meja_id) = 16),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  CHECK (jenis != 'logistik' OR (barang IS NOT NULL AND jumlah IS NOT NULL AND satuan IS NOT NULL)),
  CHECK (jenis = 'logistik' OR status NOT IN ('dikirim', 'diterima')),
  CHECK (jenis = 'heli' OR status NOT IN ('dijadwalkan', 'selesai'))
);
CREATE INDEX IF NOT EXISTS ops_permintaan_tugas ON ops_permintaan (tugas_id, dibuat);
CREATE INDEX IF NOT EXISTS ops_permintaan_status ON ops_permintaan (status, jenis);

-- Log drop air heli (L7). hasil dihitung Worker dari titik panas FIRMS (1 km) dan Himawari (2 km) dalam 6 jam sesudah drop; NULL = belum dinilai.
CREATE TABLE IF NOT EXISTS ops_drop (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  permintaan_id TEXT NOT NULL REFERENCES ops_permintaan (id) ON DELETE CASCADE,
  tugas_id TEXT NOT NULL REFERENCES tugas_api (id) ON DELETE CASCADE,
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  liter INTEGER NOT NULL CHECK (liter BETWEEN 1 AND 30000),
  pada INTEGER NOT NULL,
  hasil TEXT CHECK (hasil IS NULL OR hasil IN ('ada_titik', 'tanpa_titik', 'tak_dinilai')),
  hasil_n INTEGER CHECK (hasil_n IS NULL OR hasil_n >= 0),
  hasil_pada INTEGER,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS ops_drop_permintaan ON ops_drop (permintaan_id, pada);
CREATE INDEX IF NOT EXISTS ops_drop_tugas ON ops_drop (tugas_id, pada);

-- Peristiwa tambahan untuk linimasa (L9): perpindahan status permintaan, terbit/selesai periode, serah terima. Hanya menambah.
CREATE TABLE IF NOT EXISTS ops_jejak (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tugas_id TEXT NOT NULL REFERENCES tugas_api (id) ON DELETE CASCADE,
  waktu INTEGER NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('permintaan', 'periode')),
  ref_id TEXT NOT NULL CHECK (length(ref_id) = 16),
  ket TEXT NOT NULL CHECK (length(ket) BETWEEN 2 AND 300),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS ops_jejak_tugas ON ops_jejak (tugas_id, waktu);

-- Catatan pelajaran pasca-operasi (L9).
CREATE TABLE IF NOT EXISTS ops_pelajaran (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  tugas_id TEXT NOT NULL REFERENCES tugas_api (id) ON DELETE CASCADE,
  catatan TEXT NOT NULL CHECK (length(catatan) BETWEEN 5 AND 1000),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS ops_pelajaran_tugas ON ops_pelajaran (tugas_id, dibuat);

-- Patroli pencegahan non-api (L10). akun_id = akun instansi penanggung jawab (tanpa FK: akun dummy dan akun dicabut tidak menghalangi).
CREATE TABLE IF NOT EXISTS ops_patroli (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) BETWEEN 2 AND 60),
  kec TEXT NOT NULL CHECK (length(kec) BETWEEN 1 AND 60),
  desa TEXT CHECK (desa IS NULL OR length(desa) BETWEEN 1 AND 60),
  alasan TEXT NOT NULL CHECK (alasan IN ('risiko', 'khg', 'lainnya')),
  alasan_ket TEXT CHECK (alasan_ket IS NULL OR length(alasan_ket) <= 300),
  jadwal INTEGER NOT NULL,
  akun_id TEXT CHECK (akun_id IS NULL OR length(akun_id) = 16),
  status TEXT NOT NULL DEFAULT 'terjadwal' CHECK (status IN ('terjadwal', 'dikunjungi', 'terlewat')),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS ops_patroli_wilayah ON ops_patroli (prov, kab, jadwal);

-- Kunjungan patroli: titik GPS (atau foto GPS lewat instansi_media bila ada) dan catatan. Hanya menambah.
CREATE TABLE IF NOT EXISTS ops_kunjungan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patroli_id TEXT NOT NULL REFERENCES ops_patroli (id) ON DELETE CASCADE,
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  akurasi REAL CHECK (akurasi IS NULL OR (akurasi >= 0 AND akurasi <= 1000)),
  media_id TEXT CHECK (media_id IS NULL OR length(media_id) = 16),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  pada INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS ops_kunjungan_patroli ON ops_kunjungan (patroli_id, pada);

-- Unggahan CSV drone termal (L12): satu baris per unggahan, titiknya di ops_drone. Batas 2000 titik per tugas dijaga Worker.
CREATE TABLE IF NOT EXISTS ops_drone_unggah (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  tugas_id TEXT NOT NULL REFERENCES tugas_api (id) ON DELETE CASCADE,
  alat TEXT NOT NULL CHECK (length(alat) BETWEEN 2 AND 80),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 300),
  n INTEGER NOT NULL CHECK (n BETWEEN 1 AND 2000),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dibuat INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS ops_drone_unggah_tugas ON ops_drone_unggah (tugas_id, dibuat);

CREATE TABLE IF NOT EXISTS ops_drone (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unggah_id TEXT NOT NULL REFERENCES ops_drone_unggah (id) ON DELETE CASCADE,
  tugas_id TEXT NOT NULL REFERENCES tugas_api (id) ON DELETE CASCADE,
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  suhu_c REAL NOT NULL CHECK (suhu_c BETWEEN -40 AND 1500),
  waktu INTEGER NOT NULL,
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))
);
CREATE INDEX IF NOT EXISTS ops_drone_tugas ON ops_drone (tugas_id, waktu);

-- TMAT stasiun (L13), impor CSV moderator. Kunci (stasiun, waktu): unggah ulang pembacaan yang sama menimpa. Tarikan otomatis BRGM menunggu akses resmi.
CREATE TABLE IF NOT EXISTS ops_tmat (
  stasiun TEXT NOT NULL CHECK (length(stasiun) BETWEEN 2 AND 30),
  waktu INTEGER NOT NULL,
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  tmat_cm REAL NOT NULL CHECK (tmat_cm BETWEEN -500 AND 300),
  sumber TEXT NOT NULL CHECK (length(sumber) BETWEEN 2 AND 60),
  diunggah INTEGER NOT NULL,
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 3 AND 40),
  dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1)),
  PRIMARY KEY (stasiun, waktu)
);
CREATE INDEX IF NOT EXISTS ops_tmat_peta ON ops_tmat (lat, lon);
