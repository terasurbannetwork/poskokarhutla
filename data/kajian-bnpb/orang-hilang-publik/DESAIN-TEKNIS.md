# DESAIN-TEKNIS: Orang hilang publik

## 1. Berkas

Pemilik diperiksa lewat `node scripts/agents/ilmu.mjs pemilik <berkas>` pada 27 Nov 2026 untuk nama yang direncanakan; daftar baru didaftarkan di OH-00.

| Berkas | Isi | Pemilik |
| --- | --- | --- |
| `src/orang_hilang_murni.js` | Fungsi murni: `kelasUmur`, `profilPublik`, `rentangUmur`, `rentangTinggi`, `PINDAH`, `layak`, `turunOtomatis`, `kandidatKejadian`, `saranCocok`, konstanta HIPOTESIS (`MASA_TAYANG_HARI`, `JENDELA_HARI`, `JENDELA_TEMU_HARI`, `KANDIDAT_MAKS`, `SETUJU_VERSI`) | `warga-api` |
| `src/orang_hilang.js` | Rute publik, pelapor, meja, informasi, laporkan; `buatOrangHilang(wilayahDari)` pola `buatSelamat` | `warga-api` |
| `src/orang_hilang_foto.js` | Cari lewat foto: saring, panggil model, susun hasil; tanpa simpan foto | `warga-api` |
| `src/orang_hilang_foto_publik.js` | Pembuat foto turunan publik (kecil, tanpa EXIF) ke R2 `orang-hilang/publik/` | `warga-api` |
| `migrations/<nomor>_orang_hilang.sql` | Tabel samping (bagian 3); nomor diambil saat tiket (terakhir 0187) | `warga-api` |
| `src/lapor_mesin.js` (diubah) | Langkah `cari_kejadian`, `cari_setuju`, jalur `temu_*`, tombol jalur | `warga-api` |
| `src/lapor_selamat.js` (diubah) | `cariStatus` memanggil `turunOtomatis`; `cariMeja` memuat `oh` | `warga-api` |
| `src/hak.js` (diubah) | Tabel dan hak per pelaku untuk `oh_*`; fungsi `ohTambah`, `ohById`, `ohDaftarPublik`, `ohPindah`, dst | `warga-api` |
| `src/lapor_meja_hak.js` (diubah) | Aksi `tayang` | `warga-api` |
| `src/lapor_ai.js` (diubah) | Kait cron menit 17: sapu turun, hapus foto publik yatim, anonim | `warga-api` |
| `src/gerbang_halaman.js` (diubah) | Halaman `/lapor/hilang` dan `/lapor/h/<token>` masuk daftar putih publik; entri registri Peta Situs | `warga-api` |
| `src/kejadian_tautan.js` (diubah) | Sumber `orang_hilang` terdaftar sebagai sumber yang tidak membuat kejadian dan tidak mengubah fase | `warga-api` |
| `src/siklus_kejadian.js` (diubah) | `gerbangIngest` menolak sumber `orang_hilang` sebagai pembuat kejadian atau pengubah fase (pola sumber `alun`); respons publik Buku Besar dan Alun-alun tidak memuat sumber ini | `warga-api` |
| `src/peta_situs.js` (diubah) | Entri registri halaman (aturan Peta Situs: tiap halaman baru wajib registri) | `warga-api` |
| `public/lapor/hilang.js`, `hilang.css`, `hilang.html` | Tab publik, kartu profil, jalur obrolan tambahan | `layar-peta` |
| `public/lapor/meja_cari.js` (diubah) | Antrean tinjau, panel privat, aksi | `layar-peta` |
| `scripts/lapor/lokal.mjs` (diubah) | Rute lokal untuk tinjau di localhost:8800 (sinkron dengan Worker; model foto di lokal dijawab tiruan uji, bukan API sungguhan) | `warga-api` |
| `tests/lapor/hilang_*.test.mjs` | Uji (RENCANA-UJI) | `warga-api` |
| `tests/agen/gerbang-orang-hilang.test.mjs` | Gerbang | `penulis-gerbang` |
| `docs/centurisk97/panduan/lapor/08-orang-hilang.md`, `pengembang/lapor/11-orang-hilang.md dan 12-orang-hilang-alur.md`, `docs/centurisk97/peta.json` | Dokumentasi (nomor halaman mengikuti urutan terakhir folder masing-masing) | `docs-situs` |

Tanpa berkas di `public/data/`: tidak ada keluaran statis berisi data orang.

## 2. Bendera dan konfigurasi

| Bendera | Tempat | Bawaan | Arti |
| --- | --- | --- | --- |
| `OH_PUBLIK` | `wrangler*.jsonc` vars | `"0"` | Hidup: rute publik `/api/lapor/hilang*` menjawab dan status `tayang` boleh dicapai. Mati: respons 404, langkah persetujuan tetap berjalan dan mencatat |
| `OH_FOTO` | vars | `"0"` | Hidup: rute foto dan kartu jalur C. Hanya boleh `"1"` sesudah OH-15 selesai (DPIA, Q13) |
| `OH_JENDELA_HARI`, `OH_MASA_HARI` | vars (opsional) | konstanta kode | Penyetelan tanpa rilis kode; uji mengunci batas atas dan bawah |

Kunci API model memakai secret Worker yang sudah dipakai K105; paket ini tidak menambah secret.

## 3. Tabel D1 (tabel samping; tanpa trigger; hanya CREATE IF NOT EXISTS; tanpa data contoh)

| Tabel | Kolom pokok | Catatan |
| --- | --- | --- |
| `oh_publik` | `cari_id` PK (16, rujukan `lapor_cari.id`), `token` (id publik, 32 heks, unik), `kelas` (dewasa, anak), **salinan bidang publik** `nama`, `inisial` (diturunkan dari nama saat tambah; satu-satunya nama yang keluar untuk anak), `panggilan`, `umur` int NULL, `kelamin` NULL, `tinggi` int NULL, `pakaian`, `ciri` (teks hasil tinjauan, NULL sampai ditinjau), `kec`, `kab` (kode 5 karakter), `kab_nama`, `waktu_terakhir`, **ringkasan kejadian** `kejadian_id` NULL, `kejadian_jenis`, `kejadian_kab`, `kejadian_mulai`, `kejadian_oleh` NULL, `kejadian_waktu` NULL, `setuju_versi`, `setuju_waktu`, `setuju_wali` (0, 1, NULL), `wali_oleh`, `wali_waktu`, `bidang_pilihan` JSON, `foto_publik` JSON (id berkas turunan), `status` CHECK (draf, menunggu, tayang, turun), `alasan_turun` CHECK, `tayang_waktu`, `turun_waktu`, `dicabut_waktu`, `dibuat` | Satu baris per laporan; salinan bidang publik diisi dari `sesi.cari.cr` dan lokasi sesi saat kirim, bukan dari teks (RISET 1.1, 1.3), supaya `lp_publik` tidak pernah membaca `lapor_cari`. Dikosongkan bersama anonim. SQL daftar publik membuang nama lengkap, foto, kelamin, tinggi, ciri untuk anak (CASE di SQL) dan hanya memuat baris dengan `tayang_waktu` dalam masa tayang |
| `oh_temu` | `id` PK, `nomor_penemu`, `kab`, `lokasi_teks`, `lat`, `lon` (dibulatkan 3 desimal), `waktu_temu`, `kondisi` CHECK (sadar, tidak_sadar, terluka, anak, bingung), `ucapan` teks (300), `bersama` CHECK, `ciri`, `foto_boleh` (0, 1), `kejadian_id`, `status` CHECK (menunggu, ditinjau, dicocokkan, ditutup), `tayang_setuju_oleh` NULL, `dibuat`, `ditutup_waktu` NULL (diisi saat status `ditutup`) | Tidak tampil publik bawaan (Q9) |
| `oh_temu_foto` | `temu_id`, `foto_id` PK gabungan | Pola 0186; berkas R2 privat; hanya dibuat bila `foto_boleh` |
| `oh_cari_foto` | `id`, `nomor_sha`, `waktu`, `kandidat` int, `tingkat` CHECK (mirip, sedikit, tidak, tidak_bisa, galat) | Tanpa foto, tanpa ciri (D13); dihapus 90 hari |
| `oh_info` | `id`, `jenis` CHECK (informasi, foto, laporkan, cabut, orang_ini), `sasaran_token`, `nomor_pemberi`, `pesan` (500), `tingkat` NULL, `status` CHECK (baru, diteruskan, selesai), `dibuat`, `ditangani_oleh`, `selesai_waktu` (patokan retensi 180 hari) | Antrean petugas; nomor hanya petugas |
| `oh_riwayat` | `id` AUTOINCREMENT, `cari_id` atau `temu_id`, `dari`, `ke`, `alasan` (kode baku), `catatan` (paling 140 huruf, lewat `samarkan`), `oleh`, `waktu` | Append-only; hak hanya `tambah` dan `baca`; anonim catatan bersama laporan induk (D31) |

Tambahan di `hak.js`: tiap tabel punya baris matriks pelaku (`lp_pelapor`: tambah baris miliknya; `lp_staf`: baca, ubah status lewat fungsi yang ditulis; `lp_publik`: baca hanya kolom lewat fungsi `ohDaftarPublik` yang memilih kolom daftar putih di SQL, bukan `SELECT *`; `lp_cron`: baca, hapus). `ohDaftarPublik` mengembalikan baris `status = 'tayang'` saja; uji mengunci bahwa SQL tidak menyebut kolom nomor.

## 4. Rute

| Rute | Pelaku | Isi |
| --- | --- | --- |
| `GET /api/lapor/hilang` | publik, laju IP (daftar lebih ketat daripada detail, D30) | Daftar profil `tayang`, `LIMIT 20` dengan kursor opak, saringan `kab`, `umur`; tidak ada rute "semua"; 404 bila `OH_PUBLIK` mati; `cache-control: private, no-store`, `x-robots-tag: noindex` |
| `GET /api/lapor/hilang/:token` | publik | Satu profil; tidak ada = 404 jawaban sama untuk tidak ada, turun, belum tayang |
| `GET /api/lapor/hilang/foto/:fotoid` | publik | Foto turunan, hanya profil `tayang`; header `private, no-store`, `noindex`, `nosniff`, `no-referrer` (D29), tidak pernah `public, max-age`; selain itu 404 |
| `POST /api/lapor/hilang/info` | sesi `/masuk` (jenis `informasi`, `foto`, `laporkan`); tanpa sesi hanya jenis `cabut` dan `orang_ini` (D28, D35) | Masuk `oh_info`; batas laju; ambang turun otomatis 3 pelapor berbeda per 24 jam untuk `laporkan` |
| `GET /api/lapor/hilang/kejadian?kab=` | publik (laju) | Daftar kejadian untuk penyaring (jenis, kab, tanggal saja); satu pembaca ke Buku Besar, bukan tabel baru |
| `POST /api/lapor/hilang/saya/cabut` | sesi `/masuk` terbukti atau gateway WA (D28); nomor ketikan 401 | Cabut persetujuan; profil turun |
| `POST /api/lapor/hilang/saya/perpanjang` | sama (D28) | Menayangkan lagi sesudah kedaluwarsa |
| `GET /api/lapor/hilang/saya` | sama (D28) | Baca profil dan status laporan sendiri (tanpa nomor dan ciri rinci) |
| `POST /api/lapor/hilang/saya/foto` | sesi terbukti, laju per sha nomor | Unggah foto publik turunan: paling 800 px, 300 KB, jenis dari byte awal (JPEG, PNG, WebP), tolak EXIF dan XMP (D29) |
| `POST /api/lapor/hilang/foto/cari` | sesi `/masuk`, `OH_FOTO` | Cari lewat foto; badan multipart satu gambar; batas ukuran dan jenis; tidak menyimpan; laju Q12 |
| `GET /api/lapor/meja/hilang` | staf (meja) | Antrean tinjau; saran cocok; panel privat |
| `POST /api/lapor/meja/hilang/:id/aksi` | staf, hak `tayang` | Tayang, Minta perbaikan, Tolak, Ganti foto, Ubah kejadian, Verifikasi wali |
| `POST /api/lapor/temu` lewat mesin obrolan | pelapor | Jalur B melalui `/api/lapor/pesan` yang ada; mesin menulis `oh_temu` |

Semua rute tulis membawa `x-pb: 1`, lewat `guard-api`, dan memakai pola `laju` (kunci sha nomor, bukan nomor mentah). Respons galat tidak memuat nama atau isi.

## 5. Mesin obrolan (D1)

Perubahan di `src/lapor_mesin.js` minimal dan ditandai: status `cari_kejadian` dan `cari_setuju` disisipkan antara `cari_pakaian` atau foto dan ringkasan; status `temu_*` untuk jalur B. `SELESAI` (`terkirim`, `batal`, `kedaluwarsa`, `cari_terkirim`) ditambah `temu_terkirim`. Kartu jawaban memakai kontrak `minta` dan `pilihan` yang sudah ada; tidak ada format baru. Foto orang dicari yang ada (K108) dipakai ulang; pilihan foto publik adalah langkah tambahan di `cari_setuju` yang menunjuk id foto yang sudah ada. `lapor_tampil.js` `isianCari` menambah baris "Kejadian terkait" dan "Persetujuan tayang".

## 6. Foto publik turunan

Pembuatan di Worker atau di HP? Bawaan: **di HP saat memilih** (kanvas, kecilkan ke sisi panjang 800 px, JPEG 80, EXIF terbuang karena kanvas), diunggah ke rute foto publik; Worker memeriksa tipe, ukuran, dan menolak bila ada blok EXIF. Alasan: Worker tidak punya pustaka gambar; HP sudah mengecilkan foto laporan. Petugas dapat memotong lewat kanvas serupa di meja (OH-05). Nama berkas R2 acak 16 byte, tidak berhubungan dengan `cari_id`. Berkas hanya dilayani lewat rute foto yang memeriksa status profil `tayang`, dengan `private, no-store`, `noindex`, `nosniff`, `no-referrer` (D29). Rute unggah `saya/foto` (sesi terbukti, paling 800 px dan 300 KB, jenis dari byte awal, tolak EXIF dan XMP, laju per sha nomor) memeriksa ulang di Worker karena klien tidak dipercaya; pola `public, max-age=300` di rute foto laporan lama **tidak dipakai** di sini karena K114 menjanjikan turun seketika.

## 7. Cari lewat foto: batas teknis

Unggahan paling besar 2 MB, satu gambar, jenis JPEG atau PNG atau WebP. Satu permintaan model berisi 1 foto penanya + sampai 5 foto kandidat (sudah kecil, tiap sisi panjang 800 px); batas waktu 15 detik (`buatModel batasMs`); bila gagal, jawaban galat bersih. Foto penanya ada hanya di variabel permintaan; uji memeriksa bahwa tidak ada pemanggilan R2 atau D1 yang membawanya. Log memakai `samarkan`; badan permintaan dan jawaban model tidak masuk log.

## 8. Cron dan pembersihan

Cron menit 17 yang ada (`src/lapor_ai.js`): (1) tandai `kedaluwarsa` profil `tayang` lewat masa; (2) turunkan profil yang laporan induknya tak lagi `buka`; (3) hapus berkas publik profil `turun` dan yatim; (4) anonimkan `oh_publik` bersama `bersihkanLapor`; (5) anonimkan `oh_temu` 730 hari sesudah `ditutup_waktu` (kosongkan `nomor_penemu`, `lokasi_teks`, `lat`, `lon`, `ucapan`, `ciri`), hapus berkas R2 `oh_temu_foto` lalu barisnya, dan anonimkan catatan `oh_riwayat` terkait; (6) hapus `oh_cari_foto` (90 hari) dan `oh_info` (180 hari sesudah selesai). Tiap langkah menangkap `no such table` agar aman sebelum migrasi diterapkan.

## 9. Docs, registri, dan daftar putih

Halaman `/lapor/hilang` (tab) didaftarkan di `src/peta_situs.js` (aturan Peta Situs), di daftar putih publik gerbang halaman, dan dibuat `noindex` oleh Worker. Halaman tautan bagikan `/lapor/h/<token>` **tidak** masuk Peta Situs; di daftar putih publik ia berkunci jalur tetap berpola `/lapor/s/<token>` (pola kabar selamat), `noindex` diberikan Worker lewat header (bukan hanya meta), dan token **tidak masuk statistik hit** (`src/gerbang_halaman.js`, tempat jalur dikecualikan dari pencatatan). Gerbang menguji ketiganya. Sumber `orang_hilang` didaftarkan di `src/kejadian_tautan.js` sebagai sumber yang tidak membuat kejadian dan tidak mengubah fase. Dokumentasi Panduan di `/docs`; angka, jadwal, dan hak hanya dari kode dengan rujukan `berkas:baris`.

## 10. ADR singkat

| ADR | Pilihan | Alasan | Pengganti bila salah |
| --- | --- | --- | --- |
| A1 | Tabel samping, bukan kolom baru di `lapor_cari` | Migrasi lama dibeku; pola 0185 dan 0186 | Migrasi penggabungan nanti |
| A2 | Rute publik dinamis, bukan JSON statis | Data pribadi tidak masuk `public/` | Tidak ada |
| A3 | Pembanding visual Claude API, bukan vektor wajah | Aturan lapangan, biometrik, lisensi | Opsi D (tanpa foto) bila Q13 gagal |
| A4 | Foto turunan dibuat di HP | Worker tanpa pustaka gambar | Pustaka WASM bila hasil HP tidak konsisten |
| A5 | Tinjauan manusia untuk semua tayang (K113) | Keputusan pemilik | Tidak ada |
| A6 | Penyaring bencana dua lapis (pelapor memilih, petugas memastikan) | K116; mesin tidak memutuskan sebab | Tidak ada |
