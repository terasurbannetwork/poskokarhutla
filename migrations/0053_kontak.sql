-- Buku kontak pemangku kepentingan (src/kontak.js; nama tabel bukan 'kontak' karena itu sudah dipakai laporan warga 0001): kepala daerah, BPBD, TNI, Polri, Manggala Agni, dan lainnya. Diisi admin (status aktif) atau lewat registrasi publik /daftar-kontak (status menunggu, admin menyetujui). Tidak pernah keluar di rute publik.
-- Bukan akun: pemilik baris tidak masuk ke situs. Kolom notif/ambang disiapkan untuk notifikasi kejadian (WA/email) per wilayah, belum dipakai pengirim apa pun.
-- Wilayah: prov NULL = tingkat nasional; kab hanya bersama prov, ejaan sama dengan kunci public/banjir/data/pusat_kec.json. Waktu = ms epoch UTC. Idempoten.
CREATE TABLE IF NOT EXISTS kontak_pemangku (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 2 AND 100),
  jabatan TEXT NOT NULL CHECK (length(jabatan) BETWEEN 2 AND 100),
  lembaga TEXT CHECK (lembaga IS NULL OR length(lembaga) BETWEEN 2 AND 120),
  kategori TEXT NOT NULL CHECK (kategori IN ('kepala_daerah', 'bpbd', 'tni', 'polri', 'kemenhut', 'bmkg', 'bnpb', 'pemda', 'swasta', 'lainnya')),
  prov TEXT CHECK (prov IS NULL OR (length(prov) = 2 AND prov NOT GLOB '*[^0-9]*')),
  kab TEXT CHECK (kab IS NULL OR length(kab) BETWEEN 2 AND 60),
  wa TEXT CHECK (wa IS NULL OR (length(wa) BETWEEN 10 AND 15 AND wa GLOB '62[0-9]*' AND wa NOT GLOB '*[^0-9]*')),
  email TEXT CHECK (email IS NULL OR (length(email) BETWEEN 6 AND 254 AND email LIKE '_%@_%.__%' AND email NOT GLOB '*[ <>,;"]*')),
  telepon TEXT CHECK (telepon IS NULL OR (length(telepon) BETWEEN 5 AND 20 AND telepon NOT GLOB '*[^0-9+ -]*')),
  ajudan TEXT CHECK (ajudan IS NULL OR length(ajudan) BETWEEN 2 AND 100),
  ajudan_wa TEXT CHECK (ajudan_wa IS NULL OR (length(ajudan_wa) BETWEEN 10 AND 15 AND ajudan_wa GLOB '62[0-9]*' AND ajudan_wa NOT GLOB '*[^0-9]*')),
  notif INTEGER NOT NULL DEFAULT 1 CHECK (notif IN (0, 1)),
  ambang TEXT NOT NULL DEFAULT 'siaga' CHECK (ambang IN ('semua', 'siaga', 'awas')),
  diverifikasi INTEGER,
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('menunggu', 'aktif')),
  setuju_pdp INTEGER,
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 500),
  dibuat INTEGER NOT NULL,
  diubah INTEGER NOT NULL,
  oleh TEXT,
  CHECK (wa IS NOT NULL OR email IS NOT NULL),
  CHECK (kab IS NULL OR prov IS NOT NULL),
  CHECK (status = 'aktif' OR setuju_pdp IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS kontak_pemangku_wilayah ON kontak_pemangku (status, prov, kab, kategori);
