# Sekilas dan ringkasan operasi

Halaman ini menjelaskan untuk apa menu Operasi dipakai dan cara membukanya, memilih periode, serta membaca ringkasan.

## Sekilas

Menu Operasi (`centurisk97.id/operasi`) adalah layar kerja untuk mengendalikan operasi lapangan. Layar ini menjawab pertanyaan yang biasanya tersebar di grup percakapan: armada udara mana yang sudah melapor hari ini, pangkalan mana yang tidak punya armada siap, titik api mana yang berada di luar jangkauan armada, ke mana armada sebaiknya terbang, dan apa hasil tiap aksi penyiraman air dari udara.

Layar ini juga memuat rencana lapangan (disingkat renlap, yaitu daftar lokasi yang diusulkan untuk didatangi pada satu hari) dan pencatatan tindakan untuk banjir, longsor, gempa, gunung api, dan bencana lain. Semua keluaran modul ini berupa usulan dan perkiraan. Keputusan terbang selalu ada pada pilot dan komando operasi, bukan pada sistem.

Dua istilah yang sering muncul di bawah ini. **Titik panas** adalah lokasi yang dideteksi satelit lebih panas daripada sekitarnya; itu bukan pengukuran api di lapangan. **Hipotesis** berarti aturan atau model yang belum lolos uji balik. Uji balik adalah mencocokkan hasil aturan itu dengan kejadian lampau yang sudah diketahui, untuk melihat apakah usulannya sesuai kenyataan. Yang masih hipotesis harus dipakai sebagai bahan pertimbangan, bukan sebagai kepastian.

Isi bagian Cara memakai: membuka layar, memilih periode, daftar Perlu tindakan, Tindak lanjut, Base dan armada, Peta operasi, Peluang semai, Renlap dan sortie, Kinerja, Kontrak, Sarana dan fasilitas, Tindakan lapangan, Misi udara (belum untuk staf biasa), Operasi Darat, dan tab Operasi di peta utama.

Warga umum tidak punya akses ke modul ini.

## Membuka layar dan siapa yang boleh melihat

Buka `centurisk97.id/operasi` setelah masuk. Yang boleh membaca: akun gerbang Centurisk97, moderator, staf berperan udara, Pusdalops, koordinator Pusdalops, pimpinan, modifikasi cuaca, dan pemirsa Pusdalops (yang hanya membaca). Yang boleh mengisi data secara manual hanya staf Pusdalops dan moderator. Pimpinan hanya membaca. Tamu yang belum masuk tidak melihat tab Operasi.

Layar punya dua bagian di deret atas: **Udara** dan **Darat**. Di sisi kiri ada daftar seksi yang lebarnya bisa ditarik. Setiap seksi berupa kartu yang bisa dilipat, dan pilihan buka atau tutupnya diingat di peramban Anda.

## Memilih periode

1. Pilih jenis periode di bagian atas: Hari, Minggu, Bulan, Rentang, atau 12 Bulan.
2. Untuk Hari, pakai tombol Kemarin dan Besok, kalender, atau deretan Senin sampai Minggu. Tanggal sebelum 1 Juli 2026 dan sesudah hari ini tidak bisa dipilih.
3. Untuk Rentang, pilih tanggal awal dan akhir, atau pilihan cepat (7, 14, atau 31 hari terakhir, bulan ini, bulan lalu).

Kartu yang menggambarkan keadaan, seperti status armada dan rencana tindakan, hanya bermakna untuk satu hari. Rencana tindakan hanya dihitung bila periode yang dipilih adalah Hari. Untuk periode lebih dari satu hari, layar menampilkan hari terakhir dari periode itu.

## Ringkasan dan daftar "Perlu tindakan"

Seksi Ringkasan menampilkan satu kartu per pangkalan (jumlah armada, yang siap, cuaca terbang, gugus api dalam jangkauan, dan target rencana lapangan yang sudah didatangi). Gugus api adalah kumpulan titik panas yang berdekatan. Di bawahnya ada daftar **Perlu tindakan**. Daftar ini dihitung langsung dari data yang tampil, dan sebuah butir hilang sendiri begitu datanya terisi. Isinya:

1. Pangkalan yang belum melaporkan gelar armada. Muncul pada hari ini bila pangkalan punya armada, belum ada satu pun armada yang berstatus, dan jam setempat sudah 07.30 atau lebih. Pangkalan Banjarmasin memakai waktu WITA, pangkalan lain memakai WIB. Batas 07.30 adalah angka sementara.
2. Gugus api prioritas yang berada di luar jangkauan armada. Gugus prioritas adalah gugus berlevel 3, yaitu yang punya cukup banyak titik panas dalam 24 jam terakhir (15 atau lebih) dan, bila datanya ada, indeks bahaya api cuaca 7 atau lebih. Level dihitung sistem, bukan ditetapkan petugas.
3. Pangkalan dekat api prioritas yang cuaca terbangnya belum layak.
4. Armada yang tidak siap.
5. Target rencana lapangan (renlap) yang belum didatangi, hanya setelah pukul 12.00 WIB pada hari ini.
6. Data belum lengkap, misalnya penyiraman air tanpa laporan hasil, armada tanpa tipe, atau armada tanpa pangkalan.

Klik sebuah butir untuk melompat ke pangkalan, armada, peta, atau seksi yang bersangkutan. Butir merah berarti tenggatnya sudah lewat, butir oranye berarti belum.

Jam batas yang dipakai di layar Operasi, supaya tidak tertukar:

| Hal | Jam |
| --- | --- |
| Pangkalan dianggap belum lapor | 07.30 waktu setempat (WITA untuk Banjarmasin, WIB untuk lainnya) |
| Target renlap dianggap belum didatangi | sesudah 12.00 WIB |
| Renlap versi pagi dibuat | sesudah 07.00 WIB, untuk hari itu |
| Renlap versi malam dibuat | sesudah 20.00 WIB, untuk besok |
| Permintaan renlap bencana lain dianggap gagal | tertahan lebih dari 30 menit |

Semua angka jam ini sementara dan bisa berubah.
