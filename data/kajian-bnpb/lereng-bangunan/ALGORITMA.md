# ALGORITMA: Bangunan di lereng terjal

Semua parameter di bawah disimpan di satu berkas `lereng_param.json` dengan sidik; mengubahnya sesudah uji dibuka berarti versi baru dan Kasus (KEPUTUSAN D9). Nilai yang bertanda "bawaan teknis" bukan bersumber dan boleh diubah sebelum uji dibuka; yang bertanda Q menunggu pemilik.

## 1. Lereng per piksel (persen)

Untuk piksel dengan delapan tetangga: selisih tinggi Horn 3 kali 3.

```
dz/dx = ((c + 2f + i) - (a + 2d + g)) / (8 dx)
dz/dy = ((g + 2h + i) - (a + 2b + c)) / (8 dy)
lereng_persen = 100 * sqrt((dz/dx)^2 + (dz/dy)^2)
```

dx dan dy dalam meter, dihitung dari ellipsoid WGS84 pada lintang tiap baris piksel (panjang satu derajat lintang dan bujur dihitung di kode dari rumus ellipsoid, tidak dari konstanta tunggal). Piksel yang salah satu tetangganya nodata atau void tidak mendapat lereng. DEMNAS dibaca pada langkah aslinya (sekitar 8 m) dan GLO-30 pada 1 detik busur (sekitar 30 m); tidak ada resampling pada hitungan utama. Persen ke derajat: derajat = atan(persen / 100); 40 persen = 21,8 derajat. Satuan modul longsor lama (derajat) tidak dicampur (D1).

Uji sintetis wajib (LT-04): bidang miring 40 persen tepat memberi 40,0 persen pada kedua resolusi; puncak runcing memberi lereng lebih rendah pada GLO-30 daripada pada DEMNAS.

## 2. Lereng satu bangunan

Untuk bangunan i dan DEM k (DEMNAS atau GLO-30):

1. Himpunan piksel P_i = piksel berlereng yang pusatnya jatuh di jejak bangunan, ditambah piksel yang pusatnya di cincin 0 sampai 15 m dari jejak.
2. Piksel yang pusatnya di jejak bangunan lain dikeluarkan dari cincin (topeng bangunan), supaya atap tetangga di permukiman padat tidak dihitung sebagai tanah. Jejak bangunan sendiri tetap.
3. s_ik = median lereng piksel di P_i. Jika |P_i| = 0: pakai piksel yang berisi titik tengah bangunan dan tandai `cara = "titik"`; jika piksel itu tak berlereng: s_ik tidak ada.
4. Jumlah dan persentase bangunan dengan `cara = "titik"` per desa disimpan, karena GLO-30 sering jatuh ke jalur ini.

Median dipilih karena kuat terhadap satu piksel dinding atau pohon. Kepekaan: jejak saja, cincin saja, titik tengah, maksimum (LT-11, Q3).

## 3. Lima kelas dan "dua peta sepakat"

Ambang A = 40 persen (Q1). Untuk bangunan i:

| Kelas | Syarat |
| --- | --- |
| S sepakat terjal | s_i,DEMNAS >= A dan s_i,GLO30 >= A |
| D hanya DEMNAS | s_i,DEMNAS >= A dan s_i,GLO30 < A |
| G hanya GLO-30 | s_i,GLO30 >= A dan s_i,DEMNAS < A |
| L landai | keduanya ada dan < A |
| T tak dinilai | salah satu s tidak ada (nodata, void, di luar lembar) |

Bunyi ambang: "A atau lebih" (>=), sampai Q1 mengoreksi. Jumlah per wilayah n_S, n_D, n_G, n_L, n_T dengan n_total = jumlah semuanya. Angka utama n_S. Kelas T tidak diperkirakan dan tidak dibagi proporsional.

Rentang yang ditampilkan: batas bawah n_S; batas atas untuk bangunan yang dinilai n_S + n_D + n_G (tertulis "hanya bangunan yang dinilai"); dan n_T selalu tampil di sebelahnya, karena batas atas seluruh wilayah adalah n_S + n_D + n_G + n_T. Bila cakupan GLO-30 wilayah di bawah 0,95 (bawaan teknis, selaras Q9), rentang ditulis dengan n_T dan diberi pil "GLO-30 belum lengkap"; rentang "hanya yang dinilai" tidak ditampilkan sendirian.

Varian kepekaan (semua dilaporkan, satu hitungan utama): A = 30, 45, 60 persen di samping hitungan utama A = 40 (daftar sama dengan Q1); DEMNAS diratakan ke langkah GLO-30 dengan interpolasi bilinear sebelum lereng ("skala sama"); DEMNAS diratakan ke sekitar 24 m (rata-rata blok) sebelum Horn, dan dilaporkan porsi kelas S yang bertahan (derau DEMNAS 8 m diperbesar oleh Horn 3 kali 3 pada langkah halus; bila porsi bertahan kecil, S utama membaca derau); lereng dari DEM yang sama pada dua resolusi bukan "dua peta" dan tidak menggantikan hitungan utama.

## 4. Model permukaan, bukan tanah (risiko dan usulan mitigasi)

Kolom ketiga adalah usulan mitigasi, belum teruji sampai LT-10. Median tidak mengoreksi bias tajuk (kanopi yang rapat mengangkat atau menurunkan seluruh piksel sekitar, bukan satu piksel pencilan). Topeng bangunan tetangga lemah di permukiman jarang karena banyak bangunan hilang dari peta. Varian "cincin saja tanpa jejak" dijalankan di LT-11 untuk melihat seberapa besar atap sendiri memengaruhi S.

| Gejala | Dampak | Usulan mitigasi (belum teruji) |
| --- | --- | --- |
| Atap dan dinding bangunan pada DSM | lereng tepi bangunan melonjak, bangunan di tanah datar terhitung terjal | median (bukan maksimum); cincin 15 m tanpa jejak bangunan lain; kelas D dan G terpisah; varian cincin tanpa jejak |
| Kanopi pohon rapat | lereng terukur terlalu rendah atau terlalu tinggi di tepi tajuk | tidak ada koreksi; rentang dan n_T ditampilkan; audit FABDEM mengukur besarnya |
| Bangunan dibangun sesudah DEM | tanah dipotong atau diurug tidak terlihat | tertulis di Metode; tidak dikoreksi |
| Resolusi 8 lawan 30 m | lereng curam sempit hilang di GLO-30 | D lebih banyak dari G adalah pola yang diharapkan; hasil utama hanya S |
| Piksel void | lereng palsu di tepi lubang | nodata dibuang; bangunan di dekat void menjadi T |

Audit bias (LT-10): untuk satu sampel (misalnya satu kecamatan), hitung ulang lereng bangunan memakai FABDEM (tanah tanpa pohon dan bangunan, hanya internal, Q12) lalu laporkan berapa persen kelas S berubah. Hasil audit menjadi kalimat batas di Metode ("sekitar X persen kelas S berubah bila pohon dan bangunan dibuang pada sampel Y"), tanpa angka FABDEM di peta.

## 5. Agregat wilayah dan ukuran

Penempatan: bangunan ke desa lewat titik tengah dalam poligon desa (`public/geo/desa`, kode `kd`); kecamatan = `kd[:8]` (Kemendagri) dan disilangkan ke kecamatan BIG modul longsor. Bangunan di luar semua poligon dicatat `tanpa_desa`, tidak dibuang diam-diam.

Ukuran per wilayah w:

| Ukuran | Rumus |
| --- | --- |
| jumlah | n_S(w) |
| rentang | [n_S, n_S + n_D + n_G] |
| kerapatan | n_S(w) dibagi luas darat poligon w dalam km2 |
| fraksi | n_S(w) dibagi (n_total(w) - n_T(w)) |
| cakupan DEMNAS | bangunan dengan s_DEMNAS ada dibagi n_total |
| cakupan GLO-30 | bangunan dengan s_GLO30 ada dibagi n_total |

Syarat angka: cakupan DEMNAS minimal 0,95 (Q9). Di bawahnya tampil "belum ada DEMNAS" tanpa n_S, tanpa kolom, tanpa peringkat. Peringkat kerapatan hanya untuk wilayah berluas 1 km2 atau lebih dengan 200 bangunan dinilai atau lebih (bawaan teknis, supaya wilayah kecil tidak menjadi juara karena pembagi). Syarat tambahan untuk kedua peringkat (jumlah dan kerapatan): kelengkapan Overture wilayah diketahui (ada pembanding Open Buildings, bagian 5) dan tidak "tipis" menurut ambang yang diuji di LT-09; wilayah yang tidak memenuhinya tampil di tabel dengan tanda "belum bisa dibandingkan" dan tanpa nomor peringkat. Wilayah yang lolos cakupan tetapi tidak lolos syarat mana pun tampil di tabel tanpa peringkat.

Lima kecamatan teratas: dua daftar, menurut jumlah dan menurut kerapatan; tidak ada skor gabungan. Pengikat sama jumlah: urutan nama (bukan acak).

Kelengkapan Overture: rasio R = n_total / N_pembanding, dengan N_pembanding hanya dari Open Buildings v3 (`data/terkunci/bangunan/kec.json`), dan hanya untuk provinsi yang punya grid (saat ini 13, 33, 63; Jawa Barat 32 tidak ada, jadi Bandung Raya tidak punya pembanding sampai grid 32 dibuat, LT-03). OSM (ohsome, `scripts/pemetaan/kelengkapan.py`) bukan pembanding yang sah untuk Overture: OSM sekitar 80 persen isi Overture (sampel Jakarta), sehingga rasionya hampir selalu tampak memadai dan menipu. Ia tidak dipakai untuk menghasilkan kelas. Ambang kelas `scripts/pemetaan/konst.py` dibuat untuk OSM terhadap Open Buildings dan tidak dipakai untuk rasio Overture sebelum diuji; sampai LT-09 menetapkan ambang dari sampel, rasio R hanya ditampilkan sebagai angka tanpa kelas, dan kelas "tipis" belum ada. Provinsi tanpa grid: kelas "tidak diketahui" dan bangunan ditulis "paling sedikit n". Bangunan yang tidak ada di peta tidak pernah diisi nol dan tidak pernah dikoreksi dengan faktor.

Penyembunyian hitungan kecil: wilayah dengan bangunan dinilai kurang dari 20 tampil tanpa rincian kelas. Angka 20 adalah bawaan teknis (tanpa sumber), bukan hasil perhitungan; ia disimpan sebagai `n_min_rincian` di `lereng_param.json` dan diubah hanya sebelum uji dibuka.

Sumber bangunan per desa (persen OSM, Microsoft, Google, dari `sources[]`) ikut disimpan sebagai petunjuk kelengkapan, bukan sebagai koreksi.

## 6. Perubahan tutupan dan potongan melintang

Perubahan tutupan (LT-15, hipotesis): untuk kejadian dengan tanggal t0, ambil citra Sentinel-2 L2A bebas awan paling dekat sebelum t0 dan sesudahnya (kelas awan dari band SCL, piksel awan dan bayangan dibuang). NDVI = (B8 - B4) / (B8 + B4); dNDVI = NDVI_sebelum - NDVI_sesudah. Kandidat perubahan = dNDVI di atas persentil ke-98 dNDVI pada daerah kontrol tanpa kejadian di citra yang sama (bawaan teknis, bukan dari label), dan lereng DEMNAS minimal 20 persen (menyingkirkan panen dan tanam sawah datar; bawaan teknis). Hasil adalah lapisan perubahan, bukan batas longsor. Validasi hanya visual terhadap sumber resmi yang bisa dibuka (Q16); tidak ada luas dalam hektare tanpa itu.

Klaim "awal lereng 45 sampai 60 persen" diuji dengan cara berikut: ambil mahkota (bagian atas) perubahan, ukur median lereng DEMNAS dan GLO-30 di sekitarnya, laporkan kedua angka dan rentangnya, dan tulis apakah termasuk 45 sampai 60. Jika tidak, tulis tidak.

Potongan melintang: garis lurus dari titik A ke B, panjang L; sampel tinggi tiap 10 m dengan interpolasi bilinear dari tiap DEM; lereng per ruas dari beda tinggi ruas 30 m (tiga sampel); ruas dengan lereng di atas A diberi tanda. Dua profil digambar bersama, selisih tinggi tertulis. Sumbu vertikal diperbesar: pengganda tertulis di gambar. Garis dipilih tegak lurus kontur utama melalui titik awal kejadian atau melalui cekungan terpilih; pemilihannya manual di LT-16 dan dicatat.

## 7. Kolom 3D

Tinggi kolom = nilai ukuran terpilih (jumlah atau kerapatan) dikali satu skala linear; skala dan satuan tertulis di legenda, tidak ada skala log. Wilayah "belum ada DEMNAS" tidak digambar sebagai kolom (tanpa kolom bukan kolom nol), dan poligonnya diarsir abu. Wilayah "tidak diketahui" kelengkapan tetap digambar dengan tanda di tooltip.

## 8. Uji kecocokan dengan desa longsor

Unit: desa.

Aturan inklusi positif (ditulis sebelum daftar disusun, dibekukan bersama daftar). Satu desa menjadi positif bila ada paling sedikit satu kejadian yang memenuhi semuanya: (1) jenis longsor atau gerakan tanah, bukan banjir bandang atau banjir yang memuat kata longsor secara sampingan; (2) tanggal kejadian 1 Januari 2025 sampai 31 Januari 2026 (bawaan teknis, selaras "2025 sampai 2026" K1; diubah hanya sebelum daftar dibuka); (3) sumber minimum satu laporan resmi (BPBD, Badan Geologi) atau dua liputan media independen yang menyebut desa itu; (4) lokasi menyebut desa atau dapat dipetakan ke satu `kd` tanpa ambiguitas. Desa yang tidak dapat dicocokkan ke satu `kd` (nama ganda, desa pemekaran, nama hanya kecamatan) dicatat di `uji.json` bagian `gagal_cocok` dengan alasannya dan dikeluarkan dari uji; ia tidak dijadikan negatif dan tidak dipaksa masuk. Angka 21 dari video bukan aturan: bila aturan di atas menghasilkan 17 atau 26 desa, itu yang dipakai dan selisihnya dilaporkan.

Urutan wajib (mencegah desa dipilih sesudah agregat terlihat): daftar `data_kejadian_desa.json` dan sidiknya di-commit SEBELUM agregat Bandung Raya (LT-09) dihitung atau dilihat. Daftar tidak diubah sesudahnya; koreksi berarti versi baru dan Kasus.

Negatif: semua desa lain di kabupaten/kota yang sama. Desa yang cakupan DEMNAS-nya kurang dari ambang dikeluarkan dari uji dan dihitung banyaknya (bukan dijadikan negatif). Noise label: desa negatif bisa saja pernah longsor tanpa diberitakan (negatif tidak murni); ini tertulis di Metode dan melemahkan, bukan menguatkan, AUC. Kepekaan: ulangi uji dengan membuang desa yang bertetangga langsung dengan desa positif (batasnya bersentuhan), karena tetangga paling mungkin longsor tak terlapor.

Bias arah rilis: Overture rilis 2026-10-21.0 dibuat sesudah kejadian 2025 sampai Januari 2026. Bangunan baru di desa sesudah kejadian (misalnya hunian pengganti atau relokasi) ikut terhitung, dan bangunan yang runtuh karena longsor mungkin sudah hilang dari peta. Arah biasnya tidak pasti dan ditulis di Metode. Kepekaan: ulangi dengan rilis Overture yang lebih awal bila tersedia (LT-11, bergantung ketersediaan di sumber.json) atau laporkan bahwa tidak bisa diuji; jangan menyatakan arahnya sebagai fakta.

Skor kandidat: (a) n_S, (b) fraksi, (c) kerapatan. Satu skor utama dibekukan di LT-13 sebelum label dibuka; sisanya dilaporkan.

Pembanding wajib, semuanya dihitung dengan metrik yang sama: p75 lereng persen desa dari DEM yang sama (tanpa bangunan); n_total bangunan desa (kontrol paparan bangunan dan bias pemberitaan); acak; skor DEMNAS saja (n_D + n_S); skor GLO-30 saja (n_G + n_S). Dua yang terakhir menguji klaim "dua peta sepakat": bila n_S tidak lebih baik daripada salah satunya, sepakat tidak menambah apa pun dan itu dilaporkan. Pembanding terbaik dihitung dari himpunan kelima ini. Tidak ada pembanding dari model nowcast.

Metrik: AUC dalam strata (pasangan positif dan negatif hanya dalam kab/kota yang sama). Bobot penggabungan strata: tiap pasangan positif dan negatif berbobot sama (bobot per pasangan), sehingga kab dengan lebih banyak pasangan lebih berpengaruh; n positif per kab dilaporkan, dan kab dengan satu positif dicatat karena kontribusinya rapuh. Peringkat persentil tiap positif dalam kabnya, dan varian dengan strata kab dikali tercile n_total. Selang 95 persen: bootstrap atas desa positif (B = 2.000) dengan negatif tetap; uji permutasi label dalam kab (B = 10.000); selisih skor utama dikurangi pembanding terbaik diberi selang bootstrap berpasangan (positif yang sama diambil ulang untuk keduanya). Kejadian Cisarua dan Pasirlangu dilaporkan terpisah sebagai kasus perintis (alasan hipotesis ini ada) dan satu kali dengan dan satu kali tanpa mereka.

Vonis (Q8, dibekukan di LT-13): LOLOS awal bila AUC skor utama lebih besar atau sama dengan 0,65, batas bawah selang AUC di atas 0,5, dan batas bawah selang bootstrap berpasangan selisih (skor utama dikurangi pembanding terbaik) di atas 0. Bila selang selisih memuat 0: vonis "awal, tak terbedakan dari pembanding", bukan LOLOS. Margin tetap 0,02 AUC seperti aturan modul longsor tidak dipakai di sini karena tidak bermakna dengan sekitar 21 positif. Selain itu GAGAL, ditulis apa adanya. Vonis selalu berlabel "awal" dan tidak pernah "terbukti". Hasil bukan klaim prediktif: ia hanya menyatakan apakah desa yang longsor memang lebih banyak bangunan di lereng daripada tetangganya.

Uji kedua (LT-25, tingkat kecamatan nasional): kab-hari dan kecamatan tahun dari DIBI (`kejadian.json`) dan MAGMA (`tanggapan_pvmbg.json`), tahun uji dan strata mengikuti aturan modul longsor (tahun 2022, 2023, 2025; DIBI 2024 dibuang). Dikerjakan hanya sesudah tahap Jawa selesai.

Prospektif (LT-26): lapisan versi beku dibandingkan dengan desa yang baru longsor sesudah tanggal beku; append-only.

## 9. Pencocokan angka video (D13)

Setelah hitungan Bandung Raya, laporkan berdampingan: n_total Bandung Barat (video 687 ribu), n_S Bandung Barat (video lebih dari 5.000), n_S empat kab/kota (video lebih dari 9.000), dan lima kecamatan teratas (nama dan urutan). Selisih dijelaskan: rilis Overture, bunyi ambang (>= atau >), lereng persen lawan derajat, cincin atau titik, batas kecamatan. Tidak ada parameter yang diubah agar angka mendekat.
