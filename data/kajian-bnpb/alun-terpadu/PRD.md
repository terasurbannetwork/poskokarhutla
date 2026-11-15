# PRD: Alun-alun Terpadu

Otoritas: `KEPUTUSAN-ALUN.md` menang atas dokumen ini.

## Tujuan

Tiap kebutuhan dan kabar lapangan yang ditulis di alun-alun sampai ke BPBD wilayahnya, dijawab oleh lembaga yang berwenang, menempel ke kejadian yang benar, dan terangkum untuk pimpinan sebagai angka yang bisa dicek.

## Ukuran berhasil

| Ukuran | Sekarang (15 Nov 2026) | Sasaran 60 hari sesudah tayang |
| --- | --- | --- |
| Kebutuhan terverifikasi yang mendapat balasan resmi | tidak terukur (0 utas) | paling sedikit 70 persen |
| Median waktu dari kebutuhan terverifikasi sampai balasan resmi pertama | tidak terukur | di bawah 6 jam |
| Utas baru berkabupaten baku | tidak ada (teks bebas) | 100 persen dari yang mengisi kabupaten |
| Utas berkabupaten yang terkirim ke pencocok dalam 24 jam | 0 | paling sedikit 95 persen dari yang memenuhi syarat |
| Baca D1 tambahan | 0 | di bawah 50 ribu baris per hari |

Sasaran angka adalah usulan agent, bukan janji pemilik.

## Pengguna

| Pengguna | Kebutuhan |
| --- | --- |
| Warga dan relawan | Tahu kirimannya sampai ke BPBD, melihat status penanganannya, dan bisa menyatakan belum selesai |
| Petugas BPBD, pemda, TNI, Polri | Melihat utas di wilayahnya, menjawab atas nama lembaga, menandai ditangani, selesai, atau tidak valid |
| Moderator pusat | Tidak lagi menjadi satu-satunya penjawab; tetap memoderasi |
| Staf Pusdalops | Melihat kabar warga yang menempel ke satu kejadian, dan yang belum ada di Buku Besar |
| Pimpinan | Angka per provinsi dan kabupaten: kebutuhan terbuka, yang lama tak terjawab, waktu respons |

## Fitur

| No | Fitur | Keputusan | Tiket |
| --- | --- | --- | --- |
| F-1 | Kabupaten baku: form memilih dari daftar, server memeriksa, kode disimpan | D4 | AT-03 |
| F-2 | Kotak masuk alun-alun di `/instansi` untuk utas dalam wilayah akun | D5 | AT-04 |
| F-3 | Balasan atas nama lembaga dari kotak masuk, bertanda nama lembaga | D6, D7 | AT-05 |
| F-4 | Status bantuan dengan alasan baku dan riwayat; pelapor bisa menyatakan belum selesai | D10, D11 | AT-06 |
| F-5 | Tanda "tidak valid" dari akun instansi | D9 | AT-07 |
| F-6 | Pemberitahuan push dan email ke akun wilayah untuk kebutuhan terverifikasi | D8 | AT-08 |
| F-7 | Alun-alun menjadi sumber Buku Besar Kejadian dengan aturan khusus | D1, D2, D3, D12 | AT-09a |
| F-8 | Tanda "Terkait kejadian KJ-..." di utas untuk kejadian yang dipublikasikan | D1 | AT-10 |
| F-9 | Kartu "Kabar warga" di halaman kejadian `/siklus` | D1 | AT-11 |
| F-10 | Rekap dihitung pipeline ke gudang privat | D13, D14, D15 | AT-09b |
| F-11 | Rute rekap untuk staf berwenang; statistik admin dan "Belum ada di Buku Besar" dari rekap | D16 | AT-09c |
| F-12 | Kartu "Alun-alun" di Layar Pimpinan | D16 | AT-12 |

## Larangan

- Tidak membuat kejadian dari kiriman warga, tidak mengubah fase, tidak menghitungnya untuk verifikasi kejadian (D3).
- Tidak menutup kejadian dari status bantuan (D17).
- Tidak menulis "aman" di layar, rekap, atau pemberitahuan (K7).
- Tidak memuat judul utas, nama, nomor, atau jejak per orang di rekap dan pemberitahuan (D8, D14).
- Tidak mengirim pemberitahuan untuk kiriman tamu (D8).
- Tidak menampilkan label lembaga pada kiriman pribadi (D7).
- Tidak membangun feed publik, hub tukar data, atau daftar warga rentan (K6).
- Tidak membaca WA masuk; tidak mengirim WA untuk pemberitahuan ini (K5, Q3).
- Tidak mengelompokkan teks secara otomatis, tidak memberi skor atau peringkat (D15).
- Tidak mengubah tabel `alun_*` produksi dengan `ALTER`; tanpa trigger; tanpa data contoh.
- Tidak menghitung rekap dengan kueri langsung saat layar dibuka (D13).
- Tidak menampilkan rekap ke publik, mitra, pemirsa, atau Laporan Berkala sebelum pemilik menjawab Q1, Q2, Q11, Q12.
- Tidak membuka balasan atas nama lembaga dari halaman publik (D6).

## Di luar lingkup

Dasbor pimpinan `/bnpb/pimpinan`, Laporan Berkala, rekap publik atau mitra, penggabungan dengan tawaran bantuan paket Tiga W, kotak masuk umum lintas modul, deteksi hoaks, aplikasi seluler.

## Ketergantungan

| Butuh | Status | Akibat bila belum ada |
| --- | --- | --- |
| Satu Pintu Masuk tayang (migrasi dan `MASUK_KUNCI`) | kode sudah di repo, belum aktif di produksi | tidak ada kiriman terverifikasi, jadi tidak ada pemberitahuan; kotak masuk tetap bisa |
| Migrasi Keterpaduan diterapkan (KP-25) | menunggu pemilik | tanda kejadian kosong |
| Akun instansi daerah aktif | 0 akun | tidak ada penerima kotak masuk dan pemberitahuan |
| `PIPA_TOKEN` dan langkah `siklus.yml` | sudah dipakai sumber lain | rekap tidak terbit; layar menulis "Rekap belum tersedia" |
| Domain pengirim email terverifikasi | belum | pemberitahuan hanya push |
| Jawaban Q10 dan Q13 | belum | AT-05, AT-06, AT-08 tidak dikerjakan |
