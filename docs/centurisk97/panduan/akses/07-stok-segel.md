# Stok gudang dan keaslian dokumen

Halaman ini menjelaskan hitungan stok gudang LogPal dan rancangan pemeriksaan keaslian dokumen yang belum berjalan.

## Perhitungan stok gudang

Data yang dipakai: catatan barang, mutasi, dan stok opname yang dimasukkan sendiri oleh petugas gudang. Tidak ada data luar, kecuali cuaca jalur bantuan dari BMKG pada tab Pengantaran.

Langkah perubahan stok. Setiap perubahan terjadi dalam satu kesatuan: stok berubah dan catatan mutasi tertulis bersama, atau keduanya batal.

1. Masuk: jumlah dan jumlah baik bertambah sebesar barang yang masuk. Batas jumlah 100 juta.
2. Keluar atau Penghapusan: jumlah berkurang. Yang baik diambil lebih dulu, sisanya dari yang rusak. Bila jumlah tidak cukup, pengeluaran ditolak.
3. Stok opname dengan penyesuaian: jumlah diganti dengan hasil hitung fisik. Jumlah baik dan rusak disesuaikan supaya jumlah baik ditambah rusak tidak pernah melebihi jumlah.

Contoh: stok 100 tenda, 90 baik dan 10 rusak. Keluar 95 tenda: 90 baik habis diambil, 5 sisanya dari yang rusak. Stok akhir 5 tenda rusak. Keluar 120 tenda ditolak karena stok kurang.

Tahap permintaan bantuan: permintaan Tanggap darurat melewati enam tahap, dari rapat koordinasi lintas sektor sampai selesai. Permintaan Penguatan kesiapsiagaan melewati sebelas tahap, dari surat permohonan sampai selesai. Tahap hanya boleh naik satu per satu, atau ditolak; permintaan yang sudah ditolak tidak berjalan lagi. Permintaan Tanggap darurat wajib mencantumkan status dan nomor penetapan darurat. Satu permintaan memuat 1 sampai 40 barang.

Hitungan di tab Kesiapan audit:

| Besaran | Cara hitung |
| --- | --- |
| Kedaluwarsa | lewat bila tanggalnya sebelum hari ini (waktu Jakarta). Dekat bila tinggal 90 hari atau kurang |
| Akurasi stok | 100 persen dikurangi selisih (hitung fisik dikurangi catatan kartu) dibagi catatan kartu, dibatasi 0 sampai 100 persen |
| Pemenuhan penyaluran | jumlah diterima dibagi jumlah dikirim, dibatasi 0 sampai 100 persen |
| Nilai buku | harga perolehan dikalikan sisa umur manfaat (susut garis lurus, masa manfaat menurut kategori barang), dibulatkan ke ribuan rupiah. Berlabel perkiraan |
| Jam tempuh | jarak garis lurus dibagi kecepatan rata-rata moda angkut. Berlabel perkiraan |
| Standar minimal | draf Petunjuk Pelaksanaan Standar Minimal Kebutuhan 2024 pada tingkat layanan 10, 20, dan 30 persen (Juklak BNPB 1/2024 yang resmi belum didapat) |

Contoh akurasi stok: kartu mencatat 200 dus mi instan, hitung fisik menemukan 190. Selisihnya 10, dibagi 200 menjadi 5 persen, sehingga akurasi 95 persen.

Sebelas pemeriksaan kesiapan audit: berita acara opname semester ini, fisik sama dengan kartu, pencatatan rinci per spesifikasi, persediaan punya kode harga dokumen lokasi, tanggal kedaluwarsa pangan dan obat, dokumen serah terima penyaluran, konfirmasi penerimaan, kode barang dan nomor urut aset peralatan, label peralatan, dokumen kepemilikan peralatan, serta nilai dan tahun perolehan. Satu pemeriksaan lolos bila seluruh baris sasarannya memenuhi syarat. Bila tidak ada baris sasaran, statusnya "Belum ada data": bukan lolos dan bukan 0 persen.

Seberapa bisa dipercaya: ini perhitungan pembukuan, bukan prediksi, jadi tidak ada uji balik. Nilai buku, jam tempuh, dan standar minimal hanya perkiraan atau draf, dan diberi label itu.

## Keaslian dokumen (rancangan, belum berjalan)

Bagian ini baru rancangan. Tujuannya agar pemegang dokumen cetak dapat memeriksa keasliannya.

1. Setiap dokumen yang disegel mendapat kode acak 10 huruf, tampil seperti ABCDE-FGHJK. Huruf yang mudah tertukar dengan angka (I, L, O, U) tidak dipakai, dan salah ketik O menjadi 0 atau I menjadi 1 dibetulkan otomatis.
2. Segel menempel pada versi dokumen yang sudah dibekukan. Ia tidak membekukan apa pun sendiri.
3. Saat halaman dibuka, sistem menghitung ulang sidik isi dokumen dan membandingkannya dengan sidik yang tersimpan.
4. Status ditentukan berurutan: Dicabut bila ada pencabutan, Tidak cocok bila isi hilang atau sidiknya berbeda, Ada versi lebih baru bila ada segel versi lebih tinggi untuk dokumen dasar yang sama, selain itu Berlaku.
5. Pencarian dibatasi 60 kali per 10 menit per alamat jaringan (bawaan sementara, belum diputuskan pemilik). Kode yang salah format dan kode yang tidak ada dijawab sama.
6. QR di lembar cetak mengarah ke halaman verifikasi. Di bawahnya tercetak kode dan 12 huruf awal sidik supaya dapat dicek tanpa kamera. Data contoh tidak pernah disegel.

Ini mekanisme keaslian, bukan prediksi, jadi tidak ada uji balik. Segel bukan tanda tangan elektronik tersertifikasi.
