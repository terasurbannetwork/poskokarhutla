# Layar Simulasi

Halaman ini mencatat perilaku layar Simulasi, kartu model data, dan mode lanjutannya.

## Simulasi penjalaran api 72 jam (tab Simulasi, jalur `/sim` dan `/sim/<id kompleks>`)

Siapa yang boleh membuka: tab Simulasi ada di halaman utama (`public/index.html:1624`, daftar tab di baris 1737). Kode tab tidak memeriksa login. Akun pemirsa dapat dibatasi hanya ke tab tertentu lewat atribut `pemirsaTab` (`public/index.html:1770`); tab yang tidak diizinkan tidak muncul. Hak akun selain itu belum terdokumentasi di kode modul ini.

Langkah pakai:

1. Buka tab Simulasi. Peta Simulasi dan panel kiri muncul. Pada kunjungan pertama peta memilih kompleks pertama dalam daftar `S.kluster`.
2. Pilih kompleks pada menu "Cluster". Daftar memuat paling banyak 1.500 kompleks, masing-masing dengan kode, kecamatan, dan jumlah titik. Panel menampilkan FFMC, ISI, dan DC kompleks itu, yaitu tiga kode kekeringan sistem FWI Kanada.
3. Pilih skenario pada deretan tombol "Skenario yang dibandingkan". Skenario "Prakiraan" selalu dihitung sebagai pembanding. Lima skenario lain dapat dinyalakan atau dimatikan: Kemarau ekstrem, Angin kencang, Hujan datang, Serangan awal, Sekat bakar atau kanal.
4. Buka "Pengaturan skenario" bila perlu. Untuk Hujan datang: jumlah hujan (1 sampai 50 mm) dan jam ke berapa. Untuk Serangan awal: jam regu tiba (0 sampai 24 jam), jumlah regu (1 sampai 20), dan laju garis per regu (50 sampai 500 meter per jam), dengan bawaan dari posko dan Daops terdekat bila datanya ada. Untuk Sekat: jarak sekat dari benih terdepan (0,5 sampai 10 km) dan panjang sekat (2 sampai 20 km), atau gambar sendiri dua titik di peta.
5. Buka "Bahan bakar, lahan dan kalibrasi" bila perlu: bahan bakar di luar gambut, kawasan hutan, dan konsesi (alang-alang, sabana, atau semak), kotak "Kalibrasi laju ke pertumbuhan teramati 7 hari", dan kotak "Tampilkan peta bahan bakar".
6. Klik tombol "Jalankan N skenario". Peramban memuat peta lahan dan cuaca per jam, mengkalibrasi laju, lalu menjalankan tiap skenario tiga kali (laju kali 0,8, kali 1, kali 1,2). Waktu hitung tampil di bawah panel.
7. Baca hasil: grafik luas terbakar indikatif terhadap jam (garis tengah dan pita), kartu per skenario berisi luas pada 24, 48, 72 jam dengan rentang, jangkauan 72 jam dalam kilometer, dan desa pertama yang tercapai; tabel "Desa pertama yang tercapai" (lima desa, perkiraan jam tiba dan jarak dari pusat). Geser penggeser waktu atau tekan "Putar" untuk melihat warna waktu tiba api di peta.

Arti warna waktu tiba api di peta (`PITA`, `public/index.html:6724`): merah untuk 12 jam pertama, oranye sampai 24 jam, kuning sampai 48 jam, kuning pucat sampai 72 jam. Biru pucat menandai sel yang terbakar pada prakiraan tetapi tidak pada skenario yang sedang dilihat. Warna di peta bahan bakar: gambut cokelat tua, alang-alang kuning, sabana krem, semak hijau muda, hutan hijau tua, kebun sawit cokelat jingga, air dan sekat biru.

Kotak keterangan oranye "Model, belum divalidasi" selalu muncul. Luas dalam hektare adalah indikatif dan pita menggambarkan laju api plus minus 20 persen. Pakai untuk membandingkan skenario dan melihat arah, bukan sebagai angka resmi.

Ekspor atau unduhan: tidak ada tombol ekspor di panel Simulasi. Catatan bukti di mode lanjutan hanya disimpan di peramban (lihat di bawah).

## Kartu "Model data (dilatih)" di tab Simulasi

Kotak centang "Model data (dilatih) sebagai perkiraan utama" ditambahkan oleh `public/sim_data.js` tepat di bawah kotak kalibrasi dan menyala secara bawaan. Setelah skenario fisika selesai, peramban menjalankan `SebaranModel.ramal()` dari titik panas 24 jam kompleks itu dengan cuaca Open-Meteo, lalu menampilkan satu kartu berisi:

1. Luas median dengan rentang 80 persen untuk 24, 48, dan 72 jam (angka dibulatkan dua angka bermakna). Rentang dilebarkan dengan kalibrasi konformal bila kunci `selang` ada.
2. Peluang membesar: titik panas baru (kurang dari 10 sel aktif) mendapat angka dari model khusus; api yang sudah 10 sel atau lebih ditandai "perlakukan sebagai kebakaran besar".
3. Arah utama (delapan arah mata angin) dengan catatan bahwa arah tidak dapat diramal model mana pun pada uji.
4. Lahan di sel yang diperkirakan terbakar: hektare gambut dan kawasan lindung.
5. Paparan teramati, bukan perkiraan: jumlah desa dalam 2 km dan 5 km dari titik aktif 24 jam.
6. Garis biru di peta Simulasi: sel dengan peluang 5 persen atau lebih untuk jam yang dipilih di penggeser; makin gelap makin mungkin. Peta tanda air "SIMULASI, BUKAN PENGAMATAN" tertera di sudut kiri bawah.

Label yang perlu dibaca sebelum memakai angka:

1. "Perkiraan utama: model data" berarti gerbang `model_sel` lolos; "Perkiraan model eksperimental: model data" berarti gerbang itu belum lolos. Pada berkas `public/data/gerbang_model.json` salinan lokal (dibuat 23 Okt 2026), gerbang model sel, mesin fisika, dan jejak api semuanya `false`, jadi kartu memakai label eksperimental dan menampilkan skor model lawan skor persistensi.
2. "Perkiraan model data disembunyikan" muncul bila `gerbang_model.json` hilang atau rusak. Ini perilaku gagal-tertutup: keluaran model tidak ditampilkan dan peta peluang tidak digambar.
3. "Peluang membesar ... belum teruji" berarti uji prospektif belum memenuhi syaratnya (lihat bagian Metode, uji prospektif). Alasannya ditulis: jumlah ramalan yang sudah dinilai, galat kalibrasi, atau selisih laju dasar.
4. Baris "Uji balik historis, bukan uji prospektif" hanya informasi dan tidak membuka gerbang apa pun.
5. Bila peluang membesar tampil sebagai persen, kalimat di sebelahnya menyebut hasil uji kedua (set uji 2024 sampai 2026 sudah pernah dibuka sekali, cuaca memakai reanalisis ERA5) dan peringatan bahwa model dibuat untuk api yang baru muncul; kompleks yang sudah lama menyala bisa dinilai terlalu rendah.

## Mode lanjutan Simulasi (insiden, 3D, drone, sumber daya, adegan, perlakuan)

Lima berkas tambahan menambal Simulasi tanpa mengubah mesin penjalaran (`public/sim_3d.js`, `sim_topo.js`, `sim_panel.js`, `sim_armada.js`, `sim_adegan.js`, `sim_perlakuan.js`):

1. Tampilan 2D atau 3D (`sim_3d.js`): titik panas pilihan sendiri di peta, medan 3D, garis depan api, jalur kepala api, dan mode forensik dengan bilah insiden, panel kanan, serta garis waktu dengan tiga grafik. Insiden pada titik pilihan sendiri adalah buatan: pertumbuhan teramatinya nol, tetapi cuaca prakiraan tetap nyata. Kode insidennya berbentuk `SIM-<lintang><bujur>`.
2. Peta topografi krem berkontur (`sim_topo.js`) untuk mode forensik 2D. Pada tema gelap hanya kontur, kisi, dan puncak yang digambar.
3. Panel kanan dengan empat tab "Lapisan, Analisis, Bukti, Catatan" (`sim_panel.js`). Titik panas satelit dihitung bila berjarak 5 km atau kurang dari titik penyulutan; arah kepala api dibandingkan dengan arah angin rata-rata enam jam terakhir (selisih kurang dari 30 derajat "Didorong angin", 120 derajat atau lebih "Melawan angin"). Catatan disimpan hanya di penyimpanan lokal peramban dan tidak dikirim ke server (batas 50 catatan per insiden).
4. Tab "Drones" dan "Resources" (`sim_armada.js`): gerak drone dan regu adalah fungsi murni dari waktu putar; armadanya simulasi dan tidak mengubah luas api.
5. Adegan 3D bergaya mesin game (`sim_adegan.js`, memuat three.js 0.169 dari CDN hanya saat dibuka).
6. Mode "Perlakuan" (`sim_perlakuan.js`): menyusun calon perlakuan dari sumber nyata (regu posko dan Daops, MPA desa, helikopter, sekat bakar, modifikasi cuaca, gabungan), menjalankan tiap calon dengan mesin yang sama, lalu mengurutkan menurut luas yang diselamatkan dalam 72 jam beserta biaya. Asumsi mobilisasi, kecepatan helikopter, dan sejenisnya ada di objek `PKA` di berkas itu dan tertera di kartu "Asumsi".
