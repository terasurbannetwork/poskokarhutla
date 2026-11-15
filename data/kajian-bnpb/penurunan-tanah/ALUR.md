# ALUR: Penurunan tanah dan proyeksi rob

## A1. Penyegaran data (tahunan, di mesin pemilik)

1. Hanya bila Q1 dijawab ya (atau pemilik menjalankan sendiri di terminalnya): pengunduh mengambil pasangan interferogram jendela kota untuk dua frame (naik dan turun) dari CEDA dengan HTTP Range.
2. LiCSBAS02 sampai 16 menghasilkan `vel.filt.mskd`, `E.geo`, `U.geo`, `EQA.dem_par` dan galat baku per piksel.
3. Data mentah dihapus sesudah ML terbentuk; yang tersisa di luar repo hanya raster kecil per kota.

## A2. Hitung dan gerbang

1. `python3 scripts/banjir/subsiden.py hitung ...` mendekomposisi ke vertikal, mereferensikan ke area stabil, mengagregasi per kecamatan (ALGORITMA 1 sampai 3).
2. Gerbang pola dan gerbang validasi dijalankan (ALGORITMA 5 dan 6). Gagal: tidak ada berkas ditulis, kota itu tetap literatur.
3. Lolos: `public/banjir/data/subsiden.json` ditulis; pemilik atau sesi induk men-commit.

## A3. Proyeksi

1. Skrip proyeksi membaca `subsiden.json` dan menghitung penurunan kumulatif 10 dan 20 tahun per kecamatan dengan rentang (ALGORITMA 4), menulis `public/banjir/data/proyeksi_tanah.json`.
2. Bila DeltaDTM tersedia (Q6): hitung luas atau jumlah kelurahan di bawah ambang sesudah penurunan. Bila tidak: bagian itu kosong, bukan nol.

## A4. Layar

1. Peta banjir memuat `subsiden.json` bersama literatur. Bila `subsiden.json` tidak ada atau kota tidak lolos gerbang, lapis dan kartu jatuh ke literatur berlabel, tanpa pesan galat.
2. Klik kecamatan membuka kartu penurunan; kartu rob tetap terpisah.

## A5. Basi

Aturan basi 400 hari dan alasannya ada di ALGORITMA bagian 7: `subsiden.json` lebih tua dari itu tampil dengan tanda "data lebih dari satu tahun". Proyeksi tidak dihitung ulang dari data basi tanpa tanda itu. Berkas tidak hilang sendiri; penggantian hanya lewat A1 sampai A3.
