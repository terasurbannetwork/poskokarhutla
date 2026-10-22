# Uji balik aturan kompleks kebakaran: eps dan tautan waktu

Disusun 22 Okt 2026 oleh `pipa-data` atas pertanyaan pemilik: jumlah kompleks terlihat membengkak (Papua Selatan 21 Okt: 2.237 kompleks vs 528 titik). Aturan sekarang (`scripts/data/harian.py:28-30, 125-143`): DBSCAN titik VIIRS jendela 7 hari, eps adaptif `min(1,5; max(0,6; 1,5 x piksel))` (jadi 0,6 km untuk piksel 375 m), tautan waktu 48 jam, minPts 1, kompleks aktif bila terdeteksi <= 72 jam (168 jam di gambut kering). Usulan: eps 1,5 km tetap dan tautan 72 jam.

Tidak ada berkas produksi yang diubah. Semua kode uji ada di scratchpad sesi (lihat bagian 13), bukan di repo.

## 0. Kesimpulan

1. **Usulan 1,5 km / 72 jam tidak saya rekomendasikan apa adanya.** Ia memang menurunkan jumlah kompleks aktif 26-34% pada jendela 2026 (16-27% pada 2019/2023), tetapi (a) 1,5 km berada di sisi yang salah dari "tebing" penggabungan: pada 12 Okt 2026 kompleks terbesar Kalteng melompat dari 4.969 ke 8.565 titik, diameter 42,5 ke 63 km, lambung 750 ke 1.611 km2 (aturan sekarang: 3.202 titik, 30 km, 252 km2); (b) jumlah kompleks aktif berdiameter >= 25 km naik dari 2 ke 7 pada 12 Okt, dari 0 ke 2 pada 28 Sep 2023, dari 1 ke 5 pada 14 Sep 2019; (c) tak ada pembanding independen yang bisa memutuskan 1,5 km lebih benar dari 1,0 km (bagian 8).
2. **Dua perubahan yang didukung bukti:** tautan waktu 72 jam (sama dengan jendela aktif; -5% sampai -8%) dan lantai eps 1,0 km menggantikan 0,6 km (eps tetap adaptif sampai 1,5 km di tepi sapuan). Gabungannya: **-11% sampai -17% jumlah kompleks aktif di jendela 2026** (-7% sampai -14% pada 2019/2023; 21 Okt: 11.845 -> 10.014 nasional; Papua Selatan 2.275 -> 1.905; Kalteng 1.955 -> 1.397), dengan kompleks terbesar 21 Okt 29 -> 31 km dan 12 Okt 30 -> 42 km (kenaikan 12 Okt hampir seluruhnya berasal dari tautan 72 jam, bukan dari lantai eps).
3. **Selisih 2.237 vs 528 sebagian besar bukan soal eps.** 2.237 adalah *stok* kompleks yang punya deteksi 3 s.d. 7 hari terakhir (3 satelit VIIRS, keyakinan n/h, gambut kering dipertahankan 168 jam); 528 adalah *aliran* satu hari WIB yang baru separuh jalan (MODIS + S-NPP + NOAA-20, semua keyakinan, data sampai 14.29 WIB). Dengan hari yang sama, Papua Selatan 21 Okt punya 253 kompleks bertitik hari ini untuk 714 titik VIIRS n/h (0,35 kompleks per titik). Bahkan aturan usulan hanya menurunkan 2.275 ke 1.535.
4. **Pembanding independen yang valid tidak ada.** Satu-satunya hitungan lapangan di repo adalah Fire Spot (FS) BNPB di 5-6 provinsi: 10-21 kali lebih kecil dari jumlah kompleks aktif di aturan mana pun, dan peringkat antarprovinsinya identik untuk A, B, dan lantai 1,0 (Spearman 0,77, n = 6). Tak satu aturan pun "lebih mengikuti" FS (bagian 8).
5. **Ambang status tidak terganggu** oleh perubahan ini: jumlah kompleks teramati dengan front 24 jam >= 15 piksel (ambang Prioritas) 158 / 158 / 159 (A / lantai 1,0 / B) pada 21 Okt, 171 / 180 / 187 pada 12 Okt. Tetapi uji balik asli penetapan ambang tidak ada di repo, jadi kalibrasinya tidak bisa diulang (bagian 7).

## 1. Cara uji

**Aturan yang dibandingkan.** Semua dijalankan lewat `harian.dbscan()` yang di-import apa adanya (read-only), pada himpunan titik yang sama persis dengan `harian.main()`:

| Kode | Eps | Tautan waktu | Cara dijalankan lewat `dbscan()` tanpa mengubahnya |
| --- | --- | --- | --- |
| **A (sekarang)** | adaptif `min(1,5; max(0,6; 1,5 x piksel))` | 48 j | `dbscan(viirs)` |
| **B (usulan)** | 1,5 km tetap | 72 j | `dbscan([{**p, "px": 1.0} for p in viirs], eps=1.5, jam=72)` |
| A_72 | adaptif | 72 j | `dbscan(viirs, jam=72)` (hanya waktu diubah) |
| B_48 | 1,5 tetap | 48 j | px = 1.0, `jam=48` (hanya ruang diubah) |
| **L (lantai 1,0)** | adaptif, lantai 1,0 km | 72 j | `px' = max(px, 1.0/1.5)`, `jam=72` |
| F1,0 / F0,75 | 1,0 / 0,75 km tetap | 72 j | px = 1.0, `eps=1.0` / `0.75` |

`dbscan()` tidak bisa menyatakan "eps tetap 1,5" dengan argumen apa pun: rumusnya `e = min(eps, max(0.6, 1.5 * px))`, jadi `eps` hanya batas atas dan `eps=1.5` (nilai bawaan sekarang) tetap menghasilkan 0,6 km pada piksel 375 m. "Tetap" saya buat dengan menimpa `px=1.0` pada salinan titik (1,5 x 1,0 = 1,5); fungsinya tidak disentuh. Usulan pemilik karena itu butuh perubahan rumus di baris 143, bukan hanya konstanta. Catatan: F1,0 (tetap) bukan pelonggaran murni dari A (di tepi sapuan A memberi sampai 1,2 km); L (lantai) adalah pelonggaran murni dan hasilnya hampir sama dengan F1,0 (21 Okt: 10.014 vs 10.037 kompleks aktif).

**Verifikasi alat ukur.** Untuk minPts = 1, DBSCAN harus sama dengan komponen terhubung graf tetangga. Saya mengujinya dengan union-find buatan sendiri (kisi 4 km, Haversine langsung dari definisi) pada Papua Selatan (18.864 titik) dan Kalteng (44.152 titik), tiga aturan: partisinya identik di keenam kasus (2.762 / 1.776 / 2.261 kluster di Papua Selatan dan 2.507 / 1.432 / 1.833 di Kalteng untuk A / B / F1,0).

**Masukan sama dengan produksi.** VIIRS S-NPP + NOAA-20 + NOAA-21, keyakinan nominal/tinggi, titik di luar poligon provinsi dibuang, sel industri `titik_palsu.json` dibuang, gunung api (`aturan.gunung_api`) dikeluarkan, dedup (lat, lon, waktu, sensor), jendela 7 x 24 jam mundur dari T. Provinsi kompleks = kecamatan titik pusatnya (seperti `harian.main`). "Aktif" = deteksi terakhir <= 72 jam, atau <= 168 jam bila di gambut kering. Untuk jendela 7-21 Okt 2026, "gambut kering" memakai DC sel FWI terdekat dari `public/data/fwi.json` (ada untuk 8-15 Okt; tanggal setelahnya dijepit ke 15 Okt). Untuk jendela lain (Agu, Sep 2026; 2019; 2023) semua kompleks gambut dianggap kering, sehingga hitungan aktifnya adalah batas atas (selisih pada 21 Okt hanya 3%: 11.845 vs 12.209; 89% kompleks gambut sampel punya DC > 350 pada 15 Okt). Tabel sapuan (bagian 4) memakai definisi batas atas ini.

**Data.**

| Jendela | Sumber |
| --- | --- |
| 2026-10-16 s.d. 21 (T = 16.59 UTC akhir hari WIB; 21 Okt T = 10.29 UTC, data sampai 07.29 UTC) | FIRMS NRT 15-21 Okt dari tarball deck BNPB 21 Okt (`raw2`) + FIRMS area API NRT 10-14 Okt |
| 2026-10-07, 11, 12; 2026-09-14; 2026-08-20 | FIRMS area API NRT, 3 satelit VIIRS |
| 2023-09-28, 2023-10-16 | `data/raw/firms/viirs.csv` (S-NPP) + `viirs_noaa20.csv` + NOAA-21 SP dari API |
| 2019-09-14, 2019-10-05 | `data/raw/firms/viirs.csv` + `viirs_noaa20.csv` (2 satelit; NOAA-21 belum ada) |

Tiap jendela diperiksa liputannya (setiap sensor punya titik di setiap hari UTC jendela): tidak ada hari bolong. Catatan: S-NPP 20 Okt kehilangan lintasan siang (lihat README deck), efeknya sama pada kedua aturan.

**Kecocokan dengan angka pemilik.** "528 titik" Papua Selatan = hitungan utama (MODIS + S-NPP + NOAA-20, semua keyakinan, hari WIB 21 Okt): saya mendapat **528 persis** dari `raw2`. "2.237 kompleks" ~ aturan A pada 21 Okt: **2.275** (selisih 1,7%, beda jam jalan).

## 2. Mengapa 2.237 kontras dengan 528

Papua Selatan, jendela 21 Okt, aturan sekarang (A):

| Besaran | Nilai | Jenis |
| --- | ---: | --- |
| Titik MODIS + S-NPP + NOAA-20, semua keyakinan, hari WIB 21 Okt (sampai 14.29 WIB) | 528 | aliran 1 hari, separuh hari |
| Titik VIIRS 3 satelit, keyakinan n/h, hari WIB 21 Okt | 714 | aliran 1 hari |
| Titik VIIRS n/h, 72 jam terakhir | 8.054 | |
| Titik VIIRS n/h, 7 hari | 18.864 | |
| Kompleks yang punya deteksi di hari WIB 21 Okt | 253 | aliran, sebanding dengan 528/714 |
| Kompleks dengan deteksi terakhir <= 72 jam | 1.535 | stok |
| **Kompleks aktif (72 jam; 168 jam di gambut kering)** | **2.275** | stok, yang ditampilkan (live: 2.237) |
| Semua kompleks dalam jendela 7 hari | 2.762 | |
| Aktif dengan >= 2 deteksi / >= 3 deteksi | 1.338 / 950 | |

Angka yang ditampilkan menghitung semua api yang masih "dianggap menyala" 3 hari (7 hari di gambut), sementara titik 528 hanya deteksi sehari. Di sabana Papua Selatan kebakaran pendek (41% kompleks hanya satu deteksi), jadi stok 3-7 hari jauh melampaui jumlah api yang menyala pada satu hari. Mengubah eps/waktu hanya menurunkan stok itu (A 2.275, lantai 1,0 1.905, B 1.535); untuk membuatnya sebanding dengan titik harian diperlukan perubahan definisi tampilan, bukan parameter klaster (lihat rekomendasi 5).

## 3. Hasil: aturan sekarang vs usulan, semua jendela

**Tabel 1. Jumlah kompleks aktif nasional** (batas atas gambut-kering kecuali 7-21 Okt 2026 yang memakai DC; "tunggal" = bagian kompleks aktif berisi satu deteksi).

| Jendela | titik VIIRS 7 hari | A (sekarang) | A_72 (waktu saja) | B_48 (ruang saja) | F1,0/72 | B (usulan) | A_72 vs A | B_48 vs A | F1,0/72 vs A | B vs A | tunggal A / F1,0 / B |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026-10-21 | 139.087 | 11.845 | 10.933 | 9.196 | 10.037 | 8.419 | -8% | -22% | -15% | -29% | 45% / 41% / 37% |
| 2026-10-20 | 146.906 | 11.602 | 10.849 | 9.050 | 9.958 | 8.362 | -6% | -22% | -14% | -28% | 44% / 41% / 38% |
| 2026-10-19 | 139.593 | 11.343 | 10.681 | 8.812 | 9.806 | 8.211 | -6% | -22% | -14% | -28% | 44% / 41% / 38% |
| 2026-10-18 | 149.866 | 11.800 | 11.031 | 9.171 | 10.098 | 8.478 | -7% | -22% | -14% | -28% | 45% / 41% / 38% |
| 2026-10-17 | 149.353 | 11.470 | 10.760 | 8.994 | 9.908 | 8.323 | -6% | -22% | -14% | -27% | 43% / 39% / 36% |
| 2026-10-16 | 148.247 | 11.462 | 10.899 | 9.073 | 10.134 | 8.532 | -5% | -21% | -12% | -26% | 43% / 39% / 37% |
| 2026-10-12 | 189.196 | 13.152 | 12.356 | 9.747 | 11.177 | 8.990 | -6% | -26% | -15% | -32% | 42% / 39% / 36% |
| 2026-10-11 | 190.072 | 12.168 | 11.266 | 9.008 | 10.203 | 8.182 | -7% | -26% | -16% | -33% | 42% / 39% / 36% |
| 2026-10-07 | 183.500 | 14.186 | 13.118 | 10.210 | 11.740 | 9.301 | -8% | -28% | -17% | -34% | 43% / 38% / 36% |
| 2026-09-14 | 133.465 | 13.557 | 12.692 | 10.409 | 11.683 | 9.605 | -6% | -23% | -14% | -29% | 42% / 38% / 36% |
| 2026-08-20 | 92.238 | 11.749 | 11.201 | 9.334 | 10.422 | 8.696 | -5% | -21% | -11% | -26% | 44% / 40% / 38% |
| 2023-10-16 | 45.134 | 6.660 | 6.403 | 5.586 | 6.081 | 5.309 | -4% | -16% | -9% | -20% | 49% / 46% / 44% |
| 2023-09-28 | 70.498 | 10.095 | 9.695 | 8.307 | 9.164 | 7.892 | -4% | -18% | -9% | -22% | 47% / 44% / 42% |
| 2019-10-05 | 23.670 | 4.463 | 4.313 | 3.877 | 4.136 | 3.729 | -3% | -13% | -7% | -16% | 55% / 52% / 48% |
| 2019-09-14 | 126.568 | 10.849 | 10.016 | 8.586 | 9.289 | 7.866 | -8% | -21% | -14% | -27% | 47% / 43% / 41% |

Yang terbaca: (1) penurunan B vs A stabil -26% s.d. -34% di semua jendela 2026 dan lebih kecil di 2019/2023 (2-3 satelit, api lebih jarang); (2) komponen ruang (-13% s.d. -28%) tiga sampai empat kali komponen waktu (-3% s.d. -8%); (3) bahkan sesudah B, 36-48% kompleks aktif tetap satu deteksi.

**Dari mana penyusutan A -> B?** Pada 21 Okt (aktif, batas atas) A 12.209 -> B 8.683 (-3.526). Tiap pasangan kompleks A yang bertaut baru di B diberi jenis tautan terkuatnya, lalu digabung berurutan (atribusi bergantung urutan, jadi ini taksiran kasar):

| Jenis tautan baru | 21 Okt: turun aktif | bagian | 12 Okt: turun aktif | bagian |
| --- | ---: | ---: | ---: | ---: |
| 0. serempak (<= 90 mnt), beda satelit, jarak di atas eps adaptif | 900 | 26% | 1.232 | 29% |
| 1. serempak (<= 30 mnt), satu lintasan, celah antarpiksel | 735 | 21% | 794 | 19% |
| 2. beda waktu <= 48 j, jarak di atas eps adaptif | 1.062 | 30% | 1.446 | 34% |
| 3. beda waktu 48-72 j | 830 | 24% | 787 | 18% |

Sekitar separuh penyusutan (jenis 0 dan 1) berasal dari tautan antara deteksi yang terjadi pada saat yang sama (api yang sama dilihat dua satelit atau satu lintasan, posisi bergeser 0,6-1,5 km); ini efek alat ukur, bukan perilaku api. Separuh lain adalah tautan antarwaktu (jenis 2 dan 3) yang lebih bersifat keputusan.

**Tabel 2a. Per provinsi, jendela 2026-10-21** (aktif = aturan produksi dengan DC; "ada titik <= 72 j" = kompleks yang terdeteksi dalam 72 jam; "ada titik hari ini" = kompleks dengan deteksi di hari WIB 21 Okt).

| Provinsi | titik 7 hari | titik 72 j | titik hari WIB | A semua | A aktif | A ada titik <=72 j | A ada titik hari ini | B semua | B aktif | B ada titik <=72 j | B ada titik hari ini | B vs A |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| PapSel | 18.864 | 8.054 | 714 | 2.762 | 2.275 | 1.535 | 253 | 1.776 | 1.535 | 1.080 | 219 | -33% |
| Kalteng | 44.152 | 14.234 | 5.560 | 2.506 | 1.955 | 1.037 | 668 | 1.431 | 1.057 | 647 | 444 | -46% |
| Sumsel | 16.507 | 6.036 | 3.425 | 1.544 | 1.200 | 754 | 497 | 1.084 | 787 | 545 | 373 | -34% |
| Kalsel | 6.652 | 3.601 | 1.539 | 1.108 | 875 | 663 | 383 | 746 | 627 | 502 | 313 | -28% |
| NTT | 3.563 | 1.566 | 777 | 1.598 | 732 | 731 | 361 | 1.213 | 588 | 587 | 313 | -20% |
| Kaltim | 6.402 | 2.732 | 1.271 | 1.309 | 673 | 624 | 339 | 963 | 536 | 502 | 287 | -20% |
| Sulteng | 3.707 | 2.702 | 1.175 | 707 | 433 | 433 | 238 | 545 | 352 | 352 | 208 | -19% |
| Sulsel | 2.647 | 1.713 | 619 | 718 | 395 | 395 | 172 | 580 | 337 | 337 | 155 | -15% |
| Sultra | 2.921 | 1.655 | 689 | 700 | 351 | 351 | 192 | 566 | 296 | 296 | 167 | -16% |
| Kalbar | 7.631 | 2.205 | 840 | 494 | 349 | 192 | 103 | 348 | 236 | 157 | 90 | -32% |
| Maluku | 3.399 | 1.788 | 306 | 622 | 333 | 333 | 101 | 428 | 249 | 249 | 84 | -25% |
| NTB | 1.727 | 697 | 317 | 607 | 270 | 270 | 130 | 451 | 217 | 217 | 108 | -20% |
| PapBar | 2.679 | 1.666 | 81 | 378 | 265 | 265 | 40 | 208 | 158 | 158 | 32 | -40% |
| Jatim | 5.367 | 2.240 | 375 | 613 | 247 | 247 | 78 | 524 | 221 | 221 | 71 | -11% |

**Tabel 2b. Ukuran kompleks aktif, 21 Okt** (titik = deteksi per kompleks; luas = jejak piksel unik km2; sebaran = median / p90 / maks; diam = diameter terjauh km; "diam >= 25/50" = jumlah kompleks aktif).

| Provinsi | tunggal A | tunggal B | titik A | titik B | luas A km2 | luas B km2 | diam maks A | diam maks B | diam >=25/>=50 A | diam >=25/>=50 B |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| PapSel | 41% | 33% | 2 / 14 / 530 | 3 / 22 / 667 | 0,28 / 1,1 / 31 | 0,28 / 1,8 / 35 | 14,0 | 15,0 | 0 / 0 | 0 / 0 |
| Kalteng | 40% | 29% | 2 / 28 / 1.977 | 3 / 59 / 2.259 | 0,28 / 2,0 / 94 | 0,42 / 4,1 / 143 | 28,7 | 38,0 | 2 / 0 | 3 / 0 |
| Sumsel | 42% | 34% | 2 / 15 / 3.419 | 2 / 21 / 4.145 | 0,28 / 1,1 / 82 | 0,28 / 1,7 / 103 | 19,4 | 22,6 | 0 / 0 | 0 / 0 |
| Kalsel | 40% | 32% | 2 / 14 / 398 | 3 / 22 / 422 | 0,28 / 1,3 / 13 | 0,28 / 1,8 / 21 | 9,6 | 12,0 | 0 / 0 | 0 / 0 |
| NTT | 55% | 44% | 1 / 4 / 135 | 2 / 7 / 135 | 0,14 / 0,4 / 10 | 0,28 / 0,8 / 10 | 6,0 | 12,3 | 0 / 0 | 0 / 0 |
| Kaltim | 45% | 38% | 2 / 14 / 270 | 2 / 18 / 320 | 0,28 / 1,1 / 19 | 0,28 / 1,5 / 22 | 8,1 | 15,7 | 0 / 0 | 0 / 0 |
| Kalbar | 45% | 41% | 2 / 16 / 4.193 | 2 / 26 / 4.321 | 0,28 / 1,3 / 87 | 0,28 / 2,0 / 96 | 16,8 | 18,9 | 0 / 0 | 0 / 0 |
| Maluku | 42% | 33% | 2 / 16 / 223 | 3 / 24 / 334 | 0,28 / 1,5 / 16 | 0,42 / 2,4 / 25 | 8,6 | 11,6 | 0 / 0 | 0 / 0 |
| PapBar | 38% | 29% | 2 / 22 / 254 | 4 / 34 / 359 | 0,28 / 1,8 / 15 | 0,42 / 2,7 / 26 | 11,4 | 19,6 | 0 / 0 | 0 / 0 |
| Jatim | 66% | 63% | 1 / 7 / 1.166 | 1 / 7 / 1.682 | 0,14 / 0,7 / 52 | 0,14 / 0,7 / 74 | 12,2 | 19,6 | 0 / 0 | 0 / 0 |

Di 21 Okt jendela biasa, B memperbesar kompleks terbesar hanya 5-35% dan belum ada yang >= 50 km. Kekhawatiran mega-kompleks muncul di jendela puncak (bagian 4).

## 4. Kompleks raksasa: provinsi gambut/sabana pada jendela puncak

**Tabel 3. Provinsi utama pada jendela puncak** (A = sekarang, L = lantai 1,0 km + 72 j, kecuali 2019/2023/10-07 yang memakai F1,0 tetap; B = usulan).

| Jendela | Provinsi | titik 7 hari | A aktif | L aktif | B aktif | B vs A | tunggal A / B | titik p90 A / B | titik maks A / L / B | diam maks km A / L / B | aktif diam >=25: A / L / B |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2026-10-12 | Kalteng | 56.677 | 2.212 | 1.697 | 1.268 | -43% | 38% / 29% | 30 / 64 | 3.202 / 4.969 / 8.565 | 30,2 / 42,5 / 63,0 | 2 / 2 / 2 |
| 2026-10-12 | Sumsel | 24.927 | 971 | 830 | 683 | -30% | 41% / 35% | 18 / 26 | 3.254 / 3.890 / 5.423 | 18,2 / 21,5 / 28,3 | 0 / 0 / 1 |
| 2026-10-12 | PapSel | 45.381 | 3.981 | 3.172 | 2.259 | -43% | 39% / 32% | 17 / 31 | 2.853 / 2.925 / 3.731 | 22,6 / 32,5 / 56,8 | 0 / 2 / 3 |
| 2026-10-12 | Kalbar | 6.991 | 325 | 291 | 261 | -20% | 48% / 43% | 10 / 11 | 3.403 / 3.423 / 3.508 | 20,3 / 20,3 / 28,1 | 0 / 0 / 1 |
| 2026-10-07 | Kalteng | 48.859 | 2.122 | 1.597 | 1.206 | -43% | 39% / 28% | 32 / 70 | 2.060 / 2.063 / 3.794 | 21,9 / 21,9 / 38,6 | 0 / 0 / 1 |
| 2026-10-07 | Sumsel | 24.384 | 1.229 | 1.009 | 808 | -34% | 42% / 38% | 17 / 25 | 2.031 / 3.011 / 3.057 | 25,5 / 28,0 / 29,4 | 1 / 2 / 3 |
| 2026-10-07 | PapSel | 38.427 | 3.689 | 2.877 | 1.928 | -48% | 39% / 29% | 19 / 36 | 802 / 962 / 2.290 | 17,6 / 18,1 / 33,1 | 0 / 0 / 3 |
| 2019-09-14 | Kalteng | 44.635 | 1.808 | 1.394 | 1.102 | -39% | 37% / 27% | 24 / 45 | 3.125 / 3.164 / 3.169 | 24,8 / 25,7 / 27,2 | 0 / 1 / 1 |
| 2019-09-14 | Kalsel | 6.249 | 789 | 607 | 438 | -44% | 42% / 35% | 15 / 22 | 320 / 320 / 670 | 8,1 / 11,1 / 39,6 | 0 / 0 / 1 |
| 2019-09-14 | Kalbar | 15.336 | 1.369 | 1.121 | 930 | -32% | 44% / 39% | 15 / 22 | 848 / 980 / 1.453 | 9,3 / 11,2 / 27,8 | 0 / 0 / 1 |
| 2019-09-14 | Sumsel | 11.772 | 1.133 | 947 | 777 | -31% | 44% / 39% | 12 / 17 | 643 / 644 / 1.157 | 10,0 / 18,4 / 21,7 | 0 / 0 / 0 |
| 2023-09-28 | Kalsel | 8.925 | 852 | 675 | 447 | -48% | 38% / 32% | 18 / 25 | 664 / 667 / 1.463 | 12,1 / 18,7 / 38,0 | 0 / 0 / 1 |
| 2023-09-28 | Sumsel | 10.747 | 1.054 | 888 | 747 | -29% | 39% / 36% | 13 / 19 | 1.672 / 1.684 / 1.795 | 15,5 / 16,5 / 27,6 | 0 / 0 / 1 |

Kasus paling ekstrem: Kalsel 14 Sep 2019 dan 28 Sep 2023, diameter terbesar 8,1 -> 39,6 km dan 12,1 -> 38,0 km (3-5 kali lipat), karena beberapa ladang api berjarak 1,0-1,5 km tersambung rantai. Tabel 2b memuat provinsi lain untuk 21 Okt.

**Tabel 3b. Ringkasan nasional kompleks raksasa** (aktif; A / F1,0 / B).

| Jendela | jumlah diam >= 25 km | diameter maks km | lambung maks km2 | titik kompleks terbesar |
|---|---:|---:|---:|---:|
| 2026-10-21 | 2 / 2 / 3 | 29 / 31 / 38 | 199 / 329 / 587 | 4.193 / 4.305 / 4.321 |
| 2026-10-20 | 2 / 3 / 5 | 29 / 32 / 40 | 187 / 348 / 612 | 4.525 / 4.627 / 4.665 |
| 2026-10-19 | 2 / 2 / 6 | 29 / 33 / 40 | 191 / 366 / 661 | 3.826 / 4.390 / 4.431 |
| 2026-10-18 | 2 / 2 / 5 | 36 / 36 / 53 | 640 / 648 / 1.248 | 4.136 / 4.636 / 6.078 |
| 2026-10-17 | 2 / 2 / 5 | 37 / 37 / 41 | 661 / 666 / 741 | 3.901 / 3.945 / 4.469 |
| 2026-10-16 | 2 / 2 / 5 | 32 / 38 / 38 | 370 / 642 / 642 | 3.671 / 3.885 / 4.111 |
| 2026-10-12 | 2 / 4 / 7 | 30 / 42 / 63 | 321 / 750 / 1.611 | 3.403 / 4.969 / 8.565 |
| 2026-10-11 | 2 / 3 / 6 | 31 / 33 / 63 | 549 / 593 / 1.420 | 4.209 / 4.353 / 7.061 |
| 2026-10-07 | 1 / 2 / 7 | 26 / 28 / 39 | 206 / 228 / 516 | 2.060 / 3.011 / 3.794 |
| 2026-09-14 | 0 / 0 / 2 | 20 / 20 / 28 | 119 / 229 / 323 | 2.523 / 2.537 / 2.539 |
| 2026-08-20 | 0 / 1 / 2 | 22 / 26 / 30 | 189 / 269 / 416 | 1.903 / 2.379 / 2.506 |
| 2023-10-16 | 0 / 0 / 0 | 14 / 24 / 24 | 73 / 111 / 139 | 779 / 752 / 854 |
| 2023-09-28 | 0 / 0 / 2 | 17 / 19 / 38 | 102 / 162 / 747 | 1.672 / 1.684 / 1.795 |
| 2019-10-05 | 0 / 0 / 0 | 10 / 15 / 15 | 50 / 70 / 74 | 499 / 501 / 530 |
| 2019-09-14 | 1 / 3 / 5 | 34 / 38 / 40 | 246 / 265 / 476 | 3.187 / 3.237 / 3.517 |

Di Kalteng 12 Okt kompleks terbesar B (Kotawaringin Barat, 8.565 titik) hanya 28% terisi piksel (458 km2 jejak piksel dalam lambung 1.611 km2): rantai ladang api yang renggang, bukan satu bentang rapat. Aturan sekarang memecahnya menjadi beberapa kompleks (yang terbesar 3.202 titik, Seruyan). Saya tidak bisa membuktikan mana yang "benar" (tidak ada kebenaran dasar), tetapi satu kompleks 63 km / 1.611 km2 tidak berguna sebagai satuan perintah regu.

**Tabel 5a. Sapuan eps (tautan 72 j), 12 Okt 2026** (eps tetap x km; "adaptif" = aturan sekarang tetapi tautan 72 j; "lantaiX" = adaptif dengan lantai X; aktif = batas atas; "bagian Kalteng" = titik kompleks terbesar / titik di Kalteng).

| eps | kluster semua | aktif | titik kluster terbesar | diam maks aktif km | aktif diam >=25 | lambung terbesar km2 | bagian Kalteng |
|---|---:|---:|---:|---:|---:|---:|---:|
| 0,6 | 22.309 | 14.391 | 3.404 | 30,2 | 1 | 138 | 6% |
| 0,75 | 20.348 | 13.135 | 4.720 | 41,8 | 1 | 646 | 8% |
| adaptif | 19.802 | 12.707 | 4.950 | 42,5 | 2 | 714 | 9% |
| 1,0 | 17.815 | 11.503 | 4.969 | 42,5 | 4 | 750 | 9% |
| lantai 1,0 | 17.766 | 11.465 | 4.969 | 42,5 | 4 | 750 | 9% |
| **1,25** | 15.983 | 10.289 | **7.917** | **55,5** | 4 | **1.398** | 14% |
| lantai 1,2 | 16.350 | 10.537 | 7.917 | 55,5 | 4 | 1.398 | 14% |
| **1,5** | 14.447 | 9.273 | **8.565** | **63,1** | 7 | **1.611** | 15% |

Sapuan yang sama pada 21 Okt: kompleks terbesar 4.305 -> 4.315 -> 4.321 titik (eps 1,0 -> 1,25 -> 1,5), diameter 31,1 -> 36,6 -> 38,0 km, jumlah aktif 10.336 -> 9.420 -> 8.683. Pada 14 Sep 2019: eps 1,0 / 1,25 / 1,5 memberi kompleks terbesar 3.237 / 3.237 / 3.517 titik, lambung 265 / 265 / 358 km2, dan bagian titik Kalsel dalam kompleks terbesarnya 5% / 7% / 11%, Sumsel 6% / 6% / 10%.

Dua pelajaran: (1) di Kalteng 12 Okt ada **tebing** antara 1,0 dan 1,25 km (kompleks terbesar +59% titik, +86% lambung) yang berarti hasil di sekitar 1,25-1,5 km rapuh terhadap perubahan kecil eps; (2) jumlah kompleks menurun mulus dengan eps (21 Okt, aktif: 12.558 / 11.544 / 10.336 / 9.420 / 8.683 untuk 0,6 / 0,75 / 1,0 / 1,25 / 1,5) tanpa dataran (plateau), jadi **tidak ada skala alami di data titik yang bisa memilih eps hanya dari hitungan klaster**; penurunan jumlah bukan bukti bahwa aturan lebih benar.

(Baris eps 2,0, 2,5 dan 3,0 dalam keluaran sapuan mentah identik dengan 1,5 karena `dbscan()` membatasi `e` pada `min(eps, 1.5 x px)` dan px = 1,0; baris itu tidak valid dan tidak dipakai di sini. Menguji eps > 1,5 butuh px > 1,0.)

**Sapuan tautan waktu** (eps adaptif, 21 Okt, aktif batas atas): 24 j 14.053; 36 j 12.986; 48 j 12.209; 60 j 11.744; **72 j 11.243**; 96 j 10.984; 120 j 10.854; 168 j 10.711. Penurunan 48 -> 72 j adalah -7,9%; 72 -> 168 j hanya -4,7%: 72 jam sudah dekat lutut kurva. Di eps tetap 1,5 pada 12 Okt, memperpanjang tautan 72 -> 168 j menaikkan jumlah kompleks aktif >= 25 km dari 7 ke 13; di eps adaptif tidak naik (2). Kompleks raksasa sebagian besar ditentukan eps, bukan waktu.

## 5. Konsistensi waktu: tautan harus >= jendela aktif

Aturan sekarang memakai tautan 48 jam tetapi menganggap kompleks aktif 72 jam. Akibatnya deteksi yang muncul 49-72 jam setelah deteksi terakhir sebuah kompleks aktif, di tempat yang sama, membuka kompleks kembar baru sementara yang lama tetap "aktif": api yang sama dihitung dua kali. Ukuran langsung: bagian kompleks aktif yang berbagi komponen ruang dengan kompleks aktif lain (komponen ruang = hasil klaster tanpa batas waktu).

| Jendela | A (48 j) | A_72 | B_48 | B (72 j) |
| --- | ---: | ---: | ---: | ---: |
| 2026-10-21 | 2.370 (20,0%) | 912 (8,3%) | 2.158 (23,5%) | 897 (10,7%) |
| 2026-10-07 | 3.288 (23,2%) | 1.593 (12,1%) | 2.852 (27,9%) | 1.427 (15,3%) |
| 2026-09-14 | 2.403 (17,7%) | 983 (7,7%) | 2.200 (21,1%) | 902 (9,4%) |
| 2023-09-28 | 1.387 (13,7%) | 733 (7,6%) | 1.313 (15,8%) | 646 (8,2%) |

Tautan 72 jam menurunkan duplikasi dari 14-23% ke 8-15% kompleks aktif. Sisanya dua macam: (a) kompleks gambut yang aktif 168 jam tetapi tertaut hanya 72 jam (sekitar tiga perempat sisa pada 21 Okt; hanya 237 dari 897 kompleks kembar berada di luar gambut); (b) front yang pindah > 1,5 km sementara jejak lamanya tetap aktif (sah). Tautan sadar-gambut (168 j antara dua titik gambut) memangkas 3% lagi (21 Okt: L 10.014 -> 9.678; B 8.419 -> 8.118) tetapi menaikkan raksasa (12 Okt B: diam >= 25 km 7 -> 12; L: titik terbesar 4.969 -> 5.665) dan butuh perubahan struktur `dbscan()` (flag gambut per titik), jadi tidak direkomendasikan sekarang.

## 6. Seberapa jauh dua satelit menaruh api yang sama

Uji alat ukur untuk lantai eps. Titik NOAA-20 tunggal "terpencil" (tak ada titik NOAA-20 lain dalam 3 km dan +-30 menit; 17-21 Okt 2026) lalu pasangannya NOAA-21 dalam +-90 menit. Kepadatan pasangan per cincin jarak dikurangi latar (kepadatan di 1,5-3 km) memberi jarak pasangan "api yang sama". Bagian kumulatifnya:

| Kelas piksel (px titik NOAA-20) | n titik terpencil | <= 0,6 km | <= 0,9 | <= 1,2 | <= 1,5 | Pasangan > 0,6 km (mentah, dalam 1,5 km) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| nadir (< 0,45) | 2.266 | 82% | 92% | 96% | 99% | 21% |
| tengah (0,45-0,7) | 3.214 | 77% | 89% | 94% | 98% | 28% |
| tepi (>= 0,7) | 193 | 53% | 78% | 91% | 100% | 53% |

Lantai 0,6 km memotong 18-23% pasangan api-sama di nadir dan tengah (adaptif menolong di tepi karena eps >= 1,05 km di sana); 1,0 km menangkap sekitar 90-94%, 1,2 km 94-96%, 1,5 km 98-99%, hanya 3-4% lebih banyak daripada 1,2 km di nadir/tengah. Ini mendukung lantai ~1,0-1,2 km sebagai toleransi pengukuran; tidak mendukung kebutuhan 1,5 km untuk satu api. Keterbatasan: baseline latar dipilih (1,5-3 km), kelas tepi hanya 193 titik, dan pasangan yang diukur adalah pasangan terdekat dalam waktu, bukan bukti identitas api. Konsisten dengan klaim kode (komentar `harian.py:27-29` dan teks teknis `index.html:5366`) bahwa galat lokasi VIIRS puncaknya 1-1,5 km (Indradjad dkk. 2024); rujukan itu tidak saya periksa ulang.

## 7. Efek pada ambang status (`aturan.py`)

Ambang S3 (px24 >= 10) dan Prioritas (px24 >= 15, `PRIOR_PX`) ditetapkan dari uji balik 2019/2023 pada klaster aturan sekarang (docstring `aturan.py`); skripnya tidak ada di repo. Jumlah kompleks teramati (<= 24 j) per ambang, nasional:

| Jendela | Aturan | teramati | px24 >= 10 | px24 >= 15 | px24 >= 50 | px24 >= 100 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 2026-10-21 | A | 4.452 | 255 | 158 | 29 | 8 |
| 2026-10-21 | L1,0/72 | 4.056 | 254 | 158 | 37 | 10 |
| 2026-10-21 | B | 3.600 | 265 | 159 | 40 | 14 |
| 2026-10-12 | A | 4.859 | 298 | 171 | 31 | 13 |
| 2026-10-12 | L1,0/72 | 4.457 | 312 | 180 | 39 | 15 |
| 2026-10-12 | B | 3.861 | 303 | 187 | 44 | 17 |

Himpunan kompleks yang melewati ambang berubah kecil (px24 >= 15: 0% pada 21 Okt, +5% (L) dan +9% (B) pada 12 Okt); yang tumbuh adalah kompleks besar (>= 50 dan >= 100 piksel) karena saling bergabung. Kalibrasi 90-95% tangkapan api besar tidak bisa dibuktikan ulang tanpa skrip aslinya; angka di atas hanya menunjukkan bahwa ambang bergerak kecil. Skor/peringkat (`aturan.skor`) memakai px24 dan FRP 24 jam kompleks sehingga ikut bergeser untuk kompleks yang bergabung.

## 8. Pembanding independen

Pembanding yang saya temukan di repo: Fire Spot (FS) BNPB, hitungan lapangan titik kebakaran yang ditangani: `public/data/bnpb.json` / `data/raw/bnpb/2026-10-12.json` (kolom "Fire Spot", 6 provinsi prioritas; berkaitan dengan 11 Okt karena laporan Jambi 11 Okt menyebut "21 FS" = nilai kolom), `data/laporan-bnpb/presiden-2026-10-20.json` (`fs` 16-18 Okt: 223 / 295 / 263; 6 provinsi prioritas) dan deck BNPB 211026 slide 2 (FS 18-20 Okt: 272 / 269 / 279; Kalteng, Sumsel, Kalsel, Jambi, Kalbar, Kaltim). `operasi_resmi.json` hanya memuat luas dipadamkan (ha), bukan jumlah kejadian. DIBI (`data/raw/bnpb_gis/dibi_*`) agregat tahunan hidromet per kabupaten, tidak berjendela 7 hari. "Fire spot" di deck satelit kita sendiri adalah hitungan klaster kita, bukan pembanding.

**FS 11 Okt, lintas provinsi (Riau, Jambi, Sumsel, Kalbar, Kalteng, Kalsel); kompleks aktif memakai batas atas gambut-kering, juga pada deret di bawah.**

| | Riau | Jambi | Sumsel | Kalbar | Kalteng | Kalsel | Spearman | rasio kompleks/FS (min..maks) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| FS BNPB | 8 | 21 | 66 | 9 | 49 | 16 | | |
| A aktif | 24 | 96 | 931 | 453 | 2.035 | 672 | 0,77 | 3,0 .. 50,3 |
| F1,0/72 aktif | 23 | 73 | 800 | 411 | 1.495 | 572 | 0,77 | 2,9 .. 45,7 |
| B aktif | 21 | 60 | 659 | 371 | 1.082 | 489 | 0,77 | 2,6 .. 41,2 |
| titik 72 j | 13 | 1.309 | 8.317 | 2.742 | 17.383 | 2.427 | 0,71 | |

**Deret total 16-20 Okt (FS 223 / 295 / 263 untuk set 6 prioritas; 272 / 269 / 279 untuk set deck).**

| Metrik | rasio terhadap FS (min..maks) | CV rasio | Pearson |
| --- | ---: | ---: | ---: |
| A: kompleks aktif | 15,4 .. 21,0 | 0,10 | +0,36 |
| F1,0/72: kompleks aktif | 12,2 .. 16,7 | 0,11 | +0,24 |
| B: kompleks aktif | 9,7 .. 13,4 | 0,11 | +0,22 |
| A: aktif dengan jejak >= 5 piksel | 3,6 .. 4,7 | 0,09 | +0,36 |
| titik VIIRS 72 j | 117 .. 207 | 0,21 | -0,88 |
| titik VIIRS hari WIB | 26 .. 66 | 0,36 | +0,20 |

Kesimpulan jujur: **tidak ada pembanding yang valid** untuk jumlah kompleks sebagai "kejadian api". FS adalah hitungan operasional lapangan (lokasi yang ditangani regu), hanya 5-6 provinsi, n kecil (6 provinsi untuk satu hari; 6 nilai deret yang dua di antaranya set provinsi berbeda), dan definisinya tak sama dengan objek satelit. Yang bisa dikatakan: (1) peringkat antarprovinsi identik untuk ketiga aturan (Spearman 0,77; titik mentah 0,71); (2) hitungan kompleks aktif adalah besaran stok yang stabil seperti FS (CV rasio 0,10-0,11) sedangkan titik harian tidak (CV 0,36), jadi kompleks lebih cocok daripada titik sebagai bandingan, tetapi (3) levelnya 10-21 kali FS pada aturan mana pun. B terlihat lebih dekat ke FS (rasio 13 vs 20) hanya karena menggabung lebih banyak; karena jumlah klaster turun mulus dengan eps tanpa dataran, kemiripan level seperti itu bisa dicapai oleh eps berapa pun dan tidak menjadi bukti. Perbedaan Pearson (+0,36 vs +0,22) tidak bermakna pada n = 6.

## 9. Rekomendasi

**Jangan pakai 1,5 km tetap. Ubah ke: tautan waktu 72 jam + lantai eps 1,0 km (adaptif tetap sampai 1,5 km), dengan peringatan raksasa; selebihnya keputusan definisi tampilan.**

Dasar:
1. **Tautan 72 jam = jendela aktif.** Dasar konsistensi, bukan selera: kompleks aktif tidak boleh dikembarkan oleh deteksi baru di tempatnya (bagian 5). Biaya: -5% s.d. -8% jumlah; kompleks raksasa tumbuh pada 12 Okt (30 -> 42 km) karena kompleks-kompleks Kalteng bertaut lewat selang 48-72 jam (perkiraan; puncak titik terbesar 3.202 -> 4.950).
2. **Lantai 1,0 km.** Jarak pasangan api-sama antar satelit (bagian 6) menunjukkan lantai 0,6 km memisahkan 18-23% pasangan yang sama; 1,0 km menangkap ~90-94%. Menurunkan 8-10% lagi di luar efek waktu. Di bawah tebing perkolasi (12 Okt: kompleks terbesar sama dengan aturan 72 jam saja, 4.969 titik).
3. **Bukan 1,25 atau 1,5.** Tebing Kalteng 12 Okt (+59% titik antara 1,0 dan 1,25), diameter 63 km, 7 kompleks >= 25 km di satu hari, hasil yang tidak stabil terhadap eps, dan tidak ada dukungan independen untuk jumlah yang lebih rendah. Jika pemilik tetap ingin 1,5 km, tambahkan batas ukuran (pecah kompleks > 40 km dengan eps menurun 1,25 -> 1,0 -> 0,75); itu belum saya uji.
4. Tautan gambut 168 j (-3%) ditunda: tambahan kompleksitas dan efek raksasa.
5. **Angka tajuk (di luar wilayah saya, untuk pemilik dan `layar-peta`).** Penyebab utama kontras 2.237 vs 528 adalah stok vs aliran. Tampilkan berdampingan "kompleks dengan deteksi hari ini" (Papua Selatan 21 Okt: 253) dengan titik hari ini, dan beri label "kompleks aktif (<= 72 j / 168 j gambut)" untuk 2.275, atau tampilkan hanya kompleks >= 2 deteksi (1.338 di Papua Selatan, 6.569 nasional vs 11.845). Itu mengubah angka lebih besar daripada eps mana pun dan tidak mengubah klaster.

Perkiraan dampak rekomendasi (batas atas, A -> L): nasional 21 Okt 11.845 -> 10.014 (-15%); Papua Selatan 2.275 -> 1.905 (-16%); Kalteng 1.955 -> 1.397 (-29%); Sumsel 1.200 -> 962 (-20%).

## 10. Yang berubah di `scripts/data/harian.py` (belum dikerjakan)

| Baris | Sekarang | Menjadi |
| --- | --- | --- |
| 27-29 | komentar kejadian api "eps adaptif hingga 1,5 km ... aktif <= 72 jam" | tambah: eps adaptif 1,0-1,5 km, tautan 72 jam = jendela aktif |
| 30 | `EPS_KM, MIN_PTS, JENDELA_HARI, AKTIF_JAM, AKTIF_GAMBUT_JAM = 1.5, 1, 7, 72, 168` | tambah `EPS_MIN_KM = 1.0` dan `JAM_TAUT = AKTIF_JAM` (satu sumber; tak boleh dua angka) |
| 125 | `def dbscan(pts, eps=EPS_KM, min_pts=MIN_PTS, jam=48)` | `jam=JAM_TAUT, eps_min=EPS_MIN_KM` |
| 126-128 | docstring "dibatasi 0,6-eps km" | "dibatasi eps_min-eps km; tautan waktu = JAM_TAUT" |
| 143 | `e = min(eps, max(0.6, 1.5 * max(...)))` | `e = min(eps, max(eps_min, 1.5 * max(...)))` |
| 350 | `dbscan(viirs)` | tidak berubah (bawaan baru); boleh eksplisit `jam=JAM_TAUT` |
| ~351 | | peringatan raksasa: bila diameter kompleks terbesar > 60 km (atau titik terbesar > 25% titik provinsi) cetak `::warning::` dengan angkanya; simpan `kompleks_terbesar_km` di meta |
| 548 | `"jam_st": 48` | `"jam_st": JAM_TAUT, "eps_min_km": EPS_MIN_KM`; pecah jadi fungsi `meta_dbscan()` agar bisa diuji |
| 587-606 `uji()` | uji pecah_kluster, kejadian_awal, garis_api, GB | tambah `uji_dbscan()` (bagian 11) |

Di luar wilayah `pipa-data` (laporkan ke pemiliknya): `public/index.html` baris 5329-5372 memakai `d.jam_st || 48` (4 tempat), `e375`/`e800` dengan `.6`, teks rumus "max(0,6; ...)" dan "dibatasi 0,6-" semuanya harus membaca `d.eps_min_km` dan fallback 72 (`layar-peta` -> `selera-angka`, `inp-reviewer` tidak perlu bila hanya teks); `public/bagikan.js:1026-1029` tidak berubah. `.claude/ilmu-agent/pipa-data.md` (baris "Kejadian api: DBSCAN eps 1,5 km...") perlu diperbarui. Jumlah kompleks di `kluster.json`, `wilayah.json`, `meta.json` turun ~15%, id K#### bergeser.

## 11. Uji yang harus ditambah (sesuai `TEST.md`: invarian, penolakan, pesan menyebut angka)

Letak logikanya fungsi murni, jadi lapisannya unit test (murah); lalu satu gerbang kontrak lintas-berkas.

**A. `uji_dbscan()` di `harian.py`** (dijalankan blok "Uji aturan" `data.yml` lewat `harian.py uji`; tidak butuh jaringan):
1. `JAM_TAUT >= AKTIF_JAM` dan `EPS_MIN_KM <= EPS_KM`; pesan: `f"JAM_TAUT {JAM_TAUT} < AKTIF_JAM {AKTIF_JAM}: deteksi baru di kompleks aktif membuka kompleks kembar"`.
2. Batas jarak per ukuran piksel: px 0,375 pada 0,98 km bersatu, 1,02 km terpisah (lantai 1,0); px 0,8 pada 1,18 bersatu dan 1,22 terpisah; px 1,2 pada 1,48 bersatu dan 1,52 terpisah (batas atas). Sisi yang salah ditolak: pasangan terpisah tidak boleh satu label.
3. Batas waktu: selisih tepat `JAM_TAUT` jam bersatu, `JAM_TAUT` jam + 1 menit terpisah.
4. Invarian konsistensi: kompleks yang deteksi terakhirnya 71 jam sebelum T dan titik baru 0,5 km darinya harus satu label (gagal pada aturan lama 48 jam).
5. Partisi = komponen terhubung: 400 titik sintetis berkelompok (`random.Random(7)`) dibandingkan dengan union-find brute force O(n2), untuk tiga konfigurasi; pesan menyebut jumlah kluster kedua pihak.
6. Penghalusan (monoton): partisi (eps_min 0,6 / 48 j) adalah penghalusan partisi (eps_min 1,0 / 72 j): tiap kluster lama termuat utuh di satu kluster baru, jumlah kluster baru <= lama.
7. Urutan masukan tidak berpengaruh: 5 kali acak, himpunan himpunan indeks sama.
8. minPts = 1: titik tunggal tetap kluster sendiri (label >= 0, tidak ada -1).
9. Penolakan jarak/waktu di luar batas: dua rantai berselang 1,6 km tak bersatu; dua titik berselang `JAM_TAUT` jam + 1 menit tak bersatu.
10. Peringatan raksasa: rantai sintetis 1 titik per 1,0 km sepanjang 80 km harus memicu peringatan; kompleks 20 km tidak.

**B. Gerbang kontrak `tests/agen/kompleks-aturan.test.mjs`** (milik `penulis-gerbang`; `npm run uji:agen`): (i) menjalankan `python3 -I scripts/data/harian.py uji` dan gagal bila kode keluar bukan 0; (ii) memuat `meta_dbscan()` dan memastikan setiap kunci yang dibaca `public/index.html` dan `public/bagikan.js` lewat `d.` / `db.` ada (eps_km, eps_min_km, min_pts, jendela_hari, aktif_jam, aktif_gambut_jam, jam_st) dan tak ada literal `|| 48` yang tertinggal di blok kompleks; (iii) pesan gagal menyebut kunci yang hilang.

**C. Invarian pada keluaran yang di-commit** (`kluster.json` + `meta.json`; tanpa potret angka): tiap fitur memenuhi `jam_sejak <= (aktif_gambut_jam jika gambut dan dc > 350 selain itu aktif_jam)`; `meta.dbscan.jam_st >= meta.dbscan.aktif_jam`; jumlah `n` seluruh fitur <= `meta.jumlah_titik`; `jumlah_kluster == len(fitur)`. Pesan menyebut id fitur dan angkanya.

## 12. Keterbatasan

- Tidak ada kebenaran dasar jumlah kebakaran; semua kesimpulan tentang "lebih benar" bergantung pada kriteria yang saya pilih (konsistensi waktu, galat posisi satelit, ukuran kompleks maksimum). Ambang "raksasa" 25 km adalah pilihan saya, bukan standar.
- Aktif untuk jendela di luar 7-21 Okt 2026 adalah batas atas (semua gambut dianggap kering). Jendela 2019 memakai 2 satelit, 2023 memakai 3, 2026 memakai 3; titik per api berbeda.
- Atribusi penyusutan A -> B bergantung urutan penggabungan. Pasangan satelit (bagian 6) memakai baseline yang dipilih.
- Hanya satu pembanding lapangan (FS) dengan n sangat kecil; FS kemungkinan memuat keterlambatan pelaporan.
- Baris eps 2,0-3,0 pada sapuan mentah tidak valid (dipotong px = 1,0); tidak dipakai.
- Rujukan FEDS/Indradjad tidak saya periksa ulang; uji balik penetapan `PRIOR_PX` tidak ada di repo.

## 13. Reproduksi

Kode ada di scratchpad sesi `.../scratchpad/kompleks/` (tidak di-commit): `lib.py` (import `harian`, filter produksi, aturan), `jalan.py <id>` (6 aturan per jendela -> `out/<id>.json`), `sapu.py`, `tambah.py`, `gambut2.py`, `attrib.py`, `px24.py`, `codet.py`, `banding.py`, `verifikasi_dbscan.py`, `ringkas.py` / `tabel_md.py` (tabel). Data unduhan FIRMS di `kompleks/api/` (25 berkas; kuota FIRMS terpakai < 100 transaksi). Bila pemilik ingin backtest ini permanen, `pipa-data` dapat memindahkan `lib.py` + `jalan.py` menjadi `scripts/data/uji_kompleks.py` (stdlib saja, dijalankan manual seperti `firms.py`).
