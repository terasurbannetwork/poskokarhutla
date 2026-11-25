# Memakai simulasi penjalaran 72 jam

Halaman ini menjelaskan cara memakai tab Simulasi dan kartu model data di dalamnya.

## Simulasi penjalaran api 72 jam

Alamat: centurisk97.id/sim, atau tab Simulasi di halaman utama. Tab ini tidak meminta masuk lebih dulu. Hak akun lain terhadap tab ini belum terdokumentasi di kode.

1. Buka tab Simulasi. Pada kunjungan pertama, peta memilih kompleks api pertama dalam daftar.
2. Pilih kompleks pada menu Cluster. Satu kompleks adalah kelompok titik panas yang saling berdekatan. Daftar memuat paling banyak 1.500 kompleks lengkap dengan kecamatan dan jumlah titiknya.
3. Pilih skenario. Skenario Prakiraan selalu dihitung sebagai pembanding. Lima skenario lain boleh dinyalakan atau dimatikan: Kemarau ekstrem, Angin kencang, Hujan datang, Serangan awal, dan Sekat bakar atau kanal.
4. Bila perlu, buka Pengaturan skenario untuk mengatur jumlah hujan, jam regu tiba, jumlah regu, atau letak sekat. Untuk perbandingan sederhana, nilai bawaan sudah cukup.
5. Tekan tombol Jalankan. Tiap skenario dihitung tiga kali dengan laju api sedikit lebih lambat, sama, dan sedikit lebih cepat daripada perkiraan, supaya terlihat seberapa pasti hasilnya. Hasilnya berupa rentang dari kemungkinan terkecil sampai terbesar.
6. Baca hasilnya. Grafik menunjukkan luas terbakar menurut jam. Kartu tiap skenario memuat luas pada 24, 48, dan 72 jam beserta rentangnya, jangkauan api dalam kilometer, dan desa pertama yang tercapai. Geser penggeser waktu atau tekan Putar untuk melihat peta berubah warna.

Contoh membaca kartu: Prakiraan menunjukkan 120 hektare pada 24 jam, sedangkan Serangan awal menunjukkan 70 hektare. Artinya, bila regu tiba lebih cepat, sekitar 50 hektare dapat diselamatkan menurut hitungan ini. Angka itu untuk membandingkan skenario, bukan luas yang pasti.

Arti warna waktu tiba api di peta:

| Warna | Arti |
| --- | --- |
| Merah | Api tiba dalam 12 jam pertama |
| Oranye | Tiba antara 12 dan 24 jam |
| Kuning | Tiba antara 24 dan 48 jam |
| Kuning pucat | Tiba antara 48 dan 72 jam |
| Biru pucat | Kotak itu terbakar pada Prakiraan tetapi tidak pada skenario yang sedang dilihat |

Kotak oranye bertuliskan Model, belum divalidasi selalu muncul. Pakai hasilnya untuk membandingkan skenario dan melihat arah umum, bukan sebagai angka resmi. Tidak ada tombol unduh di panel ini.

## Kartu Model data (dilatih)

Tepat di bawah kotak kalibrasi ada kotak centang Model data (dilatih) sebagai perkiraan utama, yang menyala sejak awal. Setelah skenario selesai dihitung, muncul satu kartu berisi:

1. Luas median untuk 24, 48, dan 72 jam beserta rentang 80 persen.
2. Peluang membesar. Titik api baru (kurang dari 10 kotak aktif) mendapat angka peluang. Api yang sudah 10 kotak atau lebih ditandai sebagai kebakaran besar dan tidak diberi peluang.
3. Arah utama penjalaran dalam delapan arah mata angin. Arah ini tidak dapat diramal dengan baik oleh model mana pun, jadi jangan dijadikan dasar evakuasi.
4. Luas gambut dan kawasan lindung yang ada di kotak-kotak yang diperkirakan terbakar.
5. Paparan yang teramati (bukan perkiraan): jumlah desa dalam jarak 2 km dan 5 km dari titik aktif 24 jam terakhir.
6. Garis biru di peta untuk kotak dengan peluang 5 persen atau lebih pada jam yang dipilih. Makin gelap, makin mungkin. Tanda air SIMULASI, BUKAN PENGAMATAN selalu ada di sudut kiri bawah peta.

Cara membaca label kartu:

1. Perkiraan utama: model data berarti model lolos pembanding sederhana. Perkiraan model eksperimental berarti belum lolos; kartu lalu menampilkan skor model berdampingan dengan skor pembanding. Pada penilaian 23 Oktober 2026, model per kotak belum lolos, jadi kartu berlabel eksperimental.
2. Perkiraan model data disembunyikan berarti data penilaian kelayakan tidak ditemukan. Sistem sengaja menyembunyikan daripada menampilkan angka yang tidak diketahui kelayakannya.
3. Peluang membesar belum teruji berarti uji berjalan belum memenuhi syarat. Alasannya ditulis di layar.
4. Baris Uji balik historis, bukan uji prospektif hanya informasi tambahan.

## Fitur tambahan Simulasi

Beberapa tambahan melengkapi Simulasi tanpa mengubah cara api dihitung:

1. Tampilan 2D atau 3D, titik api pilihan sendiri, dan mode forensik dengan garis waktu. Insiden pada titik pilihan sendiri adalah buatan: pertumbuhan teramatinya nol, tetapi cuaca prakiraan tetap nyata.
2. Panel kanan dengan empat tab: Lapisan, Analisis, Bukti, Catatan. Arah kepala api (bagian api yang paling cepat maju) dibandingkan dengan arah angin rata-rata enam jam terakhir. Selisih kurang dari 30 derajat diberi label Didorong angin, selisih 120 derajat atau lebih diberi label Melawan angin. Catatan hanya tersimpan di perangkat Anda dan tidak dikirim ke mana pun (maksimal 50 catatan per insiden).
3. Tab Drones dan Resources memperagakan gerak drone dan regu. Keduanya hanya peragaan dan tidak mengubah luas api.
4. Mode Perlakuan menyusun calon tindakan dari sumber nyata (regu, pemadam desa, helikopter, sekat bakar, modifikasi cuaca, atau gabungannya), menjalankan tiap calon, lalu mengurutkannya menurut luas yang diselamatkan dalam 72 jam beserta biayanya. Asumsi seperti waktu mobilisasi ditampilkan di kartu Asumsi.
