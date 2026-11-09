# ALUR-LOGPAL

## Masuk
1. BPBD masuk di `/instansi` (cookie `sesi_instansi`), staf BNPB di `/admin/masuk` (cookie `sesi_staf`). Lalu buka `/instansi/logpal` (tautan ada di menu Ruang Instansi). Tanpa sesi sah, alamat itu dan `/logpal/index.html` mengarah 303 ke `/instansi`.
2. Halaman memanggil `GET /api/instansi/logpal/data`. Tanpa sesi: pesan "Masuk dulu" dengan dua tautan. Tanpa hak: pesan galat dari server.

## Input stok
BPBD atau staf (gudang BNPB) memilih gudang, mengisi barang. Kelompok peralatan (6 kelompok) memakai kolom aset; kelompok lain kolom persediaan. Simpan = `POST barang/:gudang` atau `ubah/:barang`; layar memuat ulang dari server.

## Mutasi
Pilih jenis (Masuk, Keluar, Penghapusan), barang, jumlah, dokumen. Server menurunkan stok dengan `UPDATE` bersyarat dan menulis baris mutasi dalam satu batch. Stok kurang = 409 dan tidak ada baris. Untuk mutasi Keluar, pemilik gudang mengisi jumlah diterima saat barang sampai; selisih tampil di riwayat.

## Stok opname
Isi hitung fisik per barang (kosong = tidak ikut), petugas, tanggal, centang "sesuaikan stok". Server menyimpan berita acara, menyalin stok tercatat dari databasenya, dan bila dicentang menyesuaikan jumlah, baik, rusak. QR barang membuka halaman ini langsung di barang itu.

## Permintaan bantuan
1. BPBD mengisi jenis (Tanggap darurat atau Penguatan kesiapsiagaan), barang diminta, dasar (status darurat dan SK bagi tanggap darurat).
2. Tahap 0 tercatat "Diajukan". Staf BNPB membuka permintaan dan memilih Lanjut (maju satu tahap) atau Tolak, dengan nama petugas dan catatan.
3. Tanggap darurat punya 6 tahap, penguatan kesiapsiagaan 11 tahap (lihat `ALGORITMA.md`). Tahap terakhir "Selesai". Ditolak = berhenti.
4. BPBD melihat riwayat tahap permintaannya sendiri, tidak bisa memprosesnya.

## Dummy
Super Admin menekan 🧪 untuk mengisi (3 gudang, 16 barang, 7 mutasi, 1 berita acara, 4 permintaan, 5 kebutuhan) dan 🧹 untuk menghapus semua dummy.
