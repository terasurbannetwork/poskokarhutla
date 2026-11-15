# GLOSARIUM: Alun-alun Terpadu

| Istilah | Arti di paket ini |
| --- | --- |
| Alun-alun | Forum di `/alun-alun`: warga, relawan, dan petugas bertanya, meminta bantuan, dan berbagi kabar lapangan |
| Utas | Satu kiriman pembuka di alun-alun; jenisnya tanya, butuh bantuan, info lapangan, atau pengumuman |
| Kebutuhan | Utas berjenis "butuh bantuan" |
| Kabar warga | Utas berjenis "info lapangan" atau "butuh bantuan" yang dikirim ke pencocok kejadian |
| Status bantuan | Terbuka, ditangani, atau selesai; hanya untuk utas "butuh bantuan" |
| Riwayat penanganan | Catatan tiap perubahan status bantuan: lembaga, waktu, catatan; tidak bisa diubah |
| Balasan lembaga | Balasan yang ditulis atas nama satu akun instansi dan bertanda nama lembaganya |
| Label lembaga | Nama lembaga yang dihitung server dari akun instansi aktif; tidak bisa dikirim klien |
| Terverifikasi | Tanda bahwa penulisnya masuk lewat nomor yang terbukti; bukan pengesahan isi |
| Kotak masuk alun-alun | Tab di `/instansi` yang memuat utas dalam wilayah akun |
| Dalam wilayah | Provinsi dan kabupaten utas tercakup oleh akun, menurut aturan lingkup akun instansi yang ada |
| Buku Besar Kejadian | Tabel `sk_kejadian` dan sumbernya; satu nomor kejadian `KJ-` untuk semua modul |
| Sumber | Modul yang barisnya ditautkan ke kejadian; alun-alun menjadi sumber ketujuh |
| Pencocok | `scripts/siklus/pasang.py`: mencocokkan baris sumber ke kejadian menurut jenis, kabupaten, dan jendela 3 hari |
| Terpasang | Baris sumber cocok dengan tepat satu kejadian |
| Ambigu | Baris sumber cocok dengan lebih dari satu kejadian; diselesaikan staf |
| Tanpa wilayah | Kabupaten utas tidak dikenali dan tidak ada koordinat |
| Belum ada di Buku Besar | Kabar warga berwilayah jelas yang tidak cocok dengan kejadian mana pun; petunjuk untuk staf, bukan kejadian |
| Tanda kejadian | Tulisan "Terkait kejadian KJ-..." di utas; menunjukkan keterkaitan, bukan kebenaran isi |
| Kab4 | Kode kabupaten atau kota empat digit yang dipakai Buku Besar |
| Rekap | Berkas angka agregat alun-alun yang dihitung pipeline dan disimpan privat |
| Lama tak terjawab | Kebutuhan terbuka berumur lebih dari 24 jam tanpa balasan lembaga |
| Waktu respons | Selisih waktu utas "butuh bantuan" dibuat dan balasan lembaga pertamanya |
| Topik | Pasangan jenis bencana dan jenis utas; bukan hasil pengelompokan teks |
| Rute ingest | Rute Worker yang hanya dibuka untuk pipeline dengan `PIPA_TOKEN` |
| Layar Pimpinan | Halaman `/admin/pimpinan`; satu layar lintas sistem untuk pimpinan |
| Dasbor pimpinan | Halaman `/bnpb/pimpinan` dari paket Paritas Bencana |
| Pemberitahuan | Push dan email lewat `kabarkan()` ke akun instansi wilayah; bukan WA |
| Bawaan sementara | Nilai yang dipakai agent selama pemilik belum menjawab; ditandai di KEPUTUSAN dan bisa diganti kapan saja |
