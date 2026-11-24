# ALUR: Bangunan di lereng terjal

## A1. Hitung satu kotak (kab/kota), di mesin lokal

1. Pemilik mengunduh lembar DEMNAS kotak itu (Q2); pengerja mencatat nama lembar, tanggal, dan sidik berkas di indeks.
2. Pengerja menarik ubin GLO-30 yang menutupi kotak (hanya sesudah izin unduh) dan mencatat sidiknya.
3. Hitung lereng persen per piksel untuk tiap DEM pada resolusi aslinya (ALGORITMA 1).
4. Baca bangunan Overture dalam kotak lewat DuckDB (rilis terkunci), simpan seperlunya di `data/raw/lereng/` (gitignored).
5. Beri tiap bangunan lereng DEMNAS dan lereng GLO-30, lalu kelas S, D, G, L, atau T (ALGORITMA 2 dan 3).
6. Tempatkan bangunan ke desa (titik tengah dalam poligon desa) dan turunkan kecamatan.
7. Agregat per desa dan kecamatan, hitung cakupan DEMNAS dan kelengkapan, tulis `lereng_bangunan.json` per kotak.
8. Catat lembar, rilis, ambang, versi kode, dan jam hitung di berkas indeks. Kotak yang tidak dihitung tercatat "belum dihitung".

## A2. Uji desa longsor

1. Daftar desa longsor disusun dari sumber bertanggal (Q7) dan ditinjau pemilik.
2. Kriteria uji dibekukan dan di-commit (LT-13) sebelum label dipakai.
3. Skor desa dihitung dari agregat A1 tanpa melihat label.
4. Label dibuka sekali; hasil, pembanding, dan vonis ditulis ke `lereng_uji.json`.
5. Bila ada perubahan metode sesudah melihat hasil: versi baru dan Kasus, bukan penimpaan.

## A3. Kejadian: citra dan potongan melintang

1. Pengerja memilih kejadian terdokumentasi (Q16) dan dua tanggal citra Sentinel-2 bebas awan terbaik sebelum dan sesudah.
2. Perubahan tutupan dihitung (ALGORITMA 6), diberi hillshade dan garis lereng 40 persen dari DEMNAS.
3. Garis potongan ditarik tegak lurus kontur utama melalui titik awal; profil dari dua DEM disampel.
4. Keluaran `kejadian/<id>.json` dan ubin gambar kecil; label "perkiraan dari citra".

## A4. Pembaca melihat layar

1. Pembaca (staf, BPBD) membuka `/longsor/lereng`, memilih kab/kota.
2. Layar memuat indeks kotak dan agregat; wilayah belum dihitung tampil "belum dihitung".
3. Peringkat dan kolom 3D menunjukkan jumlah atau kerapatan; tiap baris memuat cakupan dan kelengkapan.
4. Klik desa membuka kartu: enam kelas, rentang, kelengkapan, bila ada kejadian: citra dan potongan.
5. Tab Metode menjelaskan batas dan hasil uji.

## A5. Perluasan wilayah

Pemilik memilih kotak berikut, mengunduh DEMNAS bila ada, pengerja menjalankan A1 dan menambah kotak ke indeks. Wilayah tanpa lembar DEMNAS ditulis "belum ada DEMNAS" di indeks, bukan dilewati.
