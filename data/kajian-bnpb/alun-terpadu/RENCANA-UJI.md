# RENCANA-UJI: Alun-alun Terpadu

Semua perilaku di sini tinggal di luar TypeScript (D1, rute, cookie, pipeline Python), jadi buktinya uji integrasi yang benar-benar menjalankan Worker dan D1 lokal (pola `tests/warga/*.test.mjs`) dan uji pipeline yang menjalankan skripnya. Uji bermock tidak dihitung sebagai bukti. Nomor uji hanya berawalan `62800`.

## 1. Uji integrasi Worker (`tests/warga/alun_terpadu*.test.mjs`)

| No | Kriteria terima | Tiket |
| --- | --- | --- |
| U-1 | Tulis utas dengan kode kabupaten sah menyimpan nama baku di `alun_utas.kab` dan baris `alun_wilayah`; kode dari provinsi lain, kode tidak dikenal, dan teks yang tidak dikenali ditolak 400; tanpa kabupaten tetap diterima tanpa baris wilayah | AT-03 |
| U-2 | Kode kabupaten Worker sama dengan hasil pipeline (`KN.kab4`) untuk semua kabupaten dan kota | AT-03 |
| U-3 | Kotak masuk: akun kabupaten melihat utas berkode kabupatennya saja; akun provinsi melihat provinsi cakupannya termasuk utas tanpa kabupaten; akun wilayah lain, akun tidak aktif, dan tamu ditolak; penyaringan terjadi di SQL | AT-04 |
| U-4 | Kotak masuk berhalaman, urut kebutuhan terbuka paling lama; saringan jenis, status, belum dijawab resmi | AT-04 |
| U-5 | Balas atas nama lembaga: `alun_balas` dengan `petugas = 0` dan `nama` NULL, baris `alun_lembaga` dengan nama lembaga dari akun; tampil di jawaban publik sebagai `lembaga`; klien tidak bisa mengirim nama lembaga | AT-05 |
| U-6 | Balasan lembaga untuk utas di luar wilayah, utas tersembunyi, atau dari akun tidak aktif ditolak | AT-05 |
| U-7 | Lima aduan atas balasan lembaga menjadikannya dilaporkan, tidak tersembunyi | AT-05 |
| U-8 | Kiriman pribadi orang yang masuk bertanda terverifikasi tanpa label lembaga, termasuk pemilik nomor akun instansi | AT-05 |
| U-9 | Nama tampil yang memuat sebutan resmi tambahan (dinsos, damkar, satpol, kodim, polres, dan sejenisnya) ditolak | AT-05 |
| U-10 | Ubah status: hanya pemprov, pemkab, pemkot dalam wilayah; TNI dan Polri ditolak; menutup tanpa alasan baku ditolak; tiap transisi menulis satu baris riwayat dengan pelaku yang benar | AT-06 |
| U-11 | Moderator mengubah status dan fitur Teruskan juga menulis riwayat | AT-06 |
| U-12 | Riwayat publik hanya memuat dari, ke, pelaku atau lembaga, alasan, waktu; `akun_id` dan catatan staf tidak pernah keluar | AT-06 |
| U-13 | Pelapor (kode pemilik atau `sesi_masuk` penulis) membuka lagi utas yang ditutup dalam 14 hari; orang lain dan sesudah 14 hari ditolak | AT-06 |
| U-14 | Hapus utas ber-riwayat oleh moderator berhasil dan membuang riwayat, tanda, wilayah, lembaga, penulis, dan tautan kejadiannya | AT-06 |
| U-15 | Tandai tidak valid: hanya akun instansi dalam wilayah; utas keluar dari ingest modul dan rekap, tautannya dicabut, masuk antrean moderator, tetap tampil; batas 30 per akun per hari; moderator bisa mencabut tanda | AT-07 |
| U-16 | Pemberitahuan: hanya utas `butuh_bantuan` dari penulis ber-`sesi_masuk` dan berkabupaten; kiriman tamu, tanpa kabupaten, dan moderator tidak memicu; satu kali per utas; isi tanpa judul, isi utas, atau nama | AT-08 |
| U-17 | Batas 3 per kabupaten per jam dan 20 per akun per jam; `TURNSTILE_SECRET` kosong berarti tidak ada pemberitahuan; kegagalan kirim tidak menggagalkan penulisan utas | AT-08 |
| U-18 | Ingest modul sumber `alun` hanya memuat utas yang memenuhi ALGORITMA 2; yang dilaporkan, tersembunyi, ditandai, tanpa kabupaten, `tanya`, `pengumuman`, dan jenis tidak diterima tidak ikut; tanpa token ditolak | AT-09a |
| U-19 | `POST /api/siklus/ingest/kejadian` dengan aksi `baru` dan sumber `alun` ditolak; jumlah `sk_kejadian` tidak berubah | AT-09a |
| U-20 | Sembunyikan atau hapus utas mencabut baris `sk_kejadian_sumber`-nya saat itu juga | AT-09a |
| U-21 | Jawaban baca publik memuat `kejadian` hanya untuk kejadian yang lolos syarat ringkasan publik; jawaban ber-cache sama untuk pemanggil bersesi staf dan tamu | AT-10 |
| U-22 | Tabel tautan belum ada: forum tetap jalan tanpa tanda | AT-10 |
| U-23 | Ingest rekap: hanya kolom ALGORITMA 9; tanpa judul, isi, nama, nomor, `mk_id`; utas tersembunyi dan ditandai tidak ikut; waktu balasan resmi pertama dan jenisnya benar | AT-09b |
| U-24 | Rute rekap membaca R2 tanpa D1; tamu, akun umum, akun instansi, dan pemirsa ditolak; staf berwilayah hanya menerima rincian wilayahnya; berkas belum ada menjawab keadaan "belum tersedia" | AT-09c |
| U-25 | Statistik admin dibaca dari rekap; plafon pindai `src/alun.js` turun | AT-09c |
| U-26 | Kabar warga satu kejadian hanya untuk yang berhak di Siklus dan hanya utas yang masih tampil | AT-11 |

## 2. Uji pipeline (`tests/siklus/`)

| No | Kriteria terima | Tiket |
| --- | --- | --- |
| P-1 | Sumber `alun`: satu kandidat menjadi terpasang; beberapa utas menempel ke kejadian yang sama; lebih dari satu kandidat menjadi ambigu tanpa masuk antrean tinjau | AT-09a |
| P-2 | Utas tanpa kandidat tidak membuat kejadian; jumlah, fase, dan keyakinan kejadian tidak berubah; sumber `alun` tidak dihitung untuk siap verifikasi | AT-09a |
| P-3 | Perilaku enam sumber lain tidak berubah (uji pencocok yang ada tetap hijau) | AT-09a |
| P-4 | `alun_rekap.py` atas data uji menghasilkan angka yang sama dengan hitungan mandiri untuk tiap ukuran ALGORITMA 9, dengan kiriman tamu terpisah | AT-09b |
| P-5 | Median dari kurang dari 5 utas ditulis "belum cukup data"; penyebut kurang dari 5 ditulis pecahan | AT-09b |
| P-6 | Berkas rekap tidak memuat judul, nama, nomor, `mk_id`, isi utas, atau kata "aman"; kuncinya di bawah `siklus/saji/alun/` | AT-09b |
| P-7 | Ambang di `src/alun_konst.js` dan `alun_rekap.py` sama | AT-09b |

## 3. Gerbang (`tests/agen/gerbang-alun-terpadu.test.mjs`)

| No | Yang dijaga |
| --- | --- |
| G-1 | `pasang.py`: cabang sumber `alun` tidak pernah menghasilkan aksi `baru` |
| G-2 | `src/siklus_kejadian.js`: penolakan aksi `baru` untuk sumber `alun` ada |
| G-3 | Tidak ada berkas di `public/data/` yang berasal dari rekap alun-alun; `src/pb_ringkas.js` dan `src/api_v1.js` tidak membaca rekap (Q1, Q2, Q11) |
| G-4 | `scripts/siklus/alun_rekap.py`, `src/alun_instansi.js`, dan isi pemberitahuan tidak memuat kata "aman" sebagai keluaran dan tidak punya rute atau tombol data contoh |
| G-5 | Berkas rekap hasil uji tidak punya kunci `judul`, `nama`, `wa`, `mk_id`, `teks` |
| G-6 | Layar baru terdaftar di gerbang kartu standar dan tanpa kesimpulan |
| G-7 | Tidak ada `UPDATE` atau `DELETE` atas `alun_riwayat` di `src/` selain di fungsi hapus utas |
| G-8 | Plafon pindai `src/alun.js` di `tests/agen/fixtures/d1-pindai.json` tidak naik |

Tiap gerbang punya uji mode gagal.

## 4. Uji layar

| No | Yang diperiksa | Cara |
| --- | --- | --- |
| L-1 | Form tulis: daftar kabupaten menyesuaikan provinsi dan mengirim kodenya | uji layar BNPB, tinjau lokal `http://localhost:8800/alun-alun` |
| L-2 | Kotak masuk di 390 px dan 1280 px tanpa geser mendatar; saring, buka, dan konfirmasi tidak membekukan layar dan tidak memakai dialog bawaan | tinjau lokal `http://localhost:8800/instansi`, `inp-reviewer` |
| L-3 | Tanda kejadian, pil lembaga, riwayat, dan tombol "Belum selesai" di `/alun-alun` | uji layar, tinjau lokal |
| L-4 | Kartu "Alun-alun" di `/admin/pimpinan`: angka, durasi, tanggal format Indonesia lewat modul teks bersama | `selera-angka` |
| L-5 | Kartu standar, tanpa kesimpulan, tanpa kaki sumber, jarak kartu, token warna | gerbang kartu, tinjau pemilik |

## 5. Uji di produksi sesudah migrasi (pemilik atau atas izinnya)

| No | Langkah | Lulus bila |
| --- | --- | --- |
| R-1 | Orang yang masuk menulis "butuh bantuan" di kabupaten yang punya akun aktif | akun itu menerima pemberitahuan dan utas tampil di kotak masuknya |
| R-2 | Balas dari kotak masuk dan tutup dengan alasan | pil lembaga dan riwayat tampil di halaman publik |
| R-3 | Jalankan langkah `siklus.yml` | tanda kejadian muncul untuk utas yang cocok; rekap terbit |
| R-4 | Baca D1 sehari sesudahnya | tambahan di bawah 50 ribu baris per hari |

## 6. Perintah bukti

```bash
npm run uji:warga
```

```bash
npm run uji:agen
```

Uji pipeline dijalankan dengan perintah uji Siklus yang ada (dicatat di tiket AT-09a). Tiket selesai bila uji bernomor miliknya hijau, kedua perintah di atas hijau, dan pemeriksa bersih (bukan pengerjanya) sudah melapor.
