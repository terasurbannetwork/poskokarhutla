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

Batas laju (pola `laju` di `src/bnpb.js`): pesan 20 per menit, 60 per jam, dan 120 per hari per nomor, pintu web 300 per jam per IP /64 (pemilik 19 Nov 2026: kuota per jam); laporan terkirim 5 per hari (Q9); foto 10 per laporan (pemilik 19 Nov 2026, standar foto publik); pindah status 120 per jam per staf.

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

---

## Lanjutan 19 Nov 2026

Berlaku untuk 12 fitur lanjutan dan Meja lanjutan. Aturan migrasi: hanya `CREATE TABLE IF NOT EXISTS` dan `CREATE INDEX IF NOT EXISTS`; tanpa `ALTER`, tanpa trigger, tanpa mengubah tabel 0155 atau tabel LogPal (CHECK tidak bisa diubah idempoten, sehingga data baru memakai tabel samping). Nomor migrasi diambil saat tiket dikerjakan (paket lain memesan nomor di jalur yang sama; terakhir terlihat `0155_lapor_ai.sql`): di bawah disebut 0156 untuk fitur 1 sampai 6 dan 0157 untuk fitur 7 sampai 12 serta Meja. Pemeriksa `migrasi-idempoten`.

### Berkas baru dan pemilik

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `src/lapor_gugus.js` | Fungsi murni gugus (A9), jarak, pusat, label | `warga-api` |
| `src/lapor_kabar.js` | Fungsi murni pencocokan peringatan ke langganan (A10), uji sinar titik dalam poligon | `warga-api` |
| `src/lapor_tanya.js` | Fungsi murni indeks butir, BM25, pengalihan, rakit jawaban (A11) | `warga-api` |
| `src/lapor_lanjut.js` | Rute verifikasi, kontak BPBD, gugus, kabar balik, susulan, tanya, suara, luring, penilaian foto, ringkasan, tugas, massal, sinyal, pembanding | `warga-api` |
| `src/lapor_ringkas.js`, `src/lapor_tugas.js` | Fungsi murni A15 dan A16 | `warga-api` |
| `src/logpal_lapor.js` | Rute draf permintaan LogPal; hak lewat `src/hak.js` (T12 LogPal) | `warga-api` |
| `src/lapor_mesin.js` | Ditambah: jalur susulan (A12), jalur foto saja, jalur konfirmasi suara, perintah `tanya`, `berhenti kabar`, persetujuan kabar | `warga-api` |
| `scripts/siklus/pasang.py` | Sumber `lapor_ai` (A9), uji bawaannya | `siklus` |
| `scripts/wa/lapor_wa.mjs` | Ditambah: timer kabar BMKG, pengingat tugas, ringkasan harian, audio, kabar gugus, antrean penilaian foto | `wa-bot` |
| `scripts/wa/lapor_suara.mjs` | Unduh audio, `ffmpeg` ke wav, panggil transkripsi lokal, hapus audio, kirim teks ke Worker | `wa-bot` |
| `scripts/wa/lapor_foto_nilai.mjs` | Penilaian foto A14 | `wa-bot` |
| `scripts/wa/lapor_peringatan.mjs` | Tarik feed BMKG lewat parser `scripts/banjir/peringatan.py`, cocokkan langganan | `wa-bot` |
| `public/lapor/v.html`, `v.js` | Halaman bertoken BPBD: verifikasi dan tugas | `layar-peta` |
| `public/lapor/lapor.js` | Ditambah: tab Tanya, tombol Tambah kabar, mode luring dan Laporan cepat, persetujuan kabar | `layar-peta` |
| `public/sw-lapor.js` | Service worker cangkang `/lapor/` (pola `public/sw-lapangan.js`) | `layar-peta` |
| `public/lapor/meja.js`, `meja.css` | Ditambah: kelompok titik, lapisan, linimasa, kab terbanyak, urutan Perhatian, massal, waktu tanggap, layar besar, ekspor, tab Ringkasan dan Tugas, kartu gugus. Disunting juga oleh sesi lain; tiket LA-45 dan seterusnya mengikuti keadaan berkas pada saat dikerjakan | `layar-peta` |
| `public/lapor/sinyal_peta.js` | Lapisan staf di peta utama (dimuat malas oleh `public/index.html` bila rute `meja/sinyal` menjawab 200) | `layar-peta` |
| `public/prediksi/lapor_pembanding.js` | Bagian "Laporan warga lawan prediksi" di tab Rapor, hanya sesi staf | `prediksi` |
| `public/logpal/lapor_draf.js` | Daftar "Draf dari Lapor Bencana" di tab Permintaan LogPal | `warga-api` (LogPal) |
| `tests/lapor/*.test.mjs` | Uji tiap fungsi murni dan rute (RENCANA-UJI bagian 6 sampai 17) | `penulis-gerbang` |

### Skema D1 `0156_lapor_lanjutan.sql` (fitur 1 sampai 6)

```sql
CREATE TABLE IF NOT EXISTS lapor_kontak_bpbd (       -- Q16; nomor tidak pernah di repo
  kab TEXT NOT NULL, wa TEXT NOT NULL, nama TEXT, aktif INTEGER NOT NULL DEFAULT 1,
  oleh TEXT NOT NULL, dibuat INTEGER NOT NULL, PRIMARY KEY (kab, wa));
CREATE TABLE IF NOT EXISTS lapor_tautan (            -- tautan bertoken verifikasi dan tugas (lapor_token 0155 hanya kamera dan cetak)
  sha TEXT PRIMARY KEY, guna TEXT NOT NULL CHECK (guna IN ('verif','tugas')), ref TEXT NOT NULL,
  kedaluwarsa INTEGER NOT NULL, dibuat INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS lapor_tautan_ref ON lapor_tautan(guna, ref);
CREATE TABLE IF NOT EXISTS lapor_verif (             -- satu permintaan; permintaan ulang = baris baru
  id TEXT PRIMARY KEY, nomor TEXT NOT NULL, kab TEXT NOT NULL, kontak_wa TEXT NOT NULL,
  diminta_oleh TEXT NOT NULL, waktu INTEGER NOT NULL, kedaluwarsa INTEGER NOT NULL,
  terkirim INTEGER, pengingat INTEGER);
CREATE INDEX IF NOT EXISTS lapor_verif_nomor ON lapor_verif(nomor, waktu);
CREATE TABLE IF NOT EXISTS lapor_verif_jawab (       -- append-only; jawaban terbaru dipakai
  id INTEGER PRIMARY KEY, verif TEXT NOT NULL, hasil TEXT NOT NULL CHECK (hasil IN ('benar','sebagian','tidak_ditemukan')),
  koreksi TEXT, nama TEXT NOT NULL, jabatan TEXT, waktu INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS lapor_verif_jawab_verif ON lapor_verif_jawab(verif, id);
CREATE TABLE IF NOT EXISTS lapor_gugus (
  id TEXT PRIMARY KEY, jenis TEXT NOT NULL, kab TEXT NOT NULL, lat REAL, lon REAL, radius_m INTEGER,
  n_laporan INTEGER NOT NULL, n_pelapor INTEGER NOT NULL, mulai INTEGER NOT NULL, akhir INTEGER NOT NULL,
  label TEXT NOT NULL CHECK (label IN ('gugus','gugus_kuat')), digabung_ke TEXT, diubah INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS lapor_gugus_cari ON lapor_gugus(jenis, akhir);
CREATE TABLE IF NOT EXISTS lapor_gugus_anggota (
  nomor TEXT PRIMARY KEY, gugus TEXT NOT NULL, jarak_m INTEGER, masuk INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS lapor_gugus_anggota_g ON lapor_gugus_anggota(gugus);
CREATE TABLE IF NOT EXISTS lapor_langganan (         -- opt-in kabar balik (Q20); lokasi dibulatkan 0,01 derajat
  wa TEXT PRIMARY KEY, setuju INTEGER NOT NULL CHECK (setuju IN (0,1)), waktu INTEGER NOT NULL,
  lat_r REAL, lon_r REAL, kab TEXT, kec TEXT, laporan_terakhir INTEGER);
CREATE TABLE IF NOT EXISTS lapor_kabar (
  id TEXT PRIMARY KEY, jenis TEXT NOT NULL CHECK (jenis IN ('bmkg','gugus')), kunci TEXT NOT NULL UNIQUE,
  teks TEXT NOT NULL, dibuat INTEGER NOT NULL, disetujui_oleh TEXT);
CREATE TABLE IF NOT EXISTS lapor_kabar_tujuan (
  kabar TEXT NOT NULL, wa TEXT NOT NULL, kirim INTEGER, galat INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (kabar, wa));
CREATE INDEX IF NOT EXISTS lapor_kabar_tujuan_wa ON lapor_kabar_tujuan(wa, kirim);
CREATE TABLE IF NOT EXISTS lapor_susulan (
  sesi TEXT NOT NULL, versi INTEGER NOT NULL, ringkas TEXT NOT NULL, pintu TEXT NOT NULL CHECK (pintu IN ('wa','web','luring')),
  pelaku TEXT NOT NULL CHECK (pelaku IN ('pelapor','bpbd')), waktu INTEGER NOT NULL, PRIMARY KEY (sesi, versi));
CREATE TABLE IF NOT EXISTS lapor_suara (             -- transkrip menunggu konfirmasi; audio tidak pernah disimpan
  id TEXT PRIMARY KEY, sesi TEXT NOT NULL, durasi_dtk INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('antre','jadi','dikonfirmasi','ditolak','gagal')), teks TEXT, dibuat INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS lapor_tanya_log (         -- tanpa teks pertanyaan dan tanpa nomor (Q24)
  id INTEGER PRIMARY KEY, waktu INTEGER NOT NULL, topik TEXT, skor REAL, ada INTEGER NOT NULL, nilai INTEGER);
```

### Skema D1 `0157_lapor_lanjutan2.sql` (fitur 7 sampai 12 dan Meja)

```sql
CREATE TABLE IF NOT EXISTS lapor_luring (            -- kunci idempotensi dari antre.js
  klien_id TEXT PRIMARY KEY, sesi TEXT NOT NULL, waktu_klien INTEGER NOT NULL, waktu_terima INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS lapor_foto_luring (       -- lencana lemah (D44); lapor_foto 0155 tidak diubah
  foto_id TEXT PRIMARY KEY, lat REAL, lon REAL, akurasi REAL, waktu_ambil_klien INTEGER, waktu_gps INTEGER);
CREATE TABLE IF NOT EXISTS lapor_foto_nilai_antre (
  foto_id TEXT PRIMARY KEY, status TEXT NOT NULL CHECK (status IN ('antre','proses','jadi','gagal')),
  coba INTEGER NOT NULL DEFAULT 0, diubah INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS lapor_foto_nilai (        -- baris baru per versi aturan, tidak ditimpa
  foto_id TEXT NOT NULL, versi_aturan INTEGER NOT NULL, skor_buram REAL, buram INTEGER, lama_jam REAL,
  hash TEXT, mirip TEXT, relevan TEXT CHECK (relevan IS NULL OR relevan IN ('ya','tidak','tidak_jelas')),
  dinilai INTEGER NOT NULL, PRIMARY KEY (foto_id, versi_aturan));
CREATE INDEX IF NOT EXISTS lapor_foto_nilai_waktu ON lapor_foto_nilai(dinilai);
CREATE TABLE IF NOT EXISTS lapor_ringkasan (
  tanggal TEXT NOT NULL, versi INTEGER NOT NULL, dari INTEGER NOT NULL, sampai INTEGER NOT NULL,
  isi TEXT NOT NULL, teks TEXT NOT NULL, dibuat INTEGER NOT NULL, oleh TEXT NOT NULL, PRIMARY KEY (tanggal, versi));
CREATE TABLE IF NOT EXISTS lapor_tugas (
  id TEXT PRIMARY KEY, nomor TEXT NOT NULL, penerima_jenis TEXT NOT NULL CHECK (penerima_jenis IN ('staf','bpbd')),
  penerima TEXT NOT NULL, paket TEXT, tenggat INTEGER NOT NULL, catatan TEXT,
  status TEXT NOT NULL CHECK (status IN ('terbuka','selesai','dibatalkan','dialihkan')),
  dibuat_oleh TEXT NOT NULL, dibuat INTEGER NOT NULL, ingat1 INTEGER, ingat2 INTEGER, tindakan_pertama INTEGER, selesai INTEGER);
CREATE INDEX IF NOT EXISTS lapor_tugas_nomor ON lapor_tugas(nomor, status);
CREATE INDEX IF NOT EXISTS lapor_tugas_tenggat ON lapor_tugas(status, tenggat);
CREATE TABLE IF NOT EXISTS lapor_tugas_riwayat (     -- append-only
  id INTEGER PRIMARY KEY, tugas TEXT NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('dibuat','diterima','ditangani','selesai','dibatalkan','dialihkan','tindakan_sesudah_tenggat')),
  catatan TEXT, pelaku TEXT NOT NULL, waktu INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS lapor_tugas_riwayat_t ON lapor_tugas_riwayat(tugas, id);
CREATE TABLE IF NOT EXISTS lapor_ganda (             -- append-only; pembatalan = baris batal 1
  id INTEGER PRIMARY KEY, nomor TEXT NOT NULL, ganda_dari TEXT NOT NULL, batal INTEGER NOT NULL DEFAULT 0 CHECK (batal IN (0,1)),
  pelaku TEXT NOT NULL, waktu INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS lapor_ganda_nomor ON lapor_ganda(nomor, id);
CREATE TABLE IF NOT EXISTS lapor_logpal_draf (       -- skema LogPal tidak disentuh
  id TEXT PRIMARY KEY, nomor TEXT NOT NULL, kab TEXT NOT NULL, provinsi TEXT NOT NULL, bpbd TEXT NOT NULL,
  jiwa INTEGER, items TEXT NOT NULL CHECK (json_valid(items)),
  status TEXT NOT NULL CHECK (status IN ('baru','dipakai','dibuang','kedaluwarsa')), permintaan_id TEXT,
  dibuat_oleh TEXT NOT NULL, dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS lapor_logpal_draf_kab ON lapor_logpal_draf(kab, status);
```

Kolom `dilihat` tidak ada: penanda dilihat adalah baris `lapor_tiket_riwayat` dengan `dari = ke = 'baru'` dan `catatan = 'dilihat'` (Q39). Kolom rumit tidak dibuat untuk skor perhatian, waktu tanggap, kelompok titik, dan linimasa (semuanya turunan di klien).

### Rute baru

| Rute | Penjaga | Isi |
| --- | --- | --- |
| `POST /api/lapor/meja/:nomor/verif` | staf Q8 | Buat permintaan verifikasi, token, antrean kirim; balas pratinjau penerima |
| `GET /api/lapor/v/:token`, `POST /api/lapor/v/:token/jawab` | token `verif` atau `tugas` | Ringkasan tanpa data pelapor; jawaban; daftar tugas paket |
| `POST /api/lapor/kontak` | `WA_MESIN` atas PEMILIK (`lapor kontak <kab> <nomor>`, `lapor kontak cabut ...`) atau admin | `lapor_kontak_bpbd` |
| `GET /api/lapor/meja/gugus`, `GET /api/lapor/meja/sinyal` | staf | Gugus dan laporan 48 jam tanpa identitas (A17) |
| `GET /api/lapor/langganan`, `POST /api/lapor/kabar/bmkg` | `WA_MESIN` | Daftar langganan setuju; pencatatan kabar BMKG dengan kunci unik (dedupe dan batas D33), jawaban = daftar penerima yang diizinkan |
| `POST /api/lapor/meja/gugus/:id/kabari` | staf Q22 | Pratinjau (GET) dan persetujuan (POST) kabar gugus |
| `GET /api/lapor/kabar-balik`, `POST /api/lapor/kabar-balik/:id/terkirim` | `WA_MESIN` | Antrean pesan kabar yang disetujui, penanda terkirim |
| `POST /api/lapor/tanya` | sesi `/masuk` atau `WA_MESIN` | `{pertanyaan}` -> `{jawaban, sumber[], topik}` atau `{tidak_ada, topik_terdekat[]}` |
| `POST /api/lapor/suara` | `WA_MESIN` | `{wa, durasi_dtk, teks}`; menyimpan transkrip menunggu konfirmasi |
| `POST /api/lapor/luring` | sesi `/masuk` | A13 |
| `GET /api/lapor/foto-nilai/antre`, `POST /api/lapor/foto-nilai/:id`, `GET /api/lapor/foto-nilai/hash?sejak` | `WA_MESIN` | A14 |
| `POST /api/lapor/ringkasan/buat`, `GET /api/lapor/ringkasan`, `GET /api/lapor/ringkasan/:tanggal` | `WA_MESIN` (buat), staf (baca) | A15 |
| `POST /api/lapor/meja/:nomor/tugas`, `POST /api/lapor/tugas/:id/aksi`, `GET /api/lapor/meja/tugas`, `GET /api/lapor/tugas/ingat` | staf, token `tugas`, staf, `WA_MESIN` | A16 |
| `POST /api/lapor/meja/massal` | staf | A25 |
| `GET /api/lapor/meja/pembanding?hari=14` | staf | A19, kolom dilaporkan per kab, tanggal, jenis |
| `POST /api/lapor/meja/:nomor/logpal-draf` | staf Q33 | Pratinjau (GET) dan buat (POST) draf (A20) |
| `GET /api/instansi/logpal/lapor-draf`, `POST /api/instansi/logpal/lapor-draf/:id/pakai` | sesi LogPal sah, hak D2 LogPal | Daftar draf kab itu; penandaan `dipakai` |

Batas laju tambahan: verifikasi 20 per jam per staf; tanya 30 per jam per nomor; suara 3 per laporan dan 10 per hari per nomor; tugas baru 120 per jam per staf; massal 50 nomor per panggilan. Semua jawaban rute staf `cache-control: private, no-store`, `x-robots-tag: noindex`; rute tautan sama, plus `referrer-policy: no-referrer`.

### Detail per fitur

- **Kabar BMKG.** `lapor_peringatan.mjs` memakai parser Python `scripts/banjir/peringatan.py` (`nowcast`), dipanggil lewat `child_process` dari Node seperti `scripts/wa/ocr.cjs` memanggil biner, tiap 10 menit (Q27). Pencocokan titik dalam poligon di `src/lapor_kabar.js` (juga dipakai uji) tetapi dijalankan di gateway memakai salinan fungsi yang sama diimpor sebagai berkas bersama; Worker hanya memberi izin kirim lewat kunci unik.
- **Suara.** Transkripsi lokal oleh biner terpasang pemilik di Mac mini (Q25, bawaan whisper.cpp); `lapor_suara.mjs` mengeksekusinya dengan batas waktu 90 detik dan menghapus audio dan wav di blok `finally`. Bila biner tidak terpasang, bot membalas "Kirim dalam bentuk tulisan" (perilaku Q6 sekarang).
- **Luring.** `public/lapor/lapor.js` memuat `public/inti/antre.js` sebagai skrip klasik (aturan antre.js: global `PbAntre`), membuat `PbAntre.saluran("lapor", {kirim: ..., header: ..., media: ...})`, dan memasang pita `PbAntre.pasangPita`. Dilarang membuat `indexedDB.open` sendiri (gerbang keterpaduan). `public/sw-lapor.js` men-cache cangkang halaman, spek, dan `edukasi.json` (strategi: jaringan dulu untuk API, cache untuk berkas statis), bercakupan `/lapor/`; didaftarkan hanya dari halaman `/lapor`.
- **Penilaian foto.** Mac mini mengunduh foto lewat rute foto berkunci dan menyimpan salinan hash di berkas lokal `~/.wa-bot/lapor_hash.json` (tanpa foto). Biner `ffmpeg` dicari di `/opt/homebrew/bin/ffmpeg` (pola `scripts/wa/ocr.cjs`); tanpa `ffmpeg` penilaian dilewati dan ditulis `gagal`.
- **Ringkasan harian.** Timer di `lapor_wa.mjs` pada 06.05 WIB; bila Mac mini mati saat itu, saat menyala memeriksa tanggal yang belum punya versi 1 dan membuatnya (satu hari kebelakang paling banyak).
- **Sinyal awal dan pembanding.** `public/index.html` memuat `sinyal_peta.js` hanya sesudah `fetch("/api/lapor/meja/sinyal?...")` menjawab 200; tanpa sesi 403 dan tidak ada permintaan lanjutan. Pembanding memuat arsip prediksi dari sumber statis yang sama dengan tab Rapor `/prediksi` (path dibaca dari DESAIN-TEKNIS paket `prediksi-besok` saat LA-43), dan `meja/pembanding` dari D1; penggabungan di klien.
- **LogPal.** `src/logpal_lapor.js` baru, tidak menambah baris di `src/logpal.js` (T12 dan plafon `tests/agen/fixtures/d1-sisa.json`); akses D1 baru hanya lewat `src/hak.js`. Halaman `/instansi/logpal` mendapat satu skrip tambahan; D7 LogPal (wajib login) tetap.
- **Meja lanjutan.** Semua olahan (kelompok titik, linimasa, kab terbanyak, urutan Perhatian, waktu tanggap, layar besar) di klien dari satu rute daftar yang diperluas dengan kolom ringan: `korban_ada`, `foto_sah`, `lokasi_tingkat`, `dilihat_pada`, `ditindak_pada`, `gugus`, `gugus_label`, `verif_hasil`, `ada_susulan`, `tugas_tenggat`, `tugas_tindakan`, `ganda_dari`. Tetap paling banyak 1.000 baris, berindeks waktu, tanpa pemindaian penuh (kuota baca D1, memori `d1-kuota-baca`). Ekspor memakai `public/bnpb/dalops_hitung.js` dan `/vendor/jspdf`: `meja.html` memuat berkas itu dengan `<script src>` (rujukan, bukan salinan; pemeriksa `ruang-bnpb` ditambahkan di tiket LA-52).
- **Rujukan web.** Semua kode web klien baru dirujuk ke skill `modern-web-guidance` sebelum ditulis (aturan pemilik nomor 8): terutama Fullscreen, Screen Wake Lock, service worker, `<dialog>`, dan `prefers-reduced-motion`; fitur Baseline Newly atau Limited hanya dengan deteksi fitur dan cadangan yang jalan.
- **Tinjau lokal.** Server tinjau `scripts/lapor/lokal.mjs` menjawab rute lapor dengan mesin lokal; rute lanjutan ditambahkan di sana dengan data berkas (bukan D1) sampai Worker dan D1 dipasang, dan tidak meneruskan ke produksi. Tautan tinjau: `http://localhost:8800/lapor`, `/lapor/meja`, `/lapor/meja?layar=besar`, `/lapor/v.html?t=...`.

## Lanjutan 23 Nov 2026 (K90-K92)

### Skema D1 (migrasi berikutnya, nomor diambil saat LA-80 dikerjakan)

- `lapor_selamat`: `id`, `nomor` (62…), `nama_panggil`, `status` (`selamat`, `butuh_bantuan`), `kab`, `token_sha`, `dibuat`, `kedaluwarsa`, `dicabut`. Indeks `nomor`, `token_sha`.
- `lapor_cari`: `id`, `nomor_pencari`, `nama_dicari`, `ciri`, `lokasi_terakhir`, `waktu_terakhir`, `nomor_dicari` (boleh kosong), `hubungan`, `kab`, `status` (`buka`, `ditemukan_selamat`, `ditemukan_meninggal`, `ke_sar`, `tutup`), `dibuat`, `ditutup_oleh`, `ditutup`. Riwayat status append-only di `lapor_cari_riwayat`.
- Laporan: kolom `cara` (`biasa`, `darurat`, `sekali_ketuk`) dan `sumber_lokasi` (`gps`, `pilih`, `poster`) bila belum ada padanannya.

### Rute baru

| Rute | Penjaga | Isi |
| --- | --- | --- |
| `POST /api/lapor/darurat/cepat` | laju perangkat dan IP (A29) | Buat sesi darurat sekali ketuk; balas nomor tiket, nomor BPBD, token sesi chat |
| `POST /api/lapor/selamat` | sesi kode sekali pakai tujuan `selamat` | Buat atau ganti tanda; balas tautan |
| `DELETE /api/lapor/selamat` | sesi yang sama | Cabut tanda dan token |
| `GET /api/lapor/s/:token` | token | Nama panggilan, status, waktu, kab/kota |
| `POST /api/lapor/cari` | sesi kode sekali pakai | Laporan orang dicari |
| `GET /api/lapor/meja/cari`, `POST /api/lapor/meja/cari/:id/status` | hak meja D95 | Daftar orang dicari wilayahnya dan tanda cocok; tutup laporan |

Halaman: `public/lapor/index.html` dan `lapor.js` (tombol, layar sesudah ketuk, kabar selamat, `?d=`), `public/lapor/s/` (tautan selamat), `public/lapor/meja.js` (chip, daftar orang dicari, pembuat poster), `public/lapor/poster.css` (cetak). Poster tidak memakai rute Worker.
