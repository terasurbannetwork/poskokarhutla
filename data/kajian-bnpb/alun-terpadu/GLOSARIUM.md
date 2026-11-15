# GLOSARIUM: Alun-alun Terpadu

| Istilah | Arti di paket ini |
| --- | --- |
| Alun-alun | Forum di `/alun-alun`: warga, relawan, dan petugas bertanya, meminta bantuan, dan berbagi kabar lapangan |
| Utas | Satu kiriman pembuka di alun-alun; jenisnya tanya, butuh bantuan, info lapangan, atau pengumuman |
| Kebutuhan | Utas berjenis "butuh bantuan" |
| Kabar warga | Utas berjenis "info lapangan" atau "butuh bantuan" yang dikirim ke pencocok kejadian |
| Status bantuan | Terbuka, ditangani, atau selesai; hanya untuk utas "butuh bantuan" |
| Riwayat penanganan | Catatan tiap perubahan status bantuan: pelaku atau lembaga, alasan baku, waktu; tidak bisa diubah |
| Balasan lembaga | Balasan yang ditulis atas nama satu akun instansi dan bertanda nama lembaganya |
| Label lembaga | Nama lembaga yang diambil server dari akun instansi dan disimpan di `alun_lembaga`; hanya untuk balasan lembaga, tidak untuk kiriman pribadi |
| Balasan resmi | Balasan lembaga atau balasan petugas pusat |
| Kabupaten baku | Kabupaten atau kota yang dipilih dari daftar dan disimpan sebagai kode empat digit di `alun_wilayah` |
| Tidak valid | Tanda dari akun instansi bahwa satu utas bukan kebutuhan nyata, ganda, atau di luar wilayah; mengeluarkannya dari rekap dan pencocok tanpa menyembunyikannya |
| Alasan baku | Pilihan tetap saat menutup kebutuhan atau menandai tidak valid; menggantikan catatan bebas di layar publik |
| Catatan staf | Catatan bebas pada riwayat yang hanya terlihat staf dan moderator |
| Dibuka lagi | Kebutuhan yang ditutup lembaga lalu dinyatakan belum selesai oleh pelapornya |
| Pelapor | Penulis utas, dikenali dari kode pemilik utas atau sesi nomor WhatsApp-nya |
| Terverifikasi | Tanda bahwa penulisnya masuk lewat nomor yang terbukti; bukan pengesahan isi |
| Kotak masuk alun-alun | Tab di `/instansi` yang memuat utas dalam wilayah akun |
| Dalam wilayah | Kode kabupaten utas termasuk daftar kode kabupaten akun; utas tanpa kabupaten hanya untuk akun tingkat provinsi yang mencakup provinsinya |
| Buku Besar Kejadian | Tabel `sk_kejadian` dan sumbernya; satu nomor kejadian `KJ-` untuk semua modul |
| Sumber | Modul yang barisnya ditautkan ke kejadian; alun-alun menjadi sumber ketujuh |
| Pencocok | `scripts/siklus/pasang.py`: mencocokkan baris sumber ke kejadian menurut jenis, kabupaten, dan jendela 3 hari |
| Terpasang | Baris sumber cocok dengan tepat satu kejadian |
| Ambigu | Baris sumber cocok dengan lebih dari satu kejadian; untuk sumber alun-alun hanya status, tidak masuk antrean tinjau staf |
| Tanpa kabupaten | Utas yang tidak mengisi kabupaten; hanya masuk kotak masuk akun provinsi dan tidak ditautkan |
| Belum ada di Buku Besar | Kabar warga berwilayah jelas yang tidak cocok dengan kejadian mana pun; petunjuk untuk staf, bukan kejadian |
| Tanda kejadian | Tulisan "Terkait kejadian KJ-..." di utas; menunjukkan keterkaitan, bukan kebenaran isi |
| Kab4 | Kode kabupaten atau kota empat digit yang dipakai Buku Besar |
| Rekap | Berkas angka agregat alun-alun yang dihitung pipeline dan disimpan di gudang privat `siklus/saji/alun/`; tanpa judul dan tanpa data orang |
| Lama tak terjawab | Kebutuhan terbuka berumur lebih dari 24 jam tanpa balasan resmi |
| Waktu respons | Selisih waktu kebutuhan dibuat dan balasan resmi pertamanya |
| Topik | Pasangan jenis bencana dan jenis utas; bukan hasil pengelompokan teks |
| Rute ingest | Rute Worker yang hanya dibuka untuk pipeline dengan `PIPA_TOKEN` |
| Layar Pimpinan | Halaman `/admin/pimpinan`; satu layar lintas sistem untuk pimpinan |
| Dasbor pimpinan | Halaman `/bnpb/pimpinan` dari paket Paritas Bencana; tidak diubah paket ini |
| Pemberitahuan | Push dan email lewat `kabarkan()` ke akun instansi wilayah; bukan WA |
| Bawaan sementara | Nilai yang dipakai agent selama pemilik belum menjawab; ditandai di KEPUTUSAN dan bisa diganti kapan saja |
