# DESAIN-TEKNIS: Lapor Bencana BNPB

## Berkas

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `scripts/lapor/spek.py` | Membangkitkan spek isian dari Lampiran I dan III naskah Rancangan Juklak | `lapor-ai` (agent baru) |
| `src/lapor_spek.generated.js` | Spek hasil bangkitan, jangan disunting | `lapor-ai` |
| `src/lapor_mesin.js` | Fungsi murni: identitas, perintah, validasi kutipan, gabung, isian berikutnya, balasan, transisi tiket | `warga-api` |
| `src/lapor_ai.js` | Rute `/api/lapor/*`: pesan, sesi, foto, tiket, PDF, izin, monitoring | `warga-api` |
| `src/lapor_model.js` | Satu gerbang model: Claude API lewat `fetch` (secret `ANTHROPIC_API_KEY`), tanpa SDK; tanpa kunci = `null` | `warga-api` |
| `src/foto.js` | Pemeriksaan foto dipindah ke `periksaFotoLokasi` yang diekspor; rute lama memanggilnya tanpa ubah perilaku | `warga-api` |
| `src/samarkan.js` | `samarkan` dipindah dari `scripts/wa/claude.mjs` ke modul bersama; bot laporan mengimpornya | `warga-api` |
| `migrations/0155_lapor_ai.sql` | Tabel `lapor_*` | `warga-api` |
| `public/lapor/index.html`, `lapor.js`, `lapor.css` | Chat web | `layar-peta` |
| `public/lapor/foto.html`, `foto.js` | Kamera bertoken | `layar-peta` |
| `public/lapor/l.html`, `l.js`, `l.css` | Halaman laporan dan tampilan cetak PDF | `layar-peta` |
| `public/lapor/meja.html`, `meja.js`, `meja.css` | Monitoring: Peta, Daftar, Foto, rincian, tiket | `layar-peta` |
| `scripts/wa/arah.cjs`, `gateway/index.js` | Arahkan nomor lapor ke `/api/lapor/pesan`, teruskan lokasi dan foto WA, kirim PDF dan kabar status | `wa-bot` |
| `scripts/wa/lapor_pdf.mjs` | Tarik antrean PDF, cetak Playwright, unggah | `wa-bot` |
| `tests/lapor/*.test.mjs` | Uji mesin murni, percakapan emas, rute dengan D1 lokal, transisi tiket | `penulis-gerbang` |

Agent `lapor-ai` dibuat lewat `scripts/agents/roster.json` (AGENTS 1.5) saat LA-01 dimulai, sebagai pemilik `scripts/lapor/**`, `public/lapor/**`, `tests/lapor/**`, `src/lapor*.js`; `ilmu.mjs pemilik` lalu menunjuknya. Sampai itu, pemilik di tabel di atas berlaku.

## Skema D1 (`0155_lapor_ai.sql`)

```sql
CREATE TABLE IF NOT EXISTS lapor_pelapor (           -- identitas per nomor (D18); hanya monitoring staf
  wa TEXT PRIMARY KEY,                               -- 62..., terbaca (K7, D12)
  nama TEXT NOT NULL, peran TEXT NOT NULL CHECK (peran IN ('warga','bpbd_klaim','bpbd')),
  kab TEXT, jabatan TEXT, dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS lapor_izin (              -- izin uji F0 dan konfirmasi BPBD (D19)
  wa TEXT PRIMARY KEY, peran TEXT CHECK (peran IN ('bpbd') OR peran IS NULL), kab TEXT,
  oleh TEXT NOT NULL, dibuat INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS lapor_sesi (
  id TEXT PRIMARY KEY, wa TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('identitas','bercerita','melengkapi','ringkasan','terkirim','batal','kedaluwarsa')),
  tingkat TEXT NOT NULL CHECK (tingkat IN ('warga','bpbd_klaim','bpbd')),
  jenis TEXT, subjenis TEXT, kab TEXT, lat REAL, lon REAL,
  isian TEXT NOT NULL DEFAULT '{}',                  -- {nama: {nilai|nihil|belum, asal}}
  tanya TEXT, tunda TEXT,                            -- isian terakhir ditanya; cerita tertunda (A7)
  kerja TEXT NOT NULL DEFAULT '{}',                  -- keadaan mesin lain: langkah, calon, pilihan, ditanya, hitung
  nomor TEXT UNIQUE, versi INTEGER NOT NULL DEFAULT 0,
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS lapor_sesi_wa ON lapor_sesi(wa, diubah);
CREATE UNIQUE INDEX IF NOT EXISTS lapor_sesi_hidup ON lapor_sesi(wa) WHERE status IN ('identitas','bercerita','melengkapi','ringkasan');
CREATE INDEX IF NOT EXISTS lapor_sesi_waktu ON lapor_sesi(status, diubah);
CREATE TABLE IF NOT EXISTS lapor_pesan (             -- transkrip tersaring, append-only
  id INTEGER PRIMARY KEY, sesi TEXT NOT NULL, dari TEXT NOT NULL CHECK (dari IN ('pelapor','bot')),
  pintu TEXT NOT NULL CHECK (pintu IN ('wa','web')), teks TEXT, lampiran TEXT, waktu INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS lapor_pesan_sesi ON lapor_pesan(sesi, id);
CREATE TABLE IF NOT EXISTS lapor_versi (             -- laporan beku, append-only
  sesi TEXT NOT NULL, versi INTEGER NOT NULL, isi TEXT NOT NULL, waktu INTEGER NOT NULL,   -- kunci PDF ada di lapor_pdf
  PRIMARY KEY (sesi, versi));
CREATE TABLE IF NOT EXISTS lapor_foto (
  id TEXT PRIMARY KEY, sesi TEXT NOT NULL, kunci_r2 TEXT NOT NULL, lat REAL, lon REAL, akurasi REAL,
  waktu_ambil INTEGER, waktu_terima INTEGER NOT NULL,
  lencana TEXT NOT NULL CHECK (lencana IN ('gps','exif','wa','tanpa')), curiga INTEGER NOT NULL DEFAULT 0,
  pintu TEXT NOT NULL CHECK (pintu IN ('wa','web','tautan')));
CREATE INDEX IF NOT EXISTS lapor_foto_waktu ON lapor_foto(waktu_terima);
CREATE TABLE IF NOT EXISTS lapor_token (sha TEXT PRIMARY KEY, sesi TEXT NOT NULL, guna TEXT NOT NULL CHECK (guna IN ('kamera','cetak')), kedaluwarsa INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS lapor_tiket (
  nomor TEXT PRIMARY KEY, sesi TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('baru','ditelaah','diteruskan','ditindaklanjuti','selesai','tidak_valid')),
  diubah INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS lapor_tiket_status ON lapor_tiket(status, diubah);
CREATE TABLE IF NOT EXISTS lapor_tiket_riwayat (     -- append-only
  id INTEGER PRIMARY KEY, nomor TEXT NOT NULL, dari TEXT, ke TEXT NOT NULL, catatan TEXT, pelaku TEXT NOT NULL, waktu INTEGER NOT NULL,
  kabar_kirim INTEGER);                              -- jam kabar status terkirim ke pelapor (GET /api/lapor/kabar)
CREATE TABLE IF NOT EXISTS lapor_pdf (
  sesi TEXT NOT NULL, versi INTEGER NOT NULL, status TEXT NOT NULL CHECK (status IN ('antre','cetak','jadi','gagal')),
  coba INTEGER NOT NULL DEFAULT 0, diubah INTEGER NOT NULL, PRIMARY KEY (sesi, versi));
```

Tanpa trigger. Migrasi diterapkan ke produksi oleh pemilik. Pemeriksa: `migrasi-idempoten`.

## Rute

| Rute | Penjaga | Isi |
| --- | --- | --- |
| `POST /api/lapor/pesan` | Bearer `WA_MESIN` (gateway, membawa `wa`) atau sesi `/masuk` + header `x-pb` | `{teks?, lokasi?: {lat, lon, akurasi?, sumber}, pilihan?}` -> `{balasan, pilihan?, isian, status, nomor?}` |
| `GET /api/lapor/sesi` | sesi `/masuk` | sesi hidup + transkrip milik sendiri |
| `POST /api/lapor/foto` | `WA_MESIN` (foto chat WA + jam pesan), token kamera, atau sesi `/masuk` | aturan A4 dan D16 |
| `GET /api/lapor/l/:nomor` | pelapornya, staf, atau token cetak | laporan beku versi terakhir |
| `GET /api/lapor/pdf/antre`, `POST /api/lapor/pdf/:nomor/:versi` | `WA_MESIN` | ambil antrean, unggah PDF |
| `GET /api/lapor/kabar` | `WA_MESIN` | kabar status tiket yang belum terkirim ke pelapor |
| `POST /api/lapor/izin` | `WA_MESIN` atas perintah PEMILIK (`lapor izin <nomor> [bpbd <kab>]`, `lapor cabut <nomor>`), atau admin | `lapor_izin` |
| `GET /api/lapor/meja?dari&sampai&jenis&status&kab` | staf atau admin (Q12) | daftar ringan untuk Peta dan Daftar, paling banyak 1.000 baris, berindeks waktu |
| `GET /api/lapor/meja/:nomor` | staf atau admin | rincian, transkrip, foto, riwayat tiket |
| `POST /api/lapor/meja/:nomor/status` | staf atau admin | pindah status (A8) dengan catatan |
| `GET /api/lapor/foto/:id` | staf, admin, atau pelapornya | berkas R2, `cache-control: private, no-store` |

Batas laju (pola `laju` di `src/bnpb.js`): pesan 120 per nomor per hari, 20 per menit; laporan terkirim 5 per hari (Q9); foto 20 per laporan; pindah status 120 per jam per staf.

## Izin uji (K2)

Nomor uji pertama TIDAK masuk repo. Pemilik mendaftarkannya sekali dari WA: `lapor izin <nomor>` dari nomor PEMILIK, yang menulis `lapor_izin`. Gateway menyegarkan salinan daftar izin tiap 5 menit seperti `daftar.cjs`. F0: hanya nomor di `lapor_izin` yang diarahkan ke mesin lapor; pintu web mengecek nomor akun `/masuk`.

## Model

- `lapor_model.js` memanggil `https://api.anthropic.com/v1/messages` dengan `fetch`, model dari var `LAPOR_MODEL` (bawaan `claude-sonnet-5-5`, Q2), keluaran JSON berskema lewat `output_config.format` (forced `tool_choice` ditolak Sonnet 5.5), effort `low`, `max_tokens` 2048, timeout 15 detik, tanpa ulang; header `anthropic-version: 2026-10-21` dan `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`) supaya penolakan pengaman dialihkan server ke model cadangan. Bagian prompt yang tetap (aturan, spek ringkas) memakai cache prompt.
- Teks dikirim sesudah `samarkan`; identitas pelapor tidak pernah ikut.
- Pemakaian token per putaran dicatat di log Worker tanpa isi pesan.

## Web

- Vanilla JS tanpa build, modul ES. Geolocation `getCurrentPosition` (`enableHighAccuracy`, `maximumAge` 0); unggah foto `fetch` + `FormData`.
- Peta monitoring memakai pustaka dan gaya peta yang sama dengan `public/index.html`; tidak menambah pustaka peta baru.
- Rujuk skill `modern-web-guidance` sebelum menulis pola UI (aturan pemilik nomor 8).
- Ditinjau pemilik di `http://localhost:8800/lapor` dan `http://localhost:8800/lapor/meja` (AGENTS 3.8).

## Buku Besar dan meja `dampak` (F1)

- `scripts/siklus/pasang.py`: sumber `lapor_ai` ditambahkan ke `PRIORITAS_MASUK` (menempel seperti `lapsus`, tidak mendirikan gugus). Rekaman `warga` dan `bpbd_klaim` tidak pernah membuat gugus baru sendirian.
- Laporan `bpbd` terkirim memanggil fungsi simpan meja `dampak` yang sama dengan formulir, status `dilaporkan`; peta kolom spek ke kolom meja ada di `lapor_spek`.
