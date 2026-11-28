# Orang hilang publik: rute, tabel, bendera, alur

Halaman ini mencatat bendera, berkas, tabel, dan rute fitur orang hilang publik di Lapor Bencana, dengan rujukan ke kode. Alur status, konstanta, dan pembersihan ada di halaman berikutnya.

## Status dan bendera

Seluruh fitur ada di belakang tiga bendera Worker yang bawaannya mati (`wrangler.jsonc:22`, `wrangler.warga.jsonc:15`):

| Bendera | Bawaan | Arti di kode |
| --- | --- | --- |
| `OH_PUBLIK` | `"0"` | Mati: semua rute publik `/api/lapor/hilang*` menjawab 404 "Halaman ini belum dibuka" (`src/orang_hilang.js:24`, `144`, `297`, `311`, `322`); `syaratTayang` menambah `bendera_mati` sehingga petugas tidak bisa menayangkan (`src/orang_hilang.js:157`). |
| `OH_TULIS` | `"0"` | Mati: obrolan tidak menulis profil `oh_publik` dan laporan menemukan orang `oh_temu` (`src/lapor_ai.js:320`, `321`, `323`), dan jalur menemukan orang ditolak dengan pesan layanan belum dibuka (`src/lapor_mesin.js:669`). |
| `OH_FOTO` | `"0"` | Mati: kiriman jenis `foto` ditolak 404 (`src/orang_hilang.js:329`). |

Dua pengaturan opsional, `OH_JENDELA_HARI` dan `OH_MASA_HARI`, mengganti jendela kejadian dan masa tayang tanpa rilis kode; nilainya dijepit lewat `batasi` ke bilangan bulat 1 sampai 365, selain itu kembali ke bawaan (`src/orang_hilang_murni.js:10`, `12`).

Yang menunggu pemilik, menurut dokumen paket dan kode:

- migrasi `0188_orang_hilang.sql`, `0190_orang_hilang_usia.sql`, dan `0191_oh_nomor_ketik.sql` belum diterapkan ke D1 produksi; kode menangkap `no such table` di jalur pembersihan dan rute, sehingga tidak galat sebelum diterapkan (`src/orang_hilang.js:73`);
- halaman `/lapor/hilang` dan `/lapor/h/<token>` tetap di balik masuk akun: komentar `src/gerbang_halaman.js:66` dan `67` serta entri Peta Situs akses `masuk` (`src/peta_situs.js:60`, `61`). Belum diputuskan (bawaan sementara: tetap di balik masuk sampai pemilik mencatat keputusan publik);
- jalur cari lewat foto belum ada di kode: tidak ada berkas `src/orang_hilang_foto.js` dan tidak ada rute `POST /api/lapor/hilang/foto/cari` di `src/orang_hilang.js:348`. Belum diputuskan (bawaan sementara: tidak menyala sebelum tinjauan hukum transfer data lintas negara dan penilaian dampak);
- uji perangkat nyata dan penutupan oleh pemilik.

## Berkas

| Berkas | Isi |
| --- | --- |
| `src/orang_hilang_murni.js` | Fungsi murni tanpa D1 dan jaringan: `kelasUmur` (`:28`), `profilPublik` (`:46`), `kandidatKejadian` (`:62`), `PINDAH` dan `layak` (`:71`, `:76`), `turunOtomatis` (`:77`), `saranCocok` (`:85`), `barisOh` (`:102`), konstanta `KONSTANTA` (`:8`). |
| `src/orang_hilang.js` | Rute publik, pelapor (`saya`), meja petugas, informasi, dan pembersihan cron; peta rute `RUTE_ORANG_HILANG` di `:348`, dipasang di `src/worker.js:674`. |
| `src/orang_hilang_foto_publik.js` | Pemeriksa foto publik turunan: `MAKS_BYTE` 300 KB, sisi panjang 800, paling banyak 3 foto (`:4`), `periksaFotoPublik` (`:48`). |
| `src/hak.js` | Matriks hak tabel `oh_*` (`:2878` sampai `:2885`), `OH_KOLOM_PUBLIK` dan daftar putih kolom SQL (`:2887` sampai `:2897`), fungsi `ohPindah` (`:2916`), `ohRetensi` (`:2998`). |
| `src/lapor_mesin.js` | Langkah obrolan `cari_kejadian` (`:617`), `cari_setuju` (`:636`), jalur menemukan `temu_*` (`:501`, `:589`, `:861`). |
| `src/lapor_ai.js` | Penulisan profil dan temuan saat laporan terkirim (`:320` sampai `:323`), kait cron (`:743`), dan pemetaan rute meja (`:1165`, `:1166`, `:1167`, `:1178`). |
| `public/lapor/hilang.html`, `hilang.js`, `hilang_kartu.js`, `hilang_satu.js`, `hilang_chat.js`, `hilang.css` | Daftar `/lapor/hilang`, kartu profil, halaman satu profil `/lapor/h/<token>`, panel Laporan saya, dan gaya. |
| `public/lapor/meja_cari.js` | Antrean tinjau dan panel privat di meja staf. |
| `migrations/0188_orang_hilang.sql`, `0190_orang_hilang_usia.sql`, `0191_oh_nomor_ketik.sql` | Tabel samping dan indeks. |

Tanpa berkas di `public/data/`: tidak ada keluaran statis berisi data orang. Sumber `orang_hilang` terdaftar di `SUMBER_TANPA_KEJADIAN` (`src/siklus_kejadian.js:18`), sehingga tidak membuat kejadian dan tidak mengubah fase di Buku Besar.

## Tabel D1

Semua tabel adalah tabel samping, hanya `CREATE ... IF NOT EXISTS`, tanpa trigger dan tanpa data contoh (`migrations/0188_orang_hilang.sql:1` sampai `5`).

| Tabel | Isi pokok | Hak per peran (`src/hak.js:2878`) |
| --- | --- | --- |
| `oh_publik` | Satu baris per laporan: salinan bidang publik, ringkasan kejadian, persetujuan (`setuju_versi`, `setuju_wali`), `foto_publik`, `status` (draf, menunggu, tayang, turun), `alasan_turun` (`:38`, `:39`). Pemeriksa `CHECK` mengunci bahwa `turun` berpasangan dengan alasan (`:44`). | pelapor baca, tambah, ubah; publik baca; staf baca, ubah; cron baca, ubah |
| `oh_temu` | Laporan menemukan orang: kondisi, ucapan, ciri, lokasi dibulatkan, `status` (menunggu, ditinjau, dicocokkan, ditutup) (`:65`). | pelapor tambah; staf baca, ubah; cron baca, ubah |
| `oh_temu_foto` | Tautan temuan ke foto privat. | pelapor tambah; staf baca; cron baca, hapus |
| `oh_cari_foto` | Hanya statistik laju pencarian foto, tanpa foto dan tanpa ciri. | pelapor tambah; cron hapus |
| `oh_info` | Antrean kiriman informasi, foto, laporkan, cabut, dan "Saya orang ini". | pelapor dan publik tambah; staf baca, ubah; cron baca, ubah, hapus |
| `oh_riwayat` | Riwayat perpindahan status, hanya ditambah. | pelapor tambah; staf baca, tambah; cron tambah, ubah (mengosongkan catatan) |
| `oh_nomor_ketik` | Penanda nomor pelapor yang hanya diketik, belum terbukti (migrasi 0191). | pelapor tambah; staf baca; cron baca, hapus |

Publik hanya membaca `oh_publik` lewat daftar putih kolom `OH_KOLOM_PUBLIK` (`src/hak.js:2886`). Untuk baris anak, SQL sendiri membuang `nama`, `kelamin`, `tinggi`, `ciri`, dan `foto_publik` lewat `CASE` (`src/hak.js:2888` sampai `2889`); nama anak keluar hanya sebagai inisial.

## Rute

Semua jawaban memakai `cache-control: private, no-store`, `x-robots-tag: noindex`, dan `referrer-policy: no-referrer` (`src/orang_hilang.js:19`). Nilai batas laju per rute sengaja tidak ditulis di dokumen ini.

| Rute | Peran | Rujukan | Isi |
| --- | --- | --- | --- |
| `GET /api/lapor/hilang` | publik, batas laju per IP | `:296` | Daftar profil tayang, 20 per halaman (`HALAMAN_DAFTAR`, `:295`), kursor opak, saringan `kab` dan `umur`; parameter lain ditolak 400. Tidak ada rute "semua". |
| `GET /api/lapor/hilang/:token` | publik, batas laju per IP | `:310` | Satu profil. Tidak ada, belum tayang, turun, dan lewat masa menjawab 404 yang sama. |
| `GET /api/lapor/hilang/kejadian?kab=` | publik, batas laju per IP | `:23` | Kejadian Buku Besar untuk penyaring: id, jenis, kab, tanggal mulai. Kab tanpa kejadian menjawab daftar kosong. |
| `GET /api/lapor/hilang/foto/:x` | publik | `:143` | Foto turunan, hanya untuk profil tayang dalam masa tayang; tidak pernah `public` atau `max-age` (`:142`). |
| `POST /api/lapor/hilang/info` | sesi `/masuk` untuk informasi, foto, laporkan; tanpa sesi untuk cabut dan orang_ini | `:321` | Wajib header `x-pb: 1`; pesan disamarkan lewat `samarkan` dan dipotong 480 huruf; jawaban sama untuk semua jenis. |
| `GET /api/lapor/hilang/saya` | sesi `/masuk` terbukti atau mesin gateway | `:99` | Status laporan milik nomor itu. |
| `POST /api/lapor/hilang/saya/cabut` | sama | `:105` | Profil menunggu atau tayang turun dengan alasan `dicabut`. |
| `POST /api/lapor/hilang/saya/perpanjang` | sama | `:105`, syarat di `:98` | Hanya bila turun karena kedaluwarsa, persetujuan masih sah, dan laporan induk belum ditemukan atau ditutup; kembali ke `menunggu`. |
| `POST /api/lapor/hilang/saya/foto` | sama | `:125` | Unggah foto turunan; foto anak ditolak 403; hanya sebelum tayang; paling banyak 3. |
| `GET /api/lapor/meja/hilang` | staf meja | `:170` | Antrean tinjau, saran cocok, panel privat. Dipetakan di `src/lapor_ai.js:1165`. |
| `GET /api/lapor/meja/hilang/info` | staf dengan hak `tayang` | `:249` | Antrean informasi, 50 per halaman (`HALAMAN_INFO`, `:248`), disaring wilayah. |
| `GET /api/lapor/meja/hilang/metrik` | staf dengan hak `tayang` | `:275` | Angka kerja OH-18 dari tabel: antrean (jumlah, umur tertua, median dalam jam), tayang aktif, turun per alasan, informasi terbuka. Belum terukur (tabel belum ada, atau akun non-BNPB tanpa wilayah) = `null`; dihitung nol = 0. Tanpa tingkat keberhasilan. Dipetakan di `src/lapor_ai.js:1167`; hitungan di `src/hak.js:3022`. |
| `POST /api/lapor/meja/hilang/<id>/aksi` | staf dengan hak `tayang` | `:193` | Aksi: `tayang`, `perbaikan`, `tolak`, `ganti_foto`, `ubah_kejadian`, `konfirmasi_kejadian`, `verifikasi_wali`, `telepon`, `turunkan`, `selesai_info`, `teruskan_info`. Dipetakan di `src/lapor_ai.js:1178`. |

Rute `saya/*`: bila ada header `authorization`, kunci mesin diperiksa lewat `mesinSah`; selain itu wajib sesi `/masuk`. Nomor yang diketik di badan atau kueri diabaikan dan jawabannya 401 (`src/orang_hilang.js:86` sampai `93`). Aksi tulis juga wajib header `x-pb: 1`.
