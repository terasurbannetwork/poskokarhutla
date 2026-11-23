# GLOSARIUM: Simulasi tsunami dengan genangan darat

| Istilah | Arti di modul ini |
| --- | --- |
| Simulasi | Hitungan model dari satu skenario sumber; bukan peringatan dan bukan prakiraan resmi. |
| Status resmi | Pernyataan BMKG dan PTWC tentang tsunami, tampil apa adanya dan terpisah. |
| Genangan | Daratan yang tertutup air laut pada hitungan; dinyatakan sebagai kedalaman maksimum per sel. |
| Run-up | Ketinggian tanah tertinggi (dari muka laut) yang dicapai air di darat, atau di sini tinggi muka air maksimum di titik pengamatan menurut kolom sumber. Dua besaran ini tidak dicampur. |
| T + N menit | Waktu N menit sesudah gempa. |
| Skenario pustaka | Hitungan praterhitung untuk sumber tertentu (lokasi, M, mekanisme) di kotak halus. |
| Tingkat A | Hitungan dibuat untuk gempa itu sendiri. |
| Tingkat B | Skenario pustaka terdekat; bukan hitungan gempa itu. |
| Kotak halus | Daerah pantai yang dihitung dengan resolusi tinggi; di luarnya "belum dihitung". |
| Grid bersarang | Rangkaian grid dari kasar (laut dalam) ke halus (pantai). |
| L0 sampai L3 | Tingkat grid; L0 kasar (ETOPO 3 menit busur), L3 paling halus. |
| Basah-kering | Kemampuan model memindahkan garis pantai saat air naik ke daratan atau surut. |
| Manning (n) | Koefisien kekasaran dasar yang menentukan gesekan di darat dan laut. |
| Okada | Rumus dislokasi permukaan akibat patahan persegi panjang berhingga di setengah ruang elastis. |
| Slip seragam | Anggapan satu nilai geser di seluruh bidang patahan. |
| Segmen | Bagian bidang patahan yang dibagi sepanjang strike untuk gempa sangat panjang. |
| Tsunami lambat | Gempa dengan rupture lambat yang menghasilkan tsunami lebih besar dari yang ditunjukkan magnitudo; contoh Pangandaran 2006 dan Mentawai 2010. |
| DEM, DSM | Model tinggi medan; DSM memuat pohon dan bangunan, sehingga genangan di bawahnya cenderung diremehkan. |
| GLO-30, FABDEM, DEMNAS | Tiga sumber tinggi darat; DEMNAS dipilih atas izin pemilik (K4), GLO-30 cadangan, FABDEM tidak untuk layar publik. |
| Disetel | Label kejadian pengembangan: hasilnya dipakai menyetel model, jadi bukan bukti. |
| n_min | Jumlah minimal kejadian uji agar selang bootstrap dan label "teruji" boleh dipakai. |
| Kalimat batas | Kalimat wajib di samping legenda genangan yang menyebut batas model. |
| Batimetri | Kedalaman dasar laut. |
| K dan kappa (Aida) | Rata-rata geometrik rasio amatan terhadap hitungan, dan simpangan geometriknya. |
| Pembanding Abe | Tinggi indikatif empiris yang sudah ada di `tsunami.js`; harus dikalahkan model baru. |
| Kelas A, kelas B | Kejadian uji balik yang menentukan vonis, dan yang hanya dilaporkan sebagai batas model. |
| Hipotesis | Label sampai uji balik lulus. |
| Prospektif | Dinilai dari simulasi yang dibekukan sebelum pengamatan datang; arsip append-only. |
| NOAA NCEI | Pusat data tsunami historis yang menyediakan run-up per lokasi. |
| Belum dihitung | Pantai atau gempa tanpa keluaran; tidak pernah tampil 0. |
| Tidak tergenang pada simulasi ini | Sel kering di dalam kotak halus; bukan klaim aman. |
