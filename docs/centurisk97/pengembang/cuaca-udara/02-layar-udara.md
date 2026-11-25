# Layar udara, sortie OMC, renlap OMC

Halaman ini menjelaskan layar Kualitas Udara, tab Operasi di dalamnya, halaman admin sortie OMC, dan halaman Renlap OMC.

## Halaman Kualitas Udara (`/udara/`)

- **Jalur dan akses**: `https://centurisk97.id/udara/`, publik. Status `aktif`, tidak muncul di menu bencana (`"menu": false`).
- **Tab**: Peta, Kejadian (hanya bila ada gugus kabupaten/kota bersebelahan dengan PM2,5 rata-rata 24 jam prakiraan CAMS di atas 55,4 µg/m³ pada berkas `kejadian_udara_awal.json` yang tidak basi lebih dari 1 hari; ditulis `scripts/umum/kejadian.py`, `public/udara/kejadian.js:1-8`), Insight, Berita, Tren, Dampak, Simulasi, Foto, Tentang, Metode, dan Operasi (hanya bila sesi boleh membaca rute operasi) (`public/udara/app.js` daftar `TABS`).

Langkah pakai:

1. Buka `/udara/`. Peta menampilkan PM2,5 per kabupaten/kota yang diinterpolasi, titik METAR bandara berwarna menurut jarak pandang, stasiun BMKG, kompleks api, lintasan asap, dan PLTU. Pilih hari (hari ini sampai tiga hari) dan jam.
2. Klik kabupaten/kota untuk membuka laci kota: PM2,5 per jam 72 jam, kategori, jiwa, asal asap, dan saran.
3. **Insight** memuat kartu: Jiwa per kategori, Kabupaten/kota, Peluang PM2,5 melewati batas, Asal asap, Jarak pandang bandara, Stasiun BMKG, Kualitas udara bulanan BMKG, Satelit TROPOMI (CO), dan Rapor model (`public/udara/insight.js:20`).
4. **Tren** menampilkan riwayat PM2,5 dan jiwa, kalender musim asap, serta ENSO dan titik panas.
5. **Dampak** menghitung penduduk, balita dan lansia, kasus ISPA tambahan, sekolah, dan jarak pandang bandara di wilayah berstatus Waspada atau lebih.
6. **Simulasi** (`public/udara/sim/`) mencoba skenario emisi dan tanggap; hasilnya bukan prakiraan resmi.

Kategori PM2,5 rata-rata 24 jam (Permen LHK P.14/2020; `public/udara/app.js` konstanta `BATAS`, `scripts/udara/alat.py:18`):

| Kategori | PM2,5 (µg/m³) | Status kota |
| -------- | ------------- | ----------- |
| Baik | 0 sampai 15,5 | Normal |
| Sedang | 15,6 sampai 55,4 | Normal |
| Tidak sehat | 55,5 sampai 150,4 | Waspada |
| Sangat tidak sehat | 150,5 sampai 250,4 | Siaga |
| Berbahaya | di atas 250,4 | Awas |

![Batas atas lima kategori PM2,5 rata-rata 24 jam dan status kotanya. Sumber angka: Permen LHK P.14/2020 seperti dikodekan di public/udara/app.js (konstanta BATAS) dan scripts/udara/alat.py:18.](gambar/cuaca-udara-semai-tangga-pm25.svg)

Hal yang sering disalahpahami:

- Angka adalah **perkiraan model CAMS** (resolusi sekitar 40 km), belum dikoreksi ke alat ukur. Label "perkiraan model CAMS, belum dikoreksi" tampil di kartu yang memuat jiwa. Ini bukan ISPU resmi KLHK.
- Jiwa selalu dibulatkan dan diberi kata "sekitar".
- PM2,5 per jam bukan kategori; kategori hanya untuk rata-rata 24 jam.
- Stasiun BMKG dan ISPU KLH tampil sebagai pengukuran terpisah dan tidak masuk hitungan jiwa, kategori provinsi, atau kota.
- Persen "asal asap" adalah bobot relatif dari model, bukan penetapan siapa yang membakar; nama badan usaha di lokasi api hanya menunjukkan titik panas berada di areal izin.
- Jarak pandang bandara dipengaruhi kabut dan hujan, bukan hanya asap; laporan METAR lebih tua dari 12 jam dibuang.

## Tab Operasi di /udara (kondisional)

Tab muncul hanya bila registri menyalakan kemampuan operasi dan sesi boleh membaca `GET /api/pb/titik`. Isinya komponen inti (`public/inti/pb_titik.js`, `renlap.js`) tanpa rute atau tabel baru (`public/udara/operasi.js:1-5`).

## Halaman admin sortie OMC (`/admin/omc`)

- **Akses**: moderator atau staf berperan. Menulis: peran `tmc`; membaca: `tmc`, `koordalops`, `pimpinan`, `operator_cc` (`src/omc.js:22`). Staf berwilayah hanya melihat dan menulis sortie yang provinsinya di wilayahnya.
- **Langkah**: (1) buat operasi (nama, provinsi, tanggal mulai dan selesai, opsional); (2) tambah sortie: registrasi pesawat, tanggal WIB, jam mulai dan selesai (boleh kosong bila tidak diketahui), bahan (NaCl atau dry ice), kilogram, ketinggian (kaki, opsional), sasaran berupa kabupaten/kota (maksimal 20) atau poligon, dan catatan; (3) ubah atau hapus (hapus bersifat lunak); (4) lihat kartu hasil evaluasi dari pipeline.
- **Aturan isian** (`src/omc.js:76-104`, `migrations/0033_omc.sql`): tanggal sortie dalam setahun terakhir sampai dua hari ke depan; satu sortie paling lama 12 jam (jam selesai sebelum jam mulai dianggap lewat tengah malam); kg 0,1 sampai 20.000; ketinggian 0 sampai 60.000 kaki; poligon bertipe Polygon, maksimal 500 titik, di dalam kotak Indonesia, cincin tertutup.
- Jam yang tidak diketahui disimpan kosong, bukan angka karangan; sortie tanpa jam tidak ikut evaluasi.
- Kartu hasil hanya menampilkan **kesesuaian** (sejalan, tak terbedakan, berlawanan, data kurang), tidak pernah sebab-akibat.

## Halaman Renlap OMC (`/renlap-omc?zona=YYYYMMDDHH-X`)

Halaman cetak dua halaman: halaman 1 berisi peta rute di atas citra Esri, sasaran, ketinggian, bahan, jumlah; halaman 2 berisi tabel leg dan check point untuk pilot (haluan benar dan magnetis, radial dan jarak VOR, jarak NM, menit). Data dibaca dari arsip putaran `GET /api/operasi/semai/berkas/arsip/<putaran>.json`; layar tidak menghitung ulang rute (`public/renlap_omc.js:1-4`). Rute dilayani Worker pada `src/worker.js:736`.
