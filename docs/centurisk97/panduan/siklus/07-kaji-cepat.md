# Kaji cepat: gempa, banjir, karhutla

Halaman ini menjelaskan cara menghitung kaji cepat untuk gempa, banjir, kebakaran hutan dan lahan, serta gunung api, beserta ujinya.

## Kaji cepat gempa

Data: peta guncangan dari lembaga geologi Amerika Serikat (USGS ShakeMap) bila sudah terbit; bila belum, prakiraan guncangan buatan sendiri dan hasilnya berstatus "menunggu data" tanpa angka korban. Penduduk dari WorldPop per kecamatan. Dihitung tiap 3 jam selama kejadian hidup.

1. Untuk tiap kecamatan, intensitas guncangan (skala MMI, ukuran guncangan yang dirasakan dari 1 sampai 12) dibulatkan ke bilangan bulat, misalnya 6,4 menjadi 6. Hanya intensitas 4 ke atas yang dihitung (3,5 dibulatkan menjadi 4), dan intensitas tertinggi yang dipakai adalah 10.
2. Jumlah penduduk pada tiap tingkat intensitas dikalikan peluang meninggal pada tingkat itu menurut model PAGER (koefisien Indonesia) dan model ITB. Hasilnya dua perkiraan korban jiwa.
3. Batas bawah rentang adalah angka terkecil dari dua nilai: perkiraan PAGER dibagi 4, dan perkiraan ITB. Batas atas adalah angka terbesar dari dua nilai: perkiraan PAGER dikali 4, dan perkiraan ITB.
4. Kelas siaga mengikuti perkiraan PAGER: hijau di bawah 1 jiwa, kuning 1 sampai 99, oranye 100 sampai 999, merah 1.000 atau lebih.

Contoh: perkiraan PAGER 88,4 jiwa dan ITB 334,2 jiwa. Batas bawah: 88,4 dibagi 4 adalah 22,1, lebih kecil dari 334,2, jadi 22,1. Batas atas: 88,4 dikali 4 adalah 353,6, lebih besar dari 334,2, jadi 353,6. Rentangnya sekitar 22 sampai 354 jiwa, dengan kelas kuning.

Seberapa bisa dipercaya: masih perkiraan model dan belum lulus uji balik. Uji balik berarti model dijalankan ulang pada kejadian masa lalu lalu dibandingkan dengan korban sebenarnya. Pengaturan model saat ini disetel dari 8 gempa yang juga dipakai untuk mengujinya, jadi belum bisa disebut uji yang sebenarnya. Karena itu hasilnya masih hipotesis: belum terbukti cukup tepat, pakai sebagai bahan pertimbangan. Pita 4 kali adalah asumsi kebijakan; galat kalibrasinya lebih besar dari pita itu, sehingga rentang bisa terlalu sempit. Tsunami dan likuefaksi tidak dihitung: pada gempa Palu 2018, PAGER memperkirakan 86 korban sedangkan catatan menyebut 4.140. Jumlah rumah rusak akibat gempa berstatus "menunggu" karena belum ada kurva kerapuhan resmi.

## Kaji cepat banjir, karhutla, dan gunung api

Banjir:

1. Bidang genangan kejadian aktif dicocokkan dengan peta paparan di atas, menghasilkan jumlah bangunan dan jiwa terpapar dari tiga sumber penduduk.
2. Batas atas jam pertama adalah jumlah penduduk seluruh kecamatan yang berstatus Siaga atau Awas pada kejadian itu. Ini pagar kasar, karena di jam pertama belum diketahui siapa yang benar-benar terdampak. Bila hasilnya lebih kecil dari jiwa terpapar terbesar, batasnya dinaikkan ke angka itu.
3. Rentang jiwa adalah dari jiwa terpapar terkecil di antara tiga sumber sampai batas atas jam pertama. Contoh: tiga sumber menghasilkan 3.000, 3.032, dan 2.700 jiwa terpapar, dan penduduk kecamatan Siaga dan Awas berjumlah 20.000. Rentangnya 2.700 sampai 20.000 jiwa.
4. Bila kedalaman genangan (meter) tersedia, kerusakan hunian dihitung dari kurva kerusakan JRC Asia (kurva dari pusat riset Komisi Eropa untuk banjir di Asia). Kurva ini menyatakan bagian nilai bangunan yang rusak menurut kedalaman, dan di antara dua titik dihitung lurus:

   | Kedalaman | 0,5 m | 1 m | 2 m | 3 m | 6 m |
   | --- | --- | --- | --- | --- | --- |
   | Bagian nilai rusak | 33 persen | 49 persen | 72 persen | 87 persen | seluruhnya |

   Nilai maksimal hunian 111 euro per meter persegi (harga tahun 2010, karena itulah tahun acuan kurva).

Contoh: kedalaman 0,75 m berarti bagian rusak sekitar 0,41. Untuk hunian 50 meter persegi, kerusakan sekitar 0,41 kali 111 kali 50, yaitu sekitar 2.275 euro (harga 2010).

Nilai rupiah belum tampil karena kurs dan faktor harga belum ditetapkan, dan kurva hanya tersedia untuk hunian. Bidang genangan bukan genangan terukur, sehingga hasilnya paparan, bukan dampak. Hasil ini perkiraan model dan belum lulus uji balik.

Karhutla memakai lingkaran 1, 3, dan 5 km, dan gunung api memakai kawasan rawan bencana. Keduanya hanya menampilkan paparan, tanpa kerusakan atau korban.

## Uji balik kaji cepat

Uji balik membandingkan perkiraan model (m) dengan angka pengamatan (o) pada kejadian lampau.

1. Untuk tiap kejadian, lihat berapa kali lipat perkiraan meleset dari pengamatan. Kejadian dengan perkiraan atau pengamatan bernilai nol tidak dihitung.
2. Bias menunjukkan apakah perkiraan cenderung terlalu tinggi atau terlalu rendah. Faktor galat menunjukkan seberapa lebar melesetnya, ditulis sebagai kelipatan. Faktor 2 berarti perkiraan biasanya meleset sekitar dua kali lipat ke atas atau ke bawah.
3. Cakupan adalah berapa persen kejadian yang angka pengamatannya jatuh di dalam rentang perkiraan.

Contoh: tiga kejadian. Perkiraan 100 dan pengamatan 50 (meleset 2 kali lipat ke atas). Perkiraan 30 dan pengamatan 60 (meleset 2 kali lipat ke bawah). Perkiraan 80 dan pengamatan 80 (tepat). Bila rentang perkiraannya 40 sampai 160, 20 sampai 50, dan 70 sampai 90, pengamatan jatuh di dalam rentang pada dua dari tiga kejadian, jadi cakupannya sekitar 67 persen.

Setiap sumber pengamatan (misalnya korban meninggal menurut DIBI, rumah rusak) diuji sendiri-sendiri. Karena ambang lulus belum ada, label hasil tetap "perkiraan model".
