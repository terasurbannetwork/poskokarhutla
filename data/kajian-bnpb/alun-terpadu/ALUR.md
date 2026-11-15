# ALUR: Alun-alun Terpadu

Tiap alur ditulis dari yang dilihat orang. Aturan hitungnya ada di `ALGORITMA.md`.

## A1. Warga menulis "butuh bantuan"

1. Warga membuka `/alun-alun`, menekan "Tulis utas", memilih "Butuh bantuan", jenis bencana, provinsi, lalu kabupaten atau kota dari daftar yang menyesuaikan provinsi. Nama yang tidak ada di daftar tidak diterima.
2. Utas tampil seperti sekarang, dengan pil "Terbuka".
3. Bila penulisnya sudah masuk lewat nomor WhatsApp, akun instansi yang wilayahnya mencakup kabupaten itu menerima pemberitahuan: "Kebutuhan baru di alun-alun, <kabupaten>."
4. Bila penulisnya tamu, tidak ada pemberitahuan; utasnya tetap tampil di kotak masuk akun wilayah itu.
5. Warga tidak melihat siapa yang diberi tahu; ia melihat pil status dan riwayat penanganan.

## A2. BPBD membuka kotak masuk

1. Petugas masuk ke `/instansi` dan membuka tab "Alun-alun".
2. Daftar berisi utas dalam wilayah akunnya. Urutan bawaan: kebutuhan terbuka paling lama di atas, lalu "info lapangan" dan "tanya" yang belum dijawab resmi.
3. Tiap baris: jenis, judul, kabupaten, umur utas, pil status, tanda "Terverifikasi" bila penulisnya masuk, dan tanda kejadian bila sudah tertaut.
4. Saringan: jenis utas, status, hanya yang belum dijawab resmi.
5. Kosong: "Belum ada utas di wilayah ini."

## A3. BPBD menjawab dan menangani

1. Petugas membuka satu utas dari kotak masuk, membaca isi dan balasan.
2. Mengetik balasan (paling banyak 280 huruf) dan menekan "Balas sebagai <nama lembaga>".
3. Balasan tampil di halaman publik dengan pil lembaga dan nama lembaganya, tanpa nama orang.
4. Untuk kebutuhan, petugas pemprov, pemkab, atau pemkot memilih status: Ditangani atau Selesai. Menutup meminta satu alasan dari daftar (bantuan sudah tiba, ditangani instansi lain, tidak ditemukan di lokasi, kiriman ganda, lainnya) dan boleh menambah catatan yang hanya terlihat staf.
5. Tiap perubahan tampil di "Riwayat penanganan" utas: status, lembaga, alasan, waktu.

## A4. Menandai tidak valid

Bila utas bukan kebutuhan nyata, ganda, atau di luar wilayah, petugas menekan "Tandai tidak valid" dan memilih alasannya. Utas tetap tampil di forum, tetapi keluar dari hitungan rekap, tidak ditautkan ke kejadian, dan masuk antrean moderator pusat. Moderator memutuskan menyembunyikannya atau mencabut tandanya.

## A5. Pelapor menyatakan belum selesai

Di utas yang ditutup lembaga, penulisnya melihat tombol "Belum selesai" selama 14 hari. Menekannya membuka lagi utas itu; riwayat mencatat "Dibuka lagi oleh pelapor", dan utas kembali ke atas kotak masuk.

## A6. Utas menempel ke kejadian

1. Pipeline Buku Besar (terjadwal di `siklus.yml`) menarik kebutuhan dan info lapangan baru yang berkabupaten dan tidak sedang dipersoalkan.
2. Tiap utas mendapat satu hasil: terpasang ke satu kejadian, ambigu, atau tidak cocok dengan kejadian mana pun. Kiriman warga tidak pernah membuat kejadian.
3. Di halaman publik, utas yang terpasang ke kejadian yang sudah dipublikasikan menampilkan "Terkait kejadian KJ-..." yang menaut ke ringkasan publik kejadian itu, dengan keterangan bahwa tanda ini menunjukkan keterkaitan, bukan kebenaran isi.
4. Bila utas kemudian disembunyikan, dihapus, atau ditandai tidak valid, tandanya hilang saat itu juga.

## A7. Staf melihat kabar warga per kejadian

Di halaman satu kejadian `/siklus`, kartu "Kabar warga" memuat utas yang terpasang dan masih tampil: jenis, judul, kabupaten, waktu, status bantuan, jumlah balasan. Menekan satu baris membuka utasnya di alun-alun.

## A8. Staf melihat kabar yang belum ada di Buku Besar

Di `/admin/alun`, kartu "Belum ada di Buku Besar" memuat hitungan per provinsi dan daftar utas berkabupaten yang tidak cocok dengan kejadian mana pun. Staf memakainya sebagai petunjuk untuk memeriksa. Tidak ada tombol "jadikan kejadian".

## A9. Pimpinan melihat rekap

1. Layar Pimpinan menampilkan kartu "Alun-alun": kebutuhan terbuka, yang lebih dari 24 jam tanpa balasan resmi, median waktu respons 7 hari, dan bagian yang terjawab, untuk kiriman terverifikasi. Satu baris terpisah menampilkan angka yang sama untuk kiriman tamu.
2. Di bawahnya tabel per provinsi; staf berwilayah hanya melihat wilayahnya.
3. Tiap kartu menyebut waktu rekap. Lebih dari 36 jam: "Rekap terakhir <tanggal>". Belum ada: "Rekap belum tersedia."

## A10. Moderasi

Aduan, ambang sembunyi, dan aksi moderator tetap. Balasan lembaga yang diadukan masuk antrean moderator dan tidak tersembunyi otomatis. Moderator yang mengubah status juga memilih alasan, dan tindakannya masuk riwayat.

## Status

| Benda | Status | Berpindah oleh |
| --- | --- | --- |
| Bantuan | terbuka, ditangani, selesai | akun instansi wilayah (pemprov, pemkab, pemkot), moderator, pelapor (membuka lagi), fitur Teruskan |
| Tautan kejadian | terpasang, ambigu, tidak ada | pencocok; dicabut saat moderasi |
| Tanda tidak valid | ada, dicabut | akun instansi wilayah, moderator |
| Pemberitahuan | terkirim, tidak dikirim (tamu, lewat batas, tanpa penerima) | saat utas dibuat |
| Rekap | segar, lama (lebih dari 36 jam), belum ada | pipeline |
