# Status dan peluang longsor

Halaman ini menjelaskan status harian, nowcast kerentanan, dan simulasi peluang longsor.

## Status longsor harian per kecamatan

**Pertanyaan.** Kecamatan mana yang hari ini dan tiga hari ke depan perlu siaga longsor.

**Langkah.**

1. Ambil per kecamatan: hujan 3 hari, hujan 7 hari, kelembapan tanah, hujan per jam terbesar, dan indeks bahaya longsor (angka 0 sampai 1, makin besar makin rawan).
2. Ambang hujan banjir 50, 100, dan 150 mm dikalikan 0,6 untuk longsor, jadi ambang longsor adalah 30, 60, dan 90 mm hujan dalam 3 hari.
3. Tanah dianggap jenuh bila kelembapannya 0,45 atau lebih dan hujan 7 hari 25 mm atau lebih. Bila data kelembapan tidak ada, tanah dianggap jenuh bila hujan 7 hari 150 mm atau lebih.
4. Terapkan aturan:

| Status | Syarat |
| --- | --- |
| Awas | hujan 3 hari 90 mm atau lebih, tanah jenuh, dan indeks bahaya 0,66 atau lebih |
| Siaga | hujan 3 hari 60 mm atau lebih, tanah jenuh, dan indeks bahaya 0,66 atau lebih; atau hujan 3 hari 90 mm atau lebih dan indeks bahaya 0,33 atau lebih; atau hujan per jam terbesar 20 mm atau lebih dan indeks bahaya 0,66 atau lebih |
| Waspada | hujan 3 hari 30 mm atau lebih dan indeks bahaya 0,33 atau lebih |
| Normal | selain itu |

**Contoh.** Sebuah kecamatan punya indeks bahaya 0,7, tanah jenuh, dan hujan 3 hari 70 mm. Hujan 70 mm belum mencapai 90 mm untuk Awas, tetapi memenuhi 60 mm dengan tanah jenuh dan indeks bahaya 0,66 atau lebih, jadi statusnya Siaga.

**Seberapa bisa dipercaya.** Menurut keterangan pembuat aturan, ambang dipilih memakai data 2016 sampai 2021 dan lolos uji pada 2022 sampai 2025, tetapi angkanya belum diperiksa ulang di dokumentasi ini. Indeks bahaya longsor diambil dari peta kerawanan kecamatan dan asal pembuatannya belum terdokumentasi di sini.

## Nowcast kerentanan longsor

**Pertanyaan.** Kecamatan mana yang berbahaya tinggi atau sedang hari ini.

**Langkah.**

1. Skor kerentanan S = 0,5 kali skor lereng + 0,3 kali skor zona rawan dari PVMBG + 0,2 kali skor kedekatan sesar (garis patahan di bumi). Skor lereng 0 pada kemiringan 5 derajat dan 1 pada 30 derajat. Skor kedekatan sesar 0 pada jarak 50 km atau lebih dari sesar.
2. Hitung t = hujan 7 hari teramati dibagi hujan 7 hari yang tergolong lebat di tempat itu. Hujan lebat di sini adalah nilai persentil ke-95: hanya 5 dari 100 pekan yang lebih deras.
3. Bahaya tinggi bila t 1 atau lebih dan S 0,50 atau lebih. Bahaya sedang bila t 1 atau lebih dan S 0,30 atau lebih, atau t 0,8 atau lebih dan S 0,50 atau lebih.

**Contoh.** S = 0,55 dan hujan 7 hari saat ini sama dengan batas lebat (t = 1) menghasilkan bahaya tinggi. Bila t hanya 0,85 dengan S yang sama, hasilnya bahaya sedang.

**Seberapa bisa dipercaya.** Kesimpulannya: model ini lebih buruk dari tebakan berdasarkan kebiasaan kabupaten, jadi jangan dijadikan dasar keputusan. Model ini hipotesis dan gagal uji balik tiga kali berturut-turut (29 Oktober, 30 Oktober, dan 2 November 2026). Pada uji di 453 kabupaten, skor AUC model 0,7047, sedangkan tebakan sederhana yang hanya memakai kebiasaan kabupaten per bulan mencapai 0,7773. Model juga hanya mendeteksi 16,8 persen kejadian, dan 98,7 persen peringatannya tidak diikuti kejadian. Bobot sengaja tidak disetel ke tahun uji supaya hasil uji jujur.

## Simulasi peluang longsor dangkal

**Pertanyaan.** Seberapa besar peluang lereng tanah dangkal bergerak setelah hujan.

**Langkah.**

1. Hitung faktor keamanan lereng tanah setebal 1,5 m: kekuatan tanah menahan dibagi gaya yang menarik tanah turun. Faktor di bawah 1 berarti lereng bergerak.
2. Air hujan 7 hari mengisi pori tanah (dikurangi 50 persen yang hilang) dan menaikkan muka air di dalam tanah, sehingga kekuatan menahan berkurang.
3. Kekuatan tanah tiap titik tidak diketahui, jadi hitungan dijalankan untuk kisaran kohesi (kekuatan rekat tanah) 2 sampai 10 kPa dan sudut gesek (kekasaran antarbutir tanah) 26 sampai 36 derajat. Peluang adalah bagian kisaran itu yang menghasilkan faktor kurang dari 1.

**Contoh.** Bila dari seluruh kombinasi kekuatan tanah yang dicoba, 3 dari 10 menghasilkan faktor di bawah 1, peluangnya 30 persen.

**Seberapa bisa dipercaya.** Ilustrasi tanpa uji balik.
