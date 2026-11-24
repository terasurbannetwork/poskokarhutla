# ALGORITMA: Hulu ke hilir per kejadian

Semua ambang yang ditandai HIPOTESIS dikunci di berkas kriteria (HH-11) sebelum kejadian uji dihitung. Rumus mengikuti kode yang ada; bila kode dan dokumen berbeda, dokumen dibetulkan lewat tiket, tidak diabaikan diam-diam. Hasil selalu berbentuk keadaan, tidak pernah sebab.

## 1. Memilih DAS untuk satu kejadian (Q7)

```
masukan : kejadian KJ dengan mulai (tanggal), jenis banjir atau banjir bandang, kab anggota
kecamatan_genangan = kecamatan anggota yang diurutkan menurut tergenang_baru_ha dari banjir_gfm (hanya status ok);
                     bila banjir_gfm belum ada: kecamatan Siaga/Awas pada hari mulai di status.json; bila itu pun kosong: semua kecamatan anggota
untuk kec dalam kecamatan_genangan (urut):
    i = sub-DAS HydroBASINS level 9 yang memuat pusat kec        (bukti_das.indeks_basin)
    keluaran(kab) = sub-DAS terbesar dengan MIN_KM2 300 <= up_area <= PLAFON_KM2 25.000 yang memuat pusat kecamatan di kab itu
    lewati bila DAS i sudah tercakup DAS yang sudah dipilih (hulu(attr, keluaran) memuat i) atau bila DAS i memuat DAS yang sudah dipilih (ganti dengan yang lebih besar)
    berhenti pada 3 DAS
bila tak satu kecamatan terpetakan: status tanpa_das
```

DAS gabungan memakai `hulu`, `larutkan`, `sederhana`, dan `validasi` Bukti DAS tanpa perubahan (rasio luas gabungan lawan jumlah `sub_area` antara 0,9 dan 1,1). Luas DAS di storymap dan di kita bisa berbeda karena delineasi; selisih dilaporkan (bagian 10).

## 2. Cuplikan dan penanda titik

Titik cuplik Hansen: kolom `k*S`, baris kelipatan S (S=4, 120 m) pada ubin 10 derajat; pusat piksel `(kiri + (k*S + 0,5)*PX, atas - (y + 0,5)*PX)`, `PX = 0,00025`. Bobot luas `ha_sel(lat)` seperti sekarang. Hutan awal = tutupan 2000 paling sedikit 30 persen (`T30`); hanya piksel hutan awal yang boleh punya tahun hilang (`tally`).

Penanda tiap titik hutan awal (D1, `penanda`):

```
z       = tinggi GLO-30 di pusat piksel DEM yang memuat titik (terdekat), meter; NaN bila nodata
lereng  = 100 x sqrt(gx^2 + gy^2), gx, gy dari Horn 3x3 di sekitar piksel itu (lereng_dem.lereng_persen);
          bila salah satu dari 9 sel NaN -> lereng NaN
kelas_lereng = "<25" bila lereng < 25 ; "25-40" bila 25 <= lereng <= 40 ; ">40" bila lereng > 40 ; "tak" bila NaN
zona    = "hulu" bila z > 500 ; "tengah" bila 50 <= z <= 500 ; "hilir" bila z < 50 ; "tak" bila NaN
```

Tabel yang dihitung (semua dalam ha; sub-DAS = unit terkecil, DAS = jumlahnya):

| Tabel | Kunci | Isi |
| --- | --- | --- |
| T-lereng | sub-DAS x kelas_lereng x tahun | hilang_ha |
| T-lereng-awal | sub-DAS x kelas_lereng | hutan_awal_ha, luas_ha |
| T-zona | sub-DAS x zona x tahun | hilang_ha |
| T-zona-awal | sub-DAS x zona | hutan_awal_ha, luas_ha |
| T-label | sub-DAS x kelas_lereng x label waktu (bagian 3) | hilang_ha |

Turunan yang tampil (selalu dengan penyebutnya):

```
porsi_hilang(t, c)  = hilang(t, c) / jumlah_c hilang(t, c)        tanpa kelas "tak" di pembilang dan penyebut; hilang "tak" ditulis terpisah
porsi_hutan(c)      = hutan_awal(c) / jumlah_c hutan_awal(c)      tanpa kelas "tak"
laju(t, c)          = hilang(t, c) / hutan_awal(c) x 100           persen, dasar hutan awal tahun 2000 (hutan yang pulih tidak dikurangi)
selisih_porsi(t, c) = porsi_hilang(t, c) - porsi_hutan(c)          poin persen; dibaca "lebih (kurang) banyak dari yang diharapkan dari sebaran hutannya"
```

"52 persen hilang di lereng lebih dari 40 persen" hanya ditulis bersama `porsi_hutan(>40)` DAS itu dan `selisih_porsi`. Angka di bawah 10 ha tampil "~" (derau cuplikan, uji 18 Okt 2026). Kelas dengan hutan awal 0 ha tidak punya laju, tampil "tidak ada hutan di kelas ini".

Kepekaan yang selalu dihitung dan disimpan: batas lereng 30, 45, 60 persen sebagai pengganti 40; kepekaan hanya masuk Metode, tidak ke kartu utama.

Kelengkapan DEM: `cakupan_dem(DAS) = ha titik hutan awal dengan z bukan NaN / ha hutan awal`. Kurang dari 90 persen (Q18, HIPOTESIS) berarti kartu menulis "DEM tidak cukup untuk DAS ini", angka kelas tidak tampil, tabel tetap disimpan untuk audit.

## 3. Label waktu terhadap kejadian (K6, D9)

```
Y        = tahun dari mulai kejadian (WIB)
TAHUN_AKHIR_HANSEN = tahun terakhir lossyear pada rilis yang dipakai (v1.13: 2025)
label(t) = "sebelum"        bila t < Y
         = "tahun_kejadian" bila t == Y dan Y <= TAHUN_AKHIR_HANSEN
         = "sesudah"        bila t > Y
         = "belum_tercakup" bila Y > TAHUN_AKHIR_HANSEN       (semua tahun sampai TAHUN_AKHIR_HANSEN tetap "sebelum")
```

Label tambahan `tahun_kejadian_di_longsor` (bagian 12) memisahkan tajuk yang hilang karena longsor saat kejadian. Hanya label "sebelum" yang boleh dibaca sebagai keadaan sebelum kejadian. "tahun_kejadian" selalu ditampilkan sendiri dan tidak pernah digabung ke "sebelum" atau ke "sesudah". Bila alert tersedia (Q5):

```
alert(p) = (tanggal, sumber) piksel p yang terdeteksi pada tahun Y, bila ada
dalam tahun Y: hilang_sebelum_tanggal = ha piksel dengan alert.tanggal < mulai ; hilang_sesudah_tanggal = ha dengan alert.tanggal >= mulai ;
               hilang_tanpa_alert = hilang Hansen tahun Y yang tidak ditemukan alert
selaras = hilang_sebelum_tanggal + hilang_sesudah_tanggal + hilang_tanpa_alert == hilang Hansen tahun Y   (ketiganya tersusun dari Hansen, bukan dari jumlah alert)
```

Alert tidak menambah luas; ia hanya memberi tanggal pada piksel yang Hansen sudah tandai hilang tahun Y. Piksel Hansen tahun Y tanpa alert masuk `hilang_tanpa_alert` dan tidak dipaksa ke sisi mana pun. Bila `hilang_tanpa_alert` lebih dari 50 persen hilang tahun Y (HIPOTESIS), pemisahan ditulis "tidak cukup untuk memisahkan".

Pembanding tahun: `kali_median = hilang(Y) / median(hilang(Y-5..Y-1))`, ditampilkan dengan jumlah tahun pembanding. Tidak ada kesimpulan dari rasio itu; Hansen berfluktuasi dengan siklus panen HTI dan sawit.

## 4. Sempadan sungai (K2, D6)

```
sungai   = garis HydroRIVERS dalam DAS dengan luas hulu >= m0 km2 (m0 = 10, kepekaan 50 dan 100; Q2)
koridor  = gabungan kapsul: himpunan titik yang berjarak paling jauh w dari sebuah ruas garis (w = 100 m, kepekaan 50 dan 200; Q3);
           satu kapsul memotong garis lintang tepat pada satu interval (cembung), dihitung analitik; jarak dalam meter memakai lereng_dem.meter_per_derajat(lat)
luas_koridor_km2 (geometri) = jumlah panjang ruas x 2w dikurangi tumpang tindih (scanline interval, satukan)
```

Cuplikan: setiap baris cuplik memakai rentang kolom koridor (interval, `satukan`) dipotong dengan rentang DAS (`potong`). Uji lebar (HH-04): hasil S=1, S=2, S=4 pada tiga jendela koridor dibandingkan; S terkecil yang selisih luas koridor dan hilang tahunnya di bawah 5 persen terhadap S=1 dipakai; bila tidak ada yang memenuhi, S=1 dan anggaran dicatat.

Kelas sempadan, saling lepas, untuk tiap titik di koridor:

```
berhutan             : tutupan2000 >= 30 dan belum hilang sampai TAHUN_AKHIR_HANSEN
dibuka_tahun_kejadian: hilang pada Y
dibuka_sesudah       : hilang pada t > Y
kritis               : tutupan2000 < 30 (bukan hutan sejak awal) atau hilang pada t < Y
```

Jumlah keempat kelas = luas koridor tercuplik (invarian; `validasi`). Yang ditampilkan per sub-DAS: ha tiap kelas, persen terhadap luas koridor, dan `porsi_hutan_sempadan = berhutan_awal_koridor / hutan_awal_DAS` bersama `porsi_luas_sempadan = luas_koridor / luas_DAS` supaya pembaca melihat apakah hutan hilang lebih terkonsentrasi di dekat sungai daripada sebaran luasnya. Kata "kritis" hanya dipakai dengan definisi di atas; di Metode ditulis "bukan hutan sejak 2000 atau hilang sebelum kejadian; pulih tidak diukur".

## 5. Zona dan genangan (K3)

```
luas_zona(z)   = jumlah ha titik cuplik di zona z (seluruh titik, bukan hanya hutan awal)
hutan_awal(z), hilang(z, t)  : T-zona, T-zona-awal
sel genangan (110 m) dari banjir_gfm (R2): titik tergenang baru dengan bobot ha
zona_sel       = zona dari z pada pusat sel (sama seperti di atas); di luar DAS dicatat "luar_das"
genangan(z)    = jumlah ha sel tergenang di zona z ;  porsi_genangan(z) = genangan(z) / jumlah_z genangan  (tanpa "luar_das" dan "tak" di penyebut; keduanya tampil terpisah)
```

Zona tanpa area (misalnya hulu di DAS dataran rendah) ditulis "tidak ada area di zona ini". Genangan hanya dari kecamatan bercakupan sah (aturan Q4 paket genangan-satelit); kecamatan tak sah dikeluarkan dari penyebut dan dicatat jumlahnya.

## 6. Hujan (K4)

IMERG (mm per jam, rata-rata slot 30 menit, UTC pada berkas, ditampilkan WIB):

```
bobot sel c : w_c = iris_sel(Garis DAS, sel=0,1)[c]   (km2 irisan sel-DAS)
R(s)        = jumlah_c w_c r_c(s) / jumlah_c w_c    hanya sel dengan r_c(s) bukan None ; slot s tidak sah bila bobot sel sah / bobot seluruh sel < 0,8 (HIPOTESIS)
curah_slot  = R(s) / 2   mm
jendela     = [mulai - 3 hari, mulai + 3 hari] (WIB), dipotong ke ketersediaan data (Final bila ada, kalau tidak Late, kalau tidak Early; satu koleksi per hitungan, tidak dicampur)
puncak      = max_s R(s) (mm/jam) dan waktu s (awal slot, WIB) ; puncak_sel = max_c,s r_c(s) ditulis terpisah
mulai_naik  = awal slot pertama s dengan R(s) >= 5 mm/jam dan R(s+1) >= 5 mm/jam   (Q10, HIPOTESIS)
curah_jendela_mm = jumlah_s curah_slot dalam jendela kejadian ; hanya ditulis bila slot sah >= 95 persen, selain itu "tidak lengkap n dari m slot"
```

CHIRPS (mm per hari, sel 0,05 derajat): `D(d) = jumlah_c w_c p_c(d) / jumlah_c w_c` dengan `w_c` dari `iris_sel(sel=0,05)`. Jendela kejadian: tiga hari berurutan dengan total terbesar dalam `[mulai - 7, mulai + 3]`; `T3(Y)` total tiga hari itu.

```
peringkat_3hari = urutan T3(Y) di antara T3maks(y), y = tahun_dasar..Y-1, T3maks(y) = total tiga hari berurutan terbesar tahun y
peringkat_bulan = urutan total bulan kejadian Y di antara total bulan yang sama tiap tahun
peringkat_ytd   = urutan total 1 Jan sampai akhir jendela tahun Y di antara total 1 Jan sampai tanggal yang sama tiap tahun
tahun_dasar     = 1981 (awal CHIRPS v3), n = Y - tahun_dasar ; tulis "peringkat k dari n tahun", tertinggi ditulis "tertinggi dari n tahun"
```

Kalimat "hujan beberapa hari, bukan hujan setahun" hanya muncul bila `peringkat_3hari` berada di 10 persen teratas dan `peringkat_ytd` tidak (HIPOTESIS); selain itu kartu hanya menulis angka dan peringkat. IMERG dan CHIRPS ditampilkan berdampingan dengan rasio curah jendela keduanya; rasio di luar 0,5 sampai 2 diberi catatan "dua produk berbeda jauh", tidak dirata-rata. Bila peringkat tidak bisa dihitung penuh (Q9) bagian yang tidak jalan tertulis "belum dihitung".

## 7. Genangan produk resmi, jalan, dan desa (K5)

```
sumber genangan g in {GFM, UNOSAT_<paket>, CHARTER_<kode>}  (masing-masing lengkap sendiri; tidak ada gabungan)
luas_g(z) = ha genangan g menurut zona; poligon UNOSAT dicuplik pada kisi 110 m (kisi sel bangunan, satu kisi dengan GFM) supaya sebanding
jalan_g   = jumlah panjang potongan 50 m segmen jalan (Overture, Q16) yang titik tengahnya jatuh di sel tergenang g  -> km, pembulatan 0,1 km
desa_g_any = jumlah desa dengan >= 1 sel tergenang g ; desa_g_10 = jumlah desa dengan luas tergenang >= 10 persen luas desa (Q17)
```

Kedua definisi desa selalu tampil bersama; `jalan_g` ditulis "potongan 50 m, perkiraan" dengan lisensi segmen. Kesepakatan GFM lawan UNOSAT hanya dihitung pada irisan wilayah yang diamati sah oleh GFM dan masuk batas pekerjaan UNOSAT: `kesepakatan = |GFM ∩ UNOSAT| / |GFM ∪ UNOSAT|` pada kisi 110 m. Ini bukan akurasi salah satunya; kartu menulis "dua produk menggambarkan genangan yang tumpang tindih sekian persen". Angka Pemkab dan DIBI tidak dijumlah dengan apa pun dan tampil di blok "Bandingkan dengan petugas dan DIBI" milik Kaji Cepat.

## 8. Uji bahaya (K8, D11)

Level kecamatan (tanpa jaringan; dari berkas yang ada):

```
untuk tiap kecamatan sah di kejadian uji e:  g = tergenang_baru_ha / luas_ha ;  b = persen luas kelas tinggi (bahaya_kelas.json, banjir atau bandang sesuai jenis)
rho(e)      = Spearman(g, b) antar kecamatan sah
pembanding  = Spearman(g, kepadatan penduduk kecamatan) dan Spearman(g, riwayat kejadian DIBI kab per luas)
```

Level sel (butuh jaringan; sampel):

```
S_g = sampai 2.000 sel tergenang baru (bibit tetap) dari kecamatan sah ; S_k = 2.000 sel yang diamati kering sah di kab yang sama (bibit tetap)
kelas bahaya tiap sel = cuplikan titik ke ImageServer InaRISK dengan cara bahaya.py ; "di luar zona" dihitung kelas 0 (bukan data hilang)
P_g = bagian S_g di kelas tinggi ; P_k = bagian S_k di kelas tinggi ; lift = P_g / P_k ; AUC kelas (0, rendah, sedang, tinggi) genang lawan kering
selang 95 persen: bootstrap berblok 0,05 derajat (sel tetangga mirip) minimal 1.000 ulangan
```

Peta bahaya "lulus" bila memenuhi Q13 dan mengalahkan pembanding pada tingkat kecamatan. "Mengalahkan kepadatan penduduk" berarti `rho(bahaya)` lebih besar dari `rho(kepadatan)` dengan selang bootstrap selisih berpasangan di atas 0. Vonis tertulis di `data/kajian-bnpb/hulu-hilir/VONIS-BAHAYA.md` tanpa data orang. Kejadian uji dipisah dari kejadian kalibrasi di HH-11 sebelum dihitung; kejadian yang sudah terlihat (Aceh Tamiang, bahan storymap) masuk kalibrasi, bukan uji.

## 9. Kalimat templat (D8)

Hanya templat berikut yang boleh keluar dari mesin, dan hanya ditempatkan di lampiran cetak dan lipatan Metode (kartu tanpa kalimat kesimpulan, AGENTS 3.5); angka tidak pernah di tengah kata sifat kausal.

| Bagian | Templat |
| --- | --- |
| Lereng | "Di DAS ini X persen hutan awal berada di lereng lebih dari 40 persen. Dari hutan yang hilang pada [label waktu], Y persen berada di lereng itu." |
| Sempadan | "Dalam 100 m kiri kanan sungai, X persen koridor masih berhutan, Y persen kritis, Z persen dibuka pada [tahun]." |
| Zona | "X persen genangan teramati radar berada di zona hilir (di bawah 50 mdpl)." |
| Hujan | "Rata-rata DAS menerima X mm dalam tiga hari menurut [sumber]; puncak Y mm per jam pukul [jam] WIB. Peringkat k dari n tahun." |
| Label waktu | "Dari hutan yang hilang pada tahun kejadian, tanggalnya belum dapat dipisahkan." atau "X ha tercatat sebelum tanggal kejadian dan Y ha sesudahnya menurut [sumber alert]." |
| Bahaya | "Peta bahaya menempatkan X persen sel tergenang di kelas tinggi, dibanding Y persen sel kering di wilayah yang sama (selang a sampai b)." |

**Daftar kata terlarang (satu-satunya; berkas lain merujuk ke sini):** menyebabkan, akibat, gara-gara, pemicu, aman, tidak banjir, surut, terdampak (untuk angka radar), memperparah, melindungi, karena penebangan, akibat deforestasi, dan membuktikan kecuali didahului "tidak" atau "belum". Kunci JSON `total`, `jumlah_gabungan`, dan `rata` juga dilarang karena ditolak `scripts/siklus/saji.py` (`TERLARANG`); jumlah jendela hujan memakai `curah_jendela_mm`. Gerbang bahasa menolak daftar itu di keluaran, dan format angka mengikuti `selera-angka` (titik ribuan, koma desimal, tanpa presisi palsu).

## 10. Replikasi lunak Aceh Tamiang (HH-06)

Kejadian pilot dihitung dengan rancangan ini lalu dibandingkan dengan angka storymap pada RISET bagian 1. Perbandingan hanya dilaporkan; tidak ada parameter yang disetel untuk mendekati storymap.

| Ukuran | Pembanding storymap | Dianggap wajar bila (HIPOTESIS) | Bila di luar |
| --- | --- | --- | --- |
| Luas DAS | 562.251 ha | dalam 15 persen | periksa delineasi dan DAS terpilih |
| Hutan hilang 2025 | 8.358 ha | dalam 25 persen | periksa ambang tutupan, cuplikan, dan tahun |
| Porsi hilang 2025 di lereng > 40 persen | 52 persen | dalam 10 poin persen | periksa DEM (DSM vs tanah) dan kelas |
| Porsi hilang di zona hulu | 81 persen | dalam 10 poin persen | periksa zona |
| Hujan rata-rata 24 sampai 26 Nov | 685 mm | dalam 25 persen untuk salah satu sumber | tulis selisih, jangan pilih yang cocok |
| Puncak | 35 mm per jam, 26 Nov 04.30 WIB | dalam 25 persen dan dalam 2 jam | periksa konversi zona waktu slot |
| Genangan UNOSAT | 10.035 ha | hanya dilaporkan | tidak ada kriteria |

Tidak ada kriteria lulus atau gagal untuk replikasi; yang diputuskan adalah apakah selisihnya bisa dijelaskan oleh perbedaan sumber, dan penjelasannya ditulis di RISET.

## 11. Kunci kriteria

`scripts/siklus/hulu_hilir_kriteria.json` (milik `siklus`) memuat ambang HIPOTESIS (ambang bekas longsor tidak di sini: dikunci `longsor` di `scripts/longsor/lereng_kejadian_kriteria.json`, Q19 sampai Q21, dan berkas ini hanya mencatat sidiknya; kelas lereng, zona, 0,8 bobot sel sah, 95 persen slot, 5 mm per jam, 10 persen peringkat, 50 persen tanpa alert, Q13, daftar kejadian kalibrasi dan uji), sidik sha256 isinya, dan jangkar commit. `hulu_hilir_kriteria.py prasyarat` menolak jalan uji bahaya bila sidik tidak cocok atau jangkar kosong. Pola sama dengan `genangan_kriteria.py` (GS-02).

## 12. Bekas longsor per kejadian (K11, D17 sampai D23)

Detektor tunggal di `scripts/longsor/lereng_kejadian.py` (LT-15, diperluas HH-17 dan HH-18). Bagian ini hanya mendefinisikan masukan, keluaran, dan agregat yang dipakai paket ini; angka ambang tidak ditulis di sini karena dikalibrasi (Q19).

```
komposit_sebelum = median per piksel band B4, B8, B11 (dan B3 untuk indeks air) dari adegan Sentinel-2 L2A dalam jendela Q21, piksel SCL awan dan bayangan dibuang;
                   piksel dengan kurang dari m adegan bersih = "tak teramati" (m dikunci di kriteria)
komposit_sesudah = sama untuk jendela sesudah
NDVI = (B8 - B4) / (B8 + B4) ; dNDVI = NDVI_sebelum - NDVI_sesudah ; terbuka = NDVI_sesudah di bawah ambang_terbuka dan bukan air (indeks air) ; dSWIR = B11_sesudah - B11_sebelum
kandidat = dNDVI >= ambang_d dan terbuka dan dSWIR >= ambang_s dan lereng GLO-30 di titik >= ambang_lereng (D3)
objek    = komponen terhubung kandidat (8 tetangga) dengan luas >= ukuran_min (Q20); luas_ha, pusat, kelas lereng median objek, zona
```

Semua ambang berasal dari kalibrasi lawan inventaris manual (Q19) dan dikunci di `scripts/longsor/lereng_kejadian_kriteria.json` (milik `longsor`; sidiknya dicatat di `hulu_hilir_kriteria.json`) sebelum blok uji dihitung. Piksel "tak teramati" tidak dihitung sebagai bebas bekas longsor: luas tak teramati tampil di tiap agregat (kosong bukan nol).

Golongan tutupan sebelum untuk tiap objek (D19):

```
hutan_utuh  : sebagian besar luas objek (paling sedikit 80 persen, HIPOTESIS Q18) adalah hutan awal Hansen yang tidak hilang pada tahun < Y, dan NDVI_sebelum >= ambang_hutan
terbuka     : sebagian besar luas objek bukan hutan awal, atau hilang pada tahun < Y, atau NDVI_sebelum < ambang_hutan
tak_tentu   : selain itu
```

Agregat per DAS, sub-DAS, kecamatan, kelas lereng (kelas ALGORITMA 2), dan zona: jumlah objek, luas ha, dan luas teramati (penyebut). Laju = luas bekas longsor dibagi luas teramati golongan itu di strata yang sama, per km2.

Uji hipotesis (D19): untuk tiap kelas lereng c dengan teramati paling sedikit 50 ha di kedua golongan, `rasio(c) = laju_terbuka(c) / laju_hutan_utuh(c)`; gabungan antar kelas dengan bobot luas (Mantel-Haenszel sederhana); selang 95 persen bootstrap berblok 0,05 derajat. Hasil ditulis sebagai angka dan selang, tidak sebagai vonis kausal. Bila selang memuat 1: "tidak terbedakan pada kejadian ini". Sertakan selalu: jumlah dan persen bekas longsor di hutan utuh, hujan DAS dari bagian 6 (puncak, total tiga hari, peringkat) berdampingan.

Aturan bahasa (D19, K11): hujan ekstrem tetap terbaca. Templat yang boleh: "Dari N bekas longsor terdeteksi antara [tanggal] dan [tanggal], X persen berada di area yang berhutan utuh pada citra sebelum dan Y persen di lahan yang sudah terbuka." "Per km2 pada lereng yang sama, laju di lahan terbuka adalah r kali laju di hutan utuh (selang a sampai b)." "Hujan tiga hari DAS pada periode itu P mm (peringkat k dari n tahun)." Yang ditolak gerbang: daftar kata terlarang di bagian 9, dan pernyataan yang membuang bagian hujan dari paragraf yang sama dengan uji golongan.

Hubungan ke K6 (D20): piksel Hansen tahun Y yang berada di dalam objek bekas longsor berjendela sempit masuk golongan `tahun_kejadian_di_longsor`; tabel label waktu (bagian 3) menambah kolom itu, dan `sebelum` serta `dibuka_manusia` tidak pernah memuatnya. Objek dari jendela lebar tidak menggeser piksel apa pun ke golongan ini.

Jarak dan alur (D21):

```
jarak(o) = jarak titik pusat objek ke ruas HydroRIVERS terdekat (meter, kelas 0-100, 100-300, 300-1000, >1000)
pelebaran(r) = [luas terbuka_bukan_air dalam koridor 300 m ruas r pada komposit_sesudah] - [pada komposit_sebelum], ha; ditulis per sub-DAS dan untuk 5 ruas dengan selisih terbesar
kepekaan: koridor 100 dan 500 m; garis HydroRIVERS kasar terhadap piksel 10 m, jadi koridor lebar dipakai dan "alur terbuka" bukan lebar sungai terukur
```

Endapan basah dan air dipisah dengan indeks air; yang tak terpisahkan dicatat "ragu" dan tidak dihitung. Uji penerimaan: inventaris manual kotak Tapanuli Tengah (Q19) menjadi kebenaran kalibrasi dan uji; precision dan recall dilaporkan per blok uji, tanpa dibulatkan ke atas.
