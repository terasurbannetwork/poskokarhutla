# Layar paparan, kaji cepat, pemulihan

Halaman ini menjelaskan cara memakai layar paparan, kaji cepat, pemulihan, rencana kontinjensi, dan risiko masa depan.

## Peta paparan: centurisk97.id/siklus/paparan

1. Pilih provinsi dan kabupaten.
2. Baca jumlah bangunan dan jiwa yang berada di tiap zona bahaya, lalu fasilitas vital menurut jenis.
3. Tombol "Tampilkan sel 110 m di peta" memuat rincian per kotak 110 meter. Rincian ini hanya untuk Pusdalops, Koordalops, Super Admin, dan akun BPBD wilayahnya.

Semua angka berlabel perkiraan model. Jiwa terpapar tampil dari tiga sumber sekaligus (WorldPop, Dukcapil, dan GHSL) dan selisihnya ditulis, tidak dirata-rata. Provinsi tanpa data bangunan ditulis "tidak terliput", bukan 0. Ingat bahwa ini paparan, yaitu apa yang berada di dalam zona, bukan dampak yang sudah terjadi.

## Kaji cepat: centurisk97.id/siklus/kaji

Perkiraan dampak dalam hitungan jam untuk gempa dan banjir.

1. Buka daftar. Satu baris adalah satu hasil perhitungan untuk satu kejadian.
2. Buka satu baris untuk membaca rentang perkiraan, dasar model, dan petugas yang memeriksa.
3. Pusdalops atau Koordalops mengubah status menjadi diperiksa, dipakai, atau ditarik (status "dihitung" dan "menunggu data" dibuat otomatis oleh sistem). Menarik sebuah hasil wajib beralasan dan tidak bisa dibatalkan; hasil yang salah diganti dengan perhitungan baru.

Hasil selalu berupa rentang dua angka (batas bawah sampai batas atas), tidak pernah satu angka, dan tidak pernah disebut angka resmi BNPB. Untuk gempa, perkiraan korban jiwa dari dua model (PAGER, model pemerkira korban gempa dari lembaga geologi Amerika Serikat, dan model ITB) tampil berdampingan, dengan kelas siaga hijau, kuning, oranye, atau merah. Untuk banjir, rentang jiwa terpapar. Bila kedalaman genangan tidak ada, kerusakan tidak dihitung dan layar menulis "kedalaman belum tersedia". Untuk karhutla dan gunung api hanya paparan yang tampil. Jenis lain: "belum ada perkiraan otomatis".

## Jitupasna dan rencana pemulihan: centurisk97.id/siklus/pulih

Jitupasna adalah pengkajian kebutuhan pascabencana, dan R3P adalah rencana rehabilitasi dan rekonstruksi.

1. Koordalops membuat Jitupasna untuk satu kejadian dan menekan "Mulai pengumpulan".
2. Petugas mengisi baris kerusakan per sektor dan tingkat, serta baris kerugian per komponen. Harga satuan ditambahkan lewat "Tambah harga".
3. Tekan Tinjau untuk menghitung. Koordalops memeriksa penanda peringatan (hitungan ganda, sektor kosong, nilai tidak wajar).
4. Tekan Final. Jitupasna yang sudah final tidak dapat diubah.
5. Dari Jitupasna final, buat draf R3P. Statusnya berjalan dari draf, diusulkan, disetujui pimpinan, ditetapkan resmi, berjalan, hingga selesai. Status ditetapkan resmi mewajibkan nomor dan tanggal keputusan. Penyetuju tidak boleh orang yang sama dengan penyusun.
6. Tambahkan kegiatan lewat "Tambah kegiatan" dan pantau pelaksanaannya lewat persen realisasi.

Nilai rupiah hanya tampil bila semua harga yang dibutuhkan sudah terisi, selain itu tertulis "menunggu". Draf R3P dan tanda setuju hanya untuk internal dan tidak menggantikan dokumen resmi.

## Rencana kontinjensi dan gladi: centurisk97.id/siklus/renkon dan /siklus/gladi

Rencana kontinjensi (renkon) disiapkan untuk satu bencana di satu wilayah.

1. Buat renkon baru, lalu isi asumsi dampak (jumlah jiwa, jumlah hari, jumlah keluarga).
2. Layar menghitung usulan kebutuhan dasar, membandingkannya dengan stok gudang LogPal, dan menunjukkan kekurangannya. Usulan tidak pernah menimpa isian staf.
3. Naikkan status: persiapan, pelaksanaan, finalisasi, ditetapkan, berlaku, dimutakhirkan.

Gladi memutar ulang kejadian arsip yang sudah dipromosikan sebagai bahan latihan:

1. Pilih "Susun skenario" dari kejadian arsip.
2. Status gladi: dirancang, siap, berjalan, dievaluasi, selesai.
3. Gunakan "Catat masalah" untuk menyimpan temuan.

Stok yang tidak tercatat di LogPal ditulis "stok belum tercatat", bukan 0.

## Risiko masa depan: centurisk97.id/siklus/masa-depan

Menampilkan perubahan hujan ekstrem dan kemarau panjang untuk dua horizon (2021 sampai 2040 dan 2041 sampai 2060), kenaikan muka laut, dan pertumbuhan bangunan di zona bahaya. Semuanya berlabel hipotesis. Yang tampil selalu nilai tengah beserta rentangnya, bukan satu angka. Ini sinyal perubahan dibanding masa lalu, bukan ramalan kejadian.
