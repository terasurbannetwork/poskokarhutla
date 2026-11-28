# Orang hilang publik: alur status dan pembersihan

Halaman ini mencatat alur status, syarat tayang, konstanta hipotesis, penyaring bencana, jalur menemukan orang, pembersihan cron, dan uji fitur orang hilang publik. Bendera, berkas, tabel, dan rute ada di halaman sebelumnya.

## Alur status

Perpindahan status yang sah ada di `PINDAH` (`src/orang_hilang_murni.js:71`):

```
draf     -> menunggu
menunggu -> tayang | draf | turun
tayang   -> turun
turun    -> menunggu   (hanya bila alasan_turun = kedaluwarsa)
```

`bolehPindah` menegakkan syarat terakhir (`src/orang_hilang_murni.js:73`). Alasan turun yang sah: ditolak, dicabut, kedaluwarsa, dilaporkan, petugas, ditemukan, tutup (`:15`).

Syarat tayang dihitung satu kali oleh `syaratTayang` (`src/orang_hilang.js:157`) dan dipakai layar serta penjaga rute `tayang` (`:204`):

```
status = menunggu
layak(oh) = kejadian_id terisi DAN kejadian_oleh terisi
            DAN (kelas bukan anak ATAU wali diverifikasi)       (murni.js:76)
persetujuanSah = setuju_versi = SETUJU_VERSI DAN belum dicabut  (murni.js:78)
dewasa: telepon terbaru bukan tidak_ingin, dan sudah dicatat sesudah profil terakhir masuk menunggu
tidak ada informasi pihak ketiga terbuka
OH_PUBLIK hidup
```

Aturan telepon untuk dewasa ditandai `[BAWAAN SEMENTARA]` di kode (`src/orang_hilang.js:162`). Aksi `tolak` mensyaratkan alasan dari daftar `ALASAN_TOLAK` (`:153`); aksi `perbaikan` mensyaratkan catatan; catatan dipotong 140 huruf dan disamarkan (`:154`).

Turun otomatis lewat `turunkan` (`src/orang_hilang.js:45`), yang memindahkan baris dan menghapus foto publik di R2 sesudahnya. Tiga pemanggil: `turunDariCari` saat status laporan jadi ditemukan selamat, ditemukan meninggal, atau tutup (`turunOtomatis`, `src/orang_hilang_murni.js:77`; `ke_sar` dan `buka` tidak menurunkan, bawaan sementara), cron, dan pencabutan pelapor. Ambang `laporkan`: bila pelapor berbeda dalam 24 jam mencapai `AMBANG_LAPORKAN`, profil turun dengan alasan `dilaporkan` (`src/orang_hilang.js:342`, `src/orang_hilang_murni.js:8`).

### Konstanta hipotesis

Semua angka di `KONSTANTA` (`src/orang_hilang_murni.js:8`) belum diuji dengan kejadian nyata dan berstatus hipotesis atau bawaan sementara:

| Konstanta | Nilai | Arti |
| --- | --- | --- |
| `MASA_TAYANG_HARI` | 30 | Lama profil tampil sejak ditayangkan |
| `JENDELA_HARI` | 30 | Kejadian yang menyentuh kab/kota paling lama sekian hari sebelum laporan, atau masih berfase aktif |
| `JENDELA_TEMU_HARI` | 21 | Jarak waktu penemuan lawan terakhir terlihat untuk saran cocok |
| `KANDIDAT_MAKS`, `KEJADIAN_MAKS` | 5, 8 | Batas kandidat foto dan pilihan kejadian |
| `TOLERANSI_UMUR` | 5 | Toleransi tahun pada saran cocok |
| `AMBANG_LAPORKAN` | 3 | Pelapor berbeda dalam 24 jam yang menurunkan profil sementara |
| `SETUJU_VERSI` | 1 | Versi teks persetujuan |

Kategori umur anak (balita 0 sampai 4, anak 5 sampai 12, remaja 13 sampai 17) juga hipotesis (`:34`). Umur kosong, di luar 0 sampai 120, atau kategori tanpa angka dihitung anak (`:28`); kosong tidak pernah menjadi 0.

## Penyaring bencana dan persetujuan di obrolan

Langkah `cari_kejadian` (`src/lapor_mesin.js:617`) hanya muncul bila pemanggil menyuntik pembaca `kejadianCari`; tanpa itu jalur lama tidak berubah. Pembaca `kejadianUntuk` membaca Buku Besar lewat `ohKejadianKab` dan menyaring dengan `kandidatKejadian` (`src/orang_hilang.js:35`, `src/orang_hilang_murni.js:62`): fase `terdeteksi`, `dibatalkan`, `digabung` tidak pernah ditawarkan, paling banyak `KEJADIAN_MAKS` pilihan, yang aktif lebih dulu. Pilihan "bencana lain yang belum terdaftar" membuat laporan tanpa kejadian dan petugas memutuskan; pilihan "bukan karena bencana" membatalkan laporan. Langkah `cari_setuju` menampilkan teks izin (`:622` sampai `:636`). Bila pelapor menolak atau membatalkan, `batalHapus` mengosongkan rincian sesi (`:631`). Kejadian baru tidak pernah dibuat dari sini.

Bidang publik per kelas ditentukan daftar putih `BIDANG_PUBLIK` (`src/orang_hilang_murni.js:39`); `profilPublik` (`:46`) membuat objek baru hanya dengan kunci daftar itu, jadi kolom lain tidak pernah tersalin. Umur tampil sebagai rentang 5 tahun, tinggi sebagai rentang, lokasi hanya kecamatan dan kab, waktu hanya tanggal WIB.

### Jalur menemukan orang

Jalur B (`src/lapor_mesin.js:501`, status `temu_*`) menulis `oh_temu` dan tidak pernah tampil publik. Layar petugas menampilkan kandidat lewat `saranCocok` (`src/orang_hilang_murni.js:85`): kab sama atau bertetangga, waktu temu 0 sampai `JENDELA_TEMU_HARI` hari sesudah terakhir terlihat, kelamin tidak bertentangan, rentang umur dengan toleransi; pakaian hanya informasi. Fungsi ini tidak membaca nama atau nomor. Nomor penemu hanya di meja staf (`src/orang_hilang.js:190`).

## Pembersihan cron

Dipanggil dari cron menit 17 di `src/lapor_ai.js:743`; fungsinya `bersihOrangHilang` (`src/orang_hilang.js:72`):

1. turunkan profil menunggu atau tayang yang melewati masa, atau yang laporan induknya sudah ditemukan atau ditutup;
2. hapus berkas foto publik yatim di R2 yang lebih tua dari 1 jam (`sapuFotoYatim`, `:60`);
3. anonimkan `oh_publik` bersama laporan induknya (`ohAnonimCari`); laporan memakai retensi `CARI_SIMPAN_HARI` = 730 hari (`src/hak.js:1944`);
4. anonimkan `oh_temu` yang sudah ditutup 730 hari, hapus fotonya di R2 lebih dulu, lalu barisnya;
5. hapus `oh_cari_foto` yang lebih tua dari 90 hari dan `oh_info` selesai yang lebih tua dari 180 hari (`src/hak.js:2998` sampai `3001`).

Tiap langkah menangkap `no such table` dan galat lain hanya dicatat (`src/orang_hilang.js:73`).

## Uji

Uji ada di `tests/lapor/hilang_*.test.mjs` (murni, rute, publik, meja, mesin, temu, tulis, turun, layar). Perintah: `node --test tests/lapor/hilang_murni.test.mjs` dan berkas sejenis. Gerbang privasi dan keamanan paket ada di `tests/agen/gerbang-orang-hilang.test.mjs`; ia membaca matriks hak, SQL, migrasi, `wrangler`, dan registri halaman dari kode nyata (`:1` sampai `:4`). Rujukan `berkas:baris` di halaman ini bisa bergeser saat kode berubah; `bangun.py --cek-sumber` hanya memeriksa berkas ada dan baris dalam panjang berkas.
