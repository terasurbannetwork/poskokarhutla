-- Statistik pengunjung tanpa data pribadi (public/jejak.js -> POST /api/jejak, dibaca admin lewat GET /api/statistik).
-- Tidak ada IP, cookie pelacak, sidik perangkat, atau baris per pengunjung. Anggaran gratis D1 (100 rb baris ditulis/hari) dijaga:
-- SATU baris per (hari WIB, halaman) yang di-UPDATE satu pernyataan per kiriman = 1 baris ditulis per kiriman. Klien mengirim
-- paling banyak ~1 kiriman per kunjungan; server menyampel bila kiriman hari itu banyak (lihat src/statistik.js). Nilai disimpan
-- sudah dikali 1/p sampel (REAL), jadi saat sampel aktif angkanya perkiraan; kolom sampel = p terkecil yang dipakai hari itu.
-- hal 'sistem' = catatan cron (sumber data basi per slot 10 menit untuk pita gangguan).
-- hal 'publik' = hit HTML yang dilihat server (halaman /statistik publik): manusia vs asisten AI vs perayap, tanpa persetujuan
-- karena tidak menyimpan apa pun di perangkat dan tidak menyimpan IP. Baris 'publik' disimpan selamanya (angka "sejak diluncurkan")
-- tetapi kolom rinci (dim, menit, kini) dikosongkan setelah 90 hari; baris lain dihapus setelah 90 hari.
CREATE TABLE stat_hari (
  tgl TEXT NOT NULL CHECK (tgl GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  hal TEXT NOT NULL CHECK (hal IN ('karhutla', 'banjir', 'warga', 'sistem', 'publik')),
  kiriman INTEGER NOT NULL DEFAULT 0 CHECK (kiriman >= 0),   -- kiriman yang benar-benar ditulis (tanpa skala), dasar keputusan sampel
  orang REAL NOT NULL DEFAULT 0 CHECK (orang >= 0),          -- peramban yang pertama kali muncul hari ini (bendera dari localStorage)
  kembali REAL NOT NULL DEFAULT 0 CHECK (kembali >= 0),      -- ... yang sudah pernah datang di hari sebelumnya
  kunjungan REAL NOT NULL DEFAULT 0 CHECK (kunjungan >= 0),  -- kunjungan baru: datang lagi setelah > 30 menit tanpa aktivitas
  tampilan REAL NOT NULL DEFAULT 0 CHECK (tampilan >= 0),
  klik REAL NOT NULL DEFAULT 0 CHECK (klik >= 0),
  detik REAL NOT NULL DEFAULT 0 CHECK (detik >= 0),          -- waktu halaman terlihat
  ai_jawab REAL NOT NULL DEFAULT 0 CHECK (ai_jawab >= 0),      -- publik: asisten AI membuka halaman untuk menjawab seseorang
  ai_crawl REAL NOT NULL DEFAULT 0 CHECK (ai_crawl >= 0),      -- publik: perayap pencarian/pelatihan AI
  mesin_cari REAL NOT NULL DEFAULT 0 CHECK (mesin_cari >= 0),  -- publik: Googlebot, Bingbot, Applebot, ...
  tak_dihitung REAL NOT NULL DEFAULT 0 CHECK (tak_dihitung >= 0), -- publik: jaringan hosting, perayap palsu, bot lain
  sampel REAL NOT NULL DEFAULT 1 CHECK (sampel > 0 AND sampel <= 1),
  slot TEXT NOT NULL CHECK (json_valid(slot) AND json_array_length(slot) = 144),     -- orang aktif per 10 menit sejak 00:00 WIB
  menit TEXT NOT NULL CHECK (json_valid(menit) AND json_array_length(menit) = 1440), -- kiriman per menit (hitungan "saat ini")
  dim TEXT NOT NULL DEFAULT '{"_n":{}}' CHECK (json_valid(dim) AND coalesce(json_type(dim, '$._n'), '') = 'object' AND length(dim) <= 1500000),
  kini TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(kini) AND json_type(kini) = 'array'),  -- publik: [waktu, tamu8, jalur] 5 menit terakhir
  PRIMARY KEY (tgl, hal)
) WITHOUT ROWID;

-- batas laju di luar Lapor Warga (CHECK jejak tidak bisa diubah di SQLite): percobaan masuk admin dan kirim pesan
CREATE TABLE laju (
  ip_hash TEXT NOT NULL CHECK (length(ip_hash) = 64),
  aksi TEXT NOT NULL CHECK (aksi IN ('masuk', 'pesan')),
  waktu INTEGER NOT NULL
);
CREATE INDEX laju_ip ON laju (ip_hash, aksi, waktu);

-- Pengunjung unik per hari untuk halaman publik: hash(garam harian | IP | UA), 16 hex. IP tidak pernah disimpan; garam
-- hari sebelumnya dimusnahkan cron, jadi hash kemarin tidak bisa dicocokkan lagi dengan IP. Baris dihapus setelah 2 hari.
CREATE TABLE stat_tamu (
  tgl TEXT NOT NULL CHECK (tgl GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  h TEXT NOT NULL CHECK (length(h) = 16 AND h NOT GLOB '*[^0-9a-f]*'),
  PRIMARY KEY (tgl, h)
) WITHOUT ROWID;
CREATE TABLE stat_garam (
  tgl TEXT PRIMARY KEY CHECK (tgl GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
  garam TEXT NOT NULL CHECK (length(garam) = 64 AND garam NOT GLOB '*[^0-9a-f]*')
);
-- Rentang IP resmi operator perayap (diambil cron harian dari daftar yang mereka terbitkan) untuk lencana "terverifikasi".
CREATE TABLE stat_ip (
  operator TEXT PRIMARY KEY CHECK (length(operator) BETWEEN 2 AND 40),
  cidr TEXT NOT NULL CHECK (json_valid(cidr) AND json_type(cidr) = 'array' AND length(cidr) <= 1000000),
  diambil INTEGER NOT NULL
);
