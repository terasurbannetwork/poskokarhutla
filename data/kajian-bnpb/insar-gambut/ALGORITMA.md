# ALGORITMA: Kedalaman gambut hilang dari InSAR

Semua fungsi murni, stdlib saja. Letak: `scripts/data/insar_gambut.py` (fungsi `A*` sampai `E*`). Konstanta di kepala berkas. Dekomposisi LOS ke vertikal tidak ditulis ulang: `subsiden.vertikal`.

## Konstanta

| Nama | Nilai | Catatan |
| ---- | ----- | ------- |
| `ALPHA` | 1,0 | [SEMENTARA, Q3] |
| `CINCIN_BUANG_KM` | 2 | piksel dalam 2 km dari topeng terbakar dibuang dari kontrol |
| `CINCIN_KONTROL_KM` | 20 | batas luar kontrol |
| `MIN_PIKSEL` | 50 | per kelompok; [SEMENTARA, Q6] tebakan perancang |
| `MIN_KOHEREN_PCT` | 30 | porsi piksel terbakar yang koheren; [SEMENTARA, Q6] tebakan perancang |
| `D_LIT` | 15, 33, 51 cm | batas bawah, rata-rata Ballhorn, batas atas `gambut_bara.py` |
| `SD_LIT` | 18 cm | Ballhorn dkk. 2009 |
| `JENDELA` | api, pasca30, pasca90 | jendela waktu laju |

## A. Vertikal per piksel

Untuk tiap piksel: `v = subsiden.vertikal(naik, turun)` bila dua geometri ada; satu geometri memakai asumsi gerak murni vertikal (v = LOS / U) dan dicatat. Tanda: negatif = turun. Piksel dengan |LOS| > `SAH_MM` (400 mm/thn) dibuang. Hasil cm, bukan mm per tahun, per jendela: laju × lama jendela.

## B. Selisih area

`Δh_tambahan = median(v di topeng terbakar) - median(v di kontrol)`; selang = kuantil p10 dan p90 dari 1.000 pengambilan ulang piksel (bootstrap sederhana, benih tetap, lihat catatan korelasi spasial di bawah). Piksel yang tidak koheren tidak diganti nol.

Catatan: piksel bertetangga berkorelasi spasial, sehingga selang bootstrap terlalu sempit. Laporan menulis itu; pengambilan ulang per blok 1 km dicatat sebagai pengganti bila IG-03 menemukan perbedaan.

## C. Kedalaman InSAR

`D_insar = ALPHA × (-Δh_tambahan)` dalam cm (positif = hilang). Bila `Δh_tambahan ≥ 0` (area terbakar tidak lebih turun), `D_insar = 0` hanya bila koherensi dan piksel cukup; selain itu `tak_terukur`.

## D. Koherensi dan jumlah piksel

`koheren_pct` = piksel terbakar dengan nilai valid dibagi piksel terbakar total. Bila `< MIN_KOHEREN_PCT` atau piksel valid `< MIN_PIKSEL` di salah satu kelompok: vonis `tak_terukur`.

## E. Vonis (dikunci di RENCANA-UJI §2)

- `selaras`: selang `D_insar` tumpang tindih dengan [15, 51] cm **dan** `koheren_pct ≥ MIN_KOHEREN_PCT`.
- `meremehkan`: batas atas selang `D_insar` < 15 cm dengan koherensi cukup; penjelasan terpilih dari uji sebab (F).
- `tak_terukur`: koherensi atau piksel kurang.

## F. Uji sebab selisih

| Dugaan | Uji | Tanda yang menguatkan |
| ------ | --- | --------------------- |
| Salah bungkus fase | hitung porsi pasangan dan piksel dengan gradien laju antar piksel bertetangga di atas batas yang diturunkan dari panjang gelombang 5,6 cm; bandingkan `Δh_tambahan` bila pasangan beresiko dibuang | `Δh_tambahan` bertambah besar bila pasangan beresiko dibuang |
| Dekorelasi dan bias seleksi | bandingkan sebaran `v` piksel koheren dengan distribusi kontrol; hitung `koheren_pct` terbakar lawan kontrol | `koheren_pct` terbakar jauh di bawah kontrol |
| Oksidasi pasca-api | laju di jendela `api` lawan `pasca30` dan `pasca90` | penurunan terbakar berlanjut atau membesar sesudah api padam |

Hasil tiap uji ditulis sebagai angka dan arah, tanpa kalimat sebab tunggal bila dua tanda menguat bersamaan.

## G. Kepekaan

Tulis `D_insar` untuk `ALPHA` 0,5, 1,0, 2,0, dan untuk dua pilihan kontrol (cincin 2 sampai 10 km dan 2 sampai 20 km). Angka kepekaan ada di laporan lab saja.
