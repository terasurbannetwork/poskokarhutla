# Uji balik HAND lawan riwayat genangan GLAD

Dibuat 2026-11-23T11:44Z. scripts/banjir/uji_hand.mjs; muka air seragam di semua alur, kotak 6 km 100 sel seperti tab Simulasi, tanpa air permanen WorldCover.

Situs 60 (gagal 0) dari 4314 kecamatan dengan riwayat genangan sedang+tinggi >= 5%.

Terpilih di separuh kalibrasi: ambang alur 0,25 km2, muka air 10 m (CSI 0,499).

Separuh uji (30 situs): CSI 0,446, POD 0,814, FAR 0,503; pembanding sel terendah CSI 0,46. HAND menang di 5 dari 30 situs.

| muka air (m) | CSI kalibrasi | CSI uji | pembanding uji |
|---|---|---|---|
| 0,5 | 0,236 | 0,2 | 0,233 |
| 1 | 0,284 | 0,244 | 0,279 |
| 1,5 | 0,328 | 0,286 | 0,321 |
| 2 | 0,364 | 0,319 | 0,351 |
| 3 | 0,414 | 0,367 | 0,396 |
| 4 | 0,447 | 0,398 | 0,424 |
| 5 | 0,469 | 0,419 | 0,441 |
| 7 | 0,491 | 0,439 | 0,456 |
| 10 | 0,499 | 0,446 | 0,46 |

Catatan:

- Setelan terpilih jatuh di tepi kisi. CSI naik terus seiring makin banyak sel ditebak (pola sebaran kebenaran, bukan kemampuan HAND), jadi setelan itu bukan optimum dan tidak dipakai di layar. Yang menentukan adalah HAND lawan pembanding di tiap baris.
- Hanya berlaku untuk kecamatan yang memang punya riwayat genangan (situs dipilih dari turunan GLAD yang sama). Salah alarm di kecamatan kering tidak diuji.
- Situs berjarak minimal 12 km satu sama lain. n = 30, tanpa selang kepercayaan.
