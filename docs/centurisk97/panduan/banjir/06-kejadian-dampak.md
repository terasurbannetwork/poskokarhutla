# Skor kejadian dan perkiraan dampak

Halaman ini menjelaskan cara skor kejadian aktif, perkiraan dampak, dan genangan historis dihitung.

## Skor kejadian aktif

**Langkah hitung.** Kecamatan bersebelahan yang berstatus Siaga atau lebih digabung menjadi satu kejadian. Skornya 0 sampai 100, dari empat bagian:

1. Tingkat status: sampai 40 poin. Siaga mendapat 60 persen dari bobot ini (24 poin), Awas penuh (40 poin).
2. Penduduk: sampai 30 poin. Makin banyak penduduk makin tinggi, tetapi kenaikannya melambat supaya kota besar tidak mengalahkan semua. Contoh: 1.000 jiwa sekitar 14 poin, 10.000 jiwa sekitar 18,5, 100.000 jiwa sekitar 23, 1 juta jiwa sekitar 28; penuh 30 poin pada sekitar 3 juta jiwa.
3. Jumlah kecamatan: sampai 15 poin, penuh bila 10 kecamatan atau lebih (tiap kecamatan 1,5 poin).
4. Indeks bahaya banjir: sampai 15 poin (indeks bahaya dikali 15).

**Contoh.** Kejadian berstatus Siaga di 4 kecamatan, penduduk 100.000 jiwa, indeks bahaya 0,7. Tingkat: 24. Penduduk: 23. Kecamatan: 4 kali 1,5 = 6. Bahaya: 0,7 kali 15 = 10,5. Skor sekitar 64.

Bila ada bagian yang datanya tidak ada, bagian itu dibuang dan bobot yang lain dinaikkan; tidak diisi nol.

## Perkiraan dampak

**Bahan.** Penduduk dari WorldPop (peta sebaran penduduk), sekolah dan fasilitas kesehatan dari OpenStreetMap (peta terbuka yang disusun relawan), jalan dari data peta, kejadian dan korban dari DIBI.

**Langkah hitung:**

1. Ambil kecamatan berstatus Siaga atau Awas.
2. Jumlahkan penduduk, sekolah, fasilitas kesehatan, dan panjang jalan yang berisiko di kecamatan itu. Bagian yang datanya tidak ada dibuang, bukan nol.
3. Untuk perkiraan paparan per kabupaten, hitung dua angka dari penduduk tiap kecamatan, dengan anggapan penduduk tersebar merata. Zona bahaya adalah bagian wilayah yang oleh peta InaRISK dinilai berbahaya banjir tinggi atau sedang.
   - Batas bawah: penduduk dikali porsi luas zona bahaya tinggi, dikali peluang hujan 100 mm atau lebih. Bila peluang itu di bawah 0,05, batas bawah dikosongkan dan layar menulis "sampai" angka batas atas.
   - Batas atas: penduduk dikali porsi luas zona bahaya sedang ditambah tinggi, dikali peluang hujan 50 mm atau lebih.
4. Hari baru dihitung bila peluang hujan 50 mm atau lebih sedikitnya 0,195 (sekitar 10 dari 51 hasil prakiraan); di bawah itu dianggap tidak ada sinyal.
5. Bila lebih dari 30 persen kecamatan di kabupaten tidak punya nilai bahaya, hasilnya ditandai terlalu rendah.

**Contoh (disederhanakan, satu kecamatan).** Penduduk 20.000 jiwa, 30 persen luas masuk zona tinggi dan 60 persen masuk zona sedang ditambah tinggi, peluang hujan 100 mm atau lebih 0,10, peluang hujan 50 mm atau lebih 0,40. Batas bawah: 20.000 kali 0,3 kali 0,10 = 600 jiwa. Batas atas: 20.000 kali 0,6 kali 0,40 = 4.800 jiwa. Dalam bentuk rumah, dengan anggapan 3,5 jiwa per keluarga, batas atas sekitar 1.370 keluarga.

**Seberapa bisa dipercaya.** Ini angka paparan, bukan perkiraan korban, dan tanpa klaim ketepatan.

## Genangan historis

Lapisan "Genangan historis" memakai data Google (turunan citra 1999 sampai 2020) dalam tiga kelas: Tinggi (piksel 128 meter yang basah 5 persen waktu atau lebih), Sedang (1 persen atau lebih), dan Rendah (0,5 persen atau lebih). Perlu diingat bahwa kota padat dan sawah di Jawa yang tampil 100 persen kelas tinggi adalah isi sumber data (citra optik mengira sawah berair sebagai genangan), bukan prakiraan.
