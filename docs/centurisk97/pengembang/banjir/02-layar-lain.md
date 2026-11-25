# Layar tren, rob, simulasi, metode

Halaman ini menjelaskan layar Tren, Dampak, Rob, Simulasi, panel alat, dan tab Metode.

## Tren dan Dampak (`/banjir/tren`, `/banjir/dampak`)

Siapa: publik. Tren memuat kartu seri waktu (musim, kejadian per tahun) dengan tabel yang dapat diurutkan. Dampak memuat penduduk, sekolah, fasilitas kesehatan, dan jalan di kecamatan berstatus Siaga atau Awas (`scripts/banjir/dampak.py`).

Arti angka dan batasannya:

- "Penduduk" adalah seluruh penghuni kecamatan berstatus, bukan penghuni area tergenang (sumber WorldPop 2026).
- "Sekolah" dan "faskes" hanya yang tercatat di sumbernya dan cocok nama atau titiknya, sehingga bisa kurang dari kenyataan. Di luar sembilan provinsi cakupan sekolah dan faskes, jumlahnya tidak diisi (bukan 0).
- "Jalan berisiko terputus" adalah panjang jalan kelas 1 sampai 3 di kecamatan Siaga atau Awas dengan indeks bahaya banjir InaRISK 0,66 atau lebih. Ini batas atas, bukan jalan yang pasti tergenang.
- Kartu "penduduk di zona bahaya pada kabupaten dengan peluang hujan lebat" adalah paparan (penduduk zona bahaya dikali peluang hujan), bukan perkiraan korban, dan tanpa klaim akurasi (`scripts/banjir/dampak_kab.py`).

## Rob (kartu pasang, kalender rob, tab `/banjir/rob`)

Siapa: publik. Tab Rob tidak ada di menu tetapi dapat dibuka lewat tautan.

Langkah pakai: klik titik pantai di peta untuk melihat muka laut tertinggi harian 10 hari ke depan, ambang titik itu, gelombang, dan alat ukur pasang terdekat (bila ada). Kalender 30 hari (`public/banjir/kalender_rob.js`) menampilkan satu kotak per hari.

Arti:

- Status rob: Waspada bila muka laut harian tertinggi mencapai persentil 95 titik itu, Siaga persentil 99, Awas bila melewati nilai terbesar dari persentil 99 ditambah 0,10 m dan rekor titik (`scripts/banjir/rob.py:82-88`).
- Tanda "air tinggi dengan gelombang" menyala bila muka laut mencapai persentil 95 dan gelombang maksimum 1,25 m atau lebih (`scripts/banjir/rob.py:91`). Tanda ini tidak mengubah tingkat.
- Kalender: kotak menunjukkan "kekuatan pasang" dari astronomi murni, bukan tinggi air dan bukan prakiraan rob. Kotak oranye berarti pasang tinggi dan hujan diprakirakan di titik itu. Hari di luar jangkauan prakiraan hujan tidak dianggap kering dan kotaknya bergaris putus.
- Rob tidak dicampur ke status banjir. Di prakiraan 3 hari ia tampil terpisah.

## Simulasi skenario dan genangan 3D (`/banjir/sim`, langsung ke genangan: `/banjir/sim?sim=genangan`)

Siapa: publik.

Langkah pakai simulasi skenario:

1. Pilih provinsi, kabupaten, dan jenis (banjir atau longsor) lalu pilih skenario: Prakiraan (status.json apa adanya), Hujan lebih deras (x1,5 atau x2), Hujan ekstrem (jumlah 3 hari minimal X mm), Tanah jenuh, Sungai meluap (debit minimal Q5 atau Q20), Pasang tinggi (`public/banjir/sim.js`).
2. Baca perubahan tingkat status per kecamatan dibanding prakiraan. Tanpa skenario, hasil harus sama persis dengan status.json; tab menampilkan hasil pemeriksaan itu.

Langkah pakai genangan 3D:

1. Buka `/banjir/sim?sim=genangan`, pilih kecamatan atau titik. Halaman mengunduh peta ketinggian di sekitarnya (bawaan mengikuti lebar kecamatan, 6 sampai 24 km, dapat 3 sampai 30 km) dan menghitung 72 jam hujan, luapan sungai, dan pasang di peramban.
2. Gambar tanggul, pasang pompa, atau tutup pintu air, lalu bandingkan hasil dengan dan tanpa perlakuan.
3. Di bawah hasil ada perbandingan dengan kejadian tercatat (DIBI), pita ketidakpastian hujan, lapis tanggap darurat, dan peringkat perlakuan.

Hal yang sering disalahpahami: ini model eksperimental yang belum dicocokkan dengan peta genangan nyata. "Galat neraca massa" yang tampil adalah galat numerik hitungan, bukan akurasi model. Kecamatan yang lebih lebar dari 24 km hanya tercakup sebagian dan layar menyebut persen luas yang tercakup.

## Penurunan tanah (lapisan "Penurunan tanah di bawah rob")

Siapa: publik. Hari ini yang tampil hanya kutipan literatur per kota (titik kota perkiraan, bukan kontur) dengan sitasi dan tanda verifikasi, berlabel hipotesis (`public/banjir/data/subsiden_literatur.json`, `public/banjir/lapis_ekstra.js`). Pengukuran sendiri dari radar belum tayang (Metode 16). Penurunan tanah dan rob tampil terpisah dan tidak dijumlahkan.

## Panel pemantauan alat (sensor dan CCTV)

Belum ada layar. Yang berjalan baru sisi server alat staf (`POST /api/sensor/baca`, `POST /api/sensor/lapor`, `GET /api/sensor/status`) dan pos SIHKA di peta. Panel yang dirancang untuk `/banjir` dan `/gunungapi` (kartu pos, titik di peta, pemberitahuan alat terputus, grafik 24 jam, kisi CCTV) belum dikodekan (Metode 21).

## Tab Metode (`/banjir/metode`)

Siapa: publik. Setiap bab memuat ringkasan, alur data, contoh hitungan dengan data hari ini, rincian teknis, dan batas. Angka kinerja dan jumlah titik di teks dibaca dari berkas JSON saat halaman dibuka (`public/banjir/metode.js`), sehingga ikut berubah bila data berubah.
