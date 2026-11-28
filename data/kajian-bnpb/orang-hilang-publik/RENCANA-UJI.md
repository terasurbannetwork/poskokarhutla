# RENCANA-UJI: Orang hilang publik

Aturan rumah: tiap perilaku di luar TypeScript punya uji yang benar-benar menjalankannya (D1 lokal Miniflare, bukan mock). Data uji sintetis dibangun di dalam uji, tanpa data dummy permanen dan tanpa foto nyata. Perintah bukti: `npm run uji:warga` (rute, D1), `node --test tests/lapor/hilang_*.test.mjs`, `npm run uji:agen`.

## 1. Uji murni (`tests/lapor/hilang_murni.test.mjs`)

| No | Uji |
| --- | --- |
| 1.1 | `kelasUmur`: 17 anak, 18 dewasa, `null`, "Tidak tahu", 200, -1 jadi `anak`; kategori tanpa angka `anak`; tidak pernah 0 untuk kosong |
| 1.2 | `profilPublik`: dari baris yang memuat **semua** kolom (nomor pencari, nomor dicari, hubungan, berat, lokasi rinci, titik, ciri tak ditinjau, foto tak terpilih) kunci keluaran persis sama dengan daftar putih per kelas (bandingkan himpunan kunci, bukan hanya "tidak memuat") |
| 1.3 | Profil anak: himpunan kunci keluaran persis `id`, `nama` (inisial), `panggilan`, `umur` (kategori), `pakaian`, `lokasi`, `waktu`, `kejadian`; tanpa `foto`, `kelamin`, `tinggi`, `ciri` |
| 1.4 | Rentang: umur 23 menjadi 20 sampai 24, tinggi 168 menjadi 160 sampai 169, `null` menjadi "belum diketahui" |
| 1.5 | `PINDAH`: tiap pasangan sah lolos (termasuk `menunggu` ke `draf` untuk Minta perbaikan), tiap pasangan tidak sah ditolak (matriks penuh 4 x 4 plus kedaluwarsa kembali) |
| 1.6 | `layak`: salah bila kejadian kosong, salah bila belum dikonfirmasi petugas, salah untuk anak tanpa catatan wali, benar bila lengkap |
| 1.7 | `turunOtomatis`: benar untuk `ditemukan_selamat`, `ditemukan_meninggal`, `tutup`; salah untuk `buka` dan `ke_sar` |
| 1.8 | `kandidatKejadian`: kejadian di kab lain tidak muncul; di luar jendela dan sudah pasca tidak muncul; fase aktif tetap muncul walau lama; jenis non-bencana tidak muncul; paling banyak 8; urutan aktif dulu |
| 1.9 | `saranCocok`: nama dan nomor tidak mempengaruhi hasil (uji dengan dua pasang sama kecuali nama), pakaian tidak menggugurkan, tak diketahui tidak menggugurkan, hasil berupa alasan bukan angka tunggal |
| 1.10 | Teks tanpa "aman", tanpa "pasti", tanpa titik tengah di semua keluaran `label`; semua string layar lolos aturan kata |
| 1.11 | Konstanta HIPOTESIS punya batas atas dan bawah yang diuji (jendela tidak bisa 0 atau lebih dari 365) |

## 2. Uji rute dengan D1 lokal (`tests/lapor/hilang_rute.test.mjs`, pola `tests/lapor/rute.test.mjs`)

| No | Uji |
| --- | --- |
| 2.1 | Bendera `OH_PUBLIK` mati: `/api/lapor/hilang` 404, profil `menunggu` tidak tampil, persetujuan tetap tercatat |
| 2.2 | Bendera hidup: profil `tayang` muncul; `menunggu`, `turun`, `draf` tidak; respons memuat kunci daftar putih persis (K112: nama, foto, umur, lokasi tampil; nomor kontak tidak) |
| 2.3 | Header: `no-store`, `noindex`, `referrer-policy`; token acak 404 sama untuk tidak ada dan turun |
| 2.3b | Pengerukan: daftar paling 20 baris per halaman, kursor opak berjalan sampai habis tanpa duplikat, tidak ada rute "semua", laju daftar menolak lebih dulu daripada laju detail pada jumlah permintaan yang sama |
| 2.4 | Tayang tanpa kejadian terkonfirmasi ditolak (K116); tanpa hak `tayang` ditolak 403; petugas BPBD wilayah lain ditolak; BNPB boleh |
| 2.5 | Tayang tanpa persetujuan sah ditolak; persetujuan versi lama tidak bisa diperpanjang |
| 2.6 | Ubah status `lapor_cari` ke `ditemukan_selamat`, `ditemukan_meninggal`, `tutup`: profil hilang dari publik dalam permintaan berikutnya (K115), berkas foto publik dihapus; ke `ke_sar`: profil tetap tayang (Q25) |
| 2.7 | Cabut persetujuan (K114): turun seketika, laporan privat tetap terbaca petugas |
| 2.8 | Kedaluwarsa: ubah jam, cron menurunkan; perpanjang mengembalikan ke `menunggu` |
| 2.9 | Laju: 6 laporan dari nomor sama dalam sehari ditolak yang ke-6; informasi dan laporkan dibatasi; kunci laju sha nomor |
| 2.10 | `/hilang/info` tanpa sesi 401; dengan sesi masuk antrean, nomor pemberi tidak ada di respons publik |
| 2.11 | Foto publik: hanya foto terdaftar di profil `tayang`; foto asli privat 404 di rute publik; unggahan ber-EXIF ditolak |
| 2.11b | Header foto publik: `private, no-store`, `x-robots-tag: noindex`, `x-content-type-options: nosniff`, `referrer-policy: no-referrer`; **tidak ada** `public` atau `max-age`; setelah profil turun foto 404 pada permintaan berikutnya (tidak tersangkut cache); unggah `saya/foto` menolak lebih dari 800 px atau 300 KB, tipe palsu (header klien jpeg tetapi byte lain), dan blok EXIF atau XMP; tanpa sesi 401 |
| 2.12 | Sumber `orang_hilang` tidak membuat kejadian dan tidak mengubah fase di Buku Besar (uji ingest) |
| 2.12b | Respons publik Buku Besar dan Alun-alun tidak memuat sumber `orang_hilang` maupun id profil; `gerbangIngest` menolak sumber ini sebagai pembuat kejadian |
| 2.13 | Tidak ada laporan tanpa kejadian yang tayang walau semua aksi lain benar; laporan "bukan bencana" tidak disimpan |
| 2.14 | Anonim 730 hari: baris `oh_publik` dikosongkan bersama `lapor_cari` |
| 2.14b | Anonim `oh_temu` 730 hari sesudah `ditutup_waktu`: `nomor_penemu`, `lokasi_teks`, `lat`, `lon`, `ucapan`, `ciri` kosong; berkas R2 dan baris `oh_temu_foto` terhapus; catatan `oh_riwayat` terkait teranonim |
| 2.14c | Retensi: `oh_cari_foto` lebih dari 90 hari dan `oh_info` lebih dari 180 hari sesudah selesai terhapus; yang lebih baru tetap |
| 2.15 | `oh_riwayat` menolak UPDATE dan DELETE (hak tabel) |
| 2.16 | SQL `ohDaftarPublik` tidak menyebut kolom nomor (periksa teks SQL) |
| 2.17 | Rute `/kejadian`: hanya jenis, kab, tanggal; tidak ada id orang, nomor, atau titik; kab tanpa kejadian menjawab daftar kosong (bukan 0 atau galat); jendela dan fase aktif sesuai ALGORITMA 3 |
| 2.18 | Ambang "Laporkan": 2 pelapor berbeda dalam 24 jam tidak menurunkan; pelapor ke-3 berbeda menurunkan alasan `dilaporkan`; pelapor sama berulang dihitung satu |
| 2.19 | Lokasi penemuan (`lokasi_teks`, `lat`, `lon`) tidak ada di respons `saya/*`, `oh_info`, atau pesan ke pelapor (D19) |
| 2.20 | Jalur cron K115: laporan ditutup lewat jalur lain tanpa memanggil `cariStatus`; sapuan menit 17 menurunkan profil `tayang` induknya `ditemukan_*` atau `tutup`, tidak menurunkan `ke_sar` atau `buka` |
| 2.21 | "Minta perbaikan": `menunggu` ke `draf` dan muncul di Laporan saya dengan alasan baku; kirim ulang kembali ke `menunggu`; tidak bisa dari `tayang` langsung |
| 2.22 | Auth `saya/*` (D28): nomor yang diketik (tanpa sesi `/masuk` dan tanpa kunci gateway) ke `saya/cabut`, `saya/perpanjang`, `saya` (GET), `saya/foto` ditolak 401; nomor di badan atau kueri tidak pernah dipakai walau sesi hidup milik nomor lain; sesi sah dan saluran gateway WA berkunci diterima; jalur `cabut` lewat `oh_info` tanpa sesi diterima dan masuk antrean petugas |
| 2.23 | Tombol "Saya orang ini" tanpa sesi masuk `oh_info` jenis `orang_ini` dengan laju IP; tidak menurunkan sendiri sebelum petugas |
| 2.24 | `oh_riwayat.catatan` lolos `samarkan` (nomor dan nama dalam teks diganti) dan paling 140 huruf; tidak ada catatan bebas lebih panjang |

## 3. Uji mesin obrolan (`tests/lapor/hilang_mesin.test.mjs`)

Alur lapor orang hilang lengkap sampai kirim: urutan langkah `cari_kejadian` lalu `cari_setuju`; "Saya tidak setuju" menutup jalur tanpa menulis `lapor_cari`; "Bukan karena bencana" tidak menyimpan; tanpa kejadian di daftar, opsi "belum terdaftar" tersedia; anak memunculkan pertanyaan wali; foto publik maksimum 3 dan harus salah satu dari foto yang diunggah; jalur B: kondisi `tidak_sadar` menampilkan 112 lebih dulu, foto tidak ditawarkan tanpa setuju orang itu. Kosong tidak jadi nol. Pesan tanpa "aman".

## 4. Uji pembanding foto (di belakang `OH_FOTO`)

**Kriteria dikunci sebelum satu foto uji dijalankan** (D23). Berkas ini diubah hanya sebelum OH-14 dimulai; perubahan sesudahnya dicatat sebagai amandemen bertanggal.

| Lapis | Uji | Kriteria lulus (HIPOTESIS, dikunci) |
| --- | --- | --- |
| 4.1 | Murni, tanpa jaringan: fungsi susun hasil dengan model tiruan yang mengembalikan jawaban buruk (di luar daftar, banyak profil, kunci tak dikenal) | Semua jawaban buruk dibuang; paling banyak 3; tingkat hanya daftar tertutup |
| 4.2 | Tidak menyimpan: pencarian dijalankan dengan D1 dan R2 lokal; sesudahnya D1 hanya berubah di `oh_cari_foto`, R2 tidak berubah, log tidak memuat gambar | 0 pelanggaran dari 100 pencarian sintetis |
| 4.3 | Laju: 4 pencarian dalam sejam dari nomor sama, yang ke-4 ditolak | tepat sesuai Q12 |
| 4.4 | Sesi: tanpa sesi `/masuk` 401 | 100 persen |
| 4.5 | Anak tidak masuk kandidat: profil anak ada, tidak pernah dikirim ke pembanding | 0 dari 100 |
| 4.5b | Foto penanya yang dibaca model sebagai anak atau umur tidak jelas dihentikan sebelum panggilan pembanding (model pembanding tiruan tidak dipanggil, jawaban mengarahkan ke petugas); nilai kelas dari model di luar daftar dianggap `tidak_jelas` | 0 dari 100 sampai ke pembanding |
| 4.6 | Mutu pembanding (lab, bukan produksi): set foto **sintetis atau dari relawan yang setuju tertulis**, pasangan sama orang dan berbeda orang; metrik: dari pasangan beda orang, berapa yang dinilai `mirip`; dari pasangan sama orang, berapa yang dinilai `mirip` atau `sedikit` | Ditetapkan pemilik bersama laporan lab sebelum jalan (Q11); sampai ada, hasil berlabel hipotesis dan `OH_FOTO` tidak menyala |
| 4.7 | Keadilan: laporkan hasil 4.6 dipecah menurut rentang umur dan warna kulit dari set (bila set cukup), tanpa klaim di luar set | Dilaporkan; tidak ada ambang diam-diam |

Foto nyata dari laporan warga **tidak pernah** dipakai uji. Hasil 4.6 ditulis di `RISET.md` bagian baru, bukan di layar.

## 5. Uji peramban sungguhan (`tests/lapor/hilang_peramban.test.mjs`, Playwright, server tinjau lokal)

Alur Jalur A dari kartu sampai layar akhir; tombol Setuju dan Tidak setuju sama ukuran (tinggi dan lebar kotak dalam toleransi); kartu profil publik tidak memuat teks angka telepon (regex nomor) walau data uji memuatnya di baris privat; foto anak tidak muncul; tab publik tidak ada tombol unduh; `noindex` ada; layar sempit 375 px tanpa gulir mendatar; tombol "Cabut persetujuan" menurunkan profil di tab publik tanpa muat ulang manual.

## 6. Gerbang (`tests/agen/gerbang-orang-hilang.test.mjs`)

1. `lp_publik` tidak punya hak baca tabel `lapor_cari`, `oh_temu`, `oh_info` (matriks `hak.js`).
2. Tidak ada kode yang mengisi `status` `ditemukan_*` selain `cariStatus` dengan hak staf (cari string).
3. Tidak ada `INSERT` atau `UPDATE` ke `lapor_cari_foto*` atau R2 dengan data foto penanya dari berkas `orang_hilang_foto.js`.
4. Tidak ada `vektor`, `embedding`, `descriptor`, atau pustaka wajah di berkas paket.
5. Tidak ada berkas JSON berisi profil di `public/`.
6. Teks layar tanpa "aman", "pasti", titik tengah, ALL-CAPS; tanpa literal warna di CSS baru.
7. Sumber `orang_hilang` terdaftar sebagai sumber yang tidak membuat kejadian.
8. Halaman `/lapor/hilang` terdaftar di Peta Situs dan `noindex` diberikan Worker; `/lapor/h/<token>` **tidak** di Peta Situs, berkunci jalur tetap di daftar putih publik, `noindex` dari header Worker, dan token tidak masuk statistik hit.
9. Paket dokumen utuh (`gerbang-paket-modul`), bagian "baca dulu" di AGENTS.

## 7. Uji manual (lembar centang di folder ini, ditutup pemilik)

Pemilik atau petugas: lapor sampai tampil di HP sungguhan; cabut dan lihat profil turun; tinjau antrean dengan 20 profil sintetis; coba tutup laporan lalu cek profil turun; coba alur bukan bencana; coba jalur menemukan dengan skenario orang tidak sadar; baca teks persetujuan keras-keras dan nilai kejelasannya (RASA); cek tampilan layar pembaca.

## 8. Tinjau (AGENTS 3.8)

Tiap tiket layar ditutup dengan tautan `http://localhost:8800/lapor/` (tab Orang hilang) dan `http://localhost:8800/lapor/meja.html` (antrean tinjau). Server tinjau lokal menjawab `/api/lapor/*` dengan mesin lokal, sehingga data uji tidak menyentuh produksi.
