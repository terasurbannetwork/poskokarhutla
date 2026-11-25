# Titik panas dan cluster dihitung

Halaman ini menjelaskan cara angka titik panas dan cluster atau kompleks api dihitung.

## Titik panas yang dihitung

Titik panas adalah lokasi yang dideteksi satelit lebih panas dari sekitarnya. Satu aturan yang sama dipakai untuk semua angka titik panas di layar.

Data: pengamatan satelit pemantau api milik NASA. Beberapa satelit bekerja bersamaan, dan satu di antaranya (S-NPP) berhenti dipakai sejak 1 November 2026. Angka tetap utuh karena satelit lain melewati wilayah yang sama. Data diperbarui tiap tiga jam. Nama teknis sensornya: MODIS (petak sekitar 1 km) dan VIIRS (petak sekitar 375 m).

Langkah hitung:

1. Ambil semua deteksi dari semua satelit, dengan semua tingkat keyakinan, termasuk keyakinan rendah. Alasannya, api gambut bersuhu rendah dan sering tertutup asap sehingga sinyalnya jatuh di kelas rendah, dan bila dibuang api gambut ikut terlewat. Akibatnya, di luar gambut sebagian titik bisa ternyata bukan api. Karena itu angka ini dipakai sebagai petunjuk letak, bukan bukti api.
2. Buang titik yang berada di sumber panas tetap seperti smelter, tambang, kilang, dan pembangkit listrik.
3. Bagi wilayah menjadi kotak-kotak sekitar 375 m. Dalam satu hari kalender WIB (hari menurut jam Indonesia barat), setiap kotak yang punya deteksi dihitung satu kali, berapa pun jumlah satelit atau lintasannya.
4. Tentukan provinsi, kabupaten, dan kecamatan tiap titik dari letaknya pada peta batas wilayah.

Mengapa kotak dihitung sekali: dua satelit NOAA melintas dengan selang sekitar 50 menit di jalur yang sama, sehingga api yang sama terhitung dua kali bila titik mentah dijumlah. Pada contoh nyata 25 Oktober 2026 di Kalimantan Tengah, sekitar enam dari sepuluh titik satelit NOAA-21 jatuh di kotak yang sudah terdeteksi satelit lain pada hari itu.

Contoh: bila pada satu hari tiga lintasan satelit sama-sama melihat api di kotak yang sama dan dua lintasan lain melihat api di kotak sebelahnya, angka titik panas hari itu adalah 2, bukan 5.

Seberapa bisa dipercaya: ini hitungan deteksi, bukan luas terbakar. Satelit hanya lewat sekitar dua kali sehari, awan menutup pandangan, dan gambut bisa membara tanpa terdeteksi. Tidak ada titik tidak berarti tidak terbakar.

## Cluster atau kompleks api

Data: titik panas VIIRS dari tiga satelit, hanya yang berkeyakinan nominal atau tinggi (lebih ketat dibanding angka utama), dalam jendela tujuh hari. Diperbarui harian dan tiap tiga jam.

Langkah hitung:

1. Titik yang berjarak sekitar 0,6 sampai 1,5 km (menyesuaikan kepadatan) dan terdeteksi dalam selang 48 jam digabung menjadi satu cluster. Titik tunggal tetap menjadi satu cluster.
2. Cluster dianggap aktif bila ada deteksi dalam 72 jam terakhir. Di gambut kering batasnya 168 jam, karena bara bawah permukaan bisa lolos dari pengamatan.
3. Luas perkiraan dihitung dari jumlah piksel, satu piksel VIIRS setara 14,0625 hektare. Karena satu piksel bisa hanya terbakar sebagian, layar menampilkan rentang 30 persen sampai 100 persen dari luas piksel.
4. Titik di dalam radius 3 km dari gunung api yang pernah meletus sejak 2000 tidak dianggap kebakaran hutan dan lahan.
