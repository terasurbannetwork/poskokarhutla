# Kompleks api, keparahan, firespot, FWI

Halaman ini menjelaskan pengelompokan titik menjadi kompleks, aturan status taktis, klasifikasi firespot, dan indeks cuaca kebakaran.

## 5. Kompleks api (ST-DBSCAN)

Metode meniru pelacakan kejadian FEDS (`scripts/data/harian.py:30`):

```
titik: VIIRS 3 satelit, keyakinan nominal dan tinggi
tetangga: jarak <= eps_ij  DAN  selisih waktu <= 48 jam
eps_ij  = 1,5 x ukuran piksel terbesar kedua titik, dibatasi 0,6 sampai 1,5 km
minPts  = 1  (titik tunggal tetap kompleks)
jendela = 7 hari
aktif   = terdeteksi <= 72 jam; gambut kering 168 jam
(EPS_KM, MIN_PTS, JENDELA_HARI, AKTIF_JAM, AKTIF_GAMBUT_JAM = 1,5; 1; 7; 72; 168)
```

Garis luar kompleks dibuat organik (`garis_api.py`), bukan lambung cembung. Satuan "kompleks aktif" adalah stok 72 atau 168 jam, sedangkan "titik" adalah aliran satu hari. Uji sensitivitas terdokumentasi di `docs/audit-metode/2026-10-21/UJI-KOMPLEKS.md`: tebing perkolasi Kalimantan Tengah 12 Oktober pada eps 1,0 sampai 1,25 menambah 59 persen; tautan 48 jam terhadap aktif 72 jam mengembarkan 14 sampai 23 persen.

## 6. Keparahan, status taktis, dan prioritas pemadaman

Semua di `scripts/data/aturan.py`. Cuaca hanya boleh MENAIKKAN status.

```
Kelas FWI BMKG   : FWI <2 -> 0 ; <7 -> 1 ; <14 -> 2 ; selebihnya 3

Keparahan S3     : px24 >= 10, atau (bertahan >= 4 hari dan px24 >= 5)
Keparahan S1     : n < 3 dan hari aktif <= 1
Selain itu       : S2

Status dasar (0-2): tanpa cuaca : S1,S2 -> 1 ; S3 -> 2
                    FWI kelas <=1: S1 -> 0 ; selain itu 1
                    FWI kelas 2  : S1 -> 1 ; selain itu 2
                    FWI kelas 3  : S>=2 -> 2 ; S1 -> 1
                    S3 tidak pernah di bawah 2
Prioritas (level 3): px24 >= PRIOR_PX (15) DAN (FWI >= 7 atau FWI tak ada)
```

![Tangga status taktis dari 0 sampai 3 beserta syarat naik tiap anak tangga; sumber aturan scripts/data/aturan.py.](gambar/pipeline-karhutla-tangga-status.svg)

`px24` adalah jumlah piksel unik front aktif 24 jam. Ambang 15 dipilih karena pipeline memakai tiga satelit VIIRS (ambang 10 untuk S-NPP saja); `2 x AMBANG_MEDIUM_PX <= PRIOR_PX` dijaga assert di `harian.py uji`. FFMC di atas 82 tidak boleh menaikkan kelas, karena terlampaui hampir tiap hari kemarau dan meruntuhkan matriks (dibuang 12 Oktober 2026). Skor peringkat (`aturan.skor`, bahaya dikali (1 + celah respons), celah dibatasi 2 kali) hanya MENGURUTKAN prioritas, tidak membatasi jumlahnya; uraian per komponen (`alasan_skor`) berstatus HIPOTESIS karena bobot belum diuji terhadap label eskalasi.

Status uji balik: uji Agustus sampai Oktober 2019 dan 2023 (S-NPP) memberi bahwa ambang px24 >= 10 dengan FWI >= 7 menangkap 90 sampai 95 persen api yang akhirnya besar (>= 100 piksel) sebelum mencapai separuh ukurannya, dengan presisi 35 sampai 53 persen dan porsi 0,8 sampai 1,9 persen kompleks-hari. Versi peringkat berkuota hanya menangkap 60 sampai 76 persen dan ditinggalkan. Ambang tugas otomatis untuk Worker (permukiman 5 km, tumbuh >= 3 titik dan >= 1,5 kali, `harian.py:72`) HIPOTESIS dan belum diuji balik terhadap kejadian nyata.

## 7. Klasifikasi firespot

Meniru paparan Kemenhut SIPANTAU KARHUTLA (22 Oktober 2026) dengan perbedaan yang disengaja (`harian.py:57`, `harian.py:86`):

```
kelas harian cluster = H bila ada >= 1 titik keyakinan tinggi
                       ATAU >= AMBANG_MEDIUM_PX (4) piksel unik nominal
                     = M selain itu
pola dari tiga hari (hari acuan Hd, Hd-1, Hd-2); firespot "ya" bila pola
di {HH, H, MH, MMM}; selain itu "mungkin"
"mungkin" membatasi level cluster paling tinggi 1
```

Yang dihitung adalah piksel unik, bukan titik, supaya satu api yang dilihat tiga satelit tidak terhitung tiga kali. Persistensi memakai keanggotaan kompleks yang sama, bukan radius 375 m, karena posisi VIIRS bergeser sekitar 375 m antar lintasan.

Uji balik (`ujibalik_firespot.py`, `public/data/ujibalik_firespot.json`; arsip VIIRS 2019 dan 2023, Agustus sampai Oktober, api besar >= 100 piksel): pada hari pertama sev >= 2, status "mungkin" muncul 19,7 persen (2019) dan 26,5 persen (2023) untuk S-NPP saja, 25,1 persen dan 18,3 persen untuk tiga satelit; api besar tidak pernah tertinggal tanpa status "ya" (0 kasus); level 3 tidak pernah tertunda. Batasan: hanya api besar, satu snapshot per hari, tanpa cuaca. Ada bias siang-malam: porsi titik keyakinan tinggi di api besar siang 9,9 sampai 12,6 persen, malam 1,4 sampai 3,0 persen, sehingga api malam lolos "H" hampir hanya lewat jalur piksel unik. Ambang 3 menurunkan tunda tetapi menambah cluster "ya" 38 sampai 44 persen, jadi ambang 4 dipertahankan.

## 8. Indeks cuaca kebakaran (FWI)

`scripts/data/fwi.py`: Canadian FWI (Van Wagner 1987) dengan faktor panjang hari khatulistiwa. `fwi_state.json` menyimpan FFMC, DMC, dan DC per sel 0,5 derajat pada H-2 dan dilanjutkan tiap hari. Sel baru dipanaskan dari arsip ERA5 300 hari (25 sel per panggilan); sisanya prakiraan Open-Meteo `past_days` 8. Kelas FWI memakai ambang BMKG di atas. Kelas DC BMKG (`aturan.kelas_dc`): <= 140 basah, <= 260 lembap, <= 350 kering, di atas 350 sangat kering. Persentil FWI per provinsi tidak lebih baik daripada kelas absolut (J 0,591 lawan 0,592), jadi tidak dipakai.

Status uji: LULUS. `python3 scripts/data/fwi.py` membandingkan rantai 48 hari dengan paket cffdrs (DMC dan DC selisih kurang dari 0,006) dan FFMC per jam dengan fixture 1.730 baris (selisih kurang dari 0,005). Jangan mengubah rumus tanpa swa-uji ini.

Kuota Open-Meteo sekitar 10.000 per hari dibagi: ansambel per kotak 1 derajat, cuaca jam 3,3 per sel (sampai 400 sel), asap 799 per hari.
