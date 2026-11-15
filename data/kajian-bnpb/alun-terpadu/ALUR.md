# ALUR: Alun-alun Terpadu

Tiap alur ditulis dari yang dilihat orang. Aturan hitungnya ada di `ALGORITMA.md`.

## A1. Warga menulis "butuh bantuan"

1. Warga membuka `/alun-alun`, menekan "Tulis utas", memilih "Butuh bantuan", jenis bencana, provinsi, lalu kabupaten atau kota dari daftar yang menyesuaikan provinsi.
2. Utas tampil seperti sekarang, dengan pil "Terbuka".
3. Dalam hitungan detik, akun instansi yang wilayahnya mencakup kabupaten itu menerima pemberitahuan: "Kebutuhan baru di alun-alun: <judul>, <kabupaten>."
4. Warga tidak melihat siapa yang diberi tahu; ia melihat pil status berubah saat lembaga menanganinya.

## A2. BPBD membuka kotak masuk

1. Petugas masuk ke `/instansi` dan membuka tab "Alun-alun".
2. Daftar berisi utas dalam wilayah akunnya. Urutan bawaan: "butuh bantuan" terbuka paling lama di atas, lalu "info lapangan" dan "tanya" yang belum dijawab lembaga.
3. Tiap baris: jenis, judul, kabupaten, umur utas, pil status, tanda "Terverifikasi" bila penulisnya masuk, dan tanda kejadian bila sudah tertaut.
4. Saringan: jenis utas, status, hanya yang belum dijawab lembaga.
5. Kosong: "Belum ada utas di wilayah ini."

## A3. BPBD menjawab dan menangani

1. Petugas membuka satu utas dari kotak masuk, membaca isi dan balasan.
2. Mengetik balasan (paling banyak 280 huruf) dan menekan "Balas sebagai <nama lembaga>".
3. Balasan tampil di halaman publik dengan pil lembaga dan nama lembaganya, tanpa nama orang.
4. Untuk utas "butuh bantuan", petugas pemprov, pemkab, atau pemkot memilih status: Ditangani atau Selesai. Mengubah ke Selesai meminta satu kalimat hasil.
5. Tiap perubahan status tercatat di riwayat utas (siapa lembaganya, kapan, catatan); riwayat tidak bisa diubah.

## A4. Menjawab dari halaman alun-alun

Orang yang masuk lewat nomor WhatsApp dan terikat ke tepat satu akun instansi yang wilayahnya mencakup utas melihat kotak centang "Balas sebagai <nama lembaga>" di form balasan. Tanpa centang, ia membalas sebagai dirinya. Orang yang terikat ke lebih dari satu akun tidak mendapat pilihan itu di halaman publik dan diarahkan ke kotak masuk `/instansi`.

## A5. Utas menempel ke kejadian

1. Pipeline Buku Besar (terjadwal di `siklus.yml`) menarik utas "butuh bantuan" dan "info lapangan" baru.
2. Tiap utas mendapat satu keputusan: terpasang ke satu kejadian, ambigu (lebih dari satu kandidat), tanpa wilayah (kabupaten tidak dikenali), atau belum ada di Buku Besar.
3. Di halaman publik, utas yang terpasang ke kejadian yang sudah dipublikasikan menampilkan "Terkait kejadian KJ-..." yang menaut ke ringkasan publik kejadian itu.
4. Staf melihat semua tautan, termasuk ke kejadian yang belum dipublikasikan, dan menyelesaikan yang ambigu lewat antrean tinjau Buku Besar yang sudah ada.

## A6. Staf melihat kabar warga per kejadian

Di halaman satu kejadian `/siklus`, bagian "Kabar warga" memuat utas yang terpasang: jenis, judul, kabupaten, waktu, status bantuan, jumlah balasan. Menekan satu baris membuka utasnya di alun-alun.

## A7. Staf melihat kabar yang belum ada di Buku Besar

Di `/admin/alun`, kartu "Belum ada di Buku Besar" memuat utas "info lapangan" dan "butuh bantuan" berwilayah jelas yang tidak cocok dengan kejadian mana pun dalam jendela pencocok. Staf memakainya sebagai petunjuk untuk memeriksa, bukan sebagai kejadian. Tidak ada tombol "jadikan kejadian" di paket ini.

## A8. Pimpinan melihat rekap

1. Layar Pimpinan menampilkan kartu "Alun-alun": kebutuhan terbuka, yang lebih dari 24 jam belum dijawab lembaga, median waktu respons 7 hari, dan tabel sepuluh kabupaten dengan kebutuhan terbuka terbanyak.
2. Dasbor pimpinan `/bnpb/pimpinan` menampilkan dua angka di baris operasi tiap bencana: kebutuhan terbuka dan yang lama tak terjawab.
3. Tiap angka menyebut waktu rekap. Bila rekap lebih tua dari 36 jam, kartu menulis "Rekap terakhir <tanggal>".
4. Bila berkas rekap belum ada: "Rekap belum tersedia."

## A9. Moderasi

Tidak berubah: aduan, ambang sembunyi, dan aksi moderator seperti sekarang. Balasan lembaga tidak bisa disembunyikan oleh aduan massal, sama dengan balasan petugas.

## Status

| Benda | Status | Berpindah oleh |
| --- | --- | --- |
| Bantuan | terbuka, ditangani, selesai | akun instansi wilayah (pemprov, pemkab, pemkot), moderator |
| Tautan kejadian | terpasang, ambigu, tanpa wilayah, belum ada | pencocok; ambigu diselesaikan staf |
| Pemberitahuan | terkirim, dilewati (tidak ada penerima) | saat utas dibuat |
| Rekap | segar, lama (lebih dari 36 jam), belum ada | pipeline |
