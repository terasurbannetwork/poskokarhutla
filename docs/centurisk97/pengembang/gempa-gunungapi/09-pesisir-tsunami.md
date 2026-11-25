# Pesisir dan genangan tsunami

Halaman ini menguraikan metode abrasi, rob, pasang surut, dan rencana genangan tsunami.

## Pesisir: abrasi garis pantai (Landsat)

`scripts/pesisir/abrasi.py`, metode ala DEA Coastlines (Bishop-Taylor dkk. 2021):
1. Transek tegak lurus garis pantai OSM tiap 1 km, 3 km ke darat dan 4 km ke laut, sampel tiap 15 m (`abrasi.py:44-45`); transek tidak pernah diletakkan ulang diam-diam.
2. Landsat 4 sampai 9 Collection 2 Level-2 dari Microsoft Planetary Computer; QA_PIXEL membuang awan; `MNDWI = (hijau - SWIR1) / (hijau + SWIR1)`, interpolasi bilinear.
3. Komposit tahunan = median (minimal 2 pengamatan per sampel); tahun berjalan tidak dipakai.
4. Ambang air dan darat = Otsu atas semua sampel situs-tahun, dijepit ke [-0,25; 0,5]. Ambang 0 gaya DEA salah di pantura karena tambak terbaca laut.
5. Garis pantai = penyeberangan air ke darat pertama dari ujung laut, darat bersambung 60 m atau lebih (`RUN_DARAT = 4`).
6. Laju = kemiringan regresi jarak terhadap tahun dengan selang 95 persen t dilebarkan koreksi AR(1); pencilan lebih dari 3 MAD dibuang sekali. Kelas: "tidak nyata" bila keyakinan rendah (selang memuat nol), "abrasi" bila batas atas selang di bawah nol, "akresi" bila batas bawah di atas nol (`abrasi.py:387-393`). Keyakinan sedang butuh 8 titik atau lebih, tinggi butuh 15 titik atau lebih dan `r2` 0,5 atau lebih; turun satu tingkat bila membuang pencilan membalik arah atau membuatnya nyata.
7. Lompatan lebih dari 300 m antartahun (selisih 2 tahun atau kurang) diberi jenis: bolak-balik (pulih 60 persen atau lebih dalam 2 tahun, `BALIK = 0,4`, salah baca citra, tahun dibuang), searah (bergeser tetap), atau belum pasti. `GANGGUAN` memotong deret di tahun bangunan (tanggul Tol Semarang-Demak, reklamasi Patimban).

Hasil: 167 transek di 5 situs, 1988 sampai 2025. Batas jujur: belum dikoreksi pasang surut, laju tahun-ke-tahun lebih bisa dipegang daripada posisi satu tahun; pada Sayung abrasi gelombang dan penurunan muka tanah tidak terpisahkan; Sayung bukan uji bebas untuk ambang. Uji: `abrasi.py uji` dan `abrasi.py validasi` (banding literatur).

## Pesisir: rob, pasang surut, dan gelombang

- Rob (`scripts/banjir/rob.py`, milik `banjir`, keluaran `public/banjir/data/rob.json`): Open-Meteo Marine (`sea_level_height_msl` per jam dan gelombang maks harian). Level per titik (`rob.py:82`): Waspada bila maksimum harian muka laut mencapai p95, Siaga p99, Awas `max(p99 + 0,10 m, tertinggi teramati 2022 ke atas)`; persentil dari arsip model itu sendiri sehingga bias datum saling hapus. Penanda "gabung": muka laut p95 atau lebih dan gelombang 1,25 m atau lebih (`OMBAK_GABUNG`). Titik tanpa arsip (22 dari 66) bertanda "Tanpa ambang", bukan Normal. Kalibrasi p95 tetap berdasarkan uji DIBI 13 Okt 2026 (26 kejadian, 16 kabupaten, PSS p90 0,73, p95 0,67, p97 0,69, selisih kurang dari satu galat baku). Label kejadian (`scripts/pesisir/rob_label.py`): rekap Pusdalops 2023 sampai 2024, logbook, dan DIBI, 565 kejadian unik di 179 kabupaten (`public/pesisir/data/rob_kejadian.json`); 33,7 persen kejadian jatuh dalam 2 hari dari bulan baru atau purnama lawan 27 persen acak (permutasi, p satu sisi 0,0014, 347 tanggal unik). Berkas itu sendiri menyebut sinyalnya lemah dan ditentukan beberapa episode (Des 2021, Jun 2020), sehingga tidak dijadikan temuan. Uji balik rob menunggu arsip muka laut harian yang tidak ada di mesin lokal.
- Kelas gelombang BMKG Maritim (`public/pesisir/hitung.js`): rendah di bawah 1,25 m, sedang 1,25 sampai 2,5, tinggi 2,5 sampai 4, sangat tinggi 4 sampai 6, ekstrem 6 m atau lebih. Peringatan gelombang BMKG tampil per provinsi dengan kelas tertinggi; "sedang" bukan peringatan.
- Dampak: penduduk seluruh kabupaten bukan area tergenang; zona genangan rob dan bangunan di zona itu tidak ada datanya dan tidak dikarang.

## Genangan tsunami (rencana, belum dibangun)

Paket `data/kajian-bnpb/tsunami-genangan/` (keputusan pemilik 23 Nov 2026: K1 sampai K7). Tujuannya: untuk gempa berpotensi tsunami, tampilkan animasi "T + N menit", zoom ke satu pantai, peta kedalaman genangan darat (0 sampai 8 m, kelas 0,05 m), titik run-up simulasi dan terukur, dan batang run-up historis NOAA NCEI. Rancangan:
- Mesin GeoClaw (K3), dihitung di luar peramban pada mesin lokal pemilik dulu (K5), pustaka skenario terkuantisasi di `public/gempa/data/tsunami_genangan/`; GitHub Actions dan R2 hanya fase 3.
- Sumber awal: deformasi dasar laut Okada (1985) persegi panjang berhingga dengan slip seragam; ukuran dari `Tsunami.ukuran`.
- DEM darat DEMNAS (K4; lembar pesisir diunduh pemilik, GLO-30 cadangan, FABDEM tidak untuk layar publik); batimetri GEBCO atau BATNAS (bawaan sementara).
- Persamaan air dangkal nonlinear basah-kering, gesekan Manning `n = tabel per kelas lahan`, tanpa dispersi dan pasang surut.
- Tiga kotak pertama: Ujung Kulon, Pangandaran sampai Cilacap, Banyuwangi sampai Rajegwesi; skenario megathrust selatan Jawa M 8,0, 8,5, 8,8.
- Uji balik: kelas A (tektonik biasa, ikut vonis) dan kelas B (rupture lambat, longsor, non-gempa; dilaporkan, tidak ikut vonis), dikunci sebelum hitungan; metrik `K = exp(rata-rata ln(H_obs / H_hit))` dan `kappa = exp(simpangan baku ln R)` (Aida 1978), ambang bawaan acuan JSCE 0,95 sampai 1,05 untuk K dan di bawah 1,45 untuk kappa; harus lebih baik dari Abe dengan selang bootstrap per kejadian; `n_min = 8` kejadian uji, di bawahnya tetap hipotesis.
- Label: "hipotesis" sampai uji balik kelas A lulus; "teruji pada n kejadian" hanya untuk kelas sumber dan kotak yang diwakili. Kalimat batas wajib di samping legenda: "Tidak tergenang pada simulasi ini. Tinggi darat dari DEM permukaan, tanpa pasang surut, tanpa dispersi, tanpa longsor. Bukan jaminan." Kedalaman di bawah 0,05 m digabung ke kering.
Status pembangunan: tidak ada satu pun berkas `tsunami_sumber.py`, `tsunami_hitung.py`, `tsunami_runup.py`, `genangan.js` di repo; tiket TS-01 sampai TS-29 belum dimulai kecuali TS-00 (paket dokumen). `scripts/gempa/tsunami_zona.py` bukan bagian paket ini.
