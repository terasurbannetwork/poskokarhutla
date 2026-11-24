# BAB 3 Hasil

Bab ini menjawab empat pertanyaan penelitian berurutan. Jawaban tiap subbab ada di kalimat pertamanya.

## 3.1 Semua sumber dapat dipantau, tetapi lewat jalur yang berbeda

Kelima platform dan portal berita dapat dipantau, tetapi hanya portal berita, Threads, dan Instagram yang punya jalur resmi tanpa biaya. X memungut biaya per post yang dibaca, dan TikTok tidak membuka API bagi lembaga di Indonesia.

Tabel 3.1. Jalur akses tiap platform per November 2026

| Platform | Jalur resmi | Batas utama | Biaya | Penilaian |
| --- | --- | --- | --- | --- |
| Instagram dan Reels | Pencarian tagar Instagram Graph API dengan akun Business atau Creator | 30 tagar unik per 7 hari per akun; perlu persetujuan Meta untuk akses konten publik | Gratis | Layak, terbatas pada tagar |
| Threads | Pencarian kata kunci dan tagar topik Threads API | Perlu izin pencarian kata kunci dari Meta; kuota kueri per 7 hari [BELUM TERVERIFIKASI] | Gratis | Layak, kuota perlu diuji |
| X | X API skema bayar per pemakaian | Harga dan kuota berubah beberapa kali pada 2026 | Sekitar US$0,005 per post dibaca | Layak, berbayar |
| TikTok | Research API hanya untuk peneliti universitas nirlaba di Amerika Serikat dan Eropa | Lembaga di Indonesia tidak memenuhi syarat | Tidak tersedia | Lewat halaman publik atau pihak ketiga |
| Portal berita | RSS portal, Google News RSS, GDELT DOC 2.0 | Hanya judul dan cuplikan; isi artikel dibaca di laman asli | Gratis | Paling layak |

Sumber: dokumentasi pengembang Meta, X, dan TikTok, serta ulasan pihak ketiga, dibuka 20 November 2026. Rincian di Daftar Pustaka.

Ada dua jalur tambahan. Pertama, Meta Content Library memberi akses arsip konten publik Facebook, Instagram, dan Threads kepada peneliti dari lembaga akademik atau lembaga riset yang memenuhi syarat. Jalur ini dapat dibuka lewat perguruan tinggi mitra BNPB, tetapi dirancang untuk riset, bukan pemantauan operasional. Kedua, layanan penarik pihak ketiga menjual hasil tarikan halaman publik dengan harga sekitar US$0,25 sampai US$5 per 1.000 hasil. Layanan itu memperluas cakupan, tetapi berada di wilayah abu-abu syarat layanan platform. Putusan pengadilan Amerika Serikat dalam perkara Meta melawan Bright Data (Januari 2024) menyatakan penarikan data publik tanpa login tidak melanggar syarat layanan Facebook dan Instagram, tetapi putusan itu tidak mengikat di Indonesia.

## 3.2 Portal berita tetap sumber yang paling andal

Portal berita adalah sumber paling andal karena isinya sudah disunting redaksi, menyebut lokasi, dan bertanggal jelas. Pipeline berita karhutla yang sudah berjalan membuktikannya: dalam 120 hari terakhir pipeline itu menghimpun 3.987 artikel dari 1.108 sumber, hanya dengan kueri karhutla.

Tabel 3.2. Kelompok portal berita dan cara menariknya

| Kelompok | Contoh | Cara tarik | Catatan |
| --- | --- | --- | --- |
| Kantor berita dan biro daerahnya | ANTARA dan biro provinsi | RSS resmi | Liputan daerah paling rata |
| Portal nasional | detikcom, Kompas.com, CNN Indonesia, Liputan6, Tempo, Tribunnews, MetroTVNews, Media Indonesia | RSS resmi bila ada, Google News RSS bila tidak | Paling cepat untuk kejadian besar |
| Radio dan televisi publik | RRI, TVRI | RSS atau Google News RSS | RRI menjangkau daerah terpencil |
| Media daerah | Pontianak Post, media daerah Riau, Kalimantan, Sulawesi | Google News RSS per kueri wilayah | Banyak yang tidak punya RSS |
| Kanal pemerintah dan aparat | Media center provinsi, situs berita Polri | RSS atau Google News RSS | Bukan media independen; diberi label tersendiri |
| Agregator global | Google News RSS, GDELT DOC 2.0 | Kueri per jenis bencana dan wilayah | GDELT diperbarui tiap 15 menit dalam 65 bahasa |
| Media asing | The Straits Times, The Star, CNA | Google News RSS edisi Inggris dan Melayu | Penting untuk asap lintas batas |

Sumber: keluaran pipeline berita karhutla per 20 November 2026; dokumentasi GDELT.

Lima sumber terbanyak pada data karhutla adalah detikcom (179 artikel), Kompas.com (173), RRI (160), ANTARA (115), dan MetroTVNews (104). Sisanya tersebar di lebih dari seribu sumber, sebagian besar media daerah. Artinya, daftar portal tetap tidak cukup; kueri per jenis bencana dan wilayah lewat agregator tetap diperlukan supaya media daerah ikut terjaring.

## 3.3 Rancangan sistem: tarik, olah, sinyal, periksa

Rancangan yang paling efektif memisahkan empat tugas: menarik kabar dari tiap sumber, mengolahnya menjadi kabar bersih, mengelompokkannya menjadi sinyal kejadian, dan menyerahkan sinyal itu kepada piket untuk diperiksa. Gambar 3.1 menunjukkan susunannya.

![Gambar 3.1. Arsitektur sistem pemantauan kabar kebencanaan](gbr/arsitektur.png)

Sumber: rancangan kajian ini.

Penarik berjalan terpisah per sumber, sehingga satu sumber yang gagal atau berubah aturan tidak menghentikan sumber lain. Kabar mentah disimpan di penyimpanan internal selama 30 hari dan tidak pernah dipublikasikan. Pengolah memakai ulang mesin yang sudah ada untuk berita karhutla, lalu menambah klasifikasi oleh model bahasa. Tabel 3.3 merinci langkahnya.

Tabel 3.3. Langkah pengolahan kabar

| Langkah | Isi | Sudah ada atau baru |
| --- | --- | --- |
| 1. Buang duplikat | Satu kabar yang dibagikan ulang atau dimuat banyak portal dihitung sekali | Sudah ada (kunci judul) |
| 2. Bahasa dan teks gaul | Mengenali bahasa Indonesia, Inggris, dan Melayu; mengubah singkatan seperti "gak" dan "bgt" | Sudah ada |
| 3. Saring relevan | Membuang kabar yang tidak menyangkut bencana, misalnya "banjir diskon" atau "gempa bumi" sebagai nama lagu | Sudah ada untuk karhutla; diperluas ke semua bencana |
| 4. Tentukan wilayah | Mencari nama provinsi, kabupaten, dan kecamatan dari teks dan tagar | Sudah ada |
| 5. Klasifikasi | Model bahasa (Claude Haiku 5.5) menentukan jenis bencana, apakah kabar itu laporan langsung atau kabar ulang, apakah kejadiannya baru, dan kebutuhan yang disebut | Baru |
| 6. Kelompokkan jadi sinyal | Kabar dengan jenis bencana dan kabupaten sama dalam jendela 3 jam digabung jadi satu sinyal kejadian | Baru |
| 7. Cocokkan dengan Buku Besar Kejadian | Sinyal yang cocok dengan kejadian terdaftar menjadi kabar pendukung; yang tidak cocok menjadi kandidat kejadian baru | Pencocok kejadian sudah ada |
| 8. Ringkas untuk piket | Model bahasa (Claude Sonnet 5.5) menulis ringkasan tiap 30 menit dari sinyal yang perlu dicek | Baru |

Sumber: telaah kode pipeline berita, TikTok, dan media sosial di repositori sistem Centurisk97.

Gambar 3.2 menunjukkan proses teknis satu siklus, dari pemicu terjadwal sampai keputusan piket, menurut komponen yang mengerjakannya. Setiap siklus berjalan tiap 15 menit (X tiap 5 menit). Kabar mentah disimpan di R2 dan dihapus sesudah 30 hari, sedangkan tabel kabar bersih di D1 tidak memuat nama akun. Klasifikasi memakai keluaran JSON terstruktur supaya setiap kabar punya kolom yang sama dan dapat dihitung. Keputusan piket disimpan kembali di D1 dan dipakai setiap bulan untuk menguji ambang sinyal.

![Gambar 3.2. Proses teknis satu siklus pemantauan menurut komponen](gbr/proses.png)

Sumber: rancangan kajian ini.

## 3.4 Model sinyal kejadian

Satu sinyal kejadian adalah kumpulan kabar dengan jenis bencana dan kabupaten yang sama dalam jendela 3 jam. Kuat lemahnya sinyal dinilai dari empat hal yang mudah dijelaskan:

1. jumlah sumber yang berdiri sendiri, yaitu akun atau portal berbeda yang mengabarkan kejadian yang sama. Kabar yang hanya membagikan ulang atau mengutip kabar lain dihitung satu sumber bersama kabar aslinya. Contohnya, dua warga mengunggah video banjir dari lokasi dan satu portal daerah memberitakannya: itu tiga sumber. Satu video yang dibagikan ulang seratus akun tetap satu sumber;
2. ada tidaknya laporan langsung, misalnya foto atau video yang diunggah dari lokasi;
3. ada tidaknya media berita atau akun instansi di antara sumbernya;
4. kecocokan dengan data alam, misalnya gempa BMKG di sekitar lokasi, *hotspot* satelit, atau hujan lebat.

Ambang awal yang diusulkan adalah: sinyal masuk daftar "perlu dicek segera" bila punya sedikitnya tiga sumber yang berdiri sendiri, atau satu media berita ditambah data alam yang cocok. Alasannya, satu kabar saja bisa berupa video lama atau hoaks, sedangkan tiga sumber yang tidak saling menyalin jauh lebih kecil kemungkinannya keliru bersamaan. Sinyal yang lebih lemah masuk daftar "pantau" dan diperbarui tiap kali kabar baru masuk. Ambang ini masih hipotesis dan baru boleh dipakai sebagai aturan sesudah diuji balik terhadap logbook Pusdalops.

## 3.5 Alur verifikasi: mesin memberi sinyal, manusia yang memutuskan

Tidak ada kabar media sosial yang langsung menjadi kejadian resmi. Gambar 3.3 menunjukkan alur keputusan dari satu sinyal sampai tindak lanjutnya.

![Gambar 3.3. Alur keputusan untuk satu sinyal kejadian](gbr/alur-verifikasi.png)

Sumber: rancangan kajian ini.

Piket Pusdalops memeriksa sinyal di layar yang memuat ringkasan, tautan ke kabar aslinya, peta lokasi, dan data alam di sekitarnya. Bila sinyal masuk akal, piket menghubungi BPBD setempat. Kejadian baru hanya dicatat sesudah BPBD atau sumber resmi lain mengonfirmasi. Keputusan piket (benar, salah, atau ganda) disimpan dan dipakai untuk menguji dan memperbaiki ambang sinyal.

## 3.6 Jeda 5 sampai 30 menit, dibatasi kuota sumber

Sistem ini dapat bekerja hampir *real time*, dengan jeda 5 sampai 30 menit dari kabar terbit sampai muncul di layar piket. Yang membatasi kecepatan adalah kuota dan aturan tiap sumber, bukan pengolahnya.

Tabel 3.4. Perkiraan jeda per sumber

| Sumber | Selang tarik | Jeda sampai layar piket | Pembatas |
| --- | --- | --- | --- |
| X | 5 menit | 5 sampai 10 menit | Biaya per post yang dibaca |
| Threads | 15 menit | 15 sampai 20 menit | Kuota kueri per 7 hari |
| Instagram dan Reels | 15 menit | 15 sampai 20 menit | 30 tagar unik per 7 hari |
| TikTok | 30 menit | 30 sampai 45 menit | Halaman publik dapat meminta login atau verifikasi |
| GDELT | 15 menit | 15 sampai 30 menit | Pembaruan GDELT tiap 15 menit |
| Google News RSS dan RSS portal | 15 menit | 15 sampai 30 menit | Jeda indeks Google News |

Sumber: dokumentasi platform; jadwal pipeline yang sudah berjalan. Jeda adalah perkiraan rancangan, belum diukur.

Karena Instagram dibatasi 30 tagar per 7 hari per akun, tagar harus dipilih hemat: tagar umum per jenis bencana (misalnya banjir, gempa, longsor, kebakaran hutan) dan tagar wilayah yang sedang punya kejadian aktif. Penarik TikTok tidak boleh mencoba mengakali login atau verifikasi; bila halaman meminta login, tarikan untuk tagar itu dicatat gagal dan dilewati.

## 3.7 Biaya: Rp8,8 juta per bulan untuk mulai

Biaya Paket Mulai sekitar Rp8,8 juta per bulan, atau Rp105 juta pada tahun pertama. Paket Lengkap sekitar Rp59,2 juta per bulan, atau Rp711 juta pada tahun pertama.

Tabel 3.5. Rencana anggaran biaya ringkas (rupiah)

| Komponen | Paket Mulai per bulan | Paket Lengkap per bulan |
| --- | ---: | ---: |
| Akses X | 3.712.000 | 12.375.000 |
| Layanan penarik pihak ketiga | 0 | 7.408.000 |
| Model bahasa (klasifikasi dan ringkasan) | 2.841.000 | 7.218.000 |
| Server dan Cloudflare | 1.412.000 | 2.825.000 |
| Verifikator tambahan | 0 | 24.000.000 |
| Cadangan 10 persen | 796.000 | 5.383.000 |
| Jumlah per bulan | 8.761.000 | 59.209.000 |
| Jumlah 12 bulan (tahun pertama) | 105.132.000 | 710.508.000 |

Sumber: perhitungan kajian ini dengan asumsi di Subbab 2.4. Rincian per butir di Lampiran A.

![Gambar 3.4. Komposisi biaya per bulan menurut komponen (juta rupiah)](gbr/komposisi-biaya.png)

Sumber: Tabel 3.5.

Pada Paket Mulai, porsi terbesar adalah akses X (42 persen). Pada Paket Lengkap, porsi terbesar adalah verifikator tambahan (41 persen). Biaya model bahasa relatif kecil: klasifikasi 20.000 kabar per hari dengan Claude Haiku 5.5 hanya sekitar Rp1,5 juta per bulan. Pengembangan dikerjakan Tim Sus IT BNPB secara swakelola, sehingga tidak dihitung sebagai biaya tambahan.

## 3.8 Ketepatan diukur dari keputusan piket, tanpa pelabelan terpisah

Ketepatan sistem tidak perlu diukur dengan pelabelan kabar terpisah sebelum sistem berjalan. Setiap notifikasi sudah diperiksa piket, sehingga kekeliruan klasifikasi tidak langsung masuk ke data resmi. Ketepatan diukur dari dua hal yang tersedia tanpa kerja tambahan:

1. keputusan piket (benar, salah, atau ganda) atas setiap sinyal, yang tersimpan otomatis di dashboard; dari sini terlihat persen sinyal yang benar per sumber dan per jenis bencana;
2. uji balik berita arsip terhadap logbook Pusdalops: apakah kejadian di logbook muncul sebagai sinyal, berapa jam lebih awal, dan berapa sinyal yang ternyata bukan kejadian.

Bila keputusan piket menunjukkan banyak sinyal salah pada satu jenis bencana atau satu sumber, ambang dan perintah klasifikasinya diperbaiki pada minggu berikutnya.

## 3.9 Dashboard pemantauan dan notifikasi kejadian baru

Hasil pemantauan disajikan di dua tempat: dashboard pemantauan untuk semua sinyal, dan notifikasi WhatsApp yang khusus untuk kandidat kejadian baru. Pemisahan ini menjaga notifikasi tetap jarang dan penting, sehingga piket tidak terbiasa mengabaikannya.

### 3.9.1 Dashboard pemantauan

Dashboard memuat semua sinyal, baik yang menyangkut kejadian baru maupun kejadian yang sudah ada di Buku Besar Kejadian. Gambar 3.5 adalah sketsa layarnya.

![Gambar 3.5. Sketsa layar dashboard pemantauan](gbr/sketsa-dashboard.png)

Sumber: rancangan kajian ini. Sketsa menunjukkan susunan, bukan tampilan akhir; tampilan akhir mengikuti sistem desain Centurisk97.

Tabel 3.6. Bagian dashboard dan isinya

| Bagian | Isi |
| --- | --- |
| Angka ringkas | Jumlah sinyal hari ini, kandidat kejadian baru yang menunggu diperiksa, sinyal yang sudah dikonfirmasi, dan jeda rata-rata dari kabar pertama sampai diperiksa |
| Peta sinyal | Titik per kabupaten, berwarna menurut status: kandidat kejadian baru, pantau, kabar pendukung kejadian yang sudah ada, dan terkonfirmasi |
| Antrean periksa | Daftar sinyal yang perlu diputuskan piket, kandidat kejadian baru di urutan teratas |
| Rincian sinyal | Ringkasan dari Claude Sonnet 5.5, daftar kabar asli dengan tautannya, data alam di sekitar lokasi, dan tombol keputusan: benar, salah, atau ganda |
| Rapor sumber | Jumlah kabar per sumber, sumber yang sedang gagal ditarik, dan persen sinyal benar per sumber |

Sumber: rancangan kajian ini.

### 3.9.2 Aturan notifikasi

Notifikasi WhatsApp dikirim hanya untuk kandidat kejadian baru, yaitu sinyal berstatus "perlu dicek segera" yang tidak cocok dengan kejadian mana pun di Buku Besar Kejadian. Kabar tentang kejadian yang sudah tercatat cukup tampil di dashboard sebagai kabar pendukung. Tabel 3.7 merinci aturannya.

Tabel 3.7. Aturan kirim notifikasi

| Aturan | Isi |
| --- | --- |
| Kapan dikirim | Sinyal lolos ambang "perlu dicek segera" dan tidak cocok dengan kejadian di Buku Besar Kejadian |
| Penerima | Piket Pusdalops yang sedang bertugas. BPBD dan pimpinan tidak menerima notifikasi dari sinyal yang belum diperiksa |
| Sekali per kejadian | Satu kandidat kejadian hanya dikirim sekali. Kabar baru tentang kandidat yang sama menambah isi dashboard, tidak mengirim pesan baru |
| Satu pengecualian | Kejadian yang sudah tercatat dapat dikirim ulang satu kali bila kabar menyebut korban jiwa atau pengungsian yang belum ada di Buku Besar, paling banyak sekali per 6 jam per kejadian |
| Batas kirim | Paling banyak 10 notifikasi per jam; sisanya digabung menjadi satu pesan ringkasan |
| Isi pesan | Jenis bencana, kabupaten, jumlah sumber, waktu kabar pertama, ada tidaknya data alam yang cocok, dan tautan ke rincian sinyal di dashboard. Tanpa nama akun warga dan tanpa isi kabar asli |
| Tindak lanjut | Piket memutuskan benar, salah, atau ganda di dashboard. Notifikasi yang belum diputuskan dalam 30 menit diingatkan sekali ke piket yang sama |

Sumber: rancangan kajian ini.

Contoh isi notifikasi:

> Kandidat kejadian baru: banjir, Kabupaten Bekasi, Jawa Barat. Empat sumber berdiri sendiri sejak 14.20 WIB, dua di antaranya video dari lokasi. Data alam: hujan lebat menurut BMKG. Belum ada di Buku Besar Kejadian. Periksa di dashboard: tautan rincian sinyal.

Pengecualian korban jiwa dan pengungsian dibuat karena kabar itu dapat mengubah tingkat penanganan kejadian yang sudah tercatat, dan sering muncul di media sosial lebih dulu daripada pemutakhiran laporan resmi. Pengecualian ini dibatasi satu kali per 6 jam supaya kejadian besar yang ramai dibicarakan tidak membanjiri piket.

## 3.10 Tahapan implementasi: berjalan dalam dua minggu

Paket Mulai dapat berjalan dalam dua minggu, dan seluruh tahapan selesai dalam empat minggu. Jadwal sependek ini mungkin karena pipeline berita, penarik TikTok, penentu wilayah, pencocok kejadian, dan bot WhatsApp sudah ada, dan karena pekerjaan dijalankan bersamaan, bukan berurutan. Satu-satunya hal di luar kendali BNPB adalah lama persetujuan izin dari Meta untuk Instagram dan Threads, sehingga izin itu diajukan pada hari pertama dan kedua sumber itu menyusul begitu izin turun. Gambar 3.6 menunjukkan urutannya.

![Gambar 3.6. Tahapan implementasi empat minggu](gbr/tahapan.png)

Sumber: rancangan kajian ini.

- Hari 1 sampai 2: keputusan pimpinan; akun Instagram Business resmi; pengajuan izin Meta untuk Instagram dan Threads serta pendaftaran X API; paket dokumen modul disusun bersamaan dengan pembangunan.
- Minggu 1: berita untuk semua jenis bencana dan TikTok mulai ditarik dengan pipeline yang sudah ada; klasifikasi oleh Claude Haiku 5.5.
- Minggu 2: sinyal kejadian, dashboard pemantauan versi awal, penarikan X, dan notifikasi WhatsApp kejadian baru ke piket; uji balik berita arsip satu sampai dua tahun dari GDELT dan Google News terhadap logbook Pusdalops. Pada akhir minggu ini Paket Mulai berjalan.
- Minggu 3 sampai 4: sistem berjalan berdampingan dengan piket; penyambungan ke Cek Kabar Luar dan rapor sumber di dashboard; Instagram dan Threads masuk begitu izin Meta turun; penilaian hasil dan keputusan perluasan ke Paket Lengkap pada akhir minggu keempat.

Uji balik dengan berita arsip memungkinkan penilaian dalam empat minggu, karena BNPB tidak perlu menunggu kejadian baru untuk menilai ketepatan sinyal dari berita. Media sosial tidak punya arsip murah, sehingga ketepatannya hanya dinilai dari dua minggu operasi. Bila hasil dua minggu itu belum meyakinkan, keputusan perluasan dapat ditunda tanpa menghentikan Paket Mulai.
