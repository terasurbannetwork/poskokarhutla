# TIKET: Pemetaan bekas longsor dari satelit

Kerjakan urut; ambil satu tiket, kerjakan hanya cakupannya.

| Tiket | Isi | Pengerja | Bukti siap | Bergantung |
| --- | --- | --- | --- | --- |
| LS-01 [SELESAI 26 Nov 2026, jangkar menunggu commit] | Kunci `bekas_kriteria.json`: kejadian kalibrasi dan uji (dipilih mekanis dari DIBI sebelum citra dilihat), ambang, rancangan sampel, pembanding; sidik dan jangkar | longsor (+ validasi-model) | T1 | Q3, Q4 |
| LS-02 | Lembar buta penafsir (dibangun baru): titik sampel dari peta beku, dua penafsir, kappa, penafsir ketiga buta untuk yang tidak sepakat | longsor + pemilik (penafsir) | T3 | LS-01, Q1, Q2 |
| LS-03 [SELESAI 26 Nov 2026, tanpa tarikan citra] | `bekas.py`: komposit, rdNDVI, saringan, poligon, agregat, penjaga sidik | longsor | T2 | LS-01 |
| LS-04 | Lapis tumpang tindih tebangan (Hansen tahun sebelum kejadian, GFW integrated alerts bertanggal) terpisah | longsor | T2 | LS-03, Q7 |
| LS-05 | Uji balik optik: kalibrasi lalu uji sekali; vonis | longsor (+ validasi-model) | T4 | LS-02, LS-03, LS-04 |
| LS-06 | `bekas_radar.py` dan uji balik radar | longsor (+ validasi-model) | T5 | LS-02 |
| LS-07 | Rute baca staf dan lapisan `/siklus`; tanpa angka bila bukan lulus | warga-api + siklus (+ guard-api, security-reviewer, selera-angka, inp-reviewer) | T6, T7, T8, tinjau lokal | LS-05, Q5, Q6 |
| LS-08 | Jalan otomatis per kejadian longsor besar | longsor + mekanik-mesin | T10 | LS-05 lulus, Q8 |

## Status (26 Nov 2026)

**LS-01.** `scripts/longsor/bekas_kriteria.json` (v1) dan `bekas_sidik.json` ditulis SEBELUM data apa pun ditarik. Isi: kejadian uji (Tapanuli Tengah kode 1201 dan kab bersentuhan, 25 Nov 2025; tetangga dihitung mekanis di LS-05), kejadian kalibrasi dipilih mekanis dari DIBI (jendela 7 hari terbanyak, 2019-01-01..2025-06-30, 3 kab: Bogor 2021-02-04 [26], Sukabumi 2021-11-23 [15], Majalengka 2019-04-07 [13]; sidik `kejadian.json` terkunci), ambang lulus ALGORITMA 4 (F1 >= 0,6, presisi >= 0,7, selisih F1 >= 0,10 atas pembanding terkuat global dan di dua strata lereng, CI90 > 0, plasebo <= 10 persen), kappa >= 0,6, titik >= 600 uji dan >= 300 kalibrasi, >= 100 per strata, bootstrap 2.000 benih 20251125, larangan. Tidak dikarang: ambang radar belum ada angkanya di ALGORITMA, jadi tertulis "menunggu" di kriteria. Catatan jujur tertulis: kalibrasi mekanis condong ke Jawa Barat (padat, berkebun), kurang mewakili lereng hutan Tapanuli; bila titik bekas kalibrasi < 30 Q3 dibuka kembali ke pemilik. **Sisa untuk menutup kunci:** commit kedua berkas, lalu isi `jangkar_commit` di `bekas_sidik.json` dengan hash commit itu (sesi induk), baru `bekas.py prasyarat` rc 0. Rancangan sampel (daya CI presisi) dihitung di LS-02/LS-05 dari strata nyata. Bukti: `python3 -I scripts/longsor/bekas.py cek` rc 0.

**LS-03.** `scripts/longsor/bekas.py`: periksa_kunci/kunci, NDVI, rdNDVI, MNDWI, komposit median ber-SCL (min 2 pengamatan), klasifikasi (lereng, NDVI awal, air, sungai; tebangan dipisah ke kelas 2), gugus 8-tetangga >= 3 piksel, agregat per kecamatan (null bila bukan lulus atau terliput < 50 persen). Swa-uji `bekas.py uji` hijau dengan data sintetis: petak longsor terdeteksi, tebangan tersaring terpisah, piksel tunggal tak jadi poligon, awan jadi NaN lalu null (bukan 0), bukan-lulus null. Belum ada: pembaca COG/STAC dan vektorisasi poligon ke GeoJSON (butuh tarikan; subperintah `kab`, tidak dibuat sebelum rencana disetujui). Pembaca TIFF `tiff_mini.py` dipakai ulang lewat `lereng_dem.py` untuk lereng.

## Rencana tarikan (MENUNGGU persetujuan; belum ada citra yang ditarik)

Sumber (anonim, tanpa kunci): Earth Search STAC `sentinel-2-l2a` (COG B03, B04, B08, B11, SCL), Planetary Computer `cop-dem-glo-30` (lereng), Hansen GFC v1.13 lewat Range (`bukti_das.py`), GFW integrated alerts, sungai OSM dari data repo bila ada.

| Kejadian | Sebelum | Sesudah (hari 3-90) | Ubin S2 |
| --- | --- | --- | --- |
| Uji: Tapanuli Tengah + tetangga, 2025-11-25 | 2024-11-25..2025-11-24 | 2025-11-28..2026-02-23 | sekitar 2 (47NQ.., 47NR..: dipastikan lewat pencarian STAC) |
| Kalibrasi Bogor 2021-02-04 | 2020-02-04..2021-02-03 | 2021-02-07..2021-05-05 | 1-2 |
| Kalibrasi Sukabumi 2021-11-23 | 2020-11-23..2021-11-22 | 2021-11-26..2022-02-21 | 1-2 |
| Kalibrasi Majalengka 2019-04-07 | 2018-04-07..2019-04-06 | 2019-04-10..2019-07-05 | 1 |

Cara hemat disk (Mac tinggal ~9 GiB, CPU dipakai tsunami): baca per jendela COG 1.024 x 1.024 piksel langsung dari HTTP, hitung median per ubin, buang; tidak ada unduhan adegan utuh; yang disimpan hanya grid rdNDVI uint8 per kab (sekitar 20 MB per kab) di `data/raw/longsor/bekas/` (gitignored) dan DEM GLO-30 (sekitar 25 MB per ubin 1 x 1 derajat, 2-4 ubin per kab). Memori puncak sekitar 2 GB (satu ubin). Perkiraan lalu lintas jaringan (HIPOTESIS, belum diukur): per kab 2.000 km2 sekitar 20 juta piksel, 20 adegan terbaik (<= 12 sebelum, <= 8 sesudah) x 3 pita 10 m + SCL + B11 sekitar 100-150 MB per adegan = 2-3 GB per kab; total 4 kejadian (uji 3-5 kab) sekitar 20-30 GB transfer, disk < 1 GB, CPU Python murni lambat (perkiraan 1-3 jam per kab) sehingga numpy di venv sementara (pola `s1_genangan.py`) disarankan untuk tarikan nyata. Kecamatan: `public/geo/kecamatan/<prov>.json`. Persetujuan dibutuhkan: kejadian, ukuran, dan numpy venv.
