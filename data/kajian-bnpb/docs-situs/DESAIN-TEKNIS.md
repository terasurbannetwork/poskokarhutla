# Desain teknis: Docs

## 1. Keputusan arsitektur (ADR)

| Kode | Keputusan | Alasan | Alternatif ditolak |
| --- | --- | --- | --- |
| A1 | Generator offline `scripts/docs/bangun.py` (Python 3.12 stdlib) menulis HTML statis ke `public/docs/` | Sesuai pipeline repo (stdlib, tanpa pip), HTML jadi berisi teks (bisa dicari dan dicetak), tanpa rute API baru; catatan: tiap tampilan HTML tetap memanggil Worker (lihat bagian 5a) | Render peramban dengan `marked` (CDN, halaman kosong tanpa JS); render di Worker; generator pihak ketiga |
| A2 | Keluaran di-commit, bukan dibangun saat terbit | Server tinjau lokal melayani folder kerja; cache terbit tidak perlu tahu Docs; gerbang `--cek` menjaga kesegaran | Bangun di `terbit.yml` saja (tinjau lokal butuh langkah tambahan) |
| A3 | Pencarian = `cari.json` statis, dicari di peramban | Tanpa D1 dan Worker; jumlah teks kecil (sekitar 300 halaman pendek) | Layanan pencarian, D1 FTS |
| A4 | Halaman Docs hanya aset statis plus rute `HTML_RUTE`; tidak ada rute API baru | Tidak menambah permukaan serangan | Rute `/api/docs` |
| A5 | Alias subdomain ditangani Worker (pengganti `Host`), bukan salinan isi | K2: satu isi, dua alamat | Salinan di repo lain |
| A6 | Agent pemilik baru `docs-situs` | Folder baru dengan kelas kerja berulang (AGENTS.md §1.5), `layar-peta` sudah sangat luas | Menitipkan ke `layar-peta` |
| A7 | Struktur (bagian, kelompok, modul, halaman) di satu `docs/centurisk97/peta.json`, bukan nama berkas atau kamus di generator (K6, K7) | Pemecahan 14 modul menjadi sekitar 300 halaman pendek tidak boleh bergantung pada penamaan; satu berkas menjaga urutan baca, navigasi, `cari.json`, dan rute tetap sepaham | Kamus `LABEL_NAV` dan penamaan `NN-slug.md` saja |
| A8 | Dua bagian terpisah (Panduan `/docs`, Pengembang `/docs/pengembang`), dua sumber isi terpisah, satu bilah atas Docs tanpa kepala situs bersama (K6, K8) | Pembaca awam dan pengembang butuh penjelasan berbeda; dua bilah atas membingungkan | Pemilih sudut dalam satu halaman (dihapus), kepala situs navy ditambah kepala Docs |

## 2. Berkas

Revisi 24 Nov 2026 (K6, K7, K8): satu berkas modul lama menjadi banyak berkas halaman; struktur dibaca dari `docs/centurisk97/peta.json`.

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `docs/centurisk97/peta.json` | Sumber kebenaran struktur: bagian, kelompok, modul, halaman, judul, ikon, ringkas, `mulai` (bagian 4) | `docs-situs` |
| `docs/centurisk97/panduan/<modul>/NN-<halaman>.md` | Sumber halaman Panduan (bahasa awam; tanpa nama berkas, kode, rute API, tabel, workflow) | `docs-situs` |
| `docs/centurisk97/pengembang/<modul>/NN-<halaman>.md` | Sumber halaman Pengembang (teknis, rujukan `berkas:baris`) | `docs-situs` |
| `docs/centurisk97/README.md`, `panduan/README.md` (bila ada) | Beranda: kalimat pembuka dan cakupan | `docs-situs` |
| `docs/centurisk97/NN-slug.md` (14), `panduan/NN-slug.md` (14) | Berkas MODUL LAMA: bahan pemecahan sampai semua halaman baru lengkap, lalu dihapus (tiket DC-14). Sampai dihapus keduanya tidak dibangun menjadi HTML bila `peta.json` ada | `docs-situs` |
| `scripts/docs/bangun.py` | Pembaca `peta.json`, pemeriksa, penghurai Markdown, penulis HTML dan JSON; mode `--uji`, `--cek`, `--cek-sumber`, `--jalur` | `docs-situs` |
| `scripts/docs/templat.html` | Cangkang halaman (bilah atas Docs, bilah samping, kaki) dengan penanda isi | `docs-situs` |
| `public/docs/index.html`, `public/docs/pengembang/index.html` | Beranda Panduan dan beranda Pengembang, keluaran | `docs-situs` |
| `public/docs/<modul>/index.html`, `public/docs/pengembang/<modul>/index.html` | Halaman depan modul, keluaran | `docs-situs` |
| `public/docs/<modul>/<halaman>.html`, `public/docs/pengembang/<modul>/<halaman>.html` | Halaman, keluaran | `docs-situs` |
| `public/docs/cari.json` | Indeks cari, keluaran | `docs-situs` |
| `public/docs/_bangun.json` | Hash sumber, tanggal bangun, jumlah halaman, keluaran | `docs-situs` |
| `public/docs/docs.css`, `gambar.css`, `cetak.css` | Gaya, tulisan tangan, nol literal warna | `docs-situs` |
| `public/docs/docs.js` | Navigasi mulus, pencarian, daftar isi, laci, tombol salin, tema; tanpa build step | `docs-situs` |
| `public/docs/sudut.js` | DIHAPUS (K6) | `docs-situs` |
| `src/docs_rute.js` | `ruteDocs()` dan `jalurDocs()` dari daftar jalur tertutup (bagian 3) | `warga-api` |
| `src/worker.js` | Menyisipkan `...ruteDocs()`, awalan `/docs` pada `halamanTerkunci` dan `PUBLIK_TANPA_SESI`, penggantian host alias | `warga-api` |
| `tests/docs/*.test.mjs`, `tests/agen/gerbang-docs.test.mjs` | Uji dan gerbang | `docs-situs` (gerbang di `tests/agen`: `penulis-gerbang`) |
| `.github/workflows/terbit.yml` | Langkah `bangun.py --cek` | `mekanik-mesin` |
| `scripts/agents/roster.json` | Entri agent `docs-situs` | `mekanik-mesin` |
| `AGENTS.md` | Bagian 2.47 dan baris peta modul (perlu diperbarui: lima bagian baku tidak lagi berlaku per halaman) | pemilik repo |

Catatan: `public/docs/` berisi keluaran dan aset tulisan tangan. Generator tidak pernah menimpa `docs.css`, `gambar.css`, `cetak.css`,
`docs.js`, dan `gambar/`; daftar keluaran yang boleh ditulis tertanam di kode (`index.html`, `pengembang/**`, `<modul>/**`,
`cari.json`, `_bangun.json`) dan folder keluaran yang tidak lagi ada di `peta.json` dibersihkan oleh generator hanya di bawah
`public/docs/<modul>/` dan `public/docs/pengembang/`.

## 3. Rute

Halaman bersarang (modul, halaman), jadi daftar slug datar tidak cukup. Jalur kanonik:

| Jalur | Berkas aset | Akses |
| --- | --- | --- |
| `/docs` | `/docs/index.html` | Publik (Q1, bawaan) |
| `/docs/pengembang` | `/docs/pengembang/index.html` | Publik |
| `/docs/<modul>` | `/docs/<modul>/index.html` | Publik |
| `/docs/<modul>/<halaman>` | `/docs/<modul>/<halaman>.html` | Publik |
| `/docs/pengembang/<modul>` | `/docs/pengembang/<modul>/index.html` | Publik |
| `/docs/pengembang/<modul>/<halaman>` | `/docs/pengembang/<modul>/<halaman>.html` | Publik |
| `/docs/cari.json`, `/docs/*.js`, `/docs/*.css`, `/docs/gambar/*` | aset statis | Publik, tanpa Worker |
| `/docs/<modul>/index.html`, `/docs/**/<halaman>.html` (alamat langsung) | sama | Dikecualikan di `halamanTerkunci` seperti `/lapor/index.html` |

Rute dari DAFTAR TERTUTUP, bukan pola bebas: generator mencetak semua jalur kanonik dengan `python3 -I scripts/docs/bangun.py --jalur`
(satu jalur per baris; sekitar 340 baris bila peta 24 Nov 2026), `src/docs_rute.js` menyimpannya sebagai struktur ringkas
`DOCS_PETA = {modul: {panduan: [halaman...], pengembang: [halaman...]}}` dan `jalurDocs(j)` memeriksa keanggotaan (dua Set, bukan 340 ekspresi
reguler). `ruteDocs()` menghasilkan entri `HTML_RUTE` lewat satu fungsi pencocok, bukan satu entri per jalur. Gerbang `tests/docs/rute.test.mjs`
menjamin himpunan jalur yang diterima Worker sama persis dengan `--jalur`; menambah modul atau halaman = ubah `peta.json` lalu `DOCS_PETA`,
uji gagal bila lupa. Id modul tidak boleh `pengembang`, `cari`, `gambar`, atau berakhiran `.json`, `.js`, `.css` (generator menolak).
Jalur lama `/docs/<slug>` (14 slug lama) diarahkan 301 (usulan, ikut DC-16) ke halaman depan modul yang bersangkutan pada bagian Panduan (tabel pemetaan di
`peta.json` tidak perlu; id modul baru dipilih dari slug lama: `pipeline-karhutla` menjadi `data-karhutla`, `gempa-gunungapi-longsor` menjadi
`gempa-gunungapi`, `cuaca-udara-semai` menjadi `cuaca-udara`, `akses-instansi` menjadi `akses`, `kampus-sippa-air` menjadi `kampus-sippa`; entri
pengalihan 5 slug itu berada di `src/docs_rute.js`, sembilan lainnya tidak berubah).

`PUBLIK_TANPA_SESI` pencocokannya persis. Perubahan kecil yang dibutuhkan di `halamanTerkunci`: sebelum baris
`if (/\.html$/i.test(...))`, tambah pengecualian `/^\/docs\/.+\.html$/` dan `jalur === "/docs" || jalur.startsWith("/docs/")`
mengembalikan `false`. Alasan tertulis di entri `PUBLIK_TANPA_SESI` untuk `/docs`. Rujukan baris kode ini diisi sesudah DC-16.
Sebelumnya bagian ini bersifat rancangan, "belum terdokumentasi di kode" untuk bentuk bersarang.

## 4. Struktur dari `docs/centurisk97/peta.json`

Generator tidak mengenal topik dan tidak membaca nama berkas lama; ia membaca `peta.json` dan memeriksa tiap berkas yang disebut. Skema
(satu berkas, JSON, kunci Indonesia):

| Kunci | Isi |
| --- | --- |
| `versi` | Bilangan bulat; naik bila skema berubah |
| `bagian[]` | `{id, judul, awalan}` untuk `panduan` (`/docs`) dan `pengembang` (`/docs/pengembang`) |
| `kelompok[]` | `{id, judul, bagian}`; kelompok khusus satu bagian ditandai `bagian` (id kelompok unik) |
| `modul[]` | `{id, kelompok, ikon, judul, ringkas, halaman}`; `id` a-z0-9 dan tanda hubung, unik |
| `modul[].kelompok` | Objek `{panduan, pengembang}` berisi id kelompok per bagian (satu modul bisa berbeda kelompok di dua bagian). Bila modul hanya ada di satu bagian, kunci bagian lain dihilangkan |
| `modul[].ikon` | Nama dari kamus `IKON` di `bangun.py` (generator menolak nama tak dikenal) |
| `modul[].judul` dan `ringkas` | Objek `{panduan, pengembang}`; `ringkas` satu kalimat |
| `modul[].halaman` | Objek `{panduan: [...], pengembang: [...]}`; tiap halaman `{id, judul, berkas, isi}` |
| `halaman.id` | a-z0-9 dan tanda hubung, unik di dalam modul dan bagian; halaman pertama `sekilas` (Panduan) atau `ikhtisar` (Pengembang), terakhir `batasan` |
| `halaman.judul` | Paling banyak 40 karakter (diuji), awam dan spesifik |
| `halaman.berkas` | Jalur relatif `docs/centurisk97/`: `panduan/<modul>/NN-<id>.md` atau `pengembang/<modul>/NN-<id>.md`; NN urutan baca di dalam modul |
| `halaman.isi` | Catatan pemecahan: heading berkas lama yang masuk halaman; HANYA petunjuk bagi penulis, tidak dibaca generator |
| `mulai` | `{panduan: [...], pengembang: [...]}` kartu "Mulai dari sini": `{peran, judul, ringkas, tautan:[[modul, halaman], ...]}`; tautan harus ada |

Aturan pemeriksaan (galat bila gagal, `--cek-sumber` dan `--uji`): id unik; berkas ada; NN berurutan tanpa celah; halaman pertama dan terakhir
sesuai aturan; judul halaman paling banyak 40 karakter dan judul modul paling banyak 40; tiap `ikon` dikenal; tiap `mulai.tautan` ada;
setiap halaman paling banyak 6 `h2` dan 1.300 kata (ambang peringatan 1.200; di atas 1.300 gagal); halaman Panduan tidak memuat kode inline
berupa jalur berkas, nama rute `/api/`, `.py`, `.mjs`, `.js`, atau kata "Worker", "D1", "R2", "cron" (pemeriksa awam, peringatan dulu sampai
isi bersih, lalu galat); jumlah modul dan halaman tidak dikeraskan di uji. Urutan baca seluruh bagian = urutan kelompok, modul, halaman di
`peta.json` (dipakai Sebelumnya dan Berikutnya, bagian 4 DESIGN-SYSTEM).

Kondisi 24 Nov 2026 (bukan konstanta): 14 modul, Panduan 129 halaman (rata-rata sekitar 550 kata per halaman, terbesar sekitar 1.030),
Pengembang 178 halaman (rata-rata sekitar 700 kata, terbesar sekitar 1.300).

## 5. Kepala, tema, dan skrip

- Halaman memuat `/halaman_statis.js` di `<head>` (tema sebelum CSS), lalu `/inti/tema.css`, `/inti/kartu.css` bila perlu, `/docs/docs.css`,
  `/docs/gambar.css`, `/docs/cetak.css`. TIDAK memuat `/inti/kepala.css` dan `/inti/kepala.js` (K8: satu bilah atas khusus Docs, tanpa kepala situs
  navy dan tanpa pemilih bencana); bilah atas, logo, tab bagian, tombol tema, dan tautan Ke situs ditulis templat. Gerbang kepala situs wajib
  mengecualikan `/docs` (dicatat K8). `sudut.js` dihapus.
- Tanpa skrip inline; semua perilaku di `docs.js`. Ini membuat halaman kompatibel dengan CSP ketat, tetapi penegakannya butuh aturan per jalur di `public/_headers` (lihat di bawah).
- `public/_headers`: aturan `/*` memuat `'unsafe-inline'` pada `script-src` (`public/_headers:14-25`). Agar CSP ketat benar-benar berlaku, tambahkan blok `/docs/*.html` dengan `Content-Security-Policy: script-src 'self'` (pola yang sama dengan `/dokumen.html`), tanpa `'unsafe-inline'`. Berkas ini ikut tiket DC-03, pemilik `warga-api`.
- Tombol Keluar: Worker menyisipkan `/inti/keluar.js` ke setiap HTML bersesi lewat `pasangKeluar` (`src/worker.js:803-806`); entri `PUBLIK_TANPA_SESI` dicocokkan persis, jadi `/docs/<slug>` tetap menerimanya. `public/inti/keluar.js:6` menolak bila `<body>` memuat atribut `data-tanpa-keluar`. Templat Docs wajib memasang `data-tanpa-keluar` pada `<body>` karena pembaca Docs tidak punya sesi, dan RENCANA-UJI memeriksanya.
- Kaki: `public/kaki.js` TIDAK dipakai. Skrip itu berhenti bila `html[data-situs="w"]` (`public/kaki.js:3-5`), atribut yang dipasang Worker di `centurisk97.id` dan `workers.dev` (`src/worker.js:721`, `829`); skrip itu juga hanya untuk halaman Insight, Berita, Tren, Dampak, dan Foto dan menyuntik gaya inline. Kaki Docs dibuat sederhana di templat (tautan Docs dan tanggal bangun, tanpa skrip). Tautan "Docs" di kaki halaman lain tidak punya jalan sampai pemilik menjawab Q7 (T2).

## 5a. Biaya per tampilan

`wrangler.jsonc` memakai `run_worker_first` untuk `/*.html`, dan rute di `HTML_RUTE` lewat `layaniHTML` (`src/worker.js:787`). Di sana tiap tampilan membaca D1 lewat `Pub.angkaPil` (`src/worker.js:826`), menulis hit lewat `catatHTML` dan `Pub.catatHit` (`src/worker.js:840`), dan menjalankan `HTMLRewriter`. Di host terkunci respons berstatus `private, no-store`, sehingga tidak disimpan di cache tepi. Jadi halaman Docs statis dan tanpa rute API baru, tetapi bukan tanpa biaya Worker dan D1; kuota baca D1 paket Free pernah habis (memori repo). Dipilih di DC-03 (24 Nov 2026, temuan pemeriksa guard-api): `/docs` dikecualikan dari `catatHTML` dan `Pub.angkaPil` dan tidak dipaksa `private, no-store`, sehingga tampilan Docs tanpa baca atau tulis D1 dan boleh di-cache tepi. Akibatnya tampilan Docs tidak masuk statistik tamu.

## 6. Pembangunan

```
python3 -I scripts/docs/bangun.py            # tulis keluaran
python3 -I scripts/docs/bangun.py --cek      # bandingkan, keluar 1 bila basi
python3 -I scripts/docs/bangun.py --cek-sumber
python3 -I scripts/docs/bangun.py --jalur    # daftar jalur kanonik (pengganti --slug)
python3 -I scripts/docs/bangun.py --uji      # uji diri
```

Perintah npm: `npm run uji:docs` (rancangan; skrip ini belum ada) menjalankan `--uji`, `--cek`, lalu `node --test --test-concurrency=1 tests/docs/*.test.mjs`.
`uji:agen` ikut menjalankan gerbang di `tests/agen/`.

## 7. Workflow

Tidak ada workflow terjadwal baru. `terbit.yml` menambah langkah sebelum deploy: `python3 -I scripts/docs/bangun.py --cek` dan `npm run uji:docs`. Saat ini `terbit.yml` hanya menjalankan `uji:agen`, `tests/warga`, dan `uji:sippa` (`.github/workflows/terbit.yml:44-52`), dan `.githooks/pre-push` hanya `uji:agen`, `uji:warga`, dan `uji:sippa` bersyarat (`.githooks/pre-push:83-101`); keduanya harus diubah (DC-08).
Isi Docs berubah hanya oleh commit, jadi tidak perlu jadwal. Bila kelak pembaruan dari data hidup diinginkan
(misal tanggal tarikan data terakhir), itu keputusan baru, bukan bagian paket ini.

## 8. Alias `docs.centurisk97.id`

Kebutuhan: DNS dan rute worker untuk host itu (tindakan pemilik di dasbor; tidak dikerjakan agent). Perubahan kode:
di `src/worker.js`, bila `Host` = `docs.centurisk97.id`, jalur `/` diperlakukan sebagai `/docs` dan jalur lain (`/pengembang`, `/<modul>`, `/<modul>/<halaman>`) sebagai
`/docs/...` yang sesuai; aset `/docs/*` tetap. host itu WAJIB masuk `hostTerkunci` (`src/worker.js:716-719`) dan `situsCenturisk` (`src/worker.js:721`), karena gerbang halaman hanya berjalan bila `hostTerkunci(host)` benar (`src/worker.js:967`); bila host itu tidak masuk, gerbang mati untuk semua cangkang HTML situs di host tersebut (`/monitor`, `/direktori`, `/admin`, dan lainnya), dan atribut `data-situs="w"` tidak terpasang. Docs tetap terbuka karena pengecualian `/docs` di `halamanTerkunci` (bagian 3), bukan karena host itu dikeluarkan dari daftar terkunci (Q1). URL kanonik di
`<link rel="canonical">` tetap `https://centurisk97.id/docs/...` sampai pemilik memutuskan lain.

## 9. Batas ukuran

Halaman diharapkan di bawah 120 KB (tiap halaman sekitar 1.200 kata paling banyak), halaman depan modul di bawah 40 KB, `cari.json` di bawah 600 KB (sekitar 340 halaman; indeks dipecah per bagian bila melewati ambang, `cari-panduan.json` dan `cari-pengembang.json`, dimuat sesuai bagian yang dibuka) Generator mencetak peringatan di atas ambang
itu dan menolak di atas 1 MB per berkas (batas aset praktis; belum diukur pada isi nyata).

## 10. Pertanyaan teknis yang belum terjawab

| Kode | Pertanyaan | Bawaan sementara |
| --- | --- | --- |
| T1 | Apakah ada alamat repo publik yang boleh ditautkan untuk rujukan `berkas:baris`? | Tidak ditautkan; rujukan teks saja |
| T2 | Apakah `public/kaki.js` cocok dimuat di halaman Docs? | Tidak cocok (berhenti di `data-situs="w"`, hanya untuk lima halaman, menyuntik gaya inline); Docs memakai kaki sederhana di templat |
| T3 | Berapa lama jalur lama `/docs/<slug>` (14 slug) tetap hidup? | Dialihkan 301 ke halaman depan modul pada Panduan, tanpa batas waktu |
| T4 | Apakah indeks cari satu berkas cukup bila lebih dari 300 halaman? | Satu `cari.json` sampai ambang 600 KB, sesudahnya dipecah per bagian |
