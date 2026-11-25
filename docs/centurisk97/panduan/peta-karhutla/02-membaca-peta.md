# Membaca peta, status, dan warna

Halaman ini menjelaskan cara memakai tab Peta, arti status dan warna cluster, dan isi laci cluster.

## Tab Peta

1. Buka tab Peta. Peta menampilkan titik panas, cluster, dan wilayah berwarna menurut angka yang dipilih.
2. Pakai kotak cari di panel kiri untuk mencari nama wilayah, taman nasional, gunung, konsesi, atau kode cluster seperti K001.
3. Pilih daftar yang ingin dilihat: Wilayah, Riwayat, atau Cluster. Daftar wilayah turun bertingkat dari provinsi, ke kabupaten atau kota, lalu ke kecamatan.
4. Pilih tanggal: Hari ini, Kemarin, atau Tanggal lain lewat kalender. Satu pilihan berarti satu hari kalender dalam waktu WIB. Tidak ada penjumlahan tiga hari atau tujuh hari pada tombol ini.
5. Pilih ukuran yang ingin ditampilkan di peta dan daftar.

Arti keempat ukuran:

| Ukuran | Artinya |
| --- | --- |
| Hotspot | Jumlah lokasi titik panas yang berbeda pada hari terpilih |
| Cluster | Jumlah kompleks api pada hari terpilih |
| Luas terbakar | Perkiraan hektare dari titik panas dua satelit NOAA (NOAA-20 dan NOAA-21); bisa untuk satu hari, 7 hari, 30 hari, atau setahun |
| Belum padam | Perkiraan hektare api yang masih terdeteksi pada satu hari, dan tidak pernah melebihi luas terbakar wilayah yang sama. Angka ini gambaran keadaan pada hari itu, jadi tidak boleh dijumlahkan antarhari |

Kartu "Prakiraan cuaca (siang)" memilih hari prakiraan untuk lapisan indeks bahaya kebakaran (FWI), angin, asap, dan hujan. Pemilih ini terpisah dari pemilih tanggal karena mengacu ke hari yang akan datang.

Bila hari ini belum punya satu pun titik yang dihitung (misalnya data satelit belum terbit, atau baru lewat tengah malam), peta otomatis menampilkan hari terakhir yang punya titik dan menandainya. Tujuannya supaya angka 0 tidak disangka "tidak ada api".

Tombol lapisan membuka empat kelompok:

- Api dan respons: titik panas, cluster, warna wilayah, luas terbakar dan api yang masih terdeteksi per kabupaten, citra satelit, medan 3D, dan foto lapangan warga.
- Cuaca dan asap: indeks bahaya kebakaran, angin, partikel halus di udara (PM2,5 dan PM10), indeks kualitas udara, dan hujan.
- Lahan: lahan gambut, kesatuan hidrologis gambut, peta moratorium, areal terbakar menurut Kementerian Kehutanan, serta konsesi dan kawasan hutan.
- Infrastruktur: markas Manggala Agni, pangkalan helikopter dan pesawat, serta jarak pandang bandara.

Ada pula tombol Banding untuk membandingkan dua citra dan tombol Timelapse untuk melihat citra harian area yang sedang dilihat.

Contoh alur kerja: Anda ingin tahu apakah ada api yang perlu didahulukan di kabupaten Anda hari ini. Buka tab Peta, ketik nama kabupaten di kotak cari, lalu pilih tanggal Hari ini. Pilih ukuran Cluster supaya wilayah diwarnai menurut jumlah kompleks api. Klik cluster yang berstatus paling berat, baca bagian Penjelasan status dan Cuaca di lokasi pada laci, lalu putuskan apakah perlu patroli atau permintaan pengecekan ke lapangan. Keputusan akhir tetap di tangan petugas.

## Membaca status dan warna cluster

Setiap cluster punya satu dari empat status bernomor 0 sampai 3, dari paling ringan sampai paling berat. Nomor yang sama dipakai di seluruh panduan ini:

0. Pencegahan rutin.
1. Patroli terpadu.
2. Siaga pemadaman awal.
3. Prioritas pemadaman.

Dua pil tambahan membantu menilai apakah api itu nyata. "Firespot (satelit, metode Kemenhut)" menandai cluster yang lolos saringan api nyata. "Mungkin firespot, perlu dicek" menandai cluster yang belum lolos dan perlu dikonfirmasi.

Tiga salah paham yang sering terjadi:

- Angka titik panas di sini menghitung lokasi yang berbeda, bukan jumlah baris deteksi mentah. Karena itu angkanya tidak sama dengan angka SiPongi atau GIS BNPB.
- Luas pada cluster adalah luas perkiraan dari ukuran piksel satelit, bukan luas terbakar. Laci cluster menampilkannya sebagai rentang.
- Cluster yang "tidak terdeteksi" belum tentu padam. Awan, asap, atau jeda antar lintasan satelit bisa menutupi, dan bara di lahan gambut bisa bertahan di bawah permukaan.

## Laci cluster

Klik sebuah cluster di peta atau daftar untuk membuka laci yang berisi rincian. Di layar sempit, isinya tampil sebagai kotak dialog. Bagian-bagiannya bisa dilipat:

| Bagian | Isi |
| --- | --- |
| Kepala | Kode, kecamatan dan kabupaten, status, koordinat, serta tombol simulasi 72 jam, Google Maps, dan bagikan lewat WhatsApp atau tautan |
| Api saat ini | Jumlah piksel menyala 24 jam terakhir, jumlah hari menyala, perbandingan dengan kemarin, luas perkiraan, serta waktu deteksi pertama dan terakhir |
| Insiden api | Nama desa dan kabupaten, kekuatan bukti, kota terdekat, persentase petak yang pernah terbakar pada 2012 sampai 2025, dan apakah api masih terlihat satelit |
| Alasan peringkat | Batang yang menunjukkan seberapa besar tiap faktor menaikkan urutan cluster. Diberi tanda hipotesis |
| Penjelasan status | Dua bahan penentu status (ukuran api dan cuaca) beserta hasilnya |
| Cuaca di lokasi | Indeks bahaya kebakaran dan komponennya, suhu, kelembapan, dan angin |
| Lahan | Tingkat bahaya menurut InaRISK dan apakah lokasi berada di lahan gambut |
| Gambut terbakar di bawah permukaan | Perkiraan luas, kedalaman, massa, dan emisi gas rumah kaca dalam tiga skenario. Hanya tampil bila datanya lengkap |
| Tren lokasi dan prakiraan | Pola kebakaran di sekitar lokasi dari arsip satelit 2012 sampai 2026 |
| Riwayat kecamatan | Jumlah titik per tahun, tahun puncak, dan indeks risiko kecamatan |
