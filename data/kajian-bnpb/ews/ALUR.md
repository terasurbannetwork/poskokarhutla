# ALUR: Panel EWS

## A1. Bacaan masuk (sensor milik sendiri)

1. Alat di lapangan mengirim `POST /api/sensor/baca` bertanda HMAC (alur sudah ada, `src/sensor.js`).
2. Worker menyimpan ke `sensor_baca`, menilai ambang alat; terlewati masuk antrean `pengingat` jenis `sensor_ambang` untuk Pusdalops.
3. Tidak ada peringatan publik yang terpicu dari langkah ini (KEPUTUSAN D6).

## A2. Sumber luar (SIHKA sekarang, sumber berizin nanti)

1. Pipeline yang sudah ada menarik data (SIHKA lewat `scripts/banjir/*`, MAGMA lewat `scripts/gunungapi/magma.py`).
2. Sumber berizin baru (bila Q1 dijawab) ditarik Worker terjadwal, di-cache di `ews/<sumber>/terkini.json` di binding R2 `MEDIA`, tidak di D1 (D9).
3. Adapter mengubah tiap sumber ke bentuk pos bersama (KEPUTUSAN D2).

## A3. Petugas membuka halaman bencana

1. Halaman `/banjir` atau `/gunungapi` memuat; registri `kemampuan.alat` menentukan panel ikut atau tidak.
2. Panel meminta `GET /api/alat/pos?bencana=<id>`: gabungan pos semua sumber yang boleh dilihat perannya (Q2).
3. Tidak ada sumber aktif: panel tidak dirender.
4. Ada pos basi: baris pemberitahuan muncul di atas panel, tidak berupa dialog yang menutupi layar.
5. Petugas memilih pos: peta terbang ke titiknya, kartu pos terbuka, grafik 24 jam dimuat saat itu juga (bukan di awal).
6. Petugas membuka tab CCTV: pemutar baru dimuat saat tab dibuka; tab ditutup, aliran dihentikan.

## A4. Alat terputus

1. Umur bacaan terakhir melewati batas basi jenisnya (Q4).
2. Kartu pos berubah abu, nilai terakhir tetap tampil dengan waktu "terakhir 3 jam lalu".
3. Pemberitahuan tidak berulang tiap muat halaman; ditutup petugas, tersimpan di perangkat per alat per hari.

## A5. Alat gunung api baru (F-8)

1. Staf mendaftarkan alat `geofon` (sesudah migrasi Q3).
2. Kunci alat diturunkan dari secret induk dengan `sensor/gateway/kunci_alat.py` (alur sudah ada).
3. Alat mulai mengirim; pos muncul di panel `/gunungapi`.
