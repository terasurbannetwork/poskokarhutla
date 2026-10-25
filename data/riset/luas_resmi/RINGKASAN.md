# Luas terbakar 2023: sampling berlapis + citra (estimasi independen)

Dihasilkan `scripts/data/sampling_luas.py` (jangan disunting tangan). **Perkiraan citra, bukan ukur lapangan.**

## Metode

- Kerangka: daratan Indonesia pada kisi 0,003375 derajat (~375 m), batas dari `public/geo/kecamatan` (bagian luar poligon, sederhana; garis pantai kasar).
- A = sel dengan >= 1 deteksi VIIRS n/h tahun 2023 (S-NPP + NOAA-20), tanpa sel sumber panas tetap; B = cincin <= 2 km di luar A; C = sisa daratan di provinsi yang punya deteksi. Tiap strata dibagi gambut / mineral. Luas = jumlah sel x luas sel (cos lintang).
- Titik acak seragam dalam strata (seed tetap, `rancangan_2023.csv`). Label: Sentinel-2 L2A, jendela 3x3 piksel 20 m, dNBR = NBR pra - NBR pasca; terbakar bila dNBR >= 0,27 dan NBR pasca < 0,2; tidak terbakar bila dNBR < 0,1; selain itu 'ragu'.
- Pra/pasca: A,B = bersih terakhir sebelum deteksi pertama / bersih pertama sesudah deteksi terakhir dalam 2 km (<= 180 hari); C = Mei-Jul / Okt-Des. Bersih = SCL tanpa awan/bayangan di 7x7 piksel tengah dan <= 15% awan di 21x21. Sampai 4 pasangan dicoba bila 'ragu'.
- Estimator: stratified (Olofsson dkk. 2014): L = sum A_h p_h; Var = sum A_h^2 p_h(1-p_h)/(n_h-1); selang 95% = L +- 1,96 SE. Utama: 'ragu' karena tanpa citra bersih dikeluarkan, 'ragu' karena dNBR sedang dihitung tidak terbakar.

## Strata

| strata | gambut | luas (ha) | n rancangan | n ditandai | terbakar | tidak | ragu (tanpa citra) | ragu (dNBR) |
|---|---|---|---|---|---|---|---|---|
| A | tidak | 2,748,226 | 275 | 275 | 60 | 191 | 11 | 13 |
| A | ya | 1,255,729 | 125 | 125 | 33 | 76 | 13 | 3 |
| B | tidak | 43,260,090 | 245 | 245 | 22 | 198 | 8 | 17 |
| B | ya | 9,804,740 | 55 | 55 | 4 | 44 | 6 | 1 |
| C | tidak | 110,239,312 | 249 | 249 | 11 | 211 | 22 | 5 |
| C | ya | 22,486,632 | 51 | 51 | 1 | 47 | 1 | 2 |

Luas daratan di provinsi tanpa deteksi (tidak disampel, dianggap tidak terbakar): 0 ha [].

## Hasil

| skenario | luas (ha) | SE | selang 95% | selang 95% konservatif |
|---|---|---|---|---|
| utama | 11,602,405 | 1,872,870 | 7,931,580 - 15,273,231 | 7,821,656 - 15,383,155 |
| ragu_tidak_terbakar | 10,839,701 | 1,737,141 | 7,434,904 - 14,244,498 | 7,328,154 - 14,351,248 |
| ragu_dikeluarkan | 12,110,972 | 1,934,702 | 8,318,955 - 15,902,988 | 8,205,980 - 16,015,963 |
| ragu_sedang_terbakar | 18,402,155 | 2,321,112 | 13,852,776 - 22,951,535 | 13,775,546 - 23,028,764 |
| celah_maks_60hari | 3,967,696 | 1,126,321 | 1,760,107 - 6,175,284 | 0 - 84,526,732 |
| hanya_dekat_titik_AB | 5,810,680 | 908,797 | 4,029,438 - 7,591,921 | 3,784,484 - 7,836,876 |
| dnbr_0,1 | 11,816,167 | 1,880,139 | 8,131,094 - 15,501,240 | 8,021,699 - 15,610,636 |
| dnbr_0,27 | 11,602,405 | 1,872,870 | 7,931,580 - 15,273,231 | 7,821,656 - 15,383,155 |
| dnbr_0,44 | 7,769,979 | 1,487,792 | 4,853,907 - 10,686,052 | 4,709,617 - 10,830,342 |

Pembanding: luas resmi BNPB/KLHK 1,161,193 ha; metode web kita (titik NOAA-20 n/h tersaring x 4,12) 994,069 ha.
Diagnosa titik 'terbakar' (n=131: A 93, B 26, C 12): celah pra-pasca > 90 hari pada 67, median 95 hari; dNBR > 1 pada 52; |dNBR| > 2 (tak mungkin per piksel; penyebut NBR mendekati nol) pada 37 titik.
Skenario: `celah_maks_60hari` hanya pasangan pra-pasca <= 60 hari (ragu keluar); `hanya_dekat_titik_AB` terbakar hanya dihitung di A dan B (butuh deteksi VIIRS <= 2 km), C dianggap 0; `ragu_tidak_terbakar` semua ragu = tidak; `ragu_dikeluarkan` semua ragu keluar dari penyebut; `ragu_sedang_terbakar` (batas atas) ragu karena dNBR sedang = terbakar; `dnbr_x` ambang dNBR x (NBR pasca < 0,2 tetap).

## Keterbatasan

- Label otomatis satu aturan dNBR, belum dipastikan manusia (potongan 64x64 di `thumb/` untuk pemeriksaan). Tanpa matriks kesalahan acuan, selang hanya galat sampling, BUKAN galat label.
- dNBR 0,27 mengukur bekas bakar permukaan; bara gambut bawah tanah dan api < 1 piksel 20 m bisa luput (bias rendah). Panen, banjir, gugur daun, dan bayangan awan yang lolos SCL bisa menaikkan dNBR (bias tinggi).
- Aturan dNBR tidak membedakan api dari perubahan non-api: panen/olah padi, savana kering musim kemarau, pembukaan lahan tanpa api, dan celah pra-pasca panjang menaikkan dNBR. Pada titik B dan C (jauh dari deteksi) hampir semua 'terbakar' mungkin positif palsu; baca estimasi utama sebagai BATAS ATAS aturan, dan periksa potongan `thumb/` sebelum dipakai.
- Strata C memakai pra Mei-Jul dan pasca Okt-Des: kebakaran Jan-Apr atau Nov-Des di luar deteksi tidak tertangkap. Strata C berprevalensi rendah: strata dengan 0 terbakar memberi SE 0 pada rumus baku (lihat selang konservatif).
- Titik acak di dalam sel 375 m; titik tidak ditimbang cos lintang di dalam strata (galat < 1%). Garis pantai dan batas provinsi dari poligon kecamatan yang disederhanakan.
- Deteksi VIIRS tahun 2023 memakai arsip standar (SP); sel industri dibuang memakai daftar titik_palsu (disusun dari arsip yang sama).
