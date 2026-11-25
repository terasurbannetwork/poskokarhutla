# Pencocokan wajah dan status absen

Halaman ini menjelaskan bagaimana kemiripan wajah dan lokasi GPS dipakai untuk menentukan status absen petugas.

## Pencocokan wajah, GPS, dan status absen

Data yang dipakai: gambar kamera depan, sampai tiga titik GPS dari HP, jam server, dan titik serta radius tempat tugas. Pencocokan wajah dihitung di HP. Sistem hanya menyimpan deretan angka yang mewakili ciri wajah Anda, lalu membandingkannya. Deretan angka itu tidak pernah dikirim keluar dari sistem.

Langkah:

1. Pendaftaran: wajah direkam lima arah. Untuk arah depan, kepala harus lurus dalam batas 8 derajat. Untuk arah kiri dan kanan, kepala menoleh sedikitnya 22 derajat. Untuk arah atas dan bawah, kepala mendongak atau menunduk sedikitnya 15 derajat.
2. Mutu gambar harus memenuhi syarat berikut selama 5 gambar berturut-turut: wajah terdeteksi dengan keyakinan sedikitnya 0,80; lebar wajah 30 sampai 75 persen lebar layar; gambar cukup tajam; dan lolos pemeriksaan foto palsu. Tiga gambar terbaik dirata-rata menjadi satu ciri wajah untuk arah itu. Tiap arah dibatasi 15 detik.
3. Server membandingkan tiap arah dengan arah depan. Kemiripannya harus sedikitnya 0,45, bila tidak arah itu diminta ulang.
4. Saat absen, layar meminta satu gerakan acak (kedip, toleh kiri, atau toleh kanan) dalam 8 detik. Skor wajah adalah kemiripan tertinggi antara wajah saat absen dan kelima wajah terdaftar (skala 0 sampai 1).
5. GPS: titik absen adalah sampel terakhir. Ditolak bila di luar Indonesia atau ketelitian lebih buruk dari 5.000 m. Absen dianggap di dalam radius bila jarak ke titik tugas tidak lebih dari radius ditambah ketelitian GPS (paling banyak ditambah 200 m). Contoh: radius tugas 100 m, ketelitian GPS 30 m, jarak 120 m, maka dianggap di dalam. GPS dicurigai bila perpindahan antar-absen orang yang sama lebih dari 900 km/jam.
6. Waktu resmi adalah waktu server. Selisih jam HP lebih dari 300 detik diberi tanda. Absen tanpa sinyal (luring) memakai jam HP bila masih dalam 24 jam ke belakang dan tidak lebih dari 5 menit ke depan. Contoh: absen pukul 07.00 tanpa sinyal, terkirim pukul 09.00, tetap diterima.
7. Sistem memutuskan status absen.

Ambang kecocokan wajah:

| Ambang | Nilai | Artinya |
| --- | --- | --- |
| Lolos | 0,60 ke atas | wajah dianggap cocok |
| Tinjau | 0,45 sampai kurang dari 0,60 | wajah kurang cocok, dikirim ke peninjau |
| Beda | di bawah 0,45 | wajah berbeda, tetap dikirim ke peninjau, bukan ditolak |
| Hidup | 0,50 ke atas | skor tanda wajah asli (bukan foto atau layar) |
| Sampel acak | 10 persen | absen yang sebenarnya lolos dipindah ke tinjauan secara acak |

Aturan keputusan:

1. Ditolak bila fotonya pernah dipakai, kode sekali pakai absennya tidak sah, atau GPS ditolak.
2. Lolos bila wajah sudah terdaftar, skor wajah 0,60 atau lebih, gerakan acak berhasil, skor hidup 0,50 atau lebih, GPS tidak mencurigakan, berada dalam radius, jam HP wajar, dan tidak ada tanda lain.
3. Selain itu masuk tinjauan, disertai alasan: wajah belum terdaftar, wajah kurang cocok, wajah berbeda, gerakan gagal, tanda wajah asli rendah, GPS mencurigakan, di luar radius, jam HP janggal, absen luring, absen luring lama, jaringan berbeda (kode yang sama dipakai dari jaringan lain dalam 12 jam), wajah baru (3 absen pertama setelah daftar ulang), atau sampel acak.

Contoh: skor wajah 0,55, gerakan acak berhasil, GPS di dalam radius. Karena 0,55 berada di antara 0,45 dan 0,60, absen berstatus tinjau dengan alasan "wajah kurang cocok". Peninjau memutuskan sah atau tolak.

Seberapa bisa dipercaya: seluruh ambang di atas masih hipotesis. Ambang akan disetel ulang setelah 200 pasang absen sah terkumpul, dan ambang tanda wajah asli masih menunggu uji dengan foto cetak dan layar. Uji balik artinya mencocokkan hasil hitungan dengan keputusan manusia atau kejadian nyata; itu belum bisa dilakukan. Sebagian kecil absen yang sebenarnya baik pun sengaja diperiksa sebagai kontrol mutu, itu bukan tuduhan. Karena skor rendah hanya mengirim absen ke peninjau manusia, kesalahan ambang berakibat pada beban peninjau, bukan penolakan otomatis. Hasil ini hanya membantu peninjau, bukan keputusan akhir.

Keterbatasan: peramban tidak dapat memastikan GPS palsu, hanya mencurigai dari pola. Helm, hujan, dan HP murah menurunkan skor wajah.
