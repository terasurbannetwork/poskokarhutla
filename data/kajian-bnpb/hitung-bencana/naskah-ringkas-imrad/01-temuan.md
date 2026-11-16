# BAB 1 Temuan

Bab ini menjawab ketiga pertanyaan penelitian secara berurutan. Subbab 1.1 menjawab pertanyaan pertama: seberapa besar jumlah kejadian berubah bila cara menghitungnya berubah. Jawabannya besar, dan perubahan itu terjadi pada semua sumber data yang kita periksa. Subbab 1.2 menjawab pertanyaan kedua: apakah enam kriteria Petunjuk Pelaksanaan (Juklak) BNPB Nomor 7 Tahun 2023 menyaring kejadian secara terukur dan setara antarjenis bencana. Jawabannya tidak. Subbab 1.3 menjawab pertanyaan ketiga: apakah aturan hitung baru membuat angka lebih stabil dan bermakna. Jawabannya ya, dengan syarat. Semua angka di bab ini berasal dari data nyata dan perhitungan ulang kita; periode dan sumber tiap angka disebut di bawah tabel atau gambarnya.

## 1.1 Jumlah kejadian berubah besar bila cara menghitungnya berubah

Jumlah kejadian karhutla berubah 2,2 kali lipat hanya karena kita memilih jarak dan batas waktu penggabungan yang berbeda. Jumlah kejadian logbook Pusdalops berubah 27 persen, dari 2.809 (cara tanpa tanggal kejadian) sampai 3.860 (cara dengan tanggal kejadian), hanya karena kita memilih cara mencocokkan baris harian logbook. Pada data yang sama, tidak ada satu pun jumlah yang bisa disebut benar. Angkanya selalu ikut aturan hitung yang dipakai. Empat bagian berikut menunjukkan hal itu pada data *hotspot* karhutla, pada cara mencocokkan baris logbook, pada angka kumulatif logbook, dan pada Data dan Informasi Bencana Indonesia (DIBI).

### 1.1.1 Karhutla: dari 27.322 sampai 61.138 kejadian pada data yang sama

Dari data *hotspot* satelit yang sama, jumlah kejadian karhutla berkisar 27.322 sampai 61.138, atau 2,2 kali lipat, tergantung jarak gabung (0,5, 1, atau 2 kilometer) dan selisih waktu paling lama (24 atau 72 jam). Kita menguji ini pada 295.488 deteksi *hotspot* VIIRS dengan keyakinan nominal dan tinggi. Periodenya 28 hari, yaitu 15 Oktober sampai 11 November 2026, dan hanya daratan Indonesia yang dihitung. Dua deteksi kita anggap satu kejadian bila jaraknya tidak lebih dari batas gabung dan selisih waktunya tidak lebih dari batas waktu. Deteksi yang terhubung berantai juga ikut satu kejadian.

Tabel 1.1. Jumlah kejadian karhutla menurut jarak gabung dan selisih waktu (15 Oktober sampai 11 November 2026)

| Jarak gabung | Selisih waktu 24 jam | Selisih waktu 72 jam |
| --- | ---: | ---: |
| 0,5 km | 61.138 | 50.039 |
| 1 km | 49.088 | 37.953 |
| 2 km | 38.963 | 27.322 |

Sumber: simulasi kita atas data FIRMS VIIRS, 295.488 deteksi.

![Gambar 1.1. Jumlah kejadian karhutla menurut jarak gabung dan selisih waktu](gbr/i-gabung-karhutla.png)

Sumber: sama dengan Tabel 1.1.

Bila selisih waktu 6 jam ikut dihitung, rentangnya melebar menjadi 3,4 kali lipat, dari 27.322 sampai 94.091. Kita tidak memakai angka 6 jam sebagai pembanding karena satelit hanya melintas di atas lokasi yang sama dengan jeda 12 sampai 24 jam. Api yang sama tampak seperti padam lalu menyala lagi, sehingga pada jendela 6 jam antara 52 dan 71 persen kejadian tampak sebagai api yang menyala lagi. Jeda tengahnya hanya 23,6 jam, mengikuti jadwal lintasan satelit dan bukan perilaku api. Selisih waktu yang masuk akal karena itu paling sedikit 24 jam.

Kejadian karhutla kecil sekali ukurannya. Pada pilihan acuan (jarak 1 kilometer, selisih 24 jam), 57,4 persen kejadian hanya satu piksel satelit, dan 52,8 persen hanya satu titik. Satu piksel mewakili 14,06 hektare. Akibatnya, kriteria luas 1 hektare dan 10 hektare tidak menyaring apa pun pada data satelit: semua 49.088 kejadian lolos. Baru pada 50 hektare jumlahnya turun menjadi 7.714 (15,7 persen), dan pada 100 hektare menjadi 2.869 (5,8 persen).

Urutan penerapan syarat juga mengubah hasil. Bila kita membuang kelompok api kecil harian lebih dulu lalu menggabungkan sisanya, pada syarat 50 hektare kita memperoleh 6.771 kejadian. Bila kita menggabungkan dulu lalu membuang yang kecil, hasilnya 7.714. Selisihnya 12,2 persen, dan pada syarat 100 hektare menjadi 20,4 persen (2.284 lawan 2.869). Menyaring lebih dulu membuang api yang tumbuh pelan dan kelompok kecil yang menjadi jembatan antara dua api besar.

Dua api yang menyatu menjadi satu kejadian memang ada, tetapi jarang. Contohnya di Kapuas, Kalimantan Tengah, pada 17 sampai 26 Oktober 2026. Dua kelompok api (116 dan 19 piksel) pada awalnya berjarak 8,9 kilometer. Dalam lebih dari satu hari keduanya bertemu dan menjadi satu kejadian seluas 690 piksel, setara sekitar 9.703 hektare menurut perkiraan satelit, dengan 4.434 *hotspot*. Contoh lain terjadi di Muaro Jambi pada 18 sampai 24 Oktober. Kejadian seperti ini hanya 0,28 persen dari semua kejadian pada pilihan acuan (135 dari 49.088). Aturan penggabungan itu sendiri jauh lebih berpengaruh daripada api yang menyatu.

Satu api juga bisa dihitung dua atau lebih oleh pemerintah daerah. Kejadian terbesar pada data ini membentang di Seruyan dan Kotawaringin Barat, Kalimantan Tengah: 1.217 piksel (sekitar 17.114 hektare) dengan 2.741 titik di Seruyan dan 1.129 titik di Kotawaringin Barat. Satu api itu menjadi urusan dua bupati dan dua BPBD, dengan laporan sendiri-sendiri.

### 1.1.2 Logbook Pusdalops: 27 persen selisih menurut cara mencocokkan laporan

Jumlah kejadian logbook Pusdalops Januari sampai Oktober 2026 berkisar 2.809 sampai 3.860, atau berbeda 27 persen, hanya karena kita memilih unsur yang dipakai untuk mencocokkan baris harian. Angka 3.860 datang dari cara yang memakai tanggal kejadian (Cara 1), dan 2.809 dari cara yang mengabaikan tanggal (Cara 3). Tanpa pencocokan sama sekali (Cara 5), jumlahnya 8.715, lebih dari dua kali lipat jumlah pada Cara 1. Logbook ditulis ulang setiap hari, sehingga satu kejadian yang berlangsung lebih dari satu hari muncul sebagai 2 baris atau lebih. Kita harus menentukan baris mana yang dianggap kejadian yang sama, dan cara menentukannya adalah *deduplication key* (Subbab 2.2).

Kita menguji lima cara (Tabel 2.2) pada 9.329 baris harian dari 302 hari laporan (1 Januari sampai 29 Oktober 2026). Baris yang tidak bisa dibaca mesin karena tidak memuat tanggal atau provinsi sebanyak 1.461, dan kita lewati.

Tabel 1.2. Jumlah kejadian logbook menurut cara mencocokkan baris harian (Januari sampai Oktober 2026)

| Cara mencocokkan | Jumlah kejadian | Lolos tiga kriteria dampak Juklak |
| --- | ---: | ---: |
| Cara 1: jenis, provinsi, kabupaten, dan tanggal kejadian sama | 3.860 | 924 |
| Cara 2: sama dengan Cara 1, kabupaten yang bersinggungan digabung | 3.756 | 914 |
| Cara 3: jenis, provinsi, dan kabupaten sama; jeda antarlaporan paling lama 7 hari; tanggal diabaikan | 2.809 | 865 |
| Cara 4: jenis, provinsi, dan tanggal sama; kabupaten diabaikan | 2.913 | 793 |
| Cara 5: tanpa pencocokan, setiap baris harian dihitung | 8.715 | 2.865 |

Sumber: logbook Pusdalops 2026, perhitungan ulang kita. Kolom terakhir menghitung kejadian yang lolos sedikitnya satu dari tiga kriteria dampak Juklak yang dapat diuji: ada korban meninggal, minimal 50 orang terdampak, atau minimal 5 rumah atau fasilitas rusak. Ini bukan syarat masuk hitungan aturan usulan, yang hasilnya ada di Tabel 1.6.

Pada Cara 3, 1.256 kejadian dilaporkan lebih dari satu hari, dan 464 di antaranya (36,9 persen) ditulis dengan tanggal kejadian berbeda dari satu hari ke hari berikutnya. Cara yang memakai tanggal kejadian (Cara 1 dan 2) karena itu memecah satu kejadian menjadi 2 kejadian atau lebih. Cara yang mengabaikan kabupaten (Cara 4) sebaliknya menyatukan kejadian yang berbeda kabupaten di provinsi dan hari yang sama. Setiap cara salah dengan caranya sendiri, sehingga memilih satu cara tanpa aturan tertulis berarti memilih jumlah.

Selain jumlah kejadian, laporan susulan mengubah penilaian. Angka 975 datang dari Cara 1 yang diterapkan pada seluruh 9.329 baris, yaitu 3.935 kejadian termasuk yang bertanggal di luar Januari sampai Oktober. Karena itu angkanya lebih besar daripada 924 di Tabel 1.2. Dari 975 kejadian yang akhirnya lolos tiga kriteria dampak Juklak, 124 (12,7 persen) belum lolos pada laporan pertama. Penyebab utamanya adalah jumlah orang terdampak yang baru naik di laporan berikutnya (87 kejadian). Bila syarat hanya diterapkan pada laporan hari pertama, satu dari delapan kejadian yang layak akan terlewat. Laporan susulan juga bisa menurunkan angka. Dari 1.349 kejadian Cara 1 yang muncul lebih dari satu hari, 157 (11,6 persen) pernah turun di salah satu dari empat angka dampak: meninggal dan hilang, jiwa terdampak, jiwa terdampak ditambah mengungsi dan luka, atau rumah rusak.

### 1.1.3 Angka kumulatif: menjumlahkan antarhari menggelembungkan dampak 8,5 sampai 30 kali

Menjumlahkan angka dampak antarhari memberi 12.523 korban meninggal, padahal nilai terbesar per kejadian hanya memberi 609. Logbook menulis angka kumulatif: laporan hari ketiga memuat angka hari pertama ditambah tambahan baru. Bila angka tiap hari kita jumlahkan, angka yang sama terhitung berulang kali.

Tabel 1.3. Dampak logbook Januari sampai Oktober 2026 menurut cara menghitung (cara mencocokkan: jenis, provinsi, kabupaten, tanggal)

| Cara menghitung dampak | Korban meninggal | Jiwa terdampak | Rumah rusak berat atau setaranya |
| --- | ---: | ---: | ---: |
| Menjumlahkan semua laporan | 12.523 | 27.569.899 | 3.555.343 |
| Nilai terbesar per kejadian | 609 | 3.234.369 | 120.116 |
| Nilai laporan terakhir per kejadian | 565 | 3.000.534 | 44.938 |

Sumber: logbook harian Pusdalops 2026. Angka dampak diurai dari teks bebas oleh mesin dan belum divalidasi satu per satu. Rumah rusak berat atau setaranya dihitung dengan rumah rusak sedang setengah dan rumah rusak ringan seperempat.

Penjumlahan melipatgandakan korban meninggal sekitar 20 kali, jiwa terdampak 8,5 kali, dan rumah 30 kali. Nilai laporan terakhir lebih rendah daripada nilai terbesar: 7 persen untuk korban meninggal dan jiwa terdampak, dan 63 persen untuk rumah, karena laporan berikutnya sering menurunkan angka yang semula diperkirakan terlalu tinggi. Angka dampak kejadian logbook karena itu perlu satu aturan tertulis dan penyebutan versi angkanya (nilai terbesar atau laporan terakhir).

### 1.1.4 DIBI: satu gempa tercatat di 11 kabupaten, masing-masing 0,091 kejadian

DIBI memuat 643 baris (4,0 persen dari 15.974 baris yang kita tarik) dengan jumlah kejadian berupa pecahan, bukan bilangan bulat. Contoh paling jelas adalah gempa di Nusa Tenggara Timur pada 15 Agustus 2026. DIBI mencatatnya di 11 kabupaten, masing-masing sebagai 0,091 kejadian. Pada 220 dari 286 kelompok baris berpecahan, jumlah pecahannya tepat satu. Jadi DIBI diduga membagi satu kejadian ke kabupaten yang terdampak. Arti resmi pecahan ini belum dikonfirmasi oleh Pusdatinkom.

Pecahan itu membuat jumlah kejadian bergantung pada tingkat yang dihitung. Juklak 7/2023 menghitung kejadian lintas kabupaten satu kali di tingkat nasional dan satu kali per kabupaten di tingkat kabupaten, tetapi tidak menyebut di tingkat mana syarat masuk hitungan diuji. Bila diuji per kabupaten, kabupaten yang hanya mengalami 3 rumah rusak tidak masuk. Bila diuji pada gempa utuh, semua kabupaten terdampak ikut tercatat. Peraturan lama (Peraturan Kepala BNPB 8/2011) menghitung satu kejadian. Satu gempa karena itu dapat terhitung 1, 11, atau 0,091 kali, tergantung siapa yang menghitung dan di tingkat mana.

## 1.2 Enam kriteria Juklak tidak terukur dan tidak setara antarjenis bencana

Kriteria terdampak (minimal 50 orang) menjadi satu-satunya alasan lolos bagi 51,1 persen catatan DIBI yang lolos dalam 12 bulan terakhir. Kekeringan lolos 94,6 persen sedangkan karhutla hanya 1,4 persen, dan satu persen baris DIBI memikul 85,5 persen korban meninggal. Tiga angka itu menunjukkan bahwa enam kriteria tidak bekerja sama kuatnya untuk semua jenis bencana dan tidak mengukur besar kecilnya bencana. Bagian ini membedah kriteria satu per satu, lalu menunjukkan akibatnya pada data.

### 1.2.1 Bunyi kriteria dan penilaian kajian

Dari enam kriteria, satu kita pertahankan, dua kita revisi, satu kita ganti dengan ukuran lain, dan dua kita jadikan penanda saja. Juklak 7/2023 Bab II huruf B angka 3 menetapkan bahwa sebuah kejadian masuk hitungan bila memenuhi sedikitnya satu dari enam kriteria. Juklak menetapkan kapan sesuatu masuk hitungan, tetapi tidak mendefinisikan apa yang dihitung sebagai satu kejadian. Kata "kejadian" tidak ada di antara sepuluh pengertian di Bab I. Asal-usul angka 1 orang, 50 orang, 5 unit, dan 1 hektare juga tidak kita temukan di dokumen mana pun yang kita periksa.

Tabel 1.4. Bunyi enam kriteria dan penilaian kajian

| Kriteria | Penilaian | Alasan dari data |
| --- | --- | --- |
| Korban meninggal: 1 orang | Pertahankan, perjelas | Penentu tunggal hanya pada 106 dari 1.903 baris yang lolos (5,6 persen). Kematian adalah dampak paling pasti. Perlu aturan penyebab: hanya kematian langsung akibat bahaya. |
| Terdampak, luka, atau mengungsi: 50 orang | Revisi | Penentu tunggal pada 51,1 persen catatan DIBI yang lolos. Definisi terdampak berbeda antara Juklak 7/2023 dan Juklak 3/2022. |
| Rumah atau fasilitas publik rusak: 5 unit | Revisi | Tingkat kerusakan tidak disebut. Dari 273 baris yang lolos hanya karena kriteria ini, 212 baris hanya 5 sampai 9 unit dan 28 baris tanpa korban sama sekali. |
| Lahan: 1 hektare | Ganti | Tidak bisa diuji karena DIBI tidak punya kolom luas. Satu piksel satelit sudah 14,06 hektare. Bunyinya tidak membedakan jenis lahan dan tidak menyebut kerusakan. |
| Permintaan bantuan nasional | Jadi penanda | Ukuran respons pemerintah, bukan ukuran dampak. Tidak terdefinisi bentuk dan buktinya, dan tidak tercatat di DIBI. |
| Status keadaan darurat | Jadi penanda | Melingkar, karena sesuatu menjadi bencana sebab dinyatakan bencana. Hanya 25,7 persen kejadian logbook yang mengisi status. |

Sumber: Juklak 7/2023 dan uji kita pada 4.185 baris DIBI (13 November 2025 sampai 12 November 2026), `analisis/hasil/uji_kriteria.json`. Teks Juklak kita baca dari salinan tidak resmi sehingga kutipannya masih perlu dicocokkan dengan salinan resmi.

Penjelasan tiap penilaian ada di subbab berikut. Logika "salah satu cukup" (ATAU) kita pertahankan. Bila ketiga kriteria dampak (korban meninggal, terdampak, kerusakan) harus terpenuhi sekaligus, baris yang lolos turun 96,5 persen, dari 1.903 menjadi 67. Cara itu membuang kejadian yang memang perlu dicatat, misalnya longsor yang menimbun orang di kebun tanpa merusak rumah. Kolom yang kita tambahkan ialah "alasan masuk hitungan", yaitu catatan syarat mana yang memicu sebuah kejadian masuk hitungan, supaya dapat diaudit.

### 1.2.2 Kriteria terdampak menjadi penentu tunggal bagi separuh kejadian

Dari 1.903 baris DIBI yang lolos dalam 12 bulan terakhir, 973 baris (51,1 persen) lolos hanya karena memenuhi kriteria terdampak, minimal 50 orang. Persentase ini dihitung terhadap baris yang lolos, bukan terhadap semua kejadian. Kita memakai 4.185 baris DIBI untuk periode 13 November 2025 sampai 12 November 2026. Satu baris adalah satu kombinasi hari, kabupaten, dan jenis bencana. Dari semua baris, 1.903 (45,5 persen) memenuhi sedikitnya satu dari tiga kriteria yang bisa diuji di DIBI, yaitu korban meninggal, terdampak, dan kerusakan. Tiga kriteria lain tidak bisa diuji karena DIBI tidak menyimpan luas lahan, permintaan bantuan, dan status darurat.

![Gambar 1.2. Kriteria yang membuat baris DIBI lolos (persen dari 1.903 baris yang lolos)](gbr/r-penentu-tunggal.png)

Sumber: tarikan DIBI 12 November 2026, 4.185 baris untuk 12 bulan, `analisis/hasil/uji_kriteria.json`.

Definisi terdampak paling kabur di antara semua istilah. Juklak 7/2023 mendefinisikannya sebagai orang yang menderita akibat dampak buruk bencana tetapi masih dapat menempati tempat tinggalnya. Juklak 3/2022 tentang pengkajian cepat tidak memakai frasa "masih dapat menempati tempat tinggalnya". Di lapangan, laporan logbook mencampur "jiwa berpotensi terdampak" dan "rumah terendam". Tanda garis miring pada "terkena dampak/luka/mengungsi" juga tidak menyatakan apakah ketiganya dijumlahkan, sehingga satu orang yang terluka dan mengungsi dapat terhitung dua kali. Kriteria yang paling kabur ternyata menentukan masuk atau tidaknya separuh kejadian.

### 1.2.3 Kekeringan lolos 94,6 persen, karhutla hanya 1,4 persen

Satu set angka batas yang sama meloloskan 94,6 persen baris kekeringan tetapi hanya 1,4 persen baris karhutla. Selisih ini menunjukkan bahwa angka batas tidak setara antarjenis bencana.

![Gambar 1.3. Persen baris DIBI yang lolos menurut jenis bencana (12 bulan)](gbr/r-lolos-jenis.png)

Sumber: tarikan DIBI 12 November 2026, `analisis/hasil/uji_kriteria.json`. Jumlah baris: kekeringan 129, gelombang pasang dan abrasi 21, banjir 1.188, gempa bumi 60, cuaca ekstrem 922, kebakaran permukiman 188, erupsi gunung api 14, tanah longsor 431, karhutla 1.208.

Kekeringan lolos hampir seluruhnya lewat kriteria terdampak (122 dari 129 baris). Kekeringan tidak menimbulkan korban jiwa atau rumah rusak pada data ini; yang tercatat adalah penduduk terdampak, dengan nilai tengah 3.600 orang per baris. Angka batas 50 orang hampir tidak menyaring apa pun. Bila angka batas dinaikkan sepuluh kali, ke 500 orang, baris kekeringan yang lolos hanya turun dari 122 ke 105. Panduan Laporan Kejadian Menonjol Pusdalops sudah memakai angka batas lebih tinggi untuk kekeringan, yaitu 200 kepala keluarga atau 800 orang.

Karhutla sebaliknya. Dari 1.208 baris karhutla, hanya 1,4 persen memenuhi tiga kriteria yang bisa diuji, dan 98,7 persen dari 3.646 baris karhutla DIBI 2024 sampai 2026 tidak memuat dampak apa pun. Namun, 1.129 baris karhutla dalam 12 bulan bertanda bencana di DIBI, dan 1.113 di antaranya tidak memenuhi satu pun dari tiga kriteria itu. Dugaan terkuat kita: karhutla masuk lewat kriteria luas lahan, permintaan bantuan, atau status darurat yang tidak tercatat di DIBI. Dugaan ini belum bisa diuji dan perlu dikonfirmasi ke Pusdatinkom. Pembaca DIBI karena itu tidak bisa memeriksa mengapa suatu karhutla dianggap bencana.

Jenis lain berada di antara keduanya. Banjir lolos 76,6 persen, terutama lewat kriteria terdampak (717 baris sebagai penentu tunggal). Cuaca ekstrem lolos 56,3 persen dan sebagian besar lewat kerusakan rumah (178 baris), sehingga lima rumah rusak ringan akibat angin dihitung sama dengan lima rumah roboh akibat gempa. Pembagian kejadian ke dalam 13 jenis ancaman juga tidak punya jenis kabut asap, sehingga dampak asap di provinsi yang terkena asap tetapi tidak terbakar tidak punya tempatnya.

### 1.2.4 Angka batas sangat peka terhadap pilihan, dan angka yang berbeda tidak otomatis lebih benar

Mengubah angka batas menggeser jumlah baris yang lolos dari 787 sampai 2.484 pada tujuh skenario angka, dibandingkan 1.903 pada angka Juklak. Skenario terendah menaikkan batas korban meninggal ke 10 orang, terdampak ke 500 orang, dan unit rusak ke 50 unit. Skenario tertinggi menurunkan batas terdampak ke 10 orang dan unit rusak ke 1 unit.

![Gambar 1.4. Jumlah baris DIBI yang lolos bila angka batas diubah (12 bulan)](gbr/r-kepekaan-ambang.png)

Sumber: tarikan DIBI 12 November 2026, `analisis/hasil/uji_kriteria.json`. Tiga angka dalam kurung adalah batas korban meninggal, terdampak, dan unit rusak.

Dua angka paling peka. Kriteria rumah dan fasilitas rusak berubah paling banyak di sekitar 5 sampai 10 unit: 792 baris pada 5 unit dan 540 baris pada 10 unit, atau turun 32 persen. Kriteria terdampak bergeser sekitar 20 persen antara 50 dan 100 orang (1.512 lawan 1.207 baris). Untuk korban meninggal, menaikkan angka batas dari 1 ke 3 orang menurunkan jumlah baris 70 persen (217 menjadi 65). Bila kita memakai aturan EM-DAT, *database* bencana dunia (minimal 10 meninggal atau 100 terdampak), baris yang lolos turun 36,3 persen menjadi 1.212. EM-DAT memilih bencana yang penting bagi dunia, sedangkan DIBI hendak mencatat bencana yang penting bagi kabupaten, sehingga angka yang lebih rendah di Indonesia masuk akal. Masalahnya, angka itu kita turunkan tanpa penyesuaian per jenis bencana, seperti yang terlihat pada subbab 1.2.3.

Angka batas disebut benar bila ia memisahkan kejadian yang memerlukan perhatian pemerintah dari yang tidak. Untuk menilai itu kita butuh pembanding berupa daftar kejadian yang memicu status darurat atau dana siap pakai, dan pembanding itu belum ada di data kita. Tanpa pembanding, menaikkan atau menurunkan angka hanya membuat jumlah kejadian lebih kecil atau lebih besar (787 sampai 2.484 baris pada Gambar 1.4).

### 1.2.5 Kriteria administratif mengukur respons daerah, bukan dampak

Permintaan bantuan nasional dan status keadaan darurat mengukur respons pemerintah daerah, bukan dampak bencana, dan keduanya tidak dapat diperiksa dari DIBI. Ada empat masalah.

1. Melingkar. Undang-Undang 24 Tahun 2007 Pasal 51 menyatakan bahwa status ditetapkan sesuai dengan skala bencana, jadi status seharusnya akibat dari penilaian dampak dan tidak boleh menggantikannya.
2. Bergantung pada kapasitas dan kemauan daerah. Kabupaten yang mampu menangani sendiri mungkin tidak meminta bantuan dan tidak menetapkan status, sehingga dua kejadian dengan dampak sama bisa berbeda nasib pencatatannya.
3. Status payung dan status pendahulu. Status siaga darurat karhutla provinsi lazim berlaku berbulan-bulan dan diperpanjang. Selama itu setiap api kecil secara harfiah memenuhi kriteria status darurat. Status siaga juga ditetapkan sebelum dampak terjadi, jadi kriteria bisa terpenuhi sebelum ada kejadian.
4. Tidak terdefinisi. Juklak tidak menyebut bentuk, saluran, atau bukti permintaan, dan rujukan pedoman penetapan status tidak bernomor.

Kedua kriteria tetap berguna untuk menangkap kejadian yang dampaknya belum terdata tetapi jelas ditangani negara (hanya 25,7 persen kejadian logbook yang mengisi status). Kita mempertahankan fungsi itu tanpa menjadikan ukuran respons sebagai ukuran dampak: status dan permintaan bantuan dicatat sebagai penanda pada kejadian, lengkap dengan nomor dokumennya. Jalur masuk administratif cukup satu: surat keputusan tanggap darurat yang menyebut kejadian tertentu.

### 1.2.6 Satu persen baris memikul 85,5 persen korban meninggal

Satu persen baris DIBI teratas (41 baris) memikul 85,5 persen dari 1.897 korban meninggal dalam 12 bulan, dan 94,8 persen baris tidak memuat satu pun korban meninggal. Logika "salah satu cukup" memberi bobot sama pada kejadian yang sangat berbeda: banjir Aceh Utara pada 28 November 2025 (246 meninggal, 739.710 terdampak, 91.286 rumah rusak) bernilai satu kejadian, sama dengan sebuah baris yang mencatat tepat satu orang meninggal. Ada 71 baris yang lolos hanya karena tepat satu orang meninggal tanpa kerusakan dan tanpa 50 terdampak. Juklak tidak mengatur penyebabnya, sehingga seseorang yang tersambar petir atau tenggelam saat hujan dapat memenuhi kriteria.

![Gambar 1.5. Bagian dampak yang berasal dari baris DIBI teratas (persen dari total, 12 bulan)](gbr/r-konsentrasi.png)

Sumber: tarikan DIBI 12 November 2026, 4.185 baris dengan 1.897 korban meninggal, `analisis/hasil/uji_kriteria.json`.

Dampak lain sama timpangnya. Satu persen baris teratas membawa 64,0 persen dari 12,5 juta orang terdampak, 95,8 persen pengungsi, dan 92,8 persen rumah rusak. Pola ini disebut *long tail*: sedikit kejadian memikul hampir seluruh dampak, sedangkan kejadian tipikal nyaris tanpa dampak dan nilai tengahnya hampir selalu nol. Rata-rata nasional karena itu tidak mewakili kejadian tipikal, dan jumlah kejadian bukan ukuran besarnya bencana. Ketimpangan ini bukan cacat logika "salah satu cukup". Syarat masuk memang bertugas memutuskan ya atau tidak, bukan seberapa besar. Masalah muncul karena jumlah kejadian dipakai sebagai ukuran utama di DIBI dan di laporan pimpinan, sehingga keputusan ya atau tidak dibaca sebagai ukuran besar.

## 1.3 Aturan hitung tiga langkah membuat angka lebih stabil dan memisahkan kejadian besar dari yang kecil

Aturan hitung tiga langkah menurunkan jumlah kejadian yang masuk hitungan dari 7.535 menjadi 6.835 (turun 9,3 persen). Selisih antar-cara mencocokkan laporan mengecil dari 27 persen menjadi 3 persen, dan hanya 0,4 persen kejadian berkelas Besar atau Katastrofik pada skala absolut (0,8 persen pada skala usulan). Bagian ini menunjukkan buktinya satu per satu. Kita menerapkan aturan tersebut pada baris DIBI (Data dan Informasi Bencana Indonesia) 1 Januari 2024 sampai 12 November 2026 dan pada logbook Pusat Pengendalian Operasi (Pusdalops) Januari sampai Oktober 2026. Langkah 1 menentukan apa yang dihitung sebagai satu kejadian. Langkah 2 menentukan syarat sebuah kejadian masuk hitungan bencana. Langkah 3 memberi kelas keparahan. Isi tiap langkah dijelaskan di Bab 2 dan Bab 4 dokumen kajian lengkap.

### 1.3.1 Kejadian yang masuk hitungan turun 9,3 persen

Dari 15.637 kejadian yang kita bentuk dari baris DIBI, 6.835 masuk hitungan menurut aturan usulan, sedangkan Juklak (Petunjuk Pelaksanaan) 7/2023 meloloskan 7.535. Selisihnya 700 kejadian, atau 9,3 persen. Penurunan terjadi di ketiga tahun dengan besar yang mirip, yaitu 10,6 persen pada 2024, 8,9 persen pada 2025, dan 8,0 persen pada 2026 (Tabel 1.5 dan Gambar 1.6).

Tabel 1.5. Kejadian yang masuk hitungan menurut Juklak 7/2023 dan menurut aturan usulan

| Tahun | Semua kejadian | Juklak 7/2023 | Aturan usulan | Selisih |
| --- | ---: | ---: | ---: | ---: |
| 2024 | 3.654 | 2.556 | 2.285 | -10,6% |
| 2025 | 8.763 | 3.647 | 3.324 | -8,9% |
| 2026 (sampai 12 November) | 3.220 | 1.332 | 1.226 | -8,0% |
| Jumlah | 15.637 | 7.535 | 6.835 | -9,3% |

Sumber: tarikan DIBI 12 November 2026; hasil simulasi kajian ini.

![Gambar 1.6. Kejadian yang masuk hitungan menurut Juklak 7/2023 dan aturan usulan](gbr/r-l2-tahun.png)
Sumber: tarikan DIBI 12 November 2026; hasil simulasi kajian ini.

Selisih itu tidak merata antarjenis bencana. Cuaca ekstrem turun 27 persen (dari 2.097 menjadi 1.537) dan tanah longsor turun 18 persen (dari 626 menjadi 511), terutama karena rumah rusak ringan kini hanya dihitung seperempat rumah rusak berat. Banjir hampir tidak berubah (3.896 menjadi 3.910). Gempa bumi naik 9 persen (55 menjadi 60) karena orang hilang ikut dihitung. Sebanyak 868 kejadian lolos menurut Juklak tetapi tidak masuk hitungan menurut aturan usulan, hampir semuanya karena kerusakan ringan pada rumah atau fasilitas. Sebaliknya 168 kejadian masuk hitungan menurut aturan usulan tetapi tidak lolos menurut Juklak. Sebagian besar karena fasilitas rusak (158), dan sisanya karena ada orang hilang tanpa korban meninggal.

Definisi "terdampak langsung" paling menentukan hasil. Orang menderita, luka, atau mengungsi minimal 50 orang menjadi satu-satunya alasan masuk hitungan bagi 3.946 kejadian pada aturan usulan (57,7 persen dari 6.835), dan bagi 3.889 kejadian pada aturan Juklak (51,6 persen dari 7.535). Angka 51,6 persen ini ukuran kedua, dihitung pada kejadian nasional 2024 sampai 12 November 2026, dan searah dengan 51,1 persen di Subbab 1.2.2 yang dihitung pada baris DIBI 12 bulan terakhir. Jadi mengubah definisi terdampak menggeser jumlah kejadian lebih jauh daripada mengubah angka batasnya. Satu catatan tentang data: DIBI tidak memilah tingkat kerusakan fasilitas, sehingga kita menghitung fasilitas rusak sebagai batas atas. Bila fasilitas hanya dihitung ketika ada rumah rusak berat, hasilnya 6.662 kejadian, 11,6 persen di bawah Juklak.

### 1.3.2 Selisih antar-cara mencocokkan laporan turun dari 27 persen menjadi 3 persen

Bila syarat masuk hitungan dipasang setelah kejadian terbentuk, perbedaan cara mencocokkan baris logbook hanya mengubah hasil 3 persen, padahal jumlah kejadian mentah berubah 27 persen. Kita menguji ini pada logbook Pusdalops Januari sampai Oktober 2026 dengan tiga dari lima cara di Tabel 2.2. Cara 3 menganggap baris satu kejadian bila jenis, provinsi, dan kabupatennya sama dengan jeda paling lama 7 hari. Cara 2 memakai jenis, provinsi, kabupaten yang beririsan, dan tanggal. Cara 1 memakai jenis, provinsi, kabupaten, dan tanggal yang sama persis. Cara 4 dan Cara 5 tidak kita jalankan dengan aturan baru.

Tabel 1.6. Logbook Pusdalops menurut tiga cara mencocokkan baris harian, Januari sampai Oktober 2026

| Cara mencocokkan | Semua kejadian | Masuk hitungan menurut aturan usulan | Meninggal dan hilang (orang) |
| --- | ---: | ---: | ---: |
| Cara 3: jenis, provinsi, kabupaten, jeda 7 hari | 2.809 | 745 | 643 |
| Cara 2: jenis, provinsi, kabupaten beririsan, tanggal | 3.756 | 756 | 619 |
| Cara 1: jenis, provinsi, kabupaten, tanggal | 3.860 | 768 | 625 |

Sumber: logbook Pusdalops; hasil simulasi kajian ini. Angka dampak diurai dari teks bebas. Angka 643 di kolom terakhir adalah jumlah orang meninggal dan hilang pada Cara 3, tidak berkaitan dengan 643 baris DIBI berupa pecahan di Subbab 1.1.4.

![Gambar 1.7. Jumlah semua kejadian dan jumlah yang masuk hitungan menurut cara mencocokkan baris harian](gbr/i-kunci-logbook.png)
Sumber: logbook Pusdalops, Januari sampai Oktober 2026; hasil simulasi kajian ini.

Pada tiga cara yang sama, jumlah kejadian mentah berkisar dari 2.809 sampai 3.860, selisih 27 persen. Jumlah kejadian yang masuk hitungan berkisar dari 745 sampai 768, selisih 3 persen. Ini alasan data untuk urutan kerja aturan baru: membentuk kejadian dulu, memilih versi angka resmi, baru menerapkan syarat masuk. Perlu dicatat, karhutla hanya masuk hitungan pada 9 dari 681 kejadian di logbook ini karena luas lahan belum dapat dipakai.

### 1.3.3 Kejadian di kelas Besar atau Katastrofik hanya 0,4 persen pada skala absolut dan 0,8 persen pada usulan

Kita membandingkan empat cara memberi kelas keparahan pada kejadian yang masuk hitungan (Subbab 2.5). Skala absolut memakai angka tetap untuk korban, pengungsi, dan kerusakan rumah. Skala relatif memakai porsi penduduk kabupaten yang terdampak dan mengungsi. Skala yang mengikuti status darurat memberi kelas menurut tingkat pejabat yang menetapkan status. Indeks gabungan menggabungkan tiga indikator; pada versi pertama aturan kelasnya sama dengan skala absolut pada 96,9 persen kejadian, sehingga tidak ditampilkan di tabel. Dari situ kita mengusulkan skala usulan: skala absolut, lalu naik satu kelas untuk kabupaten berpenduduk kecil yang terpukul berat. Pada skala absolut, 3,3 persen kejadian berkelas Sedang, 0,3 persen Besar, dan 0,1 persen Katastrofik. Pada skala usulan angkanya 4,0, 0,8, dan 0,1 persen. Jumlah kejadian Besar atau Katastrofik adalah 26 (0,4 persen dari 6.835) pada skala absolut dan 57 (0,8 persen) pada skala usulan. Selisih 0,4 lawan 0,8 persen berasal dari kenaikan kelas untuk daerah berpenduduk kecil.

Tabel 1.7. Sebaran kelas keparahan menurut tiga pilihan skala (persen kejadian)

| Pilihan skala | Ringan | Sedang | Besar | Katastrofik |
| --- | ---: | ---: | ---: | ---: |
| Skala absolut | 96,3 | 3,3 | 0,3 | 0,1 |
| Usulan: skala absolut dengan kenaikan kelas untuk daerah berpenduduk kecil | 95,1 | 4,0 | 0,8 | 0,1 |
| Skala relatif terhadap penduduk (versi pertama) | 87,7 | 10,4 | 1,3 | 0,5 |
| Skala mengikuti status darurat (versi pertama) | 53,2 | 8,2 | 38,6 | 0,0 |

Sumber: tarikan DIBI 12 November 2026; hasil simulasi kajian ini. Skala absolut dan usulan dihitung pada 6.835 kejadian. Skala relatif dan skala status darurat dihitung pada 6.812 kejadian dari versi pertama aturan, dengan penduduk dari WorldPop (bukan BPS) dan status dari data SK (surat keputusan) BNPB. Persen dibulatkan per kelas, sehingga jumlah Besar dan Katastrofik di tabel (misalnya 0,8 ditambah 0,1 pada skala usulan) bisa berbeda dari angka di teks (57 dari 6.835, atau 0,8 persen).

![Gambar 1.8. Sebaran kelas keparahan menurut tiga pilihan skala](gbr/i-kelas-skala.png)
Sumber: tarikan DIBI 12 November 2026; hasil simulasi kajian ini.

Kenaikan kelas untuk daerah kecil berdampak kecil. Dari 6.835 kejadian, 112 naik satu kelas dan tidak ada yang turun. Syaratnya, penduduk yang terdampak dan mengungsi mencapai 10 persen penduduk kabupaten, dengan batas bawah 100 orang untuk naik dari Ringan ke Sedang dan 1.000 orang untuk naik dari Sedang ke Besar. Batas bawah itu mencegah kabupaten berpenduduk beberapa ratus orang naik kelas karena 150 orang terdampak. Pada skala relatif, yang menghitung porsi penduduk saja, sepuluh kejadian mencatat orang terdampak lebih banyak daripada penduduk kabupatennya (Aceh Tamiang 612 persen). Itu tanda penghitungan ganda (*double counting*, orang yang sama terhitung lebih dari sekali) atau selisih sumber penduduk, bukan keadaan yang nyata.

Kelas atas sangat jarang, namun kelas inilah yang memikul sebagian besar korban. Hampir semua kejadian kelas atas adalah banjir Sumatera November 2025 yang di DIBI terpecah per kabupaten. Empat kejadian berkelas Katastrofik: banjir Aceh Utara (251 meninggal dan hilang, 304.631 mengungsi), banjir Aceh Tamiang, banjir Aceh Timur, dan gempa 15 Agustus 2026. Daftar ini lebih mencerminkan kelemahan satuan baris daripada 12 kejadian berbeda. Bila Pusdatinkom menggabungkannya, rangkaian banjir itu menjadi satu kejadian besar.

### 1.3.4 Status darurat hanya cocok 52,7 persen dengan skala dampak

Status darurat tidak dapat dipakai sebagai skala dampak. Semua angka di subbab ini dihitung pada 6.812 kejadian versi pertama aturan, dan perhitungan status belum diulang pada versi akhir (6.835 kejadian). Kelas menurut status darurat sama dengan kelas menurut dampak hanya pada 52,7 persen kejadian, dan 38,6 persen kejadian menjadi Besar semata-mata karena ada status. Sebanyak 2.510 kejadian yang dampaknya Ringan berada di bawah status darurat tingkat provinsi, kebanyakan karena status karhutla dan cuaca yang berlaku berbulan-bulan. Sebaliknya 53,2 persen kejadian yang masuk hitungan tidak punya status sama sekali. Dari 36 kejadian berkelas Besar atau Katastrofik menurut skala absolut versi pertama (versi akhir: 26 kejadian), hanya 2 yang tidak punya status. Jadi status dan dampak hanya bertemu di ujung atas. Karena itu aturan usulan mencatat status darurat sebagai penanda di samping kelas, bukan sebagai penentu kelas.

### 1.3.5 Contoh: gempa 15 Agustus 2026

Gempa 15 Agustus 2026 menjadi satu kejadian berkelas Katastrofik pada aturan baru, padahal di DIBI saat ini ia muncul sebagai 11 baris, masing-masing bernilai 0,091 kejadian. Gempa ini terjadi di 11 kabupaten di Nusa Tenggara Barat, Nusa Tenggara Timur, dan Sulawesi Selatan. Magnitudonya 7,7 menurut EMSC (katalog gempa Eropa dan Mediterania) [BELUM TERVERIFIKASI], dan belum dicek ke BMKG karena katalog BMKG di repo berakhir 28 Desember 2025.

Tabel 1.8. Gempa 15 Agustus 2026 sebelum dan sesudah aturan baru

| Hal yang dilihat | Cara DIBI sekarang | Aturan baru |
| --- | --- | --- |
| Satuan hitung | 11 baris, masing-masing 0,091 kejadian | 1 kejadian dengan 11 catatan kabupaten |
| Meninggal dan hilang | Tersebar per kabupaten (Manggarai 62, Nagekeo 20 meninggal) | 151 pada satu kejadian |
| Mengungsi | Tersebar per kabupaten | 171.271 |
| Rumah rusak berat atau setaranya | Tersebar per kabupaten | 63.425 |
| Kelas keparahan | Tidak ada | Katastrofik |

Sumber: tarikan DIBI 12 November 2026; hasil simulasi kajian ini; magnitudo dari EMSC [BELUM TERVERIFIKASI].

Dari 60 gempa yang masuk hitungan, hanya 4 yang mencapai kelas Besar atau Katastrofik. Gempa Bandung 18 September 2024 dengan magnitudo 4,9 (BMKG) masuk kelas Besar, sedangkan banyak gempa di atas magnitudo 7 tidak berdampak. Jadi tidak ada magnitudo yang otomatis berarti bencana besar.

### 1.3.6 Uji dengan kasus sulit: 42 terjawab penuh, 23 sebagian, 0 gagal

Aturan baru menjawab penuh 42 dari 65 kasus sulit penghitungan, menjawab sebagian 23, dan tidak gagal pada satu kasus pun. Kasus sulit adalah situasi yang membuat dua petugas menghitung secara berbeda, misalnya api terbelah sungai. Kasus terjawab penuh bila aturan memberi satu jawaban yang bisa dijalankan petugas tanpa tafsir tambahan. Kasus terjawab sebagian bila arahnya ada, tetapi masih bergantung pada angka sementara, data yang belum ada, atau keputusan di luar BNPB. Pada versi pertama aturan, dua kasus gagal. Satu kasus menyangkut bencana nonalam dan sosial yang memakai angka batas sama. Kasus lainnya menyangkut bencana akibat ulah manusia, yang tidak punya tempat. Keduanya terjawab setelah aturan menambah pintu masuk lewat otoritas sektor dan keterangan pemicu dominan.

Tabel 1.9. Status 65 kasus sulit penghitungan terhadap aturan usulan

| Kelompok kasus | Jumlah | Terjawab penuh | Sebagian | Gagal |
| --- | ---: | ---: | ---: | ---: |
| Menentukan satu kejadian | 18 | 13 | 5 | 0 |
| Syarat masuk hitungan | 14 | 9 | 5 | 0 |
| Ukuran dan korban | 13 | 9 | 4 | 0 |
| Kerugian dan uang | 4 | 3 | 1 | 0 |
| Kelas besar, sedang, kecil | 5 | 2 | 3 | 0 |
| Penyajian | 7 | 3 | 4 | 0 |
| Kelembagaan | 4 | 3 | 1 | 0 |
| Jumlah | 65 | 42 | 23 | 0 |

Sumber: matriks uji, Lampiran A dokumen kajian lengkap.

Status sebagian bukan karena logika yang bertentangan. Sebabnya empat. Ada bagian aturan yang belum dirinci, seperti cara menghitung luas gabungan karhutla. Ada angka sementara yang belum diuji pada satu musim penuh. Ada rekomendasi yang belum masuk aturan. Ada pula kebutuhan data dari luar BNPB, seperti data penduduk BPS, indeks harga, dan padanan kode wilayah setelah pemekaran. Uji konsistensi terhadap seluruh aturan juga mencatat 30 pertentangan dan celah. Sebanyak 22 selesai di versi akhir, 8 selesai sebagian, dan tidak ada yang terbuka.

### 1.3.7 Tren: jumlah kejadian resmi naik 174 persen, korban naik 42 persen

Jumlah kejadian resmi DIBI melonjak 174 persen dari 2024 ke 2025 lalu turun 61 persen ke 2026, sedangkan korban meninggal dan hilang hanya naik 42 persen lalu turun 20 persen. Perbandingan memakai Januari sampai Oktober tiap tahun agar sebanding. Jumlah kejadian yang masuk hitungan bergerak 1.725, 2.702, dan 1.189. Kejadian kelas Sedang ke atas bergerak 92, 108, dan 54. Korban meninggal dan hilang bergerak 510, 723, dan 577.

Tabel 1.10. Deret Januari sampai Oktober menurut empat ukuran

| Ukuran | 2024 | 2025 | 2026 |
| --- | ---: | ---: | ---: |
| Jumlah kejadian resmi DIBI | 2.951 | 8.093 | 3.124 |
| Kejadian yang masuk hitungan bencana | 1.725 | 2.702 | 1.189 |
| Kejadian kelas Sedang ke atas | 92 | 108 | 54 |
| Meninggal dan hilang | 510 | 723 | 577 |

Sumber: tarikan DIBI 12 November 2026; hasil simulasi kajian ini.

![Gambar 1.9. Jumlah kejadian dan korban, Januari sampai Oktober 2024 sampai 2026 (indeks 2024 = 100)](gbr/i-tren.png)
Sumber: tarikan DIBI 12 November 2026; hasil simulasi kajian ini. DIBI 2024 belum lengkap dan 2025 mulai memuat baris bertanda bukan bencana.

Lonjakan 2025 sebagian besar berasal dari baris di bawah syarat. Baris bertanda bukan bencana naik dari 93 (2,5 persen) pada 2024 menjadi 3.705 (41,4 persen) pada 2025. Karena itu deret jumlah kejadian resmi lintas 2024 dan 2025 tidak boleh dibaca sebagai tren. Dampak juga tidak mengikuti jumlah kejadian. Rumah setara rusak berat naik 227 persen pada 2026 padahal jumlah kejadian turun 61 persen, karena gempa Agustus 2026. Lima kejadian teratas memikul 37 persen korban 2025 dan 54 persen korban 2026. Jumlah kejadian kelas Besar ke atas hanya 3 sampai 19 per tahun, terlalu sedikit untuk dibaca sebagai tren yang pasti.
