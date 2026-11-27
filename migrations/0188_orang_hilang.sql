-- 0188: Orang hilang publik (paket data/kajian-bnpb/orang-hilang-publik/, OH-03; keputusan K110 sampai K116, DESAIN-TEKNIS bagian 3).
-- Tabel samping, bukan kolom baru di lapor_cari (0173 sampai 0186 sudah dibekukan). Hanya CREATE ... IF NOT EXISTS: tanpa trigger, tanpa data contoh, tanpa ALTER.
-- Hak per pelaku ada di MATRIKS src/hak.js (lp_publik hanya membaca oh_publik lewat kolom daftar putih; oh_riwayat hanya ditambah). Tidak ada baris yang tampil sebelum bendera OH_PUBLIK hidup dan petugas menayangkan.
-- Tidak ada vektor wajah dan tidak ada foto penanya di sini (oh_cari_foto hanya statistik laju). Pemilik yang menerapkan ke D1 produksi (wrangler d1 migrations apply).
-- Komentar `--` sengaja di baris sendiri (pecah() di tests/warga/_bantu.mjs memotong di baris berakhir ';').

-- Satu baris per laporan orang hilang. Kolom nama sampai kab_nama adalah SALINAN bidang publik (ALGORITMA 8): dikosongkan saat anonim bersama lapor_cari (730 hari).
-- umur, kelamin, tinggi diisi dari sesi.cari.cr saat kirim, bukan dari teks (RISET 1.1). Kosong tidak pernah jadi 0.
CREATE TABLE IF NOT EXISTS oh_publik (
  cari_id TEXT PRIMARY KEY CHECK (length(cari_id) = 16),
  token TEXT NOT NULL UNIQUE CHECK (length(token) = 32 AND token NOT GLOB '*[^0-9a-f]*'),
  kelas TEXT NOT NULL CHECK (kelas IN ('dewasa', 'anak')),
  nama TEXT CHECK (nama IS NULL OR length(nama) <= 80),
  inisial TEXT CHECK (inisial IS NULL OR length(inisial) <= 40),
  panggilan TEXT CHECK (panggilan IS NULL OR length(panggilan) <= 40),
  umur INTEGER CHECK (umur IS NULL OR umur BETWEEN 0 AND 120),
  kelamin TEXT CHECK (kelamin IS NULL OR kelamin IN ('Laki-laki', 'Perempuan')),
  tinggi INTEGER CHECK (tinggi IS NULL OR tinggi BETWEEN 30 AND 260),
  pakaian TEXT CHECK (pakaian IS NULL OR length(pakaian) <= 200),
  ciri TEXT CHECK (ciri IS NULL OR length(ciri) <= 300),
  kec TEXT CHECK (kec IS NULL OR length(kec) <= 80),
  kab TEXT CHECK (kab IS NULL OR length(kab) = 5),
  kab_nama TEXT CHECK (kab_nama IS NULL OR length(kab_nama) <= 80),
  waktu_terakhir INTEGER,
  kejadian_id TEXT CHECK (kejadian_id IS NULL OR length(kejadian_id) = 16),
  kejadian_jenis TEXT CHECK (kejadian_jenis IS NULL OR length(kejadian_jenis) BETWEEN 3 AND 24),
  kejadian_kab TEXT CHECK (kejadian_kab IS NULL OR (length(kejadian_kab) = 4 AND kejadian_kab NOT GLOB '*[^0-9]*')),
  kejadian_mulai TEXT CHECK (kejadian_mulai IS NULL OR kejadian_mulai GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  kejadian_oleh TEXT CHECK (kejadian_oleh IS NULL OR length(kejadian_oleh) BETWEEN 1 AND 64),
  kejadian_waktu INTEGER,
  setuju_versi INTEGER CHECK (setuju_versi IS NULL OR setuju_versi >= 1),
  setuju_waktu INTEGER,
  setuju_wali INTEGER CHECK (setuju_wali IS NULL OR setuju_wali IN (0, 1)),
  wali_oleh TEXT CHECK (wali_oleh IS NULL OR length(wali_oleh) BETWEEN 1 AND 64),
  wali_waktu INTEGER,
  bidang_pilihan TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(bidang_pilihan) AND json_type(bidang_pilihan) = 'object' AND length(bidang_pilihan) <= 1000),
  foto_publik TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(foto_publik) AND json_type(foto_publik) = 'array' AND length(foto_publik) <= 400),
  status TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'menunggu', 'tayang', 'turun')),
  alasan_turun TEXT CHECK (alasan_turun IS NULL OR alasan_turun IN ('ditolak', 'dicabut', 'kedaluwarsa', 'dilaporkan', 'petugas', 'ditemukan', 'tutup')),
  tayang_waktu INTEGER,
  turun_waktu INTEGER,
  dicabut_waktu INTEGER,
  dibuat INTEGER NOT NULL,
  CHECK ((status = 'turun') = (alasan_turun IS NOT NULL))
);
-- indeks parsial: kueri daftar publik wajib memuat predikat status = 'tayang' persis supaya terpakai
CREATE INDEX IF NOT EXISTS oh_publik_tayang ON oh_publik (tayang_waktu DESC, token DESC) WHERE status = 'tayang';
CREATE INDEX IF NOT EXISTS oh_publik_status ON oh_publik (status, dibuat);

-- Orang yang ditemukan warga (jalur B). Tidak tampil publik bawaan (Q9). Kolom pribadi dikosongkan 730 hari sesudah ditutup_waktu.
CREATE TABLE IF NOT EXISTS oh_temu (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  nomor_penemu TEXT CHECK (nomor_penemu IS NULL OR length(nomor_penemu) BETWEEN 8 AND 20),
  kab TEXT NOT NULL CHECK (length(kab) = 5),
  lokasi_teks TEXT CHECK (lokasi_teks IS NULL OR length(lokasi_teks) <= 200),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94 AND 142),
  waktu_temu INTEGER NOT NULL,
  kondisi TEXT NOT NULL CHECK (kondisi IN ('sadar', 'tidak_sadar', 'terluka', 'anak', 'bingung')),
  ucapan TEXT CHECK (ucapan IS NULL OR length(ucapan) <= 300),
  bersama TEXT CHECK (bersama IS NULL OR bersama IN ('sendiri', 'pelapor', 'petugas', 'rumah_sakit')),
  ciri TEXT CHECK (ciri IS NULL OR length(ciri) <= 300),
  foto_boleh INTEGER NOT NULL DEFAULT 0 CHECK (foto_boleh IN (0, 1)),
  kejadian_id TEXT CHECK (kejadian_id IS NULL OR length(kejadian_id) = 16),
  status TEXT NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'ditinjau', 'dicocokkan', 'ditutup')),
  tayang_setuju_oleh TEXT CHECK (tayang_setuju_oleh IS NULL OR length(tayang_setuju_oleh) BETWEEN 1 AND 64),
  dibuat INTEGER NOT NULL,
  ditutup_waktu INTEGER
);
CREATE INDEX IF NOT EXISTS oh_temu_status ON oh_temu (status, dibuat);
CREATE INDEX IF NOT EXISTS oh_temu_tutup ON oh_temu (ditutup_waktu) WHERE ditutup_waktu IS NOT NULL;

-- Foto orang ditemukan: berkas R2 privat, hanya dibuat bila foto_boleh = 1 (pola 0186).
CREATE TABLE IF NOT EXISTS oh_temu_foto (
  temu_id TEXT NOT NULL CHECK (length(temu_id) = 16),
  foto_id TEXT NOT NULL CHECK (length(foto_id) = 16),
  PRIMARY KEY (temu_id, foto_id)
);

-- Cari lewat foto: hanya statistik laju. Tanpa foto, tanpa ciri, tanpa id profil (D13). Dihapus 90 hari.
CREATE TABLE IF NOT EXISTS oh_cari_foto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nomor_sha TEXT NOT NULL CHECK (length(nomor_sha) = 64),
  waktu INTEGER NOT NULL,
  kandidat INTEGER NOT NULL CHECK (kandidat BETWEEN 0 AND 5),
  tingkat TEXT NOT NULL CHECK (tingkat IN ('mirip', 'sedikit', 'tidak', 'tidak_bisa', 'galat'))
);
CREATE INDEX IF NOT EXISTS oh_cari_foto_waktu ON oh_cari_foto (nomor_sha, waktu);

-- Antrean petugas: informasi, laporkan, cabut, "Saya orang ini". nomor_pemberi hanya dibaca petugas; dikosongkan 180 hari sesudah selesai.
CREATE TABLE IF NOT EXISTS oh_info (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  jenis TEXT NOT NULL CHECK (jenis IN ('informasi', 'foto', 'laporkan', 'cabut', 'orang_ini')),
  sasaran_token TEXT NOT NULL CHECK (length(sasaran_token) = 32 AND sasaran_token NOT GLOB '*[^0-9a-f]*'),
  nomor_pemberi TEXT CHECK (nomor_pemberi IS NULL OR length(nomor_pemberi) BETWEEN 8 AND 20),
  pesan TEXT CHECK (pesan IS NULL OR length(pesan) <= 500),
  tingkat TEXT CHECK (tingkat IS NULL OR tingkat IN ('mirip', 'sedikit', 'tidak', 'tidak_bisa', 'galat')),
  status TEXT NOT NULL DEFAULT 'baru' CHECK (status IN ('baru', 'diteruskan', 'selesai')),
  dibuat INTEGER NOT NULL,
  ditangani_oleh TEXT CHECK (ditangani_oleh IS NULL OR length(ditangani_oleh) BETWEEN 1 AND 64),
  selesai_waktu INTEGER
);
CREATE INDEX IF NOT EXISTS oh_info_status ON oh_info (status, dibuat);
CREATE INDEX IF NOT EXISTS oh_info_sasaran ON oh_info (sasaran_token, jenis, dibuat);

-- Riwayat tinjau: hanya ditambah (hak tabel di src/hak.js; tanpa trigger). catatan = teks pendek lolos samarkan, dianonimkan bersama laporan induk (D31).
CREATE TABLE IF NOT EXISTS oh_riwayat (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cari_id TEXT CHECK (cari_id IS NULL OR length(cari_id) = 16),
  temu_id TEXT CHECK (temu_id IS NULL OR length(temu_id) = 16),
  dari TEXT NOT NULL CHECK (length(dari) BETWEEN 1 AND 24),
  ke TEXT NOT NULL CHECK (length(ke) BETWEEN 1 AND 24),
  alasan TEXT NOT NULL CHECK (length(alasan) BETWEEN 1 AND 40),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 140),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 64),
  waktu INTEGER NOT NULL,
  CHECK ((cari_id IS NULL) <> (temu_id IS NULL))
);
CREATE INDEX IF NOT EXISTS oh_riwayat_cari ON oh_riwayat (cari_id, waktu);
CREATE INDEX IF NOT EXISTS oh_riwayat_temu ON oh_riwayat (temu_id, waktu);
