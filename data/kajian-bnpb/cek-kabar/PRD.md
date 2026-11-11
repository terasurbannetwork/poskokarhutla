# PRD: Cek Kabar Luar

## Tujuan

Staf Pusdalops tahu, untuk tiap kejadian yang belum dilaporkan selesai, apakah dunia luar masih membicarakannya. Dengan begitu yang ditanya duluan adalah kejadian yang paling mungkin sudah selesai tapi belum dilaporkan, atau yang masih berlangsung tapi laporannya mandek.

## Pengguna

Staf Pusdalops, Koordalops, dan Pimpinan di `/bnpb/dalops`. Pemirsa baca-saja melihat tanpa tombol kirim (Q5).

## Fitur

| ID | Fitur | Terima bila |
| --- | --- | --- |
| F1 | Label per kejadian belum selesai: Masih berlangsung, Kemungkinan selesai, Belum ada kabar luar (KEPUTUSAN D2) | tiap baris belum selesai di tiap tab jenis punya tepat satu label |
| F2 | Bukti di balik label: daftar artikel (judul, media, tanggal, tautan) dan angka alam yang dipakai | klik label membuka buktinya; label tanpa bukti tidak tampil |
| F3 | Ringkasan per tab: berapa kejadian per label | angka ringkasan sama dengan jumlah baris |
| F4 | "Perlu ditanya" (per kab/kota) juga memuat semua kelompok "Kemungkinan selesai", dan urutannya memakai label: Kemungkinan selesai dulu, lalu Belum ada kabar luar, lalu Masih berlangsung yang laporannya paling lama | urutan teruji di `tests/bnpb/dalops.test.mjs` |
| F5 | Teks WA sesuai label (Q4) | teks "Kemungkinan selesai" meminta konfirmasi selesai, bukan pembaruan angka |
| F6 | Arsip label beku harian dan rapor ketepatan sesudah 60 hari | rapor membandingkan label dengan laporan selesai resmi yang datang kemudian |

## Larangan

- Tidak menutup kejadian otomatis (D1).
- Tidak menulis "aman" atau "sudah selesai" atas dasar berita.
- Tidak menjumlah atau membuat skor gabungan antarsumber.
- Tidak menampilkan berita yang tidak cocok kab/kota sebagai bukti kab/kota itu.
- Tidak membuat rute Worker atau tabel D1 baru (D4).

## Di luar cakupan fase 1

Media sosial BPBD, DIBI, laporan warga (Q3). Umpan berita baru untuk kebakaran permukiman dan gelombang pasang (Q2, CK-08).
