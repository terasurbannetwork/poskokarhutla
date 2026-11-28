# Uji balik genangan satelit per kejadian (GS-13)

Vonis: **tak dapat dinilai**. Kriteria versi 2, dikunci sebelum hitungan (GS-02), dijalankan 2026-11-26.

Yang diuji: apakah peringkat kabupaten menurut penduduk di area genangan (Copernicus GFM, WorldPop, rentang tengah) sejalan dengan peringkat terdampak menurut DIBI, pada pasangan kab-hari banjir 2024 dan sesudahnya. Bukan angka mutlak, dan bukan kemampuan membedakan banjir dari tidak banjir.

| Ukuran | Nilai |
| --- | --- |
| Pasangan sampel dipilih | 300 |
| Pasangan sah dari radar | 30 |
| Pasangan dipakai menilai | 30 |
| Blok sah (provinsi x minggu) | 29 |
| Gagal baca | 0 |
| Tak sah dari radar | 270 |
| Tanpa poligon kab | 0 |
| Sah dari radar, penduduk tidak tersedia | 0 |
| Sah dari radar, pembanding tidak tersedia | 0 |

Tidak dinilai: blok sah < 20, atau sah/dipilih < 0,30 pada sampel uji. Yang tidak terpenuhi: sah/dipilih 0,10 (30 dari 300), di bawah 0,30; blok sah 29 memenuhi syarat paling sedikit 20. Penyebab terbanyak tak sah: sinyal lemah (203 pasangan, tergenang baru kurang dari dua kali genangan latar) dan tidak teramati radar dalam jendela 6 hari (39 pasangan). Ambang tidak disetel ulang sesudah hasil ini.

Keterbatasan:

- Tanggal DIBI adalah tanggal lapor. Citra pembanding dipilih paling lambat 7 hari sebelum tanggal itu (K6), tapi wilayah bisa sudah tergenang lebih awal (Q11).
- Batas 7 hari dibandingkan pada tanggal UTC lintasan, bawaan sementara Q14.
- Penduduk hanya WorldPop yang dibagi ke bangunan; Dukcapil tidak dipakai di uji ini.
- Pil hipotesis tetap kecuali vonis lulus.

Sumber: Copernicus Emergency Management Service, Global Flood Monitoring (GFM), EODC; DIBI BNPB; WorldPop; bangunan Google Open Buildings v3 dan Overture Maps.
