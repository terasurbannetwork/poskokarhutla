# Verifikasi, kartu kejadian, dan rekap

Halaman ini menjelaskan syarat laporan disebut terverifikasi BPBD, kartu kejadian hari ini, rekap data lanjutan, dan waktu respons BPBD.

## Laporan terverifikasi BPBD

Sebuah laporan disebut terverifikasi BPBD hanya bila lima syarat terpenuhi bersamaan:

1. Pengecekan lapangan terakhir hasilnya Valid. Hasil Sebagian benar atau Tidak valid tidak cukup.
2. Pemeriksanya akun BPBD kabupaten, kota, atau provinsi yang wilayahnya mencakup lokasi laporan. Staf BNPB atau orang yang sekadar mengaku petugas tidak cukup.
3. Status tiket bukan Tidak valid.
4. Tidak ada versi laporan yang lebih baru dari pengecekan itu. Contoh: pelapor menambah kabar sesudah BPBD memeriksa, sehingga isinya perlu diperiksa ulang.
5. Tidak ada penarikan aktif atas kejadiannya. Penarikan berarti staf BNPB melepas laporan itu dari kejadian resmi yang tertaut.

Sebuah kelompok laporan terverifikasi bila paling sedikit satu anggotanya terverifikasi, dan hanya angka dampak dari anggota yang terverifikasi yang dipakai.

Contoh: BPBD memeriksa laporan banjir dan menyatakan Valid, tidak ada kabar susulan, dan laporan tidak ditarik. Kelima syarat terpenuhi, jadi laporan itu terverifikasi. Bila hasilnya Sebagian benar, syarat pertama tidak terpenuhi dan laporan tetap belum terverifikasi.

## Kartu kejadian hari ini

Belum tersedia di web. Rencananya, kartu publik ini disusun dari laporan terverifikasi yang pengecekan Valid terakhirnya terjadi dalam 24 jam terakhir, paling banyak 100 kartu. Isinya terbatas pada jenis, waktu dibulatkan ke jam, desa sampai provinsi, titik pusat desa, jumlah pelapor terverifikasi, lencana verifikasi, dan dampak sebagai rentang dari angka terkecil sampai terbesar. Contoh: dua laporan terverifikasi menyebut 8 dan 10 rumah terendam, maka kartu menulis 8 sampai 10 rumah. Koordinat laporan dan foto tidak dipakai. Fitur ini baru dinyalakan bila admin menghidupkannya.

Seberapa bisa dipercaya: jendela 24 jam adalah hipotesis awal.

## Rekap data lanjutan

Rekap dihitung ulang dari daftar objek setiap ada perubahan, bukan diketik.

1. Setiap angka rekap adalah jumlah objek yang cocok. Contoh: rumah rusak berat adalah jumlah rumah yang tingkat kerusakannya rusak berat.
2. Bila belum ada objek dan petugas tidak menandai nihil, angkanya "belum didata", bukan 0.
3. Angka 0 hanya muncul bila petugas menandai nihil, atau semua objek yang tercatat sudah selesai.
4. Jumlah pengungsi dihitung per tanggal: jiwa yang sudah masuk pada tanggal itu dan belum keluar. Tanpa tanggal, nilainya kosong.
5. Tingkat kerusakan rumah dan prasarana dipilih petugas (rusak berat, sedang, atau ringan) mengikuti kriteria modul Siklus: berat bila kerusakan di atas 70 persen, sedang 30 sampai 70 persen, ringan di bawah 30 persen. Sistem tidak menghitung persen itu sendiri, hanya menjumlah objek per tingkat.
6. Bila angka rekap berbeda dengan angka yang diketik petugas untuk hal yang sama, keduanya disimpan dan diberi tanda beda sumber. Sistem tidak memilihkan.

Contoh: dari 5 rumah yang didata, 2 rusak berat, 1 rusak sedang, 2 rusak ringan. Rekap menunjukkan rusak berat 2, sedang 1, ringan 2.

Penanda peringatan pada objek tidak menolak penyimpanan, hanya mengingatkan petugas. Penandanya:

- foto lebih dari 500 meter dari titik objek (contoh: foto diambil 800 meter dari rumah yang didata, sistem memberi tanda);
- foto diambil lebih dari 72 jam sebelum kejadian;
- dua objek berjarak 10 meter atau kurang;
- nomor identitas sama pada dua objek sejenis dalam satu berkas;
- objek tanpa titik;
- objek di luar kabupaten/kota.

Ambang 500 meter, 72 jam, dan 10 meter adalah hipotesis.

Kondisi akhir saat penutupan: berkas dinyatakan selesai bila korban hilang, pengungsi pada hari penutupan, dan prasarana putus semuanya bernilai 0 (bukan kosong). Selain itu berstatus selesai dengan catatan, lengkap dengan alasan per butir. Salinan akhir saat penutupan dikunci dan tidak pernah ditimpa.

## Waktu respons BPBD

Ini untuk staf BNPB. Untuk tiap BPBD dihitung selisih waktu dari laporan diterima sampai dilihat dan sampai diambil, atas laporan 30 hari terakhir atau satu bulan tertentu. Yang ditampilkan adalah median (nilai tengah) dan persentil ke-90, dalam menit. Contoh: median 20 menit berarti separuh laporan sudah dilihat dalam 20 menit; persentil ke-90 sebesar 95 menit berarti 9 dari 10 laporan sudah dilihat dalam 95 menit. Bila laporan satu BPBD kurang dari 5, ditulis "belum cukup data". Tidak ada peringkat dan tidak ada warna baik atau buruk. Tujuannya agar BNPB tahu kapan perlu membantu daerah, bukan untuk menilai petugas.
