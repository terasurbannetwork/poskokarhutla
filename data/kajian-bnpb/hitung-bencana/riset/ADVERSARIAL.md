# Uji adversarial kerangka tiga lapis (Bab 6)

Penguji tidak ikut menulis kajian. Bahan yang diuji: `naskah/06-kerangka.md` dan bunyi kriteria lama di
`naskah/04-bedah-kriteria.md` bagian 4.1. Kasus di sini BARU: tidak sama dengan P-01 sampai P-65 di
`riset/DAFTAR-PARADOKS.md`. Kasus bertanda [ILUSTRASI] dirancang untuk menguji aturan, bukan kejadian
yang dicatat; angkanya hanya contoh hitung. Kasus bertanda sumber nyata tetap perlu diperiksa ulang ke
sumber sebelum dikutip di naskah.

Jenis kegagalan: (a) dua jawaban, (b) tidak ada jawaban, (c) jawaban jelas tidak masuk akal,
(d) bisa dimanipulasi pelapor, (e) tidak bisa dijalankan operator.
Tingkat: BERAT bila mengubah jumlah atau kelas secara berarti; SEDANG; RINGAN.

## Kelompok 1. Rantai, jeda, dan batas kejadian (6.2.2)

### A-01 Rantai jeda banjir yang berlangsung berbulan
- Kasus: [ILUSTRASI] banjir dan rob di pesisir yang kambuh tiap pasang purnama, selang 5 sampai 6 hari,
  selama satu musim hujan.
- Aturan diuji: 6.2.2, baris banjir/rob ("jeda 7 hari tanpa laporan aktif" membuat kejadian baru).
- Kegagalan: (c) dan (d). Tiap kambuhan jatuh di dalam jeda 7 hari, jadi seluruh musim menjadi satu KJN.
  Satu KJN berdurasi berbulan memuat puncak pengungsi dan RBS yang tidak sebanding dengan kejadian
  tunggal, dan hanya dihitung satu kali di jumlah kejadian. Pelapor yang ingin satu kejadian besar cukup
  melapor tiap 6 hari; yang ingin banyak kejadian berhenti melapor 8 hari.
- Tingkat: BERAT.
- Perbaikan terkecil: tambah batas durasi atas (usul 30 hari) yang memotong rantai; kambuhan setelah
  batas menjadi KJN baru dengan rujukan "lanjutan dari".

### A-02 Rantai karhutla 1,5 km dan 48 jam yang menyapu satu musim
- Kasus: [ILUSTRASI] titik api di lahan gambut yang terus muncul di sekitar titik lain pada musim
  kemarau, tiap deteksi baru berjarak kurang dari 1,5 km dari deteksi hari sebelumnya.
- Aturan diuji: 6.2.2, baris karhutla ("berantai"); aturan umum 1 dan 2.
- Kegagalan: (c). "Berantai" tanpa batas membuat satu KJN merambat melintasi puluhan kilometer dan
  berbulan; kluster di satu kabupaten Kalimantan Tengah dan kluster di kabupaten lain yang terhubung
  rantai menjadi satu. Aturan 2 melarang pembatalan, sehingga rantai tidak bisa dipotong belakangan.
  Jumlah kejadian karhutla turun drastis dan luas tunggal membesar.
- Tingkat: BERAT.
- Perbaikan terkecil: batas diameter atau batas durasi per KJN karhutla (mis. 30 hari atau satu
  kabupaten, mana yang lebih dulu), lalu KJN baru bertautan "lanjutan".

### A-03 Jeda 7 hari semu akibat awan dan asap
- Kasus: [ILUSTRASI] api aktif tetapi satelit tertutup asap tebal dan awan selama 7 hari; tidak ada
  deteksi, tidak ada laporan karena akses sulit.
- Aturan diuji: 6.2.2, karhutla ("7 hari tanpa deteksi aktif dan tanpa laporan aktif").
- Kegagalan: (a) dan (e). Aturan menyebut "tanpa deteksi", padahal ketiadaan deteksi di sini bukan
  ketiadaan api. Kejadian ditutup, lalu api yang sama muncul sebagai KJN baru: satu kebakaran, dua
  kejadian. Operator tidak punya cara menandai hari buta satelit. Penghentian S-NPP pada 1 November 2026
  (Bab 6.6 butir 4) menambah hari buta.
- Tingkat: BERAT.
- Perbaikan terkecil: hari yang diketahui buta (tutupan awan, kualitas pengamatan rendah) tidak dihitung
  dalam 7 hari; kolom "hari tanpa pengamatan" wajib.

### A-04 Jembatan palsu dan larangan membatalkan penggabungan
- Kasus: [ILUSTRASI] satu deteksi dari sumber panas bukan api (flaring industri, bakar sampah) berada di
  antara dua kejadian karhutla yang terpisah; atau pelapor mengirim satu laporan keliru di tengahnya.
- Aturan diuji: aturan umum 2 ("penggabungan tidak dibatalkan") bersama 6.2.2 karhutla.
- Kegagalan: (d) dan (a). Satu mata rantai palsu menyatukan dua kejadian secara permanen; yang lebih
  kecil ditutup "digabung ke" yang lebih besar. Kejadian yang ingin dibesarkan atau dikecilkan dapat
  dibuat dengan menyisipkan atau menahan satu laporan.
- Tingkat: SEDANG.
- Perbaikan terkecil: ubah aturan menjadi "penggabungan yang sah tidak dibatalkan"; penggabungan akibat
  mata rantai yang kemudian dinyatakan salah boleh dipisah sebagai rilis bernomor versi dengan alasan.

### A-05 Dua bahaya independen yang kebetulan bersamaan
- Kasus: [ILUSTRASI] gempa merusak rumah di kabupaten yang pada hari yang sama sedang banjir; orang yang
  mengungsi karena banjir lalu pindah posko karena gempa.
- Aturan diuji: aturan umum 3 (induk-anak untuk rantai; majemuk "tanpa rantai jelas" memilih tipe utama
  dari dampak terbesar).
- Kegagalan: (a) dan (c). Tidak ada rantai sebab, tetapi aturan majemuk memaksa satu tipe utama; dua
  KJN independen atau satu KJN majemuk, keduanya sah menurut teks. "Dampak terbesar" tidak punya ukuran
  (jiwa, RBS, atau pengungsi) dan korban mengungsi bisa dihitung dua kali karena kategori satu orang satu
  kategori hanya berlaku dalam satu KJN.
- Tingkat: SEDANG.
- Perbaikan terkecil: tanpa rantai sebab terdokumentasi, bahaya berbeda jenis selalu KJN terpisah;
  orang unik lintas KJN ditandai bila terlihat, tidak dijumlah di tingkat tabel gabungan.

### A-06 Induk-anak berantai lebih dari dua tingkat
- Kasus: gempa memicu longsor yang membendung sungai (bendung alam), bendung jebol menjadi banjir bandang.
  Tiga tingkat: gempa, longsor, banjir bandang. [ILUSTRASI] sebagai pola; contoh bendung alam pascagempa
  ada di berbagai gempa pegunungan.
- Aturan diuji: aturan umum 3; 6.1 (L2 diterapkan pada KJN).
- Kegagalan: (b) dan (c). Teks hanya mengenal induk dan anak. Korban "dijumlah sekali di induk": induk
  gempa atau induk pangkal rantai? Bila tiap simpul diuji L2 sendiri, satu rantai menghasilkan tiga
  kejadian bencana di jumlah kejadian; bila hanya akar yang diuji, anak yang lolos sendiri tidak muncul
  di hitungan per jenis (banjir bandang hilang dari statistik banjir).
- Tingkat: BERAT.
- Perbaikan terkecil: pohon, bukan pasangan; jumlah kejadian hanya menghitung akar; statistik per jenis
  menghitung simpul dengan label "anak"; korban dicatat di simpul penyebab langsung dan dijumlah ke akar.

### A-07 Anak lahir setelah induk selesai
- Kasus: lahar hujan (lahar dingin) bulan-bulan setelah erupsi, saat status gunung sudah turun dan induk
  "selesai". Contoh nyata pola ini: lahar dingin di alur sungai Merapi setelah erupsi 2010 [periksa
  tanggal dan jumlah ke sumber sebelum dikutip].
- Aturan diuji: 6.2.2, erupsi ("selesai bila status turun ke Waspada"); aturan umum 3.
- Kegagalan: (b). Anak harus berinduk, tetapi induk sudah selesai dan ditutup; tidak ada aturan membuka
  kembali induk atau menautkan anak ke induk yang selesai. Bila KJN mandiri, hubungan sebab hilang dan
  erupsi tampak tanpa dampak; bila induk dibuka kembali, jeda induk menjadi tak bermakna.
- Tingkat: SEDANG.
- Perbaikan terkecil: tautan sebab boleh ke induk yang sudah ditutup dalam jendela atribusi per jenis
  induk (mis. 12 bulan erupsi), tanpa membuka induk; di luar jendela, KJN mandiri.

### A-08 Induk di bawah ambang, anak lolos
- Kasus: [ILUSTRASI] gempa laut besar tanpa dampak di daratan memicu tsunami jarak dekat yang merenggut
  korban; induk tidak memenuhi M1 sampai M6 sendiri.
- Aturan diuji: aturan umum 3 bersama 6.3 (L2 pada KJN) dan 6.3.2.
- Kegagalan: (a). Korban dijumlah di induk, jadi induk lolos; atau induk dinilai dengan dampak langsungnya
  sendiri (nol), jadi induk "di bawah ambang" dan anak tanpa induk yang sah. Dua jawaban sah.
- Tingkat: SEDANG.
- Perbaikan terkecil: tulis bahwa L2 dinilai pada angka yang sudah dijumlahkan ke akar; simpul turunan
  yang lolos membuat akarnya lolos dengan dasar masuk "melalui anak".

## Kelompok 2. Ambang masuk (6.3)

### A-09 Rumah terendam memicu lewat M3, dilarang lewat M4
- Kasus: [ILUSTRASI] banjir genangan 30 cm selama beberapa jam di 13 rumah, rata-rata 4 jiwa per rumah
  (52 orang); tidak ada pengungsi atau luka.
- Aturan diuji: M3 ("penghuni rumah yang rusak atau tergenang") lawan M4 ("rumah terendam tidak
  memicu") dan 6.5 butir 3.
- Kegagalan: (a) dan (c). Kerangka sendiri melarang rumah terendam memicu, lalu memicu lewat jalur orang.
  Syarat "paling sedikit 3 hari" secara tata bahasa menempel pada mata pencaharian dan akses air saja,
  bukan pada penghuni rumah tergenang. Hasilnya banjir kecil harian di kota padat menjadi bencana, dan
  jumlah kejadian banjir melonjak tajam dibanding aturan lama.
- Tingkat: BERAT.
- Perbaikan terkecil: syarat 3 hari berlaku untuk semua bentuk terdampak M3; atau genangan hanya dihitung
  bila ketinggian atau lama melewati batas tertulis.

### A-10 Satu orang satu kategori menyembunyikan ambang
- Kasus: [ILUSTRASI] 60 orang terdampak langsung: 40 luka (juga mengungsi), 20 mengungsi saja, 0 sisa
  untuk kategori terdampak.
- Aturan diuji: 6.5 butir 2 (satu orang satu kategori; luka dan mengungsi dicatat sebagai luka) bersama
  M2 dan M3 (ambang 50 per kategori).
- Kegagalan: (c). Per kategori 40 luka, 20 mengungsi, 0 terdampak: tidak ada yang mencapai 50, padahal 60
  orang unik terdampak. Sebaliknya, pelapor yang ingin lolos mengisi semua orang sebagai satu kategori.
  Ini bukan P-25 (hitung ganda); ini efek balik dari menghapus hitung ganda.
- Tingkat: BERAT.
- Perbaikan terkecil: M2 dan M3 diuji pada gabungan orang unik (luka, mengungsi, terdampak) mencapai 50;
  kategori tetap hanya untuk pelaporan.

### A-11 M4 fasilitas satu unit
- Kasus: [ILUSTRASI] atap satu PAUD rusak sedang karena angin kencang; atau satu jembatan gantung desa
  putus.
- Aturan diuji: M4 ("1 fasilitas pelayanan dasar atau prasarana vital rusak berat atau sedang").
- Kegagalan: (c) dan (d). Ambang satu unit hampir selalu terpenuhi oleh kejadian cuaca ekstrem harian;
  "fasilitas pelayanan dasar" dan "prasarana vital" tidak punya daftar tertutup. Satu sekolah dengan
  enam ruang dapat dilapor satu fasilitas atau enam unit, sesuai selera pelapor. Jumlah kejadian cuaca
  ekstrem dan longsor naik berlipat.
- Tingkat: BERAT.
- Perbaikan terkecil: daftar tertutup jenis fasilitas; satuan hitung satu lembaga atau satu ruas; "rusak
  sedang" hanya bila fungsi terhenti paling sedikit 7 hari.

### A-12 M5 butuh luas terverifikasi, verifikasi tidak ada
- Kasus: [ILUSTRASI] karhutla gambut terpencil, hanya indikasi titik panas dan perkiraan petugas; citra
  resolusi tinggi tertutup awan.
- Aturan diuji: M5 dan 6.5 butir 6 (hanya pengukuran lapangan atau citra resolusi tinggi memicu M5), dan
  6.3.2 (tenggang verifikasi 3 hari).
- Kegagalan: (b) dan (d). Setelah 3 hari tidak ada aturan nasib kejadian: bukan bencana, bukan di bawah
  ambang, bukan terdeteksi lagi. Bila jawaban "di bawah ambang", kejadian yang sebenarnya besar tidak
  pernah masuk karena tidak ada yang mengukur; pelapor bisa memilih tidak mengukur. Di musim kering,
  daftar ketiga menggelembung tanpa jalan keluar.
- Tingkat: BERAT.
- Perbaikan terkecil: tenggang berakhir menjadi status eksplisit "tidak terverifikasi, kedaluwarsa" yang
  dapat dibuka retroaktif; tambahkan sumber ketiga sah (luas dari citra Sentinel-2 pasca-kebakaran) dengan
  penanda.

### A-13 M6 dari SK yang menyebut beberapa kejadian
- Kasus: [ILUSTRASI] satu SK tanggap darurat bupati menyebut "banjir, longsor, dan angin kencang" di
  satu kabupaten tanpa tanggal atau lokasi per kejadian.
- Aturan diuji: M6 ("SK ... yang menyebut kejadian ini"), P-62 diselesaikan hanya sebagai penanda payung.
- Kegagalan: (a) dan (d). Tiga KJN, satu SK: ketiganya lolos M6 walau dua tidak berdampak; atau satu
  yang disebut lolos dan lainnya tidak. Pemda yang ingin kejadian kecil masuk cukup menambah namanya
  di SK. "Menyebut" tidak terdefinisi (nama jenis, lokasi, tanggal).
- Tingkat: SEDANG.
- Perbaikan terkecil: M6 hanya bila SK menyebut jenis, wilayah, dan tanggal mulai yang cocok dengan KJN;
  SK satu untuk banyak kejadian diberi rujukan per KJN oleh Pusdatinkom.

### A-14 KJN memuat CK berjenis berbeda
- Kasus: satu sistem hujan: banjir di kabupaten hulu, banjir bandang di kabupaten tengah, longsor di
  kabupaten lain. [ILUSTRASI] sebagai pola.
- Aturan diuji: 6.2.1 (KJN dan CK) bersama 6.2.2 (aturan gabung per jenis) dan 6.6 butir 1 sampai 2.
- Kegagalan: (a). Jenis dimiliki KJN atau CK? Bila per CK, jumlah per jenis (banjir 1, banjir bandang 1,
  longsor 1) lebih besar daripada jumlah KJN (1) dan tabel tidak saling cocok; bila KJN punya satu jenis,
  dampak dua jenis lain tersembunyi dalam jenis utama.
- Tingkat: SEDANG.
- Perbaikan terkecil: KJN punya satu jenis utama dan daftar jenis termuat; statistik per jenis menghitung
  KJN menurut jenis utama dan menyebut "memuat" untuk lainnya; jumlah per jenis tidak dijumlah antarjenis.

### A-15 Kelas B dari sekadar kemampuan mengungsikan orang
- Kasus: [ILUSTRASI] banjir sungai yang terprediksi di kota besar; 12.000 orang diungsikan tanpa luka,
  tanpa kerusakan, tanpa korban; air surut dalam sehari.
- Aturan diuji: 6.4.2 butir 1 ("kelas tertinggi yang dicapai salah satu indikator"), tabel 6.5, dan
  pengecualian evakuasi preventif di M2.
- Kegagalan: (c) dan (d). Pengungsi 10.000 atau lebih berarti kelas B tanpa satu pun dampak lain.
  Evakuasi "preventif" dikecualikan, tetapi batas preventif dan "karena dampak" kabur: pengungsian atas
  perintah setelah air naik 20 cm dihitung apa? Pelapor yang menaikkan pengungsi menaikkan kelas
  (insentif); BPBD yang mengungsikan lebih awal dan lebih baik dihukum dengan kelas lebih tinggi.
- Tingkat: BERAT.
- Perbaikan terkecil: kelas B dan K karena mengungsi hanya bila disertai indikator kedua (kerusakan atau
  korban) atau bila pengungsian bertahan paling sedikit 3 hari; ukuran pengungsi dalam orang-hari.

### A-16 Penaik relatif di kabupaten berpenduduk kecil
- Kasus: [ILUSTRASI] kabupaten 15.000 jiwa; 1.500 orang mengungsi dan terdampak.
- Aturan diuji: 6.4.2 butir 2 (10 persen penduduk, naik satu tingkat, paling tinggi B).
- Kegagalan: (c). 1.500 orang membuat kejadian R menjadi S, atau S menjadi B, di kabupaten kecil,
  padahal kelas B menurut tabel butuh 10.000 pengungsi. Kejadian yang secara absolut kecil mendapat
  kelas B dan masuk daftar "bencana besar". Kabupaten berpenduduk jutaan tidak pernah memakai penaik.
  Penaik juga memerlukan satu angka penduduk (sensus atau proyeksi, tahun mana) yang tidak ditetapkan.
- Tingkat: BERAT.
- Perbaikan terkecil: penaik hanya berlaku bila angka absolut mencapai sedikitnya sepersepuluh ambang
  kelas tujuan; tetapkan sumber dan tahun penduduk (proyeksi BPS tahun kejadian).

### A-17 Penaik relatif di kabupaten penampung
- Kasus: pengungsi satu gunung api ditampung di kabupaten tetangga (pola umum pada Merapi dan Semeru).
- Aturan diuji: 6.4.2 butir 2 ("di satu kabupaten ... penduduknya").
- Kegagalan: (a). Pengungsi dicatat di kabupaten asal (rumah) atau kabupaten tujuan (lokasi)? Dua
  jawaban memberi persentase berbeda, sehingga kelas berbeda. KJN lintas kabupaten: "satu kabupaten
  mencapai 10 persen" memakai kabupaten mana yang paling tinggi, tanpa menjumlah.
- Tingkat: SEDANG.
- Perbaikan terkecil: pengungsi dihitung pada kabupaten asal tempat rumah; lokasi penampungan hanya
  atribut; penaik diuji pada CK dengan persentase tertinggi.

## Kelompok 3. Jenis bahaya khusus (6.2.2)

### A-18 Gempa beruntun (swarm) dan batas 30 hari
- Kasus: rangkaian gempa Lombok 2018, beberapa gempa merusak dalam hitungan minggu di zona yang sama
  [periksa tanggal dan magnitudo ke katalog BMKG; di sini dipakai sebagai pola].
- Aturan diuji: 6.2.2, baris gempa bumi ("susulan dalam 30 hari di zona yang sama"; "gempa utama baru
  menurut BMKG").
- Kegagalan: (a) dan (c). Gempa kedua yang lebih besar dari yang pertama dan merusak sendiri: susulan
  atau gempa utama baru? Kerangka menyerahkan ke BMKG, yang bisa menamai berbeda dengan dampak.
  "30 hari tanpa susulan merusak" menghitung dari susulan terakhir yang merusak, sehingga rangkaian yang
  tersambung bisa memanjang berbulan menjadi satu KJN. Satu KJN swarm menyatukan empat dampak yang
  secara fisik terpisah; tiga rumah roboh oleh gempa ketiga ikut dalam kelas gempa pertama.
- Tingkat: BERAT.
- Perbaikan terkecil: gempa baru adalah KJN baru bila magnitudo mencapai atau melebihi induk dikurangi
  ambang tertulis dan menimbulkan dampak yang dapat dipisahkan menurut wilayah; batas atas 90 hari per
  KJN; bila tidak memenuhi, menjadi susulan di KJN yang ada.

### A-19 Erupsi saat status Waspada dengan korban
- Kasus: erupsi Gunung Marapi pada Desember 2023 yang menewaskan pendaki saat gunung berstatus Waspada
  [periksa status dan jumlah korban ke PVMBG dan DIBI sebelum dikutip].
- Aturan diuji: 6.2.2, baris erupsi ("satu gunung, satu periode Siaga atau Awas"; "selesai bila status
  turun ke Waspada").
- Kegagalan: (b). Tidak ada periode Siaga atau Awas, jadi tidak ada kejadian yang bisa dibentuk, padahal
  M1 terpenuhi. Kejadian erupsi berkorban jiwa dapat hilang dari hitungan karena definisi unit hanya
  mengikuti status.
- Tingkat: BERAT.
- Perbaikan terkecil: periode erupsi dimulai pada erupsi pertama yang berdampak, atau pada status
  Siaga atau Awas, mana yang lebih dulu; status hanya menentukan selesai.

### A-20 Status gunung api naik turun
- Kasus: gunung api yang berstatus Awas, turun ke Siaga atau Waspada, naik lagi dalam hitungan hari,
  sementara warga tetap di pengungsian. [ILUSTRASI] sebagai pola; Lewotobi 2024 memiliki rangkaian
  perubahan status [periksa tanggal].
- Aturan diuji: 6.2.2, erupsi ("Status turun ke Waspada atau Normal lalu naik lagi" = kejadian baru).
- Kegagalan: (a) dan (c). Pengungsi yang tidak pulang terpotong dua KJN: puncak pengungsi masing-masing
  lebih kecil, kelas turun; atau dihitung dua kali bila dijumlah. Dua periode dalam sepekan = dua kejadian
  bencana, padahal satu krisis.
- Tingkat: SEDANG.
- Perbaikan terkecil: tambahkan jeda minimum (mis. 14 hari di status Waspada atau Normal) sebelum
  periode dinyatakan selesai.

### A-21 Kekeringan per musim padahal musim berbeda antarwilayah
- Kasus: musim kemarau mulai dan berakhir pada waktu berbeda menurut zona musim BMKG; sebagian NTT
  kemarau panjang, Sumatera bagian utara dengan dua puncak hujan. Kekeringan El Nino yang melewati
  pergantian musim.
- Aturan diuji: 6.2.2, baris kekeringan/kabut asap/abrasi ("satu kabupaten, satu musim"; "musim
  berikutnya"; "30 hari tanpa laporan aktif atau SK status berakhir").
- Kegagalan: (a), (b), dan (c). "Musim" tidak didefinisikan (kalender, zona musim, atau SK). Dua kondisi
  selesai (30 hari tanpa laporan atau SK berakhir) bisa bertentangan. "Satu kabupaten" membuat kekeringan
  tidak pernah lintas kabupaten, jadi KJN sama dengan CK dan 6.2.1 tidak berlaku. Kemarau yang
  tertunda hujannya dapat melintasi dua musim kemarau tanpa jeda dan terpotong di batas yang dibuat-buat.
- Tingkat: BERAT.
- Perbaikan terkecil: unit adalah zona musim BMKG kali periode kemarau yang ditetapkan BMKG untuk zona itu;
  CK per kabupaten; selesai hanya satu syarat (akhir periode menurut BMKG atau SK, mana yang lebih akhir).

### A-22 Kabut asap dan karhutla menjadi dua KJN
- Kasus: karhutla di satu kabupaten menimbulkan asap di kabupaten lain yang tidak terbakar (jarak
  puluhan kilometer); pengungsi (evakuasi ke ruang bebas asap) dan ISPA di kabupaten kedua.
- Aturan diuji: 6.2.2 (kabut asap "satu kabupaten, satu musim"); aturan umum 3 tidak menyebut asap
  sebagai anak karhutla.
- Kegagalan: (a). Dua kemungkinan: asap anak karhutla (induk lintas kabupaten) atau KJN mandiri per
  kabupaten. Jawaban kedua memberi sebanyak kabupaten KJN asap tanpa hubungan dengan api; evakuasi
  dihitung di KJN asap sementara kematian tak langsung (P-23) tidak diikat ke karhutla.
- Tingkat: SEDANG.
- Perbaikan terkecil: tambahkan asap sebagai anak karhutla dalam daftar bahaya ikutan, dengan CK di
  kabupaten terdampak asap.

## Kelompok 4. Waktu, wilayah, dan operasional

### A-23 Pemekaran di tengah kejadian
- Kasus: kejadian yang dimulai sebelum tanggal efektif pembentukan provinsi atau kabupaten baru dan
  berlanjut sesudahnya (pembentukan tiga provinsi baru di Papua pada 2022 sebagai contoh pola
  [periksa tanggal efektif ke undang-undangnya]).
- Aturan diuji: 6.6 butir 9 ("batas terkini untuk penyajian dan kode saat kejadian untuk arsip") dan
  6.2.1 (provinsi menghitung KJN yang menyentuhnya).
- Kegagalan: (a). "Kode saat kejadian" ambigu untuk kejadian yang melewati tanggal efektif; CK yang
  dimulai sebelum dan lanjut sesudahnya punya dua kode. Penyajian provinsi lama dan baru menghitung KJN
  yang sama di dua provinsi atau di satu.
- Tingkat: SEDANG.
- Perbaikan terkecil: kode wilayah CK diambil pada tanggal dampak pertama CK; tabel padanan kode lama dan
  baru dipublikasikan; KJN yang menyentuh provinsi baru dan lama menghitung di keduanya, dengan catatan.

### A-24 Kejadian lintas negara, dampak keluar dan korban asing
- Kasus: [ILUSTRASI] asap karhutla kita masuk ke negara tetangga; atau wisatawan asing tewas dalam
  gempa di wilayah kita (korban asing pada gempa Lombok 2018 tercatat dalam laporan resmi [periksa
  sumber]); atau WNI meninggal akibat bencana di luar negeri.
- Aturan diuji: aturan umum 6 (bahaya luar negeri dicatat bila berdampak di wilayah kita) dan M1.
- Kegagalan: (b). Tidak ada aturan untuk dampak di luar wilayah dari bahaya yang bersumber di kita, dan
  tidak ada aturan kewarganegaraan korban: WNA di wilayah kita dihitung (dampak di wilayah) atau tidak
  (bukan penduduk)? Peringkat provinsi turis tinggi mengalami lonjakan tidak terdokumentasi.
- Tingkat: SEDANG.
- Perbaikan terkecil: dampak dihitung berdasarkan tempat kejadian, bukan kewarganegaraan; dampak di luar
  wilayah dicatat sebagai keterangan, tidak masuk jumlah nasional.

### A-25 Hari kalender dan zona waktu pada kebakaran permukiman
- Kasus: kebakaran permukiman menyala 23:00 WIB dan baru padam 04:00 WIB; atau data satelit memakai UTC
  sementara laporan lokal WIT.
- Aturan diuji: 6.2.2, baris kebakaran permukiman ("satu lokasi, satu hari") dan cuaca ekstrem ("hari
  yang sama").
- Kegagalan: (a) dan (e). Satu kebakaran berlangsung melewati tengah malam menjadi dua kejadian "hari
  berbeda". Indonesia memakai tiga zona waktu; "hari" tidak punya zona. Gabungan data satelit UTC dan
  laporan lokal memberi tanggal berbeda untuk kejadian yang sama.
- Tingkat: RINGAN.
- Perbaikan terkecil: "hari" = jendela 24 jam sejak dampak pertama, dalam zona waktu lokasi; simpan
  tanggal lokal dan UTC.

### A-26 Klasifikasi RBS butuh data yang belum ada pada 72 jam pertama
- Kasus: pada 72 jam pertama kaji cepat hanya mendata "rumah rusak" total, belum dipisah RB, RS, RR.
- Aturan diuji: M4 (RBS = RB + 0,5 RS + 0,25 RR), tabel 6.5, dan 6.4.2 butir 4 (kelas sementara boleh
  naik).
- Kegagalan: (e) dan (d). Operator tidak dapat menghitung RBS tanpa rincian; kelas dan M4 tertunda atau
  tidak terhitung. Petugas yang ingin kelas tinggi mengisi rincian ke RB, sementara yang tidak ingin
  mengisi RR. Pengisian pertama menjadi arah kelas.
- Tingkat: SEDANG.
- Perbaikan terkecil: sebelum rincian lengkap, rumah rusak tak terpilah dipakai dengan bobot paling
  rendah (0,25) dan ditandai "sementara"; kelas hanya naik bila rincian mengonfirmasi.

## Ringkasan

Jumlah kasus: 26. BERAT: 13 (A-01, A-02, A-03, A-06, A-09, A-10, A-11, A-12, A-15, A-16, A-18, A-19,
A-21). SEDANG: 12 (A-04, A-05, A-07, A-08, A-13, A-14, A-17, A-20, A-22, A-23, A-24, A-26). RINGAN: 1
(A-25).

Pola kegagalan terbanyak: rantai tanpa batas atas (A-01, A-02, A-18, A-21), ambang yang diuji per bagian
alih-alih pada orang atau unit utuh (A-09, A-10, A-11), jalur masuk yang tidak memberi jawaban (A-12,
A-19, A-21), dan indikator tunggal yang dapat dimainkan (A-15, A-16).

Tiga perbaikan paling penting:

1. **Batas atas dan pemutus pada semua aturan rantai.** Tambahkan batas durasi (mis. 30 hari, 90 hari
   untuk gempa) dan hari tidak teramati dikeluarkan dari hitungan jeda; kejadian lanjutan menjadi KJN
   baru dengan tautan "lanjutan dari". Menutup A-01, A-02, A-03, A-18, A-20, dan menjinakkan A-04.
2. **Uji ambang pada orang unik dan satu syarat durasi.** M2 dan M3 diuji pada gabungan orang unik;
   syarat 3 hari berlaku untuk semua bentuk terdampak; M4 memakai daftar fasilitas tertutup. Menutup
   A-09, A-10, A-11 dan menyingkirkan kontradiksi internal M3 lawan M4.
3. **Tidak ada jalur tanpa jawaban, dan tidak ada indikator tunggal yang bisa dimainkan.** Setiap
   jenis harus punya awal kejadian yang tidak bergantung status (A-19), tenggang verifikasi punya
   status akhir (A-12), kekeringan mengacu pada zona musim BMKG (A-21), serta pengungsi dan penaik
   relatif punya syarat pendamping (A-15, A-16).
