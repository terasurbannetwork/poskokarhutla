# CONTOH-PESAN: Bot WA pembuat laporan

Teks akhir tiap jenis pesan bot, persis seperti yang dilihat pemakai di WhatsApp (tanda `*` jadi tebal, `_` jadi miring). Nilai contoh rekaan: kode proyek, tanggal, angka, nama, dan nomor bukan data sungguhan. Aturan gayanya di `DESIGN-SYSTEM.md`; uji yang menjaga teks ini di `tests/wa/proyek.test.mjs`, `arah.test.mjs`, `daftar.test.mjs`, `perintah.test.mjs`.

Untuk ditinjau pemilik. Bila ada teks yang ingin diubah, sebut nomor bagiannya.

## A. Membuat laporan

### A1. Draf v1 siap (keterangan gambar pratinjau slide 1)

```text
*Draf v1 siap*
_P-181126-01, versi 1_

Laporan Kejadian Bencana Harian 18 Nov
Bahan: Rekap Koordalops 24 jam 1, BMKG pagi 1, PVMBG pagi 1
Gambar ini slide 1, PDF menyusul.

*Balas angka:*
1 Final
2 Minta PPTX
3 Lihat versi
4 Batal

Atau tulis perubahan dengan kalimat biasa.
```

### A2. Draf v1 penanganan karhutla, dengan catatan dan pemeriksaan

```text
*Draf v1 siap*
_P-181126-02, versi 1_

Laporan Penanganan Pengendalian Karhutla 17 Nov
Bahan: Satgas pemadaman 2, BMKG pagi 1, bahan lain 1
Hotspot, firespot, luas terbakar, dan luas belum padam dari sistem (hari D-1).
Gambar ini slide 1, PDF menyusul.

*Catatan:*
- Foto posko tidak terbaca. Kirim teks atau PDF.

*Pemeriksaan:*
- Angka hotspot hari ini 1.284, lebih dari 3 kali median.

*Balas angka:*
1 Final
2 Minta PPTX
3 Lihat versi
4 Batal

Atau tulis perubahan dengan kalimat biasa.
```

### A3. Keterangan PDF draf (kiriman kedua)

```text
*PDF draf v1*
_P-181126-01, versi 1_

Laporan Kejadian Bencana Harian 18 Nov
```

### A0. Alur dituntun (K17)

1. Pemakai mengetik *buat harian* atau *buat penanganan* (boleh bertanggal). Bot membalas daftar bahan (A0a).
2. Tiap bahan yang masuk dibalas tanda terima dengan sisa yang kurang (A0b sampai A0d). Kiriman yang datang dalam sekitar 20 detik digabung jadi satu pesan.
3. Bot tidak pernah membangun sendiri, juga saat bahan wajib lengkap. Pemakai mengetik *lanjut* (atau *buat saja*).
4. Sesudah *lanjut*, bentrok angka atau bahan tak terbaca ditanyakan sekali (A4). *lanjut* lagi membangun dan mencatatnya. Bahan wajib yang kurang tidak ditanyakan, hanya dicatat di draf (A2b).
5. Bahan yang dikirim sebelum *buat* tetap dipakai dan langsung tertandai "sudah ada". Tanpa *buat*, bahan diterima diam-diam seperti dulu.

### A0a. Daftar bahan sesudah *buat penanganan*

```text
*Kirim bahan laporan*
_P-181126-02_

Laporan Penanganan Pengendalian Karhutla 18 Nov

*Wajib:*
- Satgas pemadaman atau laporan penanganan lengkap

*Tambahan:*
- Gelar kekuatan Satgas Udara (Excel)

Kirim atau teruskan bahannya ke sini.
Ketik *lanjut* bila sudah siap.
```

Wajib penanganan cukup salah satu: laporan Satgas pemadaman, atau laporan penanganan lengkap ("LAPORAN PENANGANAN KARHUTLA DI ENAM PROVINSI PRIORITAS") yang memuat bagian Operasi Darat dan Udara yang sama. BMKG pagi tidak lagi diminta; cuaca dan PM2.5 diambil dari data sistem. BMKG pagi yang dikirim sendirian disimpan sebagai bahan tanpa membuka proyek; terhitung saat *buat harian*.

Bila semua bahan wajib sudah ada, judulnya `*Bahan wajib lengkap*` dan baris terakhirnya "Ketik *lanjut* untuk membuat laporan." Laporan harian tidak punya bagian Tambahan. Sebelum cut-off hari ini, di bawah nama laporan ada baris "Belum cut-off 18.00 WIB, angka sistem hari ini belum lengkap."

### A0b. Tanda terima bahan, wajib belum lengkap

```text
*Diterima: Satgas pemadaman* (1 dari 2 wajib)
_P-181126-02_

*Masih kurang:*
- BMKG pagi

Ketik *lanjut* bila ingin membuat dengan bahan yang ada.
```

### A0c. Tanda terima, bahan wajib lengkap

```text
*Bahan wajib lengkap*
_P-181126-02_

Diterima: BMKG pagi.

*Opsional, boleh dilewati:*
- Gelar kekuatan Satgas Udara (Excel)

Ketik *lanjut* untuk membuat laporan.
```

### A0d. Kiriman di luar format baku

```text
*Bahan disimpan*
_P-181126-02_

Laporan Penanganan Pengendalian Karhutla 18 Nov
Kiriman lain (bukan format baku) ikut disimpan dan dibaca saat laporan dibuat.

*Wajib:*
- BMKG pagi: sudah ada
- Satgas pemadaman

*Tambahan:*
- Gelar kekuatan Satgas Udara (Excel)

Ketik *lanjut* bila ingin membuat dengan bahan yang ada.
```

Beberapa kiriman digabung: "3 kiriman lain (bukan format baku) ...". Contohnya info hujan harian untuk laporan penanganan: tidak punya kepala baku, tetapi tetap dibaca Claude saat bangun.

### A0d2. Bahan bertanggal hari lain

```text
*Bahan bertanggal lain*
_P-181126-01_

Laporan Kejadian Bencana Harian 18 Nov
Diterima, tetapi bertanggal 17 Nov, tidak dipakai untuk laporan 18 Nov: BMKG pagi.

*Wajib:*
- Rekap Koordalops 24 jam: sudah ada
- BMKG pagi
- PVMBG pagi

Ketik *lanjut* bila ingin membuat dengan bahan yang ada.
```

### A0e. *lanjut* tanpa proyek terbuka

```text
*Belum ada proyek terbuka*

Ketik *buat harian* atau *buat penanganan* dulu, lalu kirim bahannya.
```

### A0f. Data satelit penanganan (K18)

Baris di daftar bahan penanganan, di bawah nama laporan:

```text
Data satelit: lintasan siang masuk FIRMS 13.42 WIB, situs belum memuat.
```

Sebelum membangun, bila situs belum memuat lintasan siang:

```text
*Situs belum memuat data satelit*
_P-181126-02_

Data satelit: lintasan siang masuk FIRMS 13.42 WIB, situs belum memuat.

Pilih salah satu:
- *tunggu*: dibangun otomatis begitu situs memuat lintasan itu
- *hitung*: bangun sekarang, firespot dihitung langsung dari FIRMS dengan rumus yang sama dengan situs
```

Balasan *tunggu*:

```text
*Menunggu situs*
_P-181126-02_

Laporan dibangun otomatis begitu situs memuat lintasan siang.
Dicek tiap 10 menit.

Ketik *hitung* bila ingin membangun sekarang.
```

Sesudah 3 jam (atau 3 kali status satelit tak terbaca), sekali:

```text
*Situs masih belum memuat*
_P-181126-02_

Data satelit: lintasan siang masuk FIRMS 13.42 WIB, situs belum memuat.

Pilih lagi:
- *hitung*: bangun sekarang, firespot dihitung langsung dari FIRMS dengan rumus yang sama dengan situs
- *tunggu*: tetap menunggu situs
```

*hitung* atau *tunggu* tanpa pilihan yang menunggu:

```text
*Tidak ada pilihan menunggu*

*hitung* hanya menjawab pilihan data satelit laporan penanganan. Ketik *status* untuk melihat proyek.
```

Balasan *hitung*: draf biasa (A1) dengan baris catatan:

```text
*Catatan:*
- Firespot dihitung langsung dari FIRMS dengan rumus situs.
```

### A2b. *lanjut* dengan bahan wajib kurang (draf tetap dibuat, kekurangan dicatat)

```text
*Draf v1 siap*
_P-181126-02, versi 1_

Laporan Penanganan Pengendalian Karhutla 18 Nov
Bahan: Gelar kekuatan Satgas Udara (Excel) 1
Hotspot, firespot, luas terbakar, dan luas belum padam dari sistem (hari D-1).
Gambar ini slide 1, PDF menyusul.

*Catatan:*
- Satgas pemadaman untuk 18 Nov belum ada.

*Balas angka:*
1 Final
2 Minta PPTX
3 Lihat versi
4 Batal

Atau tulis perubahan dengan kalimat biasa.
```

### A4. Bahan perlu dipastikan (T-TANYA, sesudah *lanjut*)

```text
*Bahan perlu dipastikan*
_P-181126-01_

Laporan Kejadian Bencana Harian 18 Nov perlu dipastikan dulu:
1. Sorti water bombing berbeda: 14 ("sorti 14") dan 12 ("sorti 12"). Mana yang dipakai?
2. sitrep.pdf tidak terbaca. Kirim teks atau PDF.

Kirim jawabannya, atau ketik *lanjut* untuk membuat dengan bahan yang ada.
```

Catatan: jawaban bebas atas pertanyaan belum diurai mesin (TODO BL-10). Bahan pengganti yang dikirim tetap dipakai; *lanjut* berikutnya membangun dan mencatat yang masih bentrok.

### A5. Jenis laporan belum jelas

```text
*Jenis laporan belum jelas*

Bahan 18 Nov belum menunjukkan jenis laporannya.

Ketik salah satu:
- *buat harian 2026-11-18*
- *buat penanganan 2026-11-18*
```

### A5b. Kemajuan pembangunan (satu pesan, disunting per tahap)

Selama membangun, WhatsApp menampilkan "sedang mengetik". Pesan pertama:

```text
*Membangun draf v1*
_P-181126-01_

[jalan] Membaca bahan
[menunggu] Mengurai bahan dengan AI
[menunggu] Membuat slide
[menunggu] PDF dan pemeriksaan
```

Pesan yang sama disunting tiap pindah tahap (paling banyak 4 kali). Sesudah pratinjau dan PDF terkirim:

```text
*Membangun draf v1*
_P-181126-01_

[selesai] Membaca bahan
[selesai] Mengurai bahan dengan AI
[selesai] Membuat slide
[selesai] PDF dan pemeriksaan
```

Bila gagal, tahap itu bertanda `[gagal]` lalu balasan gagal (F3) menyusul. Revisi memakai judul `*Menerapkan revisi v2*` dengan tahap Membaca permintaan, Menerapkan perubahan, Membuat slide, PDF dan pemeriksaan.

### A5c. *lanjut* lagi saat masih dibangun (sekali)

```text
*Masih dibangun*
_P-181126-01_

Tunggu sebentar, draf dikirim begitu siap.
```

### A6. Sedang dibangun

```text
*Sedang dibangun*
_P-181126-01_

Tunggu sebentar, draf dikirim begitu siap.
```

### A7. Draf sudah ada (ketik *buat* lagi saat draf)

```text
*Draf sudah ada*
_P-181126-01, versi 1_

Tulis perubahan dengan kalimat biasa, atau balas *1* untuk final.
```

## B. Revisi

### B1. Keterangan gambar pratinjau revisi

```text
*Pratinjau slide 3*
_P-181126-01, versi 2_

Ringkasan perubahan ada di PDF berikutnya.
```

### B2. Draf revisi siap (keterangan PDF)

```text
*Draf v2 siap*
_P-181126-01, versi 2_

Laporan Kejadian Bencana Harian 18 Nov

*Perubahan:*
- Slide 3: "Rencana aksi" diganti "Rencana aksi BPBD".

*Balas angka:*
1 Final
2 Minta PPTX
3 Lihat versi
4 Batal

Atau tulis perubahan dengan kalimat biasa.
```

Bila sebagian ditolak, bagian `*Tidak diubah:*` dan `*Dilewati:*` muncul di antara Perubahan dan menu.

### B3. Revisi menyentuh angka sistem (T-TOLAK-KUNCI)

```text
*Revisi tidak diterapkan*
_P-181126-01, versi 1_

Draf tetap v1.

Hotspot 1.234 di slide 2 adalah angka sistem (hari D-1), tidak bisa diubah lewat revisi.

Bila angka lapangan berbeda, minta catatan. Contoh: tambahkan catatan di slide 2 bahwa angka lapangan berbeda.
```

### B4. Kalimat revisi tidak terbaca

```text
*Revisi tidak diterapkan*
_P-181126-01, versi 1_

Draf tetap v1.

Tidak ada perubahan yang terbaca dari kalimat itu. Sebut nomor slide dan teks yang diganti.
```

### B5. Revisi perlu dipastikan

```text
*Revisi perlu dipastikan*
_P-181126-01, versi 1_

1. Slide mana yang dimaksud, 2 atau 3?

Balas dengan kalimat revisi yang lebih rinci.
```

### B6. Revisi gagal dibangun

```text
*Revisi v2 gagal dibangun*
_P-181126-01, versi 1_

Draf v1 tetap berlaku. Pemilik sudah dikabari.
Ketik *ulangi* untuk mencoba lagi, atau *batal* untuk membatalkan.
```

## C. Menu bernomor dan perintah saat draf

### C1. Balas *3* atau *versi*

```text
*Riwayat versi*
_P-181126-01, versi 2_

Laporan Kejadian Bencana Harian 18 Nov
- v1 18 Nov 08.00, buat
- v2 18 Nov 08.12, revisi: judul tambahkan BNPB

Ketik *balik v1* (atau nomor lain) untuk membuat versi baru dengan isi versi itu.
```

### C2. Balas *2* atau *pptx* (keterangan berkas PPTX)

```text
*PPTX draf v2*
_P-181126-01, versi 2_

Laporan Kejadian Bencana Harian 18 Nov
```

### C3. Balas *4* (tanya sekali)

```text
*Batalkan proyek ini?*
_P-181126-01, versi 2_

Laporan Kejadian Bencana Harian 18 Nov
Ketik *ya* untuk membatalkan P-181126-01, tanpa unggah.

Berlaku 5 menit. Abaikan pesan ini bila tidak jadi.
```

### C4. *ya* dalam 5 menit, atau ketik *batal*

```text
*Proyek dibatalkan*
_P-181126-01, versi 2_

Laporan Kejadian Bencana Harian 18 Nov dibatalkan, tanpa unggah.
Ketik *buat* untuk memulai lagi.
```

### C5. Angka menu tanpa draf

```text
*Belum ada draf*

Angka 1 menjawab menu draf. Kirim bahan, lalu ketik *buat* dulu.
```

### C6. Angka menu saat memegang dua draf tanpa catatan menu terakhir

```text
*Ada 2 draf terbuka*

- P-181126-01: Laporan Kejadian Bencana Harian 18 Nov
- P-181126-02: Laporan Penanganan Pengendalian Karhutla 17 Nov

Ketik perintahnya dengan kode proyek, misalnya *final P-181126-01*.
```

### C7. Balik ke versi yang tidak ada

```text
*Versi v9 tidak ada*
_P-181126-01, versi 4_

Versi terakhir v4. Balas *3* untuk melihat riwayat versi.
```

## D. Final

### D1. Keterangan PPTX dan PDF final

```text
*PPTX final v2*
_P-181126-01, versi 2_

Laporan Kejadian Bencana Harian 18 Nov
```

```text
*PDF final v2*
_P-181126-01, versi 2_

Laporan Kejadian Bencana Harian 18 Nov
```

### D2. Laporan selesai (T-FINAL)

```text
*Laporan selesai*
_P-181126-01, versi 2_

Laporan Kejadian Bencana Harian 18 Nov, final versi 2.
Folder Drive (Revisi 1):
https://drive.google.com/drive/folders/CONTOH

*Riwayat versi:*
- v1 18 Nov 08.00, buat
- v2 18 Nov 08.12, revisi: judul tambahkan BNPB

Proyek ditutup. Bahan berikutnya membuka proyek baru.
```

### D3. Final diterima, penutupan tertunda

```text
*Final v2 diterima*
_P-181126-01, versi 2_

Penutupan belum selesai, diulang otomatis tiap 10 menit.
Tautan Drive menyusul.
```

### D4. Belum ada draf untuk difinalkan

```text
*Belum ada draf untuk difinalkan*

Kirim bahan, lalu ketik *buat harian* atau *buat penanganan*.
```

## E. Status, bantuan, dan pemberitahuan

### E1. *status*

```text
*Proyek terbuka*

_P-181126-01, versi 1_
Laporan Kejadian Bencana Harian 18 Nov
Status: draf siap
Balas *1* untuk final, atau tulis revisi.
```

Tanpa proyek:

```text
*Belum ada proyek terbuka*

Kirim atau teruskan bahan, lalu ketik *buat harian* atau *buat penanganan*.
```

### E2. *bantuan*

```text
*Cara pakai bot laporan*

*Membuat laporan*
- *buat harian*: mulai laporan kejadian bencana
- *buat penanganan*: mulai laporan penanganan karhutla
- Kirim atau teruskan bahan yang diminta
- *lanjut*: buat laporan dari bahan ada

*Saat draf*
- *1* atau *final*: kirim versi final
- *2* atau *pptx*: minta berkas PPTX
- *3* atau *versi*: lihat riwayat versi
- *4* atau *batal*: batalkan proyek
- *balik v2*: pakai isi versi 2
- Kalimat biasa: revisi draf

*Lainnya*
- *status*: proyek yang masih terbuka
- *ulangi*: coba lagi langkah yang gagal
- *batal*: batalkan proyek kapan saja
- *bantuan*: tampilkan pesan ini

Contoh: *buat harian kemarin*, kirim bahannya, lalu *lanjut*
Tanggal bisa: kemarin, 26 okt, 26/10, 2026-10-26.
```

Untuk pemilik saja, ditambah di bawahnya:

```text
*Khusus pemilik*
- *kirim ulang harian 26 okt*: kirim ulang berkas
- *status 26 okt*: rekap bahan per tanggal
```

### E3. Ditutup otomatis (24 jam tanpa aktivitas)

```text
*Proyek ditutup otomatis*
_P-181126-01_

Laporan Penanganan Pengendalian Karhutla 17 Nov ditutup karena 24 jam tanpa aktivitas, tanpa unggah.
Ketik *buat* untuk memulai lagi.
```

### E4. Pesan saat bot mati (T-TERLEWAT)

```text
*Pesan belum diproses*

Bot tadi mati jam 14.05 sampai 16.30.
Pesan di jam itu tidak diproses. Kirim ulang bila masih perlu.
```

### E5. Sapaan tanpa proyek (T-SAPA)

Pesan pendek yang bukan perintah dari nomor terdaftar tanpa proyek terbuka (misalnya "halo", "selamat pagi", "test"), sekali per 6 jam:

```text
*Halo, ini Bot Laporan BNPB*
Bot ini menyusun laporan resmi BNPB dari bahan yang Anda kirim, lalu menyimpannya ke Google Drive Tim IT.

*Mulai dengan mengetik:*
- *buat harian*: laporan kejadian bencana harian
- *buat penanganan*: laporan penanganan karhutla

*Butuh bantuan?*
- *bantuan*: daftar perintah
- *panduan*: gambar panduan lengkap
```

## F. Galat ke pengirim

### F1. Bahan gagal dibaca (Claude)

```text
*Bahan belum terbaca*
_P-181126-01_

Mesin gagal membaca bahan. Kirim ulang bahannya, lalu coba lagi.

Ketik *ulangi* untuk mencoba lagi, atau *batal* untuk membatalkan.
```

### F2. Kuota habis (T-KUOTA)

```text
*Kuota hari ini habis*
_P-181126-01, versi 1_

Kuota pembacaan hari ini sudah habis. Bot lanjut lagi besok.
```

### F3. Draf gagal dibangun

```text
*Draf v1 gagal dibangun*
_P-181126-01_

Pemilik sudah dikabari.
Ketik *ulangi* untuk mencoba lagi, atau *batal* untuk membatalkan.
```

### F4. Perintah gagal diproses (galat lain)

```text
*Perintah gagal diproses*

Pemilik sudah dikabari.
Ketik *ulangi* untuk mencoba lagi, atau *batal* untuk membatalkan.
```

### F4b. *ulangi*

*ulangi* menjalankan lagi langkah terakhir yang gagal: draf yang gagal dibangun atau disimpan dibangun lagi seperti *lanjut*, revisi yang gagal dijalankan lagi dengan kalimat yang sama. Catatan gagal berlaku 24 jam dan proyeknya harus masih terbuka. Tanpa langkah gagal:

```text
*Tidak ada yang perlu diulang*

Belum ada langkah yang gagal. Ketik *status* untuk melihat proyek.
```

*batal* bekerja di setiap status proyek yang masih terbuka (menunggu bahan, menunggu jawaban, pembangunan yang terhenti, draf). Angka *4* di menu draf tetap bertanya dulu.

### F5. Bot belum siap

```text
*Bot belum siap*

Pemilik sudah dikabari. Coba lagi beberapa saat lagi.
```

## G. Nomor belum terdaftar (K19)

Tidak ada pendaftaran mandiri. Pesan apa pun dari nomor asing, termasuk "daftar ...", dijawab sama, paling banyak sekali sehari per nomor dan 30 nomor per hari.

### G1. Nomor belum terdaftar (T-DAFTAR)

```text
*Nomor belum terdaftar*
Bot ini hanya bisa dipakai nomor yang terdaftar.
```

## H. Pesan ke pemilik

### H1. Mendaftarkan dan mencabut nomor

Pemilik mengetik `setuju 081200000000 Budi Santoso` atau `tolak 081200000000`. Nomor itu sendiri tidak dikirimi pesan.

```text
*Nomor terdaftar*
Budi Santoso (6281200000000) sekarang bisa memakai bot laporan.
```

```text
*Nomor dicabut*
Budi Santoso (6281200000000) tidak lagi terdaftar.
```

### H2. Batas harian balasan nomor asing

```text
*Balasan nomor asing ditahan*
Hari ini sudah 30 nomor belum terdaftar dibalas. Nomor berikutnya tidak dibalas sampai besok.
```

### H3. Galat bot laporan

```text
*Galat bot laporan*
_P-181126-01, versi 1_

Unggah Google Drive gagal, diulang otomatis tiap 10 menit.
Google Drive belum dikonfigurasi (DRIVE_CLIENT_ID, DRIVE_ROOT, DRIVE_LAPORAN, ~/.wa-bot/drive.json)
```

## I. Jalur lama tanpa mesin proyek (`perintah.mjs`, BL_PROYEK mati)

### I1. Bahan belum lengkap

```text
*Bahan belum lengkap*

Laporan Kejadian Bencana Harian 18 Nov:
- Rekap Koordalops 24 jam: ada, bertanggal 18 Nov
- BMKG pagi: belum untuk 18 Nov, yang ada bertanggal 17 Nov

Kirim bahan yang kurang, lalu ketik perintah yang sama lagi.
```

### I2. Membuat, lalu keterangan berkas

```text
*Membuat laporan*

Laporan Kejadian Bencana Harian 18 Nov
Mohon tunggu, berkas menyusul.
```

```text
*Laporan atas permintaan*

Laporan Kejadian Bencana Harian 18 Nov
Belum dikirim ke penerima.
```

### I3. *status 18 nov*

```text
*Bahan 18 Nov*

4 dari 5 laporan wajib sudah masuk.
Belum: PVMBG pagi.

*Kiriman hari ini (18 Nov)*
- Harian: sudah dikirim
- Penanganan: belum dikirim
```
