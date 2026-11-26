# Batasan dan tanya jawab

Halaman ini merangkum batasan modul Prediksi dan menjawab pertanyaan yang sering muncul.

## Batasan

Yang perlu diwaspadai staf:

- Prakiraan hujan, asap, gelombang, dan angin berasal dari model global bersel besar. Satu titik mewakili satu kabupaten/kota, sehingga kondisi setempat yang berbeda tidak tertangkap.
- Semua bencana pada data 23 November 2026 masih "belum teruji". Pembanding berdasarkan frekuensi bulan baru memakai pengamatan sejak akhir Oktober 2026, bukan iklim bertahun-tahun. Label akan berubah seiring bertambahnya data.
- Asap, rob, gelombang, dan angin belum punya pengamatan pembanding, jadi belum bisa dinilai.
- Catatan kejadian nasional (DIBI) terisi susulan, dan catatan Pusdalops hanya memuat kejadian besar. Hari tanpa catatan bukan berarti hari tanpa kejadian.
- Angka jiwa terpapar, pengungsi, dan kebutuhan harian adalah perkiraan kasar yang belum diuji balik. Untuk longsor, karhutla, dan angin angkanya batas atas.
- Peta ruas jalan rawan putus memakai peta terbuka OpenStreetMap, yang tidak lengkap di daerah terpencil.
- Tangga: prediksi musim BMKG tampil nasional karena pemetaan zona musim ke kabupaten/kota belum ada; peringatan cuaca jam hanya sampai provinsi; ancaman kering pada skala jam belum punya sumber.
- Yang sering salah dipahami: warna bukan status resmi; sinyal bukan peluang; "tidak disebut" bukan "tidak terancam"; tab Besok bukan pernyataan BMKG (pernyataan BMKG ada di tab Tangga); layar ini bukan peringatan dini untuk publik.

Fitur yang belum tersedia: perbandingan prakiraan dengan kejadian di halaman Dalops (empat kelompok Kena, Luput, Belum ada laporan, dan Tenang) baru berupa rancangan per 24 November 2026 dan belum ada di layar.

## Pertanyaan umum

### Mengapa banyak kolom berlabel "belum teruji"?

Karena syarat pengujiannya ketat: sedikitnya 30 hari berbeda yang sudah dinilai terhadap kejadian nyata, dan hasilnya harus lebih baik daripada dua tebakan malas. Sistem baru mengumpulkan data sejak akhir Oktober 2026. Selama labelnya abu, pakailah sebagai bahan pertimbangan bersama sumber lain.

### Apa bedanya tab Besok dan tab Tangga?

Tab Besok memuat prakiraan Centurisk97 untuk 1 sampai 3 hari ke depan di 514 kabupaten/kota. Tab Tangga memuat pernyataan resmi BMKG dari skala musim sampai jam, ditambah beberapa prediksi kita. Keduanya sengaja tidak digabung menjadi satu skor.

### Kolom saya kosong atau bertanda "–". Apakah itu berarti wilayah saya terbebas dari ancaman itu?

Tidak. Kosong berarti tidak ada data atau tidak ada pernyataan untuk wilayah itu. Kosong tidak sama dengan nol, dan tidak pernah dihitung sebagai level 0.

### Mengapa angka di tombol bencana lebih kecil dari daftar di bawahnya?

Angka di tombol menghitung kabupaten/kota berlevel Siaga ke atas, sedangkan daftar memuat yang berlevel Waspada ke atas.

### Bisakah prakiraan yang sudah tampil diubah?

Tidak. Prakiraan disimpan apa adanya dan tidak pernah diubah supaya penilaiannya jujur. Bila kenyataan di lapangan berbeda, catat lewat tab Konfirmasi lapangan; catatan itu dipakai menilai prakiraan, tidak menimpanya.

### Apa arti "perkiraan, belum diuji balik" pada angka pengungsi?

Angkanya dihitung dari penduduk di wilayah rawan dikalikan pola kejadian masa lalu, dan belum pernah dicocokkan dengan kejadian sesungguhnya. Pakailah sebagai gambaran besaran untuk perencanaan kebutuhan, bukan sebagai data kejadian.

### Apakah laporan warga ikut menilai prakiraan?

Laporan warga yang memenuhi syarat hanya dihitung sebagai tanda positif (ada kejadian) dan tidak pernah dipakai sebagai bukti bahwa kejadian tidak terjadi. Konfirmasi regu lapangan hanya mengisi hari yang belum punya catatan kejadian nasional, dan ditandai "tidak dibandingkan" karena regu hanya hadir di lokasi tertentu.

### Peluang 60% itu artinya apa?

Dari 10 kali situasi serupa, kira-kira 6 kali terjadi. Peluang bukan kepastian; itu sebabnya modelnya terus dinilai terhadap kejadian nyata.
