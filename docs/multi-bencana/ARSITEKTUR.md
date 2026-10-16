# Arsitektur multi-bencana

Kondisi per 15 Okt 2026 dipetakan dari kode nyata. Tiap klaim menyebut berkasnya supaya bisa dicek
ulang sebelum dikerjakan.

## 1. Kondisi sekarang

### 1.1 Yang sudah ada

| Modul | Rute | Data | Pipeline | Kondisi |
| --- | --- | --- | --- | --- |
| Karhutla (+ asap) | `/` + 13 tab URL bersih (`/peta`, `/insight`, `/k/K0001`, `/sim/K0001`, ...) | `public/data/` | `scripts/data`, `scripts/scrape`, `scripts/sebaran`, `scripts/geo`; workflow `titik.yml` (3 jam), `data.yml` (harian), `statis.yml` (bulanan) | Lengkap. Rujukan semua bencana lain |
| Banjir + longsor + rob | `/banjir/` dengan tab berbasis hash (`#peta`) | `public/banjir/data/` | `scripts/banjir/*` (13 skrip); workflow `banjir.yml` harian 07.20 WIB | Lengkap untuk inti hidrometeorologi, tetapi **tidak ditautkan** dari menu karhutla dan /tentang (masih "Coming Soon") |
| Gempa & tsunami, cuaca ekstrem, gunung api | — | — | — | Hanya entri menu "Coming Soon" di `public/index.html` (~baris 1475), foto `public/img/bencana-*.jpg` di `public/tentang.html` |

### 1.2 Utang yang harus dibayar sebelum bencana ketiga

Prinsip pemilik (`~/.claude/FITUR.md` §0): rumah bersama dibuat sebelum pemakai kedua lahir.
Pemakai kedua (banjir) sudah lahir tanpa rumah bersama. Akibatnya sekarang:

1. **Menu bencana (`details.bencana`) ditulis tangan di 3 HTML (`index.html`, `banjir/index.html`, `tentang.html`) dan isinya sudah tidak sama.** Karhutla menandai
   banjir "Coming Soon"; banjir menandai dirinya aktif; `/tentang` menulis banjir "Segera".
2. **±60 fungsi tingkat atas kembar** di `public/index.html` dan `public/banjir/index.html`
   (`esc`, `fmt`, `muatJSON`, `toast`, `jamWIB`, `namaProv`, `DASAR`, `km`, `Insight`, `Peta`,
   `Posko`, `Sarana`, `Tren`, `TABS`, `bukaTab`, `renderLegenda`, ...), sebagian sudah menyimpang isinya.
3. **`scripts/banjir/wilayah.py` identik byte demi byte** dengan `scripts/data/wilayah.py`.
   `scripts/banjir/umum.py` adalah versi sendiri; pipeline karhutla tidak punya modul umum.
4. **Enum bahaya diulang** di `public/informasi_jenis.js`, CHECK `migrations/0001_warga.sql`,
   CHECK `stat_hari.hal` (0006), `HAL` di `src/statistik.js`, `TAB` di `public/statistik_publik.js`.
   Hanya pasangan katalog JS vs CHECK laporan yang dijaga uji (`tests/warga/skema.test.mjs`).
5. **Foto lapangan hanya kenal kategori karhutla** (`foto.kategori IN ('api','asap','padam','dampak','lainnya')`, migrasi 0007).
6. **Lapor Warga karhutla bergantung pada data banjir** (`muatKec()` di `public/informasi.js`
   mengambil `banjir/data/pusat_kec.json`), dan `peringatan.json` dibuat pipeline banjir lalu
   disalin ke `public/data/` untuk karhutla.
7. **Bug tampilan di `/tentang`**: ikon kartu bencana bergeser satu posisi (karhutla memakai ikon
   tetes air, banjir memakai seismograf, dst.) dan banjir masih bertulis "Segera".
8. **Rujukan dokumen yang tidak ada**: komentar kode menyebut `CITRA.md`, `DATABARU.md`,
   `LAPISAN5.md`, `OPERASI.md`, `PREVENTIF.md`, `RINGKASAN.md`, `KONSESI.md`, `splice_preventif.py`.

Semua butir ini dibereskan di [`FASE-0.md`](FASE-0.md).

## 2. Prinsip

1. **Tiru perilaku, bukan kode.** Yang ditiru dari karhutla adalah pengalaman pengguna, kejujuran
   angka, dan disiplin gerbangnya. Kode yang bisa dipakai bersama dipindah ke inti; kode yang khas
   domain ditulis ulang untuk domainnya.
2. **Satu tempat untuk tiap fakta.** Daftar bencana, nama provinsi, format angka, ambang status,
   dan warna tiap tingkat masing-masing tinggal di satu berkas.
3. **Strangler, bukan big bang.** Karhutla adalah produk hidup dengan pengunjung. Fungsi dipindah ke
   inti satu per satu, tiap pemindahan diuji tampilan sebelum dan sesudah. Tidak ada minggu tanpa
   situs yang berjalan.
4. **Status hanya dari data dan aturan yang sudah diuji balik.** Tidak ada tingkat "Siaga" yang
   tidak bisa dijelaskan oleh rumus di Metode dan dibuktikan oleh uji balik.
5. **Status resmi lembaga ditampilkan apa adanya.** Untuk gempa (BMKG), tsunami (InaTEWS), gunung
   api (PVMBG), dan cuaca (BMKG), status resmi selalu tampil lebih dulu dan diberi label lembaganya.
   Indeks buatan Pantau Bencana hanya pelengkap, diberi nama berbeda, dan tidak pernah menimpa
   status resmi.
6. **Fitur yang tidak jalan disembunyikan, bukan diberi "Coming Soon"** (`~/.claude/WEBSITE.md` §2).
   Bencana yang belum lolos rilis tidak muncul di menu publik; tersedia di `/<id>/` untuk uji.
7. **Gagal terlihat.** Langkah opsional boleh gagal dengan data lama, tetapi `/api/status` menjadi
   503 dan CI merah bila data kunci basi.

## 3. Registry bencana

### 3.1 Berkas

`public/bencana.json` adalah sumber tunggal. Dibaca oleh:

| Pembaca | Cara | Untuk |
| --- | --- | --- |
| Layar (`public/inti/kepala.js`) | `fetch` sekali, cache `sessionStorage` | Menu bencana, warna, ikon, judul tab |
| Worker (`src/worker.js`) | `import B from "./bencana.generated.js"` (modul `export default {...}` yang dibangkitkan `scripts/umum/bencana.py js` dari JSON). Bukan impor JSON langsung: uji `tests/warga/*.mjs` mengimpor `src/worker.js` di Node tanpa bundler (butuh `with {type:"json"}`), dan deploy CI memakai `wrangler@3` (`terbit.yml`) yang esbuild-nya mungkin menolak sintaks itu | `HTML_RUTE`, regex tab, `SUMBER_STATUS`, OG, statistik |
| Pipeline (`scripts/umum/bencana.py`) | `json.load` | Folder keluaran, nama berkas meta, ambang kesegaran |
| Workflow | `python3 scripts/umum/bencana.py daftar` | Matriks job |
| Uji (`tests/agen/gerbang-bencana.test.mjs`) | `readFileSync` | Gerbang konsistensi (lihat §3.3) |

### 3.2 Skema

```json
{
  "versi": 1,
  "bencana": [
    {
      "id": "gempa",
      "nama": "Gempa Bumi & Tsunami",
      "nama_en": "Earthquake & Tsunami",
      "ikon": "gempa",
      "warna": "#7a4fd0",
      "rute": "/gempa/",
      "data": "/gempa/data/",
      "status": "uji",
      "tab": ["ringkasan", "peta", "insight", "berita", "tren", "kejadian", "posko", "dampak", "metode", "sim", "informasi", "foto"],
      "tab_sembunyi": ["ringkasan", "posko", "informasi", "kejadian", "metode"],
      "sumber_status": [["gempa_terbaru", "/api/gempa/terbaru", 0.5], ["meta", "/gempa/data/meta.json", 30]],
      "warisan": false,
      "kejadian": {"awalan": "G", "nama": "Gempa", "nama_jamak": "Gempa"},
      "tingkat": [
        {"kode": 0, "nama": "Normal",  "warna": "#9aa4b2"},
        {"kode": 1, "nama": "Waspada", "warna": "#e0b400"},
        {"kode": 2, "nama": "Siaga",   "warna": "#e8743b"},
        {"kode": 3, "nama": "Awas",    "warna": "#d64545"}
      ],
      "foto_kategori": [["guncangan", "Kerusakan bangunan"], ["retakan", "Retakan tanah"], ["pengungsian", "Pengungsian"], ["tsunami", "Genangan tsunami"], ["lainnya", "Lainnya"]],
      "lapor_bahaya": ["gempa", "tsunami"],
      "cron_worker": [{"tugas": "gempa_bmkg", "selang_detik": 60}, {"tugas": "gempa_usgs", "selang_detik": 300}],
      "workflow": "gempa.yml",
      "pengerja": "gempa"
    }
  ]
}
```

Arti `status`:

| Nilai | Menu publik | Rute hidup | Diindeks mesin pencari | Dipakai saat |
| --- | --- | --- | --- | --- |
| `aktif` | tampil | ya | ya | Lolos daftar rilis ALUR tahap 12 |
| `uji` | tidak tampil | ya, dengan pita "versi uji" | `noindex` (disuntik `terapkanOg` di `src/worker.js` sebagai `<meta name="robots" content="noindex">` dari registry) | Sedang dibangun |
| `mati` | tidak tampil | 404 | tidak | Dibekukan |

Karhutla dicatat dengan `"rute": "/"`, `"data": "/data/"`, `"status": "aktif"`, `"warisan": true`.
Banjir dicatat dengan `"rute": "/banjir/"`, `"warisan": true`, dan status menunggu keputusan pemilik
(butir 6 di akhir dokumen): `aktif` langsung (sudah publik, hanya belum ada di menu) atau `uji`
(menambah pita dan `noindex` ke halaman yang sekarang terindeks, regresi yang disengaja).
`warisan: true` membebaskan bencana dari gerbang butir 7 sampai FASE-0 tahap E selesai; setelah itu
bendera dihapus dan gerbang berlaku penuh.

### 3.3 Gerbang registry (`tests/agen/gerbang-bencana.test.mjs`)

Uji ini gagal bila:

1. Ada `id` ganda, atau `rute`/`data` yang tidak ada di `public/`.
2. Ada HTML di `public/**` yang memuat `details.bencana` ditulis tangan (menu wajib dirender dari registry).
3. Daftar `lapor_bahaya` semua bencana tidak sama dengan isi tabel rujukan `bahaya` di migrasi D1.
4. `foto_kategori` tidak sama dengan tabel rujukan `foto_kategori` di D1.
5. `src/statistik.js` atau `public/statistik_publik.js` menulis daftar halaman sendiri, bukan dari registry.
6. Bencana `aktif` (bukan `warisan`) tidak punya: workflow yang disebut, pengerja di `scripts/agents/roster.json`,
   berkas `docs/multi-bencana/bencana/<id>.md`, entri `SUMBER_STATUS`, dan halaman Metode.
7. Bencana `aktif` (bukan `warisan`) masih punya baris "belum" di daftar periksa `docs/multi-bencana/bencana/<id>.md`.
8. `src/bencana.generated.js` tidak sama dengan `public/bencana.json` (lihat §3.1).

## 4. Rute dan halaman

| Pola | Isi | Catatan |
| --- | --- | --- |
| `/` dan 13 tab karhutla | Karhutla | Tetap; tautan lama, OG, dan SEO tidak berubah |
| `/karhutla/`, `/karhutla/<tab>` | Alih 301 ke `/`, `/<tab>` | Supaya pola URL seragam di menu |
| `/<id>/` | Tab default bencana itu (Peta) | Dari registry |
| `/<id>/<tab>` | Tab | Regex tab dibangun dari `tab` registry, bukan ditulis tangan seperti `HALAMAN` sekarang |
| `/<id>/k/<KODE>` | Laci kejadian (padanan `/k/K0001`) | Awalan kode dari `kejadian.awalan` (G0001 gempa, V263250 gunung api = nomor GVP, C0001 cuaca, D0001 kekeringan, U0001 udara) |
| `/<id>/sim/<KODE>` | Simulasi kejadian | Hanya bencana yang punya simulasi |
| `/semua` | Beranda semua bencana | Urutan 7, setelah minimal 4 modul aktif |
| `/banjir/#tab` | Alih ke `/banjir/<tab>` di klien | Tautan lama banjir tetap hidup |

`src/worker.js` membangun `HTML_RUTE` dari registry saat modul dimuat:

```js
import B from "./bencana.generated.js";
/* rute dinormalkan tanpa garis miring akhir supaya "/gempa" dan "/gempa/" sama-sama cocok;
   entri tanpa `kejadian` (mis. banjir di tahap A) hanya mencocokkan tab, tidak melempar TypeError */
const RUTE_BENCANA = B.bencana.filter(b => b.status !== "mati" && b.rute !== "/").map(b => {
  const r = b.rute.replace(/\/$/, ""), aw = b.kejadian?.awalan;
  const kej = aw ? `|/k/${aw}\\d+|/sim/${aw}\\d+` : "";
  return [new RegExp(`^${r}(?:/(?:${b.tab.join("|")})${kej})?/?$`), `${r}/index.html`, null];
});
```

Uji wajib: `/gempa`, `/gempa/`, `/gempa/peta`, `/gempa/k/G0001` → 200; `/gempa/x` → 404;
`/gempa/data/meta.json` jatuh ke aset statis.

## 5. Data dan pipeline

### 5.1 Tata letak

```
public/
  bencana.json                  registry (§3)
  geo/                          batas BIG bersama (tetap)
  data/                         karhutla (tetap) + data/umum/ untuk data lintas bencana
  data/umum/peringatan.json     peringatan BMKG (pindah dari salinan banjir → karhutla)
  data/umum/pusat_kec.json      titik berat kecamatan (pindah dari banjir/data)
  data/umum/inarisk_kec.json    indeks InaRISK semua bahaya per kecamatan (pindah dari banjir/bahaya.py)
  data/umum/kejadian_dibi.json  riwayat kejadian BNPB/DIBI semua jenis (pindah dari banjir/kejadian.py)
  <id>/index.html               halaman bencana
  <id>/data/                    keluaran pipeline bencana itu
  <id>/*.js|css                 modul layar khas bencana itu
  inti/                         modul layar bersama (§7)
scripts/
  umum/                         pustaka pipeline bersama (§5.2)
  <id>/                         pipeline khas bencana itu
```

### 5.2 `scripts/umum/` (pustaka bersama, Python 3.12 stdlib)

| Modul | Isi | Asal |
| --- | --- | --- |
| `jaring.py` | `ambil(url, ulang=3, jeda, ua)`, `ambil_json`, `ambil_csv`, batas laju per host, cache berkas mentah opsional | Gabungan `scripts/banjir/umum.py` dan pola `harian.py` |
| `simpan.py` | `simpan_json(path, obj)` dengan `"dibuat"` selalu kunci pertama (syarat `/api/status`), format tabel `{kolom, baris}`, pembulatan angka per kolom | Pola semua skrip |
| `waktu.py` | WIB/WITA/WIT, `hari_wib`, dasarian, musim | `umum.py` banjir |
| `wilayah.py` | `PROVINSI`, `Wilayah`, `Poligon`, pencarian kecamatan dari lat/lon, grid darat 0,25° | Satukan dua salinan identik; `PRIORITAS` karhutla pindah ke `scripts/data/` |
| `bencana.py` | Baca registry, `folder_data(id)`, subperintah `daftar` untuk matriks workflow | Baru |
| `uji.py` | Kerangka self-check: `@kasus`, `jalankan()`, cek invarian berkas keluaran (kunci wajib, rentang nilai, jumlah baris minimum) | Baru, dari pola `uji` tiap skrip |
| `status.py` | Penulis status 4 tingkat per kecamatan/kab/prov dengan format seragam, `naik_saja()` (cuaca hanya boleh menaikkan) | Generalisasi `scripts/data/aturan.py` + `scripts/banjir/status.py` |
| `riwayat.py` | Indeks risiko riwayat 0–100 (50% kekerapan, 30% besaran, 20% tren), kalender musim per dasarian, permukaan kekerapan 0,1° | Generalisasi `skorRiwayat` + `scripts/banjir/riwayat.py` |
| `posko.py` | Greedy maximum coverage berbobot, tiga tingkat (lapangan/kab/prov), kandidat desa OSM | Generalisasi `scripts/data/posko.py` + `scripts/banjir/posko.py` |
| `ujibalik.py` | POD, FAR, CSI, PSS, ETS, bootstrap blok, pembagian latih/validasi/uji per tahun | Dari `scripts/banjir/uji_balik.py` |
| `prospektif.py` | Catatan prakiraan append-only dan penilaian setelah horizon lewat | Dari `scripts/sebaran/prospektif.py` |
| `berita.py` | Inti Google News RSS, geocoding wilayah, sentimen dua dimensi, arsip bergulir; kueri dan topik per bencana disuntik | Dari `scripts/data/berita.py` (2.038 baris) |
| `penduduk.py` | Paparan penduduk dalam poligon/radius | Dari `scripts/data/penduduk.py` |
| `inarisk.py` | Indeks InaRISK per kecamatan untuk lapisan apa pun | Dari `scripts/banjir/bahaya.py` + `scripts/data/bnpb_gis.py` |
| `dibi.py` | Riwayat kejadian DIBI/BNPB semua jenis | Dari `scripts/banjir/kejadian.py` |
| `og.py` | Render OG PNG per rute dari registry | Dari `scripts/og/buat.py` |

### 5.3 Workflow

1. **Satu workflow dapat dipanggil**: `.github/workflows/_pipa.yml` (`on: workflow_call`) dengan
   input `id`, `langkah` (daftar perintah), `kunci_cache`, `menit_batas`. Isinya meniru `data.yml`:
   checkout, pulihkan cache semua bencana (supaya situs terbit utuh), jalankan blok "Uji aturan"
   (`python3 scripts/<id>/*.py uji`), jalankan langkah, `versi.py`, deploy atau commit, cek
   `/api/status` tiga kali.
2. **Satu workflow pemanggil per bencana** (`gempa.yml`, `gunungapi.yml`, ...) yang hanya berisi
   jadwal dan daftar langkah.
   - **Concurrency per bencana**, bukan satu grup `data` bersama: GitHub hanya menyimpan SATU run
     tertunda per grup dan membatalkan sisanya, sedangkan `data.yml` bisa makan 90 menit. Dengan
     tujuh workflow lebih di satu grup, run akan hilang diam-diam.
   - Pipeline memakai grup `data-<id>`. Langkah deploy dipisah jadi job sendiri dengan grup `deploy`
     dan `cancel-in-progress: false`.
   - `concurrency` hanya ditulis di workflow pemanggil, tidak di `_pipa.yml` (supaya tidak bentrok).
   - Karena data olahan dibawa lewat cache Actions (tidak di-commit), job deploy wajib memeriksa
     bahwa berkas kunci SEMUA modul aktif ada sebelum menerbitkan; bila cache satu modul terusir,
     deploy berhenti merah alih-alih menerbitkan situs tanpa data modul itu.
3. **Jadwal digeser** supaya tidak menumpuk dengan `titik.yml` (`:40` tiap 3 jam), `data.yml`
   (14.20 UTC), `banjir.yml` (00.20 UTC).
4. **Cache per bencana**: `<id>-` untuk `public/<id>/data` dan arsip mentahnya.

### 5.4 Dua kecepatan data

| Jalur | Untuk | Mekanisme | Contoh karhutla |
| --- | --- | --- | --- |
| Lambat (harian/3 jam) | Indeks, prakiraan, riwayat, posko, dampak, berita | GitHub Actions → `public/<id>/data/*.json` | `data.yml`, `titik.yml` |
| Cepat (≤ 1–5 menit) | Gempa baru, peringatan tsunami, VONA/level gunung api, peringatan dini cuaca | Cron Worker → D1 `kejadian_langsung` → `GET /api/<id>/terbaru` (cache tepi 30–60 s) → layar menimpa data harian | `/api/titik` + `titik_live.js` |

Cron Worker: jangan menambah satu cron per bencana. Pakai satu pengatur `* * * * *` di
`src/jadwal.js` dengan aturan **jatuh tempo**, bukan modulo menit jam dinding (cron Cloudflare tidak
dijamin tepat waktu, dan satu menit terlewat berarti tugas 5 menit/30 menit hilang):

- Tabel D1 `jadwal_tugas(tugas PRIMARY KEY, terakhir_jalan, terakhir_ok, galat)`.
- Tugas jalan bila `ev.scheduledTime − terakhir_jalan ≥ selang_detik` (dari registry `cron_worker`).
- Tiap tugas dibungkus try/catch, dibatasi waktu, dan dicatat; satu tugas gagal tidak menghentikan
  yang lain.
- Anggaran per invokasi: batas subrequest (50 di paket gratis, 1.000 di berbayar) dan CPU (10 ms
  gratis). Paket Cloudflare yang dipakai **wajib dicatat** di registry (`"paket": "gratis|berbayar"`)
  sebelum tugas gempa ditambahkan, karena satu tick gempa saja = 3 fetch BMKG + tulis D1.
- 1.440 invokasi/hari menambah log observability (`wrangler.jsonc`); sampling log diturunkan.
- Hemat panggilan ke sumber: `If-None-Match`/`If-Modified-Since` (ETag), polling 1 menit hanya
  untuk berkas yang paling cepat berubah (`autogempa.json`), sisanya 5 menit.
- **Dua cron lama tetap hidup** sampai pengatur terbukti di produksi. Keduanya sekarang dibedakan
  lewat `ev.cron === CRON_TITIK` (`src/worker.js` ~baris 482), dan `tests/agen/gerbang-wrangler.test.mjs`
  mencocokkan konstanta `CRON_*` dengan `wrangler.jsonc`. Gerbang itu diperbarui di langkah yang sama.

## 6. Worker dan D1

### 6.1 Tabel baru

**Kenapa tidak cukup tabel rujukan + INSERT.** CHECK di `migrations/0001_warga.sql` memuat nama jenis
laporan secara literal di tiga tempat: daftar `jenis:sub` (±baris 28–31), daftar
`jenis IN ... OR jenis||':'||bahaya IN` (±baris 41–43), dan CHECK `jumlah` (±baris 44). Jenis baru
(`guncang`, `tsunami_amat`, `abu`, `lahar`, `angin`, `hujan_es`, `gelombang`, `air`, `panen`) pasti
ditolak. Jadi tabel `laporan` harus dibangun ulang **satu kali** supaya semua daftar itu pindah ke
tabel rujukan. Setelah itu bencana baru memang cukup INSERT.

**Bahaya pembangunan ulang.** D1 menegakkan FOREIGN KEY (uji lokal memakai `PRAGMA foreign_keys=ON`,
`tests/warga/skema.test.mjs:12`). `DROP TABLE laporan` = DELETE implisit yang memicu
`ON DELETE CASCADE` ke `kontak` dan `suara`, dan mengosongkan `induk`. `DROP TABLE foto` mengosongkan
`foto_suka` dan `foto_komentar`. `PRAGMA defer_foreign_keys` hanya menunda pelanggaran, tidak
membatalkan cascade. Pola `0006_statistik_halaman.sql` aman HANYA karena `stat_hari` tidak dirujuk FK
dan tidak punya trigger (komentar 0006 baris 4); `laporan` dan `foto` punya keduanya.

| Migrasi | Isi |
| --- | --- |
| `0009_rujukan.sql` | (1) Tabel rujukan: `bahaya(id PK, nama)`, `jenis_laporan(jenis, sub, bahaya, PRIMARY KEY (jenis, sub, bahaya))`, `foto_kategori(bahaya, kode, nama, PRIMARY KEY (bahaya, kode))`, `halaman(id PK)`; diisi dari katalog sekarang. (2) `laporan`: salin anak (`kontak`, `suara`) ke tabel sementara, salin `laporan` ke `laporan_lama`, buat `laporan` baru dengan FK komposit ke `jenis_laporan` menggantikan semua CHECK berdaftar, salin isi, drop lama, isi ulang anak, buat ulang trigger dan indeks. (3) `foto`: pola yang sama untuk `foto_suka`, `foto_komentar`, `foto_aduan`, `audit_foto`; tambah kolom `bahaya` (isi awal `'karhutla'`) dan FK `(bahaya, kategori)` ke `foto_kategori`. (4) `stat_hari`: pola 0006, `hal` jadi FK ke `halaman` |
| `0010_kejadian_langsung.sql` | `kejadian_langsung(bahaya, id, waktu, lat, lon, besaran, tingkat, sumber, muatan_json, diperbarui, PRIMARY KEY (bahaya, id))` + indeks `(bahaya, waktu DESC)`; `jadwal_tugas` (§5.4) |
| `00NN_<id>_rujukan.sql` | Per bencana baru: `INSERT INTO bahaya`, `jenis_laporan`, `foto_kategori`, `halaman`. Tanpa membangun ulang tabel |

**Bukti wajib 0009** sebelum dijalankan di produksi: uji migrasi di `node:sqlite` dan D1 lokal
memakai salinan data produksi (`wrangler d1 export`), membandingkan jumlah baris SETIAP tabel anak
dan induk sebelum/sesudah, isi trigger, dan hasil `PRAGMA foreign_key_check` kosong. Ekspor cadangan
diambil tepat sebelum migrasi. Pemeriksa: `migrasi-idempoten` + `security-reviewer`.

**Alternatif bila risiko dinilai terlalu besar:** jangan bangun ulang; validasi jenis baru di Worker
dari katalog dan pasang trigger `BEFORE INSERT` yang menolak pasangan di luar tabel rujukan, sementara
CHECK lama dibiarkan dan hanya menjaga jenis lama. Konsekuensinya CHECK lama harus dilonggarkan,
yang sendirinya butuh bangun ulang, jadi alternatif ini hanya menunda. Disarankan jalan utama.

### 6.2 Route baru (semua masuk `tests/warga/cakupan.json`)

| Route | Isi | Gerbang |
| --- | --- | --- |
| `GET /api/<id>/terbaru` | Kejadian cepat dari `kejadian_langsung`, cache tepi 30–60 s | `guard-api`: metode, batas laju, ukuran respons |
| `GET /api/status` | `SUMBER_STATUS` dibangun dari registry | Uji status per bencana |
| `GET /api/foto?bahaya=<id>` | Galeri per bencana | Uji foto diperluas |
| `POST /api/foto` | Wajib `bahaya` + `kategori` yang cocok dengan tabel rujukan | idem |
| `POST /api/warga` | Jenis laporan per bahaya dari katalog | Uji api diperluas |

### 6.3 Statistik

`HAL` di `src/statistik.js` dan `TAB` di `public/statistik_publik.js` diturunkan dari registry.
Halaman admin statistik mendapat pemilah bencana.

## 7. Layar

### 7.1 `public/inti/` (modul ES tanpa build)

| Modul | Isi | Asal |
| --- | --- | --- |
| `format.js` | `esc`, `fmt`, `rp`, `rb`, `jamWIB`, `lalu`, `namaProv`, satuan, pembulatan jujur | Kembaran di dua HTML |
| `tema.js` | Token CSS terang/gelap, `gelap()`, `#tema` | idem |
| `kepala.js` | Header, menu bencana dari registry, `#upd`, burger | Menu tulisan tangan |
| `tab.js` | `TABS`, `bukaTab`, URL bersih, alias, `nanti()` (INP), tab tersembunyi | `bukaTab` karhutla (banjir pindah dari hash) |
| `peta.js` | Inisialisasi MapLibre, `DASAR`, gaya terang/gelap, satelit, legenda, choropleth wilayah + `kartuTip`, gelembung cluster, popup titik | Kembaran `Peta` |
| `lapis.js` | Panel lapisan berkelompok, muat malas saat dicentang, simpan pilihan | `Lapis` karhutla |
| `panel.js` | Panel kiri: crumb, mode, cari, daftar, sakelar tren, lebar bisa ditarik | `#panel` karhutla |
| `rentang.js` | Pemilih rentang waktu dan garis waktu prakiraan | `#rentang`, `#garisWaktu` |
| `laci.js` | Kerangka laci kejadian: bagian bernama, bagikan, Google Maps, tambalan modul | `Laci` karhutla |
| `insight.js` | `Insight.ex`, `seg`, `selProv`, `selProvMulti`, `LABEL`, sumber di kaki kartu | `Insight` karhutla |
| `tabel.js` | Tabel sortir/cari/ekspor | `Tabel` karhutla |
| `tren.js` | Indeks risiko riwayat, kalender musim | `Tren`, `Riwayat`, `skorRiwayat` |
| `posko.js` | Posko, Sarana, Operasi, Keputusan (Monte Carlo, `gamma`, `anuitas`) | `Posko`, `Sarana`, `Kp` |
| `metode.js` | Kerangka bab Metode: singkatnya, alur, contoh hitung hidup, rincian, batasan | `renderMetode` |
| `sapa.js` | Pop-up "Situasi hari ini" dengan isi disuntik per bencana | `public/sapa.js` |
| `muat.js` | `muatJSON` dengan cache, muatan bertingkat, keadaan muat/kosong/galat/luring | Kembaran |

Sudah bersama dan tetap di tempatnya: `i18n.js`, `informasi.js`, `foto.js`, `bagikan.js`,
`bagi.js`, `persetujuan.js`, `jejak.js`, `pesan.js`, `kaki.js`, `databaru.js`. Semuanya membaca
`data-halaman`; nilai bawaan `"karhutla"` diganti pembacaan registry.

### 7.2 Halaman bencana

`public/<id>/index.html` hanya berisi kerangka DOM, `<link>` ke `inti/*.css`, dan
`<script type="module">` yang mengimpor inti lalu modul khas `public/<id>/*.js`. Target ukuran
HTML ≤ 400 baris. Karhutla dan banjir dipindah ke pola ini bertahap (FASE-0 tahap D).

### 7.3 Gerbang duplikasi

`tests/agen/gerbang-inti.test.mjs` gagal bila nama yang diekspor `public/inti/*.js` didefinisikan
ulang di tingkat atas `public/<id>/*.js|html`. Daftar pengecualian sementara untuk karhutla dan
banjir hanya boleh menyusut (pola `antre` di `cakupan.json`).

## 8. i18n, OG, SEO

- `public/i18n/en.json` dipecah: `en.json` (inti) + `en-<id>.json` per bencana, dimuat sesuai halaman.
  `scripts/i18n/GLOSARIUM.md` mendapat bagian per bencana (istilah resmi BMKG/PVMBG/BNPB dalam
  bahasa Inggris yang dipakai lembaga itu sendiri).
- `scripts/i18n/kumpul.mjs` (crawl pendeteksi kebocoran) dijalankan per rute bencana.
- OG: `scripts/umum/og.py` membaca registry dan merender `public/data/og/<id>-*.png`; `src/og_meta.js`
  memetakan rute bencana ke gambar dan judulnya.
- `sitemap.xml`, `robots.txt`, `llms.txt` **belum ada sama sekali** di repo (bukan migrasi, fitur baru,
  daftar periksa WEBSITE.md §2). Dibuat di FASE-0 tahap A dan dibangkitkan dari registry (hanya `aktif`).

## 9. Armada agent

| Agent baru | Kelas | Model | Wilayah (`milik`) |
| --- | --- | --- | --- |
| `inti-layar` | pengerja | sonnet | `public/inti/**`, `public/bencana.json`, `src/bencana.generated.js` |
| `pipa-umum` | pengerja | sonnet | `scripts/umum/**` (`_pipa.yml` tetap milik `mekanik-mesin`) |
| `gempa` | pengerja | sonnet | `scripts/gempa/**`, `public/gempa/**` |
| `gunungapi` | pengerja | sonnet | `scripts/gunungapi/**`, `public/gunungapi/**` |
| `cuaca` | pengerja | sonnet | `scripts/cuaca/**`, `public/cuaca/**` |
| `kekeringan` | pengerja | sonnet | `scripts/kekeringan/**`, `public/kekeringan/**` |
| `udara` | pengerja | sonnet | `scripts/udara/**`, `public/udara/**` |
| `status-resmi` | pemeriksa | haiku | Memastikan status resmi lembaga tampil lebih dulu, berlabel, dan tidak ditimpa indeks buatan sendiri |

**Tidak ada berkas dengan dua pemilik** (`gerbang-ilmu-agent` menolaknya). Karena itu:
`src/<id>.js` (jalur cepat tiap bencana) tetap milik `warga-api` (`src/**`), dan pengerja bencana
mengirim spesifikasinya; `public/<id>/index.html` milik pengerja bencana itu (glob paling spesifik),
`layar-peta` melepas `public/bencana.json` ke `inti-layar` lewat glob yang lebih spesifik;
`.github/workflows/**` tetap milik `mekanik-mesin`. Tiap penambahan agent diikuti `npm run uji:agen`.

Pemeriksa yang ada dipakai ulang: `validasi-model` (model, uji balik), `selera-angka` (angka layar),
`inp-reviewer` (klik), `guard-api` + `security-reviewer` (route), `migrasi-idempoten` (D1),
`higiene-repo` (commit besar). Tiap agent baru lewat pintu `scripts/agents/roster.json` →
`npm run agents:build` → isi `.claude/ilmu-agent/<nama>.md` dari kode nyata (AGENTS.md §1.5).

## 10. Risiko

| Risiko | Dampak | Penangkal |
| --- | --- | --- |
| Menyatakan status bahaya yang salah saat bencana cepat | Kepanikan atau rasa aman palsu | Prinsip 5 (status resmi didahulukan), pemeriksa `status-resmi`, pita "sumber: BMKG" di tiap angka |
| Sumber resmi berubah format tanpa pemberitahuan | Data kosong diam-diam | `uji` memeriksa skema respons; `/api/status` per sumber; data lama dipakai dan diberi label umurnya |
| Kuota Open-Meteo/Actions habis karena modul bertambah | Pipeline gagal | Anggaran panggilan per bencana dicatat di registry; jadwal digeser; cache mentah |
| `index.html` karhutla rusak saat ekstraksi inti | Situs utama rusak | Strangler, uji tampilan sebelum/sesudah tiap pemindahan, `tests/beban/ukur_muat.mjs` sebagai pembanding muatan |
| Ukuran aset melewati batas Cloudflare (25 MiB per berkas; 20.000 berkas di paket gratis, 100.000 berbayar) | Deploy gagal | Per 15 Okt 2026: 1.335 berkas, 152 MB, tidak ada > 20 MB. Gerbang ukuran per berkas `public/**/data`; data besar dipecah per provinsi; paket dicatat di registry |
| Beban baca D1 dari `/api/<id>/terbaru` saat bencana besar viral | Kuota D1 habis | Cache tepi 30–60 s; uji beban `tests/beban/beban.mjs` dengan lonjakan 50× per bencana |
| Klaim hak cipta / ketentuan sumber | Takedown, kunci dicabut | Tidak semua sumber berlisensi terbuka: MAGMA (HTML tanpa lisensi terbuka) dipakai dengan atribusi eksplisit PVMBG dan mengikuti kebijakan situsnya; WAQI melarang redistribusi massal, jadi hanya tampil sebagai nilai terkini bertaut tanpa menyimpan seri. Kolom "boleh dipublikasi ulang" di SUMBER-DATA.md wajib diisi sebelum sumber dipakai; `kredit.json` per bencana |

## Keputusan yang menunggu pemilik

1. **Beranda.** `/` tetap karhutla (disarankan sampai `/semua` lahir), atau `/` langsung jadi
   beranda semua bencana?
2. **Gelombang & abrasi**: lapisan dan jenis kejadian di modul cuaca (disarankan, `bencana/cuaca.md`), dilebur ke rob, atau modul sendiri?
3. **Kualitas udara**: modul sendiri yang mencakup polusi kota dan industri, atau tetap bagian karhutla?
4. **Nama di menu**: "Gempa Bumi & Tsunami" satu modul (disarankan, karena tsunami dipicu gempa
   dan peringatannya dari sistem yang sama), atau dua?
5. **`FOTO_DUMMY_PUBLIK="1"`** sekarang aktif di `wrangler.jsonc`: foto contoh tampil ke publik di
   produksi. Disengaja untuk masa uji, atau dimatikan sebelum rilis?
6. **Banjir di menu sekarang?** Langsung `aktif` (sudah publik, hanya tersembunyi dari menu) atau
   `uji` sampai tahap E selesai (menambah `noindex` ke halaman yang sekarang terindeks)?
7. **Paket Cloudflare** (gratis/berbayar) menentukan batas subrequest/CPU cron dan jumlah berkas.
