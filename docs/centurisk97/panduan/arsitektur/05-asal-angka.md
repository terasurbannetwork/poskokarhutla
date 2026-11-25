# Dari mana angka berasal sampai ke layar

Halaman ini menjelaskan jalur angka dari sumber sampai tampil di layar, cara menentukan data segar, dan cara privasi pengunjung dijaga.

## Dari mana angka berasal dan bagaimana sampai ke layar

Angka tidak dihitung saat Anda membuka halaman. Prosesnya berjalan terjadwal di belakang layar:

1. Sistem mengambil data dari sumber luar: satelit NASA (titik panas), BMKG (cuaca, gempa, peringatan), PVMBG (gunung api), Open-Meteo (layanan data cuaca terbuka), dan DIBI BNPB (kejadian bencana).
2. Data dirapikan dan dihitung menjadi angka, kluster titik, peluang, dan prakiraan.
3. Hasilnya diperiksa otomatis. Bila pemeriksaan gagal, hasil tidak ditayangkan, sehingga angka yang salah tidak sampai ke layar.
4. Hasil yang lolos ditayangkan. Peta dan data terbuka membaca hasil yang sama, sehingga angkanya tidak berbeda.

Pekerjaan berat dilakukan di belakang layar, bukan saat halaman dibuka, agar situs tetap cepat dan tidak mati saat ramai.

Pembaruan otomatis kadang terlewat. Sistem memeriksa tiap jam dan menjalankan ulang pekerjaan utama yang terlewat. Titik panas punya pemeriksa tambahan: bila lebih dari 4 jam belum ada pembaruan yang berhasil, pembaruan dijalankan lagi. Pemeriksaan ulang ini hanya mencakup pekerjaan utama (titik panas, Himawari, jarak pandang, kualitas udara, semai awan, data harian, banjir, dan gempa). Pekerjaan lain bisa terlambat tanpa dijalankan ulang otomatis.

## Cara menghitung titik panas sebagai angka utama

1. Satelit mendeteksi titik panas. Deteksi dari empat sensor satelit (MODIS dan tiga satelit VIIRS) dipakai, semua tingkat keyakinan.
2. Wilayah dibagi menjadi kotak sekitar 375 meter. Beberapa deteksi dalam kotak yang sama pada satu hari dihitung satu kali. Hasilnya disebut "lokasi unik". Hari dihitung menurut waktu WIB.
3. Titik yang berdekatan dikelompokkan menjadi kluster. Kluster yang lolos syarat firespot dihitung sebagai firespot. Syaratnya ada di panduan karhutla.
4. Angka dijumlahkan per hari WIB, lalu per kabupaten/kota, provinsi, dan nasional.

Contoh: pada hari Selasa satelit mencatat 5 deteksi. Tiga di antaranya jatuh di satu kotak 375 meter yang sama, dan dua lainnya di dua kotak berbeda. Lokasi unik hari itu adalah 1 + 2 = 3, bukan 5. Bila ketiga lokasi itu berada dalam satu kluster yang lolos syarat firespot, ketiganya dihitung sebagai 3 firespot.

Titik panas adalah petunjuk dari satelit, belum tentu kebakaran. Bisa jadi sumber panas tetap seperti industri, dan sistem memiliki daftar sumber panas tetap untuk menyaringnya.

## Cara menentukan data masih segar

1. Sumber utama punya batas umur masing-masing. Batas tidak selalu sama dengan selang pembaruannya, karena dibuat sedikit lebih longgar agar keterlambatan kecil tidak langsung dianggap gangguan. Contoh: titik panas diperbarui tiap 3 jam, batasnya 8 jam. Batas lain, misalnya berita 30 jam, citra Himawari 3 jam, gempa terbaru setengah jam, prakiraan cuaca jangka sangat pendek 2 jam, kualitas udara 18 jam.
2. Setiap jam sistem membandingkan umur data dengan batasnya.
3. Sumber yang melewati batas ditandai basi. Sumber yang punya batas tetapi waktunya tidak terbaca juga ditandai basi. Sumber tanpa batas hanya dilaporkan.
4. Hasilnya dicatat tiap jam sehingga riwayat gangguan dapat dilihat.

## Cara melindungi privasi pengunjung

1. Alamat jaringan pengunjung tidak pernah disimpan. Yang disimpan hanya kode acak yang dibuat dari alamat itu dan tidak bisa dibalik menjadi alamat asli.
2. Kunci pembuat kode acak diganti tiap hari WIB dan kunci lama dimusnahkan, sehingga kode kemarin tidak bisa dicocokkan dengan hari ini.
3. Statistik pengunjung membedakan manusia, asisten AI, dan robot pencari seperti Google. Kunjungan dari jaringan pusat komputer (bukan pengguna rumahan atau kantor) tidak dihitung sebagai manusia.
4. Penghitungan pengunjung tidak menyimpan apa pun di perangkat Anda. Pengunjung yang masuk ke halaman terkunci memakai tanda masuk (cookie) agar tetap dikenali selama bekerja, dan sebagian halaman menyimpan pengaturan tampilan di peramban Anda. Keduanya terpisah dari penghitungan pengunjung.

## Batas pemakaian untuk mencegah penyalahgunaan

Pengambilan data berkunci dibatasi per jam untuk tiap kunci, dan pengambilan riwayat lokasi dibatasi per jam untuk tiap jaringan internet. Bila batas terlewati, permintaan ditolak dan Anda perlu menunggu sekitar satu jam. Bila penolakan terus berulang, hubungi admin. Laporan warga juga dibatasi per jam dan per hari agar tidak dibanjiri laporan palsu.

## Seberapa bisa dipercaya

Bagian ini menjelaskan cara kerja sistem, bukan model prediksi, sehingga tidak ada uji balik untuknya. Ukuran kepercayaannya adalah kebaruan data (lihat halaman Status data) dan asal sumbernya.

Model risiko dan prediksi di panduan lain berbeda. Bila belum lulus uji balik, model itu ditampilkan berlabel hipotesis: belum terbukti cukup tepat, pakai sebagai bahan pertimbangan. Contoh uji balik: bila model mengeluarkan 100 peringatan dan hanya 40 yang diikuti kejadian nyata, ketepatannya 40 persen, dan itu dituliskan apa adanya.
