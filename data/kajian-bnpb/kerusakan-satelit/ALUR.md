# ALUR: Perkiraan kerusakan satelit

## A1. Pembuktian (sekali per bahaya)

1. Kriteria lulus dikunci dalam berkas JSON bertanda sidik sebelum hasil dilihat (ALGORITMA 3).
2. Uji balik berjalan pada kejadian lampau yang punya kebenaran resmi; vonis ditulis ke R2 dan ke ringkasan.
3. Hanya bahaya berstatus lulus atau lulus terbatas yang membuka A2.

## A2. Kejadian baru

1. Kejadian `KJ-` bahaya banjir atau karhutla masuk fase tanggap atau transisi.
2. Pipeline mencari citra sebelum dan sesudah yang memadai (tutupan awan, orbit); bila tidak ada, status "menunggu citra", bukan nol.
3. Tiap citra sesudah yang sah menghasilkan perkiraan baru (ditambah, tidak menimpa).

## A3. Penerimaan staf

1. Staf membuka Jitupasna kejadian itu dan kartu Perkiraan satelit.
2. Bila vonis bahaya belum lulus: hanya status uji dan alasan.
3. Bila lulus: tabel per kab dengan angka terdampak, tanggal citra, label. Staf memilih kab dan menulis tingkat serta jumlahnya sendiri, atau menerima jumlah terdampak sebagai isian "terdampak".
4. Server mencatat baris isian dengan `unit_asal` baru dan catatan asal; riwayat tetap.

## A4. Pembaruan

Perkiraan baru tidak mengubah baris yang sudah diterima; kartu menandai selisih bila perkiraan baru berbeda dari yang diterima.
