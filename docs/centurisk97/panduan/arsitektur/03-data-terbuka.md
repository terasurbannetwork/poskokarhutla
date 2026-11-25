# Mengambil data terbuka

Halaman ini menjelaskan cara mengambil data Centurisk97 yang terbuka untuk umum.

## Mengambil data terbuka

Data titik panas, ringkasan wilayah, kualitas udara, dan peringatan dini dapat diambil gratis tanpa kunci. Halaman Dokumentasi Data (centurisk97.id/api, perlu masuk lebih dulu) mencantumkan tiap data, alamat unduhnya, dan penjelasan kolomnya.

Langkahnya:

1. Buka halaman Dokumentasi Data lalu pilih data yang dibutuhkan dari daftar.
2. Buka alamat unduhnya di peramban. Hasilnya berkas data dengan akhiran JSON, yaitu teks terstruktur yang dapat dibaca program lembar kerja.
3. Di Excel, berkas ini dapat dibuka lewat menu Data, Ambil Data, Dari Berkas, Dari JSON. Bila kesulitan, minta bantuan staf teknologi informasi di instansi Anda.
4. Lihat waktu pembuatan data di dalam berkas untuk mengetahui seberapa baru isinya.

Data yang tersedia dan jadwal pembaruannya:

| Data | Isi | Diperbarui | Artinya bagi Anda |
| --- | --- | --- | --- |
| Titik panas 24 jam dan 72 jam | Lokasi, waktu, satelit, kekuatan panas, tingkat keyakinan | Tiap 3 jam | Gambaran terbaru titik panas |
| Titik panas satelit Himawari (satelit cuaca Jepang) | Titik panas dari satelit yang memindai ulang | Tiap 30 menit | Lebih sering diperbarui, lebih kasar |
| Ringkasan data | Waktu data terakhir, jumlah titik dan kluster | Tiap 3 jam | Cek cepat kebaruan |
| Laporan harian karhutla | Luas dan jumlah titik tahun berjalan per provinsi | Tiap 3 jam, ditutup malam hari | Angka resmi hari itu baru final sesudah ditutup |
| Titik panas harian sepanjang tahun | Per provinsi dan per kabupaten/kota | Harian | Bahan tren dan perbandingan |
| Kumulatif tahun berjalan | Titik panas dibanding tahun lalu | Harian | Perbandingan antartahun |
| Indeks bahaya kebakaran (FWI) | Per kotak sekitar 55 km | Harian | Seberapa mudah api menjalar karena cuaca |
| Peringatan dini cuaca dan gelombang BMKG | Peringatan aktif | Beberapa kali sehari | Peringatan resmi tetap dari BMKG |
| Peringatan cuaca jangka sangat pendek BMKG (prakiraan beberapa jam ke depan) | Peringatan cuaca untuk beberapa jam ke depan | Tiap 10 menit | Untuk keputusan cepat |
| Gempa | Daftar gempa terbaru, dan hasil olahan harian | Tiap menit; harian | Daftar terbaru, bukan status tsunami |
| Level gunung api | Level dari PVMBG | Dua kali tiap jam | Status resmi tetap dari PVMBG |
| Jarak pandang | Jarak pandang bandara dari BMKG | Tiap jam, sekitar pukul 05 sampai 17 WIB | Hanya siang hari |
| Prakiraan kualitas udara | Per provinsi dan kabupaten/kota, dengan jumlah jiwa terpapar | Dua kali sehari | Gambaran, bukan hasil alat ukur |
| Peluang semai awan | Peluang awan layak disemai | Dua kali sehari | Bahan perencanaan operasi |
| Lapisan peta tetap, seperti bangunan dan penduduk | Data dasar | Bulanan | Jarang berubah |

Jadwal di atas adalah jadwal perhitungan, bukan jaminan. Titik panas, misalnya, baru berubah tiap 3 jam. Membuka berulang dalam waktu dekat tidak memberi angka baru.

Cara lain mengambil data:

1. Riwayat titik panas satu lokasi. Masukkan lintang dan bujur lokasi (di aplikasi peta di ponsel, tekan lama pada titik lokasi untuk melihat koordinatnya). Hasilnya pola masa lalu di sekitar lokasi: jumlah titik per tahun, per bulan, lama kejadian, serta awal dan akhir musim. Misalnya sebuah lokasi punya 40 titik dalam sekitar 16 km sejak 2012, maka riwayatnya tampil. Bila lokasi tidak punya sedikitnya 20 titik dalam jarak itu sejak 2012, jawabannya "tidak ada riwayat". Artinya di sana jarang terjadi kebakaran, bukan angka nol yang dihitung.
2. Firespot per wilayah. Jumlah firespot pada satu hari, per provinsi, kabupaten/kota, dan kecamatan. Arsip hanya disimpan 8 hari terakhir.
3. Berlangganan peringatan lewat pembaca berita otomatis (RSS). Tersedia peringatan nasional dan per provinsi. Cara ini umumnya dipakai peneliti, wartawan, atau pengembang aplikasi, bukan staf BPBD sehari-hari.

Asisten AI juga bisa memakai data yang sama lewat sambungan khusus. Bagian ini untuk staf teknologi informasi dan dijelaskan langkahnya di dokumentasi pengembang.
