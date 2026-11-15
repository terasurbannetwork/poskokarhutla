# ALUR: Satu Pintu Masuk

Tiap alur ditulis dari yang dilihat orang. Aturan hitungnya ada di `ALGORITMA.md`.

## A1. Masuk, nomor sudah terikat ke satu akun

1. Orang membuka `/masuk` atau dialihkan ke sana dengan `?ke=` tujuan.
2. Mengetik nomor WA, menekan "Kirim kode".
3. Layar berganti ke isian enam angka dengan tulisan "Kode dikirim ke WhatsApp 0812 xxxx xx89" dan hitung mundur kirim ulang 60 detik.
4. Kode tiba lewat WA: "Kode masuk Centurisk97: 123456. Berlaku 5 menit. Jangan berikan ke siapa pun."
5. Orang mengetik kode. Sah: sesi akun itu diterbitkan, orang dialihkan ke `?ke=` bila sah, atau ke ruang bawaan akunnya.

## A2. Masuk, akun staf

Langkah 1 sampai 5 sama. Sesudah kode sah, layar meminta sandi akun staf itu. Sandi benar: sesi staf diterbitkan. Sandi salah: aturan penguncian staf yang ada berlaku. Lupa sandi staf tetap lewat Super Admin; pintu ini tidak bisa mengatur ulang sandi staf.

## A3. Masuk, satu nomor boleh memasuki beberapa akun

Sesudah kode sah, layar "Pilih ruang" menampilkan satu baris per akun: nama ruang, lembaga, wilayah. Semua sesi yang berhak sudah diterbitkan (kecuali staf, yang meminta sandi saat barisnya ditekan). Tautan "Ganti ruang" di kepala situs kembali ke layar ini tanpa kode baru selama sesi akun umum masih hidup.

## A4. Nomor belum dikenal (akun umum)

1. Sesudah kode sah, layar "Lengkapi" meminta nama, provinsi, kabupaten atau kota, dan persetujuan pemrosesan data.
2. Akun umum dibuat. Orang tiba di alun-alun atau `?ke=`.
3. Di kepala situs ada tautan "Saya petugas atau relawan" menuju A5.

## A5. Bergabung ke lembaga dari akun umum

1. Orang memilih: relawan, BPBD atau pemda, TNI atau Polri, staf unit BNPB, kampus.
2. Relawan: diarahkan ke form relawan yang ada dengan nomor terisi.
3. BPBD, pemda, TNI, Polri: orang memilih lembaga dan wilayah.
   - Akun lembaga itu sudah aktif dan orang lolos salah satu jalur bukti (ALGORITMA 4): ia menjadi anggota aktif dan tiba di `/instansi`.
   - Akun sudah aktif tetapi tidak lolos: ditawari "Buktikan lewat email dinas". Lolos bila domain email itu sudah dipetakan admin ke akun tersebut. Tidak lolos: permohonan anggota menunggu pemeriksaan.
   - Akun lembaga itu belum pernah aktif: orang diarahkan ke verifikasi akun instansi yang ada (surat tugas dan kartu). Bila nomornya cocok kontak pemangku, permohonannya ditandai "cocok kontak" dan naik ke atas antrean.
4. Unit BNPB: diarahkan ke pendaftaran pendataan yang ada. Bila nomornya cocok kontak berkategori BNPB atau ada undangan staf, akun pendataannya langsung aktif.
5. Kampus: diarahkan ke pendaftaran kampus yang ada, tanpa perubahan.

Selama menunggu, orang tetap bisa memakai akun umumnya.

## A6. Undangan berantai

1. Anggota aktif membuka "Undang rekan" di `/instansi`, mengetik nomor WA dan nama rekannya.
2. Sistem mengirim WA bertemplat tetap: "Anda diundang bergabung ke akun BPBD Kabupaten X di Centurisk97. Masuk di centurisk97.id/masuk dengan nomor ini." Nama lembaga diambil dari basis data; nama ketikan pengundang tidak masuk pesan.
3. Yang diundang menjalani A1. Karena ada undangan yang masih berlaku, ia menjadi anggota aktif saat kode sah.
4. Undangan berlaku 14 hari dan bisa dicabut. Pemilik nomor akun dan admin melihat daftar anggota dan bisa mencabutnya.

Staf boleh mengundang ke akun instansi dalam wilayah haknya dan ke pendataan. Tidak ada undangan untuk menjadi staf.

## A7. Atur sandi baru

Di halaman akun, tombol "Atur sandi" tersedia bila orang masuk dengan kode dalam 15 menit terakhir. Berlaku untuk akun pendataan dan kampus miliknya, dan untuk akun instansi hanya bila nomornya adalah nomor akun itu (bukan anggota). Sandi baru mencabut sesi lain akun itu. Tidak berlaku untuk staf.

## A8. Gerbang WA mati atau kode tidak tiba

1. Sesudah 60 detik, tombol "Kirim ulang" hidup.
2. Sesudah dua kali kirim, layar menawarkan "Kirim ke email" kepada semua orang dan meminta alamat email diketik. Jawabannya selalu sama; email hanya benar-benar terkirim bila alamat itu milik akun bernomor tersebut.
3. Bila gerbang tidak menarik antrean lebih dari 5 menit, `/masuk` menampilkan "Kode WhatsApp sedang terganggu" dan langsung menawarkan email serta "Masuk dengan sandi".

## A9. Papan aktivasi (admin dan staf)

1. Papan menampilkan 514 kab/kota: akun aktif, jumlah anggota, terakhir masuk, undangan terkirim dan diterima.
2. Menekan satu kabupaten menampilkan kontak pemangku yang belum menjadi anggota, dengan tombol "Undang".
3. "Undang" menjalankan A6 atas nama staf. Kabupaten yang akunnya belum aktif menampilkan tautan ke antrean verifikasi.

## A10. Keluar dan hapus akun

"Keluar" mencabut sesi akun umum dan tiap sesi peran peramban itu. "Hapus akun" di halaman akun menghapus akun umum, keanggotaannya, dan nama pada kirimannya; akun lembaga tidak terhapus.

## Status

| Benda | Status | Berpindah oleh |
| --- | --- | --- |
| Kode | dikirim, dipakai, habis waktu, habis coba | waktu, isian orang |
| Akun umum | aktif, diblokir | admin |
| Anggota | aktif, menunggu, dicabut | jalur bukti, peninjau, pemilik akun, bukti ulang 180 hari |
| Undangan | terkirim, diterima, dicabut | yang diundang, pengundang, waktu |
