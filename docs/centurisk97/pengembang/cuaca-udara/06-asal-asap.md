# Atribusi, telusur, lintasan, tutupan

Halaman ini menjelaskan atribusi sumber PM2,5, telusur asal asap, lintasan asap 72 jam, dan tutupan asap kabupaten.

## M5. Atribusi sumber PM2,5 (api, PLTU, latar)

- **Model** (`scripts/udara/atribusi.py:1-15`): plume Gauss tunak per jam per sumber, garis lurus searah angin transport (rata-rata 10 m dan 925 hPa), sebaran Briggs (1973) pedesaan, kelas Pasquill dari kecepatan angin dan siang atau malam, tinggi campuran dari model dengan lantai 300 m, jarak maksimum 600 km; tanpa waktu tempuh, pengendapan, dan kimia sekunder.
- **Hari**: atribusi utama untuk besok; model dibandingkan dengan rata-rata CAMS pada jam yang sama.
- **Bagian**: `persen = model_i / maks(CAMS, total model)`; latar adalah sisa CAMS di atas total model (minimal 0). Kota dengan total model lebih dari 1,5 kali CAMS ditandai `terpercaya = false` dan tidak diberi persen per sumber.
- **Rentang**: minimum dan maksimum dari 27 varian sebaran x 27 varian emisi x 2 normalisasi = 1.458 kombinasi. Emisi dari daya radiasi api 24 jam (FRP) dengan faktor 0,368 kg/MJ dan faktor emisi gambut 17,3 atau hutan 9,1 g/kg.
- **Uji balik**: `uji_atribusi.json` membandingkan model dengan AOD MODIS (NASA GIBS) pada kotak 0,25 derajat; status model tertulis di berkas dan di kartu Metode. Konversi gambut 3,5 kg/MJ belum diverifikasi ke tabel GFAS.
- **Status**: HIPOTESIS. Persen dibaca sebagai bobot relatif, dibulatkan, dan tidak pernah menunjuk pihak yang bertanggung jawab.

## M6. Telusur asal asap (lintasan mundur)

`scripts/udara/asal.py` menelusur parsel mundur dari tiap kota memakai mesin `lintasan.py` yang sama (Heun 1 jam, tiga lapis angin) dengan arah dibalik. Lima waktu tiba (jam ke 24, 36, 48, 60, 72) x tiga lapis = 15 jalur per kota, maksimal 72 jam mundur karena `angin.json` hanya memuat angin ke depan. Bobot titik jalur dalam 25 km dari kompleks api aktif: `(1 - d/25) x emisi / maks(jarak, 25 km)`. Pencucian hujan tidak dipakai karena tidak ada koefisien bersumber. Kota dibuang (bukan 0%) bila kurang dari 2 dari 5 waktu tiba melewati api atau PM2,5 prakiraannya di bawah 30 µg/m³. Hasil adalah bobot relatif, bukan konsentrasi.

## M8. Lintasan asap 72 jam dan asap lintas batas

- **Lintasan** (`scripts/udara/lintasan.py:1-14`): parsel dari kompleks api aktif (titik terakhir paling lama 72 jam, maksimal 60 kompleks) bergerak per jam dengan skema Heun, angin diinterpolasi bilinear ruang dan linier waktu dari kisi 1 derajat `angin.json` pada tiga lapis (10 m, 925, 850 hPa). Kota dilewati bila pusatnya paling jauh 25 km dari titik jalur (`R_KOTA = 25`). Poligon negara tetangga berupa kotak kasar, bukan batas resmi.
- **Asap lintas negara** (`scripts/udara/lintas_negara.py`): memakai mesin atribusi untuk kota di Singapura, Malaysia, Brunei, dengan sumber digabung per provinsi asal dan api Malaysia dan Brunei dari FIRMS NRT VIIRS NOAA-20 dan NOAA-21. Bagian per asal tampil hanya bila model menjelaskan 20% atau lebih dari kelebihan PM2,5 (CAMS dikurangi latar 15 µg/m³, lantai 1), rata-rata asap model 10 µg/m³ atau lebih, dan model tidak melebihi 1,5 kali CAMS; selain itu ditulis "belum dapat ditentukan", bukan 0%. Persen dibulatkan ke 10 dan di bawah 10 ditulis "di bawah 10%". Status HIPOTESIS. Stasiun pemerintah negara tetangga tidak dipakai karena izin belum ada.

## M9. Tutupan asap kabupaten, musim asap, dan hari tinggi

- **Tutupan asap** (`asap_kab.py`): persen wilayah kabupaten = porsi titik contoh (jarak 0,05 derajat di dalam poligon) yang selnya PM2,5 rata-rata di atas 55,4; tertutup bila persen 50 atau lebih; kelas 50 sampai 70, 70 sampai 90, di atas 90. Bila titik bernilai kurang dari 50% dari semua titik kabupaten, persen kosong (bukan 0). Ambang 55,4 adalah batas kesehatan yang dipilih sebagai definisi liputan; HIPOTESIS, belum diuji ke citra satelit.
- **Kalender musim asap dan ENSO** (`musim_asap.py`): titik panas nasional per bulan (median dan kisaran tahun penuh), jumlah titik panas dari 1 Januari sampai tanggal data terakhir tiap tahun, fase ENSO dari rata-rata ONI NOAA CPC (di atas +0,5 El Nino, di bawah -0,5 La Nina), PM2,5 CAMS bulanan hanya untuk bulan dengan 10 hari atau lebih. Titik panas adalah penanda musim bakar, bukan ukuran asap.
- **Hari tinggi** (`riwayat.py`): jumlah hari PM2,5 rata-rata 24 jam di atas 55 µg/m³ per kota per tahun dari arsip stasiun OpenAQ multitahun; tidak menulis apa pun bila arsip itu tidak ada.
