# Status banjir per kecamatan dihitung

Halaman ini menjelaskan cara status banjir Normal, Waspada, Siaga, dan Awas dihitung untuk tiap kecamatan.

Bagian ini hanya membahas hal yang sudah tampil di layar.

## Status banjir per kecamatan (Normal, Waspada, Siaga, Awas)

**Bahan yang dipakai.** Prakiraan hujan dari Open-Meteo (layanan prakiraan cuaca terbuka; satu kotak prakiraannya sekitar 28 km, mencakup tujuh hari ke belakang dan tujuh hari ke depan, diperbarui harian). Debit sungai besar dari model GloFAS (model prakiraan aliran sungai buatan Eropa). Peluang hujan lebat dari prakiraan ansambel ECMWF (pusat prakiraan cuaca Eropa). Indeks bahaya banjir dari InaRISK, yaitu peta risiko bencana milik BNPB (skala 0 sampai 1; untuk tiap kecamatan dipakai nilai tertinggi dari 10 titik, dan data ini tidak diperbarui otomatis, jadi bisa sudah lama).

**Langkah hitung** untuk setiap kecamatan dan setiap hari (hari ini sampai tiga hari ke depan). Nama besaran dipakai konsisten sampai contoh:

1. Hitung **hujan 3 hari**: jumlah hujan kemarin, hari itu, dan besok, dalam milimeter.
2. Cari titik sungai besar terdekat dalam 25 km, lalu lihat apakah debit prakiraannya melewati batas banjir yang terulang tiap 2 tahun (sungai kelas 1), tiap 5 tahun (kelas 2), atau tiap 20 tahun (kelas 3).
3. Catat **intensitas hujan per jam** terbesar, dan **peluang hujan lebat 3 hari**, yaitu peluang jumlah hujan 3 hari mencapai 100 mm atau lebih menurut prakiraan ansambel.
4. Ambil **indeks bahaya** kecamatan itu.
5. Periksa aturan dari yang tertinggi ke terendah. Aturan pertama yang terpenuhi menentukan status.

Aturannya, satu syarat per baris (cukup satu syarat terpenuhi, kecuali disebut lain):

**Awas**, bila salah satu:
- sungai kelas 3; atau
- hujan 3 hari 120 mm atau lebih **dan** indeks bahaya 0,66 atau lebih.

**Siaga**, bila salah satu:
- sungai kelas 2; atau
- indeks bahaya 0,33 atau lebih **dan** salah satu dari: hujan 3 hari 80 mm atau lebih, intensitas 30 mm per jam atau lebih, atau peluang hujan lebat 3 hari 0,5 atau lebih.

**Waspada**, bila salah satu:
- sungai kelas 1; atau
- hujan 3 hari 40 mm atau lebih; atau
- intensitas 20 mm per jam atau lebih.

**Normal**, bila tidak ada yang di atas terpenuhi.

Angka 40, 80, dan 120 mm sengaja lebih rendah (80 persen) dari kelas peringatan BMKG yang 50, 100, dan 150 mm. Alasannya, prakiraan dalam kotak 28 km menghaluskan hujan sehingga angkanya lebih rendah dari hujan di stasiun. Jalur intensitas 30 mm per jam ditujukan untuk banjir bandang. Status longsor memakai mesin yang sama dengan ambang berbeda dan dijelaskan di panduan Longsor.

**Contoh Siaga.** Sebuah kecamatan punya hujan 3 hari 90 mm, tidak ada sungai besar di dekatnya, dan indeks bahaya 0,4. Awas tidak terpenuhi (hujan belum 120 mm). Siaga terpenuhi karena bahaya 0,4 sudah di atas 0,33 dan hujan 90 mm di atas 80 mm. Statusnya Siaga.

**Contoh Waspada.** Hujan 3 hari 45 mm, intensitas 10 mm per jam, tidak ada sungai besar. Syarat Siaga tidak terpenuhi. Hujan 45 mm di atas 40 mm, jadi Waspada.

**Contoh Awas.** Hujan 3 hari 130 mm dan indeks bahaya 0,7. Dua syarat Awas terpenuhi sekaligus (130 di atas 120 dan 0,7 di atas 0,66), jadi Awas.

**Seberapa bisa dipercaya.** Status ini masih hipotesis. Pesan intinya: status Siaga lebih sering salah daripada benar, jadi pakai sebagai penanda untuk bersiaga. Rinciannya, pada uji balik 2022 sampai 2025 terhadap kejadian banjir di data kebencanaan nasional (DIBI, Data Informasi Bencana Indonesia milik BNPB):

- Tingkat Waspada: sekitar 57 dari 100 kejadian tertangkap, tetapi sekitar 96 dari 100 alarm tidak diikuti kejadian yang tercatat.
- Tingkat Siaga: 13 dari 100 kejadian tertangkap, dan sekitar 94 dari 100 alarm tidak diikuti kejadian tercatat.
- DIBI kurang mencatat kejadian kecil, sehingga alarm tampak lebih sering salah dari kenyataannya.
- Ujinya memakai data hujan masa lalu yang sempurna, jadi kemampuan nyata saat memakai prakiraan kemungkinan lebih rendah.
