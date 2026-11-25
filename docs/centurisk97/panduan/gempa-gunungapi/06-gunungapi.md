# Level, paparan, dan gempa beruntun

Halaman ini menjelaskan level gunung api, paparan penduduk, dan gempa beruntun di sekitar gunung api.

## Gempa beruntun di sekitar gunung api

**Pertanyaan.** Apakah ada rentetan gempa yang tidak biasa di dekat gunung api.

**Langkah.**

1. Untuk tiap dari 69 gunung api, hitung jumlah gempa M 4,5 atau lebih dalam 7 hari terakhir di radius 30 km. Sebut N.
2. Hitung berapa lazimnya gempa seminggu di sana dari riwayat tahun-tahun lain (tahun yang sedang diperiksa tidak ikut dihitung).
3. Hitung peluang bahwa N sebanyak itu atau lebih terjadi hanya karena kebetulan. Hitungan ini memperhitungkan bahwa gempa cenderung bergerombol, bukan tersebar rata. Hasilnya dikali jumlah gunung yang diperiksa, supaya peringatan tidak mudah menyala hanya karena banyaknya gunung yang dipantau.
4. Peringatan menyala bila N paling sedikit 3 dan peluang kebetulannya di bawah 0,01, yaitu di bawah 1 persen.

**Contoh (ilustrasi).** Sebuah gunung lazimnya mengalami 1 gempa per minggu, tetapi minggu ini 4. Bila peluang kebetulannya kurang dari 1 persen, peringatan "perlu dicek" menyala.

**Seberapa bisa dipercaya.** Hipotesis berlabel "perlu dicek". Dalam uji mundur atas 1.398 minggu, peringatan menyala pada 0,011 persen pasangan gunung dan minggu (11 kali). Ambang tidak disetel dari hasil, tetapi belum ada uji ke depan. Rentetan gempa vulkanik kecil tidak terlihat oleh sumber USGS, sehingga gempa vulkanik dari PVMBG ditampilkan terpisah.

## Level gunung api dan data pendukung

Level resmi diambil dari MAGMA Indonesia milik PVMBG setiap 30 menit. Bila halaman sumber memuat kurang dari 40 gunung, hasilnya ditolak, dan bila tiga putaran berturut-turut gagal (sekitar 90 menit) data ditandai basi. Laporan harian per gunung (radius rekomendasi, gempa vulkanik 24 jam, letusan terbaru) diambil di waktu terpisah dari halaman publik PVMBG.

Ini data resmi yang disalin, bukan model. Level selalu berlabel PVMBG dan jam terbitnya.

## Paparan penduduk di sekitar gunung api

**Pertanyaan.** Berapa penduduk, sekolah, dan fasilitas kesehatan yang berada di kawasan rawan.

**Langkah.**

1. Pakai zona kawasan rawan bencana resmi (I, II, III) dari ESDM, dan bila tidak ada, pakai cincin radius.
2. Hitung desa, sekolah, fasilitas kesehatan, dan titik kumpul dalam 20 km memakai peta terbuka OpenStreetMap.
3. Hitung penduduk dari data kepadatan WorldPop yang dibagi per kotak 1 km: kotak yang titik tengahnya jatuh di zona dihitung penuh, jadi galat di tepi zona sekitar 1 km. Penduduk per desa dibagi ke desa terdekat dalam 3 km.
4. Rute evakuasi dicari di jaringan jalan dari titik di luar zona III dan II serta di luar radius rekomendasi ditambah 2 km.

**Contoh.** Sebuah kotak 1 km yang titik tengahnya berada di zona III dihitung seluruh penduduknya, walaupun separuh kotak itu sebenarnya di luar zona.

**Seberapa bisa dipercaya.** Ini hitungan paparan, bukan prakiraan korban. Sekolah dan fasilitas kesehatan hanya tampil di provinsi yang datanya ada.
