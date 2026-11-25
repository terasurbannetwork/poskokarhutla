# Celah 3W, kaji ulang, keterpaduan

Halaman ini merinci celah 3W, pencocokan tawaran, kaji ulang, keterpaduan, dan rancangan modul terkait.

## Celah dan tumpang tindih 3W, pencocokan tawaran

```
celah          : (kejadian K, kab k, klaster c) tanpa baris 3W berstatus berjalan
tumpang tindih : jumlah organisasi berbeda berstatus berjalan lebih dari 3   (ambang hipotesis)
```

Pencocokan tawaran untuk barang b: kandidat adalah baris meja logistik berbarang sama berstatus diminta atau disetujui di kabupaten kejadian dan sesudah tanggal mulai, ditambah permintaan LogPal "Tanggap darurat" dengan item sama. Urutan: yang paling lama menunggu dahulu, lalu sisa kebutuhan terbesar. Tidak ada pembagian otomatis. Barang "lainnya" tidak dicocokkan. Nama kabupaten yang tidak terpetakan tidak muncul dan dihitung di catatan. Tautan token: 32 byte acak (base64url), hanya sidik SHA-256 yang disimpan, satu per organisasi per kejadian, berlaku paling lama 90 hari atau sampai kejadian ditutup (fase final), dan membuat token baru mencabut token lama organisasi yang sama dalam satu batch (`src/tiga_w.js:69-78` dan `152-157`). Pencabutan menandai baris dan tidak menghapusnya. Nilai rupiah tawaran tidak dicatat.

## Kaji ulang pasca-kejadian

Sumber linimasa dihitung saat dibuka dari data yang ada, bukan disalin: kejadian dan jejaknya, tugas lapangan yang terhubung (karhutla atau banjir, paling banyak 200 tugas), riwayat Lifeline, 3W, dan tawaran. Ada paling banyak 14 kueri D1 per permintaan baca draf. Peristiwa tanpa waktu tidak masuk linimasa dan dihitung sebagai celah. Durasi tahap memakai fungsi SLA yang ada (target 6 jam dari tugas ke konfirmasi dan 24 jam dari konfirmasi ke kabar), dan durasi dengan urutan terbalik berstatus null.

Kandidat kejadian besar (hipotesis, ambang dikalibrasi setelah 10 kejadian): kejadian berfase transisi, pemulihan, atau selesai yang menyentuh 3 kabupaten atau lebih, atau pernah ada sel Lifeline merah, atau masa tanggap lebih dari 7 hari, atau ditandai staf.

Rekomendasi dilacak lewat tabel tindak lanjut Dalops yang ada dengan kunci berawalan `kaji|`. Rekomendasi tertutup hanya bila statusnya `selesai` dengan catatan penutup 20 sampai 300 karakter. Lewat tenggat ditandai tanpa mengubah status. Tenggat wajib dan bernilai 7 sampai 365 hari. Tingkat penyelesaian ditulis "x dari n", dan kejadian tanpa rekomendasi ditulis "tidak ada data", bukan 100 persen. Pengesahan membekukan teks pelajaran dan potret linimasa (maksimum 100.000 karakter, peristiwa terlama dipangkas dan dinyatakan). Sesudah itu pelajaran dan rekomendasi hanya bisa ditambah. Mesin tidak pernah menulis pelajaran atau rekomendasi, dan nama personel lapangan tidak pernah masuk draf.

## Keterpaduan (nomor kejadian dipakai bersama)

Pencocok kejadian tetap satu, yaitu `scripts/siklus/pasang.py`. Modul lain dikirim lewat rute ingest `GET /api/siklus/ingest/modul` dengan sumber `tugas_api`, `logbook_d1`, `sippa`, `lapangan`, `gempa_d1`, dan `lapsus`. Baris modul yang sudah dipasangkan disimpan sebagai sumber terpasang pada kejadian (`sk_kejadian_sumber`), tanpa kolom baru di tabel lama. Kaji ulang memakai tautan `tugas_api` ini untuk menemukan tugas lapangan milik kejadian. Hanya kolom pencocok yang dikirim (tanpa nama, nomor WA, atau isi laporan). Koordinat tugas lapangan dibulatkan 3 desimal (sekitar 110 meter).

Antrean luring bersama (`public/inti/antre.js`): kirim urut terlama per saluran. Status 0, 408, 429, dan 5xx dicoba ulang dengan jeda `60 detik x 2^(coba-1)`, maksimum 30 menit dengan jitter 20 persen. Status 401 atau 403 meminta masuk ulang tanpa membuang butir. Status 413 membelah batch. Foto diunggah dahulu. Butir ditahan 14 hari, kecuali absen wajah 36 jam.

Titik pengungsian: kode tetap `TP-` ditambah 8 huruf base32 acak. Titik baru yang berjarak kurang dari 200 meter dari titik lain ditanyakan dahulu (haversine). Titik ditandai basi bila putaran terakhirnya lebih dari 3 hari dan belum ditutup. Pencocokan orang hanya lewat NIP 18 digit yang sama persis, lalu nomor WA yang sama persis, tidak pernah dari nama. Bentrok dan NIP tidak baku masuk daftar tinjau.

## Rantai, Kalender Kewajiban, Rapor SPM, dan Pembiayaan risiko (rancangan)

Rancangan Rantai memakai delapan jalur (awal, kaji, SK status, posko, logistik, DSP, Jitupasna, hibah) dengan status belum_mulai, berjalan, selesai, tidak_berlaku, dan macet. Macet dibedakan menjadi "lewat tenggat pasal" dan "mandek" (ambang internal). Kalender Kewajiban memakai tenggat dari `jam_aturan.json`. Rapor SPM hanya menampilkan angka kepatuhan 25 menit per BPBD tanpa ambang dan tanpa vonis. Rancangan Pembiayaan risiko membandingkan dua baris berdampingan (kerugian lawan dana DSP dan PFB) tanpa rasio tunggal. Model perkiraan kerugian awal belum ada dan baru boleh tampil setelah lulus pra-registrasi serta uji balik (hipotesis: paling sedikit 20 kejadian, minimal 70 persen nilai resmi di dalam rentang). Seluruh bagian ini belum diimplementasikan di layar atau Worker.
