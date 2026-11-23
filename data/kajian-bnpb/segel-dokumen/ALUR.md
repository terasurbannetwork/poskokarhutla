# ALUR: Segel dokumen

## A1. Terbit

1. Staf mengunci laporan harian (atau membekukan dokumen PB).
2. Worker menulis baris beku sumber seperti sekarang.
3. Di batch yang sama, Worker menulis baris `segel` dengan kode baru, sidik sumber, judul publik, dan unit penerbit.
4. Jawaban rute kunci ikut membawa `segel: {kode, url}`.
5. Lembar cetak dan PDF memuat blok QR di kaki halaman pertama.

## A2. Ralat atau versi baru

1. Staf menyimpan ralat. Baris beku baru dan segel baru lahir (A1).
2. Segel lama tidak diubah. Statusnya dihitung saat dibaca: ada segel lebih baru dengan rujukan dasar yang sama, jadi tampil "Ada versi lebih baru" dengan tautan ke kode terbaru.

## A3. Verifikasi oleh penerima

1. Penerima memindai QR atau membuka `/verifikasi` dan mengetik kode.
2. Worker mencari kode, mengambil isi sumber, menghitung ulang sha256, lalu menentukan status.
3. Halaman menampilkan kartu sampul dan status.
4. Bila penerima punya PDF-nya, ia memilih berkas; peramban menghitung sidik dan menampilkan "Berkas cocok" atau "Berkas berbeda dari yang diterbitkan".

## A4. Cabut

1. Moderator atau pimpinan membuka daftar segel staf, memilih segel, mengisi alasan.
2. Worker menambah baris `segel_cabut`. Status segel itu jadi "Dicabut" sejak saat itu.
3. Cabut tidak bisa dibatalkan; bila salah, terbitkan versi baru.

## A5. Tidak cocok

1. Saat dibaca, sidik hitung ulang berbeda dari sidik segel, atau isi sumber hilang.
2. Halaman publik menampilkan "Tidak cocok: isi di sistem berbeda dari yang disegel. Hubungi penerbit."
3. Tidak ada log terpisah. Daftar segel staf (F-9) menghitung status yang sama saat dibuka, jadi segel Tidak cocok terlihat di sana.
