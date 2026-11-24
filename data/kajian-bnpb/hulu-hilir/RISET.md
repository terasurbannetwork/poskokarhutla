# RISET: Hulu ke hilir per kejadian

Tanggal 24 Nov 2026. Bagian "Sudah ada di repo" dibaca langsung dari kode pada tanggal itu. Bagian "Belum diuji" adalah ingatan atau dugaan; tiketnya menguji dulu, tidak ada yang dipakai sebelum diuji hidup.

## 1. Pembanding dan apa yang ditiru

Storymap Leuser (Air dari Hulu, DAS Tamiang, banjir bandang 24 sampai 26 Nov 2025), angka dikutip dari `scripts/banjir/RISET-KAJIAN-LUAR.md` 2.7 dan belum diperiksa ke sumber aslinya:

| Hal | Angka di storymap |
| --- | --- |
| Luas DAS Tamiang | 562.251 ha |
| Hutan hilang 2025 | 8.358 ha, sekitar dua kali jumlah 2019 sampai 2024 (4.060 ha) |
| Di zona hulu | 81 persen |
| Di lereng lebih dari 40 persen | 52 persen (4.339 ha); tahun sebelumnya 11 sampai 24 persen |
| Hujan rata-rata wilayah 24 sampai 26 Nov | 685,08 mm; puncak 35 mm per jam, 26 Nov pukul 04.30 WIB (CHIRPS, GPM IMERG) |
| Genangan UNOSAT 28 Nov 2025 | 10.035 ha, 92 persen di zona hilir |
| Dampak menurut Pemkab | 101 meninggal, 75.088 rumah rusak, 8.242 ha pertanian, 219 desa, 287.168 jiwa |

Yang ditiru: bentuk analisisnya (tumpuk hutan hilang pada lereng, zona, sempadan; hujan per DAS; genangan per zona). Yang tidak ditiru: kalimat sebab, peta indeks bahaya yang tidak diuji lawan genangan, dan angka dampak Pemkab yang tidak dijumlah dengan DIBI (aturan RISET-KAJIAN-LUAR 4).

Dua keberatan metode yang menjadi bagian rancangan, bukan catatan kaki:

1. Hansen tahunan. "Hilang 2025" mencakup Januari sampai Desember. Banjir bandang yang menyapu lereng curam pada 24 sampai 26 November meninggalkan bekas longsor dan alur debris yang juga terbaca sebagai kehilangan kanopi tahun itu. Bagian 52 persen di lereng lebih dari 40 persen bisa sebagian akibat banjir, bukan sebab banjir. Karena itu K6 bukan tambahan manis; tanpanya K1 bisa menyesatkan.
2. Penyebut. "52 persen kehilangan di lereng curam" hanya bermakna dibanding berapa persen hutan DAS itu memang berada di lereng curam. Di DAS Bukit Barisan, hutan yang tersisa memang banyak di lereng curam. Maka paket ini selalu menampilkan dua angka: porsi hilang per kelas dan porsi hutan awal per kelas, lalu laju hilang per kelas.

## 2. Sudah ada di repo (diperiksa 24 Nov 2026)

| Kebutuhan | Kode yang ada | Catatan yang menentukan rancangan |
| --- | --- | --- |
| DAS hulu dari sub-DAS | `scripts/banjir/bukti_das.py`: `indeks_basin`, `hulu`, `larutkan`, `Garis`, `iris_sel` | HydroBASINS v1c level 9 (zip as dan au di `data/raw/banjir/das`, tidak di-commit); titik keluaran = sub-DAS terbesar sampai 25.000 km2 yang memuat pusat kecamatan; DAS bisa jauh melewati kabupaten |
| Hutan hilang per tahun | `bukti_das.hitung_hansen`, `tally`, `Ubin`, `lzw` | Hansen GFC v1.13 (2001 sampai 2025) lewat HTTP Range, satu dari empat piksel (S=4, sekitar 120 m). Uji cuplikan 18 Okt 2026 di Rokan Hulu: luas -0,0 persen, hutan awal +0,3 persen, hilang total -1,4 persen, per tahun di atas 100 ha sampai plus minus 4,2 persen, selisih mutlak per tahun maksimum 17 ha. Angka di bawah 10 ha tampil "~". Hutan = tutupan 2000 paling sedikit 30 persen |
| Konsesi dipotong ke DAS | `bukti_das.hitung_hansen` bagian `konsesi` | Memakai `Garis.rentang` per baris dan `potong`/`gabung` interval; pola ini dipakai ulang untuk sempadan (poligon kecil banyak). Putaran per konsesi per baris belum berindeks ruang; untuk ribuan segmen sungai perlu pengelompokan (DESAIN-TEKNIS 6) |
| Sub-DAS dan sel hujan | `bukti_das.subdas`, `iris_sel(garis, dy, sel)` | `iris_sel` sudah menerima ukuran sel, jadi sel IMERG 0,1 dan CHIRPS 0,05 derajat tidak butuh fungsi baru |
| Telusur hujan per sub-DAS | `scripts/banjir/hulu.py` | Open-Meteo 0,25 derajat, bukan IMERG; dibaca sebagai pembanding, tidak diubah |
| Lereng persen | `scripts/longsor/lereng_dem.py` | Horn 3x3, persen = 100 kali tan; ukuran piksel mengikuti lintang; pembaca TIFF `scripts/banjir/genangan/tiff_mini.py` (prediktor 1, 2, 3; uint8, int16, uint16, float32) dimuat lewat importlib |
| GLO-30 | `data/raw/lereng/dem/Copernicus_DSM_COG_10_*_DEM.tif` | Baru ubin Bandung Raya. Pola nama sama dengan `copernicus-dem-30m` di S3 (`scripts/banjir/genangan/medan.py`); URL dan ukuran ubin Aceh belum diuji hidup |
| Citra sebelum sesudah | `scripts/banjir/citra_banjir.py`, `public/banjir/bukti.js` | Sentinel-2 dan Sentinel-1 per daerah; PNG sampai 120 KB; penggeser akan dipindah ke `public/inti/geser.*` oleh GS-10 (paket genangan-satelit) |
| Genangan GFM | `scripts/banjir/genangan_nasional.py`; paket `data/kajian-bnpb/genangan-satelit/` | Per kecamatan; cakupan sah, kontrol latar, sinyal lemah; Kaji Cepat `banjir_gfm` belum dibangun (tiket GS-*). Paket ini bergantung padanya untuk K3 dan K5 |
| Hujan satelit harian | `scripts/cuaca/imerg.py` (milik cuaca-udara) | IMERG Late dan Early harian lewat OPeNDAP ASCII, butuh `EARTHDATA_TOKEN`, tanpa token keluar 0. jangan diubah: fungsi `parse` ikut dalam manifes sidik `nowcast_jkt.py` |
| Hujan satelit 30 menit | `scripts/banjir/nowcast_jkt.py` (dibekukan sidik J4) | Early Run 30 menit (`GPM_3IMERGHHE.07`) untuk 42 kecamatan DKI; format ASCII LIVE sudah diverifikasi. Tidak disunting; hanya `imerg.parse` dan pola folder yang ditiru di modul baru |
| CHIRPS | `scripts/siklus/sumber.json` entri `chirps-v3`; `scripts/kekeringan/bayangan.py` | Ada daftar sumber dan pemakaian lab per kabupaten, belum ada pembaca per DAS. HEAD kedua yang terlalu cepat dijawab HTTP 429; jeda minimal 2 detik, satu koneksi |
| Indeks bahaya | `scripts/banjir/bahaya.py` dan `public/banjir/data/bahaya_kelas.json` | Tiga kelas InaRISK (rendah, sedang, tinggi) per kecamatan, persen luas; raster hanya bernilai di zona bahaya, di luar zona kosong. `bahaya.json` dibekukan sidik J4: hanya dibaca |
| Bangunan dan batas desa | `public/geo/desa/<kab>.json`, `scripts/umum/bangunan.py` (grid 110 m) | Batas desa dipakai untuk "desa tergenang"; bangunan terendam tidak tampil (D6 genangan-satelit) |
| Kaji Cepat dan kaji ulang | `scripts/siklus/kaji_banjir.py`, `src/siklus_kaji.js`, paket `kaji-ulang/` | Kaji Cepat `banjir_jam1` jalan; kaji ulang meminta potret beku ringkas |
| Daftar sumber | `scripts/siklus/sumber.json` | Ada `unosat-hdx`, `intl-charter`, `copernicus-ems`, `overture-buildings`, `osm-overpass`, `worldpop`, `chirps-v3`, `earth-search`, `planetary-computer` |

Catatan penting dari `sumber.json`: entri `unosat-hdx` mencatat 39 paket UNOSAT Indonesia dan "banyak berupa tautan peta web, bukan poligon yang bisa diunduh". Tidak ada jaminan produk genangan Aceh Tamiang 28 Nov 2025 tersedia sebagai poligon. Entri `copernicus-ems` (diuji 10 Nov 2026) tidak memuat satu pun aktivasi Indonesia pada daftar publiknya. Entri `intl-charter` hanya bisa dibaca dengan menguraikan halaman, rapuh. Artinya K5 bisa berakhir dengan "produk resmi belum tersedia sebagai data" untuk banyak kejadian; itu hasil yang sah, bukan kegagalan.

### 2a. Tumpang tindih untuk bekas longsor (K11), diperiksa 24 Nov 2026

| Paket atau kode | Yang sudah ada | Keputusan |
| --- | --- | --- |
| `lereng-bangunan` (LT-15, LT-16) | Rencana perubahan tutupan Sentinel-2: NDVI (B8, B4), dNDVI di atas persentil 98 daerah kontrol, lereng minimal 20 persen, SCL membuang awan dan bayangan; hasil "lapisan perubahan, bukan batas longsor"; kejadian perintis Cisarua dan Pasirlangu. `lereng_kejadian.py` belum ada | Dipakai sebagai satu-satunya detektor (D17). HH-17 menyepakati perluasan cakupannya dengan `longsor`; tidak ada mesin kedua |
| `kerusakan-satelit` | Hanya bangunan (terendam, terbakar, gempa); tidak membahas bekas longsor | Tidak tumpang tindih; rujukan metode validasi per jenis bahaya |
| `scripts/longsor/kejadian.py`, `tanggapan_pvmbg.py`, `data_kejadian_desa.json` | Label longsor dari NASA GLC, DIBI per kabupaten per hari, dan tanggapan PVMBG; desa longsor 2025 sampai Januari 2026 | Dibaca sebagai pembanding inventaris citra; tidak diubah |
| `scripts/longsor/model_lhasa2.py`, `ambang_kab.py` | Model dan ambang longsor; `model_lhasa2.sidik` membekukan | Hanya konsumen label dari D23, milik `longsor` |
| `scripts/data/citra.py`, `scripts/banjir/citra_banjir.py` | Pembaca COG Sentinel-2 Earth Search dengan HTTP Range, pilih adegan paling bersih, PNG sampai 120 KB | Dipakai ulang untuk komposit dan PNG |
| `scripts/banjir/RISET-KAJIAN-LUAR.md` 2.13 dan `scripts/longsor/RISET-KAJIAN-LUAR.md` | Penilaian peta kerawanan luar: label dan uji lawan pembanding | Aturan "tanpa AUC latih" dan "satu kejadian bukan bukti" berlaku untuk uji hipotesis D19 |

Catatan pemicu: citra Tapanuli Tengah 7 Jun 2024 dan 26 Jan 2026 jaraknya 19 bulan. Perubahan di antaranya bisa mencakup pembukaan lahan biasa, longsor sebelum 25 Nov 2025, dan longsor saat kejadian. Karena itu K11 memisahkan jendela sempit (bisa dikaitkan ke kejadian) dari jendela lebar ("perubahan antara dua tanggal"), dan inventaris manual dipakai untuk menaksir seberapa besar bagian yang bukan kejadian.

## 3. Belum diuji (jangan dianggap fakta)

| Hal | Dugaan | Tiket yang menguji |
| --- | --- | --- |
| URL ubin GLO-30 di S3 untuk lembar Aceh dan ukuran per ubin | Pola nama sama dengan ubin Bandung; sekitar 25 sampai 40 MB per ubin | HH-01 |
| HydroRIVERS (garis sungai, atribut luas hulu) dan lisensinya | Sekeluarga HydroSHEDS; lisensi berbeda dari HydroBASINS harus dibaca | HH-03, HH-04 |
| Struktur CHIRPS v3 (strip atau ubin, kompresi) dan apakah bisa dibaca dengan HTTP Range per jendela | Berkas harian sekitar 12 MB, bulanan sekitar 24 MB; kalau strip dan terkompresi seperti Hansen, jendela kecil mungkin | HH-08 |
| IMERG Final 30 menit untuk 2025 lewat OPeNDAP yang sama | Koleksi Final (`GPM_3IMERGHH.07`) selain Early; folder dan nama berkas mirip, butuh token | HH-08 |
| Alert hutan: GLAD-L, GLAD-S2, RADD, alert terpadu GFW | Ada alert mingguan atau lebih rapat dengan tanggal; RADD memakai radar sehingga tembus awan; format, tempat unduh, dan lisensi belum dicek | HH-02 |
| Produk UNOSAT untuk kejadian Sumatera November 2025 di HDX: format dan lisensi | Kemungkinan tautan peta web saja | HH-02, HH-09 |
| Sentinel-2 L2A Tapanuli Tengah: jumlah adegan bersih per jendela (Q21), liputan SCL | Musim hujan membuat banyak adegan berawan; komposit median mungkin hanya bisa untuk jendela lebar | HH-02, HH-18 |
| Inventaris resmi bekas longsor Sumatera Nov 2025 (PVMBG, BIG, peneliti) | Kemungkinan hanya titik atau tanggapan per lokasi | HH-02 |
| Segmen jalan Overture (tema transportation) untuk bbox DAS | Tema dan DuckDB sama dengan bangunan; skema belum dibuka | HH-09 |
| Bunyi PP 38/2011 tentang Sungai soal sempadan | Sungai besar dan kecil, bertanggul, perkotaan berbeda lebarnya | HH-03 |
| Bunyi dan nama peraturan batas lereng 40 persen sebagai kawasan lindung | Sama dengan Q1 paket lereng-bangunan (LT-02) | HH-03 |

## 4. Risiko metode yang sudah diketahui

| Risiko | Wujud | Penjaga |
| --- | --- | --- |
| Model permukaan | GLO-30 mengukur tajuk, bukan tanah; di hutan lebat lereng bisa meleset | Pil hipotesis; audit lawan DEMNAS di lembar yang ada (HH-02); kepekaan ambang 30, 45 dan 60 persen untuk kelas lereng seperti paket lereng-bangunan |
| Cuplikan kasar di sempadan | 200 m lebar dibaca dengan sampel 120 m | Uji cuplikan S=1 lawan S=2 lawan S=4 sebelum angka sempadan dipakai (HH-04) |
| Tahun kejadian | Hansen tahunan tidak memisah sebelum dan sesudah | D9, label tiga bagian, alert hanya bila lolos Q5 |
| Pertumbuhan kembali tidak diukur | Hansen "hilang" tidak menandai tumbuh lagi | Kalimat metode wajib (sama dengan catatan Bukti DAS yang ada) |
| Tutupan awan | Optik tidak melihat saat banjir | Citra radar tetap; kartu optik "tertutup awan" (pola genangan-satelit Q8) |
| Satu kejadian tidak membuktikan sebab | Hujan 685 mm dalam tiga hari menimbulkan banjir besar dengan atau tanpa hutan hilang | D8; kalimat keadaan saja; uji lintas kejadian hanya lewat pra-registrasi di tiket lanjutan |
| Penumpukan angka dari sumber berbeda | UNOSAT, GFM, DIBI, angka Pemkab | Berdampingan, tidak dijumlah |
| Kuota pemakai | CHIRPS 429; Hansen Range; Earthdata | Jeda, cache `data/raw`, pemakaian bertahap, bukan cron |

## 5. Yang sengaja tidak dikerjakan

- Debit sungai dan model hidrologi (HEC-HMS, HEC-RAS): di luar paket; `scripts/banjir/genangan/debit_hulu.py` dan `tangki.py` adalah modul lain.
- Relief ratio, knickpoint, dan bentuk DAS sebagai faktor bandang: catatan RISET-KAJIAN-LUAR 2.13 dan `PRAREG-BANDANG.md`; bukan bagian rangkaian per kejadian ini.
- Prakiraan atau peringatan dari hasil ini: tidak ada. Paket ini menjelaskan kejadian yang sudah terjadi.
- Kerusakan bangunan: milik paket `kerusakan-satelit`.
