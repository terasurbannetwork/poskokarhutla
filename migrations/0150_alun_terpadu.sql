-- 0150: Alun-alun Terpadu (paket data/kajian-bnpb/alun-terpadu/, DESAIN-TEKNIS bagian 2; KEPUTUSAN D4, D6, D9, D10, D11, D18).
-- Tabel samping untuk alun_utas/alun_balas (tidak diubah; ALTER ADD COLUMN tidak idempoten): kode kabupaten baku (D4),
-- penanda balasan atas nama lembaga (D6), riwayat status bantuan (D10), tanda tidak valid (D9). Tanpa trigger (D11):
-- riwayat append-only dijaga kode dan gerbang; menghapus utas membersihkan semua tabel samping dalam satu jalur kode.
-- kab4 = kode Kemendagri 4 digit; 2 digit pertama = provinsi (diperiksa untuk 548 kode di public/data/wilayah/indeks.json, termasuk Papua 91-96).
-- Id utas/balasan/pos 16 hex (0024), id akun instansi 16 (0029). Hanya CREATE ... IF NOT EXISTS. Idempoten.
-- Diterapkan ke produksi oleh pemilik (wrangler d1 migrations apply); kode pemakainya menyusul di AT-03 dst.
CREATE TABLE IF NOT EXISTS alun_wilayah (
  utas_id TEXT PRIMARY KEY CHECK (length(utas_id) = 16),
  prov TEXT NOT NULL CHECK (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*'),
  kab4 TEXT NOT NULL CHECK (length(kab4) = 4 AND kab4 NOT GLOB '*[^0-9]*' AND substr(kab4, 1, 2) = prov)
);
CREATE INDEX IF NOT EXISTS alun_wilayah_kab ON alun_wilayah (kab4);
CREATE INDEX IF NOT EXISTS alun_wilayah_prov ON alun_wilayah (prov);

CREATE TABLE IF NOT EXISTS alun_lembaga (
  pos_id TEXT PRIMARY KEY CHECK (length(pos_id) = 16),
  akun_id TEXT NOT NULL CHECK (length(akun_id) = 16),
  lembaga TEXT NOT NULL CHECK (length(lembaga) BETWEEN 2 AND 120),
  dibuat INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS alun_riwayat (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  utas_id TEXT NOT NULL CHECK (length(utas_id) = 16),
  dari TEXT NOT NULL CHECK (dari IN ('terbuka', 'ditangani', 'selesai')),
  ke TEXT NOT NULL CHECK (ke IN ('terbuka', 'ditangani', 'selesai')),
  pelaku TEXT NOT NULL CHECK (pelaku IN ('instansi', 'admin', 'pelapor', 'teruskan')),
  akun_id TEXT,
  lembaga TEXT CHECK (lembaga IS NULL OR length(lembaga) <= 120),
  alasan TEXT CHECK (alasan IS NULL OR alasan IN ('bantuan_tiba', 'instansi_lain', 'tidak_ditemukan', 'ganda', 'lainnya', 'belum_selesai')),
  catatan_staf TEXT CHECK (catatan_staf IS NULL OR length(catatan_staf) <= 280),
  waktu INTEGER NOT NULL,
  CHECK (dari <> ke),
  CHECK (ke <> 'selesai' OR alasan IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS alun_riwayat_utas ON alun_riwayat (utas_id, waktu);

CREATE TABLE IF NOT EXISTS alun_tanda (
  utas_id TEXT PRIMARY KEY CHECK (length(utas_id) = 16),
  tanda TEXT NOT NULL CHECK (tanda IN ('tidak_valid')),
  alasan TEXT NOT NULL CHECK (alasan IN ('bukan_kebutuhan', 'ganda', 'luar_wilayah', 'lainnya')),
  akun_id TEXT NOT NULL CHECK (length(akun_id) = 16),
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS alun_tanda_akun ON alun_tanda (akun_id, waktu);

-- indeks kursor (dibuat, id) untuk jendela baca ingest Buku Besar (pola 0132); alun_utas_dibuat (moderasi, dibuat) tidak melayani kursor tanpa moderasi.
CREATE INDEX IF NOT EXISTS alun_utas_kursor ON alun_utas (dibuat, id);
