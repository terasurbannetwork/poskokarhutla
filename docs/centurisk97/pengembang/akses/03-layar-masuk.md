# Layar masuk, aktivasi, keaslian

Halaman ini menguraikan halaman masuk, papan aktivasi dan undangan berantai, serta halaman keaslian dokumen yang masih rancangan.

## Halaman `/masuk`: satu pintu untuk semua peran
![Alur halaman /masuk dari nomor WhatsApp sampai ruang yang terbuka sesuai jenis akun.](gambar/akses-instansi-alur-masuk.svg)

![Kartu Masuk di /masuk dengan kolom Nomor WhatsApp, tombol Kirim kode, dan tautan Masuk dengan sandi.](gambar/layar-masuk-wa.webp)


Dibuka siapa saja tanpa sesi. Layar berisi satu kolom, urutannya sebagai berikut.

1. Ketik nomor WhatsApp (contoh 0812xxxxxxx). Nomor harus berawalan 08 atau 62 dan 9 sampai 15 angka (`public/masuk.js`).
2. Selesaikan pemeriksaan Turnstile, lalu tekan Kirim kode. Kode enam angka dikirim ke WhatsApp, berlaku 5 menit. Tombol Kirim ulang aktif sesudah jeda 60 detik.
3. Ketik kode, tekan Masuk.
4. Layar berikutnya bergantung pada nomor:
   1. Nomor yang belum punya akun otomatis memperoleh akun umum. Layar meminta nama, provinsi, kabupaten atau kota, dan centang persetujuan pemrosesan data (halaman Lengkapi profil).
   2. Nomor yang terikat ke akun lembaga (instansi bukan BPBD, pendataan, kampus, staf, pemirsa, relawan, atau pegawai) menampilkan daftar ruang. Satu akun per jenis langsung diberi sesi; bila ada lebih dari satu akun sejenis, orang memilih salah satu.
   3. Akun staf tidak mendapat sesi dari kode saja; layar meminta sandi staf sesudah kode.
   4. Orang yang ingin bergabung ke lembaga memilih "Saya petugas atau relawan", memilih provinsi, kabupaten, dan akun lembaga, lalu mengajukan diri.
5. Pilihan lain di halaman: Kirim kode ke email (tombolnya muncul hanya bila saluran email aktif di server, dan sesudah dua kali kirim kode WhatsApp atau saat gerbang WhatsApp terganggu; alamat yang diketik harus cocok dengan akun bernomor itu, dan jawaban server selalu sama; `public/masuk.js:114-117`, `src/masuk.js:208-213`), Masuk dengan sandi (pintu lama), atur sandi sesudah kode, dan Hapus akun umum.

Arti pesan dan status yang sering muncul:

| Tampilan | Arti |
| --- | --- |
| Kode WhatsApp sedang terganggu | Denyut gerbang WhatsApp lebih tua dari 5 menit. Pakai sandi atau kode email. |
| tunggu sebentar sebelum meminta kode lagi | Jeda 60 detik sejak kode terakhir untuk nomor itu belum lewat. |
| sedang ramai, coba beberapa menit lagi | Batas global kode tercapai; ini melindungi nomor gerbang dari pemblokiran WhatsApp. |
| kode salah atau kedaluwarsa | Pesan yang sama untuk kode salah, habis waktu, habis percobaan, dan nomor tanpa kode. |
| menunggu | Permohonan anggota belum disetujui; tampil di daftar menunggu milik akun. |
| akun BPBD masuk lewat halaman /instansi dengan username, sandi, profil, dan PIN | Akun pemda sengaja tidak menerima sesi dari kode WhatsApp. |

Hal yang sering disalahpahami:

1. Kode tidak membuka akun staf tanpa sandi. Ini disengaja (KEPUTUSAN-MASUK D8).
2. Kode WhatsApp tidak lagi membuka akun BPBD, meskipun nomor tercatat di akun itu. Akun BPBD memakai profil dan PIN (bawaan sementara profil-bpbd Q1, sudah ditegakkan di `src/hak.js:696`).
3. Pelapor di `/lapor` masuk lewat `/masuk`; nomor dari sesi dicek di tiap panggilan `/api/lapor/*`.
4. Masuk lewat nomor tidak membuka wajah dan absen di `/petugas`; itu butuh tautan kode pribadi (`tolakRegu`, `src/lapangan.js`).

## Papan aktivasi dan undangan berantai (`/admin/aktivasi`)

Dibuka staf berperan verifikator, pusdalops, atau koordalops (`PERAN_AKTIVASI`) dan moderator ke atas. Papan menampilkan satu baris per BPBD: 38 baris provinsi dan baris kabupaten atau kota.

1. Pilih provinsi atau saring status. Status baris: belum ada akun aktif, diundang, aktif, aktif lama tidak masuk (lebih dari 30 hari), dan untuk akun BPBD ditambah status akun serta jumlah PIC aktif (`aktif_kurang` bila PIC aktif kurang dari 3).
2. Buka rincian satu kabupaten untuk melihat kontak pemangku yang nomornya belum menjadi anggota. Nomor tampil tersamar.
3. Tekan undang untuk mengirim undangan WhatsApp berisi templat tetap. Undangan ke akun BPBD memakai tombol kirim ulang undangan (`POST /api/masuk/undang-ulang`), dibatasi satu per akun per jam dan 200 per hari untuk seluruh sistem.

Anggota aktif akun lembaga non-BPBD dapat mengundang orang lain ke akun lembaganya: paling banyak 20 undangan per 24 jam, 100 undangan terbuka, dan 3 undangan per nomor tujuan per 24 jam. Undangan berlaku 14 hari. Mencabut anggota ikut mencabut undangan yang ia kirim.

## `/verifikasi/<kode>`: halaman keaslian dokumen (rancangan)

Bagian ini belum ada di kode; yang tertulis di bawah adalah rancangan dari paket `segel-dokumen`. Setelah dibangun, halaman terbuka tanpa akun dan hanya menampilkan data sampul: jenis dokumen, judul publik, wilayah, periode, versi atau ralat, penerbit, waktu terbit, status, dan 12 huruf awal sidik. Angka isi, kalimat, lampiran, dan nama orang tidak pernah tampil.

Status yang dirancang: Berlaku, Ada versi lebih baru (dengan tautan ke versi terbaru), Dicabut, dan Tidak cocok. Pembaca dapat memilih berkas PDF yang dipegang; peramban menghitung SHA-256 berkas itu sendiri dan membandingkannya dengan sidik berkas, tanpa mengunggahnya. Tulisan di halaman: "Segel keaslian sistem, bukan tanda tangan elektronik."
