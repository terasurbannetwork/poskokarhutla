# Uji balik HAND lawan riwayat genangan GLAD

Dibuat 2026-11-23T15:12Z. scripts/banjir/uji_hand.mjs; muka air seragam di semua alur, kotak 6 km 100 sel seperti tab Simulasi; empat varian DEM x air permanen.

Situs 60 (gagal 0) dari 4314 kecamatan dengan riwayat genangan sedang+tinggi >= 5%. Sel yang mendapat nilai FABDEM: 1 dari sel darat. Situs tanpa data air WorldCover: 0.

Setelan dipilih di separuh kalibrasi, dinilai sekali di separuh uji (30 situs). Pembanding = sel terendah di DEM varian itu, jumlah sel sama.

| varian | DEM dan air | setelan terpilih | CSI uji | pembanding | situs menang | kisi unggul |
|---|---|---|---|---|---|---|
| T | Terrarium tanpa air permanen | 0,25 km2, 10 m | 0,446 | 0,46 | 5/30 | 0/45 |
| TA | Terrarium + air WorldCover (layar) | 0,25 km2, 10 m | 0,446 | 0,459 | 4/30 | 0/45 |
| F | FABDEM tanpa air permanen | 0,25 km2, 10 m | 0,435 | 0,446 | 6/30 | 1/45 |
| FA | FABDEM + air WorldCover | 0,25 km2, 10 m | 0,435 | 0,447 | 6/30 | 0/45 |

CSI uji / pembanding per muka air, ambang alur 0,25 km2:

| muka air (m) | T | TA | F | FA |
|---|---|---|---|---|
| 0,5 | 0,2 / 0,233 | 0,211 / 0,247 | 0,263 / 0,299 | 0,268 / 0,307 |
| 1 | 0,244 / 0,279 | 0,253 / 0,29 | 0,324 / 0,363 | 0,328 / 0,367 |
| 1,5 | 0,286 / 0,321 | 0,293 / 0,328 | 0,359 / 0,394 | 0,362 / 0,396 |
| 2 | 0,319 / 0,351 | 0,324 / 0,357 | 0,382 / 0,411 | 0,384 / 0,412 |
| 3 | 0,367 / 0,396 | 0,37 / 0,398 | 0,406 / 0,43 | 0,408 / 0,432 |
| 4 | 0,398 / 0,424 | 0,4 / 0,425 | 0,419 / 0,442 | 0,42 / 0,443 |
| 5 | 0,419 / 0,441 | 0,42 / 0,441 | 0,426 / 0,448 | 0,428 / 0,449 |
| 7 | 0,439 / 0,456 | 0,439 / 0,456 | 0,433 / 0,45 | 0,434 / 0,451 |
| 10 | 0,446 / 0,46 | 0,446 / 0,459 | 0,435 / 0,446 | 0,435 / 0,447 |

Catatan:

- Setelan terpilih bisa jatuh di tepi kisi. CSI naik seiring makin banyak sel ditebak (pola sebaran kebenaran, bukan kemampuan HAND), jadi setelan itu bukan optimum dan tidak dipakai di layar. Yang menentukan adalah HAND lawan pembanding di tiap baris.
- Hanya berlaku untuk kecamatan yang memang punya riwayat genangan (situs dipilih dari turunan GLAD yang sama). Salah alarm di kecamatan kering tidak diuji.
- Situs berjarak minimal 12 km satu sama lain. n = 30, tanpa selang kepercayaan.
- FABDEM berlisensi non-komersial: dipakai untuk uji ini saja, tidak disajikan di layar.
