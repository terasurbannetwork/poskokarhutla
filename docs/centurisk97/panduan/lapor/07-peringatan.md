# Peringatan dini kecamatan

Halaman ini menjelaskan dari mana tingkat peringatan dini berasal dan kapan notifikasi dikirim.

## Cara tingkat dan notifikasi ditentukan

Peringatan dini tidak dihitung ulang di sini. Sistem membaca prakiraan tiga hari per kabupaten/kota dari modul Prediksi, yang diperbarui tiap hari, lalu mengabari pelanggan bila tingkatnya naik.

Dari mana tingkat berasal, menurut jenisnya:

- Banjir dan longsor: tingkat tertinggi di antara kecamatan dalam kabupaten/kota itu, dari pemantauan modul Banjir dan Longsor.
- Asap: kadar partikel halus (PM2,5) hasil prakiraan. Tingkat naik saat kadar melewati 55,4, 150,4, dan 250,4 mikrogram per meter kubik, yaitu batas kategori tidak sehat, sangat tidak sehat, dan berbahaya menurut aturan kualitas udara nasional.
- Angin kencang: embusan angin tertinggi dalam sehari. Tingkat naik saat embusan mencapai 46, 63, dan 89 kilometer per jam.

Arti tingkat: Normal berarti belum ada ambang terlewati, Waspada berarti ambang pertama terlewati, Siaga ambang kedua, dan Awas ambang tertinggi. Contoh: bila kadar partikel halus prakiraan 70 mikrogram per meter kubik, batas pertama (55,4) terlewati, sehingga tingkatnya Waspada.


1. Setiap jam sistem membaca tingkat prakiraan tiap kabupaten/kota, jenis, dan hari (1 sampai 3 hari ke depan). Hari yang sudah lewat dilewati.
2. Kosong tidak pernah dianggap 0. Tingkat di bawah Waspada tidak diproses.
3. Peristiwa baru hanya dibuat bila tingkatnya naik dibanding tingkat tertinggi yang sudah pernah dicatat untuk kabupaten/kota, jenis, dan tanggal itu. Turun atau tetap tidak memicu notifikasi.
4. Penerimanya langganan yang kecamatannya di kabupaten/kota itu, jenisnya dipilih, dan ambangnya terpenuhi. Satu perangkat mendapat satu notifikasi per kabupaten/kota yang menggabung semua jenis yang naik, dengan tingkat tertinggi di judul.
5. Notifikasi tingkat Waspada ditahan antara pukul 22.00 dan 05.00 WIB dan dikirim sesudah pukul 05.00. Siaga dan Awas tidak ditahan.
6. Tidak dikirim bila data prakiraan lebih tua dari 36 jam.

Karena pengiriman dibatasi, bila banyak kabupaten/kota naik tingkat bersamaan, notifikasinya terkirim bergiliran, kira-kira satu kabupaten/kota per jam.

Contoh: kemarin banjir di sebuah kabupaten tercatat Waspada. Hari ini prakiraan hari kedua menjadi Siaga. Pelanggan banjir dengan ambang Waspada ke atas dan Siaga ke atas mendapat notifikasi. Pelanggan dengan ambang Awas saja tidak.

Seberapa bisa dipercaya: tingkat dihitung per kabupaten/kota, bukan per kecamatan, jadi teks notifikasi tidak mengklaim tingkat kecamatan. Tingkat ditulis "(belum teruji)" bila jenis itu belum terbukti lebih baik daripada dua cara menebak yang sederhana, misalnya menebak bahwa hari ini sama dengan kemarin. Uji balik berarti mencocokkan prakiraan masa lalu dengan kejadian yang benar-benar terjadi. Jenis angin kencang pada umumnya belum teruji; status terbarunya mengikuti hasil uji di modul Prediksi. Notifikasi ini adalah prakiraan Centurisk97 dan terpisah dari peringatan resmi BMKG.
