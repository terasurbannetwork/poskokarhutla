# Layar paparan, kaji cepat, pemulihan

Halaman ini merinci layar paparan, kaji cepat, Jitupasna, renkon dan gladi, risiko masa depan, serta registri sumber.

## Peta Paparan, `/siklus/paparan`

Siapa: ringkasan provinsi untuk staf. Paparan per kabupaten dan fasilitas untuk staf serta akun BPBD (wilayahnya). Rincian sel 110 meter hanya Pusdalops, Koordalops, Super Admin, dan akun BPBD wilayahnya.

Langkah pakai:

1. Pilih provinsi dan kabupaten.
2. Baca jumlah bangunan terpapar dan jiwa terpapar menurut zona, lalu fasilitas vital menurut kategori.
3. Tombol "Tampilkan sel 110 m di peta" memuat sel rinci setelah masuk. Rincian tidak pernah ada di `public/`.

Arti angka dan label:

- Semua angka berlabel `estimasi-model`. Bangunan adalah bangunan terdeteksi Google Open Buildings v3 dengan ambang keyakinan 0,70, dan ambang itu tertulis di tiap keluaran.
- Posisi memiliki galat sekitar 0,8 km pada sel kasar 0,01 derajat dan sekitar 0,08 km pada sel halus 110 meter.
- Jiwa terpapar ditampilkan dari tiga sumber berdampingan: WorldPop per kecamatan, Dukcapil per desa, dan GHSL. Selisih ditulis, tidak dirata-rata.
- Kelas bahaya InaRISK: rendah, sedang, atau tinggi per sel, atau "tidak terliput". Kelas InaRISK di sini bukan kelas resmi.
- Provinsi tanpa grid bangunan ditulis "tidak terliput", bukan 0. Zona yang geometrinya belum ada ditulis `tersedia: false` beserta alasannya.

Yang sering disalahpahami: ini paparan, yaitu apa yang berada di dalam zona, bukan dampak terukur.

## Kaji Cepat, `/siklus/kaji` dan `/siklus/kaji/<id>`

Siapa: staf dan akun BPBD (wilayahnya). Mengubah status kaji hanya Pusdalops, Koordalops, Super Admin.

Langkah pakai:

1. Buka daftar kaji. Tiap baris adalah satu hasil model untuk satu kejadian: model `gempa` atau `banjir_jam1`.
2. Buka satu baris untuk membaca Rentang, Dasar model, Dasar banjir (untuk banjir), Petugas, dan berkas hasil.
3. Ubah status sesuai alur: dihitung ke diperiksa ke dipakai, dan dari status mana pun yang belum ditarik (termasuk menunggu_data) ke ditarik. Status menunggu_data dan dihitung dibuat oleh pipeline, bukan oleh staf. Menarik kaji wajib beralasan 3 sampai 300 karakter dan bersifat final, tidak bisa dibalik. Kaji yang salah diganti dengan versi baru dari pipeline (`src/siklus_kaji.js:14-15` dan `61-62`).

Arti angka:

- Keluaran selalu berupa rentang dua angka `[bawah, atas]` dengan label `estimasi-model`, tidak pernah satu angka titik dan tidak pernah angka resmi BNPB. Hanya status `menunggu_data` yang boleh tanpa rentang.
- Gempa: korban jiwa dari dua model berdampingan, PAGER dan ITB. Kelas siaga (hijau, kuning, oranye, merah) mengikuti model PAGER.
- Banjir: rentang jiwa dari jiwa terpapar di poligon kejadian hingga batas atas jam pertama. Bila kedalaman tidak ada, kerusakan tidak dihitung dan layar menulis "kedalaman belum tersedia".
- Karhutla dan gunung api: hanya paparan, tanpa kerusakan atau korban. Jenis lain: "belum ada perkiraan otomatis".

Yang sering disalahpahami: layar kaji memperingatkan bahwa faktor galat kalibrasi gempa (5,341) lebih besar daripada pita 4 yang dipakai, sehingga rentang bisa terlalu sempit. Tsunami dan likuefaksi tidak dihitung.

## Jitupasna dan R3P, `/siklus/pulih` dan `/siklus/pulih/<id>`

Siapa: staf dan akun BPBD membaca. Membuat Jitupasna oleh Koordalops. Mengisi baris oleh Pusdalops, Koordalops, dan akun BPBD di wilayahnya. Menghitung oleh Pusdalops, Koordalops. Mengubah status Jitupasna dan R3P oleh Koordalops. Tanda setuju internal R3P hanya Pimpinan.

Langkah pakai:

1. Koordalops membuat Jitupasna untuk satu kejadian lalu menekan "Mulai pengumpulan".
2. Petugas mengisi baris kerusakan per sektor dan tingkat, serta baris kerugian per komponen. Harga satuan ditambahkan lewat "Tambah harga".
3. Tekan Tinjau untuk menghitung, lalu Koordalops memeriksa penanda (hitung ganda, sektor kosong, kewajaran).
4. Tekan Final. Jitupasna final tidak dapat diubah.
5. Dari Jitupasna final, buat draf R3P. Alur status R3P: draf, diusulkan, disetujui_pm, ditetapkan_resmi, berjalan, selesai. Status ditetapkan_resmi mewajibkan nomor dan tanggal keputusan. Pimpinan memberi tanda setuju internal, dan penyetuju tidak boleh orang yang sama dengan penyusun.
6. Kegiatan ditambahkan lewat "Tambah kegiatan" dan pelaksanaannya dipantau lewat persen realisasi.

Arti angka: harga satuan berlabel `asumsi-kebijakan`. Nilai kerusakan dan kerugian tampil sebagai rupiah hanya bila semua harga yang dibutuhkan terisi, selain itu "menunggu". Sisa 90 hari dan tanggal PDNA tampil di kartu pelaksanaan. Stimulan rumah dan dana tunggu hunian dihitung dengan tarif yang dijelaskan pada bagian Metode.

Yang sering disalahpahami: sistem tidak menggantikan dokumen resmi Jitupasna atau R3P. Draf R3P dan tanda setuju hanya untuk internal. Stimulan adalah bantuan, bukan nilai kerusakan.

## Renkon dan Gladi, `/siklus/renkon` dan `/siklus/gladi`

Siapa: renkon dapat dibaca staf dan akun BPBD (wilayahnya), dibuat dan diisi Pusdalops serta Koordalops, status oleh Koordalops. Gladi hanya untuk staf: dibaca staf, dibuat dan diubah statusnya oleh Koordalops, catatan oleh Pusdalops dan Koordalops.

Langkah pakai renkon:

1. Buat renkon baru untuk satu bencana dan wilayah, lalu isi kerangka dan asumsi dampak (jiwa terpapar, hari, jumlah keluarga).
2. Layar menghitung usulan kebutuhan dasar per komponen, kesenjangan terhadap stok LogPal, dan kesenjangan personel. Usulan tidak pernah menimpa isian staf.
3. Naikkan status: persiapan, pelaksanaan, finalisasi, ditetapkan, berlaku, dimutakhirkan.

Langkah pakai gladi:

1. "Susun skenario" memilih kejadian arsip yang sudah dipromosikan ke D1.
2. Status gladi: dirancang, siap, berjalan, dievaluasi, selesai.
3. "Catat masalah" menyimpan temuan gladi. Bidang keluaran minimal gladi: kebijakan, renkon, sarpras.

Arti isian: kesegaran renkon memakai empat status (berlaku, segera_habis, perlu_reviu, kedaluwarsa), dihitung saat halaman dibuka. Skor kesiapan gladi memakai bobot sama dan menampilkan "n dari 4 komponen". Stok yang tidak tercatat di LogPal ditulis "stok belum tercatat", bukan 0.

## Risiko Masa Depan, `/siklus/masa-depan`

Siapa: halaman `/siklus/masa-depan` hanya untuk sesi berhak; tamu dialihkan ke `/admin/masuk`. Ringkasan publik tersedia bagi tamu hanya sebagai berkas `masa_depan_ringkas.json` (daftar putih aset, `src/siklus.js:100`) dan jawaban API opsional `GET /api/siklus/masadepan` (`src/siklus_pintu.js:101-102`). Staf melihat berkas provinsi dari R2. Super Admin dapat membuka contoh.

Isi: perubahan tiga indeks hujan ekstrem (Rx1day, Rx5day, CDD) terhadap dasar 1995 sampai 2014 untuk horizon 2021 sampai 2040 dan 2041 sampai 2060 pada skenario SSP2-4.5 dan SSP5-8.5, kenaikan muka laut global AR6, dan pertumbuhan bangunan di zona bahaya.

Arti angka: semua berpil `hipotesis`. Tampil selalu median bersama rentang persentil 17 sampai 83 dan jumlah model, tidak pernah satu angka tunggal. Ini sinyal perubahan terhadap dasar, bukan ramalan kejadian. Nilai yang belum dihitung ditulis "menunggu".

Yang sering disalahpahami: muka laut ditampilkan dalam meter tanpa penurunan muka tanah dan bukan luas genangan. Peta pertumbuhan paparan belum dibuat.

## Registri sumber, `/siklus` (kartu registri)

Siapa: Pusdalops, Koordalops, Pimpinan, Super Admin. Berisi daftar sumber data publik yang dipakai program, lengkap dengan lisensi, atribusi, jadwal, fitur pemakai, dan status uji.
