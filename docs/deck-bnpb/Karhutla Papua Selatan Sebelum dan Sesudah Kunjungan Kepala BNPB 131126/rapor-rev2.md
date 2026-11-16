| Dimensi | Nilai | Bukti |
|---|---|---|
| Judul | 3 | Judul slide 5 dan 14 berbunyi "turun -57%" dan "hanya -17%", jadi negatifnya dobel. Judul slide 9 "hanya satu ukuran membaik" bertentangan dengan tabelnya sendiri, yang memuat empat baris membaik. Judul slide 10 menyajikan 83% vs 97% sebagai fakta, padahal angka itu rapuh (temuan 1). |
| Grafik | 4 | Grafik slide 2, 5, 10, dan 11 bersih dan angkanya cocok dengan data. Pita "Sesudah kunjungan" di slide 5 dan 10 mulai sekitar 31 Okt, dan di slide 5 pita itu memanjang sampai 12 Nov. Slide 10 tidak punya garis acuan 100% dan tidak punya garis rata-rata 83/97. |
| Tata letak | 4 | Struktur slide 2, 9, dan 14 rapi dan konsisten. Ikon kartu angka di slide 2 tidak seragam (api lawan panah). Label slide 2 bercampur bulat dan desimal: KPI 57% berdampingan dengan grafik 57,4%. |
| Sumber dan angka | 4 | Semua angka di slide 2, 5, 9, 10, 11, dan 14 cocok dengan hitungan ulang dari JSON mentah. Yang tidak konsisten hanya klaim "5 hari celah": hitungannya justru membuang 7 dari 10 rasio, jadi angka 96% hanya bertumpu pada 3 hari. |
| Alur | 3 | Urutannya runtut: luas, laju, belum padam, cluster, lalu ringkasan. Tetapi kesimpulan "penyusutan harian melambat" (slide 2, 9, 10, 14) bergantung pada hari pertama dan hari terakhir tiap jendela. Slide 9 mengaku ukurannya "tidak bergantung pada besar kecilnya kebakaran", padahal tidak sepenuhnya begitu. |
| Rasa mahal | 4 | Tampilannya rapi, tabel di slide 9 padat, dan kartu di slide 14 bersih. Yang menurunkan nilai adalah label "angka akhir" di slide 9 dan negatif dobel di slide 5, 9, dan 14. |

## Temuan

1. **Rasio harian "berbobot" 83% vs 97% praktis hanya membandingkan hari pertama dan hari terakhir tiap jendela (slide 2, 9, 10, 14).** Jumlah belum padam 21–30 Okt dibagi jumlah 20–29 Okt sama dengan 1 + (B30 Okt − B20 Okt) / jumlah(B20..B29). Delapan hari di tengah muncul di pembilang dan penyebut sekaligus, jadi saling meniadakan. Akibatnya angka 83% hampir seluruhnya digerakkan oleh 20 Okt (3.359 ha, hari bertanda celah) lawan 30 Okt (729 ha). Angka 97% digerakkan oleh 31 Okt (1.040 ha) lawan 10 Nov (677 ha).
   - Uji geser satu hari: jendela sebelum 22–31 Okt menjadi 92,8%, dan 20–29 Okt menjadi 90,3%. Jendela sesudah 2–11 Nov menjadi 101,8%, dan 31 Okt–9 Nov menjadi 95,3%.
   - Median rasio harian 82% sebelum dan 81% sesudah, praktis sama.
   - Kesimpulan "penyusutan harian melambat" belum layak dinyatakan sebagai temuan. Saran: tampilkan median atau rata-rata geometrik berdampingan, lalu tulis "belum terlihat beda yang jelas". Atau pakai ukuran ini hanya sebagai ulangan dari laju sepuluh hari, dan katakan itu terang-terangan.
2. **Penjelasan rata-rata berbobot keliru untuk pembaca awam (slide 9 dan 10).** Kalimat "hari dengan api besar lebih menentukan" dan "hari dengan api kecil tidak menarik angka berlebihan" hanya separuh benar. Rata-rata berbobot memang meredam lonjakan rasio dari hari kecil, misalnya 28 Okt 331% dan 10 Nov 316%. Tetapi hasil akhirnya setara dengan "belum padam akhir jendela dibanding awal jendela", jadi ukuran ini tidak baru. Usul kalimat pengganti: "Rata-rata berbobot = total belum padam sepuluh hari dibagi total sehari sebelumnya; hasilnya hampir sama dengan membandingkan hari terakhir dengan hari pertama, sehingga satu hari ekstrem di ujung bisa menggeser angkanya." Label "Terdistorsi hari kecil" di slide 9 boleh tetap.
3. **Klaim celah di slide 10 tidak konsisten dan dasarnya tipis.** Slide menulis "5 hari terkena celah". Kode memang menghitung 5 hari celah di dalam jendela (21, 22, 24, 25, 26 Okt), tetapi rasio yang dibuang ada 7 (21–27 Okt), karena hari sebelumnya ikut diperiksa. Angka 96% hanya dari 3 rasio (28–30 Okt). Tambahan lagi, penyebut 21 Okt adalah 20 Okt, yang juga hari celah. Tulis "tinggal 3 hari bersih", atau turunkan klaim "hampir sama dengan sesudahnya" menjadi catatan kehati-hatian.
4. **Slide 9 bertentangan dengan dirinya sendiri, dan berlebihan pada judul.** Judulnya "hanya satu ukuran membaik". Tabelnya menunjukkan empat ukuran membaik: belum padam dibanding luas 67→61, luas padam sehari 14→28, luas lebih dari tiga hari 64→37, dan jumlah lebih dari tiga hari 23→15. Seksi "Intinya" sendiri menulis "Semua laju turun ... lebih kecil", sementara baris belum padam per luas membaik. Kepala tabel "Ukuran yang tidak bergantung pada besar kecilnya kebakaran" juga berlebihan. Persen turun tetap dipengaruhi tingkat awal: periode sebelum turun dari puncak ekstrem (6 Okt 17.227 ha, 11 Okt 10.595 ha), sedangkan periode sesudah sudah dekat lantai api sisa dan hujan. Selain itu, celah 20 dan 24 Okt menekan luas jendela sebelum, sehingga angka -57% terdorong ke atas. Saran: "Dua dari tiga kelompok ukuran melambat; ukuran lama menyala membaik", dan sebut efek puncak serta lantai dalam satu kalimat.
5. **Pembobotan luas pada cluster (slide 2, 9, 11, 14) memihak periode sebelum, dan tafsirnya berlebihan.**
   - Luas cluster tumbuh selama api menyala, jadi cluster yang lama hampir pasti juga luas. Pembobotan luas melipatgandakan efek lama menyala.
   - Cluster sesudah diamati 6,5–11,5 hari, sedangkan cluster sebelum 12,5–17 hari. Masih menyala di akhir data: 17 cluster sesudah (20% luas) lawan 8 cluster sebelum (7% luas). Luas cluster sesudah karena itu terpotong.
   - Uji koreksi: luas tiap cluster dipotong secara proporsional sampai enam hari pertamanya. Porsi lebih dari tiga hari menjadi 60% vs 35%, bukan 64% vs 37%. Arahnya tetap, besarnya sedikit menyusut. Ambang lebih dari tiga hari sendiri aman dari pemotongan karena pengamatan terpendek 6,5 hari.
   - Tafsir "api besar lebih cepat padam" melampaui ukurannya. Yang diukur adalah porsi luas di cluster yang lama menyala, bukan kecepatan padam api besar. Saran: "porsi luas dari api yang menyala lebih dari tiga hari turun".
   - "Lima hari terakhir Oktober" (slide 11) sebenarnya 26–30 Okt, karena 31 Okt dikecualikan. Tulis "26–30 Okt".
6. **Negatif dobel di slide 5, 9, dan 14.** "Turun -57%" dan "hanya -17%" di judul slide 5 dan kartu slide 14, juga baris "Laju turun ... (%)" berisi -57 dan -17 di slide 9. Pilih salah satu: "turun 57%" atau "berubah -57%".
7. **Label slide 9 "Luas terbakar per hari, angka akhir (ha)" keliru.** Angka 1.978 dan 1.649 adalah rata-rata sepuluh hari, bukan angka akhir. Tulis "rata-rata per hari".
8. **Pita "Sesudah kunjungan" (slide 5 dan 10) mulai di 31 Okt.** Di slide 5 pita itu juga mencakup 11–12 Nov, padahal jendela sesudah adalah 1–10 Nov dan hari kunjungan dikecualikan. Pita sebaiknya 1–10 Nov, dengan penanda tipis untuk 31 Okt.
9. **Angka 68% "penurunan di luar Merauke" (slide 2 dan 14) benar tetapi mudah salah baca.** Total penurunan provinsi hanya sekitar 3.288 ha per sepuluh hari. Tiga kabupaten lain hanya membakar 2.443 ha sebelum kunjungan (turun sekitar 92%), sementara Merauke memegang 99% luas. Slide 7 sudah menjelaskan konteks ini; di slide 2 cukup tambahkan "Merauke hanya turun 6%".
10. **Visual kecil.**
    - Slide 10 tanpa garis acuan 100% dan tanpa garis rata-rata periode, padahal anak judul memintanya. Garis acuan bukan sumbu Y.
    - Slide 2 mencampur bulat dan desimal: KPI 57% dan 17% berdampingan dengan grafik 57,4% dan 16,6%. Anotasi "turun 75,2%" (Awal Okt ke sesudah) tidak dijelaskan.
    - Ikon kartu angka di slide 2 tidak seragam.

## Hitungan ulang (semua cocok, dibulatkan seperti di deck)

- Rata-rata per sepuluh hari, luas: 6.646, 4.646, 1.978, 1.649 (perubahan -30,1%, -57,4%, -16,6%; Awal Okt ke sesudah -75,2%).
- Rata-rata per sepuluh hari, belum padam: 4.676, 3.114, 1.330, 1.009 (perubahan -57,3% dan -24,1%).
- Rata-rata per sepuluh hari, hotspot: 3.788, 2.804, 1.207, 844 (perubahan -57,0% dan -30,1%).
- Rasio belum padam: berbobot 83,5% dan 96,5%; rata-rata biasa 109,9% dan 120,5%; median 82,4% dan 80,6%; geometrik 85,8% dan 95,8%; tanpa celah 96,5% dari 3 hari.
- Padam dua hari berbobot 54,5% dan 51,9%. Belum padam dibanding luas 67,2% dan 61,2%.
- Cluster: n = 369 dan 358. Menurut jumlah 37,7/39,6/22,8 dan 53,4/31,6/15,1. Menurut luas 14,0/22,1/63,8 dan 28,5/34,1/37,5.
- Porsi luar Merauke 68,0%. Porsi nasional Papua Selatan sejak 1 Nov 24,7%.
- Label grafik slide 5: 4.286, 2.954, 255, 153, puncak 17.227. Label grafik slide 10: 88, 331, 316.
- Hotspot sesudah kunjungan tertinggi di Kontuar (1.265) dan Kimaam (1.093), sesuai arahan slide 14.
