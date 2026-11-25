# Sandi, penguncian, dan PIN profil

Halaman ini menjelaskan aturan sandi, penguncian setelah salah berulang, dan aturan PIN profil BPBD.

## Sandi dan penguncian

Sandi tidak disimpan apa adanya, hanya bentuk sandi acak yang tidak bisa dikembalikan. Waktu jawaban sengaja dibuat sama untuk nama pengguna yang tidak dikenal agar tidak bisa ditebak. Sandi yang benar selalu diterima walau hitungan gagal sudah penuh. Pesan "terlalu banyak percobaan" hanya muncul bila sandi salah.

| Hitungan gagal | Batas per jam |
| --- | --- |
| nama pengguna dan alamat jaringan sama | 8 |
| nama pengguna saja | 200 |
| alamat jaringan saja | 30 |

Sandi baru dibuat acak oleh sistem, bukan dipilih pengguna, lalu tampil sekali dan mencabut sesi lain. Akun pendataan dan kampus memilih sandi sendiri, minimal 10 karakter. Sesi akun lembaga dan staf berlaku 30 hari.

Keterbatasan yang diterima: bila banyak pengguna berbagi satu alamat jaringan (misalnya jaringan seluler), satu penebak dapat menghabiskan jatah dan mengunci pengguna sah dari alamat itu selama satu jam. Pengguna sah dapat masuk lewat jaringan lain.

## PIN profil BPBD

Aturan PIN: tepat 6 angka. Ditolak:

1. semua angka sama (111111);
2. deret naik atau turun (123456, 654321);
3. pola berulang (121212, 123123, 112233);
4. pola cermin (123321);
5. sama dengan 6 angka terakhir nomor HP pemilik profil.

PIN sementara dari admin dibuat acak lalu diulang sampai lolos aturan ini. PIN disimpan sebagai bentuk sandi acak, tidak pernah terbaca. Contoh PIN yang diterima: 482916. Setiap percobaan dihitung lebih dulu sebelum dibandingkan, sehingga tebakan serentak tidak bisa melewati batas.

| Besaran | Nilai |
| --- | --- |
| Profil per akun | paling banyak 4 |
| Profil lengkap sebelum kirim | 3 |
| Salah beruntun | 5 kali dalam 15 menit, lalu terkunci sampai jam buka |
| Salah dalam satu hari (WIB) | 10 kali, lalu terkunci sampai admin membuka |
| Sesi profil | 12 jam |
| Batas PIN per akun dan per alamat jaringan | 30 dan 60 per jam |
| Catatan tindakan per profil disimpan | 730 hari, hanya bertambah, tidak bisa diubah atau dihapus |

Foto profil hanya JPEG dengan keterangan lokasi dibuang. Tidak ada pengenalan atau pencocokan wajah pada profil BPBD.

Keterbatasan yang diterima: pemegang sandi lembaga dapat sengaja menebak salah PIN rekannya sampai terkunci hari itu. Kejadian ini terlihat di catatan tindakan.
