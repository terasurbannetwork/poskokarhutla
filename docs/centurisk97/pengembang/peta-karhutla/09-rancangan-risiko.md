# Desa Waspada, alat gambar, risiko

Halaman ini mencatat dua rancangan yang belum dibangun serta metode indeks risiko dan model lain di peta.

## Desa Waspada (rancangan, belum dibangun)

Definisi di `data/kajian-bnpb/desa-waspada/ALGORITMA.md`:

- Titik daftar: VIIRS (N, N20, N21), keyakinan sedikitnya nominal, `jam >= -168` dari `hotspot.json`, satu titik per petak 375 m per hari WIB. Ini bukan angka utama dan tidak dijumlah dengan angka utama atau MODIS.
- Titik ke desa: titik-dalam-poligon di `public/geo/desa/<kode kab>.json` (batas disederhanakan, bukan SK batas desa). Titik tanpa desa dicatat di `tanpa_desa`, tidak dibuang diam-diam.
- Daftar A: `titik_7h >= 1`. Daftar B: `titik_7h == 0` dan tahun terbakar sedikitnya 3 dari 2012 sampai 2025, dengan tahun terbakar = jumlah tahun terbanyak pada satu petak desa dari `riwayat_petak.bin`. Potongan: 2.000 baris daftar A dan 300 baris daftar B per provinsi (bawaan sementara Q5). Berkas `public/data/desa_waspada.json` paling besar 450 KB.
- Peluang tiga hari: peluang kabupaten/kota dari `prediksi.json` (`API.p`), bukan peluang desa. Bernilai `null` bila berkas prediksi lebih tua dari 36 jam.
- Porsi gambut: pecahan titik uji (kisi 0,002 derajat, paling banyak 200 per desa) di dalam `gambut.geojson`, dihitung bulanan; berpil perkiraan.
- Laju hindcast: ukur sendiri dari desa-minggu musim kering 2023 (Juli sampai Oktober) dengan riwayat 2012 sampai 2022, dibekukan di `scripts/data/desa_waspada_laju.json`, selang Wilson 95 persen. Kriteria bawaan sementara (Q2): laju A sedikitnya 3 kali laju "semua lainnya", laju B sedikitnya 2 kali, tiap kelompok sedikitnya 200 desa-minggu, dan batas bawah Wilson di atas laju "semua lainnya". Angka 3, 2, dan 200 adalah tebakan perancang. Lulus atas ambang itu ditulis `lulus_sementara` dan tidak melepas pil hipotesis sampai pemilik menjawab Q2. Sebelum berkas laju terisi, layar menulis "laju belum terukur". Angka 39 persen dan 11,6 persen milik situs pembanding tidak pernah tampil sebagai angka kita.

Status uji balik: belum diuji. Tidak ada kode.

## Alat gambar wilayah (rancangan, belum dibangun)

Definisi di `data/kajian-bnpb/alat-gambar/ALGORITMA.md`:

- Luas geodesik pada bola dengan jari-jari 6371,0088 km, dinamai "luas wilayah digambar" dan tidak pernah disebut luas terbakar. Buffer lingkaran 72 simpul atau kapsul dari garis, 1 sampai 50 km.
- Titik panas = lokasi unik per hari seperti angka utama (bagian 1), dari `hotspot24.json`, `hotspot72.json`, dan `hotspot.json`. Siang atau malam dari jam WIB (malam 18.00 sampai 06.00 WIB), tanpa tafsir "malam berarti gambut".
- Sel berdeteksi: petak 0,0034 derajat yang punya deteksi dalam periode; jejak sel = sel x 14,0625 ha, bukan luas terbakar.
- Luas citra insiden hanya ditampilkan per insiden bila ada, tanpa dijumlah dan tanpa hitung ulang.
- Desa beririsan dari poligon desa, paling banyak 12 kabupaten (`MAKS_KAB`) dan 200 simpul (`MAKS_SIMPUL`). Penduduk hanya "kecamatan yang beririsan", berpil perkiraan kasar.

Hasil 0 titik ditulis "0 titik dalam data periode ini (satelit punya jeda dan awan menutup)". Status uji balik: tidak berlaku (alat hitung geometri, bukan model); uji unit dirancang tetapi belum ada.

## Indeks risiko historis, musim, dan peluang api besar

- **Indeks risiko historis kecamatan** (0 sampai 100, `skorRiwayat` di `public/index.html:3732` sampai `3744`, `AMBANG_TAHUN` di baris 3735, komentar rumus di baris 3823 sampai 3826): 50 persen kekerapan (tahun dengan sedikitnya 10 titik dibagi jumlah tahun), 30 persen besaran (ln(1 + total titik) dibagi nilai terbesar), 20 persen tren (rata-rata 2023 sampai 2026 dibanding tahun sebelumnya). Kelas menurut posisi relatif: 10 persen teratas sangat tinggi, 10 sampai 30 persen tinggi, 30 sampai 60 persen sedang, sisanya rendah. Ambang terbakar per tahun: kecamatan 10, kabupaten 100, provinsi 500 titik (`AMBANG_TAHUN`, `public/index.html:3735`). Dasar arsip: MODIS 2002 sampai 2025 untuk mode Riwayat dan Tren, dan VIIRS S-NPP 2015 sampai sekarang untuk skor prioritas cluster.
- **Periode berbahaya**: ambang api besar provinsi = persentil 90 dari semua hitungan dasarian (36 dasarian x 24 tahun) provinsi itu, minimal 1; peluang dasarian = porsi tahun yang hitungannya sedikitnya ambang, dipisah El Nino, tahun biasa, dan semua (`scripts/data/musim.py`, `public/index.html:6111`). Provinsi siaga bila peluang sedikitnya 30 persen.
- **Indeks risiko lokasi** di laci: "Tren lokasi dan prakiraan" membaca arsip VIIRS 2012 sampai 2026 per ubin sel 0,05 derajat, jendela sekitar 16 km, tahun El Nino yang dipakai: 2004, 2006, 2009, 2015, 2019, 2023. Prakiraannya adalah pola masa lalu, bukan model fisika (`public/riwayat_sel.js:1`).

## Model lain yang tampil di peta (HIPOTESIS)

Simulasi penjalaran api (GBDT Monte Carlo dan simulasi fisika berbasis sistem FBP Kanada), estimasi gambut terbakar, kekeringan, dan prospek musim berlabel prakiraan model atau hipotesis dan tidak dibahas rinci di sini. Simulasi fisika belum divalidasi untuk kondisi Indonesia. Kinerja model statistik dicatat di `model_sebaran.json` dan `prospektif.json` (`docs/cara-kerja.md` bagian 4a). Estimasi gambut terbakar memakai luas x kedalaman x kerapatan x faktor emisi IPCC 2013 dengan skenario rendah sampai tinggi; kedalaman bakar literatur belum divalidasi lapangan, dan modul uji InSAR lab (`data/kajian-bnpb/insar-gambut/`) belum menghasilkan vonis.
