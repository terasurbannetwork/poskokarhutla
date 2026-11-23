# ALGORITMA: Simulasi tsunami dengan genangan darat

Semua angka ambang di sini adalah **hipotesis awal** dan ditetapkan dari tiket yang disebut. Tidak ada angka kinerja mesin. Rumus fisika diperiksa ulang ke sumbernya oleh tiket pemakainya.

## 1. Pemilihan gempa (kelayakan)

`Tsunami.layak(e)` yang ada: M >= 6,5, faktor kedalaman > 0 (subduksi dangkal dari 30 km menurun ke nol di 50 km; kerak dari 20 km ke nol di 40 km), dan jejak bidang patahan <= 20 km dari sel laut. Aturan ini tidak diubah di paket ini. Syarat lengkap di kode: `e.m >= 6,5`; `e.dalam` kosong atau kurang dari 100 km; `faktorDalam(dalam, jenis) > 0`; tanpa grid termuat syarat laut dilewati. Pembacaan batimetri yang harus ditiru Python: `batimetri.bin` berisi Int16 little-endian, baris dari selatan ke utara, kolom dari barat ke timur, `lon0` 94,002083, `lat0` -11,997917, langkah 0,05 derajat, 960 kolom kali 380 baris, laut negatif, dan disampel titik, bukan rata-rata sel. Pencarian sel memakai pembulatan ke sel terdekat dan memberi -1 di luar cakupan (di luar 94 sampai 142 BT dan 12 LS sampai 7 LU kira-kira; angka pasti dari `batimetri.json`); perilaku di luar cakupan dicatat dari kode dan diuji kesetaraannya. Pemilih Python (`scripts/gempa/tsunami_sumber.py`) harus setara dan dibuktikan dengan uji kesetaraan Python-JS pada himpunan gempa tetap (aturan PELATIHAN-MODEL). Gempa yang lolos syarat tetapi tidak punya skenario pustaka tampil dengan kalimat "genangan belum dihitung".

## 2. Sumber awal (D5)

Ukuran bidang dari `Tsunami.ukuran(m, jenis)` (Strasser dkk. 2010 untuk antarmuka; Wells dan Coppersmith 1994 untuk kerak). Slip seragam dari M0 = mu A D, dengan mu = 3e10 Pa seperti di `tsunami.js`. Deformasi dasar laut vertikal dihitung dengan solusi Okada (1985) untuk persegi panjang berhingga di setengah ruang elastis, dengan strike, dip, rake, kedalaman atas, panjang, lebar, slip. Hasilnya medan perpindahan vertikal yang dipakai langsung sebagai kondisi awal muka air (dasar laut naik, air naik sama; asumsi tsunami tidak terdispersi dan pengangkatan seketika). Berbeda dari model sekarang: ada penurunan di sisi darat patahan, bukan hanya angkatan di jejak.

- Gempa sangat panjang (M >= 8,8): bidang dibagi menjadi segmen sepanjang strike dengan slip yang sama kecuali kasus uji sensitivitas; jumlah segmen ditetapkan di TS-04 dari uji Aceh 2004.
- Kedalaman atas bidang dan dip dari mekanisme fokal bila ada (Q11); bila tidak, nilai bawaan jenis dari `tsunami.js`.
- Faktor kedalaman pusat (`faktorDalam`) tidak dipakai sebagai pengali pada Okada; kedalaman atas bidang yang menentukan seberapa besar permukaan terdeformasi. Perbedaan perlakuan ini dicatat di bab Metode.
- Pemeriksaan: volume air terangkat tidak boleh berbeda dari hitungan peramban `Tsunami.rupture` lebih dari batas yang ditetapkan di TS-04; perbedaan yang lebih besar harus dijelaskan, bukan disembunyikan.

## 3. Grid bersarang (D3)

| Tingkat | Peran | Sumber data (bawaan sementara) | Resolusi rancangan |
| --- | --- | --- | --- |
| L0 | laut dalam sampai paparan | ETOPO 2022 (sudah ada) | 3 menit busur, sekitar 5,5 km |
| L1 | paparan benua | GEBCO (Q3) | sekitar 15 sampai 30 detik busur |
| L2 | dekat pantai, laut dangkal | GEBCO atau BATNAS (Q3) | sekitar 5 detik busur |
| L3 | kotak pantai sasaran, laut dan darat | DEMNAS darat (K4; GLO-30 cadangan) dan batimetri dangkal | sekitar 1 detik busur (sekitar 30 m) atau lebih rapat bila data dan hitung mendukung |

Rasio penyempurnaan dan jumlah tingkat adalah rancangan; GeoClaw menentukan penyempurnaan adaptif sendiri sehingga L1 sampai L3 dapat berupa ambang AMR, bukan grid terpisah (Q1). Sambungan darat-laut: garis pantai ditentukan dari tinggi nol DEM yang disatukan; batimetri dan DEM disamakan datum (rata-rata muka laut) dan celah dekat pantai ditutup dengan interpolasi yang dicatat. Ketidaksesuaian datum ditulis di bab Metode.

## 4. Persamaan dan gesekan

Persamaan air dangkal nonlinear dalam bentuk konservasi (kedalaman h dan fluks hu, hv) dengan basah-kering dan gesekan dasar Manning: percepatan gesekan = g n^2 |u| u / h^(4/3). Koefisien Manning n per kelas lahan dari tabel baku dengan sumbernya ditulis di bab Metode, dengan nilai laut bawaan yang seragam; tabel memakai WorldCover dan jejak bangunan (TS-07). Dispersi (Boussinesq) hanya dibahas sebagai batas: tsunami yang menempuh jarak jauh dari sumber sangat dipengaruhi dispersi, jadi hasil untuk sumber jauh diberi catatan. Ambang kering dan ambang waktu tiba pertama adalah bawaan sementara (ambang waktu tiba: muka air naik 0,2 m dari awal; ambang kering ditentukan mesin) dan dicatat di berkas keluaran.

Kondisi batas: tepi luar L0 memakai batas keluar-radiasi; tepi kotak halus mengikuti induknya. Pasang surut: tinggi muka laut awal seragam (muka laut rata-rata, bawaan); pengaruh pasang tidak dimodelkan dan ditulis di bab Metode (jangan dikarang 'aman' di pasang surut rendah).

## 5. Keluaran per pantai

Dari satu hitungan, per sel L3: kedalaman maksimum d_maks (m), waktu tiba pertama (menit sesudah gempa), dan kecepatan arus maksimum bila mesin menyediakannya. Dari garis pantai: tinggi maksimum di pantai (m) dan run-up hitung R_hitung = elevasi tertinggi tanah yang tergenang (batas basah maksimum), dengan lokasi. Rekaman muka air kotak halus pada selang waktu tetap untuk animasi (Q12). Semua disimpan terkuantisasi: kedalaman dalam langkah tetap 0,05 m sampai 8 m ke atas (lebih dari 8 m dipotong ke kelas "lebih dari 8 m" dan nilai aslinya disimpan sebagai angka tersendiri).

Angka ringkas: luas tergenang A_g = jumlah luas sel darat dengan d_maks lebih dari ambang basah; persen = A_g / luas darat di dalam kotak halus. Pembagi selalu ditulis. "Semenanjung" pada contoh K1 diperlakukan sebagai kotak halus pantai itu, bukan wilayah administratif, kecuali ada batas yang disebut.

## 6. Pustaka skenario dan pemilihan

Pustaka = himpunan skenario (lokasi sumber, M, mekanisme) dihitung sekali untuk tiap kotak halus. Untuk gempa baru yang layak, pilih skenario terdekat: pada mekanisme yang sama, jarak pusat gempa ke pusat bidang skenario paling kecil, di antara skenario yang selisih magnitudonya paling kecil. Ambang jarak dan selisih M diturunkan dari uji kepekaan di bagian 8 (butir "kepekaan tingkat B"), bukan ditetapkan lebih dulu. Sampai uji itu ada, tingkat B tampil hanya bila mekanisme sama, selisih M paling banyak 0,1, dan pusat gempa berada di dalam jejak bidang skenario (bawaan sementara paling ketat; menggantikan angka 0,5 yang lebih longgar). Di luar itu layar menulis "belum dihitung". Layar selalu menyebut jarak, selisih M, dan bahwa ini skenario, bukan hitungan gempa itu.

## 7. Run-up historis

Dari NCEI (RISET bagian 5): disaring Indonesia, kode validitas kejadian pasti, dan titik run-up berkoordinat. Satu lokasi dapat memuat beberapa kejadian; batang run-up dikelompokkan per lokasi dan diurut tahun. Titik di dalam jarak tertentu dari lokasi pemilih (bawaan 20 km, ditetapkan di TS-17) dihitung "lokasi terdekat". Tinggi amatan yang dilaporkan sebagai tinggi air di pantai dan sebagai run-up sebenarnya adalah dua besaran berbeda; keduanya ditandai dan tidak dicampur. Bila kolom tipe pengukuran tidak ada, titik ditampilkan tanpa disatukan dengan yang lain.

## 8. Uji balik

### 8.1 Kelas kejadian (D8, Q7)

Kelas ditentukan dari sifat sumber dan ketersediaan data saja, tidak pernah dari hasil hitungan. Aturan tertulis:
- Kelas A: gempa tektonik dengan rupture biasa (bukan tsunami lambat menurut literatur, bukan dipicu longsor) dan punya titik run-up berkoordinat yang cukup di NCEI.
- Kelas B: sumber yang diketahui di luar jangkauan slip seragam: gempa tsunami (rupture lambat), tsunami yang terutama dari longsor, atau sumber non-gempa. Dijalankan dan dilaporkan, tidak ikut vonis.
- Dikeluarkan dari kedua kelas: kejadian dengan titik amatan terlalu sedikit atau tidak berkoordinat, dengan alasan tertulis. Tidak dipindah ke kelas B karena kekurangan data.
Ketersediaan NCEI diperiksa di TS-03, dan kelas tiap kejadian dikunci di TS-14, sebelum hitungan uji apa pun. Penentuan "rupture lambat" memakai literatur terbitan yang dicatat sumbernya di berkas kriteria (**[periksa]**); dugaan awal ada di RISET bagian 6.

### 8.2 Pengembangan dan uji

- Kejadian pengembangan (bawaan: Aceh 2004 saja): tempat sumber, gesekan, ambang basah, dan segmentasi disetel. Hasilnya dilaporkan terpisah dengan label "disetel" dan TIDAK ikut vonis atau label "teruji".
- Kejadian uji: seluruh kelas A lainnya, dihitung sekali dengan parameter terkunci. Vonis dan label "teruji pada n kejadian" hanya dari kejadian uji (n = jumlahnya).
- Jumlah minimal kejadian uji `n_min` ditetapkan di TS-14 (bawaan sementara 8 supaya selang bootstrap bermakna). Di bawah `n_min` model tetap berlabel hipotesis, walau semua kejadian uji lolos. Bila kelas A ternyata hanya beberapa kejadian (dugaan awal: sedikit), itu hasilnya: label tetap hipotesis dan batas ditulis terbuka; ambang `n_min` tidak diturunkan agar lulus.

### 8.3 Daftar beku (di-commit sebelum hitungan uji pertama; hash berkasnya dicatat di tiap berkas hasil)

1. Kelas tiap kejadian dan pembagian pengembangan dan uji.
2. Versi dan hash masukan mesin, versi mesin, DEM, batimetri, tabel Manning.
3. Besaran berpasangan per jenis titik amatan (8.4).
4. Jendela jarak W: titik hitungan yang dipakai untuk titik amatan i = nilai terbesar dalam jarak W di sepanjang garis pantai di sekitar titik itu, sama untuk model dan pembanding. Nilai W ditetapkan di TS-14 dan dilaporkan juga untuk dua W lain sebagai kepekaan. Memakai nilai terbesar condong ke atas (bias terhadap model yang menghitung terlalu tinggi); bias itu ditulis di bab Metode.
5. Metrik: Ri = H_obs,i / H_hit,i; K = exp(rata-rata ln Ri); kappa = exp(simpangan baku ln Ri); galat log E = akar(rata-rata (ln Ri)^2).
6. Aturan terbit (8.5), `n_min`, aturan pembuangan titik (alasan tertulis, hanya sebelum uji), dan ambang K dan kappa (Q8).

### 8.4 Besaran yang dibandingkan (D9)

Abe (`Tsunami.tinggi`) mengembalikan tinggi pantai Hr (`m`), dengan `hi` = 2 Hr sebagai Hm yang oleh pembuatnya dianggap tinggi maksimum. Karena itu pasangan dibuat per jenis titik amatan dan tidak dicampur:
- titik run-up (elevasi tertinggi tanah yang dicapai): model R_hitung (batas basah maksimum) lawan Abe `hi` (2 Hr);
- titik tinggi air di pantai (pengukur pasang, tinggi gelombang di garis pantai): model eta maksimum di garis pantai lawan Abe `m` (Hr);
- jenis amatan lain atau tidak jelas: dilaporkan tersendiri tanpa vonis.
Tiap jenis dihitung K, kappa, dan E sendiri.

### 8.5 Aturan terbit (tepat satu, dipilih di TS-14 sebelum hitungan uji apa pun)

Pilihan (a): tiap kejadian uji harus lulus sendiri-sendiri. Pilihan (b): gabungan. Bila (b): ln K_gab = rata-rata ln K per kejadian; kappa_gab = exp(akar(rata-rata (ln kappa per kejadian)^2)); ambang K_gab dan kappa_gab sama dengan ambang Q8. Keduanya tidak boleh dipilih sesudah melihat hasil uji.

Lulus bila: ambang K dan kappa terpenuhi menurut aturan yang dipilih, DAN model lebih baik dari Abe pada selisih berpasangan: d_i = |ln R_model,i| - |ln R_abe,i| per titik (negatif berarti model lebih dekat ke amatan), dirata-ratakan per kejadian, lalu selang kepercayaan 95% bootstrap dengan resampel kejadian (bukan titik) tidak memotong nol. Selang bootstrap hanya dilaporkan bila n kejadian uji paling sedikit `n_min`; di bawahnya tidak ada selang, selisih per kejadian ditulis apa adanya, dan label tetap hipotesis (jackknife per kejadian boleh dicantumkan sebagai gambaran, dengan keterangan bahwa itu bukan selang).

Titik amatan memuat jarak ke garis pantai dan catatan lokasi; titik yang meragukan dibuang dengan alasan tertulis sebelum uji dibuka, tidak sesudahnya. Uji kepekaan wajib (tidak ikut vonis): DEM berbeda pada satu pantai, sumber seragam lawan heterogen (Q10).

### 8.6 Kelas B

K, kappa, E, dan peta selisih ditulis ke bab Batas apa adanya.

### 8.7 Kepekaan tingkat B (skenario terdekat lawan hitungan langsung)

Yang divalidasi adalah hitungan dengan sumber per kejadian, tetapi yang tampil bagi gempa baru adalah skenario terdekat. Sebelum tingkat B boleh berlabel "teruji", untuk tiap skenario pustaka dan kotak: hitung langsung gempa buatan yang diganggu (selisih M dan jarak pusat dalam rentang yang diminta, tanpa memakai data amatan) lalu bandingkan dengan skenario terdekat yang dipilih aturan bagian 6: selisih ln d_maks, selisih luas tergenang, dan selisih waktu tiba. Ambang jarak dan selisih M di bagian 6 diturunkan dari hasil ini (selisih yang masih di bawah toleransi yang ditetapkan di TS-13). Sebelum uji ini ada, tingkat B selalu hipotesis, apa pun hasil uji balik.

## 9. Prospektif (D10)

Untuk tiap gempa nyata yang disimulasikan dan diterbitkan: bekukan masukan, versi mesin, dan keluaran sebelum pengamatan resmi muncul. Pembanding yang sah hanya yang titiknya ada di dalam hitungan:
- tinggi muka air terukur BMKG di stasiun (arsip InaTEWS) hanya menilai muka air di stasiun itu, dan hanya bila stasiun berada di dalam kotak halus atau di dalam domain hitung; di luarnya "tidak dinilai";
- genangan darat dan run-up hanya dinilai dengan run-up lapangan terbitan (survei); tanpa itu tertulis "tidak dinilai", bukan lulus.
Hasil ke `public/gempa/data/tsunami_prospektif.json`, hanya menambah baris. Klaim ketepatan butuh n kejadian dan ditetapkan di TS-23.

## 10. Label

| Keadaan | Label | Syarat |
| --- | --- | --- |
| Uji belum lulus, n uji di bawah `n_min`, atau tingkat B tanpa uji kepekaan | hipotesis | default |
| Kejadian pengembangan | disetel (dilaporkan terpisah, bukan bukti) | selalu |
| Lulus pada kejadian uji kelas A | teruji pada n kejadian, K dan kappa tertulis | hanya untuk kelas sumber dan kotak yang diwakili kejadian uji kelas A itu, dan hanya tingkat A; kotak atau kelas sumber lain tetap hipotesis, atau tampil catatan batas ("sumber jenis ini belum teruji") |
| Kotak yang kejadian ujinya hanya kelas B (mis. kotak Pangandaran sampai Cilacap) | hipotesis, dengan catatan batas bahwa kejadian di kotak ini meleset pada uji | selalu |
| Skenario pustaka | skenario terdekat | selalu bila tingkat B |
| Hitung gempa ini | dihitung untuk gempa ini | tingkat A |
| Lulus tetapi prospektif belum cukup | tidak ada kata "akurat" atau "andal" | selalu |

Kalimat batas wajib di samping legenda pada tiap tampilan genangan, karena "kering" mudah dibaca menenangkan: "Tidak tergenang pada simulasi ini. Tinggi darat dari DEM permukaan, tanpa pasang surut, tanpa dispersi, tanpa longsor. Bukan jaminan." Kelas kedalaman di bawah 0,05 m digabung ke kering dengan sengaja, dan itu ditulis di legenda.
