# PRD: Kedalaman gambut hilang dari InSAR

Studi lab yang menjawab apakah penurunan permukaan gambut dari InSAR bisa menggantikan kedalaman bakar literatur di perkiraan emisi bara gambut. Keputusan di `KEPUTUSAN-INSAR.md`.

## 1. Masalah

- `gambut_bara.py` memakai kedalaman bakar 15 sampai 51 cm dari literatur; kita tidak punya ukuran sendiri.
- Pembanding melaporkan tambahan penurunan 1,26 cm di area terbakar, kira-kira 25 kali lebih kecil dari literatur. Kita belum tahu apakah itu sifat gambut atau kelemahan C-band.
- Bila InSAR bisa dipercaya, perkiraan emisi bara punya ukuran independen dari satelit; bila tidak, kita perlu tahu mengapa agar tidak ditiru.

## 2. Pengguna

| Peran | Kebutuhan |
| ----- | --------- |
| Tim model (`validasi-model`) | vonis tertulis dan penjelasan selisih |
| Pimpinan dan staf ahli | tahu apakah angka emisi gambut punya dasar satelit atau tidak |
| Pengerja `pipa-data` dan `banjir` | satu mesin InSAR, tanpa duplikat |

## 3. Fitur

| ID | Fitur | Isi | Tiket |
| -- | ----- | --- | ----- |
| F-1 | Pemeriksaan data | bingkai LiCSAR, pasangan, koherensi, nama lapisan keluaran | IG-01 |
| F-2 | Kriteria terkunci | vonis dan ambang tertulis sebelum lab | IG-02 |
| F-3 | Lab C-band | selisih terbakar lawan kontrol, per jendela waktu | IG-03 |
| F-4 | Uji sebab selisih | salah bungkus, dekorelasi, oksidasi pasca-api | IG-04 |
| F-5 | Kandidat L-band | hanya dicatat; dikerjakan bila Q4 dijawab | IG-05 |
| F-6 | Laporan selisih | InSAR lawan literatur dan penjelasannya | IG-06 |
| F-7 | Jalur kalibrasi bersyarat | hanya bila `selaras` dan Q2 dijawab | IG-07 |
| F-8 | Gerbang | tidak ada angka InSAR di produk tanpa vonis | IG-08 |

## 4. Di luar cakupan

Lihat D10: layar publik, pemantauan nasional, CH4 dan CO dari InSAR, koreksi muka air, mesin InSAR kedua.
