# Status cluster dihitung bagaimana

Halaman ini menjelaskan cara status cluster ditentukan dan cara cluster diurutkan menurut prioritas.

## Status cluster

Status ditentukan dari dua hal: seberapa besar apinya dan seberapa kering cuacanya.

Ukuran api dibagi tiga tingkat:

| Ukuran | Syarat |
| --- | --- |
| Besar | Piksel menyala dalam 24 jam sedikitnya 10, atau menyala sedikitnya 4 hari dengan sedikitnya 5 piksel dalam 24 jam |
| Kecil | Deteksi kurang dari 3 dan menyala paling lama 1 hari |
| Sedang | Selain keduanya |

Cuaca memakai indeks bahaya kebakaran (FWI) dari BMKG: 0 sampai 1 rendah, 2 sampai 6 sedang, 7 sampai 13 tinggi, dan 14 ke atas sangat tinggi. Sebagai gambaran, FWI 9 berarti cuaca sangat mendukung api menjalar, sehingga cluster yang sama patut dijaga lebih ketat daripada saat FWI 3. Kekeringan tanah (indeks DC) juga ditampilkan di laci cluster dan ikut dipakai pada urutan prioritas, tetapi tidak menentukan status: nilai 0 sampai 140 berarti basah, 141 sampai 260 lembap, 261 sampai 350 kering, dan di atas 350 sangat kering.

Aturan penentuan status:

1. Mulai dari ukuran api. Bila cuaca tidak tersedia, api kecil dan sedang diberi status 1 dan api besar status 2.
2. Bila FWI di bawah 7, api kecil turun ke status 0, sedangkan api sedang dan besar menjadi status 1.
3. Bila FWI 7 atau lebih, api kecil tetap status 1, sedangkan api sedang dan besar menjadi status 2.
4. Cuaca hanya boleh menaikkan status. Api besar selalu berstatus minimal 2.
5. Status 3 (Prioritas pemadaman) hanya diberikan kepada cluster yang sudah berstatus 2, masih teramati satelit dalam 24 jam terakhir, punya sedikitnya 15 piksel menyala dalam 24 jam, dan FWI sedikitnya 7 (atau FWI tidak tersedia). Cluster yang tidak teramati dalam 24 jam, misalnya bara gambut yang dipertahankan lebih lama, tidak naik ke status 3.

Ringkasan status dasar sesudah aturan 1 sampai 3 (aturan 4 lalu menaikkan api besar ke minimal 2, aturan 5 menentukan status 3):

| Ukuran api | FWI di bawah 7 | FWI 7 atau lebih | Cuaca tidak tersedia |
| --- | --- | --- | --- |
| Kecil | 0 | 1 | 1 |
| Sedang | 1 | 2 | 1 |
| Besar | 1 | 2 | 2 |

Contoh: sebuah cluster punya 12 piksel menyala dalam 24 jam, sehingga tergolong api besar. FWI di lokasi 9 (tinggi). Statusnya 2 (Siaga pemadaman awal). Karena piksel 24 jam belum mencapai 15, belum naik ke status 3 (Prioritas pemadaman).

Seberapa bisa dipercaya: ambang 10 piksel dan FWI 7 diuji dengan uji balik pada Agustus sampai Oktober 2019 dan 2023 di sembilan provinsi. Ambang itu sudah menandai lebih dulu 90 dari tiap 100 api yang akhirnya besar pada 2019 dan 95 dari tiap 100 pada 2023 (api besar berarti sedikitnya 100 piksel, ditandai sebelum api mencapai separuh ukuran akhirnya). Di sisi lain, dari tiap 100 tanda yang diberikan, hanya 53 (2019) dan 35 (2023) yang benar-benar membesar. Artinya sistem sengaja berhati-hati dan akan ada tanda yang ternyata tidak membesar. Ambang 15 piksel untuk tiga satelit belum diuji ulang dengan data satelit NOAA-20 saja.

## Urutan prioritas cluster

Skor urutan menjawab "cluster mana yang didahulukan", bukan "cluster mana yang boleh ditangani". Semua cluster tetap tampil.

Skor makin besar bila:

1. Jumlah piksel menyala 24 jam makin banyak.
2. Daya pancar panas (FRP, ukuran kekuatan panas api menurut satelit) makin tinggi.
3. Hari menyala makin banyak (dihitung sampai 5 hari).
4. Cuaca makin kering dan makin mudah menjalar (indeks penyebaran api, dan kekeringan tanah di atas 350 memberi tambahan).
5. Pos pemadam terdekat makin jauh. Jarak 150 km atau lebih memberi tambahan penuh.

Faktor-faktor itu dikalikan, bukan dijumlah dengan bobot yang diatur tangan. Skor lalu disesuaikan dengan indeks risiko kecamatan. Contoh: dua cluster sama-sama berpiksel menyala banyak, tetapi yang satu sudah menyala empat hari di lahan kering dan jauh dari pos pemadam, sedangkan yang lain baru menyala sehari di dekat pos. Yang pertama mendapat skor lebih tinggi sehingga didahulukan. Cara menghitung ini belum diuji terhadap catatan eskalasi dan padam yang sebenarnya, karena itu kartu "Alasan peringkat" diberi tanda hipotesis: pakai sebagai bahan pertimbangan, bukan sebagai keputusan.
