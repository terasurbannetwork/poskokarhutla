# Potensi bencana: data dan rute

Halaman ini memuat sumber, pipeline, rute Worker, dan jadwal di balik halaman Potensi bencana hidrometeorologi. Paket rancangannya ada di `data/kajian-bnpb/potensi-hidromet/`.

## Kelas desa BNPB dan kelas kab

`scripts/siklus/kelas_desa_bnpb.py:1` menarik berkas publik dashboard hidromet InaRISK BNPB (`kelas_desa_bnpb.py:17`), enam bahaya urutan BNJ, BDG, LSR, GEL, KHT, KEK (`kelas_desa_bnpb.py:19`). Kelas 0 atau kosong menjadi null, tidak pernah rendah. Kode kab 4 angka diambil dari awalan adm4 desa (`kelas_desa_bnpb.py:61`). Keluaran: `public/data/kelas_desa_bnpb.json` dan `public/data/kelas_desa/<kab4>.json` (`kelas_desa_bnpb.py:14`). Pemeriksaan bentuk menolak berkas dengan desa kurang dari batas (`kelas_desa_bnpb.py:21`).

Aturan kelas kab dari jumlah desa [n0 tanpa kelas, n1, n2, n3], N = n0+n1+n2+n3 (`kelas_desa_bnpb.py:24`, ALGORITMA 5):

| Syarat | Kelas kab |
| --- | --- |
| N = 0 atau n1+n2+n3 = 0 | null (belum terukur) |
| n3/N paling sedikit 0,40 | tinggi |
| n3/N paling sedikit 0,10, atau n3 paling sedikit 10, atau (n2+n3)/N paling sedikit 0,60 | sedang |
| selain itu | rendah |

Ambang tinggi 0,40 dikunci pemilik pada 26 November 2026 (K6): syarat "30 desa dan 10 persen" dari sumber dibuang karena memihak kab berdesa banyak (`kelas_desa_bnpb.py:30`). Penyebut N memasukkan desa tanpa kelas, jadi porsi tinggi tertekan di kab yang banyak desa tanpa kelas; ini bias yang diketahui. Kelas proyeksi dihitung terpisah dan tidak dipakai status. Tahun dan skenario proyeksi tidak tercantum di sumber.

## Status dan BDG

Kriteria status ditambah BDG di `scripts/prediksi/status_prakiraan_kriteria.json:4`. Kelas kab BDG dari kelas bandang (`status_prakiraan_kriteria.json:5`), E sama dengan BNJ hari yang sama (`status_prakiraan_kriteria.json:7`). Amandemen 3 (26 November 2026) menggeser K banjir dan longsor ke kelas desa BNPB, menambah `e` per hari, dan mencatat `versi_kriteria` di arsip harian (`status_prakiraan_kriteria.json:8`). Sidik aktif `.sidik` ditulis ulang untuk amandemen 3, dan isi aktif sebelumnya diarsipkan sebagai `.sidik.v3` (konvensi `.vN` = isi aktif sebelum amandemen ke-N). Uji balik memisahkan label banjir bandang dari BNJ, dan BNJ memakai label lamanya. Status BDG berpil hipotesis (`scripts/prediksi/status_prakiraan.py:374`). Tabel status induk ada di halaman Metode status prakiraan dan dampak.

## Analisis wilayah

`scripts/prediksi/analisis_wilayah.py:120` merakit `analisis.json` tiap jam:

| Blok | Isi | Rujukan |
| --- | --- | --- |
| matriks | kab tinggi, desa tinggi, jumlah kab per tingkat per bahaya | `analisis_wilayah.py:32` |
| hujan | 10 kab, mm terbesar per kab | `analisis_wilayah.py:56` |
| gelombang | 8 kab pesisir, tinggi gelombang | `analisis_wilayah.py:74` |
| hth | 8 kab, null bila lebih dari 3 hari basi | `analisis_wilayah.py:87` |
| debit | 8 kab, rasio terhadap Q2 bila ada, selain itu puncak | `analisis_wilayah.py:100` |
| desa_tinggi | 50 desa dengan kelas 3 terbanyak | `analisis_wilayah.py:120` |

Batas basi hari tanpa hujan 3 hari (`analisis_wilayah.py:14`). Sumber hilang membuat blok null, bukan daftar kosong.

## Debit dan iklim

### Debit GloFAS

`python3 -I scripts/banjir/debit_glofas.py terbit` menulis `public/banjir/data/debit_kab.json` (`debit_glofas.py:276`): puncak ansambel hari 0 sampai 2 (horizon ramalan 3 hari), hari puncak, dan rasio terhadap Q2 (`debit_glofas.py:253`). Q2 titik kab belum ada di repo, jadi `q2_m3s` dan `rasio_q2` null (`debit_glofas.py:282`). Berkas bertanda `hipotesis: true`. Debit tidak menaikkan status (Q6, bawaan sementara: tidak).

### ONI dan IOD

`scripts/data/iklim.py` menulis `oni_status` (`iklim.py:133`) dan `iod` (`iklim.py:121`). IOD memakai DMI NOAA rerata 8 minggu bila tidak macet, selain itu BoM. Basi bila ONI lebih dari 45 hari atau IOD lebih dari 21 hari (`iklim.py:117`). Kolom lama `oni` (deret) tidak berubah. Bobot musim `bobot_el_nino` tetap memakai DMI (`iklim.py:174`).

## Rute Worker

`src/potensi.js` mendaftarkan tiga rute (`src/potensi.js:93`) tanpa tabel D1:

| Rute | Hak | Isi |
| --- | --- | --- |
| `GET /api/potensi/analisis` | publik | `analisis.json` dari R2, hanya kolom di daftar izin (`potensi.js:13`), cache tepi 300 detik |
| `GET /api/potensi/rekomendasi` | staf pusdalops, koordalops, pimpinan, dan admin (`stafOK` meloloskan admin, `staf.js:91`) | butir rekomendasi per bahaya dan status, tanpa simpan (`potensi.js:24`) |
| `GET /api/bmkg/desa` | publik | prakiraan BMKG per desa, kab 4 angka, halaman 50 desa (`potensi.js:76`) |

Rute BMKG meringkas respons per hari: hujan dijumlah, suhu, angin maksimum, kode cuaca terbanyak (`potensi.js:45`); cache 3 jam per desa dan antrean permintaan ke BMKG di memori Worker (`potensi.js:33`, `potensi.js:62`). Desa yang belum tercache saat antrean penuh dihitung di `antre` (`potensi.js:90`). Galat BMKG dijawab tanpa isi mentah. Keputusan awal rancangan (D10): bila Worker ditolak BMKG, runner mengambil desa kab Waspada ke atas ke R2. Itu belum dibangun; belum diputuskan (bawaan sementara: rute Worker, runner bila 403).

## Katalog rekomendasi

`src/rekomendasi_katalog.js:36` menyimpan butir empat pihak (pusat, provinsi, kab/kota, masyarakat) kali tiga fase (respons, siaga, mitigasi). Butir pusat, provinsi, dan kab hanya yang bisa dirujuk ke teks Perban BNPB di repo (`rekomendasi_katalog.js:13`). Kolom masyarakat memakai butir `public/ews_tindakan.js` yang sudah bersumber (`rekomendasi_katalog.js:59`). Semua butir generik dan bukan instruksi resmi. Tab Rekomendasi di layar masih kerangka (`public/potensi/rekomendasi.js:1`).

### Kode bahaya

BNJ banjir, BDG banjir bandang, LSR longsor, GEL gelombang, KHT karhutla, KEK kekeringan, CEX cuaca ekstrem (`src/rekomendasi_katalog.js:8`). CEX tidak punya kelas desa; kelasnya tetap dari induk.

## Jadwal

| Pekerjaan | Jadwal | Rujukan |
| --- | --- | --- |
| Analisis wilayah | tiap jam | `.github/workflows/dampak_peringatan.yml:11`, langkah di `:79` |
| Kelas desa BNPB | bulanan tanggal 1 | `dampak_peringatan.yml:12`, langkah di `:112` |
| Debit GloFAS per kab | harian | `.github/workflows/banjir.yml:7`, langkah di `:423` |
| Hari tanpa hujan | harian, rantai status | `.github/workflows/lintas.yml:11`, di-commit di `:284` |

## Pertanyaan terbuka

Q-nomor merujuk `data/kajian-bnpb/potensi-hidromet/KEPUTUSAN-POTENSI.md`.

| No | Soal | Status |
| --- | --- | --- |
| Q1 | Sumber berkas kelas desa BNPB | belum diputuskan (bawaan sementara: dipakai dengan atribusi, diganti bila ada jalur resmi) |
| Q2 | Jalur prakiraan BMKG per desa | belum diputuskan (bawaan sementara: rute Worker, runner bila 403) |
| Q3 | Sumber butir rekomendasi | belum diputuskan (bawaan sementara: butir dengan rujukan peraturan, butir pustaka berlabel generik) |
| Q4 | Peluang hujan bulanan BMKG per kab | belum diputuskan (bawaan sementara: tidak) |
| Q5 | ONI dan IOD di tab Iklim | belum diputuskan (bawaan sementara: tampil di tab Iklim saja) |
| Q6 | Debit menaikkan status banjir | belum diputuskan (bawaan sementara: tidak, sampai ada vonis uji) |
| Q7 | Nama dan alamat halaman | belum diputuskan (bawaan sementara: `/potensi`) |
| Q8 | Kelas proyeksi ditampilkan | belum diputuskan (bawaan sementara: ya, kolom terpisah berlabel) |
| Q9 | Kelas bahaya desa tampil publik | belum diputuskan (bawaan sementara: ya, hanya kelas) |
| Q10 | Halaman terbuka tanpa masuk | belum diputuskan (bawaan sementara: tidak, terkunci) |
