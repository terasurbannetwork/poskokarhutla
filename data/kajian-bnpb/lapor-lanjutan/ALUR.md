# ALUR: Data lanjutan BPBD

## 1. Dari laporan awal ke tahap 2

1. Petugas BPBD terkonfirmasi (`bpbd`) menyelesaikan laporan awal seperti warga (K1). Tiket `LA-` terbit.
2. Mesin membuat berkas (D2) dan membalas di chat yang sama: "Laporan awal diterima. Lanjut data per rumah, prasarana, pengungsi, dan korban di sini atau lewat tautan ini." Tautan web bertoken menyusul.
3. Pelapor `bpbd_klaim` dan `warga` tidak mendapat pesan ini (D1).

## 2. Mengisi satu objek lewat WA

1. Ketua atau anggota mengetik jenisnya ("data rumah", "jembatan rusak", "pengungsi", "orang hilang") atau memilih dari daftar bernomor.
2. Mesin menanyakan isian wajib satu per satu sesuai spek jenis itu (ALGORITMA bagian 2). Jawaban bebas diurai AI berkutipan; yang tidak berkutipan ditanya ulang.
3. Mesin meminta foto. Foto pertama yang punya titik menjadi titik objek bila titik belum diisi. Foto tanpa titik diterima berlencana `tanpa` dan mesin meminta titik lewat bagikan lokasi WA.
4. Ringkasan objek ditampilkan; "simpan" menyimpan, "ubah <isian>" mengubah. Objek tersimpan bernomor urut per jenis di berkas (`Rumah 12`).
5. "lagi" mengulang jenis yang sama dengan desa terakhir sebagai bawaan.

## 3. Mengisi lewat web

1. Tautan membuka `/lapor/data/`: tab per jenis objek, peta titik, tombol Tambah.
2. Form per objek dari spek yang sama. Foto diambil langsung dari kamera; titik dari GPS peramban, cadangan EXIF.
3. Tanpa sinyal: simpan masuk antrean luring, kartu objek berpita "Belum terkirim"; terkirim otomatis saat daring.

## 4. Tim

1. Ketua: "tim tambah 0812xxxx" atau tombol Tambah anggota.
2. Nomor itu menerima pesan pembuka berkas dan ditanya namanya. Ia berlabel `bpbd_tim` untuk berkas itu saja dan mendapat tautan web sendiri.
3. "tim cabut 0812xxxx" atau tombol Cabut (ketua, staf Pusdalops, admin); anggota lain tidak terputus. Objek yang sudah diisi anggota tetap ada, tercatat siapa pengisinya.

## 5. Perubahan status orang

1. Korban hilang ditemukan: "ubah hilang 3 ditemukan hidup" atau tombol di kartunya. Riwayat tercatat.
2. Pengungsi pulang: isi tanggal keluar. Rekap harian titik berubah mulai tanggal itu.

## 6. Rekap ke meja lain (otomatis, staf menerima)

1. Tiap simpan objek menghitung ulang rekap berkas (ALGORITMA bagian 4).
2. Rekap rumah, korban, prasarana, dan pelayanan dasar masuk kolom bersumber daftar di satu catatan meja `dampak` milik berkas itu; bila angka ketikan lain sudah ada, keduanya tampil berdampingan dan staf memilih. Catatan yang sudah diverifikasi hanya mendapat tanda rekap baru.
3. Rekap harian per titik masuk meja `pengungsi`.
4. Prasarana yang putus atau terbatas sampai ke Lifeline lewat kolom prasarana meja `dampak`; staf yang menetapkan status Lifeline. Lifeline dan Jitupasna menunggu berkas tertaut ke kejadian Buku Besar.
5. Staf menekan Terima untuk memindahkan rumah dan prasarana ke Jitupasna.

## 7. Pertanyaan harian dan penutupan

1. Jam yang ditetapkan (Q3), ketua tiap berkas terbuka menerima ringkasan berkas dan "Kejadian ini masih berlangsung? Balas *masih* atau *selesai*."
2. *masih*: mesin menanyakan apakah ada perubahan hari ini dan menunjuk bagian yang masih "belum didata".
3. *selesai*: mesin meminta tanggal selesai, SK pencabutan status atau SK transisi (foto atau PDF, opsional), dan foto kondisi akhir.
4. Mesin menampilkan kondisi akhir dari daftar. Bila ada korban hilang, jiwa di pengungsian, atau prasarana putus, statusnya "selesai dengan catatan" dan ketua melihat rinciannya.
5. Ketua mengonfirmasi. Berkas dibekukan jadi versi 1. Staf Pusdalops menerima penutupan (Q2); baru saat itu tiket `LA-` pindah ke `selesai` dan usulan fase masuk Buku Besar.
6. Ketua tidak menjawab: pertanyaan esok hari tetap dikirim. Tidak ada penutupan otomatis.

## 8. Sesudah ditutup

Perubahan (misalnya korban hilang ditemukan seminggu kemudian) membuka berkas lagi untuk objek itu dan menghasilkan versi baru; versi lama tetap ada.
