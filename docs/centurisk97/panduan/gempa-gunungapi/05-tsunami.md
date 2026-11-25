# Tsunami, kerusakan, dan korban

Halaman ini menjelaskan perkiraan tsunami, kerusakan, dan korban dalam simulasi.

## Perkiraan tsunami: waktu tiba, tinggi, dan evakuasi

**Pertanyaan.** Kalau gempa ini memicu tsunami, kapan gelombang tiba di pantai, seberapa tinggi, dan sempatkah warga mengungsi.

**Langkah.** Simulasi hanya dijalankan untuk gempa M 6,5 atau lebih yang cukup dangkal dan dekat laut. Cukup dangkal berarti kurang dari sekitar 50 km untuk gempa pertemuan lempeng dan kurang dari sekitar 40 km untuk gempa kerak, dan bidang patahannya berjarak 20 km atau kurang dari laut. Gempa yang lebih dalam tidak disimulasikan.

1. Perkirakan ukuran bidang patahan dari magnitudonya dan perkirakan seberapa jauh patahan bergeser.
2. Hitung kecepatan gelombang di tiap titik laut: akar dari (percepatan gravitasi dikali kedalaman laut). Laut dalam berarti cepat, dangkal berarti lambat.
3. Cari lintasan tercepat dari sumber ke pantai tanpa melewati daratan, lalu jumlahkan waktu tempuhnya. Hasil dikalikan 0,85. Faktor ini penyesuaian kita agar cocok dengan tiga pantai Jawa yang waktu tibanya diketahui.
4. Hitung tinggi gelombang di pantai dari magnitudo dan panjang lintasan lewat laut. Hasil ditampilkan sebagai rentang, yaitu setengah sampai dua kali perkiraan.
5. Untuk evakuasi, asal perjalanan adalah pusat kecamatan dan tujuannya adalah tanah setinggi 20 m atau lebih terdekat tanpa melewati laut. Jarak jalan dihitung 1,3 kali jarak lurus, dengan kecepatan jalan 4 km per jam dan tanpa waktu bereaksi.
6. Bandingkan waktu jalan dengan batas waktu evakuasi, yaitu waktu tiba yang tampil dikali 0,61. Angka 0,61 adalah rasio terkecil yang pernah teramati antara waktu tiba nyata dan hitungan kita, sehingga batas ini sengaja lebih awal agar evakuasi tidak terlalu optimistis. Bila waktu jalan melebihi batas itu, hasilnya "tidak sempat".

**Contoh.** Jarak lurus ke tempat tinggi 2 km. Jarak jalan 2 km kali 1,3 sama dengan 2,6 km. Dengan 4 km per jam, waktu jalan 39 menit. Bila waktu tiba yang tampil 50 menit, batas waktu evakuasi 50 kali 0,61 sama dengan sekitar 30 menit. Karena 39 lebih dari 30, hasilnya "tidak sempat".

**Seberapa bisa dipercaya.** Hipotesis dan hanya simulasi, bukan peringatan. Status tsunami resmi hanya dari BMKG. Faktor 0,85 hanya cocok di tiga pantai Jawa; di 13 pantai lain rasio sebenarnya berkisar 0,61 sampai 1,06, jadi waktu tiba bisa meleset sampai 10 menit lebih lambat dari kenyataan. Resolusi lautnya sekitar 5,5 km dan gelombang dihitung tanpa pecah di pantai. Pada tsunami Pangandaran 2006, model memberi 0,3 sampai 1,1 m sedangkan pengamatan 5 sampai 8 m. Dari 74 gempa yang layak simulasi, hanya 2 tsunami yang terdeteksi pelampung, sehingga ketepatan waktu tiba belum bisa dinilai.

## Perkiraan kerusakan dan korban dalam simulasi

**Pertanyaan.** Berapa rumah rusak dan berapa korban jiwa bila gempa ini terjadi.

**Langkah.**

1. Jumlah rumah di kecamatan = penduduk dibagi 3,9 jiwa per rumah.
2. Rumah dibagi tiga jenis dengan porsi asumsi: tembok tanpa tulangan 40 persen, beton bertulang dan tembok terkekang 30 persen, kayu dan lainnya 30 persen.
3. Untuk tiap jenis rumah dan tiap tingkat kerusakan, hitung peluang rusak berdasarkan kuatnya guncangan. Kurva peluang ini berasal dari standar HAZUS-MH, yaitu panduan penilaian kerugian gempa dari Amerika Serikat yang disusun dari data bangunan di sana, lalu kita sesuaikan dengan satu pengali.
4. Korban jiwa = rumah runtuh kali jumlah penghuni kali peluang ada orang di rumah (99 persen malam, 75 persen siang) kali peluang meninggal bila rumah runtuh.

**Contoh.** Kecamatan berpenduduk 10.000 jiwa berisi sekitar 2.564 rumah (10.000 dibagi 3,9). Dari situ, 40 persen atau sekitar 1.026 rumah dianggap tembok tanpa tulangan, jenis yang paling mudah rusak. Peluang rusak tiap jenis dihitung dari guncangan di kecamatan itu, lalu dijumlahkan.

**Seberapa bisa dipercaya.** Hipotesis, meleset beberapa kali lipat per kejadian. Pengali disetel dari 8 gempa kerak, dan galat rata-ratanya sekitar 5 kali lipat atau sepersekian: bila model menyebut 100 korban, kenyataan bisa saja sekitar 20 atau sekitar 500. Angka korban pengamatan yang dipakai untuk menyetel belum dicocokkan ke sumber aslinya. Untuk gempa di zona pertemuan lempeng seperti Padang 2009, model memberi sekitar tiga kali pengamatan.

## Angka korban dari model resmi USGS (PAGER)

**Pertanyaan.** Berapa korban jiwa menurut model peringatan korban milik lembaga survei geologi Amerika Serikat (USGS), sebagai pembanding model kita.

**Langkah.**

1. Hitung jumlah penduduk di tiap tingkat guncangan MMI, dibulatkan ke tingkat 4 sampai 10.
2. Untuk tiap tingkat, kalikan jumlah penduduk dengan peluang meninggal pada tingkat itu (kurva dari USGS khusus Indonesia).
3. Jumlahkan, lalu tampilkan sebagai pita antara seperempat dan empat kali perkiraan.
4. Kelas siaga: hijau bila di bawah 1 jiwa, kuning 1 sampai 99, oranye 100 sampai 999, dan merah 1.000 atau lebih.

**Contoh.** Bila perkiraan jumlahnya 100 jiwa, pita yang tampil adalah 25 sampai 400 jiwa, dan kelasnya oranye.

**Seberapa bisa dipercaya.** PAGER tidak menghitung korban tsunami atau pencairan tanah. Pada Palu 2018, PAGER memberi 86 sedangkan kenyataan 4.140. Hasilnya tampil berdampingan dengan model kita. Dalam uji ke depan, gempa dicatat paling lama 48 jam sesudah terlihat lalu dinilai terhadap kenyataan.
