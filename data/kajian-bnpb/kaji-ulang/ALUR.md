# ALUR: Kaji ulang pasca-kejadian

## A1. Kandidat

1. Kejadian `KJ-` masuk fase transisi, pemulihan, atau selesai (sama dengan Q1). Draf boleh dilihat sejak transisi untuk kaji intra-aksi; pengesahan hanya sesudah fase selesai.
2. Daftar kandidat menyaring kejadian yang memenuhi kriteria Q1; staf juga bisa memulai kejadian mana pun secara manual.
3. Tidak ada cron baru: daftar dihitung saat halaman dibuka dari `sk_kejadian`.

## A2. Draf otomatis

1. Staf membuka `/siklus/kejadian/<KJ>` bagian Kaji ulang. Server merakit draf (ALGORITMA 1 sampai 5) dan menampilkannya tanpa menyimpan apa pun.
2. Tombol "Mulai kaji ulang" membuat baris `ku_kaji` berstatus draf (satu per kejadian).

## A3. Isian staf

1. Staf menulis pelajaran: pilih kategori (berjalan baik, perlu diperbaiki), teks, dan bila perlu peristiwa linimasa yang dirujuk.
2. Staf dapat mengangkat catatan lapangan menjadi pelajaran.
3. Staf menulis rekomendasi dari satu atau beberapa pelajaran: teks, unit penanggung jawab, tenggat. Sistem membuat kunci `kaji|<KJ>|<nn>` dan menulis `ku_rekomendasi` bersama baris pertama `dl_tindak` (status belum) dalam satu batch.

## A4. Pengesahan

1. Koordalops memeriksa draf, lalu mengesahkan. Server membekukan potret linimasa dan teks pelajaran sebagai versi 1, mencatat di `sk_jejak`.
2. Setelah disahkan: pelajaran dan rekomendasi baru hanya ditambahkan; teks lama tidak berubah. Tambahan tampil sebagai lampiran bertanda "setelah versi n" di layar dan cetak. Tombol "Sahkan ulang" (KO) membekukan potret baru dan menaikkan versi 1; versi lama tetap tersimpan sebagai riwayat potret (DESAIN-TEKNIS).

## A5. Pelacakan

1. Penanggung jawab atau staf memperbarui status rekomendasi: belum, dikerjakan, selesai, tiap perubahan satu baris `dl_tindak_log`.
2. Selesai wajib catatan penutup 20 sampai 300 karakter (D7). Rekomendasi yang tidak jadi dikerjakan ditutup selesai dengan catatan alasan dan tanda `tidak_dilanjutkan` (Q8).
3. Lewat tenggat tanpa selesai: tampil "lewat tenggat" di daftar F-7; status tidak berubah sendiri.

## A6. Tutup

Kaji ulang dianggap tuntas bila semua rekomendasinya selesai. Kejadian tetap berfase selesai; kaji ulang tidak mengubah fase kejadian.
