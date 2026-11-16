# Prompt Kajian Penghitungan dan Klasifikasi Kejadian Bencana

Disusun 12 November 2026. Tempel seluruh isi blok di bawah ke sesi baru (Opus) di repo ini.
Kajian dijalankan bertahap; sesi berhenti di tiap titik henti untuk dibaca pemilik.

```text
=====================================================================
0. PERAN
=====================================================================
Kamu peneliti kebijakan kebencanaan, statistik bencana, dan tata kelola data. Kamu menulis
kajian akademis untuk BNPB dengan standar jurnal (struktur IMRaD), bahasa Indonesia baku
EYD V, kalimat lengkap dan lugas. Pembacanya pimpinan BNPB, Pusdatinkom, Pusdalops, dan
penyusun peraturan. Mereka bukan statistikawan.

=====================================================================
1. LATAR DAN MASALAH
=====================================================================
BNPB mencatat kejadian bencana di DIBI dengan dasar Perban BNPB No. 1 Tahun 2023 tentang
Satu Data Bencana (ditetapkan 4 Januari 2023) dan Juklak No. 7 Tahun 2023 tentang Standar
Kejadian dan Dampak Bencana (ditetapkan 29 Desember 2023). Juklak ini memakai 6 kriteria
ambang batas kejadian bencana. Kejadian tercatat bila penyebabnya salah satu jenis bencana
dan memenuhi SEDIKITNYA SATU kriteria:
  (1) 1 orang meninggal dunia;
  (2) 50 orang terdampak, luka, atau mengungsi;
  (3) 5 unit rumah dan/atau fasilitas publik rusak; rinciannya rumah, satuan pendidikan,
      rumah ibadah, fasilitas pelayanan kesehatan, kantor, jembatan;
  (4) 1 hektare lahan; rinciannya sawah, kebun, hutan, lahan, kolam;
  (5) permintaan pemerintah daerah untuk diberikan bantuan nasional;
  (6) penentuan status keadaan darurat bencana.

Masalahnya: belum ada kerangka utuh tentang cara bencana DIHITUNG (apa itu satu kejadian),
DIKLASIFIKASIKAN (kapan masuk hitungan, seberapa besar), DIUKUR DAMPAKNYA (korban,
kerusakan, kerugian, rupiah), dan DISAJIKAN. Di lapangan, kekosongan ini muncul sebagai
paradoks: kasus yang jawabannya berbeda tergantung siapa yang menghitung dan aturan apa
yang dipakai. Contoh: karhutla 10 ha dan 20 ha berjarak 1 km yang beberapa jam kemudian
menyatu menjadi satu api. Apakah itu 1 atau 2 kejadian, dan berapa luasnya?

Penyusun merasa kewalahan, bahkan dalam merumuskan apa yang membingungkan. Karena itu
tugas pertama kajian ini adalah MENGURAI kebingungan menjadi pertanyaan yang terpisah dan
bisa dijawab, baru kemudian menjawabnya.

=====================================================================
2. TUJUAN
=====================================================================
T1 Mengurai persoalan penghitungan bencana menjadi pertanyaan terpisah yang bisa dijawab.
T2 Menyusun katalog paradoks penghitungan bencana dan menjawab tiap paradoks.
T3 Menilai 6 kriteria Juklak 7/2023 dengan data, bukan hanya pendapat.
T4 Merancang kerangka tiga lapis: unit kejadian, ambang masuk, skala keparahan. Dilengkapi
   aturan pengukuran dampak dan kerugian serta aturan penyajian.
T5 Membuktikan bahwa kerangka itu konsisten, yaitu menjawab seluruh katalog paradoks tanpa
   logika yang saling bertentangan.
T6 Menghasilkan usulan revisi Juklak 7/2023 pasal per pasal dan langkah penerapannya di
   DIBI dan Satu Data Bencana.

=====================================================================
3. PERTANYAAN PENELITIAN
=====================================================================
RQ1 Unit kejadian. Apa definisi "satu kejadian bencana"? Bahas batas ruang dan waktu,
    aturan penggabungan dan pemecahan, kejadian berantai, kejadian majemuk, kejadian lintas
    wilayah administrasi, bencana lambat, dan identitas kejadian (kode induk dan anak,
    mis. GLIDE).
RQ2 Ambang masuk. Seberapa layak 6 kriteria Juklak 7/2023? Bahas asal-usul, kalibrasi
    angka, logika ATAU, kecocokan per jenis bencana, kriteria administratif yang melingkar,
    kekaburan definisi, dan urutan penerapan terhadap penggabungan kejadian.
RQ3 Apa yang diukur. Pisahkan bahaya (magnitudo, luas, debit, tinggi muka air),
    intensitas (MMI dan sejenisnya), paparan, dampak (korban, kerusakan), kerugian
    ekonomi, dan respons (status, permintaan bantuan). Jelaskan mengapa magnitudo bahaya
    bukan ukuran besar-kecilnya bencana.
RQ4 Dampak dan kerugian. Definisi operasional meninggal, hilang, luka, mengungsi,
    terdampak; tingkat kerusakan rumah dan fasilitas; kerusakan lawan kerugian (DaLA, PDNA,
    Jitupasna); indikator Sendai A sampai D; cara menguangkan kerugian beserta
    ketidakpastiannya; penghindaran hitung ganda.
RQ5 Skala keparahan. Apa definisi bencana ringan, sedang, besar, dan katastrofik?
    Bandingkan (a) ambang absolut, (b) relatif terhadap kapasitas daerah (penduduk, APBD),
    (c) dikaitkan dengan tingkat status darurat kabupaten/kota, provinsi, dan nasional
    (UU 24/2007 Pasal 7 ayat 2 dan turunannya), dan (d) indeks gabungan. Bahas skala khusus
    per jenis bahaya: gempa (USGS PAGER, MMI), banjir (periode ulang), karhutla (luas,
    durasi, gambut), letusan (VEI, status gunung api), kekeringan (indeks kekeringan),
    serta GDACS alert level. Jawab langsung: "gempa skala berapa itu bencana besar?"
RQ6 Penyajian. Bagaimana menyajikan jumlah kejadian dan dampak tanpa menyesatkan? Bahas
    bias tren akibat perbaikan pelaporan, distribusi ekor panjang, per kapita, angka
    antarsumber yang tidak boleh dijumlah, versi angka, ketidakpastian, dan contoh tabel
    serta grafik yang dianjurkan dan yang dilarang.
RQ7 Penerapan. Apa yang harus berubah di DIBI, logbook Pusdalops, laporan harian, dan
    Satu Data Bencana (formulir, kode kejadian, aturan gabung, versi angka, peran
    pencatat) agar kerangka bisa dijalankan? Berapa beban kerja tambahannya?

=====================================================================
4. PENDEKATAN: KAJIAN BERANGKAT DARI PARADOKS
=====================================================================
Kajian ini punya dua sisi yang saling mengunci:
 (a) Sisi paradoks (induktif). Kumpulkan, bedah, dan kelompokkan paradoks penghitungan
     bencana. Paradoks adalah data primer kajian.
 (b) Sisi kerangka (deduktif). Rancang definisi dan klasifikasi dari regulasi, teori, dan
     praktik internasional.
Kerangka dianggap sah hanya bila lolos uji terhadap SELURUH katalog paradoks. Paradoks
berfungsi sebagai kasus uji kerangka, seperti uji unit pada perangkat lunak.

Pegangan teori: bencana = bahaya x paparan x kerentanan / kapasitas. Besar-kecil bencana
diukur dari dampak relatif terhadap kapasitas, kecuali kajian menemukan alasan kuat lain.
Pegangan ini juga harus diuji, bukan diterima begitu saja.

=====================================================================
5. LANGKAH KERJA
=====================================================================
LANGKAH 1. Bedah khusus 6 kriteria Juklak 7/2023
 1. Asal-usul. Apakah meniru EM-DAT (>=10 meninggal, >=100 terdampak, status darurat,
    permintaan bantuan internasional)? Mengapa angkanya jauh lebih rendah? Cari naskah
    akademik atau notulen penyusunannya; bila tidak ada, tulis "tidak ditemukan".
 2. Kalibrasi tiap angka (1 orang, 50 orang, 5 unit, 1 ha). Uji dengan data: berapa persen
    kejadian lolos hanya karena satu kriteria, dan kriteria mana yang paling sering
    menjadi satu-satunya penentu. Berapa kejadian yang akan hilang atau bertambah bila
    tiap angka diubah.
 3. Logika ATAU: 1 meninggal setara dengan 1 ha lahan. Uji konsekuensinya.
 4. Kecocokan per jenis bencana: karhutla (1 ha), banjir (50 terdampak hampir selalu
    tercapai), kekeringan, kabut asap, abrasi.
 5. Kriteria 5 dan 6 yang bersifat administratif, melingkar, dan bergantung pada
    kapasitas serta kemauan pemda.
 6. Kekaburan definisi: "terdampak", tingkat kerusakan rumah, jembatan yang disamakan
    dengan rumah, jenis lahan, sumber angka luas.
 7. Urutan penerapan: ambang diterapkan sebelum atau sesudah kejadian digabung.
 8. Fungsi: tegaskan bahwa kriteria ini hanya ambang masuk (L2), bukan unit kejadian (L1)
    dan bukan skala keparahan (L3).
 Vonis akhir per kriteria: pertahankan, revisi, atau ganti. Rujuk silang ke paradoks P-xx.

LANGKAH 2. Katalog paradoks
Mulai dari daftar awal di bagian 6, lalu PERLUAS dari:
 - pustaka (EM-DAT, DesInventar, GAR UNDRR, makalah tentang definisi kejadian, bias
   pencatatan, dan statistik bencana);
 - data nyata: cari anomali di logbook Pusdalops, DIBI, laporan harian, dan kluster
   karhutla harian (kejadian yang menyatu, terpecah, muncul lagi, lintas batas, angka
   yang berubah setelah verifikasi, kejadian yang ditulis ulang tiap hari);
 - daftar pertanyaan wawancara untuk Pusdalops BNPB dan BPBD. Susun daftarnya saja,
   jangan mengarang jawabannya.
Target paling sedikit 50 paradoks, masing-masing berkode P-01 dan seterusnya dan masuk
satu kelompok (A sampai G).

LANGKAH 3. Bedah tiap paradoks (format seragam)
 1. Kasus: cerita konkret, diutamakan kejadian nyata Indonesia dengan sumber.
 2. Mengapa ini paradoks: dua jawaban yang sama-sama masuk akal tetapi bertentangan.
 3. Jawaban aturan saat ini: Juklak 7/2023, Perban 1/2023, UU 24/2007, dan praktik
    pencatatan yang berjalan. Tulis "tidak diatur" bila memang tidak diatur.
 4. Jawaban praktik dunia: EM-DAT, DesInventar, GLIDE, PAGER, GDACS, negara lain.
 5. Opsi penyelesaian: paling sedikit 2, masing-masing dengan konsekuensi terhadap jumlah
    kejadian, tren, keadilan antardaerah, insentif pelapor, dan beban kerja pencatat.
 6. Uji empiris bila datanya ada: simulasikan tiap opsi dan tulis perubahan angkanya.
 7. Rekomendasi, atau pertanyaan terbuka untuk pemilik dengan bawaan sementara yang
    ditandai.
Lalu buat peta ketergantungan antarparadoks. Contoh: jawaban P-01 menentukan P-13 dan
P-14. Paradoks yang menjadi akar banyak paradoks lain ditandai sebagai paradoks inti.

LANGKAH 4. Kerangka
 L1 Unit kejadian: aturan identitas, penggabungan dan pemecahan (jarak, jendela waktu,
    per jenis bahaya), rantai dan majemuk (induk-anak), batas waktu mulai dan selesai,
    bencana lambat, atribusi korban ke bahaya.
 L2 Ambang masuk: revisi 6 kriteria pasal per pasal.
 L3 Skala keparahan: pilihan terbaik dari empat opsi RQ5, dengan matriks per jenis bencana.
 Ditambah:
 D  Aturan dampak dan kerugian: definisi operasional, tingkat kerusakan, kerusakan lawan
    kerugian, penghindaran hitung ganda, versi angka.
 S  Aturan penyajian: jumlah lawan dampak, per kapita, koreksi pelaporan, angka
    antarsumber tidak dijumlah, ketidakpastian, tabel dan grafik baku.
 Setiap lapisan disertai pohon keputusan yang bisa dipakai operator Pusdalops tanpa
 pelatihan statistik.

LANGKAH 5. Uji kerangka
 1. Matriks paradoks x lapisan dengan status TERJAWAB, SEBAGIAN, GAGAL. Setiap GAGAL
    diperbaiki atau diakui sebagai keterbatasan.
 2. Uji konsistensi: tidak boleh ada dua paradoks yang dijawab dengan logika saling
    bertentangan.
 3. Uji ulang data: terapkan kerangka pada data 2024 sampai 2026 dan bandingkan dengan
    angka resmi (jumlah kejadian, sebaran keparahan, tren).
 4. Uji adversarial: subagent baru tanpa riwayat penulisan mencoba mematahkan kerangka
    dengan paradoks baru. Temuan yang lolos dimasukkan ke katalog.

LANGKAH 6. Rekomendasi
 Usulan revisi Juklak 7/2023 pasal per pasal (bunyi lama, bunyi usulan, alasan, paradoks
 yang dijawab), perubahan formulir dan DIBI, tahapan penerapan, dan agenda riset lanjutan.

=====================================================================
6. KATALOG PARADOKS AWAL
=====================================================================
A. Identitas kejadian (apa itu "satu" kejadian)
 P-01 Menyatu: karhutla 10 ha dan 20 ha berjarak 1 km menyatu beberapa jam kemudian.
      Dihitung 1 atau 2? Luasnya 30 ha, atau luas akhir setelah menyatu?
 P-02 Terpecah: satu api terbelah sungai atau hujan menjadi 3 kantong.
 P-03 Api berpindah (kapal Theseus): api merambat 30 km dalam 2 minggu dan lokasi awalnya
      sudah padam. Apakah masih kejadian yang sama?
 P-04 Menyala lagi: gambut padam di permukaan, lalu menyala lagi 5 hari kemudian di titik
      yang sama.
 P-05 Lintas batas: banjir satu DAS di 3 kabupaten. 1 kejadian nasional, atau 3 kejadian
      kabupaten?
 P-06 Berulang: banjir surut 2 hari lalu naik lagi.
 P-07 Berantai: gempa memicu tsunami lalu likuifaksi (Palu 2018). 1 atau 3 kejadian?
      Korban dicatat ke bahaya mana?
 P-08 Susulan: ratusan gempa susulan, dan salah satunya merusak lagi.
 P-09 Majemuk: banjir dan longsor di hari yang sama. Banjir bandang masuk banjir atau
      longsor?
 P-10 Lambat: kekeringan dan kabut asap tanpa tanggal mulai dan selesai yang jelas.
 P-11 Lintas tahun: kejadian yang melewati 31 Desember dihitung di tahun mana?
 P-12 Titik lawan wilayah: kejadian berbentuk poligon dicatat sebagai satu titik koordinat.
 P-38 Tulis ulang harian: logbook Pusdalops menulis kejadian yang sama tiap hari dengan
      "Update". Kunci penghapus duplikat (jenis, provinsi, kabupaten, tanggal kejadian)
      menentukan jumlah kejadian. Kunci lain menghasilkan angka lain.
 P-39 Tanggal kejadian lawan tanggal laporan: kejadian yang baru dilaporkan 3 hari
      kemudian masuk hari, bulan, atau tahun yang mana?
B. Ambang masuk
 P-13 Sorites: api 0,9 ha bukan bencana, 1,0 ha bencana. Sepuluh api 0,9 ha yang
      berdekatan?
 P-14 Iris salami: satu kejadian dipecah per desa sehingga sebagian tidak lolos ambang,
      atau sebaliknya dipecah supaya jumlahnya banyak.
 P-15 Melingkar: kriteria 5 dan 6 membuat sesuatu menjadi bencana karena dinyatakan
      bencana. Daerah yang tidak menetapkan status dirugikan.
 P-16 Insentif (hukum Goodhart): angka terdampak membengkak demi bantuan.
 P-17 Normalisasi: 50 orang di kota padat setara dengan 50 orang di desa berpenduduk
      200 jiwa.
 P-18 Bahaya tanpa bencana: 1.000 ha hutan terbakar tanpa penghuni, atau gempa M7 di laut
      tanpa korban.
 P-19 Bencana tanpa bahaya ekstrem: hujan biasa, tetapi drainase buruk menimbulkan korban.
 P-20 Kriteria 4 mencampur jenis lahan: 1 ha kolam, sawah tergenang, sawah puso, dan hutan
      diperlakukan sama.
 P-40 Satelit lawan laporan: satelit melihat ratusan ribu hotspot, tetapi provinsi dengan
      hotspot terbanyak hampir tidak melaporkan kejadian karhutla. Kejadian yang tidak
      dilaporkan itu ada atau tidak?
C. Ukuran dan korban
 P-21 Magnitudo lawan dampak: gempa M5,6 Cianjur 2022 menelan ratusan korban jiwa,
      sedangkan banyak gempa M7+ tanpa korban.
 P-22 Skala yang dipakai: SR, Mw, atau MMI. Laporan sering mencampurnya.
 P-23 Kematian langsung lawan tak langsung: ISPA akibat asap, penyakit pascabanjir,
      meninggal di pengungsian.
 P-24 Hilang: kapan orang hilang dihitung sebagai meninggal?
 P-25 Hitung ganda: satu orang tercatat mengungsi, terdampak, dan luka sekaligus.
 P-26 Tingkat kerusakan: 1 rumah rusak berat lawan 5 rumah rusak ringan; jembatan dihitung
      sama dengan rumah.
 P-27 Angka bergerak: korban bertambah setelah verifikasi, sehingga kejadian naik kelas.
      Angka versi kapan yang sah?
 P-41 Angka kumulatif: logbook menulis angka kumulatif. Menjumlah lintas hari menggelembungkan
      dampak, mengambil nilai terbesar bisa meleset bila angka dikoreksi turun.
D. Kerugian dan uang
 P-28 Bias kekayaan: kerugian rupiah lebih besar di daerah kaya, sehingga bencana di daerah
      miskin tampak kecil.
 P-29 Kerusakan lawan kerugian: aset hancur berbeda dengan pendapatan yang hilang
      (DaLA, PDNA, Jitupasna).
 P-30 Inflasi: membandingkan rupiah lintas tahun.
 P-31 Banyak penghitung: pemda, BNPB, BPS, asuransi, dan kementerian menghasilkan angka
      berbeda untuk kejadian yang sama.
E. Klasifikasi besar, sedang, kecil
 P-32 Kecil-kecil jadi bukit (risiko ekstensif lawan intensif): ribuan kejadian kecil bisa
      lebih merugikan daripada satu bencana besar.
 P-33 Besar menurut siapa: kabupaten yang mampu menangani menyebutnya kecil; kabupaten
      yang lemah menyebutnya besar.
 P-34 "Gempa skala berapa itu besar?": pertanyaan ini salah bentuk bila besar-kecil
      bencana diukur dari dampak.
 P-42 Naik kelas di tengah jalan: kejadian ringan berkembang menjadi besar. Kelasnya
      ditetapkan di awal, di puncak, atau di akhir?
F. Penyajian
 P-35 Tren semu: jumlah kejadian naik karena pelaporan membaik, bukan karena bahaya
      meningkat.
 P-36 Paradoks Simpson: tren per provinsi turun, tetapi tren nasional naik (atau
      sebaliknya).
 P-37 Ekor panjang: 90% dampak berasal dari 1% kejadian, sehingga "jumlah kejadian"
      menyesatkan.
 P-43 Hotspot lawan lokasi unik: hotspot dihitung per deteksi atau per lokasi unik per
      hari menghasilkan angka berbeda dari sistem lain (mis. SiPongi) untuk hari yang sama.
 P-44 Pergantian alat ukur: satelit yang pensiun mengubah jumlah hotspot tanpa perubahan
      api di lapangan.
G. Kelembagaan dan tata kelola
 P-45 Siapa yang berwenang menyatakan "satu kejadian": BPBD, Pusdalops, atau sistem?
 P-46 Koreksi setelah terbit: angka yang sudah dilaporkan ke Presiden kemudian dikoreksi.
 P-47 Bencana nonalam dan sosial (epidemi, konflik, kegagalan teknologi): apakah ambang
      dan skala yang sama berlaku?

=====================================================================
7. METODE DAN SUMBER
=====================================================================
Regulasi Indonesia (kutip pasal, buka teks aslinya; korpus JDIH lokal ada di
data/raw/hukum dan data/hukum):
 UU 24/2007, PP 21/2008, Perpres 39/2019 (Satu Data Indonesia), Perban BNPB 1/2023,
 Juklak 7/2023, aturan Jitupasna, aturan status keadaan darurat dan penetapan tingkat
 bencana.
Pustaka internasional dan akademik:
 EM-DAT/CRED, UNDRR (Kerangka Sendai beserta indikatornya, GAR), DesInventar, GLIDE,
 USGS PAGER, GDACS, IRDR DATA Peril Classification and Hazard Glossary, PDNA (Bank Dunia,
 UE, PBB), serta makalah tentang definisi kejadian, ambang pencatatan, dan bias pelaporan.
 Bandingkan paling sedikit 5 negara (mis. Filipina NDRRMC, Jepang, AS FEMA, India,
 Australia).
Data repo (tulis angka hanya dari data nyata):
 - data/kajian-bnpb/juklak/ (KEPUTUSAN-JUKLAK, RISET, DATA-DAMPAK, ALGORITMA);
 - logbook harian Pusdalops dan pengurainya
   data/laporan-bnpb/bulanan/2026-10/logbook_okt.py (perhatikan aturan kunci kejadian dan
   nilai terbesar lintas hari di docstring-nya, itu sendiri objek kajian);
 - arsip DIBI, laporan harian BNPB, dan kluster karhutla harian di repo.
Simulasi wajib:
 - aturan gabung karhutla: jarak 0,5/1/2 km x jendela 6/24/72 jam;
 - ambang luas: 1/10/50/100 ha;
 - kunci penghapus duplikat logbook: paling sedikit 3 varian;
 - skala keparahan: terapkan tiap opsi RQ5 ke data 2024 sampai 2026.
 Laporkan dampak tiap aturan pada jumlah kejadian, sebaran keparahan, dan tren.
Wawancara: susun daftar pertanyaan untuk Pusdalops BNPB, BPBD (paling sedikit
 3 provinsi berbeda tipe bencana), dan Pusdatinkom. Jangan mengarang jawaban.

=====================================================================
8. TAHAPAN DAN TITIK HENTI
=====================================================================
Fase 1  Bedah Juklak (Langkah 1) dan katalog paradoks lengkap (Langkah 2 dan 3).
        BERHENTI. Pemilik membaca dan menambah paradoks dari pengalamannya.
Fase 2  Kerangka (Langkah 4) dan uji (Langkah 5).
        BERHENTI. Pemilik menjawab pertanyaan terbuka.
Fase 3  Rekomendasi (Langkah 6), naskah lengkap, dan pembangunan dokumen.
Gunakan subagent untuk riset paralel (regulasi, pustaka internasional, data). Pemeriksa
naskah wajib subagent baru tanpa riwayat penulisan.

=====================================================================
9. STRUKTUR DOKUMEN
=====================================================================
Judul: Kajian Penghitungan dan Klasifikasi Kejadian Bencana
Anak judul: Satu kejadian, ambang masuk, dan skala keparahan untuk Satu Data Bencana

 Sampul
 Daftar Isi
 Kotak "Tentang kajian ini": tujuan, sumber data, periode data, batas kajian
 Ringkasan Eksekutif
  - satu kalimat temuan dalam kotak berwarna
  - kartu 4 angka kunci
  - Temuan utama (kotak temuan 2 kolom, 4 sampai 6 temuan)
  - Keputusan yang dimohon (2 sampai 3 keputusan beserta akibat tiap pilihan)
 BAB 1 Pendahuluan: latar, masalah, tujuan, pertanyaan penelitian, manfaat, batas kajian
 BAB 2 Kerangka Konsep dan Tinjauan Pustaka: bahaya, paparan, kerentanan, kapasitas;
       praktik internasional; posisi Indonesia
 BAB 3 Metode: pendekatan dua sisi, sumber data, simulasi, uji kerangka, keterbatasan data
 BAB 4 Bedah Kriteria Ambang Batas Juklak 7/2023
 BAB 5 Paradoks Penghitungan Bencana: satu subbab per kelompok A sampai G; paradoks inti
       dibedah penuh di badan, sisanya ringkas dengan rujukan ke lampiran
 BAB 6 Kerangka Tiga Lapis: L1, L2, L3, D, S, masing-masing dengan pohon keputusan
 BAB 7 Uji Kerangka: matriks, uji konsistensi, uji ulang data, uji adversarial
 BAB 8 Penyajian Data Bencana: aturan, contoh tabel dan grafik baku, contoh yang dilarang
 BAB 9 Rekomendasi dan Usulan Revisi Juklak: tabel pasal per pasal, perubahan DIBI dan
       formulir, tahapan penerapan, rencana aksi (sudah, sedang, akan)
 BAB 10 Keterbatasan dan Agenda Riset
 Penutup
 Daftar Pustaka
 Lampiran A Katalog paradoks lengkap (format Langkah 3)
 Lampiran B Matriks uji paradoks x kerangka
 Lampiran C Tabel perbandingan internasional
 Lampiran D Pohon keputusan untuk operator
 Lampiran E Daftar pertanyaan wawancara
 Lampiran F Glosarium
 Lampiran G Sumber data dan catatan metode

=====================================================================
10. FORMAT DAN DESAIN DOKUMEN
=====================================================================
Ikuti format dokumen contoh:
 data/laporan-bnpb/bulanan/2026-10/Laporan Bencana Oktober 2026 A4 (logbook).docx
Mesinnya ada di data/laporan-bnpb/bulanan/2026-10/a4/ dengan urutan
 laporan_a4.py -> laporan.html -> node tangkap.mjs (grafik dan peta jadi PNG) -> word.py,
dan cetak.mjs untuk PDF. Salin pola mesin itu ke data/kajian-bnpb/hitung-bencana/mesin/,
jangan membangun dari nol, dan jangan menyunting mesin laporan bulanan.

Yang ditiru dari contoh:
 - A4 tegak, isi rata kiri-kanan, Daftar Isi berupa bidang TOC Word;
 - sampul dengan foto, label jenis dokumen kecil di atas judul, judul besar, anak judul,
   "Disampaikan kepada", "Disusun oleh", tempat dan tanggal, logo BNPB dan logo KRIS;
 - kepala halaman dan kaki halaman seperti contoh;
 - judul bab berbentuk "BAB n" lalu nama bab; subbab bernomor (4.1, 4.2);
 - warna navy 051C2C, oranye D9600B, teks 1A1A1A, garis BFC5CC, latar kotak F1F3F6;
 - kartu angka (angka besar oranye dengan label pendek, 3 sampai 4 per baris);
 - kotak temuan 2 kolom, kotak catatan metode berlatar abu muda, kotak rencana aksi
   (sudah dilakukan, sedang berjalan, akan dilakukan);
 - keterangan "Tabel n." dan "Gambar n." di atas, "Sumber: ..." di bawah;
 - kepala tabel navy, huruf kapital, rata tengah, kepala berulang di halaman berikutnya;
 - lampiran sumber data dan catatan metode berbentuk butir.
Tambahan khusus kajian:
 - label sampul "KAJIAN BNPB";
 - pohon keputusan dan diagram digambar sebagai grafik, bukan teks;
 - tiap paradoks di Bab 5 memakai blok seragam: kode dan nama, kasus, mengapa paradoks,
   jawaban saat ini, opsi, rekomendasi;
 - "Disusun oleh: Tim Ahli dan Tim Sus IT BNPB". "Disampaikan kepada" ditanyakan ke
   pemilik sebelum dibangun.
Keluaran di data/kajian-bnpb/hitung-bencana/keluaran/:
 Kajian Penghitungan dan Klasifikasi Kejadian Bencana <ddmmyy>.docx dan .pdf.
Naskah sumber (Markdown) di data/kajian-bnpb/hitung-bencana/naskah/, satu berkas per bab.

=====================================================================
11. ATURAN BAHASA
=====================================================================
 - EYD V, kalimat lengkap, tanpa frasa menggantung. Singkatan ditulis panjang saat
   pertama muncul; istilah teknis dijelaskan dengan bahasa umum.
 - Lugas, tanpa gaya puitis atau kalimat kosong. Judul subbab berupa nama topik.
 - Jangan memisahkan teks dengan titik tengah; pakai koma, kalimat, atau baris baru.
 - BNPB dan BPBD ditulis sebagai "kita", bukan mitra.
 - Bila menyebut Kepala BNPB, tulis lengkap: Letnan Jenderal TNI Kristomei Sianturi,
   S.Sos., M.Si. (Han).
 - Ikuti data/kajian-bnpb/ANTI-SLOP.md.

=====================================================================
12. ATURAN KEJUJURAN
=====================================================================
 - Tidak mengarang angka, pasal, kejadian, kutipan, atau sitasi. Yang belum bisa
   diverifikasi ditandai [BELUM TERVERIFIKASI] dan masuk daftar periksa.
 - Kasus rekaan diberi tanda [ILUSTRASI].
 - Pertanyaan yang butuh keputusan pemilik ditulis sebagai pertanyaan terbuka (Q-01 dan
   seterusnya) dengan bawaan sementara yang ditandai, dan dikumpulkan di
   data/kajian-bnpb/hitung-bencana/KEPUTUSAN.md.
 - Angka antarsumber tidak dijumlah. Tiap angka menyebut sumber dan periodenya.
 - Data pribadi (nama korban, petugas, pelapor, nomor telepon) tidak pernah masuk naskah.

=====================================================================
13. KRITERIA SELESAI
=====================================================================
 [ ] Paling sedikit 50 paradoks, semuanya dibedah dengan format Langkah 3.
 [ ] Tiap kriteria Juklak mendapat vonis berbasis data.
 [ ] Semua simulasi di bagian 7 dijalankan dengan data nyata, angkanya tercantum.
 [ ] Matriks uji tanpa GAGAL yang tidak dijelaskan.
 [ ] Uji adversarial oleh subagent bersih sudah dijalankan dan hasilnya dimasukkan.
 [ ] Usulan revisi Juklak pasal per pasal lengkap.
 [ ] Tidak ada [BELUM TERVERIFIKASI] yang tersisa tanpa masuk daftar periksa.
 [ ] DOCX dan PDF terbangun, format sesuai dokumen contoh, daftar isi berfungsi.
 [ ] Pemeriksa bersih membaca DOCX akhir dan melaporkan nol temuan berat.
```
