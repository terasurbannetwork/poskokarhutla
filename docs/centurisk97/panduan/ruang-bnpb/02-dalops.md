# Memakai Pantau Dalops

Pantau Dalops adalah halaman kerja utama untuk melihat kejadian yang sedang berjalan dan kabar lanjutannya.

## Pantau Dalops: centurisk97.id/bnpb/dalops

Dipakai untuk menindaklanjuti kabupaten/kota yang terdampak bencana. Perlu masuk sebagai staf Pusdalops, Koordalops, atau pimpinan; akun diurus oleh admin Centurisk97 di BNPB. Akun pemirsa hanya bisa melihat, tombol ubah disembunyikan. Data kejadian berasal dari catatan harian Pusdalops yang bersifat internal, sehingga tidak pernah ditampilkan ke publik.

Contoh: Anda piket banjir. Buka halaman Pantau Dalops, pilih tab Banjir, pilih periode Sepekan, lalu saring "Ada pengungsi". Hasilnya daftar kabupaten/kota yang sepekan ini punya kejadian banjir dengan pengungsi, lengkap dengan angka terakhir dari catatan piket.

Langkah umum:

1. Buka halaman Pantau Dalops. Di kiri ada daftar tab, dikelompokkan menjadi "Bencana" dan "Laporan".
2. Pilih tab, misalnya Banjir (tab yang terbuka lebih dulu), Karhutla, Longsor, Gunung Api, Gempa dan Tsunami, Cuaca Ekstrem, Kekeringan, Gelombang dan Abrasi, Kebakaran Permukiman, Kualitas Udara, Laporan Masuk, atau Laporan. Alamat di peramban ikut berubah, jadi tautannya bisa dikirim ke rekan.
3. Pilih periode di atas isi: Hari ini, 3 hari, Sepekan, 30 hari, atau pilih tanggal sendiri. Sebuah kejadian ikut tampil bila masa hidupnya, dari mulai sampai kabar terakhir, bersinggungan dengan periode yang dipilih.
4. Saring tabel menurut status, ada tidaknya pengungsi, ada tidaknya korban jiwa, atau level peringatan.
5. Unduh tabel lewat tombol Excel, CSV, PDF, atau PPT di tiap bagian.

Bagian yang ada di tab jenis bencana:

- Peta Pantauan dan Kondisi terkini: peta kabupaten/kota terdampak dan tabel yang bisa dibuka bertahap: mulai dari provinsi, lalu kabupaten/kota, sampai desa. Kolom angka yang tidak dilaporkan tampil strip.
- Penanganan dan bantuan: upaya yang dilakukan, pihak yang terlibat, kebutuhan, dan kendala menurut catatan piket.
- Kabar luar dan Kelengkapan data: gabungan semua bencana, bisa disaring menurut bencana, provinsi, dan kabupaten/kota. Kabar luar adalah berita dan data alam di luar laporan BPBD; kelengkapan data menunjukkan isian mana yang masih kosong.
- Tren kejadian: dua grafik, per tahun dan per periode.
- Status layanan: ringkasan kondisi layanan dasar (listrik, air, jalan, dan sejenisnya) di kejadian yang masih berjalan. Statusnya ditetapkan oleh staf yang berwenang, bukan oleh mesin. Abu-abu berarti belum ada bukti.
- Laporan warga: laporan dari Lapor Bencana yang masih berjalan, dikelompokkan per kejadian. Laporan ini belum diverifikasi, bukan data resmi, dan antarlaporan tidak dijumlahkan.
- Usulan langkah (tab Banjir): langkah yang disarankan untuk BPBD per kabupaten/kota, dengan kolom Status yang bisa diisi staf.
- Peringatan dini: kabupaten/kota berstatus Siaga atau Awas (level 2 ke atas) menurut prakiraan, lengkap dengan tombol pesan WhatsApp. Kabupaten/kota yang baru Waspada tidak masuk daftar ini.

Arti tanda yang sering muncul:

| Tanda | Artinya |
| --- | --- |
| Masih berlangsung | Ada kabar dari luar sesudah laporan resmi terakhir. Ini bukan penutupan kejadian. |
| Kemungkinan selesai | Ada berita bahwa keadaan pulih, atau (untuk jenis bencana yang punya data alam) data alam sudah normal selama beberapa hari. Kejadian tetap terbuka. |
| Belum ada kabar luar | Tidak ada bukti dari luar. Ini tidak berarti kejadian sudah selesai. |
| Strip pada kolom hari tanpa kabar | Tidak diketahui, bukan nol hari. |
| Label "hipotesis" atau "belum diuji balik" | Angka hasil model buatan sendiri yang belum terbukti cukup tepat. |

Tombol WhatsApp membuka WhatsApp dengan teks yang sudah terisi, atau menyalin teks itu supaya bisa ditempel sendiri. Ada tiga pola pesan: permintaan pembaruan data, permintaan konfirmasi bahwa kejadian sudah selesai, dan pesan peringatan dini. Pesan konfirmasi tidak meneruskan isi berita. Pesan gabungan hanya memuat 40 baris pertama; untuk daftar lengkap, unduh tabel lewat tombol Excel di bagian yang sama.

Tiga hal yang sering disalahpahami:

- Kabar luar tidak pernah menutup kejadian. Penutupan hanya dari laporan resmi.
- Luas karhutla dan jumlah yang belum padam hanya diambil dari sistem Centurisk97, tidak dari teks WhatsApp. Luas harian sudah mencakup luas hari-hari sebelumnya, jadi layar menampilkan luas hari terakhir, bukan jumlah dari semua hari.
- Rekap WhatsApp bertanggal 24 November memuat catatan piket dari 23 November pukul 07.00 sampai 24 November pukul 07.00 WIB. Jadi isinya sebagian besar kejadian hari sebelumnya.

### Tab Laporan Masuk

Tab ini memantau rekap WhatsApp Koordalops pukul 07.00 WIB. Isinya kartu Rekap harian (tujuh hari terakhir), Perlu ditagih (kejadian terbuka yang tidak muncul di rekap hari itu, sehingga perlu diminta melapor), Kejadian baru, Pengkinian, dan Data BPBD. Warna menunjukkan berapa lama kejadian tidak muncul di rekap:

| Lama tidak muncul | Tanda |
| --- | --- |
| Kurang dari 3 hari | Kuning |
| 3 sampai 7 hari | Merah |
| Lebih dari 7 hari | Usul tutup |

Tab ini tidak memuat teks dampak, luas, atau titik panas.

### Tab Gunung Api

Tampil satu kartu untuk setiap gunung berstatus Siaga dan Awas. Isi kartu:

- Diagram lingkaran dengan jarak 5, 10, dan 15 km dari puncak.
- Radius yang direkomendasikan PVMBG untuk gunung itu (angkanya dari PVMBG, tidak dihitung ulang di sini).
- Arah sektor yang terdampak, serta perkiraan penduduk dan sarana di tiap jarak.

Contoh membaca: pada gunung berstatus Siaga, lihat berapa penduduk di dalam lingkaran 5 km, lalu cocokkan dengan radius rekomendasi PVMBG untuk menentukan siapa yang perlu dihubungi lebih dulu. Level yang tampil adalah level resmi PVMBG apa adanya, tidak ditafsir ulang.

### Tab Data Bencana

Sama dengan halaman Data Bencana Indonesia (lihat di bawah), ditambah kejadian catatan piket yang masih berlangsung sebagai titik di peta dan kartu Rekonsiliasi tiga sumber, yaitu pencocokan data resmi DIBI, catatan piket, dan laporan Lapor Bencana yang sudah diverifikasi BPBD.
