# DESAIN-TEKNIS: Data lanjutan BPBD

## Berkas dan pemilik

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `src/lapor_lanjut_spek.js` | spek tujuh jenis objek dan isian berkas, validasi, penanda, rekap, kondisi akhir, versi (fungsi murni ALGORITMA) | `warga-api` |
| `src/lapor_lanjut.js` | rute `/api/lapor/data/*`, pembukaan berkas, tim, pertanyaan harian, penutupan, dorong ke meja dan Lifeline | `warga-api` |
| `src/lapor_mesin.js` | langkah percakapan tahap 2 (memakai spek di atas) | `warga-api` |
| `migrations/0161_lapor_data.sql` | tabel `lj_*` | `warga-api` |
| `public/lapor/data/index.html`, `data.js`, `data.css` | layar web per objek | `layar-peta` |
| rincian "Data lanjutan" di `public/lapor/meja*` | layar staf | `layar-peta` |
| `tests/lapor/lanjut_spek.test.mjs`, `tests/lapor/lanjut_rute.test.mjs` | uji murni dan uji rute Miniflare | `warga-api` |

Folder baru `public/lapor/data/` berada di bawah `public/lapor/` (bukan folder akar baru).

## Skema D1 (0161, hanya `CREATE ... IF NOT EXISTS`, tanpa trigger, tanpa ALTER)

```sql
CREATE TABLE IF NOT EXISTS lj_berkas (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  induk TEXT NOT NULL CHECK (induk GLOB 'LA-[0-9][0-9][0-9][0-9][0-9][0-9]-[0-9][0-9]*'),
  kab TEXT NOT NULL CHECK (length(kab) <= 10),
  ketua TEXT NOT NULL,               -- nomor WA ketua
  status TEXT NOT NULL CHECK (status IN ('terbuka', 'usul_tutup', 'selesai', 'selesai_catatan')),
  isian TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(isian)),   -- status darurat, SK, posko, nihil per bagian
  token_sha TEXT CHECK (token_sha IS NULL OR length(token_sha) = 64),
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL,
  UNIQUE (induk, kab)
);
CREATE TABLE IF NOT EXISTS lj_tim (
  berkas TEXT NOT NULL, wa TEXT NOT NULL,
  peran TEXT NOT NULL CHECK (peran IN ('ketua', 'anggota')),
  oleh TEXT NOT NULL, dibuat INTEGER NOT NULL, dicabut INTEGER,
  PRIMARY KEY (berkas, wa)
);
CREATE TABLE IF NOT EXISTS lj_objek (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  berkas TEXT NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('rumah', 'prasarana', 'titik', 'jiwa', 'korban', 'usaha', 'kebutuhan')),
  urut INTEGER NOT NULL,
  data TEXT NOT NULL CHECK (json_valid(data)),
  desa TEXT, lat REAL, lon REAL,
  status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'batal')),
  klien_id TEXT UNIQUE,              -- idempoten untuk antrean luring
  oleh TEXT NOT NULL, rev INTEGER NOT NULL DEFAULT 0,
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL,
  UNIQUE (berkas, jenis, urut)
);
CREATE TABLE IF NOT EXISTS lj_jejak (       -- append-only
  id INTEGER PRIMARY KEY, objek TEXT, berkas TEXT NOT NULL,
  aksi TEXT NOT NULL, sebelum TEXT, sesudah TEXT, oleh TEXT NOT NULL, waktu INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS lj_media (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  objek TEXT NOT NULL, kunci_r2 TEXT NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('foto', 'video', 'wajah', 'dokumen')),
  lat REAL, lon REAL, akurasi REAL, waktu_ambil INTEGER, waktu_terima INTEGER NOT NULL,
  lencana TEXT NOT NULL CHECK (lencana IN ('gps', 'exif', 'wa', 'tanpa')),
  pintu TEXT NOT NULL CHECK (pintu IN ('wa', 'web'))
);
CREATE TABLE IF NOT EXISTS lj_tanya (
  berkas TEXT NOT NULL, tgl TEXT NOT NULL CHECK (length(tgl) = 10),
  jawab TEXT, waktu INTEGER NOT NULL, PRIMARY KEY (berkas, tgl)
);
CREATE TABLE IF NOT EXISTS lj_beku (
  berkas TEXT NOT NULL, versi INTEGER NOT NULL,
  isi TEXT NOT NULL, sidik TEXT NOT NULL CHECK (length(sidik) = 64),
  oleh TEXT NOT NULL, waktu INTEGER NOT NULL, PRIMARY KEY (berkas, versi)
);
```

Indeks: `lj_objek (berkas, jenis, status)`, `lj_tim (wa)`, `lj_jejak (berkas, id)`, `lj_media (objek)`.

## R2

`lapor/data/<berkas>/<objek>/<media>.jpg|.vid|.pdf`. Foto wajah di `lapor/data/<berkas>/wajah/`. Tidak pernah disajikan lewat rute publik; disajikan rute bersesi dengan `Cache-Control: private, no-store`.

## Rute

| Metode dan jalur | Hak | Isi |
| --- | --- | --- |
| `GET /api/lapor/data/berkas` | token berkas atau sesi staf | berkas, tim, rekap, objek; tim berkas melihat data pribadi utuh, staf melihatnya tersamar sampai menekan Tampilkan |
| `POST /api/lapor/data/objek` | tim berkas | tambah atau ubah objek (idempoten `klien_id`, `rev` untuk tabrakan) |
| `POST /api/lapor/data/objek/:id/batal` | tim berkas | batal dengan alasan |
| `POST /api/lapor/data/media` | tim berkas | foto atau dokumen; video lewat jalur `lapor_unggah` |
| `POST /api/lapor/data/tim` | ketua, admin | tambah atau cabut anggota |
| `POST /api/lapor/data/tutup` | ketua | isian penutupan, hasilkan status usul |
| `POST /api/lapor/data/terima` | staf Pusdalops | terima rekap ke meja, terima penutupan, terima ke Jitupasna |
| `GET /api/lapor/data/media/:id` | tim berkas, staf | sajikan media |

Semua rute: metode dibatasi, isian divalidasi spek, batas laju per nomor (pola rute lapor), ukuran foto mengikuti `lapor_foto`.

## Sambungan

- WA: mesin tahap 2 di `lapor_mesin.js` lewat gateway yang sudah ada (`scripts/wa/**`); tidak ada router WA baru.
- Pertanyaan harian: cron menit yang sudah ada (`* * * * *`) memeriksa jam; antrean kirim memakai `lapor_kabar`.
- Meja `dampak` dan `pengungsi`: tulis lewat fungsi simpan meja yang sudah ada (`src/meja.js`), dengan pelaku `lapor_lanjut`.
- Lifeline: tulis `lf_usulan` lewat `src/lifeline_usulan.js`.
- Jitupasna: tulis `sk_jitupasna_baris` lewat `src/siklus*.js` hanya dari rute terima.

## ADR

1. **Satu tabel objek JSON**, bukan tabel per jenis: CHECK SQLite tidak bisa diubah tanpa membangun ulang tabel, dan spek jenis akan berubah (pola `meja_catatan`).
2. **Tidak memakai tabel `korban` (0034)**: tabel itu satu baris per kejadian berisi jumlah dan CHECK bencana terbatas; tahap 2 per orang.
3. **Tidak membuat akun `orang`** untuk pengungsi atau korban: register `orang` untuk pegawai dan relawan.
