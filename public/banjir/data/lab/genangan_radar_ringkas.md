# Lab genangan radar S1 (kriteria 8491b967865b80a6)

Kejadian berlabel 31, dengan adegan S1 0-2 hari WIB 8, terbaca 8, dinilai 3, lolos 0. Keseluruhan lolos: False.

CSI median (ambang 2% sel): otsu_masker 0.0, tetap_masker 0.0, naif 0.0, semua_positif 0.341; AUC median otsu_masker 0.524.

| Kejadian | Adegan | CSI otsu+masker | naif | semua positif | Putusan |
|---|---|---|---|---|---|
| 2017-02-21 | 2017-02-22 | 0.143 | 0.0 | 0.341 | gagal |
| 2017-04-11 | 2017-04-11 | 0.0 | 0.0 | 0.439 | gagal |
| 2018-02-15 | 2018-02-17 | - | - | - | tak_dapat_dinilai |
| 2020-01-02 | 2020-01-02 | 0.0 | 0.0 | 0.293 | gagal |
| 2020-02-08 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2020-02-11 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2020-02-16 | 2020-02-15 | - | - | - | tak_dapat_dinilai |
| 2020-02-25 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2021-02-20 | 2021-02-21 | - | - | - | tak_dapat_dinilai |
| 2022-04-26 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2023-05-07 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2023-12-27 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2024-01-18 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2024-02-03 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2024-02-24 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2024-04-07 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2024-04-19 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2024-04-26 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2024-05-02 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2024-05-22 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2024-05-31 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2024-07-29 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2024-08-07 | 2024-08-08 | - | - | - | tak_dapat_dinilai |
| 2024-08-14 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2024-10-10 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2024-10-16 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2024-11-13 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2024-11-18 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2024-12-20 | - | - | - | - | tanpa_adegan_0_2_hari |
| 2025-04-17 | 2025-04-17 | - | - | - | tak_dapat_dinilai |
| 2025-04-20 | - | - | - | - | tanpa_adegan_0_2_hari |

Keterbatasan: revisit S1 6-12 hari (S1A saja sebelum 2024): genangan kota sering sudah surut saat satelit lewat; bangunan menutupi air (double bounce) dan jalan sempit < piksel 80 m: genangan kota padat tidak menggelapkan radar; label = laporan warga (bias pelapor, jam laporan tak sama dengan jam lintasan), bukan luas genangan; kecamatan ber-label hanya tanda 'ada laporan', bukan tinggi/luas; false alarm bisa genangan nyata yang tak dilaporkan; model hujan M1 tidak tersedia sebagai pembanding.
