# GLOSARIUM: Pantauan Operasi Udara

| Istilah | Arti di modul ini |
| ------- | ----------------- |
| Base | Bandara atau helipad tempat armada udara ditempatkan (`op_base`), ditulis dengan nama bandara dan kode ICAO |
| Armada | Satu pesawat (helikopter atau sayap tetap) dengan nomor registrasi (`op_armada`) |
| Gelar armada | Laporan harian satgas base lewat WA tentang status tiap pesawat: siap, siaga, beroperasi, tidak siap |
| Belum lapor | Pesawat atau base tanpa laporan gelar armada pada tanggal itu; **bukan** nol dan bukan tidak siap |
| Telat lapor | Laporan gelar armada pertama base masuk sesudah batas waktu (Q1) |
| Rusak berulang | Pesawat tidak siap beberapa kali dalam 7 hari (Q2) |
| Sortie | Satu penerbangan tercatat (patroli, water bombing, OMC) |
| Water bombing (WB) | Pemadaman dengan menjatuhkan air dari bucket |
| Jatuhan | Satu kali bucket dilepas di atas api |
| Bucket | Wadah air gantung; kapasitas dalam liter (`bucket_liter`) |
| OMC | Operasi modifikasi cuaca (penyemaian awan) |
| Renlap | Rencana lapangan: daftar target patroli atau WB per base untuk satu hari, versi malam (20.00 WIB) dan pagi (07.00 WIB) |
| Target renlap | Satu titik tujuan renlap dengan urutan, lokasi, koordinat, dan alasan |
| Didatangi | Ada aksi armada base itu ≤ 10 km dari target pada hari renlap |
| Kepatuhan renlap | Persen target renlap yang didatangi |
| Waypoint | Titik navigasi; diunduh dalam KML (Google Earth) atau GPX (perangkat GPS) |
| Cluster | Kelompok titik panas yang berdekatan menurut pipeline karhutla |
| Cluster prioritas | Cluster level 3 (Prioritas) menurut aturan status pipeline |
| Jangkauan | Radius jelajah armada dari base (`RADIUS_KM` di `public/operasi_peta.js`) |
| Celah jangkauan | Cluster prioritas tanpa base berarmada siap dalam jangkauan |
| Waktu respons | Selang dari titik panas pertama cluster terdeteksi sampai aksi armada pertama di cluster itu (Q10) |
| Padam ≥ 24 jam | Tidak ada titik panas satelit dalam 1 km selama 24 jam sesudah water bombing |
| Api muncul lagi | Titik panas kembali dalam 1 km pada 24–72 jam sesudah aksi yang sudah dinilai padam |
| METAR | Laporan cuaca bandara rutin (BMKG Aviation, cadangan NOAA) |
| NOTAM | Pemberitahuan resmi untuk penerbang tentang pembatasan ruang udara atau bandara |
| Batas terang | Selang antara matahari terbit dan terbenam di base; penerbangan VFR dibatasi di dalamnya |
| ADS-B | Siaran posisi pesawat; jejak diambil tiap jam |
| Sinyal hilang | Pesawat yang sedang beroperasi tanpa posisi ADS-B lebih lama dari ambang di ALGORITMA §6 |
| Utilisasi | Hari siap yang benar-benar terbang dibagi hari siap |
| Hari menganggur | Hari siap tanpa sortie |
| Kontrak | Sewa armada BNPB per periode dengan jam operasi tercatat (`rekap_udara`) |
| Jam operasi | Jam terbang tercatat di kontrak, format jam:menit |
| Tinjau lokal | Server `http://localhost:8800`: kode dari folder kerja, data dan login dari produksi (AGENTS §3.8) |
