-- Peringatan Dini (EWS) lewat email: warga berlangganan dengan email + koordinat; Worker (src/ews.js) menilai risiko lokasinya
-- (karhutla, banjir, longsor, cuaca, rob: tiap jam; gempa/tsunami: tiap 5 menit) dan mengirim email lewat Resend.
-- Waktu = milidetik epoch UTC. Email disimpan apa adanya (perlu untuk mengirim), tidak pernah keluar di respons publik.
-- Satu email = satu langganan. Double opt-in: status 'menunggu' sampai tautan konfirmasi diklik (dihapus cron setelah 48 jam).
CREATE TABLE IF NOT EXISTS ews_langganan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16 AND id NOT GLOB '*[^0-9a-f]*'),
  email TEXT NOT NULL CHECK (length(email) BETWEEN 6 AND 254 AND email GLOB '?*@?*.?*' AND email NOT GLOB '*[ <>]*' AND email = lower(email)),
  -- email dinormalkan (huruf kecil, tanpa +tag, titik gmail dibuang): satu kotak surat = satu langganan, alias tak melipatgandakan batas
  email_kunci TEXT NOT NULL CHECK (length(email_kunci) BETWEEN 6 AND 254),
  -- koordinat dibulatkan 2 desimal (~1 km): cukup untuk kecamatan, tidak menunjuk rumah
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5),
  lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  prov TEXT NOT NULL DEFAULT '' CHECK (length(prov) <= 2),
  kab TEXT NOT NULL DEFAULT '' CHECK (length(kab) <= 80),
  kec TEXT NOT NULL DEFAULT '' CHECK (length(kec) <= 80),
  kec_kunci TEXT NOT NULL DEFAULT '' CHECK (length(kec_kunci) <= 200),
  bencana TEXT NOT NULL CHECK (json_valid(bencana) AND coalesce(json_type(bencana), '') = 'array' AND length(bencana) <= 200),
  waspada INTEGER NOT NULL DEFAULT 0 CHECK (waspada IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'aktif', 'berhenti')),
  -- token konfirmasi: acak, sekali pakai, hanya sha-nya disimpan, kedaluwarsa 48 jam. Token berhenti TIDAK disimpan:
  -- id + HMAC(EWS_KUNCI atau IP_SALT, id), dihitung ulang saat dipakai, jadi tautan di email lama tetap berlaku.
  konfirmasi_hash TEXT CHECK (konfirmasi_hash IS NULL OR length(konfirmasi_hash) = 64),
  konfirmasi_exp INTEGER,
  -- perubahan lokasi/bencana dari kiriman ulang, baru berlaku setelah tautan konfirmasi diklik (JSON)
  calon TEXT CHECK (calon IS NULL OR json_valid(calon)),
  dibuat INTEGER NOT NULL,
  dikonfirmasi INTEGER,
  berhenti_pada INTEGER,                  -- untuk hapus otomatis 30 hari setelah berhenti
  kirim_terakhir INTEGER NOT NULL DEFAULT 0,   -- email prakiraan terakhir (jeda 6 jam)
  diperiksa INTEGER NOT NULL DEFAULT 0         -- giliran cron: yang paling lama belum dinilai maju lebih dulu
);
CREATE UNIQUE INDEX IF NOT EXISTS ews_langganan_email ON ews_langganan (email_kunci);
CREATE UNIQUE INDEX IF NOT EXISTS ews_langganan_konfirmasi ON ews_langganan (konfirmasi_hash);
CREATE INDEX IF NOT EXISTS ews_langganan_status ON ews_langganan (status, dibuat);
CREATE INDEX IF NOT EXISTS ews_langganan_giliran ON ews_langganan (status, diperiksa, id);

-- kunci = "bencana|tanggal|tingkat" (prakiraan) atau "gempa|<DateTime>" / "tsunami|<DateTime>"; satu email per kunci per pelanggan
CREATE TABLE IF NOT EXISTS ews_terkirim (
  langganan_id TEXT NOT NULL,
  kunci TEXT NOT NULL CHECK (length(kunci) BETWEEN 1 AND 80),
  waktu INTEGER NOT NULL,
  PRIMARY KEY (langganan_id, kunci)
) WITHOUT ROWID;

-- batas laju: ip_hash berisi hash IP, hash email ternormalisasi (aksi 'email'), atau 'semua' (aksi 'global': email konfirmasi per jam)
CREATE TABLE IF NOT EXISTS ews_laju (
  ip_hash TEXT NOT NULL,
  aksi TEXT NOT NULL CHECK (aksi IN ('langganan', 'email', 'global')),
  waktu INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ews_laju_cari ON ews_laju (ip_hash, aksi, waktu);

-- ingatan kecil cron, mis. kunci gempa BMKG terakhir yang sudah diproses
CREATE TABLE IF NOT EXISTS ews_keadaan (
  kunci TEXT PRIMARY KEY CHECK (length(kunci) BETWEEN 1 AND 60),
  nilai TEXT NOT NULL CHECK (length(nilai) <= 200),
  waktu INTEGER NOT NULL
) WITHOUT ROWID;
