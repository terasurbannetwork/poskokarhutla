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

### A4. Bahan belum lengkap (T-TANYA)

```text
*Bahan belum lengkap*
_P-181126-01_

Laporan Kejadian Bencana Harian 18 Nov perlu dipastikan dulu:
1. PVMBG pagi untuk 18 Nov belum ada. Kirim bahannya.
2. Sorti water bombing berbeda: 14 ("sorti 14") dan 12 ("sorti 12"). Mana yang dipakai?

Kirim jawabannya lalu ketik *buat*, atau ketik *buat saja* untuk lanjut dengan bahan yang ada.
```

Catatan: jawaban bebas atas pertanyaan belum diurai mesin (TODO BL-10), jadi kalimatnya meminta *buat* lagi sesudah menjawab.

### A5. Jenis laporan belum jelas

```text
*Jenis laporan belum jelas*

Bahan 18 Nov belum menunjukkan jenis laporannya.

Ketik salah satu:
- *buat harian 2026-11-18*
- *buat penanganan 2026-11-18*
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

Draf v1 tetap berlaku. Pemilik sudah dikabari, kirim revisinya lagi nanti.
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
- Kirim atau teruskan bahan dulu
- *buat harian*: laporan kejadian bencana
- *buat penanganan*: laporan penanganan karhutla
- *buat saja*: lanjut dengan bahan ada

*Saat draf*
- *1* atau *final*: kirim versi final
- *2* atau *pptx*: minta berkas PPTX
- *3* atau *versi*: lihat riwayat versi
- *4* atau *batal*: batalkan proyek
- *balik v2*: pakai isi versi 2
- Kalimat biasa: revisi draf

*Lainnya*
- *status*: proyek yang masih terbuka
- *bantuan*: tampilkan pesan ini

Contoh: *buat harian kemarin*
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

## F. Galat ke pengirim

### F1. Bahan gagal dibaca (Claude)

```text
*Bahan belum terbaca*
_P-181126-01_

Mesin gagal membaca bahan. Kirim ulang bahannya, lalu coba lagi.
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

Pemilik sudah dikabari. Ketik *buat* lagi beberapa saat lagi.
```

### F4. Perintah gagal diproses (galat lain)

```text
*Perintah gagal diproses*

Pemilik sudah dikabari. Coba lagi beberapa saat lagi.
```

### F5. Bot belum siap

```text
*Bot belum siap*

Pemilik sudah dikabari. Coba lagi beberapa saat lagi.
```

## G. Pendaftaran nomor

### G1. Nomor belum terdaftar (T-DAFTAR)

```text
*Nomor belum terdaftar*

Nomor ini belum terdaftar di bot laporan BNPB.
Untuk mendaftar, ketik:
*daftar nama, instansi*

Contoh: daftar Budi Santoso, BPBD Riau
```

### G2. Format belum sesuai

```text
*Format belum sesuai*

Ketik: *daftar nama, instansi*
Contoh: daftar Budi Santoso, BPBD Riau
```

### G3. Permintaan terkirim

```text
*Permintaan terkirim*

Permintaan daftar sudah diteruskan ke admin.
Kabar dikirim ke nomor ini sesudah diputuskan.
```

### G4. Disetujui dan belum disetujui

```text
*Pendaftaran disetujui*

Nomor ini sekarang terdaftar di bot laporan BNPB.
Ketik *bantuan* untuk melihat cara pakai.
```

```text
*Pendaftaran belum disetujui*

Nomor ini belum bisa memakai bot laporan BNPB.
```

## H. Pesan ke pemilik

### H1. Permintaan daftar baru

```text
*Permintaan daftar baru*

Nama: Budi Santoso
Instansi: BPBD Riau
Nomor: 6281100000000

Balas *setuju 6281100000000* atau *tolak 6281100000000*
```

### H2. Putusan tersimpan

```text
*Disetujui*

Budi Santoso (BPBD Riau), 6281100000000
Pendaftar sudah dikabari.
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
