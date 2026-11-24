# DESAIN-TEKNIS: Segel dokumen

## 1. Berkas

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `migrations/<nomor berikut>_segel.sql` (0170 sudah dipakai LK-03; ambil nomor kosong berikut saat dikerjakan) | tabel `segel`, `segel_cabut` | warga-api |
| `src/hak.js` bagian Segel | semua SQL segel; `stmtSegel` untuk batch pembeku | warga-api |
| `src/segel.js` | `buatKode`, `normalKode`, `statusSegel` (murni), rute | warga-api |
| `src/laporan_karhutla.js`, `src/laporan_bencana.js`, `src/pb_dokumen.js` | panggil `stmtSegel` di titik beku | warga-api |
| `src/worker.js` | daftarkan `RUTE_SEGEL`, halaman `/verifikasi` di `PUBLIK_TANPA_SESI` | warga-api |
| `public/verifikasi.html`, `.js`, `.css` | halaman publik | layar-peta |
| `public/inti/segel.js` | `gambarSegel(el, {kode, sidik})` untuk lembar cetak | inti-layar |
| `tests/warga/segel.test.mjs` | uji integrasi Miniflare | warga-api |
| `tests/agen/gerbang-segel.test.mjs` | tiap INSERT ke tabel beku diikuti `stmtSegel` | penulis-gerbang |

## 2. Skema D1

```sql
CREATE TABLE IF NOT EXISTS segel (
  kode TEXT PRIMARY KEY CHECK (length(kode) = 10 AND kode NOT GLOB '*[^0-9A-HJKMNP-TV-Z]*'),
  jenis TEXT NOT NULL CHECK (jenis IN ('lk', 'lkb', 'pb', 'lj')),
  rujukan TEXT NOT NULL CHECK (length(rujukan) BETWEEN 1 AND 120),
  dasar TEXT NOT NULL CHECK (length(dasar) BETWEEN 1 AND 120),
  versi INTEGER NOT NULL CHECK (versi >= 0),
  sidik TEXT NOT NULL CHECK (length(sidik) = 64 AND sidik NOT GLOB '*[^0-9a-f]*'),
  sidik_berkas TEXT CHECK (sidik_berkas IS NULL OR (length(sidik_berkas) = 64 AND sidik_berkas NOT GLOB '*[^0-9a-f]*')),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 1 AND 160),
  wilayah TEXT CHECK (wilayah IS NULL OR length(wilayah) <= 80),
  periode TEXT NOT NULL CHECK (length(periode) BETWEEN 4 AND 23),
  penerbit TEXT NOT NULL CHECK (length(penerbit) BETWEEN 1 AND 80),
  terbit INTEGER NOT NULL CHECK (terbit > 0),
  UNIQUE (jenis, rujukan)
);
CREATE INDEX IF NOT EXISTS segel_dasar ON segel (jenis, dasar, versi);
CREATE TABLE IF NOT EXISTS segel_cabut (
  kode TEXT PRIMARY KEY REFERENCES segel(kode),
  alasan TEXT NOT NULL CHECK (length(alasan) BETWEEN 5 AND 500),
  oleh TEXT NOT NULL CHECK (length(oleh) BETWEEN 1 AND 80),
  waktu INTEGER NOT NULL CHECK (waktu > 0)
);
```

Hanya `CREATE ... IF NOT EXISTS`, tanpa trigger, tanpa ALTER, tanpa kolom `dummy` (D13: baris dummy tidak disegel). Append-only dijaga `src/hak.js` yang tidak punya fungsi UPDATE atau DELETE untuk kedua tabel, dan gerbang `gerbang-d1`.

## 3. Rute

| Rute | Hak | Jawaban |
| --- | --- | --- |
| `GET /verifikasi`, `GET /verifikasi/<kode>` | publik | `public/verifikasi.html` (kode dibaca dari jalur oleh skrip) |
| `GET /api/verifikasi/<kode>` | publik, batas laju | `{kode, status, judul, wilayah, periode, versi, penerbit, terbit, sidik12, sidik_berkas, terbaru?}`; 404 seragam. Sidik isi penuh tidak dikirim (isi snapshot berpola, jangan beri bahan menebak); sidik berkas PDF penuh dikirim karena dibutuhkan pencocok |
| `GET /api/segel` | moderator, staf pimpinan, pusdalops | daftar 100 terbaru, filter status |
| `POST /api/segel/cabut` | moderator, staf pimpinan (Q5) | `{kode, alasan}` -> 201; 409 bila sudah dicabut |

`cache-control: no-store` dan `x-robots-tag: noindex` di semua jawaban publik (D15).

Jalur halaman: `PUBLIK_TANPA_SESI` adalah Map jalur persis, jadi `/verifikasi/<kode>` didaftarkan di `HTML_RUTE` dengan pola regex dan pemeriksa halaman terkunci diberi pengecualian berpola, mengikuti cara `/lapor/lacak`.

## 4. Titik sambung

- `laporan_karhutla.js` baris 419 dan 462: tambah `stmtSegel(env, {jenis: "lk", rujukan: `${tanggal}#${n}`, ...})` ke `st` bila `hari.dummy === 0`.
- `laporan_bencana.js` baris 222 dan 265: sama dengan jenis `lkb`.
- `pb_dokumen.js` rute `bekukan`: sesudah `pbDokBeku` berhasil, satu INSERT segel dalam `batchTulis` yang sama dengan log terbit.
- Bila tabel `segel` belum ada (migrasi belum diterapkan), pembeku tetap jalan tanpa segel: `adaTabelSegel(env)` di `src/hak.js` memeriksa `sqlite_master` sekali per isolate, lalu batch dirakit dengan atau tanpa `stmtSegel` (KEPUTUSAN D3). Jangan menaruh statement ke tabel yang belum ada di batch: seluruh batch gagal.
- `pb`: segel menyusul sesudah `pbDokBeku`; gagal di antara keduanya menyisakan dokumen beku tanpa segel (D3).
