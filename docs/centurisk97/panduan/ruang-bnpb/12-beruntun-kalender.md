# Gempa beruntun, kalender, pimpinan

Halaman ini menjelaskan cara menghitung gempa beruntun, kalender ancaman, dan dashboard pimpinan lintas bencana.

## Gempa beruntun di sekitar gunung api

Data yang dipakai: katalog gempa USGS (lembaga geologi Amerika Serikat), gempa magnitudo 4,5 ke atas.

1. Hitung jumlah gempa dalam 7 hari terakhir dalam lingkaran 30 km di sekitar tiap gunung api.
2. Bandingkan dengan laju historis di lingkaran yang sama sejak tahun 2000.
3. Hitung peluang bahwa jumlah sebanyak itu terjadi hanya karena kebetulan. Hitungan ini memperhitungkan bahwa gempa cenderung datang bergerombol, jadi gerombolan biasa tidak langsung dianggap aneh.
4. Ditandai "perlu dicek" bila peluang itu di bawah 0,01 dan ada sedikitnya 3 gempa.

Contoh: bila di sebuah gunung biasanya hanya sekitar 1 gempa per pekan lalu pekan ini ada 5, peluang kebetulannya sangat kecil, dan gunung itu ditandai "perlu dicek" bila peluangnya di bawah 0,01.

Ini deteksi Centurisk97, bukan prediksi gempa dan bukan peringatan. Gempa kecil vulkanik tidak terlihat karena hanya magnitudo 4,5 ke atas yang dihitung. Status: belum teruji.

## Kalender ancaman

Untuk tiap kabupaten, bahaya, dan bulan, ada dua kolom berdampingan tanpa skor gabungan.

- Kolom pertama: seberapa sering bulan itu punya kejadian di catatan piket, yaitu jumlah tahun yang punya kejadian dibagi jumlah tahun, selalu disertai pembilang dan penyebutnya. Kolom ini dikosongkan bila total setahun kurang dari 5 kejadian.
- Kolom kedua: apa yang disebut narasi prakiraan BMKG untuk bulan itu. Bila tidak disebut, tertulis "tidak disebut".

Contoh baris: Kabupaten X, banjir, Januari, kolom pertama "8 dari 9 tahun", kolom kedua "BMKG menyebut curah hujan di atas normal". Artinya: Januari hampir selalu ada kejadian banjir di kabupaten itu, dan BMKG juga menyebut hujan tinggi bulan itu.

Ini bukan prediksi Centurisk97 dan belum diuji balik.

## Dashboard pimpinan lintas bencana

Untuk tiap bencana, sistem mengambil ringkasan harian apa adanya (termasuk status segar, basi, atau mati) dan menghitung beberapa angka operasi dari catatan yang tersimpan: rencana lapangan terbit hari ini dan 30 hari, kepatuhan (kunjungan dibagi target), tindakan terbuka, SK berlaku, dan SK berakhir dalam 7 hari (batas 7 hari adalah bawaan sementara). Contoh kepatuhan: 8 kunjungan dari target 10 berarti 80 persen. Bila datanya belum ada, hasilnya kosong, bukan nol. Angka antarsumber tidak dijumlahkan.
