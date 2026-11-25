# Gugus, verifikasi, kartu publik

Halaman ini menjelaskan pengelompokan laporan, syarat terverifikasi BPBD, kartu publik, Alun-alun, data agregat, dan waktu respons.

## Gugus laporan

Sumber: laporan terkirim bukan tidak_valid. Berkas: `src/lapor_gugus.js:19`, dipakai Alun-alun dan halaman kejadian. Aturan menurut jenis (`GUGUS_ATURAN`, `src/lapor_gugus.js:6`, seluruhnya HIPOTESIS menunggu data uji):

| Jenis | Mode | Radius | Jendela waktu kejadian |
| --- | --- | --- | --- |
| banjir, longsor, kebakaran_gedung | lokal | 3 km | 6 jam |
| cuaca | lokal | 5 km | 6 jam |
| karhutla | lokal | 5 km | 12 jam |
| gempa, erupsi, tsunami | luas (kab sama) | tidak berlaku | 12 jam |
| kekeringan, abrasi | tidak dihitung | | |

Langkah: dua laporan berjenis sama disambung bila selisih waktu kejadian paling lama jendela dan jaraknya (haversine) paling jauh radius, atau (mode luas) kab sama; laporan tanpa titik tetap cocok bila kode desanya sama. Penyambungan memakai union-find. Komponen menjadi gugus hanya bila berisi paling sedikit dua nomor pelapor berbeda; satu nomor yang melapor berulang tidak mendirikan gugus. Pusat gugus adalah median lintang dan median bujur anggota; radius adalah jarak anggota terjauh dengan minimum 300 m. Label: `gugus` bila 2 pelapor atau lebih; `gugus kuat` bila 3 pelapor atau lebih atau dua pelapor berbeda memiliki foto berlencana. Kata "terverifikasi" tidak dipakai pada label gugus. Nomor `GL-DDMMYY-NN` dihitung dari tanggal mulai. Angka dampak antaranggota tidak dijumlah dan ditampilkan per laporan atau sebagai rentang.

Kejadian yang sama ditawarkan saat melapor (`kandidatKejadian`, `src/lapor_gugus.js:47`): kecamatan sama, status bukan tidak_valid atau selesai, dalam jendela jenis (72 jam untuk jenis tanpa aturan), paling banyak 3 kandidat, satu per jenis, tanpa nama atau nomor di hasil. Kode kejadian `KJ-DDMMYY-NN` di tabel `lapor_kelompok` adalah kode kejadian laporan, berbeda dari kode kejadian resmi Buku Besar yang berawalan sama.

Uji balik: tidak ada uji balik terhadap data nyata; seluruh ambang tertulis HIPOTESIS.

## Terverifikasi BPBD

Fungsi `terverifikasiBpbd` (`src/lapor_kejadian.js:28`) bernilai benar hanya bila lima syarat terpenuhi bersamaan:

1. Pengecekan terakhir (urut waktu, lalu id) berhasil `valid`; `sebagian` dan `tidak_valid` tidak memenuhi.
2. Pemeriksa adalah akun lembaga BPBD (pemkab, pemkot, pemprov) yang wilayahnya mencakup kode wilayah laporan, dibaca dari kode wilayah laporan dan bukan isian pelapor; staf BNPB, admin, dan peran yang hanya mengaku tidak cukup.
3. Status tiket bukan tidak_valid.
4. Tidak ada versi laporan lebih baru daripada pengecekan.
5. Tidak ada tarikan aktif untuk kejadiannya.

Pengecekan lama tanpa baris samping `lk_periksa_akun` dihitung belum terverifikasi. Kejadian laporan (gugus atau laporan tunggal) terverifikasi bila paling sedikit satu anggotanya terverifikasi, dan hanya anggota terverifikasi yang memberi angka.

## Kartu publik kejadian hari ini

`GET /api/lapor/hari-ini` membangun kartu dari nol dengan daftar putih (`kartuPublik`, `src/lapor_kejadian.js:61`): jenis, subjenis, waktu dibulatkan ke jam terdekat, desa, kecamatan, kab, provinsi, titik pusat desa 4 desimal, jumlah pelapor terverifikasi bila dua atau lebih, lencana verifikasi BPBD, dan dampak sebagai rentang terkecil sampai terbesar per isian (meninggal, hilang, luka, mengungsi, rumah) antarlaporan terverifikasi. Jendela 24 jam bergulir dari waktu verifikasi Valid terakhir (`src/lapor_ai.js:1113`, HIPOTESIS). Paling banyak 100 kartu; cache tepi 60 detik; tidak menulis D1 selain batas laju. Dinyalakan oleh saklar lingkungan `LAPOR_HARI_INI=1`; saat mati rute menjawab 404. Koordinat laporan dan foto tidak pernah dipakai. Saat dokumen ini ditulis tidak ada halaman web yang menampilkan rute itu di `public/lapor`.

## Alun-alun

`GET /api/lapor/alun` (`src/lapor_ai.js:1090`): laporan berstatus ditindaklanjuti atau selesai, paling banyak 100, dikelompokkan per gugus (angka laporan terbaru, tidak dijumlah), titik pusat desa 4 desimal, id publik dari hash. Saringan hanya `jenis` dan `prov`; parameter lain ditolak. Cache tepi 60 detik, batas 120 permintaan per jam per IP.

## Data agregat

`GET /api/lapor/agregat` (`src/lapor_agregat.js:6`): baris per kab/kota, jenis, dan minggu ISO (WIB) berisi jumlah laporan, jumlah nomor pelapor berbeda, laporan berfoto sah, laporan tidak valid, dan median menit dari kejadian sampai laporan. Sel dengan kurang dari 3 pelapor berbeda ditulis "<3" dan rinciannya dikosongkan. Tanpa nomor tiket, desa, koordinat, teks, foto, nama, atau nomor WA. Kolom selisih dengan catatan resmi bernilai "belum tersedia" sampai laporan ditempel ke Buku Besar, tidak pernah 0. Unduhan CSV atau JSON dicatat.

## Waktu respons BPBD

`hitungRespons` (`src/lapor_meja_hak.js:56`): per BPBD, selisih waktu terima ke waktu dilihat dan ke waktu diambil, median dan persentil ke-90 (peringkat terdekat: nilai ke `ceil(0,9 n)`), dalam menit bulat, atas laporan 30 hari terakhir atau satu bulan (`?bulan=YYYY-MM`, batas bulan WIB). Bila laporan satu BPBD kurang dari 5, hasil ditulis "belum cukup data" tanpa median. Selisih negatif dibuang dan dihitung. Hanya staf BNPB yang dapat membuka rute ini. Tidak ada peringkat atau warna baik dan buruk.
