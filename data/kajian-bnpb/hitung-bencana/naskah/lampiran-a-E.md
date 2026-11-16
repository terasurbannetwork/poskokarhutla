# Lampiran A, kelompok E: Klasifikasi besar, sedang, kecil

Kelompok ini memuat lima paradoks yang bertanya satu hal: "besar" menurut ukuran apa. Ukuran bisa berupa
jumlah korban, perbandingan dengan jumlah penduduk atau kemampuan daerah, besarnya bahaya, atau besarnya
tanggapan pemerintah. Tiap ukuran memberi urutan yang berbeda untuk kejadian yang sama. Juklak 7/2023
(Petunjuk Pelaksanaan Badan Nasional Penanggulangan Bencana Nomor 7 Tahun 2023 tentang Standar Data Kejadian
dan Dampak Bencana) tidak mengatur skala keparahan. Enam kriterianya hanya menjawab apakah sebuah kejadian
dicatat (lapis L2), sehingga semua paradoks di sini adalah bahan perancangan lapis skala keparahan (L3) di
Bab 6.4. Angka tambahan dalam berkas ini dihitung oleh `analisis/tambahan_EFG.py` (keluaran
`analisis/hasil/tambahan_EFG.json`) dari tarikan Data dan Informasi Bencana Indonesia (DIBI) tanggal 12
November 2026. Periode "12 bulan" berarti 13 November 2025 sampai 12 November 2026. Satuan DIBI adalah baris
(hari, kabupaten/kota, jenis bencana), bukan kejadian utuh.

---

### P-32 Kecil-kecil jadi bukit

**Kelompok:** E. **Bergantung pada:** P-01, P-05, P-48 (unit kejadian), P-27. **Menentukan:** P-37, P-33, P-65.

1. **Kasus.** Gempa Nusa Tenggara Timur 15 Agustus 2026 tercatat di DIBI dalam 11 baris kabupaten dengan total
   151 meninggal dan 29.303 rumah rusak berat dalam satu hari (hitungan kami dari tarikan DIBI 12 November 2026).
   Kejadian sebesar itu jelas masuk kelas berat. Di sisi lain, 12 bulan yang sama memuat ribuan baris banjir,
   angin, dan kebakaran permukiman dengan dampak kecil. Yang dipersoalkan adalah apakah jumlah kejadian kecil
   itu lebih penting daripada satu kejadian besar.
2. **Mengapa ini paradoks.** Jawaban A: kejadian kecil tidak perlu diberi perhatian khusus, karena tiap kejadian
   dapat ditangani daerah dan dampaknya terbatas. Jawaban B: kerugian kumulatif kejadian kecil dapat melebihi
   satu kejadian besar, sehingga mengabaikannya membuat pemerintah salah menaruh sumber daya. Keduanya masuk
   akal, dan keduanya benar tergantung ukuran yang dipakai (jiwa, rumah, atau orang terdampak).
3. **Jawaban aturan saat ini.** Tidak diatur. Juklak 7/2023 hanya memuat ambang masuk dan tidak membagi kejadian
   menurut besar. Kejadian yang lolos satu kriteria dihitung satu kejadian dengan bobot sama (Bab 4.4).
4. **Jawaban praktik dunia.** UNDRR dalam Global Assessment Report (GAR) 2015 Box 4.1 membedakan kerugian
   ekstensif (kurang dari 30 meninggal dan kurang dari 600 rumah hancur) dan intensif (30 meninggal atau lebih,
   atau 600 rumah hancur atau lebih). Teksnya menyebut ambang ini "robust" dan memakai basis data kerugian
   nasional Indonesia 1990 sampai 2013 sebagai contoh. Sumber: preventionweb.net/english/hyogo/gar/2015/en/home/GAR_2015/GAR_2015_93.html.
   DesInventar sengaja tanpa ambang agar kejadian kecil dan menengah tercatat. Dokumentasi EM-DAT mencatat bahwa
   kematian kumulatif kejadian bermortalitas rendah melebihi kematian kejadian bermortalitas tinggi pada
   2000 sampai 2024 (doc.emdat.be/docs/known-issues-and-limitations/specific-biases/).
5. **Opsi penyelesaian.**
   - *Opsi A, dua kelas ekstensif dan intensif menurut GAR sebagai penanda turunan.* Jumlah kejadian: tidak
     berubah. Tren: dibaca per kelas. Keadilan antardaerah: membaik karena daerah yang sering terkena kejadian
     kecil terlihat. Insentif pelapor: tetap, sebab ambang masuk tidak digeser. Beban pencatat: nol, karena kelas
     dihitung mesin dari angka dampak.
   - *Opsi B, tanpa nama kelas; sajikan kontribusi kumulatif per tingkat dampak.* Jumlah kejadian: tidak
     berubah. Tren: tidak terpengaruh. Keadilan antardaerah: sama dengan opsi A, tetapi pembaca perlu membaca
     grafik. Insentif pelapor: tetap. Beban pencatat: nol.
   - *Opsi C, tetapkan ambang ekstensif khusus Indonesia.* Jumlah kejadian: tidak berubah, tetapi kelasnya
     bergeser; bila ambang terlalu rendah, hampir semua kejadian menjadi "intensif" dan pembedaan hilang.
     Tren: terputus dari deret yang memakai ambang GAR sampai ambang baru dikalibrasi. Keadilan antardaerah:
     bergantung hasil kalibrasi. Insentif pelapor: tetap, selama ambang masuk tidak digeser. Beban pencatat:
     tetap; beban analis naik karena kalibrasi.
6. **Uji empiris.** Dengan aturan GAR (rumah hancur didekati dengan rumah rusak berat, proxy kasar) pada tiga
   satuan, 12 bulan DIBI: pada satuan baris, 99,3 persen dari 4.034 satuan ekstensif; kelas ekstensif memikul
   24,6 persen meninggal (466 dari 1.897), 13,3 persen rumah rusak (rusak berat, sedang, ringan) dan 63,6 persen
   orang terdampak, luka, dan mengungsi. Pada satuan nasional-hari-kategori (1.233 satuan), bagian meninggal
   turun ke 19,8 persen dan terdampak ke 54,9 persen. Pada kalender 2025 bagian meninggal ekstensif 39,1 persen
   (baris) sampai 34,1 persen (nasional-hari-kategori). Jadi bukit kecil-kecil nyata untuk orang terdampak,
   cukup besar untuk jiwa pada 2025, dan kecil untuk rumah. Hasil sangat peka terhadap satuan hitung (P-01),
   dan DIBI mencatat "terdampak" yang mungkin berganda (P-25). Sumber: skrip tambahan_EFG.py, bagian P32.
7. **Rekomendasi sementara.** Opsi A sebagai penanda turunan di L3, dihitung pada unit kejadian L1 dan bukan
   pada baris, dengan ambang 30 meninggal atau 600 rumah rusak berat [BAWAAN SEMENTARA] sampai Q-36
   dijawab.

---

### P-33 Besar menurut siapa

**Kelompok:** E. **Bergantung pada:** P-17, P-28, P-65. **Menentukan:** P-42, P-65.

1. **Kasus.** Dalam data DIBI 12 bulan, 1.454 baris yang lolos ambang 50 orang terdampak, luka, atau mengungsi
   (K2) dan bisa dicocokkan dengan jumlah penduduk kabupaten (WorldPop tahun 2026, `public/data/penduduk.json`)
   memiliki median 0,06 persen penduduk terdampak. Sebanyak 839 baris (57,7 persen) di bawah 0,1 persen penduduk,
   sedangkan 75 baris (5,2 persen) setara 5 persen penduduk atau lebih. Angka 50 orang adalah 0,88 persen
   penduduk di kabupaten terkecil (5.689 jiwa) dan 0,0008 persen di kabupaten terbesar (5.964.481 jiwa).
2. **Mengapa ini paradoks.** Jawaban A: besar berarti jumlah korban dan kerusakan mutlak, karena pemerintah pusat
   menghitung kebutuhan bantuan dalam angka mutlak. Jawaban B: besar berarti melampaui kemampuan daerah, karena
   tanggung jawab berjenjang menurut kapasitas. Kejadian yang sama bisa "kecil" bagi Kota Surabaya dan "besar"
   bagi kabupaten berpenduduk 6.000 jiwa.
3. **Jawaban aturan saat ini.** Undang-Undang (UU) 24/2007 Pasal 7 ayat (2) menyebut lima indikator status dan
   tingkat bencana: jumlah korban, kerugian harta benda, kerusakan prasarana dan sarana, cakupan luas wilayah,
   dan dampak sosial ekonomi; ayat (3) menyerahkan perinciannya kepada peraturan presiden, yang tidak kami
   temukan. Pasal 51 menyerahkan penetapan status menurut skala kepada bupati, gubernur, atau Presiden. Perka
   BNPB 3/2016 Pasal 3 ayat (2) membedakan komando menurut cakupan wilayah, bukan angka dampak. Juklak 7/2023
   memakai ambang mutlak yang sama untuk semua daerah.
4. **Jawaban praktik dunia.** Filipina: dua dari enam kondisi, antara lain 20 persen penduduk terdampak atau 20
   persen rumah hancur. Amerika Serikat: indikator USD 1 per kapita yang disesuaikan indeks harga, yaitu USD
   2,01 (negara bagian) dan USD 5,03 (county) untuk insiden mulai 1 Oktober 2026, dengan minimum USD 1 juta.
   Jepang: rumah hilang 30 keluarga untuk kota di bawah 5.000 jiwa sampai 150 keluarga untuk kota 300.000 jiwa
   atau lebih. India: diskresioner tanpa kriteria tetap. GDACS memakai indeks kapasitas negara (INFORM) untuk
   gempa. Sumber dan URL: `riset/PUSTAKA.md` butir 7, 9, 10, 11, 12.
5. **Opsi penyelesaian.**
   - *Opsi A, mutlak saja.* Jumlah kejadian: tetap. Tren: bersih. Keadilan antardaerah: buruk, kabupaten kecil
     tidak pernah tampak besar. Insentif pelapor: tetap. Beban pencatat: nol.
   - *Opsi B, relatif terhadap penduduk.* Jumlah kejadian: tidak berubah, hanya kelas yang bergeser. Tren:
     bergeser bila data penduduk diperbarui. Keadilan antardaerah: membaik. Insentif pelapor: daerah kecil
     terdorong membesarkan angka terdampak, jadi perlu aturan verifikasi (P-16). Beban pencatat: nol bila
     penduduk diambil dari rujukan baku.
   - *Opsi C, dua sumbu: dampak relatif penduduk dan kapasitas fiskal daerah.* Jumlah kejadian: tidak berubah,
     hanya kelas yang bergeser. Tren: bergeser menurut data penduduk dan anggaran tiap tahun. Keadilan
     antardaerah: paling adil menurut teori, tetapi membutuhkan data anggaran daerah yang belum ada di repo.
     Insentif pelapor: ada dorongan membesarkan angka terdampak, sama seperti opsi B. Beban pencatat: nol;
     beban analis tinggi.
   - *Opsi D, ikut tingkat status (kabupaten, provinsi, nasional).* Jumlah kejadian: tidak berubah, kelas
     mengikuti keputusan status. Tren: ikut kebijakan penetapan status, bukan dampak. Keadilan antardaerah:
     merugikan daerah yang tidak menetapkan status. Insentif pelapor: mendorong penetapan status demi kelas
     (melingkar dengan P-15 dan P-65). Beban pencatat: rendah.
6. **Uji empiris.** Dua urutan teratas berbeda: dari 20 baris teratas menurut orang terdampak mutlak dan 20
   teratas menurut persen penduduk, hanya 13 yang sama. Beberapa baris relatif melebihi 100 persen penduduk
   (Aceh Tamiang 26 November 2025: 557.279 terdampak lawan 309.133 penduduk, 180 persen), tanda adanya hitung
   ganda antarkategori atau angka kumulatif (P-25, P-41), atau penduduk kabupaten yang terlalu rendah. Sumber:
   tambahan_EFG.py bagian P33; cakupan nama yang cocok 3.999 dari 4.185 baris.
7. **Rekomendasi sementara.** Q-34: kelas absolut dengan penaik relatif, yaitu naik satu kelas bila pengungsi dan
   terdampak langsung mencapai 10 persen penduduk kabupaten, dengan lantai 100 dan 1.000 orang dan paling tinggi
   Besar [BAWAAN SEMENTARA]; angka mutlak dan persen penduduk tetap disajikan berdampingan. Penduduk BPS dipakai
   bila tersedia; opsi anggaran daerah ditunda karena datanya per kejadian belum ada.

---

### P-34 "Gempa skala berapa itu besar?"

**Kelompok:** E. **Bergantung pada:** P-21, P-22. **Menentukan:** P-33, P-65.

1. **Kasus.** Dalam 12 bulan DIBI memuat 60 baris gempa bumi. Sebanyak 47 baris tanpa korban meninggal dan 10
   baris tanpa dampak apa pun; 13 baris punya satu korban meninggal atau lebih. Total 160 meninggal, dan 151
   di antaranya (94,4 persen) berasal dari satu hari, yaitu gempa Nusa Tenggara Timur 15 Agustus 2026. DIBI tidak
   punya kolom magnitudo, sehingga besaran gempa itu tidak dapat dibaca dari tarikan kami [BELUM TERVERIFIKASI].
   Sebagai pembanding, gempa Cianjur 21 November 2022 tercatat di DIBI dengan 602 meninggal dan 57.337 rumah
   rusak (tarikan 23 Oktober 2026; `data/kajian-bnpb/data/dibi/kejadian_besar.csv`).
2. **Mengapa ini paradoks.** Jawaban A: gempa besar bila magnitudonya besar, karena itu satu-satunya angka yang
   langsung tersedia dan dipahami publik. Jawaban B: gempa besar bila dampaknya besar, karena magnitudo yang sama
   menimbulkan korban sangat berbeda menurut kepadatan penduduk, kedalaman, dan mutu bangunan. Pertanyaan
   "skala berapa" salah bentuk bila besar-kecil bencana diukur dari dampak (RQ3).
3. **Jawaban aturan saat ini.** Tidak diatur. Juklak 7/2023 tidak punya skala. Panduan Lapjol Pusdalops (draf
   03/PO.02/07/2025) menetapkan gempa bumi "menonjol" bila ada dampak, tanpa magnitudo
   (`scripts/wa/panduan_resmi.json`).
4. **Jawaban praktik dunia.** USGS PAGER mengelompokkan menurut perkiraan korban dan kerugian: hijau 0 korban dan
   di bawah USD 1 juta; kuning 1 sampai 99 korban; oranye 100 sampai 999; merah 1.000 atau lebih, dengan tanggapan
   yang disarankan lokal, nasional, atau internasional (earthquake.usgs.gov/data/pager/background.php). GDACS
   menghitung dari penduduk yang terkena tiap tingkat Modified Mercalli Intensity (MMI) dan kerentanan negara;
   bila intensitas maksimum di wilayah berpenduduk tidak lebih dari MMI VI, hasilnya hijau (gdacs.org/Knowledge/models_eq.aspx).
5. **Opsi penyelesaian.**
   - *Opsi A, dua tahap: perkiraan dampak saat peringatan, dampak terukur saat klasifikasi.* Jumlah kejadian:
     tidak berubah. Tren: aman. Keadilan antardaerah: terjaga karena kepadatan masuk perhitungan. Insentif
     pelapor: tetap. Beban pencatat: nol, mesin mengambil perkiraan dari sumber luar.
   - *Opsi B, ambang magnitudo sebagai pemicu pemeriksaan, bukan kelas.* Jumlah kejadian: tidak berubah.
     Tren: stabil bila ambang pantau dipasang tetap. Keadilan antardaerah: daerah jarang gempa lebih sering
     diperiksa. Insentif pelapor: tidak ada, karena pemicu berasal dari sensor. Beban pencatat: naik sedikit,
     ada daftar pantau yang diperiksa tiap gempa.
   - *Opsi C, salin warna PAGER apa adanya.* Jumlah kejadian: tidak berubah, hanya kelas yang diberi warna.
     Tren: ikut perubahan model PAGER. Keadilan antardaerah: bergantung kalibrasi PAGER untuk Indonesia yang
     belum diuji. Insentif pelapor: tidak ada. Beban pencatat: kecil, dan cepat diterapkan.
6. **Uji empiris.** Ketidakbergantungan dampak pada magnitudo tidak bisa diuji dengan DIBI karena tidak ada kolom
   magnitudo; data yang dibutuhkan adalah katalog gempa Badan Meteorologi, Klimatologi, dan Geofisika atau USGS
   yang dipasangkan dengan baris DIBI. Ketimpangan dampak per kejadian terlihat jelas: 47 dari 60 baris tanpa
   korban jiwa. Sumber: tambahan_EFG.py bagian P34.
7. **Rekomendasi sementara.** Jawaban resmi yang diusulkan: tidak ada magnitudo yang otomatis menjadikan gempa
   bencana besar; besar-kecil diukur dari dampak pada L3, dan magnitudo hanya memicu verifikasi cepat dengan
   perkiraan dampak (Opsi A dan B digabung).

---

### P-42 Naik kelas di tengah jalan

**Kelompok:** E. **Bergantung pada:** P-27, P-41, P-38. **Menentukan:** P-33, P-46.

1. **Kasus.** Dalam logbook Pusdalops 2026, 124 dari 975 kejadian yang akhirnya memenuhi ambang masuk (12,7 persen)
   tidak memenuhinya pada laporan pertama, artinya baru melewati ambang di laporan susulan; pemicu terbanyak K2
   (87 kejadian) (`riset/SIM-KRITERIA.md` bagian 4). Angka ini berbeda dari 137 dari 1.317 di butir 6, yang
   menghitung kelas terdampak percobaan pada kejadian multihari, bukan lolos ambang masuk.
   Pada percobaan kelas dengan tiga tingkat terdampak (di bawah 50, 50 sampai 999, 1.000 atau lebih), dari 3.860
   kejadian bertanggal 1 Januari sampai 31 Oktober 2026 (kunci V1), 177 kejadian berkelas tertinggi pada laporan
   pertama, 264 pada puncak, dan 249 pada laporan terakhir.
2. **Mengapa ini paradoks.** Jawaban A: kelas ditetapkan di awal, karena pimpinan perlu keputusan cepat dan kelas
   awal menentukan sumber daya yang dikirim. Jawaban B: kelas ditetapkan di akhir atau di puncak, karena hanya
   itu yang mencerminkan kejadian sebenarnya. Tiap pilihan memberi jumlah kejadian per kelas yang berbeda.
3. **Jawaban aturan saat ini.** Juklak 7/2023 hlm. 3 sampai 4 membedakan data dinamis (berubah selama tanggap
   darurat, disampaikan minimal sehari sekali) dan statis (tetap, disampaikan per periode). Petunjuk Pengisian
   (hlm. 21 sampai 24): meninggal memakai "nominal terakhir"; hilang, luka, terdampak, dan mengungsi menampilkan
   "nominal terbesar selama masa tanggap darurat" untuk data statis. Tidak ada kelas keparahan, sehingga tidak ada
   aturan kapan kelas ditetapkan (tabel itu terbaca berantakan dalam ekstraksi teks, perlu pengecekan visual).
4. **Jawaban praktik dunia.** PAGER menerbitkan ulang peringatan seiring perkiraan korban membaik (halaman latar
   PAGER: peringatan dahulu hanya berdasar magnitudo dan lokasi, kini berdasar perkiraan korban dan kerugian).
   Technical Guidance Kerangka Sendai menetapkan tenggat atribusi tetap, misalnya enam bulan setelah keadaan
   darurat berakhir untuk kekeringan dan empat minggu untuk gelombang panas, agar angka dapat ditutup.
5. **Opsi penyelesaian.**
   - *Opsi A, kelas awal dikunci.* Jumlah kejadian: per kelas tinggi di kelas rendah. Tren: stabil, tetapi
     mengabaikan 10,4 persen kejadian multihari yang naik kelas (definisi di butir 6). Keadilan antardaerah:
     buruk bagi kejadian yang membesar lambat. Insentif pelapor: pelapor tidak perlu melapor ulang. Beban
     pencatat: nol.
   - *Opsi B, kelas puncak.* Kelas tertinggi yang pernah dicapai. Jumlah kejadian: lebih banyak di kelas
     tinggi. Tren: terpapar kesalahan taksir awal; angka yang salah masuk lalu dikoreksi turun mengangkat kelas
     selamanya, dan 2,4 persen kejadian multihari turun dari puncak. Keadilan antardaerah: daerah yang melapor
     berlebihan di awal diuntungkan. Insentif pelapor: ada dorongan membesarkan angka sementara. Beban
     pencatat: kecil.
   - *Opsi C, kelas akhir pada saat kejadian ditutup.* Jumlah kejadian: per kelas mencerminkan hasil
     verifikasi, tetapi baru ada setelah kejadian selesai. Tren: paling stabil setelah dibekukan. Keadilan
     antardaerah: daerah yang lambat memverifikasi tampak tertinggal. Insentif pelapor: mendorong penutupan
     tepat waktu. Beban pencatat: naik pada penutupan.
   - *Opsi D, dua kolom: kelas sementara (diperbarui) dan kelas final (dibekukan saat ditutup) beserta tanggal
     penetapan.* Jumlah kejadian: tersedia dua versi, sementara dan final. Tren: dibaca dari kelas final.
     Keadilan antardaerah: terjaga karena kelas final menunggu verifikasi tiap daerah. Insentif pelapor:
     netral, karena kelas sementara tidak menjadi angka akhir. Beban pencatat: kecil, karena kelas dihitung
     mesin.
6. **Uji empiris.** Logbook DOCX, 3.860 kejadian, 1.317 di antaranya dilaporkan lebih dari satu hari: kelas
   terdampak (tiga tingkat percobaan di butir 1) naik setelah laporan pertama pada 137 kejadian (10,4 persen dari
   yang multihari; ukuran ini bukan 124 dari 975 di butir 1, yang menghitung baru lolos ambang masuk) dan turun dari
   puncak pada 32 (2,4 persen). Kelas meninggal (nol, 1 sampai 9, 10 atau lebih) naik pada 38 (2,9 persen). Hari
   dari laporan pertama sampai kelas puncak: median 2, persentil 90 sebesar 22, paling lama 121. Catatan: angka
   dari penguraian teks bebas, dan kelas contoh hanya untuk menguji kepekaan. Sumber: tambahan_EFG.py bagian P42.
7. **Rekomendasi sementara.** Opsi D, mengikuti versi angka yang sah dalam Q-07 [BAWAAN SEMENTARA]. Selama tanggap darurat kelas sementara boleh naik; kelas akhir ditetapkan saat rilis statis (Bab 6.4.2 butir 5).

---

### P-65 Respons sebagai ukuran

**Kelompok:** E. **Bergantung pada:** P-15, P-33, P-34. **Menentukan:** rancangan L3 (Bab 6.4).

1. **Kasus.** Bencana sering disebut besar karena pemerintah menetapkan status darurat, menyalurkan dana siap
   pakai, atau mengirim bantuan nasional. Di logbook Pusdalops tiga tahun terakhir, kolom status keadaan darurat
   hanya terisi pada 25,7 persen kejadian (`data/kajian-bnpb/juklak/DATA-DAMPAK.md`). Di sisi lain, Peraturan
   Badan 4/2020 Pasal 2 ayat (1) membuka jalur dana siap pakai tanpa status darurat daerah, yaitu atas
   pertimbangan risiko bencana berdampak luas yang ditetapkan Kepala BNPB.
2. **Mengapa ini paradoks.** Jawaban A: respons mencerminkan besar bencana, sebab keputusan pemerintah diambil
   setelah menilai dampak (UU 24/2007 Pasal 51: status "sesuai dengan skala bencana"). Jawaban B: respons
   mencerminkan kapasitas, kemauan, dan kepentingan, sehingga dua bencana berdampak sama bisa diberi respons
   berbeda dan respons menjadi ukuran yang melingkar (P-15).
3. **Jawaban aturan saat ini.** K5 (permintaan bantuan nasional) dan K6 (status keadaan darurat) adalah ambang
   masuk Juklak 7/2023. Perpres 17/2018 mengatur Keadaan Tertentu tanpa status. Peraturan presiden yang
   merinci tingkatan bencana (UU 24/2007 Pasal 7 ayat 3) tidak ditemukan. Tidak ada skala "besar".
4. **Jawaban praktik dunia.** PAGER memperlakukan respons sebagai keluaran dari perkiraan dampak (lokal,
   nasional, internasional), bukan masukan. EM-DAT memakai deklarasi darurat atau seruan bantuan internasional
   sebagai salah satu kriteria masuk, bukan skala. Amerika Serikat: deklarasi bergantung permintaan gubernur dan
   diskresi Presiden dengan indikator per kapita. India: diskresioner. Filipina: kondisi terukur selama sedikitnya
   empat hari (`riset/PUSTAKA.md`).
5. **Opsi penyelesaian.**
   - *Opsi A, respons hanya penanda yang menempel pada kejadian, tidak masuk skor.* Jumlah kejadian: tidak
     bergantung respons. Tren: bersih. Keadilan antardaerah: baik, daerah tidak dihukum karena tidak menetapkan
     status. Insentif pelapor: tidak ada alasan menaikkan angka demi status. Beban pencatat: kecil (nomor
     dokumen).
   - *Opsi B, respons sebagai salah satu masukan skor.* Jumlah kejadian: tidak berubah, tetapi kelas berubah
     menurut respons. Tren: ikut kebijakan daerah, bukan bahaya. Keadilan antardaerah: buruk, melingkar dan
     menghukum daerah yang tidak menetapkan status. Insentif pelapor: buruk, menetapkan status menaikkan skor.
     Beban pencatat: kecil, dan pimpinan mudah memahaminya.
   - *Opsi C, respons sebagai uji silang: bandingkan kelas dampak dengan tingkat respons dan tampilkan
     kesenjangan.* Jumlah kejadian: tidak berubah. Tren: bersih. Keadilan antardaerah: memperlihatkan daerah
     yang berdampak besar tetapi minim respons. Insentif pelapor: kecil. Beban pencatat: sedang, butuh data
     daftar status dan dana siap pakai per kejadian.
6. **Uji empiris.** Belum ada data. Data yang dibutuhkan: daftar surat keputusan status darurat dan keputusan
   dana siap pakai per kejadian dengan tanggalnya, dari Direktorat terkait di BNPB. Satu-satunya angka yang ada
   adalah 25,7 persen terisinya kolom status di logbook (sumber di atas).
7. **Rekomendasi sementara.** Opsi A, dengan Opsi C sebagai analisis tambahan; lihat Q-35 [BAWAAN
   SEMENTARA: respons tidak dipakai sebagai ukuran besar-kecil].

---

## Usulan pertanyaan terbuka

- **Q-34.** Apa pembanding relatif untuk skala keparahan: jumlah penduduk kabupaten saja, anggaran daerah,
  atau gabungan? [BAWAAN SEMENTARA] jumlah penduduk (angka BPS bila tersedia); kelas absolut dengan penaik relatif 10 persen
  penduduk berlantai 100 dan 1.000 orang, paling tinggi Besar, dan angka mutlak tetap berdampingan.
- **Q-35.** Bolehkah kita meminta daftar keputusan status darurat dan dana siap pakai per kejadian dari
  BNPB untuk menguji respons terhadap dampak? [BAWAAN SEMENTARA] belum diminta; respons hanya penanda.
- **Q-36.** Apakah ambang ekstensif dan intensif GAR 2015 (30 meninggal atau 600 rumah hancur) cukup untuk
  Indonesia, atau dikalibrasi sendiri? [BAWAAN SEMENTARA] dipakai apa adanya sebagai label analisis, bukan kelas resmi.

## Daftar periksa

1. Magnitudo gempa Nusa Tenggara Timur 15 Agustus 2026: tidak ada di berkas bahan [BELUM TERVERIFIKASI].
   Korban gempa Cianjur 2022 (602 meninggal, 57.337 rumah rusak) ada di `kejadian_besar.csv`, bersumber DIBI.
2. Bunyi GAR 2015 memakai "or" pada ambang intensif; tafsir "salah satu terpenuhi" adalah tafsir kami. Ambang
   GAR 2011 dan 2013 [BELUM TERVERIFIKASI] (`riset/PUSTAKA.md`).
3. Rumah rusak berat dipakai sebagai proxy "rumah hancur" GAR; padanan resmi belum dikonfirmasi.
4. Penduduk kabupaten dari WorldPop 2026 (unduhan repo), bukan BPS; pencocokan lewat nama kabupaten.
5. Angka USD 2,01 dan 5,03 berasal dari dokumen public inspection Federal Register [BELUM TERVERIFIKASI] terhadap
   edisi cetak (`riset/PUSTAKA.md` butir 14).
6. Peraturan presiden penetapan status dan tingkat bencana (UU 24/2007 Pasal 7 ayat 3) tidak ditemukan.
7. Tabel Petunjuk Pengisian Juklak hlm. 21 sampai 24 perlu dicek visual sebelum dikutip sebagai tabel.
8. Angka logbook dari penguraian teks bebas dengan ekspresi reguler; hanya untuk uji kepekaan.
