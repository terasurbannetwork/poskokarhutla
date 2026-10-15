# PFVI (peatfr) vs FWI: uji balik di sel gambut (15 Okt 2026)

**Status: riset, BELUM di situs.** Menunggu pemilik melihat angka ini dulu.

Kode: `scripts/data/pfvi.py` (port + self-check), `scripts/sebaran/pfvi_balik.py` (unduh, kalibrasi, uji).
Data antara ada di `data/raw/pfvi/` (tidak di-commit): `balik.json`, `zenodo.json`, `api.json`, `cuaca/`.

## Ringkas

1. **PFVI sendiri tidak lebih baik dari FWI.** Untuk api besok AUC-nya 0,767 vs 0,783 (lebih buruk, selang −0,032 s.d.
   −0,003). Untuk hari dengan api besar (≥ 20 titik) 0,811 vs 0,809, alias seri.
2. **FWI + PFVI lebih baik dari FWI saja, kecil tapi nyata.** AUC naik +0,018 untuk api besok (selang 95% +0,013 s.d.
   +0,023) dan +0,026 untuk hari api besar (+0,017 s.d. +0,035). Dengan jumlah alarm yang sama dengan aturan
   FWI ≥ 7, recall api besar naik dari 82,8% ke 86,3%.
3. **Untuk memprediksi api yang membesar, PFVI tidak menambah apa-apa.** Di uji 2024–2025, AUC turun dari 0,866 ke
   0,863 (selang −0,019 s.d. +0,008).
4. **Ambang 60 cm (Taufik dkk.) tidak tampak jelas di data Zenodo.** Laju api di muka air ≥ 60 cm 12,5% vs 8,2% di
   atasnya. Lompatan tajam baru muncul di ~100 cm (100% terbakar). Datanya juga tercampur letak stasiun: AUC
   luar-blok spasial hanya 0,575.

Saranku: kalau PFVI mau dipakai, jadikan **lapisan tambahan di samping FWI** di tampilan gambut, jangan pengganti FWI,
dan jangan masuk model membesar. Tambahannya +0,02–0,03 AUC. Keputusannya di pemilik.

## Cara uji

- **Sel:** 89 sel kisi `fwi.json` 0,5° yang ≥ 30% luasnya gambut (`lahan/gambut.geojson`). Provinsinya Riau 21,
  Kalteng 19, Kalbar 19, Sumsel 16, Kaltim 7, Kalsel 4, Jambi 3.
- **Cuaca:** ERA5 per jam dari Open-Meteo archive, 1 Mei s.d. 31 Okt tiap tahun. FWI dihitung dari jam 12 lokal
  plus hujan 24 jam (`fwi.deret`, sama dengan pipeline). PFVI dihitung dari suhu maksimum, hujan harian, dan ET0
  FAO.
- **Api:** titik VIIRS S-NPP dari arsip negara FIRMS (publik, tanpa kunci), keyakinan n/h, type 0, dan hanya yang
  jatuh di poligon gambut sel itu.
- **Ramalan:** nilai indeks pada hari t dipakai untuk meramal api pada hari t+1. Rentangnya Agu–Okt, 16.198
  sel-hari uji. Pada 48% sel-hari ada api esoknya, dan pada 15% ada ≥ 20 titik.
- **Latih/uji:** parameter disetel di 2015 dan 2018, lalu diuji di **2019 dan 2023** tanpa disentuh lagi. Gabungan
  FWI+PFVI memakai regresi logistik `[log1p FWI, PFVI/100]` yang juga dilatih di 2015/2018.
- **Selang:** bootstrap berpasangan per seri sel-tahun, 300 ulangan.

## Hasil uji 2019 + 2023

Target **api besok** (≥ 1 titik gambut):

| Varian | AUC | Recall | Presisi | Porsi sel-hari ditandai |
| --- | --- | --- | --- | --- |
| FWI ≥ 7 | 0,783 | 65,8% | 71,1% | 44,6% |
| FWI ≥ 14 | 〃 | 44,0% | 77,4% | 27,4% |
| PFVI > 150 (Tinggi+) | 0,767 | 81,9% | 64,2% | 61,5% |
| PFVI > 225 (Ekstrem) | 〃 | 40,8% | 76,4% | 25,7% |
| FWI ≥ 7 dan PFVI > 150 | 0,801 | 60,8% | 74,2% | 39,5% |
| **Gabungan (LR, alarm sama dengan FWI ≥ 7)** | **0,801** | **67,5%** | **73,0%** | 44,6% |
| Muka air proxy < −60 cm | 0,780 | 52,3% | 74,4% | 33,9% |

Target **hari api besar besok** (≥ 20 titik gambut di sel):

| Varian | AUC | Recall | Presisi | Porsi ditandai |
| --- | --- | --- | --- | --- |
| FWI ≥ 7 | 0,809 | 82,8% | 27,5% | 44,6% |
| FWI ≥ 14 | 〃 | 64,7% | 34,9% | 27,4% |
| PFVI > 150 | 0,811 | 94,3% | 22,7% | 61,5% |
| PFVI > 225 | 〃 | 63,1% | 36,4% | 25,7% |
| FWI ≥ 7 dan PFVI > 150 | 0,835 | 80,0% | 30,0% | 39,5% |
| **Gabungan (LR)** | **0,835** | **86,3%** | **28,7%** | 44,6% |

AUC per tahun, api besok, urutan FWI / PFVI / gabungan:

- 2019: 0,776 / 0,738 / 0,787
- 2023: 0,782 / 0,761 / 0,794

AUC per tahun, api besar, urutan yang sama:

- 2019: 0,778 / 0,759 / 0,797
- 2023: 0,842 / 0,844 / 0,865

Angka "dalam alarm yang sama": bila hanya 44,6% sel-hari teratas yang ditandai, recall api besar menjadi FWI 82,8%,
PFVI 84,9%, dan gabungan 86,3%.

Catatan cara membaca: target "api besok" sudah jenuh (48% sel-hari berapi) karena sel 0,5° besar dan 2019/2023
tahun berat. Target api besar lebih bermakna. Keduanya tidak memakai api hari ini; ini perbandingan **bahaya
cuaca**, bukan persistensi.

## Eskalasi: PFVI sebagai fitur GBDT

**Pembanding 0,70 di brief sudah usang.** Angka 0,70 itu model lama, yaitu porsi Monte Carlo. `lolos.py` (14 Okt)
sudah menggantinya: AUC 0,81 pada 500 deteksi pertama uji, 0,908 pada semua titik baru 2024–2026 (RISET-SEBARAN.md
§12).

**Model sebaran sungguhan tidak bisa dilatih ulang di mesin ini.** `data/raw/sebaran/` (438.217 titik api baru,
cache ERA5 per jam, `model_lipat.pkl`) dan `data/raw/firms/viirs.csv` tidak ada, dan `.env` tidak memuat
`FIRMS_MAP_KEY`.

**Penggantinya uji setara di skala sel 0,5° gambut.** Satu baris = sel-hari yang sudah berapi 1–19 titik. Targetnya
"membesar": puncak harian ≥ 20 titik dalam 3 hari ke depan. Model `gbdt.latih_gbdt` (150 pohon, kedalaman 3,
lr 0,05) dilatih di 2015/2018/2019/2023 (14.317 baris, 2.986 membesar) dan diuji di 2024/2025 (2.680 baris,
72 membesar).

| Fitur | AUC uji 2024–25 |
| --- | --- |
| Dasar: FWI, FFMC, DMC, DC, ISI, BUI, hujan 24 j, log titik hari ini, log FRP, log titik 7 hari, porsi gambut | 0,866 |
| Dasar + PFVI + muka air proxy | 0,863 (selisih −0,003; selang 95% −0,019 s.d. +0,008) |
| FWI saja (mentah) | 0,617 |
| PFVI saja (mentah) | 0,641 |

Kesimpulan: begitu ukuran api dan kode FWI (DC/DMC) masuk, PFVI tidak menambah informasi. Kelemahannya, kasus
positif 2024–25 cuma 72, jadi selangnya lebar. Uji di model `lolos.py` 375 m tetap layak dicoba kalau data mentahnya
dipulihkan, karena PFVI tinggal ditambahkan ke `CUACA_F`.

## Kalibrasi

| Parameter | Nilai | Sumber |
| --- | --- | --- |
| n, alpha (bentuk van Genuchten) | 3,0 / 150 cm | Zenodo 17907349 (58.245 sel ~1 km Kalimantan), loglik api ~ 1−θ(h). **Keduanya menyentuh batas fisik** (n ≤ 3, alpha ≤ 150 cm): data mau tangga di ~100 cm. Tanpa batas: n 12, alpha 400. |
| aH, bH | 2,202 / 0,0428 | loglik api besok ~ PFVI, VIIRS 2015 + 2018 |
| Ember muka air: Sy, faktor ET, bocor | 0,05 / 0,505 / 0 cm/hari | sama. **Sy menyentuh batas bawah 0,05** (literatur gambut 0,1–0,3): ember lebih cepat turun-naik dari fisika sebenarnya |
| Batas muka air proxy | −188,7 … +22,8 cm | rentang Zenodo |
| R0 | 3.000 mm | bawaan peatfr |

Ablasi di data latih (−loglik per sel-hari, makin kecil makin baik):

- dengan faktor muka air (bentuk Zenodo): 0,5294
- bentuk "60 cm" (n 2, alpha 60): 0,5352
- tanpa faktor muka air (aH = bH = 0, KBDI murni): 0,5409

Jadi faktor muka air memang membantu, dan bentuk dari Zenodo sedikit lebih baik dari kurva 60 cm.

Uji kewajaran proxy: di sel Kalimantan pada 30 Sep 2019, muka air proxy P10 −170, median −66, P90 +23 cm. Median
dekat median Zenodo (−48 s.d. −77 cm, tanggalnya tidak diketahui). P90 positif berarti sebagian sel utara Kalbar
masih basah.

**Zenodo bukan deret waktu.** Isinya satu potret spasial: muka air, jarak ke aktivitas manusia, tutupan lahan, dan
api, tanpa tanggal. Ember muka air karena itu tidak bisa "dikalibrasi pada deret Zenodo" seperti di brief. Yang
bisa diambil darinya hanya bentuk kurva, rentang nilai, dan pembanding sebaran. Laju api per kedalaman:

- 0–20 cm: 81% (n 162)
- 20–40 cm: 46% (n 4.299)
- 40–60 cm: 0,8%
- 60–80 cm: 6,5%
- 80–100 cm: 13%
- ≥ 100 cm: 100%

Pola itu tidak monoton. Tanda kuat bahwa nilai muka airnya ditempel per stasiun, bukan diukur di titik api.

## Port dan bug upstream

`python3 scripts/data/pfvi.py` mencocokkan port dengan transkripsi harfiah `PFVI()` R pada deret sintetis 12 hari
(selisih < 1e-12) dan menghitung hari 1 dengan tangan. Self-check juga memastikan Nelder-Mead berbatas memulihkan
parameter yang dipakai membuat deret 120 hari. R tidak terpasang di mesin ini, jadi pembandingnya transkripsi, bukan
Rscript.

- **(a) Hujan kemarin.** Di upstream `Rf_b <- c(Rf[-length(Rf)], NA)` sama dengan hujan hari ini. Pada hari hujan
  12 mm setelah hari kering, upstream mengurangi 12, padahal seharusnya 6,9 (selisih 5,1 poin, ada di self-check).
  Perbaikannya: `c(NA, Rf[-n])`.
- **(b) Kisi `1:(1/par3)`^4.** Diganti `kalibrasi()`: Nelder-Mead multi-awal Latin hypercube di ruang logit berbatas,
  jumlah evaluasinya ~awal × iterasi.
- **Tambahan.** `(h/alpha)^n` dengan alpha ≤ 0 atau n ≤ 1 menghasilkan NaN di R. Di sini dijaga batas parameter.

## Yang belum dikerjakan

- **Prakiraan +1..+7 hari belum dijalankan harian.** `pfvi.ansambel_pfvi()` siap (keadaan awal + anggota IFS →
  med/P10/P90/P(PFVI > 150)) dan teruji, tapi belum disambung ke `ansambel.py`. Menyambungnya butuh 2 variabel
  ansambel tambahan (ET0, suhu maks) dan keadaan PFVI harian di `fwi.json`. Ditahan sampai pemilik memutuskan.
- **Keadaan awal dari ERA5-Land soil moisture (`DIobs`) belum dipakai.** Uji balik mulai 1 Mei dengan x = 0 dan
  muka air 0, jadi kelembapan tanah tidak dibutuhkan. Untuk operasi harian, x0 sebaiknya dibawa dari hari ke hari
  seperti kode FWI.
- **Setiap keluaran yang memakai muka air harus berlabel "perkiraan (proxy), bukan pengukuran".**
