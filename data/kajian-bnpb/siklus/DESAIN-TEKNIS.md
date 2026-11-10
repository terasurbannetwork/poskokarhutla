# DESAIN-TEKNIS: Siklus Bencana

Dokumen ketujuh dalam urutan otoritas. Kalah dari KEPUTUSAN-AWAL (KA), PRD, ALUR, ALGORITMA, DESIGN-SYSTEM; menang atas RENCANA-UJI dan TIKET. Versi 1.0. Rumus ada di `ALGORITMA.md` (dirujuk, tidak disalin). Penyimpangan dari PRD = ADR (12), butuh persetujuan pemilik.

Rujukan kode diperiksa pada main 10 Nov 2026 (`5e08fc443`) dan pohon kerja (`0119_meja_dampak.sql`, `src/hak.js` belum ter-commit). Jalur nyata: `scripts/gempa/{guncangan,pager}.py`, `public/gempa/data/`, `public/banjir/data/`, `public/data/{penduduk,sekolah,fasilitas}.json`; kunci BPS 4 digit lewat `kab_kunci` (`scripts/bnpb/kunci_kejadian.py`) dan `hvc_dasar.kab_kode` (`scripts/bnpb/hvc_dasar.py`). Keputusan `riset/TINJAUAN-1.md` sudah diterapkan.

## 1. Arsitektur lapis

```
L0 sumber publik   DIBI, Logbook, USGS, GDACS, GLIDE, Open Buildings, Overture, GHSL, WorldPop, Dukcapil, OSM, Wikidata, InaRISK, BPS, CHIRPS, NEX-GDDP, AR6/PSMSL
L1 panen           scripts/siklus/panen.py: jeda 2 dtk, UA proyek, 3x coba, tanpa CAPTCHA   [Actions siklus.yml]
L2 gudang R2       siklus/mentah/ (apa adanya, bertanggal) -> siklus/bersih/ (kunci kab4 Kemendagri, label) -> siklus/saji/ (agregat siap layar)
L3 tulang punggung kunci wilayah BPS 4 digit; ID kejadian KJ-; registri sumber; 6 label keyakinan
L4 mesin           pasang kejadian, silang paparan, kaji cepat = Python; hitung Jitupasna/R3P/renkon = JS murni di Worker
L5 operasi         Worker src/siklus*.js + D1 sk_* (transaksi staf, jejak)
L6 pintu           public/siklus/** (vanilla JS, .ex.ex-std, .sk-*), /siklus
L7 kendali         anggaran R2/D1/berkas, gerbang peta-data, uji:siklus, dummy, sk_jejak, rollback
```

1. Layar membaca `saji` dan D1 `sk_*` lewat Worker; tidak pernah `mentah` atau `bersih`.
2. D1 hanya transaksi dan keadaan hidup; agregat dan arsip di R2 (KA 27). Tanpa kueri pindai D1 di cron, tanpa cron Worker baru.
3. Worker tidak membaca Parquet, NetCDF, CSV. Berkas di atas 128 KB dialirkan tanpa `JSON.parse`; yang di-parse paling besar 128 KB (CPU 10 ms paket Free).
4. Python 3.12 stdlib; DuckDB hanya tahap lab (6.4).
5. Pipeline ke D1 hanya lewat rute Bearer `PIPA_TOKEN` yang sudah ada di Worker dan GitHub (pola `src/pipa.js`); tidak ada rahasia baru, jadi G1 tidak menunggu pemilik.
6. Satu pembaca kunci wilayah: `kunci.py` membungkus `kab_kunci` dan `hvc_dasar.kab_kode`.
7. Semua SQL `sk_*` adalah fungsi bernama di bagian Siklus `src/hak.js` (2.3); `src/siklus*.js` tidak menyentuh `env.DB`.

## 2. Peta berkas dan pemilik

Agent: `siklus` = layar, pipeline, registri, uji. `warga-api` = `src/**`, `migrations/**`, `wrangler.jsonc`, `tests/warga/**`. `mekanik-mesin` = workflow, `package.json`, roster. `pipa-umum` = `scripts/umum/**`.

### 2.1 Baru

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `migrations/<nomor>_sk_*.sql` | empat berkas per gelombang (3, 11) | warga-api |
| `src/siklus.js` | `layaniSk(env, req, url, ctx)`: pencocokan jalur, gerbang peran, halaman, aset berkunci, penyalur R2, laju. Tanpa `env.DB` | warga-api |
| `src/siklus_kab.js` | konstanta kab4 ke nama kabupaten (dibangun sekali dari `scripts/udara/kota.json`) dan `lingkupKab4(akun, kab4)` (4) | warga-api |
| `src/siklus_{kejadian,kaji,pulih,renkon,dummy,hitung}.js` | rute F1, F3, F4, F5, dummy; `hitung` = fungsi murni (ALGORITMA: ID `KJ-`, nilai kerusakan, hitung ganda, kedaluwarsa, selisih, kesenjangan). Tanpa `env.DB`; memanggil fungsi bernama di `src/hak.js` | warga-api |
| `tests/warga/siklus_*.test.mjs` | rute + D1 di Miniflare (`tests/warga/_bnpb.mjs`) | warga-api |
| `public/siklus/{index,publik}.html`, `{siklus,publik}.css` | cangkang staf dan publik (7.2), `.sk-*` | siklus |
| `public/siklus/{inti,konst,pintu,kejadian,paparan,kaji,pulih,renkon,gladi,masadepan,registri,dummy,publik,hitung,antre}.js` | satu tampilan per berkas; `inti.js`: `esc()`, fetch ber-`x-pb`, pil keyakinan, dan `fmt` dari `/inti/format.js` (tidak ada formatter kedua); `konst.js` kembaran `konst.py`; `hitung.js` cermin `siklus_hitung.js`; `antre.js` IndexedDB (tiru `public/pipa/antre.js`) | siklus |
| `public/siklus/data/{atribusi,kamus,masa_depan_ringkas}.json` | berkas kecil publik (5.3) | siklus |
| `scripts/siklus/*.py`, `sumber.json`, `rollback.sql` | pipeline, registri (6); `dummy_saji.py` membuat berkas contoh `siklus/saji/_dummy/` (9) | siklus |
| `tests/siklus/**` | fungsi murni, paritas Py/JS, gerbang registri, layar, `cakupan.json`, `fixtures/` | siklus |
| `.github/workflows/siklus.yml` | jadwal (6.3) | mekanik-mesin |

### 2.2 Berubah

| Berkas | Perubahan | Pemilik |
| --- | --- | --- |
| `src/worker.js` | satu cabang di `fetch()` sebelum gerbang host, seperti `layaniKm` (baris 884): `/siklus`, `/siklus/*`, `/api/siklus/*`, `/api/instansi/siklus/*` ke `layaniSk`; cabang instansi lebih dulu dari pembungkus `/api/instansi` (ADR-07) | warga-api |
| `wrangler.jsonc` | `run_worker_first` tambah `"/siklus/*"` (7.1) | warga-api |
| `src/hak.js` | bagian Siklus: `MATRIKS` `sk_*` dan fungsi bernama (2.3) | warga-api |
| `tests/warga/cakupan.json`, `migrasi_beku.json` | tabel `sk_*` masuk `diuji`/`dikecualikan`; sha256 migrasi | warga-api |
| `.github/workflows/bangunan.yml`, `package.json`, `roster.json`, `AGENTS.md` | 6.5; skrip `uji:siklus`; baris peta modul | mekanik-mesin |
| `scripts/umum/bangunan.py` | bila perlu pemecahan ubin (6.5); Siklus tidak menyunting | pipa-umum |
| `public/bnpb/pintu.js`, `public/inti/kepala.js` | kartu Siklus (F7); menu menunggu U2 | pemilik berkas |
| `src/logpal.js`, `rumah_rusak.js`, `pemulihan.js`, `meja_spek.js` | TIDAK diubah; dibaca lewat fungsi terekspor atau SQL baca terindeks; ekspor baru = tiket warga-api | warga-api |

### 2.3 Akses D1: bagian Siklus di `src/hak.js`

`tests/agen/gerbang-d1.test.mjs` menolak berkas `src/` baru yang menyentuh D1 (`env.DB`, `.prepare(`, `.batch(`), dan gerbang tidak dilonggarkan. Maka bagian "Siklus" ditambahkan ke `src/hak.js` dengan pola yang sudah ada di berkas itu (`MATRIKS` sebagai data dan `sedia(env, pelaku, tabel, aksi, sql)`):

- **MATRIKS.** Satu entri per tabel `sk_*`, pelaku `sistem` (Bearer ingest, ada), `sk_staf` (sesi `pusdalops|koordalops|pimpinan`), `sk_instansi` (BP), `admin` (SA, ada); aksi `baca`, `tambah`, `ubah`, `hapus` (`hapus` hanya `admin` dan baris `dummy = 1`). Pelaku `diri` tidak dipakai. Pembeda PD, KO, PM tetap di gerbang peran rute (urutan penjaga di 4).
- **Fungsi bernama.** Satu fungsi per pernyataan, awalan `sk`: pembaca (`skKejadianDaftar`, `skSumberJendela`, ...), pembangun statement tulis tak dieksekusi (`skStmtKejadianBaru`, ...), dan `skBatch(env, p, stmts)` yang menolak batch tanpa baris `sk_jejak` (INV-4). Nilai lewat `.bind()`, kolom dari daftar putih.
- **Gerbang.** `src/siklus*.js` tidak menulis `env.DB`; `d1-sisa.json` tidak bertambah; `siklus_rencana_kueri.test.mjs` mengambil kueri dari fungsi-fungsi itu.
- **Penyuntingan.** `src/hak.js` kotor oleh sesi lain: periksa `git status --porcelain src/hak.js`, baca diff, tambah bagian Siklus di akhir berkas saja.

## 3. Model data D1

Gaya `0096`, `0119`, `km_*`: id TEXT 16 heks (`acak(8)`; kecuali `sk_kejadian.id` yang berformat `KJ-`, dari hash, ALG F1.2); waktu INTEGER ms UTC; tanggal `YYYY-MM-DD`; `prov` 2 digit; `kab4` Kemendagri (bukan BPS; `id_kab_bps` DIBI dan data BPS dipetakan lewat nama + provinsi, adapter BPS F4 sama); teks ber-CHECK panjang; `dummy` di SEMUA tabel; hanya `CREATE ... IF NOT EXISTS` dan `ON CONFLICT ... DO NOTHING` (bukan `INSERT OR IGNORE`); tanpa `ALTER` yang butuh bangun ulang.

**Aturan CHECK enum (pelajaran `meja_catatan`, 0110/0118/0119).** Enum tetap menurut peraturan (fase, status alur, tingkat, jenis gladi, label keyakinan) di-CHECK. Enum yang bisa tumbuh (jenis kejadian, nama sumber, sektor U10) hanya di-CHECK panjangnya; daftar sahnya dijaga Worker dan uji, supaya menambah nilai tidak menuntut bangun ulang tabel.

Singkatan diekspansi penuh pengerja migrasi (uji `siklus_skema`):

| Singkatan | Isi |
| --- | --- |
| `ID16(x)` | `CHECK (length(x) = 16 AND x NOT GLOB '*[^0-9a-f]*')` |
| `KJ(x)` | `CHECK (length(x) = 16 AND x GLOB 'KJ-[0-9][0-9][0-9][0-9]-????????' AND substr(x, 9) NOT GLOB '*[^0-9A-HJKMNP-TV-Z]*')` |
| `KAB4(x)`, `PROV(x)` | 4 / 2 digit angka: `CHECK (x IS NULL OR (length(x) = 4 AND x NOT GLOB '*[^0-9]*'))` |
| `TGL(x)` | `CHECK (x IS NULL OR x GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')` |
| `T(x,n,m)` | `CHECK (length(x) BETWEEN n AND m)` |
| `YAKIN(x)` | `CHECK (x IN ('resmi','terverifikasi','estimasi-model','asumsi-kebijakan','hipotesis','menunggu'))` |
| `JS(x,n)` | `CHECK (x IS NULL OR (json_valid(x) AND length(x) <= n))` |
| varian | `T-null(x,n,m)` = `T` yang membolehkan NULL; `KJ-null(x)` = `KJ` yang membolehkan NULL; `KAB4-notnull(x)` = `KAB4` tanpa `IS NULL`; `PROV` selalu NOT NULL kecuali tertulis |
| `DUM` | `dummy INTEGER NOT NULL DEFAULT 0 CHECK (dummy IN (0, 1))` |

### 3.1 Gelombang G1: `sk_kejadian`, `sk_kejadian_kab`, `sk_kejadian_alias`, `sk_kejadian_sumber`, `sk_jejak`

```sql
-- ID = 'KJ-' + tahun + '-' + 8 Crockford base32 dari SHA-256 kunci pendiri (ALG F1.2); satu skema untuk D1 dan arsip R2
CREATE TABLE IF NOT EXISTS sk_kejadian (
  id TEXT PRIMARY KEY KJ(id),
  jenis TEXT NOT NULL T(jenis,3,24),                    -- kunci JENIS kunci_kejadian.py
  nama TEXT NOT NULL T(nama,3,160),
  prov TEXT PROV(prov),
  kab4 TEXT KAB4(kab4),                                 -- kab utama (terkecil); NULL = "wilayah belum terpetakan"
  mulai TEXT NOT NULL TGL(mulai), akhir TEXT TGL(akhir),
  pusat_lat REAL CHECK (pusat_lat IS NULL OR pusat_lat BETWEEN -11.5 AND 6.5),
  pusat_lon REAL CHECK (pusat_lon IS NULL OR pusat_lon BETWEEN 94 AND 142),
  fase TEXT NOT NULL DEFAULT 'terdeteksi' CHECK (fase IN ('terdeteksi','terverifikasi','tanggap','transisi','pemulihan','selesai','dibatalkan','digabung')),
  fase_diubah INTEGER NOT NULL,
  ke TEXT KJ-null(ke),                                  -- penyintas bila fase = 'digabung'; disaring dari daftar
  tanggap_mulai TEXT TGL(tanggap_mulai), tanggap_akhir TEXT TGL(tanggap_akhir),   -- pemicu pengingat PDNA
  nomor_induk TEXT T-null(nomor_induk,1,40),            -- U14: kosong sampai format resmi ada; nomor KIB Rantai bila tersedia (U21)
  asal TEXT NOT NULL CHECK (asal IN ('otomatis','manual','promosi')),
  arsip_tahun INTEGER CHECK (arsip_tahun IS NULL OR arsip_tahun BETWEEN 2011 AND 2100),   -- terisi bila asal = 'promosi'
  publik INTEGER NOT NULL DEFAULT 0 CHECK (publik IN (0, 1)),
  ringkasan_publik TEXT CHECK (ringkasan_publik IS NULL OR length(ringkasan_publik) <= 600),
  yakin TEXT NOT NULL DEFAULT 'terverifikasi' YAKIN(yakin),   -- label identitas, bukan dampak
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL, oleh TEXT NOT NULL T(oleh,1,64),
  DUM,
  CHECK ((fase = 'digabung') = (ke IS NOT NULL)),
  CHECK (publik = 0 OR (ringkasan_publik IS NOT NULL AND fase NOT IN ('terdeteksi','dibatalkan','digabung')))
);
CREATE INDEX IF NOT EXISTS sk_kej_kab ON sk_kejadian (kab4, mulai DESC);
CREATE INDEX IF NOT EXISTS sk_kej_mulai ON sk_kejadian (mulai DESC, id DESC);
CREATE INDEX IF NOT EXISTS sk_kej_fase ON sk_kejadian (fase, fase_diubah) WHERE fase NOT IN ('selesai','dibatalkan','digabung');
CREATE INDEX IF NOT EXISTS sk_kej_dummy ON sk_kejadian (id) WHERE dummy = 1;

CREATE TABLE IF NOT EXISTS sk_kejadian_kab (            -- kejadian multi-kabupaten (ALG F1.3); kab utama juga satu baris
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian(id) KJ(kejadian_id),
  kab4 TEXT NOT NULL KAB4-notnull(kab4),
  mulai TEXT NOT NULL DATE(mulai),                      -- salinan sk_kejadian.mulai: daftar BP lewat indeks tanpa gabung ke tabel induk
  dibuat INTEGER NOT NULL, DUM,
  PRIMARY KEY (kejadian_id, kab4)
);
CREATE INDEX IF NOT EXISTS sk_kejkab_kab ON sk_kejadian_kab (kab4, mulai DESC, kejadian_id);

CREATE TABLE IF NOT EXISTS sk_kejadian_alias (          -- hasil gabung; id lama tetap terbuka
  alias_id TEXT PRIMARY KEY KJ(alias_id),
  ke_id TEXT NOT NULL REFERENCES sk_kejadian(id) KJ(ke_id),
  alasan TEXT NOT NULL T(alasan,3,200), dibuat INTEGER NOT NULL, oleh TEXT NOT NULL T(oleh,1,64), DUM
);
CREATE INDEX IF NOT EXISTS sk_alias_ke ON sk_kejadian_alias (ke_id);

CREATE TABLE IF NOT EXISTS sk_kejadian_sumber (         -- (sumber, kode) -> KJ-; juga antrean
  id TEXT PRIMARY KEY ID16(id),
  sumber TEXT NOT NULL T(sumber,2,24),                  -- dibi, logbook, gempa, banjir, karhutla, usgs, gdacs, glide, rantai, meja_dampak, ...
  kode TEXT NOT NULL T(kode,1,120),                     -- karhutla: sel/kompleks, BUKAN K####; rantai/meja_dampak: kode sumbernya (baca saja, U21)
  kode_hari TEXT T-null(kode_hari,1,16),                -- K#### hanya pengenal hari itu
  pengenal_luar TEXT T-null(pengenal_luar,1,120),       -- GLIDE, GDACS, USGS: kunci silang, bukan angka
  kejadian_id TEXT REFERENCES sk_kejadian(id) KJ-null(kejadian_id),
  asal_id TEXT KJ-null(asal_id),                        -- id kejadian sebelum baris dipindah (gabung atau koreksi manual); tanpa FK
  status TEXT NOT NULL CHECK (status IN ('terpasang','ambigu','tanpa_wilayah','ditolak')),
  jenis TEXT NOT NULL T(jenis,3,24), kab4 TEXT KAB4(kab4), mulai TEXT NOT NULL TGL(mulai),
  kandidat TEXT JS(kandidat,600),                       -- ["KJ-...", ...] bila ambigu
  dampak TEXT JS(dampak,2000),                          -- {kolom:{n,y,t}} per sumber; TIDAK dijumlah
  diambil INTEGER NOT NULL,
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL, DUM,
  UNIQUE (sumber, kode, dummy),
  CHECK ((status = 'terpasang') = (kejadian_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS sk_ks_kej ON sk_kejadian_sumber (kejadian_id);
CREATE INDEX IF NOT EXISTS sk_ks_mulai ON sk_kejadian_sumber (mulai, id);          -- untuk ingest/sumber (pasang.py), dibaca per tanggal
CREATE INDEX IF NOT EXISTS sk_ks_antre ON sk_kejadian_sumber (status, mulai, id) WHERE status IN ('ambigu','tanpa_wilayah');

CREATE TABLE IF NOT EXISTS sk_jejak (                   -- satu jejak untuk SEMUA sk_*; satu batch dengan tiap tulis
  id INTEGER PRIMARY KEY, waktu INTEGER NOT NULL,
  oleh TEXT NOT NULL T(oleh,1,64),                      -- 'staf:<id>', 'instansi:<id>', 'sistem:ingest'
  obyek TEXT NOT NULL T(obyek,2,24),
  obyek_id TEXT NOT NULL T(obyek_id,1,40),
  aksi TEXT NOT NULL T(aksi,2,24), dari TEXT T-null(dari,1,40), ke TEXT T-null(ke,1,40),
  catatan TEXT CHECK (catatan IS NULL OR length(catatan) <= 200), DUM
);
CREATE INDEX IF NOT EXISTS sk_jejak_obyek ON sk_jejak (obyek, obyek_id, waktu DESC);
CREATE INDEX IF NOT EXISTS sk_jejak_dummy ON sk_jejak (id) WHERE dummy = 1;
```

Trigger `sk_kejadian_fase` (pola `meja_catatan_ubah`) memeriksa pasangan sah ALUR 2.1 (maju atau mundur satu langkah, `dibatalkan` hanya dari `terdeteksi`, `digabung` dari fase hidup mana pun dan tidak pernah keluar lagi) dengan `RAISE(ABORT, 'sk_fase: ...')`; `sk_kejadian_publik` menolak `publik = 1` saat fase `dibatalkan` atau `digabung`. Rute fase menurunkan `publik` ke 0 dalam batch yang sama bila fase baru `terdeteksi`, `dibatalkan`, atau `digabung` (ALUR 2.1). Tidak ada operasi pecah (ALG F1.5): koreksi salah gabung memindahkan satu baris `sk_kejadian_sumber` (`asal_id` terisi) dan tercatat di `sk_jejak`.

Trigger `sk_kejadian_publik` (BEFORE UPDATE OF publik, fase) dan `sk_kejadian_publik_baru` (BEFORE INSERT) menolak `publik = 1` untuk kejadian `dibatalkan` atau `digabung` dengan `RAISE(ABORT, 'sk_publik: ...')`; CHECK tabel sudah menolak `terdeteksi`, trigger memberi pesan yang jelas.

### 3.2 Gelombang G2: `sk_kaji`

```sql
CREATE TABLE IF NOT EXISTS sk_kaji (
  id TEXT PRIMARY KEY ID16(id),
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian(id) KJ(kejadian_id),
  model TEXT NOT NULL CHECK (model IN ('gempa','banjir_jam1')),
  versi INTEGER NOT NULL CHECK (versi BETWEEN 1 AND 99),
  status TEXT NOT NULL CHECK (status IN ('menunggu_data','dihitung','diperiksa','dipakai','ditarik')),
  masukan TEXT NOT NULL JS(masukan,800),               
  ringkas TEXT NOT NULL JS(ringkas,1500),               -- rentang SELALU larik 2
  hasil_r2 TEXT CHECK (hasil_r2 IS NULL OR hasil_r2 GLOB 'siklus/saji/kaji/KJ-*'),
  galat_kalibrasi TEXT JS(galat_kalibrasi,400),
  yakin TEXT NOT NULL DEFAULT 'estimasi-model' CHECK (yakin = 'estimasi-model'),   -- KA 9: tidak ada label lain sampai uji balik lolos
  alasan_tarik TEXT CHECK (alasan_tarik IS NULL OR length(alasan_tarik) BETWEEN 3 AND 300),
  dihitung INTEGER NOT NULL, diubah INTEGER NOT NULL, oleh TEXT NOT NULL T(oleh,1,64), DUM,
  UNIQUE (kejadian_id, model, versi, dummy),
  CHECK ((status = 'ditarik') = (alasan_tarik IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS sk_kaji_kej ON sk_kaji (kejadian_id, versi DESC);
CREATE INDEX IF NOT EXISTS sk_kaji_status ON sk_kaji (status, diubah DESC) WHERE status IN ('menunggu_data','dihitung','diperiksa');
```

`yakin = 'estimasi-model'` terkunci di CHECK; melepasnya = migrasi dengan keputusan pemilik.

### 3.3 Gelombang G3: `sk_harga`, `sk_jitupasna`, `sk_jitupasna_baris`, `sk_r3p`, `sk_r3p_kegiatan`

```sql
CREATE TABLE IF NOT EXISTS sk_harga (                   -- manual (U4); tidak ada API PUPR
  id TEXT PRIMARY KEY ID16(id), sektor TEXT NOT NULL T(sektor,2,40),
  tingkat TEXT NOT NULL CHECK (tingkat IN ('rb','rs','rr','hancur','unit')), satuan TEXT NOT NULL T(satuan,1,20),
  harga_rp INTEGER NOT NULL CHECK (harga_rp BETWEEN 1 AND 100000000000),
  tahun INTEGER NOT NULL CHECK (tahun BETWEEN 2000 AND 2100), kab4 TEXT KAB4(kab4),   -- NULL = acuan nasional
  dokumen TEXT NOT NULL T(dokumen,3,200),               -- HSBGN/Perka, WAJIB
  yakin TEXT NOT NULL DEFAULT 'asumsi-kebijakan' CHECK (yakin IN ('asumsi-kebijakan','resmi')),
  dibuat INTEGER NOT NULL, oleh TEXT NOT NULL T(oleh,1,64), DUM);
CREATE INDEX IF NOT EXISTS sk_harga_cari ON sk_harga (sektor, tingkat, tahun DESC, kab4);

CREATE TABLE IF NOT EXISTS sk_jitupasna (
  id TEXT PRIMARY KEY ID16(id),
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian(id) KJ(kejadian_id), kaji_id TEXT,   -- kaji: pembanding, tanpa FK
  prov TEXT NOT NULL PROV(prov), kab4 TEXT NOT NULL KAB4-notnull(kab4),
  status TEXT NOT NULL DEFAULT 'dibuka' CHECK (status IN ('dibuka','pengumpulan','dihitung','ditinjau','final')),
  tim_sk TEXT T-null(tim_sk,1,120),                     -- nomor SK tim PDNA sebagai TEKS
  versi INTEGER NOT NULL DEFAULT 1 CHECK (versi BETWEEN 1 AND 99), induk_id TEXT,
  tahun_harga INTEGER CHECK (tahun_harga IS NULL OR tahun_harga BETWEEN 2000 AND 2100),
  hitung TEXT JS(hitung,3000),                          -- belum ada = "menunggu", bukan 0
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL, oleh TEXT NOT NULL T(oleh,1,64), DUM,
  UNIQUE (kejadian_id, kab4, versi, dummy));
CREATE INDEX IF NOT EXISTS sk_jp_kab ON sk_jitupasna (kab4, diubah DESC);
CREATE INDEX IF NOT EXISTS sk_jp_kej ON sk_jitupasna (kejadian_id);

CREATE TABLE IF NOT EXISTS sk_jitupasna_baris (
  id TEXT PRIMARY KEY ID16(id), jitupasna_id TEXT NOT NULL REFERENCES sk_jitupasna(id) ID16(jitupasna_id),
  jenis TEXT NOT NULL CHECK (jenis IN ('rusak','rugi')),
  sektor TEXT NOT NULL T(sektor,2,40),                  -- U10 terbuka: tanpa CHECK daftar
  tingkat TEXT CHECK (tingkat IS NULL OR tingkat IN ('rb','rs','rr','hancur','unit')),
  unit REAL CHECK (unit IS NULL OR unit BETWEEN 0 AND 10000000),
  komponen TEXT T-null(komponen,2,40), arus_rp INTEGER CHECK (arus_rp IS NULL OR arus_rp BETWEEN 0 AND 100000000000),   -- jenis = 'rugi' (ALG F4.4)
  bulan INTEGER CHECK (bulan IS NULL OR bulan BETWEEN 1 AND 120),
  unit_asal TEXT NOT NULL DEFAULT 'isian' CHECK (unit_asal IN ('isian','rekap_rumah_rusak')),
  harga_id TEXT,                                        -- dibekukan saat dihitung
  nilai_rp INTEGER CHECK (nilai_rp IS NULL OR nilai_rp BETWEEN 0 AND 100000000000000),
  asumsi TEXT CHECK (asumsi IS NULL OR length(asumsi) <= 300), klien_id TEXT T-null(klien_id,8,40),   -- klien_id: idempotensi luring
  dibuat INTEGER NOT NULL, oleh TEXT NOT NULL T(oleh,1,64), DUM,
  UNIQUE (jitupasna_id, klien_id),
  CHECK ((jenis = 'rusak' AND tingkat IS NOT NULL AND unit IS NOT NULL AND komponen IS NULL AND arus_rp IS NULL AND bulan IS NULL)
      OR (jenis = 'rugi' AND tingkat IS NULL AND unit IS NULL AND komponen IS NOT NULL AND arus_rp IS NOT NULL AND bulan IS NOT NULL)));
CREATE INDEX IF NOT EXISTS sk_jpb_jp ON sk_jitupasna_baris (jitupasna_id, sektor);

CREATE TABLE IF NOT EXISTS sk_r3p (
  id TEXT PRIMARY KEY ID16(id), jitupasna_id TEXT NOT NULL REFERENCES sk_jitupasna(id) ID16(jitupasna_id),
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian(id) KJ(kejadian_id),
  status TEXT NOT NULL DEFAULT 'draf' CHECK (status IN ('draf','diusulkan','disetujui_pm','ditetapkan_resmi','berjalan','selesai')),
  versi INTEGER NOT NULL DEFAULT 1 CHECK (versi BETWEEN 1 AND 99), induk_id TEXT,
  tanggap_mulai TEXT TGL(tanggap_mulai),                -- dasar 90 hari (pengingat)
  disetujui_oleh TEXT T-null(disetujui_oleh,1,64), disetujui_pada INTEGER,   -- setuju INTERNAL (U7)
  no_keputusan TEXT T-null(no_keputusan,1,120), tgl_keputusan TEXT TGL(tgl_keputusan), penandatangan TEXT T-null(penandatangan,2,120),   -- dokumen resmi di luar sistem
  total_rp INTEGER CHECK (total_rp IS NULL OR total_rp >= 0),
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL, oleh TEXT NOT NULL T(oleh,1,64), DUM,
  UNIQUE (jitupasna_id, versi, dummy),
  CHECK ((status IN ('disetujui_pm','ditetapkan_resmi','berjalan','selesai')) = (disetujui_oleh IS NOT NULL)),
  CHECK (status NOT IN ('ditetapkan_resmi','berjalan','selesai') OR (no_keputusan IS NOT NULL AND tgl_keputusan IS NOT NULL)));
CREATE INDEX IF NOT EXISTS sk_r3p_kej ON sk_r3p (kejadian_id, versi DESC);

CREATE TABLE IF NOT EXISTS sk_r3p_kegiatan (
  id TEXT PRIMARY KEY ID16(id), r3p_id TEXT NOT NULL REFERENCES sk_r3p(id) ID16(r3p_id),
  sektor TEXT NOT NULL T(sektor,2,40),                  -- lima sektor Perban 5/2017 Pasal 8(2); daftar dijaga Worker
  nama TEXT NOT NULL T(nama,3,200), target REAL CHECK (target IS NULL OR target >= 0), satuan TEXT T-null(satuan,1,20),
  nilai_rp INTEGER CHECK (nilai_rp IS NULL OR nilai_rp >= 0),
  tautan_jenis TEXT CHECK (tautan_jenis IS NULL OR tautan_jenis IN ('pemulihan','meja_rehab')), tautan_id TEXT T-null(tautan_id,1,40),
  status TEXT NOT NULL DEFAULT 'rencana' CHECK (status IN ('rencana','berjalan','selesai','macet')),
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL, oleh TEXT NOT NULL T(oleh,1,64), DUM,
  CHECK ((tautan_jenis IS NULL) = (tautan_id IS NULL)));
CREATE INDEX IF NOT EXISTS sk_r3pk_r3p ON sk_r3p_kegiatan (r3p_id);
```

Lima sektor R3P belum dicocokkan ke teks Pasal 8 ayat (2); tiket G3 melakukannya. Trigger: `sk_r3p_status` (ALUR 2.4), `sk_jitupasna_final` (baris beku), `sk_r3p_setuju` (uji).

### 3.4 Gelombang G4: `sk_renkon`, `sk_gladi`

```sql
CREATE TABLE IF NOT EXISTS sk_renkon (
  id TEXT PRIMARY KEY ID16(id),
  judul TEXT NOT NULL T(judul,5,200), bencana TEXT NOT NULL T(bencana,3,24),
  prov TEXT NOT NULL PROV(prov), kab4 TEXT KAB4(kab4),   -- NULL = tingkat provinsi
  skenario TEXT CHECK (skenario IS NULL OR length(skenario) <= 4000),
  asumsi TEXT JS(asumsi,6000),                          -- lima aspek {nilai,sumber,waktu,yakin}; usulan sistem di "usulan"
  kerangka TEXT JS(kerangka,6000), kesenjangan TEXT JS(kesenjangan,6000),
  status TEXT NOT NULL DEFAULT 'persiapan' CHECK (status IN ('persiapan','pelaksanaan','finalisasi','ditetapkan','berlaku','dimutakhirkan')),
  versi INTEGER NOT NULL DEFAULT 1 CHECK (versi BETWEEN 1 AND 99), induk_id TEXT,
  tgl_sah TEXT TGL(tgl_sah), berlaku_sampai TEXT TGL(berlaku_sampai), no_penetapan TEXT T-null(no_penetapan,1,120),
  reviu_terakhir TEXT TGL(reviu_terakhir),              -- isian staf; dasar reviu enam bulan (ALG F5.3)
  meja_id TEXT T-null(meja_id,1,40),                    -- meja_catatan.id metadata renkon, tanpa FK
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL, oleh TEXT NOT NULL T(oleh,1,64), DUM,
  UNIQUE (prov, kab4, bencana, versi, dummy),
  CHECK (status NOT IN ('ditetapkan','berlaku') OR (tgl_sah IS NOT NULL AND berlaku_sampai IS NOT NULL AND no_penetapan IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS sk_rk_wil ON sk_renkon (prov, kab4, bencana);
CREATE INDEX IF NOT EXISTS sk_rk_batas ON sk_renkon (berlaku_sampai) WHERE status = 'berlaku';

CREATE TABLE IF NOT EXISTS sk_gladi (
  id TEXT PRIMARY KEY ID16(id),
  jenis TEXT NOT NULL CHECK (jenis IN ('ruang','posko','lapang')),
  renkon_id TEXT NOT NULL REFERENCES sk_renkon(id) ID16(renkon_id),
  kejadian_id TEXT NOT NULL REFERENCES sk_kejadian(id) KJ(kejadian_id),   -- hanya kejadian yang sudah dipromosikan ke D1 (ADR-04)
  status TEXT NOT NULL DEFAULT 'dirancang' CHECK (status IN ('dirancang','siap','berjalan','dievaluasi','selesai')),
  skenario TEXT JS(skenario,6000),                      -- injeksi disusun dari garis waktu kejadian; BUKAN simulasi genangan
  masalah TEXT JS(masalah,6000), rekomendasi TEXT JS(rekomendasi,4000),   -- matriks masalah Juklak 4/2026
  dibuat INTEGER NOT NULL, diubah INTEGER NOT NULL, oleh TEXT NOT NULL T(oleh,1,64), DUM,
  CHECK (status <> 'selesai' OR rekomendasi IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS sk_gl_renkon ON sk_gladi (renkon_id, diubah DESC);
```

`kedaluwarsa` dan hari tersisa dihitung saat dibaca (ADR-09). Pengingat memakai `src/pengingat.js` apa adanya; jenis baru butuh bangun ulang CHECK `pengingat`, ditunda ke tiket warga-api (PRD F5-06).

### 3.5 Yang tidak dibuat

Tidak ada `sk_laju` (pakai `laju_bnpb`), `sk_foto` (tiada unggahan baru, lihat KEAMANAN), tabel rumah rusak, stok, pengungsi, atau `meja_*`. Registri sumber di berkas, bukan D1. Rantai per KIB dan `meja_dampak` tidak punya tabel Siklus: `sk_kejadian` adalah satu-satunya buku kejadian dan keduanya dirujuk baca saja lewat `sk_kejadian_sumber` (`sumber = 'rantai'` atau `'meja_dampak'`, `kode` = kode sumbernya); bila `data/kajian-bnpb/rantai/KEPUTUSAN-RANTAI.md` ada, tiket pemasangan membacanya lebih dulu (KA U21).

## 4. Kontrak rute `/api/siklus/*`

**Aturan bersama.** Galat `gagal(status, pesan)` (`{galat}`). Urutan penjaga: gerbang peran PERTAMA (tamu tidak tahu apakah id ada), `tolakOrigin` (POST/PATCH/DELETE), header `x-pb: 1`, badan (`bacaBody`, maks 16 KB; 256 KB untuk ingest dan baris Jitupasna), validasi (`cek/tolak`, `src/pusdalops_umum.js`), laju, D1. `sk_*` belum ada = 503 jelas (pola `tabelBelum`). Peran: `STAF` = sesi staf `pusdalops|koordalops|pimpinan` atau `adminOK` (pola `pintu()`); tulis butuh `pusdalops|koordalops` atau SA (PD, KO); `PM` = `pimpinan`; `SA` = `superOK`; `BP` = akun instansi lewat `/api/instansi/siklus/*` (cookie berpath `/api/instansi`, ADR-05) dibatasi `lingkupKab4(akun, kab4)` (4.1). Baris dummy mengikuti aturan `dalamLingkup` di `src/instansi.js` (akun nyata tidak melihat `dummy = 1`). Staf nyata tidak melihat `dummy = 1`. Jawaban staf `private, no-store`. Laju: `laju(env, "sk:"+oleh, aksi, [[jam, maks]])` (`src/bnpb.js`; satu tulis D1, jadi tidak dipasang di GET). Kode: 400 validasi, 401 tanpa sesi, 403 peran/wilayah/origin/`x-pb`, 404 tidak ada atau di luar wilayah (jawaban sama), 409 transisi/benturan, 413, 429, 503.

| Rute | Peran | Masukan -> keluaran | Galat khas, laju |
| --- | --- | --- | --- |
| `GET /api/siklus/publik/kejadian/:id` | tamu | id -> `{id,jenis,wilayah,mulai,fase,ringkasan,yakin,diperbarui}` hanya `publik=1,dummy=0`; `public, max-age=60, s-maxage=300` | 404 seragam; tembolok tepi, tanpa tulis D1 |
| `GET /api/siklus/kejadian` | STAF, BP | `kab4,prov,jenis,fase,dari,sampai,sesudah,batas<=100` -> `{baris,berikut}` D1 hidup, terindeks, tanpa fase `digabung` | 400 rentang >366 hari |
| `GET /api/siklus/kejadian/arsip` | STAF, BP | `tahun,prov` (BP: `kab4`) -> aliran R2 `kejadian/arsip/<tahun>/<prov>.json` (BP `k<kab4>.json`) | 404 belum dibangun |
| `GET /api/siklus/kejadian/:id` | STAF, BP | D1 dulu: kejadian + `kab[]` + `sumber[]` berdampingan + `selisih[]` (server, bukan total) + `kaji_ids,pulih_ids` + 50 jejak. Tidak ada di D1 dan `tahun`, `kab4` diberikan: baca `arsip/<tahun>/k<kab4>.json` (<=128 KB), tampil baca saja berlabel arsip. Selain itu 404 | alias -> `{alias_ke}`; id tak berformat `KJ-` 404 |
| `POST /api/siklus/kejadian` | PD, KO | `{jenis,nama,kab4?,mulai,pusat?}` -> 201 `{id}` dari hash kunci pendiri (ALG F1.2; tabrakan: `kunci\|n`) | 409 + `kandidat[]` bila serupa (3 hari, kab4); ulang `paksa:true`; 60/jam |
| `POST .../kejadian/:id/promosi` | PD, KO | `{tahun,kab4}` (dari baris daftar arsip) -> 201 baris D1 + `sk_kejadian_kab` dari arsip (Worker membaca `arsip/<tahun>/k<kab4>.json` <=128 KB, memeriksa id) | 404 id tidak di berkas itu; baris tanpa wilayah tidak punya `kab4` sehingga tidak bisa dipromosikan (400, layar menulis alasannya); sudah ada = 200; 60/jam |
| `POST .../kejadian/:id/fase` | KO (PD: `terdeteksi->terverifikasi`, `dibatalkan`) | `{ke,alasan?,tanggap_mulai?,tanggap_akhir?}`; fase baru `terdeteksi`/`dibatalkan` menurunkan `publik` ke 0 dalam batch yang sama | 409 transisi; `alasan` wajib untuk mundur, `selesai`, `dibatalkan`; syarat `transisi->pemulihan` (R3P `diusulkan`) ditegakkan sejak G3; 120/jam |
| `POST .../kejadian/:id/publik` | KO | `{publik,ringkasan 20-600}` tanpa nama orang, telepon, surel | 409 fase `terdeteksi`/`dibatalkan`; 60/jam |
| `POST .../kejadian/:id/gabung` | KO | `{ke}` -> fase `digabung`, `ke` terisi, alias, `sk_kejadian_kab` digabung, sumber pindah (`asal_id`), satu batch | 409 fase berbeda; 30/jam |
| `POST .../kejadian/:id/koreksi` | KO | `{sid,ke:"KJ-..."\|"baru"}` memindahkan satu baris `sk_kejadian_sumber` (pengganti pecah; `asal_id` terisi, jejak `koreksi`) | 409 fase berbeda atau `ke` `digabung`; 30/jam |
| `GET /api/siklus/antrean`, `POST .../antrean/:sid` | PD, KO | `status` -> sumber `ambigu`/`tanpa_wilayah` + `kandidat`; `{pilih:"KJ-..."\|"baru"\|null,kab4?}` | 409 di luar kandidat; 120/jam |
| `GET /api/siklus/jejak` | STAF | `obyek,id` -> jejak terbaru | - |
| `GET .../paparan/ringkas` | STAF | `prov` -> aliran `paparan/<prov>.json` | `terliput:false` ada di isi |
| `GET .../paparan/kab`, `.../fasilitas`, `.../rinci` | `kab`: STAF, BP; `fasilitas`, `rinci`: PD, KO, SA (+PM `fasilitas`), BP wilayahnya; parameter `contoh=1` hanya SA, dilayani dari `siklus/saji/_dummy/` (9) | `kab4` -> aliran `paparan/kab/`, `fasilitas/`, `paparan/rinci/<kab4>.json`; `rinci` dicatat `sk_jejak` (`baca_rinci`), 300/jam | 403 peran lain |
| `GET .../kaji`, `.../kaji/:id` | STAF, BP | `kejadian_id` -> baris; detail = baris + R2 `kaji/<KJ>.json` (<=100 KB, di-parse) + isian petugas meja `kaji_cepat` berdampingan | 404 |
| `POST .../kaji/:id/status` | PD, KO | `{ke:diperiksa\|dipakai\|ditarik,alasan?}` | 409; `alasan` wajib `ditarik`; 120/jam |
| `GET .../pulih`, `.../pulih/:id` | STAF, BP | detail = Jitupasna + baris + `rekap_rumah_rusak` (hitungan per tingkat dari `bacaRekap`, tanpa koordinat) + R3P + kegiatan + kemajuan `pemulihan` | 404 luar wilayah |
| `POST .../pulih` | KO | `{kejadian_id,kab4,tim_sk?}` -> 201 | 409 kejadian belum `tanggap`/`transisi`; 30/jam |
| `POST .../pulih/:id/baris` | BP wilayahnya, PD, KO | `{baris:[{jenis,sektor,tingkat?,unit?,asumsi?,klien_id}]}` <=100 -> `{diterima,duplikat}` | 409 status bukan `dibuka`/`pengumpulan`; 600 baris/jam |
| `POST .../pulih/:id/hitung`, `/status` | PD, KO (`status`: KO) | `{tahun_harga}` -> hasil `siklus_hitung` (harga kosong = `menunggu`); `{ke,alasan?}` | 409; 30-60/jam |
| `GET`, `POST .../harga` | STAF baca; PD, KO tulis | `{sektor,tingkat,satuan,harga_rp,tahun,kab4?,dokumen}` | 400 `dokumen` kosong; 60/jam |
| `POST .../r3p`, `/:id/status`, `/:id/kegiatan` | KO | `{jitupasna_id}`; `{ke,no_keputusan?,tgl_keputusan?,penandatangan?}`; kegiatan + `tautan_*` | 409 Jitupasna belum `final`; 404 `tautan_id` tidak ada; 30-120/jam |
| `GET .../r3p/:id` | STAF, BP | R3P + kegiatan + `hari_tersisa_90` | - |
| `POST .../r3p/:id/setuju` | PM | `{}` -> `disetujui_pm`, label "tanda setuju internal" | 409 bukan `diusulkan`; 30/jam |
| `GET .../renkon`, `/:id` | STAF, BP | renkon + `kedaluwarsa` + `hari_tersisa` + kesenjangan (stok LogPal dan personel `/petugas` dibaca, tidak disalin; tiada stok = "stok belum tercatat") | - |
| `POST .../renkon`, `/:id/status`, `/:id/asumsi` | PD, KO (`status`: KO) | judul, bencana, wilayah; terima/ubah usulan asumsi | 409; `ditetapkan` wajib `no_penetapan,tgl_sah`; 60/jam |
| `GET`, `POST .../gladi`, `/:id/status`, `/:id/catatan` | KO; PD `catatan` | `{jenis,renkon_id,kejadian_id}`; skenario disusun server dari baris D1 kejadian terpromosi (`sk_kejadian_sumber`, `logbook_entri`) | 404 kejadian tak ada; 409 kejadian masih di arsip R2 (promosikan dulu); replay Maret 2025 hanya miliknya; 60/jam |
| `GET .../masadepan` | STAF, BP | `prov` -> aliran `masa_depan/<prov>.json` (semua `hipotesis`) | 404 "menunggu" |
| `GET .../pintu` | semua sesi; tamu: kartu publik | `{peran,kartu[]}` dari daftar statis + peringatan PDNA (indeks parsial `sk_kej_fase`, LIMIT 50) | - |
| `GET .../registri` | PD, KO, PM, SA | aliran `registri.json` | - |
| `POST .../dummy` | SA | `{aksi:isi\|hapus,halaman,periode?,kab4?}` -> `{dibuat,dihapus,per_tabel}` | 409 "sudah ada N baris hidup"; 6/jam |
| `GET .../ingest/jendela` | Bearer `PIPA_TOKEN` | `dari,sampai` (<=120 hari), `lanjut?` -> `{baris,lanjut}` kejadian ringkas (id, jenis, kab4, mulai, fase), halaman <=1000 baris, terindeks (`sk_kej_mulai`) | 401 (waktu-tetap); 120/jam |
| `GET .../ingest/sumber` | Bearer | `dari,sampai`, `lanjut?` -> `{baris,lanjut}` kolom minimal `[sumber,kode,kejadian_id,status,jenis,kab4,mulai]`, halaman <=1000, terindeks (`sk_ks_mulai`); jalur baca D1 untuk `pasang.py` dan `arsip_kejadian.py` | 401; 120/jam |
| `POST .../ingest/kejadian` | Bearer `PIPA_TOKEN` | `{keputusan:[{sumber,kode,aksi:tambah\|baru\|ambigu\|tanpa_wilayah,kejadian_id?,kandidat?,jenis,kab4?,mulai,nama,dampak,pengenal_luar?,diambil}]}` <=200 -> `{terpasang,baru,antre,duplikat}`; satu batch + jejak `sistem:ingest`; `ON CONFLICT (sumber,kode,dummy) DO NOTHING` | 400 dummy dilarang; 413 |
| `POST .../ingest/kaji` | Bearer | `{kejadian_id,model,masukan,ringkas,hasil_r2,galat_kalibrasi}` -> 201 versi baru, tidak menimpa | 404 kejadian |

`/api/instansi/siklus/*` (BP): GET kejadian, arsip, detail, `paparan/kab|fasilitas|rinci` (wilayahnya), kaji, pulih (baca dan `baris`), renkon baca, masadepan; sisanya 403.

### 4.1 `lingkupKab4(akun, kab4)`

Pembatas wilayah BP berbasis kode, bukan nama. `dalamLingkup` (`src/instansi.js`) membandingkan NAMA kabupaten, sedangkan baris Siklus berkunci kab4. `lingkupKab4` (`src/siklus_kab.js`, murni): akun `tingkat = "prov"`: `JSON.parse(akun.cakupan).includes(kab4.slice(0, 2))`; akun `tingkat = "kab"`: `kab4.slice(0, 2) === akun.prov` DAN `NAMA_KAB4[kab4].toLowerCase() === akun.kab.toLowerCase()`; kab4 tak dikenal atau `null` = di luar lingkup. `NAMA_KAB4` adalah konstanta yang dibangun sekali dari kolom `kode` dan `kab` di `scripts/udara/kota.json` ke `src/siklus_kab.js` (bukan dibaca saat jalan); `tests/warga/siklus_kab.test.mjs` membuktikan konstanta sama dengan `kota.json` dan menguji akun `kab` (kabupaten sendiri lolos, tetangga ditolak) dan `prov` (provinsi sendiri lolos, provinsi lain ditolak). Di luar lingkup = 404 seragam. Tiap rute BP memakainya pada `kab4` baris (untuk kejadian multi-kabupaten: salah satu `sk_kejadian_kab` cukup).

Halaman (HTML, `no-store`, `noindex`, CSP `halamanBnpbPublik`): jalur KA butir B. Id kejadian `KJ-...`, id lain 16 heks, salah format = 404. Tamu di `/siklus/kejadian/:id` menerima cangkang publik; halaman lain tanpa sesi = 303 `/admin/masuk?ke=`.

## 5. Kontrak berkas

### 5.1 Selubung bersama dan R2

Semua JSON `saji` berselubung `{"v":1,"jenis":"..","dibuat":"<ISO UTC>","sumber":[{"id","diambil","lisensi"}],"yakin":..,...isi}`. Angka berdiri sendiri berbentuk `{"n":<angka|null>,"y":"<label>","s":"<id sumber>","t":"<ISO|tahun>"}`; berkas besar kolumnar (`kolom` dulu, kunci di kolom pertama). `null` = tidak ada data, tidak pernah `0` pengganti. Dua sumber = dua kunci terpisah; tidak ada kunci `total`/`jumlah_gabungan` (uji skema menolaknya).

```
siklus/mentah/<sumber>/<YYYY>/<YYYY-MM-DD>.<ext>   apa adanya; harian dipangkas 90 hari; riwayat dan sumber tunggal permanen
siklus/bersih/<jenis>/<YYYY>.jsonl.gz               kunci kab4 Kemendagri; tanpa teks bebas
siklus/saji/{manifest,laporan_bersih,registri,anggaran}.json
siklus/saji/kejadian/arsip/<YYYY>/{<prov>,k<kab4>}.json
siklus/saji/paparan/<prov>.json  paparan/kab/<kab4>.json  paparan/rinci/<kab4>.json  fasilitas/<kab4>.json
siklus/saji/kaji/<KJ>.json   masa_depan/<prov>.json   masa_depan/tumbuh_<prov>.json
siklus/saji/_dummy/{paparan,masadepan}/...   berkas contoh untuk layar tanpa tabel D1 (9), selubung `"dummy":true`
```

`bangunan/*` tidak dipindah dan kontraknya tidak berubah (PRD F2-07); `saji/paparan/**` dibangkitkan dari `bangunan/grid_<prov>.json`.

### 5.2 Skema persis

**5.2.1 `kejadian/arsip/<YYYY>/<prov>.json`** (maks 4 MB; dialirkan). `{"v":1,"jenis":"kejadian_arsip","tahun":2019,"beku":true,"sha256_sumber":"..","n":1832,"kolom":["id","jenis","kab4","mulai","akhir","nama","sumber","dampak"],"baris":[["KJ-2019-7K3M9Q2A","banjir","3217","2019-02-12",null,"..",["dibi","logbook"],{"dibi":{"meninggal":{"n":2,"y":"resmi","t":"2019"}},"logbook":{"meninggal":{"n":1,"y":"terverifikasi","t":"2019"}},"selisih":{"meninggal":1}}]],"tanpa_wilayah":[[...]]}`. `selisih` = selisih mutlak dua sumber untuk kolom yang sama, hanya bila keduanya melapor. `beku:true`: tahun tidak diubah lagi; membuka ulang lewat dispatch `riwayat` mengganti `sha256_sumber`, id tetap (ADR-04). `k<kab4>.json` = baris kabupaten itu saja (kecil, dibaca Worker untuk promosi); baris `tanpa_wilayah` tidak punya `kab4` sehingga tidak ada di berkas ini dan tidak bisa dipromosikan.

**5.2.2 `paparan/<prov>.json`** (maks 6 MB). `{"v":1,"jenis":"paparan","prov":"33","terliput":true,"ambang_yakin_bangunan":0.70,"bangunan_sumber":"open-buildings-v3","kab":{"3301":{"bangunan":{"n":..,"luas_m2":..,"y":"estimasi-model"},"jiwa":{"worldpop":{"n":..,"t":"2020"},"dukcapil":{"n":..,"t":"2026"},"ghsl":{"n":..,"t":"2025"}},"desa":{"<kode>":[n_bangunan,luas_m2,jiwa_dukcapil]}}}}`. Provinsi tanpa grid: `"terliput":false,"kab":{}`, tidak pernah `n:0`. Tiga sumber jiwa berdampingan.

**5.2.3 `paparan/kab/<kab4>.json`** (maks 1 MB). `{"v":1,"jenis":"paparan_kab","kab4":"..","bahaya":{"banjir":{"kelas_batas":[0.33,0.66],"batas_sumber":"terpapar.py (sumber resmi tidak ditemukan)","kelas":{"rendah":{"bangunan":..,"luas_m2":..,"jiwa":{"worldpop":..,"dukcapil":..,"ghsl":..}},"sedang":{..},"tinggi":{..}}},"gempa":{..},"karhutla":{..},"gunungapi":{..}},"fasilitas_hitung":{"sekolah":..,"kesehatan":..,"ibadah":..,"kantor_pemerintah":..,"obvitnas":..}}`; kelas per sel (sampling InaRISK), `estimasi-model`.

**5.2.4 `paparan/rinci/<kab4>.json`** (maks 1 MB). `{"v":1,"jenis":"paparan_rinci","kab4":"..","sel_m":110,"kolom":["i","j","lat","lon","n","luas_m2","banjir","gempa","karhutla"],"baris":[..]}`. Satuan terkecil sel 110 m; koordinat bangunan satuan tidak pernah ada.

**5.2.5 `fasilitas/<kab4>.json`** (<=500 KB). `{"v":1,"jenis":"fasilitas","kab4":"..","kolom":["kategori","nama","lat","lon","sumber","y","bahaya"],"baris":[..],"hitung_tanpa_titik":{"obvitnas":..,"bandara":..,"pelabuhan":..}}`. Kategori berkoordinat hanya `sekolah, madrasah, kesehatan, ibadah, kantor_pemerintah_sipil` (KEAMANAN bagian 12). `y`: `estimasi-model` (OSM, Overture, Wikidata).

**5.2.6 `kaji/<KJ>.json`** (maks 100 KB, di-parse). `{"v":1,"jenis":"kaji","kejadian_id":"KJ-..","model":"gempa","versi":1,"status":"dihitung","yakin":"estimasi-model","masukan":{"sumber":"usgs-shakemap","id":"us6000tkt2","produk":"cont_mmi.json","waktu_data":".."},"korban":{"rentang":[b,a],"model":{"pager":[..],"itb":[..]},"y":"estimasi-model"},"rumah_rusak":{"n":null,"status":"menunggu","alasan":"kurva kerapuhan resmi tidak ditemukan"},"jiwa_terpapar":{"mmi_ge_6":{"worldpop":..,"dukcapil":..,"ghsl":..}},"galat_kalibrasi":{"kalibrasi":3.06,"faktor_loo":5.34,"n_gempa":8,"catatan":"model meleset sampai 5 kali"}}`. `rentang` selalu larik `[bawah, atas]`; gagal ambil grid = `status:"menunggu_data"`, `korban:null`.

**5.2.7 `masa_depan/<prov>.json`** (maks 2 MB). `{"v":1,"jenis":"masa_depan","prov":"..","yakin":"hipotesis","dasar":{"sumber":"historical model CMIP6 sendiri, per model","periode":"1995-2014","pembanding_bias":"chirps-v3 1995-2014"},"horizon":["2021-2040","2041-2060"],"skenario":["ssp245","ssp585"],"indeks":["rx1day","rx5day","cdd"],"kab":{"<kab4>":{"2021-2040":{"ssp245":{"rx1day":{"median":..,"p17":..,"p83":..,"n_model":..,"n_model_positif":..,"satuan":"mm","selisih_dasar":..}}}}},"muka_laut":{..},"catatan":"selisih terhadap dasar model sendiri (ALGORITMA F6.2, UA-6), rentang p17 sampai p83 antarmodel, bukan ramalan kejadian; penurunan muka tanah pesisir tidak dihitung"}`. `tumbuh_<prov>.json`: `{"kab":{"<kab4>":{"epoch":[2015,2020,2025,2030],"built_m2":[..],"di_zona":{"banjir":[..]},"model_epoch":[2025,2030]}}}`.

**5.2.8 Pengelola.** `manifest.json`: `{"v":1,"berkas":[{"kunci","byte","sha256"}],"lapis":{"mentah|bersih|saji":{"byte","maks"}},"total_byte":..,"maks_byte":4000000000}`. `laporan_bersih.json` (S1): `{"sumber":{"dibi":{"masuk":57161,"tersisa":..,"dibuang":{"tanggal_kosong":..,"tanggal_mustahil":..,"kab_tak_terpetakan":..,"duplikat":..},"dibuang_total":..},"logbook":{"masuk":56685,..}}}`. `registri.json`: per sumber `{id,status_uji,diambil,byte,galat?,lisensi}`. `anggaran.json`: lapis, fitur, `berkas_public:{n,maks:200}`.

### 5.3 Berkas kecil di `public/siklus/data/` (publik, daftar putih `layaniSk`)

`atribusi.json`: `{"v":1,"sumber":[{"id","nama","lisensi","url_lisensi","atribusi","dipakai_di"}]}` sumber yang tampil publik; dibangkitkan `saji.py --public`, di-commit saat registri berubah. `kamus.json`: label keyakinan (6 nilai, arti), fase, jenis, singkatan; satu sumber untuk layar dan uji; tulis tangan. `masa_depan_ringkas.json`: semua provinsi, selisih median per horizon, semua `y:"hipotesis"`; dibangkitkan setelah lab, di-commit manual (jadwal registri: manual/lab; `siklus.yml` tidak pernah commit).

Total `public/` baru 22 berkas (2 html, 2 css, 15 js, 3 data) dari janji 200 (KA 28); gerbang `siklus_publik` gagal bila `public/siklus/**` lebih dari 40.

## 6. Pipeline `scripts/siklus/`

Python 3.12 stdlib, dijalankan `python3 -I <skrip>`; tiap skrip punya subperintah `uji` (self-check tanpa jaringan, fixture di `tests/siklus/fixtures`). Jaringan hanya lewat `panen.py` (satu klien: UA proyek, jeda minimal 2 dtk antarpermintaan, 3 kali coba jeda 2 dtk, tanpa CAPTCHA, hormati 429 `Retry-After`). Adapter per sumber ada di `scripts/siklus/adapter_g<n>.py` dan dimuat `panen.py`; adapter G1 (DIBI harian, GDACS, GLIDE, USGS kunci silang) di `adapter_g1.py`, adapter G2 (USGS ShakeMap) dan G4 (CHIRPS, PSMSL, AR6, Overpass, Wikidata, Geofabrik) masuk di gelombangnya. Sumber gagal = peringatan dan lapis `saji` terakhir dipertahankan (ALUR bagian 1); skrip keluar non-nol hanya bila `uji` gagal atau anggaran terlampaui.

### 6.1 Skrip

| Skrip | Masukan -> keluaran | `uji` memeriksa |
| --- | --- | --- |
| `registri.py` | `sumber.json` -> validasi skema, `registri.json`, jadwal per job | tiap sumber punya pemilik, pemakai, jadwal (cermin `gerbang-peta-data`) |
| `gudang.py` | kunci R2 -> `put/get/hapus` lewat biner `wrangler@4.42.0` hasil pasang sekali (`r2 object ... --remote`) atau folder (`--lokal`); `ls` dibaca dari `manifest.json` (wrangler 4.42.0 tidak punya `r2 bulk` maupun daftar objek); `anggaran.json`; hanya mengunggah berkas yang sidiknya berubah (6.2); menolak unggah di atas anggaran | penolakan anggaran, manifest, hanya yang berubah diunggah |
| `panen.py` | id sumber -> `mentah/<sumber>/<YYYY>/<tanggal>.<ext>`; adapter per sumber | jeda, coba ulang, 429, UA (server tiruan) |
| `kunci.py` | nama/kode apa pun -> BPS 4 digit lewat `kab_kunci` dan `hvc_dasar.kab_kode`; `kab_tak_terpetakan` dihitung | tiga konvensi (`32\|Bogor`, `3201`, `32.01`), pemekaran |
| `bersih_dibi.py` | `mentah/dibi_harian/*` (57.161) + `dibi_kejadian.json` -> `bersih/dibi/<YYYY>.jsonl.gz` | tanggal kosong/mustahil dibuang dan dihitung, masuk = tersisa + dibuang |
| `bersih_logbook.py` | `logbook_kejadian.csv` (56.685, kotor) + `logbook_kejadian.json` -> `bersih/logbook/` kolom terstruktur saja, tanpa teks bebas | 644 tanggal kosong dan tahun mustahil (2030, 2103, 2923, 9202) dihitung |
| `pasang.py` | `bersih/*`, kejadian lintas bencana (`public/semua/` lewat berkas yang sudah ada), `gempa_kejadian`, `ingest/jendela` dan `ingest/sumber` (dipaginasi dengan `lanjut`) -> keputusan ke `ingest/kejadian` (`kunci_kejadian.pasangkan`, `JENIS`, ID ALG F1.2) | tiga kasus F1; kompleks karhutla ganti `K####` tetap satu `KJ-`; jalan dua kali = nol baris baru |
| `arsip_kejadian.py` | `bersih/*` -> `kejadian/arsip/*` beku, id deterministik (ADR-04), `selisih` | id stabil antarjalan, tabrakan ditangani, tanpa kunci `total` |
| `paparan.py` | `bangunan/grid_*`, `kec.json`, zona bahaya (`paparan_bangunan.py`), jiwa 3 sumber -> `paparan/*` | tanpa grid = `terliput:false`; jiwa tidak dirata-rata |
| `bahaya_kelas.py` | InaRISK ArcGIS (sampling per sel) -> kelas per sel | batas 0,33/0,66 satu konstanta dengan `terpapar.py` |
| `fasilitas.py` | `public/data/sekolah.json`, `public/data/fasilitas.json`, Geofabrik (`osmium`), Overpass, Overture places (lab), Wikidata -> `fasilitas/<kab4>.json` (adapter sumber luar memakai `panen.py`) | tiada koordinat `obvitnas`/`bandara`/`pelabuhan` |
| `kaji_gempa.py` | USGS M>=5 7 hari, `cont_mmi.json` (31 KB, bukan `grid.xml` 32,9 MB), `scripts/gempa/guncangan.py`, `scripts/gempa/pager.py`, `public/gempa/data/kalibrasi_kerusakan.json` -> `kaji/<KJ>.json` + `ingest/kaji` | us6000tkt2: rentang larik dua, rumah rusak `menunggu`, grid gagal = `menunggu_data` |
| `kaji_banjir.py` | `public/banjir/data/kejadian_aktif_geo.json`, `public/banjir/data/dampak.json`, paparan -> jam pertama (batas atas) | "kedalaman belum tersedia" |
| `saji.py` | semua `saji/` -> `manifest`, `laporan_bersih`, `registri`; `--public`: `atribusi.json`, `masa_depan_ringkas.json` | ukuran di bawah batas 5.2; kunci `total` ditolak |
| `iklim_lab.py`, `ghsl_lab.py` | NEX-GDDP, CHIRPS v3, AR6, PSMSL; GHSL BUILT-S -> `masa_depan/*` (lab, DuckDB/NetCDF) | rentang antarmodel, selisih dasar; sebelum bbox teruji = "menunggu" |
| `dummy_saji.py` | fungsi rentang dan agregat yang sama dengan produksi -> `saji/_dummy/{paparan,masadepan}/*` (berselubung `dummy:true`; tidak ikut `manifest` produksi) | selubung, ukuran, tanpa koordinat nyata |
| `unggah_riwayat.py`, `rollback.sql` | DIBI harian penuh dari mesin pemilik -> `mentah/dibi_harian/` (dijalankan pemilik); DROP `sk_*` urut terbalik di luar `migrations/`; memuat semua tabel DT 3 (empat gelombang) dengan `DROP TABLE IF EXISTS` | hash dan jumlah baris dicetak; tiap tabel di DT 3 ada di `rollback.sql` |

### 6.2 Urutan job harian

`registri uji`, `panen`, `bersih_*`, `kunci`, `pasang` (GET jendela dan sumber, hitung, POST ingest), `paparan` kejadian aktif, `saji`, `gudang put`; langkah sesudah `pasang` tetap jalan bila `pasang` gagal jaringan.

**Waktu unggah R2.** Dua keterbatasan menentukan rancangan: `wrangler@4.42.0` tidak punya `r2 bulk` maupun daftar objek, dan `npx wrangler` per objek menyalakan Node lagi tiap kali. Maka: (1) `wrangler@4.42.0` dipasang SEKALI per job (`npm i --prefix "$RUNNER_TEMP/w" wrangler@4.42.0`) dan biner hasilnya dipanggil langsung, bukan lewat `npx`; (2) `gudang.py` membaca objek `siklus/saji/manifest.json` (satu `get`), membandingkan sidik tiap berkas lokal dengan manifest, dan hanya mengunggah yang berbeda; manifest baru diunggah paling akhir, sehingga daftar objek tidak perlu dibaca dari R2; (3) unggahan paralel `xargs -P 8`. Waktu `T = ceil(N / 8) x t + t_pasang`, dengan N berkas berubah, t detik per objek (asumsi 3 detik, belum diukur; SK-007 mengukurnya sebelum angka ini dipercaya), t_pasang sekitar 40 detik:

| Kasus | N | T |
| --- | --- | --- |
| harian (paparan kejadian aktif, kaji, saji kejadian) | sekitar 100 | 13 x 3 + 40 = 79 detik |
| penuh (riwayat, bulanan): arsip 16 tahun x 552 = 8.832, paparan dan fasilitas 1.580, lain-lain | sekitar 10.500 | 1.313 x 3 + 40 = 3.979 detik, sekitar 66 menit |

Kasus penuh muat di job `riwayat` (120 menit) dan `bulanan` (300); bila t terukur lebih dari 6 detik, unggahan penuh dibagi per awalan.

### 6.3 Workflow `siklus.yml` (milik mekanik-mesin; Siklus hanya menyerahkan spesifikasi ini)

Tidak commit, tidak terbit; keluaran ke R2. Dua grup concurrency, bukan `data`: `siklus-kaji` (hanya job `kaji`, supaya hitungan tiga jam sekali tidak mengantre di belakang job panjang) dan `siklus-batch` (`harian`, `mingguan`, `bulanan`, `riwayat`, `lab`; `cancel-in-progress: false`, jadi satu job menunggu yang lain, dan bila lebih dari satu menunggu GitHub hanya menyimpan yang terbaru, jadi `harian` yang bentrok dengan `lab` dapat tertunda atau terlewat satu hari tanpa merusak data). Jadwal (UTC) menghindari cron yang ada: 00:20 banjir, 01:10 gempa, 01:50 prediksi, 02:10 lintas, 02:30 kemitraan, 06:40/18:40 udara, 08:30 bangunan, 09:10 titik, 10:25 bersih_cache, 14:20 data, 15:30/21:30 m1, 22:30 genangan, 22:55 titik, 23:40 uji-bmkg, menit 25 dan 40 tiap 3 jam:

| Job | Cron (UTC) | `timeout-minutes` | Isi |
| --- | --- | --- | --- |
| `harian` | `50 3 * * *` | 60 | 6.2 |
| `kaji` | `20 1-22/3 * * *` | 20 | `kaji_gempa.py`, `kaji_banjir.py`; tiga jam sekali cukup untuk "hitungan jam" dan murah |
| `mingguan` | `50 5 * * 0` | 120 | G1: GDACS, GLIDE, USGS kunci silang (`adapter_g1.py`), arsip PetaBencana (bila lisensi), Overpass kesehatan, Wikidata; menit dan jamnya tidak sama dengan `kaji` (`20 1-22/3`: 04:20 bentrok, 05:50 tidak) |
| `bulanan` | `40 4 5 * *` | 300 | Geofabrik PBF (1,74 GB) untuk fasilitas (job ini `pip install osmium`; pembaca PBF stdlib tidak ada), `fasilitas.py`, `bahaya_kelas.py`; G3: BPS IKK dan IHPB (var 2515, 1018); G4: CHIRPS, PSMSL |
| `riwayat` | dispatch (`mode: riwayat`) | 120 | `bersih_dibi`, `bersih_logbook`, `arsip_kejadian`; jumlah dibuang dilaporkan |
| `lab` | dispatch | 350 | `iklim_lab`, `ghsl_lab` (satu-satunya tempat `pip install duckdb`); agregat saja ke R2 |

Rahasia: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, dan `PIPA_TOKEN` (semua sudah ada di GitHub, `PIPA_TOKEN` juga di Worker); hanya `BPS_API_KEY` yang baru (G3, diisi pemilik).

### 6.4 Tahap lab

Overture bangunan (276,9 GB), places (11,9 GB), NEX-GDDP dibaca di tempat dengan DuckDB (HTTPS anonim, range request); hanya agregat per desa, sel, kabupaten disimpan (KA 29). Berjalan di mesin pemilik atau job `lab`; sebelum bbox teruji = `menunggu`.

### 6.5 Perluasan `bangunan.yml` ke 38 provinsi

Keadaan: `bulanan` memanggil `bangunan.py --semua --hapus-mentah` (278 ubin, sekitar 12,7 GB, `timeout-minutes: 350` dari batas keras 360) dan mengunggah semua `data/terkunci/bangunan/*.json`, tetapi baru provinsi 13, 33, 63 yang terverifikasi; 35 lain BELUM. Langkah: (1) dispatch `bulanan` sekali sebagai pengukuran (lama, ukuran cache, daftar `grid_*.json`), tiket pertama F2 (mekanik-mesin); (2) bila lebih dari 330 menit atau disk (sekitar 14 GB) habis, bagi per pulau dengan bendera `--prov` di `bangunan.py` (tiket ke `pipa-umum`; Siklus tidak menyunting); (3) cache GitHub 10 GB per repo: hanya `grid_*.json` dan `kec.json` di-cache, `hasil` per ubin boleh hilang; (4) ukuran R2: `halus_33.json` 19,7 MB, 38 provinsi diperkirakan 150-300 MB di `bangunan/` (asumsi, diukur di langkah 1), `halus_*` hanya dibaca `paparan.py`; (5) provinsi gagal tetap `terliput:false` dan harian tidak merah.

## 7. Halaman, aset berkunci, dan `run_worker_first`

**7.1** `wrangler.jsonc` kini `["/*.html", "/logpal/*"]`; ditambah `"/siklus/*"` (pola LogPal, 9 Nov) supaya JS, CSS, JSON staf tidak terbuka tanpa sesi. Aset `private, max-age=600`. Daftar putih tanpa sesi di `layaniSk`: cangkang publik, `publik.js` (mandiri, tidak memuat `inti.js`), `publik.css`, `data/{atribusi,kamus,masa_depan_ringkas}.json`.

**7.2** `index.html` (staf) dilayani lewat `env.ASSETS.fetch` setelah sesi staf/instansi sah, CSP `halamanBnpbPublik(... {pribadi:true})`. `publik.html` dilayani untuk `GET /siklus/kejadian/:id` tanpa sesi dan memanggil `/api/siklus/publik/kejadian/:id`. Di `centurisk97.id` (default tertutup, `halamanTerkunci`) jalur itu dikecualikan oleh `layaniSk` dan dicatat di `PUBLIK_TANPA_SESI` dengan alasan (U3 bawaan). U2: tanpa tautan menu.

## 8. Anggaran

**R2** (bucket `poskokarhutla-foto`; Free 10 GB, 1 juta operasi Kelas A dan 10 juta Kelas B per bulan; pemakaian foto BELUM diukur, tiket pertama G0 menjalankan `wrangler r2 bucket info`):

| Lapis | Maks | Isi | Pangkas |
| --- | --- | --- | --- |
| `siklus/mentah/` | 1,5 GB | DIBI 8,4 MB, logbook CSV, cuplikan sumber; USGS hanya `cont_mmi.json` | harian 90 hari |
| `siklus/bersih/` | 0,5 GB | jsonl.gz | tahun beku tetap |
| `siklus/saji/` | 1,5 GB | arsip 16 tahun x (38 + 514 berkas), paparan 514 x <1 MB, fasilitas, kaji, iklim | batas per berkas 5.2 |
| jumlah `siklus/` (+0,5 GB cadangan) | 4 GB | batas KA 27 | `gudang.py` menolak lewat |
| `bangunan/` | 1 GB (perkiraan) | 38 provinsi | diukur di 6.5 |

**D1** (Free 5 juta baca dan 100 ribu tulis per hari seluruh situs; insiden 28 Okt): jatah Siklus 10 persen = 500.000 baca, 10.000 tulis. Dasar: satu muat halaman kejadian = 5 kueri x <200 baris (200 muat = 200.000 baca); tulis harian = <100 kejadian x 8 baris (baris, indeks, jejak) + <500 isian staf. Gerbang `siklus_rencana_kueri` menjalankan `EXPLAIN QUERY PLAN` tiap kueri `sk_*` dan gagal pada `SCAN` selain tabel kecil terdaftar. Riwayat 57 ribu baris TIDAK ditulis ke D1 (ADR-04). **Berkas aset**: 12.100 sekarang, batas 20.000; tambahan 21 (gerbang 40, janji KA 28 paling banyak 200). **Worker**: aset staf sekitar 20 permintaan per muat, jauh di bawah 100.000 per hari. **Actions**: repo publik; 6 jam per job, sekitar 14 GB disk, 10 GB cache.

## 9. Dummy (DUMMY.md)

Dua ikon di tiap halaman Siklus, Super Admin saja: isi dummy untuk HALAMAN yang dibuka, hapus SEMUA dummy. Satu rute `POST /api/siklus/dummy {aksi, halaman, periode, kab4}`; isi ditentukan `halaman`.

1. **Periode terpampang**: layar mendaftarkan periode dan `kab4` ke `window.SK.periode`; dummy dibuat di sana, bukan hari ini.
2. **"Sudah ada"** = baris `dummy = 1` hidup per halaman dan periode, bukan jejak.
3. **Rantai nyata**: Jitupasna dummy memakai `sk_harga` dummy dan `siklus_hitung.js` yang sama dengan produksi; kaji dummy memakai fungsi rentang yang sama pada MMI contoh; paparan "kejadian ini" dihitung dari grid R2 nyata untuk `kab4` terpilih.
4. **Tiap ember terisi**: kejadian 7 fase, kaji 5 status, Jitupasna 5, R3P 6, kegiatan 4, renkon 6 plus satu kedaluwarsa, gladi 5 status x 3 jenis; satu sumber `ambigu`, satu `tanpa_wilayah`, dua sumber dengan selisih.
5. **Semua fitur ikut**: halaman kejadian mengisi rantai F1 sampai F4 yang saling tertaut; halaman renkon mengisi renkon dan gladi. **Muat ulang penuh** sesudahnya.
6. **Layar tanpa tabel D1** (paparan F2, masa depan F6, registri): tidak ada baris untuk disemai. `dummy_saji.py` membuat berkas contoh di R2 `siklus/saji/_dummy/` (dibuat sekali, di luar `manifest` produksi). Saat SA menekan isi, rute `dummy` memeriksa berkasnya ada dan layar menyalakan mode contoh; pembacaan memakai `contoh=1` (hanya SA, dilayani dari `_dummy/`, tidak pernah mencampur data nyata). Hapus mematikan mode itu.

Pengamanan: dummy tidak ikut `ingest/jendela`, ringkasan publik, atau R2; `ingest/kejadian` menolaknya; `hapus` menghapus anak sebelum induk dalam satu batch. Uji `siklus_dummy.test.mjs`: ember terisi, hapus mengosongkan, staf nyata tidak melihat, bukan-SA 403.

## 10. Uji

`uji:siklus` (milik mekanik-mesin, ikut `npm run uji`): `python3 -I scripts/siklus/<skrip>.py uji` untuk `registri`, `gudang`, `panen`, `kunci`, `bersih_dibi`, `bersih_logbook`, `unggah_riwayat`, `adapter_g1`, `pasang`, `arsip_kejadian`, `bahaya_kelas`, `paparan`, `fasilitas`, `dummy_saji`, `kaji_gempa`, `adapter_g2`, `kaji_banjir`, `ujibalik`, `bps`, `adapter_g4`, `iklim_lab`, `ghsl_lab`, `saji`, lalu `node --test --test-concurrency=1 tests/siklus/*.test.mjs tests/warga/siklus_*.test.mjs`.

| Logika di | Diuji dengan (TEST.md) |
| --- | --- |
| fungsi murni (`siklus_hitung.js`, `hitung.js`, `kunci.py`, `pasang.py`) | unit biasa; paritas JS/Py dengan `fixtures/acuan.json` |
| CHECK, trigger, unik `sk_*` | `siklus_skema.test.mjs`: migrasi apa adanya di Miniflare, nilai salah DITOLAK per CHECK dan trigger, migrasi dua kali |
| rute, penjaga peran | `siklus_*.test.mjs` memanggil `worker.js` utuh (`siapkan`), tanpa mock D1; satu uji "peran salah ditolak" per baris matriks KEAMANAN |
| alur lintas tabel | satu uji ujung ke ujung: ingest, kejadian, fase `tanggap`, Jitupasna, baris, hitung, `final`, R3P, `setuju` PM, `ditetapkan_resmi`, kegiatan terhubung `pemulihan` |
| aset berkunci | tanpa sesi `/siklus/*.js` ditolak; daftar putih publik terbuka |
| registri dan anggaran | `gerbang-registri`: sumber berpemilik, jadwal, pemakai; berkas `public/siklus` <=40; tiada kunci `total` di fixture `saji` |
| layar | peramban pratinjau 1440/390 dengan dummy; handler klik tanpa muat berkas besar sinkron (INP) |

## 11. Migrasi, penerapan, dan rollback

**Penomoran.** Nomor terakhir di pohon kerja `0119_meja_dampak.sql` (belum ter-commit, sesi lain). Siklus mengambil nomor kosong berikutnya SAAT TIKET (`ls migrations | sort | tail`), tidak pernah nomor yang tertulis di dokumen; tabel di bawah hanya urutan. `ON CONFLICT DO NOTHING`, bukan `INSERT OR IGNORE`.

| Gelombang | Berkas | Isi | Syarat |
| --- | --- | --- | --- |
| G1 | `<n>_sk_kejadian.sql` | kejadian, kab, alias, sumber, jejak, trigger fase | 0118/0119 diterapkan lebih dulu atau bersama |
| G2 | `<n>_sk_kaji.sql` | `sk_kaji` | G1 |
| G3 | `<n>_sk_pulih.sql` | harga, Jitupasna, baris, R3P, kegiatan, trigger | G1; cocokkan Perban 5/2017 Pasal 8(2) |
| G4 | `<n>_sk_renkon.sql` | renkon, gladi | G1, G3 |

**Urutan tiap gelombang.** (1) `uji:siklus` dan `uji:warga` hijau; (2) `migrasi-idempoten` dan `guard-api`; (3) sha256 ke `migrasi_beku.json`; (4) pemilik menerapkan `wrangler d1 migrations apply poskowarga --remote`; (5) deploy Worker (sebelum langkah 4 rute 503); (6) aktifkan `siklus.yml`; (7) ingest pertama `dry-run`. Tiket tidak menyentuh produksi.

**Rollback.** (1) nonaktifkan `siklus.yml`; `layaniSk` menjawab 503 bila `env.SIKLUS_MATI === "1"` (variabel, tanpa deploy kode); (2) ekspor baris nyata `wrangler d1 export poskowarga --remote --table <sk_*>` ke luar repo; (3) buang `"/siklus/*"` dari `run_worker_first`, hapus `public/siklus/**`; (4) hapus dummy, lalu `scripts/siklus/rollback.sql` (di luar `migrations/`); (5) `gudang.py hapus --awalan siklus/` (bukan `bangunan/`). Kontrak lama (`/api/bangunan/*`, `terpapar.json`, `_awal.json`, `/semua`) dan tabel sesi lain tidak disentuh.

## 12. ADR

**ADR-01. Worker tidak membaca Parquet.** GeoParquet 276,9 GB dan NetCDF tidak muat 10 ms CPU. Python/DuckDB mengolah di luar, JSON per bagian ke `saji/`; Worker menyalurkan atau mem-parse <128 KB. Ubah bentuk berkas = naikkan `v`.

**ADR-02. Agregat di R2** (insiden kuota 28 Okt, jatah tulis 100 ribu per hari); arsip disaring di peramban per provinsi dan tahun.

**ADR-03. Tabel `sk_*`, penaut teks.** CHECK `meja` tidak bisa di-ALTER (dibangun ulang 0110/0118/0119) dan `data` 6.000 huruf tak muat ratusan rumah. FK hanya antar `sk_*`; penaut ke modul lain teks (pola `pemulihan.kejadian_id`), keberadaannya diperiksa saat menulis.

**ADR-04. ID `KJ-` dan arsip deterministik di R2.** `K####` diberi ulang tiap hari (`scripts/data/harian.py:658`); 57.161 DIBI + 56.685 logbook lewat D1 sekitar 400 ribu tulis (empat hari jatah seluruh situs) untuk data yang tidak berubah. `KJ-<tahun>-<8 Crockford base32>` dari SHA-256 kunci pendiri (ALG F1.2), satu skema untuk semua; tabrakan: hash ulang `kunci|n`. Tidak ada pembeda ID arsip dan ID hidup: rute mencari D1 dulu, lalu R2 (bila `tahun` dan `kab4` diberikan). Hidup (365 hari terakhir dan yang dipromosikan) di D1; arsip di R2, beku per tahun. Promosi (`{tahun,kab4}`) menyalin satu baris dengan id sama saat staf pertama bertindak; baris tanpa wilayah tidak bisa dipromosikan. Gladi hanya untuk kejadian yang sudah di D1 (FK nyata di `sk_gladi`). S1 terpenuhi, sebagian di R2; KA 27c menang atas PRD F1-01 (13).

**ADR-05. BP lewat `/api/instansi/siklus/*`.** Cookie instansi berpath `/api/instansi`; pola LogPal (`aktor()`), handler sama, matriks diuji di dua awalan.

**ADR-06. Pipeline ke D1 = rute Bearer `PIPA_TOKEN`** (token yang sudah ada, pola `src/pipa.js`; Actions tanpa kredensial D1; risiko token bersama dibatasi karena rute ingest Siklus hanya `/api/siklus/ingest/*`, dibatasi laju dan ukuran batch). Batch <=200, idempoten lewat `UNIQUE (sumber, kode, dummy)`; `pasangkan` tetap di Python, Worker mengeksekusi keputusan.

**ADR-07. Satu cabang `layaniSk`** (meniru `layaniKm`), bukan 60 entri `RUTE`; SQL tetap di `src/hak.js` (2.3); cakupan tabel di `tests/warga/cakupan.json`, rute di `tests/siklus/cakupan.json`.

**ADR-08. Rumus di ALGORITMA, bentuk berkas di sini**; bila bertentangan ALGORITMA menang untuk rumus, DT untuk bentuk.

**ADR-09. `kedaluwarsa` turunan saat dibaca**: tanpa tulis pada GET dan tanpa cron pindai; `status` tidak menampung `kedaluwarsa` (ALUR 2.5).

## 13. Konflik dan pertanyaan untuk pemilik

1. Brief menyebut 0119 kosong, tetapi `0119_meja_dampak.sql` sudah ada di pohon kerja (belum ter-commit); Siklus mengambil nomor kosong berikutnya saat tiket.
2. ADR-04 mengikuti KA 27c (arsip lama di R2 demi jatah tulis D1), menyimpang dari PRD F1-01 versi lama (sudah diselaraskan).
3. Satu-satunya rahasia baru adalah `BPS_API_KEY` (G3, diisi pemilik); `PIPA_TOKEN` dipakai ulang.
4. `scripts/umum/bangunan.py` milik `pipa-umum`; pemakaian bucket foto belum diukur, angka R2 (8) perkiraan.
5. Lima sektor R3P (3.3) menunggu teks Perban 5/2017 Pasal 8(2); U10, U12, U14, U21 tetap terbuka.
6. Akses `sk_*` wajib lewat `src/hak.js` (2.3); tidak ada pengecualian `d1-sisa.json`.
