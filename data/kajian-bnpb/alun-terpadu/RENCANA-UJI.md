# RENCANA-UJI: Alun-alun Terpadu

Semua perilaku di sini tinggal di luar TypeScript (D1, rute, cookie, pipeline Python), jadi buktinya uji integrasi yang benar-benar menjalankan Worker dan D1 lokal (pola `tests/warga/*.test.mjs`) dan uji pipeline yang menjalankan skripnya. Uji bermock tidak dihitung sebagai bukti. Nomor uji hanya berawalan `62800`.

## 1. Uji integrasi Worker (`tests/warga/alun_terpadu*.test.mjs`)

| No | Kriteria terima | Tiket |
| --- | --- | --- |
| U-1 | Ingest modul `sumber=alun` hanya memuat utas `butuh_bantuan` dan `info_lapangan` yang tampil, bukan contoh, berjenis terpetakan; `tanya`, `pengumuman`, `umum`, tersembunyi, dan contoh tidak ikut | AT-03 |
| U-2 | `kab4` terisi untuk kabupaten yang dikenal; null untuk ejaan tidak dikenal atau nama ganda; koordinat ikut bila ada | AT-03 |
| U-3 | Rute ingest menolak tanpa `PIPA_TOKEN`; baris tidak memuat isi utas, nama, atau `mk_id` | AT-03 |
| U-4 | Jawaban baca publik memuat `kejadian` hanya untuk tautan terpasang ke kejadian `publik = 1`; kejadian belum dipublikasikan tidak bocor; moderator melihat semua | AT-04 |
| U-5 | Tabel tautan atau migrasi Keterpaduan belum ada: forum tetap jalan tanpa tanda | AT-04 |
| U-6 | Kotak masuk: akun kabupaten melihat utas `(prov, kab)` miliknya saja; akun provinsi melihat provinsi cakupannya termasuk utas tanpa kabupaten; akun wilayah lain dan tamu ditolak | AT-05 |
| U-7 | Kotak masuk berhalaman dan urut kebutuhan terbuka paling lama; saringan jenis, status, belum dijawab lembaga | AT-05 |
| U-8 | Balas sebagai lembaga dari `/api/instansi/alun/balas/:id`: tersimpan `petugas = 1`, `nama` NULL, `alun_penulis.label` = nama lembaga; tampil di jawaban publik sebagai `lembaga` | AT-06 |
| U-9 | Balasan lembaga untuk utas di luar wilayah, utas tersembunyi, atau dari akun tidak aktif ditolak | AT-06 |
| U-10 | Balas sebagai lembaga dari halaman publik: hanya `sesi_masuk` yang terikat ke tepat satu akun instansi aktif berwilayah mencakup utas; dua akun, akun wilayah lain, anggota dicabut, dan tamu ditolak; label tidak bisa dikirim klien | AT-06 |
| U-11 | Lima aduan tidak menyembunyikan balasan lembaga | AT-06 |
| U-12 | Ubah status: hanya pemprov, pemkab, pemkot dalam wilayah; TNI dan Polri ditolak; selesai tanpa catatan ditolak; tiap transisi menulis satu baris `alun_riwayat` | AT-07 |
| U-13 | `alun_riwayat` tidak bisa diubah atau dihapus langsung (trigger); menghapus utas oleh moderator membuang riwayatnya | AT-02, AT-07 |
| U-14 | Tabel `alun_riwayat` belum ada: ubah status 503, forum dan kotak masuk tetap jalan | AT-07 |
| U-15 | Utas `butuh_bantuan` baru memicu satu pemberitahuan ke akun wilayahnya; utas kedua yang sama tidak menggandakan; tanpa penerima tercatat dilewati; kegagalan kirim tidak menggagalkan penulisan | AT-08 |
| U-16 | Pemberitahuan hanya memuat judul dan wilayah; lebih dari 20 per akun per jam digabung | AT-08 |
| U-17 | Ingest rekap: baris tanpa isi, nama, nomor, `mk_id`; waktu balasan lembaga pertama benar | AT-09 |
| U-18 | Rute rekap membaca R2 tanpa D1; tamu, akun umum, dan akun instansi ditolak; berkas belum ada menjawab keadaan "belum tersedia" | AT-09 |
| U-19 | `GET /api/alun/admin` memuat `belum_di_buku` dari berkas rekap; plafon pindai `src/alun.js` turun | AT-09 |
| U-20 | Kabar warga satu kejadian hanya untuk yang berhak di Siklus | AT-11 |

## 2. Uji pipeline (`tests/siklus/`)

| No | Kriteria terima | Tiket |
| --- | --- | --- |
| P-1 | Pencocok dengan sumber `alun`: utas cocok satu kejadian menjadi terpasang; dua kandidat menjadi ambigu; tanpa wilayah dicatat | AT-03 |
| P-2 | Utas tanpa kejadian yang cocok **tidak** membuat `sk_kejadian`; jumlah kejadian sebelum dan sesudah sama; fase dan keyakinan kejadian tidak berubah | AT-03 |
| P-3 | Utas yang disembunyikan sesudah tertaut kehilangan tautannya pada putaran berikut | AT-03 |
| P-4 | `alun_rekap.py` atas data uji menghasilkan angka yang sama dengan hitungan mandiri: kebutuhan terbuka, lama tak terjawab, median respons, persentase terjawab, belum di Buku Besar, per topik, terverifikasi terpisah | AT-09 |
| P-5 | Median dari kurang dari 5 utas ditulis "belum cukup data"; penyebut kurang dari 5 ditulis pecahan | AT-09 |
| P-6 | Berkas rekap tidak memuat nama, nomor, `mk_id`, isi utas, atau kata "aman" | AT-09 |
| P-7 | Ambang di `src/alun_konst.js` dan `alun_rekap.py` sama | AT-09 |

## 3. Gerbang (`tests/agen/gerbang-alun-terpadu.test.mjs`)

| No | Yang dijaga |
| --- | --- |
| G-1 | `pasang.py`: sumber `alun` bertanda tidak membuat kejadian; jalur pembuat kejadian melewati sumber bertanda itu |
| G-2 | Tidak ada berkas di `public/data/` yang berasal dari rekap alun-alun selama KEPUTUSAN Q1 belum dijawab |
| G-3 | `scripts/siklus/alun_rekap.py` dan `src/alun_instansi.js` tidak menulis kata "aman" dan tidak memuat rute atau tombol data contoh |
| G-4 | Berkas rekap contoh hasil uji tidak punya kunci `nama`, `wa`, `mk_id`, `teks` |
| G-5 | Layar baru terdaftar di gerbang kartu standar dan tanpa kesimpulan |
| G-6 | Plafon pindai `src/alun.js` di `tests/agen/fixtures/d1-pindai.json` tidak naik |

Tiap gerbang punya uji mode gagal.

## 4. Uji layar

| No | Yang diperiksa | Cara |
| --- | --- | --- |
| L-1 | Kotak masuk di 390 px dan 1280 px tanpa geser mendatar; saring dan buka tidak membekukan layar | tinjau lokal `http://localhost:8800/instansi`, `inp-reviewer` |
| L-2 | Tanda kejadian, pil lembaga, dan riwayat di `/alun-alun` | tinjau lokal `http://localhost:8800/alun-alun` |
| L-3 | Kartu "Alun-alun" di `/admin/pimpinan` dan baris di `/bnpb/pimpinan`: angka, durasi, tanggal format Indonesia | `selera-angka` |
| L-4 | Kartu standar, tanpa kesimpulan, tanpa kaki sumber, jarak kartu | gerbang kartu, tinjau pemilik |

## 5. Uji di produksi sesudah migrasi (pemilik atau atas izinnya)

| No | Langkah | Lulus bila |
| --- | --- | --- |
| R-1 | Tulis satu utas "butuh bantuan" di kabupaten yang punya akun aktif | akun itu menerima pemberitahuan dan utas tampil di kotak masuknya |
| R-2 | Balas dari kotak masuk dan ubah status ke selesai | pil lembaga dan riwayat tampil di halaman publik |
| R-3 | Jalankan langkah `siklus.yml` | tanda kejadian muncul untuk utas yang cocok; rekap terbit |
| R-4 | Baca D1 sehari sesudahnya | tambahan di bawah 50 ribu baris per hari |

## 6. Perintah bukti

```bash
npm run uji:warga
```

```bash
npm run uji:agen
```

Uji pipeline dijalankan dengan perintah uji Siklus yang ada (dicatat di tiket AT-03). Tiket selesai bila uji bernomor miliknya hijau, kedua perintah di atas hijau, dan pemeriksa bersih (bukan pengerjanya) sudah melapor.
