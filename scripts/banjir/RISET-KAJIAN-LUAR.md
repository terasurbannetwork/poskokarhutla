# Kajian banjir dari luar: apa yang bisa dipakai, apa yang tidak

Tanggal: 24 November 2026. Bahan: unggahan media sosial yang dikirim pemilik (Geodemy, Pusat Riset Ekologi BRIN,
Spasia Geosolutions, Landscape 360, ITB Teknik Sipil, Prodi Meteorologi ITB, Leuser Geostory Challenge, webinar
mitigasi berbasis GIS, NgopiBencana, STMKG, Kementerian PU). Catatan ini menilai metodenya terhadap hasil uji kita
sendiri, lalu mencatat bahan yang layak diambil. Belum ada kode atau layar yang berubah.

Angka di bawah dikutip dari unggahannya, belum diperiksa ke makalah asli kecuali disebut lain.

## 1. Ringkasan

1. Lima dari sebelas bahan membuat peta kerawanan dengan menumpuk faktor fisik (overlay berbobot AHP, skor kelas,
   atau MaxEnt). Tak satu pun menunjukkan uji pada data yang disimpan terpisah, dan tak satu pun membandingkan
   dengan tebakan sederhana. Uji kita sendiri (`RISET-INARISK.md`, `RISET-FAKTOR-KEC.md`, uji HAND) menunjukkan
   tumpukan faktor fisik kalah dari riwayat kejadian (AUC 0,909 lawan 0,728) dan tidak terbukti lebih baik dari
   kepadatan penduduk. Jadi peta jenis ini tidak kita pakai sebagai ramalan.
2. Yang paling berharga justru pemodelan hidrologi dan hidraulika ITB untuk banjir Jakarta Maret 2025: datanya
   terbuka di Zenodo dan memuat peta genangan resmi DSDA dan BPBD DKI. Itu calon label uji untuk simulasi genangan
   kita.
3. Bahan Tamiang (Leuser) dan Sumatra Barat (STMKG, BRIN) memberi angka kejadian November 2025 yang bisa jadi label
   dan pembanding, tetapi kesimpulan sebabnya ("hutan hilang menyebabkan banjir") tidak bisa ditarik dari satu
   kejadian.
4. Klaim ekonomi Landscape 360 (rasio manfaat peringatan dini 17,1 kali, kerugian persen PDB) berasal dari model
   tertutup ENSONINAID26. Tidak boleh tampil sebagai angka kita.

## 2. Penilaian per bahan

### 2.1 Geodemy: pemetaan kerentanan banjir dengan AHP dan weighted overlay

- Metode: 8 faktor, bobot AHP: curah hujan 25%, elevasi 20%, lereng 15%, kerapatan drainase 15%, penggunaan lahan
  10%, jenis tanah 8%, jarak sungai 4%, geologi 3%. Hasil dibagi lima kelas, merah dan oranye disebut "kemungkinan
  besar dilanda banjir".
- Masalah:
  - bobot adalah pendapat pakar; AHP hanya memeriksa konsistensi pakar (CR < 0,1), bukan ketepatan peta;
  - curah hujan rata-rata tahunan diberi bobot terbesar, padahal pemicu banjir adalah hujan ekstrem jangka pendek;
  - elevasi, lereng, dan jarak sungai saling tumpang tindih, sehingga pengaruhnya terhitung dua kali;
  - tidak ada uji lawan kejadian dan tidak ada pembanding.
- Kalimat "kemungkinan besar dilanda banjir" tidak didukung bukti. Untuk kita: hanya boleh dipakai sebagai susunan
  pendapat pakar dalam pelatihan, dengan label itu.

### 2.2 BRIN Pusat Riset Ekologi: banjir Kota Padang, data 1995–2025

- Metode:
  - hujan maksimum 24 jam tahunan dari 6 stasiun, distribusi Log-Pearson III (uji K-S Dmaks 0,138 < Dkritis 0,248);
  - intensitas 4 jam dengan Mononobe; hidrograf Nakayasu sebagai skenario;
  - 6 indikator berbobot: hujan 15, lereng 15, geomorfologi 10, lahan 10, tanah 10, geologi 5;
  - 4 kelas bahaya.
- Angka yang dilaporkan:

  | Periode ulang | Hujan 24 jam | Intensitas 4 jam | Debit puncak indikatif |
  | --- | --- | --- | --- |
  | 2 tahun | 160,87 mm | 22,13 mm/jam | sekitar 135 m3/detik |
  | 10 tahun | 255,50 mm | 35,15 mm/jam | sekitar 205 m3/detik |
  | 50 tahun | 334,14 mm | 45,97 mm/jam | sekitar 250 m3/detik |

  Kejadian: 447 mm/24 jam pada 7 Maret 2024 dan 261 mm/24 jam pada 25 November 2025. Kelas "aman" 77,41% luas,
  tinggi 3,38% (23,49 km2).
- Yang baik: mereka sendiri menulis peta ini penyaringan awal, bukan simulasi genangan terkalibrasi, dan menulis
  bahwa hujan maksimum harian tidak membuktikan banjir terjadi. Sensitivitas ekologis dipisah dari kelas bahaya.
- Masalah: bobot keenam indikator berjumlah 65, jadi sebagian bobot tidak tercantum di unggahan. Kelas peta tidak
  diuji lawan genangan nyata.
- Untuk kita:
  - kata "aman" tidak pernah dipakai di layar kita, termasuk saat mengutip mereka;
  - hujan rencana periode ulang per stasiun bisa jadi pembanding untuk ambang persentil kita
    (`ambang_persentil.py`) di Padang: P99 harian kita seharusnya dekat dengan hujan 2 tahunan mereka;
  - kejadian 7 Maret 2024 dan 25 November 2025 masuk daftar kejadian uji Padang.

### 2.3 Spasia Geosolutions: kerawanan banjir Kabupaten Garut dengan MaxEnt

- Metode: MaxEnt (data hanya titik kejadian), 6 variabel: jarak jalan, jarak sungai, lereng, DEM, penggunaan lahan,
  tekstur tanah. Korelasi variabel diperiksa dengan Cramer's V dan Pearson.
- Hasil: AUC data latih 0,857. Tidak ada AUC data uji.
- Masalah:
  - AUC latih bukan bukti. Laporan MaxEnt sendiri menulis AUC maksimal yang bisa dicapai 0,829, sedangkan AUC latih
    0,857 melewatinya. Itu tanda model terlalu pas pada titik latih;
  - variabel "jarak jalan" mengukur di mana orang melapor, bukan di mana air menggenang. Ini masalah yang sama dengan
    temuan kita: kepadatan penduduk menjelaskan pelaporan, bukan hanya bahaya;
  - kurva respons DEM datar, jadi elevasi praktis tidak dipakai model;
  - MaxEnt membandingkan titik kejadian dengan latar acak, sehingga daerah yang jarang dilaporkan tampak "tidak
    rawan" walau mungkin hanya tidak tercatat.
- Untuk kita: bila suatu hari memakai model kejadian-saja, jalan dan kepadatan harus diperlakukan sebagai bias
  pelaporan (dimasukkan ke latar, bukan ke faktor), dan uji wajib memakai blok wilayah terpisah.

### 2.4 Landscape 360 (The Landscape Group): "Sesudah api, datanglah banjir"

- Isi: El Niño 2026 (ONI Juli sampai September +2,16 °C) diperkirakan disusul La Niña kuat akhir 2027. Lima dari
  sepuluh El Niño di atas +1,5 °C sejak 1950 disusul La Niña dalam sekitar tiga tahun. La Niña ekstrem naik dari 4,3
  ke 7,7 kali per 100 tahun (Cai dkk. 2015). Titik api Januari sampai September 2026: 415 ribu (2015: 494 ribu).
  Kerugian satu siklus "sangat kuat" 4,56% PDB; paket terpadu menurunkannya ke 2,42%. Rasio manfaat peringatan dini
  17,1 kali, pembasahan gambut 9,2 kali. Limpasan dari gambut dan hutan terbakar +25%.
- Masalah: hampir semua angka ekonomi berasal dari model tertutup ENSONINAID26 tanpa uji yang bisa diperiksa.
  Angka +25% limpasan tidak menyebut sumber pengukuran.
- Cek cepat dengan data kita: kejadian banjir nasional (CKAN BNPB, `public/banjir/data/kejadian.json`) naik pada
  tahun sesudah El Niño kuat: 2015 525 menjadi 2016 824 (+57%), 2023 1.255 menjadi 2024 1.420 (+13%). Tetapi
  hitungan 2010–2024 punya tren naik kuat karena cara pencatatan (2010 1.060, 2020 1.518, 2021 1.794), dan hanya ada
  dua pasangan. Cek ini tidak membuktikan apa pun; dicatat agar tidak diulang.
- Untuk kita:
  - jangan tampilkan angka ENSONINAID26 di layar atau deck sebagai angka kita;
  - hipotesis "kabupaten dengan luas terbakar besar pada tahun t lebih sering banjir pada t+1" bisa diuji dengan
    data kita sendiri (luas terbakar karhutla per kabupaten dan label banjir Groundsource), dengan pra-registrasi
    dulu. Pembanding: riwayat banjir kabupaten.

### 2.5 ITB Teknik Sipil: pemodelan hidrologi dan hidraulika banjir Jakarta Maret 2025

- Rujukan: Kusuma dkk. 2026, Results in Engineering 32, 113930, doi 10.1016/j.rineng.2026.113930. Data:
  doi 10.5281/zenodo.17309354.
- Metode: HEC-HMS lalu HEC-RAS 2D, mesh 30 x 30 m, hujan satelit GSMaP, debit pos Katulampa, Depok, Manggarai,
  FABDEM ditambah bangunan OpenStreetMap. Wilayah hitung Ciliwung dari Baktijaya sampai Manggarai.
- Hasil: debit puncak 145,8 m3/detik pada 3 Maret 2025 pukul 20.00. NSE 0,52 sampai 0,64, RMSE 5,83 sampai 12,85,
  PBIAS 12,32 sampai 30,12%. Kedalaman 30 sampai 150 cm. Genangan dibandingkan dengan peta genangan DSDA dan BPBD DKI
  3–4 Maret 2025 secara visual. Banjir ini menewaskan 9 orang dan membuat sekitar 90 ribu warga mengungsi.
- Masalah: perbandingan dengan peta resmi tampak di gambar, tanpa ukuran tumpang tindih (misalnya CSI). Drainase lokal
  dan saluran sekunder tidak dimodelkan. NSE 0,52 tergolong cukup, bukan baik.
- Untuk kita, ini bahan terpenting:
  - peta genangan DSDA dan BPBD 3–4 Maret 2025 di Zenodo bisa jadi label uji untuk simulasi genangan kita dan untuk
    replay `public/banjir/data/replay/maret2025*`. Lisensi dataset harus dicek dulu;
  - hasil mereka sekaligus pembanding: bila CSI simulasi kita lawan peta DSDA jauh di bawah HEC-RAS 2D, itu ukuran
    jujur seberapa jauh kita;
  - FABDEM berlisensi CC BY-NC-SA; tetap hanya untuk uji, tidak tampil di layar (sama dengan uji HAND);
  - berkas yang dibekukan sidik J4 (`sim_genangan.js`, `umum.py`) tidak boleh diubah untuk uji ini.

### 2.6 Prodi Meteorologi ITB: curah hujan Indonesia, kelebihan dan kekurangan air

- Isi: lebih dari 60% wilayah menerima hujan di atas 2.500 mm/tahun; volume hujan sekitar 4.750 miliar m3/tahun.
  Pola bulanan berbeda tajam: Banda Aceh puncak November (379 mm), Bandung dua puncak (Maret 435 mm, November 487 mm),
  NTT kering Juni sampai Oktober (2 sampai 24 mm). Luas karhutla 2015 2,6 juta ha. Banjir Sumatra November 2025:
  hujan sebulan turun dalam sehari (BMKG).
- Untuk kita: menguatkan bahwa ambang hujan harus per wilayah dan per musim, bukan satu angka nasional. Ini sudah
  dipegang `ambang_wilayah.py` dan `ambang_persentil.py`. Tidak ada yang perlu diubah.

### 2.7 Leuser Geostory Challenge: "Air dari Hulu", DAS Tamiang November 2025

- Angka: DAS Tamiang 562.251 ha. Hutan hilang 2025 8.358 ha, sekitar dua kali jumlah enam tahun sebelumnya
  (2019–2024: 4.060 ha). 81% di zona hulu; 52% (4.339 ha) di lereng lebih dari 40%. Hujan rata-rata wilayah 685,08 mm
  selama 24–26 November 2025, puncak 35 mm/jam pada 26 November pukul 04.30 WIB (CHIRPS, GPM IMERG). Genangan
  10.035 ha (UNOSAT 28 November 2025), 92% di zona hilir. Dampak (Pemkab Aceh Tamiang): 101 meninggal, 75.088 rumah
  rusak, 8.242 ha pertanian, 219 desa, 287.168 jiwa terdampak. Kelas bahaya tinggi dan sangat tinggi 69.884 ha.
- Masalah: hujan 685 mm dalam tiga hari akan menimbulkan banjir besar dengan atau tanpa hutan hilang. Satu kejadian
  tidak bisa memisahkan pengaruh hutan dari pengaruh hujan. Peta indeks bahaya tidak diuji lawan genangan UNOSAT
  yang mereka punya sendiri.
- Untuk kita:
  - genangan UNOSAT 28 November 2025 di Tamiang adalah label uji yang baik untuk HAND, skenario debit, dan Kaji Cepat
    banjir (`kaji_banjir.py`);
  - angka dampak Pemkab adalah pembanding untuk Lapor dan Buku Besar, tidak dijumlah dengan angka DIBI;
  - kehilangan hutan per DAS (Hansen Global Forest Change) bisa diuji sebagai faktor, hanya dengan pra-registrasi
    dan banyak kejadian, bukan satu.

### 2.8 Webinar penginderaan jauh dan GIS untuk mitigasi

- Isi: kerangka bahaya, paparan, kerentanan, kapasitas. Langkah: kumpulkan data, tentukan pengaruh parameter,
  gabungkan lapisan, buat peta, validasi. Contoh hasil: Ambon 55,8% wilayah kelas rawan longsor tinggi sampai sangat
  tinggi; Bogor "akurasi keberhasilan 90,10%, akurasi prediksi 87,30%"; Majalaya 720 ha zona rawan banjir tinggi di
  sembilan desa.
- Masalah: akurasi tanpa laju dasar tidak bermakna. Bila 85% sel memang tidak pernah longsor, peta yang selalu
  menjawab "tidak rawan" sudah 85% akurat. Unggahan tidak menyebut cara pembagian data latih dan uji.
- Untuk kita: setiap angka ketepatan yang kita tampilkan disertai laju dasar dan pembanding, seperti di
  `RISET-INARISK.md` §5.

### 2.9 NgopiBencana: peta bahaya lawan peta risiko InaRISK

- Isi: peta bahaya menjawab di mana banjir berpotensi terjadi; peta risiko menambah kerentanan dan kapasitas. Kelas
  indeks: rendah 0 sampai 0,333, sedang 0,334 sampai 0,666, tinggi 0,667 sampai 1. Indeks 0,80 bukan genangan 80 cm.
  Merah bukan berarti banjir pasti terjadi besok.
- Penilaian: penjelasannya benar dan cocok dengan cara kita membaca InaRISK (`bahaya.py kelas`). Tambahan dari uji
  kita: di antara kabupaten yang sama padatnya, luas zona bahaya banjir InaRISK tidak terbukti membedakan mana yang
  lebih sering banjir (rho 0,042, selang −0,048 sampai 0,129).
- Untuk kita: kalimat "indeks bukan kedalaman" layak muncul di keterangan pop-up InaRISK bila belum ada.

### 2.10 STMKG: "Hujan mengguyur, lahan tak lagi menyerap", Sumatra Barat 2025

- Angka (BPBD Sumatra Barat): bencana 21–28 November 2025 di 16 kabupaten/kota, 296.307 jiwa terdampak,
  262 meninggal, 72 hilang. Kehilangan tutupan lahan 2001–2024 sekitar 740.000 ha. Data: Sentinel-2 (NDVI 2019 dan
  2025), hujan AWS dan ARG BMKG, angin reanalisis ECMWF, IOD dari BoM.
- Kesimpulan mereka: hujan ekstrem pemicu utama; IOD negatif (sekitar −0,4 atau kurang) menambah uap air; angin barat
  14 sampai 18 m/detik di 850 dan 700 mb bertemu Bukit Barisan dan memperkuat awan; perubahan lahan menurunkan daya
  serap.
- Masalah: peran lahan disimpulkan dari dua peta NDVI, tanpa ukuran berapa banyak limpasan bertambah. Tanggal angin
  tertulis 27 Desember 2025, sesudah kejadian; kemungkinan salah ketik untuk 27 November.
- Untuk kita: angka korban dan wilayah November 2025 di Sumatra Barat masuk daftar kejadian uji, bersama Tamiang.
  Mekanisme IOD negatif dan orografi cocok dengan fitur yang sudah dipra-registrasi (`PRAREG-OROGRAFI.md`,
  `PRAREG-MJO.md`); tidak perlu fitur baru dari poster ini.

### 2.11 Kementerian PU: banjir pluvial lawan fluvial

- Isi: pluvial dari hujan setempat, datang cepat, genangan dalam hitungan jam, di kota padat. Fluvial dari luapan
  sungai, bisa datang tertunda walau setempat tidak hujan, genangan berhari-hari, di bantaran dan dataran banjir.
  Penanganan pluvial: drainase, sumur resapan, kolam retensi, pompa. Fluvial: keruk sedimen, tanggul dan waduk,
  konservasi hulu, sempadan, peringatan dini.
- Untuk kita: pembagian ini menjelaskan kenapa HAND (yang hanya meniru luapan sungai) tidak cocok untuk genangan kota,
  dan kenapa banyak label Groundsource di kota tidak tertangkap faktor sungai. Usulan: bila suatu hari label kejadian
  bisa dibedakan pluvial dan fluvial (misalnya dari kata kunci berita atau jarak ke sungai besar), uji model terpisah
  per jenis. Belum dikerjakan.

### 2.12 Pelajar GIS: deteksi banjir dengan Sentinel-1 SAR di Google Earth Engine

- Metode: Sentinel-1 GRD mode IW, polarisasi VH; citra sebelum (1–20 November 2025) dan sesudah (25–29 November
  2025); penghalus bintik focal median; selisih sesudah dikurangi sebelum; ambang; buang air permanen (JRC GSW),
  lereng di atas 5° (SRTM), dan piksel terpencil. Keluaran peta genangan dan luas.
- Masalah:
  - nilai ambang tidak disebut, dan tidak ada uji lawan genangan rujukan;
  - radar buta di kota (pantulan ganda bangunan membuat air tampak terang) dan di bawah tajuk hutan, sehingga
    genangan di dua tempat itu hilang dari peta;
  - jendela sesudah 25–29 November bisa melewatkan puncak bila lintasan satelit jatuh sesudah air surut.
- Untuk kita: keputusan sudah ada di `data/kajian-bnpb/genangan-satelit/KEPUTUSAN-GENANGAN.md` (K2, D1, D11). Kita
  memakai Copernicus GFM, tidak membuat ambang radar sendiri, karena lab ambang radar kita di DKI gagal
  (`public/banjir/data/lab/genangan_radar_ringkas.md`). Unggahan ini tidak memberi alasan mengubah keputusan itu.
  Satu hal yang layak dicatat: masker lereng 5° dan masker JRC juga dipakai GFM, jadi tidak perlu ditambah.

### 2.13 Morfometri DAS dan banjir bandang Sumatra November 2025

- Isi: hampir semua DAS yang terkena banjir bandang di Aceh, Sumatra Utara, dan Sumatra Barat punya "paket komplit":
  Bukit Barisan yang curam (banyak lereng di atas 40%), lembah V sempit, dan kipas aluvial atau dataran banjir yang
  padat permukiman. Waktu konsentrasi pendek; bila hutan hilang, aliran berubah jadi aliran debris. Tabel relief
  ratio 10 DAS terluas: Aceh (Kluet 39,7; Teunom 34,1; Peusangan 32,7; Woyla 31 disebut paling rawan) dan Sumatra
  Utara (Singkil 16,9; Batang Serangan 9,1; Batahan 7,8; Kualuh 6,3) dan Sumatra Barat (Anai 56; Pasaman 50;
  Indrapura 43,5; Sikilang 36). Peta dasar memakai indeks risiko banjir BNPB.
- Enam ciri yang disebut: relief ratio tinggi, lereng panjang di atas 30–40°, lembah V di hulu dan tengah, peralihan
  mendadak dari lembah sempit ke dataran (knickpoint), material lereng mudah lapuk, dan Sesar Besar Sumatra yang
  membuat banyak lereng "hampir kritis", sehingga hujan ekstrem tinggal pukulan terakhir. Usulan: zona lindung di
  lereng curam dan kepala DAS, pulihkan koridor riparian, kendalikan permukiman di kipas aluvial aktif, dan pakai peta
  bentuklahan, lereng, dan batuan untuk prioritas rehabilitasi.
- Masalah:
  - nilai yang sama diberi warna berlawanan antarprovinsi. Singkil 16,9 paling aman di tabel Aceh, paling rawan di
    tabel Sumatra Utara. Batahan 7,8 merah di tabel Sumatra Utara, hijau di tabel Sumatra Barat. Skala warna dibuat
    per provinsi, jadi warna tidak bisa dibandingkan;
  - rentang angka sangat berbeda: Aceh 16,9 sampai 39,7, Sumatra Utara 2,8 sampai 16,9, Sumatra Barat 6,8 sampai 56.
    Kemungkinan satuan atau cara hitungnya tidak sama. Belum bisa dipakai sebelum rumusnya diketahui;
  - "rawan" disimpulkan dari bentuk DAS, tanpa dicocokkan dengan DAS yang benar-benar terkena bandang.
- Untuk kita: relief ratio per DAS (beda tinggi dibagi panjang DAS) mudah dihitung sendiri dari DEMNAS atau GLO-30 dan
  HydroBASINS, yang sudah dipakai `scripts/air/neraca/**`. Layak diuji sebagai faktor bandang di
  `PRAREG-BANDANG.md`, dengan label kejadian bandang DIBI, bukan dari tabel ini. Jarak ke sesar sudah ada di model
  longsor kita (`scripts/longsor/model.py`); knickpoint (lompatan lebar lembah) bisa diturunkan dari DEM yang sama
  dan diuji bersama relief ratio.

## 3. Bahan yang layak diambil, urut menurut manfaat

1. Peta genangan DSDA dan BPBD DKI 3–4 Maret 2025 dari Zenodo 17309354 sebagai label uji simulasi genangan Jakarta.
   Cek lisensi dulu; berkas sidik J4 tidak disentuh.
2. Genangan UNOSAT 28 November 2025 DAS Tamiang sebagai label uji HAND, skenario debit, dan Kaji Cepat banjir.
3. Daftar kejadian uji November 2025 (Tamiang, Sumatra Barat) dan Padang (7 Maret 2024, 25 November 2025).
4. Hujan rencana periode ulang BRIN untuk Padang sebagai pembanding ambang persentil kita.
5. Hipotesis "sesudah api, banjir lebih sering" per kabupaten, dengan pra-registrasi sebelum data dibuka.
6. Pemisahan label pluvial dan fluvial, bila sumber labelnya memungkinkan.
7. Relief ratio per DAS sebagai calon faktor banjir bandang, dihitung sendiri, diuji lewat pra-registrasi.

Bahan longsor dari kiriman yang sama (RUSLE Cisarua, MaxEnt Karangkobar, DAS Kuranji) dinilai di
`scripts/longsor/RISET-KAJIAN-LUAR.md`.

## 4. Aturan yang ditegaskan ulang oleh bahan ini

- Peta kerawanan apa pun, dari pihak mana pun, diuji lawan kejadian yang tidak dipakai menyusunnya, dan harus
  mengalahkan pembanding kepadatan penduduk dan riwayat kejadian. AUC latih, akurasi tanpa laju dasar, dan
  kecocokan visual dengan peta resmi tidak dihitung sebagai bukti.
- Peta bahaya bukan peta risiko, dan indeks bukan kedalaman.
- Tidak pernah menulis "aman", juga saat mengutip kajian luar yang memakainya.
- Angka dari model tertutup tanpa uji (misalnya ENSONINAID26) tidak tampil sebagai angka kita.
