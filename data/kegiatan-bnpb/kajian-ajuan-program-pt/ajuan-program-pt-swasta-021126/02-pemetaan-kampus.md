# Pemetaan ide ke kampus koordinator dan mitra swasta

Tahap 2 dari 2. Ide dari `01-brainstorm-ide.md` (17 lolos + 7 cadangan) dipasangkan ke 11 kampus koordinator dalam paparan rev4.
Bukti: `riset.json` (lolos `riset.py periksa --ketat`: 86 temuan bersumber, 49 titik data dari 33 lembaga; 58 celah dicatat).
Kode bukti `[Qn-xx]` menunjuk klaim di `riset.json`. Klaim berstatus inferensi atau celah ditandai (perlu cek).

## 1. Aturan pemasangan

Satu kampus mendapat satu flagship bila empat syarat terpenuhi bersamaan:

1. **Bahaya utama regionalnya** dijawab oleh ide itu;
2. **Kampus sudah punya bukti** (alat, pusat studi, atau rekam tanggap darurat) sehingga flagship tidak mulai dari nol;
3. **Ada mitra swasta yang rekam jejaknya terverifikasi** di wilayah atau bidang itu, dan risiko reputasinya bisa dipagari;
4. **Tidak ada dua kampus dengan flagship yang sama**, supaya tiap kampus punya identitas.

Sisa ide dijadikan program pendukung (2 sampai 3 per kampus) atau program lintas regional.

## 2. Ringkasan 11 flagship

| No | Kampus (regional) | Flagship | Ide asal | Mitra swasta utama | Unit BNPB pasangan |
|---|---|---|---|---|---|
| 1 | USK (Aceh, Sumut) | Lumbung Siaga Aceh: logistik dan air bersih 72 jam | E1, E6 | MedcoEnergi (Medco Foundation), Telkomsel | Logistik dan Peralatan |
| 2 | Unand (Sumatera tengah, selatan) | Padang Siap Megathrust: gedung dan masjid jadi tempat evakuasi | D3 | Pegadaian; pemilik gedung swasta | Pencegahan |
| 3 | UI (DKI, Banten) | Korps Siaga Korporat: relawan karyawan berpasangan dengan mahasiswa | H1 | Astra, Bank Mandiri | Penanganan Darurat |
| 4 | ITB (Jawa Barat) | Laboratorium Inovasi Kemanusiaan: kit martabat dan produk darurat berbasis riset | E4 | ParagonCorp | Logistik dan Peralatan |
| 4b | Tel-U di bawah ITB | Sekolah Siaga Imersif: VR dan Dome 360 untuk sekolah | A1 | Telkom Indonesia, Telkomsel; Paragon (Dome Theater Museum ITB) | Pencegahan |
| 5 | UGM (Jateng, DIY) | Dari Prototipe ke 1.000 Unit: GAMA-EWS dan penjernih air surya diproduksi massal | B1 | PT Len Industri (manufaktur), Indosat dan NVIDIA (Tech4Disaster), Zurich Alliance (Mercy Corps) | Pencegahan |
| 6 | ITS (Jawa Timur) | Kapal Tanggap Bencana Kepulauan | E2 | PT PAL Indonesia; Unair (RS Kapal Ksatria Airlangga) | Penanganan Darurat, Logistik |
| 7 | Unram (Bali, NTB, NTT) | Rumah Tahan Gempa dari Toko Bangunan | D1 | PT Amman Mineral Nusa Tenggara; produsen bahan bangunan (perlu dicari) | Rehabilitasi dan Rekonstruksi |
| 8 | ULM (Kalimantan) | Desa Lahan Basah Tangguh: banjir dan kebakaran rawa berbasis desa | I1, G4 | Pertamina Hulu Kalimantan Timur | Pencegahan |
| 9 | Unhas (Sulawesi) | Sulawesi Aman Bangun: peta likuefaksi, longsor, dan DAS untuk tata ruang | D2, C4 (turunan) | PT Vale Indonesia (dengan pagar) | Sistem dan Strategi |
| 10 | Unpatti (Maluku, Papua) | Pulau Siaga Terhubung: komunikasi darurat dan peringatan dini pulau kecil | B7, B3 (turunan) | Telkomsel, INPEX Masela | Pusdatinkom, Pencegahan |
| 11 | IPB (tematik karhutla, gambut) | Desa Bebas Api Bersertifikat, diverifikasi kampus | G4, B1 | Asian Agri, Musim Mas, APRIL (data perlu dimutakhirkan) | Penanganan Darurat (karhutla) |

## 3. Rincian per kampus

### 1. USK: Lumbung Siaga Aceh

- **Mengapa USK**: TDMRC memimpin satgas USK saat Siklon Senyar (Nov 2025) dengan lebih dari 120 relawan, WebGIS pelacak
  logistik di 7 kabupaten/kota, 7 posko, dan 7 dapur umum; FK USK mengambil alih layanan darurat RSUD Meureudu [Q2, perlu cek
  tanggal]. Dirjen Dikti menyebut TDMRC model kampus berdampak (Kemdiktisaintek, 8 Feb 2025) [Q2].
- **Mengapa mitra ini**: Medco Foundation bersama SKK Migas mengirim lebih dari 50 ton bantuan, air bersih sampai 25.000 liter
  per hari untuk lebih dari 3.000 warga dengan 4 unit ultrafiltrasi, dan 500 kg obat (total lebih dari USD 500.000) [Q2,
  inferensi: halaman tanpa tanggal]. Telkomsel memulihkan 100% BTS Aceh pada Januari 2026 [Q4].
- **Cara kerja segitiga**: USK menghitung stok siaga dan lokasi gudang dari data Senyar dan memegang WebGIS logistik; Medco
  menempatkan unit pengolah air dan stok bergilir di gudang bersama; Telkomsel menjamin koneksi posko; BNPB (Logistik dan
  Peralatan) menetapkan standar stok dan menyambungkan ke gudang regional.
- **Usulan target**: 2027 satu gudang bersama di Banda Aceh dan peta stok 23 kabupaten/kota Aceh; 2028 diperluas ke Sumut;
  uji kirim 72 jam tiap tahun.
- **Program pendukung**: (a) Belajar dari Senyar (J2): laporan pelajaran tanggap darurat untuk semua kampus koordinator;
  (b) EvaNami dan latihan VR tsunami USK (hibah In-Saintek 2025) [Q2] dipakai di sekolah pesisir Aceh; (c) USK menghidupkan
  kembali konsorsium kampus kebencanaan atas permintaan rektor kepada Dirjen [Q2].
- **Pagar**: kandidat Aceh lain (Bank Aceh Syariah, PEMA, PHE NSO, Mubadala, SBA) belum punya rekam bencana yang ditemukan [Q2 celah];
  jangan dicantumkan sebelum dicek.

### 2. Unand: Padang Siap Megathrust

- **Mengapa Unand**: ditetapkan BNPB sebagai Center of Excellence penanggulangan bencana (28 Feb 2025) [Q2]; riset megathrust
  Sumatera dari hibah SIAP SIAGA (DFAT), diperluas ke bahaya hidrometeorologi 2026 sampai 2027 (ANTARA, 24 Mei 2026) [Q2].
- **Mengapa mitra ini**: Pegadaian dan Unand sudah menyerahkan cetak biru ancaman megathrust dan tsunami Mentawai kepada Wali
  Kota Padang: deteksi dini berbasis warga, sistem evakuasi, masjid sebagai tempat evakuasi, prosedur, dan simulasi
  (Katadata, 3 Jul 2026) [Q2]. Cetak biru sudah ada; yang belum adalah pelaksanaannya.
- **Cara kerja segitiga**: Unand menilai kelayakan struktur gedung dan masjid sebagai tempat evakuasi sementara (TES);
  Pegadaian dan pemilik gedung (hotel, mal, kantor) membiayai rambu, tangga darurat, dan latihan; BNPB (Pencegahan) dan
  BPBD menetapkan TES resmi dan memasukkannya ke rencana kontinjensi.
- **Usulan target**: 2027 gedung dan masjid di zona merah Padang dinilai dan ditetapkan sebagai TES; latihan evakuasi
  kota tahunan; 2028 ditiru di Bengkulu dan pesisir Sumbar lain.
- **Program pendukung**: (a) Hitung Rugi Megathrust (C3) bersama perusahaan reasuransi; (b) peringatan dini galodo
  (banjir bandang) memakai alat flagship UGM; (c) Kampus Aman Bencana Unand sebagai contoh.
- **Pagar**: Semen Padang, Bank Nagari, PLN belum terbukti bermitra kebencanaan dengan Unand [Q2 celah]; tawarkan sebagai
  pemilik gedung atau penyedia bahan, bukan diklaim sebagai mitra.

### 3. UI: Korps Siaga Korporat

- **Mengapa UI**: DRRC UI sudah biasa berkontrak dengan industri (tata kelola tanggap darurat kebakaran WK Rokan, Antara,
  6 Mei 2024) dengan tim lintas K3, FKM, FMIPA, dan Teknik [Q3]. Jakarta adalah kantor pusat sebagian besar perusahaan.
- **Mengapa mitra ini**: Astra untuk Sumatera 2025 menyalurkan 35.500 paket, membuka 19 posko, mengerahkan lebih dari 100
  relawan dan 40 alat berat United Tractors (astra.co.id, 30 Des 2025) [Q3]. Bank Mandiri menyalurkan sekitar 67.000
  bantuan (Bisnis, 3 Des 2025) [Q3]. BUMN mengirim 1.000 relawan dan 100 truk lewat program BUMN Peduli [Q5].
- **Masalah yang dijawab**: relawan karyawan sudah banyak tetapi belum terlatih dan terdaftar seragam; Korps Relawan Bencana
  Kampus (paparan rev4) targetnya 5.000 anggota pada 2029.
- **Cara kerja segitiga**: UI (DRRC) menyusun kurikulum dan sertifikasi bersama BNPB; perusahaan membayar pelatihan
  karyawannya; tiap regu berisi karyawan dan mahasiswa; BNPB (Penanganan Darurat) mendaftarkan dan mengaktifkan.
- **Usulan target**: 2027 kurikulum dan 10 perusahaan pertama; regu gabungan siap kirim; model ditiru 10 kampus koordinator.
- **Program pendukung**: (a) UMKM Bangkit (G1) FEB UI bersama bank; (b) Tim Medis Darurat Kampus (F1) FK UI dengan hibah riset
  farmasi (Kalbe dan Kemdiktisaintek: hibah RKSA 2025 Rp1,5 miliar untuk 3 proposal) [Q3]; (c) Pesan Siaga di Aplikasi (A5)
  bersama GoTo (donasi GoPay Rp129 miliar pada 2024) [Q3] dan nota kesepahaman Gojek-BNPB sejak 2020 [Q5].
- **Pagar**: Pertamina sedang dalam perkara korupsi tata kelola minyak mentah [Q3 risiko]; jangan dijadikan mitra utama.

### 4. ITB: Laboratorium Inovasi Kemanusiaan (bersama Paragon)

- **Mengapa ITB dan Paragon**: hubungan ITB-Paragon sudah terbukti: Labtek XV (diresmikan 7 Agt 2025), kontributor Dana Lestari
  ITB sejak 2019 dengan sekitar 60 penerima beasiswa (2025), perjanjian dengan FMIPA ITB (22 Jun 2026: magang, tugas akhir,
  riset, laboratorium), revitalisasi Dome Theater 360 Museum ITB (Jul 2026) [Q1]. Pendiri Paragon alumni Farmasi ITB.
- **Rekam bencana Paragon**: bantuan Cianjur 2022 bersama Dompet Dhuafa dan sekitar 30 ton bantuan Sumatera Desember 2025
  bersama Kitabisa, termasuk filter air dan 3.050 paket makanan [Q1]. Gerakan karyawan Paragonian Bergerak 2025 melibatkan
  lebih dari 14.000 karyawan [Q1 inferensi]. **Proyek kemanusiaan berbasis riset belum ditemukan di web: perlu dikonfirmasi pemilik.**
- **Masalah yang dijawab**: isi paket kebersihan dan perawatan untuk perempuan, bayi, dan lansia di pengungsian belum disusun
  dari riset kebutuhan; produk darurat (pembersih tanpa air, pelindung kulit petugas, penolak nyamuk pengungsian) belum
  dikembangkan untuk kondisi lapangan Indonesia.
- **Cara kerja segitiga**: Farmasi dan Teknik Kimia ITB meneliti kebutuhan dan merumuskan produk di Labtek XV; Paragon
  memproduksi, menyimpan stok siaga, dan mengirim lewat jaringannya; BNPB (Logistik) memasukkan spesifikasi kit ke standar
  bantuan dan mengujinya di pengungsian nyata.
- **Usulan target**: 2027 spesifikasi kit martabat teruji di satu kejadian; 2028 masuk standar bantuan BNPB dan e-Katalog.
- **Program pendukung**: (a) **Sekolah Siaga Imersif** (lihat 4b); (b) Sensor di Tiap Menara (B2): seismograf IoT buatan
  ITB (Geolini, paparan rev4) dipasang di gedung swasta, diproduksi industri elektronika (PT Len sudah mengindustrialisasi alat
  BMKG dan membangun 194 stasiun seismik) [Q1 inferensi]; (c) Asuransi bencana daerah: ITB sudah bersama DJPK Kemenkeu dan
  UNDRR dalam ARISE fiskal (1 Sep 2026), Bali provinsi uji [Q5].
- **Pagar**: penyaluran lewat zakat korporasi harus menjamin penerima inklusif; isu beasiswa 2021 bernuansa keagamaan [Q1 risiko].
  Tidak ada merek produk Paragon pada kit yang dibagikan negara; pengakuan mitra di laporan dan acara.

### 4b. Tel-U (kampus di regional ITB): Sekolah Siaga Imersif

- **Mengapa Tel-U dan Telkom**: Tel-U punya modal VR dan metaverse (MyTelUVerse, kerja sama metaverse dengan BRIN), Flood Eye dan
  Tide Eye, PATRIOT-Net yang terhubung BMKG, makalah VR gempa berbasis video 360 [Q1]. Telkom kuat di jaringan saat darurat:
  120 unit satelit cadangan Telkomsat dan 17 posko WiFi gratis di Sumatera (Des 2025) [Q1]. **Program VR yang turun ke sekolah
  belum ada: ini ruang kosong yang diisi flagship.**
- **Cara kerja segitiga**: ITB menyumbang isi ilmiah (gempa Lembang, longsor); Tel-U membuat konten VR dan video 360 yang
  portabel (WebXR) dan melatih mahasiswa fasilitator; Telkom mensponsori platform, headset, dan koneksi sekolah; Paragon
  membuka Dome Theater 360 Museum ITB sebagai ruang tayang publik; BNPB membawa kurikulum Satuan Pendidikan Aman Bencana.
- **Usulan target**: 2027 modul gempa, banjir, longsor, asap; uji pra dan pasca di sekolah Jawa Barat; 2028 konten dibuka untuk
  semua kampus koordinator (bahaya lokal tiap regional).
- **Pagar**: status platform metaNesia 2025-2026 belum jelas [Q1]; konten tidak boleh terkunci ke satu platform.
- **Pembanding**: SPAB Prudence Foundation dan Plan Indonesia menjangkau 133 sekolah dan 21.922 peserta di Yogyakarta
  (2022-2024) [Q5]; modulnya dipakai sebagai dasar, VR sebagai penguat.

### 5. UGM: Dari Prototipe ke 1.000 Unit

- **Mengapa UGM**: rancangan peringatan dini longsor UGM menjadi ISO 22327:2018, revisinya ISO 22328-2:2024; GAMA-EWS terpasang
  di 33 provinsi dan 120 kabupaten (ICL, 24 Nov 2024) [Q3]. Saat Sumatera 2025 UGM memasang penjernih air tenaga surya dan alat
  deteksi banjir dan tsunami di Aceh, tanpa mitra perusahaan (ugm.ac.id, 19 Des 2025) [Q3]: alatnya terbukti, skalanya belum.
- **Mengapa mitra ini**: UGM Tech4Disaster sudah berjalan bersama NVIDIA dan Indosat Ooredoo Hutchison [Q5]; PT Len punya
  pengalaman mengindustrialisasi alat litbang BMKG [Q1 inferensi]; Zurich Climate Resilience Alliance (Mercy Corps) mengalokasikan
  GBP 8,97 juta 2024-2027 untuk 21 komunitas di Jawa Tengah [Q5].
- **Cara kerja segitiga**: UGM memegang desain dan standar ISO; industri elektronika memproduksi dengan harga per unit turun;
  dana dari TJSL dan aliansi ketahanan membiayai unit untuk desa; BNPB (Pencegahan) menetapkan lokasi bersama BPBD.
- **Usulan target**: 1.000 unit terpasang di desa rawan longsor dan banjir bandang sampai 2029 (angka usulan, perlu
  kesepakatan biaya per unit).
- **Program pendukung**: (a) KKN Tematik di desa binaan swasta (Desa Sejahtera Astra lebih dari 1.500 desa di 35 provinsi) [Q3];
  (b) Taksir Rusak dari Foto (C5) memakai Tech4Disaster; (c) Emergency Response Unit UGM sebagai model satgas kampus [Q3].
- **Pagar**: Djarum dan Sampoerna (tembakau) tidak dipakai untuk program anak dan kesehatan (PP 28/2024) [Q3 risiko].

### 6. ITS: Kapal Tanggap Bencana Kepulauan

- **Mengapa ITS**: teknik perkapalan; kerja sama strategis ITS-PT PAL (desain kapal, 16 Jul 2026) [Q3]; Puslit MKPI ITS
  menjalankan sensor cerdas peringatan dini bersama BPBD Jatim dan METI Jepang (15 Jul 2025) [Q3].
- **Mengapa mitra ini**: PT PAL memasarkan kapal rumah sakit (Philmarine 2024) [Q3]. Unair, kampus di regional ITS, punya
  RS Kapal Ksatria Airlangga yang melayani korban di Agam (13 Des 2025) [Q3]: model operasinya sudah teruji.
- **Cara kerja segitiga**: ITS merancang modul (klinik, air bersih, listrik, komunikasi) yang dipasang ke kapal yang sudah ada;
  PT PAL dan perusahaan pelayaran membangun dan mengoperasikan; Unair menyediakan tim medis; BNPB mengaktifkan saat darurat
  di wilayah kepulauan (terhubung dengan flagship Unpatti).
- **Usulan target**: 2027 desain modul dan uji di satu kapal; 2028 siaga untuk Indonesia timur.
- **Program pendukung**: (a) peringatan dini lahar Semeru dengan sensor MKPI; (b) robot SAR dan logistik (RAISA, paparan rev4);
  (c) ketangguhan Surabaya bersama reasuransi (ITS pernah ber-MoU dengan MAIPARK, 2022) [Q3].
- **Pagar**: kerja sama ITS-PAL berfokus kapal perang [Q3 inferensi]; bingkai kemanusiaan dibatasi ke lini kapal rumah sakit.

### 7. Unram: Rumah Tahan Gempa dari Toko Bangunan

- **Mengapa Unram**: pengalaman pascagempa Lombok 2018 (posko gabungan ITB-Unram di Medana), Magister Mitigasi Bencana, KKN
  mitigasi gempa dan kekeringan 2023 [Q4]. Regional ini juga terdampak gempa NTT Agustus 2026 [Q4].
- **Mengapa mitra ini**: AMMAN punya tim tanggap darurat dari tambang Batu Hijau; ke Cianjur 2022 mengirim 9 personel, 440
  kasur, 7 tenda besar, dan menyebut membantu Lombok 2018, Majene 2021, Bima 2021 [Q4]. Tidak ditemukan kontroversi besar
  2023-2026, tetap perlu uji tuntas [Q4].
- **Cara kerja segitiga**: Unram (bersama UII yang punya BARRATAGA, paparan rev4) menyusun paket desain dan modul tukang;
  AMMAN mendanai pelatihan dan sertifikasi tukang di Sumbawa dan Lombok; produsen bahan bangunan menjual paket bahan lewat toko;
  BNPB (Rehabilitasi dan Rekonstruksi) memakai paket ini untuk dana stimulan rumah rusak.
- **Usulan target**: 2027 paket desain dan tukang bersertifikat pertama; 2028 dipakai di RR gempa NTT.
- **Program pendukung**: (a) Pariwisata Tangguh: hotel Tsunami Ready yang digerakkan Bali Hotels Association (AYANA pertama,
  2011) [Q4] dan Tanjung Benoa sebagai Tsunami Ready Community, bersama Unud; (b) SPAB model provinsi Bali (Prudence dan Plan,
  Agt 2024) [Q5]; (c) ARISE fiskal Bali sebagai provinsi uji [Q5].
- **Pagar**: peran PHRI dan Bank NTB Syariah belum terbukti [Q4 celah]; produsen semen atau baja ringan perlu dicari.

### 8. ULM: Desa Lahan Basah Tangguh

- **Mengapa ULM**: kekuatan lahan basah (pemulihan 629,27 ha mangrove Kotabaru; ratusan riset lahan basah menurut KLHK) [Q4].
  **Pusat studi kebencanaan resmi ULM dan riset banjir Kalsel 2021 atas nama ULM belum ditemukan [Q4 celah]: perlu konfirmasi LPPM ULM.**
- **Mengapa mitra ini**: Pertamina Hulu Kalimantan Timur membantu banjir Kalsel dan gempa Sulbar (Jan 2021), melatih warga
  Marangkayu memadamkan kebakaran, dan menggelar latihan tanggap darurat di Lawe-Lawe [Q4].
- **Cara kerja segitiga**: ULM memetakan desa rawa yang rawan banjir dan kebakaran sekaligus, mendampingi peringatan dini
  berbasis warga dan budidaya tanpa bakar; PHKT melatih dan memperlengkapi regu desa; BNPB dan BPBD menetapkan desa tangguh.
- **Usulan target**: 2027 desa percontohan di Kalsel dan Kaltim; 2029 diperluas ke lima provinsi Kalimantan.
- **Program pendukung**: (a) Beasiswa talenta kebencanaan Kalimantan memakai jalur yang sudah ada (Yayasan Adaro Bangun Negeri:
  beasiswa Rp11,26 miliar untuk 100 mahasiswa ULM, 2024) [Q4]; (b) Sabuk Hijau Pesisir (I1) di Kotabaru; (c) dukungan IKN.
- **Pagar**: **Adaro, Arutmin, Kideco, dan Bayan tidak dipakai untuk tema banjir**: Walhi mencatat 814 lubang tambang milik
  157 perusahaan saat banjir Kalsel 2021 dan mengaitkan titik banjir Tabalong dengan konsesi Adaro [Q4 risiko]. Adaro cukup di jalur beasiswa.
  Pertamina (induk PHKT) dalam perkara korupsi [Q3 risiko]: kerja sama pada tingkat anak usaha wilayah, dengan pelaporan publik.

### 9. Unhas: Sulawesi Aman Bangun

- **Mengapa Unhas**: riset pemetaan likuefaksi Palu (2019) dan Mamuju [Q4]; Untad di Palu sebagai mitra regional.
- **Mengapa mitra ini**: MoU strategis Unhas-PT Vale (16 Agt 2025) dan program Co-ops [Q4]; Vale menghibahkan ekskavator,
  10.000 liter BBM, kajian teknis, dan bibit untuk pemulihan DAS di Luwu Utara (23 Des 2025), dan mengirim tenaga medis ke
  Aceh Tamiang (Jan 2026) [Q4].
- **Cara kerja segitiga**: Unhas dan Untad memetakan zona likuefaksi, longsor, dan DAS kritis untuk rencana tata ruang;
  Vale mendanai pemetaan dan pemulihan DAS di Luwu Raya; BNPB (Sistem dan Strategi) memakai peta untuk kajian risiko dan
  rekomendasi ke pemda.
- **Usulan target**: 2027 peta Palu, Mamuju, dan Luwu Raya selesai dan diserahkan ke pemda; 2028 masuk revisi RTRW.
- **Program pendukung**: (a) Kaji Cepat 72 Jam (B5) korps drone mahasiswa Unhas dan Untad; (b) rumah tahan gempa memakai
  paket flagship Unram; (c) tim medis darurat FK Unhas.
- **Pagar**: kebocoran pipa minyak Vale di Towuti (Agt 2025) mencemari sekitar 38 ha sawah dan sungai; Walhi menuntut proses
  hukum (31 Mar 2026) [Q4 risiko]. Program tidak dipakai untuk wilayah Towuti, pemetaan DAS diaudit Unhas secara independen,
  dan hasilnya terbuka. IMIP dan Harita tidak dipakai untuk tema banjir [Q4 risiko].

### 10. Unpatti: Pulau Siaga Terhubung

- **Mengapa Unpatti**: riset tata ruang kesiapsiagaan tsunami Kota Ambon bersama TDMRC USK sejak 2022 [Q4]; laboratorium terpadu
  Masela dan tim 9 fakultas bersama INPEX (17 Jan 2025) [Q4].
- **Mengapa mitra ini**: Telkomsel membangun lebih dari 800 BTS 4G baru di Maluku-Papua (2023) dan pada bencana Sumatera 2025
  mengerahkan 346 personel serta BTS bergerak [Q4]. INPEX sudah membiayai beasiswa 343 mahasiswa Unpatti (2021) [Q4].
- **Masalah yang dijawab**: pulau kecil terputus saat bencana; peringatan dini tidak sampai karena tidak ada sinyal dan sirene.
- **Cara kerja segitiga**: Unpatti memetakan pulau berpenduduk tanpa jalur komunikasi darurat dan menguji pesan peringatan
  dalam bahasa lokal; Telkomsel menyiapkan BTS bergerak dan satelit cadangan di simpul pulau; INPEX mendanai sirene dan latihan
  di Tanimbar; BNPB (Pusdatinkom, Pencegahan) menyambungkan ke sistem peringatan nasional.
- **Usulan target**: 2027 peta pulau terputus Maluku; 2028 simpul komunikasi darurat di pulau prioritas.
- **Program pendukung**: (a) Kembar kampus Unpatti-USK untuk tsunami (lanjutan kerja sama 2022); (b) dermaga sandar kapal
  flagship ITS; (c) Sabuk Hijau Pesisir pulau kecil.
- **Pagar**: Freeport kuat secara aset (tim EP&R ke gempa NTT 2026 melayani hampir 500 pasien) tetapi berisiko tinggi
  (tailing Ajkwa, temuan BPK, kepekaan Papua) [Q4 risiko]; hanya sebagai pendukung tanggap darurat, bukan mitra utama.
  Cell broadcast nasional belum terbukti beroperasi (Kominfo, Sep 2024) [Q1]: jangan dijanjikan.

### 11. IPB: Desa Bebas Api Bersertifikat

- **Mengapa IPB**: FFEWS, alat IoT peringatan dini kebakaran dan banjir buatan IPB dan University of Waterloo (FINCAPES, Global
  Affairs Canada), diuji di Muaro Jambi; target Sungai Gelam jadi model restorasi gambut 2028 (IPB, 1 Sep 2026) [Q2].
  Universitas Riau jadi pusat unggulan gambut dan kebencanaan [Q2].
- **Mengapa mitra ini**: Asian Agri menandatangani MoU desa bebas api 2024-2025 dengan 5 desa di Pelalawan sesudah latihan
  gabungan dengan Manggala Agni dan BPBD [Q2]. Musim Mas menjalankan program 75 desa dengan insentif Rp25 juta per desa bebas
  api [Q2 inferensi]. APRIL melaporkan 215 desa dan 803.684 ha (2021) [Q2 inferensi: data lama, minta laporan 2025].
- **Peran kampus yang membedakan**: IPB menjadi **verifikator independen** "desa bebas api" (bukan perusahaan menilai dirinya
  sendiri), memasang FFEWS di desa yang ikut, dan menerbitkan hasilnya terbuka. Ini yang membuat program swasta yang sudah ada
  dipercaya publik dan BNPB.
- **Cara kerja segitiga**: perusahaan memberi insentif dan regu; IPB dan Unri memverifikasi dan memasang alat; BNPB menetapkan
  standar desa bebas api dan memakai datanya di sistem peringatan karhutla.
- **Usulan target**: 2027 standar verifikasi dan desa percontohan di Riau dan Jambi; 2029 seluruh desa program perusahaan
  peserta diverifikasi.
- **Program pendukung**: (a) Udara Bersih di Musim Asap (F4) bersama Unri; (b) Pangan Darurat Bergizi Lokal (E5) dari
  kampus pangan IPB; (c) Gambut Basah (I2) memakai FFEWS untuk muka air.
- **Pagar**: **APP Sinar Mas tidak dijadikan mitra utama pada 2026**: pemasok eksklusifnya PT Bumi Mekar Hijau termasuk 32
  perusahaan yang dikenai sanksi atas kebakaran 2026, dan NEA Singapura mengirim pemberitahuan ke pemasok APP (Katadata,
  19 Okt 2026) [Q2 risiko]. KLH mencatat sekitar 85.000 ha terbakar di konsesi dan 335 perusahaan ditandai (24 Agt 2026) [Q2].
  Syarat ikut: tanpa sanksi aktif; cek daftar sanksi, SIPP pengadilan, dan pemantauan LSM sebelum MoU.

## 4. Program lintas regional (semua kampus koordinator)

| Program | Isi | Mitra | Bukti |
|---|---|---|---|
| Pesan Siaga di Aplikasi | Pesan musiman yang diuji kampus, tayang di aplikasi transportasi, perbankan, operator | GoTo, Telkomsel, bank | Gojek-BNPB MoU 2020 [Q5]; GoPay Rp129 miliar donasi 2024 [Q3] |
| Meja Insentif Mitra | BNPB dan kampus membantu perusahaan memakai pengurangan pajak sumbangan bencana dan litbang serta super deduction 300% | semua mitra | PMK 114/2025; PP 45/2019 dan PMK 81/2024 [Q5] |
| Dana Padanan | Kontribusi perusahaan dipadankan pemerintah lewat Dana Padanan (eks Matching Fund) dan RISPRO | Kemdiktisaintek, LPDP | Dana Padanan Rp750 miliar (2024) [Q5] |
| Pintu Dunia Usaha | Kapasitas perusahaan dipetakan dan dihubungkan ke program lewat pusat operasi bencana dunia usaha yang digagas Kadin | Kadin | roundtable 10 Jun 2026 [Q5] |
| Asuransi bencana daerah | Pembiayaan risiko untuk aset daerah, mulai provinsi uji | ITB, DJPK, UNDRR | ARISE fiskal 1 Sep 2026 [Q5] |

## 5. Mengapa swasta mau ikut: dasar hukum dan insentif

1. **Jalur resmi sudah ada.** UU 24/2007 Pasal 28 memberi kesempatan lembaga usaha; Perka BNPB 12/2014 mengatur nota
   kesepahaman, kerangka acuan, dan rencana kegiatan yang disusun bersama mitra kerja (kampus ikut), penghargaan BNPB (Pasal 23),
   dan kewajiban laporan yang diumumkan ke publik (Pasal 22) [Q5].
2. **Sumbangan bencana dan sumbangan litbang ke kampus mengurangi pajak.** PMK 114/2025 (30 Des 2025, mencabut PMK 76/2011):
   sumbangan lewat badan penanggulangan bencana atau lembaga berizin, dan sumbangan litbang lewat perguruan tinggi terakreditasi,
   dapat dikurangkan dari penghasilan bruto sampai 5% penghasilan neto fiskal tahun sebelumnya [Q5].
3. **Super deduction litbang sampai 300%** (PP 45/2019, kini PMK 81/2024 sejak 1 Jan 2025, proposal ditelaah BRIN). Baru sekitar
   30 wajib pajak yang memakainya [Q5]: kampus koordinator bisa menawarkan diri sebagai mitra litbang.
4. **Dana perusahaan dipadankan pemerintah** lewat Dana Padanan Kemdiktisaintek; beberapa skema RISPRO mewajibkan mitra industri [Q5].
5. **Kerangka global**: Sendai Framework paragraf 36(c) dan UNDRR ARISE (lebih dari 400 perusahaan) [Q5]; dipakai perusahaan
   untuk laporan keberlanjutan.

## 6. Pagar kemitraan swasta (diusulkan jadi syarat MoU)

1. **Uji tuntas sebelum MoU**: daftar sanksi KLH/Kemenhut, SIPP pengadilan, pemberitaan 3 tahun terakhir.
2. **Tidak bermitra pada tema yang bersinggungan dengan dugaan pelanggarannya**: tambang tidak untuk tema banjir di DAS yang sama;
   perusahaan dengan konsesi tersanksi kebakaran tidak untuk karhutla selama sanksi aktif.
3. **Tembakau tidak untuk program anak dan kesehatan** (PP 28/2024).
4. **Tanpa merek produk** pada materi edukasi anak dan barang bantuan negara; pengakuan mitra di laporan, acara, dan laman program.
5. **Penerima manfaat inklusif** walau dana lewat zakat atau yayasan keagamaan.
6. **Data**: data perusahaan dan warga dibagi teragregasi, sesuai UU Perlindungan Data Pribadi.
7. **Laporan publik** tahunan sesuai Pasal 22 Perka BNPB 12/2014; kampus sebagai penilai hasil.

## 7. Yang harus dikonfirmasi sebelum deck final

- Paragon: proyek kemanusiaan berbasis riset yang dimaksud pemilik (tidak ditemukan di web).
- Telkom: platform VR mana yang masih aktif (metaNesia belum pasti) dan kesediaan sponsor.
- ULM: nama pusat studi kebencanaan dan riset banjir Kalsel.
- Unhas: nama pusat studi kebencanaan.
- APRIL dan Musim Mas: angka desa 2024/2025 dari laporan keberlanjutan.
- Produsen bahan bangunan untuk flagship Unram.
- Status aturan TJSL BUMN setelah Danantara.
