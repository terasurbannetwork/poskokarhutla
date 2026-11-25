# Keparahan, FWI, dan firespot

Halaman ini menjelaskan cara menilai keparahan sebuah kelompok api, status tindakannya, indeks cuaca kebakaran, dan penilaian firespot.

## 5. Keparahan dan status tindakan

Status tindakan dihitung dari ukuran api dan cuaca. Cuaca hanya boleh MENAIKKAN status, tidak menurunkannya.

1. Hitung jumlah kotak berbeda yang aktif dalam 24 jam terakhir.
2. Tentukan keparahan. Tinggi: 10 kotak atau lebih, atau bertahan 4 hari atau lebih dengan sedikitnya 5 kotak. Rendah: kurang dari 3 titik dan aktif paling lama sehari. Selain itu sedang.
3. Tentukan kelas cuaca kebakaran dari indeks FWI (lihat nomor 6): FWI di bawah 2 kelas 0, di bawah 7 kelas 1, di bawah 14 kelas 2, selebihnya kelas 3.
4. Baca status dari tabel ini (angka 0 sampai 2 menjadi nama di layar: 0 Pencegahan rutin, 1 Patroli terpadu, 2 Siaga pemadaman awal):

| Keparahan | Cuaca kelas 0 atau 1 | Cuaca kelas 2 | Cuaca kelas 3 | Tanpa data cuaca |
| --- | --- | --- | --- | --- |
| Rendah | 0 | 1 | 1 | 1 |
| Sedang | 1 | 2 | 2 | 1 |
| Tinggi | 2 | 2 | 2 | 2 |

5. Status 3, Prioritas pemadaman, diberikan bila ada 15 kotak atau lebih yang aktif dalam 24 jam dan FWI sedikitnya 7 (atau data cuaca tidak tersedia).

Contoh: kelompok dengan 12 kotak aktif dalam 24 jam berkeyakinan tinggi keparahannya "tinggi". Dengan FWI 8 (kelas 2) hasilnya status 2, Siaga pemadaman awal. Karena kotaknya kurang dari 15, belum menjadi Prioritas pemadaman.

Angka 15 dipilih karena pengelompokan memakai tiga satelit VIIRS; untuk satu satelit saja ambangnya 10.

Seberapa bisa dipercaya: uji balik pada Agustus sampai Oktober 2019 dan 2023 memakai ambang 10 kotak dengan FWI sedikitnya 7. Hasilnya, 90 sampai 95 persen api yang akhirnya menjadi besar (100 kotak atau lebih) tertangkap sebelum mencapai separuh ukurannya. Ketepatannya 35 sampai 53 persen, artinya sebagian peringatan tidak berujung api besar. Ambang 15 kotak yang dipakai sekarang belum diuji sendiri.

## 6. Indeks cuaca kebakaran (FWI)

FWI adalah angka mulai dari 0 yang menunjukkan seberapa mudah api menyala dan menyebar; makin besar makin berbahaya. Ia dihitung dari suhu, kelembapan, angin, dan hujan. Centurisk97 menghitungnya per kotak 0,5 derajat dan melanjutkannya tiap hari dari data cuaca global dan prakiraan cuaca.

Kelas cuaca kebakaran mengikuti ambang BMKG, seperti pada nomor 5. Untuk lapisan tanah dalam dipakai angka kekeringan tanah (DC): sampai 140 basah, sampai 260 lembap, sampai 350 kering, di atas 350 sangat kering.

Seberapa bisa dipercaya: LULUS pengujian. Rumusnya dibandingkan dengan paket acuan internasional dan selisihnya sangat kecil (kurang dari 0,006).

## 7. Penilaian firespot: "ya" atau "mungkin"

Penilaian ini meniru paparan Kementerian Kehutanan (SIPANTAU KARHUTLA) dengan beberapa perbedaan yang disengaja:

1. Untuk setiap kelompok, hari itu diberi kelas H bila ada sedikitnya satu titik berkeyakinan tinggi atau sedikitnya 4 kotak berbeda berkeyakinan sedang. Selain itu kelas M.
2. Lihat tiga hari berturut-turut (hari ini dan dua hari sebelumnya).
3. Firespot "ya" bila pola tiga harinya HH, H, MH, atau MMM. Selain itu "mungkin".
4. Firespot "mungkin" membatasi status tindakan paling tinggi di tingkat 1.

Yang dihitung adalah kotak berbeda, bukan titik, supaya satu api yang dilihat tiga satelit tidak terhitung tiga kali.

Seberapa bisa dipercaya: uji balik memakai data 2019 dan 2023 menunjukkan bahwa api besar tidak pernah tertinggal tanpa status "ya" (0 kasus), dan status Prioritas pemadaman tidak pernah tertunda. Sekitar seperlima sampai seperempat kelompok pada hari pertamanya masih berstatus "mungkin" (18 sampai 27 persen tergantung tahun). Uji hanya mencakup api besar dan tanpa data cuaca. Api malam hari lebih sulit mendapat keyakinan tinggi, jadi hampir seluruhnya lolos lewat jumlah kotak.
