# ALUR: Pemetaan bangunan oleh relawan

## Alur utama

1. Pipeline bulanan menghitung kelengkapan per kab dan daftar prioritas.
2. Staf melihat daftar, memilih kab, sistem membuat paket proyek (status `disiapkan`).
3. Staf mengajukan; pemilik menyetujui (status `disetujui`), atau menolak dengan catatan.
4. Staf melengkapi daftar penyuntingan terorganisir (halaman wiki OSM, pemberitahuan komunitas lokal, HR-13), lalu membuka Tasking Manager dengan akun HOT yang dipegang (Q1), mengunggah AOI dan instruksi dari paket, lalu menyalin tautan proyek ke sistem (status `dikirim`).
5. Akun kampus mitra yang punya satgas atau minat di provinsi itu melihat proyek, menekan Gabung, dan menerima hashtag kampus `#CentuRisk-<kode>`.
6. Mahasiswa memetakan di Tasking Manager dengan hashtag itu. Sistem tidak masuk ke Tasking Manager.
7. Pipeline membaca balik sumbangan per hashtag (jalur dipastikan di HR-03) dan menghitung ulang rasio kab.
8. Staf menutup proyek bila rasio lewat ambang atau tenggat habis; hasil dicatat sebagai pelajaran (`km_pelajaran`).

## Status proyek

| Status | Pemicu |
| --- | --- |
| disiapkan | Staf menekan Siapkan |
| disetujui atau ditolak | Pemilik |
| dikirim | Staf mengisi tautan |
| berjalan | Ada sumbangan pertama |
| selesai | Rasio melewati ambang atau tenggat |
| ditutup | Staf |

## Kasus tepi

Data ohsome tertinggal 3,5 bulan: layar menampilkan "data OSM per <tanggal>" dan rasio awal proyek memakai tanggal itu. Kab tanpa data pembanding: rasio null, tampil "Tidak ada data untuk wilayah ini", tidak diurutkan. Kampus tanpa akun: tidak melihat proyek.
