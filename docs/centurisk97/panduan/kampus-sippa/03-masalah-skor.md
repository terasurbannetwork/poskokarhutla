# Masalah dan skor prioritas dihitung

Bagian ini menjelaskan cara sistem menyusun profil daerah, menghitung skor masalah, dan menambah masalah dari IKD terlemah.

## Menyamakan kode daerah dan menyusun profil

Gambaran sederhana: sistem mengumpulkan data dari banyak sumber, menempelkannya ke satu lembar per kabupaten/kota, lalu menandai mana yang naik, turun, atau tinggi dibanding daerah lain.

Data: skor bahaya IRBI (indeks risiko bencana Indonesia), riwayat kejadian dari DIBI (data kejadian bencana BNPB), penduduk, fasilitas, kapasitas daerah, dan data bahaya dari modul lain. Diperbarui harian.

1. Setiap kabupaten/kota diberi satu kode dengan daftar penerjemah antar sistem kode, karena Indonesia punya beberapa sistem kode yang berbeda (kode 3171 di satu sistem adalah Jakarta Pusat, di sistem lain Jakarta Selatan).
2. Daerah yang kodenya tidak cocok dibiarkan kosong dan dicatat, tidak ditebak.
3. Data tiap sumber ditempel ke profil daerah beserta sumber, tanggal, dan tingkat keyakinannya.
4. Tren adalah arah naik atau turun jumlah kejadian per tahun, dihitung dengan cara yang tidak terpengaruh oleh satu tahun yang sangat besar. Tren dibilang datar bila perubahan relatifnya di bawah 0,05, dan dibilang "jarang" bila kejadiannya terjadi di kurang dari 3 tahun.
5. Peringkat ditulis sebagai persentil: peringkat 0,90 berarti nilai daerah itu lebih tinggi dari 90 persen daerah lain. Bila beberapa daerah bernilai sama, semuanya mendapat peringkat terendah di antara mereka.

Kepercayaan: bagian ini hanya memuat data sumber, bukan prediksi, jadi tidak ada uji balik.

## Skor prioritas masalah otomatis

Gambaran sederhana: skor ini bukan prediksi bencana. Skor ini mengurutkan masalah mana yang sebaiknya ditangani lebih dulu di sebuah daerah, dengan menggabungkan enam bahan.

Enam bahan, semuanya dijadikan persentil nasional antara 0 dan 1:

| Huruf | Arti | Bobot |
| --- | --- | --- |
| H | Skor bahaya | 0,25 |
| F | Frekuensi kejadian 2015 sampai 2025 per 100 ribu penduduk | 0,20 |
| T | Tren kejadian | 0,10 |
| D | Dampak 12 bulan terakhir | 0,15 |
| P | Paparan kelompok rentan dan bangunan | 0,15 |
| K | Celah kapasitas daerah | 0,15 |

Catatan: F memakai sumber dan rentang tahun yang berbeda per bahaya. Karhutla memakai titik panas satelit VIIRS, gempa memakai gempa M5 ke atas dalam radius 100 km sejak 2000, dan bahaya lain memakai catatan DIBI.

1. Dampak dihitung dari korban meninggal dikali 10 (agar korban jiwa jauh lebih berat daripada kerusakan), ditambah pengungsi dibagi 100, ditambah rumah rusak berat.
2. Celah kapasitas adalah 1 dikurangi bagian yang sudah dimiliki dari lima hal: perda penanggulangan bencana, perda BPBD, rencana penanggulangan bencana, rencana kontinjensi, dan BPBD yang sudah terbentuk.
3. Skor = 0,25 x H + 0,20 x F + 0,10 x T + 0,15 x D + 0,15 x P + 0,15 x K.
4. Komponen yang tidak ada dikeluarkan dan bobot sisanya dihitung ulang. Contoh: bila K tidak ada, bobot lima komponen lain (total 0,85) dibagi 0,85 sehingga totalnya kembali 1. Bila komponen yang tersedia kurang dari 4, masalah tidak dibuat.
5. Masalah dibuat bila skor 0,40 atau lebih dan memenuhi salah satu aturan, misalnya risiko tinggi tanpa dokumen rencana, kejadian meningkat, atau dampak besar 12 bulan terakhir.
6. Kelas: P1 (tangani lebih dulu) bila skor 0,70 atau lebih, atau bahaya 0,80 ke atas dan celah kapasitas 0,60 ke atas. P2 bila skor 0,50 atau lebih. Selain itu P3 (cukup dipantau).

Contoh: sebuah kabupaten punya H 0,6, F 0,6, T 0,5, D 0,4, P 0,6, dan K 0,6. Skor = 0,15 + 0,12 + 0,05 + 0,06 + 0,09 + 0,09 = 0,56, jadi kelas P2. Bila H-nya 0,8 dan K-nya 0,6, daerah itu langsung masuk P1 walaupun skor totalnya di bawah 0,70.

Bila BPBD mengajukan masalah sendiri, BPBD menilai empat hal (urgensi, cakupan, kesiapan data, kecocokan kampus), masing-masing dengan nilai 0 sampai 3. Skor akhir = setengah dari (jumlah empat nilai dibagi 12, karena nilai tertinggi 3 kali 4) ditambah setengah dari skor otomatis. Skor otomatis dipakai 0,5 bila tidak ada. Contoh: nilai 3, 2, 3, 1 berjumlah 9, dibagi 12 menjadi 0,75. Dengan skor otomatis 0,56: 0,5 x 0,75 + 0,5 x 0,56 = 0,655, kelas P2.

Dua masalah dari daerah berbeda digabung bila kategorinya sama dan kata pentingnya di judul dan uraian cukup mirip: paling sedikit separuh dari seluruh kata penting kedua teks muncul di keduanya. Yang skornya tertinggi menjadi induk.

Kepercayaan: masih hipotesis dan berlabel "Belum diuji". Untuk skor ini, uji balik baru bisa dijalankan setelah sedikitnya 100 masalah divalidasi lewat pendataan, dan belum dijalankan. Model risiko nasional yang gagal uji tidak dipakai membentuk masalah, hanya ditampilkan sebagai catatan tambahan.

## Masalah dari prioritas indeks ketahanan daerah (IKD) terlemah

Data: analisa IKD InaRISK per kabupaten/kota. Langkahnya begini.

1. Ambil tahun analisa terbaru untuk daerah itu.
2. Pilih sampai dua prioritas (dari tujuh) yang nilainya paling rendah dan punya rekomendasi indikator.
3. Setiap pilihan menjadi satu butir masalah berjudul "Prioritas IKD terlemah: ..." beserta rekomendasi apa adanya.
4. Daerah tanpa analisa tidak punya butir. Kosong, bukan nol.

Butir ini tidak memiliki skor dan kelas, tidak mengubah masalah otomatis, tetapi ikut dalam pencocokan pakar. Saat ini butir ini belum diperbarui otomatis.
