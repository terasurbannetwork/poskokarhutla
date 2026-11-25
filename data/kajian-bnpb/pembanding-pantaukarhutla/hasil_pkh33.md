# Hasil PKH-33: setel ambang RBR Sentinel-1 lawan dNBR (24 Nov 2026)

Skrip lab: `scripts/data/lab_rbr.py` (baru; menulis tidak ke `public/data`), memakai `luas_citra.radar_s1(peta=)` (satu parameter opsional ditambahkan) dan `luas_citra.banding`. Data mentah: `hasil_pkh33.json`. Jalankan di env conda `lb` (~/licsbas); `rasterio`, `pystac-client`, `planetary-computer` dipasang HANYA di env itu lewat pip, tanpa sudo.

## Cara

`luas_citra.json` produksi tidak bisa dipakai: tak satu pun dari 389 id-nya masih ada di `insiden.json` (jendela 14 hari), jadi geometri insiden hilang. Maka insiden segar (`insiden.json` produksi, tak terdeteksi 7-15 hari) dinilai dNBR di lab (`nilai_citra`, aturan produksi), dan hanya yang `luas_ha` dNBR-nya terisi (lolos cakupan 60% dan kontrol latar) diambilkan peta RBR (VH pasca/pra, satu orbit relatif, kotak latar sama). Ambang disapu -0,5 sampai -3,0 dB pada peta yang sama.

102 insiden dicoba, **30 dNBR-bersih berpeta radar** (72 gugur: 33 tanpa adegan pasca bersih, 11 tanpa pra bersih, sisanya cakupan atau terpotong; tidak ada yang ditulis 0). Berhenti di batas target 30.

## Kesepakatan

| Ambang dB | n berpasangan (radar bernilai) | radar > 0 ha | Spearman | median radar/dNBR | jumlah dNBR ha | jumlah radar ha |
| --- | --- | --- | --- | --- | --- | --- |
| -1,0 | 7 | 5 | 0,34 | 1,01 | 306 | 401 |
| -1,5 (ambang sekarang) | 15 | 9 | 0,31 | 0,34 | 485 | 324 |
| -2,0 | 22 | 9 | -0,00 | 0,00 | 1063 | 219 |
| -2,5 | 22 | 8 | 0,08 | 0,00 | 1017 | 170 |
| -3,0 | 26 | 6 | 0,06 | 0,00 | 1122 | 125 |

(Ambang -0,5: n 4, tak bermakna.) n dihitung termasuk luas radar 0,0 ha; `luas_citra.banding` membuangnya karena `v["radar"].get("luas_ha")` salah untuk 0,0, sehingga n resminya lebih kecil (2, 5, 9, 9, 8, 6) dan **`cukup: false` di semua ambang**. Itu temuan terpisah: 0,0 ha dihitung nol adalah hasil sah dan seharusnya ikut `banding` (tidak diubah; menunggu keputusan karena mengubah definisi uji).

## Vonis

**Ambang tidak tersetel.** `RBR_AMBANG_DB` tetap -1,5; label `s1_rbr_hipotesis` tetap. Alasan:
- Kriteria `cukup: true` (>= 20 pasangan) tidak tercapai pada ambang mana pun menurut `banding`; bila nol ikut dihitung, n 22-26 hanya pada ambang -2,0 sampai -3,0, dan di sana korelasi peringkat ~0 dan radar nol pada sebagian besar insiden.
- Pada ambang yang menangkap sinyal (-1,0 dan -1,5), korelasi lemah (0,3) dengan n 7-15.
- Sebab yang masuk akal (hipotesis, belum diuji): insiden bermedian ~15 ha (rentang 0-540), sedangkan peta RBR kotak latar 30 km memakai piksel ~375 m (~14 ha); api sekecil itu tak terlihat pada resolusi ini. Pasangan orbit pra/pasca berjarak bulanan, tutupan sawah atau rumput savana Merauke juga bergeser musiman.
- Tidak ada angka karangan: tidak ada ambang yang lolos, jadi tidak ada yang disetel.

Tindak lanjut bila dilanjutkan: kotak RBR lebih rapat (piksel <= 100 m) untuk insiden kecil, sapu pada insiden >= 50 ha saja, dan perbaiki `banding` agar menghitung nol. Pemeriksa: `validasi-model`.
