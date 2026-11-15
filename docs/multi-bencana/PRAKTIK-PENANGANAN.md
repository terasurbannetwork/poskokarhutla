# Best practice penanganan per jenis bencana (riset untuk Centurisk97)

Disusun 15 November 2026. Riset, bukan kode. Tidak ada berkas repo yang disunting.

## 0. Cara membaca dan batas kepercayaan

Label sumber di tiap rujukan:

| Label | Arti |
| --- | --- |
| [korpus] | Judul dan nomor dibaca dari `data/hukum/peta_peraturan.json` (237 peraturan, kolom `berlaku`) di repo ini. Paling dapat dipercaya. |
| [repo] | Ada di dokumen atau kode repo (`data/kajian-bnpb/**`, `docs/multi-bencana/**`, `public/**`). |
| [web] | Dikonfirmasi dari hasil pencarian web sesi ini; isi pasal belum dibaca penuh. |
| [ingatan] | Dari pengetahuan umum penyusun, belum dicek ke naskah. Selalu bersama [perlu cek] bila nomor, pasal, atau angka ambang ikut disebut. |
| [perlu cek] | Nomor, tahun, pasal, atau angka yang ragu. Jangan dikutip ke dokumen resmi sebelum dicek ke JDIH atau penerbitnya. |

Tidak ada satu pun nomor peraturan di bawah yang dikarang. Yang tidak ditemukan ditulis "tidak ditemukan".

Kolom "Dukungan sistem" memakai dua tanda: **ada** (modul sudah tercatat di repo, nama modulnya disebut, kedalamannya per bencana tidak diperiksa baris demi baris) dan **usul** (belum ada, usulan fitur konkret).

Sudah ada di repo dan tidak diulang di sini: isi juklak meja kerja (`data/kajian-bnpb/juklak/RISET.md`: Juklak 9/2023, 3/2022, 5/2025, 16/2025, 17/2025), rujukan Jitupasna, R3P, renkon, gladi, Perka 7/2008 dan PAGER (`data/kajian-bnpb/siklus/riset/R3-PRAKTIK.md`), kolom data operasi udara (`data/kajian-bnpb/operasi-udara/RISET.md`), dan aturan pemicu peringatan dini (`docs/multi-bencana/PERINGATAN-DINI.md`). Dokumen ini menambah apa yang belum ada di sana: kerangka lintas bencana, praktik per fase untuk sembilan bencana, dan daftar celah fitur.

---

## 1. Kerangka lintas semua bencana

### 1.1 Dasar hukum umum

| Rujukan | Isi yang dipakai | Label |
| --- | --- | --- |
| UU 24/2007 Penanggulangan Bencana | Tiga tahap: prabencana (situasi tidak ada bencana, situasi ada potensi), saat tanggap darurat, pascabencana. Penetapan status keadaan darurat oleh Presiden (nasional), gubernur (provinsi), bupati atau wali kota (kabupaten atau kota). Kemudahan akses bagi BNPB atau BPBD saat status darurat (sumber daya manusia, peralatan, logistik, imigrasi, perizinan, pengadaan, pengelolaan uang dan barang, penyelamatan, komando). Pasal yang diingat: 33 (tahap), 44 sampai 47 (potensi bencana: kesiapsiagaan, peringatan dini, mitigasi), 48 (penanganan darurat), 50 sampai 51 (kemudahan akses, status). | [ingatan] pasal [perlu cek] |
| PP 21/2008 Penyelenggaraan Penanggulangan Bencana | Rincian tahap, status siaga darurat, tanggap darurat, transisi darurat ke pemulihan; rencana penanggulangan, kontingensi, operasi. | [ingatan] [perlu cek] pasal |
| PP 22/2008 Pendanaan dan Pengelolaan Bantuan Bencana; PP 23/2008 Peran Serta Lembaga Internasional dan Lembaga Asing Nonpemerintah | Dana siap pakai, bantuan internasional. | [ingatan] [perlu cek] |
| Perpres 17/2018 Penyelenggaraan Kedaruratan Bencana pada Kondisi Tertentu | Kedaruratan untuk kondisi tertentu (pengerahan cepat). | [ingatan] [perlu cek] |
| Perka BNPB 3/2016 Sistem Komando Penanganan Darurat Bencana | Komandan, staf komando (humas, keselamatan, penghubung), staf umum (operasi, perencanaan, logistik, administrasi dan keuangan), Pos Komando. | [korpus] berlaku |
| Juklak BNPB 10/2023 Sistem Komando Penanganan Darurat Bencana pada status keadaan darurat bencana kabupaten atau kota | Turunan Perka 3/2016 di tingkat kabupaten atau kota. | [korpus] berlaku |
| Perka BNPB 10/2008 Pedoman Komando Tanggap Darurat; Perka 14/2010 Pos Komando Tanggap Darurat | Dua-duanya berstatus tidak berlaku di korpus. Jangan dipakai sebagai rujukan. | [korpus] tidak berlaku |
| Perka BNPB 24/2010 Pedoman Penyusunan Rencana Operasi Darurat Bencana | Dasar renops. | [korpus] berlaku |
| Juklak BNPB 3/2022 Pengkajian Cepat pada Keadaan Darurat Bencana; Juklak 4/2023 Penilaian Awal; Juklak 6/2023 Penilaian Perkembangan Penanganan Darurat | Format kaji cepat siaga dan tanggap, penilaian awal, penilaian perkembangan. | [korpus] berlaku |
| Perka BNPB 13/2010 Pedoman Pencarian, Pertolongan dan Evakuasi; Juklak 6/2026 SPM Pencarian, Pertolongan dan Evakuasi Korban | SAR darurat bencana dan SPM-nya. | [korpus] berlaku |
| Perban BNPB 3/2018 Penanganan Pengungsi; Juklak 9/2023 Pengungsi Terpilah; Perka 7/2008 Kebutuhan Dasar; Juklak 3/2023 Hunian Sementara | Pengungsian dan kebutuhan dasar. | [korpus] berlaku |
| Perban BNPB 6/2022 Klaster Logistik; Juklak 16/2025; Juklak 2/2023 Klaster Logistik Daerah; Perka 10/2012 Bantuan Logistik pada Status Darurat; Perka 4/2009 Pedoman Bantuan Logistik | Logistik darurat. | [korpus] berlaku |
| Perban BNPB 2/2024 Sistem Peringatan Dini Bencana; Perban 4/2022 Pelaksanaan Peringatan Dini di BNPB; Juklak 4/2024 Bantuan Instrumen Peringatan Dini; Juklak 6/2024 Rambu, Papan Evakuasi, Papan Informasi | Peringatan dini dan sarananya. | [korpus] berlaku |
| Perban BNPB 2/2023 Rencana Kontingensi; Perban 9/2025 Penyusunan dan Uji Coba Rencana Penanggulangan Kedaruratan Bencana | Renkon dan uji. | [korpus] berlaku |
| Perka BNPB 15/2011 Pengkajian Kebutuhan Pascabencana (Jitupasna); Perban 5/2017 Penyusunan R3P; Perban 6/2017 Penyelenggaraan R3; Perban 4/2024 Hibah RR; Juklak 5/2024 Dana Siap Pakai Stimulan Rumah Rusak | Pascabencana. | [korpus] berlaku |
| Perka BNPB 14/2014 Penanganan, Perlindungan, dan Partisipasi Penyandang Disabilitas; Perban 2/2026 Pengarusutamaan Gender; Perka 17/2011 Relawan; Perka 8/2013 Media Centre Darurat; Perban 6/2018 Bantuan Internasional | Inklusi, relawan, informasi publik, bantuan asing. | [korpus] berlaku |
| PP 2/2018 Standar Pelayanan Minimal dan Permendagri 101/2018 SPM sub-urusan bencana (SPM bencana: informasi rawan bencana, kesiapsiagaan, pelayanan penyelamatan dan evakuasi) | Kewajiban minimum pemda; turunannya Juklak BNPB 4/2026 gladi dan Juklak 6/2026 SAR di atas. | [ingatan] [perlu cek] nomor |

### 1.2 Standar internasional (rujukan bernama)

| Standar | Penerbit, tahun | Dipakai untuk | Label |
| --- | --- | --- | --- |
| Sendai Framework for Disaster Risk Reduction 2015-2030 | UNDRR, 2015. Empat prioritas, tujuh target global. | Kerangka mitigasi, tata kelola risiko, indikator. | [ingatan] pasti ada |
| Sphere Handbook: Humanitarian Charter and Minimum Standards | Sphere Association, edisi 2018 (edisi lebih baru mungkin ada) [perlu cek]. | Air, sanitasi, hunian, pangan, kesehatan pengungsi. | [ingatan] |
| Core Humanitarian Standard | CHS Alliance, 2014. | Akuntabilitas ke penyintas. | [ingatan] |
| INSARAG Guidelines | UN OCHA, edisi 2020 [perlu cek]. Klasifikasi tim USAR ringan, sedang, berat; OSOCC, Reception Departure Centre. | SAR runtuhan gempa. | [ingatan] |
| Incident Command System dan NIMS | FEMA, NIMS edisi 2017 [perlu cek]. | Dasar SKPDB. | [ingatan] |
| IASC Cluster Approach dan MIRA (Multi-Cluster Initial Rapid Assessment) | IASC, 2005 dan 2012. | Klaster, kaji cepat bersama. | [ingatan] [perlu cek] tahun |
| Multi-Hazard Early Warning Systems: A Checklist | WMO, 2018. Empat pilar: pengetahuan risiko, deteksi dan prakiraan, penyebarluasan, kesiapsiagaan merespons. Inisiatif Early Warnings for All (PBB, 2022). | Peringatan dini semua bencana. | [ingatan] |
| Common Alerting Protocol v1.2 | OASIS. | Format pesan peringatan. | [ingatan] |
| Post-Disaster Needs Assessment (PDNA) Guidelines; Damage and Loss Assessment (DaLA) | UNDP, Bank Dunia, Uni Eropa; ECLAC. | Dasar Jitupasna. | [ingatan] |
| Emergency Medical Teams Classification and Minimum Standards (Blue Book) | WHO, 2021 [perlu cek]. | Tim medis asing dan nasional. | [ingatan] |
| SASOP (Standard Operating Procedure for Regional Standby Arrangements and Coordination of Joint Disaster Relief and Emergency Response Operations) dan AADMER | ASEAN. Pusat koordinasi AHA Centre. | Bantuan antarnegara ASEAN. | [ingatan] [perlu cek] tahun |

### 1.3 Dokumen lintas bencana dan isi minimumnya

| Dokumen | Kapan | Isi minimum | Dasar | Label |
| --- | --- | --- | --- | --- |
| Rencana Kontingensi (renkon) | Prabencana, untuk ancaman yang dikenal | Pengesahan dan masa berlaku (umum tiga tahun), ringkasan eksekutif maksimal dua halaman, situasi dan skenario, asumsi dampak (lima aspek: lingkungan, kependudukan, ekonomi, infrastruktur, layanan sipil), tujuan dan sasaran, konsep operasi dan struktur, sumber daya dan kesenjangan, pengendalian, jadwal uji dan pemutakhiran, lampiran (peta, evakuasi, komunikasi). | Perban 2/2023 | [korpus] [repo] |
| Rencana Operasi Darurat (renops) | Mulai siaga darurat atau tanggap darurat | Situasi, tujuan, strategi, struktur komando, pembagian tugas, jadwal, logistik, komunikasi. Format pastinya ikut lampiran Perka 24/2010. | Perka 24/2010 | [korpus] isi lampiran [perlu cek] |
| Rencana lapangan harian (renlap) | Tiap hari operasi | Target hari itu, tim dan alat, lokasi, jam, rute, keselamatan, komunikasi, kondisi cuaca. Istilah renlap dipakai di repo untuk operasi udara; bukan istilah baku peraturan. | Praktik | [repo] |
| Kaji cepat dan penilaian awal | 0 sampai 24 jam, diperbarui | Waktu dan lokasi kejadian, jenis dan penyebab, korban (meninggal, hilang, luka, terdampak, mengungsi), kerusakan rumah dan fasilitas vital, akses, kelompok rentan, kebutuhan mendesak, kapasitas lokal, rekomendasi status. | Juklak 3/2022, 4/2023 | [korpus] [repo] |
| Situation Report (sitrep) | Berkala (umumnya harian atau tiap jam di awal) | Ringkasan situasi, perkembangan korban dan dampak, upaya penanganan, kendala, kebutuhan, rencana berikut, kontak. Format sitrep nasional tidak ditemukan sebagai peraturan terpisah; Juklak 6/2023 mengatur penilaian perkembangan penanganan. | Juklak 6/2023 | [korpus] format sitrep [perlu cek] |
| Laporan kepada kepala daerah, Kepala BNPB, Presiden | Awal kejadian dan berkala | Tidak ada format baku untuk Presiden di korpus; praktik BNPB memakai Laporan Kejadian Bencana harian dan paparan. Dasar yang mengikat di sini tidak ditemukan. | Praktik | [perlu cek] [repo: `/laporan-bnpb`] |
| Jitupasna (DaLA dan HRNA) | Mulai akhir tanggap darurat | Kerusakan, kerugian, kebutuhan pemulihan per sektor (perumahan, infrastruktur, ekonomi produktif, sosial, lintas sektor); enam aspek. | Perka 15/2011 | [korpus] [repo] |
| R3P (rencana rehabilitasi dan rekonstruksi) | Maksimal 90 hari sejak mulai, dimulai saat tanggap darurat | Enam tahap, lima sektor, anggaran, pelaku, jadwal. | Perban 5/2017, 6/2017 | [korpus] [repo] |
| Laporan pertanggungjawaban logistik dan dana | Berkala dan akhir | Barang masuk dan keluar, stok, sisa. | Perka 25/2014 dan 20/2014; Perban 7/2018 | [korpus] |

### 1.4 Fitur digital yang berlaku lintas semua bencana

| Fitur | Status | Catatan |
| --- | --- | --- |
| Peringatan dini terpadu satu pintu (sumber resmi dulu, deteksi sendiri berlabel) berformat CAP dan pop-up | ada (`public/inti/peringatan.js`, `src/peringatan.js`, `/api/peringatan/aktif`); notifikasi email tahap 2 | `docs/multi-bencana/PERINGATAN-DINI.md` |
| Pusdalops: logbook kejadian, sitrep, meja kerja (pengungsi, pengaduan, klaster, risiko, kaji cepat) | ada (`public/bnpb/dalops.js`, `sitrep.js`, `meja.js`) | Juklak di `data/kajian-bnpb/juklak/` |
| Buku Besar Kejadian, kaji cepat otomatis, Jitupasna ke R3P, renkon hidup dan gladi | ada sebagai program (`/siklus`) | KA, PRD di `data/kajian-bnpb/siklus/` |
| Inventori logistik dan permintaan bantuan (LogPal) | ada (`/logpal`) | |
| Relawan dan pegawai lapangan, absen, logbook, panggilan lewat bot WA | ada (`/petugas`, `/relawan`) | |
| Laporan warga terverifikasi berfoto, geotag | ada (`public/warga`, `admin`) | |
| Laporan berkala Kepala BNPB (harian sampai tahunan) | ada (`/laporan-bnpb`) | |
| Usulan langkah dan log tindak lanjut | ada (`/bnpb/dalops`, menu Penanganan) | |
| Cek kabar luar (berita dan data alam untuk kejadian belum selesai) | ada | |
| Prakiraan harian per kab atau kota 1 sampai 3 hari, uji prospektif | ada (`/prediksi`) | |
| Sensor lapangan (muka air, hujan, gerakan tanah, gas) | ada (`sensor/`, `/api/sensor/baca`) | |

Celah lintas bencana yang belum terlihat di repo (usul):

1. **Papan status darurat per wilayah**: status siaga darurat atau tanggap darurat, tanggal SK, masa berlaku, perpanjangan, dan hitung mundur berakhir. Dasar: UU 24/2007 dan PP 21/2008 mengikat kemudahan akses pada status.
2. **Tangga tindakan per tingkat peringatan** (checklist yang menyala otomatis saat tingkat berubah, dengan pelaksana dan batas waktu).
3. **Papan komando SKPDB**: struktur Komandan dan lima staf, penugasan, rapat koordinasi, notulen, jadwal sitrep.
4. **Pembangkit sitrep dan renops dari data** (angka dari sistem, kalimat kebijakan ditulis staf).
5. **Peta fasilitas sasaran**: tempat evakuasi, pos kesehatan, sekolah, gudang, helipad, dan sumber air, disatukan per kabupaten.
6. **Gladi terjadwal dengan hasil terukur** (waktu peringatan sampai evakuasi, capaian Juklak 4/2026).

---

## 2. Karhutla

Rujukan khas:

| Rujukan | Label |
| --- | --- |
| UU 32/2009 PPLH (larangan membuka lahan dengan membakar, Pasal 69 ayat (1) huruf h; pidana Pasal 108) | [ingatan] [perlu cek] pasal |
| UU 39/2014 Perkebunan (Pasal 56 kewajiban pelaku usaha mencegah kebakaran) | [ingatan] [perlu cek] pasal |
| UU 41/1999 Kehutanan; PP 4/2001 Pengendalian Kerusakan dan atau Pencemaran Lingkungan Hidup yang Berkaitan dengan Kebakaran Hutan dan atau Lahan | [ingatan] [perlu cek] |
| PP 71/2014 jo PP 57/2016 Perlindungan dan Pengelolaan Ekosistem Gambut (muka air gambut paling dalam 0,4 m) | [ingatan] [perlu cek] |
| Permen LHK P.32/MENLHK/SETJEN/KUM.1/3/2016 Pengendalian Kebakaran Hutan dan Lahan (ditetapkan 15 Maret 2016, berlaku 18 April 2016), mengatur organisasi, pencegahan, pemadaman, penanganan pascakebakaran | [web] https://peraturan.bpk.go.id/Details/298069 |
| Tingkat siaga karhutla: Siaga 3 (normal), Siaga 2 (waspada), Siaga 1 (siaga darurat), lalu darurat atau tanggap darurat; disebut hasil pencarian sebagai Pasal 5 peraturan turunan "P.9/2018"; nomor dan judul turunan belum dibaca | [web] [perlu cek] |
| Inpres 11/2015 diganti Inpres 3/2020 tentang penanggulangan karhutla | [ingatan] [perlu cek] judul dan nomor |
| Sistem Peringkat Bahaya Kebakaran (BMKG), Canadian Forest Fire Weather Index System (Van Wagner 1987) | [ingatan]; FWI dipakai repo |
| ASEAN Agreement on Transboundary Haze Pollution (2002), disahkan Indonesia lewat UU 26/2014; ASMC dan ASEAN Haze Action Online | [ingatan] [perlu cek] |
| FAO Fire Management Voluntary Guidelines (2006); NWCG Incident Response Pocket Guide | [ingatan] |
| Pelaksana: Manggala Agni (KLHK), BPBD, BNPB (Satgas Udara dan pengerahan), TNI, Polri, BRIN dan BMKG (modifikasi cuaca), Masyarakat Peduli Api (MPA), perusahaan konsesi, Badan Restorasi Gambut dan Mangrove | [ingatan] |

| Fase | Tindakan inti dan pelaksana | Dokumen | Pemicu data atau indikator | Sumber daya dan sarana khas | Dukungan sistem |
| --- | --- | --- | --- | --- | --- |
| Prabencana | Patroli terpadu desa rawan (Manggala Agni, TNI, Polri, MPA); pembasahan dan pembasahan ulang gambut, sekat kanal; sosialisasi larangan buka lahan dengan bakar; inventaris sumber air dan embung; audit sarana prasarana konsesi; kesepakatan pemakaian pesawat dan helikopter; latihan (gladi). Pelaksana: KLHK, BPBD, pemda, pemegang izin. | Renkon karhutla provinsi dan kabupaten; peta rawan; daftar sarpras konsesi; SK Satgas; perjanjian kerja sama udara | Indeks kekeringan dan FWI musiman; prakiraan musim kemarau BMKG; El Nino atau IOD positif; tinggi muka air gambut | Pompa portabel, selang, mesin pemadam punggung, sekat kanal, embung dan sumur bor, menara pantau, kendaraan patroli, drone | ada: FWI, risiko dan prediksi, konsesi, `/siaga`, `/kebakaran`; usul: inventaris embung dan sumber air per desa terhubung ke peta pemadaman |
| Peringatan dini | Penetapan tingkat siaga dari tiga ke satu; aktivasi posko; mobilisasi tim reaksi cepat; pemantauan titik panas tiap beberapa jam; verifikasi lapangan (ground check). Pelaksana: gubernur atau bupati menetapkan status, Satgas karhutla melaksanakan. | SK status siaga darurat; surat edaran larangan membakar; posko aktif | Titik panas VIIRS atau MODIS (tingkat kepercayaan), FWI atau kode kekeringan, kecepatan angin, jumlah hari tanpa hujan, ISPU | Pos pemantau, tim darat, asap dan citra Himawari | ada: titik FIRMS 3 jam, Himawari, `/api/peringatan`, kluster dan prioritas (px24 dan FWI); usul: aturan tingkat siaga otomatis sebagai usulan ke pemda |
| Tanggap darurat 0 sampai 72 jam | Serangan awal (initial attack) pada api kecil; pemadaman darat (Manggala Agni, MPA, TNI, Polri, BPBD, perusahaan); pemadaman udara (water bombing) dengan modifikasi cuaca bila ada awan layak; lapor kejadian; kaji cepat luasan, akses, sumber air; evakuasi kelompok rentan bila asap pekat; posko kesehatan. Komando: SKPDB, Komandan ditunjuk kepala daerah. | Renops karhutla, renlap harian (darat dan udara), sitrep harian, kaji cepat, laporan luas terbakar, daftar kontrak dan jam terbang pesawat | Hotspot baru dan persisten, luas, kedekatan permukiman, bendungan sumber air, jarak pandang bandara (METAR), arah angin | Helikopter water bombing dan pesawat TMC, tangki air, pompa, selang, perahu untuk gambut berair, alat berat sekat, APD, masker | ada: modul `/operasi` (renlap mesin, PDF, KML, armada, kelayakan terbang), `/bnpb/dalops` karhutla, laporan harian; usul: antrean titik ambil air untuk helikopter |
| Tanggap darurat lanjutan | Pendinginan (mop-up) dan penjagaan sampai tidak ada asap; pembasahan gambut; patroli api muncul lagi; status turun bertahap; penegakan hukum (penyegelan, gugatan); layanan kesehatan ISPA. | Laporan akhir pemadaman, berita acara penurunan status, dokumen penegakan hukum KLHK | Titik panas nol selama beberapa hari, hujan, muka air gambut naik | Embung, pompa, tim jaga | ada: "api muncul lagi", cek kabar; usul: checklist kriteria turun status dengan data |
| Pemulihan | Restorasi gambut dan revegetasi; pemulihan lahan masyarakat; kompensasi dan ganti rugi lingkungan; evaluasi penyebab (analisis kebakaran). | Rencana pemulihan lahan, laporan luas dan kerugian (versi KLHK), R3P bila dampak sosial | Luas terbakar (citra dNBR), kerugian ekonomi | Bibit, sekat kanal, alat berat | ada: uji luas dNBR, `/siklus` Jitupasna; usul: peta lokasi restorasi dan pemantauan tutupan |

Khas karhutla yang layak jadi fitur: (a) ambang status siaga otomatis, (b) papan beban pemadaman udara per hari, (c) peta sumber air helikopter, (d) kaitan asap ke ISPU dan sekolah libur, (e) daftar perusahaan konsesi di titik panas dengan riwayat.

---

## 3. Banjir dan rob

Rujukan khas:

| Rujukan | Label |
| --- | --- |
| UU 17/2019 Sumber Daya Air; PP 38/2011 Sungai [perlu cek]; Permen PUPR tentang pola pengelolaan sumber daya air | [ingatan] [perlu cek] |
| Pos duga air: tingkat Siaga 4 (hijau), 3 (kuning), 2 (oranye), 1 (merah) dipakai di pintu air Jakarta; pelaksana Dinas SDA, BBWS atau BWS (Kementerian PU) | [ingatan] |
| BMKG: peringatan dini cuaca, hujan lebat per hari (lebat 50 sampai 100 mm, sangat lebat 100 sampai 150 mm, ekstrem lebih dari 150 mm) dan per jam (lebat 10 sampai 20 mm per jam) | [ingatan] [perlu cek] angka |
| BMKG: peringatan dini banjir pesisir (rob), BIG: ketinggian pasang dan Inamet | [ingatan] [perlu cek] nama produk |
| WMO Integrated Flood Management; Delft-FEWS; GloFAS (Copernicus) | [ingatan] |
| Perban 3/2018 pengungsi; Juklak 3/2022; Perban 2/2023 renkon banjir | [korpus] |

| Fase | Tindakan inti dan pelaksana | Dokumen | Pemicu | Sumber daya | Dukungan sistem |
| --- | --- | --- | --- | --- | --- |
| Prabencana | Normalisasi dan pengerukan sungai, pemeliharaan tanggul, pintu air, polder dan pompa; ruang terbuka biru; penataan ruang bantaran; peta bahaya dan jalur evakuasi; tempat evakuasi sementara; kelompok siaga banjir desa. Pelaksana: PUPR, Dinas SDA, BPBD, pemda. | Renkon banjir; peta rawan; rencana evakuasi; daftar pompa dan alat | Curah hujan klimatologi, tinggi muka air normal, riwayat kejadian | Pompa banjir, perahu karet, rakit, karung pasir, kantong pasir, pelampung, genset, tenda, dapur umum, kaporit | ada: `/banjir` (hujan ensemble, sungai, rob, status, posko), InaRISK; usul: inventaris pompa dan pintu air per kabupaten |
| Peringatan dini | Pantau tinggi muka air hulu ke hilir; pengumuman bertingkat ke warga (sirene, pengeras suara, WA, aplikasi); aktivasi posko; siapkan evakuasi. Pelaksana: BMKG, BBWS, BPBD, relawan. | Peringatan resmi (CAP), SOP peringatan, tabel waktu tempuh banjir | Hujan prakiraan ensemble, muka air stasiun (Siaga 4 sampai 1), peringatan BMKG hujan lebat, pasang purnama dan pasang tinggi untuk rob | Sensor muka air, sirene, grup komunikasi | ada: prediksi 1 sampai 3 hari, sensor, `/api/peringatan`; usul: waktu tempuh hulu ke hilir per sungai |
| Tanggap darurat 0 sampai 72 jam | Evakuasi (prioritas lansia, anak, disabilitas, ibu hamil), SAR perahu, dapur umum, air bersih, posko kesehatan, pompa genangan, perbaikan darurat tanggul, pengelolaan pengungsian terpilah. Komando: SKPDB, posko di kabupaten atau kota. | Kaji cepat, sitrep, data pengungsi terpilah, renlap pompa dan perahu | Tinggi genangan, luas, durasi, jumlah terdampak, putusnya akses, kondisi tanggul | Perahu karet, pompa, tenda, MCK, filter air, makanan siap saji, alat komunikasi | ada: meja pengungsi, kaji cepat, LogPal, `/bnpb/dalops`; usul: peta genangan hasil model dan citra (`RANCANGAN-GENANGAN-JAKARTA.md`) dengan estimasi terdampak |
| Tanggap darurat lanjutan | Genangan surut: pembersihan, kesehatan lingkungan (diare, leptospirosis, DBD, penyakit kulit), distribusi logistik, pendataan rumah rusak, pembukaan akses. | Sitrep lanjutan, laporan penyakit, daftar rumah rusak | Genangan surut, kasus penyakit naik | Tim kesehatan, kaporit, kapur, alat bersih lumpur | ada: banjir belum surut (peta PDF Aceh dan Sumut tercatat di git log); usul: kurva surut per kecamatan |
| Pemulihan | Rehabilitasi rumah (DSP stimulan, hibah RR), perbaikan infrastruktur, pemulihan mata pencaharian, tinjau tata ruang dan tanggul, perbaikan sistem peringatan. | Jitupasna, R3P, laporan DSP | Hasil verifikasi rumah rusak | Dana stimulan, material, tukang | ada: `/siklus` Jitupasna dan R3P; usul: lacak penyaluran stimulan per rumah |

Khas rob: pasang purnama dan pasang perigean (prediksi pasut BIG atau BMKG), amblesan tanah, kenaikan muka laut; tindakan: tanggul laut, pompa polder, rumah panggung, relokasi, hentikan penyedotan air tanah. Fitur: prakiraan genangan rob dari pasut dan DEM per kecamatan (ada di `/prediksi`, rob), pengingat pasang tinggi mingguan ke warga.

Khas banjir: (a) tangga Siaga 4 sampai 1 per pos duga, (b) waktu tempuh hulu ke hilir, (c) peta genangan dan estimasi terdampak, (d) pengungsi terpilah per tempat, (e) kurva surut dan peringatan penyakit pascabanjir.

---

## 4. Longsor (gerakan tanah)

Rujukan khas:

| Rujukan | Label |
| --- | --- |
| Badan Geologi (PVMBG), Kementerian ESDM: Peta Zona Kerentanan Gerakan Tanah dan prakiraan bulanan potensi gerakan tanah (rendah, menengah, tinggi) | [ingatan] |
| Permen PU 22/2007 Pedoman Penataan Ruang Kawasan Rawan Bencana Longsor | [ingatan] [perlu cek] |
| Caine (1980) ambang hujan global I = 14,82 D pangkat minus 0,39 (I mm per jam, D jam); Guzzetti dkk (2008); NASA LHASA | [ingatan] [perlu cek] angka |
| Intrieri dkk (2013) Landslide Early Warning System | [ingatan] |
| Perka 13/2010 SAR; Juklak 6/2026 | [korpus] |

| Fase | Tindakan inti dan pelaksana | Dokumen | Pemicu | Sumber daya | Dukungan sistem |
| --- | --- | --- | --- | --- | --- |
| Prabencana | Pemetaan zona rentan; larangan membangun di lereng curam; terasering dan drainase lereng; penanaman vegetasi akar dalam; relokasi permukiman zona merah; pelatihan tanda awal (retakan tanah, mata air keruh, pohon miring). Pelaksana: Badan Geologi, PUPR, pemda, BPBD, desa tangguh. | Peta rawan, rencana evakuasi, renkon | Kerentanan lereng dan tanah, riwayat kejadian | Sirene, rambu, tiang ukur retakan (ekstensometer), alat berat siaga | ada: `/longsor` nowcast per kecamatan (gaya LHASA); usul: daftar lereng kritis terpantau dengan foto berkala |
| Peringatan dini | Peringatan hujan lebat dan prakiraan potensi gerakan tanah; pengosongan sementara zona merah saat hujan tinggi; pemantauan retakan dan sensor. Pelaksana: BMKG, Badan Geologi, BPBD, desa. | Peringatan, SOP evakuasi dini | Hujan kumulatif 3 sampai 7 hari di atas ambang (mis. P95), peringatan BMKG, sensor gerakan tanah | Sensor hujan dan gerakan tanah, sirene | ada: nowcast, sensor gerakan tanah; usul: ambang per kecamatan hasil kalibrasi kejadian |
| Tanggap darurat 0 sampai 72 jam | SAR timbunan (tim SAR, Basarnas, TNI, Polri, relawan, alat berat), pengamanan longsor susulan, evakuasi, penutupan akses, pemantauan tebing mahkota longsor, perawatan korban. Waktu emas pencarian 72 jam. | Kaji cepat, rencana SAR, sitrep, daftar hilang | Hujan susulan, retakan di mahkota, aliran air | Alat berat, anjing pelacak, alat deteksi, tenda medis, tali dan alat penyangga | ada: kaji cepat, meja dan logbook; usul: papan pencarian (sektor, tim, jam, status) dan peta zona aman kerja |
| Tanggap darurat lanjutan | Relokasi sementara, pembersihan, stabilisasi lereng darurat, penilaian geologi (pemeriksaan Badan Geologi), penutupan jalan atau pengalihan arus. | Rekomendasi teknis Badan Geologi | Data pergerakan | Alat berat, bahan penahan | usul: tab rekomendasi teknis dan status kawasan |
| Pemulihan | Relokasi permanen, perbaikan lereng, penataan ruang, rekonstruksi rumah. | Jitupasna, R3P, rencana relokasi | Hasil kajian geologi | Lahan relokasi, dana | ada: `/siklus`; usul: peta hunian tetap dan kondisi zona |

Khas longsor: (a) ambang hujan kumulatif per kecamatan, (b) daftar lereng kritis dengan foto, (c) papan SAR timbunan, (d) status zona merah (boleh dihuni atau tidak) dari rekomendasi Badan Geologi, (e) pengiriman peringatan hujan ke desa tangguh.

---

## 5. Gempa bumi dan tsunami

Rujukan khas:

| Rujukan | Label |
| --- | --- |
| BMKG InaTEWS (Indonesia Tsunami Early Warning System): informasi gempa umumnya dalam sekitar 5 menit, peringatan tsunami bertingkat (Awas, Siaga, Waspada) dengan prakiraan tinggi gelombang; saluran: sirene, SMS, aplikasi, media. Angka waktu dan nama tingkat [perlu cek] | [ingatan] |
| UU 31/2009 Meteorologi, Klimatologi, dan Geofisika (BMKG berwenang menyampaikan peringatan dini) | [ingatan] [perlu cek] |
| UNESCO-IOC Tsunami Ready Programme (komunitas siap tsunami); PTWC | [ingatan] |
| INSARAG Guidelines 2020; klasifikasi USAR; OSOCC | [ingatan] |
| Perka 13/2010 SAR; Juklak 6/2026 | [korpus] |
| USGS PAGER dan ShakeMap (grid xml), skala MMI; BMKG memakai skala SIG-BMKG I sampai V | [repo] [ingatan] |
| Pedoman penilaian kerusakan bangunan pascagempa oleh Kementerian PUPR (tagging hijau, kuning, merah) | [ingatan] [perlu cek] nomor |
| Perban 2/2024 Peringatan Dini; Juklak 6/2024 Rambu dan Papan Evakuasi | [korpus] |

| Fase | Tindakan inti dan pelaksana | Dokumen | Pemicu | Sumber daya | Dukungan sistem |
| --- | --- | --- | --- | --- | --- |
| Prabencana | Bangunan tahan gempa (SNI), retrofit sekolah dan rumah sakit; jalur dan tempat evakuasi tsunami (TES, TEA), rambu; latihan Tsunami Ready; Sekolah Madrasah Aman; ketahanan gudang dan hub logistik; kesiapan tim USAR daerah. Pelaksana: PUPR, BMKG, pemda, BPBD. | Renkon gempa dan tsunami; peta evakuasi; rencana gladi | Peta bahaya, kerentanan bangunan, zona tsunami (inundasi) | Sirene tsunami, rambu, shelter vertikal, alat SAR runtuhan, tenda | ada: `/gempa` (riwayat, risiko, guncangan, susulan); usul: peta aset jalur evakuasi dan kapasitas tempat evakuasi |
| Peringatan dini | Informasi gempa, lalu peringatan tsunami bila berpotensi; perintah evakuasi mandiri ke tempat tinggi (jangan menunggu sirene bila guncangan kuat dan lama di pantai); penghentian peringatan oleh BMKG saat aman. Pelaksana: BMKG, BPBD, relawan. | Pesan peringatan resmi dengan jam terbit; SOP | Magnitudo, kedalaman, lokasi, potensi tsunami BMKG, ketinggian muka laut (tide gauge, DART) | Sirene, radio, TV, SMS cell broadcast | ada: pemicu gempa dan tsunami di Worker tiap menit (Awas langsung label InaTEWS); usul: hitung mundur tiba tsunami per pantai |
| Tanggap darurat 0 sampai 72 jam | Penetapan status; SAR runtuhan (tim USAR, Basarnas, TNI, Polri, relawan; INSARAG untuk bantuan asing); medis massal (triage, rumah sakit lapangan); pendirian posko, pendataan pengungsi; logistik air, makanan, tenda; pemulihan darurat listrik, air, komunikasi, akses; pemeriksaan bangunan. | Kaji cepat, renops, sitrep tiap jam awal, daftar hilang, data korban terpilah, izin masuk tim asing | MMI per lokasi, estimasi korban PAGER, laporan rusak, longsor susulan, gempa susulan | Alat berat, alat potong, anjing pelacak, penyangga, rumah sakit lapangan, genset, tenda, air | ada: guncangan dan susulan, kaji cepat otomatis (`/siklus` F3), meja pengungsi, LogPal, relawan; usul: papan sektor SAR (INSARAG: area kerja, tim, jam, status ditandai), papan tagging bangunan |
| Tanggap darurat lanjutan | Transisi: hunian sementara, klaster kesehatan, pendidikan darurat, pencegahan penyakit, keamanan pengungsian, inspeksi bangunan massal. | Penilaian perkembangan, data pengungsi | Gempa susulan, cuaca | Hunian sementara, MCK, sekolah darurat | ada: meja; usul: kapasitas dan keterisian hunian sementara |
| Pemulihan | Rehabilitasi dan rekonstruksi: rumah tahan gempa (stimulan rumah rusak), fasilitas publik, ekonomi, tata ruang ulang zona patahan dan tsunami. | Jitupasna, R3P, hibah RR | Verifikasi rumah rusak berat, sedang, ringan | Dana stimulan, tukang bersertifikat | ada: `/siklus`; usul: peta paparan bangunan dibandingkan tagging hasil inspeksi |

Khas gempa dan tsunami: (a) hitung mundur tsunami dan perintah evakuasi per pantai, (b) peta jalur dan tempat evakuasi dengan kapasitas, (c) papan SAR runtuhan gaya INSARAG, (d) PAGER dan ShakeMap untuk estimasi korban dan kebutuhan, (e) tagging bangunan hijau, kuning, merah.

---

## 6. Letusan gunung api

Rujukan khas:

| Rujukan | Label |
| --- | --- |
| PVMBG (Badan Geologi, Kementerian ESDM): empat level aktivitas, Level I Normal, II Waspada, III Siaga, IV Awas; tiap level disertai rekomendasi, di Level IV rekomendasi radius dan sektoral di sekitar kawah | [ingatan] [perlu cek] radius per gunung |
| Peta Kawasan Rawan Bencana (KRB I, II, III); MAGMA Indonesia; VONA (Volcano Observatory Notice for Aviation) berkode warna ICAO | [ingatan] |
| Kepmen ESDM 15/2011 Pedoman Mitigasi Bencana Gunung Api | [ingatan] [perlu cek] |
| IVHHN, rekomendasi masker abu vulkanik; ICAO IAVW | [ingatan] |
| Perka 6/2012 Juknis Pembangunan Sektor Permukiman Pascaerupsi Gunung Api | [korpus] tidak berlaku |
| Perban 2/2024 Peringatan Dini; Juklak 6/2024 rambu | [korpus] |

| Fase | Tindakan inti dan pelaksana | Dokumen | Pemicu | Sumber daya | Dukungan sistem |
| --- | --- | --- | --- | --- | --- |
| Prabencana | Peta KRB dan jalur evakuasi; shelter dan barak; relokasi dari zona terlarang; latihan evakuasi; sosialisasi tanda awal; pos pengamatan; kapal atau angkutan evakuasi untuk pulau gunung api. Pelaksana: PVMBG, BPBD, pemda. | Renkon gunung api spesifik; peta KRB; rencana evakuasi | Level I atau II, aktivitas vulkanik dasar | Truk angkut, barak, masker N95, sirene, kendaraan evakuasi | ada: `/gunungapi` (MAGMA, KRB), `dalops_gunungapi`; usul: kapasitas barak per KRB |
| Peringatan dini | Kenaikan level; penutupan jalur pendakian; pengosongan radius sesuai rekomendasi; informasi ke penerbangan (VONA). Pelaksana: PVMBG menetapkan level, bupati atau gubernur menindaklanjuti, BPBD mengevakuasi. | Surat rekomendasi PVMBG per level; SK status siaga darurat | Level, kegempaan (vulkanik dalam, dangkal, tremor), deformasi, gas SO2, emisi | Pos, seismometer, kendaraan evakuasi | ada: level dari MAGMA diteruskan apa adanya; usul: tabel "rekomendasi PVMBG per level" dengan checklist tindakan BPBD |
| Tanggap darurat 0 sampai 72 jam | Evakuasi penuh KRB III dan zona rekomendasi; pengelolaan pengungsi di barak; penanganan abu vulkanik (masker, atap, air minum, jalan); SAR korban awan panas; pengiriman bantuan; informasi bandara; ancaman lahar hujan susulan. | Renops, kaji cepat, sitrep, data pengungsi | Level IV, erupsi, arah angin, curah hujan (lahar) | Truk, perahu, masker, kacamata, penyapu atap, air bersih, tenda, ambulans, alat berat bersih abu | ada: prakiraan arah abu (via angin), meja pengungsi; usul: peta sebaran abu dari VONA dan angin, dan prediksi aliran lahar di sungai berhulu gunung |
| Tanggap darurat lanjutan | Pembersihan abu, pemulihan akses, pemantauan lahar dingin, kesehatan (ISPA, mata), perpanjangan atau pemulangan pengungsi sesuai penurunan level dan rekomendasi. | Surat penurunan level, berita acara pemulangan | Penurunan level, hujan | Alat berat, jembatan darurat | usul: daftar sungai lahar dan status tanggul |
| Pemulihan | Relokasi permanen di luar KRB III, rekonstruksi, pemulihan pertanian (abu), penataan ruang. | Jitupasna, R3P | Zona rawan | Lahan, rumah, irigasi | ada: `/siklus` |

Khas gunung api: (a) rekomendasi PVMBG per level sebagai checklist, (b) kapasitas dan kebutuhan barak per KRB, (c) peta abu dan VONA, (d) lahar hujan dan peringatan hujan di hulu, (e) status jalur penerbangan dan bandara.

---

## 7. Cuaca ekstrem (angin kencang, puting beliung, hujan lebat)

Rujukan khas:

| Rujukan | Label |
| --- | --- |
| BMKG: peringatan dini cuaca tiga tingkat (Waspada, Siaga, Awas) per kabupaten atau kota, berbasis dampak (impact-based forecast); nowcasting radar | [ingatan] [perlu cek] |
| Kategori hujan BMKG harian: lebat 50 sampai 100 mm, sangat lebat 100 sampai 150 mm, ekstrem lebih dari 150 mm | [ingatan] [perlu cek] |
| Angin kencang: kecepatan di atas 25 knot sebagai ambang peringatan BMKG | [ingatan] [perlu cek] angka |
| UU 31/2009 | [ingatan] [perlu cek] |
| WMO Guidelines on Multi-hazard Impact-based Forecast and Warning Services (2015) | [ingatan] [perlu cek] tahun |

| Fase | Tindakan inti dan pelaksana | Dokumen | Pemicu | Sumber daya | Dukungan sistem |
| --- | --- | --- | --- | --- | --- |
| Prabencana | Pemangkasan pohon rawan, penguatan atap dan rangka rumah, aturan baliho, pelatihan relawan, penyiapan jalur komunikasi peringatan. Pelaksana: BPBD, dinas lingkungan, PLN, pemda. | Renkon cuaca ekstrem kota | Musim pancaroba, riwayat puting beliung | Gergaji mesin, tenda, terpal, kendaraan | ada: `/cuaca`; usul: peta pohon besar dan baliho berisiko dari OSM atau laporan warga |
| Peringatan dini | Siaran peringatan BMKG, penghentian aktivitas luar ruang, penundaan pelayaran dan penerbangan, evakuasi rumah rapuh. Pelaksana: BMKG, BPBD, relawan. | Pesan peringatan | Peringatan BMKG tingkat Siaga atau Awas, radar, citra Himawari | | ada: peringatan BMKG diteruskan; usul: notifikasi per kecamatan berbasis dampak |
| Tanggap darurat 0 sampai 72 jam | Bersihkan pohon tumbang, pulihkan listrik dan jalan, pendataan rumah rusak, tampung pengungsi sementara (jarang lebih dari beberapa hari), perawatan luka. | Kaji cepat, sitrep ringkas | Laporan warga, jaringan listrik padam | Gergaji, tenda, terpal, genset | ada: laporan warga, kaji cepat; usul: peta kejadian dengan jejak puting beliung dari laporan |
| Tanggap darurat lanjutan | Perbaikan atap, bantuan terpal dan bahan bangunan, pemantauan susulan. | Daftar rumah rusak | | Material | ada: meja |
| Pemulihan | Stimulan rumah rusak, perbaikan fasilitas. | Jitupasna ringkas | | Dana stimulan | ada: `/siklus` |

Catatan: puting beliung tidak dapat diprakirakan lokasi dan jamnya secara tepat; praktik terbaik ada pada peringatan umum cuaca ekstrem lalu verifikasi kejadian. Khas: (a) peringatan berbasis dampak per kecamatan, (b) buku kejadian puting beliung dengan jejak, (c) peta hubungan hujan lebat ke banjir dan longsor, (d) layanan "cek cuaca keberangkatan" untuk pelayaran, (e) laporan warga dengan foto geotag.

---

## 8. Kekeringan

Rujukan khas:

| Rujukan | Label |
| --- | --- |
| BMKG: hari tanpa hujan berturut-turut (HTH) pada kategori sangat pendek 1 sampai 5, pendek 6 sampai 10, menengah 11 sampai 20, panjang 21 sampai 30, sangat panjang 31 sampai 60, kekeringan ekstrem lebih dari 60 hari; Standardized Precipitation Index (SPI); peringatan dini kekeringan meteorologis | [ingatan] [perlu cek] angka |
| WMO dan GWP Integrated Drought Management Programme; WMO-No. 1090 SPI User Guide (2012) | [ingatan] |
| Kementerian Pertanian (tanaman puso, pompanisasi, embung); Kementerian PUPR (sumur bor, embung, irigasi); Badan Pangan Nasional (cadangan pangan) | [ingatan] |
| Juklak Teknis 1/2024 bantuan stimulan petani gagal panen (puso) akibat banjir menggunakan Dana Siap Pakai | [korpus] (untuk banjir; analogi kekeringan [perlu cek]) |
| Dasar status kekeringan di daerah: penetapan siaga darurat oleh kepala daerah | [ingatan] [perlu cek] |

| Fase | Tindakan inti dan pelaksana | Dokumen | Pemicu | Sumber daya | Dukungan sistem |
| --- | --- | --- | --- | --- | --- |
| Prabencana | Panen air hujan, embung, sumur bor, perbaikan irigasi, cadangan pangan, pola tanam adaptif, pemetaan desa rawan air. Pelaksana: PUPR, Kementan, pemda. | Renkon kekeringan; peta desa rawan air | Prakiraan musim kemarau BMKG, El Nino | Pompa, tangki, sumur bor, embung | ada: `/kekeringan` (HTH, SPI, kelembapan tanah), neraca air Jawa, embung; usul: inventaris titik air dan kapasitas |
| Peringatan dini | Peringatan HTH dan SPI; imbauan hemat air; jadwal giliran air irigasi; siapkan distribusi air bersih. Pelaksana: BMKG, BPBD, PDAM, dinas pertanian. | Peringatan, SK siaga darurat | HTH lebih dari 30 hari, SPI di bawah minus 1,5 (kering parah) [perlu cek], debit sungai dan waduk | Truk tangki, pompa | ada: indikator; usul: aturan status otomatis per kabupaten (hipotesis; ada catatan uji balik gagal di repo, FAR tinggi) |
| Tanggap darurat 0 sampai 72 jam | Distribusi air bersih dengan truk tangki, bantuan pangan, layanan kesehatan, pompanisasi, modifikasi cuaca bila ada awan, bantuan petani. Komando: BPBD. | Kaji cepat kebutuhan air, sitrep, daftar desa dan jiwa terdampak | Sumber air kering, jumlah desa tanpa air | Truk tangki, tandon, pompa, mobil tangki PDAM | ada: neraca air; usul: rute dan jadwal truk tangki, peta titik distribusi |
| Tanggap darurat lanjutan | Pengelolaan sumber air bergantian, perpanjangan bantuan, pencegahan karhutla dan kebakaran. | Laporan berkala | Awal musim hujan | | usul: indikator berakhir |
| Pemulihan | Pemulihan pertanian, bantuan benih, asuransi pertanian, perbaikan jaringan irigasi. | Jitupasna sektor pertanian | | Benih, pupuk | usul |

Khas: (a) peta desa dan jiwa tanpa air per bulan, (b) jadwal distribusi tangki, (c) peringatan dini pertanian (puso), (d) hubungan ke risiko karhutla, (e) neraca air waduk.

---

## 9. Kualitas udara dan asap

Rujukan khas:

| Rujukan | Label |
| --- | --- |
| Permen LHK P.14/MENLHK/SETJEN/KUM.1/7/2020 Indeks Standar Pencemar Udara (ISPU): baik 0 sampai 50, sedang 51 sampai 100, tidak sehat 101 sampai 200, sangat tidak sehat 201 sampai 300, berbahaya 301 ke atas | [ingatan] [perlu cek] nomor dan angka |
| PP 22/2021 Penyelenggaraan Perlindungan dan Pengelolaan Lingkungan Hidup (baku mutu udara ambien) | [ingatan] [perlu cek] |
| WHO Global Air Quality Guidelines 2021 (PM2.5 24 jam 15 mikrogram per meter kubik) | [ingatan] |
| Kemenkes: kesiapsiagaan krisis kesehatan akibat asap karhutla; penyakit ISPA, kelompok rentan | [ingatan] [perlu cek] nomor |
| ASEAN Agreement on Transboundary Haze Pollution; ASMC | [ingatan] |

| Fase | Tindakan inti dan pelaksana | Dokumen | Pemicu | Sumber daya | Dukungan sistem |
| --- | --- | --- | --- | --- | --- |
| Prabencana | Pemasangan alat pantau kualitas udara (SPKU), edukasi dampak, penyiapan ruang bebas asap di fasilitas umum, stok masker, protokol sekolah, penyiapan rumah sakit. Pelaksana: KLHK dan DLH, Kemenkes dan Dinkes, pemda. | Rencana kesiapsiagaan krisis kesehatan asap | Musim karhutla | Masker N95 atau KN95, penjernih udara, ruang bersih | ada: `/udara` (PM2.5, ISPU, CAMS); usul: peta ruang bebas asap |
| Peringatan dini | Peringatan berbasis ISPU dan prakiraan asap; imbauan kurangi aktivitas luar ruang; kontak sekolah dan faskes. Pelaksana: KLHK, BMKG, Dinkes, Dinas Pendidikan. | Pesan peringatan | ISPU lebih dari 100 tiga hari, PM2.5 lebih dari 55, jarak pandang rendah | | ada: prakiraan asap 24 jam (`lintasan.py`), METAR; usul: aturan sekolah libur otomatis sebagai usulan ke dinas |
| Tanggap darurat 0 sampai 72 jam | Distribusi masker, layanan kesehatan, ruang bebas asap, evakuasi kelompok rentan (bayi, lansia, penyakit paru), penghentian aktivitas luar ruang, pemadaman sumber (karhutla). | Sitrep asap, data ISPA | ISPU sangat tidak sehat atau berbahaya | Masker, oksigen, nebulizer | ada: dalops karhutla; usul: kasus ISPA harian per puskesmas |
| Tanggap darurat lanjutan | Pemantauan sampai baik, buka sekolah dan bandara, laporan kesehatan. | Laporan | ISPU turun | | usul |
| Pemulihan | Evaluasi dan pencegahan, kompensasi sektor terdampak. | Laporan akhir | | | usul |

Khas: (a) peta asap lintas batas dengan arah angin, (b) ISPU dan jarak pandang di satu papan, (c) peta ruang bebas asap, (d) angka ISPA terhubung ke ISPU, (e) pemicu libur sekolah dan penerbangan.

---

## 10. Gelombang pasang dan abrasi

Rujukan khas:

| Rujukan | Label |
| --- | --- |
| UU 27/2007 jo UU 1/2014 Pengelolaan Wilayah Pesisir dan Pulau-Pulau Kecil | [ingatan] [perlu cek] |
| Perpres 51/2016 Batas Sempadan Pantai; Perpres 121/2012 Rehabilitasi Wilayah Pesisir dan Pulau-Pulau Kecil | [ingatan] [perlu cek] |
| BMKG: peringatan gelombang tinggi (kategori tinggi 1,25 sampai 2,5 m, sangat tinggi 2,5 sampai 4 m, ekstrem 4 sampai 6 m) dan peringatan dini banjir pesisir | [ingatan] [perlu cek] angka |
| IPCC AR6 SROCC; UNEP; pendekatan Building with Nature | [ingatan] |

| Fase | Tindakan inti dan pelaksana | Dokumen | Pemicu | Sumber daya | Dukungan sistem |
| --- | --- | --- | --- | --- | --- |
| Prabencana | Mangrove, pemecah gelombang, tanggul laut, pengisian pasir pantai (beach nourishment), sempadan pantai, relokasi permukiman garis pantai, larangan tambang pasir. Pelaksana: KKP, PUPR (BWS), BRGM, pemda. | Rencana zonasi, rencana aksi pesisir | Laju abrasi (Landsat), pasut, tinggi gelombang | Bibit mangrove, batu, geotube | ada: abrasi tahunan Landsat (`public/pesisir/data`, lapisan di banjir); usul: halaman `/pesisir` sendiri dengan daftar transek kritis |
| Peringatan dini | Peringatan gelombang tinggi BMKG; larangan melaut atau berlayar; peringatan pasang tinggi dan banjir pesisir; pengamanan perahu. Pelaksana: BMKG, syahbandar, BPBD. | Peringatan BMKG | Tinggi gelombang prakiraan, pasang purnama, angin | Pelampung peringatan | ada: peringatan BMKG, prediksi rob; usul: notifikasi nelayan per pelabuhan |
| Tanggap darurat 0 sampai 72 jam | Evakuasi permukiman pesisir terkena gelombang, SAR laut, penampungan, logistik, pembersihan, perbaikan tanggul darurat. | Kaji cepat, sitrep | Kerusakan, banjir rob | Perahu, pompa | ada: dalops, meja |
| Tanggap darurat lanjutan | Perbaikan darurat tanggul dan jalan, kesehatan lingkungan. | | | | |
| Pemulihan | Rehabilitasi pesisir, relokasi, penataan ruang pesisir, mata pencaharian nelayan. | Jitupasna, R3P | | | ada: `/siklus` |

Khas: (a) peringatan gelombang per pelabuhan dan alur, (b) transek abrasi kritis dan rumah terancam, (c) status mangrove dan pemecah gelombang, (d) gabungan pasut, gelombang, dan banjir pesisir, (e) hubungan ke relokasi.

---

## 11. Ringkasan untuk keputusan

Prioritas celah fitur yang berlaku di semua bencana (urut manfaat dibagi usaha, penilaian penyusun):

1. Papan status darurat per wilayah (SK, masa berlaku, perpanjangan).
2. Tangga tindakan per tingkat peringatan (siapa, apa, batas waktu).
3. Papan komando SKPDB dan pembangkit sitrep dan renops dari data.
4. Peta fasilitas sasaran (tempat evakuasi, faskes, gudang, helipad, sumber air).
5. Gladi terjadwal dengan hasil terukur.

Pertanyaan terbuka untuk pemilik (tidak dijawab dengan karangan):

1. Dasar yang mengikat untuk laporan kepada Presiden belum ditemukan di korpus. Format Laporan Kejadian Bencana harian dipakai karena praktik.
2. Nomor turunan karhutla yang disebut P.9/2018, serta peraturan khusus kekeringan, kualitas udara kesehatan, dan pesisir, belum dibaca naskahnya.
3. Ambang angka (hujan, angin, gelombang, HTH, ISPU) dari ingatan harus dicek ke penerbit sebelum dipakai di layar.

Sumber web sesi ini:

- https://peraturan.bpk.go.id/Details/298069 (Permen LHK P.32/2016, ditetapkan 15 Maret 2016, berlaku 18 April 2016).
- https://toolsfortransformation.net/wp-content/uploads/2017/05/PerMen-LH-K-P.32-2016-Pengendalian-kebakaran-Hutan-_-lahan.pdf (naskah P.32/2016, belum dibaca penuh).
- https://pasal.id/peraturan/permen/permenlh-no-p-32-menlhk-setjen-kum-1-3-2016-tahun-2016.
- Korpus lokal `data/hukum/peta_peraturan.json` untuk semua nomor bertanda [korpus].
