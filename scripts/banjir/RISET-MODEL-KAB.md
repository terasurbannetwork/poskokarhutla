# Model peluang banjir kabupaten-hari vs aturan status.py

Tanggal protokol: 27 Oktober 2026. Skrip: `scripts/banjir/model_kab.py`. Keluaran kandidat: `data/raw/banjir/model_kab/`
(`kandidat.json`, `latih.json`; bukan `public/`). Status: **kandidat, uji 2024-2025 BELUM dibuka.**

## 1. Pertanyaan

Apakah GBDT pohon dangkal (resep karhutla, `scripts/sebaran/gbdt.py`, diimpor) atas hujan ERA5 + memori basah + riwayat
kabupaten mengalahkan aturan ambang `status.py` untuk kabupaten-hari, pada jumlah alarm yang SAMA? Aturan sekarang lemah
(`validasi.json`: Waspada POD 0,565 FAR 0,964 ETS 0,019; Siaga POD 0,132 FAR 0,939 ETS 0,031).

## 2. Data dan pembagian (sama dengan `uji_balik.py` / `ambang_wilayah.py`)

- Unit kabupaten-hari; level aturan kabupaten = level kecamatan tertinggi (sel hujan dengan level tertinggi).
- Label: ada baris DIBI `banjir` atau `bandang` dengan kejadian >= 1 di kabupaten itu tanggal itu (`dibi_tanggal.json`).
- Hujan: ERA5 Open-Meteo archive 0,25 derajat, prakiraan sempurna (batas atas; tidak berlaku langsung untuk IFS produksi).
- Sampel kabupaten: `ub.pilih()` dengan kejadian dipotong <= 2021 (sama `ambang_wilayah.muat()`), jadi tahun validasi/uji tidak ikut
  memilih kabupaten. Beda beberapa kabupaten dari 42 kab di `validasi.json` (yang dipilih memakai semua tahun). Aturan dan model
  dinilai pada sampel yang SAMA, jadi adu tetap adil, tetapi angka aturan di sini bukan angka `validasi.json`.
- latih 2016-2021, validasi 2022-2023, uji 2024-2025. Hari dinilai mulai indeks 30 (2016-01-21) karena A30 butuh 30 hari ke belakang.

## 3. Fitur (hanya yang diketahui saat meramal, jendela aturan = hari d-1..d+1)

Tiap fitur kabupaten = maksimum atas sel hujan kabupaten itu (sama cara aturan menurunkan level kabupaten).

| Kelompok | Fitur | Sumber |
| --- | --- | --- |
| hujan | `h1` hujan hari e | ERA5 `precipitation_sum` |
| hujan | `h3` hujan e-1..e+1 | ERA5, sama dengan H3 `status.py` (`GESER = -1`) |
| hujan | `imax` hujan per jam terbesar e-1..e+1 | ERA5 `precipitation` per jam |
| hujan | `pers_h3` peringkat persentil H3 terhadap H3 sel itu di hari latih | ERA5, batas dihitung dari 2016-2021 saja |
| anteseden | `a7`, `a30` hujan 7 dan 30 hari sebelum e | ERA5 |
| anteseden | `api85`, `api90`, `api95` indeks hujan anteseden API_k = k API + hujan, sampai hari e-1 | ERA5, k 0,85 / 0,90 / 0,95 |
| tanah | `sm` lengas tanah 7-28 cm | ERA5 `soil_moisture_7_to_28cm_mean` |
| musim | `bulan_sin`, `bulan_cos` | tanggal |
| statis | `frek_dibi` laju hari kejadian DIBI kabupaten | DIBI, EKSPANSIF: baris tahun latih y memakai hanya tahun latih < y (2016 = laju nasional sampel 2008-2015), dihaluskan 30 hari; validasi/uji memakai semua tahun latih. Nilai baris tahun y tidak bergantung pada label tahun y (asersi di `uji`) |
| statis | `bahaya_b` indeks bahaya banjir InaRISK (maksimum kecamatan sampel) | `public/banjir/data/bahaya.json` (`bahaya.py`, sama dengan `status.py`) |
| aturan | `level_aturan` 0..3 | `status.level_banjir` dengan konstanta berlaku (model = aturan + koreksi) |

Fitur tidak dipakai: arah/kecepatan angin dan CAPE (tidak ada di cache uji balik; menambahnya = unduhan baru), sungai GloFAS dan
ansambel (tidak ada historis).

## 4. Pembanding

(a) aturan `status.py` (biner Waspada/Siaga; sebagai probabilitas: laju empiris per level di latih); (b) klimatologi kabupaten-bulan
dari latih, dihaluskan ke laju kabupaten (bobot 30 hari); (c) regresi logistik (`gbdt.latih_lr`) pada fitur yang sama (log1p untuk hujan).

## 5. Penyetelan (hanya validasi)

Kisi kedalaman {2, 3, 4} x laju belajar {0,05; 0,1} x jumlah pohon {20..200 langkah 10}, kriteria logloss validasi (Platt dipasang
per kandidat). Lalu ablasi kelompok fitur satu putaran berurutan: kelompok dibuang bila logloss validasi tidak memburuk. Platt
dipasang di validasi (dua parameter). Model TIDAK dilatih ulang pada latih+validasi: kandidat yang dibekukan = yang dinilai di uji.

## 6. Metrik

AUC, Brier, Brier skill vs klimatologi, reliabilitas 10 bin; pada ambang yang membuat jumlah alarm model SAMA dengan alarm aturan
(>= Waspada dan >= Siaga, periode yang sama): POD, FAR, CSI, ETS, PSS. CI 95% bootstrap blok (kabupaten x tahun), 1.000 ulangan,
berpasangan model vs aturan (blok yang sama untuk keduanya), persentil 2,5 dan 97,5, biji 11. Ambang alarm tetap pada tiap ulangan
(ditetapkan pada seluruh periode).

## 7. Kriteria lulus (DIBEKUKAN, sidik `c890cedf7b4ca4dd`)

Dibekukan di kode (`KRITERIA`, `sidik_kriteria()`); `uji` menegaskan sidik di atas tercantum di berkas ini. `buka` menolak bila sidik
penuh berubah sejak `latih`: sidik penuh = kriteria + kandidat (pohon, Platt model/LR/klimatologi, pembanding, daftar sel) + isi
`model_kab.py`, `uji_balik.py`, `status.py`, `umum.py`, `scripts/sebaran/gbdt.py`, `bahaya.json`, `dibi_tanggal.json` + manifest cache
ERA5 (nama, ukuran, sha256 per sel). Kalibrasi setara: model, regresi logistik dan klimatologi sama-sama dikalibrasi Platt di validasi.
Lulus bila SEMUA:

1. batas bawah CI95 dETS (model - aturan) > 0 pada >= Waspada DAN >= Siaga;
2. batas bawah CI95 dETS (model - regresi logistik) > 0 pada Waspada DAN Siaga;
3. batas bawah CI95 dETS (model - klimatologi) > 0 pada Waspada DAN Siaga;
4. batas bawah CI95 Brier skill model vs klimatologi (terkalibrasi) > 0;
5. penjaga titik: AUC model >= AUC regresi logistik.

Seri skor pada ambang alarm dipecah acak berbiji tetap 11 (jumlah seri dilaporkan di keluaran). Lulus berarti kandidat boleh dipasang
SEBAGAI pelengkap berlabel (status resmi tidak ditimpa). Tidak lulus: aturan tetap. Uji dibuka SEKALI (`uji.json` = penanda); sesudah
`buka`, hasil + sidik ditambahkan otomatis ke §10 berkas ini (ikut git). Latih ulang = eksperimen baru dengan periode uji baru.

## 8. Hasil validasi 2022-2023

Dijalankan 29 Okt 2026 pada sampel penuh: 39 kab, 104 sel ERA5. Latih 84.708 baris (939 kejadian), validasi 28.470 baris (344
kejadian, laju 1,21%). Terpilih kedalaman 3, laju belajar 0,1, 70 pohon (logloss validasi 0,05811). Ablasi membuang kelompok
`anteseden`; kelompok akhir: aturan, hujan, musim, statis, tanah. Sidik `e20232cfb3fb0b1a`, sidik kriteria `c890cedf7b4ca4dd`.
Uji 2024-2025 BELUM dibuka.

| | AUC | Brier | BSS vs klim (CI95) |
| --- | --- | --- | --- |
| model GBDT | 0,7925 | 0,01170 | +0,0128 [+0,0074, +0,0175] |
| regresi logistik | 0,7876 | 0,01171 | +0,0117 [+0,0053, +0,0185] |
| klimatologi kab-bulan | 0,7100 | 0,01185 | |
| aturan status.py | 0,6308 | 0,01189 | -0,0037 [-0,0084, +0,0011] |

dETS pada jumlah alarm sama dengan aturan (CI95 bootstrap blok kab x tahun):

| | >= Waspada (7.965 alarm) | >= Siaga (1.012 alarm) |
| --- | --- | --- |
| model - aturan | +0,0085 [+0,0041, +0,0133] | +0,0329 [+0,0112, +0,0516] |
| model - regresi logistik | +0,0012 [-0,0011, +0,0036] | +0,0033 [-0,0063, +0,0149] |
| model - klimatologi | +0,0069 [+0,0033, +0,0103] | +0,0219 [+0,0069, +0,0347] |

Pada Waspada, POD naik dari 0,529 (aturan) ke 0,724 (model) dengan jumlah alarm sama; FAR 0,977 -> 0,969. Pada Siaga, POD naik
dari 0,099 ke 0,218.

Pratinjau kriteria §7 di validasi: butir 1, 3, 4, 5 terpenuhi; **butir 2 tidak** (CI dETS model - regresi logistik melewati nol di
kedua level). Artinya model jauh lebih baik dari aturan sekarang, tetapi keunggulannya atas regresi logistik biasa tidak terbukti.
Bila pola ini berulang di uji, vonis `buka` = TIDAK LULUS. Membuka uji tetap keputusan pemilik dan hanya sekali; kalau dibuka hanya
untuk memastikan kegagalan yang sudah terlihat, periode 2024-2025 terpakai tanpa hasil.

## 9. Ranjau

- `ambil_cuaca` mengambil 5 sel per panggilan dengan jeda 330 dtk; bobot ~79 per sel. 104 sel = ~8.216 bobot (harian 10.000).
- `gbdt.py` stdlib: sekitar satu detik per pohon pada 80 ribu baris, jadi `latih` memakan puluhan menit.
- Kuota nyata lebih boros dari taksiran 79/sel: 25 sel (5 panggilan x 5 sel) sudah menabrak batas jam, dan batas harian habis sebelum 30 sel
  (kuota dibagi proses lain di jaringan yang sama). Satu panggilan 5 sel x 10 tahun per jam bisa 15-55 menit (server lambat).
  Beberapa proses `ambil` paralel pada irisan sel berbeda mempercepat, tetapi menghabiskan kuota jam lebih cepat.
- Python 3.9 di mesin ini: tanpa `match` dan `X | Y`.
- Keterbatasan statistik (diakui, tidak mengubah kriteria): (a) bootstrap blok kab x tahun tidak menangkap korelasi ANTAR-kabupaten pada
  hari/minggu yang sama (hujan besar satu sistem cuaca), jadi CI cenderung terlalu sempit; sensitivitas blok pulau x minggu dilaporkan
  di keluaran (`d_ets_model_vs_aturan_pulau_minggu`) tetapi tidak menentukan vonis. (b) `pers_h3` memuat dirinya sendiri: batas persentil
  sel dihitung dari H3 hari latih, termasuk hari yang sedang dinilai pada baris latih (tidak pada validasi/uji). (c) `bahaya_b` InaRISK
  belum terbukti bebas dari DIBI (InaRISK disusun dari data kejadian historis); bila ya, model mewarisi sebagian label. (d) laju
  `frek_dibi` ekspansif tahun pertama latih memakai DIBI 2008-2015 yang lebih kurang lengkap dari tahun-tahun belakangan.

## 11. LAB tutupan lahan tahunan (29 Oktober 2026): TIDAK DIUSULKAN

Pertanyaan: apakah porsi dan perubahan tutupan lahan tahunan memperbaiki GBDT kabupaten-hari? Skrip lab terpisah `scripts/banjir/lab_tutupan.py`
(mengimpor `model_kab.py`/`uji_balik.py`, tidak mengubahnya; keluaran `data/raw/banjir/lab_tutupan/`). Uji 2024-2025 TIDAK dibuka.

- Sumber: Impact Observatory Annual LULC v02 (10 m, 2017-2023, CC BY 4.0) lewat STAC Microsoft Planetary Computer; COG dibaca terdesimasi
  100 x 100 contoh per sel hujan 0,25 derajat per tahun (98 sel x 7 tahun, ~1 menit dengan 6 utas). Awan (kelas 10) dan nodata keluar dari penyebut.
  Fitur kab = rata-rata atas sel hujan kab itu.
- Tanpa bocor waktu: kejadian tahun T memakai tutupan <= T-1. Batas data: IO 2017-2023, sehingga tahun latih 2016-2017 tidak punya fitur.
- Sampel: 37 kab yang seluruh sel ERA5-nya sudah di cache (MODEL_KAB_SEBAGIAN; 4 dari 102 sel sampel penuh belum ada, jadi `model_kab.py latih`
  penuh belum bisa jalan). Bukan sampel penuh 39 kab.
- Fitur: V1 = `lc_built`, `lc_trees`, `lc_fveg` (porsi T-1). V2 = V1 + `lc_d_built1`, `lc_d_trees1` (T-1 dikurangi T-2). Kehilangan trees di hulu/DAS
  TIDAK diuji (butuh poligon DAS per kab; hanya porsi tree di sel kab).
- Pembagian: latih 2018-2021 (V1) atau 2019-2021 (V2; delta butuh T-2 >= 2017), validasi 2022-2023. Hiperparameter TETAP dari `kandidat.json`
  sebagian (dalam 3, lr 0,05, 140 pohon), tidak disetel ulang; model dasar (15 fitur) dan model +tutupan dilatih pada barisan SAMA, rata-rata tiga
  biji (1, 2, 3), Platt di validasi seperti `latih`. Metrik tetap yang sudah ada: ETS pada jumlah alarm = aturan Waspada/Siaga, dETS berpasangan,
  CI95 bootstrap blok kab x tahun 1.000 ulangan biji 11, Brier skill.

Hasil validasi 2022-2023 (27.010 kab-hari, 308 kejadian, 37 kab):

| | AUC dasar -> baru | BSS baru vs dasar (CI95) | dETS Waspada (alarm 7.417) | dETS Siaga (alarm 945) |
| --- | --- | --- | --- | --- |
| V1 level, latih 602 kejadian | 0,7993 -> 0,8137 | +0,0003 [-0,0023, +0,0029] | +0,0008 [-0,0006, +0,0026] | -0,0036 [-0,0154, +0,0084] |
| V2 +delta, latih 475 kejadian | 0,7993 -> 0,8094 | +0,0002 [-0,0017, +0,0021] | +0,0008 [-0,0008, +0,0026] | -0,0018 [-0,0109, +0,0066] |

Semua CI melewati nol; dETS Siaga titik negatif; ETS Waspada 0,0187 -> 0,0195 (POD 0,724 -> 0,744). Kenaikan AUC kecil tidak menjadi perbaikan Brier atau ETS.
Per biji dETS Siaga berganti tanda (V1 -0,0064/-0,0009/-0,0036; V2 +0,0027/-0,0036/+0,0009). Kriteria (batas bawah CI95 dETS > 0 di kedua level) tidak
terpenuhi untuk keduanya. **Keputusan: fitur tutupan tidak diusulkan; tidak ada pasokan JSON tutupan.**

Catatan kejujuran: dua varian diuji (multiplisitas) dan keduanya gagal, jadi tidak ada koreksi yang perlu. Hasil negatif ini berlaku untuk 37 kab dan label DIBI
tingkat kab-hari yang berisik; tutupan IO berubah kecil dan berderau antar-tahun (klasifikasi ulang tiap tahun), sedangkan tutupan statis sebagian sudah
tertangkap `frek_dibi` dan `bahaya_b`. Hiperparameter diambil dari `kandidat.json` yang disetel pada validasi 2022-2023 yang sama
dengan fitur dasar (validasi dipakai ganda untuk Platt dan hiper); biasnya menguntungkan model dasar, jadi searah dengan hasil negatif, bukan
melemahkannya (catatan validasi-model 29 Okt 2026). Mengulang: `V=<venv numpy+rasterio>; $V scripts/banjir/lab_tutupan.py ambil; python3 scripts/banjir/lab_tutupan.py jalan`
(swauji: `python3 scripts/banjir/lab_tutupan.py uji`).

## 10. Hasil uji 2024-2025 (dibuka 2026-10-29, sidik `e20232cfb3fb0b1a`, sidik kriteria `c890cedf7b4ca4dd`)

VONIS: **TIDAK LULUS**. Rincian: `{"dETS_waspada_vs_aturan": false, "dETS_waspada_vs_lr": false, "dETS_waspada_vs_klimatologi": true, "dETS_siaga_vs_aturan": false, "dETS_siaga_vs_lr": false, "dETS_siaga_vs_klimatologi": true, "brier_skill_ci_bawah": true, "penjaga_auc_lr": false}`

```json
{
 "n": 28509,
 "kej": 388,
 "laju": 0.0136,
 "kab": 39,
 "probabilitas": {
  "model": {
   "auc": 0.7671674358635016,
   "brier": 0.013189318098963445,
   "logloss": 0.06539013932556799,
   "brier_skill_vs_klim": 0.011530623711635046,
   "bss_ci": [
    0.007212479195408794,
    0.015493787458293662
   ]
  },
  "lr": {
   "auc": 0.7696480635779769,
   "brier": 0.013187593671427399,
   "logloss": 0.06522299447809415,
   "brier_skill_vs_klim": 0.011659860401371347,
   "bss_ci": [
    0.007723599271825199,
    0.015285855428351036
   ]
  },
  "klimatologi": {
   "auc": 0.6767928872908202,
   "brier": 0.013343173208348318,
   "logloss": 0.069485320056496
  },
  "aturan": {
   "auc": 0.6666777258951284,
   "brier": 0.013312597369672226,
   "logloss": 0.0689259825243542,
   "brier_skill_vs_klim": 0.0022914967976321865,
   "bss_ci": [
    -0.002049669766937434,
    0.006800915735933111
   ]
  }
 },
 "waspada": {
  "alarm": 9258,
  "laju_alarm": 0.3247,
  "seri_di_ambang": {
   "model": 1,
   "lr": 1,
   "klimatologi": 57
  },
  "aturan": {
   "pod": 0.6237,
   "far": 0.9739,
   "csi": 0.0257,
   "pss": 0.3031,
   "ets": 0.0125,
   "ci": {
    "pod": [
     0.546,
     0.698
    ],
    "far": [
     0.968,
     0.979
    ],
    "csi": [
     0.02,
     0.032
    ],
    "pss": [
     0.237,
     0.375
    ],
    "ets": [
     0.009,
     0.016
    ]
   }
  },
  "model": {
   "pod": 0.7113,
   "far": 0.9702,
   "csi": 0.0295,
   "pss": 0.3919,
   "ets": 0.0162,
   "ci": {
    "pod": [
     0.593,
     0.808
    ],
    "far": [
     0.965,
     0.976
    ],
    "csi": [
     0.024,
     0.035
    ],
    "pss": [
     0.294,
     0.478
    ],
    "ets": [
     0.012,
     0.02
    ]
   }
  },
  "lr": {
   "pod": 0.6985,
   "far": 0.9707,
   "csi": 0.0289,
   "pss": 0.3789,
   "ets": 0.0157,
   "ci": {
    "pod": [
     0.59,
     0.793
    ],
    "far": [
     0.965,
     0.976
    ],
    "csi": [
     0.023,
     0.034
    ],
    "pss": [
     0.295,
     0.458
    ],
    "ets": [
     0.012,
     0.019
    ]
   }
  },
  "klimatologi": {
   "pod": 0.5387,
   "far": 0.9774,
   "csi": 0.0221,
   "pss": 0.2169,
   "ets": 0.0089,
   "ci": {
    "pod": [
     0.417,
     0.65
    ],
    "far": [
     0.973,
     0.982
    ],
    "csi": [
     0.018,
     0.026
    ],
    "pss": [
     0.128,
     0.31
    ],
    "ets": [
     0.006,
     0.013
    ]
   }
  },
  "d_ets_lr_vs_aturan": {
   "nilai": 0.0032,
   "ci": [
    0.0001,
    0.0062
   ]
  },
  "d_ets_klimatologi_vs_aturan": {
   "nilai": -0.0036,
   "ci": [
    -0.0081,
    0.0005
   ]
  },
  "d_ets_model_vs_aturan": {
   "nilai": 0.0037,
   "ci": [
    -0.0004,
    0.0078
   ]
  },
  "d_ets_model_vs_lr": {
   "nilai": 0.0005,
   "ci": [
    -0.0016,
    0.0028
   ]
  },
  "d_ets_model_vs_klimatologi": {
   "nilai": 0.0073,
   "ci": [
    0.0041,
    0.011
   ]
  },
  "d_ets_model_vs_aturan_pulau_minggu": {
   "nilai": 0.0037,
   "ci": [
    0.0014,
    0.0062
   ],
   "blok": 636
  }
 },
 "siaga": {
  "alarm": 1575,
  "laju_alarm": 0.0552,
  "seri_di_ambang": {
   "model": 1,
   "lr": 1,
   "klimatologi": 62
  },
  "aturan": {
   "pod": 0.1933,
   "far": 0.9524,
   "csi": 0.0397,
   "pss": 0.14,
   "ets": 0.0287,
   "ci": {
    "pod": [
     0.134,
     0.261
    ],
    "far": [
     0.938,
     0.966
    ],
    "csi": [
     0.028,
     0.052
    ],
    "pss": [
     0.085,
     0.203
    ],
    "ets": [
     0.018,
     0.04
    ]
   }
  },
  "model": {
   "pod": 0.2526,
   "far": 0.9378,
   "csi": 0.0525,
   "pss": 0.2001,
   "ets": 0.0415,
   "ci": {
    "pod": [
     0.158,
     0.358
    ],
    "far": [
     0.923,
     0.95
    ],
    "csi": [
     0.041,
     0.063
    ],
    "pss": [
     0.122,
     0.283
    ],
    "ets": [
     0.031,
     0.051
    ]
   }
  },
  "lr": {
   "pod": 0.25,
   "far": 0.9384,
   "csi": 0.052,
   "pss": 0.1974,
   "ets": 0.041,
   "ci": {
    "pod": [
     0.153,
     0.362
    ],
    "far": [
     0.927,
     0.95
    ],
    "csi": [
     0.04,
     0.061
    ],
    "pss": [
     0.119,
     0.286
    ],
    "ets": [
     0.031,
     0.049
    ]
   }
  },
  "klimatologi": {
   "pod": 0.183,
   "far": 0.9549,
   "csi": 0.0375,
   "pss": 0.1295,
   "ets": 0.0265,
   "ci": {
    "pod": [
     0.074,
     0.305
    ],
    "far": [
     0.944,
     0.97
    ],
    "csi": [
     0.023,
     0.047
    ],
    "pss": [
     0.047,
     0.219
    ],
    "ets": [
     0.013,
     0.035
    ]
   }
  },
  "d_ets_lr_vs_aturan": {
   "nilai": 0.0123,
   "ci": [
    -0.0006,
    0.0239
   ]
  },
  "d_ets_klimatologi_vs_aturan": {
   "nilai": -0.0022,
   "ci": [
    -0.0186,
    0.0114
   ]
  },
  "d_ets_model_vs_aturan": {
   "nilai": 0.0128,
   "ci": [
    -0.0007,
    0.0248
   ]
  },
  "d_ets_model_vs_lr": {
   "nilai": 0.0006,
   "ci": [
    -0.007,
    0.0086
   ]
  },
  "d_ets_model_vs_klimatologi": {
   "nilai": 0.015,
   "ci": [
    0.0063,
    0.0275
   ]
  },
  "d_ets_model_vs_aturan_pulau_minggu": {
   "nilai": 0.0128,
   "ci": [
    0.003,
    0.022
   ],
   "blok": 636
  }
 }
}
```
