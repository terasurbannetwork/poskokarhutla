# Hujan lebat, debit, dan pos sungai

Halaman ini menjelaskan cara peluang hujan lebat, debit sungai, waktu tempuh air, dan status pos tinggi air dihitung.

## Peluang hujan lebat dari ansambel

**Bahan.** Prakiraan ansambel ECMWF. Ansambel berarti cuaca yang sama dijalankan 51 kali dengan sedikit variasi awal; semakin banyak hasil yang sepakat, semakin besar peluangnya. Dihitung untuk 349 titik di seluruh Indonesia, diperbarui harian.

**Langkah hitung:**

1. Untuk tiap titik dan tiap hari, hitung berapa dari 51 hasil yang memprakirakan hujan 50 mm atau lebih dalam sehari (dan hitungan serupa untuk 100 mm atau lebih).
2. Peluang adalah pecahan hasil itu. Bila 15 dari 51 hasil memprakirakan hujan 50 mm atau lebih, peluangnya sekitar 29 persen.
3. Untuk kabupaten, diambil titik terdekat yang nilainya terbesar; untuk provinsi, kabupaten yang terbesar.

**Seberapa bisa dipercaya.** Peluang untuk kabupaten adalah nilai titik terdekat yang tertinggi, jadi peluang sebenarnya bahwa hujan lebat terjadi di mana saja dalam kabupaten bisa lebih besar. Belum bisa dinilai apakah angka 30 persen benar-benar berarti 30 persen. Kabupaten yang tidak tampil bukan berarti bebas risiko; daftar hanya memuat kabupaten yang punya sinyal.

## Debit sungai dan batas banjir berulang

**Bahan.** Debit harian dari model GloFAS (satu sel sekitar 5 km) dari 1997 sampai 2025.

**Langkah hitung:**

1. Pilih hanya sungai besar, yaitu titik dengan debit tengah di atas 30 meter kubik per detik.
2. Untuk tiap titik, ambil debit tertinggi tiap tahun (hanya tahun yang datanya hampir lengkap, sedikitnya 300 hari).
3. Dari nilai tahunan itu (paling banyak 29 tahun, 1997 sampai 2025), hitung debit banjir yang terulang tiap 2, 5, dan 20 tahun dengan perhitungan statistik khusus untuk banjir terbesar tiap tahun. "Terulang tiap 5 tahun" berarti dalam jangka panjang rata-rata satu kali tiap 5 tahun. Itu bukan jadwal: bisa terjadi dua kali dalam dua tahun, lalu tidak terjadi selama sepuluh tahun.
4. Tiap hari, bandingkan debit prakiraan dengan tiga batas itu: melewati batas 2 tahun menjadi kelas 1 (Waspada), 5 tahun kelas 2 (Siaga), 20 tahun kelas 3 (Awas).

**Seberapa bisa dipercaya.** Batas dan prakiraan berasal dari model yang sama, sehingga kesalahan model saling meniadakan. Meskipun begitu, jalur sungai belum diuji balik. Yang tercakup hanya sungai besar.

## Waktu tempuh air dari hulu ke hilir

Keterangan ini hanya gambaran dan tidak mengubah status. Contoh cara membacanya: daerah aliran sungai (DAS) dibagi menjadi bagian-bagian kecil (sub-DAS). Dihitung seberapa besar bagian hujan total yang jatuh di tiap sub-DAS, lalu berapa lama air dari sub-DAS itu sampai ke kecamatan di hilir. Waktu bertambah bila jaraknya jauh dan berkurang bila lerengnya curam. Jarak diukur garis lurus antara titik tengah lalu dikali faktor kelokan sungai (bawaan 1,0, artinya sungai dianggap lurus).

Satu-satunya pembanding terukur adalah replay Maret 2025, yang menunjukkan jeda sekitar 8,5 jam dari pos hulu ke pos hilir.

## Status pos tinggi air sungai

**Langkah hitung** untuk tiap pos, dari yang paling diprioritaskan:

1. Bila satuannya bukan tinggi air (misalnya debit), statusnya "Bukan tinggi air".
2. Bila pembacaan terakhir lebih dari 5 jam yang lalu: "Data lama". Bila angkanya sama selama 12 jam: "Macet".
3. Bila riwayat kurang dari 7 hari: "Riwayat kurang". Bila 7 sampai 14 hari: "Pantauan terbatas". Bila ada pembacaan pembanding yang hilang: "Data bolong".
4. Bila kenaikan 3 jam terakhir jauh lebih besar dari kebiasaan pos itu sendiri: "Naik di atas biasa". "Jauh lebih besar" artinya melebihi 99 persen dari seluruh kenaikan 3 jam yang pernah tercatat di pos itu dalam 90 hari terakhir, dan paling sedikit 20 cm bila satuannya diketahui.
5. Bila ketinggian melebihi rekor pos itu dan riwayatnya sedikitnya 30 hari: "Tertinggi".
6. Selain itu: "Biasa".

**Contoh.** Sebuah pos selama 90 hari terakhir paling banyak naik 40 cm dalam 3 jam. Hari ini naik 70 cm dalam 3 jam dan datanya baru dibaca 1 jam lalu. Statusnya "Naik di atas biasa".

Bila pengelola pos memberi status resmi (Normal, Siaga 3, Siaga 2, Siaga 1), status itu dipakai apa adanya, kecuali data lama atau macet.

**Seberapa bisa dipercaya.** Penilaian ini hanya membandingkan pos dengan riwayatnya sendiri, jadi bukan ukuran bahaya mutlak. Untuk pos yang tidak punya ambang resmi, pakailah sebagai petunjuk bahwa ada perubahan tidak biasa.
