# ALUR: Bot WA pembuat laporan

## Status proyek

`terbuka` (bahan dikumpulkan) -> `bertanya` (menunggu jawaban F-3) -> `membangun` -> `draf` (vN terkirim) -> `membangun` (revisi) -> `draf` -> ... -> `final` -> `ditutup` (unggah Drive selesai).
Keluar samping: `batal` (perintah pemakai) dan `kedaluwarsa` (24 jam tanpa aktivitas, Q7). Status `final` dan `ditutup` tidak bisa dibuka lagi; revisi sesudahnya membuka proyek baru.

## A. Membuat laporan

1. Pemakai mem-forward bahan. Gateway mencocokkan nomor dengan salinan daftar terdaftar (D10). Nomor asing dibalas cara mendaftar (paling banyak sekali sehari) dan bahannya tidak diteruskan. Nomor terdaftar diteruskan ke `POST /api/wa/gateway`.
2. Bahan ditambahkan ke proyek `terbuka` milik nomor itu untuk tanggal dan jenis yang cocok, atau dibiarkan menunggu `buat`.
3. Pemakai mengetik `buat penanganan karhutla` (jenis boleh ditebak dari bahan bila tidak disebut; bila ragu bot bertanya).
4. Mesin memeriksa bahan wajib jenis laporan itu (`LAPORAN[].butuh` di `otomatis.mjs`; penanganan butuh `bmkg_pagi` dan `satgas`) dan meminta Claude mencari pertentangan antarbahan. Ada yang kurang atau bentrok: status `bertanya`, bot mengirim satu pesan berisi semua pertanyaan.
5. Mesin mengambil angka sistem, meminta Claude mengurai bahan ke isian berkutipan, memvalidasi, lalu menjalankan generator.
6. Pratinjau slide dikirim lebih dulu. Pemeriksaan otomatis dan PDF jalan bersamaan. Hasil pemeriksaan ditulis di pesan PDF (peringatan tidak menahan draf).
7. Status `draf`, versi v1 tercatat.

## B. Revisi

1. Pemakai membalas dengan kalimat biasa.
2. Mesin mengirim ke Claude: inventaris shape deck terakhir (nomor slide, nama shape, teks), daftar shape terkunci, operasi ubah sebelumnya, dan kalimat revisi.
3. Claude menjawab daftar operasi ubah atau pertanyaan balik bila kalimatnya ambigu.
4. Operasi yang menyentuh shape terkunci ditolak; bot menjelaskan asal angka dan menawarkan catatan.
5. Generator membangun ulang dari bahan, operasi ubah 1..n diterapkan, pratinjau slide yang berubah dikirim, lalu PDF.
6. Versi bertambah satu. `balik v2` membuat versi baru yang isinya sama dengan v2.

## C. Final dan closing

1. Pemakai mengetik `final`.
2. Mesin mengirim PPTX dan PDF versi terakhir ke pemakai, lalu mengunggahnya ke Drive tim IT di subfolder `Revisi N` (Q9) dan ke `POST /api/wa/hasil` (arsip tab Pelaporan).
3. Bot membalas tautan folder Drive dan ringkasan riwayat versi. Status `ditutup`.
4. Unggah Drive gagal: status tetap `final`, diulang otomatis tiap 10 menit, pemilik dikabari sekali.

## D. Pendaftaran

1. Nomor asing mengirim apa pun: gateway membalas cara mendaftar (ketik `daftar <nama> <instansi>`), paling banyak sekali sehari per nomor.
2. `daftar`: gateway meneruskannya ke pemilik berisi nama, instansi, dan nomor; pemilik membalas `setuju <nomor>` atau `tolak <nomor>`.
3. `setuju`: nomor masuk `bl_daftar`, salinan daftar di gateway disegarkan, pendaftar diberi tahu. Akun `/masuk` tidak otomatis terhitung (Q8).

## E. Mesin mati

Gerbang dan generator ada di satu mesin (Q2). Saat mesin mati, bot tidak menerima apa pun. Saat mesin menyala, pesan susulan untuk bot proyek dibuang (K11): tidak disimpan ke proyek dan tidak dijalankan. Tiap nomor terdaftar yang sempat mengirim pesan mendapat satu pemberitahuan T-TERLEWAT. Proyek yang sedang `draf` saat mesin mati tetap ada dan bisa dilanjutkan dengan pesan baru.

## F. Aturan tetap

1. Tiap revisi diberi label pola oleh Claude (jenis laporan, slide, jenis ubahan).
2. Pola mencapai ambang Q12: pemilik menerima usulan "Jadikan aturan tetap?" dengan contoh.
3. `setuju`: aturan berlaku untuk draf v1 berikutnya sebagai operasi ubah bawaan. `tolak`: pola tidak diusulkan lagi 30 hari.
