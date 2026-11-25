# Prioritas provinsi dan insiden api

Halaman ini menjelaskan aturan Prioritas provinsi, pelacakan insiden api, serta dua metode yang belum tampil di layar.

## Prioritas provinsi

Data: jumlah titik panas unik semua satelit per provinsi (satuan laporan BNPB).

Langkah hitung:

1. Hitung rata-rata tiga hari lengkap terakhir.
2. Provinsi masuk daftar Prioritas bila rata-rata itu mencapai garis masuk.
3. Provinsi keluar dari daftar hanya bila rata-rata di bawah garis keluar selama tiga hari berturut-turut. Selama belum keluar, statusnya Bertahan.

Garis masuk dan keluar dihitung untuk satuan laporan BNPB, yang memakai lebih banyak satelit dibanding hitungan satu jenis satelit saja. Garis dasarnya masuk 60 dan keluar 30, lalu dikalikan 2,4 sejak satelit S-NPP berhenti dipakai (berlaku mulai 3 November 2026). Jadi garis yang berlaku sekarang adalah masuk 144 dan keluar 72. Pengali sebelumnya (3,0) sudah tidak dipakai.

Contoh: sebuah provinsi mencatat 150, 160, dan 145 titik pada tiga hari terakhir. Rata-ratanya sekitar 152, di atas garis masuk 144, sehingga berstatus Prioritas. Setelah itu ia baru dicabut bila rata-rata tiga hari di bawah 72 selama tiga hari berturut-turut.

Seberapa bisa dipercaya: aturan ini dipilih oleh pengelola Centurisk97 pada 11 November 2026 sesudah uji balik atas data 2023 sampai 2025. Uji balik adalah menjalankan aturan pada data masa lalu yang kejadiannya sudah diketahui, lalu mencocokkan hasilnya. Aturan lama (rata-rata 7 hari, masuk 50 dan keluar 25) sudah diganti.

## Insiden api

Cluster hanya potret satu saat dan bentuknya bisa berubah. Insiden memberi identitas tetap pada cluster berstatus 2 ke atas, supaya api yang sama bisa diikuti dari hari ke hari.

Contoh perjalanan satu insiden: pada hari pertama sebuah cluster berstatus 2 muncul dan diberi nomor insiden. Hari kedua bentuknya berubah dan sebagian titiknya bergeser, tetapi masih sampai 0,6 km dari insiden itu sehingga tetap memakai nomor yang sama. Hari ketiga tidak ada deteksi, jadi insiden berstatus tak terdeteksi (bukan padam). Bila api menyala lagi dalam 3 hari (10 hari di gambut), nomor yang sama dipakai kembali.

1. Cluster dicocokkan dengan insiden yang sudah ada bila jarak terdekatnya sampai 0,6 km atau titiknya jatuh di dalam garis luar insiden lain.
2. Bila menyentuh beberapa insiden lama, yang tertua dipakai dan sisanya digabung.
3. Nomor insiden berisi kode provinsi, tanggal deteksi pertama, dan nomor urut.
4. Insiden berstatus aktif, tak terdeteksi, atau gabung. Tak terdeteksi bukan padam. Insiden yang tidak terlihat tetap dikenali selama 3 hari.
5. Luas terkoreksi dihitung dari jumlah deteksi sejak awal dikali luas per deteksi yang berbeda tiap provinsi (diturunkan dari perbandingan luas resmi dengan jumlah deteksi tahun-tahun sebelumnya). Hasilnya perkiraan untuk perencanaan, bukan luas yang sudah diverifikasi.
6. Kekuatan bukti dinilai kuat bila api terlihat dalam sedikitnya dua lintasan dari dua satelit berbeda (atau selang sedikitnya 6 jam), atau ada dua piksel dalam satu lintasan, atau ada deteksi malam, atau ada piksel berkeyakinan tinggi. Setelah kuat, tidak turun lagi.
7. Insiden dinyatakan tumbuh atau menyusut bila selisihnya sedikitnya 25 persen dan deteksinya sedikitnya 4.

## Perkembangan api per insiden (hipotesis, belum tampil di layar)

Metode ini menebak kapan api tiba di tiap kotak 375 m dan menyusun garis depan api tiap hari pukul 14.00 WIB. Waktu tiba ditaksir di tengah jeda antara dua lintasan satelit. Luas yang dijangkau garis depan hanyalah batas atas, bukan luas terbakar. Laju penjalaran yang terlalu kecil untuk diukur satelit ditulis belum terukur, bukan nol, dan perkiraan titik awal hanya berupa lingkaran galat, bukan satu titik pasti. Insiden dengan kurang dari 20 piksel unik ditulis "terlalu kecil untuk dilacak".

Seberapa bisa dipercaya: masih hipotesis. Pada uji balik data 2019 dan 2023, 82 dari tiap 100 tebakan waktu tiba tepat dalam selang 24 jam, lebih baik daripada cara paling sederhana (75 dari 100). Pada data musim ini hanya satu insiden cukup besar untuk diuji, sehingga belum ada vonis. Uji ini mengukur ketepatan tebakan waktu tiba, bukan kecocokan dengan peta batas api yang sebenarnya.

## Bangunan dekat api per insiden (belum tampil di layar)

Metode ini memperkirakan jumlah bangunan dalam 500 m dari kotak api memakai peta bangunan Open Buildings. Satu bangunan dihitung sekali walau dijangkau banyak kotak, dan angka dibulatkan: di bawah 5 ditulis "kurang dari 5", selain itu dibulatkan ke kelipatan 5. Provinsi yang belum punya data ditulis "belum tercakup", bukan 0. Angka ini tidak boleh dijumlahkan dengan angka paparan bangunan jenis lain.
