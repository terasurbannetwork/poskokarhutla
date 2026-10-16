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
