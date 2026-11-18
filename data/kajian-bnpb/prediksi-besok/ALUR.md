# ALUR

## Pipeline harian (sudah dirantai di `jalan.py`)
1. `catat.py`: bekukan HJN (+ embusan angin dari panggilan yang sama), API, BNJ, LSR, ASP, ROB, lalu GEL (Open-Meteo Marine di titik pesisir) dan CEX ke arsip append-only.
2. `nilai.py`: GEL dan CEX tercatat "menunggu" (belum ada pengamatan).
3. `kalibrasi.py`: tidak menyentuh GEL dan CEX.
4. `terbit.py`: masukkan GEL dan CEX ke `prediksi.json`, evaluasi aturan melaut dan angin, tambahkan kunci `geo` per kab.
5. `tangga.py`: tambah anak tangga kering kita di skala sepekan dan bulan.

## Staf di layar
1. Buka `/prediksi` tab Besok: kartu Perlu tindakan, lalu tabel urut level tertinggi.
2. Pilih bencana dari pil: tabel menyaring kab level >= 1 bencana itu dan mengurutkan menurut kolomnya; peta mewarnai bencana itu.
3. Klik baris atau wilayah peta: pop-up rincian.
4. Ganti hari atau provinsi: tabel, peta, dan Perlu tindakan ikut berubah.
