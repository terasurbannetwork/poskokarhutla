# Fitur banjir yang masih dikembangkan

Halaman ini mendaftar fitur banjir yang sudah dihitung atau dirancang tetapi belum tampil di layar.

Bagian ini menjelaskan hal yang sudah dihitung atau dirancang tetapi belum tampil di layar banjir. Anda tidak perlu mencarinya di layar. Semuanya berstatus hipotesis atau rancangan.

## Genangan satelit radar (sudah dihitung, belum tampil di layar banjir)

Bahan: produk Copernicus Global Flood Monitoring dari satelit radar Sentinel-1 (resolusi 20 meter). Satelit melintas sekali tiap 6 sampai 12 hari di satu lokasi, sehingga tidak ada pengamatan harian.

Langkah hitung untuk satu kabupaten dan satu tanggal acuan:

1. Ambil ratusan ribu titik contoh yang tersebar merata di kabupaten.
2. Cari lintasan satelit terbaik dalam 0 sampai 12 hari sesudah tanggal acuan (0 sampai 6 hari untuk kejadian tercatat DIBI), yaitu yang cakupannya paling luas.
3. Cari pengamatan pembanding "sebelum" dari lintasan sejenis, 8 sampai 45 hari lebih awal.
4. Sebuah titik dihitung genangan baru bila sesudah terlihat tergenang dan sebelum teramati kering. Air permanen (sungai, danau) dan area yang tidak bisa dibaca radar (misalnya bangunan padat) dikeluarkan.
5. Hitung cakupan, yaitu persen luas kabupaten yang berhasil diamati.
6. Beri tanda "sinyal lemah" bila genangan baru kurang dari dua kali genangan yang sudah ada sebelumnya pada pengamatan pembanding, karena itu mungkin bukan banjir baru.

Contoh: dari kabupaten seluas 1.000 kilometer persegi, radar berhasil mengamati 600, dan 12 di antaranya terbaca genangan baru. Cakupan 60 persen, dan genangan baru 2 persen dari bagian yang teramati.

Batasnya: luas adalah perkiraan radar dan biasanya lebih rendah dari kenyataan di permukiman dan hutan. Sawah baru dialiri dan tanah basah bisa terbaca tergenang. Banjir singkat yang surut di antara dua lintasan terlewat. Sekitar 75 persen wilayah DKI tidak bisa dibaca radar ini. Jumlah bangunan terendam sengaja tidak ditampilkan karena pada uji di Demak 2024 hasilnya 5 sampai 12 kali lebih rendah dari data kejadian tercatat. Radar bukan bukti negatif: tidak ada genangan yang teramati tidak berarti tidak ada banjir.

## Genangan satelit per kejadian di Kaji Cepat (rancangan)

Belum tampil. Rencananya, tiap kejadian di Buku Besar Kejadian dipasangkan dengan hasil radar terbaik sesudah kejadian, lalu penduduk di area genangan dihitung sebagai rentang (batas bawah dan batas atas) dan ditampilkan berdampingan dengan angka DIBI dan isian petugas, tanpa dijumlah, berlabel "estimasi-model". Bila tidak ada pasangan yang sah, tertulis alasannya, tidak pernah 0. Kata "terdampak", "surut", dan "tidak banjir" tidak dipakai untuk angka radar. Kriteria penilaiannya sudah dikunci sebelum diuji; sampai sekarang pasangan riwayat yang sah baru 10, jadi hasil "tak dapat dinilai" memang diperkirakan.

## Penurunan tanah dari radar satelit dan proyeksinya (belum tampil)

Radar satelit yang sama dapat membandingkan citra dari waktu ke waktu untuk mengukur seberapa jauh permukaan tanah turun (teknik InSAR). Pengolahan dilakukan di luar sistem Centurisk97. Hasil awal untuk Jakarta (2020 sampai 2023) lolos uji pola dan cocok dengan rentang penelitian terbitan, tetapi belum melalui uji menebak paruh akhir data dari paruh awal dan belum ada pembanding pengukuran langsung. Nilai terdalamnya masih lebih dangkal dari titik ukur terkenal di Muara Baru (sekitar 10 cm per tahun menurut literatur). Karena itu hasilnya belum ditayangkan. Kota lain (Semarang, Pekalongan, Surabaya) belum diproses.

Bila kelak tayang, proyeksi 10 dan 20 tahun dihitung sederhana: laju turun per tahun dikali 10 atau 20. Contoh: laju 3 cm per tahun menghasilkan 30 cm dalam 10 tahun dan 60 cm dalam 20 tahun, dengan anggapan laju tidak berubah dan tanpa memperhitungkan pengurangan pengambilan air tanah. Belum ada angka gabungan rob dan penurunan tanah; angka gabungan baru boleh ada setelah diuji terhadap kejadian rob tercatat.

## Simulasi genangan 3D: bahan uji

Simulasi di atas dihitung seluruhnya di peramban Anda: peta ketinggian sekitar 30 meter dipakai sebagai kisi, hujan harian disebar menjadi deret per jam dengan puncak sore, sebagian hujan dihitung menjadi aliran permukaan, lalu air dialirkan antarsel selama 72 jam. Perlakuan (tanggul, pompa, pintu air) mengubah aliran itu dan hasilnya dibandingkan.

Model ini eksperimental dan belum dicocokkan dengan peta genangan nyata, jadi jangan dipakai untuk keputusan. Untuk DKI Jakarta ada uji prospektif musim hujan 2026/27 yang polanya ditetapkan sebelum data uji ada. Model dianggap lulus hanya bila laporan warga cenderung jatuh di sel yang diprediksi lebih dalam dibanding sel acak. Lulus berarti kemampuan relatif terhadap kecenderungan lokasi pelapor, bukan prakiraan genangan yang akurat. Vonis jatuh pada yang lebih dulu antara kejadian ke-10 yang sudah dinilai dan 30 April 2027. Bila jumlah kejadian pemicu kurang dari 6, dipakai ambang pemicu cadangan yang lebih rendah. Hasilnya "belum cukup data" hanya bila ambang cadangan pun tidak memenuhi 6 kejadian, atau laporan yang terkumpul kurang dari 150. Pada uji sebelumnya, sebagian besar laporan yang dipakai ternyata laporan latihan atau simulasi, jadi hasilnya dianggap tidak sah.

## Alat pemantau lapangan

Panel pemantauan alat (sensor tinggi air, hujan, getaran, kamera pemantau) di halaman banjir dan gunung api masih dalam rancangan dan belum bisa dipakai. Yang sudah tampil baru pos tinggi air sungai di peta.

## Model lain yang masih diuji

Beberapa model lain sedang dicoba dan tidak tampil di layar: model peluang banjir per kabupaten, peringatan jam-jaman untuk Jakarta (tidak lulus karena data hujan satelitnya terlambat sekitar 4 sampai 5 jam), peringatan banjir bandang (ambangnya dari literatur dan belum diuji), dan model perkiraan rumah terdampak (lemah). Hasil lengkapnya ada di berkas pengembang. Satu hal yang mendasar: hari banjir yang tidak dilaporkan dihitung sebagai "tidak ada banjir" dalam data uji, sehingga alarm tampak lebih sering salah dari kenyataannya.
