# DESAIN-TEKNIS: Berkas, tabel, rute, cron

## Berkas

| Berkas | Isi | Pengerja |
| --- | --- | --- |
| `public/lapor/manifest.webmanifest` | nama, `short_name` "Pantau Bencana", `start_url` `/lapor/?dari=pwa`, `scope` `/lapor/`, `display` standalone, `theme_color` `#0b2545`, `lang` id, ikon, `shortcuts`: Lapor darurat | `layar-peta` |
| `public/lapor/sw.js` | `push`, `notificationclick`, `pushsubscriptionchange`; tanpa `fetch` (D2). Pola `public/sw-instansi.js`; tautan klik dibatasi `/lapor/` di situs sendiri | `layar-peta` |
| `public/lapor/peringatan.js` | kartu Pasang, panduan iPhone, kartu kelola, kartu Arahan, pendaftaran push; dimuat dari `lapor.js` | `layar-peta` |
| `public/lapor/icons/*.png` | ikon 192, 512, maskable, lencana | `layar-peta` (berkas dari pemilik, Q-ikon) |
| `public/lapor/index.html` | tautan manifest dan registrasi `sw.js`; tidak ada perubahan lain | `layar-peta` |
| `src/pw_peringatan.js` | fungsi murni (peristiwa, penerima, teks, titik evakuasi) dan rute | `warga-api` |
| `src/lapor_ai.js` | hanya penambahan pemetaan rute `/api/lapor/peringatan/*` ke `pw_peringatan.js` | `warga-api` |
| `src/worker.js` | satu baris di `scheduled()` memanggil `jalankanPeringatan(env, sekarang)` | `warga-api` |
| `src/hak.js` | entri matriks untuk rute staf (PW-07) | `warga-api` |
| `migrations/0163_pw_peringatan.sql` | tiga tabel di bawah | `warga-api` |
| `scripts/lapor/lokal.mjs` | tiruan lokal rute peringatan (tanpa push nyata) agar tinjau di `localhost:8800` jalan | `wa-bot` atau `warga-api` sesuai `ilmu.mjs pemilik` |
| `tests/lapor/peringatan_*.test.mjs` | lihat RENCANA-UJI | `penulis-gerbang` |

Berkas `public/lapor/*.js` dan `.css` dilayani sebagai aset statis (tidak lewat Worker). `manifest.webmanifest` dan `sw.js` ikut aset; PW-04 memeriksa tipe medianya (`application/manifest+json`, `text/javascript`) dan bahwa `sw.js` tidak di-cache lama (Cache-Control `no-cache`), dan menambah entri `public/_headers` bila perlu.

## Tabel (migrasi 0163, idempoten)

```sql
CREATE TABLE IF NOT EXISTS pw_langganan (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  endpoint TEXT NOT NULL CHECK (length(endpoint) BETWEEN 20 AND 1000 AND endpoint LIKE 'https://%'),
  p256dh TEXT NOT NULL CHECK (length(p256dh) BETWEEN 80 AND 100),
  auth TEXT NOT NULL CHECK (length(auth) BETWEEN 20 AND 30),
  kec_kode TEXT NOT NULL CHECK (kec_kode GLOB '[0-9][0-9].[0-9][0-9].[0-9][0-9]'),
  kab_kode TEXT NOT NULL CHECK (kab_kode GLOB '[0-9][0-9][0-9][0-9]'),
  kec_nama TEXT NOT NULL CHECK (length(kec_nama) BETWEEN 1 AND 80),
  jenis INTEGER NOT NULL CHECK (jenis BETWEEN 1 AND 15),     -- bit: 1 banjir, 2 longsor, 4 asap, 8 angin
  ambang INTEGER NOT NULL DEFAULT 1 CHECK (ambang BETWEEN 1 AND 3),
  bahasa TEXT NOT NULL DEFAULT 'id' CHECK (bahasa IN ('id','en')),
  uji INTEGER NOT NULL DEFAULT 0 CHECK (uji IN (0,1)),
  dibuat INTEGER NOT NULL, terakhir_aktif INTEGER NOT NULL,
  terakhir_status INTEGER, terakhir_pada INTEGER,
  UNIQUE (endpoint, kec_kode)
);
CREATE INDEX IF NOT EXISTS pw_langganan_kab ON pw_langganan (kab_kode, id);
```

Satu baris per (perangkat, kecamatan): tiga kecamatan = tiga baris dengan endpoint sama, `id` = 16 karakter pertama SHA-256 base64url dari `endpoint|kec_kode`. Batas tiga baris per endpoint diperiksa di rute dan diuji (RENCANA-UJI), bukan trigger. Pengirim mengelompokkan per endpoint supaya satu perangkat menerima satu notifikasi per kab.

```sql
CREATE TABLE IF NOT EXISTS pw_status (
  kab_kode TEXT NOT NULL, jenis TEXT NOT NULL CHECK (jenis IN ('BNJ','LSR','ASP','CEX')),
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
  PRIMARY KEY (kab_kode, jenis, tanggal)) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS pw_peristiwa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dibuat_berkas TEXT NOT NULL,            -- nilai kolom dibuat prediksi.json saat dihitung
  kab_kode TEXT NOT NULL, ringkas TEXT NOT NULL,  -- JSON: [{jenis, tanggal, level, teruji}], tanpa data pribadi
  dibuat INTEGER NOT NULL, ditahan_sampai INTEGER,
  kursor TEXT NOT NULL DEFAULT '', selesai INTEGER NOT NULL DEFAULT 0 CHECK (selesai IN (0,1)),
  ok INTEGER NOT NULL DEFAULT 0, gagal INTEGER NOT NULL DEFAULT 0, mati INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS pw_peristiwa_belum ON pw_peristiwa (selesai, id);
```

Penanda berkas terakhir diproses disimpan sebagai baris khusus di tabel kecil `pw_kendali (kunci TEXT PRIMARY KEY, nilai TEXT)` dengan kunci `dibuat_terakhir` dan `jeda` (tombol jeda global, PW-07). Tidak ada `ALTER` pada tabel lain. Retensi: `pw_peristiwa` 30 hari, `pw_status` 30 hari sesudah tanggal sasaran, `pw_langganan` 180 hari tanpa `terakhir_aktif` (Q6); semuanya di `bersihSemua` (menit 17).

## Rute

Semua di bawah `/api/lapor/peringatan/`, JSON, POST wajib `x-pb: 1`, batas laju per IP dengan fungsi `laju` yang ada.

| Rute | Metode | Isi | Gerbang |
| --- | --- | --- | --- |
| `kunci` | GET | `{tersedia, publik}` (kunci VAPID publik); `{tersedia:false}` bila kunci belum terpasang | publik |
| `langganan` | POST | `{endpoint, kunci:{p256dh, auth}, kec:[kode...], jenis, ambang, bahasa}`; validasi endpoint berhost layanan push yang diizinkan (daftar `HOST_PUSH`), kode kecamatan ada di data wilayah, paling banyak 3 | publik, laju 10 per jam per IP |
| `ubah` | POST | ganti kec, jenis, ambang, bahasa untuk endpoint; juga memperbarui `terakhir_aktif` | publik, laju |
| `berhenti` | POST | hapus semua baris endpoint itu | publik |
| `status` | POST | `{endpoint}` -> baris miliknya (kecamatan, jenis, ambang); tidak membocorkan keberadaan endpoint orang lain karena endpoint adalah rahasia pemegangnya | publik, laju |
| `arah` | GET | `?kec=<kode>&lat=&lon=` opsional -> hari 1 sampai 3 dan tiga titik evakuasi (ALGORITMA 7) | publik, cache 5 menit; `lat`/`lon` tidak dicatat di log |
| `staf/ringkas` | GET | jumlah langganan per kab, riwayat peristiwa 7 hari, status jeda | staf Pusdalops atau admin |
| `staf/jeda` | POST | menyalakan atau mematikan jeda global | admin |

Jawaban galat memakai bentuk yang sama dengan rute lapor (`{galat}`) dan kode 4xx/5xx yang sama dengan `push.js`; tanpa menyebut endpoint dalam pesan.

## Cron (dalam `scheduled()` yang ada)

```
jalankanPeringatan(env, kini):
  jika jeda: keluar
  d = baca prediksi.dibuat (ASSETS), bandingkan dengan pw_kendali.dibuat_terakhir
  jika baru dan segar (<= 36 jam): hitung peristiwa, tulis pw_status dan pw_peristiwa (batch), simpan dibuat_terakhir
  ambil satu peristiwa belum selesai yang tidak ditahan, kirim potongan 40 (kirimKe), tulis hasil dan kursor
```

Biaya diam: satu pembacaan D1 per menit (`pw_kendali`) dan satu `ASSETS.fetch` yang di-cache isolat 10 menit seperti `berkas()` di `lapor_info.js`. Pengganti bila `kirimKe` perlu kunci terpisah: `kirimKe(env, ...)` dibungkus dengan `{...env, VAPID_PUBLIK: env.VAPID_PUBLIK_WARGA, VAPID_PRIVAT: env.VAPID_PRIVAT_WARGA}` (Q11).

## Vars dan secret

| Nama | Jenis | Isi |
| --- | --- | --- |
| `VAPID_PUBLIK_WARGA` | var | kunci publik, boleh di wrangler vars |
| `VAPID_PRIVAT_WARGA`, `VAPID_SUBJEK` | secret | diisi pemilik di dasbor atau `wrangler secret put`, tidak masuk repo |
| `PW_UJI` | var | "1" membatasi pengiriman ke langganan `uji = 1` (Q17) |

## Keputusan teknis

| ADR | Pilihan | Alasan | Batas |
| --- | --- | --- | --- |
| A1 | Antrean dengan kursor pada satu baris peristiwa | tanpa Queues, tanpa baris per penerima | 40 kiriman per menit; ganti Queues bila Q7 menuntut |
| A2 | Tidak ada cache `fetch` pada service worker | tidak ada risiko tampilan basi | tidak ada halaman luring; Q5 |
| A3 | Tabel baru, bukan memakai `push_langganan` | FK ke akun instansi | dua tabel, rutin kirim dipakai bersama |
| A4 | Tingkat dari kab/kota | sumber data memang itu | Q1 |
