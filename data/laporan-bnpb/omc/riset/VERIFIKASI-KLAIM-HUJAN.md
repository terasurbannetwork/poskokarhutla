# Verifikasi klaim hujan OMC terhadap CHIRPS dan METAR

Sumber hujan: CHIRPS-2.0 prelim harian 0,05 derajat (rata-rata sel dalam poligon kab/kota; hari UTC), tersedia sampai 24 Okt 2026. METAR: bandara IEM yang titiknya jatuh dalam kab (WAOO, WIPP, WIOO, WIBB, dll). GSMaP dan IMERG tidak tersedia (tanpa kredensial). Klaim di luar kab/kota (kecamatan, taman nasional, jalan tol) dan klaim tanggal 25 sampai 27 Okt tanpa METAR hujan tidak bisa dicek.

Ringkasan: cocok 83, klaim nihil sesuai 2, klaim nihil tidak sesuai 1, lemah 14, tidak bisa dicek 45, tidak cocok 16

Aturan: cocok bila rata-rata kab >= 1 mm atau METAR hujan; lemah 0,1 sampai 1 mm; tidak cocok < 0,1 mm dan METAR kering atau tanpa METAR. CHIRPS memiliki resolusi 5 km dan hari UTC, hujan sore di sebagian kecil kab dapat luput dari rata-rata. Satu kab = satu klaim.

| Tanggal | Provinsi | Kab/kota | Rata (mm) | Maks sel | METAR | Median 1-15 Okt | Tetangga kontrol | Vonis |
|---|---|---|---:|---:|---|---:|---:|---|
| 10-16 | Kalimantan Barat | Kota Singkawang | 10.5 | 20.5 |  | 8.1 | 10.8 | cocok |
| 10-16 | Kalimantan Barat | Kota Pontianak | 3.3 | 7.3 |  | 0.0 | 7.6 | cocok |
| 10-16 | Kalimantan Barat | Kayong Utara | 14.3 | 22.6 |  | 1.4 | 9.1 | cocok |
| 10-16 | Kalimantan Barat | Bengkayang | 10.8 | 21.8 |  | 7.1 | 7.7 | cocok |
| 10-16 | Kalimantan Barat | Kubu Raya | 9.1 | 23.6 | WIOO hujan | 3.8 | 5.2 | cocok |
| 10-16 | Kalimantan Barat | Mempawah | 6.1 | 14.2 |  | 6.6 | 7.7 | cocok |
| 10-16 | Kalimantan Barat | Ketapang | 2.4 | 20.4 |  | 0.8 | 4.4 | cocok |
| 10-16 | Kalimantan Barat | Sintang | 5.5 | 27.7 |  | 4.3 | 4.9 | cocok |
| 10-16 | Kalimantan Barat | Sambas | 10.9 | 22.8 |  | 5.7 | 10.6 | cocok |
| 10-16 | Kalimantan Barat | Landak | 7.6 | 22.4 |  | 5.8 | 7.4 | cocok |
| 10-16 | Kalimantan Selatan | Hulu Sungai Selatan | 0.1 | 3.3 |  | 0.0 | 1.7 | tidak cocok |
| 10-16 | Kalimantan Selatan | Hulu Sungai Tengah | 0.3 | 4.9 |  | 0.0 | 0.3 | lemah |
| 10-16 | Kalimantan Selatan | Hulu Sungai Utara | 0.6 | 5.6 |  | 0.0 | 4.3 | lemah |
| 10-16 | Kalimantan Selatan | Tabalong | 10.7 | 26.8 |  | 0.0 | 8.4 | cocok |
| 10-16 | Kalimantan Selatan | Balangan | 0.5 | 4.6 |  | 0.0 | 0.3 | lemah |
| 10-16 | Kalimantan Selatan | Tapin | 0.0 | 0 |  | 0.0 | 2.5 | tidak cocok |
| 10-16 | Kalimantan Tengah | Kotawaringin Barat | 2.4 | 14.2 |  | 0.0 | 2.1 | cocok |
| 10-18 | Kalimantan Barat | hujan ringan-lebat di 8-11 kab/kota |  |  |  |  |  | tidak bisa dicek |
| 10-18 | Kalimantan Selatan | hujan di HSU dan Banua Enam |  |  |  |  |  | tidak bisa dicek |
| 10-18 | Kalimantan Tengah | hujan di Kobar, Mura, Gumas, Barsel, Kotim, Kapuas |  |  |  |  |  | tidak bisa dicek |
| 10-18 | Sumatera Selatan | hujan ringan di Palembang |  |  |  |  |  | tidak bisa dicek |
| 10-17 | Kalimantan Barat | Bengkayang | 7.7 | 18.2 |  | 7.1 | 5.1 | cocok |
| 10-17 | Kalimantan Barat | Kubu Raya | 0.4 | 6.7 | WIOO hujan | 3.8 | 2.4 | cocok |
| 10-17 | Kalimantan Barat | Mempawah | 0.4 | 10.2 |  | 6.6 | 2.6 | lemah |
| 10-17 | Kalimantan Barat | Ketapang | 0.4 | 10.5 |  | 0.8 | 2.0 | lemah |
| 10-17 | Kalimantan Barat | Sintang | 2.7 | 20.9 |  | 4.3 | 3.2 | cocok |
| 10-17 | Kalimantan Barat | Sanggau | 6.8 | 25.9 |  | 4.2 | 3.4 | cocok |
| 10-17 | Kalimantan Barat | Sambas | 11.8 | 24.2 |  | 5.7 | 6.1 | cocok |
| 10-17 | Kalimantan Barat | Landak | 2.3 | 13.0 |  | 5.8 | 3.8 | cocok |
| 10-17 | Kalimantan Tengah | Kotawaringin Timur | 0.0 | 0 |  | 0.0 | 0.0 | tidak cocok |
| 10-17 | Kalimantan Tengah | Kotawaringin Barat | 0.0 | 0 |  | 0.0 | 0.0 | tidak cocok |
| 10-17 | Kalimantan Tengah | Barito Selatan | 0.0 | 0 |  | 0.1 | 0.1 | tidak cocok |
| 10-17 | Kalimantan Tengah | Murung Raya | 2.8 | 15.5 |  | 0.8 | 3.0 | cocok |
| 10-17 | Kalimantan Tengah | Gunung Mas | 0.2 | 5.1 |  | 0.1 | 1.8 | lemah |
| 10-18 | Kalimantan Barat | Kota Singkawang | 14.6 | 20.4 |  | 8.1 | 14.3 | cocok |
| 10-18 | Kalimantan Barat | Kota Pontianak | 11.6 | 16.8 |  | 0.0 | 13.5 | cocok |
| 10-18 | Kalimantan Barat | Bengkayang | 14.7 | 40.7 |  | 7.1 | 12.9 | cocok |
| 10-18 | Kalimantan Barat | Kubu Raya | 10.8 | 24.6 | WIOO hujan | 3.8 | 11.9 | cocok |
| 10-18 | Kalimantan Barat | Mempawah | 16.2 | 24.2 |  | 6.6 | 11.8 | cocok |
| 10-18 | Kalimantan Barat | Ketapang | 2.0 | 19.7 |  | 0.8 | 5.0 | cocok |
| 10-18 | Kalimantan Barat | Sintang | 2.7 | 20.3 |  | 4.3 | 5.1 | cocok |
| 10-18 | Kalimantan Barat | Sekadau | 6.4 | 26.7 |  | 2.7 | 6.1 | cocok |
| 10-18 | Kalimantan Barat | Sanggau | 9.5 | 27.5 |  | 4.2 | 9.0 | cocok |
| 10-18 | Kalimantan Barat | Sambas | 13.8 | 26.4 |  | 5.7 | 14.7 | cocok |
| 10-18 | Kalimantan Barat | Landak | 10.2 | 21.9 |  | 5.8 | 12.8 | cocok |
| 10-18 | Kalimantan Selatan | Hulu Sungai Utara | 4.6 | 11.6 |  | 0.0 | 1.0 | cocok |
| 10-18 | Kalimantan Tengah | Kapuas | 2.8 | 12.3 |  | 0.3 | 2.8 | cocok |
| 10-18 | Sumatera Selatan | Tol Palindra (ringan) |  |  |  |  |  | tidak bisa dicek |
| 10-19 | Kalimantan Barat | Kota Singkawang | 5.1 | 10.5 |  | 8.1 | 8.2 | cocok |
| 10-19 | Kalimantan Barat | Kota Pontianak | 16.1 | 20.9 |  | 0.0 | 15.2 | cocok |
| 10-19 | Kalimantan Barat | Kayong Utara | 13.4 | 20.4 |  | 1.4 | 16.7 | cocok |
| 10-19 | Kalimantan Barat | Bengkayang | 10.7 | 25.8 |  | 7.1 | 7.8 | cocok |
| 10-19 | Kalimantan Barat | Kubu Raya | 16.7 | 26.1 | WIOO hujan | 3.8 | 11.1 | cocok |
| 10-19 | Kalimantan Barat | Mempawah | 13.8 | 20.5 |  | 6.6 | 13.4 | cocok |
| 10-19 | Kalimantan Barat | Ketapang | 7.2 | 26.6 |  | 0.8 | 6.1 | cocok |
| 10-19 | Kalimantan Barat | Sintang | 3.9 | 26.7 |  | 4.3 | 5.7 | cocok |
| 10-19 | Kalimantan Barat | Sekadau | 4.7 | 26.8 |  | 2.7 | 4.1 | cocok |
| 10-19 | Kalimantan Barat | Sanggau | 4.2 | 23.0 |  | 4.2 | 9.2 | cocok |
| 10-19 | Kalimantan Barat | Sambas | 5.7 | 15.3 |  | 5.7 | 7.9 | cocok |
| 10-19 | Kalimantan Barat | Melawi | 6.8 | 20.9 |  | 0.7 | 3.5 | cocok |
| 10-19 | Kalimantan Barat | Landak | 10.2 | 23.1 |  | 5.8 | 11.3 | cocok |
| 10-19 | Kalimantan Selatan | Banjar | 0.0 | 1.4 |  | 0.0 | 0.4 | klaim nihil sesuai |
| 10-19 | Kalimantan Selatan | Tabalong | 7.2 | 15.8 |  | 0.0 | 7.3 | klaim nihil tidak sesuai |
| 10-19 | Kalimantan Selatan | Barito Kuala | 0.2 | 3.3 |  | 0.0 | 2.5 | klaim nihil sesuai |
| 10-19 | Kalimantan Tengah | Kotawaringin Timur | 0.3 | 7.7 |  | 0.0 |  | lemah |
| 10-19 | Kalimantan Tengah | Kotawaringin Barat | 2.3 | 13.6 |  | 0.0 | 3.1 | cocok |
| 10-19 | Kalimantan Tengah | Barito Selatan | 6.8 | 15.3 |  | 0.1 | 4.7 | cocok |
| 10-19 | Kalimantan Tengah | Seruyan | 2.8 | 19.4 |  | 0.0 | 4.9 | cocok |
| 10-19 | Sumatera Selatan | Ogan Ilir | 0.0 | 0 |  | 0.0 | 0.0 | tidak cocok |
| 10-19 | Sumatera Selatan | Lahat | 0.0 | 0 |  | 0.0 | 0.0 | tidak cocok |
| 10-19 | Sumatera Selatan | hujan sangat ringan Pemulutan (Ogan Ilir) dan Kiki |  |  |  |  |  | tidak bisa dicek |
| 10-20 | Kalimantan Barat | Kota Singkawang | 12.5 | 15.5 |  | 8.1 | 11.6 | cocok |
| 10-20 | Kalimantan Barat | Kota Pontianak | 9.9 | 14.7 |  | 0.0 | 10.1 | cocok |
| 10-20 | Kalimantan Barat | Bengkayang | 10.9 | 21.8 |  | 7.1 | 10.3 | cocok |
| 10-20 | Kalimantan Barat | Kubu Raya | 9.4 | 18.9 | WIOO hujan | 3.8 | 9.1 | cocok |
| 10-20 | Kalimantan Barat | Mempawah | 10.8 | 22.2 |  | 6.6 | 10.0 | cocok |
| 10-20 | Kalimantan Barat | Ketapang | 1.4 | 19.2 |  | 0.8 | 4.0 | cocok |
| 10-20 | Kalimantan Barat | Sanggau | 6.1 | 26.3 |  | 4.2 | 7.1 | cocok |
| 10-20 | Kalimantan Barat | Sambas | 12.2 | 24.7 |  | 5.7 | 11.7 | cocok |
| 10-20 | Kalimantan Barat | Landak | 9.7 | 21.7 |  | 5.8 | 9.3 | cocok |
| 10-20 | Kalimantan Tengah | Kotawaringin Barat | 4.2 | 13.7 |  | 0.0 | 2.2 | cocok |
| 10-20 | Sumatera Selatan | belum ada laporan hujan 20-23 Okt |  |  |  |  |  | tidak bisa dicek |
| 10-21 | Kalimantan Barat | Kota Singkawang | 0.0 | 0 |  | 8.1 | 3.2 | tidak cocok |
| 10-21 | Kalimantan Barat | Kota Pontianak | 0.0 | 0 |  | 0.0 | 1.3 | tidak cocok |
| 10-21 | Kalimantan Barat | Bengkayang | 2.2 | 8.9 |  | 7.1 | 1.5 | cocok |
| 10-21 | Kalimantan Barat | Kubu Raya | 2.2 | 9.9 | WIOO kering | 3.8 | 0.8 | cocok |
| 10-21 | Kalimantan Barat | Ketapang | 0.8 | 8.5 |  | 0.8 | 1.9 | lemah |
| 10-21 | Kalimantan Barat | Sanggau | 2.7 | 18.5 |  | 4.2 | 2.4 | cocok |
| 10-21 | Kalimantan Barat | Sambas | 4.2 | 11.5 |  | 5.7 | 1.1 | cocok |
| 10-21 | Kalimantan Barat | Landak | 0.1 | 6.0 |  | 5.8 | 1.9 | lemah |
| 10-21 | Kalimantan Tengah | Kotawaringin Barat | 0.7 | 12.5 |  | 0.0 | 0.2 | lemah |
| 10-21 | Sumatera Selatan | belum ada laporan hujan 21 Okt |  |  |  |  |  | tidak bisa dicek |
| 10-22 | Kalimantan Barat | Kota Singkawang | 0.0 | 0 |  | 8.1 | 0.2 | tidak cocok |
| 10-22 | Kalimantan Barat | Mempawah | 0.2 | 5.1 |  | 6.6 | 0.2 | lemah |
| 10-22 | Kalimantan Barat | Sintang | 0.0 | 9.8 |  | 4.3 | 0.0 | tidak cocok |
| 10-22 | Kalimantan Barat | Sambas | 0.1 | 5.4 |  | 5.7 | 0.2 | lemah |
| 10-22 | Kalimantan Tengah | Murung Raya | 0.0 | 9.4 |  | 0.8 | 0.0 | tidak cocok |
| 10-23 | Kalimantan Barat | Bengkayang | 11.7 | 20.2 |  | 7.1 | 10.4 | cocok |
| 10-23 | Kalimantan Barat | Ketapang | 1.0 | 14.1 |  | 0.8 | 2.8 | cocok |
| 10-23 | Kalimantan Barat | Sintang | 6.0 | 25.5 |  | 4.3 | 4.3 | cocok |
| 10-23 | Kalimantan Barat | Sekadau | 10.3 | 20.5 |  | 2.7 | 10.4 | cocok |
| 10-23 | Kalimantan Barat | Sanggau | 10.4 | 26.3 |  | 4.2 | 9.0 | cocok |
| 10-23 | Kalimantan Barat | Sambas | 12.2 | 27.3 |  | 5.7 | 10.5 | cocok |
| 10-23 | Kalimantan Barat | Landak | 10.2 | 23.0 |  | 5.8 | 9.2 | cocok |
| 10-23 | Kalimantan Selatan | Kotabaru | 0.0 | 0 |  | 0.0 | 0.3 | tidak cocok |
| 10-23 | Kalimantan Tengah | Murung Raya | 2.1 | 28.3 |  | 0.8 | 2.2 | cocok |
| 10-23 | Lampung | Lampung Barat | 0.5 | 5.0 |  | 0.0 | 0.1 | lemah |
| 10-24 | Jawa Barat | 24-25 Okt ringan-sedang sisi barat Ciremai, Ciamis |  |  |  |  |  | tidak bisa dicek |
| 10-24 | Kalimantan Selatan | Kotabaru | 0.2 | 4.2 |  | 0.0 | 0.3 | lemah |
| 10-24 | Kalimantan Selatan | Tapin | 0.0 | 0 |  | 0.0 | 0.4 | tidak cocok |
| 10-24 | Kalimantan Tengah | Seruyan | 3.6 | 23.5 |  | 0.0 | 7.2 | cocok |
| 10-24 | Lampung | Lampung Tengah | 0.0 | 1.0 |  | 0.0 | 0.7 | tidak cocok |
| 10-24 | Lampung | Lampung Timur | 0.1 | 2.1 |  | 0.0 | 0.2 | tidak cocok |
| 10-24 | Lampung | Way Kanan | 1.8 | 5.2 |  | 0.0 | 3.1 | cocok |
| 10-24 | Sumatera Selatan | Ogan Komering Ilir | 1.2 | 13.6 |  | 0.0 | 1.6 | cocok |
| 10-24 | Sumatera Selatan | Musi Banyuasin | 13.9 | 26.5 |  | 0.0 | 14.2 | cocok |
| 10-24 | Sumatera Selatan | Kota Palembang | 1.1 | 6.0 | WIPP kering | 0.0 | 7.5 | cocok |
| 10-24 | Sumatera Selatan | Banyuasin | 3.9 | 14.7 |  | 0.0 | 8.7 | cocok |
| 10-25 | Kalimantan Tengah | Kotawaringin Timur | 7.9 | 16.7 |  | 0.0 | 7.2 | cocok |
| 10-25 | Kalimantan Tengah | Kotawaringin Barat | 4.1 | 14.3 |  | 0.0 | 4.3 | cocok |
| 10-25 | Kalimantan Tengah | Kota Palangkaraya | 10.0 | 12.6 |  | 0.0 | 9.7 | cocok |
| 10-25 | Kalimantan Tengah | Barito Utara | 12.0 | 29.8 |  | 0.6 | 8.8 | cocok |
| 10-25 | Kalimantan Tengah | Pulang Pisau | 4.1 | 14.2 |  | 0.0 | 11.4 | cocok |
| 10-26 | Jambi | Tanjung Jabung Timur |  |  |  | 0.2 |  | tidak bisa dicek |
| 10-26 | Jawa Timur | Dampak (hujan): Kota Malang, Kab. Malang, Kab. Bon |  |  |  |  |  | tidak bisa dicek |
| 10-26 | Kalimantan Barat | Kota Singkawang |  |  |  | 8.1 |  | tidak bisa dicek |
| 10-26 | Kalimantan Barat | Kota Pontianak |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-26 | Kalimantan Barat | Kubu Raya |  |  | WIOO hujan | 3.8 |  | cocok |
| 10-26 | Kalimantan Barat | Mempawah |  |  |  | 6.6 |  | tidak bisa dicek |
| 10-26 | Kalimantan Barat | Ketapang |  |  |  | 0.8 |  | tidak bisa dicek |
| 10-26 | Kalimantan Barat | Sintang |  |  |  | 4.3 |  | tidak bisa dicek |
| 10-26 | Kalimantan Barat | Sanggau |  |  |  | 4.2 |  | tidak bisa dicek |
| 10-26 | Kalimantan Barat | Landak |  |  |  | 5.8 |  | tidak bisa dicek |
| 10-26 | Kalimantan Selatan | Hulu Sungai Selatan |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-26 | Kalimantan Selatan | Hulu Sungai Tengah |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-26 | Kalimantan Selatan | Kota Banjarmasin |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-26 | Kalimantan Selatan | Kota Banjarbaru |  |  | WAOO hujan | 0.0 |  | cocok |
| 10-26 | Kalimantan Selatan | Tanah Bumbu |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-26 | Kalimantan Selatan | Tanah Laut |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-26 | Kalimantan Selatan | Tabalong |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-26 | Kalimantan Selatan | Kotabaru |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-26 | Kalimantan Selatan | Banjar |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-26 | Kalimantan Selatan | Tapin |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-26 | Kalimantan Tengah | Kotawaringin Timur |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-26 | Kalimantan Tengah | Kotawaringin Barat |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-26 | Kalimantan Tengah | Kota Palangkaraya |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-26 | Kalimantan Tengah | Barito Utara |  |  |  | 0.6 |  | tidak bisa dicek |
| 10-26 | Kalimantan Tengah | Pulang Pisau |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-26 | Sumatera Selatan | Ogan Komering Ilir |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-26 | Sumatera Selatan | Banyuasin |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-27 | Kalimantan Selatan | Tanah Bumbu |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-27 | Kalimantan Selatan | Kotabaru |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-27 | Kalimantan Tengah | Kotawaringin Timur |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-27 | Kalimantan Tengah | Kota Palangkaraya |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-27 | Kalimantan Tengah | Pulang Pisau |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-27 | Kalimantan Tengah | Gunung Mas |  |  |  | 0.1 |  | tidak bisa dicek |
| 10-27 | Kalimantan Tengah | Katingan |  |  |  | 0.2 |  | tidak bisa dicek |
| 10-27 | Kalimantan Tengah | Seruyan |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-27 | Kalimantan Tengah | Kapuas |  |  |  | 0.3 |  | tidak bisa dicek |
| 10-27 | Sumatera Selatan | Ogan Komering Ulu Timur |  |  |  | 0.0 |  | tidak bisa dicek |
| 10-27 | Sumatera Selatan | Ogan Komering Ilir |  |  |  | 0.0 |  | tidak bisa dicek |
