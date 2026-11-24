# BAB 1 Kabar Datang Lebih Dulu daripada Laporan

## 1.1 Jam-jam pertama sesudah bencana

Pada jam-jam pertama sesudah banjir, longsor, gempa, atau kebakaran, kabar paling awal datang dari warga yang mengunggah foto dan video, dari akun media lokal, dan dari portal berita daerah. Laporan resmi BPBD ke Pusdalops BNPB biasanya baru tiba sesudah petugas turun ke lokasi dan mengumpulkan data. Akibatnya, BNPB kadang mengetahui kejadian dari pemberitaan, bukan dari sistemnya sendiri.

## 1.2 Yang sudah dibuktikan di tempat lain

Pemantauan media sosial untuk bencana sudah lama diteliti dan dipakai. Penelitian tentang gempa di Jepang menunjukkan bahwa unggahan di Twitter dapat menandai gempa lebih cepat daripada pengumuman resmi pada sebagian kasus. Lembaga kemanusiaan memakai alat klasifikasi otomatis untuk memilah unggahan darurat dalam jumlah besar. Di Indonesia, PetaBencana.id memetakan laporan banjir dari warga yang melapor lewat media sosial dan aplikasi pesan.

## 1.3 Yang sudah dimiliki BNPB

Sistem Centurisk97 sudah menarik berita karhutla dari Google News dan menghimpun 3.987 artikel dari 1.108 sumber dalam 120 hari terakhir. Sistem juga sudah menarik video TikTok bertagar karhutla, menyimpan post media sosial yang dikurasi admin, menentukan wilayah dari teks, mencocokkan laporan dengan Buku Besar Kejadian, dan mengirim pesan lewat bot WhatsApp. Yang belum ada adalah penarikan otomatis dari Instagram, X, dan Threads, cakupan semua jenis bencana, dan sinyal kejadian yang siap diperiksa piket.

# BAB 2 Sumber yang Dapat Dipantau

## 2.1 Lima platform dan portal berita

Semua sumber dapat dipantau, tetapi jalur aksesnya berbeda. Tabel 2.1 merangkumnya.

Tabel 2.1. Jalur akses tiap sumber per November 2026

| Sumber | Jalur utama | Batas utama | Biaya |
| --- | --- | --- | --- |
| Portal berita | RSS portal, Google News RSS, GDELT | Hanya judul dan cuplikan; isi dibaca di laman asli | Gratis |
| Threads | Pencarian kata kunci Threads API | Perlu izin pencarian kata kunci dari Meta | Gratis |
| Instagram dan Reels | Pencarian tagar Instagram Graph API dengan akun Business | 30 tagar unik per 7 hari per akun | Gratis |
| X | X API skema bayar per pemakaian | Harga per post yang dibaca | Sekitar US$0,005 per post |
| TikTok | Halaman tagar publik, atau layanan pihak ketiga | Tidak ada API untuk lembaga di Indonesia | Gratis lewat halaman publik |

Sumber: dokumentasi pengembang Meta, X, TikTok, dan GDELT, dibuka November 2026.

## 2.2 Portal berita tetap tulang punggung

Berita sudah disunting redaksi, menyebut lokasi, dan bertanggal jelas, sehingga paling mudah dipetakan ke kabupaten dan paling jarang keliru. Portal berita juga tidak bergantung pada aturan satu platform. Media sosial menambah kecepatan dan laporan langsung dari lokasi, tetapi lebih ramai kabar ulang, video lama, dan hoaks. Kedua jenis sumber saling melengkapi.

# BAB 3 Cara Kerja

## 3.1 Empat tugas yang dipisahkan

Sistem memisahkan empat tugas: menarik kabar dari tiap sumber, mengolahnya menjadi kabar bersih, mengelompokkannya menjadi sinyal kejadian, dan menyerahkan sinyal kepada piket. Pemisahan ini membuat satu sumber yang berubah aturan tidak menghentikan sumber lain.

![Gambar 3.1. Susunan sistem pemantauan kabar kebencanaan](gbr/arsitektur.png)

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB.

## 3.2 Dari kabar menjadi sinyal kejadian

Kabar yang sudah bersih digolongkan oleh model bahasa: jenis bencananya, apakah laporan langsung dari lokasi atau kabar ulang, apakah kejadiannya baru, dan kebutuhan apa yang disebut. Kabar dengan jenis bencana dan kabupaten yang sama dalam jendela 3 jam digabung menjadi satu sinyal kejadian.

Sinyal masuk daftar "perlu dicek segera" bila sedikitnya tiga akun atau portal berbeda mengabarkan kejadian yang sama tanpa saling menyalin, atau bila satu berita didukung data alam seperti gempa BMKG, *hotspot* satelit, atau hujan lebat. Satu kabar saja bisa berupa video lama atau hoaks, sedangkan tiga sumber yang tidak saling menyalin jauh lebih kecil kemungkinannya keliru bersamaan. Satu video yang dibagikan ulang seratus akun tetap dihitung satu sumber.

## 3.3 Keputusan tetap di tangan manusia

Tidak ada kabar media sosial yang langsung menjadi kejadian resmi. Gambar 3.2 menunjukkan alur keputusannya.

![Gambar 3.2. Alur keputusan untuk satu sinyal kejadian](gbr/alur-verifikasi.png)

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB.

Piket Pusdalops membaca kabar aslinya, melihat data alam di sekitar lokasi, lalu memutuskan benar, salah, atau ganda. Kejadian baru hanya dicatat di Buku Besar Kejadian sesudah BPBD atau sumber resmi lain mengonfirmasi. Keputusan piket disimpan dan menjadi ukuran ketepatan sistem dari waktu ke waktu.

# BAB 4 Dashboard dan Notifikasi

## 4.1 Dashboard untuk semua sinyal

Dashboard pemantauan menampilkan semua sinyal: kandidat kejadian baru, sinyal yang masih dipantau, dan kabar pendukung kejadian yang sudah tercatat. Piket memeriksa dan memutuskan dari layar yang sama.

![Gambar 4.1. Sketsa layar dashboard pemantauan](gbr/sketsa-dashboard.png)

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB. Sketsa menunjukkan susunan, bukan tampilan akhir.

## 4.2 Notifikasi hanya untuk kejadian baru

Notifikasi WhatsApp dikirim hanya untuk kandidat kejadian baru, yaitu sinyal "perlu dicek segera" yang belum cocok dengan kejadian mana pun di Buku Besar Kejadian. Penerimanya piket Pusdalops yang sedang bertugas. Satu kandidat kejadian hanya dikirim sekali, dan pesan tidak memuat nama akun warga.

Ada satu pengecualian: kejadian yang sudah tercatat dapat dikirim ulang bila kabar menyebut korban jiwa atau pengungsian yang belum ada di Buku Besar, paling banyak sekali per 6 jam per kejadian. Kabar seperti itu dapat mengubah tingkat penanganan dan sering muncul di media sosial lebih dulu.

Contoh isi notifikasi:

> Kandidat kejadian baru: banjir, Kabupaten Bekasi, Jawa Barat. Empat sumber berdiri sendiri sejak 14.20 WIB, dua di antaranya video dari lokasi. Data alam: hujan lebat menurut BMKG. Belum ada di Buku Besar Kejadian. Periksa di dashboard: tautan rincian sinyal.

# BAB 5 Manfaat

Tabel 5.1. Manfaat menurut pengguna

| Pengguna | Manfaat |
| --- | --- |
| Piket Pusdalops | Tahu lebih awal tentang kejadian yang belum dilaporkan, dengan kabar asli dan data alam di satu layar |
| BPBD | Dihubungi lebih cepat untuk konfirmasi, dengan gambaran awal lokasi dan kebutuhan warga |
| Pimpinan BNPB | Gambaran kejadian yang lebih utuh, termasuk kejadian di daerah yang laporannya terlambat |
| Pusdatinkom | Pemeriksaan silang antara laporan resmi dan kabar publik, serta ukuran seberapa sering kabar publik mendahului laporan |

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB.

Sistem ini juga memperkuat modul yang sudah ada. Cek Kabar Luar mendapat sumber tambahan untuk kejadian yang belum dilaporkan selesai, dan Buku Besar Kejadian mendapat kabar pendukung untuk kejadian yang sedang ditangani.

# BAB 6 Tata Kelola, Hukum, dan Risiko

## 6.1 Prinsip yang dipegang

1. Jalur resmi lebih dulu. API Meta, API X, dan RSS menjadi jalur utama. Halaman publik hanya ditarik tanpa login, tanpa mengakali verifikasi, dan dengan selang yang wajar.
2. Privasi sejak rancangan. Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi berlaku untuk nama akun, foto, dan lokasi orang. Kabar mentah disimpan paling lama 30 hari di penyimpanan internal, nama akun tidak masuk tabel olahan, dan tidak ada data warga di halaman publik.
3. Hormati hak cipta. Sistem hanya menyimpan judul, cuplikan, dan tautan ke laman asli, sesuai Undang-Undang Nomor 28 Tahun 2014 tentang Hak Cipta.
4. Akun atas nama lembaga. Semua akun dan kunci akses atas nama BNPB, dikelola Pusdatinkom, dan kunci tidak pernah ditulis di berkas.

## 6.2 Risiko dan penanganannya

Tabel 6.1. Risiko utama

| Risiko | Akibat | Penanganan |
| --- | --- | --- |
| Hoaks dan video lama | Sinyal palsu | Ambang tiga sumber yang tidak saling menyalin, data alam, dan keputusan piket |
| Bias kota dan Pulau Jawa | Daerah terpencil kurang terwakili | Media daerah, RRI, dan biro daerah ANTARA; jumlah kabar tidak dipakai untuk prioritas bantuan |
| Aturan atau harga platform berubah | Satu sumber berhenti | Penarik terpisah per sumber; portal berita sebagai tulang punggung |
| Notifikasi terlalu sering | Piket mengabaikan notifikasi | Notifikasi hanya untuk kejadian baru, sekali per kejadian, paling banyak 10 per jam |
| Penyalahgunaan data warga | Pelanggaran privasi | Tanpa nama akun di tabel olahan dan pesan; penyimpanan mentah 30 hari; akses hanya staf |

Sumber: rancangan Tim Ahli dan Tim Sus IT BNPB.

# BAB 7 Biaya

Biaya disusun dalam dua paket. Pengembangan dikerjakan swakelola oleh Tim Sus IT BNPB dan memakai bot WhatsApp yang sudah ada, sehingga tidak ada biaya satu kali.

Tabel 7.1. Biaya per bulan menurut paket (rupiah)

| Komponen | Paket Mulai | Paket Lengkap |
| --- | ---: | ---: |
| Akses X | 3.712.000 | 12.375.000 |
| Layanan penarik pihak ketiga | 0 | 7.408.000 |
| Model bahasa (klasifikasi dan ringkasan) | 2.841.000 | 7.218.000 |
| Server dan Cloudflare | 1.412.000 | 2.825.000 |
| Verifikator tambahan | 0 | 24.000.000 |
| Cadangan 10 persen | 796.000 | 5.383.000 |
| Jumlah per bulan | 8.761.000 | 59.209.000 |
| Jumlah per tahun | 105.132.000 | 710.508.000 |

Sumber: perhitungan Tim Ahli dan Tim Sus IT BNPB dengan kurs Rp16.500 per dolar Amerika Serikat; harga layanan per November 2026 perlu diperiksa ulang lewat penawaran resmi.

![Gambar 7.1. Komposisi biaya per bulan menurut komponen (juta rupiah)](gbr/komposisi-biaya.png)

Sumber: Tabel 7.1.

Paket Mulai memakai jalur gratis sebanyak mungkin dan piket Pusdalops yang sudah ada. Paket Lengkap menambah cakupan X dan layanan pihak ketiga untuk Instagram dan TikTok, serta empat verifikator khusus. Perluasan ke Paket Lengkap sebaiknya diputuskan sesudah keputusan piket dan uji balik menunjukkan manfaat Paket Mulai.

# Penutup

BNPB tidak perlu menunggu laporan resmi untuk mulai menyiapkan respons. Dengan memantau kabar publik secara teratur, mengubahnya menjadi sinyal yang dapat diperiksa, dan menyerahkan keputusan kepada piket, BNPB dapat tahu lebih awal tanpa mengorbankan ketepatan data resmi. Sebagian besar mesinnya sudah ada; yang dibutuhkan adalah keputusan untuk menyambungkannya.

Rincian teknis sistem ini dimuat dalam dokumen terpisah, Blueprint Sistem Pemantauan Kabar Kebencanaan.
