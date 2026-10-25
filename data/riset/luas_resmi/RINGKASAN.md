# Luas terbakar 2023: sampling berlapis + citra (estimasi independen)

Dihasilkan `scripts/data/sampling_luas.py` (jangan disunting tangan). **Perkiraan citra, bukan ukur lapangan.**

## Metode

- Kerangka: daratan Indonesia pada kisi 0,003375 derajat (~375 m), batas dari `public/geo/kecamatan` (bagian luar poligon, sederhana; garis pantai kasar).
- A = sel dengan >= 1 deteksi VIIRS n/h tahun 2023 (S-NPP + NOAA-20), tanpa sel sumber panas tetap; B = cincin <= 2 km di luar A; C = sisa daratan di provinsi yang punya deteksi. Tiap strata dibagi gambut / mineral. Luas = jumlah sel x luas sel (cos lintang).
- Titik acak seragam dalam strata (seed tetap, `rancangan_2023.csv`). Label: Sentinel-2 L2A, jendela 3x3 piksel 20 m, dNBR = NBR pra - NBR pasca (median 3x3, piksel B8A+B12 >= 0,05). Terbakar bila dNBR >= 0,27 DAN NBR pasca < 0,1 DAN B8A pasca turun >= 0,02 dari pra (dan, di B/C, adegan pasca bulan >= Juli); dNBR >= 0,27 yang gagal syarat itu = tidak (perubahan non-api); dNBR < 0,1 = tidak; 0,1-0,27 dan tanpa pasangan = 'ragu'.
- Pra/pasca: pasangan adegan bersih terdekat yang MENGAPIT tanggal jangkar dengan jeda <= 60 hari. A,B: jangkar = deteksi pertama, terakhir, dan tengah dalam 2 km; C: 15 Sep, Agu, Okt, Jul, Nov. Sampai 4 pasangan; terbakar bila ada pasangan yang memenuhi aturan. Bersih = SCL tanpa awan/bayangan di 7x7 piksel tengah dan <= 15% awan di 21x21.
- Kontrol latar (B dan C): dNBR dikurangi median dNBR cincin 500-900 m di sekitar titik (perubahan musiman seluruh bentang, mis. padi/savana, tidak terbaca sebagai bakar). Tidak dipakai di A (cincin bisa ikut terbakar).
- Estimator: stratified (Olofsson dkk. 2014): L = sum A_h p_h; Var = sum A_h^2 p_h(1-p_h)/(n_h-1); selang 95% = L +- 1,96 SE. Utama: 'ragu' karena tanpa citra bersih dikeluarkan, 'ragu' karena dNBR sedang dihitung tidak terbakar.

## Strata

| strata | gambut | luas (ha) | n rancangan | n ditandai | terbakar | tidak | ragu (tanpa citra) | ragu (dNBR) |
|---|---|---|---|---|---|---|---|---|
| A | tidak | 2,748,226 | 275 | 275 | 20 | 115 | 83 | 57 |
| A | ya | 1,255,729 | 125 | 125 | 15 | 47 | 38 | 25 |
| B | tidak | 43,260,090 | 245 | 245 | 2 | 129 | 92 | 22 |
| B | ya | 9,804,740 | 55 | 55 | 2 | 18 | 33 | 2 |
| C | tidak | 110,239,312 | 249 | 249 | 0 | 26 | 214 | 9 |
| C | ya | 22,486,632 | 51 | 51 | 0 | 10 | 36 | 5 |

Luas daratan di provinsi tanpa deteksi (tidak disampel, dianggap tidak terbakar): 0 ha [].

## Hasil

| skenario | luas (ha) | SE | selang 95% | selang 95% konservatif |
|---|---|---|---|---|
| utama | 1,959,610 | 737,205 | 514,687 - 3,404,532 | 0 - 7,008,404 |
| ragu_tidak_terbakar | 1,060,238 | 357,328 | 359,875 - 1,760,601 | 0 - 2,220,555 |
| ragu_dikeluarkan | 2,351,883 | 826,829 | 731,298 - 3,972,468 | 0 - 9,164,997 |
| ragu_sedang_terbakar | 46,090,872 | 8,867,157 | 28,711,244 - 63,470,499 | 28,564,365 - 63,617,379 |
| tanpa_kontrol_latar | 2,242,356 | 788,234 | 697,417 - 3,787,294 | 0 - 7,320,296 |
| nbr_pasca_0,2 | 2,031,298 | 737,728 | 585,352 - 3,477,245 | 0 - 7,080,381 |
| hanya_dekat_titik_AB | 1,959,610 | 737,205 | 514,687 - 3,404,532 | 0 - 7,008,404 |
| dnbr_0,1 | 2,342,791 | 788,903 | 796,541 - 3,889,041 | 0 - 7,421,126 |
| dnbr_0,27 | 1,959,610 | 737,205 | 514,687 - 3,404,532 | 0 - 7,008,404 |
| dnbr_0,44 | 1,202,567 | 533,425 | 157,053 - 2,248,081 | 0 - 6,158,198 |

Pembanding: luas resmi BNPB/KLHK 1,161,193 ha; metode web kita (titik NOAA-20 n/h tersaring x 4,12) 994,069 ha.
Diagnosa (n=1000): 'terbakar' 39 (A 35, B 4, C 0); lolos dNBR tetapi gagal syarat bukan-api (NBR pasca, B8A, musim) 34; tanpa pasangan bersih <= 60 hari 496; B,C tanpa kontrol latar 1; |dNBR| > 2 pada 0 titik.
Skenario: `tanpa_kontrol_latar` dNBR mentah tanpa koreksi cincin 500-900 m; `nbr_pasca_0,2` batas NBR pasca dilonggarkan ke 0,2; `hanya_dekat_titik_AB` terbakar hanya dihitung di A dan B (butuh deteksi VIIRS <= 2 km), C dianggap 0; `ragu_tidak_terbakar` semua ragu = tidak; `ragu_dikeluarkan` semua ragu keluar dari penyebut; `ragu_sedang_terbakar` (batas atas) ragu karena dNBR sedang = terbakar; `dnbr_x` ambang dNBR x (syarat NBR pasca, B8A, musim tetap). `ragu_sedang_terbakar` praktis tak informatif: ragu tanpa citra dikeluarkan sehingga strata C yang luas dikalikan proporsi ragu.

## Keterbatasan

- Label otomatis satu aturan dNBR, belum dipastikan manusia (potongan 64x64 di `thumb/` untuk pemeriksaan). Tanpa matriks kesalahan acuan, selang hanya galat sampling, BUKAN galat label.
- dNBR 0,27 mengukur bekas bakar permukaan; bara gambut bawah tanah dan api < 1 piksel 20 m bisa luput (bias rendah). Panen, banjir, gugur daun, dan bayangan awan yang lolos SCL bisa menaikkan dNBR (bias tinggi).
- Aturan dNBR tetap tidak membedakan semua perubahan non-api (pembukaan lahan tanpa api, panen, banjir). Pada titik B dan C (jauh dari deteksi) positif palsu masih mungkin; periksa potongan `thumb/` lewat `periksa_2023.html` sebelum estimasi dipakai.
- Strata C hanya memeriksa pasangan yang mengapit 15 Jul-15 Nov: kebakaran Jan-Jun atau akhir tahun tidak tertangkap (bias rendah). Pasangan <= 60 hari tak selalu ada di daerah berawan: titik itu 'ragu tanpa citra' dan dikeluarkan (asumsi acak). Strata C berprevalensi rendah: strata dengan 0 terbakar memberi SE 0 pada rumus baku (lihat selang konservatif).
- Titik acak di dalam sel 375 m; titik tidak ditimbang cos lintang di dalam strata (galat < 1%). Garis pantai dan batas provinsi dari poligon kecamatan yang disederhanakan.
- Deteksi VIIRS tahun 2023 memakai arsip standar (SP); sel industri dibuang memakai daftar titik_palsu (disusun dari arsip yang sama).
