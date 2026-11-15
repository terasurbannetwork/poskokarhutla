# DESAIN-TEKNIS: Paritas Bencana

Tunduk pada `KEPUTUSAN-PARITAS.md`, `PRD.md`, `RISET.md`. Dibaca terhadap HEAD 504ed9ba4 (15 Nov 2026); nomor baris bisa bergeser, cek ulang di tiket. Fitur F-1 sampai F-33 mengikuti PRD. Kata "semua" = delapan bencana D2 ditambah karhutla bila disebut.

Satu prinsip memegang seluruh dokumen (D1): kemampuan dibangun SEKALI di `src/`, `scripts/umum/`, `public/inti/`, lalu dinyalakan per bencana lewat `public/bencana.json`. Tidak ada `src/<bencana>_operasi.js`, tidak ada `renlap_<bencana>.py` baru.

## 1. Registri kemampuan per bencana (`public/bencana.json`)

Sumber tunggal registri sudah `public/bencana.json`; `scripts/umum/bencana.py` (`periksa`, `bangkitkan`) menegakkan skema dan membangkitkan `src/bencana.generated.js`; gerbang `tests/agen/gerbang-bencana.test.mjs` menolak bila `src/bencana.generated.js` basi. Kunci baru ditambahkan ke tiap entri (delapan bencana plus karhutla), dan `bencana.py` menjadi satu-satunya penegak skemanya.

```json
"kemampuan": {
  "operasi": true,                 // F-1: bencana ini boleh punya operasi dan renlap
  "renlap": {"sarana": ["perahu_karet","pompa_air","tenda"], "bobot": "banjir"},   // F-2, F-3: jenis sarana sah + kunci bobot di bobot_renlap.json
  "dokumen": ["sitrep","renops","laporan_kib"],          // F-8..F-10
  "ews": {"kunci": ["banjir"], "tangga": true},          // F-14, F-15: jenis aturan di src/ews.js, entri public/ews_tindakan.js
  "dasbor": {"ringkas": "banjir", "papan_sk": true},     // F-18..F-20: berkas ringkas dan ikut papan status darurat
  "ekonomi": false, "pencegahan": false, "prioritas": false   // F-21..F-23: menyala per bencana saat datanya bersumber
}
```

| Aturan | Isi |
| --- | --- |
| Nilai bawaan | kunci tidak ada = `false`/kosong. Bencana yang belum menyalakan `operasi` tidak muncul di pemilih jenis operasi, dan rute `/api/pb/*` menjawab 404 untuk `bencana` itu. |
| Penjaga | `bencana.py periksa` menolak `sarana` bukan anggota `SARANA` (§3.1), `dokumen` bukan anggota daftar jenis dokumen (§3.4), `bobot` tanpa kunci di `scripts/operasi/bobot_renlap.json`, dan `ews.kunci` tanpa aturan di `src/ews.js`. |
| Pembaca Worker | `src/bencana.generated.js` diimpor Worker; rute membaca `KEMAMPUAN[bencana]` untuk validasi masukan (jenis sarana, jenis dokumen). Tidak ada daftar jenis kedua di kode rute. |
| Pembaca layar | `public/inti/*.js` memuat `/bencana.json` yang sudah dimuat layar; layar tidak mencabangkan `if (bencana === "banjir")`. |
| Pemilik | `public/bencana.json` dan `public/inti/**` milik `inti-layar`; `scripts/umum/bencana.py` milik `pipa-umum`; `src/bencana.generated.js` milik `warga-api`. |

Pemetaan id: registri memakai `gempa`, `gunungapi`; `logbook_kejadian.jenis` (migrasi 0091) memakai `gempabumi`, `gunungapi`, `gelombang_pasang`, `longsor`, dan seterusnya; pengenal jenis tugas (`src/tugas_bencana.js`) memakai `gunungapi`. Satu tabel pemetaan `JENIS_LOGBOOK_KE_BENCANA` ditaruh di `scripts/umum/bencana.py` dan salinannya di `src/bencana.generated.js` (dibangkitkan, bukan ditulis tangan); `pesisir` memetakan `gelombang_pasang` dan `abrasi` [BAWAAN SEMENTARA, lihat Q25].

## 2. Membuka operasi lapangan untuk semua jenis tanpa memundurkan karhutla (F-1, F-2, F-4, F-6)

### 2.1 Apa yang sebenarnya menolak

Pembacaan kode (bukan asumsi audit): `src/operasi_lapangan.js:162-163` `infoKluster` mengembalikan `null` bila `bencanaTugas !== "karhutla"`. Itu benar dan TIDAK dilepas: kluster, poligon, dan angin berasal dari `tugas_kompleks.json` (karhutla), dan banjir tidak boleh menempel pada api terdekat. Rute operasi (`RUTE_OPS`, `src/operasi_lapangan.js:882`) sendiri tidak menolak tugas non-karhutla; yang menutup paritas adalah empat hal lain:

| No | Penghambat | Bukti | Perbaikan |
| --- | --- | --- | --- |
| H1 | Jenis tugas hanya tujuh: `src/tugas_bencana.js` `BENCANA` tanpa `longsor` dan `pesisir`; CHECK `tugas_bencana.bencana` (migrasi 0047) menolak keduanya | `bencanaId()` mengembalikan `karhutla` untuk id tak dikenal, jadi tugas longsor akan diam-diam jadi karhutla | tambah dua entri di `BENCANA`; tabel samping baru `tugas_bencana_x` (§3.2); satu fungsi baca di `src/hak.js` |
| H2 | Percabangan `bc === "karhutla"` untuk teks: `src/operasi_lapangan.js:363` (`awalPeriode`), `:599` (riwayat) | kalimat sasaran dan keselamatan karhutla vs satu kalimat umum "Tangani X" | teks dari registri: `labelBencana(bc)` ditambah kunci `sasaran`, `keselamatan`, `deteksi` per jenis di `BENCANA` (`src/tugas_bencana.js`), karhutla memakai kalimat yang sama persis seperti sekarang |
| H3 | Daftar periksa regu per jenis kurang pesisir dan longsor (`src/penugasan.js:42-47`) | audit pesisir G01, longsor | tambah dua entri; isi dari `PRAKTIK-PENANGANAN.md` bagian 2.2 (hanya butir bertanda [repo] atau [korpus]; butir [ingatan] ditunda, Q9) |
| H4 | Tugas pesisir dan longsor tidak pernah dibuat: `scripts/umum/tugas.py:18,159` punya adaptor untuk kekeringan, gunung api, cuaca, tetapi tidak longsor, pesisir | audit | dua adaptor baru menulis `public/data/tugas_longsor.json` dan `tugas_pesisir.json` berkontrak sama dengan `tugas_<id>.json` (kontrak di kepala `src/tugas_bencana.js`); langkah di `lintas.yml:293` |

### 2.2 Jaminan karhutla tidak mundur

1. Tidak ada fungsi karhutla yang diubah perilakunya; hanya sumber teks yang dipindah ke `BENCANA.karhutla.*` dengan string identik. Uji golden baru `tests/warga/pb_karhutla_tetap.test.mjs`: `awalPeriode` (`src/operasi_lapangan.js:358`) dan `infoKluster` (`:162`) TIDAK diekspor dan src tidak disentuh untuk menguji; uji memanggil rute `RUTE_OPS` (`:882`) lewat Worker nyata dengan Miniflare (pola `tests/warga/operasi_lapangan.test.mjs`, tugas karhutla uji dari fixture) dan membandingkan keluaran rute (kolom `awal` pada daftar periode, rincian tugas yang memuat kluster, riwayat) dengan string yang dibekukan di fixture (dibuat SEBELUM refaktor, di tiket yang sama, commit terpisah lebih awal).
2. `tests/warga/operasi_lapangan.test.mjs` dan `tests/warga/operasi_udara.test.mjs` tetap hijau tanpa disunting.
3. Skrip hitung ADA (PB-01, §10) dijalankan sebelum dan sesudah; hitungan karhutla tidak boleh turun (PRD bagian 3).
4. Bila migrasi 0130 belum diterapkan di produksi: `tugasBencanaPer` (§3.2) menangkap `no such table: tugas_bencana_x` dan memakai hanya `tugas_bencana`; tugas longsor dan pesisir baru dibuat hanya bila `SELECT 1 FROM tugas_bencana_x LIMIT 0` berhasil. Karhutla dan tujuh jenis lama tetap jalan.

### 2.3 Sarana dan sumber daya per bencana (F-2) dan fasilitas sasaran (F-7)

Satu tabel `pb_titik` (§3.3) memuat dua golongan: `sarana` (alat, kendaraan, tenda, pompa: yang dimiliki atau ditempatkan) dan `fasilitas` (tempat evakuasi, faskes, sekolah, gudang, helipad, sumber air: yang sudah ada di lapangan). `JENIS_SUMBER` di `src/operasi_lapangan.js:23` (sungai, kanal, embung, sumur bor, sekat kanal, hidran) tetap milik karhutla; jenis sumber air untuk bencana lain masuk `pb_titik.jenis = 'sumber_air'` dan dibaca renlap.

Daftar jenis tetap (`SARANA` dan `FASILITAS`), ditaruh di `src/tugas_bencana.js` (modul murni tanpa impor, dipakai push, kabar, pantau) dan dicerminkan CHECK tabel:

| Golongan | Jenis (id) | Dipakai bencana |
| --- | --- | --- |
| sarana | `heli_evakuasi`, `perahu_karet`, `perahu_motor`, `pompa_air`, `truk_tangki`, `tenda`, `terpal`, `atap_darurat`, `alat_berat`, `genset`, `dapur_umum`, `masker`, `air_bersih_unit`, `tim_sar_unit` | per `bencana.json kemampuan.renlap.sarana` |
| fasilitas | `tempat_evakuasi`, `faskes`, `sekolah`, `gudang`, `helipad`, `sumber_air`, `barak`, `ruang_udara_bersih`, `pos_pantau` | per `bencana.json` |

`tim_sar_unit` mencatat satuan (unit regu), bukan nama orang; jumlah anggota hanya angka (`kapasitas`).

### 2.4 Isian manual, hak, dan wilayah (F-4, Q3)

Pola `src/operasi_isian.js` ditiru, tidak disalin: modul baru `src/pb_isian.js` memakai ulang `bungkus`, `tglSah`, `bacaBody`, penjaga Galat, batas laju dari log. Perbedaan dari Operasi Udara:

| Hal | Operasi Udara (`src/operasi_isian.js`) | Paritas (`src/pb_isian.js`), Q3 bawaan sementara |
| --- | --- | --- |
| Penulis | `PERAN_TULIS = ["pusdalops"]` + `modOK` | `pusdalops` + `modOK` (nasional atau sesuai wilayah staf), DAN akun instansi pemda aktif (pemprov, pemkab, pemkot) untuk wilayah akunnya sendiri (`akunAktif`, `src/instansi.js:118`) |
| Wilayah | nasional | staf: `staf.wilayah` = larik kode provinsi BPS, kosong = nasional, disaring `dalamWilayahStaf(req, [prov])` (`src/staf.js:95`). Akun instansi: `instansi_akun` (migrasi 0029) punya `jenis` (pemprov, pemkab, pemkot, polda, polres, kodam, kodim; TIDAK ada jenis `bpbd`), `tingkat` (`prov`/`kab`), `prov` (2 digit), `kab` (NAMA teks, bukan kode 4 digit) dan `kunci_wilayah`. Pembatas yang dapat dipercaya hanya `prov`; untuk `tingkat = 'kab'` kecocokan `kab` memakai `kunci_wilayah`, bukan perbandingan nama bebas (Q30) |
| Pencatat | `staf:<id>` atau `admin:<hash12>` | tambah `inst:<id>` (id akun instansi, bukan nama) |
| Hapus | `terhapus` di `op_isian` | hapus lunak per baris (`diubah`, `dihapus`), riwayat di `pb_log` |

Bila Q3 dijawab pemilik lain, perubahan terbatas pada fungsi `penulis(env, req, prov, kab)` di `src/pb_isian.js`.

### 2.5 Tugas dan regu per jenis (F-6)

Tidak ada modul baru. Tiga perubahan kecil:

1. `src/penugasan.js:42-47`: daftar periksa per jenis ditambah pesisir dan longsor; jenis lain diperkaya hanya dengan butir bersumber (§2.1 H3).
2. `scripts/umum/tugas.py`: adaptor longsor dan pesisir (§2.1 H4); `umurMaksJam` dan `reda` per jenis di `BENCANA` (`reda: null` dan `umurMaksJam: 72` untuk longsor dan pesisir [BAWAAN SEMENTARA, kaji cepat 72 jam seperti gempa]).
3. `src/instansi.js:335` `bencanaPer` didelegasikan ke `tugasBencanaPer` di `src/hak.js` (§3.2). Jumlah `.prepare(` di `src/instansi.js` TURUN satu, sehingga ratchet `tests/agen/fixtures/d1-sisa.json` menyusut (diperbarui di commit yang sama).

## 3. Skema D1 (migrasi 0130 dan 0131)

### 3.1 Aturan migrasi

| Aturan | Dasar |
| --- | --- |
| Nomor berikutnya = **0130**, lalu **0131**. Terakhir yang ada: `0129_semai_target.sql`; `tests/warga/migrasi_beku.json` berhenti di 0129 (134 baris). Nomor dicek ulang saat tiket (paket lain bisa mengambil 0130 lebih dulu); bila terpakai, geser berurut. | `ls migrations`, `migrasi_beku.json:133` |
| Hanya `CREATE TABLE IF NOT EXISTS` dan `CREATE INDEX IF NOT EXISTS`. Tanpa `ALTER`, tanpa seed, tanpa `DROP`. | `ALTER ADD COLUMN` tidak idempoten di D1 (pola 0106, 0126) |
| Tabel samping untuk perubahan CHECK pada tabel lama (§3.2). | SQLite tidak bisa mengubah CHECK; 0091 harus membangun ulang tabel, dihindari |
| Setelah diterapkan, hash berkas masuk `tests/warga/migrasi_beku.json` (gerbang `tests/warga/migrasi_beku.test.mjs`); migrasi yang sudah jalan tidak disunting. | AGENTS.md 3.4 |
| Kode yang membaca tabel baru tahan terhadap tabel belum ada: `tanpaTabelPb(e)` = `/no such table: (main\.)?(pb_|tugas_bencana_x|peringatan_x)/i`; rute tulis menjawab 503 "migrasi 0130 belum diterapkan", rute baca menjawab daftar kosong dengan `tersedia: false`. Urutan tayang dan migrasi tidak saling menunggu. | pola `tanpaTabel` di `src/operasi_udara.js:13` |
| Produksi: pemilik menerapkan migrasi (memori `ruang-bnpb`); jangan mengasumsikan sudah jalan. | PRD bagian 6 butir 10 |
| Pemeriksa: `migrasi-idempoten`; tiap tabel/trigger/CHECK baru masuk `tests/warga/cakupan.json` (`diuji` atau `dikecualikan`) dan punya uji integrasi yang menjalankan SQL-nya (TEST.md; `node:sqlite` lewat `tests/warga/_bantu.mjs` `migrasi()`). | `tests/warga/cakupan.json` |

### 3.2 Migrasi 0130: operasi, sarana, renlap (F-1 sampai F-7)

```sql
-- Jenis tugas longsor dan pesisir (CHECK tugas_bencana 0047 tidak mencakupnya). Tabel samping 1:1; baris tak ada di kedua tabel = karhutla.
CREATE TABLE IF NOT EXISTS tugas_bencana_x (
  tugas_id TEXT PRIMARY KEY REFERENCES tugas_api (id) ON DELETE CASCADE,
  bencana TEXT NOT NULL CHECK (bencana IN ('longsor','pesisir')),
  reda INTEGER NOT NULL DEFAULT 0 CHECK (reda >= 0));
CREATE INDEX IF NOT EXISTS tugas_bencana_x_jenis ON tugas_bencana_x (bencana);

-- Sarana dan fasilitas sasaran (F-2, F-7). Tanpa nama orang, tanpa nomor telepon.
CREATE TABLE IF NOT EXISTS pb_titik (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  golongan TEXT NOT NULL CHECK (golongan IN ('sarana','fasilitas')),
  jenis TEXT NOT NULL CHECK (jenis IN ('heli_evakuasi','perahu_karet','perahu_motor','pompa_air','truk_tangki','tenda','terpal','atap_darurat','alat_berat','genset','dapur_umum','masker','air_bersih_unit','tim_sar_unit','tempat_evakuasi','faskes','sekolah','gudang','helipad','sumber_air','barak','ruang_udara_bersih','pos_pantau')),
  bencana TEXT NOT NULL CHECK (bencana IN ('karhutla','banjir','longsor','pesisir','cuaca','udara','kekeringan','gempa','gunungapi')),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  kab TEXT NOT NULL DEFAULT '' CHECK (kab = '' OR length(kab) = 4),
  nama TEXT NOT NULL CHECK (length(nama) BETWEEN 1 AND 80),        -- nama tempat atau unit, bukan nama orang
  lat REAL NOT NULL CHECK (lat BETWEEN -11.5 AND 6.5), lon REAL NOT NULL CHECK (lon BETWEEN 94.5 AND 141.5),
  kapasitas INTEGER CHECK (kapasitas IS NULL OR kapasitas BETWEEN 0 AND 1000000),   -- orang, liter, atau unit menurut jenis
  status TEXT NOT NULL DEFAULT 'siap' CHECK (status IN ('siap','dipakai','rusak','tidak_tersedia')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 200),
  oleh TEXT NOT NULL, dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL, dihapus INTEGER);   -- dihapus: ms UTC, NULL = aktif (hapus lunak)
CREATE INDEX IF NOT EXISTS pb_titik_wilayah ON pb_titik (prov, kab, bencana);
CREATE INDEX IF NOT EXISTS pb_titik_bencana ON pb_titik (bencana, golongan, jenis);

-- Renlap generik berversi (F-3). Berkas isi di R2 (§4); baris ini = metadata dan status.
CREATE TABLE IF NOT EXISTS pb_renlap (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  bencana TEXT NOT NULL CHECK (bencana IN ('karhutla','banjir','longsor','pesisir','cuaca','udara','kekeringan','gempa','gunungapi')),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  kab TEXT NOT NULL DEFAULT '' CHECK (kab = '' OR length(kab) = 4),
  tanggal TEXT NOT NULL CHECK (tanggal GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]-[0-3][0-9]'),
  versi INTEGER NOT NULL CHECK (versi BETWEEN 1 AND 99),
  status TEXT NOT NULL CHECK (status IN ('diminta','draf','terbit','selesai','gagal','dibatalkan')),
  berlaku_sampai INTEGER,                                          -- ms UTC; terbit + 14 hari mengikuti RENLAP_BERLAKU_MS (src/sippa.js:1904) [BAWAAN SEMENTARA, Q26]
  jml_target INTEGER CHECK (jml_target IS NULL OR jml_target BETWEEN 0 AND 500),
  ukuran INTEGER, sha TEXT CHECK (sha IS NULL OR length(sha) = 64),
  galat TEXT CHECK (galat IS NULL OR length(galat) <= 200),
  oleh TEXT NOT NULL, dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL,
  UNIQUE (bencana, prov, kab, tanggal, versi));
CREATE INDEX IF NOT EXISTS pb_renlap_tanggal ON pb_renlap (tanggal, bencana);
CREATE INDEX IF NOT EXISTS pb_renlap_wilayah ON pb_renlap (prov, tanggal);

-- Hasil tindakan dan kepatuhan (F-5). Satu baris per target renlap.
CREATE TABLE IF NOT EXISTS pb_renlap_hasil (
  renlap_id TEXT NOT NULL REFERENCES pb_renlap (id) ON DELETE CASCADE,
  target_no INTEGER NOT NULL CHECK (target_no BETWEEN 1 AND 500),
  didatangi INTEGER CHECK (didatangi IS NULL OR didatangi IN (0,1)),
  alasan TEXT CHECK (alasan IS NULL OR alasan IN ('akses_terputus','cuaca','sarana_kurang','warga_menolak','sudah_aman','lokasi_salah','lainnya')),
  hasil TEXT CHECK (hasil IS NULL OR hasil IN ('selesai','sebagian','belum','eskalasi')),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 200),
  oleh TEXT NOT NULL, waktu INTEGER NOT NULL,
  PRIMARY KEY (renlap_id, target_no));

-- Jejak audit untuk semua tulis pb_* (siapa, apa, sebelum, sesudah); juga dasar batas laju.
CREATE TABLE IF NOT EXISTS pb_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, waktu INTEGER NOT NULL, oleh TEXT NOT NULL,
  tabel TEXT NOT NULL CHECK (tabel IN ('pb_titik','pb_renlap','pb_renlap_hasil','pb_dokumen','pb_tindakan')),
  kunci TEXT NOT NULL CHECK (length(kunci) BETWEEN 1 AND 80),
  aksi TEXT NOT NULL CHECK (aksi IN ('isi','ubah','hapus','terbit','selesai','minta','gagal')),
  sebelum TEXT CHECK (sebelum IS NULL OR (json_valid(sebelum) AND length(sebelum) <= 8192)),
  sesudah TEXT CHECK (sesudah IS NULL OR (json_valid(sesudah) AND length(sesudah) <= 8192)),
  alasan TEXT CHECK (alasan IS NULL OR length(alasan) <= 300));
CREATE INDEX IF NOT EXISTS pb_log_kunci ON pb_log (tabel, kunci, waktu);
CREATE INDEX IF NOT EXISTS pb_log_oleh ON pb_log (oleh, waktu);
```

Catatan skema:

| Hal | Keputusan |
| --- | --- |
| `tugasBencanaPer(env, ids)` di `src/hak.js` | dua kueri dalam satu `batch`: `SELECT tugas_id, bencana FROM tugas_bencana WHERE tugas_id IN (SELECT value FROM json_each(?))` dan padanannya untuk `tugas_bencana_x`; keduanya SEARCH lewat PK. Bila tabel kedua belum ada, jalankan hanya yang pertama. Menggantikan isi `bencanaPer` (`src/instansi.js:335`). |
| Penyimpanan jabatan atau nama | tidak ada kolom nama orang di satu pun tabel `pb_*`. `oleh` berisi `staf:<id>`, `admin:<hash12>`, atau `inst:<id>`. |
| Unik versi | `UNIQUE (bencana, prov, kab, tanggal, versi)`; versi baru = `max(versi)+1` dihitung di dalam satu `INSERT ... SELECT` agar dua permintaan bersamaan tidak lolos (uji dua permintaan bersamaan di `tests/warga/pb_renlap.test.mjs`). |
| Hapus | `pb_titik` hapus lunak; `pb_renlap` tidak dihapus, hanya `dibatalkan`; versi `terbit` tidak pernah ditimpa isinya (R2 tulis sekali, §4). |
| `pb_renlap_hasil` `ON DELETE CASCADE` | aman karena `pb_renlap` tidak pernah di-DELETE oleh kode; cascade hanya untuk uji dan pembersihan manual pemilik. |

### 3.3 Migrasi 0131: dokumen, tindakan, indeks papan SK (F-8 sampai F-13, F-15, F-20)

```sql
-- Dokumen terbit berversi beku (sitrep, renops, laporan per KIB, renkon pemetaan). Berkas di R2 (§4).
CREATE TABLE IF NOT EXISTS pb_dokumen (
  id TEXT PRIMARY KEY CHECK (length(id) = 16),
  jenis TEXT NOT NULL CHECK (jenis IN ('sitrep','renops','laporan_kib','renkon_peta')),
  bencana TEXT NOT NULL CHECK (bencana IN ('karhutla','banjir','longsor','pesisir','cuaca','udara','kekeringan','gempa','gunungapi')),
  prov TEXT NOT NULL CHECK (length(prov) = 2),
  kab TEXT NOT NULL DEFAULT '' CHECK (kab = '' OR length(kab) = 4),
  kib TEXT CHECK (kib IS NULL OR (length(kib) = 16 AND kib NOT GLOB '*[^0-9]*')),   -- KIB 16 digit (migrasi 0094), wajib untuk laporan_kib
  periode TEXT NOT NULL CHECK (length(periode) BETWEEN 4 AND 20),                    -- '2026-11-15' (harian), '2026-W46', '2026-11', '2026'
  versi INTEGER NOT NULL CHECK (versi BETWEEN 1 AND 99),
  status TEXT NOT NULL CHECK (status IN ('draf','beku','dibatalkan')),
  ukuran INTEGER, sha TEXT CHECK (sha IS NULL OR length(sha) = 64),
  oleh TEXT NOT NULL, dibuat INTEGER NOT NULL, dibekukan INTEGER,
  UNIQUE (jenis, bencana, prov, kab, periode, versi));
CREATE INDEX IF NOT EXISTS pb_dokumen_periode ON pb_dokumen (periode, jenis, bencana);
CREATE INDEX IF NOT EXISTS pb_dokumen_kib ON pb_dokumen (kib, jenis);

-- Pelaksanaan butir tangga tindakan (F-15): butir daftar tindakan dari public/ews_tindakan.js, keadaan per peringatan.
CREATE TABLE IF NOT EXISTS pb_tindakan (
  peringatan TEXT NOT NULL CHECK (length(peringatan) BETWEEN 1 AND 120),    -- kunci peringatan terpadu (src/peringatan.js `kunci`)
  butir INTEGER NOT NULL CHECK (butir BETWEEN 0 AND 30),
  pelaksana TEXT CHECK (pelaksana IS NULL OR pelaksana IN ('warga','pusdalops','bpbd','regu')),
  batas INTEGER,                                                              -- ms UTC
  selesai INTEGER NOT NULL DEFAULT 0 CHECK (selesai IN (0,1)),
  oleh TEXT, waktu INTEGER NOT NULL,
  PRIMARY KEY (peringatan, butir));
CREATE INDEX IF NOT EXISTS pb_tindakan_waktu ON pb_tindakan (waktu);

-- Papan status darurat (F-20) membaca logbook_sk (0094) menurut masa berlaku; indeks khusus agar SEARCH, bukan SCAN.
CREATE INDEX IF NOT EXISTS logbook_sk_selesai ON logbook_sk (tmt_selesai, tmt_mulai);
```

`logbook_sk` sudah ada (0094) tanpa kolom bencana; bencana diambil lewat `logbook_kejadian.jenis` dengan PK `kejadian_id` (SEARCH). Indeks `logbook_sk_selesai` hanya `CREATE INDEX IF NOT EXISTS` (aman di tabel yang sudah ada).

Tidak ada tabel baru untuk F-8 sampai F-10 selain `pb_dokumen`: isi dokumen dirakit dari data yang sudah ada, tidak disalin ke D1. Tidak ada tabel untuk F-18 sampai F-19, F-21 sampai F-28 (berkas statis dari pipeline, §6), dan tidak ada tabel untuk F-14 (aturan EWS dihitung tiap menit dari berkas data seperti sekarang, keadaan sudah di tabel peringatan yang ada).

### 3.4 Rancangan D13: tabel samping `peringatan_x` untuk jenis peringatan baru (F-14 skema)

`peringatan.jenis` dan `peringatan.sumber` dibatasi CHECK di `migrations/0010_peringatan.sql`. Tabel `peringatan` lama TIDAK disentuh: tanpa `ALTER`, tanpa `DROP`, tanpa membangun ulang tabel. Jalur jenis baru memakai tabel samping, pola yang sama dengan `tugas_bencana_x` (§3.2).

Migrasi: nomor berikutnya yang kosong sesudah 0131 (dicek dengan `ls migrations` saat PB-21; Q36), hanya `CREATE TABLE IF NOT EXISTS` dan `CREATE INDEX IF NOT EXISTS`, sehingga aman dijalankan dua kali:

```sql
CREATE TABLE IF NOT EXISTS peringatan_x (
  kunci TEXT PRIMARY KEY CHECK (length(kunci) BETWEEN 3 AND 200),
  jenis TEXT NOT NULL CHECK (jenis IN ('gunungapi','udara','kekeringan','pesisir','longsor','rob')),
  tingkat TEXT NOT NULL CHECK (tingkat IN ('Waspada','Siaga','Awas')),
  prov TEXT CHECK (prov IS NULL OR length(prov) <= 2),
  kab TEXT CHECK (kab IS NULL OR length(kab) <= 80),
  lat REAL CHECK (lat IS NULL OR lat BETWEEN -11.5 AND 6.5),
  lon REAL CHECK (lon IS NULL OR lon BETWEEN 94 AND 142),
  judul TEXT NOT NULL CHECK (length(judul) BETWEEN 1 AND 200),
  teks TEXT NOT NULL DEFAULT '' CHECK (length(teks) <= 600),
  sumber TEXT NOT NULL CHECK (sumber IN ('BMKG','InaTEWS','PVMBG','KLHK','Badan Geologi','Deteksi Centurisk97')),
  sumber_url TEXT CHECK (sumber_url IS NULL OR sumber_url LIKE 'https://%'),
  dibuat INTEGER NOT NULL, berlaku_hingga INTEGER NOT NULL, dicabut INTEGER, dicabut_oleh TEXT);
CREATE INDEX IF NOT EXISTS peringatan_x_aktif ON peringatan_x (berlaku_hingga, dibuat DESC);
```

Skema kolom sama dengan `peringatan` supaya baris dapat digabung tanpa pemetaan. Beda hanya CHECK: `jenis` enam nilai baru (jenis lima lama tetap di `peringatan`), `sumber` ditambah PVMBG, KLHK, Badan Geologi, dan label hitungan sendiri langsung memakai nama "Deteksi Centurisk97" (tanpa label lama "Pantau Bencana"). Peringatan bersumber model hipotesis tidak ditulis ke tabel mana pun (Q17): ia hanya tampil di layar dari berkas data.

| Hal | Rancangan |
| --- | --- |
| Penulis | jalur jenis baru di `src/peringatan.js` (`MASUK` untuk `peringatan_x`: `INSERT OR IGNORE`, kunci dedupe ALGORITMA 1.3) lewat fungsi baru di `src/hak.js`; jenis lama tetap menulis ke `peringatan` lewat jalur yang ada, tidak dipindah. Pembersihan `berlaku_hingga <= kini - 7 hari` ikut di langkah pembersihan yang sudah ada (menit 17), tanpa jadwal baru. |
| Pembaca | `/api/peringatan/aktif` dan hitungan per tingkat membaca `peringatan` UNION ALL `peringatan_x`: tiap cabang `WHERE berlaku_hingga > ? AND dicabut IS NULL AND dibuat >= ?` dengan `LIMIT BATAS_AKTIF` di dalam cabang, lalu urut `dibuat DESC` dan `LIMIT BATAS_AKTIF` di luar; hitungan `GROUP BY tingkat` per cabang lalu dijumlah di Worker. Tanpa JOIN antar cabang. |
| Akses | semua kueri baru lewat `src/hak.js` (gerbang `gerbang-d1`); pembacaan `peringatan` yang sudah ada di `src/peringatan.js` tidak dipindah di tiket ini. |
| Rencana kueri | tiap cabang diuji `EXPLAIN QUERY PLAN` menuntut `SEARCH ... USING INDEX peringatan_aktif` dan `... peringatan_x_aktif`; `gerbang-d1-pindai` merah bila ada `SCAN`. |
| Tahan tabel belum ada | `no such table: peringatan_x` ditangkap: cabang baru dilewati dan penulisan jenis baru dilewati dengan catatan; jenis lama tetap kirim. Urutan tayang dan migrasi tidak saling menunggu (pola `tanpaTabelPb`). |
| Dampak kuota baca | tiap cache miss `/api/peringatan/aktif` (cache tepi 30 detik) membaca paling banyak `BATAS_AKTIF` (50) baris tambahan dari `peringatan_x`, dan baris aktif tabel itu kecil karena dibersihkan 7 hari; tanpa kueri terjadwal baru. Diukur dengan `wrangler d1 insights` di PB-32, tidak diklaim terukur sebelum itu (§9). |
| Pemilik dan tinjau | `warga-api`; `migrasi-idempoten` wajib, `guard-api` untuk jalur tulis; pemilik menerapkan ke produksi, hash masuk `tests/warga/migrasi_beku.json` sesudahnya. |

Uji (RENCANA-UJI PB-21): migrasi dijalankan dua kali tanpa galat; CHECK menolak jenis lima lama dan nilai di luar enam; `peringatan` lama utuh dan jenis lama tetap mengirim; UNION ALL mengembalikan baris dari kedua tabel dengan urutan benar; `EXPLAIN` SEARCH per cabang; jalur tanpa tabel `peringatan_x` tetap melayani jenis lama.

## 4. R2 (bucket `MEDIA`, `poskokarhutla-foto`)

| Kunci | Isi | Penulis | Pembaca |
| --- | --- | --- | --- |
| `operasi/renlap/<bencana>/<YYYY-MM-DD>/<prov>[-<kab>]/v<versi>/renlap.{json,pdf,kml,gpx,txt}` | berkas renlap generik | workflow `renlap-pb.yml` lewat API Cloudflare R2 | Worker: rute baca berhak (§5) |
| `dokumen/<jenis>/<bencana>/<periode>/<prov>[-<kab>]/v<versi>.{json,pdf}` | dokumen beku (sitrep, renops, laporan KIB) | Worker (JSON dari hitungan) dan workflow (PDF) | Worker: rute baca berhak |

Aturan: kunci disusun server dari nilai tervalidasi (bukan dari nama berkas kiriman); `put` memakai `onlyIf: { etagDoesNotMatch: "*" }` sehingga versi terbit tidak pernah ditimpa; metadata `{sha, ukuran, dibuat, oleh_kelas}`; ukuran: JSON ≤ 2 MB, PDF ≤ 15 MB (mengikuti batas renlap udara, `data/kajian-bnpb/operasi-udara/DESAIN-TEKNIS.md` §2), ditolak 413 di atasnya. Prefiks `operasi/renlap/<tanggal>/...` milik Operasi Udara (karhutla dengan base) TIDAK disentuh: awalan bencana (huruf) dan awalan tanggal (angka) tidak bertabrakan. Karhutla tetap memakai jalur lama untuk renlap base; renlap karhutla per wilayah memakai jalur baru hanya bila pemilik memintanya.

## 5. Rute Worker (`src/pb_*.js`)

### 5.1 Berkas dan pemilik

| Berkas | Isi | Pengerja |
| --- | --- | --- |
| `src/pb_isian.js` (baru) | rute `/api/pb/titik*`, `/api/pb/renlap*`, `/api/pb/hasil*`; validasi; tulis + `pb_log`; diekspor `RUTE_PB` | `warga-api` |
| `src/pb_dokumen.js` (baru) | rute `/api/pb/dokumen*`: rakit JSON dari data, bekukan, baca | `warga-api` |
| `src/pb_ringkas.js` (baru) | rute `/api/pb/ringkas` (dashboard, F-18, F-19), `/api/pb/papan-sk` (F-20) | `warga-api` |
| `src/hak.js` (ubah) | fungsi akses D1 baru: `pbTitik*`, `pbRenlap*`, `pbHasil*`, `pbDokumen*`, `pbTindakan*`, `pbLog*`, `tugasBencanaPer`, `papanSk` | `warga-api` |
| `src/worker.js` (ubah) | impor dan sebar `...RUTE_PB`, `...RUTE_PB_DOKUMEN`, `...RUTE_PB_RINGKAS` ke `RUTE` (pola baris 645 `...RUTE_OPS`) | `warga-api` |
| `src/tugas_bencana.js`, `src/operasi_lapangan.js`, `src/penugasan.js`, `src/instansi.js` (ubah) | §2.1 H1 sampai H3 | `warga-api` |
| `src/ews.js`, `src/peringatan.js` (ubah) | aturan EWS dan CAP baru (§7) | `warga-api` |
| `tests/warga/cakupan.json` (ubah) | tiap rute dan tabel baru masuk `diuji` | `warga-api` |

Akses D1: HANYA lewat `src/hak.js` (gerbang `tests/agen/gerbang-d1.test.mjs` merah bila berkas `src/pb_*.js` memuat `env.DB`, `.prepare(`, `DB.batch`). Setiap fungsi baru di `hak.js` ikut `MATRIKS` pola tabel, aksi, peran bila hak.js memakainya untuk tabel itu; tabel `pb_*` ditambahkan ke `MATRIKS`/`sedia` dengan peran `sistem`, `admin`, `diri` seperti `op_*` (pola `opP` di `src/hak.js:415`).

### 5.2 Tabel rute

Semua tulis: `POST`, badan `application/json` ≤ 32 KB, hak tulis `penulis()` §2.4 (kecuali yang bertanda Mesin), validasi di Worker. Semua baca: hak baca = `PERAN_BACA` Operasi Udara ditambah akun instansi untuk wilayahnya (matriks di KEAMANAN-PRIVASI.md bagian 2). Rentang baca ≤ 31 hari, `LIMIT` eksplisit pada tiap kueri. `bencana` wajib anggota registri dengan `kemampuan.operasi = true`, selain itu 404.

| Rute | Masukan | Keluaran / efek | Fitur |
| --- | --- | --- | --- |
| `GET /api/pb/titik` | `bencana`, `prov`, `kab?`, `golongan?`, `jenis?` | ≤ 500 baris `pb_titik` aktif | F-2, F-7 |
| `POST /api/pb/titik` | `id?` (ubah), `golongan`, `jenis`, `bencana`, `prov`, `kab?`, `nama`, `lat`, `lon`, `kapasitas?`, `status?`, `catatan?` | upsert + `pb_log` | F-2, F-4, F-7 |
| `POST /api/pb/titik/hapus` | `id`, `alasan` (5-300) | `dihapus` diisi + `pb_log` | F-4 |
| `POST /api/pb/renlap` | `bencana`, `prov`, `kab?`, `tanggal` (hari ini atau 7 hari ke belakang) | baris `diminta` versi berikut + pemicu workflow (§8.1); jawab `{id, versi, status}` | F-3 |
| `POST /api/pb/renlap/selesai` | **Mesin**: header `x-renlap-waktu`, `x-renlap-kunci` = HMAC-SHA256(`RENLAP_KUNCI`, `id|waktu|status`), selisih ≤ 300 detik (pola `src/sippa.js:1874-1883`); badan `{id, status: "draf"\|"gagal", ukuran?, sha?, jml_target?, galat?}` | status naik `diminta` ke `draf` atau `gagal` | F-3 |
| `POST /api/pb/renlap/terbit` | `id` | `draf` ke `terbit`, `berlaku_sampai` diisi | F-3 |
| `POST /api/pb/renlap/selesai-tandai` | `id` | `terbit` ke `selesai` | F-3 |
| `GET /api/pb/renlap` | `bencana`, `prov?`, `dari`, `sampai` | daftar metadata (tanpa isi) | F-3 |
| `GET /api/pb/renlap/berkas` | `id`, `fmt` (`json`,`pdf`,`kml`,`gpx`,`txt`) | berkas dari R2: `content-disposition: attachment`, `cache-control: private, no-store`, `x-content-type-options: nosniff`, `content-security-policy: sandbox` | F-3 |
| `POST /api/pb/hasil` | `renlap_id`, `butir: [{target_no, didatangi, alasan?, hasil?, catatan?}]` (≤ 100) | upsert `pb_renlap_hasil` + `pb_log` | F-5 |
| `GET /api/pb/kepatuhan` | `bencana`, `dari`, `sampai` | `{renlap, target, didatangi, persen, per_alasan}` dihitung dari `pb_renlap_hasil` | F-5 |
| `POST /api/pb/dokumen/rakit` | `jenis`, `bencana`, `prov`, `kab?`, `periode`, `kib?` | menyusun JSON dari data sistem (§6.2), menyimpan `draf` | F-8, F-9, F-10 |
| `POST /api/pb/dokumen/bekukan` | `id`, `kalimat?: {ringkasan, kebijakan}` (teks staf ≤ 1500 per bagian) | `draf` ke `beku`; R2 tulis sekali | F-8, F-9, F-10 |
| `GET /api/pb/dokumen` | `jenis`, `bencana?`, `periode?` | daftar metadata | F-8, F-9, F-10, F-13 |
| `GET /api/pb/dokumen/berkas` | `id`, `fmt` (`json`,`pdf`) | berkas beku | F-8, F-9, F-10 |
| `GET /api/pb/tindakan` | `peringatan` | keadaan butir tangga tindakan | F-15 |
| `POST /api/pb/tindakan` | `peringatan`, `butir`, `selesai`, `pelaksana?`, `batas?` | upsert `pb_tindakan` | F-15 |
| `GET /api/pb/ringkas` | `bencana?` (kosong = semua) | muatan dashboard (§6.3) | F-18, F-19 |
| `GET /api/pb/papan-sk` | `bencana?`, `prov?` | status darurat berlaku dan akan berakhir (§6.4) | F-20 |

Jalur tidak memuat garis bawah (gerbang cakupan). `GET /api/pb/ringkas` dan `GET /api/pb/papan-sk` memakai cache isolate 5 menit (§9), bukan `cacheTepi` publik, karena memuat data internal dan hak per pengguna.

Batas laju: tulis 60 per 10 menit per pengisi, dihitung dari `pb_log` (`SELECT count(*) FROM pb_log WHERE oleh = ? AND waktu > ?`, indeks `pb_log_oleh`), pola `opLajuIsian` (`src/hak.js:416`). `POST /api/pb/renlap` tambahan: ≤ 6 permintaan per jam per pengisi (pemicu workflow punya biaya menit CI). Rute Mesin memakai pemeriksaan HMAC dan dikecualikan dari batas laju pengisi tetapi bukan dari cek waktu.

### 5.3 Pola penjaga yang dipakai ulang

`bungkus` (503 saat tabel belum ada), `Galat` + `tolak`, `tanggalSah` (hari ini sampai 7 hari ke belakang), `dalamBbox`, `teks()` yang memangkas dan membuang karakter kontrol, `bacaBody(req, batas)`, `modOK`, `stafPeran`. Diimpor dari `src/operasi_udara.js`, `src/operasi_isian.js`, `src/posko.js`, `src/staf.js`; fungsi yang sekarang tidak diekspor (`tanggalSah`, `teks`) diekspor oleh tiket W1 pertama tanpa mengubah perilakunya, bukan disalin.

## 6. Data dan pipeline

### 6.1 Perakit angka per bencana (satu kontrak)

Tiap bencana menyediakan satu berkas ringkas terstandar `public/data/ringkas/<id>.json` (data dari sumber publik dan hitungan sistem, tanpa data operasi internal):

```json
{"versi":1,"bencana":"banjir","dibuat":"2026-11-15T03:00:00+00:00","sumber":[{"id":"bmkg_nowcast","umur_menit":42}],
 "tingkat":{"nasional":1,"wilayah":[{"prov":"32","kab":"3273","tingkat":2,"dasar":"status_kab"}]},
 "angka":{"terdampak_jiwa":null,"kejadian_30h":12,"peringatan_aktif":3},
 "prospektif":{"n":42,"hit":0.61,"far":0.38,"hipotesis":false},
 "basi":false}
```

Aturan: nilai tidak diketahui ditulis `null` (bukan 0 dan bukan teks "aman"); `angka` antarsumber tidak dijumlah; karhutla hanya dari sistem; `basi = true` bila `dibuat` lebih tua dari ambang bencananya (F-30). Ukuran ≤ 100 KB per berkas (§9). Penulis: `scripts/umum/pb_ringkas.py` (stdlib; membaca keluaran yang sudah ada seperti `public/data/meta.json`, `public/banjir/data/*.json`, dan seterusnya; tidak ada panen jaringan baru), subperintah `buat` dan `uji` (self-check wajib, pola `scripts/umum/uji`). Pemilik `pipa-umum`. Langkah dipasang di workflow yang menulis data tiap bencana (bukan workflow baru) dan sekali per hari di `lintas.yml`.

### 6.2 Perakit dokumen (F-8 sampai F-13)

| Hal | Rancangan |
| --- | --- |
| Pemakai ulang | `scripts/umum/laporan_kejadian.py` (`MODUL` per bencana, `ukur`, `satu`, kronologi per KIB; `:33-68,168,230`) menjadi sumber angka sitrep dan laporan KIB; modul longsor, pesisir, gunung api, gempa lengkap ditambah di tabel `MODUL` (F-10). Tidak ada perakit kedua. |
| Tempat hitung | Worker membakukan bentuk dan membekukan; angka dibaca dari berkas statis `public/data/ringkas/<id>.json` dan `public/data/laporan_kejadian/*.json` (keluaran `laporan_kejadian.py`), ditambah hitungan D1 operasi (`pb_renlap`, `pb_renlap_hasil`) via `hak.js`. Tidak ada Python di Worker. |
| Kerangka | sitrep dan renops berupa JSON bagian demi bagian (`bagian[].judul`, `.angka[]`, `.sumber`, `.kalimat_staf`); `kalimat_staf` hanya diisi staf (angka dihitung mesin, kalimat kebijakan ditulis staf, sama dengan keputusan laporan berkala). Kerangka renops mengikuti Perka BNPB 24/2010; butir lampiran bertanda [perlu cek] tidak diisi otomatis, tampil sebagai "belum diisi" (Q9). |
| PDF | dirender di GitHub Actions oleh `data/laporan-bnpb/generator` lewat mesin deck (skill `ppt-konsultan`, `aturan_slide.py`) untuk deck; PDF dokumen A4 oleh `scripts/umum/pb_dokumen_pdf.py` (stdlib + yang sudah terpasang di runner), diunggah dengan mekanisme yang sama dengan renlap (§8.1). PDF opsional: dokumen sah tanpa PDF (cetak dari peramban, CSS `@media print`). |
| Deck harian dan Penanganan (F-11) | `data/laporan-bnpb/generator/harian.py`, `penanganan_banjir.py`, `situasi_banjir.py` ditiru ke bencana lain dengan memanggil mesin deck, keluaran ke folder revisi (`Revisi 3/<nama deck>.pptx` dan `.pdf` lewat `lewat_deck.serah_revisi`, AGENTS.md 3.6); pemicu bot `scripts/wa/otomatis.mjs:42` ditambah entri per bencana. Pemilik `wa-bot` untuk pemicu, `pipa-data` untuk generator. |
| Renkon (F-12) | `pb_dokumen.jenis = 'renkon_peta'` hanya menyimpan penunjuk ke dokumen `/siklus` (`public/siklus/renkon.js`); isi renkon tetap di program Siklus (D10), tidak ada buku kejadian baru. Pemetaan kejadian per bencana ke Buku Besar Kejadian: `scripts/siklus/arsip_kejadian.py` ditambah awalan B, C, D, E, P, U, V dari `bencana.json kejadian.awalan`. Pemilik `siklus`. |
| Penyedia angka laporan berkala (F-13) | `pb_ringkas.py` menulis blok `laporan_berkala` di tiap `ringkas/<id>.json`: daftar angka bernama stabil yang diminta perakit di paket `data/kajian-bnpb/laporan-berkala/` (`DESAIN-TEKNIS.md` paket itu menentukan nama kunci; bila belum ada, tiket F-13 menunggu dan mencatatnya, bukan mengarang nama). Perakit sendiri bukan bagian paket ini (D9). |

Versi beku tidak pernah ditimpa: dokumen yang salah diperbaiki dengan versi baru (`versi + 1`), versi lama tetap `beku`. Tidak ada versi publik; dokumen hanya lewat rute berhak.

### 6.3 Dashboard pimpinan (F-18, F-19)

| Hal | Rancangan |
| --- | --- |
| Layar | `public/bnpb/pimpinan.html` + `public/bnpb/pimpinan.js` (pemilik `ruang-bnpb`), dengan `public/inti/dasbor_pimpinan.js` (pemilik `inti-layar`) untuk komponen lintas bencana. Model A utuh: memuat `/inti/dasbor.css`, `/inti/dasbor.js`, kepala L1 gelap, panel seksi kiri `db-nav-isi`, kepala bagian terang, tabel berkepala navy; kartu `.ex.ex-std`, kepala = nama seksi, tanpa kalimat kesimpulan, tanpa kaki. |
| Gerbang | di commit yang sama: `public/bnpb/pimpinan.html` masuk `LAYAR` dan `MODEL_A` (penanda `db-nav-isi`, `db-l1`) di `tests/agen/gerbang-dasbor.test.mjs` (pemilik `penulis-gerbang`; menambah entri, tidak melemahkan), dan masuk `tests/agen/gerbang-tanpa-kesimpulan.test.mjs` bila daftar layarnya terpisah. |
| Saringan jenis | satu layar, saringan jenis bencana (Q2 bawaan): deretan pilihan segmen penuh lebar (memori "Deretan pilihan ujung ke ujung"), pilihan banyak; klik tidak membekukan layar: kepala kontrol urgent, isi berat deferred (INP.md). |
| Data | (a) `public/data/ringkas/<id>.json` untuk delapan bencana plus karhutla (satu `fetch` paralel, tiap ≤ 100 KB), (b) `GET /api/pb/ringkas` untuk angka operasi internal (jumlah renlap terbit, persen kepatuhan, tugas buka per jenis) bagi peran berhak. Pemirsa tanpa hak baca operasi melihat (a) saja. |
| Muatan `GET /api/pb/ringkas` | `{kini, bencana: [{id, tugas_buka, renlap_terbit, kepatuhan_persen, dokumen_beku_7h, sk_berlaku, sk_berakhir_7h}]}`; tiga kueri terindeks (§9); `null` bila tabel belum ada. |
| Tren | grafik interaktif dengan tooltip (memori "Selera teks dan grafik"); paragraf rata kiri-kanan. |

### 6.4 Papan status darurat (F-20, Q5)

`GET /api/pb/papan-sk`: dua kueri `SEARCH` lewat `logbook_sk_selesai` digabung `UNION ALL` (satu untuk `tmt_selesai >= :hari_ini`, satu untuk `tmt_selesai IS NULL`), keduanya dengan `tmt_mulai <= :hari_ini`, `ORDER BY tmt_selesai LIMIT 500`, di-JOIN ke `logbook_kejadian` via PK. Keluaran per wilayah: `{bencana, wilayah, tingkat, nomor, tgl_sk, tmt_mulai, tmt_selesai, perpanjangan_ke, sisa_hari, sinyal}`; `sinyal = "akan_berakhir"` bila `sisa_hari <= 7` [BAWAAN SEMENTARA, Q27], `"tanpa_tanggal_selesai"` bila `tmt_selesai` NULL. SK provinsi didahulukan atas kabupaten (aturan `src/logbook.js:372-403`). Penulisan SK tetap lewat `src/logbook.js` yang ada; papan hanya membaca. Pengenal otomatis `scripts/umum/status_darurat.py` ditambah jenis gunung api, udara, kekeringan agar saran status muncul; hasilnya SARAN, bukan SK. JDIH tidak ditarik (Q5).

### 6.5 Keputusan ekonomi, pencegahan, prioritas (F-21 sampai F-23)

| Fitur | Keluaran statis | Penulis | Rumus dan syarat |
| --- | --- | --- | --- |
| F-21 | `public/data/ekonomi/<id>.json` | `scripts/umum/ekonomi.py` (`pipa-umum`) | nilai paparan = jumlah bangunan terpapar (`scripts/umum/paparan_bangunan.py`) x harga satuan bersumber (IHPB atau IKK BPS), kebutuhan logistik = jiwa x ransum x harga pangan (`scripts/umum/harga_pangan.py`, `scripts/bnpb/kebutuhan.py`); tiap rupiah membawa `koefisien: {sumber, tahun}`; tanpa koefisien bersumber, nilai rupiah `null` dan kartu menulis "koefisien tidak tersedia" (Q6) |
| F-22 | `public/data/pencegahan/<id>.json` | `scripts/umum/pencegahan.py` (baru, `pipa-umum`) | daftar tindakan dari `PRAKTIK-PENANGANAN.md`, hanya butir [repo] dan [korpus]; per butir `dasar` (peraturan atau berkas); status per wilayah dari data yang ada, bukan karangan |
| F-23 | `public/data/prioritas/<id>.json` | `scripts/umum/prioritas.py` (`pipa-umum`) | skor = 0,4 bahaya + 0,3 paparan + 0,2 kerentanan + 0,1 tren peringatan, tiap komponen berupa persentil peringkat (ALGORITMA bagian 4, Q21): bahaya dari keluaran modul, paparan penduduk (`pop_grid`), kerentanan (`profil_wilayah.py`), tren peringatan dari hari berstatus Waspada ke atas 30 hari; bobot di satu berkas, ditandai HIPOTESIS di berkas dan di layar; contoh pola: `scripts/gunungapi/risiko.py` (A14) |

Syarat umum: tiap berkas lolos `uji` Python; layar menampilkan pil "hipotesis" bila `hipotesis = true`; angka tidak dijumlah antarsumber.

### 6.6 Bukti model (F-24 sampai F-28)

| Fitur | Rancangan |
| --- | --- |
| F-24 | pengerja `longsor` (AUC lawan klimatologi) dan `cuaca-udara`/`validasi-model` (hujan 50 mm ke atas): perbaikan di `scripts/longsor/**`; angka yang tampil memuat `{auc, klimatologi, lolos}` dari keluaran uji balik; bila `lolos = false` pil "hipotesis" dan kartu keputusan (ekonomi, prioritas) tidak memakai skornya. Tidak ada model baru tanpa uji balik (D6). |
| F-25 | tambah kode `GNA` (gunung api) dan `KEK` (kekeringan) ke `scripts/prediksi/catat.py:16-20` dan `nilai.py:7-8` bila ada prakiraan +1..+3 hari bersumber; bila tidak ada, kartu menulis "belum ada prakiraan harian" (bukan angka kosong). Pemilik `prediksi`. |
| F-26 | `public/siklus/kejadian.js` dan `scripts/siklus/arsip_kejadian.py` menyajikan kasus historis per bencana dari arsip kejadian; pemilik `siklus`. |
| F-27 | `public/inti/tren.css` dan komponen tren di `public/inti`; data dari `scripts/umum/iklim_outlook.py`, `outlook12.py`, `rapor_belajar.py`. |
| F-28 | halaman metode dan cerita memakai `public/inti/cerita.js`; pemilik per bencana. |

## 7. Peringatan dini dan tangga tindakan (F-14 sampai F-17)

| Hal | Rancangan |
| --- | --- |
| Aturan EWS baru | `src/ews.js` ditambah penilai: gunung api (kenaikan level PVMBG dari `public/data/gunungapi/*`, Waspada ke Siaga ke Awas), kekeringan (status dari penetapan, SPI dan hari tanpa hujan dari keluaran `scripts/kekeringan`), udara (ISPU atau PM2,5 dan asap dari `scripts/udara`), pesisir (gelombang tinggi per pelabuhan, abrasi kritis). Tiap penilai membaca berkas data yang sudah ada dan memeriksa kesegaran (`src/ews.js:360`); data basi = tidak memicu dan sumber ditandai basi. Ambang: yang sudah ada di kode; ambang baru dari naskah penerbit hanya setelah dibaca (Q9). Penilai udara memakai koreksi bias yang mati karena ISPU KLHK tak terjangkau hanya bila data masuk (Q24). |
| Daftar jenis | `src/peringatan.js:186` daftar jenis ditambah (jenis baru ditulis ke `peringatan_x`, §3.4) `gunungapi`, `kekeringan`, `udara`, `pesisir`; `CAP_KATEGORI` dan `CAP_PASTI` di `src/peringatan.js` ditambah: gunung api `Geo`, kekeringan `Env`, udara `Health`, pesisir `Met`; teks `senderName` tetap jujur: hitungan otomatis bukan peringatan BMKG, PVMBG, atau KLHK, kecuali sumber diteruskan. |
| Tangga tindakan | `public/ews_tindakan.js` `BENCANA` (baris 19) ditambah empat entri bertingkat 1 sampai 3 dengan butir hanya dari sumber bertanda [repo] atau [korpus]. Layar menampilkan daftar butir; saat tingkat naik, daftar baru menyala dan butir dicatat `pb_tindakan` (pelaksana, batas, selesai) untuk peran berhak; warga hanya melihat daftar, tidak menulis. Pemilik `layar-peta` (`public/ews_tindakan.js`) dan `warga-api` (rute). |
| Pantau Dalops | `src/dalops.js:28-33` ditambah jenis udara, gunung api, pesisir; `public/bnpb/dalops.js:21-29` saringan; `scripts/data/dalops_kabar.py:23-31` `AMBANG` ditambah gunung api; `dalops_banjir.py:36` rob pesisir. Pemilik `ruang-bnpb` (layar), `pipa-data` (skrip), `warga-api` (rute). Tanpa rute dan tabel baru (AGENTS.md 2.11). |
| Tangga skala | `scripts/prediksi/tangga.py:224` dan `kalender.py:9` ikut jenis baru bila ada keluaran bersumber (Q9); pemilik `prediksi`. |
| Uji | `tests/warga/ews.test.mjs` pola: tiap jenis baru punya uji yang menjalankan jalur dari berkas data sampai `bentukCap` (CAP 1.2 sah, waktu `+00:00`), termasuk kasus data basi dan kasus level turun (tidak memicu). |

## 8. Workflow dan mesin

### 8.1 Renlap generik lewat workflow (F-3)

Worker tidak menjalankan Python. Alur (pola SIPPA `src/sippa.js:1874`, `.github/workflows/renlap.yml`):

1. `POST /api/pb/renlap` memvalidasi, menyisipkan `pb_renlap` (`status = 'diminta'`), lalu memicu `workflow_dispatch` `renlap-pb.yml` lewat `api.github.com/repos/<repo>/actions/workflows/renlap-pb.yml/dispatches` dengan `Authorization: Bearer GITHUB_TOKEN` (secret yang sama dengan `src/jaga_jadwal.js:5`, fine-grained, Actions read and write, repo ini saja). Masukan workflow: `renlap_id`, `bencana`, `prov`, `kab`, `tanggal` (semuanya sudah tervalidasi, dan divalidasi ulang di langkah pertama workflow dengan regex tegas, bukan dipercaya).
2. `renlap-pb.yml` (pemilik `mekanik-mesin`): `scripts/umum/renlap.py buat` membaca target dari data repo (checkout) dan titik `pb_titik` (diambil lewat rute Mesin `GET /api/pb/titik?mesin=1` dengan HMAC yang sama, bukan akses D1 langsung dari CI), menulis lima berkas ke R2 lewat API Cloudflare, lalu memanggil `POST /api/pb/renlap/selesai`. Batas waktu 15 menit; `concurrency: group: renlap-pb-${{ inputs.renlap_id }}`.
3. Gagal atau tidak kembali: baris `diminta` lebih dari 30 menit dibaca layar sebagai "gagal, ulangi" (dihitung saat baca, tanpa cron), dan permintaan baru membuat versi berikutnya.

`scripts/umum/renlap.py` (baru, `pipa-umum`) memuat penilai target per bencana (`SKOR[bencana]`), bobot di `scripts/operasi/bobot_renlap.json` bagian per bencana ditandai HIPOTESIS (mesin satu; `scripts/operasi/renlap_banjir.py` ditarik ke sini lalu dihapus di tiket yang sama setelah keluaran identik diuji). Penulis KML, GPX, TXT WA, dan PDF diekstrak dari `scripts/operasi/renlap.py` dan `renlap_pdf.py` ke `scripts/umum/renlap_keluaran.py`; renlap karhutla memanggilnya juga (uji: keluaran karhutla byte-identik sebelum dan sesudah ekstraksi, di `scripts/operasi` self-check yang sudah ada). Sumber air non-karhutla dari `scripts/operasi/sumber_air.py` dan `pb_titik` jenis `sumber_air`.

### 8.2 Langkah workflow per data (F-29, F-30)

| Hal | Aturan |
| --- | --- |
| Satu data = satu skrip panen + satu langkah | skrip stdlib di `scripts/umum/<nama>.py` dengan subperintah `uji` (self-check), pola `scripts/umum/jaring.py`, `reliefweb.py`, `citra_terbuka.py`; satu langkah di workflow yang sudah ada per jadwal bencana (bukan workflow baru kecuali data berjadwal sendiri); satu baris `docs/multi-bencana/DATA-PUBLIK.md` berubah menjadi Dipakai. |
| Timeout dan konkurensi | tiap langkah `timeout-minutes` dan `continue-on-error: false` untuk data yang dipakai peringatan; langkah data tambahan tidak memblokir terbit (`continue-on-error: true` hanya untuk data pelengkap, dan `basi` ditandai di ringkas). |
| CI uji | satu workflow/`npm run` yang menjalankan semua `python3 scripts/umum/<x>.py uji` (daftar dihasilkan dari direktori, bukan ditulis tangan) agar skrip ber-`uji` tidak yatim; gerbang `tests/agen/gerbang-uji-skrip.test.mjs` (baru, `penulis-gerbang`) merah bila ada skrip `scripts/umum/*.py` punya `uji` tetapi tidak ikut. |
| Kesegaran | `scripts/umum/pb_ringkas.py` menulis `basi` per bencana; panel kesegaran memakai `sumber_status` yang sudah ada di `bencana.json`; ambang basi per sumber di `sumber_status` (baris ketiga: jam). |
| Jadwal | `abrasi.py` dan `pop_grid.py` dipasang di `statis.yml` atau `lintas.yml` bulanan dengan `workflow_dispatch` untuk jalan sendiri; bukti jalan = `public/data/<x>.json` berumur < periode di uji. K7 sudah memperbaiki jadwal gempa, udara, banjir, gunung api, pesisir; tiket F-30 hanya memverifikasi. |

## 9. Batas ukuran dan kuota D1 (memori `d1-kuota-baca`)

D1 Free: 5 juta baris dibaca per hari; 11 Nov 2026 situs sempat 500 sampai 07.00 WIB karena pindai penuh. Aturan untuk paket ini:

| Aturan | Cara |
| --- | --- |
| Tiap kueri baru SEARCH lewat indeks | gerbang `tests/agen/gerbang-d1-pindai.test.mjs` merah pada `SCAN` baru; tiap indeks di §3 dirancang untuk kueri bernama: `pb_titik_wilayah` (GET titik), `pb_renlap_tanggal` dan `pb_renlap_wilayah` (daftar renlap, ringkas), `pb_dokumen_periode`, `pb_log_oleh` (laju), `pb_log_kunci` (riwayat), `logbook_sk_selesai` (papan SK), `tugas_bencana_x` PK. Uji `EXPLAIN QUERY PLAN` untuk tiap fungsi `pb*` di `hak.js` dibuat di tiket yang sama. |
| `LIMIT` dan rentang | semua daftar `LIMIT` ≤ 500; rentang tanggal ≤ 31 hari; `pb_log` dibaca hanya dengan `oleh` atau `tabel, kunci`. |
| Tanpa cron baru | tidak ada kueri terjadwal per menit; tidak menambah jadwal Worker (batas 5 jadwal akun Free; satu cron `* * * * *` sekarang). Kedaluwarsa renlap dihitung saat baca. |
| Dashboard dari berkas statis | angka bahaya dan model dari `public/data/ringkas/*.json` (tanpa D1). Hanya angka operasi internal dari D1: tiga kueri teragregasi (`tugas buka per jenis` lewat `tugas_bencana_jenis` dan `tugas_bencana_x_jenis` + `tugas_api` status; `pb_renlap` per tanggal; `logbook_sk` papan), hasil di-cache di memori isolate 5 menit (pola `KLUSTER` Map di `src/operasi_lapangan.js:160`), kunci = daftar bencana + wilayah akses. |
| Estimasi | per muat dashboard (cache dingin): kira-kira ≤ 1.500 baris dibaca (tugas buka ≤ ~800, renlap hari ini ≤ 100, SK berlaku ≤ ~500). Dengan cache 5 menit per isolate dan kasarnya 20 isolate aktif, maksimal ≈ 288 x 20 x 1.500 ≈ 8,6 juta secara teoretis bila SEMUA isolate dipukul terus; sebenarnya pemakai Pusdalops puluhan dan isolate sedikit, tetapi angka ini di atas kuota, jadi dua penjaga tambahan wajib: (a) `GET /api/pb/ringkas` membatasi `LIMIT 500` dan hanya memuat jenis yang diminta; (b) tombol segarkan manual tidak memintas cache (cache-bust hanya oleh `POST` tulis di isolate yang sama). Nilai ini diukur di tiket dengan `wrangler d1 insights` sebelum fase F2 dinyalakan (tiket W4 dashboard); bila > 1 juta baris per hari, cache dinaikkan ke 15 menit. |
| Tulis | tulis operasi terjadi karena staf mengisi (puluhan per hari), tiap tulis ≤ 2 baris riwayat; tidak ada tulis massal terjadwal. |
| Ukuran berkas statis | `public/data/ringkas/<id>.json` ≤ 100 KB; `ekonomi`, `pencegahan`, `prioritas` ≤ 1 MB per berkas [BAWAAN SEMENTARA, Q29]; batas keras Workers aset 25 MiB per berkas dan 15.000 berkas dijaga `tests/agen/gerbang-anggaran-cf.test.mjs` (`PLAFON_UKURAN`, `PLAFON_BERKAS`); paket ini menambah ≤ 60 berkas. Berkas lebih besar dari 1 MB dipecah per provinsi atau dipindah ke R2. Data operasi (renlap, dokumen, hasil) TIDAK pernah ke `public/` (KEAMANAN-PRIVASI.md). |
| Ukuran badan | tulis JSON ≤ 32 KB; unggahan mesin ≤ 15 MB; respons daftar ≤ 500 baris. |

Catatan: estimasi di atas sengaja ditulis konservatif dan memuat cara menurunkannya; ia bukan hasil ukur. Tidak ada angka kuota yang diklaim terukur sebelum tiket W4 dashboard mengukurnya.

## 10. Berkas, pemilik, dan urutan tiket (pemeta fitur)

Pemilik dari `node scripts/agents/ilmu.mjs pemilik <berkas>` (15 Nov 2026; berkas yang belum ada dijawab menurut pola glob). Berkas lama yang diubah ditandai (ubah); yang baru ditandai (baru).

| Fitur | Berkas | Pengerja |
| --- | --- | --- |
| F-1 | `src/tugas_bencana.js`, `src/operasi_lapangan.js`, `src/instansi.js` (ubah); `src/hak.js` (ubah); `migrations/0130_paritas_operasi.sql` (baru); `scripts/umum/tugas.py` (ubah) | `warga-api`; `scripts/umum/tugas.py` `pipa-umum` |
| F-2, F-7 | `src/pb_isian.js` (baru); `public/operasi_isian.js` atau `public/inti/pb_titik.js` (baru, layar daftar sarana dan peta fasilitas); `public/operasi.js` (ubah, seksi per jenis) | `warga-api`; `public/inti/**` `inti-layar`; `public/operasi.js` `layar-peta` |
| F-3 | `scripts/umum/renlap.py`, `scripts/umum/renlap_keluaran.py` (baru); `scripts/operasi/renlap.py`, `renlap_banjir.py`, `renlap_pdf.py` (ubah, ekstraksi dan penarikan); `.github/workflows/renlap-pb.yml` (baru); `public/inti/renlap.js` (baru); `src/pb_isian.js` | `pipa-umum`; `scripts/operasi/*` `pipa-data`; workflow `mekanik-mesin`; layar `inti-layar`; rute `warga-api` |
| F-4 | `src/pb_isian.js`, `src/hak.js`, `src/staf.js` (ubah bila perlu menambah izin pemirsa) | `warga-api` |
| F-5 | `src/pb_isian.js`, `public/inti/renlap.js`, `public/operasi_laporan.js` (ubah, kartu kepatuhan) | `warga-api`, `inti-layar`, `layar-peta` |
| F-6 | `src/penugasan.js` (ubah), `scripts/umum/tugas.py` (ubah) | `warga-api`, `pipa-umum` |
| F-8 sampai F-10 | `src/pb_dokumen.js` (baru); `scripts/umum/laporan_kejadian.py` (ubah); `migrations/0131_paritas_dokumen.sql` (baru); `public/inti/dokumen.js` (baru) | `warga-api`; `pipa-umum`; `inti-layar` |
| F-11 | `data/laporan-bnpb/generator/*` (ubah dan baru); `scripts/wa/otomatis.mjs` (ubah) | `pipa-data` untuk generator; `wa-bot` untuk pemicu |
| F-12 | `scripts/siklus/arsip_kejadian.py`, `public/siklus/renkon.js` (ubah) | `siklus` |
| F-13 | `scripts/umum/pb_ringkas.py` (baru) | `pipa-umum` |
| F-14 | `src/ews.js`, `src/peringatan.js`, `src/ews_email.js` bila perlu, `src/hak.js` (ubah); migrasi `peringatan_x` (baru, D13, §3.4) | `warga-api` |
| F-15 | `public/ews_tindakan.js`, `public/inti/peringatan.js` (ubah); `src/pb_isian.js` (rute tindakan) | `layar-peta`, `inti-layar`, `warga-api` |
| F-16 | `src/dalops.js`, `public/bnpb/dalops.js`, `scripts/data/dalops_kabar.py`, `dalops_banjir.py` (ubah) | `warga-api`, `ruang-bnpb`, `pipa-data` |
| F-17 | `scripts/prediksi/tangga.py` (ubah) bila ada ambang bersumber | `prediksi` |
| F-18, F-19 | `public/bnpb/pimpinan.html`, `pimpinan.js` (baru); `public/inti/dasbor_pimpinan.js` (baru); `src/pb_ringkas.js` (baru); `scripts/umum/pb_ringkas.py` (baru); `tests/agen/gerbang-dasbor.test.mjs` (ubah, tambah entri) | `ruang-bnpb`, `inti-layar`, `warga-api`, `pipa-umum`, `penulis-gerbang` |
| F-20 | `src/pb_ringkas.js`, `src/hak.js`, `scripts/umum/status_darurat.py` (ubah), `public/inti/papan_sk.js` (baru) | `warga-api`, `pipa-umum`, `inti-layar` |
| F-21 sampai F-23 | `scripts/umum/ekonomi.py`, `prioritas.py`, `pencegahan.py` (baru, sebagian ada); `public/inti/ekonomi.js` (baru) | `pipa-umum`, `inti-layar` |
| F-24 | `scripts/longsor/**`, `scripts/cuaca/**` (uji balik) | `longsor`, `cuaca-udara`; pemeriksa `validasi-model` |
| F-25 | `scripts/prediksi/catat.py`, `nilai.py` | `prediksi` |
| F-26 sampai F-28 | `scripts/siklus/arsip_kejadian.py`, `public/siklus/kejadian.js`, `public/inti/cerita.js`, `public/inti/tren.css`, halaman metode per bencana | `siklus`, `inti-layar`, pengerja bencana |
| F-29, F-30 | `scripts/umum/<data>.py` (baru); `.github/workflows/*.yml`; `tests/agen/gerbang-uji-skrip.test.mjs` (baru) | `pipa-umum`, `mekanik-mesin`, `penulis-gerbang` |
| F-31, F-32 | `public/i18n.js`, `public/i18n/en.json`, halaman kredit | `layar-peta`, `inti-layar` |
| F-33 | berkas di RISET.md bagian 4 temuan rusak | pengerja pemilik berkas |
| Registri | `public/bencana.json` (ubah), `scripts/umum/bencana.py` (ubah), `src/bencana.generated.js` (dibangkitkan) | `inti-layar`, `pipa-umum`, `warga-api` |

Folder baru di `public/` atau `scripts/` TIDAK dibuat: semua berkas masuk folder yang sudah punya paket (`public/inti`, `public/bnpb`, `scripts/umum`, `src`). Bila pengerja menemukan butuh folder baru, gerbang `gerbang-paket-modul` menolak tanpa paket (AGENTS.md 3.7).

Urutan teknis (bukan jadwal): (1) uji golden karhutla dan skrip hitung ADA (tiket pertama); (2) `bencana.json` `kemampuan` + `bencana.py`; (3) migrasi 0130 + `hak.js` + `tugas_bencana.js` + `penugasan.js` (F-1, F-6) dengan longsor sebagai pemakai pertama F2 tetapi banjir dan karhutla sebagai pembuktian generik (D4); (4) titik dan renlap (F-2, F-3, F-4, F-5, F-7); (5) migrasi 0131 + dokumen (F-8 sampai F-13); (6) EWS (F-14, F-15); (7) dashboard dan papan SK (F-18 sampai F-20) setelah (4) dan (5) agar ada data; (8) F3.

## 11. Uji integrasi yang wajib (TEST.md)

Mock tidak dipakai sebagai bukti untuk perilaku di luar TypeScript. Tiap uji menjalankan SQL nyata (`node:sqlite` lewat `tests/warga/_bantu.mjs`) atau Worker nyata (Miniflare, pola `tests/warga/operasi_isian.test.mjs`).

| Perilaku | Uji | Berkas |
| --- | --- | --- |
| Migrasi 0130 dan 0131 idempoten (jalan dua kali), CHECK menolak nilai di luar daftar, `tugas_bencana_x` menolak `karhutla` | uji skema | `tests/warga/pb_skema.test.mjs` |
| `tugasBencanaPer` benar dengan dan tanpa tabel `tugas_bencana_x` | uji `hak.js` | `tests/warga/pb_skema.test.mjs` |
| keluaran rute (`awal` periode, kluster, riwayat) karhutla sama dengan golden, diuji lewat `RUTE_OPS` dengan Miniflare | uji golden | `tests/warga/pb_karhutla_tetap.test.mjs` |
| 403 untuk akun gerbang `AKUN_SITUS*`, tamu, peran tanpa hak; 200 untuk `pusdalops`, moderator, akun instansi wilayah sendiri; 403 untuk akun instansi wilayah lain | matriks hak | `tests/warga/pb_hak.test.mjs` |
| Versi renlap bersamaan tidak ganda; `terbit` tidak bisa ditimpa; HMAC salah, waktu basi, status acak ditolak | integrasi rute | `tests/warga/pb_renlap.test.mjs` |
| Tulis R2 sekali: `put` kedua pada kunci sama gagal | integrasi R2 | `tests/warga/pb_dokumen.test.mjs` |
| `EXPLAIN QUERY PLAN` tiap kueri `pb*` tanpa `SCAN` | ratchet | `tests/agen/gerbang-d1-pindai.test.mjs` (otomatis menangkap) |
| Tidak ada nama orang di `pb_*` dan tidak ada data operasi di `public/` | gerbang | `tests/agen/gerbang-paritas.test.mjs` (baru, `penulis-gerbang`) |
| Papan SK: `sisa_hari`, `akan_berakhir`, SK provinsi mengalahkan kabupaten | integrasi rute + D1 | `tests/warga/pb_papan_sk.test.mjs` |
| EWS jenis baru dari berkas sampai CAP | integrasi | `tests/warga/ews.test.mjs` (tambah kasus) |
| Skrip Python: `uji` untuk `renlap.py`, `ekonomi.py`, `prioritas.py`, `pb_ringkas.py` | self-check | `python3 scripts/umum/<x>.py uji` |
| Tiap layar baru ada di gerbang dasbor dan gerbang kartu | gerbang | `tests/agen/gerbang-dasbor.test.mjs`, `gerbang-kartu-std.test.mjs`, `gerbang-tanpa-kesimpulan.test.mjs` |

## 12. Pertanyaan untuk KEPUTUSAN

> Catatan orkestrator 15 Nov 2026: pertanyaan di bagian ini sudah dipindah ke KEPUTUSAN-PARITAS.md (Q1 sampai Q37) dan dinomori ulang di sana. Bila isi atau bawaan berbeda, KEPUTUSAN yang berlaku. Untuk rute layar baru berlaku Q13 (papan status darurat dilebur ke `siaga.html`, pembuat dokumen di `/bnpb/sitrep`, dashboard pimpinan `/bnpb/pimpinan`); panel kiri berlaku D12.


Pertentangan yang ditemukan terhadap dokumen lain: (1) KEPUTUSAN, PRD (F-1), dan `docs/multi-bencana/PARITAS-2026-11-15.md` menyebut `src/operasi_lapangan.js:163` sebagai penolak operasi non-karhutla; kode sebenarnya hanya menolak di `infoKluster` (kluster api) dan itu harus dipertahankan; penghambat nyatanya H1 sampai H4 di bagian 2.1. (2) `tugas_bencana` (0047) menolak `longsor` dan `pesisir` lewat CHECK, jadi "operasi untuk semua jenis" tidak jalan tanpa tabel samping `tugas_bencana_x`.
