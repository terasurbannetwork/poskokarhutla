# PRD: Pemetaan bangunan oleh relawan

## Tujuan

Menutup lubang data bangunan di kab zona bahaya dengan mengerahkan mahasiswa kampus mitra memetakan lewat HOT Tasking Manager, tanpa sistem menulis sendiri ke luar.

## Peran

| Peran | Hak |
| --- | --- |
| Staf Pusdalops atau BNPB | Melihat daftar prioritas, menyiapkan paket proyek, menandai proyek sudah dikirim, mencatat tautan proyek. |
| Pemilik | Menyetujui sebelum dikirim ke Tasking Manager (Q1). |
| Akun kampus (`/kemitraan`) | Melihat proyek yang terbuka, bergabung, melihat sumbangan kampusnya sendiri. |
| Mahasiswa | Memetakan di OSM lewat akun OSM sendiri; tidak punya akun di sistem kecuali sudah relawan. |
| Publik | Tidak ada (D7). |

## Fitur

| Kode | Fitur |
| --- | --- |
| F-1 | Kelengkapan bangunan per kab di zona bahaya (rasio, berlabel metode, tanggal data). |
| F-2 | Daftar prioritas kab: paparan bahaya x kelengkapan rendah, dengan alasan terbaca. |
| F-3 | Paket proyek: AOI GeoJSON, nama dan deskripsi proyek, teks instruksi pemeta berbahasa Indonesia, saran citra, hashtag, ukuran tugas yang disarankan. |
| F-4 | Catatan status proyek: disiapkan, disetujui, dikirim (tautan Tasking Manager diisi staf), berjalan, selesai, ditutup. |
| F-5 | Kampus bergabung ke proyek dan menerima hashtag kampusnya. |
| F-6 | Sumbangan per kampus: jumlah bangunan terpetakan per hashtag, agregat. |
| F-7 | Pembanding sebelum dan sesudah: rasio kelengkapan kab di awal dan akhir proyek. |
| F-8 | Pengingat bila data kelengkapan lebih tua dari batas segar. |

## Larangan

Tidak ada panggilan tulis otomatis ke HOT atau OSM. Tidak ada skor kampus yang diperingkat publik. Tidak menyimpan nama pengguna OSM (Q3). Tidak mengubah sumber paparan (Q5). Tidak ada klaim "peta lengkap"; yang ada rasio dan tanggal. Tidak ada data dummy.

## Di luar lingkup

Validasi hasil pemetaan, pemetaan kerusakan pasca-kejadian, MapSwipe, dan pelatihan pemeta. Itu pekerjaan komunitas HOT dan dosen pembimbing.
