# Kebutuhan, siaga, kebakaran, kinerja

Halaman ini menjelaskan cara menghitung kebutuhan musim, siaga pra-musim, risiko kebakaran permukiman, dan kinerja BNPB.

## Perkiraan kebutuhan musim

Data yang dipakai: jumlah titik panas tahun 2019 sampai 2025 pada jendela hari yang sama, dan tarif serta koefisien operasi yang tertulis. Ini bukan model baru, melainkan rata-rata historis dikali koefisien operasional.

1. Titik panas yang diharapkan: rata-rata dari tahun skenario (rata-rata 2019 sampai 2025, atau tahun El Nino) untuk jendela 30, 60, atau 90 hari.
2. Jumlah kompleks kebakaran (kelompok titik panas yang berdekatan dan dianggap satu kejadian besar): titik panas dibagi jumlah titik per kompleks di provinsi itu.
3. Jam terbang helikopter: kompleks dikali porsi prioritas (bagian kompleks yang cukup penting untuk didukung helikopter) dikali 3 jam (rentang rendah 1,5 jam, tinggi 6 jam).
4. Regu-hari (satu regu bekerja satu hari): kompleks dikali regu-hari per kompleks dikali 1,5 untuk rotasi, yaitu cadangan pergantian regu.
5. Penduduk terdampak asap: penduduk kecamatan dengan kompleks tingkat 2 ke atas, dikali perbandingan kompleks terhadap jumlah kompleks operasi.
6. Biaya: jam terbang dikali Rp150 juta, ditambah regu-hari dikali 15 orang per regu dikali biaya per orang per hari, ditambah penduduk terdampak dikali 2 masker dikali Rp15 ribu.

Contoh jam terbang dengan angka rekaan: 10 kompleks, porsi prioritas 0,5. Jam terbang = 10 x 0,5 x 3 = 15 jam. Biaya jam terbang = 15 x Rp150 juta = Rp2,25 miliar. Contoh masker: 20.000 penduduk terdampak x 2 masker x Rp15 ribu = Rp600 juta.

Tarif dan koefisien adalah asumsi kerja. Provinsi dengan kurang dari 5 kompleks operasi tidak diberi angka (kosong, bukan nol). Seberapa bisa dipercaya: belum diuji balik, anggap sebagai gambaran kasar besarnya kebutuhan, bukan anggaran.

## Perencanaan dan siaga pra-musim

1. Kabupaten prioritas: kabupaten diurutkan dari beban kejadian terbesar sampai jumlah kumulatifnya mencapai 46 persen dari total. Hasilnya 51 dari 514 kabupaten/kota.
2. Musim: hitungan kejadian per bulan dihaluskan dengan rata-rata tiga bulan berurutan. Bulan yang sama dengan atau di atas rata-rata dianggap bulan musim, dengan syarat minimal 1 kejadian. Bila dua bulan musim hanya dipisah satu bulan, bulan di tengah ikut dianggap musim. Pola yang kenaikannya tidak cukup jelas (bulan musim tidak lebih tinggi daripada bulan lain di separuh tahun data) dibuang.
3. Peluang musim per bulan dihitung dari berapa tahun bulan itu termasuk musim. Bulan dianggap musim bila peluangnya paling sedikit 0,5. Contoh: dari 9 tahun data, sebuah bulan termasuk musim di 8 tahun. Peluangnya 8/9 = 0,89, jadi bulan itu dianggap musim.
4. Tingkat keyakinan diberikan dengan tabel berikut.

| Keyakinan | Syarat |
| --- | --- |
| Rendah | Salah satu terpenuhi: kejadian kurang dari 100, musim hanya muncul di kurang dari dua pertiga tahun, atau pola kejadian tidak cocok dengan puncak titik panas |
| Tinggi | Kejadian 300 atau lebih, dan musim muncul di sedikitnya tujuh dari sembilan tahun |

5. Kalender operasi hanya dibuat bila kombinasi provinsi dan jenis bencana punya 30 kejadian atau lebih. Persentase kategori kebutuhan hanya tampil bila ada 10 kejadian berisi atau lebih.

Seberapa bisa dipercaya: ini gambaran dari masa lalu, bukan ramalan, dan belum diuji balik.

## Risiko kebakaran permukiman

1. Untuk tiap kelurahan, empat komponen diurutkan terhadap kelurahan lain di kota yang sama (nilai 0 sampai 100): luas tutupan bangunan, jumlah bangunan per hektare, waktu tempuh dari pos pemadam (lewat jalan yang bisa dilalui mobil pemadam, ditambah jalan kaki 4 km/jam dari jalan ke bangunan), dan porsi jalan sempit (lebar di bawah 3,5 m).
2. Skor 0 sampai 100 adalah rata-rata keempat nilai itu dengan bobot sama. Hidran ditampilkan tetapi tidak masuk skor.
3. Kelas bersifat relatif dalam satu kota: 10 persen teratas Sangat tinggi, 20 persen berikutnya Tinggi, 30 persen Sedang, sisanya Rendah.

Seberapa bisa dipercaya: aturan lulus ditulis sebelum hasil dilihat, yaitu indeks harus menangkap kebakaran nyata sedikitnya 5 poin lebih baik daripada sekadar menghitung jumlah bangunan dan kepadatan. Hasilnya gagal. Dari 100 kebakaran nyata, indeks ini menempatkan sekitar 18 di kelurahan berskor tinggi, sedangkan hitungan jumlah bangunan saja menempatkan sekitar 32. Karena itu skor ini hanya hipotesis dan tidak dipakai sebagai alat prioritas.

## Kinerja BNPB

Angka resmi hanya diambil dari dokumen resmi (laporan kinerja, rencana strategis 2025 sampai 2029) dan membawa nama dokumen serta halamannya. Target indeks risiko bencana turun 1,2 persen per tahun dari angka dasar 147,95 pada 2025. Angka dasar dan persentase itu dari dokumen, tetapi nilai target tahunan dihitung Centurisk97 dari keduanya, karena dokumen tidak mencetak nilai mutlaknya. Contoh: target 2027 adalah 147,95 x 0,988 x 0,988, atau sekitar 144,4.

Kapasitas dari peta InaRISK tidak sama dengan Indeks Ketahanan Daerah resmi (310 kabupaten berkapasitas rendah menurut peta, 225 menurut angka resmi), sehingga persentasenya tidak bisa dibandingkan langsung.
