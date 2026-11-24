# ALUR: Kejadian dari Laporan Warga

## 1. Dari laporan sampai halaman publik

1. Warga mengirim laporan (alur induk `lapor-ai/ALUR.md`); tiket `baru`; ringkasan memuat kode desa, jenis, waktu kejadian.
2. Mesin pengelompokan (A9 plus aturan satu desa, `ALGORITMA.md` A1) menyatukan laporan satu desa berjenis sama dalam jendela menjadi satu kejadian laporan. Meja menampilkan "N pelapor" bila 2 atau lebih.
3. Petugas BPBD membuka rincian di `/lapor/meja`, mengisi kartu Pengecekan lapangan: Valid, Sebagian benar, atau Tidak valid, dengan catatan (alur sudah ada, D108).
4. Mesin menilai D4 (`ALGORITMA.md` A3) tiap kali daftar publik dibangun. Bila lima syarat terpenuhi, kejadian laporan masuk daftar publik. Tidak ada langkah staf tambahan (bawaan Q5).
5. Halaman `/lapor/hari-ini` memuat kartu dari `GET /api/lapor/hari-ini` (cache tepi 60 detik).
6. Staf yang melihat kesalahan menekan "Tarik dari halaman publik" di rincian meja. Kartu hilang paling lambat 60 detik kemudian.

## 2. Dari kejadian laporan ke kejadian resmi (K87)

1. Staf berhak (Q11) membuka rincian kejadian laporan di meja. Tombol "Usulkan ke Buku Besar" tampil bila: ada paling sedikit satu laporan terverifikasi (D4), jenis terpetakan ke jenis Buku Besar, kab diketahui, belum ada usulan aktif.
2. Klik: Worker menulis satu baris `lk_usulan` (kode usulan, nomor laporan anggota, pengusul, waktu). Meja menulis "Diusulkan, menunggu pencocokan".
3. Jalan terjadwal `pasang.py masuk` mengambil rekaman sumber `lapor_ai` dari rute ingest modul. Pencocok memakai aturan yang sama dengan semua sumber:

| Kandidat kejadian resmi | Hasil | Tampilan meja |
| --- | --- | --- |
| tepat satu | `tambah`: menempel | "Terpasang ke Kejadian resmi KJ-..." dengan tautan |
| nol | `baru` (khusus usulan staf, perubahan D29 oleh K87): didirikan, fase `terdeteksi` | "Didirikan sebagai Kejadian resmi KJ-..." |
| lebih dari satu | `ambigu`: masuk antrean tinjau Siklus | "Menunggu keputusan staf Siklus" |
| tanpa wilayah | `tanpa_wilayah`: antrean | "Menunggu kelengkapan wilayah" |

4. Staf Siklus yang memegang antrean memutuskan dengan rute yang sudah ada (`POST /api/siklus/antrean/:sid`).
5. Rekaman Buku Besar membawa label "laporan warga, diverifikasi BPBD" dan dampak kosong. Fase tidak naik otomatis.

## 3. Kegagalan dan keadaan tepi

| Keadaan | Perlakuan |
| --- | --- |
| Verifikasi Valid lalu laporan diubah Tidak valid | kartu turun pada muat berikutnya (Q20); usulan yang sudah diproses tidak ditarik otomatis, staf Siklus yang menyunting di Buku Besar |
| Laporan mendapat versi baru sesudah pengecekan | syarat D4 butir 4 gagal; kartu turun sampai dicek ulang |
| Dua staf menekan Usulkan hampir bersamaan | kunci unik `lk_usulan` per kode usulan; klik kedua dijawab "Sudah diusulkan" tanpa baris baru |
| `pasang.py` belum jalan | status tetap "Diusulkan" |
| Wilayah laporan tidak terpetakan ke kab4 | `tanpa_wilayah` |
| Satu kejadian laporan pecah karena jendela | tiap pecahan diperlakukan sendiri; usulan per kejadian laporan, bukan per desa |
| Halaman publik kosong | teks keadaan kosong tanpa kata aman |
| D1 tidak menjawab | halaman memuat "Data belum bisa dimuat, coba lagi"; tidak menampilkan salinan lama tanpa stempel waktu |

## 4. Peran lintas modul

| Langkah | Modul | Pemilik berkas |
| --- | --- | --- |
| Kelompok dan definisi | `src/lapor_gugus.js`, `src/lapor_kejadian.js` | `warga-api` |
| Kartu publik, halaman | `public/lapor/**` | `layar-peta` |
| Pencocok | `scripts/siklus/pasang.py` | `siklus` |
| Antrean tinjau | `src/siklus_kejadian.js`, `public/siklus/**` | `warga-api`, `siklus` |
