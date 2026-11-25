# Metode rob

Halaman ini menjelaskan metode rob, pasang astronomis, dan pasang surut.

## 10. Rob (`rob.py`, `pasang_astro.py`, `pasut.py`)

Titik: kecamatan pesisir kabupaten sasaran (pantura Banten sampai Jawa Timur dan kota rob di luar Jawa) dikirim ke Open-Meteo Marine dengan pemilihan sel laut. Titik dirapatkan bila jatuh di sel yang sama, sel lebih dari 30 km dari pusat kecamatan dibuang, jarak antartitik minimal 15 km (`rob.py:37-38`). Saat ini 66 titik.

Rumus:

```
h = maksimum harian sea_level_height_msl (SMOC 0,08 derajat), 3 hari lalu + 10 hari ke depan
ambang titik = persentil 95, 99, dan maksimum dari maksimum harian arsip titik sejak 2022-11-24
Waspada: h >= p95    Siaga: h >= p99    Awas: h >= max(p99 + 0,10 m, maksimum teramati)
gabung = 1 bila h >= p95 dan tinggi gelombang maksimum >= 1,25 m   (penanda, tidak mengubah tingkat)
```

Ambang dihitung dari iklim model sendiri sehingga selisih datum model dan patok lokal saling meniadakan. Arsip mahal kuota (sekitar 125 panggilan per titik), jadi hanya 15 titik baru per hari (`ROB_ARSIP_LOKASI`); `rob/titik.json` dan `rob/ambang.json` dilacak git. Alat ukur IOC dekat titik dipakai untuk selisih model dikurangi alat, korelasi, dan "air sekarang". Peringatan dini rob BMKG dibaca dari PDF (`pdftotext`).

Uji ambang terhadap kejadian "Banjir Rob" DIBI (`rob.json` kunci `validasi`, periode 24 November 2022 sampai 12 Oktober 2026, 26 kejadian diuji, jendela 1 hari): persentil 95 menangkap POD 0,731 dengan PSS 0,671 dan FAR 0,981; persentil 99 POD 0,462. Median persentase kejadian yang tertangkap per titik 98,7 persen dibanding acak 79,4 persen.

Batas: model laut 8 km bisa berada sampai 15 km lepas pantai; penurunan tanah tidak dimodelkan; tanggul, pompa, dan saluran setempat menentukan apakah pasang masuk dan model tidak tahu; sejarah arsip baru sejak November 2022 sehingga "rekor" dan persentil 99 masih berasal dari sejarah pendek.

Indeks gaya pasang astronomis (`pasang_astro.py`, `pasang_astro.json`): bukan tinggi air dan bukan prakiraan rob. Posisi Bulan dari deret presisi rendah (sekitar 0,3 derajat) dan Matahari dari rumus standar presisi rendah. Gaya pembangkit berbanding (1/jarak) pangkat 3, rasio Matahari terhadap Bulan 0,46. Suku semi-harian sebanding cos kuadrat deklinasi, suku harian sebanding sin(2 kali deklinasi), dijumlah sebagai vektor fase sehingga pasang purnama dan perbani muncul sendiri. Indeks dinormalkan terhadap maksimum 2005 sampai 2035. Campuran harian dan semi-harian adalah ASUMSI: pantura Jawa 80 persen harian dan 20 persen semi-harian, titik lain 50 dan 50, karena konstanta harmonik stasiun belum ada.

Prediksi pasang surut BMKG (`pasut.py`, `pasut.json`, `pasut_30h.json`): satu panggilan `hltide` per stasiun. BMKG hanya melayani prediksi 1 Desember 2025 sampai 1 Januari 2027, sehingga jendela dipotong otomatis. Ambang "pasang tinggi" = persentil 90 maksimum harian stasiun itu atas jendela (minimal 120 hari). Status 7 hari: tinggi bila ada hari di atas p90, sedang bila di atas p75, selain itu biasa. Validasi terhadap data per jam UHSLC (8 stasiun, korelasi Spearman 0,76 mentah dan 0,91 sesudah bandpass); tidak ada klaim ketepatan di layar. Rata-rata harian UHSLC tidak bisa memvalidasi puncak pasang (Spearman 0,06).
