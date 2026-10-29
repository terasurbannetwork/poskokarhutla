# VALIDASI neraca air Jawa (NA-06)

> LABEL tetap **estimasi-model**: validasi di bawah bukan pengganti data pos duga (keputusan pemilik 8: tanpa data BBWS). Dihasilkan `scripts/air/neraca/validasi.py`; angka dari `mentah/validasi_hitung.json`.

Pembanding: BPS 2020 (limpasan total 175.558 juta m3/th; sendiri sebuah perkiraan), GloFAS v4 (Open-Meteo flood API, 0,05 derajat, 1991-2024, sudah dalam m3/s; model global, bukan pengukuran), ERA5/ERA5-Land (Open-Meteo, 18 sel DIY).


## Sebelum kalibrasi: alpha = 0.5, k = 2.0 bulan

| Pemeriksaan | Nilai | Ambang | Vonis |
| --- | --- | --- | --- |
| Limpasan total Jawa vs BPS 2020 (rerata 1991-2025, diskala ke 132.698 km2) | 185.803 vs 175.558 Mm3/th (+5.8%) | |bias| <= 15% | LOLOS |
| Muara: median rasio model/GloFAS, rerata tahunan | 1.00 | 0,80-1,25 | LOLOS |
| Muara: sungai dengan rasio di luar 0,5-2 | 0 dari 12 | 0 | LOLOS |
| Muara: median rasio Jun-Okt | 1.42 | 0,80-1,25 | TIDAK LOLOS |
| Muara: sungai dengan rasio Jun-Okt di luar 0,5-2 | 1 dari 12 (rentang 0.64-2.28) | 0 | TIDAK LOLOS |
| Muara: median korelasi bulanan | 0.85 | >= 0,80 | LOLOS |

| Muara | Sel GloFAS | Model (m3/s) | GloFAS (m3/s) | Rasio | Model Jun-Okt | GloFAS Jun-Okt | Rasio Jun-Okt | r bulanan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bengawan Solo | -7.02, 112.43 | 450,6 | 503,7 | 0.89 | 101,6 | 86,3 | 1.18 | 0.86 |
| Brantas (Porong) | -7.57, 112.83 | 300,4 | 440,9 | 0.68 | 51,5 | 80,2 | 0.64 | 0.86 |
| Citarum | -6.12, 107.18 | 303,8 | 326,9 | 0.93 | 236,6 | 178,4 | 1.33 | 0.62 |
| Citanduy | -7.67, 108.78 | 234,6 | 225,1 | 1.04 | 108,9 | 61,3 | 1.78 | 0.82 |
| Serayu | -7.67, 109.08 | 268,1 | 249,3 | 1.08 | 109,3 | 84,9 | 1.29 | 0.89 |
| Cimanuk | -6.47, 108.28 | 182,2 | 186,4 | 0.98 | 54,3 | 35,8 | 1.52 | 0.84 |
| Jratunseluna (Serang-Lusi-Juwana) | -6.77, 110.58 | 102,0 | 99,1 | 1.03 | 38,9 | 17,0 | 2.28 | 0.83 |
| Progo | -7.92, 110.18 | 103,6 | 133,8 | 0.77 | 27,0 | 37,4 | 0.72 | 0.89 |
| Ciujung | -6.02, 106.28 | 108,7 | 113,7 | 0.96 | 65,1 | 41,7 | 1.56 | 0.64 |
| Cisadane | -6.07, 106.58 | 94,8 | 72,7 | 1.30 | 55,3 | 30,2 | 1.83 | 0.73 |
| Pemali | -6.82, 109.03 | 87,7 | 76,2 | 1.15 | 29,4 | 19,2 | 1.53 | 0.86 |
| Opak-Oyo | -8.02, 110.28 | 46,6 | 45,2 | 1.03 | 9,3 | 9,5 | 0.98 | 0.87 |

## Sesudah kalibrasi (parameter dipakai v1): alpha = 0.6, k = 2.0 bulan

| Pemeriksaan | Nilai | Ambang | Vonis |
| --- | --- | --- | --- |
| Limpasan total Jawa vs BPS 2020 (rerata 1991-2025, diskala ke 132.698 km2) | 185.868 vs 175.558 Mm3/th (+5.9%) | |bias| <= 15% | LOLOS |
| Muara: median rasio model/GloFAS, rerata tahunan | 1.01 | 0,80-1,25 | LOLOS |
| Muara: sungai dengan rasio di luar 0,5-2 | 0 dari 12 | 0 | LOLOS |
| Muara: median rasio Jun-Okt | 1.34 | 0,80-1,25 | TIDAK LOLOS |
| Muara: sungai dengan rasio Jun-Okt di luar 0,5-2 | 1 dari 12 (rentang 0.55-2.19) | 0 | TIDAK LOLOS |
| Muara: median korelasi bulanan | 0.85 | >= 0,80 | LOLOS |

| Muara | Sel GloFAS | Model (m3/s) | GloFAS (m3/s) | Rasio | Model Jun-Okt | GloFAS Jun-Okt | Rasio Jun-Okt | r bulanan |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Bengawan Solo | -7.02, 112.43 | 454,3 | 503,7 | 0.90 | 89,5 | 86,3 | 1.04 | 0.87 |
| Brantas (Porong) | -7.57, 112.83 | 303,6 | 440,9 | 0.69 | 43,8 | 80,2 | 0.55 | 0.86 |
| Citarum | -6.12, 107.18 | 304,5 | 326,9 | 0.93 | 234,7 | 178,4 | 1.32 | 0.61 |
| Citanduy | -7.67, 108.78 | 234,8 | 225,1 | 1.04 | 104,5 | 61,3 | 1.70 | 0.82 |
| Serayu | -7.67, 109.08 | 268,3 | 249,3 | 1.08 | 104,5 | 84,9 | 1.23 | 0.88 |
| Cimanuk | -6.47, 108.28 | 182,6 | 186,4 | 0.98 | 48,7 | 35,8 | 1.36 | 0.84 |
| Jratunseluna (Serang-Lusi-Juwana) | -6.77, 110.58 | 102,6 | 99,1 | 1.04 | 37,3 | 17,0 | 2.19 | 0.83 |
| Progo | -7.92, 110.18 | 104,1 | 133,8 | 0.78 | 24,6 | 37,4 | 0.66 | 0.89 |
| Ciujung | -6.02, 106.28 | 108,8 | 113,7 | 0.96 | 63,7 | 41,7 | 1.53 | 0.63 |
| Cisadane | -6.07, 106.58 | 95,0 | 72,7 | 1.31 | 54,1 | 30,2 | 1.79 | 0.72 |
| Pemali | -6.82, 109.03 | 88,0 | 76,2 | 1.15 | 27,5 | 19,2 | 1.43 | 0.86 |
| Opak-Oyo | -8.02, 110.28 | 47,1 | 45,2 | 1.04 | 8,2 | 9,5 | 0.86 | 0.87 |

## Kemarau ekstrem: Jun-Okt tahun skenario, model vs GloFAS (m3/s, sesudah kalibrasi)

| Sungai | 1997 model / GloFAS (rasio) | 2015 model / GloFAS (rasio) | 2019 model / GloFAS (rasio) | 2023 model / GloFAS (rasio) |
| --- | --- | --- | --- | --- | 
| Bengawan Solo | 0,0 / 11,8 (0.00) | 24,1 / 11,0 (2.18) | 18,3 / 10,2 (1.79) | 33,3 / 13,1 (2.54) |
| Brantas (Porong) | 0,0 / 12,3 (0.00) | 5,3 / 13,9 (0.38) | 1,4 / 11,5 (0.13) | 6,8 / 16,6 (0.41) |
| Citarum | 135,3 / 104,3 (1.30) | 225,2 / 110,5 (2.04) | 192,1 / 113,5 (1.69) | 231,0 / 128,8 (1.79) |
| Citanduy | 3,7 / 9,0 (0.41) | 10,5 / 9,9 (1.06) | 6,3 / 3,9 (1.62) | 24,4 / 28,6 (0.85) |
| Serayu | 4,0 / 16,9 (0.24) | 12,9 / 14,2 (0.90) | 8,2 / 6,8 (1.19) | 24,1 / 30,8 (0.78) |
| Cimanuk | 2,9 / 4,0 (0.73) | 5,3 / 2,8 (1.92) | 5,2 / 1,1 (4.60) | 13,0 / 6,0 (2.15) |
| Jratunseluna (Serang-Lusi-Juwana) | 0,0 / 3,3 (0.00) | 22,5 / 2,9 (7.86) | 22,7 / 2,7 (8.49) | 23,8 / 3,2 (7.50) |
| Progo | 0,0 / 7,5 (0.00) | 1,5 / 7,0 (0.21) | 1,0 / 3,9 (0.25) | 2,7 / 9,6 (0.28) |
| Ciujung | 5,2 / 2,6 (1.95) | 2,2 / 5,5 (0.40) | 1,7 / 2,7 (0.63) | 23,6 / 9,3 (2.54) |
| Cisadane | 5,0 / 5,8 (0.87) | 2,3 / 6,3 (0.37) | 2,4 / 4,3 (0.57) | 17,9 / 8,1 (2.20) |
| Pemali | 0,8 / 3,0 (0.25) | 1,7 / 3,1 (0.53) | 0,9 / 1,1 (0.83) | 5,4 / 3,9 (1.37) |
| Opak-Oyo | 0,0 / 2,0 (0.00) | 0,9 / 2,0 (0.45) | 0,6 / 1,6 (0.36) | 1,1 / 2,7 (0.40) |

Median rasio model/GloFAS Jun-Okt: 1997 0.25, 2015 0.72, 2019 1.01, 2023 1.58. Jumlah sungai dengan aliran model ~0 (<0,05 m3/s): 1997 5 dari 12, 2015 0 dari 12, 2019 0 dari 12, 2023 0 dari 12. Jratunseluna: model 1997 0.0x, 2015 7.9x, 2019 8.5x, 2023 7.5x GloFAS. Arah bias bergantung tahun: tahun yang model-nya memadamkan aliran (1997) MELEBIH-LEBIHKAN kekurangan; tahun yang model-nya mengalirkan lebih dari GloFAS (2015/2019/2023 di Jratunseluna dan Citarum) MEREMEHKANNYA. Skenario tahun kering tidak boleh dibaca sebagai batas atas maupun bawah.


## Neraca total Jawa (sesudah kalibrasi, diskala ke 132.698 km2)

P 341.421, ETa 155.264, R 185.868 Mm3/th; R tahun 2020 saja 205.314 Mm3 (BPS 2020: 175.558, selisih +16.9%).


## Hujan dan ET0 di 18 sel DIY: CHIRPS/POWER (dipakai) vs ERA5 Open-Meteo

| Besaran | Dipakai | ERA5 | Bias | r klimatologi bulan | r deret bulanan |
| --- | --- | --- | --- | --- | --- |
| Hujan (mm/th) | 2.271 | 2.357 | -3.6% | 0.96 | 0.87 |
| ET0 (mm/th) | 1.441 | 1.323 | +8.9% | 0.92 | 0.84 |

Vonis hujan (bias < 20%, r klimatologi >= 0,9): LOLOS. ET0 informasional: POWER 0,5 derajat dengan rerata bulanan lebih kasar daripada ERA5-Land 0,1 derajat.


## Kalibrasi minimal alpha, k (TAW 130 mm dan Kc 1,0 tetap)

Sel = median rasio model/GloFAS tahunan / median rasio Jun-Okt atas 12 muara (target 0,80-1,25 keduanya); skor = jumlah kuadrat ln(rasio) semua sungai (kecil = baik; peka terhadap sungai pencilan). Hanya dua parameter, 12 sungai: risiko menyesuaikan berlebih, dan GloFAS sendiri bukan kebenaran.

| alpha \ k | 0.5 | 1.0 | 2.0 | 3.0 |
| --- | --- | --- | --- | --- | 
| 0.4 | 1.03 / 1.15 (skor 3.2) | 1.02 / 1.19 (skor 2.7) | 1.00 / 1.47 (skor 3.0) | 0.99 / 1.78 (skor 4.8) |
| 0.5 | 1.03 / 1.15 (skor 3.2) | 1.02 / 1.17 (skor 2.8) | 1.00 / 1.42 (skor 2.7) | 0.99 / 1.61 (skor 3.8) |
| 0.6 | 1.03 / 1.15 (skor 3.2) | 1.02 / 1.16 (skor 2.9) | 1.01 / 1.34 (skor 2.7) | 1.00 / 1.50 (skor 3.1) |
| 0.7 | 1.03 / 1.15 (skor 3.2) | 1.03 / 1.16 (skor 3.0) | 1.01 / 1.26 (skor 2.7) | 1.00 / 1.37 (skor 2.8) |
| 0.8 | 1.03 / 1.16 (skor 3.3) | 1.03 / 1.16 (skor 3.1) | 1.02 / 1.21 (skor 2.9) | 1.01 / 1.25 (skor 2.8) |
| 0.9 | 1.04 / 1.16 (skor 3.3) | 1.03 / 1.16 (skor 3.2) | 1.03 / 1.17 (skor 3.1) | 1.02 / 1.19 (skor 3.0) |

Dipilih: alpha = 0,6, k = 2,0 bulan (dari 0,5; k tetap).

| alpha / k | median tahunan | median Jun-Okt rerata | sungai Jun-Okt di luar 0,5-2 | median tahun kering 1997 / 2015 / 2019 / 2023 | sungai aliran ~0: 1997 / 2015 / 2019 / 2023 |
| --- | --- | --- | --- | --- | --- |
| 0.6,2.0 | 1.01 | 1.34 | 1 | 0.25 / 0.72 / 1.01 / 1.58 | 5 / 0 / 0 / 0 |
| 0.7,2.0 | 1.01 | 1.26 | 2 | 0.07 / 0.31 / 0.34 / 1.05 | 5 / 0 / 1 / 0 |
| 0.8,2.0 | 1.02 | 1.21 | 2 | 0.00 / 0.05 / 0.05 / 0.43 | 7 / 4 / 4 / 0 |
| 0.9,2.0 | 1.03 | 1.17 | 2 | 0.00 / 0.00 / 0.00 / 0.21 | 10 / 9 / 9 / 4 |

Alasan, dari tabel di atas: 0,8/2,0 dan 0,9/2,0 MEMENUHI kedua target median (tahunan 1,02; Jun-Okt rerata 1,21 dan 1,17), tetapi memadamkan aliran muara tahun kering: median rasio 1997 mendekati 0, sungai beraliran ~0 sebanyak 7 dan 10 dari 12 di 1997 dan 4 dan 9 di 2015/2019. Skenario tahun kering adalah produk utama buku, jadi 0,6/2,0 dipilih: rasio tahunan 1,01, tetapi median Jun-Okt rerata 1,34 (di luar 0,80-1,25) = **Jun-Okt tetap TIDAK LOLOS**. Ini pilihan demi perilaku tahun kering, bukan kecocokan terbaik pada median. Dua parameter tidak dapat memenuhi sasaran rerata dan tahun kering serentak.

Catatan metode: kalibrasi dan validasi memakai GloFAS yang SAMA di 12 muara yang sama (dalam-sampel; tidak ada sungai atau periode yang disisihkan), sehingga bukan uji independen. Rasio tahunan sudah 1,00 SEBELUM kalibrasi (alpha 0,5, k 2,0): kalibrasi hanya menyentuh aliran kemarau dan hanya menggeser median Jun-Okt dari 1,42 ke 1,34. TAW 80/200 mm tidak menggeser median Jun-Okt (1,45/1,40 pada alpha 0,5, k 2); Kc 1,0 tidak diubah.


## Keterbatasan yang jujur

- Bukan validasi lawan pengukuran: tanpa pos duga air BBWS atau neraca Pola PSDA (keputusan pemilik 8). GloFAS v4 adalah model hidrologi global 0,05 derajat; BPS 2020 juga angka model. Lolos di sini = konsisten dengan dua model lain, bukan terbukti benar.
- Sel GloFAS dipilih sebagai sel sungai (debit rerata terbesar dalam kisi sekitar muara perkiraan); satu sel meleset bisa mengubah rasio. Muara model = sub-DAS HydroBASINS level 09 yang bermuara di laut; luasnya (lihat topologi.json) tidak persis sama dengan DAS GloFAS.
- Air tanah tidak dimodelkan selain tampungan linear dasar (alpha, k); pengambilan air tanah, PDAM, dan impor air antar-DAS selain Tarum Barat tidak ada.
- Waduk disederhanakan: 6 waduk, pelepasan target = rerata aliran masuk jangka panjang, tampungan dari tabel sekunder kecuali Kedung Ombo; operasi nyata (PLTA, irigasi, banjir) tidak ditiru. Debit muara Citarum, Solo, Serayu dan Brantas paling terpengaruh.
- Hujan CHIRPS dan ET0 POWER: ET0 memakai rerata bulanan kisi 0,5 derajat (G=0), lebih kasar dari ERA5-Land; di DIY +8,9%. Efeknya pada limpasan belum dipisahkan.
- Kebutuhan: irigasi gaya KP-01 dengan asumsi efisiensi, pola tanam, dan intensitas (asumsi-kebijakan, RANCANGAN §1.4); industri hanya industri besar-sedang di 4 provinsi (DIY, Jatim null); ternak tanpa ayam ras dan kuda.
- Skala spasial: sub-DAS rerata 248 km2, kab kecil/kota (di hilir) membaca aliran masuk sungai, bukan pasokan nyata PDAM.
