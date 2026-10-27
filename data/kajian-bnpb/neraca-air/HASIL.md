# HASIL: Neraca air Jawa per kab/kota (v1, estimasi-model)

> LABEL: **estimasi-model**. Angka di sini keluaran model bak Thornthwaite-Mather + routing antar-kab (RANCANGAN.md), divalidasi di VALIDASI.md. Dihasilkan otomatis oleh `scripts/air/neraca/hasil.py` dari `public/data/neraca_air/`; jangan disunting tangan. Satuan juta m3 (Mm3) kecuali disebut. N = air tersedia (limpasan lokal + aliran masuk dari kab hulu) dikurangi kebutuhan konsumtif (irigasi dikurangi aliran balik 30%, domestik, ternak, industri); negatif = kekurangan. Kemarau = Juni-Oktober. Tanda: † = kab tanpa data industri (DIY, Jatim, Kep. Seribu; kebutuhan industrinya tidak dihitung); ‡ = kota/kab kecil (luas < rerata sub-DAS, air terutama kiriman hulu).

Iklim: CHIRPS v2.0 monthly 0,05 derajat (UCSB CHC) via IRI Data Library; rerata sel 0,05 di dalam sel 0,1; ET0: FAO-56 Penman-Monteith dari rerata bulanan NASA POWER (MERRA-2, kisi 0,5 derajat x 0,625; T2M, T2M_MAX, T2M_MIN, ALLSKY_SFC_SW_DWN, RH2M, WS2M), titik 0,5 derajat terdekat, G=0; elev = elevasi sel MERRA-2. Kebutuhan 2025, proyeksi 2030. Parameter bak: {'taw_mm': 130.0, 'kc': 1.0, 'alpha': 0.6, 'k_bulan': 2.0, 'label': 'asumsi-kebijakan, kalibrasi GloFAS di NA-06'}.


### Total Pulau Jawa (klimatologi 1991-2025, 119 kab/kota)

| Besaran | Nilai | Satuan |
| --- | --- | --- |
| Hujan P | 340.910 | Mm3/th |
| Evapotranspirasi aktual ETa | 155.032 | Mm3/th |
| Limpasan lokal R (air terbarukan) | 185.590 | Mm3/th |
| Kebutuhan kotor 2025 (domestik+irigasi+ternak+industri) | 44.494 | Mm3/th |
| - domestik | 5.931 | Mm3/th |
| - irigasi (gaya KP-01, kebutuhan potensial) | 37.669 | Mm3/th |
| - ternak (tanpa ayam ras dan kuda) | 146 | Mm3/th |
| - industri (hanya 75 dari 119 kab ber-data) | 748 | Mm3/th |
| Kebutuhan konsumtif 2025 | 33.193 | Mm3/th |
| Kebutuhan konsumtif 2030 (hanya pertumbuhan penduduk domestik) | 33.510 | Mm3/th (+1,0%) |
| Konsumtif / R, tahunan 2025 | 17,9 | % |
| R Jun-Okt (rerata 35 tahun) | 28.841 | Mm3 |
| Konsumtif Jun-Okt 2025 | 9.329 | Mm3 |
| Konsumtif / R, Jun-Okt 2025 | 32,3 | % |
| Konsumtif / R, Jun-Okt 2030 | 32,8 | % |


Irigasi gaya KP-01 (pola tanam, penyiapan lahan, hujan efektif, efisiensi 65%; asumsi-kebijakan) = 37.669 Mm3/th, sekitar 40% dari pembanding SNI 1 L/det/ha x luas irigasi permukaan (94.717 Mm3/th). Ini kebutuhan potensial, bukan air yang benar-benar dipasok.


### Efek skenario tahun (Jun-Okt, kebutuhan 2025)

| Skenario | P Jun-Okt (Mm3) | R Jun-Okt (Mm3) | Konsumtif Jun-Okt (Mm3) | Konsumtif/R (%) | Jumlah kab N<0 | Jumlah N negatif (Mm3) |
| --- | --- | --- | --- | --- | --- | --- |
| klimatologi | 64.051 | 28.841 | 9.329 | 32,3 | 16 | -195 |
| 1997 | 17.342 | 6.286 | 13.289 | 211,4 | 99 | -6.707 |
| 2015 | 16.898 | 9.070 | 13.031 | 143,7 | 63 | -2.553 |
| 2019 | 17.090 | 8.337 | 13.303 | 159,6 | 74 | -3.467 |
| 2023 | 29.933 | 11.949 | 11.401 | 95,4 | 47 | -1.488 |


Arah bias skenario tahun kering bergantung tahun (VALIDASI.md, bagian kemarau ekstrem): 1997 MELEBIH-LEBIHKAN kekurangan (model memadamkan aliran muara di sebagian sungai), sedangkan 2019 dan 2023 MEREMEHKANNYA di sejumlah muara (mis. Jratunseluna model 7.5-8.5x GloFAS). Skenario kering dibaca sebagai indikasi, bukan batas atas atau bawah.


### 15 kab/kota dengan N tahunan terendah (hanya 2 yang negatif; kekurangan nyata ada di ukuran Jun-Okt di bawah)

| Kab/kota | Prov | Penduduk 2025 (ribu) | Kunci (Mm3) | N tahunan | N Jun-Okt rerata | N Jun-Okt N80 | N Jun-Okt 1997 | N 2030 tahunan | Bulan defisit (N<0) | Status DDL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Kota Probolinggo † ‡ | Jatim | 260 | -12,2 | -12,2 | -9,8 | -11,3 | -12,2 | -12,3 | 10 | defisit |
| Kota Pasuruan † ‡ | Jatim | 194 | -5,6 | -5,6 | -6,6 | -7,8 | -8,7 | -5,7 | 9 | defisit |
| Administrasi Kepulauan Seribu † ‡ | DKI | 6 | 1,4 | 1,4 | 0,1 | -0,0 | -0,0 | 1,4 | 1 | defisit |
| Kota Administrasi Jakarta Pusat ‡ | DKI | 1.029 | 4,4 | 4,4 | -8,9 | -10,2 | -11,3 | 3,2 | 8 | defisit |
| Kota Administrasi Jakarta Barat ‡ | DKI | 2.470 | 9,5 | 9,5 | -24,3 | -28,3 | -30,3 | 6,8 | 8 | defisit |
| Kota Tegal ‡ | Jateng | 290 | 11,1 | 11,1 | -4,7 | -7,0 | -7,4 | 10,8 | 7 | defisit |
| Kota Yogyakarta † ‡ | DIY | 181 | 23,5 | 23,5 | -0,7 | -2,3 | -3,2 | 23,2 | 4 | defisit |
| Kota Cirebon ‡ | Jabar | 399 | 24,3 | 24,3 | -4,2 | -6,4 | -6,5 | 23,5 | 5 | defisit |
| Kota Magelang ‡ | Jateng | 97 | 25,1 | 25,1 | 1,2 | -1,3 | -1,9 | 25,0 | 2 | defisit |
| Kota Pekalongan ‡ | Jateng | 237 | 30,8 | 30,8 | -1,6 | -6,7 | -7,8 | 30,6 | 5 | defisit |
| Kota Administrasi Jakarta Utara ‡ | DKI | 2.037 | 34,5 | 34,5 | -21,6 | -25,4 | -27,2 | 32,1 | 6 | defisit |
| Kota Salatiga ‡ | Jateng | 190 | 68,3 | 68,3 | 3,4 | -4,6 | -6,8 | 68,2 | 2 | defisit |
| Kota Administrasi Jakarta Selatan ‡ | DKI | 2.322 | 82,6 | 82,6 | -7,4 | -18,8 | -21,1 | 80,1 | 4 | defisit |
| Kota Sukabumi ‡ | Jabar | 325 | 90,4 | 90,4 | 18,8 | -2,2 | -6,0 | 89,8 | 0 | defisit |
| Kota Surabaya † | Jatim | 2.829 | 110,5 | 110,5 | -35,8 | -43,2 | -45,5 | 109,2 | 6 | defisit |


### 15 kab/kota paling defisit Jun-Okt, diurut N80 = persentil ke-20 dari total Jun-Okt tiap tahun (35 nilai; kab dengan N80<0 kekurangan di 20% tahun atau lebih): 68 kab negatif

| Kab/kota | Prov | Penduduk 2025 (ribu) | Kunci (Mm3) | N tahunan | N Jun-Okt rerata | N Jun-Okt N80 | N Jun-Okt 1997 | N 2030 tahunan | Bulan defisit (N<0) | Status DDL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Indramayu | Jabar | 2.006 | -204,4 | 7.008,7 | 623,7 | -204,4 | -300,3 | 6.993,7 | 0 | defisit |
| Subang | Jabar | 1.767 | -175,5 | 3.093,8 | 210,6 | -175,5 | -240,4 | 3.087,2 | 0 | defisit |
| Jember † | Jatim | 2.554 | -172,6 | 3.318,8 | 108,8 | -172,6 | -246,7 | 3.314,9 | 3 | defisit |
| Cirebon | Jabar | 2.479 | -128,9 | 2.305,0 | 134,6 | -128,9 | -166,2 | 2.295,2 | 2 | defisit |
| Jombang † | Jatim | 1.320 | -117,8 | 10.197,8 | 516,5 | -117,8 | -190,3 | 10.187,8 | 0 | defisit |
| Banyuwangi † | Jatim | 1.711 | -114,9 | 2.019,8 | 85,4 | -114,9 | -173,5 | 2.017,4 | 2 | defisit |
| Pasuruan † | Jatim | 1.636 | -94,3 | 8.950,3 | 421,3 | -94,3 | -148,3 | 8.940,7 | 1 | defisit |
| Grobogan | Jateng | 1.441 | -89,5 | 4.709,0 | 379,6 | -89,5 | -155,0 | 4.704,4 | 0 | surplus |
| Kediri † | Jatim | 1.589 | -85,2 | 7.420,0 | 450,7 | -85,2 | -181,3 | 7.412,5 | 0 | defisit |
| Nganjuk † | Jatim | 1.102 | -84,3 | 6.083,5 | 309,6 | -84,3 | -153,6 | 6.077,5 | 1 | defisit |
| Pati | Jateng | 1.296 | -83,9 | 1.614,4 | 55,1 | -83,9 | -132,6 | 1.611,5 | 3 | defisit |
| Jepara | Jateng | 1.173 | -83,7 | 1.050,8 | -19,8 | -83,7 | -111,3 | 1.048,7 | 4 | defisit |
| Situbondo † | Jatim | 690 | -81,8 | 1.139,4 | -22,6 | -81,8 | -106,5 | 1.138,2 | 5 | defisit |
| Sleman † | DIY | 1.298 | -80,9 | 1.169,5 | 55,5 | -80,9 | -110,6 | 1.165,3 | 2 | defisit |
| Semarang | Jateng | 1.048 | -78,3 | 1.412,1 | 105,3 | -78,3 | -115,8 | 1.410,3 | 0 | defisit |


### 15 kab/kota paling defisit Jun-Okt skenario 1997 (kemarau El Nino terkuat; bias model 1997: melebih-lebihkan)

| Kab/kota | Prov | Penduduk 2025 (ribu) | Kunci (Mm3) | N tahunan | N Jun-Okt rerata | N Jun-Okt N80 | N Jun-Okt 1997 | N 2030 tahunan | Bulan defisit (N<0) | Status DDL |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Indramayu | Jabar | 2.006 | -300,3 | 7.008,7 | 623,7 | -204,4 | -300,3 | 6.993,7 | 0 | defisit |
| Jember † | Jatim | 2.554 | -246,7 | 3.318,8 | 108,8 | -172,6 | -246,7 | 3.314,9 | 3 | defisit |
| Subang | Jabar | 1.767 | -240,4 | 3.093,8 | 210,6 | -175,5 | -240,4 | 3.087,2 | 0 | defisit |
| Jombang † | Jatim | 1.320 | -190,3 | 10.197,8 | 516,5 | -117,8 | -190,3 | 10.187,8 | 0 | defisit |
| Demak | Jateng | 1.172 | -187,4 | 4.265,2 | 486,8 | 163,3 | -187,4 | 4.260,4 | 0 | defisit |
| Kediri † | Jatim | 1.589 | -181,3 | 7.420,0 | 450,7 | -85,2 | -181,3 | 7.412,5 | 0 | defisit |
| Lamongan † | Jatim | 1.339 | -173,8 | 22.647,3 | 1.734,2 | 252,6 | -173,8 | 22.626,6 | 0 | defisit |
| Banyuwangi † | Jatim | 1.711 | -173,5 | 2.019,8 | 85,4 | -114,9 | -173,5 | 2.017,4 | 2 | defisit |
| Cirebon | Jabar | 2.479 | -166,2 | 2.305,0 | 134,6 | -128,9 | -166,2 | 2.295,2 | 2 | defisit |
| Grobogan | Jateng | 1.441 | -155,0 | 4.709,0 | 379,6 | -89,5 | -155,0 | 4.704,4 | 0 | surplus |
| Nganjuk † | Jatim | 1.102 | -153,6 | 6.083,5 | 309,6 | -84,3 | -153,6 | 6.077,5 | 1 | defisit |
| Ngawi † | Jatim | 869 | -152,5 | 9.978,5 | 881,6 | 98,5 | -152,5 | 9.969,1 | 0 | surplus |
| Pasuruan † | Jatim | 1.636 | -148,3 | 8.950,3 | 421,3 | -94,3 | -148,3 | 8.940,7 | 1 | defisit |
| Klaten | Jateng | 1.241 | -134,9 | 2.776,9 | 394,8 | 106,3 | -134,9 | 2.772,8 | 1 | defisit |
| Pati | Jateng | 1.296 | -132,6 | 1.614,4 | 55,1 | -83,9 | -132,6 | 1.611,5 | 3 | defisit |


### 10 kab/kota dengan surplus LOKAL terbesar (R lokal dikurangi konsumtif, tahunan; air kiriman hulu tidak dihitung)

| Kab/kota | Prov | R lokal | Konsumtif | R - konsumtif | Aliran masuk dari hulu | Pecahan Qin di A | N tahunan (termasuk air lewat) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Sukabumi | Jabar | 8.621 | 399 | 8.222 | 3.258 | 27% | 11.480 |
| Cianjur | Jabar | 7.645 | 357 | 7.288 | 10.811 | 59% | 18.098 |
| Lebak | Banten | 7.560 | 364 | 7.196 | 1.078 | 12% | 8.274 |
| Bogor | Jabar | 7.175 | 506 | 6.669 | 2.932 | 29% | 9.601 |
| Garut | Jabar | 5.886 | 216 | 5.670 | 675 | 10% | 6.345 |
| Pandeglang | Banten | 5.616 | 372 | 5.244 | 1.197 | 18% | 6.441 |
| Tasikmalaya | Jabar | 5.652 | 450 | 5.201 | 831 | 13% | 6.033 |
| Cilacap | Jateng | 4.578 | 420 | 4.159 | 20.143 | 81% | 24.302 |
| Ciamis | Jabar | 3.255 | 207 | 3.048 | 7.870 | 71% | 10.919 |
| Malang † | Jatim | 3.628 | 587 | 3.040 | 1.261 | 26% | 4.301 |


N termasuk air kiriman hulu yang hanya lewat; N TIDAK aditif antar kab (hitung ganda). Peringkat surplus di atas memakai R lokal dikurangi konsumtif.


### Jumlah kab/kota dengan N < 0

| Ukuran | Jumlah dari 119 |
| --- | --- |
| tahunan 2025 | 2 |
| tahunan 2030 | 2 |
| Jun-Okt rerata 35 tahun 2025 | 16 |
| Jun-Okt N80 2025 (persentil ke-20 total tahunan) | 68 |
| Jun-Okt skenario 1997 | 99 |


DDL, metode gaya Permen LH 17/2009 (SA = limpasan lokal model tanpa aliran masuk, DA = penduduk x 1.600 m3/kapita/th); BUKAN status resmi: 83 dari 119 kab/kota berstatus defisit, berpenduduk 112,5 juta dari 158,7 juta (WorldPop 2026 diskala BPS). Dari 83 kab itu, 81 punya N tahunan POSITIF (air kiriman hulu menutup); SA bukan 10xCxRxA resmi.


### 10 kab/kota dengan penurunan N terbesar 2025 -> 2030 (tahunan; proyeksi 2030 HANYA pertumbuhan penduduk domestik, BPS proyeksi SP2010; irigasi, ternak, industri tetap 2025)

| Kab/kota | Prov | N 2025 | N 2030 | Selisih (Mm3/th) |
| --- | --- | --- | --- | --- |
| Bekasi | Jabar | 11.888,9 | 11.843,4 | -45,5 |
| Cianjur | Jabar | 18.098,3 | 18.054,6 | -43,7 |
| Bandung Barat | Jabar | 12.500,6 | 12.458,0 | -42,6 |
| Bogor | Jabar | 9.600,7 | 9.566,9 | -33,8 |
| Karawang | Jabar | 9.679,1 | 9.646,4 | -32,7 |
| Bojonegoro † | Jatim | 35.288,1 | 35.256,9 | -31,2 |
| Purwakarta | Jabar | 8.887,2 | 8.864,1 | -23,1 |
| Cilacap | Jateng | 24.301,5 | 24.280,6 | -20,9 |
| Lamongan † | Jatim | 22.647,3 | 22.626,6 | -20,7 |
| Tangerang | Banten | 1.808,9 | 1.788,8 | -20,1 |


### Per provinsi (klimatologi, kebutuhan 2025)

| Prov | Jumlah kab/kota | R lokal (Mm3/th) | Konsumtif (Mm3/th) | Konsumtif/R (%) | Kab N Jun-Okt rerata < 0 | Kab N80 Jun-Okt < 0 | Kab tanpa data industri |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Banten | 8 | 16.821 | 2.052 | 12,2 | 0 | 3 | 0 |
| DIY | 5 | 3.265 | 780 | 23,9 | 1 | 3 | 5 dari 5 (†) |
| DKI | 6 | 547 | 529 | 96,8 | 5 | 6 | 1 dari 6 (†) |
| Jabar | 27 | 65.718 | 9.166 | 13,9 | 1 | 10 | 0 |
| Jateng | 35 | 55.275 | 8.790 | 15,9 | 4 | 18 | 0 |
| Jatim | 38 | 43.964 | 11.876 | 27,0 | 5 | 28 | 38 dari 38 (†) |


## Bendera data yang wajib disebut penulis

- Validasi (VALIDASI.md): aliran tahunan 12 muara vs GloFAS: median rasio 1.01 (rentang 0.69-1.31); aliran Jun-Okt TIDAK LOLOS (median 1.34, rentang 0.55-2.19); tahun kemarau ekstrem median rasio model/GloFAS 1997 0.25, 2015 0.72, 2019 1.01, 2023 1.58. Kalibrasi dan validasi memakai GloFAS yang sama (dalam-sampel).

- Industri kosong (null) untuk 44 kab (DIY, Jatim, Kepulauan Seribu; tanda †): kebutuhan industri mereka tidak dihitung; angka mereka batas bawah kebutuhan.
- Industri hanya industri besar-sedang (tahun 2021-2022 menurut provinsi); mikro-kecil tidak termasuk. Koefisien 500 L/pekerja/hari sumber sekunder.
- Ternak: sapi, kerbau, kambing, domba, babi 2024 BPS/Kementan; unggas hanya ayam buras + itik (ayam ras tidak tersedia di tabel BPS kab), kuda tidak dihitung.
- Kab ditandai `hilir_waduk`: 35; kota/kab kecil (‡, luas < rerata sub-DAS, air terutama kiriman hulu): 32.
- Model tidak punya air tanah multi-tahun, PDAM, atau transfer selain Tarum Barat; waduk disederhanakan.


## Klaim aman / perlu catatan (untuk penulis buku dan deck)

**Aman dikutip (dengan label estimasi-model):**
- Limpasan total Jawa rerata sekitar 186 miliar m3/th, dekat dengan BPS 2020 (175,6 miliar; selisih 5,9% setelah diskala ke luas BPS, dan untuk tahun 2020 saja 16,9%); keduanya angka model, bukan pengukuran.
- Aliran tahunan sungai besar cocok dengan GloFAS di 12 muara: rasio 0.69-1.31 (median 1.01), tetapi kalibrasi dan validasi memakai GloFAS yang sama.
- Kebutuhan konsumtif tahunan sekitar 18% dari limpasan; di Jun-Okt rasio itu 32% (rerata 35 tahun); provinsi dengan kab N80<0 terbanyak: Jatim (28), Jateng (18), Jabar (10).
- Kab N tahunan negatif hanya 2 (kota-kota pantai kecil); kekurangan terutama persoalan musim kemarau.

**Perlu catatan wajib:**
- Konsumtif/R Jun-Okt 211% pada 1997 (kebutuhan potensial lawan limpasan model; bias 1997 melebih-lebihkan, jangan dikutip sebagai fakta).
- Angka Jun-Okt per kab = indikasi urutan, bukan nilai pasti: aliran Jun-Okt di muara tidak lolos validasi (median 1,34 dari GloFAS) dan bias skenario kering bergantung tahun.
- Jangan menyebut "68 kab defisit kemarau" tanpa menyebut definisinya (N80 = persentil ke-20 total Jun-Okt, kekurangan di 20% tahun atau lebih) dan bahwa kebutuhan irigasi adalah kebutuhan potensial.
- Jangan menjumlahkan N antar kab, jangan menyebut kab hilir DAS besar "surplus" dari N tahunan (air lewat); pakai R lokal - konsumtif.
- Proyeksi 2030 hanya pertumbuhan penduduk domestik (BPS proyeksi SP2010, bukan SUPAS 2025); jangan dibaca sebagai proyeksi iklim atau irigasi.
- DDL = metode gaya Permen LH 17/2009, bukan status resmi daerah.
- Kab † (DIY, Jatim, Kep. Seribu) tanpa industri; tabel provinsi untuk Jatim dan DIY meremehkan kebutuhan.
- Tidak ada validasi lawan pos duga; GloFAS dan BPS 2020 sama-sama model.
