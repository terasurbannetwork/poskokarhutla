# Cluster atau kompleks api

Halaman ini menguraikan pembentukan cluster, keparahan, status, skor urutan, dan metode firespot.

## Cluster atau kompleks api

![Dari titik ke insiden: titik mentah dijadikan lokasi unik per hari, digabung menjadi cluster, lalu cluster tingkat 2 ke atas diberi identitas insiden yang stabil. Angka jarak dan waktu dari scripts/data/harian.py dan scripts/data/insiden.py.](gambar/peta-karhutla-titik-ke-insiden.svg)

Dibangun di `scripts/data/harian.py` (ST-DBSCAN, `harian.py:36` dan `harian.py:284`):

- Titik masukan: VIIRS tiga satelit, keyakinan nominal dan tinggi (cluster sengaja lebih ketat daripada angka utama).
- Jarak sambung: eps adaptif 0,6 sampai 1,5 km (sekitar 1,5 kali ukuran piksel), selisih waktu paling lama 48 jam, `minPts = 1` sehingga titik tunggal tetap menjadi satu cluster. Jendela 7 hari.
- Aktif bila terdeteksi dalam 72 jam terakhir; di gambut kering 168 jam, karena bara bawah permukaan bisa luput dari satelit.
- Luas indikatif: luas piksel (VIIRS 14,0625 ha per piksel). Satu piksel bisa hanya terbakar sebagian, jadi layar menampilkan rentang, bukan angka tunggal. Gunung api yang pernah meletus sejak 2000 diberi radius 3 km; titik di dalamnya tidak dianggap karhutla (`aturan.py`, `RADIUS_GUNUNG_API`).

**Keparahan** (`scripts/data/aturan.py:75`):

```
S3 bila piksel aktif 24 jam (px24) >= 10, atau menyala >= 4 hari dengan px24 >= 5
S1 bila deteksi < 3 dan hari aktif <= 1
selain itu S2
```

**Cuaca**: kelas FWI BMKG apa adanya (0 sampai 1 rendah, 2 sampai 6 sedang, 7 sampai 13 tinggi, 14 ke atas sangat tinggi). FFMC, ISI, dan DC ditampilkan terpisah, tidak menaikkan kelas. DC: 0 sampai 140 basah, 141 sampai 260 lembap, 261 sampai 350 kering, di atas 350 sangat kering.

**Status dasar 0 sampai 2** (`scripts/data/aturan.py:86` sampai `96`): fungsi `status()` menerima kelas FWI 0 sampai 3 dari `kelas_fwi()` (FWI di bawah 2 kelas 0, 2 sampai 6 kelas 1, 7 sampai 13 kelas 2, 14 ke atas kelas 3; `aturan.py:57`). Bila cuaca tidak tersedia, status berasal dari keparahan saja (S1 dan S2 menjadi 1, S3 menjadi 2). Bila FWI di bawah 7 (kelas 0 dan 1), S1 menjadi 0 dan S2 serta S3 menjadi 1. Bila FWI 7 sampai 13 (kelas 2), S1 menjadi 1 dan S2 serta S3 menjadi 2. Bila FWI 14 ke atas (kelas 3), hasilnya sama dengan kelas 2. Cuaca hanya boleh menaikkan: api besar S3 selalu minimal tingkat 2 (`max(dasar, 2 if s == 3 else 0)`).

**Tingkat 3, Prioritas pemadaman** (`aturan.py:99`): px24 sedikitnya 15 (`PRIOR_PX = 15`, dinaikkan dari 10 karena pipeline memakai tiga satelit VIIRS) dan FWI sedikitnya 7, atau FWI tidak tersedia. Uji balik Agustus sampai Oktober 2019 dan 2023 (S-NPP, sembilan provinsi): ambang front 10 piksel dan FWI 7 menandai 90 persen (2019) dan 95 persen (2023) api yang akhirnya sedikitnya 100 piksel sebelum mencapai separuh ukurannya, dengan presisi 53 dan 35 persen. Ambang 15 untuk tiga satelit perlu diuji ulang dengan data NOAA-20 (dicatat di tab Metode).

![Empat tingkat status cluster dari Pencegahan rutin sampai Prioritas pemadaman, ditentukan oleh keparahan api dan kelas FWI. Sumber: scripts/data/aturan.py.](gambar/peta-karhutla-tangga-status.svg)

**Skor urutan** (`aturan.py:104`):

```
bahaya = max(px24, 1) x (1 + ln(1 + FRP24) / 5) x (1 + min(hari_aktif, 5) / 5)
bahaya = bahaya x (1 + min(ISI, 20) / 20 + 0,5 bila DC > 350)
celah  = min(jarak_Daops_km / 150, 1)
skor   = bahaya x (1 + celah)
```

Skor mengurutkan prioritas, bukan membatasi jumlahnya, lalu dikalikan (1 + risiko/100) paling banyak dua kali memakai indeks risiko kecamatan. Bobot ini belum diuji terhadap label eskalasi dan padam, jadi kartu "Alasan peringkat" berpil hipotesis. Untuk tugas api otomatis di Worker, ambang 3 titik, 1,5 kali, dan jarak 5 km adalah asumsi platform yang belum diuji balik (`scripts/data/harian.py`, `SYARAT`).

**Firespot ala Kemenhut** (`harian.py:59`, `harian.py:84` sampai `98`, dan `harian.py:100` sampai `104`): tiap hari dalam tiga hari (hari acuan, kemarin, lusa) diberi kelas H bila sedikitnya satu titik keyakinan tinggi atau `AMBANG_MEDIUM_PX = 4` piksel nominal unik; selain itu M. Pola yang dihasilkan HH, H (hanya hari acuan H), MH (kemarin H), MMM (kemarin dan lusa M), MM, atau M. Label "ya" bila pola termasuk `POLA_YA = {HH, H, MH, MMM}`; selain itu "mungkin". Gerbang `gerbang_firespot()`: cluster berlabel "mungkin" yang teramati dalam 24 jam dan berstatus di atas tingkat 1 diturunkan ke tingkat 1 (`turun: true`), sehingga tingkat 2 dan 3 untuk cluster yang teramati hanya berlaku bagi yang berlabel "ya". Berbeda dari Kemenhut, yang dihitung piksel unik, bukan titik, dan persistensi memakai keanggotaan cluster, bukan radius 375 m. Uji balik di `ujibalik_firespot.json` dan `ujibanding_firespot.json`; aturan produksi dipertahankan.
