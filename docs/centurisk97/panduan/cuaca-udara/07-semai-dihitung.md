# Peluang semai: awan mana yang layak

Halaman ini menjelaskan bagaimana sistem memilih awan yang layak disemai dan menyusun usulan zona beserta alasannya.

## Peluang semai awan: awan mana yang layak

Data: prakiraan cuaca ECMWF resolusi sekitar 10 km, dua putaran sehari, sampai 36 jam ke depan dengan langkah 3 jam; titik panas dan daya radiasi apinya 24 jam dari satelit; lokasi kota dan bandara.

Langkah hitung:

1. Cari kumpulan titik panas besar. Ukurannya adalah daya radiasi api (panas yang dipancarkan api, diukur satelit, dalam megawatt atau MW) selama 24 jam: paling sedikit 40 MW dan paling sedikit 2% dari kumpulan api terbesar. Bila tidak ada, hasilnya kosong dengan alasan "tidak ada api besar".
2. Hanya sel awan (gumpalan awan di peta prakiraan) dalam 60 km dari api besar yang dipertimbangkan.
3. Sebuah sel harus lolos sembilan gerbang. Satu gerbang gagal berarti tidak layak.
4. Sel yang lolos diberi tiga nilai: kualitas awan, daya api di tempat hujan akan jatuh, dan jarak ke kota.
5. Nilai digabung menjadi skor. Dipilih sel dengan skor tertinggi, sel dalam 40 km darinya dibuang, lalu dipilih lagi sampai 5 zona (A sampai E) atau skor di bawah 0,35. Contoh: sel A skor 0,7, sel B skor 0,6 berjarak 30 km dari A, sel C skor 0,5 berjarak 80 km dari A. A dipilih, B dibuang karena terlalu dekat, C dipilih.
6. Untuk tiap zona ditentukan jendela terbang, bandara berangkat, ketinggian, bahan, dan rute.

Sembilan gerbang (kolom Artinya menjelaskan mengapa syarat itu penting):

| Gerbang | Syarat | Artinya |
| ------- | ------ | ------- |
| 1 | Awan rendah menutup 25% langit atau lebih | Ada cukup awan rendah untuk disemai |
| 2 | Tenaga awan 1.500 J/kg atau lebih | Awan cukup bertenaga untuk tumbuh tinggi |
| 3 | Air cair dalam awan 0,05 kg/m2 atau lebih | Awan memuat cukup air untuk dijadikan hujan |
| 4 | Selisih angin lapisan bawah dan atas 12,5 m/s atau kurang | Angin cukup seragam, awan tidak tercerai-berai |
| 5 | Kelembapan di sekitar ketinggian 1,5 km 65% atau lebih | Udara cukup lembap |
| 6 | Hujan alami 3 jam di bawah 4 mm per jam | Awan belum menjadi hujan sendiri |
| 7 | Suhu dasar awan 10 derajat Celsius atau lebih | Dasar awan cukup hangat |
| 8 | Lapisan awan hangat setebal 1.000 m atau lebih | Ada lapisan awan hangat yang cukup tebal |
| 9 | Blok 3 jam beririsan dengan pukul 07.00 sampai 16.00 waktu setempat | Waktu terbang masih pada jam siang |

Bila tenaga awan di atas 3.500 J/kg, awan itu tidak dianggap lebih baik tetapi masuk daftar "hati-hati" (paling banyak 3), karena awan yang terlalu bertenaga berbahaya bagi pesawat.

Tiga nilai penyusun skor:

- Kualitas awan (Q): rata-rata lima komponen, yaitu tenaga awan, air cair, kelembapan, selisih angin, dan gerak naik udara. Tiap komponen diskalakan 0 sampai 1 antara batas gerbang dan batas "sangat bagus" (misalnya tenaga awan 1.500 menjadi 0 dan 3.000 menjadi 1; di antaranya naik merata, jadi 2.250 menjadi 0,5).
- Daya api (D): titik hujan diperkirakan dengan menggeser sel searah angin selama 30 menit. Jumlahkan daya api dalam 25 km dari titik itu (api di gambut dihitung 1,5 kali). Makin besar jumlahnya, makin dekat D ke 1, tetapi kenaikannya melambat. Contoh: 50 MW memberi D sekitar 0,22; 200 MW sekitar 0,63; 600 MW sekitar 0,95. D nol bila tidak ada api di dekatnya.
- Jarak ke kota (T): 0 bila titik hujan kurang dari 10 km dari kota atau bandara, naik bertahap hingga 1 pada 50 km.

Skor menggabungkan ketiga nilai dengan perkalian berbobot: kualitas awan paling berpengaruh (bobot 0,45), lalu daya api (0,40), lalu jarak ke kota (0,15). Karena perkalian, satu nilai nol membuat skor nol.

Contoh: Q = 0,6, D = 0,7, T = 0,8. Dengan bobot di atas, skornya sekitar 0,67 (Q berkontribusi sekitar 0,79, D sekitar 0,87, T sekitar 0,97, lalu dikalikan). Karena di atas 0,35, sel ini layak dijadikan zona. Bila D = 0, skornya 0 dan sel itu tidak jadi zona.

Jendela terbang: langkah 3 jam berurutan di sekitar waktu terbaik yang skornya paling sedikit 85% dari puncak, dipotong ke 07.00 sampai 16.00 waktu setempat.

Ketinggian terbang: dasar awan, diperkirakan dari selisih suhu udara dan suhu titik embun (suhu saat uap air mulai mengembun) di permukaan, dibulatkan ke 500 kaki. Bila di luar kisaran 300 sampai 3.000 m, angka tidak ditampilkan. Bahan: garam, kecuali bila ada inversi (lapisan udara hangat yang menutup dan menahan awan) dan asap sedang atau tinggi, maka es kering dulu lalu garam. Jumlah penerbangan: lama jendela dibagi (dua kali waktu terbang ditambah 30 menit penaburan), dibulatkan ke bawah, minimal 1. Contoh: jendela 4 jam (240 menit), terbang 1 jam; 240 dibagi (2 x 60 + 30) = sekitar 1,6, jadi 1 penerbangan.

Rute satu penerbangan: titik 0 di pangkalan, titik 1 sepuluh mil laut sebelum zona, empat titik tabur dalam dua lintasan lurus sepanjang 10 mil laut yang sejajar, berjarak 3 mil laut satu sama lain dan melintang arah angin, lalu kembali ke pangkalan (1 mil laut sekitar 1,85 km).

Seberapa bisa dipercaya: seluruh batas dan bobot di atas adalah hipotesis penyusun, sebagian dari panduan produk pembanding dan literatur. Uji balik (mencocokkan usulan dengan kejadian nyata) sudah dirancang tetapi belum berjalan: setiap zona akan dibekukan sebelum kejadian, lalu dicek apakah awan di zona itu memang menjadi hujan alami lebih sering daripada lima sel acak lolos gerbang, dan angka baru tampil bila ada minimal 30 zona. Yang diuji hanya ketepatan memilih awan, bukan manfaat semai. Bukti bahwa semai memadamkan api atau gambut tidak ada, sehingga yang diusulkan hanya peringkat awan yang layak disemai.
