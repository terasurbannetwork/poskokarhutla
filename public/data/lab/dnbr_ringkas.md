# LAB dNBR Sentinel-2 vs Gaveau 2019 (bukan produksi)

Status: **TIDAK LOLOS** · kriteria_sha 1191140b99f3

Cakupan: 60 kotak 6x6 km dipilih, 43 dinilai, dibuang {'tak ada adegan pra bersih': 7, 'tak ada adegan pasca bersih': 5, 'cakupan valid gabungan rendah': 5}, tertunda 0. Sampel, bukan seluruh Indonesia.

| Metode | median abs galat-log | faktor | selisih vs M0 (CI90) |
|---|---|---|---|
| M0 titik x 4,3 ha | 0.8677 | 2.381x | - |
| dNBR LOPO | 0.8813 | 2.414x | 0.192 [-0.059, 0.3704] |
| dNBR USGS 0,27 | 1.4836 | 4.409x | -0.8159 [-1.2992, -0.3394] |

Total semua kotak (ha): acuan 18366, M0 7723, dNBR LOPO 14569, dNBR USGS 54244.
Ambang kalibrasi semua kotak: 0.55.

Keterbatasan:
- Gambut sering membara di bawah permukaan: dNBR tidak melihatnya, luas gambut cenderung kurang.
- Satu tahun acuan (2019): LOYO tidak mungkin; ambang LOPO hanya lintas provinsi.
- Acuan Gaveau berbasis Sentinel-2 juga: independen metode, bukan sensor; Gaveau bukan kebenaran lapangan.
- GFED5 tidak dipakai (netCDF4 tak terpasang, resolusi 0,25 derajat).
- Pasca Okt-Des 2019: api sesudah tanggal adegan pasca tak terlihat, bekas tua memudar; M0 dihitung pada jendela tanggal yang sama.
- B8A (20 m) menggantikan B8; masker awan dilebarkan hanya 1 piksel (20 m), bayangan tipis bisa lolos.
- M1 tidak ada keluaran per kotak, tidak dibandingkan.
