# InaRISK, rapor sumber, beda sumber

Halaman ini menjelaskan cara menghitung kelas risiko InaRISK, rapor sumber, dan beda sumber.

## Kelas risiko dan IKD di cermin InaRISK

Kelas risiko memakai aturan yang sama dengan InaRISK. Angka batasnya sudah ditetapkan di sana, dan berbeda menurut tahun:

- Skor total tahun 2025 ke atas: di bawah 14,67 Rendah; sampai 176 Sedang; di atas itu Tinggi. Untuk tahun sebelum 2025: di bawah 13 Rendah, di atas 144 Tinggi, di antaranya Sedang.
- Skor per bahaya memakai batas berbeda menurut jenis bahayanya (misalnya longsor Rendah di bawah 6,67 dan Tinggi di atas 15).

Peringkat dibuat dari kabupaten berskor lebih dari 0, diurutkan dari tertinggi. Indeks nasional adalah rata-rata skor yang lebih dari 0. Tren dipisah menurut dasar penghitungan: dasar 2015 (sembilan bahaya, 2015 sampai 2024) dan dasar 2021 (sebelas bahaya, 2025). Selisih lintas dasar tidak dihitung sebagai naik atau turun, karena jenis bahayanya sudah berbeda.

Indeks Ketahanan Daerah: di bawah 0,40 Rendah, sampai 0,80 Sedang, di atas 0,80 Tinggi. Rumus dari tujuh prioritas pada layar ini bukan rumus resmi. Rumus itu dicari dengan mencocokkan secara statistik 532 hasil analisa daerah, dan dicocokkan ulang setiap kali data ditarik.

Simulasi kapasitas (hipotesis): skor tiap bahaya dibagi kelas kapasitas, lalu IRBI simulasi = IRBI x kapasitas lama / kapasitas baru. Contoh: IRBI 100, kapasitas naik dari 2 menjadi 4, hasil simulasi 100 x 2 / 4 = 50. Rencana termurah menaikkan prioritas berbobot terbesar yang masih punya ruang, sampai skor melewati batas kelas berikutnya.

Daftar risiko besok: peringatan Waspada untuk besok dari prakiraan Centurisk97 dicocokkan dengan jenis bahaya IRBI (banjir ke banjir, melaut ke abrasi, dan seterusnya), lalu diurutkan menurut kelas IRBI kabupaten. Ini prakiraan Centurisk97, bukan BMKG.

Seberapa bisa dipercaya: IRBI diuji dengan mencocokkan skor tahun ini dengan kejadian DIBI tahun berikutnya, lalu dibandingkan dengan cara paling sederhana, yaitu menebak bahwa daerah yang banyak kejadian tahun ini akan banyak kejadian lagi tahun depan. Hasil 24 November 2026: IRBI kalah dari tebakan sederhana itu di 10 dari 10 tahun (dasar 2015). Karena itu IRBI ditampilkan apa adanya sebagai indeks InaRISK dan tidak dipakai untuk meramalkan kejadian tahun depan.

Dampak radius: bila Anda menggambar lingkaran atau poligon, sistem meminta InaRISK menghitung penduduk, sekolah, rumah sakit, dan puskesmas di dalamnya. Radius paling besar 50 km. Titik kejadian dari nama desa hanya dipakai bila nama itu cocok dengan tepat satu desa; hasilnya berlabel perkiraan dan baru mencakup sebagian kejadian saja.

## Rapor sumber: seberapa cocok prakiraan dengan kejadian

Data yang dipakai: prakiraan BMKG sepekan dan prakiraan Centurisk97 yang sudah dibekukan sebelum hari sasaran, dibandingkan dengan kejadian dari DIBI dan catatan piket. Diperbarui setiap hari.

1. Untuk tiap hari dan provinsi, prakiraan dianggap "menyala" bila menyebut Siaga atau Awas (hujan) atau Angin Kencang.
2. Setiap hari dimasukkan ke salah satu dari empat kotak pada tabel berikut.

| | Kejadian terjadi | Kejadian tidak terjadi |
| --- | --- | --- |
| Peringatan menyala | a: peringatan tepat | b: peringatan meleset |
| Peringatan tidak menyala | c: kejadian tanpa peringatan | d: sama-sama tidak ada |

3. Tiga ukuran dihitung dari kotak itu:
   - Ketepatan menangkap kejadian = a / (a + c): dari semua kejadian, berapa yang didahului peringatan. Makin tinggi makin baik.
   - Peringatan yang meleset = b / (a + b): dari semua peringatan, berapa yang tidak diikuti kejadian. Makin rendah makin baik. Bila tinggi, banyak peringatan meleset.
   - Nilai gabungan = a / (a + b + c): ringkasan keduanya dalam satu angka. Makin tinggi makin baik.
4. Angka hanya ditampilkan bila ada sedikitnya 30 hari yang dinilai dan 30 hari berkejadian. Di bawah itu tertulis "belum cukup data".

Contoh: 10 peringatan, 6 di antaranya diikuti kejadian (a = 6, b = 4), dan ada 3 kejadian tanpa peringatan (c = 3). Ketepatan menangkap kejadian = 6/9, sekitar 0,67. Peringatan meleset = 4/10 = 0,4. Nilai gabungan = 6/13, sekitar 0,46.

Kejadian DIBI dan catatan piket hanya dinilai sampai 14 hari sebelum data terakhir, karena laporan sering terlambat masuk. Sebagai pembanding, tiap angka disertai tebakan sederhana: bila hari ini ada kejadian di provinsi itu, besok dianggap ada juga. Status: belum ada angka sama sekali.

## Beda sumber: BMKG dibandingkan dengan model Centurisk97

1. Prakiraan hujan (mm per hari) dan gelombang (m) dari dua sumber diubah menjadi peringkat 0 sampai 3. Batas hujan: 0, 50, 100, 150 mm per hari. Batas gelombang: 0, 2,5, 4, 6 m. Batas ini masih hipotesis awal. Contoh: 80 mm per hari termasuk peringkat 1 (antara 50 dan 100).
2. Pasangan ditandai "perlu dicek" bila peringkatnya berselisih 2 atau lebih. Contoh: BMKG peringkat 0 dan model Centurisk97 peringkat 2.
3. Bila salah satu sumber tidak ada pada hari itu, hasilnya "tidak dibandingkan", bukan "sama".

Angin dan titik panas tidak dibandingkan, karena ukurannya berbeda atau sumbernya hanya satu. Tidak ada kolom "yang benar". Pada pembandingan terakhir yang tercatat, semua pasangan hujan yang dibandingkan masih selaras.
