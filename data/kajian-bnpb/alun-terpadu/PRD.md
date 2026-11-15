# PRD: Alun-alun Terpadu

Otoritas: `KEPUTUSAN-ALUN.md` menang atas dokumen ini.

## Tujuan

Tiap kebutuhan dan kabar lapangan yang ditulis di alun-alun sampai ke BPBD wilayahnya, dijawab oleh lembaga yang berwenang, menempel ke kejadian yang benar, dan terangkum untuk pimpinan sebagai angka yang bisa dicek.

## Ukuran berhasil

| Ukuran | Sekarang (15 Nov 2026) | Sasaran 60 hari sesudah tayang |
| --- | --- | --- |
| Utas "butuh bantuan" yang mendapat balasan lembaga | tidak terukur (0 utas) | paling sedikit 70 persen |
| Median waktu dari utas "butuh bantuan" sampai balasan lembaga pertama | tidak terukur | di bawah 6 jam |
| Utas "butuh bantuan" dan "info lapangan" yang punya keputusan tautan kejadian (terpasang, ambigu, atau belum ada di Buku Besar) | 0 persen | 100 persen dari yang berwilayah jelas |
| Kabupaten dengan akun aktif yang membuka kotak masuk dalam 7 hari terakhir | 0 | terukur (angka dasar pertama) |
| Baca D1 tambahan dari rekap | 0 | di bawah 50 ribu baris per hari |

Sasaran angka adalah usulan agent, bukan janji pemilik.

## Pengguna

| Pengguna | Kebutuhan |
| --- | --- |
| Warga dan relawan | Tahu bahwa kirimannya sampai ke BPBD dan melihat status penanganannya |
| Petugas BPBD, pemda, TNI, Polri | Melihat utas di wilayahnya, menjawab sebagai lembaga, menandai ditangani atau selesai |
| Moderator pusat | Tidak lagi menjadi satu-satunya penjawab; tetap memoderasi |
| Staf Pusdalops | Melihat kabar warga yang menempel ke satu kejadian, dan yang belum ada di Buku Besar |
| Pimpinan dan Kepala BNPB | Angka per provinsi dan kabupaten: kebutuhan terbuka, yang lama tak terjawab, waktu respons |

## Fitur

| No | Fitur | Keputusan |
| --- | --- | --- |
| F-1 | Alun-alun menjadi sumber Buku Besar Kejadian; utas "butuh bantuan" dan "info lapangan" ditautkan ke kejadian yang ada | D1, D2, D3 |
| F-2 | Form tulis menawarkan daftar kabupaten per provinsi | D4 |
| F-3 | Tanda kejadian di utas: "Terkait kejadian KJ-..." untuk kejadian yang sudah dipublikasikan; staf melihat semua tautan | D1 |
| F-4 | Kotak masuk alun-alun di `/instansi` untuk utas dalam wilayah akun | D5 |
| F-5 | Balasan lembaga bertanda nama lembaga, dari kotak masuk dan dari halaman alun-alun | D6 |
| F-6 | Status bantuan (terbuka, ditangani, selesai) diubah akun instansi wilayah itu; tiap perubahan tercatat di riwayat | D6, Q7 |
| F-7 | Pemberitahuan push dan email ke akun instansi wilayah saat ada utas "butuh bantuan" baru | D7 |
| F-8 | Rekap harian dihitung pipeline: per provinsi dan kabupaten, per jenis bencana dan jenis utas | D8, D9, D10 |
| F-9 | Kartu "Alun-alun" di Layar Pimpinan dan baris angka di dasbor pimpinan membaca rekap itu | D11 |
| F-10 | Daftar "Kabar warga yang belum ada di Buku Besar" untuk staf | D3 |
| F-11 | Berkas angka alun-alun siap dipakai perakit Laporan Berkala | D11 |
| F-12 | Daftar kabar warga per kejadian di halaman kejadian `/siklus` | D1 |

## Larangan

- Tidak membuat kejadian dari kiriman warga dan tidak mengubah fase kejadian (D3).
- Tidak menutup kejadian dari status bantuan (D12).
- Tidak menulis "aman" di layar, rekap, atau pemberitahuan (K7).
- Tidak menampilkan nama penulis, nomor, atau jejak per orang di rekap (D9).
- Tidak membangun feed publik, hub tukar data, atau daftar warga rentan (K6).
- Tidak membaca WA masuk; tidak mengirim WA untuk pemberitahuan ini (K5, D7).
- Tidak mengelompokkan teks secara otomatis dan tidak memberi skor (D10, D12).
- Tidak mengubah tabel `alun_*` produksi dengan `ALTER`; tidak ada data contoh.
- Tidak menghitung rekap dengan kueri langsung saat layar dibuka (D8).
- Tidak menampilkan rekap ke publik atau mitra sebelum pemilik menjawab Q1 dan Q2.

## Di luar lingkup

Pemasangan angka ke perakit Laporan Berkala (menunggu tiket LB), penggabungan dengan tawaran bantuan paket Tiga W, kotak masuk umum lintas modul, deteksi hoaks, aplikasi seluler.

## Ketergantungan

| Butuh | Status | Akibat bila belum ada |
| --- | --- | --- |
| Satu Pintu Masuk tayang (migrasi 0133 dan seterusnya, `MASUK_KUNCI`) | kode jadi, belum aktif di produksi | balasan lembaga dari halaman alun-alun belum bisa; kotak masuk `/instansi` tetap bisa |
| Migrasi Keterpaduan diterapkan (KP-25) | menunggu pemilik | tanda kejadian kosong |
| Akun instansi daerah aktif | 0 akun | tidak ada penerima kotak masuk dan pemberitahuan |
| `PIPA_TOKEN` dan langkah `siklus.yml` | sudah dipakai sumber lain | rekap tidak terbit; layar menulis "Rekap belum tersedia" |
| Domain pengirim email terverifikasi | belum | pemberitahuan hanya push |
| Perakit Laporan Berkala | belum ada kode | F-11 hanya berkas |
