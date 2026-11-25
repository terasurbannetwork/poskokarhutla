# Hasil PKH-39: lab panjang front api AFD-S2 (24 Nov 2026)

Skrip: `scripts/data/lab_front.py` (lab, tidak mengubah `taktik.py`). Keluaran lab `public/data/lab/front.json` (belum dilacak git, tidak terbit). Status nilai: **hipotesis**.

## Rujukan dan parameter (dicek ke teks lengkap)

Hu, Ban, Nascetti (2021), JAG 101:102347, doi 10.1016/j.jag.2021.102347. Akses terbuka (emas): ScienceDirect menjawab 403 ke klien otomatis (tidak ditembus), tetapi salinan penerbit tersedia di repositori Lirias KU Leuven (ditemukan lewat OpenAlex). Tabel 3 makalah:

| Bioma | C1 | C2 |
| --- | --- | --- |
| Tropical and Subtropical Moist Broadleaf Forests | Red <= 1,045 x SWIR2 - 0,071 | SWIR2/SWIR1 >= 1 |
| Tropical and Subtropical Grasslands, Savannas and Shrublands | Red <= 0,677 x SWIR2 - 0,052 | (tidak ada) |

Koreksi atas brief tiket: pasangan 0,677 / 0,052 adalah milik **savana**, dan rasio SWIR2/SWIR1 >= 1 hanya milik hutan lembap; brief menggabungkannya. `lab_front.py` kini memilih per kompleks (`jenis == savana` -> SAVANA, selain itu LEMBAP, pendekatan kasar). Batas yang tetap: makalah memakai reflektansi TOA (GEE), kita memakai L2A permukaan; selisih ini belum diukur. Ambang 0,99 kuantil (C3 Mediterania) tidak relevan tropis.

Penney dkk. 2019: koefisien a dan b tetap **null** (sumber tak terjangkau); kolom `penney` = null.

## Panjang front lab lawan taktik (jendela 1,6 km, piksel 20 m)

30 kompleks aktif terbesar dicoba; 9 punya adegan Sentinel-2 L2A berawan <= 40% dalam 10 hari (21 lainnya: "tidak ada adegan", tidak ditulis 0).

| Kompleks | Kab | Jenis | Adegan | Piksel api | Front lab km | Front taktik km | Lab / taktik | Terpotong |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| K0002 | Sumba Timur | savana | 21 Nov | 18 | 0,74 | 27,82 | 0,03 | ya |
| K0005 | Merauke | savana | 17 Nov | 446 | 6,54 | 16,97 | 0,39 | ya |
| K0040 | Kota Bontang | mineral | 17 Nov | 1414 | 21,52 | 7,52 | 2,86 | ya |
| K0009 | Merauke | savana | 23 Nov | 6 | 0,22 | 21,47 | 0,01 | tidak |
| K0039 | Merauke | savana | 23 Nov | 21 | 0,80 | 11,51 | 0,07 | ya |
| K0018 | Merauke | savana | 22 Nov | 118 | 3,83 | 15,14 | 0,25 | tidak |
| K0044 | Merauke | savana | 23 Nov | 14 | 0,60 | 12,87 | 0,05 | tidak |
| K0047 | Kutai Timur | mineral | 21 Nov | 30 | 1,12 | 10,55 | 0,11 | ya |
| K0019 | Merauke | savana | 17 Nov | 67 | 1,98 | 9,86 | 0,20 | tidak |

(Front taktik = nilai terendah dari tiga skenario `front` di `operasi.json`.)

## Yang boleh dan tidak boleh disimpulkan

- Lab hanya melihat jendela 1,6 km di sekitar titik pusat kompleks pada **satu lintasan satelit** (jam lintas ~10.30 waktu lokal), sedangkan `front` taktik adalah front seluruh kompleks pada jam rencana. Rasio < 1 pada tujuh dari sembilan kompleks mudah dijelaskan jendela sempit dan waktu lintas; ia bukan bukti taktik melebihkan.
- K0040 (rasio 2,86; 1414 piksel api pada jendela 1,6 km) mencurigakan sebagai positif palsu (pertambangan atau tanah terbuka panas di Bontang, bioma "lembap" sebagai pendekatan). Belum diperiksa pada citra.
- Kriteria tiket "panjang front 5 insiden dicek pada citra": **belum terpenuhi**. Lima insiden berpanjang front ada (K0005, K0018, K0019, K0039, K0047), tetapi pemeriksaan visual komposit B12-B11-B4 belum dilakukan. Tiket tetap terbuka; belum ada pemeriksa `validasi-model`.
- Tidak ada angka lab yang dipakai `taktik.py`; `air_front_l_per_m` tetap 80 (asumsi platform).
