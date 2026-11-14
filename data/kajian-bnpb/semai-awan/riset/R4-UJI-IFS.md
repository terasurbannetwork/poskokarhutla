# R4: Uji kelayakan ECMWF IFS 0,1 derajat (tiket SA-01)

Diukur 14 Nov 2026 dari mesin pemilik (jaringan rumah, bukan runner GitHub) dengan `scripts/operasi/semai_ifs.py`,
Python 3.12 venv berisi `eccodes` 2.43.0 dan `numpy` 2.0.2 (roda pip membawa pustakanya, tanpa `eccodeslib` tambahan).

## Putaran dan perintah

- Putaran 2026111400 (00z). Index langkah 36 untuk `sfc` dan `pl` sudah ada (HTTP 200).
- `python3 scripts/operasi/semai_ifs.py uji` lulus (`uji semai_ifs: OK`, tanpa eccodes).
- `--putaran 2026111400 --langkah 0,24 --cek`: 29 field per langkah ditemukan, tak ada yang hilang.
- `--putaran 2026111400 --cek` (13 langkah): semua field ditemukan dan terurai; satu-satunya galat awal adalah ambang `r`
  yang terlalu ketat (lihat Kejutan), sudah dilonggarkan dan langkah 6 diuji ulang: OK.

## Waktu dan ukuran satu putaran (13 langkah)

| Fase | Hasil |
| ---- | ----- |
| Unduh (6 utas, rentang byte, 26 `.index` + 52 rentang gabungan) | 182,6 detik |
| Urai eccodes, potong, tulis npz float16 | 15,4 detik |
| Total | 198,0 detik (3,3 menit) |
| Byte diunduh | 840,2 MB (sekitar 64,6 MB per langkah) |
| Ukuran npz di disk | sekitar 5,3 MB per langkah, 68 MB seluruhnya |

Estimasi di runner GitHub: jaringan pusat data umumnya tidak lebih lambat dari ini, jadi unduh paling banyak sekitar 3 menit;
urai CPU tunggal sekitar 15 detik. Estimasi total di bawah 5 menit, jauh di bawah batas 15 menit. Angka runner belum diukur.

## Grid dan pengepakan

- Grid global dibaca dari kunci GRIB (bukan diasumsikan). Potongan bujur 94 sampai 142, lintang 7 sampai -12 menghasilkan
  bentuk **191 x 481** di semua field dan semua langkah (lintang utara ke selatan, bujur barat ke timur).
- Pengepakan data: `grid_ccsds` (CCSDS/AEC), terbaca langsung oleh `eccodes`.

## Tabel per field (13 langkah, nilai setelah potong, min dan max dari seluruh langkah)

MB = ukuran terbesar satu pesan GRIB2 global (satu field, sebelum dipotong). Satuan: suhu K, `u v 10u 10v` m/s, `r` persen,
`gh` meter geopotensial, `w` Pa/s, `tclw` kg/m2, `mucape` J/kg, `tp` mm kumulatif.

| Field | Level hPa | MB | min | max |
| ----- | --------- | -- | --- | --- |
| lcc | sfc | 2,44 | 0 | 1 |
| mucape | sfc | 1,52 | 0 | 5248 |
| tclw | sfc | 3,73 | 0 | 1,279 |
| tp | sfc | 1,76 (langkah 0: kosong) | 0 | 124,3 |
| 10u | sfc | 3,68 | -10,8 | 10,5 |
| 10v | sfc | 3,58 | -10,4 | 9,84 |
| 2t | sfc | 1,38 | 276,9 | 311,0 |
| 2d | sfc | 1,45 | 276,4 | 301,1 |
| u | 850 | 2,98 | -15,1 | 15,6 |
| u | 700 | 2,76 | -15,5 | 16,1 |
| u | 200 | 2,74 | -15,5 | 20,7 |
| v | 850 | 3,77 | -11,1 | 13,2 |
| v | 700 | 2,83 | -9,75 | 12,7 |
| v | 200 | 2,85 | -21,8 | 17,2 |
| r | 850 | 2,08 | 16,0 | 105,2 |
| t | 1000 | 1,26 | 295,4 | 309,1 |
| t | 925 | 1,20 | 291,8 | 303,7 |
| t | 850 | 1,61 | 288,5 | 298,3 |
| t | 700 | 1,33 | 281,7 | 289,2 |
| t | 600 | 1,24 | 274,0 | 280,0 |
| t | 500 | 1,17 | 266,8 | 271,5 |
| gh | 1000 | 2,52 | 45,0 | 194,5 |
| gh | 925 | 2,28 | 741 | 855 |
| gh | 850 | 2,14 | 1477 | 1566 |
| gh | 700 | 2,11 | 3131 | 3196 |
| gh | 600 | 1,61 | 4405 | 4466 |
| gh | 500 | 1,71 | 5868 | 5927 |
| w | 850 | 4,08 | -7,10 | 3,77 |
| w | 700 | 3,62 | -7,21 | 3,06 |

## Kejutan dan keputusan

1. **Total unduhan 840 MB, bukan 570 MB** seperti perkiraan DESAIN-TEKNIS §2. Field `pl` dan `sfc` global sekitar 1,2 sampai
   4,1 MB masing-masing. Tidak mengubah kelayakan, tetapi angka di DESAIN-TEKNIS perlu dikoreksi (pemilik berkas: orkestrator).
2. **`tp` langkah 0 ada di index tetapi isinya kosong (224 byte, nilai nol).** Terurai sebagai nol, bukan galat. `tp` kumulatif
   sejak awal putaran, satuan **meter** di GRIB; skrip menyimpannya dalam **mm** (dikali 1000) supaya float16 tidak menggerus
   hujan kecil. Selisih antarlangkah dari nilai kumulatif besar (puluhan sampai ratusan mm) punya presisi float16 sekitar
   0,03 sampai 0,25 mm; cukup untuk gerbang hujan 3 jam, tetapi SA-03 perlu tahu.
3. **`gh` adalah tinggi geopotensial dalam meter (gpm), bukan `z` (m2/s2).** Pada 1000 hPa nilainya 91 sampai 183 m, jadi
   perhitungan level beku di ALGORITMA §2 memakai `gh` apa adanya tanpa dibagi g. Index juga memuat `z` (m2/s2); tidak dipakai.
4. **`w` dalam Pa/s** (negatif = naik), rentang -7,2 sampai 3,8 di wilayah, termasuk nilai ekstrem sel konvektif; konversi ke
   m/s di ALGORITMA §2 berlaku.
5. **`r` 850 hPa melampaui 100%** (sampai 105,2%). Itu perilaku IFS terhadap es/air super-jenuh, bukan galat unduhan. Batas cek
   dilonggarkan ke 110; SA-03 harus memangkas ke 100 bila dipakai sebagai kelembapan.
6. Index memuat baris `levtype: sol` dengan `param` dan `levelist` yang bisa bentrok nama (`vsw`, `sot`); pencocokan memakai
   `levtype` sehingga tidak tertukar.
7. Hanya `tp` yang boleh hilang di langkah 0 (diisi nol dan dicatat); field lain hilang menggagalkan jalan.

## Vonis SA-01

LULUS. 29 dari 29 field ada di semua 13 langkah, terurai dengan `eccodes`, terpotong ke 191 x 481, rentang nilai masuk akal,
unduh 3,3 menit total di jaringan lokal (kriteria: di bawah 15 menit di runner; estimasi runner di bawah 5 menit, belum diukur
di runner). Tidak ada penghalang untuk SA-02 dan seterusnya. Yang tersisa untuk tiket workflow (SA-06): waktu runner nyata dan
koreksi angka 570 MB menjadi sekitar 840 MB di DESAIN-TEKNIS. npz hasil uji (68 MB) dibiarkan di `data/raw/semai/` (diabaikan git).
