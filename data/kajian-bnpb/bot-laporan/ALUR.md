# ALUR: Bot WA pembuat laporan

## Status proyek

`terbuka` (bahan dikumpulkan) -> `bertanya` (menunggu jawaban F-3) -> `membangun` -> `draf` (vN terkirim) -> `membangun` (revisi) -> `draf` -> ... -> `final` -> `ditutup` (unggah Drive selesai).
Keluar samping: `batal` (perintah pemakai) dan `kedaluwarsa` (24 jam tanpa aktivitas, Q7). Status `final` dan `ditutup` tidak bisa dibuka lagi; revisi sesudahnya membuka proyek baru.

## A. Membuat laporan

1. Pemakai mem-forward bahan. Gateway mencocokkan nomor dengan salinan daftar terdaftar (D10). Nomor asing dibalas "Bot ini hanya bisa dipakai nomor yang terdaftar" (paling banyak sekali sehari) dan bahannya tidak diteruskan. Nomor terdaftar diteruskan ke `POST /api/wa/gateway`.
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
2. Mesin mengirim PPTX dan PDF versi terakhir ke pemakai, lalu mengunggahnya ke Drive tim IT di subfolder `Revisi N` berikutnya yang masih kosong (Q9). Hasil final bot tidak dikirim ke `POST /api/wa/hasil` (D13); arsipnya tetap di `bl_versi` dan tampil di kartu proyek tab Pelaporan.
3. Bot membalas tautan folder Drive dan ringkasan riwayat versi. Status `ditutup`.
4. Unggah Drive gagal: status tetap `final`, diulang otomatis tiap 10 menit, pemilik dikabari sekali.

## D. Pendaftaran (K19)

1. Tidak ada pendaftaran mandiri. Nomor asing yang mengirim apa pun, termasuk "daftar ...", hanya dibalas "Bot ini hanya bisa dipakai nomor yang terdaftar", paling banyak sekali sehari per nomor.
2. Pemilik mendaftarkan nomor langsung: `setuju <nomor> [nama]`. Mencabut: `tolak <nomor>`. Salinan daftar di gateway langsung disegarkan; nomor itu tidak dikirimi pesan.
3. Nomor di `WA_IZIN` tetap terhitung terdaftar. Akun `/masuk` tidak.

## E. Mesin mati

Gerbang dan generator ada di satu mesin (Q2). Saat mesin mati, bot tidak menerima apa pun. Saat mesin menyala, pesan susulan untuk bot proyek dibuang (K11): tidak disimpan ke proyek dan tidak dijalankan. Tiap nomor terdaftar yang sempat mengirim pesan mendapat satu pemberitahuan T-TERLEWAT. Proyek yang sedang `draf` saat mesin mati tetap ada dan bisa dilanjutkan dengan pesan baru.

## F. Aturan tetap

1. Tiap revisi diberi label pola oleh Claude (jenis laporan, slide, jenis ubahan).
2. Pola mencapai ambang Q12: pemilik menerima usulan "Jadikan aturan tetap?" dengan contoh.
3. `setuju`: aturan berlaku untuk draf v1 berikutnya sebagai operasi ubah bawaan. `tolak`: pola tidak diusulkan lagi 30 hari.

## V2: alur bangun dan revisi dengan agen

Status proyek, perintah, dan pesan WA sama dengan V1. Yang berganti hanya isi langkah bangun dan revisi untuk nomor V2 (`BL_VERSI=2` dan nomor di `BL_V2_NOMOR`, D21), dan versi bot dikunci per proyek (D24).

### V2-A. Bangun draf v1

1. `lanjut` (atau `tunggu`/`hitung` K18) sama dengan V1 sampai bahan terkumpul.
2. Mesin membangun deck dasar dengan generator (D16) ke `~/.wa-bot/agen/<proyek>/v1/dasar/`, lengkap dengan `<deck>.kunci.json`. Generator gagal = galat bangun V1 seperti biasa.
3. Mesin menyiapkan ruang kerja (D15): teks bahan tersamarkan ke `bahan/`, laporan kemarin dan skrip kemarin (D23) ke `kemarin/`.
4. Kunci agen global dan cek biaya (D20, D26). Sibuk = pemakai dibalas antre; biaya lewat = pesan batas belanja V1.
5. Mesin menjalankan agen (A13) dengan tugas membuat laporan dari deck dasar. Tanda sedang mengetik menyala selama agen bekerja. Pesan teks pemegang saat itu dibalas "masih dikerjakan".
6. Agen selesai: mesin membaca `keluaran/hasil.json` (D18).
   - `tanya` tidak kosong: status `bertanya`, pertanyaan dikirim, `tanya.json` disimpan (D25). Jawaban melanjutkan sesi dan kembali ke langkah 4 dengan ruang kerja yang sama (keluaran lama dikosongkan).
   - Selain itu: pagar angka (A11). Lolos: PDF dan pratinjau dibuat mesin, gerbang V1 jalan, versi disimpan lewat rute yang sama (`isian` = `{versi_bot: 2, hasil, sesi, pagar}`), draf dikirim (pratinjau lalu PDF) dengan ringkasan agen, perubahan, catatan, dan peringatan asal angka. Gagal: draf ditolak, pemakai dibalas, pemilik dikabari, proyek kembali `terbuka`, `ulangi` tersedia.
7. Galat agen, lewat batas waktu, lewat anggaran, atau `hasil.json` tidak sah: proyek kembali `terbuka`, pemakai dibalas "Draf v1 gagal dibangun", `ulangi` mengulang langkah 4 (sesi dilanjutkan bila ada).

### V2-B. Revisi

1. Pemegang draf proyek V2 mengirim kalimat revisi (atau jawaban atas pertanyaan agen, D25).
2. Mesin menyiapkan ruang kerja `v<n>/`: deck versi terakhir ke `sebelum/`, `dasar/` dan `bahan/` disalin dari ruang kerja v1 (acuan angka sistem tetap deck dasar v1), `kemarin/` disalin dari v1.
3. Kunci, biaya, lalu sesi agen proyek dilanjutkan dengan kalimat itu (A13; resume gagal = sesi baru dengan riwayat, D14).
4. Hasil: sama dengan V2-A langkah 6, kecuali: `tanya` = status kembali `draf`; pagar gagal atau galat agen = status kembali `draf`, versi terakhir tetap berlaku, pemakai dibalas "Revisi vN gagal", `ulangi` mengulang revisi itu (D24).
5. `balik vN` di proyek V2: PPTX versi N disalin sebagai versi baru tanpa agen (D24); sesi agen diberi tahu di revisi berikutnya bahwa draf sekarang salinan vN.

### V2-C. Final

Sama dengan V1. Tambahan: jalur deck final dicatat di `~/.wa-bot/agen/final.json` per jenis dan tanggal (D23); sesi agen dan transkripnya dihapus (D14). `batal` dan `kedaluwarsa` juga menghapus sesi.

## V2.1: kecerdasan percakapan (K29, K30)

### V2.1-A. Bahan berantakan (D30, D31)

1. Generator gagal membaca bahan (galat baca, bukan galat mesin).
2. Mesin mengirim teks WA mentah tiap bahan dan pesan galatnya ke Claude; Claude mengembalikan teks rapi dan daftar perubahan.
3. Pagar rapikan memeriksa angka (D31). Lolos: generator dijalankan ulang dengan teks rapi. Ditolak: balasan galat seperti biasa, dengan penyebabnya.
4. Paling banyak 2 kali. Draf yang jadi mencatat "Bahan dirapikan Claude" dan perubahannya.

### V2.1-B. Kalimat bebas (D32, D33)

1. Pesan teks pendek yang bukan perintah baku diklasifikasi Claude Haiku bersama ringkasan proyek pengirim.
2. Buat: daftar bahan. Lanjut, status, bantuan: dijalankan. Final dan batal: ditanya "Balas *ya*". Revisi: alur B. Tanya: V2.1-C. Obrolan: jawaban singkat. Bahan: jalur bahan biasa.
3. Klasifikasi gagal: perilaku sebelum V2.1.

### V2.1-C. Tanya draf (D34)

1. Pemegang draf bertanya tentang isi draf.
2. Mesin membaca teks deck versi terakhir; Claude menjawab dari teks itu. Tidak ada versi baru.

### V2.1-D. Kumpul revisi (D35)

1. Pemegang draf mengetik *revisi*. Bot: "Kirim revisinya, boleh beberapa pesan. Ketik *lanjut* kalau sudah."
2. Pesan teks berikutnya (termasuk yang diteruskan) masuk kumpulan; tanda terima sekali per 20 detik jeda.
3. *lanjut*: kumpulan digabung bernomor dan dikerjakan sebagai satu revisi (alur B untuk V1, V2-B untuk V2). Kumpulan ditutup.
4. *batal*: kumpulan ditutup, draf tetap. Lewat 2 jam tanpa pesan baru: kumpulan dibuang.
