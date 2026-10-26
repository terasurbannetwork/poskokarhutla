# Luas terbakar: model terintegrasi dan tabel kecocokan antartahun (LAB)

Status: **sebagian** · dibuat 2026-10-23T10:11:12+00:00 · kriteria_sha b02ac90606bc · bukan produksi.

**Tidak ada model terpilih** (kandidat: 16). Pemenang seleksi (TIDAK lolos K1-K3 di tahun uji akhir): M3 / seri N / gabungan.

Kriteria ada di scripts/data/lab_kriteria/lab_luas.json (dipra-tulis, sha di atas). Klaim akurasi HANYA terhadap acuan independen (Gaveau 2019, GFED5); SiPongi/GWIS dilaporkan tetapi bukan penilai (target latih / turunan titik). Metrik: median |ln(pred/acuan)|.

## Seleksi (LOYO tahun seleksi, terhadap target latih sendiri) dan tahun uji akhir

| Seri | Model | Latih | skor seleksi (M0_terskala - model, mata uang gabungan) | galat log med. uji akhir vs Gaveau | vs GFED5 | K1 K2 K3 |
|---|---|---|---|---|---|---|
| N | M0 | sipongi | None | 0.6073 | None | TIDAK TIDAK ya |
| N | M1 | sipongi | -0.0 | 0.9162 | None | TIDAK TIDAK ya |
| N | M2 | sipongi | -0.0227 | 0.7782 | None | TIDAK TIDAK ya |
| N | M3 | sipongi | 0.1416 | 0.8707 | None | TIDAK TIDAK ya |
| N | M4 | sipongi | -0.0236 | 1.066 | None | TIDAK TIDAK ya |
| N | M0 | gwis | None | 0.6073 | None | TIDAK TIDAK ya |
| N | M1 | gwis | 0.2634 | 1.5034 | None | TIDAK TIDAK ya |
| N | M2 | gwis | 0.0783 | 1.6135 | None | TIDAK TIDAK ya |
| N | M3 | gwis | 0.315 | 1.4311 | None | TIDAK TIDAK ya |
| N | M4 | gwis | -0.0499 | 1.7166 | None | TIDAK TIDAK ya |
| N | M0 | gabungan | None | 0.6073 | None | TIDAK TIDAK ya |
| N | M1 | gabungan | 0.1734 | 0.8157 | None | TIDAK TIDAK ya |
| N | M2 | gabungan | 0.0333 | 0.9729 | None | TIDAK TIDAK ya |
| N | M3 | gabungan | 0.4121 | 0.8199 | None | TIDAK TIDAK ya |
| N | M4 | gabungan | -0.114 | 1.5224 | None | TIDAK TIDAK ya |
| M | M0 | sipongi | None | 0.6993 | None | TIDAK TIDAK ya |
| M | M1 | sipongi | 0.0012 | 0.8721 | None | TIDAK TIDAK ya |
| M | M2 | sipongi | -0.1147 | 0.9543 | None | TIDAK TIDAK ya |
| M | M3 | sipongi | 0.0359 | 0.8623 | None | TIDAK TIDAK TIDAK |
| M | M4 | sipongi | -0.4248 | 2.2687 | None | TIDAK TIDAK ya |
| M | M0 | gwis | None | 0.6993 | None | TIDAK TIDAK ya |
| M | M1 | gwis | 0.0264 | 1.8897 | None | TIDAK TIDAK ya |
| M | M2 | gwis | -0.0002 | 1.2676 | None | TIDAK TIDAK ya |
| M | M3 | gwis | 0.1836 | 1.5784 | None | TIDAK TIDAK ya |
| M | M4 | gwis | -0.5054 | 2.4381 | None | TIDAK TIDAK ya |
| M | M0 | gabungan | None | 0.6993 | None | TIDAK TIDAK ya |
| M | M1 | gabungan | 0.0233 | 1.0933 | None | TIDAK TIDAK ya |
| M | M2 | gabungan | 0.0151 | 0.8493 | None | TIDAK TIDAK ya |
| M | M3 | gabungan | 0.3472 | 1.0467 | None | TIDAK TIDAK ya |
| M | M4 | gabungan | -0.5899 | 2.3943 | None | TIDAK TIDAK ya |

## Uji kekuatan tally

Tahun dapat dinilai: 1; deteksi galat x0,5/x2: {'0.5': 0.0, '2.0': 1.0}; lolos model: 0.0; lolos M0: 0.0; **tally tak berdaya**

## Tabel kecocokan nasional (ha)

| Tahun | Hot M | Hot N | Hot N20 | Hot N21 | Firespot | Cluster | Model P10 | P50 | P90 | SiPongi | GWIS | Gaveau | Nusantara | M/Sip | M/GWIS | status | label acuan | pita | cocok |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2001 | 13.631 | - | - | - | - | - | - | - | - | - | - | - | - | - | - | tanpa_model | tak_dapat_dinilai | - | - |
| 2002 | 120.607 | - | - | - | - | - | - | - | - | - | 2.707.104 | - | - | - | - | tanpa_model | tak_dapat_dinilai | - | - |
| 2003 | 60.410 | - | - | - | 8.097 | 32.689 | 225.128 | 1.662.142 | 12.104.295 | - | 748.556 | - | - | - | 2.22 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2004 | 103.202 | - | - | - | 13.174 | 50.691 | 781.872 | 4.811.464 | 34.190.612 | - | 2.453.316 | - | - | - | 1.961 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2005 | 64.176 | - | - | - | 7.954 | 31.834 | 185.579 | 1.379.442 | 9.925.363 | - | 769.594 | - | - | - | 1.792 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2006 | 147.296 | - | - | - | 17.785 | 64.533 | 656.821 | 4.386.436 | 28.793.431 | - | 3.082.799 | - | - | - | 1.423 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2007 | 41.752 | - | - | - | 5.875 | 25.256 | 107.754 | 799.181 | 5.977.932 | - | 340.706 | - | - | - | 2.346 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2008 | 39.808 | - | - | - | 5.538 | 23.631 | 96.868 | 717.673 | 5.353.866 | - | 226.207 | - | - | - | 3.173 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2009 | 99.528 | - | - | - | 12.235 | 46.762 | 502.781 | 3.582.678 | 25.735.159 | - | 1.823.481 | - | - | - | 1.965 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2010 | 19.529 | - | - | - | 2.348 | 12.535 | 37.639 | 327.310 | 2.607.439 | - | 114.993 | - | - | - | 2.846 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2011 | 61.370 | - | - | - | 7.776 | 33.232 | 263.248 | 1.945.027 | 13.748.562 | - | 819.073 | - | - | - | 2.375 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2012 | 69.476 | 307.237 | - | - | 11.512 | 130.904 | 213.206 | 2.659.047 | 25.235.392 | - | 905.150 | - | - | - | 2.938 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2013 | 52.423 | 248.178 | - | - | 8.246 | 94.755 | 111.012 | 1.401.468 | 12.741.272 | - | 586.813 | - | - | - | 2.388 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2014 | 107.831 | 535.657 | - | - | 18.022 | 166.955 | 213.626 | 2.608.364 | 25.026.228 | - | 2.127.395 | - | - | - | 1.226 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2015 | 161.514 | 856.031 | - | - | 27.569 | 227.169 | 397.512 | 5.059.589 | 47.640.455 | - | 2.581.610 | - | - | - | 1.96 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2016 | 22.437 | 106.696 | - | - | 3.459 | 52.984 | 48.734 | 505.328 | 5.041.575 | - | 239.814 | - | - | - | 2.107 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2017 | 16.311 | 82.001 | - | - | 2.757 | 50.449 | 23.959 | 268.810 | 2.623.197 | - | 162.111 | - | - | - | 1.658 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2018 | 35.246 | 179.670 | 169.463 | - | 6.586 | 85.142 | 120.684 | 1.460.070 | 13.661.899 | 529.267 | 717.282 | - | - | 2.759 | 2.036 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2019 | 86.334 | 421.516 | 418.669 | - | 12.326 | 122.502 | 391.120 | 4.960.432 | 46.702.384 | 1.649.258 | 2.086.311 | 3.130.463 | - | 3.008 | 2.378 | dapat_dinilai | gaveau | TIDAK | TIDAK |
| 2020 | 13.350 | 79.539 | 81.247 | - | 2.527 | 47.559 | 32.327 | 365.706 | 3.419.276 | 296.942 | 170.481 | - | - | 1.232 | 2.145 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2021 | 11.545 | 57.260 | 59.798 | - | 1.756 | 36.015 | 20.315 | 186.682 | 1.679.959 | 358.867 | 71.889 | - | - | 0.52 | 2.597 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2022 | 8.742 | 46.060 | 51.963 | - | 1.266 | 30.143 | 12.373 | 120.195 | 1.207.112 | 204.894 | 52.181 | - | - | 0.587 | 2.303 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2023 | 47.528 | 233.126 | 230.457 | 228.188 | 8.816 | 104.372 | 230.682 | 2.876.390 | 27.000.877 | 1.161.193 | 1.110.065 | - | - | 2.477 | 2.591 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2024 | 19.247 | 88.413 | 98.998 | 96.860 | 3.290 | 53.637 | 33.373 | 338.265 | 3.287.904 | 376.805 | 134.891 | - | - | 0.898 | 2.508 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2025 | 14.739 | 82.030 | 80.328 | 78.795 | 2.782 | 49.879 | 23.322 | 247.176 | 2.403.638 | 359.619 | 98.720 | - | - | 0.687 | 2.504 | tak_dapat_dinilai | tak_dapat_dinilai | - | - |
| 2026 | 129.414 | 583.569 | 595.751 | 594.012 | 18.091 | 150.587 | 371.894 | 4.693.166 | 44.138.541 | 202.011 | - | - | 1.916.588 | 23.232 | - | tak_dapat_dinilai | tak_dapat_dinilai | - | - |

Bendera: `pita` = SATU bukti (Gaveau independen; GFED5 semi-independen; pita heuristik, ditulis sebelum hasil); Nusantara hanya rujukan. model_lolos = False. Rasio luas/hotspot dan luas/firespot = konsistensi internal, BUKAN bukti. Lonjakan ENSO/IOD = penjelasan, BUKAN uji. `-` = tak dapat dinilai (bukan lolos).

## Tahun yang tidak cocok (nasional) dan dugaan sebab

- 2019: gagal dalam_pita. model di atas pita acuan (acuan kurang hitung?); lonjakan 3.4x dijelaskan IOD positif (DMI JAS 0.6), bukan ENSO

## Provinsi prioritas (P50 model / SiPongi / GWIS, ha), tahun kunci

| Provinsi | 2015 | 2019 | 2023 | 2024 | 2025 |
|---|---|---|---|---|---|
| Kalimantan Tengah | 840.747 / - / 440.243 | 737.138 / 317.749 / 534.715 | 577.300 / 165.896 / 274.055 | 11.692 / 11.460 / 4.079 | 7.606 / 4.804 / 1.245 |
| Sumatera Selatan | 937.778 / - / 416.073 | 937.778 / 336.798 / 405.640 | 616.018 / 132.083 / 227.302 | 22.392 / 15.422 / 7.620 | 4.435 / 5.940 / 1.503 |
| Kalimantan Barat | 301.942 / - / 59.546 | 645.381 / 151.919 / 184.714 | 52.211 / 111.848 / 60.019 | 29.195 / 24.155 / 8.994 | 35.273 / 26.703 / 14.296 |
| Papua (gabungan 91/93/94/95) | 548.243 / - / 551.007 | 376.954 / 108.110 / 185.830 | 543.760 / 154.798 / 230.071 | 47.267 / 28.292 / 20.843 | 1.376 / 9.222 / 1.996 |
| Kalimantan Timur (+Kaltara) | 121.482 / - / 244.539 | 110.500 / 77.083 / 112.653 | 56.564 / 40.291 / 30.245 | 26.570 / 25.000 / 18.203 | 3.399 / 12.314 / 1.910 |
| Kalimantan Selatan | 392.872 / - / 264.180 | 466.871 / 137.848 / 143.886 | 503.351 / 190.395 / 104.839 | 3.476 / 4.994 / 1.503 | 1.863 / 11.896 / 1.417 |
| Jambi | 502.840 / - / 25.459 | 343.849 / 56.593 / 76.054 | 1.638 / 6.540 / 3.885 | 2.620 / 5.637 / 3.349 | 2.420 / 3.566 / 987 |
| Nusa Tenggara Timur | 90.860 / - / 31.512 | 99.097 / 136.920 / 45.744 | 90.860 / 102.537 / 26.403 | 90.150 / 113.090 / 21.852 | 59.746 / 118.409 / 21.230 |
| Riau | 432.927 / - / 55.403 | 623.529 / 90.550 / 97.026 | 16.818 / 7.267 / 13.609 | 13.724 / 11.028 / 8.951 | 55.558 / 21.844 / 18.482 |

## Belum dikerjakan

- validasi sel Gaveau 2019 dilewati (anggaran habis): N/M4, M/M0, M/M1, M/M2, M/M3, M/M4

## Kejujuran data

- Acuan saling berselisih: GWIS (MCD64A1, 500 m) kurang hitung luas Indonesia 52-62% (kebakaran kecil, tertutup asap/awan, gambut); Gaveau dkk. 2021 (Sentinel-2 20 m) 2019 jauh di atas SiPongi dan GWIS.
- SiPongi (KLHK) TIDAK independen dari titik panas: indikasinya diturunkan dari titik panas + verifikasi; melatih model titik-panas terhadap SiPongi bersifat melingkar. M0/M1 pun dikalibrasi ke SiPongi.
- GWIS adalah batas bawah, bukan kebenaran. Target latih 'gabungan' = GWIS x prior literatur omisi 52-62%; Gaveau 2019 TIDAK ikut membentuk target latih, supaya Gaveau tetap penilai independen. 'Gabungan' tidak pernah dipakai menilai akurasi.
- Klaim akurasi hanya terhadap acuan independen dari target latih: Gaveau 2019 (satu tahun El Nino ekstrem) dan GFED5 2001-2020 bila terbaca (butuh netCDF4). Bila GFED5 tak terbaca, blok tahun independen < 4 dan K1 tak dapat dinilai: tidak ada model terpilih. Itu hasil jujur, bukan galat.
- Pembanding K1 dan skor seleksi = M0_terskala (M0 x median(target latih / M0) dari tahun latih lipatan, per acuan latih), supaya model tidak menang hanya karena M0 produksi (4,3 ha/titik) salah skala; selisih terhadap M0 mentah tetap dilaporkan (vs_m0_mentah).
- K1 lolos hanya bila selisih (M0_terskala - model) positif terhadap GFED5 (bootstrap blok tahun, >= 4 blok) DAN terhadap Gaveau 2019 (satu tahun, tanpa CI). K1 (bagian Gaveau) dan K2 berbagi data Gaveau 2019. GFED5 semi-independen: BA turunan titik api aktif MODIS, jadi bukan bukti sepenuhnya independen dari fitur titik. Blok tahun < 4 = tak dapat dinilai, tanpa label CI.
- Tally hanya punya SATU bukti (dalam_pita); selang_tumpang dibuang karena hanya mengulang. Pita acuan = heuristik ditulis sebelum hasil. Tally memakai P50 (koreksi median residu) sedangkan K1/K2 memakai prediksi mentah; bedanya dilaporkan (luas_model_mentah, rasio_p50_vs_mentah). `model_lolos` di tiap baris dan luas.json menandai apakah model yang dipakai tabel lolos K1-K3.
- Pada seri N, GFED5 hanya punya TEPAT 4 blok tahun di tahun uji akhir (2015, 2018, 2019, 2020), padahal min_blok_tahun = 4: K1 butuh keempatnya (satu tahun tanpa GFED5 = K1 tak dapat dinilai).
- Semua tahun api besar ada di tahun uji akhir; model dilatih di tahun tenang. 'Tidak lolos' bisa berarti tak mampu ekstrapolasi ke tahun besar, bukan titik panas tak informatif.
- Validasi silang antar-tahun ini adalah hindcast (melatih dengan tahun yang lebih baru untuk menguji tahun yang lebih lama), bukan prakiraan ke depan.
- Kandidat dengan < 5 tahun seleksi (berskor atau bertarget latih) tidak dapat menang (dilaporkan 'tahun seleksi kurang'); tahun dengan < 5 unit tidak dihitung sebagai blok galat/bootstrap.
- Pemilihan dari puluhan kandidat (model x acuan latih x seri) memakai tahun seleksi saja; tahun uji akhir (2015, 2018, 2019, 2020, 2021, 2023) tak dipakai melatih/memilih. Pemenang dibekukan lebih dulu; bila gagal, tidak turun ke peringkat 2.
- Acuan saling berselisih sampai sekitar 3x, maka K2 = median |ln(pred/Gaveau)| <= ln(1,5), bukan kecocokan ketat; pita tally melebar menurut ketidakpastian tiap acuan independen.
- Cakupan selang (K3) dihitung terhadap target latih: diagnosa kalibrasi internal, bukan bukti akurasi. Selang adalah selang terhadap target latih (untuk 'gabungan' dilebarkan ketidakpastian omisi), bukan luas sebenarnya.
- Tally: pita dari acuan independen saja; tahun dengan < 1 acuan independen = tak dapat dinilai (bukan cocok). Rasio luas/hotspot dan luas/firespot = konsistensi internal (model dibuat dari titik itu), bukan bukti. ENSO/IOD = penjelasan, bukan uji. Uji kekuatan menyuntik galat x0,5 dan x2 untuk melihat apakah tally mendeteksinya.
- Pergantian sensor: MODIS Terra 2000/Aqua Juli 2002 (jadi 2001-2002 setengah), S-NPP VIIRS 375 m sejak 2012, NOAA-20 sejak 2018, NOAA-21 sejak 2023; hitungan titik antar sensor tidak setara. Model dilatih per seri (N = S-NPP, M = MODIS) agar definisi konstan.
- Selang P10-P90 berasal dari residu konformal berkelompok (blok = tahun, koreksi n+1, per kelas ukuran bila n cukup); residu satu tahun berkorelasi, jadi cakupan per tahun dilaporkan, termasuk tahun El Nino. Selang nasional = jumlah kuantil provinsi (asumsi komonoton, konservatif).
- Papua/Papua Barat dilatih sebagai gabungan (91+93+94+95, 92+96) karena GWIS tak memisahkan; Kaltara dihitung di Kaltim. Batas provinsi pada titik memakai sel 0,01 derajat (galat sekitar 1 km di perbatasan).
- Nusantara Atlas 1.916.588 ha (Jan-Sep 2026, nasional) adalah angka berita (AFP), bukan data yang kita ukur ulang.
- Perkiraan 2026 memakai model yang dilatih pada tahun penuh, padahal data 2026 baru s.d. Oktober (musim belum usai) dan versi Jan-Sep (periode Nusantara Atlas) lebih pendek lagi, jadi bias rendah.
- Agregasi Gaveau per cluster (kecocokan petak terbakar dengan cluster DBSCAN) TIDAK dikerjakan di sini; sudah dicakup scripts/data/ujibanding_firespot.py. Di sini hanya per provinsi dan per sel 0,25 derajat.
- Sel 0,25 derajat Gaveau tanpa titik panas tidak terjangkau model; luasnya dilaporkan terpisah (ha_gaveau_tanpa_titik).
