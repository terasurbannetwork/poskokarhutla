# GLOSARIUM: Penurunan tanah

| Istilah | Arti |
| --- | --- |
| InSAR | Interferometri radar apertur sintetik: beda fase dua citra radar menghasilkan pergeseran tanah searah garis pandang satelit, ketelitian milimeter. |
| Sentinel-1 | Satelit radar Copernicus; sumber citra InSAR gratis di sini. |
| Interferogram | Peta beda fase satu pasangan citra; `unw` adalah hasil terbuka lipatan, `cc` koherensinya. |
| LOS | Garis pandang satelit (line of sight); laju LOS adalah proyeksi gerak tanah ke arah itu. |
| Geometri naik dan turun | Orbit satelit menuju utara (naik) dan selatan (turun); dua arah pandang berbeda memungkinkan memisahkan gerak vertikal dari timur-barat. |
| LiCSAR | Layanan COMET yang menyediakan interferogram Sentinel-1 terbuka (di CEDA dan JASMIN). |
| LiCSBAS | Perangkat deret waktu atas LiCSAR yang menghasilkan laju (`vel.filt.mskd`) dan galatnya. |
| HyP3 | Layanan ASF untuk InSAR sesuai permintaan; butuh login Earthdata. |
| EGMS | European Ground Motion Service, benchmark Copernicus untuk gerak tanah Eropa. |
| GNSS, levelling | Pengukuran titik tanah lewat satelit navigasi atau waterpas; pembanding InSAR. |
| Acuan (referensi) | Area yang dianggap stabil; semua laju dikurangi median area itu. |
| Gerbang pola | Pemeriksaan bahwa pola laju masuk akal (Jakarta: utara lebih turun dari selatan) sebelum berkas ditulis. |
| Laju tetap | Asumsi proyeksi bahwa laju hari ini bertahan 10 atau 20 tahun. |
| Cakupan | Persen piksel valid dibanding piksel di dalam poligon kecamatan. |
| Rob | Banjir pesisir oleh pasang laut; di modul ini tetap dihitung terpisah dari penurunan tanah. |
| DeltaDTM | Model elevasi pesisir 30 m (Pronk dkk. 2024), MAE sekitar 0,43 m. |
| Hipotesis | Label angka yang belum divalidasi GNSS atau uji balik. |
