# visual

Pembuat peta, grafik, dan ikon untuk dua kajian BNPB. Penulis bab cukup menulis **spek JSON**; mesin membaca data,
`tema.json`, dan font Roboto, lalu menulis SVG, PNG 300 dpi (dengan pHYs), dan manifest JSON per gambar.
Sumber, catatan, dan keterangan gambar ditulis di luar gambar oleh pembangun DOCX (dari manifest); baris kaki unsur peta
(catatan batas tidak resmi, sumber batas, sistem referensi, proyeksi) dibakar ke PNG peta.

| Berkas | Isi |
| --- | --- |
| `dasar.mjs` | tema dan token warna, metrik Roboto dari `hmtx`/`cmap`, kanvas SVG berkotak dengan buku hex per peran, pemuat data, `fmt`/`fmtSig`/`sisaTerbesar`, legenda (`<g class="legenda" data-warna>`), gerbang `periksa()` |
| `peta.mjs` | koroplet kab/kota atau provinsi (kelas resmi IRBI dari kolom data, atau ramp + rumus/kuantil), simbol sebanding luas, label pil tanpa tumpuk, inset, skala batang + utara di pojok bebas daratan, baris kaki |
| `grafik.mjs` | `batang` G1, `horizontal` G4, `garis` (label di ujung garis), `rentang` G12 (median + angka tercatat), `bertumpuk` G8/G9, `matriks-titik` G16, `matriks` G17/G18 |
| `ikon.mjs` | glif dari registri `tema.json` `glif` (Lucide 1.54.0 dan khusus) dan `ikon.mjs` deck harian (`deck:`), ikon di lingkaran, lembar registri |
| `render.mjs` | CLI: spek ke SVG, PNG, manifest; `--lembar` lembar bukti A4; `--periksa=DIR` gerbang atas keluaran yang sudah ada (dipakai `qa/periksa.py --visual`) |
| `uji.mjs` | uji diri berbasis `assert`; `--fixture=DIR` menulis fixture qa |
| `spek/*.json` | 11 spek contoh dengan data nyata (IRBI, DIBI, skenario hidromet, bendungan) |

## Ketergantungan (tidak ada yang dipasang repo)

- **Node >= 22.2** (`zlib.crc32` untuk pHYs, `import.meta.dirname`).
- **Roboto** Regular dan Bold di jalur `tema.json` `font.berkas` (bawaan `~/Library/Fonts`); di mesin lain `ROBOTO_DIR=/folder/ttf`.
- **Playwright + Chromium**, hanya untuk PNG dan PDF: `PLAYWRIGHT=/jalur/node_modules/playwright`, dan `CHROME=/jalur/chrome-headless-shell`
  bila Chromium bawaan Playwright belum diunduh. Tanpa itu pakai `--tanpa-png` (SVG + manifest + gerbang tetap jalan).
- Opsional `LUCIDE_DIR=/jalur/lucide-react/dist/esm/icons`: `uji.mjs` membandingkan glif `lucide:` di `tema.json` dengan paketnya.
- Berkas lintas modul yang dibaca: `public/geo/provinsi.json`, `public/geo/kabupaten/{prov}.json` (batas, asal belum
  terdokumentasi), `scripts/udara/kota.json` (kode kab), `public/banjir/data/meta.json` (nama provinsi),
  `data/laporan-bnpb/harian-2026-10-23/ikon.mjs` (glif deck), dan paket `data/kajian-bnpb/data/**`.

## Cara membuat ulang dan memeriksa

```sh
cd data/kajian-bnpb/bangun/visual
export PLAYWRIGHT=... CHROME=...       # lihat di atas
node render.mjs --lembar               # semua spek/*.json -> keluaran/*.svg|png|json + lembar.pdf; keluar 1 bila gerbang gagal
node uji.mjs                           # fungsi murni, spek lolos gerbang, invarian dari paket, fixture negatif, PNG 300 dpi
pdftoppm -r 60 -png keluaran/lembar.pdf keluaran/lembar   # lalu baca tiap PNG
python3 ../../qa/periksa.py --visual keluaran --semua     # gerbang resmi D-8, D-21, D-24, D-28 (menjalankan uji.mjs dulu)
```

## Menyetel tampilan

Tidak ada hex, ukuran huruf, atau jarak di kode. Semua di `../../tema.json`: `visual.tipografi.docx|slide` (huruf per peran,
termasuk `kaki`), `visual.ukuran_slide`, `visual.rasio_tinggi`, `visual.ikon`, `peta.*`, `grafik.*` (warna seri termasuk
`seri-lama`, `seri-lainnya`, `warna_tercatat`, ukuran titik matriks), `garis_pt.*`, `glif` (path ikon). Sesudah menyunting:
`python3 ../kontrak/tema.py` lalu `node uji.mjs`.

## Spek

Kunci umum: `nama`, `jenis`, `pesan` (kode G yang punya perender, lihat `PESAN_JENIS` di `dasar.mjs`) atau `alasan` (satu
kalimat bila bentuk di luar tabel B5.10), `ukuran`, `tinggi_cm`, `mode`, `pil`, `kepala` (`{kiri, neto: true, seri}`; `seri`
wajib bila lebih dari satu seri), `keterangan` (wajib bertahun, D-31), `sumber`, `catatan` (<= 120 karakter), `token`.
`{nama}` di keterangan/sumber/catatan diganti dari `token.nama = {sumber, kolom}` (harus tepat satu nilai di data) atau dari
perender (`{rumus_kelas}`), supaya angka di Sumber tidak diketik.

Sumber data: `{berkas, saring, kecuali, jalur, kelompok, ringkas}` atau larik baris. Kolom saring yang tidak ada atau saring
tanpa hasil adalah galat.

| Jenis | Kunci khusus |
| --- | --- |
| `peta` | `besaran` (`rasio`, `indeks`, `total`; koroplet hanya rasio/indeks), `cakupan`, `tingkat`, `koroplet.{sumber+kunci+nilai, kelas}`; `kelas` = `{skala: "irbi", kolom}` (kelas resmi dari data, judul dan nama dari tema) atau `{ramp, kuantil \| batas + rumus, desimal}` (data IRBI wajib ramp api dan berumus); `titik[]`; `label.{provinsi, provinsi_teratas: {n, sumber, kunci, nilai}, wilayah_teratas, laut}`; `sorot`; `inset`; `skala` |
| `batang` | `data`, `pembanding`, `tekan`, `warna`, `warna_lama`, `legenda.*` atau `seri_label`, `desimal` |
| `horizontal` | `data.{x, y, kolom_tambahan}`, `n`, `urut`, `sorot`, `seri_label`, `judul_kolom` |
| `garis` | `seri[]` (`label`, `label_ujung`, `warna`, `gaya`, `data`), `pita`, `anotasi[]` (<= 3), `dari_nol` |
| `rentang` | `data.{kategori, rendah, tinggi, tengah, urutan, label_kategori, warna_kategori, legenda_warna, tercatat: {sumber, kategori, nilai, label}}`, `satuan`, `tercatat_batas_bawah` (bawaan true) |
| `bertumpuk` | `data.{x, seri, nilai, kelompok, urutan_x}`, `seri[]` (<= 5; `lainnya` tanpa warna memakai `seri-lainnya`) |
| `matriks-titik` | `data.{baris, urutan, kolom[]}`, `kelas`, `judul_legenda`; `manifest.sel` = bahan tabel peta panas native di DOCX |
| `matriks` | `kolom`, `baris`, `butir[]` atau `data.{nama, x, y, ambang_x, ambang_y}` |
| `ikon` | `konsep`, `gaya`, `diameter_mm`, `satuan` |

Warna seri dari ramp `skala.*` ditolak (B1.8). Label tanpa data selalu "Belum terdata" kecuali spek menulis alasan.

## Gerbang per gambar (`periksa()`, PEDOMAN §D)

Diukur dari SVG, bukan dari angka yang dilaporkan generator: D-1, D-2, D-3, D-23 dari isi `<text>`; D-4 dari atribut, `style`,
dan CSS; D-9 daftar putih hex; D-5 dari `font-size` tiap `<text>`; D-8 irisan teks lawan teks dihitung ulang dari koordinat
dan metrik Roboto, kotak simbol/inset/skala dihitung ulang dari manifest, peta wajib unsur peta, catatan batas tertulis di
SVG, inset untuk peta pulau, skala tidak menimpa daratan; D-21 penanda di `<g class="legenda">` dibandingkan dengan hex peran
data (seri, skala, simbol, pita, tercatat); D-24 hex di SVG harus tercatat perannya, satu hex satu peran bermakna per gambar;
D-28 pasangan pesan dan jenis, G2 butuh > 24 periode, besaran peta; D-31 keterangan bertahun; D-32 catatan; P10 rentang
skenario tidak berbatas atas di bawah angka tercatat; B1.1 kontras; B5.10 nilai segmen tertulis.

Fixture negatif (`uji.mjs`) berupa SVG keluaran atau spek contoh yang dimutasi lalu dibangun ulang. Enam di antaranya ditulis
ke `qa/fixtures/visual/` oleh `qa/uji.py` dan menjadi fixture resmi D-8, D-21, D-24, D-28 di `qa/cakupan.json`.

## Belum

- Nama laut dan pulau terluar Peta NKRI BIG di peta nasional (`qa/cakupan.json` antre "D-8 label laut").
- D-24 lintas gambar di satu halaman (butuh manifest halaman dari pembangun DOCX).
- Tabel peta panas native di DOCX dari `manifest.sel` (pembangun DOCX).
- Skenario karhutla tidak di grafik rentang: paket skenario hidromet kini tidak memuat rentang korban model karhutla.
