# Rencana multi-bencana Pantau Bencana

Dibuat 15 Okt 2026 atas permintaan pemilik: semua bencana lain meniru best practice dan SELURUH
fitur modul karhutla, satu per satu, serinci mungkin.

Dokumen ini adalah rencana, bukan kode. Tiap bencana dikerjakan mengikuti alur di
**`ALUR.md`** dan dinilai dengan daftar periksa di **`PAKET-FITUR.md`**.

## Isi

| Berkas | Isinya | Dibaca saat |
| --- | --- | --- |
| **`ARSITEKTUR.md`** | Arsitektur target: registry bencana, rute, data, pipeline, worker, D1, layar, i18n, OG, agent | Sebelum menyentuh kode apa pun |
| **`PAKET-FITUR.md`** | Daftar exhaustive 113 komponen karhutla, padanannya untuk bencana lain, dan cara membuatnya | Merencanakan dan menutup tiap bencana |
| **`FASE-0.md`** | Fondasi bersama yang WAJIB ada sebelum bencana ketiga lahir | Pekerjaan pertama |
| **`ALUR.md`** | Alur kerja 12 tahap per bencana, dari riset sampai rilis, dengan gerbang tiap tahap | Tiap kali memulai bencana baru |
| **`SUMBER-DATA.md`** | Sumber data terbuka per bencana (URL, format, frekuensi, lisensi, status verifikasi) | Tahap riset tiap bencana |
| **`PETA.md`** | Cetak biru peta karhutla dipecah ke `public/inti/peta/`, beda peta per bencana, gerbang peta | Menulis layar peta bencana baru |
| **`PELATIHAN-MODEL.md`** | Kerangka latih bersama (`scripts/umum/latih/`), bug karhutla yang dibetulkan dulu, model per bencana, gerbang model | Sebelum melatih model apa pun |
| **`COPYWRITING.md`** | Suara dan pola copy karhutla, aturan angka, pelanggaran sisa, kosakata padanan per bencana | Menulis teks layar, bagikan, OG |
| **`MODUL-PLUG-AND-PLAY.md`** | Katalog 35 modul: colok, satu langkah, adaptor, karhutla saja; medan registry tambahan | Sebelum menyalin modul apa pun |
| [`bencana/`](bencana/) | Spesifikasi rinci per bencana: kejadian, status, lapisan, laci, insight, model, uji balik, posko, dampak, lapor warga | Saat bencana itu dikerjakan |

## Keputusan inti (ringkas; alasannya di ARSITEKTUR.md)

1. **Satu situs, satu registry.** `public/bencana.json` jadi sumber tunggal daftar bencana:
   nama, ikon, warna, rute, folder data, tab, sumber status, kategori foto, jenis lapor warga.
   Menu header, worker, statistik, OG, dan pipeline membacanya. Tidak ada lagi menu yang
   ditulis tangan di tiap HTML.
2. **Rute `/<id>/` per bencana**, tab dengan URL bersih `/<id>/<tab>` seperti karhutla.
   Karhutla tetap di `/` demi tautan lama dan OG yang sudah tersebar; `/karhutla/` dialihkan ke `/`.
3. **Data di `public/<id>/data/`.** Karhutla tetap di `public/data/` (dicatat di registry).
4. **Inti bersama ditarik bertahap (pola strangler), bukan rombak besar.** `public/inti/` untuk
   layar, `scripts/umum/` untuk pipeline. Karhutla tidak disentuh kecuali untuk mengganti fungsi
   yang sudah dipindah. Gerbang menolak duplikasi baru.
5. **Dua kecepatan data.** Bencana lambat (kekeringan, musim) lewat GitHub Actions dan JSON statis.
   Bencana cepat (gempa, tsunami, erupsi, peringatan cuaca) lewat cron Worker ke D1 dan
   `/api/<id>/terbaru`, persis pola `/api/titik` karhutla.
6. **Enum bahaya dan jenis laporan di D1 jadi tabel rujukan**, bukan CHECK berdaftar. Ini butuh
   SATU pembangunan ulang `laporan`/`foto` yang hati-hati (cascade FK, ARSITEKTUR §6.1); sesudahnya
   bencana baru = satu migrasi INSERT.
7. **Satu bencana selesai = 100% PAKET-FITUR terisi** (tiap baris: dibuat, diadaptasi, atau
   "tidak berlaku" dengan alasan tertulis), semua gerbang hijau, dan uji balik tampil apa adanya.
8. **Tiap bencana punya pengerja agent sendiri** (Sonnet) dengan ilmu dan wilayah berkas sendiri.

## Urutan pengerjaan yang diusulkan

| Urutan | Bencana | Alasan |
| --- | --- | --- |
| 0 | Fondasi bersama (FASE-0) | Pemakai kedua (banjir) sudah lahir tanpa rumah bersama; bencana ketiga jangan |
| 1 | Banjir, longsor, rob: naik kelas ke paket penuh dan dibuka di menu | 80% sudah ada, saat ini tersembunyi; tutup celahnya dulu |
| 2 | **Gempa bumi & tsunami** | Tiga JSON BMKG + USGS/EMSC terverifikasi hidup, real-time, dampak terbesar, 26.004 gempa M4,5+ sejak 2000 untuk uji balik. Tsunami jadi lapisan di modul ini (tidak ada umpan terbuka tersendiri) |
| 3 | **Cuaca ekstrem + gelombang tinggi** | Nowcast/CAP dan prakiraan BMKG hidup, Open-Meteo sudah dipakai, bahan sudah ada di banjir |
| 4 | **Kualitas udara & asap** | CAMS lewat Open-Meteo tanpa kunci, langsung terkait titik panas karhutla; upaya paling kecil |
| 5 | **Gunung api** | Dampak tinggi, tetapi MAGMA tanpa API terbuka: pemanen HTML rapuh, perlu cadangan GDACS |
| 6 | **Kekeringan** | Bisa dihitung dari ERA5 + ONI/DMI tanpa layanan baru; lambat, mendesak paling rendah |
| 7 | Beranda semua bencana (`/semua`) | GDACS + InaRISK + BNPB `Kejadian_Bencana_Mingguan` sebagai kartu "semua kejadian", setelah minimal 4 modul aktif |

Longsor dan rob tetap di modul banjir (**`bencana/banjir.md`**).
Urutan ini mengikuti hasil verifikasi **`SUMBER-DATA.md`** 15 Okt 2026.

## Risiko terbesar dari riset

1. **BMKG menolak permintaan ber-UA pendek (403).** Wajib UA peramban lengkap; belum diuji dari
   IP GitHub Actions. Ini diuji pertama kali di FASE-0 tahap B, sebelum modul gempa ditulis.
2. **MAGMA tanpa API terbuka.** Modul gunung api bergantung pada pemanen HTML yang bisa patah.

## Keputusan yang menunggu pemilik

Daftarnya di akhir [`ARSITEKTUR.md`](#keputusan-yang-menunggu-pemilik).

---

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

Semua butir ini dibereskan di **`FASE-0.md`**.

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

---

# Paket fitur standar per bencana

Daftar ini adalah semua yang dimiliki karhutla per 15 Okt 2026, dipecah jadi komponen bernomor.
Tiap bencana baru wajib mengisi SETIAP baris dengan salah satu dari tiga nilai:

- **dibuat**: komponen ada dan lolos gerbangnya,
- **diadaptasi**: bentuknya berbeda karena domain, dan perbedaannya ditulis,
- **tidak berlaku**: dengan alasan satu kalimat yang bisa dibantah (bukan "belum sempat").

Bencana tidak boleh berstatus `aktif` di registry selama ada baris kosong atau "belum"
(dijaga `tests/agen/gerbang-bencana.test.mjs`, butir 7).

**Paritas diukur terhadap karhutla yang TAMPIL, bukan yang disembunyikan.** Pemilik sudah
menyembunyikan sebagian fitur karhutla (ledger memori `fitur-disembunyikan`; `TAB_SEMBUNYI` di
`public/index.html` ±baris 1696 = ringkasan, posko, informasi, kompleks, metode; di laci,
"Respons terdekat" dan "Tindakan yang disarankan" disembunyikan, ±baris 198; kartu uji/galat model
di Insight disembunyikan). Komponen seperti itu **tetap dibuat di kode** untuk bencana baru, tetapi
ikut disembunyikan dengan cara yang sama (`tab_sembunyi`, bagian laci tersembunyi) dan tidak
menghalangi status `aktif`. Membukanya adalah keputusan pemilik per bencana. Satu pengecualian:
halaman Metode wajib ada (gerbang butir 6) walaupun tersembunyi, karena itu tempat rumus diuji orang.

Kolom "Rujukan karhutla" menunjuk kode yang ditiru. Kolom "Cara membuat" adalah resep generik;
spesifik per bencana ada di `bencana/<id>.md`.

## A. Data dan pipeline

| Kode | Komponen | Rujukan karhutla | Padanan generik | Cara membuat | Gerbang |
| --- | --- | --- | --- | --- | --- |
| A01 | Sumber pengamatan utama | FIRMS 4 sensor NRT, 7 hari (`harian.py hotspot`) | Katalog kejadian/pengamatan resmi bencana itu | Skrip `scripts/<id>/amati.py` memanen sumber utama + cadangan; simpan mentah ke cache Actions; keluaran tabel `{kolom, baris}` dengan `acuan` wilayah | `uji` memeriksa skema respons nyata dari berkas contoh tersimpan |
| A02 | Varian keluaran bertingkat | `hotspot24/72/semua.json` | `<pengamatan>24/72/semua.json` | Satu fungsi tulis, tiga potongan waktu, kolom sama | Ukuran tiap berkas di bawah plafon |
| A03 | Pengamatan hampir-waktu-nyata | Cron Worker FIRMS → D1 `titik_terbaru` → `/api/titik`, `titik_live.js` | `kejadian_langsung` → `/api/<id>/terbaru` | `src/<id>.js` dengan `perbarui<Id>(env)`; dipanggil pengatur cron; layar menimpa data harian | Uji Miniflare: cron mengisi D1, route menjawab, data basi ditandai |
| A04 | Entitas kejadian aktif | Kompleks api: DBSCAN VIIRS 1,5 km, aktif 72/168 jam (`harian.py dbscan`) | "Kejadian" bencana itu dengan kode `<awalan>0001` | Aturan pengelompokan atau satu-baris-satu-kejadian; masa aktif tertulis; kode stabil antar-run | `uji`: kode tidak berubah bila data sama; kejadian kedaluwarsa tepat waktu |
| A05 | Atribut kejadian | Luas, FWI terdekat, gambut, kawasan, konsesi, penanggung jawab, Daops terdekat, risiko riwayat, skor, `api24` | Besaran, lokasi administratif, kondisi pemicu, bahaya InaRISK, fasilitas terdekat, paparan penduduk, skor | Pakai `scripts/umum/wilayah.py`, `inarisk.py`, `penduduk.py` | `uji` invarian: tiap kejadian punya prov/kab/kec |
| A06 | Geometri dampak | Garis api organik (`garis_api.py`: raster 375 m, closing, marching squares, Chaikin) | Area dampak (guncangan, KRB, sel hujan, area kering) | Poligon dari model atau sumber resmi; disederhanakan; dipecah `<x>_awal` + `<x>_geo` dimuat malas | Ukuran `_awal` kecil; poligon valid |
| A07 | Pemecahan muatan | `kluster_awal.json` + `kluster_geo.json` | `kejadian_awal.json` + `kejadian_geo.json` | Atribut ringan dulu, geometri belakangan | `ukur_muat.mjs` per rute |
| A08 | Cuaca pendukung | Open-Meteo per sel 0,5° untuk FWI | Variabel pemicu bencana itu | `scripts/umum/jaring.py` + kisi bersama | Kuota dicatat |
| A09 | Indeks bahaya harian | FWI Kanada (`fwi.py`) | Indeks fisik domain (mis. HTH/SPI kekeringan, intensitas hujan longsor) | Rumus diterbitkan, dikutip sumbernya, self-check terhadap contoh literatur | `uji` mencocokkan contoh terbitan |
| A10 | Prakiraan ansambel | ECMWF IFS 51 anggota → P(FWI≥7), P(≥14), median, P10/P90 (`ansambel.py`) | Peluang melewati ambang domain | Ansambel Open-Meteo; peluang per sel per hari | Kuota; anggota hilang ditangani |
| A11 | Kondisi latar | Kelembapan tanah vs iklim 2015–2025 (`tanah.py`) | Anomali latar domain | Persentil terhadap klimatologi; klimatologi dicache | Persentil 0–100 |
| A12 | Indeks khusus tambahan | PFVI gambut (`pfvi.py`, lapisan disembunyikan) | Indeks riset domain | Hanya bila ada uji balik; boleh disembunyikan | `validasi-model` |
| A13 | Aturan status 4 tingkat | `aturan.py`: STATUS, kelas, keparahan, cuaca hanya menaikkan | Status Pantau Bencana per wilayah; status resmi lembaga ditampilkan terpisah dan didahulukan | `scripts/umum/status.py` + ambang domain di `scripts/<id>/aturan.py` | `uji` + uji balik (B02) |
| A14 | Prioritas | `PRIOR_PX=15` dan FWI≥7, uji balik 2019/2023 tertulis di docstring | Kejadian yang butuh perhatian pertama | Ambang dari uji balik, angka tangkapan/presisi ditulis | Angka di docstring = angka di `validasi.json` |
| A15 | Risiko riwayat 0–100 | 50% kekerapan, 30% besaran, 20% tren (`risiko_riwayat`) | Sama | `scripts/umum/riwayat.py` | `uji` |
| A16 | Kalender musim | Per dasarian per provinsi, El Niño vs biasa (`musim.py`) | Musim domain (hujan, kemarau, erupsi tidak musiman → "tidak berlaku") | idem | idem |
| A17 | Iklim | ONI/RONI, DMI, status CPC (`iklim.py`) | Dipakai bersama: `public/data/umum/iklim.json` | Pindah ke `data/umum` | — |
| A18 | Riwayat grid dan sejarah | `riwayat_grid.json` 0,1°, `sejarah.json` VIIRS 2015– | Katalog historis domain | Arsip resmi + grid kekerapan | Jumlah baris historis tidak menyusut |
| A19 | Statistik per provinsi | `wilayah.json` (harian, kluster, level, FWI maks) | idem | Agregat dari A04/A13 | — |
| A20 | Data lembaga | `bnpb.json` (BNPB karhutla), `inarisk.json`, `bpbd.json` | Status/rilis resmi lembaga domain | Panen apa adanya, label lembaga | `status-resmi` |
| A21 | Posko | Greedy maximum coverage, bobot kompleks, desa OSM, 4 tingkat (`posko.py`) | Lokasi pos/pengungsian/aju | `scripts/umum/posko.py`, bobot domain | `uji` cakupan ≥ target |
| A22 | Operasi | Regu-hari, mop-up, titik bor, heli; `KOEF` lo/mid/hi bersumber (`operasi.py`) | Kebutuhan sumber daya domain (tenda, air bersih, alat berat, SAR) | Koefisien bersumber, Python↔JS setara | `uji` kesetaraan node |
| A23 | Aset udara | Pangkalan heli, OMC (`udara_rekom.py`) | Aset udara/logistik domain atau "tidak berlaku" | — | — |
| A24 | Keputusan ekonomi | Regresi luas~titik, Monte Carlo lo/mid/hi (`keputusan.py`) | Biaya respons vs kerugian dihindari | idem | `uji` |
| A25 | Preventif | Profil + rencana pencegahan (`preventif.py`) | Mitigasi domain | idem | idem |
| A26 | Penanggung jawab lahan | Konsesi tanpa nama perusahaan (`konsesi_kompleks.py`) | Pemilik/pengelola aset terdampak bila relevan | Netral, tanpa nama pribadi | `security-reviewer` privasi |
| A27 | Dampak | `dampak.py`: udara, ISPA, sekolah, lintas batas, lahan, emisi, ekonomi, kerugian, asumsi | Dampak domain dari data yang sama | Dihitung tanpa jaringan dari JSON lain, asumsi bernama | `cek()` + `uji` |
| A28 | Paparan penduduk | WorldPop per sel/kecamatan (`penduduk.py`) | Penduduk di area dampak | `scripts/umum/penduduk.py` | — |
| A29 | Sekolah dan fasilitas | `sekolah.py`, `fasilitas.json`, OSM | Fasilitas di area dampak (RS, sekolah, jembatan) | Data statis bulanan dipakai bersama | — |
| A30 | Muatan Dashboard | `ringkasan.json` | idem | Potongan ringan dari JSON lain | Ukuran ≤ 50 KB |
| A31 | Cuaca per jam untuk simulasi | `cuaca_jam.py` per sel 0,5° | Bila ada simulasi | idem | — |
| A32 | Citra satelit | Sentinel-2 COG HTTP Range, cadangan GIBS (`citra.py`), tidak pernah gagal | Citra sebelum/sesudah area kejadian | idem, keluar 0 bila gagal | — |
| A33 | Berita | Google News RSS, geocoding, sentimen 2 dimensi, EN, arsip bergulir, label uji (`berita.py`) | Kueri dan topik domain | `scripts/umum/berita.py` + kueri `scripts/<id>/berita_kueri.json` | Label uji ≥ 200 per bencana; akurasi dilaporkan |
| A34 | Video | YouTube Data API, anggaran kuota (`video.py`) | idem | Kuota per bencana | — |
| A35 | Data sektor | Penerbangan + METAR (`penerbangan.py`, `metar.py`) | Sektor terdampak domain (penerbangan untuk abu vulkanik, pelayaran untuk gelombang) | idem | — |
| A36 | Kurasi tangan | `factsheet_karhutla.json`, `luas_resmi.json`, `operasi_resmi.json` | `factsheet_<id>.json` dll. | Berkas berkolom `sumber` dan `tanggal` | Tiap baris punya sumber |
| A37 | Meta | `meta.json`: dibuat, data_terakhir, hari_wib, status | idem | `simpan.py` menaruh `dibuat` pertama | `/api/status` |
| A38 | Data statis bulanan | `statis.yml`: OSM, kanal, jalan, penduduk, konsesi | Lapisan statis domain (KRB, sesar, zona tsunami) | Bulanan, di-commit | — |
| A39 | Seri jangka pendek bergulir | `scripts/data/harian30.py` → `harian30.json` (100 hari per prov/kab, hanya di cache Actions), `tren_karhutla.json` | Seri harian kejadian/indeks per wilayah | Bergulir, dicache | Panjang seri tidak menyusut |
| A40 | Data respons dan kontak | `scripts/scrape/daops.py` → `daops.json`; kurasi `tim.json`, `kontak.json`, `mitra.json` | Unit respons domain (BPBD, Basarnas, pos PVMBG, stasiun BMKG) dan kontak | Panen + kurasi tangan bersumber | Tiap baris punya sumber |

## B. Model, uji balik, kejujuran angka

| Kode | Komponen | Rujukan karhutla | Padanan generik | Cara membuat | Gerbang |
| --- | --- | --- | --- | --- | --- |
| B01 | Model prakiraan | GBDT stdlib 40 fitur, pohon datar dievaluasi di peramban (`scripts/sebaran/`) | Model prakiraan domain yang realistis dengan stdlib | Latih 2015–22, validasi 2023, uji 2024–26 dibuka sekali | `validasi-model` |
| B02 | Uji balik aturan status | Tangkap 90–95%, presisi 35–53% (2019/2023); banjir: POD/FAR/CSI/PSS/ETS, bootstrap blok vs DIBI | idem terhadap katalog kejadian | `scripts/umum/ujibalik.py` | Angka di layar = angka di JSON |
| B03 | Prospektif | Catatan append-only tiap 3 jam, dinilai 72 jam kemudian (`prospektif.py`) | idem | `scripts/umum/prospektif.py` | Berkas tidak pernah menyusut |
| B04 | Kasus historis | 123 kejadian, model lipat tanpa bocoran (`kasus.py`) | Galeri kejadian besar masa lalu | idem | — |
| B05 | Galat dan pendorong | `galat.py`, `pendorong.py` | idem | idem | — |
| B06 | Tren jangka panjang | Theil-Sen, Mann-Kendall (`musim_awal.py`) | idem | idem | — |
| B07 | Kesetaraan Python↔JS | `uji_js.py`, `operasi.py uji` lewat node | Tiap rumus yang ada di dua bahasa | Uji node di blok "Uji aturan" | Wajib |
| B08 | Selang ketidakpastian | CQR P10/P90, Platt (`model_sebaran.json`) | idem | idem | — |
| B09 | Kinerja tercatat | `kinerja_uji` di JSON model, tampil apa adanya | idem | — | `selera-angka` |
| B10 | Dokumen riset | `RISET-SEBARAN.md`, `RISET-PFVI.md`, `PAPER-PFVI.md` | `scripts/<id>/RISET-*.md` | Ditulis saat tahap riset | Ada sebelum `aktif` |

## C. Layar publik

| Kode | Komponen | Rujukan karhutla | Padanan generik | Cara membuat | Gerbang |
| --- | --- | --- | --- | --- | --- |
| C01 | Kepala + menu bencana | `header.top`, `details.bencana` | Dari registry | `inti/kepala.js` | `gerbang-bencana` butir 2 |
| C02 | Tab dan URL bersih | 13 tab, `TAB_SEMBUNYI`, `ALIAS`, `/k/K0001` | Dari registry | `inti/tab.js` | Uji rute worker |
| C03 | Tema terang/gelap | `#tema`, `pk-tema`, `Peta.gantiDasar` | Satu kunci tema untuk semua bencana | `inti/tema.js` | Kontras AA |
| C04 | Waktu data | `#upd` | idem | dari `meta.json` | — |
| C05 | Panel kiri | Crumb, mode Real Time/Riwayat/Kompleks, cari, daftar, sakelar tren | Mode Sekarang/Riwayat/Kejadian | `inti/panel.js` | INP |
| C06 | Rentang waktu | Hari ini / Kemarin / 72 jam / 7 hari | Sesuai irama bencana | `inti/rentang.js` | — |
| C07 | Garis waktu prakiraan | `#garisWaktu`, `#fwiHari` | Hari prakiraan indeks domain | idem | — |
| C08 | Panel lapisan | 4 kelompok, ~25 lapisan, muat malas | Kelompok: Kejadian & respons, Pemicu, Bahaya statis, Infrastruktur | `inti/lapis.js` | Muat malas diuji |
| C09 | Choropleth wilayah + kartu hover | `wil-fill`, `SKALA_WIL`, `kartuTip` (lambang, angka, tren) | idem | `inti/peta.js` | — |
| C10 | Gelembung cluster | `prio-klaster`, angka tidak bertumpuk | idem | idem | — |
| C11 | Popup titik | Jam, sensor, keyakinan, FRP | Atribut pengamatan domain | idem | `selera-angka` |
| C12 | Laci kejadian | 9 bagian: saat ini, cuaca, penjelasan status, tindakan, respons terdekat, lahan, InaRISK, riwayat, simulasi; bagikan `/k/<id>`, Google Maps | Bagian yang sama dengan isi domain | `inti/laci.js` + bagian khas | `selera-angka`, `inp-reviewer` |
| C13 | Legenda | `renderLegenda` | idem | idem | — |
| C14 | Insight | ~14 exhibit + modul tambahan; gaya kartu pil tanpa subjudul/KPI (memori pemilik) | Exhibit domain, lihat daftar minimum di `bencana/<id>.md` | `inti/insight.js` | Memori "Gaya kartu Insight" |
| C15 | Tabel kejadian | `#kompleks`, `Tabel` | idem | `inti/tabel.js` | — |
| C16 | Cerita | `cerita_karhutla.js` (bab: penempatan regu, 25 tahun, musim, pendorong, model, uji model) | `cerita_<id>.js` | Setelah data historis lengkap | — |
| C17 | Berita | Volume harian + sentimen, filter, nasional/internasional, ruang krisis media | idem | Inti berita bersama | — |
| C18 | Tren | Indeks risiko 0–100, kalender musim, historis | idem | `inti/tren.js` | — |
| C19 | Posko, Sarana, Operasi, Keputusan | 4 sub-tab | idem | `inti/posko.js` | Kesetaraan Python↔JS |
| C20 | Dampak | 10 bagian `JUDUL` | Bagian dampak domain | `public/<id>/dampak.js` | `selera-angka` |
| C21 | Dashboard pimpinan | 6 bagian: situasi, keputusan hari ini, prakiraan 72 jam, sentimen, penanggung jawab & sumber daya, sumber | idem | `public/<id>/ringkasan.js` | — |
| C22 | Metode | Per bab: singkatnya, alur, contoh hitung dengan data hari ini, rincian teknis, batasan | idem, semua rumus A09–A27 dan B01–B03 | `inti/metode.js` | Tiap rumus di kode punya bab |
| C23 | Simulasi | Fisika FBP + Dijkstra 72 jam, skenario, mode Perlakuan, model data | Simulasi domain bila ada model fisik yang jujur; jika tidak: "tidak berlaku" | `public/<id>/sim.js` | `validasi-model` |
| C24 | Lapor Warga | `informasi.js`, jenis per bahaya | Jenis laporan domain | `informasi_jenis.js` + migrasi rujukan | `skema.test.mjs` |
| C25 | Foto lapangan | `foto.js`: kirim GPS, galeri, peta, rincian, upvote, komentar, aduan, dummy 100 foto berlisensi | Kategori foto domain; dummy foto domain berlisensi | registry `foto_kategori` | `foto.test.mjs` |
| C26 | Pop-up situasi hari ini | `sapa.js`: naik/turun, kejadian baru, bertahan, asap, peringatan BMKG | Isi domain | `inti/sapa.js` + penyuntik | Sekali per hari WIB |
| C27 | Bagikan | Gambar IG 4:5/9:16/1:1, template, xlsx/pdf/pptx | Template domain | `bagikan.js` cabang `<id>` | — |
| C28 | OG per rute | `/`, `/peta`, `/k/K0001`, `?wil=62`, `/f/:id` | `/<id>/...` | `scripts/umum/og.py`, `og_meta.js` | `og.test.mjs` |
| C29 | i18n EN | Kamus 6.618 entri + 24 pola, crawl kebocoran | `en-<id>.json` + glosarium domain | idem | Crawl nol kebocoran |
| C30 | Persetujuan, jejak, pesan, kaki | Bersama | Bersama | — | `klien.test.mjs` |
| C31 | Muat / kosong / galat / luring | Kerangka muat, pesan kosong per tab | idem | `inti/muat.js` | Tiap tab punya empat keadaan |
| C32 | Mobile 375 px | Tanpa scroll horizontal, target sentuh ≥ 44 px | idem | — | Uji 375 px |
| C33 | Klik tidak membekukan | Pola `nanti()`, chrome urgent, subtree deferred (INP.md) | idem | — | `inp-reviewer` |
| C34 | Halaman Tentang dan kartu bencana | `tentang.html` hero 5 bencana | Kartu dari registry | `inti/kepala.js` atau splice | Ikon benar, status dari registry |
| C35 | Statistik publik | `/statistik` dengan pemilah halaman | Pemilah bencana | Dari registry | — |
| C36 | Admin moderasi | `src/admin_halaman.js`, `public/admin/{foto,statistik,pesan,masuk}.js`: antrean laporan/foto, pesan, statistik, dummy 🧪/🧹 | Pemilah `bahaya` di semua antrean; dummy per bencana | Satu panel admin untuk semua bencana | `uji:warga` |
| C37 | Bagikan lanjutan | `public/bagi.js` (QR, WhatsApp, lembar bawaan, UTM), "Bagikan video" Insight Musim (`rekamVideo`) | idem | Bersama | — |
| C38 | Lapisan tambahan | `public/lapisan5.js` (hutan hilang, bekas terbakar, sekolah, fasilitas, Daops, lencana iklim), `public/databaru.js` (peringatan BMKG, ansambel, tanah) | Lapisan konteks domain | Modul tambalan `public/<id>/lapisan.js` | Muat malas |
| C39 | Kaki dan Tentang | `public/kaki.js` (`kontak.json`), `tentang.html` (`tim.json`, `mitra.json`) | Bersama, dengan kartu bencana dari registry | — | — |

## D. Worker dan D1

| Kode | Komponen | Rujukan karhutla | Padanan generik | Cara membuat | Gerbang |
| --- | --- | --- | --- | --- | --- |
| D01 | Rute HTML | `HTML_RUTE`, `HALAMAN` | Dari registry | ARSITEKTUR §4 | Uji rute |
| D02 | Route data cepat | `/api/titik` cache tepi 600 s | `/api/<id>/terbaru` cache 30–60 s | `src/<id>.js` | `cakupan.json` |
| D03 | Cron | `15 */3 * * *` FIRMS, `17 * * * *` bersih-bersih | Pengatur satu menit | `src/jadwal.js` | Uji jadwal |
| D04 | Status kesegaran | `SUMBER_STATUS` | Dari registry | — | CI merah bila basi |
| D05 | Lapor warga | Tabel `laporan`, batas laju, Turnstile, CSRF, `bersihTeks` | Jenis domain | Migrasi rujukan | `api.test.mjs` |
| D06 | Foto | `foto` + suka/komentar/aduan/audit/laju | `foto.bahaya` | Migrasi 0009 | `foto.test.mjs` |
| D07 | Statistik | `stat_hari.hal`, `HAL` | Dari registry | Migrasi 0009 | `statistik.test.mjs` |
| D08 | OG meta | `og_meta.js` | Rute bencana | — | `og.test.mjs` |
| D09 | Dummy | Tombol 🧪/🧹, kolom `dummy`, lencana "contoh" (DUMMY.md) | Tiap tabel baru yang dibaca layar bertombol dummy | `POST /api/<id>/dummy` bila ada tabel D1 khas | `05-dummy-jejak` pola DUMMY.md |
| D10 | Privasi | Hash IP bergaram harian, garam dimusnahkan, DNT/GPC | Sama | — | `security-reviewer` |

## E. Gerbang dan uji

| Kode | Komponen | Rujukan karhutla | Untuk bencana baru |
| --- | --- | --- | --- |
| E01 | Self-check per skrip | `python3 x.py uji`, blok "Uji aturan" di `data.yml` | Tiap skrip `scripts/<id>/*.py` punya `uji` dan terdaftar di workflow |
| E02 | Cakupan route/tabel | `tests/warga/cakupan.json`, utang hanya menyusut | Route dan tabel baru langsung `diuji` |
| E03 | Skema D1 | `skema.test.mjs` di `node:sqlite` | Tabel rujukan vs katalog vs registry |
| E04 | Registry | — | `gerbang-bencana.test.mjs` |
| E05 | Duplikasi inti | — | `gerbang-inti.test.mjs` |
| E06 | Kesegaran data | `/api/status` 503 + langkah akhir CI | Sumber bencana masuk registry |
| E07 | Beban | `beban.mjs` 100 rb/hari lonjakan 50×, `ukur_muat.mjs` | Dijalankan per rute bencana |
| E08 | i18n | `kumpul.mjs` crawl dua arah | Per rute bencana |
| E09 | Kepemilikan berkas | `gerbang-ilmu-agent` | Pengerja baru memiliki semua berkas bencana |
| E10 | Model agent | `gerbang-model-agent` | Agent baru wajib `model:` |

## F. Armada dan dokumen

| Kode | Komponen | Untuk bencana baru |
| --- | --- | --- |
| F01 | Pengerja agent | Entri roster, `npm run agents:build`, ilmu dari kode nyata |
| F02 | Dokumen spesifikasi | `docs/multi-bencana/bencana/<id>.md` dengan daftar periksa A01–F04 terisi |
| F03 | Dokumen riset | `scripts/<id>/RISET-*.md` (sumber, ambang, uji balik) |
| F04 | Kredit dan lisensi | Semua sumber data dan foto tercatat di `public/<id>/kredit.json` dan halaman Tentang |

---

# Fase 0: fondasi bersama

Wajib selesai sebelum bencana ketiga (gempa) mulai ditulis. Tiap tahap berdiri sendiri, punya
bukti selesai, dan bisa di-deploy tanpa menunggu tahap berikutnya. Urutan disusun supaya situs
tidak pernah rusak di antara dua tahap.

## Tahap A: registry dan menu (risiko rendah, dampak langsung terlihat)

| # | Kerja | Berkas | Bukti selesai |
| --- | --- | --- | --- |
| A1 | Buat `public/bencana.json` berisi karhutla (`aktif`, `warisan`), banjir (`warisan`; `aktif` atau `uji` menurut keputusan pemilik butir 6 di ARSITEKTUR), dan entri gempa/gunungapi/cuaca berstatus `mati` | `public/bencana.json` | Uji skema registry hijau |
| A2 | `public/inti/kepala.js` merender menu bencana dari registry; hanya bencana `aktif` tampil; di ≤ 640 px menu bencana ada di burger `#burger` (seperti sekarang di karhutla) | `public/inti/kepala.js`, `public/index.html`, `public/banjir/index.html`, `public/tentang.html` (tiga halaman yang punya `details.bencana`) | Menu sama persis di tiga halaman (cek DOM otomatis); 375 px: bencana muncul di burger |
| A3 | Hapus semua entri "Coming Soon" (WEBSITE.md §2) | idem | Tidak ada teks "Coming Soon"/"Segera" untuk bencana di `public/**` |
| A4 | Kartu bencana di `/tentang` dari registry; perbaiki ikon yang bergeser satu posisi | `public/tentang.html` atau splice | Tangkapan layar: ikon cocok dengan bencananya |
| A5 | `tests/agen/gerbang-bencana.test.mjs` butir 1–2 | `tests/agen/` | `npm run uji:agen` hijau |
| A6 | Pengerja `inti-layar` dan `pipa-umum` masuk roster; `milik` agen lama disunting supaya tidak ada berkas berpemilik ganda (ARSITEKTUR §9) | `scripts/agents/roster.json` | `gerbang-ilmu-agent` hijau |
| A7 | `sitemap.xml`, `robots.txt`, `llms.txt` (belum ada sama sekali) dibangkitkan dari registry; `noindex` untuk bencana `uji` disuntik `terapkanOg` | `scripts/umum/bencana.py`, `src/worker.js`, `src/og_meta.js` | Uji rute: berkas ada; halaman `uji` membawa meta robots |
| A8 | `src/bencana.generated.js` dibangkitkan dari `public/bencana.json` + gerbang kesamaan | `scripts/umum/bencana.py js`, `tests/agen/gerbang-bencana.test.mjs` | Gerbang butir 8 hijau |

## Tahap B: pustaka pipeline bersama

| # | Kerja | Berkas | Bukti selesai |
| --- | --- | --- | --- |
| B0 | Uji jangkauan sumber dari runner Actions dan dari Worker: BMKG (UA lengkap), MAGMA, USGS, GDACS, ArcGIS BNPB. Workflow sekali jalan `cek-sumber.yml` (manual), hasil per host ke log | `.github/workflows/cek-sumber.yml`, `scripts/umum/cek_sumber.py` | Tabel 200/403 per host per jalur; bila BMKG diblok dari Actions, jalur BMKG dipindah ke cron Worker sebelum modul gempa dimulai |
| B1 | `scripts/umum/wilayah.py` jadi satu-satunya salinan; `scripts/data/wilayah.py` dan `scripts/banjir/wilayah.py` jadi pembungkus impor satu baris, lalu dihapus setelah semua impor diganti | `scripts/umum/`, `scripts/data/`, `scripts/banjir/` | `grep -r "def Poligon"` hanya satu hasil; semua `uji` hijau |
| B2 | `jaring.py`, `simpan.py`, `waktu.py` dari `scripts/banjir/umum.py` + pola karhutla | `scripts/umum/` | Banjir dan karhutla memakai `simpan_json` yang sama; `dibuat` selalu kunci pertama |
| B3 | `uji.py` (kerangka self-check) | `scripts/umum/uji.py` | Dipakai minimal satu skrip karhutla dan satu banjir |
| B4 | Pindah data lintas bencana ke `public/data/umum/`: `peringatan.json`, `pusat_kec.json`, `iklim.json`; lama ditinggalkan sebagai salinan sementara sampai semua pembaca pindah | `scripts/banjir/peringatan.py`, `posko.py`, `public/informasi.js`, `public/databaru.js`, `sapa.js` | Lapor Warga karhutla tidak lagi membaca `banjir/data/` |
| B5 | `inarisk.py` dan `dibi.py` dari `scripts/banjir/bahaya.py` + `kejadian.py`, keluaran semua jenis bahaya ke `public/data/umum/` | `scripts/umum/` | Banjir membaca dari umum; jumlah baris DIBI sama sebelum/sesudah |
| B6 | `status.py`, `riwayat.py`, `posko.py`, `ujibalik.py`, `prospektif.py` umum; karhutla dan banjir dipindah satu per satu | `scripts/umum/` | Keluaran JSON identik byte demi byte sebelum/sesudah pemindahan (uji pembanding) |
| B7 | `berita.py` umum dengan kueri disuntik; karhutla tetap identik | `scripts/umum/berita.py` | Label uji karhutla: akurasi tidak turun |

## Tahap C: worker dan D1

| # | Kerja | Berkas | Bukti selesai |
| --- | --- | --- | --- |
| C1 | Migrasi `0009_rujukan.sql` (ARSITEKTUR §6.1): satu-satunya bangun ulang `laporan`/`foto`/`stat_hari`, dengan anak disalin ke tabel sementara dulu (BUKAN pola 0006 apa adanya: cascade FK akan mengosongkan `kontak`, `suara`, `foto_suka`, `foto_komentar`) | `migrations/` | `migrasi-idempoten` + `security-reviewer` lolos; uji pada salinan data produksi: jumlah baris SETIAP tabel induk dan anak sama sebelum/sesudah, trigger utuh, `PRAGMA foreign_key_check` kosong; ekspor cadangan diambil sebelum produksi |
| C2 | `HTML_RUTE`, regex tab, `SUMBER_STATUS`, `HAL` dibangun dari registry | `src/worker.js`, `src/statistik.js`, `public/statistik_publik.js` | Semua rute lama masih 200; uji rute hijau |
| C3 | Alih `/karhutla/*` → `/*` dan `/banjir/#tab` → `/banjir/<tab>` | `src/worker.js`, `public/banjir/index.html` | Uji alih |
| C4 | Migrasi `0010_kejadian_langsung.sql` + `src/jadwal.js` (pengatur satu menit dengan aturan jatuh tempo dari `jadwal_tugas`, ARSITEKTUR §5.4); dua cron lama tetap sampai C5 | `migrations/`, `src/jadwal.js`, `wrangler.jsonc` | Uji Miniflare: tugas jatuh tempo jalan, tugas yang terlewat satu tick tetap jalan di tick berikutnya, satu tugas gagal tidak menghentikan yang lain |
| C5 | Pindah dua cron lama ke pengatur; `gerbang-wrangler` diperbarui | `wrangler.jsonc`, `tests/agen/gerbang-wrangler.test.mjs` | FIRMS tetap masuk D1 tiap 3 jam di produksi (cek `/api/status`) |
| C6 | `foto.bahaya` + kategori dari tabel rujukan; galeri per bencana `?bahaya=` | `src/foto.js`, `public/foto.js` | `foto.test.mjs` diperluas dan hijau |

## Tahap D: inti layar (strangler)

Tiap baris dipindah dalam commit terpisah. Untuk tiap pemindahan: tangkapan layar desktop dan
375 px sebelum/sesudah di tab yang memakai fungsi itu, `ukur_muat.mjs` tidak naik > 5%.

| # | Modul | Pemakai pertama | Bukti selesai |
| --- | --- | --- | --- |
| D1 | `inti/format.js` (`esc`, `fmt`, `rp`, `rb`, `jamWIB`, `lalu`, `namaProv`) | Banjir, lalu karhutla | Definisi tingkat atas kembar hilang dari kedua HTML |
| D2 | `inti/muat.js` (`muatJSON`, keadaan muat/kosong/galat/luring) | idem | idem |
| D3 | `inti/tema.js` + token CSS bersama (`inti/dasar.css`) | idem | Satu kunci localStorage tema |
| D4 | `inti/tab.js` (banjir pindah dari hash ke URL bersih) | Banjir | Tab banjir punya URL bersih; tautan hash lama dialihkan |
| D5 | `inti/peta.js`, `inti/lapis.js`, `inti/panel.js`, `inti/rentang.js` | Banjir | — |
| D6 | `inti/insight.js`, `inti/tabel.js` | Banjir | Gaya kartu Insight sesuai memori pemilik |
| D7 | `inti/laci.js`, `inti/tren.js`, `inti/posko.js`, `inti/metode.js`, `inti/sapa.js` | Banjir, lalu karhutla | — |
| D8 | `gerbang-inti.test.mjs` dengan daftar pengecualian yang hanya menyusut | `tests/agen/` | Hijau |

## Tahap E: banjir naik kelas (urutan 1 di README)

Isi `docs/multi-bencana/bencana/banjir.md` dengan daftar periksa PAKET-FITUR, lalu tutup
celahnya. Celah yang sudah diketahui dari pemetaan:

| Kode paket | Celah | Rencana |
| --- | --- | --- |
| C21 | Tidak ada Dashboard pimpinan | `public/banjir/ringkasan.js` 6 bagian |
| C17, A33 | Tidak ada Berita | Kueri banjir/longsor/rob di `berita.py` umum |
| C20, A27 | Tidak ada Dampak | Dampak banjir: penduduk tergenang, sekolah, jalan putus, sawah, kerugian |
| C25 | Foto lapangan belum mengenal banjir | Kategori: genangan, arus, longsoran, rob, evakuasi, lainnya |
| A04, C12 | Tidak ada "kejadian aktif" | Kejadian banjir = kecamatan berstatus ≥ Siaga yang bersebelahan, digabung jadi satu kode `B0001`; laci dengan bagian setara karhutla |
| A32 | Tidak ada citra genangan | Sentinel-1 SAR tidak bisa dibaca stdlib dengan mudah: catat "diadaptasi" dengan Sentinel-2 sebelum/sesudah saat awan memungkinkan, atau "tidak berlaku" dengan alasan |
| A03 | Data hanya harian | Peringatan dini BMKG ke `kejadian_langsung` tiap 15 menit |
| C26 | Tidak ada pop-up situasi | Isi: kecamatan naik status, sungai di atas Q5, rob hari ini, peringatan BMKG |
| C02 | Tab hash | Selesai di D4 |
| C28 | OG hanya `/banjir/` | OG per provinsi dan per kejadian |

Setelah semua baris terisi dan ALUR tahap 12 lolos: `"status": "aktif"` untuk banjir.

## Tahap F: utang dokumen

| # | Kerja |
| --- | --- |
| F1 | Tulis dokumen yang dirujuk komentar kode tetapi tidak ada (`CITRA.md`, `DATABARU.md`, `LAPISAN5.md`, `OPERASI.md`, `PREVENTIF.md`, `RINGKASAN.md`, `KONSESI.md`), atau ubah komentarnya |
| F2 | Perbarui `AGENTS.md` §2 peta modul: tambah baris `inti`, `umum`, dan tiap bencana baru |

---

# Alur kerja per bencana

Dua belas tahap, dijalankan berurutan untuk tiap bencana. Tahap boleh dikerjakan paralel hanya
bila kolom "Butuh" sudah terpenuhi. Tiap tahap ditutup dengan bukti, bukan klaim (AGENTS.md §3.2):
pemeriksa adalah subagent baru tanpa riwayat pengerjanya.

| # | Tahap | Butuh | Pengerja | Pemeriksa | Keluaran | Bukti selesai |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Riset domain** | — | pengerja bencana | `validasi-model` | `scripts/<id>/RISET-SUMBER.md`, `RISET-STATUS.md` | Tiap sumber: URL, contoh respons tersimpan di `scripts/<id>/contoh/`, lisensi, frekuensi; tiap ambang status bersumber (peraturan/lembaga/jurnal) |
| 2 | **Spesifikasi** | 1 | pengerja | pemilik | `docs/multi-bencana/bencana/<id>.md`: daftar periksa PAKET-FITUR terisi rencana (dibuat/diadaptasi/tidak berlaku + alasan), definisi kejadian, status, lapisan, laci, insight, dampak, lapor warga, foto | **Disetujui pemilik** sebelum tahap 3 |
| 3 | **Registry dan rujukan** | 2 | `inti-layar` + `warga-api` | `migrasi-idempoten`, `guard-api` | Entri `public/bencana.json` berstatus `uji`; migrasi `00NN_<id>_rujukan.sql`; jenis laporan di `informasi_jenis.js`; roster agent | `uji:agen`, `uji:warga` hijau; `/<id>/` menjawab 200 dengan pita "versi uji" dan `noindex` |
| 4 | **Pipeline lambat** | 3 | pengerja | `validasi-model` | `scripts/<id>/*.py` untuk A01–A38 yang berlaku, semuanya dengan `uji`; workflow pemanggil `_pipa.yml` | Run workflow hijau; `public/<id>/data/meta.json` segar; `/api/status` memuat sumbernya |
| 5 | **Jalur cepat** (bila berlaku) | 3 | `warga-api` | `guard-api`, `security-reviewer` | `src/<id>.js`, tugas di pengatur cron, `GET /api/<id>/terbaru`, entri `cakupan.json` | Uji Miniflare hijau; latensi produksi kejadian baru → layar ≤ 2 menit di bawah beban `beban.mjs` |
| 6 | **Uji balik status** | 4 | pengerja | `validasi-model` | `public/<id>/data/validasi.json`, `RISET-UJI-BALIK.md` | Latih/validasi/uji per tahun; uji dibuka sekali; angka POD/FAR/CSI ditulis apa adanya walau jelek |
| 7 | **Layar inti** | 3, 4 | `inti-layar` + pengerja | `inp-reviewer`, `selera-angka` | `public/<id>/index.html` + modul: kepala, tab, peta, lapisan, panel, rentang, laci, legenda (C01–C15) | Tangkapan desktop + 375 px; tiap tab punya empat keadaan; nol galat konsol |
| 8 | **Analisis dan konten** | 6, 7 | pengerja | `selera-angka`, `validasi-model` | Insight, Tren, Berita, Dampak, Dashboard, Metode (C14–C22) | Tiap angka di layar = angka di JSON; tiap rumus punya bab Metode dengan contoh hitung dari data hari ini |
| 9 | **Respons** | 7 | pengerja | `validasi-model` | Posko, Sarana, Operasi, Keputusan, Simulasi bila berlaku (A21–A25, C19, C23) | Kesetaraan Python↔JS hijau |
| 10 | **Warga dan media** | 3, 7 | `warga-api` + pengerja | `security-reviewer`, `guard-api` | Lapor Warga, Foto (kategori + 100 dummy berlisensi domain), pop-up situasi, bagikan, OG (C24–C28) | `uji:warga` hijau; dummy 🧪/🧹 jalan; OG per rute dirender |
| 11 | **Bahasa dan kualitas** | 8–10 | pengerja | `selera-angka`, `inp-reviewer`, `higiene-repo` | `en-<id>.json`, glosarium, crawl kebocoran, `ukur_muat.mjs`, `beban.mjs` | Nol kebocoran; muatan awal ≤ anggaran; uji beban lolos |
| 12 | **Rilis** | 1–11 | sesi induk | semua pemeriksa terkait (konteks bersih) | Daftar periksa `bencana/<id>.md` 100% terisi; registry `aktif`; menu menampilkan bencana; sitemap/robots/llms.txt | `gerbang-bencana` butir 6–7 hijau; pemilik menyetujui di tangkapan layar |

## Aturan sepanjang alur

1. **Status resmi dulu.** Tahap 7 dan 8 wajib menampilkan status lembaga (BMKG/PVMBG/InaTEWS/BNPB)
   di atas indeks buatan sendiri, berlabel lembaga, dengan waktu terbitnya.
2. **Angka tanpa sumber tidak tayang.** Tiap angka di layar menyebut sumbernya di kaki kartu.
3. **Gagal terlihat.** Data basi diberi label umurnya; tidak pernah ditampilkan seolah segar.
4. **Commit kecil dengan path spesifik** (AGENTS.md §3.3). Fan-out penulis pakai worktree.
5. **Subagent tidak commit, push, atau deploy** (AGENTS.md §9). Sesi induk yang melakukannya.
6. **Pelajaran tiap bencana** ditulis ke `.claude/ilmu-agent/<pengerja>.md` lewat `ilmu.mjs kasus`
   dan, bila berlaku umum, ke `docs/multi-bencana/ALUR.md` bagian "Pelajaran" di bawah.

## Perkiraan ukuran kerja per bencana

Berdasarkan ukuran modul karhutla dan banjir. Satuan "sesi" = satu sesi kerja agent penuh.

| Tahap | Gempa | Gunung api | Cuaca | Kekeringan | Udara |
| --- | --- | --- | --- | --- | --- |
| 1–3 | 2 | 2 | 2 | 1 | 1 |
| 4–6 | 4 | 4 | 3 | 3 | 2 |
| 7–9 | 5 | 5 | 4 | 3 | 3 |
| 10–12 | 3 | 3 | 3 | 2 | 2 |
| **Jumlah** | **14** | **14** | **12** | **9** | **8** |

Fase 0 sendiri sekitar 12–16 sesi (tahap D paling besar karena strangler).

## Pelajaran

(Diisi setelah tiap bencana rilis.)

---

# Sumber data terbuka per bencana

Diverifikasi 15 Okt 2026 dari jaringan Mac pemilik, satu kali per endpoint, jeda 1,5 detik.
**Belum ada yang diuji dari runner GitHub Actions atau Cloudflare Workers**: itu wajib dilakukan
di ALUR tahap 1 sebelum workflow ditulis.

Tanda: **[OK]** HTTP 200 dan isi diperiksa · **[OK-hdr]** 200, isi belum diurai ·
**[AUTH]** butuh kunci/token gratis · **[BLOK]** gagal · **[BV]** belum diverifikasi (dari pengetahuan, jangan dibangun sebelum diambil sekali).

## 0. Temuan yang mengubah rancangan

1. **BMKG menolak UA pendek.** Semua `data.bmkg.go.id`, `api.bmkg.go.id`, `www.bmkg.go.id` menjawab
   `403 Forbidden` untuk `User-Agent: Mozilla/5.0`, dan 200 untuk UA peramban lengkap
   (`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36`).
   `scripts/umum/jaring.py` wajib mengirim UA lengkap untuk host BMKG. Belum diuji dari IP Actions.
   Karena ini menyamar sebagai peramban, beban ke BMKG dijaga sekecil mungkin: `If-None-Match` /
   `If-Modified-Since`, polling 1 menit hanya `autogempa.json`, berkas lain 5 menit, dan bila tetap
   diblok, hubungi BMKG untuk akses resmi alih-alih mencari cara menembus.
   Cadangan bila Actions diblok: panen BMKG lewat cron Worker, atau lewat Mac mini (pola panen Radar).
2. **MAGMA (PVMBG) tidak punya API JSON terbuka.** `magma.esdm.go.id/api/v1/...` menjawab 401.
   Halaman HTML publik bisa dipanen tetapi rapuh. Modul gunung api harus menganggap pemanen ini
   bisa patah kapan saja: `uji` dengan contoh HTML tersimpan, dan cadangan GDACS.
3. **ReliefWeb v1 mati (410).** v2 butuh `appname` yang didaftarkan lewat formulir.
4. **OpenAQ v3 butuh `X-API-Key` (gratis).** WAQI butuh token gratis dan melarang redistribusi data massal.
5. **ArcGIS BNPB terbuka tanpa login**: `https://gis.bnpb.go.id/server/rest/services?f=json` [OK],
   folder `inarisk`, `inarisk_darurat`, `Bencana_Harian`, `Bencana_Mingguan`,
   `TSUNAMI_DAN_GELOMBANG_TINGGI`, `InAWARE`, `Gunung_Semeru`, `Gunungapi_Merapi`,
   layanan `Kejadian_Bencana_Mingguan` (FeatureServer). Ini calon sumber bersama uji balik semua bencana.

## 1. Gempa bumi

| Sumber | URL | Format / frekuensi | Ketentuan | Status |
| --- | --- | --- | --- | --- |
| BMKG gempa terbaru M5+ | https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json | JSON, detik–menit setelah kejadian | Data terbuka BMKG, sebut BMKG | [OK] (UA lengkap) |
| BMKG 15 gempa M5+ terakhir | https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json | JSON | idem | [OK] |
| BMKG 15 gempa dirasakan | https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json | JSON, termasuk M kecil (mis. M2,7) | idem | [OK] |
| BMKG peta guncangan | `https://static.bmkg.go.id/<Shakemap>` (contoh `20261015223238.mmi.jpg`) | JPG | idem | pola URL [BV] |
| USGS FDSN | https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=-11&maxlatitude=6&minlongitude=95&maxlongitude=141&minmagnitude=5 | GeoJSON/CSV, sejak 1900 | Domain publik AS | [OK] |
| USGS umpan ringkas | https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson | GeoJSON, tiap menit | idem | [OK] |
| USGS hitung | `.../fdsnws/event/1/count?starttime=2000-01-01&...&minmagnitude=4.5` | teks | idem | [OK] = 26.004 kejadian M4,5+ sejak 2000 |
| EMSC SeismicPortal | https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=1&minlat=-11&maxlat=6&minlon=95&maxlon=141 | GeoJSON | Gratis, sebut EMSC | [OK] |
| USGS ShakeMap | `properties.detail` → `products.shakemap` (`cont_mmi.json`, `grid.xml`) | JSON/XML | idem | [BV] |

Kolom BMKG: `Tanggal`, `Jam`, `DateTime` (ISO UTC), `Coordinates`, `Lintang`, `Bujur`, `Magnitude`
(teks), `Kedalaman` (teks berakhiran "km"), `Wilayah`, `Potensi` (teks tsunami), `Dirasakan`
(MMI per tempat, mis. "III Darajat"), `Shakemap`.
Kolom USGS: `mag`, `place`, `time` (ms epoch), `mmi`, `cdi`, `alert` (PAGER), `tsunami`, `sig`,
`magType`, `ids`, `detail`, kedalaman di geometri.

## 2. Tsunami

| Sumber | URL | Catatan | Status |
| --- | --- | --- | --- |
| Kolom `Potensi` BMKG | autogempa.json | Hanya teks "tidak berpotensi tsunami" / "berpotensi tsunami" | [OK] |
| InaTEWS | https://inatews.bmkg.go.id/ | Halaman peringatan | [BV] |
| PTWC (NOAA) Atom | https://www.tsunami.gov/events/xml/PHEBAtom.xml | Atom, saring judul untuk wilayah Indonesia | [OK] |
| InaRISK bahaya tsunami | `https://gis.bnpb.go.id/server/rest/services/inarisk` dan folder `TSUNAMI_DAN_GELOMBANG_TINGGI` | `MapServer/<id>/query?where=1=1&f=geojson` | folder [OK], id lapisan [BV] |
| GDACS | https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ | Bendera tsunami pada gempa | [OK] |

## 3. Gunung api

| Sumber | URL | Format | Status |
| --- | --- | --- | --- |
| MAGMA informasi letusan | https://magma.esdm.go.id/v1/gunung-api/informasi-letusan | HTML ±50 KB; rincian `.../<uuid>/show` | [OK] dipanen HTML |
| MAGMA VONA | https://magma.esdm.go.id/v1/vona | HTML | [OK] dipanen HTML |
| MAGMA API | https://magma.esdm.go.id/api/v1/home/gunung-api | JSON | [AUTH] 401, prosedur token tidak terdokumentasi |
| Daftar level I–IV | https://magma.esdm.go.id/v1/gunung-api/ | HTML | [BV] |
| Peta KRB | MAGMA (PDF) dan folder BNPB `Gunung_Semeru`, `Gunungapi_Merapi` | PDF / MapServer | folder [OK], poligon KRB [BV] |
| GVP WFS katalog letusan | https://webservices.volcano.si.edu/geoserver/GVP-VOTW/wms?service=WFS&version=1.0.0&request=GetFeature&typeName=GVP-VOTW:E3WebApp_Eruptions1960&outputFormat=application/json | GeoJSON | [OK-hdr] |
| GVP RSS mingguan | https://volcano.si.edu/news/WeeklyVolcanoRSS.xml | RSS | [BLOK] 403 |
| GDACS gunung api | https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=VO&country=Indonesia | GeoJSON | [OK] (Krakatau Oranye 4 Sep 2026) |
| VAAC Darwin | https://www.bom.gov.au/products/IDD41300.shtml | teks | [BV] (301) |
| Angin lapisan atas | Open-Meteo `wind_speed_700hPa`, `500hPa`, `300hPa` | JSON | [OK] (layanan yang sama) |
| Sentinel-5P SO2, MIROVA | Copernicus Data Space; mirovaweb.it | NetCDF / tanpa API | [BV], dilewati untuk stdlib |

## 4. Cuaca ekstrem, angin, siklon, gelombang tinggi

| Sumber | URL | Format | Status |
| --- | --- | --- | --- |
| BMKG nowcast RSS | https://www.bmkg.go.id/alerts/nowcast/id | RSS 2.0, tiap 10–30 menit | [OK] |
| BMKG CAP per peringatan | `https://www.bmkg.go.id/alerts/nowcast/id/<KODE>_alert.xml` (dari `<link>` RSS) | CAP 1.2 dengan `<polygon>` | pola [OK], isi [BV] |
| BMKG prakiraan | https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=31.71.03.1001 | JSON per kelurahan, 3-jaman 3 hari | [OK] |
| Open-Meteo prakiraan + ERA5 | https://api.open-meteo.com/v1/forecast, https://archive-api.open-meteo.com/v1/archive | JSON | [OK]; nonkomersial 10.000 panggilan/hari |
| IBTrACS | https://www.ncei.noaa.gov/data/international-best-track-archive-for-climate-stewardship-ibtracs/v04r01/access/csv/ibtracs.WP.list.v04r01.csv (juga `SP`, `SI`) | CSV 6-jaman | [OK]; domain publik |
| GDACS siklon | `eventlist=TC` | GeoJSON | [OK] |
| JTWC | metoc.navy.mil | teks | [BLOK] 403 |
| TCWC Jakarta | https://www.bmkg.go.id/cuaca/siklon-tropis | halaman | [BV], tanpa umpan mesin |
| Open-Meteo Marine | https://marine-api.open-meteo.com/v1/marine?latitude=-8&longitude=115&hourly=wave_height | JSON (tinggi, periode, arah gelombang, swell) | [OK] |
| BMKG Maritim | https://maritim.bmkg.go.id/ | PDF/gambar | [BV]; sudah dipanen sebagian di `scripts/banjir/peringatan.py` dan `rob.py` |

## 5. Tanah longsor (bagian modul banjir)

| Sumber | URL | Status |
| --- | --- | --- |
| Open-Meteo hujan + kelembapan tanah | API yang sudah dipakai | [OK] |
| GPM IMERG | https://gpm1.gesdisc.eosdis.nasa.gov/data/GPM_L3/GPM_3IMERGHHL.07/ | [AUTH] Earthdata, HDF5 (berat untuk stdlib) |
| NASA LHASA | https://gpm.nasa.gov/data/landslides | [BLOK] 404, portal pindah |
| PVMBG prakiraan gerakan tanah | https://vsi.esdm.go.id/ | [BV], PDF bulanan |
| InaRISK longsor | `gis.bnpb.go.id/server/rest/services/inarisk` | folder [OK] |

## 6. Kekeringan

| Sumber | URL | Status |
| --- | --- | --- |
| BMKG HTH | halaman lama 404 | [BLOK]; hitung HTH sendiri dari hujan harian |
| CHIRPS harian 0,05° | https://data.chc.ucsb.edu/products/CHIRPS-2.0/global_daily/tifs/p05/ | [OK]; GeoTIFF `.tif.gz`, domain publik, jeda ±2 hari |
| ONI | https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt | [OK] (sudah dipakai `iklim.py`) |
| SOI | https://www.cpc.ncep.noaa.gov/data/indices/soi | [OK-hdr] |
| DMI (IOD) | https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/dmi.had.long.data | [OK] |
| Kelembapan tanah ERA5 | archive-api.open-meteo.com `soil_moisture_0_to_7cm` | [OK] |

## 7. Kualitas udara

| Sumber | URL | Status |
| --- | --- | --- |
| Open-Meteo Air Quality (CAMS) | https://air-quality-api.open-meteo.com/v1/air-quality?latitude=-6.2&longitude=106.8&hourly=pm10,pm2_5 | [OK]; juga `us_aqi`, `carbon_monoxide`, `dust`, `aerosol_optical_depth`; sudah dipakai `scripts/data/asap.py` |
| WAQI/AQICN | https://api.waqi.info/feed/<kota>/?token=<token> | [AUTH] token gratis; larang redistribusi massal |
| OpenAQ v3 | https://api.openaq.org/v3/locations | [AUTH] kunci gratis |
| ISPU KLHK | https://ispu.menlhk.go.id/ | [BLOK] habis waktu |

## 8. Lintas bencana

| Sumber | URL | Status |
| --- | --- | --- |
| GDACS | https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS4APP dan `SEARCH?eventlist=EQ;TC;VO;FL;DR&country=Indonesia` | [OK]; kolom `alertlevel`, `alertscore`, `glide`, `severitydata`; sebut GDACS/EC JRC |
| BNPB ArcGIS | https://gis.bnpb.go.id/server/rest/services?f=json, `Kejadian_Bencana_Mingguan/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson` | [OK] root; kolom layanan [BV] |
| BNPB DIBI | https://dibi.bnpb.go.id/ | 301; sudah dipanen lewat Superset tamu di `scripts/banjir/kejadian.py` |
| ReliefWeb v2 | https://api.reliefweb.int/v2/disasters?appname=<terdaftar> | [AUTH] |
| Copernicus EMS | https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations/ | [BV] |

## 9. Boleh dipublikasi ulang?

Wajib diisi sebelum sumber dipakai di layar publik.

| Sumber | Boleh tayang ulang | Syarat |
| --- | --- | --- |
| BMKG (data terbuka) | Ya | Sebut BMKG |
| USGS, IBTrACS, CPC/PSL NOAA, PTWC | Ya | Domain publik AS; sebut sumber |
| EMSC | Ya | Sebut EMSC |
| GDACS | Ya | Sebut GDACS/EC JRC |
| Open-Meteo (termasuk CAMS, Marine) | Ya, nonkomersial | Sebut Open-Meteo dan penyedia model (ECMWF/Copernicus) |
| BNPB ArcGIS / InaRISK / DIBI | Ketentuan tidak tertulis | Sebut BNPB; tanyakan bila dipakai massal |
| MAGMA / PVMBG (HTML) | Tidak ada lisensi terbuka | Atribusi eksplisit PVMBG, tautan ke halaman asli, ikuti kebijakan situsnya; tanyakan izin tertulis sebelum rilis |
| WAQI | Terbatas | Hanya nilai terkini bertaut; dilarang redistribusi massal; tidak disimpan sebagai seri |
| OpenAQ | Ya | Sebut OpenAQ dan pemilik stasiun |
| ReliefWeb | Ya | Atribusi UN OCHA; periksa hak cipta per item |
| Wikimedia Commons (foto dummy) | Ya | Lisensi per berkas di `kredit.json` |

## 10. Rahasia yang dibutuhkan

| Nama | Untuk | Tempat |
| --- | --- | --- |
| `OPENAQ_KEY` | Validasi udara | Secret GitHub Actions |
| `WAQI_TOKEN` | Stasiun kota (tampil dengan atribusi, tanpa redistribusi massal) | Secret Actions |
| `RELIEFWEB_APPNAME` | Laporan kemanusiaan | Secret Actions |
| `EARTHDATA_TOKEN` | Hanya bila IMERG diputuskan dipakai | Secret Actions |

Tidak satu pun boleh masuk berkas yang dilacak git (AGENTS.md §9).

---

# Peta: cetak biru karhutla dan cara menirunya per bencana

Dipetakan dari kode 16 Okt 2026 (`public/index.html`, `public/lapisan5.js`, `public/databaru.js`,
`public/foto.js`, `public/i18n.js`, `public/banjir/index.html`). Nomor baris merujuk pohon kerja saat itu.

Prinsip pemilik yang berlaku (Buku Pegangan Utama bab 24 "Peta dan wilayah", bab 3 "Tiru layar X
berarti tiru modelnya"): **tiru modelnya, bukan satu detail yang paling gampang**. Sebelum menyentuh
kode peta bencana baru, tulis daftar perbedaan lengkap antara peta karhutla dan peta bencana itu,
lalu kerjakan semuanya sekaligus.

## 1. Kondisi sekarang

- Peta karhutla adalah satu skrip inline besar di `public/index.html` dengan objek global `Peta`
  (`:1771`), `Lapis` (`:2002`), `Angin` (`:2130`), `Kini` (`:2205`), `Laci` (`:2637`), `Riwayat`
  (`:3059`), `Sim` (`:5832`) dan fungsi `renderLegenda`, `garisWaktu`, `nanti`, `kartuTip`,
  `tampilTip`, `muatJSON`, `gradasi`, `gambarGrid`.
- Modul tambahan (`lapisan5.js`, `databaru.js`, `foto.js`, `citra.js`, `konsesi.js`, dst.) dimuat
  sesudahnya dan **membungkus** fungsi inti (`renderLegenda`, `Laci.buka`, `Sim.*`), tidak
  menyuntingnya. Pola ini dipertahankan.
- `public/banjir/index.html` menyalin sekitar 60% inti peta dengan tangan dan sudah menyimpang:
  padding tetap 430 (bukan diukur), tanpa kartu hover, tanpa gelembung prioritas, tanpa muat
  malas lapisan, tanpa ubin lapisan, tanpa naik tingkat otomatis saat zoom keluar, tanpa batas
  ambang legenda. **Ini bukti kenapa inti peta harus jadi satu rumah sebelum bencana ketiga.**

## 2. Arsitektur target: `public/inti/peta/`

Dipecah dari karhutla dengan pola strangler (FASE-0 tahap D5). Tiap berkas satu tanggung jawab,
API-nya dibaca semua bencana.

| Berkas | Isi (asal di karhutla) | API |
| --- | --- | --- |
| `dasar.js` | `DASAR()` OpenFreeMap positron/dark (`:1770`), opsi peta (`:1773-1777`): center/zoom per registri, minZoom 3, maxZoom 15, tanpa rotasi, Navigation + Scale kanan bawah, laju zoom roda (`:1945`), `BB_ID` + `petaIndonesia()` + `padRuang()` (`:2176-2180`), `gantiDasar()` dengan `setStyle(..., {diff:false})` (`:1783`) yang memicu `style.load` lalu `pasang()` ulang, raster satelit Esri (`:1789-1791`), `lapisAwal()` (`:1784`) | `buatPeta(el, opsi)`, `gantiDasar()`, `bingkaiIndonesia()`, `padRuang()` |
| `wilayah.js` | Choropleth 3 tingkat (`aturWilayah` `:1913-1929`): geometri `geo/provinsi.json` + `geo/{kabupaten,kecamatan}/{prov}.json` dimuat saat perlu dan dimemo; nilai ditulis ke **properties** (`v`, `lv`), feature-state hanya untuk hover (`promoteId:"id"`); turun tingkat lewat popup Zoom/Rincian (`pilihWilayah` `:2183`, `turun` `:2200`), naik tingkat otomatis saat zoom keluar (`:1949-1951`), remah roti (`renderCrumb` `:2233`) | `pasangWilayah({nilai(kunci), skala, warnaLv})`, `turun(kunci)`, `naik()` |
| `kartu.js` | `kartuTip` (`:1609-1611`) kartu hover berlambang, ubin angka, daftar, tren, kaki; `tampilTip` (`:1619`), `wadahTip` (pindah ke `<dialog>` aktif); HTML dibangun ulang hanya bila id berubah | `kartuTip(spec)`, `tampilTip(e, html)` |
| `gelembung.js` | Dua pola: (a) **klaster MapLibre** untuk kejadian prioritas (`:1823-1835`): `cluster:true`, `clusterRadius 38`, `clusterMaxZoom 7`, hover `getClusterLeaves(id,8)` dicache, klik `fitBounds` ke daun; (b) **gelembung bertabrakan** untuk peringkat (`riw-bubble` `:3093-3101`): gambar kanvas `rb0..rb3`, `symbol-sort-key: 100 - skor`, overlap bawaan false sehingga angka tidak pernah bertumpuk, nama lapis terpisah `text-optional` | `pasangKlaster(id, data, spec)`, `pasangGelembungSkor(id, data, spec)` |
| `lapis.js` | Panel `#lapis` (`:1515-1545`): `<details>` per kelompok, `<label><input data-l>`; ubin (`ubinLapis` `:2509-2515`, `UBIN`, `UBIN_IK`, `UBIN_PENDEK`) + `MutationObserver`; handler change (`:2521-2532`) dengan muat malas lewat `nanti(() => pasang(k))`, saling-kecuali (asap/pm10); **visibilitas tidak disimpan**; cara modul menambah kelompok (`lapisan5.js:27-35, 150-159`): `sisipKotak`, listener fase capture yang mengklaim kuncinya, `pasangSatu` malas, pasang ulang di `style.load` | `daftarLapis({kelompok, kunci, nama, ikon, pasang, lihat, legenda})` |
| `legenda.js` | `renderLegenda` (`:2561-2605`): hanya lapisan yang menyala **dan** terlihat di zoom sekarang; skala kontinu dari `gradasi`; kolom `.lg-g`; tinggi bisa ditarik; tertutup di HP; dirender ulang hanya saat zoom melewati `AMBANG` (`:1946`) | `daftarLegenda(kunci, fnHtml, ambangZoom)` |
| `waktu.js` | Dua pemilih terpisah (`:1509`): `#rentang` untuk pengamatan yang sudah terjadi (`RENTANG` `:2477-2488`, label relatif, disimpan `localStorage`), `#garisWaktu` untuk hari prakiraan (`:2545-2560`, muncul hanya bila lapisan prakiraan menyala, `updateImage`/`setData` per hari) | `pasangRentang(pilihan, onUbah)`, `pasangGarisWaktu(hari, onUbah)` |
| `kisi.js` | Lapisan kisi sebagai `image` source dari kanvas (`fwiGambar` `:1885`, `gambarGrid` `:2095`, `gambarAsap` dengan tepi berbulu `:2113`), permukaan kepadatan `Kini` (`:2205-2230`: kisi 0,1°, dua box blur 3×3, warna log, upscale ×3 blur 2px) | `gambarKisi(sel, skala, opsi)`, `permukaanKepadatan(titik)` |
| `angin.js` | `Angin` (`:2130-2173`): kanvas partikel 3.500 (1.500 di HP), umur 110 frame, jejak `destination-in` 0,93, bilinear `di()`, bersih di `movestart`, putih saat gelap/satelit, cadangan panah statis untuk `prefers-reduced-motion` | `pasangAngin(medanUV)` |
| `laci.js` | `Laci.buka(id)` (`:2638-2699`): buka tab peta, `<details class="lipat">` per bagian, sorot garis kejadian, `fitBounds` berpadding panel, pindah ke `#dlgLaci` saat dari tab lain, tautan `/<rute>/k/<id>` | `pasangLaci({bagian[], sorot, bingkai})` |
| `klik.js` | Satu handler klik global berprioritas (`:1974-1990`): klaster → kejadian (kotak ±6px) → posko → titik (zoom ≥ 8) → lapisan ber-handler sendiri → wilayah; modul memakai `klikSekali` (`lapisan5.js:132-135`) | `daftarKlik(prioritas, lapisanIds, fn)` |
| `foto.js` | Sudah bersama (`public/foto.js:117-150`): penanda HTML berkelompok menurut zoom (prov < 6,2, kab < 8,6, kec < 11,2), maks 160, `bounds.pad(.2)`, debounce 120 ms | sudah ada; tambah `?bahaya=` |
| `sim.js` | Peta kedua `#simPeta` (`:5835-5845`) dengan `DASAR()` sama, gambar hasil sebagai `image` `raster-resampling: nearest`, penggeser waktu `updateImage`, desa memerah lewat `case eta <= t`. Mesin fisikanya khas karhutla dan TIDAK masuk inti | `buatPetaSim(el)`, `gambarHasil(kanvas, bbox)` |

Aturan inti yang dibawa semua bencana:

- `nanti(fn)` (`:1599-1600`) untuk semua kerja berat sesudah klik (INP).
- `setData` / `updateImage` dibanding membuang-pasang ulang.
- Muatan bertingkat: data 24 jam dulu, 72 jam/7 hari saat diminta; atribut kejadian dulu, poligon belakangan.
- `style.load`, bukan `load`; warna bergantung tema dipanggang saat `addLayer`, karena itu pasang ulang penuh saat tema berganti.
- i18n kontrol peta otomatis lewat `i18n.js:131-142` asalkan `i18n.js` dimuat sebelum MapLibre.
- Tiap `fitBounds` memakai padding terukur (`kiriPad` `:2195`, `padRuang`) dan batas maxZoom per jenis (wilayah 11, kecamatan 12, kejadian 12,5, klaster 9,5).
- Dari Buku Pegangan Utama bab 24 (berlaku walau MBG memakai Leaflet): peta menjawab sebaran
  nasional, tidak disaring cakupan kursi; jenis dibedakan bentuk, bukan dua warna; satu warna untuk
  semua entitas sejenis (tingkat jadi lencana di popup, bukan warna pin); titik tanpa koordinat ikut
  tabel tetapi tidak digambar; legenda di kaki peta, entrinya diturunkan dari daftar yang dipakai;
  popup dua kolom tanpa baris kedua dan tanpa teks terpotong; aksi di popup dititipkan lewat
  `closest('[data-aksi]')`; ubin cadangan bertukar sesudah beberapa kegagalan, bukan satu; berkas
  `geo/*.json` tidak pernah dijaga login; kegagalan satu lapis tidak menghapus seluruh peta.

## 3. Peta per bencana

Semua bencana memakai inti di atas. Tabel ini adalah daftar perbedaan yang wajib ditulis sebelum
kode (aturan "tiru modelnya").

| Komponen peta | Karhutla (rujukan) | Gempa & tsunami | Cuaca + gelombang | Udara | Gunung api | Kekeringan | Banjir (naik kelas) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Lapisan pengamatan | `titik` warna menurut umur jam | `gempa` lingkaran ukuran M (log), warna kedalaman (dangkal merah, menengah oranye, dalam biru); susulan titik kecil; umur memudar 24/72 jam | poligon CAP BMKG (warna dan kata asli BMKG) | stasiun terukur (titik bercincin) | gunung berikon segitiga, warna level PVMBG resmi | — (data area, bukan titik) | sungai GloFAS, gauge rob |
| Kejadian aktif | kompleks api, poligon + titik pusat + klaster prioritas | isoseismal bertingkat (poligon MMI), titik episentrum bintang | sel ekstrem (poligon gabungan kecamatan), lintasan siklon (garis + kerucut) | poligon episode | radius rekomendasi (lingkaran km), KRB I/II/III, kerucut abu | poligon kompleks kekeringan | poligon kejadian banjir `B` |
| Klaster prioritas | `prio` klaster MapLibre | gempa ≥ M5 72 jam diklaster bila bertumpuk (Sulawesi/Maluku padat) | CAP Awas | kota Berbahaya | gunung Level III–IV | kompleks Awas | kejadian Awas |
| Choropleth wilayah | jumlah titik (step `SKALA_WIL`) | tingkat Pantau Bencana 72 jam (`match lv`) | tingkat (`match lv`) | ISPU 24 jam perkiraan (`step`) | turunan level resmi (kecamatan dalam radius/KRB) | kelas HTH/SPI | tingkat status (sudah ada) |
| Kisi kontinu | FWI, asap, PM10, hujan (`image`) | perkiraan MMI kisi (`image`) | embusan, CAPE, hujan per jam, tinggi gelombang | PM2,5, PM10, CO, AOD, debu | angin 700/500/300 hPa | HTH, SPI-1/3/6, kelembapan tanah | hujan, ansambel |
| Partikel angin | `Angin` dari `fwi.json` | — | ya, embusan | ya, 850 hPa (arah asap) | ya, lapisan atas | — | ya (sudah dari `databaru.js`) |
| Gelembung peringkat | `riw-bubble` skor riwayat | skor riwayat gempa | skor riwayat puting beliung | skor episode | skor riwayat letusan | skor riwayat kekeringan | sudah ada |
| Garis waktu prakiraan | 4 hari FWI | 7 hari peluang susulan | 72 jam per jam | 4 hari CAMS | 72 jam angin | 1–3 bulan prospek | 6 hari hujan |
| Rentang pengamatan | hari ini / kemarin / 72 jam / 7 hari | 24 jam / 72 jam / 7 hari / 30 hari | aktif / 24 jam / 7 hari | hari ini / 7 hari / 30 hari | 24 jam / 7 hari / 30 hari | 30 / 90 / 180 hari | hari ini / 7 hari |
| Lapisan statis | gambut, kawasan, konsesi, kanal, jalan | sesar aktif, InaRISK gempa & tsunami, zona subduksi | InaRISK cuaca, pelabuhan, alur pelayaran | kawasan industri, PLTU (bila data terbuka) | KRB, desa, jalur evakuasi, bandara | waduk, sawah, InaRISK kekeringan | sudah ada |
| Lintas modul | — | — | — | kompleks api karhutla (tautan `/k/K…`) | — | titik panas karhutla | — |
| Simulasi | FBP + Dijkstra 72 jam | isoseismal "bagaimana kalau" (titik + M + kedalaman) | T (diganti grafik per titik) | geser arah angin | kerucut abu dengan tinggi kolom pilihan | hujan X mm dalam 30 hari | sudah ada (aturan status) |
| Klik prioritas | klaster → kompleks → posko → titik → wilayah | klaster → gempa → isoseismal → posko → wilayah | CAP → sel → wilayah | episode → stasiun → wilayah | gunung → kerucut → wilayah | kompleks → wilayah | kejadian → sungai → rob → wilayah |
| Status resmi di peta | — | pita tsunami BMKG/PTWC di atas peta | poligon CAP berlabel BMKG | stasiun KLHK bila pulih | warna level PVMBG apa adanya | buletin BMKG bila bisa dipanen | peringatan BMKG |

## 4. Gerbang peta

| Gerbang | Menolak |
| --- | --- |
| `tests/agen/gerbang-inti-peta.test.mjs` | Definisi ulang tingkat atas fungsi yang sudah ada di `public/inti/peta/*` (ratchet untuk karhutla/banjir, nol untuk bencana baru) |
| idem | Lapisan yang menyala tanpa entri legenda; glif popup tanpa entri legenda tingkat titik |
| idem | `setStyle` tanpa `{diff:false}`; `fitBounds` tanpa padding terukur atau tanpa maxZoom |
| idem | Saringan cakupan kursi di berkas peta (peta menjawab sebaran nasional) |
| `tests/agen/gerbang-geo.test.mjs` | Kode wilayah tanpa berkas geo, berkas geo kosong, berkas provinsi > 700 KB (naikkan penyederhanaan, bukan ambang) |
| `inp-reviewer` (pemeriksa) | Handler klik/geser peta yang tidak lewat `nanti()` |

---

# Pelatihan model: kerangka bersama dan rencana per bencana

Dipetakan dari kode 16 Okt 2026: `scripts/sebaran/**` (`lacak.py`, `cuaca.py`, `fitur.py`,
`latih.py`, `latih_jalan.py`, `gbdt.py`, `lolos.py`, `kasus.py`, `galat.py`, `pendorong.py`,
`prospektif.py`, `uji_js.py`, `SEBARAN_MODEL.md`), `public/sebaran_model.js`,
`public/data/model_sebaran.json`, `scripts/data/pfvi.py`, `scripts/banjir/uji_balik.py`.

## 1. Apa yang sudah ada di karhutla

| Tahap | Berkas | Ringkasan | Jalan di |
| --- | --- | --- | --- |
| Pelacak kejadian | `lacak.py` | VIIRS S-NPP → peristiwa (union-find ≤ 750 m, ≤ 24 jam), `peristiwa.jsonl` 285 MB | lokal |
| Cuaca historis | `cuaca.py` | ERA5 per jam per (tahun, sel 0,5°), kuota `SEBARAN_KUOTA` 6.500, satu berkas per pasangan (±1.625), ENSO/IOD; meminjam `scripts/banjir/umum.py` lewat importlib | lokal |
| Fitur | `fitur.py` | 40 fitur dalam 11 kelompok (geometri api, angin, kekeringan/FWI, keadaan api, gambut, kawasan, konsesi, akses, riwayat, iklim, lintasan) | pustaka |
| Dataset | `latih.py bangun` | unit (peristiwa, jangkar), calon sel radius R=5, label "terbakar baru dalam 24 jam"; sampling berbobot 1/P, RNG `crc32(id)` deterministik → `sampel.pkl` 290 MB | lokal |
| Pembagian | `latih.py:36` | latih 2015–2022, validasi 2023, uji 2024–2026 dibuka sekali; 474k/79k/194k baris | — |
| Algoritma | `gbdt.py` | logistik Newton + GBDT stdlib (biner kuantil ≤ 32, gain Newton, subsample 0,5, monoton & fokal opsional), pohon datar `[fitur, ambang, kiri, kanan]` | — |
| Penyetelan | `latih_jalan.py` | kisi kedalaman × pohon pada logloss validasi (terpilih 4 × 150, lr 0,1), kurva belajar, ablasi kelompok, pemangkasan ditolak, ambang `tau` F1 (0,08), pembanding fisika (Rothermel, McArthur, CSIRO Vesta, elips angin) | lokal ±55 menit |
| Strata | `latih.py:175` | gambut / mineral / sabana, geser logit per strata | — |
| Kalibrasi | `latih_jalan.py`, `lolos.py` | Platt (`kal_lepas`, `lolos.platt`), CQR P10/P90 (`selang.q`) | — |
| Model kedua | `lolos.py` | "akan membesar" ≥ 10 sel dalam 72 jam, CV tinggal-satu-tahun 2015–2023, ambang recall ≥ 70% | lokal |
| Analisis | `kasus.py`, `galat.py`, `pendorong.py`, `musim_awal.py`, `cerita_data.py` | 123 kasus tanpa bocoran, galat, pendorong, tren | lokal |
| Ekspor | `public/data/model_sebaran.json` 242 KB | `fitur`, `bias`, `pohon`, `tau`, `kal_lepas`, `geser_logit`, `pilihan_strata`, `kinerja_uji`, `selang`, `lolos`, `lolos_ulang` | — |
| Evaluator peramban | `public/sebaran_model.js` | `window.SebaranModel.ramal()` Monte Carlo 40–200, P10/P50/P90, validasi masukan | peramban |
| Kesetaraan | `uji_js.py` | node `vm`, maks \|Δp\| < 1e-4 sel, < 1e-6 lolos | lokal |
| Prospektif | `prospektif.py` | `ramalan.jsonl` append-only tiap 3 jam, dinilai 72 jam kemudian di `nilai.jsonl`, ringkasan `public/data/prospektif.json` | CI `titik.yml` |
| Uji balik aturan | `scripts/banjir/uji_balik.py` | unit kabupaten-hari, POD/FAR/CSI/PSS/ETS, pilih pada 2016–2021, uji 2022–2025, terima hanya bila CI 95% bootstrap blok berpasangan ΔETS > 0 | lokal |

### Temuan yang harus dibereskan sebelum disalin

1. **Strata sabana tidak sama di dua bahasa.** Python mendefinisikan sabana sebagai provinsi 53/93
   bukan gambut (`latih.py:175`); peramban memakai kotak lat/lon (`sebaran_model.js:157`).
2. **Pilihan McArthur untuk sabana tidak pernah dipakai peramban.** `pilihan_strata` memilih
   McArthur untuk sabana, tetapi `ramal()` hanya menerapkan `geser_logit`. Angka kinerja sabana di
   layar karena itu bukan model yang diuji. Diperiksa `validasi-model`, dibetulkan `model-sebaran`,
   dan kesetaraannya ditambahkan ke `uji_js.py`.
3. **Prospektif masih 0 tercatat/dinilai** (inventaris 15 Okt). Pastikan langkah CI-nya benar-benar
   mencatat sebelum pola ini disalin ke bencana lain.

## 2. Kerangka bersama `scripts/umum/latih/`

Dipindah dari karhutla tanpa mengubah perilaku (bukti: keluaran model karhutla identik byte demi
byte sebelum/sesudah pemindahan).

| Modul | Isi | Asal |
| --- | --- | --- |
| `gbdt.py` | LR + GBDT stdlib, pohon datar, `auc`, `logloss`, `brier`, `reliabilitas` | dipindah utuh dari `scripts/sebaran/gbdt.py` |
| `dataset.py` | Kerangka `bangun()`: iterasi unit dengan `multiprocessing`, RNG per unit `crc32`, batas positif/negatif berbobot invers peluang, pickle `{kolom, X, y, w, th, eid}`. Tiga fungsi disuntik per bencana: `unit_iter()`, `label(unit)`, `fitur(unit)` | `latih.py:148` |
| `bagi.py` | `bagian(tahun)` latih/validasi/uji, CV tinggal-satu-tahun, model lipat untuk hindcast | `latih.py:36`, `lolos.py`, `kasus.py` |
| `setel.py` | Kisi kedalaman × pohon, kurva belajar, ablasi kelompok dengan rollback, pencarian ambang, geser logit per strata, latih ulang semua tahun, ekspor | `latih_jalan.py` |
| `kalibrasi.py` | Platt, ambang target recall, CQR | `lolos.py`, `latih_jalan.py` |
| `verifikasi.py` | Kontingensi POD/FAR/CSI/PSS/ETS, bootstrap blok berpasangan | `scripts/banjir/uji_balik.py` |
| `ekspor.py` | Kontrak JSON model: `versi`, `dibuat`, `jenis`, `fitur`, `bias`, `pohon`, `platt`, `ambang`, `kinerja_uji`, `catatan`, `strata` | `model_sebaran.json` |
| `prospektif.py` | Pencatat append-only + `ringkas()` (recall, presisi, AUC, Brier, per bulan, per strata) | `scripts/sebaran/prospektif.py` |
| `cuaca_arsip.py` | Pengambil ERA5 berkuota dan berbobot dengan cache per sel | `scripts/sebaran/cuaca.py` + `scripts/banjir/umum.py` |
| `public/inti/model.js` | Evaluator pohon (`nilaiPohon`, `prediksi`) + Platt + validasi masukan | `sebaran_model.js:154-155` |
| `uji_js.py` umum | Harness node `vm` kesetaraan Python↔JS untuk model apa pun | `scripts/sebaran/uji_js.py` |

Aturan pelatihan untuk semua bencana:

1. Uji dibuka **sekali**. Penyetelan hanya pada validasi. Angka uji ditulis ke JSON model dan tampil apa adanya.
2. Tiap model punya pembanding sederhana (aturan ambang atau klimatologi). Model yang tidak
   mengalahkan pembanding di validasi tidak diterbitkan; aturan yang dipakai.
3. Tiap model yang tampil di peramban punya uji kesetaraan Python↔JS.
4. Tiap model punya prospektif append-only sejak hari pertama terbit.
5. Data sampel besar tidak di-commit; cache di GitHub Release (`model-cache-<tanggal>`), seperti karhutla.
6. Fitur yang tidak tersedia di peramban tidak dipakai model peramban (karhutla: `bekas`, `tahun_sejak`, `sungai_km` hanya riset).
7. Status resmi lembaga tidak pernah jadi label yang ditimpa model; model hanya pelengkap berlabel.

## 3. Rencana model per bencana

| Bencana | Unit | Label | Fitur utama | Model | Pembanding | Uji balik | Prospektif |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Gempa: guncangan** | (gempa, tempat dirasakan) | MMI terlapor BMKG `Dirasakan` / USGS DYFI | M, kedalaman, jarak hiposenter, jenis magnitudo, kelas Vs30 kasar, wilayah tektonik | GMPE + GMICE (rumus terbitan) dengan koreksi bias regional dilatih GBDT kecil pada residu | GMICE tanpa koreksi | latih 2008–2019, validasi 2020–2022, uji 2023–2026; % tepat ±1 kelas, bias | tiap gempa M≥5 dicatat, dinilai saat laporan dirasakan lengkap (24 jam) |
| **Gempa: susulan** | gempa utama M ≥ 6 | jumlah susulan M≥5 dalam 1/3/7 hari | M utama, kedalaman, mekanisme bila ada, wilayah | Reasenberg-Jones parameter generik dikalibrasi Indonesia (MLE) | parameter generik | log-likelihood Poisson, diagram reliabilitas | tiap M≥6 dicatat, dinilai 7 hari kemudian |
| **Cuaca: angin/puting beliung** | kabupaten-hari | kejadian DIBI puting beliung/angin kencang | embusan maks, CAPE, LI, geser angin, hujan 3 jam, kelembapan, musim, ENSO/MJO | GBDT kecil di atas aturan ambang | aturan ambang `bencana/cuaca.md` §4 | POD/FAR/CSI/ETS + bootstrap blok; ekspektasi POD rendah ditulis | tiap run 6 jam, dinilai terhadap DIBI + CAP |
| **Cuaca: gelombang** | wilayah perairan-hari | kejadian DIBI gelombang pasang/abrasi | Hs maks, periode, arah, angin, pasang | aturan ambang kelas BMKG (tanpa ML di rilis pertama) | — | POD/FAR | idem |
| **Udara** | kota-hari | ISPU 24 jam terukur stasiun (OpenAQ) kategori ≥ Tidak Sehat | PM2,5/PM10 CAMS, titik panas 300 km arah datang angin 850 hPa, angin, kelembapan, lapisan batas, musim | koreksi bias regresi + GBDT klasifikasi kategori | CAMS mentah | bias/RMSE per musim 2019 dan 2023, ketepatan kategori | harian, dinilai terhadap stasiun |
| **Gunung api: arah abu** | (letusan, VONA) | arah abu di VONA berikutnya | tinggi kolom, angin 700/500/300 hPa | kerucut indikatif fisika (tanpa ML) | arah angin 500 hPa saja | selisih sudut 2018–2026 | tiap VONA |
| **Gunung api: level→letusan** | (gunung, kenaikan level) | letusan ≤ 7 hari | level, lama di level, letusan terakhir, VEI historis | tabel frekuensi empiris (informasi, bukan prakiraan) | — | — | — |
| **Kekeringan** | kabupaten-bulan | SPI-3 ≤ −1,5 tiga bulan ke depan | ONI, DMI, SPI sekarang, kelembapan tanah persentil, bulan | tabel anomali bersyarat + LR | klimatologi | skor Brier tinggal-satu-tahun 2001–2025; korelasi dengan titik panas | bulanan |
| **Banjir/longsor** (naik kelas) | kecamatan-hari (sudah) | DIBI | sudah (`status.py`) | aturan terkalibrasi (sudah) + GBDT longsor ambang ID Caine/Guzzetti × hujan antesedan | aturan sekarang | sudah (`uji_balik.py`) | **belum, tambahkan** |

## 4. Agent dan gerbang

| Kerja | Pengerja | Pemeriksa |
| --- | --- | --- |
| Pindah kerangka ke `scripts/umum/latih/` | `pipa-umum` | `validasi-model` (keluaran identik) |
| Model per bencana | pengerja bencana | `validasi-model` |
| Evaluator peramban + kesetaraan | pengerja bencana | `validasi-model`, `inp-reviewer` (Monte Carlo tidak membekukan layar) |
| Angka kinerja di layar | `layar-peta` / pengerja | `selera-angka` |

Gerbang baru `tests/agen/gerbang-model.test.mjs`: tiap `public/**/data/model_*.json` wajib punya
`kinerja_uji`, `dibuat`, `catatan`, pasangan uji kesetaraan di `scripts/**/uji_js*.py`, dan berkas
prospektif yang disebut di registri.

---

# Copywriting: suara karhutla, ditiru tiap bencana

Dipetakan 16 Okt 2026 dari string nyata di `public/**`, `src/**`, `scripts/og/**`, memori pemilik
(`gaya-kartu-insight.md`, `fitur-disembunyikan.md`), ilmu `selera-angka` dan `layar-peta`, dan
`scripts/i18n/GLOSARIUM.md`. Nomor baris diadu ke berkas per hari itu.

Tiap bencana baru menulis copy dengan pola di bawah, lalu mengganti KATA-nya lewat tabel padanan
(§5). Pola tidak boleh diubah per bencana; yang berubah cuma kosakata.

## 1. Suara

Bahasa Indonesia polos dan faktual, seperti redaktur berita. Satu baris = satu temuan, angka di
depan. Hampir tidak pernah menyapa pembaca. Perintah pakai kalimat perintah pendek ("Pilih titik di
peta", "Coba lagi"). Judul dan label huruf kalimat (sentence case). Tanpa emoji, tanpa basa-basi.

## 2. Pola per permukaan

| Permukaan | Pola | Contoh karhutla (berkas) |
| --- | --- | --- |
| Judul kartu Insight | **angka + satuan + kata kerja + tempat + jendela waktu**, kadang klausa sumber. Angka disorot `Insight.hl` | "Asap tidak sehat (PM2.5 > 55) menyelimuti **N provinsi** hari ini" (`index.html` ~3500); "**N ha** lahan terbakar ditangani **N personel** di N provinsi, menurut laporan BNPB" (3563) |
| Pil kategori kartu | Kata benda pendek | "Citra satelit", "Tren harian", "Cuaca", "Kesehatan", "Riwayat 25 tahun" (`Insight.LABEL`, 3370) |
| Pop-up Situasi hari ini | Eyebrow "Situasi {bencana} hari ini" → judul berangka + selisih kemarin (▲/▼ atau "sama dengan kemarin") → chip → seksi → kaki "Sumber: …" + tombol "Lihat peta" | `sapa.js:55-79` |
| Kosong | "Belum ada …" / "Tidak ada …" + langkah berikutnya bila ada | "Belum ada foto" + "Jadilah yang pertama mengirim foto dari lokasimu." + "Ambil foto" (`foto.js:102`) |
| Angka kosong | "–" (en dash) | `fmt`, `index.html:1592` |
| Galat / toast | Keadaan dulu, lalu jalan keluarnya; kalimat bertitik | "Akses lokasi ditolak. Buka pengaturan peramban, izinkan lokasi untuk situs ini, lalu coba lagi." (`foto.js:318`) |
| Tombol | Kata kerja + objek, huruf kalimat | "Lihat peta", "Ambil foto", "Salin tautan", "Unduh gambar ringkasan" |
| Tooltip | Pita kepala + kolom label/nilai, ▲ merah naik / ▼ hijau turun, tanpa tanggal ISO mentah | `rapikanTip`; memori `gaya-kartu-insight` |
| Metode | **Singkatnya → Alurnya (LANGKAH 1…n) → Contoh dengan data hari ini → Rincian teknis (terlipat) → Batasan**. "Singkatnya" tanpa jargon, diakhiri catatan jujur | `index.html:4889`, 5018-5053 |
| Keterangan sumber | `Sumber: A, B, C` miring di kaki kartu (`Insight.ex`) | "Sumber: WorldPop 2026 (CC BY 4.0), CAMS via Open-Meteo." |
| Teks bagikan | **kalimat temuan → konteks → "Data per {tgl}, diolah dari {sumber}." → ajakan membuka situs → tagar**. Tanpa emoji (vonis pemilik 14 Okt 2026, `bagikan.js:914`) | `bagikan.js:914-927`, `teksWil` 334-347 |
| OG | Judul "{Halaman} · Pantau Bencana"; deskripsi "{tgl}: {N} {kejadian}, {N} {dampak}. …" dibangun dari data | `scripts/og/buat.py:43-97` |

## 3. Angka, satuan, waktu (berlaku semua bencana)

- `fmt` id-ID, paling banyak 1 desimal, titik ribuan, koma desimal. `toFixed` mentah haram di teks tampil.
- "rb"/"jt" cuma di label sempit (`rb`, `index.html:3346`). Kalimat memakai "ribu/juta".
- Cacah kecil di awal kalimat dieja: "Tidak ada", "Satu" … "Sepuluh" (`ringkasan.js:38`).
- Simbol: "×" rasio, ▲/▼, "±", "≤ / ≥", "<" berspasi ("< 1 mm"), "·" pemisah, en dash untuk rentang ("2002–2025").
- Satuan selalu ditulis: titik, ha, jiwa, desa, km, mm, °C, µg/m³, jam/menit. Bencana baru menambah: M (magnitudo), km kedalaman, MMI, m di atas puncak, mm/hari, hari tanpa hujan.
- Waktu: "14 Okt 21.20 WIB" (`jamWIB`, `index.html:1597`); relatif "baru saja / N mnt lalu / N jam lalu", "hari ini / kemarin / N hari lalu". Jendela: "dalam 24 jam terakhir", "3 hari terakhir", "30 hari ke depan".
- Tiap angka menyebut sumber dan waktunya.

## 4. Aturan tertulis dan pelanggaran yang masih ada

| Topik | Aturan | Sumber |
| --- | --- | --- |
| Huruf kapital | Huruf kalimat untuk judul | GLOSARIUM "Gaya" |
| Emoji/ikon | Caption tanpa emoji; ikon SVG garis tulisan tangan (`IK`, `MT_IKON`) | `bagikan.js:914`; `layar-peta` |
| Fitur disembunyikan | Disembunyikan, bukan dihapus; tiap "hilangkan" dicatat di `fitur-disembunyikan.md` | memori |
| Kartu Insight | Pil + kalimat temuan berangka merah + kontrol segmen / grafik / kaki legenda + "Sumber:". Tanpa subjudul, tanpa paragraf caveat, tanpa kotak KPI navy | `gaya-kartu-insight.md` |
| Frasa wilayah | "9 provinsi prioritas" haram; tulis "provinsi yang sering mengalami karhutla" | memori; `selera-angka` 7 |
| Konsesi | Netral: "titik panas berada di dalam areal konsesi", tanpa menuduh | `selera-angka` 9 |
| i18n | UI ditulis Indonesia; Inggris dari `i18n/en.json`; angka di kunci jadi `{0}`; nama, judul berita, isi pengguna tidak diterjemahkan | GLOSARIUM |
| Em dash | **Dilarang di teks tampil** (diputus 16 Okt 2026, §6). Sebelumnya: rentang pakai en dash, pemisah "·" dan ":"; em dash cuma 1 di UI (`informasi.js:239`) | kode |

**Sisa pelanggaran, dibereskan di FASE-0 sebelum disalin ke bencana lain:**

1. "provinsi prioritas" tampil di `ringkasan.js:427,441` dan `index.html:5565`.
2. Merek lama "Posko Karhutla" di `privasi.html:7,45,50`, `warga/index.html:33`, `src/admin_halaman.js:19,24,34,40`, `public/admin/pesan.js:12`.
3. "titik api" vs glosarium "titik panas" di `sapa.js:68,74`, `bagikan.js:382`.
4. Teks pengembang bocor ke pengguna: "Jalankan scripts/data/dampak.py." (`dampak.js:471`), "Sumber: scripts/sebaran/kasus.py." (`insight_sebaran.js`, tersembunyi).
5. og:title karhutla terpasang di `tentang.html:14` dan `privasi.html:15`.
6. "Coming Soon" Title Case Inggris di menu bahaya (`index.html:1475`, 4 kali), "Real Time" (1498), "Chat Admin" (`public/pesan.js:76`).
7. "Tautan foto disalin" tanpa titik (`foto.js:202`), sementara toast lain bertitik.

## 5. Kosakata padanan per bencana

Pola kalimat tetap; kolom ini yang diganti. Istilah resmi dari BMKG, PVMBG, BNPB, dan ambangnya
wajib diadu lagi ke halaman lembaga saat tahap riset (`ALUR.md` tahap 1).

| Konsep (karhutla) | Gempa & tsunami | Gunung api | Cuaca ekstrem | Kekeringan | Kualitas udara | Banjir/longsor/rob |
| --- | --- | --- | --- | --- | --- | --- |
| Satuan deteksi ("titik panas") | kejadian gempa: M 5,2, kedalaman km, pusat gempa | erupsi, kolom abu (m di atas puncak), gempa vulkanik, tremor | peringatan dini cuaca | hari tanpa hujan (HTH) | PM2.5/PM10 (µg/m³), ISPU | curah hujan (mm), tinggi muka air, debit |
| Satuan kelompok ("kompleks api") | gempa utama + susulan | per gunung api | wilayah peringatan | wilayah kekeringan | kota/stasiun | kecamatan berstatus banjir |
| Kode kejadian (K0001) | G0001 | V + nomor GVP | C… | D… | U… | B… |
| Indeks bahaya ("FWI") | intensitas MMI I–XII | Level aktivitas | intensitas hujan: lebat 50–100, sangat lebat 100–150, ekstrem > 150 mm/hari; angin; gelombang | HTH pendek 6–10 … ekstrem > 60 hari; SPI | ISPU | indeks bahaya banjir |
| Tingkat resmi | Tsunami Waspada/Siaga/Awas (InaTEWS); "tidak berpotensi tsunami" | Level I Normal, II Waspada, III Siaga, IV Awas | Waspada/Siaga/Awas | Waspada/Siaga/Awas | Baik, Sedang, Tidak sehat, Sangat tidak sehat, Berbahaya | Normal/Waspada/Siaga/Awas (pintu air DKI: Siaga 4 terendah sampai Siaga 1) |
| Status tindakan ("Pencegahan rutin … Prioritas pemadaman") | Pemantauan → Kaji cepat → Siaga evakuasi → Tanggap darurat | ikut rekomendasi PVMBG + radius (km) | Pantau → Siaga → Evakuasi | Pantau → Hemat air → Distribusi air bersih | Pakai masker → Kurangi aktivitas luar → Ruang udara bersih | sudah ada (`banjir/status.py`) |
| Respons ("pemadaman") | pencarian dan pertolongan, evakuasi, pengungsian | evakuasi, pengosongan radius, penutupan jalur | evakuasi, penebangan pohon rawan | dropping air bersih | masker, ruang udara bersih | evakuasi, perahu, pompa |
| Faktor tapak ("gambut") | jenis tanah/likuefaksi, sesar aktif | KRB I/II/III | lereng, pesisir | sawah | – | dataran banjir, DAS |
| Lembaga lapangan | BMKG, Basarnas, TRC BPBD | PVMBG, Pos Pengamatan Gunung Api | BMKG, BPBD | BPBD, PDAM | Dinkes, KLH | BPBD, Tagana |
| Dampak ("jiwa terpapar asap") | penduduk terpapar guncangan per MMI | penduduk dalam radius/KRB, hujan abu, bandara terdampak (VONA) | penduduk di wilayah peringatan | penduduk krisis air bersih | jiwa menghirup udara tidak sehat | jiwa terdampak/terendam |
| Kata kerja | terjadi / dirasakan / mereda | erupsi / level naik / turun | berpotensi terjadi / berlaku hingga | berlangsung N hari | menyelimuti / membaik | tergenang / surut |
| Frasa wilayah | "provinsi yang sering diguncang gempa" | "provinsi dengan gunung api aktif" | "provinsi yang sering dilanda cuaca ekstrem" | "provinsi yang sering mengalami kekeringan" | "kota dengan udara paling tercemar" | "kecamatan langganan banjir" |
| Musim | sepanjang tahun | – | musim hujan, pancaroba | musim kemarau | musim kemarau (asap) | musim hujan |
| Kategori foto | Kerusakan bangunan, Retakan tanah, Pengungsian, Genangan tsunami | Hujan abu, Lahar, Pengungsian | Pohon tumbang, Genangan, Atap rusak | Sumur kering, Sawah puso, Antre air | Asap/kabut, Jarak pandang | Genangan, Arus, Longsor |
| Tagar | #gempa #infogempa #tsunami | #gunungapi #erupsi | #cuacaekstrem #peringatandini | #kekeringan #krisisair | #kualitasudara #ISPU | #banjir #longsor #rob |
| Inggris | earthquake, magnitude, MMI intensity, aftershock | Level II (Waspada) alert, ash column, hazard zone (KRB) | heavy / very heavy / extreme rain | consecutive dry days | ISPU (air pollution index) | sudah ada |

Kosakata ini tinggal di registry (`kata{unit,kejadian,tindakan,frasa_wilayah}`, lihat
**`MODUL-PLUG-AND-PLAY.md`**), bukan ditulis ulang di tiap berkas layar.

## 6. Keputusan pemilik (diputus 16 Okt 2026)

1. **Sapaan pembaca: "kamu".** Berlaku di semua teks yang menyapa pembaca. Yang masih memakai "Anda"
   (`informasi.js:377`, `privasi.html` 23 kali) diganti "kamu"; kalimat yang tidak perlu menyapa tetap
   tanpa kata ganti.
2. **Em dash dilarang di teks tampil.** Pakai ":" atau "·" sebagai pemisah; en dash tetap untuk rentang
   ("2002–2025"), dan "–" tetap penanda angka kosong. Sisa yang diketahui: `informasi.js:239`.
3. **Ikon: SVG garis**, seragam dengan karhutla (`IK`, `MT_IKON`), bukan emoji dalam lingkaran.

## 7. Gerbang yang diusulkan

`tests/agen/gerbang-copy.test.mjs` (pemilik `penulis-gerbang`), menyapu `public/**/*.{js,html}`
dan `src/**`:

- frasa haram: "provinsi prioritas", "Posko Karhutla", "Coming Soon", "Jalankan scripts/", "Sumber: scripts/";
- `toFixed(` di string tampil (sudah dijaga sebagian oleh `selera-angka`);
- em dash di teks tampil (§6.2);
- "Anda" di teks tampil (§6.1);
- tiap `rute` di registry punya entri OG dan trio hreflang.

RATCHET: daftar sisa cuma boleh menyusut; berkas bencana baru wajib nol.

---

# Modul plug-and-play: apa yang sudah bisa dipakai ulang, apa yang perlu adaptor

Dipetakan 16 Okt 2026 dari 35 modul di `public/`, `src/`, dan `scripts/`. Tujuannya: bencana baru
**mencolok** modul yang sudah ada lewat registry, bukan menyalinnya. Skema registry dasarnya di
**`ARSITEKTUR.md`** §3.2; dokumen ini menambah medan yang dibutuhkan modulnya.

## 1. Empat kelas

| Kelas | Arti | Modul |
| --- | --- | --- |
| **A. Sudah colok** | Tanpa asumsi bencana; dipakai apa adanya | `bagi.js`, `i18n.js`, `persetujuan.js`, `pesan.js`, `statistik_publik.js`, `src/publik.js`, `scripts/terbit/versi.py` |
| **B. Satu langkah lagi** | Cuma butuh daftar dari registry atau satu migrasi | `informasi.js` + `informasi_jenis.js`, `foto.js` + `src/foto.js`, `jejak.js` + `src/statistik.js`, `kaki.js`, `src/og_meta.js`, `admin/*.js`, rute `src/worker.js`, `wilayah.py`, `banjir/umum.py`, `asap.py`, `tanah.py`, `citra.py` |
| **C. Mesin bersama, isi per bencana** | Mesinnya generik, kontennya lewat adaptor (semua jalur baru di dokumen ini, seperti `public/inti/`, `scripts/umum/`, `scripts/berita/<id>.py`, masih rencana) yang didaftarkan tiap bencana | `bagikan.js`, `sapa.js`, `databaru.js`, `lapisan5.js`, `cerita_karhutla.js`, `ansambel.py`, `berita.py`, `posko.py`, `scripts/og/buat.py` |
| **D. Karhutla saja** | Tidak dipindah; cuma POLA-nya yang ditiru | `titik_live.js`, bagian FIRMS `src/titik.js`, `fwi.py`, `operasi.py`, `keputusan.py` |

## 2. Medan registry tambahan

**Belum ada di repo**: `public/bencana.json` dan `src/bencana.generated.js` lahir di FASE-0 tahap A. Medan di bawah diusulkan untuk ditambahkan ke tiap entrinya:

```json
{
  "bagikan": { "nama": "Pantau Bencana · Gempa", "sumber": "BMKG, USGS", "tagar": ["#gempa", "#infogempa"] },
  "og": { "judul": "Gempa bumi hari ini · Pantau Bencana", "desk_templat": "{tgl}: {n} gempa M≥5, {jiwa} jiwa terpapar guncangan." },
  "kata": { "unit": "gempa", "kejadian": "gempa utama", "tindakan": ["Pemantauan", "Kaji cepat", "Siaga evakuasi", "Tanggap darurat"], "frasa_wilayah": "provinsi yang sering diguncang gempa" },
  "peringatan_relevan": "gempa|tsunami",
  "lapisan": ["penduduk", "sekolah", "fasilitas", "jalan"],
  "berita": { "kueri": ["gempa bumi", "tsunami"], "leksikon": "scripts/berita/gempa.py" },
  "prioritas": ["11", "13", "72", "81"],
  "posko": { "radius_km": 25, "bobot": { "awas": 3, "siaga": 1 } }
}
```

Nilai di atas contoh bentuk, bukan angka putusan. Kosakata `kata` mengikuti
**`COPYWRITING.md`** §5.

## 3. Layar (`public/`)

| Modul | API | Asumsi karhutla hari ini | Perubahan supaya colok |
| --- | --- | --- | --- |
| `informasi.js` + `informasi_jenis.js` | `window.Informasi {peta, render()}`; ekspor `BAHAYA, WARNA, JENIS, jenisUntuk, IKON` (dipakai worker, `src/worker.js:5`) | `BAHAYA_AWAL` (11), tautan `/k/` (233), teks "titik panas ≤ 2 km" (239), cabang KOLOM karhutla/banjir (349-351), D1 `CHECK bahaya IN (…)` (`0001_warga.sql:9,42`) | `BAHAYA` dari `lapor_bahaya` registry; jenis per bencana; KOLOM pindah ke kunci `kolom` tiap jenis; tautan `rute + "k/" + id`; migrasi tabel rujukan (ARSITEKTUR §6.1); `tests/warga/skema.test.mjs` ikut |
| `foto.js` + `src/foto.js` | `window.Foto {render, lapis, buka, kirim}`; server `KATEGORI, BATAS_FOTO, RUTE_FOTO` | `KAT` api/asap/padam (`foto.js:7`), subjudul "Foto lapangan untuk peta karhutla" (278), D1 `CHECK kategori` (`0007_foto.sql:7`), tanpa kolom `bencana` | migrasi kolom `bencana TEXT NOT NULL DEFAULT 'karhutla'`, kategori divalidasi server dari `foto_kategori`; `GET /api/foto?bencana=`; subjudul dan ikon dari registry |
| `bagikan.js` | global `Bagikan` (`init, buka, cepat, bagi, konteks, gambarCepat, keterangan`), tata letak `TATA` (679) | tema `_K()` (25-29), cabang `hal==="banjir"` (313, 336, 923), `S.kluster`/`S.meta.status` (339-354) | `_K` membaca `bagikan` registry; tiap bencana mendaftarkan `Bagikan.tema[id] = {data, teksWil, keterangan, konteks}` di berkasnya sendiri; mesin kanvas dan `TATA` tetap bersama |
| `bagi.js` | `window.Bagi {buka, utm, potong, en, QR, ponsel, ikon}`, tombol `[data-bagikan]` | tidak ada | `kampanye` jadi `"<id>-<jenis>"` |
| `i18n.js` | `window.T`, `T.ganti/hilang/kunci/siap`, peristiwa `bahasa` | satu kamus | opsional `i18n/en.<id>.json` digabung malas; seksi GLOSARIUM per bencana; trio hreflang di tiap `rute` |
| `persetujuan.js` | `window.Persetujuan` | tidak ada | merek di `privasi.html` dibetulkan |
| `jejak.js` + `src/statistik.js` | POST `/api/jejak`; `HAL, PERISTIWA, …` | regex `/^\/(banjir\|warga)/`, `/k/K\d+` (77-78); `HAL` tulisan tangan (`statistik.js:17`, halaman lain ditolak 400) | regex dan `HAL` dari `rute` + `kejadian.awalan` registry |
| `pesan.js` | `window.Pesan {buka}` | tidak ada | medan opsional `bencana` |
| `kaki.js` | tanpa global; `data/kontak.json` | daftar tab dan tautan karhutla (4, 44-45) | kolom "Pantau" dari `tab` minus `tab_sembunyi`; kolom "Bencana" dari registry |
| `databaru.js` | tanpa global | belah `karhutla()`/`banjir()` (232), saringan `R_API` (36, 59) | pita peringatan BMKG jadi modul sendiri disaring `peringatan_relevan`; bagian FWI/tanah jadi adaptor karhutla |
| `sapa.js` | tanpa API; kunci `pb_sapa` | semua copy karhutla (55-79) | `Sapa.daftar(id, {siap, hitung, html})`, kunci `pb_sapa_<id>`; tata letak bersama |
| `lapisan5.js` | global di 2-3 | lapis karhutla `kanal`, `iklim`, `akses` | `lapisan[]` registry memilih ubin; lapis generik (`penduduk, sekolah, fasilitas, jalan, asap`) jadi `public/inti/peta/lapis.js` (**`PETA.md`**) |
| `citra.js` | `window.Citra`, `pasangInsight` | `data/citra.json`, ID kompleks `Laci` | jalur data dari registry; penggeser sebelum/sesudah jadi komponen bersama |
| `cerita_karhutla.js` | `window.Cerita` | lima JSON karhutla, lencana "Coming soon" (190) | rangka bab + `rekamVideo` jadi `cerita.js`; bab dipasok per bencana |
| `admin/*.js`, `src/admin_halaman.js` | – | `HALN` (`admin/statistik.js:14`), `KAT` (`admin/foto.js:8`), merek "Posko Karhutla", nav Karhutla/Banjir | semuanya dari registry |

## 4. Worker (`src/`)

| Modul | Perubahan |
| --- | --- |
| `og_meta.js` | `TAB` (5), cabang banjir (12), `/k\|sim/K####` (14-19), "Pantau Bencana Karhutla" (28) diganti putaran atas `rute` registry dan `kejadian.awalan`; og:title tentang/privasi dibetulkan |
| `statistik.js` | `HAL = [...tetap, ...B.bencana.map(b => b.id)]` |
| `titik.js` | `wilayah(env)` dan `cariWilayah` (43-69) dipindah ke `src/wilayah.js`, dipakai cron gempa/cuaca; pola simpan D1 8 putaran ditiru `cron_worker` |
| `worker.js` | `SUMBER_STATUS` (330), regex `HALAMAN` (398), `HTML_RUTE` (404-410) di-generate dari registry |
| `publik.js` | tetap |

## 5. Pipeline (Python)

| Modul | Perubahan |
| --- | --- |
| `scripts/data/wilayah.py` | `Wilayah.cari(lon, lat)` tetap; `PRIORITAS` 9 provinsi karhutla (19) pindah ke `prioritas` registry |
| `scripts/banjir/umum.py` | `ambil` (retry), `simpan`, `baca`, `grid_darat`, `per_lokasi`, `KuotaHabis` pindah ke `scripts/umum/` dengan parameter jalur keluaran |
| `ansambel.py` | mesin 51 anggota ECMWF (`persentil`, `bobot`, `anggota`, `ringkas`) menerima daftar variabel + ambang (hujan ≥ 50/100 mm, hari kering) |
| `tanah.py` | buang urutan `PRIORITAS` (79); dipakai kekeringan dan banjir |
| `penduduk.py` | tambah "penduduk di dalam poligon/radius" untuk KRB gunung api dan MMI gempa |
| `berita.py` | panen RSS, dedup, geocode, sentimen tetap; leksikon (`KUERI_*`, `R_*`, `TOPIK`, `SITUASI/RESPONS`) pindah ke `scripts/berita/<id>.py` |
| `posko.py` | `pilih()` greedy maximum-coverage tetap; bobot dan `RADIUS_KM` dari registry `posko` |
| `citra.py` | menerima daftar `{id, lat, lon, skor}` + folder keluaran, bukan `kluster.json` |
| `asap.py` | jalur keluaran dari registry; jadi pipeline inti modul udara |
| `scripts/og/buat.py` | `hitung()` dipecah jadi `og_<id>()` per bencana yang mengembalikan `{judul, desk, gambar}`; `stempel` tentang/privasi dibetulkan |
| `fwi.py`, `operasi.py`, `keputusan.py` | tetap karhutla; Drought Code FWI boleh dipakai sebagai proksi kekeringan |

## 6. Urutan pindah (masuk FASE-0)

1. Registry + generator + gerbang segar (sudah direncanakan di FASE-0 tahap A).
2. Kelas B dari daftar sederhana dulu: `jejak`/`statistik`, `kaki`, `og_meta`, `admin`, rute worker.
3. Migrasi tabel rujukan (`informasi`, `foto`).
4. Kelas C: `bagikan` dan `sapa` duluan karena tampil di tiap halaman, lalu `berita`, `ansambel`, `posko`.
5. Kelas D tidak disentuh.

Tiap langkah: karhutla tetap tampil identik (uji balik dan tangkapan layar sebelum/sesudah), dan
gerbang `gerbang-tanpa-salin` menolak salinan baru dari modul kelas A–C di folder bencana.

---

# Banjir, longsor, rob (naik kelas)

Pengerja: `banjir`. Urutan: 1. Modul sudah hidup di `/banjir/` (13 skrip `scripts/banjir/`,
14 tab), tetapi tersembunyi dari menu. Tujuannya menutup celah terhadap PAKET-FITUR, lalu
`"status": "aktif"`. Rincian tahap ada di **`../FASE-0.md`** tahap E.

## Daftar periksa (dari pemetaan 15 Okt 2026)

`ada` = sudah ada di kode, `celah` = harus dibuat, `T` = tidak berlaku.

| Kode | Kondisi | Catatan |
| --- | --- | --- |
| A01 | ada | Open-Meteo hujan kisi 0,25°, GloFAS 192 sungai, muka laut + gauge IOC |
| A02 | celah | Hanya harian; tambah potongan 24/72 jam untuk peringatan |
| A03 | celah | Peringatan BMKG ke `kejadian_langsung` tiap 15 menit |
| A04 | celah | Kejadian banjir `B` = kecamatan ≥ Siaga yang bersebelahan |
| A05 | celah | Atribut kejadian (luas kecamatan, penduduk, sungai, hujan, InaRISK) |
| A06 | celah | Poligon gabungan kecamatan |
| A07 | celah | `kejadian_awal` + `kejadian_geo` |
| A08–A11 | ada | hujan, ansambel 51 anggota, CAPE, kelembapan tanah |
| A12 | T | — |
| A13 | ada | `status.py` Normal/Waspada/Siaga/Awas, terkalibrasi DIBI |
| A14 | celah | Prioritas tertulis dengan angka uji balik |
| A15–A16 | ada | `riwayat.py`, kalender musim La Niña vs biasa |
| A17 | ada | memakai iklim |
| A18–A19 | ada | DIBI 11.374 baris, riwayat grid |
| A20 | ada | InaRISK, peringatan BMKG |
| A21 | ada | Posko tiga tingkat Perka BNPB 3/2016 |
| A22 | ada | Sarana |
| A23 | celah | Perahu karet / heli evakuasi: putuskan A atau T |
| A24 | ada | Keputusan Monte Carlo, CBA, SMAA |
| A25 | celah | Preventif (normalisasi, biopori, peringatan dini desa) |
| A26 | T | — |
| A27 | celah | Dampak: penduduk tergenang, sekolah, jalan putus, sawah, kerugian |
| A28–A29 | celah | Paparan penduduk dan fasilitas per kejadian |
| A30 | celah | `ringkasan.json` |
| A31 | T | Simulasi memakai aturan status, bukan cuaca per jam |
| A32 | celah | Citra sebelum/sesudah (Sentinel-2 bila awan memungkinkan) atau T dengan alasan |
| A33–A34 | celah | Berita dan video banjir |
| A35 | celah | Penerbangan/kereta/jalan tol terdampak: putuskan A atau T |
| A36 | ada | `param_banjir.json` (kurasi tangan) |
| A37 | ada | `meta.json` |
| A38 | ada | — |
| A39 | celah | Seri harian status per wilayah |
| A40 | celah | Unit respons banjir (BPBD, Basarnas, pos SAR) |
| B01 | ada | Aturan status (bukan ML) |
| B02 | ada | `uji_balik.py` POD/FAR/CSI/PSS/ETS 2016–2025 |
| B03 | celah | Prospektif append-only |
| B04–B06 | celah | Kasus besar, pendorong, tren |
| B07 | ada | Simulasi klien identik untuk 7.274 kecamatan |
| B08–B10 | ada | `RISET-*.md` |
| C01 | celah | Menu dari registry (FASE-0 A2) |
| C02 | celah | Tab hash → URL bersih (FASE-0 D4) |
| C03–C11, C13 | ada | — |
| C12 | celah | Laci kejadian banjir |
| C14–C15 | ada / celah | Insight 8 eksibit ada; tabel kejadian B celah |
| C16 | celah | Cerita banjir |
| C17 | celah | Berita |
| C18–C19 | ada | Tren, Posko, Sarana, Keputusan |
| C20 | celah | Dampak |
| C21 | celah | Dashboard pimpinan |
| C22–C24 | ada | Metode 17 bagian, Simulasi, Lapor Warga |
| C25 | celah | Foto: kategori banjir |
| C26 | celah | Pop-up situasi |
| C27 | ada | Bagikan cabang banjir |
| C28 | celah | OG per provinsi/kejadian |
| C29–C35 | ada / celah | i18n ada; Tentang dan statistik dari registry celah |
| C36 | celah | Pemilah bahaya di admin |
| C37–C39 | ada | Bersama |
| D01–D10 | sebagian | Ikut FASE-0 tahap C |
| E01–E10 | sebagian | `uji` tiap skrip ada; gerbang registry/inti celah |
| F01–F04 | sebagian | Pengerja `banjir` ada; dokumen ini baru |

---

# Gempa bumi & tsunami

Status registry: belum ada (akan `uji` di ALUR tahap 3). Pengerja: `gempa`. Urutan: 2.

## 1. Identitas registry

| Kunci | Nilai |
| --- | --- |
| `id` | `gempa` |
| `nama` / `nama_en` | Gempa Bumi & Tsunami / Earthquake & Tsunami |
| `rute` / `data` | `/gempa/` / `/gempa/data/` |
| `kejadian.awalan` | `G` (G0001) |
| `tab` | ringkasan, peta, insight, berita, tren, kejadian, posko, dampak, metode, sim, informasi, foto |
| `cron_worker` | tiap 60 detik: BMKG `autogempa` (dengan ETag); tiap 5 menit: `gempaterkini`, `gempadirasakan`, USGS `4.5_day`, PTWC Atom |
| Workflow | `gempa.yml` harian 01.10 UTC (riwayat, susulan, risiko, dampak, berita); bulanan untuk lapisan statis |

## 2. Status: resmi dulu, indeks sendiri sesudahnya

| Lapis | Sumber | Tampil sebagai |
| --- | --- | --- |
| Status resmi tsunami | BMKG `Potensi` + PTWC | Pita teratas di peta dan laci: "BMKG: tidak berpotensi tsunami" atau peringatan apa adanya, dengan jam terbit. Tidak pernah diturunkan atau ditafsirkan ulang |
| Besaran resmi | BMKG `Magnitude`, `Kedalaman`, `Dirasakan` (MMI) | Angka utama laci |
| PAGER | USGS `alert` | Label "USGS PAGER" |
| **Tingkat Pantau Bencana** (pelengkap) | Aturan §4 | Normal / Waspada / Siaga / Awas per kabupaten untuk 72 jam ke depan, dari perkiraan guncangan + peluang susulan + kerentanan |

## 3. Kejadian (padanan kompleks api)

- **Definisi**: satu gempa utama M ≥ 5 (atau dirasakan BMKG) beserta gempa susulannya. Jendela
  pengelompokan memakai metode Reasenberg (1985) atau jendela Gardner-Knopoff ASLI (jarak
  `10^(0,1238·M + 0,983)` km, waktu bertingkat menurut M), dipilih di tahap riset dan dikalibrasi
  dari katalog USGS 2000–2022; parameternya ditulis di Metode. Untuk tampilan "kejadian aktif",
  jendela tampil dipotong 72 jam (7 hari bila M ≥ 6,5) walau jendela pengelompokan lebih panjang.
  Gempa yang masuk jendela gempa sebelumnya digabung sebagai susulan, bukan kejadian baru.
- **Kode**: `G` + nomor urut stabil; kunci alami = id USGS/BMKG gempa utama.
- **Masa aktif**: 72 jam sejak gempa terakhir di kelompok itu, diperpanjang 7 hari bila M utama ≥ 6,5.
- **Atribut** (A05): M, jenis magnitudo, kedalaman, waktu, episentrum, wilayah BMKG, MMI maks
  resmi, daftar tempat dirasakan, bendera tsunami, jumlah susulan, susulan terbesar, peluang
  susulan M≥5 dalam 7 hari (§5), penduduk per kelas MMI perkiraan, fasilitas di zona MMI ≥ VI,
  sesar terdekat, kecamatan terdampak, riwayat gempa ≥ M6 radius 100 km sejak 1900, kelas InaRISK.
- **Geometri** (A06): isoseismal MMI perkiraan (§5) sebagai poligon bertingkat; bila USGS ShakeMap
  ada, pakai `cont_mmi.json` dan beri label sumbernya.

## 4. Aturan tingkat Pantau Bencana (A13)

Per kabupaten, horizon 72 jam:

| Tingkat | Syarat (salah satu) |
| --- | --- |
| Awas | MMI perkiraan ≥ VII di kabupaten, ATAU peringatan tsunami resmi aktif untuk pantainya |
| Siaga | MMI ≥ VI, ATAU peluang susulan M≥6 dalam 7 hari ≥ 10% dengan kabupaten di radius susulan |
| Waspada | MMI ≥ V, ATAU peluang susulan M≥5 ≥ 30% |
| Normal | lainnya |

Ambang final ditetapkan dari uji balik (§6), bukan dari tabel ini. Tabel ini hipotesis awal.

## 5. Model (B01)

1. **Perkiraan guncangan**: GMPE sederhana jarak-hiposenter → PGA/PGV → MMI lewat GMICE Worden et al.
   2012 atau Wald et al. 1999; koreksi tapak memakai kelas Vs30 kasar (topografi, Wald & Allen 2007)
   bila datanya bisa dipanen sekali; jika tidak, tanpa koreksi tapak dan ditulis di Batasan.
   Dihitung per pusat kecamatan (7.274 titik).
2. **Susulan**: Reasenberg-Jones dengan parameter generik (a = −1,67, b = 0,91, p = 1,08,
   c = 0,05 hari), dikalibrasi ulang untuk Indonesia dari katalog USGS 2000–2022. Keluaran:
   P(M≥5) dan P(M≥6) dalam 1, 3, 7 hari.
3. **Waktu tiba tsunami** (ditunda, setelah rilis pertama): perambatan Huygens di kisi batimetri
   kasar; butuh berkas batimetri berlisensi terbuka. Sampai ada, laci menampilkan status resmi saja.
4. **Tidak dibuat**: prakiraan gempa utama. Ditulis tegas di Metode: tidak ada yang bisa
   meramal gempa utama, termasuk situs ini.

## 6. Uji balik (B02)

| Yang diuji | Kebenaran | Ukuran | Pembagian |
| --- | --- | --- | --- |
| MMI perkiraan | `Dirasakan` BMKG (MMI per tempat) dan USGS DYFI `cdi` | Bias, RMSE per kelas, % tepat ±1 kelas | Latih 2008–2019, validasi 2020–2022, uji 2023–2026 dibuka sekali |
| Peluang susulan | Hitungan susulan nyata 7 hari setelah tiap M ≥ 6 (USGS) | Log-likelihood Poisson, kalibrasi (diagram reliabilitas) | idem |
| Tingkat Pantau Bencana | Kejadian DIBI gempa (korban/kerusakan per kabupaten) | POD, FAR, CSI | idem |
| Prospektif (B03) | Tiap gempa M≥5 baru: catat prakiraan susulan saat itu, nilai 7 hari kemudian | idem | Append-only |

## 7. Layar

**Lapisan (C08)**

| Kelompok | Lapisan |
| --- | --- |
| Kejadian & respons | Gempa (lingkaran ukuran M, warna kedalaman), susulan, isoseismal, kejadian G, posko, foto |
| Bahaya statis | Sesar aktif (Pusgen 2017, bila lisensinya terbuka), InaRISK gempa, InaRISK tsunami, zona subduksi |
| Riwayat | Gempa ≥ M6 sejak 1900, kepadatan kejadian 0,1° |
| Infrastruktur | RS, sekolah, jembatan, bandara (data statis bersama) |

**Panel kiri (C05)**: mode Sekarang (gempa 24 jam/72 jam/7 hari, urut waktu), Riwayat, Kejadian.
Rentang (C06): 24 jam / 72 jam / 7 hari / 30 hari.

**Laci kejadian (C12)**, urutan bagian:
1. Status resmi tsunami (pita)
2. Gempa saat ini: M, kedalaman, jam WIB/WITA/WIT setempat, lokasi, MMI resmi
3. Dirasakan di: daftar tempat dan MMI-nya
4. Perkiraan guncangan per kabupaten (tabel kelas MMI, penduduk)
5. Susulan: hitungan sejauh ini + peluang 1/3/7 hari dengan selang
6. Penjelasan tingkat (aturan §4 dengan angka hari ini)
7. Tindakan yang disarankan per tingkat (sumber: pedoman BNPB/BMKG) — dibuat, **disembunyikan**
   seperti di karhutla sampai pemilik membukanya
8. Respons terdekat: BPBD, RS, posko — idem, disembunyikan
9. Bahaya InaRISK di lokasi
10. Riwayat gempa besar di sekitar (sejak 1900)
11. Bagikan `/gempa/k/G0001`, Google Maps

**Insight (C14)**, minimum:
- Gempa per hari, 30 hari terakhir (M per kelas)
- Peta kepadatan gempa per provinsi tahun berjalan vs rata-rata 2000–2025
- Distribusi magnitudo (Gutenberg-Richter) dengan nilai b per wilayah
- Kedalaman vs magnitudo
- Gempa merusak sejak 2000: korban dan kerusakan (DIBI)
- Kinerja model: MMI perkiraan vs dirasakan, kalibrasi susulan (B09, apa adanya)
- Tabel kejadian G

**Tren (C18)**: indeks risiko riwayat gempa 0–100 per kab/kec (kekerapan M≥5, besaran maks, tren),
tanpa kalender musim (gempa tidak bermusim: A16 "tidak berlaku").

**Dampak (C20)**: penduduk per kelas MMI, sekolah dan RS di MMI ≥ VI, bangunan rentan (bila ada data
terbuka), jalan dan jembatan, perkiraan kerugian ekonomi kelas PAGER, pengungsi (BNPB bila terbit).

**Dashboard (C21)**: I situasi (gempa 24 jam, kejadian aktif, status tsunami), II keputusan hari ini
(kabupaten Siaga/Awas), III 72 jam (peluang susulan), IV sentimen media, V sumber daya (BPBD, RS,
posko), VI sumber.

**Metode (C22)**: magnitudo dan MMI, jendela susulan, GMPE + GMICE dengan contoh hitung gempa hari
ini, Reasenberg-Jones dengan contoh, aturan tingkat, uji balik, kenapa gempa tidak bisa diramal,
batasan (tanpa koreksi tapak, katalog tidak lengkap untuk M < 5 sebelum 2008).

**Simulasi (C23)**: "Bagaimana kalau": pengguna memilih titik + M + kedalaman, layar menghitung
isoseismal dan penduduk terpapar dengan model yang sama (Python↔JS setara, B07).

**Posko dan sarana (A21–A25, C19)**: titik pengungsian dari greedy coverage penduduk MMI ≥ VI;
kebutuhan tenda, air bersih, tim SAR, alat berat per 1.000 pengungsi (koefisien bersumber Sphere
Handbook / Perka BNPB); Keputusan: biaya respons cepat vs kerugian tertunda (Monte Carlo lo/mid/hi).

## 8. Warga dan media

| Bagian | Isi |
| --- | --- |
| Lapor Warga (C24) | Jenis baru `guncang` (sub: terasa, kuat, barang jatuh, retak dinding, roboh) dengan isian MMI sederhana bergambar; `tsunami_amat` (sub: air surut, air naik, genangan). Jenis umum tetap. Laporan guncang dekat gempa ≤ 15 menit diberi lencana "cocok dengan gempa BMKG" (padanan lencana satelit) |
| Foto (C25) | Kategori: kerusakan bangunan, retakan tanah, longsoran, pengungsian, genangan tsunami, lainnya. Dummy: 100 foto gempa/tsunami berlisensi bebas dari Wikimedia Commons |
| Pop-up situasi (C26) | Gempa terasa dalam 24 jam di provinsi pengguna (bila diizinkan lokasi kasar) atau nasional, kejadian aktif, status tsunami |
| Berita (A33) | Kueri: gempa, gempa susulan, tsunami, BMKG gempa, likuifaksi, pengungsi gempa; topik: kerusakan, korban, bantuan, susulan, hoaks gempa |
| OG (C28) | `/gempa/`, `/gempa/k/G0001` (peta isoseismal + angka), per provinsi |
| i18n (C29) | Glosarium: magnitudo, MMI, episentrum, hiposenter, susulan, InaTEWS, "tidak berpotensi tsunami" = "no tsunami potential" (istilah BMKG berbahasa Inggris) |

## 9. Daftar periksa PAKET-FITUR

Rencana awal; diperbarui tiap tahap ALUR. `R` = rencana dibuat, `A` = diadaptasi, `T` = tidak berlaku.

| Kode | Rencana | Kode | Rencana | Kode | Rencana |
| --- | --- | --- | --- | --- | --- |
| A01 | R BMKG 3 berkas + USGS + EMSC | A14 | R Awas/Siaga prioritas | A27 | A dampak gempa §7 |
| A02 | R gempa24/72/30hari | A15 | R | A28 | R |
| A03 | R cron 1 menit | A16 | T gempa tidak bermusim | A29 | R |
| A04 | R kejadian G | A17 | T tidak bergantung ENSO | A30 | R |
| A05 | R §3 | A18 | R USGS sejak 1900 | A31 | T simulasi tidak butuh cuaca |
| A06 | R isoseismal / ShakeMap | A19 | R | A32 | A citra sebelum/sesudah untuk M ≥ 6,5 saja |
| A07 | R | A20 | R BMKG + PAGER + BNPB | A33 | R |
| A08 | T cuaca bukan pemicu | A21 | R pengungsian | A34 | R |
| A09 | A MMI perkiraan sebagai indeks | A22 | A kebutuhan tenda/air/SAR | A35 | A bandara tutup (NOTAM bila ada) |
| A10 | T tidak ada ansambel gempa | A23 | T | A36 | R `factsheet_gempa.json` |
| A11 | T | A24 | R | A37 | R |
| A12 | T | A25 | A mitigasi bangunan & latihan evakuasi | A38 | R sesar, InaRISK |
| A13 | R §4 | A26 | T | | |
| B01 | R §5 | B05 | R pendorong kerusakan | B09 | R |
| B02 | R §6 | B06 | R tren kekerapan | B10 | R `RISET-GMPE.md`, `RISET-SUSULAN.md` |
| B03 | R | B07 | R simulasi | | |
| B04 | R gempa merusak 2000– | B08 | R selang susulan | | |
| C01–C15 | R | C16 | R cerita "gempa yang mengubah Indonesia" | C17–C22 | R |
| C23 | R §7 Simulasi | C24–C35 | R | | |
| A39 | R seri harian per wilayah | A40 | R unit respons + kontak domain | C36–C39 | R (C36 pemilah bahaya di admin) |
| D01–D10 | R (D09: dummy `kejadian_langsung` gempa) | E01–E10 | R | F01–F04 | R |

---

# Cuaca ekstrem (angin kencang, puting beliung, hujan es, petir, siklon, gelombang tinggi)

Pengerja: `cuaca`. Urutan: 3. Gelombang tinggi dilebur ke sini sebagai lapisan dan jenis kejadian
(saran riset: tidak ada kebenaran lapangan resmi yang cukup untuk modul sendiri; keputusan akhir
menunggu pemilik, ARSITEKTUR "Keputusan" butir 2).

## 1. Identitas registry

| Kunci | Nilai |
| --- | --- |
| `id` / `rute` | `cuaca` / `/cuaca/` |
| `kejadian.awalan` | `C` |
| `cron_worker` | tiap 5 menit: BMKG nowcast RSS + CAP baru; tiap 30 menit: GDACS TC |
| Workflow | `cuaca.yml` tiap 6 jam (indeks, ansambel, gelombang); harian (riwayat, berita, dampak) |

Banyak bahan sudah ada: `scripts/banjir/peringatan.py` (nowcast CAP + gelombang BMKG Maritim),
`scripts/banjir/hujan.py` (embusan `g`, CAPE, intensitas), partikel angin di peta banjir,
kejadian DIBI jenis `cuaca` dan `gelombang`. Semuanya dipindah atau dipakai dari `scripts/umum/`.

## 2. Status

| Lapis | Sumber | Tampil sebagai |
| --- | --- | --- |
| Peringatan dini resmi | BMKG nowcast CAP (kata dan warna asli BMKG) | Poligon di peta dan pita di laci, dengan jam berlaku. Didahulukan, tidak ditafsirkan ulang |
| Gelombang resmi | BMKG Maritim kelas Rendah–Luar Biasa | idem untuk wilayah perairan |
| Siklon | GDACS TC + IBTrACS (sejarah) | Lintasan, kategori |
| **Tingkat Pantau Bencana** | Aturan §4 per kecamatan, 72 jam | Normal / Waspada / Siaga / Awas |

## 3. Kejadian

Tiga jenis kejadian dengan awalan bersama `C`:

1. **Peringatan CAP** BMKG: satu CAP = satu kejadian (poligon, jenis, jam berlaku).
2. **Sel ekstrem prakiraan**: kecamatan bersebelahan yang melewati ambang §4 di jam yang sama,
   digabung (pola DBSCAN karhutla di kisi kecamatan).
3. **Siklon tropis**: satu sistem = satu kejadian (lintasan, tekanan pusat, angin maks).

Atribut: jenis, ambang yang dilewati, embusan maks, hujan maks 1 jam/3 jam, CAPE, LI, tinggi
gelombang maks, kecamatan, penduduk, fasilitas, pelabuhan (untuk gelombang), riwayat kejadian
DIBI sejenis di kecamatan itu.

## 4. Aturan tingkat (hipotesis awal; dikunci oleh uji balik)

| Bahaya | Waspada | Siaga | Awas |
| --- | --- | --- | --- |
| Embusan angin | ≥ 15 m/s | ≥ 20 m/s | ≥ 25 m/s |
| Badai guntur (proksi) | CAPE ≥ 1.000 dan LI ≤ −2 | CAPE ≥ 1.500 dan LI ≤ −3 | + hujan ≥ 50 mm/3 jam |
| Hujan lebat | ≥ 50 mm/hari | ≥ 100 mm/hari | ≥ 150 mm/hari (sama dengan kelas BMKG) |
| Gelombang (Hs) | ≥ 2,5 m | ≥ 4 m | ≥ 6 m (kelas BMKG) |

Tingkat = maksimum bahaya di atas. **Peringatan BMKG tidak dipetakan ke tingkat Pantau Bencana**:
CAP memakai skala standar Minor/Moderate/Severe/Extreme dan isi CAP BMKG belum diverifikasi, jadi
pemetaan ke Waspada/Siaga/Awas adalah tafsiran ulang data resmi (melanggar ARSITEKTUR §2 butir 5).
Peringatan BMKG tampil sebagai peringatan BMKG, dengan warna dan kata aslinya, di lapisan resmi.
Pemetaan baru dipertimbangkan setelah contoh CAP nyata diverifikasi, dan hanya boleh menaikkan.

## 5. Model dan uji balik

- **Model**: aturan ambang di atas Open-Meteo per jam + ansambel ECMWF untuk peluang melewati
  ambang (pola A10 karhutla). Tidak ada model ML di rilis pertama.
- **Uji balik**: ERA5 (Open-Meteo archive) pada tanggal kejadian DIBI puting beliung, angin kencang,
  dan gelombang pasang 2010–2026 per kabupaten vs hari acak; POD, FAR, CSI, PSS. Latih 2010–2019,
  validasi 2020–2022, uji 2023–2026.
- **Ekspektasi jujur**: sel badai dan puting beliung jauh lebih kecil dari sel ERA5 0,25°, jadi POD
  untuk puting beliung diperkirakan rendah. Ini ditulis di Batasan dan ditampilkan apa adanya;
  ambang tidak disetel supaya angkanya kelihatan bagus.
- **Prospektif**: tiap run 6 jam mencatat kecamatan Siaga/Awas; dinilai terhadap CAP BMKG dan DIBI.

## 6. Layar

- **Lapisan**: poligon CAP, embusan angin (partikel, sudah ada di banjir), CAPE, hujan per jam,
  gelombang (Open-Meteo Marine), lintasan siklon, petir (bila ada sumber terbuka; jika tidak, T).
- **Laci**: status resmi (CAP/gelombang) → kondisi sekarang → prakiraan 72 jam per jam (grafik
  embusan, hujan, gelombang) → penjelasan tingkat → tindakan (pedoman BMKG) → respons terdekat →
  pelabuhan dan penerbangan terdampak → riwayat kejadian sejenis → bagikan.
- **Insight**: peringatan BMKG per provinsi 30 hari, kejadian DIBI puting beliung per bulan dan
  tren, siklon yang memengaruhi Indonesia sejak 1980 (IBTrACS), kinerja aturan, tabel kejadian C.
- **Tren**: indeks risiko riwayat puting beliung/angin; **kalender musim** per dasarian (A16 berlaku:
  puting beliung memuncak di peralihan musim).
- **Dampak**: penduduk dalam poligon, sekolah, pelabuhan dan penyeberangan (gelombang), penerbangan,
  rumah rusak historis per kejadian.
- **Simulasi**: T (tidak ada model fisik yang jujur untuk sel badai di stdlib). Ganti dengan
  "Prakiraan per jam di titik mana pun" (klik peta → grafik 72 jam).
- **Posko/sarana**: titik kumpul dan kebutuhan atap darurat (terpal, seng) per rumah rusak, dengan
  koefisien bersumber.

## 7. Warga dan media

| Bagian | Isi |
| --- | --- |
| Lapor Warga | `angin` (pohon tumbang, atap terbang, puting beliung terlihat), `hujan_es`, `gelombang` (sub: tinggi, masuk darat). Lencana "cocok dengan peringatan BMKG" bila di dalam poligon CAP aktif |
| Foto | angin & pohon tumbang, puting beliung, hujan es, gelombang, kerusakan, lainnya |
| Pop-up situasi | Peringatan BMKG aktif di provinsi, gelombang ≥ 2,5 m, siklon aktif |
| Berita | puting beliung, angin kencang, cuaca ekstrem, hujan es, gelombang tinggi, siklon |
| OG | `/cuaca/`, per CAP, per provinsi |

## 8. Daftar periksa PAKET-FITUR (rencana awal)

| Kode | Rencana | Kode | Rencana | Kode | Rencana |
| --- | --- | --- | --- | --- | --- |
| A01 | R CAP + Open-Meteo | A14 | R | A27 | R |
| A02 | R peringatan 24/72/7 hari | A15 | R | A28 | R |
| A03 | R cron 5 menit | A16 | R musim peralihan | A29 | R |
| A04 | R 3 jenis kejadian | A17 | R ENSO/MJO memengaruhi | A30 | R |
| A05 | R | A18 | R DIBI + IBTrACS | A31 | R grafik per jam |
| A06 | R poligon CAP / sel | A19 | R | A32 | T awan menutup citra optik |
| A07 | R | A20 | R CAP + Maritim | A33 | R |
| A08 | R | A21 | A titik kumpul | A34 | R |
| A09 | A indeks ambang gabungan | A22 | A terpal/atap | A35 | R pelayaran + penerbangan |
| A10 | R ansambel | A23 | T | A36 | R `factsheet_cuaca.json` |
| A11 | T | A24 | R | A37 | R |
| A12 | T | A25 | A pemangkasan pohon, atap | A38 | T |
| A13 | R §4 | A26 | T | | |
| B01 | A aturan ambang | B05 | R | B09 | R |
| B02 | R §5 | B06 | R | B10 | R `RISET-AMBANG.md` |
| B03 | R | B07 | R grafik per jam | | |
| B04 | R kejadian besar | B08 | R dari ansambel | | |
| C01–C22 | R | C23 | T (diganti prakiraan per titik) | C24–C35 | R |
| A39 | R seri harian per wilayah | A40 | R unit respons + kontak domain | C36–C39 | R (C36 pemilah bahaya di admin) |
| D01–D10 | R | E01–E10 | R | F01–F04 | R |

---

# Kualitas udara & asap

Pengerja: `udara`. Urutan: 4 (riset menilai upaya paling kecil karena CAMS lewat Open-Meteo sudah
dipakai `scripts/data/asap.py`). Keputusan pemilik dibutuhkan: modul sendiri atau tetap bagian
karhutla (ARSITEKTUR "Keputusan" butir 3). Rencana ini mengasumsikan modul sendiri yang mencakup
asap karhutla, polusi kota, dan debu.

## 1. Identitas registry

| Kunci | Nilai |
| --- | --- |
| `id` / `rute` | `udara` / `/udara/` |
| `kejadian.awalan` | `U` |
| `cron_worker` | T (data per jam cukup lewat Actions) |
| Workflow | `udara.yml` tiap 3 jam (CAMS 4 hari, stasiun), harian (riwayat, berita, dampak) |

## 2. Status

| Lapis | Sumber | Tampil sebagai |
| --- | --- | --- |
| ISPU resmi | KLHK (bila endpoint pulih; saat ini [BLOK]) | Didahulukan bila ada |
| Stasiun terukur | OpenAQ, WAQI (dengan atribusi) | Titik stasiun, label "terukur" |
| **ISPU dihitung Pantau Bencana** | PM2,5 dan PM10 CAMS, titik potong Permen LHK P.14/2020 | Label "perkiraan model, bukan ISPU resmi" |

Kategori ISPU: Baik 0–50, Sedang 51–100, Tidak Sehat 101–200, Sangat Tidak Sehat 201–300, Berbahaya > 300.
Titik potong Permen LHK P.14/2020 berlaku untuk **rata-rata 24 jam**: label kategori ISPU hanya
dipakai untuk rata-rata 24 jam bergulir. Nilai per jam disebut "PM2,5 per jam", bukan ISPU.
CAMS global ±40 km meremehkan polusi perkotaan; semua angka model diberi label
"indeks perkiraan model (resolusi ~40 km)" dan stasiun terukur selalu didahulukan.
Tingkat Pantau Bencana: Normal (Baik/Sedang), Waspada (Tidak Sehat), Siaga (Sangat Tidak Sehat), Awas (Berbahaya).

## 3. Kejadian

Episode: kabupaten/kota bersebelahan dengan rata-rata 24 jam bergulir PM2,5 perkiraan di kategori
Tidak Sehat atau lebih buruk, digabung jadi satu kode `U0001`. "Episode" (durasi dalam jam) dipisah
dari "kategori ISPU" (24 jam). Atribut: ISPU maks, polutan dominan, durasi, penduduk, sekolah,
**sumber dugaan** (asap karhutla bila ada kompleks api dalam 300 km arah datang angin 850 hPa;
debu; perkotaan), kompleks karhutla terkait (tautan ke `/k/K0001`).

## 4. Model dan uji balik

- **Model**: CAMS + koreksi bias per stasiun (regresi linear sederhana pada 30 hari terakhir);
  atribusi sumber asap dengan lintasan mundur sederhana memakai angin 850 hPa Open-Meteo.
- **Uji balik**: CAMS PM2,5 vs OpenAQ/WAQI di Jakarta, Palangka Raya, Pekanbaru, Jambi, Pontianak
  musim asap 2019 dan 2023; bias dan RMSE per musim; ketepatan kategori ISPU.
- **Kaitan karhutla**: korelasi titik panas 24 jam di arah datang angin vs PM2,5 (validasi murah;
  data titik sudah dimiliki).

## 5. Layar

- **Lapisan**: PM2,5, PM10, ISPU, CO, AOD, debu (CAMS), stasiun terukur, kompleks api karhutla
  (tautan lintas modul), angin 850 hPa.
- **Laci episode**: ISPU sekarang + 4 hari → stasiun terdekat (terukur) → polutan dominan →
  sumber dugaan + peta lintasan → saran kesehatan per kategori (sumber Kemenkes/KLHK) → sekolah dan
  fasilitas kesehatan → riwayat episode → bagikan.
- **Insight**: hari Tidak Sehat per kota per tahun, musim asap vs titik panas, bias model vs
  stasiun, tabel episode U.
- **Tren**: indeks risiko episode per kab, kalender musim (puncak Agustus–Oktober di Sumatra/Kalimantan).
- **Dampak**: bagian `udara`, `ispa_berita`, `sekolah_berita`, `internasional` di `scripts/data/dampak.py`
  dipakai bersama (diimpor, bukan dipindah; karhutla tidak berubah), ditambah polusi kota.
- **Stasiun WAQI**: hanya nilai terkini bertaut ke sumbernya, tanpa menyimpan atau menerbitkan seri
  (ketentuan WAQI melarang redistribusi massal). Seri stasiun hanya dari OpenAQ.
- **Simulasi**: A "jika angin berbalik": geser arah angin dan lihat kota yang terpapar asap dari
  kompleks aktif.
- **Posko**: T untuk posko lapangan; A untuk "ruang udara bersih" (sekolah/fasilitas dengan
  pemurni udara), bila data tersedia.

## 6. Warga dan media

| Bagian | Isi |
| --- | --- |
| Lapor Warga | Jenis karhutla `udara`/`sehat`/`ruang` dipindah ke bahaya `udara` (tetap tampil di karhutla) |
| Foto | Langit berasap, jarak pandang, masker, lainnya |
| Pop-up | Kota pengguna Tidak Sehat hari ini/besok |
| Berita | kabut asap, ISPU, polusi udara, ISPA, jarak pandang |

## 7. Daftar periksa (rencana awal)

| Kode | Rencana | Kode | Rencana | Kode | Rencana |
| --- | --- | --- | --- | --- | --- |
| A01 | R CAMS + stasiun | A14 | R | A27 | A dipakai bersama `dampak.py` |
| A02 | R | A15 | R | A28 | R |
| A03 | T | A16 | R | A29 | R sekolah/RS |
| A04 | R episode U | A17 | R ENSO | A30 | R |
| A05 | R | A18 | R arsip CAMS sejak 2013 | A31 | R angin 850 hPa |
| A06 | R poligon episode | A19 | R | A32 | R AOD/citra asap |
| A07 | R | A20 | A ISPU KLHK bila pulih | A33 | R |
| A08 | R angin | A21 | A ruang udara bersih | A34 | R |
| A09 | R ISPU dihitung | A22 | T | A35 | R penerbangan (jarak pandang) |
| A10 | R prakiraan CAMS 4 hari | A23 | T | A36 | R |
| A11 | T | A24 | A biaya kesehatan | A37 | R |
| A12 | T | A25 | R | A38 | T |
| A13 | R | A26 | T | | |
| B01 | A koreksi bias | B02–B10 | R | | |
| C01–C22 | R | C23 | A simulasi arah angin | C24–C35 | R |
| A39 | R seri harian per wilayah | A40 | R unit respons + kontak domain | C36–C39 | R (C36 pemilah bahaya di admin) |
| D01–D10 | R | E01–E10 | R | F01–F04 | R |

---

# Gunung api

Pengerja: `gunungapi`. Urutan: 5. Risiko utama: MAGMA tidak punya API terbuka, sehingga pemanen
HTML bisa patah. Siapkan cadangan (GDACS) dan `uji` dengan contoh HTML tersimpan.

## 1. Identitas registry

| Kunci | Nilai |
| --- | --- |
| `id` / `rute` | `gunungapi` / `/gunungapi/` |
| `kejadian.awalan` | `V` |
| `cron_worker` | tiap 5 menit: MAGMA informasi letusan + VONA; tiap 30 menit: GDACS VO |
| Workflow | `gunungapi.yml` tiap 6 jam (level semua gunung, angin lapisan atas, sebaran abu); bulanan (KRB, katalog GVP) |

Bahan yang sudah ada: `GUNUNG_API` (40 gunung, GVP) di `scripts/data/aturan.py`, dipakai untuk
membuang titik panas vulkanik dari karhutla. Dipindah ke `scripts/umum/` dan diperluas ke 127
gunung api aktif Indonesia.

## 2. Status

| Lapis | Sumber | Tampil sebagai |
| --- | --- | --- |
| **Level resmi PVMBG** I Normal, II Waspada, III Siaga, IV Awas + radius rekomendasi km | MAGMA | Status utama, warna dan nama persis PVMBG. **Tidak ada tingkat buatan Pantau Bencana untuk gunung api**: level PVMBG dipakai apa adanya |
| VONA (hijau/kuning/oranye/merah) | MAGMA VONA | Label "untuk penerbangan" |
| GDACS | `alertlevel` | Pembanding, diberi label |

Tingkat per kecamatan (untuk peta) = level gunung bila kecamatan di dalam radius rekomendasi
atau KRB; ini turunan geometri, bukan penilaian ulang.

## 3. Kejadian

Gunung dengan level ≥ II, atau meletus dalam 24 jam. Kode `V` + nomor GVP (stabil). Atribut: nama,
level, tanggal perubahan level terakhir, letusan terakhir, tinggi kolom abu (m di atas puncak),
warna dan arah abu, kode VONA, radius rekomendasi, KRB, penduduk dalam radius dan KRB per tingkat,
desa terdampak, bandara dalam arah abu, riwayat letusan GVP sejak 1900.

## 4. Model dan uji balik

- **Sebaran abu indikatif**: kerucut 2D dari tinggi kolom (VONA) + angin 700/500/300 hPa
  Open-Meteo, interpolasi menurut ketinggian kolom; label tegas "indikatif, bukan VAAC". Python↔JS setara.
- **Uji balik**:
  1. Arah abu perkiraan vs arah yang tertulis di VONA, letusan Semeru, Merapi, Ruang, Lewotobi,
     Marapi 2018–2026 (selisih sudut).
  2. Hubungan level vs letusan: seberapa sering kenaikan level diikuti letusan ≤ 7 hari (GVP).
     Ini informasi, bukan model prakiraan; Pantau Bencana tidak meramal letusan.
- **Prospektif**: catat arah abu perkiraan tiap VONA baru, nilai terhadap VONA berikutnya.

## 5. Layar

- **Lapisan**: gunung api (ikon warna level), radius rekomendasi, KRB I/II/III, kerucut abu, VONA,
  angin lapisan atas, InaRISK gunung api, bandara, desa.
- **Laci**: level resmi + radius (pita) → letusan terakhir dan VONA → rekomendasi PVMBG apa adanya
  → kerucut abu + bandara di jalurnya → penduduk dan desa per KRB → jalur evakuasi dan titik kumpul
  → riwayat letusan → bagikan `/gunungapi/k/V263250`.
- **Insight**: jumlah gunung per level dari waktu ke waktu, letusan per tahun sejak 1900,
  durasi level III/IV, kinerja arah abu, tabel gunung.
- **Tren**: indeks risiko riwayat per kecamatan (kekerapan letusan gunung terdekat, VEI maks,
  penduduk); kalender musim T (letusan tidak bermusim).
- **Dampak**: penduduk per KRB, pengungsi (BNPB), bandara tutup, lahan pertanian terkena abu,
  sekolah, kerugian.
- **Simulasi**: kerucut abu "bagaimana kalau" dengan tinggi kolom pilihan pengguna.
- **Posko**: titik pengungsian di luar radius rekomendasi dengan greedy coverage desa di dalam
  radius; kebutuhan masker, air bersih, tenda.

## 6. Warga dan media

| Bagian | Isi |
| --- | --- |
| Lapor Warga | `abu` (hujan abu tipis/tebal), `lahar` (aliran di sungai), `gemuruh` (suara/getaran) |
| Foto | kolom abu, hujan abu, lahar, pengungsian, lainnya |
| Pop-up | Gunung yang naik level, letusan 24 jam, bandara terdampak abu |
| Berita | erupsi, status gunung, hujan abu, lahar dingin, VONA |
| OG | per gunung, per provinsi |

## 7. Daftar periksa (rencana awal)

| Kode | Rencana | Kode | Rencana | Kode | Rencana |
| --- | --- | --- | --- | --- | --- |
| A01 | R MAGMA HTML + GDACS | A14 | A level ≥ III = prioritas | A27 | R |
| A02 | R | A15 | R | A28 | R |
| A03 | R cron 5 menit | A16 | T | A29 | R |
| A04 | R gunung = kejadian | A17 | T | A30 | R |
| A05 | R | A18 | R GVP | A31 | R angin lapisan atas |
| A06 | R radius/KRB/kerucut | A19 | R | A32 | R citra sebelum/sesudah |
| A07 | R | A20 | R PVMBG/VONA | A33 | R |
| A08 | R angin | A21 | R | A34 | R |
| A09 | T level resmi dipakai | A22 | R masker/air/tenda | A35 | R penerbangan |
| A10 | T | A23 | A pangkalan helikopter evakuasi | A36 | R |
| A11 | T | A24 | R | A37 | R |
| A12 | T | A25 | R latihan evakuasi | A38 | R KRB |
| A13 | A turunan geometri level resmi | A26 | T | | |
| B01 | A kerucut abu | B02 | R arah abu + level | B03–B10 | R |
| C01–C22 | R | C23 | R kerucut abu | C24–C35 | R |
| A39 | R seri harian per wilayah | A40 | R unit respons + kontak domain | C36–C39 | R (C36 pemilah bahaya di admin) |
| D01–D10 | R | E01–E10 | R | F01–F04 | R |

---

# Kekeringan

Pengerja: `kekeringan`. Urutan: 6. Data lambat, tidak butuh jalur cepat. Banyak bahan sudah ada:
`tanah.json` (kelembapan tanah vs iklim), DC FWI, InaRISK kekeringan, kejadian DIBI `kering`,
`iklim.json` (ONI/DMI), arsip titik panas (validasi murah).

## 1. Identitas registry

| Kunci | Nilai |
| --- | --- |
| `id` / `rute` | `kekeringan` / `/kekeringan/` |
| `kejadian.awalan` | `D` |
| `cron_worker` | T |
| Workflow | `kekeringan.yml` harian (HTH, SPI, kelembapan tanah); mingguan (prospek musiman) |

## 2. Status

| Lapis | Sumber | Tampil sebagai |
| --- | --- | --- |
| Peringatan dini kekeringan BMKG | Buletin dasarian (endpoint lama 404, [BV]) | Didahulukan bila bisa dipanen |
| **HTH dihitung** | Hujan harian ERA5 | Kelas BMKG: Sangat Pendek 1–5, Pendek 6–10, Menengah 11–20, Panjang 21–30, Sangat Panjang 31–60, Kekeringan Ekstrem > 60 hari [BV: cocokkan dengan buletin BMKG sebelum tayang]. Definisi "hari tanpa hujan" (ambang mm/hari) ditulis di Metode |
| **SPI-1/3/6** | idem | ≤ −2 ekstrem, ≤ −1,5 parah, ≤ −1 sedang |
| Tingkat Pantau Bencana | Waspada (HTH > 30 atau SPI-3 ≤ −1), Siaga (HTH > 45 atau SPI-3 ≤ −1,5), Awas (HTH > 60 atau SPI-3 ≤ −2) | Hipotesis, dikunci uji balik |

## 3. Kejadian

Kompleks kekeringan: kabupaten bersebelahan dengan tingkat ≥ Waspada, digabung (pola DBSCAN
karhutla). Kode `D`. Atribut: luas, durasi, HTH maks, SPI, kelembapan tanah persentil, penduduk,
luas sawah/kebun (bila data terbuka), sumber air (waduk, bila ada), titik panas di dalamnya
(tautan karhutla), kejadian DIBI kering sebelumnya.

## 4. Model dan uji balik

- **SPI**: sebaran gamma dengan estimasi MLE (pendekatan Thom), CDF lewat **fungsi gamma tidak
  lengkap yang ditulis sendiri** (deret untuk x kecil, pecahan berlanjut untuk x besar; stdlib tidak
  menyediakannya, `math.erf` saja tidak cukup), lalu transformasi ke normal baku. `uji` mencocokkan
  dengan nilai tabel terbitan. Per kabupaten dulu, per sel 0,25° belakangan.
- **Sumber hujan: ERA5 (Open-Meteo) saja.** CHIRPS `.tif.gz` 0,05° global per hari terlalu berat
  diurai dengan stdlib. Klimatologi 1991–2020 diunduh **bertahap beberapa hari** dan dicache, karena
  panggilan rentang panjang dihitung berbobot dan bisa melewati 10.000 panggilan/hari.
- **Prospek musiman**: tabel anomali hujan bersyarat fase ENSO/IOD per provinsi per bulan dari
  1981–2020; keluaran peluang tiga kategori (di bawah/normal/di atas normal).
- **Uji balik**: SPI dan tingkat vs tahun kering terkenal (1997, 2015, 2019, 2023), vs kejadian DIBI
  `kering`, dan vs titik panas karhutla (korelasi musim kering parah ↔ titik panas tinggi);
  prospek musiman diuji dengan skor Brier per tahun 2001–2025 (validasi silang tinggal-satu-tahun).

## 5. Layar

- **Lapisan**: HTH, SPI-1/3/6, kelembapan tanah persentil, prospek musiman, InaRISK kekeringan,
  titik panas (lintas modul), waduk/bendungan.
- **Laci kompleks**: tingkat + angka → peta HTH/SPI → kelembapan tanah → prospek 1–3 bulan →
  penduduk dan lahan pertanian → sumber air → titik panas di dalamnya → riwayat kekeringan →
  saran (pedoman BNPB/Kementan) → bagikan.
- **Insight**: luas wilayah per kelas SPI dari waktu ke waktu, kekeringan vs ENSO sejak 1981,
  kekeringan vs titik panas, kinerja prospek, tabel kompleks D.
- **Tren**: indeks risiko riwayat, kalender musim kemarau per dasarian.
- **Dampak**: penduduk terdampak, sawah puso (bila data Kementan terbuka), air bersih, kaitan
  karhutla, kerugian.
- **Simulasi**: A "jika hujan X mm dalam 30 hari": hitung ulang HTH/SPI.
- **Posko**: titik distribusi air bersih (greedy coverage desa tingkat ≥ Siaga), kebutuhan tangki
  air per 1.000 jiwa (Sphere: 15 liter/orang/hari).

## 6. Warga dan media

| Bagian | Isi |
| --- | --- |
| Lapor Warga | `air` (sumur kering, PDAM mati, butuh air), `panen` (gagal panen) |
| Foto | sawah kering, sumur/sungai kering, distribusi air, lainnya |
| Pop-up | Kabupaten pengguna naik tingkat, HTH terpanjang |
| Berita | kekeringan, krisis air bersih, gagal panen, kemarau panjang |

## 7. Daftar periksa (rencana awal)

| Kode | Rencana | Kode | Rencana | Kode | Rencana |
| --- | --- | --- | --- | --- | --- |
| A01 | R ERA5 (CHIRPS ditunda) | A14 | R | A27 | R |
| A02 | A 30/90/180 hari | A15 | R | A28 | R |
| A03 | T | A16 | R | A29 | R |
| A04 | R kompleks D | A17 | R ENSO/IOD inti | A30 | R |
| A05 | R | A18 | R ERA5 sejak 1981 | A31 | T |
| A06 | R poligon kabupaten | A19 | R | A32 | A NDVI bila memungkinkan, jika tidak T |
| A07 | R | A20 | A buletin BMKG | A33 | R |
| A08 | R | A21 | A titik air bersih | A34 | R |
| A09 | R HTH + SPI | A22 | R tangki air | A35 | A pertanian |
| A10 | A prospek musiman | A23 | T | A36 | R |
| A11 | R kelembapan tanah | A24 | R | A37 | R |
| A12 | T | A25 | R embung/sumur bor | A38 | R waduk |
| A13 | R | A26 | T | | |
| B01 | R SPI + prospek | B02–B10 | R | | |
| C01–C22 | R | C23 | A simulasi hujan | C24–C35 | R |
| A39 | R seri harian per wilayah | A40 | R unit respons + kontak domain | C36–C39 | R (C36 pemilah bahaya di admin) |
| D01–D10 | R | E01–E10 | R | F01–F04 | R |
