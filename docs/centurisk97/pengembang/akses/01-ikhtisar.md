# Ikhtisar akun, akses, dan peran

Halaman ini meringkas enam bagian modul akun dan akses, prinsip yang berlaku di seluruh modul, serta peran dan hak membuka.

## Ringkasan

Modul ini mengatur siapa boleh masuk ke Centurisk97 dan apa yang boleh dilakukan sesudah masuk. Ada enam bagian yang saling terkait.

| Bagian | Jalur | Masalah yang dijawab | Pengguna |
| --- | --- | --- | --- |
| Satu Pintu Masuk | `/masuk` | Orang harus ingat satu hal saja, yaitu nomor WhatsApp-nya. Kode enam angka dikirim lewat WhatsApp, lalu orang masuk ke semua ruang yang berhak ia buka. | warga, anggota lembaga, staf BNPB, pemirsa |
| Ruang Instansi | `/instansi` | Pemda, Polri, dan TNI memakai akun lembaga (username dan sandi) untuk tugas api, laporan, korban, kebutuhan, alat, dan LogPal. | BPBD provinsi, kabupaten, dan kota, Polda, Polres, Kodam, Kodim |
| Profil BPBD | `/instansi` (layar pilih profil) | Satu akun BPBD dipakai beberapa orang. Tiap orang (PIC) punya profil, foto, dan PIN sendiri supaya setiap tindakan tercatat atas namanya. | PIC BPBD, admin BNPB |
| Petugas lapangan | `/petugas`, `/petugas/panel` | Satu basis data pegawai dan relawan, absen dengan pencocokan wajah dan GPS, logbook harian, serta panggilan relawan lewat WhatsApp. | pegawai BNPB, relawan, pimpinan |
| Inventori LogPal | `/instansi/logpal` | Stok gudang BNPB dan BPBD, mutasi, stok opname, dan permintaan bantuan logistik. | BPBD, staf BNPB |
| Segel dokumen | `/verifikasi/<kode>` | Pemegang lembar cetak atau PDF dapat memeriksa keaslian dan status dokumen. | publik, staf penerbit |

Keadaan pada tanggal dokumen ini: lima bagian pertama sudah ada di kode. Bagian segel dokumen baru memiliki migrasi `0171` (tabel `segel` dan `segel_cabut`); rute, halaman, dan sambungan ke pembeku dokumen belum dikerjakan (lihat [Batasan dan beda dokumen](/docs/pengembang/akses/batasan)).

Prinsip yang berlaku di seluruh modul:

1. Pintu lama tidak ditutup. Username dan sandi, kode tautan, dan token tetap hidup di samping `/masuk` (KEPUTUSAN-MASUK D3), kecuali untuk akun BPBD, yang kini hanya lewat username, sandi, profil, dan PIN.
2. Tiap modul menerbitkan dan mencabut sesinya sendiri. `/masuk` tidak membuat sistem sesi kedelapan untuk peran; ia memanggil fungsi `sesiUntuk` dan `cabutSesi` milik modul pemilik.
3. Kode sekali pakai, PIN, sandi, dan token tidak pernah masuk log, jawaban API, atau URL. Yang tersimpan hanya hash atau HMAC.
4. Akun staf selalu wajib sandi. Akun rahasia (token admin dan akun gerbang situs) tidak pernah lewat kode WhatsApp.
5. Pesan galat sengaja disamakan untuk kode salah, kode kedaluwarsa, dan nomor yang tidak dikenal, agar orang luar tidak dapat membedakan nomor yang terdaftar.

## Peran dan siapa boleh membuka apa

Gerbang halaman ada di `src/worker.js`. Di host terkunci semua halaman HTML terkunci secara bawaan. `HOST_TERKUNCI` (`src/worker.js:716`) berisi `centurisk97.id` dan `www.centurisk97.id`, dan `hostTerkunci` (`src/worker.js:719`) menambah host `centurisk97.terasurbannetwork.workers.dev`. Hanya jalur dalam daftar putih `PUBLIK_TANPA_SESI` (`src/worker.js:758`) yang dibuka tanpa sesi admin; selain sesi admin, staf `operator_cc` dan sesi pemirsa (hanya tab miliknya) juga lolos gerbang halaman (`src/worker.js:967-971`). Daftar putih itu hanya menutup cangkang halaman, bukan data. Data tetap dijaga di tiap panggilan API.

| Peran | Cara masuk | Sesi | Yang boleh dibuka |
| --- | --- | --- | --- |
| Tamu | tanpa sesi | tidak ada | halaman di daftar putih: `/masuk`, `/alun-alun`, `/lapor`, `/lapor/lacak`, `/instansi`, `/petugas`, `/lapangan`, `/meja`, `/pendataan`, `/bantu`, `/renlap`, `/uji-pilot`, `/daftar-kontak`, `/presiden`, `/siklus/kejadian`, `/bnpb/katalog-dokumen`. Halaman memuat data hanya sesudah kode, token, atau sesi dicek di API |
| Akun umum | nomor WhatsApp dan kode sekali pakai | `sesi_masuk`, 30 hari | menulis di alun-alun, melapor, melihat kirimannya sendiri, mengajukan diri sebagai anggota lembaga |
| Anggota akun lembaga | kode WhatsApp, lalu sesi peran | sesi modul lembaga | ruang lembaga yang diikuti (instansi bukan BPBD, pendataan, kampus) |
| Akun lembaga BPBD (pemprov, pemkab, pemkot) | username, sandi, pilih profil, PIN | `sesi_instansi` 30 hari, ditambah `sesi_profil` 12 jam | semua rute kerja `/instansi`, `/instansi/logpal`, meja `/lapor/meja` sesuai wilayah |
| Akun lembaga aparat (Polda, Polres, Kodam, Kodim) | username dan sandi, atau kode WhatsApp bila nomor akun cocok | `sesi_instansi` 30 hari | `/instansi` sesuai cakupan wilayahnya; tidak mencakup LogPal |
| Pegawai dan relawan | tautan kode pribadi `/petugas#k=...`, atau sesi nomor WhatsApp dengan hak terbatas | header `x-kode` atau `sesi_masuk` | `/petugas`: wajah, absen, logbook, riwayat |
| Staf BNPB | username dan sandi (`/admin/masuk`, atau kode WhatsApp lalu sandi) | `sesi_staf` 30 hari | menurut peran staf dan wilayah; lihat [matriks hak per fitur](/docs/pengembang/akses/matriks-hak) |
| Pemirsa | kode WhatsApp (nomor diisi Super Admin) atau pintu lama | `sesi_pemirsa` | hanya tab yang diizinkan, baca saja |
| Moderator, admin | token admin atau akun gerbang situs | sesi admin atau header | semua rute `modOK`; akun gerbang situs sengaja tidak dihitung moderator |
| Super Admin | moderator yang awalan hash-nya ada di rahasia `SUPER_ADMIN` | sama | tambahan: impor data induk, data dummy, nomor pemirsa |

![Peta peran, cara masuk, dan sesi yang diterbitkan untuk tiap peran.](gambar/akses-instansi-peta-sesi.svg)

![Kartu masuk staf dan admin di /admin/masuk dengan kolom username atau email, kata sandi, dan tautan Masuk dengan nomor WhatsApp.](gambar/layar-masuk-staf.webp)


Peran staf yang dikenal sistem (`PERAN`, `src/staf.js:23`): verifikator, pusdalops, analis_konsesi, udara, tmc, koordalops, pimpinan, kemitraan, operator_cc, direktori, irtama, unit. Staf yang perannya hanya `direktori` tidak dianggap bersesi untuk rute kerja lain (`hanyaDirektori`, `src/staf.js:30`).
