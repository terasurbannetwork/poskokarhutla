# Abrasi, rob, dan rencana lanjutan

Halaman ini menjelaskan abrasi garis pantai, rob, pasang surut, dan gelombang.

## Abrasi garis pantai dari citra satelit

**Pertanyaan.** Apakah garis pantai maju atau mundur, dan seberapa cepat.

**Langkah.**

1. Pada tiap titik garis pantai di lima lokasi pantura, ditarik garis ukur tegak lurus pantai setiap 1 km, sepanjang 3 km ke darat dan 4 km ke laut, dengan titik sampel tiap 15 m.
2. Citra satelit Landsat 4 sampai 9 (1988 sampai 2025) diambil, awan dibuang, lalu satelit membedakan air dari darat lewat warna citra, dengan batas air dan darat dihitung otomatis dari seluruh sampel, bukan memakai angka tetap, karena tambak di pantura terbaca sebagai laut bila memakai angka tetap.
3. Untuk tiap tahun, diambil nilai tengah dari semua pengamatan tahun itu (paling sedikit 2 pengamatan per titik). Tahun berjalan tidak dipakai.
4. Garis pantai adalah titik pertama dari arah laut yang berubah dari air menjadi darat yang bersambung 60 m atau lebih.
5. Laju = kemiringan garis lurus dari jarak garis pantai terhadap tahun, dengan selang kepercayaan 95 persen. Nilai yang sangat menyimpang dibuang sekali.
6. Kelas: "abrasi" bila seluruh selang di sisi mundur, "akresi" (daratan maju) bila seluruh selang di sisi maju, dan "tidak nyata" bila selang memuat nol atau keyakinan rendah.
7. Tingkat keyakinan:

| Keyakinan | Syarat |
| --- | --- |
| Sedang | 8 titik tahun atau lebih |
| Tinggi | 15 titik tahun atau lebih, dan kecocokan garis lurus (r kuadrat) 0,5 atau lebih |

Keyakinan turun satu tingkat bila membuang nilai menyimpang membalik arah atau membuat hasil nyata.

8. Lompatan lebih dari 300 m antartahun diperiksa. Bila posisi pulih 60 persen atau lebih dalam 2 tahun, dianggap salah baca citra dan tahun itu dibuang.

**Contoh.** Sebuah garis ukur menunjukkan garis pantai mundur sekitar 25 m per tahun dengan selang 95 persen dari minus 30 sampai minus 20 m per tahun. Seluruh selang ada di sisi mundur dan datanya cukup, jadi kelasnya "abrasi". Bila selangnya minus 30 sampai plus 5, kelasnya "tidak nyata".

**Seberapa bisa dipercaya.** Hasilnya 167 garis ukur di 5 lokasi untuk periode 1988 sampai 2025. Belum ada koreksi pasang surut, sehingga laju antartahun lebih bisa dipegang daripada posisi satu tahun. Di Sayung, abrasi gelombang dan penurunan tanah tidak bisa dipisahkan.

## Rob, pasang surut, dan gelombang

**Status rob.** Memakai tinggi muka laut per jam dari model Open-Meteo. Untuk tiap titik, tinggi tertinggi harian dibandingkan dengan riwayat model itu sendiri:

| Tingkat | Syarat |
| --- | --- |
| Waspada | mencapai persentil ke-95 (hanya 5 dari 100 hari yang lebih tinggi) |
| Siaga | mencapai persentil ke-99 |
| Awas | persentil ke-99 ditambah 0,10 m, atau setinggi tertinggi yang teramati sejak 2022, mana yang lebih besar |

Karena dibandingkan terhadap model yang sama, kesalahan tinggi acuan saling meniadakan. Penanda "gabung" muncul bila muka laut mencapai persentil ke-95 atau lebih dan gelombang 1,25 m atau lebih. Dari 66 titik, 22 belum punya arsip riwayat dan ditandai "Tanpa ambang", bukan Normal.

**Contoh.** Tinggi muka laut hari ini lebih tinggi dari 95 dari 100 hari biasanya di titik itu, jadi statusnya Waspada.

**Kelas gelombang BMKG Maritim.** Rendah di bawah 1,25 m, sedang 1,25 sampai 2,5 m, tinggi 2,5 sampai 4 m, sangat tinggi 4 sampai 6 m, dan ekstrem 6 m atau lebih. Peringatan gelombang BMKG tampil per provinsi dengan kelas tertinggi, dan kelas "sedang" bukan peringatan.

**Seberapa bisa dipercaya.** Ambang persentil ke-95 diuji pada 26 kejadian rob di 16 kabupaten, dan hasilnya tidak jauh beda dari ambang lain yang dicoba, jadi pilihan ambang ini tidak terbukti istimewa. Kejadian rob tercatat 565 di 179 kabupaten, dengan 33,7 persen jatuh dalam 2 hari dari bulan baru atau purnama (27 persen bila acak). Sinyal ini lemah dan ditentukan beberapa episode, sehingga tidak dijadikan temuan. Uji balik rob menunggu arsip muka laut harian yang belum ada.

## Rencana yang belum menjadi layar

Tiga paket masih berupa rancangan dan belum bisa dipakai di situs:

- **Genangan tsunami di darat.** Rencananya menghitung genangan dengan simulasi tsunami khusus, dihitung dulu secara terpisah oleh tim kami, dengan pustaka skenario per pantai. Tiga pantai pertama: Ujung Kulon, Pangandaran sampai Cilacap, dan Banyuwangi sampai Rajegwesi. Hasilnya akan berlabel hipotesis sampai uji balik lulus, dengan kalimat batas wajib di samping legenda.
- **Bangunan di lereng terjal.** Rencananya menghitung bangunan yang berdiri di lereng 40 persen atau lebih per kecamatan dan desa, hanya bila dua peta tinggi daratan sepakat. Baru bahan dasarnya yang ada, belum ada layar.
- **Panel pemantauan sensor dan kamera.** Rencananya untuk banjir dan gunung api, memuat status alat, alat yang terputus, grafik, dan kamera yang berizin. Alat terputus tidak akan pernah ditampilkan sebagai nol.
