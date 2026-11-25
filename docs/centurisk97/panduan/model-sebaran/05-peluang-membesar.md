# Peluang api membesar dan WASPADA

Halaman ini menjelaskan perkiraan apakah titik panas baru akan membesar dan jejak kompleks api yang aktif.

## Peluang titik panas baru membesar (tanda WASPADA)

Pertanyaan: dari sebuah titik panas yang baru terdeteksi, seberapa besar kemungkinan ia mencapai 10 kotak satelit (sekitar 140 hektare) dalam 72 jam?

Langkah hitung:

1. Sistem mengenali titik panas baru sebagai kelompok deteksi yang jaraknya 750 meter atau kurang dan selisih waktunya 24 jam atau kurang. Api yang menyala berminggu-minggu tetap dihitung satu peristiwa selama tiap jedanya tidak lebih dari 24 jam.
2. Untuk tiap titik baru, sistem mengumpulkan sejumlah keterangan: cuaca dan tingkat kekeringan bahan bakar, jenis lahan (gambut atau bukan), ukuran dan kekuatan panas awal, serta kondisi titik-titik di sekitarnya dalam 3 hari terakhir.
3. Sistem memberi skor berdasarkan kemiripan dengan kejadian lampau, lalu skor diubah menjadi peluang.
4. Titik ditandai WASPADA bila peluangnya melewati batas yang sengaja dibuat rendah, sekitar 4,9 persen, supaya sedikit api besar yang terlewat. Harganya, banyak tanda yang meleset.

Contoh hitung: dari 100 titik baru, sekitar 3 benar-benar membesar. Sistem menandai 10 titik, dan 2 di antaranya benar membesar. Jadi dari 3 api yang membesar, 2 tertangkap (sekitar 7 dari tiap 10), tetapi 8 tanda lainnya meleset.

Seberapa bisa dipercaya:

| Ujian | Hasil |
| --- | --- |
| Uji balik 2015 sampai 2023 (340.468 titik, 9.514 membesar) | Skor pembeda 0,91; tertangkap 70 persen; 19,6 persen yang ditandai benar membesar |
| Uji 2024 sampai 2026 (97.749 titik, 2.922 membesar) | Skor pembeda 0,91; tertangkap 67,8 persen; 20,9 persen yang ditandai benar membesar |
| Menurut jenis lahan, uji 2024 sampai 2026 | Gambut 0,87, mineral 0,90, sabana 0,90 |

Skor pembeda (disebut AUC) berkisar dari 0,5, sama dengan menebak, sampai 1, sempurna. Skor ini menunjukkan seberapa baik model membedakan api yang akan membesar dari yang tidak. Pada populasi titik baru yang sebenarnya, hanya sekitar 2,8 persen yang membesar, sehingga tanda WASPADA wajar sering meleset.

Status: peluang ini masih hipotesis, karena uji berjalan belum punya cukup data. Pada salinan penilaian 23 Oktober 2026, belum ada ramalan yang cukup umur untuk dinilai. Ada dua syarat yang berbeda:

1. Vonis uji berjalan: paling sedikit 200 titik dinilai dengan 20 di antaranya membesar, batas bawah skor pembeda 0,80, dan hasil lebih baik daripada menebak memakai laju umum.
2. Syarat tampil di layar, lebih ketat: paling sedikit 300 titik dinilai dan 50 membesar, tangkapan dan kecocokan peluang dengan kenyataan harus terjaga, dan syarat ini harus lulus pada dua penilaian berturut-turut dengan tambahan sedikitnya 30 titik. Sampai syarat ini terpenuhi, peluang membesar tampil sebagai belum teruji.

Model percobaan lain yang ditambah informasi tutupan lahan tahunan atau tinggi kanopi hutan tidak memberi tambahan bermakna dan tidak dipasang.

## Jejak api kompleks aktif

Pertanyaan: ke mana kompleks api yang sedang aktif akan menjalar dalam 24, 48, dan 72 jam?

Langkah hitung:

1. Keadaan awal diambil dari titik panas satelit utama dalam 7 hari terakhir pada kotak kompleks.
2. Kotak yang terdeteksi dalam 24 jam sebelum acuan dianggap aktif.
3. Model per kotak dijalankan berulang dengan variasi acak. Peluang sebuah kotak adalah seberapa sering kotak itu terbakar dalam semua pengulangan.
4. Hanya kotak dengan peluang 5 persen atau lebih disimpan. Kompleks diurutkan menurut tingkat, jumlah penduduk di sekitarnya, lalu skor.
5. Status hasil ditulis: berhasil, tanpa titik panas satelit, tanpa satelit utama, atau data basi bila data titik panas lebih tua dari 12 jam.

Jejak ini hanya boleh tampil dan dipakai peringatan bila memenuhi syarat kelayakan tampil (lihat berikut). Pada penilaian 23 Oktober 2026 jejak belum memenuhi, jadi statusnya hipotesis dan tidak dipakai untuk peringatan.
