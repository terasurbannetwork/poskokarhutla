# KEPUTUSAN-LURING: Lapor tanpa sinyal (Pantau Bencana, /lapor)

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

Paket induk: `data/kajian-bnpb/lapor-ai/` (K1-K84 mengikat paket ini) dan antrean bersama `data/kajian-bnpb/keterpaduan/` (D5, K3, K13). Paket ini memperinci dan menggantikan sebagian K37 dan D41-D45 di paket induk, yang sudah tertulis tetapi belum dibangun (lihat bagian "Hubungan dengan K37").

## Masalah

Bencana sering memutus sinyal tepat di tempat yang paling perlu dilaporkan. Chat Sigap bergiliran: server memutuskan pertanyaan berikutnya (`src/lapor_mesin.js`). Tanpa sinyal, tombol kirim hanya menghasilkan "Pesan belum terkirim" dan laporan hilang, padahal HP masih bisa memotret dan membaca GPS. Halaman `/lapor` juga tidak punya service worker, jadi tanpa sinyal halamannya sendiri tidak terbuka bila tab sudah ditutup.

## Keputusan pemilik

| No | Tanggal | Keputusan |
| --- | --- | --- |
| KL1 | 21 Nov 2026 | "Lapor tanpa sinyal. Laporan dan foto disimpan di HP lalu terkirim otomatis begitu ada sinyal. Repo sudah punya antrean luring (public/inti/antre.js) yang bisa dipakai ulang." Disetujui pemilik dengan kata "gas". |

Keputusan pemilik lain yang mengikat dan dikutip dari paket induk: K5 dan K75 (foto hanya dari kamera, paling lama 5 menit, bergeotag dan berwaktu), K12 (lokasi wajib), K14 dan K18 (laporan harus lengkap, tiket dan PDF), K17 (waktu kejadian dan waktu dilaporkan terpisah), K68 (lapor darurat), K13 paket keterpaduan (butir antrean ditahan 14 hari). Aturan rumah: mesin memegang alur, AI hanya mengurai; kosong tidak pernah jadi nol.

## Hubungan dengan K37 dan D41-D45 (paket lapor-ai)

K37 (mode luring) disetujui 19 Nov 2026 dan D41-D45, Q28, tiket LA-35 dan LA-36 sudah ditulis, tetapi pada 21 Nov 2026 belum ada `public/sw-lapor.js`, tabel `lapor_luring`, atau saluran `lapor` di kode. Paket ini mengisi lubang itu dan mengubah tiga hal, semuanya tercatat di sini sebagai DL3, DL4, dan DL8. Bila bertentangan dengan D41-D45, paket ini menang untuk fitur ini dan tiket LA-35 dan LA-36 dianggap digantikan LR-02 sampai LR-12.

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| DL1 | Jalur luring adalah satu formulir pendek "Lapor tanpa sinyal" yang mencerminkan Lapor darurat (K68), bukan salinan chat. Satu pengiriman = satu butir antrean. | Chat bergiliran tidak bisa berjalan tanpa server (ALGORITMA 1); opsi lain ditimbang di RISET bagian 5. |
| DL2 | Pemeriksaan isian di HP dan di Worker memakai satu definisi spek luring (`public/inti/luring_spek.js`, pola `public/inti/spek.js`), dimuat dua sisi. Worker tetap memeriksa ulang semuanya. | Satu definisi; klien tidak pernah dipercaya. |
| DL3 | Isian wajib formulir: jenis bencana (dari pilihan), lokasi (GPS perangkat), waktu kejadian (dari pilihan), ada korban atau orang terjebak (ya, tidak, belum tahu). Opsional: ringkasan teks sampai 500 huruf dan sampai 3 foto. Subjenis tidak ditanya luring. | Mengubah D42 (subjenis dan kronologi wajib): subjenis bukan penentu penanganan awal; korban penting untuk tanggap darurat (K68). |
| DL4 | Satu butir menjadi laporan terkirim versi 1, bertanda "dikirim dari luring", dengan tiket dan PDF seperti biasa. Sisa isian ditawarkan lewat susulan (D36 paket induk). Ringkasan teks dipakai apa adanya; tidak ada AI di HP dan tidak ada angka yang diurai dari teks bebas ke isian. | K14 "harus 100 persen" dipenuhi lewat susulan, bukan dengan menahan laporan; kosong tidak jadi nol; angka butuh kutipan. |
| DL5 | Waktu dilaporkan = waktu pelapor menekan simpan di HP (`waktu_klien`), waktu diterima server dicatat terpisah (K17, D43). | Laporan tidak boleh ikut mundur ke saat sinyal pulih. |
| DL6 | Kunci idempotensi = `klien_id` dari antre.js, di tabel baru `lapor_luring`. Kirim ulang butir yang sama dijawab 200 dengan hasil yang sama. | Antrean bisa mengirim ganda (jaringan putus setelah server sukses). |
| DL7 | Identitas tidak disimpan di butir sebagai rahasia. Butir hanya membawa nomor WA pelapor yang sudah dikenal perangkat; kuki perangkat yang diterbitkan server dikirim peramban otomatis saat kirim. Persetujuan data dicatat di sesi online sebelumnya. | Aturan antre.js menolak kunci rahasia; D7 paket induk. |
| DL8 | Foto luring: aturan 5 menit (K75) diperiksa di HP terhadap jam HP saat memotret; Worker memeriksa selisih waktu foto lawan `waktu_klien` (bukan lawan waktu kirim) dan memberi lencana "GPS perangkat, luring" yang lebih lemah. Ini perlu persetujuan pemilik: Q1. | Pemeriksaan terhadap waktu kirim pasti gagal untuk foto luring; Q1 menjaga niat K75. |
| DL9 | Pengiriman otomatis hanya saat halaman terbuka (kejadian `online`, tab terlihat, ketukan 30 sampai 60 detik; sudah ada di antre.js). Background Sync tidak diandalkan (RISET 2). | Tidak ada di iOS Safari. |
| DL10 | Perangkat harus "disiapkan" sekali saat ada sinyal: service worker terpasang, nomor dikenal, persetujuan tercatat, izin lokasi dan kamera diminta, penyimpanan diminta bertahan. Pengguna yang belum pernah melapor lewat perangkat itu tidak bisa memakai jalur luring (Q2). | Identitas, persetujuan, dan izin tidak bisa didapat tanpa server. |
| DL11 | Tidak ada enkripsi tambahan di HP pada v1; perlindungan = minimisasi data, hapus segera setelah terkirim, batas 14 hari, tombol "Hapus semua data luring". Alasan di KEAMANAN-PRIVASI. | Kunci yang tersimpan di peramban yang sama tidak melindungi dari orang yang memegang HP-nya. |

## Pertanyaan terbuka

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Aturan foto paling lama 5 menit (K75) dihitung dari mana untuk foto luring? | **[BAWAAN SEMENTARA]** Dari waktu pelapor menekan simpan (`waktu_klien`), diperiksa juga di HP saat memotret; foto diberi lencana "GPS perangkat, luring" dan tanda "jam HP belum diverifikasi" bila selisih jam tidak diketahui. Ini melonggarkan K75 untuk jalur luring saja. | LR-07, LR-08 |
| Q2 | Orang yang belum pernah memakai Pantau Bencana di HP-nya boleh melapor luring? | **[BAWAAN SEMENTARA]** Tidak. Layar menampilkan 112 dan nomor penting dari simpanan, serta ajakan "Siapkan lapor tanpa sinyal" saat ada sinyal. | LR-03 |
| Q3 | Laporan luring yang tiba terlambat tetap memicu pita darurat dan nada di meja (K68)? | **[BAWAAN SEMENTARA]** Ya hanya bila selisih `waktu_klien` ke waktu diterima paling lama 2 jam dan waktu kejadian "sedang berlangsung"; selebihnya masuk sebagai laporan biasa bertanda "dikirim terlambat". Angka 2 jam HIPOTESIS. Catatan penerapan 26 Nov 2026: bawaan diterapkan tanpa syarat "sedang berlangsung" karena formulir luring tidak punya isian waktu kejadian (jalurnya Lapor darurat). Selisih diukur dengan dua jam HP, jam kirim dikurangi jam simpan; bila salah satunya tidak sah atau tidak ada, pita tetap menyala (bila ragu, pita menyala). | LR-09 |
| Q4 | Berapa lama butir ditahan di HP bila tidak pernah ada sinyal? | **[BAWAAN SEMENTARA]** 14 hari (K13 keterpaduan), termasuk butir ditolak. | LR-05 |
| Q5 | Video ikut jalur luring? | **[BAWAAN SEMENTARA]** Tidak di v1: hanya foto. Video tetap lewat saluran `lapor-video` yang sudah ada dan butuh sinyal untuk bagian pertamanya. | LR-06 |
| Q6 | Perlu PIN untuk mengunci butir di HP bersama? | **[BAWAAN SEMENTARA]** Tidak di v1 (DL11); pita menyembunyikan lokasi dan nomor, hanya menampilkan jenis dan waktu. | LR-05 |
| Q7 | Bila GPS tidak mendapat titik (di dalam bangunan, lapisan awan), boleh memilih kab/kota dari daftar tersimpan? | **[BAWAAN SEMENTARA]** Ya; lencana "lokasi dipilih sendiri", tanpa foto bergeotag sebagai pengganti. Daftar kab/kota (514 entri) ikut disimpan service worker. | LR-04 |
| Q8 | Background Sync dipasang untuk Android Chrome sebagai tambahan? | **[BAWAAN SEMENTARA]** Ditunda ke fase 2, hanya sesudah uji di perangkat nyata menunjukkan perlunya. | LR-13 |
| Q9 | Batas antrean per perangkat? | **[BAWAAN SEMENTARA]** 5 butir, 3 foto per butir, total 20 MB; sesudahnya formulir menolak simpan dan menyarankan kirim yang menunggu dulu. HIPOTESIS. | LR-05 |
| Q10 | Jalur tambahan lewat SMS atau telepon (tanpa data seluler)? | **[BAWAAN SEMENTARA]** Di luar lingkup; formulir hanya menampilkan 112 dan nomor penting. Perlu keputusan kerja sama operator di luar repo ini. | tidak ada |
| Q11 | Ajakan "Pasang ke layar utama" (manifest) untuk meredam pembuangan data iOS? | **[BAWAAN SEMENTARA]** Ya, ajakan lembut sekali pada langkah Siapkan; tidak memaksa. | LR-03 |

## Jawaban pemilik 21 Nov 2026

Pemilik: "Gas semua". Semua bawaan sementara pada pertanyaan terbuka di berkas ini diterima sebagai keputusan pemilik per 21 Nov 2026, kecuali butir yang menurut TIKET memerlukan berkas atau tindakan dari pemilik sendiri (lambang BNPB resolusi tinggi, kunci VAPID sebagai secret Worker, penerapan migrasi D1 produksi, tinjauan hukum kebijakan privasi); butir itu tetap menunggu pemilik.

Satu service worker dan satu manifest untuk `/lapor`: paket `pwa-peringatan` (PW-03, PW-04) dan `lapor-luring` (LR-03) memakai satu berkas service worker dan satu `manifest.webmanifest` bersama, dibangun sekali di PW-03 dan PW-04 lalu diperluas oleh LR-03. Tidak ada service worker kedua untuk lingkup yang sama.
