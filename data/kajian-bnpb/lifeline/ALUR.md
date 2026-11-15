# ALUR: Status Lifeline

## A1. Kejadian lahir

1. Kejadian `KJ-` terbentuk atau aktif di Buku Besar (fase tanggap, transisi, pemulihan).
2. Kab dari `sk_kejadian_kab` menjadi baris kisi; semua sel abu.

## A2. Usulan mesin

1. Tiap jam (cron Worker yang sudah ada, menit bebas) atau saat halaman kejadian dibuka, fungsi usulan menghitung tiap sel dari isyarat dalam jendela 24 jam terakhir (ALGORITMA 2).
2. Usulan disimpan beserta daftar isyaratnya (sumber, kode, jumlah, waktu). Usulan tidak mengubah warna resmi.

## A3. Penetapan staf

1. Staf membuka kisi, klik sel.
2. Laci menampilkan usulan, isyarat, riwayat.
3. Staf memilih warna, memilih isyarat sebagai bukti dan/atau menulis catatan, lalu simpan.
4. Server menolak warna selain abu tanpa bukti (D4), mencatat riwayat (D5).

## A4. Basi

Sel yang status resminya lebih dari 24 jam tanpa pembaruan tampil dengan tanda "lewat 24 jam" (Q7). Warnanya tidak berubah sendiri.

## A5. Tutup

Saat kejadian masuk fase selesai, kisi menjadi baca-saja; riwayat tetap.
